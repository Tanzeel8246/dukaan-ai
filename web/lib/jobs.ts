/**
 * Dukaan AI — Phase C · C5: the job / work-order tracker
 * (design ERP-PHASE-C-DESIGN.md §5). Pure derivations, the
 * stage lifecycle, and EVERY journal composition of the job
 * surface, shared by the store, the jobs desk and the harness
 * so all three agree on the same figures.
 *
 * THE MODEL (§5.1/§5.3): a job's material events are its
 * subledger — append-only per-product records, each written
 * inside its posting batch and citing the ONE journal entry
 * that posted it. Materials consumed by a job POST, because
 * stock physically leaves and invariant 4 has no services
 * exception:
 *
 *   issue:  Dr cogs (ref: job) / Cr inventory | inventory_raw
 *           (per component class, ref: product)
 *   return: the exact mirror (refTypes job_material /
 *           job_material_return)
 *
 * COGS is the honest home — no job WIP account exists (§12.3):
 * the material is consumed cost of work sold, and nothing
 * capitalised could ever be released by a completion event,
 * because a job's output is a deliverable, not stock. A job
 * that manufactures STOCK is a production order (§4).
 *
 * ADVANCES (§5.3 + owner Q2 — POOLED): a job advance is an
 * ordinary customer repayment wearing a job-citing note
 * (`advanceNoteFor`). It rides the EXISTING `addRepayment`
 * machinery — this module composes no repayment entry and no
 * job field stores money — and the job's bill absorbs it
 * through the ordinary F-6 lot, because it is the same
 * customer pool Phase A §4.4 ratified (negative receivables =
 * customer advance).
 *
 * PROFIT (§5.5) is a report, derived here once: revenue from
 * the POSTED bills citing the job, materials from the event
 * log, the bill lines' own COGS from their cost snapshots,
 * labour the job's declared figure.
 */
import { makeEntry } from "./ledger";
import { round2 } from "./tax";
import { qtyAtWarehouse } from "./stock";
import { inventoryAccountFor } from "./transfers";
import type {
  Bill,
  CreditEntry,
  Job,
  JobMaterialEvent,
  Product,
  ShopSettings,
  StockLevel,
  Warehouse,
} from "./types";

/* ------------------------------------------------------------------ */
/* Stages (§5.2)                                                      */
/* ------------------------------------------------------------------ */

/** The default workshop stages, used when the owner has not
 *  set a list. Stage names are shop data — these defaults are
 *  data too (an absent settings list), never dictionary
 *  strings. */
export const DEFAULT_JOB_STAGES: readonly string[] = [
  "Received",
  "In Progress",
  "Ready",
  "Delivered",
];

/** The shop's effective stage list: the owner's settings when
 *  they name at least one stage, else the defaults. Blank
 *  entries are dropped and duplicates collapse (first wins) —
 *  the list the picker offers and the lifecycle derives from. */
export function effectiveJobStages(
  settings: Pick<ShopSettings, "jobStages"> | null | undefined
): string[] {
  const raw = settings?.jobStages ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    const name = typeof s === "string" ? s.trim() : "";
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out.length > 0 ? out : [...DEFAULT_JOB_STAGES];
}

/** Where the job's stage sits in the effective list (−1 when
 *  the owner renamed the list after the job took its stage —
 *  the job keeps the name it carries, §5.2). */
export function jobStageIndex(job: Job, stages: string[]): number {
  return stages.indexOf(job.stage);
}

/**
 * The lifecycle label over the stage position (§5.2):
 * `delivered` and `cancelled` are terminal and sticky — they
 * are set by their explicit actions (Deliver, Cancel, or a
 * citing bill's posting = delivery-with-bill, §5.4) and stage
 * movement never resurrects them. Otherwise the FIRST stage
 * reads `open`, the LAST stage reads `ready`, and anything
 * between (or a stage the list no longer names, once the job
 * has materials or a later position) reads `in_progress`.
 */
export function deriveJobStatus(job: Job, stages: string[]): Job["status"] {
  if (job.status === "delivered" || job.status === "cancelled") {
    return job.status;
  }
  const idx = jobStageIndex(job, stages);
  if (idx === stages.length - 1 && stages.length > 1) return "ready";
  if (idx <= 0) {
    // Stage unknown to the list (renamed away) but the job has
    // visibly started — it is in progress, not newly received.
    if (idx < 0 && (job.materialEvents.length > 0 || job.status !== "open")) {
      return "in_progress";
    }
    return "open";
  }
  return "in_progress";
}

/* ------------------------------------------------------------------ */
/* Material derivations over the event log (§5.3)                     */
/* ------------------------------------------------------------------ */

/** Net quantity of one product consumed by the job: issued −
 *  returned. A return may never exceed this (the store refuses
 *  pre-composition through `prepareMaterialEvent`). */
export function jobMaterialNetQty(job: Job, productId: string): number {
  let net = 0;
  for (const e of job.materialEvents) {
    if (e.productId !== productId) continue;
    net += e.kind === "issue" ? e.qty : -e.qty;
  }
  return Math.round((net + Number.EPSILON) * 1000) / 1000;
}

/** Σ issue values over the job's material log. */
export function jobMaterialsIssuedValue(job: Job): number {
  return round2(
    job.materialEvents
      .filter((e) => e.kind === "issue")
      .reduce((a, e) => a + e.value, 0)
  );
}

/** Σ return values over the job's material log. */
export function jobMaterialsReturnedValue(job: Job): number {
  return round2(
    job.materialEvents
      .filter((e) => e.kind === "return")
      .reduce((a, e) => a + e.value, 0)
  );
}

/** Materials cost of the job (§5.5): Σ issues − Σ returns,
 *  each valued at its own event's shelf-cost snapshot. */
export function jobMaterialsCost(job: Job): number {
  return round2(jobMaterialsIssuedValue(job) - jobMaterialsReturnedValue(job));
}

/* ------------------------------------------------------------------ */
/* Advances (§5.3): the pooled repayment citation                     */
/* ------------------------------------------------------------------ */

/** The note a job advance carries on its repayment row — the
 *  ONLY citation (by design: no job field stores money, and
 *  the repayment is an ordinary `credits` row in the
 *  customer's pool). */
export function advanceNoteFor(job: Pick<Job, "number">): string {
  return `Advance — Job ${job.number}`;
}

/** The repayment rows recorded as advances for this job
 *  (display + the profit surface's context; the money itself
 *  is the pool's, derived by the ledger selectors). */
export function jobAdvanceRows(job: Job, credits: CreditEntry[]): CreditEntry[] {
  const note = advanceNoteFor(job);
  return credits.filter((c) => c.kind === "repayment" && c.note === note);
}

/** Σ of the advances recorded against this job. */
export function jobAdvanceTotal(job: Job, credits: CreditEntry[]): number {
  return round2(jobAdvanceRows(job, credits).reduce((a, c) => a + c.amount, 0));
}

/* ------------------------------------------------------------------ */
/* Revenue & profit (§5.4/§5.5) — derived, defined once               */
/* ------------------------------------------------------------------ */

/** Bill statuses that count as POSTED for revenue: a held bill
 *  has posted nothing, and a voided bill's posting was
 *  reversed whole — neither is revenue the records hold. */
const POSTED_BILL_STATUSES: ReadonlySet<Bill["status"]> = new Set([
  "paid",
  "partially_returned",
  "returned",
]);

/** The posted bills citing this job (the §5.4 conversion
 *  citation), oldest first. */
export function jobBills(job: Job, bills: Bill[]): Bill[] {
  return bills
    .filter(
      (b) =>
        b.sourceType === "job" &&
        b.sourceId === job.id &&
        POSTED_BILL_STATUSES.has(b.status)
    )
    .sort((a, b) => a.ts.localeCompare(b.ts));
}

/** jobRevenue (§5.5): Σ totals of the posted citing bills.
 *  A job billed off-system (delivered without a citing bill)
 *  reports 0 — the truth the records hold. */
export function jobRevenue(job: Job, bills: Bill[]): number {
  return round2(jobBills(job, bills).reduce((a, b) => a + b.total, 0));
}

/** Σ COGS of the citing bills' OWN lines (their unitCost
 *  snapshots × qty) — separate from job materials, which
 *  already left the shelf through §5.3 and are never re-billed
 *  as lines (the desk discipline; this selector does not
 *  attempt to police it beyond the §5.5 definition). */
export function jobBillCogs(job: Job, bills: Bill[]): number {
  return round2(
    jobBills(job, bills).reduce(
      (a, b) => a + b.items.reduce((x, it) => x + round2(it.unitCost * it.qty), 0),
      0
    )
  );
}

export interface JobProfitFigures {
  revenue: number;
  materials: number;
  billCogs: number;
  labour: number;
  profit: number;
}

/** jobProfit (§5.5): revenue − materials − declared labour −
 *  the citing bills' own line COGS. A management figure in
 *  the same gross terms the desk quoted the customer (citing
 *  bills' totals carry their A4 tax treatment inside them). */
export function jobProfitFigures(job: Job, bills: Bill[]): JobProfitFigures {
  const revenue = jobRevenue(job, bills);
  const materials = jobMaterialsCost(job);
  const billCogs = jobBillCogs(job, bills);
  const labour = round2(job.labourCost || 0);
  return {
    revenue,
    materials,
    billCogs,
    labour,
    profit: round2(revenue - materials - billCogs - labour),
  };
}

/* ------------------------------------------------------------------ */
/* Material events: validation + valuation (pre-composition, §5.3)  */
/* ------------------------------------------------------------------ */

export type MaterialProblem =
  | "not_active" // a delivered/cancelled job takes no material events
  | "empty_lines" // nothing picked
  | "unknown_product" // a picked product does not exist
  | "bad_qty" // a quantity must be > 0
  | "insufficient" // the job warehouse's row cannot cover an issue
  | "over_return" // returning more than the job still holds of a product
  | "zero_value"; // the event would move no value — nothing to post

export interface ValuedMaterialLine {
  productId: string;
  name: string;
  qty: number;
  unitCost: number; // the shelf cost in force at the event
  value: number; // round2(qty × unitCost)
  /** The product's stock class at the event — the entry's
   *  inventory leg names the account that holds it
   *  (`inventoryAccountFor`, §4.1). Composition detail only. */
  stockClass?: "raw" | null;
}

export interface PreparedMaterialEvent {
  lines: ValuedMaterialLine[];
  value: number;
  /** The journal entry that posts this event — composed here,
   *  through the real `makeEntry` guard, so the store gains
   *  no new posting path. */
  entry: ReturnType<typeof makeEntry>;
  /** The event records themselves (one per product, all
   *  citing the one entry). */
  events: JobMaterialEvent[];
}

/**
 * Validate, value and compose a material issue/return BEFORE
 * anything is written (B's pre-composition refusal
 * discipline): the store either commits the returned
 * preparation whole — entry, events, row movements — or
 * writes nothing at all.
 *
 * Lines are valued at the products' CURRENT shelf `costPrice`
 * (the convention COGS and adjustments already use). An issue
 * validates each product against the JOB warehouse's row
 * through the §1.3 resolution rule — another warehouse's
 * stock is never silently reached for. A return validates
 * against the job's own net-issued quantity per product:
 * only what the job still holds can come back.
 */
export function prepareMaterialEvent(
  job: Job,
  products: Product[],
  levels: StockLevel[],
  warehouses: Warehouse[],
  kind: "issue" | "return",
  picks: Array<{ productId: string; qty: number }>
): { problem: MaterialProblem; productId?: string } | { prepared: PreparedMaterialEvent } {
  if (job.status === "delivered" || job.status === "cancelled") {
    return { problem: "not_active" };
  }
  if (!picks || picks.length === 0) return { problem: "empty_lines" };

  const byId = new Map(products.map((p) => [p.id, p]));
  const merged = new Map<string, number>();
  for (const pick of picks) {
    if (!byId.has(pick.productId)) {
      return { problem: "unknown_product", productId: pick.productId };
    }
    if (!Number.isFinite(pick.qty) || pick.qty <= 0) {
      return { problem: "bad_qty", productId: pick.productId };
    }
    merged.set(pick.productId, (merged.get(pick.productId) ?? 0) + pick.qty);
  }
  if (merged.size === 0) return { problem: "empty_lines" };

  const lines: ValuedMaterialLine[] = [];
  let value = 0;
  for (const [productId, qty] of merged) {
    const p = byId.get(productId);
    if (!p) return { problem: "unknown_product", productId };
    if (kind === "issue") {
      const onHand = qtyAtWarehouse(p, levels, warehouses, job.warehouseId);
      if (qty > onHand + 1e-9) return { problem: "insufficient", productId };
    } else {
      const held = jobMaterialNetQty(job, productId);
      if (qty > held + 1e-9) return { problem: "over_return", productId };
    }
    const lineValue = round2(qty * p.costPrice);
    lines.push({
      productId,
      name: p.name,
      qty,
      unitCost: p.costPrice,
      value: lineValue,
      stockClass: p.stockClass ?? null,
    });
    value += lineValue;
  }
  value = round2(value);
  if (value <= 0) return { problem: "zero_value" };

  const entry = buildMaterialEntry(job, kind, lines);
  const ts = new Date().toISOString();
  const events: JobMaterialEvent[] = lines.map((l) => ({
    kind,
    productId: l.productId,
    name: l.name,
    qty: l.qty,
    unitCost: l.unitCost,
    value: l.value,
    entryId: entry.id,
    dayOffset: 0,
    ts,
  }));
  return { prepared: { lines, value, entry, events } };
}

/**
 * The material entry (§5.3), through the real `makeEntry`
 * guard:
 *
 *   issue:  Dr  cogs        (ref: jobId)                    V
 *               Cr  inventory | inventory_raw (per class,
 *                   ref: productId)                       V (per line)
 *   return: Dr  inventory | inventory_raw (per class)      V
 *               Cr  cogs      (ref: jobId)                    V
 *
 * refTypes `job_material` / `job_material_return` (§6.4).
 */
export function buildMaterialEntry(
  job: Job,
  kind: "issue" | "return",
  lines: ValuedMaterialLine[]
): ReturnType<typeof makeEntry> {
  const total = round2(lines.reduce((a, l) => a + l.value, 0));
  const inventoryLegs = lines.map((l) => ({
    account: inventoryAccountFor(l),
    debit: kind === "return" ? l.value : 0,
    credit: kind === "issue" ? l.value : 0,
    ref: l.productId,
  }));
  const cogsLeg = {
    account: "cogs" as const,
    debit: kind === "issue" ? total : 0,
    credit: kind === "return" ? total : 0,
    ref: job.id,
  };
  return makeEntry(
    kind === "issue"
      ? `Job materials — ${job.number} · ${job.title}`
      : `Job materials returned — ${job.number} · ${job.title}`,
    kind === "issue" ? "job_material" : "job_material_return",
    job.id,
    kind === "issue" ? [cogsLeg, ...inventoryLegs] : [...inventoryLegs, cogsLeg]
  );
}
