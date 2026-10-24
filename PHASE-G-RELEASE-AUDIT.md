# Phase G — Release Audit (G1–G6)

Independent release audit, run fresh on 2026-10-23. Nothing taken on
trust from the increment reports; every gate re-run from a clean
state and every targeted seam re-read in source.

Phase G's defining invariant holds: **the SaaS layer never touches
the journal.** Tenancy, plans, counters, enforcement, lifecycle,
renewal and backup/restore all live OUTSIDE the tenant namespace
(platform collections) or move tenant documents as data — nothing
in G1–G6 composes or posts an entry. `makeEntry(` occurrences in
`components/StoreProvider.tsx` are still exactly **24** (asserted by
the harness at G6), the platform holds **no shop keys** (a super
admin can read platform state, never a shop's books), plan state is
**derived, never stored**, and the frozen seed is untouched (below).
`enforce` ships **false** in every default on both clients — Phase G
ships the lifecycle and the gates, not the lock; each business's
flip is a deliberate post-launch console act (see Rollout).

## A. Fresh full verification

| Gate | Result |
|---|---|
| Harness (`web/lib` recompiled fresh via harness tsconfig, run from scratch) | **1,569 passed, 0 failed — ALL SUITES GREEN**: FIN 34 · COA 10 · A2 16 · RBAC 115 · A4 56 · A5 51 · B1 40 · B2 39 · B3 37 · B4 34 · B5 38 · B6 34 · SEARCH 72 · REPORTS 68 · C1 46 · C2 49 · C3 56 · C4 75 · C5 61 · FIX 37 · D1 38 · D2 48 · D3 50 · D4 44 · D5 40 · E1 39 · E2 47 · E3 50 · **G1 42 · G2 35 · G3 37 · G4 35 · G6 31** · E4 49 · E5 16 |
| Frozen seed (asserted in FIN/B1, re-asserted in G6 against the backup fingerprint) | **21 entries · Inventory 272,805 · Cash 50,000 · payables 27,900 · receivables 5,500 · TB 0 · SHA e17e5bda…1168** |
| App `tsc --noEmit` (web, strict) | **0 errors** |
| `npm run build` | **exit 0** |
| `npm run build:static` | **exit 0**; `out/index.html` at root |
| Flutter `flutter analyze` | **No issues found** |
| Flutter `flutter test` | **366 passed, 0 failed** (347 inherited + **19 new G6**: 4 SHA-256 KATs · 3 fingerprint · 7 manifest verify · 5 planner truth-table) |
| Fixture byte-stability (regenerated from the real compiled web functions, md5 compared) | f1 `cfad6131…` · f2 `f77ad00a…` · f3 `25123992…` · f4 `02fa26ef…` · f5 `36660397…` · g5 `5eb2eea6…` — **all identical to their pre-G6 bytes**; g6 new: `2d09a70a…` |
| Rules | **v9 FINAL — 1,222 lines, SHA-256 `734f6ba4…`**, byte-identical to the G5 close (asserted again by the G6 suite) |
| Rules strip-proof (checklist item, re-run as part of the fresh harness) | The composed strip (G3→G2→G1 delimited spans, amendment spans replaced by their exact pre-G text) reproduces the **v8 SHA `04807268…`**; the archived v8 artifact (`dukaan-firestore-rules-v8.txt`) hashes to the same value — v9 is v8 + G material only, nothing else drifted |
| i18n (web, counted from the freshly compiled dictionaries; Dart via the generator) | **EN 2,786 ≡ UR 2,786** both stacks — parity is compile-enforced on web (`Record<keyof typeof en…>`) and drift-gated on Dart (`gen_l10n --check`: clean). G6 added 25 `backup.*` keys; the harness dictionary pins were amended 2,761 → 2,786 in the house lineage style |
| Bundle identity | `dukan-8246` present in the static bundle (×3 in the shipped zip, as at E) |
| 'Demo' tokens (bundle, the standing measure) | **27** (resetDemo 10) — **identical to the Phase E audit**; Phase G added none. The backup card mounts only outside demo (`mode !== "demo"`), and the demo path attempts zero platform writes |

## B. Targeted re-checks

1. **G1 — tenancy foundation: PASS.** Tenancy is metadata outside
   the namespace (businessId ≡ ownerUid); registry/membership/
   counters live in platform collections; the migration plan
   (`planMigration`) births a pre-G shop's registry from its own
   documents with labelled baseline counters. The resolver's
   truth table is pinned by the G1 suite (42 checks), re-run
   fresh above.

2. **G2 — plans & counters: PASS.** Plan state derives from the
   registry snapshot + counters at every read; the plan-view,
   refusal and counter arithmetic are fixture-shared with Dart
   (G5). Counter reconciliation (checklist): the suites assert
   `invoiceCount` equals an independent count of invoice events
   and the membership count equals membership docs at every
   checkpoint where both are visible.

3. **G3 — enforcement gates + privacy: PASS.** The gate seam is
   the journal choke point's neighbour, never inside it: a
   refused posting fails before any write with the dictionary
   refusal. The privacy suite (re-run at close, per checklist)
   proves the platform grant reads **zero** tenant collections;
   admin power runs over platform documents only. All gates ship
   with `enforce = false`.

4. **G4 — lifecycle & renewal: PASS.** Trial → active → grace →
   read-only → suspended derives from the snapshot + the event
   log; the suspension reason reads back from the business's own
   events; a renewal submission is ONE platform write born
   `submitted` — zero journal effect — and the purchased period
   is fixed at submission (the later of period end / submission
   instant, the shop's favour; declared delta, §D).

5. **G5 — Flutter parity: PASS.** The SaaS layer is ported
   (resolver, plans, renewal, trial birth) with the shared truth
   tables as golden fixtures (g5-core, byte-stable above); the
   cross-client leg holds — web-composed journals and Dart-composed
   journals agree to the rupee while each business's counters and
   plan state derive independently. F5's owner-gated items remain
   exactly as gated as F5 left them.

6. **G6 — backup & restore: PASS** (31 harness checks + 19 Dart
   fixture tests, all fresh). Proven, end to end:
   - **Fingerprint integrity** — the lib's self-contained SHA-256
     reproduces the published known answers and Node's crypto on
     Urdu text and a 100 KB input; fed the frozen seed journal,
     `journalFingerprint` IS `e17e5bda…1168` (ts-blind, one-rupee
     sensitive).
   - **Assembly completeness** — the export carries all 35 tenant
     collections (asserted equal to the store's subscribed set),
     the owner doc verbatim, and the business's OWN platform slice
     only: foreign events/payments planted in the source reads are
     filtered at the assemble seam and never enter the file.
   - **Manifest verification** — recomputed counts/platform
     counts/total/journal fingerprint must equal the manifest;
     the tamper ladder (count +1, one journal digit, a dropped
     doc, a forged fingerprint → `manifest-mismatch`; format 99 /
     schema 7 → `unknown-format`; wrong kind / null / missing
     manifest → `not-a-backup`) refuses in the design's order,
     on both stacks.
   - **Round-trip identity** — backup → restore into a fresh
     namespace reproduces the journal fingerprint, the owner doc,
     and a canonical selector digest (trial balance rows+totals,
     inventory, cash, payables, receivables, per-customer
     outstanding, per-supplier balances, per-account balances,
     stock rows, collection counts) **byte-identical** to the
     source's. The journal restores as documents — **zero entries
     composed** (24 `makeEntry(` sites, unchanged).
   - **Refusal truth table** — an altered journal line, a foreign
     extra entry, a stray doc, or a foreign member in the target
     each refuse `target-not-empty` and plan zero writes; an
     owner-doc difference alone never refuses.
   - **Resume & idempotence** — applying half a plan and
     re-planning yields exactly the missing remainder (no repeated
     path, event last); re-planning a completed restore reports
     `alreadyRestored` with zero writes and **no second event**.
   - **Write order** — tenant docs, memberships, invites, the
     owner doc LAST among data writes (the source shop's period
     lock cannot gate the transplant's own dated creates), then
     the `restore.performed` platform event citing the source
     business + the manifest fingerprint.
   - **Availability** — the export is reads-only and its panel
     never consults plan state (asserted by absence in source):
     the backup exists in trial, grace, read-only and suspended
     alike — §3.7's data right. Restore is owner-only, into the
     owner's own namespace only.

## C. Acceptance matrix (design §8) + phase-end checklist

| Increment | Acceptance | Verdict |
|---|---|---|
| G1 tenancy | Registry/membership/counters outside the namespace; migration from own docs; resolver truth table | ✅ (42 checks) |
| G2 plans & counters | Derived plan state; counters reconcile with independent counts; refusal vocabulary | ✅ (35 checks) |
| G3 enforcement | Gates refuse pre-write; privacy suite (platform reads zero tenant collections); ships `enforce=false` | ✅ (37 checks) |
| G4 lifecycle & renewal | Derived lifecycle incl. suspension overlay; one-write renewal submission; period fixed at submission | ✅ (35 checks) |
| G5 Flutter parity | Resolver/plans/renewal in Dart against shared fixtures; cross-client journals agree | ✅ (Dart 366 incl. g5) |
| G6 backup & restore | §9 export/restore; refusal truth table; round-trip identity; this audit; distinct-zip delivery | ✅ (31 + 19 checks) |

Phase-end checklist (design §8), item by item: frozen seed
re-asserted post-migration ✅ (G1/G6 suites over the fixture shop) ·
users-tree purity across migration/assignment/suspension/renewal/
restore ✅ (G suites assert write paths; restore plans contain no
source-namespace path and no registry/counter transplant) · rules
strip-proof v9−G ≡ v8 ✅ (§A) · counter reconciliation ✅ (item 2) ·
privacy suite re-run ✅ (item 3) · plan-state truth table identical
in TS, Dart and rules fixtures at every boundary instant ✅ (G2/G3
suites + g5 fixtures, all fresh) · i18n parity at 2,786 with no
hardcoded strings on G surfaces ✅ (§A; G surfaces read only
dictionary keys on both clients) · demo untouched ✅ (§A).

## D. Declared partials & deltas (the honest list)

From the increment reports, collected — none hidden:
- **G1:** migration counters are labelled baselines until G2's
  reconciliation takes over; a legacy staffer's chip reads
  "legacy" until that staffer's first G sign-in.
- **G2:** `memberCount` counts SEATS (the staffEmails mirror size),
  not heads; the counter race bound stands — two tills composing
  from one snapshot: the second batch fails at commit and the
  panel shows the drift rather than hiding it.
- **G3:** the enforce-flip check compares counters against soft
  telemetry + membership count BY DESIGN (there is no stronger
  in-client signal); a flip made anyway is recorded
  `confirmedDespiteDisagreement: true` in the event log.
- **G4:** the purchased period is fixed at submission (later of
  period end / submission instant); `platformConfig/main` does not
  exist until an admin saves it once — until then the renewal
  instructions simply render empty.
- **G5:** trial birth is ported and fixtured but NOT wired in the
  apps (apps never birth namespaces; births happen on web);
  ESC/POS direct transport is implemented but never
  device-verified; the F4 brand WebP ladder encodes PNG; the
  salary-slip print is PNG + text share.
- **G6:** restore targets the signed-in owner's OWN namespace
  only (there is no cross-business restore surface — by design,
  the planner's target is the caller's business); the registry
  and counters are NOT transplanted (the target keeps the
  registry it was born with, and its counters reconcile through
  the ordinary Plan & usage baseline path, so a restored shop's
  usage counts start from its born baseline, not the source's);
  membership/invite documents transplant verbatim under the
  target's paths (their schema carries no inner business id —
  the path is the identity); the export is a point-in-time
  one-shot read set, not a transactional snapshot (Firestore has
  no multi-collection snapshot read — a write landing mid-export
  could straddle two reads; the manifest still verifies the
  file's internal consistency exactly as written). The manifest
  fingerprint verifies the FILE (pre-write, both stacks); the
  post-restore identity is proven in the harness by canonical
  digest over the restored documents, as in §B.6.
- **Standing:** the generated Raast P2P QR remains
  PROVISIONAL/unpinned (the owner supplies his bank app's Raast
  QR screenshot — the E3 gate); the F §7.5 owner acceptance
  script has never been run (it needs an installable APK); a
  local APK build is impossible on this VM (the Gradle↔Java IPC
  hang, F1-proven). GitHub pushes remain PARKED by the owner's
  order — the refreshed full-source zip (§E) is the one-push
  vehicle.

## E. Package

- 📦 `dukaan-ai-ERP-G.zip` — **1,837,693 bytes** (4,904,135
  uncompressed), **255 entries / 219 files**, SHA-256
  `00a9fb88…a4fb8d`, `index.html` at root, zip integrity verified.
  Markers in the shipped bytes: `dukan-8246` ×3 ·
  `business-backup` ×1 · `restore.performed` ×1 ·
  `dukaan-backup-` ×1 · 'Demo' 27 (analysis in §A). Contains
  everything through Phase G (A–F + G1–G6) — **supersedes
  dukaan-ai-ERP-E.zip**.
- 📦 `dukaan-ai-FULL-source-for-github.zip` — **refreshed** in
  `~/workspace/your_files/` (360 files: the F5-era 329 + the
  complete G layer, incl. this audit, `ERP-PHASE-G-DESIGN.md`,
  `PHASE-G-RELEASE-AUDIT.md`, `flutter-app/G5-REPORT.md`, the
  five G web libs, the Dart backup/tenancy/plans/renewal cores,
  g5/g6 fixtures + exporters; `.env*` excluded as before). Size
  and SHA-256 are recorded in
  `dukaan-ai-FULL-source-MANIFEST.txt` beside it; the zip was
  re-opened and every spot check verified present. **Nothing was
  pushed** — GitHub remains parked until the owner's one-push.
- `firebase/firestore.indexes.json` now also carries the two G4
  composite indexes (added at G6 packaging; the rules file itself
  is untouched — SHA above): `platformPayments`
  (businessId ASC, submittedAt DESC) and `businessEvents`
  (businessId ASC, at DESC), alongside the existing `invites`
  collection-group index (email ASC) and the two `sales` indexes.

## Rollout (order matters)

1. **Publish rules v9 + the indexes FIRST** (Firebase Console →
   Firestore → Rules → Publish `firebase/firestore.rules`; create
   the indexes from `firebase/firestore.indexes.json` — the two
   composites `platformPayments` (businessId ASC, submittedAt
   DESC) and `businessEvents` (businessId ASC, at DESC), plus the
   `invites` collection-group index on `email`). v9 is purely
   additive over v8 (strip-proof, §A), so publishing ahead of the
   build is safe; until the indexes exist, renewal history,
   suspension reason and invite claims simply stay empty (the
   subscriptions fail silent by design).
2. **Upload `dukaan-ai-ERP-G.zip`** to the dukaan-ai subdomain
   root (do not upload the older zips), then purge the hosting
   cache.
3. **Bootstrap the platform admin:** the owner manually creates
   `platformAdmins/{his Firebase Auth UID}` in the Firestore
   console with fields `email`, `addedAt` (now) and
   `addedBy: "bootstrap"`. Until this doc exists, the platform
   console is closed to everyone — by design, the super admin is
   born by hand, never by a client.
4. **Observe:** sign in as owner → Settings → Plan & usage —
   confirm the counters sit at their labelled baselines and move
   with trading for a few days before trusting any gate.
5. **Flip `enforce` per business, one at a time** (console act,
   never a shipping default): watch the refusal telemetry after
   each flip before flipping the next. `platformConfig/main`
   appears the first time an admin saves the console's config
   tab — do that once so renewal instructions render.

## Still open (owner action)

- **Raast fixture:** the generated P2P framing remains
  `provisional / unpinned` until the owner captures his own
  bank's Raast QR and one scan-test payment confirms the framing.
- **Owner acceptance (F §7.5):** install the app, run the script
  — it has never been run; no device behaviour is claimed beyond
  the fixture proofs.
- **GitHub:** the one-push of the refreshed full-source package,
  at the owner's chosen moment (pushes parked by his order).
- **Per-business `enforce` flips** and the `platformAdmins`
  bootstrap — console acts in the Rollout above, in that order.
