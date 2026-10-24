# F3 Completion Report — Dukaan AI Flutter App

**Phase:** F (Flutter apps) · Increment F3 — operations: warehouses,
stock transfers, stock classes + BOM, production, job tracker
**Design:** `../ERP-PHASE-F-DESIGN.md` (§F3 scope), mirroring the
web's Phase C semantics (`../ERP-PHASE-C-DESIGN.md`) exactly.
**Run:** 2026-10-23. Proof standard (as F1/F2): `flutter analyze` +
`flutter test` + the TS harness — local APK builds are blocked on
this VM (Gradle↔Java IPC hang) and the GitHub push is handled by a
separate worker, so no build, CI run or device behaviour is claimed
anywhere in this report.

## Verification (all observed in this run)

| Check | Result |
|---|---|
| `flutter analyze` | **No issues found** |
| `flutter test` | **125/125 passed** — 88 F1/F2 + 16 F3 fixture tests + 21 F3 core tests |
| TS harness | **1,389 passed, 0 failed** ("ALL SUITES GREEN") |
| Fixture byte-stability | `f1-core.json` md5 `cfad6131345760fb0fe6591866b8dae1`, `f2-core.json` md5 `f77ad00a370f603bf519c3f7f1ae935d` — identical before and after; `f3-core.json` regenerates byte-identical (md5 `251239926c3bc8c7e5665007e369bd37`) |
| i18n drift gate | `node tools/gen_l10n.mjs --check` → clean (2,580 keys EN ≡ UR; 40-module matrix) — no dictionary keys added or changed |

## Golden fixtures first (the F1/F2 pattern)

`harness/fixtures-export-f3.js` (new, additive; F1/F2 exporters and
fixtures untouched) exports `fixtures/f3-core.json`: **7 scenarios,
15 journal entries, whole-journal trial balance 0, WIP 0**,
composed by the REAL compiled web libs (stock / transfers / boms /
production / jobs). The Dart suite (`test/f3_fixtures_test.dart`)
re-composes every scenario with the Dart ports and asserts
byte-for-byte equality (memo / refType / refId / lines / events /
statuses), plus an `ops` derivations section (the §1.3 resolution
rule, §1.6 promised/availability partition, in-transit, drift +
recount, transfer composition helpers, BOM derivations, production
desk defaults, job stage lifecycle):

- **transfer-loss-goods / transfer-loss-raw** — TR close-short:
  Dr `inventory_loss` / Cr the class account (`inventory` 130,
  `inventory_raw` 500), shortages derived from sent − received.
- **production-cycle-paid (PR-1)** — issue 9,720 (raw 8,000 +
  sugar 520 + packing 400 + conversion 800 paid from the till)
  → completion 12 = 5,832 (unit cost 486) → scrap 2 = 972 →
  final completion 8 = 2,916 → **pool exactly 0, status
  completed** — the WIP-to-zero identity.
- **production-accrue-overproduce (PR-2)** — conversion accrued
  to `salary_payable`; completing 12 against a plan of 10 is
  final by construction and absorbs the whole 4,860 pool.
- **production-closeout (PR-3)** — partial completion 1,944,
  close-out writes the residual 2,916 off as `production_scrap`.
- **job-materials-cycle (JB-1)** — issues 1,350 split by class
  (Dr `cogs`), a 260 return as the mirror entry, net quantities,
  the pooled advance (2,000, riding credits), and the job profit
  identity (revenue 5,000 − materials 1,090 − bill COGS 4,050 −
  labour 1,000 = **−1,140**).
- **class-reclass** — goods→raw and raw→goods one-entry reclasses
  at on-hand value (20,000 each), plus the null cases (zero
  stock, same class).

`test/f3_core_test.dart` adds the transfer transition truth table,
pool-never-negative construction, every pre-composition refusal
(issue at the order's warehouse only — stock elsewhere is never
reached for; over-return against the job's net position; delivered
jobs refuse materials; zero-value refusals; accrue needs no money
account while paid-without-account refuses), the rows-are-truth
resolution edge, negative-stock reclass mirroring, and the
stage-derivation edges (single-stage list, cancelled stickiness).

## Dart core added (pure, fixture-proven)

- `lib/core/stock.dart` — the §1.3 resolution rule (a product with
  NO rows reads its total at the default warehouse; once ANY row
  exists, rows are the complete truth), `stockV1Rows` (entry-free
  migration derivation), promised/availability partition, drift
  detection + recount (default row absorbs; rows only, no journal).
- `lib/core/transfers.dart` — line remaining/totals, in-transit
  derivations, the §2.4 transition table, route problems,
  duplicate-merging line composition, receive validation +
  application, shortages, the transfer-loss entry, and the class
  reclass entry.
- `lib/core/boms.dart` — per-output versions, the active version,
  next-version numbering, draft validation (output unknown/raw,
  self-component, duplicate, empty, bad batch), batch material
  cost and unit cost.
- `lib/core/production.dart` — pool arithmetic
  (issues − completions − scraps − closeouts), status derivation,
  BOM snapshot + run defaults (round3), `prepareIssue` (values at
  shelf cost at the ORDER's warehouse, split by class, paid /
  accrue settlement), completion + scrap absorption (final
  completion takes the ENTIRE pool → exactly zero).
- `lib/core/jobs.dart` — effective stages from owner settings,
  status derivation, material net quantities, `prepareMaterialEvent`
  (issue/return, job-warehouse + net-position validation), the
  advance note + pooled advance totals, bills/revenue/COGS and the
  job profit figures.

One shared helper was added to `lib/core/ledger.dart`: `fmtQty`
(JS-style quantity formatting — integral values print without
".0") — the F1/F2 suites stay green on it.

## Store + types

- `lib/core/types.dart`: Warehouse gained note/sortOrder/ts +
  toMap/copyWith; StockLevel gained toMap; the F3 types were
  appended (StockTransfer(+Line), Bom(+Line, BomSnapshot),
  ProductionOrder(+Event, EventLine), Job(+MaterialEvent)) in
  house fromMap/toMap/copyWith style. `ShopSettingsView` now
  parses `jobStages` from the owner doc.
- `lib/data/store.dart`: subscriptions for `stockTransfers`,
  `boms`, `productionOrders`, `jobs`. The store's
  `defaultWarehouseId` / `qtyAtWh` now delegate to the pure core —
  this REPLACES the F1 per-pair fallback (a missing row at the
  default warehouse read as the product total even when the
  product had rows elsewhere) with the web's product-level rule.
  `adjustStock` takes an optional warehouse (resolved like every
  other stamp; the movement lands there). `postBill`'s conversion
  switch gained the `job` case: a posted job bill flips the job
  to `delivered` in the same batch (§5.4). All F3 posting actions
  route through the existing `_tryGuard` choke point and one
  WriteBatch per action; role gates use the web matrix
  (`warehouses`, `manufacturing`, `jobTracker`).

## Per-feature state

| F3 feature | State | Notes |
|---|---|---|
| Warehouses CRUD | ✅ Wired | Add/edit (name, note, make-default), set default, archive/restore (the default refuses archiving — `wh.cannotArchiveDefault`), sorted directory with per-warehouse stock value. Warehouses are archived, never deleted (§1.2). |
| Per-warehouse stock view | ✅ Wired | On hand / promised / available / incoming / value per product from the §1.6 selectors; drift banner lists drifted products and the recount button repairs rows only and reports the count (`wh.drift.done`). |
| Stock transfers (TR-) | ✅ Wired | Draft create/edit (route validation, duplicate-merging picks with at-source hints), dispatch (mints TR-, drops source rows, posts nothing, availability re-derived at the source only), receive with per-line arrived quantities (over-receipt refused pre-composition), close-short with the per-line loss confirmation (the ONE posting event), return-to-source, cancel/delete on drafts. In-transit summary chip on the list. |
| Stock classes | ✅ Wired | Inventory product form: class dropdown with the explainer + the reclass note (live amount); a change on an existing product posts the reclass entry FIRST via `store.changeProductClass` (a refusal leaves the class untouched), raw badge on the product list, adjustment dialog gained a warehouse picker. |
| BOM recipes | ✅ Wired | Per-output recipe cards (active version, batch cost), save-as-new-version form (output/batch/labour/overhead/components with validation), version history dialog with the immutability note. Old versions are never edited or deleted (§3.2). |
| Production orders (PR-) | ✅ Wired | Create from an active recipe (snapshot + version stamped, warehouse, planned qty, open-now or draft), draft edit/open/delete, bare-cancel refused once events exist. Detail: planned/produced/remaining, issued/completed/written-off totals, live WIP pool, absorbed unit cost, snapshot lines, full event log. Issue dialog seeds lines + conversion from the snapshot for the run (editable), paid/accrue settlement with account picker, materials + total preview. Completion dialog previews the absorbed value + unit cost and disables submit on a refused absorption; final-completion toggle. Scrap dialog with write-off preview. Close order confirms the residual write-off amount. |
| Job tracker (JB-) | ✅ Wired | Searchable job list (status chip, profit, overdue flag), create/edit form (customer picker or walk-in name/phone, warehouse locked after creation, declared labour, due date). Detail: stage advance menu (status derived from stage position), material issue/return dialogs (available-at-job-warehouse / held-by-job hints; returns list only held products), advances list, bills list, profit block. Advance dialog posts through the EXISTING `addRepayment` with `advanceNoteFor(job)` — pooled in the customer's balance, never a job posting (§5.3). "Bill this job" hands a `BillPrefill` to the billing desk; the billing screen shows the job's issued materials with the do-not-bill-again note (§5.4/R-C7), and posting flips the job to delivered in the bill's batch. Deliver/cancel with confirmations. |

## Gaps / partials (honest list)

1. **Job stage editor**: the stage LIST itself (settings
   `jobStages`) is read and honoured (jobs derive status from
   it), but editing the list in-app is not surfaced — the web's
   settings editor for stages is an F4 settings surface. Jobs
   keep working with the stored list or the defaults.
2. **Transfer / production / job printing**: the web's designed
   print layouts (transfer note, production order, work slip)
   are not raster-ported in F3 — the screens carry no print
   action rather than a substitute. Bills/receipts keep the
   F1/F2 pipelines.
3. **Product save semantics**: the web's `updateProduct` also
   writes a stock-adjustment doc and revaluation entries when
   stock/cost fields change; the Flutter product editor saves
   fields plainly (as it did in F1). The class toggle — the one
   class-related money movement — posts identically via the
   dedicated action.
4. **Transfer line status**: the web stores a per-line status;
   the Dart line type (fixed at F3 core time) carries quantities
   only and derives line state from them — transfer-level
   statuses, shortages and in-transit figures are identical.
5. **Multi-run issue defaults**: the issue dialog seeds from the
   order snapshot per run exactly as the web desk does; a
   "remember settlement" preference (`mfg.issue.makeDefault`)
   is not persisted in F3.

## Method notes

- Fixtures before UI, as F1/F2: every new posting path was
  composed by the web libs into `f3-core.json` first, ported to
  Dart, and asserted byte-for-byte before the store or any
  screen touched it. The web remains ground truth throughout.
- No dictionary keys were added: all F3 screens read the
  existing generated dictionary (wh.* / tr.* / mfg.* / job.* /
  inv.class.*), so the drift gate is untouched.
- One warehouse per bill stays the rule; production and job
  movements validate against their OWN order/job warehouse row
  only — stock at another warehouse is never reached for.
