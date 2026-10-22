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
