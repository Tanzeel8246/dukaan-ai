# F1 Completion Report — Dukaan AI Flutter App

**Phase:** F (Flutter apps) · Increment F1 — core + the counter release
**Design:** `../ERP-PHASE-F-DESIGN.md` (§2 F1 row set, §5 printing, §7 packaging/CI, §7.5 acceptance, §8 fixture contract)
**Completion run:** 2026-10-23 (this report). The original F1 build run ended
overnight without a final report; this run established the true state,
finished what was missing, and verified everything below from scratch.

## Acceptance state per design §F1

| F1 item | State | Evidence |
|---|---|---|
| Dart core (types, COA, makeEntry, preparePosting, tax, numbering, selectors) | ✅ Complete | `flutter test` 38/38; golden fixtures web≡Dart byte-for-byte (15 scenarios, trial balance 0) |
| TS-harness fixture export (§8) | ✅ Complete | `harness/fixtures/f1-core.json` regenerated in this run — byte-identical (additive only) |
| Auth (email/password) + staffIndex role resolution + shop context | ✅ Wired | `lib/main.dart` sign-in; `lib/data/store.dart` staffIndex lookup, missing role ⇒ manager |
| App shell + sync centre + five themes | ✅ Wired | NavigationRail shell, theme picker persisted on device; theme tests pin all five token sets to the web CSS values |
| PIN lock — launch / idle / manual + recovery + E5 gate | ✅ Wired | PinLockScreen + idle reducer (20 s tick) in `app_state.dart`; forgot-PIN via Firebase re-auth; gate wired at void-bill and day-close submit (the two F1 actions on the E5 list; period/fiscal actions arrive with their F3/F4 modules) |
| Dashboard — KPIs, chart, attention items | ✅ Complete | KPIs + attention (low/negative stock, duplicate bill numbers, rejected writes) were present; **the 14-day sales chart was missing and was added in this run** (consumes the already-generated `dash.chart.*` strings) |
| Billing / POS — create, split payments, tax, hold/resume, finalize, void, returns | ✅ Wired | `features/billing.dart` ↔ store `buildBill/postBill/saveHeldBill/discardHeldBill/voidBill/recordReturn` (composers fixture-proven) |
| Sales counter | ✅ Wired | `recordCounterSale` (quick + raw modes in fixtures) |
| Inventory — view, search, add/edit, stock adjustment, CSV import | ✅ Wired | FilePicker CSV import with per-row result notice; cost visibility follows role |
| Customers + udhaar — directory, give standalone, repayment, statement | ✅ Wired | `giveCredit/addRepayment/saveCustomer`; statement sheet |
| Day close (per cash account) | ✅ Wired | Account picker; expected cash = journal-derived (`expectedCashToday`), submit behind the E5 gate |
| Receipt printing — template consumption | ✅ Wired | `resolvePrintDesign` ported; receipts honour `settings.printDesign` + `brandLogo` from the owner doc (F4 owns the editor) |
| Printing — Android: system print/share + ESC/POS | ⚠️ Partial | PDF via the `printing` package and share-sheet paths are wired; ESC/POS raster bytes are generated (mm80, image + feed + **drawer kick — added in this run** + cut) but are delivered as a `.bin` file through the share sheet. **Direct Bluetooth SPP / USB-OTG socket transport is NOT implemented** — a gap against §5.2's delivery path, carried to F2 |
| Printing — Windows: PDF → system printer | ✅ As designed | Same `printing` pipeline; raw ESC/POS on Windows is explicitly later than F1 (§5.5) |
| Windows installer (Inno Setup) | 📄 Script present | `windows/installer/dukaan_ai.iss`; compiled only by the CI release workflow (no Windows runner on this machine) |
| i18n generation pipeline | ✅ Complete | `tools/gen_l10n.mjs`; CI carries a regeneration drift gate |

## Verification performed in this run (2026-10-23)

- `flutter analyze` — **no issues** (before and after this run's edits).
- `flutter test` — **38/38 pass** (fixtures 16, core 19, themes 3).
- TS harness — **1,389/1,389 pass**. Three FIX-suite checks were red at
  04:15 PKT and are fixed (see "Defects found & fixed").
- `flutter build apk --release` — **BLOCKED on this machine** (below).
- CI — see "Delivery / CI state".

## Defects found & fixed in this run

1. **Seed timestamps named the wrong day outside PKT (web lib).**
   `web/lib/seed.ts` built seed timestamps with local-time arithmetic
   (`setHours`, UTC-date slicing) while the business calendar is PKT.
   On any non-PKT runtime (this VM, GitHub's UTC runners) between
   00:00–05:00 PKT, seed rows and seed journal entries landed one
   calendar day off their `dayOffset`, breaking the P&L≡sales-report
   reconciliation the FIX suite pins. `rebaseTs`, `dayTs` and
   `docDayISO` now compute through the `periods.ts` PKT primitives.
   The frozen seed identities are untouched (the journal fingerprint
   normalisation drops `ts`; 21 entries · Inventory 272,805 · Cash
   50,000 · payables 27,900 · receivables 5,500 · TB 0 · SHA
   e17e5bda…1168 all re-verified). Clock-robustness proven at five
   fake-clock instants straddling the PKT rollover.
2. **`harness/tsconfig.json` carried absolute local paths**
   (`/home/hatch/…` for outDir/rootDir/include) — the CI fixture step
   would have compiled nothing on a runner. Converted to relative
   paths; harness output byte-equivalent (1,389 green, fixtures
   unchanged).
3. **Dashboard chart missing** (design names it in the F1 set) —
   added, see table.
4. **ESC/POS drawer kick missing** from the byte profile (§5.2 names
   it) — added.

## Build state

- **Local APK build: impossible on this VM, for one precise reason.**
  The full toolchain exists (Flutter 3.35.6, Android SDK 35 +
  build-tools 35.0.1, JDK 17, Gradle 8.12 distribution seeded, egress
  proxy + CA configured for dependency downloads) — but **Gradle's
  client↔daemon IPC never completes here**: every `flutter build apk`
  dies at Gradle startup with "Could not receive a message from the
  daemon", in daemon and `--no-daemon` (single-use daemon) modes
  alike, while the daemon itself starts and waits healthily. The
  fault is on the Java side, narrowed by experiment: a minimal
  Python loopback socket pair works (`loopback python: b'hello'`),
  while the equivalent plain-Java socket test hung without output
  until killed. The exact micro-cause is undetermined (candidates:
  IPv4/IPv6 loopback mismatch in the JVM, SecureRandom entropy
  blocking, sandbox JVM networking); untried remedies for a future
  retry are `-Djava.net.preferIPv4Stack=true` and
  `-Djava.security.egd=file:/dev/urandom`. With no local compile
  possible today, CI is the compile proof — the design's R-F1 case.
  *(This paragraph corrects an earlier draft of this report that
  blamed sandbox loopback generally; the full socket-test log,
  recovered after a runtime restart, shows Python loopback
  succeeding and only the Java test hanging.)*
- **Windows build:** not attempted locally (needs a Windows runner by
  construction); the deliverable is the CI workflow + Inno script.

## Delivery / CI state

- Source lives at **github.com/Tanzeel8246/dukaan-ai** (the repo the
  owner created; named `dukaan-ai`, not `ai-dukaan-ai`). Its previous
  snapshot (2026-10-22) carried the RETIRED scaffold under
  `flutter-app/`; the 15 stale scaffold files were removed in this run
  (one commit each, `841483eb7`…`764277dbc`), leaving `main` clean
  and ready.
- **The source push itself is BLOCKED by a GitHub App permission:**
  the connector's `push_files` route creates the commit through the
  Git Data API, and the API answers `403 Resource not accessible by
  integration` for `POST /git/trees` — verified with the full
  156-file snapshot and with a 2-file test, so it is permissions, not
  payload. The Contents API works (the 15 deletions used it), so the
  remedy is either widening the Muse GitHub App installation's
  access to cover the git-data endpoints, or one owner-side
  `git push` of the prepared tree (manifest preserved next to the
  sync record as `ai-dukaan-ai.f1-push-manifest`, 156 text files,
  2.79 MiB). **Until that push lands, app-ci has not run** — no CI
  result is claimed anywhere in this report. Once pushed, app-ci
  runs fixture freshness → TS harness → i18n drift gate → analyze →
  flutter test on the push.
- **Snapshot-push limitation (owner action needed once):** the
  connector's snapshot route carries UTF-8 text only. Eight binary
  files could not be pushed and are absent from the repo:
  `assets/fonts/NotoNastaliqUrdu-Regular.ttf`,
  `android/gradle/wrapper/gradle-wrapper.jar`, five
  `android/app/src/main/res/mipmap-*/ic_launcher.png`, and
  `windows/runner/resources/app_icon.ico`. Until they are added by a
  single ordinary `git push` (or GitHub web upload), the release
  workflow cannot complete an APK/installer build (missing wrapper
  jar + font asset), while app-ci's analyze/test legs are unaffected
  except that `flutter test` may flag the missing font asset — the CI
  run's own output is the arbiter and is reported with this run.
- Signing: until the owner provisions the release keystore secrets,
  the release workflow builds **debug-signed, labelled INTERNAL**
  (design §7.3) — expected state, not a defect.
- `app-release` fires on `workflow_dispatch` or an `app-v*` tag;
  neither is triggerable through the connector's tool set, so the
  release run awaits the owner's one click in the Actions tab (or a
  tag push).

## Owner's acceptance script (§7.5) — NOT YET RUN

Both legs remain open, honestly stated:

1. **Owner-device leg** — no installable artifact exists yet (local
   build blocked above; CI release not yet run + binary-assets gap).
   When an APK exists: sign in → sync centre shows 0 pending → record
   a counter sale offline (airplane mode) → reconnect → the sale
   appears on the web → print a receipt → lock/unlock with PIN.
2. **Cross-client leg** — the same shop traded from web and app in
   turn; not yet exercised (needs the device leg first).

## Carried to F2 (beyond the design's own F2 document chain)

- Direct Bluetooth/USB ESC/POS transport behind the `ReceiptPrinter`
  seam (bytes already composed).
- The eight binary files' one-time git push (owner) — unblocks
  app-release end-to-end.
- Owner decisions already named in the design: release keystore
  provisioning (§7.3), Firebase console registration check for the
  two apps (client config in-repo already targets `dukan-8246`).
