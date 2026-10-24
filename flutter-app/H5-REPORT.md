# Phase H · H5 — WhatsApp marketing, Flutter parity — Report

**Naming.** The executed H sequence governs: H1 loyalty web, H2 loyalty
Flutter, H3 storefront web, H4 storefront Flutter, the WhatsApp web
increment, and now **H5 — WhatsApp Flutter parity**. Fixture:
`harness/fixtures/h5-core.json`; exporter:
`harness/fixtures-export-h5.js`. Semantic source of truth:
`web/lib/whatsapp.ts` + `web/components/WhatsAppView.tsx` + design
§3 (`ERP-PHASE-H-DESIGN.md`). Date: 2026-10-23.

## Scope delivered

### Core port — `lib/core/whatsapp.dart` (new, pure Dart)

Line-for-line semantics of the web lib:

- **Types**: `WaTemplate`, `WaCampaign` (draft carries
  `resolvedCount: null`), `WaSend`; `WaAudience` as a class with
  named constructors per kind — `toMap()` writes ONLY the kind's own
  params, `fromMap` defaults exactly as web (minRs 0, minDays 0,
  withinDays 30, tier 'silver', days 60).
- **Consent (design §3.2)**: `customerOptedIn` — absent ≡ false =
  NO. `waConsentPatch(source, agreed, nowISO)` stamps state +
  moment + source together, on grants AND revocations; the source
  union is exactly `"counter" | "storefront"`. `stripImportConsent`
  removes all three fields from any imported row — import can never
  carry consent. `resolveWaSettings` — the service interval falls
  back field-by-field to the **90-day** default.
- **Phone/link/render**: `waIntlPhone` (same normalisation the bill
  share composes), `waPhoneOk` (10–15 digits), `waMeLink`
  (Uri.encodeComponent), `renderWaMessage` — known placeholders
  substituted (amount rounds), unknown ones left standing.
- **Audiences**: `customerUdhaarPosition` (FIFO over dayOffset;
  bills allocate oldest-first through the bills' own creditPaid,
  then bare credit rows retire oldest-first — the web's two-phase
  walk). `waSegmentMatches` per kind with the consent filter NOT
  inside; `resolveWaAudience`/`waAudienceCount` apply consent LAST
  for every kind. Kinds: all_opted_in, tier (via the H2 loyalty
  fold), udhaar_outstanding, points_expiring (H2 fold + horizon
  from businessDateISO/addDaysISO), inactive (no qualifying bill =
  true), storefront_customers (SaleOrder.sourceType ==
  'storefront'), service_due (latest DELIVERED job per customer ≥
  interval).
- **Launch + queue**: `planWaLaunch` materialises one queued
  WaSend per resolved recipient + snapshots resolvedCount.
  `waQueueStep` — the session cursor (skip-for-now) writes
  NOTHING; the row resurfaces next visit. `waSendRecheck` →
  ok/optout/invalid (a gone doc re-checks as optout).
  `waSendTransition` — the re-check OVERRIDES the confirm act:
  opt-out after launch → `skipped_optout` (never sent), bad
  number → `skipped_invalid`; only a passed re-check records
  opened/sent. `waCampaignProgress`, `waQueueMessage` (facts are
  LIVE at send time — udhaar/points recomputed per recipient).
- **Suggestions + gates**: `waSuggestedReminders` — counts only,
  consent filter included. `waModuleAllowed`/`waSendingAllowed`
  over the assignment-snapshot PlanView: module from the SNAPSHOT
  (a Basic snapshot is refused even though today's catalogue
  grants whatsapp at Standard); sending allowed only in
  trial/active; reads never gated; null view gates nothing.

### Types + backup

- `Customer` += `waOptIn/waOptInAt/waOptInSource` (nullable;
  toMap writes only when non-null — an unstamped customer keeps
  the exact pre-H5 doc shape).
- `ShopSettingsView` += `whatsappBlock` (the raw settings.whatsapp
  map rides ownerDoc verbatim).
- `core/backup.dart`: tenantCollections 35 → **38**
  (waTemplates/waCampaigns/waSends appended in web order);
  file counts as tenant docs through the existing machinery.

### Store — `lib/data/store.dart`

- WA trio streams added to `f1Collections` (35 → 38, web order);
  state lists + subscriptions; `waAudienceData` getter assembled
  from live state exactly as the web desk's data input.
- `saveWaTemplate` / `deleteWaTemplate` / `createWaCampaign`
  (whatsapp-write guarded).
- `launchWaCampaign` → reasons forbidden / not-draft /
  no-template / plan-module / plan-state; snapshot gates read
  BEFORE materialising; sends written, campaign flips to
  sending with resolvedCount.
- `advanceWaSend(campaignId, act, afterId)` — recomputes the
  head under the caller's session cursor; a SENDABLE head under
  a paused plan refuses BEFORE any write (plan-state); skip
  verdicts still record (they send nothing); when progress
  completes, the campaign closes to done in the same action.
- `finishWaCampaign`; `setCustomerWaConsent` (customersManage
  guard; `.update(waConsentPatch(...))` — merge, so no other
  field can be dropped); `setWaServiceIntervalDays` via
  updateSettings (settings guard lives there).
- `convertStoreOrder(orderId, {waOptIn})` — when ticked, the
  consent stamp lands in the SAME batch as the SO conversion
  (source "storefront"): a brand-new customer is born stamped;
  an existing one gets `batch.update` with the patch.

### Surfaces

- **`features/whatsapp.dart`** (new `WhatsAppScreen`, nav entry
  after Storefront, `Icons.campaign_outlined`, planModule
  'whatsapp'): honest-limits card always; locked card when the
  snapshot lacks the module; paused notice when sending
  degrades; suggestions panel (Start pre-fills the composer
  audience + the first reminder template if none chosen);
  service-interval editor (settings writers); template editor
  with the 4 starters, kind badges, two-step delete; campaign
  composer with LIVE reach text; campaign list (state +
  audience badges, sent/skipped/total progress, Launch gated by
  sending-allowed, Open queue, Finish); the queue card (head
  preview with the live-rendered message, Open / Mark sent /
  Skip-for-now, remaining count, honest note) and the send log
  with state badges. RBAC: whatsapp row view/write.
- **Customers**: form consent checkbox (create stamps only when
  ticked; edit stamps only when the checkbox changed; an
  unchanged edit carries the existing stamp through the whole-doc
  write), directory ✓ + `wa.consent.on` line, profile consent
  block (state, since {date} · source, toggle → consentSaved
  notice).
- **Storefront**: conversion dialog gains the consent checkbox
  (default unchecked) → `convertStoreOrder(..., waOptIn:)`.

### Dictionary

ZERO new keys. `tools/gen_l10n.mjs` regeneration is a no-op diff
(3,054 keys EN ≡ UR, drift gate clean): every wa.* label the web
increment added was already in the dictionary. The regeneration
also carried the WA-era permissions row (owner/manager full,
accountant read, cashier none) and the plans growth band
['loyalty', 'whatsapp'] into the generated Dart data — both from
the web sources, not hand-written.

## Verification

| Check | Result |
|---|---|
| flutter analyze | **0 issues** |
| flutter test | **469/469** (433 inherited + 25 h5 fixture + 11 h5 native) |
| TS harness re-run | **1,706/1,706, runner exit 0** (harness.js untouched) |
| Fixtures f1–f5/g5/g6/h2/h4 | **md5 byte-identical** to baseline (g6/h2 exporters not re-run) |
| h5-core.json | md5 `67fd8649878f88d9d03dfdb3ec16d2ed`, byte-identical across exporter runs; added to app-ci.yml freshness block |
| Dart makeEntry( sites | **42 → 42** (marketing moves no money) |
| i18n | 3,054 keys EN ≡ UR; gen_l10n --check clean |
| Rules file | untouched |

The fixture test replays the web WA truth tables from the REAL
web functions: the consent table + both patches + the import
strip; settings defaults; phone/link/render; FIFO udhaar
positions (Ahmad 3,000 @ 20d, Bina 300 @ 3d); the full segment
table (8 audiences × 5 customers) + resolved lists (udhaar
segment admits the never-consented cid — the resolver excludes
him); suggestions {1, 1, 1, interval 90}; the launch
materialisation; the complete queue walk — confirm → **opt-out
after launch → skipped_optout** → bad number → skipped_invalid →
progress {sent 2, skippedOptout 1, skippedInvalid 1, complete} →
cursor semantics; the queue message ("Assalam-o-Alaikum Ahmad
Ali, Rs 3000 outstanding at Madina General Store; you have 2500
points."); snapshot gates from real `plans.snapshotFor` output;
the backup slice (tenant list ≡ web 38, file verifies, wa
restore paths planned into the target tree only, round-trip
docsEqual).

Pin amendments (lineage-labelled in place): `g5_core_test.dart`
growth band + catalogue counts (H5 growth of the whatsapp
module); `h4_fixtures_test.dart` assemble comparison projects
the empty WA trio out (the trio's own bytes are proven in the
h5 test).

## Declared partials

1. **Backup tolerance deviation (web vs Dart).** Empirically
   proven against the compiled web lib: the current WEB
   `verifyBackup` refuses a pre-WA backup file as
   `not-a-backup` — `computeManifest` requires all 38 tenant
   arrays present, so even the frozen g6-era fixture file gets
   `{ok:false, problem:"not-a-backup"}` from web code today.
   The Dart mirror deliberately keeps the H3-precedent tolerance
   (an absent stored count for waTemplates/waCampaigns/waSends
   defaults to 0), so pre-WA backups stay readable and
   restorable in the apps — the §3.7 data right. The fixture
   records the web verdict next to the Dart one. Flagged as a
   phase-audit question for the web side.
2. **Transport gesture.** The apps have no url_launcher; every
   outbound action rides share_plus. The queue's Open records
   `opened` through the store, then shares the composed wa.me
   link via the OS share sheet (the storefront-QR precedent).
   Log semantics are identical to web; no delivery state is
   ever fabricated — "sent" remains the shopkeeper's own
   confirmation.
3. **Checkout-side consent (inherited).** The web storefront
   checkout checkbox is still not landed on web (the public
   order's create shape is exactly-keyed in rules); both
   clients capture consent at conversion, stamped in the
   conversion batch with source "storefront".
4. **No real message sent, no device/APK build** (the VM
   Gradle/TLS constraint stands — cloud CI only), **no live
   deployment**; GitHub remains parked for the owner's one
   push, where the CI freshness block now also covers
   h5-core.json.
