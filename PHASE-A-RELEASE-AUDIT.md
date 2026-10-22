# Dukaan AI — Phase A Release Audit (independent spot-audit)

Date: 2026-10-22 · Scope: the NEW Phase A surface (A2 money accounts &
transfers, A3 RBAC, A4 tax engine, A5 period locking, rules v3),
audited FINANCE-AUDIT style: source read + grep matrices + an
independent harness re-run compiled FRESH from the current sources
(`/tmp/hb/tsconfig-fresh.json` → new output dir, so no stale build
could masquerade as current code).

**Harness (fresh compile of `lib/ledger|seed|coa|permissions|tax|periods`):
282 passed, 0 failed, 282 total** — the full FIN + A2 + COA + RBAC +
A4 + A5 suites, including the pre-A4 seed-journal SHA-256 baseline
(`8c033e3a…b98f5a`, 21 entries) still intact.

## (a) Transfers can never unbalance or create money — SOUND

- `transferFunds` (StoreProvider.tsx:2229) composes exactly ONE
  `makeEntry("transfer", …)` with two lines: Dr destination GL bucket
  `ref: to.id` / Cr source GL bucket `ref: from.id`, equal amounts.
  `makeEntry` (lib/ledger.ts) runs the F-1 balance guard and THROWS
  on any imbalance before a write can exist.
- Refusals in code: same-account, either account archived, amount
  ≤ 0. The entry and its `cashEntries` row commit in ONE batch,
  the entry via the guarded `postEntry` choke point (see (c)).
- Per-account balances are DERIVED from these same ref'd journal
  lines (the A2 invariant Σ per-account == GL bucket total is
  harness-proved), so a transfer moves exactly `amount` from source
  to destination — within a bucket it is GL-neutral, across buckets
  it moves the bucket totals by the same single amount. There is no
  second entry, no tolerance line, and no path that posts only one
  side. Harness A2 suite covers transfer semantics incl.
  wallet→wallet, green.

## (b) Tax postings vs revenue/COGS and the Finance tax card — SOUND

- Every tax line in every posting template is a CONDITIONAL spread
  (`billTax > 0 ? […] : []` — bill :1170, counter sale :1035,
  returns :1501, purchase :1746); at tax 0 the entries collapse to
  the pre-A4 line sets exactly (harness: normalized seed-journal
  SHA-256 unchanged).
- Sales: EXCLUSIVE tax credits `tax_payable` only — the revenue
  credit is the pre-tax subtotal, untouched. INCLUSIVE tax is
  extracted and the revenue credit is `subtotal − inclusiveTax` —
  the extracted part was never revenue, so this REMOVES tax from
  revenue rather than adding to it; the full tax still credits
  `tax_payable`. COGS lines (`priced.costTotal`, per-sale cost
  snapshots) never carry a tax component in any template.
- Purchases: Dr `tax_input` (recoverable), stock enters at NET,
  payables owed at GROSS (harness worked example Σ 86,800 to the
  rupee; taxed sale Σ 5,492). Returns reverse output tax per line
  with the F-3 cumulative discipline (harness: item-by-item reversal
  exact to the paisa, incl. odd-paisa 3 × 56.61 = 169.83).
- P&L (`profitAndLoss` / `profitAndLossInRange` in lib/ledger.ts)
  reads sales_revenue / sales_discount / cogs / expense_* only —
  the tax accounts never enter it, by account selection.
- Reconciliation: the Finance tax card (FinanceView.tsx:251) and
  the store's tax-payment cap (StoreProvider.tsx:2458) BOTH call
  the same `taxPosition(journal)` (lib/tax.ts:337), which derives
  output = normal balance of `tax_payable`, input = normal balance
  of `tax_input`, month movements summed from the same journal
  lines. Card, payment cap and postings therefore read one
  derivation over one data set — they cannot diverge.

## (c) Period guard covers every posting action — SOUND (2 documented exemptions)

- Cloud: EVERY journal write funnels through `postEntry`
  (StoreProvider.tsx:820), which applies `preparePosting`
  (lib/periods.ts:161) — stamps `dateISO` from `ts` and calls
  `assertPeriodOpen`, which THROWS `PeriodLockedError` when
  `entry.ts <= lockedThrough` — before `batchJournal` writes. The
  only raw `batch.set(doc(… "journal" …))` in the codebase is
  inside `batchJournal` (line 403), called solely from `postEntry`
  (19 call sites). Grep confirms NO other component/app file
  references the journal collection at all.
- Demo/local: `guardPostings(...)` is invoked at composition time
  in all 17 posting actions — product create (opening stock),
  product update (adjustment + revaluation), counter sale, bill
  posting, the returns/void engine (`reverseBillItems`; `voidBill`
  delegates to it), purchase, supplier payment, credit give,
  credit repayment, standalone cash loan, expense edit
  (reversal + repost), expense delete, cash entry, transfer,
  tax payment, stock adjustment, day-close opening seed — before
  any state write, so a refusal is atomic in both modes.
- Corrections never backdate: expense edits compute their repost
  instant via `correctionDating` (lib/periods.ts) — if the original
  or the target date is locked, the repost lands at TODAY; the
  guard then passes it, and harness A5 checks prove the locked
  entries stay byte-untouched while the correction nets exactly.
- Exemption 1 — first-time seeding (`seedNamespace` bulk push):
  writes the seed journal directly. It runs ONLY when the owner
  doc does not exist; `lockedThrough` lives on that doc, so no
  lock can exist to violate. The rules backstop concurs (its
  `exists()` guard returns '' during seeding). SOUND by
  construction.
- Exemption 2 — F-14 top-up (`topUpNamespace`): writes its single
  opening-balance entry directly. It runs only for pre-Complete
  accounts (`seedV2 !== true`), in the same sign-in pass BEFORE
  `periodsV1` could ever set a lock, and the entry is composed at
  the current instant. A lock cannot pre-exist on such an account
  (locking requires the Phase A client, which sets `seedV2` via
  this very path first). SOUND by construction; both exemptions
  are one-time data-birth paths, not posting actions.

## (d) RBAC store guards — SOUND

Every mutating store function checks `can(roleRef.current, module,
"write")` (lib/permissions.ts matrix) before acting — verified by
grep over StoreProvider.tsx, including each item demanded:

- **void**: `billingVoid` (:1635) — owner/manager only.
- **deletes**: product `inventoryManage` (:976), supplier
  `suppliersManage` (:1650–1685), expense `expenses` (:2034);
  account archive is an `accountsManage` update (accounts are
  never deleted, by design + rules).
- **reset**: `resetDemo` refuses outright in cloud mode (F-10)
  and additionally requires role == owner even in demo.
- **staff**: `staffManage` on add (:2689), role change (:2730),
  remove (:2756); the three writes (owner-doc `staff[]`,
  `staffEmails` mirror, `staffIndex/{email}` with role) commit in
  ONE batch, so revocation stays instant and consistent.
  `updateSettings` strips `staff`/`staffEmails` from generic
  patches (:2664) — roles cannot change outside the staff flows.
- **tax**: slab create/update/delete + default changes all behind
  `taxSlabs` write (:2341/:2368/:2408/:2429); tax payment behind
  `finance` write (:2456).
- **accounts**: create/rename/archive/default-repoint behind
  `accountsManage` (:2152/:2181/:2191/:2206); **transfers** behind
  `transfers` (:2235); **periods** close/reopen behind `periods`
  (:2512/:2558). Rules v3 independently enforce the same rows
  server-side (owner-only accounts/taxSlabs/periods writes).

## (e) Migrations write zero journal entries; idempotent — SOUND

All four steps run flag-gated, in the fixed order
accountsV1 → rbacV1 → taxV1 → periodsV1, inside one owner sign-in
effect (StoreProvider.tsx:718–738):

- `ensureAccounts`: writes ONLY the five fixed-id account docs +
  the flag. Re-run writes byte-identical docs (set with fixed ids).
- `ensureRbac`: writes owner-doc `staff[]` + merge role writes on
  EXISTING staffIndex docs only; precedence (existing staff[] role
  > valid index role > manager) makes re-runs converge.
- `ensureTax`: writes the two default fields ONLY when undefined —
  never overwrites; creates no slabs.
- `ensurePeriods`: writes FY defaults + `lockedThrough: ""` ONLY
  when undefined; creates no periods docs and locks nothing.
- None of the four references the journal collection (grep +
  read). Seed identities after migration are harness-proved
  unchanged (GL cash 50,000; Inventory 272,805; payables 27,900;
  receivables 5,500; trial balance 0; seed journal stays 21
  entries).
- One fragility NOTE (not a flaw): `ensureAccounts` writes its
  flag as a nested `phaseA` map via setDoc-merge, which would
  replace sibling flags if it ran after them. It cannot: the
  enforced order runs it first in the pass, and any pass that
  completed a later step necessarily completed this one (its flag
  is written before the function returns). Later steps use
  dot-path updates. Recorded here so a future reorder of the
  migration chain re-checks it.

## Rules v3 backward compatibility with the LIVE (pre-Phase-A) app

Verdict: **COMPATIBLE — every live write flow is allowed under v3.**
Load-bearing mechanisms: (1) `staffRole()` resolves a staffIndex
doc WITHOUT a `role` field to **"manager"** (`.get('role',
'manager')`) — exactly the legacy capability set; (2) the A5
journal backstop defaults a missing `dateISO` to `'9999-12-31'`,
so pre-A5 entries are never blocked; (3) `lockedThrough` defaults
to `''` (field absent on every live owner doc), which makes every
`createInOpenPeriod` check pass trivially; (4) the `exists()`
guard inside `lockedThrough()` keeps first-time seeding writable
while the owner doc does not yet exist.

| Live flow | v3 gate it passes |
|---|---|
| First-time seeding (owner creates owner doc + all collections) | isOwner writes everywhere; exists() guard ⇒ lock checks inert; journal creates carry no dateISO ⇒ default never blocked |
| F-14 top-up on sign-in (subledgers + ONE opening journal entry) | owner writes; journal create = canAccess + dateISO default |
| Owner billing batch (bill create, sales creates, products stockQty update via increment, journal create, credit row create) | bills/sales create include owner; products update — owner satisfies the owner/manager branch (not merely the stockQty carve-out); journal create canAccess; credits create canAccess + ts check inert |
| Counter sale (sales create + stockQty update + journal create) | as billing |
| Purchase (create + product cost/stock update + journal) | purchases create owner ∈ [owner, manager]; products full update = owner |
| Supplier payment create/edit/delete | owner ∈ [owner, manager, accountant] |
| Expense create/edit/delete (+ reversal journal creates) | owner ∈ [owner, manager, accountant]; journal creates dateless ⇒ unblocked |
| Returns (create + bill update + stock restore + journal) | returns create owner ∈ [owner, manager, cashier]; bills update same set |
| Bill void (bill update + journal create) | bills update set incl. owner; journal create canAccess |
| Stock adjustments (adjustments write + product update + journal) | adjustments write owner ∈ [owner, manager] |
| Cash entries — capital/drawings (create) | owner ∈ [owner, manager, accountant] |
| Day close (create only) | owner ∈ [owner, manager, cashier]; v3 owner-only update/delete never exercised by the live app |
| Customers / suppliers CRUD | owner satisfies every write set |
| Held-draft delete | v3 bills delete requires `status == 'held'` — the live app deletes ONLY held drafts |
| Owner settings write (owner doc, incl. staffEmails) | owner-doc write = isOwner, unchanged from v2 |
| Staff add/remove by owner (staffIndex create/delete + owner doc) | staffIndex block unchanged: create/update require `ownerUid == auth.uid`, delete requires owner |
| Staff sign-in reads (own staffIndex doc, owner doc, all collections) | staffIndex read = own email; owner doc + collections read = canAccess via unchanged `isStaffOf`; **journal read** = role ∈ [owner, manager, accountant] — legacy staff resolve to manager ⇒ allowed (the one narrowed read, deliberately backstopped by the role default) |
| Staff selling under the legacy app (bill batch as staff) | role-less staff = manager ⇒ satisfies bills/sales creates, the full products-update branch, journal create, day-close create, expense/purchase/supplier writes — nothing the legacy staffer could do is narrowed |
| Returns rows update/delete by staff | never performed by the legacy app (rows are create-only records); v3 owner-only update/delete therefore breaks nothing |
| Sales / journal update or delete | denied in v2 already; unchanged |

## Release verification (this pass)

- `npx tsc --noEmit` (fresh, `--incremental false`): **0 errors**.
- `npm run build`: exit 0 (all routes generated).
- `npm run build:static`: exit 0; web-deploy refreshed.
- Bundle: `dukan-8246` present in the shipped chunks; prerendered
  `index.html` is `lang="ur"`, `dir="rtl"`, sidebar markup with
  Urdu nav (ڈیش بورڈ); case-insensitive sweep of EVERY HTML file
  in web-deploy: **zero** "Demo"/"Fictional" strings; shipped JS
  contains the F-1 guard string ("Refusing to post unbalanced
  journal entry"), the A5 `period-locked` code and the F-14
  true-up memo.
- i18n parity re-counted from source: **EN 1,099 ≡ UR 1,099**.
- Harness fresh-compile re-run: **282/282** (see header).

No flaw was found in items (a)–(e); packaging proceeded.
Rollout order stands: **publish rules v3 FIRST, then upload the
Phase A package** (PRODUCTION.md, Phase A rollout notes).
