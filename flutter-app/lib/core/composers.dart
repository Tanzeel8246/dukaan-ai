/// Dukaan AI — posting-template composers (Dart ports of the
/// StoreProvider templates: postBill, recordSale, the return engine,
/// recordPurchase, addRepayment, giveCredit).
///
/// Templates PORT, they do not get re-derived (design §6.3). Each
/// composer is a pure function from resolved inputs to the composed
/// documents + ONE balanced journal entry via [makeEntry]; the store
/// runs the guard over the entry and writes everything in one batch.
/// Equivalence with the web is proven by the golden fixtures.
import 'ledger.dart';
import 'loyalty.dart';
import 'tax.dart';
import 'types.dart';

class BillLineInput {
  final String productId;
  final double qty;
  final double? unitPrice; // conversion-agreed price only; else shelf price
  final String? sourceProductId; // document-line identity (F2 conversions)
  const BillLineInput({required this.productId, required this.qty, this.unitPrice, this.sourceProductId});
}

class PaymentInput {
  final String method; // PayMethod
  final double amount;
  final String? accountId; // desk's explicit money account
  final String? instrument; // "cheque"
  final String? chequeId;
  const PaymentInput({required this.method, required this.amount, this.accountId, this.instrument, this.chequeId});
  bool get isCheque => instrument == 'cheque';
}

class ComposedBill {
  final Bill bill;
  final JournalEntry entry;
  final CreditEntry? creditRow;
  final List<Sale> saleRows;
  const ComposedBill({required this.bill, required this.entry, this.creditRow, this.saleRows = const []});
}

/// Price lines from CURRENT product data; null when any line
/// references a missing product (the store validates stock first).
/// Mirrors priceLines + buildBill + stampBillTaxes.
({List<BillItem> items, double subtotal, double costTotal})? priceBillLines(
    List<BillLineInput> lines, Map<String, Product> byId) {
  final items = <BillItem>[];
  var subtotal = 0.0;
  var costTotal = 0.0;
  for (final l in lines) {
    final p = byId[l.productId];
    if (p == null || l.qty <= 0) return null;
    final unitPrice = (l.unitPrice != null && l.unitPrice! >= 0) ? l.unitPrice! : p.salePrice;
    final total = l.qty * unitPrice;
    items.add(BillItem(productId: p.id, name: p.name, qty: l.qty, unitPrice: unitPrice, unitCost: p.costPrice, total: total, sourceProductId: l.sourceProductId));
    subtotal += total;
    costTotal += l.qty * p.costPrice;
  }
  return (items: items, subtotal: subtotal, costTotal: costTotal);
}

double discountOf(double subtotal, String discountType, double discountValue) =>
    discountType == 'percent' ? round2((subtotal * discountValue) / 100) : discountValue;

/// Stamp resolved tax snapshots onto priced lines (stampBillTaxes).
({List<BillItem> items, double taxAmount, double total}) stampBillTaxes(
    List<BillItem> items, Map<String, Product> byId, List<TaxSlab> slabs,
    {String? defaultSalesTaxSlabId, required double discountAmount}) {
  final taxed = computeBillTaxes(
    items.map((it) => (total: it.total, qty: it.qty,
        slab: resolveTaxSlab(byId[it.productId], slabs,
            defaultSalesTaxSlabId: defaultSalesTaxSlabId, direction: 'sales'))).toList(),
    discountAmount,
  );
  final stamped = <BillItem>[];
  for (var i = 0; i < items.length; i++) {
    final it = items[i];
    final tl = taxed.lines[i];
    stamped.add(BillItem(
      productId: it.productId, name: it.name, qty: it.qty, unitPrice: it.unitPrice,
      unitCost: it.unitCost, total: it.total, sourceProductId: it.sourceProductId,
      taxAmount: tl.taxAmount, taxSlabId: tl.slab?.id, taxSlabName: tl.slab?.name,
      taxRate: tl.slab?.rate ?? 0, taxKind: tl.slab?.kind ?? 'percent',
      taxInclusive: tl.slab?.inclusive ?? false,
    ));
  }
  return (items: stamped, taxAmount: taxed.taxAmount, total: taxed.total);
}

/// postBill's entry composition (+ the bill's own stamped payments,
/// sale rows and udhaar row). The store adds warehouse level deltas,
/// cheque registry docs and conversion status updates around this
/// same core.
ComposedBill composeBillEntry({
  required Bill bill,
  required List<BillItem> pricedItems,
  required double costTotal,
  required List<MoneyAccount> accounts,
  required Map<String, Product> productsById,
  String? originDevice,
  String? ts,
}) {
  final now = ts ?? DateTime.now().toUtc().toIso8601String();
  // A2: stamp every money payment with its settling account; a cheque
  // part stamps the registry id instead; credit stamps the customer.
  final payments = bill.payments.map((p) {
    if (p.instrument == 'cheque') return p;
    if (p.instrument == 'points') {
      // H2: a points part stamps like a cheque part — NO money
      // account (the loyalty liability settles that share), and
      // the points count rides the stamp to the stored bill.
      return BillPayment(
        method: p.method, amount: p.amount, accountId: null,
        instrument: 'points', loyaltyPoints: p.loyaltyPoints,
      );
    }
    return BillPayment(
      method: p.method, amount: p.amount,
      accountId: p.method == 'credit' ? null : resolveAccountId(accounts, p.method, p.accountId),
    );
  }).toList();
  final posted = Bill(
    id: bill.id, billNo: bill.billNo, customerId: bill.customerId,
    customerName: bill.customerName, customerPhone: bill.customerPhone,
    items: bill.items, subtotal: bill.subtotal, discountType: bill.discountType,
    discountValue: bill.discountValue, discountAmount: bill.discountAmount,
    taxAmount: bill.taxAmount, total: bill.total, payments: payments,
    status: bill.status, returnedQty: bill.returnedQty, sourceType: bill.sourceType,
    sourceId: bill.sourceId, warehouseId: bill.warehouseId, dayOffset: bill.dayOffset,
    ts: bill.ts, originDevice: originDevice ?? bill.originDevice,
  );
  final creditPart = payments.where((p) => p.method == 'credit').fold(0.0, (a, p) => a + p.amount);
  final saleRows = <Sale>[
    for (var i = 0; i < pricedItems.length; i++)
      Sale(id: '${bill.id}-s$i', productId: pricedItems[i].productId, qty: pricedItems[i].qty,
          unitPrice: pricedItems[i].unitPrice, unitCost: pricedItems[i].unitCost,
          total: pricedItems[i].total, billId: bill.id, kind: 'sale', dayOffset: 0, ts: now),
  ];
  // F-2: ±Rs 1 payment tolerance books explicitly to sales_discount.
  final paidTotal = payments.fold(0.0, (a, p) => a + p.amount);
  final rounding = bill.total - paidTotal;
  final discountDebit = bill.discountAmount + (rounding > 0 ? rounding : 0);
  // A4: revenue credited NET of inclusive tax; whole tax to tax_payable.
  final billTax = bill.taxAmount;
  final inclusiveTax = round2(bill.items.fold(0.0, (a, it) => a + (it.taxInclusive ? it.taxAmount : 0)));
  final rawCostShare = pricedItems.fold(0.0, (a, it) =>
      a + ((productsById[it.productId]?.isRaw ?? false) ? it.qty * it.unitCost : 0));
  final lines = <JournalLine>[
    ...payments.map((p) => p.instrument == 'cheque'
        ? JournalLine(account: 'cheques_in_hand', debit: p.amount, ref: p.chequeId)
        : p.instrument == 'points'
            // H2: the points leg rides INSIDE the bill entry —
            // Dr loyalty_payable (ref = the customer) settles that
            // share against the liability, so void/return mirrors
            // reverse it with no loyalty code in the mirror.
            ? JournalLine(account: 'loyalty_payable', debit: p.amount, ref: bill.customerId)
            : JournalLine(account: accountForMethod(p.method), debit: p.amount,
                ref: p.method == 'credit' ? bill.customerId : p.accountId)),
    if (discountDebit > 0) JournalLine(account: 'sales_discount', debit: discountDebit),
    if (rounding < 0) JournalLine(account: 'sales_discount', credit: -rounding),
    JournalLine(account: 'cogs', debit: costTotal),
    JournalLine(account: 'sales_revenue',
        credit: inclusiveTax > 0 ? round2(bill.subtotal - inclusiveTax) : bill.subtotal),
    if (billTax > 0) JournalLine(account: 'tax_payable', credit: billTax),
    ...classLegLines(costTotal, rawCostShare, 'credit'),
  ];
  final rawEntry = makeEntry(
    'Bill #${bill.billNo} — ${bill.customerName.isNotEmpty ? bill.customerName : 'Walk-in customer'}',
    'bill', bill.id, lines, ts: now,
  );
  // H2: the fold reads the redeemed count off this payload (the
  // store validated it against the derived position + cap before
  // composing; the stamped sum IS the validated quote's points).
  final loyaltyPointsUsed = payments
      .where((p) => p.instrument == 'points')
      .fold(0, (a, p) => a + ((p.loyaltyPoints ?? 0) > 0 ? p.loyaltyPoints!.floor() : 0));
  final entry = loyaltyPointsUsed > 0
      ? rawEntry.copyWith(loyaltyPointsUsed: loyaltyPointsUsed)
      : rawEntry;
  final creditRow = creditPart > 0
      ? CreditEntry(
          id: newId('cr'), customerId: bill.customerId, customerName: bill.customerName,
          customerPhone: bill.customerPhone, kind: 'credit', amount: creditPart,
          note: 'Bill #${bill.billNo} — part payment on udhaar', billId: bill.id,
          dayOffset: 0, ts: now, originDevice: originDevice,
        )
      : null;
  return ComposedBill(bill: posted, entry: entry, creditRow: creditRow, saleRows: saleRows);
}

/// recordSale (sales counter): a one-line, no-discount bill for tax.
JournalEntry composeCounterSaleEntry({
  required String saleId,
  required Product product,
  required double qty,
  required List<TaxSlab> slabs,
  required List<MoneyAccount> accounts,
  String? defaultSalesTaxSlabId,
  String? ts,
}) {
  final total = qty * product.salePrice;
  final ct = computeBillTaxes(
    [(total: total, qty: qty, slab: resolveTaxSlab(product, slabs, defaultSalesTaxSlabId: defaultSalesTaxSlabId, direction: 'sales'))], 0);
  return makeEntry('Counter sale — ${product.name} × ${_fmtQty(qty)}', 'sale', saleId, [
    JournalLine(account: 'cash', debit: total + ct.exclusiveTax, ref: resolveAccountId(accounts, 'cash')),
    JournalLine(account: 'cogs', debit: qty * product.costPrice),
    JournalLine(account: 'sales_revenue', credit: ct.inclusiveTax > 0 ? round2(total - ct.inclusiveTax) : total),
    if (ct.taxAmount > 0) JournalLine(account: 'tax_payable', credit: ct.taxAmount),
    JournalLine(account: inventoryAccountFor(product), credit: qty * product.costPrice),
  ], ts: ts);
}

String _fmtQty(double q) => q == q.roundToDouble() ? q.toInt().toString() : q.toString();

class ComposedReturn {
  final JournalEntry entry;
  final SaleReturn saleReturn;
  final CreditEntry? creditReversal;
  final List<Sale> negSales;
  /// H2: the loyalty clawback companion (negative-points
  /// `loyalty_earn`), composed when the returned bill had earned —
  /// guarded and posted by the store in the return's own batch.
  final JournalEntry? clawback;
  const ComposedReturn({required this.entry, required this.saleReturn, this.creditReversal, this.negSales = const [], this.clawback});
}

/// The return engine for kind == "return" (partial/full returns of a
/// posted bill). Void (kind == "void") is [composeVoidEntry].
ComposedReturn? composeReturnEntry({
  required Bill bill,
  required List<SaleReturn> priorReturns,
  required List<CreditEntry> credits,
  required List<({String productId, double qty})> lines,
  required Map<String, Product> productsById,
  required List<JournalEntry> journal,
  String refundMethod = 'cash',
  String? refundAccountId,
  required List<MoneyAccount> accounts,
  String? originDevice,
  String? ts,
  String? noteId,
}) {
  final byPid = {for (final i in bill.items) i.productId: i};
  final retItems = <BillItem>[];
  var gross = 0.0, cost = 0.0, costRaw = 0.0;
  for (final l in lines) {
    final src = byPid[l.productId];
    if (src == null || l.qty <= 0) continue;
    final already = bill.returnedQty[l.productId] ?? 0;
    var qty = l.qty;
    final maxQty = src.qty - already;
    if (qty > maxQty) qty = maxQty;
    if (qty <= 0) continue;
    retItems.add(BillItem(productId: src.productId, name: src.name, qty: qty,
        unitPrice: src.unitPrice, unitCost: src.unitCost, total: qty * src.unitPrice,
        taxAmount: src.taxAmount, taxSlabId: src.taxSlabId, taxSlabName: src.taxSlabName,
        taxRate: src.taxRate, taxKind: src.taxKind, taxInclusive: src.taxInclusive));
    gross += qty * src.unitPrice;
    cost += qty * src.unitCost;
    if (productsById[l.productId]?.isRaw ?? false) costRaw += qty * src.unitCost;
  }
  if (retItems.isEmpty || gross <= 0) return null;
  // A4: per-line tax shares, cumulative discipline.
  final shares = returnTaxShares(bill, priorReturns, retItems);
  final stamped = retItems
      .map((it) => it.copyWith(taxAmount: shares.perLine[it.productId] ?? 0))
      .toList();
  // F-3: cumulative discount share.
  final priorGross = bill.items.fold(0.0, (a, i) => a + (bill.returnedQty[i.productId] ?? 0) * i.unitPrice);
  var alreadyReversedDiscount = 0.0;
  for (final r in priorReturns) {
    alreadyReversedDiscount += r.items.fold(0.0, (x, i) => x + i.total) -
        (r.refundAmount + r.creditReduction) +
        r.items.fold(0.0, (x, i) => x + (i.taxInclusive ? 0 : i.taxAmount));
  }
  final completesBill = priorGross + gross >= bill.subtotal - 1e-9;
  final cumulativeDiscount =
      bill.subtotal > 0 ? (bill.discountAmount * (priorGross + gross) / bill.subtotal).round() : 0;
  var discountShare = (completesBill ? bill.discountAmount : cumulativeDiscount.toDouble()) - alreadyReversedDiscount;
  if (discountShare < 0) discountShare = 0;
  final refundTotal = gross - discountShare + shares.exclusiveTaxShare;
  // H2 (§1.1/§1.4): a points-paid bill's return re-credits POINTS,
  // never cash — the tender unwinds in the same proportion as this
  // give-back (fold-priced, LIFO at snapshot rates), and the money
  // split below shrinks by exactly that value.
  final loyaltyShare = bill.customerId != null
      ? loyaltyRecreditForReturn(journal, bill, refundTotal, completesBill)
      : const LoyaltyRedemptionQuote(points: 0, rs: 0);
  final moneyGiveBack = round2(refundTotal - loyaltyShare.rs);
  // F-6: refunds eat only into STILL-UNPAID udhaar.
  final creditPosition = billCreditOutstanding(credits, bill);
  final creditReduction = moneyGiveBack < creditPosition.outstanding ? moneyGiveBack : creditPosition.outstanding;
  final cashRefund = moneyGiveBack - creditReduction;
  final now = ts ?? DateTime.now().toUtc().toIso8601String();
  final resolvedRefundAccount = resolveAccountId(accounts, refundMethod, refundAccountId);
  final linesJ = <JournalLine>[
    JournalLine(account: 'sales_revenue',
        debit: shares.inclusiveTaxShare > 0 ? round2(gross - shares.inclusiveTaxShare) : gross),
    if (shares.taxShare > 0) JournalLine(account: 'tax_payable', debit: shares.taxShare),
    ...classLegLines(cost, costRaw, 'debit'),
    if (discountShare > 0) JournalLine(account: 'sales_discount', credit: discountShare),
    if (creditReduction > 0) JournalLine(account: 'receivables', credit: creditReduction, ref: bill.customerId),
    if (loyaltyShare.rs > 0)
      JournalLine(account: 'loyalty_payable', credit: loyaltyShare.rs, ref: bill.customerId),
    if (cashRefund > 0)
      JournalLine(account: accountForMethod(refundMethod), credit: cashRefund, ref: resolvedRefundAccount),
    JournalLine(account: 'cogs', credit: cost),
  ];
  final rawEntry = makeEntry('Return against Bill #${bill.billNo}', 'return', bill.id, linesJ, ts: now);
  // H2: the fold reads the re-credited count off this payload.
  final entry = loyaltyShare.points > 0
      ? rawEntry.copyWith(loyaltyPointsReturned: loyaltyShare.points)
      : rawEntry;
  final ret = SaleReturn(
    id: newId('ret'), billId: bill.id, billNo: bill.billNo, items: stamped,
    refundAmount: cashRefund, creditReduction: creditReduction,
    loyaltyRecreditRs: loyaltyShare.rs, loyaltyRecreditPoints: loyaltyShare.points,
    method: refundMethod,
    accountId: resolvedRefundAccount, dayOffset: 0, ts: now,
  );
  // H2 (§1.4): the clawback companion — the earn on the given-back
  // portion returns as a negative-points loyalty_earn entry,
  // computed cumulatively and floored; its refId names the credit
  // note when one wraps this return, else the return itself.
  JournalEntry? clawback;
  final earnEntry0 = bill.customerId != null ? billLoyaltyEarnEntry(journal, bill.id) : null;
  if (earnEntry0 != null) {
    final clawPoints = loyaltyClawbackPoints(
      journal: journal,
      bill: bill,
      refundTotalRs: refundTotal,
      priorRefundedRs: priorReturns.fold(
          0.0, (a, r) => a + r.refundAmount + r.creditReduction + r.loyaltyRecreditRs),
      completesBill: completesBill,
    );
    if (clawPoints > 0) {
      clawback = buildLoyaltyClawbackEntry(
        journal: journal,
        bill: bill,
        clawPoints: clawPoints,
        refId: noteId ?? ret.id,
        memo: 'Loyalty points taken back — return on Bill #${bill.billNo}',
        ts: now,
      );
    }
  }
  final creditReversal = creditReduction > 0
      ? CreditEntry(
          id: newId('cr'), customerId: bill.customerId, customerName: bill.customerName,
          customerPhone: bill.customerPhone, kind: 'credit', amount: -creditReduction,
          note: 'Return on Bill #${bill.billNo} — udhaar reduced', billId: bill.id,
          dayOffset: 0, ts: now, originDevice: originDevice,
        )
      : null;
  final negSales = <Sale>[
    for (var i = 0; i < stamped.length; i++)
      Sale(id: '${bill.id}-r${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}-$i',
          productId: stamped[i].productId, qty: -stamped[i].qty, unitPrice: stamped[i].unitPrice,
          unitCost: stamped[i].unitCost, total: -stamped[i].total, billId: bill.id,
          kind: 'return', dayOffset: 0, ts: now),
  ];
  return ComposedReturn(entry: entry, saleReturn: ret, creditReversal: creditReversal, negSales: negSales, clawback: clawback);
}

/// The void engine for NON-cheque bills (each original payment
/// returns through its own account; repaid udhaar is handed back in
/// cash per F-6). Bills carrying cheque parts are refused by the
/// store: their handback needs the cheques registry (F2) — composing
/// anything else would break the registry ≡ GL identity.
ComposedReturn? composeVoidEntry({
  required Bill bill,
  required List<CreditEntry> credits,
  required List<MoneyAccount> accounts,
  required Map<String, Product> productsById,
  String? ts,
}) {
  if (bill.payments.any((p) => p.instrument == 'cheque')) return null;
  // A bill already partially returned is finished via returns, not a
  // void (the web's shared engine nets priors; the app keeps the two
  // paths distinct and refuses the overlap rather than double-reverse).
  if (bill.returnedQty.values.any((q) => q > 0)) return null;
  final creditPosition = billCreditOutstanding(credits, bill);
  final creditReduction = creditPosition.outstanding;
  final refundTotal = bill.items.fold(0.0, (a, i) => a + i.total) -
      bill.discountAmount +
      (bill.items.fold(0.0, (a, it) => a + (it.taxInclusive ? 0 : it.taxAmount)));
  final cashRefund = refundTotal - creditReduction;
  final now = ts ?? DateTime.now().toUtc().toIso8601String();
  final refundLines = <JournalLine>[
    ...bill.payments.where((p) => p.method != 'credit').map((p) => JournalLine(
        account: accountForMethod(p.method), credit: p.amount,
        ref: p.accountId ?? resolveAccountId(accounts, p.method))),
    if (creditPosition.repaidAllocated > 0)
      JournalLine(account: 'cash', credit: creditPosition.repaidAllocated, ref: resolveAccountId(accounts, 'cash')),
  ];
  // Tax shares for a full-bill void: the whole bill reverses.
  final shares = returnTaxShares(bill, const [], bill.items);
  final gross = bill.items.fold(0.0, (a, i) => a + i.total);
  var cost = 0.0, costRaw = 0.0;
  for (final i in bill.items) {
    cost += i.qty * i.unitCost;
    if (productsById[i.productId]?.isRaw ?? false) costRaw += i.qty * i.unitCost;
  }
  final linesJ = <JournalLine>[
    JournalLine(account: 'sales_revenue',
        debit: shares.inclusiveTaxShare > 0 ? round2(gross - shares.inclusiveTaxShare) : gross),
    if (shares.taxShare > 0) JournalLine(account: 'tax_payable', debit: shares.taxShare),
    ...classLegLines(cost, costRaw, 'debit'),
    if (bill.discountAmount > 0) JournalLine(account: 'sales_discount', credit: bill.discountAmount),
    if (creditReduction > 0) JournalLine(account: 'receivables', credit: creditReduction, ref: bill.customerId),
    ...refundLines,
    JournalLine(account: 'cogs', credit: cost),
  ];
  final entry = makeEntry('Bill #${bill.billNo} voided', 'bill_void', bill.id, linesJ, ts: now);
  final ret = SaleReturn(
    id: newId('ret'), billId: bill.id, billNo: bill.billNo, items: bill.items,
    refundAmount: cashRefund, creditReduction: creditReduction, method: 'cash',
    accountId: null, dayOffset: 0, ts: now,
  );
  return ComposedReturn(entry: entry, saleReturn: ret);
}

/// recordPurchase's entry (perpetual: purchases clear into inventory).
({Purchase purchase, JournalEntry entry}) composePurchaseEntry({
  required String purchaseId,
  required String supplierId,
  required List<({String productId, double qty, double unitCost})> lines,
  required Map<String, Product> productsById,
  required List<TaxSlab> slabs,
  String? defaultPurchaseTaxSlabId,
  String note = '',
  String? ts,
}) {
  final items = lines.map((l) {
    final p = productsById[l.productId]!;
    return PurchaseItem(productId: p.id, name: p.name, qty: l.qty, unitCost: l.unitCost, total: l.qty * l.unitCost);
  }).toList();
  final pt = computePurchaseTaxes(items
      .map((it) => (total: it.total, qty: it.qty,
          slab: resolveTaxSlab(productsById[it.productId], slabs,
              defaultPurchaseTaxSlabId: defaultPurchaseTaxSlabId, direction: 'purchases')))
      .toList());
  final stamped = <PurchaseItem>[
    for (var i = 0; i < items.length; i++)
      PurchaseItem(productId: items[i].productId, name: items[i].name, qty: items[i].qty,
          unitCost: items[i].unitCost, total: items[i].total, taxAmount: pt.lines[i].taxAmount,
          taxSlabId: pt.lines[i].slab?.id, taxSlabName: pt.lines[i].slab?.name,
          taxRate: pt.lines[i].slab?.rate ?? 0, taxKind: pt.lines[i].slab?.kind ?? 'percent',
          taxInclusive: pt.lines[i].slab?.inclusive ?? false),
  ];
  final rawNetShare = stamped.asMap().entries.fold(0.0, (a, e) =>
      a + ((productsById[e.value.productId]?.isRaw ?? false) ? pt.lines[e.key].base : 0));
  final purchase = Purchase(id: purchaseId, supplierId: supplierId, items: stamped,
      total: pt.grossTotal, netTotal: pt.netTotal, taxAmount: pt.taxAmount, note: note,
      dayOffset: 0, ts: ts ?? DateTime.now().toUtc().toIso8601String());
  final entry = makeEntry('Purchase — stock received', 'purchase', purchaseId, [
    JournalLine(account: 'purchases', debit: pt.netTotal),
    if (pt.taxAmount > 0) JournalLine(account: 'tax_input', debit: pt.taxAmount),
    ...classLegLines(pt.netTotal, rawNetShare, 'debit'),
    JournalLine(account: 'purchases', credit: pt.netTotal),
    JournalLine(account: 'payables', credit: pt.grossTotal, ref: supplierId),
  ], ts: purchase.ts);
  return (purchase: purchase, entry: entry);
}

/// Stock adjustment (the store's buildAdjustment): the applied
/// delta is clamped to the shelf (F-11); a removal posts
/// Dr inventory_loss / Cr class-account, an addition the mirror
/// against the counterpart (inventory_loss by default, or capital).
({String adjId, JournalEntry entry, double newQty, double delta})? composeAdjustmentEntry({
  required Product product,
  required double rawDelta,
  required String reason,
  String counterpart = 'inventory_loss',
  String? ts,
}) {
  final delta = appliedAdjustmentDelta(product.stockQty, rawDelta);
  if (delta == 0) return null;
  final adjId = newId('adj');
  final cost = delta.abs() * product.costPrice;
  final acct = inventoryAccountFor(product);
  final entry = delta < 0
      ? makeEntry('Stock $reason — ${product.name}', 'adjustment', adjId, [
          JournalLine(account: 'inventory_loss', debit: cost),
          JournalLine(account: acct, credit: cost),
        ], ts: ts)
      : makeEntry('Stock $reason — ${product.name}', 'adjustment', adjId, [
          JournalLine(account: acct, debit: cost),
          JournalLine(account: counterpart, credit: cost),
        ], ts: ts);
  return (adjId: adjId, entry: entry, newQty: product.stockQty + delta, delta: delta);
}

/// addRepayment's entry: Dr money (or cheques_in_hand) / Cr receivables.
JournalEntry composeRepaymentEntry({
  required CreditEntry row,
  required List<MoneyAccount> accounts,
}) {
  final isCheque = row.instrument == 'cheque';
  return makeEntry('Udhaar repayment — ${row.customerName}', 'repayment', row.id, [
    isCheque
        ? JournalLine(account: 'cheques_in_hand', debit: row.amount, ref: row.chequeId)
        : JournalLine(account: accountForMethod(row.method ?? 'cash'), debit: row.amount, ref: row.accountId),
    JournalLine(account: 'receivables', credit: row.amount, ref: row.customerId),
  ], ts: row.ts);
}

/// giveCredit (standalone udhaar): a CASH LOAN out of the till —
/// Dr receivables / Cr cash. Never revenue.
JournalEntry composeCreditGivenEntry({
  required CreditEntry row,
  required List<MoneyAccount> accounts,
}) {
  return makeEntry('Udhaar (cash loan) — ${row.customerName}', 'credit', row.id, [
    JournalLine(account: 'receivables', debit: row.amount, ref: row.customerId),
    JournalLine(account: 'cash', credit: row.amount, ref: resolveAccountId(accounts, 'cash')),
  ], ts: row.ts);
}
