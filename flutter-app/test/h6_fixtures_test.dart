/// Phase H · H6 — the Dart day-close port proven against the
/// REAL web derivation: harness/fixtures/h6-core.json is exported
/// from the compiled TypeScript dayCloseSummary
/// (fixtures-export-h6.js) over a crafted dataset exercising
/// every bucket rule the H6 alignment fixed — cheque + points
/// payment parts, voided + held bills, a credit part, a counter
/// sale, cheque expense / repayment / supplier payment and a
/// reversal supplier row. Before H6 the apps' inline buckets
/// counted voided bills and cheque parts, dropped credit parts
/// and counter sales, and summed supplier payments unfiltered;
/// this test is the lock that they cannot drift again.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/types.dart';

Map<String, dynamic> mm(dynamic v) => (v as Map).cast<String, dynamic>();
List<dynamic> ll(dynamic v) => v as List<dynamic>;

void main() {
  final fx = jsonDecode(
      File('../harness/fixtures/h6-core.json').readAsStringSync()) as Map<String, dynamic>;
  final inputs = mm(fx['inputs']);
  final expected = mm(fx['expected']);

  List<T> rows<T>(String key, T Function(String, Map<String, dynamic>) of) => [
        for (final r in ll(inputs[key])) of((r as Map)['id'] as String, mm(r)),
      ];

  test('dayCloseSummary: the Dart port reproduces the web derivation exactly', () {
    final summary = dayCloseSummary(
      sales: rows('sales', (id, m) => Sale.fromMap(id, m)),
      bills: rows('bills', (id, m) => Bill.fromMap(id, m)),
      expenses: rows('expenses', (id, m) => Expense.fromMap(id, m)),
      credits: rows('credits', (id, m) => CreditEntry.fromMap(id, m)),
      supplierPayments:
          rows('supplierPayments', (id, m) => SupplierPayment.fromMap(id, m)),
      returnsRefundCash: (inputs['returnsRefundCash'] as num).toDouble(),
      cashIn: (inputs['cashIn'] as num).toDouble(),
      cashOut: (inputs['cashOut'] as num).toDouble(),
      openingCash: (inputs['openingCash'] as num).toDouble(),
    );
    final expByMethod = mm(expected['salesByMethod']);
    expect(summary.salesByMethod.length, expByMethod.length,
        reason: 'bucket set');
    for (final k in expByMethod.keys) {
      expect(summary.salesByMethod[k], (expByMethod[k] as num).toDouble(),
          reason: 'salesByMethod.$k');
    }
    void eq(String name, double actual) =>
        expect(actual, (expected[name] as num).toDouble(), reason: name);
    eq('cashSales', summary.cashSales);
    eq('expensesTotal', summary.expensesTotal);
    eq('expensesCash', summary.expensesCash);
    eq('creditGiven', summary.creditGiven);
    eq('creditReceived', summary.creditReceived);
    eq('supplierPaidCash', summary.supplierPaidCash);
    eq('refundsCash', summary.refundsCash);
    eq('expectedCash', summary.expectedCash);
  });
}
