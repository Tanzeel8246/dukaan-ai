# Footer-fix addendum to Fix Round 2 (2026-10-24)

**Package:** `dukaan-ai-ERP-H-fixround2-footerfix.zip` — a superset of
`dukaan-ai-ERP-H-fixround2.zip`: the same FR2 static build process,
the same rules v11 file (UNCHANGED — no re-paste beyond the FR2
deploy step), the same FR2 release note, plus this addendum at zip
root. It supersedes the fixround2 package for upload purposes.

## What changed — one string, values only

The app footer (`shell.footerTagline`, rendered only by
`web/components/Footer.tsx`) positioned the product as a
neighbourhood kiryana shop. The owner asked for professional
general-ERP wording. The key is UNCHANGED; only its value changed,
in all four locales (dictionary key counts unmoved: 3,136 × 4):

- **EN (old):** "Smart inventory, sales tracking and demand
  forecasting for the neighbourhood kiryana store — with an AI
  assistant that answers from your own shop data."
- **EN (new):** "A complete ERP for every kind of business — smart
  stock, sales and accounts, demand forecasting, and an AI assistant
  that answers from your business's own data."
- **UR (old):** "آپ کے محلے کی کریانہ دکان کے لیے اسمارٹ اسٹاک،
  فروخت کا حساب اور طلب کی پیش گوئی — ایک اے آئی معاون کے ساتھ جو
  آپ کی اپنی دکان کے ڈیٹا سے جواب دیتا ہے۔"
- **UR (new):** "ہر قسم کے کاروبار کے لیے مکمل ERP — اسمارٹ اسٹاک،
  فروخت اور حساب، طلب کی پیشن گوئی، اور ایک آئی معاون جو آپ کے
  کاروبار کے ڈیٹا سے جواب دیتا ہے۔"
- **PS (new, machine draft, 0 reviewed):** "د هر ډول کاروبار لپاره
  بشپړ ERP — هوښیار موجودي، پلور او حسابونه، د تقاضا وړاندوینه،
  او د AI مرستیال چې ستاسو د کاروبار له خپلو معلوماتو څخه ځواب
  ورکوي۔"
- **FA (new, machine draft, 0 reviewed):** "يک ERP کامل براي هر نوع
  كسب‌وكار — موجودي هوشمند، فروش و حساب‌ها، پيش‌بيني تقاضا، و يک
  دستيار هوش مصنوعي که از داده‌هاي خود كسب‌وكار شما پاسخ
  مي‌دهد۔"

The brand name "Dukaan AI" and the bottom "تیار کردہ CodeHubb"
line are untouched.

## Deliberately NOT changed (listed, per the owner's scope)

The same kiryana wording also appears in: SEO meta
(`web/app/layout.tsx`, `web/app/page.tsx` — titles/descriptions),
the shop-name placeholder example ("Al-Madina Kiryana Store"),
an inventory page description, the demo-seed note, a code comment,
and the AI chat system prompt. Those are not the footer string
and were left alone; the owner can order a wider rewording
separately. The generated PS/FA review packs were regenerated from
the new dictionaries so their drift base stays current.

## Verification

- Web `tsc --noEmit` clean; `npm run build` and
  `npm run build:static` exit 0.
- Built bundle: the new Urdu and English phrases are present; the
  old "محلے کی کریانہ" / "neighbourhood kiryana" phrases are absent.
- TS harness **1,834 / 1,834, exit 0** (re-run against a fresh
  `harness/tsconfig` compile of the edited sources) with dictionary
  pins unchanged (values only, no key growth); Flutter **506 / 506,
  "All tests passed!"**, `flutter analyze` 0 issues, with the
  mirrored Dart `shell.footerTagline` value in all four
  `strings_*.json` files (the Dart accessor is unchanged — same key;
  Dart JSON key counts hold at 3,136 × 4).
- Rules: UNCHANGED v11 (SHA 0f19f56e…); this zip carries the
  identical rules file as fixround2.

## Deploy

Upload this zip instead of fixround2, and (as with FR2) re-paste
the v11 rules file — required once for FR2, not again for this
addendum. No live verification is claimed here.
