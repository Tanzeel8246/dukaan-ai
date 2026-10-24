/**
 * Dukaan AI — WhatsApp marketing (ERP Phase H · WhatsApp).
 *
 * Doctrine (Phase H design §3): the shop's number, the shop's
 * customers, the shop's hand. Every marketing message is sent
 * from the shop's own WhatsApp, to the shop's own opted-in
 * customers, by the shopkeeper's own action. This module is the
 * ORGANISATION of that marketing — consent, audiences, template
 * rendering, the launch plan, the queue's re-checks, the
 * suggested reminders — as pure functions over the shop's data,
 * so the harness can prove the doctrine against the same code
 * the desk runs. The TRANSPORT stays the shopkeeper's WhatsApp:
 * v1 opens wa.me links by hand (§3.4), so this module builds no
 * API client and claims no delivery knowledge — the send log's
 * states are exactly the states v1 can know (§3.4), and the
 * Cloud-API tier stays parked behind the Blaze decision (§3.6)
 * with the data model already shaped for it.
 *
 * Nothing here posts: marketing moves no money, so this module
 * imports no journal composer and the store gains no makeEntry
 * site for it.
 */
import type {
  Bill,
  CreditEntry,
  Customer,
  Job,
  JournalEntry,
  SaleOrder,
  ShopSettings,
  WaAudience,
  WaCampaign,
  WaSend,
  WaSendState,
} from "./types";
import { creditLotsRemaining } from "./ledger";
import { customerLoyalty, resolveLoyaltySettings } from "./loyalty";
import { addDaysISO, businessDateISO } from "./periods";
import {
  stateAllowsPosting,
  tierIncludesModule,
  type PlanView,
} from "./plans";

/* ------------------------------------------------------------------ */
/* Settings (design §3.5)                                              */
/* ------------------------------------------------------------------ */

export interface ResolvedWaSettings {
  /** Days after a job's delivery when a service reminder comes
   *  due. The design names the interval as a settings field and
   *  pins no number; 90 is this module's default (a quarterly
   *  service rhythm), owner-tunable in the desk. */
  serviceIntervalDays: number;
}

export const WA_DEFAULTS: ResolvedWaSettings = {
  serviceIntervalDays: 90,
};

/** The single interpretation seam for the WhatsApp settings —
 *  absent/malformed degrades field-by-field to the defaults
 *  (the E-era resolver discipline, as lib/loyalty's). */
export function resolveWaSettings(
  settings: Pick<ShopSettings, "whatsapp"> | null | undefined
): ResolvedWaSettings {
  const raw = settings?.whatsapp?.serviceIntervalDays;
  return {
    serviceIntervalDays:
      typeof raw === "number" && Number.isFinite(raw) && raw > 0
        ? Math.floor(raw)
        : WA_DEFAULTS.serviceIntervalDays,
  };
}

/* ------------------------------------------------------------------ */
/* Consent (design §3.2) — a field with a history, default off         */
/* ------------------------------------------------------------------ */

/** The ONLY consent question the product ever asks of a customer
 *  doc: absent and false are the same answer — NO. */
export function customerOptedIn(c: Customer): boolean {
  return c.waOptIn === true;
}

export type WaConsentSource = "counter" | "storefront";

/**
 * The stamp a consent act writes. Granting sources are exactly
 * the two captures a customer can agree through — the counter
 * (the customer form / profile toggle) and the storefront
 * conversion (applied when the order's customer is resolved,
 * §3.2). Revocation stamps the same shape with `agreed: false`
 * and the source of the act that recorded it, so the doc always
 * says WHAT the current state is, WHEN it was set and WHERE —
 * a history of one (the latest act), never a silent flag.
 */
export function waConsentPatch(
  source: WaConsentSource,
  agreed: boolean,
  nowISO: string
): Partial<Customer> {
  return { waOptIn: agreed, waOptInAt: nowISO, waOptInSource: source };
}

/**
 * The import guard (design §3.2 + the §6 checkpoint): a parsed
 * import row claiming consent — a `waOptIn: "yes"` column, a
 * stray waOptInSource — comes out with EVERY consent field
 * removed. An imported customer is an unconsented customer
 * until they agree at the counter like everyone else: a bought
 * list can never launder consent through a spreadsheet, and any
 * future import path that routes its rows through here cannot
 * set the flag by construction.
 */
export function stripImportConsent<T extends Record<string, unknown>>(
  row: T
): T {
  const out = { ...row };
  delete out.waOptIn;
  delete out.waOptInAt;
  delete out.waOptInSource;
  return out;
}

/* ------------------------------------------------------------------ */
/* Phone (the house wa.me normalisation, named once)                   */
/* ------------------------------------------------------------------ */

/** Local → international digits, exactly as the bill share has
 *  always composed it (BillingDesk): strip non-digits, a leading
 *  0 becomes the 92 country code. */
export function waIntlPhone(phone: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
}

/** A number WhatsApp can plausibly reach: 10–15 international
 *  digits (a PK mobile lands at 12). Anything shorter/longer is
 *  not a recipient — the queue marks it skipped_invalid rather
 *  than opening a dead chat. */
export function waPhoneOk(phone: string): boolean {
  const n = waIntlPhone(phone).length;
  return n >= 10 && n <= 15;
}

/** The v1 transport link (§3.4): the product's proven wa.me
 *  pattern with the rendered message pre-filled. Opening it is
 *  the shopkeeper's act; nothing here sends anything. */
export function waMeLink(phone: string, text: string): string {
  return `https://wa.me/${waIntlPhone(phone)}?text=${encodeURIComponent(text)}`;
}

/* ------------------------------------------------------------------ */
/* Templates (design §3.3)                                             */
/* ------------------------------------------------------------------ */

/** The placeholders a template body may carry. {points} is the
 *  customer's derived loyalty balance (H1 synergy); {amount} is
 *  the reminder context — the customer's outstanding udhaar. */
export const WA_PLACEHOLDERS = ["name", "shop", "points", "amount"] as const;

export interface WaRenderVars {
  name: string;
  shop: string;
  points: number;
  amount: number;
}

/** Render a template body for one recipient. Known placeholders
 *  substitute; an unknown {token} is left standing — the queue
 *  preview shows the shopkeeper exactly what would go out, and
 *  a typo'd placeholder is visible paper, not a silent gap. */
export function renderWaMessage(body: string, vars: WaRenderVars): string {
  const values: Record<string, string> = {
    name: vars.name,
    shop: vars.shop,
    points: String(vars.points),
    amount: String(Math.round(vars.amount)),
  };
  return body.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in values ? values[key] : m
  );
}

/* ------------------------------------------------------------------ */
/* Audiences (design §3.3/§3.5) — definitions resolved live           */
/* ------------------------------------------------------------------ */

/** Everything an audience derivation may read. The journal is
 *  the loyalty fold's input; credits are the udhaar book; bills
 *  and sale orders carry activity and storefront origin; jobs
 *  carry service due-ness. */
export interface WaAudienceData {
  customers: Customer[];
  credits: CreditEntry[];
  journal: JournalEntry[];
  bills: Bill[];
  saleOrders: SaleOrder[];
  jobs: Job[];
  settings: ShopSettings;
  nowISO: string;
}

/** One customer's udhaar position with FIFO age — the SHARED
 *  lot allocation lib/ledger's `creditLotsRemaining` runs (the
 *  same one the receivables aging uses, so the two can never
 *  drift apart): return/void reversals net their own bill's lot,
 *  repayments retire the OLDEST open lot first; what remains
 *  carries its lot's age, computed per customer so an audience
 *  can ask for an amount AND its age. (Fix Round 1 · F4: this
 *  function used to carry its own FIFO copy, which skipped
 *  negative reversal rows exactly like the pre-fix aging did.) */
export function customerUdhaarPosition(
  credits: CreditEntry[],
  customerId: string
): { outstanding: number; oldestAgeDays: number } {
  const rows = credits.filter((c) => c.customerId === customerId);
  let outstanding = 0;
  let oldestAgeDays = 0;
  for (const lot of creditLotsRemaining(rows)) {
    outstanding += lot.remaining;
    oldestAgeDays = Math.max(oldestAgeDays, lot.dayOffset);
  }
  return { outstanding, oldestAgeDays };
}

/** The per-kind membership test, BEFORE the consent filter —
 *  exported so the desk can show "segment size vs reachable"
 *  honestly (a segment of 40 with 25 opted in is two facts,
 *  not one). */
export function waSegmentMatches(
  audience: WaAudience,
  customer: Customer,
  data: WaAudienceData
): boolean {
  switch (audience.kind) {
    case "all_opted_in":
      return true;
    case "tier": {
      const st = resolveLoyaltySettings(data.settings);
      return (
        customerLoyalty(data.journal, customer.id, st, data.nowISO).tier ===
        audience.tier
      );
    }
    case "udhaar_outstanding": {
      const pos = customerUdhaarPosition(data.credits, customer.id);
      return (
        pos.outstanding > 0 &&
        pos.outstanding >= audience.minRs &&
        pos.oldestAgeDays >= audience.minDays
      );
    }
    case "points_expiring": {
      const st = resolveLoyaltySettings(data.settings);
      const today = businessDateISO(data.nowISO);
      const horizon = addDaysISO(today, Math.max(0, audience.withinDays));
      const pos = customerLoyalty(data.journal, customer.id, st, data.nowISO);
      return pos.vintages.some(
        (v) =>
          v.pointsUnspent > 0 &&
          v.expiresOnISO > today &&
          v.expiresOnISO <= horizon
      );
    }
    case "inactive": {
      const cutoff = Date.parse(data.nowISO) - audience.days * 86400000;
      let last = -Infinity;
      for (const b of data.bills) {
        if (b.customerId !== customer.id) continue;
        if (b.status === "held" || b.status === "voided") continue;
        const t = Date.parse(b.ts);
        if (Number.isFinite(t) && t > last) last = t;
      }
      /* No qualifying bill at all: no bill in N days is literally
       * true — the customer is in the book but has never bought. */
      return last === -Infinity || last <= cutoff;
    }
    case "storefront_customers":
      return data.saleOrders.some(
        (o) => o.sourceType === "storefront" && o.customerId === customer.id
      );
    case "service_due": {
      const interval = resolveWaSettings(data.settings).serviceIntervalDays;
      const cutoff = Date.parse(data.nowISO) - interval * 86400000;
      return data.jobs.some((j) => {
        if (j.customerId !== customer.id || j.status !== "delivered") {
          return false;
        }
        const t = Date.parse(j.ts);
        return Number.isFinite(t) && t <= cutoff;
      });
    }
  }
}

/**
 * THE audience: the segment definition resolved live, then the
 * consent filter — every kind, no exceptions. An audience can
 * never contain a customer who has not opted in, because this
 * function is the only resolution path and the filter is its
 * last step, not each kind's courtesy. Order is the customers'
 * own (directory) order — stable and deduped by construction
 * (one pass over the customer list).
 */
export function resolveWaAudience(
  audience: WaAudience,
  data: WaAudienceData
): Customer[] {
  return data.customers.filter(
    (c) => customerOptedIn(c) && waSegmentMatches(audience, c, data)
  );
}

export function waAudienceCount(
  audience: WaAudience,
  data: WaAudienceData
): number {
  return resolveWaAudience(audience, data).length;
}

/* ------------------------------------------------------------------ */
/* Launch + the send queue (design §3.4)                               */
/* ------------------------------------------------------------------ */

/**
 * Launch materialises the send log: one `queued` row per
 * RESOLVED recipient, phones stamped from the customer docs as
 * they stand at launch (the log records where each message was
 * aimed). Resolution runs the full consent filter at launch;
 * the queue then re-checks per recipient at send time
 * (waQueueStep) — consent is asked twice because it can change
 * between the two moments, and the later answer governs.
 */
export function planWaLaunch(
  campaign: WaCampaign,
  data: WaAudienceData,
  newId: () => string
): { sends: WaSend[]; resolvedCount: number } {
  const recipients = resolveWaAudience(campaign.audience, data);
  const sends: WaSend[] = recipients.map((c) => ({
    id: newId(),
    campaignId: campaign.id,
    customerId: c.id,
    phone: c.phone,
    state: "queued",
    ts: data.nowISO,
  }));
  return { sends, resolvedCount: recipients.length };
}

export type WaRecheck = "ok" | "optout" | "invalid";

/**
 * The per-recipient re-check the queue runs when a row's turn
 * comes (§3.2/§3.4): consent is read from the customer doc AS
 * IT STANDS NOW — a customer who opted out after launch (or
 * whose doc is gone) is excluded here, at send time, however
 * clean the launch was. The number is judged on the row's
 * stamped phone: that is the number this campaign addresses.
 */
export function waSendRecheck(
  send: WaSend,
  customer: Customer | undefined
): WaRecheck {
  if (!customer || !customerOptedIn(customer)) return "optout";
  if (!waPhoneOk(send.phone)) return "invalid";
  return "ok";
}

export interface WaQueueStep {
  send: WaSend;
  /** "send" = the row is workable now; the skip outcomes are
   *  the re-check's verdicts, written to the log as the
   *  terminal skipped_* states when the shopkeeper advances. */
  action: "send" | "skip-optout" | "skip-invalid";
  customer: Customer | undefined;
}

/**
 * The queue's head: the first non-terminal row (queued or
 * opened), in log order. `afterId` is the session cursor for
 * "skip advances without sending" (§3.4): skipping writes
 * NOTHING — the row stays queued and resurfaces at the head
 * next session, because it was never sent and the log does not
 * pretend otherwise. There is deliberately no voluntary-skip
 * state in WaSendState: the log records facts (sent, opened,
 * consent-gone, number-bad), not intentions.
 */
export function waQueueStep(
  sends: WaSend[],
  customers: Customer[],
  afterId?: string | null
): WaQueueStep | null {
  const byId = new Map(customers.map((c) => [c.id, c]));
  let past = afterId == null;
  for (const s of sends) {
    if (!past) {
      if (s.id === afterId) past = true;
      continue;
    }
    if (s.state !== "queued" && s.state !== "opened") continue;
    const customer = byId.get(s.customerId);
    const recheck = waSendRecheck(s, customer);
    return {
      send: s,
      action:
        recheck === "ok"
          ? "send"
          : recheck === "optout"
            ? "skip-optout"
            : "skip-invalid",
      customer,
    };
  }
  return null;
}

/**
 * One queue act, applied to a row. The re-check OVERRIDES the
 * act: a row whose recipient has opted out (or whose number is
 * bad) lands in its skipped_* state whatever button brought it
 * here — the shopkeeper's tap is recorded only when the send it
 * describes could honestly happen. "sent" is the shopkeeper's
 * own confirmation (§3.4): this function records the claim; it
 * neither makes nor verifies a delivery.
 */
export function waSendTransition(
  send: WaSend,
  act: "opened" | "sent",
  customer: Customer | undefined
): WaSend {
  const recheck = waSendRecheck(send, customer);
  if (recheck === "optout") return { ...send, state: "skipped_optout" };
  if (recheck === "invalid") return { ...send, state: "skipped_invalid" };
  if (send.state === "queued" && act === "opened") {
    return { ...send, state: "opened" };
  }
  if ((send.state === "queued" || send.state === "opened") && act === "sent") {
    return { ...send, state: "sent" };
  }
  return send;
}

export interface WaCampaignProgress {
  total: number;
  queued: number;
  opened: number;
  sent: number;
  skippedOptout: number;
  skippedInvalid: number;
  /** sent + both skips: rows whose story is finished. */
  terminal: number;
  /** Every row terminal (or no rows): the campaign's sending
   *  story is complete and its state may close to "done". */
  complete: boolean;
}

export function waCampaignProgress(sends: WaSend[]): WaCampaignProgress {
  const count = (s: WaSendState) => sends.filter((x) => x.state === s).length;
  const sent = count("sent");
  const skippedOptout = count("skipped_optout");
  const skippedInvalid = count("skipped_invalid");
  const terminal = sent + skippedOptout + skippedInvalid;
  return {
    total: sends.length,
    queued: count("queued"),
    opened: count("opened"),
    sent,
    skippedOptout,
    skippedInvalid,
    terminal,
    complete: terminal === sends.length,
  };
}

/** The message the queue would put in front of this recipient:
 *  the campaign's template rendered with the customer's live
 *  facts — name, the shop's name, derived points, outstanding
 *  udhaar (the reminder's {amount}). */
export function waQueueMessage(
  templateBody: string,
  customer: Customer,
  data: WaAudienceData
): string {
  const st = resolveLoyaltySettings(data.settings);
  const points = customerLoyalty(
    data.journal,
    customer.id,
    st,
    data.nowISO
  ).points;
  const amount = customerUdhaarPosition(data.credits, customer.id).outstanding;
  return renderWaMessage(templateBody, {
    name: customer.name,
    shop: data.settings.shopName,
    points,
    amount,
  });
}

/* ------------------------------------------------------------------ */
/* Suggested reminders (design §3.5) — counts the data offers          */
/* ------------------------------------------------------------------ */

/** The panel's windows. Named here so the copy and the counts
 *  can never disagree about what "due" means this week. */
export const WA_SUGGEST_UDHAAR_MIN_DAYS = 7;
export const WA_SUGGEST_POINTS_WITHIN_DAYS = 7;

export interface WaSuggestions {
  /** Opted-in customers with udhaar outstanding ≥ 7 days. */
  udhaarCount: number;
  /** Opted-in customers with points expiring within 7 days. */
  pointsExpiringCount: number;
  /** Opted-in customers with a service-due delivered job. */
  serviceDueCount: number;
  serviceIntervalDays: number;
}

/**
 * Today's candidates, counts only, derived when the desk opens
 * (client-derived like plan state — §3.5). Every count runs the
 * full audience resolution, consent filter included: the panel
 * never suggests messaging someone the shop may not message.
 * Nothing here sends, queues or writes — a suggestion becomes
 * a campaign only by the shopkeeper's own launch.
 */
export function waSuggestedReminders(data: WaAudienceData): WaSuggestions {
  return {
    udhaarCount: waAudienceCount(
      {
        kind: "udhaar_outstanding",
        minRs: 1,
        minDays: WA_SUGGEST_UDHAAR_MIN_DAYS,
      },
      data
    ),
    pointsExpiringCount: waAudienceCount(
      { kind: "points_expiring", withinDays: WA_SUGGEST_POINTS_WITHIN_DAYS },
      data
    ),
    serviceDueCount: waAudienceCount({ kind: "service_due" }, data),
    serviceIntervalDays: resolveWaSettings(data.settings).serviceIntervalDays,
  };
}

/* ------------------------------------------------------------------ */
/* Plan gates (design §5.1 + invariant 5)                              */
/* ------------------------------------------------------------------ */

/**
 * The module gate, read from the business's ASSIGNMENT
 * SNAPSHOT (its modulesTier), never the live catalogue — the G
 * doctrine the store guard mirrors: a Basic-snapshot shop is
 * refused even on the day the catalogue grows the whatsapp row,
 * and a Standard snapshot keeps the module through any later
 * catalogue reshuffle. A null plan view (demo, pre-G registry-
 * less shop) gates nothing, exactly as every G surface behaves.
 */
export function waModuleAllowed(planView: PlanView | null): boolean {
  if (!planView) return true;
  return tierIncludesModule(planView.snapshot.modulesTier, "whatsapp");
}

/**
 * The sending gate: module present AND the plan state postable.
 * Plan expiry degrades H's SENDING surfaces (invariant 5) —
 * in grace/readonly/suspension the desk, templates and history
 * stay fully readable (they are the shop's own records), but
 * launching and queueing stop until renewal, exactly as
 * posting stops. Reads are never gated here or anywhere.
 */
export function waSendingAllowed(planView: PlanView | null): boolean {
  if (!waModuleAllowed(planView)) return false;
  if (!planView) return true;
  return stateAllowsPosting(planView.state);
}
