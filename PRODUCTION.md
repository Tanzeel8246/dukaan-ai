# Dukaan AI — Production Guide

This project now has two modes. **Demo mode** is what the public
subdomain runs today; **production mode** turns on real accounts, private
per-shop cloud data and the Gemini-powered assistant.

| | Demo mode | Production mode |
|---|---|---|
| Trigger | No `NEXT_PUBLIC_FIREBASE_*` env values | Real Firebase config present |
| Login | None — open demo | Email/password required (Firebase Auth) |
| Data | Bundled seed + browser localStorage | Firestore under `users/{uid}/products` + `users/{uid}/sales` |
| Assistant | On-device intent engine | Gemini via `/api/chat` first, intent engine as fallback |
| UI signal | "Demo mode" badge in the navbar | Account email + Logout in the navbar |

A brand-new account is **seeded automatically** on first login with the
demo catalogue + sales history inside its own namespace, so the shop
never opens empty. Each shopkeeper only ever sees their own data — the
Firestore rules (`firebase/firestore.rules`) enforce it server-side.

---

## Owner checklist — go live

### 1. Create the Firebase project
1. Go to <https://console.firebase.google.com> → **Add project** (e.g. `dukaan-ai`).
2. **Build → Authentication → Sign-in method** → enable **Email/Password**.
3. **Build → Firestore Database** → **Create database** (start in production mode; the rules in step 3 replace the defaults).

### 2. Register the web app + copy the config
1. Project settings → **Your apps** → Web (`</>`) → register the app.
2. Copy `web/.env.local.example` to `web/.env.local` and paste the config
   values (`NEXT_PUBLIC_FIREBASE_API_KEY`, `…_AUTH_DOMAIN`,
   `…_PROJECT_ID`, `…_STORAGE_BUCKET`, `…_MESSAGING_SENDER_ID`, `…_APP_ID`).

### 3. Deploy the security rules
From this folder (with the Firebase CLI installed and `firebase login` done):

```bash
firebase deploy --only firestore:rules
```

`firebase.json` already points at `firebase/firestore.rules`. (Or paste
that file into Console → Firestore → Rules.) The rules deny everything
except a signed-in user's own `users/{uid}` subtree; sales are
append-only. **Do not** import `firebase/seed.json` into top-level
collections — the old shared-data import is obsolete; accounts seed
themselves per user.

### 4. Get the Gemini key (assistant upgrade)
1. <https://aistudio.google.com/apikey> → create a key (free tier is fine).
2. Set it as **`GEMINI_API_KEY`** — server-side only, never `NEXT_PUBLIC_*`.

### 5. Deploy the production web app (Vercel)
1. Import this repo in Vercel with **Root Directory = `web`**.
2. Environment variables: all six `NEXT_PUBLIC_FIREBASE_*` values from
   step 2, plus `GEMINI_API_KEY` from step 4.
3. Deploy. `npm run build` produces the server build (the `/api/chat`
   route only exists in this build).

### 6. Keep the static demo (optional)
The portfolio demo on the subdomain can stay exactly as it is:

```bash
cd web && npm run build:static   # refreshes ../web-deploy
```

Upload the **contents** of `web-deploy/` to the subdomain docroot. No
env vars needed — it runs in demo mode with the badge, on the intent
engine.

### 7. Flutter app (Android/iOS)
1. In the same Firebase project, register an Android app (and iOS if
   needed) and download `google-services.json` (→ `flutter-app/android/app/`)
   / `GoogleService-Info.plist` (→ `flutter-app/ios/Runner/`).
   If the `android/` or `ios/` folders are absent, run
   `flutter create .` inside `flutter-app/` once to generate them.
2. `flutter pub get` — `firebase_auth` is already in `pubspec.yaml`.
3. Build as before (Codemagic / GitHub Actions configs included).
   Without the config files the app stays in offline demo mode; with
   them, sign-in is required and sync writes to `users/{uid}/…` — the
   same accounts and data as the web app.

## Security notes
- Never commit real credentials; `.env.local` stays local / in Vercel env.
- The Gemini key is read **only** by the server route. The browser calls
  `/api/chat`; if the key is missing the route returns 503 and the
  assistant silently uses the on-device engine.
- Rotate any key that was ever pasted into chat or a public repo.

---

# Complete edition (v2) — full shop-management system

The app is now a complete shop-management system. After this upgrade,
**re-publish the Firestore rules** (`firebase/firestore.rules` →
Console → Firestore → Rules → Publish, or `firebase deploy --only
firestore:rules`) — the new collections and the staff-access helper are
denied by the old rules.

## Modules

| Route | What it does |
|---|---|
| `/` Dashboard | KPIs incl. month net profit (journal), expiring count, udhaar outstanding, supplier payable |
| `/sales` | Quick counter sale (unchanged, now journal-posted) |
| `/billing` | Full POS desk: SKU/barcode entry, cart, discount, split payments (cash / JazzCash / Easypaisa / bank / part-udhaar), hold & resume bills, returns, void, printable receipts (standard + 80mm thermal), WhatsApp bill sharing |
| `/inventory` | Products with categories, units (pcs/kg/litre/dozen/packet/bag, fractional qty), expiry dates + expiring ≤30d view, stock adjustments with reasons + log, dead-stock view (60d), stock valuation, CSV import/export |
| `/forecast` | Demand forecast + reorder plan (unchanged) |
| `/suppliers` | Supplier directory, purchase entry (stock-in at cost), payments, per-supplier payable balances |
| `/customers` | Customer directory; profile = purchase history + udhaar balance |
| `/credit` | Udhaar khata: per-customer ledger, repayments, total outstanding |
| `/expenses` | Expense register (rent/electricity/salary/transport/other) with income-vs-expense summary |
| `/finance` | Cash book (journal-derived, running balance), monthly Profit & Loss, receivables/payables aging (0–30 / 31–60 / 60+), manual cash in/out (capital/drawings), CSV exports |
| `/day-close` | Opening cash, auto totals (sales by method, expenses, udhaar in/out), expected vs counted cash, saved closes history |
| `/assistant` | Bilingual AI — now also answers expenses, month net, supplier balances, udhaar outstanding |
| `/settings` | Shop profile (name/address/phone — printed on receipts), staff invitations, EN/اردو language toggle (also in the navbar) |

## The double-entry journal

All finance runs on a proper **double-entry journal**: the Firestore
subcollection `users/{uid}/journal` holds ONE document per financial
transaction whose lines always balance (Σdebit == Σcredit). Because a
transaction is a single document, its write is atomic — a sale can
never half-post. Every money event posts an entry **in the same write
batch** as its operational records (sale rows, stock moves, bills):

| Event | Debit | Credit |
|---|---|---|
| Sale / bill | Cash·Wallet·Receivables (per payment part), Sales discount, COGS | Sales revenue, Inventory |
| Purchase | Purchases + Inventory | Purchases (clearing), Supplier payables |
| Supplier payment | Supplier payables | Cash / Wallet |
| Expense | Expense — rent/electricity/salary/transport/other | Cash / Wallet |
| Udhaar given (standalone) | Customer receivables | Cash — it is a cash loan |
| Udhaar repayment | Cash / Wallet | Customer receivables |
| Return / void | Sales revenue, Inventory | Discount, Receivables (udhaar part), Cash (refund), COGS |
| Stock damage/expiry/theft | Inventory loss (at cost) | Inventory |
| Cash book in / out | Cash / Owner drawings | Owner capital / Cash |

Chart of accounts: `cash`, `wallet` (Bank/JazzCash/Easypaisa),
`sales_revenue`, `sales_discount`, `cogs`, `inventory`, `purchases`,
`expense_rent`, `expense_electricity`, `expense_salary`,
`expense_transport`, `expense_other`, `receivables` (subledger:
`credits`), `payables` (subledger: `suppliers`), `capital`, `drawings`,
`inventory_loss`.

**Append-only discipline:** journal entries (and sales rows) are NEVER
edited or deleted from the client — the rules enforce create+read only.
Corrections are **reversing entries** that reference the original
(`reversesId`): e.g. editing an expense posts a reversal of the old
entry plus the corrected entry; a bill void posts a full mirror entry.
All reports (P&L, cash book, aging, day close) are **derived** from the
journal + subledgers — there are no separate mutable totals that could
drift. Purchases use the perpetual method: goods clear through the
Purchases account into Inventory in the same entry, and COGS is taken
from per-sale cost snapshots.

**Balance is enforced, not assumed:** the single entry constructor
(`makeEntry`) refuses to build an entry whose lines do not balance
(Σdebit == Σcredit), so no posting path — including the ±Rs 1 rounding
the bill desk tolerates on fractional bills, which is booked
explicitly to Sales discount inside the same entry — can ever write
an unbalanced document into the append-only journal.

**Standalone udhaar is a cash loan, never revenue.** Giving udhaar
from the Credit screen posts Dr Receivables / Cr Cash (money out of
the till). It records no sale, no COGS and no stock movement. Goods
sold on credit go through **Billing** with an udhaar payment part —
the bill entry debits Receivables alongside Cash/Wallet for the other
parts, and posts revenue + COGS in the same document.

**Inventory only moves through the ledger.** Editing a product's
stock quantity posts a stock adjustment (reason "correction") at the
old cost; editing its cost price posts a **revaluation** entry for the
quantity on hand (Dr/Cr Inventory against **Owner Capital** —
repricing is an owner's decision, so the owner's equity absorbs the
difference and future COGS at the new cost keeps Inventory equal to
the shelf). New products and CSV imports bring their opening stock in
as Dr Inventory / Cr Owner Capital. A product with stock on hand or
sales history cannot be deleted.

Worked example — a Rs 2,600 oil sale paid in cash (cost Rs 2,450):
`Dr Cash 2,600 · Dr COGS 2,450 / Cr Sales revenue 2,600 · Cr Inventory 2,450`.
Worked example — a Rs 47,900 restock from Malik Traders on credit:
`Dr Purchases 47,900 · Dr Inventory 47,900 / Cr Purchases 47,900 · Cr Payables (Malik Traders) 47,900`.

Seed history predates the journal, so first-login seeding writes ONE
aggregated journal entry per historical sales day plus one per seeded
purchase/payment/expense/credit event — and then ONE **go-live
opening entry** that trues the balance sheet up to the physical
position: Inventory becomes exactly the shelf value at cost, Cash
becomes the stated opening till, and Owner Capital absorbs the
difference (stock brought in, less pre-system takings already drawn).
After seeding, the journal's Inventory equals the shelf and the
trial balance is zero.

Accounts created before this edition are topped up automatically on
first sign-in (`seedV2` flag): only the new collections are seeded —
live products/sales are never touched — and the journal receives a
single documented **go-live opening balance**: Dr Inventory at the
current shelf value, Dr Receivables / Cr Payables taken from the
subledgers, and the balancing figure to Owner Capital. No historical
sales are summarised into the journal (valuing them at today's costs
would misstate historical COGS); pre-migration history stays in the
sales rows where it belongs. Cash is deliberately not opened by the
migration — the owner records the real till as a cash-book entry, so
the cash book starts from truth.

## Staff access (no data migration)

The `users/{uid}/…` model is unchanged. The owner manages a staff email
list in **Settings** (stored as `staffEmails` on the owner doc). Adding
an email also writes `staffIndex/{email} → { ownerUid }`. When a staff
member signs in with that exact email, the app resolves the index and
opens the **owner's** namespace; the security rules mirror this with an
`isStaffOf(uid)` helper (index lookup + the email still being present
in `staffEmails`). Staff get full read/write on business collections —
settings, staff management and the owner doc stay owner-only. Removing
an email in Settings deletes the index doc and cuts access immediately.
Demo mode is unaffected (no accounts at all).

## Offline

Firestore runs with IndexedDB offline persistence (multi-tab safe) with
a graceful in-memory fallback: the counter keeps selling without
internet and syncs when the connection returns.

## Language

The navbar carries an EN / اردو toggle (persisted in localStorage)
covering navigation, page titles and primary actions; Urdu mode flips
the chrome to RTL. Business data is never translated.


## Phase A progress (ERP expansion — see ERP-PHASE-A-DESIGN.md)

### A1 — COA v2 registry + Phase A types (landed)

- `lib/coa.ts`: the chart-of-accounts registry — 27 codes (the 17 v1
  codes frozen, +10 Phase-A: `tax_payable`, `tax_input`,
  `cheques_in_hand`, `cheques_issued`, `salary_payable`,
  `loans_payable`, `expense_finance`, `inventory_raw`, `wip`,
  `retained_earnings`) each with type + normal-balance side.
  `accountNormalBalance()` reads the registry; all existing selectors
  keep their v1 sign conventions (append-only change).
- `lib/types.ts`: `MoneyAccount`, `TaxSlab`, `Period`, `StaffMember`
  types + Phase-A optional fields on `ShopSettings`
  (`accounts`, `taxSlabs`, `periods`, `phaseA` flags). No behaviour
  change.

### A2 — Money accounts (landed)

**Model.** A `MoneyAccount` is a named real-world money place of kind
`cash` / `wallet` / `bank`; kinds map onto the two GL buckets (cash →
`cash`; wallet & bank → `wallet`). Journal lines carry the account id
in `line.ref` (`null`/absent = pre-A2 history). A line resolves to an
account by exact ref, or — when unref'd — to the account carrying
`legacyFor` for that GL bucket. **Invariant (kept and harness-proved):
Σ per-account balances per bucket == the GL total, exactly**, before
and after refs start appearing — so no figure changed by this
increment.

**Migration (§6.6).** `ensureAccounts` runs once per owner namespace
behind the flag `phaseA.accountsV1` (owner-only; idempotent; retried
on later sign-ins if interrupted). It creates FIVE accounts with fixed
ids: **Main Till** (`acc-till`, cash, method cash, `legacyFor: "cash"`),
**Wallet & Bank** (`acc-wallet-legacy`, wallet, method none,
`legacyFor: "wallet"`), **JazzCash** (`acc-jazzcash`), **Easypaisa**
(`acc-easypaisa`), **Bank Account** (`acc-bank`). The migration writes
**zero journal entries** — verified: seed journal stays at 21 entries;
GL cash 50,000, Inventory 272,805, payables 27,900, receivables 5,500
and trial balance 0 are unchanged; Main Till == GL cash; Wallet & Bank
== GL wallet (−45,000 on seed data — the seed's bank history).

**Posting integration.** Every money-moving posting path now stamps
the resolved account id on the record (`accountId`) and on the money
journal line (`ref`): bill payments incl. splits and the overpay
tolerance line, void/refund cash legs (per original payment's
account), stock-in returns (chosen refund account), counter-sale
till, supplier payments, purchase direct-pays and return credits,
expense create/edit/delete (reversals copy the original line refs;
an account change re-resolves and the edit moves the balance),
customer credit give/repay (the "give" leg is the cash-loan semantics
of F-7, stamped to the till), the standalone cash loan, manual cash
entries (posted against a chosen account), capital/drawings,
day-close opening seed, and transfers. Each desk (billing payment
rows + refund picker, expense form, supplier payment, credit
repayment, finance cash-entry form) shows an **account picker** that
appears when more than one live account can hold the method and
defaults to the method's default account.

**Account actions.** Settings → *Money accounts*: live (journal-
derived) balances, add (name/kind/method), inline rename, archive
(never delete; R-3 — `legacyFor` accounts can NEVER be archived nor
lose their method mapping), per-method default selects (assigning a
method moves its default off the previous holder atomically).
**Transfer** = ONE balanced journal entry (Dr target / Cr source,
account ids in both line refs, `refType: "transfer"`) + a cash-book
row, in a single write batch; GL totals unchanged, per-account
balances move. Cash-basis readers derive per account: finance KPIs
and the per-account balances strip (Finance view), the dashboard
cash KPI, and the **day close** — which now closes the till account
and records its JOURNAL-derived expectation (opening = the account's
pre-today journal balance; expected = + today's journal movement ==
its full journal balance), with the operational counter summary kept
on screen as the cross-check. `DayClose` records carry `accountId`.

**Rules.** One additive block for the `accounts` collection (read:
owner/staff via `canAccess`; create/update: owner; no delete) — all
pre-existing blocks byte-identical.

**Verification.** tsc 0; `npm run build` + `npm run build:static`
exit 0; harness **60/60** (the 44 A1/remediation checks + 16 A2:
migration identities, split-bill per-account landing, transfer
semantics incl. wallet→wallet, day-close expectation == journal
balance); i18n dictionary now **982 keys**, EN ≡ UR (52 new A2 keys).

**Known notes.** (1) The finance cash-book TABLE still renders the
GL-level book; the per-account `accountBook` selector exists and is
harness-verified (B4) for when a per-account statement view is
wanted. (2) The standalone-udhaar "give money" form has no account
picker — the store stamps the till by design (F-7 cash-loan
semantics); its journal lines are correctly ref'd. (3) Demo mode:
accounts are seeded alongside the demo journal; the local storage
key was bumped to v3 so stale demo caches self-heal.

### A3 — RBAC: staff roles + permission matrix (landed)

What shipped:
- **Authoritative permission module** (`web/lib/permissions.ts`): the
  design §3.2 matrix as data — all 40 module rows × 4 roles (the 26
  rows whose surfaces exist today plus the 14 Phase B–D rows
  pre-declared) — with `accessOf` / `can(role, module, "view"|"write")`
  / `canBrowseJournal` helpers. Every UI gate and store guard reads
  this module; nothing hardcodes role checks elsewhere.
- **Roles**: owner | manager | cashier | accountant, resolved in
  AuthProvider from the `staffIndex/{email}` doc's `role` field. A
  missing/invalid role resolves to **manager** — the legacy profile —
  in the client (`resolveStaffRole`), in the migration backfill, and
  in the rules (`staffRole()` uses `.get('role', 'manager')`).
- **Data**: the owner doc gains `staff[]` (`{email, role, addedAt}`);
  `staffIndex/{email}` docs gain `role`; `staffEmails` remains as the
  mirror every write maintains (old clients and rules keep working).
  Settings → Staff: add with a role picker, change a role inline,
  remove (removal still cuts access instantly via staffIndex).
- **Migration** behind `phaseA.rbacV1` (owner sign-in, idempotent):
  backfills `staff[]` + index roles from the existing `staffEmails`
  with role **manager** — precedence: an existing `staff[]` role wins,
  then a valid index role, then manager. Pure function
  (`backfillStaff` in lib/permissions.ts), zero journal writes.
- **UI wiring per matrix**: sidebar items hidden per role; accountant
  gets no selling surfaces (counter/billing/returns show the
  access-restricted notice) and read-only suppliers/customers/
  inventory/day-close-history; cashier loses finance, forecast,
  suppliers, expenses and all cost-price visibility (columns, cards,
  CSV export); void is owner/manager; standalone-udhaar giving is
  owner/manager while repayments stay open to all roles; money-account
  management stays owner-only (the whole accounts section is hidden
  from cashiers, read-only for manager/accountant); Settings' profile
  and staff sections are owner-only by construction.
- **Store-layer guards** (defence in depth): every mutating store
  function checks `can(role, module, "write")` against the live role
  before acting — inventory writes, sales, billing, returns, void,
  supplier management/payments, customer writes, credit give/repay,
  expenses, cash entries, transfers, stock adjustments, day close,
  money-account management, shop-profile updates and demo reset are
  all gated; `updateSettings` also strips `staff`/`staffEmails` from
  generic patches so roles can only change through the staff flows.
- **Rules v3** (`firebase/firestore.rules`): `staffRole()` /
  `hasRole()` helpers + per-collection write gates per §3.3 —
  products/adjustments/purchases/suppliers writes owner+manager
  (with ONE refinement, below), expenses/supplierPayments/cashEntries
  +accountant, bills/sales/returns/day-close creates +cashier,
  customers +cashier, accounts/taxSlabs/periods writes owner-only,
  journal **read** restricted to owner/manager/accountant (create
  stays open to all roles — every desk posts entries), sales/journal
  append-only immutability unchanged, staffIndex + owner-doc blocks
  unchanged. One deliberate refinement of the design's blanket
  `products` gate: a cashier's bill batch atomically decrements
  `stockQty` on product docs in the same write as the bill/sales/
  journal, so a **stockQty-only update** is allowed for the selling
  roles; every other product field still requires owner/manager.
  Without this, cashier selling would be impossible under v3.
- **R-2 proven**: today's legacy staff capability set was enumerated
  from the pre-A3 rules + UI into `LEGACY_STAFF_ACCESS`, and the
  harness asserts `accessOf("manager", m) === LEGACY_STAFF_ACCESS[m]`
  for all 26 current modules — manager IS legacy staff, exactly.
- **Verification**: tsc 0; `build` + `build:static` exit 0; harness
  **175/175** (finance core + COA + A2 suites re-run green, plus RBAC
  matrix scenarios, the manager==legacy proof, owner-unrestricted
  across all 40 rows, role-default resolution, and migration backfill
  cases incl. idempotency); i18n **991 keys EN ≡ UR** (9 new A3 keys).

> **ROLLOUT (R-1) — READ BEFORE DEPLOYING:** rules v3 must be
> **published BEFORE the Phase A app build is deployed**. The rules
> are backward compatible in both directions that matter: a staffIndex
> doc without a role still grants manager access under v3, and the
> previous app build keeps working against v3 (it writes only what
> manager/owner could write). Publishing the app first would leave a
> window where the new client expects role gates the old rules do not
> enforce. Order: (1) publish rules v3 in the Firebase console,
> (2) deploy the Phase A build, (3) the `phaseA.rbacV1` migration runs
> automatically on the owner's next sign-in.

Known behaviours: (1) A cashier's dashboard shows money figures from
their own sales/bills (journal-derived widgets read empty in cloud
mode because rules v3 deny cashiers journal reads — the design's
§3.3 choice; the books are not browseable at the cashier desk).
(2) The credits collection grants write to all four roles in rules —
a standalone-credit row and a repayment row cannot be distinguished
at the rules layer, so the give-udhaar restriction lives in the
client + journal templates, exactly as the design states.

### A4 — Tax engine (landed)

What shipped:
- **Tax engine module** (`web/lib/tax.ts`, pure computation): slab
  resolution, per-line tax on the post-discount base, return tax
  shares, receipt grouping and the Finance tax position. Every
  posting path calls it, and the harness exercises it directly, so
  what the desks display and what the journal posts can never
  diverge.
- **Model**: `taxSlabs` collection — `TaxSlab {name, kind:
  percent | fixed (PKR per unit), rate, appliesTo: sales |
  purchases | both, inclusive, isDefault, active}`; the owner doc
  carries `defaultSalesTaxSlabId` / `defaultPurchaseTaxSlabId`
  (declared in A1; `null` = no tax). The settings fields are the
  resolution source of truth; a slab's `isDefault` flag is derived
  display state reconciled on every tax write. Products gain
  `taxSlabId?` (override) + `taxExempt?`.
- **Resolution (§2.2)**: exempt product → never taxed; an active
  product slab that applies to the direction wins; else the active
  shop default for the direction; else no tax. An inactive or
  deleted slab therefore switches its tax off everywhere without
  touching any product or settings record.
- **Migration** behind `phaseA.taxV1` (owner sign-in): records the
  two defaults as `null` where unset and flags the step. It creates
  **NO slabs**, writes no journal entries and no product fields —
  tax stays off until the owner configures a slab and marks it
  default. (Refinement of design §6.1, which had the migration
  create one inactive sample slab: the sample GST slab ships only
  in the fresh-seed/demo data, §2.5, so existing shops are
  untouched.) Fresh cloud shops are born with the flag set, the
  defaults `null`, and the inactive sample slab seeded.
- **Inclusive vs exclusive semantics (§2.3)**: an EXCLUSIVE slab's
  tax is added on top of the post-discount price — the customer
  pays it, it credits `tax_payable`, and revenue is untouched. An
  INCLUSIVE slab's prices already contain the tax: the tax is
  extracted (`base − base/(1 + rate/100)` for percent; `rate × qty`
  for fixed), the customer's total does not change, revenue is
  credited NET of the extracted tax, and the extracted part credits
  `tax_payable`. On purchases the supplier is always owed the GROSS
  (net + tax); stock enters at the NET; the tax debits `tax_input`
  (recoverable). Tax NEVER enters revenue, COGS or the P&L — the
  Finance P&L reads the same accounts as before and needs no tax
  handling at all.
- **Posting templates** (design §2.3/§2.4 worked examples verified
  in the harness to the rupee): taxed sale — Dr money 3,042,
  Dr COGS 2,450 / Cr revenue 2,600, Cr `tax_payable` 442,
  Cr inventory 2,450 (Σ 5,492); taxed purchase — Dr purchases
  40,000, Dr `tax_input` 6,800, Dr inventory 40,000 / Cr purchases
  40,000, Cr payables (ref: supplier) 46,800 (Σ 86,800). The slab is
  snapshotted onto every bill/purchase line (id, name, rate, kind,
  inclusive + the computed amount), so receipts and returns stay
  exact after a slab is renamed, deactivated or deleted. Discount
  is spread over lines pro-rata with cumulative rounding and tax is
  computed per line on the post-discount base; returns reverse tax
  per line with the same F-3 cumulative discipline — a taxed bill
  returned item-by-item reverses its tax to the paisa (harness:
  4 × 42.50 = 170.00; odd-paisa 3 × 56.61 = 169.83), the refund
  includes the exclusive tax share, and returning an exempt line of
  a mixed bill reverses exactly zero. The counter sale (`recordSale`)
  resolves tax through the same path as desk bills.
- **Tax payment** (refType `tax_payment`): Dr `tax_payable` /
  Cr money account, capped at the net position (output − input) —
  overpayment is refused. A `cashEntries` "out" row rides along
  WITHOUT its own journal entry (this flow posts the one entry), so
  the day-close expected-cash cross-check stays honest, exactly
  like supplier payments.
- **UI**: Settings gains a Tax slabs section (owner CRUD + default
  pickers; the accountant's matrix row is view-only, rendered as a
  plain list) gated by `can(role, "taxSlabs", "view")`; the product
  form gains a slab picker (shop default / active slabs) + exempt
  toggle; the billing desk previews tax live from the same
  calculator the store posts with (per-line tax notes, per-slab
  totals rows, inclusive shown as "included in prices"); receipts
  (standard + 80mm share one markup) and the WhatsApp bill message
  print one tax line per slab used, only when tax > 0; the purchase
  modal shows net / tax / gross-payable when tax applies and its
  success notice quotes the gross; Finance gains a Tax position
  card (output, input, net payable — balances + this month's
  movements, all from the journal's two tax accounts) with the
  record-payment form, and the cash book describes `tax_payment`
  entries.
- **No-tax-path guarantee (§2.6, hard requirement)**: a shop with
  no slabs/defaults produces byte-identical journals, receipts and
  totals to the pre-A4 build. Every tax figure is a conditional
  spread in the posting templates — at tax 0 the entries collapse
  to the pre-A4 line sets exactly, tax rows render only when an
  amount is > 0, and bill/purchase totals reduce to the old
  formulas. Proven in the harness: the normalized seed-journal
  SHA-256 still equals the pre-A4 baseline
  (`8c033e3a…b98f5a`, 21 entries), the composed no-tax sale entry
  has the exact pre-A4 5-line shape, and both calculators collapse
  to identity at zero tax. Demo storage key bumped v3 → v4 for the
  new collection.
- **Verification**: tsc 0; `build` + `build:static` exit 0; harness
  **231/231** (the 175 prior checks re-run green + 56 A4: design
  worked examples balanced at Σ 5,492 / 86,800, resolution matrix,
  discount-base tax, inclusive extraction (sale + purchase + return),
  fixed slabs both modes, mixed cart, item-by-item return reversal
  to the paisa, payables-at-gross, tax position + payment, receipt
  grouping, no-tax byte-identity); i18n **1,057 keys EN ≡ UR**
  (66 new A4 keys).

> **ROLLOUT:** no new rules are needed for A4 — the `taxSlabs`
> match (read `canAccess`, write owner) already shipped in rules v3
> with A3. Deploy order is unchanged: rules v3 first (if not yet
> published), then this build; the `phaseA.taxV1` step runs on the
> owner's next sign-in and changes nothing visible until the owner
> creates a slab and sets a default.

Known behaviours: (1) Changing a slab or a default never alters
posted bills/purchases — snapshots rule; only new documents see the
new configuration. (2) The two tax accounts are reported gross in
Finance (output and input side by side); the formal offsetting of
input against output belongs to the A5 fiscal-close work. (3) A
negative net position (input > output — a refund due from the
government) displays as Rs 0 payable in the payment card; the raw
position remains visible in the output/input rows.

### A5 — Fiscal year & period locking (landed)

- **Lock model (design §5.1)**: the enforcement value is ONE field
  on the owner doc — `lockedThrough`, an ISO instant (`""` = nothing
  locked). Closing "through a date" stores that date's end-of-day
  PKT instant (23:59:59.999 Asia/Karachi); every instant on/before
  it is closed. The `periods` collection is the audit trail ONLY:
  each close/reopen writes one doc (`kind`, `from`, `to`, `action`,
  `byUid`, `byEmail`, `ts`, `note`) in the SAME batch as the
  `lockedThrough` update, so trail and enforcement can never drift.
  Every new journal entry now carries `dateISO` (its PKT business
  date), stamped at the store's posting choke points.
- **Migration `phaseA.periodsV1`**: on owner sign-in, existing shops
  gain `fiscalYearStartMonth: 7`, `fiscalYearStartDay: 1` (the
  Pakistan fiscal year, owner-editable) and `lockedThrough: ""` —
  fields already present are never overwritten. It creates NO
  `periods` docs and NO journal entries: migration locks nothing;
  locking is the owner's deliberate act. Fresh shops are seeded
  with the same fields, so the step is a no-op for them. Demo
  storage key bumped v4 → v5 for the new collection.
- **Enforcement (store-primary, §5.2)**: every posting action runs
  its composed entries through the guard BEFORE any document is
  written; a NEW posting dated on/before `lockedThrough` is refused
  with a `PeriodLockedError` (surfaced in the UI with the locked-
  through date, e.g. backdating an expense into a closed month).
  Corrections of closed-period documents NEVER backdate: expense
  edits/deletes, bill voids and returns post their reversal /
  correction entries at TODAY's date — the locked entries stay
  byte-untouched and the correction lands in the open period.
  Opening/top-up writers are exempt by construction (they compose
  at the current instant; the pre-A5 live accounts predate any
  lock). The guard is a composition-time refusal: it fires in demo
  mode identically, and in cloud mode whenever the composed batch
  is built — which is every online action.
- **Rules backstop (§5.3)**: firestore.rules gains a bounded
  defence-in-depth layer (still rules v3 — no version bump): creates
  on the dated collections (bills, sales, expenses, credits,
  purchases, supplierPayments, returns, cashEntries) require their
  `ts` to be after `lockedThrough`; journal creates compare
  `dateISO` against the lock instant (sound at day granularity
  because the lock is always an end-of-day PKT instant). Updates
  and deletes are NEVER period-gated — corrections must stay
  possible. Entry points without `dateISO` (older clients) are
  never blocked, and an `exists()` guard keeps first-time seeding
  working while the owner doc does not yet exist.
- **Fiscal year (§5.1/§5.4)**: pure helpers derive the current and
  previous fiscal-year ranges from the settings (start day clamps
  to short months; boundaries are PKT day edges). Finance's P&L
  gains a period picker — This month (unchanged default) / This
  fiscal year / Last fiscal year — running the SAME computation
  over `[fromTs, toTs)` windows. The fiscal-year CLOSE itself
  (closing entries moving balances into retained earnings) is
  Phase D work; A5 delivers the fiscal calendar + the lock.
- **Settings UI**: a Periods section (owner-only; the matrix row
  `periods` grants no other role any access) — fiscal-year start
  month/day form with the current fiscal year shown, lock status,
  close through a date (with note + inline confirmation), reopen
  to an earlier date or fully (a reason is mandatory and recorded),
  and the full close/reopen history. The R-5 close rail is enforced
  in the store AND mirrored in the UI: a period may not be closed
  covering today or yesterday (offline-queued postings could
  otherwise be stranded inside a freshly closed range).
- **Verification**: tsc 0; `build` + `build:static` exit 0; harness
  **282/282** (the 231 prior checks re-run green — seed identities
  and the no-tax seed-journal SHA-256 baseline untouched — + 51 A5:
  PKT date edges, lock boundary semantics, backdated refusal,
  expense-edit and bill-void corrections netting correctly at
  today's date with locked entries untouched, the today/yesterday
  rail, reopen restoring posting date-by-date, fiscal boundaries
  incl. an April start and the 1-Jul PKT edge instants, P&L range
  windows); i18n **1,099 keys EN ≡ UR** (42 new A5 keys).

> **ROLLOUT (Phase A):** rules v3 — including the A5 backstop
> above — must be published BEFORE any Phase A build goes live;
> the backstop is backward compatible with pre-A5 clients (their
> entries carry no `dateISO` and are never blocked, and no shop is
> locked until its owner closes a period). Each owner's next
> sign-in then runs any outstanding migration steps
> (`phaseA.accountsV1` → `rbacV1` → `taxV1` → `periodsV1`).

## Phase A — complete

All five increments of the ERP foundation are landed and verified:

| Increment | Delivered |
|---|---|
| A1 | COA v2 registry (27 account codes with types/normal sides) + Phase A types |
| A2 | Money accounts (`accounts`): named cash/bank/wallet accounts, transfers, per-account balances |
| A3 | RBAC: owner/manager/cashier/accountant roles, the 40-row permission matrix in client + rules v3 |
| A4 | Tax engine: GST slabs (exclusive/inclusive/fixed), document snapshots, tax position + payments |
| A5 | Fiscal year calendar + period locking with audit trail, store guard + rules backstop |

**Migration flags (owner doc `phaseA`)**: `accountsV1`, `rbacV1`,
`taxV1`, `periodsV1` — each idempotent, each resumable, none of
them writes journal entries or alters posted documents.

**Standing caveats**: (1) Corrections of closed-period documents
post at today's date, never backdated (§5.2) — a closed month's
figures change only through open-period corrections, by design.
(2) Offline: the store guard refuses at composition time; a
posting composed offline BEFORE a lock was set elsewhere can still
be refused later by the rules backstop when it syncs — Firestore
commit failures remain fire-and-forget in the client, so such a
late refusal is silent (a pre-existing residual of the offline
model, unchanged by A5). (3) The R-9 residual on pre-remediation
live accounts (see FINANCE-AUDIT.md) is unaffected by Phase A —
closing it still needs the owner's wipe-and-reseed or correction
decision. (4) The Flutter app is untouched by Phase A (web-only,
as throughout). (5) Fiscal-year closing entries, retained
earnings and formal tax offsetting belong to Phase D.


## Phase B progress (ERP expansion — see ERP-PHASE-B-DESIGN.md)

### B1 — Types, numbering, quotations & sale orders (landed)

What shipped:

- **Types + numbering** (`lib/types.ts`, `lib/documents.ts`): the full
  Phase B document family is declared now — `Quotation`, `SaleOrder`,
  `DeliveryChallan`, `PurchaseOrder`, credit/debit `DocNote`,
  `PurchaseReturn`, `Cheque` — with behaviour in this increment only
  for quotations and sale orders. Numbering is per-series
  (`prefix + sequence`, minted `1 + max` over the series' own
  subscribed documents — no counter docs, the billNo pattern);
  numbers mint only when a document leaves draft (quotation on
  issue, order on confirm), so drafts burn no numbers. Prefixes
  default to the design's QT-/SO-/DC-/PO-/CN-/DN-/RV-/PV- and are
  owner-overridable per series via the owner doc's `docSeries`
  (Settings → Document numbering); a prefix change affects future
  mints only — sequences are read prefix-agnostically from the
  trailing integer, so a series stays monotonic across its own
  rename. Honest caveat (design §1.3): two devices racing from the
  same snapshot can mint the same number; the document `id` is the
  identity, and the series continues from the merged maximum.
- **The cardinal rule holds by construction** (§2.2): document
  actions write ONLY their own collections. Verified three ways in
  the harness — `lib/documents.ts` imports no ledger code; a source
  scan of the store's document-actions region finds no posting
  primitive (`makeEntry` / `postEntry` / `guardPostings` /
  `batchJournal`) and no write target outside
  `quotations`/`saleOrders`; a lifecycle simulation leaves
  journal/sales/stock byte-identical.
- **Quotations**: full CRUD (drafts only — issued documents are
  promises and are never edited in place), issue (mints QT-),
  accept/reject, cancel (refused once ANY quantity has converted),
  delete (drafts only), receipt-style print labelled as an estimate.
  Expiry is display-derived from `validUntil`, never a stored write.
- **Sale orders**: full CRUD, confirm (mints SO-), cancel (refused
  once any quantity is billed). Fulfilment is DERIVED (§2.1) from
  the bills citing the order — direct citations plus the one hop
  bill → challan → order — keyed by `sourceProductId`; held and
  voided bills fulfil nothing. **Convert-to-bill** writes nothing:
  it prepares an in-memory draft (customer, remaining lines at the
  AGREED prices, the order's discount terms) that the EXISTING
  billing desk consumes on mount; the bill posts only when the desk
  completes it through the ordinary `postBill` engine, which stamps
  the `sourceType`/`sourceId` citation onto the bill and rewrites
  the order's cached status in the SAME batch/state update as the
  posting. Order prices reach the bill only through the contained
  §2.4 seam (`BillLineInput.unitPrice`, set solely by conversion —
  the free desk never sets it, so ordinary bills price from the
  shelf exactly as before, and non-conversion postings are
  byte-identical). Tax is never copied from a document: the bill
  re-resolves slabs at posting time. Document totals are ESTIMATES
  (§7): `estimatedTax` is the A4 engine's figure at today's slab
  resolution, recomputed at render, labelled as an estimate on
  screen and on the print.
- **RBAC + nav**: sidebar entries for Quotations and Sale Orders,
  gated by the pre-declared matrix rows (quotations/saleOrders
  F/F/F/R — the accountant is read-only; write controls and store
  guards follow the same matrix). G-1/G-2/G-3 are recorded in the
  design for B2/B4/B5 and untouched here.
- **Rules**: two ADDITIVE blocks in `firebase/firestore.rules`
  (`quotations`, `saleOrders` — read `canAccess`, write
  owner/manager/cashier). Non-posting collections deliberately get
  NO period guard (§6.2). Diff against the v3 baseline is purely
  additive (17 inserted lines, zero changed). **ROLLOUT NOTE: these
  blocks publish with the NEXT rules release — they are NOT part of
  rules v3 and must not be described as published with it.** The
  Phase A rollout order is unaffected (v3 first, then the app);
  when the next package ships, its rules file (v3 + these blocks)
  is published before/with that package.
- **Demo/production seeds** (§10): demo mode gains one issued
  quotation (QT-1) and one open order (SO-1) for discoverability;
  production namespaces gain the two collections EMPTY (absent =
  empty; the seed push deliberately excludes them). No money
  migration. Demo storage key bumped v5 → v6.

**Verification**: `npx tsc --noEmit` **0 errors**; `npm run build`
exit 0 (routes `/quotations` + `/sale-orders` generated);
`npm run build:static` exit 0 (bundle contains the Firebase project
id and the new routes). Harness (fresh compile of
`lib/ledger|seed|coa|permissions|tax|periods|documents|selectors`):
**322/322** — the 282 prior checks re-run green (FIN 34, COA 10,
A2 16, RBAC 115, A4 56, A5 51) plus the new **B1 suite (40)**:
zero-posting proof (above), numbering allocation (sequential,
draft-free, per-series, prefix override, merged-race continuation),
lifecycle transitions per design (issue/accept/convert, expiry
derivation, order open → partially_fulfilled → fulfilled, held and
voided bills fulfilling nothing, challan one-hop), convert-to-bill
composing exactly one balanced entry at the agreed price through
the desk template, seed identities (Inventory 272,805 · Cash
50,000 · payables 27,900 · receivables 5,500 · trial balance 0) and
the 21-entry no-tax seed journal unchanged. One transparency note:
the A4-era harness's exact SHA-256 normalization string was
ephemeral and is unrecoverable, so the fingerprint check now pins
the journal under a recorded B1 normalization (wall-clock `ts`
dropped; ids/memo/refs/dayOffset/lines kept) —
`e17e5bda…1168` — while the journal's money content is pinned
directly by the identity checks above. i18n dictionary now
**1,223 keys, EN ≡ UR** (124 new B1 keys).

### B2 — Delivery challans & the conversion seam (landed)

What shipped:

- **Delivery challans** (`deliveryChallans` collection, route
  `/delivery-challans`): the design's non-posting delivery document
  (§2.3). A challan has NO totals and prints NO amounts — the print
  sheet is a delivery note (item + quantity columns only, vehicle /
  driver rows, a received-by signature line). Statuses: draft
  (freely editable/deletable) → dispatched (mints DC- on dispatch,
  via the B1 numbering machinery) → partially_billed → billed
  (both DERIVED from the bills citing the challan, §2.1, never
  stored counters); cancel is refused once ANY quantity is billed.
  Challans are created standalone (direct delivery) or from a sale
  order with per-line remaining-quantity picks; an order-cited
  challan's lines are validated at create/dispatch against the
  order's undelivered remainder (recomputation, never trust in the
  client), and an order with deliveries against it can no longer
  be cancelled (§1.4). Vehicle/driver/note ride the document for
  the print. RBAC per G-1: challans ride the `saleOrders` matrix
  row (owner/manager/cashier write, accountant read-only).
- **The conversion seam** (§2.3, §2.4): challan → bill prepares an
  in-memory desk draft exactly like B1's order → bill (remaining
  lines, agreed prices — from the cited ORDER when the challan
  cites one, else the challan's own lines; discount terms from the
  order, else none), and the bill posts EXACTLY ONCE through the
  existing `postBill` engine, which stamps the
  `sourceType: "challan"` citation and rewrites BOTH the challan's
  and (one hop) the order's cached statuses inside the posting
  batch. Tax still re-resolves at bill time; challan/order figures
  remain estimates. Picks are double-clamped — by the challan's
  unbilled remainder AND by the source order's one-hop unbilled
  remainder — so a quantity billed directly can never be billed
  again through the challan, and a quantity billed via a challan
  can never be billed again directly (B1's `convertOrderToBill`
  now derives through the one-hop engine too; the direct
  order → bill path is otherwise unchanged). Quotation → bill via
  the same seam landed here as well (remaining-to-convert clamp;
  citation `sourceType: "quotation"`).
- **Derived reservation** (§2.5): `available = on-hand − promised`
  per product, where promised = unbilled quantities on open orders
  (one-hop derived) + unbilled quantities on dispatched challans
  that do NOT cite an order (an order-cited challan's unbilled
  quantity already lives inside its order's remainder — counting
  both would double-promise). Drafts and cancelled documents
  promise nothing. Surfaced as promised/available sub-lines in the
  Inventory view and as a SOFT warning in the billing desk when a
  cart line exceeds available (the current conversion's own
  promise excluded); posting remains governed solely by the
  existing on-hand validation — piece 2a of the design's sequence;
  piece 2b (an owner policy toggle letting promised stock block
  walk-in billing) is deliberately NOT built (§2.5).
- **Zero-posting discipline holds** (§2.2): challan create/edit/
  dispatch/cancel write ONLY `deliveryChallans` — no journal, no
  stock, no credit rows — proven in the harness by the same
  source-scan + lifecycle-simulation method as B1 (the B1
  assertion's allowed write-target set was widened to include the
  increment's own collection; its substance is unchanged).
- **Rules**: one ADDITIVE block (`deliveryChallans` — read
  `canAccess`, write owner/manager/cashier, G-1; NO period guard,
  §6.2). Diff against the B1 file: additions only, pre-existing
  blocks byte-identical. **ROLLOUT NOTE: publishes with the next
  rules release alongside the B1 blocks (v3 + B1 + B2), before/with
  the next package.**
- **Demo seed** (§10): demo mode gains one dispatched challan
  (DC-1) citing the demo order SO-1 with a partial delivery (8 of
  the first line's 20), so the order → challan → bill chain is
  discoverable; production namespaces start with the collection
  EMPTY (deliberately not pushed by the seed). Demo storage key
  bumped v6 → v7.

**Verification**: `npx tsc --noEmit` **0 errors**; `npm run build`
exit 0 (route `/delivery-challans` generated); `npm run
build:static` exit 0 (bundle contains the Firebase project id and
the new route). Harness: **361/361** — the 322 prior checks re-run
green plus the new **B2 suite (39)**: zero-posting proof for
challans (source scan + G-1 guard count + lifecycle simulation),
the §2.6 worked example end to end (one balanced entry at the
agreed 2,600 through DC-21, Dr == Cr == 50,500), tax re-resolved
at bill time (0-estimate order → 17% slab created later → bill
carries 4,420 / total 30,420), partial chains (order 10 → challan
4 → bill 4 → direct bill of the remaining 6; the billed 4 cannot
re-bill; ceiling 6 + 4 == 10, never 14), one challan billed across
two bills summing exactly, the reservation derivation against
hand-computed figures (promised A 12 / available A 0; promised B 2
/ available B 3; draft/cancelled documents excluded; no double
promise through order-cited challans), and the seed identities +
re-pinned fingerprint intact (journal still 21 entries). i18n
dictionary now **1,261 keys, EN ≡ UR** (38 new B2 keys).

### B3 — Purchase orders & receipt linkage (landed)

What shipped:

- **Purchase orders** (`purchaseOrders` collection, route
  `/purchase-orders`): the purchase side's non-posting document.
  Lines carry the AGREED cost per product; `total` is the goods
  estimate at those costs — tax is NOT estimated on the PO, it
  resolves at receipt (§7). Statuses: draft (freely editable /
  deletable) → issued (mints PO- on issue, via the B1 numbering
  machinery) → partially_received → received (both DERIVED from
  the purchases citing the PO, `poReceivedQty` / `derivePoStatus`
  in `lib/documents.ts`, never stored counters); cancel is
  refused once ANY quantity has been received (§1.4). The detail
  view carries the derived fulfilment table (received / remaining
  / ordered per line) and a print sheet — a purchase document, so
  prices print (agreed costs + goods total, with the note that tax
  is fixed at receipt). RBAC per the pre-declared matrix row:
  owner/manager full, cashier NONE, accountant read-only (store
  actions, sidebar gating, view and rules all agree).
- **Receipt linkage** (§2.3): "Receive goods" on an issued PO
  opens a receive panel pre-filled with the DERIVED remaining
  quantities at the PO's agreed costs; quantities and costs are
  editable at receipt (the actual invoice rules). The store's
  `receiveAgainstPo` validates the picks through
  `composePoReceiptLines` — over-receipt beyond the remaining
  quantity, a product the PO never ordered, and draft / cancelled
  / fully-received POs are all refused BEFORE anything is
  composed — then posts ONLY through the existing `recordPurchase`
  engine with `sourcePoId` set. The engine stamps the citation on
  the Purchase and recomputes the PO's cached status over the
  purchases including the new one, inside the receipt's own batch
  (the B2 postBill pattern on the purchase seam), so a receipt can
  never half-land. Partial receipts across multiple deliveries
  are supported by the derivation. The Suppliers view links to the
  PO workspace ("Receive against a purchase order") and each
  purchase row in a supplier's history shows its PO citation.
  Goods returned against a received purchase are B4's debit-note
  flow — deliberately not built here.
- **Zero-posting discipline holds** (§2.2): PO create / edit /
  issue / cancel write ONLY `purchaseOrders` — no journal, no
  stock, no payable row — proven in the harness by source scan
  (the CRUD block reaches no posting primitive, not even the
  purchase engine) plus the lifecycle simulation over seed state.
- **Rules**: one ADDITIVE block (`purchaseOrders` — read
  `canAccess`, write owner/manager; NO period guard, §6.2). Diff
  against the B2 file: additions only, pre-existing blocks
  byte-identical. **ROLLOUT NOTE: publishes with the next rules
  release alongside the B1/B2 blocks (v3 + B1 + B2 + B3),
  before/with the next package.**
- **Demo seed** (§10): purchase orders start EMPTY in demo and
  production alike — §10's discoverability set names no demo PO,
  and the seed journal is untouched by construction. Demo storage
  key bumped v7 → v8.

**Verification**: `npx tsc --noEmit` **0 errors**; `npm run build`
exit 0 (route `/purchase-orders` generated); `npm run
build:static` exit 0 (bundle contains the Firebase project id and
the new route). Harness: **398/398** — the 361 prior checks re-run
green plus the new **B3 suite (37)**: zero-posting proof for PO
CRUD (source scan + gate counts), the receipt seam's delegation /
citation / in-batch status assertions, the matrix rows (cashier
none, accountant read), PO- numbering (drafts burn none), partial
receipts deriving exactly (10 ordered → 4 received → 6 remaining;
the second receipt closes the PO; supplier payable after receipts
== Σ receipt gross totals 36,665), over-receipt refused
pre-composition (7 against 6 remaining; 11 against 10 ordered),
cancelled / draft / fully-received POs receiving nothing, foreign
products refused, and TEMPLATE IDENTITY: a PO receipt's composed
journal entry is line-for-line the direct purchase's entry for the
same goods — taxed (net 24,500 + GST 4,165 = gross 28,665, the
payables line carrying the gross) and untaxed — with identical
stock-in effects; seed identities + fingerprint intact (journal
still 21 entries). i18n dictionary now **1,295 keys, EN ≡ UR**
(34 new B3 keys).

### B4 — Credit/debit notes & the purchase-return engine (landed)

Design §3, gap G-2, risk R-B2. The formal paper over returns, and
the missing mirror of `reverseBillItems` on the purchase side.

**Credit notes (sales side).** The returns engine gained an
opt-in note composition: when a return is posted through the
FORMAL flow (the new `returnItemsWithNote` store action, and the
Notes workspace's issue panel), a numbered `DocNote` (CN- series)
mints **inside the return's own batch / state update**, citing the
`SaleReturn`, the bill and the journal entry the engine composed.
Its figures are a pure read of the return (`creditNoteFigures`):
`total` = cash refund + udhaar reduction (the engine's refund
total, by construction), `taxAmount` = Σ the A4 shares stamped on
the return's items, `goodsAmount` = total − tax. Voids never mint
notes (composition is gated to `kind === "return"`). Issuance
gates on the **`creditDebitNotes`** matrix row ONLY (G-2) — the
accountant (whose `returns` row is `none`) can issue; the cashier
(whose `returns` row is `full`) cannot, and the plain
`returnItems` action keeps its own `returns` gating byte-for-byte.
At the billing desk, a role with the notes row posts its returns
through the formal flow automatically (with an optional printed
reason); other roles see the desk exactly as before.

**Purchase-return engine (new).** `recordPurchaseReturn` +
the `purchaseReturns` collection: goods go back against ONE
recorded purchase, composed/validated by
`composePurchaseReturnLines` (over-return — more than purchased −
already-returned — is refused by the derivation before anything
is built; unknown products and empty picks refused; duplicate
picks merge). Stock leaves at the purchase line's own in-cost
snapshot (`purchaseReturnItems`); the product's shelf `costPrice`
is NOT rewritten. Input tax reverses through the new
`purchaseReturnTaxShares` in `lib/tax.ts` — the exact cumulative
analogue of A4's `returnTaxShares`, so item-by-item returns
reverse `tax_input` to the paisa. Journal per the design
template (gross G = net N + tax T): `payable_offset` → Dr
payables (ref: supplier) G / Cr inventory N + Cr tax_input T;
`cash_refund` → Dr cash|wallet (ref: account) G / same credits.
The `purchases` clearing account is untouched; the posting flows
through `guardPostings` (period lock applies). A DN- `DocNote`
mints in the same batch, citing the purchase; its items carry the
in-cost as their price (`noteItemsFromPurchaseReturn` — the
DocNote item shape is the bill-line shape; the PurchaseReturn
record keeps the purchase-line truth).

**Subledger amendment (same increment — the R-B2 discipline).**
`supplierPurchased` now nets Σ purchase-return gross;
`payablesAging` ages each purchase net of its returns, over a
payment pool net of refunds. The paid-supplier treatments, both
asserted by the harness against the journal after every leg:

- **Offset against an already-PAID purchase** → the payable goes
  negative in both derivations: a supplier advance (money the
  supplier holds for the shop), contributing nothing to aging.
- **Cash refund** → the design's template never touches
  `payables`, so the refund is accounted as a **negative
  payment** (`supplierRefunded`): the subledger un-pays the
  refunded amount, and both derivations read the settled position
  (0 in the paid-in-full scenario) instead of a phantom advance.
  This is the only reading under which the design's §9 identity
  ("journal ≡ subledger after offset AND after cash refund")
  holds; displayed "paid" figures in the Suppliers desk are
  likewise net of refunds, so purchased − paid == balance on
  every row.

**Surfaces.** New `/notes` workspace (Finance nav group):
kind-filterable, searchable note register with detail + receipt-
style print (`NotePrintSheet` — per-slab tax lines via the new
`taxLinesForItems` grouping, settlement legs read from the
underlying return row, reason) and the formal credit-note issue
panel. Suppliers desk: per-purchase "Return goods" flow in the
detail modal (settlement choice, refund method/account, reason),
a purchase-returns history table, and returns-aware balances,
summaries and delete guard. Finance payables aging and the AI
assistant's supplier answers read the amended derivations.

**Rules (additive only).** `notes` + `purchaseReturns` blocks in
the §6.2 posture: read any accessible role; create restricted to
owner/manager/accountant (the `creditDebitNotes` row) WITH the
A5 `createInOpenPeriod` backstop — notes are posting-linked, so
unlike the B1–B3 documents they carry the period guard;
update/delete owner-only. Diff against the pre-B4 rules: 25
lines added, zero lines changed.

**Design-vs-code notes.** (i) §3.1's "every completed return
mints" is scoped to returns posted through the note-issuing
flow: minting on the plain desk return would hand issuance to
the cashier, contradicting G-2 and the §9 checkpoint (cashier
CANNOT issue). (ii) §3.1's goods formula (Σ line totals −
discount share) and its total identity (goods + tax == total)
conflict for INCLUSIVE slabs — the sticker already embeds the
tax the formula would add again; `goodsAmount` is therefore
total − tax, which coincides with the design's formula for
exclusive and untaxed bills (the only cases where it foots).
(iii) Residual: the products rules block's stockQty-only update
carve-out (owner/manager/cashier) does not list the accountant,
whose purchase-return batch includes a stock decrement — in
CLOUD mode an accountant's purchase return would be denied by
Firestore rules (the whole batch is atomic, so nothing
half-lands; demo mode and owner/manager are unaffected). Left
untouched because pre-existing rules blocks stay byte-identical
this increment; adding `'accountant'` to that carve-out is the
one-line follow-up awaiting the owner's call.

**Verification.** `npx tsc --noEmit` 0 errors; `npm run build`
exit 0 (route `/notes` generated); `npm run build:static` exit 0
(bundle contains the Firebase project id, the `/notes` route and
the B4 posting code; zero Demo strings). Harness: **481/481** —
the 447 prior checks re-run green (incl. the SEARCH suite and
the seed fingerprint assertions) plus the new **B4 suite (34)**:
CN/DN kind-filtered numbering; the taxed fixture (net 24,500 +
GST 4,165 = gross 28,665) returned in three slices reversing
`tax_input` to the paisa and to a zero journal balance;
inclusive + untaxed mixes exact; over-return / unknown-product /
empty picks refused pre-composition; **journal ≡ subledger
identity after purchase → partial payment → partial offset
return → return of the rest** (ending in the −10,000 advance the
payment becomes), after a paid-in-full offset return (−6,000 in
both), after a cash refund (0 in both — the refund un-pays), and
across a mixed pay → refund-return → offset-return sequence
(4,000 owed in journal, subledger AND aging); a fully-returned
purchase leaves balance and aging at exactly 0; debit-note
figures ≡ the purchase return they wrap; credit notes over an
item-by-item taxed return sum to the bill total and reverse its
tax to the paisa; RBAC rows (notes vs returns, G-2); source
invariants for both gatings, the in-batch mints and the guard;
the rules posture. Demo storage key bumped to
`dukaan-ai-store-v9` (notes + purchaseReturns start empty
everywhere; seed data and journal unchanged — still 21 entries).
i18n dictionary now **1,371 keys, EN ≡ UR** (76 new B4 keys).

### B5 — Cheque registry & instrument capture (landed)

Design §4 + §6.1 (G-3) + §9-B5. "Cheque" is an INSTRUMENT stamped
on payment rows (`instrument: "cheque"` + `chequeId`), never a
sixth `PayMethod`: the row's method rides as `"bank"`, and the
registry doc in the new `cheques` collection is created in the
SAME writeBatch as the host posting, carrying bank, leaf number,
the date written on the cheque and its PDC due date (future-dated
due dates are first-class; no capture forces date == today).

- **Capture (IN)** — inside the host entry: a bill cheque part
  posts Dr `cheques_in_hand` (line ref = chequeId) in place of the
  money/receivables leg; an udhaar repayment by cheque posts the
  same leg in the repayment entry. **Capture (OUT)** — a supplier
  payment by cheque settles the payable AT ISSUANCE:
  Dr `payables` / Cr `cheques_issued` (ref chequeId), the payment
  row written in the same batch, so journal ≡ subledger from the
  same instant. An expense by cheque posts Dr expense category /
  Cr `cheques_issued` inside the host expense entry.
- **Lifecycle** (`lib/cheques.ts` holds the transition table and
  the line composers; the store's four actions —
  deposit/clear/bounce/return — refuse anything the table refuses
  BEFORE composing a write): DEPOSIT posts nothing (custody only;
  records the deposit account). CLEAR (refType `cheque_clearing`):
  IN Dr money account / Cr `cheques_in_hand`; OUT Dr
  `cheques_issued` / Cr money account. BOUNCE (IN, from deposited
  only; refType `cheque_bounce`): Dr `receivables` / Cr
  `cheques_in_hand` PLUS a compensating `credits` row in the same
  batch (bill-source: against the original bill, so the F-6 lot
  stays truthful; repayment-source: against the customer) — bank
  charges post as their OWN balanced entry (Dr `expense_finance`)
  in the same batch when entered; recovering them from the
  customer is not automatic. RETURNED undeposited (refType
  `cheque_return`): the bounce lines + the same compensating row.
  OUT BOUNCE (pre-clearing, supplier payments only): Dr
  `cheques_issued` / Cr `payables` PLUS a compensating
  `supplierPayments` row of the new kind `"reversal"` —
  `supplierPaid` nets reversal rows, so the subledger re-opens in
  the same instant as the journal. Every identity of §4.3 is
  assertable at all times: Σ uncleared registry ==
  GL `cheques_in_hand`; Σ pending-out registry ==
  GL `cheques_issued`.
- **Surfaces** — a "Cheque" choice in the four payment pickers
  (BillingDesk payment rows, CreditLedger repayment modal,
  SuppliersManager payment modal, ExpensesRegister form) revealing
  the shared capture fields; the `/cheques` registry (finance nav
  group) with the §4.4 derived views (drawer / at bank / issued
  pending / due / terminal), registry totals beside the GL
  balances, search, and the lifecycle action modals; Finance
  gains the two cheque balances as ordinary COA reads next to the
  registry totals. Day close excludes instrument-stamped parts
  from its cash/wallet buckets (§4.4 — the journal figure stays
  authoritative; clearing days have no operational doc, the
  documented cross-check limitation). RBAC gates on the existing
  `cheques` matrix row exactly (owner/manager/accountant full,
  cashier none — the cashier's capture rides the billing row).
- **Rules** — one strictly additive block (+25 lines, 0 changed): read
  `canAccess`; create `canAccess && createInOpenPeriod` — the
  G-3 widening, with the R-B6 reason carried in the comment (a
  cashier's cheque doc is born inside the bill's batch, which
  rules cannot decompose; do not "tighten" later); update
  owner/manager/accountant; delete owner. No existing line
  changed; the version header is bumped at release packaging.

**Design-gap resolutions (flagged, decided narrowly).** (i) §10's
demo discoverability set mentions one in-cheque in the drawer —
NOT seeded: a registry-only cheque carries no journal footprint
and would break the §4.3 identity inside the seed itself, so the
`cheques` collection starts empty in demo and production alike
(the identity is the stronger, checkpoint-level requirement).
(ii) An EXPENSE cheque's bounce is not a registry action: the
design names no compensating record for it, and the expense's own
F-5 machinery (update/delete) mirrors the `cheques_issued` line
exactly — so a still-issued cheque expense may be edited (its
amount syncs to the registry doc in the same batch) or deleted
(the reversal closes the cheque as bounced); once the cheque is
spent (cleared/bounced/returned) edit/delete refuse. Clearing an
expense cheque IS a registry action. (iii) Bill VOID × cheque
(design silent): in the void's batch, per cheque part — a
received/deposited cheque is credited back out of
`cheques_in_hand` and its doc closes as `returned`; a cleared
cheque is credited against the account it cleared into; an
already-bounced/returned cheque writes no line (its value already
left `cheques_in_hand` and the F-6 lot already restored it).
Ordinary bill returns need no cheque awareness (the refund goes
out by the counter-chosen method; the identities still hold).

**Verification.** `npx tsc --noEmit` 0 errors. Harness:
**542/542** — the 504 prior checks re-run green (incl. the frozen
seed identities and fingerprint) plus the new **B5 suite (38)**:
IN capture with the identity at every step; deposit posts
nothing; clearing moves exactly the amount into the chosen money
account; bounce restores the receivable to the paisa in BOTH
derivations (journal + F-6 lot), charges as their own entry, and
the R-B3 bounce×return orderings converge; return-undeposited
restores both books; issuance settles the payable at issuance
(journal ≡ subledger ≡ aging), clearing drains the bridge, a
pre-clearing bounce re-opens both derivations via the reversal
row's netting; partial cash+cheque reopens only the cheque part;
two cheques on one bill under a clear/bounce mix; the refusal
matrix (double-clear, clear/bounce-before-deposit,
bounce-after-clear, deposit-an-out-cheque, registry bounce of an
expense cheque); PDC due/overdue edges; day-close instrument
exclusions; the RBAC row; source invariants incl. the rules
posture. Demo storage key bumped to `dukaan-ai-store-v10`
(`cheques` starts empty everywhere; seed data and journal
unchanged — still 21 entries). i18n dictionary now **1,446 keys,
EN ≡ UR** (75 new B5 keys). Release packaging (zip + rules v5
text) follows B6, per the phase plan.

### B6 — Payment vouchers + document prints (landed — Phase B finale)

Design §5 + §6.1 (G-4) + §9-B6. A voucher is a ledger row,
printed — there is **no voucher collection and no posting** in
this increment. `CreditEntry` (repayments only) and
`SupplierPayment` gained an optional `voucherNo`; the store stamps
it at creation — `addRepayment` mints from the `receiptVoucher`
series (RV-), `recordSupplierPayment` from the `paymentVoucher`
series (PV-), both via the §1.3 `nextDocNumber` max+1 pattern over
the subscribed rows — INSIDE the row object, so the stamp rides
the same writeBatch / state update as the money event itself and
can never exist without it. A posting refused by the A5 guard
writes nothing, number included (the next successful mint
recomputes from stored rows — nothing burns). Scope per §5.1:
repayments + supplier payments only; expense payments and
capital/drawings keep their existing surfaces (expense vouchers
are explicitly out of Phase B scope, §12), bill receipts already
exist, and B5's compensating rows (cheque-bounce credit rows,
supplier-payment `kind: "reversal"` rows) are NOT payments and
carry no stamp. Pre-B6 rows simply have no `voucherNo` and print
unnumbered ("—") — history is never rewritten or backfilled.

**Prints.** New `VoucherPrintSheet` on the shared receipt shell
(§5.3): shop header, voucher title + number, date, party, amount
in figures, method — with the money account's name for money
methods (the A2 stamp resolved for display) or, for a
cheque-settled voucher, the cheque number / bank / due date —
the row's note, signature line, and the **balance after**: the
party's CURRENT derived balance (`customerOutstanding` /
`supplierBalance` — the subledgers this app always derives, never
stores), computed at print time and labelled as the current
balance, exactly as §5.2 prescribes. Pure builders
(`receiptVoucherData` / `paymentVoucherData` in lib/documents)
resolve the print data from the row, so a voucher's figures equal
its source row's by construction and the builders stay
language-neutral — the sheet renders every label through the
dictionaries in the shop's chosen language. Print surfaces:
repayment rows in the Credit Ledger khata (voucher number shown
under the repayment badge) and payment rows in the supplier
detail (number under the method; reversal rows excluded), both
gated on the `vouchers` matrix row (full for all roles; per G-4
the print follows the host surface's visibility and adds no
access). The print pass over the Phase B documents was verified
complete: quotation / sale order / delivery challan
(quantities-only, §2.3) / purchase order / credit & debit notes
all print through the shared language-aware sheets with figures
equal to their screens. Stretch (§9-B6): **WhatsApp share for
quotations** landed on the bill message pattern — shop name,
`quote.wa.title`, item lines, discount / estimated-tax (labelled
an estimate, §7) / total lines, valid-until, thanks — offered in
the quotation detail when the quotation carries a customer phone.

**Verification.** `npx tsc --noEmit` 0 errors; `npm run build`
and `npm run build:static` exit 0 (bundle contains `dukan-8246`;
'Demo' tokens 26 == the B4/B5 baseline — zero new). Harness:
**576/576 ALL SUITES GREEN** — the 542 prior checks re-run green
(incl. the frozen seed identities and fingerprint) plus the new
**B6 suite (34)**: RV/PV minting (empty series, max+1, prefix
override + monotonicity across a prefix change), a mixed
repayment/payment workload with per-series sequential unique
numbers, the no-burn proof for refused postings, unstamped
reversal rows leaving the sequence undisturbed, pre-B6 rows
never rewritten, the journal untouched by a voucher-only session
(21 entries, trial balance 0), source invariants (no new
`makeEntry` call — 24 == pre-B6; exactly two stamp sites), rules
byte-identical (sha256 pinned — B6 changed no rules; the fields
ride documents the rules already govern), the print builders'
figures equalling their source rows for money and cheque
vouchers in both kinds, legacy rows printing unnumbered, and
every B6 key present in both dictionaries. No demo-storage bump
(no new collection, no shape change — rows without `voucherNo`
are valid as-is) and no seed change. i18n dictionary now
**1,454 keys, EN ≡ UR** (8 new B6 keys). Phase B is complete;
the release audit + packaging (zip + rules v5 text = v4 + the
B5 cheques block) follows as its own step.

### Reports section (owner directive, 2026-10-22)

**What landed.** A `/reports` workspace (nav: Finance group,
after Finance) with a thirteen-report catalogue — sales (period
totals, by product, by customer; returns netted as negative sale
rows, exactly as the Sales screen sums them), purchases (by
supplier, by product, net of purchase returns), stock (current +
valuation at cost, low-stock, near-expiry — a snapshot), profit &
loss, cash book / per-account statement, tax (per slab: output,
input, net), customer statement (khata), supplier statement,
receivables + payables aging, expenses by category, cheques
(drawer / at bank / issued / cleared / bounced / returned, due-date
sorted), day-close summary and the credit/debit notes register.

**Derivations — no parallel math.** All figures come from
`lib/reports.ts`, a pure read-only builder layer over the SAME
functions the screens run: `profitAndLossInRange` (P&L),
`receivablesAging` / `payablesAging` (aging), `accountBook` /
`cashBook` (statements), `supplierBalance`'s netting mirrored
event-by-event (a purchase return moves the running balance by
−payableOffset only; the refund leg un-pays), `customerOutstanding`'s
signed rows, `taxLinesForItems` slab grouping (posted bills −
returns, purchases − purchase returns; held/voided bills excluded
as they never posted tax), and the stock selectors. No posting or
journal changes, no new collections, no rules changes.

**Output pipeline.** Every report carries the same controls: a
date range (Today / This week (Monday) / This month / This fiscal
year / Custom — PKT business dates, half-open instant bounds, the
A5 fiscal convention), an OUTPUT-language selector (EN/UR,
defaulting to the app language) that drives ONLY the print/share
surfaces, Print and Save-as-PDF through the ONE browser print
pipeline (`ReportPrintSheet` on the B6 `.receipt-sheet` shell —
browser rendering is what shapes Urdu correctly in the PDF; no
client PDF library), and Share as a formatted text summary in the
chosen language (Web Share API where available, WhatsApp deep
link always). The sheet carries its own `dir`/Nastaliq when the
output language is Urdu, whatever the app language is. Stock and
aging are labelled snapshots (current position; the range does
not apply).

**Access.** Gated on the `finance` matrix row (`view`) — the A3
matrix has no dedicated reports row, and reports expose exactly
the finance surface's figures (owner/manager/accountant in,
cashier out, mirroring FinanceView).

**Verification.** Harness **644/644 ALL SUITES GREEN** — the 576
prior checks re-run green plus the new **REPORTS suite (68)**:
report == screen identities for P&L (incl. the fiscal window),
tax totals == `taxPosition` over the in-range journal, stock
valuation/low/expiry == selectors, aging == Finance's calls,
customer closing == `customerOutstanding` for every seed key
(+ sub-range opening identity), supplier closing ==
`supplierBalance` for every seed supplier and for an
offset+refund purchase-return fixture (running balances
10,000 → 6,000 → 3,000), account closing ==
`moneyAccountBalance`; range edges (half-open bounds, FY
boundary, Monday week); EN/UR figure determinism (share texts
carry identical figures); legacy-row safety (missing unitCost /
tax stamps / salesByMethod / unknown product or category never
throw); read-only source invariants (no posting machinery in
lib/reports.ts, no PDF library). `npx tsc --noEmit` 0 errors;
`npm run build` and `npm run build:static` exit 0 (`/reports`
route shipped; bundle contains `dukan-8246`; 'Demo' tokens
26 == the B6 baseline — zero new). i18n dictionary now
**1,583 keys, EN ≡ UR** (129 new: the `rep.*` part + `nav.reports`).
No demo-storage bump, no seed change. Not packaged — packaging
is a separate release step.

## Phase C · C1 — Warehouses & stock rows (design: ERP-PHASE-C-DESIGN.md §1)

**What landed.** Stock now has a LOCATION dimension. A new
`warehouses` collection holds the shop's stock locations (name,
note, `isDefault`, `archived`, `sortOrder`); a new `stockLevels`
collection holds one quantity row per (warehouse, product) pair
under the deterministic id `${warehouseId}__${productId}`. The
rows are the per-location truth; `Product.stockQty` remains the
total, written in the SAME batch / state update as its rows on
every path, so the identity **Σ stockLevels == stockQty** holds
per product by construction (in-transit joins the identity in
C2). Valuation is unchanged: ONE inventory GL per class at the
product's ONE cost price — a warehouse is a place, not a ledger
dimension, and no journal composer knows a warehouse exists
(harness-pinned: the store's `makeEntry(` count is still 24).

**Migration `stockV1` (flag `phaseC.stockV1` on the owner doc).**
Entry-free, like every Phase A migration: on owner sign-in, a
shop without the flag gets the default warehouse doc (`wh-main`,
"Main Warehouse") if it has none, plus one row per product that
has NO rows yet, at the default warehouse, carrying its full
current `stockQty` (per-product skip-whole; chunked at 450 docs;
idempotent). It writes NO journal entries and changes NO total —
the frozen identities are harness-re-asserted after it (journal
21 entries · SHA e17e5bda…1168 · Inventory 272,805 · Cash
50,000 · TB 0). Fresh shops are born migrated (seedNamespace
pushes `wh-main` + complete rows and pre-sets the flag; the demo
seed ships the same end-state plus one empty Godown as flavour).
Demo storage key bumped v10 → **v11**.

**Every stock path writes its row in the same batch** (§1.5):
billing (rows at the bill's ONE warehouse — Q1: no line-level
split; posting now also validates each line against that
warehouse's row, the finalizeBill precedent), counter sales
(always the default warehouse; the default row must hold the
quantity), bill returns/voids (goods return to the BILL's
warehouse), purchases (the receipt's resolved warehouse is
stamped on the Purchase), purchase returns (out of the
purchase's warehouse), adjustments (desk pick; the delta is
clamped on the TOTAL exactly as before and the row receives that
same applied figure — a row may go negative in a split shop,
sanctioned), the F-4 paths (product create/edit/delete: opening
row at the default, edit delta at the default, delete zeroes the
product's rows — rows are zeroed, never deleted), CSV import
(rows at the default; cloud chunk 450 → 200 products/batch for
the extra doc), and PO receipts (`receiveAgainstPo` gains an
optional warehouse override; default = the PO's expected
destination). Day Close writes no stock and needed no change.

**Documents carry the stamp** (§1.6): `Bill.warehouseId` (resolved
concrete at posting), `Purchase.warehouseId`, `StockAdjustment.
warehouseId`, `SaleOrder.warehouseId` (a preference), `Delivery
Challan.warehouseId`, `PurchaseOrder.warehouseId` (expected
destination). Conversions inherit: order → challan → bill, and
the billing desk's draft prefill carries it. Quotations stay
location-free (§12.3) — a quotation draft hands the desk no
warehouse.

**Desks.** Billing: a warehouse picker in the builder; product
quantities, cart validation and the availability warning all read
AT the bill's warehouse (the promise partition — the source
document's own promise is added back only when it promises at
this warehouse); held bills resume at their warehouse. Purchases
modal, adjustment modal, sale-order form, challan form, PO form
and the PO receive panel (preselected to the PO's destination)
all carry the picker. Pickers ride their host surface's existing
matrix rows (G-C1) — the cashier picks a warehouse for every bill
even though the `warehouses` row grants them no surface.

**The Warehouses surface** (`/warehouses`, nav under Manage):
warehouse CRUD (the default cannot be archived until another is
made default; exactly one default at all times), per-warehouse
stock table (on hand / promised / available / value — derived,
never stored), and the §1.7 drift story: `stockDrift` lists any
product whose rows disagree with its total, and **Recount**
rewrites ROWS ONLY (the default row absorbs the difference; no
journal entry, no fabricated history — rows are operational
detail under totals the journal corroborates).

**RBAC + rules.** New matrix row `warehouses`: owner/manager
full, cashier none, accountant read. Rules gained ADDITIVE
blocks only (+34 lines, before the Expenses block): `warehouses`
(read `canAccess` — picker names are reference data, G-C1;
create/update owner+manager; delete owner) and `stockLevels`
(read `canAccess`; create/update `canAccess` — G-C2: rows ride
every stock-moving batch and rules cannot decompose a batch;
the block carries the R-B6 do-not-tighten warning; delete
owner). The B6 harness check was amended to strip-and-hash:
removing the C1 blocks reproduces the pre-C1 file byte-for-byte
(SHA 73177ac0…), proving no existing line changed. **Rollout:
publish the new rules with the Phase B/C release as usual —
existing shops additionally run `stockV1` automatically on the
owner's first sign-in.**

**Verification.** Harness **690/690 ALL SUITES GREEN** (644 prior
+ C1 46: migration identity + idempotence + skip-whole, frozen
seed identities + SHA, resolution rule, the every-path workload
with the drift detector asserted silent after each movement,
journal byte-stillness, the promise partition reproducing B2's
globals, drift injection + recount repair, RBAC row, i18n
parity, source invariants, rules strip-hash). `npx tsc --noEmit`
0; `npm run build` and `npm run build:static` exit 0
(`/warehouses` route shipped; bundle contains `dukan-8246`;
'Demo' tokens 26 == the B6 baseline — zero new). i18n now
**1,628 keys, EN ≡ UR** (45 new: the `wh.*` part +
`nav.warehouses`). Not packaged — packaging is the Phase B/C
release step.

## Phase C · C2 — Stock transfers (design: ERP-PHASE-C-DESIGN.md §2)

**Model.** New collection `stockTransfers` + the `TR-` series
(additive `SeriesId` member, prefix override through the owner
doc's `docSeries` like every series; the Settings numbering list
gained the label). A transfer is a **movement document** between
two of the shop's own warehouses: lines carry quantities only
(`qtySent` + `qtyReceived`, the name snapshotted) — no prices, no
totals, no tax, because a transfer moves no value. Status is the
§2.2 cached label over the line derivation (`draft` →
`dispatched` → `partially_received` → `received`, plus `returned`
and `cancelled`); the derivation, never the label, gates what may
still be received. Drafts are freely editable/deletable and burn
no numbers — `TR-` mints at dispatch.

**Flows.** All store actions gate on the `warehouses` matrix row
(owner/manager write; design §6.1 — the row governs transfers)
and validate through `lib/transfers` BEFORE composing any write:
same-warehouse / missing / archived routes and malformed lines
refuse at create/update; **over-receipt refuses pre-composition**
at receive. **Dispatch** drops the source warehouse's stock rows
by `qtySent` in the same batch as the document — product totals
do NOT change and **no journal entry exists**: the goods are on
the road. **In-transit is a derived quantity** (Σ over open
transfers of `qtySent − qtyReceived`, `lib/transfers`), belonging
to no warehouse's availability; the warehouses stock view gained
the derived **Incoming** column (goods on the road TO the viewed
warehouse) per §8. **Receives** (partial, any number of times)
raise the destination rows and the lines' `qtyReceived` — the
transfer's own event record. **Return-to-source** lands whatever
is still on the road back at the source rows; what already
arrived stays. A dispatched transfer cannot be edited or
cancelled — its exits are receive, return, close-short.

**The one posting.** Closing short books the proven shortage as
a stock loss in the close batch, through the guarded choke
point: `refType: "transfer_loss"`, **Dr `inventory_loss` /
Cr the product's class account**, at `short × costPrice` (the
current shelf cost, the F-4 convention), with the shorted
products' `stockQty` dropped by the shortage in the same batch —
restoring §1.3's identity (Σ rows + in-transit == stockQty) with
the loss inside the ledger. The composition lives in
`lib/transfers.buildTransferLossEntry` through the real
`makeEntry` guard (the store still carries exactly its 24
pre-C2 `makeEntry` calls — no new inline posting path). The
credit account resolves through the `inventoryAccountFor` seam:
every product resolves to `inventory` today (the class flag is
C3), and the seam already answers `inventory_raw` for a
raw-class product, so C3's generalisation adopts it unchanged.
**Period locks (§2.5):** dispatch/receive/return are document +
row writes and are NOT period-gated (a transfer dispatched
before a lock is received after it); the loss is a journal
create dated **today**, so a locked today refuses the close
with it and the transfer simply stays open (the desk surfaces
`fin.period.lockedError`).

**C1 surface amendments.** `lib/stock`'s drift detector and
recount grew the transfers parameter the C1 code anticipated:
the identity they check/repair is now Σ rows + in-transit ==
stockQty, so an open transfer's road stock is never misread as
drift, and a recount absorbs only true drift at the default row
(in-transit quantities are documents, never touched). Both keep
their pre-C2 call shapes (the parameter defaults to none), so
every C1 reading is unchanged for a shop with no transfers. The
store's recount passes the live transfers.

**Print.** `TransferPrintSheet` (in `DocPrintSheet.tsx`, the B6
sheet family): quantities only — sent and received columns, the
route, dispatch/received signature lines; no prices or amounts
can appear on it. Language-aware like every sheet.

**RBAC + rules.** Rules gained ONE additive block (+16 lines,
after the C1 `stockLevels` block): `stockTransfers` — read
`canAccess`, create/update/delete `hasRole(owner, manager)`,
and deliberately **no period backstop** (the doc posts nothing;
its one loss is guarded at the journal match, §2.5). The C2
harness proof strips the block and reproduces the pre-C2 file
byte-for-byte (SHA 21582bd1…). **Rollout: publish the rules
addition before/with the Phase C release as usual** — existing
shops need no migration (the collection starts empty; the demo
storage bump v11 → v12 is demo-only).

**Demo seed (§10.3).** One DRAFT transfer (Main → Godown, two
lines) as discoverability flavour — it has dispatched nothing,
so no rows move, no number is minted and the frozen seed journal
is untouched; the production seeder never pushes the collection.

**Verification.** Harness **739/739 ALL SUITES GREEN** (690 prior
+ C2 49: series/no-burn, composition + route refusals, dispatch
journal byte-stillness with the seed SHA re-pinned, in-transit +
incoming exactness, partial sums, over-receipt refusal, the
close-short posting to the paisa + identity restored, full-
receipt zero-journal, return-to-source, the §2.5 lock scenario,
the class seam, transfer-aware drift + recount, the demo draft,
RBAC, i18n parity, source invariants, rules strip-hash). No
prior suite was amended. `npx tsc --noEmit` 0; `npm run build`
and `npm run build:static` exit 0 (`/stock-transfers` route
shipped; bundle contains `dukan-8246`; 'Demo' tokens 26 == the
B6/C1 baseline — zero new). i18n now **1,702 keys, EN ≡ UR**
(+74: the `tr.*` part incl. `nav.stockTransfers`, plus the
numbering-settings label). Not packaged — packaging is the
Phase C release step.

## Phase C · C3 — Product class & BOM (design: ERP-PHASE-C-DESIGN.md §3 + §4.1)

**The class split (§4.1).** `Product.stockClass` (`"raw"` =
raw material; absent/null = goods) decides which GL account
holds a product's stock value: `inventory_raw` or `inventory`.
Every stock-value template in the store now resolves its
inventory leg through `inventoryAccountFor(product)` (the seam
C2 planted in `lib/transfers` for the transfer loss) or splits
it per class through `classLegLines(total, rawShare, side)`
(new in `lib/ledger`: goods share = the residual, so the parts
sum to the total to the paisa). The generalised paths are the
design's closed list, audited one by one: purchase receipt
(the leg splits over the tax composition's per-line NET bases —
a mixed purchase splits, the `purchases` clearing lines, the
`tax_input` leg and the gross payables leg never change), bill
COGS (split over the priced lines' cost snapshots), counter
sale, sale return / bill void (mirror of the bill split),
purchase return (split over the per-item nets), adjustments —
`buildAdjustment` is the single funnel for the adjustment desk,
quick adjust, product-create opening stock and product-form
stock edits — the product-form cost revaluation (booked against
the class account the stock sits in before any flip), and the
CSV import's aggregate opening entry (split by the imported
products' classes; the CSV gains an optional `stockClass`
column, exported back for round-tripping). The transfer loss
already credited through the seam since C2 and needed no
change. **Tax legs never change anywhere** — the class split
touches only the inventory leg. Two paths on the design's list
post nothing and so had nothing to generalise: product DELETE
is refused while stock is on hand (F-4(d) — the write-off flows
through the form's stock edit, i.e. `buildAdjustment`), and
day close reads money-account balances only (no inventory
figure exists in its composition). With **no raw products** in
a shop, every generalised template emits exactly its pre-C3
lines — the regression gate, proven at template level in the
harness (the generalised purchase entry with zero raw share is
byte-identical to the legacy composition) and by the full prior
harness passing.

**Class change = one reclass entry.** Changing a product's
class in the product form (gate: the `inventoryManage` row, as
designed) with stock on hand posts exactly ONE entry —
refType `"reclass"`, refId the product — moving
`qtyAfter × finalCostPrice` between the class accounts (the
A §1.6 true-up form), composed by `buildReclassEntry` in
`lib/transfers` (the C2 pattern: the store gains no new
makeEntry call site — still 24). It lands in the same batch as
the flag write, after the same edit's adjustment/revaluation
entries, so both class identities hold exactly after any
combination. At zero stock or zero value it is a bare flag
flip and posts nothing; a negative on-hand quantity reclasses
as the mirror image. The form warns before saving when a flip
will post (with the amount). Warehouse rows never move — the
goods changed accounts, not buildings. Raw products remain
sellable at every desk (their COGS credits `inventory_raw`);
the pickers (billing, counter, document lines, purchase
receiving) and the inventory list MARK raw products with a
badge/suffix but never hide them.

**BOM — recipes (§3).** New `boms` collection and a
Manufacturing surface (`/manufacturing`, nav in the manage
group, gated on the `manufacturing` matrix row: owner/manager
write, accountant read-only, cashier no view). A BOM is a
single-level recipe: an output product (never raw-class), a
batch size, component lines (raw OR goods products — a
goods-class component is consumed at its shelf cost like any
other; multi-level explosion stays out of scope), and declared
per-batch labour/overhead defaults for the C4 issue desk. It
posts nothing and carries no tax. **Versions are immutable:**
saving always mints version n+1 and deactivates n in the same
batch (`saveBomVersion`, validation by `lib/boms` before
anything is composed — self-component, raw output, empty
recipe, unknown products and bad quantities are refused whole).
Superseded versions stay readable in the surface's history;
the surface also shows each active recipe's standard batch and
per-unit costs (derived at current shelf costs) and a
raw-materials strip. Store action and helpers are shared with
the harness (`lib/boms`: draft validation, version arithmetic,
standard costs).

**Rules (additive only, publish before the C3 build).** One new
match block after the C2 block: `boms` — read `canAccess`,
create/update/delete `hasRole(owner, manager)`, and
deliberately **no period backstop** (a recipe posts nothing,
§7). The harness proof strips the block and reproduces the
pre-C3 file byte-for-byte (SHA fbacf298…). No existing line
changed; the `products` stockQty carve-out is untouched (the
class flag rides the product doc the rules already govern).

**Demo seed (§10.3).** Demo storage v12 → v13. One demo BOM:
the bulk rice (p25) repacked into 1 kg retail packs (p02) —
one 5 kg bag + Rs 100 labour + Rs 50 overhead per batch of 5.
The demo state marks p25 raw (`demoSeedProducts`, demo only):
`getSeedProducts` itself stays class-free, so a fresh
production seed carries NO raw products and its journal is the
frozen one; the production seeder never pushes `boms`. Known
demo-only wrinkle, by construction of §10.3 + the frozen seed:
the demo journal's opening books p25's seed value inside
`inventory` (the frozen composition knows no classes), so the
demo sandbox's class split of the SEED figure is presentational
only — the first demo posting against p25 (a purchase, a sale,
a class flip) composes through the generalised templates
exactly as production does.

**Verification.** Harness **795/795 ALL SUITES GREEN** (739
prior + C3 56: the resolver + split helper incl. the paisa
final-absorb case, the byte-identical no-raw template proofs,
raw/mixed purchase legs with tax untouched, the sale/counter/
return/purchase-return mirrors, the reclass builder (with
stock / at zero / negative / identities after), a replayed
mixed workload pinning both class GLs to their per-class
movements with trial balance 0, BOM validation + versioning +
standard costs, the demo seed + class-free fresh seed, RBAC,
i18n parity, source invariants, rules strip-hash). Two prior
harness lines were amended, both in the established style: the
C2 suite's dictionary-total check moved 1,702 → 1,752 (same
EN ≡ UR parity assertion; the dictionary grew by the C3 keys).
`npx tsc --noEmit` 0; `npm run build` and `npm run
build:static` exit 0 (`/manufacturing` route shipped; bundle
contains `dukan-8246`; 'Demo' tokens 26 == the pre-C3 baseline
— zero new). i18n now **1,752 keys, EN ≡ UR** (+50: the `mfg.*`
part incl. `nav.manufacturing` = 44, plus 6 product-class
strings in `inv.*`). The Phase A account labels for
`inventory_raw` and `wip` were verified present in both
languages (§8 — no bug). Not packaged — packaging is the
Phase C release step.

## Phase C · C4 — Production orders (design: ERP-PHASE-C-DESIGN.md §4)

**Model.** The order document carries a deep-copied recipe
SNAPSHOT taken at creation (BOM id + version stamped; later
BOM versions never re-cost an open order — §3.2/R-C4), the
output product, ONE warehouse (production happens at the
order's warehouse; no cross-warehouse orders), the planned
quantity and an append-only event subledger (`issue` /
`completion` / `scrap` / `closeout`). Numbers mint at open
under the new `PR-` series (drafts stay unnumbered and burn
nothing; §6.3). The stored status is derived from the events
on every write (draft → open → completed / cancelled).

**Events** — one atomic balanced entry each, through
`guardPostings` → `postEntry`, dated today; all composition
lives in `lib/production.ts` (the store's `makeEntry` count
stays 24):

- **Issue** (`production_issue`, refId the order): Dr `wip`
  = materials + labour + overhead; components credited at
  current shelf `costPrice` to their CLASS account
  (`inventory_raw` / `inventory` via `inventoryAccountFor`,
  one line per component, ref'd to the product); component
  totals and the order warehouse's `stockLevels` rows drop
  together in the same batch.
- **Completion** (`production_complete`): Dr `inventory` /
  Cr `wip` at the absorbed value; finished units land in the
  order warehouse's row, and the output product's `costPrice`
  updates to the absorbed unit cost.
- **Scrap** (`production_scrap`): Dr `inventory_loss` /
  Cr `wip`; no stock movement (spoiled output was never
  finished stock). Closing a live order posts its residual
  pool the same way (a `closeout` event; §6.4) and lands the
  order `completed` when it produced, else `cancelled`.

**Absorption (F-3 discipline).** Cumulative average with
FINAL-ABSORB: a partial completion takes
`round2(pool × qty / remaining plan)`; reaching or passing
the plan — or an explicit finish flag — absorbs the whole
pool, so a completed order's pool is EXACTLY 0 and
Σ issues == Σ completions + Σ scraps + Σ closeouts to the
paisa (harness-proven, incl. the 33.33 + 33.34 + 33.33 == 100
case; over-production spreads the whole pool over the extra
units). The pool can never go negative; completions and
scraps against an empty pool, issues beyond the order
warehouse's rows, zero-value issues, and paid settlements
with no money account all refuse BEFORE composition.

**Q3 settlement (owner decision).** Labour + overhead per
issue default to PAID from a money account (Dr `wip` / Cr
the account's GL bucket, ref'd to the account) and flip per
issue to accrue → Cr `salary_payable`. The desk preference
(mode + preferred account) is stored in settings
(`productionSettlement` / `productionAccountId`), the issue
form can remember a changed choice, and a zero conversion
cost posts no settlement line at all.

**Surface.** /manufacturing gains a production-orders
section: cards with derived planned / produced / remaining /
pool / absorbed-unit-cost figures, snapshot + event-log
detail, issue / complete / scrap / close forms whose
previews compose through the same lib functions the store
posts with (desk and journal cannot disagree), cancel only
while an order has no events, and a print sheet following
the established document pattern. The desk rides the
`manufacturing` RBAC row (owner/manager write · accountant
view · cashier none).

**Repair folded in.** C3 shipped the `boms` collection with
a write path but no live `onSnapshot` subscription — a cloud
shop's recipe list would never populate. C4 adds the one-line
`sub<Bom>` subscription alongside `productionOrders`' own;
production reads recipes from the store, so C4 could not
work in cloud mode without it.

**Rules (additive only — publish before the build).** +9
lines: `productionOrders` read `canAccess`, create/update/
delete owner/manager (§6.2); NO `createInOpenPeriod` on the
order doc (its events' entries are guarded creates at the
journal). Proven additive: stripping the C4 block reproduces
the pre-C4 file byte-for-byte (SHA-pinned in the harness).

**Demo seed.** Storage v13 → v14; one DRAFT production order
against the demo recipe (two batches planned, unnumbered, no
events) — zero journal footprint; the frozen seed identities
and journal SHA are re-verified unchanged.

**Verification.** Harness **870/870 ALL SUITES GREEN** (795
prior + C4 75: the snapshot discipline, the full worked
production — issue split per class account with labour paid
from the till → partial completion → scrap → final
completion, GL `wip` == Σ pools at every step, the roll-up
to the paisa, costPrice updates, the §1.3 quantity identity
throughout — the accrued scenario with its nothing-produced
closeout, over-production spread, closeout residual exact,
the paisa scenario, the refusal set, PR- numbering, the demo
draft seed + frozen ground, RBAC, i18n parity, source
invariants, rules strip-hash). Two prior harness lines were
amended, both in the established style: the C2 suite's
dictionary-total check moved 1,752 → 1,839, and the C3
suite's mfg-part count 44 → 130 (same parity assertions; the
dictionary grew by the C4 keys). `npx tsc --noEmit` 0;
`npm run build` and `npm run build:static` exit 0 (bundle
contains `dukan-8246`; 'Demo' tokens 26 == the pre-C4
baseline — zero new). i18n now **1,839 keys, EN ≡ UR** (+87:
86 production keys under `mfg.*` + the `PR-` series label in
Settings). Not packaged — packaging is the Phase C release
step.

## Phase C · C5 — Job tracker (design: ERP-PHASE-C-DESIGN.md §5) — Phase C finale

**Model.** A job is a work-order card (customer snapshots,
title/description, ONE warehouse, due date, declared labour)
plus an append-only material-event subledger. Numbers mint
AT CREATION under the new `JB-` series (§5.1's stated
exception to drafts-burn-none: the customer walks away with
the number on a slip, so there is no job draft state). The
stage is a NAME from the owner's `jobStages` settings list
(Settings editor: one per line; defaults Received / In
Progress / Ready / Delivered); the lifecycle status derives
from the stage position on every write (first ⇒ open, middle
⇒ in_progress, last ⇒ ready), with `delivered` / `cancelled`
terminal and sticky — set only by their explicit actions or
by a citing bill's posting. A job whose stage was renamed
away keeps its stage name and reads in_progress once it has
material events. The warehouse is immutable once material
events exist (a return must land where its issue left from).

**Material events** — one atomic balanced entry each,
through `guardPostings` → `postEntry`, dated today; all
validation, valuation and composition lives in `lib/jobs.ts`
(the store's `makeEntry` count stays 24):

- **Issue** (`job_material`, refId the job): Dr `cogs`
  (ref: job) / Cr the product's CLASS inventory account
  (`inventoryAccountFor` — raw → `inventory_raw`, goods →
  `inventory`, one line per component, ref'd to the product)
  at current shelf `costPrice`. Component totals and the job
  warehouse's `stockLevels` rows drop together in the same
  batch. NO job WIP account exists (§12.3): the material is
  consumed cost of work sold, and a job's output is a
  deliverable, not stock — work that manufactures stock is a
  production order (§4).
- **Return** (`job_material_return`): the exact mirror,
  validated against the job's own net-issued quantity per
  product.

Refusals are pre-composition (nothing written): insufficient
stock AT THE JOB'S warehouse (another warehouse is never
reached for), over-return, zero-value event, events on a
delivered/cancelled job, empty/unknown/bad-qty picks;
duplicate picks merge into one valued line.

**Advances (owner Q2 — POOLED).** A job advance is an
ordinary customer repayment wearing a job-citing note
(`Advance — Job JB-n`). The job surface calls the EXISTING
`addRepayment` machinery (cheque capture included, riding
the B5 instrument path) — zero new money machinery, no job
field stores money, and the journal diff of an advance is
exactly one repayment entry, identical to a plain
repayment's modulo the row it cites (harness-proven: the
entry carries no job reference at all). The advance sits in
the customer's pool (negative receivables) and the job's
bill absorbs it through the ordinary F-6 lot.

**Job → bill (§5.4).** "Bill this job" prefills the desk
through the B1/B2 conversion seam (`Bill.sourceType: "job"`
+ sourceId): customer carried, NO lines (the desk composes
the charge lines freely), the job's warehouse carried. The
citing bill posts exactly once through `postBill` —
template-identical to a direct bill — and flips the job to
`delivered` inside postBill's own batch. At the desk, the
job's already-issued materials (net of returns) are LISTED
above the cart (R-C7) so they are never billed twice. A
resumed held job-bill restores its citation and label.

**Profit (§5.5)** is a derived report, defined once in
lib/jobs: revenue = Σ totals of the POSTED bills citing the
job (held/voided/direct bills contribute 0); materials =
Σ job_material − Σ returns at event snapshots; billCogs =
the citing bills' OWN line COGS from their unitCost
snapshots; profit = revenue − materials − billCogs −
declared labour. An unbilled job reports revenue 0 and
profit == −(materials + labour).

**Gates compose per action (§5.6, G-C3).** Card/stage/
material actions ride the PRE-DECLARED `jobTracker` matrix
row EXACTLY as it stands — owner/manager write, cashier AND
accountant read-only (G-C4: the matrix was NOT flipped; the
design flags that as an owner option for the rollout note).
The advance action gates on `creditRepayment`, "Bill this
job" on `billing`. The store re-enforces every gate.

**Surface.** /jobs: cards (number, title, customer, stage +
status, due date with overdue flag, warehouse, materials /
billed / profit figures, advance total), expandable detail
(material log, advance rows by note, citing bills, the
§5.5 figure row), stage picker, issue/return desks whose
previews compose through the same `prepareMaterialEvent`
the store posts with, the advance modal, deliver/cancel
with confirm, and the work-slip print (`JobPrintSheet` on
the shared receipt sheet: number, customer, work, stage,
due date, warehouse, material events, net materials,
labour, received-by line) — the slip the customer takes at
intake carries the JB- number minted at creation.

**Rules (additive only — publish before the build).** +20
lines: `jobs` read `canAccess`, create/update/delete
owner/manager (§6.2); NO `createInOpenPeriod` on the job
doc (its material entries are guarded creates at the
journal). Proven additive: stripping the C5 block
reproduces the pre-C5 file byte-for-byte (SHA-pinned in the
harness: 94077e04…f81b404).

**Demo seed.** Storage v14 → v15; one OPEN job (JB-1, the
seed's first customer, "Wedding cards × 500", first stage,
no material events, no advance, no labour) — zero journal
footprint; the frozen seed identities and journal SHA are
re-verified unchanged.

**Verification.** Harness **931/931 ALL SUITES GREEN** (870
prior + C5 61: the stage lifecycle incl. sticky terminal
states and renamed-away stages, JB- numbering, the
mixed-class issue/return with rows + totals + GL moving
together and GL `cogs` == the job's materials cost to the
paisa, the refusal set, the pooled-advance identity —
journal diff == exactly one plain repayment entry, pool at
−2,000, the citing bill's F-6 lot absorbing it to
total − advance — the citation discipline for revenue, the
§5.5 profit hand-computed over a mixed scenario
(3,000 − 320 − 700 − 500 = 1,480) and the unbilled job at
−820, the demo seed + frozen ground, RBAC as declared,
i18n parity, source invariants, rules strip-hash). One
prior harness line was amended, in the established style:
the C2 suite's dictionary-total check moved 1,839 → 1,958
(same parity assertion; the dictionary grew by the C5
keys). `npx tsc --noEmit` 0; `npm run build` exit 0
(`/jobs` in the route table); `npm run build:static` exit 0
(bundle contains `dukan-8246`; 'Demo' tokens 26 == the
pre-C5 baseline — zero new). i18n now **1,958 keys,
EN ≡ UR** (+119: 118 job keys incl. `nav.jobs` + the `JB-`
series label in Settings). Not packaged — packaging is the
Phase C release step, which also carries the rules (v6).

## UI/UX overhaul (owner directive, 2026-10-22)

Presentation & interaction ONLY — no posting logic, journal/store
semantics, lib derivations, types, rules or data changed; every
store action keeps its exact signature and every figure comes from
the same calls as before. Gates: harness **931/931** (zero
invariant adjustments), tsc 0, `build` 0, `build:static` 0, bundle
contains `dukan-8246` + all routes, 'Demo' tokens 26 == baseline.
i18n grew by 15 keys (billing picker/cart-bar + no-results strings
for sales/docs/transfers/manufacturing + `action.clearSearch`),
EN ≡ UR by construction.

- **Billing (the flagship)** — POS two-pane desk: LEFT = product
  search + instant results + held bills; RIGHT = a sticky cart
  card (customer, lines with inline qty steppers, discount,
  payments) whose pinned foot carries subtotal/taxes/grand total +
  Complete/Hold — always visible, zero scrolling. Adding a product
  is now type → click (or ↑↓ + Enter) = in cart; the old
  search → open dropdown → select → click Add sequence and the
  separate Add button are gone everywhere (billing, document
  lines, transfers, BOM components, sales counter). SKU/barcode
  Enter still adds directly. On completion the receipt opens
  IMMEDIATELY in a modal (same `.receipt-sheet` — print output
  unchanged) with Print / 80mm / WhatsApp / New bill in the header;
  the "receipt is below" flow and its copy are gone. On mobile the
  cart collapses to a sticky bottom bar (total + item count + View
  cart) opening the cart as a bottom sheet. Held resume opens the
  sheet; conversions (order/challan/quotation/job, incl. the job
  materials list) render in the left pane as before.
- **Reports** — the screen-filling catalogue grid is gone. One
  compact STICKY toolbar: the 13 reports as horizontally
  scrollable chips, range presets as chips, output-language +
  per-report filters, period + Print/Save-PDF/Share/WhatsApp —
  the selected report renders immediately beneath; the toolbar
  stays pinned while the report scrolls. Print/share still go
  through the same browser print pipeline + text summary builders.
- **Every other screen** — shared picker component
  (`ProductResultList` in ui.tsx) with in-cart quantity badges and
  proper listbox semantics; every search box gained a clear (×)
  affordance (all searches still delegate to `lib/search.ts`);
  list toolbars/action rows are sticky (`.toolbar` is sticky
  globally; `.sticky-bar` on Documents ×4, Notes, Cheques, Jobs,
  Transfers, Warehouses, Manufacturing headers); long tables get
  sticky header rows; modal action bars are sticky so Save is
  always reachable in long forms (product/supplier/customer/
  expense modals). Settings reviewed — its forms are short cards
  with the save row adjacent, left as-is. No new UI library, no
  new fonts, no colour change; RTL/Urdu layout uses logical
  properties throughout the new CSS.

## Live-audit fixes (independent live-account audit, 2026-10-22)

Five fixes from the browser audit + full transactional test on the
owner's LIVE (seed-data) account. Derivations and display only —
no posting template, no journal write, no rules change; the frozen
seed journal is byte-identical (21 entries · Inventory 272,805 ·
Cash 50,000 · TB 0 · SHA e17e5bda…1168 all still pinned green).
Gates: harness **968/968** (931 prior + 37 new FIX checks; the
UX overhaul's three stale i18n count pins — tr 73→74, mfg 130→131,
total 1,958→1,969 — were amended to the measured counts in the
established style, then this increment's +23 keys take the total
to **1,992 EN ≡ UR**), tsc 0, `build` 0, `build:static` 0, bundle
contains `dukan-8246`, 'Demo' tokens 26 == baseline.

- **Fix 1 — P&L revenue vs Sales-report revenue (the Rs 8,500
  gap).** Root cause, two layers. (a) The owner's live journal
  predates the F-7 template correction: a standalone udhaar of
  Rs 8,500 (seed credit `cr-1`, Haji Muhammad Saleem) was posted
  Dr receivables / Cr **sales_revenue**, so the journal's October
  revenue carries 8,500 that no bill, sale row or COGS supports —
  exactly the audit's gap (413,600 vs 405,100, COGS identical).
  The current template posts such udhaar Dr receivables / Cr cash
  (a loan, never revenue), so new shops never diverge; existing
  journals keep their history (append-only). (b) Structurally, the
  Sales report was the wrong side: it summed raw row totals,
  ignoring bill discounts, the F-2 ±Rs 1 payment rounding booked
  to `sales_discount`, inclusive tax inside prices, and returns'
  discount/tax shares — it could only agree with the P&L on
  discount-free, tax-free data. `salesReport` now rebuilds the
  journal's own two lines from the documents (bill discount +
  rounding and inclusive tax allocated pro-rata over the bill's
  rows with the tax engine's cumulative rounding; returns read
  off their documents' F-3/A4 identity; counter sales netted via
  the same slab resolution + formulas the counter posts with) and
  exposes `revenue`, `discounts`, `netSales` plus the explicit
  reconciling line: `otherRevenue` = P&L netRevenue − netSales,
  shown on screen, in print and in share text whenever non-zero,
  with `plNetRevenue` beside it. For document-only data
  `otherRevenue` is 0 and the two are EQUAL — proven over the seed
  and over a synthetic mixed workload (discounted + inclusive-
  taxed bill paid Rs 1 short, taxed counter sale, partial return,
  voided bill, held bill) where the report's revenue AND discounts
  equal the P&L's own lines, and a hand-added legacy 8,500 entry
  surfaces as exactly the labelled reconciling line. The Rs 375
  counter-sale case was a seed-construction artifact: bundled
  sale rows carried their file-generation-day `ts` while the
  journal summaries (and the counter page) bucket by `dayOffset`;
  the seed getters now re-base every day-bucketed row's `ts` onto
  its `dayOffset` day (time-of-day preserved), so `ts` and
  `dayOffset` name the same day by construction — the journal
  never read those `ts` values, so the SHA is untouched. Note:
  `grossProfit` in the sales report deliberately keeps its pinned
  row-margin semantics (the profitOnDay formula); the reconciled
  identity is the revenue line, per the audit finding.
- **Fix 2 — negative money-account warning.** `lib/ledger`
  `outflowPreview` resolves the account exactly as postings do
  (explicit id, else the method default) and reports balance /
  balance-after. A visible red negative-balance warning now sits
  on the Finance account cards, the Settings account list, and
  the Dashboard money snapshot (which names each negative account
  the bucket total used to hide). Expenses, supplier payments and
  transfers raise the shared `NegativeBalanceWarning` confirmation
  before posting whenever the outflow would drive its account
  below zero — a warning, never a block (informal overdrafts are
  real). Cheque-settled outflows never warn (they settle into the
  cheque accounts; the money account is charged at clearing). The
  seed's own −45,000 Wallet & Bank is reproduced in the harness.
- **Fix 3 — expense dates single-sourced.** Same seed artifact as
  the 375 case: the register grouped by `dayOffset` but displayed
  the frozen generation-day `ts`, while the cash book showed the
  journal's offset-based date (electricity 19 Oct vs 22 Oct, rent
  7 vs 10 Oct; a 19-Oct row grouped under "Today"). The register
  now groups AND labels by the expense's own PKT business date
  (`businessDateISO(ts)` — the date the journal carries), and the
  Fix 1 re-base makes seed expense dates equal their journal
  dates by construction. Harness: for every seed expense,
  register date == journal-entry date == cash-book row date.
- **Fix 4 — journal viewer + trial balance.** Finance gains a
  Journal section: entries newest-first (latest 100), each row
  showing date, memo, ref type, ΣDr / ΣCr and its balance badge
  (`entryBalances`), expandable to the Dr/Cr lines with localized
  account labels and resolved ref names. Reports gains the 14th
  report, **Trial Balance** (`lib/reports.trialBalance`, journal
  only): per-account period Dr/Cr totals + closing balances in
  chart order, the period and closing differences rendering as 0
  with a clear balanced state, bilingual print + share through the
  existing sheet. Both surfaces gate on `can(role, "finance",
  "view")` like the rest of Finance/Reports; read-only throughout.
- **Fix 5 — walk-in bill search.** `lib/search.billMatches` takes
  the localized walk-in label and matches a nameless bill by its
  RESOLVED display name (customerName || label), so typing
  "walk-in" or "عام گاہک" in bill history finds walk-in bills; a
  named bill never matches the label, and label-less calls keep
  the exact legacy behaviour (SEARCH suite untouched, still 72).

## Phase D · D1 — Declarations, employees & attendance (design: ERP-PHASE-D-DESIGN.md §1/§2.2/§6/§9 D1)

Phase D (HR & advanced finance) opens with the A1-pattern
declaration increment: every Phase D type is declared up front,
and the two non-posting surfaces — the employee directory and
the attendance register — land for real. **Nothing in D1 posts
a journal entry**: the store still carries exactly 24
`makeEntry` call sites (harness-pinned), and the increment's
money surface is a set of pure selectors.

- **Declarations.** Types: `Employee`, `AttendanceMonth` (+
  `AttendanceMark`), `PayrollRun` / `PayrollRunLine` /
  `PayrollPaymentEvent`, `Loan` / `LoanEvent` (with the §3.3
  events diary on the doc), all in lib/types. `JournalRefType`
  gains the seven Phase D members (`payroll_accrual`,
  `payroll_payment`, `salary_advance`, `loan_drawdown`,
  `loan_charge`, `loan_repayment`, `fy_close`) — declared,
  unposted. `SeriesId` gains `payrollRun` (default `PAY-`,
  minted at finalise in D2) and `loan` (default `LN-`, born
  numbered in D3), with the Settings prefix editor wired via
  `SERIES_LABEL` + two new `settings.series.*` labels.
  Settings gains `phaseD?: { hrV1 }` and the D5-declared
  `tallyLedgerNames?` (names-only Tally overrides).
- **The ONE new COA code.** `loans_receivable` (asset,
  debit-normal, `since: "D"`) joins the registry — 27 → 28
  codes, appended last, no existing code touched (the harness
  COA literal was amended in the established same-check style).
  Receivable loans deliberately do NOT ride `receivables`
  (§3.1): that account's subledger is the `credits` collection,
  and a journal-only loan line there would break the
  journal ≡ subledger identity (the F-5 drift shape). Its
  account label ships in both languages (`fin.acct.*`).
- **Employees — a new collection, NOT login staff** (§1.1).
  Most employees have no login; the lifecycles differ (deactivate,
  never delete); and payroll writers may not write the owner doc
  where `staff[]` lives. The doc is identity + current terms
  (pay basis monthly/daily, base amount, allowances,
  paid-leave days, optional informational `linkedUserEmail`
  that grants and gates nothing) — no balance, no totals
  (§1.2). Directory UI at `/staff` (Directory tab): sticky
  toolbar + null-safe search (`lib/search.employeeMatches`),
  add/edit modal (terms edits change future runs only — runs
  snapshot, §1.1), deactivate/reactivate, a detail modal, and
  delete for NEVER-USED employees only: the store's citation
  test (any attendance doc, payroll line, loan party link, or
  journal line carrying their ref) refuses otherwise (§1.5) —
  the test already covers the D2/D3 citations before they can
  exist.
- **Attendance — one doc per employee-month** (§1.3),
  deterministic id `${employeeId}__${yyyyMm}` (the stockLevels
  precedent). The register is a tap-to-mark grid (Directory /
  Attendance tabs on the one `/staff` route, per §2.8): sticky
  toolbar with month navigation, sticky name column + header,
  one tap cycles present → absent → half → leave → off →
  cleared, per-row derived summary at the row's end, no save
  button (each tap writes). It warns — never locks — when the
  viewed month already has a posted payroll run (the
  `hasPostedRunForMonth` selector; live from D2). Attendance
  posts nothing, ever, and ignores period locks (§7).
- **`lib/payroll.ts` pure core.** `attendanceSummary` (§1.3),
  `earnedBaseFor` (§1.4: monthly — only absence beyond the
  paid-leave allowance docks pay, pro-rata over calendar days;
  daily — rate × present + ½·half), the mark cycle, month-key
  helpers (PKT), and the §2.2 `salary_payable` composition:
  `employeePosition` (Σ debit−credit over lines carrying the
  employee's ref; positive = advances outstanding, negative =
  shop owes them) and `salaryPayableComposition` — per-employee
  positions + the UNASSIGNED bucket (ref-less lines: today
  exactly the C4 production accruals, never re-attributed)
  with the identity GL ≡ owed − advances + unassigned,
  harness-asserted to the paisa over a synthetic journal mixing
  employee refs with a verbatim C4-shaped ref-less accrual.
- **RBAC & rules.** The pre-declared A3 rows are consumed
  unchanged (`staffDirectory` F/F/N/R — G-D1 stands: cashiers
  cannot mark the register; Q2's one-cell flip remains the
  owner's call). Rules gain two additive blocks (+31 lines,
  497 → 528) with NARROWED reads — `employees`/`attendance`
  read = owner/manager/accountant via `hasRole`, deliberately
  NOT `canAccess` (salary data is not counter data, R-D9; the
  journal read gate is the precedent) — write = owner/manager,
  no period backstop (non-posting docs, §7). The harness strip
  proof reproduces the v6 file byte-for-byte (SHA `78df93ea…`).
- **Migration & demo.** `hrV1` is the lightest migration yet:
  on owner sign-in it sets `phaseD.hrV1` and nothing else
  (§10.1) — the collections are born empty and absence is
  meaningful. Fresh shops are born flagged in `seedNamespace`;
  the HR collections are NOT production-seeded (a real shop
  starts empty). Demo seed gains two employees (monthly
  salesman + daily helper) with the CURRENT (PKT) month's
  register marked to today — directory data only, zero journal
  footprint; `payrollRuns`/`loans` exist in the demo shape as
  empty collections (their discoverability docs arrive with
  D2/D3). Demo storage v15 → **v16**.
- **Verification.** Harness **1,006/1,006** (968 prior + 38
  D1): proration fixtures to hand-computed figures, the
  composition identity, attendance tallies/cycle, RBAC cells,
  seed identities re-asserted (journal 21 · Inventory 272,805 ·
  Cash 50,000 · TB 0 · SHA intact), rules strip proof. i18n
  **2,098 EN ≡ UR** (+106: 103 hr-part keys incl. `nav.staff`,
  the `loans_receivable` label, two series labels; the C2 total
  pin amended in the established style). tsc 0 · `npm run
  build` 0 · `build:static` 0 · bundle carries `dukan-8246`,
  the `/staff` route and the v16 storage key · 'Demo' tokens
  26 == baseline. Note: `npx eslint` currently crashes inside
  eslint-config-next's own config loader on EVERY file
  (untouched ones included) — pre-existing tooling breakage,
  not a D1 finding; the compile/build gates above are the
  operative checks.


## Phase D · D2 — Payroll runs, payments, advances, slips (design: ERP-PHASE-D-DESIGN.md §2)

- **Run lifecycle.** A run for a calendar month composes as a
  DRAFT from the directory + register through the real
  `buildRunLines` (the §1.4 proration snapshotted per line:
  counts, earned base, current allowances); drafts post nothing
  and burn no number. Desk overrides edit the line snapshots
  (allowances/deductions as label+amount rows; `payrollLineTotals`
  re-derives gross/net at every write, and the run's totals are
  always `payrollRunTotals(lines)`). **Finalise** mints the PAY-
  number and posts the accrual in the same batch; a second
  POSTED run for a month is refused pre-composition in the store
  (the one-posted-run guard); a reversed month may be re-run.
- **The accrual template (§2.4, as designed — net, never
  grossed).** ONE entry, `payroll_accrual` citing the run: per
  line with net > 0, Dr `expense_salary` / Cr `salary_payable`,
  both lines carrying `ref = employeeId`, at NET. Reducer
  deductions (fines etc.) never enter the journal — the slip
  prints gross → deductions → net; the ledger carries net. The
  plausible gross-up alternative stays rejected (no COA code
  exists for it; §2.4 records the reasoning).
- **Payments & the bucket.** A payment event (full or partial)
  posts Dr `salary_payable` (ref = employee) / Cr the resolved
  money account, appended to the run's `payments` in the same
  batch; the store caps it at the run's net less cash already
  paid. `employeeId: null` settles the UNASSIGNED bucket (C4
  production accruals) against any posted run, capped at the
  bucket's derived balance. **Advance recovery is a derivation,
  never a posting** (the design's stated correction): the
  §2.7 figures — advance before (position at the accrual
  entry, the run's own payments excluded), recovered =
  min(advanceBefore, netAccrued − cashPaid), paid, still owed —
  come from ONE selector, `runLineFigures`, used by the desk row
  and the slip alike; no third arithmetic exists.
- **Advances.** `giveSalaryAdvance` posts Dr `salary_payable`
  (ref = employee) / Cr money (`salary_advance`, refId =
  employee) — never an expense, never the customer khata. The
  employee card shows the position + the advance as a ratio-
  visible figure; the next run's composer surfaces it through
  the same figures (the desk's pay default is the run remainder
  NET of the derived recovery, so the common path settles the
  position exactly; paying up to the run's cash ceiling remains
  possible and carries the advance forward).
- **Reversals (§2.6).** A posted run reverses by ONE mirror
  entry (`payroll_accrual`, `reversesId` = accrual) + status →
  reversed, one batch; payments already made STAND (they sit as
  advance positions — harness-proven: a paid-then-reversed
  employee lands at exactly advance + payments). A single
  payment reverses likewise (mirror + a negative reversing
  event on the run; `paidForRun` nets it to zero). An
  already-mirrored payment/run refuses (the journal shows its
  mirror). Nothing is edited or deleted — posted history is
  append-only on both the journal and the events diary.
- **Slips.** `SalarySlipSheet` (DocPrintSheet, the receipt
  machinery — browser print is the Urdu-safe PDF route): shop
  header, PAY- number + month, attendance snapshot, earnings
  (earned base + allowances + gross), deductions, net accrued,
  the advances block (before / recovered / still outstanding),
  paid, still owed, signature line. Per employee from their
  employee card's salary history (runs citing them + slips) and
  from the run detail. Salary data stays narrowed: the Payroll
  tab gates on the pre-declared `payroll` row (owner/accountant
  write, manager READ — G-D2 stands, the manager hands out the
  slips), and the employee-detail advance action rides the same
  row, not `staffDirectory`.
- **Money warnings.** Payments and advances raise the shared
  `NegativeBalanceWarning` from `outflowPreview` before posting
  (warn, never block — the live-audit helper, reused verbatim).
- **Finance.** The §2.8 read figures landed as a composition
  card (owed to employees / advances outstanding / unassigned
  production labour / account balance, all from
  `salaryPayableComposition`), rendered when the account carries
  anything; the journal viewer describes the three new refTypes
  and resolves employee refs to names.
- **Rules.** ONE additive block (+27 lines, 528 → 555):
  `payrollRuns` — read narrowed to owner/manager/accountant
  (NOT canAccess — salary data), create owner/accountant +
  `createInOpenPeriod`, update owner/accountant (payment events
  are updates by doctrine; their journal creates carry the lock
  guard, so a locked-period payment fails its batch whole),
  delete owner-only with drafts-only enforced in the store. The
  harness strip proof reproduces the D1-state file byte-for-byte
  (SHA `00d810df…`); the C2–C5 segment checks were re-pointed at
  the next block's marker (their span legitimately contains the
  D2 block, whose backstop is by design) — same assertions, own
  block only.
- **Demo & regression.** The §10.3 demo draft arrives: one
  DRAFT run for the current month composed by the real composer
  from the two sample employees + register (unnumbered, no
  accrual, no payments — zero journal footprint; the production
  seeder still pushes no HR collections). Shops with no
  employees see no change: Phase D posts nothing until a run
  finalises. The §7 discipline hint (payroll people are paid
  through payroll, never also via Expenses' salary category)
  sits on the Payroll tab.
- **Verification.** Harness **1,054/1,054** (1,006 prior + 48
  D2): composition snapshots to hand-computed figures, the
  accrual's shape (net per employee, refs, Σ == run net, the
  500 reducer and the gross NOWHERE in the entry), the
  guard/caps as store-source proofs, partial-payment arithmetic,
  the advance → accrual → payment slip figures to the paisa,
  the composition identity asserted after EVERY step of a mixed
  sequence (advance + C4 ref-less accrual + accrual + partial
  payment + bucket payment + run reversal — GL ≡ Σ employees +
  bucket throughout), trial balance 0 at each stage, reversal
  cleanliness (positions restored; payments standing as
  advances), period-lock refusal for backdated accrual/payment
  through the real `preparePosting`, RBAC cells, the demo draft,
  rules strip proof. i18n **2,212 EN ≡ UR** (+114: 84 pay.* +
  20 slip.* + the payroll tab chip + 9 fin keys; the C2 total
  pin and the D1 hr-count/purity pins amended in the
  established same-check style). tsc 0 · `npm run build` 0 ·
  `build:static` 0 · bundle carries `dukan-8246` and the
  `/staff` route · 'Demo' tokens 26 == baseline.

## Shell, theme & polish (owner directives + live-audit defects, 2026-10-22)

Presentation/shell only — no posting logic, derivation semantics,
store, types or rules changed (one display-scope exception, fix A).
Gates: harness **1,054/1,054 ALL SUITES GREEN** (the two i18n total
pins amended 2,212 → 2,214 in the established same-check style for
the +2 keys below) · tsc 0 · `npm run build` 0 · `build:static` 0 ·
bundle carries `dukan-8246` · 'Demo' tokens 26 == baseline · demo
storage unchanged (v16) · print output unchanged (the print block
still hides all screen chrome and shows only `.receipt-sheet`,
whose colours are hard-coded).

- **Calm themes.** Both palettes recalibrated through the CSS
  tokens in `app/globals.css`, emerald identity kept. Light:
  `--bg #F6F4EE → #F7F5EF`, `--card #FFFFFF → #FDFCFA` (warm
  off-white, no pure white anywhere), `--card-2 → #F4F1E9`,
  `--line` alpha .13 → .10, card shadow flattened
  (`0 6px 24px/.07 → 0 2px 10px/.05`), accent `#0E7C4A → #0E7A4B`,
  amber `#D97706 → #C77414`, danger `#B91C1C → #B23A34`; body text
  `#20302A` / `#45584F` on the card ≈ 13:1 / 7:1 (≥ AA). Dark:
  green-black → desaturated blue-grey charcoal (`--bg #0C120F →
  #15181D`, `--card #16211B → #1E242C`, `--card-2 → #242B34`),
  text `#EAF4EE → #E9EDEF` (soft off-white, ≈13:1 on card), accent
  desaturated `#34D399 → #43A97E` (accent-text `#6EE7B7 →
  #83C7A8`), amber `#FBBF24 → #E3AC4E`, line/chip tints re-based
  from green to blue-grey, shadow `0 8px 28px/.45 → 0 3px 14px/.32`.
  The sidebar stays deep emerald in both themes, its gradient
  flattened (`#0C4230→#082E21` becomes `#123E2E→#0D3325`) and its
  active mint muted (`#A7F3D0 → #A9E8CB`).
- **Minimalist pass.** Cards are flat (hover lift + deepening
  shadow removed; a quiet border shift remains), buttons and
  toggles no longer translate on hover, primary/amber button
  shadows softened, `--radius 16px → 14px` with the modal and chat
  shells at 18px, so the radius rhythm is uniform.
- **Shell restructure.** The sidebar footer block is deleted:
  `Sidebar` is brand + navigation only (airier nav: group gap
  18 → 26px, link padding 10 → 11px, wider nav padding). The slim
  sticky `.topbar` now renders at EVERY width inside `.app-main`:
  burger (mobile) / collapse toggle (desktop) + shop name + demo
  badge at the start; at the end cluster — `LangToggle`,
  `ThemeToggle`, account-holder email, and a compact logout
  button (icon-only under 560px; email hides under 720px as
  before). `--stick-top` re-based 12px → 70px so sticky toolbars
  park beneath the 57px header; print still hides the bar.
- **Fix A — money-account scope unified (display only).** Root
  cause: the Finance/Settings cards rendered the legacy account's
  PER-ACCOUNT balance (`moneyAccountBalance` — journal lines
  resolving to that account only) under its name, while the
  header, cash book, journal and trial balance render the GL
  BUCKET (`accountsBucketBalance` / `walletBalance`). A cheque
  cleared into the separate Bank Account (+300, ref = that
  account) moved the bucket to −44,700 while the "Wallet & Bank"
  card stayed at −45,000. Now a legacy account's card/row headline
  IS the bucket total, with a per-account breakdown (each bucket
  member's own balance, negatives in danger colour) beneath it —
  new i18n key `fin.acct.bucketBreakdown`. The dashboard
  negative-balance warning uses the same display figure for the
  account it names. Derivations untouched.
- **Fix B — reports toolbar sticky.** Root cause (shared with C):
  `overflow-x: hidden` on both `html` and `body` made body a
  scroll container that never scrolls (its box grows with its
  content), trapping every `position: sticky` descendant. Fixed
  with `overflow-x: clip` (identical clipping, no scroll
  container; `hidden` remains as the fallback declaration for
  engines without clip). `.rep-toolbar` now stays pinned while
  the report scrolls.
- **Fix C — inventory toolbar + header sticky.** The toolbar is
  the shared `.toolbar`, unblocked by the same clip fix. The
  table header was additionally trapped by `.table-wrap`'s
  `overflow-x: auto` (the wrap becomes the scroll box; the header
  has no travel inside it). At ≥1024px the Inventory wraps
  (`.inv-table`) use `overflow: visible` and their `thead th`
  parks at `--stick-table-top: 150px`, beneath the pinned page
  toolbar; narrower widths keep the horizontal-scroll wrap.
- **Fix D — billing stale state.** Discarding the held bill that
  is loaded on the desk now resets the desk with it
  (`discardHeld` wrapper), and an effect detaches held mode
  whenever the cart is emptied while a held bill is loaded —
  payment rows blank and the primary action reads "complete bill"
  again. The held bill itself stays in the strip, resumable.
- **Fix E — dashboard warning spacing.** The negative-balance
  line is now ONE interpolated string (new key
  `fin.acct.negativeLine` = "{label}: {name} — {amount}") instead
  of JSX text/expression fragments whose spaces were lost in the
  Urdu rendering.
- **Fix F — quotations table overflow.** The documents' plain
  `table.table` had NO stylesheet at all — it sized to its widest
  unwrapped content and forced a horizontal scrollbar. It now has
  a ruleset in the `table.data` typography with `width: 100%`,
  collapsed borders and wrapping cells, so no list table forces a
  scrollbar at desktop widths.
- **Fix G — warehouse card.** The card's Edit button is replaced
  by an "editing" badge while that warehouse's form is open, and
  closing the form (backdrop or Cancel) now clears the editing
  target too — Edit and the form's Save are never presented as
  simultaneous states.

## Phase D · D3 — Loans register (design: ERP-PHASE-D-DESIGN.md §3)

- **One register, two directions, one additive code.** `loans`
  (declared in D1) is now live: payable loans ride the
  pre-declared `loans_payable`; receivable loans ride D1's
  additive `loans_receivable` — never `receivables`. The
  harness asserts the isolation explicitly (a lent loan's whole
  journal leaves the customer khata at 0). The LN- number is
  minted AT CREATION (born numbered — the number goes on the
  agreement, the jobs precedent).
- **Born drawn.** A cloud loan is created in ONE batch with
  its drawdown entry and its opening diary events (§3.4/§10.3)
  — a real loan never exists journalless. The drawdown
  templates: payable Dr money / Cr `loans_payable`; receivable
  the mirror on `loans_receivable`. A fee netted from the
  proceeds (a `fee_only` charge, or an upfront fee on any
  type) posts in the SAME entry: Dr money (P − F) + Dr
  `expense_finance` F / Cr principal P — the fee is a borrowing
  expense recognised at drawdown, never smeared into
  principal.
- **Charges — explicit, configured, never silent (§3.2).**
  `chargeType: "none"` is the default; receivable loans are
  charge-free in v1, refused AT COMPOSITION
  (`loanTermsError` → `"chargeReceivable"`) — never silently
  zeroed, and no charge-income code was invented. Accrual is a
  discrete desk-confirmed event per instalment, in due order
  (the store refuses any instalment but the next un-accrued
  one): Dr `expense_finance` / Cr `loans_payable`, so a flat
  charge is never expensed on day one. The schedule proposes
  (`nextChargeAccrual`); nothing posts on its own — the
  harness proves a freshly drawn loan's journal carries no
  charge line at all.
- **Derived, never stored (§3.3).** The schedule is a pure
  function of the doc (`loanSchedule`: cumulative-allocation
  splits — 100,000 over 7 sums exactly, final-absorb; reducing
  charges on the SCHEDULE's outstanding). Outstanding derives
  from the append-only events diary (`loanPosition`: principal
  − repaid + accrued − charges repaid); the principal/charge
  split of a repayment is attribution on the diary (charges-
  first by default, desk-overridable, validated against the
  position) — the journal line is always the whole amount.
  The asserted identity holds after every lifecycle step:
  GL ≡ diary outstanding, trial balance 0. Overpayment beyond
  the derived outstanding refuses pre-composition;
  per-instalment state (paid/partial/overdue/due/upcoming) and
  the register's next-due derive from the schedule vs the
  diary. Corrections are mirror entries + negated diary
  events; a drawdown reverses only when no repayment/charge
  stands against it, and cancels the loan. **Write-offs do
  not exist** (§3.4: no gain/loss code — a waiver is never
  faked as a repayment).
- **Surfaces.** `/loans` (nav, finance group; sidebar gated on
  the `loans` row): register with direction filter + null-safe
  search, header totals (borrowed/lent outstanding, charges
  this fiscal year from the journal's `expense_finance`), the
  detail screen (terms, schedule with accrual badges and the
  confirm-to-accrue action, the event diary with reversals),
  the create modal (party link to a supplier/customer/employee
  is display-only — the loan never rides those subledgers)
  and the repayment modal with the editable split. Money-out
  flows (receivable drawdown, payable repayment) raise the
  shared `NegativeBalanceWarning` from `outflowPreview` first
  (warn, never block). Finance gains the §3.5 breakdown card
  (register totals beside both GL balances) and the journal
  viewer names the three loan refTypes.
- **Rules.** ONE additive block (+22 lines, 555 → 577):
  `loans` — read narrowed to owner/manager/accountant (NOT
  canAccess — loan terms are not counter data), create
  owner/accountant + `createInOpenPeriod`, update
  owner/accountant (diary events are updates by doctrine;
  their journal creates carry the lock guard), delete
  owner-only with never-used enforced in the store. The
  harness strip proof reproduces the D2-state file
  byte-for-byte (SHA `1ee537fd…`).
- **Demo & regression.** §10.3's sample loan arrives: ONE
  charge-free payable loan (LN-1, Malik Traders, 150,000 over
  10 monthly instalments) with NO events — its outstanding
  derives as the full principal with no journal behind it,
  which the demo tolerates (illustrative journals); the
  production seeder still pushes no loans. Frozen seed
  identities stand (21 entries · Inventory 272,805 · Cash
  50,000 · payables 27,900 · receivables 5,500 · TB 0 · SHA
  intact — the harness re-asserts them, incl. zero loan
  balances in the seed journal).
- **Verification.** Harness **1,104/1,104** (1,054 prior + 50
  D3): composition refusals, charge snapshots, the schedule
  vectors (flat 100,000/7 to the paisa; reducing
  2,400/1,800/1,200/600), both drawdown shapes, accrual
  ordinality + the absence-by-default proof, the lifecycle
  identity after every step, split validation + the overpay
  refusal, overdue derivation, mirror-reversal restoration,
  the receivable isolation, settlement, period-lock refusals
  through the real `preparePosting`, RBAC cells, search
  null-safety, register totals, the demo loan, rules strip
  proof. i18n **2,333 EN ≡ UR** (+119: 108 `loan.*` + 7
  `fin.loan.*` + 3 journal labels + `nav.loans`; the C2 + D2
  total pins amended 2,214 → 2,333 in the established
  same-check style). tsc 0 · `npm run build` 0 ·
  `build:static` 0 · bundle carries `dukan-8246` and the
  `/loans` route · 'Demo' tokens 26 == baseline.

## Five themes (owner directive, 2026-10-22)

The header theme toggle is now a **theme picker**: five calm,
user-selectable themes over the existing CSS-variable token system
in `app/globals.css`, applied via `[data-theme]` on `<html>`. Every
theme honours the standing rule — soothing, never eye-straining,
minimalist — and every theme's body text passes WCAG AA with a wide
margin (ratios computed from the shipped tokens, below). Semantic
colours stay recognisable in all five (success = accent green
family, warning amber, danger red, info violet/blue).

| Theme | Mode | --bg | --card | --text | --accent | Sidebar |
|---|---|---|---|---|---|---|
| Emerald Calm (default) | light | #F7F5EF | #FDFCFA | #20302A | #0E7A4B | deep emerald #123E2E→#0D3325 |
| Midnight Slate | dark | #15181D | #1E242C | #E9EDEF | #43A97E | deep emerald (shared with Emerald) |
| Ocean | light | #EEF5F4 | #FBFDFC | #1C3238 | #0C6B6E (deep teal) | deep sea #11404F→#0A2D3A, mint active |
| Warm Sand | light | #F8F2E7 | #FEFCF7 | #322A20 | #0E7A4B (emerald kept as the functional accent so semantics stay intact) | warm bark #43362A→#2E251B, sand active |
| Dusk Violet | dark | #1A1921 | #262430 | #ECE9F2 | #9D8BD0 (muted lavender) | deep violet #2A2138→#1E1829 |

Full token sets per theme (surfaces, text tiers, accent/amber/
danger/info + soft tints, lines, chips, shadows, per-theme sidebar)
live in `globals.css`; the previous theme-specific overrides
(`[data-theme="dark"] …`) were replaced by two new tokens —
`--on-accent` / `--on-amber` (the readable foreground on accent /
amber fills) and `--info` / `--info-soft` / `--info-text` (the
attendance "leave" tint, previously hard-coded purple) — and the
remaining hard-coded emerald tints (selection, hovers, chat bubble
border) now mix from `var(--accent)`, so charts, badges and buttons
inherit each theme with no per-component colour code.

**Picker UI** (`components/ThemeToggle.tsx`): the header button
(palette icon) opens a compact panel listing the five themes with
three-swatch previews (bg / card / accent) and bilingual names
(EN: Emerald Calm, Midnight Slate, Ocean, Warm Sand, Dusk Violet;
UR: زمردی سکون، نیم شب سلیٹ، سمندری لہر، گرم ریت، شفق بنفشی); the
current theme carries a check mark. One click applies instantly;
the panel closes on selection, outside click or Escape, supports
arrow-key navigation, and mirrors correctly in RTL (logical
properties throughout).

**Persistence & migration:** same localStorage key
(`dukaan-ai-theme`) and the same pre-paint bootstrap in
`app/layout.tsx` — no flash of the wrong theme. Saved legacy
values migrate losslessly: `"light"` → Emerald Calm, `"dark"` →
Midnight Slate (in both the bootstrap script and the picker);
with nothing saved, the OS preference still picks midnight /
emerald as before.

**Print is untouched:** the `@media print` block and the receipts'
hard-coded colours are byte-identical to the shell increment —
every theme prints the same receipt.

**Verification:** harness **1,104/1,104 ALL SUITES GREEN** (totals
unmoved; the three i18n total pins amended 2,333 → **2,339** in
the established same-check style for the +6 picker keys —
`shell.chooseTheme` + the five theme names, EN ≡ UR). Contrast
(WCAG, computed): --text on --card / --text-2 on --bg — Emerald
13.50 / 6.97, Midnight 13.26 / 11.04, Ocean 13.16 / 6.69, Sand
13.77 / 7.79, Dusk 12.71 / 10.81 — all far above AA (4.5). tsc 0 ·
`npm run build` 0 · `build:static` 0 · bundle carries
`dukan-8246`, all five `[data-theme=…]` token blocks and the
picker · 'Demo' tokens 26 == baseline · demo storage unchanged
(v16) · no rules/store/data changes.

## Phase D · D4 — Fiscal-year close (design: ERP-PHASE-D-DESIGN.md §4)

- **One closing entry per fiscal year** (`lib/fiscal.ts`,
  composed through `guardPostings` — no new posting route; the
  store still holds exactly 24 `makeEntry` call sites). The
  entry's lines zero every P&L account's FY balance and land
  the exact net in `retained_earnings` (credit = profit, debit
  = loss). The closing set is read from the COA registry —
  exactly the `income` / `contra_income` / `expense` types — so
  a future expense code joins the close automatically, while
  clearing, tax, equity and balance-sheet accounts are never
  closed: they carry forward. The entry is dated the FY's last
  day and cites its `periods` doc (`refId`), which is written
  in the SAME batch together with `lockedThrough` advanced to
  the FY end (monotonic; the doc also records the pre-close
  lock and the warnings acknowledgement). A year with no P&L
  movement composes no entry — its close is the doc + lock.
- **The checklist is all derived, recomputed inside the close
  action** before any write (nothing stored): two HARD gates —
  the FY trial balance must be zero (difference AND closing
  difference, via the shipped `trialBalance` builder) and the
  `purchases` clearing account must be zero at FY end (it nets
  per purchase; a balance is a real defect the close must not
  bury in equity). Soft warnings — draft payroll runs for
  months inside the FY, open production orders holding WIP
  pools — require an explicit tick recorded on the close doc.
  Informational rows: salary-payable composition, uncleared
  cheques, the GL-vs-shelf stock divergence, and the lock
  state. The close refuses, in order: non-owner
  (`fiscalClose` is the matrix's only owner-exclusive Phase D
  row), a not-fully-past FY, an already-closed FY
  (double-close), a failing gate, unacknowledged warnings,
  and — via the real period guard against the PRE-close lock —
  a closing entry whose date already sits inside a locked
  period.
- **P&L after close — the §4.6 exclusion.** `plOver` (the one
  computation behind the monthly P&L, range P&L, the Finance
  screen and the reports) now excludes `fy_close` entries: a
  closing entry is a transfer of the year's result, not
  trading. The harness proves the three-way identity on a
  fixture year — pre-close P&L == post-close P&L field for
  field == the closing entry's own summary
  (`closingEntrySummary`, which the close screen renders) —
  while the trial balance, which must NOT exclude it, shows
  every P&L closing at zero and retained earnings holding the
  result. One stated delta: the closing entry also zeroes
  `expense_finance`, which the MonthPL shape does not track,
  so the entry's net is the P&L net less finance charges.
- **Reopen is a reversal, owner-only** (`reopenFiscalYear`): a
  mandatory recorded reason; the closing entry's exact mirror
  (the shared `buildMirrorEntry`, dated today — a reversal
  never backdates into the lock the close set); a `periods`
  reopen doc citing the close it unwinds (`reopensPeriodId`);
  and `lockedThrough` restored to the close doc's
  `prevLockedThrough` in the same batch. Stack discipline is a
  pure derivation (`fiscalReopenBlocker`): a later FY still
  closed blocks the reopen; unwinding the later year unblocks
  it. The journal keeps close and reopen forever.
- **No opening entries — by design (§4.5)**, stated in the
  panel's own bilingual copy where an accountant arriving from
  Tally will look for them: the journal is continuous, the
  close screen shows the next year's opening balances as
  derived figures (`balanceSheetBalances`), and opening
  balances exist as data only inside export files (D5).
- **Rules: NONE — the design's claim, verified.** The close
  rides the existing journal-create guard (`guardPostings` +
  the rules backstop) and the already owner-only `periods` /
  owner-doc writes. The harness pins the rules file's SHA-256:
  byte-identical to the D3-state file (577 lines). No demo or
  seed change either (demo storage stays v16); the frozen
  seed identities stand (21 entries · Inventory 272,805 ·
  Cash 50,000 · payables 27,900 · receivables 5,500 · TB 0 ·
  SHA e17e5bda…1168).
- **Surface:** `components/FiscalClosePanel.tsx`, mounted in
  Finance (under the P&L/aging section) and beside Settings'
  periods panel. FY picker (earliest journal year → current),
  status badge, checklist rows with per-item figures, close
  confirm modal, closed-year summary from the entry itself,
  reopen form, openings panel. i18n: +55 `fin.fy.*` keys
  (EN ≡ UR; total 2,394).

**Verification:** harness **1,148/1,148 ALL SUITES GREEN**
(1,104 prior + **44 D4**) · app tsc 0 · `npm run build` 0 ·
`npm run build:static` 0 · bundle carries `dukan-8246`, the
`fy_close` machinery and the bilingual close strings ·
'Demo' tokens 26 == baseline · rules byte-identical (SHA
pinned in the D4 suite).

## Phase D · D5 — Tally export + journal CSV (design: ERP-PHASE-D-DESIGN.md §5)

Phase D's finale: the journal — the one dataset Finance could
not export — now leaves the app in the two forms an accountant
asks for. Both are **pure renderings** of the subscribed journal
(`lib/tally.ts`: functions of journal + parties + settings +
range; no store writes, no journal changes, no new dependency):

- **Tally XML** — the common-denominator import envelope
  TallyPrime and ERP 9 accept (Gateway → Import Data →
  Vouchers): ledger masters first, then ONE `<VOUCHER>` per
  journal entry. **Honesty note (design §5.3):** Tally import
  dialects vary by version; the export targets the documented
  common subset and the owner validates with one import — the
  journal CSV guarantees the data is never trapped regardless.
- **The fixed mapping (§5.2)** lives in `TALLY_LEDGER_MAP`:
  every one of the 28 COA codes → a default ledger name under a
  Tally predefined group. Groups are FIXED; the owner may
  override ledger **names** only (`settings.tallyLedgerNames`,
  edited in Settings beside the document-series prefixes),
  because a wrong group silently distorts the Tally balance
  sheet while a name is cosmetic. One completion of the
  design's table, recorded here: §5.2 does not name
  `inventory_loss` — it maps to **Inventory Loss / Direct
  Expenses** (a stock write-off is a direct cost, beside COGS);
  every code must map or the export would strand real lines.
- **Vouchers (§5.3)** — `VCHTYPE` from the entry's refType by
  the design's full table: bill/sale → Sales, purchase →
  Purchase, return → Credit Note, purchase_return → Debit Note,
  supplier/expense/payroll outflows → Payment, repayment/credit
  → Receipt, transfer → Contra, everything else → Journal; the
  two loan refTypes are directional (drawdown: payable Contra /
  receivable Receipt; repayment: payable Payment / receivable
  Receipt), with the direction read off the entry's own loan
  lines — no register lookup. `DATE` is the entry's business
  date (stamped `dateISO`, else the PKT date of its instant) as
  YYYYMMDD; `NARRATION` is the memo; `VOUCHERNUMBER` is the
  cited document's number where one exists (the UI builds a
  refId → number map from its document collections: bill
  numbers, PV-/RV- vouchers, PAY-, LN-, CN-/DN-, QT-/SO-/DC-/
  PO-/TR- series), and for `fy_close` the FY label itself
  (§6.3). Amounts follow Tally's documented sign convention (a
  debit line is deemed positive with a NEGATIVE amount); the
  model keeps our Dr/Cr terms alongside, and per-voucher
  ΣDr == ΣCr in our terms is asserted before conversion.
- **Party ledgers (§5.3)** — a `receivables`/`payables` line
  carrying a ref exports against a per-party ledger (the
  party's own name, under Sundry Debtors/Creditors) instead of
  the control ledger; `salary_payable` lines with employee refs
  do the same under Current Liabilities. Money-account refs stay
  on the bucket ledger. Two parties sharing a name get distinct
  ledgers (clean name + ` (2)` suffix) — never a silent merge;
  an unresolved ref exports under its own id-named ledger
  rather than being folded into the control.
- **Opening balances (§4.5's other side)** — when the range
  does not start at the shop's first entry, each ledger's
  `OPENINGBALANCE` is derived from the entries before the range
  (party-aware, Tally-signed) and exists **in the file only**;
  a range starting at the journal's beginning emits none.
- **Journal CSV** — the same range as flat rows through
  `lib/csv.ts` (Date · Voucher No · Type · Account · Party/Ref
  · Debit · Credit · Narration), one row per journal line,
  naming ledgers through the identical census pass as the XML;
  the download adds the UTF-8 BOM so Urdu memos render in Excel.
- **Surfaces & gate** — a range picker (this FY default, last
  FY, this month, all entries, custom) in Finance's export card
  (`components/ExportsPanel.tsx`), and the same two actions
  under Reports' trial balance for the report's selected range;
  both ride the `trialBalanceExports` matrix row (owner /
  manager / accountant; the cashier is excluded — design §6.1
  G-D4: the report keeps its finance-row gate, the export
  actions ride their own row). The file's totals equal the
  on-screen trial balance by construction (asserted).
- **Rules: NONE.** Exports read only the already-readable
  journal; the harness re-pins the rules SHA-256 —
  byte-identical to the D3/D4-state file (577 lines). No demo
  or seed change (demo storage stays v16); the frozen seed
  identities stand (21 entries · Inventory 272,805 · Cash
  50,000 · payables 27,900 · receivables 5,500 · TB 0 · SHA
  e17e5bda…1168).

**Verification:** harness **1,188/1,188 ALL SUITES GREEN**
(1,148 prior + **40 D5**) — the D5 suite parses its own XML
(well-formedness, per-voucher re-reconciliation of the FILE
against the period trial balance), asserts the mapping table
and the full 33-refType voucher table in both loan directions,
party-ledger naming + same-name disambiguation + override
flow-through, mid-journal opening balances, CSV row/line
parity with comma/quote/Urdu memo round-trip, the fy_close
label, and the seed journal exporting whole · app tsc 0 ·
`npm run build` 0 · `npm run build:static` 0 · bundle carries
`dukan-8246` and the Tally mapping strings · 'Demo' tokens
26 == baseline · i18n 2,406 EN ≡ UR (+12 `fin.export.*`) ·
rules byte-identical (SHA pinned in the D4 + D5 suites).

## Phase E · E1 — Print design foundation + invoice designer (design: ERP-PHASE-E-DESIGN.md §1)

Phase E opens with the seam every later print feature hangs
off: **templates are settings, interpreted in exactly one
place.** `ShopSettings` gains one optional object,
`printDesign` (plus `shopNameAlt`, the second shop-name line),
and `lib/print.ts` is the ONLY interpreter — `resolvePrintDesign`
fills every default there, so an absent design resolves to
today's rendering field-for-field and no sheet ever reads a
raw settings field for a print decision again. Phase E posts
NOTHING: the module imports no posting path, no store, no
Firestore (harness-asserted).

- **The shared chrome** — the header/footer the nine document
  sheets + the bill receipt + the report sheet each used to
  hand-roll now live once in `components/PrintChrome.tsx`
  (`PrintHeader` / `PrintFooter` / `PrintPageStyle` /
  `PrintItemsTable`). Sheet BODIES are untouched; the voucher
  and salary-slip signature lines moved from their bodies into
  the footer's signature slot, which defaults ON for exactly
  those two kinds — the same lines in the same place. The
  billing desk's inline receipt was extracted as
  `BillPrintSheet`; screen print and designer preview render
  the identical component.
- **Layouts & paper mechanics** — classic A4 (the bare
  `.receipt`, today's measure), compact A4 (~560px screen /
  148mm print, denser cells), A5, thermal 80mm, plus the large
  font scale. The global `@page { margin: 10mm }` is GONE:
  every sheet renders its own `@page` via `PrintPageStyle`
  from `paperPageRule` (A4 + compact → A4/10mm, A5 → A5/8mm,
  thermal → 80mm auto/4mm), so the template's paper — or the
  desk's per-print thermal override — decides the physical
  page. Reports stay A4 always (their header takes the design's
  toggles and footer note, never its paper). Print colours
  stay hard-coded; print remains theme-independent and goes
  through the browser pipeline (Urdu shaping).
- **The slot matrix (§1.5) is structural, not cosmetic** —
  `PRINT_SLOTS` per document kind, and the rendered columns
  are the design's toggles INTERSECTED with the kind's slots:
  a delivery challan with every toggle on still gains NO
  price-bearing column (it has no prices to give); the tax
  column exists only for bill/notes, the discount column only
  for bill/quotation/order; the challan and job signature lines
  are the CUSTOMER's (receiver lines), so the shop-signature
  slot can never land there. Stamp and letterhead are
  hard-suppressed on thermal; the logo is the one image
  thermal keeps (small, centred).
- **Column sources (§1.4)** — SKU and the Urdu name resolve
  LIVE from the products list by productId (never a snapshot;
  a deleted product prints blank; the Urdu name is a second
  line under the item name, not a column). The per-line TAX
  column reads A4's snapshotted `BillItem.taxAmount` verbatim.
  The per-line DISCOUNT column is a **display-only derivation**
  — the bill's discount spread by the F-3 `allocateProRata`,
  labelled as a derivation in code; its shares sum to the
  document discount to the paisa and nothing is stored.
- **The stamp rule (§2.4) is built, its asset is E2** —
  `stampVisible` is a pure function of design + asset + doc:
  mode "paid" prints only on a fully-paid bill (a
  partially-returned bill has lost the settlement assertion),
  a held bill never carries it in any mode, per-doc toggles
  govern notes/vouchers/quotations (orders ride the
  quotations key). E1 builds the slots and the suppression
  logic with the asset always absent, so the slot renders
  nothing today.
- **The designer** — Settings → "Print & branding" (owner
  only): paper/font-scale pickers, header mode + identity
  toggles + the alternate-name field, the four column toggles,
  footer note / terms / thanks text, the bill signature
  toggle — all editing an UNSAVED draft over a LIVE preview
  that renders the real `BillPrintSheet` / `DocPrintSheet`
  against the fixed sample fixtures in `lib/print.ts`
  (`sampleBill` — 4,760 − 200 + 320.73 = 4,880.73, split
  payments summing to the total; `sampleQuotation` mirroring
  it), inside a screen-only frame badged SAMPLE/نمونہ that
  sits outside `.receipt-sheet` so a sample can never reach
  paper. Save writes `settings.printDesign` once via
  `updateSettings`; Reset records the empty object — through
  the single resolver seam an empty design IS absence (the
  store's merge-write has no field-delete), returning every
  sheet to today's look.
- **Rules: NONE.** Print settings ride the owner settings
  document under the existing write pattern; the harness
  re-pins the rules SHA-256 — byte-identical to the
  D3/D4/D5-state file (577 lines). No demo or seed change
  (demo storage stays v16); the frozen seed identities stand
  (21 entries · Inventory 272,805 · Cash 50,000 · payables
  27,900 · receivables 5,500 · TB 0 · SHA e17e5bda…1168) and
  the store still carries exactly 24 `makeEntry` call sites.

**Verification:** harness **1,227/1,227 ALL SUITES GREEN**
(1,188 prior + **39 E1**) — the E1 suite deep-pins the
resolver's default snapshot, sweeps all 24 fields (each patch
moves exactly its own key), asserts the @page strings
verbatim, the slot matrix incl. challan-never-priced under
all-toggles-on, the column sources (live SKU/Urdu resolution,
tax snapshot verbatim, discount == allocateProRata and
summing to the paisa incl. a partially-returned fixture), the
stamp matrix (no-asset / paid / partially-returned / held ×
paid/always/never, toggles, thermal), header suppression, the
fixtures' closing arithmetic, and the source invariants
(lib/print pure; chrome wired into every sheet; still 24
makeEntry calls; demo v16) · app tsc 0 · `npm run build` 0 ·
`npm run build:static` 0 · bundle carries `dukan-8246` ·
'Demo' tokens 26 == baseline · i18n **2,459 EN ≡ UR** (+53
`print.*`; the five earlier total pins amended in the
established same-check style) · rules byte-identical (SHA
re-pinned in the E1 suite).

## Phase E · E2 — Brand assets: logo, letterhead, stamp, signature (design: ERP-PHASE-E-DESIGN.md §2)

E1 built the slots and the visibility rules with the asset
always absent; E2 fills the slots. Brand assets are
**documents, not settings and not journal data** (design
§2.1, Decision B): a dedicated `branding` collection holds
one doc per slot — `logo`, `letterheadHeader`,
`letterheadFooter`, `stamp`, `signature`, plus the
bank-issued Raast QR image slot §3.1 reserves — the doc id IS
the kind, the payload a compressed data-URL with measured
metadata (`mime`, `width`, `height`, `bytes`, `updatedAt`).
Every role reads them (every desk prints branded paper);
only the owner writes. Phase E still posts NOTHING.

- **The pipeline (§2.2) is split pure/DOM on purpose** —
  `lib/branding.ts` is the pure core (no store, no Firestore,
  no journal — harness-asserted): the spec table, data-URL
  measuring, fit-within-box, the format rule and the
  compression ladder, all unit-pinned. `components/
  BrandAssets.tsx` runs the DOM half: decode the picked file,
  scan its pixels for real alpha (the pipeline checks, the
  owner doesn't), then walk the plan with a canvas encoder.
  **The caps are HARD**: logo / stamp / signature ≤ 150,000
  bytes, letterhead header/footer ≤ 300,000, the Raast image
  ≤ 200,000 — 1,250,000 total, every payload far under the
  1 MiB Firestore document limit. Normalise to the kind's
  box first (logo 600×600, letterhead 1600×400, signature
  800×300, Raast 800×800; **never upscale**, and fitted
  dimensions floor so a step never lands a pixel over its
  box), then step quality down (−0.1, hold, −0.2) and the
  box ×0.75 — quality is spent before size. Real alpha →
  WebP (transparency survives for logo/stamp/signature);
  no alpha → JPEG; letterhead is JPEG (q0.85) even with
  alpha — a banner's transparency would print as a hole.
  An image NO rung can bring under its cap is **refused**
  with the actual figures on screen ("compresses to X KB;
  the limit is Y KB") — never silently degraded, never
  truncated. `buildBrandingAsset` is the boundary guard
  behind the UI: it re-measures the finished encode and
  refuses an over-cap payload, a non-encodable mime, zero
  dimensions or a corrupt data URL, so no caller can persist
  what the pipeline would have refused. Replace overwrites
  the fixed-id doc; Remove deletes it — assets are the one
  Phase E record that is deletable (replacement art, not
  history), and a removed slot simply stops printing.
- **The management UI** — Settings → "Print & branding",
  directly under E1's Template group (owner-only, like the
  card): one row per slot with a live thumbnail on a
  checkerboard (transparency is visible, not implied), the
  stored size + pixel dimensions and the slot's cap, and
  Upload / Replace / Remove. The design-side controls that
  belong to the slots live with their rows and ride the
  SAME unsaved PrintDesign draft + Save as the template:
  the stamp mode (paid-only / always / never) and the
  also-stamp toggles (notes / vouchers / quotations), the
  signature-on toggles (vouchers / salary slips), and the
  letterhead-footer toggle. Uploads themselves save
  immediately — they are documents, not design. All figures
  show KB in the design's own convention (150 KB = 150,000
  bytes) so the screen and the caps never disagree.
- **Print integration** — every sheet call site (billing
  desk, documents, both voucher desks, notes, transfers,
  production, jobs, salary slips, reports, and the designer
  preview itself — 15 sites) now passes
  `assets={brandingDataUrls(branding)}` into the sheets, and
  E1's chrome does the rest unchanged: the logo in the text
  header (thermal keeps it small and centred — the one image
  thermal prints), the letterhead banner replacing the
  header wholesale in letterhead mode with the footer banner
  above the thanks line, reports gaining the same letterhead
  chrome, the stamp at ~70% opacity ONLY where E1's §2.4
  rule allows it (a paid bill; never held, never
  partially-returned, never thermal), and the signature
  image filling ONLY the shop-signature slot — the challan /
  job receiver lines remain the customer's. With no assets
  stored, every sheet renders exactly as it did after E1.
- **An E1 gap found and fixed in passing** — the cloud
  settings snapshot in `StoreProvider` rebuilt the settings
  object field-by-field and DROPPED `printDesign` and
  `shopNameAlt`, so a cloud shop's saved print design fell
  out of state on the next snapshot (it survived only in the
  document). The snapshot now passes both through; the
  designer's seam is whole in cloud mode, not only in demo.
- **Demo** — storage v16 → **v17** (the `branding` field
  joins the snapshot shape). The seed ships **no assets**
  (design §2.6/§10.3): the demo shop's paper stays exactly
  as unbranded as today's until its owner uploads — no
  placeholder art implying a real brand.
- **Rules: ONE additive block** (§5) — `match
  /branding/{kind}` inside the tenant match: read
  `canAccess` (the `accounts` precedent — a cashier's bill
  carries the logo and the stamp), create/update/delete
  owner-only, and deliberately NO period backstop (an asset
  asserts no money fact; replacing one rewrites no history —
  past prints are paper). 577 → **594 lines**; the harness
  strip-proves the rest of the file byte-identical to the
  pre-E2 SHA, and the D4/D5/E1 byte-pins plus the D1–D3
  "no canAccess on HR/payroll/loans" checks were amended in
  the established same-check style (strip the E2 block
  first — those invariants are about THEIR collections and
  remain fully asserted). Publish the rules BEFORE the E2
  build, per the R-1 discipline: without the block, a cloud
  shop's branding subscription is denied and uploads fail
  (demo mode is unaffected).

**Verification:** harness **1,274/1,274 ALL SUITES GREEN**
(1,227 prior + **47 E2**) — the E2 suite pins the spec table
and caps (per-kind, the 1,250,000 total, each under 1 MiB),
data-URL measuring incl. ragged-payload refusal (tightened
in this increment: a non-quad payload now measures −1, never
a floor guess), fit-within-box (never upscale, extreme
aspects, floor discipline), the format matrix, the ladder's
exact rungs (qualities and floored boxes for logo/signature/
letterhead), the runner (fits at rung 0, fits only at
rung 2, the honest refusal with cap + last-bytes + rungs
tried, and a property sweep across kinds × alpha × size
models proving no run ever stores over its cap), the
boundary guard (at-cap accepted, one quad over refused),
the production seam (`brandingDataUrls` feeding E1's
visibility rules: paid-only stamp, thermal suppression with
the logo kept, letterhead presence/absence, signature slot
discipline), source invariants (lib/branding pure; store
wiring + v17 + no-seed-assets; still 24 `makeEntry` calls),
and the closing seed regression — the frozen identities
stand (21 entries · Inventory 272,805 · Cash 50,000 ·
payables 27,900 · receivables 5,500 · TB 0 · SHA
e17e5bda…1168) · app tsc 0 · `npm run build` 0 ·
`npm run build:static` 0 · bundle carries `dukan-8246` ·
'Demo' tokens 26 == baseline · i18n **2,496 EN ≡ UR**
(+37 `print.brand.*`; the six earlier total pins amended
2,459 → 2,496 in the same-check style) · rules 594 lines,
strip-proven.

## Phase E · E3 — Raast QR: payload, renderer, Settings, poster (design: ERP-PHASE-E-DESIGN.md §3)

E3 fills the footer slot E1 reserved and activates the
`raastQrImage` asset kind E2 stored. Two honest paths, in
trust order (§3.1): the **bank-issued QR image** prints
verbatim whenever it exists; the **generated SBP P2P code**
— built from the owner's IBAN alone — is the fallback.
There is NO generated P2M merchant QR: a merchant payload's
account information is acquirer-issued (§9.2.2 of the SBP
standard) and cannot be minted from an IBAN, and nothing in
the app claims otherwise. Phase E still posts NOTHING.

- **PROVISIONAL — the generated path is NOT verified, and
  this release does not call it done.** The published
  standard leaves one framing detail implicit: whether the
  variable objects (03 FI name, 05 amount, 06 particulars)
  carry an explicit length element. The owner has **not yet
  provided his bank-app Raast QR**, so per design §3.3/§3.6
  the generated path ships provisional: the framing decision
  lives in ONE named seam — `RAAST_FRAMING` in
  `lib/raast.ts` (`mode: "bare"`, the §3.3 builder sketch's
  shape; `status: "provisional"`; `pinnedBy: null`) — and
  builder, parser and CRC input all derive from it through
  `frameObject()`/`crcObjectFor()`, so pinning the truth is
  a one-constant change with zero surgery. The alternative
  hypothesis (EMV-style TLV framing) is implemented behind
  the same seam and round-trip-proven, ready to become the
  default if the fixture says so. **Still needed from the
  owner (the §3.6 release gate): (1) his bank app's own
  Raast P2P QR payload (the string a decoder shows, or a
  screenshot to decode) — its framing gets pinned
  byte-for-byte against the builder and `pinnedBy` records
  it; (2) at rollout, a scan-test of the generated code in
  two banking apps showing the correct beneficiary IBAN
  (and, for a dynamic code, the correct amount).** Until
  both hold, the UI copy says "pending verification" in
  both languages (`print.raast.provisional`), the Settings
  explainer says the code "has not yet been verified", and
  the bank-issued image is the documented, verified route.
- **`lib/raast.ts` (pure string math).** `validatePkIban`
  is full ISO 13616: entry normalisation (spaces/dashes/
  case fold), structure (`PK` + 2 check digits + 4-letter
  bank code + 16 digits = 24) AND the mod-97 checksum — a
  typo'd digit is refused at the desk with a specific code
  (`alias` / `notPk` / `badLength` / `badStructure` /
  `badChecksum`), never discovered by a customer's failed
  scan. A Raast **alias is refused with its own code**: the
  P2P template's beneficiary object is the IBAN and no
  alias object exists to put a phone number in (§3.2) — the
  Settings message says so and points at the cheque book.
  `buildRaastP2pPayload` composes objects 00 (`02`) · 01
  (`11` static / `12` dynamic) · 02 (`30` = Raast) · 03 FI
  name (≤ 25, ASCII) · 04 IBAN · 05 amount · 06
  particulars · 10 CRC — CRC-16/CCITT (poly 0x1021, init
  0xFFFF, EMV QRCPS flavour) rendered as 4 uppercase hex.
  Amounts format per §3.3 (trimmed, separator-free, > 10
  chars refused at composition); particulars are the bill
  label only (`Bill #<no>`, ASCII by construction — no
  free text, no Urdu in a banking payload). The builder
  refuses rather than emits: alias IBAN, over-length
  amount, non-ASCII or 31-char particulars, bad FI name.
  `parseRaastP2pPayload` is the round-trip partner (and
  the §3.3 fixture's decoder when the owner's QR arrives):
  object-by-object recovery with the CRC verified, never
  assumed — a flipped digit anywhere is rejected. In bare
  framing the amount's digit run is delimited by
  backtracking over object boundaries (the next object's id
  is digits too); the attempts are deterministic and the
  CRC arbitrates. `resolveRaastBlock` is the print
  resolution, pure and harness-asserted: toggle off or a
  document outside bill/quotation/order/poster ⇒ nothing;
  image present ⇒ image (the IBAN text line rides only
  when an IBAN is also on record); a dynamic bill carries
  the bill TOTAL + `Bill #n` (what the bill charges —
  paper cannot know later repayments); a zero-total bill
  falls back to static instead of embedding a zero amount;
  quotations/orders/poster are static ALWAYS (an estimate
  never hardens into a demand); sizes s/m/l = 22/28/36 mm,
  thermal capped at 28 mm. The resolver never throws — a
  pathological build degrades dynamic → static → none
  rather than breaking the sheet it rides on.
- **The renderer (§3.7).** `qrcode-generator` 1.4.4
  (Kazuhiko Arase, MIT, zero-dependency — the dependency
  the design chose; its bundled types are used, no @types)
  is wrapped by `lib/qr.ts` (byte mode, EC level **M**,
  auto version) and rendered ONLY by
  `components/QrCode.tsx` as an inline SVG with the
  4-module quiet zone — crisp at print sizes, no canvas,
  no data-URL. Black modules on white, hard-coded: a
  themed QR is an unscannable QR (invariant 3's sharpest
  case, source-asserted — no `var(--…)` may reach it).
- **Settings → Payments (Raast)** (`components/
  RaastSettings.tsx`, owner-only, its own card per §1.8):
  IBAN + bank-name fields with per-keystroke validation
  messages by error code; **Save is refused while the IBAN
  is invalid**; the moment it validates, the generated
  static code renders as a live preview — the owner
  scan-tests it with his own banking app BEFORE saving
  (§3.5's cheapest verification loop) — with the payload
  string in a monospace disclosure for fixture comparison,
  the provisional label, and a path indicator (image /
  generated / none) describing what bills actually print.
  The card also owns the Raast print controls — show on
  bills, dynamic amount+number, QR size — written through
  into `settings.printDesign` (the designer's draft
  hydration discipline keeps the two cards from fighting),
  and the **counter poster**: the static code (or the bank
  image) at 50 mm on a minimal A4 sheet through the same
  `.receipt-sheet` machinery. Demo: no IBAN is seeded; the
  preview renders the published registry-example IBAN
  (`PK36SCBL…6702`, checksum-valid, a format sample —
  never stored, never printed on a real bill) badged
  SAMPLE, and the demo poster carries the badge on paper
  too. No demo-storage bump: the two new settings fields
  are read-time optionals (§10.1).
- **Print + share integration.** `PrintChrome`'s footer
  renders the resolved block in its fixed slot order
  (after terms, before the stamp): the matrix or the bank
  image, the bilingual caption, and the IBAN in grouped
  text beneath — a failed scan still leaves a manual
  Raast transfer possible from the same paper (§3.5).
  `BillPrintSheet` passes its `billNo` + `total` into the
  footer for the dynamic payload. WhatsApp (§1.9): the
  text bill gains ONE line — `billing.wa.raastLine` with
  the grouped IBAN — when a validated IBAN is on record;
  `wa.me` still attaches nothing (§12.3).
- **Rules: none.** Raast rides the owner settings doc
  (owner-only write since v3) plus the existing
  `branding` match; the suite pins the rules file's SHA
  byte-identical to the pre-E3 file. No collection, no
  RBAC row, no migration, no posting — the store still
  carries exactly 24 `makeEntry` calls (suite-asserted).

**Verification:** harness **1,324/1,324 ALL SUITES
GREEN** (1,274 prior + **50 E3**) — the E3 suite pins the
seam's shipped state (bare, provisional, unpinned), CRC
known answers (the canonical 0x29B1 for "123456789",
cross-checked against an independent table-driven
implementation), the IBAN vectors (the published example
+ six composed bank fixtures validate; EVERY
single-character corruption of a fixture — all 22
positions — is refused with badChecksum; aliases in all
written forms refused as aliases), amount formatting and
its refusals, both fixtures byte-for-byte under the bare
seam, builder/parser round-trips object-by-object under
BOTH framings (which do not cross-parse), guard codes,
the reference encoder's 37×37 matrix for the static
fixture pinned as a regression anchor, the full
resolveRaastBlock matrix, i18n honesty wording in both
languages, source invariants (framing exists only inside
lib/raast; QrCode hard-codes black/white; the seed ships
no IBAN), the rules SHA, and the closing seed regression
— the frozen identities stand (21 entries · Inventory
272,805 · Cash 50,000 · payables 27,900 · receivables
5,500 · TB 0 · SHA e17e5bda…1168) · app tsc 0 ·
`npm run build` 0 · `npm run build:static` 0 · bundle
carries `dukan-8246` · 'Demo' tokens 26 == baseline ·
i18n **2,531 EN ≡ UR** (+35: 34 `print.raast.*` +
`billing.wa.raastLine`; the seven earlier total pins
amended 2,496 → 2,531 in the same-check style) · rules
byte-identical (594 lines, SHA-pinned) · demo storage
v17, unbumped. **The §3.6 live scan-verification is NOT
recorded — it cannot be until the owner provides his
bank-app QR; the generated path ships provisional on
exactly those terms.**

## Phase E · E4 — PIN lock: launch / idle / recovery (design: ERP-PHASE-E-DESIGN.md §4)

The PIN is a **counter-privacy convenience**, and the
release says so in the product, in both languages
(`pin.honesty`): it keeps this device's app private from
casual use at the counter; it is NOT a replacement for
the account password — anyone who knows the account
password can remove the PIN (§4.5, by design) — and the
shop's data stays protected by the account sign-in.
Nothing anywhere calls the PIN "security" unqualified.

- **`lib/pinlock.ts` (pure core + injected seams).** The
  §4.2 record (`v 1` · base64 16-byte salt · base64
  32-byte hash · 150,000 iterations · the digit length
  chosen at set time · `setAt`) lives in localStorage
  under `dukaan-ai-pinlock`, with sibling keys for prefs
  (`idleMinutes` default 5, `gateSensitive` default
  false) and the friction counters. PBKDF2-HMAC-SHA256
  runs through an **injectable SubtleCrypto** (default
  `globalThis.crypto.subtle`): the harness drives the
  SAME `derivePinBits` through Node's WebCrypto and the
  RFC 7914 §11 known-answer vectors match (c=1/2/4096;
  the c=1 expectation was cross-checked against an
  independent PBKDF2 implementation after a transcription
  slip in the first run — the code was right, the typed
  vector was not, and the suite now pins the verified
  value). Verification recomputes and compares in
  constant time over the decoded bytes; tampered hash,
  salt or iteration count never verify; a malformed or
  foreign-version stored record parses to NO record —
  never a crash, never a phantom PIN. The plaintext PIN
  exists only in component state during entry; the
  stored record provably contains no substring of it.
  150k iterations is friction, not strength (§4.1) —
  the copy and this note claim nothing more.
- **Behaviour (`components/PinGate.tsx`, mounted in
  AppShell around the NON-AUTH branch only).** A device
  with a record opens **locked**; an idle timer fed by
  pointer/keyboard activity anywhere locks at the
  chosen interval (0 = launch only), and a deadline
  that passes while the tab is hidden locks on the
  return check (hidden time counts toward idle — the
  reducer is time-based, so this is the same verdict,
  harness-pinned). The header gains a lock button
  beside logout whenever a record exists (any role —
  locking is always safe to offer, §5). The lock is a
  SCREEN over the mounted app, not a data gate:
  subscriptions keep running beneath it and a
  half-built bill keeps its state; the lock screen
  itself shows the shop name, the pad and
  "Forgot PIN?" — no balances, no nav, no data.
  Wrong PIN ⇒ shake + clear + counter; **friction**:
  free below 5 consecutive failures, a 30-second pad
  pause at 5, growing per further 5 (30s → 2 min →
  5-min cap), counters persisted so a reload cannot
  reset a pause, success clears them. The schedule is
  the pure `frictionPauseMs`, asserted at its points.
- **Recovery (§4.5) — a forgotten PIN never bricks the
  shop.** Cloud: "Forgot PIN?" takes the **currently
  signed-in account's own password** (staff sessions
  included, deliberately — the threat model is the
  walk-up stranger, not an account holder) through
  Firebase `reauthenticateWithCredential`; success
  deletes the record, unlocks, and routes to Settings →
  Device lock. Demo: no passwords exist, so the lock
  screen offers **"Erase demo data and remove PIN"**
  behind a typed shop-name confirmation — the existing
  demo-reset semantics plus record deletion
  (`resetDemo` itself does not clear the record; the
  erase path is the PIN act). Settings' card
  additionally requires the current PIN **or** the same
  password reauthentication to change/remove the PIN
  while unlocked, so an unlocked-but-unattended moment
  cannot quietly strip the lock.
- **Settings → "This device's lock" card**
  (`components/DeviceLockCard.tsx`): set (length 4–6,
  owner's choice), change, remove, the idle choice and
  the E5 toggle — worded as THIS device throughout,
  and deliberately **not role-gated** (§5: the device
  is the boundary; §4.5's current-PIN-or-password rule
  is the guard). In demo the card explains the erase
  recovery instead of password recovery (§4.8).
- **Zero Firestore writes — asserted, not assumed.**
  The PIN module imports no store/Firebase/posting
  path (source-pinned); across a full set/save/load/
  clear cycle against a fake storage it touched ONLY
  its three `dukaan-ai-pinlock*` keys; PinGate's only
  Firebase call is Auth reauthentication, and its only
  store write anywhere is the demo-mode `resetDemo`
  (demo-local storage, not Firestore). No rules, no
  settings field, no demo-blob presence: demo storage
  stays v17, unbumped, and no record is seeded — the
  public demo never opens locked (§4.8/§7).
- **Verification — harness 1,389/1,389 ALL SUITES
  GREEN** (1,324 prior + **49 E4** + **16 E5**): the
  KATs, record shape, verify accept/reject set, salt
  uniqueness, tamper set, storage round-trips + the
  no-PIN-substring proof, friction points, the full
  reducer transition set, source invariants (AppShell
  mount, card's lack of any store/backend seam, the
  §4.7 honesty copy present EN + UR), i18n **2,580
  EN ≡ UR** (+49 `pin.*` keys; the eight earlier total
  pins amended 2,531 → 2,580 in the same-check style) ·
  app tsc 0 · `npm run build` 0 · `npm run build:static`
  0 · bundle carries `dukan-8246` · rules byte-identical
  (594 lines, SHA-pinned — E4 adds none, §5) · still
  exactly 24 `makeEntry` calls · the frozen seed
  identities stand (21 entries · Inventory 272,805 ·
  Cash 50,000 · payables 27,900 · receivables 5,500 ·
  TB 0 · SHA e17e5bda…1168). **'Demo' tokens 27 vs the
  26 baseline — the +1 is attributed, not drift:** the
  single new occurrence is the property name of the
  store's own pre-existing `resetDemo` API, destructured
  once in PinGate because §4.5 mandates the erase path
  reuse exactly those semantics; zero new user-visible
  "Demo" text or identifiers were introduced (the two
  new EN strings that initially began "Demo mode…"
  were reworded, and the erase prop was renamed, to
  keep it that way).

## Phase E · E5 — Sensitive-action PIN gating (design: ERP-PHASE-E-DESIGN.md §4.6)

The optional second factor of presence for the
attended counter: the owner steps to the back, a helper
runs the till, and the few acts that can hurt ask for
this device's PIN first. **Default OFF**, device-local,
narrow — shipped exactly on the design's recommendation.

- **The gate list (v1)**: void a posted bill ·
  day-close submit · period close / reopen · fiscal-year
  close / reopen. Payroll finalise/payments and loan
  drawdown/repayment are **deliberately excluded**
  (accountant-desk flows, often on a device with no PIN;
  their role gates + journal audit trail are the control
  there) — the harness asserts neither desk references
  the gate.
- **Mechanics**: gating applies ONLY when this device
  has a PIN record AND the `gateSensitive` pref is on
  (`pinGateRequired`); otherwise `requirePin` resolves
  true immediately and every gated flow is byte-for-byte
  the pre-E5 flow. Each call site `await`s
  `requirePin(actionLabelKey)` **before** composing any
  write — a view-layer precondition; no store signature
  changed (the store source provably contains no
  `requirePin`), no posting changed, no rules changed.
  A cancelled or failed challenge composes NOTHING —
  the harness's composition matrix (one shared seam for
  all four actions) asserts writes exactly in the allow
  cases and zero in every deny case, and source pins
  place each `requirePin` textually before its store
  call (`voidBill`, `saveDayClose`, `closePeriod`,
  `reopenPeriod`, `closeFiscalYear`,
  `reopenFiscalYear`). The challenge renders through
  PinGate's overlay machinery and feeds the SAME attempt
  path (and friction counters) as the lock screen; if
  the idle lock engages mid-challenge, the challenge is
  cancelled — nothing composes. A satisfied challenge
  counts as ordinary activity (the pad's own pointer/
  key events ride the standard activity path); the
  gate's decision helpers are pure and provably cannot
  move the idle epoch.
- **Verification**: the E5 suite (16) above — truth
  table, composition matrix, epoch purity, the four
  call-site orderings, the ungated-desk exclusions —
  closing, like E4, on still-24 `makeEntry` calls, the
  byte-identical rules file and the frozen seed
  identities. A gate on a screen is not an accounting
  event (design §6).

## Phase F · F1 — Flutter core + the counter release (design: ERP-PHASE-F-DESIGN.md §2/§5/§7/§8)

One Flutter project (`flutter-app/`, Flutter 3.35.6,
Dart ≥3.4) serving Android + Windows from a single
`lib/`: the web store is the specification of behaviour
and the Dart store is a port of it, not a redesign —
derivations are pure functions in `core/`, actions are
methods on one store, and the money math is pinned to
the web's by the §8 golden-fixture contract rather than
by parallel re-derivation.

- **The fixture contract (§8)**: the TS harness gained
  an export step (`harness/fixtures-export.js` →
  `fixtures/f1-core.json`: 15 scenarios, 16 entries,
  trial balance 0) writing the exact journal entries the
  web composes; the Dart suite consumes the SAME files
  and asserts its composed batches match byte-for-byte.
  A template change on either side must move the fixture
  deliberately. CI re-exports and fails on any drift.
- **The F1 set, as landed**: auth + `staffIndex` role
  resolution (missing role ⇒ manager) · shell +
  sync centre (pending writes, from-cache state, the
  §3.5 rejected-write tray — persisted on device,
  dismissible by owner/manager) + the five calm themes
  (token sets test-pinned to the web CSS values) · PIN
  lock (launch/idle/manual, E4 recovery via Firebase
  re-auth, E5 gate at the two F1 gate-list actions:
  void bill, day-close submit) · dashboard (journal-
  derived KPIs, attention items incl. negative stock +
  duplicate bill numbers, 14-day sales chart) ·
  billing/POS (split payments, tax, hold/resume across
  devices — held bills are documents — void, returns)
  · sales counter · inventory (view/search/add/edit/
  adjust/CSV import) · customers + udhaar (F-6 FIFO
  derivations, statement) · day close per cash account
  (expected cash is the journal's own figure) ·
  receipt printing honouring the web-saved print
  template (`resolvePrintDesign` ported, brand logo
  consumed from the owner doc; the editor stays F4).
  The app NEVER seeds and never writes demo data;
  Firestore's persistent cache is the only on-device
  store; rules are untouched (v8, client-agnostic —
  the design's two claims verified in the F1 design's
  checkpoint terms).
- **Printing (§5)**: one receipt model feeds three
  pipelines — PDF → system printer/share (the
  `printing` package), plain-text share, and ESC/POS
  raster bytes (mm80: image, feed, drawer kick, cut).
  The ESC/POS bytes are delivered through the share
  sheet as a `.bin` file in F1; **direct Bluetooth/USB
  transport is the named F2 gap** (the `ReceiptPrinter`
  seam is where it lands). Windows raw ESC/POS stays
  later than F1 per §5.5 — the driver path serves it.
- **Verification (completion run, 2026-10-23)**: the
  F1 build run ended overnight without a report; a
  completion run re-established the state and closed
  the gaps. `flutter analyze` — no issues;
  `flutter test` — 38/38 (fixtures 16 · core 19 ·
  themes 3); TS harness — 1,389/1,389. That run also
  fixed three defects the overnight run left behind:
  the dashboard's 14-day chart (named in the F1 set)
  was absent; the ESC/POS profile lacked the drawer
  kick §5.2 names; and `harness/tsconfig.json` carried
  absolute local paths that would have compiled
  nothing on a CI runner (now relative; output
  byte-equivalent).
- **A web-side fix rode along**: `web/lib/seed.ts`
  built seed timestamps with local-time arithmetic
  while the business calendar is PKT — on any non-PKT
  runtime in the 00:00–05:00 PKT window, seed rows and
  journal entries landed a day off their `dayOffset`
  and the FIX suite's reconciliation checks went red.
  `rebaseTs`/`dayTs`/`docDayISO` now compute through
  the `periods.ts` PKT primitives; the frozen seed
  identities and the SHA fingerprint are untouched
  (the fingerprint's normalisation drops `ts`), and
  clock-robustness was proven at five fake-clock
  instants straddling the PKT rollover.
- **Builds & delivery**: no local APK — Gradle's
  client↔daemon IPC (a loopback socket in every mode,
  daemon and single-use alike) never completes on
  this VM: the daemon starts and waits, the client
  receives nothing. The fault is Java-side (a Python
  loopback pair succeeds; the equivalent Java socket
  test hung silently) with the micro-cause
  undetermined, so CI is the compile proof, exactly
  the design's R-F1 posture. (Correction to the build note above: the
  socket evidence, recovered in full after a runtime
  restart, shows a Python loopback pair succeeding —
  the hang is specific to the Java side, micro-cause
  undetermined; JVM flags such as preferIPv4Stack /
  /dev/urandom egd are the named next experiment if
  the local build is retried.) The repo (github.com/Tanzeel8246/dukaan-ai)
  was prepared for the save in the completion run —
  the retired scaffold's 15 files under `flutter-app/`
  were removed (commits 841483eb7…764277dbc) — but the
  snapshot push itself is blocked: the connector's
  push route needs the Git Data API, which answers
  403 (App installation permission; the Contents API
  used for the deletions works). A 156-file manifest
  sits ready beside the sync record; the push lands
  when the App's access is widened or the owner pushes
  once from a git client, and only then does app-ci
  (fixture freshness → harness → i18n drift gate →
  analyze → test) run its first leg. Eight binary files
  (Nastaliq TTF, gradle-wrapper.jar, launcher icons,
  app icon) cannot ride the connector's text-only
  snapshot push and await one ordinary owner-side git
  push — until then app-release cannot finish an
  artifact, and Android stays debug-signed/INTERNAL
  per §7.3 until the owner provisions the keystore.
  The §7.5 acceptance legs (owner-device script,
  cross-client) are NOT yet run — they wait on the
  first installable artifact. Full record:
  `flutter-app/F1-REPORT.md`.

## Phase F · F2 — Flutter back office + documents + finance + reports (design: ERP-PHASE-F-DESIGN.md §F2)

  The F1 pattern held end to end: fixtures first, then
  composers, then the store, then the screens. A new
  additive exporter (`harness/fixtures-export-f2.js`;
  the F1 exporter and fixture untouched) produces
  `fixtures/f2-core.json` — 22 scenarios, 25 entries,
  whole-journal trial balance 0 — and the Dart suite
  asserts byte-for-byte equality with the web
  composers, the P&L ≡ Sales-report identity in Dart,
  and supplierBalance ≡ payables GL. Two exporter
  transcription errors (supplier-payment and
  tax-payment memo shapes) were caught against the web
  source and fixed; the web stays ground truth.
  Verification (all observed): `flutter analyze` no
  issues; `flutter test` 88/88 (38 F1 + 35 F2 fixture
  + 15 F2 core); TS harness 1,389/1,389; both fixture
  files regenerate byte-identical (md5 cfad6131… /
  f77ad00a…); i18n drift gate clean (2,580 keys).
  Shipped: purchases + suppliers with statements and
  PV/cheque payments; purchase returns with DN;
  expenses on the F-5 mirror semantics (cheque-aware);
  the QT/SO/DC/PO document chain with derived
  fulfilment and exactly-once conversions into the
  billing desk via a store prefill; CN/DN register;
  the cheque registry with the full deposit / clear /
  bounce / return lifecycle and cheque-aware voids;
  Finance (journal viewer, trial balance, money
  accounts, aging, tax position + capped payments,
  cash entries, transfers); all 14 reports behind a
  slim toolbar with share-text; the forecast surface.
  The shell now gates every F2 destination by the web
  RBAC matrix and gives narrow layouts a More grid.
  ESC/POS direct transport (Bluetooth SPP + USB-OTG,
  `print_bluetooth_thermal` + `usb_serial`) is
  implemented behind the ReceiptPrinter seam with the
  share-.bin fallback on any absence — implemented and
  analyze-checked, NOT device-verified: no printer or
  Android device exists in this environment, and no
  delivery is claimed. Known partials: conversion
  picks default to full remaining quantities; RV/PV
  vouchers and reports share as text (designed print
  layouts not raster-ported); draft documents are
  create/delete only in the UI. One composer gap was
  found and closed in the run: the purchase-return DN
  now carries its reason (composer → store → UI).
  Full record: `flutter-app/F2-REPORT.md`.

## Phase F · F3 — Flutter operations: warehouses, transfers, manufacturing, jobs (design: ERP-PHASE-F-DESIGN.md §F3; web semantics: ERP-PHASE-C-DESIGN.md)

F3 ports the web's Phase C operations to Flutter with the
same fixtures-first discipline. A new additive exporter
(`harness/fixtures-export-f3.js`) composes
`fixtures/f3-core.json` — 7 scenarios, 15 entries,
whole-journal TB 0, WIP 0 — with the REAL web libs; the
Dart ports assert byte-for-byte equality, including the
full production cycle (issue 9,720 → completions 5,832 +
2,916 → scrap 972 → pool EXACTLY zero), transfer
close-short losses split by stock class, accrued +
over-produced completions, close-out write-offs, the job
materials cycle with pooled advances and the job profit
identity (−1,140 on the fixture job), and both reclass
directions. F1/F2 fixtures regenerate byte-identical
(md5 cfad6131… / f77ad00a…; f3 25123992…).
Verification (all observed): `flutter analyze` no
issues; `flutter test` 125/125 (88 F1/F2 + 16 F3 fixture
+ 21 F3 core); TS harness 1,389/1,389; i18n drift gate
clean (2,580 keys — no dictionary keys added).
Shipped: pure Dart cores for stock levels (the §1.3
resolution rule — rows are complete truth once any row
exists — plus the entry-free stockV1 derivation, promised
/ availability partition, drift + recount), transfers
(transition table, in-transit derivations, receive
validation, the transfer-loss and reclass builders),
BOMs (immutable versions, draft validation), production
(pool arithmetic, snapshot run defaults, prepareIssue
with paid/accrue settlement, final-completion absorption
of the entire pool), and jobs (stage derivation, material
prepare with net-position validation, pooled advances,
profit figures). The store subscribes to
stockTransfers / boms / productionOrders / jobs; its
warehouse selectors now delegate to the pure core,
replacing the F1 per-pair fallback with the web's
product-level rule; postBill flips a billed job to
delivered in the same batch. Screens: warehouses
(directory, default/archive discipline, per-warehouse
stock view, drift recount), transfers (draft → dispatch
→ partial receive → close-short with the loss
confirmation / return-to-source), manufacturing (recipe
versions + history, production orders with event log and
issue/complete/scrap/close dialogs), jobs (stage flow,
materials, advances through the existing repayment
action with the job note, billing hand-off with the
issued-materials warning on the billing desk), the
inventory class toggle posting its reclass entry, and
warehouse-scoped stock adjustments. Declared partials:
the job-stage LIST editor stays an F4 settings surface;
transfer / production / work-slip print layouts are not
raster-ported; the web's updateProduct adjustment +
revaluation side-writes are not ported (the class toggle
posts identically). Full record: `flutter-app/F3-REPORT.md`.

## Phase F · F4 — Flutter HR, loans, fiscal close, Tally + the settings editors (design: ERP-PHASE-F-DESIGN.md §F4; web semantics: ERP-PHASE-D-DESIGN.md + ERP-PHASE-E-DESIGN.md)

F4 ports the web's Phase D (staff, payroll, loans, fiscal-year
close, Tally/CSV export) and the remaining Phase E settings
surfaces to Flutter with the same fixtures-first discipline. A
new additive exporter (`harness/fixtures-export-f4.js`)
composes `fixtures/f4-core.json` — 8 scenarios, 49 entries —
with the REAL web libs; the Dart ports assert byte-for-byte
equality, including a full payroll cycle (advance → C4-style
unassigned production accrual → PAY-1 → partial payments →
bucket settle, the `salary_payable` identity GL ≡ Σ employees
+ bucket holding at every checkpoint), a payroll reversal with
re-run absorption, a flat loan lifecycle whose instalment
parts follow cumulative allocation (14,285.71 ×3 alternating
14,285.72 — NOT naive division), a fee-netted drawdown, a
reducing-charge loan, a charge-free receivable loan, a full
fiscal close cycle (checklist gates, ONE fy_close entry,
mirror reopen with stack discipline, openings identical to
the pre-close balance sheet), and the Tally export (model
equal, XML byte-for-byte, CSV byte-for-byte, exported XML
re-parsed and reconciled to the trial balance in both
runtimes). F1/F2/F3 fixtures regenerate byte-identical
(md5 cfad6131… / f77ad00a… / 25123992…; f4 02fa26ef…).
Verification (all observed): `flutter analyze` no issues;
`flutter test` 185/185 (125 F1–F3 + 30 F4 fixture + 30 F4
core); TS harness 1,389/1,389; i18n drift gate clean (2,580
keys EN ≡ UR — F4 added NO dictionary keys; a key audit of
every label used by the new screens passes against the
generated dictionary). Shipped: pure Dart cores for payroll
(attendance cycle + §1.4 proration, the NET accrual/payment/
advance/mirror builders, run-line figures), loans (terms
refusals incl. charged receivable lending, cumulative-
allocation schedules, ordinal confirmed charge accruals,
diary ≡ journal position identity), fiscal close (derived
checklist, closing/reopen builders, stack discipline) and
Tally/CSV (fixed COA→group map — names overridable, groups
never — party-ledger census, in-file openings), plus ports
of the E2 branding pipeline (compression ladder, hard caps,
refused over-cap with figures) and the E3 Raast seam
(RAAST_FRAMING stays bare/provisional in Dart exactly as on
the web — the owner-fixture pin is still open). The store
subscribes to employees / attendance / payrollRuns / loans /
periods / branding and carries the Phase D action set with
the web's gates and one-batch doc+entry commits through the
guard; NO new Firestore rules version is needed (rules v7/v8
already carry all six collections). New surfaces: Staff
(directory, tap-to-mark attendance grid, payroll runs with
draft editor, payments/reversals, salary slips), Loans
(register, schedule states, confirmed charge accrual, editable
repayment split, event reversal), Settings (profile, money
accounts + transfers, tax slabs with derived defaults,
document numbering, the job-stage list editor carried from
F3, print-design editor with live receipt preview, brand-asset
slots with the real compression pipeline, Raast card with the
PROVISIONAL label verbatim, period locks and fiscal-year close
behind the E5 PIN gate, staff & roles, Tally ledger names),
and the Finance overview's salary/loans breakdowns + the
Tally XML / journal CSV export card with the §5.3 honesty
note. Declared partials: brand-asset encodes walk the ladder
with the `image` package, which has no WebP encoder — a WebP
ladder step is encoded as PNG instead, so an image the web
could squeeze under a cap as WebP may be refused here (the
cap itself is never bent; refusal carries the figures); the
salary slip's print action shares the captured PNG / plain
text rather than driving an ESC/POS raster. Full record:
`flutter-app/F4-REPORT.md`.

## Phase F · F5 — Flutter hardening + distribution readiness (design: ERP-PHASE-F-DESIGN.md §F5)

Phase F closes. The three-client week-in-the-life now runs as a
test: harness/fixtures-export-f5.js composes sixteen posting
events over one evolving shop with the real web functions,
alternating web/app clients (purchase, counter sale, part-udhaar
bill, salary advance, repayment, a web return against the app's
bill, a transfer closed short, rent, production issue +
completion with the WIP pool absorbed to exactly zero, payroll
accrual, both salary payments plus the unassigned-bucket
payment, a supplier payment, and an FY-close drill); the Dart
suite re-composes every app entry byte-for-byte (and three web
entries as a cross-client bonus) and asserts the merged
identities — trial balance zero after every event, P&L net
revenue == sales-report net revenue before and after the close,
salary_payable composition at five checkpoints ending at zero,
stock rows + in-transit == stockQty with the inventory GL
movement == the shelf value delta, receivables and payables GL
== their subledgers, originDevice stamps on app entries only.
The offline/conflict drills pin the failure modes: duplicate
bill #118 from two devices (detector flags, nothing renumbers,
both entries coexist balanced), a period locked after
composition (guard refuses at flush; the RejectedWrite tray
record round-trips whole), and the last unit sold twice
(derived stock −1, flagged never clamped; recount adjustment
and recountLevels remedies proven). The declared-partial sweep
closed: conversion per-line pick quantities (editor over the
derived remainders; the store clamps again), RV/PV voucher and
report print layouts, the job work slip, and the salary slip —
all as designed pages (core/print_docs.dart builders +
features/print/doc_view.dart) on the receipt's three
transports, builders unit-tested; and the sync.online wart —
the key now lives in the shared dictionary (pin 2,580 → 2,581,
amended at every site in the house style; main.dart uses the
typed getter). Distribution is ready as files: version already
at the §7.4 birth version 6.0.0 (release workflow now stamps
+N from the run number), CI fixture freshness extended to all
five fixtures, a binary-assets assert step in both workflows
(b64 sidecars decoded if present; the eight real binaries
verified non-empty), Windows checksums added, bilingual
release notes (flutter-app/RELEASE-NOTES.md) and the owner
runbook (flutter-app/DISTRIBUTION.md: secrets, keystore,
Actions run, Q2 sideload-first / Q3 unsigned-Inno standing
answers, the §7.5 acceptance script). The two authorized local
build experiments were spent: with either JVM flag the Gradle
daemon is now reached (the F1 IPC hang did not reproduce) and
the build dies in Java TLS through this VM's egress proxy — no
APK was produced, neither flag is baked in, and cloud CI
remains the build route. Final gates: flutter analyze 0;
flutter test 213/213 (F5 adds 28: week 19, drills 5, print
builders 4); TS harness 1,389/1,389; fixtures f1–f5
byte-stable (f5 md5 36660397…); i18n 2,581 drift-clean; rules
file unchanged at v8 (594 lines). The owner's one-push package
is ~/workspace/your_files/dukaan-ai-FULL-source-for-github.zip
with its manifest alongside; nothing was pushed (GitHub parked
by owner decision). Full record: flutter-app/F5-REPORT.md.

## Phase G · G1 — Tenancy foundation, web (design: ERP-PHASE-G-DESIGN.md §1/§4/§6/§7.2/§8-G1)

SOURCE ONLY — not deployed; the live site runs what the owner
uploads. G1 builds the tenancy layer on the web (Flutter parity
is G5): the platform collections, rules v9 part 1, the lazy
migration, the invite → claim flow and the header switcher.
Nothing in G1 gates on a plan — the snapshot is data until G2.

**What landed.** `web/lib/tenancy.ts` (new, pure — no Firebase
imports): plan snapshots (trial 2 users / 200 invoices /
standard, +14d; founding = Advanced limits 10 / 10,000, both
expiry fields null), the PKT month counter baseline, and the
write planners every client executes — `planMigration`,
`planTrialBirth`, `planClaim`, `planLegacyBackfill`,
`resolveAccess`, and the switcher-index helpers (`indexWith`,
`healIndex`, `buildSwitcherList`, `membershipStatusFor`).
Rules v9 part 1 (863 lines): four delimited G1 spans — the v9
header note, the G1 helpers (`businessBirthOk`,
`selfClaimOk`, `hasPendingInvite`, `isMemberOf`…), the seven
platform match blocks (`businesses`, `businessMembers`,
`businessInvites`, `userMemberships`, `businessCounters`,
`platformAdmins` structure-only, `businessEvents` create-only
for everyone), and amendment #1, the design's ONE named
amendment to pre-existing text: access resolution gains a
membership leg AHEAD of the legacy staffIndex leg
(owner → membership → legacy), where the membership leg
additionally requires the caller's email to still sit in the
owner doc's `staffEmails` mirror — so a removal landing on the
mirror cuts both legs at once (R-G4), and the v8 `isStaffOf`
body survives verbatim as the fallback. NO leg anywhere grants
`platformAdmins` access into `users/{uid}` — §2.3's doctrine
is structural (harness-asserted on the users-match region).
The registry create is birth-shape-validated
(`businessBirthOk`: trial XOR founding; anything else fails).
Counters are born once and take NO client updates in part 1 —
G2's batch-paired arithmetic is part 2's named amendment.
`firebase/firestore.indexes.json` gains the collection-group
index on `invites(email)` the claim scan needs.

**Migration + flows.** An owner's first G sign-in runs the
registry chain as the LAST step of StoreProvider's existing
owner-migration chain: `ensureBusinessRegistry` plans from the
pure lib — registry (founding comp), counters from a labelled
baseline (this PKT month's non-held bills + counter sales;
memberCount = the staff mirror's size), and the
`business.migrated` audit event. A brand-new account instead
gets `createTrialRegistry` after seeding (trial snapshot,
zeroed counters, `trial.started`). ZERO writes inside any
`users/{uid}` tree, ZERO journal entries (the store still
composes exactly 24 `makeEntry(` sites); the registry doc's
existence is the idempotency marker — no flag is written
anywhere, so a second sign-in plans nothing. Membership DOCS
for legacy staff are deliberately NOT written by the owner:
memberships are uid-keyed and only the staffer's own client
knows their uid — AuthProvider's resolver claims pending
invites (collection-group scan by verified email → `planClaim`
batch: membership with the INVITED role + invite marked
claimed + index entry + `membership.claimed` event), then
backfills a legacy staffIndex relationship the same way
(source "staff"), then heals `userMemberships` against the
live membership docs (dead entries drop, roles refresh; the
healed index persists only when it changed). One executor
seam: the pure plans carry ISO strings, but the rules validate
the trial end as a Firestore timestamp — StoreProvider's
`registryWriteData` converts `plan.trialEndsAt` via
`Timestamp.fromDate` on `businesses/` writes only.

**Staff write set (G1).** addStaff now writes the owner-doc
mirror + a `businessInvites` doc + an `invite.created` event
in one batch (staffIndex is no longer written by addStaff —
the legacy leg keeps serving pre-G staff, and an unclaimed
invite confers nothing). setStaffRole lands on the invite
(pending) or membership (claimed) the member actually has; a
pre-G member with neither keeps the A3 staffIndex write.
removeStaff deletes mirror + staffIndex + invite +
membership in one batch and logs `membership.removed` — the
mirror cut denies both access legs on the member's next read,
and their LIVE session loses the shop too: AuthProvider
watches the active business's membership doc and re-resolves
on its deletion, falling to the person's own/first business
or to the new `noAccess` state (AuthGate panel, biz.* copy)
when none remains. The header switcher
(`components/BusinessSwitcher.tsx`) lives in the TOP HEADER
per the owner's shell standard (never the sidebar): one
business → the plain shop name exactly as before; two or more
→ a menu of the healed index (own first, then name-sorted,
each row tagged with the person's role THERE). Switching
re-points `dataUid`/`role`, and StoreProvider's production
effect — keyed on `[cloud, uid, isStaff]` — tears down and
re-attaches every subscription; the owner-context
memberships/invites subscriptions re-key with it. Settings'
staff rows carry the membership chip (joined / pending /
legacy). Demo mode runs none of this (no platform writes, no
switcher) — by construction: the planners are pure and demo
never calls them.

**Verification.** TS harness **1,431/1,431 ALL SUITES GREEN**:
all 1,389 pre-existing checks pass with their suite totals
unpinned and unchanged; the only amendments are the house
same-check kind — rules pins now strip the four G1 spans
first (composed with the E2 strip where it already applied;
labels carry the lineage), and the dictionary count pins move
2,581 → **2,589** with the "+8 biz keys" lineage at all eight
sites (EN ≡ UR parity re-asserted). New G1 suite: **42
checks** — the resolver truth table (owner; member
manager/cashier; missing-role → manager on both legs;
legacy-only; stranger denied; REMOVED member denied by the
mirror cut even with the membership doc present;
staffIndex-deleted membership grant; divergence → membership
role wins; cross-business isolation; per-business roles),
counter month edges (Oct 31 20:30 UTC is November in PKT),
migration shape + founding fields + idempotence (second
sign-in plans zero writes) + users-tree purity (no write path
enters `users/`) + the post-migration frozen seed re-asserted
(21 entries, SHA e17e5bda…1168, Inventory 272,805 / Cash
50,000 / TB 0 / payables 27,900 / receivables 5,500), claim
flow (invited role carried; wrong-email / no-invite /
already-claimed / not-pending refusals; own re-claim a no-op;
role-less invite → manager), backfill (carried role, source
"staff", wrong-business and already-mirrored no-ops),
switcher healing (dead entry dropped + reported, roles
refreshed, own-first name-sorted list), rules assertions
(strip proof: v9 minus the G1 spans hashes to the pinned v8
SHA 04807268…; all seven blocks present; events + counters
update/delete denied; platformAdmins absent from the users
region; amendment order; birth validation referenced), i18n
parity for all 8 biz.* keys, and source wiring (switcher in
AppShell, absent from Sidebar; store still 24 makeEntry
sites; tenancy.ts imports no Firebase). Web `tsc --noEmit`
clean; `next build` completes the full route table.

**Release discipline.** No G1 zip — increments do not package;
the phase zip is G6's, per the design's release pattern.
When the owner ships Phase G, the order is: publish rules v9
+ the indexes file FIRST (`firebase deploy --only firestore`
covers both), then the web build. Pre-G clients are
unaffected by v9 (the membership leg is an OR; staffIndex
resolution is untouched; a business with no registry doc is
treated exactly as v8 treated it). Known G1-scope limits, by
design: counters are labelled baselines until G2 enforces;
platformAdmins is structure only until the G3 console;
owners cannot see a legacy staffer's membership doc until
that staffer's own first G sign-in creates it (their list
chip reads "legacy" until then, and their access never
depends on it).

## Phase G · G2 — Plans, counters, enforcement, web (design: ERP-PHASE-G-DESIGN.md §3/§4/§6/§8-G2)

**What shipped (source only — NOT deployed).** The plan
catalogue in code (`web/lib/plans.ts`): the five tiers over the
40 permission modules, partitioned exactly once (Core 26 +
Documents 6 + Operations 2 + Advanced 6, cumulative sets), with
the design's price anchors carried as data fields marked
owner-to-confirm (Q1). Enforcement NEVER reads the catalogue:
it consumes the assignment SNAPSHOT on `businesses/{bid}.plan`
(§3.2), so a catalogue change cannot re-limit a paying shop
mid-period. The derived plan state (trial / active / grace —
30 days, reads+prints+exports only / read-only / suspended /
founding) is one pure function of the plan record + now;
nothing stores it. Rules v9 part 2 (amendment #2) mirrors it
against `request.time`.

**The counter mechanism (§4.2).** `businessCounters/{bid}` now
has a real write leg: an update must be exactly one family's
legal step (invoice +1 in the same PKT month, or a forward
roll to 1; members ±1), validated in EVERY mode so observation
counters can never rot. The posting batches carry the write:
postBill and the counter-sale path ride the invoice counter;
addStaff rides +1 with the invite create; removeStaff rides −1
with the removal. Held bills count nothing; a held→posted
transition counts once, at posting; a VOIDED bill keeps its
count (the invoice was issued — the counter admits no decrease
except the month roll). Under a flipped `enforce`, the bills /
sales create legs and the bills held→posted update leg verify
the pairing via `getAfter()`, the invites/members legs verify
the seat pairing, the claim leg checks the user cap, all 14 A5
create legs require a postable state, and the journal create
plus the BOM / production-order / job / employee / payroll /
loan creates are tier-gated by refType / collection. Two
recorded readings: (1) **memberCount counts SEATS** — the
`staffEmails` mirror's size (an invite creates the seat, a
removal frees it, a claim moves nothing) — this is the reading
G1's migration baseline already used; (2) the counter READ
widened from owner‖admin to `canAccess`‖admin, because every
posting role composes its counter write from the live doc.
The event counter behind the observation panel was tightened
to the rules' own definition (a bill's line rows are not
events; only bill-less sale rows are), so counter and actual
can agree exactly. Known bound (design R-G3): two tills
composing from one counter snapshot race — the second batch's
arithmetic fails at commit rather than double-counting; the
store's fire-and-forget commit style is house-wide and the
panel makes any drift visible.

**Client surfaces.** Locked, labelled sidebar doors for
above-tier modules (from the snapshot, in every mode); the
route swaps an above-tier destination for the locked panel;
the shell banner speaks in trial (days + pool left), grace,
read-only and suspended states; gate refusals surface as
mapped banner copy (invoice limit / member limit / posting
paused) — the client refuses FIRST, so a rules denial never
reaches the user raw; the dashboard shows the live counter;
Settings → "Plan & usage" shows the snapshot, the derived
state, the enforce status, and counter-vs-actual side by side.

**Rollout (when the owner ships Phase G).** Publish rules v9
PART 2 first (`firebase deploy --only firestore`), then the
web build — pre-part-2 clients ignore the new legs entirely
(every plan leg short-circuits on `enforce == false`, and
every business is born and migrated with it false; the
harness asserts `enforce: true` appears nowhere in the
shipping code). Then OBSERVE: for each business, watch
Settings → Plan & usage until counter == actual across a
month boundary. **The enforce flip (later, per business, one
at a time):** set `businesses/{bid}.enforce` to `true` in the
Firestore console (the G3 super-admin console will own this
act with an audit event); verify the shop posts normally at
the desk and at the counter, that a limit refusal reads as
the mapped banner, and that grace/read-only behaviour matches
§3.6 before flipping the next business. Never flip a business
whose counters disagree with its actuals — reconcile first
(the counter doc is writable by the owner precisely so a
baseline can be corrected to the derived actual, in one
legal-step-at-a-time sequence or by console edit).

**Verification.** Harness 1,466/1,466 (1,431 prior with
house-pattern lineage amendments only + 35 G2): the catalogue
partition, snapshot equivalence with G1's birth shapes, the
state truth table at the boundary instants, the
counter-integrity suite (limit posts, limit+1 denied, PKT
roll, trial pool across the boundary, held/void semantics,
seat cap), both strip proofs (v9 final − G2 spans ≡ v9 part 1
SHA 5a960a50…; − G1 spans too ≡ v8 SHA 04807268…), the
no-plan-function-on-any-read-line pin, i18n parity (2,625
keys, +36 plan.*), seed identities re-asserted, `makeEntry(`
still exactly 24. Web `tsc --noEmit` clean. Nothing in G2 is
live: the deployed rules remain v9 part 1 (or v8) and the
deployed web remains the E release until the owner ships
Phase G per the order above.

## Phase G · G3 — Super admin console, web-only (design §2 + §8-G3)

The platform gets its operator surface: a `/platform` route
tree in the web app with its OWN minimal shell (AppShell's
platform branch: brand, the platform badge, language/theme/
account in the top header — no shop sidebar, no business
switcher, no plan banners, no PIN gate; the shop navigation
never links here). Access is exactly one fact — a
`platformAdmins/{uid}` doc for the signed-in user. Everyone
else (signed out, demo mode, a shopkeeper, a member) gets a
plain not-authorized page: no shop data, no redirect, nothing
to enumerate. The console's subscriptions start only AFTER
the grant doc has been read and found.

**BOOTSTRAP — the first admin (read this before first use).**
There is deliberately NO self-grant path: not in the rules
(platformAdmins create/delete require an EXISTING admin), not
in the UI, not in any planner. The owner creates the first
doc by hand in the Firebase console, once:

- Console → Firestore Database → Start collection (or open
  the existing collection) `platformAdmins`
- Document ID: the owner's own Firebase Authentication UID
  (Authentication → Users → the owner's row → User UID)
- Fields: `email` (string) = the owner's sign-in email ·
  `addedAt` (timestamp) = now · `addedBy` (string) =
  `"bootstrap"`

That one manual act is the root of the whole admin chain:
from then on, admins grant and revoke each other inside the
console (Admins tab), every grant/revoke writing its
`businessEvents` entry like every other act. Guards, enforced
by the planner itself (not merely hidden in the UI): an admin
cannot revoke themselves; the last admin cannot be revoked.

**What the console sees — and what it cannot (§2.3).** The
data layer (`components/PlatformData.tsx`) subscribes to
exactly the closed list, pinned in `lib/platform.ts` as
CONSOLE_READ_COLLECTIONS: `businesses`, `businessCounters`,
`businessStats`, `businessEvents`, `platformPayments`,
`platformAdmins` (plus a read-only count of
`businessMembers/{bid}/members` docs — the membership count
is a platform record, used as the member cross-check). There
is NO code path from the console to any tenant data: the data
layer imports neither the shop store, the selectors, the
ledger nor the reports, and names no tenant path; the harness
asserts this over the console's sources, and asserts at the
rules level that NO block in the entire `users/{uid}` region
(35+ collections enumerated, journal/products/customers/bills/
sales/employees/payrollRuns/loans among them) grants a
platform admin anything, and that `isPlatformAdmin` never
appears in that region. Aggregates (directory totals, by-plan
and by-state counts, this month's invoices, the trial pool,
confirmed revenue by PKT month, the pending-payment count)
are computed client-side from the closed list alone; every
figure that comes from the shops' own soft telemetry is
labelled as such, in both languages.

**The acts (lib/platform.ts planners; each act and its
`businessEvents` entry land in ONE batch — no act without its
event; a refusal carries zero writes).** Assign/change plan
(the snapshot is built by plans.ts `snapshotFor`, `assignedBy
"admin"`; Enterprise limits are explicit per-act overrides;
re-assigning the trial is refused unless the act is marked a
complimentary comp — re-trialling as an ordinary assignment
would hand every business endless free trials), extend period
(refused for founding, refused backwards), suspend/reactivate
(suspend demands a recorded reason; the G2 rules effect —
writes denied, reads open — does the rest), flip `enforce`
per business, confirm/reject platform payments (the admin
half of the §2.4 record flow: confirmation settles the
payment AND extends the business's period AND writes the
event in the same batch; rejection demands the note the owner
will read), grant/revoke admins (above). The console's audit
story is the detail view's timeline: it renders straight from
`businessEvents`, and the harness enumerates CONSOLE_ACTS and
proves every successful plan ends in exactly one event write
naming its actor, and every refusal writes nothing.

**The enforce flip, honestly (§2.2's counter-agreement
warning).** The platform lawfully has no exact per-business
actuals (deriving them would mean reading tenant data — the
one thing this phase refuses to build). The flip's inline
comparison is therefore the strongest lawful cross-check:
the rules-verified counters against (a) the shop-reported
bill count from soft telemetry and (b) the membership-doc
count. When they disagree, the flip form shows the figures,
prints the warning, and demands an explicit "flip anyway"
confirmation, which the event records
(`confirmedDespiteDisagreement: true`). Turning enforcement
OFF never needs the agreement. `enforce` remains `false` for
every business until flipped per business from this console;
per the G2 rollout note the flip still happens one business
at a time, after watching its counters agree across a month
boundary.

**Rules.** v9 final grows ONE delimited G3 span (the three
§6.1 blocks G1/G2 had not yet needed: `businessStats`,
`platformPayments`, `platformConfig`) — 1,222 lines, SHA-256
734f6ba4…. Legs per §1.2's writer/reader table: stats are
owner-written, owner/admin-read; payments are created ONLY by
the business's owner in `submitted` state naming themselves,
read by admin or that owner, and settled ONLY by an admin,
ONLY from `submitted`, ONLY into `confirmed`/`rejected`, with
the field diff pinned to the settlement fields and
`confirmedBy` == the caller; config is admin-written,
readable by any signed-in user, never deletable. Strip proof:
removing the G3 span restores the pre-G3 rules byte-for-byte
(SHA 89e84a29…, the G2-final pin), and the older proofs chain
through it unchanged. `platformConfig`'s rules landed with
this span; its editor surface belongs to G4, as does the
owner-side payment submission UI (G3 built the confirmation
queue against the designed `platformPayments` shape, so G4
only adds the owner side). Publishing order is unchanged:
rules first, then the web build.

**Verification.** Harness 1,503/1,503 ALL SUITES GREEN (1,466
prior — house-pattern lineage amendments only: the dictionary
pin 2,625 → 2,714 and the G1/G2 strip-proof labels now name
the G3 span they also strip — + 37 G3): the five-state
directory fixtures, hand-reconciled aggregates (this-month
invoices 11,075 across four non-trial businesses; the trial
pool counted separately at 137; confirmed revenue split
across two PKT months; two payments pending), every act
planner's happy path and every refusal (re-trial without
comp, period-required, no-expiry, not-later, reason-required,
note-required, counter-disagreement, not-submitted,
business-mismatch, already-admin, not-admin, self-revoke,
last-admin — each carrying zero writes), the audit sweep over
all eight acts, the privacy suite, the strip proof, and the
console source-wiring assertions. i18n parity kept: 2,714
keys EN ≡ UR (+89 `platform.*`, the console fully bilingual).
Seed identities re-asserted (21 entries · inventory 272,805
· cash 50,000 · payables 27,900 · receivables 5,500 · TB 0 ·
SHA e17e5bda…); `makeEntry(` still exactly 24; no shop
surface changed behaviour (every shop suite untouched and
green). Web `tsc --noEmit` clean; `next build` succeeds and
its route table includes `○ /platform` (static). Nothing in
G3 is live: deployment waits on the owner shipping Phase G
per the G2 order (rules v9 final first, then the web build),
and the first-admin bootstrap above happens in the Firebase
console before the console can be used at all.

## Phase G · G4 — Renewal flow + trial lifecycle (web) — 2026-10-23

Status: **implemented + fully verified in source; NOT deployed**
(the standing Phase G rollout order still applies: rules v9
final is already the shipping rules file and G4 changes NO
rules — the web build ships when the owner ships Phase G).

What G4 adds (design §3.4–§3.6, §8-G4):

- **lib/renewal.ts (new, pure):** the renewal core.
  `renewalQuote` prices a purchase FROM THE CATALOGUE
  (monthly, or annual = 10 × monthly) — the amount is never
  caller-supplied — and starts the bought period at the
  LATER of the current period's end and the submission
  instant (the trial's end while trialling), so bought time
  is additive and confirmation lag can never eat it:
  G3's `planConfirmPayment` applies the record's
  periodFrom/periodTo verbatim (pinned in G3, re-proven in
  the G4 walk). `planRenewalSubmission` composes exactly
  one platform write — a `platformPayments` record born
  `submitted` naming the owner themselves (the rules'
  create shape), with plan, billing period, amount,
  method, reference and an optional `ownerNote` (a NEW
  optional field on the payment doc; the admin's settle
  note stays `note`). Refusals (no registry, not-owner,
  reference-required, bad-method, and the quote refusals)
  write nothing. `lifecycleBanner` derives the shell
  banner from the plan view (trial countdown →
  approaching ≤7d → urgent ≤1d → grace with days elapsed +
  days of grace left → read-only; suspended), and
  `latestSuspensionReason` reads the live suspension's
  recorded reason from the business's own event log (a
  later activation clears it).
- **Owner renewal surface (Settings → PlanPanel):** the G2
  observation panel grew its action half — payment
  instructions rendered from `platformConfig` (only
  non-empty fields show), plan + monthly/annual pickers
  with a live quote preview (amount + period), method /
  reference / note form, submission through the store's
  `submitRenewalPayment` (the registry plan executor; NO
  journal entry — the store's makeEntry sites stay exactly
  24, harness-asserted), and the business's own payment
  history (submitted → pending copy; confirmed → the new
  period end; rejected → the admin's note + resubmit
  hint). Founding shops see no renewal section at all;
  Enterprise-current shops see the console-arranged note
  only. A still-pending submission is flagged in the
  panel. Suspended shops keep the full surface (the remedy
  is never blocked, §2.4).
- **Store (StoreProvider):** owner-context subscriptions to
  the business's own `platformPayments` (newest first) and
  `platformConfig/main`; an all-roles subscription to the
  business's own `businessEvents` (latest 50) feeding the
  suspension reason. **Hardening fix:** the registry read
  now normalizes Firestore Timestamps to ISO on the plan
  snapshot's date fields (`normPlanRegistryDoc`) — a trial
  end is STORED as a timestamp at birth (the rules require
  it) while every lib derivation speaks ISO; the console
  already normalized, the shop read did not. Paid period
  fields are stored as strings, so the conversion is a
  no-op for them.
- **Console (PlatformData / PlatformConsole /
  PlatformConfig / PlatformPayments):** a fourth tab,
  "Payment instructions", editing `platformConfig/main`
  (Raast number, IBAN, bank, account title, instructions,
  support contact). Saving runs the new console act
  **`planSavePlatformConfig`** — CONSOLE_ACTS grows 8 → 9,
  CONSOLE_READ_COLLECTIONS 6 → 7 (platformConfig) — whose
  plan writes the doc AND a `businessEvents` entry
  (businessId "platform", kind `platformConfig.updated`,
  detail = changed field names + before/after) in one
  batch, per the §2.3 audit doctrine. The payment queue now
  flags records whose amount ≠ catalogue × period with a
  red "Amount mismatch" badge (`paymentAmountCheck` in
  lib/platform; annual = 10× monthly; records predating
  the billingPeriod field infer their span from their own
  dates; Enterprise reads "custom"). The flag NEVER
  settles or refuses anything — the admin still confirms
  or rejects by hand.
- **Shell banners (AppShell):** the G2 banner block now
  renders `lifecycleBanner`'s derivation — trial countdown
  with invoice-pool remainder (unchanged copy), the 7-day
  and 1-day approaching/urgent notices, grace with
  days-left, read-only — each renewable state carrying the
  renewal link into Settings; the suspended banner names
  the recorded reason + the renewal remedy. State banners
  remain non-dismissible while their state persists; demo
  mode shows none of it (no plan view). New CSS:
  `.plan-banner.urgent`, `.plan-banner-link`.
- **i18n:** +47 keys EN ≡ UR (35 `renew.*` shop-side +
  12 `platform.*`: the mismatch badge, the config tab +
  editor). Dictionary 2,714 → **2,761**. The `plan.*`
  count stays 36 (renewal strings live under `renew.*`).

Verification (all run 2026-10-23, this session):
- Harness: **1,538 / 1,538 — ALL SUITES GREEN.** New G4
  suite = 35 checks, incl. the full scripted lifecycle
  walk (trial birth → trading → expiry → grace with
  posting denied under an enforce:true reading while the
  rules' read seam provably carries no plan condition →
  submit → confirm → active on the payment's own period →
  period end → grace → read-only → annual Advanced renewal
  → active; plus the rejected branch) with the shop
  journal's SHA-256 spot-asserted UNCHANGED at every step
  and a closing sweep over every platform write the walk
  produced (no tenant path ever targeted). Lineage
  amendments only, house style: the dictionary pin
  2,714 → 2,761 at all 11 sites; G3's read-list pin gains
  `platformConfig`; G3's act-list pin 8 → 9; G3's
  platform-key pin 89 → 101.
- Web: `npx tsc --noEmit` clean; `npm run build` clean
  (route table includes ○ /platform and ○ /settings).
- Rules: **byte-identical** — SHA-256
  `734f6ba4cebc9c19203e0d022b810a7e1c76e57fd644d040abbe2a421ad7d3ad`
  re-asserted inside the G4 suite. G4 needed no rules
  change: the G3-landed blocks already carried the surface
  (owner creates `platformPayments` as `submitted` naming
  themselves; `platformConfig` world-readable to signed-in
  users, admin-writable; a business reads its own events).
- Seed identities re-asserted (21 entries, SHA
  e17e5bda…1168, Inventory 272,805 · Cash 50,000 · payables
  27,900 · receivables 5,500, TB balanced); `enforce` stays
  false in every shipping default — G4 ships the
  lifecycle, not the lock.

Rollout notes (owner-side, when Phase G ships):
1. **No rules publish is needed for G4** (file unchanged).
2. **Two composite Firestore indexes** are needed by the
   shop-side renewal subscriptions (equality + orderBy):
   `platformPayments` (businessId ASC, submittedAt DESC)
   and `businessEvents` (businessId ASC, at DESC).
   Firestore offers one-click creation links from the
   console error on first use; until they exist the renewal
   history / suspension reason simply stay empty (the
   subscriptions fail silent by design).
3. `platformConfig/main` does not exist until an admin
   saves it once from the new console tab; until then the
   renewal surface shows the "instructions not published
   yet" copy. The first-admin bootstrap from G3 (manual
   `platformAdmins/{uid}` doc in the Firebase console)
   remains the console's entry condition.
4. Reading recorded per §3.5: the purchased period is fixed
   AT SUBMISSION as the later of (current period end,
   submission instant) and the console's confirmation
   honours the record verbatim — this is the design's
   "later of (period end, confirmation)" with the
   confirmation-lag risk removed in the shop's favour.

Next: G5 (Flutter parity for the G-layer: business
switcher, plan state, renewal submission) per §8.

## Phase G · G5 — Flutter parity for the SaaS layer (design: ERP-PHASE-G-DESIGN.md §5/§8-G5) — 2026-10-23

The Flutter apps gain the whole G-layer the web shipped in
G1–G4. Pure Dart ports of the web libs (`lib/core/tenancy.dart`,
`lib/core/plans.dart` over the generated `plans_data.dart`,
`lib/core/renewal.dart`) are proven semantics-for-semantics
against shared truth tables (`harness/fixtures-export-g5.js` →
`fixtures/g5-core.json`, asserted by
`flutter-app/test/g5_fixtures_test.dart`): the resolver truth
table, claim/backfill write plans, the plan-state boundary
table (end instant in-period, grace +30d inclusive, readonly
+1ms, suspended overlay, founding eternal), counter
arithmetic, the quote table and submission plans, lifecycle
banners — plus the cross-client leg (one staffer, cashier in
a trial business and manager in a basic one; both trades
compose byte-identically, counters move independently, each
journal balances).

Wired: four-leg session resolution with invite claims and
legacy backfill at sign-in; the two session watchers
(removal mid-session loses the business; empty re-resolution
→ the no-access screen); the header business switcher
(invisible at one business, persists under the web's key,
re-points every subscription); per-business rejected-write
tray labels; lifecycle + refusal banners with web copy;
plan-locked module doors from the snapshot tier; the
Settings plan panel (counter-vs-actual observation,
platformConfig instructions read-only, renewal submission —
one `platformPayments` record born `submitted`, zero journal
effect — and payment history); G-shape staff actions
(invite + counter rides + audit events); the registry
migration on owner load. Declared deltas: trial birth is
ported + fixtured but not wired (the app never births a
namespace — the F1 rule); the single documents door locks
on `quotations` (every document route's module shares the
standard band, so tier outcomes match web). Full detail:
`flutter-app/G5-REPORT.md`.

Verification:
- `flutter analyze` 0; `flutter test` **347/347** (213
  F1–F5 + 134 new G5).
- TS harness **1,538/1,538** (additive exporter only);
  fixtures f1–f5 byte-identical; i18n regenerated through
  the pipeline — 2,761 keys, drift gate clean.
- Rules **unchanged** (v9, SHA 734f6ba4…): every app write
  rides shapes the G1–G4 rules already admit.
- No APK build attempted (VM Gradle↔Java IPC hang,
  F1-proven); no live-device behaviour claimed.

Rollout notes (owner-side, when Phase G ships):
1. The two composite indexes from G4's notes
   (`platformPayments` businessId+submittedAt DESC,
   `businessEvents` businessId+at DESC) also serve the
   app's subscriptions; the `invites` collection-group
   query needs its collection-group index. All fail silent
   until created — renewal history, suspension reason and
   invite claims simply wait.
2. `enforce` stays false in every shipping default — G5
   ships parity of the lifecycle, not the lock.

Next: G6 (backup/restore + the phase-end finance-integrity
audit) per §8 — the last Phase G increment.

## Phase G · G6 — Backup & restore + Phase G release audit (design: ERP-PHASE-G-DESIGN.md §8-G6/§9) — 2026-10-23

Status: implemented + verified; NOT deployed (the Phase G
rollout in PHASE-G-RELEASE-AUDIT.md is the owner's to run).

The owner's data right (§3.7/§9) ships on both clients.
`web/lib/backup.ts` (import-free pure lib) defines the backup
format: one JSON document — all 35 tenant collections exactly
as stored (journal included), the owner doc verbatim, and the
business's OWN platform slice (registry, counters, stats,
memberships, invites, events, payments — foreign businesses'
docs filtered at the assemble seam) — under a manifest
(schema/format versions, exported-at, business id, per-collection
counts, platform counts, totalDocs, journal count, and the
journal's SHA-256 fingerprint computed the harness way: drop
`ts`, JSON-encode, hash). The lib's SHA-256 is hand-implemented
(sync/portable) and KAT-proven against Node's crypto; fed the
seed journal it reproduces the frozen `e17e5bda…1168`.
Restore is a planner + dumb executor: verify the file (refusals
in order — `not-a-backup` → `unknown-format` →
`manifest-mismatch` → `target-not-empty`, the last via the
subset rule: every existing target doc must be byte-identical
to the backup's, owner-doc difference alone never refuses),
then write only the missing documents — memberships/invites
verbatim under the target's paths (their schema carries no
inner business id), the owner doc LAST among data writes (the
source shop's period lock cannot gate the transplant's dated
creates), and the `restore.performed` platform event as the
final write. ZERO journal entries are composed (the store
still has exactly 24 `makeEntry(` sites); an interrupted
restore re-plans exactly the remainder, a completed one
reports alreadyRestored with no second event. Registry and
counters are NOT transplanted (the target keeps its born
registry; counters reconcile via the Plan & usage baseline).
Web surface: owner-only `BackupPanel` in Settings (mounted
outside demo; export available in every plan state because it
is reads only and the panel never consults plan state) + three
store actions (`exportBusinessBackup` / `planBusinessRestore`
/ `executeBusinessRestore`, one-shot reads, 450-op batches).
Flutter: `lib/core/backup.dart` port + `test/g6_fixtures_test.dart`
(19 tests) against `harness/fixtures/g6-core.json` (exported by
`fixtures-export-g6.js` from the REAL web functions), store
mirrors of the three actions, and an owner-only backup section
in Settings (share-sheet export via XFile.fromData; FilePicker
restore with the same refusal copy). i18n +25 `backup.*` keys →
**2,786 EN≡UR** on both stacks (harness pins amended in the
house lineage style; Dart drift gate clean).

Verification (all fresh, see PHASE-G-RELEASE-AUDIT.md):
- Web harness **1,569/1,569 ALL SUITES GREEN** (G6 suite: 31
  checks — SHA KATs, fingerprint identity, assembly/slice
  filter, tamper ladder, selector-digest round-trip, refusal
  truth table, resume, already-restored, write order, wiring).
- Web `tsc --noEmit` 0 errors; `npm run build` exit 0;
  `npm run build:static` exit 0 (out/index.html at root).
- Flutter analyze **0 issues**; flutter test **366/366**
  (347 inherited + 19 G6).
- Fixtures f1–f5 + g5 regenerated **byte-identical** (md5s in
  the audit); g6-core.json new (`2d09a70a…`).
- Rules **unchanged**: v9 FINAL, 1,222 lines, SHA `734f6ba4…`;
  the composed strip (G3→G2→G1) still reproduces the v8 SHA —
  the checklist's strip-proof re-ran inside the fresh harness.
- 'Demo' tokens in the shipped bundle: 27 (resetDemo 10) —
  identical to the Phase E audit; Phase G added none.
- `firebase/firestore.indexes.json` gains the two G4 composite
  indexes (`platformPayments` businessId+submittedAt DESC,
  `businessEvents` businessId+at DESC) alongside the existing
  invites collection-group index — packaging completion, not a
  rules change.

Packaging:
- `~/workspace/dukaan-ai-ERP-G.zip` — the fresh static build,
  1,837,693 bytes (255 entries / 219 files), SHA-256
  `00a9fb88…`, index.html at root, markers verified in the
  shipped bytes. Supersedes dukaan-ai-ERP-E.zip.
- `~/workspace/your_files/dukaan-ai-FULL-source-for-github.zip`
  refreshed (360 files incl. the whole G layer + this audit;
  `.env*` still excluded) with a new
  `dukaan-ai-FULL-source-MANIFEST.txt`. **GitHub pushes remain
  PARKED by the owner's order — packaged only, nothing pushed.**

Phase G is now COMPLETE (G1–G6). Remaining owner-side items
are the rollout runbook in PHASE-G-RELEASE-AUDIT.md (rules v9 +
indexes → web build → platformAdmins bootstrap → observe
counters → per-business enforce flips), the Raast bank-QR
screenshot (E3 gate, standing), and the F §7.5 acceptance run.

---

## Phase H · H1 — Loyalty journal core (web) — 2026-10-23

Implemented per ERP-PHASE-H-DESIGN.md §1 (doctrine), §5.1
(catalogue) and §6 (H1 increment). Web only; the Dart port is H2
and rules v10 belongs to H2 — **firestore.rules is untouched
(v9 FINAL, SHA `734f6ba4…`) and H1 adds no rules block and no
collection**: loyalty lives entirely inside the existing
journal + bill legs, per the design's doctrine.

What landed:
- COA 28 → **30**: `loyalty_payable` (liability/credit) +
  `expense_loyalty` (expense/debit), additive, `since:"H"`, with
  their Tally rows ("Customer Loyalty Payable"/Current
  Liabilities, per-customer party ledgers; "Loyalty Programme
  Cost"/Indirect Expenses) and FY-close membership derived BY
  TYPE from the registry (the cost sweeps; the liability never
  does). Voucher types loyalty_earn/loyalty_expire → Journal.
- `web/lib/loyalty.ts` (new): the settings resolver (design Q1
  defaults — 1 pt / Rs 100, 1 pt = Rs 1, 50% redeem cap,
  12-month expiry, Silver ≥500 / Gold ≥2,000 trailing-12-month
  points at 1.25×/1.5× earn SPEED only), the FIFO vintage fold
  (points derived from entry payloads with per-entry rate
  snapshots; returns restore LIFO; clawback debt rides its
  vintage), position/tier selectors, the derived expiry due-list
  + programme totals, the loyalty report builder, and exactly
  **3 `makeEntry(` compositions** (earn, clawback, expiry).
  StoreProvider stays at exactly **24** sites (24 + 3 = 27);
  redemption composes nothing — it is a Dr `loyalty_payable`
  leg inside the bill entry (payload `loyaltyPointsUsed`),
  validated pre-write against the fold (balance + cap) exactly
  like the cheque draft check.
- Store wiring: postBill stamps + validates points parts and
  posts the earn entry in the bill's own batch; returns
  re-credit points as points (`SaleReturn.loyaltyRecreditRs/
  Points` stamped) with the floored cumulative clawback
  companion (refId = credit-note id when issued); voids mirror
  the tender whole and reverse the earn in full (reversesId);
  `postLoyaltyExpiries` posts the derived due-list in one batch.
  `dayCloseSummary` excludes points parts from money buckets
  (the cheque precedent).
- Plan gating: `loyalty` PermModule (owner/manager full,
  accountant read, cashier none — the cashier's tender rides
  `billing`) joins via plans.GROWTH_MODULES at **Standard**;
  REFTYPE_MIN_TIER gains only `loyalty_expire: "standard"`.
- Surfaces: /loyalty desk (totals, expiring-soon, expired-
  unposted with the posting action, per-customer vintages),
  billing points tender (quote + balance + earn preview +
  plain walk-in note), customers directory + profile points/
  tier, loyalty section in the customers report, Settings
  programme section (owner). i18n +51 keys → **2,837** EN ≡ UR.

Verification (fresh):
- Web harness **1,615/1,615 ALL SUITES GREEN** — 1,570
  inherited-surface checks (the 1,569 baseline + 1 check the
  RBAC suite generates per matrix row for the new loyalty row)
  + the new **H1 suite: 45 checks**: the full lifecycle walk
  (earn across bills with Silver/Gold crossings → split-tender
  redemption → partial return with re-credit + clawback →
  completing return → void mirror + earn reversal → FY close
  sweeping `expense_loyalty` while `loyalty_payable` carries →
  owner-posted expiry release) with **TB == 0 and both audit
  identities asserted at every step** (GL(loyalty_payable) ≡
  Σ per-customer rupees; rupees ≡ Σ unspent points × snapshot
  rates), frozen seed SHA `e17e5bda…1168` re-asserted with both
  new codes reading zero there, guardrails (over-balance,
  over-cap, walk-in, disabled-programme), snapshot-rate and
  clawback-flooring fixtures, site counts, rules untouched.
- House pin amendments only: COA counts 28→30 (3 sites), RBAC
  matrix 40→41, G2 catalogue partition (Growth spread in;
  standard 34→35, advanced 40→41), D4 closing set 10→11
  (registry-derived), i18n totals 2,786→2,837 (12 sites).
- Web `tsc --noEmit` 0 errors.

Deferred (recorded, not dropped): §5.3's demo-seed programme
stays OFF in the demo data — enabling the programme in the seed
is H6 packaging work, so the frozen seed identities stay
untouched in H1. No live deployment is claimed for H1.

## Phase H · H2 — Loyalty Flutter parity (design: ERP-PHASE-H-DESIGN.md, H2) — 2026-10-23

**Verdict: COMPLETE** (source-level; no device/APK build or live
deployment claimed). Full record: `flutter-app/H2-REPORT.md`.

- Pure Dart port of `web/lib/loyalty.ts` (`lib/core/loyalty.dart`):
  resolver, FIFO vintage fold with rate snapshots, position/tier,
  totals, expiry due-list, quotes, report, and the 3 named
  composers — Dart `makeEntry(` sites 39 → **42**, all +3 in
  loyalty.dart (earn, clawback, expiry).
- Byte-for-byte proof: NEW additive fixture
  `harness/fixtures/h2-core.json` from
  `harness/fixtures-export-h2.js` (real web functions over the H1
  lifecycle walk; `harness.js` untouched). The walk replays in
  Dart with **TB == 0 + both identities at every step**, and every
  earn/clawback/FY-close/expiry entry is re-composed in Dart at
  its web composition point and compared line-for-line.
- Store wiring in web write shapes: postBill points validation
  (derived position + cap) → Dr `loyalty_payable` leg +
  `loyaltyPointsUsed` + earn in the same batch; returns re-credit
  + clawback citing the note id (store pre-mints it) or the
  return id; void points handback + earn reversal with
  `reversesId`; `postLoyaltyExpiries()`; day-close excludes
  points parts from `salesByMethod`.
- Surfaces: loyalty desk, billing points tender (aggregate
  quote/balance/cap hint, earn preview, walk-in note,
  points-needs-customer refusal), customers directory + profile
  points/tier, customers-report loyalty section, Settings
  programme section (owner). Plan gating: `loyalty` in the Growth
  band at Standard via the generator (`growthModulesData` now
  emitted); RBAC owner/manager full, accountant read, cashier
  none (tender rides `billing`). Zero new i18n keys — dictionary
  stays **2,837** EN ≡ UR, matrix **41** modules.
- Verification (fresh): flutter analyze **0**; flutter test
  **400/400** (366 inherited + 23 fixture + 11 native); TS
  harness **1,615/1,615**; fixture md5s f1–f5/g5/g6 unchanged;
  drift gate clean. Pin moves (lineage-labelled): g5 partition
  40→41 (standard 34→35), f4 BS+P&L 28→30, f4 P&L list
  +`expense_loyalty`.
- Declared partials: held-bill resume restores no payment rows
  (pre-existing, all payment kinds); fractional
  `loyaltyExpiryMonths` truncates on Dart read (malformed-doc
  edge only); receipt prints the points part under its carrier
  method on BOTH clients (verified web parity, no change);
  pre-existing day-close cheque/void bucket divergence observed
  and left for a future pass. Demo-seed programme stays OFF
  (H6).

## Phase H · H3 — Online storefront (web) — 2026-10-23

Design: ERP-PHASE-H-DESIGN.md §2/§5.2. The shop's public face
is a PUBLISHED SNAPSHOT, never a public tenant read; orders are
a create-only public inbox; conversion is a member act into
Phase B. Nothing here posts: journal `makeEntry(` sites stay
**24** in the store, and lib/storefront composes none.

- Pure core `web/lib/storefront.ts`: slug rules (3..40, single
  hyphens, reserved set incl. `demo` — the §5.3 preview's slug
  can never be a shop's); stock BANDS (out ≤ 0, low ≤ reorder,
  else in — never counts); snapshot assembly (hidden set sticky
  from the previous doc ∪ exclusions − inclusions; products
  sorted category → name, capped 500; nameUr/category only when
  non-empty; the E2 logo's data URL copied in as `logoRef` —
  the snapshot is self-contained); `storefrontContentEqual`
  (the auto-republish seam — stamp-only changes are equal, so
  the subscription echo never loops a write); the lit rule
  (enabled ∧ plan snapshot's set includes `storefront` ∧
  derived state ∈ {active, founding} — dark in trial/grace/
  readonly/suspension, per §2.6), exposed both as
  `storefrontLit(registry…)` and `storefrontLitState(tier,
  state…)` for the desk's PlanView; the inbox shape validator
  (exact key set, state born `new`, per-line {productId, qty}
  only, qty 1..999, ≤ 50 lines, bounded scalars) and
  `composeStoreOrder` (duplicate lines merge; a merge that
  overflows refuses rather than clamps); the page model (the
  public page's ONLY input — hidden excluded, out visible but
  not orderable); conversion planning against LIVE data (drift
  with both prices, deleted products dropped + flagged,
  quantities NOT clamped to stock, phone-match as an offer —
  0301… ≡ +92 301…; state ≠ `new` refuses, exactly-once) and
  `buildStoreSaleOrder` (born `open` + numbered, totals via
  estimateDocTotals, sourceType/sourceOrderId stamped).
- Tenancy/plans/permissions: `storefront` joins
  ADVANCED_MODULES (catalogue 41 → **42** modules; core 26,
  standard set 35, advanced set 42; moduleMinTier =
  "advanced"); RBAC row owner/manager full, accountant read,
  cashier none (matrix 41 → **42** rows; RBAC suite 115 →
  **116**). Nav gains /storefront in the Manage group; the
  sidebar's tier seam plan-locks it like every module.
- Rules **v10** (1,408 lines): v9 + four
  delimited H3 spans — the v10 header note; the §5.2 named
  amendment #1 inside `planJournalTierOk` ('loyalty_expire'
  joins the Standard-tier refType list — the ONLY loyalty
  string in the file; amendment #2 needed no text, the journal
  leg is refType-blind); the H3 helpers (`storefrontLit`
  deriving from the registry doc, `storeOrderCreateOk` with
  `createdAt == request.time`, `storefrontWriteOk`); and the
  blocks — `storefronts/{slug}` (public read = enabled ∧ lit,
  OR member canAccess for the always-available own preview;
  create = owner-shaped write; update additionally pins the
  EXISTING doc's businessId to the caller — anti-hijack;
  delete false, slugs never recycled) and `storeOrders`
  (anyone may CREATE a shape-valid order; members read their
  business's inbox; the one update moves state out of `new`
  into converted/dismissed over exactly the six conversion
  keys; delete false). Strip proof in-suite:
  stripH3Blocks(v10) ≡ v9 SHA 734f6ba4… byte-for-byte.
  Indexes gain the storeOrders (businessId, createdAt desc)
  composite. Rules cannot iterate list elements, so per-line
  order shape lives in lib + conversion re-validation; the
  rules carry the honest comment (worst case remains
  dismissible paper, §2.4).
- Store (StoreProvider): subscriptions to the own snapshot
  (by businessId, limit 1) + inbox (businessId, createdAt
  desc; server timestamps normalized to ISO at the seam);
  `publishStorefront` (OWNER-only, cloud-only — demo refuses;
  slug claimed on first publish, immutable after; slug cached
  on the owner doc as `settings.storefrontSlug` for the
  print/link seam), `unpublishStorefront` (enabled=false;
  doc + slug kept), auto-republish effect (owner + enabled +
  opted-in; content-equality guard; 1.2s debounce),
  `convertStoreOrder` (storefront-write ∧ saleOrders-write;
  the plan is RE-COMPUTED at the moment of the act; customer
  = phone match else created in the SAME batch as the SO +
  the inbox flip to converted), `dismissStoreOrder`.
- Surfaces: the Storefront desk (`/storefront`) — status card
  (lit/disabled/dark-plan/dark-state from PlanView), public
  link + link QR + copy, the owner publish form (slug claim,
  tagline, notice, per-product show/hide with band chips,
  auto-republish toggle), and the inbox (drift table with both
  prices before confirming, customer-match line, convert /
  dismiss, converted → SO number + link + wa.me tell-the-
  customer). The public page (`/s/{slug}`) renders from the
  snapshot ALONE (its source touches no tenant path and holds
  no set/update verb — harness-pinned); checkout writes one
  inbox create with `serverTimestamp()`; unreadable snapshot
  (unknown/off/dark) → the unavailable state; a member reading
  their own disabled snapshot gets the preview badge. AppShell
  gives `/s/` the bare platform-style shell (no AuthGate, no
  sidebar, no PIN). Receipts: PrintFooter gains the
  `.r-store-link` block (bills only, only when a slug is
  cached) — dashed-ruled and visually distinct from the Raast
  payment block: this QR ORDERS, it does not pay. Demo mode:
  no publishing, no public writes; the desk shows the labelled
  preview link and `/s/demo` renders the demo catalogue with
  the preview badge and a disabled checkout (static export
  emits exactly that one path).
- Backup (G6 manifest gains the H3 collections): the platform
  slice carries `storefront` (own business only, filtered at
  the assembler seam) + `storeOrders`; counts gain both keys;
  pre-H3 files still verify (counts tolerated with defaults);
  restore plans the snapshot + inbox back as documents into an
  empty namespace only (a different-slug target storefront
  conflicts; foreign target orders conflict); the executor
  writes inbox `createdAt` back as a real Timestamp. Tenant
  collections stay 35 — the storefront collections are
  top-level by design.
- i18n: +**108** keys (desk `store.*`, public `shop.*`,
  `nav.storefront`, `print.storeLink.caption`) in a new
  `parts/store.ts` — dictionary **2,945** EN ≡ UR; all
  inherited total pins amended with the lineage.
- Verification (fresh): TS harness **1,661/1,661** (1,615
  inherited + 1 RBAC row + 45 H3: slug table, band boundaries,
  snapshot shape + DEEP SCAN (no cost/stock keys anywhere),
  hidden stickiness, content-equality seam, lit truth table
  across plan states, hostile inbox shapes each refused,
  compose merge/overflow, page model from a snapshot literal
  alone, conversion drift + exactly-once, the full journey
  publish → order → convert → SO → challan → bill with TB 0
  and the bill entry identical to a hand-made order's, rules
  strip proof, span-content pins, backup slice + legacy
  tolerance + restore conflicts, makeEntry/source invariants,
  frozen seed identities re-asserted); web `tsc --noEmit` 0;
  `next build` exit 0 (/s/demo SSG, /storefront static).
- Declared partials: Flutter storefront parity belongs to the
  apps increment (H4 per the design's plan) — the apps neither
  publish nor convert yet; on the purely static export only
  /s/demo is a real file (real slugs need the server build or
  a host rewrite — no live public URL is claimed; nothing in
  this increment is deployed); an enabled-but-plan-dark store
  read by its own member renders without the preview badge
  (the badge fires for the demo slug and for disabled
  snapshots); rules per-line order validation is lib-side by
  Firestore's limits (see above).

## Phase H · H4 — Storefront Flutter parity + backup parity (design: ERP-PHASE-H-DESIGN.md, H4) — 2026-10-23

Scope reading (stated in flutter-app/H4-REPORT.md): the executed
increment numbering diverged from design §6 — executed H2 = Dart
loyalty only, H3 = web storefront; design-H3's WhatsApp-marketing
WEB increment has NOT been built (verified: no wa*.ts, no
waTemplates/waCampaigns/waSends anywhere in web/lib), so
design-H4's WhatsApp-in-apps leg has no TS source of truth to
fixture against and is BLOCKED/declared partial. H4 as executed =
Flutter storefront parity + the H3 backup-slice parity in the
Dart backup mirror, fixture-proven against the real web
functions.

- New pure core `flutter-app/lib/core/storefront.dart`: the full
  port of web/lib/storefront.ts — slug rules + suggestions,
  stock bands (never counts), snapshot assembly with the
  TS-undefined semantics carried as set-flags (sticky hidden set,
  stable decorated sort, 500 cap), content-equality republish
  seam (canonical-JSON equality), the lit rule
  (storefrontLit/storefrontLitState over derivePlanState +
  tierIncludesModule), the strict inbox validator, the composing
  merger (overflow refuses whole, never clamps), phone
  normalization + customer match, conversion planning (both-price
  drift, dropped-product flags, exactly-once state refusal), the
  SO builder (born `open`, sourceType/sourceOrderId stamped),
  the public page model (hidden cards never render), and the
  storefront origin/path/URL + resolveStorefrontLink seams.
- Types: SaleOrder gained sourceType/sourceOrderId (emitted only
  when non-null — pre-H4 shapes unchanged); ShopSettingsView
  gained storefrontBlock + storefrontSlug.
- Store wiring (lib/data/store.dart): storefronts (own-business,
  limit 1) + storeOrders (own-business, createdAt desc)
  subscriptions with error-swallowing like the G layer; actions
  publishStorefront (owner-only, slug claimed once, cached on
  the owner doc), unpublishStorefront, setStorefrontAutoRepublish,
  the debounced auto-republish tick (content-equality seam — a
  subscription echo never loops a write), convertStoreOrder
  (RBAC storefront∧saleOrders write; plan recomputed at the act;
  phone-match-or-create customer + SO + state flip in ONE batch)
  and dismissStoreOrder. Backup wiring: export reads the
  own-business snapshot + inbox into the platform slice; the
  restore probe reads them back (orders exportable-normalized);
  the executor writes an inbox doc's createdAt back as a real
  Timestamp. NO journal composition anywhere: Dart `makeEntry(`
  count in lib/ is 42 before and 42 after.
- Backup core (lib/core/backup.dart): BackupPlatformSlice gains
  storefront (KeyedDoc?) + storeOrders with the own-business
  seam filter at assembly (a foreign snapshot is dropped,
  foreign orders filtered), manifest platformCounts extended,
  verify tolerates pre-H3 files (absent keys default to 0) and
  refuses present-but-wrong-shape H3 members, planRestore gains
  the storefront subset conflicts (`storefronts/{slug}` on a
  different slug or different content, `storeOrders/{key}`)
  and the remainder writes.
- Desk (lib/features/storefront.dart + nav entry after Loyalty,
  planModule 'storefront'): status card with the web desk's
  state text, link row + copy, slug claim (pre-publish only),
  tagline/notice, the products checklist with band chips,
  auto-republish switch, publish/republish/unpublish, snapshot
  preview via the page model, and the inbox with counts, the
  pre-confirm drift dialog (customer match, both prices,
  changed/missing flags, live total), convert/dismiss, and the
  converted-order WhatsApp tell via the app's share sheet.
- Fixtures: harness/fixtures-export-h4.js (new, additive) →
  harness/fixtures/h4-core.json (md5 11cea2c20933ace57d4c0f5d67eb531e),
  exported from the compiled REAL web functions over the H3
  suite's cases; consumed by flutter-app/test/h4_fixtures_test.dart
  (26 tests) + test/h4_core_test.dart (7 native tests). CI: the
  freshness block gains the fixtures-export-h4.js line ONLY —
  the g6/h2 exporters stay out deliberately (see partials).
- Generated data: tools/gen_l10n.mjs regenerated — dictionary
  2,945 keys EN ≡ UR (ZERO new keys; every H4 label already
  existed from H3), permissions_data 42 modules with the
  storefront row (owner/manager full, accountant read, cashier
  none), plans_data with storefront in the Advanced band. The
  only inherited pin amendments: g5_core_test.dart's two
  catalogue counts (41 → 42 modules, Advanced set 6 → 7) with
  H4 lineage labels.
- Verification (fresh, final state): flutter analyze **0**;
  flutter test **433/433** (400 inherited + 33 new); TS harness
  **1,661/1,661** (harness.js untouched — H4 adds no TS checks);
  gen_l10n --check clean; fixtures f1/f2/f3/f4/f5-week/g5/g6/h2
  md5-verified BYTE-IDENTICAL to their pre-H4 baselines. The
  member-side journey is replayed in Dart against the fixtures:
  compose → inbox → drift plan → convert exactly-once → SO-9
  born open with source stamps.
- Fixture-integrity incident, disclosed in full in
  H4-REPORT.md: a CI-wiring probe re-ran the g6/h2 exporters;
  both committed fixtures were restored byte-exact (g6 from the
  G6 full-source zip; h2 by recovering its single volatile
  wall-clock id `j-mvks8hhtl` via the known md5). Root causes are
  pre-existing: post-H3 the TS assemble always emits the H3
  slice keys (so a g6 re-export legitimately differs — the
  committed g6 file is a frozen pre-H3 artifact and both clients
  tolerate it), and the h2 exporter leaves ONE FY-close entry id
  wall-clock-minted despite its byte-stability header.
- Declared partials: (1) WhatsApp-in-apps — BLOCKED, no web
  source of truth exists yet (design-H3 unbuilt); (2) desk QR +
  receipt store-link QR — the apps carry no QR renderer (E3's
  Raast QR is a bank-issued image asset by design); the link +
  copy + share seams are in place; (3) one micro-divergence,
  deliberate: the desk fills store.state.darkState's {state}
  placeholder with the live plan state where the web renders
  the placeholder literally; (4) NO device/APK build, NO live
  deployment, NO live public URL is claimed for H4; the demo
  seed's storefront stays off (H6's seed work, per H3).

## Phase H · WhatsApp — WhatsApp marketing (web) — 2026-10-23

Design: ERP-PHASE-H-DESIGN.md §3/§5.2. The shop's number, the
shop's customers, the shop's hand: campaigns go to opted-in
customers only, sent one by one by the shopkeeper from his own
WhatsApp over the proven wa.me pattern. The send log's `sent`
means exactly "the shopkeeper confirms he sent it" — no
delivery/read ticks exist anywhere in model or copy, and no
API client is built (the Cloud-API tier stays parked behind
the Blaze decision; the data model is already shaped for it).
Nothing here posts: journal `makeEntry(` sites stay **24** in
the store, and lib/whatsapp composes none.

- Pure core `web/lib/whatsapp.ts`: consent (`customerOptedIn`
  — absent ≡ false; `waConsentPatch` stamps state + moment +
  source on grants and revocations alike; `stripImportConsent`
  deletes every consent field from an import row — import can
  never set consent, so the `WaConsentSource` union is exactly
  "counter" | "storefront"); phone normalisation named once
  (`waIntlPhone`/`waPhoneOk`/`waMeLink`); template rendering
  ({name}/{shop}/{points}/{amount}; unknown tokens left
  standing); audiences as LIVE derivations resolved per launch
  with the consent filter as the resolver's last step for every
  kind — all_opted_in, tier (H1 fold), udhaar_outstanding
  (per-customer FIFO over `dayOffset`, mirroring the aging
  report), points_expiring (H1 vintages), inactive,
  storefront_customers (sourceType), service_due (delivered
  jobs older than `settings.whatsapp.serviceIntervalDays`,
  default **90** — the design names the field, pins no number);
  `planWaLaunch` (one `queued` row per resolved recipient,
  phones stamped at launch); the queue (`waQueueStep` head +
  session cursor for skip-for-now — skipping writes nothing
  and there is deliberately no voluntary-skip state;
  `waSendRecheck` reads consent from the customer doc AS IT
  STANDS at send time and `waSendTransition` lets the re-check
  override the act: an opt-out after launch lands in
  `skipped_optout`, never `sent`; a bad number lands in
  `skipped_invalid`); `waSuggestedReminders` (counts only,
  opted-in only); plan gates read from the ASSIGNMENT SNAPSHOT
  (`waModuleAllowed`/`waSendingAllowed` — sending degrades in
  grace/readonly/suspension, reads never gated, invariant 5).
- Tenancy/plans/permissions: `whatsapp` joins GROWTH_MODULES
  beside loyalty (catalogue 42 → **43** modules; standard set
  35 → **36**, advanced set 42 → **43**; moduleMinTier =
  "standard"); RBAC row owner/manager full, accountant read,
  cashier none (matrix 42 → **43** rows). Tenant collections
  35 → **38** (`waTemplates`, `waCampaigns`, `waSends` added to
  lib/backup's manifest + StoreProvider subscriptions + the
  Collections shape; demo seeds them empty and stays hermetic
  — the send step opens wa.me in the shopkeeper's own WhatsApp
  in both modes). Nav gains /whatsapp in the Manage group.
- Rules **v10 amended** (1,474 lines, SHA e556c92e…): PURE
  ADDITIONS in two delimited WhatsApp spans — a header note
  after the H3 header note, and the wa collections block
  inside `users/{uid}` after the journal match (reads narrowed
  to owner/manager/accountant, the payroll precedent; writes
  owner/manager; delete: templates only — campaigns and the
  send log are history; NO period leg, NO plan leg — the docs
  assert no money fact and plan gating is the client snapshot
  gates' job, the paper-doc precedent). Strip proofs, both
  harness-asserted: amended v10 − WhatsApp spans = H3-final v10
  byte-for-byte (SHA 4a410729…); − H3 spans too = v9 FINAL
  (SHA 734f6ba4…). The spans carry no "loyalty" string, so H1's
  strip prong stays honest.
- Store + desk: StoreProvider gains the three collections
  (cloud subscriptions with the D1 narrowed-read pattern) and
  eight actions (saveWaTemplate/deleteWaTemplate,
  createWaCampaign, launchWaCampaign, advanceWaSend,
  finishWaCampaign, setCustomerWaConsent,
  setWaServiceIntervalDays); `convertStoreOrder` gains an
  optional `{ waOptIn }` — storefront consent is applied at
  CONVERSION, in the same batch as the sale order, via a
  shopkeeper-confirmed checkbox on the inbox row (default
  off). New desk `components/WhatsAppView.tsx` + `/whatsapp`
  route: honest-limits card, suggested-reminders panel,
  service-interval setting (owner), template editor with the
  four dictionary-string starters, campaign composer with a
  live reach count, the one-by-one send queue (Open in
  WhatsApp → confirm → log), and the send log. Consent capture
  also lands in CustomersDirectory (form checkbox, profile
  line + opt-in/opt-out toggle; source "counter"). i18n
  **+109** keys (dictionary 2,945 → **3,054**, EN ≡ UR, real
  Urdu).
- Verification (fresh, final state): TS harness **1,706/1,706**
  ALL SUITES GREEN, runner exit 0 (1,661 inherited + 44 new WA
  checks + 1 generated RBAC row check). The WA suite proves:
  the consent truth table; the import guard; FIFO udhaar
  positions; every audience against fixtures with the
  consent-filter-last prong (a segment member who never
  consented is admitted by the segment test and excluded by
  the resolver); launch materialisation; the full queue walk
  incl. opt-out-after-launch → skipped_optout and bad number →
  skipped_invalid; progress completion; cursor semantics;
  snapshot gating (a Basic snapshot refused while the live
  catalogue grants whatsapp at Standard; grace pauses sending,
  not reading); both rules strip proofs; backup round-trip
  incl. the three new collections; makeEntry sites still 24;
  frozen seed identities re-asserted (Inventory 272,805 · Cash
  50,000 · payables 27,900 · receivables 5,500 · TB 0).
  `npx tsc --noEmit` clean; `npm run build` exit 0 with the
  `/whatsapp` route prerendered.
- Pin amendments declared: every `=== 2945` i18n pin →
  **3054** with "; WA pin amendment: +109 WhatsApp keys"
  appended to the lineage chains; G2 catalogue pins (Growth
  1 → 2, partition 42 → 43, tier sets 35/42 → 36/43); G6
  manifest/subscription pins 35 → 38 (+ the G6 fixture gains
  the three empty wa arrays); RBAC suite expected **116 → 118**
  — the pin had been stale since H1 (H1's loyalty row and
  H3's storefront row each added one generated "owner full"
  check; the inherited board was 1,661/1,661 passing with the
  runner exiting 1 on this pin alone) — amended with the
  lineage recorded at the suite header. The five direct
  stripH3Blocks rules-hash sites (G3/G4/G6/H1/H3 suites) now
  compose stripWaBlocks first, labels amended in place; the G1/
  G2 strip helpers compose it too.
- Declared partials: (1) the storefront CHECKOUT-side consent
  checkbox is NOT landed — the public order's create shape is
  exactly-keyed in rules (`storeOrderCreateOk` hasOnly) and in
  lib/storefront's validator, so an order cannot carry a tick
  without amending H3's own spans, which sit outside this
  increment's rules mandate (wa member-scoped spans only);
  consent lands at conversion instead (same-batch stamp,
  source "storefront"). The one-key amendment is a phase-audit
  question. (2) Design §3.2 lists import among the capture
  points; the §6 checkpoint and the parent mandate govern —
  import can never set consent, and the source value "import"
  is unrepresentable by construction. (3) The service interval
  default (90 days) is chosen where the design pins no number.
  (4) NO real message was sent, NOTHING is deployed, and no
  Cloud API anything exists — the amended rules ship with the
  next owner upload like every phase before it; Flutter parity
  is the next increment.

## Phase H · H5 — WhatsApp marketing, Flutter parity (design: ERP-PHASE-H-DESIGN.md §3) — 2026-10-23

- Naming: the executed H sequence governs — H1/H3 were the web
  increments (loyalty, storefront), H2/H4 their Flutter parities;
  the WhatsApp web increment above is the fifth executed H piece's
  semantic source, so this parity increment is **H5**, its fixture
  `harness/fixtures/h5-core.json`, its report
  `flutter-app/H5-REPORT.md`.
- `flutter-app/lib/core/whatsapp.dart` (new): the pure-Dart port
  of web/lib/whatsapp.ts — WaTemplate/WaCampaign/WaSend types,
  WaAudience (kind + only-its-own params serialised), consent
  truth table (`customerOptedIn`: absent ≡ false = NO),
  `waConsentPatch` (state+moment+source move together; sources
  exactly "counter" | "storefront"), `stripImportConsent`
  (import can NEVER carry consent), `resolveWaSettings`
  (field-by-field 90-day service-interval default),
  waIntlPhone/waPhoneOk/waMeLink/renderWaMessage (unknown
  placeholders left standing), `customerUdhaarPosition` (FIFO
  over dayOffset), `waSegmentMatches` + `resolveWaAudience`
  (consent filter LAST for every kind; points-expiring via the
  H2 loyalty fold; service-due via delivered jobs + interval),
  `planWaLaunch`, the queue (`waQueueStep` session cursor
  writes nothing; `waSendTransition` — the send-time re-check
  OVERRIDES the confirm act: opt-out after launch →
  skipped_optout, bad number → skipped_invalid),
  `waCampaignProgress`, `waQueueMessage` (live facts at send
  time), `waSuggestedReminders` (counts only), and the snapshot
  plan gates (`waModuleAllowed`/`waSendingAllowed` over the
  assignment snapshot; sending degrades in grace/suspension,
  reads never gated).
- Types/backup: Customer += waOptIn/waOptInAt/waOptInSource
  (toMap writes only when non-null — an unstamped customer keeps
  the pre-H5 doc shape); ShopSettingsView += whatsappBlock;
  `core/backup.dart` tenantCollections 35 → **38** (waTemplates/
  waCampaigns/waSends appended, web order).
- Store: WA trio streams (f1Collections 35 → 38), `waAudienceData`
  getter, saveWaTemplate/deleteWaTemplate/createWaCampaign/
  launchWaCampaign (snapshot gates enforced in the store,
  reasons forbidden/not-draft/no-template/plan-module/
  plan-state), advanceWaSend (a sendable head under a paused
  plan refuses BEFORE any write; skip verdicts still record;
  campaign auto-closes to done at completion), finishWaCampaign,
  setCustomerWaConsent (customersManage guard, patch update),
  setWaServiceIntervalDays (via updateSettings).
  convertStoreOrder gained `{bool waOptIn = false}` — the
  storefront-conversion consent stamp lands in the SAME batch
  as the sale order, source "storefront" (new customer born
  stamped; existing customer batch.update with the patch).
- Surfaces: `features/whatsapp.dart` (new WhatsAppScreen — honest
  limits card always, locked card when the snapshot lacks the
  module, paused notice when sending degrades, suggestions panel
  with Start pre-fills, owner/settings-writer service-interval
  editor, template editor with the 4 starters + two-step delete,
  campaign composer with LIVE reach, campaign list with progress
  + launch/open/finish, the one-by-one queue with the send log);
  nav entry after storefront (campaign icon, planModule
  'whatsapp'); customers directory form consent checkbox (create
  stamps only if ticked; edit stamps only on change; unchanged
  edits carry the stamp through the whole-doc write) + directory
  ✓ marker + profile consent block with since/source and toggle;
  storefront conversion dialog consent checkbox.
- Dictionary: ZERO new keys — l10n regenerated via
  tools/gen_l10n.mjs from the web dictionary (3,054 EN ≡ UR,
  drift gate clean); the generator also picked up the WA-era
  permissions row (owner/manager full, cashier none, accountant
  read) and plans growth band ['loyalty','whatsapp'].
- Fixtures: `harness/fixtures-export-h5.js` (new, additive) →
  `h5-core.json` (md5 67fd8649…; byte-identical across runs;
  added to the app-ci.yml freshness block). It replays the WA
  harness suite's own cases through the REAL web functions:
  consent table + patches + import strip, settings, phone/render,
  udhaar positions (al 3000/20d, bina 300/3d), the full segment
  table (8 audiences × 5 customers), resolved lists, suggestions,
  the launch materialisation, the whole queue walk (incl.
  opt-out-after-launch → skipped_optout), snapshot gates from
  real plans.snapshotFor output, and the backup slice (assemble
  with 1 wa doc each, restore write paths, round-trip).
  f1–f5/g5/g6/h2/h4 fixtures md5-verified BYTE-IDENTICAL
  (g6/h2 exporters NOT re-run, per their determinism caveat).
- Pin amendments declared (lineage-labelled in place):
  g5_core_test growth band ['loyalty'] → ['loyalty','whatsapp'],
  catalogue 42 → 43, Standard cumulative 35 → 36, Advanced
  42 → 43; h4_fixtures_test assemble comparison projects the
  (empty) WA trio out so it stays about the slices H4 pinned —
  the trio's own bytes are proven in h5_fixtures_test.
- Verification: flutter analyze **0 issues**; flutter test
  **469/469** (433 inherited + 25 h5 fixture + 11 h5 native);
  TS harness re-run **1,706/1,706 exit 0** (harness.js
  untouched); Dart makeEntry( sites **42 → 42** (marketing
  moves no money); rules file untouched; frozen seed identities
  untouched (no seed change in this increment).
- Declared partials: (1) BACKUP TOLERANCE DEVIATION — the web
  verifyBackup REFUSES a pre-WA backup file as `not-a-backup`
  (empirically proven against the compiled web lib: even the
  frozen g6 fixture file gets that verdict, because the web
  computeManifest requires all 38 tenant arrays present). The
  Dart mirror deliberately keeps the H3-precedent tolerance
  (absent stored count defaults to 0 for the three WA names):
  pre-WA backups stay readable/restorable in the apps — a
  data-right call (§3.7), flagged as a phase-audit question
  for the web side. (2) TRANSPORT — the apps have no
  url_launcher; every outbound gesture rides share_plus. The
  queue's Open records `opened` in the store, then shares the
  composed wa.me link via the OS share sheet (storefront-QR
  precedent). Log semantics are identical to web; no delivery
  state is ever fabricated. (3) The web checkout-side consent
  checkbox remains unlanded on web (inherited from the web
  increment — the order create shape is exactly-keyed);
  conversion-side capture is what both clients stamp.
  (4) NO real message was sent, no device/APK build (VM Gradle/
  TLS constraint stands — cloud CI only), NOTHING deployed;
  GitHub remains parked for the owner's one push.

## Phase H · PS/FA — Pashto + Farsi language packs (design §4; the design's H5)

- **What landed.** Locales widen `en | ur` → `en | ur | ps | fa`.
  PS/FA dictionaries are COMPLETE key-for-key from day one — 3,057
  keys each, in satellite part files (`web/lib/i18n/parts/<part>.ps.ts`
  / `.fa.ts`, each compile-pinned `Record<keyof typeof en<Part>, string>`
  exactly like UR) — and every string is a **machine draft**: the
  review manifest (`web/lib/i18n/review-manifest.json`) carries one
  `draft|reviewed` state per key, reviewer + date per language (both
  null — **no review has happened and none is claimed**). There is NO
  runtime machine translation anywhere; the drafts are static
  build-time text like EN/UR. New EN/UR keys: exactly 3
  (`settings.langPashto`, `settings.langFarsi`,
  `settings.langDraftPreview`); every pre-existing EN/UR value is
  byte-identical to the pre-increment snapshot (verified by diffing
  the compiled dictionaries and the regenerated Dart JSONs:
  0 changed, 0 removed, 3 added).
- **Badge (§4.2).** `web/lib/i18n/review.ts` derives the badge from
  the manifest: a PS/FA locale wears "Draft preview" while any key is
  a draft (currently 0/3,057 reviewed in both) and drops it at 100%
  reviewed, per language independently. No per-string markers. The
  header picker (`LangToggle`, now a four-locale menu) and Settings
  both show it; the demo shell uses the same picker, so the showroom
  wears the same badge.
- **Review workflow (§4.3).** `harness/gen-review-packs.mjs` emits
  CSV + readable MD packs per language (money surfaces first:
  billing, fin, reports, print). `harness/review-merge.js` merges a
  returned pack: corrections replace drafts, exactly the seen keys
  flip to `reviewed`, and it REFUSES key-set drift, stale draft bases
  on touched rows, and anonymous merges; states never move backwards.
  `harness/gen-review-manifest.mjs` rebuilds the manifest preserving
  existing states/reviewer/date.
- **Gates (§4.4).** Web compile parity extends to four locales; the
  harness gains a PSFA suite (25 checks: key sets, non-empties,
  per-key placeholder token-set parity across all four locales, the
  copy-through rule — a PS/FA value equal to EN that carries Latin
  letters must sit in the manifest's 40-key whitelist of brands /
  tech tokens / format-only strings / single-letter codes — manifest
  coverage, badge derivation + the pure state machine, the direction
  truth table, source pins for fonts/print/picker wiring, the merge
  tool's refusal table, pack presence + money-first order, frozen
  seed identities). `gen_l10n.mjs` now generates all four
  dictionaries + `lib/l10n/review_states.dart` and enforces the same
  four-locale parity + manifest coverage + copy-through rule for
  the apps; `--check` is clean.
- **Script/fonts (§4.5).** PS/FA are Naskh-first: web adds a
  `--font-naskh` system stack + `html[lang=ps/fa]` typography (no
  downloadable webfont); apps bundle ONE Naskh family — Noto Naskh
  Arabic Regular (197,420 B) + Bold (197,532 B), +394,952 B total —
  used by the app theme in ps/fa and by the print views' script
  choice (Arabic-block text → Naskh when the active locale is ps/fa,
  Nastaliq stays UR's), so the ESC/POS raster path shapes PS/FA
  exactly as it shapes UR. RTL reuses the UR flip (direction truth
  table pinned on both stacks). Digits stay Latin (`ps-AF-u-nu-latn`
  / `fa-AF-u-nu-latn` on print-sheet dates); the business calendar
  stays PKT/Gregorian — **no Jalali**, per the design. Dates/months/
  weekdays ride the existing dictionary keys; per-lang unit labels
  added in `lib/format.ts` + `lib/reports.ts` (their `Record<Lang,…>`
  maps are what forced completeness at compile time). Plan gating:
  none — a language is never sold (§4.5/Q6).
- **Verification.** TS harness **1,731/1,731 exit 0** (1,706
  inherited + 25 PSFA); the 15 dictionary-count pins amended
  3,054 → 3,057 with lineage. Web `tsc --noEmit` clean;
  `npm run build` exit 0. Flutter `analyze` **0 issues**; flutter
  test **478/478** (469 inherited + 9 new in `test/psfa_test.dart`:
  four-locale parity from the bundled assets, generated review
  table ≡ the web manifest read from disk, badge rule, direction
  table, and widget-level print-script proof — PS/FA receipts render
  the real dictionary strings in NotoNaskhArabic, UR in
  NotoNastaliqUrdu). Fixtures f1–f5/g5/g6/h2/h4/h5 untouched (no
  exporter ran). Merge-tool CLI dry-run against the real PS pack:
  3,057 rows planned, nothing written.
- **Declared partials.** (1) The PS/FA texts are DRAFTS awaiting the
  owner's named native reviewers (recruitment is the owner's, Q4) —
  usable from day one *as labelled drafts*; money surfaces are first
  in the packs so partial review covers them first (risk R-H5
  carried openly). (2) The AI assistant's reply engine remains
  EN/UR — its copy is hardcoded engine text, never dictionary copy;
  AssistantChat maps ps/fa → English at the engine boundary while
  the UI chrome is fully translated. (3) `settings.languageSub`'s
  EN/UR values still say "English or Urdu" (EN/UR values are frozen
  by this increment's no-touch rule; PS/FA values name all four).
  (4) A handful of app-only hardcoded EN/UR strings in the Flutter
  shell (sync screen, "More" label) predate this increment and
  follow their existing pattern. (5) Visual screenshot verification
  of PS/FA renders was not possible in this environment; shaping is
  proven at the widget/data level (font family + direction), not by
  screenshot. (6) NO deployment, NO device/APK build, GitHub parked.

---

## Phase H · H6 — Release audit + the four audit fixes + packaging — 2026-10-23

Phase H closes against its design §6 checklist: **PHASE-H-RELEASE-AUDIT.md**
is the audit of record (fresh full verification, the four fixes with their
proofs, the acceptance matrix, every declared partial in one list, the
updated rollout runbook). Headline state at close: web harness
**1,754/1,754, runner exit 0** (1,731 inherited + 23 new H6 checks);
web `tsc --noEmit` clean; server + static builds pass; Flutter analyze
**0 issues**, tests **479/479**; rules **v10 FINAL as amended by H6 —
1,489 lines, SHA-256 `f10b2ee0…` (full:
`f10b2ee07ceb0c5a583f3762fa021222fb1a9a90832bf566956ae157372220ba`)**;
dictionaries **3,058 keys × 4 locales**;
catalogue 43 modules; tenant collections 38; COA 30; web makeEntry
24 + 3 loyalty compositions (27), Dart 42; frozen seed identities
untouched (21 entries, SHA `e17e5bda…`, Inventory 272,805 · Cash 50,000 ·
payables 27,900 · receivables 5,500 · TB 0).

The four fixes (each harness/fixture-proven, each recorded in the audit):

1. **Web backup tolerance** (H5's declared divergence closed): web
   `verifyBackup`/`computeManifest`/`planRestore` now tolerate backups
   written before a collection existed — absent array ≡ empty, the
   three WhatsApp counts default to 0 in the stored manifest, the
   H3 platformCounts precedent — aligned to the Dart twin under the
   §9 data right. The frozen g6 fixture file verifies AND plans a
   restore on web; the tamper ladder still refuses with pinned reasons;
   a present-but-non-array collection is still corruption.
2. **Storefront checkout consent** (the WhatsApp increment's declared
   gap closed): ONE key joins H3's exactly-keyed order shape —
   `waOptIn`, the customer's OWN tick on the public checkout form.
   Rules amended in a delimited H6 span inside `storeOrderCreateOk`
   (present ⇒ exactly true; absent ≡ no consent) + an H6 header note;
   `stripH6Blocks` extends the strip chain — stripH6 alone reproduces
   the WA-era v10 (`e556c92e…`) byte-for-byte, the composed strip
   still lands on v9 FINAL, and the WA suite pin was amended with
   lineage (stripH6 funnels through the WA helper). Both clients'
   shape mirrors + composers mirror the rule (composer stamps only
   from an explicit true); conversion (web + Dart) stamps consent
   (source "storefront") from `order.waOptIn` alone in the conversion
   batch — the desk capture toggle/dialog is REMOVED (display-only
   badge/chip now); import still can never carry consent. New key
   `shop.consentLabel` in all four locales (PS/FA drafted; dictionary
   delta proven to be exactly this one key — removing it reproduces
   every pre-change dictionary hash); manifest + packs regenerated
   (3,058; 0 reviewed); Dart l10n regenerated drift-clean.
3. **Demo loyalty** (H1's deferral closed): demo-only getters
   (`getDemoLoyaltyEntries`, `getDemoSettings`) give the showroom a
   small programme at Q1 default terms — cu-1 earns 120+80, cu-2
   earns 250, cu-1 redeems 150 points as a bill tender leg and earns
   20 more; end state cu-1 **70 pts / Rs 70**, cu-2 **250 / Rs 250**,
   liability **Rs 320** in fold AND GL, TB 0 — composed with the real
   earn composer. The cloud seed is untouched (frozen SHA re-pinned);
   a real shop's programme still starts OFF; demo stays hermetic.
4. **Dart day-close alignment + exporter determinism** (H2/H4 items
   closed): `dayCloseSummary` ported pure into Dart `core/ledger.dart`
   (voided bills excluded, cheque/points parts unbucketed, credit
   parts bucketed, counter sales counted, supplierPaidCash filtered) —
   the feature saves from the port with the web view's glue; expected
   cash stays journal-derived on both clients. Proven by the new
   `fixtures/h6-core.json` (md5 `15e61282…`) + `h6_fixtures_test.dart`.
   The h2 exporter's FY-close case is stamped BEFORE capture (the
   wall-clock id `j-mvks8hhtl` is gone by construction; re-baseline =
   exactly one field, md5 `9575fba9…` → `9fd58f6d…`) and g6 is
   **re-baselined deliberately** to the current assemble shape (85
   additions, zero value changes, md5 `2d09a70a…` → `22194673…`);
   both exporters pin seed timestamps to the 2026-10-23 fixture epoch
   so re-export is byte-stable on any day. The CI freshness gate now
   runs **all eleven exporters** (f1–f5, g5, g6, h2, h4, h5, h6),
   membership recorded in the workflow comment + the audit.

Packaging:
- `~/workspace/dukaan-ai-ERP-H.zip` — the fresh static build,
  2,096,961 bytes (286 entries / 245 files), SHA-256
  `963b248720fe9ea849afc0bd0ea96181f6ceee9343246a3016e26e768043b87a`,
  index.html at root, markers verified in the shipped bytes (incl.
  the new checkout consent copy). **Supersedes dukaan-ai-ERP-G.zip.**
- `~/workspace/your_files/dukaan-ai-FULL-source-for-github.zip`
  refreshed (475 files incl. the whole H layer + this audit + the
  four fixes; `.env*` still excluded) with a regenerated
  `dukaan-ai-FULL-source-MANIFEST.txt` — the manifest is the
  package's own record (file count, byte size, SHA-256, spot
  checks incl. the review packs + review-manifest.json).
  **GitHub pushes remain PARKED by the owner's order — packaged
  only, nothing pushed. No live deployment, no CI run, and no
  reviewed translation is claimed.**

Phase H is now COMPLETE (H1–H5 + PS/FA + H6 close-out). Remaining
owner-side items are the rollout runbook in PHASE-H-RELEASE-AUDIT.md
§F (rules v10 FINAL + indexes FIRST — incl. the storeOrders
composite → ERP-H upload → platformAdmins bootstrap if not done →
observe counters → per-business enforce flips), PS/FA reviewer
recruitment (packs ready, money-first), the Raast bank-QR
screenshot (standing), plan-price + loyalty-default confirmations,
and the one parked git push → CI → app-release → F §7.5 device
acceptance chain.

---

## FINAL Production-Readiness Audit (2026-10-23) — the A→H programme's last step

Full record: `PRODUCTION-READINESS-AUDIT.md`. Method: fresh full
verification from a clean recompile + 40 new adversarial probes
(throwaway, against the compiled libs — the harness did not grow)
+ source-level caller verification. **No probe found a system
defect; no fix was needed and none was made.**

Fresh verification (all observed this session): web harness
**1,754/1,754, runner exit 0** (libs recompiled by the audit) ·
web tsc exit 0 · `npm run build` exit 0 · `npm run build:static`
exit 0 · Flutter analyze **"No issues found"** · Flutter test
**479/479** · rules v10 FINAL **1,489 lines, SHA `f10b2ee0…`**,
with the standalone strip chain reproducing every pinned hash
(stripH6 ≡ `e556c92e…` · stripWa∘H6 ≡ `4a410729…` · stripH3∘Wa∘H6
≡ v9 `734f6ba4…` · stripG1∘stripG2 ≡ v8 `04807268…`) · all 11
fixture md5s identical to the Phase H table · dictionaries
independently counted **3,058 × 4 locales** · review manifest
3,058 states/language, **0 reviewed** · frozen seed intact (21 ·
272,805 · 50,000 · TB 0 · `e17e5bda…1168`) · makeEntry 24 store +
3 loyalty (web), 42 (Dart) · 43 modules · 38 collections · 30 COA.

Adversarial probes (40/40 PASS after correction): unbalanced /
one-sided / negative-line compositions refused at the choke point;
zero-value composers null-guard; renewal confirm, storefront
conversion, FY close and restore are each exactly-once; counter
transitions accept only the legal arithmetic (trial pool never
rolls, cap binds at the snapshot limit, held bills count nothing,
voided bills keep their count); loyalty redemption clamps to
balance + cap, clawback cannot underflow, expiry is exactly-once
by derivation; plan gates consume the snapshot (a simulated
catalogue edit never re-limits an existing assignment) and refuse
posting in readonly only under `enforce`; backup assembly filters
foreign platform docs at the seam; the storefront slug cannot be
hijacked (rules bind the existing doc + payload to the caller);
inbox flooding composes nothing worse than dismissible paper;
consent cannot be laundered (import strips all three fields, the
order shape admits `waOptIn` only as exactly `true`, every stamp
site names a customer act — counter / storefront); restore refuses
non-empty targets, injected platform history never lands, the
tamper ladder refuses in order. **Disclosure:** three probes
initially FAILed — two were bugs in the probes themselves (the
d6 vintage wrapper, the g4 scan scope) and one was a fuzz-design
correction (a8 now attacks the absorb guards) — all root-caused
in the audit (§2.9) and re-proven PASS. Two lib-level trust edges
were observed and registered, not hidden: **R-30** the clawback
composer trusts the bill object's `customerId` (sole caller
passes the stored bill doc; the fold attributes strictly by line
ref, so a mismatch would be a *visible* negative position, never
a silent cross-credit — defence-in-depth assertion recommended,
not applied) and **R-31** journal builders are dumb by design,
fed only through guard planners (caller-verified at every site).

Residuals: every standing partial from the C/D/E/F/G/H audits is
collected in the audit's §3 and classified — 10 OWNER-GATED
(R-01 Raast screenshot · R-02 plan prices · R-03 loyalty defaults
· R-04 PS/FA reviewers · R-05 platformAdmins bootstrap · R-06
enforce flips · R-07 §7.5 acceptance · R-08 release keystore ·
R-09 the one git push · R-10 WA 90-day interval), 4 DEPLOY-TIME
(R-11 rules+indexes first · R-12 server build/host rewrite for
real storefront slugs · R-13 platformConfig first save · R-14
rules never yet run against a live Firestore — the rollout's
staging is the safe first check), 18 ACCEPTED-LIMITATION
(R-15…R-32, incl. the two new ones above). Nothing unclassified.

**Verdicts.** (i) Deploying the web ERP + SaaS layer to the
owner's live account: **CONDITIONAL GO** — the conditions are the
rollout sequence itself (rules + indexes → ERP-H upload →
bootstrap → observe counters → per-business enforce flips); the
owner's shop migrates onto the founding comp, so no plan limit
can touch his trading while he observes. (ii) Selling to external
shops: **NO-GO today** — four owner-side blockers, none a code
defect: prices are placeholders (R-02); PS/FA are unreviewed
drafts and must not be marketed as finished (R-04); no signed app
or device acceptance exists yet (R-07/R-08/R-32); the SaaS lock
has never been observed live (R-06/R-14). Clearing them makes
external selling a CONDITIONAL GO with §3 as the honest spec
sheet. **No live deployment, CI run, push, or device verification
is claimed.**

## Post-H fix — Footer restructure: categorized columns (owner direction) — 2026-10-23

The footer (web/components/Footer.tsx, rendered once via AppShell)
showed all 29 app links as ONE flat column under a single "App"
heading — a page-long list between the brand block and the credits
block. Per the owner's direction it now follows the standard
professional pattern: **brand column + five categorized link
columns (6 columns total on desktop)**, bottom bar unchanged.

**Category map** (every NAV_LINKS entry in exactly one column;
hrefs/labels still sourced from lib/nav — none lost, none invented;
shipped static HTML verified: 5 nav columns, 29 app links + the
CodeHubb external link):
- **Sales & Orders** — Dashboard, Sales, Billing, Quotations,
  Sale Orders, Delivery Challans (6)
- **Stock & Operations** — Purchase Orders, Inventory, Warehouses,
  Stock Transfers, Manufacturing, Jobs, Forecast (7)
- **Customers & Growth** — Customers, Suppliers, Staff, Loyalty,
  Online Store, WhatsApp Marketing (6)
- **Finance & Reports** — Credit · Udhaar, Expenses, Finance,
  Loans, Reports, Notes, Cheques, Day Close (8)
- **Company & System** — AI Assistant, Settings, plus the
  pre-existing CodeHubb link and the tech line (2 + about items)

**CSS (web/app/globals.css, footer rules only):** desktop grid
`1.6fr repeat(5, 1fr)`; ≤1023px wraps to 3 columns with the brand
spanning the full row; ≤640px to 2 columns. RTL inherits the grid
flow; both themes untouched elsewhere; no other layout changes.

**i18n:** five new heading keys — shell.footerColSales /
footerColStock / footerColGrowth / footerColFinance /
footerColCompany — in all four locales: EN + UR written, PS/FA as
labelled machine drafts joining the 0%-reviewed pool. Dictionary
3,058 → **3,063** keys; the review manifest was regenerated
state-preserving (3,058 states kept, 5 gained as draft per
language; 0 reviewed), review packs regenerated at 3,063 rows,
and the Dart dictionary regenerated via tools/gen_l10n.mjs (drift
gate clean). Pin amendments are lineage-labelled in harness.js
("footer-fix pin amendment: +5 shell.footerCol* …") and in
flutter-app/test/psfa_test.dart (3,058 → 3,063; no checks added or
removed — harness total unchanged).

**Verification (final tree):** web harness **1,754/1,754, runner
exit 0, ALL SUITES GREEN** · web `tsc --noEmit` clean · `npm run
build` exit 0 · `npm run build:static` exit 0 · flutter analyze
0 issues · flutter test **479/479** · four-locale parity gates
clean (3,063 × 4, key sets exactly equal; manifest --check clean).

**Package:** `dukaan-ai-ERP-H-footerfix.zip` (~/workspace) — fresh
static build, 286 entries, index.html at root, 2,099,143 bytes,
SHA-256 e596643fa6d022201d5f969f559de0aa462ab75a7faeec8c4454da80e829de15.
The ERP-H zip is NOT overwritten; the owner uploads the footerfix
zip as the frontend. **No live deployment is claimed.**

## Fix Round 1 — the five live-test findings (2026-10-24)

Owner-requested round against the live test of 2026-10-24
(report: ~/workspace/your_files/dukaan-ai-live-test-report-2026-10-24.md).
**NO RULES CHANGE in this round** — firestore.rules is
byte-identical to v10 FINAL (SHA f10b2ee0…); every fix is code.
No live deployment or live retest is claimed: the owner uploads
the package, then a live retest follows.

### F1 — Loyalty toggle does not persist (REAL defect) — FIXED

**Root cause (read side, not the write).** The Settings save
merges `loyalty` onto the owner doc via `updateSettings` →
`setDoc(users/{uid}, …, {merge:true})`; the users-doc rule is a
plain owner write (no field whitelist) and the write DOES land
in Firestore. The loss was in the cloud snapshot handler in
StoreProvider, which rebuilt settings field-by-field through a
hand-maintained whitelist that omitted `loyalty` — and also
`raastIban`, `raastFiName`, `storefront`, `storefrontSlug` and
`whatsapp`. The next snapshot therefore rebuilt settings
without the block; `resolveLoyaltySettings` read the absence
as programme-OFF forever (toggle reverted on navigation, desk
read off, a Rs 300 bill earned 0). The demo/local path spreads
stored settings whole, and the harness exercised the resolvers
rather than this parse — which is why 1,754 checks stayed
green over a live defect. The tenancy layer and the optimistic
"Saved" toast were both innocent; the toast is honest about
the write, the read was lying. **Consequence for the owner:**
the loyalty settings he saved during the live test are still
sitting in his Firestore doc — once this build is uploaded,
the toggle will read ON with his saved values.
**Fix:** the parse is now a pure lib function —
`web/lib/settings.ts` `settingsFromOwnerDoc` (+ `parseStaff`,
moved with it) — carrying EVERY `ShopSettings` field; the
store's snapshot handler calls it. Dart needed nothing: its
`ShopSettingsView.fromMap` already reads the raw owner doc
whole.
**Regression (FR1 suite):** a legacy Phase-C-shaped owner doc
with a saved loyalty block parses through and the resolver
reads ON with the owner's terms; all five dropped families
asserted carried; absent blocks still resolve to defaults; a
source scan pins the store to the lib parse (the inline
whitelist is gone).

### F4 — Receivables aging ignored credit-note returns — FIXED

**Root cause.** `receivablesAging` ran a naive per-row FIFO:
repayments were applied to positive credit rows only; a return
reversal row (kind "credit", amount −creditReduction, written
by the return flow with its billId stamped) computed
`applied = min(repaid, max(amount,0)) = 0` and its negative
remainder was skipped — a complete no-op. Finance was right
(the signed subledger sum) and aging overstated by exactly
the CN: live 5,700 vs 5,550. The correct model already existed
in `billCreditOutstanding` (per-bill lots).
**Fix:** the lot allocation is extracted as
`creditLotsRemaining(rows)` in lib/ledger (reversals net their
own lot; the lot's age is the max dayOffset among its rows, so
a today-stamped reversal never makes its bill younger;
repayments retire oldest lots first); `receivablesAging` is
rebuilt on it, and the WhatsApp `customerUdhaarPosition` —
which carried its own copy of the same defect — is rebuilt on
it too, so the three derivations can never drift apart again.
Aging total ≡ Σ positive `customerOutstanding` by construction.
**Mirror check:** `payablesAging` already nets purchase
returns per purchase (Phase B4's design) — regression-pinned
(purchase 1,000 → DN 300 → paid 200 = 500 in the >60d bucket,
agreeing with `supplierBalance`), no change made.
**Regression (FR1 suite + fr1-core.json fixture):** the exact
live scenario (5,500 base + bill 300 → repaid 100 → CN −150 ⇒
5,550, reduced amount in the bill's own bucket), a multi-bill
multi-customer case, per-bill outstanding agreement, udhaar
positions, the payables mirror; Dart mirrors in
core/ledger.dart + core/whatsapp.dart proven by
flutter-app/test/fr1_fixtures_test.dart.

### F3 — Day Close scope + counter gap — FIXED

**Root cause (two construction defects + one view defect).**
(1) A row's `dayOffset` is a creation-day stamp: every action
writes 0 and nothing in cloud mode ever recomputes it, so
every `dayOffset === 0` consumer (day-close summary,
`accountDayNet`, aging ages, dashboard "today") silently
widens with time — on 24-Oct the 22-Oct rows still counted as
"today", reproducing the live scope failure exactly. (2)
DayCloseView's no-prior-close default opening was the FULL
journal till balance while `summary.expectedCash` adds today's
movements on top — today counted twice in the form's figures
(the recorded close already used the correct
`journalClose.opening`). (3) `todayClose` matched
`dayOffset === 0`, so an earlier day's close (stamp frozen at
0) posed as today's forever; and `save` stamped `dateISO` from
the UTC date slice — yesterday for the first five hours of
every PKT day. On the specific Rs 7,625: it is the difference
between the documents-based counter figure and the
journal-derived till figure on data whose exact decomposition
cannot be proven without the live dataset; the construction
defects above are proven in code, and after the fix the two
figures scope identically, so any residual difference is a
data fact (e.g. a pre-journal-era movement), no longer a
scope artifact.
**Fix:** (a) `dayOffsetForTs(ts, today)` in lib/periods (whole
PKT business days between the row's business date and today,
floor 0, unparseable ts keeps the stored stamp); the effective
offset is re-based at the single load choke point on both
platforms (web: the cloud snapshot mapper + the local load;
Dart: the store's `sub` doc mapper) — seed data is a no-op
(its ts/stamps already agree) and no consumer changed. (b)
DayCloseView: default opening = `journalClose.opening`
(balance − today's net) when no prior close exists; closes
matched by `dateISO === todayPktISO()`; the saved close
stamps the PKT business date. (c) Backlog honesty: un-closed
earlier days that moved the till (after the last close's
dateISO) render as their own labelled line — new key
`dc.backlog` ×4 locales — stating their cash already sits
inside today's opening; the close records today's
journal-derived figures as today. The Dart day-close screen
already matched by dateISO and used the journal opening; it
gained the same backlog line.
**Regression:** dayOffsetForTs pairs (incl. the PKT-midnight
edge + fallback); a two-day walk in the live shape (all stamps
0) whose journal "today" net reads 1,300 pre-rebase and
exactly 300 after; counter ≡ journal by construction
(opening 1,000 + 500 − 200 = 1,300 = the journal expectation;
un-rebased documents overstate at 2,300); the dateISO close
identity; source scans for both load paths and the view.

### F2 — Balance Sheet report — ADDED (web + Dart)

The figures existed (`balanceSheetBalances`, behind the
FY-close panel) but no user-facing statement did. **New:**
`balanceSheetReport(journal, range)` in lib/fiscal, a
first-class Reports catalogue entry (`balancesheet`, after
Trial Balance) with screen + print + share in the house
patterns, and the Dart mirror in core/fiscal.dart +
features/reports.dart (Dart previously exposed the balances
only inside its FY panel — same gap, now closed the same way).
**Presentation choice (stated):** point-in-time, "As at {range
end}" — cumulative balances over all entries with ts <
range.toTs (the range start plays no part). Sections Assets /
Liabilities / Equity; equity rows are contributions (drawings
negative); a distinct line **"Result to date (unclosed)"** =
the net of all P&L accounts at the same instant INCLUDING
fy_close entries — after a close it reads only the new
unclosed result while closed years sit in retained earnings.
The `purchases` clearing account, when non-zero, appears as
its own line inside Assets, so the identity
**Assets + Clearing = Liabilities + Equity + Result** — the
trial balance's zero restated by section — holds to the
paisa; `balanced` + `difference` are exposed like the TB's.
**i18n:** 9 new `rep.bs.*` keys ×4 locales (EN/UR written;
PS/FA drafts via the manifest discipline).
**Proof (FR1 + fr1 fixture):** balances on the frozen seed
(rows tie to `balanceSheetBalances`; inventory 272,805, cash
50,000), on a trading walk (assets 133,000 = payables 30,000
+ equity 98,000 + result 5,000), mid-clearing (clearing line
8,000; 141,000 = 141,000), and across an FY close (result
line → 0, retained earnings 5,000, total unmoved).

### F5 — Opening stock: owner path + guide — DELIVERED

**Finding:** the app has NO general manual journal voucher
(by design) and no other clean path existed — the Cash Book
posts capital/drawings only, and stock adjustments credit
loss/gain accounts (using them would corrupt the P&L). The
minimal fix is one composed, single-purpose entry.
**Fix:** new refType `opening_stock`; lib/fiscal gains
`openingStockGap(journal, products)` (today's shelf at cost −
today's GL inventory + inventory_raw, floored at 0, with the
raw-class share clamped inside the gap) and
`buildOpeningStockEntry(amount, rawShare)` — **Dr `inventory`
(class-split via the C3 `classLegLines` seam) / Cr `capital`**,
memo "Opening stock — one-time recognition". Store action
`postOpeningStock` is owner-gated on the `fiscalClose` matrix
row and passes the same posting guard as the close. The UI
surface is the FiscalClosePanel stock row — the exact place
the owner sees the book-vs-shelf divergence — offering the
live gap behind a confirm step + the fiscal PIN gate, with 4
new `fin.fy.openStock.*` keys ×4 locales. Tally maps the
refType to a Journal voucher. **No rules amendment:**
`opening_stock` is unlisted in both tier maps (client
`REFTYPE_MIN_TIER` and the rules mirror), so it rides the
Core default like the legacy refTypes — asserted in the FR1
suite against the rules text itself. Dart: the pure gap +
composer are mirrored and fixture-proven; the Dart UI button
is NOT wired (the web panel is the owner's path; the guide
points there) — declared, not hidden.
**Guide:** ~/workspace/your_files/dukaan-opening-stock-guide-ur.md
(Urdu): exact steps, the accounts, the amount formula — shelf
value (Stock report total at cost) − GL inventory balance
(Trial Balance inventory line), both read the same day; do
NOT copy a single figure from the live-test report (its
snapshots differ: FY-checklist shelf 278,425/book 0 vs the
later TB stock Cr −311,049) — and the append-only warning:
never edit/delete the entry; a wrong amount is corrected by
a reversing entry.
**No live data was touched.**

### Close-out numbers (final tree)

- Web harness **1,783/1,783, exit 0, ALL SUITES GREEN**
  (1,754 inherited + 29 FR1 regression checks; pins amended
  lineage-labelled: dictionary 3,063 → **3,077** at every pin
  site — +14 keys: 1 dc.backlog + 9 rep.bs.* + 4
  fin.fy.openStock.*; D4 fin.fy count 55 → 59; D4 fiscalClose
  gate count 2 → 3 for postOpeningStock).
- Web `tsc --noEmit` clean · `npm run build` exit 0 ·
  `npm run build:static` exit 0 (bundle greps positive for
  opening_stock / rep.bs.title / dc.backlog).
- Flutter analyze **0 issues** · flutter test **491/491**
  (479 inherited + 12 FR1 fixture tests; psfa pins 3,063 →
  3,077 amended, no checks added or removed there).
- Four-locale gates: dictionaries **3,077 × 4** exact key-set
  parity; review manifest regenerated state-preserving
  (3,063 states kept, 14 gained as draft per language, 0
  reviewed — nothing un-reviewed is claimed); review packs
  regenerated at 3,077 rows; gen_l10n --check clean; manifest
  --check clean.
- Fixtures: all pre-existing fixtures byte-identical to their
  pre-round bytes (f4/h2/h4/h5 exporter re-runs show ONLY
  pre-existing drift — Phase H's expense_loyalty in f4's
  plCodes and date-roll dayOffsets/ts — none of it accepted;
  committed bytes restored). NEW: fixtures/fr1-core.json +
  fixtures-export-fr1.js (deterministic by construction —
  fixed timestamps, the load-derived dayOffset excluded from
  normalized entries; MD5 faefb519…), added to the CI
  freshness gate with a membership note.
- Frozen seed identities intact (21 entries, Inventory
  272,805, Cash 50,000, TB 0 — re-asserted by the PSFA suite
  on this tree).
- Rules: **unchanged** — v10 FINAL, SHA f10b2ee0….

**Package (Fix Round 1):** `dukaan-ai-ERP-H-fixround1.zip`
(~/workspace) — fresh static build, 286 entries, index.html at
root, 2,103,407 bytes, SHA-256
fe30a8d5b93cc91453b652684e101b7c92c9a60e5954ba5e55dae61f8f3def81.
The ERP-H and footerfix zips are NOT overwritten; the owner
uploads the fixround1 zip as the frontend. **No live
deployment is claimed.**

## Fix Round 2 (FR2) — owner's 2026-10-24 redefinition (replaces the 'Start fresh' proposal)

Three items, all in source, all proven by harness + Flutter golden
fixtures. **No live verification claimed** — live retest after the
owner uploads (demo opt-in on a fresh account, clear → trash →
restore in the throwaway account, multi-business creation) is the
parent agent's next step.

### Item 1 — Demo data opt-in (replaces auto-seeding)
- New accounts/businesses start EMPTY. `seedNamespace` is gone from
  the brand-new-owner path; `createEmptyNamespace` writes the
  skeleton only (owner doc + 5 money accounts + wh-main warehouse).
- "Add demo data" (Dashboard footer + Settings danger zone,
  owner-only, PIN-challenged with the action's own label key) via the
  shared `DemoDataModal`: pre-list from pure `demoSummary()` — 25
  products, 3 customers, 2 suppliers, 347 sales rows, 29 journal
  entries, stock 272,805 cost / 303,250 retail (the live demo
  seed's own figures) — and the post-seed summary confirmed from
  the writes actually committed (`summarizeSeedWrites`).
- "Re-add demo data" (the honest reset): demo-only businesses only;
  wipes demo docs first, then re-seeds. Refused on empty ("empty")
  and on real/mixed books ("real"/"mixed" with distinct messages).
  Demo seed never mixes into real books. The old production
  Dashboard reset button (a silent cloud no-op — the confusion the
  owner hit) is gone; demo mode keeps its legacy showroom reset.
- `resetDemo` and PinGate untouched (demo-mode-only; PIN erase
  clears the PIN, not data — existing intended behaviour).

### Item 2 — Clear data → trash, 30-day restore
- Settings danger zone (production, owner-only): PIN challenge +
  type-CLEAR confirm. Snapshots the ENTIRE business (G6 backup
  format, so verify/restore consume it unchanged) into
  `businessTrash/{businessId}/snapshots/{trashId}` + `chunks/{index}`,
  then wipes tenant data.
- Chunking: 400,000 chars/chunk (well under 1 MiB/doc); manifest
  carries businessId, clearedAt, expiresAt = clearedAt + 30 days,
  counts, totalDocs, journalCount, journal fingerprint, chunkCount,
  jsonLength, replacedTrashId — counts/fingerprint copied verbatim
  from the backup manifest, never recomputed. Reassembly refuses
  gaps, duplicate indexes, truncated tails (manifest chunkCount is
  the tail check).
- Restore-from-trash (BackupPanel trash panel) uses the existing
  pipeline INCLUDING the empty-business guard — never a merge; on
  success the snapshot is consumed (status restored, chunks
  dropped). Expiry is read-time (never a cron); expired snapshots
  are swept lazily on trash-panel load; "Delete permanently" by
  hand. Re-clear while an active snapshot exists stops at an
  explicit replace warning.
- Clear keeps: owner doc (modified), 5 money accounts, default
  warehouse; registry/counters/memberships/events NOT wiped
  (counters kept so clearing cannot evade invoice limits).
  Storefront snapshot + inbox NOT touched (panel notes the
  published storefront stays live until unpublished). The rules
  clear window (`clearing` flag) is set before the wipe and cleared
  in a `finally`, so a half-failed wipe never strands it open.
- Trash restore/delete follow the file-restore card's gating
  (owner-only, no PIN challenge — the PIN-gated act is the Clear).

### Item 3 — Multi-business creation + switcher (changes the Phase G tenancy model)
- "New business" (header switcher menu, NOT sidebar): name + phone +
  address → generated id; phase 1 = trial-plan registry (ownerUid =
  creator uid) + `business.created` event; phase 2 = zeroed counters
  for the birth month + creator index entry (role owner, NO members
  doc). Index persisted BEFORE the skeleton, so a skeleton failure
  still lists the business and the switcher offers a retry row.
  Creation is not PIN-gated (declared: it destroys nothing).
- New businesses start EMPTY and on Free Trial rules; founding comp
  applies ONLY to pre-G businesses (rules pin founding to
  businessId == ownerUid).
- Switcher (top header): uid-shaped own business first, then other
  owned in name order, then members in name order. Active business
  persisted server-side (`userMemberships/{uid}.activeBusinessId`)
  first, then device-local, then claim/legacy, then list[0].
- Migration: NO data moves, NO re-keying. Existing users default to
  their existing membership; exactly one membership → it is active.
  The owner's live business keeps working untouched as business #1.
  Index self-heal gained the owner-owned carve-out (registry names
  caller as ownerUid → kept with role owner, no membership doc).
- Platform console bug fixed: it dropped the registry doc id and
  keyed everything by ownerUid (correct ONLY for legacy businesses).
  Now keyed by registry doc id (`consoleBusinessId`, ownerUid
  fallback for legacy fixtures) in directory, aggregates, payment
  guard, selection, detail acts, payment matching. /platform keeps
  its rule: NO leg into any tenant namespace — trash included.

### Rules v10 → v11 (RE-PASTE REQUIRED — unlike FR1)
- v11: 1,670 lines (JS split count), SHA-256
  0f19f56e5da1d36840767468da71550105be65786a0939566115b19be4b40e70.
- Strip-proof: stripping FR2 spans returns v10 FINAL byte-for-byte
  (SHA f10b2ee07ceb0c5a583f3762fa021222fb1a9a90832bf566956ae157372220ba).
- Added: `isRegistryOwner` / `isBusinessOwner` / `isClearWindow`
  helpers; canAccess + staffRole widened to isBusinessOwner;
  businessBirthOk (generated = trial only); users/{uid} registry-owner
  write leg; clear-window delete legs (sales, journal, waCampaigns,
  waSends, posted bills); businesses registry-owner read/create/
  update; members + invites registry-owner legs; counters/stats/
  events registry-owner legs; storefront legs widened to
  isBusinessOwner; `businessTrash` block (owner-only); 12
  owner-leg widenings in the tenant region (returns/dayCloses/notes/
  purchaseReturns update+delete; cheques/warehouses/stockLevels/
  payrollRuns/loans delete; branding create/update/delete; taxSlabs
  + periods write). Accounts NOT widened (no delete leg; clear keeps
  accounts); staffIndex unchanged (legacy-only).

### Counts (all green)
- TS harness: **1,834 / 1,834, exit 0** (FR2 suite 51/51: 40 logic +
  11 client-wiring source checks; FR1 29 unchanged).
- Flutter: **506 / 506** (new `test/fr2_fixtures_test.dart` 15/15;
  was 491). `flutter analyze` 0 issues. Web `tsc --noEmit` 0 errors.
  Harness tsc 0. `npm run build` + `npm run build:static` exit 0.
- Dictionaries: **3,136 keys × 4 locales** (EN ≡ UR ≡ PS ≡ FA, 43
  modules, l10n drift gate clean). FR2 growth exactly 59 keys (20
  demo + 26 trash + 13 business); PS/FA machine drafts, 0 reviewed.
- Fixtures: `harness/fixtures/fr2-core.json` (MD5
  79c4f4696044cf25aa4babea7d94f178, byte-stable across re-runs) in
  the CI freshness gate.
- Dart deliverable is pure-logic parity + fixtures (trash-panel UI,
  creation dialog, demo buttons are web-only for FR2, as allowed).
- Known pre-existing caveat (NOT FR2, NOT re-baselined): re-running
  all CI freshness exporters drifts f4/h2/h4/h5-core.json by
  calendar day (dayOffset drift + f4's pre-H1 COA staleness in the
  exporter path); fr2-core.json itself re-exports byte-identical.

**Package (Fix Round 2):** `dukaan-ai-ERP-H-fixround2.zip`
(~/workspace/your_files) — fresh static build + v11 rules file +
FR2-RELEASE-NOTES.md at zip root, 247 entries, 2,127,721 bytes,
SHA-256 36bf99c7a7c1e4b5b4d335c9bf0f1200e619dc6cc31fc1dccf935a870e493121.
Earlier zips NOT overwritten; the owner uploads the fixround2 zip as
the frontend AND re-pastes the v11 rules. **No live deployment is
claimed.**
