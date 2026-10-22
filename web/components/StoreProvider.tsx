/**
 * Dukaan AI — client-side store (React context).
 *
 * Two data modes, chosen by <AuthProvider>:
 *
 *  - DEMO MODE (no Firebase config): everything lives in memory, persists
 *    to localStorage, and seeds from the bundled demo data on first run.
 *
 *  - PRODUCTION MODE (Firebase configured + signed in): everything lives
 *    in Firestore under `users/{dataUid}/…` — the signed-in owner's own
 *    namespace, or (for invited staff) the OWNER's namespace, resolved
 *    by <AuthProvider> via `staffIndex`. The namespace is seeded from
 *    the bundled demo data on first login so a new account never opens
 *    an empty shop. Live snapshots keep every open tab in sync.
 *
 * FINANCE INTEGRITY: every money event also posts ONE balanced
 * double-entry document to `users/{uid}/journal` in the SAME write
 * batch as the operational records, so the journal and the subledgers
 * can never half-commit. Journal entries are append-only; corrections
 * are reversing entries (see lib/ledger.ts for the posting conventions).
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
  type WriteBatch,
} from "firebase/firestore";
import type {
  AdjustmentReason,
  AttendanceMark,
  AttendanceMonth,
  Bill,
  BillPayment,
  Bom,
  CashEntry,
  Cheque,
  ChequeDraft,
  CreditEntry,
  Customer,
  DayClose,
  DeliveryChallan,
  DocLine,
  DocNote,
  Employee,
  Expense,
  ExpenseCategory,
  Job,
  JournalEntry,
  Loan,
  MoneyAccount,
  PayMethod,
  PayrollPaymentEvent,
  PayrollRun,
  PayrollRunLine,
  Period,
  Product,
  ProductionEvent,
  ProductionOrder,
  Purchase,
  PurchaseOrder,
  PurchaseReturn,
  Quotation,
  Sale,
  SaleOrder,
  SaleReturn,
  ShopSettings,
  StaffMember,
  StaffRole,
  StockAdjustment,
  StockLevel,
  StockTransfer,
  Supplier,
  SupplierPayment,
  TaxSlab,
  Warehouse,
} from "@/lib/types";
import {
  getSeedAccounts,
  getSeedAttendance,
  getSeedBoms,
  getSeedCredits,
  getSeedCustomers,
  getSeedDeliveryChallans,
  getSeedEmployees,
  getSeedPayrollRunDraft,
  getSeedExpenses,
  getSeedJobs,
  getSeedJournal,
  getSeedProducts,
  getSeedProductionOrders,
  getSeedPurchases,
  getSeedQuotations,
  getSeedSaleOrders,
  getSeedSales,
  getSeedSettings,
  getSeedStockLevels,
  getSeedStockTransfers,
  getSeedSupplierPayments,
  getSeedSuppliers,
  getSeedTaxSlabs,
  getSeedWarehouses,
  getTopUpOpeningEntry,
  SEED_DEMO_RAW_PRODUCT_ID,
} from "@/lib/seed";
import {
  DEFAULT_WAREHOUSE_ID,
  applyLevelDelta,
  defaultWarehouseId,
  levelIdFor,
  makeLevel,
  qtyAtWarehouse,
  recountLevels,
  resolveWarehouseId,
  stockV1Rows,
} from "@/lib/stock";
import {
  challanBilledQty,
  composePoReceiptLines,
  composePurchaseReturnLines,
  creditNoteFigures,
  debitNoteFigures,
  deriveChallanStatus,
  deriveOrderStatus,
  derivePoStatus,
  deriveQuotationStatus,
  estimateDocTotals,
  nextDocNumber,
  noteItemsFromPurchaseReturn,
  orderBilledQty,
  orderDeliveredQty,
  poReceivedQty,
  purchaseReturnItems,
  quotationConvertedTotalQty,
} from "@/lib/documents";
import {
  accountForMethod,
  appliedAdjustmentDelta,
  billCreditOutstanding,
  classLegLines,
  defaultAccountForMethod,
  findUnreversedPosting,
  glForAccount,
  makeEntry,
  newId,
  supplierBalance,
} from "@/lib/ledger";
import {
  bounceChargesLines,
  bounceInLines,
  bounceOutLines,
  canChequeTransition,
  clearingLines,
  isValidChequeDraft,
  returnInLines,
} from "@/lib/cheques";
import {
  applyReceivePicks,
  buildReclassEntry,
  buildTransferLossEntry,
  canTransferTransition,
  inventoryAccountFor,
  composeTransferLines,
  statusAfterReceive,
  transferRouteProblem,
  transferShortages,
  validateReceivePicks,
} from "@/lib/transfers";
import { nextBomVersion, validateBomDraft } from "@/lib/boms";
import {
  buildCompletionEntry,
  buildScrapEntry,
  completionAbsorb,
  deriveProductionStatus,
  poolOf,
  prepareIssue,
  producedQty,
  scrapAbsorb,
  snapshotOfBom,
  type IssueInput,
} from "@/lib/production";
import {
  deriveJobStatus,
  effectiveJobStages,
  prepareMaterialEvent,
} from "@/lib/jobs";
import {
  attendanceDocId,
  buildMirrorEntry,
  buildPayrollAccrualEntry,
  buildPayrollPaymentEntry,
  buildRunLines,
  buildSalaryAdvanceEntry,
  paidForRun,
  payrollLineTotals,
  payrollRunTotals,
  salaryPayableComposition,
} from "@/lib/payroll";
import { getFirestoreDb } from "@/lib/firebase";
import {
  computeBillTaxes,
  computePurchaseTaxes,
  purchaseReturnTaxShares,
  resolveTaxSlab,
  returnTaxShares,
  round2,
  taxPosition,
} from "@/lib/tax";
import { backfillStaff, can, resolveStaffRole, type ShopRole } from "@/lib/permissions";
import {
  canCloseThroughDate,
  correctionDating,
  endOfDayPktInstant,
  isValidDateISO,
  preparePosting,
} from "@/lib/periods";
import { useAuth } from "./AuthProvider";

// v3: Phase A · A2 added the `accounts` collection to the demo shape.
// v4: Phase A · A4 added the `taxSlabs` collection.
// v5: Phase A · A5 added the `periods` collection (close/reopen trail).
// v6: Phase B · B1 added `quotations` + `saleOrders` (non-posting docs).
// v7: Phase B · B2 added `deliveryChallans` (non-posting docs).
// v8: Phase B · B3 added `purchaseOrders` (non-posting docs).
// v9: Phase B · B4 added `notes` + `purchaseReturns` (posting-linked).
// v10: Phase B · B5 added `cheques` (the instrument registry).
// v11: Phase C · C1 added `warehouses` + `stockLevels` (locations)
// — key "dukaan-ai-store-v11".
// v12: Phase C · C2 added `stockTransfers` (movement documents)
// — key "dukaan-ai-store-v12".
// v13: Phase C · C3 added `boms` (recipes) — key
// "dukaan-ai-store-v13".
// v14: Phase C · C4 added `productionOrders` (the factory floor)
// — key "dukaan-ai-store-v14".
// v15: Phase C · C5 added `jobs` (the job / work-order tracker)
// — key "dukaan-ai-store-v15".
// v16: Phase D · D1 added `employees` + `attendance` (the HR
// directory + register) and the declared-but-empty `payrollRuns`
// + `loans` shapes — key "dukaan-ai-store-v16".
const STORAGE_KEY = "dukaan-ai-store-v16";

export interface NewProduct {
  sku: string;
  name: string;
  urduName: string;
  category: string;
  unit: string;
  costPrice: number;
  salePrice: number;
  stockQty: number;
  reorderLevel: number;
  expiryDate?: string | null;
  /** Phase A · A4: tax slab override (null = shop default) + exempt. */
  taxSlabId?: string | null;
  taxExempt?: boolean;
  /** Phase C · C3: stock class — "raw" = raw material (value held
   *  in `inventory_raw`); null/absent = goods. */
  stockClass?: "raw" | null;
}

export interface BillLineInput {
  productId: string;
  qty: number;
  /**
   * Phase B (design §2.4): the ONE contained price seam. When
   * present, the priced line uses this unit price instead of the
   * product's current shelf price (it snapshots onto BillItem
   * exactly as a shelf price does today); when absent, behaviour is
   * byte-identical to before. ONLY conversion actions pass it —
   * from the source document's agreed prices. The free billing desk
   * passes none in Phase B: no new price-typing surface.
   */
  unitPrice?: number;
  /** Phase B (design §2.1): the parent line this line fulfils, on
   *  conversion-composed bills. */
  sourceProductId?: string | null;
}

export interface NewBillInput {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  lines: BillLineInput[];
  discountType: "flat" | "percent";
  discountValue: number;
  payments: BillPayment[];
  /** Phase B (design §2.1): conversion citation, stamped onto the
   *  bill by build paths when the desk draft came from a source
   *  document. Absent ⇒ a direct desk bill. */
  sourceType?: "order" | "challan" | "quotation" | "job" | null;
  sourceId?: string | null;
  /** Phase C · C1 (design §1.6): the warehouse the bill's stock
   *  leaves from — ONE per bill. The desk preselects the default;
   *  a conversion draft carries its source document's warehouse.
   *  Absent ⇒ the default warehouse. */
  warehouseId?: string | null;
}

export interface NewPurchaseInput {
  supplierId: string;
  lines: Array<{ productId: string; qty: number; unitCost: number }>;
  note: string;
  /** Phase B · B3 (design §2.1): set ONLY by `receiveAgainstPo` —
   *  the goods receipt was composed from this purchase order, and
   *  the resulting Purchase cites it (`Purchase.sourcePoId`). The
   *  posting itself is the ordinary purchase template, unchanged;
   *  the PO's cached status is recomputed inside the same batch. */
  sourcePoId?: string | null;
  /** Phase C · C1 (design §1.6): the warehouse the received stock
   *  lands in — the receiving desk's pick; `receiveAgainstPo`
   *  passes the PO's expected destination unless overridden there.
   *  Absent ⇒ the default warehouse. */
  warehouseId?: string | null;
}

/* ---------------- Phase B · B1: document chain inputs ---------------- */

/** One line of a quotation / sale order as the editor composes it:
 *  the product, the quantity and the AGREED price (defaults to the
 *  shelf price in the editor, editable — the document's own price,
 *  distinct from the bill-desk seam of §2.4). */
export interface DocLineInput {
  productId: string;
  qty: number;
  unitPrice: number;
}

export interface NewQuotationInput {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  lines: DocLineInput[];
  discountType: "flat" | "percent";
  discountValue: number;
  validUntil: string | null;
  note: string;
}

export interface NewSaleOrderInput {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  lines: DocLineInput[];
  discountType: "flat" | "percent";
  discountValue: number;
  expectedDate: string | null;
  note: string;
  /** Phase C · C1 (§1.6): the order's preferred warehouse
   *  (optional stamp; null/absent ⇒ the default warehouse). */
  warehouseId?: string | null;
}

/** Phase B · B2: a standalone delivery challan as the form composes
 *  it. Challans converted FROM an order are built by
 *  `convertOrderToChallan` instead (party + lines copied, citing
 *  the order); this input always describes a standalone delivery. */
export interface NewChallanInput {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  lines: DocLineInput[];
  vehicleNo: string;
  driverName: string;
  note: string;
  /** Phase C · C1 (§1.6): the warehouse the goods physically leave
   *  from (optional stamp; null/absent ⇒ the default warehouse). */
  warehouseId?: string | null;
}

/** Phase B · B3: a purchase order as the form composes it. Lines
 *  carry the AGREED cost (what the shop ordered at) — the actual
 *  invoice cost is settled at receipt time, in `receiveAgainstPo`. */
export interface NewPurchaseOrderInput {
  supplierId: string;
  lines: Array<{ productId: string; qty: number; unitCost: number }>;
  expectedDate: string | null;
  note: string;
  /** Phase C · C1 (§1.6): the expected destination warehouse
   *  (optional stamp; null/absent ⇒ the default warehouse). */
  warehouseId?: string | null;
}

/** Phase B · B4: a purchase return as the desk composes it — goods
 *  sent back against ONE recorded purchase, settled either by
 *  reducing what the shop owes the supplier (`payable_offset`, the
 *  default) or by the supplier handing money back now
 *  (`cash_refund` into a chosen money account). Posting it mints
 *  the formal debit note in the same batch (design §3.2). */
export interface NewPurchaseReturnInput {
  purchaseId: string;
  lines: Array<{ productId: string; qty: number }>;
  settlement: "payable_offset" | "cash_refund";
  /** Refund leg (settlement = cash_refund): the method + the money
   *  account the refund lands in (resolved like every money row). */
  method?: "cash" | "jazzcash" | "easypaisa" | "bank";
  accountId?: string | null;
  /** Why the goods went back — printed on the debit note. */
  reason: string;
}

/** Phase C · C2: a stock transfer as the desk composes it — goods
 *  moving between two of the shop's OWN warehouses. Lines carry
 *  quantities only: a transfer moves no value and no price exists
 *  on it (design §2.1). */
export interface NewStockTransferInput {
  fromWarehouseId: string;
  toWarehouseId: string;
  lines: Array<{ productId: string; qty: number }>;
  note: string;
}

/** Phase C · C3: a BOM recipe as the manufacturing desk composes
 *  it — one batch of `outputQty` finished units consuming the
 *  lines' quantities, with the batch's declared labour/overhead
 *  defaults for the C4 issue desk (design §3.1). Saving always
 *  creates a NEW version (§3.2); there is no edit-in-place. */
export interface NewBomInput {
  outputProductId: string;
  outputQty: number;
  labourCost: number;
  overheadCost: number;
  lines: Array<{ productId: string; qty: number }>;
  note: string;
}

/** Phase C · C4: a production order as the desk creates it —
 *  one recipe version, one warehouse, a planned quantity of
 *  finished units (design §4.2). The recipe is snapshotted by
 *  the store at creation; the order is born a DRAFT (no number,
 *  no events) and opens on its first issue or the explicit
 *  open action (§6.3). */
export interface NewProductionOrderInput {
  bomId: string;
  warehouseId?: string | null;
  plannedQty: number;
  note: string;
}

/** Phase C · C4: one materials issue against an order — the
 *  lib/production `IssueInput` shape, re-exported for the
 *  manufacturing surface. */
export type ProductionIssueInput = IssueInput;

/** Phase C · C5: a job as the desk takes it — a customer's work
 *  order (design §5.1). The job is BORN NUMBERED (the number
 *  mints inside createJob, §6.3's stated exception) at the
 *  first of the shop's stages; its warehouse is where its
 *  materials will be issued from. */
export interface NewJobInput {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  title: string;
  description: string;
  dueDateISO?: string | null;
  warehouseId?: string | null;
  labourCost?: number;
  note: string;
}

/** Phase D · D1: an employee as the directory form composes it —
 *  identity + current terms (design §1.1). The record carries no
 *  balance and no totals: positions and summaries derive
 *  (lib/payroll). */
export interface NewEmployeeInput {
  name: string;
  phone: string;
  designation: string;
  linkedUserEmail?: string | null;
  joinDateISO?: string | null;
  payBasis: "monthly" | "daily";
  baseAmount: number;
  allowances: Array<{ label: string; amount: number }>;
  paidLeaveDays: number;
  note: string;
}

/**
 * A bill draft handed to the EXISTING billing desk by a conversion
 * (design §2.3): the desk opens with the source document's customer,
 * lines (at the AGREED prices, through the §2.4 seam) and discount
 * prefilled. NOTHING is posted by preparing or holding this draft —
 * the bill posts only when the desk completes it through the
 * ordinary createBill / finalizeBill → postBill engine.
 *
 * B2 widens the sources: an order (B1), a delivery challan (prices
 * from its order when it cites one, else its own lines; discount
 * terms from the order when it cites one, else none — a challan
 * carries no totals of its own), or a quotation (its agreed prices
 * and discount terms).
 */
export interface BillDraftPrefill {
  sourceType: "order" | "challan" | "quotation" | "job";
  sourceId: string;
  sourceLabel: string; // e.g. "SO-7" / "DC-21" / "QT-12" — display only
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  discountType: "flat" | "percent";
  discountValue: number;
  lines: Array<{
    productId: string;
    qty: number;
    unitPrice: number;
    sourceProductId: string;
  }>;
  /* Phase C · C1 (design §1.6): the warehouse the converted bill
   * inherits — the challan's own stamp, else its order's
   * preference, else the order's (order drafts). Absent/null ⇒ the
   * desk's default. Quotations stay location-free (§12.3), so
   * their drafts never carry one. Phase C · C5: a job draft
   * carries the JOB's warehouse (its materials left from there;
   * the deliverable's own lines leave from there too, unless
   * the desk overrides before posting). */
  warehouseId?: string | null;
}

interface Collections {
  bills: Bill[];
  suppliers: Supplier[];
  purchases: Purchase[];
  supplierPayments: SupplierPayment[];
  expenses: Expense[];
  credits: CreditEntry[];
  customers: Customer[];
  returns: SaleReturn[];
  adjustments: StockAdjustment[];
  dayCloses: DayClose[];
  cashEntries: CashEntry[];
  journal: JournalEntry[];
  accounts: MoneyAccount[];
  taxSlabs: TaxSlab[];
  periods: Period[];
  quotations: Quotation[];
  saleOrders: SaleOrder[];
  deliveryChallans: DeliveryChallan[];
  purchaseOrders: PurchaseOrder[];
  notes: DocNote[];
  purchaseReturns: PurchaseReturn[];
  cheques: Cheque[];
  warehouses: Warehouse[];
  stockLevels: StockLevel[];
  stockTransfers: StockTransfer[];
  boms: Bom[];
  productionOrders: ProductionOrder[];
  jobs: Job[];
  employees: Employee[];
  attendance: AttendanceMonth[];
  payrollRuns: PayrollRun[];
  loans: Loan[];
  settings: ShopSettings;
}

const COLLECTION_NAMES = [
  "bills",
  "suppliers",
  "purchases",
  "supplierPayments",
  "expenses",
  "credits",
  "customers",
  "returns",
  "adjustments",
  "dayCloses",
  "cashEntries",
  "journal",
  "accounts",
  "taxSlabs",
  "periods",
  "quotations",
  "saleOrders",
  "deliveryChallans",
  "purchaseOrders",
  "notes",
  "purchaseReturns",
  "cheques",
  "warehouses",
  "stockLevels",
  "stockTransfers",
  "boms",
  "productionOrders",
  "jobs",
  "employees",
  "attendance",
  "payrollRuns",
  "loans",
] as const;

type CollectionName = (typeof COLLECTION_NAMES)[number];

interface StoreValue extends Collections {
  ready: boolean;
  products: Product[];
  sales: Sale[];
  /** The signed-in user's role in this shop (Phase A · A3):
   *  "owner" | "manager" | "cashier" | "accountant". Action guards
   *  below consult the permission matrix (`lib/permissions`) — the
   *  Firestore rules enforce the same table server-side. */
  role: ShopRole;
  /** True when the signed-in user works inside someone else's shop. */
  isStaff: boolean;
  // products / sales (original API)
  addProduct: (p: NewProduct) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  adjustStock: (id: string, delta: number) => void;
  recordSale: (productId: string, qty: number) => boolean;
  resetDemo: () => void;
  // billing
  createBill: (input: NewBillInput) => string | null;
  holdBill: (input: NewBillInput) => string | null;
  finalizeBill: (billId: string, payments: BillPayment[]) => boolean;
  discardHeldBill: (id: string) => void;
  voidBill: (billId: string) => boolean;
  returnItems: (
    billId: string,
    lines: BillLineInput[],
    refundMethod: "cash" | "jazzcash" | "easypaisa" | "bank",
    accountId?: string | null
  ) => boolean;
  /** Phase B · B4 (design §3.1 + G-2): the FORMAL return flow —
   *  the same returns engine as `returnItems`, plus a numbered
   *  credit note (CN- series) minted inside the return's own batch.
   *  Gated on the `creditDebitNotes` matrix row, NOT `returns`:
   *  the accountant issues notes (returns row: none) and the
   *  cashier never does (notes row: none). Returns the minted
   *  note's number, or null when refused. */
  returnItemsWithNote: (
    billId: string,
    lines: BillLineInput[],
    refundMethod: "cash" | "jazzcash" | "easypaisa" | "bank",
    accountId: string | null,
    reason: string,
    onNote?: (note: DocNote) => void
  ) => boolean;
  // suppliers
  addSupplier: (s: Omit<Supplier, "id" | "ts">) => void;
  updateSupplier: (id: string, patch: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  recordPurchase: (input: NewPurchaseInput) => string | null;
  recordSupplierPayment: (p: Omit<SupplierPayment, "id" | "ts" | "dayOffset">) => void;
  /** Phase B · B4 (design §3.2): the purchase-return engine —
   *  goods go back against a recorded purchase at its in-cost
   *  snapshot, input tax reverses cumulatively to the paisa, the
   *  journal posts the design template through the choke point,
   *  and a numbered debit note (DN- series) mints in the SAME
   *  batch. Gated on the `creditDebitNotes` matrix row (G-2).
   *  Returns the PurchaseReturn id, or null when refused
   *  (over-return is refused before anything is composed). */
  recordPurchaseReturn: (
    input: NewPurchaseReturnInput,
    onNote?: (note: DocNote) => void
  ) => string | null;
  // customers & credit
  addCustomer: (c: Omit<Customer, "id" | "ts">) => string;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addCredit: (c: {
    customerId: string | null;
    customerName: string;
    customerPhone: string;
    amount: number;
    note: string;
  }) => void;
  addRepayment: (c: {
    customerId: string | null;
    customerName: string;
    customerPhone: string;
    amount: number;
    method: "cash" | "jazzcash" | "easypaisa" | "bank";
    accountId?: string | null;
    note: string;
    /** Phase B · B5: the repayment arrived as a cheque — the
     *  entry debits `cheques_in_hand`, the registry doc is written
     *  in the same batch, and `accountId` is ignored (the deposit
     *  account is chosen at deposit time). */
    instrument?: "cheque";
    cheque?: ChequeDraft | null;
  }) => void;
  // cheques (Phase B · B5) — the registry lifecycle. Every action
  // gates on the `cheques` matrix row (owner/manager/accountant;
  // the cashier captures cheques inside their host flows but never
  // runs the lifecycle — design G-3) and refuses an invalid
  // transition BEFORE composing any write. Money transitions post
  // through the guarded choke point in the same batch as the
  // registry status update; deposit posts nothing (§4.3).
  /** Deposit an in-cheque at a bank: custody only — records the
   *  account the money will land in at clearing. No journal. */
  depositCheque: (chequeId: string, accountId: string | null) => boolean;
  /** Clear a deposited in-cheque (money lands) or an issued
   *  out-cheque (money leaves the drawn-on account). */
  clearCheque: (chequeId: string) => boolean;
  /** Bounce a deposited in-cheque (receivable restored via the
   *  journal + a compensating credits row; optional bank charges
   *  post as their own entry) or an issued supplier cheque
   *  (payable re-opens via the journal + a compensating reversal
   *  payment row). */
  bounceCheque: (chequeId: string, charges?: number) => boolean;
  /** Hand an undeposited in-cheque back to the customer: the
   *  mirror of its capture (receivable restored, same
   *  compensating credits-row treatment as a bounce). */
  returnCheque: (chequeId: string) => boolean;
  // expenses & cash book
  addExpense: (e: {
    category: ExpenseCategory;
    amount: number;
    method: Expense["method"];
    accountId?: string | null;
    note: string;
    dayOffset?: number;
    /** Phase B · B5: the expense was paid by an issued cheque —
     *  the entry credits `cheques_issued`, the registry doc is
     *  written in the same batch, and `accountId` names the
     *  account the cheque is drawn on. */
    instrument?: "cheque";
    cheque?: ChequeDraft | null;
  }) => void;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  addCashEntry: (e: {
    kind: "in" | "out";
    amount: number;
    note: string;
    /** A2: the money account; `method` remains as a legacy fallback. */
    accountId?: string | null;
    method?: "cash" | "wallet";
  }) => void;
  // money accounts (Phase A · A2)
  addMoneyAccount: (a: {
    name: string;
    kind: MoneyAccount["kind"];
    method: PayMethod | null;
  }) => void;
  renameMoneyAccount: (id: string, name: string) => void;
  archiveMoneyAccount: (id: string) => void;
  setDefaultMoneyAccount: (id: string, method: PayMethod) => void;
  transferFunds: (t: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    note: string;
  }) => boolean;
  // tax slabs (Phase A · A4) — owner-managed; defaults live in settings
  addTaxSlab: (s: Omit<TaxSlab, "id" | "ts">) => void;
  updateTaxSlab: (id: string, patch: Partial<TaxSlab>) => void;
  deleteTaxSlab: (id: string) => void;
  setTaxDefault: (direction: "sales" | "purchases", slabId: string | null) => void;
  recordTaxPayment: (p: {
    amount: number;
    method: "cash" | "jazzcash" | "easypaisa" | "bank";
    accountId?: string | null;
    note: string;
  }) => boolean;
  // periods & fiscal lock (Phase A · A5) — owner-only; the result
  // carries a machine reason the Settings UI maps to dictionary copy
  closePeriod: (throughDate: string, note: string) => PeriodActionResult;
  reopenPeriod: (throughDate: string | null, reason: string) => PeriodActionResult;
  // document chain (Phase B · B1) — NON-POSTING documents: none of
  // these actions writes a journal entry, moves stock or touches a
  // money/subledger collection (design §2.2, the cardinal rule)
  createQuotation: (input: NewQuotationInput) => string | null;
  updateQuotation: (id: string, input: NewQuotationInput) => boolean;
  deleteQuotation: (id: string) => void;
  issueQuotation: (id: string) => boolean;
  decideQuotation: (id: string, decision: "accepted" | "rejected") => boolean;
  cancelQuotation: (id: string) => boolean;
  convertQuotationToOrder: (
    id: string,
    picks: Array<{ productId: string; qty: number }>
  ) => string | null;
  createSaleOrder: (input: NewSaleOrderInput) => string | null;
  updateSaleOrder: (id: string, input: NewSaleOrderInput) => boolean;
  deleteSaleOrder: (id: string) => void;
  confirmSaleOrder: (id: string) => boolean;
  cancelSaleOrder: (id: string) => boolean;
  /** Prepare a billing-desk draft from an order's remaining lines.
   *  Posts nothing; the desk completes (or discards) it. */
  convertOrderToBill: (
    id: string,
    picks: Array<{ productId: string; qty: number }>
  ) => boolean;
  // document chain (Phase B · B2) — delivery challans ride the
  // saleOrders matrix row (design G-1). NON-POSTING like every
  // document: no action here writes a journal entry, moves stock or
  // touches a money/subledger collection. Conversions to a bill
  // only prepare desk drafts, exactly as convertOrderToBill does.
  createChallan: (input: NewChallanInput) => string | null;
  updateChallan: (id: string, input: NewChallanInput) => boolean;
  deleteChallan: (id: string) => void;
  dispatchChallan: (id: string) => boolean;
  cancelChallan: (id: string) => boolean;
  /** Create a DRAFT challan from an order's undelivered lines. */
  convertOrderToChallan: (
    orderId: string,
    picks: Array<{ productId: string; qty: number }>
  ) => string | null;
  /** Prepare a billing-desk draft from a challan's unbilled lines
   *  (prices from its order when it cites one, else its own). */
  convertChallanToBill: (
    id: string,
    picks: Array<{ productId: string; qty: number }>
  ) => boolean;
  /** Prepare a billing-desk draft from a quotation's unconverted
   *  lines at the quotation's agreed prices. */
  convertQuotationToBill: (
    id: string,
    picks: Array<{ productId: string; qty: number }>
  ) => boolean;
  /** The pending conversion draft for the billing desk (memory
   *  only — never persisted, never posted by itself). */
  billDraft: BillDraftPrefill | null;
  clearBillDraft: () => void;
  // document chain (Phase B · B3) — purchase orders. NON-POSTING
  // like every document: the CRUD/issue/cancel actions write ONLY
  // the purchaseOrders collection. Receiving is the one posting
  // seam of the purchase chain and it posts ONLY through the
  // existing recordPurchase engine (the purchase cites the PO;
  // its cached status is recomputed inside the receipt batch).
  createPurchaseOrder: (input: NewPurchaseOrderInput) => string | null;
  updatePurchaseOrder: (id: string, input: NewPurchaseOrderInput) => boolean;
  deletePurchaseOrder: (id: string) => void;
  issuePurchaseOrder: (id: string) => boolean;
  cancelPurchaseOrder: (id: string) => boolean;
  /** Receive goods against an issued PO: validates the picks
   *  against the DERIVED remaining quantities (over-receipt is
   *  refused before anything is composed), then posts the goods
   *  receipt through recordPurchase with the PO citation.
   *  Returns the purchase id, or null when refused. */
  receiveAgainstPo: (
    poId: string,
    picks: Array<{ productId: string; qty: number; unitCost?: number }>,
    /** Phase C · C1: receive into this warehouse instead of the
     *  PO's expected destination. Absent ⇒ the PO's, else default. */
    warehouseId?: string | null
  ) => string | null;
  // warehouses & stock rows (Phase C · C1) — the management surface
  // gates on the `warehouses` matrix row (owner/manager full,
  // cashier none, accountant read). Warehouse CRUD is non-posting;
  // recount repairs ROWS ONLY (design §1.7).
  addWarehouse: (input: { name: string; note: string }) => string | null;
  updateWarehouse: (
    id: string,
    patch: { name?: string; note?: string; archived?: boolean }
  ) => boolean;
  setDefaultWarehouse: (id: string) => boolean;
  /** Rewrite drifted products' rows so the split matches their
   *  totals again (§1.7). Returns how many products were repaired. */
  recountStockLevels: () => number;
  // stock transfers (Phase C · C2) — movement documents between the
  // shop's own warehouses. Dispatch/receive/return move ROWS ONLY
  // and post nothing; close-short is the one posting action (the
  // §2.3 loss, through the guarded choke point). Every action
  // gates on the `warehouses` matrix row (owner/manager write;
  // design §6.1/§6.2) and validates the transition + quantities
  // through lib/transfers BEFORE composing any write, so a refused
  // action (same-warehouse, over-receipt) writes nothing at all.
  createStockTransfer: (input: NewStockTransferInput) => string | null;
  updateStockTransfer: (id: string, input: NewStockTransferInput) => boolean;
  deleteStockTransfer: (id: string) => void;
  cancelStockTransfer: (id: string) => boolean;
  /** Dispatch a draft: mints the TR- number (§6.3) and drops the
   *  source warehouse's rows by the sent quantities, in one batch.
   *  The product totals do not change — the goods are on the road. */
  dispatchStockTransfer: (id: string) => boolean;
  /** Land goods at the destination (partial allowed, any number
   *  of times). Over-receipt is refused before anything is
   *  composed. Posts nothing. */
  receiveStockTransfer: (
    id: string,
    picks: Array<{ productId: string; qty: number }>
  ) => boolean;
  /** Close an open transfer accepting its shortage: the missing
   *  units post as a stock loss (refType "transfer_loss") at
   *  today's date through the choke point, product totals drop by
   *  the shortage, and the transfer lands as "received" (§2.3). */
  closeStockTransfer: (id: string) => boolean;
  /** Send everything still on the road back to the source
   *  warehouse's rows. Posts nothing. */
  returnStockTransfer: (id: string) => boolean;
  // Phase C · C3: BOM recipes (design §3). Saving creates a NEW
  // version of the output product's recipe and deactivates the
  // previous active version in the same batch — versions are
  // immutable and stay readable forever. A BOM posts NOTHING.
  // Refusals (validation) return false before anything is written.
  saveBomVersion: (input: NewBomInput) => boolean;
  // Phase C · C4: production orders (design §4.2). Every event
  // action gates on the `manufacturing` matrix row (owner/
  // manager write), validates + composes through
  // lib/production BEFORE any write, and posts its ONE journal
  // entry through the guarded choke point in the same batch as
  // the event record and the stock movements it causes.
  /** Create a DRAFT order from a recipe version (snapshotted).
   *  Posts nothing; drafts burn no numbers. Returns the id. */
  createProductionOrder: (input: NewProductionOrderInput) => string | null;
  /** Edit a DRAFT order's plan (planned qty / warehouse / note).
   *  An opened order is never edited — plan changes are a new
   *  order (§4.2). */
  updateProductionOrder: (
    id: string,
    patch: { plannedQty?: number; warehouseId?: string; note?: string }
  ) => boolean;
  /** Open a draft: mints its PR- number (§6.3). Posts nothing. */
  openProductionOrder: (id: string) => boolean;
  /** Delete a draft (drafts have no events by construction). */
  deleteProductionOrder: (id: string) => void;
  /** Cancel an order that has NO events (draft or opened-but-
   *  untouched). An order with events closes instead, so its
   *  residual pool can never strand in WIP. Posts nothing. */
  cancelProductionOrder: (id: string) => boolean;
  /** Issue materials for one run: components leave the order
   *  warehouse's rows at their shelf costs, Dr `wip` through
   *  the choke point, labour/overhead settled per the §4.4
   *  choice on the input. A first issue on a draft opens it
   *  (number minted in the same batch). */
  issueProductionMaterials: (
    id: string,
    input: ProductionIssueInput
  ) => boolean;
  /** Record finished units landing in the order warehouse:
   *  Dr `inventory` / Cr `wip` at the absorbed value (§4.2
   *  cumulative absorption, final-absorb); the output product's
   *  shelf cost becomes the absorbed unit cost. */
  completeProduction: (
    id: string,
    qty: number,
    opts?: { final?: boolean }
  ) => boolean;
  /** Record spoiled output: Dr `inventory_loss` / Cr `wip` at
   *  the absorbed share of the pool. No stock rows move. */
  scrapProduction: (id: string, qty: number) => boolean;
  /** Close an open order that will produce no more: the
   *  residual pool posts to `inventory_loss` exactly (a
   *  closeout event, refType "production_scrap", §6.4); the
   *  order lands completed when anything was produced,
   *  cancelled when nothing was. */
  closeProductionOrder: (id: string) => boolean;
  // Phase C · C5: jobs / work orders (design §5). Card + stage
  // actions gate on the `jobTracker` matrix row (owner/manager
  // write; cashier/accountant read — G-C4: the matrix stands as
  // the owner approved it in A3). Material events validate +
  // compose through lib/jobs BEFORE any write and post their
  // ONE entry through the guarded choke point in the job's own
  // batch. Advances are NOT a job action: they ride the
  // existing `addRepayment` (the job surface calls it with a
  // job-citing note, §5.3/G-C3).
  /** Take a job: born numbered (JB-, §5.1), at the first of
   *  the shop's stages, status open. Posts nothing. */
  createJob: (input: NewJobInput) => string | null;
  /** Edit a job's card (title/description/customer/due date/
   *  labour/note). The warehouse may move ONLY while the job
   *  has no material events — a return must land where its
   *  issue left from. A cancelled job is not edited. */
  updateJob: (
    id: string,
    patch: Partial<
      Pick<
        Job,
        | "customerName"
        | "customerPhone"
        | "title"
        | "description"
        | "dueDateISO"
        | "warehouseId"
        | "labourCost"
        | "note"
      >
    >
  ) => boolean;
  /** Advance/return the job to a stage of the shop's list
   *  (§5.2); the lifecycle label recomputes from the stage
   *  position. Terminal jobs refuse. */
  setJobStage: (id: string, stage: string) => boolean;
  /** The explicit delivery action (§5.2): status delivered.
   *  (Posting a bill that cites the job is delivery-with-bill
   *  and flips it in the bill's own batch, §5.4.) */
  deliverJob: (id: string) => boolean;
  /** Cancel a job that was never delivered. Materials already
   *  issued stay issued (their cost is posted truth); return
   *  them first if they came back. */
  cancelJob: (id: string) => boolean;
  /** Issue materials to a job: rows + totals drop at the job's
   *  warehouse, Dr `cogs` through the choke point, the events
   *  appended to the job in the same batch (§5.3). */
  issueJobMaterials: (
    id: string,
    picks: Array<{ productId: string; qty: number }>
  ) => boolean;
  /** Return unused materials from a job: the mirror — rows +
   *  totals restore at the job's warehouse, Dr the class
   *  accounts / Cr `cogs` (§5.3). */
  returnJobMaterials: (
    id: string,
    picks: Array<{ productId: string; qty: number }>
  ) => boolean;
  /** "Bill this job" (§5.4): prepare the billing-desk draft
   *  citing the job (customer + warehouse prefilled, NO lines
   *  — the desk composes the charge lines; materials already
   *  issued are listed at the desk, R-C7). Writes NOTHING.
   *  Gates on `billing` write (G-C3). */
  convertJobToBill: (id: string) => boolean;
  // Phase D · D1: employees & attendance (design §1). Directory
  // CRUD + the register gate on the `staffDirectory` matrix row
  // (owner/manager full, cashier none, accountant read — the
  // pre-declared A3 row, G-D1). NEITHER action posts anything:
  // the directory is identity + terms, the register is time.
  /** Add an employee to the directory. Returns the id, or null
   *  when refused (permission / blank name). */
  addEmployee: (input: NewEmployeeInput) => string | null;
  /** Edit an employee's identity/terms (incl. `active` for
   *  deactivate/reactivate). Terms edits change future runs
   *  only — posted runs keep their snapshots (§1.1). */
  updateEmployee: (id: string, patch: Partial<Employee>) => boolean;
  /** Delete a NEVER-USED employee (design §1.5): refused when
   *  any attendance doc, payroll line, loan link or journal
   *  line cites them — such an employee is archive-only
   *  (deactivate), because history is never deleted. */
  deleteEmployee: (id: string) => boolean;
  /** Set (or clear, with null) one day's mark on the register.
   *  Creates the employee-month doc on first mark (deterministic
   *  id, §1.3). Posts nothing, ignores period locks (§7). */
  setAttendanceMark: (
    employeeId: string,
    month: string,
    day: number,
    mark: AttendanceMark | null
  ) => boolean;
  // Phase D · D2: payroll runs, payments, advances (design §2).
  // Every money action gates on the `payroll` matrix row
  // (owner/accountant write; manager read — G-D2) and posts
  // through the A5 choke point in the SAME batch as its run doc.
  /** Compose a DRAFT run for a month from the directory +
   *  register (the real `buildRunLines`). Returns the existing
   *  draft's id when the month already has one; null when
   *  refused. A draft posts nothing and burns no number. */
  composePayrollRun: (month: string) => string | null;
  /** Replace a DRAFT run's lines/note (desk overrides live on
   *  the line snapshots); totals recompute from the lines.
   *  Posted/reversed runs refuse — they are corrected by
   *  reversal, never edited (§2.6). */
  updatePayrollRun: (
    id: string,
    lines: PayrollRunLine[],
    note: string
  ) => boolean;
  /** Delete a DRAFT run (owner only, mirroring the rules —
   *  posted history is never deleted). */
  deletePayrollRun: (id: string) => boolean;
  /** Finalise a draft: mint its PAY- number and post the ONE
   *  net accrual entry (§2.4) in the same batch. Refused when
   *  another POSTED run already covers the month (the
   *  one-posted-run guard) or when no line accrues anything. */
  finalisePayrollRun: (id: string) => boolean;
  /** Pay one line of a POSTED run (full or partial) — or, with
   *  `employeeId: null`, settle part of the unassigned
   *  production bucket (§2.2/§2.4). One payment entry + the
   *  event appended to the run, one batch. Amounts are capped
   *  at what the run (or the bucket) still owes. */
  payPayrollEmployee: (
    runId: string,
    input: {
      employeeId: string | null;
      amount: number;
      method: PayMethod;
      accountId?: string | null;
    }
  ) => boolean;
  /** Reverse ONE payment event of a posted run (its mirror
   *  entry + a negative reversing event, §2.6). The payment's
   *  own entry is found on the run's events; an already-reversed
   *  payment refuses (the journal shows its mirror). */
  reversePayrollPayment: (runId: string, entryId: string) => boolean;
  /** Reverse a POSTED run's accrual (mirror entry; the run
   *  reads `reversed` and its month may be re-run). Payments
   *  already made STAND — they sit as advance positions
   *  (§2.6). */
  reversePayrollRun: (id: string) => boolean;
  /** Give a salary advance (Dr `salary_payable` ref = employee
   *  / Cr money, §2.4). Recovery is derived, never posted.
   *  Returns the entry id, or null when refused. */
  giveSalaryAdvance: (input: {
    employeeId: string;
    amount: number;
    method: PayMethod;
    accountId?: string | null;
  }) => string | null;
  // stock adjustments
  recordAdjustment: (
    productId: string,
    delta: number,
    reason: AdjustmentReason,
    note: string,
    /** Phase C · C1: the warehouse the adjustment is recorded at
     *  (the adjustment desk's pick). Absent ⇒ the default. */
    warehouseId?: string | null
  ) => void;
  // day close
  saveDayClose: (d: Omit<DayClose, "id" | "ts" | "dayOffset">) => void;
  // settings & staff (owner-only in production; roles per A3 matrix)
  updateSettings: (patch: Partial<ShopSettings>) => void;
  addStaff: (email: string, role: StaffRole) => void;
  setStaffRole: (email: string, role: StaffRole) => void;
  removeStaff: (email: string) => void;
  // bulk import
  importProducts: (list: NewProduct[]) => void;
}

/** Result of a period close/reopen (Phase A · A5): on failure the
 *  `reason` names the rule that refused, for dictionary mapping. */
export type PeriodActionResult =
  | { ok: true }
  | {
      ok: false;
      reason: "permission" | "invalid" | "rail" | "backwards" | "nothing" | "reason";
    };

const StoreContext = createContext<StoreValue | null>(null);

function emptyCollections(): Collections {
  return {
    bills: [],
    suppliers: [],
    purchases: [],
    supplierPayments: [],
    expenses: [],
    credits: [],
    customers: [],
    returns: [],
    adjustments: [],
    dayCloses: [],
    cashEntries: [],
    journal: [],
    accounts: [],
    taxSlabs: [],
    periods: [],
    quotations: [],
    saleOrders: [],
    deliveryChallans: [],
    purchaseOrders: [],
    notes: [],
    purchaseReturns: [],
    cheques: [],
    warehouses: [],
    stockLevels: [],
    stockTransfers: [],
    boms: [],
    productionOrders: [],
    jobs: [],
    employees: [],
    attendance: [],
    payrollRuns: [],
    loans: [],
    settings: { shopName: "", address: "", phone: "", staffEmails: [], staff: [] },
  };
}

function seedCollections(): Collections {
  const products = getSeedProducts();
  const sales = getSeedSales();
  const purchases = getSeedPurchases();
  const supplierPayments = getSeedSupplierPayments();
  const expenses = getSeedExpenses();
  const credits = getSeedCredits();
  return {
    bills: [],
    suppliers: getSeedSuppliers(),
    purchases,
    supplierPayments,
    expenses,
    credits,
    customers: getSeedCustomers(),
    returns: [],
    adjustments: [],
    dayCloses: [],
    cashEntries: [],
    journal: getSeedJournal(products, sales, purchases, supplierPayments, expenses, credits),
    accounts: getSeedAccounts(),
    taxSlabs: getSeedTaxSlabs(),
    periods: [],
    // Phase B · B1/B2: DEMO-only discoverability documents (§10).
    // The production seeder never pushes these collections, so a
    // real shop starts with them empty; the docs are non-posting,
    // so the seed journal above is untouched by their presence.
    quotations: getSeedQuotations(getSeedCustomers(), products),
    saleOrders: getSeedSaleOrders(getSeedCustomers(), products),
    deliveryChallans: getSeedDeliveryChallans(
      getSeedSaleOrders(getSeedCustomers(), products)
    ),
    // Phase B · B3: purchase orders start EMPTY everywhere (§10's
    // discoverability set names no demo PO; the production seeder
    // never pushes this collection either).
    purchaseOrders: [],
    // Phase B · B4: notes + purchase returns start EMPTY everywhere
    // (§10: new collections only; a note exists only when a real
    // return posts one — the seed journal is untouched).
    notes: [],
    purchaseReturns: [],
    // Phase B · B5: the cheque registry starts EMPTY everywhere
    // too. §10's demo discoverability set names "one in-cheque in
    // the drawer" — deliberately NOT seeded: a registry-only
    // in-cheque would carry no journal footprint, breaking the
    // §4.3 identity (Σ uncleared registry == journal
    // `cheques_in_hand`) inside the seed itself. A cheque exists
    // only when a real capture writes it, in demo and production
    // alike (the production seeder never pushes this collection).
    cheques: [],
    // Phase C · C1 (design §10.1/§10.3): the seed ships the
    // MIGRATED end-state directly — the default warehouse holding
    // all seed stock in complete rows, plus one empty Godown —
    // with the stockV1 flag pre-set (seed settings below). Rows
    // are quantity-only operational detail: the seed journal
    // above is untouched by their presence.
    warehouses: getSeedWarehouses(),
    stockLevels: getSeedStockLevels(products),
    // Phase C · C2 (design §10.3): ONE demo DRAFT transfer —
    // discoverability only. It has dispatched nothing, so no rows
    // move and the seed journal above is untouched; the production
    // seeder never pushes this collection.
    stockTransfers: getSeedStockTransfers(products),
    // Phase C · C3 (design §10.3): ONE demo BOM — the bulk-rice
    // repack recipe. A BOM posts nothing and holds no stock, so
    // the seed journal above is untouched by its presence; the
    // production seeder never pushes this collection.
    boms: getSeedBoms(products),
    // Phase C · C4 (design §10.3): ONE demo DRAFT production
    // order against that BOM — no events, no number, nothing
    // posted, so the seed journal above is untouched by its
    // presence; the production seeder never pushes this
    // collection either.
    productionOrders: getSeedProductionOrders(products, getSeedBoms(products)),
    // Phase C · C5 (design §10.3): ONE demo job — open, at the
    // first stage, no material events and no advance, so nothing
    // posted and the seed journal above is untouched by its
    // presence; the production seeder never pushes this
    // collection either.
    jobs: getSeedJobs(getSeedCustomers()),
    // Phase D · D1 (design §10.3): TWO demo employees (one
    // monthly, one daily) + the current month's register marked
    // to today. Directory and attendance docs assert no money
    // fact — neither collection posts anything, ever — so the
    // seed journal above is untouched by their presence; the
    // production seeder never pushes these collections either.
    employees: getSeedEmployees(),
    attendance: getSeedAttendance(getSeedEmployees()),
    // Phase D · D2 (design §10.3): ONE demo payroll run — a
    // DRAFT for the current month composed by the real composer
    // from the sample employees + register. A draft posts
    // nothing (no number, no accrual entry), so the frozen
    // journal above is untouched; loans' demo doc arrives in D3.
    payrollRuns: [getSeedPayrollRunDraft(getSeedEmployees(), getSeedAttendance(getSeedEmployees()))],
    loans: [],
    settings: {
      ...getSeedSettings(),
      staff: parseStaff(getSeedSettings().staff),
      phaseC: { stockV1: true },
      phaseD: { hrV1: true },
    },
  };
}

/** Phase C · C3 (design §10.3): the demo shop holds the demo
 *  BOM's bulk component as a RAW material. Demo state only — the
 *  seed product list itself stays class-free, so a fresh
 *  production seed carries NO raw products and its journal is the
 *  frozen one; `seedCollections` likewise keeps composing the
 *  journal and rows from the unmarked list. */
function demoSeedProducts(): Product[] {
  return getSeedProducts().map((p) =>
    p.id === SEED_DEMO_RAW_PRODUCT_ID ? { ...p, stockClass: "raw" as const } : p
  );
}

function loadInitial(): { products: Product[]; sales: Sale[] } & Collections {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { products: Product[]; sales: Sale[] } & Collections;
      if (Array.isArray(parsed.products) && Array.isArray(parsed.sales)) {
        return {
          ...seedCollections(),
          ...parsed,
          settings: {
            ...getSeedSettings(),
            ...(parsed.settings ?? {}),
            staff: parseStaff(parsed.settings?.staff),
          },
        };
      }
    }
  } catch {
    /* fall through to seed */
  }
  return { products: demoSeedProducts(), sales: getSeedSales(), ...seedCollections() };
}

/** Push a journal entry into a cloud batch. */
function batchJournal(batch: WriteBatch, db: Firestore, uid: string, e: JournalEntry) {
  batch.set(doc(db, "users", uid, "journal", e.id), { ...e });
}

/**
 * Phase C · C1: apply a signed quantity delta to one stock-level
 * row inside a cloud batch — the cloud mirror of the demo state's
 * `applyLevelDelta`. The deterministic doc id (§1.3) plus
 * merge-set makes the write an idempotent create-or-increment: the
 * row's identity fields ride along so a first write is a complete
 * row, and later writes change only `qty`.
 */
function batchLevelDelta(
  batch: WriteBatch,
  db: Firestore,
  uid: string,
  warehouseId: string,
  productId: string,
  delta: number
) {
  if (delta === 0) return;
  const id = levelIdFor(warehouseId, productId);
  batch.set(
    doc(db, "users", uid, "stockLevels", id),
    { id, productId, warehouseId, qty: increment(delta) },
    { merge: true }
  );
}

/**
 * Build a stock adjustment + its journal entry (F-4/F-11). The delta
 * is clamped to what can actually move on the shelf FIRST
 * (`appliedAdjustmentDelta`), and the adjustments-log row, the shelf
 * quantity and the journal entry all carry that same clamped delta,
 * valued at the product's current cost — so the Inventory account can
 * never drift from the shelf through this path. Losses post
 * Dr inventory_loss / Cr inventory; gains mirror it.
 */
function buildAdjustment(
  product: Product,
  rawDelta: number,
  reason: AdjustmentReason,
  note: string,
  counterpart: "inventory_loss" | "capital" = "inventory_loss",
  /** Phase C · C1: the warehouse the adjustment is recorded at —
   *  stamped on the row (§1.5); absent keeps the pre-C shape. */
  warehouseId?: string | null
): { adj: StockAdjustment; entry: JournalEntry; newQty: number } | null {
  const delta = appliedAdjustmentDelta(product.stockQty, rawDelta);
  if (delta === 0) return null;
  const adj: StockAdjustment = {
    id: newId("adj"),
    productId: product.id,
    productName: product.name,
    delta,
    reason,
    note,
    ...(warehouseId ? { warehouseId } : {}),
    dayOffset: 0,
    ts: new Date().toISOString(),
  };
  const cost = Math.abs(delta) * product.costPrice;
  // Phase C · C3 (§4.1): the stock-value leg follows the product's
  // class — a raw material adjusts against `inventory_raw`. With
  // no raw products this is `inventory`, byte-identical to pre-C3.
  const acct = inventoryAccountFor(product);
  const entry =
    delta < 0
      ? makeEntry(`Stock ${reason} — ${product.name}`, "adjustment", adj.id, [
          { account: "inventory_loss", debit: cost, credit: 0 },
          { account: acct, debit: 0, credit: cost },
        ])
      : makeEntry(`Stock ${reason} — ${product.name}`, "adjustment", adj.id, [
          { account: acct, debit: cost, credit: 0 },
          { account: counterpart, debit: 0, credit: cost },
        ]);
  return { adj, entry, newQty: product.stockQty + delta };
}

/** Validate a raw owner-doc `staff[]` value (Phase A · A3). Entries
 *  with a missing/unrecognised role resolve to "manager" — the same
 *  legacy default the client and the rules apply everywhere. */
function parseStaff(raw: unknown): StaffMember[] {
  if (!Array.isArray(raw)) return [];
  const out: StaffMember[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const m = item as Partial<StaffMember> | null;
    const email = typeof m?.email === "string" ? m.email.trim().toLowerCase() : "";
    if (!email || seen.has(email)) continue;
    seen.add(email);
    out.push({
      email,
      role: resolveStaffRole(m?.role),
      addedAt: typeof m?.addedAt === "string" ? m.addedAt : "",
    });
  }
  return out;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { mode, user, role, dataUid } = useAuth();
  const cloud = mode === "production";
  const uid = dataUid;
  const isStaff = role !== "owner";

  const [ready, setReady] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cols, setCols] = useState<Collections>(emptyCollections());
  // Phase B · B1: a conversion's billing-desk draft (memory only).
  const [billDraft, setBillDraft] = useState<BillDraftPrefill | null>(null);
  const clearBillDraft = useCallback(() => setBillDraft(null), []);

  const productsRef = useRef<Product[]>([]);
  productsRef.current = products;
  const salesRef = useRef<Sale[]>([]);
  salesRef.current = sales;
  const billsRef = useRef<Bill[]>([]);
  billsRef.current = cols.bills;
  const journalRef = useRef<JournalEntry[]>([]);
  journalRef.current = cols.journal;
  const returnsRef = useRef<SaleReturn[]>([]);
  returnsRef.current = cols.returns;
  const creditsRef = useRef<CreditEntry[]>([]);
  creditsRef.current = cols.credits;
  const colsRef = useRef<Collections>(cols);
  colsRef.current = cols;
  const settingsRef = useRef<ShopSettings>(cols.settings);
  settingsRef.current = cols.settings;
  const accountsRef = useRef<MoneyAccount[]>([]);
  accountsRef.current = cols.accounts;
  const taxSlabsRef = useRef<TaxSlab[]>([]);
  taxSlabsRef.current = cols.taxSlabs;
  const warehousesRef = useRef<Warehouse[]>([]);
  warehousesRef.current = cols.warehouses;
  const levelsRef = useRef<StockLevel[]>([]);
  levelsRef.current = cols.stockLevels;
  // A3: store guards read the role through a ref so a callback
  // created before auth resolution can never act on a stale role.
  const roleRef = useRef<ShopRole>(role);
  roleRef.current = role;

  /**
   * A2 — resolve the money account a posting settles into: the
   * explicitly chosen account when it is live, else the method's
   * default (`defaultAccountForMethod`). The resolved id is stamped
   * on the operational record AND as the journal line's `ref` — the
   * ref is authoritative for balances (design §1.3).
   */
  const resolveAccountId = useCallback(
    (method: PayMethod, explicit?: string | null): string | null => {
      const accounts = accountsRef.current;
      if (explicit) {
        const chosen = accounts.find((a) => a.id === explicit && !a.archived);
        if (chosen) return chosen.id;
      }
      return defaultAccountForMethod(accounts, method)?.id ?? null;
    },
    []
  );

  /**
   * A4 — resolve the tax slab for one product + direction against
   * the live slab list and the settings defaults (design §2.2).
   * Returns null whenever the shop has no applicable tax configured,
   * which is what keeps every no-tax figure identical to pre-A4.
   */
  const resolveSlab = useCallback(
    (product: Product | undefined, direction: "sales" | "purchases"): TaxSlab | null =>
      resolveTaxSlab(product, taxSlabsRef.current, settingsRef.current, direction),
    []
  );

  /**
   * A4 — price the tax on a set of priced bill lines and STAMP the
   * resolution onto them (design §2.2: slab id/name/rate/kind/
   * inclusive + the line's tax on its post-discount base ride on the
   * bill forever, exactly like the unitCost snapshot). Returns the
   * stamped items and the bill-level tax figures.
   */
  const stampBillTaxes = useCallback(
    (items: Bill["items"], discountAmount: number) => {
      const result = computeBillTaxes(
        items.map((it) => ({
          total: it.total,
          qty: it.qty,
          slab: resolveSlab(
            productsRef.current.find((x) => x.id === it.productId),
            "sales"
          ),
        })),
        discountAmount
      );
      const stamped = items.map((it, i) => {
        const info = result.lines[i];
        const slab = info?.slab ?? null;
        return {
          ...it,
          taxAmount: info?.taxAmount ?? 0,
          taxSlabId: slab?.id ?? null,
          taxSlabName: slab?.name ?? null,
          taxRate: slab?.rate ?? 0,
          taxKind: (slab?.kind ?? "percent") as "percent" | "fixed",
          taxInclusive: slab?.inclusive ?? false,
        };
      });
      return {
        items: stamped,
        taxAmount: result.taxAmount,
        exclusiveTax: result.exclusiveTax,
        inclusiveTax: result.inclusiveTax,
        total: result.total,
      };
    },
    [resolveSlab]
  );

  /**
   * Phase C · C1 — resolve a document's warehouse stamp to the
   * warehouse a movement touches (the stamp when it names a real
   * warehouse, else the shop default — §1.3/§1.6), and read a
   * product's quantity at a warehouse through the resolution rule.
   * Every stock path below routes through these two so cloud and
   * demo apply the SAME location discipline.
   */
  const resolveWh = useCallback(
    (stamp?: string | null): string =>
      resolveWarehouseId(warehousesRef.current, stamp),
    []
  );

  const qtyAtWh = useCallback(
    (product: Product, warehouseId: string): number =>
      qtyAtWarehouse(product, levelsRef.current, warehousesRef.current, warehouseId),
    []
  );

  /** Demo-state mirror of `batchLevelDelta`: fold a list of row
   *  deltas into the stockLevels slice, in the same state update
   *  family as the movement that caused them. */
  const applyDemoLevels = useCallback(
    (deltas: Array<{ warehouseId: string; productId: string; delta: number }>) => {
      const effective = deltas.filter((d) => d.delta !== 0);
      if (effective.length === 0) return;
      setCols((prev) => {
        let levels = prev.stockLevels;
        for (const d of effective) {
          levels = applyLevelDelta(levels, d.warehouseId, d.productId, d.delta);
        }
        return levels === prev.stockLevels ? prev : { ...prev, stockLevels: levels };
      });
    },
    []
  );

  const setCol = useCallback((key: keyof Collections, val: unknown) => {
    setCols((prev) => ({ ...prev, [key]: val }));
  }, []);

  /* ---------------- DEMO MODE: localStorage ---------------- */
  useEffect(() => {
    if (cloud) return;
    const initial = loadInitial();
    setProducts(initial.products);
    setSales(initial.sales);
    setCols({
      bills: initial.bills,
      suppliers: initial.suppliers,
      purchases: initial.purchases,
      supplierPayments: initial.supplierPayments,
      expenses: initial.expenses,
      credits: initial.credits,
      customers: initial.customers,
      returns: initial.returns,
      adjustments: initial.adjustments,
      dayCloses: initial.dayCloses,
      cashEntries: initial.cashEntries,
      journal: initial.journal,
      accounts: initial.accounts,
      taxSlabs: initial.taxSlabs,
      periods: initial.periods ?? [],
      quotations: initial.quotations ?? [],
      saleOrders: initial.saleOrders ?? [],
      deliveryChallans: initial.deliveryChallans ?? [],
      purchaseOrders: initial.purchaseOrders ?? [],
      notes: initial.notes ?? [],
      purchaseReturns: initial.purchaseReturns ?? [],
      cheques: initial.cheques ?? [],
      warehouses: initial.warehouses ?? [],
      stockLevels: initial.stockLevels ?? [],
      stockTransfers: initial.stockTransfers ?? [],
      boms: initial.boms ?? [],
      productionOrders: initial.productionOrders ?? [],
      jobs: initial.jobs ?? [],
      employees: initial.employees ?? [],
      attendance: initial.attendance ?? [],
      payrollRuns: initial.payrollRuns ?? [],
      loans: initial.loans ?? [],
      settings: initial.settings,
    });
    setReady(true);
  }, [cloud]);

  useEffect(() => {
    if (cloud || !ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, sales, ...cols }));
    } catch {
      /* storage unavailable — session-only mode */
    }
  }, [products, sales, cols, ready, cloud]);

  /* ---------------- PRODUCTION MODE: Firestore ---------------- */
  useEffect(() => {
    if (!cloud) return;
    if (!uid) {
      setReady(false);
      setProducts([]);
      setSales([]);
      setCols(emptyCollections());
      return;
    }
    const db = getFirestoreDb();
    if (!db) return;
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    const attach = () => {
      if (cancelled) return;
      const sub = <T,>(name: string, apply: (list: T[]) => void, sortFn?: (a: T, b: T) => number) => {
        unsubs.push(
          onSnapshot(
            collection(db, "users", uid, name),
            (qs) => {
              const list = qs.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as T);
              if (sortFn) list.sort(sortFn);
              apply(list);
            },
            () => undefined
          )
        );
      };
      const byTs = (a: { ts: string }, b: { ts: string }) => a.ts.localeCompare(b.ts);
      sub<Product>("products", (l) => { setProducts(l); setReady(true); }, (a, b) => a.name.localeCompare(b.name));
      sub<Sale>("sales", setSales, byTs);
      sub<Bill>("bills", (l) => setCol("bills", l), byTs);
      sub<Supplier>("suppliers", (l) => setCol("suppliers", l), (a, b) => a.name.localeCompare(b.name));
      sub<Purchase>("purchases", (l) => setCol("purchases", l), byTs);
      sub<SupplierPayment>("supplierPayments", (l) => setCol("supplierPayments", l), byTs);
      sub<Expense>("expenses", (l) => setCol("expenses", l), byTs);
      sub<CreditEntry>("credits", (l) => setCol("credits", l), byTs);
      sub<Customer>("customers", (l) => setCol("customers", l), (a, b) => a.name.localeCompare(b.name));
      sub<SaleReturn>("returns", (l) => setCol("returns", l), byTs);
      sub<StockAdjustment>("adjustments", (l) => setCol("adjustments", l), byTs);
      sub<DayClose>("dayCloses", (l) => setCol("dayCloses", l), byTs);
      sub<CashEntry>("cashEntries", (l) => setCol("cashEntries", l), byTs);
      sub<JournalEntry>("journal", (l) => setCol("journal", l), byTs);
      sub<MoneyAccount>("accounts", (l) => setCol("accounts", l), (a, b) => a.sortOrder - b.sortOrder);
      sub<TaxSlab>("taxSlabs", (l) => setCol("taxSlabs", l), (a, b) => a.name.localeCompare(b.name));
      sub<Period>("periods", (l) => setCol("periods", l), byTs);
      sub<Quotation>("quotations", (l) => setCol("quotations", l), byTs);
      sub<SaleOrder>("saleOrders", (l) => setCol("saleOrders", l), byTs);
      sub<DeliveryChallan>("deliveryChallans", (l) => setCol("deliveryChallans", l), byTs);
      sub<PurchaseOrder>("purchaseOrders", (l) => setCol("purchaseOrders", l), byTs);
      sub<DocNote>("notes", (l) => setCol("notes", l), byTs);
      sub<PurchaseReturn>("purchaseReturns", (l) => setCol("purchaseReturns", l), byTs);
      sub<Cheque>("cheques", (l) => setCol("cheques", l), byTs);
      sub<Warehouse>("warehouses", (l) => setCol("warehouses", l), (a, b) => a.sortOrder - b.sortOrder);
      sub<StockLevel>("stockLevels", (l) => setCol("stockLevels", l), (a, b) => a.id.localeCompare(b.id));
      sub<StockTransfer>("stockTransfers", (l) => setCol("stockTransfers", l), byTs);
      // Phase C · C4: the C3 BOM subscription rides along here —
      // C3 shipped the collection + write path without a live
      // subscription, so a cloud shop's recipe list never
      // refreshed; production orders read recipes from the
      // store, so the gap had to close with this increment.
      sub<Bom>("boms", (l) => setCol("boms", l), byTs);
      sub<ProductionOrder>("productionOrders", (l) => setCol("productionOrders", l), byTs);
      sub<Job>("jobs", (l) => setCol("jobs", l), byTs);
      // Phase D · D1: the HR collections. Reads are narrowed at
      // the RULES level (owner/manager/accountant — salary data
      // is not counter data, §6.2); a cashier's subscription is
      // simply denied and the surface never renders for them.
      sub<Employee>("employees", (l) => setCol("employees", l), (a, b) => a.name.localeCompare(b.name));
      sub<AttendanceMonth>("attendance", (l) => setCol("attendance", l), byTs);
      sub<PayrollRun>("payrollRuns", (l) => setCol("payrollRuns", l), byTs);
      sub<Loan>("loans", (l) => setCol("loans", l), byTs);
      // Settings live on the owner doc itself.
      unsubs.push(
        onSnapshot(
          doc(db, "users", uid),
          (snap) => {
            const d = snap.data() ?? {};
            setCol("settings", {
              shopName: String(d.shopName ?? ""),
              address: String(d.address ?? ""),
              phone: String(d.phone ?? ""),
              staffEmails: Array.isArray(d.staffEmails) ? (d.staffEmails as string[]) : [],
              staff: parseStaff(d.staff),
              defaultSalesTaxSlabId: (d.defaultSalesTaxSlabId as string | null) ?? null,
              defaultPurchaseTaxSlabId: (d.defaultPurchaseTaxSlabId as string | null) ?? null,
              // A5: the fiscal-year start + the period-lock
              // enforcement value live on this doc too.
              fiscalYearStartMonth:
                typeof d.fiscalYearStartMonth === "number" ? d.fiscalYearStartMonth : undefined,
              fiscalYearStartDay:
                typeof d.fiscalYearStartDay === "number" ? d.fiscalYearStartDay : undefined,
              lockedThrough: typeof d.lockedThrough === "string" ? d.lockedThrough : "",
              phaseA: (d.phaseA as ShopSettings["phaseA"]) ?? undefined,
              // Phase C · C1: the stockV1 migration flag.
              phaseC: (d.phaseC as ShopSettings["phaseC"]) ?? undefined,
              // Phase D · D1: the hrV1 migration flag + the D5
              // Tally ledger-name overrides (declared in D1).
              phaseD: (d.phaseD as ShopSettings["phaseD"]) ?? undefined,
              tallyLedgerNames:
                (d.tallyLedgerNames as ShopSettings["tallyLedgerNames"]) ?? undefined,
              // Phase B · B1: document-numbering prefix overrides.
              docSeries: (d.docSeries as ShopSettings["docSeries"]) ?? undefined,
              // Phase C · C4: the production desk's settlement
              // preference (§4.4 + Q3).
              productionSettlement:
                d.productionSettlement === "accrue" ? "accrue" : undefined,
              productionAccountId:
                typeof d.productionAccountId === "string"
                  ? (d.productionAccountId as string)
                  : undefined,
              // Phase C · C5: the workshop's job stage names
              // (§5.2) — shop data on this doc, like the series
              // prefixes.
              jobStages: Array.isArray(d.jobStages)
                ? (d.jobStages as unknown[]).filter(
                    (s): s is string => typeof s === "string"
                  )
                : undefined,
            });
          },
          () => undefined
        )
      );
    };

    (async () => {
      try {
        const userRef = doc(db, "users", uid);
        const userDoc = await getDoc(userRef);
        if (!cancelled && !userDoc.exists() && !isStaff) {
          // Brand-new owner account: seed the whole shop.
          await seedNamespace(db, uid, user?.email ?? null);
        } else if (!cancelled && userDoc.exists() && !isStaff) {
          if (userDoc.data().seedV2 !== true) {
            // Pre-Complete-edition account: top up the NEW collections only
            // (products/sales are the owner's live data — never touched).
            await topUpNamespace(db, uid);
          }
          // Phase A · A2 migration (design §6.1, flag phaseA.accountsV1):
          // create the five default money accounts. Writes NO journal
          // entries — historical null-ref lines resolve via legacyFor,
          // so every existing figure is unchanged.
          const phaseA = userDoc.data().phaseA as { accountsV1?: boolean; rbacV1?: boolean; taxV1?: boolean; periodsV1?: boolean } | undefined;
          if (phaseA?.accountsV1 !== true) {
            await ensureAccounts(db, uid);
          }
          // Phase A · A3 migration (flag phaseA.rbacV1): backfill the
          // owner-doc staff[] and merge role "manager" onto existing
          // staffIndex docs. Manager == the legacy staff profile, so
          // nobody's access changes (design §6.1, risk R-2).
          if (phaseA?.rbacV1 !== true) {
            await ensureRbac(db, uid);
          }
          // Phase A · A4 migration (flag phaseA.taxV1): record the
          // (null) tax defaults. Creates NO slabs — tax stays off
          // until the owner configures it (design §6.1).
          if (phaseA?.taxV1 !== true) {
            await ensureTax(db, uid, userDoc.data());
          }
          // Phase A · A5 migration (flag phaseA.periodsV1): set the
          // fiscal-year defaults (1 July, PK) + an empty lock on the
          // owner doc. Writes NO periods docs and NO journal entries
          // — nothing is locked until the owner closes a period.
          if (phaseA?.periodsV1 !== true) {
            await ensurePeriods(db, uid, userDoc.data());
          }
          // Phase C · C1 migration (flag phaseC.stockV1, design
          // §10.1): create the default warehouse + a stock row per
          // product at its current total. Writes NO journal
          // entries and changes NO total — it annotates existing
          // stock with the location it already notionally sits in.
          const phaseC = userDoc.data().phaseC as { stockV1?: boolean } | undefined;
          if (phaseC?.stockV1 !== true) {
            await ensureStock(db, uid);
          }
          // Phase D · D1 migration (flag phaseD.hrV1, design
          // §10.1): the lightest migration of any phase — it sets
          // the flag and NOTHING else. Phase D's collections are
          // born empty and absence is meaningful (no employees =
          // no payroll); no documents are created, no journal
          // entries written, no existing doc touched.
          const phaseD = userDoc.data().phaseD as { hrV1?: boolean } | undefined;
          if (phaseD?.hrV1 !== true) {
            await ensurePhaseD(db, uid);
          }
        }
      } catch {
        /* best effort — snapshots below still attach */
      }
      attach();
    })();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloud, uid, isStaff]);

  /* ---------------- shared helpers ---------------- */
  const cloudCtx = useCallback((): { db: Firestore; uid: string } | null => {
    if (!cloud || !uid) return null;
    const db = getFirestoreDb();
    return db ? { db, uid } : null;
  }, [cloud, uid]);

  /** Generic dual-path doc write for the simple collections. */
  const putDoc = useCallback(
    (name: CollectionName, item: { id: string }) => {
      const ctx = cloudCtx();
      if (ctx) {
        void setDoc(doc(ctx.db, "users", ctx.uid, name, item.id), { ...item });
        return;
      }
      setCols((prev) => {
        const list = prev[name] as Array<{ id: string }>;
        const exists = list.some((x) => x.id === item.id);
        const next = exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];
        return { ...prev, [name]: next };
      });
    },
    [cloudCtx]
  );

  const removeDoc = useCallback(
    (name: CollectionName, id: string) => {
      const ctx = cloudCtx();
      if (ctx) {
        void deleteDoc(doc(ctx.db, "users", ctx.uid, name, id));
        return;
      }
      setCols((prev) => ({
        ...prev,
        [name]: (prev[name] as Array<{ id: string }>).filter((x) => x.id !== id),
      }));
    },
    [cloudCtx]
  );

  const appendJournalDemo = useCallback((e: JournalEntry) => {
    setCols((prev) => ({ ...prev, journal: [...prev.journal, e] }));
  }, []);

  /* ---------------- A5: period-lock posting guard ----------------
   * Design §5.2: the guard sits at the journal choke point. Every
   * posting action runs `guardPostings` over its composed entries —
   * stamping `dateISO` (the rules backstop field, §5.3) and
   * asserting the entry's business instant is after the owner doc's
   * `lockedThrough` — BEFORE any write happens in either mode, so a
   * refused posting fails atomically with nothing half-committed.
   * Cloud writes additionally funnel through `postEntry`, which
   * re-applies the same preparation at the batch choke point itself,
   * so no present or future path can reach Firestore unstamped or
   * backdated into a closed period. A refusal throws
   * PeriodLockedError (lib/periods); desks surface it as the
   * dictionary string `fin.period.lockedError`. */
  const guardPostings = useCallback(
    (...entries: Array<JournalEntry | null | undefined>) => {
      const lt = settingsRef.current.lockedThrough;
      for (const e of entries) {
        if (e) preparePosting(e, lt);
      }
    },
    []
  );

  /** Push a journal entry into a cloud batch — the single choke
   *  point every cloud journal write funnels through. */
  const postEntry = useCallback(
    (batch: WriteBatch, e: JournalEntry) => {
      const ctx = cloudCtx();
      if (!ctx) return;
      batchJournal(
        batch,
        ctx.db,
        ctx.uid,
        preparePosting(e, settingsRef.current.lockedThrough)
      );
    },
    [cloudCtx]
  );

  /* ---------------- products / sales (original API) ---------------- */
  const addProduct = useCallback(
    (p: NewProduct) => {
      if (!can(roleRef.current, "inventoryManage", "write")) return; // A3 guard (rules v3 enforce too)
      const id = `p-${Date.now().toString(36)}`;
      const keywords = [p.name.toLowerCase(), p.sku.toLowerCase(), p.urduName];
      const product: Product = {
        ...p,
        id,
        keywords,
        expiryDate: p.expiryDate ?? null,
        // A4: normalise the optional tax fields so Firestore never
        // sees an explicit undefined.
        taxSlabId: p.taxSlabId ?? null,
        taxExempt: p.taxExempt ?? false,
        // C3: same normalisation for the stock class — "raw" or
        // null (goods), never an explicit undefined. The F-4
        // opening-stock entry below composes through
        // buildAdjustment, which values it against the class
        // account via `inventoryAccountFor`.
        stockClass: p.stockClass === "raw" ? ("raw" as const) : null,
      };
      // F-4(c): opening stock is inventory VALUE entering the business —
      // it must enter through the ledger (Dr Inventory / Cr Owner
      // capital), with an adjustments-log row, never silently.
      // Phase C · C1: a new product is born at the DEFAULT warehouse
      // (the form is warehouse-naive, §1.5) — its stock row is
      // created in the same batch, so rows stay complete truth.
      const defWh = defaultWarehouseId(warehousesRef.current);
      const built =
        product.stockQty > 0
          ? buildAdjustment(
              { ...product, stockQty: 0 },
              product.stockQty,
              "correction",
              "Opening stock on product create",
              "capital",
              defWh
            )
          : null;
      const level = makeLevel(defWh, id, product.stockQty);
      guardPostings(built?.entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "products", id), { ...product });
        batch.set(doc(ctx.db, "users", ctx.uid, "stockLevels", level.id), { ...level });
        if (built) {
          batch.set(doc(ctx.db, "users", ctx.uid, "adjustments", built.adj.id), { ...built.adj });
          postEntry(batch, built.entry);
        }
        void batch.commit();
        return;
      }
      setProducts((prev) => [...prev, product]);
      setCols((prev) => ({
        ...prev,
        stockLevels: [...prev.stockLevels, level],
        adjustments: built ? [...prev.adjustments, built.adj] : prev.adjustments,
        journal: built ? [...prev.journal, built.entry] : prev.journal,
      }));
    },
    [cloudCtx]
  );

  const updateProduct = useCallback(
    (id: string, patch: Partial<Product>) => {
      if (!can(roleRef.current, "inventoryManage", "write")) return; // A3 guard
      const cur = productsRef.current.find((p) => p.id === id);
      if (!cur) return;
      const { id: _ignored, ...rest } = patch;
      const stockTouched = rest.stockQty != null && rest.stockQty !== cur.stockQty;
      const costTouched = rest.costPrice != null && rest.costPrice !== cur.costPrice;
      // Phase C · C3 (§4.1): a class change in the patch — an
      // absent key means no change; the normalised class is "raw"
      // or goods (null/absent on the product).
      const classTouched =
        "stockClass" in rest &&
        (rest.stockClass === "raw") !== (cur.stockClass === "raw");
      const ctx = cloudCtx();

      // Plain master-data edit (name, prices other than cost, levels…):
      // no money moves, keep the original direct write.
      if (!stockTouched && !costTouched && !classTouched) {
        if (ctx) {
          void updateDoc(doc(ctx.db, "users", ctx.uid, "products", id), rest);
          return;
        }
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch, id } : p)));
        return;
      }

      // F-4(a): a stockQty change is a stock ADJUSTMENT (reason
      // "correction", valued at the OLD cost) — adjustments-log row +
      // journal entry, in the same batch as the product write.
      // Phase C · C1 (§1.5): the product form is warehouse-naive —
      // its delta is a DEFAULT-warehouse adjustment, exactly as its
      // journal entry is a default-shaped adjustment.
      const defWh = defaultWarehouseId(warehousesRef.current);
      const built = stockTouched
        ? buildAdjustment(cur, (rest.stockQty as number) - cur.stockQty, "correction", "Stock edited in product form", "inventory_loss", defWh)
        : null;
      const qtyAfter = built ? built.newQty : cur.stockQty;
      const appliedDelta = qtyAfter - cur.stockQty;

      // F-4(b): a costPrice change REVALUES the stock on hand. The
      // difference is booked Dr/Cr Inventory against Owner Capital —
      // repricing is an owner's decision, so the owner's equity absorbs
      // it (documented in PRODUCTION.md); future COGS then uses the
      // new cost with the Inventory account still equal to the shelf.
      const costDelta = (rest.costPrice ?? cur.costPrice) - cur.costPrice;
      const revalAmount = qtyAfter * costDelta;
      // C3: the revaluation is booked against the class account
      // the stock sits in NOW (the product as it was) — a class
      // change in the same patch moves the revalued total next,
      // via the reclass entry below.
      const acctBefore = inventoryAccountFor(cur);
      const revalEntry =
        costTouched && qtyAfter > 0 && revalAmount !== 0
          ? makeEntry(
              `Stock revaluation — ${cur.name} (cost ${cur.costPrice} → ${rest.costPrice})`,
              "adjustment",
              id,
              revalAmount > 0
                ? [
                    { account: acctBefore, debit: revalAmount, credit: 0 },
                    { account: "capital", debit: 0, credit: revalAmount },
                  ]
                : [
                    { account: "capital", debit: -revalAmount, credit: 0 },
                    { account: acctBefore, debit: 0, credit: -revalAmount },
                  ]
            )
          : null;

      // Phase C · C3 (§4.1): a class change with stock on hand
      // moves the FINAL shelf value (qtyAfter × the cost now in
      // force, after the adjustment + revaluation above) between
      // the class accounts in ONE documented reclass entry — the
      // A §1.6 true-up form, composed by lib/transfers (the C2
      // pattern: the store gains no new makeEntry call site). At
      // zero stock (or zero value) the builder returns null and
      // the flip is a bare flag change. The flag rides `rest`
      // into the same product write below, so flag and entry land
      // in the same batch; the warehouse rows do not move (the
      // goods changed accounts, not buildings).
      const reclassEntry = classTouched
        ? buildReclassEntry(
            cur,
            rest.stockClass === "raw" ? "raw" : null,
            qtyAfter,
            rest.costPrice ?? cur.costPrice
          )
        : null;

      guardPostings(built?.entry, revalEntry, reclassEntry); // A5 choke point
      const finalQty = qtyAfter;
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.update(doc(ctx.db, "users", ctx.uid, "products", id), {
          ...rest,
          stockQty: finalQty,
        });
        // C1: the row at the default warehouse receives the same
        // applied delta, in the same batch (§1.5).
        batchLevelDelta(batch, ctx.db, ctx.uid, defWh, id, appliedDelta);
        if (built) {
          batch.set(doc(ctx.db, "users", ctx.uid, "adjustments", built.adj.id), { ...built.adj });
          postEntry(batch, built.entry);
        }
        if (revalEntry) postEntry(batch, revalEntry);
        if (reclassEntry) postEntry(batch, reclassEntry);
        void batch.commit();
        return;
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch, id, stockQty: finalQty } : p))
      );
      setCols((prev) => ({
        ...prev,
        stockLevels:
          appliedDelta !== 0
            ? applyLevelDelta(prev.stockLevels, defWh, id, appliedDelta)
            : prev.stockLevels,
        adjustments: built ? [...prev.adjustments, built.adj] : prev.adjustments,
        journal: [
          ...prev.journal,
          ...(built ? [built.entry] : []),
          ...(revalEntry ? [revalEntry] : []),
          ...(reclassEntry ? [reclassEntry] : []),
        ],
      }));
    },
    [cloudCtx]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      if (!can(roleRef.current, "inventoryManage", "write")) return; // A3 guard
      const product = productsRef.current.find((p) => p.id === id);
      if (!product) return;
      // F-4(d): stock on hand is ledger value — it may only leave via
      // an adjustment/write-off, never by deleting the product. A
      // product with sales history is part of the accounts record.
      if (product.stockQty > 0) return;
      if (salesRef.current.some((s) => s.productId === id)) return;
      // stockQty == 0 and no history ⇒ residual ledger value is zero;
      // nothing to post.
      // Phase C · C1 (§1.5): the product's stock rows are ZEROED in
      // the same batch (rows are quantity-only; the store zeroes
      // them, it never deletes them — the rules mirror this). With
      // stockQty == 0 the rows already sum to 0, so this only
      // tidies splits a drift may have left behind.
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.delete(doc(ctx.db, "users", ctx.uid, "products", id));
        for (const l of levelsRef.current.filter((x) => x.productId === id)) {
          if (l.qty !== 0) batch.set(doc(ctx.db, "users", ctx.uid, "stockLevels", l.id), { ...l, qty: 0 });
        }
        void batch.commit();
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setCols((prev) => ({
        ...prev,
        stockLevels: prev.stockLevels.map((l) =>
          l.productId === id && l.qty !== 0 ? { ...l, qty: 0 } : l
        ),
      }));
    },
    [cloudCtx]
  );

  const recordSale = useCallback(
    (productId: string, qty: number): boolean => {
      if (!can(roleRef.current, "salesCounter", "write")) return false; // A3: accountant never sells
      if (qty <= 0) return false;
      const product = productsRef.current.find((p) => p.id === productId);
      if (!product || product.stockQty < qty) return false;
      // Phase C · C1 (§1.5): the counter is a one-till surface —
      // its sales ALWAYS leave the DEFAULT warehouse, so the
      // default row must hold the quantity too.
      const defWh = defaultWarehouseId(warehousesRef.current);
      if (qtyAtWh(product, defWh) < qty) return false;
      const sale: Sale = {
        id: `s-${Date.now().toString(36)}`,
        productId,
        qty,
        unitPrice: product.salePrice,
        unitCost: product.costPrice,
        billId: null,
        kind: "sale",
        total: qty * product.salePrice,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      // A4: a counter sale is a one-line, no-discount bill for tax
      // purposes — the same resolution and formulas apply, so a
      // taxed shop collects on counter sales exactly as at the
      // billing desk. With no slab resolved both tax figures are 0
      // and the entry below is the pre-A4 entry, line for line.
      const counterTax = computeBillTaxes(
        [{ total: sale.total, qty, slab: resolveSlab(product, "sales") }],
        0
      );
      const entry = makeEntry(`Counter sale — ${product.name} × ${qty}`, "sale", sale.id, [
        { account: "cash", debit: sale.total + counterTax.exclusiveTax, credit: 0, ref: resolveAccountId("cash") },
        { account: "cogs", debit: qty * product.costPrice, credit: 0 },
        {
          account: "sales_revenue",
          debit: 0,
          credit:
            counterTax.inclusiveTax > 0
              ? round2(sale.total - counterTax.inclusiveTax)
              : sale.total,
        },
        ...(counterTax.taxAmount > 0
          ? [{ account: "tax_payable" as const, debit: 0, credit: counterTax.taxAmount }]
          : []),
        // C3 (§4.1): COGS credits the product's CLASS account —
        // a raw material sold at the counter credits
        // `inventory_raw`, exactly as at the billing desk.
        { account: inventoryAccountFor(product), debit: 0, credit: qty * product.costPrice },
      ]);
      guardPostings(entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "sales", sale.id), { ...sale });
        batch.update(doc(ctx.db, "users", ctx.uid, "products", productId), {
          stockQty: increment(-qty),
        });
        batchLevelDelta(batch, ctx.db, ctx.uid, defWh, productId, -qty);
        postEntry(batch, entry);
        void batch.commit();
        return true;
      }
      setSales((prev) => [...prev, sale]);
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId ? { ...p, stockQty: Math.max(0, p.stockQty - qty) } : p
        )
      );
      // C1 (§1.5): the row receives the CLAMPED figure — the delta
      // is computed once, on the total, exactly as the shelf did.
      applyDemoLevels([
        {
          warehouseId: defWh,
          productId,
          delta: Math.max(0, product.stockQty - qty) - product.stockQty,
        },
      ]);
      appendJournalDemo(entry);
      return true;
    },
    [cloudCtx, appendJournalDemo, resolveAccountId, resolveSlab, qtyAtWh, applyDemoLevels]
  );

  /* ---------------- billing ---------------- */

  /** Price a set of lines from CURRENT product data; null when any line
   *  references a missing product or exceeds available stock.
   *  Phase B (§2.4): a line carrying `unitPrice` (conversion actions
   *  only) is priced at that AGREED price; every other line prices
   *  from the shelf exactly as before. COGS always snapshots the
   *  product's current cost, override or not. */
  const priceLines = useCallback((lines: BillLineInput[]) => {
    const byId = new Map(productsRef.current.map((p) => [p.id, p]));
    const need = new Map<string, number>();
    for (const l of lines) need.set(l.productId, (need.get(l.productId) ?? 0) + l.qty);
    const items = [];
    let subtotal = 0;
    let costTotal = 0;
    for (const l of lines) {
      const p = byId.get(l.productId);
      if (!p || l.qty <= 0) return null;
      const unitPrice =
        l.unitPrice != null && l.unitPrice >= 0 ? l.unitPrice : p.salePrice;
      const total = l.qty * unitPrice;
      items.push({
        productId: p.id,
        name: p.name,
        qty: l.qty,
        unitPrice,
        unitCost: p.costPrice,
        total,
        ...(l.sourceProductId ? { sourceProductId: l.sourceProductId } : {}),
      });
      subtotal += total;
      costTotal += l.qty * p.costPrice;
    }
    for (const [pid, q] of need) {
      const p = byId.get(pid);
      if (!p || p.stockQty < q) return null;
    }
    return { items, subtotal, costTotal };
  }, []);

  const discountOf = (subtotal: number, type: "flat" | "percent", value: number) =>
    type === "percent"
      ? Math.min(subtotal, Math.round((subtotal * Math.max(0, value)) / 100))
      : Math.min(subtotal, Math.max(0, value));

  /** Post a priced bill: sales rows + stock + journal + udhaar part.
   *  Shared by createBill and finalizeBill. */
  const postBill = useCallback(
    (bill: Bill, priced: { items: Bill["items"]; costTotal: number }): boolean => {
      // Phase B · B5 (design §4.2/§4.3): a payment part whose
      // instrument is a cheque settles into `cheques_in_hand`, not
      // a money account. Its capture draft must be complete BEFORE
      // anything is composed — a cheque can never exist in the
      // journal without its registry row, nor the reverse, so a
      // part with an unusable draft refuses the whole bill here.
      for (const p of bill.payments) {
        if (p.instrument === "cheque" && (!isValidChequeDraft(p.cheque) || !(p.amount > 0))) {
          return false;
        }
      }
      // Phase C · C1 (§1.6): the bill's ONE warehouse. Posting
      // validation keeps today's semantics (the finalizeBill
      // precedent) but reads the bill warehouse's ROW: every line's
      // quantity must be held at that warehouse. (priceLines has
      // already validated the product total; a split shop can hold
      // the total across buildings and still not hold it HERE —
      // the goods must be transferred first.) Refused here, before
      // anything is composed or written.
      const billWh = resolveWh(bill.warehouseId);
      const needByProduct = new Map<string, number>();
      for (const it of priced.items) {
        needByProduct.set(it.productId, (needByProduct.get(it.productId) ?? 0) + it.qty);
      }
      for (const [pid, q] of needByProduct) {
        const p = productsRef.current.find((x) => x.id === pid);
        if (!p || qtyAtWh(p, billWh) < q - 1e-9) return false;
      }
      const chequeIds = bill.payments.map((p) =>
        p.instrument === "cheque" ? newId("chq") : null
      );
      // A2: stamp every money payment with the money account it
      // settles into (desk's explicit choice, else the method
      // default). The stamp lands on the stored bill AND as the
      // journal line's ref — the ref is authoritative (§1.3).
      // A cheque part stamps NO account (the money account is
      // chosen at deposit) — it stamps the registry id instead,
      // and the capture draft is consumed here, never stored.
      const payments: BillPayment[] = bill.payments.map((p, i) =>
        p.instrument === "cheque"
          ? {
              method: p.method,
              amount: p.amount,
              accountId: null,
              instrument: "cheque" as const,
              chequeId: chequeIds[i],
            }
          : {
              method: p.method,
              amount: p.amount,
              accountId:
                p.method === "credit" ? null : resolveAccountId(p.method, p.accountId),
            }
      );
      // C1: the posted bill carries the RESOLVED warehouse — it is
      // the only warehouse returns/voids will consult (§1.6).
      const posted: Bill = { ...bill, payments, warehouseId: billWh };
      const creditPart = payments
        .filter((p) => p.method === "credit")
        .reduce((a, p) => a + p.amount, 0);
      const now = new Date().toISOString();
      const saleRows: Sale[] = priced.items.map((it, i) => ({
        id: `${bill.id}-s${i}`,
        productId: it.productId,
        qty: it.qty,
        unitPrice: it.unitPrice,
        unitCost: it.unitCost,
        billId: bill.id,
        kind: "sale",
        total: it.total,
        dayOffset: 0,
        ts: now,
      }));
      // F-2: the desk accepts payments within ±Rs 1 of the bill total
      // (fractional-kg bills round to the nearest rupee). That rounding
      // difference is booked EXPLICITLY to sales_discount inside this
      // same entry — underpayment as extra discount (Dr), overpayment
      // as a discount credit (Cr) — so the entry balances EXACTLY and
      // the tolerance never leaks an unbalanced posting.
      const paidTotal = payments.reduce((a, p) => a + p.amount, 0);
      const rounding = bill.total - paidTotal;
      const discountDebit = bill.discountAmount + Math.max(0, rounding);
      // A4 (design §2.4): revenue is credited NET of any INCLUSIVE
      // tax embedded in the prices (the tax was never the shop's
      // income), and the bill's whole tax — exclusive + inclusive —
      // credits `tax_payable`. Exclusive tax needs no revenue
      // adjustment: it was added on top of the prices and arrives
      // inside the payment lines. With taxAmount == 0 both figures
      // collapse to the pre-A4 template exactly.
      const billTax = bill.taxAmount ?? 0;
      const inclusiveTax = round2(
        bill.items.reduce((a, it) => a + (it.taxInclusive ? (it.taxAmount ?? 0) : 0), 0)
      );
      // Phase C · C3 (§4.1): the COGS credit splits by product
      // CLASS — raw-material lines credit `inventory_raw`, goods
      // lines `inventory`. The parts sum to `priced.costTotal` to
      // the paisa (classLegLines' residual discipline); with no
      // raw lines this is the single pre-C3 inventory line.
      const classById = new Map(productsRef.current.map((p) => [p.id, p.stockClass === "raw"]));
      const rawCostShare = priced.items.reduce(
        (a, it) => a + (classById.get(it.productId) ? it.qty * it.unitCost : 0),
        0
      );
      const lines: JournalEntry["lines"] = [
        ...payments.map((p) =>
          p.instrument === "cheque"
            ? {
                // B5: the cheque line rides INSIDE the ordinary
                // bill entry in place of the money line it
                // replaces (refType stays the host's: "bill").
                account: "cheques_in_hand" as const,
                debit: p.amount,
                credit: 0,
                ref: p.chequeId ?? null,
              }
            : {
                account: accountForMethod(p.method),
                debit: p.amount,
                credit: 0,
                ref: p.method === "credit" ? bill.customerId : p.accountId,
              }
        ),
        ...(discountDebit > 0
          ? [{ account: "sales_discount" as const, debit: discountDebit, credit: 0 }]
          : []),
        ...(rounding < 0
          ? [{ account: "sales_discount" as const, debit: 0, credit: -rounding }]
          : []),
        { account: "cogs" as const, debit: priced.costTotal, credit: 0 },
        {
          account: "sales_revenue" as const,
          debit: 0,
          credit: inclusiveTax > 0 ? round2(bill.subtotal - inclusiveTax) : bill.subtotal,
        },
        ...(billTax > 0
          ? [{ account: "tax_payable" as const, debit: 0, credit: billTax }]
          : []),
        ...classLegLines(priced.costTotal, rawCostShare, "credit"),
      ];
      const entry = makeEntry(
        `Bill #${bill.billNo} — ${bill.customerName || "Walk-in customer"}`,
        "bill",
        bill.id,
        lines,
        { ts: now }
      );
      // B5: the registry docs for this bill's cheque parts, citing
      // the entry that captured them (`entryIds.captured`). They
      // are written in the SAME batch / state update as the bill
      // itself (§4.2) — capture is atomic with its host posting.
      const newCheques: Cheque[] = [];
      payments.forEach((p, i) => {
        if (p.instrument !== "cheque" || !p.chequeId) return;
        const draft = bill.payments[i].cheque;
        if (!draft) return;
        newCheques.push({
          id: p.chequeId,
          direction: "in",
          chequeNo: draft.chequeNo.trim(),
          bankName: draft.bankName.trim(),
          amount: p.amount,
          issueDateISO: draft.issueDateISO,
          dueDateISO: draft.dueDateISO,
          partyId: bill.customerId,
          partyName: bill.customerName,
          partyKind: "customer",
          status: "received",
          sourceType: "bill",
          sourceId: bill.id,
          accountId: null, // chosen at deposit (§4.1)
          chargesOnBounce: 0,
          entryIds: { captured: entry.id },
          note: "",
          dayOffset: 0,
          ts: now,
        });
      });
      const creditEntry: CreditEntry | null =
        creditPart > 0
          ? {
              id: newId("cr"),
              customerId: bill.customerId,
              customerName: bill.customerName,
              customerPhone: bill.customerPhone,
              kind: "credit",
              amount: creditPart,
              note: `Bill #${bill.billNo} — part payment on udhaar`,
              billId: bill.id,
              dayOffset: 0,
              ts: now,
            }
          : null;

      // Phase B (design §2.2): when this bill was composed by a
      // conversion, the source document's cached status is
      // recomputed from the derivation — over the bills INCLUDING
      // this one — and written in the SAME batch / state update as
      // the posting itself, so a conversion can never half-land
      // (bill posted, source unmarked). A bill citing a challan
      // recomputes the challan AND, one hop up, its order; a bill
      // citing an order counts bills that arrived via the order's
      // challans too (the derivation takes the challan list). The
      // labels are conveniences; the derivation (lib/documents) is
      // the truth and gates every later conversion.
      const billsWithPosted = [
        ...billsRef.current.filter((b) => b.id !== posted.id),
        posted,
      ];
      const statusUpdates: {
        order?: { id: string; status: SaleOrder["status"] };
        challan?: { id: string; status: DeliveryChallan["status"] };
        quotation?: { id: string; status: Quotation["status"] };
        job?: { id: string; status: Job["status"] };
      } = {};
      const allChallans = colsRef.current.deliveryChallans;
      const recomputeOrder = (orderId: string) => {
        const order = colsRef.current.saleOrders.find((o) => o.id === orderId);
        if (order && order.status !== "draft" && order.status !== "cancelled") {
          const next = deriveOrderStatus(order, billsWithPosted, allChallans);
          if (next !== order.status) statusUpdates.order = { id: order.id, status: next };
        }
      };
      if (posted.sourceType === "order" && posted.sourceId) {
        recomputeOrder(posted.sourceId);
      } else if (posted.sourceType === "challan" && posted.sourceId) {
        const challan = allChallans.find((c) => c.id === posted.sourceId);
        if (challan) {
          const next = deriveChallanStatus(challan, billsWithPosted);
          if (next !== challan.status) {
            statusUpdates.challan = { id: challan.id, status: next };
          }
          if (challan.orderId) recomputeOrder(challan.orderId);
        }
      } else if (posted.sourceType === "quotation" && posted.sourceId) {
        const quote = colsRef.current.quotations.find((q) => q.id === posted.sourceId);
        if (quote) {
          const next = deriveQuotationStatus(
            quote,
            colsRef.current.saleOrders,
            billsWithPosted
          );
          if (next !== quote.status) {
            statusUpdates.quotation = { id: quote.id, status: next };
          }
        }
      } else if (posted.sourceType === "job" && posted.sourceId) {
        // Phase C · C5 (design §5.4): posting the bill that
        // cites a job IS delivery-with-bill — the job's status
        // advances to `delivered` in this same batch. (A job
        // settled off-system is delivered by the standalone
        // Deliver action instead, and never gains a citation.)
        const job = colsRef.current.jobs.find((j) => j.id === posted.sourceId);
        if (job && job.status !== "delivered" && job.status !== "cancelled") {
          statusUpdates.job = { id: job.id, status: "delivered" };
        }
      }
      const orderStatusUpdate = statusUpdates.order ?? null;
      const challanStatusUpdate = statusUpdates.challan ?? null;
      const quotationStatusUpdate = statusUpdates.quotation ?? null;
      const jobStatusUpdate = statusUpdates.job ?? null;

      guardPostings(entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "bills", bill.id), { ...posted });
        for (const s of saleRows) batch.set(doc(ctx.db, "users", ctx.uid, "sales", s.id), { ...s });
        for (const it of priced.items) {
          batch.update(doc(ctx.db, "users", ctx.uid, "products", it.productId), {
            stockQty: increment(-it.qty),
          });
          // C1: the bill warehouse's row drops in the same batch.
          batchLevelDelta(batch, ctx.db, ctx.uid, billWh, it.productId, -it.qty);
        }
        postEntry(batch, entry);
        if (creditEntry) batch.set(doc(ctx.db, "users", ctx.uid, "credits", creditEntry.id), { ...creditEntry });
        for (const chq of newCheques) {
          batch.set(doc(ctx.db, "users", ctx.uid, "cheques", chq.id), { ...chq });
        }
        if (orderStatusUpdate) {
          batch.update(doc(ctx.db, "users", ctx.uid, "saleOrders", orderStatusUpdate.id), {
            status: orderStatusUpdate.status,
          });
        }
        if (challanStatusUpdate) {
          batch.update(doc(ctx.db, "users", ctx.uid, "deliveryChallans", challanStatusUpdate.id), {
            status: challanStatusUpdate.status,
          });
        }
        if (quotationStatusUpdate) {
          batch.update(doc(ctx.db, "users", ctx.uid, "quotations", quotationStatusUpdate.id), {
            status: quotationStatusUpdate.status,
          });
        }
        if (jobStatusUpdate) {
          batch.update(doc(ctx.db, "users", ctx.uid, "jobs", jobStatusUpdate.id), {
            status: jobStatusUpdate.status,
          });
        }
        void batch.commit();
        return true;
      }
      // C1 (§1.5): the demo rows receive the CLAMPED applied delta
      // — computed once, on the total, exactly as the shelf update
      // below computes it — so rows and total can never diverge.
      let demoLevels = levelsRef.current;
      for (const [pid, used] of needByProduct) {
        const old = productsRef.current.find((x) => x.id === pid)?.stockQty ?? 0;
        const applied = Math.max(0, old - used) - old;
        if (applied !== 0) demoLevels = applyLevelDelta(demoLevels, billWh, pid, applied);
      }
      setCols((prev) => ({
        ...prev,
        bills: [...prev.bills.filter((b) => b.id !== bill.id), posted],
        credits: creditEntry ? [...prev.credits, creditEntry] : prev.credits,
        cheques: newCheques.length > 0 ? [...prev.cheques, ...newCheques] : prev.cheques,
        stockLevels: demoLevels,
        journal: [...prev.journal, entry],
        saleOrders: orderStatusUpdate
          ? prev.saleOrders.map((o) =>
              o.id === orderStatusUpdate.id ? { ...o, status: orderStatusUpdate.status } : o
            )
          : prev.saleOrders,
        deliveryChallans: challanStatusUpdate
          ? prev.deliveryChallans.map((c) =>
              c.id === challanStatusUpdate.id ? { ...c, status: challanStatusUpdate.status } : c
            )
          : prev.deliveryChallans,
        quotations: quotationStatusUpdate
          ? prev.quotations.map((q) =>
              q.id === quotationStatusUpdate.id ? { ...q, status: quotationStatusUpdate.status } : q
            )
          : prev.quotations,
        jobs: jobStatusUpdate
          ? prev.jobs.map((j) =>
              j.id === jobStatusUpdate.id ? { ...j, status: jobStatusUpdate.status } : j
            )
          : prev.jobs,
      }));
      setSales((prev) => [...prev, ...saleRows]);
      setProducts((prev) =>
        prev.map((p) => {
          const used = priced.items
            .filter((i) => i.productId === p.id)
            .reduce((a, i) => a + i.qty, 0);
          return used ? { ...p, stockQty: Math.max(0, p.stockQty - used) } : p;
        })
      );
      return true;
    },
    [cloudCtx, resolveAccountId, resolveWh, qtyAtWh]
  );

  const buildBill = useCallback(
    (input: NewBillInput, status: Bill["status"]): Bill | null => {
      const priced = priceLines(input.lines);
      if (!priced && status !== "held") return null;
      const items = priced?.items ?? [];
      const subtotal = priced?.subtotal ?? 0;
      const discountAmount = discountOf(subtotal, input.discountType, input.discountValue);
      // A4: tax is priced and snapshotted at build time (design
      // §2.2/§2.3); `total` = subtotal − discount + EXCLUSIVE tax.
      // No slabs configured ⇒ taxAmount 0 and total as before.
      const taxed = stampBillTaxes(items, discountAmount);
      const billNo = billsRef.current.reduce((m, b) => Math.max(m, b.billNo), 0) + 1;
      return {
        id: newId("bill"),
        billNo,
        customerId: input.customerId,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        items: taxed.items,
        subtotal,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAmount,
        taxAmount: taxed.taxAmount,
        total: taxed.total,
        payments: input.payments,
        status,
        returnedQty: {},
        // Phase B: conversion citation rides only when the input
        // carries one (a direct desk bill stays byte-identical).
        ...(input.sourceType
          ? { sourceType: input.sourceType, sourceId: input.sourceId ?? null }
          : {}),
        // Phase C · C1: the desk's warehouse pick (postBill
        // resolves + re-stamps the concrete id at posting).
        warehouseId: input.warehouseId ?? null,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
    },
    [priceLines, stampBillTaxes]
  );

  const createBill = useCallback(
    (input: NewBillInput): string | null => {
      if (!can(roleRef.current, "billing", "write")) return null; // A3 guard
      const paid = input.payments.reduce((a, p) => a + p.amount, 0);
      const bill = buildBill(input, "paid");
      if (!bill) return null;
      if (Math.abs(paid - bill.total) > 1) return null;
      const priced = priceLines(input.lines);
      if (!priced) return null;
      return postBill(bill, priced) ? bill.id : null;
    },
    [buildBill, priceLines, postBill]
  );

  const holdBill = useCallback(
    (input: NewBillInput): string | null => {
      if (!can(roleRef.current, "billing", "write")) return null; // A3 guard
      // Held bills are priced from the cart snapshot at hold time; stock is
      // NOT moved and nothing is posted until finalize.
      const priced = priceLines(input.lines);
      const billNo = billsRef.current.reduce((m, b) => Math.max(m, b.billNo), 0) + 1;
      const items = priced?.items ?? [];
      const subtotal = priced?.subtotal ?? 0;
      const discountAmount = discountOf(subtotal, input.discountType, input.discountValue);
      // A4: a held bill carries its tax snapshot too — finalizing it
      // later posts exactly the total the customer was quoted.
      const taxed = stampBillTaxes(items, discountAmount);
      const bill: Bill = {
        id: newId("bill"),
        billNo,
        customerId: input.customerId,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        items: taxed.items,
        subtotal,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAmount,
        taxAmount: taxed.taxAmount,
        total: taxed.total,
        payments: [],
        status: "held",
        returnedQty: {},
        ...(input.sourceType
          ? { sourceType: input.sourceType, sourceId: input.sourceId ?? null }
          : {}),
        // C1: a held bill remembers its warehouse; finalizing posts
        // it (postBill resolves it then, like every stamp).
        warehouseId: input.warehouseId ?? null,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      putDoc("bills", bill);
      return bill.id;
    },
    [priceLines, putDoc, stampBillTaxes]
  );

  const finalizeBill = useCallback(
    (billId: string, payments: BillPayment[]): boolean => {
      if (!can(roleRef.current, "billing", "write")) return false; // A3 guard
      const held = billsRef.current.find((b) => b.id === billId);
      if (!held || held.status !== "held") return false;
      const paid = payments.reduce((a, p) => a + p.amount, 0);
      if (Math.abs(paid - held.total) > 1) return false;
      // Re-validate stock against current inventory before posting.
      const need = new Map<string, number>();
      for (const it of held.items) need.set(it.productId, (need.get(it.productId) ?? 0) + it.qty);
      for (const [pid, q] of need) {
        const p = productsRef.current.find((x) => x.id === pid);
        if (!p || p.stockQty < q) return false;
      }
      const costTotal = held.items.reduce((a, i) => a + i.qty * i.unitCost, 0);
      const bill: Bill = { ...held, status: "paid", payments };
      return postBill(bill, { items: held.items, costTotal });
    },
    [postBill]
  );

  const discardHeldBill = useCallback(
    (id: string) => {
      if (!can(roleRef.current, "billing", "write")) return; // A3 guard
      const b = billsRef.current.find((x) => x.id === id);
      if (!b || b.status !== "held") return;
      removeDoc("bills", id);
    },
    [removeDoc]
  );

  /** Shared reversal engine for returns + voids: negative sale rows,
   *  stock restore, journal entry, optional udhaar reduction.
   *  Phase B · B4 (design §3.1): when `opts.note` is set on a RETURN,
   *  a formal credit note is composed from the engine's own figures
   *  and written in the SAME batch / state update — the note wraps
   *  this posting, it never posts anything itself. Voids never mint
   *  (a void annuls the bill; the voided bill is its own record).
   *  The engine stays permission-agnostic: the note-issuing ACTION
   *  wrappers gate on their matrix rows (G-2). */
  const reverseBillItems = useCallback(
    (
      bill: Bill,
      lines: BillLineInput[],
      opts: {
        kind: "return" | "void";
        refundMethod?: "cash" | "jazzcash" | "easypaisa" | "bank";
        /** A2: money account the refund leaves from (returns). */
        accountId?: string | null;
        /** B4: mint the formal credit note wrapping this return. */
        note?: { reason: string; onNote?: (note: DocNote) => void };
      }
    ): SaleReturn | null => {
      const byPid = new Map(bill.items.map((i) => [i.productId, i]));
      const retItems: Bill["items"] = [];
      let gross = 0;
      let cost = 0;
      // C3 (§4.1): the inventory debit mirrors the bill's COGS
      // split — returned raw-material value goes back into
      // `inventory_raw`, by each line product's class.
      let costRaw = 0;
      const retClassById = new Map(
        productsRef.current.map((p) => [p.id, p.stockClass === "raw"])
      );
      for (const l of lines) {
        const src = byPid.get(l.productId);
        if (!src || l.qty <= 0) continue;
        const already = bill.returnedQty?.[l.productId] ?? 0;
        const qty = Math.min(l.qty, src.qty - already);
        if (qty <= 0) continue;
        retItems.push({ ...src, qty, total: qty * src.unitPrice });
        gross += qty * src.unitPrice;
        cost += qty * src.unitCost;
        if (retClassById.get(l.productId)) costRaw += qty * src.unitCost;
      }
      if (retItems.length === 0 || gross <= 0) return null;

      // A4 (design §2.4): the tax this return reverses, computed per
      // line with the same cumulative discipline as the discount
      // below — item-by-item returns of a taxed bill reverse its tax
      // to the paisa. The share is stamped onto the return's items
      // (their `taxAmount` means "tax reversed by this return") so
      // later partial returns accumulate against the truth. A bill
      // with no tax yields all-zero shares and the pre-A4 figures.
      const taxShares = returnTaxShares(
        bill,
        returnsRef.current.filter((r) => r.billId === bill.id),
        retItems
      );
      for (const it of retItems) {
        it.taxAmount = taxShares.perLine.get(it.productId) ?? 0;
      }

      // F-3: the discount share of a return is computed CUMULATIVELY —
      // the share due on (prior returned gross + this gross), minus
      // what prior returns already reversed — so item-by-item returns
      // of a discounted bill sum EXACTLY to the bill's discount, and
      // the completing return absorbs any residual paisa.
      const priorGross = bill.items.reduce(
        (a, i) => a + (bill.returnedQty?.[i.productId] ?? 0) * i.unitPrice,
        0
      );
      const alreadyReversedDiscount = returnsRef.current
        .filter((r) => r.billId === bill.id)
        .reduce(
          (a, r) =>
            a +
            (r.items.reduce((x, i) => x + i.total, 0) -
              (r.refundAmount + (r.creditReduction ?? 0)) +
              // A4: a prior return's refund included its EXCLUSIVE
              // tax share; add it back so the derived discount share
              // stays the discount and nothing else.
              r.items.reduce(
                (x, i) => x + (i.taxInclusive ? 0 : (i.taxAmount ?? 0)),
                0
              )),
          0
        );
      const completesBill = priorGross + gross >= bill.subtotal - 1e-9;
      const cumulativeDiscount =
        bill.subtotal > 0
          ? Math.round((bill.discountAmount * (priorGross + gross)) / bill.subtotal)
          : 0;
      const discountShare = Math.max(
        0,
        (completesBill ? bill.discountAmount : cumulativeDiscount) -
          alreadyReversedDiscount
      );
      // A4: the customer is refunded the net amount PLUS the
      // exclusive tax they paid on it; inclusive tax was inside the
      // price, so it is already inside (gross − discountShare).
      const refundTotal = gross - discountShare + taxShares.exclusiveTaxShare;

      // F-6: refunds may only eat into the bill's STILL-UNPAID udhaar
      // (its given amount, net of prior return reversals and of
      // repayments FIFO-allocated to this bill). Udhaar the customer
      // already repaid is the shop's money to hand back in cash — it
      // must never be credited out of receivables a second time.
      const creditPosition = billCreditOutstanding(creditsRef.current, bill);
      const creditReduction =
        opts.kind === "void"
          ? creditPosition.outstanding
          : Math.min(refundTotal, creditPosition.outstanding);
      const cashRefund = refundTotal - creditReduction;

      const now = new Date().toISOString();
      const refundMethod = opts.refundMethod ?? "cash";
      const refundAccount = accountForMethod(refundMethod);
      // A2: the refund's money account — the desk's choice for a
      // return; for a void, each original payment returns through the
      // account it settled into (its A2 stamp; pre-A2 bills resolve to
      // the method's current default).
      const refundAccountId =
        opts.kind === "return" ? resolveAccountId(refundMethod, opts.accountId) : null;
      // A VOID refunds every original payment back through its own
      // account (cash→cash, wallet→wallet) AND hands back, in cash,
      // any udhaar the customer had already repaid on this bill
      // (F-6); a RETURN refunds through the single method chosen at
      // the counter (after any udhaar reduction).
      // Phase B · B5: a voided bill's CHEQUE parts never touched a
      // money account, so they cannot be refunded through one —
      // the design's registry≡GL identity (§4.3) decides each case:
      //  · still in hand (received/deposited): the instrument is
      //    handed back — Cr cheques_in_hand here, and the registry
      //    doc is marked "returned" in this same batch (below).
      //  · already cleared: the money really is in the deposit
      //    account — the refund leaves from THAT account.
      //  · already bounced/returned: the value left cheques_in_hand
      //    at the bounce/return (and the receivable was restored
      //    then, inside this bill's F-6 lot) — no line at all, or
      //    the void would reverse the same value twice.
      const voidChequeHandbacks: Cheque[] = [];
      const refundLines: JournalEntry["lines"] =
        opts.kind === "void"
          ? [
              ...bill.payments
                .filter((p) => p.method !== "credit")
                .flatMap((p) => {
                  if (p.instrument === "cheque" && p.chequeId) {
                    const chq = colsRef.current.cheques.find((c) => c.id === p.chequeId);
                    if (chq && (chq.status === "bounced" || chq.status === "returned")) {
                      return [];
                    }
                    if (chq && chq.status === "cleared") {
                      const acct = accountsRef.current.find((a) => a.id === chq.accountId);
                      return [
                        {
                          account: acct ? glForAccount(acct) : accountForMethod(p.method),
                          debit: 0,
                          credit: p.amount,
                          ref: chq.accountId,
                        },
                      ];
                    }
                    if (chq) voidChequeHandbacks.push(chq);
                    return [
                      {
                        account: "cheques_in_hand" as const,
                        debit: 0,
                        credit: p.amount,
                        ref: p.chequeId,
                      },
                    ];
                  }
                  return [
                    {
                      account: accountForMethod(p.method),
                      debit: 0,
                      credit: p.amount,
                      ref: p.accountId ?? resolveAccountId(p.method),
                    },
                  ];
                }),
              ...(creditPosition.repaidAllocated > 0
                ? [
                    {
                      account: "cash" as const,
                      debit: 0,
                      credit: creditPosition.repaidAllocated,
                      ref: resolveAccountId("cash"),
                    },
                  ]
                : []),
            ]
          : cashRefund > 0
            ? [{ account: refundAccount, debit: 0, credit: cashRefund, ref: refundAccountId }]
            : [];
      const linesJ: JournalEntry["lines"] = [
        // A4: revenue reverses at its NET share — the gross sticker
        // minus the inclusive tax embedded in it (exclusive tax was
        // never revenue, so it is not touched here).
        {
          account: "sales_revenue",
          debit:
            taxShares.inclusiveTaxShare > 0
              ? round2(gross - taxShares.inclusiveTaxShare)
              : gross,
          credit: 0,
        },
        ...(taxShares.taxShare > 0
          ? [{ account: "tax_payable" as const, debit: taxShares.taxShare, credit: 0 }]
          : []),
        ...classLegLines(cost, costRaw, "debit"),
        ...(discountShare > 0
          ? [{ account: "sales_discount" as const, debit: 0, credit: discountShare }]
          : []),
        ...(creditReduction > 0
          ? [{ account: "receivables" as const, debit: 0, credit: creditReduction, ref: bill.customerId }]
          : []),
        ...refundLines,
        { account: "cogs", debit: 0, credit: cost },
      ];
      const entry = makeEntry(
        opts.kind === "void" ? `Bill #${bill.billNo} voided` : `Return against Bill #${bill.billNo}`,
        opts.kind === "void" ? "bill_void" : "return",
        bill.id,
        linesJ,
        { ts: now }
      );
      // B5: the void hands the still-in-hand cheques back — their
      // registry docs close as "returned", citing this void entry,
      // in the SAME batch as the void posting (above).
      const voidChequeUpdates: Cheque[] =
        opts.kind === "void"
          ? voidChequeHandbacks.map((c) => ({
              ...c,
              status: "returned" as const,
              entryIds: { ...c.entryIds, returned: entry.id },
            }))
          : [];
      const negSales: Sale[] = retItems.map((it, i) => ({
        id: `${bill.id}-r${Date.now().toString(36)}-${i}`,
        productId: it.productId,
        qty: -it.qty,
        unitPrice: it.unitPrice,
        unitCost: it.unitCost,
        billId: bill.id,
        kind: "return",
        total: -it.total,
        dayOffset: 0,
        ts: now,
      }));
      const creditReversal: CreditEntry | null =
        creditReduction > 0
          ? {
              id: newId("cr"),
              customerId: bill.customerId,
              customerName: bill.customerName,
              customerPhone: bill.customerPhone,
              kind: "credit",
              amount: -creditReduction,
              note:
                opts.kind === "void"
                  ? `Bill #${bill.billNo} voided — udhaar reversed`
                  : `Return on Bill #${bill.billNo} — udhaar reduced`,
              billId: bill.id,
              dayOffset: 0,
              ts: now,
            }
          : null;
      const ret: SaleReturn = {
        id: newId("ret"),
        billId: bill.id,
        billNo: bill.billNo,
        items: retItems,
        refundAmount: cashRefund,
        creditReduction,
        method: refundMethod,
        accountId: opts.kind === "return" ? refundAccountId : null,
        dayOffset: 0,
        ts: now,
      };
      // B4 (design §3.1): the credit note, when the calling action
      // asked for one. Its figures are READ from the return the
      // engine just composed (creditNoteFigures) — goods/tax/total
      // equal the engine's to the paisa by construction, and its
      // total is exactly what the customer got back (cash refund +
      // udhaar reduction). The settlement mirrors the return's own
      // split: all-udhaar ⇒ credit_reduction; otherwise the money
      // leg is primary and the print shows both legs (§3.1).
      const note: DocNote | null =
        opts.kind === "return" && opts.note
          ? (() => {
              const figures = creditNoteFigures(ret);
              return {
                id: newId("note"),
                number: nextDocNumber(
                  "creditNote",
                  colsRef.current.notes
                    .filter((n) => n.kind === "credit")
                    .map((n) => n.number),
                  settingsRef.current
                ),
                kind: "credit" as const,
                returnId: ret.id,
                billId: bill.id,
                billNo: bill.billNo,
                purchaseId: null,
                partyId: bill.customerId,
                partyName: bill.customerName,
                items: retItems,
                goodsAmount: figures.goodsAmount,
                taxAmount: figures.taxAmount,
                total: figures.total,
                settlement:
                  creditReduction > 0 && cashRefund <= 0
                    ? ("credit_reduction" as const)
                    : ("cash_refund" as const),
                journalEntryId: entry.id,
                reason: opts.note.reason,
                status: "posted" as const,
                dayOffset: 0,
                ts: now,
              };
            })()
          : null;
      const returnedQty = { ...(bill.returnedQty ?? {}) };
      for (const it of retItems) returnedQty[it.productId] = (returnedQty[it.productId] ?? 0) + it.qty;
      const allReturned = bill.items.every((i) => (returnedQty[i.productId] ?? 0) >= i.qty);
      const updatedBill: Bill = {
        ...bill,
        returnedQty,
        status: opts.kind === "void" ? "voided" : allReturned ? "returned" : "partially_returned",
      };

      // Phase C · C1 (§1.5): returned goods go back to the
      // warehouse the bill sent them from — the bill's own stamp,
      // resolved (pre-C bills ⇒ the default warehouse, where the
      // migration put their stock).
      const billWh = resolveWh(bill.warehouseId);
      // A5: the reversal entry is composed at TODAY's instant above
      // (never the bill's own date), so a void/return of a bill from
      // a closed period posts cleanly into the open period — the
      // guard verifies exactly that here.
      guardPostings(entry);
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "bills", bill.id), { ...updatedBill });
        for (const s of negSales) batch.set(doc(ctx.db, "users", ctx.uid, "sales", s.id), { ...s });
        for (const it of retItems) {
          batch.update(doc(ctx.db, "users", ctx.uid, "products", it.productId), {
            stockQty: increment(it.qty),
          });
          batchLevelDelta(batch, ctx.db, ctx.uid, billWh, it.productId, it.qty);
        }
        batch.set(doc(ctx.db, "users", ctx.uid, "returns", ret.id), { ...ret });
        // B4: the credit note rides the SAME batch as the return it
        // wraps — a note can never exist without its posting, nor a
        // formal return without its note (§3.1).
        if (note) batch.set(doc(ctx.db, "users", ctx.uid, "notes", note.id), { ...note });
        // B5: a void's cheque hand-backs ride the void's batch.
        for (const u of voidChequeUpdates) {
          batch.set(doc(ctx.db, "users", ctx.uid, "cheques", u.id), { ...u });
        }
        postEntry(batch, entry);
        if (creditReversal)
          batch.set(doc(ctx.db, "users", ctx.uid, "credits", creditReversal.id), { ...creditReversal });
        void batch.commit();
        if (note) opts.note?.onNote?.(note);
        return ret;
      }
      // C1: the demo rows mirror the restore at the bill's
      // warehouse (adds are never clamped on either side).
      let demoLevels = levelsRef.current;
      for (const it of retItems) {
        demoLevels = applyLevelDelta(demoLevels, billWh, it.productId, it.qty);
      }
      setCols((prev) => ({
        ...prev,
        bills: prev.bills.map((b) => (b.id === bill.id ? updatedBill : b)),
        returns: [...prev.returns, ret],
        stockLevels: demoLevels,
        notes: note ? [...prev.notes, note] : prev.notes,
        credits: creditReversal ? [...prev.credits, creditReversal] : prev.credits,
        cheques:
          voidChequeUpdates.length > 0
            ? prev.cheques.map((c) => voidChequeUpdates.find((u) => u.id === c.id) ?? c)
            : prev.cheques,
        journal: [...prev.journal, entry],
      }));
      setSales((prev) => [...prev, ...negSales]);
      setProducts((prev) =>
        prev.map((p) => {
          const back = retItems
            .filter((i) => i.productId === p.id)
            .reduce((a, i) => a + i.qty, 0);
          return back ? { ...p, stockQty: p.stockQty + back } : p;
        })
      );
      if (note) opts.note?.onNote?.(note);
      return ret;
    },
    [cloudCtx, resolveAccountId, resolveWh]
  );

  const returnItems = useCallback(
    (
      billId: string,
      lines: BillLineInput[],
      refundMethod: "cash" | "jazzcash" | "easypaisa" | "bank",
      accountId?: string | null
    ): boolean => {
      if (!can(roleRef.current, "returns", "write")) return false; // A3 guard
      const bill = billsRef.current.find((b) => b.id === billId);
      if (!bill || bill.status === "held" || bill.status === "voided") return false;
      return reverseBillItems(bill, lines, { kind: "return", refundMethod, accountId }) !== null;
    },
    [reverseBillItems, role]
  );

  /** Phase B · B4 — the FORMAL return flow (design §3.1, gap G-2).
   *  Identical engine, identical figures; the difference is purely
   *  the gate and the form: this action checks the
   *  `creditDebitNotes` matrix row — NOT `returns` — because the
   *  matrix deliberately gives note issuance to the accountant
   *  (whose `returns` row is none) and withholds it from the
   *  cashier (whose `returns` row is full). The credit note mints
   *  inside the return's own batch via the engine's note option;
   *  no second check of `returns` happens anywhere on this path,
   *  or the accountant's row would be a lie. */
  const returnItemsWithNote = useCallback(
    (
      billId: string,
      lines: BillLineInput[],
      refundMethod: "cash" | "jazzcash" | "easypaisa" | "bank",
      accountId: string | null,
      reason: string,
      onNote?: (note: DocNote) => void
    ): boolean => {
      if (!can(roleRef.current, "creditDebitNotes", "write")) return false; // G-2 gate
      const bill = billsRef.current.find((b) => b.id === billId);
      if (!bill || bill.status === "held" || bill.status === "voided") return false;
      return (
        reverseBillItems(bill, lines, {
          kind: "return",
          refundMethod,
          accountId,
          note: { reason: reason.trim(), onNote },
        }) !== null
      );
    },
    [reverseBillItems, role]
  );

  const voidBill = useCallback(
    (billId: string): boolean => {
      // A3: voiding a posted bill is owner/manager only — the store
      // refuses even if a UI path is reached (rules v3 also gate the
      // bills update to owner/manager/cashier, and the journal entry
      // a void posts is what the matrix reserves to managers).
      if (!can(roleRef.current, "billingVoid", "write")) return false;
      const bill = billsRef.current.find((b) => b.id === billId);
      if (!bill || bill.status !== "paid") return false;
      // A void mirrors the original entry exactly, so it is only offered
      // before any partial return has touched the bill.
      if (Object.values(bill.returnedQty ?? {}).some((q) => q > 0)) return false;
      const remaining = bill.items.map((i) => ({ productId: i.productId, qty: i.qty }));
      return reverseBillItems(bill, remaining, { kind: "void" }) !== null;
    },
    [reverseBillItems, role]
  );

  /* ---------------- document chain (Phase B · B1) ----------------
   * Quotations + sale orders. THE CARDINAL RULE (design §2.2):
   * these are NON-POSTING documents — no action in this section
   * composes a journal entry, moves stock, or writes any
   * money/subledger collection. The only writes are the document
   * collections themselves. Converting an order to a bill does not
   * post either: it hands a prefilled draft to the billing desk,
   * which posts through `postBill` when (and only when) the desk
   * completes it. Lifecycle discipline (§1.4): drafts are freely
   * editable/deletable; once a document leaves draft it is never
   * edited in place — quantities/prices change only by cancelling
   * and reissuing; a document with any fulfilled quantity cannot
   * be cancelled. */

  /** Compose stored DocLines from editor input (name snapshot from
   *  the live product; totals are qty × the AGREED price). Null
   *  when any line is unusable — unknown product, qty ≤ 0, price < 0,
   *  or no lines at all. */
  const composeDocLines = useCallback((inputs: DocLineInput[]): DocLine[] | null => {
    const byId = new Map(productsRef.current.map((p) => [p.id, p]));
    const lines: DocLine[] = [];
    for (const l of inputs) {
      const p = byId.get(l.productId);
      if (!p || !(l.qty > 0) || !(l.unitPrice >= 0)) return null;
      lines.push({
        productId: p.id,
        name: p.name,
        qty: l.qty,
        unitPrice: l.unitPrice,
        total: l.qty * l.unitPrice,
      });
    }
    return lines.length > 0 ? lines : null;
  }, []);

  /** Totals for a document: subtotal + house discount + the §7 tax
   *  ESTIMATE (the A4 engine at today's slab resolution). */
  const docTotalsFor = useCallback(
    (lines: DocLine[], discountType: "flat" | "percent", discountValue: number) =>
      estimateDocTotals(
        lines,
        discountType,
        discountValue,
        productsRef.current,
        taxSlabsRef.current,
        settingsRef.current
      ),
    []
  );

  const createQuotation = useCallback(
    (input: NewQuotationInput): string | null => {
      if (!can(roleRef.current, "quotations", "write")) return null; // matrix: F/F/F/R
      const lines = composeDocLines(input.lines);
      if (!lines) return null;
      const totals = docTotalsFor(lines, input.discountType, input.discountValue);
      const q: Quotation = {
        id: newId("qt"),
        number: null, // minted on issue (§1.3) — drafts burn no numbers
        customerId: input.customerId,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        lines,
        subtotal: totals.subtotal,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAmount: totals.discountAmount,
        estimatedTax: totals.estimatedTax,
        total: totals.total,
        validUntil: input.validUntil || null,
        note: input.note.trim(),
        status: "draft",
        issuedTs: null,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      putDoc("quotations", q);
      return q.id;
    },
    [composeDocLines, docTotalsFor, putDoc]
  );

  const updateQuotation = useCallback(
    (id: string, input: NewQuotationInput): boolean => {
      if (!can(roleRef.current, "quotations", "write")) return false;
      const cur = colsRef.current.quotations.find((q) => q.id === id);
      if (!cur || cur.status !== "draft") return false; // issued docs are promises (§1.4)
      const lines = composeDocLines(input.lines);
      if (!lines) return false;
      const totals = docTotalsFor(lines, input.discountType, input.discountValue);
      const nextQuote: Quotation = {
        ...cur,
        customerId: input.customerId,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        lines,
        subtotal: totals.subtotal,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAmount: totals.discountAmount,
        estimatedTax: totals.estimatedTax,
        total: totals.total,
        validUntil: input.validUntil || null,
        note: input.note.trim(),
      };
      putDoc("quotations", nextQuote);
      return true;
    },
    [composeDocLines, docTotalsFor, putDoc]
  );

  const deleteQuotation = useCallback(
    (id: string) => {
      if (!can(roleRef.current, "quotations", "write")) return;
      const cur = colsRef.current.quotations.find((q) => q.id === id);
      if (!cur || cur.status !== "draft") return; // only drafts are deletable
      removeDoc("quotations", id);
    },
    [removeDoc]
  );

  const issueQuotation = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "quotations", "write")) return false;
      const cur = colsRef.current.quotations.find((q) => q.id === id);
      if (!cur || cur.status !== "draft") return false;
      const number = nextDocNumber(
        "quotation",
        colsRef.current.quotations.map((q) => q.number),
        settingsRef.current
      );
      const issuedQuote: Quotation = {
        ...cur,
        number,
        status: "issued",
        issuedTs: new Date().toISOString(),
      };
      putDoc("quotations", issuedQuote);
      return true;
    },
    [putDoc]
  );

  const decideQuotation = useCallback(
    (id: string, decision: "accepted" | "rejected"): boolean => {
      if (!can(roleRef.current, "quotations", "write")) return false;
      const cur = colsRef.current.quotations.find((q) => q.id === id);
      if (!cur || cur.status !== "issued") return false;
      const decidedQuote: Quotation = { ...cur, status: decision };
      putDoc("quotations", decidedQuote);
      return true;
    },
    [putDoc]
  );

  const cancelQuotation = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "quotations", "write")) return false;
      const cur = colsRef.current.quotations.find((q) => q.id === id);
      if (!cur || cur.status === "cancelled" || cur.status === "converted") return false;
      // §1.4: a document with ANY fulfilled quantity cannot be
      // cancelled — its children exist.
      const converted = quotationConvertedTotalQty(
        cur,
        colsRef.current.saleOrders,
        billsRef.current
      );
      for (const v of converted.values()) if (v > 0) return false;
      const cancelledQuote: Quotation = { ...cur, status: "cancelled" };
      putDoc("quotations", cancelledQuote);
      return true;
    },
    [putDoc]
  );

  /**
   * Quotation → sale order (§2.3): copies party, the picked lines
   * (at the quotation's agreed prices), the discount terms and the
   * note; the order cites the quotation and is born a DRAFT (its
   * own confirm mints SO-). Partial conversion is allowed — picks
   * are clamped to the DERIVED remaining quantities, and the
   * quotation's cached status advances to "converted" only when
   * the derivation shows it fully converted. Both writes commit
   * together; nothing posts.
   */
  const convertQuotationToOrder = useCallback(
    (id: string, picks: Array<{ productId: string; qty: number }>): string | null => {
      if (!can(roleRef.current, "quotations", "write")) return null;
      const quote = colsRef.current.quotations.find((q) => q.id === id);
      if (!quote || (quote.status !== "issued" && quote.status !== "accepted")) return null;
      const converted = quotationConvertedTotalQty(
        quote,
        colsRef.current.saleOrders,
        billsRef.current
      );
      const wanted = new Map(picks.map((p) => [p.productId, p.qty]));
      const lines: DocLine[] = [];
      for (const l of quote.lines) {
        const remaining = Math.max(0, l.qty - (converted.get(l.productId) ?? 0));
        const qty = Math.min(wanted.get(l.productId) ?? 0, remaining);
        if (qty > 0) {
          lines.push({
            productId: l.productId,
            name: l.name,
            qty,
            unitPrice: l.unitPrice,
            total: qty * l.unitPrice,
            sourceProductId: l.productId,
          });
        }
      }
      if (lines.length === 0) return null;
      const totals = docTotalsFor(lines, quote.discountType, quote.discountValue);
      const order: SaleOrder = {
        id: newId("so"),
        number: null,
        customerId: quote.customerId,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        lines,
        subtotal: totals.subtotal,
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        discountAmount: totals.discountAmount,
        estimatedTax: totals.estimatedTax,
        total: totals.total,
        source: { type: "quotation", id: quote.id },
        expectedDate: null,
        note: quote.note,
        status: "draft",
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      const ordersAfter = [...colsRef.current.saleOrders, order];
      const derived = deriveQuotationStatus(quote, ordersAfter, billsRef.current);
      const nextQuote: Quotation =
        derived !== quote.status ? { ...quote, status: derived } : quote;
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "saleOrders", order.id), { ...order });
        if (nextQuote !== quote) {
          batch.set(doc(ctx.db, "users", ctx.uid, "quotations", quote.id), { ...nextQuote });
        }
        void batch.commit();
        return order.id;
      }
      setCols((prev) => ({
        ...prev,
        saleOrders: [...prev.saleOrders, order],
        quotations:
          nextQuote !== quote
            ? prev.quotations.map((q) => (q.id === quote.id ? nextQuote : q))
            : prev.quotations,
      }));
      return order.id;
    },
    [cloudCtx, docTotalsFor]
  );

  const createSaleOrder = useCallback(
    (input: NewSaleOrderInput): string | null => {
      if (!can(roleRef.current, "saleOrders", "write")) return null; // matrix: F/F/F/R
      const lines = composeDocLines(input.lines);
      if (!lines) return null;
      const totals = docTotalsFor(lines, input.discountType, input.discountValue);
      const order: SaleOrder = {
        id: newId("so"),
        number: null, // minted on confirm (§1.3)
        customerId: input.customerId,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        lines,
        subtotal: totals.subtotal,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAmount: totals.discountAmount,
        estimatedTax: totals.estimatedTax,
        total: totals.total,
        source: null,
        expectedDate: input.expectedDate || null,
        // Phase C · C1: the order's preferred warehouse (§1.6).
        warehouseId: input.warehouseId ?? null,
        note: input.note.trim(),
        status: "draft",
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      putDoc("saleOrders", order);
      return order.id;
    },
    [composeDocLines, docTotalsFor, putDoc]
  );

  const updateSaleOrder = useCallback(
    (id: string, input: NewSaleOrderInput): boolean => {
      if (!can(roleRef.current, "saleOrders", "write")) return false;
      const cur = colsRef.current.saleOrders.find((o) => o.id === id);
      if (!cur || cur.status !== "draft") return false; // confirmed orders are promises
      const lines = composeDocLines(input.lines);
      if (!lines) return false;
      const totals = docTotalsFor(lines, input.discountType, input.discountValue);
      const nextOrder: SaleOrder = {
        ...cur,
        customerId: input.customerId,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        lines,
        subtotal: totals.subtotal,
        discountType: input.discountType,
        discountValue: input.discountValue,
        discountAmount: totals.discountAmount,
        estimatedTax: totals.estimatedTax,
        total: totals.total,
        expectedDate: input.expectedDate || null,
        warehouseId: input.warehouseId ?? null,
        note: input.note.trim(),
      };
      putDoc("saleOrders", nextOrder);
      return true;
    },
    [composeDocLines, docTotalsFor, putDoc]
  );

  const deleteSaleOrder = useCallback(
    (id: string) => {
      if (!can(roleRef.current, "saleOrders", "write")) return;
      const cur = colsRef.current.saleOrders.find((o) => o.id === id);
      if (!cur || cur.status !== "draft") return;
      removeDoc("saleOrders", id);
    },
    [removeDoc]
  );

  const confirmSaleOrder = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "saleOrders", "write")) return false;
      const cur = colsRef.current.saleOrders.find((o) => o.id === id);
      if (!cur || cur.status !== "draft") return false;
      const number = nextDocNumber(
        "saleOrder",
        colsRef.current.saleOrders.map((o) => o.number),
        settingsRef.current
      );
      const confirmedOrder: SaleOrder = { ...cur, number, status: "open" };
      putDoc("saleOrders", confirmedOrder);
      return true;
    },
    [putDoc]
  );

  const cancelSaleOrder = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "saleOrders", "write")) return false;
      const cur = colsRef.current.saleOrders.find((o) => o.id === id);
      if (!cur || cur.status === "cancelled" || cur.status === "fulfilled") return false;
      // §1.4: any fulfilled quantity blocks cancellation — billed
      // (directly or one hop via a challan, B2) OR delivered on a
      // dispatched challan: in both cases children exist.
      const billed = orderBilledQty(
        cur,
        billsRef.current,
        colsRef.current.deliveryChallans
      );
      for (const v of billed.values()) if (v > 0) return false;
      const delivered = orderDeliveredQty(cur, colsRef.current.deliveryChallans);
      for (const v of delivered.values()) if (v > 0) return false;
      const cancelledOrder: SaleOrder = { ...cur, status: "cancelled" };
      putDoc("saleOrders", cancelledOrder);
      return true;
    },
    [putDoc]
  );

  /**
   * Sale order → bill (§2.3, the small-shop path): prepare the
   * billing-desk draft from the order's remaining lines at the
   * AGREED prices. This writes NOTHING — no bill, no journal, no
   * stock. The desk completes the draft through the ordinary
   * createBill / finalizeBill → postBill engine, which stamps the
   * order citation onto the bill and updates the order's cached
   * status in the posting's own batch (see postBill).
   */
  const convertOrderToBill = useCallback(
    (id: string, picks: Array<{ productId: string; qty: number }>): boolean => {
      if (!can(roleRef.current, "saleOrders", "write")) return false;
      const order = colsRef.current.saleOrders.find((o) => o.id === id);
      if (!order || (order.status !== "open" && order.status !== "partially_fulfilled")) {
        return false;
      }
      // B2: the billed derivation counts the one hop too — a
      // quantity already billed via one of this order's challans is
      // NOT billable again directly from the order (§2.1).
      const billed = orderBilledQty(
        order,
        billsRef.current,
        colsRef.current.deliveryChallans
      );
      const wanted = new Map(picks.map((p) => [p.productId, p.qty]));
      const lines: BillDraftPrefill["lines"] = [];
      for (const l of order.lines) {
        const remaining = Math.max(0, l.qty - (billed.get(l.productId) ?? 0));
        const qty = Math.min(wanted.get(l.productId) ?? 0, remaining);
        if (qty > 0) {
          lines.push({
            productId: l.productId,
            qty,
            unitPrice: l.unitPrice,
            sourceProductId: l.productId,
          });
        }
      }
      if (lines.length === 0) return false;
      setBillDraft({
        sourceType: "order",
        sourceId: order.id,
        sourceLabel: order.number ?? "SO",
        customerId: order.customerId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        discountType: order.discountType,
        discountValue: order.discountValue,
        lines,
        // C1 (§1.6): the desk inherits the order's preference.
        warehouseId: order.warehouseId ?? null,
      });
      return true;
    },
    []
  );

  /* ---------------- document chain (Phase B · B2) ----------------
   * Delivery challans + the remaining conversion seams. Challans
   * ride the saleOrders matrix row (design G-1) — Phase A gave the
   * sales-side chain one row, and rules mirror it. THE CARDINAL
   * RULE (§2.2) binds exactly as in B1: these actions write ONLY
   * the deliveryChallans collection (plus, on order → challan, the
   * order's cached-status recompute in the same commit). No
   * journal, no stock, no credit rows — stock leaves at the BILL
   * (§2.5 decision, model 1); a challan carries a derived
   * reservation only (lib/documents `availabilityByProduct`).
   * Conversions to a bill prepare desk drafts, like B1; the bill
   * posts through `postBill` alone, exactly once. */

  const createChallan = useCallback(
    (input: NewChallanInput): string | null => {
      if (!can(roleRef.current, "saleOrders", "write")) return null; // G-1
      const lines = composeDocLines(input.lines);
      if (!lines) return null;
      const challan: DeliveryChallan = {
        id: newId("dc"),
        number: null, // minted on dispatch (§1.3)
        orderId: null, // standalone delivery
        customerId: input.customerId,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        lines,
        vehicleNo: input.vehicleNo.trim(),
        driverName: input.driverName.trim(),
        // Phase C · C1: where the goods physically leave from (§1.6).
        warehouseId: input.warehouseId ?? null,
        note: input.note.trim(),
        status: "draft",
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      putDoc("deliveryChallans", challan);
      return challan.id;
    },
    [composeDocLines, putDoc]
  );

  /** Validate an order-cited challan's lines against the order's
   *  CURRENT undelivered remainder (other dispatched challans
   *  count; the challan being checked is a draft and never counts
   *  itself). Every line must answer an order line, at a quantity
   *  the order still owes in goods. */
  const challanLinesFitOrder = useCallback(
    (order: SaleOrder, lines: DocLine[]): boolean => {
      const delivered = orderDeliveredQty(order, colsRef.current.deliveryChallans);
      const wanted = new Map<string, number>();
      for (const l of lines) wanted.set(l.productId, (wanted.get(l.productId) ?? 0) + l.qty);
      for (const [pid, qty] of wanted) {
        const ol = order.lines.find((x) => x.productId === pid);
        if (!ol) return false;
        if (qty > Math.max(0, ol.qty - (delivered.get(pid) ?? 0)) + 1e-9) return false;
      }
      return true;
    },
    []
  );

  const updateChallan = useCallback(
    (id: string, input: NewChallanInput): boolean => {
      if (!can(roleRef.current, "saleOrders", "write")) return false; // G-1
      const cur = colsRef.current.deliveryChallans.find((c) => c.id === id);
      if (!cur || cur.status !== "draft") return false; // dispatched docs are promises (§1.4)
      const lines = composeDocLines(input.lines);
      if (!lines) return false;
      if (cur.orderId) {
        const order = colsRef.current.saleOrders.find((o) => o.id === cur.orderId);
        if (!order || !challanLinesFitOrder(order, lines)) return false;
      }
      const nextChallan: DeliveryChallan = {
        ...cur,
        customerId: input.customerId,
        customerName: input.customerName.trim(),
        customerPhone: input.customerPhone.trim(),
        lines: cur.orderId
          ? lines.map((l) => ({ ...l, sourceProductId: l.productId }))
          : lines,
        vehicleNo: input.vehicleNo.trim(),
        driverName: input.driverName.trim(),
        warehouseId: input.warehouseId ?? null,
        note: input.note.trim(),
      };
      putDoc("deliveryChallans", nextChallan);
      return true;
    },
    [composeDocLines, putDoc, challanLinesFitOrder]
  );

  const deleteChallan = useCallback(
    (id: string) => {
      if (!can(roleRef.current, "saleOrders", "write")) return; // G-1
      const cur = colsRef.current.deliveryChallans.find((c) => c.id === id);
      if (!cur || cur.status !== "draft") return; // only drafts are deletable
      removeDoc("deliveryChallans", id);
    },
    [removeDoc]
  );

  const dispatchChallan = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "saleOrders", "write")) return false; // G-1
      const cur = colsRef.current.deliveryChallans.find((c) => c.id === id);
      if (!cur || cur.status !== "draft") return false;
      if (cur.orderId) {
        // Re-validate against the order as it stands NOW: another
        // challan may have dispatched first, and a cancelled or
        // un-confirmed order can no longer send goods out.
        const order = colsRef.current.saleOrders.find((o) => o.id === cur.orderId);
        if (
          !order ||
          (order.status !== "open" && order.status !== "partially_fulfilled") ||
          !challanLinesFitOrder(order, cur.lines)
        ) {
          return false;
        }
      }
      const number = nextDocNumber(
        "challan",
        colsRef.current.deliveryChallans.map((c) => c.number),
        settingsRef.current
      );
      const dispatchedChallan: DeliveryChallan = { ...cur, number, status: "dispatched" };
      putDoc("deliveryChallans", dispatchedChallan);
      return true;
    },
    [putDoc, challanLinesFitOrder]
  );

  const cancelChallan = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "saleOrders", "write")) return false; // G-1
      const cur = colsRef.current.deliveryChallans.find((c) => c.id === id);
      if (!cur || cur.status === "cancelled" || cur.status === "billed") return false;
      // §1.4: any billed quantity blocks cancellation — bills cite
      // this challan and exist. Cancellation itself posts nothing.
      const billed = challanBilledQty(cur, billsRef.current);
      for (const v of billed.values()) if (v > 0) return false;
      const cancelledChallan: DeliveryChallan = { ...cur, status: "cancelled" };
      putDoc("deliveryChallans", cancelledChallan);
      return true;
    },
    [putDoc]
  );

  /**
   * Sale order → delivery challan (§2.3): copies party + the picked
   * lines at quantities ≤ the order's remaining UNDELIVERED
   * (derived), at the order's agreed prices; the challan cites the
   * order and is born a DRAFT (dispatch mints DC- and is where
   * vehicle/driver are confirmed). No posting, no stock movement;
   * the order's cached status is recomputed in the same commit per
   * §2.2 (delivery alone never moves its billing-derived label, so
   * in practice nothing about the order changes here).
   */
  const convertOrderToChallan = useCallback(
    (orderId: string, picks: Array<{ productId: string; qty: number }>): string | null => {
      if (!can(roleRef.current, "saleOrders", "write")) return null; // G-1
      const order = colsRef.current.saleOrders.find((o) => o.id === orderId);
      if (!order || (order.status !== "open" && order.status !== "partially_fulfilled")) {
        return null;
      }
      const delivered = orderDeliveredQty(order, colsRef.current.deliveryChallans);
      const wanted = new Map(picks.map((p) => [p.productId, p.qty]));
      const lines: DocLine[] = [];
      for (const l of order.lines) {
        const remaining = Math.max(0, l.qty - (delivered.get(l.productId) ?? 0));
        const qty = Math.min(wanted.get(l.productId) ?? 0, remaining);
        if (qty > 0) {
          lines.push({
            productId: l.productId,
            name: l.name,
            qty,
            unitPrice: l.unitPrice,
            total: qty * l.unitPrice,
            sourceProductId: l.productId,
          });
        }
      }
      if (lines.length === 0) return null;
      const challan: DeliveryChallan = {
        id: newId("dc"),
        number: null,
        orderId: order.id,
        customerId: order.customerId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        lines,
        vehicleNo: "",
        driverName: "",
        // C1 (§1.6): a converted challan inherits its order's
        // warehouse — where the goods are expected to leave from.
        warehouseId: order.warehouseId ?? null,
        note: order.note,
        status: "draft",
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      const challansAfter = [...colsRef.current.deliveryChallans, challan];
      const derived = deriveOrderStatus(order, billsRef.current, challansAfter);
      const nextOrder: SaleOrder =
        derived !== order.status ? { ...order, status: derived } : order;
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "deliveryChallans", challan.id), { ...challan });
        if (nextOrder !== order) {
          batch.set(doc(ctx.db, "users", ctx.uid, "saleOrders", order.id), { ...nextOrder });
        }
        void batch.commit();
        return challan.id;
      }
      setCols((prev) => ({
        ...prev,
        deliveryChallans: [...prev.deliveryChallans, challan],
        saleOrders:
          nextOrder !== order
            ? prev.saleOrders.map((o) => (o.id === order.id ? nextOrder : o))
            : prev.saleOrders,
      }));
      return challan.id;
    },
    [cloudCtx]
  );

  /**
   * Delivery challan → bill (§2.3): prepare the desk draft from the
   * challan's UNBILLED lines. Prices: when the challan cites an
   * order, the ORDER's agreed price rules ("the agreed price lives
   * on the order"); a standalone challan bills at its own line
   * prices. The pick is clamped by BOTH remainders — the challan's
   * unbilled and, for an order-cited challan, the order's unbilled
   * (one-hop derivation) — so goods billed directly from the order
   * can never be billed a second time through its challan. The
   * draft's discount terms copy from the order when it cites one;
   * a standalone challan carries no discount (it has no totals).
   * Tax is NOT copied: the bill re-resolves slabs at posting (§7).
   */
  const convertChallanToBill = useCallback(
    (id: string, picks: Array<{ productId: string; qty: number }>): boolean => {
      if (!can(roleRef.current, "saleOrders", "write")) return false; // G-1
      const challan = colsRef.current.deliveryChallans.find((c) => c.id === id);
      if (
        !challan ||
        (challan.status !== "dispatched" && challan.status !== "partially_billed")
      ) {
        return false;
      }
      const order = challan.orderId
        ? colsRef.current.saleOrders.find((o) => o.id === challan.orderId)
        : undefined;
      const billedC = challanBilledQty(challan, billsRef.current);
      const billedO = order
        ? orderBilledQty(order, billsRef.current, colsRef.current.deliveryChallans)
        : null;
      const wanted = new Map(picks.map((p) => [p.productId, p.qty]));
      const lines: BillDraftPrefill["lines"] = [];
      for (const l of challan.lines) {
        let remaining = Math.max(0, l.qty - (billedC.get(l.productId) ?? 0));
        if (order && billedO) {
          const ol = order.lines.find((x) => x.productId === l.productId);
          if (!ol) continue; // a challan line answering no order line cannot bill
          remaining = Math.min(
            remaining,
            Math.max(0, ol.qty - (billedO.get(l.productId) ?? 0))
          );
        }
        const qty = Math.min(wanted.get(l.productId) ?? 0, remaining);
        if (qty > 0) {
          const orderLine = order?.lines.find((x) => x.productId === l.productId);
          lines.push({
            productId: l.productId,
            qty,
            unitPrice: orderLine ? orderLine.unitPrice : l.unitPrice,
            sourceProductId: l.productId,
          });
        }
      }
      if (lines.length === 0) return false;
      setBillDraft({
        sourceType: "challan",
        sourceId: challan.id,
        sourceLabel: challan.number ?? "DC",
        customerId: challan.customerId,
        customerName: challan.customerName,
        customerPhone: challan.customerPhone,
        discountType: order ? order.discountType : "flat",
        discountValue: order ? order.discountValue : 0,
        lines,
        // C1 (§1.6): the bill inherits the challan's warehouse;
        // a challan without one falls back to its order's.
        warehouseId: challan.warehouseId ?? order?.warehouseId ?? null,
      });
      return true;
    },
    []
  );

  /**
   * Quotation → bill directly (§2.3): prepare the desk draft from
   * the quotation's UNCONVERTED lines (converted = to orders plus
   * direct bills, §2.1) at the quotation's agreed prices, with its
   * discount terms copied. The desk's completion is the chain's
   * one posting; postBill recomputes the quotation's cached status
   * in the posting batch.
   */
  const convertQuotationToBill = useCallback(
    (id: string, picks: Array<{ productId: string; qty: number }>): boolean => {
      if (!can(roleRef.current, "quotations", "write")) return false;
      const quote = colsRef.current.quotations.find((q) => q.id === id);
      if (!quote || (quote.status !== "issued" && quote.status !== "accepted")) {
        return false;
      }
      const converted = quotationConvertedTotalQty(
        quote,
        colsRef.current.saleOrders,
        billsRef.current
      );
      const wanted = new Map(picks.map((p) => [p.productId, p.qty]));
      const lines: BillDraftPrefill["lines"] = [];
      for (const l of quote.lines) {
        const remaining = Math.max(0, l.qty - (converted.get(l.productId) ?? 0));
        const qty = Math.min(wanted.get(l.productId) ?? 0, remaining);
        if (qty > 0) {
          lines.push({
            productId: l.productId,
            qty,
            unitPrice: l.unitPrice,
            sourceProductId: l.productId,
          });
        }
      }
      if (lines.length === 0) return false;
      setBillDraft({
        sourceType: "quotation",
        sourceId: quote.id,
        sourceLabel: quote.number ?? "QT",
        customerId: quote.customerId,
        customerName: quote.customerName,
        customerPhone: quote.customerPhone,
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        lines,
      });
      return true;
    },
    []
  );

  /* ---------------- suppliers ---------------- */
  const addSupplier = useCallback(
    (s: Omit<Supplier, "id" | "ts">) => {
      if (!can(roleRef.current, "suppliersManage", "write")) return; // A3 guard
      const row: Supplier = { ...s, id: newId("sup"), ts: new Date().toISOString() };
      putDoc("suppliers", row);
    },
    [putDoc, role]
  );
  const updateSupplier = useCallback(
    (id: string, patch: Partial<Supplier>) => {
      if (!can(roleRef.current, "suppliersManage", "write")) return; // A3 guard
      const cur = cols.suppliers.find((x) => x.id === id);
      if (cur) putDoc("suppliers", { ...cur, ...patch, id });
    },
    [cols.suppliers, putDoc, role]
  );
  const deleteSupplier = useCallback(
    (id: string) => {
      if (!can(roleRef.current, "suppliersManage", "write")) return; // A3 guard
      // F-13: a supplier with ANY open balance — payable OR advance
      // (negative) — or any purchase/payment history is part of the
      // accounts record and cannot be deleted; deleting one would
      // orphan its balance in the journal with no subledger row left.
      const c = colsRef.current;
      if (supplierBalance(c.purchases, c.supplierPayments, id, c.purchaseReturns) !== 0) return;
      if (
        c.purchases.some((p) => p.supplierId === id) ||
        c.supplierPayments.some((p) => p.supplierId === id)
      )
        return;
      removeDoc("suppliers", id);
    },
    [removeDoc, role]
  );

  const recordPurchase = useCallback(
    (input: NewPurchaseInput): string | null => {
      if (!can(roleRef.current, "suppliersManage", "write")) return null; // A3 guard
      const byId = new Map(productsRef.current.map((p) => [p.id, p]));
      const rawItems: Purchase["items"] = [];
      for (const l of input.lines) {
        const p = byId.get(l.productId);
        if (!p || l.qty <= 0) return null;
        rawItems.push({
          productId: p.id,
          name: p.name,
          qty: l.qty,
          unitCost: l.unitCost,
          total: l.qty * l.unitCost,
        });
      }
      if (rawItems.length === 0) return null;
      // A4 (design §2.4): purchase tax resolves per line against
      // PURCHASE slabs and is snapshotted onto the items. The
      // supplier is owed the GROSS (net + tax); stock enters at the
      // NET — input tax is a recoverable asset (`tax_input`), never
      // part of inventory cost. No tax ⇒ net == gross == the pre-A4
      // total and the entry below is the pre-A4 entry, line for line.
      const purchaseTax = computePurchaseTaxes(
        rawItems.map((it) => ({
          total: it.total,
          qty: it.qty,
          slab: resolveSlab(byId.get(it.productId), "purchases"),
        }))
      );
      const items: Purchase["items"] = rawItems.map((it, i) => {
        const info = purchaseTax.lines[i];
        const slab = info?.slab ?? null;
        return {
          ...it,
          taxAmount: info?.taxAmount ?? 0,
          taxSlabId: slab?.id ?? null,
          taxSlabName: slab?.name ?? null,
          taxRate: slab?.rate ?? 0,
          taxKind: (slab?.kind ?? "percent") as "percent" | "fixed",
          taxInclusive: slab?.inclusive ?? false,
        };
      });
      // Phase C · C1 (§1.6): the warehouse this receipt's stock
      // lands in, resolved concrete and stamped — purchase returns
      // later send goods back out of THIS warehouse.
      const purchaseWh = resolveWh(input.warehouseId);
      const purchase: Purchase = {
        id: newId("pur"),
        supplierId: input.supplierId,
        items,
        total: purchaseTax.grossTotal,
        netTotal: purchaseTax.netTotal,
        taxAmount: purchaseTax.taxAmount,
        note: input.note,
        // Phase B · B3: the PO citation rides ONLY on receipts
        // composed from a purchase order (absent ⇒ direct receipt,
        // read exactly as before).
        ...(input.sourcePoId ? { sourcePoId: input.sourcePoId } : {}),
        warehouseId: purchaseWh,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      // Purchases clear through the Purchases account into Inventory
      // (perpetual method): Dr Purchases + Dr Inventory /
      // Cr Purchases + Cr Payables — one atomic, balanced document.
      // A4 adds Dr tax_input between them when tax was charged, and
      // the payables line carries the GROSS (design §2.4 worked
      // example: 40,000 net + 6,800 GST ⇒ ΣDr = ΣCr = 86,800).
      // Phase C · C3 (§4.1): the inventory leg follows each line's
      // product class — a mixed purchase splits the leg per class
      // over the lines' NET bases (the tax composition's per-line
      // figures); the clearing lines, the tax leg and the payables
      // leg never change. No raw lines ⇒ the single pre-C3 line.
      const rawNetShare = rawItems.reduce(
        (a, it, i) =>
          a +
          (byId.get(it.productId)?.stockClass === "raw"
            ? (purchaseTax.lines[i]?.base ?? 0)
            : 0),
        0
      );
      const entry = makeEntry(`Purchase — stock received`, "purchase", purchase.id, [
        { account: "purchases", debit: purchaseTax.netTotal, credit: 0 },
        ...(purchaseTax.taxAmount > 0
          ? [{ account: "tax_input" as const, debit: purchaseTax.taxAmount, credit: 0 }]
          : []),
        ...classLegLines(purchaseTax.netTotal, rawNetShare, "debit"),
        { account: "purchases", debit: 0, credit: purchaseTax.netTotal },
        { account: "payables", debit: 0, credit: purchaseTax.grossTotal, ref: input.supplierId },
      ]);
      guardPostings(entry); // A5 choke point (before any write)
      // Phase B · B3 (design §2.2): when this receipt was composed
      // from a purchase order, the PO's cached status is recomputed
      // from the derivation — over the purchases INCLUDING this
      // one — and written in the SAME batch / state update as the
      // posting itself, exactly as postBill does for its source
      // documents, so a receipt can never half-land (goods in, PO
      // unmarked). The label is a convenience; the derivation
      // (lib/documents) is the truth and gates every later receipt.
      const poStatusUpdate = (() => {
        if (!input.sourcePoId) return null;
        const po = colsRef.current.purchaseOrders.find((p) => p.id === input.sourcePoId);
        if (!po || po.status === "draft" || po.status === "cancelled") return null;
        const next = derivePoStatus(po, [...colsRef.current.purchases, purchase]);
        return next !== po.status ? { id: po.id, status: next } : null;
      })();
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "purchases", purchase.id), { ...purchase });
        for (const it of items) {
          batch.update(doc(ctx.db, "users", ctx.uid, "products", it.productId), {
            stockQty: increment(it.qty),
            costPrice: it.unitCost, // latest purchase cost becomes the shelf cost
          });
          // C1: the receipt warehouse's row rises in the same batch.
          batchLevelDelta(batch, ctx.db, ctx.uid, purchaseWh, it.productId, it.qty);
        }
        postEntry(batch, entry);
        if (poStatusUpdate) {
          batch.update(doc(ctx.db, "users", ctx.uid, "purchaseOrders", poStatusUpdate.id), {
            status: poStatusUpdate.status,
          });
        }
        void batch.commit();
        return purchase.id;
      }
      putDoc("purchases", purchase);
      setProducts((prev) =>
        prev.map((p) => {
          const got = items.filter((i) => i.productId === p.id);
          if (!got.length) return p;
          const qty = got.reduce((a, i) => a + i.qty, 0);
          return { ...p, stockQty: p.stockQty + qty, costPrice: got[got.length - 1].unitCost };
        })
      );
      applyDemoLevels(
        items.map((it) => ({ warehouseId: purchaseWh, productId: it.productId, delta: it.qty }))
      );
      appendJournalDemo(entry);
      if (poStatusUpdate) {
        setCols((prev) => ({
          ...prev,
          purchaseOrders: prev.purchaseOrders.map((p) =>
            p.id === poStatusUpdate.id ? { ...p, status: poStatusUpdate.status } : p
          ),
        }));
      }
      return purchase.id;
    },
    [cloudCtx, putDoc, appendJournalDemo, resolveSlab, resolveWh, applyDemoLevels]
  );

  /* ---------------- document chain (Phase B · B3): purchase orders ----------------
   * NON-POSTING documents (§2.2): the CRUD / issue / cancel actions
   * below write ONLY the purchaseOrders collection — no journal
   * entry, no stock movement, no payable row. The goods receipt
   * that fulfils a PO is `receiveAgainstPo` at the end of this
   * block: it validates the picks through lib/documents and posts
   * ONLY through the recordPurchase engine above (which stamps the
   * citation and recomputes the PO's cached status in the receipt
   * batch). A PO's `total` is the goods estimate at the agreed
   * costs — tax resolves at receipt (§7). Drafts are freely
   * editable/deletable; an issued PO is a promise to the supplier
   * and is never edited in place — change means cancel + reissue
   * (§1.4). All actions gate on the purchaseOrders matrix row
   * (owner/manager full, cashier none, accountant read-only). */

  /** Compose stored PO lines from editor input (name snapshot from
   *  the live product; totals are qty × the AGREED cost). Null
   *  when any line is unusable — unknown product, qty ≤ 0, cost < 0,
   *  or no lines at all. */
  const composePoLines = useCallback(
    (inputs: NewPurchaseOrderInput["lines"]): PurchaseOrder["lines"] | null => {
      const byId = new Map(productsRef.current.map((p) => [p.id, p]));
      const lines: PurchaseOrder["lines"] = [];
      for (const l of inputs) {
        const p = byId.get(l.productId);
        if (!p || !(l.qty > 0) || !(l.unitCost >= 0)) return null;
        lines.push({
          productId: p.id,
          name: p.name,
          qty: l.qty,
          unitCost: l.unitCost,
          total: l.qty * l.unitCost,
        });
      }
      return lines.length > 0 ? lines : null;
    },
    []
  );

  const createPurchaseOrder = useCallback(
    (input: NewPurchaseOrderInput): string | null => {
      if (!can(roleRef.current, "purchaseOrders", "write")) return null; // matrix: F/F/N/R
      const supplier = colsRef.current.suppliers.find((s) => s.id === input.supplierId);
      if (!supplier) return null;
      const lines = composePoLines(input.lines);
      if (!lines) return null;
      const po: PurchaseOrder = {
        id: newId("po"),
        number: null, // minted on issue (§1.3) — drafts burn no numbers
        supplierId: supplier.id,
        supplierName: supplier.name, // snapshot
        lines,
        total: lines.reduce((a, l) => a + l.total, 0),
        expectedDate: input.expectedDate || null,
        // Phase C · C1: the expected destination warehouse (§1.6).
        warehouseId: input.warehouseId ?? null,
        note: input.note.trim(),
        status: "draft",
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      putDoc("purchaseOrders", po);
      return po.id;
    },
    [composePoLines, putDoc]
  );

  const updatePurchaseOrder = useCallback(
    (id: string, input: NewPurchaseOrderInput): boolean => {
      if (!can(roleRef.current, "purchaseOrders", "write")) return false;
      const cur = colsRef.current.purchaseOrders.find((p) => p.id === id);
      if (!cur || cur.status !== "draft") return false; // issued POs are promises (§1.4)
      const supplier = colsRef.current.suppliers.find((s) => s.id === input.supplierId);
      if (!supplier) return false;
      const lines = composePoLines(input.lines);
      if (!lines) return false;
      const nextPo: PurchaseOrder = {
        ...cur,
        supplierId: supplier.id,
        supplierName: supplier.name,
        lines,
        total: lines.reduce((a, l) => a + l.total, 0),
        expectedDate: input.expectedDate || null,
        warehouseId: input.warehouseId ?? null,
        note: input.note.trim(),
      };
      putDoc("purchaseOrders", nextPo);
      return true;
    },
    [composePoLines, putDoc]
  );

  const deletePurchaseOrder = useCallback(
    (id: string) => {
      if (!can(roleRef.current, "purchaseOrders", "write")) return;
      const cur = colsRef.current.purchaseOrders.find((p) => p.id === id);
      if (!cur || cur.status !== "draft") return; // only drafts are deletable
      removeDoc("purchaseOrders", id);
    },
    [removeDoc]
  );

  const issuePurchaseOrder = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "purchaseOrders", "write")) return false;
      const cur = colsRef.current.purchaseOrders.find((p) => p.id === id);
      if (!cur || cur.status !== "draft") return false;
      const number = nextDocNumber(
        "purchaseOrder",
        colsRef.current.purchaseOrders.map((p) => p.number),
        settingsRef.current
      );
      const issuedPo: PurchaseOrder = { ...cur, number, status: "issued" };
      putDoc("purchaseOrders", issuedPo);
      return true;
    },
    [putDoc]
  );

  const cancelPurchaseOrder = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "purchaseOrders", "write")) return false;
      const cur = colsRef.current.purchaseOrders.find((p) => p.id === id);
      if (!cur || cur.status === "cancelled" || cur.status === "received") return false;
      // §1.4: a document with ANY fulfilled quantity cannot be
      // cancelled — its receipts exist. Cancellation posts nothing.
      const received = poReceivedQty(cur, colsRef.current.purchases);
      for (const v of received.values()) if (v > 0) return false;
      const cancelledPo: PurchaseOrder = { ...cur, status: "cancelled" };
      putDoc("purchaseOrders", cancelledPo);
      return true;
    },
    [putDoc]
  );

  /**
   * Purchase order → goods receipt (§2.3): the purchase chain's
   * one posting seam. The picks are validated against the DERIVED
   * remaining quantities by `composePoReceiptLines` — an
   * over-receipt, a product the PO never ordered, or an
   * unreceivable PO state is refused BEFORE anything is composed.
   * The receipt then posts ONLY through `recordPurchase` (the
   * engine stamps `sourcePoId` and recomputes this PO's cached
   * status inside the receipt batch), so a PO receipt's journal
   * entry and stock effects are a direct purchase's, by
   * construction — template identity is structural, not hoped for.
   */
  const receiveAgainstPo = useCallback(
    (
      poId: string,
      picks: Array<{ productId: string; qty: number; unitCost?: number }>,
      warehouseId?: string | null
    ): string | null => {
      if (!can(roleRef.current, "purchaseOrders", "write")) return null; // matrix: F/F/N/R
      const po = colsRef.current.purchaseOrders.find((p) => p.id === poId);
      if (!po) return null;
      const lines = composePoReceiptLines(po, colsRef.current.purchases, picks);
      if (!lines) return null;
      return recordPurchase({
        supplierId: po.supplierId,
        lines,
        note: "",
        sourcePoId: po.id,
        // Phase C · C1 (§1.6): receipts inherit the PO's expected
        // destination, editable at the receiving desk (the
        // override above) like cost; recordPurchase resolves the
        // final stamp.
        warehouseId: warehouseId ?? po.warehouseId ?? null,
      });
    },
    [recordPurchase]
  );

  const recordSupplierPayment = useCallback(
    (p: Omit<SupplierPayment, "id" | "ts" | "dayOffset">) => {
      if (!can(roleRef.current, "supplierPayments", "write")) return; // A3 guard
      // Phase B · B5 (design §4.3): paying by cheque SETTLES THE
      // PAYABLE AT ISSUANCE — the payment row is written now (so
      // the subledger agrees from this instant) and the entry
      // credits the `cheques_issued` bridge instead of a money
      // account; the money itself leaves the drawn-on account only
      // at clearing. The capture draft rides the input only.
      const isCheque = p.instrument === "cheque";
      if (isCheque && (!isValidChequeDraft(p.cheque) || !(p.amount > 0))) return;
      const now = new Date().toISOString();
      const payment: SupplierPayment = {
        id: newId("spay"),
        supplierId: p.supplierId,
        amount: p.amount,
        method: p.method,
        // A2 stamp: for a cheque this is the DRAWN-ON account
        // (captured at issue, §4.1) — where clearing will take it.
        accountId: resolveAccountId(p.method, p.accountId),
        ...(isCheque ? { instrument: "cheque" as const, chequeId: newId("chq") } : {}),
        // Phase B · B6 (design §5.1): the payment-voucher stamp,
        // minted at this posting instant from the subscribed
        // payment rows (the §1.3 max+1 pattern; unstamped rows —
        // pre-B6 history, cheque-bounce reversals — contribute no
        // sequence) and carried INSIDE this row, in the same
        // batch/state update as the payment itself.
        voucherNo: nextDocNumber(
          "paymentVoucher",
          colsRef.current.supplierPayments.map((x) => x.voucherNo),
          settingsRef.current
        ),
        note: p.note,
        dayOffset: 0,
        ts: now,
      };
      const entry = makeEntry(`Supplier payment`, "supplier_payment", payment.id, [
        { account: "payables", debit: p.amount, credit: 0, ref: p.supplierId },
        isCheque
          ? { account: "cheques_issued" as const, debit: 0, credit: p.amount, ref: payment.chequeId ?? null }
          : { account: accountForMethod(p.method), debit: 0, credit: p.amount, ref: payment.accountId },
      ]);
      const chequeDoc: Cheque | null =
        isCheque && p.cheque && payment.chequeId
          ? {
              id: payment.chequeId,
              direction: "out",
              chequeNo: p.cheque.chequeNo.trim(),
              bankName: p.cheque.bankName.trim(),
              amount: p.amount,
              issueDateISO: p.cheque.issueDateISO,
              dueDateISO: p.cheque.dueDateISO,
              partyId: p.supplierId,
              partyName:
                colsRef.current.suppliers.find((s) => s.id === p.supplierId)?.name ?? "",
              partyKind: "supplier",
              status: "issued",
              sourceType: "supplier_payment",
              sourceId: payment.id,
              accountId: payment.accountId ?? null,
              chargesOnBounce: 0,
              entryIds: { captured: entry.id },
              note: p.note,
              dayOffset: 0,
              ts: now,
            }
          : null;
      guardPostings(entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "supplierPayments", payment.id), { ...payment });
        if (chequeDoc) batch.set(doc(ctx.db, "users", ctx.uid, "cheques", chequeDoc.id), { ...chequeDoc });
        postEntry(batch, entry);
        void batch.commit();
        return;
      }
      putDoc("supplierPayments", payment);
      if (chequeDoc) putDoc("cheques", chequeDoc);
      appendJournalDemo(entry);
    },
    [cloudCtx, putDoc, appendJournalDemo, resolveAccountId]
  );

  /* ---------------- Phase B · B4: purchase returns + debit notes ----------------
   * Design §3.2 — the missing mirror of `reverseBillItems`. Goods
   * go back against ONE recorded purchase, at that purchase line's
   * own in-cost snapshot (the product's shelf `costPrice` is NOT
   * rewritten — a return is not a receipt). Input tax reverses
   * with the cumulative discipline of `purchaseReturnTaxShares`,
   * so item-by-item returns reverse `tax_input` to the paisa.
   * Journal template (gross G = net goods N + tax T):
   *   payable_offset:  Dr payables (ref: supplier) G /
   *                    Cr inventory N + Cr tax_input T
   *   cash_refund:     Dr cash|wallet (ref: account) G / same Cr
   * The `purchases` clearing account is deliberately untouched —
   * it netted to zero at receipt; the return is a new event.
   * An offset against an already-paid purchase drives the payable
   * NEGATIVE (the supplier advance) in the journal and — via the
   * B4-amended `supplierBalance`/`payablesAging`, which net the
   * PurchaseReturn rows this action writes — in the subledger
   * identically (R-B2). The debit note mints in the SAME batch,
   * wrapping this posting exactly as credit notes wrap sale
   * returns (§3.1). Gate: the `creditDebitNotes` row (G-2). */
  const recordPurchaseReturn = useCallback(
    (input: NewPurchaseReturnInput, onNote?: (note: DocNote) => void): string | null => {
      if (!can(roleRef.current, "creditDebitNotes", "write")) return null; // G-2 gate
      const purchase = colsRef.current.purchases.find((p) => p.id === input.purchaseId);
      if (!purchase) return null;
      // Over-return is refused by the DERIVATION (purchased −
      // already returned) before anything is composed.
      const composed = composePurchaseReturnLines(
        purchase,
        colsRef.current.purchaseReturns,
        input.lines
      );
      if (!composed) return null;
      const priorReturns = colsRef.current.purchaseReturns.filter(
        (r) => r.purchaseId === purchase.id
      );
      const items = purchaseReturnItems(purchase, composed);
      const taxShares = purchaseReturnTaxShares(purchase, priorReturns, items);
      for (const it of items) it.taxAmount = taxShares.perLine.get(it.productId) ?? 0;
      // Goods leave Inventory at their NET value: for an inclusive
      // slab the sticker carried its tax inside (net = total −
      // share); for an exclusive slab the sticker WAS the net.
      const srcById = new Map(purchase.items.map((i) => [i.productId, i]));
      const netTotal = round2(
        items.reduce(
          (a, it) =>
            a +
            (srcById.get(it.productId)?.taxInclusive
              ? it.total - (it.taxAmount ?? 0)
              : it.total),
          0
        )
      );
      // Phase C · C3 (§4.1): the inventory credit splits by each
      // returned product's class, over the same per-item nets —
      // raw-material value leaves `inventory_raw`, goods value
      // `inventory`; the tax credit below never changes.
      const prClassById = new Map(
        productsRef.current.map((p) => [p.id, p.stockClass === "raw"])
      );
      const rawReturnShare = items.reduce(
        (a, it) =>
          a +
          (prClassById.get(it.productId)
            ? srcById.get(it.productId)?.taxInclusive
              ? it.total - (it.taxAmount ?? 0)
              : it.total
            : 0),
        0
      );
      const taxTotal = taxShares.taxShare;
      const gross = round2(netTotal + taxTotal);
      if (gross <= 0) return null;
      const now = new Date().toISOString();
      const refundMethod =
        input.settlement === "cash_refund" ? (input.method ?? "cash") : null;
      const refundAccountId =
        refundMethod !== null ? resolveAccountId(refundMethod, input.accountId) : null;
      const ret: PurchaseReturn = {
        id: newId("pret"),
        purchaseId: purchase.id,
        supplierId: purchase.supplierId,
        items,
        payableOffset: input.settlement === "payable_offset" ? gross : 0,
        refundAmount: input.settlement === "cash_refund" ? gross : 0,
        method: refundMethod,
        accountId: refundAccountId,
        dayOffset: 0,
        ts: now,
      };
      const entry = makeEntry(
        `Purchase return — goods sent back`,
        "purchase_return",
        ret.id,
        [
          ...(ret.payableOffset > 0
            ? [
                {
                  account: "payables" as const,
                  debit: ret.payableOffset,
                  credit: 0,
                  ref: purchase.supplierId,
                },
              ]
            : []),
          ...(ret.refundAmount > 0 && refundMethod
            ? [
                {
                  account: accountForMethod(refundMethod),
                  debit: ret.refundAmount,
                  credit: 0,
                  ref: refundAccountId,
                },
              ]
            : []),
          ...classLegLines(netTotal, rawReturnShare, "credit"),
          ...(taxTotal > 0
            ? [{ account: "tax_input" as const, debit: 0, credit: taxTotal }]
            : []),
        ],
        { ts: now }
      );
      const supplier = colsRef.current.suppliers.find((s) => s.id === purchase.supplierId);
      const figures = debitNoteFigures(ret);
      const note: DocNote = {
        id: newId("note"),
        number: nextDocNumber(
          "debitNote",
          colsRef.current.notes.filter((n) => n.kind === "debit").map((n) => n.number),
          settingsRef.current
        ),
        kind: "debit",
        returnId: ret.id,
        billId: null,
        billNo: null,
        purchaseId: purchase.id,
        partyId: purchase.supplierId,
        partyName: supplier?.name ?? "",
        items: noteItemsFromPurchaseReturn(ret),
        goodsAmount: figures.goodsAmount,
        taxAmount: figures.taxAmount,
        total: figures.total,
        settlement: input.settlement,
        journalEntryId: entry.id,
        reason: input.reason.trim(),
        status: "posted",
        dayOffset: 0,
        ts: now,
      };
      // Phase C · C1 (§1.5): the goods leave from the warehouse
      // they were RECEIVED into — the purchase's own stamp
      // (pre-C purchases ⇒ the default warehouse).
      const purchaseWh = resolveWh(purchase.warehouseId);
      guardPostings(entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "purchaseReturns", ret.id), { ...ret });
        batch.set(doc(ctx.db, "users", ctx.uid, "notes", note.id), { ...note });
        for (const it of items) {
          batch.update(doc(ctx.db, "users", ctx.uid, "products", it.productId), {
            stockQty: increment(-it.qty),
          });
          batchLevelDelta(batch, ctx.db, ctx.uid, purchaseWh, it.productId, -it.qty);
        }
        postEntry(batch, entry);
        void batch.commit();
        onNote?.(note);
        return ret.id;
      }
      setCols((prev) => ({
        ...prev,
        purchaseReturns: [...prev.purchaseReturns, ret],
        notes: [...prev.notes, note],
        journal: [...prev.journal, entry],
      }));
      setProducts((prev) =>
        prev.map((p) => {
          const out = items
            .filter((i) => i.productId === p.id)
            .reduce((a, i) => a + i.qty, 0);
          return out ? { ...p, stockQty: p.stockQty - out } : p;
        })
      );
      applyDemoLevels(
        items.map((it) => ({ warehouseId: purchaseWh, productId: it.productId, delta: -it.qty }))
      );
      onNote?.(note);
      return ret.id;
    },
    [cloudCtx, resolveAccountId, resolveWh, applyDemoLevels]
  );

  /* ---------------- customers & credit ---------------- */
  const addCustomer = useCallback(
    (c: Omit<Customer, "id" | "ts">): string => {
      if (!can(roleRef.current, "customersManage", "write")) return ""; // A3 guard
      const customer: Customer = { ...c, id: newId("cu"), ts: new Date().toISOString() };
      putDoc("customers", customer);
      return customer.id;
    },
    [putDoc]
  );
  const updateCustomer = useCallback(
    (id: string, patch: Partial<Customer>) => {
      if (!can(roleRef.current, "customersManage", "write")) return; // A3 guard
      const cur = cols.customers.find((x) => x.id === id);
      if (cur) putDoc("customers", { ...cur, ...patch, id });
    },
    [cols.customers, putDoc]
  );
  const deleteCustomer = useCallback(
    (id: string) => {
      if (!can(roleRef.current, "customersManage", "write")) return; // A3 guard
      removeDoc("customers", id);
    },
    [removeDoc]
  );

  const addCredit = useCallback(
    (c: { customerId: string | null; customerName: string; customerPhone: string; amount: number; note: string }) => {
      if (!can(roleRef.current, "creditGive", "write")) return; // A3: standalone udhaar is owner/manager
      const row: CreditEntry = {
        id: newId("cr"),
        customerId: c.customerId,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        kind: "credit",
        amount: c.amount,
        // A2: a cash loan leaves from the till — stamp its account.
        accountId: resolveAccountId("cash"),
        note: c.note,
        billId: null,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      // F-7: standalone udhaar is a CASH LOAN out of the till —
      // Dr receivables / Cr cash. It is NOT a sale: no revenue, no
      // COGS, no stock movement. Goods sold on credit must go through
      // Billing with an udhaar payment part, where the bill entry
      // posts revenue + COGS + receivables together.
      const entry = makeEntry(`Udhaar (cash loan) — ${c.customerName}`, "credit", row.id, [
        { account: "receivables", debit: c.amount, credit: 0, ref: c.customerId },
        { account: "cash", debit: 0, credit: c.amount, ref: row.accountId },
      ]);
      guardPostings(entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "credits", row.id), { ...row });
        postEntry(batch, entry);
        void batch.commit();
        return;
      }
      putDoc("credits", row);
      appendJournalDemo(entry);
    },
    [cloudCtx, putDoc, appendJournalDemo, resolveAccountId]
  );

  const addRepayment = useCallback(
    (c: { customerId: string | null; customerName: string; customerPhone: string; amount: number; method: "cash" | "jazzcash" | "easypaisa" | "bank"; accountId?: string | null; note: string; instrument?: "cheque"; cheque?: ChequeDraft | null }) => {
      if (!can(roleRef.current, "creditRepayment", "write")) return; // A3 guard (all roles pass)
      // Phase B · B5 (design §4.3): a repayment received by cheque
      // debits `cheques_in_hand` in place of the money account —
      // the receivable settles NOW (the customer's word is taken,
      // exactly as a bill part settles), and the registry doc is
      // written in the same batch. A bounce restores everything
      // (see bounceCheque). The draft rides the input only.
      const isCheque = c.instrument === "cheque";
      if (isCheque && (!isValidChequeDraft(c.cheque) || !(c.amount > 0))) return;
      const now = new Date().toISOString();
      const row: CreditEntry = {
        id: newId("cr"),
        customerId: c.customerId,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        kind: "repayment",
        amount: c.amount,
        method: c.method,
        accountId: isCheque ? null : resolveAccountId(c.method, c.accountId),
        ...(isCheque ? { instrument: "cheque" as const, chequeId: newId("chq") } : {}),
        // Phase B · B6 (design §5.1): the receipt-voucher stamp,
        // minted at this posting instant from the subscribed
        // repayment rows (the §1.3 max+1 pattern) and carried
        // INSIDE this row — the same batch/state update as the
        // repayment itself, so the voucher can never exist without
        // its money event nor drift from it. A posting refused by
        // the guard below writes nothing, number included.
        voucherNo: nextDocNumber(
          "receiptVoucher",
          colsRef.current.credits
            .filter((e) => e.kind === "repayment")
            .map((e) => e.voucherNo),
          settingsRef.current
        ),
        note: c.note,
        billId: null,
        dayOffset: 0,
        ts: now,
      };
      const entry = makeEntry(`Udhaar repayment — ${c.customerName}`, "repayment", row.id, [
        isCheque
          ? { account: "cheques_in_hand" as const, debit: c.amount, credit: 0, ref: row.chequeId ?? null }
          : { account: accountForMethod(c.method), debit: c.amount, credit: 0, ref: row.accountId },
        { account: "receivables", debit: 0, credit: c.amount, ref: c.customerId },
      ]);
      const chequeDoc: Cheque | null =
        isCheque && c.cheque && row.chequeId
          ? {
              id: row.chequeId,
              direction: "in",
              chequeNo: c.cheque.chequeNo.trim(),
              bankName: c.cheque.bankName.trim(),
              amount: c.amount,
              issueDateISO: c.cheque.issueDateISO,
              dueDateISO: c.cheque.dueDateISO,
              partyId: c.customerId,
              partyName: c.customerName,
              partyKind: "customer",
              status: "received",
              sourceType: "repayment",
              sourceId: row.id,
              accountId: null, // chosen at deposit (§4.1)
              chargesOnBounce: 0,
              entryIds: { captured: entry.id },
              note: c.note,
              dayOffset: 0,
              ts: now,
            }
          : null;
      guardPostings(entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "credits", row.id), { ...row });
        if (chequeDoc) batch.set(doc(ctx.db, "users", ctx.uid, "cheques", chequeDoc.id), { ...chequeDoc });
        postEntry(batch, entry);
        void batch.commit();
        return;
      }
      putDoc("credits", row);
      if (chequeDoc) putDoc("cheques", chequeDoc);
      appendJournalDemo(entry);
    },
    [cloudCtx, putDoc, appendJournalDemo, resolveAccountId]
  );

  /* ---------------- cheques (Phase B · B5) ----------------
   * The registry lifecycle (design §4.3). Every action gates on
   * the `cheques` matrix row and validates the transition through
   * lib/cheques.canChequeTransition BEFORE composing anything, so
   * an invalid transition (double-clear, clear-before-deposit,
   * bounce-after-clear…) writes nothing at all. Money transitions
   * post their balanced entries through the guarded choke point
   * in the SAME batch as the registry status update; deposit
   * posts nothing. The journal stays the money history, the
   * registry the instrument's diary, `entryIds` the cross-cite. */

  /** Shared dual-path writer for the lifecycle transitions. */
  const commitChequeTransition = useCallback(
    (args: {
      cheque: Cheque;
      entries: JournalEntry[];
      creditRow?: CreditEntry | null;
      paymentRow?: SupplierPayment | null;
    }): boolean => {
      guardPostings(...args.entries); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "cheques", args.cheque.id), { ...args.cheque });
        if (args.creditRow) {
          batch.set(doc(ctx.db, "users", ctx.uid, "credits", args.creditRow.id), { ...args.creditRow });
        }
        if (args.paymentRow) {
          batch.set(doc(ctx.db, "users", ctx.uid, "supplierPayments", args.paymentRow.id), { ...args.paymentRow });
        }
        for (const e of args.entries) postEntry(batch, e);
        void batch.commit();
        return true;
      }
      setCols((prev) => ({
        ...prev,
        cheques: prev.cheques.map((c) => (c.id === args.cheque.id ? args.cheque : c)),
        credits: args.creditRow ? [...prev.credits, args.creditRow] : prev.credits,
        supplierPayments: args.paymentRow
          ? [...prev.supplierPayments, args.paymentRow]
          : prev.supplierPayments,
        journal: [...prev.journal, ...args.entries],
      }));
      return true;
    },
    [cloudCtx, guardPostings, postEntry]
  );

  /**
   * The compensating `credits` row of §4.3 (bounce / return of an
   * IN cheque): it re-opens the customer's udhaar in the SAME
   * batch as the journal's Dr receivables, so `customerOutstanding`
   * and the journal agree again. When the cheque settled a BILL
   * part, the row joins that bill's F-6 credit lot (billId set) —
   * the bill itself is immutable and stands as paid; the bounced
   * amount simply becomes owed on the khata, and the lot
   * machinery (`billCreditOutstanding`) computes over it exactly
   * as the design requires (R-B3). The registry doc carries no
   * phone, so the snapshot is recovered from the source row.
   */
  const compensatingCreditRow = (chq: Cheque, noteText: string): CreditEntry => {
    let phone = "";
    if (chq.sourceType === "bill") {
      phone = billsRef.current.find((b) => b.id === chq.sourceId)?.customerPhone ?? "";
    } else if (chq.sourceType === "repayment") {
      phone = creditsRef.current.find((c) => c.id === chq.sourceId)?.customerPhone ?? "";
    }
    return {
      id: newId("cr"),
      customerId: chq.partyId,
      customerName: chq.partyName,
      customerPhone: phone,
      kind: "credit",
      amount: chq.amount,
      instrument: "cheque",
      chequeId: chq.id,
      note: noteText,
      billId: chq.sourceType === "bill" ? chq.sourceId : null,
      dayOffset: 0,
      ts: new Date().toISOString(),
    };
  };

  const depositCheque = useCallback(
    (chequeId: string, accountId: string | null): boolean => {
      if (!can(roleRef.current, "cheques", "write")) return false; // matrix: F/F/N/F
      const chq = colsRef.current.cheques.find((c) => c.id === chequeId);
      if (!chq || !canChequeTransition(chq, "deposit")) return false;
      // The deposit account is where the money lands at clearing:
      // the desk's choice when it is live, else the bank default.
      const accounts = accountsRef.current;
      const chosen = accountId
        ? accounts.find((a) => a.id === accountId && !a.archived)
        : undefined;
      const resolved =
        chosen?.id ??
        defaultAccountForMethod(accounts, "bank")?.id ??
        accounts.find((a) => !a.archived)?.id ??
        null;
      if (!resolved) return false;
      const next: Cheque = {
        ...chq,
        status: "deposited",
        accountId: resolved,
        entryIds: { ...chq.entryIds, deposited: null },
      };
      // Custody only — NO journal entry (§4.3): `cheques_in_hand`
      // keeps carrying the value until the bank actually pays.
      const ctx = cloudCtx();
      if (ctx) {
        void setDoc(doc(ctx.db, "users", ctx.uid, "cheques", chq.id), { ...next });
        return true;
      }
      setCols((prev) => ({
        ...prev,
        cheques: prev.cheques.map((c) => (c.id === chq.id ? next : c)),
      }));
      return true;
    },
    [cloudCtx]
  );

  const clearCheque = useCallback(
    (chequeId: string): boolean => {
      if (!can(roleRef.current, "cheques", "write")) return false;
      const chq = colsRef.current.cheques.find((c) => c.id === chequeId);
      if (!chq || !canChequeTransition(chq, "clear")) return false;
      const acct = accountsRef.current.find((a) => a.id === chq.accountId);
      if (!acct) return false; // nowhere for the money to land / leave
      const entry = makeEntry(
        `Cheque ${chq.chequeNo} cleared — ${chq.partyName}`,
        "cheque_clearing",
        chq.id,
        clearingLines(chq, glForAccount(acct))
      );
      const next: Cheque = {
        ...chq,
        status: "cleared",
        entryIds: { ...chq.entryIds, cleared: entry.id },
      };
      return commitChequeTransition({ cheque: next, entries: [entry] });
    },
    [commitChequeTransition]
  );

  const bounceCheque = useCallback(
    (chequeId: string, charges = 0): boolean => {
      if (!can(roleRef.current, "cheques", "write")) return false;
      const chq = colsRef.current.cheques.find((c) => c.id === chequeId);
      if (!chq || !canChequeTransition(chq, "bounce")) return false;
      const now = new Date().toISOString();
      if (chq.direction === "in") {
        const entry = makeEntry(
          `Cheque ${chq.chequeNo} bounced — ${chq.partyName}`,
          "cheque_bounce",
          chq.id,
          bounceInLines(chq),
          { ts: now }
        );
        const entries = [entry];
        const chargeAmt = charges > 0 ? charges : 0;
        if (chargeAmt > 0) {
          // Bank charges are a SEPARATE entry in the same batch
          // (§4.3) — the bank debiting the shop is a distinct
          // money event from the customer's default. Recovering
          // them from the customer is the owner's decision (a
          // further udhaar note), never an automatic posting.
          const acct = accountsRef.current.find((a) => a.id === chq.accountId);
          if (!acct) return false; // charges need the deposit account
          entries.push(
            makeEntry(
              `Bank charges — cheque ${chq.chequeNo} bounced`,
              "cheque_bounce",
              chq.id,
              bounceChargesLines(chq, glForAccount(acct), chargeAmt),
              { ts: now }
            )
          );
        }
        const next: Cheque = {
          ...chq,
          status: "bounced",
          chargesOnBounce: chargeAmt,
          entryIds: { ...chq.entryIds, bounced: entry.id },
        };
        return commitChequeTransition({
          cheque: next,
          entries,
          creditRow: compensatingCreditRow(
            chq,
            `Cheque bounced — ${chq.bankName} ${chq.chequeNo}`
          ),
        });
      }
      // OUT (supplier payments only — the transition table refuses
      // expense cheques here): the payable re-opens in the journal
      // AND in the subledger (compensating reversal row) together.
      const entry = makeEntry(
        `Cheque ${chq.chequeNo} bounced — ${chq.partyName}`,
        "cheque_bounce",
        chq.id,
        bounceOutLines(chq),
        { ts: now }
      );
      const orig = colsRef.current.supplierPayments.find((p) => p.id === chq.sourceId);
      const reversalRow: SupplierPayment = {
        id: newId("spay"),
        supplierId: chq.partyId ?? orig?.supplierId ?? "",
        amount: chq.amount,
        method: orig?.method ?? "bank",
        accountId: orig?.accountId ?? chq.accountId,
        kind: "reversal",
        instrument: "cheque",
        chequeId: chq.id,
        note: `Cheque bounced — ${chq.bankName} ${chq.chequeNo}`,
        dayOffset: 0,
        ts: now,
      };
      const next: Cheque = {
        ...chq,
        status: "bounced",
        entryIds: { ...chq.entryIds, bounced: entry.id },
      };
      return commitChequeTransition({ cheque: next, entries: [entry], paymentRow: reversalRow });
    },
    [commitChequeTransition]
  );

  const returnCheque = useCallback(
    (chequeId: string): boolean => {
      if (!can(roleRef.current, "cheques", "write")) return false;
      const chq = colsRef.current.cheques.find((c) => c.id === chequeId);
      if (!chq || !canChequeTransition(chq, "return")) return false;
      const entry = makeEntry(
        `Cheque ${chq.chequeNo} returned — ${chq.partyName}`,
        "cheque_return",
        chq.id,
        returnInLines(chq)
      );
      const next: Cheque = {
        ...chq,
        status: "returned",
        entryIds: { ...chq.entryIds, returned: entry.id },
      };
      return commitChequeTransition({
        cheque: next,
        entries: [entry],
        creditRow: compensatingCreditRow(
          chq,
          `Cheque returned — ${chq.bankName} ${chq.chequeNo}`
        ),
      });
    },
    [commitChequeTransition]
  );

  /* ---------------- expenses & cash book ---------------- */
  const expenseEntryFor = (
    e: Expense,
    refType: "expense" | "expense_reversal",
    reversesId?: string | null,
    /** A5: explicit dating for a corrected repost (see updateExpense
     *  — a correction touching a closed period posts at today). */
    dating?: { dayOffset: number; ts: string }
  ) =>
    makeEntry(
      refType === "expense" ? `Expense — ${e.category}` : `Expense reversal — ${e.category}`,
      refType,
      e.id,
      [
        { account: `expense_${e.category}` as JournalEntry["lines"][number]["account"], debit: e.amount, credit: 0 },
        // A2: the money line carries the account the expense was paid
        // from (stamped on the expense row at posting time).
        // Phase B · B5: a cheque expense credits the `cheques_issued`
        // bridge (ref: chequeId) instead — no money account is
        // involved until the cheque clears (design §4.3), and the
        // F-5 machinery below finds this posting by refId as usual.
        ...(e.instrument === "cheque" && e.chequeId
          ? [{ account: "cheques_issued" as const, debit: 0, credit: e.amount, ref: e.chequeId }]
          : [{ account: accountForMethod(e.method), debit: 0, credit: e.amount, ref: e.accountId ?? null }]),
      ],
      {
        dayOffset: dating?.dayOffset ?? e.dayOffset,
        ts: dating?.ts ?? e.ts,
        reversesId: reversesId ?? null,
      }
    );

  const addExpense = useCallback(
    (e: { category: ExpenseCategory; amount: number; method: Expense["method"]; accountId?: string | null; note: string; dayOffset?: number; instrument?: "cheque"; cheque?: ChequeDraft | null }) => {
      if (!can(roleRef.current, "expenses", "write")) return; // A3 guard
      // Phase B · B5: an expense paid by cheque issues the
      // instrument inside the host expense entry (Dr expense /
      // Cr cheques_issued — see expenseEntryFor) and writes the
      // registry doc in the same batch; the cheque thereafter
      // follows the OUT lifecycle. The draft rides the input only.
      const isCheque = e.instrument === "cheque";
      if (isCheque && (!isValidChequeDraft(e.cheque) || !(e.amount > 0))) return;
      const dayOffset = e.dayOffset ?? 0;
      const ts = new Date(Date.now() - dayOffset * 86400000).toISOString();
      const row: Expense = {
        id: newId("exp"),
        category: e.category,
        amount: e.amount,
        method: e.method,
        // A2 stamp: for a cheque, the account it is DRAWN ON.
        accountId: resolveAccountId(e.method, e.accountId),
        ...(isCheque ? { instrument: "cheque" as const, chequeId: newId("chq") } : {}),
        note: e.note,
        dayOffset,
        ts,
      };
      const entry = expenseEntryFor(row, "expense");
      const chequeDoc: Cheque | null =
        isCheque && e.cheque && row.chequeId
          ? {
              id: row.chequeId,
              direction: "out",
              chequeNo: e.cheque.chequeNo.trim(),
              bankName: e.cheque.bankName.trim(),
              amount: e.amount,
              issueDateISO: e.cheque.issueDateISO,
              dueDateISO: e.cheque.dueDateISO,
              partyId: null,
              partyName: e.note.trim() || e.category,
              partyKind: "expense",
              status: "issued",
              sourceType: "expense",
              sourceId: row.id,
              accountId: row.accountId ?? null,
              chargesOnBounce: 0,
              entryIds: { captured: entry.id },
              note: e.note,
              dayOffset,
              ts,
            }
          : null;
      // A5: an expense may legitimately be DATED in the past
      // (dayOffset) — but never inside a closed period. The guard
      // refuses here, before any write, with PeriodLockedError.
      guardPostings(entry);
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "expenses", row.id), { ...row });
        if (chequeDoc) batch.set(doc(ctx.db, "users", ctx.uid, "cheques", chequeDoc.id), { ...chequeDoc });
        postEntry(batch, entry);
        void batch.commit();
        return;
      }
      putDoc("expenses", row);
      if (chequeDoc) putDoc("cheques", chequeDoc);
      appendJournalDemo(entry);
    },
    [cloudCtx, putDoc, appendJournalDemo, resolveAccountId]
  );

  const updateExpense = useCallback(
    (id: string, patch: Partial<Expense>) => {
      if (!can(roleRef.current, "expenses", "write")) return; // A3 guard
      const cur = cols.expenses.find((x) => x.id === id);
      if (!cur) return;
      // Phase B · B5: a cheque expense is bound to its instrument.
      // While the cheque is still ISSUED, a correction reposts
      // against `cheques_issued` exactly as the original did (the
      // mirror + repost below), the instrument/method/drawn-on
      // stamps are preserved, and an amount correction syncs the
      // registry doc in the same batch (the registry is a mutable
      // diary; the journal history is never touched). Once the
      // cheque is SPENT (cleared/bounced) the expense can no
      // longer be corrected through here — its money has moved —
      // and the update is refused.
      const curCheque =
        cur.instrument === "cheque" && cur.chequeId
          ? (colsRef.current.cheques.find((c) => c.id === cur.chequeId) ?? null)
          : null;
      if (cur.instrument === "cheque" && curCheque && curCheque.status !== "issued") {
        return;
      }
      const next: Expense = { ...cur, ...patch, id };
      if (cur.instrument === "cheque") {
        next.instrument = "cheque";
        next.chequeId = cur.chequeId;
        next.method = cur.method;
        next.accountId = cur.accountId;
      } else if (patch.accountId !== undefined) {
        // A2: keep the money-account stamp consistent with the
        // (possibly changed) method — an explicit picker choice
        // wins; a method change without a choice re-resolves to
        // the new method's default; otherwise the original stands.
        next.accountId = resolveAccountId(next.method, patch.accountId);
      } else if (patch.method !== undefined && patch.method !== cur.method) {
        next.accountId = resolveAccountId(next.method, null);
      }
      const chequeSync: Cheque | null =
        curCheque && next.amount !== cur.amount
          ? { ...curCheque, amount: next.amount }
          : null;
      // APPEND-ONLY discipline: reverse the original posting, then post
      // the corrected one — the expense document is updated, the journal
      // history is never mutated. F-5: the original is found by refId
      // across refTypes (seeded postings carry refType "seed") and must
      // be the latest UNREVERSED posting for this expense.
      const original = findUnreversedPosting(journalRef.current, id);
      const reversal = original
        ? makeEntry(`Expense reversal — ${cur.category}`, "expense_reversal", id, 
            original.lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit, ref: l.ref ?? null })),
            { reversesId: original.id })
        : null;
      // A5 (design §5.2): a correction NEVER backdates into a closed
      // period. The reversal above already posts at today's instant
      // (makeEntry default); the corrected repost would normally
      // carry the expense's own business date — but when the original
      // posting OR that date falls inside the lock, the repost moves
      // to today as well, so the pair lands together in the open
      // period and the closed period's totals never change. The
      // expense DOCUMENT keeps its business date either way.
      const dating = correctionDating(
        settingsRef.current.lockedThrough,
        original?.ts ?? cur.ts,
        next.ts,
        next.dayOffset,
        new Date().toISOString()
      );
      const repost = expenseEntryFor(next, "expense", null, dating);
      guardPostings(reversal, repost); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "expenses", id), { ...next });
        if (chequeSync) batch.set(doc(ctx.db, "users", ctx.uid, "cheques", chequeSync.id), { ...chequeSync });
        if (reversal) postEntry(batch, reversal);
        postEntry(batch, repost);
        void batch.commit();
        return;
      }
      putDoc("expenses", next);
      if (chequeSync) putDoc("cheques", chequeSync);
      setCols((prev) => ({
        ...prev,
        journal: [...prev.journal, ...(reversal ? [reversal] : []), repost],
      }));
    },
    [cols.expenses, cloudCtx, putDoc, resolveAccountId]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      if (!can(roleRef.current, "expenses", "write")) return; // A3 guard
      const cur = cols.expenses.find((x) => x.id === id);
      if (!cur) return;
      // Phase B · B5: deleting a cheque expense whose cheque is
      // still ISSUED withdraws the instrument — the F-5 reversal
      // below already mirrors its `cheques_issued` line, and the
      // registry doc closes as "bounced" (the type's terminal
      // state for a stopped/returned out-cheque, §4.1) citing the
      // reversal. A SPENT cheque's expense cannot be deleted here.
      const curCheque =
        cur.instrument === "cheque" && cur.chequeId
          ? (colsRef.current.cheques.find((c) => c.id === cur.chequeId) ?? null)
          : null;
      if (cur.instrument === "cheque" && curCheque && curCheque.status !== "issued") {
        return;
      }
      // F-5: same refId-based, unreversed-only lookup as updateExpense.
      const original = findUnreversedPosting(journalRef.current, id);
      const reversal = original
        ? makeEntry(`Expense reversal — ${cur.category}`, "expense_reversal", id,
            original.lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit, ref: l.ref ?? null })),
            { reversesId: original.id })
        : null;
      const chequeClose: Cheque | null =
        curCheque && curCheque.status === "issued"
          ? {
              ...curCheque,
              status: "bounced",
              entryIds: {
                ...curCheque.entryIds,
                ...(reversal ? { bounced: reversal.id } : {}),
              },
            }
          : null;
      // A5: the reversal posts at today's instant (makeEntry
      // default) even when the expense itself sits in a closed
      // period — deleting a locked-period expense corrects the open
      // period, never the closed one.
      guardPostings(reversal);
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.delete(doc(ctx.db, "users", ctx.uid, "expenses", id));
        if (chequeClose) batch.set(doc(ctx.db, "users", ctx.uid, "cheques", chequeClose.id), { ...chequeClose });
        if (reversal) postEntry(batch, reversal);
        void batch.commit();
        return;
      }
      removeDoc("expenses", id);
      if (chequeClose) putDoc("cheques", chequeClose);
      if (reversal) appendJournalDemo(reversal);
    },
    [cols.expenses, cloudCtx, removeDoc, appendJournalDemo, putDoc]
  );

  const addCashEntry = useCallback(
    (e: { kind: "in" | "out"; amount: number; note: string; accountId?: string | null; method?: "cash" | "wallet" }) => {
      // A3: cash-book capital/drawings entries follow the finance
      // row (owner/manager/accountant — the same set rules v3 grant
      // cashEntries writes to).
      if (!can(roleRef.current, "finance", "write")) return;
      // A2: cash-book entries move through a money ACCOUNT. Resolve
      // the account (explicit choice → method default → bucket legacy)
      // and derive the row's GL bucket from it; `method` remains only
      // as the pre-A2 fallback when no accounts exist yet.
      const accounts = accountsRef.current;
      let account: MoneyAccount | null = null;
      if (e.accountId) {
        account = accounts.find((a) => a.id === e.accountId && !a.archived) ?? null;
      }
      if (!account) {
        account =
          e.method === "wallet"
            ? (accounts.find((a) => !a.archived && a.legacyFor === "wallet") ??
              defaultAccountForMethod(accounts, "bank"))
            : defaultAccountForMethod(accounts, "cash");
      }
      const gl: "cash" | "wallet" = account
        ? glForAccount(account)
        : e.method === "wallet"
          ? "wallet"
          : "cash";
      const row: CashEntry = {
        id: newId("cash"),
        kind: e.kind,
        amount: e.amount,
        method: gl,
        accountId: account?.id ?? null,
        note: e.note,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      const entry =
        e.kind === "in"
          ? makeEntry(`Cash in — ${e.note || "owner capital"}`, "cashbook", row.id, [
              { account: gl, debit: e.amount, credit: 0, ref: row.accountId },
              { account: "capital", debit: 0, credit: e.amount },
            ])
          : makeEntry(`Cash out — ${e.note || "owner drawings"}`, "cashbook", row.id, [
              { account: "drawings", debit: e.amount, credit: 0 },
              { account: gl, debit: 0, credit: e.amount, ref: row.accountId },
            ]);
      guardPostings(entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "cashEntries", row.id), { ...row });
        postEntry(batch, entry);
        void batch.commit();
        return;
      }
      putDoc("cashEntries", row);
      appendJournalDemo(entry);
    },
    [cloudCtx, putDoc, appendJournalDemo]
  );

  /* ---------------- money accounts (Phase A · A2) ---------------- */

  /** Dual-path write for one or more account docs (create/update). */
  const writeAccounts = useCallback(
    (updates: MoneyAccount[]) => {
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        for (const a of updates) {
          batch.set(doc(ctx.db, "users", ctx.uid, "accounts", a.id), { ...a });
        }
        void batch.commit();
        return;
      }
      setCols((prev) => {
        const rest = prev.accounts.filter((a) => !updates.some((u) => u.id === a.id));
        const merged = [...rest, ...updates].sort((a, b) => a.sortOrder - b.sortOrder);
        return { ...prev, accounts: merged };
      });
    },
    [cloudCtx]
  );

  const addMoneyAccount = useCallback(
    (input: { name: string; kind: MoneyAccount["kind"]; method: PayMethod | null }) => {
      const name = input.name.trim();
      if (!name) return;
      if (!can(roleRef.current, "accountsManage", "write")) return; // A3: owner-only (rules enforce too)
      const accounts = accountsRef.current;
      const account: MoneyAccount = {
        id: newId("acc"),
        name,
        kind: input.kind,
        method: input.method,
        legacyFor: null,
        archived: false,
        sortOrder: accounts.reduce((m, a) => Math.max(m, a.sortOrder), -1) + 1,
        ts: new Date().toISOString(),
      };
      const updates: MoneyAccount[] = [account];
      // Exactly one default per method: a previous holder yields it.
      if (input.method) {
        const prev = accounts.find(
          (a) => !a.archived && a.method === input.method && a.id !== account.id
        );
        if (prev) updates.push({ ...prev, method: null });
      }
      writeAccounts(updates);
    },
    [isStaff, writeAccounts]
  );

  const renameMoneyAccount = useCallback(
    (id: string, name: string) => {
      const cur = accountsRef.current.find((a) => a.id === id);
      const trimmed = name.trim();
      if (!cur || !trimmed || !can(roleRef.current, "accountsManage", "write")) return;
      const next: MoneyAccount = { ...cur, name: trimmed };
      putDoc("accounts", next);
    },
    [isStaff, putDoc]
  );

  const archiveMoneyAccount = useCallback(
    (id: string) => {
      const cur = accountsRef.current.find((a) => a.id === id);
      if (!cur || !can(roleRef.current, "accountsManage", "write")) return;
      // R-3: the legacy accounts carry ALL pre-A2 history via
      // legacyFor resolution — archiving one would make historical
      // balances appear to vanish. They are rename-only, forever.
      if (cur.legacyFor) return;
      // Archiving also yields any method default it held; resolution
      // then falls back to the bucket's legacy account.
      const next: MoneyAccount = { ...cur, archived: true, method: null };
      putDoc("accounts", next);
    },
    [isStaff, putDoc]
  );

  const setDefaultMoneyAccount = useCallback(
    (id: string, method: PayMethod) => {
      if (!can(roleRef.current, "accountsManage", "write") || method === "credit") return;
      const accounts = accountsRef.current;
      const target = accounts.find((a) => a.id === id && !a.archived);
      if (!target) return;
      // Kind compatibility: "cash" settles only into a cash-kind
      // account; wallet methods into wallet/bank kinds.
      const compatible =
        method === "cash" ? target.kind === "cash" : target.kind !== "cash";
      if (!compatible) return;
      const updates: MoneyAccount[] = [{ ...target, method }];
      const prev = accounts.find(
        (a) => !a.archived && a.method === method && a.id !== id
      );
      if (prev) updates.push({ ...prev, method: null });
      writeAccounts(updates);
    },
    [isStaff, writeAccounts]
  );

  /**
   * Inter-account transfer (design §1.5): ONE balanced journal entry
   * (Dr destination / Cr source, account ids in the line refs,
   * refType "transfer") + a cashEntries row of kind "transfer", in
   * the same atomic batch as every other posting. GL bucket totals
   * move only when the transfer crosses buckets; a wallet→wallet
   * transfer nets to zero at GL level — correct by construction.
   */
  const transferFunds = useCallback(
    (t: { fromAccountId: string; toAccountId: string; amount: number; note: string }): boolean => {
      if (!can(roleRef.current, "transfers", "write")) return false; // A3 guard
      const accounts = accountsRef.current;
      const from = accounts.find((a) => a.id === t.fromAccountId && !a.archived);
      const to = accounts.find((a) => a.id === t.toAccountId && !a.archived);
      if (!from || !to || from.id === to.id || !(t.amount > 0)) return false;
      const row: CashEntry = {
        id: newId("cash"),
        kind: "transfer",
        amount: t.amount,
        method: glForAccount(from),
        accountId: null,
        fromAccountId: from.id,
        toAccountId: to.id,
        note: t.note,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      const entry = makeEntry(
        `Transfer — ${from.name} → ${to.name}`,
        "transfer",
        row.id,
        [
          { account: glForAccount(to), debit: t.amount, credit: 0, ref: to.id },
          { account: glForAccount(from), debit: 0, credit: t.amount, ref: from.id },
        ]
      );
      guardPostings(entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "cashEntries", row.id), { ...row });
        postEntry(batch, entry);
        void batch.commit();
        return true;
      }
      putDoc("cashEntries", row);
      appendJournalDemo(entry);
      return true;
    },
    [cloudCtx, putDoc, appendJournalDemo]
  );

  /* ---------------- tax slabs (Phase A · A4) ---------------- */

  /**
   * Write the settings' tax defaults AND reconcile every slab's
   * `isDefault` flag against them (`isDefault` is derived display
   * state: a slab is a default iff a settings field points at it —
   * the settings fields are the resolution source of truth, design
   * §2.1). One batch in cloud mode; tax management is owner-only,
   * and every caller guards before reaching here.
   */
  const writeTaxDefaults = useCallback(
    (
      patch: {
        defaultSalesTaxSlabId?: string | null;
        defaultPurchaseTaxSlabId?: string | null;
      },
      slabsNow?: TaxSlab[]
    ) => {
      const cur = settingsRef.current;
      const nextSales =
        patch.defaultSalesTaxSlabId !== undefined
          ? patch.defaultSalesTaxSlabId
          : (cur.defaultSalesTaxSlabId ?? null);
      const nextPurch =
        patch.defaultPurchaseTaxSlabId !== undefined
          ? patch.defaultPurchaseTaxSlabId
          : (cur.defaultPurchaseTaxSlabId ?? null);
      const slabs = slabsNow ?? taxSlabsRef.current;
      const changed = slabs
        .map((s) => ({ ...s, isDefault: s.id === nextSales || s.id === nextPurch }))
        .filter((s, i) => s.isDefault !== slabs[i].isDefault);
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(
          doc(ctx.db, "users", ctx.uid),
          {
            defaultSalesTaxSlabId: nextSales,
            defaultPurchaseTaxSlabId: nextPurch,
          },
          { merge: true }
        );
        for (const s of changed) {
          batch.set(doc(ctx.db, "users", ctx.uid, "taxSlabs", s.id), { ...s });
        }
        void batch.commit();
        return;
      }
      setCols((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          defaultSalesTaxSlabId: nextSales,
          defaultPurchaseTaxSlabId: nextPurch,
        },
        taxSlabs: prev.taxSlabs.map((s) => changed.find((c) => c.id === s.id) ?? s),
      }));
    },
    [cloudCtx]
  );

  const addTaxSlab = useCallback(
    (input: Omit<TaxSlab, "id" | "ts">) => {
      // Owner-only (matrix row taxSlabs; rules v3 enforce the same).
      if (!can(roleRef.current, "taxSlabs", "write")) return;
      const slab: TaxSlab = {
        ...input,
        name: input.name.trim(),
        isDefault: false, // reconciled by writeTaxDefaults below
        id: newId("tax"),
        ts: new Date().toISOString(),
      };
      if (!slab.name) return;
      putDoc("taxSlabs", slab);
      if (input.isDefault) {
        const patch: {
          defaultSalesTaxSlabId?: string | null;
          defaultPurchaseTaxSlabId?: string | null;
        } = {};
        if (slab.appliesTo === "sales" || slab.appliesTo === "both")
          patch.defaultSalesTaxSlabId = slab.id;
        if (slab.appliesTo === "purchases" || slab.appliesTo === "both")
          patch.defaultPurchaseTaxSlabId = slab.id;
        writeTaxDefaults(patch, [slab, ...taxSlabsRef.current]);
      }
    },
    [putDoc, writeTaxDefaults]
  );

  const updateTaxSlab = useCallback(
    (id: string, patch: Partial<TaxSlab>) => {
      if (!can(roleRef.current, "taxSlabs", "write")) return; // owner-only
      const cur = taxSlabsRef.current.find((s) => s.id === id);
      if (!cur) return;
      const { id: _ignored, ...rest } = patch;
      const next: TaxSlab = {
        ...cur,
        ...rest,
        id,
        name: (rest.name ?? cur.name).trim() || cur.name,
      };
      putDoc("taxSlabs", next);
      // Reconcile the settings defaults against the edited slab: it
      // claims the defaults for the directions it covers when marked
      // default, and loses any default it no longer covers / is no
      // longer marked for. Inactive slabs keep a recorded default
      // but resolve to nothing at posting (resolveTaxSlab checks
      // `active`), so deactivation can never charge tax silently.
      const slabsNow = taxSlabsRef.current.map((s) => (s.id === id ? next : s));
      const s = settingsRef.current;
      const dp: {
        defaultSalesTaxSlabId?: string | null;
        defaultPurchaseTaxSlabId?: string | null;
      } = {};
      const covers = (dir: "sales" | "purchases") =>
        next.appliesTo === dir || next.appliesTo === "both";
      if (next.isDefault) {
        if (covers("sales")) dp.defaultSalesTaxSlabId = id;
        if (covers("purchases")) dp.defaultPurchaseTaxSlabId = id;
      }
      if (s.defaultSalesTaxSlabId === id && dp.defaultSalesTaxSlabId === undefined && (!next.isDefault || !covers("sales")))
        dp.defaultSalesTaxSlabId = null;
      if (s.defaultPurchaseTaxSlabId === id && dp.defaultPurchaseTaxSlabId === undefined && (!next.isDefault || !covers("purchases")))
        dp.defaultPurchaseTaxSlabId = null;
      if (Object.keys(dp).length > 0) writeTaxDefaults(dp, slabsNow);
    },
    [putDoc, writeTaxDefaults]
  );

  const deleteTaxSlab = useCallback(
    (id: string) => {
      if (!can(roleRef.current, "taxSlabs", "write")) return; // owner-only
      removeDoc("taxSlabs", id);
      // Products pointing at the deleted slab fall back to the shop
      // default at resolution (no product writes needed); a settings
      // default pointing at it is cleared here.
      const s = settingsRef.current;
      const dp: {
        defaultSalesTaxSlabId?: string | null;
        defaultPurchaseTaxSlabId?: string | null;
      } = {};
      if (s.defaultSalesTaxSlabId === id) dp.defaultSalesTaxSlabId = null;
      if (s.defaultPurchaseTaxSlabId === id) dp.defaultPurchaseTaxSlabId = null;
      if (Object.keys(dp).length > 0) {
        writeTaxDefaults(dp, taxSlabsRef.current.filter((x) => x.id !== id));
      }
    },
    [removeDoc, writeTaxDefaults]
  );

  const setTaxDefault = useCallback(
    (direction: "sales" | "purchases", slabId: string | null) => {
      if (!can(roleRef.current, "taxSlabs", "write")) return; // owner-only
      if (slabId && !taxSlabsRef.current.some((s) => s.id === slabId)) return;
      writeTaxDefaults(
        direction === "sales"
          ? { defaultSalesTaxSlabId: slabId }
          : { defaultPurchaseTaxSlabId: slabId }
      );
    },
    [writeTaxDefaults]
  );

  /**
   * Pay collected tax over to the government (design §2.4,
   * refType "tax_payment"): Dr tax_payable / Cr money account. The
   * amount is capped at the net position (output − input) — paying
   * more than is owed is refused. A cashEntries "out" row rides
   * along (WITHOUT its own journal entry — this function posts the
   * one entry) so the day-close operational cross-check sees the
   * money leave the till, exactly like a supplier payment.
   */
  const recordTaxPayment = useCallback(
    (p: {
      amount: number;
      method: "cash" | "jazzcash" | "easypaisa" | "bank";
      accountId?: string | null;
      note: string;
    }): boolean => {
      if (!can(roleRef.current, "finance", "write")) return false;
      if (!(p.amount > 0)) return false;
      const due = taxPosition(journalRef.current).netPayable;
      if (p.amount > Math.max(0, due) + 0.001) return false;
      const accountId = resolveAccountId(p.method, p.accountId);
      const now = new Date().toISOString();
      const row: CashEntry = {
        id: newId("cash"),
        kind: "out",
        amount: p.amount,
        method: p.method === "cash" ? "cash" : "wallet",
        accountId,
        note: p.note.trim() || "Tax payment",
        dayOffset: 0,
        ts: now,
      };
      const entry = makeEntry(
        `Tax payment — ${p.note.trim() || "government"}`,
        "tax_payment",
        row.id,
        [
          { account: "tax_payable", debit: p.amount, credit: 0 },
          { account: accountForMethod(p.method), debit: 0, credit: p.amount, ref: accountId },
        ],
        { ts: now }
      );
      guardPostings(entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "cashEntries", row.id), { ...row });
        postEntry(batch, entry);
        void batch.commit();
        return true;
      }
      putDoc("cashEntries", row);
      appendJournalDemo(entry);
      return true;
    },
    [cloudCtx, putDoc, appendJournalDemo, resolveAccountId]
  );

  /* ---------------- periods & fiscal lock (Phase A · A5) -------- */

  /**
   * Close the books through a PKT business DATE (design §5.4): ONE
   * `periods` audit doc + the owner doc's `lockedThrough` moved to
   * that date's end-of-day PKT instant, in a single batch — the
   * trail and the enforcement value can never drift apart.
   * Owner-only (matrix row `periods`; the rules keep both writes
   * owner-only too). The R-5 rail refuses a close covering today or
   * yesterday, and locks are monotonic: moving the lock BACK is
   * `reopenPeriod`'s job, never a close.
   */
  const closePeriod = useCallback(
    (throughDate: string, note: string): PeriodActionResult => {
      if (!can(roleRef.current, "periods", "write"))
        return { ok: false, reason: "permission" };
      if (!isValidDateISO(throughDate)) return { ok: false, reason: "invalid" };
      if (!canCloseThroughDate(throughDate)) return { ok: false, reason: "rail" };
      const to = endOfDayPktInstant(throughDate);
      const cur = settingsRef.current.lockedThrough ?? "";
      if (cur && to <= cur) return { ok: false, reason: "backwards" };
      const period: Period = {
        id: newId("per"),
        kind: "period",
        from: cur, // "" on the first close = locked from the beginning
        to,
        action: "close",
        byUid: user?.uid ?? "",
        byEmail: user?.email ?? "",
        ts: new Date().toISOString(),
        note: note.trim(),
      };
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "periods", period.id), { ...period });
        batch.update(doc(ctx.db, "users", ctx.uid), { lockedThrough: to });
        void batch.commit();
        return { ok: true };
      }
      setCols((prev) => ({
        ...prev,
        periods: [...prev.periods, period],
        settings: { ...prev.settings, lockedThrough: to },
      }));
      return { ok: true };
    },
    [cloudCtx, user]
  );

  /**
   * Reopen (design §5.4): lower `lockedThrough` to an earlier
   * through-date's end-of-day — or remove the lock entirely when
   * `throughDate` is null — recording WHO reopened and WHY in the
   * `periods` trail. A reason is mandatory, and a "reopen" that
   * would not actually lower the lock is refused: the trail only
   * ever records real movements.
   */
  const reopenPeriod = useCallback(
    (throughDate: string | null, reason: string): PeriodActionResult => {
      if (!can(roleRef.current, "periods", "write"))
        return { ok: false, reason: "permission" };
      if (!reason.trim()) return { ok: false, reason: "reason" };
      const cur = settingsRef.current.lockedThrough ?? "";
      if (!cur) return { ok: false, reason: "nothing" };
      let to = "";
      if (throughDate !== null) {
        if (!isValidDateISO(throughDate)) return { ok: false, reason: "invalid" };
        to = endOfDayPktInstant(throughDate);
        if (to >= cur) return { ok: false, reason: "backwards" };
      }
      const period: Period = {
        id: newId("per"),
        kind: "period",
        from: cur,
        to, // "" = fully reopened, no lock in force
        action: "reopen",
        byUid: user?.uid ?? "",
        byEmail: user?.email ?? "",
        ts: new Date().toISOString(),
        note: reason.trim(),
      };
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "periods", period.id), { ...period });
        batch.update(doc(ctx.db, "users", ctx.uid), { lockedThrough: to });
        void batch.commit();
        return { ok: true };
      }
      setCols((prev) => ({
        ...prev,
        periods: [...prev.periods, period],
        settings: { ...prev.settings, lockedThrough: to },
      }));
      return { ok: true };
    },
    [cloudCtx, user]
  );

  /* ---------------- adjustments / day close ---------------- */
  /** Single internal path for every stock adjustment: moves stock,
   *  writes the adjustments-log row, and posts the journal entry at cost
   *  (Dr inventory_loss / Cr inventory for shrinkage, mirrored for gains)
   *  so the inventory asset in the ledger always matches the shelf.
   *  F-11: everything is built from the CLAMPED delta (`buildAdjustment`)
   *  — what is applied to the shelf is exactly what is logged and
   *  exactly what is posted. */
  const adjustStockInternal = useCallback(
    (
      productId: string,
      delta: number,
      reason: AdjustmentReason,
      note: string,
      /** Phase C · C1 (§1.5): the warehouse the adjustment is
       *  recorded at — chosen at the adjustment desk; the quick
       *  +/- path passes nothing and lands at the default. */
      warehouseId?: string | null
    ) => {
      if (!can(roleRef.current, "stockAdjustments", "write")) return; // A3 guard
      const product = productsRef.current.find((p) => p.id === productId);
      if (!product || delta === 0) return;
      const adjWh = resolveWh(warehouseId);
      const built = buildAdjustment(product, delta, reason, note, "inventory_loss", adjWh);
      if (!built) return; // nothing applicable (e.g. removing from empty shelf)
      const { adj, entry, newQty } = built;
      // §1.5: the delta is computed on the TOTAL (buildAdjustment's
      // clamp), and the warehouse's row receives that same applied
      // figure — the identity survives by construction.
      const appliedDelta = newQty - product.stockQty;
      guardPostings(entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.update(doc(ctx.db, "users", ctx.uid, "products", productId), {
          stockQty: newQty,
        });
        batchLevelDelta(batch, ctx.db, ctx.uid, adjWh, productId, appliedDelta);
        batch.set(doc(ctx.db, "users", ctx.uid, "adjustments", adj.id), { ...adj });
        postEntry(batch, entry);
        void batch.commit();
        return;
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, stockQty: newQty } : p))
      );
      setCols((prev) => ({
        ...prev,
        stockLevels:
          appliedDelta !== 0
            ? applyLevelDelta(prev.stockLevels, adjWh, productId, appliedDelta)
            : prev.stockLevels,
        adjustments: [...prev.adjustments, adj],
        journal: [...prev.journal, entry],
      }));
    },
    [cloudCtx, resolveWh]
  );

  /** Original quick +/- API — now an adjustment with reason "correction". */
  const adjustStock = useCallback(
    (id: string, delta: number) => {
      adjustStockInternal(id, delta, "correction", "Quick adjust from inventory");
    },
    [adjustStockInternal]
  );

  const recordAdjustment = useCallback(
    (
      productId: string,
      delta: number,
      reason: AdjustmentReason,
      note: string,
      warehouseId?: string | null
    ) => {
      adjustStockInternal(productId, delta, reason, note, warehouseId);
    },
    [adjustStockInternal]
  );

  /* ---------------- warehouses (Phase C · C1) ----------------
   * The management surface's actions. NON-POSTING: warehouses are
   * master data — creating, renaming, archiving and re-pointing
   * the default write no journal entry and move no stock (§1.8).
   * Recount is the one stock-adjacent action: it rewrites ROWS
   * ONLY (§1.7), which fabricates no history because rows are
   * operational detail under the totals the journal corroborates.
   * All gate on the `warehouses` matrix row (owner/manager full;
   * the accountant reads; the cashier never reaches here — their
   * desk pickers ride the billing/purchase rows, G-C1). */
  const addWarehouse = useCallback(
    (input: { name: string; note: string }): string | null => {
      if (!can(roleRef.current, "warehouses", "write")) return null;
      const name = input.name.trim();
      if (!name) return null;
      const existing = colsRef.current.warehouses;
      const wh: Warehouse = {
        id: newId("wh"),
        name,
        note: input.note.trim(),
        // The first warehouse a shop ever creates IS its default
        // (exactly one default at all times, §1.8).
        isDefault: existing.length === 0,
        archived: false,
        sortOrder: existing.reduce((m, w) => Math.max(m, w.sortOrder), -1) + 1,
        ts: new Date().toISOString(),
      };
      putDoc("warehouses", wh);
      return wh.id;
    },
    [putDoc]
  );

  const updateWarehouse = useCallback(
    (
      id: string,
      patch: { name?: string; note?: string; archived?: boolean }
    ): boolean => {
      if (!can(roleRef.current, "warehouses", "write")) return false;
      const cur = colsRef.current.warehouses.find((w) => w.id === id);
      if (!cur) return false;
      // §1.8: the default cannot be archived until another
      // warehouse has been made default.
      if (patch.archived === true && cur.isDefault) return false;
      const next: Warehouse = {
        ...cur,
        ...(patch.name !== undefined ? { name: patch.name.trim() || cur.name } : {}),
        ...(patch.note !== undefined ? { note: patch.note.trim() } : {}),
        ...(patch.archived !== undefined ? { archived: patch.archived } : {}),
      };
      putDoc("warehouses", next);
      return true;
    },
    [putDoc]
  );

  const setDefaultWarehouse = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "warehouses", "write")) return false;
      const target = colsRef.current.warehouses.find((w) => w.id === id);
      if (!target || target.archived) return false;
      // Exactly one default at all times (§1.8): flip the flag on
      // every warehouse whose state changes, in the same action.
      // This moves no stock and posts nothing — future
      // preselections and legacy resolution only.
      for (const w of colsRef.current.warehouses) {
        const shouldBe = w.id === id;
        if (w.isDefault !== shouldBe) {
          const next: Warehouse = { ...w, isDefault: shouldBe };
          putDoc("warehouses", next);
        }
      }
      return true;
    },
    [putDoc]
  );

  const recountStockLevels = useCallback((): number => {
    if (!can(roleRef.current, "warehouses", "write")) return 0;
    // Phase C · C2: the identity the recount repairs is §1.3's —
    // Σ rows + in-transit == stockQty — so the derivation rides
    // along; in-transit quantities are documents and are never
    // touched by the repair (§1.7).
    const { levels, repaired } = recountLevels(
      productsRef.current,
      levelsRef.current,
      warehousesRef.current,
      colsRef.current.stockTransfers
    );
    if (repaired === 0) return 0;
    const ctx = cloudCtx();
    if (ctx) {
      const before = new Map(levelsRef.current.map((l) => [l.id, l.qty]));
      const batch = writeBatch(ctx.db);
      for (const l of levels) {
        if (before.get(l.id) !== l.qty) {
          batch.set(doc(ctx.db, "users", ctx.uid, "stockLevels", l.id), { ...l });
        }
      }
      void batch.commit();
      return repaired;
    }
    setCols((prev) => ({ ...prev, stockLevels: levels }));
    return repaired;
  }, [cloudCtx]);

  /* ---------------- stock transfers (Phase C · C2) ----------------
   * Movement documents (design §2). Dispatch / receive / return
   * move stock-LEVEL ROWS only, in the same batch as the transfer
   * doc, and post NOTHING — the goods stay the shop's, at the same
   * values, in a different building (§2.3). Close-short is the one
   * posting action: the proven shortage leaves the business as a
   * stock loss through the guarded choke point, dated today
   * (§2.5). Every action gates on the `warehouses` matrix row
   * (owner/manager write — design §6.1/§6.2) and validates the
   * transition, the route and the quantities through
   * lib/transfers BEFORE composing any write, so a refused action
   * (same-warehouse route, over-receipt, wrong status) writes
   * nothing at all. */

  /** Shared dual-path writer for transfer movements: the transfer
   *  doc + its row deltas land in ONE batch / state update; the
   *  close-short loss posts through the choke point in that same
   *  batch, with the shorted products' totals dropped beside it. */
  const commitTransferMovement = useCallback(
    (args: {
      transfer: StockTransfer;
      levelDeltas: Array<{ warehouseId: string; productId: string; delta: number }>;
      lossEntry?: JournalEntry | null;
      totalDrops?: Array<{ productId: string; qty: number }>;
    }): boolean => {
      guardPostings(args.lossEntry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "stockTransfers", args.transfer.id), {
          ...args.transfer,
        });
        for (const d of args.levelDeltas) {
          batchLevelDelta(batch, ctx.db, ctx.uid, d.warehouseId, d.productId, d.delta);
        }
        for (const drop of args.totalDrops ?? []) {
          batch.update(doc(ctx.db, "users", ctx.uid, "products", drop.productId), {
            stockQty: increment(-drop.qty),
          });
        }
        if (args.lossEntry) postEntry(batch, args.lossEntry);
        void batch.commit();
        return true;
      }
      const drops = new Map((args.totalDrops ?? []).map((d) => [d.productId, d.qty]));
      if (drops.size > 0) {
        setProducts((prev) =>
          prev.map((p) =>
            drops.has(p.id)
              ? { ...p, stockQty: p.stockQty - (drops.get(p.id) ?? 0) }
              : p
          )
        );
      }
      setCols((prev) => {
        let levels = prev.stockLevels;
        for (const d of args.levelDeltas) {
          levels = applyLevelDelta(levels, d.warehouseId, d.productId, d.delta);
        }
        return {
          ...prev,
          stockTransfers: prev.stockTransfers.map((x) =>
            x.id === args.transfer.id ? args.transfer : x
          ),
          stockLevels: levels,
          journal: args.lossEntry
            ? [...prev.journal, args.lossEntry]
            : prev.journal,
        };
      });
      return true;
    },
    [cloudCtx, guardPostings, postEntry]
  );

  const createStockTransfer = useCallback(
    (input: NewStockTransferInput): string | null => {
      if (!can(roleRef.current, "warehouses", "write")) return null;
      // Same-warehouse / missing / archived routes refuse BEFORE
      // anything is composed (§2.1, lib/transfers).
      if (
        transferRouteProblem(
          input.fromWarehouseId,
          input.toWarehouseId,
          warehousesRef.current
        )
      ) {
        return null;
      }
      const lines = composeTransferLines(productsRef.current, input.lines);
      if (!lines) return null;
      const transfer: StockTransfer = {
        id: newId("st"),
        number: null, // minted at dispatch (§6.3)
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        lines,
        note: input.note.trim(),
        status: "draft",
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      putDoc("stockTransfers", transfer);
      return transfer.id;
    },
    [putDoc]
  );

  const updateStockTransfer = useCallback(
    (id: string, input: NewStockTransferInput): boolean => {
      if (!can(roleRef.current, "warehouses", "write")) return false;
      const cur = colsRef.current.stockTransfers.find((x) => x.id === id);
      if (!cur || !canTransferTransition(cur, "edit")) return false; // drafts only (§2.4)
      if (
        transferRouteProblem(
          input.fromWarehouseId,
          input.toWarehouseId,
          warehousesRef.current
        )
      ) {
        return false;
      }
      const lines = composeTransferLines(productsRef.current, input.lines);
      if (!lines) return false;
      const next: StockTransfer = {
        ...cur,
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        lines,
        note: input.note.trim(),
      };
      putDoc("stockTransfers", next);
      return true;
    },
    [putDoc]
  );

  const deleteStockTransfer = useCallback(
    (id: string) => {
      if (!can(roleRef.current, "warehouses", "write")) return;
      const cur = colsRef.current.stockTransfers.find((x) => x.id === id);
      if (!cur || !canTransferTransition(cur, "delete")) return; // drafts only
      removeDoc("stockTransfers", id);
    },
    [removeDoc]
  );

  const cancelStockTransfer = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "warehouses", "write")) return false;
      const cur = colsRef.current.stockTransfers.find((x) => x.id === id);
      if (!cur || !canTransferTransition(cur, "cancel")) return false; // drafts only
      const cancelled: StockTransfer = { ...cur, status: "cancelled" };
      putDoc("stockTransfers", cancelled);
      return true;
    },
    [putDoc]
  );

  const dispatchStockTransfer = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "warehouses", "write")) return false;
      const cur = colsRef.current.stockTransfers.find((x) => x.id === id);
      if (!cur || !canTransferTransition(cur, "dispatch")) return false;
      // The endpoints must still be two distinct real warehouses.
      // An endpoint archived since drafting does NOT strand the
      // draft — the goods still have to be able to move.
      const problem = transferRouteProblem(
        cur.fromWarehouseId,
        cur.toWarehouseId,
        warehousesRef.current
      );
      if (problem === "same" || problem === "missing") return false;
      const number = nextDocNumber(
        "stockTransfer",
        colsRef.current.stockTransfers.map((x) => x.number),
        settingsRef.current
      );
      const dispatched: StockTransfer = { ...cur, number, status: "dispatched" };
      // The source rows drop by the sent quantities in the SAME
      // batch as the doc. The product totals do NOT change and no
      // journal entry exists — the goods are on the road (§2.3).
      return commitTransferMovement({
        transfer: dispatched,
        levelDeltas: cur.lines.map((l) => ({
          warehouseId: cur.fromWarehouseId,
          productId: l.productId,
          delta: -l.qtySent,
        })),
      });
    },
    [commitTransferMovement]
  );

  const receiveStockTransfer = useCallback(
    (
      id: string,
      picks: Array<{ productId: string; qty: number }>
    ): boolean => {
      if (!can(roleRef.current, "warehouses", "write")) return false;
      const cur = colsRef.current.stockTransfers.find((x) => x.id === id);
      if (!cur || !canTransferTransition(cur, "receive")) return false;
      // Over-receipt (and any malformed pick) refuses HERE, before
      // a single write is composed (§2.4).
      const merged = validateReceivePicks(cur, picks);
      if (!merged) return false;
      const lines = applyReceivePicks(cur.lines, merged);
      const next: StockTransfer = {
        ...cur,
        lines,
        status: statusAfterReceive(lines), // cached label over the derivation (§2.2)
      };
      // Destination rows rise by what arrived; totals unchanged;
      // no journal entry (§2.3).
      return commitTransferMovement({
        transfer: next,
        levelDeltas: merged.map((p) => ({
          warehouseId: cur.toWarehouseId,
          productId: p.productId,
          delta: p.qty,
        })),
      });
    },
    [commitTransferMovement]
  );

  const closeStockTransfer = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "warehouses", "write")) return false;
      const cur = colsRef.current.stockTransfers.find((x) => x.id === id);
      if (!cur || !canTransferTransition(cur, "closeShort")) return false;
      const shortages = transferShortages(cur);
      const productsById = new Map(productsRef.current.map((p) => [p.id, p]));
      const entry = buildTransferLossEntry(cur, shortages, productsById);
      // guardPostings runs inside commitTransferMovement BEFORE
      // any write: if today is period-locked, the loss refuses and
      // the close refuses with it — the transfer simply stays
      // open (§2.5). The PeriodLockedError propagates to the desk,
      // exactly as on every other posting surface.
      const closed: StockTransfer = { ...cur, status: "received" };
      return commitTransferMovement({
        transfer: closed,
        levelDeltas: [],
        lossEntry: entry,
        // The missing units leave the product totals (their rows
        // never rose at the destination) — restoring §1.3's
        // identity with the loss inside the ledger (§2.3). A
        // shortage line whose product was deleted drops nothing:
        // its total left with the product's own write-off.
        totalDrops: shortages
          .filter((s) => productsById.has(s.productId))
          .map((s) => ({ productId: s.productId, qty: s.qty })),
      });
    },
    [commitTransferMovement]
  );

  const returnStockTransfer = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "warehouses", "write")) return false;
      const cur = colsRef.current.stockTransfers.find((x) => x.id === id);
      if (!cur || !canTransferTransition(cur, "returnToSource")) return false;
      // Everything still on the road goes back onto the source
      // shelf; what already arrived stays at the destination
      // (§2.1). Rows only — no journal entry.
      const remaining = transferShortages(cur);
      const next: StockTransfer = { ...cur, status: "returned" };
      return commitTransferMovement({
        transfer: next,
        levelDeltas: remaining.map((s) => ({
          warehouseId: cur.fromWarehouseId,
          productId: s.productId,
          delta: s.qty,
        })),
      });
    },
    [commitTransferMovement]
  );

  /* ---------------- Phase C · C3: BOM recipes ----------------
   * Design §3: a recipe document — it posts NOTHING, holds no
   * stock, and is IMMUTABLE once created. Saving always mints
   * version n+1 for the output product and deactivates version n
   * in the SAME batch / state update, so exactly one active
   * version exists per output product and every prior version
   * stays readable forever. Validation (lib/boms) runs BEFORE
   * anything is composed — a refused draft writes nothing. Gate:
   * the `manufacturing` matrix row (owner/manager write). */
  const saveBomVersion = useCallback(
    (input: NewBomInput): boolean => {
      if (!can(roleRef.current, "manufacturing", "write")) return false;
      const products = productsRef.current;
      if (validateBomDraft(products, input)) return false;
      const output = products.find((p) => p.id === input.outputProductId);
      if (!output) return false;
      const byId = new Map(products.map((p) => [p.id, p]));
      const prevActive = colsRef.current.boms.find(
        (b) => b.outputProductId === input.outputProductId && b.active
      );
      const bom: Bom = {
        id: newId("bom"),
        outputProductId: input.outputProductId,
        outputName: output.name,
        outputQty: input.outputQty,
        version: nextBomVersion(colsRef.current.boms, input.outputProductId),
        lines: input.lines.map((l) => ({
          productId: l.productId,
          name: byId.get(l.productId)?.name ?? "",
          qty: l.qty,
        })),
        labourCost: input.labourCost,
        overheadCost: input.overheadCost,
        active: true,
        note: input.note.trim(),
        ts: new Date().toISOString(),
      };
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "boms", bom.id), { ...bom });
        if (prevActive) {
          batch.update(doc(ctx.db, "users", ctx.uid, "boms", prevActive.id), {
            active: false,
          });
        }
        void batch.commit();
        return true;
      }
      setCols((prev) => ({
        ...prev,
        boms: [
          ...prev.boms.map((b) =>
            prevActive && b.id === prevActive.id ? { ...b, active: false } : b
          ),
          bom,
        ],
      }));
      return true;
    },
    [cloudCtx]
  );

  /* ---------------- Phase C · C4: production orders ----------------
   * Design §4.2. An order's events are its subledger; every
   * figure derives from them (lib/production). The event
   * actions gate on the `manufacturing` matrix row (owner/
   * manager write), validate + value + compose through
   * lib/production BEFORE any write exists, and commit through
   * `commitProductionEvent`: the order doc (event appended,
   * status label recomputed), the stock rows and product
   * totals the event moves, and its ONE journal entry through
   * the guarded choke point — one batch / state update, so an
   * event can never half-land. Compositions live in
   * lib/production: the store gains no new entry-building call
   * site, exactly as C2/C3 kept theirs in lib. */

  /** A warehouse an order may be created / re-planned against:
   *  the stamp when it names a live (non-archived) warehouse —
   *  materials must be able to move there — else, with no
   *  stamp, the shop default. A bad stamp refuses (null). */
  const productionWarehouseId = useCallback((stamp?: string | null): string | null => {
    const list = warehousesRef.current;
    if (stamp) {
      const w = list.find((x) => x.id === stamp);
      return w && !w.archived ? w.id : null;
    }
    return defaultWarehouseId(list);
  }, []);

  /** Shared dual-path writer for production events: the order
   *  doc + its entry + the row/total movements land together.
   *  `guardPostings` runs BEFORE any write — a locked today
   *  refuses the event whole (the PeriodLockedError propagates
   *  to the desk, as on every posting surface). */
  const commitProductionEvent = useCallback(
    (args: {
      order: ProductionOrder;
      entry?: JournalEntry | null;
      levelDeltas: Array<{ warehouseId: string; productId: string; delta: number }>;
      productDeltas?: Array<{
        productId: string;
        qtyDelta: number;
        costPrice?: number;
      }>;
    }): boolean => {
      guardPostings(args.entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "productionOrders", args.order.id), {
          ...args.order,
        });
        for (const d of args.levelDeltas) {
          batchLevelDelta(batch, ctx.db, ctx.uid, d.warehouseId, d.productId, d.delta);
        }
        for (const d of args.productDeltas ?? []) {
          batch.update(doc(ctx.db, "users", ctx.uid, "products", d.productId), {
            stockQty: increment(d.qtyDelta),
            ...(d.costPrice !== undefined ? { costPrice: d.costPrice } : {}),
          });
        }
        if (args.entry) postEntry(batch, args.entry);
        void batch.commit();
        return true;
      }
      const deltas = new Map(
        (args.productDeltas ?? []).map((d) => [d.productId, d])
      );
      if (deltas.size > 0) {
        setProducts((prev) =>
          prev.map((p) => {
            const d = deltas.get(p.id);
            if (!d) return p;
            return {
              ...p,
              stockQty: p.stockQty + d.qtyDelta,
              ...(d.costPrice !== undefined ? { costPrice: d.costPrice } : {}),
            };
          })
        );
      }
      setCols((prev) => {
        let levels = prev.stockLevels;
        for (const d of args.levelDeltas) {
          levels = applyLevelDelta(levels, d.warehouseId, d.productId, d.delta);
        }
        return {
          ...prev,
          productionOrders: prev.productionOrders.map((x) =>
            x.id === args.order.id ? args.order : x
          ),
          stockLevels: levels,
          journal: args.entry ? [...prev.journal, args.entry] : prev.journal,
        };
      });
      return true;
    },
    [cloudCtx, guardPostings, postEntry]
  );

  const createProductionOrder = useCallback(
    (input: NewProductionOrderInput): string | null => {
      if (!can(roleRef.current, "manufacturing", "write")) return null;
      const bom = colsRef.current.boms.find((b) => b.id === input.bomId);
      if (!bom) return null;
      if (!(input.plannedQty > 0)) return null;
      const warehouseId = productionWarehouseId(input.warehouseId);
      if (!warehouseId) return null;
      const output = productsRef.current.find((p) => p.id === bom.outputProductId);
      const order: ProductionOrder = {
        id: newId("prd"),
        number: null, // minted at open (§6.3)
        bomId: bom.id,
        bomVersion: bom.version,
        // The recipe is SNAPSHOTTED here (§4.2): later BOM
        // versions never re-cost this order.
        bomSnapshot: snapshotOfBom(bom),
        outputProductId: bom.outputProductId,
        outputName: output?.name ?? bom.outputName,
        warehouseId,
        plannedQty: input.plannedQty,
        events: [],
        note: input.note.trim(),
        status: "draft",
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      putDoc("productionOrders", order);
      return order.id;
    },
    [putDoc, productionWarehouseId]
  );

  const updateProductionOrder = useCallback(
    (
      id: string,
      patch: { plannedQty?: number; warehouseId?: string; note?: string }
    ): boolean => {
      if (!can(roleRef.current, "manufacturing", "write")) return false;
      const cur = colsRef.current.productionOrders.find((o) => o.id === id);
      if (!cur || cur.status !== "draft") return false; // drafts only (§4.2)
      if (patch.plannedQty !== undefined && !(patch.plannedQty > 0)) return false;
      let warehouseId = cur.warehouseId;
      if (patch.warehouseId !== undefined) {
        const resolved = productionWarehouseId(patch.warehouseId);
        if (!resolved) return false;
        warehouseId = resolved;
      }
      const next: ProductionOrder = {
        ...cur,
        plannedQty: patch.plannedQty ?? cur.plannedQty,
        warehouseId,
        note: patch.note !== undefined ? patch.note.trim() : cur.note,
      };
      putDoc("productionOrders", next);
      return true;
    },
    [putDoc, productionWarehouseId]
  );

  const openProductionOrder = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "manufacturing", "write")) return false;
      const cur = colsRef.current.productionOrders.find((o) => o.id === id);
      if (!cur || cur.status !== "draft") return false;
      const number =
        cur.number ??
        nextDocNumber(
          "productionOrder",
          colsRef.current.productionOrders.map((o) => o.number),
          settingsRef.current
        );
      const opened: ProductionOrder = { ...cur, number, status: "open" };
      putDoc("productionOrders", opened);
      return true;
    },
    [putDoc]
  );

  const deleteProductionOrder = useCallback(
    (id: string) => {
      if (!can(roleRef.current, "manufacturing", "write")) return;
      const cur = colsRef.current.productionOrders.find((o) => o.id === id);
      if (!cur || cur.status !== "draft") return; // drafts only
      removeDoc("productionOrders", id);
    },
    [removeDoc]
  );

  const cancelProductionOrder = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "manufacturing", "write")) return false;
      const cur = colsRef.current.productionOrders.find((o) => o.id === id);
      if (!cur) return false;
      if (cur.status !== "draft" && cur.status !== "open") return false;
      // An order WITH events must CLOSE instead (§4.2): its
      // residual pool has to leave WIP through the closeout
      // posting — a bare cancel would strand it there forever.
      if (cur.events.length > 0) return false;
      const cancelled: ProductionOrder = { ...cur, status: "cancelled" };
      putDoc("productionOrders", cancelled);
      return true;
    },
    [putDoc]
  );

  const issueProductionMaterials = useCallback(
    (id: string, input: ProductionIssueInput): boolean => {
      if (!can(roleRef.current, "manufacturing", "write")) return false;
      const cur = colsRef.current.productionOrders.find((o) => o.id === id);
      if (!cur) return false;
      // A first issue OPENS a draft (§6.3): its number mints in
      // the same batch as the issue itself, so the journal memo
      // and the event carry the number from birth.
      const working: ProductionOrder =
        cur.status === "draft"
          ? {
              ...cur,
              number:
                cur.number ??
                nextDocNumber(
                  "productionOrder",
                  colsRef.current.productionOrders.map((o) => o.number),
                  settingsRef.current
                ),
              status: "open",
            }
          : cur;
      // Validate + value + compose BEFORE any write (lib): a
      // refused issue (unknown component, insufficient stock at
      // the order warehouse, paid settlement with no account,
      // zero value) writes nothing at all.
      const result = prepareIssue(
        working,
        productsRef.current,
        levelsRef.current,
        warehousesRef.current,
        accountsRef.current,
        input
      );
      if ("problem" in result) return false;
      const { prepared } = result;
      const withEvent: ProductionOrder = {
        ...working,
        events: [...working.events, prepared.event],
      };
      const next: ProductionOrder = {
        ...withEvent,
        status: deriveProductionStatus(withEvent),
      };
      // The components' totals drop by exactly what left the
      // order warehouse's rows — the §1.3 mirror identity holds
      // by construction (§1.5).
      return commitProductionEvent({
        order: next,
        entry: prepared.entry,
        levelDeltas: prepared.lines.map((l) => ({
          warehouseId: cur.warehouseId,
          productId: l.productId,
          delta: -l.qty,
        })),
        productDeltas: prepared.lines.map((l) => ({
          productId: l.productId,
          qtyDelta: -l.qty,
        })),
      });
    },
    [commitProductionEvent]
  );

  const completeProduction = useCallback(
    (id: string, qty: number, opts?: { final?: boolean }): boolean => {
      if (!can(roleRef.current, "manufacturing", "write")) return false;
      const cur = colsRef.current.productionOrders.find((o) => o.id === id);
      if (!cur || cur.status !== "open") return false;
      // The finished units need a product to land ON: if the
      // output product was deleted mid-order there is nowhere
      // for them to go — refuse before composing anything.
      const output = productsRef.current.find((p) => p.id === cur.outputProductId);
      if (!output) return false;
      // Cumulative absorption with final-absorb (§4.2): the
      // value comes FROM the pool; an empty pool refuses —
      // the units' materials were never issued.
      const res = completionAbsorb(cur, qty, opts?.final ?? false);
      if ("problem" in res) return false;
      const entry = buildCompletionEntry(cur, qty, res.value);
      const event: ProductionEvent = {
        kind: "completion",
        qty,
        value: res.value,
        entryId: entry.id,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      const withEvent: ProductionOrder = {
        ...cur,
        events: [...cur.events, event],
      };
      const next: ProductionOrder = {
        ...withEvent,
        status: deriveProductionStatus(withEvent),
      };
      // The finished units land in the order warehouse's row
      // and the product total in the same batch, and the
      // product's shelf cost becomes the absorbed unit cost —
      // the latest-cost convention `recordPurchase` applies to
      // receipts (a completion IS a receipt of made goods).
      return commitProductionEvent({
        order: next,
        entry,
        levelDeltas: [
          { warehouseId: cur.warehouseId, productId: cur.outputProductId, delta: qty },
        ],
        productDeltas: [
          { productId: cur.outputProductId, qtyDelta: qty, costPrice: res.unitCost },
        ],
      });
    },
    [commitProductionEvent]
  );

  const scrapProduction = useCallback(
    (id: string, qty: number): boolean => {
      if (!can(roleRef.current, "manufacturing", "write")) return false;
      const cur = colsRef.current.productionOrders.find((o) => o.id === id);
      if (!cur || cur.status !== "open") return false;
      const res = scrapAbsorb(cur, qty);
      if ("problem" in res) return false;
      const entry = buildScrapEntry(cur, qty, res.value, "scrap");
      const event: ProductionEvent = {
        kind: "scrap",
        qty,
        value: res.value,
        entryId: entry.id,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      const withEvent: ProductionOrder = {
        ...cur,
        events: [...cur.events, event],
      };
      const next: ProductionOrder = {
        ...withEvent,
        status: deriveProductionStatus(withEvent),
      };
      // No stock rows move: spoiled units were never finished
      // stock (§4.2). Only the journal value leaves WIP.
      return commitProductionEvent({ order: next, entry, levelDeltas: [] });
    },
    [commitProductionEvent]
  );

  const closeProductionOrder = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "manufacturing", "write")) return false;
      const cur = colsRef.current.productionOrders.find((o) => o.id === id);
      if (!cur || cur.status !== "open") return false;
      // The landing label (§4.2): completed when anything was
      // produced, cancelled when nothing was.
      const status = producedQty(cur) > 0 ? "completed" : "cancelled";
      const pool = poolOf(cur);
      if (pool <= 0) {
        // Nothing left in WIP for this order — the close is a
        // bare status write and posts nothing.
        const closed: ProductionOrder = { ...cur, status };
        putDoc("productionOrders", closed);
        return true;
      }
      // The residual pool leaves WIP to `inventory_loss`
      // EXACTLY (the closeout event; its entry posts as
      // "production_scrap" per §6.4) — after this, the order's
      // pool is 0 and the §4.3 identity still holds.
      const entry = buildScrapEntry(cur, 0, pool, "closeout");
      const event: ProductionEvent = {
        kind: "closeout",
        qty: 0,
        value: pool,
        entryId: entry.id,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      const next: ProductionOrder = {
        ...cur,
        events: [...cur.events, event],
        status,
      };
      return commitProductionEvent({ order: next, entry, levelDeltas: [] });
    },
    [commitProductionEvent, putDoc]
  );

  /* ---------------- Phase C · C5: jobs / work orders ----------------
   * Design §5. A job's material events are its subledger; every
   * figure derives from them (lib/jobs). Card/stage actions gate
   * on the `jobTracker` matrix row (owner/manager write —
   * cashier/accountant read, G-C4: the pre-declared matrix
   * stands). Material events validate + value + compose through
   * lib/jobs BEFORE any write, and commit through
   * `commitJobMaterialEvent`: the job doc (events appended),
   * the stock rows and product totals the event moves, and its
   * ONE journal entry through the guarded choke point — one
   * batch / state update, so an event can never half-land.
   * Advances are deliberately NOT here: the job surface calls
   * the existing `addRepayment` with a job-citing note (§5.3),
   * so a job advance is an ordinary repayment in the customer's
   * pool — zero new money machinery (owner Q2). */

  /** A warehouse a job may be created against: the stamp when
   *  it names a live (non-archived) warehouse, else the shop
   *  default. A bad stamp refuses (null). */
  const jobWarehouseId = useCallback((stamp?: string | null): string | null => {
    const list = warehousesRef.current;
    if (stamp) {
      const w = list.find((x) => x.id === stamp);
      return w && !w.archived ? w.id : null;
    }
    return defaultWarehouseId(list);
  }, []);

  /** Shared dual-path writer for job material events: the job
   *  doc + its entry + the row/total movements land together.
   *  `guardPostings` runs BEFORE any write — a locked today
   *  refuses the event whole. The demo path applies the same
   *  applied deltas (issues/returns validate against the row
   *  first, so no clamping question arises). */
  const commitJobMaterialEvent = useCallback(
    (args: {
      job: Job;
      entry: JournalEntry;
      levelDeltas: Array<{ warehouseId: string; productId: string; delta: number }>;
      productDeltas: Array<{ productId: string; qtyDelta: number }>;
    }): boolean => {
      guardPostings(args.entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "jobs", args.job.id), { ...args.job });
        for (const d of args.levelDeltas) {
          batchLevelDelta(batch, ctx.db, ctx.uid, d.warehouseId, d.productId, d.delta);
        }
        for (const d of args.productDeltas) {
          batch.update(doc(ctx.db, "users", ctx.uid, "products", d.productId), {
            stockQty: increment(d.qtyDelta),
          });
        }
        postEntry(batch, args.entry);
        void batch.commit();
        return true;
      }
      const deltas = new Map(args.productDeltas.map((d) => [d.productId, d.qtyDelta]));
      if (deltas.size > 0) {
        setProducts((prev) =>
          prev.map((p) => {
            const d = deltas.get(p.id);
            return d ? { ...p, stockQty: p.stockQty + d } : p;
          })
        );
      }
      setCols((prev) => {
        let levels = prev.stockLevels;
        for (const d of args.levelDeltas) {
          levels = applyLevelDelta(levels, d.warehouseId, d.productId, d.delta);
        }
        return {
          ...prev,
          jobs: prev.jobs.map((x) => (x.id === args.job.id ? args.job : x)),
          stockLevels: levels,
          journal: [...prev.journal, args.entry],
        };
      });
      return true;
    },
    [cloudCtx, guardPostings, postEntry]
  );

  const createJob = useCallback(
    (input: NewJobInput): string | null => {
      if (!can(roleRef.current, "jobTracker", "write")) return null;
      const customerName = input.customerName.trim();
      const title = input.title.trim();
      if (!customerName || !title) return null;
      const warehouseId = jobWarehouseId(input.warehouseId);
      if (!warehouseId) return null;
      const stages = effectiveJobStages(settingsRef.current);
      const job: Job = {
        id: newId("job"),
        // Born numbered (§5.1/§6.3): the JB- number mints at
        // creation — the stated exception to the drafts-burn-
        // none rule, because a job has no draft state: the
        // customer walks away with this number on a slip.
        number: nextDocNumber(
          "job",
          colsRef.current.jobs.map((j) => j.number),
          settingsRef.current
        ),
        customerId: input.customerId,
        customerName,
        customerPhone: input.customerPhone.trim(),
        title,
        description: input.description.trim(),
        stage: stages[0],
        status: "open",
        dueDateISO: input.dueDateISO ? input.dueDateISO : null,
        warehouseId,
        materialEvents: [],
        labourCost: Math.max(0, input.labourCost ?? 0),
        note: input.note.trim(),
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      putDoc("jobs", job);
      return job.id;
    },
    [putDoc, jobWarehouseId]
  );

  const updateJob = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          Job,
          | "customerName"
          | "customerPhone"
          | "title"
          | "description"
          | "dueDateISO"
          | "warehouseId"
          | "labourCost"
          | "note"
        >
      >
    ): boolean => {
      if (!can(roleRef.current, "jobTracker", "write")) return false;
      const cur = colsRef.current.jobs.find((j) => j.id === id);
      if (!cur || cur.status === "cancelled") return false;
      let warehouseId = cur.warehouseId;
      if (patch.warehouseId !== undefined && patch.warehouseId !== cur.warehouseId) {
        // The warehouse may move only while nothing has been
        // issued: a return must land where its issue left from.
        if (cur.materialEvents.length > 0) return false;
        const resolved = jobWarehouseId(patch.warehouseId);
        if (!resolved) return false;
        warehouseId = resolved;
      }
      const next: Job = {
        ...cur,
        customerName:
          patch.customerName !== undefined ? patch.customerName.trim() : cur.customerName,
        customerPhone:
          patch.customerPhone !== undefined ? patch.customerPhone.trim() : cur.customerPhone,
        title: patch.title !== undefined ? patch.title.trim() : cur.title,
        description:
          patch.description !== undefined ? patch.description.trim() : cur.description,
        dueDateISO:
          patch.dueDateISO !== undefined ? patch.dueDateISO || null : cur.dueDateISO,
        warehouseId,
        labourCost:
          patch.labourCost !== undefined
            ? Math.max(0, patch.labourCost)
            : cur.labourCost,
        note: patch.note !== undefined ? patch.note.trim() : cur.note,
      };
      if (!next.customerName || !next.title) return false;
      putDoc("jobs", next);
      return true;
    },
    [putDoc, jobWarehouseId]
  );

  const setJobStage = useCallback(
    (id: string, stage: string): boolean => {
      if (!can(roleRef.current, "jobTracker", "write")) return false;
      const cur = colsRef.current.jobs.find((j) => j.id === id);
      if (!cur) return false;
      if (cur.status === "delivered" || cur.status === "cancelled") return false;
      const stages = effectiveJobStages(settingsRef.current);
      // The picker offers the current list PLUS the job's own
      // stage (§5.2: a renamed-away stage stays settable while
      // the job carries it).
      if (!stages.includes(stage) && stage !== cur.stage) return false;
      const moved: Job = { ...cur, stage };
      const next: Job = { ...moved, status: deriveJobStatus(moved, stages) };
      putDoc("jobs", next);
      return true;
    },
    [putDoc]
  );

  const deliverJob = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "jobTracker", "write")) return false;
      const cur = colsRef.current.jobs.find((j) => j.id === id);
      if (!cur || cur.status === "delivered" || cur.status === "cancelled") return false;
      const done: Job = { ...cur, status: "delivered" };
      putDoc("jobs", done);
      return true;
    },
    [putDoc]
  );

  const cancelJob = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "jobTracker", "write")) return false;
      const cur = colsRef.current.jobs.find((j) => j.id === id);
      if (!cur || cur.status === "delivered" || cur.status === "cancelled") return false;
      const dead: Job = { ...cur, status: "cancelled" };
      putDoc("jobs", dead);
      return true;
    },
    [putDoc]
  );

  const issueJobMaterials = useCallback(
    (id: string, picks: Array<{ productId: string; qty: number }>): boolean => {
      if (!can(roleRef.current, "jobTracker", "write")) return false;
      const cur = colsRef.current.jobs.find((j) => j.id === id);
      if (!cur) return false;
      const result = prepareMaterialEvent(
        cur,
        productsRef.current,
        levelsRef.current,
        warehousesRef.current,
        "issue",
        picks
      );
      if ("problem" in result) return false;
      const { prepared } = result;
      const next: Job = {
        ...cur,
        materialEvents: [...cur.materialEvents, ...prepared.events],
      };
      // The issued quantities leave the job warehouse's rows
      // and the product totals together — the §1.3 mirror
      // identity holds by construction (§1.5).
      return commitJobMaterialEvent({
        job: next,
        entry: prepared.entry,
        levelDeltas: prepared.lines.map((l) => ({
          warehouseId: cur.warehouseId,
          productId: l.productId,
          delta: -l.qty,
        })),
        productDeltas: prepared.lines.map((l) => ({
          productId: l.productId,
          qtyDelta: -l.qty,
        })),
      });
    },
    [commitJobMaterialEvent]
  );

  const returnJobMaterials = useCallback(
    (id: string, picks: Array<{ productId: string; qty: number }>): boolean => {
      if (!can(roleRef.current, "jobTracker", "write")) return false;
      const cur = colsRef.current.jobs.find((j) => j.id === id);
      if (!cur) return false;
      const result = prepareMaterialEvent(
        cur,
        productsRef.current,
        levelsRef.current,
        warehousesRef.current,
        "return",
        picks
      );
      if ("problem" in result) return false;
      const { prepared } = result;
      const next: Job = {
        ...cur,
        materialEvents: [...cur.materialEvents, ...prepared.events],
      };
      // The mirror of the issue: rows + totals restore at the
      // job's warehouse in the same batch as the entry.
      return commitJobMaterialEvent({
        job: next,
        entry: prepared.entry,
        levelDeltas: prepared.lines.map((l) => ({
          warehouseId: cur.warehouseId,
          productId: l.productId,
          delta: l.qty,
        })),
        productDeltas: prepared.lines.map((l) => ({
          productId: l.productId,
          qtyDelta: l.qty,
        })),
      });
    },
    [commitJobMaterialEvent]
  );

  const convertJobToBill = useCallback(
    (id: string): boolean => {
      // G-C3: "Bill this job" keeps the BILLING row's gate —
      // the job surface composes per-action gates, no row
      // changes.
      if (!can(roleRef.current, "billing", "write")) return false;
      const job = colsRef.current.jobs.find((j) => j.id === id);
      if (!job || job.status === "delivered" || job.status === "cancelled") {
        return false;
      }
      // §5.4: the desk opens prefilled with the job's customer
      // and citing the job — and with NO lines: the desk
      // composes the charge lines freely (the deliverable at
      // the agreed price). Materials already issued to the job
      // are listed at the desk (R-C7) so they are never billed
      // twice. This writes NOTHING — the bill posts only when
      // the desk completes it through postBill, which flips
      // the job to delivered in its own batch.
      setBillDraft({
        sourceType: "job",
        sourceId: job.id,
        sourceLabel: job.number,
        customerId: job.customerId,
        customerName: job.customerName,
        customerPhone: job.customerPhone,
        discountType: "flat",
        discountValue: 0,
        lines: [],
        warehouseId: job.warehouseId,
      });
      return true;
    },
    []
  );

  /* ---------------- employees & attendance (Phase D · D1) ----------------
   * Design §1: the directory (identity + current terms) and the
   * attendance register (time). NEITHER posts anything — there is
   * no journal write, no money movement and no period-lock
   * interplay in this whole section (§7: attendance and drafts
   * ignore locks, they assert no money fact). All actions gate on
   * the `staffDirectory` matrix row (owner/manager write; the
   * accountant reads; the cashier never reaches the surface —
   * G-D1: the matrix stands as the owner approved it in A3). */
  const addEmployee = useCallback(
    (input: NewEmployeeInput): string | null => {
      if (!can(roleRef.current, "staffDirectory", "write")) return null;
      const name = input.name.trim();
      if (!name) return null;
      const emp: Employee = {
        id: newId("emp"),
        name,
        phone: input.phone.trim(),
        designation: input.designation.trim(),
        linkedUserEmail: input.linkedUserEmail?.trim()
          ? input.linkedUserEmail.trim().toLowerCase()
          : null,
        joinDateISO: input.joinDateISO ?? null,
        payBasis: input.payBasis === "daily" ? "daily" : "monthly",
        baseAmount: Math.max(0, input.baseAmount || 0),
        allowances: (input.allowances ?? [])
          .map((a) => ({ label: a.label.trim(), amount: Math.max(0, a.amount || 0) }))
          .filter((a) => a.label !== "" || a.amount > 0),
        paidLeaveDays: Math.max(0, Math.floor(input.paidLeaveDays || 0)),
        active: true,
        note: input.note.trim(),
        ts: new Date().toISOString(),
      };
      putDoc("employees", emp);
      return emp.id;
    },
    [putDoc]
  );

  const updateEmployee = useCallback(
    (id: string, patch: Partial<Employee>): boolean => {
      if (!can(roleRef.current, "staffDirectory", "write")) return false;
      const cur = colsRef.current.employees.find((e) => e.id === id);
      if (!cur) return false;
      const next: Employee = {
        ...cur,
        ...(patch.name !== undefined
          ? { name: patch.name.trim() || cur.name }
          : {}),
        ...(patch.phone !== undefined ? { phone: patch.phone.trim() } : {}),
        ...(patch.designation !== undefined
          ? { designation: patch.designation.trim() }
          : {}),
        ...(patch.linkedUserEmail !== undefined
          ? {
              linkedUserEmail: patch.linkedUserEmail?.trim()
                ? patch.linkedUserEmail.trim().toLowerCase()
                : null,
            }
          : {}),
        ...(patch.joinDateISO !== undefined
          ? { joinDateISO: patch.joinDateISO }
          : {}),
        ...(patch.payBasis !== undefined
          ? { payBasis: patch.payBasis === "daily" ? ("daily" as const) : ("monthly" as const) }
          : {}),
        ...(patch.baseAmount !== undefined
          ? { baseAmount: Math.max(0, patch.baseAmount || 0) }
          : {}),
        ...(patch.allowances !== undefined
          ? {
              allowances: patch.allowances
                .map((a) => ({
                  label: a.label.trim(),
                  amount: Math.max(0, a.amount || 0),
                }))
                .filter((a) => a.label !== "" || a.amount > 0),
            }
          : {}),
        ...(patch.paidLeaveDays !== undefined
          ? { paidLeaveDays: Math.max(0, Math.floor(patch.paidLeaveDays || 0)) }
          : {}),
        ...(patch.active !== undefined ? { active: patch.active } : {}),
        ...(patch.note !== undefined ? { note: patch.note.trim() } : {}),
      };
      putDoc("employees", next);
      return true;
    },
    [putDoc]
  );

  const deleteEmployee = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "staffDirectory", "write")) return false;
      const cur = colsRef.current.employees.find((e) => e.id === id);
      if (!cur) return false;
      // §1.5: an employee with ANY record citing them is
      // archive-only — the same "any record cites them" test the
      // warehouse rule uses. The citations: an attendance doc,
      // a payroll run line, a loan's party link, or a journal
      // line carrying their ref (D2/D3 make the last three
      // reachable; the test already covers them).
      const cited =
        colsRef.current.attendance.some((a) => a.employeeId === id) ||
        colsRef.current.payrollRuns.some((r) =>
          r.lines.some((l) => l.employeeId === id)
        ) ||
        colsRef.current.loans.some((l) => l.partyId === id) ||
        colsRef.current.journal.some((e) =>
          e.lines.some((l) => (l.ref ?? null) === id)
        );
      if (cited) return false;
      removeDoc("employees", id);
      return true;
    },
    [putDoc, removeDoc]
  );

  const setAttendanceMark = useCallback(
    (
      employeeId: string,
      month: string,
      day: number,
      mark: AttendanceMark | null
    ): boolean => {
      if (!can(roleRef.current, "staffDirectory", "write")) return false;
      if (!colsRef.current.employees.some((e) => e.id === employeeId)) {
        return false;
      }
      if (!/^\d{4}-\d{2}$/.test(month) || day < 1 || day > 31) return false;
      const id = attendanceDocId(employeeId, month);
      const cur = colsRef.current.attendance.find((a) => a.id === id);
      const days: Record<string, AttendanceMark> = { ...(cur?.days ?? {}) };
      if (mark === null) delete days[String(day)];
      else days[String(day)] = mark;
      const nextDoc: AttendanceMonth = {
        id,
        employeeId,
        month,
        days,
        ts: cur?.ts ?? new Date().toISOString(),
      };
      putDoc("attendance", nextDoc);
      return true;
    },
    [putDoc]
  );

  /* ---------------- payroll (Phase D · D2) ----------------
   * Design §2: runs compose from the directory + register (draft,
   * nothing posts), finalise posts the ONE net accrual entry,
   * payments and advances post their own entries — every one
   * through the A5 choke point in the SAME batch as its run doc
   * (the cheque-lifecycle dual-path pattern). All actions gate
   * on the `payroll` matrix row: owner/accountant write, the
   * manager reads (G-D2), the cashier never reaches the tab.
   * Corrections are reversals (§2.6): a posted run's accrual is
   * mirrored, a payment is mirrored by a negative event — the
   * journal and the events diary are both append-only. */

  /** Shared dual-path writer: run doc + its entries, one batch. */
  const commitPayroll = useCallback(
    (run: PayrollRun, entries: JournalEntry[]): void => {
      guardPostings(...entries); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "payrollRuns", run.id), { ...run });
        for (const e of entries) postEntry(batch, e);
        void batch.commit();
        return;
      }
      setCols((prev) => ({
        ...prev,
        payrollRuns: prev.payrollRuns.some((r) => r.id === run.id)
          ? prev.payrollRuns.map((r) => (r.id === run.id ? run : r))
          : [...prev.payrollRuns, run],
        journal: [...prev.journal, ...entries],
      }));
    },
    [cloudCtx, guardPostings, postEntry]
  );

  const composePayrollRun = useCallback(
    (month: string): string | null => {
      if (!can(roleRef.current, "payroll", "write")) return null;
      if (!/^\d{4}-\d{2}$/.test(month)) return null;
      const existing = colsRef.current.payrollRuns.find(
        (r) => r.month === month && r.status === "draft"
      );
      if (existing) return existing.id;
      const lines = buildRunLines(
        colsRef.current.employees,
        colsRef.current.attendance,
        month
      );
      const run: PayrollRun = {
        id: newId("run"),
        number: null,
        month,
        lines,
        totals: payrollRunTotals(lines),
        payments: [],
        accrualEntryId: null,
        status: "draft",
        note: "",
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      putDoc("payrollRuns", run);
      return run.id;
    },
    [putDoc]
  );

  const updatePayrollRun = useCallback(
    (id: string, lines: PayrollRunLine[], note: string): boolean => {
      if (!can(roleRef.current, "payroll", "write")) return false;
      const cur = colsRef.current.payrollRuns.find((r) => r.id === id);
      if (!cur || cur.status !== "draft") return false;
      const clean = lines.map((l) => payrollLineTotals(l));
      const next: PayrollRun = {
        ...cur,
        lines: clean,
        totals: payrollRunTotals(clean),
        note,
      };
      putDoc("payrollRuns", next);
      return true;
    },
    [putDoc]
  );

  const deletePayrollRun = useCallback(
    (id: string): boolean => {
      // Rules mirror: payrollRuns delete is owner-only, and the
      // store additionally enforces drafts-only (§6.2).
      if (roleRef.current !== "owner") return false;
      const cur = colsRef.current.payrollRuns.find((r) => r.id === id);
      if (!cur || cur.status !== "draft") return false;
      removeDoc("payrollRuns", id);
      return true;
    },
    [removeDoc]
  );

  const finalisePayrollRun = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "payroll", "write")) return false;
      const cur = colsRef.current.payrollRuns.find((r) => r.id === id);
      if (!cur || cur.status !== "draft") return false;
      // §2.3's one-posted-run-per-month guard — a second accrual
      // for a month would double the expense; corrections go
      // through §2.6's reversal, never a parallel run.
      if (
        colsRef.current.payrollRuns.some(
          (r) => r.id !== id && r.month === cur.month && r.status === "posted"
        )
      ) {
        return false;
      }
      const number = nextDocNumber(
        "payrollRun",
        colsRef.current.payrollRuns.map((r) => r.number),
        settingsRef.current
      );
      const stamped: PayrollRun = {
        ...cur,
        number,
        totals: payrollRunTotals(cur.lines),
      };
      const entry = buildPayrollAccrualEntry(stamped);
      if (!entry) return false; // no line accrues anything — nothing to post
      commitPayroll(
        { ...stamped, status: "posted", accrualEntryId: entry.id },
        [entry]
      );
      return true;
    },
    [commitPayroll]
  );

  const payPayrollEmployee = useCallback(
    (
      runId: string,
      input: {
        employeeId: string | null;
        amount: number;
        method: PayMethod;
        accountId?: string | null;
      }
    ): boolean => {
      if (!can(roleRef.current, "payroll", "write")) return false;
      if (input.method === "credit") return false; // money methods only (§2.3)
      const amount = Math.round((input.amount + Number.EPSILON) * 100) / 100;
      if (!Number.isFinite(amount) || !(amount > 0)) return false;
      const cur = colsRef.current.payrollRuns.find((r) => r.id === runId);
      if (!cur || cur.status !== "posted") return false;
      let name: string;
      let cap: number;
      if (input.employeeId === null) {
        // §2.2: settling the unassigned production bucket — the
        // cap is the bucket's derived balance; no employee's
        // position moves.
        cap = salaryPayableComposition(journalRef.current).unassignedAccrued;
        name = "Production labour";
      } else {
        const line = cur.lines.find((l) => l.employeeId === input.employeeId);
        if (!line) return false;
        cap = line.netAccrued - paidForRun(cur, input.employeeId);
        name = line.name;
      }
      if (amount > cap + 0.001) return false;
      const accountId = resolveAccountId(input.method, input.accountId);
      const entry = buildPayrollPaymentEntry({
        run: cur,
        employeeId: input.employeeId,
        name,
        amount,
        method: input.method,
        accountId,
      });
      const event: PayrollPaymentEvent = {
        employeeId: input.employeeId,
        name,
        amount,
        method: input.method,
        accountId,
        entryId: entry.id,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      commitPayroll({ ...cur, payments: [...cur.payments, event] }, [entry]);
      return true;
    },
    [commitPayroll, resolveAccountId]
  );

  const reversePayrollPayment = useCallback(
    (runId: string, entryId: string): boolean => {
      if (!can(roleRef.current, "payroll", "write")) return false;
      const cur = colsRef.current.payrollRuns.find((r) => r.id === runId);
      if (!cur || cur.status !== "posted") return false;
      const ev = cur.payments.find((p) => p.entryId === entryId);
      if (!ev || !(ev.amount > 0)) return false;
      const journal = journalRef.current;
      // Append-only on both sides: an already-mirrored payment
      // refuses (its mirror entry cites it via reversesId).
      if (journal.some((e) => e.reversesId === entryId)) return false;
      const original = journal.find((e) => e.id === entryId);
      if (!original) return false;
      const mirror = buildMirrorEntry(
        original,
        `Salary payment reversal — ${ev.name}`
      );
      const event: PayrollPaymentEvent = {
        ...ev,
        amount: -ev.amount,
        entryId: mirror.id,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      commitPayroll({ ...cur, payments: [...cur.payments, event] }, [mirror]);
      return true;
    },
    [commitPayroll]
  );

  const reversePayrollRun = useCallback(
    (id: string): boolean => {
      if (!can(roleRef.current, "payroll", "write")) return false;
      const cur = colsRef.current.payrollRuns.find((r) => r.id === id);
      if (!cur || cur.status !== "posted" || !cur.accrualEntryId) return false;
      const journal = journalRef.current;
      const original = journal.find((e) => e.id === cur.accrualEntryId);
      if (!original) return false;
      if (journal.some((e) => e.reversesId === original.id)) return false;
      const mirror = buildMirrorEntry(
        original,
        cur.number
          ? `Payroll reversal ${cur.number} — ${cur.month}`
          : `Payroll reversal — ${cur.month}`
      );
      // §2.6: payments already made STAND (real money moved) —
      // they now sit as advance positions, absorbed by §2.2's
      // derivation; only the accrual is mirrored here.
      commitPayroll({ ...cur, status: "reversed" }, [mirror]);
      return true;
    },
    [commitPayroll]
  );

  const giveSalaryAdvance = useCallback(
    (input: {
      employeeId: string;
      amount: number;
      method: PayMethod;
      accountId?: string | null;
    }): string | null => {
      if (!can(roleRef.current, "payroll", "write")) return null;
      if (input.method === "credit") return null;
      const amount = Math.round((input.amount + Number.EPSILON) * 100) / 100;
      if (!Number.isFinite(amount) || !(amount > 0)) return null;
      const emp = colsRef.current.employees.find((e) => e.id === input.employeeId);
      if (!emp) return null;
      const accountId = resolveAccountId(input.method, input.accountId);
      const entry = buildSalaryAdvanceEntry({
        employeeId: emp.id,
        name: emp.name,
        amount,
        method: input.method,
        accountId,
      });
      guardPostings(entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        postEntry(batch, entry);
        void batch.commit();
        return entry.id;
      }
      appendJournalDemo(entry);
      return entry.id;
    },
    [cloudCtx, guardPostings, postEntry, appendJournalDemo, resolveAccountId]
  );

  const saveDayClose = useCallback(
    (d: Omit<DayClose, "id" | "ts" | "dayOffset">) => {
      if (!can(roleRef.current, "dayClose", "write")) return; // A3 guard
      const row: DayClose = { ...d, id: newId("dc"), dayOffset: 0, ts: new Date().toISOString() };
      putDoc("dayCloses", row);
    },
    [putDoc]
  );

  /* ---------------- settings & staff ---------------- */
  const updateSettings = useCallback(
    (patch: Partial<ShopSettings>) => {
      const { staffEmails: _omit, staff: _omitStaff, ...rest } = patch;
      const ctx = cloudCtx();
      if (ctx) {
        if (!can(roleRef.current, "settingsProfile", "write")) return; // owner-only (rules enforce too)
        void setDoc(doc(ctx.db, "users", ctx.uid), rest, { merge: true });
        return;
      }
      setCols((prev) => ({ ...prev, settings: { ...prev.settings, ...rest } }));
    },
    [cloudCtx]
  );

  /**
   * A3 staff management (design §3.1). Every change writes THREE
   * places in ONE batch: the owner doc's `staff[]` (management
   * record), the `staffEmails` mirror (the currently-published rules
   * and older clients resolve through it), and `staffIndex/{email}`
   * (the doc rules v3 read the role from). Removal deletes the index
   * doc and both lists together — revocation stays instant.
   * Owner-only: the store refuses for every staff role, and the
   * owner doc + staffIndex rules refuse server-side as well.
   */
  const addStaff = useCallback(
    (emailRaw: string, staffRole: StaffRole) => {
      if (!can(roleRef.current, "staffManage", "write")) return;
      const email = emailRaw.trim().toLowerCase();
      if (!email) return;
      const cur = settingsRef.current;
      if (cur.staffEmails.includes(email)) return;
      const member: StaffMember = {
        email,
        role: staffRole,
        addedAt: new Date().toISOString(),
      };
      const staff = [...(cur.staff ?? []).filter((m) => m.email !== email), member];
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.update(doc(ctx.db, "users", ctx.uid), {
          staffEmails: arrayUnion(email),
          staff,
        });
        batch.set(doc(ctx.db, "staffIndex", email), {
          ownerUid: ctx.uid,
          email,
          addedAt: member.addedAt,
          role: staffRole,
        });
        void batch.commit();
        return;
      }
      setCols((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          staffEmails: [...prev.settings.staffEmails, email],
          staff,
        },
      }));
    },
    [cloudCtx]
  );

  const setStaffRole = useCallback(
    (emailRaw: string, staffRole: StaffRole) => {
      if (!can(roleRef.current, "staffManage", "write")) return;
      const email = emailRaw.trim().toLowerCase();
      const cur = settingsRef.current;
      const staff = (cur.staff ?? []).map((m) =>
        m.email === email ? { ...m, role: staffRole } : m
      );
      if (!staff.some((m) => m.email === email)) return;
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.update(doc(ctx.db, "users", ctx.uid), { staff });
        batch.set(
          doc(ctx.db, "staffIndex", email),
          { ownerUid: ctx.uid, email, role: staffRole },
          { merge: true }
        );
        void batch.commit();
        return;
      }
      setCols((prev) => ({ ...prev, settings: { ...prev.settings, staff } }));
    },
    [cloudCtx]
  );

  const removeStaff = useCallback(
    (emailRaw: string) => {
      if (!can(roleRef.current, "staffManage", "write")) return;
      const email = emailRaw.trim().toLowerCase();
      const staff = (settingsRef.current.staff ?? []).filter((m) => m.email !== email);
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.update(doc(ctx.db, "users", ctx.uid), {
          staffEmails: arrayRemove(email),
          staff,
        });
        batch.delete(doc(ctx.db, "staffIndex", email));
        void batch.commit();
        return;
      }
      setCols((prev) => ({
        ...prev,
        settings: {
          ...prev.settings,
          staffEmails: prev.settings.staffEmails.filter((e) => e !== email),
          staff,
        },
      }));
    },
    [cloudCtx]
  );

  /* ---------------- bulk import ---------------- */
  const importProducts = useCallback(
    (list: NewProduct[]) => {
      if (!can(roleRef.current, "inventoryManage", "write")) return; // A3 guard
      const made: Product[] = list.map((p, i) => ({
        ...p,
        id: `p-${Date.now().toString(36)}-${i}`,
        keywords: [p.name.toLowerCase(), p.sku.toLowerCase(), p.urduName],
        expiryDate: p.expiryDate ?? null,
        taxSlabId: p.taxSlabId ?? null,
        taxExempt: p.taxExempt ?? false,
        // C3: the stock class, normalised as in addProduct.
        stockClass: p.stockClass === "raw" ? ("raw" as const) : null,
      }));
      // F-4(c): imported opening stock enters through the ledger as
      // ONE aggregate entry (Dr Inventory / Cr Owner capital) — the
      // import is bulk master data, so the entry documents the total
      // value brought in rather than one posting per row.
      // Phase C · C3 (§4.1): the aggregate debit splits by class —
      // imported raw materials land in `inventory_raw`. The made
      // products' class is normalised here just as addProduct
      // normalises it (the CSV's optional `stockClass` column).
      const openingTotal = made.reduce((a, p) => a + p.stockQty * p.costPrice, 0);
      const rawOpeningShare = made.reduce(
        (a, p) => a + (p.stockClass === "raw" ? p.stockQty * p.costPrice : 0),
        0
      );
      const entry =
        openingTotal > 0
          ? makeEntry(
              `Opening stock — CSV import (${made.length} products)`,
              "adjustment",
              null,
              [
                ...classLegLines(openingTotal, rawOpeningShare, "debit"),
                { account: "capital", debit: 0, credit: openingTotal },
              ]
            )
          : null;
      // Phase C · C1: imported stock lands at the shop DEFAULT
      // warehouse — one row per product, riding the same batches.
      const defWh = defaultWarehouseId(warehousesRef.current);
      const openingLevels: StockLevel[] = made.map((p) => makeLevel(defWh, p.id, p.stockQty));
      guardPostings(entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        void (async () => {
          // Chunked at 200 products: each now writes TWO docs
          // (product + stock row), under Firestore's 500/batch cap.
          for (let i = 0; i < made.length; i += 200) {
            const batch = writeBatch(ctx.db);
            for (const prod of made.slice(i, i + 200)) {
              batch.set(doc(ctx.db, "users", ctx.uid, "products", prod.id), { ...prod });
            }
            for (const l of openingLevels.slice(i, i + 200)) {
              batch.set(doc(ctx.db, "users", ctx.uid, "stockLevels", l.id), { ...l });
            }
            if (i === 0 && entry) postEntry(batch, entry);
            await batch.commit();
          }
        })();
        return;
      }
      setProducts((prev) => [...prev, ...made]);
      setCols((prev) => ({ ...prev, stockLevels: [...prev.stockLevels, ...openingLevels] }));
      if (entry) appendJournalDemo(entry);
    },
    [cloudCtx, appendJournalDemo]
  );

  /* ---------------- reset (DEMO MODE ONLY) ---------------- */
  const resetDemo = useCallback(() => {
    // F-10: in production the journal and sales collections are
    // append-only BY RULES — their deletes are denied — so a "reset"
    // could only half-fire (wiping products, then aborting on the
    // first sales batch) and strand the shop. Reset is a demo
    // convenience; in production it is refused outright, atomically,
    // before anything is touched. (Settings hides it there too.)
    if (cloudCtx()) return;
    if (roleRef.current !== "owner") return; // A3: reset is owner-only even in demo
    const seeded = seedCollections();
    setProducts(demoSeedProducts());
    setSales(getSeedSales());
    setCols(seeded);
  }, [cloudCtx]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      products,
      sales,
      ...cols,
      role,
      isStaff,
      addProduct,
      updateProduct,
      deleteProduct,
      adjustStock,
      recordSale,
      resetDemo,
      createBill,
      holdBill,
      finalizeBill,
      discardHeldBill,
      voidBill,
      returnItems,
      returnItemsWithNote,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      recordPurchase,
      recordPurchaseReturn,
      recordSupplierPayment,
      createPurchaseOrder,
      updatePurchaseOrder,
      deletePurchaseOrder,
      issuePurchaseOrder,
      cancelPurchaseOrder,
      receiveAgainstPo,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addCredit,
      addRepayment,
      depositCheque,
      clearCheque,
      bounceCheque,
      returnCheque,
      addExpense,
      updateExpense,
      deleteExpense,
      addCashEntry,
      addMoneyAccount,
      renameMoneyAccount,
      archiveMoneyAccount,
      setDefaultMoneyAccount,
      transferFunds,
      addTaxSlab,
      updateTaxSlab,
      deleteTaxSlab,
      setTaxDefault,
      recordTaxPayment,
      closePeriod,
      reopenPeriod,
      createQuotation,
      updateQuotation,
      deleteQuotation,
      issueQuotation,
      decideQuotation,
      cancelQuotation,
      convertQuotationToOrder,
      createSaleOrder,
      updateSaleOrder,
      deleteSaleOrder,
      confirmSaleOrder,
      cancelSaleOrder,
      convertOrderToBill,
      createChallan,
      updateChallan,
      deleteChallan,
      dispatchChallan,
      cancelChallan,
      convertOrderToChallan,
      convertChallanToBill,
      convertQuotationToBill,
      billDraft,
      clearBillDraft,
      addWarehouse,
      updateWarehouse,
      setDefaultWarehouse,
      recountStockLevels,
      createStockTransfer,
      updateStockTransfer,
      deleteStockTransfer,
      cancelStockTransfer,
      dispatchStockTransfer,
      receiveStockTransfer,
      closeStockTransfer,
      returnStockTransfer,
      saveBomVersion,
      createProductionOrder,
      updateProductionOrder,
      openProductionOrder,
      deleteProductionOrder,
      cancelProductionOrder,
      issueProductionMaterials,
      completeProduction,
      scrapProduction,
      closeProductionOrder,
      createJob,
      updateJob,
      setJobStage,
      deliverJob,
      cancelJob,
      issueJobMaterials,
      returnJobMaterials,
      convertJobToBill,
      addEmployee,
      updateEmployee,
      deleteEmployee,
      setAttendanceMark,
      composePayrollRun,
      updatePayrollRun,
      deletePayrollRun,
      finalisePayrollRun,
      payPayrollEmployee,
      reversePayrollPayment,
      reversePayrollRun,
      giveSalaryAdvance,
      recordAdjustment,
      saveDayClose,
      updateSettings,
      addStaff,
      setStaffRole,
      removeStaff,
      importProducts,
    }),
    [
      ready, products, sales, cols, role, isStaff,
      addProduct, updateProduct, deleteProduct, adjustStock, recordSale, resetDemo,
      createBill, holdBill, finalizeBill, discardHeldBill, voidBill, returnItems,
      returnItemsWithNote,
      addSupplier, updateSupplier, deleteSupplier, recordPurchase, recordPurchaseReturn, recordSupplierPayment,
      createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
      issuePurchaseOrder, cancelPurchaseOrder, receiveAgainstPo,
      addCustomer, updateCustomer, deleteCustomer, addCredit, addRepayment,
      depositCheque, clearCheque, bounceCheque, returnCheque,
      addExpense, updateExpense, deleteExpense, addCashEntry,
      addMoneyAccount, renameMoneyAccount, archiveMoneyAccount,
      setDefaultMoneyAccount, transferFunds,
      addTaxSlab, updateTaxSlab, deleteTaxSlab, setTaxDefault, recordTaxPayment,
      closePeriod, reopenPeriod,
      createQuotation, updateQuotation, deleteQuotation, issueQuotation,
      decideQuotation, cancelQuotation, convertQuotationToOrder,
      createSaleOrder, updateSaleOrder, deleteSaleOrder, confirmSaleOrder,
      cancelSaleOrder, convertOrderToBill,
      createChallan, updateChallan, deleteChallan, dispatchChallan,
      cancelChallan, convertOrderToChallan, convertChallanToBill,
      convertQuotationToBill,
      billDraft, clearBillDraft,
      addWarehouse, updateWarehouse, setDefaultWarehouse, recountStockLevels,
      createStockTransfer, updateStockTransfer, deleteStockTransfer,
      cancelStockTransfer, dispatchStockTransfer, receiveStockTransfer,
      closeStockTransfer, returnStockTransfer, saveBomVersion,
      createProductionOrder, updateProductionOrder, openProductionOrder,
      deleteProductionOrder, cancelProductionOrder, issueProductionMaterials,
      completeProduction, scrapProduction, closeProductionOrder,
      createJob, updateJob, setJobStage, deliverJob, cancelJob,
      issueJobMaterials, returnJobMaterials, convertJobToBill,
      addEmployee, updateEmployee, deleteEmployee, setAttendanceMark,
      composePayrollRun, updatePayrollRun, deletePayrollRun, finalisePayrollRun,
      payPayrollEmployee, reversePayrollPayment, reversePayrollRun, giveSalaryAdvance,
      recordAdjustment, saveDayClose, updateSettings, addStaff, setStaffRole, removeStaff, importProducts,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/* ---------------- seeding (module scope) ---------------- */

/** Write the full bundled seed into a fresh `users/{uid}` namespace. */
async function seedNamespace(db: Firestore, uid: string, email: string | null) {
  const cols = seedCollections();
  const products = getSeedProducts();
  const sales = getSeedSales();
  const settings = getSeedSettings();
  const docs: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];
  const push = (name: string, items: Array<{ id: string }>) => {
    for (const it of items) {
      docs.push({ ref: doc(db, "users", uid, name, it.id), data: { ...it } });
    }
  };
  push("products", products);
  push("sales", sales);
  push("bills", cols.bills);
  push("suppliers", cols.suppliers);
  push("purchases", cols.purchases);
  push("supplierPayments", cols.supplierPayments);
  push("expenses", cols.expenses);
  push("credits", cols.credits);
  push("customers", cols.customers);
  push("returns", cols.returns);
  push("adjustments", cols.adjustments);
  push("dayCloses", cols.dayCloses);
  push("cashEntries", cols.cashEntries);
  push("journal", cols.journal);
  push("accounts", cols.accounts);
  push("taxSlabs", cols.taxSlabs);
  // Phase C · C1: a fresh shop is born MIGRATED — the default
  // warehouse plus complete stock rows at the seed totals (§10.1).
  // The Godown is demo flavour only (production shops add their
  // own second warehouse from the management surface).
  push("warehouses", cols.warehouses.filter((w) => w.id === DEFAULT_WAREHOUSE_ID));
  push("stockLevels", cols.stockLevels);
  // Phase B · B1/B2: `quotations` / `saleOrders` / `deliveryChallans`
  // are deliberately NOT pushed — a production shop's document
  // collections start EMPTY (the demo discoverability documents
  // live only in demo mode's seedCollections; design §10). Absent
  // collections subscribe as empty lists, exactly as every Phase A
  // collection began.
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    for (const d of docs.slice(i, i + 450)) batch.set(d.ref, d.data);
    await batch.commit();
  }
  await setDoc(doc(db, "users", uid), {
    email,
    seededAt: new Date().toISOString(),
    seedV2: true,
    // Fresh shops are born with the Phase A accounts in place and
    // an (empty) RBAC staff record — both migration steps are no-ops.
    // A4: the sample slab (inactive, §2.5) is seeded above; tax
    // defaults are null, so the tax step is a no-op too.
    // A5: fiscal defaults (PK fiscal year, 1 July) + no lock, so
    // the periods step is likewise a no-op for fresh shops.
    phaseA: { accountsV1: true, rbacV1: true, taxV1: true, periodsV1: true },
    // C1: born migrated (warehouse + rows pushed above).
    phaseC: { stockV1: true },
    // D1: born migrated — the hrV1 step writes no data (§10.1);
    // the HR collections start empty for a fresh shop too.
    phaseD: { hrV1: true },
    defaultSalesTaxSlabId: null,
    defaultPurchaseTaxSlabId: null,
    fiscalYearStartMonth: 7,
    fiscalYearStartDay: 1,
    lockedThrough: "",
    shopName: settings.shopName,
    address: settings.address,
    phone: settings.phone,
    staffEmails: settings.staffEmails,
    staff: [],
  });
}

/** Top up a PRE-Complete-edition namespace: write only the new
 *  collections' seeds plus ONE go-live opening-balance journal entry
 *  (F-14), then flag seedV2. Live products/sales are untouched. No
 *  sales history is summarised into the journal — the old path valued
 *  historical COGS at today's costs; the opening entry (inventory at
 *  current shelf value, receivables/payables from the subledgers,
 *  balance to Owner Capital) is the shop's documented go-live
 *  position instead — see PRODUCTION.md. */
async function topUpNamespace(db: Firestore, uid: string) {
  const [prodSnap] = await Promise.all([
    getDocs(collection(db, "users", uid, "products")),
  ]);
  const products = prodSnap.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as Product);
  const cols = seedCollections();
  const opening = getTopUpOpeningEntry(
    products,
    cols.credits,
    cols.purchases,
    cols.supplierPayments
  );
  const docs: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [];
  const push = (name: string, items: Array<{ id: string }>) => {
    for (const it of items) docs.push({ ref: doc(db, "users", uid, name, it.id), data: { ...it } });
  };
  push("suppliers", cols.suppliers);
  push("purchases", cols.purchases);
  push("supplierPayments", cols.supplierPayments);
  push("expenses", cols.expenses);
  push("credits", cols.credits);
  push("customers", cols.customers);
  push("journal", opening ? [opening] : []);
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    for (const d of docs.slice(i, i + 450)) batch.set(d.ref, d.data);
    await batch.commit();
  }
  const settings = getSeedSettings();
  await setDoc(
    doc(db, "users", uid),
    {
      seedV2: true,
      shopName: settings.shopName,
      address: settings.address,
      phone: settings.phone,
      staffEmails: settings.staffEmails,
    },
    { merge: true }
  );
}

/**
 * Phase A · A2 migration step `accountsV1` (design §6.1): create the
 * five default money accounts with FIXED doc ids (idempotent — a
 * re-run writes the same docs) and flag the step on the owner doc.
 * Writes NO journal entries: every historical line carries
 * `ref == null` and resolves to Main Till / Wallet & Bank through
 * `legacyFor`, so all existing balances and reports are unchanged
 * to the rupee. Owner-only; runs on owner sign-in.
 */
async function ensureAccounts(db: Firestore, uid: string) {
  const batch = writeBatch(db);
  for (const a of getSeedAccounts()) {
    batch.set(doc(db, "users", uid, "accounts", a.id), { ...a });
  }
  await batch.commit();
  await setDoc(doc(db, "users", uid), { phaseA: { accountsV1: true } }, { merge: true });
}

/**
 * Phase A · A3 migration step `rbacV1` (design §6.1): build the
 * owner-doc `staff[]` from the legacy `staffEmails[]` mirror and
 * merge-write the resolved role onto each EXISTING `staffIndex`
 * doc that lacks a valid one. Every legacy staffer resolves to
 * "manager" — provably the same capability set they have today
 * (`LEGACY_STAFF_ACCESS` in lib/permissions) — so the rollout
 * narrows nobody (risk R-2). Idempotent: the pure backfill
 * (`backfillStaff`) preserves any staff[]/index role already
 * recorded, and the flag is written with a dot-path update so the
 * sibling Phase A flags survive. Writes NO journal entries.
 * Owner-only; runs on owner sign-in.
 */
async function ensureRbac(db: Firestore, uid: string) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;
  const d = snap.data();
  const staffEmails: string[] = Array.isArray(d.staffEmails)
    ? (d.staffEmails as string[])
    : [];
  const indexRoles: Record<string, unknown> = {};
  await Promise.all(
    staffEmails.map(async (email) => {
      try {
        const s = await getDoc(doc(db, "staffIndex", email));
        if (s.exists()) indexRoles[email] = s.data().role;
      } catch {
        /* unreadable index doc — treated as absent; no write issued */
      }
    })
  );
  const { staff, indexRoleWrites } = backfillStaff({
    staffEmails,
    staff: parseStaff(d.staff),
    indexRoles,
    now: new Date().toISOString(),
  });
  const batch = writeBatch(db);
  for (const w of indexRoleWrites) {
    batch.set(doc(db, "staffIndex", w.email), { role: w.role }, { merge: true });
  }
  await batch.commit();
  await updateDoc(userRef, { staff, "phaseA.rbacV1": true });
}

/**
 * Phase A · A4 migration step `taxV1` (design §6.1): record the tax
 * defaults (null ⇒ no tax) on the owner doc and flag the step.
 * Deliberately creates NO slabs and writes NO journal entries and
 * NO product fields (they are optional, §2.2) — an existing shop's
 * figures are untouched until the owner configures a slab and marks
 * it default. Fields already present are never overwritten, so a
 * half-finished earlier run resumes safely. Owner-only; runs on
 * owner sign-in.
 */
async function ensureTax(
  db: Firestore,
  uid: string,
  data: Record<string, unknown>
) {
  const patch: Record<string, unknown> = { "phaseA.taxV1": true };
  if (data.defaultSalesTaxSlabId === undefined) patch.defaultSalesTaxSlabId = null;
  if (data.defaultPurchaseTaxSlabId === undefined) patch.defaultPurchaseTaxSlabId = null;
  await updateDoc(doc(db, "users", uid), patch);
}

/**
 * Phase A · A5 migration step `periodsV1` (design §6.1): set the
 * fiscal-year defaults (month 7, day 1 — the Pakistan fiscal year)
 * and an EMPTY period lock on the owner doc, then flag the step.
 * Creates NO `periods` docs and NO journal entries — nothing is
 * locked by the migration; locking is the owner's deliberate act.
 * Fields already present (an owner who somehow set them, or a
 * half-finished earlier run) are never overwritten, so the step
 * resumes safely. Owner-only; runs on owner sign-in.
 */
async function ensurePeriods(
  db: Firestore,
  uid: string,
  data: Record<string, unknown>
) {
  const patch: Record<string, unknown> = { "phaseA.periodsV1": true };
  if (data.fiscalYearStartMonth === undefined) patch.fiscalYearStartMonth = 7;
  if (data.fiscalYearStartDay === undefined) patch.fiscalYearStartDay = 1;
  if (data.lockedThrough === undefined) patch.lockedThrough = "";
  await updateDoc(doc(db, "users", uid), patch);
}

/**
 * Phase C · C1 migration (flag `phaseC.stockV1` on the owner doc,
 * design §10.1). Creates the default warehouse ("Main") if the
 * shop has none, and writes one stock row per product that has no
 * rows yet, at the default warehouse, carrying its full current
 * total. It writes NO journal entries and changes NO stockQty —
 * it annotates existing stock with the location it already
 * notionally sits in, so every GL balance and frozen identity is
 * untouched. Per-product skip-whole: a product that already has
 * ANY row is left exactly as it is (a live C1 shop mid-day), which
 * makes the migration idempotent and safe to re-run. Row writes
 * chunk at 450 docs (the warehouse doc rides the first chunk).
 */
async function ensureStock(db: Firestore, uid: string) {
  const [prodSnap, whSnap, levelSnap] = await Promise.all([
    getDocs(collection(db, "users", uid, "products")),
    getDocs(collection(db, "users", uid, "warehouses")),
    getDocs(collection(db, "users", uid, "stockLevels")),
  ]);
  const products = prodSnap.docs.map((d) => d.data()) as Product[];
  const warehouses = whSnap.docs.map((d) => d.data()) as Warehouse[];
  const levels = levelSnap.docs.map((d) => d.data()) as StockLevel[];
  const defWh = getSeedWarehouses()[0]; // the canonical Main doc
  const rows = stockV1Rows(products, levels, defWh.id);
  const needWarehouse = warehouses.length === 0;
  if (needWarehouse || rows.length > 0) {
    for (let i = 0; i < Math.max(rows.length, 1); i += 450) {
      const batch = writeBatch(db);
      if (i === 0 && needWarehouse) {
        batch.set(doc(db, "users", uid, "warehouses", defWh.id), { ...defWh });
      }
      for (const l of rows.slice(i, i + 450)) {
        batch.set(doc(db, "users", uid, "stockLevels", l.id), { ...l });
      }
      await batch.commit();
    }
  }
  await updateDoc(doc(db, "users", uid), { "phaseC.stockV1": true });
}

/**
 * Phase D · D1 migration (flag `phaseD.hrV1` on the owner doc,
 * design §10.1). The lightest migration of any phase: it sets
 * the flag and NOTHING else — no documents are created, no
 * journal entries written, no existing doc touched. Phase D's
 * collections are born empty and absence is meaningful (no
 * employees = no payroll); the flag exists so a future
 * D-increment that does need a settings default hangs it here
 * rather than inventing a second mechanism.
 */
async function ensurePhaseD(db: Firestore, uid: string) {
  await updateDoc(doc(db, "users", uid), { "phaseD.hrV1": true });
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
