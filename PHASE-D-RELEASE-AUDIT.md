# Phase D Release Audit — Dukaan AI (ERP Phase D + shell/theme/polish + five-theme picker)

Independent release audit, 2026-10-22. Nothing taken on trust: the harness
was recompiled from a deleted `out/` and re-run fresh; i18n was counted
independently; the Tally XML was re-parsed with an auditor-written parser;
the payroll/loan/fiscal identities were re-proven on auditor fixtures with
figures that appear nowhere in the harness.

## A. Fresh full verification — ALL GREEN

| Gate | Result |
|---|---|
| Harness (clean recompile, fresh run) | **1,188 passed, 0 failed — ALL SUITES GREEN** (FIN 34 · COA 10 · A2 16 · RBAC 115 · A4 56 · A5 51 · B1 40 · B2 39 · B3 37 · B4 34 · B5 38 · B6 34 · SEARCH 72 · REPORTS 68 · C1 46 · C2 49 · C3 56 · C4 75 · C5 61 · FIX 37 · **D1 38 · D2 48 · D3 50 · D4 44 · D5 40**) |
| Frozen seed (independent probe) | **21 entries · Inventory 272,805 · Cash 50,000 · payables 27,900 · receivables 5,500 · TB difference 0 · SHA-256 e17e5bda…1168** — all exact |
| App `tsc --noEmit` | **0 errors** |
| `npm run build` | **exit 0**, 33 routes incl. `/staff` and `/loans` |
| `npm run build:static` | **exit 0**, bundle refreshed at `web-deploy/` |
| Bundle identity | `dukan-8246` present; **'Demo' tokens 26 == baseline** |
| i18n (counted independently from the compiled dictionaries) | **EN 2,406 ≡ UR 2,406** — 0 missing either direction, 0 empty values |

## B. Targeted re-checks — ALL PASS

1. **D2 payroll identity (auditor fixtures, 52-probe suite, own figures):**
   over advance (6,000) → C4-style ref-less accrual (7,500) →
   payroll accrual (monthly 45,000 + 2,000 allowance, 750 fine) →
   partial payment (15,000) → bucket payment (7,500) → run reversal,
   **GL `salary_payable` ≡ Σ employee positions + unassigned bucket
   after EVERY step**, and the trial-balance closing for the account
   equals the composition GL at every step. The 750 reducer and the
   run gross (70,548.39) appear **nowhere** in the accrual entry;
   the bucket payment's debit line carries **no ref**, as designed.
2. **D3 loans:** a charge-free loan (60,000, 6 instalments) snapshots
   charge 0, every schedule charge part 0, and its whole lifecycle
   journal carries **zero charge entries and zero `expense_finance`
   lines**; GL position == diary outstanding (50,000 after a 10,000
   repayment). Fee-netted drawdown verified to the shape:
   Dr money 77,000 + Dr `expense_finance` 3,000 / Cr `loans_payable`
   80,000. Charged receivable lending is **refused at terms**.
   Receivable isolation: after a 25,000 receivable drawdown,
   `receivables` == 0 while `loans_receivable` == 25,000.
3. **D4 fiscal close:** three-way identity on an auditor FY journal
   (revenue 100,000, COGS 60,000, rent 10,000, salary 8,000,
   finance charges 2,000): pre-close P&L net 22,000 == post-close
   P&L net (fy_close excluded) == closing-entry summary net 20,000
   **+ the stated 2,000 `expense_finance` delta**; every P&L account
   zeroed inside the closed FY; retained earnings credited exactly
   the summary net. Stack discipline: reopening FY26 while FY27
   stands closed is blocked by the FY27 close; after FY27 reopens,
   FY26 unblocks. **Rules file SHA-256 `3cae3c76…42c` is exactly
   the value the D4 suite pins as the D3-state file** — the rules
   have not moved since D3.
4. **D5 export:** the seed journal's Tally XML was re-parsed with an
   independent stack parser: well-formed, exactly **21 vouchers**,
   every voucher Dr == Cr in the file's own numbers, and the file's
   total debits **1,517,173 == the trial balance's total debits**;
   no manufactured openings. Seed CSV data rows **73 == journal
   lines 73**. A synthetic mixed period (capital/purchase pre-range;
   bill, repayment, loan drawdown + repayment, payroll accrual
   in-range) exports 5 vouchers whose re-parsed totals reconcile
   to the period trial balance (170,000), with mid-journal opening
   balances generated in-file and netting to zero.
5. **Themes/shell:** all five `[data-theme]` token blocks present
   in the built CSS — `emerald`, `midnight`, `ocean`, `sand`,
   `dusk`. Source check: `AppShell`'s top header carries the
   LangToggle, the ThemeToggle picker, the account block and
   logout; `Sidebar.tsx` contains **no** footer/logout/toggle
   block (navigation only). Legacy theme-value migration present
   in `ThemeToggle.tsx` ("light" → emerald, "dark" → midnight).
6. **Rules v7:** source `firebase/firestore.rules` (577 lines)
   diffed against v6 (497): **one contiguous insertion, 80 lines
   added, 0 changed, 0 deleted** — exactly the D1 (employees,
   attendance), D2 (payrollRuns) and D3 (loans) blocks.
   Saved byte-identical to source as rules v7.

## C. Deliverables

- 📦 `~/workspace/dukaan-ai-ERP-D.zip` — **1,750,287 bytes,
  245 files**, SHA-256 `7f7bc8a7…938`; `index.html` at root;
  markers verified in the actual zip bytes (dukan-8246,
  payrollRuns ×5 files, fy_close ×4, loans_receivable ×5,
  Tally strings ×4, all five data-theme blocks, Demo tokens 26;
  route dirs incl. `staff/` and `loans/`). Contains everything
  through Phase D + shell/theme/polish + the five-theme picker —
  **supersedes dukaan-ai-ERP-C.zip**.
- 📜 `~/workspace/your_files/dukaan-firestore-rules-v7.txt` —
  577 lines, SHA-256 `3cae3c76…42c`, byte-identical to source.

## Rollout for the owner (supersedes the ERP-C instruction)

1. **Publish rules v7 first** (Firebase Console → Firestore →
   Rules → Publish) — purely additive over v6 (+80 lines,
   nothing changed or removed), safe ahead of the build.
2. **Upload only `dukaan-ai-ERP-D.zip`** to the dukaan-ai
   subdomain root — do not upload the older zips.
3. **Purge the hPanel cache.**
4. **Smoke test:** sign in → Staff (directory + attendance) →
   Payroll tab (draft run, slips) → Loans register → Finance
   (FY-close panel + Tally export download) → header theme
   picker: switch through all five themes (Emerald Calm,
   Midnight Slate, Ocean, Warm Sand, Dusk Violet) in both
   languages.
