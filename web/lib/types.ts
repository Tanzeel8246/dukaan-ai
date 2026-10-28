/** Dukaan AI — shared domain types. */

export interface Product {
  id: string;
  sku: string;
  name: string;
  urduName: string;
  category: string;
  unit: string; // "pcs" | "kg" | "L" | "dozen" | "packet" | "bag"
  costPrice: number; // PKR (what the shop paid)
  salePrice: number; // PKR (selling price)
  stockQty: number; // current on-hand quantity
  reorderLevel: number; // at or below this => low-stock alert
  keywords: string[]; // EN + UR keywords for the AI assistant
  /** Optional expiry date (YYYY-MM-DD) for perishables. */
  expiryDate?: string | null;
  /** Phase A · A4 (design §2.2): explicit tax slab override for this
   *  product; null/absent = the shop default for the direction.
   *  Absent on every pre-A4 product ⇒ resolved as shop default, so
   *  no product migration exists. */
  taxSlabId?: string | null;
  /** Phase A · A4: true = never taxed — overrides slab + defaults. */
  taxExempt?: boolean;
  /** Phase C · C3 (design §4.1): the product's stock CLASS.
   *  "raw" = raw material, held for consumption by production —
   *  its stock value sits in the `inventory_raw` GL account.
   *  Absent/null = "goods" (resale goods AND finished products) —
   *  value sits in `inventory`. Every pre-C3 product is goods, so
   *  no product migration exists; the class generalisation in the
   *  posting templates (via `inventoryAccountFor`) is byte-identical
   *  for a shop with no raw products. */
  stockClass?: "raw" | null;
}

export interface Sale {
  id: string;
  productId: string;
  qty: number;
  unitPrice: number; // sale price at time of sale (PKR)
  total: number; // qty * unitPrice (PKR)
  /** Cost price snapshot at time of sale (PKR/unit) — COGS source. */
  unitCost?: number;
  /** Set when the sale came from a bill (Billing desk). */
  billId?: string | null;
  /** "sale" (default) or "return" (negative reversal row from a bill return). */
  kind?: "sale" | "return";
  /** 0 = today, 1 = yesterday, ... The store converts this to a real date at
   *  runtime so the demo's "today" is always fresh. */
  dayOffset: number;
  /** Fixed ISO timestamp (PKT) from seed generation; kept for Firestore. */
  ts: string;
}

export interface ForecastRow {
  product: Product;
  avgDaily: number; // 7-day moving average (units/day)
  daysOfStock: number; // stockQty / avgDaily (Infinity when avgDaily = 0)
  suggestedReorder: number; // units to cover 14 days + safety buffer
  status: "critical" | "low" | "ok";
}

/* ==========================================================================
 * COMPLETE EDITION — billing, suppliers, finance, customers, journal.
 * Every money-bearing record carries `dayOffset` (0 = today) + `ts` like
 * Sale does, so demo dating and Firestore history behave identically.
 * ========================================================================== */

export type PayMethod = "cash" | "jazzcash" | "easypaisa" | "bank" | "credit";

/** Wallet-style methods settle into the journal `wallet` account. */
export const WALLET_METHODS: PayMethod[] = ["jazzcash", "easypaisa", "bank"];

/* ---------------- Billing ---------------- */

export interface BillItem {
  productId: string;
  name: string; // snapshot
  qty: number;
  unitPrice: number;
  unitCost: number; // snapshot
  total: number;
  /* Phase B (design §2.1): on bills composed by a conversion, the
   * parent document line this line answers (line identity across
   * documents is by product). Absent on every direct desk bill. */
  sourceProductId?: string | null;
  /* Phase A · A4 (design §2.2/§2.3): the resolved slab is SNAPSHOTTED
   * onto the line, exactly like unitCost — later slab edits never
   * rewrite history. `taxAmount` is this line's tax on its
   * post-discount base (0 when untaxed). On SaleReturn rows,
   * `taxAmount` instead carries the tax share that return reversed. */
  taxAmount?: number;
  taxSlabId?: string | null;
  taxSlabName?: string | null; // snapshot (receipts print it verbatim)
  taxRate?: number;
  taxKind?: "percent" | "fixed";
  taxInclusive?: boolean;
}

/** Phase B · B5 (design §4.2): the cheque details captured in-line
 *  at a payment desk when a payment part's instrument is a cheque.
 *  INPUT ONLY — the store consumes the draft, creates the registry
 *  doc (`Cheque`) in the host posting's own batch, and stamps the
 *  payment row with `instrument` + `chequeId`; the draft itself is
 *  never stored on the row (the registry doc is the record). */
export interface ChequeDraft {
  chequeNo: string; // the leaf number, as text
  bankName: string; // issuing bank (in) / own bank (out)
  issueDateISO: string; // date written on the cheque (YYYY-MM-DD)
  dueDateISO: string; // PDC date — when it may clear; may be future
}

export interface BillPayment {
  method: PayMethod;
  amount: number;
  /**
   * Phase A · A2: the money account this payment settled into,
   * resolved at posting time (the journal line's `ref` is the
   * authoritative copy; this stamp is for display/receipts).
   * Absent/null on pre-A2 bills — resolves via the method default.
   * Always null on a cheque part: no money account is involved
   * until the cheque clears (Phase B · B5).
   */
  accountId?: string | null;
  /**
   * Phase B · B5 (design §4.2): "cheque" becomes a payment
   * INSTRUMENT, not a new PayMethod — the part's journal line posts
   * to `cheques_in_hand` (ref: chequeId) instead of a money
   * account. `cheque` carries the capture draft on INPUT only.
   */
  instrument?: "cheque" | "points";
  chequeId?: string | null;
  cheque?: ChequeDraft | null;
  /**
   * Phase H · H1 (design §1.2/§1.3): on a `points` instrument part,
   * the number of points the customer tenders. The part's `amount`
   * is the RUPEE value those points carry — the FIFO value over the
   * customer's unspent vintages at their snapshot rates, computed by
   * lib/loyalty's quote and re-validated by the store at posting
   * (the amount is never typed freehand past the derivation). The
   * part's journal line posts Dr `loyalty_payable` (ref: customerId)
   * in place of a money line, exactly as a cheque part posts to
   * `cheques_in_hand`; the part's `method` rides as the desk's
   * carrier ("cash") and settles nothing.
   */
  loyaltyPoints?: number | null;
}

export type BillStatus = "paid" | "held" | "voided" | "partially_returned" | "returned" | "unpaid" | "partial";

export interface Bill {
  id: string;
  billNo: number;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  items: BillItem[];
  subtotal: number;
  discountType: "flat" | "percent";
  discountValue: number;
  discountAmount: number;
  /** Phase A · A4: Σ line taxes (exclusive + inclusive). Absent on
   *  pre-A4 bills ⇒ 0. `total` = subtotal − discountAmount +
   *  EXCLUSIVE tax (inclusive tax is already inside the prices). */
  taxAmount?: number;
  total: number; // subtotal - discountAmount (+ exclusive tax, A4)
  payments: BillPayment[];
  status: BillStatus;
  /** Qty already returned per productId (for partial returns). */
  returnedQty?: Record<string, number>;
  /* Phase B (design §2.1): conversion citation — set ONLY on bills
   * composed from a source document (B1: sale orders). Absent/null
   * on every pre-B bill ⇒ a direct desk bill, unchanged. Fulfilment
   * quantities DERIVE from these citations (lib/documents). */
  sourceType?: "order" | "challan" | "quotation" | "job" | null;
  sourceId?: string | null;
  /* Phase C · C1 (design §1.6): the ONE warehouse this bill's stock
   * left from. Stamped resolved (a concrete id) on every C1 bill;
   * absent/null on pre-C bills ⇒ the default warehouse, which is
   * where their stock physically is by the migration's
   * construction. Returns/voids restore to this warehouse. */
  warehouseId?: string | null;
  dayOffset: number;
  ts: string;
}

export interface SaleReturn {
  id: string;
  billId: string;
  billNo: number;
  items: BillItem[];
  /** Cash/wallet part of the refund (after any udhaar reduction). */
  refundAmount: number;
  /** Portion of the refund settled by reducing the bill's udhaar part. */
  creditReduction?: number;
  /** Phase H · H1 (design §1.4): the portion of the refund settled
   * by re-crediting loyalty points (rupees + the point count) —
   * points come back as points, never as cash. Absent/0 on returns
   * of bills that carried no points tender. Operational stamps:
   * the journal entry is the truth; these keep the return's total
   * settlement (refund + udhaar reduction + points) readable and
   * the clawback's cumulative basis exact. */
  loyaltyRecreditRs?: number;
  loyaltyRecreditPoints?: number;
  method: "cash" | "jazzcash" | "easypaisa" | "bank";
  /** A2: money account the cash/wallet refund part left from. */
  accountId?: string | null;
  dayOffset: number;
  ts: string;
}

/* ---------------- Suppliers & purchasing ---------------- */

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  company: string;
  notes: string;
  ts: string;
}

export interface PurchaseItem {
  productId: string;
  name: string; // snapshot
  qty: number;
  unitCost: number;
  total: number;
  /* Phase A · A4: slab snapshot + this line's input tax, same
   * discipline as BillItem. For an exclusive slab `total` is the net
   * goods value; for an inclusive slab `total` is the sticker amount
   * and the goods value is total − taxAmount. */
  taxAmount?: number;
  taxSlabId?: string | null;
  taxSlabName?: string | null;
  taxRate?: number;
  taxKind?: "percent" | "fixed";
  taxInclusive?: boolean;
}

export interface Purchase {
  id: string;
  supplierId: string;
  items: PurchaseItem[];
  /** Phase A · A4: `total` is redefined as the GROSS owed to the
   *  supplier (net goods + tax) — `supplierBalance` (purchased −
   *  paid) therefore tracks the gross, as the design requires.
   *  Pre-A4 purchases carry no tax, so gross == net == total and
   *  nothing moves for them. */
  total: number;
  /** Phase A · A4: goods value net of tax (absent pre-A4 ⇒ = total). */
  netTotal?: number;
  /** Phase A · A4: Σ line input taxes (absent pre-A4 ⇒ 0). */
  taxAmount?: number;
  note: string;
  /* Phase B (design §2.1): set ONLY on goods receipts composed from
   * a purchase order (B3) — the citation PO fulfilment derives from.
   * Absent on every pre-B purchase ⇒ a direct receipt, unchanged. */
  sourcePoId?: string | null;
  /* Phase C · C1 (design §1.6): the warehouse this receipt's stock
   * landed in (resolved concrete id on C1 receipts; absent ⇒ the
   * default warehouse). Purchase returns send goods back out of
   * THIS warehouse. */
  warehouseId?: string | null;
  dayOffset: number;
  ts: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  amount: number;
  method: "cash" | "jazzcash" | "easypaisa" | "bank";
  /** A2: money account the payment left from. Phase B · B5: on a
   *  cheque payment this is the account the cheque is DRAWN ON
   *  (captured at issuance; the money leaves it only at clearing). */
  accountId?: string | null;
  /**
   * Phase B · B5 (design §4.3): set ONLY on the compensating row
   * written when an issued cheque bounces — the debit-side analogue
   * of F-6's negative credit rows. `supplierPaid` NETS reversal
   * rows out (amount stays positive; the kind carries the sign),
   * so the subledger payable re-opens in step with the journal.
   */
  kind?: "reversal";
  /** Phase B · B5 (design §4.2): paid by cheque — the issuance
   *  entry credits `cheques_issued` (ref: chequeId), never a money
   *  account. `cheque` is the capture draft, INPUT only. */
  instrument?: "cheque";
  chequeId?: string | null;
  cheque?: ChequeDraft | null;
  /** Phase B · B6 (design §5.1): the payment-voucher number
   *  ("PV-n", the `paymentVoucher` series) stamped by
   *  `recordSupplierPayment` at creation, inside the same write as
   *  the row itself. A stamp on the ledger row — the voucher IS
   *  this row, printed; there is no voucher collection and no
   *  posting. Absent on rows written before B6 (they print
   *  unnumbered) and on `kind: "reversal"` compensating rows,
   *  which are not payments. */
  voucherNo?: string | null;
  note: string;
  dayOffset: number;
  ts: string;
}

/* ---------------- Customers & credit (udhaar) ---------------- */

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  note: string;
  ts: string;
  /** Phase H · WhatsApp (design §3.2): marketing consent —
   *  absent/false means NO marketing, ever. Transactional
   *  messages (bill shares, order updates) are not marketing
   *  and are untouched by this flag. Granted only by a capture
   *  the customer agreed to (counter / storefront conversion);
   *  an import can NEVER set it — lib/whatsapp's sanitizer
   *  strips any consent claim from imported rows, so a bought
   *  list cannot launder consent through a spreadsheet. */
  waOptIn?: boolean;
  /** When the current consent state was stamped (ISO). */
  waOptInAt?: string;
  /** Where the consent was captured. "import" is deliberately
   *  NOT a member: no code path may stamp it (design §3.2's
   *  capture list names an import column, but the §6 checkpoint
   *  rules that import never sets opt-in — the checkpoint
   *  governs). */
  waOptInSource?: "counter" | "storefront";
}

export interface CreditEntry {
  id: string;
  customerId: string | null;
  customerName: string; // snapshot
  customerPhone: string;
  /** "credit" = udhaar given, "repayment" = money back. Negative credit
   *  amounts appear only as bill-void reversals. */
  kind: "credit" | "repayment";
  amount: number;
  method?: "cash" | "jazzcash" | "easypaisa" | "bank"; // repayments
  /** A2: money account involved — repayments settle into it; a
   *  standalone udhaar (cash loan) leaves from it (the till).
   *  Null on a cheque repayment (B5): the money account is chosen
   *  at DEPOSIT and lands only at clearing. */
  accountId?: string | null;
  /** Phase B · B5 (design §4.2): a repayment received by cheque —
   *  its entry debits `cheques_in_hand` (ref: chequeId) against
   *  receivables. Also stamped on the COMPENSATING credit rows a
   *  bounce/return writes (they cite the cheque they restore). */
  instrument?: "cheque";
  chequeId?: string | null;
  /** Phase B · B6 (design §5.1): the receipt-voucher number
   *  ("RV-n", the `receiptVoucher` series) stamped by
   *  `addRepayment` at creation, inside the same write as the row
   *  itself — repayments only (`kind === "repayment"`); udhaar
   *  given and compensating rows carry none. A stamp, not a
   *  posting: the voucher IS this row, printed. Absent on rows
   *  written before B6 — they print unnumbered. */
  voucherNo?: string | null;
  note: string;
  billId: string | null;
  dayOffset: number;
  ts: string;
}

/* ---------------- Expenses & cash book ---------------- */

export type ExpenseCategory = "rent" | "electricity" | "salary" | "transport" | "other";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "rent",
  "electricity",
  "salary",
  "transport",
  "other",
];

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  method: "cash" | "jazzcash" | "easypaisa" | "bank";
  /** A2: money account the expense was paid from. Phase B · B5:
   *  on a cheque expense this is the account the cheque is DRAWN
   *  ON (the money leaves it only at clearing). */
  accountId?: string | null;
  /** Phase B · B5 (design §4.2/§4.3): paid by an issued cheque —
   *  the host expense entry credits `cheques_issued` (ref:
   *  chequeId) instead of a money account, and the instrument
   *  thereafter follows the OUT lifecycle. */
  instrument?: "cheque";
  chequeId?: string | null;
  note: string;
  dayOffset: number;
  ts: string;
}

export interface CashEntry {
  id: string;
  /** A2 adds "transfer": money moved between two money accounts
   *  (design §1.5) — `fromAccountId` → `toAccountId`, journal
   *  refType "transfer". */
  kind: "in" | "out" | "transfer";
  amount: number;
  /** GL bucket of the account involved; superseded by `accountId`
   *  (A2) — kept for legacy rows and day-close operational filters. */
  method: "cash" | "wallet";
  /** A2: the money account an in/out entry moved through. */
  accountId?: string | null;
  /** Transfer rows only. */
  fromAccountId?: string | null;
  toAccountId?: string | null;
  note: string;
  dayOffset: number;
  ts: string;
}

/* ---------------- Stock adjustments ---------------- */

export type AdjustmentReason = "damage" | "expiry" | "theft" | "correction";

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string; // snapshot
  delta: number; // signed qty change
  reason: AdjustmentReason;
  note: string;
  /* Phase C · C1 (design §1.5): the warehouse this adjustment was
   * recorded at (chosen at the adjustment desk; resolved concrete
   * id on C1 rows; absent ⇒ the default warehouse). */
  warehouseId?: string | null;
  dayOffset: number;
  ts: string;
}

/* ---------------- Day close ---------------- */

export interface DayClose {
  id: string;
  dateISO: string; // YYYY-MM-DD the close belongs to
  /** A2: the cash-kind money account this close counts (the till).
   *  Absent on pre-A2 closes ⇒ the `legacyFor: "cash"` account. The
   *  recorded `expectedCash` is the JOURNAL-derived figure for this
   *  account (design §1.4); the operational summary stays as the
   *  cross-check display. */
  accountId?: string | null;
  openingCash: number;
  /** Snapshot of the auto-computed totals at close time. */
  salesByMethod: Record<string, number>;
  expensesTotal: number;
  creditGiven: number;
  creditReceived: number;
  supplierPaid: number;
  expectedCash: number;
  countedCash: number;
  difference: number; // counted - expected
  note: string;
  dayOffset: number;
  ts: string;
}

/* ---------------- Double-entry journal ----------------
 * ONE document per financial transaction; its lines always balance
 * (Σdebit == Σcredit) and the write is a single atomic doc, which is
 * what makes the invariant enforceable. APPEND-ONLY: entries are never
 * edited/deleted from the client — corrections are reversing entries.
 */
export type AccountCode =
  | "cash"
  | "wallet" // Bank / JazzCash / Easypaisa combined settlement account
  | "sales_revenue"
  | "sales_discount"
  | "cogs"
  | "inventory"
  | "purchases"
  | "expense_rent"
  | "expense_electricity"
  | "expense_salary"
  | "expense_transport"
  | "expense_other"
  | "receivables" // subledger: credits (per customer)
  | "payables" // subledger: suppliers
  | "capital" // owner capital in
  | "drawings" // owner cash out
  | "inventory_loss" // damage / expiry / theft write-offs at cost
  /* ---- Phase A (COA v2, additive — metadata in lib/coa.ts) ---- */
  | "tax_payable" // output tax collected on sales (liability)
  | "tax_input" // input tax paid on purchases, recoverable (asset)
  | "cheques_in_hand" // received cheques not yet cleared (used Phase B)
  | "cheques_issued" // cheques issued to suppliers (used Phase B)
  | "salary_payable" // payroll accrual (used Phase D)
  | "loans_payable" // loan principal (used Phase D)
  | "expense_finance" // interest + bank/finance charges (used Phase D)
  | "inventory_raw" // raw materials (used Phase C)
  | "wip" // work-in-progress (used Phase C)
  | "retained_earnings" // fiscal-year closing target (used Phase D)
  /* Phase D · D1 (design §3.1): loans the shop LENDS. One additive
   * code — receivable loans deliberately do NOT ride `receivables`:
   * that account's subledger is the `credits` collection, and a
   * journal-only loan line there would break the journal ≡
   * subledger identity the audits assert (the F-5 drift shape). */
  | "loans_receivable" // loans receivable (used Phase D)
  /* Phase H · H1 (design §1.2): the loyalty pair — exactly two
   * codes, additive, metadata in lib/coa.ts. Points are a
   * LIABILITY the shop owes its customers: grants recognise their
   * cost at earn (Dr expense_loyalty), redemptions settle the
   * liability inside the bill entry itself. */
  | "loyalty_payable" // customer loyalty points owed (used Phase H)
  | "expense_loyalty" // loyalty programme cost (used Phase H)
  /* MC Billing workflow adoption 2026-10-27 (WEB): customer
   * advances held unearned — the [2200] equivalent. Receipt
   * splits post bill payments to `receivables` and advances
   * here; advances are NEVER netted into receivables, and old
   * advances are never restated. */
  | "customer_advances"; // customer advances, unearned (liability)

export interface JournalLine {
  account: AccountCode;
  debit: number;
  credit: number;
  /** Subledger reference id (customerId or supplierId) when relevant. */
  ref?: string | null;
}

export type JournalRefType =
  | "sale"
  | "bill"
  | "bill_void"
  | "return"
  | "purchase"
  | "supplier_payment"
  | "expense"
  | "expense_reversal"
  | "credit"
  | "repayment"
  /* MC Billing workflow adoption 2026-10-27 (WEB): a customer
   * advance receipt — Dr money / Cr customer_advances. */
  | "customer_advance"
  | "adjustment"
  | "cashbook"
  | "seed"
  /* Phase A — declared now, first posted by A2 (transfers) / A4 (tax). */
  | "transfer"
  | "tax_payment"
  /* Phase B — declared with the Phase B types, first posted by B4
   * (purchase_return) and B5 (cheque lifecycle). Capture/issuance
   * reuse the host flows' refTypes by design (§4.3). */
  | "purchase_return"
  | "cheque_clearing"
  | "cheque_bounce"
  | "cheque_return"
  /* Phase C · C2 — the short-receipt transfer loss (§2.3): the ONE
   * posting a stock transfer can ever produce. */
  | "transfer_loss"
  /* Phase C · C3 — a product class change with stock on hand moves
   * the shelf value between `inventory` and `inventory_raw` in ONE
   * documented reclass entry (design §4.1, the A §1.6 true-up form). */
  | "reclass"
  /* Phase C · C4 — production events (design §4.2): materials
   * issued into WIP, finished goods absorbed out of it, and
   * spoiled/residual value written off to `inventory_loss`.
   * Closeout residuals post as "production_scrap" too (§6.4). */
  | "production_issue"
  | "production_complete"
  | "production_scrap"
  /* Phase C · C5 — job material events (design §5.3/§6.4):
   * materials consumed by a job post to `cogs`; their return
   * mirrors. Advances add NO refType — they are ordinary
   * "repayment" entries (§5.3). */
  | "job_material"
  | "job_material_return"
  /* Phase D (design §6.4) — declared in D1, type-only: payroll
   * accruals/payments/advances (D2), loan drawdowns/charges/
   * repayments (D3) and the fiscal-year closing entry (D4) post
   * them in their increments, so no shipped client needs union
   * churn when those land. */
  | "payroll_accrual"
  | "payroll_payment"
  | "salary_advance"
  | "loan_drawdown"
  | "loan_charge"
  | "loan_repayment"
  | "fy_close"
  /* Phase H · H1 (design §1.2) — the earn family and the expiry
   * release. Earn posts at bill finalize (Dr expense_loyalty /
   * Cr loyalty_payable, ref = customerId); clawbacks ride
   * `loyalty_earn` with a NEGATIVE points payload (the sign carries
   * direction, the CreditEntry negative-credit precedent). Expiry
   * releases post from the loyalty desk (Dr loyalty_payable /
   * Cr expense_loyalty) — a cost release, never revenue.
   * Redemption adds NO refType: it is lines inside a `bill` entry. */
  | "loyalty_earn"
  | "loyalty_expire"
  /* Fix Round 1 · F5 — the one-time opening-stock recognition
   * (Dr inventory[/inventory_raw] / Cr capital), posted from the
   * fiscal panel when a shop's shelf predates its books. Unlisted
   * in the tier map (lib/plans + the rules mirror): Core — an
   * owner correcting their own opening position is not a paid
   * feature, and no rules amendment was needed. */
  | "opening_stock";

export interface JournalEntry {
  id: string;
  memo: string;
  refType: JournalRefType;
  refId: string | null;
  /** Id of the entry this one reverses (corrections only). */
  reversesId?: string | null;
  lines: JournalLine[];
  dayOffset: number;
  ts: string;
  /**
   * Phase A: business date of the event (YYYY-MM-DD, Asia/Karachi).
   * Optional — legacy entries lack it and are treated as pre-lock
   * history by the period-lock machinery (increment A5).
   */
  dateISO?: string;
  /* ---- Phase H · H1 loyalty payloads (design §1.3) ----
   * The journal carries RUPEES; points are a DERIVED view folded
   * from these payloads by lib/loyalty — no points figure is ever
   * stored on the customer doc. Every field is optional; entries
   * with no loyalty content carry none of them. */
  /** On `loyalty_earn` entries: the points this entry grants
   *  (positive) or claws back (negative — sign carries direction).
   *  On `loyalty_expire` entries: the points this release expires
   *  (positive count). */
  points?: number;
  /** On `loyalty_earn` entries with points > 0: the point's rupee
   *  VALUE snapshotted at earn time (the settings' pointValueRs
   *  then in force) — a later rate change never revalues an
   *  existing promise. The entry's rupee amount is exactly
   *  points × rsPerPoint. */
  rsPerPoint?: number;
  /** On earn entries: the programme's expiry horizon (months)
   *  snapshotted at earn time — later settings changes apply to
   *  future earns only. With `dateISO` (or `ts`) it dates the
   *  vintage's expiry for the derived due-list. */
  loyaltyExpiryMonths?: number;
  /** On earn entries: the tier multiplier that WAS applied
   *  (1 / 1.25 / 1.5) — history never re-tiers. */
  loyaltyTierMult?: number;
  /** On `bill` entries carrying a points tender: the points the
   *  bill's Dr `loyalty_payable` leg settled. */
  loyaltyPointsUsed?: number;
  /** On `return` / `bill_void` entries against a points-paid bill:
   *  the points this reversal re-credits to the customer (the
   *  fold nets them against the bill's `loyaltyPointsUsed`). */
  loyaltyPointsReturned?: number;
  /** On clawback and void earn-reversal entries (negative-points
   *  `loyalty_earn`): the bill whose earn this entry takes back —
   *  the fold shrinks exactly that bill's vintage. */
  loyaltySourceBillId?: string | null;
}

/* ---------------- Shop settings (lives on the users/{uid} doc) -------- */

/* ==========================================================================
 * ERP PHASE E — print design (design: ERP-PHASE-E-DESIGN.md §1).
 * Templates are SETTINGS, never postings: every field is optional
 * and absent reproduces today's rendering field for field. The
 * single interpretation seam is `resolvePrintDesign` in
 * lib/print.ts — no sheet reads these raw fields for a print
 * decision. The brand-asset toggles (logo/letterhead/stamp) are
 * declared here in E1; the assets themselves land in E2, the
 * Raast fields are consumed by E3.
 * ======================================================================== */

/** Paper/layout for the receipt family (bills + document sheets).
 *  Reports are always A4 and ignore this (§1.5). */
export type PrintPaper = "a4" | "a4-compact" | "a5" | "thermal80";

/** Bill stamp mode (§2.4): the stamp asserts settlement, so the
 *  default prints it only on a fully-paid bill. */
export type StampMode = "paid" | "always" | "never";

export interface PrintDesign {
  /** Paper/layout for the RECEIPT family. Default "a4". The desk's
   *  per-print thermal choice still overrides per print. */
  paper?: PrintPaper;
  /** Receipt base type scale: "standard" (today) | "large"
   *  (≈ +12.5% legibility). Structural only — never a colour or
   *  typeface change (§1.6). Default "standard". */
  fontScale?: "standard" | "large";

  /* --- header --- */
  showLogo?: boolean; // default false (no logo exists until E2)
  logoSize?: "s" | "m" | "l"; // default "m"
  showShopName?: boolean; // settings.shopName — default true
  showShopNameAlt?: boolean; // settings.shopNameAlt — default true when set
  showAddress?: boolean; // default true
  showPhone?: boolean; // default true

  /* --- item table columns (receipt family, §1.4) --- */
  colSku?: boolean; // default false
  colUrduName?: boolean; // default false
  colTax?: boolean; // default false (bill tax summary lines stay)
  colDiscount?: boolean; // default false (bill discount row stays)

  /* --- footer --- */
  footerNote?: string; // owner's words; "" = none
  termsText?: string; // owner's words; "" = none
  showThanks?: boolean; // default true (dictionary line / custom text)
  thanksText?: string; // owner's words; "" = dictionary line
  /** Authorised-signature slot on bills — default false (vouchers
   *  and salary slips keep their slots; §2.4). */
  showSignature?: boolean;

  /* --- brand slots (assets land in E2; toggles declared here) --- */
  headerMode?: "text" | "letterhead" | "logo-text"; // default "text"
  showLetterheadFooter?: boolean; // default false
  stampMode?: StampMode; // bills — default "paid"
  stampDocs?: { notes?: boolean; vouchers?: boolean; quotations?: boolean };
  // defaults: all false (§2.4); "quotations" covers orders too (one sheet family)
  signDocs?: { vouchers?: boolean; salarySlips?: boolean; bills?: boolean };
  // defaults preserve today's paper: vouchers + salary slips carry
  // the shop's ruled signature line; bills have none (§2.4)

  /* --- Raast (E3; declared here so the designer is one object) --- */
  showRaastQr?: boolean; // default false
  raastQrSize?: "s" | "m" | "l"; // default "m"
  raastDynamic?: boolean; // amount+bill-no per bill — default true (§3.4)
}

/* ==========================================================================
 * ERP PHASE E · E2 — brand assets (design: ERP-PHASE-E-DESIGN.md §2).
 * One document per asset kind in the `branding` collection (decision
 * B of §2.1: Firestore data-URLs — the only store that works
 * identically in cloud, demo and offline, and keeps the hot owner
 * doc lean). The payload is a COMPRESSED data-URL produced by the
 * pipeline in lib/branding.ts under hard per-kind caps; assets are
 * documents, never settings, and assert no money fact — a removed
 * stamp simply stops printing. The doc id IS the kind (the A2
 * fixed-id discipline). `raastQrImage` is the bank-issued QR image
 * slot (design §3.1 Path 1) — stored by the E2 machinery, consumed
 * by the Raast print slot in E3.
 * ======================================================================== */

export type BrandingAssetKind =
  | "logo"
  | "letterheadHeader"
  | "letterheadFooter"
  | "stamp"
  | "signature"
  | "raastQrImage";

export interface BrandingAsset {
  /** == kind (fixed ids — at most one asset per slot, ever). */
  id: string;
  kind: BrandingAssetKind;
  /** The compressed image, encoded per lib/branding's plan. */
  dataUrl: string;
  mime: "image/png" | "image/jpeg" | "image/webp";
  /** Encoded pixel size (display sizing + print aspect). */
  width: number;
  height: number;
  /** Encoded size in bytes — the figure Settings shows (§2.5). */
  bytes: number;
  /** ISO instant of the last replace. */
  updatedAt: string;
}

/* ==========================================================================
 * ERP PHASE H · H1 — loyalty programme settings (design §1.7).
 * The programme's commercial terms live on the owner doc's settings
 * like every other programme term (the E-era settings-object
 * pattern): owner-writable, read through lib/loyalty's resolver —
 * composers never see a hard-coded figure. Absent ⇒ the design's
 * proposed defaults (Q1): earn 1 point per Rs 100 of net payable,
 * 1 point = Rs 1, redemption capped at 50% of a bill, 12-month
 * expiry, tiers Silver ≥500 / Gold ≥2,000 trailing-12-month earned
 * points at 1.25×/1.5× earn speed. Disabling stops future earns;
 * existing balances remain redeemable and expirable for as long as
 * the liability is non-zero (a shop may leave the programme; it may
 * not strand its customers' earned value).
 * ======================================================================== */
export interface LoyaltySettings {
  enabled?: boolean;
  /** Rupees of net payable that earn ONE point (before the tier
   *  multiplier). Default 100. */
  earnRsPerPointBase?: number;
  /** What one point is worth at redemption, in rupees. Default 1.
   *  Snapshotted onto every earn entry (`rsPerPoint`) — changing
   *  it revalues only future earns. */
  pointValueRs?: number;
  /** Max share of a bill's net payable that points may cover, in
   *  percent (0–100). Default 50 — a bill is never 100% points. */
  redeemCapPct?: number;
  /** Months after earning at which a vintage expires. Default 12.
   *  Snapshotted onto every earn entry. */
  expiryMonths?: number;
  /** Tier thresholds: points EARNED in the trailing 12 months. */
  silverAt?: number; // default 500
  goldAt?: number; // default 2000
  /** Tier earn multipliers (earn speed only — a point is worth
   *  the same rupee for every tier, always). */
  silverMult?: number; // default 1.25
  goldMult?: number; // default 1.5
}

/* ==========================================================================
 * ERP PHASE H · H3 — the online storefront (design §2). The shop's
 * first public data surface, shaped as a PUBLISHED SNAPSHOT + a
 * CREATE-ONLY order inbox — never a public leg into the tenant
 * namespace. The snapshot doc lives at top-level `storefronts/{slug}`
 * (doc id = slug: uniqueness is structural, the slug immutable and
 * never recycled); orders land at top-level `storeOrders` (auto-id)
 * and become real only when a member converts one into a Phase B
 * sale order (the conversion in lib/storefront). Pure logic for
 * both lives in lib/storefront.ts.
 * ======================================================================== */

/** Stock as the world may see it: a BAND, never a count (§2.2).
 *  `hidden` = the owner excludes the product from the public store
 *  (it stays in the snapshot so a re-publish keeps the choice). */
export type StoreStockState = "in" | "low" | "out" | "hidden";

export interface StorefrontProduct {
  productId: string;
  name: string;
  /** The product's second-script name (Product.urduName) when set. */
  nameUr?: string;
  /** The ADVERTISED price (live sale price at publish time).
   *  Conversion re-prices from live data and shows drift (§2.5). */
  price: number;
  unit: string;
  category?: string;
  stockState: StoreStockState;
  sort: number;
  /** MC Billing workflow adoption 2026-10-27 (WEB, plan §17):
   *  the REAL on-hand quantity at publish time, shown numerically
   *  on the storefront. Optional so older snapshots (bands only)
   *  keep rendering; a missing count renders no qty label rather
   *  than a fake number. NOTE: this supersedes the older
   *  "bands, never counts" snapshot rule — the harness deep-scan
   *  assertion for that rule was NOT touched (out of scope) and
   *  must be updated by its owner to match this plan decision. */
  stockQty?: number;
}

/** The published snapshot — `storefronts/{slug}`. A publishing
 *  artefact assembled by the owner's client from live data; the
 *  public page renders from this doc ALONE. */
export interface StorefrontDoc {
  businessId: string;
  /** == the doc id. Immutable after claim; never recycled. */
  slug: string;
  shopName: string;
  tagline?: string;
  /** The shop's public / WhatsApp number (settings.phone). */
  phone: string;
  city?: string;
  /** The published logo image (the E2 logo asset's data URL,
   *  copied in at publish — the public page may read nothing
   *  else, so the snapshot carries what it shows). */
  logoRef?: string;
  enabled: boolean;
  publishedAt: string;
  updatedAt: string;
  currency: "PKR";
  products: StorefrontProduct[];
  notice?: string;
}

export interface StoreOrderLine {
  productId: string;
  qty: number; // 1..999 (rules-validated shape, §2.4)
}

export type StoreOrderState = "new" | "converted" | "dismissed";

/** One public order — `storeOrders/{autoId}`. Create-only for the
 *  public; the shop side reads it, converts it (exactly once) or
 *  dismisses it. It is PAPER: it posts nothing, reserves nothing,
 *  and creates no customer until conversion resolves one (§2.5). */
export interface StoreOrder {
  id: string;
  businessId: string;
  slug: string;
  customerName: string;
  phone: string;
  lines: StoreOrderLine[];
  note?: string;
  fulfilment: "pickup" | "delivery";
  /** ISO instant (written as a server timestamp by the page). */
  createdAt: string;
  /** H6: the customer's OWN WhatsApp consent tick, taken on the
   *  public checkout form. Present only when ticked, and then
   *  exactly true; absent ≡ no consent. Conversion stamps the
   *  consent (source "storefront") from this flag alone. */
  waOptIn?: boolean;
  state: StoreOrderState;
  /** Conversion stamps (the exactly-once claim, §2.5). */
  convertedSoId?: string;
  convertedBy?: string;
  convertedAt?: string;
  /** Dismissal stamps (actor + timestamp — spam is dismissed,
   *  never silently dropped). */
  dismissedBy?: string;
  dismissedAt?: string;
}

/** The storefront block on the owner doc's settings (H3): only
 *  what must survive a re-publish lives here — the publish form's
 *  own preferences. The snapshot doc is the public record; the
 *  slug cache below is a LABEL for print/link seams (the doc id
 *  remains the slug's home). */
export interface StorefrontSettings {
  /** Re-assemble + re-publish automatically when products change
   *  while the store is live (§2.2's client setting). */
  autoRepublish?: boolean;
}

/* ==========================================================================
 * ERP PHASE H — WhatsApp marketing (design: ERP-PHASE-H-DESIGN.md §3).
 *
 * The shop's number, the shop's customers, the shop's hand: every
 * marketing message is sent from the shop's own WhatsApp, to its
 * own opted-in customers, by the shopkeeper's own action (§3.1).
 * The platform operates no sending infrastructure and sees none
 * of this — templates, campaigns and the send log are tenant
 * collections like any other, and NONE of it posts to the journal:
 * marketing moves no money, so `makeEntry(` gains no site here.
 * ========================================================================== */

/** A template's kind: an offer the shop wants to broadcast, or a
 *  service reminder the data suggested (§3.5). The kind drives
 *  which placeholders make sense; it gates nothing. */
export type WaTemplateKind = "promo" | "reminder";

export interface WaTemplate {
  id: string;
  name: string;
  kind: WaTemplateKind;
  /** The shop's own words, with placeholders {name}, {shop},
   *  {points}, {amount} (design §3.3). Starter templates ship as
   *  dictionary strings the owner copies and edits — never
   *  locked copy. */
  body: string;
  createdBy: string;
  ts: string;
}

/** The segment DEFINITION a campaign sends to — never a frozen
 *  list (design §3.3): the audience is re-derived live at launch
 *  and re-checked per recipient at send time. */
export type WaAudience =
  | { kind: "all_opted_in" }
  | { kind: "tier"; tier: "silver" | "gold" }
  | { kind: "udhaar_outstanding"; minRs: number; minDays: number }
  | { kind: "points_expiring"; withinDays: number }
  | { kind: "inactive"; days: number }
  | { kind: "storefront_customers" }
  /* §3.5's service-due derivation: delivered jobs older than
   * the settings interval. The interval is NOT a param — it is
   * the shop's configured settings field, read at resolution. */
  | { kind: "service_due" };

export type WaCampaignState = "draft" | "sending" | "done";

export interface WaCampaign {
  id: string;
  name: string;
  templateId: string;
  audience: WaAudience;
  /** The audience size AT LAUNCH (the log's denominator). Null
   *  while the campaign is a draft — a draft has resolved
   *  nobody, and the desk shows the live count instead. */
  resolvedCount: number | null;
  createdBy: string;
  ts: string;
  state: WaCampaignState;
}

/** One row of the send log: a FACT, not a derivation (§3.3) —
 *  who was queued for what, and what the shopkeeper did.
 *  `sent` means exactly "the shopkeeper confirms he sent it"
 *  (§3.4): v1's transport (wa.me, by hand) cannot know delivery
 *  or read state, so no such state exists in this type. */
export type WaSendState =
  | "queued"
  | "opened"
  | "sent"
  | "skipped_optout"
  | "skipped_invalid";

export interface WaSend {
  id: string;
  campaignId: string;
  customerId: string;
  /** The recipient number AS QUEUED (a snapshot — the log
   *  records where the message was aimed, even if the customer
   *  later edits their number). */
  phone: string;
  state: WaSendState;
  ts: string;
}

/** The WhatsApp block on the owner doc's settings. */
export interface WaSettings {
  /** Service-due reminder interval in days (design §3.5): a
   *  delivered job older than this suggests a service reminder.
   *  Absent ⇒ lib/whatsapp's default (90). Owner-writable like
   *  every settings write. */
  serviceIntervalDays?: number;
}

export interface ShopSettings {
  shopName: string;
  address: string;
  phone: string;
  /** Phase E · E1 (design §1.1): the shop's name in the other
   *  script (an Urdu name for an English-named shop and vice
   *  versa) — the owner's own data, never translated. The receipt
   *  header prints it as a second, smaller line under `shopName`.
   *  Absent/empty ⇒ no second line, exactly as before. */
  shopNameAlt?: string;
  /** Phase E · E1 (design §1.1): the ONE print template for the
   *  receipt family. Absent ⇒ today's rendering, field for field;
   *  read only through `resolvePrintDesign` (lib/print.ts). */
  printDesign?: PrintDesign;
  /** Phase E · E3 (design §3.2): the shop's own Raast beneficiary
   *  IBAN, stored normalised (upper-case, no spaces). Validated
   *  in full — structure AND the ISO 13616 mod-97 checksum — by
   *  lib/raast before Settings will save it. Absent/"" ⇒ no
   *  generated QR. A Raast ALIAS (mobile number) is never valid
   *  here: the SBP P2P template carries an IBAN object and no
   *  alias object exists to put a phone number in. */
  raastIban?: string;
  /** Phase E · E3 (design §3.2): the owner's bank name as the
   *  bank prints it — payload object 03, optional, ≤ 25 chars,
   *  ASCII (enforced by lib/raast's validateRaastFiName). */
  raastFiName?: string;
  staffEmails: string[];
  /* ---- Phase A groundwork (all optional; written by the Phase A
   * migration in later increments, read by A2–A5 features). Absent on
   * every existing shop, which therefore behaves exactly as before. */
  /** RBAC management record; `staffEmails` stays as its mirror (A3). */
  staff?: StaffMember[];
  /** Tax defaults; null/absent = no tax (A4). */
  defaultSalesTaxSlabId?: string | null;
  defaultPurchaseTaxSlabId?: string | null;
  /** Fiscal year start (A5). Defaults when absent: month 7, day 1 (PK). */
  fiscalYearStartMonth?: number;
  fiscalYearStartDay?: number;
  /** Period-lock enforcement value: ISO instant, "" / absent = unlocked. */
  lockedThrough?: string;
  /** Step-wise Phase A migration flags. */
  phaseA?: PhaseAFlags;
  /** Step-wise Phase C migration flags (C1: `stockV1`). */
  phaseC?: PhaseCFlags;
  /** Step-wise Phase D migration flags (D1: `hrV1`). */
  phaseD?: PhaseDFlags;
  /** Phase D · D5 (design §5.2): the owner's Tally ledger-NAME
   *  overrides per account code — names only, never groups (a
   *  wrong group silently corrupts the Tally balance sheet;
   *  names are cosmetic, groups are structural). Declared in D1
   *  with the rest of the Phase D settings surface; the export
   *  that consumes it lands in D5. */
  tallyLedgerNames?: Partial<Record<AccountCode, string>>;
  /** Phase H · H1 (design §1.7): the loyalty programme's terms.
   *  Absent ⇒ the programme is OFF and every default in
   *  lib/loyalty's resolver applies the day it is switched on.
   *  Read only through `resolveLoyaltySettings` (lib/loyalty). */
  loyalty?: LoyaltySettings;
  /** Phase H · H3 (design §2.2): the storefront publish
   *  preferences. Absent ⇒ manual publishing (the owner presses
   *  Publish; nothing reaches the public doc on its own). */
  storefront?: StorefrontSettings;
  /** Phase H · WhatsApp (design §3.5): the service-reminder
   *  interval. Absent ⇒ the lib default. */
  whatsapp?: WaSettings;
  /** Phase H · H3: the shop's claimed storefront slug, cached on
   *  the owner doc at publish time so print/link seams can render
   *  the store link without reading the platform layer. A label:
   *  the `storefronts/{slug}` doc is the slug's home, and a slug
   *  once claimed is never recycled (§2.6). Null/absent ⇒ no
   *  store has been published. */
  storefrontSlug?: string | null;
  /* Phase B (design §1.3): document-numbering prefix overrides, one
   * per series. Absent ⇒ the design defaults (QT-/SO- /DC-/PO-/CN-/
   * DN-/RV-/PV-). Owner-edited in Settings; a change affects future
   * mints only — stored `number` strings are never rewritten. */
  docSeries?: Partial<Record<SeriesId, string>>;
  /** Phase C · C4 (design §4.4 + Q3): the production issue desk's
   *  labour/overhead settlement preference — "paid" (paid from a
   *  money account at issue; `productionAccountId` names it) or
   *  "accrue" (credited to `salary_payable` until Phase D payroll
   *  pays it). Absent ⇒ paid, from the till's default account.
   *  A desk preference only — every issue may flip it; the choice
   *  changes which credit line the issue entry carries, never the
   *  debit into WIP. */
  productionSettlement?: "paid" | "accrue";
  productionAccountId?: string | null;
  /** Phase C · C5 (design §5.2): the workshop's job stage names,
   *  owner-edited in Settings. Stage names are shop data, like
   *  warehouse names — never dictionary strings. Absent/empty ⇒
   *  the default list (Received / In Progress / Ready /
   *  Delivered, `DEFAULT_JOB_STAGES` in lib/jobs). A job stores
   *  the stage NAME it is at; renaming the list never rewrites
   *  the name a job already carries (snapshot discipline). */
  jobStages?: string[];
}

/* ==========================================================================
 * ERP PHASE A — foundation v2 types (design: ERP-PHASE-A-DESIGN.md).
 * Types/defaults only in increment A1: no collection is read or written
 * yet, no posting path stamps these fields. Later increments wire them:
 * A2 money accounts, A3 RBAC, A4 tax, A5 periods.
 * ========================================================================== */

/* ---------------- Money accounts (A2) ----------------
 * The GL stays coarse (`cash` / `wallet` buckets); the specific money
 * account rides in the journal line's `ref`, exactly like the
 * receivables/payables subledgers. */
export interface MoneyAccount {
  id: string;
  name: string; // owner-chosen, e.g. "Main Till", "HBL Current"
  kind: "cash" | "wallet" | "bank";
  /**
   * The PayMethod this account settles ("cash" | "jazzcash" |
   * "easypaisa" | "bank"). Exactly one non-archived account per method
   * is that method's default. null = catch-all (the legacy combined
   * account) or an extra account for a method, chosen at the desk.
   */
  method: PayMethod | null;
  /**
   * Set on exactly one cash-bucket and one wallet-bucket account per
   * shop: historical journal lines whose ref is null resolve to it.
   */
  legacyFor: "cash" | "wallet" | null;
  archived: boolean; // accounts are archived, never deleted
  sortOrder: number;
  ts: string;
}

/* ---------------- Tax slabs (A4) ---------------- */

export interface TaxSlab {
  id: string;
  name: string; // e.g. "GST", "SRB", "WHT Services" (owner's words)
  kind: "percent" | "fixed"; // fixed = PKR per unit sold/purchased
  rate: number; // percent value (17) or fixed PKR per unit (5)
  appliesTo: "sales" | "purchases" | "both";
  inclusive: boolean; // true: listed prices already contain this tax
  isDefault: boolean; // at most one default per appliesTo direction
  active: boolean;
  ts: string;
}

/* ---------------- Staff roles / RBAC (A3) ----------------
 * The owner's own role is implicit (uid match) and never stored.
 * A staff record with no role resolves to "manager" — the legacy
 * profile (everything except owner-only surfaces). */

export type StaffRole = "manager" | "cashier" | "accountant";

export interface StaffMember {
  email: string;
  role: StaffRole;
  addedAt: string; // ISO timestamp
}

/* ---------------- Periods & fiscal lock (A5) ----------------
 * One doc per close/reopen event — the audit trail. The enforcement
 * value itself is `lockedThrough` on the settings (owner doc). */
export interface Period {
  id: string;
  kind: "period" | "fiscal_year";
  from: string; // ISO instant
  to: string; // ISO instant
  action: "close" | "reopen";
  byUid: string;
  byEmail: string;
  ts: string;
  note: string;
  /* ---- Phase D · D4 (fiscal_year docs only; design §4.3/§4.4) ---- */
  /** The `lockedThrough` in force immediately before this event —
   *  a reopen restores exactly this value. */
  prevLockedThrough?: string;
  /** The `fy_close` journal entry this event posted (the closing
   *  entry for a close, its mirror for a reopen). Null when the
   *  closed year carried no P&L movement and no entry was needed. */
  entryId?: string | null;
  /** Reopen docs only: the close doc this event unwinds. */
  reopensPeriodId?: string;
  /** Close docs only: the checklist's warnings were displayed and
   *  explicitly ticked by the owner before closing (§4.2). */
  warningsAcked?: boolean;
}

/* ---------------- Phase A migration flags ---------------- */

export interface PhaseAFlags {
  accountsV1?: boolean;
  rbacV1?: boolean;
  taxV1?: boolean;
  periodsV1?: boolean;
}

/* ---------------- Phase C migration flags ---------------- */

export interface PhaseCFlags {
  stockV1?: boolean;
}

/* ---------------- Phase D migration flags ---------------- */

export interface PhaseDFlags {
  hrV1?: boolean;
}

/* ==========================================================================
 * ERP PHASE B — document chain (design: ERP-PHASE-B-DESIGN.md).
 *
 * The full Phase B type set is declared in increment B1; behaviour
 * lands per increment (B1: quotations + sale orders; B2: challans +
 * bill conversions; B3: purchase orders; B4: notes + purchase
 * returns; B5: cheques; B6: vouchers).
 *
 * THE CARDINAL RULE (§2.2): quotations, sale orders, delivery
 * challans and purchase orders are NON-POSTING documents — at any
 * status they write no journal entry, move no stock, create no
 * credit/payable row and touch no money account. The only posting
 * events remain the bill (`postBill`) and the goods receipt
 * (`recordPurchase`). Fulfilment quantities are DERIVED from child
 * documents citing their parent (§2.1, lib/documents.ts) — never
 * stored counters; a document's `status` is a cached label over
 * that derivation.
 * ========================================================================== */

/** Document-numbering series (design §1.3). One series per document
 *  type; numbers render `prefix + sequence` and mint when a document
 *  leaves draft (notes/vouchers mint at their posting instant). */
export type SeriesId =
  | "quotation"
  | "saleOrder"
  | "challan"
  | "purchaseOrder"
  | "creditNote"
  | "debitNote"
  | "receiptVoucher"
  | "paymentVoucher"
  /* Phase C · C2 — minted at dispatch (drafts burn no numbers). */
  | "stockTransfer"
  /* Phase C · C4 — minted at open (first issue or the explicit
   * open action); drafts burn no numbers (§6.3). */
  | "productionOrder"
  /* Phase C · C5 — minted AT CREATION: a job is born numbered,
   * the stated exception to the drafts-burn-none rule (§5.1/§6.3). */
  | "job"
  /* Phase D (design §6.3): payroll runs mint at FINALISE (drafts
   * burn no numbers, B §1.3 doctrine — `PR-` was taken by
   * production orders, hence `PAY-`); loans mint AT CREATION
   * (born numbered — the number goes on the signed agreement,
   * the jobs precedent). Declared in D1; first minted by D2/D3. */
  | "payrollRun"
  | "loan";

/** Shared line shape for sales-side documents (§1.1). The product
 *  name is snapshotted at issue time, exactly as BillItem does. No
 *  cost snapshot and no tax snapshot live here: COGS is the bill's
 *  business, and pre-bill tax is a display estimate only (§7). */
export interface DocLine {
  productId: string;
  name: string; // snapshot
  qty: number;
  /** Sales side: the AGREED price (quotation/order) or the price
   *  current at issue (challan). A converted bill honours this via
   *  the BillLineInput.unitPrice seam (§2.4). */
  unitPrice: number;
  total: number; // qty × unitPrice
  /** Set on child documents created by conversion: the parent line
   *  (by product) this line fulfils. */
  sourceProductId?: string | null;
}

export type QuotationStatus =
  | "draft"
  | "issued"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted"
  | "cancelled";

export interface Quotation {
  id: string;
  number: string | null; // "QT-12" once issued; null while draft
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  lines: DocLine[];
  subtotal: number;
  discountType: "flat" | "percent";
  discountValue: number;
  discountAmount: number;
  /** Display-only estimate of tax at CURRENT slab resolution.
   *  Recomputed whenever the document is rendered; never posted,
   *  never promised (§7). */
  estimatedTax: number;
  total: number; // subtotal − discount + estimatedTax (estimate)
  validUntil: string | null; // YYYY-MM-DD; past it, display derives "expired"
  note: string;
  status: QuotationStatus;
  issuedTs: string | null;
  dayOffset: number;
  ts: string;
}

export type SaleOrderStatus =
  | "draft"
  | "open"
  | "partially_fulfilled"
  | "fulfilled"
  | "cancelled";

export interface SaleOrder {
  id: string;
  number: string | null; // "SO-7" once confirmed (draft → open)
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  lines: DocLine[]; // unitPrice here is the AGREED price (§2.4)
  subtotal: number;
  discountType: "flat" | "percent";
  discountValue: number;
  discountAmount: number;
  estimatedTax: number; // display-only, as quotations
  total: number; // estimate, as quotations
  source: { type: "quotation"; id: string } | null;
  /* Phase H · H3 (design §2.5): the storefront linkage — set on
   * orders born by converting a public inbox order. The journal
   * never sees it (the bill that eventually posts is an ordinary
   * order bill); it exists so the desk can trace an order back to
   * the public paper it came from. Absent/null on every other
   * order. */
  sourceType?: "storefront" | null;
  sourceOrderId?: string | null;
  expectedDate: string | null; // YYYY-MM-DD promised delivery
  /* Phase C · C1 (design §1.6): the warehouse this order PREFERS
   * its goods to leave from — a preference, displayed and inherited
   * by its challans and converted bills; the posted bill's own
   * `warehouseId` is the only one fulfilment/returns consult.
   * Absent/null ⇒ the default warehouse. */
  warehouseId?: string | null;
  note: string;
  status: SaleOrderStatus; // cached label; truth derives per §2.1
  dayOffset: number;
  ts: string;
}

export type ChallanStatus =
  | "draft"
  | "dispatched"
  | "partially_billed"
  | "billed"
  | "cancelled";

export interface DeliveryChallan {
  id: string;
  number: string | null; // "DC-21" once dispatched
  orderId: string | null; // source sale order; null = standalone delivery
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  /** qty IS the delivered qty — a challan line never carries an
   *  undelivered remainder. A challan carries NO totals and prints
   *  NO amounts (§2.3): quantities only. */
  lines: DocLine[];
  vehicleNo: string;
  driverName: string;
  /* Phase C · C1 (design §1.6): the warehouse the goods physically
   * left from on this delivery (inherited from its order on
   * conversion, or chosen on the standalone form). A converted bill
   * inherits it. Absent/null ⇒ the default warehouse. */
  warehouseId?: string | null;
  note: string;
  status: ChallanStatus; // cached label; billed truth derives per §2.1
  dayOffset: number;
  ts: string;
}

export type PurchaseOrderStatus =
  | "draft"
  | "issued"
  | "partially_received"
  | "received"
  | "cancelled";

export interface PurchaseOrder {
  id: string;
  number: string | null; // "PO-5" once issued
  supplierId: string;
  supplierName: string; // snapshot
  lines: Array<{
    productId: string;
    name: string;
    qty: number;
    unitCost: number; // agreed cost
    total: number;
  }>;
  total: number; // estimate — tax resolves at receipt (§7)
  expectedDate: string | null;
  /* Phase C · C1 (design §1.6): the EXPECTED destination warehouse.
   * Receipts against this PO inherit it (editable at receipt, like
   * cost). Absent/null ⇒ the default warehouse. */
  warehouseId?: string | null;
  note: string;
  status: PurchaseOrderStatus; // cached label; received truth derives per §2.1
  dayOffset: number;
  ts: string;
}

/** Formal credit/debit notes (§3). One collection `notes`, both
 *  kinds. A note is a VIEW over a posting the returns engines already
 *  made — it never posts anything itself. Born posted; never edited
 *  or deleted from the client. */
export type NoteKind = "credit" | "debit";

export interface DocNote {
  id: string;
  number: string; // "CN-3" / "DN-2" — minted at posting, never null
  kind: NoteKind;
  returnId: string | null; // SaleReturn.id (credit) / PurchaseReturn.id (debit)
  billId: string | null;
  billNo: number | null; // credit notes
  purchaseId: string | null; // debit notes
  partyId: string | null;
  partyName: string; // customer / supplier snapshot
  items: BillItem[]; // the return engine's stamped lines (tax shares incl.)
  goodsAmount: number; // net goods reversed (excl. tax)
  taxAmount: number; // tax reversed (A4 shares)
  total: number; // goodsAmount + taxAmount == what the party got back
  settlement:
    | "cash_refund"
    | "credit_reduction" // credit notes (mirrors SaleReturn)
    | "payable_offset"; // debit notes (§3.2) — "cash_refund" shared
  journalEntryId: string; // the ONE entry that posted it
  reason: string;
  status: "posted"; // notes are born posted; there is no draft (§3.3)
  dayOffset: number;
  ts: string;
}

/** The debit side's operational record (§3.2), mirroring SaleReturn. */
export interface PurchaseReturn {
  id: string;
  purchaseId: string;
  supplierId: string;
  items: PurchaseItem[]; // tax shares stamped, like SaleReturn items
  /** Portion settled by reducing what the shop owes the supplier. */
  payableOffset: number;
  /** Portion the supplier handed back in money (0 unless cash refund). */
  refundAmount: number;
  method: "cash" | "jazzcash" | "easypaisa" | "bank" | null; // refund leg
  accountId: string | null; // A2 stamp for the refund leg
  dayOffset: number;
  ts: string;
}

/** Cheque registry (§4.1). The registry doc is a mutable STATUS
 *  record — deliberately unlike the journal: it tracks an
 *  instrument's fate. Every transition that moves money writes its
 *  journal entry in the same batch as the status update; `entryIds`
 *  cross-cites the two. */
export type ChequeDirection = "in" | "out";
export type ChequeStatus =
  | "received" // in: in the drawer, not yet deposited
  | "deposited" // in: at the bank, awaiting clearance (custody only)
  | "issued" // out: handed to the supplier, not yet cleared
  | "cleared" // terminal: money moved
  | "bounced" // terminal: bank refused it (or out-cheque stopped/returned)
  | "returned"; // terminal: in-cheque handed back undeposited

export interface Cheque {
  id: string;
  direction: ChequeDirection;
  chequeNo: string; // the leaf number, as text (bank's numbering)
  bankName: string; // issuing bank (in) / own bank (out)
  amount: number;
  issueDateISO: string; // date written on the cheque (YYYY-MM-DD)
  dueDateISO: string; // PDC date — when it may clear
  partyId: string | null;
  partyName: string; // customer (in) / supplier (out)
  partyKind: "customer" | "supplier" | "expense" | "other";
  status: ChequeStatus;
  /** What this instrument settled at capture time. */
  sourceType: "bill" | "repayment" | "supplier_payment" | "expense";
  sourceId: string; // the operational row id (bill/payment/expense)
  /** In: the money account chosen at DEPOSIT (money lands here at
   *  clearing). Out: the money account the cheque is DRAWN ON,
   *  captured at issue. */
  accountId: string | null;
  chargesOnBounce: number; // bank charges booked at bounce (0 default)
  entryIds: {
    captured?: string;
    deposited?: null; // deposit posts nothing (§4.3)
    cleared?: string;
    bounced?: string;
    returned?: string;
  };
  note: string;
  dayOffset: number;
  ts: string;
}

/* ==========================================================================
 * ERP PHASE C — warehouses & production (design: ERP-PHASE-C-DESIGN.md).
 *
 * C1 lands the location subledger: `warehouses` + `stockLevels`.
 * Location is a SUBLEDGER SPLIT under the one inventory GL (the A2
 * money-account pattern applied to quantity, §1.1/§1.4): the journal
 * never learns where goods sit, `Product.stockQty` stays the
 * product total, and the stock-level rows split that total by
 * building — reconciled by the asserted mirror identity
 * Σ rows + in-transit == stockQty (§1.3; in-transit arrives in C2).
 * ========================================================================== */

/** A place stock can sit (design §1.2). Warehouses are archived,
 *  never deleted (§1.8). Exactly one non-archived warehouse is the
 *  default: the migration target for all pre-C stock, the
 *  resolution for every document that names no warehouse, and the
 *  desk preselection. */
export interface Warehouse {
  id: string;
  name: string; // owner's words: "Main Warehouse", "Godown — Shahdara"
  note: string; // address / keeper, free text
  isDefault: boolean;
  archived: boolean;
  sortOrder: number;
  ts: string;
}

/** One product's quantity at one warehouse (design §1.3) — the
 *  per-location truth, written in the SAME batch / state update as
 *  the movement that changes it. Quantity only, never cost: one
 *  global `Product.costPrice` values every location (§1.4).
 *  `qty` may go negative exactly where `stockQty` may. */
export interface StockLevel {
  id: string; // deterministic: `${warehouseId}__${productId}`
  productId: string;
  warehouseId: string;
  qty: number;
}

/* ==========================================================================
 * ERP PHASE C · C2 — stock transfers (design §2).
 *
 * A transfer is a MOVEMENT document: it really moves shelf
 * quantities between the shop's own warehouses while moving NO
 * value — dispatch and receipt post nothing, and the goods on the
 * road are a DERIVED quantity (in-transit, §2.2), never a place.
 * The single exception is a proven shortage at close: the missing
 * units are a stock loss and DO post (§2.3, refType
 * "transfer_loss").
 * ========================================================================== */

export type StockTransferStatus =
  | "draft"
  | "dispatched"
  | "partially_received"
  | "received"
  | "returned"
  | "cancelled";

export interface StockTransferLine {
  productId: string;
  name: string; // snapshot, as everywhere
  qtySent: number;
  /** Written ONLY by receive actions — the transfer's own event
   *  record and the derivation input for in-transit / remaining
   *  (§2.2). Stays 0 from creation until goods actually arrive. */
  qtyReceived: number;
}

export interface StockTransfer {
  id: string;
  /** "TR-4" once dispatched (§6.3 series); null in draft —
   *  drafts burn no numbers (B §1.3). */
  number: string | null;
  fromWarehouseId: string;
  toWarehouseId: string; // ≠ fromWarehouseId (store refuses same-house)
  lines: StockTransferLine[];
  note: string;
  /** Cached label over the line derivation (§2.2) — recomputed in
   *  every receive/close batch; the derivation, never the label,
   *  gates what may still be received. */
  status: StockTransferStatus;
  dayOffset: number;
  ts: string;
}

/* ---------------- Phase C · C3: BOM — recipes (design §3) ---------------- */

export interface BomLine {
  productId: string; // a component: raw-class OR goods-class (§3.3)
  name: string; // snapshot
  qty: number; // consumed per batch of `outputQty`
}

export interface Bom {
  id: string;
  outputProductId: string; // the finished product (never raw-class, §3.1)
  outputName: string; // snapshot
  /** Batch size: one run of this recipe yields `outputQty` finished
   *  units and consumes the lines' quantities. */
  outputQty: number;
  /** 1, 2, 3… per output product. BOMs are IMMUTABLE once created:
   *  an edit is a NEW version (n+1) and the previous version is
   *  deactivated, never rewritten — a production order must always
   *  be able to prove which recipe its costs came from (§3.2). */
  version: number;
  lines: BomLine[];
  /** Declared per-batch conversion costs — the recipe's standard
   *  labour and overhead per batch. COST INPUTS the owner sets;
   *  they default the C4 issue desk (scaled by run size, editable
   *  per run). The BOM itself posts nothing. */
  labourCost: number;
  overheadCost: number;
  /** Exactly one active BOM per output product. */
  active: boolean;
  note: string;
  ts: string;
}

/* ==========================================================================
 * ERP PHASE C · C4 — production orders (design §4.2).
 *
 * A production order runs ONE warehouse's production of ONE
 * finished product from ONE snapshotted recipe version. Its
 * EVENTS are its subledger — append-only records written only
 * inside their posting batch, each citing the ONE journal entry
 * that posted it — and every figure (produced qty, the WIP pool)
 * is DERIVED from them, never a stored counter (§4.2/§4.3):
 *
 *   producedQty(order) = Σ completion qty
 *   pool(order)        = Σ issue values − Σ completion values
 *                        − Σ scrap values − Σ closeout values
 *   GL `wip` balance   == Σ pool over all orders (to the paisa)
 *
 * The recipe is SNAPSHOTTED at creation: later BOM versions
 * never re-cost an open order (§3.2/§4.2).
 * ========================================================================== */

export type ProductionStatus = "draft" | "open" | "completed" | "cancelled";

export interface ProductionEvent {
  kind: "issue" | "completion" | "scrap" | "closeout";
  /** issue: components consumed (valued at issue) in `lines`.
   *  completion: finished units produced. scrap: output units
   *  spoiled. closeout: the system event written by Close Order
   *  carrying the residual pool to loss (qty 0). */
  qty: number; // finished-unit terms for completion/scrap; 0 for issue/closeout
  /** issue only: the components consumed, valued at the shelf
   *  costs in force at the issue. */
  lines?: Array<{
    productId: string;
    name: string;
    qty: number;
    unitCost: number;
    value: number;
  }>;
  labourCost?: number; // issue only: this run's declared labour
  overheadCost?: number; // issue only: this run's declared overhead
  /** issue only: the money account labour/overhead were paid
   *  from, the literal "accrue" when they were credited to
   *  `salary_payable` (§4.4), or null when the run declared no
   *  conversion cost to settle. */
  paidFromAccountId?: string | null;
  value: number; // the journal value this event moved
  entryId: string; // the ONE journal entry that posted it
  dayOffset: number;
  ts: string;
}

export interface ProductionOrder {
  id: string;
  /** "PR-3" once opened (drafts burn no numbers, §6.3). */
  number: string | null;
  bomId: string; // the recipe version consumed (immutable record)
  bomVersion: number;
  /** Full recipe snapshot at order creation: lines, batch size,
   *  standard labour/overhead — later BOM versions never rewrite
   *  an open order's economics (§3.2). */
  bomSnapshot: {
    outputQty: number;
    lines: BomLine[];
    labourCost: number;
    overheadCost: number;
  };
  outputProductId: string;
  outputName: string; // snapshot
  /** Materials are drawn from AND finished goods land in this
   *  ONE warehouse (§4.5). */
  warehouseId: string;
  plannedQty: number; // finished units the order intends to produce
  events: ProductionEvent[]; // the order's own event log — its subledger
  note: string;
  /** Cached label over the derived produced qty (§4.2) —
   *  recomputed in each event's batch. */
  status: ProductionStatus;
  dayOffset: number;
  ts: string;
}

/* ==========================================================================
 * ERP PHASE C · C5 — job / work-order tracker (design §5).
 *
 * The service counterpart to production orders: a customer's
 * work order (the printing shop's banner, cards, binding)
 * tracked from receipt to delivery. The same disciplines bind:
 *
 *  - materials consumed by a job POST (stock physically leaves,
 *    invariant 4 has no services exception) — Dr `cogs` /
 *    Cr the class account, in the job's own batch, the event
 *    citing the ONE entry that posted it (§5.3);
 *  - advances invent NO money path: they ride the existing
 *    repayment machinery into the customer's pool (owner Q2 —
 *    POOLED), and the job's bill absorbs them through the
 *    ordinary F-6 lot (§5.3/§5.4);
 *  - labour is a DECLARED figure for the profit report, never
 *    a posting — the wages themselves already moved through
 *    Expenses / payroll (§5.3);
 *  - revenue and profit are DERIVED (lib/jobs §5.5 selectors),
 *    never stored.
 * ========================================================================== */

export type JobStatus = "open" | "in_progress" | "ready" | "delivered" | "cancelled";

export interface JobMaterialEvent {
  kind: "issue" | "return";
  productId: string;
  name: string; // snapshot
  qty: number;
  unitCost: number; // shelf cost snapshot at the event
  value: number; // qty × unitCost — the journal value moved
  entryId: string; // the ONE journal entry that posted it
  dayOffset: number;
  ts: string;
}

export interface Job {
  id: string;
  /** "JB-7" — minted AT CREATION (§5.1): the customer walks
   *  away with the number on a slip; a job has no draft state.
   *  (The one stated exception to §1.3's drafts-burn-none —
   *  there are no job drafts.) */
  number: string;
  customerId: string | null;
  customerName: string; // snapshot
  customerPhone: string; // snapshot
  title: string; // the work, in the owner's words
  description: string;
  /** The current stage NAME (settings `jobStages`, §5.2) —
   *  shop data, snapshotted onto the job; the settings list may
   *  be renamed later without rewriting this. */
  stage: string;
  /** Lifecycle label derived from the stage position (§5.2),
   *  with `delivered` / `cancelled` set by their explicit
   *  actions (a citing bill's posting is delivery-with-bill,
   *  §5.4). Recomputed in every stage/batch write. */
  status: JobStatus;
  dueDateISO: string | null; // promised delivery date
  /** Materials are issued from (and returned to) this ONE
   *  warehouse (§5.3). Immutable once material events exist —
   *  a return must land where its issue left from. */
  warehouseId: string;
  /** Append-only material subledger (§5.3), as §4.2's events. */
  materialEvents: JobMaterialEvent[];
  /** Declared labour for the profit report (§5.1/§5.5).
   *  NON-posting by design: the wages move through Expenses /
   *  Phase D payroll as they always have. */
  labourCost: number;
  note: string;
  dayOffset: number;
  ts: string;
}

/* ==========================================================================
 * ERP PHASE D — HR & advanced finance (design: ERP-PHASE-D-DESIGN.md).
 *
 * The full Phase D type set is declared in increment D1 (the A1
 * pattern: later increments post/wire them without type-union
 * churn in shipped clients). D1 itself lands only the employee
 * directory + the attendance register — NEITHER POSTS ANYTHING.
 * Payroll runs (D2), loans (D3), the fiscal-year close (D4) and
 * the Tally export (D5) consume the declarations below.
 *
 * THE SHARED-ACCOUNT FACT (§2.2): `salary_payable` carries TWO
 * kinds of lines — payroll lines stamped with the employee's id
 * in `ref`, and C4 production-issue accruals carrying NO ref.
 * History is never re-attributed: the composition selector in
 * lib/payroll models the account honestly as per-employee
 * positions + an unassigned bucket, and asserts
 *   GL == Σ employee positions + unassigned bucket.
 * ========================================================================== */

/* ---------------- Employees (design §1.1) ----------------
 * A separate collection, NOT an extension of login staff: most
 * employees have no login and never will; the lifecycles differ
 * (a login is revoked, an employee is DEACTIVATED and their
 * history stays readable forever); and the security boundary
 * differs (payroll records are written by roles that may not
 * write the owner doc where `staff[]` lives). The directory doc
 * is identity + current terms, NOTHING else: it carries no
 * balance (§2.2 derives it), no attendance totals (§1.3) and no
 * "paid this month" flag (§2.3 derives run/payment state). */
export interface Employee {
  id: string;
  name: string; // owner's words — printed on slips
  phone: string;
  designation: string; // free text, owner's words ("Salesman", "Darzi")
  /** Optional link to a login account (an owner-doc staff[]
   *  email). Display/record only: it grants nothing, gates
   *  nothing, and the rules never read it. Most employees
   *  have null. */
  linkedUserEmail: string | null;
  joinDateISO: string | null; // YYYY-MM-DD
  /* --- salary structure (current terms; runs snapshot, §2.3) --- */
  payBasis: "monthly" | "daily";
  /** monthly: the month's base salary. daily: the rate per
   *  present day. */
  baseAmount: number;
  /** Fixed monthly earning lines (allowances) added on the slip. */
  allowances: Array<{ label: string; amount: number }>;
  /** Paid leave days per month before absence deduction applies
   *  (monthly basis only; §1.4). */
  paidLeaveDays: number;
  active: boolean; // deactivated, never deleted (§1.5)
  note: string;
  ts: string;
}

/* ---------------- Attendance (design §1.3) ----------------
 * One document per employee-month, deterministic id
 * `${employeeId}__${yyyyMm}` (the stockLevels precedent: every
 * mark is an idempotent write to a known doc). Attendance posts
 * NOTHING, ever — it is an input to payroll computation, like a
 * quotation is an input to a bill. Summaries are selectors
 * (lib/payroll `attendanceSummary`), never stored totals. */
export type AttendanceMark = "present" | "absent" | "half" | "leave" | "off";

export interface AttendanceMonth {
  id: string; // deterministic: `${employeeId}__${yyyyMm}`
  employeeId: string;
  month: string; // "2026-10" (calendar month — design Q3)
  /** Sparse: only marked days appear. An unmarked past day reads
   *  as unmarked (the register shows it blank), never silently
   *  present. */
  days: Record<string, AttendanceMark>; // key: day-of-month "1".."31"
  ts: string;
}

/* ---------------- Payroll runs (design §2.3) — posted by D2 -------- */

export interface PayrollRunLine {
  employeeId: string;
  name: string; // snapshot
  payBasis: "monthly" | "daily"; // snapshot
  /* attendance snapshot (from §1.4's computation at composition) */
  daysInMonth: number;
  present: number;
  absent: number;
  half: number;
  leave: number;
  unpaidAbsent: number;
  earnedBase: number; // §1.4 result — the snapshot that matters
  allowances: Array<{ label: string; amount: number }>; // snapshot
  /** Deductions that REDUCE the accrual (§2.5): absence is already
   *  inside earnedBase; these are fines/other owner-entered lines.
   *  Reducers never enter the journal (§2.4 net accrual). */
  deductions: Array<{ label: string; amount: number }>;
  gross: number; // earnedBase + Σ allowances
  netAccrued: number; // gross − Σ deductions (== the Cr line)
}

export interface PayrollPaymentEvent {
  employeeId: string | null; // null = settles the unassigned bucket (§2.2)
  name: string; // snapshot ("Production labour" for null)
  amount: number;
  method: PayMethod; // money methods only — never "credit"
  accountId: string | null; // A2 stamp
  entryId: string; // the ONE entry that posted it
  dayOffset: number;
  ts: string;
}

export type PayrollRunStatus = "draft" | "posted" | "reversed";

export interface PayrollRun {
  id: string;
  number: string | null; // "PAY-5" once finalised (§6.3); draft = null
  month: string; // "2026-10" — the month the run PAYS FOR
  lines: PayrollRunLine[];
  totals: { gross: number; deductions: number; netAccrued: number };
  /** Payment events across the run's life — append-only, like
   *  C4's production events. Advance recovery is computed at
   *  payment time from the journal (§2.4), never stored here. */
  payments: PayrollPaymentEvent[];
  accrualEntryId: string | null; // null while draft
  status: PayrollRunStatus; // cached label; paid state derives (§2.3)
  note: string;
  dayOffset: number;
  ts: string;
}

/* ---------------- Loans (design §3.1/§3.3) — posted by D3 ---------- */

export type LoanDirection = "payable" | "receivable"; // payable: the shop borrowed

export interface LoanEvent {
  kind: "drawdown" | "charge" | "repayment" | "fee" | "writeoff";
  amount: number; // the journal value this event moved
  /** Repayment split (schedule-derived default, desk-overridable)
   *  — attribution lives in the events diary, never recoverable
   *  from journal lines alone (§3.3). */
  principalPart: number;
  chargePart: number;
  accountId: string | null; // money account (drawdown/repayment/fee)
  entryId: string; // the ONE entry that posted it
  dayOffset: number;
  ts: string;
}

export interface Loan {
  id: string;
  /** "LN-3" — minted AT CREATION (the number goes on the loan
   *  agreement; the jobs precedent, §6.3: born numbered). */
  number: string;
  direction: LoanDirection;
  partyName: string; // lender (payable) / borrower (receivable) — snapshot
  /** Optional link: supplier/customer/employee id — display and
   *  statement cross-reference only; the loan never rides those
   *  subledgers (§3.1's isolation is the point). */
  partyId: string | null;
  principal: number;
  /** The charge structure (§3.2). Default "none": a loan with no
   *  charge is the register's normal citizen, not a special case.
   *  Charges post only as discrete, desk-confirmed events —
   *  never silently, never automatically. */
  chargeType: "none" | "flat" | "reducing" | "fee_only";
  /** flat/reducing: percent. flat = % of ORIGINAL principal over
   *  the whole term; reducing = % per period on outstanding
   *  principal. fee_only: chargeAmount is the one-off fee. */
  chargeRate: number;
  chargeAmount: number; // computed at creation for flat/fee; shown, snapshotted
  startDateISO: string; // drawdown date (YYYY-MM-DD)
  instalmentCount: number;
  instalmentEvery: "month" | "week";
  firstDueISO: string; // first instalment due date
  /** The loan's append-only event diary (§3.3): written only
   *  inside its posting batch, never edited. Declared on the
   *  doc here; D3's register composes it. */
  events: LoanEvent[];
  status: "active" | "settled" | "cancelled"; // cached label (§3.3)
  note: string;
  dayOffset: number;
  ts: string;
}
