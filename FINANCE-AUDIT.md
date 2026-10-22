# Dukaan AI — Independent Finance Audit (COMPLETE Edition)

**Date:** 2026-10-22 · **Scope:** `web/` finance layer (double-entry `journal`, posting paths in `components/StoreProvider.tsx`, selectors in `lib/ledger.ts` / `lib/selectors.ts`, seed in `lib/seed.ts`, rules in `firebase/firestore.rules`)
**Method:** full code read of every posting path + grep matrices (all Firestore writes in the app live in `StoreProvider.tsx` — verified: no `setDoc/updateDoc/deleteDoc/writeBatch` anywhere else in `components/` or `app/`) + an executable scenario harness (`/tmp/finance-harness.js`, faithful re-implementations of the posting templates checked line-by-line against source; seed scenarios run against the real `lib/seed-data.json`). **This pass changed no app code.**

**Verdict at a glance**

| # | Area | Verdict |
|---|---|---|
| 1 | Balance invariant (Σdebit == Σcredit) | **FLAW** — assumed, never enforced; two live paths post unbalanced entries (F-1, F-2) |
| 2 | Completeness of posting (same batch) | **FLAW** — transactional handlers are exemplary, but master-data edits move inventory value with no journal entry at all (F-4, F-11) |
| 3 | Immutability / reversals | **SOUND, with two exceptions** — seeded expenses can never be reversed (F-5); production reset half-fires (F-10) |
| 4 | Reconciliation (P&L, cash book, aging, COGS, valuation) | **FLAW** — core identities hold; they break at standalone udhaar, day close, dashboard profit, and inventory valuation (F-7, F-8, F-9, F-4/F-12) |
| 5 | Edge cases & rounding | **FLAW** — per-return discount rounding over-refunds (F-3); void-after-repayment double-reduces receivables (F-6); the rest is consistent |
| 6 | Seed integrity | **SOUND per entry; payables 27,900 ✓, receivables 5,500 ✓** — but no opening-balance entry, so the journal's Inventory/Cash positions are fictional (F-12) |

Severity key: HIGH = wrong money in normal use · MODERATE = wrong money in common edge cases or silent drift · MINOR = bounded/rare/cosmetic-to-ledger.

---

## Area 1 — Balance invariant · FLAW

**What is sound.** Every standard entry template balances by construction (harness S1, S4, S10): counter sale (Dr cash + Dr cogs / Cr revenue + Cr inventory, `StoreProvider.tsx:540-546`), bill with split payments + discount (`StoreProvider.tsx:641-652`), purchase perpetual-clearing (`StoreProvider.tsx:1038-1043`), supplier payment, expense, credit given, repayment, cash-in/out, stock adjustment, and the return/void engine when a bill is returned **in one event** (`StoreProvider.tsx:870-889`). Fractional quantities (kg/L) are carried unrounded through bill lines, sale rows and journal lines alike, so with exact payments there is **no paisa drift** between the three records (S10).

**F-1 (MODERATE) — Balance is assumed, never enforced.**
`makeEntry` (`lib/ledger.ts:55-69`) only filters zero-value lines. The guard `entryBalances` (`lib/ledger.ts:71-75`) exists but is **dead code** — a repo-wide grep finds exactly one hit: its own definition. Nothing asserts balance at write time, in either mode, so any template bug or tolerance path (F-2) writes a permanently unbalanced entry into an append-only ledger that can never be corrected in place.
*Minimal fix:* call `entryBalances` inside `makeEntry` (throw / refuse to post on failure), or assert in `batchJournal` and in the demo append path.

**F-2 (MODERATE) — The Rs 1 payment tolerance posts unbalanced entries (Rs 0.5–1 per bill, cumulative).**
`createBill` accepts a bill when `Math.abs(paid − bill.total) ≤ 1` (`StoreProvider.tsx:734`); `finalizeBill` does the same (`StoreProvider.tsx:780`). `postBill` then journals **debits = the actual payments** against **credits = subtotal revenue** (`StoreProvider.tsx:641-652`).
*Scenario (harness S2):* bill total Rs 1,000, cashier keys Rs 999 → accepted. Entry: Dr 1,599 vs Cr 1,600 — off by exactly Rs 1. Fractional bills make this routine, not exotic (S2b): 0.5 kg @ Rs 333 → total 166.5, customer pays a rounded Rs 167 (within tolerance) → entry off by Rs 0.5.
*Impact:* trial balance drifts by up to Rs 1 per affected bill, forever, and the journal Cash account disagrees with the drawer by the same accumulated amount. *Minimal fix:* journal a rounding/short-payment line for the difference (Dr/Cr `sales_discount` or a `rounding` account), or tighten acceptance to exact equality and let the UI auto-fill the last payment row (it already has that helper, `BillingDesk.tsx:406-413`).

---

## Area 2 — Completeness of posting · FLAW

**What is sound — the transactional core is genuinely same-batch.** In cloud mode every money event commits its operational docs **and** its journal entry in one `writeBatch`: counter sale (`StoreProvider.tsx:665-679` pattern at `:547-556`), bill post incl. udhaar row (`:641-679`), returns/voids incl. negative sale rows + return doc + credit reversal (`:870-944`), purchase (`:1038-1054`), supplier payment (`:1081-1089`), credit given (`:1131-1139`), repayment (`:1164-1172`), expense add (`:1184-1205`), expense edit = doc + reversal + repost in one batch (`:1227-1237`), expense delete = doc delete + reversal (`:1258-1266`), cash book (`:1282-1294`), stock adjustment (`:1326-1341`). Demo mode applies the same set as one composed state update persisted to localStorage. Day close correctly posts **no** entry (it is a report snapshot, `saveDayClose`). Held bills correctly post nothing until finalize (`holdBill` → `putDoc` only). There is no money-moving handler outside `StoreProvider.tsx`.

*Observation (reliability, not logic):* every commit is fire-and-forget (`void batch.commit()`, no `await`, no error surface). If a commit is rejected (rules, network), the caller has already returned success (`createBill` returns the bill id immediately) and the UI relies on snapshots that will never show the write. Posting is complete in code; failed postings are invisible.

**F-4 (HIGH) — Inventory value enters, leaves and is revalued entirely outside the journal via product master-data.**
`updateProduct` (`StoreProvider.tsx:503-515`) writes any `Partial<Product>` with no journal entry and no adjustment row — and the product edit form submits **both `costPrice` and `stockQty`** in its payload (`InventoryManager.tsx:201-208`). Consequences:
- **(a) Silent stock edits.** Typing a new `stockQty` in the edit form changes shelf stock with no adjustments-log row and no journal movement. The Inventory account and the shelf diverge permanently and unauditably.
- **(b) Silent revaluation + COGS regime change.** `recordPurchase` itself rewrites `costPrice` to the latest purchase cost (`StoreProvider.tsx:1051`) — legitimate — but a manual cost edit does the same with no Dr/Cr revaluation entry for the stock already on hand. Scenario (harness S6): buy 10 @ Rs 100 (Inventory Dr 1,000) → edit cost to Rs 120 → sell all 10 → sale posts Cr Inventory at the *current* cost, 1,200. **Journal Inventory = −Rs 200 with an empty shelf.** Every subsequent report that touches inventory is off by (Δcost × qty on hand at reprice), growing with each reprice.
- **(c) Vanishing stock.** `deleteProduct` (`StoreProvider.tsx:517-527`) deletes a product holding stock with no write-off entry; `addProduct`/`importProducts` accept an opening `stockQty` with no Dr Inventory / Cr Capital entry, so inventory value also *appears* outside the ledger.
*Minimal fix:* route `stockQty` changes in the edit form through `adjustStockInternal` (delta = new − old, reason "correction"); on `costPrice` change post a revaluation entry for qty-on-hand × Δcost (Dr Inventory / Cr Capital-or-revaluation for increases, mirrored for decreases); make `deleteProduct` refuse (or write off via `inventory_loss`) when `stockQty > 0`; journal opening stock on product create/import.

**F-11 (MINOR) — Stock adjustments are clamped on the shelf but posted in full to the journal.**
`adjustStockInternal` sets shelf stock to `Math.max(0, stockQty + delta)` (`StoreProvider.tsx:1338` cloud, `:1347` demo) but posts the journal loss/gain for the **full** `|delta| × costPrice`. Adjusting −10 against 4 on hand posts a 10-unit loss and removes 4 → Inventory account understated by 6 × cost vs the shelf. *Minimal fix:* clamp `delta` to the removable quantity before constructing the entry (or reject the excess).

**F-14 (MINOR, one-time) — Migrated (top-up) history COGS is computed at today's costs.**
`topUpNamespace` builds the seed journal from the live products/sales via `getSeedJournal`, whose COGS uses the **current** `costPrice` map (`lib/seed.ts:107`), although the live `Sale` rows carry `unitCost` snapshots. Where a cost changed before migration, historical COGS (and therefore historical gross profit) is approximate. Bounded to pre-Complete-edition history; post-migration activity is exact.

---

## Area 3 — Immutability · SOUND, with two exceptions

**Evidence.** (i) No client code updates or deletes a `journal` or `sales` document: the only `batch.update`/`batch.delete` targets in `StoreProvider.tsx` are `products`, the `expenses` doc (paired with a reversal, below), the owner doc (staff list) and `staffIndex`; `removeDoc` is only ever called for `bills` (held only), `suppliers`, `customers`, `expenses`. (ii) Firestore rules independently deny it: `sales` and `journal` are `allow read, create` with `allow update, delete: if false` (`firebase/firestore.rules:126-136`). (iii) Corrections are append-only reversals: expense edits post a line-swapped reversal carrying `reversesId` plus the corrected entry (verified in harness S5a: a live expense edited 5,000 → 7,000 nets to exactly 7,000 in the journal and in P&L); returns/voids append negative sale rows (`kind: "return"`) plus a balanced reversal entry rather than touching the original bill's postings.

**F-5 (HIGH for every seeded shop — which is every shop) — Seeded expenses can never be reversed; editing one double-counts it, deleting one leaves its charge in P&L forever.**
Seed journal entries are tagged `refType: "seed"` (`lib/seed.ts:92-143`). The reversal lookup in `updateExpense`/`deleteExpense` searches for `refType === "expense" && refId === id` (`StoreProvider.tsx:1224` and `:1255`) — a seeded expense's entry is therefore **never found**, `reversal` is `null`, and:
- *Edit* (harness S5b): seeded electricity expense Rs 8,450 edited to Rs 9,000 → only the repost is appended → P&L shows **17,450** for a 9,000 expense (Rs 8,450 phantom).
- *Delete* (harness S5c): seeded rent Rs 25,000 deleted → nothing is appended → the Rs 25,000 charge remains in the journal and in every future P&L, with no expense record anywhere to explain it.
This applies to the two seeded expenses (electricity 8,450, rent 25,000) in **every fresh production account** (all accounts are seeded) and every top-up-migrated account — including the live shop. *Minimal fix:* match originals by `refId` across `refType ∈ {"expense","seed"}` (or tag seeded expense entries `refType: "expense"`), and use the latest *unreversed* posting for the id rather than merely the latest.

**F-10 (MODERATE) — "Reset demo data" is exposed in production and half-fires against the append-only rules.**
`SettingsView.tsx:226-230` offers the reset in production ("In production this reseeds…"). `resetDemo` (`StoreProvider.tsx:1473-1499`) deletes collections in order — `products` first — in separate batches. The rules deny `sales`/`journal` deletes, so the `sales` batch is rejected **after the products batch has already committed**: the reset aborts with products wiped, all financial history intact, and no reseed. The shop is left with a full ledger and no products, recoverable only by hand. (In demo mode the same code works as intended.) *Minimal fix:* hide/disable reset when `mode === "production"` (or preflight-check deletability and refuse atomically before deleting anything).

---

## Area 4 — Reconciliation · FLAW (core identities hold; four breaks)

**Identities that hold, with evidence.**
- *Cash book == journal:* `cashBook` (`lib/ledger.ts:206-235`) is built purely from journal cash/wallet lines, so its closing balance **is** the journal balance by construction.
- *COGS == Σ per-sale cost snapshots (post-go-live):* bill COGS is the sum of `qty × unitCost` where `unitCost` is snapshotted onto the `BillItem` at pricing time (`StoreProvider.tsx:582-610`, `:641-652`); counter sales snapshot `unitCost` onto the `Sale` row and journal the same value; returns credit COGS at the bill's snapshot. The purchases clearing pair (Dr purchases / Cr purchases, `StoreProvider.tsx:1038-1043`) nets the Purchases account to zero on every purchase — **no double count** with COGS. (Seed/migrated history excepted, F-14.)
- *Aging == subledgers == journal:* `receivablesAging` and the credits subledger are computed from the same `credits` rows (`lib/ledger.ts:301-326`); `payablesAging` from the same `purchases`/`supplierPayments` rows as `supplierBalance` (`lib/ledger.ts:330-356`); and every subledger write is batch-paired with its journal entry (Area 2), so journal receivables/payables totals equal the subledger totals — including in the broken cases below, where **both are equally wrong** (the ledgers never disagree with each other; they disagree with economic reality).

**F-7 (MODERATE) — Standalone udhaar posts revenue with no sale, no COGS, no stock movement.**
`addCredit` (`StoreProvider.tsx:1131-1134`) posts Dr receivables / Cr `sales_revenue` for a manually given udhaar. Consequences: (i) **P&L revenue exceeds the sales ledger by exactly the total of standalone credits** (harness S8: Rs 1,000 of sales + Rs 3,000 standalone udhaar → P&L revenue Rs 4,000); the audit identity "P&L revenue == Σ sales (net)" therefore does **not** hold whenever the feature is used. (ii) If the udhaar was for goods taken off the shelf, no sale row, no COGS and no stock decrement exist anywhere — inventory drifts by the goods' cost and the shelf count is wrong. (iii) If it was a pure cash loan to a customer, it is misclassified: it inflates revenue instead of posting Dr receivables / Cr cash. *Minimal fix:* split the action — goods-on-credit must go through a bill (which already supports a credit payment part); a cash advance should post Dr receivables / Cr cash|wallet and be excluded from revenue. As a stopgap, exclude standalone `refType: "credit"` entries from P&L revenue.

**F-8 (MINOR–MODERATE) — Day-close expected cash is wrong whenever a refund isn't cash, and for every void.**
`DayCloseView.tsx:68-70` computes `returnsRefundCash` as the sum of **all** of today's returns' `refundAmount`, regardless of refund method; `dayCloseSummary` subtracts it from expected **cash** (`lib/ledger.ts:398-407`). A JazzCash refund never left the drawer, yet expected cash drops by its full amount (harness S7: Rs 5,000 wallet refund → expected cash understated by Rs 5,000 → a phantom "shortage" at close). Additionally, voided bills are **excluded** from `salesByMethod` (`lib/ledger.ts:375`) but their refunds are still subtracted, double-counting the void against the drawer by the void's full non-credit refund. *Minimal fix:* filter the refund total to `method === "cash"` returns, and exclude refunds belonging to voided bills (or include voided bills' payments symmetrically).

**F-9 (MINOR) — Dashboard "today profit" reprices history at today's cost.**
`profitOnDay` (`lib/selectors.ts:24-33`) computes margins from the **current** `product.costPrice`, ignoring the `unitCost` snapshot stored on each `Sale`. Buy stock dearer in the afternoon and the morning's dashboard profit falls retroactively (by Δcost × units sold) while the journal/P&L figure for the same day is unchanged — the two headline profit numbers disagree. *Minimal fix:* `const cost = s.unitCost ?? p.costPrice` (seed rows lack `unitCost`, hence the fallback).

**Inventory valuation** does not reconcile and cannot be made to from the current data: the Finance/Dashboard "stock value" is shelf × current cost (`lib/selectors.ts:52-54`), while the journal Inventory account accumulates at historical costs. The drift sources are F-4 (master-data edits, deletes, opening stock), F-11 (clamped adjustments), F-7 (goods given as standalone udhaar), and F-12 (seed opening position). Until F-4 is fixed, any journal-vs-shelf inventory comparison is meaningless; this is the single largest integrity gap in the system.

---

## Area 5 — Edge cases & rounding

- **Discount % rounding — consistent (SOUND).** The percent formula `Math.round(subtotal × pct / 100)`, capped at subtotal, is identical in the UI preview (`BillingDesk.tsx:153`) and the store (`StoreProvider.tsx:612-615`); flat discounts are capped at subtotal in both. Exact-payment bills then balance exactly.
- **F-3 (MODERATE) — Returning a discounted bill item-by-item over-refunds (rounding harvested per return).**
  `reverseBillItems` rounds the bill's discount share **per return event**: `discountShare = Math.round(discountAmount × gross ÷ subtotal)` (`StoreProvider.tsx:828-830`). Scenario (harness S3): subtotal 300, flat discount 100, customer paid 200. Returned in three separate 1-item returns → shares 33 + 33 + 33 = 99 → refunds 67 × 3 = **Rs 201 paid out against Rs 200 taken**, and `sales_discount` keeps a permanent Dr 1 residual for that bill (its P&L discount never fully reverses). Returned all at once, the share is exact (S4). Impact ≤ Rs 0.5 × (number of return events − 1) per discounted bill, always in the customer's favour; cash and discount accounts both drift. *Minimal fix:* compute the share from cumulative returned gross — `round(discount × (priorGross + gross) / subtotal) − alreadyReversedDiscount` — so the parts sum to the whole.
- **F-6 (MODERATE) — Voiding a bill whose udhaar was already repaid double-reduces receivables.**
  The void's `creditReduction` is the bill's full credit part minus prior *return* reductions (`StoreProvider.tsx:839-844`); repayments are not bill-linked and are ignored. Scenario: Rs 1,000 all-credit bill → customer repays Rs 1,000 (receivables → 0) → bill voided → another Rs 1,000 credited out of receivables → balance **−1,000**: the customer appears to hold a Rs 1,000 advance they never paid, and the shop's real obligation (refund the repaid Rs 1,000 in cash) appears nowhere. Journal and subledger agree with each other; both are economically wrong by the repaid amount. *Minimal fix:* cap the void's `creditReduction` at the bill-linked outstanding udhaar (bill credit rows − FIFO-allocated repayments); treat any already-repaid portion as a cash refund line in the void entry.
- **Part-credit bill returns — otherwise correct.** The return path eats the udhaar part first (`creditReduction = min(refundTotal, remaining credit part)`, `StoreProvider.tsx:839-844`), credits receivables for that portion and refunds only the remainder in cash/wallet — the right order, and the entry balances. Subject only to F-3's rounding.
- **Void of a paid bill with no prior returns — correct**, and correctly refused once any return exists (`voidBill`, `StoreProvider.tsx:978-988`), which is what keeps its mirror-entry exact.
- **Zero-amount lines — handled.** `makeEntry` drops zero lines; a fully-zero entry would be an empty-lines doc, but all money forms validate `amount > 0` at the UI and the store-level handlers are only reachable through them. Tolerable.
- **Negative balances — representable, ledgers agree (tolerable, one gap).** Over-repayment drives a customer's balance negative and the UI honestly labels it "advance" (`CreditLedger.tsx:341-342`); journal receivables go equally negative, so reconciliation survives. Supplier overpayment likewise drives the payable negative in both ledgers — **except** the delete guard only blocks `balance > 0` (`SuppliersManager.tsx:155-157`), so an overpaid supplier can be deleted and the advance is orphaned in the journal with no subledger row left. *Minimal fix:* block deletion whenever `balance ≠ 0` (or any purchase/payment history exists).
- **Fractional money** is carried exactly everywhere (no rounding of line totals); display formatting rounds, postings don't — except via F-2's payment tolerance.

---

## Area 6 — Seed integrity · SOUND per entry; opening position missing

Rebuilt from the real `lib/seed-data.json` through `getSeedJournal`'s own templates (harness S9):

- **Every one of the 20 seed journal entries balances** (daily sales aggregates, 1 purchase, 1 supplier payment, 2 expenses, 2 credit rows + 14 daily entries). ✔
- **Payables reconcile exactly:** journal payables = purchases 47,900 − payments 20,000 = **Rs 27,900** owed to Malik Traders, equal to the subledger. ✔
- **Receivables reconcile exactly:** journal receivables = udhaar 8,500 − repayment 3,000 = **Rs 5,500** outstanding, equal to the subledger. ✔
- Seed expense/payment/credit entries use the same templates as live posting (perpetual purchase clearing included), and seeded sales are aggregated one entry per day as documented (a presentational simplification, not an imbalance).

**F-12 (MINOR as designed, but it poisons two numbers) — No opening-balance entry.**
The seed journals purchases and sales COGS but never the shop's **opening stock or capital**. Result (harness S9d): journal Inventory balance = **−Rs 316,869** against a shelf stock value of **Rs 272,805** — the Inventory account is a large *credit* balance from day one and can never self-correct, since all future movements are relative. Journal Cash = **Rs 396,530** of accumulated fictional takings, and that figure becomes the **default opening cash** at the first day close (`DayCloseView.tsx:55-62` falls back to `cashBalance(journal)`) — on a *fresh production account*, whose "history" is this same fictional seed. Because all accounts were seeded this way, the owner's real shop inherits these positions verbatim. *Minimal fix:* add one opening entry to the seed journal (Dr Inventory at seeded shelf value / Cr Capital), state an explicit opening capital for cash instead of cumulative takings — or, at minimum, stop using the raw journal cash balance as the day-close default once any real activity exists.

---

## Consolidated flaw list (for the fix pass)

| ID | Severity | Flaw | Where |
|---|---|---|---|
| F-4 | HIGH | Product edit/delete/create move or revalue inventory with no journal entry (stockQty + costPrice in the edit payload) | `StoreProvider.tsx:503-527`, `InventoryManager.tsx:201-208` |
| F-5 | HIGH (seeded shops) | Seeded expenses unreversible: edit double-posts, delete leaves the charge | `StoreProvider.tsx:1224,1255` vs `lib/seed.ts:92-143` |
| F-2 | MODERATE | ±Rs 1 payment tolerance ⇒ unbalanced journal entries | `StoreProvider.tsx:734,780` |
| F-3 | MODERATE | Per-return discount-share rounding over-refunds up to Rs 0.5 × (returns − 1) | `StoreProvider.tsx:828-830` |
| F-6 | MODERATE | Void after udhaar repayment double-reduces receivables | `StoreProvider.tsx:839-844` |
| F-7 | MODERATE | Standalone udhaar credits sales_revenue with no sale/COGS/stock | `StoreProvider.tsx:1131-1134` |
| F-10 | MODERATE | Production reset aborts mid-wipe against append-only rules | `StoreProvider.tsx:1473-1499`, `SettingsView.tsx:226-230` |
| F-1 | MODERATE | Balance guard exists (`entryBalances`) but is never called | `lib/ledger.ts:55-75` |
| F-8 | MINOR–MOD | Day-close expected cash: wallet refunds + void refunds subtracted from cash | `DayCloseView.tsx:68-70`, `lib/ledger.ts:381-407` |
| F-11 | MINOR | Adjustment clamped on shelf, posted in full to journal | `StoreProvider.tsx:1338,1347` |
| F-9 | MINOR | Dashboard daily profit uses current cost, not sale snapshot | `lib/selectors.ts:24-33` |
| F-12 | MINOR | Seed has no opening inventory/capital entry (Inventory −316,869; Cash 396,530 fictional) | `lib/seed.ts:88-169` |
| F-13 | MINOR | Overpaid supplier deletable; advance orphaned in journal | `SuppliersManager.tsx:155-157` |
| F-14 | MINOR | Top-up migration COGS at current costs, ignoring sale snapshots | `lib/seed.ts:107` via `topUpNamespace` |

**Bottom line:** the transactional posting engine — same-batch, append-only, snapshot-based COGS, FIFO aging — is well built and its core identities reconcile exactly (seed payables/receivables to the rupee). The ledger's integrity is instead lost at its **edges**: master-data edits that bypass the journal entirely (F-4), the seeded history the reversal engine can't see (F-5), a rupee of tolerance at the bill desk (F-2), and standalone udhaar booked as revenue (F-7). Fix F-4 and F-5 first; they are the only two that corrupt numbers in ordinary daily use.


---

# Remediation (2026-10-22, same day)

All fourteen findings were fixed in the data/finance layer
(`lib/ledger.ts`, `lib/seed.ts`, `lib/selectors.ts`,
`components/StoreProvider.tsx` + three finance call sites). Verified by a
harness (`/tmp/finance-harness2.js`) that runs the **real compiled lib
modules** against the audit's scenarios: **34/34 checks PASS**;
`npx tsc --noEmit` = **0 errors**. StoreProvider posting templates that
cannot execute headless (React/Firestore) were replicated line-faithfully
from the fixed source and composed through the real `makeEntry` guard —
which now throws on any imbalance, so template drift fails loudly there
too. Per finding:

| # | Fix | Evidence |
|---|---|---|
| F-1 | `makeEntry` (the only entry constructor) now calls `entryBalances` and **throws** on imbalance; zero-only entries stay legal. | Harness: deliberate 100/99 entry throws; all seed entries (21) pass unthrown. |
| F-2 | The ±Rs 1 tolerance no longer reaches the journal unbooked: payments are journaled as paid, and the difference is an explicit **Sales discount** line inside the same entry (Dr on underpayment, Cr on overpayment). | Fractional bill 166.5 paid 167 and 1,000 paid 999 both balance exactly; underpayment books a Rs 1 discount line. |
| F-3 | `reverseBillItems` allocates discount **cumulatively** (share of gross returned so far, minus discount already reversed; the completing return absorbs the rounding residual). | Audit S3 re-run: three item-by-item returns of the 300/100/200 bill refund **exactly 200**, discount reversed exactly 100; the old formula (201) reproduced as control. |
| F-4 | The product form's stock/cost edits now route through the ledger in one batch with the product write: (a) stockQty change → adjustments-log row + entry (reason "correction", old cost); (b) costPrice change → **revaluation** entry for on-hand qty, Dr/Cr Inventory vs **Owner Capital** (choice documented in PRODUCTION.md); (c) new products with opening stock and CSV imports post Dr Inventory / Cr Capital (import: one aggregate entry); (d) delete refused when stock > 0 or any sales history exists (residual value is then zero by construction). | Audit S6 re-run: buy 10@100 → reprice 120 → sell out ⇒ journal Inventory ends at **0** (was −200). |
| F-5 | New `findUnreversedPosting(entries, refId)` — refType-agnostic, skips already-reversed postings; used by both expense edit and delete. Seed entries already carried the expense id as `refId`, so no seed change was needed. | Seeded electricity edited 8,450 → 9,000 nets to **exactly 9,000**; then deleted → **0**; seeded rent deleted → **0**. |
| F-6 | New `billCreditOutstanding(credits, bill)` (customer-grouped FIFO allocation of repayments; reversal rows net off). Void/return now reduce receivables only by the **unpaid remainder**; a void additionally refunds the repaid portion of the bill's credit in cash (Dr Revenue, Cr Cash — the customer's money). | Fully-repaid Rs 1,000 credit bill: outstanding **0**, repaidAllocated 1,000, void entry balances, receivables never go negative. Partial repayment 400 ⇒ outstanding 600. |
| F-7 | Standalone udhaar is a **cash loan**: `addCredit` and the seed both post Dr Receivables / **Cr Cash** (no revenue, COGS or stock). Goods-on-credit goes through Billing's udhaar payment part (posts sale + COGS + receivables together). UI copy (`credit.give.sub`, EN+UR) and PRODUCTION.md state the semantics. | Seed journal: the cr-1 entry credits `cash` 8,500; no `sales_revenue` line. |
| F-8 | Day-close `returnsRefundCash` counts only today's **cash-method** refunds on **non-voided** bills. | Code-level fix at the single call site (`DayCloseView`); wallet/bank refunds and void refunds no longer touch expected cash. |
| F-9 | `profitOnDay` uses `sale.unitCost ?? product.costPrice` — the snapshot basis, identical to the P&L. | Harness: sale snapped at 100 with product cost now 130 ⇒ margin uses 100; seed-shaped row without snapshot falls back to 130. |
| F-10 | Reset is demo-only twice over: Settings hides the section and confirm modal unless `mode === "demo"`, and `resetDemo` itself refuses when a cloud context exists (before touching anything). The half-wipe path is gone entirely. | Code-level; the previous cloud reset implementation was deleted, not gated. |
| F-11 | All adjustments build from `appliedAdjustmentDelta` (clamp first): the shelf write (absolute qty), the log row and the journal entry all carry the **applied** delta, via the shared `buildAdjustment`. | `(4, −10) → −4`, `(4, −3) → −3`, `(4, +7) → +7`. |
| F-12 | Seed writes a go-live true-up entry (`j-seed-opening`): Inventory is forced to the shelf value at cost, Cash to a stated opening till (**Rs 50,000**, exported as `SEED_OPENING_TILL`), Owner Capital absorbs the difference. `getSeedJournal` also asserts every entry balances. | Harness on real seed data: journal Inventory **== 272,805 (shelf)**; Cash **== 50,000**; trial balance **== 0**; payables 27,900 and receivables 5,500 unchanged. Day-close's no-prior-close default therefore reads the honest stated till. |
| F-13 | Blocked at both layers: the UI blocks deletion on any balance ≠ 0 (payable **or** advance) or any history; the store's `deleteSupplier` enforces the same guard itself. | Code-level (both layers); `supplierBalance` is the shared computation. |
| F-14 | `topUpNamespace` no longer summarises live sales into the journal at all. It writes the seeded subledgers plus ONE opening entry (`getTopUpOpeningEntry`): Dr Inventory at current shelf value, Dr Receivables / Cr Payables from the subledgers, balancing figure to Owner Capital. Cash is deliberately not opened (owner records the real till as a cash-book entry). Documented in PRODUCTION.md. | Harness on seed-shaped inputs: entry balances; Inventory 272,805; Receivables 5,500; Payables 27,900; Capital credit 250,405 = the balancing figure. |

**Residual notes (honest limits):**
- LIVE production accounts seeded before this fix keep their old
  journals (append-only by design — history cannot and should not be
  rewritten). Their Inventory/Cash balances remain misstated until the
  owner posts correcting opening adjustments; NEW accounts seed
  correctly, and pre-Complete accounts get the F-14 opening entry on
  their next sign-in. A one-time "opening balance correction" wizard
  for already-live accounts was **not** built — it needs the owner's
  physical stock/cash count and is a product decision, not a silent
  migration.
- `journalToday` / `recentForAccount` day-window displays still use
  the demo `dayOffset` convention (already flagged by the audit as a
  pre-existing display simplification, out of scope here); all
  money reports use full-history `accountBalance`.
