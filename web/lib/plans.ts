/**
 * Dukaan AI — Phase G · G2 plan catalogue + derived plan state +
 * counter arithmetic (design: ERP-PHASE-G-DESIGN §3/§4/§6).
 *
 * Pure functions only — no Firebase, no store, no DOM — so the
 * harness can prove the G2 contract (catalogue partition, the
 * plan-state truth table, counter integrity, the caps) against the
 * same code the clients run, and the rules (v9 part 2) mirror the
 * derivations here expression for expression.
 *
 * Doctrine carried from the design:
 *  - The CATALOGUE lives in code (§3.2); what enforcement consumes
 *    is the ASSIGNMENT SNAPSHOT on the businesses doc, never the
 *    live catalogue — a catalogue change never re-limits a paying
 *    shop mid-period. Prices below are display data marked
 *    owner-to-confirm (design Q1 anchors: the owner's published
 *    MC-MMS price points); changing a price is a release.
 *  - Plan STATE is derived, never stored (invariant 3): a pure
 *    function of the registry doc + now. The rules derive the same
 *    state from the same fields against request.time; G5's Dart
 *    port will assert the same truth table against shared
 *    fixtures.
 *  - Counters are kept exact by the writes that change the truth:
 *    an invoice event rides its posting batch (§4.2); a seat is
 *    counted when the invite creates it and freed when the
 *    removal deletes it. memberCount therefore counts SEATS —
 *    the owner doc's staffEmails mirror, whose size the G1
 *    migration baseline already records — and the claim leg
 *    checks the cap against it (the claimant's seat is already
 *    counted; the owner is the +1). A membership doc is the
 *    claimed subset of the seats.
 *  - A VOIDED bill keeps its count: the invoice was issued, the
 *    counter arithmetic (§4.2) admits no decrease except the
 *    month roll, and voiding is a commercial correction carried
 *    by reversing journal entries — never by quota refunds.
 */

import type { PermModule } from "./permissions";
import type { JournalRefType } from "./types";
import {
  pktMonthKey,
  countMonthlyInvoiceEvents,
  TRIAL_DAYS,
  type BusinessCountersDoc,
  type BusinessRegistryDoc,
  type PlanSnapshot,
} from "./tenancy";

/* ------------------------------------------------------------------ */
/* Module sets (§3.3) — the PermModules, partitioned exactly once   */
/* (40 through Phase G; H · H1 adds `loyalty` → 41; H · H3 adds     */
/* `storefront` → 42; H · WhatsApp adds `whatsapp` → 43)            */
/* ------------------------------------------------------------------ */

export type ModulesTier = "core" | "standard" | "advanced";

export const TIER_RANK: Record<ModulesTier, number> = {
  core: 1,
  standard: 2,
  advanced: 3,
};

export function tierRankOf(tier: string): number {
  return TIER_RANK[tier as ModulesTier] ?? 0;
}

/** Core (Basic and up): the trading desk itself. Print design +
 *  brand assets ride with Core (§3.3 honesty note i) — they are
 *  settings surfaces, not PermModules, so nothing lists them. */
export const CORE_MODULES: PermModule[] = [
  "dashboard", "salesCounter", "billing", "billingVoid", "returns",
  "inventoryView", "inventoryCost", "inventoryManage", "stockAdjustments",
  "forecast", "suppliersManage", "supplierPayments", "customersManage",
  "creditGive", "creditRepayment", "expenses", "finance", "accountsManage",
  "transfers", "dayClose", "dayCloseHistory", "assistant", "settingsProfile",
  "staffManage", "taxSlabs", "periods",
];

/** + Documents (Standard and up). */
export const DOCUMENTS_MODULES: PermModule[] = [
  "quotations", "saleOrders", "purchaseOrders", "creditDebitNotes",
  "vouchers", "cheques",
];

/** + Operations (Standard and up). */
export const OPERATIONS_MODULES: PermModule[] = ["warehouses", "jobTracker"];

/** + Growth (Standard and up) — Phase H's rows (Phase H design
 *  §5.1). H1 lands `loyalty`; the WhatsApp row joins this same
 *  set with its increment, by catalogue release. A catalogue
 *  change never re-limits a shop mid-period: snapshots govern
 *  (§3.2) — a shop whose snapshot predates this release keeps
 *  exactly its snapshotted set until renewal/assignment. */
export const GROWTH_MODULES: PermModule[] = ["loyalty", "whatsapp"];

/** + Advanced (Advanced and up). Phase H · H3 adds `storefront`
 *  here (design §2.6/§5.1): the phase's only public-internet
 *  surface sits on the tier whose price carries its support and
 *  abuse surface. */
export const ADVANCED_MODULES: PermModule[] = [
  "manufacturing", "staffDirectory", "payroll", "loans", "fiscalClose",
  "trialBalanceExports", "storefront",
];

/** Cumulative module set per tier key (the snapshot's modulesTier). */
export const MODULE_SETS: Record<ModulesTier, PermModule[]> = {
  core: [...CORE_MODULES],
  standard: [
    ...CORE_MODULES, ...DOCUMENTS_MODULES, ...OPERATIONS_MODULES,
    ...GROWTH_MODULES,
  ],
  advanced: [
    ...CORE_MODULES, ...DOCUMENTS_MODULES, ...OPERATIONS_MODULES,
    ...GROWTH_MODULES, ...ADVANCED_MODULES,
  ],
};

export function tierIncludesModule(
  tier: string,
  module: PermModule
): boolean {
  const set = MODULE_SETS[tier as ModulesTier];
  return set ? set.includes(module) : false;
}

/** The lowest tier whose set contains the module ("core" when the
 *  module is in Core, etc.) — the locked door's label source. */
export function moduleMinTier(module: PermModule): ModulesTier {
  if (ADVANCED_MODULES.includes(module)) return "advanced";
  if (
    DOCUMENTS_MODULES.includes(module) || OPERATIONS_MODULES.includes(module) ||
    GROWTH_MODULES.includes(module)
  ) {
    return "standard";
  }
  return "core";
}

/* ------------------------------------------------------------------ */
/* The catalogue (§3.1) — structure the owner's; figures proposed     */
/* ------------------------------------------------------------------ */

export type PlanId =
  | "trial" | "basic" | "standard" | "advanced" | "enterprise" | "founding";

export interface PlanTier {
  planId: PlanId;
  tierRank: number;
  modulesTier: ModulesTier;
  /** Snapshot defaults; null = unlimited (fixed at assignment). */
  usersLimit: number | null;
  invoiceLimit: number | null;
  /** PKR / month — DISPLAY data, owner-to-confirm (design Q1). */
  priceMonthlyPKR: number | null;
}

export const PLAN_CATALOGUE: Record<PlanId, PlanTier> = {
  /* 14 days once per business, Standard's module set, a 200-invoice
   * TOTAL pool (not per-month — §3.1), 2 users incl. the owner. */
  trial: {
    planId: "trial", tierRank: 0, modulesTier: "standard",
    usersLimit: 2, invoiceLimit: 200, priceMonthlyPKR: 0,
  },
  basic: {
    planId: "basic", tierRank: 1, modulesTier: "core",
    usersLimit: 3, invoiceLimit: 500, priceMonthlyPKR: 1500,
  },
  standard: {
    planId: "standard", tierRank: 2, modulesTier: "standard",
    usersLimit: 5, invoiceLimit: 2000, priceMonthlyPKR: 2500,
  },
  advanced: {
    planId: "advanced", tierRank: 3, modulesTier: "advanced",
    usersLimit: 10, invoiceLimit: 10000, priceMonthlyPKR: 4000,
  },
  /* Custom-quoted: the limits are set INTO the snapshot at
   * assignment (G3 console); the catalogue carries no defaults. */
  enterprise: {
    planId: "enterprise", tierRank: 4, modulesTier: "advanced",
    usersLimit: null, invoiceLimit: null, priceMonthlyPKR: null,
  },
  /* The §7.3 comp for pre-G shops: Advanced's set and limits, no
   * expiry. Not purchasable; assignment-only. */
  founding: {
    planId: "founding", tierRank: 3, modulesTier: "advanced",
    usersLimit: 10, invoiceLimit: 10000, priceMonthlyPKR: null,
  },
};

/** Annual billing = 10 × monthly (two months free) — a period
 *  length at assignment, nothing more exotic (§3.1). */
export const ANNUAL_MONTHS_CHARGED = 10;

/**
 * Build an assignment snapshot from the catalogue (design §3.2).
 * `periodTo` is the paid period's end (null for trial/founding);
 * a trial's end rides `trialEndsAt` exactly as G1's birth shape.
 * Explicit limits override the catalogue defaults (the Enterprise
 * assignment case); a null catalogue limit with no override stays
 * null in the snapshot and every consumer reads null as unlimited.
 */
export function snapshotFor(
  planId: PlanId,
  nowISO: string,
  opts: {
    periodTo?: string | null;
    usersLimit?: number | null;
    invoiceLimit?: number | null;
    assignedBy: PlanSnapshot["assignedBy"];
  }
): PlanSnapshot {
  const tier = PLAN_CATALOGUE[planId];
  const base: PlanSnapshot = {
    planId,
    tierRank: tier.tierRank,
    usersLimit:
      opts.usersLimit !== undefined ? opts.usersLimit ?? 0 : tier.usersLimit ?? 0,
    invoiceLimit:
      opts.invoiceLimit !== undefined ? opts.invoiceLimit ?? 0 : tier.invoiceLimit ?? 0,
    modulesTier: tier.modulesTier,
    periodFrom: nowISO,
    periodTo: opts.periodTo ?? null,
    trialEndsAt: null,
    assignedBy: opts.assignedBy,
    assignedAt: nowISO,
  };
  if (planId === "trial") {
    base.trialEndsAt = new Date(
      new Date(nowISO).getTime() + TRIAL_DAYS * 86400000
    ).toISOString();
    base.periodTo = null;
  }
  if (planId === "founding") {
    base.periodTo = null;
    base.trialEndsAt = null;
  }
  return base;
}

/* ------------------------------------------------------------------ */
/* Derived plan state (§3.6) — the truth table                         */
/* ------------------------------------------------------------------ */

export type PlanState =
  | "none"      // no registry doc — a pre-G shop; nothing gates
  | "trial"
  | "active"
  | "grace"     // period/trial ended ≤ 30 days ago: read-only runway
  | "readonly"  // ended > 30 days ago: reads forever, no posting
  | "suspended" // a platform act (G3 console); overlays every state
  | "founding"; // the comp: no expiry, never state-limited

export const GRACE_DAYS = 30;

/**
 * THE plan-state function. Pure in (registry, now); the rules
 * derive the identical state from the same fields (status,
 * plan.planId / periodTo / trialEndsAt) against request.time —
 * the boundary semantics are: the end instant itself still
 * belongs to the period (now <= end), grace runs through
 * end + 30 days inclusive, readonly begins 1ms later.
 * Suspension overlays everything, founding never expires.
 * A paid-shaped snapshot without dates cannot be born (§4.3) or
 * assigned (G3); should one ever be read, it resolves "active"
 * rather than bricking a trading shop on a data wart.
 */
export function derivePlanState(
  registry: Pick<BusinessRegistryDoc, "status" | "plan"> | null,
  nowISO: string
): PlanState {
  if (!registry) return "none";
  if (registry.status === "suspended") return "suspended";
  const plan = registry.plan;
  if (!plan || plan.planId === "founding") return "founding";
  const end = plan.periodTo ?? plan.trialEndsAt;
  if (end == null) return "active";
  const now = new Date(nowISO).getTime();
  const endMs = new Date(end).getTime();
  if (now <= endMs) return plan.periodTo != null ? "active" : "trial";
  if (now <= endMs + GRACE_DAYS * 86400000) return "grace";
  return "readonly";
}

/** States in which posting creates are allowed (§3.6's table).
 *  "none" (pre-G) and "founding" post without limit-of-state;
 *  the caps are a separate check (invoiceEventAllowed). */
export function stateAllowsPosting(state: PlanState): boolean {
  return (
    state === "none" || state === "trial" || state === "active" ||
    state === "founding"
  );
}

/**
 * The RULES' plan-postable, mirrored: enforcement is staged
 * (§6.3) — while the registry's `enforce` is false the rules
 * observe and pass, whatever the derived state. Only an
 * admin-flipped business is ever refused on plan grounds.
 */
export function rulesPlanPostable(
  registry: Pick<BusinessRegistryDoc, "status" | "plan" | "enforce"> | null,
  nowISO: string
): boolean {
  if (!registry || registry.enforce !== true) return true;
  return stateAllowsPosting(derivePlanState(registry, nowISO));
}

/* ------------------------------------------------------------------ */
/* Counter arithmetic (§4.2) — the rules' transitions, mirrored       */
/* ------------------------------------------------------------------ */

/**
 * The counter write an INVOICE EVENT's batch carries. Trial is
 * the one special case: the trial limit is a TOTAL pool (§3.1),
 * so a trial counter never rolls — its invoiceMonth stays the
 * birth month and the count accumulates across the (at most one)
 * month boundary a 14-day trial can cross. Every other plan:
 * same PKT month ⇒ +1; a new PKT month ⇒ the roll
 * { invoiceMonth: <current>, invoiceCount: 1 }. memberCount and
 * any baseline marker ride unchanged.
 */
export function nextInvoiceCounter(
  counters: BusinessCountersDoc,
  plan: PlanSnapshot | null,
  nowISO: string
): BusinessCountersDoc {
  if (plan?.planId === "trial") {
    return { ...counters, invoiceCount: counters.invoiceCount + 1 };
  }
  const month = pktMonthKey(nowISO);
  if (month === counters.invoiceMonth) {
    return { ...counters, invoiceCount: counters.invoiceCount + 1 };
  }
  return { ...counters, invoiceMonth: month, invoiceCount: 1 };
}

/** The counter write a SEAT event's batch carries: +1 when an
 *  invite creates the seat, −1 (floored at 0) when a removal
 *  deletes it. Invoice fields ride unchanged. */
export function nextMemberCounter(
  counters: BusinessCountersDoc,
  delta: 1 | -1
): BusinessCountersDoc {
  return {
    ...counters,
    memberCount: Math.max(0, counters.memberCount + delta),
  };
}

export type CounterTransitionKind = "invoice" | "member-plus" | "member-minus";

/**
 * The counter doc's OWN update rule, mirrored (v9 part 2): an
 * update is legal iff it changes exactly one counter family by
 * exactly the legal arithmetic —
 *   invoice: same month & count+1, OR a forward month roll to
 *            count 1 (months move forward only; the client
 *            computes the true PKT month — pktMonthKey — and a
 *            roll to any other month is a client bug the pairing
 *            legs + the admin's counter surface make visible);
 *   member:  count ±1 (never below 0);
 * and NOTHING else changes (the baseline marker included).
 */
export function counterTransitionOk(
  before: BusinessCountersDoc,
  after: BusinessCountersDoc,
  kind: CounterTransitionKind
): boolean {
  const sameMember = after.memberCount === before.memberCount;
  const sameInvoice =
    after.invoiceMonth === before.invoiceMonth &&
    after.invoiceCount === before.invoiceCount;
  const sameBaseline = (after.baseline ?? null) === (before.baseline ?? null);
  if (!sameBaseline) return false;
  if (kind === "invoice") {
    if (!sameMember) return false;
    if (
      after.invoiceMonth === before.invoiceMonth &&
      after.invoiceCount === before.invoiceCount + 1
    ) {
      return true;
    }
    return after.invoiceMonth > before.invoiceMonth && after.invoiceCount === 1;
  }
  if (!sameInvoice) return false;
  return kind === "member-plus"
    ? after.memberCount === before.memberCount + 1
    : after.memberCount === before.memberCount - 1 && after.memberCount >= 0;
}

/**
 * The invoice-event leg, mirrored (what bills/sales creates check
 * via getAfter under enforcement): the batch's counter write is
 * the legal invoice transition AND the resulting count does not
 * exceed the snapshot's invoiceLimit (the trial pool in trial —
 * the same comparison, since a trial counter never rolls).
 * A null snapshot limit is unlimited (Enterprise by assignment
 * may still store a number; 0/absent in a snapshot means the
 * catalogue default was unlimited — read as unlimited here,
 * matching snapshotFor's null→0 storage only when the tier
 * itself is unlimited: enterprise/founding handled by callers
 * passing the raw snapshot; see planGate).
 */
export function invoiceEventAllowed(
  before: BusinessCountersDoc,
  after: BusinessCountersDoc,
  snapshot: PlanSnapshot
): boolean {
  if (!counterTransitionOk(before, after, "invoice")) return false;
  if (snapshot.invoiceLimit > 0 && after.invoiceCount > snapshot.invoiceLimit) {
    return false;
  }
  return true;
}

/** The user cap, mirrored (checked on the invite-claim leg in
 *  rules): seats (memberCount — the claimant's seat is already
 *  counted, it was created by the invite) + the owner must fit
 *  the snapshot's usersLimit. A 0/absent limit is unlimited. */
export function memberCapOk(
  counters: BusinessCountersDoc,
  snapshot: PlanSnapshot
): boolean {
  if (snapshot.usersLimit > 0 && counters.memberCount + 1 > snapshot.usersLimit) {
    return false;
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* Tier gates for posting paths (§4.1)                                 */
/* ------------------------------------------------------------------ */

/** Journal refTypes whose module sits above Core: a journal
 *  create carrying one is tier-checked against the snapshot.
 *  Everything not listed is Core (the trading desk's own postings:
 *  bill, sale, return, purchase, expense, credit, repayment,
 *  cashbook, adjustment, transfer (money), tax_payment, seed…). */
export const REFTYPE_MIN_TIER: Partial<Record<JournalRefType, ModulesTier>> = {
  /* Documents set */
  purchase_return: "standard",
  cheque_clearing: "standard",
  cheque_bounce: "standard",
  cheque_return: "standard",
  /* Operations set */
  job_material: "standard",
  job_material_return: "standard",
  transfer_loss: "standard",
  /* Growth set (Phase H design §5.2, named amendment 1): the
   * expiry release is the loyalty family's one desk-posted act,
   * gated at the tier that holds the module. `loyalty_earn` is
   * deliberately ABSENT — earns and clawbacks ride the bill /
   * return flows, whose own refTypes (bill / return) are Core,
   * exactly as redemption rides inside the bill entry. This map
   * is the client mirror; rules v10 (H2) carries the same line. */
  loyalty_expire: "standard",
  /* Advanced set */
  production_issue: "advanced",
  production_complete: "advanced",
  production_scrap: "advanced",
  payroll_accrual: "advanced",
  payroll_payment: "advanced",
  salary_advance: "advanced",
  loan_drawdown: "advanced",
  loan_charge: "advanced",
  loan_repayment: "advanced",
  fy_close: "advanced",
};

export function refTypeTierOk(
  snapshot: PlanSnapshot,
  refType: string
): boolean {
  const need = REFTYPE_MIN_TIER[refType as JournalRefType];
  if (!need) return true;
  return tierRankOf(snapshot.modulesTier) >= TIER_RANK[need];
}

/** Operational collections whose CREATE is tier-checked in rules
 *  (§4.1's named list: the above-tier non-posting modules).
 *  Document-chain collections are surface-gated client-side; the
 *  money they move is journal-gated by refType above. */
export const COLLECTION_CREATE_TIER: Record<string, ModulesTier> = {
  boms: "advanced",
  productionOrders: "advanced",
  employees: "advanced",
  payrollRuns: "advanced",
  loans: "advanced",
  jobs: "standard",
};

export function collectionTierOk(
  snapshot: PlanSnapshot,
  collection: string
): boolean {
  const need = COLLECTION_CREATE_TIER[collection];
  if (!need) return true;
  return tierRankOf(snapshot.modulesTier) >= TIER_RANK[need];
}

/* ------------------------------------------------------------------ */
/* The client gate + observation view (§4.1/§4.2, §6.3)                */
/* ------------------------------------------------------------------ */

export type PlanRefusal = "state" | "invoice-cap" | "member-cap";

export interface PlanGate {
  state: PlanState;
  /** What the RULES would do with a posting create right now:
   *  refusal happens only under an admin-flipped `enforce`. */
  postable: boolean;
  refusal: PlanRefusal | null;
  /** The projected count AFTER one more invoice event. */
  invoiceCountAfter: number;
  invoiceLimit: number; // 0 = unlimited
  membersTotal: number; // seats + owner
  usersLimit: number; // 0 = unlimited
}

/**
 * The store guard's pre-check (§4.2): the same derivation the
 * rules run, so a refusal is explained BEFORE the attempt, in
 * the shopkeeper's language, with the renewal path attached —
 * never as a raw rules error after the fact. While `enforce`
 * is false nothing is refused (observation mode, §6.3); the
 * counters still ride every batch so the platform can watch
 * them track the truth before flipping.
 */
export function planGate(
  registry: BusinessRegistryDoc | null,
  counters: BusinessCountersDoc | null,
  nowISO: string
): PlanGate {
  const state = derivePlanState(registry, nowISO);
  const snapshot = registry?.plan ?? null;
  const invoiceLimit = snapshot?.invoiceLimit ?? 0;
  const usersLimit = snapshot?.usersLimit ?? 0;
  const invoiceCountAfter =
    counters && snapshot
      ? nextInvoiceCounter(counters, snapshot, nowISO).invoiceCount
      : 0;
  const membersTotal = (counters?.memberCount ?? 0) + 1;
  let refusal: PlanRefusal | null = null;
  if (registry?.enforce === true) {
    if (!stateAllowsPosting(state)) refusal = "state";
    else if (
      counters && snapshot &&
      !invoiceEventAllowed(
        counters,
        nextInvoiceCounter(counters, snapshot, nowISO),
        snapshot
      )
    ) {
      refusal = "invoice-cap";
    }
  }
  return {
    state,
    postable: refusal === null,
    refusal,
    invoiceCountAfter,
    invoiceLimit,
    membersTotal,
    usersLimit,
  };
}

/** The observation surface's derived-actual side (settings /
 *  platform panel): the counts computed from the shop's own
 *  collections, to stand next to the counters they should equal
 *  (the R-G1 tracking proof). Members' actual = the mirror's
 *  size; invoices' actual = this PKT month's invoice events —
 *  or, in trial, the pool consumed since the trial began (all
 *  non-held bills + counter sales since periodFrom, the pool's
 *  own window). */
export function deriveActualCounters(
  bills: Array<{ ts: string; status?: string }>,
  sales: Array<{ ts: string; billId?: string | null; kind?: string }>,
  staffEmails: string[],
  registry: Pick<BusinessRegistryDoc, "plan"> | null,
  nowISO: string
): { invoiceCount: number; memberCount: number } {
  const memberCount = staffEmails.length;
  if (registry?.plan?.planId === "trial") {
    const from = registry.plan.periodFrom;
    let n = 0;
    for (const b of bills) if (b.status !== "held" && b.ts >= from) n++;
    for (const s of sales) {
      if (s.billId != null) continue;
      if (s.kind != null && s.kind !== "sale") continue;
      if (s.ts >= from) n++;
    }
    return { invoiceCount: n, memberCount };
  }
  return {
    invoiceCount: countMonthlyInvoiceEvents(bills, sales, pktMonthKey(nowISO)),
    memberCount,
  };
}

/* ---------------- the store-facing view + refusals ---------------- */

/** What the UI consumes (design §3/§6.3): the assignment
 *  snapshot, the enforcement flag, the DERIVED state, and the
 *  live counters — one object, rebuilt whenever any input moves.
 *  Null outside a registered cloud business (demo, pre-G), where
 *  every plan surface stays dark and every gate passes. */
export interface PlanView {
  snapshot: PlanSnapshot;
  enforce: boolean;
  suspended: boolean;
  state: PlanState;
  counters: BusinessCountersDoc | null;
}

export function planViewOf(
  registry: BusinessRegistryDoc,
  counters: BusinessCountersDoc | null,
  nowISO: string,
): PlanView {
  return {
    snapshot: registry.plan,
    enforce: registry.enforce,
    suspended: registry.status === "suspended",
    state: derivePlanState(registry, nowISO),
    counters,
  };
}

/** The invoice-event pre-check (postBill / recordSale): planGate's
 *  refusal, verbatim — state first, then the cap, only ever under
 *  enforcement (§4.2: the client refuses FIRST, with mapped copy,
 *  so a rules denial never surfaces as a raw error). */
export function planInvoiceRefusal(
  registry: BusinessRegistryDoc | null,
  counters: BusinessCountersDoc | null,
  nowISO: string,
): PlanRefusal | null {
  return planGate(registry, counters, nowISO).refusal;
}

/** The member pre-check (addStaff): the prospective seat must
 *  fit the cap — memberCapOk read over the counter AS THE
 *  INVITE WOULD LEAVE IT (the seat counted, then seats + owner
 *  against usersLimit). No counter doc yet: nothing to measure,
 *  nothing refused. */
export function planMemberRefusal(
  registry: BusinessRegistryDoc | null,
  counters: BusinessCountersDoc | null,
): PlanRefusal | null {
  if (!registry || registry.enforce !== true || !counters) return null;
  return memberCapOk(nextMemberCounter(counters, 1), registry.plan)
    ? null
    : "member-cap";
}
