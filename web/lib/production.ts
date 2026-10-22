/**
 * Dukaan AI — Phase C · C4: production orders (design
 * ERP-PHASE-C-DESIGN.md §4). Pure derivations, the absorption
 * arithmetic and EVERY journal composition of the production
 * floor, shared by the store, the manufacturing surface and the
 * harness so all three agree on the same figures.
 *
 * THE MODEL (§4.2): a production order's events are its
 * subledger — append-only records, each written inside its
 * posting batch and citing the ONE journal entry that posted
 * it. Progress is DERIVED from the events, never stored:
 *
 *   producedQty(order) = Σ completion qty
 *   pool(order)        = Σ issue values − Σ completion values
 *                        − Σ scrap values − Σ closeout values
 *
 * and the phase identity is `GL wip == Σ pool(order)` to the
 * paisa (§4.3). The pool can never go negative: issue is its
 * only source, and completion/scrap/closeout values are
 * computed FROM the pool and capped by it before composition.
 *
 * ABSORPTION (§4.2, the F-3 discipline): a completion's value
 * is the pool's cumulative average share — poolBefore × F /
 * max(plannedQty − producedBefore, F) — and a FINAL completion
 * (plan reached, or the desk closes with it) absorbs the
 * ENTIRE remaining pool, so Σ completions + Σ scraps +
 * Σ closeouts == Σ issues to the paisa for every order,
 * always: no rounding residue can strand in WIP.
 *
 * LABOUR & OVERHEAD (§4.4 + owner Q3): each issue declares the
 * run's conversion cost ONCE, with one settlement choice for
 * the pair — paid from a money account at issue (the desk
 * default) or accrued to `salary_payable`. Crediting an
 * expense account was rejected (the cost is capitalised into
 * stock through WIP, not expensed — it reaches the P&L later,
 * through COGS, when the finished goods sell).
 */
import { defaultAccountForMethod, glForAccount, makeEntry } from "./ledger";
import { round2 } from "./tax";
import { qtyAtWarehouse } from "./stock";
import { inventoryAccountFor } from "./transfers";
import type {
  Bom,
  JournalEntry,
  MoneyAccount,
  Product,
  ProductionEvent,
  ProductionOrder,
  StockLevel,
  Warehouse,
} from "./types";

/* ------------------------------------------------------------------ */
/* Derivations over the event log (§4.2/§4.3)                         */
/* ------------------------------------------------------------------ */

/** Finished units produced so far: Σ completion quantities. */
export function producedQty(order: ProductionOrder): number {
  return order.events
    .filter((e) => e.kind === "completion")
    .reduce((a, e) => a + e.qty, 0);
}

/** Σ of the values the order's issue events moved into WIP. */
export function issuedValue(order: ProductionOrder): number {
  return order.events
    .filter((e) => e.kind === "issue")
    .reduce((a, e) => a + e.value, 0);
}

/** Σ of the values completions absorbed out of WIP into
 *  finished stock. */
export function completedValue(order: ProductionOrder): number {
  return order.events
    .filter((e) => e.kind === "completion")
    .reduce((a, e) => a + e.value, 0);
}

/** Σ of the values written off to `inventory_loss` — scrap
 *  events and the closeout residual together. */
export function writtenOffValue(order: ProductionOrder): number {
  return order.events
    .filter((e) => e.kind === "scrap" || e.kind === "closeout")
    .reduce((a, e) => a + e.value, 0);
}

/**
 * The order's WIP pool: what its issues put in minus what its
 * completions, scraps and closeouts took out. Across all
 * orders, Σ pool == the GL `wip` balance to the paisa (§4.3).
 * Never negative by construction (see the header).
 */
export function poolOf(order: ProductionOrder): number {
  return round2(issuedValue(order) - completedValue(order) - writtenOffValue(order));
}

/** Finished units still owed by the plan (0 when over-produced). */
export function remainingPlannedQty(order: ProductionOrder): number {
  return Math.max(0, order.plannedQty - producedQty(order));
}

/** The absorbed cost of one produced unit so far: Σ completion
 *  values / Σ completion qty — the figure the desk reads as
 *  "what a finished unit of this order costs". 0 before the
 *  first completion. */
export function absorbedUnitCost(order: ProductionOrder): number {
  const produced = producedQty(order);
  if (produced <= 0) return 0;
  return round2(completedValue(order) / produced);
}

/**
 * The cached status label, recomputed from the derivation in
 * every event batch (§4.2). Cancelled is terminal and sticky;
 * an untouched order keeps the label its own actions set
 * (draft until opened); once events exist, an order whose plan
 * is fulfilled and whose pool is fully absorbed is completed.
 */
export function deriveProductionStatus(
  order: ProductionOrder
): ProductionOrder["status"] {
  if (order.status === "cancelled") return "cancelled";
  if (order.events.length === 0) return order.status;
  if (producedQty(order) >= order.plannedQty && poolOf(order) <= 0) {
    return "completed";
  }
  return "open";
}

/* ------------------------------------------------------------------ */
/* The recipe snapshot (§4.2/§3.2)                                    */
/* ------------------------------------------------------------------ */

/**
 * The recipe an order is born with: a DEEP copy of the BOM
 * version's economics. Later BOM versions never re-cost an
 * open order — the snapshot is the order's only recipe from
 * creation on (§3.2).
 */
export function snapshotOfBom(bom: Bom): ProductionOrder["bomSnapshot"] {
  return {
    outputQty: bom.outputQty,
    lines: bom.lines.map((l) => ({ ...l })),
    labourCost: bom.labourCost,
    overheadCost: bom.overheadCost,
  };
}

/** Quantities carry at most gram precision in this app (the
 *  desks' `step="any"` inputs display 3dp); scaled defaults
 *  are rounded to it so a run's prefill is a clean figure the
 *  desk can still edit freely. */
function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

/**
 * The issue desk's default component quantities for a run of N
 * finished units: the SNAPSHOT's per-batch quantities scaled
 * by N / batch size (§4.2). Editable at the desk — over-issue
 * is where real overconsumption lives, so the defaults are a
 * starting point, never a constraint.
 */
export function defaultIssueLines(
  order: ProductionOrder,
  runQty: number
): Array<{ productId: string; qty: number }> {
  const snap = order.bomSnapshot;
  if (!(snap.outputQty > 0) || !(runQty > 0)) return [];
  return snap.lines
    .map((l) => ({
      productId: l.productId,
      qty: round3((l.qty * runQty) / snap.outputQty),
    }))
    .filter((l) => l.qty > 0);
}

/** The issue desk's default conversion cost for a run of N:
 *  the snapshot's per-batch labour/overhead scaled the same
 *  way, to the paisa. */
export function defaultIssueConversion(
  order: ProductionOrder,
  runQty: number
): { labourCost: number; overheadCost: number } {
  const snap = order.bomSnapshot;
  if (!(snap.outputQty > 0) || !(runQty > 0)) {
    return { labourCost: 0, overheadCost: 0 };
  }
  return {
    labourCost: round2((snap.labourCost * runQty) / snap.outputQty),
    overheadCost: round2((snap.overheadCost * runQty) / snap.outputQty),
  };
}

/* ------------------------------------------------------------------ */
/* Issue: validation + valuation (pre-composition, §4.2)              */
/* ------------------------------------------------------------------ */

export interface IssueInput {
  /** Finished units this run intends to produce. */
  runQty: number;
  /** The components to consume — defaults from
   *  `defaultIssueLines`, editable at the desk. */
  lines: Array<{ productId: string; qty: number }>;
  labourCost: number;
  overheadCost: number;
  /** §4.4: one settlement choice for the pair. */
  settlement: "paid" | "accrue";
  paidFromAccountId?: string | null;
}

export type IssueProblem =
  | "not_open" // a completed/cancelled order takes no events (a draft opens on first issue)
  | "bad_run" // run size must be > 0
  | "empty_lines" // nothing to issue
  | "unknown_component" // a picked product does not exist
  | "bad_qty" // a component quantity must be > 0
  | "insufficient" // the order warehouse's row cannot cover a component
  | "bad_costs" // labour/overhead cannot be negative
  | "no_account" // paid settlement, but no money account resolves
  | "zero_value"; // the issue would move no value — there is nothing to post

export interface ValuedIssueLine {
  productId: string;
  name: string;
  qty: number;
  unitCost: number; // the shelf cost in force at the issue
  value: number; // round2(qty × unitCost)
  /** The component's stock class at the issue — the entry
   *  credits the account that holds it (`inventoryAccountFor`,
   *  §4.1). Composition detail only: the stored event's lines
   *  carry the declared ProductionEvent fields. */
  stockClass?: "raw" | null;
}

export interface PreparedIssue {
  lines: ValuedIssueLine[];
  materialsValue: number;
  labourCost: number;
  overheadCost: number;
  /** The journal entry that posts this issue — composed here,
   *  through the real `makeEntry` guard, so the store gains no
   *  new posting path. */
  entry: JournalEntry;
  /** The event's settlement stamp: the paying account's id,
   *  "accrue", or null when no conversion cost was settled. */
  paidFromAccountId: string | null;
  /** The event record itself (entryId cited). */
  event: ProductionEvent;
}

/**
 * Validate, value and compose an issue BEFORE anything is
 * written (B's pre-composition refusal discipline): the store
 * either commits the returned preparation whole — entry,
 * event, row drops — or writes nothing at all.
 *
 * Components are valued at their CURRENT shelf `costPrice`
 * (the convention adjustments and COGS already use), and each
 * validates against the ORDER warehouse's row through the
 * §1.3 resolution rule — insufficient stock at that warehouse
 * refuses the whole issue; another warehouse's stock is never
 * silently reached for (§4.5).
 */
export function prepareIssue(
  order: ProductionOrder,
  products: Product[],
  levels: StockLevel[],
  warehouses: Warehouse[],
  accounts: MoneyAccount[],
  input: IssueInput
): { problem: IssueProblem; productId?: string } | { prepared: PreparedIssue } {
  if (order.status === "completed" || order.status === "cancelled") {
    return { problem: "not_open" };
  }
  if (!(input.runQty > 0)) return { problem: "bad_run" };
  const labourCost = round2(input.labourCost || 0);
  const overheadCost = round2(input.overheadCost || 0);
  if (labourCost < 0 || overheadCost < 0) return { problem: "bad_costs" };
  if (!input.lines || input.lines.length === 0) return { problem: "empty_lines" };

  const byId = new Map(products.map((p) => [p.id, p]));
  const merged = new Map<string, number>();
  for (const pick of input.lines) {
    if (!byId.has(pick.productId)) {
      return { problem: "unknown_component", productId: pick.productId };
    }
    if (!Number.isFinite(pick.qty) || pick.qty <= 0) {
      return { problem: "bad_qty", productId: pick.productId };
    }
    merged.set(pick.productId, (merged.get(pick.productId) ?? 0) + pick.qty);
  }
  if (merged.size === 0) return { problem: "empty_lines" };

  const lines: ValuedIssueLine[] = [];
  let materialsValue = 0;
  for (const [productId, qty] of merged) {
    const p = byId.get(productId);
    if (!p) return { problem: "unknown_component", productId };
    const onHand = qtyAtWarehouse(p, levels, warehouses, order.warehouseId);
    if (qty > onHand + 1e-9) return { problem: "insufficient", productId };
    const value = round2(qty * p.costPrice);
    lines.push({
      productId,
      name: p.name,
      qty,
      unitCost: p.costPrice,
      value,
      stockClass: p.stockClass ?? null,
    });
    materialsValue += value;
  }
  materialsValue = round2(materialsValue);
  const conversion = round2(labourCost + overheadCost);
  const totalValue = round2(materialsValue + conversion);
  if (totalValue <= 0) return { problem: "zero_value" };

  // §4.4 settlement: the pair is paid from ONE money account
  // (the desk's pick, else the till's default account) or
  // accrued whole to `salary_payable`. No conversion cost ⇒
  // no settlement line at all, and the event stamps null.
  let account: MoneyAccount | null = null;
  let paidFromAccountId: string | null = null;
  if (conversion > 0) {
    if (input.settlement === "accrue") {
      paidFromAccountId = "accrue";
    } else {
      account =
        accounts.find((a) => a.id === input.paidFromAccountId && !a.archived) ??
        defaultAccountForMethod(accounts, "cash");
      if (!account) return { problem: "no_account" };
      paidFromAccountId = account.id;
    }
  }

  const entry = buildIssueEntry(
    order,
    lines,
    labourCost,
    overheadCost,
    input.settlement,
    account
  );
  const event: ProductionEvent = {
    kind: "issue",
    qty: 0,
    lines: lines.map((l) => ({
      productId: l.productId,
      name: l.name,
      qty: l.qty,
      unitCost: l.unitCost,
      value: l.value,
    })),
    labourCost,
    overheadCost,
    paidFromAccountId,
    value: totalValue,
    entryId: entry.id,
    dayOffset: 0,
    ts: new Date().toISOString(),
  };
  return {
    prepared: { lines, materialsValue, labourCost, overheadCost, entry, paidFromAccountId, event },
  };
}

/**
 * The issue entry (§4.2), through the real `makeEntry` guard:
 *
 *   Dr  wip            (ref: orderId)              M + L + H
 *       Cr  inventory | inventory_raw (per component
 *           class, ref: componentProductId)        M  (one line
 *                                                      per component)
 *       Cr  cash|wallet  (ref: accountId)            L + H  (paid)
 *       Cr  salary_payable                         L + H  (accrued)
 *
 * Components credit the account that HOLDS them
 * (`inventoryAccountFor`, §4.1) — a goods-class component
 * (bottles bought for resale, used to pack a house blend)
 * credits `inventory`, a raw material credits
 * `inventory_raw`, in the same entry.
 */
export function buildIssueEntry(
  order: ProductionOrder,
  lines: ValuedIssueLine[],
  labourCost: number,
  overheadCost: number,
  settlement: "paid" | "accrue",
  account: MoneyAccount | null
): JournalEntry {
  const materials = round2(lines.reduce((a, l) => a + l.value, 0));
  const conversion = round2(labourCost + overheadCost);
  const total = round2(materials + conversion);
  return makeEntry(
    `Production issue — ${order.number ?? order.id} · ${order.outputName}`,
    "production_issue",
    order.id,
    [
      { account: "wip", debit: total, credit: 0, ref: order.id },
      ...lines.map((l) => ({
        account: inventoryAccountFor(l),
        debit: 0,
        credit: l.value,
        ref: l.productId,
      })),
      ...(conversion > 0
        ? [
            settlement === "accrue"
              ? { account: "salary_payable" as const, debit: 0, credit: conversion }
              : {
                  account: account ? glForAccount(account) : ("cash" as const),
                  debit: 0,
                  credit: conversion,
                  ref: account?.id ?? null,
                },
          ]
        : []),
    ]
  );
}

/* ------------------------------------------------------------------ */
/* Completion & scrap: cumulative absorption (§4.2)                   */
/* ------------------------------------------------------------------ */

export type AbsorbProblem =
  | "not_open" // the order is not open (drafts complete nothing; closed orders are final)
  | "bad_qty" // the quantity must be > 0
  | "empty_pool" // nothing in WIP to absorb — the units' materials were never issued
  | "zero_value"; // the absorbed share rounds to nothing — refused, not posted

function absorbShare(
  poolBefore: number,
  plannedRemaining: number,
  qty: number,
  final: boolean
): number {
  if (final) return poolBefore;
  const d = Math.max(plannedRemaining, qty);
  return Math.min(poolBefore, round2((poolBefore * qty) / d));
}

/**
 * The value a completion absorbs, and the unit cost the
 * finished goods take onto the shelf. A completion is FINAL
 * when it reaches the plan (producedBefore + qty >= planned)
 * or the desk flags it final — a final completion absorbs the
 * ENTIRE remaining pool, so an order's completions + scraps +
 * closeouts always sum to its issues to the paisa (§4.2).
 * Over-production is simply a final completion: the whole pool
 * spreads over all units actually produced, which is the
 * truth (the materials were consumed by those units).
 */
export function completionAbsorb(
  order: ProductionOrder,
  qty: number,
  final: boolean
): { problem: AbsorbProblem } | { value: number; unitCost: number } {
  if (order.status !== "open") return { problem: "not_open" };
  if (!(qty > 0)) return { problem: "bad_qty" };
  const poolBefore = poolOf(order);
  if (poolBefore <= 0) return { problem: "empty_pool" };
  const producedBefore = producedQty(order);
  const isFinal = final || producedBefore + qty >= order.plannedQty;
  const value = absorbShare(
    poolBefore,
    Math.max(0, order.plannedQty - producedBefore),
    qty,
    isFinal
  );
  if (value <= 0) return { problem: "zero_value" };
  return { value, unitCost: round2(value / qty) };
}

/** The completion entry: finished goods land at the absorbed
 *  value — Dr `inventory` (finished goods are goods-class by
 *  definition; a raw product can never be a recipe's output,
 *  §3.1) / Cr `wip`, both legs ref'd to the order. */
export function buildCompletionEntry(
  order: ProductionOrder,
  qty: number,
  value: number
): JournalEntry {
  return makeEntry(
    `Production completion — ${order.number ?? order.id} · ${order.outputName} (${qty} units)`,
    "production_complete",
    order.id,
    [
      { account: "inventory", debit: value, credit: 0, ref: order.id },
      { account: "wip", debit: 0, credit: value, ref: order.id },
    ]
  );
}

/**
 * The value a scrap event writes off: the same absorption
 * share a completion of that many units would take
 * (`round2(pool × S / max(plannedQty − producedBefore, S))`,
 * never exceeding the pool). Yield loss needs NO event — a
 * run that yields fewer units simply completes fewer, and the
 * same pool absorbs into fewer units. Scrap exists for goods
 * that WERE produced and then spoiled, and for a ruined
 * in-progress batch whose cost must leave WIP without
 * becoming product (§4.2).
 */
export function scrapAbsorb(
  order: ProductionOrder,
  qty: number
): { problem: AbsorbProblem } | { value: number } {
  if (order.status !== "open") return { problem: "not_open" };
  if (!(qty > 0)) return { problem: "bad_qty" };
  const poolBefore = poolOf(order);
  if (poolBefore <= 0) return { problem: "empty_pool" };
  const value = absorbShare(
    poolBefore,
    Math.max(0, order.plannedQty - producedQty(order)),
    qty,
    false
  );
  if (value <= 0) return { problem: "zero_value" };
  return { value };
}

/** The write-off entry, shared by scrap events and the close
 *  order's closeout residual — both post as refType
 *  "production_scrap" (§6.4): Dr `inventory_loss` /
 *  Cr `wip` (ref: the order). */
export function buildScrapEntry(
  order: ProductionOrder,
  qty: number,
  value: number,
  kind: "scrap" | "closeout"
): JournalEntry {
  const memo =
    kind === "closeout"
      ? `Production close-out — ${order.number ?? order.id} · ${order.outputName} (residual WIP written off)`
      : `Production scrap — ${order.number ?? order.id} · ${order.outputName} (${qty} units)`;
  return makeEntry(memo, "production_scrap", order.id, [
    { account: "inventory_loss", debit: value, credit: 0 },
    { account: "wip", debit: 0, credit: value, ref: order.id },
  ]);
}
