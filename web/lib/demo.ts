/**
 * Dukaan AI — Fix Round 2 · FR2 — demo-data opt-in (pure lib).
 *
 * Before FR2 a brand-new cloud business was born WITH the demo
 * seed already in it (StoreProvider.seedNamespace): the owner
 * never chose it, and — because the journal is append-only and
 * no emptying action existed — could never get rid of it. FR2
 * inverts the default: new businesses start EMPTY, and demo data
 * becomes an explicit owner act with a pre-list (exactly what
 * will be added) and a post-summary (exactly what was written).
 *
 * This file is the single source of truth for WHAT the demo set
 * is: the same getters seedNamespace used to push, so the
 * pre-list, the classifier and the seeder can never disagree.
 * It is pure — no Firebase, no store — so the harness proves
 * the set, the summary figures and the classification against
 * the same code the clients run.
 *
 * Two demo sets exist in this codebase and must not be confused:
 *  - the DEMO-MODE showroom (localStorage, loadInitial): the full
 *    seedCollections() including the B1/B2 documents, the Godown,
 *    BOMs, employees, loans — the public demo's discoverability
 *    set. Untouched by FR2.
 *  - the CLOUD demo set (this file): exactly what seedNamespace
 *    pushed into a fresh cloud namespace — products, sales,
 *    journal (frozen 21 + the 8 demo-loyalty entries), the
 *    customer/supplier/purchase/expense/credit history, the
 *    sample tax slab, the default warehouse + its stock rows,
 *    and the five money accounts. The B1/B2 documents, Godown,
 *    BOMs, employees and loans were NEVER pushed to cloud shops,
 *    so they are not part of this set either.
 */

import {
  getDemoLoyaltyEntries,
  getSeedAccounts,
  getSeedCredits,
  getSeedCustomers,
  getSeedExpenses,
  getSeedJournal,
  getSeedProducts,
  getSeedPurchases,
  getSeedSales,
  getSeedStockLevels,
  getSeedSupplierPayments,
  getSeedSuppliers,
  getSeedTaxSlabs,
  getSeedWarehouses,
  SEED_GODOWN_ID,
} from "./seed";
import { DEFAULT_WAREHOUSE_ID } from "./stock";
import type { JsonDoc } from "./backup";

/* ------------------------------------------------------------------ */
/* The cloud demo set — exactly seedNamespace's pushes                */
/* ------------------------------------------------------------------ */

/** The demo flag on a business's owner doc: "none" (never seeded
 *  — the FR2 default for every new business) or "seeded" (the
 *  demo set was added by the explicit owner act). Advisory only:
 *  classification (below) reads the CONTENT, never this flag —
 *  a flag that disagreed with the books would be a lie the UI
 *  could show. */
export type DemoState = "none" | "seeded";

/** Collections seedNamespace pushed (the rest start empty). */
export const CLOUD_DEMO_COLLECTIONS = [
  "products",
  "sales",
  "bills",
  "suppliers",
  "purchases",
  "supplierPayments",
  "expenses",
  "credits",
  "customers",
  "returns",
  "adjustments",
  "dayCloses",
  "cashEntries",
  "journal",
  "accounts",
  "taxSlabs",
  "warehouses",
  "stockLevels",
] as const;

export type CloudDemoCollection = (typeof CLOUD_DEMO_COLLECTIONS)[number];

/**
 * Structural collections: the skeleton every business — empty or
 * demo or real — carries, with fixed ids and fixed content. They
 * are NEVER counted as business content: a business holding only
 * these is EMPTY, and demo seeding never overwrites them (an
 * owner rename of "Main Till" or the default warehouse survives
 * a demo add — the seeder writes these docs only when absent).
 */
export const STRUCTURAL_COLLECTIONS = ["accounts", "warehouses"] as const;

/** Content collections: everything the backup covers except the
 *  structural pair. Classification runs over these alone. */
export const DEMO_CONTENT_COLLECTIONS = [
  "products",
  "sales",
  "bills",
  "suppliers",
  "purchases",
  "supplierPayments",
  "expenses",
  "credits",
  "customers",
  "returns",
  "adjustments",
  "dayCloses",
  "cashEntries",
  "journal",
  "taxSlabs",
  "stockLevels",
] as const;

/** The demo documents per collection, from the real generators. */
export function demoSetDocs(): Record<string, Array<{ id: string }>> {
  const products = getSeedProducts();
  const sales = getSeedSales();
  const purchases = getSeedPurchases();
  const supplierPayments = getSeedSupplierPayments();
  const expenses = getSeedExpenses();
  const credits = getSeedCredits();
  const journal = getSeedJournal(
    products,
    sales,
    purchases,
    supplierPayments,
    expenses,
    credits
  );
  // The cloud journal is the frozen 21 PLUS the demo loyalty
  // story (seedCollections' journal) — the live demo business
  // carries 29 entries, and the pre-list must say 29, not 21.
  const demoJournal = [...journal, ...getDemoLoyaltyEntries(getSeedCustomers())];
  const warehouses = getSeedWarehouses().filter((w) => w.id === DEFAULT_WAREHOUSE_ID);
  return {
    products,
    sales,
    bills: [],
    suppliers: getSeedSuppliers(),
    purchases,
    supplierPayments,
    expenses,
    credits,
    customers: getSeedCustomers(),
    returns: [],
    adjustments: [],
    dayCloses: [],
    cashEntries: [],
    journal: demoJournal,
    accounts: getSeedAccounts(),
    taxSlabs: getSeedTaxSlabs(),
    warehouses,
    stockLevels: getSeedStockLevels(products),
  };
}

/** Per-collection id sets of the demo set (the classifier's input). */
export function demoSetIds(): Record<string, Set<string>> {
  const docs = demoSetDocs();
  const out: Record<string, Set<string>> = {};
  for (const name of CLOUD_DEMO_COLLECTIONS) {
    out[name] = new Set((docs[name] ?? []).map((d) => d.id));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* The pre-list summary — computed from the generators, pinned       */
/* ------------------------------------------------------------------ */

export interface DemoSummary {
  products: number;
  customers: number;
  suppliers: number;
  salesRows: number;
  journalEntries: number;
  /** Shelf value at cost (Σ stockQty × costPrice). */
  stockCost: number;
  /** Shelf value at retail (Σ stockQty × salePrice). */
  stockRetail: number;
}

/** What "Add demo data" will add — the pre-list the owner sees
 *  BEFORE seeding, and the shape the post-summary confirms. */
export function demoSummary(): DemoSummary {
  const products = getSeedProducts();
  const docs = demoSetDocs();
  return {
    products: products.length,
    customers: (docs.customers ?? []).length,
    suppliers: (docs.suppliers ?? []).length,
    salesRows: (docs.sales ?? []).length,
    journalEntries: (docs.journal ?? []).length,
    stockCost: products.reduce((a, p) => a + p.stockQty * p.costPrice, 0),
    stockRetail: products.reduce((a, p) => a + p.stockQty * p.salePrice, 0),
  };
}

/* ------------------------------------------------------------------ */
/* Classification — what kind of business is this?                     */
/* ------------------------------------------------------------------ */

export type BusinessContentClass = "empty" | "demo-only" | "real";

export interface BusinessContentDoc {
  id: string;
}

/**
 * Classify a business by its CONTENT collections alone (the
 * structural pair is ignored — an empty business still holds
 * its five accounts and default warehouse):
 *  - "empty": zero content documents anywhere.
 *  - "demo-only": at least one content document, and every
 *    content document's id belongs to the demo set.
 *  - "real": any content document outside the demo set — a real
 *    bill, a real product, anything the owner (or a demo-plus-
 *    real mix) created. Demo seeding is refused for these:
 *    demo data must never mix into real books.
 *
 * Id-based by design: user-created doc ids are timestamp-based
 * (`p-<base36>`, `s-<base36>`, …) and can never equal a demo id
 * (`p01`, `s-0001`, `j-seed-*`, …), so a real document cannot
 * masquerade as demo — and a demo document the owner edited
 * still classifies as demo (editing demo data is the owner's
 * act on demo data; clearing it is the escape hatch, not
 * re-seeding over it).
 */
export function classifyBusinessContent(
  docs: Partial<Record<string, BusinessContentDoc[]>>,
  demoIds: Record<string, Set<string>> = demoSetIds()
): BusinessContentClass {
  let any = false;
  for (const name of DEMO_CONTENT_COLLECTIONS) {
    for (const d of docs[name] ?? []) {
      any = true;
      if (!demoIds[name]?.has(d.id)) return "real";
    }
  }
  return any ? "demo-only" : "empty";
}

/* ------------------------------------------------------------------ */
/* The seeding plan — what the client writes                          */
/* ------------------------------------------------------------------ */

export interface DemoSeedWrite {
  collection: string;
  id: string;
  data: Record<string, unknown>;
}

/**
 * Plan a demo seeding: every demo document NOT already present.
 * The caller passes the ids already in the business (at minimum
 * the structural docs the skeleton wrote). For an empty business
 * that is exactly the structural pair, so the plan is the whole
 * demo set; for a demo-only business the plan is empty (the
 * re-seed path wipes first, then plans again). Content docs are
 * never skipped by this planner — seeding is refused for "real"
 * businesses before this function is ever called, so a plan
 * that would silently skip a foreign doc cannot exist.
 */
export function planDemoSeed(
  existingIds: Partial<Record<string, Set<string>>> = {}
): DemoSeedWrite[] {
  const docs = demoSetDocs();
  const writes: DemoSeedWrite[] = [];
  for (const name of CLOUD_DEMO_COLLECTIONS) {
    const existing = existingIds[name] ?? new Set<string>();
    for (const d of docs[name] ?? []) {
      if (!existing.has(d.id)) {
        writes.push({
          collection: name,
          id: d.id,
          data: d as unknown as Record<string, unknown>,
        });
      }
    }
  }
  return writes;
}

/** Count a seeding plan's writes per collection (the post-seed
 *  summary's confirmed shape — counts of docs actually written). */
export function summarizeSeedWrites(
  writes: DemoSeedWrite[]
): Partial<Record<string, number>> {
  const out: Partial<Record<string, number>> = {};
  for (const w of writes) out[w.collection] = (out[w.collection] ?? 0) + 1;
  return out;
}

/** The Godown id is demo-mode-only flavour and must never appear
 *  in a cloud demo seeding — a source-level guard the harness
 *  asserts (seedNamespace filtered it out; so does this file). */
export function cloudDemoHasGodown(): boolean {
  const docs = demoSetDocs();
  return (docs.warehouses ?? []).some((w) => w.id === SEED_GODOWN_ID);
}

export type { JsonDoc };
