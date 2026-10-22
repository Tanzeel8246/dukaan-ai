# Dukaan AI — Flutter app (offline-first)

The mobile companion to the Dukaan AI web app: a kiryana shopkeeper's
pocket dashboard. **Fully functional offline** — sqflite is the source of
truth on-device; Firestore sync is an optional layer on top.

## Screens

| Tab | What it does |
|---|---|
| Dashboard | KPI cards (stock value, low-stock alerts, today's sales/profit), 7-day revenue bars, low-stock preview |
| Inventory | Searchable product list with **+/- stock steppers**, low-stock filter, highlighted alert rows |
| Sales | Record a sale (product picker + quantity stepper) — works offline, queued and synced later; today's counter + sales list |
| Alerts | Low-stock alerts with days-of-stock meter and reorder suggestions (7-day moving average, same math as the web app) |

## Architecture

```
lib/
  main.dart                 # app shell, warm Material 3 theme, bottom nav
  models/                   # Product, Sale (toMap/fromMap)
  services/
    database_service.dart   # sqflite: products / sales / meta tables + indexes
    sync_service.dart       # Firestore: offline persistence + queued-write retry
  providers/
    store_provider.dart     # ChangeNotifier: state, selectors, mutations, demo seed
  screens/                  # dashboard / inventory / sales / alerts
  widgets/                  # kpi_card, product_tile (stepper)
```

**Offline-first design:**
- First launch seeds 25 demo products + 14 days of sales into sqflite
  (deterministic seed, same catalogue as the web demo).
- `recordSale()` writes locally with `synced = 0`; `SyncService.syncNow()`
  pushes queued sales and merges products (last-write-wins on `updatedAt`)
  whenever Firebase is available.
- No `google-services.json` / `GoogleService-Info.plist`? The app simply
  runs in offline demo mode — the cloud icon in the app bar shows the state.

## Build the APK (cloud only)

There is no Android SDK in this workspace, so **analyze and APK builds happen
in CI** — never claimed as done locally:

- **Codemagic:** `codemagic.yaml` — `flutter analyze` + `flutter build apk --release` on push.
- **GitHub Actions:** `.github/workflows/build-apk.yml` — manual or on push; APK uploaded as an artifact.

To build locally you need the [Flutter SDK](https://docs.flutter.dev/get-started/install)
(3.4+), then:

```bash
cd flutter-app
flutter pub get
flutter analyze
flutter run            # or: flutter build apk --release
```

## Enable Firebase sync (optional)

1. Create the Firebase project (see `../firebase/SETUP.md`).
2. Add Android/iOS apps with package `com.codehubb.dukaanai`; download
   `google-services.json` → `android/app/` and `GoogleService-Info.plist` →
   `ios/Runner/`.
3. Run — the app detects Firebase and starts syncing. Firestore rules in
   `../firebase/firestore.rules` apply.

## What's fictional

All products, PKR prices, stock levels and sales history are invented demo
data for a fictional kiryana store.
