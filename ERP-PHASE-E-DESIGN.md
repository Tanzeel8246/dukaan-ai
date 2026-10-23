# Dukaan AI — ERP Phase E "Print & Brand" — DESIGN

**Status:** Design only — no app code changed by this document.
**Scope:** Phase E of `dukaan-erp-roadmap.md` (invoice designer, letterhead/stamp/signature, Raast QR on receipts, app PIN lock), designed against the live Phase A foundations, the Phase B document prints, Phase C production/job sheets, and Phase D salary slips. Parity target: the owner's MC Billing ERP (custom bill formats, digital stamp/signature, Raast QR, PIN lock).
**Sources read:** `dukaan-erp-roadmap.md` (Phase E), `ERP-PHASE-A-DESIGN.md` (§1.1 subledger-ref pattern, §3.2 matrix, §5 periods, §6 migration), `ERP-PHASE-B-DESIGN.md` (§5 print machinery reuse, §6 RBAC verification style), `ERP-PHASE-C-DESIGN.md`, `ERP-PHASE-D-DESIGN.md` (§2.7 salary slip, §12 open-question style), `PRODUCTION.md` (Complete + Phases A–D + live-audit fixes + shell/theme increments), `web/components/DocPrintSheet.tsx` (all document sheets), `web/components/ReportPrintSheet.tsx`, `web/components/BillingDesk.tsx` (bill receipt + thermal flow + WhatsApp builder), `web/app/globals.css` (receipt rules + `@media print` + `@page`), `web/lib/types.ts` (`ShopSettings`, `BillItem`), `web/package.json` (dependency census), `web/lib/firebase.ts` (no Storage client exists), SBP *Standard for Interoperable QR Code for Person-to-Person & Merchant Payments* v1.0 (DI&SD Circular Letter No. 01 of 2022) — the primary source for §3.

## Non-negotiable invariants carried over (Complete edition + Phases A–D)

Every design choice below is subordinate to these — Phase E must not regress any of them:

1. **Phase E posts NOTHING.** No journal entry, no posting template, no `refType`, no COA code is added, changed or contemplated by this phase. Templates are settings, assets are documents, the QR is a rendering of a settings string, the PIN is device-local state. If implementation ever finds an item that seems to need a posting change, that is a **finding to report**, not a liberty to take (the B §12 discipline) — §12.3 records the one near-miss and why it is not one.
2. **Seed identities are frozen:** the seed journal's output must remain exactly what the harness pins (21 entries · Inventory 272,805 · Cash 50,000 · payables 27,900 · receivables 5,500 · trial balance 0 · seed-journal SHA `e17e5bda…1168`). Every Phase E demo/default is chosen to have **zero journal footprint** — all Phase E settings fields are optional-and-absent by default, and absence reproduces today's behaviour exactly (§10).
3. **Print is theme-independent.** The `.receipt` subtree renders in hard-coded print colours (`#fff` ground, `#1c1410` ink, `#5c4a38` muted, `#c9b797` rules) precisely so the five app themes can never reach the paper. Phase E templates change **structure** (paper, columns, sections, image slots) — never colour (§1.6).
4. **Urdu print shaping goes through the browser print pipeline** (the Reports build's settled decision): no client PDF library exists or is added; `window.print()` + the browser's own shaping is what makes Nastaliq PDFs correct. Phase E adds no print route around it.
5. **A print sheet is a dumb renderer of its document** (B §5.1 / D §2.7 doctrine): figures on paper are the document's own figures or derivations the screen already shows. Template toggles may *omit* a section; they may never alter, recompute differently, or invent a figure. The two display-only derivations Phase E adds (§1.4) are labelled as such and reuse existing, harness-proven machinery.
6. **Migrations never fabricate history** (F-12/F-14): Phase E's settings are additive optionals with read-time defaults; the one new collection is born empty (§10). No `phaseE` migration step is needed at all — stated, not assumed (§10.1).

## Current state (what Phase E builds on)

| Area | Today |
|---|---|
| Bill receipt | One inline receipt markup inside `BillingDesk.tsx` (receipt modal + detail pane), classes `.receipt` / `.receipt-80`; `printBill(thermal)` flips the 80mm class, then `window.print()`. Header = `settings.shopName`, one `.r-shop` line (address · phone), thanks line from `billing.rcpt.thanks`. No logo, no second-language name, no footer note, no QR. |
| Document sheets | `DocPrintSheet.tsx` holds seven more sheets on the same shell (quotation/order, voucher RV-/PV-, challan, PO, credit/debit note, transfer, production, job slip, salary slip) — each hand-rolls the identical shop header. `ReportPrintSheet.tsx` renders the 14 reports as a wide A4 `.receipt.report-doc` in a chosen output language. **Every sheet repeats the header; no shared chrome component exists.** |
| Print CSS | `globals.css`: `.receipt` family + `@media print` (hide app chrome, `visibility` isolates `.receipt-sheet`) + one global `@page { margin: 10mm }`. Receipt colours hard-coded (invariant 3). No per-paper `@page size` mechanism. |
| Settings | `ShopSettings` on the owner doc (`users/{uid}`): `shopName`, `address`, `phone` + the phases' optional fields. Written by `updateSettings(patch)` (owner-only; staff are refused in `SettingsView`). No image field of any kind exists anywhere in the app — no `FileReader`, no canvas, no data-URLs, no Firebase Storage client (`lib/firebase.ts` initialises Auth + Firestore only, though the config carries a `storageBucket` string). |
| Shop name | A single `shopName` string serves both languages. There is no Urdu-name field; the receipt prints the one name regardless of UI language. |
| WhatsApp share | `BillingDesk.waHref` composes a text bill (`billing.wa.*` keys) → `wa.me` link. Text only — no image/PDF attachment exists or is possible via `wa.me`. Phase E does not change it (§12.3). |
| Themes | Five calm themes via `[data-theme]` token sets (shell increment); print is fenced off from them by invariant 3. |
| Dependencies | Exactly four runtime deps: `firebase`, `next`, `react`, `react-dom`. **No QR library.** Static export via `tools/build-static.mjs`; offline-first via Firestore persistent cache. |
| PIN / lock | Nothing. No lock screen, no idle concept, no per-device preference beyond theme (`localStorage: dukaan-ai-theme`) and sidebar state. `AppShell` wraps all non-auth routes; `AuthGate` handles sign-in redirects. Firebase Auth offers `reauthenticateWithCredential` (used nowhere yet). |
| Baseline | Harness **1,188/1,188** green entering Phase E; i18n **2,406 EN ≡ UR**; rules **577 lines** (byte-identical since D4); demo storage **v16**. |

---

## 1. Invoice designer — print templates as settings

### 1.1 The model: one shop template, resolved at render

Templates are **settings on the owner doc**, inside `ShopSettings`, as one optional object. Absent ⇒ today's rendering, field for field (§10.2's regression gate).

```ts
type PrintPaper = "a4" | "a4-compact" | "a5" | "thermal80";
type StampMode = "paid" | "always" | "never";

interface PrintDesign {
  /** Paper/layout for the RECEIPT family (bill + all DocPrintSheet
   *  sheets). Reports ignore this (they are wide A4 documents,
   *  §1.5); thermal selection at the desk still overrides per
   *  print, as today. */
  paper?: PrintPaper;                    // default "a4"
  /** Receipt base type scale: "standard" (today) | "large"
   *  (≈ +12.5% — elderly-counter legibility). Structural only;
   *  never a colour or typeface change (§1.6). */
  fontScale?: "standard" | "large";      // default "standard"

  /* --- header --- */
  showLogo?: boolean;                    // default false (no logo exists until E2)
  logoSize?: "s" | "m" | "l";            // default "m"
  showShopName?: boolean;                // settings.shopName — default true
  showShopNameAlt?: boolean;             // settings.shopNameAlt — default true when set
  showAddress?: boolean;                 // default true
  showPhone?: boolean;                   // default true

  /* --- item table columns (receipt family, §1.4) --- */
  colSku?: boolean;                      // default false
  colUrduName?: boolean;                 // default false
  colTax?: boolean;                      // default false (bill tax summary lines stay)
  colDiscount?: boolean;                 // default false (bill discount row stays)

  /* --- footer --- */
  footerNote?: string;                   // owner's words; "" = none
  termsText?: string;                    // owner's words; "" = none (roadmap: شرائط)
  showThanks?: boolean;                  // default true (billing.rcpt.thanks / custom line)
  thanksText?: string;                   // owner's words; "" = dictionary line
  showSignature?: boolean;               // authorised-signature slot on bills — default false
                                         // (vouchers/slips keep their slots; §2.4)

  /* --- brand slots (assets land in E2; toggles declared here) --- */
  headerMode?: "text" | "letterhead" | "logo-text";  // default "text"
  showLetterheadFooter?: boolean;        // default false
  stampMode?: StampMode;                 // bills — default "paid"
  stampDocs?: { notes?: boolean; vouchers?: boolean; quotations?: boolean };
                                         // default all false (§2.4)
  signDocs?: { vouchers?: boolean; salarySlips?: boolean; bills?: boolean };
                                         // defaults preserve today's paper (§2.4)

  /* --- Raast (E3; declared here so the designer is one object) --- */
  showRaastQr?: boolean;                 // default false
  raastQrSize?: "s" | "m" | "l";         // default "m"
  raastDynamic?: boolean;                // amount+bill-no per bill — default true (§3.4)
}
```

And on `ShopSettings` itself: **`shopNameAlt?: string`** — the shop's name in the other script (an Urdu name for an English-named shop and vice versa; owner's data, never translated, like stage names and warehouse names). The receipt header prints `shopName` then `shopNameAlt` as a second, smaller line — both are the shop's own names, so no dictionary is involved and no language switch changes the paper.

**One template, not per-document templates** — decided, and recorded as Open Question Q1 with the reasoning: a shop has one house style; per-document *sanity* is handled by slot rules (§1.5), not by forking the whole template nine ways. The two genuine per-family differences are structural and handled in the model: paper applies to the receipt family only, and each document class exposes only the slots that make sense for it (§1.5's table).

### 1.2 Resolution — a pure function, one seam

`lib/print.ts` (new) owns:

```ts
resolvePrintDesign(settings: ShopSettings): Required<PrintDesign>
  — every field defaulted; the ONLY place defaults live.
paperPageRule(paper): string
  — the @page payload for a paper ("A4; margin: 10mm" / "A5; margin: 8mm" /
    "80mm auto; margin: 4mm"), asserted by the harness (§9, E1).
```

Every sheet receives the resolved design (callers already pass `settings` to every sheet — the seam exists) and renders through the shared chrome (§1.3). No sheet reads raw settings fields for print decisions again; the settings object stays the storage, `resolvePrintDesign` is the interpretation. That single seam is what makes the E1 regression gate (§9) an assertion about a function rather than a screenshot comparison.

### 1.3 Shared print chrome — `components/PrintChrome.tsx`

The header/footer that nine sheets currently hand-copy becomes two components, consumed by the bill receipt, every `DocPrintSheet` sheet, and (header/footer only) `ReportPrintSheet`:

- **`PrintHeader({ settings, design, assets })`** — renders, in order: letterhead header image (when `headerMode == "letterhead"` and the asset exists — §2) *or* the text header (logo if `showLogo` + asset exists; `shopName`; `shopNameAlt`; the address · phone line honouring `showAddress`/`showPhone`). When letterhead replaces the header, the text block is suppressed wholesale (a letterhead already carries the name/address — printing both is the classic double-header; the suppression is the `headerMode` choice itself, not a fifth toggle).
- **`PrintFooter({ settings, design, assets, doc })`** — renders, in order: footer note (`footerNote`), terms (`termsText`, smaller, labelled by the dictionary terms label), the Raast block (§3.5, bills; quotations optionally), the stamp image (when the §2.4 rule for this document fires), the signature slot (image if uploaded + enabled for this doc, else the existing ruled line where the document has one today), the thanks line (`showThanks`; `thanksText` or dictionary default).
- **`PrintPageStyle({ paper })`** — renders the scoped `<style>` carrying that sheet's `@page` rule (§1.7).

Sheets keep their **bodies** — line tables, totals, document-specific blocks (challan's received-by, production's event log, the slip's earnings tables) — untouched in structure. This is a chrome extraction, not a sheet rewrite; B4–D2's per-sheet figure assertions must pass byte-identical (§9, E1 checkpoint).

### 1.4 Item columns — what is data, what is derivation

The receipt-family item tables (bill, quotation, order, note) share the Item · Qty · Price · Amount shape today. The four toggleable columns, honestly sourced:

| Column | Source | Nature |
|---|---|---|
| SKU | Resolved **live** from the subscribed `products` list by `productId` — `BillItem`/`DocLine` snapshot name/qty/price but **not** SKU | Display-only lookup; a deleted product prints blank. Never a snapshot change (documents are not rewritten for a print option — invariant 5). |
| Urdu name | Same live resolution (`Product.urduName`) | Display-only, as SKU. On the bill it prints as a second line under the item name (thermal width cannot afford a fifth column — layout rule, §1.5). |
| Tax (per line) | `BillItem.taxAmount` — **snapshotted by A4** on bills and on note items (return shares) | Real document data. Quotations/orders have no per-line tax (estimates only, B §7) — the column simply does not exist on those sheets; the toggle is bill/notes-only, stated in the designer UI. |
| Discount (per line) | **Derived at print** by `allocateProRata` (`lib/tax.ts` — the F-3 allocator) spreading the bill's `discountAmount` over line totals | Display-only derivation, exactly the construction the Reports fix already proved for the sales report: shares sum to the bill discount to the paisa by the allocator's final-absorbs rule. Labelled in this design as a derivation so nobody later "optimises" it into a stored field. |

Column order is fixed (Item · SKU? · Qty · Price · Discount? · Tax? · Amount) — owners toggle presence, not order (a column-order builder is settings sprawl for zero counter value; Q1's reasoning).

### 1.5 Per-document sanity — the slot matrix

The template applies through this matrix and nowhere else. "—" = the slot does not exist for that document, whatever the toggles say:

| Slot | Bill | Quotation / Order | Challan | PO | Notes | Vouchers | Transfer | Production | Job slip | Salary slip | Reports |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Paper/layout | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | A4 always |
| Letterhead header/footer | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ (E2) |
| Logo + names + contact | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| SKU / Urdu-name columns | ✓ | ✓ | — (qty-only by B §2.3, **not overridable**) | — (cost doc) | ✓ | — | — | — | — | — | — |
| Tax column | ✓ | — (estimates) | — | — | ✓ | — | — | — | — | — | — |
| Discount column | ✓ | ✓ (doc-level discount exists) | — | — | — | — | — | — | — | — | — |
| Footer note / terms | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | footer note only |
| Stamp | paid rule (§2.4) | toggle | — | — | toggle | toggle | — | — | — | — | — |
| Signature slot | toggle | — | **customer's** line (never the shop signature — it is the receiver's) | — | — | ✓ | dispatched/received lines stay | — | **customer's** line stays | ✓ (employer's) | — |
| Raast QR | ✓ | toggle (static) | — | — | — | — | — | — | — | — | — |

Two invariants ride on this table and are stated so implementation cannot "helpfully" relax them: **a challan can never gain prices or amounts through the designer** (B §2.3's no-second-price-promise rule is a document invariant, not a style), and **the salary slip's figures/sections are the run snapshot's** (D §2.7) — the designer may dress its header/footer but adds and removes nothing in its body.

### 1.6 What the designer deliberately does NOT offer

- **No colour choices.** Print stays the established hard-coded palette (invariant 3). A colour picker would (a) break thermal printing (monochrome), (b) invite exactly the glare the owner's calm-theme directive forbids, and (c) fork the 'print unaffected by theme' rule into 'print affected by print-theme'. Font *size* (two scales) is the one typographic choice; the typeface stays the app's print stack (no downloadable fonts — static export + offline counters).
- **No free-form template editor / HTML / drag-and-drop layout.** The designer is a settings card of toggles + a live preview (§1.8). Anything richer is a page-builder product, not a phase.
- **No per-document full templates** (Q1), **no column reordering** (§1.4), **no watermark/logo-on-every-page for multi-page thermal** (thermal is one continuous sheet; A4 documents are single-sheet by construction in this app).

### 1.7 Paper mechanics

Today one global `@page { margin: 10mm }` serves everything. Phase E makes paper a property of the sheet being printed:

- The app prints exactly one sheet at a time (the `@media print` visibility model isolates `.receipt-sheet`), so the *active* sheet emits its own rule via `PrintPageStyle`: `@page { size: A4 portrait; margin: 10mm }` · `A5 portrait; margin: 8mm` · `80mm auto; margin: 4mm` (thermal). Screen rendering ignores `@page`, so an unprinted sheet's style element is inert; the rule for callers (design-level, enforced by construction): `PrintPageStyle` renders **only inside the sheet instance that is the current print target** — the same selection state that already decides which sheet is mounted for printing (bill modal state, document print state) — never in always-mounted lists.
- Layout classes extend the existing pair: `.receipt` (classic A4: today's measure), `.receipt-compact` (narrower measure ≈ 560px centred, denser rows, −1 step base size — the "bill-book" look), `.receipt-a5` (A5 measure + slightly reduced base size), `.receipt-80` (exists; E1 refinements: lighter dashed rules, QR/stamp sizing hooks, the Urdu-name-as-second-line rule of §1.4).
- **Thermal hard rules** (not toggles): letterhead images are suppressed on `thermal80` (thermal heads render photographs as mud; the text header prints instead), the stamp is suppressed on thermal (same reason; a rubber stamp exists at real counters), logo prints small and centred (thermal branding is the one image that survives monochrome dithering acceptably, and shops expect it).
- The desk's existing **Print / Print 80mm** pair survives unchanged in spirit: *Print* uses the template paper for bills; *Print 80mm* remains the one-off thermal override. The receipt modal previews the template paper's measure.

### 1.8 The designer UI (Settings → "Print & branding")

One Settings card (owner-only, like every settings write) in three groups — **Template** (paper, font scale, header mode, the show/hide toggles, column toggles, footer note/terms/thanks fields), **Brand assets** (E2, §2.5), **Payments & device** (Raast, E3; PIN, E4 — their own cards in their increments; the designer card itself is E1's).

The centrepiece is the **live preview**: the card renders the *real* `PrintHeader` + bill body + `PrintFooter` (the E1-refactored bill sheet) against a **sample bill fixture** (`lib/print.ts: sampleBill()` — a fixed, obviously-fictional bill: sample shop-neutral items, a discount, one tax line, split payment) inside a scaled, screen-only frame labelled **SAMPLE / نمونہ** (screen chrome, never part of the sheet, never printable — the preview container is outside `.receipt-sheet`). Every control edits the *unsaved* design state and the preview re-renders instantly; Save writes `settings.printDesign` once via `updateSettings`. A second preview tab shows a sample **quotation** (the family's other shape) so the owner sees the estimate-labelled variant. Sticky action bar (Save / Reset-to-today's-look) per the standing UI/UX standard; the whole card honours the calm themes (it is screen UI — themes apply normally here; only the *sheet* is theme-fenced).

Defaults discipline: the designer's initial state for a shop with no `printDesign` is `resolvePrintDesign(settings)` — i.e. the preview opens showing *exactly what prints today*, and the owner's first save changes nothing until they move a control. "Reset" deletes the `printDesign` object (back to absence = today's look), it does not write a copy of the defaults.

### 1.9 WhatsApp sharing under the designer

Unchanged in E1–E3 mechanics: the `wa.me` text bill stays text (a template cannot attach an image through `wa.me`). One E3 addition, deliberately small: when Raast is configured, the WhatsApp bill gains one line — the shop's IBAN in text (`billing.wa.raastLine`) — so a customer who cannot scan can still transfer. No other share change; §12.3 records what is NOT attempted (image bills via the share sheet) and why.

---

## 2. Letterhead, stamp & signature — brand assets

### 2.1 The storage decision (weighed, not assumed)

Three candidates for the four-to-five images (logo, letterhead header, letterhead footer, stamp, signature — plus E3's bank-issued QR image):

| | A. Owner doc data-URLs | B. Dedicated `branding` collection docs with compressed data-URLs | C. Firebase Storage |
|---|---|---|---|
| Where bytes live | Inside `users/{uid}` settings doc | `users/{uid}/branding/{kind}` — one doc per asset | Storage bucket objects; URL in settings |
| Hot-path cost | **Bad**: the owner doc is `get()`-ed by rules helpers and subscribed by every client; +800KB inflates every read forever | None on the owner doc; assets load with the print surfaces' own subscription | Extra fetch per device; cached by browser only |
| Doc-size limit (1 MiB) | Whole shop settings + images share one limit — a large letterhead endangers *settings itself* | Per-asset limit with huge headroom (§2.2 caps) | No doc limit |
| Offline counter printing | Yes (Firestore persistence) | Yes (same persistence) | **No** — a Storage URL needs network or a service worker this static build does not have; the counter's offline-first promise (Firestore cache) would silently break for branded bills |
| Demo mode (no Firebase at all) | Works (localStorage blob) | Works identically (demo slice, §7) | **Needs a second code path** — the public demo could never show the feature |
| New deploy surface | None | One additive rules match (§5) | Storage rules file + console setup + bucket provisioning on a **Spark-plan** project (`dukan-8246`) — bucket provisioning for new projects is a Blaze-gated step in current Firebase, contradicting the project's Spark reality and adding a second rules artifact the owner must publish and keep in step |
| Cost at shop scale | — | 4–5 small docs, persistent-cache reads — negligible | Negligible too, but irrelevant given the rows above |

**Decision: B — one `branding` collection, one document per asset kind, payload a compressed data-URL.** It is the only option that works identically in cloud, demo and offline, adds no console surface beyond one additive rules block, and keeps the hot owner doc lean. The `BrandingAssets` access seam (`useStore().branding` — a map by kind) is the single read interface, so if a future phase ever outgrows data-URLs, Storage arrives behind the same seam without touching a sheet (§11, R-E2).

```ts
type BrandingAssetKind = "logo" | "letterheadHeader" | "letterheadFooter"
                       | "stamp" | "signature" | "raastQrImage";  // raastQrImage lands in E3
interface BrandingAsset {
  id: string;                 // == kind (fixed ids — the A2 fixed-id discipline)
  kind: BrandingAssetKind;
  dataUrl: string;            // compressed per §2.2
  mime: "image/png" | "image/jpeg" | "image/webp";
  width: number; height: number;        // encoded pixel size (display sizing + print aspect)
  bytes: number;              // encoded size, shown in Settings (§2.5)
  updatedAt: string;          // ISO instant
}
```

### 2.2 The compression pipeline (upload → stored bytes)

Client-side only, no library (canvas + `createImageBitmap`/`Image` are platform APIs):

1. **Pick** (`<input type=file accept="image/*">`) → decode.
2. **Normalise**: draw onto canvas at the kind's max box — logo ≤ 600×600, stamp ≤ 600×600, signature ≤ 800×300, letterhead header/footer ≤ 1600×400, Raast QR image ≤ 800×800 (never upscale). Background handling: logo/stamp/signature keep **transparency** (PNG, or WebP where the encoder offers it); letterhead encodes JPEG q0.85 (it is a photograph-like banner); a logo with no alpha encodes JPEG/WebP too (decided by a pixel-alpha scan — the pipeline checks, the owner doesn't).
3. **Cap enforcement**: hard caps per doc — logo/stamp/signature ≤ **150 KB**, letterhead ≤ **300 KB**, QR image ≤ **200 KB** encoded (comfortably inside Firestore's 1 MiB with the doc's other fields, and ≈ ≤ 1.05 MB total across all six — safe inside the demo's localStorage budget too, §7). If an encode exceeds its cap, the pipeline steps down (quality −0.1, then max-box × 0.75) up to three times; if still over, it **refuses with the actual numbers** ("this image compresses to 412 KB; the limit is 300 KB — crop or simplify it") rather than storing a degraded surprise. The step-down *plan* (format choice, scale factor, expected step count) is a pure function in `lib/branding.ts` — the canvas calls are DOM, the decisions are testable (§9, E2).
4. **Store**: one `setDoc` per asset (owner-only, §5); replace = overwrite the same fixed-id doc; remove = delete the doc (assets are the one Phase E record that is deletable — they assert no history; a removed stamp simply stops printing, and past prints are paper, not data).

Print rendering uses the stored pixel dimensions for aspect-correct sizing at the design's slot sizes (`logoSize` s/m/l ≈ 14/20/28mm wide on A4, proportionally less on 80mm) — the stored resolution (≥ 300dpi-equivalent at those sizes by the max-box choices) keeps print crisp.

### 2.3 Where each asset prints

- **Logo** — header, per §1.3 (`headerMode: "logo-text"`, or `"text"` + `showLogo`). Centred above the name on A4/A5/compact; small-centred on thermal.
- **Letterhead header** — full-measure banner at the sheet's top, replacing the text header wholesale (`headerMode: "letterhead"`). **Letterhead footer** — banner at the sheet's foot (above the thanks line) when `showLetterheadFooter`. On Reports (E2): letterhead header + footer dress the report doc identically; the report's own title/period block sits beneath the banner. Suppressed on thermal (§1.7 hard rule) in every case — if the template paper is thermal and a letterhead exists, bills fall back to the text header automatically (no owner action, no warning needed — it is the documented behaviour, stated in the designer next to the paper picker).
- **Stamp** — §2.4's rule; rendered in the footer zone, offset toward the totals, at ~70% opacity (a stamp is an impression, not a photograph — full opacity looks pasted), size ≈ 26mm (A4) fixed in v1 (position/size *controls* in the brief are satisfied by the mode + per-doc toggles + the three global asset sizes; a free x/y drag-positioner is rejected — §12.3).
- **Signature** — replaces the ruled signature line where the slot matrix (§1.5) grants the shop's signature: vouchers and salary slips by default; on bills only when `showSignature` is on (then it appears as an "authorised signature" block in the footer). Height ≈ 10mm, baseline-aligned to where the line was. Challan/job "received-by" lines are the **customer's** signature space and are never replaced.

### 2.4 The stamp rule (the roadmap's "auto-stamp on full payment")

For bills: `stampMode: "paid"` (default when a stamp asset exists) ⇒ the stamp prints **iff `bill.status == "paid"`**. A `partially_returned` bill loses the stamp (the paper no longer stands as a fully-settled receipt — the reversal changed what the document asserts, and the stamp asserts settlement); a `held` bill never prints at all today and still doesn't. `"always"` prints on any printed bill state; `"never"` disables without deleting the asset. For notes/vouchers/quotations the per-doc toggles (`stampDocs`) are simple booleans, default off — a shop seal on a quotation is a deliberate choice, not a default. The rule is a pure function `stampVisible(design, asset, docKind, billStatus)` in `lib/print.ts` — harness-asserted across the matrix (§9, E2).

### 2.5 The Brand assets UI (Settings → Print & branding, second group)

One row per asset kind: thumbnail preview (checkerboard behind transparent assets so alpha is visible), encoded size + pixel dimensions readout, Replace / Remove, and the empty state's guidance ("PNG with transparent background works best; max ~150 KB after automatic compression"). Upload performs §2.2 live with a progress state; failures surface the pipeline's own numbers. The designer's live preview (§1.8) consumes the same assets, so the owner sees the stamp land on the sample paid bill before saving anything. RBAC: assets are owner-write; all roles **read** (a cashier's bill must print the logo — §5's rules grant mirrors the `accounts` precedent: read all roles, write owner).

### 2.6 Demo behaviour (assets)

Identical pipeline and caps; assets persist in the demo store blob under a new `branding` slice (demo storage **v16 → v17** at E2 — the standing bump discipline for shape changes). The demo seed ships **no** assets (the public demo prints today's clean look; the designer preview uses a drawn placeholder monogram, screen-only, never stored).

---

## 3. Raast QR on receipts

### 3.1 The honesty section — what can and cannot be generated

This design read the primary source (SBP's *Standard for Interoperable QR Code*, v1.0, March 2022) rather than assuming "Raast QR = generic EMVCo". The standard contains **two different instruments**, and conflating them is how fake QRs get shipped:

1. **The merchant (P2M) standard QR** — a true EMVCo merchant-presented payload: Payload Format Indicator `01`, Merchant Account Information templates at IDs **28–30 reserved for Raast**, MCC (52), currency `586` (53), country `PK` (58), merchant name (59), city (60), CRC at 63. **Its MAI content is acquirer-issued**: §9.2.2 of the standard states the scheme/acquirer devises the MAI format *"including merchant ID and acquirer's identification code"*. A shop does not possess a Raast merchant ID or acquirer code unless its bank issued them. **Conclusion: the app cannot mint a genuine Raast P2M merchant QR from an IBAN, and Phase E does not pretend to.** Any design that formats an EMV payload with an invented MAI is producing a code that banking apps will reject at the scheme layer — worse than no QR.
2. **The P2P interoperable QR** — SBP's own proprietary template (the same standard, first half), designed for person-to-person transfers and explicitly used by merchants' customers to pay a beneficiary: a flat sequence of numbered data objects —
   `00` Payload Format Indicator = **`02`** (the P2P value) · `01` Point of Initiation (`11` static / `12` dynamic) · `02` Scheme Identifier (**`30` = Raast**) · `03` FI name (optional, ≤ 25) · `04` **IBAN (24, mandatory)** · `05` Amount (≤ 10, conditional — absent when the payer is prompted) · `06` Particulars (optional, ≤ 30) · `07` reserved · `10` CRC (4, mandatory, last — CRC-16 as defined in EMV QRCPS, i.e. CRC-16/CCITT over the preceding payload including the `10` object id).
   This payload is constructible **entirely from facts the owner knows** (their IBAN, their bank's name) — no issued credential is involved, because a P2P transfer needs none: the customer's banking app routes it over Raast to that IBAN (§4.5 of the standard). The standard says FIs *generate* these for customers (§4.1) — generation is a formatting act over the customer's own IBAN, and a formatter that follows the published template produces the same string the bank's formatter would.

**Phase E therefore ships two honest paths, in this order of trust:**
- **Path 1 (zero format risk): the bank-issued QR image.** The owner saves the Raast QR from their own banking app (P2P or P2M — whatever their bank gave them) and uploads it as the `raastQrImage` brand asset (§2). The app prints the bank's own artifact verbatim. This always works, including true P2M tills.
- **Path 2 (generated): the SBP P2P static/dynamic QR** built by `lib/raast.ts` from the owner's IBAN (§3.2–3.4), labelled on paper exactly as what it is (§3.5) and verified per §3.6 before the release is called done. When both exist, **the uploaded bank image wins** (it is the acquirer/FI-issued artifact); the generated code is the fallback for owners whose bank app won't export an image.

What the printed copy may claim: "Pay via Raast — scan with any banking app" + the IBAN in text. What it may never claim: "Raast P2M merchant QR" for the generated path.

### 3.2 Settings & validation

On `ShopSettings` (owner-written, like all settings):

```ts
raastIban?: string;        // normalised: upper-case, no spaces
raastFiName?: string;      // object 03 — owner's bank name, optional, ≤ 25 chars
```

**IBAN validation is full ISO 13616**, client-side, at entry: Pakistani IBAN = `PK` + 2 check digits + 4-letter bank code + 16-digit account = 24 chars; structure regex **and** the mod-97 checksum must pass before Settings will save (an IBAN with a typo'd digit must be refused at the desk, not discovered by a customer's failed scan). The validator is pure (`lib/raast.ts: validatePkIban`) with known-answer vectors in the harness (valid canonical IBANs, single-digit corruptions which mod-97 must catch, wrong lengths, non-PK prefixes — a non-PK IBAN is refused: Raast is domestic). **A Raast *alias* (mobile number) is not accepted as a substitute** — the published P2P template's beneficiary object is the IBAN; there is no alias object to put a phone number in. The Settings copy says so plainly and tells the owner where their IBAN is printed (cheque book / bank app). This is a limitation of the standard, stated, not a gap to paper over by inventing an object.

### 3.3 The payload builder (`lib/raast.ts`, pure)

```
buildRaastP2pPayload({ iban, fiName?, amount?, particulars? }): string
  objects in template order:
    "00" + "02"
    "01" + (amount present ? "12" : "11")          // dynamic iff amount embedded
    "02" + "30"                                     // Raast
    "03" + fiName            (if provided, ≤ 25)
    "04" + iban              (24)
    "05" + amount            (if present — §3.4 formatting)
    "06" + particulars      (if present, ≤ 30, ASCII-safe — §3.4)
    "10" + crc16Ccitt(payload-so-far + "10") as 4 upper-hex chars
```

- **Framing — the one open implementation fact, handled honestly.** The standard's table fixes each object's id, order, format and length, and the fixed-length objects (00/01/02 = 2, 04 = 24, 10 = 4) are unambiguous in a concatenated stream; the variable objects (03/05/06) are where an implementer must confirm whether the bank-generated framing carries an explicit length element or relies on fixed positions/next-object scanning. Phase E does **not** guess this in the design. E3's first task is a **conformance fixture**: decode the owner's own bank-app-generated Raast P2P QR (every Raast bank app displays one for the account), capture its exact framing (IBAN redacted in the committed fixture), and make the builder reproduce that framing byte-for-byte for equal inputs. §9 E3's harness carries that fixture as the conformance vector plus structural tests (object order, scheme value, CRC self-check via the round-trip parser the same increment writes — builder and parser are written together so "it parses" is a proof, not a hope).
- **CRC**: CRC-16/CCITT (poly `0x1021`, init `0xFFFF`) per EMV QRCPS, computed over the full payload up to and including the CRC object's id, rendered as 4 uppercase hex characters. Known-answer vectors in the harness include the EMV literature's canonical example.
- **Amount formatting** (object 05): numeric, at most one decimal point, no thousands separators, trailing-zero-trimmed (`1500`, `1500.5`); bills are whole rupees in this app, so the common case is an integer string ≤ 10 chars; an amount ≥ 10 chars is refused at composition (cannot happen for any real bill; the guard exists so the builder never emits an over-length object).
- **Particulars** (object 06): `Bill #<billNo>` for dynamic bill QRs — ASCII-only by construction (bill numbers are ASCII), ≤ 30 trivially. Free-text particulars are NOT offered (Urdu text in a banking payload is an encoding hazard the standard's `ans` class does not bless; the bill number is the useful content anyway).

### 3.4 Static vs dynamic on bills

- **Bills (default, `raastDynamic: true`)**: per-bill **dynamic** QR — object 01 = `12`, amount = the bill's balance due (for a fully-paid bill: the bill total, so the paper still offers scan-to-pay for a customer settling later — no: a paid bill needs no payment. Rule: the QR prints on bills with an amount outstanding OR on the receipt at payment time? The receipt prints *after* payment in this app's flow. Decision: the bill QR encodes the **bill total** as a payment invitation on the customer's copy whenever `showRaastQr` is on — it is the customer's proof-of-amount artifact; for credit bills it is genuinely the payment route. The amount embedded is `bill.total` (what the bill charges), not a live balance (paper cannot know later repayments; overstating a *remaining* balance on old paper would be wrong in the other direction — the particulars' bill number lets the shop reconcile). This paragraph is the design's stated semantics; the Settings copy mirrors it in one line.
- **Quotations (toggle, default off)**: **static** QR (no amount object; the customer keys the amount) — a quotation's total is an estimate (B §7) and embedding it as a payment amount would harden an estimate into a demand.
- The **counter poster** is out of scope as a feature but free by construction: Settings → Raast shows the static QR (no amount) at screen size with a Print button (it prints through the same sheet machinery on a minimal poster sheet) — the owner tapes it to the counter. (One small sheet, E3; it is the highest-value Raast surface a small shop has.)

### 3.5 Print & screen integration

- **Bill receipt**: the QR block sits in `PrintFooter`'s Raast slot (bills; quotations per §3.4): QR image (SVG, §3.7) at `raastQrSize` (≈ 22/28/36mm on A4; capped 28mm on thermal), beneath it the caption line (dictionary: "Scan with any banking app to pay via Raast" / Urdu equivalent) and the **IBAN printed in text** (grouped in 4s) — a failed scan must still leave a manual Raast transfer possible from the same paper. When the `raastQrImage` asset exists it prints instead of the generated matrix, at the same slot/size, with the same caption + IBAN text.
- **Settings → Payments (Raast) card**: IBAN + FI-name fields with live validation state, the generated payload rendered as a QR **on screen** the moment the IBAN validates (so the owner can scan-test it with their own banking app *before saving* — the cheapest verification loop there is), the payload string itself in a monospace disclosure (for the §3.6 fixture comparison), and the static-poster print button. Save is refused while the IBAN is invalid.
- **WhatsApp**: the one text line of §1.9.

### 3.6 Verification protocol (release gate, not a hope)

E3 does not ship on unit tests alone. The increment's release checklist (recorded in PRODUCTION.md by the implementer) requires: (1) the §3.3 conformance fixture captured and the builder byte-equal against it; (2) the generated QR for the owner's real IBAN scan-tested in **two different banking apps** (the owner's own + one other) showing the correct beneficiary IBAN and, for a dynamic code, the correct amount — done by the owner at rollout, with the outcome recorded; (3) if any app rejects the generated code, the release notes say so and Path 1 (bank image) becomes the documented route — the feature degrades to the honest path rather than shipping a broken promise. This protocol exists because a QR that renders is not a QR that pays, and this codebase's audit culture does not ship unverified money surfaces.

### 3.7 Rendering the matrix — the dependency decision

`package.json` carries four runtime deps and **no QR encoder**. Candidates:

| Option | Verdict |
|---|---|
| Hand-roll a QR encoder (Reed–Solomon over GF(256), mask evaluation, format/version info) | **Rejected.** ~500 lines of error-prone arithmetic whose failure mode is a QR that *renders* but doesn't scan — the worst kind. It would need the same known-answer vectors the lib already passes, to re-prove a solved problem. |
| `qrcode` npm package | Workable (browser build exists) but pulls a server-oriented dependency tree (pngjs etc.) into a static-export bundle for one matrix. |
| **`qrcode-generator` (Kazuhiko Arase, MIT, zero-dependency)** | **Chosen.** The single most widely deployed JS QR encoder; one small module; produces the module matrix (`addData`/`make`/`isDark`), from which a tiny React component renders an **SVG** (crisp at print sizes, no canvas raster, no data-URL). Byte mode, error-correction level **M** (the payment-QR convention; the payload is short — a static payload is ≈ 45–60 chars ⇒ a low-version symbol with large, forgiving modules). |
| Vendor the same file into `lib/vendor/` | Acceptable equivalent if the build objects to a fifth dep; the design's requirement is the *encoder's provenance*, not the delivery mechanism. Implementation chooses npm-add (provenance + updates) unless the static build says otherwise; either way the license header rides along. |

Rendering rules: quiet zone of 4 modules honoured in the SVG viewBox (scanners need it), black modules on white — **always**, regardless of app theme or print template (a themed QR is an unscannable QR; this is invariant 3's sharpest application). The SVG component lives in `components/QrCode.tsx`, takes the payload string, and is the ONLY QR renderer (designer preview, Settings, poster, receipts all consume it).

---

## 4. App PIN lock

### 4.1 Scope, stated before the design (the honesty the brief requires)

The PIN lock is a **counter-privacy convenience**: it stops a walk-up hand — a customer, a child, a visitor at an unattended till — from browsing the shop's books on a device that is already signed in. It is **not** an account-security boundary, and the design + the UI copy (§4.7) say so in plain words:

- Anyone who knows the **account password** can remove the PIN (§4.5) — by design.
- The PIN is 4–6 digits: at most a million combinations, stored as a salted slow hash (§4.3) so a *casual* peek at local storage finds nothing usable — but this design does not claim resistance to a determined attacker with the device and time. Rate friction (§4.4) blunts guessing at the keypad; it does not make 4 digits strong.
- The real security of the shop's data remains what it has always been: Firebase Auth + the Firestore rules. The PIN changes nothing there, gates nothing server-side, and **Phase E adds no rules for it** (§5).

### 4.2 The model — device-local, per-device, never synced

```ts
// localStorage key "dukaan-ai-pinlock" — device storage ONLY.
// Never in Firestore, never in ShopSettings, never in the demo blob.
interface PinLockRecord {
  v: 1;
  salt: string;          // base64, 16 random bytes, per record
  hash: string;          // base64 — PBKDF2-HMAC-SHA256(pin, salt, 150_000), 32 bytes
  iterations: 150_000;
  digits: 4 | 5 | 6;     // the length chosen at set time (Q3)
  setAt: string;         // ISO instant (display only)
}
interface PinLockPrefs {           // same key's prefs half, or a sibling key
  idleMinutes: 0 | 1 | 5 | 15 | 30;   // 0 = lock on launch only; default 5
  gateSensitive: boolean;             // E5 — default false
}
```

- **Per device is literal**: the counter tablet and the owner's phone hold different records (or none); setting a PIN on one says nothing about the other. Settings' PIN card is titled and worded as **"This device's lock"** so the model is never misread as an account setting.
- The record survives sign-out/sign-in (it guards the *device's* app, whoever's session is live) and survives the demo data reset only via the explicit recovery path (§4.5) — `resetDemo` itself does **not** clear it (a reset is a data act; the lock screen's own erase path is the PIN act, §4.5).
- No PIN ⇒ no lock UI anywhere (except the Settings card offering to set one). The public demo ships with no record (§7).

### 4.3 Hashing

PBKDF2-HMAC-SHA256 via **WebCrypto `SubtleCrypto`** (`deriveBits`), 150,000 iterations, 16-byte random salt, 32-byte output — platform API, no dependency. Verification recomputes and compares in constant time over the decoded bytes. 150k iterations is a deliberate middle: ~100–300ms on a modest counter tablet (felt as a beat on unlock, acceptable) while making offline dictionary grinding of a 4-digit space meaningfully slower per guess than a bare SHA-256 — the design states this is friction, not strength (§4.1). `lib/pinlock.ts` is written against an **injectable SubtleCrypto** (default `globalThis.crypto.subtle`) so the harness — which runs under Node, where `crypto.webcrypto.subtle` exists — exercises the *same* code path, including published PBKDF2 known-answer vectors (§9, E4). The plaintext PIN exists only in component state during entry; it is never logged, never stored, never put in a URL or a dictionary string (grep-level harness assertion, §9).

### 4.4 Behaviour — launch, idle, manual

Enforcement lives in **`PinGate`**, mounted inside `AppShell` around the non-auth branch (auth paths are exempt — a lock over the login form would lock the recovery route too), active only when a session context exists (signed-in cloud user, or demo mode):

- **On launch**: if a record exists, the app opens **locked** (the shell renders the lock screen instead of the app; data subscriptions may run beneath — the lock is a screen, not a data gate, stated honestly: Firestore persistence means data is on the device regardless; §4.1's model is about the *casual* hand).
- **Idle**: a timer reset by pointer/keyboard activity anywhere in the app; at `idleMinutes` (when > 0) the lock engages. `visibilitychange` to hidden starts the same countdown from the hidden instant (a backgrounded tab locks on schedule, not on return-plus-elapsed-surprise — the lock engages when the timer fires or, if the tab was frozen, immediately on return if the deadline passed while hidden).
- **Manual**: when a record exists, the header cluster gains a lock icon (beside logout) that locks immediately — the "I'm stepping away" act.
- **Unlock**: numeric pad (on-screen digits + physical keyboard, 4–6 boxes), auto-submit at full length, wrong PIN ⇒ shake + clear + attempt counter; **friction schedule**: after 5 consecutive failures, a 30-second pause (keypad disabled, countdown shown); the pause doubles per further 5 (30s → 2m → 5m cap) — device-local counters, reset on success. The schedule is a pure function (harness-asserted, §9 E4) — friction, honestly labelled in copy as making guessing slow, not impossible.
- **Lock screen content**: shop name (from settings — a locked device should still say whose till it is), the PIN pad, "Forgot PIN?" (§4.5), and nothing else — no balances, no nav, no data. Calm-themed screen UI (themes apply; it is not print).

### 4.5 Recovery — the account password is the key

- **Cloud mode**: "Forgot PIN?" → a password field for the **currently signed-in account** → Firebase `reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password))`. Success ⇒ the PIN record is deleted, the app unlocks, and the user is routed to Settings → Device lock to set a new one if wanted. Failure ⇒ the Firebase error, surfaced plainly; the lock stays.
  **Whose password?** The signed-in user's own — including a staff session. This is deliberate and stated (§4.1): the threat model is the walk-up stranger, not the account holder; a staff member who can reauthenticate *is* an authorised account holder, and the alternative (owner-only recovery) strands a staff-run counter whenever the owner is away — a worse failure for the shops this serves. The Settings PIN card additionally requires, to *change or remove* the PIN while unlocked, either the current PIN or the same password reauthentication — so an unlocked-but-unattended moment cannot quietly strip the lock either.
- **Demo mode**: there are no passwords. The lock screen's recovery is **"Erase demo data and remove PIN"** — the existing demo-reset semantics *plus* record deletion, behind a typed confirmation (the shop-name field pattern the app already uses for destructive confirms). Demo data is disposable by definition; this is honest for demo and is labelled demo-only in the UI.

### 4.6 Sensitive-action gating — recommendation: YES, optional, narrow (E5)

The brief asks for a recommendation; it is: **ship it, default OFF, device-local, over a short high-value list.** Rationale: the launch/idle lock protects an *unattended* device; the realistic counter risk is the *attended* one — the owner steps to the back while a helper runs the till, and the acts that can hurt are few and known. Gate list v1 (each already owner/manager-class in the matrix; the PIN adds the device's second factor of presence):

- Void a posted bill · Day-close submit · Period close / reopen (Settings) · Fiscal-year close / reopen.

Payroll finalise/payments and loan drawdown/repayment were considered and **excluded** from v1: they are accountant-desk flows, often on a different device that may carry no PIN, and their own role gates + journal audit trail are the control there; adding PIN friction to every salary payment would train users to disable the feature. The list can grow by owner demand without design change (the seam is one hook).

Mechanics: gating applies **only when this device has a PIN record AND `gateSensitive` is on** — otherwise every gated action behaves exactly as today (no hidden dependency on a device feature). Implementation seam: a `usePinGate()` hook in the PinGate provider exposing `requirePin(actionLabelKey): Promise<boolean>`; gated call sites `await` it before composing any write (view-layer precondition — **no store action signature changes, no posting changes**, invariant 1). A cancelled/failed challenge composes nothing. The lock state machine treats a satisfied challenge as activity (it does not reset the idle timer's epoch — it *is* activity).

### 4.7 Copy (the honesty, in the product)

The Settings card and the lock screen carry a short dictionary-written explanation, both languages, to this effect: *"The PIN keeps this device's app private from casual use at the counter. It is not a replacement for your account password — anyone who knows the account password can remove the PIN. Your shop data stays protected by your account sign-in."* No string anywhere calls the PIN "security" unqualified. (Strings themselves are implementation work, §8.)

### 4.8 Demo behaviour (PIN)

Fully functional in demo (localStorage works the same); **no record is seeded** and the demo never opens locked. The Settings card in demo explains the erase-recovery (§4.5) instead of password recovery (the card renders per mode, like the rest of the app).

---

## 5. RBAC & rules

**Phase E needs exactly one rules addition** (in E2) and two verifications:

```
match /branding/{kind}     read: canAccess
                           create, update, delete: isOwner
```
- Assets are shop branding: every role must *read* them (a cashier's bill prints the logo/stamp — the `accounts` precedent: read all roles, write owner), only the owner writes (they ride in Settings, which is owner-only in the client already; rules make it real).
- **Templates need no rules**: `printDesign`, `shopNameAlt`, `raastIban`, `raastFiName` are fields on the owner doc, whose write has been owner-only since v3. Staff clients read them inside settings as they already do (the receipt needs them at every desk — same posture as `docSeries`).
- **The PIN needs no rules and no Firestore presence at all** (§4.2) — a device-local record is invisible to the backend by construction. Stated explicitly so a future implementer does not "sync" it.
- Rollout follows the standing R-1 discipline: the `branding` match publishes **before** the E2 build (it only *adds* a collection the old app never names, so early publish is safe for the old app — the §6.2-of-D compatibility shape).

**RBAC matrix**: no new rows. The designer + brand + Raast cards live in Settings (owner-only surface — the matrix's Settings rows already say so); the PIN card is device-local state, operated by whoever holds the device, with change/remove guarded by §4.5's current-PIN-or-password rule rather than by role (a role gate on a device feature would be theatre — the device is the boundary). The header lock button shows to any role when a record exists (locking is always safe to offer).

---

## 6. Period-lock & tax interplay

**None, by construction** — and stated so it is a verified property, not an oversight: Phase E writes no journal entries (locks have nothing to gate), computes no tax (the designer's tax *column* displays A4's snapshotted `taxAmount`; template changes never recompute a posted figure), and locks no periods (the PIN's "lock" is a screen state that shares only a word with period locks — the dictionary keeps the two vocabularies distinct, §8, so no user confuses the device lock with an accounting lock).

One interaction is worth naming: the E5 gate list includes period close/reopen and FY close/reopen — the PIN challenge is a *precondition in the view layer* before those existing actions run; the actions themselves, their store guards and their rules backstops are untouched.

---

## 7. Demo-mode behaviour (consolidated)

| Feature | Demo behaviour |
|---|---|
| Designer + preview | Full. Settings live in the demo blob; sample-bill preview included; defaults = today's look. No storage bump in E1 (optional settings fields read with defaults — the demo blob's settings object simply lacks them until saved). |
| Brand assets | Full pipeline + caps; persisted in a new `branding` slice → **demo storage v16 → v17 at E2**. No assets seeded. |
| Raast | No IBAN seeded ⇒ nothing prints. The Settings preview renders a QR from a clearly-fake, checksum-valid **test IBAN** only inside the Settings card, badged as a sample — the public demo must never carry a payable-looking real IBAN. Poster print works off that sample in demo. |
| PIN | Fully functional (localStorage); never seeded; recovery = the demo erase path (§4.5). |

---

## 8. i18n — new dictionary-key categories (enumerated, not written)

All Phase E UI strings go through the typed dictionaries (EN/UR parity is compile-enforced); journal memos are untouched (Phase E writes none). Owner-data strings (shop names, footer note, terms, FI name) are data, never dictionary — the standing rule. New part file **`print.ts`** (designer + brand + Raast) + a **`pin` block** (in `print.ts` or `settings.ts` — one home, implementer's choice) + small additions to `settings.ts`/`shell.ts`. Estimated ≈ **150–190 new keys**:

- **Designer** (~45): section titles, paper names (classic A4 / compact A4 / A5 / thermal 80mm), font scale, header mode labels, every toggle label + its one-line consequence (e.g. letterhead-suppresses-on-thermal note), column labels (SKU / Urdu name / tax / discount) + the bill-only note for tax, footer note + terms fields, thanks toggle + custom line field, signature toggle, sample/preview labels + SAMPLE badge, save/reset + saved confirmations, "defaults = current look" explainer.
- **Brand assets** (~30): per-kind labels + guidance (logo / letterhead header / letterhead footer / stamp / signature / bank QR image), upload/replace/remove, size + dimensions readouts, compression progress + the over-cap refusal (with figures), transparency tip, stamp mode labels (on paid bills / always / never) + per-doc toggle labels, signature-doc labels.
- **Raast** (~30): card title + explainer (what the generated code is — §3.1's honesty in one short paragraph), IBAN field + validation errors (format / checksum / not-PK), FI name field, "test it with your banking app before saving" hint, payload disclosure label, static/dynamic labels + the §3.4 semantics line, QR size + show toggles, poster print action, receipt caption line, WhatsApp IBAN line (`billing.wa.raastLine`), bank-image-preferred note.
- **PIN** (~40): card title ("This device's lock") + §4.7 honesty paragraph, set/change/remove actions, digit-length choice, current-PIN + password prompts, idle-time choices, lock screen (shop line, pad labels, forgot link, pause countdown, wrong-PIN), recovery (password field, demo erase path + confirm), header lock aria-label, sensitive-gate toggle + challenge title per action (void / day close / period / fiscal close).
- **Sheet additions** (~10): terms label, authorised-signature label, Raast caption (above), estimate-safe variants where a footer slot is new on a sheet that lacked one.

Print-sheet *body* strings are inherited from the existing parts (`billing.rcpt.*`, `doc.*`, `slip.*`, `rep.*`) untouched.

---

## 9. Implementation order — increments E1…E5

Each increment: independently shippable (distinct zip, PRODUCTION.md update, rules published first where it adds a collection), closing with its checkpoint. The frozen seed identities and **all prior suites (1,188)** are re-verified at EVERY checkpoint; Phase E's finance-audit checkpoint is degenerate by design — it asserts *zero* journal effect (invariant 1) rather than new identities.

### E1 — Print design foundation + invoice designer (receipt family)
- `lib/print.ts`: `PrintDesign` types + `shopNameAlt` on `ShopSettings`, `resolvePrintDesign`, `paperPageRule`, `sampleBill()` fixture, `stampVisible` (stub rule over modes until assets land in E2 — the function ships with its tests now, the image slot renders nothing without an asset).
- `components/PrintChrome.tsx`: `PrintHeader` / `PrintFooter` / `PrintPageStyle`; the bill receipt (BillingDesk) and all `DocPrintSheet` sheets refactored onto the chrome — **bodies untouched**; new layout classes (`.receipt-compact`, `.receipt-a5`, thermal refinements); shared items-table with the §1.4 column model for bill/quotation/order/note sheets.
- Settings → Print & branding card (Template group) with the **live preview** (sample bill + sample quotation tabs) per §1.8.
- **Rules:** none (owner-doc fields only). Demo storage unchanged.
- **Audit checkpoint:** `resolvePrintDesign` of a settings object with NO `printDesign` reproduces today's sheet structure exactly — asserted as a resolved-model snapshot (paper a4, header = name+address+phone, columns = the current four, footer = thanks only) plus per-sheet DOM-structure fixtures carried from the B/C/D suites passing **unchanged**; the discount-column derivation sums to the bill discount to the paisa on the F-3 fixture bills (allocator reuse, incl. a partially-returned bill); the tax column equals `taxAmount` snapshots on the A4 fixtures; `paperPageRule` strings for all four papers; toggling every field changes exactly its slot in the resolved model (a full toggle-matrix sweep over the sample bill); seed identities + SHA intact; i18n parity compile-clean.

### E2 — Brand assets (logo, letterhead, stamp, signature)
- `branding` collection (COLLECTION_NAMES + demo slice, storage v16 → **v17**); `lib/branding.ts` compression *planner* (pure) + the canvas pipeline; `useStore().branding` seam; asset slots wired into `PrintChrome` (header modes, letterhead footer, stamp rule §2.4, signature slots §1.5); **Reports gain letterhead header/footer**; Settings Brand-assets group (§2.5) + designer preview consuming real assets.
- **Rules:** the `branding` match of §5, published first.
- **Audit checkpoint:** the planner's decisions reproduce hand-computed expectations (format choice by alpha presence, scale factors at box edges, step-down sequence, refusal at the floor with correct figures); caps are hard (no input image produces a stored payload over its cap — property-style sweep over synthetic dimensions/sizes); `stampVisible` matrix (paid/partially-returned/held × paid/always/never × asset present/absent) exact; asset removal ⇒ slot disappears with settings untouched; a shop with no assets prints byte-identical sheets to E1 (structure fixtures re-run); thermal suppression of letterhead/stamp asserted in the resolved render model; seed identities intact.

### E3 — Raast QR (payload, renderer, Settings, poster)
- **First task — the §3.3 conformance fixture** (decode a bank-generated Raast P2P QR; pin its framing; builder matches byte-for-byte). `lib/raast.ts`: `validatePkIban` (structure + mod-97), `buildRaastP2pPayload`, `parseRaastP2pPayload` (round-trip partner), CRC-16/CCITT. Dependency: **`qrcode-generator`** added (§3.7) + `components/QrCode.tsx` (SVG, EC level M, 4-module quiet zone). Settings Payments (Raast) card (§3.5) with live scan-test preview + payload disclosure; `raastQrImage` asset kind activated in the E2 machinery (bank image preferred over generated); bill/quotation print integration (footer slot + caption + text IBAN); WhatsApp IBAN line (§1.9); static **counter poster** sheet.
- **Rules:** none (settings fields + an asset kind on the existing match).
- **Audit checkpoint:** IBAN vectors (valid canonical PK IBANs pass; every single-digit corruption fails mod-97; wrong length/prefix refused); CRC known-answer vectors incl. the EMV literature example; builder output for the fixture inputs == the captured bank framing byte-for-byte; parser round-trips every builder output (object-by-object equality, CRC verifies); dynamic vs static object sets exact (amount present ⇔ initiation `12`); amount formatting edge cases (integer, one-decimal, over-length refusal); particulars is the ASCII bill label only; QR matrix for a known payload == the reference encoder's module matrix for the same payload (the lib's own test vectors); the release's §3.6 live scan-verification recorded in PRODUCTION.md before the zip is called done; seed identities intact.

### E4 — PIN lock (launch / idle / recovery)
- `lib/pinlock.ts` (record shape, injectable-SubtleCrypto PBKDF2, verify, friction schedule, idle state machine as a pure reducer); `PinGate` in `AppShell` (lock screen, activity listeners, visibility handling, header lock button); Settings → Device lock card (set/change/remove per §4.5's current-PIN-or-password rule; idle choice; §4.7 copy); recovery flows (cloud reauthentication; demo erase); auth paths exempt; **no rules, no Firestore writes anywhere in this increment** — asserted, not assumed.
- **Audit checkpoint:** PBKDF2 known-answer vectors through the app's own code path (Node subtle adapter); verify accepts the set PIN and rejects neighbours (wrong digit, wrong length); the record in storage contains no substring of the PIN and matches the §4.2 shape (grep + shape assertions); the idle reducer's transitions (launch-with-record ⇒ locked; activity resets; deadline-while-hidden ⇒ locked on return; success clears failure count; friction pauses at the §4.4 schedule points); changing/removing without current PIN or password is refused at the logic seam; demo erase clears record + data together; **zero** Firestore writes across a full lock/unlock/recover cycle (store-spy assertion in the harness's demo harness mode); seed identities intact (trivially — nothing posts).

### E5 — Sensitive-action PIN gating
- `gateSensitive` pref + `usePinGate().requirePin` seam; gated call sites: void bill (BillingDesk), day-close submit (DayCloseView), period close/reopen (PeriodsPanel), FY close/reopen (FiscalClosePanel) — challenge renders through PinGate's overlay machinery; cancellation composes nothing.
- **Rules:** none. **Store:** no signature changes (view-layer precondition only, §4.6).
- **Audit checkpoint:** the gate matrix at the composition seam — {no record, record+toggle off, record+toggle on} × {challenge pass, challenge fail/cancel} — asserts writes composed exactly in the allow cases and **zero** writes in every deny case, for all four actions; a satisfied challenge does not disturb the idle epoch (§4.6); with no record, all four actions behave byte-identically to pre-E5 (prior suites unchanged); seed identities intact.

### Phase-end checklist (Phase E close — all must pass)
- Full harness green (1,188 prior + E1–E5 suites); frozen seed identities + SHA re-verified; i18n parity compile-clean with the §8 keys landed.
- **Zero-posting proof**: grep-level + harness assertion that no Phase E module imports a posting path (`guardPostings`/`postEntry`/`makeEntry` untouched by print/pin modules); rules diff vs the D-state file is exactly the one additive `branding` match.
- Print regression: every pre-E sheet's body structure fixtures pass unchanged; with no `printDesign` and no assets, printed output is today's output.
- The §3.6 Raast live-verification is recorded (or the generated path is explicitly held back and Path 1 documented — an honest either/or, never silent).

---

## 10. Migration & compatibility

### 10.1 There is no migration step — deliberately

Every Phase E settings field is optional with a read-time default (`resolvePrintDesign`, `raastIban` absent ⇒ feature off, PIN record absent ⇒ no lock). The `branding` collection is born empty and absence is meaningful (no assets = text header, as today). No `phaseE` flags, no backfill, no owner-sign-in step — the A §6 flag machinery exists for steps that *write*; Phase E writes nothing on anyone's behalf. If a future increment ever needs a settings default persisted, it hangs on the established pattern then.

### 10.2 Compatibility matrix

| Combination | Behaviour |
|---|---|
| Old app + old rules | Untouched (today's live state). |
| Old app + E2 rules | Works fully — the `branding` match only *adds* a collection the old app never names (the D §10.2 shape). |
| E1 app + any rules | Works — E1 touches owner-doc fields only, which every published rules version already governs. (Hence E1 may ship before or after E2's rules; only E2's *build* is gated on them, per §5.) |
| New app, shop never opens the designer | Every print is byte-identical to today: absence of `printDesign` resolves to today's structure (§1.2), absence of assets renders the text header, absence of `raastIban` renders no QR block. |
| New app + old device with a PIN record, app downgraded | The record sits inert in localStorage (the old build never reads the key); upgrading again revives it. Stated so support is never surprised. |
| Staff device | Staff read settings + branding (rules) and print fully branded documents; staff cannot change any Phase E setting (owner-doc write + `branding` write are owner-only); the device PIN is theirs to hold on their device (§5). |

### 10.3 Seed / demo

`getSeedJournal` untouched; demo seed gains **no** `printDesign`, **no** assets, **no** Raast IBAN (§7's sample is preview-only, never stored). Demo storage bumps once, at E2 (v17, for the `branding` slice). The sample-bill fixture is code, not seed data.

---

## 11. Risk list

| # | Risk | Severity | Mitigation in this design |
|---|---|---|---|
| R-E1 | The E1 chrome refactor — nine sheets rehomed onto shared header/footer — subtly changes a sheet's figures or drops a document-specific block (the challan's received-by, the slip's signature). | High | Bodies are NOT refactored (chrome only, §1.3); the slot matrix (§1.5) is the contract; B/C/D per-sheet structure fixtures must pass unchanged at E1's checkpoint, and the resolved-default model must snapshot-equal today's structure (§9 E1). |
| R-E2 | Data-URL assets outgrow Firestore (an owner keeps replacing letterheads; a future asset kind is video-like). | Low | Hard caps with refusal (§2.2) make overflow impossible by construction; the `BrandingAssets` seam is the single read interface, so a Storage migration later touches one seam, not nine sheets (§2.1). |
| R-E3 | The generated Raast payload's framing (§3.3) differs from bank framing in the variable-object lengths ⇒ banking apps reject a *rendered, plausible* QR. | High | The conformance fixture is E3's FIRST task and a byte-equality checkpoint (§9 E3); the round-trip parser proves internal consistency; §3.6's two-app live scan is a release gate; Path 1 (bank-issued image) is always available and preferred when present (§3.1). The design refuses to call the generated path "verified" until all three hold. |
| R-E4 | An owner enters a *valid-format* IBAN that is someone else's account (mod-97 passes — it checks digits, not ownership) ⇒ customers pay a stranger. | Medium | The Settings card forces a live self-scan test before save is meaningful (§3.5: the preview QR + "scan with your own banking app and confirm YOUR name/IBAN appears"); the receipt prints the IBAN in text so discrepancies are visible on paper; the design records that ownership verification is the bank's domain, not the app's — the app verifies *form*, and says so. |
| R-E5 | PIN forgotten on a staff session while the owner is unreachable ⇒ counter locked out of recovery (staff password works — §4.5 — but a *shared* staff login whose password is also forgotten strands the device). | Low | That state is identical to being signed out with a forgotten password today (Firebase password reset via email is the floor, unchanged by Phase E); the PIN adds no new lockout class. Recorded so it is not later misdiagnosed as a PIN bug. |
| R-E6 | PBKDF2 at 150k iterations on a low-end counter tablet feels slow, or a browser without SubtleCrypto (non-secure context) cannot verify at all. | Low | 150k is ≈100–300ms on modest hardware — one beat, stated in §4.3. The static + hosted builds are HTTPS/localhost (secure contexts where SubtleCrypto exists); if `crypto.subtle` is unavailable the PIN feature disables itself with an explanatory Settings note rather than falling back to a weak hash (a weak fallback would be worse than none — §4.1's honesty applied to engineering). |
| R-E7 | Two mounted sheets' `PrintPageStyle` rules collide and the wrong `@page` wins. | Medium | The §1.7 rule — `PrintPageStyle` renders only in the current print target's sheet instance — is a construction constraint, and the print-state seams that select sheets already exist (bill modal, document print state). E1's checkpoint includes printing each paper from each family in the demo and inspecting the emitted rule. |
| R-E8 | Letterhead/stamp images with baked-in low contrast or busy backgrounds print illegibly (esp. thermal dithering) or look unprofessional, undermining the feature's purpose. | Low | Thermal hard-suppresses letterhead/stamp (§1.7); the designer preview shows assets at true print size before saving (§1.8/§2.5); Settings guidance recommends transparent PNGs and simple marks. The app constrains size/format; taste remains the owner's — stated, not solved. |
| R-E9 | A template toggle hides a legally meaningful line (tax summary on a taxed bill) and a customer disputes the paper. | Low | Toggles hide *columns* and decorative sections; the bill's tax summary lines and totals are body, not slots (§1.5 — the tax *column* is optional, the tax *summary* is not a toggle). The slot matrix is the enforcement; E1's toggle sweep asserts totals/tax block presence under every toggle combination. |

---

## 12. Decisions by precedent vs open questions; what Phase E does NOT do

### 12.1 Settled by precedent (no owner input needed — recorded so they are not re-litigated)

- **Templates are settings; absence = today's behaviour** — the `docSeries` / `jobStages` / `tallyLedgerNames` pattern (owner-doc optionals, read-time defaults) in its fourth application.
- **Assets in Firestore, not Storage, not the owner doc** (§2.1) — weighed on offline, demo-parity and Spark-plan facts specific to this project, not on taste.
- **Print colours are not a setting** (invariant 3) — the theme fence that every prior increment preserved.
- **The stamp asserts settlement, so it follows the bill's derived status** (§2.4) — derived state over stored flags, the B §2.1 doctrine on paper.
- **The PIN is device-local and syncs nowhere** (§4.2) — a synced PIN would be an account credential pretending to be a device feature, with rules and recovery semantics this phase deliberately does not grow.
- **No new posting route, no new rules beyond one additive match, no new RBAC rows** (§5) — the phase is presentation + device state, and its audit is a zero-effect proof (§9).

### 12.2 Open questions (owner's call genuinely needed — recommendations given)

- **Q1 — One template vs per-document templates.** §1.1 designs ONE shop template with a slot matrix. *Recommendation: one template.* MC-parity shops run a house style; nine templates would multiply the designer UI and the test matrix for a difference the slot toggles already cover. If the owner later wants, say, quotations on letterhead but bills plain, `stampDocs`-style per-doc slot overrides extend the model without breaking it — the resolved-design seam (§1.2) is where they would land.
- **Q2 — Raast: generated, bank-image, or both?** *Recommendation: both, bank image preferred when present* (§3.1). The generated P2P code is the convenience path (nothing to export from a bank app); the bank image is the zero-risk path and the only route to a true P2M till code. Also decided inside §3.4 and flagged here: dynamic (amount-bearing) QRs on bills default ON — the amount + bill number are what make counter reconciliation work.
- **Q3 — PIN length: fixed 4, or owner's choice of 4–6?** *Recommendation: owner's choice at set time, default 4.* Counter speed argues 4; a back-office device argues 6; the record stores the choice (§4.2) and the pad renders to it. The design takes no position that 6 is "secure" — §4.1 applies at every length.
- **Q4 — Should opening Settings itself require the PIN?** *Recommendation: no.* The launch/idle lock already gates the unattended device; the sensitive *acts* inside Settings that matter (period/FY close) are individually gated in E5. Gating the Settings door would mostly punish the owner mid-task (and Settings is already owner-role-only in cloud mode).
- **Q5 — Logo on thermal receipts.** *Recommendation: allowed, small, centred* (thermal branding is established shop practice and survives dithering); letterhead and stamp stay hard-suppressed on thermal (§1.7) — the distinction is image *type*, not owner preference, so it is a rule, not a toggle.
- **Q6 — Stamp on quotations/orders (company seal).** *Recommendation: available per-doc, default OFF* (`stampDocs`), bills-paid default ON. A seal on an *estimate* asserts more than an estimate should; owners who use it as a house mark can opt in deliberately.

### 12.3 What Phase E deliberately does NOT do

- **No journal or posting change of any kind** (invariant 1). The one near-miss, named: the E5 PIN gate touches period/FY close — it lands as a *view-layer precondition* on existing actions (§4.6), never as a store or template change. If implementation believes a store-level flag is required, it must stop and report — that would be a different design.
- **No genuine Raast P2M merchant QR generation** (§3.1) — the MAI is acquirer-issued; faking it is the one outcome worse than absence. Request-to-Pay and till codes are likewise bank-side instruments, out of scope.
- **No image/PDF bill via WhatsApp** — `wa.me` text is the channel's capability; attaching the printed bill as an image/PDF belongs to a share-sheet (Web Share API) exploration of its own, not smuggled into a print phase.
- **No drag-and-drop template builder, no colour picker, no custom fonts** (§1.6).
- **No free-position stamp/signature placement** (drag x/y) — fixed, dignified slots (§2.3); positioning "controls" are the mode/toggle/size set the brief's surfaces actually need at a counter.
- **Keyboard shortcuts and the digital visiting card** (the roadmap's Phase E line also names them) are **not in this design's four items** and are deferred explicitly: the visiting card becomes cheap *after* E3 (a vCard payload is a trivial second use of `QrCode.tsx` + the E2 logo) and is the recommended first follow-up increment; shortcuts deserve their own small design pass over the POS surface rather than a paragraph here.
- **No change to the Flutter app (Phase F)** — but the contracts are portable as-is: `PrintDesign` + `BrandingAsset` shapes, the Raast payload builder (pure string math), and the PIN record model (device storage, platform KDF) are all data-layer contracts the Flutter client will consume unchanged.
- **No server component** — everything in this phase is client-side over the existing Firestore/demo data plane, like every phase before it.
