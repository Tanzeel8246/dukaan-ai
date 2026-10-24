# Dukaan AI — ERP Phase G "SaaS Layer" — DESIGN

**Status:** Design only — no web, Flutter, rules or harness code changed by this document.
**Scope:** Phase G of `dukaan-erp-roadmap.md` (Super Admin & Packages: super admin panel, Silver/Gold-style package tiers, one user with several businesses, backup & restore) — turning the finished single-business ERP (Phases A–F) into a sellable multi-tenant SaaS at the standard of the owner's **MC Billing ERP** (super admin panel, Gold-style packages, multi-business, one product sold to many businesses). Designed against the complete A–F state; nothing here re-opens a settled A–F decision.
**Sources read:** `dukaan-erp-roadmap.md` (Phase G + the roadmap's honesty notes), `ERP-PHASE-F-DESIGN.md` (§3.6's parked server-counter conversation, §12 Q5/Q6 — both explicitly handed to this phase), `ERP-PHASE-A-DESIGN.md` (§3 RBAC, §5 periods, §6 migration/rollout discipline), `ERP-PHASE-D-DESIGN.md` (§12 open-question style), `ERP-PHASE-E-DESIGN.md`, `web/lib/types.ts` (`ShopSettings` — the owner doc), `web/lib/permissions.ts` (the 40 `PermModule`s), `web/lib/firebase.ts` (`isDemoMode`/`isProductionMode`), `web/components/StoreProvider.tsx` (the posting choke point + demo/production store split), `firebase/firestore.rules` (v8, 594 lines — the strip-proof baseline), `PRODUCTION.md` + `PHASE-E-RELEASE-AUDIT.md` + `flutter-app/F1–F5-REPORT.md` (baselines: harness **1,389/1,389**, Dart tests **213/213**, i18n **2,581 keys EN ≡ UR**, rules v8).

## Non-negotiable invariants carried over (Complete edition + Phases A–F)

Every design choice below is subordinate to these — Phase G must not regress any of them:

1. **The journal doctrine is untouchable, and tenancy is not a posting.** Append-only journal; one atomic balanced entry per money event through the one guarded choke point (24 `makeEntry(` sites in the web store; the Dart ports mirror them); balances always derived, never stored counters **inside a shop's books**. Phase G adds tenancy, plans and platform bookkeeping — **none of it ever writes a journal entry, an operational document, or a single byte inside any shop's `users/{uid}` tree.** Tenant identity, membership, plan state and platform revenue are metadata that live *outside* the tenant namespace (§1, §3). A Phase G migration that changed any shop's journal SHA would be a failed migration by definition (§7 re-asserts the frozen identities as the proof).
2. **One backend, no server, no Blaze assumption.** The same Firebase project (`dukan-8246`, Spark) serves shops, platform and apps. Phase G introduces **no Cloud Functions, no scheduled jobs, no server component** — every G mechanism below is built from client writes + Firestore rules, and anything that genuinely needs a server (payment-gateway callback verification, §3.6) is named as out-of-scope rather than faked. Where a state looks like it needs a cron (trial expiry, plan lapse), the design derives it instead (invariant 6).
3. **Plan state is derived, never stored** — the C1/C5 doctrine applied to billing: a business's effective plan state (trial / active / grace / read-only) is a **pure function** of its plan record (plan id, period end, trial end) and *now*, computed identically by the web client, the Dart client and (in its own idiom, `request.time`) the rules. No client ever writes a "status: expired" flip; there is no flip to race, forge or miss while offline.
4. **Rules evolve additively, strip-provable, published rules-first.** G's rules are **v9 = v8 + G blocks + exactly two documented function amendments** (§6.2 names them). The release audit strips the G material and diffs against v8 byte-for-byte — the standing discipline since v3, including the v4 precedent that a deliberate amendment to a pre-existing line is permitted **only** when the header calls it out, as v9's header will.
5. **The super admin is not a shop role and holds no shop keys.** Platform administration is a separate surface with a separate grant (`platformAdmins`, §2); it confers **zero** read access to any shop's journal, subledgers or operational documents. The platform sees a business's *metadata and named counters* (§2.3's closed list), never its books. This is a privacy doctrine, not a UI preference: the rules make it true, so it stays true even against a buggy or curious admin client.
6. **Platform revenue is not a shop journal event.** A shop paying for Dukaan is money movement in the **owner's platform business**, recorded in platform collections (`platformPayments`, `businessEvents`, §3.5) — never in the paying shop's journal (it is not the shop's sale, purchase or expense until the *shopkeeper* chooses to record the subscription as an expense in his own books, by hand, like any other bill he pays). Conversely the platform's own accounting is the owner's ordinary business accounting, kept in his own ordinary shop (§3.5).
7. **Frozen seed identities stay frozen; harness identities extend, never weaken.** Seed journal 21 entries · Inventory 272,805 · Cash 50,000 · payables 27,900 · receivables 5,500 · TB 0 · SHA `e17e5bda…1168`. G's suites (§8) add tenancy/plan/counter identities *around* the existing 1,389 TS checks and 213 Dart tests; not one existing check is edited, relaxed or re-pinned.
8. **Language purity + calm shell.** EN/UR full parity through the one web dictionary (admin and switcher strings included — §5.4); the five calm themes and the top-header shell standard apply to every G surface, the super admin console included. Plan and limit copy is written to be read by a shopkeeper, in both languages, without a lawyer.

## Current state (what Phase G builds on)

| Area | Today |
|---|---|
| Tenancy | **Tenant = one owner account, implicitly.** All shop data lives under `users/{ownerUid}/…` (35 collections); the owner doc `users/{ownerUid}` *is* the shop (settings + `staff[]` + `staffEmails[]` + `lockedThrough` + flags). There is no business id, no business registry, no plan, no platform surface of any kind. |
| Staff resolution | `staffIndex/{email} → { ownerUid, role, addedAt }`: **one doc per email, therefore one shop per staff person, structurally.** A person who works at two of the owner's shops cannot be staff of both — the F §12 Q6 limitation, accepted for F, owned by this phase. The rules re-verify the email against the owner doc's `staffEmails` on every check, so removal is immediate. |
| Roles | owner/manager/cashier/accountant, resolved by `staffRole(uid)` in rules and the `can()` matrix (40 modules) in clients; missing role ⇒ manager (legacy default). |
| Demo mode | Build-time: no Firebase config ⇒ `isDemoMode()`, a localStorage store seeded with the fictional demo shop. A production build has no demo path. The demo is a *showcase*, not a tenant. |
| Money enforcement rails | The A5 period backstop already gates **creates** on dated operational collections + the journal via `createInOpenPeriod` / `journalCreateInOpenPeriod` — G's plan gate (§4) rides these exact legs, it does not invent new ones. |
| Platform collections | **None.** The rules' catch-all denies everything outside `staffIndex` and `users/{uid}`. |
| The MC benchmark | The owner's MC Billing ERP: super admin panel, package tiers (his shops buy a package — Gold is the standing example), multi-business per customer, sold commercially. His MC-MMS SaaS (the madrasa product) publishes the tier shape this design mirrors: **Free Trial (time-boxed) / Basic Rs 1,500 / Standard Rs 2,500 / Advanced Rs 4,000 / Enterprise** — those figures are that product's, used here only as the structural anchor (§3.1, Q1). |
| Verification | TS harness 1,389/1,389 · Dart 213/213 · fixtures f1–f5 byte-stable · i18n 2,581 · rules v8 (594 lines). F5's owner-gated items (CI runs, the §7.5 device acceptance script) remain owner-gated and are **not** re-opened by this design. |

---

## 1. Tenancy model — the business is the tenant; the namespace does not move

### 1.1 The decision: businessId ≡ ownerUid, forever an identity, never a migration

Phase G names the tenant a **business**. The first design question — where does a business's data live? — is answered by refusing to move it:

- **A business's data stays exactly where it is: `users/{businessId}/…`, with `businessId` defined as the founding owner account's uid.** Every existing shop is already a business under this definition; every selector, rule path, fixture and client (web + both Flutter targets) already speaks this namespace. Creating a business still means an owner account signing up and its namespace being born empty — the same birth the app has today.
- What G adds is a **registry and a membership layer outside the namespace** (top-level collections, §1.2). Tenancy becomes *described* (a registry doc says this uid is a business, with a name, a plan, a status) and *shared* (membership docs say who else belongs) — while the data's physical home, and therefore every A–F proof about it, is untouched.
- **Rejected: re-homing data under `businesses/{bid}/…`.** It would buy a prettier path at the price of a 35-collection physical move per shop, a dual-path transition in every client and rule, and a migration window in which the journal's home is ambiguous — all to change a string no user ever sees. The uid *is* a fine business id: opaque, unique, already the key every rule uses.
- **Rejected: one Firebase project per business.** Spark-project sprawl, per-project rules deploys, no platform-wide directory — the opposite of a SaaS.
- A business has **exactly one owner account** in G (the account whose uid is the business id; ownership transfer and co-ownership are §10 non-goals, Q6). The owner account is the business's root of trust exactly as today: it alone writes the owner doc, manages staff, and (new in G) is the platform's counterparty for the plan.

### 1.2 The platform collections (all new, all top-level, all additive)

| Collection | Doc | Contents | Written by | Read by |
|---|---|---|---|---|
| `businesses` | `{businessId}` (== owner uid) | Registry: `ownerUid`, `ownerEmail`, `name` (shop name snapshot for the directory — a *label*, the owner doc stays the name's home), `phone`, `city` (directory fields the owner supplies at registration; editable by the owner), `createdAt`, `status` (`active`/`suspended` — §2.4), `plan` (§3.2: plan id + limits snapshot + period/trial ends), `enforce` (bool — the staged-enforcement switch, §6.3) | Owner at creation (rules-validated: trial shape only, §4.3); plan/status fields thereafter by **platform admin only** | Owner + members (own doc); platform admins (all) |
| `businessMembers` | `{businessId}/members/{memberUid}` | Membership: `email`, `role` (the shop role), `addedBy`, `addedAt`, `source` (`staff` migration mirror / `invite`) | Business owner (and the G1 lazy backfill, §7.2) | The member (own docs, any business — powers the switcher list); the owner; admins (directory counts) |
| `userMemberships` | `{memberUid}` | Switcher index: array of `{ businessId, role }` the person belongs to, + their own business if any | Maintained in the same batch as every membership write (owner's client); self-healing (§1.4) | The person only; admins never need it |
| `businessCounters` | `{businessId}` | **Hard counters** (§2.3): `invoiceMonth` (`YYYY-MM`), `invoiceCount`, `memberCount` — written *inside posting/invite batches*, integrity-checked by rules (§4.2) | Tenant clients, inside the batches rules pair them with | Owner (own); platform admins |
| `businessStats` | `{businessId}` | **Soft telemetry** (§2.3): `lastActiveAt`, `lastDayCloseAt`, approx doc counts by family, client versions seen — best-effort, labelled soft wherever shown | Tenant clients (owner-role sessions, throttled) | Owner (own); platform admins |
| `platformAdmins` | `{uid}` | `{ email, addedAt, addedBy }` — the super-admin grant. **Bootstrap: the owner creates the first doc by hand in the Firebase console** (one manual act, §2.1) | Admins (after bootstrap) | Admins only |
| `platformPayments` | auto-id | Renewal record (§3.5): `businessId`, `amount`, `method` (`raast`/`jazzcash`/`easypaisa`/`bank`/`cash`), `reference`, `periodFrom`, `periodTo`, `planId`, `state` (`submitted`/`confirmed`/`rejected`), `submittedBy`, `confirmedBy`, timestamps | Owner submits; admin confirms/rejects | The business's owner (own business); admins (all) |
| `businessEvents` | auto-id | **Append-only platform audit log**: plan assigned/changed, trial started, suspension/activation, payment confirmed/rejected, membership backfill, restore performed (§9) — `{ businessId, kind, actor, at, detail }` | Owner/admin clients at the moment of the act (rules: create-only, no update/delete, ever) | The business's owner (own); admins (all) |

Two deliberate absences: **no `plans` collection in v1** — the catalogue is code (§3.2), because a plan's *meaning* (which modules, which gates) is code in the clients and rules anyway; a database catalogue would be a second, driftable copy of a table only code can honour. And **no platform journal**: platform money has §3.5's home, not a ledger of its own inside this product.

### 1.3 Membership — one person, several businesses, one role per business

The `staffIndex` shape (one email → one shop) is the thing G exists to retire. The membership model:

- **Membership is per (business, person)**: `businessMembers/{businessId}/members/{memberUid}` carries that person's role **in that business**. The same person is cashier at one shop and manager at another; roles never bleed across businesses because every resolution is scoped by the business being entered.
- **Keyed by uid, not email.** `staffIndex` keyed by email forced resolution before the person's account/uid was in play and made email the identity. Membership docs key on the member's **uid** (email kept as a display/search field). Inviting therefore becomes a two-step the client already knows how to do: the owner invites by email → an **invitation** doc (the staffIndex pattern, generalised: `businessInvites/{businessId}/invites/{email}`) → when that person signs in, their client claims pending invites for their verified email, creating the membership (uid-keyed) + switcher-index entry in one batch. Unclaimed invites are owner-deletable and confer nothing.
- **The owner is never a member of their own business** — ownership is the uid match, as today; the switcher lists "your business" from the uid itself, not from a membership doc.
- **Resolution order (clients and rules agree):** owner uid match ⇒ owner; else membership doc ⇒ its role; else **legacy `staffIndex` fallback** ⇒ its role (G1's transition leg, §7.2); else no access. Missing role on a membership doc ⇒ manager, the standing legacy default, unchanged.
- **Removal is immediate**, by the same construction as today: the rules consult the membership doc (and, in the transition, the owner doc's `staffEmails` mirror for legacy staff) on every evaluation — deleting the membership doc cuts access on the next request, no cache to expire. The owner doc's `staff[]`/`staffEmails[]` remain the owner's *management view* of login staff in G (the Settings staff screen writes membership + mirror together in one batch); whether the mirror can retire entirely is a post-G cleanup question, not a G risk (§10).

### 1.4 The switcher — one active business, in the top header

- **Where it lives:** the shell's **top header bar**, beside the shop name — the owner's standing shell standard puts identity/session controls in the header, and the switcher is one. It shows the active business's name + the person's role in it; the menu lists every business from `userMemberships` + the person's own, each with its role label, the active one marked. Businesses the person has been removed from simply vanish from the list (the doc is gone; the index entry is cleaned by whichever client notices first — the index is a *cache of memberships*, and any entry whose membership doc no longer exists is dropped on sight: self-healing, never a second source of truth).
- **Switching is a context change, not a tab:** the store tears down every subscription of the old business and attaches the new business's (the StoreProvider already parameterises its namespace by ownerUid; G makes that parameter switchable — the F design's "shop context" made dynamic). Local per-device state (PIN record, printer prefs, theme) is **device** state and does not switch; the PIN in particular stays the device's own (E4's model — a PIN per device, not per business).
- **Offline honesty (apps):** Firestore's offline queue holds *absolute document paths*, so writes queued while in Business A still flush to Business A after switching to B — the queue is safe across a switch by construction. But the **rejected-write tray is labelled per business** (a refusal from A surfacing while the user works in B must say which business it belongs to, and the tray filters to the active business with a cross-business count badge). Composing new work always targets the *active* business; there is no background composition into an inactive one.
- **Web parity:** the web store's session already resolves one shop per sign-in; G gives it the same switcher (a staffer serving two shops on the web today signs out/in — after G, they switch). Deep links carry no business parameter in v1: the active business is session state, and a reload lands on the last active business (persisted device-locally, like the theme).

### 1.5 What a "business" is not

A business is **not** a branch. Two shops the same person owns are two businesses with two journals, two plans, two trials — consolidation across them (the owner's "all my shops" view) is a *platform-directory* act for the super admin and a switcher act for the person, never a merged ledger. Branch-style shared books (one journal, warehouse separation) already exist *inside* a business — that is Phase C's warehouses, and G does not disturb the distinction.

---

## 2. Super admin — the platform console

### 2.1 Surface and grant

- **Surface:** a distinct section of the web app at `/platform`, behind the `platformAdmins/{uid}` grant — **web-only** (§5), rendered in the same calm shell but visually badged as the platform surface (a shopkeeper who is also an admin must never mistake which hat he is wearing; the platform section carries its own header label in both languages).
- **Not a role:** `platformAdmin` never appears in `staffRole`, the `can()` matrix, or any shop's member list. An admin who opens a shop URL gets exactly the access their membership gives them — for the owner's own shops that is ownership (his uid), for anyone else's shop it is **nothing**. The console is the *only* door the grant opens.
- **Bootstrap and succession:** the first `platformAdmins` doc is created by the owner manually in the Firebase console (a one-time act, written into the G3 checklist like the F1 Firebase-registration act). Afterwards an admin can add another admin from the console (the act lands in `businessEvents` with `businessId: "platform"`). Removing an admin is likewise an admin act. There is deliberately **no self-service claim**: a client can never write its own uid into `platformAdmins` (rules: create requires an existing admin, bootstrap excepted by the console's own authority, which bypasses rules as the project's owner — stated plainly so the exception is understood to live outside the rules entirely).

### 2.2 What the console does

| Capability | Detail |
|---|---|
| Business directory | Searchable/sortable list of `businesses`: name, owner email, phone, city, created, plan (id + state, derived §3.4), status, last active (soft) — the sales/support view of the platform |
| Business detail | The registry doc + counters + stats + that business's `businessEvents` history + its `platformPayments` — the whole platform-side file on a business, on one screen |
| Plan assignment | Set plan id + period end (assignment writes the §3.2 limits snapshot — the assignment act *is* the snapshot) |
| Suspend / activate | Flip `businesses.status` (§2.4) with a mandatory reason string, logged |
| Trial extension / comp | Adjust trial/period end dates (a support act), logged with actor |
| Payment confirmation | The §3.5 renewal queue: confirm (extends the period, logged) or reject with a note |
| Platform aggregates | §2.3's counters, summed client-side over the directory (business counts by plan/state, invoices this month platform-wide, confirmed revenue by month from `platformPayments`) — at G's scale (tens to hundreds of businesses) a client-side sum over small docs is honest arithmetic, and the console labels every figure with the counter it came from |
| Admin management | Add/remove platform admins (§2.1) |

### 2.3 The privacy doctrine — the closed list of what the platform may see

The platform's entire window into a business is these **named, auditable counters and fields** — the list is closed; adding a field to it is a design change, not an implementation detail:

- **Registry fields** the owner himself supplies for the directory: shop name, phone, city, owner email, creation date.
- **Hard counters** (`businessCounters`, rules-verified because they ride inside verified batches, §4.2): `invoiceCount` for the current month + the month key, `memberCount`. *Hard* means: the number is what the rules enforced against; a client that miscounts fails its own postings, so the count the admin sees is the count the shop was held to.
- **Soft telemetry** (`businessStats`, best-effort, always labelled "reported by the shop's app"): `lastActiveAt`, `lastDayCloseAt`, approximate document counts by family (products/bills/customers — magnitudes for support, not figures for billing), app versions seen.
- **Platform's own records**: the business's plan, payments and events — the platform's paperwork about the business, which is the platform's to keep.

**What the platform can never see — enforced by rules, not policy:** any journal entry or balance; any customer, supplier, product, price or stock figure; sales or profit in any form; employee/payroll data; in short, **anything under `users/{businessId}/`**. The rules grant `platformAdmins` **no** leg into the tenant namespace at all (§6.2) — an admin's read of a shop's books fails at the same catch-all as a stranger's. If the owner (wearing his shopkeeper hat) wants a shop's figures, he opens that shop as its owner — a different grant, a different surface, visibly. The one deliberate consequence, stated for the record: **platform support cannot debug a shop's books from the console.** Support happens with the shopkeeper sharing his own screen/exports, as it does for MC today. That is the correct price for the doctrine, and G pays it knowingly.

### 2.4 Suspension — what it does and does not do

- **Effect:** `status: suspended` denies **writes** into the tenant namespace at the rules' access leg (one `get` on the businesses doc inside `canAccess`'s G amendment, §6.2): no postings, no edits, no new documents. **Reads keep working** for owner + members — a suspended shop can still open its books, print, and export (§3.7's data-is-the-shopkeeper's doctrine). Platform-side writes (a payment submission) also keep working — suspension must never block the act that ends it.
- **Reasons:** non-payment is the expected case; abuse/fraud and owner-request are the others. The reason is recorded in the event log; the shop sees a suspension banner naming the reason class and the remedy (pay / contact), in both languages, on every client.
- **Not deletion:** suspension never deletes, hides from the owner, or degrades data. Activation is one flip; everything resumes byte-identically, because nothing was ever touched.

---

## 3. Packages & billing

### 3.1 The catalogue — structure mirrored from the owner's proven tiers

Five tiers, in the MC-MMS shape the owner already sells (roadmap: "Silver/Gold نوعیت کے درجات" — the *structure* is his; the figures below are **proposed defaults anchored to his published MC-MMS price points, every one marked owner-to-confirm** in Q1 — Dukaan's prices are his commercial decision, and this design proposes, it does not set):

| Tier | Price (PKR/mo) — *proposed, owner-to-confirm* | Users (members + owner) | Invoices / month | Module set (§3.3) | Businesses |
|---|---|---|---|---|---|
| **Free Trial** | 0 (14 days, once per business) | 2 | 200 **total** (trial pool) | Standard's set (taste the real product) | 1 |
| **Basic** | 1,500 | 3 | 500 | Core | 1 |
| **Standard** | 2,500 | 5 | 2,000 | Core + Documents + Operations | 1 |
| **Advanced** | 4,000 | 10 | 10,000 | Everything (all phases A–E modules) | 1 |
| **Enterprise** | Custom (owner-quoted) | Unlimited (snapshot set at assignment) | Unlimited (snapshot) | Everything + priority support terms | Multi-business bundle by assignment |

Annual billing: offered as **10 × monthly** (two months free) — a proposed default in Q1, applied as a longer `periodTo` at assignment, nothing more exotic.

### 3.2 The catalogue lives in code; the assignment lives in a snapshot

- The tier table (ids, module sets, default limits) is a **code constant** in the shared client layer (`lib/plans.ts` + its Dart generation, §5.3) with the same generated-data discipline as the permission matrix: one home, both clients, drift-gated. Prices are *display* data in that table — changing a price is a release, deliberately: a price that can be edited from a console without a release is a price that can be fat-fingered platform-wide at midnight.
- What rules and enforcement consume is **not** the catalogue but the **assignment snapshot** on `businesses/{bid}.plan`: `{ planId, tierRank, usersLimit, invoiceLimit, modulesTier, periodFrom, periodTo, trialEndsAt|null, assignedBy, assignedAt }`. Assigning a plan copies the tier's limits into the snapshot; a later catalogue change never silently re-limits a paying shop mid-period (the payroll-terms snapshot doctrine from Phase D, applied to the platform's own promises).

### 3.3 What each tier gates — the module sets

Module sets are defined over the existing 40 `PermModule`s, grouped as the phases built them:

| Set | Modules |
|---|---|
| **Core** (Basic and up) | dashboard, salesCounter, billing (+void/returns), inventory (view/cost/manage/adjust), forecast, suppliers + payments, customers + credit, expenses, finance, accounts, transfers (money), dayClose (+history), assistant, settingsProfile, staffManage, taxSlabs, periods |
| **+ Documents** (Standard and up) | quotations, saleOrders, purchaseOrders, creditDebitNotes, vouchers, cheques |
| **+ Operations** (Standard and up) | warehouses (incl. transfers between them), jobTracker |
| **+ Advanced** (Advanced and up) | manufacturing, staffDirectory, payroll, loans, fiscalClose, trialBalanceExports (Tally/CSV) |

Gating mechanics are §4's subject; the set membership is the catalogue's. Two honesty notes: (i) **print design + brand assets (Phase E) ride with Core** — a Basic shop's invoices still carry its logo and Raast QR; charging extra for a shop's own letterhead would be petty and is not the MC way. (ii) A module a tier lacks is **hidden, not broken**: its existing data remains readable where the matrix allows read (a downgraded shop can still *see* its production history in reports), and §3.7's downgrade path never deletes or strands data.

### 3.4 Trial lifecycle

- **Birth:** a business is created in trial (rules enforce the trial shape at creation, §4.3): `planId: trial`, `trialEndsAt = createdAt + 14 days`, the trial invoice pool (200) in the counter doc, module set = Standard's.
- **During trial:** full tasting with two honest frictions — the invoice pool and the 2-user cap. A persistent (calm, non-nagging) trial banner shows days left + pool left; at 3 days left the banner gains the renewal path (§3.5).
- **End of trial, unpaid:** the derived state becomes **grace** (§3.7) — never a cliff.
- **One trial per business** is enforced by construction (the trial is the creation state; a business cannot re-enter it — admin assignment can set any plan *except* re-trial without an explicit `compTrial` event, which is logged and therefore auditable). One trial per *person*: a person may own several businesses over time; Q8 proposes the anti-abuse posture (serial trial farming is a sales problem the event log makes visible, not a G1 engineering problem).

### 3.5 Renewal bookkeeping — where platform revenue lives

- **The record:** `platformPayments` (§1.2) is the platform's operational book of who paid what, for which period, by which method — a submitted → confirmed workflow:
  1. The owner's client shows the renewal surface (plan, price from the catalogue, period it buys) and the owner's payment instructions (his Raast/bank details are `platformConfig` display data the admin maintains — text, not a gateway).
  2. The owner pays out-of-band (Raast transfer etc.) and **submits** the payment record with its reference (transaction id / slip note).
  3. The super admin **confirms** in the console (checking his bank) — confirmation writes the payment's state **and** extends `businesses.plan.periodTo` + refreshes the limits snapshot in the same batch, and appends the `businessEvents` entry. Rejection carries a note the owner sees.
- **The doctrine (invariant 6):** none of this touches the paying shop's journal. If the **platform owner** wants these receipts in *his* books, he records them in **his own platform business** — a business like any other (his, on an Enterprise/comp assignment), where subscription income is ordinary revenue posted by hand or via its own counters. G builds no second accounting for the platform; the ERP the owner sells is the ERP the owner keeps his platform books in. (The dogfood is deliberate, and it is how MC's own operation reads.)
- **No gateway in G v1:** JazzCash/Easypaisa merchant APIs need server-side callback verification; on Spark there is no honest place to verify a callback, and an unverified "paid" flag is worse than a manual confirmation. Gateway integration is a named post-G increment gated on the same Blaze decision the roadmap already parks (§10).

### 3.6 Expiry — read-only grace, defended

**Decision: expiry degrades a business to read-only grace; it never hard-stops, never deletes, never holds data hostage.** The derived states (invariant 3):

| State | Derivation | Posting creates | Reads / prints / exports | Platform writes (payment submit) |
|---|---|---|---|---|
| `trial` | `now ≤ trialEndsAt`, no paid period | ✔ (pool-capped) | ✔ | ✔ |
| `active` | `now ≤ periodTo` | ✔ (plan-capped) | ✔ | ✔ |
| `grace` | period/trial ended ≤ 30 days ago | ✘ | ✔ | ✔ |
| `readonly` | ended > 30 days ago | ✘ | ✔ (forever) | ✔ |

Why not a hard stop (the alternative, rejected): a shop's books are its financial and legal record — the ledger a shopkeeper must show his accountant, his bank, a tax officer. A SaaS that makes a man's own books vanish for a late Rs 2,500 does not get renewed; it gets abandoned and bad-mouthed. Grace converts the expiry moment from a hostage crisis into a sales conversation: the shop trades on read-only, feels the loss of *posting* (the thing it actually needs daily), and pays — while its data was never at risk, which is precisely why it trusts the platform with the data in the first place. MC's standing in its market rests on exactly this kind of dealing. The 30-day grace length is Q3's proposed default.

**Downgrades** (paying Standard, renewing Basic): the new snapshot applies from the new period; module data above the tier stays readable (§3.3), posting into above-tier modules stops at the period boundary. Nothing is deleted; re-upgrading restores everything instantly — the data was always there.

### 3.7 The shopkeeper's data rights (stated once, binding on every G surface)

In **every** plan state including `readonly` and `suspended`: the owner can read everything, print everything, and **export everything** (the §9 backup export). G adds no mechanism by which the platform can withhold a shop's own data. This is written here because every later design (H's online store, any future sync service) inherits it.

---

## 4. Enforcement — three layers, each doing what only it can do

### 4.1 The layers

| Layer | Enforces | Why there |
|---|---|---|
| **Rules (v9)** | Plan-state posting gate (no posting creates in grace/readonly/suspended); invoice cap; user cap at invite-claim; counter integrity; membership access; platform-collection grants | The money truth must hold against *any* client — old builds, curious scripts, a shopkeeper's nephew with the web console. If it isn't in rules, it isn't enforced, it's suggested |
| **Client (web + Dart)** | Module surfaces hidden/locked by tier with the upgrade path shown; user-limit warning before invite; counter/pool displays; trial & grace banners; switcher | UX honesty: a shopkeeper should meet a locked module as a *labelled door* ("Standard میں شامل ہے") with the price and the renewal button — never as a rules error after typing a document |
| **Super admin** | Suspension, comp/extension, assignment corrections | Judgement calls stay human, logged in `businessEvents` |

The split's rule of thumb, inherited from A §3.3's honesty class: **rules gate what rules can see** (creates, counts, states derivable from docs + `request.time`); **clients gate what only clients can see** (whether a *surface* is offered). A tier's module set is enforced in rules **only where the module posts**: journal creates carry `refType`, so a journal create whose `refType` belongs to an above-tier module (production, payroll, loans, fiscal close — the Advanced set) is denied against the snapshot's `modulesTier`; operational collections of above-tier non-posting modules (`boms`, `productionOrders`, `jobs`, `employees`, `payrollRuns`, `loans`) get the same tier check on create. Surface-level gating for everything else stays client-side, stated as such — the design does not pretend a hidden button is a control, nor pay rules-read costs to police a button.

### 4.2 The invoice counter — rules-verified, because it rides the batch

The one genuinely new mechanism in G, stated precisely (the F §3.6 conversation, answered):

- `businessCounters/{bid}` holds `{ invoiceMonth: "YYYY-MM" (PKT), invoiceCount, memberCount }`.
- An **invoice event** is defined as: a `bills` create whose status at creation is not `held`, a held→posted transition on `bills` (rules see the diff), or a `sales` row create (the counter sale's record). Drafts and held bills never count (Q7's recommendation, adopted into the definition).
- The posting batch that carries an invoice event **must** also carry the counter write: same month ⇒ `invoiceCount + 1`; new month ⇒ `{ invoiceMonth: <new>, invoiceCount: 1 }`. The counter doc's own rule validates exactly that arithmetic against its prior state (create-or-increment-by-one, month roll, nothing else writable, no decreases except the month roll) — and the `bills`/`sales` create legs validate, via `getAfter()` on the counter doc, that the batch they are part of performed it. A client that "forgets" the counter fails its own bill. A client that inflates the counter only hurts itself. The count the cap checks and the count the admin sees (§2.3) are therefore the same count, **verified by construction**.
- The **cap check** itself: the invoice-event create legs deny when the derived plan state is not `trial`/`active`, and deny when `getAfter(counter).invoiceCount` would exceed the snapshot's `invoiceLimit` (or the trial pool in trial). Cap reached mid-month is a *posting refusal with a named reason* surfaced by the client (the rejected-write tray's cousin on web: the store's guard pre-checks the same derivation so the refusal is explained *before* the attempt, in the shopkeeper's language, with the renewal path attached).
- **Cost, stated:** each invoice event already rides a batch; the counter adds one write + up to two `get`s (business doc + counter) to rules evaluations on those legs. Firestore charges `get()` per request evaluation, not per rule — the design accepts this on posting legs only, and §11 R-G2 carries the scale note (at thousands of shops this is a Blaze-conversation input, not a G blocker).
- **Contention, stated:** all of a shop's tills increment one counter doc per invoice. Firestore's sustained ~1 write/sec/document guidance bounds a single business to ~3,600 invoices/hour — an order above the busiest target shop; §11 R-G3 records it with its shard escape hatch (per-till counter shards summed by derivation) parked for the shop that ever needs it.
- `memberCount` follows the same pattern in miniature: membership creates/deletes carry the counter write; the **user cap** is checked on the invite-claim leg against the snapshot's `usersLimit`.

### 4.3 Creation-time validation (a business cannot be born paying)

`businesses/{bid}` create is allowed only for the doc's own owner uid **with the trial shape**: `planId: trial`, `trialEndsAt` within a sane window of `request.time` (+14 days ± a day), limits equal to the trial tier's, `status: active`, `enforce: false` (the platform flips enforcement, §6.3). A client that tries to create itself an Advanced business fails rules validation; plan changes thereafter are admin-only field writes (the rule diffs the doc: owner-writable fields are the directory label fields — name/phone/city — and nothing else).

### 4.4 Demo mode — untouched, on purpose

Demo mode is a **build property** (no Firebase config ⇒ local store), and G's machinery is entirely production-side: there are no platform collections to write, no plan to derive, no counters to keep. Concretely: every G client check begins at the same seam that already splits the stores (`isProductionMode()`); in demo, the plan resolver returns a fixed `demo` state that gates nothing and **renders no plan UI** — the public demo must not sprout a fake "trial: 12 days left" banner for a shop that does not exist. The demo shop keeps every module open (it is the showroom for the top tier, and says so in its existing demo pill). A production build has no demo path at all — unchanged behaviour, re-stated because §6's rules must likewise never be *tested* against demo assumptions: the harness's rules suites run against production-shaped fixtures only, as today.

---

## 5. Flutter parity — the switcher travels; the console stays home

### 5.1 What the apps gain (F-parity increments, §8 G5)

- **Membership resolution + business switcher** in the header, identical semantics to §1.4 (the Dart store's namespace parameter becomes switchable; subscriptions re-attach per business; tray labels per business). Sign-in resolution order mirrors §1.3 exactly — the Dart port asserts the same truth table against shared fixtures (§8).
- **Plan-state surfaces:** the derived plan state (one pure Dart function, fixture-proven against the TS one) drives: the trial/grace/suspension banners, locked-module doors with the upgrade copy, counter/pool displays ("اس مہینے کے بل: 312 / 500"), and the renewal surface (payment instructions + submission — submission is a platform write the apps *can* make; confirmation is the console's).
- **Invite claim** on first sign-in (§1.3), so a staffer invited from the web can land in the app directly.

### 5.2 What stays web-only (named, with reasons)

- **The super admin console** — an operator surface used at a desk, holding platform-wide aggregates; putting it in a phone app adds an attack surface to every admin's pocket for a job nobody does from a till. (The owner's own *business* admin — plans, payments, members — is in the apps; the *platform* admin is not.)
- **Plan assignment, suspension, payment confirmation** — admin acts, console-only, for the same reason.
- **Catalogue/pricing** — code (§3.2), edited in neither client.

### 5.3 Generation discipline extends

`lib/plans.ts` (tiers, module sets, limits) joins the generated-data family (like the permission matrix, F §6.3): the Dart plan table is generated from the TS source and drift-gated in CI. Plan-state derivation is **code**, not data — ported by hand and proven by shared fixtures (the trial/grace boundary truth table is a fixture, §8), exactly the templates-vs-data line F drew.

### 5.4 i18n

All G strings — switcher, banners, locked doors, renewal flow, the whole admin console — are authored in the web dictionary first (EN/UR parity by construction), and the Dart dictionary regenerates from it. Admin-console strings are dictionary strings like any other; the console is UR-capable on the same toggle (the owner reads his platform in Urdu if he pleases). Expected growth: ~120–180 keys over the 2,581 baseline, counted at G1's checkpoint.

---

## 6. Rules v9 — additive blocks, two named amendments, staged enforcement

### 6.1 New blocks (pure additions)

Matches for `businesses`, `businessMembers` (+ the `invites` subcollection), `userMemberships`, `businessCounters`, `businessStats`, `platformAdmins`, `platformPayments`, `businessEvents`, and `platformConfig` (admin-written display data: payment instructions, support contact — read by any signed-in user, written by admins only). Each block encodes §1.2's writer/reader table; `businessEvents` is create-only for everyone including admins (an audit log an admin can edit is a diary, not a log).

### 6.2 The two amendments to pre-existing v8 text (called out, per the v4 precedent)

1. **`staffRole` / access resolution gains the membership leg:** `isStaffOf(uid)`'s successor checks `businessMembers/{uid}/members/{callerUid}` **before** the legacy `staffIndex` path, which is retained verbatim as the fallback leg. One function family amended; every collection leg below it is untouched, because they all already speak `hasRole`/`canAccess`.
2. **`canAccess` gains the suspension + plan-state awareness at the posting legs only:** rather than amending `canAccess` globally (which would tax *every* read with a businesses `get`), the plan-state denial is added **to the create legs that already carry the A5 backstop** (`journalCreateInOpenPeriod`'s call sites and the dated operational creates): a create must now pass *both* period-open **and** plan-postable. Reads are never plan-gated (invariant: §3.7's data rights) — the amendment's blast radius is exactly the posting creates, enumerated in the v9 header.

And the standing note, repeated so no future reader "fixes" it: `platformAdmins` appears in **no** tenant-namespace leg. There is no amendment granting the platform read of a shop. That absence is §2.3's doctrine made structural.

### 6.3 Staged enforcement (the rollout's safety valve)

Every `businesses` doc carries `enforce: false` at birth/migration. While false, v9's plan legs **observe and pass** (the clients still compute and *display* plan state — the shop sees its trial clock from day one — but rules refuse nothing on plan grounds). The platform flips `enforce` per business (admin act, logged) once that business's counters have been seen to track its postings through a settling window. This is the A-phase's flags-on-the-owner-doc rollout pattern (`phaseA`/`phaseC`/`phaseD`) promoted to the platform layer: **no shop's first day under G can be a day its bills bounce off a rule it has never met.**

### 6.4 Strip-proof and publication order

Publication follows the standing discipline: **rules first** (v9 published before any G client build ships), then clients. The G release audit (§9's checklist) strips §6.1's blocks and §6.2's amendments from v9 and diffs the remainder against v8 — byte-identical or the release stops. Old clients against v9: fully functional (the membership leg is an OR; counters absent ⇒ §4.2's legs treat a missing counter doc as pre-G and pass during the business's `enforce: false` window — a business with no registry doc at all is a pre-G shop and v9 must treat it exactly as v8 did; this sentence is a rules-test case in §8, not a hope).

---

## 7. Migration story — metadata appears; data does not move

### 7.1 The claim, in one paragraph

For every existing shop, G migration writes **zero** documents inside `users/{uid}`, **zero** journal entries, and changes **zero** bytes of shop data. It creates top-level platform docs only: a `businesses` registry doc, membership mirrors of the existing staff list, a zeroed counter doc, and `businessEvents` entries recording that it happened. The harness proves the claim on the fixture shop by re-asserting the frozen seed SHA after migration (§8). Tenancy is metadata; the migration is the proof.

### 7.2 Lazy, client-driven, owner-first

No batch job exists to run (there is no server); migration happens **lazily, on first G-client contact**, in this order:

1. **Owner's first G sign-in:** the client finds no `businesses/{ownUid}` and creates it — plan: **`founding`** (a comp assignment: Advanced's module set and limits, no expiry — §7.3), status active, `enforce: false`; creates membership docs mirroring the owner doc's `staff[]` (the `staffEmails` fallback for pre-A3 shops), initialises `businessCounters` (counts derived from the live collections *once*, labelled `baseline: migration` in the creation event — the one approximate number in G, and it is labelled approximate where it is born), and logs `business.migrated`.
2. **Each staffer's first G sign-in:** resolution succeeds via the legacy `staffIndex` leg (§1.3's order); the *owner's* client (on its next staff-screen visit) backfills that staffer's membership doc from the mirror, and the staffer's own client adds their switcher-index entry. Until backfilled, the legacy leg carries them — **nobody's access depends on the backfill having happened.**
3. **New businesses after G:** born directly in the G shape (trial registry doc at signup, §4.3) — no migration involved.

### 7.3 Founding shops are never degraded

Every business that exists before G ships is assigned `founding` — not trial, not a paid tier with a clock. Rationale, stated plainly: those shops (the owner's own first of all) adopted the product before it had prices; a migration that woke a live shop up inside a 14-day trial would be a betrayal of exactly the customers the SaaS exists to keep. The platform owner may move a founding business to a real plan from the console at any time (a logged assignment like any other) — as a *commercial* act, in the open, never as a migration side-effect.

### 7.4 Rollback

Republishing v8 restores pre-G behaviour exactly: the platform docs become inert (v8's catch-all denies client access to them; they sit harmlessly), shops trade as before, membership resolution falls back to `staffIndex` alone (which was never deleted). G clients degrade to single-shop behaviour against v8 (their platform calls fail closed; the shop surfaces work). No shop data was created or altered inside any namespace, so there is nothing to un-migrate. Rollback is a rules republish and nothing else — by design, the same one-move rollback A–E enjoyed.

---

## 8. Increment plan — G1…G6

Order is dependency-driven: tenancy before enforcement, enforcement before the console that wields it, the console before the renewal flow that queues into it, apps after the web has proven the model, backup + audit last (the phase gate).

### G1 — Tenancy foundation (registry, membership, switcher — web)
- `businesses` / `businessMembers` / `businessInvites` / `userMemberships` blocks in rules v9 (published first, §6.4); the §6.2 amendment #1 (membership leg); **no plan gating yet** (`enforce` does not exist as a rules input in G1's rules — §6.2 amendment #2 lands with G2).
- Web: registry creation + lazy migration (§7.2), invite→claim flow, the header business switcher, staff screen writing membership + mirror.
- **Checkpoint:** harness gains the tenancy suites — resolver truth table (owner / member roles / legacy fallback / removed member / cross-business isolation: a member of A reading B fails), migration identity (**seed SHA `e17e5bda…1168` re-asserted after a full §7.2 migration on the fixture shop; users-tree diff == ∅**), switcher subscription teardown (no cross-business listener survives a switch — the store suite asserts it). All 1,389 prior checks green, unpinned. i18n count grows, parity exact.

### G2 — Plans, counters, enforcement
- `lib/plans.ts` catalogue + assignment snapshot; derived plan-state function (TS) with its boundary truth-table fixture (trial end, period end, grace day 30/31, suspension over all).
- Rules: §6.2 amendment #2 (plan-postable on the A5 legs), §4.2's counter pairing + cap legs, §4.3 creation validation, tier checks on the Advanced posting refTypes/collections. `enforce` honoured (§6.3).
- Client: module gating + locked doors, banners, counter displays, the store guard's pre-check so refusals are explained before they are attempted.
- **Checkpoint:** counter-integrity suite (a bill batch without its counter write fails rules fixtures; month roll; cap boundary at limit and limit+1; held bills never count; a grace-state posting fails, a grace-state *export* succeeds); strip-proof (v9 − G ≡ v8); harness fully green; **no live business has `enforce: true` at G2's close** — enforcement flips are G3-console acts per business after observation.

### G3 — Super admin console (web-only)
- `/platform` surface (§2.2): directory, business detail, assignment, suspend/activate, aggregates, admin management; bootstrap checklist act (first `platformAdmins` doc) documented for the owner.
- **Checkpoint:** privacy suite — an admin client's reads into a tenant namespace are **denied in rules fixtures for every collection** (the §2.3 doctrine as a test, not a paragraph); console aggregates reconcile by hand against fixture businesses; every console act leaves its `businessEvents` entry (suite asserts no silent acts).

### G4 — Renewal flow + trial lifecycle surfaces
- Owner-side renewal surface (catalogue prices, payment instructions from `platformConfig`, submission), admin confirmation queue (§3.5's batch: payment state + period extension + snapshot refresh + event, atomically), trial banner/escalation copy, suspension banner + remedy path.
- **Checkpoint:** lifecycle walk in fixtures: trial → grace → payment submitted → confirmed → active, with the journal of the fixture shop untouched at every step (SHA spot-asserts) and the *platform* records complete; a rejected payment leaves the business in grace with the note visible.

### G5 — Flutter parity
- Dart: membership resolution + switcher, plan-state port + fixtures (shared truth table with G2's), plan surfaces, invite claim, renewal submission. Generated plan table drift-gated (§5.3).
- **Checkpoint:** Dart suite grows past 213 with the resolver/plan fixtures green; cross-client leg — a staffer switched between two businesses on Android trades in both, and the web sees both journals agree to the rupee (the F §7.5 pattern); F5's owner-gated items remain exactly as gated as F5 left them.

### G6 — Backup & restore + phase-end audit
- §9's export/restore; the phase-end finance-integrity audit (below) executed and recorded as `PHASE-G-RELEASE-AUDIT.md`; distinct-zip delivery in the house pattern.

### Phase-end finance-integrity audit checklist (Phase G close — all must pass)
- [ ] Frozen seed identities re-asserted (21 · 272,805 · 50,000 · 27,900 · 5,500 · TB 0 · SHA `e17e5bda…1168`) — after G migration, on the fixture shop.
- [ ] Users-tree purity: the G suites prove no G flow (migration, assignment, suspension, renewal, restore) writes inside `users/{uid}` except the shop's own ordinary trading writes.
- [ ] Rules strip-proof: v9 minus G material ≡ v8, byte-for-byte.
- [ ] Counter reconciliation: fixture businesses' `invoiceCount` == independent count of their invoice events, at every suite checkpoint; memberCount == membership docs.
- [ ] Privacy suite: platform grant reads zero tenant collections (G3's suite, re-run at close).
- [ ] Plan-state truth table identical in TS, Dart and rules fixtures at every boundary instant (trial end, period end, grace ±1 day, suspension overlay).
- [ ] i18n parity at the new key count; no hardcoded strings on G surfaces (either language, either client).
- [ ] Demo build untouched: demo opens with no plan UI, all modules, zero platform writes attempted.

---

## 9. Backup & restore (the roadmap's fourth G item)

- **Export:** owner-only Settings action producing a single JSON of the whole business (every collection incl. the journal, plus the owner doc) — the extension of the existing export discipline to the full namespace, available in **every** plan state (§3.7). The file is the shopkeeper's property; the client assembles it from his own reads, so no platform access is involved or needed.
- **Restore:** into a **new, empty business only** (a fresh namespace the same owner creates). Restore writes the exported docs with their original ids — including journal entries as documents, which is a *transplant into an empty book*, not a posting into a live one: the target must verify empty (journal count 0 via its counter/stats absence + a client-side collection probe) before the first write, the restore runs as the owner's client in resumable batches, and a `businessEvents` entry (`restore.performed`, citing the source business + export date) records it. **Restore over a live business is refused by design** — append-only means the live book is never overwritten; a shop that wants its old book back trades in the restored business and archives the other. (Rules support: restore needs nothing new — the target namespace is the owner's own; the emptiness check is client-side honesty backed by the fact that only the owner can write there at all.)
- Format versioning: the export carries `formatVersion` + the source app/phase versions, so a future phase can refuse or convert an incompatible file rather than corrupt a namespace (the seed-migration flags' lesson, applied to files).

---

## 10. What Phase G deliberately does NOT do

- **No server, no Blaze, no payment gateway** (invariant 2, §3.5) — including no automated dunning emails/SMS: expiry communication is the in-app banner + the owner's own WhatsApp, the channel his market actually reads.
- **No data re-homing, no per-business projects, no namespace move of any kind** (§1.1).
- **No ownership transfer or co-ownership** — one business, one owner account (Q6 parks the partnership case; membership roles already cover every *working* arrangement short of legal co-ownership).
- **No platform read of shop books — for any reason, including support and analytics** (§2.3). Product analytics beyond §2.3's counters would be a new design with the owner's explicit decision, not a G footnote.
- **No white-label / reseller tier, no affiliate bookkeeping** — Enterprise is a pricing tier, not a channel programme.
- **No change to F5's owner-gated items** — CI wiring, the device acceptance script, keystore/Play decisions remain exactly where F5 left them; G neither needs nor touches them.
- **No iOS** (F §12.3's position stands).

---

## 11. Risk list

| # | Risk | Severity | Mitigation in this design |
|---|---|---|---|
| R-G1 | `getAfter()` counter pairing behaves differently in batches vs the rules fixtures' model (a platform subtlety discovered late) | High | G2's checkpoint is rules-fixture-first: the pairing is proven in the harness's rules suite **before** any client depends on it and before any `enforce` flip; if the pattern fails, the fallback is named now — counter becomes client-maintained + admin-audited (weaker, §2.3's "hard" label drops to soft honestly) and the cap moves to client + console enforcement |
| R-G2 | Rules `get()` costs grow (business doc on posting legs, membership on access) | Medium | Gets added only to create/access legs that already pay for `staffIndex`/owner-doc gets; reads of shop data are never plan-gated; scale signal (rules-read volume) is a stated input to the owner's Blaze decision, which the roadmap already parks on usage numbers |
| R-G3 | Counter-doc write contention in an exceptionally busy shop | Low | §4.2's arithmetic (~3,600 invoices/hr ceiling vs the target shops' reality); per-till shards + derived sum is the named escape hatch if a shop ever approaches it |
| R-G4 | Membership/staffIndex divergence during the transition (a staffer removed from the mirror but not the membership, or vice versa) | Medium | One write path: the staff screen writes both in one batch (§1.3); resolution order prefers membership, and the G1 suite includes the divergence cases (removed-in-one-place ⇒ access outcome is the *stricter* of the two, by ordering the checks so a deletion anywhere cuts access — an explicit suite case, not an assumption) |
| R-G5 | Trial farming (one person, many emails, serial free businesses) | Medium | Accepted for v1 (Q8): trials are pool-capped and short; `businessEvents` makes farms visible in the directory (same owner name/phone patterns); identity verification is a sales-policy decision, not an engineering gate G pretends to have |
| R-G6 | A suspended/grace shop's *staff* keep trading from an old client build that never heard of plans | Medium | Enforcement lives in rules (§4.1) precisely so client vintage doesn't matter; old clients fail their postings with rules denials (visible in the F tray on apps) — unpleasant, correct, and the upgrade path is the banner on every current client |
| R-G7 | The owner-as-admin confusion: the platform owner is also a shopkeeper in the same product | Low | The console is badged and separated (§2.1); his shops are businesses like any other (one is `founding`, one is his platform-books business, §3.5); the privacy suite (G3) tests *his own admin grant* against *a tenant he doesn't own* |
| R-G8 | Prices/limits set wrong at launch (too tight ⇒ shops bounce; too loose ⇒ no upgrade pressure) | Medium | Every figure is an owner-to-confirm default (Q1) in a snapshot — correctable per business from the console without a release, and correctable platform-wide for *new* assignments by a catalogue release |

---

## 12. Decisions by precedent vs open questions; what Phase G does NOT do

### 12.1 Settled by precedent (no owner input needed — recorded so they are not re-litigated)

- **Tenancy is metadata outside the namespace** — the journal-free migration doctrine (§1.1, §7) is A §6's entry-free migration pattern at platform scale.
- **Plan state is derived, never stored** — the fulfilment/stock derivation doctrine (B/C), applied to billing (invariant 3).
- **Limits ride a snapshot taken at assignment** — Phase D's payroll-terms snapshot doctrine (§3.2).
- **Expiry = read-only grace, never a hostage cliff** (§3.6) — the MC dealing standard, and §3.7's data rights follow from it.
- **Platform revenue is platform paperwork + the owner's own ordinary books** — never a tenant journal event (invariant 6).
- **The super admin holds no shop keys** (§2.3) — the same separation-of-duties instinct as D's directory/payroll split (G-D3), at platform scale.
- **Rules published first, additive, strip-provable** (§6) — the v3→v8 discipline, unchanged.
- **Demo is a showroom, not a tenant** (§4.4).

### 12.2 Open questions (owner's call genuinely needed — recommendations given; every price is owner-to-confirm)

- **Q1 — Prices and limits.** The §3.1 table anchors figures to the owner's MC-MMS price points (1,500 / 2,500 / 4,000) and proposes user/invoice limits per tier + annual = 10 × monthly. *Recommendation: adopt the structure and the MC-MMS anchors for launch; tune limits after the first ten paying shops show real usage (the counters exist precisely to make that a data decision).* Dukaan's final prices are the owner's to set — nothing in G1–G4 hard-codes a rupee figure outside the catalogue constant, so his number can land at any point before G4.
- **Q2 — Trial shape.** 14 days (MC-MMS precedent), Standard modules, 200-invoice pool, 2 users. *Recommendation: keep* — long enough to run two full weeks of a real shop, capped enough that a trial cannot quietly *be* the business's free ERP.
- **Q3 — Grace length.** 30 days proposed (§3.6). *Recommendation: keep 30* — it covers a shopkeeper's monthly cash cycle, the rhythm his own customers pay him on.
- **Q4 — Who else holds platform admin?** *Recommendation: owner only at launch.* A second admin is one console act (§2.1) the day a support hand is actually hired; granting it earlier is privilege without a person.
- **Q5 — Renewal rails.** Manual Raast/bank + admin confirmation in v1 (§3.5); JazzCash/Easypaisa gateway post-G on the Blaze decision. *Recommendation: launch manual* — the owner's first shops are known businesses he already talks to; gateway polish should follow volume, not precede it.
- **Q6 — Co-ownership / transfer.** Two brothers legally owning one shop is a real Pakistani business shape. *Recommendation: defer past G.* Membership already lets both *work* the shop fully (one as owner, one as manager); what defers is only the legal-title transfer — a rare, deliberate act the owner can service manually (console-assisted namespace… no — honestly: manually, as an exception, if it ever arises) until a pattern is worth designing.
- **Q7 — Do held/draft bills count against the invoice cap?** *Recommendation: no — only posted invoices and counter sales count* (adopted into §4.2's definition). Drafts are paper; charging quota for paper breeds resentment and teaches users to avoid the quotation/draft flows the product wants them to use.
- **Q8 — Businesses per person.** A person may *own* several businesses (each on its own plan — the multi-shop owner is a customer to serve, not abuse to block). Trial farming (R-G5) is policed by visibility, not caps. *Recommendation: no cap on paid businesses; trials limited by the one-trial-per-business construction + directory visibility.*
- **Q9 — Is the invoice cap even the right meter?** Alternatives: revenue-based (impossible — the platform may not see revenue, §2.3) or document-total-based (counts paper, Q7's objection). *Recommendation: keep invoices* — it is the one meter that is countable without seeing the books, and it tracks the platform's own cost driver (writes) honestly.

### 12.3 What Phase G does NOT do

Restated from §10 for the checklist reader: no server/Blaze/gateway; no namespace move; no co-ownership; no platform read of shop books for any reason; no reseller programme; no change to F5's owner-gated items; no iOS. And one more, for completeness: **Phase G does not launch the SaaS commercially** — it builds the layer. Pricing announcements, onboarding the first external shops, and the owner's support arrangements are business acts that follow G6, on his word.
