/// Dukaan AI — report builders (Dart port of web/lib/reports.ts).
///
/// Every figure here is DERIVED from the journal and the operating
/// rows — the reports are views over the same derivations the
/// screens use, so a report can never disagree with its screen.
/// The identity the whole file exists to keep:
///
///   P&L net revenue  ==  sales-report net sales + other revenue
///
/// held in the sales builder itself (`plNetRevenue`).
import 'cheques.dart' show chequesAtBank, chequesInDrawer, pendingOutCheques;
import 'coa.dart' show accountCodes, normalBalanceSign;
import 'ledger.dart';
import 'periods.dart'
    show addDaysISO, fiscalYearRange, isValidDateISO, startOfDayPktInstant, todayPktISO;
import 'selectors.dart' as sel;
import 'tax.dart'
    show allocateProRata, computeBillTaxes, resolveTaxSlab, round2, taxLinesForItems, BillTaxLine;
import 'types.dart';

/* ---------------- ranges ---------------- */

class ReportRange {
  final String fromDate; // YYYY-MM-DD (PKT)
  final String toDate; // YYYY-MM-DD (PKT)
  final String fromTs;
  final String toTs;
  const ReportRange({required this.fromDate, required this.toDate, required this.fromTs, required this.toTs});
}

ReportRange _rangeOfDates(String fromDate, String toDate) => ReportRange(
      fromDate: fromDate,
      toDate: toDate,
      fromTs: startOfDayPktInstant(fromDate),
      toTs: startOfDayPktInstant(addDaysISO(toDate, 1)),
    );

/// Resolve a preset (or a custom pair) to a concrete range. "This
/// week" starts on Monday; "This month" is the PKT calendar month;
/// "This fiscal year" is [currentFiscalYear]. A reversed or invalid
/// custom pair falls back rather than emptying the report.
ReportRange resolveReportRange(String preset,
    {({String from, String to})? custom, ShopSettingsView? settings, DateTime? now}) {
  final n = now ?? DateTime.now();
  final today = todayPktISO(n);
  switch (preset) {
    case 'week':
      {
        final parts = today.split('-').map(int.parse).toList();
        final dow = DateTime.utc(parts[0], parts[1], parts[2]).weekday % 7; // 0 = Sunday
        final from = addDaysISO(today, -((dow + 6) % 7)); // back to Monday
        return _rangeOfDates(from, addDaysISO(from, 6));
      }
    case 'month':
      {
        final first = '${today.substring(0, 8)}01';
        final y = int.parse(today.substring(0, 4));
        final m = int.parse(today.substring(5, 7));
        final nextFirst = m == 12
            ? '${y + 1}-01-01'
            : '$y-${(m + 1) < 10 ? '0' : ''}${m + 1}-01';
        return _rangeOfDates(first, addDaysISO(nextFirst, -1));
      }
    case 'fiscal':
      {
        final fy = fiscalYearRange(settings, n.toUtc().toIso8601String());
        return _rangeOfDates(fy.startDate, fy.endDate);
      }
    case 'custom':
      {
        final from = (custom != null && isValidDateISO(custom.from)) ? custom.from : today;
        final to = (custom != null && isValidDateISO(custom.to)) ? custom.to : from;
        return from.compareTo(to) <= 0 ? _rangeOfDates(from, to) : _rangeOfDates(to, from);
      }
    default: // "today"
      return _rangeOfDates(today, today);
  }
}

/// Does an ISO instant fall inside the range?
bool inRange(String ts, ReportRange range) =>
    ts.compareTo(range.fromTs) >= 0 && ts.compareTo(range.toTs) < 0;

/* ---------------- 1 · sales ---------------- */

class SalesReportProductRow {
  final String productId;
  final String name;
  double qty;
  double amount;
  double profit;
  SalesReportProductRow(this.productId, this.name, {this.qty = 0, this.amount = 0, this.profit = 0});
}

class SalesReportCustomerRow {
  final String key;
  String name;
  double qty;
  double amount;
  SalesReportCustomerRow(this.key, this.name, {this.qty = 0, this.amount = 0});
}

class SalesReport {
  final List<Sale> rows;
  final double grossSales;
  final double returnsTotal; // negative or 0
  final double revenue;
  final double discounts;
  final double netSales;
  final double otherRevenue;
  final double plNetRevenue;
  final double netUnits;
  final double grossProfit;
  final List<SalesReportProductRow> byProduct;
  final List<SalesReportCustomerRow> byCustomer;
  const SalesReport({required this.rows, required this.grossSales, required this.returnsTotal,
    required this.revenue, required this.discounts, required this.netSales, required this.otherRevenue,
    required this.plNetRevenue, required this.netUnits, required this.grossProfit,
    required this.byProduct, required this.byCustomer});
}

/// The sales report (web salesReport). ctx mirrors the web's
/// SalesReportContext: returns documents, journal (for the
/// otherRevenue reconciliation), tax slabs + settings (counter-row
/// netting mirror).
SalesReport salesReport(List<Sale> sales, List<Product> products, List<Bill> bills,
    ReportRange range,
    {List<SaleReturn>? returns, List<JournalEntry>? journal,
    List<TaxSlab>? taxSlabs, ShopSettingsView? settings}) {
  final rows = sales.where((s) => inRange(s.ts, range)).toList()
    ..sort((a, b) => a.ts.compareTo(b.ts));
  final costOf = <String, double>{for (final p in products) p.id: p.costPrice};
  final nameOf = <String, String>{for (final p in products) p.id: p.name};
  final prodById = <String, Product>{for (final p in products) p.id: p};
  final billById = <String, Bill>{for (final b in bills) b.id: b};

  /* ---- per-row NET amounts (the journal view of each row) ---- */
  final netOfRow = <String, double>{};
  final inclOfRow = <String, double>{};

  // Bill rows: net off the bill's discount + inclusive tax.
  final billRows = <String, List<Sale>>{};
  for (final s in rows) {
    if (s.kind == 'return' || s.billId == null) continue;
    billRows.putIfAbsent(s.billId!, () => []).add(s);
  }
  for (final e in billRows.entries) {
    final bill = billById[e.key];
    final list = e.value;
    if (bill == null) {
      for (final s in list) {
        netOfRow[s.id] = s.total;
      }
      continue;
    }
    final paidTotal = bill.payments.fold(0.0, (a, p) => a + p.amount);
    // F-2: the desk books (bill.total − paid) to sales_discount too.
    final discountNet = bill.discountAmount + (bill.total - paidTotal);
    final inclTax = round2(bill.items
        .fold(0.0, (a, it) => a + (it.taxInclusive ? it.taxAmount : 0.0)));
    final totals = list.map((s) => s.total).toList();
    final dShares = allocateProRata(totals, discountNet);
    final tShares = allocateProRata(totals, inclTax);
    for (var i = 0; i < list.length; i++) {
      final s = list[i];
      netOfRow[s.id] = round2(s.total - (i < dShares.length ? dShares[i] : 0.0) - (i < tShares.length ? tShares[i] : 0.0));
      inclOfRow[s.id] = i < tShares.length ? tShares[i] : 0.0;
    }
  }

  // Counter rows (and rows whose bill is gone): net of inclusive
  // tax when the tax context is available — the recordSale mirror.
  for (final s in rows) {
    if (s.kind == 'return' || netOfRow.containsKey(s.id)) continue;
    var net = s.total;
    var incl = 0.0;
    if (taxSlabs != null && settings != null) {
      final product = prodById[s.productId];
      final slab = resolveTaxSlab(product, taxSlabs,
          defaultSalesTaxSlabId: settings.defaultSalesTaxSlabId,
          defaultPurchaseTaxSlabId: settings.defaultPurchaseTaxSlabId,
          direction: 'sales');
      if (slab != null) {
        incl = computeBillTaxes([(total: s.total, qty: s.qty, slab: slab)], 0).inclusiveTax;
        if (incl > 0) {
          net = round2(s.total - incl);
        } else {
          incl = 0;
        }
      }
    }
    netOfRow[s.id] = net;
    inclOfRow[s.id] = incl;
  }

  /* ---- returns: the net reversal each return document proves ---- */
  final returnNets = <({String billId, double revenueReversal, double netReversal, Map<String, double> perProduct})>[];
  for (final r in returns ?? const <SaleReturn>[]) {
    if (!inRange(r.ts, range)) continue;
    final gross = r.items.fold(0.0, (a, i) => a + i.total);
    final inclTax = round2(r.items.fold(0.0, (a, i) => a + (i.taxInclusive ? i.taxAmount : 0.0)));
    final exclTax = round2(r.items.fold(0.0, (a, i) => a + (i.taxInclusive ? 0.0 : i.taxAmount)));
    // The F-3/A4 identity the return was composed with.
    final discountShare = round2(gross - (r.refundAmount + r.creditReduction) + exclTax);
    final dShares = allocateProRata(r.items.map((i) => i.total).toList(), discountShare);
    final perProduct = <String, double>{};
    for (var i = 0; i < r.items.length; i++) {
      final it = r.items[i];
      final inclItem = it.taxInclusive ? it.taxAmount : 0.0;
      final net = -round2(it.total - inclItem - (i < dShares.length ? dShares[i] : 0.0));
      perProduct[it.productId] = (perProduct[it.productId] ?? 0) + net;
    }
    final revenueReversal = round2(gross - inclTax);
    returnNets.add((
      billId: r.billId,
      revenueReversal: revenueReversal,
      netReversal: round2(revenueReversal - discountShare),
      perProduct: perProduct,
    ));
  }
  final hasReturnDocs = (returns?.length ?? 0) > 0;

  /* ---- aggregates ---- */
  var grossSales = 0.0;
  var returnsTotal = 0.0;
  var netUnits = 0.0;
  var totalCogs = 0.0;
  var revenue = 0.0;
  var netted = 0.0;
  final prodMap = <String, SalesReportProductRow>{};
  final prodCogs = <String, double>{};
  final custMap = <String, SalesReportCustomerRow>{};
  String custKeyOf(Bill? bill) => bill != null
      ? (bill.customerId ?? 'name:${bill.customerName.trim().toLowerCase()}|${bill.customerPhone.trim()}')
      : 'walk-in';

  for (final s in rows) {
    if (s.kind == 'return') {
      returnsTotal += s.total;
    } else {
      grossSales += s.total;
    }
    netUnits += s.qty;
    final cost = s.unitCost ?? costOf[s.productId] ?? 0.0;
    final lineCogs = cost * s.qty;
    totalCogs += lineCogs;
    prodCogs[s.productId] = (prodCogs[s.productId] ?? 0.0) + lineCogs;
    if (s.kind != 'return') {
      revenue += s.total - (inclOfRow[s.id] ?? 0);
      netted += netOfRow[s.id] ?? s.total;
    } else if (!hasReturnDocs) {
      revenue += s.total; // legacy: gross row netting
      netted += s.total;
    }

    final pr = prodMap.putIfAbsent(
        s.productId,
        () => SalesReportProductRow(
            s.productId, nameOf[s.productId] ?? s.productId));
    pr.qty += s.qty;
    if (s.kind != 'return') {
      pr.amount += netOfRow[s.id] ?? s.total;
    } else if (!hasReturnDocs) {
      pr.amount += s.total;
    }

    final bill = s.billId != null ? billById[s.billId] : null;
    final key = custKeyOf(bill);
    final cu = custMap.putIfAbsent(
        key, () => SalesReportCustomerRow(key, bill?.customerName ?? ''));
    cu.qty += s.qty;
    if (s.kind != 'return') {
      cu.amount += netOfRow[s.id] ?? s.total;
    } else if (!hasReturnDocs) {
      cu.amount += s.total;
    }
    if (bill != null && bill.customerName.isNotEmpty) cu.name = bill.customerName;
  }

  // Fold the return documents' net reversals into the breakdowns.
  for (final rn in returnNets) {
    revenue -= rn.revenueReversal;
    netted -= rn.netReversal;
    final bill = billById[rn.billId];
    final key = custKeyOf(bill);
    final cu = custMap.putIfAbsent(
        key, () => SalesReportCustomerRow(key, bill?.customerName ?? ''));
    rn.perProduct.forEach((pid, net) {
      final pr = prodMap.putIfAbsent(
          pid, () => SalesReportProductRow(pid, nameOf[pid] ?? pid));
      pr.amount += net;
      cu.amount += net;
    });
  }

  // Discounts are DERIVED as revenue − net: in the full-context
  // path this equals the journal's `sales_discount` balance exactly.
  final revenueR = round2(revenue);
  final netSales = round2(netted);
  final discounts = round2(revenueR - netSales);
  final grossProfit = round2(netSales - totalCogs);
  for (final entry in prodMap.entries) {
    entry.value.profit = round2(entry.value.amount - (prodCogs[entry.key] ?? 0.0));
  }
  final pl = journal != null ? profitAndLossInRange(journal, range.fromTs, range.toTs) : null;
  final otherRevenue = pl != null ? round2(pl.netRevenue - netSales) : 0.0;

  final byProduct = prodMap.values.toList()..sort((a, b) => b.amount.compareTo(a.amount));
  final byCustomer = custMap.values.toList()..sort((a, b) => b.amount.compareTo(a.amount));
  return SalesReport(
    rows: rows, grossSales: grossSales, returnsTotal: returnsTotal,
    revenue: revenueR, discounts: discounts, netSales: netSales,
    otherRevenue: otherRevenue, plNetRevenue: round2(netSales + otherRevenue),
    netUnits: netUnits, grossProfit: grossProfit,
    byProduct: byProduct, byCustomer: byCustomer,
  );
}

/* ---------------- 2 · purchases ---------------- */

class PurchaseReportSupplierRow {
  final String supplierId;
  final String name;
  double gross;
  double returns;
  double net;
  PurchaseReportSupplierRow(this.supplierId, this.name, {this.gross = 0, this.returns = 0, this.net = 0});
}

class PurchaseReportProductRow {
  final String productId;
  final String name;
  double qty;
  double amount;
  PurchaseReportProductRow(this.productId, this.name, {this.qty = 0, this.amount = 0});
}

class PurchaseReport {
  final List<Purchase> rows;
  final double gross;
  final double goodsNet;
  final double taxTotal;
  final double returnsGross;
  final double net;
  final List<PurchaseReportSupplierRow> bySupplier;
  final List<PurchaseReportProductRow> byProduct;
  const PurchaseReport({required this.rows, required this.gross, required this.goodsNet,
    required this.taxTotal, required this.returnsGross, required this.net,
    required this.bySupplier, required this.byProduct});
}

PurchaseReport purchaseReport(List<Purchase> purchases, List<PurchaseReturn> purchaseReturns,
    List<Supplier> suppliers, ReportRange range) {
  final rows = purchases.where((p) => inRange(p.ts, range)).toList()
    ..sort((a, b) => a.ts.compareTo(b.ts));
  final rets = purchaseReturns.where((r) => inRange(r.ts, range)).toList();
  final nameOf = <String, String>{for (final s in suppliers) s.id: s.name};

  var gross = 0.0;
  var goodsNet = 0.0;
  var taxTotal = 0.0;
  final supMap = <String, PurchaseReportSupplierRow>{};
  final prodMap = <String, PurchaseReportProductRow>{};

  for (final p in rows) {
    gross += p.total;
    goodsNet += p.netTotal ?? p.total - p.taxAmount;
    taxTotal += p.taxAmount;
    final su = supMap.putIfAbsent(p.supplierId,
        () => PurchaseReportSupplierRow(p.supplierId, nameOf[p.supplierId] ?? p.supplierId));
    su.gross += p.total;
    for (final it in p.items) {
      final pr = prodMap.putIfAbsent(
          it.productId, () => PurchaseReportProductRow(it.productId, it.name));
      pr.qty += it.qty;
      pr.amount += it.total;
    }
  }
  var returnsGross = 0.0;
  for (final r in rets) {
    final g = purchaseReturnGross(r);
    returnsGross += g;
    final su = supMap.putIfAbsent(r.supplierId,
        () => PurchaseReportSupplierRow(r.supplierId, nameOf[r.supplierId] ?? r.supplierId));
    su.returns += g;
  }
  for (final su in supMap.values) {
    su.net = su.gross - su.returns;
  }
  final bySupplier = supMap.values.toList()..sort((a, b) => b.gross.compareTo(a.gross));
  final byProduct = prodMap.values.toList()..sort((a, b) => b.amount.compareTo(a.amount));
  return PurchaseReport(rows: rows, gross: gross, goodsNet: goodsNet, taxTotal: taxTotal,
      returnsGross: returnsGross, net: gross - returnsGross,
      bySupplier: bySupplier, byProduct: byProduct);
}

/* ---------------- 3 · stock (snapshot — range-free) ---------------- */

class StockReport {
  final List<({Product product, double value})> rows;
  final double totalValue;
  final double retailValue;
  final List<Product> low;
  final List<Product> expiring;
  const StockReport({required this.rows, required this.totalValue, required this.retailValue,
    required this.low, required this.expiring});
}

StockReport stockReport(List<Product> products, [DateTime? now]) {
  final sorted = [...products]..sort((a, b) => a.name.compareTo(b.name));
  return StockReport(
    rows: [for (final p in sorted) (product: p, value: p.stockQty * p.costPrice)],
    totalValue: sel.stockValue(products),
    retailValue: sel.stockValueRetail(products),
    low: sel.lowStockProducts(products),
    expiring: sel.expiringProducts(products, now: now),
  );
}

/* ---------------- 4 · profit & loss ---------------- */

/// The Finance screen's own computation over the report range.
MonthPL plReport(List<JournalEntry> journal, ReportRange range) =>
    profitAndLossInRange(journal, range.fromTs, range.toTs);

/* ---------------- 4b · trial balance ---------------- */

class TrialBalanceRow {
  final String account;
  final double debitTotal;
  final double creditTotal;
  final double closing; // signed on the account's NORMAL side
  final String closingSide; // "debit" | "credit"
  const TrialBalanceRow({required this.account, required this.debitTotal,
    required this.creditTotal, required this.closing, required this.closingSide});
}

class TrialBalanceReport {
  final List<TrialBalanceRow> rows;
  final double totalDebits;
  final double totalCredits;
  final double difference;
  final double closingDebits;
  final double closingCredits;
  final double closingDifference;
  final bool balanced;
  const TrialBalanceReport({required this.rows, required this.totalDebits,
    required this.totalCredits, required this.difference, required this.closingDebits,
    required this.closingCredits, required this.closingDifference, required this.balanced});
}

TrialBalanceReport trialBalanceReport(List<JournalEntry> journal, ReportRange range) {
  final inPeriod = journal.where((e) => inRange(e.ts, range)).toList();
  final upToEnd = journal.where((e) => e.ts.compareTo(range.toTs) < 0).toList();
  final rows = <TrialBalanceRow>[];
  var totalDebits = 0.0;
  var totalCredits = 0.0;
  var closingDebits = 0.0;
  var closingCredits = 0.0;
  for (final code in accountCodes) {
    var dr = 0.0;
    var cr = 0.0;
    for (final e in inPeriod) {
      for (final l in e.lines) {
        if (l.account != code) continue;
        dr += l.debit;
        cr += l.credit;
      }
    }
    final closing = accountNormalBalance(upToEnd, code);
    if (dr == 0 && cr == 0 && closing == 0) continue;
    final raw = closing * normalBalanceSign(code); // back to Dr−Cr terms
    rows.add(TrialBalanceRow(
      account: code, debitTotal: round2(dr), creditTotal: round2(cr),
      closing: closing, closingSide: raw >= 0 ? 'debit' : 'credit',
    ));
    totalDebits += dr;
    totalCredits += cr;
    if (raw >= 0) {
      closingDebits += raw;
    } else {
      closingCredits += -raw;
    }
  }
  final difference = round2(totalDebits - totalCredits);
  final closingDifference = round2(closingDebits - closingCredits);
  return TrialBalanceReport(
    rows: rows, totalDebits: round2(totalDebits), totalCredits: round2(totalCredits),
    difference: difference, closingDebits: round2(closingDebits),
    closingCredits: round2(closingCredits), closingDifference: closingDifference,
    balanced: difference == 0 && closingDifference == 0,
  );
}

/* ---------------- 5 · cash book / account statement ---------------- */

class AccountStatementRow {
  final String entryId;
  final String ts;
  final String memo;
  final String? bucket; // combined-book rows only
  final double inAmount;
  final double outAmount;
  final double balance;
  const AccountStatementRow({required this.entryId, required this.ts, required this.memo,
    required this.bucket, required this.inAmount, required this.outAmount, required this.balance});
}

class AccountStatement {
  final double? opening; // null for the combined cash book
  final double? closing;
  final double totalIn;
  final double totalOut;
  final List<AccountStatementRow> rows;
  const AccountStatement({required this.opening, required this.closing, required this.totalIn,
    required this.totalOut, required this.rows});
}

AccountStatement accountStatement(List<JournalEntry> journal, List<MoneyAccount> accounts,
    String? accountId, ReportRange range) {
  if (accountId != null) {
    MoneyAccount? account;
    for (final a in accounts) {
      if (a.id == accountId) account = a;
    }
    if (account != null) {
      final book = accountBook(journal, account);
      var opening = 0.0;
      for (final r in book) {
        if (r.ts.compareTo(range.fromTs) < 0) {
          opening = r.balance;
        } else {
          break;
        }
      }
      final rows = book.where((r) => inRange(r.ts, range)).toList();
      return AccountStatement(
        opening: opening,
        closing: rows.isNotEmpty ? rows.last.balance : opening,
        totalIn: rows.fold(0.0, (a, r) => a + r.inAmount),
        totalOut: rows.fold(0.0, (a, r) => a + r.outAmount),
        rows: [
          for (final r in rows)
            AccountStatementRow(entryId: r.entryId, ts: r.ts, memo: r.memo, bucket: null,
                inAmount: r.inAmount, outAmount: r.outAmount, balance: r.balance)
        ],
      );
    }
  }
  final book = cashBook(journal);
  final rows = book.where((r) => inRange(r.ts, range)).toList();
  return AccountStatement(
    opening: null, closing: null,
    totalIn: rows.fold(0.0, (a, r) => a + r.inAmount),
    totalOut: rows.fold(0.0, (a, r) => a + r.outAmount),
    rows: [
      for (final r in rows)
        AccountStatementRow(entryId: r.entryId, ts: r.ts, memo: r.memo, bucket: r.account,
            inAmount: r.inAmount, outAmount: r.outAmount, balance: r.balance)
    ],
  );
}

/* ---------------- 6 · tax ---------------- */

class TaxReportRow {
  final String name;
  final double rate;
  final String kind;
  final bool inclusive;
  final double amount; // the seed group's own amount (web keeps 0)
  double output;
  double input;
  TaxReportRow({required this.name, required this.rate, required this.kind,
    required this.inclusive, required this.amount, this.output = 0, this.input = 0});
}

class TaxReport {
  final List<TaxReportRow> rows;
  final double outputTotal;
  final double inputTotal;
  final double net;
  const TaxReport({required this.rows, required this.outputTotal, required this.inputTotal, required this.net});
}

String _slabKey(BillTaxLine g) => '${g.name}|${g.rate}|${g.kind}|${g.inclusive ? 'in' : 'ex'}';

/// Per-slab tax for the period. Groups come from [taxLinesForItems]
/// applied to the period's posted bills minus its sale returns
/// (output) and the period's purchases minus its purchase returns
/// (input). The TOTALS equal the journal's tax movement.
TaxReport taxReport(List<Bill> bills, List<SaleReturn> returns, List<Purchase> purchases,
    List<PurchaseReturn> purchaseReturns, ReportRange range) {
  final map = <String, TaxReportRow>{};
  void merge(List<BillTaxLine> groups, String side, double sign) {
    for (final g in groups) {
      final key = _slabKey(g);
      final row = map.putIfAbsent(
          key,
          () => TaxReportRow(name: g.name, rate: g.rate, kind: g.kind,
              inclusive: g.inclusive, amount: 0));
      if (side == 'output') {
        row.output += sign * g.amount;
      } else {
        row.input += sign * g.amount;
      }
    }
  }

  final postedBills = bills
      .where((b) => inRange(b.ts, range) && b.status != 'held' && b.status != 'voided')
      .toList();
  merge(taxLinesForItems([
    for (final b in postedBills)
      for (final it in b.items)
        (taxAmount: it.taxAmount, taxSlabId: it.taxSlabId, taxSlabName: it.taxSlabName,
            taxRate: it.taxRate, taxKind: it.taxKind, taxInclusive: it.taxInclusive)
  ]), 'output', 1);
  final rets = returns.where((r) => inRange(r.ts, range)).toList();
  merge(taxLinesForItems([
    for (final r in rets)
      for (final it in r.items)
        (taxAmount: it.taxAmount, taxSlabId: it.taxSlabId, taxSlabName: it.taxSlabName,
            taxRate: it.taxRate, taxKind: it.taxKind, taxInclusive: it.taxInclusive)
  ]), 'output', -1);
  final purs = purchases.where((p) => inRange(p.ts, range)).toList();
  merge(taxLinesForItems([
    for (final p in purs)
      for (final it in p.items)
        (taxAmount: it.taxAmount, taxSlabId: it.taxSlabId, taxSlabName: it.taxSlabName,
            taxRate: it.taxRate, taxKind: it.taxKind, taxInclusive: it.taxInclusive)
  ]), 'input', 1);
  final prets = purchaseReturns.where((r) => inRange(r.ts, range)).toList();
  merge(taxLinesForItems([
    for (final r in prets)
      for (final it in r.items)
        (taxAmount: it.taxAmount, taxSlabId: it.taxSlabId, taxSlabName: it.taxSlabName,
            taxRate: it.taxRate, taxKind: it.taxKind, taxInclusive: it.taxInclusive)
  ]), 'input', -1);

  final rows = map.values.where((r) => r.output != 0 || r.input != 0).toList()
    ..sort((a, b) => a.name.compareTo(b.name));
  final outputTotal = rows.fold(0.0, (a, r) => a + r.output);
  final inputTotal = rows.fold(0.0, (a, r) => a + r.input);
  return TaxReport(rows: rows, outputTotal: outputTotal, inputTotal: inputTotal,
      net: outputTotal - inputTotal);
}

/* ---------------- 7 · customer statement ---------------- */

class CustomerStatementRow {
  final CreditEntry entry;
  final double signed;
  final double balance;
  const CustomerStatementRow({required this.entry, required this.signed, required this.balance});
}

class CustomerStatement {
  final String key;
  final double opening;
  final double closing;
  final double givenInPeriod;
  final double repaidInPeriod;
  final List<CustomerStatementRow> rows;
  const CustomerStatement({required this.key, required this.opening, required this.closing,
    required this.givenInPeriod, required this.repaidInPeriod, required this.rows});
}

/// One customer's khata over the range. The closing balance of a
/// full-history range IS `customerOutstanding(credits, key)`.
CustomerStatement customerStatement(List<CreditEntry> credits, String key, ReportRange range) {
  final all = credits.where((c) => creditKey(c) == key).toList()
    ..sort((a, b) => a.ts.compareTo(b.ts));
  double signed(CreditEntry c) => c.kind == 'credit' ? c.amount : -c.amount;

  var opening = 0.0;
  for (final c in all) {
    if (c.ts.compareTo(range.fromTs) < 0) {
      opening += signed(c);
    } else {
      break;
    }
  }
  var balance = opening;
  var givenInPeriod = 0.0;
  var repaidInPeriod = 0.0;
  final rows = <CustomerStatementRow>[];
  for (final c in all) {
    if (!inRange(c.ts, range)) continue;
    balance += signed(c);
    if (c.kind == 'credit' && c.amount > 0) givenInPeriod += c.amount;
    if (c.kind == 'repayment') repaidInPeriod += c.amount;
    rows.add(CustomerStatementRow(entry: c, signed: signed(c), balance: balance));
  }
  return CustomerStatement(key: key, opening: opening, closing: balance,
      givenInPeriod: givenInPeriod, repaidInPeriod: repaidInPeriod, rows: rows);
}

/* ---------------- 8 · supplier statement ---------------- */

class SupplierStatementEvent {
  final String ts;
  final String kind; // purchase | payment | reversal | return
  final double amount;
  final double effect;
  final double balance;
  final String note;
  final double? returnGross;
  final double? refundAmount;
  const SupplierStatementEvent({required this.ts, required this.kind, required this.amount,
    required this.effect, required this.balance, required this.note, this.returnGross, this.refundAmount});
}

class SupplierStatement {
  final String supplierId;
  final double opening;
  final double closing;
  final double purchasedInPeriod;
  final double paidInPeriod;
  final double returnedInPeriod;
  final List<SupplierStatementEvent> events;
  const SupplierStatement({required this.supplierId, required this.opening, required this.closing,
    required this.purchasedInPeriod, required this.paidInPeriod, required this.returnedInPeriod,
    required this.events});
}

SupplierStatement supplierStatement(List<Purchase> purchases, List<SupplierPayment> payments,
    List<PurchaseReturn> purchaseReturns, String supplierId, ReportRange range) {
  List<T> before<T extends Object>(List<T> rows, String Function(T) tsOf) =>
      rows.where((r) => tsOf(r).compareTo(range.fromTs) < 0).toList();
  final opening = supplierBalance(
    before(purchases, (p) => p.ts),
    before(payments, (p) => p.ts),
    supplierId,
    before(purchaseReturns, (r) => r.ts),
  );

  final raw = <({String ts, String kind, double amount, double effect, String note, double? returnGross, double? refundAmount})>[];
  var purchasedInPeriod = 0.0;
  var paidInPeriod = 0.0;
  var returnedInPeriod = 0.0;

  for (final p in purchases) {
    if (p.supplierId != supplierId || !inRange(p.ts, range)) continue;
    purchasedInPeriod += p.total;
    raw.add((ts: p.ts, kind: 'purchase', amount: p.total, effect: p.total, note: p.note,
        returnGross: null, refundAmount: null));
  }
  for (final p in payments) {
    if (p.supplierId != supplierId || !inRange(p.ts, range)) continue;
    if (p.kind == 'reversal') {
      raw.add((ts: p.ts, kind: 'reversal', amount: p.amount, effect: p.amount, note: p.note,
          returnGross: null, refundAmount: null));
    } else {
      paidInPeriod += p.amount;
      raw.add((ts: p.ts, kind: 'payment', amount: p.amount, effect: -p.amount, note: p.note,
          returnGross: null, refundAmount: null));
    }
  }
  for (final r in purchaseReturns) {
    if (r.supplierId != supplierId || !inRange(r.ts, range)) continue;
    final gross = purchaseReturnGross(r);
    returnedInPeriod += gross;
    raw.add((ts: r.ts, kind: 'return', amount: gross, effect: -r.payableOffset, note: '',
        returnGross: gross, refundAmount: r.refundAmount));
  }

  raw.sort((a, b) => a.ts.compareTo(b.ts));
  var balance = opening;
  final events = <SupplierStatementEvent>[];
  for (final e in raw) {
    balance += e.effect;
    events.add(SupplierStatementEvent(ts: e.ts, kind: e.kind, amount: e.amount,
        effect: e.effect, balance: balance, note: e.note,
        returnGross: e.returnGross, refundAmount: e.refundAmount));
  }

  return SupplierStatement(
    supplierId: supplierId, opening: opening, closing: balance,
    purchasedInPeriod: purchasedInPeriod, paidInPeriod: paidInPeriod,
    returnedInPeriod: returnedInPeriod, events: events,
  );
}

/* ---------------- 9 · aging (snapshot — range-free) ---------------- */

class AgingReport {
  final AgingBuckets receivables;
  final AgingBuckets payables;
  const AgingReport({required this.receivables, required this.payables});
}

/// FinanceView's aging tables, verbatim — the same two calls.
AgingReport agingReport(List<CreditEntry> credits, List<Purchase> purchases,
        List<SupplierPayment> payments, List<PurchaseReturn> purchaseReturns) =>
    AgingReport(
      receivables: receivablesAging(credits),
      payables: payablesAging(purchases, payments, purchaseReturns),
    );

/* ---------------- 10 · expenses ---------------- */

class ExpensesReportCategory {
  final String category;
  final double amount;
  final int count;
  const ExpensesReportCategory({required this.category, required this.amount, required this.count});
}

class ExpensesReport {
  final List<Expense> rows;
  final double total;
  final List<ExpensesReportCategory> byCategory;
  const ExpensesReport({required this.rows, required this.total, required this.byCategory});
}

ExpensesReport expensesReport(List<Expense> expenses, ReportRange range) {
  final rows = expenses.where((e) => inRange(e.ts, range)).toList()
    ..sort((a, b) => a.ts.compareTo(b.ts));
  final map = <String, ({double amount, int count})>{};
  for (final e in rows) {
    final g = map[e.category] ?? (amount: 0.0, count: 0);
    map[e.category] = (amount: g.amount + e.amount, count: g.count + 1);
  }
  final byCategory = [
    for (final e in map.entries)
      ExpensesReportCategory(category: e.key, amount: e.value.amount, count: e.value.count)
  ]..sort((a, b) => b.amount.compareTo(a.amount));
  return ExpensesReport(rows: rows, total: expenseTotal(rows), byCategory: byCategory);
}

/* ---------------- 11 · cheques ---------------- */

class ChequesReportGroup {
  final String id; // drawer | atBank | issued | cleared | bounced | returned
  final List<Cheque> rows;
  final double total;
  const ChequesReportGroup({required this.id, required this.rows, required this.total});
}

class ChequesReport {
  final List<ChequesReportGroup> groups;
  final double totalCaptured;
  const ChequesReport({required this.groups, required this.totalCaptured});
}

/// Cheques CAPTURED in the period, grouped by their current status,
/// each group sorted by due date.
ChequesReport chequesReport(List<Cheque> cheques, ReportRange range) {
  final captured = cheques.where((c) => inRange(c.ts, range)).toList();
  List<Cheque> byDue(List<Cheque> rows) =>
      [...rows]..sort((a, b) => a.dueDateISO.compareTo(b.dueDateISO));
  ChequesReportGroup group(String id, List<Cheque> rows) => ChequesReportGroup(
      id: id, rows: byDue(rows), total: rows.fold(0.0, (a, c) => a + c.amount));
  return ChequesReport(
    groups: [
      group('drawer', chequesInDrawer(captured)),
      group('atBank', chequesAtBank(captured)),
      group('issued', pendingOutCheques(captured)),
      group('cleared', captured.where((c) => c.status == 'cleared').toList()),
      group('bounced', captured.where((c) => c.status == 'bounced').toList()),
      group('returned', captured.where((c) => c.status == 'returned').toList()),
    ],
    totalCaptured: captured.fold(0.0, (a, c) => a + c.amount),
  );
}

/* ---------------- 12 · day closes ---------------- */

class DayCloseReportRow {
  final DayClose close;
  final double salesTotal;
  const DayCloseReportRow({required this.close, required this.salesTotal});
}

class DayCloseReportTotals {
  final double sales;
  final double expenses;
  final double creditGiven;
  final double creditReceived;
  final double supplierPaid;
  final double expected;
  final double counted;
  final double difference;
  const DayCloseReportTotals({required this.sales, required this.expenses, required this.creditGiven,
    required this.creditReceived, required this.supplierPaid, required this.expected,
    required this.counted, required this.difference});
}

class DayCloseReport {
  final List<DayCloseReportRow> rows;
  final DayCloseReportTotals totals;
  const DayCloseReport({required this.rows, required this.totals});
}

DayCloseReport dayCloseReport(List<DayClose> dayCloses, ReportRange range) {
  final rows = dayCloses
      .where((d) => d.dateISO.compareTo(range.fromDate) >= 0 && d.dateISO.compareTo(range.toDate) <= 0)
      .toList()
    ..sort((a, b) => a.dateISO.compareTo(b.dateISO));
  final mapped = [
    for (final close in rows)
      DayCloseReportRow(
          close: close,
          salesTotal: close.salesByMethod.values.fold(0.0, (a, v) => a + v))
  ];
  double sum(double Function(DayCloseReportRow) f) => mapped.fold(0.0, (a, r) => a + f(r));
  return DayCloseReport(
    rows: mapped,
    totals: DayCloseReportTotals(
      sales: sum((r) => r.salesTotal),
      expenses: sum((r) => r.close.expensesTotal),
      creditGiven: sum((r) => r.close.creditGiven),
      creditReceived: sum((r) => r.close.creditReceived),
      supplierPaid: sum((r) => r.close.supplierPaid),
      expected: sum((r) => r.close.expectedCash),
      counted: sum((r) => r.close.countedCash),
      difference: sum((r) => r.close.difference),
    ),
  );
}

/* ---------------- 13 · notes ---------------- */

class NotesReportSide {
  final int count;
  final double goods;
  final double tax;
  final double total;
  const NotesReportSide({required this.count, required this.goods, required this.tax, required this.total});
}

class NotesReport {
  final List<DocNote> rows;
  final NotesReportSide credit;
  final NotesReportSide debit;
  const NotesReport({required this.rows, required this.credit, required this.debit});
}

NotesReport notesReport(List<DocNote> notes, ReportRange range) {
  final rows = notes.where((n) => inRange(n.ts, range)).toList()
    ..sort((a, b) => a.ts.compareTo(b.ts));
  NotesReportSide side(String kind) {
    final rs = rows.where((n) => n.kind == kind).toList();
    return NotesReportSide(
      count: rs.length,
      goods: rs.fold(0.0, (a, n) => a + n.goodsAmount),
      tax: rs.fold(0.0, (a, n) => a + n.taxAmount),
      total: rs.fold(0.0, (a, n) => a + n.total),
    );
  }

  return NotesReport(rows: rows, credit: side('credit'), debit: side('debit'));
}

/* ---------------- share text ---------------- */

/// The WhatsApp / share text for a report: shop name, report title,
/// period and the headline totals — all in the report's chosen
/// language. The caller passes the localized fixed strings
/// (`rep.period`, `rep.footer`) and pre-formatted figures from the
/// SAME builder output the screen renders, so the surfaces cannot
/// disagree.
String reportShareText({
  required String shopName,
  required String title,
  required String periodLabel,
  required String period,
  required List<({String label, String value})> lines,
  required String footer,
}) {
  final out = <String>[
    shopName.isEmpty ? 'Dukaan AI' : shopName,
    title,
    '$periodLabel: $period',
    for (final l in lines) '${l.label}: ${l.value}',
    footer,
  ];
  return out.join('\n');
}
