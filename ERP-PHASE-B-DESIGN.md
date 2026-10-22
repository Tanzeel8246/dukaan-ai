# Dukaan AI — ERP Phase B "Document Chain" — DESIGN

**Status:** Design only — no app code changed by this document.
**Scope:** Phase B of `dukaan-erp-roadmap.md` (quotations, sale orders, delivery challans, purchase orders, formal credit/debit notes, payment receipts/vouchers, cheque registry), designed against the live Phase A foundations.
**Sources read:** `dukaan-erp-roadmap.md` (Phase B), `ERP-PHASE-A-DESIGN.md`, `PRODUCTION.md` (Complete edition + Phase A summaries A1–A5), `web/lib/types.ts`, `web/lib/ledger.ts`, `web/lib/tax.ts`, `web/lib/permissions.ts`, `web/lib/coa.ts`, `web/components/StoreProvider.tsx` (all posting paths: `postBill`, `reverseBillItems`, `recordPurchase`, payments, `guardPostings`/`postEntry`), `firebase/firestore.rules` (v3).

## Non-negotiable invariants carried over (Complete edition + Phase A)

Every design choice below is subordinate to these — Phase B must not regress any of them:

1. **One atomic balanced journal entry per money event**, built by `makeEntry` (throws on imbalance, F-1) and written in the same `writeBatch` as its operational records, through the single choke point (`guardPostings` → `postEntry`, A5). Phase B adds **no** new posting route.
2. **The journal is append-only.** Corrections are reversing entries (`reversesId`), never edits. Rules deny journal/sales update+delete.
3. **No stored balance counters, anywhere.** Every balance is derived by summing journal lines plus the operational subledgers the audit proved reconcile (credits, purchases, supplierPayments). Phase B extends this rule to **fulfilment quantities**: how much of a document has been converted is derived from the child documents that cite it (§2.1), never kept as a mutable counter — with one cached exception, the document's own status label (§1.4).
4. **Inventory moves only through the ledger** (F-4): every stock change posts. Phase B's sharper form: **non-posting documents move no stock and post nothing** (§2.2).
5. **Migrations never fabricate history** (F-12/F-14): Phase B needs no migration of money data at all (§10).
6. **Seed identities are frozen:** Phase B changes no seed journal output; the 282/282 harness identities (Inventory == shelf 272,805 · Cash == 50,000 · payables 27,900 · receivables 5,500 · trial balance 0 · seed-journal SHA pinned in A4) must survive every Phase B increment untouched.
7. **Tax resolves at posting time** (A4): slab resolution, snapshots and templates are the bill/purchase engines' job. Pre-bill documents carry estimates only (§7).

## Current state (what Phase B builds on)

| Area | Today |
|---|---|
| Posting events | Exactly two goods/money seams: the **bill** (`postBill` — sales rows, stock decrement, journal, udhaar credit row, one batch) and the **goods receipt** (`recordPurchase` — stock-in at latest cost, perpetual-clearing journal, one batch). Returns/voids run through the shared reversal engine `reverseBillItems` (cumulative F-3 discount shares, A4 `returnTaxShares`). **No purchase-return path exists.** |
| Numbering | `Bill.billNo` = client-side `max(existing billNos) + 1` over the subscribed bills list. No counter documents exist anywhere; the owner doc is owner-write-only in rules v3, so staff-writable counters cannot live there (§1.3). |
| Payments | `PayMethod` = cash/jazzcash/easypaisa/bank/credit; A2 stamps `accountId` on every money row and the money account rides in the journal line's `ref`. `accountForMethod` maps method → GL bucket. |
| Cheque accounts | `cheques_in_hand` (asset, Dr-normal) and `cheques_issued` (liability, Cr-normal) are declared in the COA v2 registry (`lib/coa.ts`) and the `AccountCode` union — **no posting writes them yet**. Account labels exist in both dictionaries (Phase A §8). |
| RBAC | `lib/permissions.ts` pre-declares six Phase B rows (§6.1); rules v3 has **no** matches for Phase B collections yet — the catch-all denies them. |
| Periods | `lockedThrough` + store guard (`preparePosting` stamps `dateISO`, refuses backdated postings) + rules backstop on the dated collections. Corrections of closed-period documents post at today's date. |
| Receipts | One receipt-sheet markup in `BillingDesk` serves standard + 80mm (`receipt` / `receipt-80` classes, `window.print()`); tax lines come from `billTaxLines()` (A4); a WhatsApp message builder exists for bills. Returns and repayments have **no** print surface today. |
| Subscriptions | `COLLECTION_NAMES` in `StoreProvider` drives both cloud listeners and the demo-mode persisted shape (demo storage key `dukaan-ai-store-v5`). |

---

## 1. Document models & numbering

### 1.1 Shared line shape

Sales-side documents (quotation, sale order, challan) share one line type; purchase-side documents (purchase order) mirror `PurchaseItem`. Lines snapshot the product name at issue time, exactly as `BillItem`/`PurchaseItem` do.

```ts
interface DocLine {
  productId: string;
  name: string;          // snapshot
  qty: number;
  unitPrice: number;     // sales side: the AGREED price (quotation/order) or the
                         // price current at issue (challan) — see §2.4 for what
                         // the bill honours
  total: number;         // qty × unitPrice
  /** Set on child documents created by conversion: which parent line
   *  this line fulfils (parent doc id + the product it answers). */
  sourceProductId?: string | null;
}
```

No cost snapshot is stored on pre-bill lines: COGS truth is the bill's business (the bill snapshots `unitCost` from the product at posting, as today), and carrying an estimated cost on a quotation would invite margin reports built on stale numbers. No tax snapshot either (§7).

### 1.2 The documents

All live under `users/{uid}/…`, all carry the house dating pair (`dayOffset`, `ts`) and a party snapshot (name/phone), like `Bill`.

**Quotations** — collection `quotations`:

```ts
type QuotationStatus = "draft" | "issued" | "accepted" | "rejected"
                     | "expired" | "converted" | "cancelled";
interface Quotation {
  id: string;
  number: string | null;          // "QT-12" once issued; null while draft (§1.3)
  customerId: string | null; customerName: string; customerPhone: string;
  lines: DocLine[];
  subtotal: number;
  discountType: "flat" | "percent"; discountValue: number; discountAmount: number;
  /** Display-only estimate of tax at CURRENT slab resolution. Recomputed
   *  whenever the document is rendered; never posted, never promised (§7). */
  estimatedTax: number;
  total: number;                  // subtotal − discount + estimatedTax (estimate)
  validUntil: string | null;      // YYYY-MM-DD; past it, status derives "expired" for display
  note: string;
  status: QuotationStatus;
  issuedTs: string | null;
  dayOffset: number; ts: string;
}
```

**Sale orders** — collection `saleOrders`:

```ts
type SaleOrderStatus = "draft" | "open" | "partially_fulfilled"
                     | "fulfilled" | "cancelled";
interface SaleOrder {
  id: string;
  number: string | null;          // "SO-7" once confirmed (draft → open)
  customerId: string | null; customerName: string; customerPhone: string;
  lines: DocLine[];               // unitPrice here is the AGREED price (§2.4)
  subtotal: number;
  discountType: "flat" | "percent"; discountValue: number; discountAmount: number;
  estimatedTax: number;           // display-only, as quotations
  total: number;                  // estimate, as quotations
  source: { type: "quotation"; id: string } | null;
  expectedDate: string | null;    // YYYY-MM-DD promised delivery
  note: string;
  status: SaleOrderStatus;        // cached label; truth derives per §2.1
  dayOffset: number; ts: string;
}
```

**Delivery challans** — collection `challans`:

```ts
type ChallanStatus = "draft" | "dispatched" | "partially_billed"
                   | "billed" | "cancelled";
interface DeliveryChallan {
  id: string;
  number: string | null;          // "DC-21" once dispatched
  orderId: string | null;         // source sale order; null = standalone delivery
  customerId: string | null; customerName: string; customerPhone: string;
  lines: DocLine[];               // qty IS the delivered qty (a challan line
                                  // never carries an undelivered remainder)
  vehicleNo: string;              // optional dispatch details, owner's words
  driverName: string;
  note: string;
  status: ChallanStatus;          // cached label; billed truth derives per §2.1
  dayOffset: number; ts: string;
}
```

A challan's lines record what physically left on that trip. It carries **no totals and prints no amounts** (§2.3, §5.3): quantities only — the standard delivery-challan practice, and the reason its prices can never become a second price promise.

**Purchase orders** — collection `purchaseOrders`:

```ts
type PurchaseOrderStatus = "draft" | "issued" | "partially_received"
                         | "received" | "cancelled";
interface PurchaseOrder {
  id: string;
  number: string | null;          // "PO-5" once issued
  supplierId: string; supplierName: string;   // name snapshot
  lines: Array<{ productId: string; name: string; qty: number;
                 unitCost: number; total: number }>;  // agreed cost
  total: number;                  // estimate — tax resolves at receipt (§7)
  expectedDate: string | null;
  note: string;
  status: PurchaseOrderStatus;    // cached label; received truth derives per §2.1
  dayOffset: number; ts: string;
}
```

**Notes** — one collection `notes`, both kinds (they share shape, print machinery and the single matrix row `creditDebitNotes`):

```ts
type NoteKind = "credit" | "debit";
interface DocNote {
  id: string;
  number: string;                 // "CN-3" / "DN-2" — minted at posting, never null
  kind: NoteKind;
  /* credit side: the note FORMALIZES one SaleReturn row (§3.1) */
  returnId: string | null;        // SaleReturn.id (credit) / PurchaseReturn.id (debit)
  billId: string | null; billNo: number | null;      // credit notes
  purchaseId: string | null;                          // debit notes
  partyId: string | null; partyName: string;          // customer / supplier snapshot
  items: BillItem[];              // the return engine's stamped lines (tax shares incl.)
  goodsAmount: number;            // net goods reversed (excl. tax)
  taxAmount: number;              // tax reversed (A4 shares)
  total: number;                  // goodsAmount + taxAmount == what the party got back
  settlement: "cash_refund" | "credit_reduction"      // credit notes (mirrors SaleReturn)
            | "payable_offset" | "cash_refund";       // debit notes (§3.2)
  journalEntryId: string;         // the ONE entry that posted it
  reason: string;
  status: "posted";               // notes are born posted; there is no draft (§3.3)
  dayOffset: number; ts: string;
}
```

**Purchase returns** — collection `purchaseReturns`, the debit side's operational record, mirroring `SaleReturn` (§3.2):

```ts
interface PurchaseReturn {
  id: string;
  purchaseId: string;
  supplierId: string;
  items: PurchaseItem[];          // tax shares stamped, like SaleReturn items
  /** Portion settled by reducing what the shop owes the supplier. */
  payableOffset: number;
  /** Portion the supplier handed back in money (0 unless cash refund). */
  refundAmount: number;
  method: "cash" | "jazzcash" | "easypaisa" | "bank" | null;  // refund leg
  accountId: string | null;       // A2 stamp for the refund leg
  dayOffset: number; ts: string;
}
```

**Cheques** — collection `cheques` (§4.1). **Vouchers stamp existing rows** — no new collection (§5.1).

### 1.3 Numbering — series, homes, concurrency

One series per document type, rendered `prefix + sequence`:

| Series | Prefix (default) | Document |
|---|---|---|
| Quotation | `QT-` | `quotations` |
| Sale order | `SO-` | `saleOrders` |
| Delivery challan | `DC-` | `challans` |
| Purchase order | `PO-` | `purchaseOrders` |
| Credit note | `CN-` | `notes` (kind = credit) |
| Debit note | `DN-` | `notes` (kind = debit) |
| Receipt voucher | `RV-` | stamped on `credits` repayment rows (§5) |
| Payment voucher | `PV-` | stamped on `supplierPayments` rows (§5) |

Bills keep the existing numeric `billNo` series and mechanism, untouched.

**Where the sequence comes from.** Phase B deliberately reuses the app's one proven numbering pattern — `billNo`'s — rather than inventing a counter store: the next number is `1 + max(sequence over the subscribed documents of that series)`, computed client-side at mint time. A counter document was considered and rejected for three concrete reasons:

- The natural home, the owner doc, is **owner-write-only** in rules v3 — a cashier issuing a quotation could not bump it in the same batch, and loosening the owner doc for counters would puncture the settings/staff security boundary for a display number.
- A dedicated `counters` collection writable by selling roles adds a new rules surface and a read-modify-write that Firestore client batches cannot make atomic across devices anyway (no transaction is used anywhere in this codebase; all writes are batches).
- Bills have run on max+1 since the Complete edition with no incident class recorded; consistency with the audited pattern beats theoretical purity.

**When a number is minted.** A document receives its number **when it leaves draft** — quotation on issue, order on confirm, challan on dispatch, PO on issue — and notes/vouchers at their posting/creation instant (they are never drafts). Drafts display as "Draft" and burn no numbers, so series stay gapless in normal use and a discarded draft leaves no hole. Prefixes live as optional fields on the owner-doc settings (`docSeries?: Partial<Record<SeriesId, string>>`, owner-edited in Settings; absent ⇒ the defaults above), read by every role from the already-subscribed settings. A prefix change affects future mints only; stored `number` strings are never rewritten.

**Concurrency, stated honestly.** Two devices issuing in the same series while both offline (or racing online) can mint the same number — exactly the exposure `billNo` already carries. The document `id` remains the identity and the journal/print linkage key; the number is a human reference. At single-shop scale (the app's design centre) this is the accepted trade-off of §1.3's pattern; a transaction-backed counter is the Phase G (multi-branch) conversation, not Phase B's.

### 1.4 Status lifecycles

```
Quotation:  draft ──issue──▶ issued ──▶ accepted ──convert──▶ converted
                              │  └──▶ rejected        └──(whole/partial, §2.3)
                              └──▶ expired (validUntil passed; display-derived)
             any pre-conversion state ──▶ cancelled
SaleOrder:  draft ──confirm──▶ open ──▶ partially_fulfilled ──▶ fulfilled
Challan:    draft ──dispatch──▶ dispatched ──▶ partially_billed ──▶ billed
PO:         draft ──issue──▶ issued ──▶ partially_received ──▶ received
Notes:      (born) posted — terminal
Cheques:    §4.2
             any state before fulfilment completes ──▶ cancelled
             (cancellation is a status write only — nothing ever posted)
```

Rules of the lifecycle:

- **Drafts are freely editable and deletable** (they assert nothing). Once a document leaves draft it is **never edited in place**: quantities/prices change only by cancelling and reissuing — the same immutability instinct as posted records, applied one step earlier, because a printed issued document is already a promise to a customer/supplier.
- **Fulfilment states are cached labels over derived truth** (§2.1): after every conversion the acting store action recomputes the parent's fulfilled quantities from its children and stores the resulting status in the **same batch** as the conversion's own writes. If a cached status and the derivation ever disagreed, the derivation wins and the next conversion repairs the label — the label is a list-rendering convenience, never an input to money.
- **Cancelled is terminal and non-posting.** A document with any fulfilled quantity cannot be cancelled (its children exist); it can only be fulfilled or left open.

---

## 2. Conversion flows

### 2.1 The derivation rule (quantities are derived, children cite parents)

Every conversion stamps the CHILD document with its source:

- `Bill` gains optional `sourceType: "order" | "challan" | "quotation" | null` + `sourceId: string | null` (absent on all pre-B bills ⇒ direct desk bills, unchanged).
- `DeliveryChallan.orderId` (already in the model) is its source citation.
- `Purchase` gains optional `sourcePoId: string | null`.
- Child lines carry `sourceProductId` (the parent line's product) — line identity across documents is by product, the only stable key the line shapes share.

Fulfilled quantities are then **derived, never stored**:

```
deliveredQty(order, product)  = Σ qty over lines of dispatched/billed challans
                                citing the order, for that product
billedQty(order, product)     = Σ qty over POSTED bill lines citing the order
                                directly, PLUS bills citing a challan of the order
                                (one hop: bill → challan → order)
billedQty(challan, product)   = Σ qty over posted bill lines citing the challan
receivedQty(po, product)      = Σ qty over purchase lines citing the PO
convertedQty(quotation, p)    = Σ qty over order lines citing the quotation
                                PLUS bill lines citing the quotation directly
remaining(doc, product)       = line qty − fulfilled qty   (never negative)
```

Conversions may only offer `remaining` quantities; the store action re-derives and refuses an over-conversion **before** composing any write. Because bills are never deleted (posted bills: rules + store), challans are never deleted once dispatched, and purchases are records, the derivation is over stable history — the same reason journal-derived balances cannot drift.

### 2.2 The cardinal rule

**Non-posting documents post NOTHING.** A quotation, sale order, delivery challan or purchase order — at any status — writes no journal entry, moves no stock, creates no credit/payable row, and touches no money account. The only posting events in the sales chain remain the **bill** (`postBill`, unchanged templates) and in the purchase chain the **goods receipt** (`recordPurchase`, unchanged templates). A conversion is therefore two things and only two things: (a) composing the posting event through the EXISTING engine with lines drawn from the source document, and (b) updating the source document's cached status — **in the same writeBatch** as the posting (the store's conversion action extends the posting batch with the source-doc update, so a conversion can never half-land: bill posted but source unmarked is exactly the drift this rule exists to prevent).

### 2.3 The chains

**Quotation → sale order.** Copies: party, lines (qty + agreed `unitPrice`), discount fields, note. The order's `source` cites the quotation; the quotation's status advances (converted when fully converted — partial conversion to an order is allowed, quantities derive per §2.1; the remainder stays convertible or the quote is cancelled). The order is born `draft` (its own confirm step mints `SO-`). Nothing posts; prices remain editable on the order while it is a draft.

**Quotation → bill directly.** The desk composes a bill from the quotation's remaining lines at the quotation's agreed prices (§2.4) and hands it to `postBill` — the one posting of the chain. The bill cites the quotation; the quotation's status updates in the same batch.

**Sale order → delivery challan.** Copies party + chosen lines at quantities ≤ `remaining` undelivered. The challan cites the order. **No posting, no stock movement** (§2.5). The order's status recomputes in the same batch.

**Challan → bill.** The desk composes a bill from the challan's unbilled lines (quantities ≤ remaining unbilled) at the prices of the source ORDER when the challan cites one — the agreed price lives on the order; a standalone challan bills at its own line prices — and hands it to `postBill`. Partial billing of one challan across several bills is supported by the derivation; the challan completes when fully billed.

**Sale order → bill directly** (no challan — the small-shop path). As challan → bill, citing the order. Both paths feed the order's `billedQty` derivation (direct + one-hop, §2.1).

**Purchase order → goods receipt.** The receiving desk composes a `recordPurchase` input from the PO's unreceived lines (qty ≤ remaining; `unitCost` defaults to the PO's agreed cost, editable at receipt — the actual invoice rules, as today when `recordPurchase` re-prices the shelf to the received cost). The resulting `Purchase` cites the PO (`sourcePoId`); the PO's status recomputes in the same overall action. Partial receipts across multiple deliveries are supported by derivation.

**What remains editable, where.** Draft documents: everything. Issued/confirmed/dispatched documents: nothing but status transitions and the note field's successors (cancel + reissue). Bill composition at conversion time: quantities may be REDUCED below remaining (never raised), the customer may be corrected (walk-in → named, which the udhaar part requires anyway), and payment composition is entirely the desk's, as for any bill. Prices at billing follow §2.4 and are not free-typed at the conversion desk.

### 2.4 Prices: the order fixes them, the bill honours them, tax re-resolves

Today the billing desk always charges the product's current shelf price (`priceLines` prices from the product record). A converted bill must honour the commercially agreed price instead. Phase B therefore adds ONE contained change to the bill-composition seam: `BillLineInput` gains an optional `unitPrice` — when present, the priced line uses it (snapshot onto `BillItem` exactly as a shelf price is today); when absent, behaviour is byte-identical to today. Rules of use:

- Only conversion actions pass `unitPrice` (from the source document's lines). The free billing desk passes none in Phase B — no new price-typing surface, no role question (a cashier converting an order charges what the order says, neither more nor less).
- `unitCost` (COGS) is unaffected: it snapshots the product's cost at posting, as today. An agreed price below current cost produces a genuinely negative-margin bill — visible in the P&L, which is the truth, not an error.
- **Tax is never copied.** The bill resolves slabs fresh at posting via the A4 engine (`stampBillTaxes` over the converted lines) — if the owner changed a slab or a default between quotation and billing, the BILL is right and the quotation's estimate was only ever an estimate (§7). Discount terms (type/value) DO copy from quotation/order to the bill input — a promised discount is a commercial term, like price; the F-3 cumulative machinery then governs its returns exactly as for any bill.

### 2.5 DECISION — delivery challan stock semantics

Three candidate models were considered:

| Model | Stock leaves | Journal effect of a challan |
|---|---|---|
| **(1) At the bill; challan reserves (RECOMMENDED)** | At bill posting, via the existing `postBill` decrement | **None.** The challan is a pure delivery document. |
| (2) At the challan, via a "goods-out" clearing account | At dispatch | Dr `inventory_out` / Cr `inventory` at dispatch; Dr `cogs` / Cr `inventory_out` at billing |
| (3) At the challan, as a full sale | At dispatch | The complete bill entry at dispatch (challan ≡ bill) |

**Decision: model (1). Stock leaves at the bill; the challan carries a derived reservation only.** Justification:

1. **It keeps the audited machinery intact — the deciding factor.** The finance audit (F-4/F-12) proved and the harness continuously re-proves the identity *journal `inventory` balance == Σ shelf stock × cost*. Model (2) breaks that identity by design: value would sit in `inventory_out` while the shelf says the goods are gone (or the shelf keeps them while the journal says otherwise) — every reconciliation the owner now trusts would need a second account's caveat, and returns (which restore stock against a BILL through `reverseBillItems`) would have to know whether the goods originally left via a challan, splitting the reversal engine's one clean path into two.
2. **Model (2) needs a COA code Phase A deliberately did not declare.** The v2 registry was closed at 27 codes with later-phase codes pre-declared; `inventory_out` is not among them. Adding it in Phase B would reopen the registry for a presentational convenience — and Phase C's warehouse transfers are the legitimate home for in-transit stock (a location move between the shop's own warehouses, where a clearing treatment will be designed on its own merits).
3. **Model (3) destroys the document chain's purpose** — an order fulfilled over three deliveries would post three "sales" before any bill exists, corrupting receivables, day close and the sales history the forecast reads.
4. **The reservation is a derived report, not a balance.** `available(product) = stockQty − Σ remaining-undelivered over open orders/challans` is computed from documents (§2.1) and shown at the desks ("12 on shelf · 5 promised · 7 available"). It warns; it never blocks a desk sale and never posts. Oversell risk is handled where the app already handles it: stock is re-validated at bill posting (`finalizeBill`'s precedent) and a conversion that cannot be fulfilled posts nothing.
5. **The honest cost, stated:** between dispatch and billing, the physical shelf is emptier than `stockQty` claims. The derived "promised" figure is the mitigation, and it is exactly how the paper world works — the challan book, not the stock register, knows what is out on the road.

### 2.6 Worked conversion (no new template — that is the point)

Order SO-7: 10 × Cooking Oil 5L @ agreed 2,600 (shelf price now 2,700; cost 2,450). Challan DC-21 delivers 10. Bill converts the challan, all cash:

```
Dr  cash        (ref: till)          26,000      ← 10 × 2,600 AGREED price
Dr  cogs                             24,500      ← cost snapshot at posting
    Cr  sales_revenue                    26,000
    Cr  inventory                        24,500
ΣDr = ΣCr = 50,500 ✓ — the ordinary postBill entry, unchanged.
```

One journal entry, one stock decrement, written by the existing engine; the same batch additionally updates SO-7's and DC-21's cached statuses. If the bill is later returned in part, `reverseBillItems` reverses it exactly as any bill — it neither knows nor cares that the bill was converted.

---

## 3. Formal credit & debit notes

### 3.1 Credit notes WRAP the existing returns engine — they never re-post

Today a sale return already does everything financial: `reverseBillItems` writes the `SaleReturn` row, negative sale rows, the stock restore, the udhaar credit row (when the refund eats unpaid udhaar) and the one balanced journal entry (`refType: "return"`). What it lacks is only **form**: a number, a document, a print.

Phase B adds exactly that form, and nothing else:

- Every completed return (partial or full, desk or counter) mints a `DocNote` (kind `credit`) **in the same batch** as the return's own writes, citing the `SaleReturn` row (`returnId`), the bill (`billId`/`billNo`), the journal entry the engine just composed (`journalEntryId`), and copying the figures the engine computed: `goodsAmount` = Σ returned line totals − discount share, `taxAmount` = the A4 tax share, `total` = refund + creditReduction — i.e. the note's total is the engine's `refundTotal`, by construction equal to what the customer received back in money + udhaar relief. The note is a **view over the posting, not a second posting**: no new journal entry, no new stock movement, no new credit row. Note totals reconciling with returns is therefore not a hope but an identity, and the harness asserts it as one (§9, B4).
- **Voids do not get credit notes.** A void annuls the bill itself (`bill_void`, full mirror); the voided bill is its own record and prints as VOID. Credit notes formalize returns of goods against a bill that stands.
- The note's `settlement` mirrors the `SaleReturn`'s own split (`cash_refund` when the whole refund was money; `credit_reduction` when it all ate udhaar; a mixed return records the money leg as primary and the print shows both legs with their amounts — the underlying row remains the authority).

### 3.2 Debit notes need the missing half: a purchase-return engine

No purchase-return path exists today, so Phase B builds its mirror of `reverseBillItems` — `returnPurchaseItems(purchase, lines, settlement)` — with the same disciplines:

- **Cumulative shares, purchase side.** Discount does not exist on purchases, but input TAX does (A4): returning a purchase item-by-item must reverse its `tax_input` to the paisa. `lib/tax.ts` gains `purchaseReturnTaxShares`, the exact analogue of `returnTaxShares`, computed cumulatively over prior `purchaseReturns` of that purchase.
- **Stock leaves at the purchase line's own cost snapshot** (the `unitCost` the goods came in at — not the product's current cost, which later purchases may have moved). The product's shelf `costPrice` is NOT rewritten by a return (`recordPurchase` sets latest-cost on receipt; a return is not a receipt).
- **Settlement, chosen at the desk:** `payable_offset` (default — the supplier simply owes... is owed less) or `cash_refund` (the supplier hands money back now, into a chosen money account).

Journal template — goods net N, input tax T reversed, gross G = N + T (worked example: net 10,000, GST 17% ⇒ T = 1,700, G = 11,700):

```
payable_offset:   Dr  payables   (ref: supplierId)   11,700
                      Cr  inventory                      10,000
                      Cr  tax_input                       1,700
                  ΣDr = ΣCr = 11,700 ✓

cash_refund:      Dr  cash|wallet (ref: accountId)   11,700
                      Cr  inventory                      10,000
                      Cr  tax_input                       1,700
                  ΣDr = ΣCr = 11,700 ✓
```

The `purchases` clearing account is deliberately untouched: it netted to zero at receipt, and the return is a new economic event (goods out, claim down) — exactly as a sale return posts against revenue/COGS rather than re-opening the bill's entry. `refType: "purchase_return"` (new, §4.4 note), `refId` = the `PurchaseReturn` id.

**The subledger must move with the journal** (the F-5 lesson — a posting that moves only one derivation drifts). `supplierBalance` is subledger-derived (purchased − paid), so the batch also writes the `PurchaseReturn` row AND the selectors are amended in the same increment: `supplierPurchased`-side derivation becomes purchased − Σ purchaseReturns gross, and `payablesAging` allocates against purchases net of their returns (a returned purchase must stop ageing as owed). The harness asserts journal payables ≡ subledger payables after every debit-note scenario (§9, B4) — the identity the audit established for sales is extended to purchases before this ships.

A `DocNote` (kind `debit`) mints in the same batch, citing the `PurchaseReturn`, the original `purchaseId`, and the entry — the same wrap discipline as §3.1.

### 3.3 Note lifecycle & corrections

Notes are **born posted and are never edited or deleted from the client** (rules mirror the `returns` posture, §6.2). There is no "un-return": an erroneous note is corrected the way the app already corrects everything — by a compensating new document (re-bill the wrongly returned goods; re-receive wrongly returned purchases), never by rewriting the note. Note numbering (CN-/DN-) is minted at posting from the notes collection per §1.3 (max over kind).

### 3.4 Note prints

The note print reuses the receipt sheet (§5.3): shop header, **note number + kind** as the title, original document reference (Bill #… / purchase date + supplier), the returned lines, per-slab tax lines via the A4 `billTaxLines` grouping applied to the note's stamped items, goods/tax/total, the settlement leg(s), and the reason. A credit note against a taxed bill therefore shows the tax reversal the customer can claim — the A4 snapshots on the return lines are what make this exact.

---

## 4. Cheque registry

### 4.1 Model

```ts
type ChequeDirection = "in" | "out";
type ChequeStatus =
  | "received"     // in: in the drawer, not yet deposited
  | "deposited"    // in: at the bank, awaiting clearance (custody only — §4.3)
  | "issued"       // out: handed to the supplier, not yet cleared
  | "cleared"      // terminal: money moved
  | "bounced"      // terminal: bank refused it (or out-cheque stopped/returned)
  | "returned";    // terminal: in-cheque handed back to the customer undeposited
interface Cheque {
  id: string;
  direction: ChequeDirection;
  chequeNo: string;               // the leaf number, as text (bank's numbering)
  bankName: string;               // issuing bank (in) / own bank (out)
  amount: number;
  issueDateISO: string;           // date written on the cheque (YYYY-MM-DD)
  dueDateISO: string;             // PDC date — when it may clear
  partyId: string | null; partyName: string;   // customer (in) / supplier (out)
  partyKind: "customer" | "supplier" | "expense" | "other";
  status: ChequeStatus;
  /** What this instrument settled at capture time. */
  sourceType: "bill" | "repayment" | "supplier_payment" | "expense";
  sourceId: string;               // the operational row id (bill/payment/expense)
  /** In: the money account chosen at DEPOSIT (money lands here at clearing).
   *  Out: the money account the cheque is DRAWN ON, captured at issue. */
  accountId: string | null;
  chargesOnBounce: number;        // bank charges booked at bounce (0 default)
  entryIds: {                     // audit trail: the journal entry per transition
    captured?: string; deposited?: null;  // deposit posts nothing (§4.3)
    cleared?: string; bounced?: string; returned?: string;
  };
  note: string;
  dayOffset: number; ts: string;
}
```

The registry doc is a **mutable status record** — deliberately unlike the journal: its whole purpose is tracking an instrument's fate. Every transition that moves money writes its journal entry in the same batch as the status update; the status-only transition (deposit) writes the doc alone. The journal remains the immutable money history; the registry is the instrument's diary, and `entryIds` cross-cites the two.

### 4.2 Capture — "cheque" becomes a payment instrument

Payment pickers gain a sixth choice, **cheque**, implemented NOT as a new `PayMethod` (which would ripple through `accountForMethod`, `WALLET_METHODS` and every method-keyed selector) but as an **instrument stamp**, following the A2 `accountId` precedent — the operational row records what happened, the journal line is authoritative:

- `BillPayment` gains `instrument?: "cheque"` + `chequeId?: string | null`. At the desk, choosing cheque on a payment part captures cheque number, bank, and due date in-line; the part's money line posts to `cheques_in_hand` instead of a money account (§4.3). The bill settles in full exactly as today (the F-2 tolerance and discount booking are untouched — a cheque part is a settled part).
- `SupplierPayment.method` stays as-is; the row gains `instrument?: "cheque"` + `chequeId`. Choosing cheque writes the payment row AND the registry doc in the issuance batch (§4.3).
- `Expense` gains the same two optional fields (rent-by-cheque is a first-class case).
- `CreditEntry` (repayments) gains the same two optional fields.

In every case the registry doc is created **in the same writeBatch** as the host posting — a cheque can never exist in the journal without its registry row, nor the reverse.

### 4.3 Journal templates — the full lifecycle

Journal line `ref` convention for cheque accounts: **`ref = chequeId`** (the subledger record id), exactly as money lines carry `accountId`, receivables lines `customerId`, payables lines `supplierId`.

**IN — received from a customer** (amount C). The host flow's entry carries the cheque line in place of the money/receivables line it replaces; `refType` stays the host's (`bill` / `repayment`):

```
as a bill payment part:   … Dr  cheques_in_hand (ref: chequeId)   C …
                          (inside the ordinary bill entry; revenue/COGS/
                           discount/tax lines unchanged)
as a repayment:           Dr  cheques_in_hand (ref: chequeId)     C
                              Cr  receivables   (ref: customerId)     C
```

**IN — deposited.** **No journal entry.** Deposit is a custody event: the value has not moved (the bank has not paid yet), so `cheques_in_hand` continues to carry it and its balance stays exactly Σ uncleared in-cheques. The transition records `accountId` (where the money will land) + status on the registry doc only. (The alternative — a "cheques in clearing" GL split — was rejected: it would need a new COA code to tell a story the registry already tells, and would break the identity *cheques_in_hand ≡ registry uncleared total* that the harness can otherwise assert to the rupee.)

**IN — cleared** (`refType: "cheque_clearing"`, refId = chequeId):

```
Dr  cash|wallet  (ref: depositAccountId)     C
    Cr  cheques_in_hand (ref: chequeId)          C
```

**IN — bounced** (from `deposited` only — a cheque cannot bounce before a bank has seen it; `refType: "cheque_bounce"`, refId = chequeId):

```
Dr  receivables  (ref: customerId)           C
    Cr  cheques_in_hand (ref: chequeId)          C
```

The receivable is restored **exactly** — and the subledger moves with it, in the same batch, by the route the cheque originally took:

- It settled a **repayment**: a compensating `credits` row (kind `credit`, amount C, note "cheque bounced", citing the cheque) re-opens the customer's udhaar, so `customerOutstanding` and the journal agree again.
- It settled a **bill part**: the bill itself is immutable (it stands as paid — the goods left, revenue was real); the bounce writes a `credits` row (kind `credit`, amount C, `billId` = that bill) — the customer now owes the amount on the khata. This deliberately routes through F-6's lot machinery: the row joins the bill's credit lot, so a later return/void of that bill computes its outstanding correctly with the bounced amount included.
- **Bank charges** (optional, captured at bounce): a SEPARATE entry in the same batch — `Dr expense_finance / Cr cash|wallet (ref: deposit account)` — because the bank debiting the shop's account is a distinct money event from the customer's default. Recovering the charges from the customer is the owner's commercial decision (a further udhaar note), not an automatic posting; the design does not silently lend on the customer's behalf.

**IN — returned to the customer undeposited** (`refType: "cheque_return"`): the mirror of capture — `Dr receivables (ref: customer) / Cr cheques_in_hand (ref: chequeId)` plus the same compensating `credits`-row treatment as a bounce when the cheque had settled a repayment/bill part. (Used when the customer replaces the cheque with cash: the replacement is then an ordinary repayment.)

**OUT — issued to a supplier** (amount C). **DECISION: the payable settles at ISSUANCE** — the issuance entry posts with the `SupplierPayment` row (`refType: "supplier_payment"`, the host's):

```
Dr  payables      (ref: supplierId)          C
    Cr  cheques_issued (ref: chequeId)           C
```

Justification: (1) commercially and legally the supplier's claim is extinguished at handover and replaced by the instrument — the supplier can deposit, endorse or sue on the cheque, not on the invoice; (2) `cheques_issued` exists in COA v2 precisely as this bridge liability — parking the obligation there (rather than leaving it in payables) is what the account is for; (3) payables aging is subledger-derived from purchases − payments, and the payment row is written at issuance, so journal and subledger agree from the same instant — the alternative (payable until clearing) would ALSO require delaying the payment row, leaving the supplier's balance overstated through the whole PDC window and double-stating the obligation in any report that lists pending cheques beside payables; (4) the bounce path (below) restores symmetrically, so the choice costs nothing in correctness. Money accounts are untouched at issuance — no cash has moved.

**OUT — cleared** (`refType: "cheque_clearing"`, refId = chequeId):

```
Dr  cheques_issued (ref: chequeId)           C
    Cr  cash|wallet  (ref: drawnOnAccountId)     C
```

**OUT — bounced / stopped / returned by the supplier** (only before clearing; `refType: "cheque_bounce"`):

```
Dr  cheques_issued (ref: chequeId)           C
    Cr  payables      (ref: supplierId)          C
```

plus, in the same batch, a compensating `supplierPayments` row (amount C, `kind: "reversal"` — one optional field added to `SupplierPayment`, the debit-side analogue of the negative credit rows F-6 already lives with) so `supplierBalance` restores with the journal. An out-cheque already cleared cannot "bounce" — money has moved; a refund from the supplier is an ordinary receipt negotiation, out of Phase B scope. An **expense** paid by out-cheque issues as `Dr expense_<category> / Cr cheques_issued` inside the host expense entry (the expense's F-5 reversal machinery finds it by refId as usual) and thereafter follows the OUT lifecycle, its clearing crediting the drawn-on account.

New `JournalRefType` values: `"purchase_return"`, `"cheque_clearing"`, `"cheque_bounce"`, `"cheque_return"`. Capture/issuance reuse host refTypes by design.

### 4.4 PDC handling & registry views

`dueDateISO` is the instrument's own date; nothing in the journal is dated by it (entries carry their real instant, per the A5 discipline — a PDC received today books today into `cheques_in_hand`). Registry views, all derived from the collection + today's date:

| View | Derivation |
|---|---|
| In drawer | direction in, status `received` |
| At bank | direction in, status `deposited` |
| Issued, pending | direction out, status `issued` |
| **Overdue / due** | status ∈ {received, deposited, issued} AND `dueDateISO` ≤ today (clearable now) — with a stricter "past due & still uncleared" highlight when `dueDateISO` < today |
| Cleared / Bounced / Returned | terminal statuses, by period |

Finance gains the two balances the COA already supports (`cheques_in_hand` = money owed to the shop by banks/customers' instruments; `cheques_issued` = instruments outstanding against the shop) — both are ordinary `accountNormalBalance` reads, no new selector concept. Day close: cheque parts never touch a money account until clearing, so the JOURNAL-derived expected cash (A2) is correct by construction; the operational cross-check (`dayCloseSummary`) must learn to exclude instrument-stamped payment parts from its cash/wallet buckets — a named B5 task (§9), with the journal figure authoritative where the two disagree on clearing days (clearing has no operational doc — a documented cross-check limitation, same honesty class as A5's offline residual).

---

## 5. Payment receipts (vouchers)

### 5.1 Decision: stamp the payment row; the receipt is a print of the row

A رقم وصولی (receipt voucher) or ادائیگی (payment voucher) receipt documents a posting that already exists — a `credits` repayment row or a `supplierPayments` row. Phase B therefore creates **no voucher collection and no posting**: at creation, the store action that writes a repayment stamps `voucherNo` ("RV-n") onto the `CreditEntry`, and the action that writes a supplier payment stamps `voucherNo` ("PV-n") onto the `SupplierPayment` (both fields optional; rows written before Phase B simply have none and print unnumbered — Phase B does not fabricate numbers for history it did not witness, per invariant 5). One record per money event stays the rule; the receipt can never drift from the ledger because it IS the ledger row, printed.

Scope: repayments and supplier payments, as the roadmap names. Expense payments and bill receipts keep their existing surfaces (the bill receipt already exists; an expense voucher is a later reuse of the same print, not Phase B scope).

### 5.2 Receipt content

Reusing the receipt sheet (§5.3): shop header (settings profile), voucher title + number, date, party name, **amount in figures**, the **method** — and for money methods the **money account's name** (the A2 stamp resolved for display; for a cheque-settled voucher: cheque number, bank, due date) — a note line, and the **balance after**: the customer's outstanding (or the supplier's remaining payable) computed from the subledgers as of the print moment. "Balance after" is the line customers actually keep receipts for; it is derived at print time and labelled as the current balance, never stored.

### 5.3 Print machinery reuse

All Phase B prints — quotation, sale order, challan (quantities only), notes, vouchers — render through the existing receipt-sheet component pattern (`.receipt` / `.receipt-80`, shop header from settings, `window.print()`), and inherit the A4 tax-line rendering (`billTaxLines` grouping) wherever tax appears (notes; order/quotation estimates labelled as estimates). Phase E will restyle prints globally; Phase B's duty is that every document HAS a correct print, not a designed one.

---

## 6. RBAC & rules

### 6.1 Verification against the pre-declared matrix

The six Phase B rows in `lib/permissions.ts` (written in A3, from Phase A design §3.2) were re-read against this design's surfaces:

| Matrix row | O / M / C / A | Phase B surfaces it governs | Verdict |
|---|---|---|---|
| `quotations` | F / F / F / R | Quotations CRUD + convert | ✓ sufficient |
| `saleOrders` | F / F / F / R | Sale orders CRUD + convert; **delivery challans ride this row** (gap G-1) | ✓ with G-1 |
| `purchaseOrders` | F / F / N / R | PO CRUD + convert-to-receipt action's document side | ✓ sufficient |
| `creditDebitNotes` | F / F / N / F | Note issuance (wraps returns / purchase returns) + note prints | ✓ with G-2 |
| `vouchers` | F / F / F / F | Voucher stamping + prints (no money moves) | ✓ sufficient |
| `cheques` | F / F / N / F | Registry surface + lifecycle transitions | ✓ with G-3 |

**Gaps & resolutions (flagged, none blocking):**

- **G-1 — no `challans` row exists.** Phase A design §3.2 listed "Sale orders / delivery challans" as one row, and `permissions.ts` encodes it as `saleOrders` only. Resolution: challan surfaces gate on `can(role, "saleOrders", …)` in client and rules alike; the row is the document-chain row for the sales side. If finer control is ever wanted, a `challans` row is an additive matrix change — not needed now.
- **G-2 — note issuance must gate on `creditDebitNotes`, not on `returns`.** The existing return actions gate on the `returns` row (accountant: none) — but the matrix deliberately gives the **accountant** full note rights. Resolution: note-issuing store actions (the formal return-with-note flow and the purchase-return flow) check `can(role, "creditDebitNotes", "write")` at the action boundary; the underlying engine functions stay permission-agnostic internals, as they already are below their action wrappers. Implementation must not re-check `returns` inside the note path, or the accountant's row is a lie.
- **G-3 — cheque CAPTURE is wider than the `cheques` row, by necessity (rules-level).** A cashier (cheques row: none) legitimately takes a cheque at the billing desk (billing row: full) — and the registry doc is written inside the bill's batch, which rules cannot decompose. Resolution, following the exact precedent of rules v3's `credits` grant (§3.3 of Phase A: where rules cannot distinguish, the grant is wider and the restriction lives in the client + templates): rules allow cheque **create** to `canAccess` (all roles), while lifecycle **updates** and the registry surface are gated to owner/manager/accountant. The cashier can create a cheque record only as part of a sale their role already permits, and can never deposit/clear/bounce one. This widening must be called out in the B5 rollout note so it is not later "fixed" by mistake.
- **G-4 — vouchers for roles whose payment rows they print.** `vouchers` is full for all roles, but a cashier prints vouchers only for repayments (their `creditRepayment` row is full; `supplierPayments` is none) — the print surface follows the underlying row's visibility, the voucher stamp adds no access. No change needed; stated so the B6 UI does not invent a standalone voucher list that leaks supplier payments to cashiers.

### 6.2 Rules additions (additive, v3 style — drafted here, not yet applied)

Same posture throughout: reads `canAccess` unless the matrix narrows them; updates/deletes never period-gated (v3 doctrine); the A5 create-guard applies ONLY where a create posts money.

```
match /quotations/{id}      read: canAccess · write: hasRole(owner, manager, cashier)
match /saleOrders/{id}      read: canAccess · write: hasRole(owner, manager, cashier)
match /challans/{id}        read: canAccess · write: hasRole(owner, manager, cashier)
match /purchaseOrders/{id}  read: canAccess · write: hasRole(owner, manager)
   — no period guard on any of the four: they post nothing (§7).

match /notes/{id}           read: canAccess
                            create: hasRole(owner, manager, accountant) && createInOpenPeriod
                            update, delete: isOwner   (posted records; mirrors `returns`)
match /purchaseReturns/{id} read: canAccess
                            create: hasRole(owner, manager, accountant) && createInOpenPeriod
                            update, delete: isOwner   (mirrors `returns`)

match /cheques/{id}         read: canAccess
                            create: canAccess && createInOpenPeriod   (G-3)
                            update: hasRole(owner, manager, accountant)
                            delete: isOwner  (store never deletes a posted cheque;
                                              owner-only is the safety posture)
```

Existing collections need **no** rules changes: converted bills/purchases are ordinary `bills`/`purchases` creates (already role-gated + period-guarded); the new optional fields (`sourceType`, `voucherNo`, `instrument`, …) ride inside documents the rules already govern. Journal create stays `canAccess` + `journalCreateInOpenPeriod` — cheque/note entries flow through it unchanged. **Rollout order is the standing one (R-1 discipline): the rules additions publish BEFORE the Phase B build that first writes each collection** — per increment (§9), not all at once.

---

## 7. Period-lock & tax interplay

- **Postings refuse into locked periods through the existing machinery — and only postings exist to refuse.** Conversions compose their journal entries at the conversion instant (today) and pass `guardPostings` like every action; the rules backstop double-covers the `bills`/`purchases`/`notes`/`purchaseReturns`/`cheques` creates. A lock can never cover today (A5's rail), so a conversion is refused only in the pathological backdating case — which document flows never attempt (documents carry their own dates as DATA; the posting is always now).
- **Non-posting documents ignore the lock entirely.** A quotation may be created, issued or converted-to-order inside a locked period — it asserts nothing financial. An order's conversion TO A BILL inside a locked period is a posting and obeys the guard (which, per above, passes at today's date; the guard's bite is reserved for genuinely backdated flows like expense edits — Phase B adds none).
- **Corrections of Phase B postings follow the standing reversal discipline:** a note posted in what later becomes a closed period is corrected by a compensating document at today's date (§3.3), never by editing the note; a cheque that bounces after its capture period closed posts its bounce entry at today's date — the closed period's totals are untouched, exactly as A5 designed.
- **Tax resolves at bill/receipt time — stated as a rule of the chain.** Quotation, order, challan and PO figures are **estimates**: their `estimatedTax` is a live recomputation against CURRENT slab resolution for display, is labelled an estimate on screen and print, and is never snapshotted as a promise. The binding tax computation happens once, inside `postBill` / `recordPurchase`, via the A4 engine, and snapshots onto the bill/purchase lines. If slabs, defaults or a product's tax fields change between quotation and billing, the bill is right and the estimate was an estimate. Note prints inherit the A4 return shares (tax actually reversed), never estimates.

---

## 8. i18n — new dictionary-key categories (enumerated, not written)

All Phase B UI strings go through the typed dictionaries (EN/UR parity is compile-enforced); journal memos remain data-layer English per the standing residual. No new `fin.acct.*` labels are needed — `cheques_in_hand` / `cheques_issued` were labelled in Phase A. Estimated ≈ 190–240 new keys across:

- **Navigation:** entries for quotations, sale orders, delivery challans, purchase orders, notes, cheques (+ sidebar regrouping labels if the chain gets its own group).
- **Shared document chrome:** status words (draft / issued / confirmed / open / dispatched / converted / partially fulfilled / fulfilled / received / cancelled / posted), "Draft" watermark, estimate disclaimer line, source-document reference labels ("from quotation QT-…"), remaining/fulfilled quantity labels, convert actions (to order / to challan / to bill / to receipt), cancel + reissue confirmations, empty states.
- **Quotations:** title, fields (valid-until, terms/note), issue/accept/reject actions, validity + expiry notices, print/share labels.
- **Sale orders:** title, expected-date field, fulfilment summaries (delivered / billed / remaining per line), partial-conversion notices.
- **Challans:** title, dispatch action, vehicle/driver fields, delivered-quantity labels, print (quantities-only) labels, billed-state labels.
- **Purchase orders:** title, expected-date, receive action, remaining-to-receive labels, agreed-cost labels.
- **Notes:** credit/debit titles, original-document reference labels, settlement labels (cash refund / udhaar reduction / payable offset), reason labels, totals + tax-reversed labels, print labels.
- **Cheques:** registry title, direction labels, status labels (received / deposited / issued / cleared / bounced / returned), form fields (cheque number, bank, issue date, due date), the payment-picker "cheque" option + its capture fields, lifecycle actions (deposit / mark cleared / bounce / return) + confirmations, bank-charges label, view filters (in drawer / at bank / pending / overdue / cleared / bounced), overdue badges, bounce notes.
- **Vouchers:** receipt-voucher / payment-voucher titles, amount + balance-after labels, method/account display labels (reusing A2 account names as data), print actions.
- **Errors & notices:** conversion refused (nothing remaining / insufficient stock at billing / over-conversion), invalid cheque transition, note-issuance denials — reusing the A5 period-locked string where the guard fires.

---

## 9. Implementation order — increments B1…B6

Each increment: independently shippable (distinct zip, PRODUCTION.md update, rules published first where it adds a collection), and closes with its finance-audit checkpoint. The seed identities (invariant 6) are re-verified at EVERY checkpoint.

### B1 — Non-posting documents I: types, numbering, quotations & sale orders
- Types (§1.2), series/prefix resolution (§1.3), `quotations` + `saleOrders` collections (subscriptions + demo shape; demo storage key v5 → v6), CRUD + lifecycles, quotation → sale order conversion (partial allowed, derivation §2.1), prints for both.
- **Rules:** the two matches of §6.2, published first.
- **Audit checkpoint (the zero-posting proof):** harness drives create/edit/issue/convert/cancel across both types and asserts the journal is byte-identical before/after, stock is unchanged, no credits/purchases rows exist; numbers mint sequentially per series and drafts burn none; RBAC scenario walk (accountant read-only, cashier full on both rows).

### B2 — The posting seam: challans + conversion to bills
- `challans` collection + CRUD/dispatch; `BillLineInput.unitPrice` override (§2.4); conversion actions order→bill, challan→bill, quotation→bill, order→challan — source status recomputed in the posting batch; `Bill.sourceType/sourceId`; the derived availability selector (on-hand − promised).
- **Rules:** `challans` match, published first.
- **Audit checkpoint:** a bill converted from a challan posts **exactly once** (one journal entry, stock decrement == billed qty, one set of sale rows); order-priced lines post the AGREED price while shelf price differs (worked example §2.6 reproduces); a slab changed between order and bill → the bill carries the NEW tax (§7); double-conversion of the same lines posts nothing the second time (remaining derivation refuses pre-composition); partial conversions across two bills sum exactly to the order; the challan itself posts nothing; seed identities intact.

### B3 — Purchase orders + receipt linkage
- `purchaseOrders` collection + CRUD/issue; convert PO → `recordPurchase` (existing engine; the `Purchase` cites `sourcePoId`; status recomputed in the action); partial receipts.
- **Rules:** `purchaseOrders` match, published first.
- **Audit checkpoint:** a PO receipt's journal entry is line-for-line the direct-purchase entry for the same goods (template identity, incl. A4 tax at receipt-time resolution); over-receipt refused pre-composition; two partial receipts sum to the PO exactly; supplier payable after receipts == Σ receipt gross totals; no PO action alone posts anything.

### B4 — Formal notes: credit notes wrap returns; debit notes + purchase-return engine
- Note minting inside the return batch (§3.1) + note prints; `returnPurchaseItems` engine + `purchaseReturns` collection + `purchaseReturnTaxShares` in `lib/tax.ts`; selector amendments (supplierBalance / payablesAging net of returns, §3.2); debit-note minting; notes list surface.
- **Rules:** `notes` + `purchaseReturns` matches, published first.
- **Audit checkpoint:** for every existing harness return scenario, the minted credit note's figures EQUAL the engine's (goods/tax/total to the paisa, incl. item-by-item taxed returns); debit scenarios — stock leaves at in-cost, journal payables ≡ subledger payables after offset and after cash refund, item-by-item purchase returns reverse `tax_input` cumulatively to the paisa, a fully-returned purchase leaves supplier balance exactly 0; note issuance gates on `creditDebitNotes` (accountant CAN, cashier CANNOT — G-2); seed identities intact.

### B5 — Cheque registry + instrument capture
- `cheques` collection + capture stamps on `BillPayment`/`SupplierPayment`/`Expense`/`CreditEntry`; lifecycle actions (deposit / clear / bounce / return) with §4.3 templates; registry surface + views (§4.4); Finance cheque balances; day-close cross-check exclusion of instrument parts.
- **Rules:** `cheques` match (with the G-3 create grant), published first + called out in the rollout note.
- **Audit checkpoint:** full lifecycle scenario — a cheque settles a bill (books balance; `cheques_in_hand` == Σ registry uncleared, to the rupee), deposit posts nothing, clearing moves exactly C into the chosen money account; bounce restores the receivable to the paisa in BOTH derivations (journal + credits rows) and the F-6 lot computation still holds on that bill; an issued cheque settles the payable at issuance (journal ≡ subledger), clearing moves the drawn-on account exactly, pre-clearing bounce restores both derivations; charges post as their own balanced entry; bounce-after-clear and clear-before-deposit transitions refused; PDC overdue derivation correct at date edges.

### B6 — Payment vouchers + document prints polish
- `voucherNo` stamping on repayment/supplier-payment creation (RV-/PV- series, §5.1); voucher prints with balance-after (§5.2); print pass over all Phase B documents; WhatsApp share for quotations reusing the bill message pattern (stretch — only if it lands without new machinery).
- **Rules:** none (fields ride existing documents).
- **Audit checkpoint:** voucher numbers sequential per series and unique across a mixed repayment/payment workload; a voucher print's figures equal its source row's (amount/method/account) exactly; no journal writes occur anywhere in this increment (journal byte-identical across a voucher-only session); pre-B rows print unnumbered without error.

---

## 10. Migration

**There is almost nothing to migrate — by design.**

- **New collections only:** `quotations`, `saleOrders`, `challans`, `purchaseOrders`, `notes`, `purchaseReturns`, `cheques`. Existing shops simply have none until first use; subscriptions over absent collections are empty lists, as every Phase A collection began.
- **Owner-doc additions:** `docSeries?` (prefix overrides — absent ⇒ defaults; written only when the owner edits a prefix) and **no Phase B flags**: no step backfills, rewrites or revalues anything, so the `phaseA`-style resumable-migration machinery has nothing to do. If a future increment ever needs a backfill it will follow the flag pattern then.
- **Existing documents untouched:** bills gain `sourceType/sourceId` only when created BY a conversion; purchases gain `sourcePoId` only from a PO receipt; payment rows gain `instrument`/`chequeId`/`voucherNo` only when those features are used. Every pre-B document is read exactly as before.
- **Seed/demo:** fresh seeds and the demo gain the new collections empty, plus a small discoverability set in DEMO data only (one issued quotation, one open order with a dispatched challan, one in-cheque in the drawer) — documents with no journal footprint, so the frozen seed journal and its SHA are untouched by construction.
- **Journal:** two new account codes are USED for the first time (`cheques_in_hand`, `cheques_issued` — declared in A1, zero-balance everywhere until B5) and four new `refType` values appear (`purchase_return`, `cheque_clearing`, `cheque_bounce`, `cheque_return`). No existing entry changes meaning.

---

## 11. Risk list

| # | Risk | Severity | Mitigation in this design |
|---|---|---|---|
| R-B1 | Conversion half-lands (bill posts, source status stale) and a second conversion double-bills the same lines. | High | Source status recomputed in the SAME batch as the posting (§2.2); quantities derive from children, so even a stale label cannot authorise an over-conversion — the derivation, not the label, gates the desk (§2.1). B2 harness double-convert scenario is a ship gate. |
| R-B2 | Dual-derivation drift on the purchase side (journal payables vs subledger) when debit notes land — the F-5 failure shape. | High | B4 amends `supplierBalance`/`payablesAging` in the SAME increment as the engine and asserts journal ≡ subledger after every scenario (§3.2, §9 B4). |
| R-B3 | Cheque bounce interacts with a bill that was itself returned/voided: F-6 lot arithmetic must absorb the bounced credit row without double-restoring receivables. | Medium | Bounce routes through a `credits` row in the bill's own lot (§4.3) so the existing, harness-proven `billCreditOutstanding` computes over it; B5 checkpoint includes bounce-then-return and return-then-bounce orderings. |
| R-B4 | The `unitPrice` override (§2.4) becomes a general price-tampering surface. | Medium | Only conversion actions pass it; the desk gains no price field in Phase B; the bill prints what was charged, and below-cost conversions surface in the P&L as negative margin — visible, not hidden. |
| R-B5 | Number collisions across offline/racing devices (the accepted `billNo` exposure, now in 8 series). | Low | Numbers mint at issue-time (a deliberate, usually single-desk act), doc ids remain the identity (§1.3); documented, not hidden. |
| R-B6 | The G-3 rules widening (cheque create for all roles) is later mistaken for a bug and "tightened", breaking cashier bill batches that include a cheque part. | Low | Called out in §6.1 and mandated in the B5 rollout note; rules comment carries the reason, per v3's commenting discipline. |
| R-B7 | Day-close operational cross-check misreads cheque parts / clearing days (no operational doc exists for a clearing). | Low | B5 explicitly excludes instrument parts from the cross-check buckets; the journal-derived figure (A2) is authoritative and correct by construction (§4.4). |
| R-B8 | Estimates on quotations/orders are read by customers as fixed tax-inclusive quotes; a slab change before billing makes the bill differ from the paper the customer holds. | Low | Estimates are labelled on screen and print (§7); prices and discounts — the terms the shop actually promises — DO hold (§2.4). Tax is a government levy, and the design says so in the document copy. |

---

## 12. What Phase B deliberately does NOT do

- **No in-transit / goods-out stock accounting** (§2.5) — that question returns, if anywhere, with Phase C warehouse transfers, on its own design.
- **No warehouse dimension on any document** — lines are product quantities; Phase C adds locations without changing Phase B's document shapes (source citations and derivations are location-agnostic).
- **No customer-facing approval links / online quotation acceptance** — acceptance is recorded at the desk.
- **No recurring orders, no partial bill PAYMENTS against orders** — an order's money life begins at its bill, where the existing split-payment/udhaar machinery already lives.
- **No expense vouchers, no bill re-prints beyond the existing receipt** (§5.1 scope).
- **No Flutter changes** (Phase F) — but, as with Phase A, every Phase B shape is a data-layer contract (collections, stamps, derivations) the Flutter client will consume as-is.
- **No change to the returns/void engine's templates** — credit notes formalize its output; debit notes mirror it. If B4 finds the mirror needs an engine change, that is a finding to report, not a liberty to take silently.
