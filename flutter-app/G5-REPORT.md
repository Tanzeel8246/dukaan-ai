# Phase G · G5 — Flutter parity for the SaaS layer (close-out)

Design: `ERP-PHASE-G-DESIGN.md` §5 + §8-G5.
State inherited and re-verified at G5 start: web G1–G4
complete (TS harness 1,538/1,538; rules v9 SHA 734f6ba4…);
Flutter F1–F5 complete (analyze 0, `flutter test` 213/213,
fixtures f1–f5 byte-stable). The apps now gain the whole
SaaS layer the web shipped in G1–G4: multi-business
membership, the header business switcher, derived plan state
with its surfaces, and renewal submission — with the web libs
(`tenancy` / `plans` / `renewal` / `platform`) as the semantic
source of truth, ported to pure Dart and proven against
shared truth-table fixtures.

## What was built

**Pure Dart ports** (no I/O, unit- and fixture-tested):
`lib/core/tenancy.dart` (resolver, claim + backfill write
plans, index healing, switcher list, migration + snapshots),
`lib/core/plans.dart` (catalogue derivations, plan state,
counter arithmetic, the client gate, actuals) over the
GENERATED `lib/core/plans_data.dart` (the catalogue as data,
emitted by `tools/gen_l10n.mjs` from `web/lib/plans.ts` —
the generator grew a second output; the drift gate covers
it), and `lib/core/renewal.dart` (quote, submission plan,
lifecycle banner, suspension reason, platform doc shapes).

**Shared truth tables**: `harness/fixtures-export-g5.js`
(additive; `harness.js` untouched) composes
`fixtures/g5-core.json` from the REAL web functions only —
resolver truth table (11), claim plans (7), backfill (4),
index heal/merge/switcher/status (5), snapshots (7) + PKT
month keys (4), plan-state boundary table (16: end−1ms, end,
end+1ms, end+30d, end+30d+1ms for trial and paid, suspended
overlay incl. over founding, founding eternal, dateless
paid), gates (7), counter transitions (10) + caps (7) +
actuals (2), month-add clamps (6), quotes (10), submissions
(8), lifecycle walk (10), suspension reasons (5), and the
cross-client leg. `test/g5_fixtures_test.dart` (128 tests)
asserts the Dart ports against every row;
`test/g5_core_test.dart` (6) pins the catalogue partition
(the four tier bands are disjoint and cover exactly the 40
RBAC modules; trial runs the Standard module set).

**Store wiring** (`lib/data/store.dart`): session resolution
mirrors web `resolveSession` leg for leg — ① pending-invite
claims via the `invites` collection group (businessId from
the doc path), executed through one platform-write executor
(registry `trialEndsAt` string→Timestamp conversion included,
as web), ② the legacy `staffIndex` leg with membership
backfill (the business survives healing when backfill was
refused), ③ the `userMemberships` index healed against live
membership docs and persisted only when changed, ④ own
business + display names. Session watchers (index bid-set,
active membership existence) re-resolve non-initially;
an empty re-resolution lands on the no-access screen.
`_subscribeAll` gains the G-layer subscriptions for the
ACTIVE business (registry, counters, events, invites,
members; payments + platformConfig owner-only), all
error-swallowing. `postBill` / `recordCounterSale` run the
plan invoice check before composing and ride the invoice
counter inside the posting batch (merge, baseline-safe);
staff actions write the G shape (invite + counter ride ±1 +
audit event; role follows invite→membership→legacy index;
removal cuts every leg and rides −1 only when an invite or
membership existed). The registry migration runs once per
sign-in on the owner's load when `businesses/{uid}` is
missing. Renewal submission is owner-only and lands ONE
`platformPayments` add born `submitted` — the journal
choke point is untouched.

**Shell + surfaces** (`lib/main.dart`, `features/`): the
header business switcher (popup in the top header; invisible
chrome at ≤1 business; the pick persists under the web's
`dukaan-ai-active-business` key; switching re-points every
subscription and resets plan state); lifecycle banners with
web's copy assembly (trial days + pool figures,
approaching/urgent, grace elapsed/left, read-only, suspended
with the console's reason + remedy) and the dismissible
refusal banner (invoice-cap / member-cap / posting-paused —
never a raw rules error); plan-locked module doors from the
snapshot tier with `plan.lockedBody` upgrade copy, lock
badges on rail + More grid, and an owner renew CTA (Reports,
Settings and the app-only Sync Centre are never locked);
the Settings plan panel (owner-only; observation rows with
counter-vs-actual, platformConfig instructions read-only,
quote line re-derived per change, pending banner, history —
last 5 with state badges); staff rows labelled
joined / pending / legacy; the sync centre's rejected-write
tray is stamped per business at refusal time, shows only
the active business's entries (labelled by business name),
counts the rest, and dismisses by global index. Pre-G5
tray entries (no business id) are attributed to the
account's own shop.

**Cross-client leg** (in fixtures): one staffer
(`shared@staff.com`) — cashier in trial business A via
membership, manager in basic business B. The bill in A
(Rs 2,100) and the counter sale in B (Rs 435) compose
byte-identically in Dart; A's trial pool moves 3→4 (never
rolls), B's monthly counter moves 41→42; each business's
journal balances to 0 — web-composed and app-composed
state agree to the rupee.

## Per-feature status

| # | Feature (§8-G5) | Status |
|---|---|---|
| 1 | Membership resolution parity (owner → membership+mirror → legacy) | **Wired** — fixture-proven; resolver runs at sign-in and on watcher re-resolution |
| 2 | Invite claim at sign-in, incl. legacy backfill leg | **Wired** — claim/backfill write plans executed verbatim |
| 3 | Removal mid-session loses the business | **Wired (mirrored)** — same two watchers as web (index bid-set + active membership doc); re-resolution is a fresh read round, so the loss lands on the next snapshot event, as on web |
| 4 | Header business switcher | **Wired** — hidden for single-business users; subscriptions re-point; queue/tray switch-safe (below) |
| 5 | Offline queue + rejected tray switch-safety | **Wired** — the queue is Firestore's per-namespace cache (absolute by construction); tray entries carry their business id and are labelled/filtered per business |
| 6 | Plan-state surfaces (banners, locked doors, counters, gated refusals) | **Wired** — boundary semantics fixture-proven (end instant in-period, grace +30d inclusive, readonly +1ms, suspended overlay, founding eternal) |
| 7 | Renewal submission + history + instructions | **Wired** — quote parity fixture-proven (annual 10×, later-of period start, UTC month clamp); one platform write, zero journal effect |
| 8 | Registry migration on owner load | **Wired** |
| 9 | Trial birth inside the app | **Not wired — by surface, declared**: the app never births a namespace (the standing F1 rule: the app never seeds/creates a shop). `planTrialBirth` is ported and fixture-covered; birth happens on web signup / migration |
| 10 | Locked doors for the documents desk | **Wired with a granularity delta**: the app has ONE documents destination, locked on `quotations`; web locks per route — but every document route's module sits in the same (standard) tier band, so the lock outcome per tier is identical |
| 11 | Demo mode | **N/A** — the apps have no demo mode; the design's web-only demo stays web-only |
| 12 | i18n | **Regenerated only** — 2,761 keys EN ≡ UR, drift gate clean (the pre-G5 Dart dictionary was stale at 2,581 keys; regeneration was part of this increment) |

## Verification (all observed in this session)

- `flutter analyze` — **No issues found**.
- `flutter test` — **347/347** (213 F1–F5 + 134 new G5:
  128 fixture assertions + 6 catalogue tests).
- TS harness — **1,538/1,538 ALL SUITES GREEN** (harness.js
  unmodified; the G5 exporter is additive).
- Fixtures f1–f5 **byte-identical** after re-export
  (md5 f1 `cfad6131…`, f2 `f77ad00a…`, f3 `25123992…`,
  f4 `02fa26ef…`, f5 `36660397…` — unchanged from the
  pre-G5 baseline); `g5-core.json` added.
- `node tools/gen_l10n.mjs --check` — drift gate clean.
- CI (`.github/workflows/app-ci.yml`) gains the
  `fixtures-export-g5.js` line, so the byte-stability gate
  covers `g5-core.json` too.

## Not claimed / limits

- **No APK build** (the VM's Gradle↔Java IPC hang is
  F1-proven) and **no live-Firebase or device run**: the
  session resolution, watchers and subscriptions are
  written against the web provider's exact read/write
  shapes and the pure logic is fixture-proven, but no
  emulator/device behaviour is claimed.
- **Rollout (owner-side, shared with G4's notes)**: the
  two composite indexes (platformPayments
  businessId+submittedAt, businessEvents businessId+at)
  are required for the renewal history / suspension
  reason; the `invites` collection-group query needs the
  collection-group index Firestore prompts for on first
  use. Until they exist those reads fail silent by design
  (claims retry next sign-in), exactly the web posture.
- GitHub pushes remain **parked** by owner decision —
  none attempted.
