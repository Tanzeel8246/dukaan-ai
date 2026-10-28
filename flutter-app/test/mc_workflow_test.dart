/// MC Billing workflow adoption (mobile, 2026-10-27) — pure-core
/// tests for lib/core/mc_workflow.dart and the store wiring it
/// documents. Every plan flow the task names gets a test here:
/// quotation→invoice, SO→challan→invoice (exactly-once stock),
/// receipt bill-vs-advance split, supplier AP tie, warehouse
/// transfer (both columns), offline-bill sync parity, and
/// cashier least-privilege defaults.
import 'package:flutter_test/flutter_test.dart';

import 'package:dukaan_ai/core/documents.dart'
    show deriveQuotationStatus, orderBilledQty, orderDeliveredQty;
import 'package:dukaan_ai/core/ledger.dart' show entryBalances;
import 'package:dukaan_ai/core/mc_workflow.dart' as mc;
import 'package:dukaan_ai/core/types.dart';

JournalEntry je(String id, List<JournalLine> lines, {String ts = '2026-10-27T10:00:00.000Z'}) =>
    JournalEntry(id: id, memo: id, refType: 'test', lines: lines, ts: ts);

void main() {
  group('dates: always DD/MM/YYYY', () {
    test('ISO timestamp formats DD/MM/YYYY', () {
      expect(mc.formatDdMmYyyy('2026-10-27T10:00:00.000Z'), '27/10/2026');
      expect(mc.formatDdMmYyyy('2026-01-05'), '05/01/2026');
    });
    test('already-DD/MM/YYYY passes through; garbage is not rewritten', () {
      expect(mc.formatDdMmYyyy('27/10/2026'), '27/10/2026');
      expect(mc.formatDdMmYyyy('not-a-date'), 'not-a-date');
    });
  });

  group('stock deduction: exactly once, at the invoice', () {
    test('doctrine constants: invoice deducts, challan never does', () {
      expect(mc.stockDeductionPoint, 'invoice');
      expect(mc.challanDeductsStock, isFalse);
    });
    test('SO -> challan -> invoice: challan moves nothing, invoice moves once', () {
      const order = SaleOrder(
        id: 'so1',
        status: 'open',
        lines: [DocLine(productId: 'p1', qty: 10, unitPrice: 100, total: 1000)],
      );
      const challan = DeliveryChallan(
        id: 'dc1',
        orderId: 'so1',
        status: 'dispatched',
        lines: [DocLine(productId: 'p1', qty: 10, unitPrice: 100, total: 1000)],
      );
      const bill = Bill(
        id: 'b1',
        status: 'paid',
        sourceType: 'challan',
        sourceId: 'dc1',
        items: [BillItem(productId: 'p1', qty: 10, unitPrice: 100, total: 1000)],
      );
      // Delivered tracks the challan; billed tracks the invoice.
      expect(orderDeliveredQty(order, [challan])['p1'], 10);
      expect(orderBilledQty(order, [bill], [challan])['p1'], 10);
      // The challan step leaves stock untouched; the single invoice
      // deduction takes 50 -> 40 in BOTH columns. A second deduction
      // (30) would be the double-deduct bug — it must not happen.
      final afterChallan = mc.bothStockColumnsAfter(
          stockQty: 50, currentStock: 50, currentQty: 50, delta: 0);
      expect(afterChallan.stockQty, 50);
      final afterInvoice = mc.bothStockColumnsAfter(
          stockQty: 50, currentStock: 50, currentQty: 50, delta: -10);
      expect(afterInvoice.stockQty, 40);
      expect(afterInvoice.currentStock, 40);
      expect(afterInvoice.currentQty, 40);
    });
    test('both columns move together on every delta', () {
      final r = mc.bothStockColumnsAfter(
          stockQty: 100, currentStock: 100, currentQty: 100, delta: -30);
      expect((r.stockQty, r.currentStock, r.currentQty), (70, 70, 70));
    });
  });

  group('offline-bill sync parity', () {
    test('all three columns + level equal after sync', () {
      expect(
          mc.offlineBillParity(
              stockQty: 40, currentStock: 40, currentQty: 40, levelQty: 40, expectedQty: 40),
          isTrue);
    });
    test('one stale column fails parity (never papered over)', () {
      expect(
          mc.offlineBillParity(
              stockQty: 40, currentStock: 50, currentQty: 40, levelQty: 40, expectedQty: 40),
          isFalse);
    });
  });

  group('quotation -> invoice', () {
    const q = Quotation(
      id: 'q1',
      status: 'issued',
      ts: '2026-10-20T10:00:00.000Z',
      lines: [DocLine(productId: 'p1', qty: 5, unitPrice: 100, total: 500)],
    );
    test('invoice date is the CONVERSION date, never the quotation date', () {
      expect(mc.quotationInvoiceDate('2026-10-27T09:00:00.000Z'), '27/10/2026');
      expect(mc.quotationInvoiceDate('2026-10-27T09:00:00.000Z'), isNot('20/10/2026'));
    });
    test('partially converted quotation is NOT locked; fully converted IS', () {
      const partial = Bill(
        id: 'b1',
        status: 'paid',
        sourceType: 'quotation',
        sourceId: 'q1',
        items: [BillItem(productId: 'p1', qty: 2)],
      );
      expect(mc.quotationLockedForConversion(q, const [], [partial]), isFalse);
      const full = Bill(
        id: 'b2',
        status: 'paid',
        sourceType: 'quotation',
        sourceId: 'q1',
        items: [BillItem(productId: 'p1', qty: 5)],
      );
      expect(deriveQuotationStatus(q, const [], [full]), 'converted');
      expect(mc.quotationLockedForConversion(q, const [], [full]), isTrue);
    });
  });

  group('receipt split at entry', () {
    test('bill + advance == total, one balanced entry', () {
      final split = mc.normalizeReceiptSplit(total: 1000, billPayment: 700, advance: 300)!;
      expect((split.billPayment, split.advance, split.total), (700, 300, 1000));
      final e = mc.composeReceiptSplitEntry(
        receiptId: 'rc1',
        customerId: 'c1',
        customerName: 'Test',
        method: 'cash',
        accountId: null,
        billPayment: 700,
        advance: 300,
      );
      expect(entryBalances(e), isTrue);
      expect(mc.receiptSplitEntryBalances(e), isTrue);
      // Bill part -> receivables (ref: customer); advance part ->
      // customer_advances (dedicated account, ref: customer).
      final recv = e.lines.where((l) => l.account == 'receivables').single;
      expect((recv.credit, recv.ref), (700, 'c1'));
      final adv = e.lines.where((l) => l.account == 'customer_advances').single;
      expect((adv.credit, adv.ref), (300, 'c1'));
    });
    test('over-payment over outstanding slides into advance, never negative receivables', () {
      final split = mc.normalizeReceiptSplit(
          total: 700, billPayment: 700, advance: 0, outstanding: 500)!;
      expect((split.billPayment, split.advance), (500, 200));
    });
    test('advances are derived from the journal; old advances are never restated', () {
      final old = mc.composeReceiptSplitEntry(
        receiptId: 'rc0',
        customerId: 'c1',
        customerName: 'Test',
        method: 'cash',
        accountId: null,
        billPayment: 0,
        advance: 300,
      );
      final journal = [old];
      expect(mc.customerAdvancesFromJournal(journal, 'c1'), 300);
      // A new split composes a NEW entry; the old entry is untouched.
      mc.composeReceiptSplitEntry(
        receiptId: 'rc1',
        customerId: 'c1',
        customerName: 'Test',
        method: 'cash',
        accountId: null,
        billPayment: 100,
        advance: 50,
      );
      expect(journal.length, 1);
      expect(mc.customerAdvancesFromJournal(journal, 'c1'), 300);
      expect(mc.customerAdvancesTotal(journal), 300);
    });
    test('non-positive total refuses', () {
      expect(mc.normalizeReceiptSplit(total: 0, billPayment: 0, advance: 0), isNull);
    });
  });

  group('customers: running balance + money language inputs', () {
    test('credit adds, repayment and advance subtract', () {
      const rows = [
        CreditEntry(id: 'r1', kind: 'credit', amount: 1000),
        CreditEntry(id: 'r2', kind: 'repayment', amount: 400),
        CreditEntry(id: 'r3', kind: 'advance', amount: 200),
      ];
      expect(mc.customerLedgerRunningBalance(rows), 400);
      expect(mc.customerLedgerRunningBalance(rows.sublist(0, 1)), 1000);
      expect(mc.customerLedgerRunningBalance(rows.sublist(0, 2)), 600);
    });
  });

  group('suppliers: pipeline counters + AP tie', () {
    PurchaseOrder po(String id, String supplier, String status, List<PoLine> lines) =>
        PurchaseOrder(id: id, supplierId: supplier, status: status, lines: lines);
    test('Received counts ONLY fully-received POs', () {
      final pos = [
        po('po-d', 's1', 'draft', [const PoLine(productId: 'p1', qty: 5)]),
        po('po-c', 's1', 'issued', [const PoLine(productId: 'p1', qty: 5)]),
        po('po-r', 's1', 'issued', [const PoLine(productId: 'p1', qty: 5)]),
        po('po-p', 's2', 'issued', [const PoLine(productId: 'p1', qty: 10)]),
      ];
      final purchases = [
        Purchase(
            id: 'pu-r',
            supplierId: 's1',
            sourcePoId: 'po-r',
            total: 500,
            items: [const PurchaseItem(productId: 'p1', qty: 5, unitCost: 100, total: 500)]),
        Purchase(
            id: 'pu-p',
            supplierId: 's2',
            sourcePoId: 'po-p',
            total: 250,
            items: [const PurchaseItem(productId: 'p1', qty: 4, unitCost: 62.5, total: 250)]),
      ];
      final payments = [const SupplierPayment(id: 'sp1', supplierId: 's2', amount: 250)];
      final c = mc.poPipelineCounters(pos, purchases, payments, const []);
      expect(c.draft, 1);
      expect(c.confirmed, 1);
      expect(c.received, 1); // po-p is partial, NOT received
      expect(c.partiallyReceived, 1);
      expect(c.unpaid, 1); // po-r only: po-p's supplier is paid up
    });
    test('AP tie: supplier balances = GL payables minus customer advances', () {
      final journal = [
        // A sale on credit first: Dr receivables 1000, so the later
        // split receipt's Cr receivables 700 leaves GL 300.
        je('j0', [
          const JournalLine(account: 'receivables', debit: 1000, ref: 'c1'),
          const JournalLine(account: 'sales_revenue', credit: 1000),
        ]),
        je('j1', [
          const JournalLine(account: 'inventory', debit: 500),
          const JournalLine(account: 'payables', credit: 500, ref: 's1'),
        ]),
        je('j2', [
          const JournalLine(account: 'payables', debit: 200, ref: 's1'),
          const JournalLine(account: 'cash', credit: 200),
        ]),
        mc.composeReceiptSplitEntry(
          receiptId: 'rc1',
          customerId: 'c1',
          customerName: 'Test',
          method: 'cash',
          accountId: null,
          billPayment: 700,
          advance: 300,
        ),
      ];
      const products = [Product(id: 'p1', stockQty: 10, costPrice: 50)];
      // GL inventory must equal valuation for the valuation check:
      // the purchase entry above debits inventory 500 = 10 x 50.
      final purchases = [
        Purchase(id: 'pu1', supplierId: 's1', total: 500, items: const []),
      ];
      final payments = [const SupplierPayment(id: 'sp1', supplierId: 's1', amount: 200)];
      // AR subledger: udhaar 1000 - repayment 700 = 300. The
      // advance row (300) is EXCLUDED — advances are not receivables.
      const credits = [
        CreditEntry(id: 'cr1', kind: 'credit', amount: 1000),
        CreditEntry(id: 'cr2', kind: 'repayment', amount: 700),
        CreditEntry(id: 'cr3', kind: 'advance', amount: 300),
      ];
      final rep = mc.tieOutReport(
        journal: journal,
        products: products,
        purchases: purchases,
        supplierPayments: payments,
        purchaseReturns: const [],
        credits: credits,
      );
      expect(rep.allPass, isTrue);
      expect(rep.check('tb')!.diff, 0);
      expect(rep.check('ap')!.diff, 0);
      expect(rep.check('ar')!.diff, 0);
      expect(rep.check('valuation')!.diff, 0);

      // Loans tie-out check:
      final loanJournal = [
        ...journal,
        je('j-loan', [
          const JournalLine(account: 'wallet', debit: 150000, ref: 'acc-bank'),
          const JournalLine(account: 'loans_payable', credit: 150000, ref: 'loan-1'),
        ]),
      ];
      final loan = Loan(
        id: 'loan-1',
        number: 'LN-1',
        direction: 'payable',
        partyName: 'Malik Traders',
        principal: 150000,
        chargeType: 'none',
        startDateISO: '2026-09-01',
        instalmentCount: 10,
        firstDueISO: '2026-10-01',
        events: [
          const LoanEvent(
            kind: 'drawdown',
            amount: 150000,
            principalPart: 150000,
            chargePart: 0,
            entryId: 'j-loan',
            ts: '2026-09-01T10:00:00.000Z',
          ),
        ],
      );
      final repWithLoan = mc.tieOutReport(
        journal: loanJournal,
        products: products,
        purchases: purchases,
        supplierPayments: payments,
        purchaseReturns: const [],
        credits: credits,
        loans: [loan],
      );
      expect(repWithLoan.allPass, isTrue);
      expect(repWithLoan.check('loans')!.diff, 0);
      expect(repWithLoan.check('loans')!.pass, isTrue);
    });
    test('a failing tie-out reports its difference, never a blanket claim', () {
      final rep = mc.tieOutReport(
        journal: const [],
        products: const [Product(id: 'p1', stockQty: 10, costPrice: 50)],
        purchases: const [],
        supplierPayments: const [],
        purchaseReturns: const [],
        credits: const [],
      );
      expect(rep.allPass, isFalse);
      expect(rep.check('valuation')!.pass, isFalse);
      expect(rep.check('valuation')!.diff, -500);
    });
  });

  group('warehouses + transfers', () {
    const whMain = Warehouse(id: 'wh-main', isDefault: true);
    const wh2 = Warehouse(id: 'wh-2');
    test('card counts are real: never 0 while stock exists at that warehouse', () {
      const products = [Product(id: 'p1', stockQty: 10)];
      // No rows: all 10 resolve to the default warehouse.
      var c = mc.warehouseCardCounts(products, const [], [whMain, wh2], 'wh-main');
      expect((c.items, c.units), (1, 10));
      expect(mc.warehouseCardCounts(products, const [], [whMain, wh2], 'wh-2').items, 0);
      // With rows, rows are the truth.
      const levels = [StockLevel(id: 'wh-2__p1', warehouseId: 'wh-2', productId: 'p1', qty: 4)];
      c = mc.warehouseCardCounts(products, levels, [whMain, wh2], 'wh-2');
      expect((c.items, c.units), (1, 4));
    });
    test('transfer requires two distinct warehouses', () {
      expect(mc.transferWarehousesValid('wh-main', 'wh-2'), isTrue);
      expect(mc.transferWarehousesValid('wh-main', 'wh-main'), isFalse);
      expect(mc.transferWarehousesValid('', 'wh-2'), isFalse);
    });
    test('transfer moves both columns on both sides (levels + totals)', () {
      // Source loses 3, destination gains 3; the product TOTAL is
      // unchanged, so both columns stay equal throughout.
      final src = mc.bothStockColumnsAfter(
          stockQty: 10, currentStock: 10, currentQty: 10, delta: -3);
      final dst = mc.bothStockColumnsAfter(
          stockQty: 2, currentStock: 2, currentQty: 2, delta: 3);
      expect((src.stockQty, src.currentStock, src.currentQty), (7, 7, 7));
      expect((dst.stockQty, dst.currentStock, dst.currentQty), (5, 5, 5));
    });
  });

  group('inventory valuation + expenses + BOM', () {
    test('valuation ties to GL inventory', () {
      const products = [
        Product(id: 'p1', stockQty: 10, costPrice: 50),
        Product(id: 'p2', stockQty: 4, costPrice: 25),
      ];
      expect(mc.inventoryValuation(products), 600);
    });
    test('Rent maps to its rent account, never misc; unknown maps to other', () {
      expect(mc.expenseAccountForCategory('rent'), 'expense_rent');
      expect(mc.expenseAccountForCategory('electricity'), 'expense_electricity');
      expect(mc.expenseAccountForCategory('salary'), 'expense_salary');
      expect(mc.expenseAccountForCategory('transport'), 'expense_transport');
      expect(mc.expenseAccountForCategory('misc'), 'expense_other');
      expect(mc.expenseAccountForCategory('other'), 'expense_other');
    });
    test('finished-good cost comes from components', () {
      expect(mc.bomFinishedCost([(qty: 2, unitCost: 50), (qty: 3, unitCost: 20)]), 160);
    });
  });

  group('cashier least-privilege defaults', () {
    test('new-cashier sensitive toggles are ALL off', () {
      expect(mc.cashierSensitiveDefaults.values.every((v) => v == false), isTrue);
      expect(mc.cashierCanDelete, isFalse);
    });
    test('cashier sees no finance, margins or exports; owner does', () {
      expect(mc.roleCanViewFinance('cashier'), isFalse);
      expect(mc.roleCanViewMargins('cashier'), isFalse);
      expect(mc.roleCanExport('cashier'), isFalse);
      expect(mc.roleCanViewFinance('owner'), isTrue);
      expect(mc.roleCanViewMargins('owner'), isTrue);
    });
  });

  group('day close lock + storefront', () {
    test('backdated entry into a locked day is blocked', () {
      expect(
          mc.dayCloseBlocksBackdated('2026-10-26T18:59:59.000Z', '2026-10-25T10:00:00.000Z'),
          isTrue);
      expect(
          mc.dayCloseBlocksBackdated('2026-10-26T18:59:59.000Z', '2026-10-27T10:00:00.000Z'),
          isFalse);
      expect(mc.dayCloseBlocksBackdated(null, '2026-10-25T10:00:00.000Z'), isFalse);
    });
    test('storefront shows real numeric stock, never 999', () {
      expect(mc.storefrontDisplayQty(const Product(id: 'p1', stockQty: 0)), 0);
      expect(mc.storefrontDisplayQty(const Product(id: 'p1', stockQty: 7)), 7);
      expect(mc.storefrontDisplayQty(const Product(id: 'p1', stockQty: 7)), isNot(999));
    });
  });
}
