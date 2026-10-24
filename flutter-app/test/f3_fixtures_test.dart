/// Golden-fixture parity for F3 (Phase F design §8.2, §9 F3):
/// the Dart Phase C ports (stock, transfers, BOM, production,
/// jobs) must produce results EQUAL to the web's lib/stock,
/// lib/transfers, lib/boms, lib/production and lib/jobs —
/// byte-for-byte on journal entries (accounts / refs / amounts /
/// line order), and figure-for-figure on the derivations (pools,
/// in-transit, availability, drift, job profit), for the shared
/// scenarios exported by harness/fixtures-export-f3.js from the
/// REAL web functions. A template change on either side must
/// move the fixture deliberately.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/boms.dart';
import 'package:dukaan_ai/core/jobs.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/production.dart';
import 'package:dukaan_ai/core/stock.dart' as stock;
import 'package:dukaan_ai/core/transfers.dart' as tr;
import 'package:dukaan_ai/core/types.dart';

/// Canonical entry form (F1/F2 style): memo | refType | refId |
/// reversesId | lines (account:debit:credit:ref).
String canon(JournalEntry e) {
  final lines = e.lines
      .map((l) => '${l.account}:${l.debit.toStringAsFixed(2)}:${l.credit.toStringAsFixed(2)}:${l.ref}')
      .join(',');
  return '${e.memo}|${e.refType}|${e.refId}|${e.reversesId}|$lines';
}

String canonExpected(Map<String, dynamic> e) {
  final lines = (e['lines'] as List)
      .map((l) => '${l['account']}:${(l['debit'] as num).toStringAsFixed(2)}:${(l['credit'] as num).toStringAsFixed(2)}:${l['ref']}')
      .join(',');
  return '${e['memo']}|${e['refType']}|${e['refId']}|${e['reversesId']}|$lines';
}

/// Deep compare with paisa tolerance on numbers (derivations
/// only — journal entries are compared byte-exact via canon).
bool deepApprox(dynamic a, dynamic b) {
  if (a is num && b is num) return (a.toDouble() - b.toDouble()).abs() < 0.011;
  if (a is Map && b is Map) {
    if (a.length != b.length) return false;
    for (final k in a.keys) {
      if (!b.containsKey(k) || !deepApprox(a[k], b[k])) return false;
    }
    return true;
  }
  if (a is List && b is List) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!deepApprox(a[i], b[i])) return false;
    }
    return true;
  }
  return a == b;
}

void expectApprox(dynamic actual, dynamic expected, String reason) {
  if (!deepApprox(actual, expected)) {
    fail('$reason\n  actual:   ${jsonEncode(actual)}\n  expected: ${jsonEncode(expected)}');
  }
}

Map<String, dynamic> mm(dynamic m) => Map<String, dynamic>.from(m as Map);

void main() {
  final file = File('../harness/fixtures/f3-core.json');
  final fx = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;

  final accounts = (fx['accounts'] as List).map((m) => MoneyAccount.fromMap(m['id'] as String, mm(m))).toList();
  final products = (fx['products'] as List).map((m) => Product.fromMap(m['id'] as String, mm(m))).toList();
  final byId = {for (final p in products) p.id: p};
  final warehouses = (fx['warehouses'] as List).map((m) => Warehouse.fromMap(m['id'] as String, mm(m))).toList();
  final bom = Bom.fromMap((mm(fx['bom']))['id'] as String, mm(fx['bom']));
  final customer = Customer.fromMap((mm(fx['customer']))['id'] as String, mm(fx['customer']));
  final baseLevels = [
    for (final p in products) stock.makeLevel('wh-main', p.id, p.stockQty),
  ];
  final scenarios = (fx['scenarios'] as List).cast<Map<String, dynamic>>();
  Map<String, dynamic> scenario(String id) => scenarios.firstWhere((s) => s['id'] == id);

  group('F3 golden fixtures — transfer loss + reclass entries (web ≡ Dart)', () {
    for (final id in ['transfer-loss-goods', 'transfer-loss-raw']) {
      test(id, () {
        final s = scenario(id);
        final docs = mm(s['docs']);
        final transfer = StockTransfer.fromMap(mm(docs['transfer'])['id'] as String, mm(docs['transfer']));
        final shortages = tr.transferShortages(transfer);
        expectApprox(
          [for (final x in shortages) {'productId': x.productId, 'name': x.name, 'qty': x.qty}],
          docs['shortages'], 'shortages');
        expect(tr.transferLossValue(shortages, byId), (docs['lossValue'] as num).toDouble());
        final entry = tr.buildTransferLossEntry(transfer, shortages, byId);
        expect(entry, isNotNull);
        expect(canon(entry!), canonExpected(mm((s['entries'] as List).first)));
        if (docs['inTransitBefore'] != null) {
          expectApprox(tr.inTransitByProduct([transfer]), docs['inTransitBefore'], 'in-transit before close');
        }
      });
    }

    test('class-reclass', () {
      final s = scenario('class-reclass');
      final docs = mm(s['docs']);
      final oil = byId['p-oil']!;
      final raw = byId['p-raw']!;
      final a = tr.buildReclassEntry(oil, 'raw', oil.stockQty, oil.costPrice);
      final b = tr.buildReclassEntry(raw, null, raw.stockQty, raw.costPrice);
      expect(canon(a!), canonExpected(mm((s['entries'] as List)[0])));
      expect(canon(b!), canonExpected(mm((s['entries'] as List)[1])));
      final nulls = [
        tr.buildReclassEntry(oil, null, oil.stockQty, oil.costPrice) == null,
        tr.buildReclassEntry(oil, 'raw', 0, oil.costPrice) == null,
      ];
      expect(nulls, docs['nullCases']);
    });
  });

  group('F3 golden fixtures — production scenarios (entries, events, pools)', () {
    // Scenario start states (the exporter's definitions).
    final starts = <String, ({String orderId, String number, double planned})>{
      'production-cycle-paid': (orderId: 'pr-1', number: 'PR-1', planned: 20),
      'production-accrue-overproduce': (orderId: 'pr-2', number: 'PR-2', planned: 10),
      'production-closeout': (orderId: 'pr-3', number: 'PR-3', planned: 10),
    };
    for (final id in starts.keys) {
      test(id, () {
        final s = scenario(id);
        final docs = mm(s['docs']);
        final steps = (docs['steps'] as List).cast<Map<String, dynamic>>();
        final start = starts[id]!;
        var order = ProductionOrder(
          id: start.orderId, number: start.number, bomId: bom.id, bomVersion: bom.version,
          bomSnapshot: snapshotOfBom(bom), outputProductId: 'p-blend',
          outputName: 'House Tea Blend 500g', warehouseId: 'wh-main',
          plannedQty: start.planned, status: 'open',
        );
        // Events cite their entry by id; the fixture labels the
        // entries e0, e1, … in composition order — the helpers at
        // the bottom of this file maintain the Dart id → label
        // map as the driver composes each step.
        _resetEventLabels();
        Map<String, dynamic> prodEventMap(ProductionEvent ev) => {
              'kind': ev.kind, 'qty': ev.qty,
              'lines': ev.lines
                  ?.map((l) => {'productId': l.productId, 'name': l.name, 'qty': l.qty, 'unitCost': l.unitCost, 'value': l.value})
                  .toList(),
              'labourCost': ev.labourCost, 'overheadCost': ev.overheadCost,
              'paidFromAccountId': ev.paidFromAccountId, 'value': ev.value,
              'entryId': _labelFor(ev.entryId),
            };

        for (final step in steps) {
          final kind = step['kind'] as String;
          final expectedEntry = mm(step['entry']);
          final expectedEvent = mm(step['event']);
          if (kind == 'issue') {
            final evLines = (expectedEvent['lines'] as List).cast<Map<String, dynamic>>();
            final paidFrom = expectedEvent['paidFromAccountId'] as String?;
            final res = prepareIssue(order, products, baseLevels, warehouses, accounts,
              IssueInput(
                runQty: start.planned,
                lines: [for (final l in evLines) (productId: l['productId'] as String, qty: (l['qty'] as num).toDouble())],
                labourCost: (expectedEvent['labourCost'] as num).toDouble(),
                overheadCost: (expectedEvent['overheadCost'] as num).toDouble(),
                settlement: paidFrom == 'accrue' ? 'accrue' : 'paid',
                paidFromAccountId: paidFrom == 'accrue' ? null : paidFrom,
              ));
            expect(res.problem, isNull, reason: '$id issue refused: ${res.problem}');
            final prepared = res.prepared!;
            _registerEntry(prepared.entry);
            expect(canon(prepared.entry), canonExpected(expectedEntry), reason: '$id issue entry');
            expectApprox(prodEventMap(prepared.event), expectedEvent, '$id issue event');
            order = order.copyWith(events: [...order.events, prepared.event]);
            order = order.copyWith(status: deriveProductionStatus(order));
          } else if (kind == 'completion') {
            final qty = (expectedEvent['qty'] as num).toDouble();
            final res = completionAbsorb(order, qty, false);
            expect(res.problem, isNull, reason: '$id completion refused: ${res.problem}');
            expect(res.value, (step['value'] as num).toDouble());
            expect(res.unitCost, (step['unitCost'] as num).toDouble());
            final entry = buildCompletionEntry(order, qty, res.value!);
            _registerEntry(entry);
            expect(canon(entry), canonExpected(expectedEntry), reason: '$id completion entry');
            final event = ProductionEvent(kind: 'completion', qty: qty, value: res.value!, entryId: entry.id);
            expectApprox(prodEventMap(event), expectedEvent, '$id completion event');
            order = order.copyWith(events: [...order.events, event]);
            order = order.copyWith(status: deriveProductionStatus(order));
          } else if (kind == 'scrap') {
            final qty = (expectedEvent['qty'] as num).toDouble();
            final res = scrapAbsorb(order, qty);
            expect(res.problem, isNull, reason: '$id scrap refused: ${res.problem}');
            final entry = buildScrapEntry(order, qty, res.value!, 'scrap');
            _registerEntry(entry);
            expect(canon(entry), canonExpected(expectedEntry), reason: '$id scrap entry');
            final event = ProductionEvent(kind: 'scrap', qty: qty, value: res.value!, entryId: entry.id);
            expectApprox(prodEventMap(event), expectedEvent, '$id scrap event');
            order = order.copyWith(events: [...order.events, event]);
            order = order.copyWith(status: deriveProductionStatus(order));
          } else if (kind == 'closeout') {
            final pool = poolOf(order);
            final entry = buildScrapEntry(order, 0, pool, 'closeout');
            _registerEntry(entry);
            expect(canon(entry), canonExpected(expectedEntry), reason: '$id closeout entry');
            final event = ProductionEvent(kind: 'closeout', qty: 0, value: pool, entryId: entry.id);
            expectApprox(prodEventMap(event), expectedEvent, '$id closeout event');
            order = order.copyWith(events: [...order.events, event]);
            // The store's close label (§4.2), not the derivation.
            final label = producedQty(order) > 0 ? 'completed' : 'cancelled';
            expect(label, step['statusAfter']);
            order = order.copyWith(status: label);
          }
          expect(poolOf(order), (step['poolAfter'] as num).toDouble(), reason: '$id $kind pool');
          expect(producedQty(order), (step['producedAfter'] as num).toDouble(), reason: '$id $kind produced');
          if (kind != 'closeout') {
            expect(order.status, step['statusAfter'], reason: '$id $kind status');
          }
        }
        // The phase identity at the scenario's end: pool exactly 0.
        expect(poolOf(order), 0, reason: '$id must end pool-free (WIP absorbs to zero)');
      });
    }
  });

  group('F3 golden fixtures — job materials + profit (web ≡ Dart)', () {
    test('job-materials-cycle', () {
      final s = scenario('job-materials-cycle');
      final docs = mm(s['docs']);
      final fixtureJob = Job.fromMap(mm(docs['job'])['id'] as String, mm(docs['job']));
      var job = Job(
        id: fixtureJob.id, number: fixtureJob.number, customerId: customer.id,
        customerName: customer.name, customerPhone: customer.phone,
        title: fixtureJob.title, stage: fixtureJob.stage, status: fixtureJob.status,
        warehouseId: fixtureJob.warehouseId, labourCost: fixtureJob.labourCost,
      );
      final entries = s['entries'] as List;
      final issueEvents = fixtureJob.materialEvents.where((e) => e.entryId == 'e0').toList();
      final returnEvents = fixtureJob.materialEvents.where((e) => e.entryId == 'e1').toList();

      final issue = prepareMaterialEvent(job, products, baseLevels, warehouses, 'issue',
          [for (final e in issueEvents) (productId: e.productId, qty: e.qty)]);
      expect(issue.problem, isNull, reason: 'job issue refused: ${issue.problem}');
      expect(issue.prepared!.value, (docs['issueValue'] as num).toDouble());
      expect(canon(issue.prepared!.entry), canonExpected(mm(entries[0])));
      job = job.copyWith(materialEvents: [...job.materialEvents, ...issue.prepared!.events]);

      final ret = prepareMaterialEvent(job, products, baseLevels, warehouses, 'return',
          [for (final e in returnEvents) (productId: e.productId, qty: e.qty)]);
      expect(ret.problem, isNull, reason: 'job return refused: ${ret.problem}');
      expect(ret.prepared!.value, (docs['returnValue'] as num).toDouble());
      expect(canon(ret.prepared!.entry), canonExpected(mm(entries[1])));
      job = job.copyWith(materialEvents: [...job.materialEvents, ...ret.prepared!.events]);

      // The rebuilt event log equals the web's, event for event.
      expect(job.materialEvents.length, fixtureJob.materialEvents.length);
      for (var i = 0; i < job.materialEvents.length; i++) {
        final a = job.materialEvents[i];
        final b = fixtureJob.materialEvents[i];
        expect([a.kind, a.productId, a.qty, a.unitCost, a.value],
            [b.kind, b.productId, b.qty, b.unitCost, b.value]);
      }
      expect(jobMaterialsCost(job), (docs['materialsCost'] as num).toDouble());
      expectApprox(
        {for (final e in (docs['netQty'] as Map).entries) e.key: jobMaterialNetQty(job, e.key)},
        docs['netQty'], 'net quantities');
      final credits = (docs['credits'] as List)
          .map((m) => CreditEntry.fromMap(mm(m)['id'] as String, mm(m))).toList();
      expect(jobAdvanceTotal(job, credits), (docs['advanceTotal'] as num).toDouble());
      final bill = Bill.fromMap(mm(docs['citingBill'])['id'] as String, mm(docs['citingBill']));
      expectApprox(jobProfitFigures(job, [bill]).toMap(), docs['profit'], 'job profit (§5.5)');
    });
  });

  group('F3 golden fixtures — the whole F3 journal', () {
    test('trial balance == 0 and wip == 0', () {
      final all = <JournalEntry>[];
      for (final s in scenarios) {
        for (final e in (s['entries'] as List)) {
          final m = mm(e);
          all.add(JournalEntry(
            id: 'x', memo: m['memo'] as String, refType: m['refType'] as String,
            refId: m['refId'] as String?,
            lines: (m['lines'] as List).map((l) => JournalLine(
                account: l['account'] as String,
                debit: (l['debit'] as num).toDouble(),
                credit: (l['credit'] as num).toDouble(),
                ref: l['ref'] as String?)).toList(),
          ));
        }
      }
      expect(trialBalanceTotal(all), 0);
      expect(accountBalance(all, 'wip'), 0);
    });
  });

  group('F3 golden fixtures — derivations (ops section)', () {
    final ops = mm(fx['ops']);

    test('stock resolution rule (§1.3)', () {
      final tea = byId['p-tea']!;
      final stockOps = mm(ops['stock']);
      expect(stock.qtyAtWarehouse(tea, const [], warehouses, 'wh-main'),
          (mm(stockOps['noRows'])['atDefault'] as num).toDouble());
      expect(stock.qtyAtWarehouse(tea, const [], warehouses, 'wh-godown'),
          (mm(stockOps['noRows'])['atGodown'] as num).toDouble());
      final godownOnly = [stock.makeLevel('wh-godown', 'p-tea', 5)];
      expect(stock.qtyAtWarehouse(tea, godownOnly, warehouses, 'wh-main'),
          (mm(stockOps['withRows'])['atDefault'] as num).toDouble());
      expect(stock.qtyAtWarehouse(tea, godownOnly, warehouses, 'wh-godown'),
          (mm(stockOps['withRows'])['atGodown'] as num).toDouble());
      final v1 = stock.stockV1Rows([byId['p-tea']!, byId['p-sugar']!],
          [stock.makeLevel('wh-godown', 'p-sugar', 3)]);
      expectApprox([for (final l in v1) {'id': l.id, ...l.toMap()}], stockOps['v1Rows'], 'stockV1Rows');
    });

    test('promised partition + availability (§1.6)', () {
      final stockOps = mm(ops['stock']);
      final order = SaleOrder.fromMap('so-1', {
        'status': 'confirmed', 'warehouseId': 'wh-godown',
        'lines': [{'productId': 'p-tea', 'name': 'Tapal Danedar Tea 475g', 'qty': 10, 'unitPrice': 900}],
      });
      final challan = DeliveryChallan.fromMap('dc-1', {
        'orderId': null, 'status': 'dispatched', 'warehouseId': null,
        'lines': [{'productId': 'p-tea', 'name': 'Tapal Danedar Tea 475g', 'qty': 3, 'unitPrice': 900}],
      });
      final bill = Bill.fromMap('bill-so-1', {
        'status': 'paid', 'sourceType': 'order', 'sourceId': 'so-1',
        'items': [{'productId': 'p-tea', 'qty': 4}],
      });
      final levels = [stock.makeLevel('wh-main', 'p-tea', 45), stock.makeLevel('wh-godown', 'p-tea', 5)];
      final atMain = stock.availabilityByProductAtWarehouse(
          products, levels, warehouses, [order], [challan], [bill], 'wh-main')['p-tea']!;
      final atGodown = stock.availabilityByProductAtWarehouse(
          products, levels, warehouses, [order], [challan], [bill], 'wh-godown')['p-tea']!;
      expectApprox(atMain.toMap(), stockOps['availMain'], 'availability at main');
      expectApprox(atGodown.toMap(), stockOps['availGodown'], 'availability at godown');
    });

    test('in-transit derivations (§2.2)', () {
      final open = StockTransfer.fromMap('tr-x', {
        'number': 'TR-9', 'fromWarehouseId': 'wh-main', 'toWarehouseId': 'wh-godown',
        'lines': [{'productId': 'p-tea', 'name': 'Tapal Danedar Tea 475g', 'qtySent': 5, 'qtyReceived': 0}],
        'status': 'dispatched',
      });
      final t = mm(ops['transit']);
      expectApprox(tr.inTransitByProduct([open]), t['byProduct'], 'inTransitByProduct');
      expect(tr.inTransitTotalQty([open]), (t['total'] as num).toDouble());
      expect(tr.inTransitBetween([open], 'wh-main', 'wh-godown'), (t['between'] as num).toDouble());
      expectApprox(tr.incomingByProductAtWarehouse([open], 'wh-godown'), t['incomingGodown'], 'incoming');
    });

    test('drift + recount (§1.7)', () {
      final open = StockTransfer.fromMap('tr-x', {
        'number': 'TR-9', 'fromWarehouseId': 'wh-main', 'toWarehouseId': 'wh-godown',
        'lines': [{'productId': 'p-tea', 'name': 'x', 'qtySent': 5, 'qtyReceived': 0}],
        'status': 'dispatched',
      });
      final levels = [stock.makeLevel('wh-main', 'p-tea', 42), stock.makeLevel('wh-godown', 'p-tea', 5)];
      final drift = stock.stockDrift([byId['p-tea']!], levels, [open]);
      expectApprox([for (final d in drift) d.toMap()], ops['drift'], 'stockDrift');
      final rec = stock.recountLevels([byId['p-tea']!], levels, warehouses, [open]);
      expect(rec.repaired, (mm(ops['recounted'])['repaired'] as num).toInt());
      expectApprox([for (final l in rec.levels) {'id': l.id, ...l.toMap()}], mm(ops['recounted'])['levels'], 'recounted levels');
    });

    test('transfer composition helpers (§2)', () {
      final composed = tr.composeTransferLines(products, [
        (productId: 'p-sugar', qty: 2), (productId: 'p-sugar', qty: 3), (productId: 'p-tea', qty: 1),
      ]);
      expectApprox(
        [for (final l in composed!) l.toMap()], ops['composed'], 'composeTransferLines merges duplicates');
      final open = StockTransfer.fromMap('tr-x', {
        'fromWarehouseId': 'wh-main', 'toWarehouseId': 'wh-godown',
        'lines': [{'productId': 'p-tea', 'name': 'x', 'qtySent': 5, 'qtyReceived': 0}],
        'status': 'dispatched',
      });
      expect(tr.validateReceivePicks(open, [(productId: 'p-tea', qty: 6)]) == null, ops['overReceiptNull']);
      final ok = tr.validateReceivePicks(open, [(productId: 'p-tea', qty: 5)]);
      expectApprox([for (final p in ok!) {'productId': p.productId, 'qty': p.qty}], ops['okReceipt'], 'ok receipt');
      final sc = mm(ops['statusCases']);
      StockTransferLine line(double sent, double received) =>
          StockTransferLine(productId: 'p-tea', qtySent: sent, qtyReceived: received);
      expect(tr.statusAfterReceive([line(5, 0)]), sc['none']);
      expect(tr.statusAfterReceive([line(5, 2)]), sc['partial']);
      expect(tr.statusAfterReceive([line(5, 5)]), sc['full']);
    });

    test('BOM derivations (§3)', () {
      final b = mm(ops['bom']);
      final bomV2 = Bom(
        id: 'bom-2', outputProductId: bom.outputProductId, outputName: bom.outputName,
        outputQty: bom.outputQty, version: 2, lines: bom.lines, labourCost: 350,
        overheadCost: bom.overheadCost, active: false, note: bom.note, ts: bom.ts);
      expect(bomsForOutput([bomV2, bom], 'p-blend').map((x) => x.version).toList(), b['forOutput']);
      expect(activeBomFor([bom, bomV2], 'p-blend')?.version, b['activeVersion']);
      expect(nextBomVersion([bom, bomV2], 'p-blend'), b['nextVersion']);
      expect(bomBatchMaterialCost(bom, products), (b['batchMaterialCost'] as num).toDouble());
      expect(bomUnitCost(bom, products), (b['unitCost'] as num).toDouble());
      final problems = mm(b['problems']);
      BomDraft draft(String output, List<({String productId, double qty})> lines) => BomDraft(
          outputProductId: output, outputQty: 1, lines: lines);
      expect(validateBomDraft(products, draft('p-raw', [(productId: 'p-sugar', qty: 1)])), problems['outputRaw']);
      expect(validateBomDraft(products, draft('p-blend', [(productId: 'p-blend', qty: 1)])), problems['selfComponent']);
      expect(validateBomDraft(products, draft('p-blend', const [])), problems['emptyLines']);
      expect(validateBomDraft(products, draft('p-blend', [(productId: 'p-sugar', qty: 0)])), problems['badQty']);
      expect(
          validateBomDraft(products, BomDraft(
              outputProductId: 'p-blend', outputQty: 10, labourCost: 300, overheadCost: 100,
              lines: [for (final l in bom.lines) (productId: l.productId, qty: l.qty)])),
          problems['ok']);
    });

    test('production desk defaults (§4.2)', () {
      final pd = mm(ops['prodDefaults']);
      final order = ProductionOrder(
        id: 'pr-x', bomSnapshot: snapshotOfBom(bom), outputProductId: 'p-blend',
        warehouseId: 'wh-main', plannedQty: 20, status: 'draft');
      expectApprox(
        [for (final l in defaultIssueLines(order, 5)) {'productId': l.productId, 'qty': l.qty}],
        pd['issueLines5'], 'defaultIssueLines');
      final conv = defaultIssueConversion(order, 5);
      expectApprox({'labourCost': conv.labourCost, 'overheadCost': conv.overheadCost},
          pd['conversion5'], 'defaultIssueConversion');
    });

    test('job stage lifecycle (§5.2)', () {
      final js = mm(ops['jobStages']);
      final stages = effectiveJobStages(const ShopSettingsView(
          jobStages: [' Intake ', '', 'Press', 'Press', 'Done']));
      expect(stages, js['effective']);
      Job jobAt(String stage, String status, [List<JobMaterialEvent> events = const []]) => Job(
          id: 'job-x', number: 'JB-7', stage: stage, status: status,
          warehouseId: 'wh-main', materialEvents: events);
      expect(deriveJobStatus(jobAt('Intake', 'open'), stages), js['firstIs']);
      expect(deriveJobStatus(jobAt('Done', 'in_progress'), stages), js['lastIs']);
      expect(deriveJobStatus(jobAt('Press', 'open'), stages), js['midIs']);
      expect(deriveJobStatus(jobAt('Intake', 'delivered'), stages), js['deliveredSticky']);
      expect(
          deriveJobStatus(
              jobAt('Old Stage', 'open', const [JobMaterialEvent(kind: 'issue', productId: 'p-tea')]),
              stages),
          js['renamedWithEvents']);
      expect(effectiveJobStages(null), js['defaults']);
      expect(advanceNoteFor(jobAt('Intake', 'open')), js['advanceNote']);
    });
  });
}

/* --- event-label bookkeeping for the production driver ------- */
/* The Dart composers mint their own entry ids; the fixture      */
/* labels entries e0, e1, … in composition order. These helpers   */
/* maintain the id → label map as the driver composes.            */

final Map<String, String> _eventLabels = {};
int _eventLabelSeq = 0;

void _resetEventLabels() {
  _eventLabels.clear();
  _eventLabelSeq = 0;
}

void _registerEntry(JournalEntry e) {
  _eventLabels[e.id] = 'e${_eventLabelSeq++}';
}

String _labelFor(String entryId) => _eventLabels[entryId] ?? 'EXT';
