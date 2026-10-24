/// Golden-fixture parity for Fix Round 1 (the owner's live test
/// of 2026-10-24): the Dart ports of the five findings' fixes
/// must produce results EQUAL to the web's — the credit-lot
/// aging + WhatsApp udhaar positions (F4), the derived dayOffset
/// (F3), the Balance Sheet (F2), and the opening-stock gap +
/// entry (F5) — for the shared scenarios exported by
/// harness/fixtures-export-fr1.js from the REAL web functions.
/// (F1's fix is web-only: the Dart settings parse always read
/// the owner doc whole — see PRODUCTION.md.)
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/fiscal.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/periods.dart';
import 'package:dukaan_ai/core/reports.dart';
import 'package:dukaan_ai/core/types.dart';
import 'package:dukaan_ai/core/whatsapp.dart';

bool approx(num a, num b) => (a.toDouble() - b.toDouble()).abs() < 0.011;

void expectBuckets(AgingBuckets actual, Map<String, dynamic> expected, String label) {
  expect(approx(actual.current, expected['current'] as num), isTrue, reason: '$label.current');
  expect(approx(actual.mid, expected['mid'] as num), isTrue, reason: '$label.mid');
  expect(approx(actual.old, expected['old'] as num), isTrue, reason: '$label.old');
  expect(approx(actual.total, expected['total'] as num), isTrue, reason: '$label.total');
}

void expectSheet(BalanceSheetReport actual, Map<String, dynamic> e, String label) {
  Map<String, double> rowsOf(List<AccountBalanceRow> rows) =>
      {for (final r in rows) r.account: r.balance};
  void expectRows(List<AccountBalanceRow> actualRows, List<dynamic> expectedRows, String side) {
    final a = rowsOf(actualRows);
    final x = <String, double>{
      for (final r in expectedRows) r['account'] as String: (r['balance'] as num).toDouble()
    };
    expect(a.length, x.length, reason: '$label.$side row count');
    x.forEach((k, v) => expect(approx(a[k] ?? double.nan, v), isTrue, reason: '$label.$side.$k'));
  }

  expectRows(actual.assets, e['assets'] as List, 'assets');
  expectRows(actual.liabilities, e['liabilities'] as List, 'liabilities');
  expectRows(actual.equity, e['equity'] as List, 'equity');
  for (final f in ['assetsTotal', 'clearing', 'liabilitiesTotal', 'equityTotal', 'resultToDate', 'totalAssets', 'totalLiabilitiesEquity', 'difference']) {
    final av = switch (f) {
      'assetsTotal' => actual.assetsTotal,
      'clearing' => actual.clearing,
      'liabilitiesTotal' => actual.liabilitiesTotal,
      'equityTotal' => actual.equityTotal,
      'resultToDate' => actual.resultToDate,
      'totalAssets' => actual.totalAssets,
      'totalLiabilitiesEquity' => actual.totalLiabilitiesEquity,
      _ => actual.difference,
    };
    expect(approx(av, e[f] as num), isTrue, reason: '$label.$f');
  }
  expect(actual.balanced, e['balanced'], reason: '$label.balanced');
  expect(actual.asAtDate, e['asAtDate'], reason: '$label.asAtDate');
}

List<JournalEntry> journalOf(List<dynamic> entries) => [
      for (final e in entries)
        JournalEntry.fromMap(e['id'] as String, Map<String, dynamic>.from(e))
    ];

void main() {
  final fx = jsonDecode(File('../harness/fixtures/fr1-core.json').readAsStringSync()) as Map<String, dynamic>;

  group('FR1 · F4 aging (lot allocation)', () {
    final aging = fx['aging'] as Map<String, dynamic>;
    final credits = [
      for (final c in aging['credits'] as List)
        CreditEntry.fromMap(c['id'] as String, Map<String, dynamic>.from(c))
    ];
    final expected = aging['expected'] as Map<String, dynamic>;

    test('receivables aging nets credit-note reversals (the live scenario)', () {
      expectBuckets(receivablesAging(credits), expected['receivables'] as Map<String, dynamic>, 'receivables');
    });

    test('per-customer lots match the web allocation', () {
      for (final (cust, key) in [('fr1-cust-1', 'lotsCust1'), ('fr1-cust-2', 'lotsCust2')]) {
        final lots = creditLotsRemaining(credits.where((c) => c.customerId == cust).toList());
        final exp = (expected[key] as List).cast<Map<String, dynamic>>();
        expect(lots.length, exp.length, reason: key);
        for (var i = 0; i < exp.length; i++) {
          expect(lots[i].lotKey, exp[i]['lotKey'], reason: '$key[$i].lotKey');
          expect(lots[i].dayOffset, exp[i]['dayOffset'], reason: '$key[$i].dayOffset');
          expect(approx(lots[i].remaining, exp[i]['remaining'] as num), isTrue, reason: '$key[$i].remaining');
        }
      }
    });

    test('WhatsApp udhaar positions read the same lots', () {
      final u1 = customerUdhaarPosition(credits, 'fr1-cust-1');
      final e1 = expected['udhaarCust1'] as Map<String, dynamic>;
      expect(approx(u1.outstanding, e1['outstanding'] as num), isTrue);
      expect(u1.oldestAgeDays, e1['oldestAgeDays']);
      final u2 = customerUdhaarPosition(credits, 'fr1-cust-2');
      final e2 = expected['udhaarCust2'] as Map<String, dynamic>;
      expect(approx(u2.outstanding, e2['outstanding'] as num), isTrue);
      expect(u2.oldestAgeDays, e2['oldestAgeDays']);
    });

    test('payables mirror: debit-note returns netted per purchase', () {
      final purchases = [
        for (final p in aging['purchases'] as List)
          Purchase.fromMap(p['id'] as String, Map<String, dynamic>.from(p))
      ];
      final payments = [
        for (final p in aging['supplierPayments'] as List)
          SupplierPayment.fromMap(p['id'] as String, Map<String, dynamic>.from(p))
      ];
      final returns = [
        for (final p in aging['purchaseReturns'] as List)
          PurchaseReturn.fromMap(p['id'] as String, Map<String, dynamic>.from(p))
      ];
      expectBuckets(payablesAging(purchases, payments, returns), expected['payables'] as Map<String, dynamic>, 'payables');
      expect(approx(supplierBalance(purchases, payments, 'fr1-sup-1', returns), expected['supplierBalance'] as num), isTrue);
    });
  });

  group('FR1 · F3 derived dayOffset', () {
    test('dayOffsetForTs matches the web on every case', () {
      for (final c in (fx['dayOffsets']['cases'] as List).cast<Map<String, dynamic>>()) {
        expect(
          dayOffsetForTs(c['ts'] as String, c['today'] as String, (c['fallback'] as num?)?.toInt() ?? 0),
          c['expected'],
          reason: '${c['ts']} @ ${c['today']}',
        );
      }
    });
  });

  group('FR1 · F2 Balance Sheet', () {
    final bs = fx['balanceSheet'] as Map<String, dynamic>;
    final r = bs['range'] as Map<String, dynamic>;
    final range = ReportRange(
      fromDate: r['fromDate'] as String,
      toDate: r['toDate'] as String,
      fromTs: r['fromTs'] as String,
      toTs: r['toTs'] as String,
    );
    final expected = bs['expected'] as Map<String, dynamic>;

    test('seed journal statement balances and matches', () {
      expectSheet(balanceSheetReport(journalOf(bs['seedEntries'] as List), range),
          expected['seed'] as Map<String, dynamic>, 'seed');
    });
    test('trading walk states exactly', () {
      expectSheet(balanceSheetReport(journalOf(bs['walkEntries'] as List), range),
          expected['walk'] as Map<String, dynamic>, 'walk');
    });
    test('mid-clearing state still balances', () {
      expectSheet(balanceSheetReport(journalOf(bs['walkClearingEntries'] as List), range),
          expected['walkClearing'] as Map<String, dynamic>, 'walkClearing');
    });
    test('across an FY close the result moves into retained earnings', () {
      expectSheet(balanceSheetReport(journalOf(bs['walkClosedEntries'] as List), range),
          expected['walkClosed'] as Map<String, dynamic>, 'walkClosed');
    });
  });

  group('FR1 · F5 opening stock', () {
    final os = fx['openingStock'] as Map<String, dynamic>;
    final products = [
      for (final p in os['products'] as List)
        Product.fromMap(p['id'] as String, Map<String, dynamic>.from(p))
    ];
    final expected = os['expected'] as Map<String, dynamic>;

    void expectGap(OpeningStockGap actual, Map<String, dynamic> e, String label) {
      expect(approx(actual.shelf, e['shelf'] as num), isTrue, reason: '$label.shelf');
      expect(approx(actual.book, e['book'] as num), isTrue, reason: '$label.book');
      expect(approx(actual.gap, e['gap'] as num), isTrue, reason: '$label.gap');
      expect(approx(actual.rawGap, e['rawGap'] as num), isTrue, reason: '$label.rawGap');
    }

    void expectEntry(JournalEntry? actual, Map<String, dynamic> e, String label) {
      expect(actual, isNotNull, reason: label);
      expect(actual!.refType, e['refType'], reason: '$label.refType');
      expect(actual.memo, e['memo'], reason: '$label.memo');
      final expLines = (e['lines'] as List).cast<Map<String, dynamic>>();
      expect(actual.lines.length, expLines.length, reason: '$label.lines');
      for (var i = 0; i < expLines.length; i++) {
        expect(actual.lines[i].account, expLines[i]['account'], reason: '$label.lines[$i].account');
        expect(approx(actual.lines[i].debit, expLines[i]['debit'] as num), isTrue, reason: '$label.lines[$i].debit');
        expect(approx(actual.lines[i].credit, expLines[i]['credit'] as num), isTrue, reason: '$label.lines[$i].credit');
      }
      expect(entryBalances(actual), isTrue, reason: '$label balances');
    }

    test('gap A: raw book ahead of raw shelf clamps the raw share to 0', () {
      final journal = journalOf(os['journalA'] as List);
      final gap = openingStockGap(journal, products);
      expectGap(gap, expected['gapA'] as Map<String, dynamic>, 'gapA');
      final entry = buildOpeningStockEntry(gap.gap, gap.rawGap, ts: '2026-10-24T05:00:00.000Z');
      expectEntry(entry, expected['entryA'] as Map<String, dynamic>, 'entryA');
      expectGap(openingStockGap([...journal, entry!], products),
          expected['gapAfterA'] as Map<String, dynamic>, 'gapAfterA');
    });

    test('gap B: the entry class-splits Dr inventory / Dr inventory_raw / Cr capital', () {
      final journal = journalOf(os['journalB'] as List);
      final gap = openingStockGap(journal, products);
      expectGap(gap, expected['gapB'] as Map<String, dynamic>, 'gapB');
      final entry = buildOpeningStockEntry(gap.gap, gap.rawGap, ts: '2026-10-24T05:00:00.000Z');
      expectEntry(entry, expected['entryB'] as Map<String, dynamic>, 'entryB');
    });

    test('no positive gap, no entry', () {
      expect(buildOpeningStockEntry(0, 0), isNull);
      expect(buildOpeningStockEntry(-500, 0), isNull);
    });
  });
}
