/**
 * Dukaan AI — Phase C · C1: the location subledger (design
 * ERP-PHASE-C-DESIGN.md §1). Pure derivations over `warehouses` +
 * `stockLevels`, shared by the store, the desks and the harness so
 * every surface agrees on the same quantities.
 *
 * THE MODEL (§1.1): stock-level rows are the per-location truth;
 * `Product.stockQty` stays the product total, updated in the same
 * batch as every row change it mirrors. The journal never learns
 * where goods sit (§1.4) — location is a subledger dimension under
 * the one inventory GL, exactly as Phase A2's money accounts are a
 * subledger under `cash`/`wallet`.
 *
 * THE RESOLUTION RULE (§1.3): a product with NO rows at all
 * resolves as — all of `stockQty` sits in the default warehouse.
 * That is true of every pre-migration shop by definition, so a C1
 * client reads unmigrated data correctly without any gating. Once
 * ANY row exists for a product, rows are its complete truth and a
 * missing (product, warehouse) pair reads as 0.
 */
import type {
  Bill,
  DeliveryChallan,
  Product,
  SaleOrder,
  StockLevel,
  StockTransfer,
  Warehouse,
} from "./types";
import { challanBilledQty, orderBilledQty, remainingQty } from "./documents";
import { inTransitByProduct } from "./transfers";

/** The default warehouse's FIXED id (§1.2) — the A2 fixed-id
 *  migration discipline: idempotent creation, and pre-migration
 *  readers can resolve the constant before any doc exists. */
export const DEFAULT_WAREHOUSE_ID = "wh-main";

/** The deterministic row id (§1.3): every row write is an idempotent
 *  set/increment on a known doc — no query-then-create race, in
 *  cloud batches and demo state alike. */
export function levelIdFor(warehouseId: string, productId: string): string {
  return `${warehouseId}__${productId}`;
}

export function makeLevel(
  warehouseId: string,
  productId: string,
  qty: number
): StockLevel {
  return { id: levelIdFor(warehouseId, productId), productId, warehouseId, qty };
}

/** Warehouses in display order (sortOrder, then name). */
export function sortedWarehouses(warehouses: Warehouse[]): Warehouse[] {
  return [...warehouses].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
  );
}

/** Warehouses a desk may pick / stock may sit in: not archived. */
export function activeWarehouses(warehouses: Warehouse[]): Warehouse[] {
  return sortedWarehouses(warehouses).filter((w) => !w.archived);
}

/**
 * The shop's default warehouse (§1.2): the non-archived warehouse
 * flagged `isDefault`. Falls back to any flagged warehouse, then
 * the first active one — a shop mid-migration (no docs yet) yields
 * undefined, and `defaultWarehouseId` resolves the fixed constant.
 */
export function defaultWarehouse(
  warehouses: Warehouse[]
): Warehouse | undefined {
  return (
    warehouses.find((w) => w.isDefault && !w.archived) ??
    warehouses.find((w) => w.isDefault) ??
    activeWarehouses(warehouses)[0]
  );
}

export function defaultWarehouseId(warehouses: Warehouse[]): string {
  return defaultWarehouse(warehouses)?.id ?? DEFAULT_WAREHOUSE_ID;
}

/**
 * Resolve a document's warehouse stamp to the warehouse a movement
 * touches: the stamp itself when it names a warehouse that exists
 * (archived included — history stays where history happened), else
 * the default warehouse (§1.3/§1.6: absent stamp ⇒ default).
 */
export function resolveWarehouseId(
  warehouses: Warehouse[],
  stamp?: string | null
): string {
  if (stamp && warehouses.some((w) => w.id === stamp)) return stamp;
  return defaultWarehouseId(warehouses);
}

/** True when the product has at least one stock-level row — the
 *  switch between the §1.3 resolution rule and rows-as-truth. */
export function productHasRows(levels: StockLevel[], productId: string): boolean {
  return levels.some((l) => l.productId === productId);
}

/** The raw row quantity (0 when the pair has no row) — no
 *  resolution rule applied. */
export function rowQtyOf(
  levels: StockLevel[],
  warehouseId: string,
  productId: string
): number {
  return (
    levels.find((l) => l.warehouseId === warehouseId && l.productId === productId)
      ?.qty ?? 0
  );
}

/** Σ of a product's rows, over every warehouse. */
export function rowsTotal(levels: StockLevel[], productId: string): number {
  return levels
    .filter((l) => l.productId === productId)
    .reduce((a, l) => a + l.qty, 0);
}

/**
 * How much of a product sits at a warehouse — THE read every desk
 * uses. Applies the §1.3 resolution rule: a product with no rows
 * at all reads its whole `stockQty` at the default warehouse and 0
 * everywhere else; a product with rows reads its rows (missing
 * pair = 0).
 */
export function qtyAtWarehouse(
  product: Pick<Product, "id" | "stockQty">,
  levels: StockLevel[],
  warehouses: Warehouse[],
  warehouseId: string
): number {
  if (!productHasRows(levels, product.id)) {
    return warehouseId === defaultWarehouseId(warehouses) ? product.stockQty : 0;
  }
  return rowQtyOf(levels, warehouseId, product.id);
}

/**
 * Apply a signed quantity delta to one (product, warehouse) row —
 * the demo-state mirror of the cloud batch's `increment` write.
 * Creates the row when the pair has none. The caller computes the
 * delta exactly as the product total's own path computes it
 * (§1.5), so the mirror identity survives by construction.
 */
export function applyLevelDelta(
  levels: StockLevel[],
  warehouseId: string,
  productId: string,
  delta: number
): StockLevel[] {
  if (delta === 0) return levels;
  const id = levelIdFor(warehouseId, productId);
  if (!levels.some((l) => l.id === id)) {
    return [...levels, makeLevel(warehouseId, productId, delta)];
  }
  return levels.map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l));
}

/* ------------------------------------------------------------------ */
/* The stockV1 migration (§10.1) — annotation, not conversion         */
/* ------------------------------------------------------------------ */

/**
 * The rows `stockV1` must CREATE for a shop: for every product with
 * no rows at all, its default-warehouse row at the product's
 * current `stockQty`. Products that already have rows are skipped
 * whole (completeness is per product). Writes no journal entries
 * and changes no total — it only writes down where existing
 * quantity already notionally is (§10.1).
 */
export function stockV1Rows(
  products: Array<Pick<Product, "id" | "stockQty">>,
  levels: StockLevel[],
  warehouseId: string = DEFAULT_WAREHOUSE_ID
): StockLevel[] {
  const withRows = new Set(levels.map((l) => l.productId));
  return products
    .filter((p) => !withRows.has(p.id))
    .map((p) => makeLevel(warehouseId, p.id, p.stockQty));
}

/* ------------------------------------------------------------------ */
/* Promised / availability, per warehouse (§1.6)                      */
/* ------------------------------------------------------------------ */

/**
 * A document's EFFECTIVE warehouse for the promise partition: its
 * own `warehouseId` when set, else the default warehouse (§1.6).
 * (Unlike `resolveWarehouseId` this does not look the stamp up in
 * the warehouse list — a promise recorded against a since-archived
 * warehouse still belongs to that warehouse's partition.)
 */
export function effectiveWarehouseId(
  doc: { warehouseId?: string | null },
  defaultWhId: string
): string {
  return doc.warehouseId ?? defaultWhId;
}

/**
 * Quantities PROMISED per warehouse, per product: the §2.5 derived
 * reservation of Phase B, partitioned by each promising document's
 * effective warehouse. This is a PARTITION of
 * `promisedQtyByProduct` (lib/documents) — the same documents, the
 * same remainders, summed by warehouse instead of globally:
 * an active order promises its unbilled remainder at ITS effective
 * warehouse (a challan citing it adds nothing — the remainder
 * already counts it, one hop included); a standalone challan (or
 * one whose order is inactive) promises its own unbilled remainder
 * at its own effective warehouse. Drafts and cancelled documents
 * promise nothing. Σ over warehouses reproduces the B2 global
 * figure per product exactly (asserted in the harness).
 */
export function promisedByWarehouse(
  orders: SaleOrder[],
  challans: DeliveryChallan[],
  bills: Bill[],
  defaultWhId: string
): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  const add = (warehouseId: string, productId: string, qty: number) => {
    if (qty <= 0) return;
    let byProduct = out.get(warehouseId);
    if (!byProduct) {
      byProduct = new Map<string, number>();
      out.set(warehouseId, byProduct);
    }
    byProduct.set(productId, (byProduct.get(productId) ?? 0) + qty);
  };
  const addRemaining = (
    warehouseId: string,
    lines: Array<{ productId: string; qty: number }>,
    fulfilled: Map<string, number>
  ) => {
    for (const l of lines) {
      add(warehouseId, l.productId, remainingQty(l.qty, fulfilled, l.productId));
    }
  };
  const activeOrders = new Set<string>();
  for (const o of orders) {
    if (o.status === "draft" || o.status === "cancelled") continue;
    activeOrders.add(o.id);
    addRemaining(
      effectiveWarehouseId(o, defaultWhId),
      o.lines,
      orderBilledQty(o, bills, challans)
    );
  }
  for (const c of challans) {
    if (
      c.status !== "dispatched" &&
      c.status !== "partially_billed" &&
      c.status !== "billed"
    ) {
      continue;
    }
    if (c.orderId != null && activeOrders.has(c.orderId)) continue;
    addRemaining(
      effectiveWarehouseId(c, defaultWhId),
      c.lines,
      challanBilledQty(c, bills)
    );
  }
  return out;
}

export interface WarehouseAvailability {
  /** Physical stock at this warehouse (the row, resolution-applied). */
  onHand: number;
  /** Spoken for at this warehouse by open orders / dispatched
   *  challans, unbilled. */
  promised: number;
  /** onHand − promised. A report figure (§1.6): it warns at the
   *  desks, never blocks a posting. */
  available: number;
}

/**
 * The availability report for ONE warehouse (§1.6): per product,
 * on-hand at that warehouse, promised at that warehouse, and the
 * difference. Summed over all warehouses, onHand reproduces
 * `stockQty` and promised reproduces the B2 global figure — the
 * phase checkpoint's identity.
 */
export function availabilityByProductAtWarehouse(
  products: Array<Pick<Product, "id" | "stockQty">>,
  levels: StockLevel[],
  warehouses: Warehouse[],
  orders: SaleOrder[],
  challans: DeliveryChallan[],
  bills: Bill[],
  warehouseId: string
): Map<string, WarehouseAvailability> {
  const promised = promisedByWarehouse(
    orders,
    challans,
    bills,
    defaultWarehouseId(warehouses)
  ).get(warehouseId);
  const out = new Map<string, WarehouseAvailability>();
  for (const p of products) {
    const onHand = qtyAtWarehouse(p, levels, warehouses, warehouseId);
    const pr = promised?.get(p.id) ?? 0;
    out.set(p.id, { onHand, promised: pr, available: onHand - pr });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* The drift detector + recount (§1.7)                                */
/* ------------------------------------------------------------------ */

export interface StockDrift {
  productId: string;
  /** Σ of the product's rows. */
  rowsTotal: number;
  /** The product's goods on the road (derived, C2 §2.2). */
  inTransit: number;
  /** The product total the rows must mirror. */
  stockQty: number;
  /** rowsTotal + inTransit − stockQty (the amount the split is
   *  out by). */
  drift: number;
}

/**
 * Every product whose rows disagree with its total (§1.7). Only
 * products WITH rows can drift: a product with no rows resolves
 * exactly (§1.3), so it is never listed. The comparison is the
 * §1.3 mirror identity itself — Σ rows + in-transit == stockQty —
 * with in-transit derived from the open transfers (C2 §2.2;
 * identically 0 for a shop with no dispatched transfers, which
 * keeps every pre-C2 reading unchanged).
 */
export function stockDrift(
  products: Array<Pick<Product, "id" | "stockQty">>,
  levels: StockLevel[],
  transfers: StockTransfer[] = []
): StockDrift[] {
  const inTransit = inTransitByProduct(transfers);
  const out: StockDrift[] = [];
  for (const p of products) {
    if (!productHasRows(levels, p.id)) continue;
    const total = rowsTotal(levels, p.id);
    const transit = inTransit.get(p.id) ?? 0;
    const drift = total + transit - p.stockQty;
    if (Math.abs(drift) > 1e-9) {
      out.push({
        productId: p.id,
        rowsTotal: total,
        inTransit: transit,
        stockQty: p.stockQty,
        drift,
      });
    }
  }
  return out;
}

/**
 * Recount locations (§1.7): rewrite the ROWS ONLY so each drifted
 * product's split matches its `stockQty` — the excess/deficit is
 * absorbed by the DEFAULT warehouse's row; every other row is left
 * exactly as found. Fabricates no journal history (rows are
 * operational detail) and is safe in the only direction drift can
 * occur: a pre-C client could only ever have written `stockQty`
 * without rows, never the reverse. Returns the corrected levels
 * plus how many products were repaired.
 */
export function recountLevels(
  products: Array<Pick<Product, "id" | "stockQty">>,
  levels: StockLevel[],
  warehouses: Warehouse[],
  transfers: StockTransfer[] = []
): { levels: StockLevel[]; repaired: number } {
  const drifted = stockDrift(products, levels, transfers);
  if (drifted.length === 0) return { levels, repaired: 0 };
  const defId = defaultWarehouseId(warehouses);
  let next = levels;
  for (const d of drifted) {
    // Absorb −drift at the default row: rowsTotal must fall/rise
    // by exactly the drift amount.
    next = applyLevelDelta(next, defId, d.productId, -d.drift);
  }
  return { levels: next, repaired: drifted.length };
}
