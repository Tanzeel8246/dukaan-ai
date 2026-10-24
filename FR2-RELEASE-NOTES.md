# Dukaan AI — Fix Round 2 (FR2) Release Notes

**Package:** `dukaan-ai-ERP-H-fixround2.zip` — fresh static build +
v11 rules file + this note at zip root. (A zip cannot honestly
carry its own SHA inside itself, so the delivered byte size and
SHA-256 are recorded in the PRODUCTION.md FR2 entry and in the
delivery report, not here.)

**Owner's redefinition, 2026-10-24** — this round replaces the earlier
"Start fresh" proposal. Three items, all in source, all proven by the
harness and the Flutter golden fixtures. **No live verification is
claimed here** — the live retest (demo opt-in on a fresh account,
clear → trash → restore in the throwaway account, multi-business
creation) happens after the owner uploads, by the parent agent.

## Deploy steps (owner)

1. **Upload the frontend zip** (`dukaan-ai-ERP-H-fixround2.zip`) as
   usual — it supersedes the fixround1 package.
2. **Re-paste the rules file — REQUIRED this round.** The rules
   changed (v10 → v11, see below), unlike Fix Round 1 where they
   did not. Paste `firebase/firestore.rules` (v11) into the Firebase
   Console, replacing v10 in full.
3. If not already done: hand-create the `platformAdmins/{your UID}`
   bootstrap doc (the `/platform` super-admin gate) — see "Super-admin
   panel" below.
4. Observe counters per business; the `enforce` flag stays **false**
   everywhere by design until the owner flips it per business.
5. No data migration, no re-keying: the existing live business keeps
   working untouched as business #1 (see item 3 migration).

## Item 1 — Demo data opt-in (replaces auto-seeding)

- **New accounts and new businesses start EMPTY.** The automatic
  demo seeding on the signup/onboarding path is removed; the demo
  seed generator itself is kept.
- **"Add demo data"** (Dashboard footer button, and the Settings
  danger zone; owner-only, PIN-challenged): before seeding, a modal
  shows exactly what will be added — the demo set's own figures:
  **25 products, 3 customers, 2 suppliers, 347 sales rows, 29 journal
  entries, stock Rs 272,805 at cost / Rs 303,250 at retail** (the
  figures the live demo business carries — not a new invented set).
  After seeding, the modal shows the summary **confirmed from the
  writes actually committed**, not from a pre-computed figure.
- **"Re-add demo data"** (the honest reset): offered only when the
  business holds demo data alone. It wipes the demo docs first and
  re-seeds, so the result is exactly the demo set — never a
  duplicate layer. It is refused on an empty business (nothing to
  re-add) and on a business holding real records.
- **Demo seed never mixes into real books.** If the business holds
  any real (non-demo) record, demo seeding is refused with a clear
  message. A demo-plus-real mix gets its own refusal wording.
- The old Dashboard "Reset demo data" button — which in production
  was a silent no-op (the cloud path returned without doing
  anything, which is exactly the confusion the owner hit) — is gone
  from production. Demo mode keeps its own legacy showroom reset.
- The PIN challenge uses the action's own label ("Add demo data" /
  "Re-add demo data") — no new dictionary keys were needed for it.

## Item 2 — Clear data → trash, 30-day restore

- **"Clear all data"** (Settings danger zone, owner-only): PIN
  challenge + **type CLEAR to confirm**. It never hard-deletes.
- **What happens:** the ENTIRE business is snapshotted into trash
  first (all tenant collections, in the G6 backup format, so the
  existing verify/restore pipeline consumes it unchanged), then the
  business's tenant data is wiped.
- **Trash data model** — Firestore paths
  `businessTrash/{businessId}/snapshots/{trashId}` plus
  `.../chunks/{index}`:
  - Chunked docs, **400,000 characters per chunk** — well under the
    1 MiB/document limit even for multi-byte text. A 154 KB live
    backup fits in one chunk.
  - The manifest carries `businessId`, `clearedAt`,
    `expiresAt = clearedAt + 30 days`, per-collection doc counts,
    `totalDocs`, `journalCount`, the journal fingerprint, `chunkCount`,
    `jsonLength`, and `replacedTrashId` (audit breadcrumb).
  - Counts and fingerprint are **copied verbatim from the backup's
    own manifest, never recomputed** — the panel and the file cannot
    disagree.
  - The reassembler refuses gaps, duplicate indexes, and truncated
    tails (the manifest's `chunkCount` is the tail check) rather
    than handing a spliced file to verification.
- **Restore-from-trash** (BackupPanel trash panel): uses the existing
  restore pipeline **including its empty-business guard** — restore
  only into a business that is currently empty. If the user created
  new data after clearing, the guard refuses with the existing
  message — **never a merge**. After a successful restore the trash
  entry is **consumed** (marked restored, chunks dropped, never
  restorable again).
- **Expiry:** after 30 days the restore option disappears, checked
  **at read time, never by a cron** (Spark/static has no cron). The
  expired snapshot is **deleted lazily on the next trash-panel load**,
  and any snapshot can be removed by hand with "Delete permanently".
- **Re-clear while trash exists:** clearing again while an ACTIVE
  trash snapshot exists stops at an explicit confirm warning that
  the old trash will be lost; only the confirm deletes it first.
- **What clear keeps, deliberately:** the owner doc (modified:
  clearing flag cleared, `demoState` none, `lockedThrough` empty),
  the 5 money accounts, and the default warehouse — structural docs
  byte-identical to the backup, so a half-failed wipe still restores
  cleanly. Registry, counters, memberships, and events are platform
  data and are NOT wiped (counters are kept so clearing cannot evade
  invoice limits). **The storefront snapshot and inbox are NOT
  touched by clear** — a published storefront stays live until the
  owner unpublishes it (the panel says so; unpublishing would change
  the storefront doc and make the restore subset test refuse it).
- **Harness regressions proven:** clear → snapshot counts ≡ pre-clear
  counts; wipe leaves 0 tenant docs; restore-from-trash into the
  emptied business reproduces the exact journal fingerprint; restore
  into a non-empty business is refused; expired trash cannot restore;
  re-clear replaces only after confirm.

## Item 3 — Multi-business creation + switcher

**This changes the Phase G tenancy model** (one owned business per
account → many). Designed so nothing existing moves:

- **"New business"** (header switcher menu, creator-owned): name +
  phone + address → a new business with a **generated id**, the
  creator's ownership recorded in the registry (`ownerUid` = creator
  uid, which is precisely what distinguishes a generated business
  from the legacy shape where `ownerUid == businessId`), zeroed
  counters for the birth month, and the creator's switcher index
  entry (role `owner`). **No members doc is written** — the owner is
  never a member of their own business.
- **New businesses start EMPTY** (item 1) and on the **Free Trial**
  plan rules, exactly like any new business. The **founding comp plan
  applies ONLY to pre-G businesses** — never auto-applied to new
  ones (the rules pin founding to `businessId == ownerUid`).
- **Business switcher in the top header** (NOT the sidebar, per the
  standing shell rule): lists the businesses the user owns or is a
  member of, shows the active one, switches the entire app's data
  scope (every store subscription tears down and re-attaches).
  Ordering: the uid-shaped own business first (business #1, the
  legacy position), then other owned businesses in name order, then
  member businesses in name order.
- **Active business persistence:** server-side in
  `userMemberships/{uid}.activeBusinessId` first, then the
  device-local choice, then claim/legacy preference, then the first
  list entry. A failed server persist never blocks a switch.
- **Migration — the existing live business keeps working untouched
  as business #1:** for existing users, the active business defaults
  to their existing membership; if exactly one membership exists, it
  is active. **No data moves, no re-keying of existing docs.**
  The data layer moves from "businessId ≡ ownerUid" to
  "activeBusinessId". The index self-heal gained an owner-owned
  carve-out: businesses whose registry names the caller as ownerUid
  are kept with role `owner` even without a membership doc (without
  it, healing would drop every additionally-owned business on the
  next sign-in).
- **Creation failure path:** the index entry is persisted BEFORE
  the tenant skeleton, deliberately — so a skeleton failure still
  lists the business, and the switcher offers a retry row
  ("Setup incomplete") that completes it from the registry.
- **Creation is not PIN-gated** (declared, not hidden): creating a
  business destroys nothing; the destructive acts (demo re-add,
  clear) are the PIN-gated ones. The switcher menu entry itself is
  gated on owning ≥1 business.

## Rules delta — v10 → v11 (RE-PASTE REQUIRED)

- **v11: 1,670 lines (JS split count), SHA-256
  `0f19f56e5da1d36840767468da71550105be65786a0939566115b19be4b40e70`.**
- **Strip-proof: stripping the FR2 spans returns the v10 FINAL text
  byte-for-byte (SHA `f10b2ee07ceb0c5a583f3762fa021222fb1a9a90832bf566956ae157372220ba`).**
  The delta is purely additive — nothing else in the file moved.
- What was added:
  - Helpers: `isRegistryOwner(uid)`, `isBusinessOwner(uid)` (uid
    match OR registry leg), `isClearWindow(uid)` (business owner
    AND the owner doc's `clearing` field non-null).
  - `canAccess` and `staffRole` widened from `isOwner` to
    `isBusinessOwner` (staff gain nothing — the leg is uid match
    OR registry ownership).
  - `businessBirthOk`: a generated business is born on Free Trial
    only; founding on a generated id is denied.
  - `users/{uid}` write leg for the registry owner (the clear window
    and skeleton writes).
  - Clear-window delete legs (pure additions): sales, journal,
    waCampaigns, waSends, and posted bills gain
    `allow delete: if isClearWindow(uid)` — default-deny stands
    outside the window.
  - `businesses` match: registry-owner read, create (birth
    validation pins ownerUid == caller), and registry-owner update
    (name/phone/city diff only).
  - `businessMembers` / `businessInvites`: registry-owner read,
    create, update, and paired-delete mirror legs.
  - `businessCounters` create: registry-owner leg with non-negative
    counts. `businessStats`: registry-owner read and create/update.
    `businessEvents`: registry-owner read and create (actor ==
    caller).
  - Storefront write legs widened to `isBusinessOwner` (they
    previously required `businessId == request.auth.uid`, which
    denies a generated business's owner).
  - **`businessTrash` block (pure addition): owner-only
    read/write/delete via `isBusinessOwner`. The platform console
    gains NO leg into trash.**
  - **12 owner-leg widenings found by mapping the tenant region's
    delete legs:** returns, dayCloses, notes, purchaseReturns
    (update+delete); cheques, warehouses, stockLevels, payrollRuns,
    loans (delete); branding (create/update/delete); taxSlabs and
    periods (write). Without these, a generated business's owner
    could not delete ordinary records, and clear-to-trash would
    half-fire on a generated business. Accounts deliberately NOT
    widened (no delete leg exists at all; clear keeps accounts
    anyway; no editable-COA UI exists). `staffIndex` deliberately
    unchanged (legacy-only; staff of generated businesses come via
    invites + memberships).

## Super-admin panel — where it is (the owner's question)

The panel is the **`/platform`** surface in the app. It is
admin-gated: bootstrap is the hand-created
`platformAdmins/{owner UID}` document in the Firebase console
(`{email, addedAt, addedBy: "bootstrap"}`). It keeps its standing
rule: **no rules leg into any tenant namespace — trash included**.
FR2 fixed a real console bug along the way: the console dropped the
registry doc id and keyed everything by `ownerUid`, which coincides
with the business id ONLY for legacy businesses. For a generated
business it selected the wrong business (two businesses of one owner
shared one key). The console now keys by registry doc id
(`consoleBusinessId`, ownerUid fallback for legacy fixtures) in the
directory, aggregates, payment guard, selection, detail acts, and
payment matching — so multiple businesses per owner list and act
independently.

## Final counts (all green)

- **TS harness: 1,834 / 1,834, exit 0** (FR2 suite 51/51: 40 logic
  checks + 11 client-wiring source checks; FR1 29 unchanged).
- **Flutter tests: 506 / 506** (FR2 fixtures test 15/15; was 491).
- **Flutter analyze: 0 issues. Web `tsc --noEmit`: 0 errors.**
- **Dictionaries: 3,136 keys × 4 locales** (EN ≡ UR ≡ PS ≡ FA, 43
  modules, l10n drift gate clean). FR2 growth is exactly 59 keys:
  20 demo + 26 trash + 13 business; PS/FA additions are machine
  drafts, **0 reviewed** — unchanged claim.
- **Rules v11: 1,670 lines, SHA `0f19f56e…`, strip-proof ≡ v10
  `f10b2ee0…` byte-identical.**
- **Fixtures:** `harness/fixtures/fr2-core.json` (MD5
  `79c4f4696044cf25aa4babea7d94f178`, byte-stable across re-runs)
  is in the CI freshness gate.
- **Known pre-existing caveat (NOT caused by FR2, NOT re-baselined
  here):** re-running all CI freshness exporters drifts
  `f4-core.json`, `h2-core.json`, `h4-core.json`, `h5-core.json`
  by calendar day (dayOffset drift + f4's pre-H1 COA staleness in
  the exporter path). The CI freshness gate, if run on any day
  after generation day, fails on those four files for that
  pre-existing drift. Fixing it (re-baselining + exporter
  determinism) is out of FR2 scope; `fr2-core.json` itself
  re-exports byte-identical.

## Declared deviations (not hidden)

- **Dart UI wiring is web-only for FR2:** the trash panel, the
  new-business creation dialog, and the Dashboard/Settings demo
  buttons are web surfaces. The Dart deliverable is pure-logic
  parity (demo, trash, tenancy) plus golden fixtures — as the task
  allowed.
- **Trash restore/delete are not PIN-challenged:** they follow the
  existing file-restore card's gating (owner-only, no PIN challenge;
  restore additionally requires an empty business). The PIN-gated
  act is the Clear itself.
- **Business creation is not PIN-gated** (see item 3).
- **`resetDemo` and PinGate are untouched:** `resetDemo` stays
  demo-mode-only (its cloud path was already a no-op); PinGate's
  erase path clears the PIN, not data, in production — existing
  intended behaviour. Dashboard/Settings cloud buttons use the NEW
  actions, not `resetDemo`.
- **Clear keeps accounts + default warehouse; storefront/inbox
  untouched by clear** (see item 2).
- **The owner's previously saved loyalty settings, the F5 opening
  stock entry (Rs 589,674 prefilled, NOT posted), and all other
  FR1/owner-side items are unchanged by FR2** — FR2 touches no live
  data at all.
- **No live verification claimed.** Live retest after upload:
  demo opt-in on a fresh account; clear → trash → restore in the
  throwaway account; multi-business creation; platform console
  showing two businesses of one owner.
