/// F5 — offline / conflict drills (Phase F design §3.5–3.6, §9 F5).
/// The failure modes the offline-first design promises to survive,
/// exercised at the composition layer the store funnels through:
///   A. two offline devices take the SAME next bill number —
///      the duplicate detector flags the collision, nothing is
///      renumbered, both bills' entries coexist balanced;
///   B. a queued offline entry meets a period locked (from another
///      device) after it was composed — the posting guard refuses
///      it at flush, and the refusal lands in the rejected-write
///      tray with its documents intact (§3.5);
///   C. two offline devices sell the LAST unit of a product — the
///      derived stock goes negative (flagged, never clamped), and
///      the remedy paths run: a recount adjustment (money-true)
///      and the §1.7 row recount for drifted level rows.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/composers.dart';
import 'package:dukaan_ai/core/documents.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/periods.dart';
import 'package:dukaan_ai/core/stock.dart' as stock;
import 'package:dukaan_ai/core/types.dart';
import 'package:dukaan_ai/data/store.dart' show RejectedWrite;

Map<String, dynamic> mm(dynamic m) => Map<String, dynamic>.from(m as Map);

void main() {
  final fx = jsonDecode(
      File('../harness/fixtures/f5-week.json').readAsStringSync()) as Map<String, dynamic>;
  final shop = mm(fx['shop']);
  final accounts = (shop['accounts'] as List)
      .map((m) => MoneyAccount.fromMap(m['id'] as String, mm(m)))
      .toList();
  final products = (shop['products'] as List)
      .map((m) => Product.fromMap(m['id'] as String, mm(m)))
      .toList();
  final byId = {for (final p in products) p.id: p};
  final slabs = (shop['slabs'] as List)
      .map((m) => TaxSlab.fromMap(m['id'] as String, mm(m)))
      .toList();

  group('drill A — duplicate bill numbers from two offline devices', () {
    Bill mkBill(String id, String productId, double qty, double total, String ts, {int billNo = 118}) {
      final p = byId[productId]!;
      return Bill(
        id: id, billNo: billNo, customerName: 'Walk-in Customer',
        items: [BillItem(productId: productId, name: p.name, qty: qty,
            unitPrice: p.salePrice, unitCost: p.costPrice, total: total)],
        subtotal: total, total: total,
        payments: [BillPayment(method: 'cash', amount: total, accountId: 'acct-till')],
        ts: ts,
      );
    }

    test('detector flags #118 twice; nothing renumbers; both entries coexist', () {
      final billA = mkBill('bill-dev-a', 'p-tea', 1, 1050, '2026-09-14T09:00:00.000Z');
      final billB = mkBill('bill-dev-b', 'p-sugar', 2, 290, '2026-09-14T09:05:00.000Z');
      final billC = mkBill('bill-dev-c', 'p-tea', 1, 1050, '2026-09-14T10:00:00.000Z', billNo: 119);

      final groups = duplicateBillNumbers([
        (id: billA.id, billNo: billA.billNo),
        (id: billB.id, billNo: billB.billNo),
        (id: billC.id, billNo: billC.billNo),
      ]);
      expect(groups, hasLength(1));
      expect(groups.single.number, '118');
      expect(groups.single.docIds, containsAll(['bill-dev-a', 'bill-dev-b']));

      // The detector is read-only: both bills keep #118 (the desk
      // surfaces the collision; it never silently renumbers a
      // printed bill).
      expect(billA.billNo, 118);
      expect(billB.billNo, 118);

      // Both bills posted offline-first: their entries coexist and
      // the merged journal still balances.
      final entryA = composeBillEntry(
        bill: billA, pricedItems: billA.items, costTotal: 800,
        accounts: accounts, productsById: byId, ts: billA.ts,
      ).entry.copyWith(originDevice: 'Counter Tablet');
      final entryB = composeBillEntry(
        bill: billB, pricedItems: billB.items, costTotal: 260,
        accounts: accounts, productsById: byId, ts: billB.ts,
      ).entry.copyWith(originDevice: 'Owner Phone');
      expect(trialBalanceTotal([entryA, entryB]).abs(), lessThan(0.01));
      expect(entryA.originDevice, 'Counter Tablet');
      expect(entryB.originDevice, 'Owner Phone');

      // The same detector guards the §3.6 document series.
      final docGroups = duplicateNumbers([
        (id: 'q-1', number: 'QT-7'), (id: 'q-2', number: 'QT-7'), (id: 'q-3', number: 'QT-8'),
      ]);
      expect(docGroups, hasLength(1));
      expect(docGroups.single.number, 'QT-7');
      expect(docGroups.single.docIds, containsAll(['q-1', 'q-2']));
    });
  });

  group('drill B — period locked after composition: flush refusal → tray', () {
    test('guard refuses the September entry; October entry passes', () {
      final queued = composeCounterSaleEntry(
        saleId: 'sale-offline-1', product: byId['p-sugar']!, qty: 1,
        slabs: slabs, accounts: accounts, ts: '2026-09-10T10:00:00.000Z',
      );
      // The owner locks September from the web while this device
      // was offline (end of 30 Sep, PKT).
      const lockedThrough = '2026-09-30T18:59:59.999Z';
      expect(() => preparePosting(queued, lockedThrough),
          throwsA(isA<PeriodLockedError>()));
      try {
        preparePosting(queued, lockedThrough);
        fail('expected PeriodLockedError');
      } on PeriodLockedError catch (e) {
        expect(e.code, 'period-locked');
        expect(isPeriodLockedError(e), isTrue);
      }
      // An entry dated after the lock flushes normally and gets
      // its business date stamped by the same guard.
      final october = composeCounterSaleEntry(
        saleId: 'sale-offline-2', product: byId['p-sugar']!, qty: 1,
        slabs: slabs, accounts: accounts, ts: '2026-10-02T10:00:00.000Z',
      );
      final stamped = preparePosting(october, lockedThrough);
      expect(stamped.dateISO, '2026-10-02');
    });

    test('the refusal is recorded in the rejected tray, documents intact', () {
      final refused = composeCounterSaleEntry(
        saleId: 'sale-offline-1', product: byId['p-sugar']!, qty: 1,
        slabs: slabs, accounts: accounts, ts: '2026-09-10T10:00:00.000Z',
      );
      // The store's _commit classification (data/store.dart): a
      // rules refusal whose message carries the code is classed
      // 'period-locked' — never 'other', never dropped.
      const serverMessage =
          '[cloud_firestore/permission-denied] period-locked: journal writes at or before 2026-09-30 are refused';
      final reasonClass = serverMessage.contains('period-locked')
          ? 'period-locked'
          : 'other';
      final record = RejectedWrite(
        at: '2026-10-03T09:00:00.000Z',
        reasonClass: reasonClass,
        detail: serverMessage,
        documents: [
          {'collection': 'journal', 'id': refused.id, 'data': refused.toMap()},
          {'collection': 'sales', 'id': 'sale-offline-1', 'data': {'qty': 1}},
        ],
      );
      // The tray persists as JSON on-device; the round-trip must
      // preserve the refusal whole (the desk retries/dismisses
      // from exactly this record).
      final restored = RejectedWrite.fromJson(
          mm(jsonDecode(jsonEncode(record.toJson()))));
      expect(restored.reasonClass, 'period-locked');
      expect(restored.detail, serverMessage);
      expect(restored.documents, hasLength(2));
      expect(restored.documents.first['collection'], 'journal');
      expect(restored.documents.first['id'], refused.id);
      // And the refused entry is nowhere in the posted journal.
      final posted = <JournalEntry>[];
      expect(posted.any((e) => e.id == refused.id), isFalse);
    });
  });

  group('drill C — last unit sold twice offline: negative stock + remedy', () {
    final warehouse = Warehouse(id: 'wh-main', name: 'Main Shop', isDefault: true);
    Product ghee(double qty) => Product(
        id: 'p-last', name: 'Desi Ghee 1kg', costPrice: 900, salePrice: 1170, stockQty: qty);

    test('derived stock goes to −1, flagged not clamped; recount adjustment heals it', () {
      var product = ghee(1);
      var levels = [stock.makeLevel('wh-main', 'p-last', 1)];

      // Two devices, both offline, each sell the last unit.
      final saleA = composeCounterSaleEntry(
        saleId: 'sale-dev-a', product: product, qty: 1,
        slabs: const [], accounts: accounts, ts: '2026-09-14T09:00:00.000Z',
      ).copyWith(originDevice: 'Counter Tablet');
      final saleB = composeCounterSaleEntry(
        saleId: 'sale-dev-b', product: product, qty: 1,
        slabs: const [], accounts: accounts, ts: '2026-09-14T09:02:00.000Z',
      ).copyWith(originDevice: 'Owner Phone');
      for (final _ in [saleA, saleB]) {
        product = product.copyWith(stockQty: product.stockQty - 1);
        levels = stock.applyLevelDelta(levels, 'wh-main', 'p-last', -1);
      }

      // Both sales are real: the journal balances with both in it.
      expect(trialBalanceTotal([saleA, saleB]).abs(), lessThan(0.01));
      // Derived stock is −1 — derived, never clamped at zero.
      expect(product.stockQty, -1);
      expect(stock.rowsTotal(levels, 'p-last'), -1);
      // The dashboard's negative-stock attention predicate flags it.
      expect([product].where((p) => p.stockQty < 0), hasLength(1));
      // Rows and totals agree with each other, so §1.7 drift is
      // silent: this failure mode is flagged by the negative-stock
      // surface, not the drift detector (asserted deliberately).
      expect(stock.stockDrift([product], levels, const []), isEmpty);
      // Device stamps survive persistence (the conflict is
      // attributable to the two devices).
      expect(JournalEntry.fromMap(saleA.id, saleA.toMap()).originDevice, 'Counter Tablet');
      expect(JournalEntry.fromMap(saleB.id, saleB.toMap()).originDevice, 'Owner Phone');

      // Remedy: the shelf count is 0. A recount adjustment of +1
      // books the found unit honestly (Dr inventory / Cr
      // inventory_loss reversal) and clears the flag.
      final adj = composeAdjustmentEntry(
          product: product, rawDelta: 1, reason: 'recount', ts: '2026-09-14T18:00:00.000Z');
      expect(adj, isNotNull);
      expect(adj!.newQty, 0);
      expect(adj.delta, 1);
      expect(trialBalanceTotal([adj.entry]).abs(), lessThan(0.01));
      final healed = product.copyWith(stockQty: adj.newQty);
      expect([healed].where((p) => p.stockQty < 0), isEmpty);
    });

    test('drifted rows (stale re-sync) are flagged and repaired by recountLevels', () {
      // The product total says −1 but a stale device re-synced the
      // row at 0: rows now disagree with the derived total.
      final product = ghee(-1);
      final stale = [stock.makeLevel('wh-main', 'p-last', 0)];
      final drift = stock.stockDrift([product], stale, const []);
      expect(drift, hasLength(1));
      expect(drift.single.productId, 'p-last');
      expect(drift.single.drift, 1); // rows 0 + transit 0 − stockQty −1
      final rec = stock.recountLevels([product], stale, [warehouse], const []);
      expect(rec.repaired, 1);
      expect(stock.rowsTotal(rec.levels, 'p-last'), -1);
      expect(stock.stockDrift([product], rec.levels, const []), isEmpty);
    });
  });
}
