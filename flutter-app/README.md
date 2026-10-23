# Dukaan AI — Flutter app (Phase F · F1 counter release)

The native client for the Dukaan AI ERP: Android + Windows, ONE
backend with the web app (Firebase project `dukan-8246`), the same
`users/{uid}/…` namespace, the same document shapes, and the same
journal contract — the Dart finance core in `lib/core/` is a
faithful port of the web's `lib/` posting machinery, proven equal
by golden fixtures (see below). **Firestore with persistent cache
is the only on-device store**; the app never seeds and never keeps
a second database.

Package id: `com.codehubb.dukaanai` · min Android API 24 ·
version 6.0.0+1 (X.Y follows the ERP phase lineage).

## What F1 ships

- **Core (fixture-proven):** `makeEntry`/`preparePosting` guard,
  COA, tax engine, ledger selectors, hardened numbering
  (max+1 + server re-read + `originDevice` + duplicate detector),
  PIN lock (PBKDF2-HMAC-SHA256, 150k iterations, E4 friction, E5
  sensitive-action gates), RBAC matrix (generated from the web).
- **Screens:** login (email/password + staffIndex role resolution),
  shell with header account cluster + sync chip, PIN gate,
  dashboard, billing/POS (type → one tap adds, sticky cart,
  hold/resume, instant receipt modal, returns, PIN-gated void),
  sales counter, inventory (add/edit/adjust/CSV import),
  customers + udhaar ledger, day close, sync centre with the
  rejected-write tray.
- **Printing:** one receipt renderer for screen/PDF/thermal —
  system print as PDF image-pages; ESC/POS raster bytes for 80mm
  via share; plain-text/WhatsApp share. The receipt honours the
  owner's saved web print design (E1). Direct Bluetooth/USB
  transport is deferred to F5 (needs the owner's printer model).
- **Themes:** the web's five calm themes, same tokens (pinned by
  test against `web/app/globals.css`).

## Generated artifacts — never hand-edit

- `lib/l10n/strings*.{dart,json}` + `lib/core/permissions_data.dart`
  are GENERATED from the web dictionary/matrix:
  `node tools/gen_l10n.mjs` (CI runs it with `--check` as a drift
  gate).
- `../harness/fixtures/f1-core.json` is exported from the TS
  harness (`node ../harness/fixtures-export.js` after recompiling
  the harness); `test/f1_fixtures_test.dart` asserts the Dart
  composers reproduce it byte-for-byte.

## Firebase config

`lib/data/firebase_options.dart` carries PLACEHOLDERS in the repo
(the web's discipline). CI injects the real options from the
`FIREBASE_OPTIONS_DART` secret; the Android/Windows apps must be
registered in the Firebase console for project `dukan-8246` first.

## Verify locally

```sh
flutter pub get
flutter analyze          # expect: No issues found
flutter test             # 38 tests: core, golden fixtures, themes
```

## CI / releases

Repo-root workflows: `.github/workflows/app-ci.yml` (analyze +
tests + fixture freshness + i18n drift gate + TS harness) and
`app-release.yml` (Android APK — debug-signed and labelled
INTERNAL until keystore secrets exist; Windows via Inno Setup,
script in `windows/installer/dukaan_ai.iss`).

Local-build note (this dev VM only): pub.dev and Gradle downloads
are slow through the sandbox egress proxy, and the Gradle daemon's
local socket is restricted in the VM, so APK builds run in CI;
the Dart test/analyze suites run locally as above.
