/// Golden-fixture parity (Phase F design §8.2): the Dart composers
/// must produce journal entries EQUAL to the web's, byte-for-byte on
/// accounts / refs / amounts / line order, for the shared fixture
/// scenarios exported by harness/fixtures-export.js from the REAL
/// web/lib composition functions. A template change on either side
/// must move the fixture deliberately — silent divergence between
/// the web's money math and the app's is a CI failure here.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/composers.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/types.dart';

String canon(JournalEntry e) {
  final lines = e.lines
      .map((l) => '${l.account}:${l.debit.toStringAsFixed(2)}:${l.credit.toStringAsFixed(2)}:${l.ref}')
      .join(',');
  return '${e.memo}|${e.refType}|${e.refId}|$lines';
}

String canonExpected(Map<String, dynamic> e) {
  final lines = (e['lines'] as List)
      .map((l) => '${l['account']}:${(l['debit'] as num).toStringAsFixed(2)}:${(l['credit'] as num).toStringAsFixed(2)}:${l['ref']}')
      .join(',');
  return '${e['memo']}|${e['refType']}|${e['refId']}|$lines';
}

void main() {
  final file = File('../harness/fixtures/f1-core.json');
  final fx = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;

  final accounts = (fx['accounts'] as List)
      .map((m) => MoneyAccount.fromMap(m['id'] as String, Map<String, dynamic>.from(m as Map)))
      .toList();
  final products = (fx['products'] as List)
      .map((m) => Product.fromMap(m['id'] as String, Map<String, dynamic>.from(m as Map)))
      .toList();
  final byId = {for (final p in products) p.id: p};
  final slabs = (fx['slabs'] as List)
      .map((m) => TaxSlab.fromMap(m['id'] as String, Map<String, dynamic>.from(m as Map)))
      .toList();

  ComposedBill composeBillFromFixture(Map<String, dynamic> billMap) {
    final raw = Bill.fromMap(billMap['id'] as String, billMap);
    final priced = priceBillLines(
      raw.items.map((i) => BillLineInput(productId: i.productId, qty: i.qty, unitPrice: i.unitPrice)).toList(),
      byId,
    )!;
    final discount = discountOf(priced.subtotal, raw.discountType, raw.discountValue);
    final stamped = stampBillTaxes(priced.items, byId, slabs, discountAmount: discount);
    final bill = Bill(
      id: raw.id, billNo: raw.billNo, customerId: raw.customerId,
      customerName: raw.customerName, customerPhone: raw.customerPhone,
      items: stamped.items, subtotal: priced.subtotal, discountType: raw.discountType,
      discountValue: raw.discountValue, discountAmount: discount,
      taxAmount: stamped.taxAmount, total: stamped.total,
      payments: raw.payments
          .map((p) => BillPayment(method: p.method, amount: p.amount, accountId: p.accountId))
          .toList(),
      status: 'paid', ts: raw.ts,
    );
    return composeBillEntry(
      bill: bill, pricedItems: priced.items, costTotal: priced.costTotal,
      accounts: accounts, productsById: byId, ts: raw.ts,
    );
  }

  final scenarios = (fx['scenarios'] as List).cast<Map<String, dynamic>>();
  final byScenarioId = {for (final s in scenarios) s['id'] as String: s};

  group('golden fixtures (web ≡ Dart, byte-for-byte)', () {
    for (final s in scenarios) {
      final id = s['id'] as String;
      final docs = s['docs'] as Map<String, dynamic>;
      final expected = (s['entries'] as List).cast<Map<String, dynamic>>();

      test(id, () {
        final List<JournalEntry> composed = [];
        switch (id) {
          case 'bill-cash':
          case 'bill-credit-split':
          case 'bill-underpay-tolerance':
          case 'bill-overpay-tolerance':
          case 'bill-tax-exclusive':
          case 'bill-tax-inclusive':
          case 'bill-mixed-class':
            composed.add(composeBillFromFixture(docs['bill'] as Map<String, dynamic>).entry);
          case 'return-partial-udhaar':
            final bill = Bill.fromMap((docs['bill'] as Map)['id'] as String, docs['bill'] as Map<String, dynamic>);
            final credits = [CreditEntry.fromMap((docs['credits'] as List).first['id'] as String, Map<String, dynamic>.from((docs['credits'] as List).first as Map))];
            final r = composeReturnEntry(
              bill: bill, priorReturns: const [], credits: credits,
              lines: (docs['returnLines'] as List)
                  .map((l) => (productId: l['productId'] as String, qty: (l['qty'] as num).toDouble()))
                  .toList(),
              productsById: byId, accounts: accounts, journal: const [],
            )!;
            composed.add(r.entry);
          case 'return-taxed-item-by-item':
            for (final step in (docs['steps'] as List).cast<Map<String, dynamic>>()) {
              final bill = Bill.fromMap((step['bill'] as Map)['id'] as String, step['bill'] as Map<String, dynamic>);
              final priors = (step['priorReturns'] as List)
                  .map((m) => SaleReturn.fromMap(m['id'] as String, Map<String, dynamic>.from(m as Map)))
                  .toList();
              final r = composeReturnEntry(
                bill: bill, priorReturns: priors, credits: const [],
                lines: (step['returnLines'] as List)
                    .map((l) => (productId: l['productId'] as String, qty: (l['qty'] as num).toDouble()))
                    .toList(),
                productsById: byId, accounts: accounts, journal: const [],
              )!;
              composed.add(r.entry);
            }
          case 'counter-sale':
          case 'counter-sale-raw':
            final sale = docs['sale'] as Map<String, dynamic>;
            composed.add(composeCounterSaleEntry(
              saleId: sale['id'] as String, product: byId[sale['productId'] as String]!,
              qty: (sale['qty'] as num).toDouble(), slabs: slabs, accounts: accounts,
            ));
          case 'purchase-untaxed':
          case 'purchase-taxed-mixed':
            final pur = docs['purchase'] as Map<String, dynamic>;
            final res = composePurchaseEntry(
              purchaseId: pur['id'] as String, supplierId: pur['supplierId'] as String,
              lines: (pur['items'] as List)
                  .map((i) => (productId: i['productId'] as String, qty: (i['qty'] as num).toDouble(), unitCost: (i['unitCost'] as num).toDouble()))
                  .toList(),
              productsById: byId, slabs: slabs,
            );
            composed.add(res.entry);
          case 'repayment-cash':
            final row = CreditEntry.fromMap((docs['creditRow'] as Map)['id'] as String, docs['creditRow'] as Map<String, dynamic>);
            composed.add(composeRepaymentEntry(row: row, accounts: accounts));
          case 'credit-given-standalone':
            final row = CreditEntry.fromMap((docs['creditRow'] as Map)['id'] as String, docs['creditRow'] as Map<String, dynamic>);
            composed.add(composeCreditGivenEntry(row: row, accounts: accounts));
          default:
            fail('no Dart composition wired for fixture scenario $id');
        }
        expect(composed.length, expected.length, reason: '$id entry count');
        for (var i = 0; i < expected.length; i++) {
          expect(canon(composed[i]), canonExpected(expected[i]), reason: '$id entry $i');
        }
      });
    }

    test('the whole fixture journal balances (trial balance == 0)', () {
      final entries = <JournalEntry>[];
      for (final s in scenarios) {
        for (final e in (s['entries'] as List).cast<Map<String, dynamic>>()) {
          entries.add(JournalEntry(
            id: 'fx', memo: e['memo'] as String, refType: e['refType'] as String,
            refId: e['refId'] as String?,
            lines: (e['lines'] as List)
                .map((l) => JournalLine(
                      account: l['account'] as String,
                      debit: (l['debit'] as num).toDouble(),
                      credit: (l['credit'] as num).toDouble(),
                      ref: l['ref'] as String?,
                    ))
                .toList(),
          ));
        }
      }
      expect(entries.length, 16);
      expect(trialBalanceTotal(entries).abs(), lessThan(0.009));
      // Purchases clearing nets to zero across the fixture purchases.
      final clearing = accountBalance(entries, 'purchases');
      expect(clearing.abs(), lessThan(0.009));
      // Receivables from the journal == credits subledger story of the
      // fixtures (800 bill udhaar + 2,000 standalone − 141 return
      // reduction − 300 repayment).
      expect(receivablesTotal(entries), closeTo(800 + 2000 - 141 - 300, 0.009));
      expect(payablesTotal(entries), closeTo(8000 + 7850, 0.009));
      expect(byScenarioId.keys.length, 15);
    });
  });
}
