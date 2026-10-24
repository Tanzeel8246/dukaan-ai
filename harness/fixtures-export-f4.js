/**
 * Golden-fixture export for ERP Phase F · F4 (design §8.2, §9 F4:
 * "payroll/loan/close fixtures green; Tally export from the app
 * byte-compares against the web's export for the same fixture
 * journal"). Dev-only tooling — no app behaviour changes.
 * Companions fixtures-export.js (F1), -f2, -f3 are untouched:
 * their outputs must stay byte-stable.
 *
 * Composes the F4 scenarios through the REAL compiled web/lib
 * Phase D functions (lib/payroll, lib/loans, lib/fiscal,
 * lib/tally, lib/branding, lib/raast) — the same functions the
 * web store calls — and writes canonical JSON the Dart suite
 * asserts against: journal entries byte-for-byte (memo /
 * refType / refId / reversesId / lines), doc states, and the
 * derived figures (salary_payable composition checkpoints, loan
 * positions/schedules/states, FY checklist + close cycle, the
 * Tally model + XML + CSV strings).
 *
 * Run AFTER the harness compile:
 *   cd ../web && npx tsc -p ../harness/tsconfig.json
 *   node ../harness/harness.js            (must stay ALL SUITES GREEN)
 *   node ../harness/fixtures-export-f4.js (writes fixtures/f4-core.json)
 *
 * Self-checks: the whole F4 fixture journal's trial balance is
 * 0; the §2.2 identity (GL ≡ Σ employees + bucket) holds at
 * every payroll checkpoint; the loan journal position equals
 * the events-diary outstanding at every loan checkpoint; the
 * Tally totals reconcile to the range trial balance.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const L = require("./out/ledger.js");
const PR = require("./out/payroll.js");
const LN = require("./out/loans.js");
const FI = require("./out/fiscal.js");
const TA = require("./out/tally.js");
const BR = require("./out/branding.js");
const RA = require("./out/raast.js");
const PE = require("./out/periods.js");
const RP = require("./out/reports.js");
const PROD = require("./out/production.js");
const ST = require("./out/stock.js");

/* ---------------- fixture shop pieces ---------------- */

const f1 = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "f1-core.json"), "utf8")
);
const accounts = f1.accounts;
const products = [
  ...f1.products,
  { id: "p-pack", name: "Packing Box", salePrice: 40, costPrice: 20, stockQty: 100, reorderLevel: 10, stockClass: null },
  { id: "p-blend", name: "House Tea Blend 500g", salePrice: 950, costPrice: 0, stockQty: 0, reorderLevel: 5, stockClass: null },
];
const byId = new Map(products.map((p) => [p.id, p]));
const warehouses = [
  { id: "wh-main", name: "Main Warehouse", note: "", isDefault: true, archived: false, sortOrder: 0, ts: "2026-01-01T00:00:00.000Z" },
];
const baseLevels = products.map((p) => ST.makeLevel("wh-main", p.id, p.stockQty));
const bomV1 = {
  id: "bom-1", outputProductId: "p-blend", outputName: "House Tea Blend 500g",
  outputQty: 10, version: 1,
  lines: [
    { productId: "p-raw", name: "Raw Tea Leaf 1kg", qty: 8 },
    { productId: "p-sugar", name: "Sugar 1kg", qty: 2 },
    { productId: "p-pack", name: "Packing Box", qty: 10 },
  ],
  labourCost: 300, overheadCost: 100, active: true, note: "", ts: "2026-01-02T00:00:00.000Z",
};

const SETTINGS = { shopName: "Madina General Store", fiscalYearStartMonth: 7, fiscalYearStartDay: 1 };

/* ---------------- normalisation (F1 style, + id/ts for ordering) ---- */

function normEntry(e, label) {
  return {
    id: label, ts: e.ts, dayOffset: e.dayOffset, dateISO: e.dateISO ?? null,
    memo: e.memo, refType: e.refType, refId: e.refId, reversesId: e.reversesId ?? null,
    lines: e.lines.map((l) => ({ account: l.account, debit: l.debit, credit: l.credit, ref: l.ref ?? null })),
  };
}

function compJson(entries) {
  const c = PR.salaryPayableComposition(entries);
  return {
    glBalance: c.glBalance,
    employees: c.employees,
    owedToEmployees: c.owedToEmployees,
    advancesOutstanding: c.advancesOutstanding,
    unassignedAccrued: c.unassignedAccrued,
  };
}

function figJson(entries, run, line) {
  const f = PR.runLineFigures(entries, run, line);
  return {
    netAccrued: f.netAccrued, advanceBefore: f.advanceBefore, cashPaid: f.cashPaid,
    advanceRecovered: f.advanceRecovered, stillOwed: f.stillOwed,
    advanceOutstanding: f.advanceOutstanding,
  };
}

/** A labelled journal for one scenario: compose entries in
 *  order; labels e0, e1, … are assigned by position. */
function journalBuilder() {
  const entries = [];
  return {
    entries,
    add(entry) {
      const label = `e${entries.length}`;
      entries.push(entry);
      return label;
    },
    norm() {
      const labelById = new Map(entries.map((e, i) => [e.id, `e${i}`]));
      return entries.map((e, i) => {
        const n = normEntry(e, `e${i}`);
        if (n.reversesId && labelById.has(n.reversesId)) {
          n.reversesId = labelById.get(n.reversesId);
        }
        return n;
      });
    },
    labelOf(entry) {
      return `e${entries.indexOf(entry)}`;
    },
  };
}

const scenarios = [];
const push = (id, title, docs, entries, extra = {}) =>
  scenarios.push({ id, title, docs, entries, ...extra });

let failures = 0;
function check(cond, msg) {
  if (!cond) {
    failures++;
    console.error(`SELF-CHECK FAILED: ${msg}`);
  }
}
const near = (a, b) => Math.abs(a - b) <= 0.001;

/* ==================================================================
 * S1 — payroll cycle (§2.2/§2.4/§2.7): advance → production accrual
 * (unassigned bucket) → run finalise → partial pay → bucket pay →
 * full settle. The §2.2 identity is asserted at EVERY checkpoint.
 * ================================================================== */
{
  const employees = [
    { id: "emp-a", name: "Muhammad Aslam", phone: "03011111111", designation: "Counter in-charge", linkedUserEmail: null, joinDateISO: "2025-03-01", payBasis: "monthly", baseAmount: 30000, allowances: [{ label: "Transport", amount: 2000 }], paidLeaveDays: 2, active: true, note: "", ts: "2026-01-05T09:00:00.000Z" },
    { id: "emp-b", name: "Bilal Ahmed", phone: "03022222222", designation: "Loader", linkedUserEmail: null, joinDateISO: "2026-01-10", payBasis: "daily", baseAmount: 800, allowances: [], paidLeaveDays: 0, active: true, note: "", ts: "2026-01-05T09:00:00.000Z" },
    { id: "emp-c", name: "Left Worker", phone: "", designation: "", linkedUserEmail: null, joinDateISO: null, payBasis: "monthly", baseAmount: 45000, allowances: [], paidLeaveDays: 0, active: false, note: "left in August", ts: "2026-01-05T09:00:00.000Z" },
  ];
  const days = (marks) => {
    const out = {};
    let d = 1;
    for (const [mark, count] of marks) for (let i = 0; i < count; i++) out[String(d++)] = mark;
    return out;
  };
  const attendance = [
    { id: PR.attendanceDocId("emp-a", "2026-09"), employeeId: "emp-a", month: "2026-09", days: days([["present", 24], ["absent", 3], ["half", 2], ["leave", 1]]), ts: "2026-09-30T18:00:00.000Z" },
    { id: PR.attendanceDocId("emp-b", "2026-09"), employeeId: "emp-b", month: "2026-09", days: days([["present", 20], ["half", 4], ["absent", 6]]), ts: "2026-09-30T18:00:00.000Z" },
  ];

  const J = journalBuilder();
  const checkpoints = {};

  // 1 — advance to emp-a (5 Sep, cash from the till).
  const adv = PR.buildSalaryAdvanceEntry({ employeeId: "emp-a", name: "Muhammad Aslam", amount: 15000, method: "cash", accountId: "acct-till", ts: "2026-09-05T10:00:00.000Z" });
  J.add(adv);
  checkpoints.afterAdvance = compJson(J.entries);

  // 2 — a production issue whose labour accrues to the bucket.
  const order = {
    id: "pr-f4", number: "PR-9", bomId: bomV1.id, bomVersion: 1,
    bomSnapshot: PROD.snapshotOfBom(bomV1),
    outputProductId: "p-blend", outputName: "House Tea Blend 500g",
    warehouseId: "wh-main", plannedQty: 10, events: [], note: "", status: "open",
    dayOffset: 0, ts: "2026-09-12T09:00:00.000Z",
  };
  const issue = PROD.prepareIssue(order, products, baseLevels, warehouses, accounts, {
    runQty: 10, lines: PROD.defaultIssueLines({ bomSnapshot: order.bomSnapshot }, 10),
    labourCost: 300, overheadCost: 100, settlement: "accrue",
  });
  if ("problem" in issue) throw new Error(`S1 issue refused: ${issue.problem}`);
  // Pin the wall clock for a deterministic journal order.
  issue.prepared.entry.ts = "2026-09-12T09:05:00.000Z";
  J.add(issue.prepared.entry);
  checkpoints.afterIssue = compJson(J.entries);

  // 3 — the draft run: composed lines + desk edits (a reducer
  // deduction for emp-a, an overtime allowance for emp-b).
  let lines = PR.buildRunLines(employees, attendance, "2026-09");
  lines = lines.map((l) => {
    if (l.employeeId === "emp-a") return PR.payrollLineTotals({ ...l, deductions: [{ label: "EOBI", amount: 500 }] });
    if (l.employeeId === "emp-b") return PR.payrollLineTotals({ ...l, allowances: [{ label: "Overtime", amount: 1200 }] });
    return l;
  });
  const totals = PR.payrollRunTotals(lines);
  let run = {
    id: "run-sep", number: null, month: "2026-09", lines, totals, payments: [],
    accrualEntryId: null, status: "draft", note: "", dayOffset: 0, ts: "2026-09-30T19:00:00.000Z",
  };

  // 4 — finalise: PAY-1 + the ONE net accrual entry.
  run = { ...run, number: "PAY-1" };
  const accrual = PR.buildPayrollAccrualEntry(run, { ts: "2026-09-30T19:05:00.000Z" });
  if (!accrual) throw new Error("S1: accrual composed null");
  const accrualLabel = J.add(accrual);
  run = { ...run, status: "posted", accrualEntryId: accrual.id };
  checkpoints.afterAccrual = compJson(J.entries);
  checkpoints.figuresAfterAccrual = {
    "emp-a": figJson(J.entries, run, run.lines.find((l) => l.employeeId === "emp-a")),
    "emp-b": figJson(J.entries, run, run.lines.find((l) => l.employeeId === "emp-b")),
  };

  // 5 — partial payment to emp-a (10,000 cash).
  const payA1 = PR.buildPayrollPaymentEntry({ run, employeeId: "emp-a", name: "Muhammad Aslam", amount: 10000, method: "cash", accountId: "acct-till", ts: "2026-10-01T10:00:00.000Z" });
  const payA1Label = J.add(payA1);
  run = { ...run, payments: [...run.payments, { employeeId: "emp-a", name: "Muhammad Aslam", amount: 10000, method: "cash", accountId: "acct-till", entryId: payA1.id, dayOffset: 0, ts: "2026-10-01T10:00:00.000Z" }] };
  checkpoints.figuresAfterPartialPay = {
    "emp-a": figJson(J.entries, run, run.lines.find((l) => l.employeeId === "emp-a")),
  };
  checkpoints.afterPartialPay = compJson(J.entries);

  // 6 — settle the unassigned production bucket (400) off this run.
  const payBucket = PR.buildPayrollPaymentEntry({ run, employeeId: null, name: "Production labour", amount: 400, method: "cash", accountId: "acct-till", ts: "2026-10-01T10:05:00.000Z" });
  const payBucketLabel = J.add(payBucket);
  run = { ...run, payments: [...run.payments, { employeeId: null, name: "Production labour", amount: 400, method: "cash", accountId: "acct-till", entryId: payBucket.id, dayOffset: 0, ts: "2026-10-01T10:05:00.000Z" }] };

  // 7 — emp-a's remainder (5,500) + emp-b in full via bank/wallet.
  const payA2 = PR.buildPayrollPaymentEntry({ run, employeeId: "emp-a", name: "Muhammad Aslam", amount: 5500, method: "cash", accountId: "acct-till", ts: "2026-10-02T10:00:00.000Z" });
  const payA2Label = J.add(payA2);
  run = { ...run, payments: [...run.payments, { employeeId: "emp-a", name: "Muhammad Aslam", amount: 5500, method: "cash", accountId: "acct-till", entryId: payA2.id, dayOffset: 0, ts: "2026-10-02T10:00:00.000Z" }] };
  const payB = PR.buildPayrollPaymentEntry({ run, employeeId: "emp-b", name: "Bilal Ahmed", amount: 18800, method: "bank", accountId: "acct-wallet", ts: "2026-10-02T10:05:00.000Z" });
  const payBLabel = J.add(payB);
  run = { ...run, payments: [...run.payments, { employeeId: "emp-b", name: "Bilal Ahmed", amount: 18800, method: "bank", accountId: "acct-wallet", entryId: payB.id, dayOffset: 0, ts: "2026-10-02T10:05:00.000Z" }] };

  checkpoints.final = compJson(J.entries);
  checkpoints.figuresFinal = {
    "emp-a": figJson(J.entries, run, run.lines.find((l) => l.employeeId === "emp-a")),
    "emp-b": figJson(J.entries, run, run.lines.find((l) => l.employeeId === "emp-b")),
  };
  checkpoints.positions = {
    "emp-a": PR.employeePosition(J.entries, "emp-a"),
    "emp-b": PR.employeePosition(J.entries, "emp-b"),
  };

  // Self-checks: identity at every checkpoint + final zero state.
  for (const [name, c] of Object.entries(checkpoints)) {
    if (c && typeof c.glBalance === "number") {
      check(near(c.glBalance, c.owedToEmployees - c.advancesOutstanding + c.unassignedAccrued), `S1 ${name}: §2.2 identity`);
    }
  }
  check(checkpoints.final.glBalance === 0, "S1: final salary_payable is 0");
  check(checkpoints.afterIssue.unassignedAccrued === 400, "S1: bucket holds 400 after accrue-issue");

  const labelByEntryId = new Map(J.entries.map((e, i) => [e.id, `e${i}`]));
  const runFinal = {
    ...run,
    accrualEntryId: labelByEntryId.get(run.accrualEntryId),
    payments: run.payments.map((p) => ({ ...p, entryId: labelByEntryId.get(p.entryId) })),
  };
  push("payroll-cycle",
    "Advance → accrued production labour (bucket) → PAY-1 accrual → partial pay → bucket settle → full settle; §2.2 identity at every step",
    { employees, attendance, runDraft: { lines, totals }, runFinal, checkpoints, accrualLabel },
    J.norm());
}

/* ==================================================================
 * S2 — payroll reversal (§2.6): payments stand as advances; the
 * month re-runs and absorbs them by derivation.
 * ================================================================== */
{
  const employees = [
    { id: "emp-a", name: "Muhammad Aslam", phone: "03011111111", designation: "Counter in-charge", linkedUserEmail: null, joinDateISO: "2025-03-01", payBasis: "monthly", baseAmount: 30000, allowances: [], paidLeaveDays: 0, active: true, note: "", ts: "2026-01-05T09:00:00.000Z" },
  ];
  const days = {};
  for (let d = 1; d <= 31; d++) days[String(d)] = "present";
  const attendance = [
    { id: PR.attendanceDocId("emp-a", "2026-08"), employeeId: "emp-a", month: "2026-08", days, ts: "2026-08-31T18:00:00.000Z" },
  ];
  const J = journalBuilder();

  const adv = PR.buildSalaryAdvanceEntry({ employeeId: "emp-a", name: "Muhammad Aslam", amount: 5000, method: "cash", accountId: "acct-till", ts: "2026-08-10T10:00:00.000Z" });
  J.add(adv);

  const lines = PR.buildRunLines(employees, attendance, "2026-08");
  let run1 = {
    id: "run-aug", number: "PAY-1", month: "2026-08", lines, totals: PR.payrollRunTotals(lines),
    payments: [], accrualEntryId: null, status: "draft", note: "", dayOffset: 0, ts: "2026-08-31T19:00:00.000Z",
  };
  const accrual = PR.buildPayrollAccrualEntry(run1, { ts: "2026-08-31T19:05:00.000Z" });
  J.add(accrual);
  run1 = { ...run1, status: "posted", accrualEntryId: accrual.id };

  const pay = PR.buildPayrollPaymentEntry({ run: run1, employeeId: "emp-a", name: "Muhammad Aslam", amount: 20000, method: "cash", accountId: "acct-till", ts: "2026-09-01T10:00:00.000Z" });
  J.add(pay);
  run1 = { ...run1, payments: [{ employeeId: "emp-a", name: "Muhammad Aslam", amount: 20000, method: "cash", accountId: "acct-till", entryId: pay.id, dayOffset: 0, ts: "2026-09-01T10:00:00.000Z" }] };

  const mirror = PR.buildMirrorEntry(accrual, `Payroll reversal ${run1.number} — ${run1.month}`, { ts: "2026-09-03T10:00:00.000Z" });
  J.add(mirror);
  run1 = { ...run1, status: "reversed" };
  const positionAfterReversal = PR.employeePosition(J.entries, "emp-a");
  check(positionAfterReversal === 25000, "S2: payments stand as a 25,000 advance after reversal");

  // Re-run the month: PAY-2 absorbs the standing advance.
  const lines2 = PR.buildRunLines(employees, attendance, "2026-08");
  let run2 = {
    id: "run-aug-2", number: "PAY-2", month: "2026-08", lines: lines2, totals: PR.payrollRunTotals(lines2),
    payments: [], accrualEntryId: null, status: "draft", note: "", dayOffset: 0, ts: "2026-09-03T11:00:00.000Z",
  };
  const accrual2 = PR.buildPayrollAccrualEntry(run2, { ts: "2026-09-03T11:05:00.000Z" });
  J.add(accrual2);
  run2 = { ...run2, status: "posted", accrualEntryId: accrual2.id };
  const figuresRun2 = figJson(J.entries, run2, run2.lines[0]);
  check(figuresRun2.advanceBefore === 25000 && figuresRun2.advanceRecovered === 25000 && figuresRun2.stillOwed === 5000,
    "S2: re-run figures absorb the standing advance");

  const labelByEntryId = new Map(J.entries.map((e, i) => [e.id, `e${i}`]));
  const normRun = (r) => ({
    ...r,
    accrualEntryId: r.accrualEntryId ? labelByEntryId.get(r.accrualEntryId) : null,
    payments: r.payments.map((p) => ({ ...p, entryId: labelByEntryId.get(p.entryId) })),
  });
  push("payroll-reversal",
    "Posted run reversed by mirror — its payment stands as an advance; the re-run (PAY-2) absorbs it by derivation",
    { employees, attendance, run1: normRun(run1), run2: normRun(run2), positionAfterReversal, figuresRun2 },
    J.norm());
}

/* ==================================================================
 * Loan helpers — the store's diary discipline (§3.3/§3.4) replayed:
 * every event carries its entry's label; status recomputed per step.
 * ================================================================== */
function loanScenario(id, title, build) {
  const J = journalBuilder();
  const ctx = {
    J,
    ev(kind, amount, principalPart, chargePart, accountId, entry, ts) {
      return { kind, amount, principalPart, chargePart, accountId, entryId: J.labelOf(entry), dayOffset: 0, ts };
    },
    pos(loan) {
      return { diary: LN.loanPosition(loan), journal: LN.loanJournalPosition(J.entries, loan) };
    },
  };
  const out = build(ctx);
  for (const step of out.positionSteps ?? []) {
    check(near(step.diary.outstanding, step.journal), `${id}: diary ≡ journal at ${step.label ?? "step"}`);
  }
  push(id, title, out.docs, J.norm(), out.extra ?? {});
}

/* ==================================================================
 * S3 — loan lifecycle, payable FLAT (the D3 checkpoint figures):
 * 100,000 @ flat 10% over 7 — charges accrue ordinally, repayments
 * split charges-first, the loan settles exactly.
 * ================================================================== */
loanScenario("loan-lifecycle-payable-flat",
  "Drawdown → two ordinal charge accruals → charges-first repayment → instalment states → final repayment settles",
  ({ J, ev, pos }) => {
    const terms = { direction: "payable", partyName: "Habib Bank — Gulberg", principal: 100000, chargeType: "flat", chargeRate: 10, feeAmount: 0, instalmentCount: 7 };
    check(LN.loanTermsError(terms) === null, "S3: terms compose");
    let loan = {
      id: "loan-1", number: "LN-1", direction: "payable", partyName: terms.partyName, partyId: null,
      principal: 100000, chargeType: "flat", chargeRate: 10, chargeAmount: LN.loanChargeAmount(terms),
      startDateISO: "2026-07-01", instalmentCount: 7, instalmentEvery: "month", firstDueISO: "2026-08-01",
      events: [], status: "active", note: "", dayOffset: 0, ts: "2026-07-01T10:00:00.000Z",
    };
    const schedule = LN.loanSchedule(loan);

    const draw = LN.buildLoanDrawdownEntry(loan, { method: "bank", accountId: "acct-wallet", ts: "2026-07-01T10:05:00.000Z" });
    J.add(draw);
    loan = { ...loan, events: [ev("drawdown", 100000, 100000, 0, "acct-wallet", draw, "2026-07-01T10:05:00.000Z")] };
    const positionSteps = [{ label: "drawdown", ...pos(loan) }];

    // Ordinal charge accruals #1 and #2 (desk-confirmed events).
    for (const expectN of [1, 2]) {
      const next = LN.nextChargeAccrual(loan);
      check(next && next.n === expectN, `S3: next accrual is instalment ${expectN}`);
      const entry = LN.buildLoanChargeEntry(loan, { instalment: next, ts: `2026-0${7 + expectN}-01T09:00:00.000Z` });
      J.add(entry);
      loan = { ...loan, events: [...loan.events, ev("charge", next.chargePart, 0, next.chargePart, null, entry, `2026-0${7 + expectN}-01T09:00:00.000Z`)] };
      positionSteps.push({ label: `charge${expectN}`, ...pos(loan) });
    }

    // Repay 20,000 — default split charges-first.
    const split = LN.defaultRepaymentSplit(loan, 20000);
    check(LN.repaymentSplitError(loan, 20000, split) === null, "S3: default split validates");
    const repay1 = LN.buildLoanRepaymentEntry(loan, { amount: 20000, method: "bank", accountId: "acct-wallet", ts: "2026-09-10T10:00:00.000Z" });
    J.add(repay1);
    loan = { ...loan, events: [...loan.events, ev("repayment", 20000, split.principalPart, split.chargePart, "acct-wallet", repay1, "2026-09-10T10:00:00.000Z")] };
    loan = { ...loan, status: LN.loanStatusFor(loan) };
    positionSteps.push({ label: "repay1", ...pos(loan) });
    const statesAfterFirstRepayment = LN.loanInstalmentStates(loan, "2026-09-15");
    const nextDue = LN.loanNextDue(loan, "2026-09-15");

    // Repay the remainder — settles.
    const rest = LN.loanPosition(loan).outstanding;
    const split2 = LN.defaultRepaymentSplit(loan, rest);
    const repay2 = LN.buildLoanRepaymentEntry(loan, { amount: rest, method: "bank", accountId: "acct-wallet", ts: "2026-09-20T10:00:00.000Z" });
    J.add(repay2);
    loan = { ...loan, events: [...loan.events, ev("repayment", rest, split2.principalPart, split2.chargePart, "acct-wallet", repay2, "2026-09-20T10:00:00.000Z")] };
    loan = { ...loan, status: LN.loanStatusFor(loan) };
    positionSteps.push({ label: "settled", ...pos(loan) });
    check(loan.status === "settled" && LN.loanPosition(loan).outstanding === 0, "S3: loan settles");

    return {
      docs: { loan, schedule, positionSteps, splits: [split, split2], statesAfterFirstRepayment, nextDue },
      positionSteps: positionSteps.map((s) => ({ label: s.label, diary: s.diary, journal: s.journal })),
    };
  });

/* ==================================================================
 * S4 — fee-netted drawdown (§3.4): a fee_only loan's single entry
 * nets the fee from proceeds; the fee event shares the entry.
 * ================================================================== */
loanScenario("loan-fee-netted-drawdown",
  "fee_only drawdown: Dr cash (P−F) + Dr expense_finance F / Cr loans_payable P; fee never accrues to outstanding",
  ({ J, ev, pos }) => {
    const terms = { direction: "payable", partyName: "Micro Finance — Kasur", principal: 50000, chargeType: "fee_only", chargeRate: 0, feeAmount: 1500, instalmentCount: 5 };
    check(LN.loanTermsError(terms) === null, "S4: terms compose");
    let loan = {
      id: "loan-fee", number: "LN-1", direction: "payable", partyName: terms.partyName, partyId: null,
      principal: 50000, chargeType: "fee_only", chargeRate: 0, chargeAmount: LN.loanChargeAmount(terms),
      startDateISO: "2026-08-01", instalmentCount: 5, instalmentEvery: "month", firstDueISO: "2026-09-01",
      events: [], status: "active", note: "", dayOffset: 0, ts: "2026-08-01T10:00:00.000Z",
    };
    const draw = LN.buildLoanDrawdownEntry(loan, { method: "cash", accountId: "acct-till", feeAmount: 1500, ts: "2026-08-01T10:05:00.000Z" });
    J.add(draw);
    loan = {
      ...loan,
      events: [
        ev("drawdown", 50000, 50000, 0, "acct-till", draw, "2026-08-01T10:05:00.000Z"),
        ev("fee", 1500, 0, 1500, "acct-till", draw, "2026-08-01T10:05:00.000Z"),
      ],
    };
    const positionSteps = [{ label: "drawdown", ...pos(loan) }];
    check(LN.loanPosition(loan).outstanding === 50000, "S4: fee does not inflate outstanding");
    check(LN.nextChargeAccrual(loan) === null, "S4: fee_only never accrues instalment charges");

    const repay = LN.buildLoanRepaymentEntry(loan, { amount: 50000, method: "cash", accountId: "acct-till", ts: "2026-12-01T10:00:00.000Z" });
    J.add(repay);
    const split = LN.defaultRepaymentSplit(loan, 50000);
    loan = { ...loan, events: [...loan.events, ev("repayment", 50000, split.principalPart, split.chargePart, "acct-till", repay, "2026-12-01T10:00:00.000Z")] };
    loan = { ...loan, status: LN.loanStatusFor(loan) };
    positionSteps.push({ label: "settled", ...pos(loan) });

    return {
      docs: { loan, schedule: LN.loanSchedule(loan), positionSteps },
      positionSteps: positionSteps.map((s) => ({ label: s.label, diary: s.diary, journal: s.journal })),
    };
  });

/* ==================================================================
 * S5 — reducing charges (§3.3): per-period on schedule outstanding.
 * ================================================================== */
loanScenario("loan-reducing",
  "Reducing charge schedule (1200/900/600/300 on 60,000 @ 2%); accrual #1, a charges-first repayment, accrual #2",
  ({ J, ev, pos }) => {
    const terms = { direction: "payable", partyName: "Supplier Finance — Lahore", principal: 60000, chargeType: "reducing", chargeRate: 2, feeAmount: 0, instalmentCount: 4 };
    check(LN.loanTermsError(terms) === null, "S5: terms compose");
    let loan = {
      id: "loan-red", number: "LN-1", direction: "payable", partyName: terms.partyName, partyId: null,
      principal: 60000, chargeType: "reducing", chargeRate: 2, chargeAmount: LN.loanChargeAmount(terms),
      startDateISO: "2026-07-15", instalmentCount: 4, instalmentEvery: "month", firstDueISO: "2026-08-15",
      events: [], status: "active", note: "", dayOffset: 0, ts: "2026-07-15T10:00:00.000Z",
    };
    const schedule = LN.loanSchedule(loan);
    check(JSON.stringify(schedule.map((s) => s.chargePart)) === JSON.stringify([1200, 900, 600, 300]), "S5: reducing schedule");

    const draw = LN.buildLoanDrawdownEntry(loan, { method: "cash", accountId: "acct-till", ts: "2026-07-15T10:05:00.000Z" });
    J.add(draw);
    loan = { ...loan, events: [ev("drawdown", 60000, 60000, 0, "acct-till", draw, "2026-07-15T10:05:00.000Z")] };
    const positionSteps = [{ label: "drawdown", ...pos(loan) }];

    const n1 = LN.nextChargeAccrual(loan);
    const c1 = LN.buildLoanChargeEntry(loan, { instalment: n1, ts: "2026-08-15T09:00:00.000Z" });
    J.add(c1);
    loan = { ...loan, events: [...loan.events, ev("charge", n1.chargePart, 0, n1.chargePart, null, c1, "2026-08-15T09:00:00.000Z")] };

    const split = LN.defaultRepaymentSplit(loan, 16200);
    const repay = LN.buildLoanRepaymentEntry(loan, { amount: 16200, method: "cash", accountId: "acct-till", ts: "2026-08-16T10:00:00.000Z" });
    J.add(repay);
    loan = { ...loan, events: [...loan.events, ev("repayment", 16200, split.principalPart, split.chargePart, "acct-till", repay, "2026-08-16T10:00:00.000Z")] };
    positionSteps.push({ label: "repay1", ...pos(loan) });

    const n2 = LN.nextChargeAccrual(loan);
    check(n2 && n2.n === 2 && n2.chargePart === 900, "S5: second accrual is instalment 2 @ 900");
    const c2 = LN.buildLoanChargeEntry(loan, { instalment: n2, ts: "2026-09-15T09:00:00.000Z" });
    J.add(c2);
    loan = { ...loan, events: [...loan.events, ev("charge", n2.chargePart, 0, n2.chargePart, null, c2, "2026-09-15T09:00:00.000Z")] };
    loan = { ...loan, status: LN.loanStatusFor(loan) };
    positionSteps.push({ label: "charge2", ...pos(loan) });
    check(LN.loanPosition(loan).outstanding === 45900, "S5: outstanding 45,900");

    return {
      docs: { loan, schedule, positionSteps, split },
      positionSteps: positionSteps.map((s) => ({ label: s.label, diary: s.diary, journal: s.journal })),
    };
  });

/* ==================================================================
 * S6 — receivable loan (§3.2 rule 3): charge-free mirror; the
 * composition refusals ride in the ops section.
 * ================================================================== */
loanScenario("loan-receivable",
  "Money lent out: Dr loans_receivable / Cr cash; a repayment mirrors back; no charges ever",
  ({ J, ev, pos }) => {
    const terms = { direction: "receivable", partyName: "Ahmed Traders", principal: 25000, chargeType: "none", chargeRate: 0, feeAmount: 0, instalmentCount: 5 };
    check(LN.loanTermsError(terms) === null, "S6: terms compose");
    let loan = {
      id: "loan-rec", number: "LN-1", direction: "receivable", partyName: terms.partyName, partyId: "cust-1",
      principal: 25000, chargeType: "none", chargeRate: 0, chargeAmount: 0,
      startDateISO: "2026-09-28", instalmentCount: 5, instalmentEvery: "week", firstDueISO: "2026-10-05",
      events: [], status: "active", note: "", dayOffset: 0, ts: "2026-09-28T10:00:00.000Z",
    };
    const draw = LN.buildLoanDrawdownEntry(loan, { method: "cash", accountId: "acct-till", ts: "2026-09-28T10:05:00.000Z" });
    J.add(draw);
    loan = { ...loan, events: [ev("drawdown", 25000, 25000, 0, "acct-till", draw, "2026-09-28T10:05:00.000Z")] };
    const positionSteps = [{ label: "drawdown", ...pos(loan) }];

    const split = LN.defaultRepaymentSplit(loan, 10000);
    const repay = LN.buildLoanRepaymentEntry(loan, { amount: 10000, method: "cash", accountId: "acct-till", ts: "2026-10-06T10:00:00.000Z" });
    J.add(repay);
    loan = { ...loan, events: [...loan.events, ev("repayment", 10000, split.principalPart, split.chargePart, "acct-till", repay, "2026-10-06T10:00:00.000Z")] };
    loan = { ...loan, status: LN.loanStatusFor(loan) };
    positionSteps.push({ label: "repay1", ...pos(loan) });
    check(LN.loanPosition(loan).outstanding === 15000, "S6: outstanding 15,000");
    check(LN.repaymentSplitError(loan, 15001, { principalPart: 15001, chargePart: 0 }) === "overpay", "S6: overpay refused");

    return {
      docs: { loan, schedule: LN.loanSchedule(loan), positionSteps, split },
      positionSteps: positionSteps.map((s) => ({ label: s.label, diary: s.diary, journal: s.journal })),
    };
  });

/* ==================================================================
 * S7 — fiscal-year close cycle (§4): checklist with gates green
 * and warnings live → ONE closing entry → P&L §4.6 identity →
 * reopen mirror → re-close → second FY close → stack blocker.
 * ================================================================== */
{
  const J = journalBuilder();
  const range = PE.fiscalYearRange(SETTINGS, "2026-03-01T00:00:00.000Z"); // FY 2025-26
  const range2 = PE.fiscalYearRange(SETTINGS, "2026-09-01T00:00:00.000Z"); // FY 2026-27
  check(range.startDate === "2025-07-01" && range.endDate === "2026-06-30", "S7: FY25-26 range");
  check(FI.fyLabel(range) === "FY 2025-26", "S7: FY label");

  const E = (memo, refType, refId, lines, ts) => L.makeEntry(memo, refType, refId, lines, { ts });
  J.add(E("Owner capital", "cashbook", null, [
    { account: "cash", debit: 200000, credit: 0, ref: "acct-till" },
    { account: "capital", debit: 0, credit: 200000, ref: null },
  ], "2025-08-10T09:00:00.000Z"));
  J.add(E("Purchase — stock", "purchase", "pur-1", [
    { account: "purchases", debit: 80000, credit: 0, ref: null },
    { account: "payables", debit: 0, credit: 80000, ref: "sup-1" },
  ], "2025-09-05T09:00:00.000Z"));
  J.add(E("Goods received", "purchase", "pur-1", [
    { account: "inventory", debit: 80000, credit: 0, ref: null },
    { account: "purchases", debit: 0, credit: 80000, ref: null },
  ], "2025-09-05T10:00:00.000Z"));
  J.add(E("Bill #11", "bill", "bill-fy1", [
    { account: "cash", debit: 120000, credit: 0, ref: "acct-till" },
    { account: "sales_revenue", debit: 0, credit: 120000, ref: null },
  ], "2025-11-20T09:00:00.000Z"));
  J.add(E("Bill #11 — cost", "bill", "bill-fy1", [
    { account: "cogs", debit: 45000, credit: 0, ref: null },
    { account: "inventory", debit: 0, credit: 45000, ref: null },
  ], "2025-11-20T09:01:00.000Z"));
  J.add(E("Shop rent — January", "expense", "exp-1", [
    { account: "expense_rent", debit: 12000, credit: 0, ref: null },
    { account: "cash", debit: 0, credit: 12000, ref: "acct-till" },
  ], "2026-01-15T09:00:00.000Z"));
  // Payroll tie-in: a real accrual entry from the payroll builder.
  const fyRun = {
    id: "run-fy", number: "PAY-9", month: "2026-03",
    lines: [{ employeeId: "emp-x", name: "Seasonal Help", payBasis: "monthly", daysInMonth: 31, present: 31, absent: 0, half: 0, leave: 0, unpaidAbsent: 0, earnedBase: 30000, allowances: [], deductions: [], gross: 30000, netAccrued: 30000 }],
    totals: { gross: 30000, deductions: 0, netAccrued: 30000 }, payments: [],
    accrualEntryId: null, status: "posted", note: "", dayOffset: 0, ts: "2026-03-31T19:00:00.000Z",
  };
  const fyAccrual = PR.buildPayrollAccrualEntry(fyRun, { ts: "2026-03-31T19:05:00.000Z" });
  J.add(fyAccrual);
  // An open production pool (WIP) at year end.
  J.add(E("Production issue PR-FY", "production_issue", "pr-fy", [
    { account: "wip", debit: 5000, credit: 0, ref: null },
    { account: "inventory", debit: 0, credit: 5000, ref: null },
  ], "2026-04-10T09:00:00.000Z"));
  // Post-FY trading (must NOT be zeroed by the FY25-26 close).
  J.add(E("Bill #12", "bill", "bill-fy2", [
    { account: "cash", debit: 5000, credit: 0, ref: "acct-till" },
    { account: "sales_revenue", debit: 0, credit: 5000, ref: null },
  ], "2026-07-15T09:00:00.000Z"));

  const draftRun = { id: "run-draft-may", number: null, month: "2026-05", lines: [], totals: { gross: 0, deductions: 0, netAccrued: 0 }, payments: [], accrualEntryId: null, status: "draft", note: "", dayOffset: 0, ts: "2026-05-31T19:00:00.000Z" };
  const openOrder = {
    id: "pr-fy", number: "PR-FY", bomId: "bom-1", bomVersion: 1, bomSnapshot: PROD.snapshotOfBom(bomV1),
    outputProductId: "p-blend", outputName: "House Tea Blend 500g", warehouseId: "wh-main",
    plannedQty: 10, events: [{ kind: "issue", qty: 10, lines: [], labourCost: 0, overheadCost: 0, paidFromAccountId: null, value: 5000, entryId: "e7", dayOffset: 0, ts: "2026-04-10T09:00:00.000Z" }],
    note: "", status: "in_progress", dayOffset: 0, ts: "2026-04-10T09:00:00.000Z",
  };
  const cheques = [
    { id: "chq-1", direction: "in", chequeNo: "CHQ-100", bankName: "Meezan", amount: 7000, issueDateISO: "2026-05-01", dueDateISO: "2026-05-10", status: "received", partyName: "Ahmed Traders", partyId: "cust-1", entryIds: [], note: "", dayOffset: 0, ts: "2026-05-01T09:00:00.000Z" },
  ];

  const checklistArgs = () => ({
    journal: J.entries, payrollRuns: [draftRun], productionOrders: [openOrder],
    cheques, products, range, lockedThrough: "",
  });
  const checklist = FI.fiscalYearCloseChecklist(checklistArgs());
  check(checklist.hardGatesPass === true, "S7: hard gates pass");
  check(checklist.draftPayrollRuns === 1 && checklist.openProductionOrders === 1, "S7: warnings live");
  check(checklist.salary.glBalance === 30000 && checklist.chequesInHand === 7000, "S7: info figures");

  const plBefore = L.profitAndLossInRange(J.entries, range.fromTs, range.toTs);
  const closeDoc = {
    id: "per-fy1", kind: "fiscal_year", from: range.fromTs, to: PE.endOfDayPktInstant(range.endDate),
    action: "close", byUid: "owner-1", byEmail: "owner@example.com", ts: "2026-10-23T08:00:00.000Z",
    note: "", prevLockedThrough: "", entryId: null,
  };
  const closing = FI.buildFiscalClosingEntry(J.entries, range, "per-fy1");
  check(closing !== null, "S7: closing entry composes");
  const closingLabel = J.add(closing);
  closeDoc.entryId = closing.id;
  const periods = [{ ...closeDoc, entryId: closingLabel }];
  const summary = FI.closingEntrySummary(closing);
  check(near(summary.net, plBefore.net), "S7: §4.6 summary net == pre-close P&L profit");
  const plAfter = L.profitAndLossInRange(J.entries, range.fromTs, range.toTs);
  check(near(plAfter.net, plBefore.net) && near(plAfter.revenue, plBefore.revenue), "S7: §4.6 P&L unchanged by close");
  const stateClosed = FI.fiscalCloseState(J.entries, periods, range);
  check(stateClosed.closed === true, "S7: FY reads closed");

  // Reopen by mirror — balances restore to the paisa.
  const mirror = FI.buildFiscalReopenEntry(closing, "2026-10-23T09:00:00.000Z");
  const mirrorLabel = J.add(mirror);
  const reopenDoc = {
    id: "per-fy1-re", kind: "fiscal_year", from: closeDoc.from, to: closeDoc.to,
    action: "reopen", byUid: "owner-1", byEmail: "owner@example.com", ts: "2026-10-23T09:00:00.000Z",
    note: "Auditor query", prevLockedThrough: PE.endOfDayPktInstant(range.endDate), entryId: mirrorLabel, reopensPeriodId: "per-fy1",
  };
  periods.push(reopenDoc);
  const stateReopened = FI.fiscalCloseState(J.entries, periods, range);
  check(stateReopened.closed === false, "S7: FY reads reopened");
  check(L.accountNormalBalance(J.entries, "retained_earnings") === 0, "S7: retained earnings restored to 0");

  // Re-close FY25-26, then close FY26-27 — the stack then blocks
  // reopening the earlier year.
  const closing2 = FI.buildFiscalClosingEntry(J.entries, range, "per-fy1b");
  const closing2Label = J.add(closing2);
  const closeDoc2 = { ...closeDoc, id: "per-fy1b", ts: "2026-10-23T09:30:00.000Z", entryId: closing2Label };
  periods.push(closeDoc2);
  const closing3 = FI.buildFiscalClosingEntry(J.entries, range2, "per-fy2");
  const closing3Label = J.add(closing3);
  const closeDoc3 = {
    id: "per-fy2", kind: "fiscal_year", from: range2.fromTs, to: PE.endOfDayPktInstant(range2.endDate),
    action: "close", byUid: "owner-1", byEmail: "owner@example.com", ts: "2026-10-23T09:45:00.000Z",
    note: "", prevLockedThrough: PE.endOfDayPktInstant(range.endDate), entryId: closing3Label,
  };
  periods.push(closeDoc3);
  const blocker = FI.fiscalReopenBlocker(J.entries, periods, closeDoc2);
  check(blocker && blocker.id === "per-fy2", "S7: stack discipline blocks the earlier reopen");
  const openings = FI.balanceSheetBalances(J.entries, range2.fromTs);

  const labelByEntryId = new Map(J.entries.map((e, i) => [e.id, `e${i}`]));
  const normDoc = (d) => ({ ...d, entryId: d.entryId && labelByEntryId.has(d.entryId) ? labelByEntryId.get(d.entryId) : d.entryId });
  push("fiscal-close-cycle",
    "Checklist (gates green, draft-payroll + WIP warnings) → close FY 2025-26 → §4.6 identity → reopen mirror → re-close → close FY 2026-27 → stack blocker",
    {
      settings: SETTINGS,
      range: { startDate: range.startDate, endDate: range.endDate, fromTs: range.fromTs, toTs: range.toTs },
      range2: { startDate: range2.startDate, endDate: range2.endDate, fromTs: range2.fromTs, toTs: range2.toTs },
      checklist: {
        items: checklist.items, hardGatesPass: checklist.hardGatesPass, warningIds: checklist.warningIds,
        purchasesClearing: checklist.purchasesClearing, draftPayrollRuns: checklist.draftPayrollRuns,
        openProductionOrders: checklist.openProductionOrders, openProductionPoolTotal: checklist.openProductionPoolTotal,
        salary: checklist.salary, chequesInHand: checklist.chequesInHand, chequesIssued: checklist.chequesIssued,
        stockGl: checklist.stockGl, stockShelf: checklist.stockShelf, stockDivergence: checklist.stockDivergence,
        lockCoversFyEnd: checklist.lockCoversFyEnd,
        tbClosingDifference: checklist.trialBalance.closingDifference,
      },
      inputs: { draftRun, openOrder, cheques, products },
      plBefore: { revenue: plBefore.revenue, cogs: plBefore.cogs, expensesTotal: plBefore.expensesTotal, net: plBefore.net },
      periods: periods.map(normDoc),
      summary: { rows: summary.rows, net: summary.net },
      stateAfterClose: { closed: stateClosed.closed },
      stateAfterReopen: { closed: stateReopened.closed },
      blockerId: blocker ? blocker.id : null,
      openings,
      closingLabels: { close1: closingLabel, mirror: mirrorLabel, close2: closing2Label, close3: closing3Label },
    },
    J.norm());
}

/* ==================================================================
 * S8 — Tally export (§5): a mixed journal with party ledgers, a
 * name collision, an unresolved ref, directional loan vouchers,
 * an fy_close voucher number, an owner name override — the model,
 * the XML and the CSV, reconciled to the trial balance.
 * ================================================================== */
{
  const J = journalBuilder();
  const E = (memo, refType, refId, lines, ts, dateISO) => {
    const e = L.makeEntry(memo, refType, refId, lines, { ts });
    if (dateISO) e.dateISO = dateISO;
    return e;
  };
  // Before the range: an opening receivable for cust-1.
  J.add(E("Opening sale — June", "bill", "bill-0", [
    { account: "receivables", debit: 4000, credit: 0, ref: "cust-1" },
    { account: "sales_revenue", debit: 0, credit: 4000, ref: null },
  ], "2026-06-15T09:00:00.000Z"));
  J.add(E("Bill #42", "bill", "bill-1", [
    { account: "receivables", debit: 12000, credit: 0, ref: "cust-1" },
    { account: "sales_revenue", debit: 0, credit: 12000, ref: null },
  ], "2026-07-05T09:00:00.000Z"));
  J.add(E("Collection — Ahmed Raza", "repayment", "rc-1", [
    { account: "cash", debit: 12000, credit: 0, ref: "acct-till" },
    { account: "receivables", debit: 0, credit: 12000, ref: "cust-1" },
  ], "2026-07-06T09:00:00.000Z"));
  J.add(E("Purchase — Karachi Traders", "purchase", "po-1", [
    { account: "purchases", debit: 9000, credit: 0, ref: null },
    { account: "payables", debit: 0, credit: 9000, ref: "sup-1" },
  ], "2026-07-07T09:00:00.000Z"));
  J.add(E("Payroll PAY-1 — 2026-07", "payroll_accrual", "run-1", [
    { account: "expense_salary", debit: 5000, credit: 0, ref: "emp-a" },
    { account: "salary_payable", debit: 0, credit: 5000, ref: "emp-a" },
  ], "2026-07-31T19:00:00.000Z"));
  J.add(E("Salary — namesake", "payroll_accrual", "run-1", [
    { account: "expense_salary", debit: 3000, credit: 0, ref: "emp-b" },
    { account: "salary_payable", debit: 0, credit: 3000, ref: "emp-b" },
  ], "2026-07-31T19:01:00.000Z"));
  J.add(E("Loan drawdown LN-1 — Bank", "loan_drawdown", "loan-1", [
    { account: "cash", debit: 20000, credit: 0, ref: "acct-till" },
    { account: "loans_payable", debit: 0, credit: 20000, ref: "loan-1" },
  ], "2026-08-01T09:00:00.000Z"));
  J.add(E("Loan drawdown LN-2 — Ahmed Raza", "loan_drawdown", "loan-2", [
    { account: "loans_receivable", debit: 8000, credit: 0, ref: "loan-2" },
    { account: "cash", debit: 0, credit: 8000, ref: "acct-till" },
  ], "2026-08-02T09:00:00.000Z"));
  J.add(E("Bill #43", "bill", "bill-2", [
    { account: "receivables", debit: 3000, credit: 0, ref: "cust-2" },
    { account: "sales_revenue", debit: 0, credit: 3000, ref: null },
  ], "2026-08-05T09:00:00.000Z"));
  J.add(E("Bill #44 — departed customer", "bill", "bill-3", [
    { account: "receivables", debit: 1500, credit: 0, ref: "cust-gone" },
    { account: "sales_revenue", debit: 0, credit: 1500, ref: null },
  ], "2026-08-06T09:00:00.000Z"));
  J.add(E("Fiscal year close — FY 2025-26", "fy_close", "per-1", [
    { account: "sales_revenue", debit: 3000, credit: 0, ref: null },
    { account: "retained_earnings", debit: 0, credit: 3000, ref: null },
  ], "2026-08-10T09:00:00.000Z", "2026-06-30"));

  const parties = {
    customers: [
      { id: "cust-1", name: "Ahmed Raza", phone: "03010000001" },
      { id: "cust-2", name: "Ahmed Raza", phone: "03010000002" },
    ],
    suppliers: [{ id: "sup-1", name: "Karachi Traders", phone: "03020000001" }],
    employees: [
      { id: "emp-a", name: "Muhammad Aslam" },
      { id: "emp-b", name: "Muhammad Aslam" },
    ],
    accounts,
    docNumbers: new Map([
      ["bill-1", "42"], ["rc-1", "RV-7"], ["po-1", "PO-3"],
      ["run-1", "PAY-1"], ["loan-1", "LN-1"], ["loan-2", "LN-2"],
      ["bill-2", "43"], ["bill-3", "44"],
    ]),
  };
  const settings = {
    shopName: "Madina General Store", fiscalYearStartMonth: 7, fiscalYearStartDay: 1,
    tallyLedgerNames: { cash: "Main Cash" },
  };
  const range = {
    fromDate: "2026-07-01", toDate: "2026-09-30",
    fromTs: PE.startOfDayPktInstant("2026-07-01"), toTs: PE.startOfDayPktInstant("2026-10-01"),
  };
  const model = TA.buildTallyExport(J.entries, parties, settings, range);
  // Normalise voucher entry ids to the scenario labels (e0, e1, …)
  // the fixture journal uses — the id is journal identity, not
  // export content.
  const labelById = new Map(J.entries.map((e, i) => [e.id, `e${i}`]));
  for (const v of model.vouchers) v.entryId = labelById.get(v.entryId) ?? v.entryId;
  const xml = TA.tallyXML(J.entries, parties, settings, range);
  const csv = TA.journalCSV(J.entries, parties, settings, range);
  const tb = RP.trialBalance(J.entries, range);
  check(near(model.totalDebits, tb.totalDebits) && near(model.totalCredits, tb.totalCredits),
    "S8: Tally totals reconcile to the trial balance");
  for (const v of model.vouchers) check(near(v.debitTotal, v.creditTotal), `S8: voucher ${v.entryId} balances`);

  push("tally-export",
    "Mixed journal → Tally model + XML + CSV: party ledgers, collision suffixes, openings, directional loan vouchers, FY-label voucher number",
    {
      parties: { ...parties, docNumbers: Object.fromEntries(parties.docNumbers) },
      settings, range,
      model: JSON.parse(JSON.stringify(model)),
      xml, csv,
      tbTotals: { totalDebits: tb.totalDebits, totalCredits: tb.totalCredits },
    },
    J.norm());
}

/* ==================================================================
 * Ops — derivation edges asserted identically in Dart:
 * loan terms refusals, IBAN validation, Raast payloads (bare +
 * TLV) with round-trip parses, branding plan math.
 * ================================================================== */
const ops = (() => {
  const termsCases = [
    { direction: "receivable", partyName: "X", principal: 1000, chargeType: "flat", chargeRate: 5, feeAmount: 0, instalmentCount: 3 },
    { direction: "payable", partyName: "X", principal: 1000, chargeType: "none", chargeRate: 0, feeAmount: 1000, instalmentCount: 3 },
    { direction: "payable", partyName: "X", principal: 1000, chargeType: "reducing", chargeRate: 0, feeAmount: 0, instalmentCount: 3 },
    { direction: "payable", partyName: "X", principal: 0, chargeType: "none", chargeRate: 0, feeAmount: 0, instalmentCount: 3 },
    { direction: "payable", partyName: " ", principal: 1000, chargeType: "none", chargeRate: 0, feeAmount: 0, instalmentCount: 3 },
    { direction: "payable", partyName: "X", principal: 1000, chargeType: "none", chargeRate: 0, feeAmount: 0, instalmentCount: 0 },
    { direction: "payable", partyName: "X", principal: 1000, chargeType: "fee_only", chargeRate: 0, feeAmount: 0, instalmentCount: 3 },
    { direction: "payable", partyName: "X", principal: 1000, chargeType: "flat", chargeRate: 5, feeAmount: 0, instalmentCount: 3 },
  ];
  const ibanCases = [
    RA.RAAST_SAMPLE_IBAN,
    "PK36 SCBL 0000 0011 2345 6702",
    "03001234567",
    "PK36SCBL0000001123456703", // checksum broken
    "PK36SCBL000000112345670", // 23 chars
    "GB29NWBK60161331926819", // not PK
    "PK36SCB10000001123456702", // digit inside the bank code
    "",
  ];
  const composed = RA.pkIbanWithCheckDigits("MEZN", "0101199901012345");
  const payloads = {
    staticBare: RA.buildRaastP2pPayload({ iban: RA.RAAST_SAMPLE_IBAN }),
    dynamicBare: RA.buildRaastP2pPayload({ iban: RA.RAAST_SAMPLE_IBAN, fiName: "MEEZAN BANK", amount: 1500.5, particulars: RA.billParticulars(42) }),
    staticTlv: RA.buildRaastP2pPayload({ iban: RA.RAAST_SAMPLE_IBAN }, "tlv"),
    dynamicTlv: RA.buildRaastP2pPayload({ iban: RA.RAAST_SAMPLE_IBAN, amount: 2000, particulars: "Bill #7" }, "tlv"),
  };
  const parses = {};
  for (const [k, p] of Object.entries(payloads)) {
    parses[k] = RA.parseRaastP2pPayload(p, k.endsWith("Tlv") ? "tlv" : "bare");
  }
  const branding = {
    plans: {
      logoAlpha: BR.compressionPlan("logo", { width: 1200, height: 900, hasAlpha: true }),
      letterhead: BR.compressionPlan("letterheadHeader", { width: 2000, height: 500, hasAlpha: true }),
      stampSmall: BR.compressionPlan("stamp", { width: 300, height: 300, hasAlpha: false }),
      signatureDegenerate: BR.compressionPlan("signature", { width: 0, height: 100, hasAlpha: false }),
    },
    bytes: {
      valid: BR.dataUrlBytes("data:image/png;base64,QUJD"), // "ABC" → 3
      padded: BR.dataUrlBytes("data:image/png;base64,QUI="), // "AB" → 2
      ragged: BR.dataUrlBytes("data:image/png;base64,QUJ"),
      notBase64: BR.dataUrlBytes("data:image/png,QUJD"),
    },
    totalCap: BR.BRANDING_TOTAL_CAP_BYTES,
  };
  return {
    termsErrors: termsCases.map((t) => LN.loanTermsError(t)),
    termsCases,
    ibanResults: ibanCases.map((s) => RA.validatePkIban(s)),
    composedIban: composed,
    composedValid: RA.validatePkIban(composed),
    groupIban: RA.groupIban(RA.RAAST_SAMPLE_IBAN),
    payloads, parses,
    framing: RA.RAAST_FRAMING,
    branding,
    payrollEdges: {
      daysInMonth: { febLeap: PR.daysInMonthOf("2028-02"), febPlain: PR.daysInMonthOf("2026-02"), bad: PR.daysInMonthOf("2026-13") },
      shift: { fwd: PR.shiftMonth("2026-11", 3), back: PR.shiftMonth("2026-01", -2) },
      markCycle: [null, "present", "absent", "half", "leave", "off"].map((m) => PR.nextAttendanceMark(m)),
    },
    fiscalEdges: {
      plCodes: FI.plAccountCodes(),
      janLabel: FI.fyLabel({ startDate: "2027-01-01", endDate: "2027-12-31", fromTs: "", toTs: "" }),
    },
    registerTotals: LN.loansRegisterTotals([
      { direction: "payable", principal: 1000, events: [{ kind: "drawdown", amount: 1000, principalPart: 1000, chargePart: 0 }], status: "active" },
      { direction: "receivable", principal: 500, events: [], status: "active" },
      { direction: "payable", principal: 9999, events: [], status: "cancelled" },
    ]),
  };
})();

/* ---------------- whole-fixture self-checks ---------------- */

const allEntries = scenarios.flatMap((s) => s.entries);
{
  let dr = 0, cr = 0;
  for (const e of allEntries) for (const l of e.lines) { dr += l.debit; cr += l.credit; }
  check(Math.abs(dr - cr) <= 0.01, `whole F4 journal balances (Dr ${dr} vs Cr ${cr})`);
  for (const s of scenarios) {
    for (const e of s.entries) {
      const d = e.lines.reduce((a, l) => a + l.debit, 0);
      const c = e.lines.reduce((a, l) => a + l.credit, 0);
      check(Math.abs(d - c) <= 0.001, `${s.id}/${e.id} balanced`);
    }
  }
}

if (failures > 0) {
  console.error(`fixtures-export-f4: ${failures} self-check(s) FAILED — not writing.`);
  process.exit(1);
}

const out = {
  version: 1,
  source: "harness/fixtures-export-f4.js — composed through compiled web/lib Phase D functions",
  scenarios,
  ops,
};
const dest = path.join(__dirname, "fixtures", "f4-core.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 1) + "\n");
console.log(`fixtures-export-f4: wrote ${dest} (${scenarios.length} scenarios, ${allEntries.length} entries)`);
