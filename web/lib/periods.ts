/**
 * Dukaan AI — period locking & fiscal-year foundation (ERP Phase A · A5).
 *
 * Design: ERP-PHASE-A-DESIGN.md §5. Pure helpers only — the store
 * (components/StoreProvider.tsx) wires them into the journal choke
 * point, the Finance period picker and the Settings Fiscal section,
 * and the verification harness exercises them directly.
 *
 * Model (design §5.1):
 *  - The enforcement value is `lockedThrough` on the owner doc: an
 *    ISO instant, "" / absent = nothing locked. Locks are monotonic
 *    (a close only ever moves the instant forward; moving it back is
 *    a recorded reopen) and date-granular in effect: a close through
 *    a business DATE stores that date's end-of-day Asia/Karachi
 *    instant, so everything dated on or before it is closed.
 *  - The `periods` collection is the audit trail of close/reopen
 *    events; this module never writes it — it only computes.
 *  - An entry's business instant is its `ts` (creation instant ==
 *    business instant everywhere in the app; backdating is not a
 *    feature). Its business DATE is the Asia/Karachi calendar date
 *    of that instant, stamped onto the entry as `dateISO` at posting
 *    time — the field the Firestore rules backstop (§5.3) compares.
 *
 * Pakistan keeps a fixed UTC+05:00 offset year-round (no DST), so
 * PKT calendar arithmetic is exact with a constant offset.
 */
import type { JournalEntry, ShopSettings } from "./types";

/** Asia/Karachi offset from UTC, in milliseconds (+05:00, no DST). */
export const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

const DAY_MS = 86400000;

/**
 * Thrown by the posting guard when a journal entry's business instant
 * falls on or before `lockedThrough`. Desks catch it by `code` (or
 * `instanceof`) and surface the dictionary string
 * `fin.period.lockedError` — the refusal is a user-facing business
 * rule, never a silent failure.
 */
export class PeriodLockedError extends Error {
  readonly code = "period-locked";
  readonly lockedThrough: string;
  constructor(lockedThrough: string) {
    super(`Period locked through ${lockedThrough}: posting refused.`);
    this.name = "PeriodLockedError";
    this.lockedThrough = lockedThrough;
  }
}

export function isPeriodLockedError(err: unknown): err is PeriodLockedError {
  return (
    err instanceof PeriodLockedError ||
    (typeof err === "object" &&
      err !== null &&
      (err as { code?: unknown }).code === "period-locked")
  );
}

/* ---------------- PKT calendar primitives ---------------- */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Format a UTC instant as the YYYY-MM-DD calendar date it falls on
 *  in Asia/Karachi. */
export function businessDateISO(tsISO: string): string {
  const t = Date.parse(tsISO);
  if (!Number.isFinite(t)) return "";
  const d = new Date(t + PKT_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** Today's Asia/Karachi calendar date (YYYY-MM-DD). */
export function todayPktISO(now: Date = new Date()): string {
  return businessDateISO(now.toISOString());
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateISO(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Add whole days to a YYYY-MM-DD date (pure calendar arithmetic). */
export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

/** The instant a PKT business date begins: 00:00:00.000 PKT. */
export function startOfDayPktInstant(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - PKT_OFFSET_MS).toISOString();
}

/** The instant a PKT business date ends: 23:59:59.999 PKT. A close
 *  "through <date>" stores exactly this instant as `lockedThrough`. */
export function endOfDayPktInstant(dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) - PKT_OFFSET_MS + DAY_MS - 1).toISOString();
}

/** The PKT date whose END is the given lock instant (for display and
 *  for the reopen picker's bounds). "" when nothing is locked. */
export function lockedThroughDate(lockedThrough: string | null | undefined): string {
  if (!lockedThrough) return "";
  return businessDateISO(lockedThrough);
}

/* ---------------- the lock guard (design §5.2) ---------------- */

/**
 * Is a posting whose business instant is `instantISO` refused under
 * this lock? Lexicographic comparison is sound: every instant the
 * app writes comes from `Date.toISOString()` (UTC ISO-8601, which
 * sorts lexicographically), and `lockedThrough` is stored in the
 * same form.
 */
export function isPeriodLocked(
  lockedThrough: string | null | undefined,
  instantISO: string
): boolean {
  if (!lockedThrough) return false;
  return instantISO <= lockedThrough;
}

/** The store-layer guard: refuse a posting dated inside the lock. */
export function assertPeriodOpen(
  lockedThrough: string | null | undefined,
  instantISO: string
): void {
  if (isPeriodLocked(lockedThrough, instantISO)) {
    throw new PeriodLockedError(lockedThrough as string);
  }
}

/**
 * Stamp an entry's business date (`dateISO`, derived from its `ts`)
 * if it does not carry one, and run the lock guard against its `ts`.
 * Called on EVERY posting at the store's choke points (cloud
 * `batchJournal` wrapper + the demo compose path), so a new entry
 * can neither reach Firestore nor demo state unstamped or backdated
 * into a closed period. Mutates and returns the entry.
 */
export function preparePosting<T extends JournalEntry>(
  entry: T,
  lockedThrough: string | null | undefined
): T {
  if (!entry.dateISO) entry.dateISO = businessDateISO(entry.ts);
  assertPeriodOpen(lockedThrough, entry.ts);
  return entry;
}

/* ---------------- close rail (design §5.4, risk R-5) ----------------
 * Firestore persistence queues writes while a device is offline; a
 * lock set over today/yesterday could strand unsynced postings dated
 * inside the closed range. A close may therefore cover at most the
 * day before yesterday (PKT). */

/** The latest date a period may be closed through, right now. */
export function maxClosableDateISO(now: Date = new Date()): string {
  return addDaysISO(todayPktISO(now), -2);
}

/** May the books be closed through `dateISO` (a valid PKT date)? */
export function canCloseThroughDate(dateISO: string, now: Date = new Date()): boolean {
  if (!isValidDateISO(dateISO)) return false;
  return dateISO <= maxClosableDateISO(now);
}

/* ---------------- corrections (design §5.2) ----------------
 * A correction of a document inside a closed period NEVER backdates:
 * its reversal + corrected entries post at TODAY's instant, in the
 * open period, referencing the original (`reversesId`). The closed
 * period's totals never change — exactly as in paper books. When the
 * original (and the corrected record's own date) are both in open
 * periods, the existing behaviour stands: the corrected entry keeps
 * the record's business date. */

/**
 * Decide the instant a corrected expense repost carries. If either
 * the ORIGINAL posting or the corrected record's target date falls
 * inside the lock, the repost dates to `nowTs` (dayOffset 0);
 * otherwise it keeps the target business date untouched.
 */
export function correctionDating(
  lockedThrough: string | null | undefined,
  originalTs: string,
  targetTs: string,
  targetDayOffset: number,
  nowTs: string
): { ts: string; dayOffset: number } {
  if (
    isPeriodLocked(lockedThrough, originalTs) ||
    isPeriodLocked(lockedThrough, targetTs)
  ) {
    return { ts: nowTs, dayOffset: 0 };
  }
  return { ts: targetTs, dayOffset: targetDayOffset };
}

/* ---------------- fiscal year (design §5.1) ---------------- */

export interface FiscalStart {
  month: number; // 1–12
  day: number; // 1–31 (clamped to the month when a year is materialised)
}

/** The shop's fiscal-year start, with the Pakistan default (1 July)
 *  for shops that have never set it (design §5.1, migration A5). */
export function fiscalStartOf(
  settings: Pick<ShopSettings, "fiscalYearStartMonth" | "fiscalYearStartDay"> | null | undefined
): FiscalStart {
  const month = settings?.fiscalYearStartMonth;
  const day = settings?.fiscalYearStartDay;
  return {
    month:
      typeof month === "number" && month >= 1 && month <= 12 ? Math.floor(month) : 7,
    day: typeof day === "number" && day >= 1 && day <= 31 ? Math.floor(day) : 1,
  };
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/** The concrete start DATE of the fiscal year that begins in the
 *  given calendar year (start day clamped to that month's length). */
export function fiscalStartDateInYear(start: FiscalStart, year: number): string {
  const day = Math.min(start.day, daysInMonth(year, start.month));
  return `${year}-${pad2(start.month)}-${pad2(day)}`;
}

export interface FiscalYearRange {
  /** First day of the fiscal year (YYYY-MM-DD, PKT calendar). */
  startDate: string;
  /** Last day of the fiscal year (YYYY-MM-DD, PKT calendar). */
  endDate: string;
  /** Instant bounds for journal filtering: `fromTs <= ts < toTs`. */
  fromTs: string;
  toTs: string;
}

function rangeOf(start: FiscalStart, startYear: number): FiscalYearRange {
  const startDate = fiscalStartDateInYear(start, startYear);
  const nextStart = fiscalStartDateInYear(start, startYear + 1);
  const endDate = addDaysISO(nextStart, -1);
  return {
    startDate,
    endDate,
    fromTs: startOfDayPktInstant(startDate),
    toTs: startOfDayPktInstant(nextStart),
  };
}

/** The fiscal year containing the given instant (by its PKT
 *  business date). */
export function fiscalYearRange(
  settings: Pick<ShopSettings, "fiscalYearStartMonth" | "fiscalYearStartDay"> | null | undefined,
  instantISO: string
): FiscalYearRange {
  const start = fiscalStartOf(settings);
  const bizDate = businessDateISO(instantISO);
  const year = Number(bizDate.slice(0, 4));
  const thisYearsStart = fiscalStartDateInYear(start, year);
  return rangeOf(start, bizDate >= thisYearsStart ? year : year - 1);
}

/** The fiscal year containing `now`. */
export function currentFiscalYear(
  settings: Pick<ShopSettings, "fiscalYearStartMonth" | "fiscalYearStartDay"> | null | undefined,
  now: Date = new Date()
): FiscalYearRange {
  return fiscalYearRange(settings, now.toISOString());
}

/** The fiscal year immediately before the one containing `now`. */
export function previousFiscalYear(
  settings: Pick<ShopSettings, "fiscalYearStartMonth" | "fiscalYearStartDay"> | null | undefined,
  now: Date = new Date()
): FiscalYearRange {
  const start = fiscalStartOf(settings);
  const cur = currentFiscalYear(settings, now);
  const curStartYear = Number(cur.startDate.slice(0, 4));
  return rangeOf(start, curStartYear - 1);
}
