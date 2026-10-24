/// F3 core invariants (Phase F design §8.3, Phase C design
/// §9): the transfer transition table, the WIP pool's
/// never-negative construction, pre-composition refusals on
/// every new posting path, the §1.3 resolution rule, and the
/// stage/status derivations' edge cases. Pure Dart — no
/// fixtures, no Firebase.
import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/boms.dart';
import 'package:dukaan_ai/core/jobs.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/production.dart';
import 'package:dukaan_ai/core/stock.dart' as stock;
import 'package:dukaan_ai/core/transfers.dart' as tr;
import 'package:dukaan_ai/core/types.dart';

const warehouses = [
  Warehouse(id: 'wh-main', name: 'Main', isDefault: true),
  Warehouse(id: 'wh-godown', name: 'Godown'),
  Warehouse(id: 'wh-old', name: 'Old', archived: true),
];

Product prod(String id, {double cost = 100, double qty = 0, String? cls}) => Product(
    id: id, name: id, costPrice: cost, salePrice: cost * 2, stockQty: qty, stockClass: cls);

StockTransfer transfer(String status) => StockTransfer(
      id: 'tr-1', number: status == 'draft' ? null : 'TR-1',
      fromWarehouseId: 'wh-main', toWarehouseId: 'wh-godown',
      lines: const [StockTransferLine(productId: 'p-a', name: 'p-a', qtySent: 5, qtyReceived: 1)],
      status: status);

ProductionOrder order({
  String status = 'open',
  double planned = 10,
  List<ProductionEvent> events = const [],
}) =>
    ProductionOrder(
      id: 'pr-1', number: 'PR-1', outputProductId: 'p-out', outputName: 'Out',
      warehouseId: 'wh-main', plannedQty: planned, status: status, events: events,
      bomSnapshot: const BomSnapshot(outputQty: 1, lines: [BomLine(productId: 'p-a', qty: 1)]),
    );

ProductionEvent issueEvent(double value) =>
    ProductionEvent(kind: 'issue', value: value, entryId: 'e-in');

void main() {
  group('transfer transition table (§2.4)', () {
    test('drafts allow edit/delete/cancel/dispatch only', () {
      final t = transfer('draft');
      for (final a in ['edit', 'delete', 'cancel', 'dispatch']) {
        expect(tr.canTransferTransition(t, a), isTrue, reason: a);
      }
      for (final a in ['receive', 'closeShort', 'returnToSource']) {
        expect(tr.canTransferTransition(t, a), isFalse, reason: a);
      }
    });
    test('open transfers allow receive/closeShort/return only', () {
      for (final status in ['dispatched', 'partially_received']) {
        final t = transfer(status);
        for (final a in ['receive', 'closeShort', 'returnToSource']) {
          expect(tr.canTransferTransition(t, a), isTrue, reason: '$status $a');
        }
        for (final a in ['edit', 'delete', 'cancel', 'dispatch']) {
          expect(tr.canTransferTransition(t, a), isFalse, reason: '$status $a');
        }
      }
    });
    test('terminal transfers allow nothing', () {
      for (final status in ['received', 'returned', 'cancelled']) {
        final t = transfer(status);
        for (final a in ['edit', 'dispatch', 'receive', 'closeShort', 'returnToSource']) {
          expect(tr.canTransferTransition(t, a), isFalse, reason: '$status $a');
        }
      }
    });
    test('route problems: same / missing / archived / ok', () {
      expect(tr.transferRouteProblem('wh-main', 'wh-main', warehouses), 'same');
      expect(tr.transferRouteProblem('wh-main', 'wh-nope', warehouses), 'missing');
      expect(tr.transferRouteProblem('wh-main', 'wh-old', warehouses), 'archived');
      expect(tr.transferRouteProblem('wh-main', 'wh-godown', warehouses), isNull);
    });
  });

  group('WIP pool construction (§4.3)', () {
    test('the pool can never go negative: absorption is capped by the pool', () {
      var o = order(events: [issueEvent(100)]);
      // A completion of the whole plan absorbs exactly the pool.
      final c = completionAbsorb(o, 10, false);
      expect(c.value, 100);
      o = o.copyWith(events: [...o.events, ProductionEvent(kind: 'completion', qty: 10, value: c.value!)]);
      expect(poolOf(o), 0);
      // Nothing left to absorb or scrap.
      expect(completionAbsorb(o, 1, false).problem, 'empty_pool');
      expect(scrapAbsorb(o, 1).problem, 'empty_pool');
    });
    test('scrap share is proportional and capped', () {
      final o = order(events: [issueEvent(90)]);
      // D = max(planned 10, qty 3) = 10 → 90 × 3/10 = 27.
      expect(scrapAbsorb(o, 3).value, 27);
      // Scrap of the full remaining denominator takes the pool.
      expect(scrapAbsorb(o, 10).value, 90);
    });
    test('completion refusals: draft / closed / bad qty / empty pool', () {
      expect(completionAbsorb(order(status: 'draft'), 1, false).problem, 'not_open');
      expect(completionAbsorb(order(status: 'completed', events: [issueEvent(5)]), 1, false).problem, 'not_open');
      expect(completionAbsorb(order(events: [issueEvent(5)]), 0, false).problem, 'bad_qty');
      expect(completionAbsorb(order(), 1, false).problem, 'empty_pool');
    });
    test('deriveProductionStatus: cancelled sticky, draft untouched, fulfilled completes', () {
      expect(deriveProductionStatus(order(status: 'cancelled', events: [issueEvent(5)])), 'cancelled');
      expect(deriveProductionStatus(order(status: 'draft')), 'draft');
      final done = order(events: [
        issueEvent(50),
        const ProductionEvent(kind: 'completion', qty: 10, value: 50),
      ]);
      expect(deriveProductionStatus(done), 'completed');
      final mid = order(events: [issueEvent(50)]);
      expect(deriveProductionStatus(mid), 'open');
    });
  });

  group('prepareIssue refusals (§4.2)', () {
    final products = [prod('p-a', cost: 100, qty: 50), prod('p-out')];
    final levelsHere = [stock.makeLevel('wh-godown', 'p-a', 50)]; // stock sits at the GODOWN only
    test('insufficient at the ORDER warehouse — another warehouse is never reached for', () {
      final res = prepareIssue(order(), products, levelsHere, warehouses, const [],
          const IssueInput(runQty: 1, lines: [(productId: 'p-a', qty: 1)]));
      expect(res.problem, 'insufficient');
      expect(res.productId, 'p-a');
    });
    test('unknown component / bad qty / empty lines', () {
      final levels = [stock.makeLevel('wh-main', 'p-a', 50)];
      expect(prepareIssue(order(), products, levels, warehouses, const [],
          const IssueInput(runQty: 1, lines: [(productId: 'p-zz', qty: 1)])).problem, 'unknown_component');
      expect(prepareIssue(order(), products, levels, warehouses, const [],
          const IssueInput(runQty: 1, lines: [(productId: 'p-a', qty: 0)])).problem, 'bad_qty');
      expect(prepareIssue(order(), products, levels, warehouses, const [],
          const IssueInput(runQty: 1, lines: [])).problem, 'empty_lines');
      expect(prepareIssue(order(), products, levels, warehouses, const [],
          const IssueInput(runQty: 0, lines: [(productId: 'p-a', qty: 1)])).problem, 'bad_run');
    });
    test('zero value refuses; paid with no money account refuses; accrue needs no account', () {
      final free = [prod('p-a', cost: 0, qty: 50), prod('p-out')];
      final levels = [stock.makeLevel('wh-main', 'p-a', 50)];
      expect(prepareIssue(order(), free, levels, warehouses, const [],
          const IssueInput(runQty: 1, lines: [(productId: 'p-a', qty: 2)])).problem, 'zero_value');
      expect(prepareIssue(order(), products, levels, warehouses, const [],
          const IssueInput(runQty: 1, lines: [(productId: 'p-a', qty: 1)], labourCost: 50)).problem, 'no_account');
      final accrued = prepareIssue(order(), products, levels, warehouses, const [],
          const IssueInput(runQty: 1, lines: [(productId: 'p-a', qty: 1)], labourCost: 50, settlement: 'accrue'));
      expect(accrued.problem, isNull);
      expect(accrued.prepared!.event.paidFromAccountId, 'accrue');
      final wipLine = accrued.prepared!.entry.lines.first;
      expect(wipLine.account, 'wip');
      expect(accrued.prepared!.entry.lines.last.account, 'salary_payable');
    });
    test('a completed/cancelled order takes no issue', () {
      final levels = [stock.makeLevel('wh-main', 'p-a', 50)];
      expect(prepareIssue(order(status: 'completed'), products, levels, warehouses, const [],
          const IssueInput(runQty: 1, lines: [(productId: 'p-a', qty: 1)])).problem, 'not_open');
    });
  });

  group('job material refusals (§5.3)', () {
    final products = [prod('p-a', cost: 100, qty: 10), prod('p-free', cost: 0, qty: 10)];
    final levels = [stock.makeLevel('wh-main', 'p-a', 10), stock.makeLevel('wh-main', 'p-free', 10)];
    Job job({String status = 'in_progress', List<JobMaterialEvent> events = const []}) => Job(
        id: 'job-1', number: 'JB-1', status: status, warehouseId: 'wh-main', materialEvents: events);
    test('over-return refuses against the job net position', () {
      final j = job(events: const [
        JobMaterialEvent(kind: 'issue', productId: 'p-a', qty: 3, unitCost: 100, value: 300, entryId: 'e1'),
      ]);
      expect(prepareMaterialEvent(j, products, levels, warehouses, 'return',
          [(productId: 'p-a', qty: 4)]).problem, 'over_return');
      final ok = prepareMaterialEvent(j, products, levels, warehouses, 'return',
          [(productId: 'p-a', qty: 3)]);
      expect(ok.problem, isNull);
      expect(ok.prepared!.entry.lines.first.account, 'inventory');
    });
    test('insufficient at the job warehouse / not_active / zero value', () {
      expect(prepareMaterialEvent(job(), products, levels, warehouses, 'issue',
          [(productId: 'p-a', qty: 11)]).problem, 'insufficient');
      expect(prepareMaterialEvent(job(status: 'delivered'), products, levels, warehouses, 'issue',
          [(productId: 'p-a', qty: 1)]).problem, 'not_active');
      expect(prepareMaterialEvent(job(), products, levels, warehouses, 'issue',
          [(productId: 'p-free', qty: 1)]).problem, 'zero_value');
    });
  });

  group('stock resolution + reclass edges (§1.3/§4.1)', () {
    test('rows are complete truth once any row exists', () {
      final p = prod('p-a', qty: 30);
      final levels = [stock.makeLevel('wh-godown', 'p-a', 7)];
      expect(stock.qtyAtWarehouse(p, levels, warehouses, 'wh-main'), 0);
      expect(stock.qtyAtWarehouse(p, levels, warehouses, 'wh-godown'), 7);
      expect(stock.qtyAtWarehouse(p, const [], warehouses, 'wh-main'), 30);
      expect(stock.qtyAtWarehouse(p, const [], warehouses, 'wh-godown'), 0);
    });
    test('negative on-hand reclasses as the mirror image', () {
      final p = prod('p-a', cost: 100);
      final e = tr.buildReclassEntry(p, 'raw', -5, 100);
      expect(e, isNotNull);
      expect(e!.lines.first.account, 'inventory');
      expect(e.lines.first.debit, 500);
      expect(e.lines.last.account, 'inventory_raw');
      expect(e.lines.last.credit, 500);
      expect(entryBalances(e), isTrue);
    });
    test('stockV1Rows skips products that already have rows, whole', () {
      final rows = stock.stockV1Rows(
        [prod('p-a', qty: 3), prod('p-b', qty: 4)],
        [stock.makeLevel('wh-godown', 'p-a', 3)],
      );
      expect(rows.length, 1);
      expect(rows.single.productId, 'p-b');
      expect(rows.single.warehouseId, 'wh-main');
      expect(rows.single.qty, 4);
    });
    test('recount is a no-op on clean data', () {
      final p = prod('p-a', qty: 10);
      final levels = [stock.makeLevel('wh-main', 'p-a', 10)];
      final rec = stock.recountLevels([p], levels, warehouses, const []);
      expect(rec.repaired, 0);
      expect(rec.levels, same(levels));
    });
  });

  group('job stage derivation edges (§5.2)', () {
    Job jobAt(String stage, String status) =>
        Job(id: 'j', number: 'JB-1', stage: stage, status: status, warehouseId: 'wh-main');
    test('a single-stage list never reads ready from position alone', () {
      expect(deriveJobStatus(jobAt('Only', 'open'), const ['Only']), 'open');
    });
    test('cancelled is sticky', () {
      expect(deriveJobStatus(jobAt('Received', 'cancelled'), defaultJobStages), 'cancelled');
    });
    test('BOM draft problems: unknown output + bad batch', () {
      final products = [prod('p-a'), prod('p-b')];
      expect(
          validateBomDraft(products, const BomDraft(outputProductId: 'p-zz', outputQty: 1, lines: [(productId: 'p-a', qty: 1)])),
          'output_unknown');
      expect(
          validateBomDraft(products, const BomDraft(outputProductId: 'p-b', outputQty: 0, lines: [(productId: 'p-a', qty: 1)])),
          'bad_batch');
      expect(
          validateBomDraft(products, const BomDraft(outputProductId: 'p-b', outputQty: 1, labourCost: -1, lines: [(productId: 'p-a', qty: 1)])),
          'bad_batch');
    });
  });
}
