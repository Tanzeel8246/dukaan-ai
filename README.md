# Dukaan AI — Kiryana/Retail Shop Intelligence (Demo)

A complete demo AI portfolio project by **CodeHubb**: smart inventory,
sales tracking, demand forecasting and a bilingual (Urdu/English) AI
assistant for the neighbourhood kiryana store.

Live demo target: **https://dukaan-ai.codehubb.com**

## What's in this package

| Folder | Contents |
|---|---|
| `web-deploy/` | **Ready-to-upload static site** — the built Next.js app (`index.html`, `_next/`, …). Upload these files directly to the `dukaan-ai.codehubb.com` subdomain docroot. |
| `firebase/` | Firestore backend kit: `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `seed.json` (25 products + 14 days of sales), and `SETUP.md` with exact owner steps. |
| `flutter-app/` | Offline-first Flutter companion app (sqflite + optional Firestore sync), with `codemagic.yaml` and a GitHub Actions workflow for cloud APK builds. |
| `README.md` | This file. |

## Stack

- **Web:** Next.js 16 (App Router, static export), React 19, TypeScript — no server needed
- **AI engine:** on-device intent/pattern matcher (Urdu + English), answers computed from live shop data; `lib/ai-engine/llm-adapter.ts` is a clean stub where a real LLM key plugs in later
- **Backend (optional):** Firebase Firestore — the demo runs **without it** on bundled seed data
- **Mobile:** Flutter, sqflite (offline-first), `cloud_firestore` with offline persistence + queued-write retry, Provider state

## Demo walkthrough (2 minutes)

1. **Dashboard** (`/`) — stock value in PKR, low-stock alert count, today's
   sales and profit, a 7-day revenue chart, and AI insight cards like
   *“Super Kernel Basmati Rice will run out in ~3 days at the current rate.”*
2. **Inventory** (`/inventory`) — full CRUD table (SKU, name, stock, unit,
   cost/sale price, reorder level). Low-stock rows glow amber; add a product
   or edit prices and watch the dashboard react.
3. **Sales** (`/sales`) — pick a product, set quantity, record the sale:
   stock decrements instantly and today's revenue/profit/list update.
4. **Forecast** (`/forecast`) — per-product 7-day moving averages, days of
   stock left, and a reorder shopping list with estimated purchase cost.
5. **AI Assistant** (`/assistant`) — chat in Urdu or English. Try:
   - «چاول کا اسٹاک کتنا ہے؟»
   - «کون سی چیز ختم ہونے والی ہے؟»
   - «آج کی فروخت کتنی ہوئی؟»
   - “What should I reorder?”

Every number the assistant quotes is computed live from your data — including
anything you just changed in Inventory or Sales.

## Setup

### Web (subdomain deploy)

No build needed — `web-deploy/` is already built:

1. In Hostinger hPanel, create the subdomain `dukaan-ai.codehubb.com`.
2. Upload the **contents** of `web-deploy/` (not the folder itself) to the
   subdomain's `public_html`.
3. If folders come back as `750` (File Browser quirk → 403 errors), run the
   one-time 755 permission fix, then delete the script.

To rebuild from source (source lives in the project workspace under `web/`):

```bash
cd web
npm install
npm run build   # -> out/
```

### Firebase (optional — demo works without it)

See `firebase/SETUP.md` for the exact owner steps: create project →
enable Firestore → deploy rules/indexes → paste the web config into
`web/.env.local` (placeholders only in this repo — **never commit real
credentials**) → import `seed.json`.

### Flutter app

```bash
cd flutter-app
flutter pub get
flutter analyze
flutter run
```

No Android SDK in this environment — `flutter analyze` and the release APK
are built in CI: `codemagic.yaml` and `.github/workflows/build-apk.yml`.
The app runs fully offline without Firebase; add your
`google-services.json` / `GoogleService-Info.plist` to enable sync.

## Design

Warm shopkeeper-friendly art direction — light mode is warm paper (`#faf7f0`)
with deep brown-ink text, dark mode is deep espresso-charcoal, accents are
profit green (`#15803d`) + amber. Friendly rounded display type (Baloo 2) +
Inter, with Noto Nastaliq Urdu for Urdu text. Light/dark toggle with
localStorage persistence and a pre-paint script (no flash). Responsive with a
hamburger menu at ≤960px. Inline SVG icons only — no emoji in the UI.

## What's fictional

**Everything about the shop is invented:** the 25 kiryana products, all PKR
prices, stock quantities, reorder levels, the 14 days of sales history, and
every insight derived from them. The shopkeeper, the shop name and the sales
figures are a demo narrative. Replace the seed data with a real catalogue
before any real-world use.

---

Demo AI project crafted by [CodeHubb](https://codehubb.com)
