# Dukaan AI — FINAL Production-Readiness Audit (Phases A–H)

**Date:** 2026-10-23 · **Scope:** the whole A→H programme as it stands
in source — the roadmap's last step. This is **not** another phase
audit: the phase audits (C/D/E/G/H) already proved each phase against
its design. This audit re-verifies everything **fresh**, then attacks
the finished system **across** phase boundaries, collects every
standing partial into one classified register, and gives a blunt
readiness verdict.

**Method:** (1) every suite re-run from a clean recompile in this
session, observed numbers only; (2) 40 new adversarial probes written
for this audit against the freshly compiled web libs
(`/tmp/probes.js`, `/tmp/probes2.js` — throwaway by design; the
harness did not grow); (3) source-level caller verification wherever
a probe turned on who calls what. **No live deployment, no CI run,
no push, and no device behaviour is claimed anywhere in this audit**
— none happened.

---

## 1. Fresh full verification (this session, final tree)

| Gate | Observed |
|---|---|
| Web harness (libs recompiled fresh by this audit, then `node harness.js`) | **1,754 passed, 0 failed — runner exit 0** |
| Web `tsc --noEmit` (strict) | **exit 0** |
| Web `npm run build` (server) | **exit 0** — Compiled successfully |
| Web `npm run build:static` (deploy bundle) | **exit 0** — `web-deploy/index.html` present |
| Flutter `analyze` | **exit 0 — "No issues found!"** |
| Flutter `test` | **exit 0 — 479/479, "All tests passed!"** |
| Rules file | v10 FINAL as amended by H6: **1,489 lines, SHA-256 `f10b2ee0…`** |
| Rules strip chain (standalone, harness's own strip helpers) | stripH6 ≡ `e556c92e…` (WA-era v10) · stripWa∘H6 ≡ `4a410729…` (H3-final v10) · stripH3∘Wa∘H6 ≡ **`734f6ba4…` (v9 FINAL)** · stripG1∘stripG2 ≡ **`04807268…` (v8)** — the full chain reproduces byte-for-byte |
| Fixture md5s (all 11) | f1 `cfad6131…` · f2 `f77ad00a…` · f3 `25123992…` · f4 `02fa26ef…` · f5 `36660397…` · g5 `5eb2eea6…` · g6 `22194673…` · h2 `9fd58f6d…` · h4 `11cea2c2…` · h5 `67fd8649…` · h6 `15e61282…` — **all identical to the Phase H audit's table** |
| Dictionaries (independently compiled + counted by this audit) | **3,058 keys × 4 locales** (en/ur/ps/fa), key sets equal |
| Review manifest (independently read) | **3,058 states per language, 0 reviewed**, reviewer null; copy-through whitelist 40 keys |
| Frozen seed (probe BASE) | **21 entries · Inventory 272,805 · Cash 50,000 · TB 0 · SHA `e17e5bda…1168`** — intact |
| Choke point (re-grepped) | web StoreProvider `makeEntry(` = **24**; `lib/loyalty.ts` = **3** named compositions; Dart `makeEntry(` = **42** |
| Catalogue / collections / COA | **43 modules · 38 tenant collections · 30 COA codes** (harness-pinned, green above) |
| Indexes | `firestore.indexes.json`: 6, incl. the **storeOrders composite** (businessId ASC, createdAt DESC) |

Nothing inherited was taken on trust; every number above was
produced by a command run in this session.

---

## 2. Adversarial probes (40) — finance integrity across phases

Verdict key: **PASS** = the attack was refused / the identity held.
Every probe lists what was *expected* and what was *observed*; the
three initial FAILs are disclosed with their root causes in §2.9 —
two were bugs in my probes, one was a fuzz-design correction, and
all three re-proved PASS. **No probe found a system defect; no fix
was needed and none was made.** Two lib-level trust edges were
observed and are registered honestly (R-30, R-31).

### (a) Unbalanced / partial compositions

| Probe | Expected | Observed | |
|---|---|---|---|
| a1/a2 | makeEntry refuses unbalanced and one-sided compositions | throws both times | PASS |
| a3 | a negative-only line cannot smuggle value | filtered at construction; kept lines balance | PASS |
| a4 | constructor admits a vacuous entry (FIN-asserted) ⇒ composers must null-guard zero value | lines=0, balances — so a5–a7 probe the guards | PASS |
| a5–a7 | zero-value compositions return null: sub-base earn (Rs 50 < Rs 100), zero-point clawback, movement-free FY close | null, null, null | PASS |
| a8′ | production builders can only be fed guarded values: `completionAbsorb`/`scrapAbsorb` refuse empty pool + closed order | `empty_pool`, `empty_pool`, `not_open` | PASS (see §2.9) |

### (b) Double-posting

| Probe | Expected | Observed | |
|---|---|---|---|
| b1 | renewal confirm exactly-once | first ok (3 writes, last is the event); second refuses `not-submitted`, **0 writes** | PASS |
| b1b | a payment naming another business refuses | `business-mismatch` | PASS |
| b2 | storefront conversion exactly-once at the planner | `new`→plan; `converted`→null; `dismissed`→null (the store double-gates: state check before planning) | PASS |
| b3 | FY close: the composer zeroes + balances; close *state* derives from the periods doc | balanced; `closed=false` without the doc, `true` with it | PASS |
| b4 (source) | bill finalize twice | `finalizeBill` refuses any bill not `held`; create + finalize share the single `postBill` funnel — one atomic batch, `guardPostings` + plan check **before** any write | PASS |

### (c) Counter games

| Probe | Expected | Observed | |
|---|---|---|---|
| c1 | exactly one counter family moves, by exactly the legal arithmetic (11 attacks: +2, decrease, backward roll, roll-to-2, cross-family move, baseline tamper…) | all 11 verdicts as expected | PASS |
| c2 | trial counter never rolls | month stays `2026-09`, 199→200 across the boundary | PASS |
| c3 | the trial pool cap binds at the snapshot limit | event 200 allowed, 201 refused | PASS |
| c4 | derived actuals (the counter's independent witness): held counts nothing, **voided keeps its count** | invoiceCount = 2 of 4 bills (held + last-month excluded) | PASS |

### (d) Loyalty attacks

| Probe | Expected | Observed | |
|---|---|---|---|
| d1/d2 | redemption clamps to balance and to the rupee cap | 100 pts/Rs 100 at balance; Rs 30 ⇒ 30 pts at cap | PASS |
| d3 | another customer's position is unreachable | B's quote over A's journal = 0/0 | PASS |
| d4 | cross-customer ref forgery | **observed trust edge** — see R-30: the composer stamps the bill object's `customerId`; the fold attributes strictly by line ref, so a mismatched pair debits B *visibly* (−40), never credits B from A. The sole caller passes the stored bill doc | PASS (system) |
| d5 | clawback cannot underflow | completing return claws exactly 100; afterwards 0; an over-refund caps at the remaining earn | PASS |
| d6′ | expiry exactly-once by derivation | due once ⇒ release posts ⇒ due list empty, liability 0 | PASS (see §2.9) |

### (e) Plan-gate bypasses

| Probe | Expected | Observed | |
|---|---|---|---|
| e1 | snapshot governs; the catalogue never re-limits mid-period | existing Basic snapshot still refuses `fy_close` after a simulated catalogue edit; only a NEW assignment reads the edited catalogue | PASS |
| e2 | tier legs bind | Basic refuses `loyalty_expire` + `employees` create, allows core bill; Standard allows the expiry | PASS |
| e3 | state boundaries + staged enforcement | end+30d inclusive = grace, +1 ms = readonly; suspension overlays even founding; readonly refuses posting **only** under `enforce` — the client gate and `rulesPlanPostable` agree | PASS |

### (f) Tenancy / storefront / inbox

| Probe | Expected | Observed | |
|---|---|---|---|
| f1 | backup assembly filters the platform slice at the seam | foreign events/payments/orders planted in the source reads never enter the file | PASS |
| f2 | slug discipline | `demo`→reserved, `ab`→too-short, normal slug passes | PASS |
| f3 | slug-hijack fails at the rules, not politely | storefront update requires the existing doc's `businessId == request.auth.uid`; `storefrontWriteOk` binds `data.businessId == uid` on create too | PASS |
| f4 | inbox flooding stays dismissible paper | 51 lines refuse; a merge overflowing the qty cap refuses **whole** (never clamps); the legal max (50 × 999) composes | PASS |

### (g) Consent laundering

| Probe | Expected | Observed | |
|---|---|---|---|
| g1 | import can never launder consent | a row claiming all three consent fields comes out with every one removed | PASS |
| g2 | order-shape smuggling | `waOptIn` accepts exactly `true` only — `"yes"`, `false`, `1`, and a smuggled `waOptInSource` key all break the shape | PASS |
| g3 | consent stamps only from the customer's own tick | true ⇒ key present; false/absent ⇒ key absent (≡ no consent) | PASS |
| g4′ | every stamp site names a customer-act source | directory: `counter` ×3 + profile toggle `counter`; conversion: `storefront`; one typed `WaConsentSource` seam whose only caller passes `counter` — no desk-invented or import source exists | PASS (see §2.9) |
| g5 | send-time re-check overrides the launch | opted-out since launch ⇒ `optout`; customer gone ⇒ `optout`; bad number ⇒ `invalid`; still-consented ⇒ `ok` | PASS |

### (h) Backup / restore abuse

| Probe | Expected | Observed | |
|---|---|---|---|
| h1 | restore exactly-once | a completed restore re-plans `alreadyRestored`, 0 writes, **no second event** | PASS |
| h2 | restore into a non-empty namespace refuses | an edited journal doc and a foreign member each refuse `target-not-empty`, 0 writes | PASS |
| h3 | foreign-slice injection is inert | even a manifest-consistent injected platform event never lands — platform history is **never** transplanted; the manifest proves internal consistency only (by design) | PASS |
| h4 | tamper ladder | journal digit ⇒ `manifest-mismatch`; forged fingerprint ⇒ `manifest-mismatch`; format 99 ⇒ `unknown-format`; wrong kind ⇒ `not-a-backup` | PASS |
| h5 | cross-business file (A's backup → B's empty namespace) | tenant writes re-key under B; the storefront leg still carries A's `businessId` — and `storefrontWriteOk` binds it to the caller, so that leg **cannot land for B** (own-backup restores unaffected); the restore event cites `sourceBusinessId` — the act is auditable, never silent | PASS |

### 2.9 Disclosure — the three initial FAILs, root-caused

1. **a8 (fuzz)** fed the production *builders* zero values directly.
   The builders are dumb by design; their only callers feed them
   through the absorb guards, and the close-out path posts nothing
   at `pool <= 0` (all three call sites read in source). Corrected
   probe a8′ attacks the guards — PASS. The pattern is uniform
   (guards at planners, builders pure) and is registered as R-31.
2. **d6** passed the `{customerId, vintage}` wrapper where the
   builder wants the vintage — my probe composed a vacuous release
   and the fold *correctly* still showed the vintage due. Corrected
   probe d6′ — PASS, liability reads 0 after the real release.
3. **g4** scanned only StoreProvider for literal sources and missed
   the directory's `counter` sites and the typed seam. Corrected
   probe g4′ scans the whole component tree — PASS.

An audit that hides its own probe bugs would be worthless; all
three are recorded so the PASSes above can be trusted.

---

## 3. Residuals register — every standing partial, classified

### OWNER-GATED (the owner's act is named; no code is owed)

| # | Item | The owner's act |
|---|---|---|
| R-01 | Generated Raast P2P QR stays **PROVISIONAL** (`RAAST_FRAMING` unpinned) | Supply his bank app's Raast QR screenshot + one scan-test payment (the bank-image path is verified and unaffected) |
| R-02 | Plan prices/limits are owner-to-confirm data (anchors: Basic Rs 1,500 / Standard Rs 2,500 / Advanced Rs 4,000, annual 10×) | Confirm or amend G design Q1 |
| R-03 | Loyalty commercial defaults run on recommendations (1 pt/Rs 100 · 1 pt = Rs 1 · 50% cap · 12-mo expiry · Silver 500 ×1.25 · Gold 2,000 ×1.5) | Confirm or amend H design Q1 |
| R-04 | PS/FA dictionaries are machine drafts — **0 of 3,058 reviewed** in each language, badged "Draft preview" everywhere | Recruit one named reviewer per language; packs are ready, money-surfaces-first; merges run through the drift-refusing `review-merge.js` |
| R-05 | `platformAdmins/{UID}` does not exist until created by hand (no self-grant path — by design) | Create the doc in the Firestore console at rollout |
| R-06 | `enforce = false` on every business (staged enforcement, §6.3) | Observe counters per business, then flip per business in the console |
| R-07 | F §7.5 device acceptance script has **never been run** | Install the APK (after R-09) and run the script on a real device |
| R-08 | Release keystore unprovisioned — CI builds are debug-signed and labelled INTERNAL | Create the upload keystore + the four `ANDROID_*` secrets (DISTRIBUTION.md) |
| R-09 | GitHub pushes **parked by the owner's order**; the refreshed FULL-source zip is the one-push vehicle | The one push → CI → app-release click |
| R-10 | WhatsApp service-due interval defaults to **90 days** (the design pinned no number) | Set the real interval per business in Settings |

### DEPLOY-TIME (resolved by the rollout sequence itself)

| # | Item |
|---|---|
| R-11 | Rules v10 + the 6 indexes must publish **before** the web upload (`firebase deploy --only firestore`); the H6 checkout-consent key is only legal under the amended rules — pre-H6 clients are unaffected (the key is additive). Then upload `dukaan-ai-ERP-H.zip`, purge cache |
| R-12 | Real storefront slugs need the **server build or a host rewrite** — the static export emits only `/s/demo` as a real file |
| R-13 | `platformConfig/main` doesn't exist until an admin saves the console config once; renewal instructions render empty until then (one save at rollout) |
| R-14 | The rules have never executed against a real Firestore (no emulator/compiler exists in this environment; they are string-proven and shape-mirrored in two clients — the standing method of every phase). First deployment is the live check; the rollout order (rules first, `enforce` off, the owner's shop on the founding comp) makes that check safe |

### ACCEPTED-LIMITATION (a design decision accepted it; the decision is named)

| # | Item | Decision |
|---|---|---|
| R-15 | G1 migration counters are labelled baselines until reconciliation; a legacy staffer's chip reads "legacy" until their first G sign-in | G design §7 lazy, client-driven migration — a live shop is never degraded or blocked |
| R-16 | `memberCount` counts **seats** (the staffEmails mirror), not heads; the two-till counter race fails the second batch at commit and the panel *shows* the drift | G design §4.2 — fail-closed and visible, never hidden |
| R-17 | The enforce-flip cross-check compares counters against soft telemetry + membership count; a flip made anyway is recorded `confirmedDespiteDisagreement: true` | G design §5 — no stronger in-client signal exists; the record makes the act auditable |
| R-18 | A renewal's purchased period is **fixed at submission** (later of period end / submission instant) | G design §4 — no bought time is lost to confirmation lag; the shop's favour |
| R-19 | Apps never birth namespaces (trial birth is web-only); the F4 brand WebP ladder encodes PNG (a WebP-only fit is refused with figures); the app salary slip is PNG + text share | F/G designs — namespace birth is a web act; honest refusals over silent degradation |
| R-20 | Restore targets the owner's **own namespace only**; the registry + counters are **not** transplanted (the target keeps its born registry; counters reconcile via the baseline path); memberships/invites transplant verbatim — their schema has no inner business id, **the path is the identity** | G design §9 |
| R-21 | Backup export is a point-in-time read set, not a transactional snapshot (Firestore has no multi-collection snapshot read); the manifest verifies the file's internal consistency exactly as written | G design §9 — stated in the format, not hidden |
| R-22 | Per-line order validation is lib-side (Firestore rules cannot iterate list elements — commented in the rules themselves); an enabled-but-plan-dark member read renders the desk without the preview badge | H design §2 — worst case remains dismissible paper |
| R-23 | The apps render **no QR anywhere** (Raast is a bank-issued image by design): desks offer link + copy + share. Web wart: `store.state.darkState` renders its `{state}` placeholder literally (the apps fill it — the web copy fix rides the owner's next dictionary pass; EN/UR values are otherwise frozen by this phase's no-touch discipline) | E/H designs |
| R-24 | A voluntary skip in the WhatsApp send queue is a session cursor, not a stored state — the log records facts (sent / opened / consent-gone / number-bad), not intentions | H design §3.4 |
| R-25 | The apps have no `url_launcher`: the queue's Open records `opened`, then shares the wa.me link via share_plus. Log semantics identical; no delivery state is fabricated | H5 implementation record |
| R-26 | The AI assistant **engine** stays EN/UR (typed boundary; ps/fa map to English for the engine only — all UI chrome is translated); `settings.languageSub` EN/UR copy still says "English or Urdu" (frozen by the no-touch rule); a few pre-existing app-only hardcoded EN/UR strings remain (incl. the sync-centre screen + nav label, which render correctly in both languages via inline pairs) | PS/FA increment record; dictionary routing of the inline pairs is an owner copy decision |
| R-27 | PS/FA rendering is proven at widget/data level only — **no screenshot verification was possible** in this environment | Environment limit, declared in the PS/FA record |
| R-28 | Apps: transfer / PO **print pages not ported** (the generic DocPage machinery makes them additive); **no in-place draft line editing on either client** (delete + recreate — immutability discipline); the job settlement preference is **not persisted on either client** (parity, re-asked per settlement); production class-toggle adjustment-doc/revaluation side-writes are not mirrored in the app store (**journal parity is fixture-proven**; the side documents are the gap); both clients derive in-memory with no server pagination (the architecture's standing scale limit) | F5 residuals, carried verbatim |
| R-29 | The day-close *derivation* is fixture-proven on both clients; the view *glue* feeding it (refund / cash-entry predicates) is source-mirrored line-for-line but not itself fixture-pinned — true of the web glue as well | H6 Fix-4 residual |
| R-30 | **(This audit, probe d4)** `buildLoyaltyClawbackEntry` trusts the bill object's `customerId`. Its sole production caller passes the stored bill doc, and the fold attributes strictly by line ref, so a mismatched pair would create a *visible* negative position — never a silent cross-credit. **Recommendation (not applied):** assert the earn's stamped customer inside the composer as defence-in-depth | Lib-contract sharp edge; system-safe as called |
| R-31 | **(This audit, probes a8/d6)** Journal *builders* are dumb by design — a zero/malformed value would compose a vacuous entry — but every production caller feeds them only through guard planners (`completionAbsorb` / `scrapAbsorb` / close-pool check / `loyaltyExpiryDue` vintages; earn + clawback null-guard internally). Uniform pattern across phases: guards at planners, builders pure | Architectural pattern, caller-verified in this audit |
| R-32 | ESC/POS printing is implemented behind the printer seam but has **never been device-verified**; a local APK build is impossible on this VM (Gradle/Java TLS vs the egress proxy, F1-proven) — cloud CI is the only build route | F-phase environment limits, declared since F1/F2 |

Nothing from any phase audit's partial list is left unclassified.

---

## 4. Verdicts

### (i) Deploying the web ERP + SaaS layer to the owner's live account — **CONDITIONAL GO**

The code is ready: every suite green on a fresh recompile, the
journal's choke point intact, 40/40 adversarial probes refused or
held, and the owner's existing shop migrates lazily onto the
**founding** comp — no plan limit can touch his trading while he
observes. The conditions are the rollout itself, in order
(PHASE-H-RELEASE-AUDIT.md §F): **rules v10 + indexes first → ERP-H
upload → `platformAdmins` bootstrap (R-05) → observe counters →
enforce flips one business at a time (R-06)**. The one honest
unknown no amount of source proof can remove is R-14: the rules
have never run against a live Firestore. The staging is designed
for exactly that — observation mode first, so anything unexpected
surfaces as telemetry, not as a locked shop.

### (ii) Selling to external shops — **NO-GO today**

Not because the code failed anything — it didn't — but because
four blockers are owner-side facts, and selling past them would
mean selling claims that aren't true yet:

1. **Prices are placeholders** (R-02). You cannot sell tiers whose
   prices are marked owner-to-confirm.
2. **PS/FA are unreviewed machine drafts** (R-04). Marketing a
   Pashto/Farsi ERP today would be a false claim; the badge says
   so in the product itself. (EN/UR selling is unaffected by this
   blocker.)
3. **No sellable app exists yet** (R-07, R-08, R-32): no signed
   release build, the §7.5 device acceptance has never run, and
   ESC/POS has never touched a real printer. Selling the apps
   today sells untested device behaviour.
4. **The SaaS lock has never been observed live** (R-06, R-14):
   `enforce` has never been flipped on any business, so the
   counter/gate machinery — however thoroughly proven at lib and
   rules-text level — has never run against real Firestore
   counters on a real shop.

Clear those four (all owner-gated; none is a code defect) and
external selling becomes a **CONDITIONAL GO**, with §3's
accepted-limitations list as the honest spec sheet — including
R-01 (the *generated* Raast QR must not be marketed as verified;
the bank-image path may be).

---

*End of the A→H programme's audit trail. What remains is not
engineering: it is the owner's rollout (§F of the Phase H audit),
his confirmations (R-02, R-03), his reviewers (R-04), and his one
parked push (R-09).*
