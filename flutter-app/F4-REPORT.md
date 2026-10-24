# Phase F · F4 — Flutter HR/finance close + settings editors: completion report

Design: `~/workspace/ai-dukaan-ai/ERP-PHASE-F-DESIGN.md` §F4.
Web semantics: `ERP-PHASE-D-DESIGN.md` (staff/payroll/loans/FY close/Tally) and
`ERP-PHASE-E-DESIGN.md` §1–§3 (print design, brand assets, Raast).
Method: fixtures first, pure Dart cores, store actions mirroring web
`StoreProvider.tsx`, UI last. Nothing below claims a build, CI run or device
behaviour that was not observed in this environment.

## Verification (all observed, 2026-10-23)

| Gate | Result |
|---|---|
| `flutter analyze` | **No issues found** |
| `flutter test` | **185/185 passed** (125 inherited F1–F3 + 30 F4 fixture + 30 F4 core) |
| TS harness (`node harness/harness.js`) | **1,389/1,389 — ALL SUITES GREEN** |
| F1 fixture md5 | `cfad6131345760fb0fe6591866b8dae1` — unchanged |
| F2 fixture md5 | `f77ad00a370f603bf519c3f7f1ae935d` — unchanged |
| F3 fixture md5 | `251239926c3bc8c7e5665007e369bd37` — unchanged |
| F4 fixture md5 | `02fa26efdf65f3be9c511948bd7bbc1d` — new |
| i18n drift gate (`tools/gen_l10n.mjs`) | **clean** — regenerated `strings.dart` + `permissions_data.dart` byte-identical; 2,580 keys EN ≡ UR |
| Dictionary keys added by F4 | **0** — the web dictionary already carried every F4 label |
| Label audit | every static `raw('…')` key used by the new screens resolves in the generated dictionary (EN + UR); dynamic families (pay.status.*, loan.state.*, loan.ev.*, settings.series.*, fin.fy.check.*, print.raast.err.*) hand-verified |

## Fixtures (fixtures-first, house pattern)

`harness/fixtures-export-f4.js` (additive; imports the real web libs) →
`harness/fixtures/f4-core.json`: **8 scenarios, 49 composed entries**.
Exporter self-checks: the §2.2 salary-payable identity at every checkpoint,
loan diary ≡ journal at every step, whole-fixture trial balance = 0, Tally
totals ≡ the range trial balance. Scenarios:

- **S1 payroll cycle** — advance → unassigned (C4-style, null-ref) production
  accrual Rs 400 → PAY-1 (emp-a net 30,500) → payments → bucket settle; final
  composition all-zero; emp-a figures netAccrued 30,500, advanceBefore 15,000,
  cashPaid 15,500, advanceRecovered 15,000.
- **S2 payroll reversal** — position +25,000 stands after the accrual mirror;
  the re-run absorbs it.
- **S3 flat loan** — 100,000 @ 10% over 7: principal parts by cumulative
  allocation **[14285.71, 14285.72, 14285.71, 14285.72, 14285.71, 14285.72,
  14285.71]** (the design doc's comment "×6 + 14285.74" is the naive split and
  is NOT what either runtime produces — the fixture pins the real one); charge
  parts [1428.57 ×3, 1428.58, 1428.57 ×3]; settles to zero.
- **S4 fee-netted drawdown** — Dr money P−F + Dr expense_finance F / Cr
  loans_payable P, fee diary event sharing the drawdown entry.
- **S5 reducing loan** — charges [1200, 900, 600, 300]; outstanding 45,900.
- **S6 receivable loan** — charge-free; outstanding 15,000; overpay refused.
- **S7 fiscal close cycle** — checklist gates pass; warnings
  [draftPayroll, productionPools] acknowledged; salary GL 30,000;
  stockDivergence −78,500 (info); closing summary net 33,000 ≡ P&L net
  (revenue 120,000, COGS 45,000, expenses 42,000); stack blocker against the
  later FY; 7 balance-sheet opening rows identical pre/post close.
- **S8 Tally** — model deep-equal, **XML byte-for-byte, CSV byte-for-byte**;
  the XML re-parses in Dart and reconciles to the trial balance
  (totals 76,500 = 76,500; 13 masters; 10 vouchers).

`test/f4_fixtures_test.dart` (30 tests) asserts the above against the Dart
cores byte-for-byte, plus ops coverage (terms-error matrix, IBAN cases, Raast
payloads bare + TLV with round-trip parse, branding plans, payroll/fiscal
edges, register totals). `test/f4_core_test.dart` (30 tests) covers proration
edges, ordinal charge discipline ([+,−,+] charge events net
`accruedChargeCount` to 1), split validation, fiscal close-state edges,
branding cap refusals + ladder walk/refusal with figures, Raast guards
(FI-name, amount overflow, tampered CRC — `crc16CcittHex('123456789') ==
'29B1'`), Tally naming/CSV quoting, and the makeEntry imbalance throw.

## What shipped

### Pure Dart cores (`lib/core/`)
- `payroll.dart` — attendance month cycle/summary, §1.4 proration,
  `employeePosition`, `salaryPayableComposition` (GL ≡ Σ employees +
  unassigned bucket), run-line building/totals, `paidForRun`,
  `positionBeforeEntry`, `runLineFigures`, and the accrual / payment /
  advance / mirror entry builders.
- `loans.dart` — terms refusal matrix (incl. charged receivable lending),
  charge amounts, cumulative-allocation `splitEvenly`, schedule, position,
  journal-side position (diary ≡ journal), ordinal `accruedChargeCount` /
  `nextChargeAccrual`, instalment states, repayment split default + error,
  register totals, drawdown/charge/repayment builders.
- `fiscal.dart` — P&L/BS account sets (typed via the `AccountType` enum),
  FY label, P&L movements in range, closing/reopen entry builders, closing
  summary, close state, reopen stack blocker, the derived close checklist,
  balance-sheet balances, previous-FY.
- `tally.dart` — the fixed 28-code COA→Tally-group map (names overridable,
  groups never), voucher-type table + directional loan types, the
  party-ledger naming census with ` (2)` collision suffixes, in-file derived
  openings, the export model, XML envelope, journal CSV (JS-style number
  formatting).
- `branding.dart` — slot specs/caps, data-URL facts, fit-within-box, the
  compression ladder (`runCompressionPlan` with a caller encoder), the
  boundary asset guard, per-kind/total byte accounting.
- `raast.dart` — the `RAAST_FRAMING` seam (bare / provisional / pinnedBy
  null — byte-identical posture to the web), IBAN mod-97 validation +
  PK check-digit generation + alias refusal, FI-name validation,
  CRC-16/CCITT-FALSE, amount formatting, bare + TLV P2P payload build,
  full round-trip parser, print-block resolution.
- `types.dart` — `PayLine`, `Employee`, `AttendanceMonth`, `PayrollRunLine`,
  `PayrollPaymentEvent`, `PayrollRun`, `LoanEvent`, `Loan`, `PeriodDoc`,
  `BrandingAsset`; `ShopSettingsView.tallyLedgerNames`; `TaxSlab.toMap` +
  `copyWith`; `MoneyAccount.copyWith`.

### Store (`lib/data/store.dart`)
Subscriptions added for `employees`, `attendance`, `payrollRuns`, `loans`,
`periods`, `branding`. Actions (all gated by the web RBAC rows, all postings
through the guard, doc+entry in ONE batch):

- **Employees/attendance** (`staffDirectory`): add (blank name refused;
  allowances filtered/clamped; email lowercased), save (name never blanked),
  activate/deactivate, delete REFUSED while cited by attendance / run lines /
  loans / journal refs; tap-to-mark attendance writes with the
  `att_<emp>_<month>` doc id.
- **Payroll** (`payroll`): idempotent compose (existing draft returned),
  draft save re-deriving every line through `payrollLineTotals`, owner-only
  draft delete, finalise (PAY- minted; one posted run per month; ONE net
  accrual entry), payment with derived caps (line balance or the unassigned
  bucket), payment reversal (mirror + negative diary event), run reversal
  (payments stand as advance positions), salary advance (posts only; recovery
  derived, never posted).
- **Loans** (`loans`): born-drawn create (terms refused up front; fee event
  shares the drawdown entry), ordinal charge accrual (nothing posts
  unconfirmed), repayment with desk-editable split validation, event reversal
  by mirror with drawdown stack discipline (loan reads cancelled), owner-only
  delete of event-free loans.
- **Periods / fiscal close** (`periods` / `fiscalClose`, owner-only rows):
  close/reopen with the web's ordered refusal reasons; FY close recomputes
  the checklist inside the action, posts ONE `fy_close` entry + audit doc +
  lock advance in one batch; reopen restores the pre-close lock from the
  close doc. **No opening entries — ever.**
- **Settings**: `updateSettings` (staff fields can never move through it),
  staff & roles (owner doc + `staffIndex` in one batch), money accounts
  (one-default-per-method stealing, legacy accounts rename-only, kind/method
  compatibility), tax slabs with the derived-defaults reconciler (settings
  pointers are the truth; slab flags rewritten in the same batch), branding
  asset set/remove (owner-only, doc id pinned to the slot kind).

**Firestore rules: no new version needed** — rules v7 (Phase D) and v8
(Phase E) already carry match blocks for all six collections; the app
writes under the same shop tree.

### UI (`lib/features/`)
- `staff.dart` — Staff module (nav, `staffDirectory` view-gated): directory
  with positions + profile dialog (terms form, position, salary history,
  advance), attendance grid (month stepper, tap-to-cycle marks, per-employee
  summary, posted-run warning), payroll (run list, compose, draft line
  editor for allowances/deductions, finalise confirm, run detail with
  per-line figures, pay/reverse dialogs, bucket card + bucket payment,
  run reversal, owner draft delete, salary slip with PNG capture + text
  share).
- `loans.dart` — Loans module (`loans` view-gated): register with direction
  filter + register totals + overdue count, create form (receivable forces
  charge-free, terms errors surfaced before submit), detail (position,
  schedule with derived states, event diary with per-event reversal,
  next-charge accrual confirm, repay dialog with editable split +
  split-error message, owner delete).
- `settings.dart` — Settings module (always visible; sections role-gated):
  account card, profile, money accounts (+ transfer via the F1 store
  action), tax slabs (+ defaults), document numbering (13 series), **job-stage
  list editor (the F3 carried item — add/remove/reorder)**, print-design
  editor (all 18 resolved fields + live `ReceiptView` preview on a sample
  bill), brand-asset slots (file_picker → `image` encode →
  `runCompressionPlan` → boundary guard; over-cap refused WITH FIGURES),
  Raast card (IBAN validation + grouped display, FI-name validation, the
  PROVISIONAL note verbatim), period locks (history + PIN-gated
  close/reopen), fiscal-year close (FY picker, live checklist with
  gate/warning states, warnings acknowledgement, PIN-gated close/reopen,
  closing summary, openings panel with the no-opening-entries explainer),
  staff & roles, Tally ledger-name overrides (names only — groups shown
  read-only).
- `finance.dart` — overview gains the salary-payable composition breakdown
  (bucket / owed / advances) and the loans register totals, plus the
  **export card** (`trialBalanceExports` view-gated): current/previous FY
  range, model summary, Tally XML + journal CSV (UTF-8 BOM) via share, with
  the §5.3 honesty note that real-Tally import validation is the owner's
  one-time check.
- `main.dart` — Staff, Loans and Settings modules registered with the
  web's view gates.

## Wired / partial table

| Feature | Status | Notes |
|---|---|---|
| Employees CRUD + delete-citation refusal | WIRED | web §1.5 semantics |
| Attendance tap-to-mark grid | WIRED | cycle present→absent→half→leave→off→clear; posted-run warning shown (warn-don't-lock) |
| Payroll compose / draft edit / finalise | WIRED | draft editor edits allowances + deductions (earnedBase is the compose-time attendance snapshot, as on the web) |
| Payroll payments / reversals / advances | WIRED | derived caps; bucket payment included |
| Salary slip | WIRED (partial print) | screen slip + PNG capture + text share; no ESC/POS raster port |
| Loans register / create / schedule | WIRED | born-drawn; receivable charge-free enforced in form + core |
| Charge accrual | WIRED | ordinal, proposal-then-confirm; nothing auto-posts |
| Repayment split | WIRED | charges-first default, desk-editable, split errors shown |
| Loan event reversal / delete | WIRED | mirror + diary negation; drawdown stack discipline |
| Period close / reopen | WIRED | PIN-gated (`periodClose` / `periodReopen`) |
| Fiscal-year close / reopen | WIRED | checklist recomputed in-action; PIN-gated; openings panel derived |
| Tally XML + journal CSV | WIRED | byte-for-byte vs web fixtures; re-parse reconciles in tests |
| Tally ledger names | WIRED | names only; groups fixed, shown read-only |
| Money accounts editor + transfer | WIRED | default-stealing, legacy rename-only, kind compatibility |
| Tax slabs editor + defaults | WIRED | derived-flag reconciler |
| Document numbering | WIRED | 13 series prefixes |
| Job-stage list editor | WIRED | F3 carried item closed |
| Print-design editor + preview | WIRED | all 18 resolved fields; preview renders the owner's saved design |
| Brand assets | WIRED (partial encode) | caps hard; WebP ladder steps encode as PNG (the `image` package has no WebP encoder) — an image only WebP could squeeze under a cap is refused here, with figures |
| Raast settings | WIRED | bank-image path preferred; generated-P2P stays **PROVISIONAL** — the E3 owner fixture (bank-app QR screenshot) is still open, exactly as on the web |
| PIN gating | WIRED | reuses the F1 `runSensitiveGate` for period/fiscal close + reopen |

## Inherited wart (not F4 scope)

`main.dart`'s sync chip labels itself with `raw('sync.online')`, a key the
dictionary does not carry (the F1 report already flags the sync centre as an
app-only surface). It predates F4 and is untouched here.

## Not done / not claimed

- No APK/AAB build (the known local Gradle↔Java hang); no CI run; no device
  behaviour observed. Proof is analyze + `flutter test` + the TS harness, as
  briefed.
- No GitHub push attempted (parked by owner decision).
- F5 (hardening + distribution) is the next phase.
