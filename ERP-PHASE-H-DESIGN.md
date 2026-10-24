# Dukaan AI — ERP Phase H "Growth Layer" — DESIGN

**Status:** Design only — no web, Flutter, rules or harness code changed by this document.
**Scope:** Phase H of `dukaan-erp-roadmap.md` (Growth: کسٹمر لائلٹی پوائنٹس، آن لائن اسٹور، واٹس ایپ مارکیٹنگ، سروس ریمائنڈرز — پشتو و فارسی زبانیں) — the growth layer on top of the finished ERP + SaaS (Phases A–G): customer loyalty with an honest journal doctrine, a public online store that feeds the Phase B document chain, WhatsApp marketing run from the shop's own number under the owner's channels doctrine, and Pashto + Farsi language packs with a review-state discipline. Designed against the complete A–G state; nothing here re-opens a settled A–G decision.
**Sources read:** `dukaan-erp-roadmap.md` (Phase H + the roadmap's honesty notes), `ERP-PHASE-G-DESIGN.md` (invariants, §2.3 privacy doctrine, §3.2 snapshot doctrine, §3.3 module sets, §3.7 data rights — H inherits all of them), `ERP-PHASE-B-DESIGN.md` (the document chain + SO conversion semantics), `ERP-PHASE-C-DESIGN.md` (C5's pooled-advance precedent), `ERP-PHASE-E-DESIGN.md` (print/font doctrine), `web/lib/coa.ts` (28 codes — H adds exactly two), `web/lib/types.ts` (`JournalRefType`, `Customer`, `SaleOrder`), `web/lib/ledger.ts` + `selectors.ts` (per-party subledger derivation), `PHASE-G-RELEASE-AUDIT.md` (baselines: harness **1,569/1,569**, Dart tests **366/366**, rules **v9 FINAL** 1,222 lines, i18n **2,786 keys EN ≡ UR**, `makeEntry(` sites exactly **24**).

## Non-negotiable invariants carried over (Complete edition + Phases A–G)

Every design choice below is subordinate to these — Phase H must not regress any of them:

1. **The journal doctrine is untouchable — and loyalty is money.** Append-only journal; one atomic balanced entry per money event through the one guarded choke point; balances always derived, never stored counters. **Loyalty points are a liability the shop owes its customers, so points move only as journal entries** (§1.2) — there is no points counter on the customer doc, no side ledger, no "points balance" field anywhere. A Phase H migration or feature that changed any existing journal entry, or posted a loyalty event outside the choke point, fails by definition.
2. **One backend, no server, no Blaze assumption.** Spark plan (`dukan-8246`) throughout. H introduces no Cloud Functions, no scheduler, no webhook receiver. Anything that genuinely needs one (WhatsApp Cloud API callbacks, §3.6; a payment gateway for the store, §2.7) is named as a parked future tier, exactly as G parked gateways — never faked with a client-side imitation.
3. **Plan state and plan snapshots govern gating (Phase G, unchanged).** H's features join G's module catalogue as new rows (§5.1); what a shop may use is read from its **assignment snapshot**, never from the live catalogue, so a catalogue change never re-limits a shop mid-period. Catalogue changes are a release; snapshot changes are console acts.
4. **The platform sees none of this (G §2.3's closed list stands).** Loyalty balances, storefront contents beyond the owner's own act of publishing, campaign lists, customer phone numbers — none of it enters any platform collection or counter. H adds **zero** fields to G's closed platform-visibility list. The storefront's public snapshot (§2) is written by the *shop's owner* as a publishing act; the platform neither reads it for analytics nor aggregates it.
5. **The shopkeeper's data rights are unchanged (§3.7/G doctrine).** In every plan state, the owner reads, prints and exports everything H adds (loyalty ledger, campaign history, storefront orders). Expiry of a plan degrades H's *public and sending* surfaces (§2.6, §3.5) — never the shop's access to its own records.
6. **Rules evolve additively, strip-provable, published rules-first.** H's rules are **v10 = v9 + H blocks + named amendments only** (§5.2), released under the standing strip-proof discipline: v10 minus H material must diff against v9 byte-for-byte.
7. **Frozen seed identities stay frozen; harness identities extend, never weaken.** Seed journal 21 entries · Inventory 272,805 · Cash 50,000 · payables 27,900 · receivables 5,500 · TB 0 · SHA `e17e5bda…1168`. H's suites add loyalty/storefront/campaign/language identities *around* the 1,569 TS checks and 366 Dart tests; not one existing check is edited, relaxed or re-pinned. Where a count legitimately grows (`makeEntry(` sites, COA codes, i18n keys, tenant collections), the audit asserts the **new exact number** and names the delta — the G6 pattern.
8. **Language purity + calm shell.** EN/UR parity stays *perfect* (compile-enforced on web, drift-gated on Dart). PS/FA join as first-class locales with an explicit review state per key (§4) — an unreviewed draft is labelled a draft wherever the product names the language, never silently presented as finished. The five calm themes and the top-header shell standard apply to every H surface.

## Current state (what Phase H builds on)

| Area | Today |
|---|---|
| Customers | `Customer { id, name, phone, address, note, ts }`; per-customer positions (receivables, pooled advances) derive from journal lines carrying `ref = customerId` — the subledger pattern loyalty reuses (§1.3). No marketing consent field, no points anything. |
| Bills | Composed at the choke point with split tenders across money accounts; tenders are the seam a points tender joins (§1.2). Returns/CNs already mirror bill entries wholesale on void/return (B) — loyalty legs are designed to be mirrored *by that machinery*, not beside it. |
| Document chain | QT → SO → DC → Bill with derived fulfilment; SO conversion to bill is exactly-once and remainder-clamped (B). The storefront's only job is to *arrive* as an SO (§2.5). |
| Public surface | **None.** Rules deny every unauthenticated read; the only public artefact is the static app shell itself. The storefront is the product's first public *data* surface — §2 treats it with corresponding suspicion. |
| WhatsApp today | Outbound only, by hand: bill/document/report share via `wa.me` deep links composed in the client (BillingDesk, DocumentViews, ReportsView). Text-only, per-document, shopkeeper-initiated. No lists, no templates, no logs, no opt-in concept. |
| Languages | Locale = `en | ur`, one web dictionary (2,786 keys), Dart dictionary *generated* from it with a CI drift gate; UR is RTL through the shell's existing direction flip; print shaping via the browser pipeline (web) and engine rasterisation (apps, F §5). |
| Plans (G) | Catalogue in code (`lib/plans.ts`), assignment snapshots on `businesses/{bid}.plan`, module sets Core / +Documents / +Operations / +Advanced over the 40 `PermModule`s. H adds a Growth row (§5.1) — by catalogue release, effective for *new* assignments until an admin refreshes a snapshot. |
| Verification | TS harness 1,569/1,569 · Dart 366/366 · fixtures f1–f5 + g5/g6 byte-stable · i18n 2,786 · rules v9 (1,222 lines). Owner-gated items from F/G (device acceptance, Raast fixture, GitHub one-push) remain exactly as gated; H neither needs nor touches them. |

---

## 1. Customer loyalty — points are a liability, and the journal says so

### 1.1 The doctrine decision: a grant is a cost, a redemption is a tender, expiry is a release

A loyalty point is a promise the shop has already sold: the customer holds value against a future bill. Any design that treats grants as "free" (a counter that only goes up, settled from nothing) manufactures an invisible debt that surfaces the first day a good customer redeems — the exact class of surprise this product's finance doctrine exists to prevent. H therefore models points **exactly like the pooled customer advances of C5, with one addition: the grant itself is recognised as a cost when it is earned.**

| Event | Posting | Why this shape |
|---|---|---|
| **Earn** (bill finalized) | Dr `expense_loyalty` / Cr `loyalty_payable` (ref = customerId) — one entry, refType `loyalty_earn`, refId = bill id | The cost of the promise is recognised in the period that made the sale (matching); the liability sits per-customer in the subledger from birth |
| **Redeem** (points tender on a bill) | **Inside the bill's own entry**: a Dr `loyalty_payable` (ref = customerId) line as one of the bill's payment legs, beside cash/wallet legs | Redemption *is* a payment method. Riding inside the bill entry means the existing void/return mirrors reverse it automatically and exactly (B's machinery), and the bill can never show points-paid without the liability falling in the same atomic write |
| **Return / CN against a points-paid bill** | The return entry mirrors the bill's legs proportionally (the B machinery) → the points leg re-credits Cr `loyalty_payable` (ref = customerId): **points come back as points**, never as cash. Plus a companion clawback entry (§1.4) | A customer who returns goods gets his points back, not a windfall conversion of points into cash; the earn on the returned portion is clawed back (§1.4) |
| **Expiry** (vintage ages out) | Dr `loyalty_payable` (ref = customerId) / Cr `expense_loyalty` — refType `loyalty_expire`, owner-posted from the expiry desk (§1.5) | The promised cost never materialised, so the original cost reverses. Expiry is **not** revenue (it is not a sale) and **not** a discount reversal — it is the release of an over-accrued cost, and the P&L shows it as exactly that |
| **Manual adjustment** (owner goodwill / correction) | The existing `adjustment` refType machinery with both legs named by the owner (Dr/Cr `loyalty_payable` against `expense_loyalty` or a money account) — no special loyalty backdoor | Goodwill grants and corrections are ordinary journal acts with an audit trail, like every other correction since v1 |

**Rejected alternatives, for the record.** (i) *Earn against `sales_discount` (contra-income)*: makes points look like a price reduction on a sale already made at full price, and corrupts the Sales-report identity the FIX suite pins (P&L ≡ Sales) — points are a marketing cost of *retention*, not a discount on *this* bill. (ii) *No earn posting; recognise cost only at redemption* (Dr expense / Cr tender at redeem): hides the liability entirely until it is spent — the invisible-debt failure above; the balance sheet would lie every day between earn and redeem. (iii) *A points ledger collection beside the journal*: a second ledger for the same value — the divergence machine every prior phase refused (C1's stockLevels are *quantities derived from documents*, not a second money ledger; money has one home).

### 1.2 The COA addition — exactly two codes, additive, `since: "H"`

`web/lib/coa.ts` gains, under the D1 precedent (one registry, additive only, no existing code changes name, type or meaning):

| Code | Type | Normal balance | Used by |
|---|---|---|---|
| `loyalty_payable` | liability | credit | Earn (Cr), redeem (Dr, inside bill entries), return re-credit (Cr), expiry (Dr), adjustments |
| `expense_loyalty` | expense | debit | Earn (Dr), expiry release (Cr) |

Consequences, named now so the increments don't discover them: the trial balance and balance sheet pick both codes up from the registry automatically (they already read type/sign from `coa.ts`); the Tally group mapping (`lib/tally.ts`, D5) gains two fixed rows — `loyalty_payable` → *Customer Loyalty Payable / Current Liabilities*, `expense_loyalty` → *Loyalty Programme Cost / Indirect Expenses* (names owner-overridable like all Tally names, groups never); the FY-close P&L sweep (D4) includes `expense_loyalty` as an ordinary expense code; the Advanced-tier journal-refType gate list in rules (G §4.1) gains `loyalty_expire` (§5.2). COA count 28 → **30**, asserted by the H1 suite.

**New refTypes** (type-union additions in `types.ts`, the B/C/D pattern — declared with the phase, posted by its increments): `loyalty_earn`, `loyalty_expire`. Redemption adds **no** refType (it is lines inside a `bill` entry — §1.1). Clawback (§1.4) posts as `loyalty_earn` with a negative-points payload and a memo naming the return — one refType for the earn family, sign carrying direction, exactly as `CreditEntry`'s negative-credit precedent works for bill-void reversals.

### 1.3 Points arithmetic — rupees in the journal, points derived per vintage

- **The journal carries rupees** (the liability's value), as it carries every other value. Each `loyalty_earn` entry additionally carries a `points` payload (integer) and the **earn-rate snapshot** (`rsPerPoint` at the moment of earning — the settings-snapshot doctrine from D §payroll-terms / G §3.2: a later rate change never revalues an existing promise).
- **Points balance per customer (derived)** = Σ over that customer's earn/clawback entries of `points`, minus Σ redeemed points, minus Σ expired points — where redeemed/expired quantities are carried on their entries the same way (`points` payload on the bill entry's loyalty leg is stored on the entry doc as `loyaltyPointsUsed`; the expiry entry carries its `points`). Every input is a journal document; the selector is a pure fold, identical in TS and Dart (fixture-proven, §6 H1/H2). No points figure is ever stored on the customer doc.
- **Rupee liability per customer (derived)** = the `loyalty_payable` subledger balance for `ref = customerId` (existing machinery), and the GL total ≡ Σ customers, asserted by the suite the way D asserted `salary_payable` ≡ Σ employees + bucket. Points and rupees reconcile: liability Rs == Σ (unspent points per vintage × that vintage's snapshot rate), and the suite asserts *that* identity too — it is the audit that the two views of the same promise can never drift.
- **Consumption order is FIFO by vintage** — a redemption or expiry consumes the customer's oldest unspent earn vintage first. FIFO is a *selector computation* over dated entries, never a stored allocation; it exists because expiry (§1.5) must know which rupees leave when a vintage dies.
- **Earn base and rounding (proposed defaults — Q1, owner-to-confirm):** points are earned on the bill's **net payable** (after discount, tax-inclusive — the amount that actually leaves the customer's pocket), at **1 point per Rs 100** of net payable, floored to whole points; a point is worth **Rs 1** at redemption. Walk-in (unnamed) bills earn nothing — there is no customer to owe; the bill screen says so plainly rather than silently dropping the earn.
- **Redemption guardrails (proposed defaults — Q1):** points may cover at most **50%** of a bill's net payable; the remainder settles in money tenders (a bill is never 100% points in v1 — the shop's till must still see cash daily, and a pure-points bill would read as a giveaway in every report); redemption requires a named customer with a derived balance ≥ the tender; the tender is clamped to the balance *at composition time* by the store guard (the choke point's existing insufficient-position pattern), never typed freehand past it.

### 1.4 Clawback — returns take back the earn on what came back

When a return/CN reduces a bill, the earn attributable to the returned portion is reversed by a companion `loyalty_earn` entry (negative points, rupee amount = returned net × the original earn rate, ref = customerId, refId = the CN's id, memo naming the source bill). The bill-void path needs no companion: void mirrors *both* the bill entry and its earn entry wholesale (the void composer's reversal set is keyed by refId = bill id, which already gathers the earn — an explicit H1 suite case, since this is the seam where a lazy implementation would double-count). Partial returns claw back proportionally, floored, with the paisa/point remainder staying with the customer (rounding always resolves in the customer's favour on clawback, against him never — stated so the suite can pin it).

### 1.5 Expiry — derived list, owner-posted, never a cron

Points expire **12 months** after their earn date (proposed default — Q1; the period lives in settings, changes apply to future earns by the snapshot doctrine — each earn entry snapshots its own `expiryMonths`). With no server (invariant 2), nothing sweeps at midnight: the loyalty desk shows a **derived expired-unposted list** (vintages past expiry whose points remain unspent and unexpired-posted — a pure selector), and the owner posts the release with one action per customer (or all) — each posting is a `loyalty_expire` entry through the choke point, period-lock aware (A5: an expiry dated into a closed period posts at the open boundary like every backdated act). Until posted, the liability honestly *includes* the expired points, and the desk labels them "expired, awaiting posting" — the books never pretend an act happened that didn't.

### 1.6 Tiers — standing derived from earning, not a badge the shop sells

| Tier | Qualification (derived, trailing 12 months' earned points) | Earn multiplier |
|---|---|---|
| Standard | — (every named customer) | 1× |
| Silver | ≥ 500 points earned in the trailing 12 months | 1.25× |
| Gold | ≥ 2,000 points earned in the trailing 12 months | 1.5× |

(Thresholds and multipliers are **proposed defaults — Q1, owner-to-confirm**.) Tier is a pure function of the earn history (derived like fulfilment, never stored); it is computed at bill composition and snapshotted onto the earn entry it produced (the multiplier that *was* applied is part of the entry's payload — history never re-tiers). Tier buys earn speed only — **not** redemption value, not discounts, not queue-jumping: the moment a tier changes what a point is *worth*, the rupee liability per point forks by customer and the §1.3 reconciliation dies. One point is one rupee for everyone, always; Gold customers simply earn faster. If the owner wants richer theatre than that, it belongs in prices and service, not in the liability's arithmetic.

### 1.7 Settings & surfaces

- **Programme settings** live on the owner doc's settings (the E-era settings object pattern): `loyalty: { enabled, earnRsPerPointBase (Rs of net payable per point), pointValueRs, redeemCapPct, expiryMonths, tiers: { silverAt, goldAt, silverMult, goldMult } }` — owner-writable like every settings write; **disabling the programme stops future earns and hides the tender; existing balances remain redeemable and expirable** (a shop may leave the programme; it may not strand its customers' earned value — the desk stays reachable while any liability is non-zero, stated as a suite case).
- **Surfaces:** billing desk (points tender in the payment mix + earn preview line: "اس بل پر 42 پوائنٹس ملیں گے" + tier chip), customer card/directory (derived points + rupee value + tier + vintage list), the loyalty desk (programme totals: outstanding liability Rs/points, expiring-in-30-days, expired-unposted with the posting action, tier counts), reports (the trial balance/balance sheet absorb the codes via the registry; a loyalty section joins the customers report family — earned/redeemed/expired in period, liability movement).
- **Permissions:** a new `PermModule` `loyalty` joins the matrix (the generated-data discipline carries it to Dart); cashier may *apply* a redemption at the desk (it is a tender), the programme settings + expiry posting are owner/manager acts — the exact matrix rows are H1's to pin in fixtures, following the `can()` precedent.

---

## 2. Online store — a published catalogue, orders that land as sale orders

### 2.1 The shape in one paragraph

The storefront is **a snapshot the owner publishes, a public page that renders it, and an inbox that hands orders to the document chain** — in that order of trust. The shop's live data never becomes publicly readable; what the world sees is a denormalised catalogue document the owner's own client assembled and wrote, containing only what he chose to publish. An order placed on that page is *not* a sale and touches no journal: it lands as an intake document, and becomes real only when the shop converts it — through the Phase B machinery — into a **sale order (SO-)**, from which challan and bill flow exactly as they do for a phone order today.

### 2.2 The published snapshot — `storefronts/{slug}`

| Aspect | Design |
|---|---|
| Home | New top-level collection `storefronts`, doc id = the shop's **slug** (create-only-if-absent ⇒ slug uniqueness is structural, no registry needed; slug is immutable after claim — it is printed on receipts and shared links; the display name stays editable) |
| Contents | `{ businessId, slug, shopName, tagline?, phone (the shop's public/WhatsApp number), city?, logoRef?, enabled, publishedAt, updatedAt, currency: "PKR", products: [ { productId, name, nameUr?, price, unit, category?, stockState, sort } ], notice? }` — a *publishing artefact*, assembled by the owner's client from live data at publish time (and re-published on demand / on product-save while the store is live, a client setting) |
| Stock honesty | `stockState ∈ { in, low, out, hidden }` — **bands, never counts**. The world learns "available / running low / out of stock", never "37 pieces" (commercial privacy + the count would be stale the moment it rendered). Thresholds derive from the product's own low-stock level (C-era fields); `hidden` also serves products the owner excludes |
| Price honesty | The published price is advertising; §2.5's conversion re-prices from live data and flags drift. The page footer says prices are confirmed at order confirmation — in the page's language, not in legal fine print |
| Who writes | The business owner only (rules: the writer's uid == `businessId`, and the doc's `businessId` may not change after creation). Members with the `storefront` module permission may *prepare* (client-side), the publish write itself is owner-keyed — the public face of the shop is an owner act, like the brand assets of E2 |
| Who reads | **Public** (unauthenticated), gated by §2.6's plan derivation. This is the one deliberate public read in the product — fenced to this collection, this doc shape, nothing else |

**Rejected: public reads into the tenant namespace** (a rules hole into `users/{bid}/products` with field filters). Rules cannot redact fields; a public leg into the namespace would expose cost, stock counts and every unpublished product. The snapshot pattern costs one denormalised write and buys a hard wall. It is also G's backup/restore pattern (move data as data, never widen access) pointed outward.

### 2.3 The public page — a route in the existing static app

- **Route:** `/s/{slug}` in the shipped static web app (the SPA renders the storefront from the public doc; no separate site, no second deploy). **Per-shop subdomains are not offered in H** — the product ships as one static build on one host (Spark + the owner's static hosting); wildcard subdomain routing per tenant is a hosting/Blaze conversation, named here so nobody promises it. The shareable link is `…/s/{slug}`, printed on bills/receipts as a QR (the E3 QR machinery renders it — a *link* QR, not a payment QR; the two are never styled alike, E3's honesty discipline).
- **What the page does:** catalogue browse/search by category, product cards (name in the shop's languages, price, stock band), a cart, and checkout = **name + phone + optional note + fulfilment choice (pickup / delivery-request)**. No accounts, no passwords, no payment — a public order form, deliberately smaller than a shopper account system (Q5).
- **What the page never does:** no write reaches the tenant namespace, the journal, stock, or prices; no customer account is created by ordering (the shop matches/creates the customer at conversion, §2.5); no analytics beacons to the platform (§invariant 4 — the page's reads are Firestore reads of a public doc, and that is all).

### 2.4 Order intake — `storeOrders`, a create-only public inbox

| Aspect | Design |
|---|---|
| Home | Top-level collection `storeOrders` (auto-id docs) — *outside* the tenant namespace (the writer is anonymous; tenant writes require membership — the G wall again) |
| Public write | **Create only**, rules-validated to a fixed shape: `{ businessId, slug, customerName (≤60 chars), phone (≤16, digits/+), lines: [ { productId, qty (1..999) } ] (≤50 lines), note? (≤300), fulfilment, createdAt == request.time, state: "new" }`. No other fields writable; no public read, update or delete — a submitter cannot even read his own order back (he gets the shop's WhatsApp as his channel, §2.4 note) |
| Shop side | Owner/members with the `storefront` permission read the business's inbox (rules: membership of `businessId`), and act: **convert** (§2.5) or **dismiss** (state flip with actor + timestamp — spam and tests are dismissible, never silently dropped) |
| Abuse posture, stated honestly | A public create endpoint on Spark has no CAPTCHA and no rate limiter H can honestly claim. The exposure is bounded by shape: an abusive flood creates *dismissible inbox docs*, never postings, never stock movement; Firestore create-cost of a flood is the real risk and it is the shop's own project quota — mitigations are client-side (the inbox shows bulk-pattern groupings for one-tap mass-dismiss) and the owner can unpublish (which closes the read page; the create leg additionally requires the storefront doc `enabled` via a rules `get`, so unpublishing closes intake too). Named as risk R-H3 with its Blaze-era remedy (App Check / Functions rate limiting) parked, not pretended away |
| The WhatsApp shadow | Every order confirmation state change the *customer* hears about travels the channel he already trusts: the conversion screen offers the one-tap `wa.me` message to the customer's number ("آپ کا آرڈر SO-… بن گیا ہے") — outbound by the shopkeeper's hand, §3's doctrine, not an automated send |

### 2.5 Conversion — an order becomes an SO-, or it becomes nothing

- Conversion is one client act on an inbox doc: resolve/create the customer (phone match offered, never forced — the shopkeeper confirms), build a **Phase B sale order** whose lines are **re-priced and re-validated against live products** (a product deleted since publishing drops its line with a flag; a price changed since publishing converts at the *live* price with the drift shown line-by-line before confirm; quantities clamp to nothing — SOs may exceed stock, B's derived fulfilment already speaks backorder honestly). The SO carries `sourceType: "storefront"` + `sourceOrderId` (the B types already carry source linkage patterns); the inbox doc flips to `converted` with the SO's id in the **same batch**.
- From that instant the order is ordinary: SO → DC → bill through the existing screens, the journal sees only the bill, loyalty (§1) earns on the bill if the resolved customer is named — the chain needs no storefront awareness downstream of the SO.
- Exactly-once: the inbox doc's state is the claim (rules: `state` may leave `new` exactly once, to `converted` or `dismissed`, by a member) — a double-tap or two tills racing produce one SO and one refusal, the B conversion doctrine restated at the inbox seam.

### 2.6 Plan gating — the storefront is an Advanced-tier surface (proposed — Q2)

- **Tier placement (proposed):** `storefront` joins G's **+Advanced** module set (§5.1). Rationale: it is the only H feature that puts the shop on the public internet — the highest support and abuse surface in the product — and Advanced is the tier whose price carries that. Loyalty and WhatsApp marketing are proposed at Standard (§5.1) as the retention pair.
- **Snapshot interaction (G invariant 3, applied):** the gate reads the business's **assignment snapshot** (`modulesTier`), never today's catalogue. A shop assigned Advanced keeps its store through any later catalogue reshuffle until its period renews.
- **Public-read derivation:** the storefront doc's read rule derives plan state in the rules idiom (G §4's pattern): readable while the business is `trial`-with-storefront… — no: trial's module set is Standard's (G §3.4), so a trial shop's store stays dark until it subscribes; readable while `active` on a snapshot whose tier includes `storefront`; **dark in grace/readonly** — the storefront is a *selling* surface, not the shopkeeper's data right (§invariant 5), and a lapsed shop taking public orders it cannot be reminded to fulfil is worse than a dark page. The shop's own signed-in preview renders in every state (owner read of his own doc is a member read, not the public leg). Suspension (G §2.4) also darkens the public leg — the platform's one H-visible act, already within G's grant.
- **Downgrade:** renewing onto a lower tier unpublishes at the period boundary (client act at next owner sign-in + the rules derivation makes the public leg dark regardless — the belt and the braces); the snapshot doc and slug are **kept** (re-upgrading restores the store exactly; a slug, once a shop's, is never recycled to another shop).

### 2.7 What the storefront is not

No online payment (no gateway — G's parked Blaze decision governs; an order is a request, money moves at the counter/delivery as it does today), no delivery logistics, no customer accounts, no reviews/ratings, no platform-wide marketplace (the platform never lists shops against each other — invariant 4; discovery is the shop's own link-sharing). Each is a named non-goal in §8, not an omission.

---

## 3. WhatsApp marketing — the shop's number, the shop's customers, the shop's hand

### 3.1 The doctrine (the owner's channels rule, applied to shops)

Every marketing message a Dukaan shop sends is sent **from the shop's own WhatsApp, to the shop's own customers, by the shopkeeper's own action** — the same doctrine the owner applies to his own channels. The platform operates no sending infrastructure, holds no message content, and sees no recipient (invariant 4: campaign data lives in the tenant namespace only). H builds the *organisation* of marketing — consent, audiences, templates, a disciplined send queue, a log — and leaves the *transport* in the shopkeeper's WhatsApp in v1, because that is the only transport that is both real on Spark and honest about its limits (§3.5, §3.6).

### 3.2 Consent — opt-in is a field with a history, default off

- `Customer` gains `waOptIn?: boolean`, `waOptInAt?: string`, `waOptInSource?: "counter" | "storefront" | "import"` — **absent/false means NO marketing, ever.** Transactional messages (the bill share, order updates) are not marketing and are untouched by this flag — they ride the existing per-document share flows as today.
- Capture points: customer create/edit (a plain-language consent line in both languages — "مارکیٹنگ پیغامات واٹس ایپ پر بھیجے جا سکتے ہیں"), the storefront checkout (a checkbox, unticked by default — a storefront order sets `storefront` source only if ticked, applied when the order's customer is resolved at conversion), and CSV import (an explicit column, default off — a bought list can never launder consent through import; the import screen says so).
- Opt-out: one toggle on the customer card, honoured by the audience derivation *at send time* (not at campaign creation — a customer who opts out between list-building and sending is excluded by the queue's per-recipient re-check, §3.4). A customer who replies STOP on WhatsApp is opted out by the shopkeeper's hand in v1 (there is no inbound automation on Spark — stated, not hidden; the queue screen teaches the habit).

### 3.3 Campaigns, templates, audiences — tenant collections, derived lists

| Collection | Doc | Contents |
|---|---|---|
| `waTemplates` | auto-id | `{ name, kind: "promo" \| "reminder", body, createdBy, ts }` — body carries placeholders `{name}`, `{shop}`, `{points}` (the customer's derived loyalty points, H1 synergy), `{amount}` (reminder context, §3.5). Templates are the shop's own words; H ships two *starter* templates per kind as dictionary strings the owner edits, never locked copy |
| `waCampaigns` | auto-id | `{ name, templateId, audience: { kind, params } (the segment *definition*, not a frozen list), resolvedCount (at launch), createdBy, ts, state: "draft" \| "sending" \| "done" }` |
| `waSends` | auto-id | The send log: `{ campaignId, customerId, phone, state: "queued" \| "opened" \| "sent" \| "skipped_optout" \| "skipped_invalid", ts }` — one row per recipient per campaign, written by the queue as it advances (§3.4) |

- **Audiences are segment definitions, resolved live** (the derivation doctrine): `all_opted_in`, `tier:{silver|gold}` (H1), `udhaar_outstanding:{minRs, minDays}` (receivables aging — the reminder engine, §3.5), `points_expiring:{withinDays}` (H1), `inactive:{days}` (no bill in N days — from the bills collection), `storefront_customers`. The count shown before launch is a live derivation; the *send rows* are materialised at launch (the log must be a fact, not a derivation — who was sent what is history).
- **New `PermModule`:** `whatsapp` (campaigns/templates/sends are tenant data under the standard member legs; the module gates the surface in clients, and template/campaign *creation* is owner/manager — a cashier does not launch campaigns).

### 3.4 The v1 send queue — a disciplined hand, not a blaster

Launch materialises `waSends` rows (`queued`) for the resolved audience **after re-checking opt-in per recipient**. The queue screen then works the list one recipient at a time: **Send** opens `wa.me/{phone}?text={rendered template}` (the product's existing, proven pattern) with the message pre-filled; the shopkeeper presses send in WhatsApp and returns; the row flips to `sent` on his confirmation tap (or `opened` if he only opened it — the log distinguishes what the app *knows* from what it *hopes*: **`sent` in v1 means "the shopkeeper confirms he sent it"**, and the UI copy says exactly that — no fabricated delivery ticks, no read receipts, because v1 cannot know). Skip advances without sending. The queue is resumable (rows are docs; closing the app mid-campaign loses nothing), paced by the human at its centre — which is precisely the behaviour WhatsApp's own anti-spam posture rewards: real messages, to real opted-in customers, at human speed, from a number those customers know.

### 3.5 Service reminders — campaigns the data suggests

The roadmap's H line names سروس ریمائنڈرز beside marketing; in H they are the `reminder` template kind driven by derived audiences: **udhaar reminders** (aging buckets — polite, amount-carrying via `{amount}`), **points-expiring nudges** (H1's expiring derivation turned into an audience), and **service-due reminders** for job/service businesses (jobs whose completion + the shop's configured interval has passed — the interval is a settings field; the audience derives from the jobs collection). A **suggested-reminders panel** on the marketing home derives today's candidates (counts only) whenever the app opens — client-derived, like plan state; nothing is ever auto-sent, in v1 or any design this document would sign: a reminder the shopkeeper didn't launch is a message he didn't agree to send from his own number.

### 3.6 The honest limits of v1 — and the parked API tier

**v1 cannot:** send unattended or in bulk; report delivery/read state; message a customer who has never messaged the shop first *through any automated path* (the wa.me flow opens a chat — for business-initiated first contact, WhatsApp's own rules treat the shopkeeper's manual send as his act on his number, and burst behaviour can get a number restricted by WhatsApp — the queue's pacing + opt-in doctrine is the mitigation, and the campaign screen carries this warning in plain words, both languages); schedule a send for later (no server); or work when the shopkeeper's phone is off. **The Business (Cloud) API tier is parked**, gated on the same Blaze decision as G's gateways: it needs a server for webhooks and template pre-approval by Meta, per-message fees, and a BSP relationship — when it lands, `waTemplates` gains Meta approval states and `waSends` gains true delivery states, and *nothing else in this section changes*: consent, audiences, logs and doctrine were designed API-ready on purpose.

---

## 4. Pashto + Farsi — two more locales, zero silent drafts

### 4.1 The shape: dictionary-completeness with a review state per key

Locales become `en | ur | ps | fa`. EN stays the source of truth; UR stays the owner's reviewed second. PS and FA dictionaries are **complete key-for-key from the day they land** (a missing key is a compile/drift failure, exactly as UR parity is enforced today) — but completeness of *keys* is not completeness of *review*. Every PS/FA key carries a state in a **review manifest** (`web/lib/i18n/review-manifest.json`, product data in the repo — not tenant data, never in Firestore):

```json
{ "ps": { "<key>": "draft" | "reviewed" }, "fa": { "<key>": "draft" | "reviewed" } }
```

- **Drafts are machine-drafted once, at build time, by the product team** (the H5 increment's translation pass) — there is **no runtime machine translation, no translation API, no key leaving the device**: the shipped dictionaries are static text like EN/UR. A draft is a *starting point for a human reviewer*, and the product says so wherever it names the language (§4.2).
- **Review is a human act with a name on it**: the manifest's states flip `draft → reviewed` only through the review workflow (§4.3); the manifest records reviewer + date per language (top-level fields), so "who says this Pashto is right" always has an answer.
- The manifest is **generated-data family** (G §5.3 discipline): the Dart side consumes the same states through the generator; a key with no manifest entry fails the drift gate (§4.4) — an unreviewed key can exist, an *unaccounted* key cannot.

### 4.2 The honesty label — a draft language wears a badge

While **any** customer-facing key in a locale is `draft`, that locale is labelled **"مسودہ / Draft preview"** in the language picker and in Settings (the label itself is dictionary copy in all four languages). When a locale reaches 100% `reviewed`, the badge drops — per language, independently (Pashto may graduate while Farsi is still a draft; the badge is per-locale state, derived from the manifest like everything else in this product). Per-string markers were considered and rejected: stamping every unreviewed string would vandalise every screen to make a point the badge already makes honestly. What the badge promises is precise: *the words are complete and usable; a native reviewer has not yet passed them all.* A shopkeeper in Mardan who prefers draft Pashto to polished English is served; a shopkeeper who trusts only reviewed text can see exactly where things stand. (The demo build ships PS/FA with the badge state as-is — demo honesty, invariant: the showroom does not wear a badge the product wouldn't.)

### 4.3 The review workflow — a file out, a file back

H5 ships a **review pack** per language: a generated document (CSV + a readable bilingual sheet) listing every key with EN, UR, and the PS/FA draft side by side, grouped by surface, for a native reviewer to correct in place. The corrected pack returns and is merged by a small tool that (a) replaces draft strings with the reviewer's text, (b) flips exactly the keys the pack marks as seen to `reviewed`, (c) refuses to merge a pack whose key set has drifted from the current dictionary (a stale pack reviews a product that no longer exists — the fixture-freshness discipline applied to language). Reviewer recruitment is the owner's (Q4 — his scholarly and community networks hold native Pashto and Dari speakers; the design assumes a named human per language, and the pack is built to be reviewable by one person in sittings, grouped so customer-facing surfaces come first if time is short — partial review still graduates *those* keys, and the badge counts honestly).

### 4.4 The parity gate, extended — four locales, one key set

- Web: the compile-time parity that today enforces UR ≡ EN key sets extends to PS/FA (`Record<keyof typeof en, string>` per locale — a missing key stops the build, as now).
- Dart: `gen_l10n` generates all four dictionaries + the review-state table; `--check` asserts key-set equality across **all four** locales **and** manifest coverage (every PS/FA key has a state; every state names a real key) — the drift gate's failure list names the offending keys, per standing practice.
- Counts: the i18n checkpoint at H5 records the new exact total (2,786 + H's own EN/UR growth from §1–§3 surfaces, expected +180–260 keys across H1–H4) and pins PS/FA at the *same* total — parity is a number, and the audit prints it.
- Print/display strings follow the same dictionaries (no print-only fork): a Pashto bill is the same keys rendered in the Pashto locale (§4.5).

### 4.5 Script and font reality — Naskh joins Nastaliq, shaping stays the platform's

- **Scripts:** Urdu prints in Nastaliq; **Pashto and Farsi (Dari) are Naskh-script languages** in their digital standard. Forcing Nastaliq onto Pashto text would be a visible wrongness to a native reader — the font stack therefore becomes locale-aware: `ps`/`fa` resolve to a **Naskh-first stack** (system Naskh faces — Noto Naskh Arabic and platform equivalents — ahead of the existing stack), `ur` keeps Nastaliq-first, `en` unchanged. The E doctrine stands untouched: **no downloadable webfonts in the static build**; web rendering and web print rely on the browser/OS shaping + system fonts, as Urdu already honestly does.
- **Apps:** the Flutter bundle already carries the Nastaliq asset (F). H5 adds **one Naskh asset** (Noto Naskh Arabic, regular + bold if the bundle budget allows — the size delta is recorded at H5, expected a few hundred KB) so PS/FA render correctly offline at the counter, and the ESC/POS raster path (F §5) shapes PS/FA through the engine exactly as it shapes UR — rasterisation is script-agnostic once shaped; the F-era print fixtures gain PS/FA sample lines to prove shaping survives to the raster.
- **RTL:** PS/FA are RTL; the shell's existing UR direction flip carries them wholesale (no new layout logic — the flip is locale-driven, and H5's fixtures include the four-locale direction truth table). Digits stay Western Arabic numerals and dates stay the product's PKT/Gregorian business calendar in all locales, as UR already does — **the Jalali (Iranian solar) calendar is out of scope** (the `fa` of this product is Afghan Dari usage on the same business calendar as its shops' books; a Jalali calendar is a separate future design, named here so it is a decision and not an oversight).
- **Plan gating: none.** A language is not a module and is never sold: PS/FA are available on every tier including trial (recommendation recorded as doctrine-adjacent — a shopkeeper's tongue is closer to §3.7's data rights than to a feature flag; Q6 confirms).

---

## 5. Cross-cutting — catalogue, rules, demo, privacy

### 5.1 G's catalogue gains the Growth rows (one release, snapshot-safe)

| New module (`PermModule`) | Set | Notes |
|---|---|---|
| `loyalty` | **+ Standard** (proposed — Q2) | Earn/redeem ride bill creates; programme settings + expiry are the gated acts |
| `whatsapp` | **+ Standard** (proposed — Q2) | Templates, campaigns, send queue, reminders |
| `storefront` | **+ Advanced** (proposed — Q2) | Publish + inbox + conversion; the public leg derives per §2.6 |

Adding rows is a catalogue release (G §3.2): existing snapshots are untouched — a Standard shop's snapshot gains nothing until renewal/assignment refresh, at which point the new rows arrive with the tier the owner *sold*. `founding` businesses (G §7.3) receive the Growth rows at their next snapshot refresh by console act, like any catalogue enrichment — never silently mid-period.

### 5.2 Rules v10 — additive blocks, named amendments, strip-proof

- **New blocks (pure additions):** `storefronts` (owner write; public read gated by the §2.6 derivation), `storeOrders` (public create-only with the §2.4 shape validation; member read; single-transition state leg), `waTemplates` / `waCampaigns` / `waSends` (standard tenant-namespace legs under `users/{bid}/…`, member-gated like every tenant collection).
- **Tenant collection count** grows by the three `wa*` collections (35 → **38**) — the backup export's collection list (G §9) extends by the same three, asserted by the H audit (a backup that forgets the marketing history is not a backup).
- **Named amendments (called out in the v10 header, per the v4/G precedent):** (1) the Advanced/refType tier-gate list (G §4.1's seam) gains `loyalty_expire` under the tier that holds `loyalty`; (2) the A5 posting-backstop's refType awareness gains `loyalty_earn`/`loyalty_expire` so period locks bind loyalty postings like every dated act. **No amendment touches the journal legs' shape** — earn/redeem are ordinary journal creates through existing legs; that ordinariness is the design's whole point.
- **Loyalty needs no rules block of its own** — there is no loyalty collection. The journal, the settings object and the customer doc's consent-adjacent fields are existing surfaces. Stated plainly because a reviewer will look for the block: its absence *is* the doctrine (§1.1, rejected alternative iii).
- Publication: **rules v10 first**, then clients, with the strip-proof (v10 − H ≡ v9 byte-for-byte) as an H6 gate. Old clients against v10: fully functional (every H leg is additive or an OR).

### 5.3 Demo mode — showroom rules, restated for H

In demo (no Firebase config): the loyalty programme runs on the demo shop's local store (the showroom shows the top tier's toys, G §4.4's pattern — programme on, sample points on demo customers); the storefront renders a **labelled local preview** (`/s/demo` from demo data — no publish write is attempted, no public doc exists); WhatsApp campaigns compose and queue against demo customers with the send step opening wa.me exactly as production does (it is the shopkeeper's own WhatsApp either way — nothing demo-specific can leak); PS/FA ship with their true badge state. A production build has no demo path — unchanged.

### 5.4 Privacy re-assertion

H's data all lives where its kind already lives: loyalty in the shop's journal (the shop's own books — the platform never saw them, G §2.3), campaigns in the shop's namespace, the storefront snapshot in a doc the owner deliberately published, PS/FA in the product binary. The platform's counters gain **nothing** — not a storefront-enabled flag, not a campaign count. If the owner ever wants platform-level growth analytics, that is a new design against §2.3's closed list with his explicit decision, exactly as G wrote it.

---

## 6. Increment plan — H1…H6

Order is dependency-driven: loyalty's journal doctrine before everything (it is the phase's only new money), storefront after loyalty (conversion feeds §1's earn), marketing after both (its audiences consume loyalty derivations), languages after the surfaces exist (H1–H4's new keys must be *in* the dictionaries H5 translates), apps + audit last (the phase gate).

### H1 — Loyalty core (web)
- COA +2 codes (§1.2) + Tally rows; refTypes `loyalty_earn`/`loyalty_expire`; settings block; composers (earn at bill finalize, redeem-as-tender inside the bill composer, clawback companion, expiry) through the choke point — **`makeEntry(` site count grows 24 → the new exact number the suite asserts** (expected +3 composer sites; redemption adds none).
- Selectors: per-customer points + rupee liability + FIFO vintages + tier derivation; the §1.3 identities.
- Surfaces: billing tender + earn preview, customer card points/tier/vintages, loyalty desk (totals, expiring, expired-unposted + posting act), reports section, `loyalty` PermModule rows.
- **Checkpoint:** H1 suite — earn/redeem/return/void/clawback matrix against fixtures (bill void reverses earn exactly; partial return claws proportionally with customer-favour rounding; redeem cap + balance clamp refuse pre-write with named reasons); identities (GL ≡ Σ customers; Rs ≡ Σ vintage×rate; TB 0 across a loyalty trading day incl. an FY close with `expense_loyalty` swept); seed SHA re-asserted; all 1,569 prior checks green, unpinned.

### H2 — Loyalty + storefront in the apps' core; storefront (web)
- Dart: loyalty composers/selectors ported against **golden fixtures exported from the TS harness** (the F §8 pattern — cross-language byte-equality incl. the FIFO/tier derivations); billing tender + customer surfaces in the apps.
- Web storefront: rules v10 blocks for `storefronts`/`storeOrders` published first (§5.2); publish flow + snapshot assembler; `/s/{slug}` public page (catalogue, cart, checkout); inbox surface + conversion (§2.5) with drift display; receipt/link QR.
- **Checkpoint:** Dart suite grows past 366 with loyalty fixtures green; storefront suites — public read serves only `enabled` + in-plan docs (rules fixtures at every plan boundary: trial dark, active lit, grace dark, suspended dark); inbox shape validation refuses every malformed create in fixtures; conversion exactly-once under race fixtures; a converted order's SO→bill posts identically to a hand-made SO's bill (journal diff == the source linkage only).

### H3 — WhatsApp marketing + service reminders (web)
- Consent fields + capture points; `waTemplates`/`waCampaigns`/`waSends` + audience derivations (incl. udhaar-aging and points-expiring); campaign launch (per-recipient opt-in re-check) + the send queue (§3.4) + log; suggested-reminders panel (§3.5); `whatsapp` PermModule rows; the plain-language v1-limits warning copy.
- **Checkpoint:** audience suites (opt-out between launch and send excludes at the queue; import never sets opt-in; storefront consent lands only via conversion); send-log truth (states distinguish opened/confirmed-sent/skipped, and no state the transport cannot know exists in the type); tenant-collection count 38 asserted in the backup suite.

### H4 — Storefront + WhatsApp in the apps (Flutter parity)
- Apps: storefront management (publish/unpublish, inbox, conversion) and the marketing module (templates, campaigns, queue) with the same derivations fixture-proven against TS; loyalty already landed in H2 — H4 closes H's cross-client leg: one shop, web + Android, loyalty balances / inbox / campaign logs agree to the point and the rupee.
- **Checkpoint:** Dart suites for H3/H4 derivations green against shared fixtures; the cross-client walk (publish on web → order on the public page → convert on Android → bill on web → points land → campaign from Android) executed in fixtures end-to-end.

### H5 — Pashto + Farsi packs
- Locale type widens (`en|ur|ps|fa`); PS/FA dictionaries complete at the then-current key count (machine-drafted per §4.1); review manifest + badge derivation + picker/Settings labels; Naskh font stacks (web) + the Naskh asset (apps); direction truth table; review packs generated (§4.3) for both languages; the four-locale parity gate (§4.4) wired into both clients' checks.
- **Checkpoint:** i18n totals printed and pinned (all four locales equal; manifest coverage 100% of keys with states); PS/FA sample renders (dashboard, bill, one report, one storefront page) screenshot-verified for shaping + RTL in web, and raster-verified in the apps' print fixtures; **badge state is whatever the manifest says** — if review has not landed by H5's close, both locales ship badged as drafts and the audit says so in those words.

### H6 — Phase-end finance-integrity audit + packaging
- The checklist below executed fresh and recorded as `PHASE-H-RELEASE-AUDIT.md`; distinct-zip delivery in the house pattern (superseding the ERP-G zip), rules v10 published first in the rollout; the FULL-source zip refreshed (the parked GitHub one-push vehicle — refreshed, **not pushed**: pushes remain the owner's one act, per his standing order).

### Phase-end finance-integrity audit checklist (Phase H close — all must pass)
- [ ] Frozen seed identities re-asserted (21 · 272,805 · 50,000 · 27,900 · 5,500 · TB 0 · SHA `e17e5bda…1168`) — the seed shop has no loyalty history, and its journal is byte-identical.
- [ ] Loyalty identities: `loyalty_payable` GL ≡ Σ per-customer liabilities ≡ Σ unspent vintage points × snapshot rates; a full loyalty lifecycle (earn → redeem → return → clawback → expiry → FY close) ends with TB 0 at every step.
- [ ] `makeEntry(` site count == the H1-asserted number; every loyalty posting in the suites arrived through the choke point (no direct journal writes in H code — greppable assertion, the G6 pattern).
- [ ] Rules strip-proof: v10 − H material ≡ v9, byte-for-byte; public-leg fixtures (storefront read matrix, storeOrders shape/transition) all pass.
- [ ] Storefront conversion: no path from a public write to a journal entry exists except via a member's conversion → SO → bill (the suite enumerates the public write's reachable effects: one inbox doc, nothing else).
- [ ] Privacy: platform collections/counters gained zero H fields (diff of G's closed list == ∅); campaign/loyalty data exists only in tenant namespaces.
- [ ] i18n parity at the new key count in **four** locales; review-manifest coverage 100%; badge derivation matches manifest state; no hardcoded strings on H surfaces in any locale.
- [ ] Demo build: loyalty on, storefront preview labelled, PS/FA badge truthful, zero platform/public writes attempted.

---

## 7. Risk list

| # | Risk | Severity | Mitigation in this design |
|---|---|---|---|
| R-H1 | Points liability grows unnoticed until redemption season (festival/Eid) strains a shop's cash — the product "worked" and the shop still feels ambushed | Medium | The liability is on the balance sheet from day one (§1.1) and the loyalty desk leads with the outstanding figure + expiring forecast; the redeem cap (Q1) bounds any single bill's drain. The design's whole earn-posting doctrine exists for this risk |
| R-H2 | Clawback/FIFO derivation diverges between TS and Dart (two folds over vintages) | Medium | The F §8 golden-fixture pattern (H2): one exported fixture journal, both folds must agree to the point; divergence fails CI, not customers |
| R-H3 | Storefront inbox abuse (spam floods, quota burn on the shop's Spark project) | Medium | §2.4's bounded shape: create-only, capped fields, unpublish closes both legs, mass-dismiss tooling; the flood can create paper, never postings. App Check/Functions rate-limiting parked with the Blaze decision — named, not hidden |
| R-H4 | A shop's WhatsApp number is restricted by WhatsApp for burst sending | Medium | §3.4's human-paced queue + opt-in-only audiences + the plain-language warning; the design refuses to build the blaster that would cause it. Residual risk is the shopkeeper's own sending behaviour — his number, his act, with the product's guidance honest |
| R-H5 | PS/FA drafts contain a consequential mistranslation (a money word wrong on a bill) | High | §4's badge + review workflow; money-critical surfaces (billing, finance) are first in the review pack's grouping so partial review covers them first; EN/UR are one toggle away and unchanged. A draft is usable from day one *as a labelled draft* — the risk is carried openly, not denied |
| R-H6 | Published snapshot goes stale (prices/stock bands drift from the live shop) | Low | Publish-on-save setting + the publish screen shows snapshot age; conversion re-prices against live data with drift shown (§2.5) — staleness can embarrass, it cannot mis-post |
| R-H7 | Slug squatting / impersonation (a lookalike slug for a known shop) | Low | Slugs are first-come, immutable, and never recycled (§2.6); the store page shows the shop's own published phone/city for cross-check; impersonation *between tenants* is a console matter (the platform can retire a squatted slug's doc by admin act — the one platform write into H's world, logged like every G admin act) |
| R-H8 | Loyalty tier-gating by plan snapshot confuses (a Standard shop renews, catalogue moved loyalty) | Low | G invariant 3 already governs: snapshots hold until renewal; the locked-door copy names the tier that holds the feature *in the shop's snapshot*, per G §4.1's client doctrine |

---

## 8. What Phase H deliberately does NOT do

- **No points-for-money sale, no points transfer between customers, no multi-shop points pooling** — points are one shop's promise to its own customers; a transferable instrument is a payments product with regulators, not a growth feature.
- **No online payment, delivery logistics, customer accounts, or marketplace** on the storefront (§2.7).
- **No automated or bulk WhatsApp sending, no Cloud API, no inbound automation** in v1 (§3.6) — and no *scheduled* campaigns of any kind (no server; a "schedule" the client can't honour offline would be a lie in the UI).
- **No runtime machine translation** and no unlabelled draft language (§4.1–4.2).
- **No Jalali calendar, no per-locale number systems** (§4.5).
- **No change to G's closed platform-visibility list, F's owner-gated items, or the Raast provisional state** — H inherits those gates exactly as they stand.
- **Phase H does not launch anything commercially** — prices, tier placement and programme defaults are the owner's calls (§9); H builds the layer.

---

## 9. Decisions by precedent vs open questions

### 9.1 Settled by precedent (no owner input needed — recorded so they are not re-litigated)

- **Points are a journal liability with the cost recognised at earn** — the C5 pooled-advance subledger pattern + the product's matching doctrine (§1.1); the rejected alternatives are recorded with their reasons.
- **Redemption rides inside the bill entry as a tender** — so B's void/return mirrors stay the only reversal machinery (§1.1).
- **The public surface is a published snapshot + a create-only inbox, never a leg into the tenant namespace** — G's move-data-as-data pattern (§2.2, §2.4).
- **Orders land as SO- via the B conversion, exactly-once, re-priced at conversion** (§2.5).
- **Marketing consent defaults off and is re-checked at send time; the send log records only what the transport can know** (§3.2, §3.4).
- **Languages are never plan-gated** (§4.5).
- **Rules published first, additive, strip-provable; demo is a showroom** (§5.2, §5.3).

### 9.2 Open questions (owner's call genuinely needed — recommendations given; every commercial figure is owner-to-confirm)

- **Q1 — Loyalty programme defaults.** Proposed: earn 1 point per Rs 100 of net payable; 1 point = Rs 1; redemption cap 50% of a bill; expiry 12 months; tiers Silver ≥500 / Gold ≥2,000 trailing-12-month points at 1.25×/1.5× earn. *Recommendation: launch with these* — they make the liability ≈1% of sales at full redemption (a cost a kiryana margin can see and survive), the cap keeps tills cash-fed, and every figure is a settings value the owner can tune per shop after the first month's desk figures land.
- **Q2 — Tier placement of the Growth rows.** Proposed: loyalty + WhatsApp at **Standard**, storefront at **Advanced**. *Recommendation: adopt* — retention tools are the mid-tier's reason to exist; the public surface carries Advanced's price because it carries the platform's support. If the owner wants a sharper free-to-paid edge, moving loyalty to Advanced is a one-line catalogue change *before* any snapshot sells it — after that, snapshots govern.
- **Q3 — Storefront order intake: inbox-first or WhatsApp-first?** The design builds the create-only inbox (§2.4) with the wa.me confirmation shadow. The alternative — checkout composes a wa.me message only, no inbox doc — has zero public-write surface but leaves the shop re-typing orders from chat and loses the exactly-once conversion seam. *Recommendation: inbox-first as designed* — the bounded abuse shape (§2.4) is a fair price for orders that land as SO- in one tap; shops that disagree can disable intake and take orders by chat as they do today.
- **Q4 — Who reviews Pashto and Farsi?** The packs (§4.3) need one named native reviewer per language. *Recommendation: the owner's own scholarly/community network supplies both (Pashto from his KPK-side circle, Dari from Afghan trader/scholar contacts); machine drafts ship badged until they pass.* If no Farsi reviewer materialises, Farsi ships as a labelled draft without shame — the badge system exists precisely so a missing reviewer delays a *label*, not a language.
- **Q5 — Storefront checkout identity.** Proposed: name + phone only, no accounts (§2.3). *Recommendation: keep* — accounts would halve conversion in this market and create a credential store the product doesn't need; the phone number *is* the identity the shop already uses (WhatsApp, udhaar, delivery).
- **Q6 — Confirm languages are ungated.** *Recommendation: confirm* (§4.5) — recorded as a question only because G taught the product to ask before any catalogue-adjacent decision hardens.
- **Q7 — Slug policy.** Proposed: slug derived from the shop name at first publish, immutable, never recycled; collisions resolved with a city/numeric suffix the owner picks at claim time. *Recommendation: adopt* — printed links (receipt QRs) must outlive renames, and immutability is what makes that true.
