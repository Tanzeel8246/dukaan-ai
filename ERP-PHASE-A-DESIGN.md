# Dukaan AI — ERP Phase A "Foundation v2" — DESIGN

**Status:** Design only — no app code changed by this document.
**Scope:** Phase A of `dukaan-erp-roadmap.md` (money accounts, tax engine, RBAC, chart of accounts v2, period/fiscal-year foundation), designed against the live Complete-edition data layer.
**Sources read:** `web/lib/types.ts`, `web/lib/ledger.ts`, `web/lib/seed.ts`, `web/components/StoreProvider.tsx` (all write paths), `firebase/firestore.rules`, `PRODUCTION.md`, `FINANCE-AUDIT.md` incl. Remediation.

## Non-negotiable invariants carried over from the Complete edition

Every design choice below is subordinate to these — they are what the finance audit verified and what Phase A must not regress:

1. **One atomic balanced journal entry per money event**, written in the same `writeBatch` as its operational records. `makeEntry` throws on imbalance (F-1 guard) — every new template in this document is constructed through it.
2. **The journal is append-only.** Corrections are reversing entries (`reversesId`), never edits. Rules deny journal/sales update+delete.
3. **No stored balance counters, anywhere.** Every balance — cash, receivables, a supplier, a tax head — is derived by summing journal lines (plus operational subledgers where the audit proved they reconcile).
4. **Inventory moves only through the ledger** (F-4 remediation): every stock/cost change posts.
5. **Migrations never fabricate history** (F-12/F-14 pattern): a migration may write at most ONE documented opening/true-up entry whose figures come from physical/subledger truth, never re-valued per-day history.
6. **Seed identities are frozen:** with no tax configured, `getSeedJournal` output must remain exactly what the 34/34 harness verified (Inventory == shelf 272,805 · Cash == 50,000 · payables 27,900 · receivables 5,500 · trial balance 0). Phase A code paths are additive-only on the no-tax path.

## Current state (what Phase A builds on)

| Area | Today |
|---|---|
| Money | Two GL buckets only: `cash`, and `wallet` = JazzCash + Easypaisa + bank combined. `accountForMethod()` maps `cash→cash`, `jazzcash/easypaisa/bank→wallet`, `credit→receivables`. `JournalLine.ref` exists and carries subledger ids for receivables (customerId) / payables (supplierId) lines. |
| Tax | None. No tax fields on products/bills, no tax GL accounts. |
| Roles | Binary: owner vs staff. Staff = email in owner doc `staffEmails[]` + `staffIndex/{email} → { ownerUid }`. Staff get full business access; owner doc/settings/staff management are owner-only in rules. `role: "owner" \| "staff"` in the client. |
| Chart of accounts | 17 codes (see §4). P&L/cash book/aging all derive from journal lines filtered by code. |
| Periods | None. Entries carry `ts` (ISO) + `dayOffset`; no business-date field. |
| Migration pattern | Owner-doc flags: `seedV2` gates `topUpNamespace` (seed new collections + ONE opening entry, live data untouched). Seeding/migration runs owner-only, on sign-in, in `StoreProvider`. |
| i18n | Typed dictionaries: 15 part files under `lib/i18n/parts/`, `ur` part typed `Record<keyof typeof en<Part>, string>` — EN/UR key parity is a compile error if broken. Account labels live at `fin.acct.<code>` (EN+UR). |

---

## 1. Money accounts model

### 1.1 Decision: GL stays coarse; the account lives in the subledger ref

Phase A does **not** add a GL code per bank/wallet account. The two existing codes `cash` and `wallet` remain the GL buckets, and the specific money account is identified by the journal line's existing `ref` field — exactly the pattern that already works for `receivables` (one GL code, per-customer `ref`) and `payables` (per-supplier `ref`), and which the audit proved reconciles to the rupee.

Justification:

- **Backward compatibility.** Live journals hold months of `cash`/`wallet` lines with `ref == null`. Splitting `wallet` into `bank`, `jazzcash`, … codes would orphan those balances across codes and break every existing selector (`cashBalance`, `walletBalance`, `cashBook`, day close) for live shops.
- **Unbounded accounts.** A shop may hold two bank accounts and three wallets. GL codes are a closed TypeScript union + rules/report surface; subledger refs scale without code changes.
- **Audit precedent.** The F-14/F-12 true-up pattern already treats "GL bucket + ref detail" as the house style.

### 1.2 The `accounts` collection

New collection `users/{uid}/accounts/{accountId}`:

```ts
interface MoneyAccount {
  id: string;
  name: string;                 // owner-chosen, e.g. "Main Till", "HBL Current"
  kind: "cash" | "wallet" | "bank";
  /** The PayMethod this account settles. Exactly one non-archived account
   *  per method is the default for that method. null = catch-all (the
   *  legacy combined account, §1.5) or a second account for the same
   *  method chosen explicitly at the desk. */
  method: PayMethod | null;     // "cash" | "jazzcash" | "easypaisa" | "bank"
  /** Set on exactly one cash-kind and one wallet-bucket account per shop:
   *  historical journal lines whose ref is null resolve to this account. */
  legacyFor: "cash" | "wallet" | null;
  archived: boolean;            // accounts are archived, never deleted (§6 risk R-3)
  sortOrder: number;
  ts: string;
}
```

GL mapping (single source of truth, replaces `accountForMethod`):

```ts
glForAccount(a: MoneyAccount): "cash" | "wallet" =
  a.kind === "cash" ? "cash" : "wallet";   // bank kind settles into the wallet GL bucket
```

### 1.3 How every existing payment method maps

| PayMethod (UI) | Default money account | Journal line |
|---|---|---|
| `cash` | the account with `method == "cash"` (default: "Main Till") | `{ account: "cash", ref: accountId }` |
| `jazzcash` | account with `method == "jazzcash"` | `{ account: "wallet", ref: accountId }` |
| `easypaisa` | account with `method == "easypaisa"` | `{ account: "wallet", ref: accountId }` |
| `bank` | account with `method == "bank"` | `{ account: "wallet", ref: accountId }` |
| `credit` | — (not money) | `{ account: "receivables", ref: customerId }` (unchanged) |

Posting-time resolution: each posting path resolves the payment to an **accountId at the moment of posting** and stamps it in two places — on the operational record (`BillPayment.accountId`, `SupplierPayment.accountId`, `Expense.accountId`, `CreditEntry.accountId` for repayments, `CashEntry.accountId`, `SaleReturn.accountId`) and as the journal line's `ref`. The journal `ref` is authoritative for all balances; the operational stamp is for display/receipts. If several non-archived accounts share a method (e.g. two bank accounts), the desk shows an account picker defaulting to the method's default account; if exactly one, it is used silently. This keeps today's 5-method UX identical for a single-account shop.

`CashEntry.method: "cash" | "wallet"` is superseded by `accountId`; legacy rows without `accountId` resolve through `legacyFor` (§1.5).

### 1.4 Balances — derived, never stored

```ts
moneyAccountBalance(entries, account): number
  = Σ over journal lines where line.account == glForAccount(account)
      AND resolvesTo(line, account) of (debit − credit)

resolvesTo(line, account) =
  line.ref === account.id
  OR (line.ref == null AND account.legacyFor === line.account /* "cash"|"wallet" */)
```

Consequences that must hold (and become harness checks, §7):

- `Σ balances of all cash-kind accounts == accountBalance(entries, "cash")`, and likewise for the wallet bucket. The legacy catch-all rule makes this an identity, not an approximation.
- `cashBook()` generalises to `accountBook(entries, account)` — same running-balance construction, filtered by `resolvesTo`.
- Day close becomes **per cash-kind account**: `DayClose` gains `accountId` (absent ⇒ the `legacyFor: "cash"` account). Expected cash for an account = opening + Σ that account's journal lines for the day. Wallet/bank accounts are not physically counted; they reconcile against statements in later phases. The existing operational-doc-based `dayCloseSummary` stays as the cross-check display for the default till during Phase A; the journal-derived figure is the one recorded.

### 1.5 Inter-account transfers

Moving money (till → bank deposit, JazzCash → bank) is a first-class posting, new `refType: "transfer"`:

```
Dr  wallet  (ref: destinationAccountId)     X
Cr  cash    (ref: sourceAccountId)          X
```

Both lines carry refs, so per-account balances move while both GL totals behave correctly (a wallet→wallet transfer posts Dr/Cr on `wallet` with different refs and nets to zero at GL level — correct). Operational record: reuse `cashEntries` with `kind: "transfer"`, `fromAccountId`, `toAccountId`, amount, note. No new collection needed.

### 1.6 Migration for existing single-cash data

Runs inside the Phase A migration (§6) — and, by design, **writes no journal entries at all**:

1. Create the default account set (identical for fresh seeds and migrated shops):
   - `Main Till` — kind cash, method "cash", `legacyFor: "cash"`.
   - `Wallet & Bank` — kind wallet, method null (catch-all), `legacyFor: "wallet"`. All historical null-ref wallet lines resolve here.
   - `JazzCash` — kind wallet, method "jazzcash". `Easypaisa` — kind wallet, method "easypaisa". `Bank Account` — kind bank, method "bank". (Zero balance at birth; new settlements route here by default. The owner renames/archives freely.)
2. Because historical lines carry `ref == null` and resolve via `legacyFor`, the shop's existing cash/wallet balances appear, unchanged, under Main Till / Wallet & Bank. **No opening entry is needed and none is posted** — this is strictly safer than the F-14 pattern (which was needed only because pre-Complete shops had no journal at all). If a future increment ever does need to move a balance between accounts, it must use the established true-up form: one documented entry, figures from the journal itself, memo stating it is a reclass.
3. Fresh seed: the same five accounts are seeded; `getSeedJournal` is **unchanged** (its null-ref lines resolve to Main Till / Wallet & Bank), so the frozen seed identities (§0.6) survive untouched.

---

## 2. Tax engine

### 2.1 Tax slabs collection

New collection `users/{uid}/taxSlabs/{slabId}`:

```ts
interface TaxSlab {
  id: string;
  name: string;                    // e.g. "GST", "SRB", "WHT Services" (owner's words)
  kind: "percent" | "fixed";       // fixed = PKR per unit sold/purchased
  rate: number;                    // percent value (17) or fixed PKR per unit (5)
  appliesTo: "sales" | "purchases" | "both";
  inclusive: boolean;              // true: listed prices already contain this tax
  isDefault: boolean;              // at most one default per appliesTo direction
  active: boolean;
  ts: string;
}
```

Owner doc settings gain `defaultSalesTaxSlabId: string | null` and `defaultPurchaseTaxSlabId: string | null` (nullable ⇒ no tax — the default for every existing shop; see §6).

### 2.2 Product-level tax

`Product` gains two optional fields (absent on all existing products ⇒ resolved as "shop default", so no product migration is needed):

```ts
taxSlabId?: string | null;   // explicit slab override; null/absent = shop default
taxExempt?: boolean;         // true = never taxed, overrides everything
```

Resolution for a sale line: `taxExempt → no tax`; else product `taxSlabId` if set; else the shop default sales slab if it exists and is active; else no tax. Purchase lines resolve identically against purchase slabs. The resolved slab's `id`, `name`, `rate`, `kind`, `inclusive` are **snapshotted onto the bill/purchase line** (same discipline as `unitCost` snapshots — later slab edits never rewrite history).

### 2.3 Bill-level computation

Per line, on the line's **post-discount** base. Discount is allocated across lines pro-rata using the **cumulative-allocation rule already proven by the F-3 fix** (share of cumulative returned/allocated amounts, final line absorbs the residual) — so line taxes always sum exactly to the bill tax, and partial returns reverse tax exactly (§2.5).

- Exclusive, percent: `tax = round2(base × rate / 100)`.
- Exclusive, fixed: `tax = rate × qty`.
- Inclusive, percent: `tax = base − base / (1 + rate/100)` (base is the sticker amount; revenue is recorded net).
- Inclusive, fixed: `tax = rate × qty`, revenue = base − tax.
- Rounding: per-line to the paisa (2 dp); bill tax = Σ line taxes (never re-rounded at bill level).

`Bill` gains `taxAmount: number`; `BillItem` gains `taxAmount`, `taxSlabId`, `taxRate` snapshots. `Bill.total` becomes `subtotal − discount + tax` (exclusive) — the invariant "Σ payments == total" and the F-2 tolerance handling are unchanged in shape; the tolerance difference still books to `sales_discount` inside the same entry.

**Receipts:** after Discount, one line per slab used on the bill — `<slab name> <rate>%: Rs X` (fixed slabs show the slab name and amount) — then Total. Tax is never merged into the item prices on the receipt for exclusive slabs; for inclusive slabs the receipt shows the tax component as an informational "included in prices" line. (Dictionary keys for these lines: §8.)

### 2.4 Journal accounts and posting templates

Two new GL accounts (§4): **`tax_payable`** (output tax collected on sales — liability) and **`tax_input`** (input tax paid on purchases — recoverable asset). Tax never touches the P&L in v1: it is a pass-through between customer/supplier and the government. The Finance page shows the net position `tax_payable balance − tax_input balance` as "tax due"; the two accounts are **not** netted by postings (the offset entry belongs to fiscal close, Phase D).

**Taxed sale — exclusive slab** (worked example: subtotal 2,600, GST 17% ⇒ tax 442, total 3,042, all cash, COGS 2,450):

```
Dr  cash        (ref: tillAccount)      3,042
Dr  cogs                                2,450
    Cr  sales_revenue                       2,600
    Cr  tax_payable                           442
    Cr  inventory                           2,450
ΣDr = ΣCr = 5,492  ✓ (makeEntry throws otherwise)
```

With discount D and split payments, the familiar template extends mechanically: payment lines sum to `total` (incl. tax), `Dr sales_discount D`, revenue credited at the **pre-tax, post-discount** net, `Cr tax_payable T`. For an **inclusive** slab the same entry results — only the derivation of revenue differs (revenue = total − tax − … as computed in §2.3): money in is the sticker total, revenue is credited net of the embedded tax, `Cr tax_payable` carries the embedded amount.

**Taxed purchase — perpetual method** (worked example: goods net 40,000, GST 17% ⇒ input tax 6,800, gross owed to supplier 46,800, on credit):

```
Dr  purchases                          40,000
Dr  tax_input                           6,800
Dr  inventory                          40,000
    Cr  purchases                           40,000   (clearing, as today)
    Cr  payables  (ref: supplierId)         46,800
ΣDr = ΣCr = 86,800  ✓
```

The supplier is owed the **gross**; `supplierBalance` (purchased − paid) must therefore sum purchase **gross** totals — `Purchase` gains `taxAmount` and `total` is redefined as gross (net + tax), with `netTotal` added for the goods value. Supplier payment template is unchanged (`Dr payables / Cr money(ref)`). A cash purchase is the same entry with the money line replacing payables.

**Tax payment to government** (Finance action, new `refType: "tax_payment"`; amount P ≤ net due):

```
Dr  tax_payable                             P
    Cr  cash|wallet (ref: accountId)            P
```

**Return of a taxed sale:** the existing return engine mirrors with tax: `Dr sales_revenue (net share)`, `Dr tax_payable (tax share)`, `Dr inventory` / `Cr money-or-receivables (gross refund share)`, `Cr cogs`, `Cr sales_discount (share)` — where every share uses the F-3 cumulative allocation over **gross, net and tax independently**, so returning a bill item-by-item reverses exactly the original tax (final return absorbs the paisa residual).

**Assumption stated:** v1 treats all slab tax as recoverable/payable pass-through. A non-recoverable levy (e.g. a final-tax-regime withholding) would need an expense treatment — explicitly out of Phase A; noted for Phase D.

### 2.5 Seed/demo safety

The seed ships **one inactive, non-default** sample slab so the feature is discoverable in demo, and assigns no slab to any product. Fresh and migrated shops therefore compute zero tax until the owner activates a slab — the frozen seed identities (§0.6) and all live bill totals are untouched.

---

## 3. RBAC — roles owner / manager / cashier / accountant

### 3.1 Storage: extend, never replace

The live mechanism — `staffIndex/{email} → { ownerUid }` + email membership in the owner doc's `staffEmails[]` — stays as the **resolution and revocation** layer (old app builds and the published rules depend on it). Phase A adds the role in two places, written in the **same single batch** the owner already uses to add/remove staff:

- `staffIndex/{email}` gains `role: "manager" | "cashier" | "accountant"` and `disabled?: boolean`. This is the copy **Firestore rules read** (one `get()`, already performed by `isStaffOf`).
- Owner doc gains `staff: Array<{ email, role, addedAt }>` (management record / source of truth for the Settings UI) while `staffEmails: string[]` is **still maintained as a mirror** so the currently-published rules keep working during rollout and older clients keep functioning.

**Legacy default:** a staffIndex doc or `staffEmails` entry with no role ⇒ **`manager`**. This is exact, not generous: legacy staff could do everything except owner-doc/settings/staff writes, which is precisely the manager profile below. The Phase A migration (§6) backfills `role: "manager"` onto existing index docs and builds `staff[]` from `staffEmails[]`. Removing an email still deletes the index doc + both owner-doc lists in one batch — revocation semantics unchanged. The owner's own role is implicit (`uid == {uid}`), never stored.

Client: `AuthProvider`'s `role: "owner" | "staff"` becomes `"owner" | "manager" | "cashier" | "accountant"` (missing role ⇒ manager); a single `can(permission)` helper gates UI. UI gating is convenience; **rules are the enforcement** (§3.3). Field-level grains rules cannot express (e.g. hiding cost prices from cashiers) are UI-only and marked as such in the matrix.

### 3.2 Permission matrix

✓ = full · R = read-only · — = none · (UI) = enforced in UI only, rules allow the underlying write.

| Module / action | Owner | Manager | Cashier | Accountant |
|---|---|---|---|---|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Sales counter (quick sale) | ✓ | ✓ | ✓ | — |
| Billing — create / finalize / hold | ✓ | ✓ | ✓ | — |
| Billing — void a posted bill | ✓ | ✓ | — | — |
| Returns — process refund | ✓ | ✓ | ✓ | — |
| Inventory — view stock | ✓ | ✓ | ✓ | R |
| Inventory — view cost prices | ✓ | ✓ | — (UI) | ✓ |
| Inventory — add/edit products, CSV import | ✓ | ✓ | — | — |
| Stock adjustments | ✓ | ✓ | — | — |
| Forecast | ✓ | ✓ | — | R |
| Suppliers & purchases — manage | ✓ | ✓ | — | R |
| Supplier payments — record | ✓ | ✓ | — | ✓ |
| Customers — manage directory | ✓ | ✓ | ✓ | R |
| Udhaar — give standalone (cash loan) | ✓ | ✓ | — | — |
| Udhaar — record repayment | ✓ | ✓ | ✓ | ✓ |
| Expenses — manage | ✓ | ✓ | — | ✓ |
| Finance — cash book / P&L / aging / tax | ✓ | ✓ | — | ✓ |
| Money accounts — manage (create/archive/defaults) | ✓ | — | — | — |
| Money accounts — record transfer | ✓ | ✓ | — | ✓ |
| Day close — perform | ✓ | ✓ | ✓ (cash accts) | — |
| Day close — view history | ✓ | ✓ | ✓ | R |
| AI Assistant | ✓ | ✓ | ✓ | ✓ |
| Settings — shop profile | ✓ | — | — | — |
| Staff & roles — manage | ✓ | — | — | — |
| Tax slabs — manage | ✓ | — | — | R |
| Periods — close / lock / reopen | ✓ | — | — | — |
| **Phase B** Quotations & estimates | ✓ | ✓ | ✓ | R |
| **Phase B** Sale orders / delivery challans | ✓ | ✓ | ✓ | R |
| **Phase B** Purchase orders | ✓ | ✓ | — | R |
| **Phase B** Credit / debit notes | ✓ | ✓ | — | ✓ |
| **Phase B** Receipt / payment vouchers | ✓ | ✓ | ✓ | ✓ |
| **Phase B** Cheques registry | ✓ | ✓ | — | ✓ |
| **Phase C** Warehouses / stock transfers | ✓ | ✓ | — | R |
| **Phase C** Manufacturing & BOM | ✓ | ✓ | — | R |
| **Phase C** Job tracker / work orders | ✓ | ✓ | R | R |
| **Phase D** Staff directory & attendance | ✓ | ✓ | — | R |
| **Phase D** Payroll — prepare / run / pay | ✓ | R | — | ✓ |
| **Phase D** Loans & financing | ✓ | R | — | ✓ |
| **Phase D** Fiscal-year close | ✓ | — | — | — |
| **Phase D** Trial balance / exports (incl. Tally) | ✓ | ✓ | — | ✓ |

### 3.3 Firestore rules changes (conceptual diff — rules file NOT edited by this design)

1. **New helper `staffRole(uid)`:** returns `"owner"` when `isOwner(uid)`; else, when `isStaffOf(uid)`, `get(staffIndexPath(email)).data.get('role', 'manager')`; else `null`. (Reuses the `get()` `isStaffOf` already performs in shape; role adds no new document fetches per check beyond the existing two.)
2. **New helper `hasRole(uid, roles)`** = `staffRole(uid) in roles`.
3. **Per-collection gates** replace the blanket `canAccess` write where the matrix restricts writes; reads stay `canAccess` except where marked:
   - `products`: write → owner/manager. `adjustments`: write → owner/manager.
   - `expenses`, `supplierPayments`, `cashEntries`: write → owner/manager/accountant.
   - `purchases`, `suppliers`: write → owner/manager.
   - `bills`: create/update → owner/manager/cashier; delete (held only, as today) → owner/manager/cashier.
   - `sales`: create → owner/manager/cashier (append-only clauses unchanged).
   - `returns`: create → owner/manager/cashier.
   - `credits`, `customers`: write → owner/manager/cashier/accountant for repayment-shaped rows cannot be distinguished by rules — rules grant write to all four roles on `credits` (the "give standalone udhaar" restriction is UI + journal-template level; stated honestly), `customers` write → owner/manager/cashier.
   - `journal`: create → any of the four roles (every role legitimately posts *something*: cashier bills, accountant expenses/payments); read → owner/manager/accountant (cashier does not browse the ledger). Append-only clauses unchanged.
   - `dayCloses`: create → owner/manager/cashier; read → all four.
   - **New collections:** `accounts` read → all roles (names/defaults are needed at every desk), write → owner only. `taxSlabs` read → all roles, write → owner only. `periods` read → all roles, write → owner only.
   - Owner doc: unchanged (read `canAccess`, write owner only) — `staff[]`, `staffEmails`, fiscal settings and `lockedThrough` all live there, so staff/period/settings management stays owner-only by construction.
4. **Period-lock guard** (§5.3) is added to journal create + money-bearing operational creates.
5. Rollout order is a hard requirement (§6): **publish rules v3 before the Phase A app build**; rules v3 must remain fully backward compatible with the current app (every existing allowance preserved; new gates only *narrow* staff writes per the matrix — a legacy staffer mid-rollout is a manager by default, whose gates are the widest staff gates, so no live workflow breaks).

---

## 4. Chart of accounts v2

### 4.1 The money-account decision (restated)

Per §1.1: **single GL codes with a subledger, not one code per money account.** `cash` and `wallet` stay; the money account is the journal line's `ref`. The same treatment already governs `receivables`/`payables`, and it is the only option that keeps live journals' balances meaningful without a rewriting migration — which the append-only discipline forbids anyway.

### 4.2 Registry

Phase A introduces a static **COA registry** in code (`code → { type, normalBalance }`) covering old and new codes — reports (trial balance, Phase D) and the rules of §2/§5 read types from it, instead of the ad-hoc sign conventions currently scattered through `lib/ledger.ts` (`payablesTotal` negating by hand, etc.). Registry membership also becomes the validation list for `makeEntry` line accounts in a later hardening (not Phase A behaviour change).

### 4.3 Full v2 list

All 17 existing codes are **unchanged in name and meaning** — live journal lines keep their semantics. New codes are additive only.

| Code | Type | Normal | Since | Notes |
|---|---|---|---|---|
| `cash` | Asset | Dr | v1 | GL bucket for all cash-kind money accounts; per-account detail in line `ref` (§1) |
| `wallet` | Asset | Dr | v1 | GL bucket for wallet/bank-kind accounts; per-account detail in `ref` |
| `sales_revenue` | Income | Cr | v1 | Always credited **net of tax** from Phase A |
| `sales_discount` | Contra-income | Dr | v1 | Also absorbs the F-2 payment-tolerance difference (unchanged) |
| `cogs` | Expense | Dr | v1 | From per-sale `unitCost` snapshots (unchanged) |
| `inventory` | Asset | Dr | v1 | Finished/general stock at cost; the shelf-reconciliation account |
| `purchases` | Clearing | — | v1 | Perpetual clearing; nets to zero per purchase (unchanged) |
| `expense_rent` | Expense | Dr | v1 | |
| `expense_electricity` | Expense | Dr | v1 | |
| `expense_salary` | Expense | Dr | v1 | Phase D payroll debits here (via `salary_payable`) |
| `expense_transport` | Expense | Dr | v1 | |
| `expense_other` | Expense | Dr | v1 | |
| `receivables` | Asset | Dr | v1 | Subledger: `credits` (per-customer `ref`); negative = customer advance (convention kept, §4.4) |
| `payables` | Liability | Cr | v1 | Subledger: suppliers (per-supplier `ref`); negative = supplier advance (convention kept) |
| `capital` | Equity | Cr | v1 | Owner capital in; also absorbs revaluation + opening true-ups (established pattern) |
| `drawings` | Contra-equity | Dr | v1 | |
| `inventory_loss` | Expense | Dr | v1 | Damage/expiry/theft at cost |
| **`tax_payable`** | Liability | Cr | **A** | Output tax collected on sales (§2) |
| **`tax_input`** | Asset | Dr | **A** | Input tax paid on purchases, recoverable (§2) |
| **`cheques_in_hand`** | Asset | Dr | **A** (used B) | Received cheques not yet cleared: Dr on receipt (Cr receivables), Dr money / Cr here on clearing, full reversal on bounce |
| **`cheques_issued`** | Liability | Cr | **A** (used B) | Cheques issued to suppliers: Dr payables / Cr here at issue; Dr here / Cr money at clearing |
| **`salary_payable`** | Liability | Cr | **A** (used D) | Payroll accrual: Dr `expense_salary` / Cr here at run; Dr here / Cr money at payment |
| **`loans_payable`** | Liability | Cr | **A** (used D) | Loan principal: Dr money / Cr here at drawdown; Dr here / Cr money per instalment (principal part) |
| **`expense_finance`** | Expense | Dr | **A** (used D) | Interest + bank/finance charges (instalment interest part: Dr here) |
| **`inventory_raw`** | Asset | Dr | **A** (used C) | Raw materials; starts at zero everywhere — no balance migration |
| **`wip`** | Asset | Dr | **A** (used C) | Work-in-progress: Dr here / Cr `inventory_raw` at issue; Dr `inventory` / Cr here at completion (manufacturing overhead folds through `wip` in Phase C's design — no separate overhead code) |
| **`retained_earnings`** | Equity | Cr | **A** (used D) | Fiscal-year closing target (Phase D): P&L accounts close here, kept distinct from contributed `capital` |

**Total: 27 codes** (17 v1 + 10 new). Codes used only by later phases are declared in Phase A so those phases need no COA v3 and no type-union churn in shipped clients; no Phase A posting writes them except `tax_payable`/`tax_input`.

### 4.4 Decisions recorded

- **Advances stay negative subledger balances** (customer advance = negative receivables, supplier advance = negative payables). The audit accepted this convention (ledgers agree; UI labels it "advance"). No `customer_advances`/`supplier_advances` codes — splitting them would break the F-6 FIFO allocation that operates over the whole customer pool.
- **No `rounding` code** — the F-2 remediation already books tolerance differences to `sales_discount`; tax rounding is absorbed by cumulative allocation (§2.3). No `suspense` code, ever: an unclassifiable posting is a bug to fix, not an account.
- **No fixed-assets/depreciation codes** — outside the approved roadmap.

---

## 5. Period & fiscal-year foundation

### 5.1 Model

- **Settings (owner doc):** `fiscalYearStartMonth` (1–12, default **7** — Pakistan fiscal year, 1 Jul–30 Jun) + `fiscalYearStartDay` (default 1); `lockedThrough` — an ISO instant string, `""` = nothing locked. Locks are **monotonic and date-granular in effect**: everything with a business instant ≤ `lockedThrough` is closed.
- **Collection `users/{uid}/periods`:** one doc per close/reopen event — `{ id, kind: "period" | "fiscal_year", from, to, action: "close" | "reopen", byUid, byEmail, ts, note }`. This is the audit trail; `lockedThrough` on the owner doc is the enforcement value the trail justifies.
- **Business date on entries:** `JournalEntry` gains optional `dateISO` (YYYY-MM-DD, Asia/Karachi business date of the event). New postings always set it (derived from `ts`); legacy entries lack it and are treated as pre-lock history (they already exist — a lock never invalidates the past retroactively, it only rejects *new* writes into it).

### 5.2 Enforcement — store layer (primary)

Every money event journals, and every cloud journal write funnels through `batchJournal` in `StoreProvider.tsx` (audit-verified single choke point); demo mode composes the same updates in one function. The guard lives there:

```
assertPeriodOpen(entry):
  if settings.lockedThrough != "" and entryInstant <= lockedThrough: throw PeriodLocked
```

- `entryInstant` = the entry's `ts`. Backdating is not a feature anywhere in the app, so creation instant == business instant for all real flows.
- **Corrections into a closed period follow the reversal discipline, not backdating:** to fix an expense inside a closed period, the reversal + corrected entry post with **today's** date referencing the original (`reversesId`) — the closed period's totals never change, the correction lands in the open period, exactly as in paper books. This must be the documented behaviour in PRODUCTION.md when implemented.
- Operational docs that journal in the same batch are covered transitively (the batch fails as a whole). Non-journalling writes (held bills, product name edits) are not postings and are not locked.

### 5.3 Enforcement — Firestore rules (backstop)

Journal create gains the condition (conceptual):

```
allow create: if canPostRole(uid)
  && ( !('dateISO' in request.resource.data)
       || request.resource.data.dateISO > lockedThroughDate(uid) )
```

where `lockedThroughDate` reads the owner doc's `lockedThrough` (one `get()`, same doc `isStaffOf` already fetches). The `dateISO`-absent branch keeps **legacy clients** working during rollout. For the money-bearing operational collections (`bills`, `sales`, `expenses`, `credits`, `purchases`, `supplierPayments`, `returns`, `cashEntries`), the equivalent guard compares the doc's `ts` lexicographically against `lockedThrough` — sound because every client writes `ts` via `toISOString()` (UTC ISO-8601 sorts lexicographically). Rationale for guarding operational docs too: aging reports derive from `credits`/`purchases` docs, so a journal-only guard would leave a subledger-shaped hole.

### 5.4 Owner actions (Phase A surface)

Settings gains a Fiscal section (owner-only): set fiscal-year start; **Close period up to <date>** (writes a `periods` doc + sets `lockedThrough` to that date's end-of-day PKT instant); **Reopen** (owner-only, writes a `reopen` doc + lowers `lockedThrough`) — reopening is permitted in Phase A (fiscal-year *close* with closing entries is Phase D, after which reopening the year is out of scope by design). Safety rail: a close may not include **today or yesterday** (PKT) — see risk R-5 (offline backlog).

---

## 6. Migration & compatibility plan

### 6.1 Mechanism — the flag pattern, extended

Owner doc gains `phaseA: { accountsV1, rbacV1, taxV1, periodsV1 }` booleans (finer-grained than `seedV2`, so a half-finished migration resumes step-wise). On owner sign-in (never staff — same as today), `StoreProvider` runs `migratePhaseA(db, uid)` if any flag is unset. Every step is **idempotent** (fixed doc ids / existence checks) and writes **no journal entries**:

| Step | Flag | Actions |
|---|---|---|
| Accounts | `accountsV1` | Create the five default `accounts` docs (§1.6) with fixed ids (`acc-till`, `acc-wallet-legacy`, `acc-jazzcash`, `acc-easypaisa`, `acc-bank`). No journal writes — null-ref resolution carries history. |
| RBAC | `rbacV1` | Build owner-doc `staff[]` from `staffEmails[]` with role `manager`; merge-write `role: "manager"` onto each existing `staffIndex/{email}` doc (owner is permitted: index create/update rule keys on `ownerUid == auth.uid`). |
| Tax | `taxV1` | Create the one inactive sample slab; set `defaultSalesTaxSlabId/defaultPurchaseTaxSlabId = null`. No product writes (fields are optional, §2.2). |
| Periods | `periodsV1` | Set `fiscalYearStartMonth = 7`, `fiscalYearStartDay = 1`, `lockedThrough = ""`. No `periods` docs. |

**Fresh accounts:** `seedNamespace` seeds the same end-state directly (accounts, sample slab, fiscal defaults, `phaseA` all true, `seedV2` true) and its journal is the unchanged audited seed.

**Demo mode:** the local seed shape gains the same collections/settings with a localStorage version bump; demo journals carry no refs, resolving to the demo's Main Till / Wallet & Bank exactly as in cloud.

### 6.2 Compatibility matrix

| Combination | Behaviour |
|---|---|
| Old app + old rules | Untouched (today's live state). |
| Old app + **rules v3** | Must work fully — rules v3 preserves every current allowance; RBAC narrowing only restricts staff writes to the manager superset for legacy staff. **This is why rules ship first.** |
| New app + old rules | **Broken by design** — old rules' catch-all denies `accounts`/`taxSlabs`/`periods`. Hence the hard ordering: rules v3 publish is a release gate, verified live before the app zip ships. |
| New app + migrated data, tax never configured | Every bill/purchase total and journal entry identical to today (tax resolution yields "no tax" at every step). |
| Staff mid-rollout | Missing role ⇒ manager (rules + client agree); removed email still cuts access instantly via `staffEmails`. |

### 6.3 Risk list

| # | Risk | Severity | Mitigation in this design |
|---|---|---|---|
| R-1 | Rules/app rollout ordering: new app deployed before rules v3 ⇒ new collections denied, app half-broken (cf. the Complete-edition session hang, which was this exact failure shape). | High | Rules-first release gate (§6.2); rules v3 backward compatible so early publish is safe. |
| R-2 | RBAC narrowing breaks a live staff workflow (a staffer who today edits products turns out to be "the cashier"). | Medium | Legacy default = manager (widest staff role); owner re-roles deliberately afterwards. |
| R-3 | Owner deletes/archives the `legacyFor` account or re-points method defaults ⇒ historical balances appear to move/vanish. | Medium | Accounts are **archive-only, never deletable** once any journal line resolves to them; archiving a `legacyFor` account is blocked in the store (it may be renamed only). Method-default changes affect future postings only (accountId is stamped at posting). |
| R-4 | Tax rounding drift across partial returns (the F-3 failure shape, one level down). | Medium | Cumulative allocation for tax exactly as for discount (§2.3/§2.5); harness scenario mandatory (§7, A4). |
| R-5 | Period lock vs offline backlog: Firestore persistence queues writes offline; a lock set while a device holds unsynced entries dated inside the locked range makes those creates fail — and commits are fire-and-forget today (audit observation), so the failure is invisible. | Medium | Close may not cover today/yesterday (§5.4); Phase A increment A5 includes surfacing failed commits for posting paths (small, contained); residual risk documented for the owner. |
| R-6 | Inclusive-tax + discount + split-payment interaction produces an unbalanced template variant. | Medium | All templates route through `makeEntry` (throws); worked examples + harness scenarios for every combination in §2.4 before UI work. |
| R-7 | Migration runs concurrently in two owner tabs ⇒ duplicate default accounts. | Low | Fixed doc ids + existence checks make every step idempotent; `setDoc` merge semantics. |
| R-8 | Rules `get()` count per write grows (staffRole + lockedThrough reads). | Low | Both read docs already fetched by `isStaffOf`/owner-doc patterns; Firestore bills reads per operation, volume is shop-scale. Accepted. |
| R-9 | Live accounts seeded pre-remediation still carry misstated Inventory/Cash (FINANCE-AUDIT residual). | Info | Unchanged by Phase A; the one-time opening-correction wizard remains a separate owner decision. Phase A must not silently "fix" it. |

---

## 7. Implementation order inside Phase A

Five increments, each independently shippable (distinct zip, PRODUCTION.md update, finance-audit checkpoint). Order is dependency-driven: registry → accounts → RBAC → tax → periods.

### A1 — COA v2 registry & types (no behaviour change)
- Extend `AccountCode` union with the 10 new codes; add the COA registry (type/normal-balance); add `MoneyAccount`, `TaxSlab`, `Period`, extended settings/`staff[]` types; `JournalEntry.dateISO?`; `refType` += `"transfer" | "tax_payment"`. No posting path changes.
- **Audit checkpoint:** `tsc` 0; seed harness re-run — `getSeedJournal` output identical, 34/34 identities hold. (This checkpoint guards invariant §0.6 for every later increment.)

### A2 — Money accounts
- `accounts` collection + selectors (`moneyAccountBalance`, `accountBook`, ref resolution incl. `legacyFor`) + migration step `accountsV1` + seed accounts.
- Posting paths stamp `accountId` + journal `ref` (bills, counter sales, returns/refunds, expenses, supplier payments, repayments, cash entries); transfers (record + journal); Settings → Accounts UI (create/archive/rename/set method default); day close per cash account (journal-derived expected cash; legacy summary kept as cross-check).
- **Rules:** add `accounts` match (read all roles / write owner) — published with this increment's release (rules-first, §6.2).
- **Audit checkpoint:** harness — per-account balances sum to GL `cash`/`wallet` on seed + migrated shapes; null-ref (legacy) scenario reconciles to the pre-Phase-A totals to the rupee; transfer scenarios balance via `makeEntry`; F-2/F-6 templates re-verified with refs present.

### A3 — RBAC
- `staff[]` + `staffIndex.role` (migration step `rbacV1`), `AuthProvider` role resolution (legacy ⇒ manager), `can()` helper, UI gating per §3.2 matrix, Settings staff UI gains role picker.
- **Rules v3** per §3.3 — published **before** this increment's app build.
- **Audit checkpoint:** rules scenario matrix (legacy index doc without role = manager access; cashier denied `products` write and `journal` read at rules level; removed email loses access immediately; owner-only surfaces deny all staff roles) + client matrix walkthrough. No journal writes in this increment — finance harness from A1 must still pass unchanged.

### A4 — Tax engine
- `taxSlabs` collection + product tax fields + desk/purchase computation (§2.3) + snapshots + journal templates (§2.4) + receipt tax lines + Finance tax position (payable − input) + record-tax-payment + migration step `taxV1`.
- **Rules:** `taxSlabs` match (read all / write owner).
- **Audit checkpoint:** harness — exclusive & inclusive taxed sale (worked examples of §2.4 reproduce exactly), taxed purchase (payables = gross; input tax exact), item-by-item return of a taxed discounted bill reverses tax to the paisa (cumulative allocation), tax payment reduces `tax_payable` only; **and** the no-tax path: seed + a standard bill produce byte-identical entries to the pre-Phase-A templates.

### A5 — Periods & fiscal foundation
- Fiscal settings + `periods` collection + `dateISO` on new entries + `assertPeriodOpen` in `batchJournal` (+ demo compose path) + close/reopen owner actions with the today/yesterday rail + commit-failure surfacing for posting paths (R-5) + migration step `periodsV1`.
- **Rules:** journal/operational create guards per §5.3.
- **Audit checkpoint:** scenarios — posting dated inside a closed period throws store-side and is denied rules-side; reversal of a closed-period expense posts cleanly at today's date; legacy entry without `dateISO` still creatable by an old client; day close + month P&L across the lock boundary unchanged.

---

## 8. i18n notes (keys needed — not written here)

The typed-dictionary mechanism (each `ur` part is `Record<keyof typeof en<Part>>`) makes EN/UR parity a compile-time guarantee for anything added through it; all Phase A UI strings must go through it — no hardcoded strings in either language, per the standing purity rule. New keys required, by area (strings themselves are implementation work):

- **`fin.acct.*`** — labels for the 10 new account codes (and a check that all 27 codes have labels in both languages).
- **Accounts UI** (extend `settings`/`fin` parts, ~20 keys): account list/add/archive/rename, kind + method labels, default-for-method, transfer form + labels, per-account balance, legacy-account rename-only note, archive-blocked error.
- **Tax** (new part or `fin` extension, ~25 keys): slab CRUD (name/kind/rate/applies-to/inclusive/default/active), product tax fields (slab override, exempt), bill tax summary + receipt tax lines (incl. "included in prices"), Finance tax position + record-tax-payment, tax rounding/validation errors.
- **Roles** (~15 keys): role names ×4, staff role picker, permission-denied notices, legacy-role note in Settings.
- **Periods/fiscal** (~12 keys): fiscal-year start, close-period action + confirm, reopen, period-locked error (surfaced at every desk), periods history labels.
- **Receipts:** tax line templates per §2.3 in both languages; account name on receipts stays owner data (not translated).

Estimated total ≈ 90–110 new keys. Journal memos remain data-layer English strings (existing documented residual — the Finance UI localizes their structured parts).

---

## 9. What Phase A deliberately does NOT do

- No document-chain, warehouse, HR or SaaS features (Phases B–D/G) — only their accounts, roles and matrix rows are pre-declared so those phases land without another foundation pass.
- No change to the Flutter app (Phase F) — but nothing in this design is web-specific: `accounts`/`taxSlabs`/`periods`, roles and the COA registry are data-layer contracts the Flutter client will consume as-is.
- No rewrite of any live journal, ever (R-9): pre-remediation live accounts keep their documented residual until the owner chooses the correction wizard.
