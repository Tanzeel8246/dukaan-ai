# Phase F · F5 — Flutter hardening + distribution readiness (close-out)

Design: `ERP-PHASE-F-DESIGN.md` §F5 (+ §7 distribution, §8 suites).
State inherited and re-verified at F5 start: F1–F4 complete,
analyze 0, `flutter test` 185/185, TS harness 1,389/1,389,
fixtures f1–f4 byte-stable, i18n 2,580 keys drift-clean.

## What F5 delivered

### 1 · Three-client week-in-the-life simulation (in tests)

`harness/fixtures-export-f5.js` composes a full trading week
(Mon 2026-09-07 → Sun 2026-09-13) with the **real web functions**
only — 16 posting events alternating web/app clients over one
evolving shop (the F1 fixture shop + a packing product, a
manufactured blend, a second warehouse, a 2-component BOM, two
employees with August attendance, fiscal settings): purchase →
counter sale → part-udhaar bill → salary advance → repayment →
a web return against the app's bill (udhaar eaten first, rest
cash) → transfer closed short → rent expense → production issue
(labour accrued) → completion absorbing the pool to exactly 0 →
payroll accrual → both salary payments + the unassigned-bucket
payment → supplier payment → an FY-close drill.
`flutter-app/test/f5_week_test.dart` (19 tests):

- every **app-composed** entry re-composed in Dart and asserted
  **byte-for-byte** (counter sale, bill + its udhaar row,
  repayment, transfer loss, production issue + completion, three
  payroll payments);
- three **web-composed** entries cross-composed in Dart as a
  bonus parity proof (salary advance, payroll accrual incl. the
  run-line figures, the FY-close entry incl. the range derived
  from the shop's fiscal settings);
- the merged journal holds **every cross-client identity**:
  trial balance == 0 after *each* of the 16 events and at week
  end (per-account values equal to the web's own trial balance);
  money GL buckets == fixture, Σ per-account == bucket;
  receivables GL == credits subledger (both end at 0 after the
  return eats the remaining udhaar); payables GL == supplier
  subledger (7,400); `salary_payable` composition == Σ employees
  + unassigned bucket at five checkpoints, ending at exactly 0;
  stock rows + in-transit == `stockQty` per product and the
  inventory GL movement == the shelf value delta (11,680, the
  blend valued at its absorbed unit cost 486), WIP == 0;
  **P&L net revenue == sales-report net revenue (2,535) before
  and after the FY close** (the §4.6 identity), the week's net
  (−55,785 — the fixture FY holds only this week; the identity,
  not the sign, is the assertion) lands in retained earnings via
  the one closing entry; the week's output tax fully reverses
  with the return (tax_payable == 0);
- `originDevice` stamps: every app entry carries its device
  ("Counter Tablet" / "Owner Phone"); web entries carry none.

Fixture byte-stable across re-exports:
`f5-week.json` md5 `36660397ee16080965c47a5ffe666138`.

### 2 · Offline / conflict drills (in tests)

`flutter-app/test/f5_drills_test.dart` (5 tests):

- **Duplicate bill numbers** — two offline devices both take
  #118: `duplicateBillNumbers` flags exactly that collision (and
  `duplicateNumbers` the QT-7 series pair), **nothing is
  renumbered** (both bills keep #118; the detector is read-only),
  both bills' entries coexist with the merged trial balance 0.
- **Period lock at flush** — an entry composed offline for
  2026-09-10 meets a period locked through 2026-09-30 (locked
  from another device): `preparePosting` refuses it with
  `PeriodLockedError` (code `period-locked`); an October entry
  passes and is date-stamped. The refusal record is built
  exactly as the store's `_commit` classifies a rules refusal
  (`period-locked`) and the `RejectedWrite` JSON round-trip
  preserves reason, detail and both refused documents whole —
  the tray is the only trace; the entry is in no journal.
- **Last unit sold twice** — two devices sell the last ghee
  offline: both entries post balanced, derived stock and its
  level row go to **−1 (never clamped)**, the dashboard's
  negative-stock predicate flags it, and §1.7 drift stays silent
  *by design* (rows agree with the total; asserted deliberately
  so the distinction is pinned). Remedies proven: a recount
  adjustment (+1, Dr inventory / Cr inventory_loss) heals the
  flag with a balanced entry; a stale re-synced row (drift +1)
  is flagged by `stockDrift` and repaired by `recountLevels`.
  Device stamps survive the persistence round-trip.

### 3 · Declared-partial sweep

- **F2 conversion pick quantities — CLOSED.**
  `_pickConversionLines` / `_conversionPicks`
  (`lib/features/documents.dart`): every conversion (quotation →
  order / bill, order → bill / challan, challan → bill) now
  opens a per-line quantity editor defaulting to each line's
  *derived remaining* quantity (0 skips the line; over-types
  clamp — and the store's convert functions clamp to the same
  remainders again, so over-conversion is impossible). Uses
  only existing dictionary keys (`doc.lines.qty`, actions) — no
  new keys. Verified by analyze; the store-side clamp was
  already fixture-proven in F2. (Widget-level interaction is
  not device-verified — see the matrix.)
- **F2 RV/PV + report print layouts — CLOSED.**
  `lib/core/print_docs.dart` (builders) +
  `lib/features/print/doc_view.dart` (renderer + print sheet):
  the web DocPrintSheet layouts as designed pages — voucher
  pages (party, account, amount, *balance-after*, shop signature
  slot) wired into the Vouchers tab (print icon beside share),
  and a generic report page (shop header + period + the
  report's own label/value rows) wired into the Reports toolbar
  for all 14 reports. Both ride the receipt's transports:
  system print (PDF image-page), 80mm ESC/POS (configured direct
  printer first, share-sheet .bin fallback), plain-text share.
- **F3 work-slip print layout — CLOSED.** `jobSlipDocPage`
  mirrors the web slip (meta, materials *events* verbatim, net
  materials via `jobMaterialsCost`, labour, the **receiver's**
  ruled line — the slot matrix's customer signature), wired to
  a Print button on the job detail.
- **F4 salary-slip ESC/POS raster — CLOSED.** The slip dialog is
  rebuilt on the designed page (`salarySlipDocPage`: shop
  header, earnings/deductions sections, the §2.7 derived
  figures, shop signature slot) and prints through the same
  sheet (system + 80mm ESC/POS + text share). The F4-era bespoke
  PNG-image share button was retired in the consolidation;
  text share and system-print-to-PDF remain.
- Print builders are unit-tested (`test/f5_print_docs_test.dart`,
  4 tests: voucher totals/signature, slip event rows + net,
  salary sections + settlement totals, report rows).
- **`sync.online` wart — CLOSED.** The key now exists in the
  shared dictionary (`web/lib/i18n/parts/shell.ts`, EN "Online"
  / UR "آن لائن"), all harness count pins amended in the house
  style (2,580 → **2,581**, +1 sync.online), the generator's
  header count is interpolated (no longer hardcoded), strings
  regenerated (drift gate clean), and `main.dart` uses the
  typed getter `s.syncOnline`. Residual, stated precisely: the
  sync *centre screen* (`lib/features/sync.dart`) and the
  "Sync Centre" nav label still use inline `isUrdu ? … : …`
  string pairs — they render correctly in both languages (they
  are not raw keys); routing them through the dictionary is a
  dictionary-addition decision for the owner, not a defect fix.

### 4 · Distribution readiness (files, not runs)

- **Version**: already at the design's release versioning —
  pubspec `6.0.0+1`, Inno `MyAppVersion "6.0.0"` (§7.4: apps are
  born at the Phase F release 6.0.0; `+N` is CI-stamped). The
  missing piece was the stamping: `app-release.yml` now passes
  `--build-number=${{ github.run_number }}` on both builds.
- **CI reviewed end-to-end** (both workflows):
  - `app-ci.yml` fixture freshness now re-exports **all five**
    fixtures and diffs the whole fixtures directory (was: f1
    only).
  - Both workflows gained a **binary-assets step**: decode any
    `*.b64` sidecars if present (the text-only push route), then
    assert the eight real binaries exist non-empty (Nastaliq
    TTF, gradle-wrapper.jar, 5× mipmap ic_launcher.png,
    app_icon.ico) and fail loudly otherwise.
  - `app-release.yml` keeps the debug-signed **INTERNAL**
    labelling when no keystore secrets exist, and the Windows
    job now emits `checksums-windows.txt` beside the installer
    (Android already had checksums). Both workflow files parse
    as valid YAML and were reviewed line by line; **no CI run
    has been executed** (GitHub pushes are parked by the owner).
- **Release notes** (EN + UR): `flutter-app/RELEASE-NOTES.md` —
  including the SmartScreen "More info → Run anyway" instruction
  and the Raast-provisional note, stated plainly.
- **`flutter-app/DISTRIBUTION.md`** — the exact owner runbook:
  source push, the five Actions secrets (names + what each
  holds), the one-time keytool keystore creation + the
  keep-it-safe warning, the Actions run and artifact names,
  the Q2 (sideload-first; no AAB job unless opted in) and Q3
  (Inno unsigned; OV cert as the middle step) standing answers,
  and the per-device install + acceptance script.

### 5 · Final source ZIP

`~/workspace/your_files/dukaan-ai-FULL-source-for-github.zip`
— the complete current tree (web + harness + flutter-app +
firebase + workflows + design/audit docs), real binaries in
place. Excluded: `web/node_modules`, `web/.next`, `web/out`,
`web-deploy/` (the repo's own .gitignore lists it), `harness/
out` (regenerable), `flutter-app/build`, `.dart_tool`,
`.gradle`, ephemeral dirs, `*.tsbuildinfo`, `*.zip`, `.env*`,
and `flutter-app-scaffold-retired/` (retired in F1; its files
were deliberately deleted from the repo snapshot). Verified
against `~/workspace/your_files/dukaan-ai-FULL-source-MANIFEST.txt`
(file count, sizes, SHA-256, and spot paths: all 8 binaries,
both workflows, F1–F5 reports, all five fixtures,
DISTRIBUTION.md, RELEASE-NOTES.md, firestore.rules, harness).
**Not pushed anywhere** — the owner's single end-of-work push
is the route (GitHub parked by owner decision, 2026-10-23).

### 6 · Local build experiments (the two authorized JVM flags)

Local APK builds on this VM were blocked in F1 by a
Gradle↔daemon IPC hang. F5 spent exactly one bounded experiment
on each untried remedy (`flutter build apk --debug`, JDK 17,
420s bound):

- `-Djava.net.preferIPv4Stack=true` (GRADLE_OPTS): the daemon
  **was reached** (the IPC hang did not reproduce) and the build
  failed in ~1.4s inside dependency resolution with an SSL
  transport exception (`sun.security.ssl`) — Java TLS through
  this VM's egress proxy.
- `-Djava.security.egd=file:/dev/urandom` (GRADLE_OPTS): same
  class of failure — `javax.net.ssl.SSLException: Unsupported
  or unrecognized SSL message` at handshake.
- **No APK was produced.** Neither flag is baked into the tree
  (neither unlocked anything). The blocker on this VM is Java
  TLS egress, independent of both flags — consistent with the
  standing note that the egress proxy breaks other TLS
  handshakes here. Cloud CI (GitHub Actions, §7) remains the
  build route; nothing about this experiment changes the app.

## Verification totals (this session, observed)

| Gate | Result |
|---|---|
| `flutter analyze` | **0 issues** |
| `flutter test` | **213/213** (F1 38 · F2 50 · F3 37 · F4 60 · F5 28 = week 19 + drills 5 + print-docs 4) |
| TS harness | **1,389/1,389 — ALL SUITES GREEN** |
| Fixtures byte-stable | f1 `cfad6131…` · f2 `f77ad00a…` · f3 `25123992…` · f4 `02fa26ef…` · f5 `36660397…` |
| i18n | **2,581 keys** EN ≡ UR, generator drift gate clean |
| Template census | web store `makeEntry(` sites = **24** (unchanged); web lib builders 15; Dart: 1 `makeEntry` definition, 38 composer call sites |
| Rules | `firebase/firestore.rules` = Phase E v8 state: 594 lines, SHA-256 `04807268…f859` (unchanged) |
| Frozen seed identities | re-asserted by the green harness (Inventory 272,805 · Cash 50,000 · TB 0 · payables 27,900 · receivables 5,500 · 21 seed entries) |

## F1–F5 acceptance matrix

Legend: **T** = verified in tests (this repo's suites) ·
**I** = implemented, not device-verified (no device/printer in
this environment) · **O** = owner-gated.

| Design item | Status |
|---|---|
| F1 counter/billing/returns/day-close, inventory, customers/udhaar, dashboard | T (golden fixtures byte-for-byte) · I for screens |
| F1 five themes token-equal to web | T (theme tests) · I for screens |
| PIN gate incl. E5 sensitive-action gates | Gate seam harness-pinned on the web; Dart port wired at the same call sites (F1/F4) · I for device behaviour |
| F1 sync centre + rejected tray + originDevice stamps | T (F5 drills exercise the tray record + stamps) · I for live sync |
| F1 ESC/POS bytes incl. drawer kick; direct transport (BT/USB) | T (byte composition) · I (transport implemented F2, never run against a printer) |
| §7.5 owner acceptance script (install → offline sale → web sees it → print → PIN) | **O** — needs an installable build + a device |
| F2 purchases/suppliers/PV/expenses mirror; document chain + conversions | T (fixtures) |
| F2 conversion per-line pick quantities | Conversions fixture-proven (F2); the store's remainder clamp is in the convert functions (read + relied on in F5); the editor UI is F5, analyze-verified · I |
| F2 cheques lifecycle; finance (journal/TB); 14 reports; forecast | T (fixtures; P&L ≡ Sales proven in Dart, again in the F5 week) |
| F2 RV/PV + report print layouts | F5: builders **T**; rendering/transports **I** |
| F3 warehouses/transfers/BOM/production/jobs | T (fixtures incl. WIP → exactly 0, job profit identity) |
| F3 work-slip print layout | F5: builder **T** · I |
| F3 transfer/PO print layouts | **Not ported** — reason below |
| F4 staff/attendance/payroll/loans/FY close/Tally/settings editors | T (fixtures; salary composition identity at every checkpoint) |
| F4 salary-slip print | F5: designed page + ESC/POS path — builder **T** · I |
| F4 brand assets compression | T (caps enforced with figures); WebP ladder encodes PNG (image pkg has no WebP encoder) — caps never bent |
| F4 Raast card | I; framing pin **O** (owner's bank-app QR screenshot) |
| F5 week simulation + drills | **T** (this report §1–2) |
| F5 distribution files (version, notes, CI, DISTRIBUTION.md) | Done as files; CI execution **O** (push parked) |
| Windows raw ESC/POS | Standing answer documented (§7.2/Q3 driver path): Windows prints through the system print dialog → the printer's own driver; raw-socket ESC/POS on Windows **not implemented** — no device reality in F1–F5 demanded it |
| Play Store (Q2) / installer signing (Q3) | **O** — sideload-first + unsigned Inno are the standing recommendations in DISTRIBUTION.md |

### Residuals with precise reasons

- **Transfer / PO print pages not ported.** The generic
  DocPage machinery (F5) makes these small, but they were not
  in the brief's named sweep list (vouchers/reports/work-slip/
  salary-slip were); rather than rush two more layouts past the
  acceptance gates, they are recorded here as the known gap.
  The data builders' inputs already exist (transfer lines,
  PO lines); the pages are an additive follow-up.
- **Draft documents: no in-place draft line editing** (F2
  partial, still open). Drafts are create/delete only in-app;
  editing a draft means delete + recreate. The store has no
  draft-line mutation action on either client for posted-chain
  documents (immutability discipline); a draft editor is a new
  store action + UI, out of F5's named scope.
- **Job settlement preference not persisted** (F3 partial,
  still open): the choice is re-asked per settlement; no
  settings field exists for it on the web either — parity, not
  an app-only gap.
- **Production settlement / `updateProduct` side-writes**
  (F3 partial, still open): class-toggle money movement posts
  identically; the web's adjustment-doc/revaluation side-write
  trail is not mirrored in the app store. Journal parity is
  unaffected (fixtures prove the postings); the side documents
  are the gap.
- **Sync-centre inline bilingual strings** — see §3 above
  (renders correctly; dictionary routing is an owner decision).
- **Performance on large journals**: the app derives in-memory
  exactly like the web client (no server pagination exists in
  the data contract); F5 added no pagination. List screens use
  builder lists; the day a shop's journal outgrows counter
  hardware, the fix is selector windowing in the store — noted,
  not needed by any observed shop.

## Owner-gated (nothing here was run or pushed)

1. Publish/keep Firebase rules **v8** live (web-side rollout,
   tracked outside F5).
2. Provision the Actions secrets + run `app-release`
   (DISTRIBUTION.md §1–3) → first installable artifacts.
3. Send the bank-app **Raast QR** screenshot → pin
   `RAAST_FRAMING`, rebuild.
4. Run the **§7.5 acceptance script** on a real counter device
   once an APK exists.
5. The **single end-of-work GitHub push** of the F5 source zip.
