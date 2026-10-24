/**
 * Dukaan AI — customer loyalty (ERP Phase H · H1).
 *
 * Doctrine (Phase H design §1): points are a LIABILITY the shop
 * owes its customers, so points move only as journal entries
 * through the one guarded choke point — there is no points counter
 * on the customer doc, no side ledger, no stored balance anywhere.
 * The journal carries RUPEES; points are a DERIVED view folded from
 * entry payloads (the earn entry's `points` + `rsPerPoint`
 * snapshot, the bill entry's `loyaltyPointsUsed`, return/void
 * entries' `loyaltyPointsReturned`, expiry entries' `points`).
 *
 *  - Earn (bill finalize): Dr `expense_loyalty` / Cr
 *    `loyalty_payable` (ref = customerId) — the cost of the promise
 *    recognised in the period that made the sale (matching).
 *  - Redeem: a Dr `loyalty_payable` leg INSIDE the bill's own
 *    entry, beside the money legs — a payment method, so the
 *    Phase B void/return mirrors reverse it automatically.
 *  - Return: the points leg re-credits proportionally (points
 *    come back as points, never cash) + a clawback companion
 *    (`loyalty_earn`, negative points) taking back the earn on
 *    what came back, floored in the customer's favour.
 *  - Expiry: a derived due-list + owner-posted release entries
 *    (Dr `loyalty_payable` / Cr `expense_loyalty`) — a cost
 *    release, never revenue; no scheduler exists or is faked.
 *
 * The audit identities this module exists to keep true (asserted
 * by the H1 harness suite at every lifecycle step):
 *    GL(loyalty_payable) ≡ Σ per-customer rupee positions
 *    per-customer Rs ≡ Σ unspent vintage points × snapshot rates
 * Both hold by construction: every composer's rupee figure is
 * computed BY the fold below, never beside it.
 *
 * Consumption is FIFO by vintage; a return RESTORES the source
 * bill's consumption in reverse (LIFO) — allocations are a fold
 * computation over dated entries, never a stored allocation.
 */
import type {
  Bill,
  Customer,
  JournalEntry,
  LoyaltySettings,
  ShopSettings,
} from "./types";
import { accountNormalBalance, makeEntry } from "./ledger";
import { addDaysISO, businessDateISO } from "./periods";

/** Round to the paisa — mirrors lib/ledger's discipline exactly. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Settings (design §1.7 + Q1 defaults)                                */
/* ------------------------------------------------------------------ */

export interface ResolvedLoyaltySettings {
  enabled: boolean;
  /** Rupees of net payable that earn one point (pre-multiplier). */
  earnRsPerPointBase: number;
  /** Rupees one point is worth at redemption. */
  pointValueRs: number;
  /** Max share of a bill's net payable payable in points, %. */
  redeemCapPct: number;
  /** Months after earning at which a vintage expires. */
  expiryMonths: number;
  silverAt: number;
  goldAt: number;
  silverMult: number;
  goldMult: number;
}

/** The design's proposed defaults (Q1) — commercial figures the
 *  owner tunes per shop in Settings; composers read ONLY the
 *  resolved object, never these literals. */
export const LOYALTY_DEFAULTS: ResolvedLoyaltySettings = {
  enabled: false,
  earnRsPerPointBase: 100,
  pointValueRs: 1,
  redeemCapPct: 50,
  expiryMonths: 12,
  silverAt: 500,
  goldAt: 2000,
  silverMult: 1.25,
  goldMult: 1.5,
};

function posOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : fallback;
}

function multOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? value
    : fallback;
}

/** The single interpretation seam for the programme's terms —
 *  every surface and composer reads terms through here, so an
 *  absent or malformed settings block degrades to the defaults
 *  field by field (the E-era resolver discipline). Absent block
 *  ⇒ programme OFF: a shop starts earning only when its owner
 *  switches the programme on. */
export function resolveLoyaltySettings(
  settings: Pick<ShopSettings, "loyalty"> | null | undefined
): ResolvedLoyaltySettings {
  const s: LoyaltySettings = settings?.loyalty ?? {};
  const d = LOYALTY_DEFAULTS;
  return {
    enabled: s.enabled === true,
    earnRsPerPointBase: posOr(s.earnRsPerPointBase, d.earnRsPerPointBase),
    pointValueRs: posOr(s.pointValueRs, d.pointValueRs),
    redeemCapPct:
      typeof s.redeemCapPct === "number" && Number.isFinite(s.redeemCapPct)
        ? Math.min(100, Math.max(0, s.redeemCapPct))
        : d.redeemCapPct,
    expiryMonths: posOr(s.expiryMonths, d.expiryMonths),
    silverAt: posOr(s.silverAt, d.silverAt),
    goldAt: posOr(s.goldAt, d.goldAt),
    silverMult: multOr(s.silverMult, d.silverMult),
    goldMult: multOr(s.goldMult, d.goldMult),
  };
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

/** Add calendar months to a YYYY-MM-DD date (UTC arithmetic; the
 *  day clamps to the target month's length). */
export function addMonthsISO(dateISO: string, months: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const total = (m - 1) + months;
  const ny = y + Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  const nd = Math.min(d, lastDay);
  const p2 = (n: number) => String(n).padStart(2, "0");
  return `${ny}-${p2(nm)}-${p2(nd)}`;
}

/** The instant exactly `months` calendar months before `ts`. */
function monthsBeforeInstant(ts: string, months: number): string {
  const d = new Date(ts);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString();
}

/* ------------------------------------------------------------------ */
/* Entry plumbing                                                      */
/* ------------------------------------------------------------------ */

/** The customer a loyalty-bearing entry belongs to: the ref on
 *  its `loyalty_payable` line (every programme posting refs its
 *  customer there — earn, redeem leg, re-credit, clawback,
 *  expiry). Null for entries with no loyalty content. */
export function loyaltyEntryCustomerId(e: JournalEntry): string | null {
  for (const l of e.lines) {
    if (l.account === "loyalty_payable" && l.ref != null) return l.ref;
  }
  return null;
}

/** Rupee movement of `loyalty_payable` for one customer inside one
 *  entry, stated as liability change (credit − debit). */
function entryLiabilityDelta(e: JournalEntry, customerId: string): number {
  let d = 0;
  for (const l of e.lines) {
    if (l.account === "loyalty_payable" && (l.ref ?? null) === customerId) {
      d += l.credit - l.debit;
    }
  }
  return d;
}

/** One customer's loyalty_payable subledger balance (credit
 *  side): what the shop owes them, in rupees, straight off the
 *  journal — the `salary_payable` per-employee pattern. */
export function customerLoyaltyRupees(
  entries: JournalEntry[],
  customerId: string
): number {
  let bal = 0;
  for (const e of entries) bal += entryLiabilityDelta(e, customerId);
  return round2(bal);
}

/** GL(loyalty_payable) ≡ Σ per-customer positions: every
 *  programme line is customer-ref'd, so the two are one fold. */
export function loyaltyRupeesByCustomer(
  entries: JournalEntry[]
): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of entries) {
    for (const l of e.lines) {
      if (l.account !== "loyalty_payable" || l.ref == null) continue;
      out.set(l.ref, round2((out.get(l.ref) ?? 0) + (l.credit - l.debit)));
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* The vintage fold (design §1.3)                                     */
/* ------------------------------------------------------------------ */

export interface LoyaltyVintage {
  /** The earn entry that created this vintage. */
  earnEntryId: string;
  /** The bill the points were earned on (the earn's refId). */
  billId: string | null;
  /** Business date the points were earned (PKT). */
  earnedOnISO: string;
  /** Business date the unspent remainder expires (snapshotted
   *  horizon from the earn entry). Due when today >= this date. */
  expiresOnISO: string;
  /** The point's rupee value, snapshotted at earn time. */
  rsPerPoint: number;
  pointsGranted: number;
  /** Consumed by bill redemptions (net of return restores). */
  pointsRedeemed: number;
  /** Taken back by clawbacks against the source bill. May exceed
   *  the unspent remainder — the excess is a points debt riding
   *  this vintage (pointsUnspent goes negative, by design). */
  pointsClawed: number;
  /** Released by posted expiry entries. */
  pointsExpired: number;
  /** granted − redeemed − clawed − expired. */
  pointsUnspent: number;
  /** pointsUnspent × rsPerPoint — the vintage's live liability. */
  rsUnspent: number;
}

interface VintageState extends LoyaltyVintage {
  /** Per-bill redemption allocations, in consumption order —
   *  the restore computation's memory (fold state, never stored). */
  allocations: Array<{ billId: string; points: number; restored: number }>;
}

/** Replay one customer's loyalty history into vintages. Pure fold
 *  over the journal in posting order (ts, then journal order —
 *  the store appends chronologically, and equal instants keep
 *  their append order). */
function foldVintages(
  entries: JournalEntry[],
  customerId: string
): VintageState[] {
  const ordered = entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => loyaltyEntryCustomerId(e) === customerId)
    .sort((a, b) => a.e.ts.localeCompare(b.e.ts) || a.i - b.i)
    .map(({ e }) => e);
  const vintages: VintageState[] = [];
  // Per-bill consumption stacks, in consumption order. Each record
  // is the SAME object the owning vintage's `allocations` holds,
  // so a restore updates both views at once — the composer that
  // prices a restore reads exactly the state this fold leaves.
  const byBillConsumption = new Map<
    string,
    Array<{ v: VintageState; rec: { billId: string; points: number; restored: number } }>
  >();
  for (const e of ordered) {
    if (e.refType === "loyalty_earn" && (e.points ?? 0) > 0) {
      const earnedOnISO = e.dateISO ?? businessDateISO(e.ts);
      const months = e.loyaltyExpiryMonths ?? LOYALTY_DEFAULTS.expiryMonths;
      vintages.push({
        earnEntryId: e.id,
        billId: e.refId,
        earnedOnISO,
        expiresOnISO: addMonthsISO(earnedOnISO, months),
        rsPerPoint: e.rsPerPoint ?? LOYALTY_DEFAULTS.pointValueRs,
        pointsGranted: e.points as number,
        pointsRedeemed: 0,
        pointsClawed: 0,
        pointsExpired: 0,
        pointsUnspent: e.points as number,
        rsUnspent: 0,
        allocations: [],
      });
      continue;
    }
    if (e.refType === "loyalty_earn" && (e.points ?? 0) < 0) {
      // Clawback: shrink the SOURCE bill's vintage (design §1.4).
      // Defensive fallback (a source bill with no live vintage —
      // its earn was itself reversed wholesale): shrink FIFO.
      const take = -(e.points as number);
      const target =
        vintages.find((v) => v.billId === (e.loyaltySourceBillId ?? null)) ??
        vintages[0];
      if (target) target.pointsClawed += take;
      continue;
    }
    if ((e.loyaltyPointsUsed ?? 0) > 0 && e.refId) {
      // Redemption inside a bill entry: consume FIFO from
      // vintages with unspent points, recording the allocation
      // so a later return can restore it in reverse.
      let need = e.loyaltyPointsUsed as number;
      const allocs: Array<{
        v: VintageState;
        rec: { billId: string; points: number; restored: number };
      }> = [];
      for (const v of vintages) {
        if (need <= 0) break;
        const avail = v.pointsGranted - v.pointsRedeemed - v.pointsClawed - v.pointsExpired;
        if (avail <= 0) continue;
        const take = Math.min(avail, need);
        v.pointsRedeemed += take;
        need -= take;
        const rec = { billId: e.refId, points: take, restored: 0 };
        allocs.push({ v, rec });
        v.allocations.push(rec);
      }
      byBillConsumption.set(e.refId, allocs);
      continue;
    }
    if ((e.loyaltyPointsReturned ?? 0) > 0 && e.refId) {
      // Return / void re-credit: un-consume the source bill's
      // allocations in REVERSE order (the mirror image of the
      // FIFO consumption that created them).
      let give = e.loyaltyPointsReturned as number;
      const allocs = byBillConsumption.get(e.refId) ?? [];
      for (let k = allocs.length - 1; k >= 0 && give > 0; k--) {
        const { v, rec } = allocs[k];
        const can = rec.points - rec.restored;
        if (can <= 0) continue;
        const back = Math.min(can, give);
        rec.restored += back;
        v.pointsRedeemed -= back;
        give -= back;
      }
      continue;
    }
    if (e.refType === "loyalty_expire" && (e.points ?? 0) > 0) {
      // The expiry release names its vintage by refId (the earn
      // entry's id — the composer's contract). Fallback: the
      // oldest vintage with unspent points.
      const target =
        vintages.find((v) => v.earnEntryId === e.refId) ??
        vintages.find(
          (v) => v.pointsGranted - v.pointsRedeemed - v.pointsClawed - v.pointsExpired > 0
        );
      if (target) target.pointsExpired += e.points as number;
      continue;
    }
  }
  for (const v of vintages) {
    v.pointsUnspent =
      v.pointsGranted - v.pointsRedeemed - v.pointsClawed - v.pointsExpired;
    v.rsUnspent = round2(v.pointsUnspent * v.rsPerPoint);
  }
  return vintages;
}

/** One customer's vintages, oldest first, fully derived. */
export function loyaltyVintages(
  entries: JournalEntry[],
  customerId: string
): LoyaltyVintage[] {
  return foldVintages(entries, customerId).map(({ allocations, ...v }) => v);
}

export interface CustomerLoyalty {
  customerId: string;
  /** Derived points balance: Σ unspent over vintages (a
   *  clawback-driven debt reads negative — the customer owes
   *  points back; it is shown, never hidden). */
  points: number;
  /** The subledger liability in rupees (the GL view). Asserted
   *  equal to Σ vintage rsUnspent by the H1 suite. */
  rupees: number;
  /** Points a redemption may consume right now: the net balance
   *  floored at zero (debt vintages are not spendable). */
  redeemablePoints: number;
  tier: LoyaltyTier;
  /** The tier's earn multiplier (the NEXT earn's speed). */
  tierMult: number;
  /** Points earned in the trailing 12 months (the tier basis). */
  earned12m: number;
  vintages: LoyaltyVintage[];
}

/* ------------------------------------------------------------------ */
/* Tiers (design §1.6) — standing from earning, never stored           */
/* ------------------------------------------------------------------ */

export type LoyaltyTier = "standard" | "silver" | "gold";

/** Points EARNED (gross positive earns) by one customer in the
 *  trailing `months` before `nowISO` — the tier qualification
 *  basis. Clawbacks do not un-earn history for tier purposes:
 *  tier measures custom, and it buys earn speed only. */
export function pointsEarnedInWindow(
  entries: JournalEntry[],
  customerId: string,
  nowISO: string,
  months = 12
): number {
  const from = monthsBeforeInstant(nowISO, months);
  let n = 0;
  for (const e of entries) {
    if (e.refType !== "loyalty_earn" || (e.points ?? 0) <= 0) continue;
    if (e.ts < from || e.ts > nowISO) continue;
    if (loyaltyEntryCustomerId(e) === customerId) n += e.points as number;
  }
  return n;
}

export function tierForEarned(
  earnedPoints: number,
  s: ResolvedLoyaltySettings
): { tier: LoyaltyTier; mult: number } {
  if (earnedPoints >= s.goldAt) return { tier: "gold", mult: s.goldMult };
  if (earnedPoints >= s.silverAt) return { tier: "silver", mult: s.silverMult };
  return { tier: "standard", mult: 1 };
}

/** One customer's full derived loyalty position. */
export function customerLoyalty(
  entries: JournalEntry[],
  customerId: string,
  settings: ResolvedLoyaltySettings,
  nowISO: string
): CustomerLoyalty {
  const vintages = loyaltyVintages(entries, customerId);
  const points = vintages.reduce((a, v) => a + v.pointsUnspent, 0);
  const earned12m = pointsEarnedInWindow(entries, customerId, nowISO);
  const { tier, mult } = tierForEarned(earned12m, settings);
  return {
    customerId,
    points,
    rupees: customerLoyaltyRupees(entries, customerId),
    redeemablePoints: Math.max(0, points),
    tier,
    tierMult: mult,
    earned12m,
    vintages,
  };
}

/* ------------------------------------------------------------------ */
/* Programme-wide derivations (the loyalty desk)                       */
/* ------------------------------------------------------------------ */

export interface LoyaltyProgrammeTotals {
  /** GL(loyalty_payable) — the balance-sheet figure. */
  liabilityRs: number;
  /** Σ per-customer derived points (asserted to reconcile with
   *  the rupee figure through the vintage rates). */
  pointsOutstanding: number;
  customersWithBalance: number;
  /** Unspent points in vintages expiring within `withinDays`
   *  (and not yet due) — the desk's forward warning. */
  expiringSoonPoints: number;
  expiringSoonRs: number;
  /** Vintages past expiry whose points remain unspent and
   *  unposted — shown as "expired, awaiting posting"; the
   *  liability honestly includes them until the owner posts. */
  expiredUnposted: LoyaltyVintage[];
  expiredUnpostedPoints: number;
  expiredUnpostedRs: number;
}

export function loyaltyCustomerIds(entries: JournalEntry[]): string[] {
  return [...loyaltyRupeesByCustomer(entries).keys()];
}

function isDue(v: LoyaltyVintage, todayISO: string): boolean {
  return v.pointsUnspent > 0 && v.expiresOnISO <= todayISO;
}

export function loyaltyProgrammeTotals(
  entries: JournalEntry[],
  nowISO: string,
  withinDays = 30
): LoyaltyProgrammeTotals {
  const todayISO = businessDateISO(nowISO);
  const soonDate = addDaysISO(todayISO, withinDays);
  let pointsOutstanding = 0;
  let customersWithBalance = 0;
  let expiringSoonPoints = 0;
  let expiringSoonRs = 0;
  const expiredUnposted: LoyaltyVintage[] = [];
  for (const cid of loyaltyCustomerIds(entries)) {
    const vintages = loyaltyVintages(entries, cid);
    const pts = vintages.reduce((a, v) => a + v.pointsUnspent, 0);
    pointsOutstanding += pts;
    if (pts !== 0 || customerLoyaltyRupees(entries, cid) !== 0) {
      customersWithBalance += 1;
    }
    for (const v of vintages) {
      if (v.pointsUnspent <= 0) continue;
      if (isDue(v, todayISO)) expiredUnposted.push(v);
      else if (v.expiresOnISO <= soonDate) {
        expiringSoonPoints += v.pointsUnspent;
        expiringSoonRs = round2(expiringSoonRs + v.rsUnspent);
      }
    }
  }
  return {
    liabilityRs: accountNormalBalance(entries, "loyalty_payable"),
    pointsOutstanding,
    customersWithBalance,
    expiringSoonPoints,
    expiringSoonRs,
    expiredUnposted,
    expiredUnpostedPoints: expiredUnposted.reduce((a, v) => a + v.pointsUnspent, 0),
    expiredUnpostedRs: round2(
      expiredUnposted.reduce((a, v) => a + v.rsUnspent, 0)
    ),
  };
}

/** The derived expiry due-list for one customer (or every
 *  customer when null): vintages past their snapshotted expiry
 *  with points still unspent — nothing here posts anything. */
export function loyaltyExpiryDue(
  entries: JournalEntry[],
  nowISO: string,
  customerId?: string | null
): Array<{ customerId: string; vintage: LoyaltyVintage }> {
  const todayISO = businessDateISO(nowISO);
  const ids = customerId ? [customerId] : loyaltyCustomerIds(entries);
  const out: Array<{ customerId: string; vintage: LoyaltyVintage }> = [];
  for (const cid of ids) {
    for (const v of loyaltyVintages(entries, cid)) {
      if (isDue(v, todayISO)) out.push({ customerId: cid, vintage: v });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Earn (design §1.3)                                                  */
/* ------------------------------------------------------------------ */

export interface LoyaltyEarnQuote {
  points: number;
  /** points × the CURRENT pointValueRs — the liability the earn
   *  entry will recognise (and snapshot). */
  rs: number;
  tier: LoyaltyTier;
  mult: number;
}

/** What a bill of `netPayableRs` earns for this customer right
 *  now: whole points, floored, at the tier multiplier the
 *  customer's trailing-12-month earning buys. Null when the
 *  programme is off, the bill is walk-in handled by the caller,
 *  or nothing is earned (a sub-base bill, a zero total). */
export function loyaltyEarnQuote(
  entries: JournalEntry[],
  customerId: string,
  netPayableRs: number,
  s: ResolvedLoyaltySettings,
  nowISO: string
): LoyaltyEarnQuote | null {
  if (!s.enabled || !(netPayableRs > 0)) return null;
  const earned12m = pointsEarnedInWindow(entries, customerId, nowISO);
  const { tier, mult } = tierForEarned(earned12m, s);
  const points = Math.floor((netPayableRs / s.earnRsPerPointBase) * mult);
  if (points <= 0) return null;
  return { points, rs: round2(points * s.pointValueRs), tier, mult };
}

/** Compose the earn entry for a finalized bill (design §1.1):
 *  Dr `expense_loyalty` / Cr `loyalty_payable` (ref = customerId),
 *  refType `loyalty_earn`, refId = the bill's id, carrying the
 *  points payload + the rate / horizon / multiplier snapshots.
 *  Null when the bill earns nothing. Composed by the store
 *  INSIDE the bill's posting flow and written in its batch. */
export function buildLoyaltyEarnEntry(args: {
  journal: JournalEntry[];
  bill: Pick<Bill, "id" | "billNo" | "customerId" | "total">;
  settings: ResolvedLoyaltySettings;
  ts: string;
  dayOffset?: number;
}): JournalEntry | null {
  const { bill } = args;
  if (!bill.customerId) return null;
  const quote = loyaltyEarnQuote(
    args.journal,
    bill.customerId,
    bill.total,
    args.settings,
    args.ts
  );
  if (!quote) return null;
  const entry = makeEntry(
    `Loyalty points earned — Bill #${bill.billNo}`,
    "loyalty_earn",
    bill.id,
    [
      { account: "expense_loyalty", debit: quote.rs, credit: 0 },
      { account: "loyalty_payable", debit: 0, credit: quote.rs, ref: bill.customerId },
    ],
    { ts: args.ts, dayOffset: args.dayOffset ?? 0 }
  );
  entry.points = quote.points;
  entry.rsPerPoint = args.settings.pointValueRs;
  entry.loyaltyExpiryMonths = args.settings.expiryMonths;
  entry.loyaltyTierMult = quote.mult;
  return entry;
}

/* ------------------------------------------------------------------ */
/* Redemption (design §1.3) — a tender, quoted by the fold             */
/* ------------------------------------------------------------------ */

export interface LoyaltyRedemptionQuote {
  /** Points the tender will consume (clamped to the redeemable
   *  balance and to the rupee cap). */
  points: number;
  /** Their FIFO rupee value — the bill leg's amount. */
  rs: number;
}

/** Consume `pointsWanted` FIFO over the customer's unspent
 *  vintages, never past `capRs` of value: the quote the desk
 *  shows and the store re-validates at posting (the tender is
 *  clamped to the derived balance at composition time — never
 *  typed freehand past it). Whole points only; a point whose
 *  value would cross the cap is left unspent. */
export function loyaltyRedemptionQuote(
  entries: JournalEntry[],
  customerId: string,
  pointsWanted: number,
  capRs: number
): LoyaltyRedemptionQuote {
  const position = customerLoyaltyPositionRaw(entries, customerId);
  let budget = Math.min(
    Math.max(0, Math.floor(pointsWanted)),
    position.redeemablePoints
  );
  let points = 0;
  let rs = 0;
  for (const v of position.vintages) {
    if (budget <= 0) break;
    if (v.pointsUnspent <= 0) continue;
    // Points are consumed one vintage at a time; inside a
    // vintage every point carries the same snapshot rate, so
    // the cap binds at a whole-point boundary.
    let take = Math.min(v.pointsUnspent, budget);
    while (take > 0 && round2(rs + take * v.rsPerPoint) > capRs) take -= 1;
    if (take <= 0) break;
    points += take;
    rs = round2(rs + take * v.rsPerPoint);
    budget -= take;
  }
  return { points, rs };
}

/** Position without the tier computation (quote paths call this
 *  per keystroke; tier needs a window scan). */
function customerLoyaltyPositionRaw(
  entries: JournalEntry[],
  customerId: string
): { points: number; redeemablePoints: number; vintages: LoyaltyVintage[] } {
  const vintages = loyaltyVintages(entries, customerId);
  const points = vintages.reduce((a, v) => a + v.pointsUnspent, 0);
  return { points, redeemablePoints: Math.max(0, points), vintages };
}

/** The rupee cap a bill of `netPayableRs` imposes on a points
 *  tender: redeemCapPct of the amount that leaves the customer's
 *  pocket, floored to the paisa. */
export function loyaltyRedeemCapRs(
  netPayableRs: number,
  s: ResolvedLoyaltySettings
): number {
  return Math.floor(((netPayableRs * s.redeemCapPct) / 100) * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* Returns: re-credit + clawback (design §1.1/§1.4)                    */
/* ------------------------------------------------------------------ */

/** The bill's points facts, read off its journal entry: the
 *  points its tender settled and the rupee leg they carried. */
export function billLoyaltyTender(
  entries: JournalEntry[],
  billId: string
): { points: number; rs: number } {
  let points = 0;
  let rs = 0;
  for (const e of entries) {
    if (e.refId !== billId) continue;
    if ((e.loyaltyPointsUsed ?? 0) > 0) {
      points += e.loyaltyPointsUsed as number;
      for (const l of e.lines) {
        if (l.account === "loyalty_payable") rs += l.debit - l.credit;
      }
    }
  }
  return { points, rs: round2(rs) };
}

/** Points already re-credited against a bill by its returns /
 *  void (the fold's own inputs, summed). */
export function billLoyaltyReturnedPoints(
  entries: JournalEntry[],
  billId: string
): number {
  let n = 0;
  for (const e of entries) {
    if (e.refId === billId && (e.loyaltyPointsReturned ?? 0) > 0) {
      n += e.loyaltyPointsReturned as number;
    }
  }
  return n;
}

/**
 * What a return of `refundTotalRs` (the return engine's total
 * give-back: gross − discount share + exclusive tax share)
 * re-credits on a points-paid bill: the bill's tender unwinds
 * PROPORTIONALLY — the same fraction of the tender as the
 * fraction of the bill being given back — with the completing
 * return absorbing the exact remainder. The rupee figure is the
 * fold's LIFO restore value of those points (the mirror of the
 * FIFO consumption), so the re-credit lands on the vintages it
 * came from at their own snapshot rates and the §1.3 identity
 * survives the round trip.
 */
export function loyaltyRecreditForReturn(
  entries: JournalEntry[],
  bill: Pick<Bill, "id" | "total">,
  refundTotalRs: number,
  completesBill: boolean
): LoyaltyRedemptionQuote {
  const tender = billLoyaltyTender(entries, bill.id);
  if (tender.points <= 0 || !(bill.total > 0) || !(refundTotalRs > 0)) {
    return { points: 0, rs: 0 };
  }
  const already = billLoyaltyReturnedPoints(entries, bill.id);
  const remaining = tender.points - already;
  if (remaining <= 0) return { points: 0, rs: 0 };
  const points = completesBill
    ? remaining
    : Math.min(
        remaining,
        Math.round((tender.points * refundTotalRs) / bill.total)
      );
  if (points <= 0) return { points: 0, rs: 0 };
  // LIFO restore value: replay the customer's fold and price the
  // un-consumption of THIS bill's allocations, newest first.
  const billEntry = entries.find(
    (e) => e.refId === bill.id && (e.loyaltyPointsUsed ?? 0) > 0
  );
  const customerId = billEntry ? loyaltyEntryCustomerId(billEntry) : null;
  if (!customerId) return { points: 0, rs: 0 };
  const rs = restoreValueForBill(entries, customerId, bill.id, points);
  return { points, rs };
}

/** Price the restoration of `points` points of one bill's
 *  consumption, unwinding its allocations newest-first at the
 *  vintages' snapshot rates. Mirrors foldVintages' bookkeeping —
 *  both read the same allocations off the same replay, so the
 *  composer's figure and the fold's state can never disagree. */
function restoreValueForBill(
  entries: JournalEntry[],
  customerId: string,
  billId: string,
  points: number
): number {
  const state = foldVintages(entries, customerId);
  // The bill's allocation stack in consumption order (vintages in
  // creation order, their allocations in append order). The fold
  // has already applied every PRIOR restore to these records, so
  // `points − restored` per record is what this return may still
  // un-consume.
  const stack: Array<{ v: VintageState; rec: { points: number; restored: number } }> = [];
  for (const v of state) {
    for (const a of v.allocations) {
      if (a.billId === billId) stack.push({ v, rec: a });
    }
  }
  let give = points;
  let rs = 0;
  for (let k = stack.length - 1; k >= 0 && give > 0; k--) {
    const { v, rec } = stack[k];
    const can = rec.points - rec.restored;
    if (can <= 0) continue;
    const back = Math.min(can, give);
    rs = round2(rs + back * v.rsPerPoint);
    give -= back;
  }
  return rs;
}

/** The bill's earn entry (the live one — never a clawback, never
 *  an already-reversed earn). */
export function billLoyaltyEarnEntry(
  entries: JournalEntry[],
  billId: string
): JournalEntry | null {
  const reversedIds = new Set(
    entries.map((e) => e.reversesId).filter((x): x is string => !!x)
  );
  const earns = entries.filter(
    (e) =>
      e.refType === "loyalty_earn" &&
      e.refId === billId &&
      (e.points ?? 0) > 0 &&
      !reversedIds.has(e.id)
  );
  return earns[0] ?? null;
}

/** Points of a bill's earn already clawed back by its returns. */
export function billLoyaltyClawedPoints(
  entries: JournalEntry[],
  billId: string
): number {
  let n = 0;
  for (const e of entries) {
    if (
      e.refType === "loyalty_earn" &&
      (e.points ?? 0) < 0 &&
      e.loyaltySourceBillId === billId
    ) {
      n += -(e.points as number);
    }
  }
  return n;
}

/**
 * The clawback a return owes (design §1.4): the earn attributable
 * to the returned portion, computed CUMULATIVELY (the F-3
 * discipline — the share due on prior returns + this one, minus
 * what prior clawbacks already took) and FLOORED, so the paisa /
 * point remainder always stays with the customer. A completing
 * return absorbs the earn's exact remainder — a fully-returned
 * bill keeps no earn. `priorRefundedRs` is Σ prior returns'
 * total give-backs (refund + udhaar reduction + points
 * re-credit), read off the SaleReturn docs by the caller.
 */
export function loyaltyClawbackPoints(args: {
  journal: JournalEntry[];
  bill: Pick<Bill, "id" | "total">;
  refundTotalRs: number;
  priorRefundedRs: number;
  completesBill: boolean;
}): number {
  const earn = billLoyaltyEarnEntry(args.journal, args.bill.id);
  if (!earn || !(args.bill.total > 0)) return 0;
  const earnPoints = earn.points ?? 0;
  const already = billLoyaltyClawedPoints(args.journal, args.bill.id);
  const remaining = earnPoints - already;
  if (remaining <= 0) return 0;
  if (args.completesBill) return remaining;
  const cumulative = Math.floor(
    (earnPoints * (args.priorRefundedRs + args.refundTotalRs)) / args.bill.total
  );
  return Math.max(0, Math.min(remaining, cumulative - already));
}

/** Compose the clawback companion for a return (or, with the
 *  full remaining points, the void's earn reversal): a
 *  `loyalty_earn` entry with a NEGATIVE points payload —
 *  Dr `loyalty_payable` (ref = customerId) / Cr `expense_loyalty`
 *  at the ORIGINAL earn's snapshot rate, refId = the return /
 *  credit note's id, `loyaltySourceBillId` naming the bill whose
 *  earn it takes back. Null when nothing is owed. */
export function buildLoyaltyClawbackEntry(args: {
  journal: JournalEntry[];
  bill: Pick<Bill, "id" | "billNo" | "customerId">;
  clawPoints: number;
  refId: string;
  memo: string;
  ts: string;
  dayOffset?: number;
  reversesId?: string | null;
}): JournalEntry | null {
  if (!args.bill.customerId || !(args.clawPoints > 0)) return null;
  const earn = billLoyaltyEarnEntry(args.journal, args.bill.id);
  if (!earn) return null;
  const rate = earn.rsPerPoint ?? LOYALTY_DEFAULTS.pointValueRs;
  const rs = round2(args.clawPoints * rate);
  if (!(rs > 0)) return null;
  const entry = makeEntry(
    args.memo,
    "loyalty_earn",
    args.refId,
    [
      { account: "loyalty_payable", debit: rs, credit: 0, ref: args.bill.customerId },
      { account: "expense_loyalty", debit: 0, credit: rs },
    ],
    { ts: args.ts, dayOffset: args.dayOffset ?? 0, reversesId: args.reversesId ?? null }
  );
  entry.points = -args.clawPoints;
  entry.loyaltySourceBillId = args.bill.id;
  return entry;
}

/* ------------------------------------------------------------------ */
/* Expiry (design §1.5) — derived list, owner-posted                   */
/* ------------------------------------------------------------------ */

/** Compose one vintage's expiry release: Dr `loyalty_payable`
 *  (ref = customerId) / Cr `expense_loyalty` for its full unspent
 *  remainder at its snapshot rate — the promised cost never
 *  materialised, so the original cost reverses (never revenue).
 *  refType `loyalty_expire`, refId = the earn entry's id (the
 *  fold's targeting contract), `points` = the expired count.
 *  Null when the vintage has nothing left to release. */
export function buildLoyaltyExpiryEntry(args: {
  customerId: string;
  customerName: string;
  vintage: LoyaltyVintage;
  ts: string;
  dayOffset?: number;
}): JournalEntry | null {
  const v = args.vintage;
  if (v.pointsUnspent <= 0) return null;
  const entry = makeEntry(
    `Loyalty points expired — ${args.customerName}`,
    "loyalty_expire",
    v.earnEntryId,
    [
      { account: "loyalty_payable", debit: v.rsUnspent, credit: 0, ref: args.customerId },
      { account: "expense_loyalty", debit: 0, credit: v.rsUnspent },
    ],
    { ts: args.ts, dayOffset: args.dayOffset ?? 0 }
  );
  entry.points = v.pointsUnspent;
  return entry;
}

/* ------------------------------------------------------------------ */
/* The loyalty report (design §1.7 — joins the customers family)       */
/* ------------------------------------------------------------------ */

export interface LoyaltyReportRow {
  customerId: string;
  earnedPoints: number;
  redeemedPoints: number;
  recreditedPoints: number;
  clawedPoints: number;
  expiredPoints: number;
  /** Closing position at the range end (all history < toTs). */
  points: number;
  rupees: number;
}

export interface LoyaltyReport {
  earnedPoints: number;
  earnedRs: number;
  redeemedPoints: number;
  redeemedRs: number;
  recreditedPoints: number;
  recreditedRs: number;
  clawedPoints: number;
  clawedRs: number;
  expiredPoints: number;
  expiredRs: number;
  /** Closing liability at the range end (the balance-sheet view). */
  liabilityRs: number;
  liabilityPoints: number;
  rows: LoyaltyReportRow[];
}

/** Period movement + closing positions, folded from the journal
 *  alone — the same fold the desk reads, so the report can never
 *  disagree with the customer card. `range` is the reports
 *  layer's half-open instant window ({ fromTs, toTs }). */
export function loyaltyReport(
  entries: JournalEntry[],
  range: { fromTs: string; toTs: string }
): LoyaltyReport {
  const inRange = (e: JournalEntry) => e.ts >= range.fromTs && e.ts < range.toTs;
  const upToEnd = entries.filter((e) => e.ts < range.toTs);
  const totals = {
    earnedPoints: 0, earnedRs: 0,
    redeemedPoints: 0, redeemedRs: 0,
    recreditedPoints: 0, recreditedRs: 0,
    clawedPoints: 0, clawedRs: 0,
    expiredPoints: 0, expiredRs: 0,
  };
  const perCustomer = new Map<string, LoyaltyReportRow>();
  const rowOf = (cid: string): LoyaltyReportRow => {
    let r = perCustomer.get(cid);
    if (!r) {
      r = {
        customerId: cid, earnedPoints: 0, redeemedPoints: 0,
        recreditedPoints: 0, clawedPoints: 0, expiredPoints: 0,
        points: 0, rupees: 0,
      };
      perCustomer.set(cid, r);
    }
    return r;
  };
  for (const e of entries) {
    if (!inRange(e)) continue;
    const cid = loyaltyEntryCustomerId(e);
    if (e.refType === "loyalty_earn" && (e.points ?? 0) > 0 && cid) {
      const rs = e.lines
        .filter((l) => l.account === "expense_loyalty")
        .reduce((a, l) => a + l.debit - l.credit, 0);
      totals.earnedPoints += e.points as number;
      totals.earnedRs = round2(totals.earnedRs + rs);
      const r = rowOf(cid);
      r.earnedPoints += e.points as number;
    } else if (e.refType === "loyalty_earn" && (e.points ?? 0) < 0 && cid) {
      const rs = e.lines
        .filter((l) => l.account === "loyalty_payable")
        .reduce((a, l) => a + l.debit - l.credit, 0);
      totals.clawedPoints += -(e.points as number);
      totals.clawedRs = round2(totals.clawedRs + rs);
      rowOf(cid).clawedPoints += -(e.points as number);
    } else if (e.refType === "loyalty_expire" && (e.points ?? 0) > 0 && cid) {
      const rs = e.lines
        .filter((l) => l.account === "loyalty_payable")
        .reduce((a, l) => a + l.debit - l.credit, 0);
      totals.expiredPoints += e.points as number;
      totals.expiredRs = round2(totals.expiredRs + rs);
      rowOf(cid).expiredPoints += e.points as number;
    }
    if ((e.loyaltyPointsUsed ?? 0) > 0 && cid) {
      const rs = e.lines
        .filter((l) => l.account === "loyalty_payable")
        .reduce((a, l) => a + l.debit - l.credit, 0);
      totals.redeemedPoints += e.loyaltyPointsUsed as number;
      totals.redeemedRs = round2(totals.redeemedRs + rs);
      rowOf(cid).redeemedPoints += e.loyaltyPointsUsed as number;
    }
    if ((e.loyaltyPointsReturned ?? 0) > 0 && cid) {
      const rs = e.lines
        .filter((l) => l.account === "loyalty_payable")
        .reduce((a, l) => a + l.credit - l.debit, 0);
      totals.recreditedPoints += e.loyaltyPointsReturned as number;
      totals.recreditedRs = round2(totals.recreditedRs + rs);
      rowOf(cid).recreditedPoints += e.loyaltyPointsReturned as number;
    }
  }
  const rows: LoyaltyReportRow[] = [];
  for (const cid of loyaltyCustomerIds(upToEnd)) {
    const pos = customerLoyaltyPositionRaw(upToEnd, cid);
    const r = perCustomer.get(cid) ?? {
      customerId: cid, earnedPoints: 0, redeemedPoints: 0,
      recreditedPoints: 0, clawedPoints: 0, expiredPoints: 0,
      points: 0, rupees: 0,
    };
    r.points = pos.points;
    r.rupees = customerLoyaltyRupees(upToEnd, cid);
    rows.push(r);
  }
  rows.sort((a, b) => a.customerId.localeCompare(b.customerId));
  return {
    ...totals,
    liabilityRs: accountNormalBalance(upToEnd, "loyalty_payable"),
    liabilityPoints: rows.reduce((a, r) => a + r.points, 0),
    rows,
  };
}

/** Display helper for surfaces: a customer's name from the
 *  directory when known, else the id (a removed customer keeps
 *  his ledger — the fold never depends on the directory). */
export function loyaltyCustomerName(
  customers: Customer[],
  customerId: string
): string {
  return customers.find((c) => c.id === customerId)?.name ?? customerId;
}
