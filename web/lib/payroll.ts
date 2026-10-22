/**
 * Dukaan AI — payroll pure core (ERP Phase D · D1).
 *
 * Design: ERP-PHASE-D-DESIGN.md §1.3/§1.4 (attendance summaries +
 * the proration rule) and §2.2 (the `salary_payable` subledger
 * composition). EVERYTHING here is a pure derivation: attendance
 * totals, earned base and employee positions are computed from
 * documents and journal lines at read time — never stored, never
 * posted. D1 posts nothing at all; D2's run composer consumes
 * `earnedBaseFor` and snapshots its result onto the run lines.
 */
import type {
  AttendanceMark,
  AttendanceMonth,
  Employee,
  JournalEntry,
  JournalLine,
  PayMethod,
  PayrollRun,
  PayrollRunLine,
} from "./types";
import { accountForMethod, accountNormalBalance, makeEntry } from "./ledger";
import { round2 } from "./tax";

/* ------------------------------------------------------------------ */
/* Month keys                                                          */
/* ------------------------------------------------------------------ */

/** The deterministic attendance doc id (design §1.3) — the
 *  stockLevels precedent: every mark is an idempotent write to
 *  a known doc, in cloud batches and demo state alike. */
export function attendanceDocId(employeeId: string, month: string): string {
  return `${employeeId}__${month}`;
}

/** Calendar days in a "YYYY-MM" month (28–31). 0 for a malformed key. */
export function daysInMonthOf(month: string): number {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return 0;
  const year = Number(m[1]);
  const mon = Number(m[2]);
  if (mon < 1 || mon > 12) return 0;
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

/** Shift a "YYYY-MM" month key by whole months (register navigation). */
export function shiftMonth(month: string, delta: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return month;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1 + delta, 1));
  const y = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${mm}`;
}

/** The current calendar month key in Asia/Karachi (the shop's
 *  business timezone — a plain UTC slice would flip the register
 *  a day early/late around midnight PKT). */
export function currentMonthKey(now: Date = new Date()): string {
  return new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

/* ------------------------------------------------------------------ */
/* Attendance (design §1.3/§1.4)                                       */
/* ------------------------------------------------------------------ */

/** One tap cycles the mark in this order (design §1.3); the tap
 *  after `off` clears the day back to unmarked. */
export const ATTENDANCE_CYCLE: AttendanceMark[] = [
  "present",
  "absent",
  "half",
  "leave",
  "off",
];

/** The mark a tap produces from the current one; `null` = clear
 *  the day (unmarked). From unmarked, a tap marks `present`. */
export function nextAttendanceMark(
  current: AttendanceMark | null | undefined
): AttendanceMark | null {
  if (!current) return "present";
  const i = ATTENDANCE_CYCLE.indexOf(current);
  if (i < 0) return "present";
  return i === ATTENDANCE_CYCLE.length - 1 ? null : ATTENDANCE_CYCLE[i + 1];
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  half: number;
  leave: number;
  off: number;
  /** Days carrying any mark at all. */
  markedDays: number;
  /** Paid units (design §1.4): present + 0.5 × half + leave + off
   *  — leave and weekly off days are paid by construction in the
   *  monthly bargain; a half day pays half. */
  workedUnits: number;
}

/** Per-employee tallies for one attendance doc (design §1.3) —
 *  derived on every read; the doc stores only the sparse marks. */
export function attendanceSummary(
  att: AttendanceMonth | null | undefined
): AttendanceSummary {
  const s: AttendanceSummary = {
    present: 0,
    absent: 0,
    half: 0,
    leave: 0,
    off: 0,
    markedDays: 0,
    workedUnits: 0,
  };
  if (!att) return s;
  for (const mark of Object.values(att.days ?? {})) {
    if (mark === "present") s.present++;
    else if (mark === "absent") s.absent++;
    else if (mark === "half") s.half++;
    else if (mark === "leave") s.leave++;
    else if (mark === "off") s.off++;
    else continue; // an unknown stored mark counts for nothing
    s.markedDays++;
  }
  s.workedUnits = s.present + 0.5 * s.half + s.leave + s.off;
  return s;
}

export interface EarnedBase {
  earnedBase: number;
  /** Absences beyond the paid-leave allowance (monthly basis;
   *  always 0 for daily basis — absence simply earns nothing). */
  unpaidAbsent: number;
  /** The units the pay was computed from: §1.4's workedUnits for
   *  monthly basis; present + 0.5 × half for daily basis. */
  workedUnits: number;
}

/**
 * The proration rule (design §1.4), pure and total:
 *
 *   monthly: unpaidAbsent = max(0, absent − paidLeaveDays)
 *            earnedBase   = round2(B × (D − unpaidAbsent) / D)
 *            — the full B when unpaidAbsent == 0. Only absence
 *            beyond the paid-leave allowance docks pay, pro-rata
 *            over calendar days; leave/off days are paid by
 *            construction.
 *   daily:   earnedBase   = round2(rate × (present + 0.5 × half))
 *
 * Recomputed at run composition and SNAPSHOTTED onto the run
 * line (D2) — after that, edits to this formula or to the
 * attendance doc cannot rewrite a posted slip.
 */
export function earnedBaseFor(
  emp: Pick<Employee, "payBasis" | "baseAmount" | "paidLeaveDays">,
  summary: AttendanceSummary,
  daysInMonth: number
): EarnedBase {
  if (emp.payBasis === "daily") {
    const units = summary.present + 0.5 * summary.half;
    return {
      earnedBase: round2(emp.baseAmount * units),
      unpaidAbsent: 0,
      workedUnits: units,
    };
  }
  const unpaidAbsent = Math.max(0, summary.absent - Math.max(0, emp.paidLeaveDays));
  const earnedBase =
    daysInMonth > 0
      ? round2(
          (emp.baseAmount * Math.max(0, daysInMonth - unpaidAbsent)) / daysInMonth
        )
      : 0;
  return { earnedBase, unpaidAbsent, workedUnits: summary.workedUnits };
}

/** True when a POSTED payroll run already covers this month —
 *  the register's warn-don't-lock signal (design §1.3): editing
 *  the month's marks afterwards changes no posted slip, it would
 *  only change a re-run, which D2's reversal discipline governs. */
export function hasPostedRunForMonth(
  runs: PayrollRun[] | null | undefined,
  month: string
): boolean {
  return (runs ?? []).some((r) => r.month === month && r.status === "posted");
}

/* ------------------------------------------------------------------ */
/* The `salary_payable` subledger (design §2.2)                        */
/* ------------------------------------------------------------------ */

/**
 * One employee's position, straight off the journal:
 * Σ (debit − credit) over `salary_payable` lines carrying their
 * id in `ref`. Positive ⇒ the employee owes the shop (net
 * advances outstanding); negative ⇒ the shop owes the employee
 * (accrued, unpaid). Lines with NO ref never enter a position —
 * they are the unassigned bucket below.
 */
export function employeePosition(
  entries: JournalEntry[],
  employeeId: string
): number {
  let pos = 0;
  for (const e of entries) {
    for (const l of e.lines) {
      if (l.account === "salary_payable" && (l.ref ?? null) === employeeId) {
        pos += l.debit - l.credit;
      }
    }
  }
  return round2(pos);
}

export interface SalaryPayableComposition {
  /** The GL balance of `salary_payable` on its normal (credit)
   *  side — what Finance shows for the account. */
  glBalance: number;
  /** Every employee a journal line cites, with their position
   *  (debit − credit; see `employeePosition`), sorted by id. */
  employees: Array<{ employeeId: string; position: number }>;
  /** Σ of what the shop owes employees (positions below zero). */
  owedToEmployees: number;
  /** Σ of net advances outstanding (positions above zero). */
  advancesOutstanding: number;
  /** The unassigned bucket, credit-positive: `salary_payable`
   *  lines carrying NO ref — today exactly the C4 production
   *  labour/overhead accruals, which are never re-attributed
   *  (the journal is append-only; §2.2 states the two-part
   *  model and this selector asserts it):
   *    glBalance == owedToEmployees − advancesOutstanding
   *                 + unassignedAccrued. */
  unassignedAccrued: number;
}

/** The honest two-part composition of `salary_payable` (§2.2):
 *  per-employee positions + the unassigned production bucket,
 *  summing to the GL exactly. */
export function salaryPayableComposition(
  entries: JournalEntry[]
): SalaryPayableComposition {
  const byEmployee = new Map<string, number>();
  let unassignedRaw = 0; // Σ (debit − credit) over ref-less lines
  for (const e of entries) {
    for (const l of e.lines) {
      if (l.account !== "salary_payable") continue;
      const ref = l.ref ?? null;
      if (ref === null) {
        unassignedRaw += l.debit - l.credit;
      } else {
        byEmployee.set(ref, (byEmployee.get(ref) ?? 0) + (l.debit - l.credit));
      }
    }
  }
  const employees = [...byEmployee.entries()]
    .map(([employeeId, position]) => ({ employeeId, position: round2(position) }))
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId));
  let owedToEmployees = 0;
  let advancesOutstanding = 0;
  for (const { position } of employees) {
    if (position < 0) owedToEmployees += -position;
    else if (position > 0) advancesOutstanding += position;
  }
  return {
    glBalance: accountNormalBalance(entries, "salary_payable"),
    employees,
    owedToEmployees: round2(owedToEmployees),
    advancesOutstanding: round2(advancesOutstanding),
    unassignedAccrued: round2(-unassignedRaw),
  };
}

/* ------------------------------------------------------------------ */
/* Run composition (D2, design §2.3/§2.4)                              */
/* ------------------------------------------------------------------ */

/** Totals over a run's lines — the run doc's cached totals are
 *  always THIS function of its lines, recomputed at every write,
 *  never an independent figure. */
export function payrollRunTotals(lines: PayrollRunLine[]): {
  gross: number;
  deductions: number;
  netAccrued: number;
} {
  let gross = 0;
  let deductions = 0;
  let netAccrued = 0;
  for (const l of lines) {
    gross += l.gross;
    deductions += l.deductions.reduce((s, d) => s + d.amount, 0);
    netAccrued += l.netAccrued;
  }
  return {
    gross: round2(gross),
    deductions: round2(deductions),
    netAccrued: round2(netAccrued),
  };
}

/** Recompute ONE line's derived figures after a desk edit
 *  (design §2.3: overrides live on the line snapshot — gross is
 *  earnedBase + allowances, net is gross − deductions, always). */
export function payrollLineTotals(line: PayrollRunLine): PayrollRunLine {
  const gross = round2(
    line.earnedBase + line.allowances.reduce((s, a) => s + a.amount, 0)
  );
  const netAccrued = round2(
    gross - line.deductions.reduce((s, d) => s + d.amount, 0)
  );
  return { ...line, gross, netAccrued };
}

/**
 * Compose a draft run's lines from the directory + the month's
 * attendance (design §2.3): one line per ACTIVE employee, the
 * §1.4 proration recomputed now and SNAPSHOTTED (counts, earned
 * base, current allowances) — after this, attendance or terms
 * edits cannot rewrite the line; the desk's overrides edit the
 * snapshot itself. Employees with no register doc compose from
 * a blank summary (monthly: full base when no absence is marked
 * — the register asserts nothing, §1.3; daily: 0 earned).
 */
export function buildRunLines(
  employees: Employee[],
  attendance: AttendanceMonth[],
  month: string
): PayrollRunLine[] {
  const dim = daysInMonthOf(month);
  const lines: PayrollRunLine[] = [];
  for (const emp of employees) {
    if (!emp.active) continue;
    const doc =
      attendance.find((a) => a.id === attendanceDocId(emp.id, month)) ?? null;
    const sum = attendanceSummary(doc);
    const earned = earnedBaseFor(emp, sum, dim);
    const line = payrollLineTotals({
      employeeId: emp.id,
      name: emp.name,
      payBasis: emp.payBasis,
      daysInMonth: dim,
      present: sum.present,
      absent: sum.absent,
      half: sum.half,
      leave: sum.leave,
      unpaidAbsent: earned.unpaidAbsent,
      earnedBase: earned.earnedBase,
      allowances: emp.allowances.map((a) => ({ ...a })),
      deductions: [],
      gross: 0,
      netAccrued: 0,
    });
    lines.push(line);
  }
  return lines;
}

/** Σ of a run's payment events for one employee — reversing
 *  events carry negative amounts, so this is the NET cash the
 *  run has paid them (design §2.3: paid state derives, and the
 *  payment events are the derivation's input alongside the
 *  journal). Pass `null` for the unassigned-bucket events. */
export function paidForRun(
  run: PayrollRun,
  employeeId: string | null
): number {
  let paid = 0;
  for (const p of run.payments) {
    if ((p.employeeId ?? null) === employeeId) paid += p.amount;
  }
  return round2(paid);
}

/** An employee's `salary_payable` position counting only the
 *  entries at or before the given entry (lexicographic (ts, id)
 *  order — the journal's own sort), EXCLUDING the given entry
 *  itself and any entry in `excludeIds`. The slip's "advance
 *  position before this run" (§2.7) is this function at the
 *  run's accrual entry, with the run's own payment entries
 *  excluded: everything the journal knew about the employee
 *  before the run posted. 0 when the bound entry is unknown. */
export function positionBeforeEntry(
  entries: JournalEntry[],
  employeeId: string,
  boundEntryId: string | null,
  excludeIds?: ReadonlySet<string>
): number {
  if (!boundEntryId) return 0;
  const bound = entries.find((e) => e.id === boundEntryId);
  if (!bound) return 0;
  let pos = 0;
  for (const e of entries) {
    if (e.id === boundEntryId) continue;
    if (excludeIds?.has(e.id)) continue;
    if (e.ts > bound.ts || (e.ts === bound.ts && e.id >= bound.id)) continue;
    for (const l of e.lines) {
      if (l.account === "salary_payable" && (l.ref ?? null) === employeeId) {
        pos += l.debit - l.credit;
      }
    }
  }
  return round2(pos);
}

export interface RunLineFigures {
  /** The line's net accrual (the snapshot's own figure). */
  netAccrued: number;
  /** Advance position (positive part) BEFORE this run posted,
   *  derived per §2.7 — later advances never rewrite it. */
  advanceBefore: number;
  /** Net cash this run has paid the employee (events, §2.3). */
  cashPaid: number;
  /** The §2.4/§2.7 allocation: the part of the pre-run advance
   *  this run's accrual absorbed —
   *  min(advanceBefore, max(0, netAccrued − cashPaid)). A pure
   *  rendering figure; recovery is never a posting. */
  advanceRecovered: number;
  /** What the shop still owes the employee RIGHT NOW
   *  (their current position, when negative). */
  stillOwed: number;
  /** Their advance outstanding RIGHT NOW (position, positive). */
  advanceOutstanding: number;
}

/** Every figure a run line's desk row and salary slip show,
 *  derived ONCE here from the run snapshot + the journal
 *  (design §2.3/§2.7: no third arithmetic anywhere). For a draft
 *  run (nothing posted) the accrual-side figures read off the
 *  CURRENT position: advanceBefore is today's advance position
 *  and recovery is what finalising would absorb. */
export function runLineFigures(
  entries: JournalEntry[],
  run: PayrollRun,
  line: PayrollRunLine
): RunLineFigures {
  const cashPaid = paidForRun(run, line.employeeId);
  const posNow = employeePosition(entries, line.employeeId);
  let advanceBefore: number;
  if (run.accrualEntryId) {
    const paymentEntryIds = new Set(run.payments.map((p) => p.entryId));
    advanceBefore = Math.max(
      0,
      positionBeforeEntry(entries, line.employeeId, run.accrualEntryId, paymentEntryIds)
    );
  } else {
    advanceBefore = Math.max(0, posNow);
  }
  return {
    netAccrued: line.netAccrued,
    advanceBefore,
    cashPaid,
    advanceRecovered: Math.min(
      advanceBefore,
      Math.max(0, round2(line.netAccrued - cashPaid))
    ),
    stillOwed: Math.max(0, -posNow),
    advanceOutstanding: Math.max(0, posNow),
  };
}

/* ------------------------------------------------------------------ */
/* Posting templates (D2, design §2.4) — composed here, posted by    */
/* the store through `guardPostings`, exactly like C3/C4/C5's        */
/* lib-composed entries. `makeEntry` enforces the balance (F-1).     */
/* ------------------------------------------------------------------ */

/**
 * The finalise entry (design §2.4): ONE entry, NET accrual —
 * per line with netAccrued > 0, Dr `expense_salary` /
 * Cr `salary_payable`, both lines carrying `ref = employeeId`.
 * Reducer deductions (gross − net) NEVER enter the journal:
 * money never earned is never posted (the design's recorded
 * rejection of the gross-up alternative). Returns null when no
 * line accrues anything — there is no entry to post.
 */
export function buildPayrollAccrualEntry(
  run: PayrollRun,
  opts?: { ts?: string; dayOffset?: number }
): JournalEntry | null {
  const lines: JournalLine[] = [];
  for (const l of run.lines) {
    if (!(l.netAccrued > 0)) continue;
    lines.push({
      account: "expense_salary",
      debit: l.netAccrued,
      credit: 0,
      ref: l.employeeId,
    });
    lines.push({
      account: "salary_payable",
      debit: 0,
      credit: l.netAccrued,
      ref: l.employeeId,
    });
  }
  if (lines.length === 0) return null;
  return makeEntry(
    run.number ? `Payroll ${run.number} — ${run.month}` : `Payroll — ${run.month}`,
    "payroll_accrual",
    run.id,
    lines,
    { ts: opts?.ts, dayOffset: opts?.dayOffset ?? 0 }
  );
}

/**
 * One payment event's entry (design §2.4): Dr `salary_payable`
 * (ref = employeeId, or NO ref for the unassigned production
 * bucket) / Cr the money account the payment settled from.
 * Advance recovery is NOT part of this entry — it is a §2.7
 * derivation, never a posting (the design's stated correction).
 */
export function buildPayrollPaymentEntry(args: {
  run: PayrollRun;
  employeeId: string | null;
  name: string;
  amount: number;
  method: PayMethod;
  accountId: string | null;
  ts?: string;
  dayOffset?: number;
}): JournalEntry {
  return makeEntry(
    args.run.number
      ? `Salary payment ${args.run.number} — ${args.name}`
      : `Salary payment — ${args.name}`,
    "payroll_payment",
    args.run.id,
    [
      {
        account: "salary_payable",
        debit: args.amount,
        credit: 0,
        ref: args.employeeId,
      },
      {
        account: accountForMethod(args.method),
        debit: 0,
        credit: args.amount,
        ref: args.accountId,
      },
    ],
    { ts: args.ts, dayOffset: args.dayOffset ?? 0 }
  );
}

/**
 * A salary advance (design §2.4): Dr `salary_payable`
 * (ref = employeeId) / Cr money. An advance is not an expense
 * (nothing earned yet) and not a customer-khata row — it rides
 * the employee's own subledger from birth; recovery derives.
 */
export function buildSalaryAdvanceEntry(args: {
  employeeId: string;
  name: string;
  amount: number;
  method: PayMethod;
  accountId: string | null;
  ts?: string;
  dayOffset?: number;
}): JournalEntry {
  return makeEntry(
    `Salary advance — ${args.name}`,
    "salary_advance",
    args.employeeId,
    [
      {
        account: "salary_payable",
        debit: args.amount,
        credit: 0,
        ref: args.employeeId,
      },
      {
        account: accountForMethod(args.method),
        debit: 0,
        credit: args.amount,
        ref: args.accountId,
      },
    ],
    { ts: args.ts, dayOffset: args.dayOffset ?? 0 }
  );
}

/** The universal mirror (design §2.6): a reversing entry whose
 *  lines negate the original's exactly, citing it via
 *  `reversesId`. The original stands forever; the pair nets to
 *  zero in every derivation. */
export function buildMirrorEntry(
  original: JournalEntry,
  memo: string,
  opts?: { ts?: string; dayOffset?: number }
): JournalEntry {
  return makeEntry(
    memo,
    original.refType,
    original.refId,
    original.lines.map((l) => ({
      account: l.account,
      debit: l.credit,
      credit: l.debit,
      ref: l.ref ?? null,
    })),
    { reversesId: original.id, ts: opts?.ts, dayOffset: opts?.dayOffset ?? 0 }
  );
}
