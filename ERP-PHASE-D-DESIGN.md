# Dukaan AI — ERP Phase D "HR & Advanced Finance" — DESIGN

**Status:** Design only — no app code changed by this document.
**Scope:** Phase D of `dukaan-erp-roadmap.md` (staff directory & attendance, payroll with journal postings and salary slips, loans & financing register, fiscal-year close, Tally export + export expansion), designed against the live Phase A foundations, the Phase B document chain, and Phase C production/jobs. Parity target: the owner's MC Billing ERP (staff/payroll, loans, year close, Tally export).
**Sources read:** `dukaan-erp-roadmap.md` (Phase D), `ERP-PHASE-A-DESIGN.md` (§1 subledger-ref pattern, §3.2 matrix, §4 COA v2, §5 periods, §6 migration), `ERP-PHASE-B-DESIGN.md` (§2.1 derivation doctrine, §6 RBAC verification style), `ERP-PHASE-C-DESIGN.md` (§4.2 production events, §4.4 salary_payable accrual, §5 jobs), `PRODUCTION.md` (Complete + Phases A–C + live-audit fixes), `web/lib/types.ts`, `web/lib/coa.ts`, `web/lib/ledger.ts`, `web/lib/reports.ts` (trial balance, Fix 4), `web/lib/periods.ts`, `web/lib/permissions.ts` (Phase D rows pre-declared), `web/lib/production.ts` (issue template — the existing `salary_payable` writer), `web/components/StoreProvider.tsx` (posting choke point, collections), `firebase/firestore.rules` (v6).

## Non-negotiable invariants carried over (Complete edition + Phases A–C)

Every design choice below is subordinate to these — Phase D must not regress any of them:

1. **One atomic balanced journal entry per money event**, built by `makeEntry` (throws on imbalance, F-1) and written in the same `writeBatch` as its operational records, through the single choke point (`guardPostings` → `postEntry`, A5). Phase D adds **no** new posting route. Every Phase D template below names its entry, its `refType`, and its batch companions.
2. **The journal is append-only.** Corrections are reversing entries (`reversesId`), never edits. This governs payroll runs (§2.6) and the fiscal-year close (§4.4) exactly as it governs bills.
3. **No stored balance counters, anywhere.** Every balance is derived by summing journal lines (plus proven operational subledgers). Phase D's applications: an employee's salary/advance position derives from `salary_payable` journal lines carrying their `ref` (§2.2); a loan's outstanding principal and accrued charges derive from the loan's journal lines + its schedule document (§3.3); attendance and payroll *progress* derive from documents, never counters (§1.3, §2.3).
4. **Inventory moves only through the ledger** (F-4). Phase D moves no inventory at all — it is the first phase with zero stock surface, and it must stay that way (payroll/loans/close touch money and time only).
5. **Migrations never fabricate history** (F-12/F-14). Phase D's migration writes **no journal entries and no operational history** (§10): its collections are born empty, and — decisively — the fiscal-year close posts **no opening entries**, because the journal is continuous (§4.5).
6. **Seed identities are frozen:** the seed journal's output must remain exactly what the harness pins (21 entries · Inventory 272,805 · Cash 50,000 · payables 27,900 · receivables 5,500 · trial balance 0 · seed-journal SHA `e17e5bda…1168`). Every Phase D seed/demo addition is chosen to have **zero journal footprint** (§10.3).
7. **Tax resolves at posting time** (A4). Payroll carries no sales/purchase tax. Statutory payroll withholdings (income-tax/EOBI style) are **not** modelled as tax-engine slabs; their treatment is an explicit scope decision in §2.5, not an accident.

## Current state (what Phase D builds on)

| Area | Today |
|---|---|
| COA | All four Phase D accounts already declared in COA v2 (`lib/coa.ts`): `salary_payable` (liability, Cr), `loans_payable` (liability, Cr), `expense_finance` (expense, Dr), `retained_earnings` (equity, Cr) — plus v1 `expense_salary` (expense, Dr). **No posting writes any of the four yet, except one:** C4 production issues credit `salary_payable` when labour/overhead is settled "accrue" (§2.2 — the shared-account fact this design must respect). |
| Salary money today | Two unconnected paths: (a) **Expenses category `salary`** posts Dr `expense_salary` / Cr money immediately (casual wages, no accrual, no person); (b) **C4 production accrual** credits `salary_payable` with **no `ref`** (the worker is not identified — the order is). Jobs (C5) declare a non-posting `labourCost` figure only. There is no employee record anywhere. |
| Login staff | Owner doc `staff[]` + `staffEmails[]` mirror + `staffIndex/{email}` (A3): these are **login accounts with roles** (manager/cashier/accountant), managed in Settings. Most employees of a real shop (helper, driver, tailor) have no login and never will. |
| RBAC | `lib/permissions.ts` **already encodes the five Phase D rows** (§6.1): `staffDirectory` F/F/N/R · `payroll` F/R/N/F · `loans` F/R/N/F · `fiscalClose` F/N/N/N · `trialBalanceExports` F/F/N/F (owner/manager/cashier/accountant). Rules v6 has **no** matches for Phase D collections yet — the catch-all denies them. |
| Periods & fiscal | `periods` collection + `lockedThrough` + `fiscalYearStartMonth/Day` (default 1 Jul) shipped in A5; `lib/periods.ts` already provides `fiscalYearRange` / `currentFiscalYear` / `previousFiscalYear`. The `periods` doc shape was designed in Phase A §5.1 with `kind: "period" \| "fiscal_year"` — the fiscal kind is reserved and unused. **No closing entries exist**: P&L accounts accumulate forever; a "year's profit" is a range report, not a closed fact. |
| Trial balance | **Already shipped** (live-audit Fix 4): `lib/reports.ts trialBalance()` — per-account period Dr/Cr + closing balances from the journal only, 14th report, bilingual print. The roadmap's Phase D trial-balance line is therefore already satisfied; Phase D consumes it (fiscal-close checklist, §4.2) rather than rebuilding it. |
| Reports/exports | 14 reports with bilingual print/share (Reports workspace); Finance has CSV exports for products/sales/expenses/customers (`lib/csv.ts`). **No journal export, no Tally format.** |
| Money warnings | The live-audit fixes added `outflowPreview` + `NegativeBalanceWarning`: outflows that would drive a money account negative warn (never block) at expenses, supplier payments, transfers. Payroll and loan outflows adopt the same helper (§2.4, §3.4). |
| Subscriptions | `COLLECTION_NAMES` in `StoreProvider` drives cloud listeners + the demo shape (demo storage key `dukaan-ai-store-v15`). |

---

## 1. Employees & attendance

### 1.1 Decision: employees are a new collection, NOT an extension of login staff

The Settings staff list (`staff[]` / `staffIndex`) answers "who may sign in, with what role". Payroll answers "who works here, on what terms, and what are they owed". Conflating them was considered and rejected:

- **Most employees have no login.** A helper or driver must exist in payroll without an email invitation, a Firebase account, or a role. Making a login the price of a payslip would leave most real staff unrecordable — the module would fail its first real shop.
- **The lifecycles differ.** A login is revoked by deleting an index doc; an employee is *deactivated* and their history (attendance, slips, advances) must remain readable forever — the posted-record posture, not the invitation posture.
- **The security boundary differs.** `staff[]` lives on the owner doc, which is owner-write-only by design (A3). Payroll records are written by the accountant (matrix: `payroll` accountant = full) — they cannot live on a document the accountant may not write.

**Model:** a separate `employees` collection, with an **optional, informational link** to a login:

```ts
interface Employee {
  id: string;
  name: string;                    // owner's words — printed on slips
  phone: string;
  designation: string;             // free text, owner's words ("Salesman", "Darzi")
  /** Optional link to a login account (an owner-doc staff[] email).
   *  Display/record only: it grants nothing, gates nothing, and the
   *  rules never read it. Most employees have null. */
  linkedUserEmail: string | null;
  joinDateISO: string | null;      // YYYY-MM-DD
  /* --- salary structure (current terms; runs snapshot, §2.3) --- */
  payBasis: "monthly" | "daily";
  /** monthly: the month's base salary. daily: the rate per present day. */
  baseAmount: number;
  /** Fixed monthly earning lines (allowances) added on the slip. */
  allowances: Array<{ label: string; amount: number }>;
  /** Paid leave days per month before absence deduction applies
   *  (monthly basis only; §1.4). */
  paidLeaveDays: number;
  active: boolean;                 // deactivated, never deleted (§1.5)
  note: string;
  ts: string;
}
```

The structure fields are the employee's **current terms**, edited in place like a product's price: a raise changes future runs only, because every run snapshots what it paid (§2.3) — the snapshot discipline that already governs `BillItem` prices and A4 slab snapshots. No structure versioning is stored (contrast BOMs, §C3.2: a recipe must be reproducible because it *caused* postings; a salary structure causes nothing until a run snapshots it — the run is the reproducible record).

### 1.2 What an employee is not

An employee record carries **no balance**. What the shop owes an employee, and what an employee owes the shop (advances), derive from the journal (§2.2). An employee also carries **no attendance totals** (§1.3) and **no "paid this month" flag** (§2.3 derives run/payment state). The directory doc is identity + current terms, nothing else.

### 1.3 Attendance — one document per employee-month

New collection `users/{uid}/attendance/{attId}`:

```ts
type AttendanceMark = "present" | "absent" | "half" | "leave" | "off";
interface AttendanceMonth {
  id: string;                // deterministic: `${employeeId}__${yyyyMm}`
  employeeId: string;
  month: string;             // "2026-10" (calendar month — see Q3)
  /** Sparse: only marked days appear. An unmarked past day reads as
   *  unmarked (the register shows it blank), never silently present. */
  days: Record<string, AttendanceMark>;   // key: day-of-month "1".."31"
  ts: string;
}
```

- The deterministic composite id is the `stockLevels` precedent (C §1.3): every mark is an idempotent write to a known doc, in cloud batches and demo state alike.
- **The register is a grid, and the grid is the whole UI**: rows = active employees, columns = days of the viewed month, one tap cycles the mark (present → absent → half → leave → off). Sticky header row + sticky name column (the standing UI/UX standard); month switcher in a sticky toolbar; a per-row derived summary (P/A/H/L counts) at the row's end. No save button — each tap writes (the day-close/notes pattern).
- Attendance **posts nothing, ever**. It is an input to payroll computation (§2.3), like a quotation is an input to a bill. Editing a past month's marks is allowed (it asserts no money fact) — but once a payroll run for that month is **posted**, the run's slips already snapshotted the counts; editing attendance afterwards changes no slip (it would change a *re-run*, which §2.6's reversal discipline governs). The register warns when a viewed month already has a posted run — a warning, not a lock, matching the app's warn-don't-block posture for non-money facts.
- Derived summaries are selectors: `attendanceSummary(att, month)` → per-employee `{ present, absent, half, leave, off, markedDays }`, where a "half" counts 0.5 toward worked units. Nothing is totalled on the doc.

### 1.4 How attendance becomes pay (the proration rule)

For a **monthly-basis** employee with base `B`, in a month of `D` calendar days:

```
workedUnits   = present + 0.5 × half + leave + off     (paid days)
unpaidAbsent  = max(0, absent − paidLeaveDays)
earnedBase    = round2(B × (D − unpaidAbsent) / D)     — full B when unpaidAbsent == 0
```

`leave` and weekly `off` days are paid by construction (they are part of the month's salary bargain); only absence beyond the paid-leave allowance docks pay, pro-rata over calendar days. For a **daily-basis** employee:

```
earnedBase = round2(dailyRate × (present + 0.5 × half))
```
(absence simply earns nothing; `paidLeaveDays` does not apply.) Both formulas live in one pure function in `lib/payroll.ts`, are recomputed at run composition from the attendance doc, and are **snapshotted onto the slip** — after that, the formula's future edits cannot rewrite a posted slip. Piece-rate pay is out of scope (§12.3): a per-piece worker is recorded daily-basis with a note, or via job labour declarations, until a later phase designs piece rates properly.

### 1.5 Employee lifecycle

- **Deactivate, never delete** (the A R-3 / warehouse discipline): an employee with any attendance, slip, advance or journal line is archive-only. A never-used employee (created by mistake, no records) may be deleted by the owner — the store checks the same "any record cites them" test the warehouse rule uses.
- Deactivated employees vanish from the register and run composition, remain in history, slips and the salary ledger, and can be reactivated (seasonal staff are the norm, not the exception).

---

## 2. Payroll

### 2.1 The flow, in one paragraph

A **payroll run** for a calendar month is composed from the directory + attendance (draft, freely editable) → **finalised**, which posts ONE accrual entry (Dr `expense_salary` / Cr `salary_payable`, per-employee lines) → **paid** in one or more payment events, each posting its own entry (Dr `salary_payable` / Cr money account), each payment optionally recovering outstanding advances → a **salary slip** prints per employee per run. **Advances** are standalone money events between runs (Dr `salary_payable` / Cr money), recovered at payment time. Every figure the desk sees — accrued, advanced, paid, owed — derives from the journal lines' `ref` (§2.2). This is the accrual discipline Phase A pre-declared in the COA (`salary_payable`: "Dr `expense_salary` / Cr here at run; Dr here / Cr money at payment") — Phase D is where it lands.

### 2.2 The `salary_payable` subledger: refs, and the C4 shared-account fact

Journal-line `ref` convention for `salary_payable` (the A §1.1 subledger pattern, fourth application after customers/suppliers/money accounts):

| Line | `ref` |
|---|---|
| Payroll accrual (Cr) and payment/advance (Dr) for an employee | `employeeId` |
| C4 production-issue accrual (Cr) — **already shipped, carries no ref** | `null` |

Consequences, stated exactly:

```
employeePosition(entries, emp) = Σ (debit − credit) over salary_payable lines with ref == emp
    > 0 ⇒ the employee owes the shop (net advances outstanding)
    < 0 ⇒ the shop owes the employee (accrued, unpaid)
GL salary_payable balance == Σ employees' positions + unassignedAccruals
unassignedAccruals = −(Σ (debit − credit) over salary_payable lines with ref == null)
    — today this is exactly the C4 accrued production labour/overhead.
```

The production accrual is **not** re-ref'd retroactively (the journal is append-only; C4's shipped template is frozen by its harness). Phase D therefore treats `salary_payable` honestly as a two-part liability: per-employee positions (payroll's domain) + an **unassigned bucket** (production accruals). The payroll desk shows both; the unassigned bucket is settled by a payment event with `employeeId: null` (§2.4) — in practice the owner pays the day-labourers whose conversion cost was accrued, and records it against the bucket. From Phase D forward, when the person being paid for production labour **is** an employee, the desk may alternatively record their payment against the employee (Dr `salary_payable` ref = employee) — the GL total falls identically either way; only the bucket attribution differs, and the composition selector keeps both buckets' arithmetic exact regardless (§9, D2 identities). C4's template is **not** changed to stamp employee refs — production issues do not know which human the labour was (a run may pool several workers), and inventing an attribution would be fabrication.

### 2.3 The payroll run document

New collection `users/{uid}/payrollRuns/{runId}`:

```ts
interface PayrollRunLine {
  employeeId: string;
  name: string;                 // snapshot
  payBasis: "monthly" | "daily";   // snapshot
  /* attendance snapshot (from §1.4's computation at composition) */
  daysInMonth: number; present: number; absent: number; half: number;
  leave: number; unpaidAbsent: number;
  earnedBase: number;           // §1.4 result — the snapshot that matters
  allowances: Array<{ label: string; amount: number }>;   // snapshot
  /** Deductions that REDUCE the accrual (§2.5): absence is already
   *  inside earnedBase; these are fines/other owner-entered lines. */
  deductions: Array<{ label: string; amount: number }>;
  gross: number;                // earnedBase + Σ allowances
  netAccrued: number;           // gross − Σ deductions  (== the Cr line)
}
interface PayrollPaymentEvent {
  employeeId: string | null;    // null = settles the unassigned bucket (§2.2)
  name: string;                 // snapshot ("Production labour" for null)
  amount: number;
  method: PayMethod;            // money methods only — never "credit"
  accountId: string | null;     // A2 stamp
  entryId: string;              // the ONE entry that posted it
  dayOffset: number; ts: string;
}
type PayrollRunStatus = "draft" | "posted" | "reversed";
interface PayrollRun {
  id: string;
  number: string | null;        // "PAY-5" once finalised (§6.3); draft = null
  month: string;                // "2026-10" the run PAYS FOR
  lines: PayrollRunLine[];
  totals: { gross: number; deductions: number; netAccrued: number };
  /** Payment events across the run's life. A payment is recorded
   *  against the RUN it settles (the month's wages), whoever's run
   *  screen the desk used; advance recovery is computed at payment
   *  time from the journal (§2.4), not stored per event. */
  payments: PayrollPaymentEvent[];
  accrualEntryId: string | null;   // null while draft
  status: PayrollRunStatus;        // cached label; paid state derives (§2.4)
  note: string;
  dayOffset: number; ts: string;
}
```

- **Drafts post nothing** and are freely editable/deletable (the B §1.4 doctrine): lines recompute from attendance on demand, per-line figures are overridable at the desk (a bonus typed as an allowance line, an extra deduction) — overrides live on the line snapshot, so what finalises is exactly what the desk saw.
- **One posted run per month** is the norm, enforced as a store-level refusal (a second run for a month whose run is already posted must be composed as corrections, §2.6 — two accruals for one month would double the expense; the refusal is the F-3-style pre-composition guard). A month with a **reversed** run may be re-run (§2.6).
- The run's **paid state is derived**, never stored: `paidFor(run, emp) = Σ payments on this run for emp`; a line is settled when its payments reach `netAccrued − advancesRecoveredAtPayment` — no wait: advances are recovered **through** the payment (§2.4), so the derivation is journal-shaped: an employee's position (§2.2) is the single truth, and the run screen renders per-employee `accrued (this run) · advances outstanding · paid (this run) · still owed` from run lines + journal positions together. The cached `status` covers only draft/posted/reversed; "partially paid" is a rendering of derived figures, like B's fulfilment labels.

### 2.4 Posting templates (all through `guardPostings`, `makeEntry`-balanced)

**Finalise run** — ONE entry, `refType: "payroll_accrual"`, `refId` = runId. Per line with `netAccrued > 0`:

```
Dr  expense_salary   (ref: employeeId)     gross_i
    Cr  salary_payable (ref: employeeId)       netAccrued_i
    — the deduction difference (gross_i − netAccrued_i) is NOT posted:
      a §2.5 reducer deduction is money never earned, so it never
      enters the journal at all. The slip shows it; the ledger
      correctly never saw it.
```
ΣDr = Σ gross over posted lines; ΣCr = Σ netAccrued + Σ(gross − netAccrued)?? — **no**: as written this entry balances only when deductions are zero. The honest construction, and the one this design mandates: **the accrual entry is Dr `expense_salary` netAccrued_i / Cr `salary_payable` netAccrued_i per employee** — the expense recognised is what the employee actually earned after reducer deductions, exactly as a discounted bill recognises revenue net (the discount never grosses up the journal; `sales_discount` exists because discounts are a *reported* contra — payroll deductions have no such reporting account in COA v2, and inventing one reopens the registry for a payslip presentation need the slip itself satisfies). The slip prints gross, deductions, and net; the journal carries net. `makeEntry` balances trivially, per employee and in total. (Recorded here at length because it is the one template in Phase D where a plausible-looking alternative is wrong — grossing up via a deductions contra account is Phase D's `inventory_out` temptation, rejected on the same grounds as B §2.5 / C §4.1: no COA code exists for it, and none is needed.)

**Pay an employee** (from a posted run; per payment event) — `refType: "payroll_payment"`, `refId` = runId:

```
Dr  salary_payable   (ref: employeeId)     amountPaid + advanceRecovered
    Cr  cash|wallet    (ref: accountId)        amountPaid
```
where `advanceRecovered` is the desk-chosen portion of the employee's outstanding advance position (§2.2, if positive) settled by this payment — it debits `salary_payable` further without money moving, which is precisely what "recovered from this salary" means. The desk defaults recovery to `min(outstanding advance, netAccrued − already paid)` and may set it to 0 (pay full, carry the advance). If the employee's position after accrual is still advance-heavy (advance > month's accrual), the payment may legitimately be 0-with-recovery-only — allowed, and the event records amount 0 money with the recovery in the Dr line (the entry then is Dr salary_payable / Cr salary_payable?? — **no**: a recovery-only settlement writes NO journal entry, because the advance Dr and the accrual Cr already coexist in the same subledger and net by derivation; the "recovery" is an allocation the desk declares, and allocations are derivations, not postings. **Design correction, stated plainly:** `advanceRecovered` is therefore NOT a journal quantity at all. It is a slip/presentation allocation: `recoveredInRun(run, emp)` = the portion of the employee's pre-run advance position absorbed by this run's accrual, derived as `min(advancePositionBeforeRun, netAccrued)` unless the desk recorded an explicit `advanceCarried` override on the payment event… — v1 keeps it purely derived with the formula above and NO override: the employee's position (§2.2) is always the truth, the slip shows `advance recovered = min(prior advance, netAccrued − cashPaid toward it)`… The slip's arithmetic is defined once in §2.7 and asserted in §9; the journal never hears about recovery. The payment entry is simply:

```
Dr  salary_payable   (ref: employeeId)     amountPaid
    Cr  cash|wallet    (ref: accountId)        amountPaid
```

**Advance** (any time; from the employee card or the payroll desk) — `refType: "salary_advance"`, `refId` = employeeId:

```
Dr  salary_payable   (ref: employeeId)     X
    Cr  cash|wallet    (ref: accountId)        X
```
An advance is **not** an expense (nothing earned yet) and **not** a `credits` row (the customer khata and its F-6 FIFO machinery are for customers; an employee advance inside it would corrupt receivables aging — the same reasoning as §3.2's loan isolation). It rides the employee's own subledger from birth. Cheque advances are out of v1 (an advance is cash-in-hand by nature; stated, not silent).

**Pay the unassigned bucket** (production accruals) — a payment event with `employeeId: null` on any posted run (or from Finance, §2.8): `refType: "payroll_payment"`, Dr `salary_payable` (ref null) / Cr money. The GL and the bucket both fall; no employee position moves.

**Money-account guard:** every payroll/advance outflow passes `outflowPreview` and shows `NegativeBalanceWarning` before posting when it would drive the account negative (the live-audit fix's helper, reused verbatim) — warn, never block.

### 2.5 Deductions — the reducer model, and what is deliberately deferred

V1 deductions are **reducers only**: absence (inside `earnedBase`), fines, damage recovery, "other" — amounts the employee simply does not earn/receive, itemised on the slip, invisible to the journal (§2.4). **Statutory withholdings are explicitly NOT in v1**: an income-tax or EOBI deduction is not a reducer — it is money earned by the employee and owed by the shop to an authority, which needs its own liability code(s) and a payment flow to the authority. COA v2 declares no such code, and the target shops overwhelmingly pay cash salaries without app-level statutory withholding. Modelling it wrong (as a reducer) would understate the shop's liabilities invisibly — worse than not modelling it. This is Open Question Q4 with a recommendation; if the owner wants it, it is an additive-code increment of its own, not a v1 field.

### 2.6 Corrections — a posted run is reversed, never edited

A posted run's accrual may be **reversed** (owner/accountant, `payroll` write): ONE mirror entry (`refType: "payroll_accrual"`, `reversesId` = accrual entry, lines negated) + the run's status → `reversed`, in one batch. Payments already made against the run **stand** (real money moved; they now sit as advance position for those employees — §2.2's derivation absorbs this truthfully, and the re-run's slips will show the carried position). The month may then be re-run correctly. A payment made in error is corrected the app's universal way: a compensating advance/payment pair is NOT fabricated — the owner records a negative-amount… no: payments are corrected by an explicit **payment reversal** event posting the mirror entry (`refType: "payroll_payment"`, `reversesId`), recorded on the run's payments as a reversing event (events are append-only, like C4's production events). Slips reprint from current derivation + snapshots at print time.

### 2.7 The salary slip (print)

Per employee per run, through the existing print machinery (receipt-sheet pattern / `ReportPrintSheet` — browser print, the only Urdu-safe PDF route, per the Reports build). Content, all from the run line snapshot + journal derivation at print time:

- Shop header; **PAY- number + month**; employee name/designation.
- Attendance summary (present/absent/half/leave, days in month).
- Earnings: base (earned), each allowance — **gross**.
- Deductions: each reducer line — **net accrued**.
- Advances: position before this run, recovered this run (= `min(advanceBefore, max(0, netAccrued − cashPaid))` rendered from derivation — the §2.4 definition), still outstanding after.
- **Paid** (Σ this run's payment events for the employee, with method/account), **still owed** (current position if negative).
- Signature line. (Bilingual via the dictionary like every print; the slip is a Phase D print, Phase E will restyle prints globally.)

### 2.8 Surfaces

- **Staff screen** (`/staff`): directory (sticky toolbar, search via `lib/search.ts`, add/edit/deactivate) + employee card (terms, current position — owed/advanced from §2.2 — attendance link, advance action, salary history = runs citing them + their slips).
- **Attendance** (`/attendance` or a tab of Staff — one route, `/staff`, with Directory / Attendance / Payroll tabs keeps the sidebar at one entry; the nav is already 24 items): the §1.3 grid.
- **Payroll** (same screen, third tab): run list + composer (month picker → lines auto-computed → overrides → finalise) + run detail (payments, per-employee pay/advance/owed table, slip prints) + the unassigned-bucket card (production accruals balance + pay action) when non-zero.
- **Finance** gains two read figures, no new surface: `salary_payable` composition (employees owed / advances outstanding / unassigned) in the liabilities area — the account already renders there by code; Phase D adds its breakdown line, derived.

---

## 3. Loans & financing

### 3.1 Model — one register, two directions, one additive code

New collection `users/{uid}/loans/{loanId}`:

```ts
type LoanDirection = "payable" | "receivable";   // payable: the shop borrowed
interface Loan {
  id: string;
  number: string;               // "LN-3" — minted AT CREATION (the number
                                // goes on the loan agreement; the jobs
                                // precedent, C §5.1: born numbered)
  direction: LoanDirection;
  partyName: string;            // lender (payable) / borrower (receivable) — snapshot
  partyId: string | null;       // optional link: supplier/customer/employee id
  principal: number;
  /** The charge structure — §3.2. Default "none": a loan with no
   *  charge is the register's normal citizen, not a special case. */
  chargeType: "none" | "flat" | "reducing" | "fee_only";
  /** flat/reducing: percent. flat = % of ORIGINAL principal over the
   *  whole term; reducing = % per period on outstanding principal.
   *  fee_only: chargeAmount is the one-off fee. */
  chargeRate: number;
  chargeAmount: number;         // computed at creation for flat/fee; shown, snapshotted
  startDateISO: string;         // drawdown date (YYYY-MM-DD)
  instalmentCount: number;
  instalmentEvery: "month" | "week";
  firstDueISO: string;          // first instalment due date
  status: "active" | "settled" | "cancelled";   // cached label (§3.3)
  note: string;
  dayOffset: number; ts: string;
}
```

**Direction and the COA.** Payable loans ride the pre-declared `loans_payable`. Receivable loans (the shop lends — to a staff member outside payroll advances, a partner, another business) need an asset home. Two candidates: (a) ride `receivables` with `ref = loanId` — **rejected**: `receivables` is the customer khata whose subledger is the `credits` collection; `receivablesAging` and the F-6 FIFO allocation derive from `credits` rows, so a journal-only loan line would inflate `receivablesTotal` with no subledger row and break the journal ≡ subledger identity the audits assert to the rupee — the exact F-5 drift shape; (b) **one additive code `loans_receivable`** (asset, Dr-normal) — **chosen**. It follows Phase A's own additive discipline (v1 codes frozen in name/meaning; new codes appended, declared in the registry with `since: "D"`), no existing line changes meaning, and the trial balance gains one honest row. This is Phase D's only COA change, and D1 declares it (type-only, §9) so the loans increment needs no registry churn — the A1 pattern.

### 3.2 Charges — explicit, configured, never silent (the owner's sensitivity is a design input)

The owner is an Islamic scholar; the register's defaults must be beyond reproach **and** commercially complete (his shops deal with banks and leasing companies whose charges are facts of his business whether or not he would choose them for his own lending). The design's rules:

1. **`chargeType: "none"` is the default and the path of least resistance.** Creating a loan requires no charge field to be touched; a charge exists only when the desk deliberately selects a type and enters a rate/amount. Nothing in any template accrues a charge on its own: every charge posting is a discrete, dated, desk-confirmed event (§3.4) — the schedule *proposes*, the desk *posts*.
2. **Neutral vocabulary everywhere.** The UI and dictionary call it "charge / اضافی چارج" — never "interest/سود" in labels, never "markup" dressed as something else either: the loan doc stores the type plainly (`flat`/`reducing`/`fee_only`), the slip/statement prints the type and amount plainly. The app records the owner's commercial facts; it does not editorialize them, and it does not hide them.
3. **Receivable loans carry NO charge in v1** (any direction configuration is refused at composition for receivable loans). Rationale, two-legged: (a) the natural receivable cases (staff, family, partner accommodation) are charge-free in the owner's world; (b) charge *income* would need an income code COA v2 does not declare, and crediting charges-received into `expense_finance` (negative expense) is exactly the kind of quiet hack the audit culture of this codebase forbids. If the owner later wants charged lending, it arrives as its own designed increment with a `finance_income` code — Open Question Q1 records the choice.
4. **A one-off fee is an expense of borrowing, recognised at drawdown** (§3.4) — never smeared silently into principal.

### 3.3 The schedule is derived; outstanding is derived

The instalment schedule is a **pure function of the loan doc**: `loanSchedule(loan)` → per-instalment `{ n, dueISO, principalPart, chargePart }` where principal parts split `principal` evenly (final instalment absorbs the paisa residual — the cumulative-allocation discipline), flat charge splits `chargeAmount` evenly likewise, reducing charge computes per period on the outstanding principal *per the schedule* (not per actual payments — the schedule is the agreement; late payment does not rewrite it in v1). What has actually happened derives from the journal:

```
principalPaid(loan)   = Σ (debits − credits) over loans_payable lines ref == loanId
                        attributable to principal — via the loan's event records (§3.4)
chargesAccrued(loan)  = Σ credits to loans_payable ref == loanId posted as charges
                        minus charge portions of repayments — again via events
outstanding(loan)     = principal − principalRepaid + chargesAccrued − chargesRepaid
```

Because attribution (principal vs charge inside one Dr line) is not recoverable from journal lines alone, the loan doc carries an **append-only events array** — the C4 production-events / B cheque-diary pattern, third application:

```ts
interface LoanEvent {
  kind: "drawdown" | "charge" | "repayment" | "fee" | "writeoff";
  amount: number;               // the journal value this event moved
  principalPart: number; chargePart: number;   // repayment split (schedule-derived default, desk-overridable)
  accountId: string | null;     // money account (drawdown/repayment/fee)
  entryId: string;              // the ONE entry that posted it
  dayOffset: number; ts: string;
}
```
Events are written only inside their posting batch and never edited; the status (`active`/`settled`) is a cached label recomputed in each event's batch, with `outstanding == 0` ⇒ settled. The journal remains the money truth (GL `loans_payable` ≡ Σ outstanding over payable loans — asserted, §9); events are the attribution diary, exactly as production events are for WIP.

### 3.4 Posting templates (`refType`s are new, §6.4; all through `guardPostings`)

**Drawdown — payable** (money in; `refType: "loan_drawdown"`, `refId` = loanId):

```
Dr  cash|wallet  (ref: accountId)        P
    Cr  loans_payable (ref: loanId)          P
```
With a `fee_only` charge (or an upfront fee on any type) **netted from proceeds** — one entry:
```
Dr  cash|wallet  (ref: accountId)        P − F
Dr  expense_finance                       F
    Cr  loans_payable (ref: loanId)          P
```
(if the fee is paid separately instead, it is its own `expense_finance` cash entry via the ordinary Expenses path — the drawdown stays clean; the desk chooses, the design blesses the netted form as the one that keeps the loan's records together.)

**Drawdown — receivable** (money out; the shop lends): mirror — Dr `loans_receivable` (ref: loanId) / Cr money. `outflowPreview` warning applies.

**Charge accrual** (payable loans with flat/reducing charges; per instalment as it falls due, desk-confirmed from the Loans screen's "due now" list; `refType: "loan_charge"`):

```
Dr  expense_finance                       C_i
    Cr  loans_payable (ref: loanId)           C_i
```
One accrual per instalment keeps `expense_finance` honestly period-shaped (a flat charge for a 2-year loan is NOT expensed on day one — matching the instalments it rides on). Accrual is never automatic and never backdated silently: the desk posts it at its real date, and if the owner prefers, several due instalments' charges may accrue in one action — still one entry per instalment, so the diary stays instalment-shaped.

**Repayment** (either direction; `refType: "loan_repayment"`):

```
payable:    Dr  loans_payable   (ref: loanId)    X
                Cr  cash|wallet  (ref: accountId)    X
receivable: Dr  cash|wallet     (ref: accountId) X
                Cr  loans_receivable (ref: loanId)   X
```
The event records the principal/charge split (default: charges-first per the schedule, desk-overridable — the split is attribution, §3.3; the journal line is the whole X either way). Overpayment beyond outstanding is refused pre-composition. `outflowPreview` warning on payable repayments.

**Write-off / settlement by agreement** (a receivable the shop forgives, or a payable the lender waives): the residual outstanding posts Dr `loans_payable` / Cr `expense_finance`?? — no: a waived payable is a **gain**, and v1 has no gain code; a forgiven receivable is a **loss** with no code either (`inventory_loss` is stock-only by name and meaning). **V1 decision: write-offs are out of scope** (§12.3) — a loan is settled by repayment events summing to its outstanding, or left active with a note. Recording a waiver as a "repayment" with no money would fabricate a money event — the one thing this codebase never does. Flagged honestly rather than hacked.

### 3.5 Party links and surfaces

`partyId` optionally cites a supplier (a dealer's financing), a customer, or an employee — display and statement cross-reference only; the loan never rides those subledgers (§3.1's isolation is the point). **Loans screen** (`/loans`): register list (sticky toolbar; direction filter; derived outstanding per loan; due-next-instalment per loan), loan detail (schedule table with per-instalment paid/accrued state derived from events, event diary, repayment + charge-accrual actions), and a header summary: total borrowed outstanding / total lent outstanding / charges this fiscal year (`expense_finance` FY sum — a selector that already works on any journal). Finance's liabilities area gains the `loans_payable` figure's register breakdown (it already renders the account by code).

---

## 4. Fiscal-year close

### 4.1 What "close" means here

At FY end (settings `fiscalYearStartMonth/Day`, default 1 Jul), the year's income and expense accounts are **zeroed into `retained_earnings`** by closing entries, the year is **locked** against new postings, and balance-sheet accounts **carry forward by derivation** — the journal never restarts. Phase A built the foundation deliberately for this: `retained_earnings` was declared as "fiscal-year closing target (Phase D)", and the `periods` doc kind `"fiscal_year"` was reserved. Phase D is the landing, not a new foundation.

### 4.2 The pre-close checklist (all derived; hard gates vs warnings)

The close screen computes, for the chosen FY (any fully-past FY; defaulting to the previous FY):

| # | Check | Derivation | Gate |
|---|---|---|---|
| 1 | Trial balance for the FY balances | `trialBalance(journal, fyRange).difference == 0` and `closingDifference == 0` (the shipped builder) | **Hard** |
| 2 | `purchases` clearing is zero at FY end | `accountNormalBalance(entries ≤ fyEnd, "purchases") == 0` — it nets per purchase by construction; non-zero means a real defect, and closing over it would bury it in equity | **Hard** |
| 3 | No unposted (draft) payroll run for a month inside the FY | `payrollRuns` scan | Warning |
| 4 | Open production orders with pool > 0 at FY end | C4 `pool(order)` derivation | Warning (WIP carries forward legitimately) |
| 5 | `salary_payable` composition at FY end | §2.2 composition selector | Informational (carries forward) |
| 6 | Cheques in hand / issued, uncleared at FY end | B5 registry derivation | Informational (carry forward) |
| 7 | Stock: GL `inventory`+`inventory_raw` vs shelf `stockValue()` | the C-era known latest-cost divergence, shown with its figure | Informational |
| 8 | Every month of the FY is period-locked, or the close locks it | `lockedThrough` vs FY end (§4.3) | Informational — the close performs it |

Hard gates block the Close button; warnings require an explicit tick ("close with these open items") recorded on the close doc. Nothing on this list is stored — it is computed when the screen opens and recomputed inside the close action before composing any write (the pre-composition refusal discipline).

### 4.3 The closing entries

**One entry per FY** (`refType: "fy_close"`, `refId` = the periods doc id), composed from the FY's account balances (each P&L account's net movement **inside the FY range**, via the same `accountNormalBalance` machinery the P&L report uses):

```
For a profitable year (net N > 0):
Dr  sales_revenue            Rev            (its FY credit balance, zeroing it)
Dr  cogs                     — no: expense accounts carry DEBIT balances;
    the closing entry CREDITS them. In Dr/Cr line form:
Dr  sales_revenue            Rev
    Cr  sales_discount           Disc
    Cr  cogs                     COGS
    Cr  expense_rent             …
    Cr  expense_electricity      …
    Cr  expense_salary           …
    Cr  expense_transport        …
    Cr  expense_other            …
    Cr  expense_finance          …
    Cr  inventory_loss           …
    Cr  retained_earnings        N  = Rev − Disc − COGS − Σexpenses − Loss
```
A loss year mirrors (Dr `retained_earnings` |N|, expenses debited back… in line form: every P&L account is zeroed by a line on its **opposite** side for its exact FY balance, and `retained_earnings` takes the balancing line — `makeEntry` enforces the arithmetic; zero-balance accounts are omitted). The closed set is exactly the P&L class of the COA registry (types `income`, `contra_income`, `expense`) — **read from `lib/coa.ts`, never a hand list**, so a future expense code joins the close automatically. Balance-sheet accounts (`asset`/`liability`/`equity`/`clearing`) are never in a closing entry; tax accounts (`tax_payable`/`tax_input`) are balance-sheet and carry forward — the A4 design already ruled "the offset entry belongs to fiscal close" out in favour of carry-forward, and this design confirms it: tax settles by payment, not by year-end netting.

The same batch writes: (a) the closing entry, (b) a `periods` doc `{ kind: "fiscal_year", action: "close", from, to, prevLockedThrough, note }` (the Phase A §5.1 shape, finally used), and (c) `lockedThrough` advanced to the FY end-of-day instant **if greater than its current value** (monotonic, per A5) — a closed year accepts no new postings, by the store guard and the rules backstop alike. The entry's `dateISO` is the FY's last day (it is an entry *of* that year — and since the lock it sets starts exactly at that instant's end, `preparePosting`'s own guard must admit the close entry itself: the close action composes through `guardPostings` with the pre-close lock state, the same ordering the A5 design sanctions for the lock-setting write itself; implementation note, recorded so it is designed rather than discovered).

### 4.4 Reopening — by reversal, owner-only

`fiscalClose` is the matrix's only owner-exclusive Phase D row (F/N/N/N), and reopening is its sharpest edge:

- **Reopen FY** posts the closing entry's exact mirror (`refType: "fy_close"`, `reversesId` = closing entry id), writes a `periods` doc `{ kind: "fiscal_year", action: "reopen" }`, and restores `lockedThrough` to the close doc's `prevLockedThrough` — all in one batch. The year is open again; its P&L accounts carry their balances again (the mirror restores them to the paisa). The journal shows both events forever — a closed-then-reopened year is a fact, not an embarrassment to erase.
- Reopen is refused if a **later** FY has since been closed (closes unwind in reverse order only — the stack discipline), or if any posting has landed in the reopened year since the close (there cannot be, the lock forbade it — the check is the belt to the lock's braces).

### 4.5 Opening balances — there are none, by design

A continuous double-entry journal needs **no opening entries**: the balance of every balance-sheet account at the FY's first instant *is* its opening balance, derivable by `accountNormalBalance(entries < fyStart)`. Posting opening entries (the paper/Tally habit) would double every balance. The close screen therefore shows an **Opening balances** panel for the new FY — per-account derived figures, printable — and the trial-balance report over any range already renders them as its closing/opening columns. This is stated in the design, the PRODUCTION notes, and the close screen's own help text, because every accountant who arrives from Tally will ask where the opening entries are (§5's export answers the same question from the other side: Tally *does* get opening balances — generated in the export file, never in our journal).

### 4.6 Reading a closed year's P&L

After close, the FY's P&L accounts are zero — so a naive P&L report over the closed FY would show the closing entry's lines and net to zero, which is true and useless. The design's rule: **P&L-type reports exclude `fy_close` entries from their account sums** (a one-line filter in the report builders' entry selection — the closing entry is a *transfer between accounts*, not trading activity), so the closed year's P&L still reads exactly as it did the day before the close, while the trial balance (which must NOT exclude it) shows the zeroed truth. The FY-close screen additionally renders the year's summary **from the closing entry itself** (its lines are the year's result, by construction) — the two views agree by identity, asserted in §9. The dashboard's month P&L is unaffected (it never spans a close boundary unknowingly — a month inside a closed FY renders via the same exclusion).

---

## 5. Tally export & general exports

### 5.1 Shape of the export

A client-side file generated from the subscribed journal (the Finance CSV exports' pattern — no server, no new dependency), offered from Finance and Reports under the `trialBalanceExports` gate:

- **Tally XML** (primary): one file per chosen range (default: a fiscal year), importable by TallyPrime and Tally ERP 9 via Gateway → Import Data → Vouchers. Contains: ledger masters for every COA account that moved (plus party ledgers, §5.3), then one `<VOUCHER>` per journal entry.
- **Journal CSV** (fallback): the same range as flat rows — Date · Voucher No · Type · Account · Party/Ref · Debit · Credit · Narration — through `lib/csv.ts`. This doubles as the "general CSV export expansion" the roadmap asks Phase D for (the journal is the one dataset Finance could not export until now).

### 5.2 The fixed mapping (documented defaults; owner-overridable names)

Ledger per account code; **parent group** from this fixed table (Tally's predefined groups — the names must match Tally's exactly):

| Code(s) | Tally ledger name (default) | Parent group |
|---|---|---|
| `cash` | Cash | Cash-in-Hand |
| `wallet` | Wallet & Bank | Bank Accounts |
| `receivables` | Sundry Debtors — Control *(party ledgers carry the detail, §5.3)* | Sundry Debtors |
| `payables` | Sundry Creditors — Control | Sundry Creditors |
| `inventory`, `inventory_raw`, `wip` | Stock — Goods / Stock — Raw Material / Stock — WIP | Stock-in-Hand |
| `tax_payable`, `tax_input` | Tax Payable / Input Tax Credit | Duties & Taxes |
| `cheques_in_hand` | Cheques in Hand | Current Assets |
| `cheques_issued`, `salary_payable` | Cheques Issued / Salary Payable | Current Liabilities |
| `loans_payable` | Loans Payable | Loans (Liability) |
| `loans_receivable` (D) | Loans Receivable | Loans & Advances (Asset) |
| `capital` | Owner Capital | Capital Account |
| `retained_earnings` | Retained Earnings | Reserves & Surplus |
| `drawings` | Owner Drawings | Capital Account |
| `sales_revenue` | Sales | Sales Accounts |
| `sales_discount` | Sales Discount | Sales Accounts |
| `purchases` | Purchases | Purchase Accounts |
| `cogs` | Cost of Goods Sold | Direct Expenses |
| `expense_rent`, `expense_electricity`, `expense_transport`, `expense_other`, `expense_salary`, `expense_finance` | Rent / Electricity / Transport / Other Expenses / Salaries / Finance Charges | Indirect Expenses |

The owner may override the **ledger name** per code (their Tally may already hold a "Sales A/c") via settings `tallyLedgerNames?: Partial<Record<AccountCode, string>>` — names only, never groups (a wrong group silently corrupts the Tally balance sheet; names are cosmetic, groups are structural — the design lets the owner rename but not re-parent). Defaults above are used verbatim when no override exists. Party ledgers (§5.3) are named by the party's own name.

### 5.3 Vouchers and party ledgers

- One `<VOUCHER>` per journal entry: `VCHTYPE` mapped from `refType` — `bill`/`sale` → **Sales**; `purchase` → **Purchase**; `return` → **Credit Note**; `purchase_return` → **Debit Note**; `supplier_payment`, `expense`, `expense_reversal`, `payroll_payment`, `salary_advance`, `loan_repayment` (payable) → **Payment**; `repayment`, `credit`, `loan_repayment` (receivable), `loan_drawdown` (receivable) → **Receipt**; `transfer`, `loan_drawdown` (payable) → **Contra**; everything else (`adjustment`, `cashbook`, `tax_payment`, `cheque_*`, `reclass`, `transfer_loss`, `production_*`, `job_material*`, `payroll_accrual`, `loan_charge`, `fy_close`, `seed`) → **Journal**. `DATE` = the entry's `dateISO` (YYYYMMDD), `NARRATION` = the memo, `VOUCHERNUMBER` = the entry's ref/document number where one exists.
- Each journal line becomes an `ALLLEDGERENTRIES.LIST` with Tally's sign convention (`ISDEEMEDPOSITIVE` + signed `AMOUNT`: debits negative in Tally XML's convention — the exporter writes per Tally's documented import semantics; the harness asserts Σ per voucher == 0 in *our* terms before conversion, §9).
- **Party ledgers:** a `receivables`/`payables` line carrying a `ref` exports against a **per-party ledger** (customer/supplier name, parent Sundry Debtors/Creditors) instead of the control ledger — Tally accountants expect party-wise books, and our subledger refs carry exactly that truth. Party masters are generated for every ref'd party in range. Lines without refs use the control ledgers. (`salary_payable` lines with employee refs likewise export against per-employee ledgers under Current Liabilities — same rule, third application; money-account refs stay on the bucket ledger — bank-detail ledgers are the owner's Tally choice via name overrides.)
- **Opening balances in the file:** when the export range does not start at the shop's first entry, the exporter emits each ledger's opening balance (`OPENINGBALANCE` on the master) derived from entries before the range — Tally needs it, our journal must never store it (§4.5). This is the export's job, and it is derived fresh per export.
- XML is built by a small escaping builder in `lib/tally.ts` (no library); the company name comes from settings (`SVCURRENTCOMPANY`); the file states its target as the common-denominator envelope both TallyPrime and ERP 9 accept. **Honesty note (for PRODUCTION.md):** Tally import dialects vary by version; the export targets the documented common subset and the owner validates with one import — the CSV fallback guarantees the data is never trapped regardless.

---

## 6. RBAC & rules

### 6.1 Verification against the pre-declared matrix

The five Phase D rows in `lib/permissions.ts` (written in A3, from Phase A design §3.2) were re-read against this design's surfaces:

| Matrix row | O / M / C / A | Phase D surfaces it governs | Verdict |
|---|---|---|---|
| `staffDirectory` | F / F / N / R | Employee CRUD/deactivate, attendance register | ✓ with G-D1 |
| `payroll` | F / R / N / F | Run compose/finalise/reverse, payments, advances, slips, unassigned bucket | ✓ with G-D2 |
| `loans` | F / R / N / F | Loan register, drawdown, charge accrual, repayments | ✓ sufficient |
| `fiscalClose` | F / N / N / N | FY close + reopen | ✓ sufficient |
| `trialBalanceExports` | F / F / N / F | Trial balance (already shipped under `finance`-adjacent gating — see G-D4), Tally + journal CSV export | ✓ with G-D4 |

**Gaps & resolutions (flagged, none blocking):**

- **G-D1 — attendance marking is a manager's daily chore, but the row also guards salary structures.** `staffDirectory` write (owner/manager) covers both the register (daily, operational) and employee terms (sensitive, rare). Splitting them (a separate `attendance` row) was considered; the matrix is the owner's approved A3 encoding and Phase D does not relitigate it for a one-screen convenience — the manager who marks attendance is, in the target shops, the same person who maintains the directory. The cashier's `none` is the real friction (counter staff often mark the register): recorded as Open Question Q2 with the one-cell flip costed, default = matrix stands.
- **G-D2 — the manager's `payroll: read` includes salary figures.** A manager can view runs and slips (needed: they hand out the slips and answer staff queries at the counter) but cannot compose, finalise, pay or reverse. Salary visibility for managers is therefore a deliberate matrix decision the owner already made in A3 — stated here so the D2 UI does not "helpfully" hide slips from managers and break the row's meaning.
- **G-D3 — payroll/loans writes by the accountant move real money, and rules must let their batches land.** The accountant's payment batch writes: the `payrollRuns`/`loans` doc (event append), the `journal` doc, and nothing else (money accounts are derived — no account doc is written). Rules therefore gate the two collections' **update** to owner/accountant (the `payroll`/`loans` full roles), create to owner/accountant (runs; loans), while journal create remains any-role as since v3 (every role posts what its work creates). The accountant cannot touch `employees` terms (directory write is owner/manager; the accountant reads them — their runs snapshot terms they did not set, which is the correct separation of duties and worth saying aloud).
- **G-D4 — trial balance's existing gate.** The shipped trial-balance report rides the Reports workspace gate (`can(role, "finance", "view")` — cashier out, accountant in), which is *narrower* than `trialBalanceExports` (manager in both; accountant in both; they agree except that the reports gate is the finance row). Resolution: leave the shipped report exactly as gated (it is a Finance-family report among 14), and gate the **export actions** (Tally XML, journal CSV) on `trialBalanceExports` as the matrix intends. No row changes; the distinction is recorded so nobody "aligns" them later by accident.

### 6.2 Rules additions (additive, v6 style — drafted here, not yet applied)

Same posture as B §6.2 / C §6.2: reads narrowed where salary data demands it (the journal-read precedent — not everything is `canAccess`); updates/deletes never period-gated; the A5 create-guard applies only where a create posts money.

```
match /employees/{id}        read: hasRole(owner, manager, accountant)
                             write: hasRole(owner, manager)      (terms & directory)
match /attendance/{id}       read: hasRole(owner, manager, accountant)
                             write: hasRole(owner, manager)      (the register)
match /payrollRuns/{id}      read: hasRole(owner, manager, accountant)
                             create: hasRole(owner, accountant) && createInOpenPeriod
                             update: hasRole(owner, accountant)  (event appends + status;
                                              a create's period guard covers the accrual —
                                              payment events are updates whose JOURNAL create
                                              carries the guard; see note)
                             delete: isOwner   (drafts only — the store enforces;
                                              rules mirror the posted-record posture)
match /loans/{id}            read: hasRole(owner, manager, accountant)
                             create: hasRole(owner, accountant) && createInOpenPeriod
                             update: hasRole(owner, accountant)
                             delete: isOwner   (never-used loans only, store-checked)
```

Note on payment-event updates: a payroll payment appends to `payrollRuns.payments` (an update, not period-gated, per doctrine) while its journal entry is a **create** that passes `guardPostings` + the rules' journal guard — so a payment dated into a locked period is refused by the journal leg and the batch fails whole. The doctrine holds without a special case; the note exists because the run doc's update alone would have been a hole. `employees`/`attendance` are deliberately NOT readable by cashiers at rules level (salary terms are not counter data) — the first Phase D narrowing of reads, following the journal read-gate precedent exactly. The FY close writes: one journal create (guarded), one `periods` create + the owner doc's `lockedThrough` — both already owner-only surfaces in v6; **no rules change is needed for §4 at all**, which the D4 rollout note should say.

### 6.3 Numbering — two new series

| Series | Prefix (default) | Document | Minted |
|---|---|---|---|
| Payroll run | `PAY-` | `payrollRuns` | At **finalise** (drafts burn no numbers — B §1.3 doctrine; `PR-` was taken by production orders in C4, hence `PAY-`) |
| Loan | `LN-` | `loans` | **At creation** (born numbered — the number goes on the signed agreement; the jobs precedent, C §5.1) |

Both join the `SeriesId` union additively; prefixes are owner-overridable via `docSeries` like every series. The §1.3 max+1 mechanism and its honest concurrency note apply unchanged. The FY close takes no series — its identity is the FY label (`FY 2026-27`) + the periods doc id, and its voucher number in exports is that label.

### 6.4 New journal refTypes (additive union members)

`"payroll_accrual"` · `"payroll_payment"` · `"salary_advance"` · `"loan_drawdown"` · `"loan_charge"` · `"loan_repayment"` · `"fy_close"`. (Declaring all seven in D1 — type-only — follows the A1/C1 pattern: later increments post them without union churn in shipped clients.) One new account code: **`loans_receivable`** (§3.1), declared in D1's registry pass with `since: "D"`.

---

## 7. Period-lock & tax interplay

- **Locks gate Phase D postings exactly as all postings**: accrual, payment, advance, drawdown, charge and repayment entries pass `guardPostings` (store) + the rules journal backstop, dated at their real instant — never backdated into a closed period. A payroll run **for** a locked month composes and finalises with **today's** date (the A5 correction-dating doctrine: the liability is recognised when the desk posts it; the run's `month` field, not the entry date, declares which month it pays for). This will be a normal case, not an edge: shops routinely finalise October's payroll in November.
- **Attendance and drafts ignore locks** (non-posting documents, B §7 doctrine) — marking last month's register inside a locked period asserts no money fact.
- **The FY close is the lock's own act** (§4.3): it sets `lockedThrough` in its batch and its entry is dated the FY's last day, admitted by composing against the pre-close lock state (recorded in §4.3 so implementation designs it, not discovers it).
- **Tax**: payroll and loan charges never touch `tax_payable`/`tax_input`. A loan charge is `expense_finance`, full stop — if an owner's lender withholds tax on charges, that withholding is the §2.5 deferred conversation, not a Phase D template. Salary paid through the **Expenses `salary` category** (the pre-D path) remains available for casual labour **not** in the directory; the design states the discipline the desks must observe — a person on payroll is paid through payroll, or their expense double-counts — as a UI hint on both surfaces (the B G-2 "stated discipline" pattern; the store cannot distinguish a casual labourer from an employee, and pretending otherwise would be a false guard).

---

## 8. i18n — new dictionary-key categories (enumerated, not written)

The typed-dictionary mechanism makes EN/UR parity a compile error if broken; all Phase D UI strings go through it — no hardcoded strings in either language, per the standing purity rule. New part file **`hr.ts`** (staff/attendance/payroll) + extensions to `fin.ts` (loans summary, FY close, exports) — estimated ≈ 210–260 keys:

- **Staff directory** (~35): screen/field labels (name, phone, designation, join date, pay basis monthly/daily, base amount, allowances, paid leave days, linked login, active), actions (add/edit/deactivate/reactivate), position labels (owed to employee / advance outstanding / settled), advance action + confirm, delete-blocked note.
- **Attendance** (~20): month navigation, mark labels (present/absent/half/leave/off) + cycle hint, per-row summary labels, posted-run warning, register help.
- **Payroll** (~60): run composer (month, recompute, override hints), line columns (days, earned base, allowances, deductions, gross, net), finalise confirm + one-run-per-month refusal, reverse action + confirm, payments (pay, method/account, negative-balance warning reuse), advance recovery display, unassigned-bucket card + pay action, slip labels (all §2.7 lines incl. signature), status labels, the §7 casual-labour hint.
- **Loans** (~45): register labels (direction, party, principal, charge type none/flat/reducing/fee, rate, instalments, dates), neutral charge vocabulary ("charge", "اضافی چارج") per §3.2, schedule columns, due/accrue actions + confirms, repayment (split display), outstanding/settled labels, Finance breakdown labels.
- **Fiscal close** (~35): FY picker + label, checklist item labels + gate/warning states, closing summary (from the entry), retained-earnings result, reopen + confirm + stack-order refusal, opening-balances panel + the §4.5 explainer, closed-year P&L note.
- **Exports** (~15): Tally XML + journal CSV actions, range labels, ledger-name override fields, the §5.3 dialect honesty note.
- **Account labels**: `fin.acct.loans_receivable` (EN+UR) — the one new code; all four pre-declared D accounts already carry labels from Phase A.

Journal memos remain data-layer English strings (the documented residual — Finance localizes their structured parts), with Phase D memos following the existing memo style.

---

## 9. Implementation order — increments D1…D5

Five increments, each independently shippable (distinct zip, PRODUCTION.md update, finance-audit checkpoint), in dependency order: declarations → people → payroll → loans → close → export. (D5's exports read only the journal and could technically ship any time after D1; they sit last because the FY close's `fy_close` voucher mapping completes the export's refType table.)

### D1 — Declarations, employees & attendance (no postings)
- Types: `Employee`, `AttendanceMonth`, `PayrollRun` (+ lines/events), `Loan` (+ events); `SeriesId` += `payrollRun`, `loan`; `JournalRefType` += the seven §6.4 members (declared, unposted); COA registry += `loans_receivable` (`since: "D"`) + `fin.acct.loans_receivable` labels; settings `phaseD?: { hrV1 }` flag + `tallyLedgerNames?`.
- `employees` + `attendance` collections (COLLECTION_NAMES + demo shape, storage v15 → **v16**); directory CRUD/deactivate; the §1.3 register grid; `lib/payroll.ts` pure core: §1.4 proration, §2.2 composition selectors (`employeePosition`, `salaryPayableComposition`).
- **Rules**: `employees` + `attendance` matches (§6.2) — published with this increment (rules-first).
- **Audit checkpoint:** tsc 0; seed harness re-run — frozen identities untouched (no seed journal change; demo additions are directory data only, §10.3); proration fixtures (monthly full/absence-beyond-leave/half-days; daily) reproduce hand-computed figures; composition selector over a synthetic journal with C4-style null-ref accruals + employee refs sums to the GL exactly.

### D2 — Payroll runs, payments, advances, slips
- `payrollRuns` collection; composer (attendance → lines → overrides) → finalise (accrual entry) → payments + advances (entries, `outflowPreview` warnings) → reversal paths; slip print; the Staff screen's Payroll tab + employee salary history; Finance `salary_payable` composition line; one-posted-run-per-month guard.
- **Rules**: `payrollRuns` match (§6.2).
- **Audit checkpoint (the phase's heaviest):** accrual entry balances per employee and in total; per-employee position after accrual+payment+advance sequences equals hand-derived figures to the paisa; GL `salary_payable` ≡ Σ employee positions + unassigned bucket after mixed C4-accrual + payroll traffic; advance → accrual → payment-with-recovery leaves position exactly 0; run reversal restores positions (payments standing as advances); a second posted run for a month is refused pre-composition; slip figures == run line + derivation (no third arithmetic); **no-tax/legacy regression**: shops with no employees see byte-identical journal behaviour (Phase D posts nothing until used).

### D3 — Loans register
- `loans` collection; register + detail; `lib/loans.ts`: schedule derivation (even splits, final-absorbs-residual, reducing on schedule), outstanding/events derivation; drawdown (incl. netted fee), charge accrual (desk-confirmed, per instalment), repayments with split attribution; receivable loans charge-free enforced at composition; Finance loans breakdown.
- **Rules**: `loans` match (§6.2).
- **Audit checkpoint:** schedule splits sum to principal/charge exactly for awkward figures (e.g. 100,000 over 7 instalments at flat 10%); drawdown/accrual/repayment sequences keep GL `loans_payable` ≡ Σ outstanding; a fully repaid loan derives outstanding 0 and settles; overpayment refused pre-composition; charge-free loan's journal contains principal lines only; receivable mirror balances on `loans_receivable` and never touches `receivables` (the §3.1 isolation asserted explicitly).

### D4 — Fiscal-year close
- Close screen (in Finance or PeriodsPanel's fiscal section — one surface: Settings' Periods panel gains the FY close card, Finance links to it): FY picker, §4.2 checklist (live-derived), close action (closing entry + periods doc + lock advance, one batch), reopen-by-reversal with the stack rule; opening-balances panel; report builders' `fy_close` exclusion for P&L-type reports (§4.6) with the closing-entry summary view.
- **Rules**: none (§6.2 note) — the rollout note says so explicitly.
- **Audit checkpoint:** closing a synthetic FY zeroes every P&L account (registry-driven set) and lands the exact net in `retained_earnings`; post-close trial balance balances with P&L accounts at 0; P&L report over the closed FY (with exclusion) == the closing entry's own summary == the pre-close P&L, three-way identity; reopen restores all balances to the paisa and unwinds the lock to `prevLockedThrough`; closing a second FY then reopening out of order is refused; hard gates (TB difference, clearing non-zero) block with the checklist showing why; **seed/legacy regression**: a shop that never closes sees no behaviour change anywhere.

### D5 — Tally export + journal CSV
- `lib/tally.ts`: mapping table (§5.2) + name overrides, party/employee ledger generation, opening balances per master, voucher conversion per §5.3, XML builder + escaping; journal CSV via `lib/csv.ts`; export UI in Finance + Reports (range picker, `trialBalanceExports` gate); Settings ledger-name overrides.
- **Audit checkpoint:** exported XML parses (well-formed) for the seed journal + a synthetic journal exercising every refType; per-voucher Dr == Cr in our terms before conversion; every account code in the synthetic journal maps (no unmapped fallback); party-ref'd lines land on party ledgers, unref'd on control; opening balances in the file == derived pre-range balances; CSV rows == journal lines for the range. (Tally itself is not available in this environment — the checkpoint is structural, and §5.3's honesty note covers the live import validation, which is the owner's one-time check.)

### Phase-end finance-integrity audit checklist (Phase D close — all must pass)
- Frozen seed identities intact; full harness green (existing suites + D1–D5 suites).
- Every Phase D template's entry balances (makeEntry) and passes `guardPostings`; no new posting route exists (grep-level proof, as prior phases).
- GL ≡ subledger identities: `salary_payable` (§2.2), `loans_payable`/`loans_receivable` (§3.3), all pre-existing identities from Phases A–C re-asserted unchanged.
- Append-only respected: payroll/loan/FY corrections exist only as reversals; no Phase D code path updates or deletes a journal doc.
- Rules diff vs v6 is additive-only apart from the §6.2 matches (no existing line changed).

---

## 10. Migration & compatibility

### 10.1 The `hrV1` step — defaults, not data

Phase D needs the lightest migration of any phase: its collections are **born empty** and absence is meaningful (no employees = no payroll). On owner sign-in, `migratePhaseD` sets owner-doc `phaseD: { hrV1: true }` and nothing else — no documents are created, no journal entries written, no existing doc is touched. The flag exists for the established reason (a future D-increment that *does* need a settings default — e.g. a payroll preference — hangs it here rather than inventing a second mechanism), and so the compatibility story is provable rather than asserted.

### 10.2 Compatibility matrix

| Combination | Behaviour |
|---|---|
| Old app + old rules | Untouched (today's live state). |
| Old app + new rules (D increments') | Must work fully — the §6.2 matches only *add* collections the old app never names. Rules-first remains safe. |
| New app + old rules | New collections denied by the catch-all — hence the standing hard ordering: each increment's rules block publishes **before** its app build (the A §6.2 release gate, unchanged). |
| New app, shop never uses Phase D | Every figure and flow identical to Phase C: Phase D posts nothing until a run finalises or a loan is drawn. The C4 accrual path into `salary_payable` behaves exactly as before; the composition selector merely *describes* it. |
| Shop with C4 accrued production labour | Its `salary_payable` balance appears in the payroll desk's unassigned bucket (§2.2) — described, payable, never moved or re-attributed. |

### 10.3 Seed / demo

Demo seed gains, all with **zero journal footprint**: two sample employees (one monthly, one daily) with current-month attendance marks, one **draft** (unposted) payroll run composed from them, and one **charge-free** sample loan in `active` state with **no events** (a register discoverability aid — its outstanding derives as principal-unpaid with no journal behind it, which the demo tolerates because demo journals are illustrative; in cloud shops a loan is born with its drawdown event or not at all — the store composes drawdown+loan in one batch, §3.4, so a real loan can never exist journalless). `getSeedJournal` is untouched; the frozen identities stand. Demo storage bumps to **v16**.

---

## 11. Risk list

| # | Risk | Severity | Mitigation in this design |
|---|---|---|---|
| R-D1 | The shared `salary_payable` account (C4 null-ref accruals vs payroll employee refs) confuses a future implementer into "fixing" attribution by editing history. | Medium | §2.2 states the two-bucket composition as an asserted identity; the journal is append-only so re-attribution is impossible by construction; D2's checkpoint asserts the composition over mixed traffic. |
| R-D2 | Payroll deduction gross-up temptation: an implementer posts Dr expense gross / Cr salary_payable net + a deductions line to an invented account, unbalancing or reopening the COA. | Medium | §2.4 works the arithmetic explicitly and mandates the net-accrual construction, with the reasoning recorded (the B §2.5 pattern: kill the plausible wrong design in the design doc). |
| R-D3 | Double-counted salary: an employee paid both via payroll and via Expenses category `salary`. | Medium | §7 states the discipline + UI hints on both surfaces; honestly recorded as a desk discipline, not a guard (the store cannot distinguish casual labour). The employee card's salary history makes the double visible in one glance. |
| R-D4 | FY close composes against stale state (two owner tabs; a posting lands between checklist and close). | Medium | The checklist recomputes inside the close action before composing (§4.2); the batch is atomic; the lock advance is monotonic. Residual multi-tab race is the same class the codebase already accepts for numbering (§1.3/B §1.3 honesty). |
| R-D5 | Reopen misuse: owner reopens a closed year to "fix" a figure, then forgets to re-close, leaving an unlocked audited year. | Medium | Reopen is owner-only, writes its own audit doc, and the FY-close screen shows any closed-then-reopened-unclosed year as an open item on the checklist until re-closed. The reversal discipline means even misuse leaves a full trail. |
| R-D6 | Tally dialect drift: a Tally version rejects the export's envelope details. | Medium | Common-denominator target + structural harness checks (§9 D5) + CSV fallback guarantees the data is never trapped; the honesty note (§5.3) sets the owner's expectation of a one-time validation import. |
| R-D7 | Charge vocabulary misread — a user mistakes the neutral "charge" framing for an endorsement, or a reviewer mistakes its presence for riba promotion. | Low | §3.2: default is none; charges post only as deliberate desk-confirmed events; receivable lending is charge-free in v1; the design's reasoning is on the record for the owner (Q1) rather than buried. |
| R-D8 | Attendance edits after a posted run confuse a reprint (register changed, slip didn't). | Low | Slips print from run snapshots (§2.7); the register warns on posted months (§1.3); the slip, not the register, is the pay record. |
| R-D9 | Salary data exposure: staff with broad collection reads see colleagues' pay. | Low | §6.2 narrows `employees`/`attendance`/`payrollRuns`/`loans` reads to owner/manager/accountant at rules level — cashiers are excluded server-side, not merely UI-hidden. |

---

## 12. Decisions by precedent vs open questions; what Phase D does NOT do

### 12.1 Settled by precedent (no owner input needed — recorded so they are not re-litigated)

- **Employees are a separate collection** with an optional informational login link (§1.1) — the login-staff model cannot carry non-login workers, and payroll cannot live on the owner doc the accountant may not write.
- **All balances derive** — employee positions and loan outstanding are journal derivations with operational diaries (events) for attribution, the A §1.1 / B §4 / C §4.2 pattern in its fourth and fifth applications.
- **Net accrual for payroll** (§2.4): reducer deductions never enter the journal; slips carry the gross-to-net story.
- **Advances ride `salary_payable` with the employee's ref** — not the customer khata (F-6 isolation) and not an expense.
- **Receivable loans get one additive code** (`loans_receivable`) rather than polluting `receivables` (§3.1) — Phase A's additive-COA discipline.
- **No opening entries at FY close** (§4.5): the journal is continuous; openings are derived, and exist as *data* only inside Tally export files.
- **Notes/vouchers precedent for slips**: the salary slip prints the posting's own records (run snapshot + derivation) and stores nothing of its own (B §5.1's "the receipt is a print of the row").
- **The trial balance is already shipped**; Phase D consumes it (§4.2) and does not rebuild it.

### 12.2 Open questions (owner's call genuinely needed — recommendations given)

- **Q1 — Charged lending (receivable side).** V1 makes receivable loans charge-free (§3.2 rule 3). *Recommendation: accept for v1.* If the owner later needs charged lending recorded, it deserves its own increment with a `finance_income` code and the same explicitness rules — not a v1 field. (Payable-side charges, which are the owner's real-world borrowing costs, are fully in v1.)
- **Q2 — Cashier attendance marking.** The pre-declared matrix gives cashier `staffDirectory: none`, so counter staff cannot mark the register. *Recommendation: keep the matrix for v1* (manager marks attendance in the target shops); if the owner's own shop works otherwise, `staffDirectory.cashier: "none" → "full"` is a one-cell matrix + rules change that D1's rollout note will explicitly offer — the C5/G-C4 pattern.
- **Q3 — Payroll period = calendar month.** Attendance docs and runs are calendar-month shaped (§1.3, §2.3). Shops paying mid-month-to-mid-month would need period-shaped runs. *Recommendation: calendar month for v1* (it matches the attendance grid, the P&L month, and Pakistani salary practice); a custom pay-cycle is a D-follow-up if the owner names a real shop that needs it.
- **Q4 — Statutory withholdings (income tax / EOBI / ESSI).** Deferred in §2.5: modelling them needs liability code(s) + an authority-payment flow. *Recommendation: ship v1 without them* (reducer model); add as a designed increment if the owner's businesses actually remit through the app. Until then, an owner who withholds records the remittance as an ordinary expense when paid — visible, if not subledgered.
- **Q5 — Advance ceiling.** V1 warns only via the money-account guard; an employee's advance position may exceed a month's salary. *Recommendation: no hard cap* (owner knows his staff), but the employee card shows advance-vs-monthly-base as a ratio so excess is visible at a glance. Owner's call if he wants a soft warning threshold.
- **Q6 — Loan charge accrual timing.** §3.4 accrues charges per instalment as they fall due (desk-confirmed). The alternative — accruing the whole flat charge at drawdown — front-loads expense and was rejected on matching grounds. *Recommendation: per-instalment*, as designed; flagged because some owners' accountants prefer full accrual for flat charges, and switching later is a template change, not a data migration (accruals already posted stand; future instalments follow the new rule).

### 12.3 What Phase D deliberately does NOT do

- **No piece-rate payroll, no overtime engine, no leave-encashment** — attendance marks + the two pay bases cover the roadmap's promise; richer HR is a later phase's design, not a v1 field pile.
- **No loan write-offs/waivers** (§3.4): they need gain/loss codes and a settlement doctrine of their own; v1 loans settle by repayment or stay active with a note.
- **No employee self-service or employee logins** — slips are printed by the desk (matrix-gated); the `linkedUserEmail` link grants nothing.
- **No change to the Flutter app (Phase F)** — but nothing here is web-specific: `employees`/`attendance`/`payrollRuns`/`loans`, the ref conventions and the close/export builders are data-layer contracts the Flutter client will consume as-is.
- **No rewrite of any live journal, ever** — including the C4 accruals' missing refs (§2.2): they are described by the composition selector, never re-attributed.
