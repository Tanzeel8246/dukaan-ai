/**
 * Dukaan AI — pure data selectors. Everything the dashboard, forecast page
 * and AI assistant compute comes from these functions, so the web app,
 * the Flutter app and the AI engine all agree on the same numbers.
 */
import type { ForecastRow, Product, Sale } from "./types";

/** Sales recorded `dayOffset` days ago (0 = today). */
export function salesOnDay(sales: Sale[], dayOffset: number): Sale[] {
  return sales.filter((s) => s.dayOffset === dayOffset);
}

/** Total revenue of sales on a given day. */
export function revenueOnDay(sales: Sale[], dayOffset: number): number {
  return salesOnDay(sales, dayOffset).reduce((sum, s) => sum + s.total, 0);
}

/** Total units sold on a given day. */
export function unitsOnDay(sales: Sale[], dayOffset: number): number {
  return salesOnDay(sales, dayOffset).reduce((sum, s) => sum + s.qty, 0);
}

/** Gross profit (sale - cost) of sales on a given day.
 *  F-9: cost is each sale's own `unitCost` snapshot (the same basis the
 *  journal/P&L uses) — never the product's CURRENT cost, which would
 *  let a later reprice rewrite today's profit. Seed rows predate the
 *  snapshot field, so they fall back to the product cost. */
export function profitOnDay(sales: Sale[], dayOffset: number, products: Product[]): number {
  const byId = new Map(products.map((p) => [p.id, p]));
  return salesOnDay(sales, dayOffset).reduce((sum, s) => {
    const cost = s.unitCost ?? byId.get(s.productId)?.costPrice;
    const margin = cost != null ? s.unitPrice - cost : 0;
    return sum + margin * s.qty;
  }, 0);
}

/** Products at or below their reorder level, worst first. */
export function lowStockProducts(products: Product[]): Product[] {
  return products
    .filter((p) => p.stockQty <= p.reorderLevel)
    .sort((a, b) => a.stockQty / Math.max(a.reorderLevel, 1) - b.stockQty / Math.max(b.reorderLevel, 1));
}

/** Total stock value at cost price (PKR). */
export function stockValue(products: Product[]): number {
  return products.reduce((sum, p) => sum + p.stockQty * p.costPrice, 0);
}

/** Total stock value at sale price (PKR). */
export function stockValueRetail(products: Product[]): number {
  return products.reduce((sum, p) => sum + p.stockQty * p.salePrice, 0);
}

/** Units of a product sold per day over the last `days` days. */
export function avgDailySales(sales: Sale[], productId: string, days = 7): number {
  let qty = 0;
  for (let d = 0; d < days; d++) {
    qty += sales.filter((s) => s.productId === productId && s.dayOffset === d).reduce((a, s) => a + s.qty, 0);
  }
  return qty / days;
}

/** Revenue per day for the last `days` days (oldest -> newest). */
export function dailyRevenueSeries(sales: Sale[], days = 7): { label: string; revenue: number }[] {
  const out: { label: string; revenue: number }[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(Date.now() - d * 86400000);
    const label = d === 0 ? "Today" : date.toLocaleDateString("en-PK", { weekday: "short" });
    out.push({ label, revenue: revenueOnDay(sales, d) });
  }
  return out;
}

/**
 * Demand forecast for every product: 7-day moving average, days of stock
 * left, and a suggested reorder quantity that covers 14 days of demand plus
 * a 20% safety buffer, rounded up.
 */
export function forecastAll(products: Product[], sales: Sale[]): ForecastRow[] {
  return products
    .map((product) => {
      const avgDaily = avgDailySales(sales, product.id, 7);
      const daysOfStock = avgDaily > 0 ? product.stockQty / avgDaily : Number.POSITIVE_INFINITY;
      const suggestedReorder =
        avgDaily > 0 ? Math.max(0, Math.ceil(avgDaily * 14 * 1.2 - product.stockQty)) : 0;
      const status: ForecastRow["status"] =
        daysOfStock <= 3 ? "critical" : daysOfStock <= 7 || product.stockQty <= product.reorderLevel ? "low" : "ok";
      return { product, avgDaily, daysOfStock, suggestedReorder, status };
    })
    .sort((a, b) => a.daysOfStock - b.daysOfStock);
}

/** Best-selling product (by units) over the last `days` days. */
export function topSeller(products: Product[], sales: Sale[], days = 7): { product: Product; units: number } | null {
  let best: { product: Product; units: number } | null = null;
  for (const p of products) {
    const units = Math.round(avgDailySales(sales, p.id, days) * days);
    if (!best || units > best.units) best = { product: p, units };
  }
  return best && best.units > 0 ? best : null;
}

/* ---------------- Complete edition: inventory depth ---------------- */

/** Days from today until a YYYY-MM-DD date (negative = already past). */
export function daysUntil(dateStr: string, now = new Date()): number {
  const target = new Date(`${dateStr}T23:59:59`);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

/** Products whose expiryDate falls within `withinDays` (incl. expired). */
export function expiringProducts(products: Product[], withinDays = 30): Product[] {
  return products
    .filter((p) => p.expiryDate && daysUntil(p.expiryDate) <= withinDays)
    .sort((a, b) => (a.expiryDate ?? "").localeCompare(b.expiryDate ?? ""));
}

/** Smallest dayOffset at which a product was sold (null = never sold). */
export function lastSaleOffset(sales: Sale[], productId: string): number | null {
  let best: number | null = null;
  for (const s of sales) {
    if (s.productId !== productId || s.kind === "return") continue;
    if (best === null || s.dayOffset < best) best = s.dayOffset;
  }
  return best;
}

/** Dead stock: in stock but no sale within `days` days (or never sold). */
export function deadStockProducts(products: Product[], sales: Sale[], days = 60): Product[] {
  return products.filter((p) => {
    if (p.stockQty <= 0) return false;
    const last = lastSaleOffset(sales, p.id);
    return last === null || last > days;
  });
}
