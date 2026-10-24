/**
 * Dukaan AI — Phase G · G4 renewal core (design: ERP-PHASE-G-DESIGN
 * §3.4/§3.5/§3.6/§8-G4).
 *
 * Pure functions only — the owner-side mirror of lib/platform's
 * console planners: the renewal quote, the payment-submission
 * plan, the shell's lifecycle banner derivation, and the
 * suspension-reason read-back. The store executes the plan;
 * nothing here writes.
 *
 * Doctrine (invariant 6): a subscription payment is a PLATFORM
 * record. The submission plan below names exactly one platform
 * collection — never a shop path, never a journal entry; the
 * paying shop's books are untouched by its own renewal (the
 * harness's lifecycle walk SHA-asserts the journal at every
 * step). The amount is never caller-supplied either: it is
 * composed here from the catalogue (§3.2 — prices are display
 * data, owner-to-confirm), and anything that reaches the
 * confirmation queue by another path is flagged against the
 * same table by lib/platform's paymentAmountCheck.
 */

import {
  PLAN_CATALOGUE,
  ANNUAL_MONTHS_CHARGED,
  GRACE_DAYS,
  derivePlanState,
  type PlanId,
} from "./plans";
import type {
  BusinessEventDoc,
  BusinessRegistryDoc,
  PlatformWrite,
} from "./tenancy";
import type { PlanView } from "./plans";
import type { PlatformPaymentMethod } from "./platform";

/* ------------------------------------------------------------------ */
/* The quote (§3.5)                                                    */
/* ------------------------------------------------------------------ */

export type BillingPeriod = "monthly" | "annual";

/** The tiers a shopkeeper can buy from the renewal surface.
 *  Trial is a birth state, founding a comp, enterprise a
 *  console conversation — none is purchasable here. */
export const RENEWABLE_PLAN_IDS: PlanId[] = ["basic", "standard", "advanced"];

export interface RenewalQuote {
  planId: PlanId;
  billing: BillingPeriod;
  /** Calendar months the bought period spans (1 or 12). */
  months: number;
  /** Catalogue price × period factor (annual = 10 × monthly). */
  amount: number;
  periodFrom: string;
  periodTo: string;
}

export type QuoteResult =
  | { ok: true; quote: RenewalQuote }
  | { ok: false; reason: string };

/** The refusal branch as a predicate — the harness compiles
 *  this library without strict null checks, where plain
 *  discriminant narrowing is not offered. */
export function isQuoteRefusal(
  r: QuoteResult
): r is { ok: false; reason: string } {
  return !r.ok;
}

const DAY_MS = 86400000;

/** Calendar months added in UTC, the day clamped to the target
 *  month's length (Jan 31 + 1 month is Feb 28, never Mar 3) —
 *  period instants stay on the day the period began. */
export function addMonthsISO(iso: string, months: number): string {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d.toISOString();
}

/**
 * The instant a renewed period starts from (§3.5's extension
 * rule): the LATER of the current period's end and now — a
 * shop renewing early loses nothing it already bought, and a
 * shop renewing from grace/readonly starts today. The payment
 * record fixes this period at submission; the console's
 * confirmation honours the record's own terms verbatim
 * (lib/platform's planConfirmPayment), so no bought day is
 * lost to confirmation lag either. Founding has nothing to
 * renew — null. A dateless paid snapshot (never born, §4.3)
 * renews from now rather than bricking the shop.
 */
export function renewalPeriodStart(
  registry: Pick<BusinessRegistryDoc, "plan"> | null,
  nowISO: string
): string | null {
  const plan = registry?.plan;
  if (!plan || plan.planId === "founding") return null;
  const end = plan.periodTo ?? plan.trialEndsAt;
  if (end == null) return nowISO;
  return new Date(end).getTime() > new Date(nowISO).getTime() ? end : nowISO;
}

export function renewalQuote(
  registry: Pick<BusinessRegistryDoc, "plan"> | null,
  planId: PlanId,
  billing: BillingPeriod,
  nowISO: string
): QuoteResult {
  if (!registry) return { ok: false, reason: "no-registry" };
  if (registry.plan.planId === "founding") {
    return { ok: false, reason: "not-applicable" };
  }
  if (registry.plan.planId === "enterprise") {
    return { ok: false, reason: "custom-plan" };
  }
  if (planId === "enterprise") return { ok: false, reason: "custom-plan" };
  if (!RENEWABLE_PLAN_IDS.includes(planId)) {
    return { ok: false, reason: "not-purchasable" };
  }
  const price = PLAN_CATALOGUE[planId].priceMonthlyPKR;
  if (price == null) return { ok: false, reason: "custom-plan" };
  const start = renewalPeriodStart(registry, nowISO);
  if (start == null) return { ok: false, reason: "not-applicable" };
  const months = billing === "annual" ? 12 : 1;
  const amount =
    price * (billing === "annual" ? ANNUAL_MONTHS_CHARGED : 1);
  return {
    ok: true,
    quote: {
      planId,
      billing,
      months,
      amount,
      periodFrom: start,
      periodTo: addMonthsISO(start, months),
    },
  };
}

/* ------------------------------------------------------------------ */
/* The submission (§3.5 step 2)                                        */
/* ------------------------------------------------------------------ */

/** What the renewal form itself supplies — the store fills
 *  the registry, identity and clock around it. */
export interface RenewalSubmissionForm {
  planId: PlanId;
  billing: BillingPeriod;
  method: PlatformPaymentMethod;
  reference: string;
  ownerNote?: string;
}

export interface SubmitRenewalInput {
  registry: Pick<BusinessRegistryDoc, "plan"> | null;
  businessId: string;
  planId: PlanId;
  billing: BillingPeriod;
  method: PlatformPaymentMethod;
  /** The out-of-band transfer's id — the admin's bank-check
   *  key. Required: a record without it cannot be confirmed
   *  against anything. */
  reference: string;
  ownerNote?: string;
  actor: string;
  now: string;
}

export type SubmissionResult =
  | { ok: true; writes: PlatformWrite[] }
  | { ok: false; reason: string; writes: [] };

const PAYMENT_METHODS: PlatformPaymentMethod[] = [
  "raast", "jazzcash", "easypaisa", "bank", "cash",
];

const refuseSubmission = (reason: string): SubmissionResult => ({
  ok: false,
  reason,
  writes: [],
});

/**
 * Plan the owner's renewal submission. The write set is ONE
 * platformPayments record, born `submitted` in the owner's own
 * name — the exact shape the platformPayments rules leg admits
 * (businessId == submittedBy == the caller's uid) and the exact
 * record the console's confirmation queue settles. No event
 * rides along: §1.2's log records the SETTLEMENT acts
 * (confirmed/rejected — the console planners write those);
 * the submission's record is the payment doc itself.
 *
 * Submission is open in every derived state the remedy must
 * reach — trial, active, grace, readonly — and while
 * SUSPENDED (§2.4: a platform-side write never blocks the act
 * that ends the suspension). Founding refuses: nothing to
 * renew, and the surface never renders there.
 */
export function planRenewalSubmission(
  input: SubmitRenewalInput
): SubmissionResult {
  if (!input.registry) return refuseSubmission("no-registry");
  if (input.actor !== input.businessId) {
    return refuseSubmission("not-owner");
  }
  const quote = renewalQuote(
    input.registry,
    input.planId,
    input.billing,
    input.now
  );
  if (isQuoteRefusal(quote)) return refuseSubmission(quote.reason);
  if (!PAYMENT_METHODS.includes(input.method)) {
    return refuseSubmission("bad-method");
  }
  const reference = (input.reference ?? "").trim();
  if (!reference) return refuseSubmission("reference-required");
  const q = quote.quote;
  const data: Record<string, unknown> = {
    businessId: input.businessId,
    amount: q.amount,
    method: input.method,
    reference,
    periodFrom: q.periodFrom,
    periodTo: q.periodTo,
    planId: q.planId,
    billingPeriod: input.billing,
    state: "submitted",
    submittedBy: input.actor,
    confirmedBy: null,
    submittedAt: input.now,
    confirmedAt: null,
  };
  const ownerNote = (input.ownerNote ?? "").trim();
  if (ownerNote) data.ownerNote = ownerNote;
  return {
    ok: true,
    writes: [{ kind: "add", collection: "platformPayments", data }],
  };
}

/* ------------------------------------------------------------------ */
/* The lifecycle banner (§3.4/§3.6)                                    */
/* ------------------------------------------------------------------ */

export type LifecycleBanner =
  | { kind: "trial"; daysLeft: number }
  | { kind: "trial-approaching"; daysLeft: number }
  | { kind: "trial-urgent"; daysLeft: number }
  | { kind: "grace"; daysElapsed: number; graceLeft: number }
  | { kind: "readonly" }
  | { kind: "suspended" };

/** The shell banner's derivation — a pure function of the
 *  plan view + now, so the harness walks the whole lifecycle
 *  against the same code the shell renders. State is
 *  RE-derived at the caller's instant (the stored PlanView
 *  state was derived when the store last rendered; a banner
 *  must not lag a boundary). Banners are facts, not ads:
 *  nothing here is dismissible while its state persists, and
 *  the calm states (active, founding, no registry — demo
 *  included) derive null. */
export function lifecycleBanner(
  view: PlanView,
  nowISO: string
): LifecycleBanner | null {
  const state = derivePlanState(
    { status: view.suspended ? "suspended" : "active", plan: view.snapshot },
    nowISO
  );
  const now = new Date(nowISO).getTime();
  if (state === "suspended") return { kind: "suspended" };
  if (state === "trial") {
    const end = view.snapshot.trialEndsAt;
    if (!end) return { kind: "trial", daysLeft: 0 };
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(end).getTime() - now) / DAY_MS)
    );
    if (daysLeft <= 1) return { kind: "trial-urgent", daysLeft };
    if (daysLeft <= 7) return { kind: "trial-approaching", daysLeft };
    return { kind: "trial", daysLeft };
  }
  if (state === "grace") {
    const end = view.snapshot.periodTo ?? view.snapshot.trialEndsAt;
    if (!end) return { kind: "grace", daysElapsed: 0, graceLeft: GRACE_DAYS };
    const endMs = new Date(end).getTime();
    return {
      kind: "grace",
      daysElapsed: Math.max(0, Math.floor((now - endMs) / DAY_MS)),
      graceLeft: Math.max(
        0,
        Math.ceil((endMs + GRACE_DAYS * DAY_MS - now) / DAY_MS)
      ),
    };
  }
  if (state === "readonly") return { kind: "readonly" };
  return null;
}

/* ------------------------------------------------------------------ */
/* The suspension reason (§2.4)                                        */
/* ------------------------------------------------------------------ */

/** The reason the shop sees on its suspension banner: the
 *  recorded reason of the LATEST suspension act — unless a
 *  later activation superseded it (then there is nothing to
 *  show; the banner itself is gone with the state). The
 *  reason lives in the business's own event log, which the
 *  owner and members may read (§1.2); it is never copied onto
 *  the registry doc. */
export function latestSuspensionReason(
  events: BusinessEventDoc[]
): string | null {
  let suspendedAt = "";
  let activatedAt = "";
  let reason: string | null = null;
  for (const e of events) {
    if (e.kind === "business.suspended" && e.at > suspendedAt) {
      suspendedAt = e.at;
      reason =
        typeof e.detail?.reason === "string" ? e.detail.reason : null;
    }
    if (e.kind === "business.activated" && e.at > activatedAt) {
      activatedAt = e.at;
    }
  }
  if (!suspendedAt || activatedAt > suspendedAt) return null;
  return reason;
}
