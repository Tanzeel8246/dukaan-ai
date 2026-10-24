/// Phase H · H2 — Dart-native loyalty checks: the registry and
/// gating facts, and the lifecycle walked through the STORE'S OWN
/// composition path (composeBillEntry / composeReturnEntry /
/// composeVoidFull + the loyalty composers, exactly as
/// data/store.dart sequences them), with TB == 0 and both audit
/// identities asserted after every event. The byte-for-byte
/// proof against the web functions lives in h2_fixtures_test.dart.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/coa.dart';
import 'package:dukaan_ai/core/composers.dart';
import 'package:dukaan_ai/core/composers_f2.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/loyalty.dart';
import 'package:dukaan_ai/core/permissions.dart';
import 'package:dukaan_ai/core/plans.dart';
import 'package:dukaan_ai/core/types.dart';

const cust = 'cust-h2';
final settings = resolveLoyaltySettings(const {
  'loyalty': {'enabled': true},
});
const accounts = [
  MoneyAccount(id: 'acct-till', name: 'Till', kind: 'cash', method: 'cash'),
];
const products = [
  Product(id: 'p1', name: 'Rice 10kg', costPrice: 6000, salePrice: 10000, stockQty: 50),
  Product(id: 'p2', name: 'Tea 1kg', costPrice: 1200, salePrice: 2000, stockQty: 50),
];
final byId = {for (final p in products) p.id: p};

String t(String d) => '${d}T05:00:00.000Z';

void expectIdentities(List<JournalEntry> journal, String nowIso, String what) {
  expect(trialBalanceTotal(journal).abs(), lessThan(0.005), reason: '$what: TB == 0');
  final gl = accountNormalBalance(journal, 'loyalty_payable');
  var sum = 0.0;
  loyaltyRupeesByCustomer(journal).forEach((_, v) => sum += v);
  expect(gl, closeTo(sum, 1e-9), reason: '$what: GL ≡ Σ customers');
  final pos = customerLoyalty(journal, cust, settings, nowIso);
  var rsSum = 0.0;
  for (final v in pos.vintages) {
    rsSum += v.rsUnspent;
  }
  expect(pos.rupees, closeTo(rsSum, 1e-9),
      reason: '$what: Rs ≡ Σ points × snapshot rates');
  expect(pos.rupees, closeTo(gl, 1e-9), reason: '$what: position ≡ GL');
}

/// Compose a bill exactly as the store does (price → compose →
/// earn off the pre-bill journal), returning the posted bill and
/// the entries to append, in posting order.
({Bill posted, List<JournalEntry> entries}) postBillViaComposers(
  List<JournalEntry> journal, {
  required String id,
  required int billNo,
  required List<({String productId, double qty})> lines,
  required List<BillPayment> payments,
  required String ts,
}) {
  final priced = priceBillLines(
    lines.map((l) => BillLineInput(productId: l.productId, qty: l.qty)).toList(),
    byId,
  )!;
  final total = priced.items.fold(0.0, (a, i) => a + i.total);
  final draft = Bill(
    id: id, billNo: billNo, customerId: cust, customerName: 'H2 Customer',
    items: priced.items, subtotal: total, total: total,
    payments: payments, status: 'paid', ts: ts,
  );
  final composed = composeBillEntry(
    bill: draft, pricedItems: priced.items, costTotal: priced.costTotal,
    accounts: accounts, productsById: byId, ts: ts,
  );
  final earn = buildLoyaltyEarnEntry(
    journal: journal, bill: composed.bill, settings: settings, ts: ts,
  );
  return (
    posted: composed.bill,
    entries: [composed.entry, if (earn != null) earn],
  );
}

void main() {
  group('registry + gating', () {
    test('COA: 30 codes, the loyalty pair last', () {
      expect(accountCodes.length, 30);
      expect(accountCodes.sublist(28), ['loyalty_payable', 'expense_loyalty']);
    });
    test('plan gating: loyalty is a Standard (Growth) module', () {
      expect(moduleMinTier('loyalty'), 'standard');
      expect(tierIncludesModule('core', 'loyalty'), isFalse);
      expect(tierIncludesModule('standard', 'loyalty'), isTrue);
      expect(tierIncludesModule('advanced', 'loyalty'), isTrue);
    });
    test('refType gate: loyalty_expire needs a Standard snapshot', () {
      // Catalogue truth (both clients): Basic rides the Core
      // module set; the Trial rides Standard's — so Basic is the
      // refusing snapshot and Trial/Standard pass.
      final basic = snapshotFor('basic', '2026-10-23T00:00:00.000Z', assignedBy: 'test');
      final trial = snapshotFor('trial', '2026-10-23T00:00:00.000Z', assignedBy: 'test');
      final standard = snapshotFor('standard', '2026-10-23T00:00:00.000Z', assignedBy: 'test');
      expect(refTypeTierOk(basic, 'loyalty_expire'), isFalse);
      expect(refTypeTierOk(trial, 'loyalty_expire'), isTrue);
      expect(refTypeTierOk(standard, 'loyalty_expire'), isTrue);
    });
    test('RBAC: owner/manager full, accountant read, cashier none', () {
      expect(can('owner', 'loyalty', 'view'), isTrue);
      expect(can('owner', 'loyalty', 'write'), isTrue);
      expect(can('manager', 'loyalty', 'view'), isTrue);
      expect(can('manager', 'loyalty', 'write'), isTrue);
      expect(can('accountant', 'loyalty', 'view'), isTrue);
      expect(can('accountant', 'loyalty', 'write'), isFalse);
      expect(can('cashier', 'loyalty', 'view'), isFalse);
      expect(can('cashier', 'loyalty', 'write'), isFalse);
    });
  });

  group('the lifecycle through the store composers', () {
    final journal = <JournalEntry>[];
    late Bill posted1, posted2;
    late JournalEntry earn1;

    test('bill 1: cash sale earns 100; the earn rides the same posting', () {
      final r = postBillViaComposers(
        journal,
        id: 'h2-b1', billNo: 1,
        lines: [(productId: 'p1', qty: 1)],
        payments: const [BillPayment(method: 'cash', amount: 10000)],
        ts: t('2026-01-05'),
      );
      posted1 = r.posted;
      journal.addAll(r.entries);
      earn1 = r.entries[1];
      expect(earn1.refType, 'loyalty_earn');
      expect(earn1.points, 100);
      expect(customerLoyalty(journal, cust, settings, t('2026-01-05')).points, 100);
      expectIdentities(journal, t('2026-01-05'), 'after bill 1');
    });

    test('bill 2: points tender validates, lands as a leg + payload, earns 20', () {
      // The store's refusal check, verbatim: the quote must cover
      // the wanted points at the wanted rupees under the cap.
      final quote = loyaltyRedemptionQuote(
          journal, cust, 50, loyaltyRedeemCapRs(2000, settings));
      expect(quote.points, 50);
      expect(quote.rs, 50);
      final r = postBillViaComposers(
        journal,
        id: 'h2-b2', billNo: 2,
        lines: [(productId: 'p2', qty: 1)],
        payments: const [
          BillPayment(method: 'cash', amount: 50, instrument: 'points', loyaltyPoints: 50),
          BillPayment(method: 'cash', amount: 1950),
        ],
        ts: t('2026-02-01'),
      );
      posted2 = r.posted;
      final entry = r.entries[0];
      final leg = entry.lines.where((l) => l.account == 'loyalty_payable').toList();
      expect(leg.length, 1);
      expect(leg.single.debit, 50);
      expect(leg.single.ref, cust);
      expect(entry.loyaltyPointsUsed, 50);
      // The stored payment stamp: no money account, points ride.
      final stamp = posted2.payments.firstWhere((p) => p.instrument == 'points');
      expect(stamp.accountId, isNull);
      expect(stamp.loyaltyPoints, 50);
      expect(stamp.method, 'cash');
      journal.addAll(r.entries);
      expect(customerLoyalty(journal, cust, settings, t('2026-02-01')).points, 70);
      expectIdentities(journal, t('2026-02-01'), 'after bill 2');
    });

    test('full return of bill 2: re-credit + clawback citing the note', () {
      final r = composeReturnEntry(
        bill: posted2, priorReturns: const [], credits: const [],
        lines: [(productId: 'p2', qty: 1)], productsById: byId,
        journal: journal, accounts: accounts, noteId: 'note-1', ts: t('2026-02-02'),
      )!;
      final leg = r.entry.lines.where((l) => l.account == 'loyalty_payable').toList();
      expect(leg.length, 1);
      expect(leg.single.credit, 50);
      expect(r.entry.loyaltyPointsReturned, 50);
      expect(r.saleReturn.loyaltyRecreditRs, 50);
      expect(r.saleReturn.loyaltyRecreditPoints, 50);
      expect(r.saleReturn.refundAmount, 1950); // cash back excludes the points share
      expect(r.clawback, isNotNull);
      expect(r.clawback!.points, -20);
      expect(r.clawback!.refId, 'note-1');
      journal.addAll([r.entry, r.clawback!]);
      expect(customerLoyalty(journal, cust, settings, t('2026-02-02')).points, 100);
      expectIdentities(journal, t('2026-02-02'), 'after return');

      // Without a note, the clawback cites the return itself.
      final preJournal = journal.sublist(0, journal.length - 2);
      final r2 = composeReturnEntry(
        bill: posted2, priorReturns: const [], credits: const [],
        lines: [(productId: 'p2', qty: 1)], productsById: byId,
        journal: preJournal, accounts: accounts, ts: t('2026-02-02'),
      )!;
      expect(r2.clawback!.refId, r2.saleReturn.id);
    });

    test('void of bill 1: whole earn reversed, marked on the earn', () {
      final v = composeVoidFull(
        bill: posted1, credits: const [], accounts: accounts,
        productsById: byId, cheques: const [], journal: journal, ts: t('2026-02-03'),
      )!;
      expect(v.entry.loyaltyPointsReturned, isNull); // bill 1 had no points tender
      expect(v.clawback, isNotNull);
      expect(v.clawback!.points, -100);
      expect(v.clawback!.refId, 'h2-b1');
      expect(v.clawback!.reversesId, earn1.id);
      journal.addAll([v.entry, v.clawback!]);
      expect(customerLoyalty(journal, cust, settings, t('2026-02-03')).points, 0);
      expect(accountBalance(journal, 'expense_loyalty'), 0);
      expectIdentities(journal, t('2026-02-03'), 'after void');
    });

    test('void of a points-paid bill hands the tender back whole', () {
      final j2 = <JournalEntry>[];
      final a = postBillViaComposers(
        j2,
        id: 'h2-va', billNo: 1,
        lines: [(productId: 'p1', qty: 1)],
        payments: const [BillPayment(method: 'cash', amount: 10000)],
        ts: t('2026-03-01'),
      );
      j2.addAll(a.entries);
      final b = postBillViaComposers(
        j2,
        id: 'h2-vb', billNo: 2,
        lines: [(productId: 'p2', qty: 1)],
        payments: const [
          BillPayment(method: 'cash', amount: 50, instrument: 'points', loyaltyPoints: 50),
          BillPayment(method: 'cash', amount: 1950),
        ],
        ts: t('2026-03-02'),
      );
      j2.addAll(b.entries);
      final earnB = b.entries[1];
      final v = composeVoidFull(
        bill: b.posted, credits: const [], accounts: accounts,
        productsById: byId, cheques: const [], journal: j2, ts: t('2026-03-03'),
      )!;
      final leg = v.entry.lines.where((l) => l.account == 'loyalty_payable').toList();
      expect(leg.length, 1);
      expect(leg.single.credit, 50);
      expect(leg.single.ref, cust);
      expect(v.entry.loyaltyPointsReturned, 50);
      expect(v.clawback!.points, -20);
      expect(v.clawback!.reversesId, earnB.id);
      j2.addAll([v.entry, v.clawback!]);
      expect(customerLoyalty(j2, cust, settings, t('2026-03-03')).points, 100);
      expectIdentities(j2, t('2026-03-03'), 'after points-bill void');
    });

    test('expiry: due list derives, the release zeroes the vintage', () {
      final j3 = <JournalEntry>[];
      final a = postBillViaComposers(
        j3,
        id: 'h2-e1', billNo: 1,
        lines: [(productId: 'p1', qty: 1)],
        payments: const [BillPayment(method: 'cash', amount: 10000)],
        ts: t('2026-01-05'),
      );
      j3.addAll(a.entries);
      expect(loyaltyExpiryDue(j3, t('2026-06-01')), isEmpty);
      final due = loyaltyExpiryDue(j3, '2027-01-06T00:00:00.000Z');
      expect(due.length, 1);
      final rel = buildLoyaltyExpiryEntry(
        customerId: cust, customerName: 'H2 Customer',
        vintage: due.single.vintage, ts: '2027-01-06T00:00:00.000Z',
      )!;
      expect(rel.refType, 'loyalty_expire');
      expect(rel.points, 100);
      j3.add(rel);
      expect(customerLoyalty(j3, cust, settings, '2027-01-06T00:00:00.000Z').points, 0);
      expect(accountBalance(j3, 'expense_loyalty'), 0);
      expectIdentities(j3, '2027-01-06T00:00:00.000Z', 'after expiry');
    });
  });

  group('cross-client continuation over the web-composed walk', () {
    test('a Dart-composed earn extends the fixture journal cleanly', () {
      final fx = (jsonDecode(
              File('../harness/fixtures/h2-core.json').readAsStringSync())
          as Map)
          .cast<String, dynamic>();
      final journal = <JournalEntry>[];
      for (final step in (fx['steps'] as List)) {
        for (final raw in ((step as Map)['appended'] as List)) {
          final m = (raw as Map).cast<String, dynamic>();
          journal.add(JournalEntry.fromMap(m['id'] as String, m));
        }
      }
      final before =
          customerLoyalty(journal, 'h1-cust', settings, '2027-01-07T00:00:00.000Z');
      final bill = Bill(
        id: 'h2-next', billNo: 42, customerId: 'h1-cust',
        customerName: 'H1 Customer', total: 10000, status: 'paid',
        ts: '2027-01-07T05:00:00.000Z',
      );
      final earn = buildLoyaltyEarnEntry(
        journal: journal, bill: bill, settings: settings,
        ts: '2027-01-07T05:00:00.000Z',
      );
      expect(earn, isNotNull);
      journal.add(earn!);
      final after =
          customerLoyalty(journal, 'h1-cust', settings, '2027-01-07T00:00:00.000Z');
      expect(after.points, before.points + (earn.points ?? 0));
      expect(trialBalanceTotal(journal).abs(), lessThan(0.005));
      final gl = accountNormalBalance(journal, 'loyalty_payable');
      var sum = 0.0;
      loyaltyRupeesByCustomer(journal).forEach((_, v) => sum += v);
      expect(gl, closeTo(sum, 1e-9));
    });
  });
}
