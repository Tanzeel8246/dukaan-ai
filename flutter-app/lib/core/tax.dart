/// Dukaan AI — tax engine (Dart port of web/lib/tax.ts, Phase A · A4).
///
/// Pure computation only: slab resolution, per-line tax on the
/// post-discount base, purchase input tax, return tax shares. The
/// invariants: tax is computed PER LINE on the post-discount base and
/// the bill tax is the SUM of line taxes; tax never enters revenue,
/// COGS or the P&L; returns reverse tax with the same cumulative
/// discipline, to the paisa; with no slab resolved anywhere, every
/// function returns zeros and callers' arithmetic collapses to the
/// exact pre-A4 figures.
import 'ledger.dart' show roundPaisa, accountNormalBalance;
import 'types.dart';

/// Round to the paisa (2 dp) — the only rounding the tax engine does.
double round2(double n) => roundPaisa(n);

/// Resolve the slab for one line: a tax-exempt product is never
/// taxed; an explicit product slab wins when active and applicable;
/// otherwise the shop default for the direction; otherwise no tax.
TaxSlab? resolveTaxSlab(Product? product, List<TaxSlab> slabs,
    {String? defaultSalesTaxSlabId, String? defaultPurchaseTaxSlabId, required String direction}) {
  if (product?.taxExempt ?? false) return null;
  bool applies(TaxSlab s) => s.active && (s.appliesTo == direction || s.appliesTo == 'both');
  if (product?.taxSlabId != null) {
    for (final s in slabs) {
      if (s.id == product!.taxSlabId && applies(s)) return s;
    }
  }
  final defaultId = direction == 'sales' ? defaultSalesTaxSlabId : defaultPurchaseTaxSlabId;
  if (defaultId != null) {
    for (final s in slabs) {
      if (s.id == defaultId && applies(s)) return s;
    }
  }
  return null;
}

/// Spread a bill-level amount across line gross totals, pro-rata,
/// using cumulative rounding — the shares sum EXACTLY to `amount`
/// (the F-3 discipline).
List<double> allocateProRata(List<double> lineTotals, double amount) {
  final total = lineTotals.fold(0.0, (a, n) => a + n);
  if (total <= 0 || amount == 0) return lineTotals.map((_) => 0.0).toList();
  final out = <double>[];
  var cumGross = 0.0;
  var cumAllocated = 0.0;
  for (final t in lineTotals) {
    cumGross += t;
    final cum = round2((amount * cumGross) / total);
    out.add(round2(cum - cumAllocated));
    cumAllocated = cum;
  }
  return out;
}

/// Tax for ONE line on its post-discount base.
double lineTaxAmount(double base, double qty, TaxSlab slab) {
  if (slab.kind == 'fixed') return round2(slab.rate * qty);
  if (slab.inclusive) {
    if (slab.rate <= -100) return 0;
    return round2(base - base / (1 + slab.rate / 100));
  }
  return round2((base * slab.rate) / 100);
}

class TaxedLine {
  final double discountShare;
  final double base;
  final double taxAmount;
  final TaxSlab? slab;
  const TaxedLine({required this.discountShare, required this.base, required this.taxAmount, this.slab});
}

class BillTaxResult {
  final List<TaxedLine> lines;
  final double subtotal;
  final double taxAmount;
  final double exclusiveTax;
  final double inclusiveTax;
  final double total; // subtotal − discount + exclusive tax
  const BillTaxResult({required this.lines, required this.subtotal, required this.taxAmount,
    required this.exclusiveTax, required this.inclusiveTax, required this.total});
}

/// Full tax computation for a bill (design §2.3).
BillTaxResult computeBillTaxes(List<({double total, double qty, TaxSlab? slab})> lines, double discountAmount) {
  final subtotal = lines.fold(0.0, (a, l) => a + l.total);
  final shares = allocateProRata(lines.map((l) => l.total).toList(), discountAmount);
  var exclusiveTax = 0.0;
  var inclusiveTax = 0.0;
  final out = <TaxedLine>[];
  for (var i = 0; i < lines.length; i++) {
    final l = lines[i];
    final discountShare = i < shares.length ? shares[i] : 0.0;
    final base = round2(l.total - discountShare);
    final taxAmount = l.slab != null ? lineTaxAmount(base, l.qty, l.slab!) : 0.0;
    if (l.slab != null) {
      if (l.slab!.inclusive) {
        inclusiveTax += taxAmount;
      } else {
        exclusiveTax += taxAmount;
      }
    }
    out.add(TaxedLine(discountShare: discountShare, base: base, taxAmount: taxAmount, slab: l.slab));
  }
  exclusiveTax = round2(exclusiveTax);
  inclusiveTax = round2(inclusiveTax);
  return BillTaxResult(
    lines: out, subtotal: subtotal, taxAmount: round2(exclusiveTax + inclusiveTax),
    exclusiveTax: exclusiveTax, inclusiveTax: inclusiveTax,
    total: round2(subtotal - discountAmount + exclusiveTax),
  );
}

class PurchaseTaxResult {
  final List<TaxedLine> lines;
  final double netTotal; // goods value net of tax
  final double taxAmount;
  final double grossTotal; // netTotal + taxAmount — owed to the supplier
  const PurchaseTaxResult({required this.lines, required this.netTotal, required this.taxAmount, required this.grossTotal});
}

/// Tax computation for a purchase (design §2.4): no discount; the
/// supplier is owed the GROSS, stock enters at the NET.
PurchaseTaxResult computePurchaseTaxes(List<({double total, double qty, TaxSlab? slab})> lines) {
  var netTotal = 0.0;
  var taxAmount = 0.0;
  final out = <TaxedLine>[];
  for (final l in lines) {
    final tax = l.slab != null ? lineTaxAmount(l.total, l.qty, l.slab!) : 0.0;
    final net = (l.slab?.inclusive ?? false) ? round2(l.total - tax) : l.total;
    netTotal += net;
    taxAmount += tax;
    out.add(TaxedLine(discountShare: 0, base: net, taxAmount: tax, slab: l.slab));
  }
  netTotal = round2(netTotal);
  taxAmount = round2(taxAmount);
  return PurchaseTaxResult(lines: out, netTotal: netTotal, taxAmount: taxAmount, grossTotal: round2(netTotal + taxAmount));
}

class ReturnTaxShares {
  final double taxShare;
  final double exclusiveTaxShare;
  final double inclusiveTaxShare;
  final Map<String, double> perLine;
  const ReturnTaxShares({required this.taxShare, required this.exclusiveTaxShare,
    required this.inclusiveTaxShare, required this.perLine});
}

/// Tax reversed by returning `retItems` from `bill` (design §2.4):
/// per line, the cumulative share of THAT line's snapshotted tax,
/// minus what prior returns already reversed; the completing return
/// of a line absorbs its paisa residual.
ReturnTaxShares returnTaxShares(Bill bill, List<SaleReturn> priorReturns, List<BillItem> retItems) {
  final perLine = <String, double>{};
  var exclusiveTaxShare = 0.0;
  var inclusiveTaxShare = 0.0;
  for (final it in retItems) {
    BillItem? src;
    for (final x in bill.items) {
      if (x.productId == it.productId) src = x;
    }
    final lineTax = src?.taxAmount ?? 0;
    if (src == null || lineTax <= 0 || src.total <= 0) {
      perLine[it.productId] = 0;
      continue;
    }
    var priorGross = 0.0;
    var alreadyTax = 0.0;
    for (final r in priorReturns) {
      for (final ri in r.items) {
        if (ri.productId != it.productId) continue;
        priorGross += ri.total;
        alreadyTax += ri.taxAmount;
      }
    }
    final cumGross = priorGross + it.total;
    final cumTax = cumGross >= src.total - 1e-9 ? lineTax : round2((lineTax * cumGross) / src.total);
    var share = round2(cumTax - alreadyTax);
    if (share < 0) share = 0;
    final remaining = round2(lineTax - alreadyTax);
    if (share > (remaining > 0 ? remaining : 0)) share = remaining > 0 ? remaining : 0;
    perLine[it.productId] = share;
    if (src.taxInclusive) {
      inclusiveTaxShare += share;
    } else {
      exclusiveTaxShare += share;
    }
  }
  exclusiveTaxShare = round2(exclusiveTaxShare);
  inclusiveTaxShare = round2(inclusiveTaxShare);
  return ReturnTaxShares(
    taxShare: round2(exclusiveTaxShare + inclusiveTaxShare),
    exclusiveTaxShare: exclusiveTaxShare,
    inclusiveTaxShare: inclusiveTaxShare,
    perLine: perLine,
  );
}

class PurchaseReturnTaxShares {
  final double taxShare;
  final Map<String, double> perLine;
  const PurchaseReturnTaxShares({required this.taxShare, required this.perLine});
}

/// Input tax reversed by returning `retItems` from `purchase`
/// (Phase B · B4, §3.2) — the exact analogue of [returnTaxShares]
/// on the purchase side: per line, the cumulative share of THAT
/// line's snapshotted tax minus what prior purchase returns
/// already reversed; the completing return absorbs the residual.
PurchaseReturnTaxShares purchaseReturnTaxShares(
    Purchase purchase, List<PurchaseReturn> priorReturns, List<PurchaseItem> retItems) {
  final perLine = <String, double>{};
  var taxShare = 0.0;
  for (final it in retItems) {
    PurchaseItem? src;
    for (final x in purchase.items) {
      if (x.productId == it.productId) src = x;
    }
    final lineTax = src?.taxAmount ?? 0;
    if (src == null || lineTax <= 0 || src.total <= 0) {
      perLine[it.productId] = 0;
      continue;
    }
    var priorTotal = 0.0;
    var alreadyTax = 0.0;
    for (final r in priorReturns) {
      for (final ri in r.items) {
        if (ri.productId != it.productId) continue;
        priorTotal += ri.total;
        alreadyTax += ri.taxAmount;
      }
    }
    final cumTotal = priorTotal + it.total;
    final cumTax = cumTotal >= src.total - 1e-9 ? lineTax : round2((lineTax * cumTotal) / src.total);
    var share = round2(cumTax - alreadyTax);
    if (share < 0) share = 0;
    final remaining = round2(lineTax - alreadyTax);
    final cap = remaining > 0 ? remaining : 0.0;
    if (share > cap) share = cap;
    perLine[it.productId] = share;
    taxShare += share;
  }
  return PurchaseReturnTaxShares(taxShare: round2(taxShare), perLine: perLine);
}

class BillTaxLine {
  final String name;
  final double rate;
  final String kind; // "percent" | "fixed"
  final bool inclusive;
  double amount;
  BillTaxLine({required this.name, required this.rate, required this.kind, required this.inclusive, this.amount = 0});
}

/// Receipt/print tax lines for a set of stamped lines (§2.3): one
/// entry per slab used, amounts summed from the line snapshots —
/// a print after the slab was renamed/deleted still shows the tax
/// as charged. Used by receipts and note prints alike.
List<BillTaxLine> taxLinesForItems(List<({double taxAmount, String? taxSlabId, String? taxSlabName, double taxRate, String taxKind, bool taxInclusive})> items) {
  final groups = <String, BillTaxLine>{};
  for (final it in items) {
    final amt = it.taxAmount;
    if (amt <= 0) continue;
    final key = '${it.taxSlabId ?? it.taxSlabName ?? '?'}|${it.taxInclusive ? 'in' : 'ex'}';
    final g = groups.putIfAbsent(key, () => BillTaxLine(
          name: it.taxSlabName ?? 'Tax', rate: it.taxRate, kind: it.taxKind, inclusive: it.taxInclusive));
    g.amount = round2(g.amount + amt);
  }
  return groups.values.toList();
}

/// Receipt tax lines for a posted bill — [taxLinesForItems] over
/// the bill's stamped lines.
List<BillTaxLine> billTaxLines(Bill bill) => taxLinesForItems([
      for (final it in bill.items)
        (taxAmount: it.taxAmount, taxSlabId: it.taxSlabId, taxSlabName: it.taxSlabName,
            taxRate: it.taxRate, taxKind: it.taxKind, taxInclusive: it.taxInclusive),
    ]);

/* ---------------- Finance tax position ---------------- */

class TaxPosition {
  final double outputTax;
  final double inputTax;
  final double netPayable; // output − input (may be negative)
  final double outputThisMonth;
  final double inputThisMonth;
  const TaxPosition({required this.outputTax, required this.inputTax, required this.netPayable,
    required this.outputThisMonth, required this.inputThisMonth});
}

bool _sameMonth(String ts, DateTime ref) {
  final d = DateTime.tryParse(ts)?.toLocal();
  if (d == null) return false;
  return d.year == ref.year && d.month == ref.month;
}

/// The shop's tax position, derived from journal lines only —
/// balances of the two tax accounts plus the current month's
/// movements (design §2.4).
TaxPosition taxPosition(List<JournalEntry> entries, [DateTime? ref]) {
  final r = ref ?? DateTime.now();
  final outputTax = accountNormalBalance(entries, 'tax_payable');
  final inputTax = accountNormalBalance(entries, 'tax_input');
  var outputThisMonth = 0.0;
  var inputThisMonth = 0.0;
  for (final e in entries) {
    if (!_sameMonth(e.ts, r)) continue;
    for (final l in e.lines) {
      if (l.account == 'tax_payable') outputThisMonth += l.credit - l.debit;
      if (l.account == 'tax_input') inputThisMonth += l.debit - l.credit;
    }
  }
  return TaxPosition(
    outputTax: round2(outputTax),
    inputTax: round2(inputTax),
    netPayable: round2(outputTax - inputTax),
    outputThisMonth: round2(outputThisMonth),
    inputThisMonth: round2(inputThisMonth),
  );
}
