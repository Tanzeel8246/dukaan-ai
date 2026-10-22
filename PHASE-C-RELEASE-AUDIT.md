# Dukaan AI — Combined Release Audit: Phase C + UI/UX Overhaul + Live-Audit Fixes

**Date:** 2026-10-22 · **Auditor:** independent release audit (this pass re-ran
everything from a clean state; no prior report was taken on trust)
**Release package:** `~/workspace/dukaan-ai-ERP-C.zip`
**Rules:** `~/workspace/your_files/dukaan-firestore-rules-v6.txt`
**Supersedes:** `dukaan-ai-ERP-B.zip` and `dukaan-ai-REPORTS.zip` — this single
package contains Phase B + Reports + Phase C (C1–C5) + the UI/UX overhaul +
the live-audit fixes. The earlier "upload REPORTS zip + rules v5" instruction
is superseded by this release.

---

## A. Fresh full verification — ALL GREEN

| Gate | Result |
|---|---|
| Harness (clean rebuild of `harness/out`, then run) | **968 passed, 0 failed — ALL SUITES GREEN** |
| Suite split | FIN 34 · COA 10 · A2 16 · RBAC 115 · A4 56 · A5 51 · B1 40 · B2 39 · B3 37 · B4 34 · B5 38 · B6 34 · SEARCH 72 · REPORTS 68 · C1 46 · C2 49 · C3 56 · C4 75 · C5 61 · FIX 37 |
| Frozen seed identities (asserted in FIN + re-asserted in C1/C2/C4 suites) | journal **21 entries** · Inventory **272,805** · Cash **50,000** · payables **27,900** · receivables **5,500** · trial balance **0** · seed-journal SHA-256 **e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168** — all unchanged |
| App typecheck | `npx tsc --noEmit` — **0 errors** |
| Server build | `npm run build` — **exit 0**, 31 routes (incl. `/stock-transfers`, `/manufacturing`, `/warehouses`, `/jobs`) |
| Static build | `npm run build:static` — **exit 0**, `out/` + `web-deploy/` refreshed |
| Bundle project id | `dukan-8246` present in the shipped chunks |
| 'Demo' tokens (bundle `_next`, the standing measure) | **26 == baseline** |
| i18n (counted independently from the freshly compiled dictionaries) | **EN 1,992 keys ≡ UR 1,992 keys** — 0 missing either way, 0 empty values |

## B. Targeted re-checks

### B1. UX input-repair spot check — PASS
During the UX overhaul a scripted edit damaged 42 `<input>` elements across
7 files (multi-line search inputs in the picker files — BillingDesk,
DocLineEditor, TransfersView, ManufacturingView, SalesRecorder — plus most of
InventoryManager's product form); they were reconstructed from compiled build
chunks. Independent verification this pass:

- **AST census of every `<input>` in `components/`** (TypeScript compiler API):
  **152 elements**. Every one is live-wired — `value`+`onChange`,
  `checked`+`onChange`, a file `onChange`, or an intentional display-only
  field (`readOnly`/`disabled` with a derived value: job stage display,
  BOM output name, production recipe label). **No dead inputs.**
- **Duplicate props are impossible** — TSX duplicate attributes are a
  compile error and tsc is 0.
- **Cross-check vs the pre-C build** (`dukaan-ai-REPORTS.zip` chunks): 47
  sampled pre-Phase-C input ids (`f-name`, `sup-company`, `cr-amount`,
  `bill-sku`, `dc-counted`, `tr-amount`, …) all present in the old chunks —
  and all 47, plus 7 Phase-C/new ids (`job-cname`, `bom-output`, `tr-search`,
  `wh-name`, `rep-from`, …), present in the NEW bundle. Field identity was
  preserved through the repair; nothing looks wrong.

### B2. Phase C semantics — PASS
- **C1** — `stockV1Rows` (lib/stock.ts) is an entry-free annotation migration;
  drift detector + recount repair present (§1.7, transfer-aware). C1 suite 46.
- **C2** — lib/transfers.ts composes journal entries ONLY at the close-short
  loss (plus the C3 reclass builder); dispatch/receive compose nothing —
  journal byte-stillness at dispatch proven by C2 suite 49.
- **C3** — `inventoryAccountFor` class resolver (lib/transfers.ts:285); with no
  raw products the journal is byte-identical to pre-C3 (template-level +
  full-suite regression). C3 suite 56.
- **C4** — WIP pool: GL `wip` == Σ order pools asserted at every step and the
  closing roll-up lands to the paisa (pool zero on final completion). C4
  suite 75. **Boms live-subscription repair present**: StoreProvider.tsx:1533
  `sub<Bom>("boms", …)`.
- **C5** — Job advance rides the existing `addRepayment` (JobsView.tsx:1047,
  citing note); "Bill this job" posts exactly once through `postBill` with
  `sourceType: "job"` (StoreProvider.tsx:6907; the posted bill flips the job
  to delivered in the same path, :2345). **RBAC matrix cell UNCHANGED**:
  lib/permissions.ts:126 `jobTracker: { owner: F, manager: F, cashier: R,
  accountant: R }` — exactly the pre-declared matrix; the cashier
  stage-advance question remains an owner decision, not taken. C5 suite 61.
- Store still composes through exactly **24 `makeEntry(` call sites** (pinned
  invariant intact).

### B3. Live-audit fixes — PASS
- **Revenue identity** — `salesReport` rebuilds the journal's own lines;
  `otherRevenue = P&L netRevenue − netSales` (lib/reports.ts:433) is exposed
  and displayed on screen and in share text whenever non-zero, with
  `plNetRevenue` beside it; for document-only data it is 0 and the two sides
  are EQUAL. FIX suite 37 proves the identity over the seed and a synthetic
  mixed workload (discounted + inclusive-taxed bill paid Rs 1 short, taxed
  counter sale, partial return, voided + held bills) and that a hand-added
  legacy Rs 8,500 journal-only entry surfaces as exactly the labelled line.
- **Journal viewer** — FinanceView carries the expandable journal (per-entry
  ΣDr/ΣCr balance via `entryBalances`); **Trial Balance** is the 14th report
  (lib/reports.ts:607, ReportsView model). Both sit behind
  `can(role, "finance", "view")` → `<PermDenied />` (FinanceView:414,
  ReportsView:201). Read-only.
- **Negative-balance warnings** — `NegativeBalanceWarning` (MoneyAccounts:113)
  wired into Expenses (561), supplier payments (SuppliersManager:998) and
  transfers (MoneyAccounts:313), backed by `outflowPreview` (lib/ledger:384);
  warn-and-confirm, never a hard block.
- **Expense dates** — the register groups and labels by
  `businessDateISO(e.ts)` (ExpensesRegister:378), the same PKT business date
  the journal/cash book carries; FIX suite proves register date == journal
  date == cash-book date for every seed expense.

### B4. Rules v6 — PASS, purely additive
- Source rules (`firebase/firestore.rules`, 497 lines) vs v5 (398 lines):
  **99 lines added, 0 removed, 0 changed** — a single contiguous insertion
  (after line 348) holding exactly the six Phase C match blocks:
  `/warehouses/` + `/stockLevels/` (C1), `/stockTransfers/` (C2), `/boms/`
  (C3), `/productionOrders/` (C4), `/jobs/` (C5).
- Saved as `~/workspace/your_files/dukaan-firestore-rules-v6.txt`
  (SHA-256 78df93ea7f53412bc634da26ab039ab40c33bcf1e110ac99cf02ce2f519b4761,
  byte-identical to the source rules file).

## C. Package — VERIFIED
- `~/workspace/dukaan-ai-ERP-C.zip` — **1,660,274 bytes (1.6 MB), 232 files**,
  SHA-256 59de1a990f2dfa32d750dae1e985fdd910f1c7fac28a08b33a092dfa29476882.
- `index.html` at the zip root; route pages present for billing, finance,
  login, reports, stock-transfers, manufacturing, warehouses, jobs, and all
  other modules.
- Markers verified in the actual zip bytes: `dukan-8246` ×3 ·
  `stockTransfers` ×27 · `trialBalance` present · `otherRevenue` ×12 ·
  picker-era strings `clearSearch` ×19, `billing.inCart` ×15 · 'Demo'
  tokens 26.

## Rollout (owner steps, in this order)
1. **Publish rules v6 FIRST** — paste `dukaan-firestore-rules-v6.txt` into
   Firebase Console → Firestore → Rules → Publish. (v6 = v5 + additive
   Phase C blocks only; safe to publish before the new build is live.)
2. **Upload `dukaan-ai-ERP-C.zip`** — extract into the
   `dukaan-ai.codehubb.com` web root (replacing the previous build). Do NOT
   also upload the older REPORTS/ERP-B zips — this package supersedes them.
3. **Purge the hosting cache** (hPanel → Cache → Purge) so the new bundle
   is served.
4. **Smoke test** — sign in (email/password), then: create a bill via the
   new POS picker (type → click/Enter), open Warehouses, Manufacturing and
   Jobs from the sidebar, check Finance → Journal viewer and Reports →
   Trial Balance. The TEST records from the live test may be deleted.
