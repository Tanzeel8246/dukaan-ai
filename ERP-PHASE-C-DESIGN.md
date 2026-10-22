# Dukaan AI — ERP Phase C "Warehouses & Production" — DESIGN

**Status:** Design only — no app code changed by this document.
**Scope:** Phase C of `dukaan-erp-roadmap.md` (multiple warehouses with per-warehouse stock, stock transfers, manufacturing + BOM, job/work-order tracker), designed against the live Phase A foundations and the Phase B document chain. Parity target: the owner's MC Billing ERP (warehouses + stock transfer, manufacturing + BOM, job/work-order tracker).
**Sources read:** `dukaan-erp-roadmap.md` (Phase C), `ERP-PHASE-A-DESIGN.md` (§1 subledger-ref pattern, §3.2 matrix, §4 COA v2, §5 periods, §6 migration), `ERP-PHASE-B-DESIGN.md` (§2.1 derivation doctrine, §2.2 cardinal rule, §2.5 challan decision, §6 RBAC verification style), `PRODUCTION.md` (Complete + Phase A + Phase B summaries), `web/lib/types.ts`, `web/lib/coa.ts`, `web/lib/ledger.ts`, `web/lib/selectors.ts`, `web/lib/permissions.ts` (Phase C rows pre-declared), `web/components/StoreProvider.tsx` (all stock-moving paths: `postBill`, `reverseBillItems`, `recordPurchase`, purchase returns, `buildAdjustment`, product edit/delete/CSV paths, counter sale), `firebase/firestore.rules` (v5).

## Non-negotiable invariants carried over (Complete edition + Phase A + Phase B)

Every design choice below is subordinate to these — Phase C must not regress any of them:

1. **One atomic balanced journal entry per money event**, built by `makeEntry` (throws on imbalance, F-1) and written in the same `writeBatch` as its operational records, through the single choke point (`guardPostings` → `postEntry`, A5). Phase C adds **no** new posting route.
2. **The journal is append-only.** Corrections are reversing entries (`reversesId`), never edits. Rules deny journal/sales update+delete.
3. **No stored balance counters, anywhere.** Balances derive from journal lines plus proven operational subledgers. Phase C extends this in the two directions Phase B established: **fulfilment/progress quantities are derived from citing documents and event records** (§4.3, §5.2), and the one quantity Phase C *does* store per location — the stock-level row — is a **subledger detail row written in the same batch as the movement that changes it**, reconciled by an asserted identity (§1.3), exactly as A2's money-account refs are subledger detail under one GL bucket.
4. **Inventory moves only through the ledger** (F-4). Phase C's sharper form: **every quantity change at every location has its journal counterpart valued identically to today** — Phase C adds locations and a raw/finished class split to the *same* movements; it invents no unvalued stock motion. The single exception class is a movement that is value-neutral by construction (a transfer between the shop's own warehouses, §2.3), which posts nothing and is reconciled by quantity identity instead.
5. **Migrations never fabricate history** (F-12/F-14): Phase C's migration writes **no journal entries at all** (§10) — it annotates existing stock with a location, using the A2 §1.6 pattern (resolution rules carry history; nothing is re-posted).
6. **Seed identities are frozen:** the seed journal's output must remain exactly what the harness pins (Inventory == shelf 272,805 · Cash == 50,000 · payables 27,900 · receivables 5,500 · trial balance 0 · seed-journal SHA `e17e5bda…1168`, 21 entries). Every Phase C demo/seed addition is chosen to have **zero journal footprint** (§10).
7. **Tax resolves at posting time** (A4): Phase C documents (BOMs, production orders, jobs, transfers) carry no tax computation of their own (§7).

## Current state (what Phase C builds on)

| Area | Today |
|---|---|
| Stock | One number: `Product.stockQty`, one cost: `Product.costPrice` (latest purchase cost convention — `recordPurchase` re-prices the shelf to the received cost). Every stock movement (bill, counter sale, purchase, return, purchase return, adjustment, product-form edit, CSV import, product delete write-off) updates `stockQty` and posts its journal counterpart in the **same batch** — the F-4 remediation surface. |
| Inventory value | One GL account `inventory` carries all stock value at **historical snapshot costs** (each movement posts at the cost in force when it moved). The shelf report `stockValue()` = Σ `stockQty × costPrice` (latest cost) is a display figure; the two agree on the seed and diverge only by the repricing delta the latest-cost convention has always carried. |
| COA | `inventory_raw` and `wip` are declared (Phase A, §4.3) with the intended flow already sketched — issue: Dr `wip` / Cr `inventory_raw`; completion: Dr `inventory` / Cr `wip`; overhead folds through `wip`, no separate overhead code. **No posting writes either account yet; both are zero-balance everywhere.** |
| Warehouses | None. No location dimension on any document. Phase B §12 explicitly deferred it: "lines are product quantities; Phase C adds locations without changing Phase B's document shapes." |
| Documents | Bills/purchases carry no location; challans record what physically left but stock leaves at the bill (B §2.5). Fulfilment derives from child citations (`lib/documents.ts`). Series/prefix machinery (`SeriesId`, owner-doc `docSeries`) is generic — new series are additive union members. |
| RBAC | `lib/permissions.ts` **already encodes the three Phase C rows** (§6.1): `warehouses` F/F/N/R · `manufacturing` F/F/N/R · `jobTracker` F/F/R/R (owner/manager/cashier/accountant). Rules v5 has **no** matches for Phase C collections yet — the catch-all denies them. |
| Periods | `lockedThrough` + store guard on posting paths + rules backstop on dated money-bearing creates; non-posting documents ignore the lock (B §7 doctrine). |
| Subscriptions | `COLLECTION_NAMES` in `StoreProvider` drives cloud listeners + demo shape (demo storage key currently `dukaan-ai-store-v10`). Products/sales live outside `COLLECTION_NAMES` as top-level state slices backed by their own collections. |

---

## 1. Warehouses & the stock model

### 1.1 The hard question, stated plainly

`Product.stockQty` is the most-audited field in the app: a dozen write paths update it inside posting batches, the rules grant cashiers a stockQty-only carve-out on `products` so their bill batches can land, and every selector (low stock, forecast, dashboard, day-close cross-check, AI assistant) reads it. Multi-warehouse stock must be added **without forking that surface into a per-location rewrite of every posting template** — the journal templates do not change at all in this design (§1.5), because value does not care where goods sit.

Three candidate models:

| Model | Per-location truth | `Product.stockQty` becomes | Verdict |
|---|---|---|---|
| **(1) Stock-level rows authoritative; `stockQty` a same-batch mirror (RECOMMENDED)** | `stockLevels` rows `{productId, warehouseId, qty}` | Derived total, updated in the same batch as every row change (B's cached-label discipline, one level down) | **Chosen** |
| (2) Rows only; `stockQty` deleted, all readers derive Σ rows | `stockLevels` rows | Nothing — field removed | Rejected |
| (3) Location stamped on documents only; stock stays global | Movement documents | Unchanged global total | Rejected |

**Why (2) is rejected.** Deleting `stockQty` rewrites every audited write path (bill, counter, returns ×2, adjustments, product edit/delete, CSV) and every selector in one increment, and breaks the rules' stockQty carve-out that cashier bill batches depend on — maximum blast radius on the exact surface the finance audit certified, for zero accounting gain: the GL never reads `stockQty` either way.

**Why (3) is rejected.** It is Phase B §2.5's challan model generalised, and it fails the roadmap's own words ("اسٹاک گودام وار") and MC parity: with no per-location quantity, "how much is in the godown?" is unanswerable, transfers are theatre, and a stock count at one location cannot be recorded. Location stamps on documents are still added (§1.6) — as the *audit trail of movements*, not as the stock record.

**Why (1) wins.** It is the A2 money-account pattern applied to quantity: **one GL truth (value, unchanged), subledger detail underneath (location rows), a resolution rule for legacy data, and an identity the harness can assert to the unit.** Every existing write path keeps its shape — it gains one extra row update inside a batch it already builds. The mirror is not a "stored balance" in the forbidden sense: like B's cached document statuses, it is written atomically with its source and *repaired by derivation if ever found stale* (§1.7); unlike a balance, it is a quantity split whose total the journal independently corroborates through valued movements.

### 1.2 The warehouse entity

New collection `users/{uid}/warehouses/{warehouseId}`:

```ts
interface Warehouse {
  id: string;
  name: string;              // owner's words: "Main Warehouse", "Godown — Shahdara"
  note: string;              // address / keeper, free text
  /** Exactly one non-archived warehouse per shop is the default: the
   *  migration target for all pre-C stock, the resolution for every
   *  document that names no warehouse, and the desk preselection. */
  isDefault: boolean;
  archived: boolean;         // warehouses are archived, never deleted (§1.8)
  sortOrder: number;
  ts: string;
}
```

The default warehouse has the **fixed id `wh-main`** (the A2/A6 fixed-id migration discipline — idempotent creation, and pre-migration readers can resolve the constant). Its seeded name is "Main Warehouse"; the owner renames freely (names are data, never keys).

### 1.3 Stock-level rows — the location subledger

New collection `users/{uid}/stockLevels/{levelId}`:

```ts
interface StockLevel {
  id: string;                // deterministic: `${warehouseId}__${productId}`
  productId: string;
  warehouseId: string;
  qty: number;               // may go negative exactly where stockQty may (§1.5)
}
```

- The deterministic composite id makes every write an idempotent `set`/`increment` on a known doc — no query-then-create race, in cloud batches and demo state alike.
- **The mirror identity (asserted at every harness checkpoint, §9):**

```
for every product p:   Σ stockLevels[p]  +  inTransit(p)  ==  p.stockQty
```

  where `inTransit(p)` is derived from dispatched-but-unreceived transfers (§2.2). Before C2, `inTransit ≡ 0` and the identity is a pure split.
- **Resolution rule (the `legacyFor` analogue).** A product with **no rows at all** resolves as: all of `stockQty` sits in the default warehouse. This is *true* for every pre-migration shop by definition, and post-migration it can only occur transiently (a staff client reading before the owner's C1 sign-in has run the migration) — so a C1 client is correct against unmigrated data without any gating, and the migration (§10) merely makes the implicit explicit. Once **any** row exists for a product, rows are complete truth for that product (migration + the create hooks of §1.6 maintain completeness), and a missing (product, warehouse) pair reads as 0.
- Rows carry **quantity only — never cost**. Valuation is §1.4.

### 1.4 Valuation: ONE inventory GL per class; location is a subledger dimension

Phase C does **not** create per-warehouse GL accounts, per-warehouse costs, or a warehouse dimension on journal lines. Justification, in the A §1.1 form:

- **The A2 precedent is exact.** Money stayed two GL buckets with the account in the line `ref`; stock value stays in its class accounts (`inventory`, and `inventory_raw` from §4.1) with the location in operational rows. A warehouse is a *place*, not an accounting entity: the shop owns the goods identically in both buildings, and no P&L, trial balance or tax figure is warehouse-shaped.
- **One global cost per product is preserved.** `Product.costPrice` (latest-cost convention) remains the single unit cost for every valuation in the app. Per-warehouse moving-average cost was considered and rejected: it would make transfers value-bearing (goods would change value by moving buildings), force a cost onto every row and every movement document, and break the F-4 identity toolkit (every movement today values at the one shelf cost) — all to answer a question no small shop asks.
- **Per-warehouse valuation is therefore a derived report, stated honestly:** `value(wh) = Σ rows(wh) × product.costPrice` (latest cost), and `Σ_wh value(wh) == stockValue()` holds *exactly* whenever the quantity identity (§1.3) holds — that equality, not a GL tie-out, is what the phase-end audit asserts per warehouse (§9). The GL tie-out that exists today (journal `inventory` + `inventory_raw` == Σ valued movements at snapshot costs) is a **product-level** identity and remains one; §4.1 splits it by class, never by location.
- WIP is **not** warehouse stock: it has no rows, appears in no warehouse count, and lives only as GL value + production-order pools (§4.3) until completion lands finished units into a warehouse's rows.

### 1.5 How every existing stock movement gains its location

One rule covers all of it: **the applied quantity delta is computed exactly as today (against the product total, by today's code), then applied to the row of the movement's warehouse in the same batch.** Cloud batches add `batch.update(stockLevelRef, { qty: increment(delta) })` beside the existing `stockQty: increment(delta)`; demo state mirrors the same applied delta (including where today's demo path clamps a decrement — the clamp is computed once, on the total, and the row receives the clamped figure, so the identity survives both modes by construction).

| Movement | Warehouse it touches | Source of the warehouse |
|---|---|---|
| Bill (desk) | The bill's one warehouse | `Bill.warehouseId` (§1.6) |
| Counter (quick) sale | Default warehouse | Always, in v1 — the counter is a one-till surface |
| Sale return / bill void | The bill's warehouse | Goods come back to where the bill sent them from |
| Purchase receipt | The receipt's warehouse | `Purchase.warehouseId` (picker at receiving; PO receipts inherit the PO's, editable at receipt like cost) |
| Purchase return | The purchase's warehouse | Goods leave from where they were received |
| Stock adjustment | Chosen at the adjustment desk | `StockAdjustment.warehouseId` (picker; default preselected) |
| Product-form stock edit (F-4a) | Default warehouse | The form stays warehouse-naive; its delta is a default-warehouse adjustment, exactly as its journal entry is a default-shaped adjustment today |
| CSV import (create + delta) | Default warehouse | As product-form edits |
| Product delete write-off | All rows zeroed in the same batch | The existing residual-value entry is product-level and unchanged; rows are quantity-only |
| Production issue / completion | The production order's warehouse | §4.2 |
| Job material issue / return | The job's warehouse | §5.3 |
| Transfer dispatch / receive | Source / destination rows | §2 |

Documents predating Phase C carry no warehouse field; every read of one resolves through §1.3's rule to the default warehouse — which is where their stock physically is, by the migration's construction. No document is ever rewritten to add the field retroactively.

### 1.6 Billing: which warehouse a sale decrements

- `Bill` gains `warehouseId: string | null` (absent/null on pre-C bills ⇒ default). **One warehouse per bill in v1** — all lines leave one building. Split-warehouse bills (line-level locations) are deferred (§12): a two-building sale is two bills at a small shop's counter, and line-level locations would fork the bill's stock validation, the challan inheritance below, and the returns path (which restores to *the bill's* warehouse) for a case MC shops handle by splitting the bill.
- The desk gains a warehouse picker in the bill header, preselected to the default warehouse. Changing it re-validates the composed lines against that warehouse's rows and re-renders the picker's per-line availability.
- **Availability is per warehouse now.** The B §2.5 derived figure generalises: `available(wh, p) = rowQty(wh, p) − promised(wh, p)`, where `promised` counts open order/challan lines whose *effective warehouse* is `wh` — effective warehouse = the document's own `warehouseId` if set, else the default. `DeliveryChallan` and `SaleOrder` each gain an optional `warehouseId` (the order's is a *preference*, displayed and inherited; the challan's records where the goods physically left from). A bill converted from a challan inherits the challan's warehouse; from an order, the order's preference or the default; the desk may override before posting, and the posted bill's own `warehouseId` is thereafter the only one returns consult. Stock validation at posting keeps today's semantics (the `finalizeBill` precedent) against the bill warehouse's rows; the promised figure warns, never blocks, exactly as B §2.5 decided.
- Purchases mirror this: `PurchaseOrder` gains an optional `warehouseId` (expected destination), `Purchase` gains `warehouseId` (absent ⇒ default), chosen at the receiving desk.

### 1.7 The drift detector (repair without fabrication)

Because rows are a stored split, the design owes an answer to "what if they drift" (§11, R-C1). The warehouses surface computes `stockDrift(products, levels, transfers)` — every product whose rows + in-transit ≠ `stockQty` — and the owner may run **Recount locations**: a store action that rewrites the *rows only* so each drifted product's split matches its `stockQty` (excess/deficit absorbed by the default warehouse's row; in-transit quantities are documents and are never touched). This fabricates no journal history because rows are operational detail, and it is safe in the only direction drift can occur: a pre-C client could only ever have written `stockQty` (the truth it knew) without rows — never the reverse. The detector + recount ship in C1, not as a later patch.

### 1.8 Warehouse lifecycle rules

- A warehouse with any non-zero row, any in-transit line, or any document citing it may be **archived, never deleted** (the A R-3 discipline). Archiving the default is blocked until another warehouse is made default (exactly one default at all times — the store enforces on every write, as A2 enforces one default account per method).
- Making a different warehouse default changes future preselections and legacy resolution only; it moves no stock and posts nothing.

---

## 2. Stock transfers

### 2.1 Model

New collection `users/{uid}/stockTransfers/{transferId}`. A transfer is a **movement document** — Phase B's non-posting doctrine with one physical twist: unlike a challan, it really does move shelf quantities between locations, while moving **no value** (§2.3).

```ts
type StockTransferStatus = "draft" | "dispatched" | "partially_received"
                         | "received" | "returned" | "cancelled";
interface StockTransferLine {
  productId: string;
  name: string;              // snapshot, as everywhere
  qtySent: number;
  qtyReceived: number;       // written by receive actions; derivation input, §2.2
}
interface StockTransfer {
  id: string;
  number: string | null;     // "TR-4" once dispatched (§6.3 series); null in draft
  fromWarehouseId: string;
  toWarehouseId: string;     // ≠ fromWarehouseId (store refuses same-house)
  lines: StockTransferLine[];
  note: string;
  status: StockTransferStatus;   // cached label over §2.2 derivation
  dayOffset: number; ts: string;
}
```

Drafts are freely editable/deletable and move nothing. **Dispatch** is the act that moves stock: source rows decrease by `qtySent` in the dispatch batch (the product total does **not** change — the goods are still the shop's, on the road). **Receive** actions (one or many) write destination rows and the lines' `qtyReceived`. **Return-to-source** closes a dispatched transfer by receiving everything back into the source warehouse (status `returned`).

### 2.2 In-transit: a derived quantity, not a place

**Decision: two-step transfers (dispatch → receive) with in-transit as a derived figure — no in-transit warehouse, no in-transit GL, no third stock location.** The candidates:

- *Instant transfer* (one action: out of A, into B, same batch) is simpler and was seriously considered — most of the owner's transfers will be "shop ↔ godown". It is rejected because it cannot represent the two facts that make transfer documents worth having in MC parity: goods genuinely on the road (neither building can sell them) and **short receipt** (10 sent, 9 arrived) — an instant model must either forbid the discrepancy or silently absorb it, and silent absorption of a missing unit is exactly the unvalued stock motion invariant 4 forbids.
- *In-transit as a pseudo-warehouse row set* would keep §1.3's identity trivially (rows sum to total) but invents a fake building that appears in pickers, counts and prints, and must be hidden everywhere by special cases. The derived figure states the same truth in one selector: `inTransit(p) = Σ over dispatched/partially-received transfers of (qtySent − qtyReceived)` per line product (and per source/destination pair for display). In-transit goods are **not available for sale anywhere**; the source warehouse's availability already excludes them (its row dropped at dispatch), and forecast/low-stock keep reading the product total — goods on the road *are* coming, so counting them toward reorder cover is correct.

Fulfilment derivation follows B §2.1: a transfer's received quantities live on its lines (they are the transfer's own event record, written only by receive actions), its status is a cached label recomputed in the receive batch, and the derivation — never the label — gates what may still be received.

### 2.3 Value & the journal: nothing moves — except a proven loss

Dispatch and full receipt post **no journal entry**: the GL holds the same goods at the same snapshot values in a different building, and §1.4 made location invisible to the GL. The product total is unchanged; only rows move. This is the roadmap's own specification ("جرنل غیر جانبدار، مقام وار تبدیلی") and the one place Phase C relaxes invariant 4's letter — by its stated exception: the movement is value-neutral *by construction*, and the quantity identity (§1.3) is its reconciliation, asserted wherever a posting would otherwise be the proof.

**Short receipt is NOT value-neutral, and it posts.** When a receive closes a line short — or the owner closes a dispatched transfer accepting a shortage — the missing units are a stock loss at the product's current shelf cost, posted through the adjustment template's shape in the same batch as the receive:

```
refType: "transfer_loss", refId: transferId
Dr  inventory_loss        shortQty × costPrice
    Cr  inventory | inventory_raw   (the product's class account, §4.1)   shortQty × costPrice
```

and the product total drops by `shortQty` (destination row rises by `qtyReceived` only), restoring §1.3's identity with the loss inside the ledger — F-4's rule ("every stock/cost change posts") honoured at the exact point value actually leaves the business. A full receipt posts nothing and changes no total. Damage found *after* a full receipt is an ordinary adjustment at the destination warehouse (§1.5), not a transfer event.

### 2.4 Partial receive & closing

- Receives may be partial any number of times; each validates `qtyReceived cumulative ≤ qtySent` per line and refuses over-receipt **before composing any write** (B's pre-composition refusal discipline).
- A partially received transfer may be **closed short** (owner/manager action, confirm shows the shortage per line): the unreceived remainder posts as §2.3's loss and the status becomes `received` with the shortage recorded on the lines (`qtyReceived < qtySent` is itself the permanent record).
- A dispatched transfer may not be edited or cancelled (the goods are out); its exits are receive, close-short, or return-to-source. A draft may be cancelled/deleted freely.

### 2.5 Period-lock interplay

Dispatch/receive/return are **updates to a non-posting document plus row writes** — by the standing doctrine (A §5 / B §7: locks gate postings; updates are never period-gated) they are not refused inside a locked period, because the stock they move was valued when it entered the business, in an open period, and no dated money fact is asserted. The **one** posting a transfer can produce — the short-receipt loss — is a journal create, passes `guardPostings` and the rules backstop like every entry, and is dated **today** (the day the shortage is established), never the dispatch date. If today were somehow locked (A5's rail says a close may not cover today/yesterday), the loss posting refuses and the close-short action refuses with it — the transfer simply stays open.

---

## 3. BOM — recipes

### 3.1 Model

New collection `users/{uid}/boms/{bomId}`:

```ts
interface BomLine {
  productId: string;         // a component: raw-class OR goods-class (§4.1)
  name: string;              // snapshot
  qty: number;               // consumed per batch of `outputQty`
}
interface Bom {
  id: string;
  outputProductId: string;   // the finished product (never raw-class, §4.2)
  outputName: string;        // snapshot
  /** Batch size: one run of this recipe yields `outputQty` finished
   *  units and consumes the lines' quantities (× run size / outputQty
   *  at issue, §4.2). Default 1. */
  outputQty: number;
  version: number;           // 1, 2, 3… per output product (§3.2)
  lines: BomLine[];
  /** Declared per-batch conversion costs, folded through WIP at
   *  issue (§4.2): the recipe's standard labour and overhead per
   *  batch. These are COST INPUTS the owner sets — defaults the
   *  issue desk scales by run size and may override per run. */
  labourCost: number;
  overheadCost: number;
  active: boolean;           // exactly one active BOM per output product
  note: string;
  ts: string;
}
```

A BOM is a **recipe document**: it posts nothing, holds no stock, and is freely editable *as a new version* (§3.2). It carries no tax fields (components were taxed, if at all, when purchased — A4 already booked that `tax_input`; the finished good is taxed, if at all, when sold — §7).

### 3.2 Versioning: an edit is a new version, never a rewrite

**Decision: BOMs are immutable once created; editing a recipe creates version n+1 and deactivates version n.** The previous version stays readable forever. Justification is the snapshot discipline the whole app runs on (BillItem snapshots prices, A4 snapshots slabs): a production order must be able to prove, a year later, exactly which recipe its costs came from. A mutable recipe would make every historical unit cost unreproducible — the manufacturing analogue of editing a posted bill. The cost of versioning is one `version` integer and a "copy as new version" action; the order's snapshot (§4.1) does the rest.

### 3.3 Component eligibility

Any product may be a component — raw-class materials (§4.1) are the normal case, but a goods-class product used as a component (bottles bought for resale, also used to pack a house blend) is legitimate and must work: at issue, value leaves **the account that holds the component** (§4.2's template splits by class). A product may not list itself as a component, directly or through a chain of finished goods — but note Phase C BOMs are **single-level**: a component that is itself a manufactured product is consumed at its shelf cost like any goods product (its own BOM is not exploded). Multi-level BOM explosion is out of scope (§12) — MC-parity for a small shop is single-level recipes with sub-assemblies handled as their own production orders whose output becomes a component.

---

## 4. Manufacturing — classification, production orders, WIP

### 4.1 The class split: `inventory` vs `inventory_raw`

Phase A pre-declared `inventory_raw` for exactly this phase, with the flow "Dr `wip` / Cr `inventory_raw` at issue". For that flow to reconcile, the value of raw materials must actually *sit* in `inventory_raw` — today every purchase lands in `inventory`. Phase C therefore introduces the product class:

```ts
/** On Product. Absent ⇒ "goods" (every pre-C product, unchanged).
 *  "raw" = held for consumption by production; its stock value sits
 *  in `inventory_raw`. "goods" = resale goods AND finished products;
 *  value sits in `inventory`. */
stockClass?: "raw";
```

and one generalisation applied to **every existing template that touches a stock-value account**: the account is `inventoryAccountFor(product)` = `inventory_raw` if raw, else `inventory`. The affected paths are enumerable and closed: purchase receipt (the inventory leg follows each line's product class — a mixed purchase splits the leg per class, the `purchases` clearing lines unchanged), bill COGS credit (splits per class across the bill's lines), counter sale, sale return / void (mirror), purchase return credit, adjustments (`buildAdjustment`'s inventory line), product-form edit and delete write-off, CSV import entries, transfer loss (§2.3), production issue/completion (§4.2), job materials (§5.3). With **no raw products in a shop, every one of these templates is byte-identical to today** — that is C3's regression gate (§9), the same no-tax-path discipline A4 shipped under.

The frozen identity splits into two assertable identities of the same kind:

```
GL inventory       == Σ valued movements of goods-class products (snapshot costs)
GL inventory_raw   == Σ valued movements of raw-class products   (snapshot costs)
```
and on the seed (no raw products) the second is 0 and the first is the pinned 272,805.

**Changing a product's class** is a product-form action (inventoryManage roles). With zero stock it is a flag flip. With stock on hand it moves value between the class accounts in **one documented reclass entry** — the A §1.6 true-up form ("if a future increment ever needs to move a balance between accounts, it must use the established true-up form: one documented entry, figures from the journal itself, memo stating it is a reclass"):

```
refType: "reclass", refId: productId     — amount = stockQty × costPrice (the shelf-value
Dr  inventory_raw        X                  convention every F-4 path already values at)
    Cr  inventory            X
```
(mirrored for raw → goods). The class flag and the entry land in the same batch; the product's warehouse rows do not move (the goods did not change buildings — only their accounting class).

Raw-class products remain **sellable** at the desks (a shop may sell surplus flour): their sale posts COGS against `inventory_raw` by the same class rule, so the identities hold without a special case. The billing picker marks raw products (a badge, §8) but does not hide them.

### 4.2 Production orders

New collection `users/{uid}/productionOrders/{orderId}`:

```ts
type ProductionStatus = "draft" | "open" | "completed" | "cancelled";
interface ProductionEvent {
  kind: "issue" | "completion" | "scrap" | "closeout";
  /** issue: components consumed (valued at issue). completion: finished
   *  units produced. scrap: output units spoiled. closeout: system event
   *  written by Close Order carrying the residual pool to loss. */
  qty: number;                       // finished-unit terms for completion/scrap; 0 for issue/closeout
  lines?: Array<{ productId: string; name: string; qty: number;
                  unitCost: number; value: number }>;  // issue only: the components
  labourCost?: number;               // issue only: this run's declared labour
  overheadCost?: number;             // issue only: this run's declared overhead
  paidFromAccountId?: string | null; // issue only: money account labour/overhead were paid from, or "accrue" (§4.4)
  value: number;                     // the journal value this event moved
  entryId: string;                   // the ONE journal entry that posted it
  dayOffset: number; ts: string;
}
interface ProductionOrder {
  id: string;
  number: string | null;     // "PR-3" once opened (drafts burn no numbers, §6.3)
  bomId: string;             // the recipe version consumed (immutable record)
  bomVersion: number;
  /** Full recipe snapshot at order creation: lines, batch size,
   *  standard labour/overhead — later BOM versions never rewrite an
   *  open order's economics (§3.2). */
  bomSnapshot: { outputQty: number; lines: BomLine[];
                 labourCost: number; overheadCost: number };
  outputProductId: string; outputName: string;   // snapshot
  warehouseId: string;       // materials drawn from AND finished land in (§4.5)
  plannedQty: number;        // finished units the order intends to produce
  events: ProductionEvent[]; // the order's own event log — its subledger
  note: string;
  status: ProductionStatus;  // cached label over the derived produced qty
  dayOffset: number; ts: string;
}
```

**Events are the subledger; progress is derived.** `producedQty(order) = Σ completion qty`; `pool(order) = Σ issue values − Σ completion values − Σ scrap values − Σ closeout values`. Events are append-only (written only inside their posting batch; a mistaken event is corrected by a reversing event of the opposite kind citing it, never edited — the journal discipline applied to the order's diary, mirroring how B treats the cheque registry with `entryIds` cross-citing the journal). The order's status is a cached label recomputed in each event's batch.

**Issue** (materials for a run). The desk enters a run size N (finished units intended from this issue); component quantities default to `bomLine.qty × N / bomSnapshot.outputQty` and are **editable** — over-issue is where real overconsumption lives, and refusing it would force fake precision. Each component validates against the order warehouse's row. Valuation: components at their **current shelf `costPrice`** (the convention adjustments and COGS already use), labour/overhead default to the snapshot's per-batch figures scaled by N/outputQty, editable, zero allowed (owner's own labour). One entry per issue:

```
refType: "production_issue", refId: orderId
Dr  wip            (ref: orderId)                          M + L + H
    Cr  inventory_raw | inventory (per component class, ref: componentProductId)   M  (one line per component)
    Cr  cash|wallet   (ref: paidFromAccountId)                L + H   (only if L+H > 0 and paid, §4.4)
    Cr  salary_payable                                        L + H   (only if accrued, §4.4)
```
ΣDr = M + L + H = ΣCr ✓ — `makeEntry` enforces. Stock rows of the components drop in the same batch; product totals drop identically; WIP rises by the run's full cost.

**Completion** (finished units land). The desk enters finished qty F. The completion's value V is computed by **cumulative average absorption with final-absorb** — the F-3 discipline applied to a cost pool:

```
denominator D = max(plannedQty − producedBefore, F)
V = round2(poolBefore × F / D)                        — ordinary completion
V = poolBefore                                        — FINAL completion (below)
```
A completion is **final** when `producedBefore + F ≥ plannedQty`, or the desk ticks "close after this completion". The final completion takes the **entire remaining pool**, so Σ completions + Σ scraps + Σ closeouts == Σ issues **to the paisa** for every order, always — no rounding residue can strand in WIP. Over-production (F beyond plan) is simply a final completion by the first clause: the whole pool spreads over all units produced, which is the truth (the materials were consumed by those units). A completion with `poolBefore == 0` and F > 0 is **refused pre-composition** (there is nothing to absorb — the units' materials were never issued; issue first). Entry:

```
refType: "production_complete", refId: orderId
Dr  inventory   (ref: orderId)        V
    Cr  wip       (ref: orderId)          V
```
The finished units land in the order warehouse's row (+F) and the product total (+F) in the same batch, and the output product's `costPrice` becomes `round2(V / F)` — the latest-cost convention `recordPurchase` already applies to receipts (a completion *is* a receipt of made goods). Pre-existing finished stock of the same product reprices in the shelf report exactly as it does on any purchase receipt — a pre-existing behaviour class, not a new one (§9 states the audit form).

**Scrap** (spoiled output / ruined batch, mid-order). Recorded in output units S, valued by the same absorption rule against the pool (`round2(pool × S / max(plannedQty − producedBefore, S))`, never exceeding the pool):

```
refType: "production_scrap", refId: orderId
Dr  inventory_loss        V
    Cr  wip       (ref: orderId)   V
```
No stock rows move (spoiled units were never finished stock). **Yield loss needs no event at all**: if a run simply yields fewer finished units, the desk completes fewer — the same pool absorbs into fewer units and the unit cost rises, truthfully. Scrap events exist for goods that *were* produced and then spoiled, and for a ruined in-progress batch whose cost must leave WIP without becoming product.

**Close order.** An open order with `pool > 0` that will produce no more is closed: a `closeout` event posts the entire residual pool to loss (`Dr inventory_loss / Cr wip`, refType `production_scrap`, refId = orderId) in the close batch, and the status becomes `completed` (if anything was produced) or `cancelled` (if nothing was, and no events exist, a plain cancel with no posting). An order whose pool reaches exactly 0 with `producedQty ≥ plannedQty` completes automatically at its final completion. A draft order (no events) is freely editable/deletable; an opened order's planned qty and recipe snapshot are never edited — plan changes are a new order (the issued-document immutability of B §1.4, applied to the factory floor).

### 4.3 WIP identities (asserted at every checkpoint, §9)

```
GL wip balance == Σ pool(order) over all production orders        (to the paisa)
pool(order) ≥ 0 for every order, at every step                     (never negative:
        issue is the only pool source; completion/scrap/closeout values
        are computed FROM the pool and capped by it pre-composition)
GL inventory_raw == Σ raw-class valued movements                   (§4.1)
a completed order's pool == 0 exactly, and its finished units'
        absorbed value == Σ its issue values − Σ its scrap/closeout values
```

### 4.4 Labour & overhead: paid at issue, or accrued — decided

A §4.3 recorded that "manufacturing overhead folds through `wip` in Phase C's design". The open half is the credit side. **Decision: at each issue, the desk declares the run's labour + overhead ONCE, with one settlement choice for the pair — `paidFromAccountId` (a money account; the daily-wage reality of the target shops) or `accrue` (credit `salary_payable`).** `salary_payable` was pre-declared in Phase A for Phase D payroll; using it here as the accrual parking account creates no Phase D conflict — D's payroll will debit it when accrued wages are actually paid, and until then an accrued balance sitting in it is simply true (the shop owes the labour). Crediting an *expense* account at issue was rejected (labour is being capitalised into stock, not expensed — expensing it would double-count when the finished goods later sell through COGS), and crediting `capital` for the owner's own unpaid labour was rejected as fiction (declare 0 instead — §4.2). The default when the desk doesn't choose is the money-account form (Open Question Q3 asks the owner to confirm this default).

### 4.5 One warehouse per order

A production order draws materials from, and delivers finished goods into, **one** warehouse. A shop that stores raw material in the godown and produces at the shop first transfers the materials (§2) — that is what transfers are for, and it keeps every event's row updates single-location. Cross-warehouse production (issue from A, deliver to B) is deferred (§12).

---

## 5. Job / work-order tracker

### 5.1 Model

New collection `users/{uid}/jobs/{jobId}` — the service/printing-business counterpart to production orders (the owner's own MC business is printing: a job is a customer's work order — banner, cards, binding — tracked from receipt to delivery):

```ts
type JobStatus = "open" | "in_progress" | "ready" | "delivered" | "cancelled";
interface JobMaterialEvent {
  kind: "issue" | "return";
  productId: string; name: string;   // snapshots
  qty: number;
  unitCost: number;          // shelf cost snapshot at the event
  value: number;             // qty × unitCost — the journal value moved
  entryId: string;           // the ONE entry that posted it
  dayOffset: number; ts: string;
}
interface Job {
  id: string;
  number: string;            // "JB-7" — minted at creation (a job is born
                             // numbered: the customer walks away with the
                             // number on a slip; there is no draft state)
  customerId: string | null; customerName: string; customerPhone: string;
  title: string;             // the work, in the owner's words ("Wedding cards × 500")
  description: string;
  /** Stage names come from settings `jobStages` (§5.2); the job stores
   *  the current stage NAME. status below is the lifecycle; stage is
   *  the workshop's progress within it. */
  stage: string;
  status: JobStatus;
  dueDateISO: string | null; // promised delivery date
  warehouseId: string;       // materials are issued from here (§5.3)
  materialEvents: JobMaterialEvent[];   // append-only subledger, as §4.2
  /** Declared labour for this job (owner-typed figure for the profit
   *  report). NON-posting by design (§5.3): the money itself moves
   *  through Expenses / Phase D payroll as it always has. */
  labourCost: number;
  note: string;
  dayOffset: number; ts: string;
}
```

### 5.2 Stages

Settings gain `jobStages?: string[]` (owner-edited; absent ⇒ the default list `["Received", "In Progress", "Ready", "Delivered"]` — stage names are shop data, like warehouse names, never dictionary strings). Advancing a job sets `stage` (and maps the terminal names onto `status` in the store action: the last stage ⇒ `ready`, delivery is an explicit action ⇒ `delivered`). Stage edits are status writes — non-posting, never period-gated. If the owner renames stages in settings, existing jobs keep the name they carry (snapshot discipline); the stage picker offers the current list plus the job's own current stage.

### 5.3 Money & materials: no new money paths

- **Advances ride the existing repayment machinery — deliberately.** A customer's advance for a job is money in against future billing, which the app already models exactly: a `credits` repayment row makes `customerOutstanding` go negative, and Phase A §4.4 ratified negative receivables = customer advance as the standing convention. The job surface's "Record advance" action therefore calls the **existing** `addRepayment` (customer, amount, method, money account — cheque advances work too, via B5's instrument stamp) with the note prefilled `Advance — Job JB-7`. No job field stores money; no new refType exists; when the job's bill later posts on credit, F-6's lot machinery absorbs the advance automatically because it is the same customer pool. (The alternative — job-earmarked advances quarantined from the pool — is Open Question Q2; the pooled form is the recommendation and the design.)
- **Materials consumed by a job DO post** — stock physically leaves, and invariant 4 has no exception for services. An issue event values the lines at shelf cost and posts, in the job's batch:

```
refType: "job_material", refId: jobId
Dr  cogs         (ref: jobId)                       V
    Cr  inventory | inventory_raw (per class, ref: productId)   V   (one line per product)
```
  COGS is the honest home: the material is consumed cost of work sold, not WIP (no stock asset results — the output is a service/deliverable, and capitalising it into `wip` would strand value in an asset account with no completion event to release it; a job that *manufactures stock* is a production order, §4). Unused materials return through a `return` event — the mirror entry (`refType: "job_material_return"`, Dr class account / Cr `cogs` ref jobId) restoring the job warehouse's rows. The bill that charges the customer for the job is an ordinary bill (§5.4): its own lines' COGS is separate, and materials issued to the job are **never re-billed as lines** (they already left the shelf) — a desk discipline stated here exactly as B stated its own (G-2/R-B4 pattern).
- **Labour is a declared figure, not a posting** (§5.1): the wages themselves are already money events in Expenses (or Phase D payroll); posting them again through the job would double-count the cash. The job's `labourCost` exists so the profit derivation (§5.5) can be honest.

### 5.4 Job → bill: the conversion seam

A job is billed through the B §2 machinery, unchanged in shape: `Bill.sourceType` gains `"job"` (additive union member) and the "Bill this job" action opens the ordinary billing desk prefilled with the job's customer and citing the job (`sourceType: "job"`, `sourceId`). The desk composes charge lines freely (the deliverable/service lines — typically a service product or the finished item at the agreed price), and `postBill` posts the one entry, as always. The job's status advances to `delivered` in the same batch when the desk confirms delivery-with-bill (or via the standalone Deliver action for jobs settled without a system bill — the citation then simply never exists and §5.5's revenue for the job is 0, which is the truth the records hold). Fulfilment is *derived*: `billedQty`-style derivation is not needed for jobs (a job is billed whole, not by lines), but job revenue is — `Σ totals of posted bills citing the job` — never a stored figure.

### 5.5 Job profit — derived, defined once

```
jobRevenue(job)   = Σ Bill.total over posted bills with sourceType "job", sourceId == job.id
jobMaterials(job) = Σ issue values − Σ return values over job.materialEvents
jobProfit(job)    = jobRevenue − jobMaterials − job.labourCost
                    − Σ COGS of the citing bills' own lines (their unitCost snapshots × qty,
                      excluding any line whose product was material-issued to this job —
                      the §5.3 discipline makes that set empty in correct use, and the
                      selector does not attempt to police it beyond this definition)
```
This is a **report**, computed by a selector from records that all exist; it writes nothing. Tax inside citing bills' totals follows the bill's own A4 treatment (totals are gross of exclusive tax) — stated so nobody "fixes" it later: job profit is a management figure in the same gross terms the desk quoted the customer, with materials and labour at cost.

---

## 6. RBAC & rules

### 6.1 Verification against the pre-declared matrix

The three Phase C rows in `lib/permissions.ts` (written in A3 from Phase A design §3.2) were re-read against this design's surfaces:

| Matrix row | O / M / C / A | Phase C surfaces it governs | Verdict |
|---|---|---|---|
| `warehouses` | F / F / N / R | Warehouse CRUD/archive, stock-level views, transfers (create/dispatch/receive/close) | ✓ with G-C1, G-C2 |
| `manufacturing` | F / F / N / R | BOM versions, production orders + issue/completion/scrap/close events | ✓ sufficient |
| `jobTracker` | F / F / R / R | Job cards, stages, material events, advance + bill actions | ✓ with G-C3 |

**Gaps & resolutions (flagged, none blocking):**

- **G-C1 — the billing desk's warehouse picker is wider than the `warehouses` row, by necessity (client-level).** A cashier (warehouses row: none) must pick the bill's warehouse and see per-warehouse availability — that is the *billing* surface (cashier: full), not warehouse management. Resolution, following B's G-4 precedent: the picker and availability figures ride the billing/purchase surfaces' own gates; the `warehouses` row gates the management surface (CRUD, transfers, recount). Warehouse **names** are readable by all roles in rules (§6.2) because every desk resolves them. The row's cashier "none" therefore means "no warehouse administration", stated here so the C1 UI does not hide the picker from cashiers by mistake.
- **G-C2 — stock-level row writes are wider than the `warehouses` row, by necessity (rules-level).** A cashier's bill batch writes `stockLevels` (their warehouse's rows drop) — rules cannot decompose a batch, the exact situation of B's G-3 cheque create. Resolution, same precedent: rules allow `stockLevels` create/update to `canAccess` (all roles), with the restriction living in the client + the store's own composition (a role can only move rows through an action its matrix rows permit). The widening must be called out in the C1 rollout note and in a rules comment, per the R-B6 discipline, so it is not later "tightened" into breaking every cashier bill.
- **G-C3 — job actions split across rows, like B's G-4.** The job surface is gated by `jobTracker` (cashier/accountant read), but its embedded actions keep their own rows: "Record advance" requires `creditRepayment` write (cashier ✓, accountant ✓ — both may take an advance on a job they can only read, which is correct counter behaviour), material issue/return requires `jobTracker` write (owner/manager — the accountant's read-only job view therefore shows material history but cannot issue), and "Bill this job" requires `billing` write. The job surface composes these gates per action; no row changes.
- **G-C4 — stage advancement by cashiers.** The matrix gives cashier *read* on `jobTracker`, so under the pre-declared matrix a cashier cannot advance a job's stage — in a printing shop the counter staff are exactly who move jobs along. Resolution per precedent: **the matrix stands** (it is the owner's approved A3 encoding; Phase C does not silently widen it). The friction is real but one cell wide — if the owner wants it changed, `jobTracker.cashier: "read" → "full"` is a one-line matrix + rules change that C5's rollout note will explicitly offer. (Not counted among §12's open questions: the default is safe and reversible.)

### 6.2 Rules additions (additive, v5 style — drafted here, not yet applied)

Same posture as B §6.2: reads `canAccess` unless the matrix narrows them; updates/deletes never period-gated; the A5 create-guard applies only where a create posts money.

```
match /warehouses/{id}        read: canAccess · write: hasRole(owner, manager)
match /stockLevels/{id}       read: canAccess
                              create, update: canAccess            (G-C2)
                              delete: isOwner   (store zeroes rows on product
                                                 delete; it never deletes them)
match /stockTransfers/{id}    read: canAccess · write: hasRole(owner, manager)
   — no period guard: dispatch/receive post nothing; the short-receipt loss is a
     JOURNAL create and is guarded there (§2.5).
match /boms/{id}              read: canAccess · write: hasRole(owner, manager)
match /productionOrders/{id}  read: canAccess · write: hasRole(owner, manager)
   — events append via update (rules cannot validate array appends; posture is
     the role gate + store discipline, the same honesty class as bills'
     returnedQty). The events' journal entries are guarded creates as always.
match /jobs/{id}              read: canAccess · write: hasRole(owner, manager)
```

Existing collections need **no** rules changes: the new optional fields (`warehouseId`, `stockClass`, `sourceType: "job"`, event arrays) ride inside documents the rules already govern; journal create stays as it is — production/transfer-loss/job/reclass entries flow through it unchanged. The `products` stockQty carve-out is untouched (Phase C writes `stockQty` exactly as Phase B did; the rows live in their own collection under G-C2). **Rollout order is the standing one (R-1 discipline): the rules additions publish BEFORE the Phase C build that first writes each collection** — per increment (§9).

### 6.3 Numbering — three new series

| Series | Prefix (default) | Document | Minted |
|---|---|---|---|
| `stockTransfer` | `TR-` | `stockTransfers` | At dispatch (drafts burn no numbers, B §1.3) |
| `productionOrder` | `PR-` | `productionOrders` | At open (first issue or explicit open action) |
| `job` | `JB-` | `jobs` | At creation (a job is born numbered, §5.1) |

All three are additive `SeriesId` union members; prefixes override through the existing owner-doc `docSeries` mechanism; sequence = max+1 over the subscribed collection, client-side, at mint time — the B §1.3 pattern with its stated concurrency exposure, unchanged.

### 6.4 New journal refTypes (additive union members)

`"reclass"` (§4.1) · `"transfer_loss"` (§2.3) · `"production_issue"`, `"production_complete"`, `"production_scrap"` (§4.2 — closeout residuals also post as `production_scrap`) · `"job_material"`, `"job_material_return"` (§5.3). No existing refType changes meaning; capture-style reuse of host refTypes is not needed in Phase C (every Phase C posting is its own event).

---

## 7. Period-lock & tax interplay

- **Postings obey the lock through the existing machinery, and only postings exist to refuse.** Production issue/completion/scrap/closeout, job material events, transfer losses and class reclasses all compose entries at today's date and pass `guardPostings`; a document dated in a closed period is corrected by an opposite event today (a return-to-shelf, a reversing completion), never by editing history — the A5/B7 doctrine verbatim.
- **Non-posting documents ignore the lock entirely**: warehouses, BOM versions, transfer documents (except their loss), job cards and stages assert nothing financial and may be created/advanced inside a locked period. A transfer *dispatched* before a lock may be *received* after it — only the shortage, if any, posts, at today's date (§2.5).
- **Tax**: raw-material purchases resolve input tax through the A4 purchase engine exactly as goods purchases do (the class split changes the inventory leg's account, never the tax legs — §4.1's template note). Consumption (production issue, job materials) is not a taxable event and posts no tax lines. Finished goods are taxed when **sold**, by the ordinary bill engine resolving slabs at posting time. A production order's absorbed unit cost is a **cost** figure; it never includes recoverable input tax (purchases book stock net of tax, A4 §2.4) — so WIP pools are tax-clean by construction.

---

## 8. i18n — new dictionary-key categories (enumerated, not written)

All Phase C UI strings go through the typed dictionaries (EN/UR parity compile-enforced); journal memos remain data-layer English per the standing residual. **No new `fin.acct.*` labels are expected** — `inventory_raw` and `wip` were labelled in Phase A §8 (implementation verifies; a missing label is a C3 bug, not a design change). Estimated ≈ 170–200 new keys across:

- **Navigation:** warehouses, stock transfers, manufacturing (BOM + production), job tracker entries (+ any production group label).
- **Warehouses:** list/CRUD (name, note, default badge, make-default, archive + blocked-archive reasons), per-warehouse stock view (on-hand / promised / available / incoming columns), drift warning + recount action and result, warehouse picker labels shared by all desks ("Warehouse", default marker, availability hint).
- **Transfers:** titles, from/to pickers, dispatch/receive/return/close-short actions + confirmations (shortage list), status words (draft / dispatched / partially received / received / returned / cancelled), in-transit labels, transfer print labels, over-receipt + same-warehouse errors.
- **Products (additions):** raw-material flag + badge, class-change confirm (with the reclass explanation), production output eligibility note.
- **BOM:** recipe titles, batch-size + per-batch labour/overhead fields, version labels (current / superseded / copy-as-new-version), component picker labels, self-component error.
- **Production:** order titles, run-size + issue form (component quantities, labour/overhead, paid-from / accrue choice), completion form (final-completion toggle, derived unit-cost display), scrap + close-order actions and residual-loss confirmations, pool/produced/remaining figures, status words, refusal errors (nothing to absorb, insufficient component stock at the order's warehouse).
- **Jobs:** card fields (title, stage, due date), stage advancement, material issue/return forms, advance action (riding the repayment surface's strings where shared), bill-this-job action, profit figures (revenue / materials / labour / profit), overdue-due-date badge, status words.
- **Errors & notices:** the A5 period-locked string is reused wherever `guardPostings` fires; conversion/validation refusals enumerated per surface above.

---

## 9. Implementation order — increments C1…C5

Each increment: independently shippable (distinct zip, PRODUCTION.md update, rules published first where it adds a collection), closing with its finance-audit checkpoint. The seed identities (invariant 6) and **all prior suites** are re-verified at EVERY checkpoint — the harness baseline entering Phase C is 576/576.

### C1 — Warehouses & stock rows (the location subledger)
- Types (§1.2/§1.3), `warehouses` + `stockLevels` collections (subscriptions + demo shape; demo storage v10 → v11), migration step `stockV1` (§10), default-warehouse resolution (§1.3), row writes added to **every** §1.5 movement path, desk pickers (bill, purchase receipt, adjustment) + `warehouseId` stamps on Bill/Purchase/StockAdjustment (+ optional stamps on SaleOrder/DeliveryChallan/PurchaseOrder), counter sales → default warehouse, warehouses management surface + per-warehouse stock view + drift detector/recount (§1.7).
- **Rules:** `warehouses` + `stockLevels` matches (with the G-C2 comment), published first.
- **Audit checkpoint:** migration scenario — a pre-C shop shape migrates with journal byte-identical, every product's rows summing exactly to its `stockQty`, totals and GL identities unchanged; thereafter EVERY existing harness scenario re-run with warehouse stamping asserts rows + in-transit == `stockQty` per product at each step; a bill from the godown decrements only the godown's rows (journal entry byte-identical to the same bill pre-C); availability/promised figures per warehouse reproduce B2's global figures when summed; seed identities + SHA intact.

### C2 — Stock transfers
- `stockTransfers` collection + `TR-` series, draft/dispatch/receive (partial)/close-short/return-to-source flows, in-transit derivation + incoming display at desks, transfer print, §2.3 loss posting.
- **Rules:** `stockTransfers` match, published first. Demo storage v11 → v12.
- **Audit checkpoint:** dispatch moves rows and nothing else (journal byte-identical, product totals unchanged, source availability drops, in-transit figure exact); full receipt lands rows with zero journal writes across the whole transfer; partial receives sum exactly; close-short posts exactly `short × costPrice` to `inventory_loss` against the correct class account and restores §1.3's identity; over-receipt and same-warehouse transfers refused pre-composition; a dispatched transfer survives a period lock with only its loss gated (§2.5 scenario).

### C3 — Product class & BOM
- `Product.stockClass` + the `inventoryAccountFor` generalisation across the closed path list (§4.1), class-change reclass entry, raw badge in pickers; `boms` collection + versioning UI (§3), single-level recipes.
- **Rules:** `boms` match, published first. Demo storage v12 → v13.
- **Audit checkpoint (the no-raw regression gate):** with no raw products, the full prior harness passes with journal output **byte-identical** (templates untouched in effect); then: a raw purchase posts its inventory leg to `inventory_raw` (mixed purchase splits legs, payables/tax untouched); selling a raw product credits `inventory_raw`; class flip with stock posts exactly one reclass entry of `stockQty × costPrice` and both class identities hold after; class flip at zero stock posts nothing; BOM edit creates version n+1 and leaves version n readable; seed identities intact.

### C4 — Production orders
- `productionOrders` collection + `PR-` series, order creation with BOM snapshot, issue/completion/scrap/closeout events with §4.2 templates and absorption arithmetic, finished-goods landing (rows + `costPrice` update), production surface.
- **Rules:** `productionOrders` match, published first.
- **Audit checkpoint:** a full worked production — issue (materials at snapshot costs split across class accounts; labour paid from till and, in a second scenario, accrued to `salary_payable`) → partial completion → scrap → final completion — asserts at every step: GL `wip` == Σ pools to the paisa; pool never negative; final completion absorbs the pool to exactly 0; finished units' absorbed value == issues − scraps to the paisa; the output product's rows and `costPrice` update as designed; completion beyond plan spreads the whole pool (over-production scenario); completion with empty pool refused pre-composition; close-out of a half-produced order posts the residual to `inventory_loss` exactly; BOM changed mid-order — the open order's snapshot economics are untouched (§3.2 scenario); seed identities intact.

### C5 — Job tracker
- `jobs` collection + `JB-` series, `jobStages` settings, job cards + stage flow, material issue/return events (§5.3 templates), advance action riding `addRepayment`, "Bill this job" citation (`Bill.sourceType: "job"`), job profit selector (§5.5), job card print (work slip with number/stage/due date).
- **Rules:** `jobs` match, published first. Demo storage v13 → v14.
- **Audit checkpoint:** an advance posts exactly the existing repayment entry (journal diff == one repayment; customer outstanding goes negative by the advance) and is absorbed when the job's credit bill posts (F-6 lot scenario re-run with the citation); material issue/return move rows at the job's warehouse and post `cogs` mirrors to the paisa; the citing bill posts exactly once through `postBill` (template identity vs a direct bill); job profit reproduces a hand-computed figure across a mixed scenario (advance + materials + labour + billed deliverable); a job with no bill reports revenue 0; seed identities intact.

### Phase-end finance-integrity audit checklist (Phase C close — all must pass)

1. **Quantity identity:** for every product, Σ per-warehouse rows + in-transit == `stockQty` — after migration, after every increment's scenarios, and on a long mixed workload (sales from two warehouses, transfers, production, jobs, returns crossing warehouses).
2. **Warehouse valuations:** Σ over warehouses of (rows × global `costPrice`) == `stockValue()` total exactly; per-warehouse figures reproduce from rows alone.
3. **Class identities:** GL `inventory` == goods-class valued movements and GL `inventory_raw` == raw-class valued movements, replayed from movement documents; on shops with no raw products, GL output byte-identical to pre-C.
4. **WIP:** GL `wip` == Σ production-order pools to the paisa; no pool ever negative at any recorded step; every completed/closed order's pool == 0; **production cost roll-up to the paisa**: per order, Σ issue values == Σ completion values + Σ scrap values + Σ closeout values + final pool, exactly.
5. **Transfer integrity:** every dispatched transfer's (sent − received − lost) == its in-transit contribution; total stock changes across a transfer workload == −(posted losses) exactly.
6. **Jobs:** Σ job material issue values == the `cogs` lines citing jobs; advances reconcile to the customer pools (no job-side money exists to reconcile — asserted by construction + scenario).
7. **Frozen ground:** trial balance 0 on every scenario journal; seed journal SHA `e17e5bda…1168` and the five seed identities unchanged; i18n parity compile-clean; rules diff purely additive over v5 (plus the G-C2 widening comment).

---

## 10. Migration & compatibility

### 10.1 The `stockV1` step — annotation, not conversion

Owner-doc settings gain `phaseC: { stockV1?: boolean }`, following the `phaseA` flag pattern (resumable, idempotent, owner-sign-in only). The step:

1. Creates the `wh-main` warehouse doc (fixed id, `isDefault: true`) if absent.
2. For every product with **no** stock rows, creates its default-warehouse row `{ qty: product.stockQty }` under the deterministic id (§1.3). Products that already have rows are skipped whole (completeness is per product).
3. Sets `phaseC.stockV1 = true`.

**It writes no journal entries and changes no totals** — it cannot do otherwise: it moves no value and no quantity, it only writes down where existing quantity already notionally is (and §1.3's resolution rule means even that writing-down is presentational). This is strictly safer than A2's migration, which was itself entry-free. Fresh seeds and the demo seed the same end-state directly (default warehouse + complete rows) with the flag pre-set.

### 10.2 Compatibility matrix

| Combination | Behaviour |
|---|---|
| Old app + old rules | Untouched (today's live state). |
| Old app + rules v6 (Phase C additions) | Must work fully — the additions only *permit* new collections; nothing existing narrows. (The G-C2 grant widens `stockLevels`, a collection the old app never touches.) |
| New (C1) app + unmigrated shop | Correct by §1.3's resolution rule — all stock reads as default-warehouse until the owner's C1 sign-in runs `stockV1`. Staff clients never migrate (owner-only, as A/B) and never need to. |
| Pre-C client writing stock after C1 migration | Its `stockQty` writes land without row writes ⇒ §1.7 drift, detectable and recount-repairable; its journal entries remain valid (value was never location-shaped). This is the standing rollout exposure of every phase (R-1 class), named here as R-C1 rather than discovered later. |
| Shops that never manufacture | C3/C4 add no behaviour: no raw products ⇒ templates byte-identical; no BOMs/orders ⇒ no postings. The class flag and collections sit unused, as `cheques` did between A1 and B5. |

### 10.3 Seed / demo

Fresh seed journal is **untouched** (invariant 6). Demo data gains, all with **zero journal footprint** (the B §10 discoverability discipline): the default warehouse holding all seed stock (rows sum to the seed quantities exactly) + one empty "Godown" warehouse; one *draft* transfer; one BOM (a finished demo product from raw-class demo components — the components are demo products whose seed stock sits in rows like everything else; the BOM itself posts nothing); one *draft* production order (no events); one open job at an early stage (no material events, no advance). Anything that would post — a dispatched transfer is fine (no entry), but a production issue or a job advance — is excluded by construction.

---

## 11. Risk list

| # | Risk | Severity | Mitigation in this design |
|---|---|---|---|
| R-C1 | A pre-C client (or a second device still on the B build) writes `stockQty` after the C1 migration ⇒ rows drift from the total (its journal entries stay valid; only the location split goes stale). | Medium | §1.3 resolution rule keeps pre-migration reading correct; §1.7 drift detector + owner recount ships in C1 itself; rollout note instructs updating all devices at the C1 release (the standing per-phase discipline). |
| R-C2 | The class generalisation (§4.1) touches every F-4 template — a missed path posts a raw product's movement against `inventory` and silently splits the class identities. | High | The path list is closed and enumerated in §4.1; C3's checkpoint requires the no-raw byte-identical regression AND per-path raw scenarios; the phase-end audit replays movements per class (§9 item 3). |
| R-C3 | Absorption arithmetic strands paisas in WIP (the F-3 failure shape, third appearance). | Medium | Cumulative absorption with final-absorb (§4.2) makes Σ events == Σ issues an arithmetic identity, not an approximation; pool ≥ 0 enforced pre-composition; C4 checkpoint asserts to the paisa at every step. |
| R-C4 | An order's BOM is edited mid-production and open orders silently re-cost. | Medium | Orders snapshot the recipe at creation (§4.1/§3.2); BOM edits are new versions; C4 checkpoint includes the mid-order edit scenario. |
| R-C5 | Owners read per-warehouse valuation (latest cost) as a GL figure and find it ≠ journal `inventory` (snapshot costs) — the pre-existing latest-cost divergence, now visible per building. | Low | §1.4 states the definition in the design and the surface labels it a stock-value figure at current cost, as the existing `stockValue()` report already is; the GL tie-out remains product/class-level (§9 item 3). |
| R-C6 | In-transit stock is double-promised: B2's availability warns from rows, but an owner may mentally count in-transit goods as available at destination. | Low | Desks display incoming quantities separately (§8); in-transit is in no warehouse's availability figure (§2.2). |
| R-C7 | Job materials get billed twice (issued to the job AND added as bill lines) — a desk-discipline risk, not a code path. | Low | §5.3 states the discipline in the design; the job surface lists issued materials on the billing prefill screen so the desk sees what already left the shelf (C5 UI requirement, §9). |
| R-C8 | Rules `get()`/write surface growth (two more collections in cashier batches). | Low | `stockLevels` rides batches the rules already evaluate; no new `get()` calls are introduced (role helpers unchanged). Accepted, as A R-8. |

---

## 12. Decisions by precedent vs open questions; what Phase C does NOT do

### 12.1 Settled by precedent (no owner input needed — recorded so they are not re-litigated)

- Location as a **subledger split under one GL** — A §1.1/§1.2 (money accounts) applied to quantity.
- **Derived in-transit + derived fulfilment**, cached status labels — B §2.1/§2.2.
- **Stock leaves a warehouse at the bill**, never at dispatch documents — B §2.5 (challan) extended to the order-warehouse inheritance in §1.6.
- **One documented reclass entry** for balance moves between accounts — A §1.6 true-up form, applied to class changes (§4.1).
- **Advances = negative receivables in the customer pool** — A §4.4, applied to jobs (§5.3).
- **Rules cannot decompose batches ⇒ documented widenings** (G-C2) — B G-3 precedent, with rollout-note + rules-comment discipline (R-B6).
- **Numbering max+1 at mint, drafts burn none** — B §1.3 (job numbers at creation are the one stated exception, §5.1: a job's number is given to the customer on a slip immediately).

### 12.2 Open questions (owner's call genuinely needed — recommendations given)

- **Q1 — Split-warehouse bills.** May one bill draw lines from two warehouses, or is one-warehouse-per-bill (§1.6) the Phase C rule? **Recommendation: one warehouse per bill in Phase C.** It keeps stock validation, challan inheritance and the returns path single-location; a two-building sale is two bills. Line-level locations can be added later without changing any Phase C shape (lines would gain an optional `warehouseId` overriding the bill's) — but the returns/void symmetry should be designed then, not improvised now.
- **Q2 — Job advances: pooled or earmarked?** §5.3 designs advances into the customer's general pool (absorbed by the job's bill through F-6, but also absorbable by any other bill of that customer). The alternative — advances earmarked to the job and applicable only to its bill — needs a job-level advance subledger and a bill-time allocation rule. **Recommendation: pooled for Phase C** (zero new money machinery, consistent with A §4.4); an earmarked *report* (advances whose notes cite the job) can be derived later without touching postings.
- **Q3 — Production labour/overhead default settlement.** §4.4 lets each issue choose paid-from-account or accrue-to-`salary_payable`. Which is the desk's pre-selected default? **Recommendation: paid from the till/money account** — the target shops pay daily-wage labour in cash per run; accrual is one tap away when they don't. (If the owner's own printing operation accrues monthly salaries instead, the default flips with no design change — it is a stored desk preference, not a template difference.)

### 12.3 What Phase C deliberately does NOT do

- **No per-warehouse GL accounts, costs, or P&Ls** (§1.4) — and no warehouse dimension on journal lines.
- **No split-warehouse bills and no cross-warehouse production orders** (§1.6, §4.5; Q1) — transfers are the bridge between buildings.
- **No multi-level BOM explosion** (§3.3) — sub-assemblies are their own production orders.
- **No job-earmarked advance subledger** (Q2), **no job WIP account** (§5.3 — job materials expense through `cogs` at issue), **no stage-based job billing milestones** — a job bills once, through the ordinary desk, when the desk says so.
- **No change to the Flutter app** (Phase F) — but every Phase C shape (warehouses, rows, transfers, BOMs, orders, jobs, class flag) is a data-layer contract the Flutter client will consume as-is, as with Phases A and B.
- **No warehouse dimension on Phase B documents beyond the optional stamps of §1.6** — quotations stay location-free (a quote promises price, not a building); notes, cheques and vouchers are untouched.
