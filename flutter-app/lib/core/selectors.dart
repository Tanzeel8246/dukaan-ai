/// Dukaan AI — derived selectors (Dart port of web/lib/selectors.ts).
///
/// Nothing here is stored. Every selector recomputes from the raw
/// rows, so fixing a row anywhere fixes every screen at once.
import 'ledger.dart' show roundPaisa;
import 'types.dart';

double round2(double n) => roundPaisa(n);

List<Sale> salesOnDay(List<Sale> sales, int dayOffset) =>
    sales.where((s) => s.dayOffset == dayOffset).toList();

double revenueOnDay(List<Sale> sales, int dayOffset) =>
    salesOnDay(sales, dayOffset).fold(0.0, (a, s) => a + s.total);

/// COGS on a day: Σ (qty × unitCost) over the day's rows.
double cogsOnDay(List<Sale> sales, int dayOffset) =>
    salesOnDay(sales, dayOffset).fold(0.0, (a, s) => a + s.qty * (s.unitCost ?? 0));

/// Gross profit (Net Revenue − COGS) on a given day.
/// When bills are provided, bill-level discounts are deducted so gross profit
/// matches the Finance/P&L definition (Net Revenue − COGS) exactly.
double profitOnDay(List<Sale> sales, int dayOffset, [List<Product>? products, List<Bill>? bills]) {
  final byId = products != null ? {for (final p in products) p.id: p} : <String, Product>{};
  final daySales = salesOnDay(sales, dayOffset);
  final cogs = daySales.fold(0.0, (sum, s) {
    final cost = s.unitCost ?? byId[s.productId]?.costPrice ?? 0.0;
    return sum + cost * s.qty;
  });
  final grossRev = daySales.fold(0.0, (sum, s) => sum + s.total);
  final discounts = bills != null
      ? bills
          .where((b) => b.dayOffset == dayOffset && b.status != 'held' && b.status != 'voided')
          .fold(0.0, (sum, b) {
            final paid = b.payments.fold(0.0, (a, p) => a + p.amount);
            return sum + b.discountAmount + (b.total > paid ? b.total - paid : 0.0);
          })
      : 0.0;
  return round2(grossRev - discounts - cogs);
}

/// Products at or below their reorder level, worst stock ratio first.
List<Product> lowStockProducts(List<Product> products) {
  final low = products.where((p) => p.stockQty <= p.reorderLevel).toList();
  low.sort((a, b) {
    final ra = a.reorderLevel > 0 ? a.stockQty / a.reorderLevel : 0.0;
    final rb = b.reorderLevel > 0 ? b.stockQty / b.reorderLevel : 0.0;
    return ra.compareTo(rb);
  });
  return low;
}

/// Stock value at COST — Σ(stockQty × costPrice) over products with
/// stock on hand.
double stockValue(List<Product> products) =>
    products.where((p) => p.stockQty > 0).fold(0.0, (a, p) => a + p.stockQty * p.costPrice);

/// Stock value at SALE price.
double stockValueRetail(List<Product> products) =>
    products.where((p) => p.stockQty > 0).fold(0.0, (a, p) => a + p.stockQty * p.salePrice);

/* ---------------- forecast ---------------- */

/// Average units sold per day over the last [windowDays] ending
/// today (dayOffset 0). Returns count as negative movement.
double avgDailySales(List<Sale> sales, String productId, [int windowDays = 7]) {
  var units = 0.0;
  for (final s in sales) {
    if (s.productId != productId) continue;
    if (s.dayOffset > windowDays - 1) continue;
    units += s.qty;
  }
  return units / windowDays;
}

class ForecastRow {
  final Product product;
  final double avgDaily; // units/day over the last 7 days
  final double daysOfStock; // double.infinity when nothing sells
  final double suggestedReorder; // units for ~14 days + 20% buffer
  final String status; // "critical" | "low" | "ok"
  const ForecastRow({required this.product, required this.avgDaily, required this.daysOfStock,
    required this.suggestedReorder, required this.status});
}

/// Demand forecast for EVERY product (the web includes the whole
/// catalogue; unsold products sit at infinite days-of-stock):
/// days of stock left at the recent sales pace, and a reorder
/// suggestion. Derived — nothing stored.
List<ForecastRow> forecastAll(List<Product> products, List<Sale> sales) {
  final rows = <ForecastRow>[];
  for (final p in products) {
    final avg = avgDailySales(sales, p.id);
    final days = avg > 0 ? p.stockQty / avg : double.infinity;
    final suggested = avg > 0
        ? ((avg * 14 * 1.2 - p.stockQty).ceilToDouble() > 0
            ? (avg * 14 * 1.2 - p.stockQty).ceilToDouble()
            : 0.0)
        : 0.0;
    final status = days <= 3 ? 'critical' : (days <= 7 || p.stockQty <= p.reorderLevel ? 'low' : 'ok');
    rows.add(ForecastRow(product: p, avgDaily: avg, daysOfStock: days,
        suggestedReorder: suggested, status: status));
  }
  rows.sort((a, b) => a.daysOfStock.compareTo(b.daysOfStock));
  return rows;
}

/* ---------------- expiry / dead stock ---------------- */

/// Days from now until a YYYY-MM-DD date (the web's `daysUntil`:
/// the target is end-of-day, the difference ceiled).
int? daysUntilExpiry(Product p, DateTime now) {
  final exp = p.expiryDate;
  if (exp == null || exp.isEmpty) return null;
  final target = DateTime.tryParse('${exp}T23:59:59');
  if (target == null) return null;
  return (target.difference(now).inMilliseconds / 86400000).ceil();
}

List<Product> expiringProducts(List<Product> products, {int withinDays = 30, DateTime? now}) {
  final n = now ?? DateTime.now();
  final out = <({Product product, int days})>[];
  for (final p in products) {
    if (p.stockQty <= 0) continue;
    final d = daysUntilExpiry(p, n);
    if (d == null || d > withinDays) continue;
    out.add((product: p, days: d));
  }
  out.sort((a, b) => a.days.compareTo(b.days));
  return [for (final e in out) e.product];
}

/// Stock that has not sold in [days] days (no sale row within the
/// window) while units sit on the shelf.
List<Product> deadStockProducts(List<Product> products, List<Sale> sales, [int days = 30]) {
  return products.where((p) {
    if (p.stockQty <= 0) return false;
    return !sales.any((s) => s.productId == p.id && s.dayOffset < days);
  }).toList();
}

/* ---------------- rankings ---------------- */

/// Best-selling product by units over the window (null when the
/// window has no positive movement).
({Product product, double units})? topSeller(List<Product> products, List<Sale> sales, [int windowDays = 7]) {
  final byProduct = <String, double>{};
  for (final s in sales) {
    if (s.dayOffset > windowDays - 1) continue;
    byProduct[s.productId] = (byProduct[s.productId] ?? 0) + s.qty;
  }
  String? bestId;
  var bestUnits = 0.0;
  for (final e in byProduct.entries) {
    if (e.value > bestUnits) {
      bestUnits = e.value;
      bestId = e.key;
    }
  }
  if (bestId == null) return null;
  for (final p in products) {
    if (p.id == bestId) return (product: p, units: bestUnits);
  }
  return null;
}

/// Daily revenue for the last [days] days, OLDEST first.
List<({int dayOffset, double revenue})> dailyRevenueSeries(List<Sale> sales, [int days = 14]) => [
      for (var d = days - 1; d >= 0; d--) (dayOffset: d, revenue: revenueOnDay(sales, d)),
    ];
