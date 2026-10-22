/**
 * Dukaan AI — Phase C · C2: stock transfers (design
 * ERP-PHASE-C-DESIGN.md §2). Pure derivations + the one posting
 * composition, shared by the store, the desks and the harness so
 * every surface agrees on the same quantities.
 *
 * THE MODEL (§2.1/§2.2): a transfer is a movement document between
 * the shop's OWN warehouses. Dispatch drops the source warehouse's
 * rows; receives raise the destination's; the product TOTAL never
 * changes while goods are on the road — in-transit is a DERIVED
 * quantity (Σ over open transfers of qtySent − qtyReceived), not
 * a place, not a GL account, and available for sale NOWHERE.
 *
 * VALUE (§2.3): dispatch and receipt post NOTHING — the GL holds
 * the same goods at the same snapshot values in a different
 * building, and §1.4 made location invisible to the GL. The one
 * exception is a proven shortage at close-short: the missing
 * units are a stock loss at the product's current shelf cost,
 * posted through the adjustment template's shape (refType
 * "transfer_loss") in the same batch as the close, and the
 * product total drops by the shortage — restoring §1.3's identity
 * (Σ rows + in-transit == stockQty) with the loss INSIDE the
 * ledger, exactly where F-4 requires it.
 */
import { makeEntry } from "./ledger";
import { round2 } from "./tax";
import type {
  JournalEntry,
  Product,
  StockTransfer,
  StockTransferLine,
  Warehouse,
} from "./types";

/* ------------------------------------------------------------------ */
/* Line arithmetic & the in-transit derivation (§2.2)                 */
/* ------------------------------------------------------------------ */

/** What one line still owes the destination: sent, not yet
 *  received. The derivation — never the cached status label —
 *  gates what may still be received (§2.2). */
export function lineRemaining(line: StockTransferLine): number {
  return Math.max(0, line.qtySent - line.qtyReceived);
}

export function transferSentQty(t: StockTransfer): number {
  return t.lines.reduce((a, l) => a + l.qtySent, 0);
}

export function transferReceivedQty(t: StockTransfer): number {
  return t.lines.reduce((a, l) => a + l.qtyReceived, 0);
}

/** A transfer is OPEN while its goods are (partly) on the road:
 *  dispatched and not yet fully received, returned or closed.
 *  Only open transfers contribute to in-transit (§2.2). */
export function isOpenTransfer(t: StockTransfer): boolean {
  return t.status === "dispatched" || t.status === "partially_received";
}

/** Σ (qtySent − qtyReceived) over OPEN transfers, per product —
 *  the goods on the road. Drafts have sent nothing; received /
 *  returned / cancelled transfers have nothing left on the road
 *  (a close-short's shortage left the business through the loss
 *  posting, §2.3 — it is not in transit, it is GONE). */
export function inTransitByProduct(
  transfers: StockTransfer[]
): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of transfers) {
    if (!isOpenTransfer(t)) continue;
    for (const l of t.lines) {
      const r = lineRemaining(l);
      if (r > 0) out.set(l.productId, (out.get(l.productId) ?? 0) + r);
    }
  }
  return out;
}

/** Total units on the road across every open transfer. */
export function inTransitTotalQty(transfers: StockTransfer[]): number {
  let n = 0;
  for (const v of inTransitByProduct(transfers).values()) n += v;
  return n;
}

/** Goods on the road TO one warehouse, per product — the
 *  "incoming" figure the desks show (§8): stock a warehouse may
 *  expect, which is in NO warehouse's availability (§2.2). */
export function incomingByProductAtWarehouse(
  transfers: StockTransfer[],
  warehouseId: string
): Map<string, number> {
  const out = new Map<string, number>();
  for (const t of transfers) {
    if (!isOpenTransfer(t) || t.toWarehouseId !== warehouseId) continue;
    for (const l of t.lines) {
      const r = lineRemaining(l);
      if (r > 0) out.set(l.productId, (out.get(l.productId) ?? 0) + r);
    }
  }
  return out;
}

/** Goods on the road between one pair of warehouses (display). */
export function inTransitBetween(
  transfers: StockTransfer[],
  fromWarehouseId: string,
  toWarehouseId: string
): number {
  let n = 0;
  for (const t of transfers) {
    if (!isOpenTransfer(t)) continue;
    if (t.fromWarehouseId !== fromWarehouseId || t.toWarehouseId !== toWarehouseId)
      continue;
    for (const l of t.lines) n += lineRemaining(l);
  }
  return n;
}

/* ------------------------------------------------------------------ */
/* The transition table (§2.4) — the store validates through this     */
/* BEFORE composing any write, so a refused action writes nothing.    */
/* ------------------------------------------------------------------ */

export type TransferAction =
  | "edit"
  | "delete"
  | "cancel"
  | "dispatch"
  | "receive"
  | "closeShort"
  | "returnToSource";

export function canTransferTransition(
  t: StockTransfer,
  action: TransferAction
): boolean {
  switch (action) {
    case "edit":
    case "delete":
    case "cancel":
    case "dispatch":
      // Drafts are freely editable/deletable/cancellable and are
      // the only state dispatch can leave (§2.4).
      return t.status === "draft";
    case "receive":
    case "closeShort":
    case "returnToSource":
      // A dispatched transfer's only exits (§2.4).
      return isOpenTransfer(t);
  }
}

/** The cached status label recomputed from the lines after a
 *  receive (§2.2): nothing home yet ⇒ still "dispatched"; every
 *  line fully home ⇒ "received"; anything between ⇒
 *  "partially_received". */
export function statusAfterReceive(
  lines: StockTransferLine[]
): "dispatched" | "partially_received" | "received" {
  const sent = lines.reduce((a, l) => a + l.qtySent, 0);
  const received = lines.reduce((a, l) => a + l.qtyReceived, 0);
  if (received <= 0) return "dispatched";
  if (received >= sent) return "received";
  return "partially_received";
}

/* ------------------------------------------------------------------ */
/* Composition & validation (pre-composition refusals, §2.4)          */
/* ------------------------------------------------------------------ */

/** Why a transfer route cannot be composed, or "ok". Checked by
 *  the store BEFORE any write exists: a transfer between a
 *  warehouse and itself is meaningless (§2.1), and both endpoints
 *  must be real warehouses. Archived endpoints refuse NEW drafts;
 *  dispatch tolerates an endpoint archived after drafting (the
 *  goods still have to be able to move — the store decides). */
export type TransferRouteProblem = "same" | "missing" | "archived";

export function transferRouteProblem(
  fromWarehouseId: string,
  toWarehouseId: string,
  warehouses: Warehouse[]
): TransferRouteProblem | null {
  if (fromWarehouseId === toWarehouseId) return "same";
  const from = warehouses.find((w) => w.id === fromWarehouseId);
  const to = warehouses.find((w) => w.id === toWarehouseId);
  if (!from || !to) return "missing";
  if (from.archived || to.archived) return "archived";
  return null;
}

/**
 * Compose transfer lines from the desk's picks: duplicate picks
 * of one product merge, names snapshot from the product (as
 * everywhere), `qtyReceived` starts at 0. Returns null — refusing
 * the whole composition — on an unknown product, a non-positive
 * quantity, or no lines at all.
 */
export function composeTransferLines(
  products: Array<Pick<Product, "id" | "name">>,
  picks: Array<{ productId: string; qty: number }>
): StockTransferLine[] | null {
  const byId = new Map(products.map((p) => [p.id, p]));
  const merged = new Map<string, number>();
  for (const pick of picks) {
    if (!byId.has(pick.productId)) return null;
    if (!Number.isFinite(pick.qty) || pick.qty <= 0) return null;
    merged.set(pick.productId, (merged.get(pick.productId) ?? 0) + pick.qty);
  }
  if (merged.size === 0) return null;
  return [...merged.entries()].map(([productId, qtySent]) => ({
    productId,
    name: byId.get(productId)?.name ?? productId,
    qtySent,
    qtyReceived: 0,
  }));
}

/**
 * Validate a receive's picks against the transfer's DERIVED
 * remainders (§2.4): every pick must name a line of the transfer,
 * carry a positive quantity, and keep the line's cumulative
 * received ≤ sent. Over-receipt is refused HERE — before the
 * store composes any write (B's pre-composition discipline).
 * Returns the merged picks, or null when refused.
 */
export function validateReceivePicks(
  t: StockTransfer,
  picks: Array<{ productId: string; qty: number }>
): Array<{ productId: string; qty: number }> | null {
  if (picks.length === 0) return null;
  const merged = new Map<string, number>();
  for (const pick of picks) {
    if (!Number.isFinite(pick.qty) || pick.qty <= 0) return null;
    merged.set(pick.productId, (merged.get(pick.productId) ?? 0) + pick.qty);
  }
  for (const [productId, qty] of merged) {
    const line = t.lines.find((l) => l.productId === productId);
    if (!line) return null;
    if (line.qtyReceived + qty > line.qtySent + 1e-9) return null;
  }
  return [...merged.entries()].map(([productId, qty]) => ({ productId, qty }));
}

/** Apply validated receive picks to the lines: the ONLY writer of
 *  `qtyReceived` (§2.2 — receive actions write the transfer's own
 *  event record; nothing else may). */
export function applyReceivePicks(
  lines: StockTransferLine[],
  picks: Array<{ productId: string; qty: number }>
): StockTransferLine[] {
  const byId = new Map(picks.map((p) => [p.productId, p.qty]));
  return lines.map((l) => {
    const add = byId.get(l.productId);
    return add ? { ...l, qtyReceived: l.qtyReceived + add } : l;
  });
}

/** The shortage a close-short would book, per line: what was sent
 *  and never arrived (§2.3/§2.4). Empty for a fully received
 *  transfer. */
export function transferShortages(
  t: StockTransfer
): Array<{ productId: string; name: string; qty: number }> {
  return t.lines
    .map((l) => ({ productId: l.productId, name: l.name, qty: lineRemaining(l) }))
    .filter((s) => s.qty > 0);
}

/* ------------------------------------------------------------------ */
/* The loss posting (§2.3) — the ONE entry a transfer can produce     */
/* ------------------------------------------------------------------ */

/**
 * The inventory account that holds a product's stock value: its
 * class account (§4.1). Landed in C2 ahead of the class split as
 * the seam the transfer-loss template already credits through;
 * Phase C · C3 introduced `Product.stockClass` and adopted this
 * resolver for EVERY stock-value template (design §4.1's closed
 * path list). Goods (absent/null class) resolve to `inventory`,
 * so a shop with no raw products posts byte-identical entries.
 */
export function inventoryAccountFor(product: {
  stockClass?: "raw" | null;
}): "inventory" | "inventory_raw" {
  return product.stockClass === "raw" ? "inventory_raw" : "inventory";
}

/**
 * The class-change reclass entry (design §4.1): moving a product
 * between classes with stock on hand moves the shelf value
 * (`qtyOnHand × costPrice` — the latest-cost convention every F-4
 * path values at) between the class accounts in ONE documented
 * entry, refType "reclass" — the A §1.6 true-up form. Returns null
 * when there is nothing to move: same class, zero stock, or zero
 * value (a bare flag flip posts nothing). A negative on-hand
 * quantity (a product oversold below zero) reclasses as the
 * mirror image, so the negative balance lands in the new class
 * account exactly. Composed here — beside `inventoryAccountFor`
 * and the transfer-loss builder — so the store gains no new
 * makeEntry call site, per the C2 pattern.
 */
export function buildReclassEntry(
  product: Pick<Product, "id" | "name" | "stockClass">,
  toClass: "raw" | null,
  qtyOnHand: number,
  costPrice: number
): JournalEntry | null {
  const from = inventoryAccountFor(product);
  const to = inventoryAccountFor({ stockClass: toClass });
  if (from === to) return null;
  const amount = round2(qtyOnHand * costPrice);
  if (amount === 0) return null;
  const memo = `Stock class reclass — ${product.name} (${
    from === "inventory_raw" ? "raw material → goods" : "goods → raw material"
  })`;
  return amount > 0
    ? makeEntry(memo, "reclass", product.id, [
        { account: to, debit: amount, credit: 0 },
        { account: from, debit: 0, credit: amount },
      ])
    : makeEntry(memo, "reclass", product.id, [
        { account: from, debit: -amount, credit: 0 },
        { account: to, debit: 0, credit: -amount },
      ]);
}

/** The value a shortage list carries: Σ short × the product's
 *  CURRENT shelf `costPrice` (§2.3 — the latest-cost convention
 *  every F-4 path values at). A shortage line whose product no
 *  longer exists contributes 0: its stock — and its total — left
 *  with the product's own delete write-off. */
export function transferLossValue(
  shortages: Array<{ productId: string; qty: number }>,
  productsById: Map<string, Pick<Product, "costPrice">>
): number {
  return shortages.reduce(
    (a, s) => a + s.qty * (productsById.get(s.productId)?.costPrice ?? 0),
    0
  );
}

/**
 * Compose the close-short loss entry (§2.3), through the real
 * `makeEntry` guard:
 *
 *   Dr  inventory_loss                     Σ short × costPrice
 *       Cr  inventory | inventory_raw      per product class
 *
 * refType "transfer_loss", refId the transfer. Dated TODAY by
 * construction (makeEntry stamps now) — never the dispatch date
 * (§2.5) — and the store runs it through `guardPostings` before
 * any write, so a locked today refuses the close with it.
 * Returns null when the shortage carries no value (nothing short,
 * or every shorted product is gone): the close then posts nothing.
 */
export function buildTransferLossEntry(
  transfer: Pick<StockTransfer, "id" | "number">,
  shortages: Array<{ productId: string; name: string; qty: number }>,
  productsById: Map<
    string,
    Pick<Product, "costPrice"> & { stockClass?: "raw" | null }
  >
): JournalEntry | null {
  const byAccount = new Map<"inventory" | "inventory_raw", number>();
  for (const s of shortages) {
    const p = productsById.get(s.productId);
    if (!p) continue;
    const value = s.qty * p.costPrice;
    if (value <= 0) continue;
    const acct = inventoryAccountFor(p);
    byAccount.set(acct, (byAccount.get(acct) ?? 0) + value);
  }
  if (byAccount.size === 0) return null;
  const total = [...byAccount.values()].reduce((a, v) => a + v, 0);
  const units = shortages.reduce((a, s) => a + s.qty, 0);
  return makeEntry(
    `Transfer loss — ${transfer.number ?? transfer.id} (${units} unit${units === 1 ? "" : "s"} short on receipt)`,
    "transfer_loss",
    transfer.id,
    [
      { account: "inventory_loss", debit: total, credit: 0 },
      ...[...byAccount.entries()].map(([account, credit]) => ({
        account,
        debit: 0,
        credit,
      })),
    ]
  );
}
