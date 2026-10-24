/// F2 core identities (not fixture-bound): the cheque lifecycle
/// truth table, registry ≡ GL identities over composed journals,
/// aging ≡ subledger identities, the mirror-reversal discipline,
/// correction dating and the void engine's refusals.
import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/cheques.dart';
import 'package:dukaan_ai/core/composers_f2.dart';
import 'package:dukaan_ai/core/documents.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/periods.dart';
import 'package:dukaan_ai/core/tax.dart';
import 'package:dukaan_ai/core/types.dart';

const till = MoneyAccount(id: 'acct-till', name: 'Main Till', kind: 'cash', method: 'cash', legacyFor: 'cash', sortOrder: 1);
const bank = MoneyAccount(id: 'acct-bank', name: 'Meezan Bank', kind: 'bank', method: 'bank', sortOrder: 2);
const accounts = [till, bank];

Cheque chq({String direction = 'in', String status = 'received', String sourceType = 'bill'}) => Cheque(
      id: 'chq-1', direction: direction, chequeNo: 'X-1', bankName: 'HBL', amount: 1000,
      issueDateISO: '2026-10-20', dueDateISO: '2026-10-25', partyId: 'cust-1',
      partyName: 'Ahmed', partyKind: 'customer', status: status,
      sourceType: sourceType, sourceId: 'bill-1', accountId: 'acct-bank',
      entryIds: const {'captured': 'e0'}, ts: '2026-10-20T10:00:00.000Z',
    );

void main() {
  group('cheque lifecycle truth table', () {
    test('deposit only IN + received', () {
      expect(canChequeTransition(chq(status: 'received'), 'deposit'), isTrue);
      expect(canChequeTransition(chq(status: 'deposited'), 'deposit'), isFalse);
      expect(canChequeTransition(chq(direction: 'out', status: 'issued', sourceType: 'supplier_payment'), 'deposit'), isFalse);
    });
    test('clear IN from deposited, OUT from issued', () {
      expect(canChequeTransition(chq(status: 'deposited'), 'clear'), isTrue);
      expect(canChequeTransition(chq(status: 'received'), 'clear'), isFalse);
      expect(canChequeTransition(chq(direction: 'out', status: 'issued', sourceType: 'supplier_payment'), 'clear'), isTrue);
    });
    test('bounce IN only from deposited; OUT only supplier payments', () {
      expect(canChequeTransition(chq(status: 'deposited'), 'bounce'), isTrue);
      expect(canChequeTransition(chq(status: 'received'), 'bounce'), isFalse);
      expect(canChequeTransition(chq(direction: 'out', status: 'issued', sourceType: 'supplier_payment'), 'bounce'), isTrue);
      expect(canChequeTransition(chq(direction: 'out', status: 'issued', sourceType: 'expense'), 'bounce'), isFalse);
    });
    test('return only IN + received; terminal states accept nothing', () {
      expect(canChequeTransition(chq(status: 'received'), 'return'), isTrue);
      expect(canChequeTransition(chq(status: 'deposited'), 'return'), isFalse);
      for (final a in ['deposit', 'clear', 'bounce', 'return']) {
        expect(canChequeTransition(chq(status: 'cleared'), a), isFalse);
        expect(canChequeTransition(chq(status: 'bounced'), a), isFalse);
      }
    });
    test('draft validation', () {
      expect(isValidChequeDraft(const ChequeDraft(chequeNo: '1', bankName: 'B', issueDateISO: '2026-10-01', dueDateISO: '2026-10-02')), isTrue);
      expect(isValidChequeDraft(const ChequeDraft(chequeNo: ' ', bankName: 'B', issueDateISO: '2026-10-01', dueDateISO: '2026-10-02')), isFalse);
      expect(isValidChequeDraft(const ChequeDraft(chequeNo: '1', bankName: 'B', issueDateISO: '2026-02-30', dueDateISO: '2026-10-02')), isFalse);
      expect(isValidChequeDraft(null), isFalse);
    });
  });

  group('registry identities over a composed lifecycle', () {
    test('capture → deposit → clear keeps Σ uncleared IN == cheques_in_hand', () {
      final bill = Bill(
        id: 'bill-1', billNo: 1, customerId: 'cust-1', customerName: 'Ahmed',
        customerPhone: '0300', items: const [], subtotal: 1000, discountType: 'flat',
        discountValue: 0, discountAmount: 0, taxAmount: 0, total: 1000,
        payments: const [BillPayment(method: 'bank', amount: 1000, instrument: 'cheque', chequeId: 'chq-1')],
        status: 'paid', ts: '2026-10-20T10:00:00.000Z',
      );
      final capture = makeEntry('Bill #1', 'bill', 'bill-1', [
        JournalLine(account: 'cheques_in_hand', debit: 1000, ref: 'chq-1'),
        JournalLine(account: 'sales_revenue', credit: 1000),
      ], ts: bill.ts);
      var cheque = chequeDocForBillPayment(
        bill: bill, payment: bill.payments.first,
        draft: const ChequeDraft(chequeNo: 'X-1', bankName: 'HBL', issueDateISO: '2026-10-20', dueDateISO: '2026-10-25'),
        entryId: capture.id,
      );
      final journal = [capture];
      expect(unclearedInTotal([cheque]), accountBalance(journal, 'cheques_in_hand'));

      final dep = composeChequeDeposit(cheque: cheque, accounts: accounts)!;
      cheque = dep.next;
      expect(dep.entries, isEmpty); // custody posts nothing
      expect(cheque.accountId, 'acct-bank');
      expect(unclearedInTotal([cheque]), accountBalance(journal, 'cheques_in_hand'));

      final clr = composeChequeClear(cheque: cheque, accounts: accounts, ts: '2026-10-25T10:00:00.000Z')!;
      cheque = clr.next;
      journal.addAll(clr.entries);
      expect(cheque.status, 'cleared');
      expect(unclearedInTotal([cheque]), 0);
      expect(accountBalance(journal, 'cheques_in_hand'), 0);
      expect(trialBalanceTotal(journal).abs(), lessThan(0.009));
    });

    test('OUT lifecycle: issue → bounce re-opens the payable', () {
      final supplier = Supplier(id: 'sup-1', name: 'Lahore Tea Co');
      final pay = composeSupplierPayment(
        paymentId: 'spay-1', supplier: supplier, amount: 2000, method: 'bank',
        accountId: 'acct-bank', instrument: 'cheque', chequeId: 'chq-9',
        chequeDraft: const ChequeDraft(chequeNo: '9', bankName: 'Meezan', issueDateISO: '2026-10-20', dueDateISO: '2026-10-27'),
        accounts: accounts, existingPayments: const [], ts: '2026-10-20T10:00:00.000Z',
      )!;
      final journal = [pay.entry];
      expect(pendingOutTotal([pay.cheque!]), 2000);
      expect(accountNormalBalance(journal, 'cheques_issued'), 2000);
      final bnc = composeChequeBounce(
        cheque: pay.cheque!, accounts: accounts, bills: const [], credits: const [],
        supplierPayments: [pay.row], ts: '2026-10-28T10:00:00.000Z',
      )!;
      journal.addAll(bnc.entries);
      expect(bnc.next.status, 'bounced');
      expect(pendingOutTotal([bnc.next]), 0);
      expect(accountNormalBalance(journal, 'cheques_issued'), 0);
      expect(accountNormalBalance(journal, 'payables'), 0); // Dr 2000 at issue, Cr 2000 at bounce
      expect(bnc.reversalRow!.kind, 'reversal');
      expect(supplierPaid([pay.row, bnc.reversalRow!], 'sup-1'), 0);
      expect(trialBalanceTotal(journal).abs(), lessThan(0.009));
    });
  });

  group('mirror reversal + pairing', () {
    test('a mirror zeroes the original and is itself findable', () {
      final orig = makeEntry('Expense — rent', 'expense', 'exp-1', [
        JournalLine(account: 'expense_rent', debit: 500),
        JournalLine(account: 'cash', credit: 500, ref: 'acct-till'),
      ], ts: '2026-10-20T10:00:00.000Z');
      final mirror = mirrorReversal(orig, memo: 'Expense reversal — rent', refType: 'expense_reversal');
      final journal = [orig, mirror];
      expect(trialBalanceTotal(journal).abs(), lessThan(0.009));
      expect(accountBalance(journal, 'expense_rent'), 0);
      expect(findUnreversedPosting(journal, 'exp-1'), isNull); // already reversed
      expect(findUnreversedPosting([orig], 'exp-1')!.id, orig.id);
    });
  });

  group('correction dating (F-5)', () {
    test('locked original reposts today; unlocked keeps target dating', () {
      final locked = correctionDating('2026-10-31T19:00:00.000Z',
          '2026-10-10T10:00:00.000Z', '2026-10-12T10:00:00.000Z', 3, '2026-11-05T10:00:00.000Z');
      // Oct 10 is before the Oct-31 lock boundary? The lock covers
      // instants <= end of Oct 31 PKT — Oct 10 IS locked.
      expect(locked.ts, '2026-11-05T10:00:00.000Z');
      expect(locked.dayOffset, 0);
      final open = correctionDating('',
          '2026-10-10T10:00:00.000Z', '2026-10-12T10:00:00.000Z', 3, '2026-11-05T10:00:00.000Z');
      expect(open.ts, '2026-10-12T10:00:00.000Z');
      expect(open.dayOffset, 3);
    });
  });

  group('aging ≡ subledger identity', () {
    test('payables aging total == Σ positive supplier balances', () {
      final purchases = [
        Purchase(id: 'p1', supplierId: 's1', items: const [], total: 5000, ts: '2026-09-01T10:00:00.000Z', dayOffset: 40),
        Purchase(id: 'p2', supplierId: 's1', items: const [], total: 3000, ts: '2026-10-20T10:00:00.000Z', dayOffset: 2),
        Purchase(id: 'p3', supplierId: 's2', items: const [], total: 1000, ts: '2026-08-01T10:00:00.000Z', dayOffset: 80),
      ];
      final payments = [
        SupplierPayment(id: 'sp1', supplierId: 's1', amount: 4000, ts: '2026-10-21T10:00:00.000Z'),
      ];
      final aging = payablesAging(purchases, payments);
      var positive = 0.0;
      for (final sid in ['s1', 's2']) {
        final b = supplierBalance(purchases, payments, sid);
        if (b > 0) positive += b;
      }
      expect(aging.total, positive);
      expect(aging.mid, 1000); // p1 remainder after FIFO payment
      expect(aging.current, 3000);
      expect(aging.old, 1000);
    });
    test('receivables aging total == Σ positive outstanding', () {
      final credits = [
        CreditEntry(id: 'c1', customerId: 'k1', customerName: 'A', customerPhone: '1', kind: 'credit', amount: 2000, dayOffset: 45, ts: '2026-09-05T10:00:00.000Z'),
        CreditEntry(id: 'c2', customerId: 'k1', customerName: 'A', customerPhone: '1', kind: 'repayment', amount: 500, ts: '2026-10-01T10:00:00.000Z'),
        CreditEntry(id: 'c3', customerId: 'k2', customerName: 'B', customerPhone: '2', kind: 'credit', amount: 700, dayOffset: 5, ts: '2026-10-20T10:00:00.000Z'),
      ];
      final aging = receivablesAging(credits);
      expect(aging.total, 2200);
      expect(aging.mid, 1500);
      expect(aging.current, 700);
    });
  });

  group('void engine refusals + tax position cap', () {
    test('void refuses held bills and partially returned bills', () {
      Bill mk(String status, Map<String, double> returnedQty) => Bill(
            id: 'b1', billNo: 1, customerId: 'cust-1', customerName: 'A', customerPhone: '0',
            items: [BillItem(productId: 'p-tea', name: 'Tea', qty: 1, unitPrice: 100, unitCost: 60, total: 100)],
            subtotal: 100, discountType: 'flat', discountValue: 0, discountAmount: 0,
            taxAmount: 0, total: 100,
            payments: const [BillPayment(method: 'cash', amount: 100, accountId: 'acct-till')],
            status: status, returnedQty: returnedQty, ts: '2026-10-20T10:00:00.000Z',
          );
      expect(composeVoidFull(bill: mk('held', const {}), credits: const [], accounts: accounts,
          productsById: const {}, cheques: const [], journal: const []), isNull);
      expect(composeVoidFull(bill: mk('paid', const {'p-tea': 1}), credits: const [], accounts: accounts,
          productsById: const {}, cheques: const [], journal: const []), isNull);
      final ok = composeVoidFull(bill: mk('paid', const {}), credits: const [], accounts: accounts,
          productsById: const {}, cheques: const [], journal: const []);
      expect(ok, isNotNull);
      expect(trialBalanceTotal([ok!.entry]).abs(), lessThan(0.009));
    });
    test('tax payment refused above the net payable', () {
      final journal = [
        makeEntry('Bill', 'bill', 'b1', [
          JournalLine(account: 'cash', debit: 1170, ref: 'acct-till'),
          JournalLine(account: 'sales_revenue', credit: 1000),
          JournalLine(account: 'tax_payable', credit: 170),
        ], ts: '2026-10-20T10:00:00.000Z'),
      ];
      expect(taxPosition(journal).netPayable, 170);
      expect(composeTaxPayment(cashEntryId: 'c1', amount: 171, method: 'cash',
          accounts: accounts, journal: journal), isNull);
      expect(composeTaxPayment(cashEntryId: 'c1', amount: 170, method: 'cash',
          accounts: accounts, journal: journal), isNotNull);
    });
    test('doc discount caps at the subtotal', () {
      expect(docDiscountOf(1000, 'percent', 10), 100);
      expect(docDiscountOf(1000, 'percent', 150), 1000);
      expect(docDiscountOf(1000, 'flat', 1500), 1000);
      expect(docDiscountOf(1000, 'flat', -5), 0);
    });
    test('same-bucket transfer is GL-net-zero but moves account balances', () {
      const jazz = MoneyAccount(id: 'acct-jazz', name: 'JazzCash', kind: 'wallet', method: 'jazzcash', sortOrder: 3);
      const wallet = MoneyAccount(id: 'acct-wallet', name: 'Wallet', kind: 'wallet', method: 'bank', legacyFor: 'wallet', sortOrder: 2);
      final c = composeTransfer(cashEntryId: 't1', from: jazz, to: wallet, amount: 700,
          ts: '2026-10-20T10:00:00.000Z')!;
      expect(accountBalance([c.entry], 'wallet'), 0);
      expect(moneyAccountBalance([c.entry], jazz), -700);
      expect(moneyAccountBalance([c.entry], wallet), 700);
    });
  });
}
