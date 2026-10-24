/// Golden-fixture parity for F2 (Phase F design §8.2): the Dart F2
/// composers, document derivations and report builders must produce
/// results EQUAL to the web's, byte-for-byte on journal entries
/// (accounts / refs / amounts / line order / reversal links), for the
/// shared fixture scenarios exported by harness/fixtures-export-f2.js
/// from the REAL web/lib composition functions. A template change on
/// either side must move the fixture deliberately.
import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/composers.dart';
import 'package:dukaan_ai/core/composers_f2.dart';
import 'package:dukaan_ai/core/documents.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/reports.dart';
import 'package:dukaan_ai/core/selectors.dart' as sel;
import 'package:dukaan_ai/core/tax.dart';
import 'package:dukaan_ai/core/types.dart';

/// Canonical entry form, F2: memo | refType | refId | reversesLabel
/// | lines (account:debit:credit:ref). Reversal targets are labelled
/// by position in the composed list (e0, e1, …) or EXT when the
/// reversed entry lives outside the scenario — the same labels the
/// exporter wrote.
String canonF2(JournalEntry e, Map<String, String> idLabels) {
  final lines = e.lines
      .map((l) => '${l.account}:${l.debit.toStringAsFixed(2)}:${l.credit.toStringAsFixed(2)}:${l.ref}')
      .join(',');
  final rev = e.reversesId == null ? 'null' : (idLabels[e.reversesId] ?? 'EXT');
  return '${e.memo}|${e.refType}|${e.refId}|$rev|$lines';
}

String canonF2Expected(Map<String, dynamic> e) {
  final lines = (e['lines'] as List)
      .map((l) => '${l['account']}:${(l['debit'] as num).toStringAsFixed(2)}:${(l['credit'] as num).toStringAsFixed(2)}:${l['ref']}')
      .join(',');
  return '${e['memo']}|${e['refType']}|${e['refId']}|${e['reversesId']}|$lines';
}

/// Deep compare with paisa tolerance on numbers (reports only —
/// journal entries are compared byte-exact via canonF2).
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

JournalEntry entryFromNorm(Map<String, dynamic> e, String id) => JournalEntry(
      id: id, memo: e['memo'] as String, refType: e['refType'] as String,
      refId: e['refId'] as String?,
      reversesId: (e['reversesId'] as String?) == 'EXT' ? 'external-id' : e['reversesId'] as String?,
      lines: (e['lines'] as List)
          .map((l) => JournalLine(
                account: l['account'] as String,
                debit: (l['debit'] as num).toDouble(),
                credit: (l['credit'] as num).toDouble(),
                ref: l['ref'] as String?,
              ))
          .toList(),
      ts: (e['ts'] as String?) ?? '2026-10-22T10:00:00.000Z',
      dayOffset: (e['dayOffset'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> chequeCanon(Cheque c) => {
      'chequeNo': c.chequeNo, 'bankName': c.bankName, 'amount': c.amount,
      'direction': c.direction, 'status': c.status, 'sourceType': c.sourceType,
      'sourceId': c.sourceId, 'partyId': c.partyId, 'partyName': c.partyName,
      'partyKind': c.partyKind, 'accountId': c.accountId,
      'issueDateISO': c.issueDateISO, 'dueDateISO': c.dueDateISO,
      'capturedIsEntry': c.entryIds['captured'] != null,
    };

Map<String, dynamic> chequeExpected(Map<String, dynamic> m) => {
      'chequeNo': m['chequeNo'], 'bankName': m['bankName'], 'amount': m['amount'],
      'direction': m['direction'], 'status': m['status'], 'sourceType': m['sourceType'],
      'sourceId': m['sourceId'], 'partyId': m['partyId'], 'partyName': m['partyName'],
      'partyKind': m['partyKind'], 'accountId': m['accountId'],
      'issueDateISO': m['issueDateISO'], 'dueDateISO': m['dueDateISO'],
      'capturedIsEntry': (mm(m['entryIds'])['captured']) == 'ENTRY',
    };

void main() {
  final file = File('../harness/fixtures/f2-core.json');
  final fx = jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;

  final accounts = (fx['accounts'] as List).map((m) => MoneyAccount.fromMap(m['id'] as String, mm(m))).toList();
  final products = (fx['products'] as List).map((m) => Product.fromMap(m['id'] as String, mm(m))).toList();
  final byId = {for (final p in products) p.id: p};
  final slabs = (fx['slabs'] as List).map((m) => TaxSlab.fromMap(m['id'] as String, mm(m))).toList();
  final customer = Customer.fromMap((mm(fx['customer']))['id'] as String, mm(fx['customer']));
  final supplier = Supplier.fromMap((mm(fx['supplier']))['id'] as String, mm(fx['supplier']));
  const settings = ShopSettingsView();

  final scenarios = (fx['scenarios'] as List).cast<Map<String, dynamic>>();

  group('F2 golden fixtures — posting composers (web ≡ Dart)', () {
    for (final s in scenarios) {
      final id = s['id'] as String;
      final docs = s['docs'] as Map<String, dynamic>;
      final expected = (s['entries'] as List).cast<Map<String, dynamic>>();

      test(id, () {
        final composed = <JournalEntry>[];
        switch (id) {
          case 'supplier-payment-cash':
          case 'supplier-payment-bank':
          case 'supplier-payment-cheque':
            final sp = mm(docs['payment']);
            final chqDoc = docs['cheque'] != null ? mm(docs['cheque']) : null;
            final c = composeSupplierPayment(
              paymentId: sp['id'] as String,
              supplier: supplier,
              amount: (sp['amount'] as num).toDouble(),
              method: sp['method'] as String,
              accountId: sp['accountId'] as String?,
              note: (sp['note'] as String?) ?? '',
              instrument: sp['instrument'] as String?,
              chequeId: sp['chequeId'] as String?,
              chequeDraft: chqDoc != null
                  ? ChequeDraft(
                      chequeNo: chqDoc['chequeNo'] as String,
                      bankName: chqDoc['bankName'] as String,
                      issueDateISO: chqDoc['issueDateISO'] as String,
                      dueDateISO: chqDoc['dueDateISO'] as String)
                  : null,
              accounts: accounts,
              // The web minted PV-n over the growing payments list.
              existingPayments: [
                if (id != 'supplier-payment-cash')
                  SupplierPayment(id: 'sp-prior-1', supplierId: 'sup-1', voucherNo: 'PV-1'),
                if (id == 'supplier-payment-cheque')
                  SupplierPayment(id: 'sp-prior-2', supplierId: 'sup-1', voucherNo: 'PV-2'),
              ],
              ts: sp['ts'] as String,
            )!;
            composed.add(c.entry);
            expect(c.row.voucherNo, sp['voucherNo']);
            expect(c.row.accountId, sp['accountId']);
            if (chqDoc != null) {
              expectApprox(chequeCanon(c.cheque!), chequeExpected(chqDoc), '$id cheque doc');
            }
          case 'expense-cash':
            final ex = mm(docs['expense']);
            final c = composeExpense(
              expenseId: ex['id'] as String,
              category: ex['category'] as String,
              amount: (ex['amount'] as num).toDouble(),
              method: ex['method'] as String,
              accountId: ex['accountId'] as String?,
              note: (ex['note'] as String?) ?? '',
              accounts: accounts, journal: const [], now: ex['ts'] as String,
            )!;
            composed.add(c.entry);
            expect(c.row.accountId, ex['accountId']);
          case 'expense-reversal':
            final ex = mm(docs['expense']);
            final row = Expense.fromMap(ex['id'] as String, ex);
            final orig = expenseEntryFor(row, accounts: accounts, entryId: '', journal: const []).entry;
            final mirror = mirrorReversal(orig,
                memo: 'Expense reversal — rent', refType: 'expense_reversal',
                ts: '2026-10-22T10:00:00.000Z');
            composed.addAll([orig, mirror]);
          case 'expense-cheque':
            final ex = mm(docs['expense']);
            final chqDoc = mm(docs['cheque']);
            final c = composeExpense(
              expenseId: ex['id'] as String,
              category: ex['category'] as String,
              amount: (ex['amount'] as num).toDouble(),
              method: ex['method'] as String,
              accountId: ex['accountId'] as String?,
              note: (ex['note'] as String?) ?? '',
              instrument: ex['instrument'] as String?,
              chequeId: ex['chequeId'] as String?,
              chequeDraft: ChequeDraft(
                  chequeNo: chqDoc['chequeNo'] as String,
                  bankName: chqDoc['bankName'] as String,
                  issueDateISO: chqDoc['issueDateISO'] as String,
                  dueDateISO: chqDoc['dueDateISO'] as String),
              accounts: accounts, journal: const [], now: ex['ts'] as String,
            )!;
            composed.add(c.entry);
            expectApprox(chequeCanon(c.cheque!), chequeExpected(chqDoc), '$id cheque doc');
          case 'cash-in-capital':
          case 'cash-out-drawings':
            final ce = mm(docs['cashEntry']);
            final c = composeCashEntry(
              cashEntryId: ce['id'] as String,
              kind: ce['kind'] as String,
              amount: (ce['amount'] as num).toDouble(),
              method: ce['method'] as String,
              accountId: ce['accountId'] as String?,
              note: (ce['note'] as String?) ?? '',
              accounts: accounts, ts: ce['ts'] as String,
            );
            composed.add(c.entry);
            expect(c.row.method, ce['method']);
            expect(c.row.accountId, ce['accountId']);
          case 'transfer-cross-bucket':
          case 'transfer-same-bucket':
            final tr = mm(docs['cashEntry']);
            final from = accounts.firstWhere((a) => a.id == tr['fromAccountId']);
            final to = accounts.firstWhere((a) => a.id == tr['toAccountId']);
            final c = composeTransfer(
              cashEntryId: tr['id'] as String, from: from, to: to,
              amount: (tr['amount'] as num).toDouble(),
              note: (tr['note'] as String?) ?? '',
              ts: tr['ts'] as String,
            )!;
            composed.add(c.entry);
            expect(c.row.method, tr['method']);
          case 'tax-payment':
            final rawBill = Bill.fromMap(mm(docs['bill'])['id'] as String, mm(docs['bill']));
            final priced = priceBillLines(
              rawBill.items.map((i) => BillLineInput(productId: i.productId, qty: i.qty, unitPrice: i.unitPrice)).toList(),
              byId,
            )!;
            final discount = discountOf(priced.subtotal, rawBill.discountType, rawBill.discountValue);
            final stamped = stampBillTaxes(priced.items, byId, slabs,
                defaultSalesTaxSlabId: settings.defaultSalesTaxSlabId, discountAmount: discount);
            final bill = Bill(
              id: rawBill.id, billNo: rawBill.billNo, customerId: rawBill.customerId,
              customerName: rawBill.customerName, customerPhone: rawBill.customerPhone,
              items: stamped.items, subtotal: priced.subtotal, discountType: rawBill.discountType,
              discountValue: rawBill.discountValue, discountAmount: discount,
              taxAmount: stamped.taxAmount, total: stamped.total,
              payments: rawBill.payments, status: 'paid', ts: rawBill.ts,
            );
            final billComposed = composeBillEntry(
              bill: bill, pricedItems: priced.items, costTotal: priced.costTotal,
              accounts: accounts, productsById: byId, ts: rawBill.ts,
            );
            composed.add(billComposed.entry);
            final tp = mm(docs['cashEntry']);
            final c = composeTaxPayment(
              cashEntryId: tp['id'] as String,
              amount: (tp['amount'] as num).toDouble(),
              method: tp['method'] as String,
              accountId: tp['accountId'] as String?,
              note: '',
              accounts: accounts, journal: [billComposed.entry], ts: tp['ts'] as String,
            )!;
            composed.add(c.entry);
            expect((docs['taxDueBefore'] as num).toDouble(), 408);
            expect(c.row.note, tp['note']);
          case 'purchase-return-offset':
          case 'purchase-return-refund':
            final purchase = Purchase.fromMap(mm(docs['purchase'])['id'] as String, mm(docs['purchase']));
            final prRow = mm(docs['purchaseReturn']);
            final noteDoc = mm(docs['note']);
            final c = composePurchaseReturn(
              returnId: prRow['id'] as String,
              noteId: noteDoc['id'] as String,
              purchase: purchase,
              allPurchaseReturns: const [],
              picks: (prRow['items'] as List)
                  .map((p) => (productId: p['productId'] as String, qty: (p['qty'] as num).toDouble()))
                  .toList(),
              settlement: noteDoc['settlement'] as String,
              method: prRow['method'] as String?,
              accountId: prRow['accountId'] as String?,
              productsById: byId, accounts: accounts,
              existingNotes: [
                if (id == 'purchase-return-refund')
                  DocNote(id: 'note-prior', number: 'DN-1', kind: 'debit'),
              ],
              supplierName: supplier.name, ts: prRow['ts'] as String,
            )!;
            composed.add(c.entry);
            expect(c.note.number, noteDoc['number']);
            expect(c.note.total, (noteDoc['total'] as num).toDouble());
            expect(c.note.taxAmount, (noteDoc['taxAmount'] as num).toDouble());
            expect(c.note.goodsAmount, (noteDoc['goodsAmount'] as num).toDouble());
            expect(c.ret.payableOffset, (prRow['payableOffset'] as num).toDouble());
            expect(c.ret.refundAmount, (prRow['refundAmount'] as num).toDouble());
          case 'cheque-clear-in':
          case 'cheque-clear-out':
            final chq = Cheque.fromMap(mm(docs['cheque'])['id'] as String, mm(docs['cheque']));
            final c = composeChequeClear(cheque: chq, accounts: accounts, ts: '2026-10-22T10:00:00.000Z')!;
            composed.addAll(c.entries);
            expect(c.next.status, 'cleared');
            expect(c.next.entryIds['cleared'], c.entries.first.id);
          case 'cheque-bounce-in':
            final chq = Cheque.fromMap(mm(docs['cheque'])['id'] as String, mm(docs['cheque']));
            final c = composeChequeBounce(
              cheque: chq, charges: 150, // the scenario's bank-charges input
              accounts: accounts, bills: [
                Bill.fromMap('bill-x', {
                  'billNo': 99, 'customerName': 'Ahmed Traders', 'customerPhone': '03001234567',
                  'items': [], 'payments': [], 'status': 'paid', 'ts': '2026-10-22T10:00:00.000Z',
                })
              ], credits: const [], supplierPayments: const [], ts: '2026-10-22T10:00:00.000Z',
            )!;
            composed.addAll(c.entries);
            expect(c.next.status, 'bounced');
            expect(c.next.chargesOnBounce, 150);
            expect(c.creditRow!.amount, (mm(docs['creditRow'])['amount'] as num).toDouble());
            expect(c.creditRow!.billId, mm(docs['creditRow'])['billId']);
            expect(c.creditRow!.note, mm(docs['creditRow'])['note']);
            expect(c.creditRow!.customerPhone, mm(docs['creditRow'])['customerPhone']);
          case 'cheque-return-in':
            final chq = Cheque.fromMap(mm(docs['cheque'])['id'] as String, mm(docs['cheque']));
            final c = composeChequeReturn(
              cheque: chq, bills: const [], credits: [
                CreditEntry.fromMap('cr-src', {
                  'customerId': 'cust-1', 'customerName': 'Ahmed Traders',
                  'customerPhone': '03001234567', 'kind': 'repayment', 'amount': 2200,
                  'ts': '2026-10-22T09:00:00.000Z',
                })
              ], ts: '2026-10-22T10:00:00.000Z',
            )!;
            composed.addAll(c.entries);
            expect(c.next.status, 'returned');
            expect(c.creditRow!.note, mm(docs['creditRow'])['note']);
            expect(c.creditRow!.billId, mm(docs['creditRow'])['billId']);
          case 'cheque-bounce-out':
            final chq = Cheque.fromMap(mm(docs['cheque'])['id'] as String, mm(docs['cheque']));
            // The original payment row (spay-3, from the cheque
            // payment scenario) supplies method/account for the
            // compensating reversal row.
            final origPayment = SupplierPayment(
              id: chq.sourceId, supplierId: 'sup-1', amount: 6000,
              method: 'bank', accountId: 'acct-bank', voucherNo: 'PV-3',
            );
            final c = composeChequeBounce(
              cheque: chq, accounts: accounts, bills: const [], credits: const [],
              supplierPayments: [origPayment], ts: '2026-10-22T10:00:00.000Z',
            )!;
            composed.addAll(c.entries);
            expect(c.next.status, 'bounced');
            expect(c.reversalRow!.kind, mm(docs['paymentRow'])['kind']);
            expect(c.reversalRow!.amount, (mm(docs['paymentRow'])['amount'] as num).toDouble());
            expect(c.reversalRow!.supplierId, mm(docs['paymentRow'])['supplierId']);
            expect(c.reversalRow!.note, mm(docs['paymentRow'])['note']);
            expect(c.reversalRow!.method, mm(docs['paymentRow'])['method']);
            expect(c.reversalRow!.accountId, mm(docs['paymentRow'])['accountId']);
          case 'bill-cheque-capture':
            final raw = Bill.fromMap(mm(docs['bill'])['id'] as String, mm(docs['bill']));
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
              payments: [
                BillPayment(method: 'bank', amount: 1050, instrument: 'cheque', chequeId: 'chq-in-9',
                    cheque: ChequeDraft(
                        chequeNo: mm(docs['cheque'])['chequeNo'] as String,
                        bankName: mm(docs['cheque'])['bankName'] as String,
                        issueDateISO: mm(docs['cheque'])['issueDateISO'] as String,
                        dueDateISO: mm(docs['cheque'])['dueDateISO'] as String)),
              ],
              status: 'paid', ts: raw.ts,
            );
            final composedBill = composeBillEntry(
              bill: bill, pricedItems: priced.items, costTotal: priced.costTotal,
              accounts: accounts, productsById: byId, ts: raw.ts,
            );
            composed.add(composedBill.entry);
            final doc = chequeDocForBillPayment(
              bill: composedBill.bill, payment: composedBill.bill.payments.first,
              draft: bill.payments.first.cheque!, entryId: composedBill.entry.id,
            );
            expectApprox(chequeCanon(doc), chequeExpected(mm(docs['cheque'])), '$id cheque doc');
          case 'void-cheque-handback':
            final bill = Bill.fromMap(mm(docs['bill'])['id'] as String, mm(docs['bill']));
            final chq = Cheque.fromMap(mm(docs['cheque'])['id'] as String, mm(docs['cheque']));
            final c = composeVoidFull(
              bill: bill, credits: const [], accounts: accounts,
              productsById: byId, cheques: [chq], journal: const [], ts: '2026-10-22T11:00:00.000Z',
            )!;
            composed.add(c.entry);
            expect(c.chequeUpdates.length, 1);
            expect(c.chequeUpdates.first.status, 'returned');
            expect(c.chequeUpdates.first.entryIds['returned'], c.entry.id);
          case 'repayment-cheque':
            final row = CreditEntry.fromMap(mm(docs['creditRow'])['id'] as String, mm(docs['creditRow']));
            composed.add(composeRepaymentEntry(row: row, accounts: accounts));
            final doc = chequeDocForRepayment(
              row: row,
              draft: ChequeDraft(
                  chequeNo: mm(docs['cheque'])['chequeNo'] as String,
                  bankName: mm(docs['cheque'])['bankName'] as String,
                  issueDateISO: mm(docs['cheque'])['issueDateISO'] as String,
                  dueDateISO: mm(docs['cheque'])['dueDateISO'] as String),
              entryId: composed.first.id,
            );
            expectApprox(chequeCanon(doc), chequeExpected(mm(docs['cheque'])), '$id cheque doc');
            expect(row.voucherNo, 'RV-9');
          case 'return-with-note':
            final bill = Bill.fromMap(mm(docs['bill'])['id'] as String, mm(docs['bill']));
            // The bill's udhaar lot (its credit payment part) is the
            // credit position the return eats into (F-6).
            final credits = [
              CreditEntry(
                id: 'cr-bill-9', customerId: 'cust-1', customerName: 'Ahmed Traders',
                customerPhone: '03001234567', kind: 'credit', amount: 800,
                billId: 'bill-9', ts: bill.ts,
              )
            ];
            final r = composeReturnEntry(
              bill: bill, priorReturns: const [], credits: credits,
              lines: (mm(docs['saleReturn'])['items'] as List)
                  .map((l) => (productId: l['productId'] as String, qty: (l['qty'] as num).toDouble()))
                  .toList(),
              productsById: byId, accounts: accounts, journal: const [], ts: '2026-10-22T10:00:00.000Z',
            )!;
            composed.add(r.entry);
            final note = composeCreditNote(
              noteId: 'note-cn', bill: bill, ret: r.saleReturn,
              journalEntryId: r.entry.id, existingNotes: const [],
              ts: '2026-10-22T10:00:00.000Z',
            );
            expect(note.number, mm(docs['note'])['number']);
            expect(note.total, (mm(docs['note'])['total'] as num).toDouble());
            expect(note.goodsAmount, (mm(docs['note'])['goodsAmount'] as num).toDouble());
            expect(note.taxAmount, (mm(docs['note'])['taxAmount'] as num).toDouble());
            expect(note.settlement, mm(docs['note'])['settlement']);
          default:
            fail('no Dart composition wired for F2 fixture scenario $id');
        }
        expect(composed.length, expected.length, reason: '$id entry count');
        final labels = <String, String>{
          for (var i = 0; i < composed.length; i++) composed[i].id: 'e$i',
        };
        for (var i = 0; i < expected.length; i++) {
          expect(canonF2(composed[i], labels), canonF2Expected(expected[i]),
              reason: '$id entry $i');
        }
      });
    }

    test('the whole F2 fixture journal balances (trial balance == 0)', () {
      final entries = <JournalEntry>[];
      var i = 0;
      for (final s in scenarios) {
        for (final e in (s['entries'] as List).cast<Map<String, dynamic>>()) {
          entries.add(entryFromNorm(e, 'fx${i++}'));
        }
      }
      expect(entries.length, 25);
      expect(trialBalanceTotal(entries).abs(), lessThan(0.009));
      // cheques_in_hand across the independent scenarios: capture
      // 1050 + repayment 4500 − void handback 1050 − bounce 7000
      // − return 2200 − clearing 5000.
      expect(accountBalance(entries, 'cheques_in_hand'), 1050 + 4500 - 1050 - 7000 - 2200 - 5000);
    });
  });

  group('F2 golden fixtures — document derivations', () {
    final ddocs = mm(fx['documents']);
    final dexp = mm(ddocs['expected']);
    final qt = Quotation.fromMap(mm(ddocs['quotation'])['id'] as String, mm(ddocs['quotation']));
    final orders = (ddocs['orders'] as List).map((m) => SaleOrder.fromMap(mm(m)['id'] as String, mm(m))).toList();
    final challans = (ddocs['challans'] as List).map((m) => DeliveryChallan.fromMap(mm(m)['id'] as String, mm(m))).toList();
    final dbills = (ddocs['bills'] as List).map((m) => Bill.fromMap(mm(m)['id'] as String, mm(m))).toList();
    final po = PurchaseOrder.fromMap(mm(ddocs['purchaseOrder'])['id'] as String, mm(ddocs['purchaseOrder']));
    final dpurchases = (ddocs['purchases'] as List).map((m) => Purchase.fromMap(mm(m)['id'] as String, mm(m))).toList();
    final so2 = orders.firstWhere((o) => o.id == 'so-2');
    final dc1 = challans.first;

    test('fulfilment quantities match the web derivations', () {
      expectApprox(quotationConvertedQty(qt, orders), dexp['quotationConvertedQty'], 'quotationConvertedQty');
      expectApprox(quotationConvertedTotalQty(qt, orders, dbills), dexp['quotationConvertedTotalQty'], 'quotationConvertedTotalQty');
      expectApprox(orderBilledQty(so2, dbills, challans), dexp['orderBilledQtySo2'], 'orderBilledQty');
      expectApprox(orderDeliveredQty(so2, challans), dexp['orderDeliveredQtySo2'], 'orderDeliveredQty');
      expectApprox(challanBilledQty(dc1, dbills), dexp['challanBilledQtyDc1'], 'challanBilledQty');
      expectApprox(poReceivedQty(po, dpurchases), dexp['poReceivedQty'], 'poReceivedQty');
      expectApprox(promisedQtyByProduct(orders, challans, dbills), dexp['promised'], 'promised');
    });

    test('derived statuses match', () {
      expect(deriveOrderStatus(so2, dbills, challans), dexp['deriveOrderStatusSo2']);
      expect(deriveQuotationStatus(qt, orders, dbills), dexp['deriveQuotationStatusQt1']);
      expect(deriveChallanStatus(dc1, dbills), dexp['deriveChallanStatusDc1']);
      expect(derivePoStatus(po, dpurchases), dexp['derivePoStatus']);
    });

    test('PO receipt composition matches (incl. over-receipt refusal)', () {
      final ok = composePoReceiptLines(po, dpurchases, products, const [
        PoReceiptPick(productId: 'p-tea', qty: 5),
        PoReceiptPick(productId: 'p-oil', qty: 4, unitCost: 990),
      ]);
      expectApprox(
        [for (final l in ok!) {'productId': l.productId, 'qty': l.qty, 'unitCost': l.unitCost}],
        dexp['poReceiptOk'],
        'poReceiptOk',
      );
      final over = composePoReceiptLines(po, dpurchases, products, const [
        PoReceiptPick(productId: 'p-tea', qty: 13),
      ]);
      expect(over, dexp['poReceiptOver']);
    });

    test('estimate totals + voucher print data match', () {
      final totals = estimateDocTotals(qt.lines, qt.discountType, qt.discountValue,
          products: products, slabs: slabs, settings: settings);
      expectApprox(
        {'subtotal': totals.subtotal, 'discountAmount': totals.discountAmount,
         'estimatedTax': totals.estimatedTax, 'total': totals.total},
        dexp['estimateTotalsQt1'], 'estimateTotalsQt1',
      );
      final rv = mm(dexp['voucherRv']);
      final rvRow = CreditEntry.fromMap('cr-v', {
        'customerId': 'cust-1', 'customerName': 'Ahmed Traders', 'customerPhone': '03001234567',
        'kind': 'repayment', 'amount': 1200, 'method': 'cash', 'accountId': 'acct-till',
        'voucherNo': 'RV-3', 'note': '', 'ts': '2026-10-22T10:00:00.000Z',
      });
      final rvJournal = [
        JournalEntry(id: 'jv1', memo: 'x', refType: 'bill', refId: null, ts: '2026-10-22T09:00:00.000Z',
            lines: [JournalLine(account: 'receivables', debit: 4600, ref: 'cust-1')]),
        JournalEntry(id: 'jv2', memo: 'x', refType: 'repayment', refId: null, ts: '2026-10-22T10:00:00.000Z',
            lines: [JournalLine(account: 'receivables', credit: 1200, ref: 'cust-1')]),
      ];
      final rvData = receiptVoucherData(rvRow, [customer], const [], accounts, rvJournal)!;
      expect(rvData.number, rv['number']);
      expect(rvData.amount, (rv['amount'] as num).toDouble());
      expect(rvData.balanceAfter, (rv['balanceAfter'] as num).toDouble());
      expect(rvData.accountName, rv['accountName']);

      final pv = mm(dexp['voucherPv']);
      final pvRow = SupplierPayment.fromMap('sp-v', {
        'supplierId': 'sup-1', 'amount': 4000, 'method': 'cash', 'accountId': 'acct-till',
        'voucherNo': 'PV-1', 'note': '', 'ts': '2026-10-22T10:00:00.000Z',
      });
      final pvJournal = [
        JournalEntry(id: 'jv3', memo: 'x', refType: 'purchase', refId: null, ts: '2026-10-22T09:00:00.000Z',
            lines: [JournalLine(account: 'payables', credit: 6600, ref: 'sup-1')]),
        JournalEntry(id: 'jv4', memo: 'x', refType: 'supplier_payment', refId: null, ts: '2026-10-22T10:00:00.000Z',
            lines: [JournalLine(account: 'payables', debit: 4000, ref: 'sup-1')]),
      ];
      final pvData = paymentVoucherData(pvRow, [supplier], accounts, pvJournal)!;
      expect(pvData.number, pv['number']);
      expect(pvData.amount, (pv['amount'] as num).toDouble());
      expect(pvData.balanceAfter, (pv['balanceAfter'] as num).toDouble());
      expect(pvData.accountName, pv['accountName']);
    });
  });

  group('F2 golden fixtures — report builders', () {
    final rdocs = mm(fx['reports']);
    final ds = mm(rdocs['dataset']);
    final rexp = mm(rdocs['expected']);
    final range = resolveReportRange('custom',
        custom: (from: '2026-10-01', to: '2026-10-31'),
        now: DateTime.parse('2026-10-15T00:00:00.000Z'));
    final rPurchases = (ds['purchases'] as List).map((m) => Purchase.fromMap(mm(m)['id'] as String, mm(m))).toList();
    final rPurchaseReturns = (ds['purchaseReturns'] as List).map((m) => PurchaseReturn.fromMap(mm(m)['id'] as String, mm(m))).toList();
    final rBills = (ds['bills'] as List).map((m) => Bill.fromMap(mm(m)['id'] as String, mm(m))).toList();
    final rSales = (ds['sales'] as List).map((m) => Sale.fromMap(mm(m)['id'] as String, mm(m))).toList();
    final rCredits = (ds['credits'] as List).map((m) => CreditEntry.fromMap(mm(m)['id'] as String, mm(m))).toList();
    final rExpenses = (ds['expenses'] as List).map((m) => Expense.fromMap(mm(m)['id'] as String, mm(m))).toList();
    final rPayments = (ds['payments'] as List).map((m) => SupplierPayment.fromMap(mm(m)['id'] as String, mm(m))).toList();
    final rCheques = (ds['cheques'] as List).map((m) => Cheque.fromMap(mm(m)['id'] as String, mm(m))).toList();
    final rCloses = (ds['dayCloses'] as List).map((m) => DayClose.fromMap(mm(m)['id'] as String, mm(m))).toList();
    final rJournal = <JournalEntry>[
      for (var i = 0; i < (ds['journal'] as List).length; i++)
        entryFromNorm(mm((ds['journal'] as List)[i]), 'e$i'),
    ];

    test('sales report + the P&L identity', () {
      final rep = salesReport(rSales, products, rBills, range,
          returns: const [], journal: rJournal, taxSlabs: slabs, settings: settings);
      final e = mm(rexp['sales']);
      expectApprox({
        'grossSales': rep.grossSales, 'returnsTotal': rep.returnsTotal,
        'revenue': rep.revenue, 'discounts': rep.discounts, 'netSales': rep.netSales,
        'otherRevenue': rep.otherRevenue, 'plNetRevenue': rep.plNetRevenue,
        'netUnits': rep.netUnits, 'grossProfit': rep.grossProfit,
      }, {
        'grossSales': e['grossSales'], 'returnsTotal': e['returnsTotal'],
        'revenue': e['revenue'], 'discounts': e['discounts'], 'netSales': e['netSales'],
        'otherRevenue': e['otherRevenue'], 'plNetRevenue': e['plNetRevenue'],
        'netUnits': e['netUnits'], 'grossProfit': e['grossProfit'],
      }, 'sales headline');
      expectApprox(
        [for (final r in rep.byProduct) {'productId': r.productId, 'name': r.name, 'qty': r.qty, 'amount': r.amount, 'profit': r.profit}],
        e['byProduct'], 'sales byProduct');
      expectApprox(
        [for (final r in rep.byCustomer) {'key': r.key, 'name': r.name, 'qty': r.qty, 'amount': r.amount}],
        e['byCustomer'], 'sales byCustomer');
      final pl = plReport(rJournal, range);
      expectApprox(pl.netRevenue, rep.plNetRevenue, 'P&L ≡ sales identity');
      expectApprox({
        'revenue': pl.revenue, 'discounts': pl.discounts, 'netRevenue': pl.netRevenue,
        'cogs': pl.cogs, 'grossProfit': pl.grossProfit, 'expensesTotal': pl.expensesTotal,
        'stockLoss': pl.stockLoss, 'net': pl.net,
        'expensesByCategory': pl.expensesByCategory,
      }, rexp['pl'], 'pl');
    });

    test('purchase + stock reports', () {
      final rep = purchaseReport(rPurchases, rPurchaseReturns, [supplier], range);
      final e = mm(rexp['purchase']);
      expectApprox({
        'gross': rep.gross, 'goodsNet': rep.goodsNet, 'taxTotal': rep.taxTotal,
        'returnsGross': rep.returnsGross, 'net': rep.net,
      }, {'gross': e['gross'], 'goodsNet': e['goodsNet'], 'taxTotal': e['taxTotal'],
          'returnsGross': e['returnsGross'], 'net': e['net']}, 'purchase headline');
      expectApprox(
        [for (final r in rep.bySupplier) {'supplierId': r.supplierId, 'name': r.name, 'gross': r.gross, 'returns': r.returns, 'net': r.net}],
        e['bySupplier'], 'purchase bySupplier');
      expectApprox(
        [for (final r in rep.byProduct) {'productId': r.productId, 'name': r.name, 'qty': r.qty, 'amount': r.amount}],
        e['byProduct'], 'purchase byProduct');
      final stock = stockReport(products, DateTime.parse('2026-10-15T00:00:00.000Z'));
      expectApprox({
        'totalValue': stock.totalValue, 'retailValue': stock.retailValue,
        'lowCount': stock.low.length, 'expiringCount': stock.expiring.length,
      }, rexp['stock'], 'stock');
    });

    test('trial balance report', () {
      final tb = trialBalanceReport(rJournal, range);
      expect(tb.balanced, true);
      expectApprox({
        'totalDebits': tb.totalDebits, 'totalCredits': tb.totalCredits,
        'difference': tb.difference, 'closingDebits': tb.closingDebits,
        'closingCredits': tb.closingCredits, 'closingDifference': tb.closingDifference,
        'balanced': tb.balanced,
        'rows': [for (final r in tb.rows) {'account': r.account, 'debitTotal': r.debitTotal,
            'creditTotal': r.creditTotal, 'closing': r.closing, 'closingSide': r.closingSide}],
      }, rexp['trialBalance'], 'trialBalance');
    });

    test('account statements (single + combined)', () {
      final till = accountStatement(rJournal, accounts, 'acct-till', range);
      expectApprox({
        'opening': till.opening, 'closing': till.closing,
        'totalIn': till.totalIn, 'totalOut': till.totalOut,
        'rows': [for (final r in till.rows) {'entryId': r.entryId, 'ts': r.ts, 'memo': r.memo, 'inAmount': r.inAmount,
            'outAmount': r.outAmount, 'balance': r.balance, 'bucket': r.bucket}],
      }, rexp['accountStatementTill'], 'accountStatementTill');
      final combined = accountStatement(rJournal, accounts, null, range);
      expectApprox({
        'opening': combined.opening, 'closing': combined.closing,
        'totalIn': combined.totalIn, 'totalOut': combined.totalOut,
        'rows': [for (final r in combined.rows) {'entryId': r.entryId, 'ts': r.ts, 'memo': r.memo, 'inAmount': r.inAmount,
            'outAmount': r.outAmount, 'balance': r.balance, 'bucket': r.bucket}],
      }, rexp['accountStatementCombined'], 'accountStatementCombined');
    });

    test('tax report + tax position', () {
      final rep = taxReport(rBills, const [], rPurchases, rPurchaseReturns, range);
      expectApprox({
        'outputTotal': rep.outputTotal, 'inputTotal': rep.inputTotal, 'net': rep.net,
        'rows': [for (final r in rep.rows) {'name': r.name, 'rate': r.rate, 'kind': r.kind,
            'inclusive': r.inclusive, 'amount': r.amount, 'output': r.output, 'input': r.input}],
      }, {'rows': rexp['tax']['rows'], 'outputTotal': rexp['tax']['outputTotal'],
          'inputTotal': rexp['tax']['inputTotal'], 'net': rexp['tax']['net']}, 'tax');
      final pos = taxPosition(rJournal, DateTime.parse('2026-10-15T12:00:00.000Z'));
      expectApprox({
        'outputTax': pos.outputTax, 'inputTax': pos.inputTax, 'netPayable': pos.netPayable,
        'outputThisMonth': pos.outputThisMonth, 'inputThisMonth': pos.inputThisMonth,
      }, rexp['taxPosition'], 'taxPosition');
    });

    test('customer + supplier statements', () {
      final key = creditKey(rCredits.first);
      final cs = customerStatement(rCredits, key, range);
      final e = mm(rexp['customerStatement']);
      expectApprox({
        'opening': cs.opening, 'closing': cs.closing,
        'givenInPeriod': cs.givenInPeriod, 'repaidInPeriod': cs.repaidInPeriod,
        'rows': [for (final r in cs.rows) {'signed': r.signed, 'balance': r.balance}],
      }, {'opening': e['opening'], 'closing': e['closing'],
          'givenInPeriod': e['givenInPeriod'], 'repaidInPeriod': e['repaidInPeriod'],
          'rows': [for (final r in (e['rows'] as List)) {'signed': mm(r)['signed'], 'balance': mm(r)['balance']}]},
          'customerStatement');
      final ss = supplierStatement(rPurchases, rPayments, rPurchaseReturns, 'sup-1', range);
      final se = mm(rexp['supplierStatement']);
      expectApprox({
        'opening': ss.opening, 'closing': ss.closing,
        'purchasedInPeriod': ss.purchasedInPeriod, 'paidInPeriod': ss.paidInPeriod,
        'returnedInPeriod': ss.returnedInPeriod,
        'events': [for (final ev in ss.events) {'kind': ev.kind, 'amount': ev.amount,
            'effect': ev.effect, 'balance': ev.balance}],
      }, {'opening': se['opening'], 'closing': se['closing'],
          'purchasedInPeriod': se['purchasedInPeriod'], 'paidInPeriod': se['paidInPeriod'],
          'returnedInPeriod': se['returnedInPeriod'],
          'events': [for (final ev in (se['events'] as List)) {'kind': mm(ev)['kind'],
              'amount': mm(ev)['amount'], 'effect': mm(ev)['effect'], 'balance': mm(ev)['balance']}]},
          'supplierStatement');
      expectApprox(supplierBalance(rPurchases, rPayments, 'sup-1', rPurchaseReturns),
          rexp['supplierBalance'], 'supplierBalance');
      expectApprox(payablesTotal(rJournal), rexp['payablesGL'], 'payablesGL');
      expectApprox(receivablesTotal(rJournal), rexp['receivablesGL'], 'receivablesGL');
    });

    test('aging + expenses + cheques + day close + notes', () {
      final aging = agingReport(rCredits, rPurchases, rPayments, rPurchaseReturns);
      expectApprox({
        'receivables': {'current': aging.receivables.current, 'mid': aging.receivables.mid,
            'old': aging.receivables.old, 'total': aging.receivables.total},
        'payables': {'current': aging.payables.current, 'mid': aging.payables.mid,
            'old': aging.payables.old, 'total': aging.payables.total},
      }, rexp['aging'], 'aging');
      final exp = expensesReport(rExpenses, range);
      expectApprox({
        'total': exp.total,
        'byCategory': [for (final c in exp.byCategory) {'category': c.category, 'amount': c.amount, 'count': c.count}],
      }, {'total': mm(rexp['expenses'])['total'], 'byCategory': mm(rexp['expenses'])['byCategory']},
          'expenses');
      final chq = chequesReport(rCheques, range);
      expectApprox({
        'totalCaptured': chq.totalCaptured,
        'groups': [for (final g in chq.groups) {'id': g.id, 'total': g.total, 'count': g.rows.length}],
      }, {'totalCaptured': mm(rexp['cheques'])['totalCaptured'],
          'groups': [for (final g in (mm(rexp['cheques'])['groups'] as List))
              {'id': mm(g)['id'], 'total': mm(g)['total'], 'count': (mm(g)['rows'] as List).length}]},
          'cheques');
      final dc = dayCloseReport(rCloses, range);
      expectApprox({
        'totals': {'sales': dc.totals.sales, 'expenses': dc.totals.expenses,
            'creditGiven': dc.totals.creditGiven, 'creditReceived': dc.totals.creditReceived,
            'supplierPaid': dc.totals.supplierPaid, 'expected': dc.totals.expected,
            'counted': dc.totals.counted, 'difference': dc.totals.difference},
        'rowCount': dc.rows.length,
      }, {'totals': mm(rexp['dayClose'])['totals'], 'rowCount': (mm(rexp['dayClose'])['rows'] as List).length},
          'dayClose');
      final rNotes = (ds['notes'] as List).map((m) => DocNote.fromMap(mm(m)['id'] as String, mm(m))).toList();
      final nr = notesReport(rNotes, range);
      expectApprox({
        'creditTotal': nr.credit.total, 'debitTotal': nr.debit.total,
        'creditCount': nr.credit.count, 'debitCount': nr.debit.count,
      }, {'creditTotal': mm(rexp['notes'])['credit']['total'], 'debitTotal': mm(rexp['notes'])['debit']['total'],
          'creditCount': mm(rexp['notes'])['credit']['count'], 'debitCount': mm(rexp['notes'])['debit']['count']},
          'notes');
    });

    test('forecast rows match the web selector', () {
      final rows = sel.forecastAll(products, rSales);
      expectApprox(
        [for (final r in rows) {'productId': r.product.id, 'avgDaily': r.avgDaily,
            'daysOfStock': r.daysOfStock.isInfinite ? null : r.daysOfStock,
            'suggestedReorder': r.suggestedReorder, 'status': r.status}],
        rexp['forecast'], 'forecast');
    });
  });
}
