# Phase H · H4 — Storefront Flutter parity + backup parity

**Date:** 2026-10-23 · **Design:** `ERP-PHASE-H-DESIGN.md` (H4)
**Verdict:** H4 as scoped below is COMPLETE and fixture-proven.
flutter analyze **0** · flutter test **433/433** (400 inherited +
33 new) · TS harness **1,661/1,661** (untouched) · every
inherited fixture byte-identical (md5-verified) · Dart
`makeEntry(` count **42 before, 42 after** (no journal
composition for storefront, per doctrine).

## Scope reading (read this first)

The executed increment numbering has diverged from the design's
§6 numbering, and H4's true scope follows from what actually
exists:

- Executed **H2** built Dart loyalty only; executed **H3** built
  the web storefront. The design's **H3 — WhatsApp marketing
  (web)** — has **not** been built: verified by tree search —
  there is no `wa*.ts` and no `waTemplates`/`waCampaigns`/
  `waSends` anywhere under `web/lib`.
- Design-H4 therefore splits in two. Its **storefront-in-apps**
  leg is fully buildable (the web implementation from executed
  H3 is the semantic source of truth) and is what this increment
  delivers, together with the **backup parity** the H3 web work
  left behind (the Dart backup mirror now carries the H3
  platform-slice additions).
- Its **WhatsApp-in-apps** leg is **BLOCKED, declared partial**:
  there is no TS source of truth to fixture against. Building
  it now would invent semantics the fixture discipline exists
  to prevent. It becomes buildable the moment the WhatsApp web
  increment lands.

The public `/s/{slug}` page remains a web surface; the apps do
not rebuild it. App scope is the member side only: publish /
unpublish, snapshot preview, the inbox with its pre-confirm
drift table, convert / dismiss — at web parity, with every
label drawn from the existing 2,945-key dictionary.

## What was built

### Pure core — `lib/core/storefront.dart` (new)

A line-level port of `web/lib/storefront.ts`:

- **Slugs:** `slugProblem`/`slugOk` (reserved list, 3–40 chars),
  `suggestSlug`.
- **Bands:** `stockBandFor` — in / low / out, never counts.
- **Snapshot assembly:** `assembleStorefrontSnapshot` with the
  TS `undefined` semantics carried as explicit set-flags
  (city/logo/tagline/notice); the hidden set is sticky
  (excluded ∪ previously-hidden − re-included) and hidden
  products stay in the doc as `hidden` cards so the set is
  self-describing; stable decorated sort by (category, name);
  500-product cap; `enabled`/`publishedAt` carried from the
  previous doc.
- **Republish seam:** `storefrontContentEqual` via JS-style
  canonical JSON (sorted keys, integral doubles print as
  ints) — content equality ignores only the restamp.
- **The lit rule:** `storefrontLit` / `storefrontLitState` —
  lit ⇔ snapshot enabled ∧ snapshot tier holds `storefront`
  ∧ derived plan state ∈ {active, founding}; dark in trial,
  grace, readonly, suspended, disabled, and with no registry
  or no doc.
- **The inbox:** `storeOrderShapeOk` (exact key set; a line is
  exactly `{productId, qty}` with qty an integer 1..999;
  `createdAt` must parse), `composeStoreOrder` (duplicates
  merge; a merge that overflows the cap refuses the whole
  order — never clamps), `normalizePhone` (92/0092 folding),
  `matchCustomerByPhone`.
- **Conversion:** `planStoreConversion` (refuses non-`new`
  orders — the state is the exactly-once claim; refuses when
  every product is gone; dropped products flagged; drift rows
  carry BOTH the published and the live price),
  `buildStoreSaleOrder` (born `open`, `sourceType:
  'storefront'` + `sourceOrderId` stamped, totals through the
  Phase B `estimateDocTotals`), `storeOrderCounts`.
- **Page model:** `storefrontPageModel` — hidden cards never
  render; groups in first-appearance category order.
- **Link seams:** `storefrontOrigin` / `storefrontPath` /
  `storefrontUrl` / `resolveStorefrontLink`.

### Types — `lib/core/types.dart`

- `SaleOrder` gained `sourceType` / `sourceOrderId`, emitted
  by `toMap` **only when non-null** — pre-H4 documents keep
  their exact shape.
- `ShopSettingsView` gained `storefrontBlock` (the verbatim
  settings block: the auto-republish preference) and
  `storefrontSlug` (the slug cached on the owner doc at
  publish).

### Backup mirror — `lib/core/backup.dart`

The H3 platform slice, at parity with `web/lib/backup.ts`:

- `BackupPlatformSlice.storefront` (KeyedDoc?, slug-keyed) +
  `storeOrders`; assembly applies the **own-business seam
  filter** (a foreign snapshot is dropped, foreign orders are
  filtered out); manifest `platformCounts` extended.
- `verifyBackup`: absent H3 keys read as empty (pre-H3 files
  still verify — proven against the fixture's legacy case);
  present-but-wrong-shape H3 members fail `not-a-backup`.
- `planRestore`: subset conflicts `storefronts/{slug}` when
  the target holds a **different slug** or the **same slug
  with different content**, and `storeOrders/{key}` for a
  foreign inbox doc; remainder writes for both ride the plan;
  `applyRestoreWrites` handles both path families.

### Store wiring — `lib/data/store.dart`

- Subscriptions: `storefronts` (own business, limit 1) and
  `storeOrders` (own business, `createdAt` desc), each
  error-swallowing like the G-layer subs; inbox Timestamps are
  normalized to ISO at the seam (the web's `normStoreOrder`).
  State resets on (re)attach; the republish timer dies with
  teardown.
- `publishStorefront` — owner-only (rules v10 key the write
  to the owner uid; demo/local modes refuse `unavailable`),
  slug claimed on first publish and immutable after, slug
  cached onto the owner doc. `unpublishStorefront` keeps the
  doc + slug and flips `enabled`. `setStorefrontAutoRepublish`
  rides `updateSettings`.
- **Auto-republish:** a product change schedules a 1.2 s
  debounced tick; the tick re-assembles and writes ONLY when
  `storefrontContentEqual` says the public content actually
  moved — the subscription's own echo can never loop a write.
- `convertStoreOrder` — gated on the `storefront` write row
  AND the `saleOrders` write row; the plan is **recomputed at
  the act**, never trusted from the screen; the customer is
  phone-matched or created **in the same batch** as the SO
  and the inbox state flip. `dismissStoreOrder` stamps actor
  + time; dismissed paper is kept.
- Backup: export reads the snapshot + inbox into the slice;
  the restore probe reads them back (orders
  exportable-normalized so the subset test compares like with
  like); the executor writes an inbox doc's `createdAt` back
  as a real `Timestamp` — a restored inbox is
  indistinguishable in type from a live one.

### The desk — `lib/features/storefront.dart` + nav

Nav entry after Loyalty (`sees('storefront')`, planModule
`'storefront'`). The screen mirrors the web desk: the status
card (the web's state-text chain: disabled / lit / dark-plan /
dark-state / no-plan), the link row with copy, the slug claim
field (first publish only; immutable note after), tagline +
notice, the shop phone, the products checklist with live band
chips, the auto-republish switch (owner), publish / republish
/ unpublish, a preview dialog rendering `storefrontPageModel`,
and the inbox: counts header, per-order lines / fulfilment /
note, the **pre-confirm drift dialog** (customer match or
new-customer notice, both prices per line, changed + missing
flags, live total), convert / dismiss, and for converted
orders the "tell the customer on WhatsApp" action via the
app's established share-sheet pattern.

### Fixtures + tests

- `harness/fixtures-export-h4.js` (new, additive) exports
  `harness/fixtures/h4-core.json` (md5
  `11cea2c20933ace57d4c0f5d67eb531e`) from the compiled REAL
  web functions over the H3 suite's own cases — slug/band/lit
  truth tables, snapshot assemblies, validator accept/refuse
  table, compose cases, conversion plans, the journey, and
  the backup slice/plans.
- `test/h4_fixtures_test.dart` — 26 tests replaying every
  table and the member-side journey end-to-end (compose →
  inbox → drift plan → convert exactly-once → SO-9 born open
  with source stamps), plus the backup groups (assemble
  deep-equal, foreign-front seam drop, file + legacy verify,
  all five restore plans).
- `test/h4_core_test.dart` — 7 native tests: the RBAC row,
  the Advanced tier gate, the settings link seam, the
  SaleOrder stamp round-trip (and its absence on unstamped
  orders), typed inbox counts.
- Generated data regenerated (`tools/gen_l10n.mjs`): **zero
  new dictionary keys** — all H4 labels already existed from
  H3; the drift gate re-emitted the 2,945-key dictionary, the
  42-module matrix (storefront row: owner/manager full,
  accountant read, cashier none) and the plan bands
  (storefront at Advanced). The only inherited pin amendments
  are `g5_core_test.dart`'s two catalogue counts (41 → 42
  modules; Advanced set 6 → 7), amended with H4 lineage
  labels.
- CI: the fixture-freshness block gains the
  `fixtures-export-h4.js` line. The g6/h2 exporter lines were
  **deliberately not** added — see the incident note below.

## Verification (fresh, final state)

| Check | Result |
| --- | --- |
| flutter analyze | **0 issues** |
| flutter test | **433/433** (400 inherited + 26 fixture + 7 core) |
| TS harness (`harness.js`, untouched) | **1,661/1,661** |
| `gen_l10n.mjs --check` | clean — 2,945 keys EN ≡ UR, 42 modules |
| Fixtures f1/f2/f3/f4/f5-week/g5/g6/h2 | **md5-identical** to pre-H4 baselines |
| Fixture h4-core.json | `11cea2c20933ace57d4c0f5d67eb531e`, re-export byte-stable (incl. from the CI working directory) |
| Dart `makeEntry(` in `lib/` | **42 → 42** (unchanged) |
| Frozen seed identities | untouched (asserted inside the inherited suites) |

## Fixture-integrity incident — full disclosure

While wiring CI I re-ran the g6 and h2 exporters to test
whether their lines belonged in the freshness gate. Both
overwrote their committed fixtures with different bytes. The
fixtures were then **restored byte-exact** and the final md5
table above is post-restore:

- **g6** — restored from `dukaan-ai-FULL-source-for-github.zip`
  (the G6 refresh), md5 back to `2d09a70a…`. Root cause is
  legitimate drift, pre-existing: since H3, the TS
  `assembleBackup` always emits the `storefront`/`storeOrders`
  keys, so a fresh g6 export differs from the frozen pre-H3
  artifact in exactly those keys (verified by diff). The
  committed g6 file stays valid because both clients tolerate
  its shape — that tolerance is itself fixture-proven in this
  increment's legacy case.
- **h2** — no archived copy exists. Diffing two fresh exports
  showed the ONLY volatile field is one FY-close entry id:
  the exporter re-stamps entry ids deterministically except
  this one, which `makeEntry` mints from the wall clock
  (`j-` + base36(ms) + a deterministic counter digit),
  despite the exporter's byte-stability header claiming
  otherwise. The original id was recovered by search against
  the known baseline md5: **`j-mvks8hhtl`**, minted
  2026-10-23 09:43:31.217 UTC — squarely inside the H2
  session's window (exporter written 09:42, tests written
  09:47) — and substituting it reproduces the baseline md5
  over the whole file exactly. The h2 suite passes against
  the restored file in the 433/433 run.

Consequence for CI: the freshness gate covers F1–F5, G5 and
now H4 — exporters proven byte-stable. The g6/h2 exporters
stay out until someone fixes their determinism (h2: stamp
the FY-close entry id like the others; g6: freeze or accept
the H3 keys and re-baseline deliberately). This is a
recommendation, not done here — rebaselining another
increment's fixture is not H4's call.

## Declared partials

1. **WhatsApp-in-apps: BLOCKED** (design-H4's second leg).
   The design's WhatsApp web increment (design-H3) has not
   been built; there are no web semantics to port. Not
   started, by discipline, not by omission.
2. **QR surfaces:** the web desk shows a QR of the store
   link and receipts print it as a QR block. The apps carry
   **no QR renderer** — E3's Raast QR is a bank-issued image
   asset by design, and no QR package exists in the bundle.
   The desk offers the link with copy + share instead; the
   slug/resolve seams are in place for a future renderer.
   Declared, not substituted with a look-alike.
3. **Micro-divergence (deliberate):** the desk fills
   `store.state.darkState`'s `{state}` placeholder with the
   live plan state; the web desk renders that string with
   the placeholder left literal. The app text is the
   intended sentence; the web wart is H3's, untouched here.
4. **Held-bill resume restores no payment rows** and the
   **Dart day-close bucket divergence** (cheque parts +
   voided bills) are pre-existing H2-era declarations,
   unaffected by H4 — both remain on the final
   production-readiness audit list.
5. **No device/APK build, no live deployment, no live
   public URL is claimed.** The storefront lights up live
   only when the owner's G/H rollout deploys rules v10 +
   the current web build and a shop publishes. The demo
   seed's storefront stays off (H6 seed work, per H3).
6. GitHub remains parked by owner decision — nothing in
   this increment was pushed.
