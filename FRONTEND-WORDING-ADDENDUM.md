# Front-end wording addendum to Fix Round 2 (2026-10-24)

**Package:** `dukaan-ai-ERP-H-fixround2-footerfix-wording.zip` — a superset
of `dukaan-ai-ERP-H-fixround2-footerfix.zip`: the same FR2 static build
process, the same rules v11 file (UNCHANGED — no re-paste beyond the
FR2 deploy step), the same FR2 release note, the footer-fix addendum,
plus this addendum at zip root. It supersedes the footerfix package
for upload purposes.

## What changed — front end only, values only

Owner decision 2026-10-24 ~19:52 PKT: remove the remaining
kiryana-store wording from the FRONT END ONLY. No key changed, no
key added or removed (dictionary key counts unmoved: 3,136 × 4 web,
same counts in the four Flutter `strings_*.json` files).

- **SEO title** (`web/app/layout.tsx`, `web/app/page.tsx` — default,
  Open Graph and Twitter titles):
  - old: "Dukaan AI — Smart Kiryana Shop Intelligence"
  - new: "Dukaan AI — Complete ERP for Every Business"
- **SEO description** (`web/app/layout.tsx`):
  - old: "Dukaan AI is a smart inventory, sales and
    demand-forecasting assistant for kiryana stores — with a bilingual
    Urdu/English AI chat that answers from your own shop data."
  - new: "Dukaan AI is a complete ERP for every kind of business —
    smart inventory, sales and demand forecasting, with a bilingual
    Urdu/English AI chat that answers from your own business data."
- **SEO keyword** (`web/app/layout.tsx`):
  - old: "kiryana store software" → new: "business ERP software"
- **OG/Twitter descriptions** (`web/app/layout.tsx`):
  - old: "Inventory, sales tracking and demand forecasting for
    kiryana stores — with a bilingual AI assistant."
  - new: "Inventory, sales tracking and demand forecasting for every
    kind of business — with a bilingual AI assistant."
- **JSON-LD description** (`web/app/layout.tsx`):
  - old: "Smart inventory, sales tracking and demand forecasting for
    kiryana stores, with a bilingual Urdu/English AI assistant."
  - new: "Smart inventory, sales tracking and demand forecasting for
    every kind of business, with a bilingual Urdu/English AI assistant."
- **Home OG/Twitter descriptions** (`web/app/page.tsx`):
  - old: "Stock value, low-stock alerts, today's sales and AI
    insights for your kiryana store."
  - new: "Stock value, low-stock alerts, today's sales and AI
    insights for your business."
- **Inventory meta description** (`web/app/inventory/page.tsx`):
  - old: "Manage your kiryana inventory: add, edit and delete
    products with SKU, stock, cost and sale prices. Low-stock rows
    are highlighted automatically."
  - new: "Manage your business inventory: add, edit and delete
    products with SKU, stock, cost and sale prices. Low-stock rows
    are highlighted automatically."
- **Shop-name placeholder example** (`settings.shopNamePlaceholder`,
  web `web/lib/i18n/parts/settings.ts` EN + UR,
  `settings.ps.ts`, `settings.fa.ts`, and Flutter
  `lib/l10n/strings_{en,ur,ps,fa}.json`):
  - EN old: "e.g. Al-Madina Kiryana Store" → new: "e.g. Your
    Business Name"
  - UR old: "مثلاً المدینہ کریانہ اسٹور" → new: "مثلاً آپ کے
    کاروبار کا نام"
  - PS old: "د بېلګې په توګه Al-Madina Kiryana Store" → new:
    "د بېلګې په توګه ستاسو د کاروبار نوم"
  - FA old: "مثال Al-Madina Kiryana Store" → new: "مثلاً نام
    کسب‌وکار شما"

## Deliberately NOT changed (per the owner's front-end-only scope)

- AI chat system prompt (`web/app/api/chat/route.ts` line 25):
  "smart kiryana/retail shop app" — back end, untouched.
- Demo-seed note (`web/lib/seed-data.json` line 3): "25 kiryana
  products" — file metadata, untouched. (It ships inside the static
  demo bundle's seed chunk by design; it is the single remaining
  "kiryana" string in the built bundle, and that is intentional.)
- Code comments (`web/lib/storefront.ts` line 159 and Flutter
  `lib/core/storefront.dart` line 349) — comments only, untouched.
- Footer, rules files, and everything else — untouched.
- `web/package.json` description still says "kiryana/retail shop
  intelligence" — package metadata, not user-visible UI, left alone
  (flagged here for a later decision if wanted).

## Verification

- Web `tsc --noEmit` clean; `npm run build:static` exit 0.
- Built bundle: new title, new placeholder values and new inventory
  meta present; no user-visible kiryana wording remains.
- TS harness **1,834 / 1,834, exit 0** (re-run against a fresh
  `harness/tsconfig` compile of the edited sources); Flutter
  **506 / 506, "All tests passed!"**, `flutter analyze` 0 issues.
- Rules: UNCHANGED v11 (SHA-256 0f19f56e…); this zip carries the
  identical rules file as fixround2/footerfix.

## Deploy

Upload this zip instead of the footerfix package, and (as with FR2)
re-paste the v11 rules file — required once for FR2, not again for
this addendum. No live verification is claimed here.
