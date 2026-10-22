/**
 * Null-safe text search — the single home for every search box in
 * the app (product finders, list searches, bill history).
 *
 * Why this module exists: every document reaches the components as a
 * RAW Firestore/localStorage spread — StoreProvider performs no
 * field normalization — so a document written by an older build may
 * simply not HAVE a field a search touches (a product without
 * `urduName` or `sku`, a customer without `address`, a bill without
 * `customerPhone`, a supplier without `company`). The pre-fix
 * predicates called `.toLowerCase()` / `.includes()` directly on
 * those fields: with an empty query they returned early, so pages
 * loaded and lists rendered — but the first typed keystroke threw a
 * TypeError on the first field-missing document, and with no error
 * boundary in the app the whole page unmounted. Every search box
 * "didn't work" while everything else did.
 *
 * These helpers NEVER throw on missing / null / non-string fields.
 * On well-formed data they return exactly what the old predicates
 * returned (proven by the harness SEARCH suite, which diffs them
 * against the verbatim legacy predicates over the seed data).
 */
import type { Bill, Customer, Product } from "./types";

/** Coerce any stored value to searchable text. Never throws. */
export function searchText(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

/** Normalize a raw query once: trim + lowercase. */
export function normQuery(raw: string): string {
  return searchText(raw).trim().toLowerCase();
}

/**
 * True when the query is blank (every document matches — the old
 * predicates' early return), or when ANY of the fields contains the
 * normalized query. Fields are coerced via searchText, so absent
 * fields simply never match instead of throwing.
 */
export function matchesAny(rawQuery: string, fields: unknown[]): boolean {
  const q = normQuery(rawQuery);
  if (!q) return true;
  return fields.some((f) => searchText(f).toLowerCase().includes(q));
}

/* ---------------- products ---------------- */

/**
 * Product match: name / urduName / sku — plus category when
 * `includeCategory` is set (the Inventory list searches categories;
 * the sales/billing/document pickers historically did not).
 */
export function productMatches(
  p: Product,
  rawQuery: string,
  includeCategory = false
): boolean {
  const fields: unknown[] = [p.name, p.urduName, p.sku];
  if (includeCategory) fields.push(p.category);
  return matchesAny(rawQuery, fields);
}

/** Order-preserving filter; a blank query returns the list as-is. */
export function filterProducts<T extends Product>(
  list: T[],
  rawQuery: string,
  includeCategory = false
): T[] {
  if (!normQuery(rawQuery)) return list;
  return list.filter((p) => productMatches(p, rawQuery, includeCategory));
}

/**
 * Exact SKU lookup — the billing desk's barcode/SKU entry. The old
 * inline version called `x.sku.toLowerCase()` on every product, so
 * one sku-less legacy product made EVERY lookup throw. A missing sku
 * now simply never matches (the lookup input is non-empty here).
 */
export function findProductBySku<T extends Product>(
  list: T[],
  code: string
): T | undefined {
  const c = searchText(code).trim().toLowerCase();
  if (!c) return undefined;
  return list.find((p) => searchText(p.sku).toLowerCase() === c);
}

/* ---------------- customers / people ---------------- */

/** Customer match: name / phone / address. */
export function customerMatches(c: Customer, rawQuery: string): boolean {
  return matchesAny(rawQuery, [c.name, c.phone, c.address]);
}

/** Credit-ledger group match: display name / phone. */
export function creditGroupMatches(
  g: { name?: unknown; phone?: unknown },
  rawQuery: string
): boolean {
  return matchesAny(rawQuery, [g.name, g.phone]);
}

/* ---------------- employees (Phase D · D1) ---------------- */

/**
 * Employee match: name / phone / designation. Same null-safety
 * contract as every matcher here — a legacy directory doc missing
 * a field must never throw on the first keystroke.
 */
export function employeeMatches(
  e: { name?: unknown; phone?: unknown; designation?: unknown },
  rawQuery: string
): boolean {
  return matchesAny(rawQuery, [e.name, e.phone, e.designation]);
}

/* ---------------- suppliers ---------------- */

/**
 * Supplier match: name / company / phone. The pre-fix inline
 * predicate in SuppliersManager called .toLowerCase() directly on
 * name/company and .includes() on phone — a legacy supplier missing
 * any of them threw on the first keystroke, the same failure class
 * as every other list search fixed by this module.
 */
export function supplierMatches(
  s: { name?: unknown; company?: unknown; phone?: unknown },
  rawQuery: string
): boolean {
  return matchesAny(rawQuery, [s.name, s.company, s.phone]);
}

/* ---------------- bills ---------------- */

/**
 * Bill-history match: customer name / phone / bill number — plus,
 * for a WALK-IN bill (no customer name on the bill), the resolved
 * display label the desk actually shows for it (`walkInLabel`, the
 * localized walk-in-customer string passed by the caller). A named
 * bill never matches the walk-in label: the label stands in for the
 * name only when the bill carries none. Without a label argument
 * the behaviour is exactly the legacy predicate's.
 */
export function billMatches(b: Bill, rawQuery: string, walkInLabel?: string): boolean {
  const displayName = searchText(b.customerName) || searchText(walkInLabel);
  return matchesAny(rawQuery, [displayName, b.customerPhone, b.billNo]);
}

/* ---------------- stock adjustments ---------------- */

/** Adjustment-log match: product name / note / reason. */
export function adjustmentMatches(
  a: { productName?: unknown; note?: unknown; reason?: unknown },
  rawQuery: string
): boolean {
  return matchesAny(rawQuery, [a.productName, a.note, a.reason]);
}
