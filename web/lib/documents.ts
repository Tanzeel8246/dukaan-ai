/**
 * Dukaan AI — Phase B document-chain machinery (design:
 * ERP-PHASE-B-DESIGN.md §1.3, §2.1, §7). Pure functions only: the
 * store composes writes, this module computes numbers, estimates
 * and fulfilment derivations — so the harness exercises exactly
 * what the desks display.
 *
 * Numbering (§1.3): one series per document type, rendered
 * `prefix + sequence`. The sequence deliberately reuses the app's
 * one proven pattern — billNo's — the next number is
 * `1 + max(sequence over the subscribed documents of that series)`,
 * computed client-side at mint time. A counter document was
 * considered and rejected (the owner doc is owner-write-only; a
 * dedicated counters collection adds rules surface for a display
 * number; bills have run on max+1 since the Complete edition).
 * Numbers mint when a document LEAVES draft, so discarded drafts
 * burn no numbers and series stay gapless in normal use. Two
 * devices issuing in the same series while racing can mint the
 * same number — exactly the exposure billNo already carries; the
 * document `id` remains the identity, the number a human reference.
 *
 * Fulfilment (§2.1): quantities are DERIVED from child documents
 * citing their parent, never stored counters. A document's stored
 * `status` is a cached label over these derivations; where the two
 * ever disagree, the derivation wins.
 */
import type {
  Bill,
  BillItem,
  ChallanStatus,
  Cheque,
  CreditEntry,
  DeliveryChallan,
  DocLine,
  Product,
  Purchase,
  PurchaseItem,
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseReturn,
  Quotation,
  QuotationStatus,
  SaleOrder,
  SaleOrderStatus,
  SaleReturn,
  SeriesId,
  ShopSettings,
  SupplierPayment,
  TaxSlab,
} from "./types";
import { computeBillTaxes, resolveTaxSlab, round2 } from "./tax";

/* ------------------------------------------------------------------ */
/* Numbering (§1.3)                                                    */
/* ------------------------------------------------------------------ */

export const SERIES_DEFAULT_PREFIX: Record<SeriesId, string> = {
  quotation: "QT-",
  saleOrder: "SO-",
  challan: "DC-",
  purchaseOrder: "PO-",
  creditNote: "CN-",
  debitNote: "DN-",
  receiptVoucher: "RV-",
  paymentVoucher: "PV-",
  /* Phase C · C2 (design §6.3). */
  stockTransfer: "TR-",
  /* Phase C · C4 (design §6.3). */
  productionOrder: "PR-",
  /* Phase C · C5 (design §6.3) — minted at creation (§5.1). */
  job: "JB-",
  /* Phase D (design §6.3) — runs mint at finalise (D2); loans
   * mint at creation (D3). Declared in D1 with the type union. */
  payrollRun: "PAY-",
  loan: "LN-",
};

export const SERIES_IDS = Object.keys(SERIES_DEFAULT_PREFIX) as SeriesId[];

/** The live prefix for a series: the owner's override from the
 *  owner-doc settings when set (non-empty), else the design default. */
export function seriesPrefix(
  series: SeriesId,
  settings: Pick<ShopSettings, "docSeries"> | null | undefined
): string {
  const override = settings?.docSeries?.[series];
  return typeof override === "string" && override.trim() !== ""
    ? override
    : SERIES_DEFAULT_PREFIX[series];
}

/** The sequence a stored number carries: its trailing integer, read
 *  prefix-agnostically so a series stays monotonic across a prefix
 *  change (a change affects future mints only; stored numbers are
 *  never rewritten). Null when the string carries no digits. */
export function parseSeriesSeq(number: string | null | undefined): number | null {
  if (!number) return null;
  const m = /(\d+)\s*$/.exec(number);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * Mint the next number in a series from the numbers already in use
 * (the subscribed documents of that series — for notes, the
 * caller's kind-filtered subset). `1 + max(sequence)`, or
 * `prefix + 1` when the series is empty.
 */
export function nextDocNumber(
  series: SeriesId,
  existingNumbers: Array<string | null | undefined>,
  settings: Pick<ShopSettings, "docSeries"> | null | undefined
): string {
  let max = 0;
  for (const n of existingNumbers) {
    const seq = parseSeriesSeq(n);
    if (seq !== null && seq > max) max = seq;
  }
  return `${seriesPrefix(series, settings)}${max + 1}`;
}

/* ------------------------------------------------------------------ */
/* Totals & the tax estimate (§7)                                      */
/* ------------------------------------------------------------------ */

/** The house discount rule, shared with the bill desk: percent is
 *  rounded and capped at the subtotal; flat is capped likewise. */
export function docDiscountOf(
  subtotal: number,
  type: "flat" | "percent",
  value: number
): number {
  return type === "percent"
    ? Math.min(subtotal, Math.round((subtotal * Math.max(0, value)) / 100))
    : Math.min(subtotal, Math.max(0, value));
}

export interface DocTotals {
  subtotal: number;
  discountAmount: number;
  /** Display-only estimate at CURRENT slab resolution (§7) — the
   *  A4 engine's figure for these lines today. Recomputed at render
   *  time; never posted, never promised. */
  estimatedTax: number;
  /** subtotal − discount + EXCLUSIVE estimated tax — the same
   *  formula Bill.total uses, over estimates. */
  total: number;
}

/**
 * Totals for a quotation / sale order. Tax is priced through the
 * very engine the bill will use (`computeBillTaxes` over slabs
 * resolved per product, direction "sales"), so the estimate is the
 * bill's own computation at today's configuration — if slabs,
 * defaults or product tax fields change before billing, the BILL
 * is right and this was only ever an estimate (§7).
 */
export function estimateDocTotals(
  lines: Array<Pick<DocLine, "productId" | "qty" | "total">>,
  discountType: "flat" | "percent",
  discountValue: number,
  products: Array<Pick<Product, "id" | "taxSlabId" | "taxExempt">>,
  taxSlabs: TaxSlab[],
  settings: Pick<
    ShopSettings,
    "defaultSalesTaxSlabId" | "defaultPurchaseTaxSlabId" | "docSeries"
  >
): DocTotals {
  const subtotal = round2(lines.reduce((a, l) => a + l.total, 0));
  const discountAmount = docDiscountOf(subtotal, discountType, discountValue);
  const byId = new Map(products.map((p) => [p.id, p]));
  const result = computeBillTaxes(
    lines.map((l) => ({
      total: l.total,
      qty: l.qty,
      slab: resolveTaxSlab(byId.get(l.productId), taxSlabs, settings, "sales"),
    })),
    discountAmount
  );
  return {
    subtotal,
    discountAmount,
    estimatedTax: result.taxAmount,
    total: result.total,
  };
}

/* ------------------------------------------------------------------ */
/* Fulfilment derivations (§2.1) — children cite parents               */
/* ------------------------------------------------------------------ */

/** Bill statuses whose lines count as billed: a posted bill that
 *  stands. `held` bills are unposted drafts; a `voided` bill was
 *  annulled by its mirror entry (it does not stand, so it fulfils
 *  nothing). A `returned`/`partially_returned` bill stands — its
 *  lines were billed; the return is a separate reversal event and
 *  does not un-cite the bill (design §2.1 counts POSTED bill lines). */
const BILLED_STATUSES: ReadonlySet<Bill["status"]> = new Set([
  "paid",
  "partially_returned",
  "returned",
]);

/** Σ qty per product over a set of lines, keyed by the PARENT
 *  line's product (line identity across documents is by product —
 *  §2.1; a child line keys on its `sourceProductId` when stamped). */
export function qtyByProduct(
  lines: Array<{ productId: string; qty: number; sourceProductId?: string | null }>
): Map<string, number> {
  const out = new Map<string, number>();
  for (const l of lines) {
    const key = l.sourceProductId ?? l.productId;
    out.set(key, (out.get(key) ?? 0) + l.qty);
  }
  return out;
}

function mergeInto(target: Map<string, number>, add: Map<string, number>): void {
  for (const [k, v] of add) target.set(k, (target.get(k) ?? 0) + v);
}

function allCovered(
  lines: Array<{ productId: string; qty: number }>,
  fulfilled: Map<string, number>
): boolean {
  return lines.every((l) => (fulfilled.get(l.productId) ?? 0) >= l.qty - 1e-9);
}

function anyCovered(fulfilled: Map<string, number>): boolean {
  for (const v of fulfilled.values()) if (v > 0) return true;
  return false;
}

/** How much of a quotation has been converted into sale orders:
 *  Σ order-line qty over non-cancelled orders citing it. */
export function quotationConvertedQty(
  quotation: Pick<Quotation, "id">,
  orders: SaleOrder[]
): Map<string, number> {
  const out = new Map<string, number>();
  for (const o of orders) {
    if (o.status === "cancelled") continue;
    if (o.source?.type !== "quotation" || o.source.id !== quotation.id) continue;
    mergeInto(out, qtyByProduct(o.lines));
  }
  return out;
}

/** How much of a sale order has been DELIVERED: Σ qty over lines of
 *  dispatched/billed challans citing the order (§2.1). */
export function orderDeliveredQty(
  order: Pick<SaleOrder, "id">,
  challans: DeliveryChallan[]
): Map<string, number> {
  const out = new Map<string, number>();
  for (const c of challans) {
    if (c.orderId !== order.id) continue;
    if (c.status !== "dispatched" && c.status !== "partially_billed" && c.status !== "billed")
      continue;
    mergeInto(out, qtyByProduct(c.lines));
  }
  return out;
}

/** How much of a sale order has been BILLED: posted bill lines
 *  citing the order directly, PLUS bills citing a challan of the
 *  order (one hop: bill → challan → order). */
export function orderBilledQty(
  order: Pick<SaleOrder, "id">,
  bills: Bill[],
  challans: DeliveryChallan[] = []
): Map<string, number> {
  const out = new Map<string, number>();
  const ownChallans = new Set(
    challans.filter((c) => c.orderId === order.id).map((c) => c.id)
  );
  for (const b of bills) {
    if (!BILLED_STATUSES.has(b.status)) continue;
    const direct = b.sourceType === "order" && b.sourceId === order.id;
    const viaChallan =
      b.sourceType === "challan" && b.sourceId != null && ownChallans.has(b.sourceId);
    if (!direct && !viaChallan) continue;
    mergeInto(out, qtyByProduct(b.items));
  }
  return out;
}

/** How much of a delivery challan has been billed: Σ qty over
 *  posted bill lines citing the challan. */
export function challanBilledQty(
  challan: Pick<DeliveryChallan, "id">,
  bills: Bill[]
): Map<string, number> {
  const out = new Map<string, number>();
  for (const b of bills) {
    if (!BILLED_STATUSES.has(b.status)) continue;
    if (b.sourceType === "challan" && b.sourceId === challan.id) {
      mergeInto(out, qtyByProduct(b.items));
    }
  }
  return out;
}

/** How much of a purchase order has been RECEIVED: Σ qty over
 *  purchase lines of purchases citing the PO (`sourcePoId`). */
export function poReceivedQty(
  po: { id: string },
  purchases: Array<Pick<Purchase, "items"> & { sourcePoId?: string | null }>
): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of purchases) {
    if (p.sourcePoId !== po.id) continue;
    mergeInto(out, qtyByProduct(p.items));
  }
  return out;
}

/** How much of a quotation has been converted AT ALL (to orders,
 *  plus — from B2 — bill lines citing it directly). */
export function quotationConvertedTotalQty(
  quotation: Pick<Quotation, "id">,
  orders: SaleOrder[],
  bills: Bill[] = []
): Map<string, number> {
  const out = quotationConvertedQty(quotation, orders);
  for (const b of bills) {
    if (!BILLED_STATUSES.has(b.status)) continue;
    if (b.sourceType === "quotation" && b.sourceId === quotation.id) {
      mergeInto(out, qtyByProduct(b.items));
    }
  }
  return out;
}

/** Remaining convertible/billable qty for one document line:
 *  line qty − fulfilled qty, never negative (§2.1). */
export function remainingQty(
  lineQty: number,
  fulfilled: Map<string, number>,
  productId: string
): number {
  return Math.max(0, lineQty - (fulfilled.get(productId) ?? 0));
}

/* ------------------------------------------------------------------ */
/* Cached-status derivation (§1.4)                                     */
/* ------------------------------------------------------------------ */

/**
 * The sale order's true status from its billed quantities. Draft
 * and cancelled are lifecycle states, not fulfilment states, and
 * pass through untouched. (Delivered quantities inform the desk's
 * display; the order's fulfilment LABEL follows billing — the
 * money event — per the §1.4 lifecycle open →
 * partially_fulfilled → fulfilled.)
 */
export function deriveOrderStatus(
  order: SaleOrder,
  bills: Bill[],
  challans: DeliveryChallan[] = []
): SaleOrderStatus {
  if (order.status === "draft" || order.status === "cancelled") return order.status;
  const billed = orderBilledQty(order, bills, challans);
  if (order.lines.length > 0 && allCovered(order.lines, billed)) return "fulfilled";
  if (anyCovered(billed)) return "partially_fulfilled";
  return "open";
}

/**
 * The quotation's derived status: `converted` once its lines are
 * fully converted (to orders and/or direct bills); terminal and
 * pre-issue states pass through. Partial conversion leaves the
 * stored label alone — the remainder stays convertible (§2.3) and
 * the derivation shows how much is left.
 */
export function deriveQuotationStatus(
  quotation: Quotation,
  orders: SaleOrder[],
  bills: Bill[] = []
): QuotationStatus {
  if (
    quotation.status === "draft" ||
    quotation.status === "rejected" ||
    quotation.status === "cancelled" ||
    quotation.status === "converted"
  ) {
    return quotation.status;
  }
  const converted = quotationConvertedTotalQty(quotation, orders, bills);
  if (quotation.lines.length > 0 && allCovered(quotation.lines, converted)) {
    return "converted";
  }
  return quotation.status;
}

/**
 * The status a quotation DISPLAYS: the derived status, with
 * `expired` derived live from `validUntil` for an issued/accepted
 * quotation whose validity has passed (§1.2 — expiry is never a
 * stored write; the date is data).
 */
export function displayQuotationStatus(
  quotation: Quotation,
  orders: SaleOrder[],
  todayISO: string,
  bills: Bill[] = []
): QuotationStatus {
  const derived = deriveQuotationStatus(quotation, orders, bills);
  if (
    (derived === "issued" || derived === "accepted") &&
    quotation.validUntil &&
    quotation.validUntil < todayISO
  ) {
    return "expired";
  }
  return derived;
}

/**
 * The delivery challan's true status from its billed quantities
 * (B2). Draft and cancelled are lifecycle states and pass through;
 * a dispatched challan derives `partially_billed` once any of its
 * quantities stand on a posted bill and `billed` once all do.
 */
export function deriveChallanStatus(
  challan: DeliveryChallan,
  bills: Bill[]
): ChallanStatus {
  if (challan.status === "draft" || challan.status === "cancelled") {
    return challan.status;
  }
  const billed = challanBilledQty(challan, bills);
  if (challan.lines.length > 0 && allCovered(challan.lines, billed)) return "billed";
  if (anyCovered(billed)) return "partially_billed";
  return "dispatched";
}

/**
 * The purchase order's true status from its received quantities
 * (B3). Draft and cancelled are lifecycle states and pass through;
 * an issued PO derives `partially_received` once any of its
 * quantities stand on a citing purchase and `received` once all do.
 */
export function derivePoStatus(
  po: PurchaseOrder,
  purchases: Array<Pick<Purchase, "items"> & { sourcePoId?: string | null }>
): PurchaseOrderStatus {
  if (po.status === "draft" || po.status === "cancelled") return po.status;
  const received = poReceivedQty(po, purchases);
  if (po.lines.length > 0 && allCovered(po.lines, received)) return "received";
  if (anyCovered(received)) return "partially_received";
  return "issued";
}

/* ------------------------------------------------------------------ */
/* Purchase-order receipt composition (B3, §2.3)                       */
/* ------------------------------------------------------------------ */

/** One line of a goods receipt against a PO, as the receiving desk
 *  composes it: how much arrived, and the cost it actually came in
 *  at (absent ⇒ the PO's agreed cost — the actual invoice rules,
 *  and the desk may correct it before posting). */
export interface PoReceiptPick {
  productId: string;
  qty: number;
  unitCost?: number;
}

/**
 * Compose + validate the purchase lines for receiving goods against
 * a PO. Returns the `recordPurchase` lines (PO line order), or null
 * when the receipt must be REFUSED before any write is composed:
 *
 * - the PO is not receivable (draft / cancelled / already fully
 *   received — only issued and partially_received POs take goods);
 * - a pick names a product that is not on the PO (extra goods are
 *   a separate direct purchase — they must never cite the PO, or
 *   the received derivation would count goods the PO never ordered);
 * - a picked quantity EXCEEDS the derived remaining quantity for
 *   that product (over-receipt is refused, §9 B3 checkpoint — the
 *   derivation, not the cached status, is the gate);
 * - a picked cost is negative, or no line carries a quantity.
 *
 * Picks for one product merge (quantities sum; the last explicit
 * cost wins). Zero-quantity picks are skipped lines, not errors —
 * the desk zeroes a line that did not arrive.
 */
export function composePoReceiptLines(
  po: PurchaseOrder,
  purchases: Array<Pick<Purchase, "items"> & { sourcePoId?: string | null }>,
  picks: PoReceiptPick[]
): Array<{ productId: string; qty: number; unitCost: number }> | null {
  if (po.status !== "issued" && po.status !== "partially_received") return null;
  const received = poReceivedQty(po, purchases);
  const merged = new Map<string, { qty: number; unitCost?: number }>();
  for (const pick of picks) {
    const cur = merged.get(pick.productId) ?? { qty: 0 };
    cur.qty += pick.qty;
    if (pick.unitCost !== undefined) cur.unitCost = pick.unitCost;
    merged.set(pick.productId, cur);
  }
  const lines: Array<{ productId: string; qty: number; unitCost: number }> = [];
  for (const l of po.lines) {
    const pick = merged.get(l.productId);
    merged.delete(l.productId);
    if (!pick) continue;
    if (pick.qty < 0) return null;
    if (pick.qty === 0) continue;
    const remaining = remainingQty(l.qty, received, l.productId);
    if (pick.qty > remaining + 1e-9) return null; // over-receipt: refused
    const unitCost = pick.unitCost ?? l.unitCost;
    if (!(unitCost >= 0)) return null;
    lines.push({ productId: l.productId, qty: pick.qty, unitCost });
  }
  if (merged.size > 0) return null; // a pick named a product not on the PO
  return lines.length > 0 ? lines : null;
}

/* ------------------------------------------------------------------ */
/* Derived availability (§2.5) — the challan's reservation report      */
/* ------------------------------------------------------------------ */

/**
 * Quantities PROMISED to customers but not yet billed, per product:
 * the derived reservation of design §2.5. Stock leaves only at the
 * bill, so goods out on a challan — and goods an open order will
 * still take — are all still sitting in `stockQty`; this report is
 * what knows they are spoken for.
 *
 * The promise of an order is its UNBILLED remainder (line qty −
 * billed qty, the billed side counting direct bills AND one-hop
 * bills via its challans). A challan citing an ACTIVE order adds
 * nothing of its own — its unbilled quantities already live inside
 * that remainder, and counting both would promise the same goods
 * twice. A standalone challan (or one whose order is gone/inactive)
 * promises its own unbilled remainder. Drafts promise nothing (they
 * assert nothing, §1.4); cancelled documents promise nothing.
 */
export function promisedQtyByProduct(
  orders: SaleOrder[],
  challans: DeliveryChallan[],
  bills: Bill[]
): Map<string, number> {
  const out = new Map<string, number>();
  const addRemaining = (
    lines: Array<{ productId: string; qty: number }>,
    fulfilled: Map<string, number>
  ) => {
    for (const l of lines) {
      const remaining = remainingQty(l.qty, fulfilled, l.productId);
      if (remaining > 0) out.set(l.productId, (out.get(l.productId) ?? 0) + remaining);
    }
  };
  const activeOrders = new Set<string>();
  for (const o of orders) {
    if (o.status === "draft" || o.status === "cancelled") continue;
    activeOrders.add(o.id);
    addRemaining(o.lines, orderBilledQty(o, bills, challans));
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
    addRemaining(c.lines, challanBilledQty(c, bills));
  }
  return out;
}

export interface ProductAvailability {
  /** Physical stock on the shelf (`stockQty`) — goods leave only
   *  at bill posting, so promised goods are still inside this. */
  onHand: number;
  /** Spoken for by open orders / dispatched challans, unbilled. */
  promised: number;
  /** onHand − promised. A report figure (§2.5): it warns at the
   *  desks, it never blocks a posting and never posts itself. */
  available: number;
}

/** The availability report (§2.5): per product, on-hand, promised
 *  and available — all derived from documents, nothing stored. */
export function availabilityByProduct(
  products: Array<Pick<Product, "id" | "stockQty">>,
  orders: SaleOrder[],
  challans: DeliveryChallan[],
  bills: Bill[]
): Map<string, ProductAvailability> {
  const promised = promisedQtyByProduct(orders, challans, bills);
  const out = new Map<string, ProductAvailability>();
  for (const p of products) {
    const pr = promised.get(p.id) ?? 0;
    out.set(p.id, { onHand: p.stockQty, promised: pr, available: p.stockQty - pr });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Purchase returns & formal notes (B4, §3)                            */
/* ------------------------------------------------------------------ */

/** How much of ONE purchase has already been sent back: Σ qty per
 *  product over the purchaseReturns citing it. Derived from the
 *  return records, never a stored counter — the same discipline
 *  as every fulfilment derivation above (§2.1). */
export function purchaseReturnedQty(
  purchase: Pick<Purchase, "id">,
  purchaseReturns: PurchaseReturn[]
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of purchaseReturns) {
    if (r.purchaseId !== purchase.id) continue;
    mergeInto(out, qtyByProduct(r.items));
  }
  return out;
}

/** One line of a purchase return, as the desk composes it: how
 *  much of a purchased line goes back to the supplier. */
export interface PurchaseReturnPick {
  productId: string;
  qty: number;
}

/**
 * Compose + validate the lines of a purchase return against one
 * purchase (design §3.2). Returns the picks (purchase-line order,
 * duplicates merged), or null when the return must be REFUSED
 * before anything is composed:
 *
 * - a pick names a product that is not on the purchase (goods from
 *   another receipt are returned against THAT receipt — the
 *   in-cost snapshot and the input-tax shares are per-purchase);
 * - a picked quantity EXCEEDS purchased − already-returned for
 *   that product (over-return refused — the derivation, computed
 *   over the purchaseReturns citing this purchase, is the gate);
 * - a picked quantity is negative, or no line carries a quantity.
 *
 * Zero-quantity picks are skipped lines, not errors — the desk
 * zeroes a line that stays.
 */
export function composePurchaseReturnLines(
  purchase: Purchase,
  purchaseReturns: PurchaseReturn[],
  picks: PurchaseReturnPick[]
): PurchaseReturnPick[] | null {
  const returned = purchaseReturnedQty(purchase, purchaseReturns);
  const merged = new Map<string, number>();
  for (const pick of picks) {
    merged.set(pick.productId, (merged.get(pick.productId) ?? 0) + pick.qty);
  }
  const lines: PurchaseReturnPick[] = [];
  for (const l of purchase.items) {
    const qty = merged.get(l.productId);
    merged.delete(l.productId);
    if (qty === undefined) continue;
    if (qty < 0) return null;
    if (qty === 0) continue;
    const remaining = remainingQty(l.qty, returned, l.productId);
    if (qty > remaining + 1e-9) return null; // over-return: refused
    lines.push({ productId: l.productId, qty });
  }
  if (merged.size > 0) return null; // a pick named a product not on the purchase
  return lines.length > 0 ? lines : null;
}

/** The stamped `PurchaseItem` lines of a purchase return: the
 *  purchase line's own snapshot (name, unitCost, slab fields) at
 *  the returned quantity — stock leaves at the purchase's in-cost,
 *  never the product's current cost (§3.2). The tax share per line
 *  is stamped by the caller from `purchaseReturnTaxShares`. */
export function purchaseReturnItems(
  purchase: Purchase,
  lines: PurchaseReturnPick[]
): PurchaseItem[] {
  const byId = new Map(purchase.items.map((i) => [i.productId, i]));
  const out: PurchaseItem[] = [];
  for (const l of lines) {
    const src = byId.get(l.productId);
    if (!src) continue;
    out.push({ ...src, qty: l.qty, total: round2(l.qty * src.unitCost) });
  }
  return out;
}

export interface NoteFigures {
  /** Net goods reversed (excl. tax). */
  goodsAmount: number;
  /** Tax reversed (the A4 shares stamped on the return's items). */
  taxAmount: number;
  /** goodsAmount + taxAmount == what the party got back. */
  total: number;
}

/**
 * The figures a credit note carries (design §3.1): a pure read of
 * the SaleReturn the engine already posted. `total` is the engine's
 * refund total — cash refunded + udhaar reduced — and the tax is
 * the sum of the A4 shares the engine stamped onto the return's
 * items, so goodsAmount = total − tax is the net goods reversed.
 * The note EQUALS the engine's figures by construction; there is
 * no second computation anywhere that could drift from them.
 */
export function creditNoteFigures(ret: SaleReturn): NoteFigures {
  const total = round2(ret.refundAmount + (ret.creditReduction ?? 0));
  const taxAmount = round2(
    ret.items.reduce((a, i) => a + (i.taxAmount ?? 0), 0)
  );
  return { goodsAmount: round2(total - taxAmount), taxAmount, total };
}

/**
 * The figures a debit note carries (design §3.2): a pure read of
 * the PurchaseReturn record. `total` is the gross claim reversed —
 * the payable offset + any cash the supplier handed back — and the
 * tax is the sum of the input-tax shares stamped onto the return's
 * items, so goodsAmount = total − tax is the net goods value that
 * left Inventory in the journal entry.
 */
export function debitNoteFigures(ret: PurchaseReturn): NoteFigures {
  const total = round2(ret.payableOffset + ret.refundAmount);
  const taxAmount = round2(
    ret.items.reduce((a, i) => a + (i.taxAmount ?? 0), 0)
  );
  return { goodsAmount: round2(total - taxAmount), taxAmount, total };
}

/**
 * A purchase-return line stamped for a DEBIT NOTE's `items`
 * (DocNote.items is the BillItem shape, §1.2): a purchase has one
 * price — the in-cost — so the note line carries it as both its
 * unit price and its unit cost, with the slab snapshot and the tax
 * share the return reversed. The PurchaseReturn record itself
 * keeps the PurchaseItem truth; the note is its print view (§3.4).
 */
/* ------------------------------------------------------------------ */
/* Payment vouchers (B6, §5) — the print view of a payment row         */
/* ------------------------------------------------------------------ */

/**
 * Everything a voucher print shows (design §5.2), resolved from
 * the ONE record that is the voucher: the payment row itself. The
 * builders are pure and language-neutral — figures and facts come
 * from the row; the sheet translates labels through the
 * dictionaries in the shop's chosen language. Because the print
 * reads the ledger row, a voucher can never drift from the ledger.
 *
 * `balanceAfter` is NOT read off the row (balances are never
 * stored): the caller derives the party's CURRENT balance from the
 * subledgers at print time (`customerOutstanding` /
 * `supplierBalance`) and the sheet labels it as the current
 * balance, exactly as §5.2 prescribes.
 */
export interface VoucherPrintData {
  kind: "receipt" | "payment";
  /** The stamped series number; null on pre-B6 rows — the sheet
   *  prints the voucher unnumbered (design §5.1). */
  number: string | null;
  ts: string;
  partyName: string;
  partyPhone: string;
  amount: number;
  method: "cash" | "jazzcash" | "easypaisa" | "bank" | null;
  /** Set when the money moved by cheque (B5 instrument stamp). */
  instrument: "cheque" | null;
  /** The A2 money account's display name, resolved by the caller
   *  (the row carries only its id). For a cheque receipt this is
   *  null at capture — the account is chosen at deposit (§4.1). */
  accountName: string | null;
  chequeNo: string | null;
  chequeBank: string | null;
  chequeDueDateISO: string | null;
  note: string;
  /** The party's balance derived at print time (current, labelled
   *  as such on the sheet — never a stored figure). */
  balanceAfter: number;
}

/** The display context a caller resolves from the store: the money
 *  account's name (A2 stamp → display), the registry doc when the
 *  row moved by cheque, and the derived current balance. */
export interface VoucherPrintContext {
  accountName?: string | null;
  cheque?: Pick<Cheque, "chequeNo" | "bankName" | "dueDateISO"> | null;
  balanceAfter: number;
}

/** The print data of a RECEIPT voucher (رقم وصولی): a `credits`
 *  repayment row, printed. Figures are the row's own — amount,
 *  method and note exactly as recorded. */
export function receiptVoucherData(
  row: CreditEntry,
  ctx: VoucherPrintContext
): VoucherPrintData {
  return {
    kind: "receipt",
    number: row.voucherNo ?? null,
    ts: row.ts,
    partyName: row.customerName,
    partyPhone: row.customerPhone,
    amount: row.amount,
    method: row.method ?? null,
    instrument: row.instrument ?? null,
    accountName: ctx.accountName ?? null,
    chequeNo: ctx.cheque?.chequeNo ?? null,
    chequeBank: ctx.cheque?.bankName ?? null,
    chequeDueDateISO: ctx.cheque?.dueDateISO ?? null,
    note: row.note,
    balanceAfter: ctx.balanceAfter,
  };
}

/** The print data of a PAYMENT voucher (ادائیگی): a
 *  `supplierPayments` row, printed. The row carries no party
 *  snapshot, so the caller supplies the supplier's name. */
export function paymentVoucherData(
  row: SupplierPayment,
  partyName: string,
  ctx: VoucherPrintContext
): VoucherPrintData {
  return {
    kind: "payment",
    number: row.voucherNo ?? null,
    ts: row.ts,
    partyName,
    partyPhone: "",
    amount: row.amount,
    method: row.method,
    instrument: row.instrument ?? null,
    accountName: ctx.accountName ?? null,
    chequeNo: ctx.cheque?.chequeNo ?? null,
    chequeBank: ctx.cheque?.bankName ?? null,
    chequeDueDateISO: ctx.cheque?.dueDateISO ?? null,
    note: row.note,
    balanceAfter: ctx.balanceAfter,
  };
}

export function noteItemsFromPurchaseReturn(ret: PurchaseReturn): BillItem[] {
  return ret.items.map((i) => ({
    productId: i.productId,
    name: i.name,
    qty: i.qty,
    unitPrice: i.unitCost,
    unitCost: i.unitCost,
    total: i.total,
    taxAmount: i.taxAmount ?? 0,
    taxSlabId: i.taxSlabId ?? null,
    taxSlabName: i.taxSlabName ?? null,
    taxRate: i.taxRate ?? 0,
    taxKind: i.taxKind ?? "percent",
    taxInclusive: i.taxInclusive ?? false,
  }));
}
