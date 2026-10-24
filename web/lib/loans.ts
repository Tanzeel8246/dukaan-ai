/**
 * Dukaan AI — loans register pure core (ERP Phase D · D3).
 *
 * Design: ERP-PHASE-D-DESIGN.md §3. One register, two directions,
 * one additive asset code (`loans_receivable`, D1). EVERYTHING
 * here is a pure derivation or an entry composition: the
 * instalment schedule is a function of the loan doc, outstanding
 * derives from the doc's append-only events diary (§3.3), and the
 * posting templates compose through the REAL `makeEntry` guard —
 * the store posts them through `guardPostings`, the single choke
 * point, in the same batch as the loan doc (the D2 pattern).
 *
 * Charges (§3.2): `chargeType: "none"` is the default and the
 * register's normal citizen. NOTHING in this module accrues a
 * charge on its own — the schedule PROPOSES, the desk POSTS, one
 * discrete confirmed event per instalment. Receivable loans are
 * charge-free in v1 (no charge-income code exists, and none is
 * invented here); write-offs do not exist in v1 either (no
 * gain/loss code — a waiver is never faked as a repayment).
 */
import type {
  JournalEntry,
  JournalLine,
  Loan,
  LoanDirection,
  PayMethod,
} from "./types";
import { accountForMethod, makeEntry } from "./ledger";
import { round2 } from "./tax";
import { buildMirrorEntry } from "./payroll";

export { buildMirrorEntry };

/* ------------------------------------------------------------------ */
/* Dates (ISO YYYY-MM-DD, UTC arithmetic — no timezone drift)          */
/* ------------------------------------------------------------------ */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(s: string | null | undefined): boolean {
  return typeof s === "string" && ISO_DATE.test(s);
}

function parseISO(iso: string): { y: number; m: number; d: number } {
  return {
    y: Number(iso.slice(0, 4)),
    m: Number(iso.slice(5, 7)),
    d: Number(iso.slice(8, 10)),
  };
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Shift an ISO date by whole months, clamping the day to the
 *  target month's length (31 Jan + 1 month → 28/29 Feb). */
export function addMonthsISO(iso: string, months: number): string {
  const { y, m, d } = parseISO(iso);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return toISO(ny, nm, Math.min(d, daysInMonth(ny, nm)));
}

/** Shift an ISO date by whole days. */
export function addDaysISO(iso: string, days: number): string {
  const { y, m, d } = parseISO(iso);
  const dt = new Date(Date.UTC(y, m - 1, d) + days * 86400000);
  return toISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** The due date of instalment `n` (1-based): the first due date
 *  stepped by the loan's cadence. */
export function instalmentDueISO(loan: Loan, n: number): string {
  const steps = n - 1;
  return loan.instalmentEvery === "week"
    ? addDaysISO(loan.firstDueISO, steps * 7)
    : addMonthsISO(loan.firstDueISO, steps);
}

/* ------------------------------------------------------------------ */
/* Terms: validation + the charge snapshot (design §3.1/§3.2)          */
/* ------------------------------------------------------------------ */

export interface LoanTerms {
  direction: LoanDirection;
  partyName: string;
  principal: number;
  chargeType: Loan["chargeType"];
  /** flat/reducing: percent. Ignored otherwise. */
  chargeRate: number;
  /** The upfront fee netted from proceeds at drawdown (any type);
   *  for `fee_only` loans this IS the charge. */
  feeAmount: number;
  instalmentCount: number;
}

/**
 * The composition refusals (design §3.2/§3.4), pure so the store
 * and the harness assert the SAME rules: returns a reason key or
 * null when the terms may compose. The receivable charge refusal
 * lives here — charged lending is refused at composition, never
 * silently zeroed.
 */
export function loanTermsError(
  terms: LoanTerms
): "principal" | "party" | "instalments" | "chargeReceivable" | "rate" | "fee" | null {
  if (!Number.isFinite(terms.principal) || !(terms.principal > 0)) return "principal";
  if (!terms.partyName || terms.partyName.trim().length === 0) return "party";
  if (!Number.isFinite(terms.instalmentCount) || terms.instalmentCount < 1) {
    return "instalments";
  }
  if (terms.direction === "receivable" && terms.chargeType !== "none") {
    return "chargeReceivable"; // §3.2 rule 3: receivable loans are charge-free in v1
  }
  if (
    (terms.chargeType === "flat" || terms.chargeType === "reducing") &&
    !(terms.chargeRate > 0)
  ) {
    return "rate";
  }
  const fee = terms.feeAmount || 0;
  if (terms.chargeType === "fee_only" && !(fee > 0)) return "fee";
  // A netted fee must leave positive proceeds — a fee at or above
  // the principal would draw down nothing (or less than nothing).
  if (!(fee >= 0) || fee >= terms.principal) return "fee";
  return null;
}

/**
 * The charge total snapshotted onto the loan doc at creation
 * (design §3.1): flat = % of the ORIGINAL principal over the
 * whole term; fee_only = the one-off fee itself. Reducing charges
 * depend on the schedule's outstanding, so no total exists at
 * creation (0 — the schedule computes each period's charge).
 */
export function loanChargeAmount(terms: {
  chargeType: Loan["chargeType"];
  principal: number;
  chargeRate: number;
  feeAmount: number;
}): number {
  if (terms.chargeType === "flat") {
    return round2((terms.principal * terms.chargeRate) / 100);
  }
  if (terms.chargeType === "fee_only") return round2(terms.feeAmount || 0);
  return 0;
}

/* ------------------------------------------------------------------ */
/* The schedule — a pure function of the loan doc (design §3.3)        */
/* ------------------------------------------------------------------ */

export interface LoanInstalment {
  /** 1-based instalment number. */
  n: number;
  dueISO: string;
  principalPart: number;
  chargePart: number;
  total: number;
}

/**
 * Split `total` into `count` parts by the cumulative-allocation
 * discipline (the F-3 pattern): each part is the rounded
 * cumulative target less what was already allocated, so the
 * parts sum EXACTLY to the total and the final part absorbs the
 * paisa residual (100,000 over 7 → 14,285.71 ×6 + 14,285.74).
 */
function splitEvenly(total: number, count: number): number[] {
  const parts: number[] = [];
  let allocated = 0;
  for (let i = 1; i <= count; i++) {
    const cum = round2((total * i) / count);
    parts.push(round2(cum - allocated));
    allocated = cum;
  }
  return parts;
}

/**
 * The instalment schedule (design §3.3): principal parts split
 * the principal evenly (final absorbs the residual); a FLAT
 * charge splits its snapshotted total the same way; a REDUCING
 * charge computes per period on the outstanding principal PER
 * THE SCHEDULE (the agreement — late payment never rewrites it);
 * `none`/`fee_only` instalments carry no charge (the fee was
 * recognised at drawdown, §3.4).
 */
export function loanSchedule(loan: Loan): LoanInstalment[] {
  const count = Math.max(0, Math.floor(loan.instalmentCount) || 0);
  if (count === 0) return [];
  const principalParts = splitEvenly(loan.principal, count);
  let chargeParts: number[];
  if (loan.chargeType === "flat") {
    chargeParts = splitEvenly(loan.chargeAmount, count);
  } else if (loan.chargeType === "reducing") {
    chargeParts = [];
    let outstanding = loan.principal;
    for (let i = 0; i < count; i++) {
      chargeParts.push(round2((outstanding * loan.chargeRate) / 100));
      outstanding = round2(outstanding - principalParts[i]);
    }
  } else {
    chargeParts = principalParts.map(() => 0);
  }
  return principalParts.map((principalPart, i) => ({
    n: i + 1,
    dueISO: instalmentDueISO(loan, i + 1),
    principalPart,
    chargePart: chargeParts[i],
    total: round2(principalPart + chargeParts[i]),
  }));
}

/* ------------------------------------------------------------------ */
/* Position — derived from the events diary (design §3.3)              */
/* ------------------------------------------------------------------ */

export interface LoanPosition {
  /** A drawdown event stands (net of any reversal): the loan
   *  has actually been drawn. The §10.3 demo loan has none —
   *  its outstanding still derives (principal, unpaid), which
   *  the demo tolerates; cloud loans are born drawn. */
  drawn: boolean;
  principalRepaid: number;
  /** Charges accrued by desk-confirmed `charge` events (§3.4) —
   *  fee events are NOT accruals: the fee was expensed and
   *  netted at drawdown, it never adds to outstanding. */
  chargesAccrued: number;
  chargesRepaid: number;
  feesRecognised: number;
  totalRepaid: number;
  /** principal − principalRepaid + chargesAccrued − chargesRepaid. */
  outstanding: number;
}

/**
 * Fold the loan's append-only events diary into its position.
 * Reversal events carry negated figures (the D2 diary pattern),
 * so every sum is NET — a reversed event contributes nothing.
 * Attribution (the principal/charge split inside one repayment)
 * lives ONLY here; journal lines carry the whole amount (§3.3).
 */
export function loanPosition(loan: Loan): LoanPosition {
  let drawnAmount = 0;
  let principalRepaid = 0;
  let chargesAccrued = 0;
  let chargesRepaid = 0;
  let feesRecognised = 0;
  let totalRepaid = 0;
  for (const ev of loan.events ?? []) {
    if (ev.kind === "drawdown") drawnAmount += ev.amount;
    else if (ev.kind === "charge") chargesAccrued += ev.amount;
    else if (ev.kind === "fee") feesRecognised += ev.amount;
    else if (ev.kind === "repayment") {
      totalRepaid += ev.amount;
      principalRepaid += ev.principalPart;
      chargesRepaid += ev.chargePart;
    }
    // "writeoff" events never exist in v1 (§3.4) — ignored by design.
  }
  return {
    drawn: drawnAmount > 0,
    principalRepaid: round2(principalRepaid),
    chargesAccrued: round2(chargesAccrued),
    chargesRepaid: round2(chargesRepaid),
    feesRecognised: round2(feesRecognised),
    totalRepaid: round2(totalRepaid),
    outstanding: round2(
      loan.principal - principalRepaid + chargesAccrued - chargesRepaid
    ),
  };
}

/**
 * The journal-side position of ONE loan — the money truth the
 * events diary must reconcile with (§3.3's asserted identity):
 * payable = Σ (credit − debit) over `loans_payable` lines citing
 * the loan; receivable mirrors on `loans_receivable`. For a
 * DRAWN loan this equals `loanPosition(loan).outstanding` to the
 * paisa; an undrawn (demo) loan has no journal behind it.
 */
export function loanJournalPosition(
  entries: JournalEntry[],
  loan: Loan
): number {
  const code = loan.direction === "payable" ? "loans_payable" : "loans_receivable";
  let pos = 0;
  for (const e of entries) {
    for (const l of e.lines) {
      if (l.account !== code || (l.ref ?? null) !== loan.id) continue;
      pos +=
        loan.direction === "payable"
          ? l.credit - l.debit
          : l.debit - l.credit;
    }
  }
  return round2(pos);
}

/**
 * How many instalments' charges stand accrued. Charge accrual is
 * ordinal (§3.4): the desk accrues instalments in due order, one
 * event per instalment, so the k-th standing charge event IS
 * instalment k's accrual. A reversal event (negated amount)
 * un-accrues the latest.
 */
export function accruedChargeCount(loan: Loan): number {
  let count = 0;
  for (const ev of loan.events ?? []) {
    if (ev.kind !== "charge") continue;
    if (ev.amount > 0) count++;
    else if (ev.amount < 0) count--;
  }
  return Math.max(0, count);
}

/** The next instalment whose charge is due to accrue, or null —
 *  the Loans screen's "due now" proposal list (§3.4). The
 *  schedule proposes; nothing posts until the desk confirms. */
export function nextChargeAccrual(loan: Loan): LoanInstalment | null {
  if (loan.direction !== "payable") return null;
  if (loan.chargeType !== "flat" && loan.chargeType !== "reducing") return null;
  if (loan.status !== "active") return null;
  const schedule = loanSchedule(loan);
  const next = schedule[accruedChargeCount(loan)];
  return next && next.chargePart > 0 ? next : null;
}

/* ------------------------------------------------------------------ */
/* Per-instalment state (design §3.3/§3.5)                             */
/* ------------------------------------------------------------------ */

export interface LoanInstalmentState extends LoanInstalment {
  /** Whether this instalment's charge stands accrued (ordinal). */
  chargeAccrued: boolean;
  /** The amount currently OWED on this instalment: its principal
   *  part plus its charge part once accrued (an un-accrued
   *  charge is not yet owed — §3.4's per-instalment matching). */
  owed: number;
  /** Repayment money applied to this instalment, in order. */
  paidAmount: number;
  state: "paid" | "partial" | "overdue" | "due" | "upcoming";
}

/**
 * Derive every instalment's state: repayment money applies in
 * instalment order against what each instalment OWES (principal
 * + accrued charge); an instalment past its due date with money
 * still owed is OVERDUE. Pure — the register, the detail screen
 * and the harness all read this one derivation.
 */
export function loanInstalmentStates(
  loan: Loan,
  todayISO: string
): LoanInstalmentState[] {
  const pos = loanPosition(loan);
  const accrued = accruedChargeCount(loan);
  let remaining = pos.totalRepaid;
  return loanSchedule(loan).map((inst) => {
    const chargeAccrued = inst.chargePart > 0 ? inst.n <= accrued : false;
    const owed = round2(inst.principalPart + (chargeAccrued ? inst.chargePart : 0));
    const paidAmount = round2(Math.min(owed, Math.max(0, remaining)));
    remaining = round2(remaining - paidAmount);
    const state: LoanInstalmentState["state"] =
      owed > 0 && paidAmount >= owed - 0.001
        ? "paid"
        : paidAmount > 0
          ? "partial"
          : inst.dueISO < todayISO && owed > 0
            ? "overdue"
            : inst.dueISO <= todayISO
              ? "due"
              : "upcoming";
    return { ...inst, chargeAccrued, owed, paidAmount, state };
  });
}

/** The first instalment still carrying owed money (with its
 *  state), plus the count of overdue instalments — the
 *  register's "due next" cell (§3.5). Null when nothing is owed. */
export function loanNextDue(
  loan: Loan,
  todayISO: string
): { instalment: LoanInstalmentState; overdueCount: number } | null {
  const states = loanInstalmentStates(loan, todayISO);
  const overdueCount = states.filter((s) => s.state === "overdue").length;
  const next = states.find((s) => s.owed - s.paidAmount > 0.001);
  return next ? { instalment: next, overdueCount } : null;
}

/* ------------------------------------------------------------------ */
/* Repayment split (design §3.4)                                       */
/* ------------------------------------------------------------------ */

/**
 * The default attribution of a repayment: CHARGES FIRST (the
 * schedule's standing charges are settled before principal), the
 * remainder to principal. The desk may override the split at
 * repayment time; the split is attribution (§3.3) — the journal
 * line is the whole amount either way.
 */
export function defaultRepaymentSplit(
  loan: Loan,
  amount: number
): { principalPart: number; chargePart: number } {
  const pos = loanPosition(loan);
  const chargeDue = Math.max(0, round2(pos.chargesAccrued - pos.chargesRepaid));
  const chargePart = round2(Math.min(amount, chargeDue));
  return { principalPart: round2(amount - chargePart), chargePart };
}

/** Validate a (possibly desk-overridden) split against the
 *  loan's derived position: the parts sum to the amount, and
 *  neither part exceeds what is actually owed on its side. */
export function repaymentSplitError(
  loan: Loan,
  amount: number,
  split: { principalPart: number; chargePart: number }
): "split" | "overpay" | null {
  const pos = loanPosition(loan);
  if (!(amount > 0)) return "split";
  if (amount > pos.outstanding + 0.001) return "overpay";
  if (Math.abs(split.principalPart + split.chargePart - amount) > 0.011) {
    return "split";
  }
  const chargeDue = Math.max(0, round2(pos.chargesAccrued - pos.chargesRepaid));
  const principalDue = Math.max(0, round2(loan.principal - pos.principalRepaid));
  if (split.chargePart > chargeDue + 0.001) return "split";
  if (split.principalPart > principalDue + 0.001) return "split";
  return null;
}

/** The cached status label, recomputed inside every event batch
 *  (§3.3): a drawn loan whose outstanding reaches zero is
 *  settled; a cancelled loan (drawdown reversed) stays cancelled. */
export function loanStatusFor(loan: Loan): Loan["status"] {
  if (loan.status === "cancelled") return "cancelled";
  const pos = loanPosition(loan);
  return pos.drawn && pos.outstanding <= 0.001 ? "settled" : "active";
}

/** Register header totals (design §3.5): derived outstanding
 *  summed per direction over non-cancelled loans. */
export function loansRegisterTotals(loans: Loan[]): {
  borrowedOutstanding: number;
  lentOutstanding: number;
} {
  let borrowedOutstanding = 0;
  let lentOutstanding = 0;
  for (const loan of loans ?? []) {
    if (loan.status === "cancelled") continue;
    const out = loanPosition(loan).outstanding;
    if (loan.direction === "payable") borrowedOutstanding += out;
    else lentOutstanding += out;
  }
  return {
    borrowedOutstanding: round2(borrowedOutstanding),
    lentOutstanding: round2(lentOutstanding),
  };
}

/* ------------------------------------------------------------------ */
/* Posting templates (design §3.4) — composed here, posted by the     */
/* store through `guardPostings`. `makeEntry` enforces the balance.   */
/* ------------------------------------------------------------------ */

/**
 * Drawdown (design §3.4). Payable — money in:
 *   Dr money (ref: account) P · Cr loans_payable (ref: loan) P
 * With a fee netted from proceeds (a `fee_only` charge, or an
 * upfront fee on any type), ONE entry:
 *   Dr money (P − F) · Dr expense_finance F · Cr loans_payable P
 * Receivable — money out, the mirror on `loans_receivable`:
 *   Dr loans_receivable (ref: loan) P · Cr money (ref: account) P
 * Receivable loans never carry a fee (charge-free, §3.2 rule 3).
 */
export function buildLoanDrawdownEntry(
  loan: Loan,
  args: {
    method: PayMethod;
    accountId: string | null;
    feeAmount?: number;
    ts?: string;
    dayOffset?: number;
  }
): JournalEntry {
  const money = accountForMethod(args.method);
  const fee = loan.direction === "payable" ? round2(args.feeAmount || 0) : 0;
  const lines: JournalLine[] =
    loan.direction === "payable"
      ? [
          {
            account: money,
            debit: round2(loan.principal - fee),
            credit: 0,
            ref: args.accountId,
          },
          ...(fee > 0
            ? [
                {
                  account: "expense_finance" as const,
                  debit: fee,
                  credit: 0,
                  ref: null,
                },
              ]
            : []),
          {
            account: "loans_payable" as const,
            debit: 0,
            credit: loan.principal,
            ref: loan.id,
          },
        ]
      : [
          {
            account: "loans_receivable" as const,
            debit: loan.principal,
            credit: 0,
            ref: loan.id,
          },
          {
            account: money,
            debit: 0,
            credit: loan.principal,
            ref: args.accountId,
          },
        ];
  return makeEntry(
    `Loan drawdown ${loan.number} — ${loan.partyName}`,
    "loan_drawdown",
    loan.id,
    lines,
    { ts: args.ts, dayOffset: args.dayOffset ?? 0 }
  );
}

/**
 * One instalment's charge accrual (design §3.4): Dr
 * `expense_finance` / Cr `loans_payable` (ref: loan), posted
 * ONLY as a discrete desk-confirmed event — one entry per
 * instalment, so the expense stays honestly period-shaped.
 * Payable loans only (receivable lending is charge-free, §3.2).
 */
export function buildLoanChargeEntry(
  loan: Loan,
  args: { instalment: LoanInstalment; ts?: string; dayOffset?: number }
): JournalEntry {
  return makeEntry(
    `Loan charge ${loan.number} — instalment ${args.instalment.n}`,
    "loan_charge",
    loan.id,
    [
      {
        account: "expense_finance",
        debit: args.instalment.chargePart,
        credit: 0,
        ref: null,
      },
      {
        account: "loans_payable",
        debit: 0,
        credit: args.instalment.chargePart,
        ref: loan.id,
      },
    ],
    { ts: args.ts, dayOffset: args.dayOffset ?? 0 }
  );
}

/**
 * A repayment (design §3.4), either direction. The journal line
 * is the WHOLE amount; the principal/charge split rides on the
 * loan doc's event (attribution, §3.3), never on the lines.
 *   payable:    Dr loans_payable (ref: loan) X / Cr money X
 *   receivable: Dr money X / Cr loans_receivable (ref: loan) X
 */
export function buildLoanRepaymentEntry(
  loan: Loan,
  args: {
    amount: number;
    method: PayMethod;
    accountId: string | null;
    ts?: string;
    dayOffset?: number;
  }
): JournalEntry {
  const money = accountForMethod(args.method);
  const lines: JournalLine[] =
    loan.direction === "payable"
      ? [
          {
            account: "loans_payable" as const,
            debit: args.amount,
            credit: 0,
            ref: loan.id,
          },
          {
            account: money,
            debit: 0,
            credit: args.amount,
            ref: args.accountId,
          },
        ]
      : [
          {
            account: money,
            debit: args.amount,
            credit: 0,
            ref: args.accountId,
          },
          {
            account: "loans_receivable" as const,
            debit: 0,
            credit: args.amount,
            ref: loan.id,
          },
        ];
  return makeEntry(
    `Loan repayment ${loan.number} — ${loan.partyName}`,
    "loan_repayment",
    loan.id,
    lines,
    { ts: args.ts, dayOffset: args.dayOffset ?? 0 }
  );
}
