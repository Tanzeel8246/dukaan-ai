# Dukaan AI — Phase H Release Audit (H6 close-out)

**Date:** 2026-10-23 · **Scope:** Phase H (loyalty + storefront + WhatsApp
marketing + Pashto/Farsi language packs) — increments H1–H5 + PS/FA as
built, plus the four audit fixes this close-out was charged with.
**Method:** the phase-end checklist of `ERP-PHASE-H-DESIGN.md` §6 is the
contract; every claim below was re-run fresh in this session against the
tree as it stands, not carried from increment reports. Where an increment
declared a partial, the partial is either closed here (with its fix) or
collected in §D — nothing is silently dropped.

**The defining invariants, re-asserted at close:** the journal is
append-only and every money event is exactly one atomic balanced entry
through the guarded choke point (web `makeEntry(` sites: **24** in
StoreProvider + **3** named compositions in `web/lib/loyalty.ts` = 27;
Dart `makeEntry(` = **42** — all three counts re-grepped this session);
balances are always derived, never stored counters; plan state is
derived from the assignment snapshot, never stored; `enforce` remains
**false** everywhere (the owner flips per business at rollout); the
platform layer holds zero tenant content; PS/FA remain labelled machine
**DRAFTS** (0% reviewed — no review is claimed anywhere in this audit).

---

## A. Fresh full verification (this session, final tree)

| Gate | Result |
|---|---|
| Web harness (`node harness/harness.js`) | **1,754 passed, 0 failed — runner exit 0** (1,731 inherited + 23 new H6 checks) |
| Web `tsc --noEmit` | **clean, exit 0** |
| Web `npm run build` (server) | **Compiled successfully** (38/38 static pages generated) |
| Web `npm run build:static` (demo bundle → `web-deploy/`) | **built**; `index.html` at root; new consent copy present in shipped chunks |
| Flutter `analyze` | **No issues found** |
| Flutter `test` | **479/479 passed** (478 inherited + the new `h6_fixtures_test.dart`) |
| Rules file | v10 FINAL as amended by H6: **1,489 lines, SHA-256 `f10b2ee07ceb0c5a583f3762fa021222fb1a9a90832bf566956ae157372220ba`** |
| Strip chain (extended) | stripH6 alone ≡ WA-era v10 FINAL `e556c92e…` **byte-for-byte**; stripWa∘stripH6 ≡ H3-final v10 `4a410729…`; stripH3∘stripWa∘stripH6 ≡ v9 FINAL `734f6ba4…` — proven in the WA suite (pin amended with lineage), the H6 suite, and standalone |
| Frozen seed identities | journal **21 entries** · Inventory **272,805** · Cash **50,000** · payables **27,900** · receivables **5,500** · TB **0** · SHA **`e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168`** — intact, re-asserted in the H6 suite |
| Dictionaries | **3,058 keys × 4 locales**, key sets exactly equal on both stacks; delta vs the inherited 3,057 proven to be **exactly `+shop.consentLabel`** in each locale (removing the key reproduces the pre-change canonical hash of every dictionary — EN/UR values otherwise byte-untouched, PS/FA likewise) |
| Review manifest | 3,058 states per language (PS + FA), **0 reviewed**, reviewer null; `shop.consentLabel` landed as `draft`; regeneration kept 3,057 states, dropped 0 |
| Review packs | regenerated: **3,058 rows** per language (CSV + MD), money surfaces first |
| Dart l10n | regenerated via `gen_l10n.mjs`; `--check` **drift gate clean** (3,058 × 4, matrix 43 modules) |
| Catalogue / collections / COA | **43 modules** · **38 tenant collections** · **30 COA codes** — unchanged by H6 |
| Indexes | `firebase/firestore.indexes.json` carries 6 indexes incl. the **storeOrders composite (businessId ASC, createdAt DESC)** the rollout needs |

### Fixture md5s (fresh)

| Fixture | md5 | State |
|---|---|---|
| f1-core | `cfad6131345760fb0fe6591866b8dae1` | byte-identical to baseline |
| f2-core | `f77ad00a370f603bf519c3f7f1ae935d` | byte-identical |
| f3-core | `251239926c3bc8c7e5665007e369bd37` | byte-identical |
| f4-core | `02fa26efdf65f3be9c511948bd7bbc1d` | byte-identical |
| f5-week | `36660397ee16080965c47a5ffe666138` | byte-identical |
| g5-core | `5eb2eea62e04329b63246185339cd457` | byte-identical |
| g6-core | `22194673de3f6d3120501ae32a20bb2b` | **re-baselined by Fix 4** (was `2d09a70a…`) — current assemble shape; additions only, zero value changes (§B.4) |
| h2-core | `9fd58f6dc0bf285d29e995bd06473be1` | **re-baselined by Fix 4** (was `9575fba9…`) — exactly ONE field: `fyCloseCase.entry.id` (§B.4) |
| h4-core | `11cea2c20933ace57d4c0f5d67eb531e` | byte-identical |
| h5-core | `67fd8649878f88d9d03dfdb3ec16d2ed` | byte-identical |
| h6-core | `15e612822a4a399bce89a5317ff22a4c` | **new** (Fix 4) — web day-close derivation, deterministic literal data |

All eleven fixtures re-export to a **no-op diff**; the CI freshness gate
now runs all eleven exporters (see §B.4).

---

## B. The four audit fixes

### B.1 — Web backup tolerance (declared by H5; the §9 data right)

**Defect.** Web `verifyBackup` refused every pre-WhatsApp backup as
`not-a-backup`: `computeManifest` demanded all 38 collection arrays, so
even the frozen G6 fixture file (a genuine 35-collection backup) failed
verification on web — while the Dart twin deliberately restored such
files under the H3 precedent. A backup format that strands old backups
breaks §9: the file is the shop's data right, not a format error.

**Fix (web aligned to the Dart tolerance, `web/lib/backup.ts`).**
`computeManifest` treats an **absent** collection array as empty (a
collection **present but not an array** is still corruption);
`verifyBackup` defaults the three WhatsApp-era counts
(`waTemplates`/`waCampaigns`/`waSends`) to 0 in the *stored* manifest —
the exact mirror of the pre-existing H3 `platformCounts` defaulting
beside it; `planRestore` iterates `backup.collections[name] ?? []` in
both its index and write loops. Every real disagreement still refuses:
the recompute itself is unchanged.

**Proof (harness suite H6).** The frozen g6 fixture file now **verifies
on web** and **plans a restore** (9 writes, zero of them into WA
collections); all six fixture verify cases keep their pinned outcomes
(whole ok; count +1 and one journal digit → `manifest-mismatch`;
format 99 / schema 7 → `unknown-format`; non-backup → `not-a-backup`);
a smuggled WA doc the manifest does not count still refuses as
`manifest-mismatch`; a non-array WA collection still refuses as
`not-a-backup`. The full G6 suite (restore truth table included) is
untouched and green.

### B.2 — Storefront checkout consent tick (declared by the WhatsApp increment)

**Defect.** Consent for storefront-originated customers could only be
asserted at the desk during conversion (a shopkeeper toggle). The
doctrine (design §3.2) wants the consent to be the **customer's own
act**: the public checkout form carried no tick, because H3's order
shape is exactly-keyed in rules, lib and both clients.

**Fix (one key, landed as an H6 rules amendment in the H3/G2 span
discipline).**
- **Rules:** `storeOrderCreateOk`'s key-set head is wrapped in a
  delimited span `Phase H · H6 amendment (order consent key)`:
  `hasOnly` gains `'waOptIn'`, plus the guard
  `(!keys.hasAny(['waOptIn']) || d.get('waOptIn', false) == true)` —
  present ⇒ exactly `true`; absent ≡ unticked. A delimited H6 note
  span joins the header notes. `stripH6Blocks` (harness) removes both
  spans, restoring `H6_ORDER_ORIG` byte-exact; the WA suite's strip
  pin was amended (lineage recorded) to run `stripH6Blocks` first —
  the composed v9 proof needed no H6 step because the amendment span
  nests inside the H3 helpers span the H3 strip already cuts.
- **Lib (both clients):** `STORE_ORDER_KEYS` / `_storeOrderKeys` gain
  `waOptIn`; the shape mirrors reject any present non-`true` value;
  `composeStoreOrder` stamps the key **only** from an explicit `true`
  input (unticked and `false` both compose the key absent);
  `StoreOrder.waOptIn?: boolean` (Dart: `bool waOptIn`, `fromMap`
  `== true`, `toMap` emits the key only when true).
- **Public page:** a first-person checkbox (default OFF) above the
  place-order button, labelled by the new key `shop.consentLabel`;
  the demo preview still never writes.
- **Conversion (both clients):** the stamp now derives from
  **`order.waOptIn === true`** alone (`waConsentPatch("storefront",
  true, now)` in the same batch as the SO + customer resolution); the
  `opts` plumbing and the desk capture checkbox/dialog are **removed**
  — the desk inbox and the app dialog only *display* the customer's
  tick (badge/chip) when the order carries it. Conversion without the
  flag stamps nothing. **Import still can never carry consent**
  (`stripImportConsent` untouched), and the counter source is
  unchanged.
- **i18n:** `shop.consentLabel` added to all four dictionaries (EN/UR
  copy; PS/FA as machine drafts in the manifest, badge rules
  unchanged) — total 3,057 → **3,058**, with the ~18 count pins and
  the H3 storefront-part pin (108 → 109 keys) amended with lineage,
  the manifest + packs regenerated (state-preserving), and Dart l10n
  regenerated drift-clean.

**Proof.** H6 suite: rules SHA pin + both strip directions; composer
truth table (true → key; absent/false → no key); shape rejection of
`false` / `"yes"` / `1`; source pins for the provider (stamps from the
order, no `opts?.waOptIn` anywhere), the public form (tick wired to
the composer), and the desk view (display-only, no setter remains);
four-locale presence of the key. Flutter: analyze clean, full suite
green (the h4 fixture suite replays conversion against the new
signature).

### B.3 — Demo completeness: the demo seed's loyalty programme (deferred by H1)

**Gap.** The demo — the showroom every prospect sees — had no loyalty
story: the programme resolved OFF and every balance read zero, so H1's
headline feature was undiscoverable in demo. (H3's storefront half of
the deferral was already satisfied: the demo preview stands as built.)

**Fix (demo-only getters, `web/lib/seed.ts` + `seedCollections`).**
`getDemoLoyaltyEntries(customers)` composes an eight-entry story with
the **real** earn composer (`buildLoyaltyEarnEntry`) over bill entries
shaped exactly as the billing flow posts them (cash leg, COGS/inventory
legs, and — for the redemption — a Dr `loyalty_payable` tender leg
carrying `ref: customerId` and the `loyaltyPointsUsed` payload, the
fold's attribution contract): cu-1 earns 120 + 80 on two cash bills,
cu-2 earns 250 on one, cu-1 then tenders **150 points** (Rs 150 of a
Rs 2,000 bill, inside the 50% cap) and earns 20 more. `getDemoSettings`
returns the seed settings with `loyalty: { enabled: true }` at the
resolver's Q1 default terms. `seedCollections` appends the entries
after the frozen journal and uses the demo settings; **the cloud
seeder never calls either getter** — a real shop's journal stays the
frozen 21 and its programme stays OFF. Demo remains hermetic (local
state; no writes leave it).

**Proof.** H6 suite: `getSeedJournal` still composes exactly the
frozen 21 (SHA `e17e5bda…` re-asserted); the demo journal (29 entries)
balances entry-by-entry with TB 0; cu-1 = **70 pts / Rs 70**, cu-2 =
**250 pts / Rs 250**; programme liability **Rs 320** in the fold and
in the GL (`loyalty_payable` −320); demo settings resolve enabled,
production seed settings resolve OFF. Dart: no bundled seed exists in
the apps — nothing to mirror (stated plainly: this fix is web-demo
only, by construction).

### B.4 — Dart day-close alignment + exporter determinism (declared by H2/H4)

**Defect 1 (divergence).** The apps' day-close buckets were inline in
`features/day_close.dart` and had drifted from web `dayCloseSummary`:
voided bills counted, cheque parts bucketed, credit parts dropped,
no counter sales, supplier payments summed unfiltered.

**Fix.** `dayCloseSummary` is ported as a pure function into
`flutter-app/lib/core/ledger.dart` (the web function's home), with the
web's predicates verbatim; the feature now calls the port with the
web view's glue (cash refunds on non-voided bills only; cash in/out
from cash entries) and saves `salesByMethod / expensesTotal /
creditGiven / creditReceived / supplierPaid` from it. The row's
`expectedCash` stays the **journal-derived** figure on both clients,
exactly as the web records it.

**Proof.** New exporter `harness/fixtures-export-h6.js` computes the
web summary over a crafted dataset exercising every rule (cheque +
points parts, voided + held bills, credit part, counter sale, cheque
expense/repayment/supplier payment, a reversal row) →
`fixtures/h6-core.json`; `flutter-app/test/h6_fixtures_test.dart`
asserts the Dart port reproduces it field-for-field (cash 1,600 ·
jazzcash 500 · credit 800 · expenses 650/300 · credit 1,200/825 ·
supplierPaidCash 600 · expectedCash 6,060). The TS harness re-derives
the same expected block from the same inputs.

**Defect 2 (determinism).** Two exporters could not reproduce their
committed fixtures (the H4 incident), so both sat outside the CI
freshness gate:
- **h2:** `fyCloseCase.entry` was captured **before** the walk's
  deterministic `stamp()` ran, keeping the wall-clock id `makeEntry`
  minted (`j-mvks8hhtl`, recovered by md5 search in H4). Fix: stamp
  **before** capture — case and walk now carry the same id (`h2-e21`)
  by construction. Separately, the seed journal the exporter embeds
  carries today-relative timestamps (the seed getters re-base against
  today by design); `pinRowTs` re-anchors every (ts, dayOffset) row
  to the fixture epoch **2026-10-23**, preserving the getter's PKT
  time-of-day. Re-export diff vs the old baseline: **exactly one
  field** (`fyCloseCase.entry.id`) — new md5 `9fd58f6d…`.
- **g6:** the same ts-pin; the remaining drift was legitimate shape
  evolution (post-H3 `assembleBackup` emits the storefront slice;
  post-WA manifests carry 38 collections). **Decision: re-baseline.**
  The exporter's contract is "expected values computed by the real
  web functions" — a fixture frozen at the G6-era shape no longer
  honours it, and both clients provably tolerate both shapes (Fix 1
  made that fixture-provable on web; Dart always tolerated). The
  re-export diff is **85 additions and zero value changes** (WA
  collection arrays + zero counts, the H3 platform slice + zero
  counts, plan-target fields) — new md5 `22194673…`. The pre-H6 file
  remains the tolerance proof in the H6 suite's verify ladder only
  through its cases; its bytes are superseded as a *freshness*
  baseline, deliberately and on this record.
- **Gate:** `.github/workflows/app-ci.yml` now runs **all eleven**
  exporters (f1–f5, g5, **g6**, **h2**, h4, h5, **h6**) with a comment
  recording why the three were excluded until now and what H6
  changed. All exporters re-run to a no-op diff in this session, and
  g6/h2/h6 are md5-pinned in the H6 suite.

---

## C. Acceptance matrix — design §6 phase-end checklist

| # | Checklist item | Verdict | Evidence |
|---|---|---|---|
| 1 | Frozen seed identities stand | **PASS** | §A table; H6 suite re-asserts SHA + counts on the final tree |
| 2 | Loyalty identities + full lifecycle, TB 0 (GL ≡ fold ≡ Σ customers) | **PASS** | H1/H2 suites (earn/redeem/return/clawback/expiry/FY-close lifecycle over the fixture walk); demo identities added by Fix 3 (320 = 70 + 250, fold ≡ GL) |
| 3 | `makeEntry(` choke-point counts (27 web / 42 Dart), greppable | **PASS** | Re-grepped this session: 24 StoreProvider + 3 loyalty.ts; Dart 42. H6 added **zero** new sites |
| 4 | Rules strip (v10 − H spans ≡ v9) + public-leg fixtures | **PASS, extended** | Chain now H6 → WA → H3 ≡ v9; stripH6 alone ≡ WA-era v10; public-leg (storefront) fixtures green in H3/H4 suites |
| 5 | Storefront conversion: no public-write → journal path except member conversion → SO → bill | **PASS** | Unchanged path (H3/H4 suites); H6 changed only the consent stamp's *source* — from the order's own flag, same batch, same exactly-once claim |
| 6 | Privacy: platform collections gained zero H fields | **PASS** | H6 adds nothing platform-side (`waOptIn` lives on the public order doc + the tenant customer doc, stamped at conversion); G/H privacy pins green |
| 7 | i18n parity in FOUR locales + manifest coverage 100% + badge derivation | **PASS** | 3,058 × 4 key sets exactly equal; manifest covers 3,058/3,058 per language, 0 reviewed, reviewer null; badge derived (`localeIsDraft`), never stored; packs regenerated money-first |
| 8 | Demo build: loyalty on, storefront preview labelled, PS/FA badge truthful, zero platform/public writes | **PASS** | Fix 3 (programme ON in demo only, identities pinned); preview badge + hermetic preview unchanged; badge derives from the manifest in the demo shell too; demo writes nothing |

**Phase H is complete against its design contract**, with the four
audit fixes landed and the partials honestly carried in §D.

---

## D. Declared partials — the one honest list

**Closed by this close-out** (were partials; are not any more):
web backup intolerance of pre-WA files (Fix 1) · the missing public
checkout consent tick (Fix 2) · the demo's missing loyalty programme
(Fix 3) · the Dart day-close bucket divergence and the g6/h2 exporter
exclusions from the CI gate (Fix 4).

**Still partial, by increment:**

- **H3** — the static export emits only `/s/demo` as a real file;
  real shop slugs need the server build / host rewrite (the upload
  vehicle is the static demo bundle; the live storefront runs on the
  server deployment). Per-line order validation is lib-side because
  rules cannot iterate a list (commented in the rules themselves).
  An enabled-but-plan-dark member read renders the desk without the
  preview badge.
- **H4** — the apps render no QR anywhere (Raast is a bank-issued
  image by design): desks offer link + copy + share only. Web wart:
  `store.state.darkState` renders its `{state}` placeholder
  literally; the app fills it (the apps are correct, the web string
  is not — copy fix rides the owner's next dictionary pass, since
  EN/UR values are otherwise frozen by the no-touch discipline this
  phase observed).
- **WhatsApp (web)** — the service-due audience uses a **90-day**
  default interval where the design pinned no number (owner may set
  the real interval per business). A voluntary skip in the send
  queue is a session cursor, not a stored state.
- **H5** — the apps have no `url_launcher`: the queue's Open records
  `opened` and then shares the wa.me link via `share_plus`. The log
  semantics are identical and no delivery state is fabricated, but
  the transport differs from web's direct open.
- **PS/FA** — the dictionaries are **machine drafts, 0 of 3,058
  reviewed** in each language; they ship labelled ("Draft preview"
  badge in the picker, Settings and the app popup) until a named
  human reviewer works the packs (money surfaces first). The AI
  assistant **engine** stays EN/UR — the typed boundary maps ps/fa
  to English for the engine only; all UI chrome is translated.
  `settings.languageSub` EN/UR copy still says "English or Urdu"
  (frozen by the no-touch rule). A few pre-existing app-only
  hardcoded EN/UR Flutter strings remain. **No screenshot
  verification was possible** in this environment — shaping is
  proven at widget/data level only. The reviewer-flag list
  (currency روپۍ/روپیه, udhaar پور + gloss, interest-free
  loan-charge wording, Dr/Cr kept Latin, `fin.fy`/`pay.finalise`
  strings as top polish targets) stands in PRODUCTION.md.
- **Fix 4 residual** — the day-close *derivation* is fixture-proven
  on both clients; the view *glue* that feeds it (refund/cash-entry
  predicates) is source-mirrored line-for-line from the web view in
  both clients but is not itself fixture-pinned (true of the web
  glue as well — it has never had a fixture).

**Standing items (not H defects):** the generated Raast P2P QR stays
**PROVISIONAL** pending the owner's bank-app screenshot (it pins
`RAAST_FRAMING` on web + apps); the F §7.5 device acceptance run has
never executed (it needs an installable APK); ESC/POS printing has
never been device-verified; a local APK build is impossible on this
VM (Gradle/Java TLS vs the egress proxy — CI is the build route);
`enforce=false` everywhere until the owner flips per business;
Firestore rules text is string-proven and shape-mirrored in two
clients, as in every prior phase — no rules compiler exists in this
environment, so first deployment remains the owner's live check.

---

## E. Packages

- `~/workspace/dukaan-ai-ERP-H.zip` — the fresh static build
  (`web-deploy/`), **supersedes `dukaan-ai-ERP-G.zip`** as the upload
  vehicle. (Bytes / entries / SHA-256 recorded in PRODUCTION.md at
  packaging; index.html at root and content markers verified in the
  shipped bytes, incl. the new checkout consent copy.)
- `~/workspace/your_files/dukaan-ai-FULL-source-for-github.zip` —
  refreshed with the complete H layer (H1–H5 + PS/FA + this audit +
  the four fixes) and a regenerated
  `dukaan-ai-FULL-source-MANIFEST.txt` whose spot-check list includes
  the i18n review packs + `review-manifest.json`. `.env*` excluded,
  as always.
- **GitHub stays PARKED by the owner's order — packaged only,
  nothing pushed.** No live deployment, no CI run and no reviewed
  translation is claimed by this audit.

---

## F. Rollout runbook (updated; owner-executed)

1. **Deploy rules + indexes FIRST** — `firebase deploy --only
   firestore`: rules v10 FINAL as amended by H6 (SHA `f10b2ee0…`,
   1,489 lines) and `firestore.indexes.json` (incl. the storeOrders
   composite, businessId ASC + createdAt DESC). Rules-first is
   load-bearing for Fix 2: a checkout order carrying `waOptIn` is
   only legal under the amended rules; pre-H6 clients are unaffected
   (the key is additive and they never write it).
2. **Upload `dukaan-ai-ERP-H.zip`** (supersedes ERP-G) for the web
   app; the Flutter apps ship through the owner's one-push → CI →
   app-release route when he chooses.
3. **Bootstrap `platformAdmins/{owner UID}` by hand** if not already
   done (the G runbook step; the console has no self-service path by
   design).
4. **Observe the counters** (businessCounters / platform stats)
   through the first days; watch the storefront inbox + WhatsApp
   send log on the first live business.
5. **Flip `enforce` per business** when each shop is ready — the
   flag remains false everywhere until then.
6. **PS/FA reviewers (owner's human task):** recruit one named
   reviewer per language; the packs are money-surfaces-first, so a
   partial pass already covers billing, finance, reports and print.
   Merges run through `harness/review-merge.js` (drift-refusing;
   states never move backwards); the Draft badge drops per language
   only at 100% reviewed.

---

## G. Still open (owner-gated, unchanged by this audit)

- The rollout itself (§F) — deploy order in hand, execution is the
  owner's.
- One git push of the refreshed FULL-source package → CI → the
  app-release click → F §7.5 device acceptance.
- The Raast bank-app QR screenshot (clears the PROVISIONAL flag).
- Plan prices/limits confirmation (G design Q1; anchors Basic
  Rs 1,500 / Standard Rs 2,500 / Advanced Rs 4,000, annual 10×) and
  the loyalty defaults confirmation (H design Q1 — structure
  proceeded on the recommendations: 1 pt / Rs 100, 1 pt = Rs 1,
  50% cap, 12-month expiry, Silver 500 × 1.25, Gold 2,000 × 1.5).
- PS/FA named human reviewers (packs ready, §F.6).
