/**
 * Dukaan AI — Phase G · G3 super-admin console core
 * (design: ERP-PHASE-G-DESIGN §2/§3.5/§6.1/§8-G3).
 *
 * Pure functions only — no Firebase, no store, no DOM — so the
 * harness can prove the console's contract (the privacy closed
 * list, the aggregates, and above all the audit law: EVERY act
 * plan carries its businessEvents entry in the same plan, and a
 * refused act plans ZERO writes) against the same code the
 * console runs. The console components translate the plans below
 * into Firestore batches; nothing here writes.
 *
 * Doctrine (§2.3): the platform's window into a business is a
 * CLOSED list — registry fields the owner supplies, the hard
 * counters (rules-verified, §4.2), soft telemetry the shop's own
 * app reports (always labelled soft), and the platform's own
 * paperwork (plans, payments, events). This module imports
 * nothing from the tenant namespace and names no tenant path:
 * CONSOLE_READ_COLLECTIONS is the whole of what the console may
 * read, and the harness asserts the set stays closed.
 */

import {
  snapshotFor,
  derivePlanState,
  ANNUAL_MONTHS_CHARGED,
  PLAN_CATALOGUE,
  type PlanId,
  type PlanState,
} from "./plans";
import {
  pktMonthKey,
  type BusinessCountersDoc,
  type BusinessEventDoc,
  type BusinessRegistryDoc,
  type PlanSnapshot,
  type PlatformWrite,
} from "./tenancy";

/** Fix Round 2 · FR2: the console's business key — the registry
 *  doc id when the console carries it (PlatformData always does
 *  since FR2), falling back to ownerUid for legacy fixtures and
 *  harness fixtures that predate the field. For a legacy
 *  business the two coincide; for a generated business only the
 *  doc id is correct — ownerUid there is the CREATOR's uid, and
 *  two businesses of one owner share it. */
export function consoleBusinessId(
  b: BusinessRegistryDoc & { businessId?: string }
): string {
  return b.businessId ?? b.ownerUid;
}

/* ------------------------------------------------------------------ */
/* Shapes (§1.2 — the collections G3's rules span lands)               */
/* ------------------------------------------------------------------ */

/** Soft telemetry (§2.3): best-effort, written by the business's
 *  owner-role sessions, ALWAYS labelled "reported by the shop's
 *  app" where shown. Magnitudes for support — never billing
 *  truth (that is BusinessCountersDoc, rules-verified). */
export interface BusinessStatsDoc {
  lastActiveAt: string | null;
  lastDayCloseAt: string | null;
  docCounts: { products: number; bills: number; customers: number };
  /** Client versions seen (web build / app versions). */
  versions: string[];
}

export type PlatformPaymentMethod =
  | "raast" | "jazzcash" | "easypaisa" | "bank" | "cash";

export type PlatformPaymentState = "submitted" | "confirmed" | "rejected";

/** A renewal record (§3.5): the owner submits it after paying
 *  out-of-band; a platform admin confirms (which extends the
 *  period + refreshes the snapshot, same batch) or rejects with
 *  a note the owner sees. `id` is the doc id, attached by the
 *  reading client — it is not a stored field. */
export interface PlatformPaymentDoc {
  id?: string;
  businessId: string;
  amount: number;
  method: PlatformPaymentMethod;
  reference: string;
  periodFrom: string;
  periodTo: string;
  planId: PlanId;
  state: PlatformPaymentState;
  submittedBy: string;
  confirmedBy: string | null;
  submittedAt: string;
  confirmedAt: string | null;
  /** The admin's settlement note (the rules' pinned update
   *  diff carries exactly this field) — on a rejection, the
   *  note the owner sees (§3.5). */
  note?: string;
  /** G4 (additive): the billing period the owner bought —
   *  "monthly" or "annual" (annual = 12 months at 10 × the
   *  monthly price, §3.1). Older records predate the field;
   *  paymentAmountCheck infers their span from the dates. */
  billingPeriod?: "monthly" | "annual";
  /** G4 (additive): the owner's own submission note (their
   *  slip reference text) — distinct from `note`, which the
   *  settlement writes. */
  ownerNote?: string;
}

/** Platform display data (§6.1): the payment instructions and
 *  support contact the renewal surface shows shopkeepers —
 *  text the admin maintains, no gateway behind it. A single
 *  doc (`platformConfig/main`); every field is display text,
 *  and an empty field simply does not render on the shop side. */
export interface PlatformConfigDoc {
  raastNumber: string;
  iban: string;
  bankName: string;
  accountTitle: string;
  /** Free-text instructions, shown verbatim. */
  instructions: string;
  supportContact: string;
  updatedBy: string;
  updatedAt: string;
}

export const PLATFORM_CONFIG_DOC_ID = "main";

export const EMPTY_PLATFORM_CONFIG: PlatformConfigDoc = {
  raastNumber: "",
  iban: "",
  bankName: "",
  accountTitle: "",
  instructions: "",
  supportContact: "",
  updatedBy: "",
  updatedAt: "",
};

/** The super-admin grant (§2.1). The FIRST doc is created by the
 *  owner by hand in the Firebase console — there is no client
 *  path that mints the first admin. `uid` is the doc id,
 *  attached by the reading client. */
export interface PlatformAdminDoc {
  uid?: string;
  email: string;
  addedAt: string;
  addedBy: string;
}

/* ------------------------------------------------------------------ */
/* The closed read list (§2.3)                                         */
/* ------------------------------------------------------------------ */

/** Every top-level collection the console reads — the whole
 *  list. Adding a name here is a design change (§2.3), and the
 *  harness pins this exact set. None of these is a tenant path;
 *  nothing under `users/` ever appears. */
export const CONSOLE_READ_COLLECTIONS = [
  "businesses",
  "businessCounters",
  "businessStats",
  "businessEvents",
  "platformPayments",
  "platformAdmins",
  /* G4: the platform's OWN display config joins the list —
   * the payment-instructions editor must read what it
   * maintains. It is platform paperwork about the platform,
   * not a window into any business (§2.3's list governs
   * business data; this entry names none). */
  "platformConfig",
] as const;

/* ------------------------------------------------------------------ */
/* Act plans — the audit law made structural                           */
/* ------------------------------------------------------------------ */

/** A console write plan: the tenancy PlatformWrite set plus the
 *  delete an admin revocation needs. Executors apply a plan as
 *  ONE Firestore batch — the act and its audit event land
 *  together or not at all. */
export type AdminWrite =
  | PlatformWrite
  | { kind: "delete"; path: string };

/** Every console act planner returns this union. A refusal
 *  carries ZERO writes — a refused act is not an act and leaves
 *  no event (the event log records what HAPPENED). */
export type ActResult =
  | { ok: true; writes: AdminWrite[] }
  | { ok: false; reason: string; writes: [] };

const refuse = (reason: string): ActResult => ({ ok: false, reason, writes: [] });

function eventWrite(
  businessId: string,
  kind: string,
  actor: string,
  at: string,
  detail: Record<string, unknown>
): AdminWrite {
  const event: BusinessEventDoc = { businessId, kind, actor, at, detail };
  return { kind: "add", collection: "businessEvents", data: { ...event } };
}

/** The plan summary an event's before/after carries — enough to
 *  render the detail timeline's snapshot history without ever
 *  opening the business's books. */
function planSummary(plan: PlanSnapshot | null | undefined) {
  if (!plan) return null;
  return {
    planId: plan.planId,
    usersLimit: plan.usersLimit,
    invoiceLimit: plan.invoiceLimit,
    modulesTier: plan.modulesTier,
    periodFrom: plan.periodFrom,
    periodTo: plan.periodTo,
    trialEndsAt: plan.trialEndsAt,
  };
}

/* ---------------- plan assignment (§2.2/§3.2/§3.4) ---------------- */

export interface AssignPlanInput {
  businessId: string;
  current: BusinessRegistryDoc;
  planId: PlanId;
  /** The paid period's end. Required for the priced tiers
   *  (basic/standard/advanced); annual billing is simply a
   *  longer periodTo (§3.1). Null is legitimate for Enterprise
   *  (custom terms) and ignored for founding/trial. */
  periodTo?: string | null;
  /** Explicit limit overrides — the Enterprise assignment case
   *  (§3.2); null = unlimited. */
  usersLimit?: number | null;
  invoiceLimit?: number | null;
  /** A re-trial is a COMP, never a silent assignment (§3.4):
   *  it must be requested as one so its event kind says so. */
  compTrial?: boolean;
  actor: string;
  now: string;
}

export function planAssignPlan(input: AssignPlanInput): ActResult {
  const { businessId, current, planId, actor, now } = input;
  if (planId === "trial" && input.compTrial !== true) {
    return refuse("retrial-needs-comp");
  }
  const priced =
    planId === "basic" || planId === "standard" || planId === "advanced";
  if (priced && !input.periodTo) return refuse("period-required");
  const snapshot = snapshotFor(planId, now, {
    periodTo: input.periodTo ?? null,
    usersLimit: input.usersLimit,
    invoiceLimit: input.invoiceLimit,
    assignedBy: "admin",
  });
  const kind =
    planId === "trial" ? "plan.compTrial" : "plan.assigned";
  return {
    ok: true,
    writes: [
      {
        kind: "update",
        path: `businesses/${businessId}`,
        data: { plan: { ...snapshot } },
      },
      eventWrite(businessId, kind, actor, now, {
        before: planSummary(current.plan),
        after: planSummary(snapshot),
      }),
    ],
  };
}

/* ---------------- period extension (§2.2) ---------------- */

export interface ExtendPeriodInput {
  businessId: string;
  current: BusinessRegistryDoc;
  /** The new end instant for whichever end the plan carries. */
  newEnd: string;
  actor: string;
  now: string;
}

export function planExtendPeriod(input: ExtendPeriodInput): ActResult {
  const { businessId, current, actor, now } = input;
  const plan = current.plan;
  if (!plan || plan.planId === "founding") return refuse("no-expiry");
  const field: "periodTo" | "trialEndsAt" | null =
    plan.periodTo != null
      ? "periodTo"
      : plan.trialEndsAt != null
        ? "trialEndsAt"
        : null;
  if (!field) return refuse("no-end");
  const before = plan[field];
  if (
    !before ||
    Number.isNaN(new Date(input.newEnd).getTime()) ||
    new Date(input.newEnd).getTime() <= new Date(before).getTime()
  ) {
    return refuse("not-later");
  }
  const next: PlanSnapshot = { ...plan, [field]: input.newEnd };
  return {
    ok: true,
    writes: [
      {
        kind: "update",
        path: `businesses/${businessId}`,
        data: { plan: { ...next } },
      },
      eventWrite(businessId, "plan.extended", actor, now, {
        field,
        before,
        after: input.newEnd,
      }),
    ],
  };
}

/* ---------------- suspend / activate (§2.2/§2.4) ---------------- */

export interface SetStatusInput {
  businessId: string;
  current: BusinessRegistryDoc;
  status: "active" | "suspended";
  /** Mandatory for suspension (§2.2: the reason is recorded in
   *  the event log; the shop sees its class + remedy). */
  reason?: string;
  actor: string;
  now: string;
}

export function planSetStatus(input: SetStatusInput): ActResult {
  const { businessId, current, status, actor, now } = input;
  if (current.status === status) return refuse("no-change");
  const reason = (input.reason ?? "").trim();
  if (status === "suspended" && !reason) return refuse("reason-required");
  return {
    ok: true,
    writes: [
      {
        kind: "update",
        path: `businesses/${businessId}`,
        data: { status },
      },
      eventWrite(
        businessId,
        status === "suspended" ? "business.suspended" : "business.activated",
        actor,
        now,
        { before: current.status, after: status, reason }
      ),
    ],
  };
}

/* ---------------- the enforce flip (§6.3) ---------------- */

/** The platform-side cross-checks the flip displays BEFORE it is
 *  confirmed (§2.2/§2.3): all derived from the closed list —
 *  the stats doc's reported bill count (soft) and the count of
 *  membership docs the platform can lawfully read. The shop's
 *  own books are never opened for this (they cannot be). */
export interface PlatformActuals {
  /** businessStats.docCounts.bills — soft, labelled reported. */
  invoicesReported: number | null;
  /** Membership docs under the business (joined members; seats
   *  additionally include unclaimed invites, so agreement is
   *  seats ≥ joined, never the reverse). */
  membersJoined: number | null;
}

export function countersAgree(
  counters: BusinessCountersDoc | null,
  actual: PlatformActuals
): boolean {
  if (!counters) return false;
  if (
    actual.invoicesReported != null &&
    counters.invoiceCount !== actual.invoicesReported
  ) {
    return false;
  }
  if (
    actual.membersJoined != null &&
    counters.memberCount < actual.membersJoined
  ) {
    return false;
  }
  return true;
}

export interface SetEnforceInput {
  businessId: string;
  current: BusinessRegistryDoc;
  enforce: boolean;
  counters: BusinessCountersDoc | null;
  actual: PlatformActuals;
  /** The admin saw counter vs actual disagree and confirmed
   *  anyway — recorded in the event, never silent. */
  confirmed?: boolean;
  actor: string;
  now: string;
}

export function planSetEnforce(input: SetEnforceInput): ActResult {
  const { businessId, current, enforce, actor, now } = input;
  if (current.enforce === enforce) return refuse("no-change");
  const agree = countersAgree(input.counters, input.actual);
  if (enforce && !agree && input.confirmed !== true) {
    return refuse("counter-disagreement");
  }
  return {
    ok: true,
    writes: [
      {
        kind: "update",
        path: `businesses/${businessId}`,
        data: { enforce },
      },
      eventWrite(
        businessId,
        enforce ? "enforce.enabled" : "enforce.disabled",
        actor,
        now,
        {
          before: current.enforce,
          after: enforce,
          counterInvoices: input.counters?.invoiceCount ?? null,
          counterMembers: input.counters?.memberCount ?? null,
          reportedInvoices: input.actual.invoicesReported,
          joinedMembers: input.actual.membersJoined,
          countersAgree: agree,
          confirmedDespiteDisagreement: enforce && !agree,
        }
      ),
    ],
  };
}

/* ---------------- payment confirmation (§3.5) ---------------- */

export interface ConfirmPaymentInput {
  payment: PlatformPaymentDoc;
  business: BusinessRegistryDoc;
  actor: string;
  now: string;
}

export function planConfirmPayment(input: ConfirmPaymentInput): ActResult {
  const { payment, business, actor, now } = input;
  if (!payment.id) return refuse("payment-id-missing");
  if (payment.state !== "submitted") return refuse("not-submitted");
  if (payment.businessId !== consoleBusinessId(business)) {
    return refuse("business-mismatch");
  }
  const refreshed = snapshotFor(payment.planId, now, {
    periodTo: payment.periodTo,
    assignedBy: "admin",
  });
  refreshed.periodFrom = payment.periodFrom;
  return {
    ok: true,
    writes: [
      {
        kind: "update",
        path: `platformPayments/${payment.id}`,
        data: { state: "confirmed", confirmedBy: actor, confirmedAt: now },
      },
      {
        kind: "update",
        path: `businesses/${payment.businessId}`,
        data: { plan: { ...refreshed } },
      },
      eventWrite(payment.businessId, "payment.confirmed", actor, now, {
        paymentId: payment.id,
        amount: payment.amount,
        method: payment.method,
        before: planSummary(business.plan),
        after: planSummary(refreshed),
      }),
    ],
  };
}

export interface RejectPaymentInput {
  payment: PlatformPaymentDoc;
  /** The note the owner sees (§3.5) — mandatory. */
  note?: string;
  actor: string;
  now: string;
}

export function planRejectPayment(input: RejectPaymentInput): ActResult {
  const { payment, actor, now } = input;
  if (!payment.id) return refuse("payment-id-missing");
  if (payment.state !== "submitted") return refuse("not-submitted");
  const note = (input.note ?? "").trim();
  if (!note) return refuse("note-required");
  return {
    ok: true,
    writes: [
      {
        kind: "update",
        path: `platformPayments/${payment.id}`,
        data: {
          state: "rejected",
          confirmedBy: actor,
          confirmedAt: now,
          note,
        },
      },
      eventWrite(payment.businessId, "payment.rejected", actor, now, {
        paymentId: payment.id,
        amount: payment.amount,
        method: payment.method,
        note,
      }),
    ],
  };
}

/* ---------------- payment amount check (§3.5, G4) ---------------- */

/** The catalogue comparison the confirmation queue shows: the
 *  amount a payment NAMES against the catalogue price for the
 *  plan and billing period it names (monthly × 1, annual ×
 *  ANNUAL_MONTHS_CHARGED — the §3.1 shape). Prices are
 *  owner-to-confirm data; the check therefore FLAGS, it never
 *  settles or refuses: a mismatch rides to the admin, who
 *  confirms against the bank, not against the table. Plans
 *  with no catalogue price (enterprise — quoted; founding —
 *  not purchasable) read "custom": no comparison exists to
 *  make. Records predating the `billingPeriod` field infer
 *  their span from the named dates (≥ 11 months ⇒ annual). */
export function paymentAmountCheck(
  payment: PlatformPaymentDoc
): "ok" | "mismatch" | "custom" {
  const price = PLAN_CATALOGUE[payment.planId]?.priceMonthlyPKR;
  if (price == null) return "custom";
  let factor: number;
  if (payment.billingPeriod === "annual") {
    factor = ANNUAL_MONTHS_CHARGED;
  } else if (payment.billingPeriod === "monthly") {
    factor = 1;
  } else {
    const from = new Date(payment.periodFrom);
    const to = new Date(payment.periodTo);
    const months =
      (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
      (to.getUTCMonth() - from.getUTCMonth());
    factor = months >= 11 ? ANNUAL_MONTHS_CHARGED : 1;
  }
  return payment.amount === price * factor ? "ok" : "mismatch";
}

/* ---------------- platform config (§6.1, G4) ---------------- */

export interface SavePlatformConfigInput {
  /** The editor's full field set — a save replaces the doc's
   *  display fields wholesale (it is one maintained text). */
  config: Omit<PlatformConfigDoc, "updatedBy" | "updatedAt">;
  /** The doc as last read (null when never saved). */
  current: PlatformConfigDoc | null;
  actor: string;
  now: string;
}

/** Maintaining the platform's own display data is a console
 *  act like any other (§2.2's audit doctrine): the save and
 *  its businessEvents entry (on the "platform" pseudo-business,
 *  like admin grants) land in one batch. The detail carries
 *  before/after field sets so the timeline shows what the
 *  shopkeepers were told, and when it changed. */
export function planSavePlatformConfig(
  input: SavePlatformConfigInput
): ActResult {
  const { config, current, actor, now } = input;
  const next: PlatformConfigDoc = { ...config, updatedBy: actor, updatedAt: now };
  const fields = (c: PlatformConfigDoc | null) =>
    c
      ? {
          raastNumber: c.raastNumber,
          iban: c.iban,
          bankName: c.bankName,
          accountTitle: c.accountTitle,
          instructions: c.instructions,
          supportContact: c.supportContact,
        }
      : null;
  const beforeFields = fields(current);
  const afterFields = fields(next);
  const changed = (
    Object.keys(afterFields ?? {}) as (keyof NonNullable<typeof afterFields>)[]
  ).filter((k) => !beforeFields || beforeFields[k] !== afterFields?.[k]);
  return {
    ok: true,
    writes: [
      {
        kind: "set",
        path: `platformConfig/${PLATFORM_CONFIG_DOC_ID}`,
        data: { ...next },
      },
      eventWrite("platform", "platformConfig.updated", actor, now, {
        changed,
        before: beforeFields,
        after: afterFields,
      }),
    ],
  };
}

/* ---------------- admin management (§2.1) ---------------- */

export interface GrantAdminInput {
  uid: string;
  email: string;
  existing: PlatformAdminDoc | null;
  actor: string;
  now: string;
}

export function planGrantAdmin(input: GrantAdminInput): ActResult {
  const { uid, email, actor, now } = input;
  if (input.existing) return refuse("already-admin");
  const docData: Omit<PlatformAdminDoc, "uid"> = {
    email,
    addedAt: now,
    addedBy: actor,
  };
  return {
    ok: true,
    writes: [
      { kind: "set", path: `platformAdmins/${uid}`, data: { ...docData } },
      eventWrite("platform", "admin.granted", actor, now, { uid, email }),
    ],
  };
}

export interface RevokeAdminInput {
  uid: string;
  /** Every current admin's uid — the last-admin guard reads it. */
  adminUids: string[];
  actor: string;
  now: string;
}

export function planRevokeAdmin(input: RevokeAdminInput): ActResult {
  const { uid, actor, now } = input;
  if (!input.adminUids.includes(uid)) return refuse("not-admin");
  if (uid === actor) return refuse("self-revoke");
  if (input.adminUids.length <= 1) return refuse("last-admin");
  return {
    ok: true,
    writes: [
      { kind: "delete", path: `platformAdmins/${uid}` },
      eventWrite("platform", "admin.revoked", actor, now, { uid }),
    ],
  };
}

/** The console's act planners, by name — the audit suite
 *  enumerates THIS list and sweeps fixtures through every entry:
 *  an act that exists but is not listed here is an unaudited
 *  act, and the suite fails. */
export const CONSOLE_ACTS = [
  "planAssignPlan",
  "planExtendPeriod",
  "planSetStatus",
  "planSetEnforce",
  "planConfirmPayment",
  "planRejectPayment",
  "planGrantAdmin",
  "planRevokeAdmin",
  "planSavePlatformConfig",
] as const;

/* ------------------------------------------------------------------ */
/* Directory derivation + filters (§2.2)                               */
/* ------------------------------------------------------------------ */

export interface DirectoryEntry {
  businessId: string;
  name: string;
  ownerEmail: string;
  phone: string;
  city: string;
  createdAt: string;
  planId: PlanId;
  state: PlanState;
  status: "active" | "suspended";
  enforce: boolean;
  invoiceCount: number | null;
  invoiceLimit: number;
  memberCount: number | null;
  usersLimit: number;
  lastActiveAt: string | null;
}

export function directoryEntry(
  registry: BusinessRegistryDoc,
  counters: BusinessCountersDoc | null,
  stats: BusinessStatsDoc | null,
  nowISO: string
): DirectoryEntry {
  return {
    businessId: consoleBusinessId(registry),
    name: registry.name,
    ownerEmail: registry.ownerEmail,
    phone: registry.phone,
    city: registry.city,
    createdAt: registry.createdAt,
    planId: registry.plan.planId,
    state: derivePlanState(registry, nowISO),
    status: registry.status,
    enforce: registry.enforce,
    invoiceCount: counters?.invoiceCount ?? null,
    invoiceLimit: registry.plan.invoiceLimit,
    memberCount: counters?.memberCount ?? null,
    usersLimit: registry.plan.usersLimit,
    lastActiveAt: stats?.lastActiveAt ?? null,
  };
}

export interface DirectoryFilter {
  query?: string;
  planId?: PlanId | "";
  state?: PlanState | "";
  status?: "" | "active" | "suspended";
  enforce?: "" | "on" | "off";
}

export function filterDirectory(
  entries: DirectoryEntry[],
  filter: DirectoryFilter
): DirectoryEntry[] {
  const q = (filter.query ?? "").trim().toLowerCase();
  return entries.filter((e) => {
    if (
      q &&
      ![e.name, e.ownerEmail, e.phone, e.city, e.businessId]
        .join(" ")
        .toLowerCase()
        .includes(q)
    ) {
      return false;
    }
    if (filter.planId && e.planId !== filter.planId) return false;
    if (filter.state && e.state !== filter.state) return false;
    if (filter.status && e.status !== filter.status) return false;
    if (filter.enforce === "on" && !e.enforce) return false;
    if (filter.enforce === "off" && e.enforce) return false;
    return true;
  });
}

/* ------------------------------------------------------------------ */
/* Aggregates (§2.2) — client-side sums over the closed list           */
/* ------------------------------------------------------------------ */

export interface PlatformAggregates {
  totalBusinesses: number;
  byPlan: Record<string, number>;
  byState: Record<string, number>;
  suspended: number;
  enforced: number;
  /** Σ hard counters whose month key IS the current PKT month —
   *  labelled "from counters" wherever shown. */
  invoicesThisMonth: number;
  /** Σ trial-pool consumption (a trial counter never rolls —
   *  its count is the pool used, §3.1/§4.2). */
  trialPoolUsed: number;
  /** Confirmed platform revenue by PKT month of confirmation. */
  confirmedRevenueByMonth: Record<string, number>;
  confirmedRevenueTotal: number;
  pendingPayments: number;
}

/** Every figure names its source by construction: plan/state
 *  counts derive from registry docs, invoice figures sum the
 *  hard counters, revenue sums CONFIRMED payment records only. */
export function platformAggregates(
  businesses: BusinessRegistryDoc[],
  countersById: Record<string, BusinessCountersDoc | null>,
  payments: PlatformPaymentDoc[],
  nowISO: string
): PlatformAggregates {
  const byPlan: Record<string, number> = {};
  /* MC Billing workflow adoption 2026-10-27 (WEB, plan §18) —
   * NaN fix: every state starts at 0, so a state with no
   * business can never surface as `undefined` and poison a
   * summary card into NaN (the live "Active/Grace: NaN" defect). */
  const byState: Record<string, number> = {
    trial: 0,
    active: 0,
    grace: 0,
    readonly: 0,
    suspended: 0,
    founding: 0,
  };
  let suspended = 0;
  let enforced = 0;
  let invoicesThisMonth = 0;
  let trialPoolUsed = 0;
  const month = pktMonthKey(nowISO);
  for (const b of businesses) {
    byPlan[b.plan.planId] = (byPlan[b.plan.planId] ?? 0) + 1;
    const state = derivePlanState(b, nowISO);
    byState[state] = (byState[state] ?? 0) + 1;
    if (b.status === "suspended") suspended++;
    if (b.enforce) enforced++;
    const c = countersById[consoleBusinessId(b)];
    if (c) {
      if (b.plan.planId === "trial") trialPoolUsed += c.invoiceCount;
      else if (c.invoiceMonth === month) invoicesThisMonth += c.invoiceCount;
    }
  }
  const confirmedRevenueByMonth: Record<string, number> = {};
  let confirmedRevenueTotal = 0;
  let pendingPayments = 0;
  for ( const p of payments) {
    if (p.state === "submitted") pendingPayments++;
    if (p.state === "confirmed") {
      const key = pktMonthKey(p.confirmedAt ?? p.submittedAt);
      confirmedRevenueByMonth[key] =
        (confirmedRevenueByMonth[key] ?? 0) + p.amount;
      confirmedRevenueTotal += p.amount;
    }
  }
  return {
    totalBusinesses: businesses.length,
    byPlan,
    byState,
    suspended,
    enforced,
    invoicesThisMonth,
    trialPoolUsed,
    confirmedRevenueByMonth,
    confirmedRevenueTotal,
    pendingPayments,
  };
}

/** The confirmation queue: submitted payments, oldest first —
 *  the admin works the queue in the order money arrived. */
export function paymentQueue(
  payments: PlatformPaymentDoc[]
): PlatformPaymentDoc[] {
  return payments
    .filter((p) => p.state === "submitted")
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
}

/* ------------------------------------------------------------------ */
/* Detail: the snapshot history (§2.2)                                 */
/* ------------------------------------------------------------------ */

export interface SnapshotHistoryRow {
  at: string;
  actor: string;
  kind: string;
  planId: string | null;
  periodTo: string | null;
  trialEndsAt: string | null;
}

/** The business's plan history, reconstructed from its events:
 *  every act that set a snapshot left its `after` in the log,
 *  so the history is the log read back — not a second record. */
export function snapshotHistory(
  events: BusinessEventDoc[]
): SnapshotHistoryRow[] {
  const rows: SnapshotHistoryRow[] = [];
  for (const e of events) {
    const after = e.detail?.after as
      | { planId?: string; periodTo?: string | null; trialEndsAt?: string | null }
      | undefined;
    if (!after || typeof after !== "object" || !("planId" in after)) continue;
    rows.push({
      at: e.at,
      actor: e.actor,
      kind: e.kind,
      planId: after.planId ?? null,
      periodTo: after.periodTo ?? null,
      trialEndsAt: after.trialEndsAt ?? null,
    });
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}
