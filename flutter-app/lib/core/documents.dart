/// Dukaan AI — document numbering (Dart port of web/lib/documents.ts
/// §1.3) with the Phase F hardening (design §3.6):
///
///  - max+1 over the FULLEST available view (the subscribed series —
///    every device's documents once synced);
///  - drafts burn no numbers (minting happens at finalize);
///  - numbers are NEVER rewritten after the fact — duplicates are
///    detected and displayed, never renumbered (paper is already
///    out; identity is the doc id, money never keys on a number);
///  - app-composed documents carry an additive `originDevice` stamp
///    for duplicate forensics.
import 'ledger.dart' show refNormalBalance;
import 'tax.dart' show computeBillTaxes, purchaseReturnTaxShares, resolveTaxSlab, round2;
import 'types.dart';

/// Default series prefixes (owner overrides live in settings.docSeries).
const Map<String, String> seriesDefaultPrefix = {
  'quotation': 'QT-',
  'saleOrder': 'SO-',
  'challan': 'DC-',
  'purchaseOrder': 'PO-',
  'creditNote': 'CN-',
  'debitNote': 'DN-',
  'receiptVoucher': 'RV-',
  'paymentVoucher': 'PV-',
  'stockTransfer': 'TR-',
  'productionOrder': 'PR-',
  'job': 'JB-',
  'payrollRun': 'PAY-',
  'loan': 'LN-',
};

final List<String> seriesIds = seriesDefaultPrefix.keys.toList();

/// The live prefix for a series: the owner's non-empty override, else
/// the default.
String seriesPrefix(String series, Map<String, String> docSeries) {
  final override = docSeries[series];
  return (override != null && override.trim().isNotEmpty)
      ? override
      : (seriesDefaultPrefix[series] ?? '');
}

final _seqRe = RegExp(r'(\d+)\s*$');

/// The sequence a stored number carries: its trailing integer, read
/// prefix-agnostically. Null when the string carries no digits.
int? parseSeriesSeq(String? number) {
  if (number == null) return null;
  final m = _seqRe.firstMatch(number);
  if (m == null) return null;
  return int.tryParse(m.group(1)!);
}

/// Mint the next number in a series: `1 + max(sequence)` over the
/// numbers already in use, or `prefix + 1` when the series is empty.
String nextDocNumber(String series, List<String?> existingNumbers, Map<String, String> docSeries) {
  var max = 0;
  for (final n in existingNumbers) {
    final seq = parseSeriesSeq(n);
    if (seq != null && seq > max) max = seq;
  }
  return '${seriesPrefix(series, docSeries)}${max + 1}';
}

/// Next bill number: bills mint as `1 + max(billNo)` (the older,
/// numeric pattern of the same §1.3 doctrine).
int nextBillNo(List<int> existingBillNos) {
  var max = 0;
  for (final n in existingBillNos) {
    if (n > max) max = n;
  }
  return max + 1;
}

/// Group key for a duplicate: the series-local identity of a stored
/// number string.
class DuplicateGroup {
  final String number;
  final List<String> docIds;
  const DuplicateGroup(this.number, this.docIds);
}

/// The duplicate detector (design §3.6 part 3): any number held by
/// more than one document in the same series. Pure, derived, shown
/// on the dashboard attention list — never acted on automatically.
List<DuplicateGroup> duplicateNumbers(List<({String id, String? number})> docs) {
  final byNumber = <String, List<String>>{};
  for (final d in docs) {
    final n = d.number;
    if (n == null || n.isEmpty) continue;
    (byNumber[n] ??= []).add(d.id);
  }
  final out = <DuplicateGroup>[];
  byNumber.forEach((number, ids) {
    if (ids.length > 1) out.add(DuplicateGroup(number, ids));
  });
  out.sort((a, b) => a.number.compareTo(b.number));
  return out;
}

/// Duplicate bill numbers (numeric series).
List<DuplicateGroup> duplicateBillNumbers(List<({String id, int billNo})> bills) {
  final byNumber = <int, List<String>>{};
  for (final b in bills) {
    (byNumber[b.billNo] ??= []).add(b.id);
  }
  final out = <DuplicateGroup>[];
  byNumber.forEach((n, ids) {
    if (ids.length > 1) out.add(DuplicateGroup('$n', ids));
  });
  out.sort((a, b) => (int.tryParse(a.number) ?? 0).compareTo(int.tryParse(b.number) ?? 0));
  return out;
}

/* ==================================================================
 * Phase F · F2 additions — totals, fulfilment derivations,
 * receipt compositions, note figures, voucher print data.
 * Ported from web/lib/documents.ts (§2) field-for-field.
 * ================================================================== */

/// The document discount in absolute rupees: percent = share of
/// subtotal (rounded, capped at the subtotal); flat = the value
/// itself (capped at the subtotal, never negative).
double docDiscountOf(double subtotal, String discountType, double discountValue) {
  if (discountType == 'percent') {
    final v = round2(subtotal * (discountValue > 0 ? discountValue : 0) / 100);
    return v < subtotal ? v : subtotal;
  }
  final raw = discountValue > 0 ? discountValue : 0.0;
  return raw < subtotal ? raw : subtotal;
}

class DocTotals {
  final double subtotal;
  final double discountAmount;
  final double estimatedTax;
  final double total;
  const DocTotals({required this.subtotal, required this.discountAmount, required this.estimatedTax, required this.total});
}

/// Totals for a quotation/order draft: subtotal from the lines,
/// discount via [docDiscountOf], and the estimated tax by running
/// the REAL bill tax engine over synthetic doc lines (Phase A · A4
/// resolution, direction "sales") — an estimate only, never posted.
DocTotals estimateDocTotals(
  List<DocLine> lines, String discountType, double discountValue, {
  required List<Product> products, required List<TaxSlab> slabs, required ShopSettingsView settings,
}) {
  final subtotal = round2(lines.fold(0.0, (a, l) => a + l.total));
  final discountAmount = docDiscountOf(subtotal, discountType, discountValue);
  final result = computeBillTaxes(
    [
      for (final l in lines)
        (
          total: l.total,
          qty: l.qty,
          slab: resolveTaxSlab(
            products.where((p) => p.id == l.productId).firstOrNull,
            slabs,
            defaultSalesTaxSlabId: settings.defaultSalesTaxSlabId,
            defaultPurchaseTaxSlabId: settings.defaultPurchaseTaxSlabId,
            direction: 'sales',
          ),
        )
    ],
    discountAmount,
  );
  return DocTotals(
    subtotal: subtotal, discountAmount: discountAmount,
    estimatedTax: result.taxAmount,
    total: round2(subtotal - discountAmount + result.exclusiveTax),
  );
}

/* ---------------- fulfilment derivations (§2.1) ---------------- */

const Set<String> _billedStatuses = {'paid', 'partially_returned', 'returned'};

Map<String, double> _emptyMap() => <String, double>{};

/// Σ line qty keyed by SOURCE product identity.
Map<String, double> qtyByProduct(List<DocLine> lines) {
  final out = _emptyMap();
  for (final l in lines) {
    final key = l.sourceProductId ?? l.productId;
    out[key] = (out[key] ?? 0) + l.qty;
  }
  return out;
}

Map<String, double> _qtyOfBillLines(List<BillItem> items) {
  final out = _emptyMap();
  for (final l in items) {
    final key = l.sourceProductId ?? l.productId;
    out[key] = (out[key] ?? 0) + l.qty;
  }
  return out;
}

Map<String, double> _addQty(Map<String, double> into, Map<String, double> from) {
  for (final e in from.entries) {
    into[e.key] = (into[e.key] ?? 0) + e.value;
  }
  return into;
}

bool _covers(Map<String, double> have, List<DocLine> want) {
  for (final w in want) {
    if ((have[w.productId] ?? 0) < w.qty - 1e-9) return false;
  }
  return true;
}

bool _anyOf(Map<String, double> have) => have.values.any((v) => v > 0);

/// Qty of a quotation converted into ORDERS (a bill citing the
/// quotation directly counts in [quotationConvertedTotalQty]).
Map<String, double> quotationConvertedQty(Quotation q, Iterable<SaleOrder> orders) {
  final out = _emptyMap();
  for (final o in orders) {
    if (o.source?.type != 'quotation' || o.source?.id != q.id) continue;
    if (o.status == 'cancelled') continue;
    _addQty(out, qtyByProduct(o.lines));
  }
  return out;
}

/// Total converted qty: orders citing it PLUS posted bills citing it.
Map<String, double> quotationConvertedTotalQty(
    Quotation q, Iterable<SaleOrder> orders, Iterable<Bill> bills) {
  final out = quotationConvertedQty(q, orders);
  for (final b in bills) {
    if (b.sourceType != 'quotation' || b.sourceId != q.id) continue;
    if (!_billedStatuses.contains(b.status)) continue;
    _addQty(out, _qtyOfBillLines(b.items));
  }
  return out;
}

/// Qty of an order BILLED: bills citing the order + bills citing
/// any challan OF the order (one hop).
Map<String, double> orderBilledQty(
    SaleOrder o, Iterable<Bill> bills, Iterable<DeliveryChallan> challans) {
  final out = _emptyMap();
  final challanIds = challans.where((c) => c.orderId == o.id).map((c) => c.id).toSet();
  for (final b in bills) {
    if (!_billedStatuses.contains(b.status)) continue;
    final direct = b.sourceType == 'order' && b.sourceId == o.id;
    final viaChallan = b.sourceType == 'challan' && challanIds.contains(b.sourceId);
    if (!direct && !viaChallan) continue;
    _addQty(out, _qtyOfBillLines(b.items));
  }
  return out;
}

/// Qty of an order DELIVERED: challans in a dispatched-or-later
/// state citing it.
Map<String, double> orderDeliveredQty(SaleOrder o, Iterable<DeliveryChallan> challans) {
  final out = _emptyMap();
  for (final c in challans) {
    if (c.orderId != o.id) continue;
    if (!(c.status == 'dispatched' || c.status == 'partially_billed' || c.status == 'billed')) continue;
    _addQty(out, qtyByProduct(c.lines));
  }
  return out;
}

Map<String, double> challanBilledQty(DeliveryChallan c, Iterable<Bill> bills) {
  final out = _emptyMap();
  for (final b in bills) {
    if (b.sourceType != 'challan' || b.sourceId != c.id) continue;
    if (!_billedStatuses.contains(b.status)) continue;
    _addQty(out, _qtyOfBillLines(b.items));
  }
  return out;
}

Map<String, double> poReceivedQty(PurchaseOrder po, Iterable<Purchase> purchases) {
  final out = _emptyMap();
  for (final p in purchases) {
    if (p.sourcePoId != po.id) continue;
    for (final it in p.items) {
      out[it.productId] = (out[it.productId] ?? 0) + it.qty;
    }
  }
  return out;
}

String deriveOrderStatus(
    SaleOrder o, Iterable<Bill> bills, Iterable<DeliveryChallan> challans) {
  if (o.status == 'draft' || o.status == 'cancelled') return o.status;
  final billed = orderBilledQty(o, bills, challans);
  if (o.lines.isNotEmpty && _covers(billed, o.lines)) return 'fulfilled';
  if (_anyOf(billed)) return 'partially_fulfilled';
  return 'open';
}

String deriveQuotationStatus(
    Quotation q, Iterable<SaleOrder> orders, Iterable<Bill> bills) {
  if (q.status == 'draft' || q.status == 'rejected' || q.status == 'cancelled' ||
      q.status == 'converted') {
    return q.status;
  }
  final converted = quotationConvertedTotalQty(q, orders, bills);
  if (q.lines.isNotEmpty && _covers(converted, q.lines)) return 'converted';
  return q.status;
}

/// The display status: a live "expired" overlay on an
/// issued/accepted quotation past its validity date.
String displayQuotationStatus(
    Quotation q, Iterable<SaleOrder> orders, Iterable<Bill> bills, String todayISO) {
  final derived = deriveQuotationStatus(q, orders, bills);
  if ((derived == 'issued' || derived == 'accepted') &&
      q.validUntil != null &&
      q.validUntil!.compareTo(todayISO) < 0) {
    return 'expired';
  }
  return derived;
}

String deriveChallanStatus(DeliveryChallan c, Iterable<Bill> bills) {
  if (c.status == 'draft' || c.status == 'cancelled') return c.status;
  final billed = challanBilledQty(c, bills);
  if (c.lines.isNotEmpty && _covers(billed, c.lines)) return 'billed';
  if (_anyOf(billed)) return 'partially_billed';
  return 'dispatched';
}

String derivePoStatus(PurchaseOrder po, Iterable<Purchase> purchases) {
  if (po.status == 'draft' || po.status == 'cancelled') return po.status;
  final received = poReceivedQty(po, purchases);
  final want = [for (final l in po.lines) DocLine(productId: l.productId, qty: l.qty)];
  if (po.lines.isNotEmpty && _covers(received, want)) return 'received';
  if (_anyOf(received)) return 'partially_received';
  return 'issued';
}

/* ---------------- promised stock (§2.5) ---------------- */

void _addRemainder(Map<String, double> out, List<DocLine> lines, Map<String, double> done) {
  for (final l in lines) {
    final remaining = l.qty - (done[l.productId] ?? 0);
    if (remaining > 0) out[l.productId] = (out[l.productId] ?? 0) + remaining;
  }
}

Map<String, double> promisedQtyByProduct(Iterable<SaleOrder> orders,
    Iterable<DeliveryChallan> challans, Iterable<Bill> bills) {
  final out = _emptyMap();
  final orderList = orders.toList();
  final challanList = challans.toList();
  final activeOrderIds = <String>{};
  for (final o in orderList) {
    if (o.status == 'draft' || o.status == 'cancelled') continue;
    activeOrderIds.add(o.id);
    _addRemainder(out, o.lines, orderBilledQty(o, bills, challanList));
  }
  for (final c in challanList) {
    if (c.status == 'draft' || c.status == 'cancelled') continue;
    if (c.orderId != null && activeOrderIds.contains(c.orderId)) continue;
    _addRemainder(out, c.lines, challanBilledQty(c, bills));
  }
  return out;
}

Map<String, double> availabilityByProduct(Iterable<Product> products, Iterable<SaleOrder> orders,
    Iterable<DeliveryChallan> challans, Iterable<Bill> bills) {
  final promised = promisedQtyByProduct(orders, challans, bills);
  final out = _emptyMap();
  for (final p in products) {
    out[p.id] = p.stockQty - (promised[p.id] ?? 0);
  }
  return out;
}

/* ---------------- receipt compositions (§2.4) ---------------- */

class PoReceiptPick {
  final String productId;
  final double qty;
  final double? unitCost;
  const PoReceiptPick({required this.productId, required this.qty, this.unitCost});
}

/// Compose purchase lines from PO receipt picks — null when
/// anything is off (unknown product, over-receipt against the
/// DERIVED received qty, negative cost, no positive lines).
List<PurchaseItem>? composePoReceiptLines(PurchaseOrder po, Iterable<Purchase> purchases,
    Iterable<Product> products, List<PoReceiptPick> picks) {
  if (po.status != 'issued' && po.status != 'partially_received') return null;
  final received = poReceivedQty(po, purchases);
  final byProduct = <String, PoLine>{for (final l in po.lines) l.productId: l};
  final merged = <String, ({double qty, double? unitCost})>{};
  for (final p in picks) {
    final prev = merged[p.productId];
    merged[p.productId] = (qty: (prev?.qty ?? 0) + p.qty, unitCost: p.unitCost ?? prev?.unitCost);
  }
  final out = <PurchaseItem>[];
  for (final e in merged.entries) {
    final line = byProduct[e.key];
    if (line == null) return null;
    final qty = e.value.qty;
    if (qty <= 0) continue;
    final remainingQty = line.qty - (received[e.key] ?? 0);
    if (qty > remainingQty + 1e-9) return null;
    final cost = e.value.unitCost ?? line.unitCost;
    if (cost < 0) return null;
    out.add(PurchaseItem(productId: e.key, qty: qty, unitCost: cost, total: round2(qty * cost)));
  }
  return out.isEmpty ? null : out;
}

/* ---------------- purchase returns (§3.2) ---------------- */

class PurchaseReturnPick {
  final String productId;
  final double qty;
  const PurchaseReturnPick({required this.productId, required this.qty});
}

/// Σ qty of one product already returned against one purchase.
double purchaseReturnedQty(List<PurchaseReturn> purchaseReturns, String purchaseId, String productId) =>
    purchaseReturns
        .where((r) => r.purchaseId == purchaseId)
        .fold(0.0, (a, r) => a + r.items.where((i) => i.productId == productId).fold(0.0, (x, i) => x + i.qty));

/// Compose purchase-return lines from picks — snapshots of the
/// purchase's lines at the returned qty; each line's stamped tax
/// (via the engine's cumulative shares) gives the input tax
/// reversed. Null on anything off-purchase or over-returned.
List<PurchaseItem>? composePurchaseReturnLines(Purchase purchase,
    List<PurchaseReturn> priorReturns, List<PurchaseReturnPick> picks) {
  final byProduct = <String, PurchaseItem>{for (final l in purchase.items) l.productId: l};
  final merged = <String, double>{};
  for (final p in picks) {
    merged[p.productId] = (merged[p.productId] ?? 0) + p.qty;
  }
  final raw = <PurchaseItem>[];
  for (final e in merged.entries) {
    final line = byProduct[e.key];
    if (line == null) return null;
    final qty = e.value;
    if (qty <= 0) continue;
    final already = purchaseReturnedQty(priorReturns, purchase.id, e.key);
    if (qty > line.qty - already + 1e-9) return null;
    raw.add(PurchaseItem(
      productId: e.key, qty: qty, unitCost: line.unitCost,
      total: round2(qty * line.unitCost),
      taxSlabId: line.taxSlabId, taxSlabName: line.taxSlabName, taxRate: line.taxRate,
      taxKind: line.taxKind, taxInclusive: line.taxInclusive,
    ));
  }
  if (raw.isEmpty) return null;
  final shares = purchaseReturnTaxShares(purchase, priorReturns, raw);
  return [
    for (final l in raw)
      PurchaseItem(
        productId: l.productId, qty: l.qty, unitCost: l.unitCost, total: l.total,
        taxAmount: shares.perLine[l.productId] ?? 0,
        taxSlabId: l.taxSlabId, taxSlabName: l.taxSlabName, taxRate: l.taxRate,
        taxKind: l.taxKind, taxInclusive: l.taxInclusive,
      )
  ];
}

/* ---------------- note figures (§2.6) ---------------- */

({double goods, double tax, double total}) creditNoteFigures(SaleReturn ret) {
  final total = round2(ret.refundAmount + ret.creditReduction);
  final tax = round2(ret.items.fold(0.0, (a, i) => a + i.taxAmount));
  return (goods: round2(total - tax), tax: tax, total: total);
}

({double goods, double tax, double total}) debitNoteFigures(PurchaseReturn ret) {
  final total = round2(ret.payableOffset + ret.refundAmount);
  final tax = round2(ret.items.fold(0.0, (a, i) => a + i.taxAmount));
  return (goods: round2(total - tax), tax: tax, total: total);
}

/// A purchase return's items as NOTE lines: priced at the IN-COST
/// (a debit note's party owes the claim at cost), tax shares kept.
List<BillItem> noteItemsFromPurchaseReturn(PurchaseReturn ret) => [
      for (final i in ret.items)
        BillItem(
          productId: i.productId, qty: i.qty, unitPrice: i.unitCost, total: i.total,
          taxAmount: i.taxAmount, taxSlabId: i.taxSlabId, taxSlabName: i.taxSlabName,
          taxRate: i.taxRate, taxKind: i.taxKind, taxInclusive: i.taxInclusive,
        )
    ];

/* ---------------- voucher print data (B6) ---------------- */

class VoucherPrintData {
  final String number;
  final String kind; // "receipt" | "payment"
  final String partyName;
  final double amount;
  final String method;
  final String? accountName;
  final double? balanceAfter;
  final String? note;
  final String ts;
  final String? chequeNo;
  final String? bankName;
  const VoucherPrintData({required this.number, required this.kind, required this.partyName,
    required this.amount, required this.method, this.accountName, this.balanceAfter,
    this.note, required this.ts, this.chequeNo, this.bankName});
}

VoucherPrintData? receiptVoucherData(CreditEntry row, Iterable<Customer> customers,
    Iterable<Bill> bills, Iterable<MoneyAccount> accounts, List<JournalEntry> journal) {
  if (row.voucherNo == null) return null;
  final bill = row.billId == null ? null : bills.where((b) => b.id == row.billId).firstOrNull;
  final partyName = customers.where((c) => c.id == row.customerId).firstOrNull?.name ?? row.customerName;
  final account = row.accountId == null ? null : accounts.where((a) => a.id == row.accountId).firstOrNull;
  final atTs = row.ts.isEmpty ? null : row.ts;
  return VoucherPrintData(
    number: row.voucherNo!, kind: 'receipt', partyName: partyName,
    amount: row.amount, method: bill?.payments.isNotEmpty == true ? bill!.payments.first.method : 'cash',
    accountName: account?.name,
    balanceAfter: customerOutstandingFor(journal, row.customerId ?? '', atTs: atTs),
    note: row.note.isEmpty ? null : row.note, ts: row.ts,
    chequeNo: row.chequeId != null ? null : null, bankName: null,
  );
}

VoucherPrintData? paymentVoucherData(SupplierPayment row, Iterable<Supplier> suppliers,
    Iterable<MoneyAccount> accounts, List<JournalEntry> journal) {
  if (row.voucherNo == null) return null;
  final partyName = suppliers.where((s) => s.id == row.supplierId).firstOrNull?.name ?? '';
  final account = row.accountId == null ? null : accounts.where((a) => a.id == row.accountId).firstOrNull;
  final atTs = row.ts.isEmpty ? null : row.ts;
  return VoucherPrintData(
    number: row.voucherNo!, kind: 'payment', partyName: partyName, amount: row.amount,
    method: row.method, accountName: account?.name,
    balanceAfter: accountBalanceOfPayablesRef(journal, row.supplierId, atTs),
    note: row.note.isEmpty ? null : row.note, ts: row.ts,
    chequeNo: row.chequeId != null ? null : null, bankName: null,
  );
}

/// THE payables subledger identity — at-or-before an instant
/// (inclusive): the journal's `payables` under one supplier's ref.
double accountBalanceOfPayablesRef(List<JournalEntry> journal, String ref, [String? atTs]) =>
    refNormalBalance(journal, 'payables', ref, atTs);

/// A customer's outstanding FROM THE JOURNAL at-or-before an
/// instant (the web's customerOutstanding(entries, customerId)).
double customerOutstandingFor(List<JournalEntry> journal, String customerId, {String? atTs}) =>
    refNormalBalance(journal, 'receivables', customerId, atTs);
