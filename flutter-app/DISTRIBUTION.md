# Dukaan AI — Distribution runbook (owner)

Exactly what to click and provision to turn this source tree into
installable apps. Nothing here has been run yet: CI builds happen
on GitHub, on your account, when you say so. Version: **6.0.0**
(pubspec `6.0.0+1`; the release workflow stamps the `+N` build
number from the Actions run number — design §7.4).

## 0 · Put the source on GitHub (once)

The deliverable zip `dukaan-ai-FULL-source-for-github.zip`
contains the complete current tree (web + harness + flutter-app
+ workflows, real binaries included). Extract it over the
`Tanzeel8246/dukaan-ai` repository and push — or push the working
tree directly. The workflows land in `.github/workflows/`.

## 1 · Provision the Actions secrets

GitHub repo → **Settings → Secrets and variables → Actions →
New repository secret**. Four are for signing (step 2), one is
for the backend:

| Secret | Value | Required |
|---|---|---|
| `FIREBASE_OPTIONS_DART` | The full contents of `flutter-app/lib/data/firebase_options.dart` for Firebase project **dukan-8246** | For a working app. Without it the build compiles with placeholders and **cannot reach the backend** (the workflow prints a warning). |
| `ANDROID_KEYSTORE_BASE64` | Base64 of your upload keystore (step 2) | Only for a distributable APK |
| `ANDROID_STORE_PASSWORD` | The keystore password | With the keystore |
| `ANDROID_KEY_PASSWORD` | The key password | With the keystore |
| `ANDROID_KEY_ALIAS` | The key alias | With the keystore |

## 2 · Create the release keystore (once, on your own machine)

Skip this and every APK stays **debug-signed and labelled
`INTERNAL-debug-signed-not-for-distribution`** — fine for your
own shops' testing, never for distribution or any store.

```bash
keytool -genkey -v -keystore dukaan-upload.keystore \
  -alias dukaan-upload -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 dukaan-upload.keystore > keystore.b64   # → ANDROID_KEYSTORE_BASE64
```

**Keep `dukaan-upload.keystore` and its passwords somewhere safe
and backed up.** If they are lost, no future update can ever be
installed over a release-signed install — this file *is* the
app's identity.

## 3 · Run the release build

GitHub repo → **Actions → app-release → Run workflow** (or push
a tag named `app-v6.0.0`). Two jobs run:

- **android** → artifact `dukaan-ai-android`: the APK +
  `checksums.txt`. The APK file name tells you how it was
  signed: `dukaan-ai-release-signed.apk` when step 1–2 secrets
  exist, otherwise `dukaan-ai-INTERNAL-debug-signed-not-for-distribution.apk`.
- **windows** → artifact `dukaan-ai-windows`:
  `DukaanAI-Setup-6.0.0.exe` (Inno Setup, per-user, no admin) +
  `checksums-windows.txt`.

`app-ci` also runs on every push touching the app, the web libs
or the harness: analyze + all Dart tests + the TS harness + the
fixture-freshness and i18n drift gates. A red `app-ci` means do
not release.

## 4 · Signing choices (design Q2 / Q3 — the standing answers)

- **Q2 · Play Store vs sideload-first — sideload-first.**
  Install the APK directly on your shops' devices. Play would
  need a Play developer account and store review, and adds
  nothing for known-shop distribution today. The workflow has
  **no AAB job**; if you later opt into Play, the addition is:
  your upload keystore (step 2) + a Play Console account + an
  AAB build job — ask and it gets added deliberately.
- **Q3 · Windows installer — Inno Setup, unsigned at first.**
  First run shows SmartScreen's "unknown publisher": **More
  info → Run anyway** (already written plainly in the release
  notes). If that friction proves real in your shops, the middle
  step is an OV code-signing certificate for the installer; MSIX
  only becomes right with Store distribution or a trusted
  certificate.

## 5 · Install + accept (per device, ~5 minutes)

1. Install the APK / run the Windows setup.
2. Sign in with the shop account → open the **Sync Centre**:
   it must show **Online** with 0 pending and an empty rejected
   tray.
3. Turn the internet off → make one counter sale → turn it back
   on → the sale appears on the web app.
4. Print a receipt (paper or 80mm).
5. Set the device PIN (Settings → Device lock) → lock → unlock.

If any step fails, note the step number and what the screen
showed — do not keep retrying a money action.

## 6 · What stays provisional

- **Raast QR** prints as *provisional — pending verification*
  until you send a screenshot of your bank app's Raast QR and
  its framing is pinned in `web/lib/raast.ts` (one-constant
  change, then rebuild). The Raast IBAN text line works today.
- The release is **not** on any store; updates are new artifacts
  installed over the old (same signing key required — see step 2).
