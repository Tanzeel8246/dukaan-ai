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
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
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
  BrandingAsset,
  BrandingAssetKind,
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
  LoanDirection,
  LoanEvent,
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
  StoreOrder,
  StorefrontDoc,
  Supplier,
  SupplierPayment,
  TaxSlab,
  Warehouse,
  WaAudience,
  WaCampaign,
  WaSend,
  WaTemplate,
  WaTemplateKind,
} from "@/lib/types";
import {
  getSeedAccounts,
  getSeedAttendance,
  getSeedBoms,
  getSeedCredits,
  getSeedCustomers,
  getSeedDeliveryChallans,
  getDemoLoyaltyEntries,
  getDemoSettings,
  getSeedEmployees,
  getSeedPayrollRunDraft,
  getSeedExpenses,
  getSeedJobs,
  getSeedJournal,
  getSeedLoans,
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
  entryBalances,
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
import {
  newBusinessSkeleton,
  planMigration,
  planTrialBirth,
  type BusinessCountersDoc,
  type BusinessEventDoc,
  type BusinessRegistryDoc,
  type InviteDoc,
  type MembershipDoc,
  type PlatformWrite,
} from "@/lib/tenancy";
import {
  nextInvoiceCounter,
  nextMemberCounter,
  planInvoiceRefusal,
  planMemberRefusal,
  planViewOf,
  type PlanId,
  type PlanRefusal,
  type PlanView,
} from "@/lib/plans";
import {
  PLATFORM_CONFIG_DOC_ID,
  type PlatformConfigDoc,
  type PlatformPaymentDoc,
  type PlatformPaymentMethod,
} from "@/lib/platform";
import {
  latestSuspensionReason,
  planRenewalSubmission,
  type RenewalSubmissionForm,
} from "@/lib/renewal";
import {
  assembleBackup,
  planRestore,
  TENANT_COLLECTIONS,
  verifyBackup,
  type BusinessBackup,
  type JsonDoc,
  type RestorePlan,
  type RestoreTargetState,
} from "@/lib/backup";
import {
  classifyBusinessContent,
  DEMO_CONTENT_COLLECTIONS,
  demoSetIds,
  demoSummary,
  planDemoSeed,
  summarizeSeedWrites,
  type BusinessContentClass,
  type DemoSeedWrite,
  type DemoSummary,
} from "@/lib/demo";
import {
  canRestoreFromTrash,
  clearReplacesTrash,
  reassembleChunks,
  trashManifestFor,
  trashPanelState,
  type TrashManifest,
} from "@/lib/trash";
import {
  accruedChargeCount,
  buildLoanChargeEntry,
  buildLoanDrawdownEntry,
  buildLoanRepaymentEntry,
  defaultRepaymentSplit,
  isISODate,
  loanChargeAmount,
  loanPosition,
  loanSchedule,
  loanStatusFor,
  loanTermsError,
  repaymentSplitError,
} from "@/lib/loans";
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
import { parseStaff, settingsFromOwnerDoc } from "@/lib/settings";
import {
  canCloseThroughDate,
  correctionDating,
  dayOffsetForTs,
  endOfDayPktInstant,
  fiscalYearRange,
  isPeriodLockedError,
  isValidDateISO,
  preparePosting,
  startOfDayPktInstant,
  todayPktISO,
} from "@/lib/periods";
import {
  buildFiscalClosingEntry,
  buildOpeningStockEntry,
  buildFiscalReopenEntry,
  fiscalCloseState,
  fiscalReopenBlocker,
  fiscalYearCloseChecklist,
} from "@/lib/fiscal";
import {
  billLoyaltyClawedPoints,
  billLoyaltyEarnEntry,
  buildLoyaltyClawbackEntry,
  buildLoyaltyEarnEntry,
  buildLoyaltyExpiryEntry,
  loyaltyClawbackPoints,
  loyaltyExpiryDue,
  loyaltyRecreditForReturn,
  loyaltyRedeemCapRs,
  loyaltyRedemptionQuote,
  resolveLoyaltySettings,
} from "@/lib/loyalty";
import {
  assembleStorefrontSnapshot,
  buildStoreSaleOrder,
  planStoreConversion,
  slugProblem,
  storefrontContentEqual,
} from "@/lib/storefront";
import {
  planWaLaunch,
  resolveWaSettings,
  waCampaignProgress,
  waConsentPatch,
  waModuleAllowed,
  waQueueStep,
  waSendingAllowed,
  waSendTransition,
  type WaConsentSource,
} from "@/lib/whatsapp";
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
// v17: Phase E · E2 added the `branding` slice (brand assets —
// one compressed data-URL doc per slot) — key
// "dukaan-ai-store-v17".
const STORAGE_KEY = "dukaan-ai-store-v17";

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
  branding: BrandingAsset[];
  /** Phase H · WhatsApp (design §3.3): the marketing module's
   *  three tenant collections — templates, campaigns, and the
   *  send log. Facts, not derivations: the log especially is
   *  written row by row as the queue advances. */
  waTemplates: WaTemplate[];
  waCampaigns: WaCampaign[];
  waSends: WaSend[];
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
  "branding",
  "waTemplates",
  "waCampaigns",
  "waSends",
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
  /** Phase G · G1 (design §1.3): the ACTIVE business's membership
   *  docs, subscribed in the owner's context (the settings staff
   *  list's membership chips read these). Empty outside the
   *  owner's own business and in demo mode. */
  memberships: Array<MembershipDoc & { memberUid: string }>;
  /** Phase G · G1: the ACTIVE business's invite docs (pending /
   *  claimed), subscribed alongside `memberships`. */
  invites: InviteDoc[];
  /** Phase G · G2 (design §3/§4): the ACTIVE business's plan
   *  view — the assignment snapshot, the enforcement flag, the
   *  DERIVED plan state, and the live counters — driving the
   *  banner, the locked doors, the client-side gates and the
   *  settings observation panel. Null in demo mode and for a
   *  business with no registry doc (pre-G): every plan surface
   *  stays dark and every gate passes. */
  planView: PlanView | null;
  /** Phase G · G2: the most recent client-side plan refusal
   *  (invoice limit / member limit / paused state), rendered by
   *  the shell as mapped copy — a rules denial must never
   *  surface as a raw error (§4.2). Cleared on the next
   *  successful gated write or by dismissal. */
  planRefusal: PlanRefusal | null;
  clearPlanRefusal: () => void;
  /** Phase G · G4: the business's own renewal payment records
   *  (design §3.5), subscribed in the OWNER's context only —
   *  the platformPayments rules read a record for its own
   *  business's owner alone. Empty for staff and in demo. */
  ownPayments: PlatformPaymentDoc[];
  /** Phase G · G4: the platform's payment instructions +
   *  support contact (platformConfig), as the renewal surface
   *  shows them. Null until the platform publishes them. */
  platformConfig: PlatformConfigDoc | null;
  /** Phase G · G4: the recorded reason of the live suspension,
   *  read back from the business's own event log (§2.4) — the
   *  shell banner names it. Null when not suspended. */
  suspensionReason: string | null;
  /** Phase G · G4: submit a renewal payment record (§3.5) —
   *  a platform write only; it composes no journal entry and
   *  touches no shop path. Resolves the planner's refusal
   *  reason when it refuses. */
  submitRenewalPayment: (
    form: RenewalSubmissionForm
  ) => Promise<{ ok: boolean; reason?: string }>;
  /** Phase G · G6: assemble the full-business backup (design §9) —
   *  owner-only, reads only, assembled from the owner's own reads;
   *  available in every plan state because reads are never gated.
   *  Null when unavailable (staff, demo, read failure). */
  exportBusinessBackup: () => Promise<BusinessBackup | null>;
  /** Phase G · G6: verify a backup file and plan its restore into
   *  THIS business — probes the namespace and runs the pure
   *  planner; writes nothing. Null when unavailable. */
  planBusinessRestore: (file: unknown) => Promise<RestorePlan | null>;
  /** Phase G · G6: execute a restore plan returned by
   *  planBusinessRestore — batched document writes in plan order
   *  (the restore.performed event last). Composes no journal
   *  entry: the journal is transplanted as documents. */
  executeBusinessRestore: (
    plan: RestorePlan
  ) => Promise<{ ok: boolean; reason?: string }>;
  /** Fix Round 2 · FR2: the business's demo-data class from
   *  loaded state — "empty" (seedable), "demo-only"
   *  (re-addable), "real" (demo actions refused). The actions
   *  re-classify from fresh reads before writing. */
  demoClass: BusinessContentClass;
  /** FR2 item 1 — "Add demo data" (owner, cloud-only, empty
   *  businesses only). The summary is confirmed from the writes
   *  committed. Reasons: "unavailable" | "real" | "already" |
   *  "write-failed". */
  addDemoData: () => Promise<{
    ok: boolean;
    reason?: string;
    summary?: DemoSummary;
  }>;
  /** FR2 item 1 — "Re-add demo data" (owner, cloud-only,
   *  demo-only businesses only). Reasons: "unavailable" |
   *  "empty" | "real" | "write-failed". */
  resetDemoData: () => Promise<{
    ok: boolean;
    reason?: string;
    summary?: DemoSummary;
  }>;
  /** FR2 item 2 — list trash snapshots (expired ones swept
   *  lazily on load). */
  listTrash: () => Promise<TrashManifest[]>;
  /** FR2 item 2 — "Clear data" (owner, cloud-only, danger zone).
   *  Snapshots to trash, then wipes. Reason "replace" carries
   *  the active snapshot the clear would replace; recall with
   *  replaceConfirmed to confirm. */
  clearBusinessData: (opts?: {
    replaceConfirmed?: boolean;
  }) => Promise<{
    ok: boolean;
    reason?: string;
    manifest?: TrashManifest;
    replaced?: TrashManifest | null;
  }>;
  /** FR2 item 2 — restore a trash snapshot via the existing
   *  pipeline (empty-business guard included). Consumes the
   *  snapshot on success. */
  restoreFromTrash: (trashId: string) => Promise<{ ok: boolean; reason?: string }>;
  /** FR2 item 2 — delete a trash snapshot permanently. */
  deleteTrashPermanently: (trashId: string) => Promise<{ ok: boolean; reason?: string }>;
  /** FR2 item 3 — the active business's skeleton never landed;
   *  the switcher offers the retry while this is true. */
  setupIncomplete: boolean;
  /** FR2 item 3 — retry the failed business setup. */
  retryBusinessSetup: () => Promise<boolean>;
  /** Phase H · H3 (design §2): the business's published
   *  storefront snapshot (null = never published), subscribed
   *  from the top-level `storefronts` collection by businessId —
   *  the desk's record of its public face. Null in demo mode:
   *  demo publishes nothing (§5.3). */
  storefront: StorefrontDoc | null;
  /** Phase H · H3: the business's store-order inbox, newest
   *  first — paper until a member converts a row (§2.4/§2.5).
   *  Empty in demo mode (the preview takes no orders). */
  storeOrders: StoreOrder[];
  /** Phase H · H3: publish (or re-publish) the storefront
   *  snapshot — OWNER-only (the public face is an owner act,
   *  rules v10 enforce it), cloud-only. The slug is claimed on
   *  the first publish and can never change afterwards. */
  publishStorefront: (input: {
    slug?: string;
    tagline?: string | null;
    notice?: string | null;
    excludedProductIds: string[];
    includeProductIds: string[];
  }) => Promise<{ ok: boolean; reason?: string }>;
  /** Phase H · H3: switch the store off — the doc and slug are
   *  kept; the public page and the order intake close together
   *  (the create leg requires `enabled`). Owner-only. */
  unpublishStorefront: () => Promise<{ ok: boolean; reason?: string }>;
  /** Phase H · H3: the auto-republish preference (owner). */
  setStorefrontAutoRepublish: (on: boolean) => void;
  /** Phase H · H3: convert one inbox order into a sale order —
   *  re-priced against live data at the moment of the act, the
   *  customer resolved (phone-matched, else created), the SO
   *  born `open`, and the inbox doc flipped to `converted` in
   *  the SAME batch: the state is the exactly-once claim.
   *  Phase H · H6 (audit fix 2): WhatsApp consent rides the
   *  ORDER's own flag — the customer's tick on the public
   *  checkout form (design §3.2), stamped (source "storefront")
   *  onto the resolved/created customer in the same batch. The
   *  desk asserts nothing: an order without the flag converts
   *  with no consent stamp, ever. */
  convertStoreOrder: (
    orderId: string
  ) => Promise<{ ok: boolean; reason?: string; soNumber?: string }>;
  /** Phase H · H3: dismiss one inbox order (actor + timestamp
   *  stamped; dismissed paper is kept, never deleted). */
  dismissStoreOrder: (orderId: string) => Promise<{ ok: boolean; reason?: string }>;
  /** Phase H · WhatsApp (design §3.3): create or update a
   *  message template (owner/manager — the `whatsapp` matrix
   *  row). Returns the template id ("" when refused). */
  saveWaTemplate: (input: {
    id?: string;
    name: string;
    kind: WaTemplateKind;
    body: string;
  }) => string;
  /** Phase H · WhatsApp: delete a template. Campaigns already
   *  sent keep their log; a draft campaign citing it simply
   *  cannot launch until it names a live template. */
  deleteWaTemplate: (id: string) => void;
  /** Phase H · WhatsApp (design §3.3): create a campaign in
   *  `draft` — a template + an audience DEFINITION; nobody is
   *  resolved until launch. Returns the id ("" when refused). */
  createWaCampaign: (input: {
    name: string;
    templateId: string;
    audience: WaAudience;
  }) => string;
  /** Phase H · WhatsApp (design §3.4): launch a draft campaign
   *  — resolve its audience LIVE (consent filter applied),
   *  materialise one `queued` send row per recipient, stamp
   *  resolvedCount, flip the campaign to `sending`. Refused
   *  (with reason) when the plan snapshot lacks the module or
   *  the plan state is not postable — sending degrades with
   *  plan expiry (invariant 5); reads never do. */
  launchWaCampaign: (
    campaignId: string
  ) => { ok: boolean; reason?: string; count?: number };
  /** Phase H · WhatsApp (design §3.4): one queue act on a
   *  campaign's head row. The lib re-check runs FIRST: if the
   *  recipient has opted out (or the number is invalid) since
   *  launch, the row lands in its skipped_* state whatever the
   *  act — `outcome` reports what actually happened. When the
   *  last row turns terminal the campaign closes to `done`. */
  advanceWaSend: (
    campaignId: string,
    act: "opened" | "sent",
    afterId?: string | null
  ) => { ok: boolean; reason?: string; outcome?: WaSend["state"] };
  /** Phase H · WhatsApp: close a campaign now — rows still
   *  queued stay queued in the log (they were never sent, and
   *  the log does not pretend otherwise). */
  finishWaCampaign: (campaignId: string) => void;
  /** Phase H · WhatsApp (design §3.2): record a customer's
   *  marketing consent (grant or revoke), stamped with its
   *  source. Rides the `customersManage` guard — consent is
   *  captured where customers are managed. */
  setCustomerWaConsent: (
    customerId: string,
    agreed: boolean,
    source: WaConsentSource
  ) => void;
  /** Phase H · WhatsApp (design §3.5): the service-reminder
   *  interval, in days — an owner-doc settings write. */
  setWaServiceIntervalDays: (days: number) => void;
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
  /** Phase H · H1: post expiry releases for every vintage the
   *  derived due-list names (owner/manager — the `loyalty` matrix
   *  row). Returns how many release entries posted (0 = nothing
   *  due / refused). The list is derived, never stored; posting is
   *  always this deliberate act — no scheduler exists. */
  postLoyaltyExpiries: () => number;
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
  /** MC Billing workflow adoption 2026-10-27 (WEB) — receipt
   *  split at entry, advance half: Dr money / Cr
   *  `customer_advances` (unearned), one balanced entry through
   *  the guarded choke point, journal-only (the customer ledger
   *  reads advances from the journal by ref, so the receivables
   *  subledger is never polluted). Old advances are never
   *  restated — this posts a new entry, never edits an old one. */
  addCustomerAdvance: (c: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    amount: number;
    method: "cash" | "jazzcash" | "easypaisa" | "bank";
    accountId?: string | null;
    note: string;
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
  // fiscal-year close (Phase D · D4) — owner-only (matrix row
  // `fiscalClose`); one closing entry + periods doc + lock advance
  // per close, reopening by mirror reversal (design §4.3/§4.4)
  closeFiscalYear: (
    fyStartDate: string,
    opts: { note: string; ackWarnings: boolean }
  ) => FiscalCloseResult;
  reopenFiscalYear: (fyStartDate: string, reason: string) => FiscalCloseResult;
  // Fix Round 1 · F5 — the one-time opening-stock recognition
  // entry (Dr inventory / Cr capital), owner-gated like the close
  postOpeningStock: (amount: number, rawShare: number) => FiscalCloseResult;
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
  // Phase D · D3: loans register (design §3). Every money action
  // gates on the `loans` matrix row (owner/accountant write;
  // manager read) and posts through the A5 choke point in the
  // SAME batch as its loan doc. Charges accrue only as discrete
  // desk-confirmed events; receivable loans are charge-free.
  /** Create a loan AND post its drawdown in one batch (a cloud
   *  loan is born drawn, §3.4/§10.3): the LN- number is minted
   *  at creation, the fee (if any) is netted from the proceeds,
   *  and the drawdown + fee events open the diary. Returns the
   *  loan id, or null when the terms are refused at composition
   *  (charged receivable lending included). */
  createLoan: (input: {
    direction: LoanDirection;
    partyName: string;
    partyId?: string | null;
    principal: number;
    chargeType: Loan["chargeType"];
    chargeRate: number;
    feeAmount: number;
    startDateISO: string;
    instalmentCount: number;
    instalmentEvery: Loan["instalmentEvery"];
    firstDueISO: string;
    method: PayMethod;
    accountId?: string | null;
    note?: string;
  }) => string | null;
  /** Accrue ONE instalment's charge (the next un-accrued one —
   *  the schedule proposes, the desk confirms, §3.4). Payable
   *  flat/reducing loans only; one entry + one diary event. */
  accrueLoanCharge: (loanId: string, instalmentN: number) => boolean;
  /** Repay a loan (either direction): one entry + one diary
   *  event carrying the principal/charge split (charges-first by
   *  default, desk-overridable). Overpayment beyond the derived
   *  outstanding is refused pre-composition. */
  repayLoan: (
    loanId: string,
    input: {
      amount: number;
      method: PayMethod;
      accountId?: string | null;
      principalPart?: number;
      chargePart?: number;
    }
  ) => boolean;
  /** Reverse ONE loan event (its mirror entry + negated diary
   *  events, §3.4). A drawdown reverses only when no repayment
   *  or charge stands against it, and cancels the loan. */
  reverseLoanEvent: (loanId: string, entryId: string) => boolean;
  /** Delete a never-used loan (owner only, mirroring the rules —
   *  a loan with any diary event is a posted record and is
   *  never deleted). */
  deleteLoan: (id: string) => boolean;
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
  // brand assets (Phase E · E2) — one doc per slot in the
  // `branding` collection; every role READS them (each desk
  // prints branded paper), the OWNER alone writes. The asset
  // arrives fully formed from the lib/branding pipeline (its
  // cap already enforced); removal simply stops the slot
  // printing — assets assert no history.
  setBrandingAsset: (asset: BrandingAsset) => void;
  removeBrandingAsset: (kind: BrandingAssetKind) => void;
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

/** Result of a fiscal-year close/reopen (Phase D · D4): on failure
 *  the `reason` names the rule that refused, for dictionary
 *  mapping — a hard gate on the derived checklist (`gate`),
 *  unacknowledged warnings (`warnings`), an already-closed year
 *  (`closed`), a not-yet-past year (`notpast`), the period-lock
 *  guard refusing the closing entry's own date (`locked`), a
 *  reopen with no live close (`notclosed`) or a later closed year
 *  still standing (`stack`). */
export type FiscalCloseResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "permission"
        | "invalid"
        | "notpast"
        | "closed"
        | "gate"
        | "warnings"
        | "locked"
        | "notclosed"
        | "stack"
        | "reason";
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
    branding: [],
    waTemplates: [],
    waCampaigns: [],
    waSends: [],
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
    // Phase H · H6: the DEMO showroom journal includes loyalty
    // and loan drawdown trued up with go-live opening balance.
    journal: getSeedJournal(
      products,
      sales,
      purchases,
      supplierPayments,
      expenses,
      credits,
      getDemoLoyaltyEntries(getSeedCustomers())
    ),
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
    // Phase D · D3 (design §10.3): ONE demo loan — charge-free,
    // active, NO events (a register discoverability aid whose
    // outstanding derives as principal-unpaid with no journal
    // behind it; cloud loans are born with their drawdown in
    // one batch, §3.4). The doc posts nothing, so the seed
    // journal above is untouched; the production seeder never
    // pushes this collection.
    loans: getSeedLoans(),
    // Phase E · E2 (design §2.6/§10.3): brand assets start EMPTY
    // everywhere — the demo seed ships NO assets, so the public
    // demo prints the clean text-header look until the owner
    // uploads their own. The collection asserts no money fact;
    // the production seeder never pushes it either.
    branding: [],
    // Phase H · WhatsApp (design §5.3): the marketing
    // collections start EMPTY in demo too — the showroom
    // composes and queues campaigns against the demo customers
    // locally (the send step opens wa.me exactly as production
    // does; it is the shopkeeper's own WhatsApp either way, so
    // nothing demo-specific can leak), and the frozen journal
    // is untouched: marketing posts nothing, ever.
    waTemplates: [],
    waCampaigns: [],
    waSends: [],
    settings: {
      // H6: the demo shop runs its loyalty programme ON
      // (getDemoSettings — demo only; the cloud seed's settings
      // carry no loyalty block, so a real shop starts OFF).
      ...getDemoSettings(),
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

/**
 * Fix Round 1 · F3: re-base every loaded row's `dayOffset` from its
 * `ts` (lib/periods `dayOffsetForTs`). A stored dayOffset is a
 * creation-day stamp — written 0 and never recomputed — so without
 * this, every "today"-scoped derivation (the day close, aging,
 * the dashboard) silently widens day after day: the owner's live
 * shop still counted its 22-Oct rows as "today" on 24-Oct. The
 * row's `ts` never moves, so the effective offset is derived at
 * the load choke points (here for local state, the cloud `sub`
 * mapper for snapshots) and every consumer keeps reading
 * `dayOffset` unchanged. Rows without a parseable `ts` keep their
 * stored stamp; the seed's stamps already agree with its `ts`
 * values (lib/seed's rebaseTs), so demo data is untouched.
 */
function rebaseAges<T>(list: T[]): T[] {
  const today = todayPktISO();
  let changed = false;
  const out = list.map((row) => {
    const r = row as { ts?: unknown; dayOffset?: unknown } | null;
    if (
      r &&
      typeof r === "object" &&
      typeof r.ts === "string" &&
      typeof r.dayOffset === "number"
    ) {
      const eff = dayOffsetForTs(r.ts, today, r.dayOffset);
      if (eff !== r.dayOffset) {
        changed = true;
        return { ...(row as object), dayOffset: eff } as T;
      }
    }
    return row;
  });
  return changed ? out : list;
}

function loadInitial(): { products: Product[]; sales: Sale[] } & Collections {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { products: Product[]; sales: Sale[] } & Collections;
      if (Array.isArray(parsed.products) && Array.isArray(parsed.sales)) {
        const rebased = { ...parsed } as Record<string, unknown>;
        for (const key of Object.keys(rebased)) {
          const v = rebased[key];
          if (Array.isArray(v)) rebased[key] = rebaseAges(v);
        }
        return {
          ...seedCollections(),
          ...(rebased as unknown as typeof parsed),
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
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { mode, user, role, dataUid } = useAuth();
  const cloud = mode === "production";
  const uid = dataUid;
  const isStaff = role !== "owner";

  const [ready, setReady] = useState(false);
  /** Fix Round 2 · FR2: the active business's skeleton never
   *  landed (its creation's phase-2 write failed) — the switcher
   *  offers the retry until this clears. False for every business
   *  whose owner doc exists. */
  const [setupIncomplete, setSetupIncomplete] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cols, setCols] = useState<Collections>(emptyCollections());
  // Phase G · G1: the ACTIVE business's memberships + invites,
  // subscribed in the owner's context only (the settings staff
  // list's membership chips + the staff actions' conditional
  // platform writes read them). Demo mode never populates these.
  const [memberships, setMemberships] = useState<
    Array<MembershipDoc & { memberUid: string }>
  >([]);
  const [invites, setInvites] = useState<InviteDoc[]>([]);
  const membershipsRef = useRef<Array<MembershipDoc & { memberUid: string }>>([]);
  membershipsRef.current = memberships;
  const invitesRef = useRef<InviteDoc[]>([]);
  invitesRef.current = invites;
  // Phase G · G2: the ACTIVE business's registry + counter docs
  // (design §2.2/§2.3), subscribed for EVERY role — a cashier's
  // posting batch composes its counter write from the live doc,
  // so a cashier's client must hold it (the counter rule's read
  // widened to canAccess in v9 part 2 for exactly this). The
  // refusal state carries the last mapped gate refusal.
  const [planRegistry, setPlanRegistry] = useState<BusinessRegistryDoc | null>(null);
  const [planCounters, setPlanCounters] = useState<BusinessCountersDoc | null>(null);
  const [planRefusal, setPlanRefusal] = useState<PlanRefusal | null>(null);
  const planRegistryRef = useRef<BusinessRegistryDoc | null>(null);
  planRegistryRef.current = planRegistry;
  const planCountersRef = useRef<BusinessCountersDoc | null>(null);
  planCountersRef.current = planCounters;
  // Phase G · G4: the renewal surface's data — the business's
  // own payment records + the platform's payment instructions
  // (owner context; see the subscription below), and the
  // business's own platform event log (owner + members — the
  // suspension banner's reason is read back from it, §2.4).
  const [ownPayments, setOwnPayments] = useState<PlatformPaymentDoc[]>([]);
  const [platformConfig, setPlatformConfig] =
    useState<PlatformConfigDoc | null>(null);
  const [ownEvents, setOwnEvents] = useState<BusinessEventDoc[]>([]);
  // Phase H · H3: the storefront snapshot + order inbox
  // (top-level collections, subscribed by businessId below —
  //  NOT tenant collections: the backup carries them in its
  //  platform slice, and demo mode holds neither).
  const [storefront, setStorefront] = useState<StorefrontDoc | null>(null);
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([]);
  const storefrontRef = useRef<StorefrontDoc | null>(null);
  storefrontRef.current = storefront;
  const storeOrdersRef = useRef<StoreOrder[]>([]);
  storeOrdersRef.current = storeOrders;
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
      branding: initial.branding ?? [],
      waTemplates: initial.waTemplates ?? [],
      waCampaigns: initial.waCampaigns ?? [],
      waSends: initial.waSends ?? [],
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
              // Fix Round 1 · F3: derive each row's effective
              // dayOffset from its ts before any consumer reads
              // it (see `rebaseAges` at the local load path).
              const aged = rebaseAges(list);
              if (sortFn) aged.sort(sortFn);
              apply(aged);
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
      // Phase E · E2: brand assets — every role reads them (each
      // desk prints branded paper; rules: read canAccess, write
      // owner-only), so staff subscriptions attach like any other.
      sub<BrandingAsset>("branding", (l) => setCol("branding", l), (a, b) => a.id.localeCompare(b.id));
      // Phase H · WhatsApp: the marketing collections. Reads are
      // narrowed at the RULES level (owner/manager/accountant —
      // the cashier does not launch campaigns, §3.3); a cashier's
      // subscription is simply denied and the surface never
      // renders for them, the D1 pattern.
      sub<WaTemplate>("waTemplates", (l) => setCol("waTemplates", l), (a, b) => a.name.localeCompare(b.name));
      sub<WaCampaign>("waCampaigns", (l) => setCol("waCampaigns", l), byTs);
      sub<WaSend>("waSends", (l) => setCol("waSends", l), byTs);
      // Settings live on the owner doc itself.
      unsubs.push(
        onSnapshot(
          doc(db, "users", uid),
          (snap) => {
            // Fix Round 1 · F1: the settings rebuild is
            // lib/settings' `settingsFromOwnerDoc` — the single
            // source of truth for which owner-doc fields are
            // settings. The hand-maintained inline list that used
            // to live here silently dropped every Phase H family
            // (loyalty above all), so a cloud shop's saved
            // programme read back as OFF forever.
            setCol("settings", settingsFromOwnerDoc(snap.data() ?? {}));
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
          if (uid === user?.uid) {
            // Fix Round 2 · FR2: a brand-new owner's FIRST business
            // starts EMPTY — the skeleton only (accounts + default
            // warehouse, no content, no journal). Demo data is an
            // explicit owner act afterwards, never at signup.
            const settings = getSeedSettings();
            await createEmptyNamespace(
              db, uid, user?.email ?? null,
              settings.shopName, settings.phone, settings.address
            );
            // Phase G · G1 (design §4.3): the registry birth — the
            // trial plan snapshot + zeroed counters, platform
            // collections only.
            await createTrialRegistry(db, uid, user?.email ?? null);
          } else {
            // Fix Round 2 · FR2: a GENERATED business whose skeleton
            // never landed (its phase-2 write failed): complete it
            // idempotently from the registry's own name/phone, so
            // the business is usable instead of failing the load.
            // A failure here is NOT fatal — the switcher offers
            // the retry (retryBusinessSetup) and the flag below
            // records it.
            try {
              const regSnap = await getDoc(doc(db, "businesses", uid));
              const reg = regSnap.exists() ? (regSnap.data() as { name?: string; phone?: string; city?: string }) : null;
              if (!reg) throw new Error("registry-missing");
              await createEmptyNamespace(
                db, uid, user?.email ?? null,
                reg.name ?? "Shop", reg.phone ?? "", reg.city ?? ""
              );
              setSetupIncomplete(false);
            } catch {
              setSetupIncomplete(true);
            }
          }
        } else if (!cancelled && userDoc.exists() && !isStaff) {
          setSetupIncomplete(false);
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
          // Phase G · G1 migration (design §7.2): the tenancy
          // registry for a pre-G shop — the `founding` comp
          // assignment, membership mirrors, baseline counters.
          // Platform collections ONLY: this writes nothing inside
          // the users/{uid} tree and no journal entry, and the
          // registry doc's existence is its own marker, so a
          // second sign-in writes nothing new.
          await ensureBusinessRegistry(
            db,
            uid,
            user?.email ?? null,
            userDoc.data()
          );
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

  /* Phase G · G1 — the owner-context platform subscriptions: the
   * active business's memberships + invites (design §1.3). Only
   * the OWNER's client subscribes (a staffer's rules could not
   * read the whole set, and the settings surface that consumes
   * these is owner-only anyway). Switching businesses re-keys
   * `uid`, so a switch tears these down with everything else. */
  useEffect(() => {
    if (!cloud || !uid || role !== "owner") {
      setMemberships([]);
      setInvites([]);
      return;
    }
    const db = getFirestoreDb();
    if (!db) return;
    const un1 = onSnapshot(
      collection(db, "businessMembers", uid, "members"),
      (qs) =>
        setMemberships(
          qs.docs.map((d) => ({
            ...(d.data() as MembershipDoc),
            memberUid: d.id,
          }))
        ),
      () => undefined
    );
    const un2 = onSnapshot(
      collection(db, "businessInvites", uid, "invites"),
      (qs) => setInvites(qs.docs.map((d) => d.data() as InviteDoc)),
      () => undefined
    );
    return () => {
      un1();
      un2();
    };
  }, [cloud, uid, role]);

  /* Phase G · G2 — the plan + counter subscriptions (design
   * §2.2/§2.3): the ACTIVE business's registry and counter docs,
   * for every role (see the state comment). A missing doc reads
   * as null — a pre-G namespace mid-migration, or a staffer
   * whose counter read is still denied by the pre-part-2 rules
   * (the error callback swallows it; the gates then pass, the
   * observation posture) — never as an error surface. */
  useEffect(() => {
    if (!cloud || !uid) {
      setPlanRegistry(null);
      setPlanCounters(null);
      return;
    }
    const db = getFirestoreDb();
    if (!db) return;
    const un1 = onSnapshot(
      doc(db, "businesses", uid),
      (ds) =>
        setPlanRegistry(
          ds.exists()
            ? normPlanRegistryDoc(ds.data() as Record<string, unknown>)
            : null
        ),
      () => undefined
    );
    const un2 = onSnapshot(
      doc(db, "businessCounters", uid),
      (ds) => setPlanCounters(ds.exists() ? (ds.data() as BusinessCountersDoc) : null),
      () => undefined
    );
    return () => {
      un1();
      un2();
    };
  }, [cloud, uid]);

  // Phase G · G2: the derived plan view for the UI (banner,
  // locked doors, settings panel). Rebuilt per render from the
  // subscribed docs, so a state boundary (trial end, grace
  // start) is picked up on the next interaction; demo mode and
  // registry-less namespaces stay null (dark surfaces).
  const planView: PlanView | null =
    cloud && planRegistry
      ? planViewOf(planRegistry, planCounters, new Date().toISOString())
      : null;

  const clearPlanRefusal = useCallback(() => setPlanRefusal(null), []);

  /* Phase G · G4 — the renewal subscriptions (design §3.5).
   * The payment records + the platform config are the OWNER's
   * surfaces (the payments rules read a record for its own
   * business's owner alone), so they subscribe only in the
   * owner's context; the business's own event log reads for
   * owner + members (the suspension banner shows to every
   * role). Demo mode subscribes none of it — no renewal
   * surface exists there. */
  useEffect(() => {
    if (!cloud || !uid || role !== "owner") {
      setOwnPayments([]);
      setPlatformConfig(null);
      return;
    }
    const db = getFirestoreDb();
    if (!db) return;
    const un1 = onSnapshot(
      query(
        collection(db, "platformPayments"),
        where("businessId", "==", uid),
        orderBy("submittedAt", "desc")
      ),
      (qs) =>
        setOwnPayments(
          qs.docs.map((d) =>
            normOwnPayment(d.id, d.data() as Record<string, unknown>)
          )
        ),
      () => undefined
    );
    const un2 = onSnapshot(
      doc(db, "platformConfig", PLATFORM_CONFIG_DOC_ID),
      (ds) =>
        setPlatformConfig(
          ds.exists() ? (ds.data() as PlatformConfigDoc) : null
        ),
      () => undefined
    );
    return () => {
      un1();
      un2();
    };
  }, [cloud, uid, role]);

  useEffect(() => {
    if (!cloud || !uid) {
      setOwnEvents([]);
      return;
    }
    const db = getFirestoreDb();
    if (!db) return;
    const un = onSnapshot(
      query(
        collection(db, "businessEvents"),
        where("businessId", "==", uid),
        orderBy("at", "desc"),
        limit(50)
      ),
      (qs) =>
        setOwnEvents(
          qs.docs.map((d) => normOwnEvent(d.data() as Record<string, unknown>))
        ),
      () => undefined
    );
    return () => un();
  }, [cloud, uid]);

  /* Phase H · H3 — the storefront subscriptions (design §2):
   * the business's published snapshot + its order inbox, read
   * through membership (rules v10: members read both; the public
   * leg of the snapshot is separate and unauthenticated). Demo
   * mode subscribes neither — demo publishes nothing and takes
   * no orders (§5.3); the desk shows the labelled preview. */
  useEffect(() => {
    if (!cloud || !uid) {
      setStorefront(null);
      setStoreOrders([]);
      return;
    }
    const db = getFirestoreDb();
    if (!db) return;
    const un1 = onSnapshot(
      query(
        collection(db, "storefronts"),
        where("businessId", "==", uid),
        limit(1)
      ),
      (qs) =>
        setStorefront(
          qs.docs.length > 0 ? (qs.docs[0].data() as StorefrontDoc) : null
        ),
      () => undefined
    );
    const un2 = onSnapshot(
      query(
        collection(db, "storeOrders"),
        where("businessId", "==", uid),
        orderBy("createdAt", "desc")
      ),
      (qs) =>
        setStoreOrders(
          qs.docs.map((d) => normStoreOrder(d.id, d.data() as Record<string, unknown>))
        ),
      () => undefined
    );
    return () => {
      un1();
      un2();
    };
  }, [cloud, uid]);

  // Phase G · G4: the suspension banner's reason (§2.4) — the
  // latest suspension act's recorded reason, while the shop is
  // in fact suspended (a later activation clears it in the
  // derivation itself).
  const suspensionReason: string | null =
    planView?.state === "suspended"
      ? latestSuspensionReason(ownEvents)
      : null;

  /* (The G4 submitRenewalPayment action is defined below,
   * after cloudCtx — it executes lib/renewal's plan through
   * the same registry plan executor.) */

  /** Phase G · G2: the client-side invoice-event pre-check
   *  (design §4.2). Mirrors the rules exactly and refuses ONLY
   *  under enforcement; a refusal is recorded for the shell's
   *  mapped banner and the caller aborts before composing any
   *  write. No registry (demo/pre-G) always passes. */
  const planInvoiceCheck = useCallback((): boolean => {
    const reg = planRegistryRef.current;
    if (!reg) return false;
    const refusal = planInvoiceRefusal(
      reg,
      planCountersRef.current,
      new Date().toISOString()
    );
    if (refusal) {
      setPlanRefusal(refusal);
      return true;
    }
    return false;
  }, []);

  /** Phase G · G2 (design §4.2): ride the posting batch with
   *  the invoice counter's next value — lib/plans'
   *  nextInvoiceCounter over the live counter doc (a trial
   *  counter never rolls: the count is the pool consumption).
   *  No counter doc (pre-G namespace) rides nothing; the rules'
   *  enforce-gated pairing is equally inert there. The write
   *  carries the doc's full counter shape — the counter rule's
   *  diff then sees exactly the one family's change. */
  const rideInvoiceCounter = useCallback(
    (batch: ReturnType<typeof writeBatch>, db: Firestore, shopUid: string) => {
      const cur = planCountersRef.current;
      if (!cur) return;
      const next = nextInvoiceCounter(
        cur,
        planRegistryRef.current?.plan ?? null,
        new Date().toISOString()
      );
      batch.update(doc(db, "businessCounters", shopUid), {
        invoiceMonth: next.invoiceMonth,
        invoiceCount: next.invoiceCount,
        memberCount: next.memberCount,
      });
    },
    []
  );

  /** Phase G · G2 (design §4.2): the seat counter's ride on the
   *  invite/removal batches (+1 at invite, −1 at removal). */
  const rideMemberCounter = useCallback(
    (
      batch: ReturnType<typeof writeBatch>,
      db: Firestore,
      shopUid: string,
      delta: 1 | -1
    ) => {
      const cur = planCountersRef.current;
      if (!cur) return;
      const next = nextMemberCounter(cur, delta);
      batch.update(doc(db, "businessCounters", shopUid), {
        invoiceMonth: next.invoiceMonth,
        invoiceCount: next.invoiceCount,
        memberCount: next.memberCount,
      });
    },
    []
  );

  /* ---------------- shared helpers ---------------- */
  const cloudCtx = useCallback((): { db: Firestore; uid: string } | null => {
    if (!cloud || !uid) return null;
    const db = getFirestoreDb();
    return db ? { db, uid } : null;
  }, [cloud, uid]);

  /** Phase G · G4 (design §3.5): the owner's renewal
   *  submission. lib/renewal composes the record from the
   *  catalogue — born `submitted`, in the owner's own name —
   *  and this executes the plan's single platform write via
   *  the registry plan executor. It composes NO journal entry
   *  and touches no shop path: a plan payment is platform
   *  paperwork, settled later from the console queue.
   *  Owner-only, and inert without a registry (demo / pre-G),
   *  where the renewal surface never renders. */
  const submitRenewalPayment = useCallback(
    async (
      form: RenewalSubmissionForm
    ): Promise<{ ok: boolean; reason?: string }> => {
      const ctx = cloudCtx();
      if (!ctx || roleRef.current !== "owner") {
        return { ok: false, reason: "unavailable" };
      }
      const res = planRenewalSubmission({
        registry: planRegistryRef.current,
        businessId: ctx.uid,
        planId: form.planId,
        billing: form.billing,
        method: form.method,
        reference: form.reference,
        ownerNote: form.ownerNote,
        actor: ctx.uid,
        now: new Date().toISOString(),
      });
      if (!res.ok) return { ok: false, reason: res.reason };
      try {
        await applyRegistryWrites(ctx.db, res.writes);
        return { ok: true };
      } catch {
        return { ok: false, reason: "write-failed" };
      }
    },
    [cloudCtx]
  );

  /* ---------------- Phase G · G6: backup & restore ----------------
   * Design §9 + §3.7: the export assembles from the owner's own
   * one-shot reads (a point-in-time file, not subscription drift),
   * is owner-only, and consults nothing about the business's plan
   * — reads are never gated, so the backup is available in trial,
   * grace, read-only and suspended states alike. The restore is a
   * transplant into this namespace only when the pure planner
   * (lib/backup) proves it empty-or-resumable; the executor below
   * performs the plan's document writes in order, in batches —
   * it composes no journal entry and no plan write of its own. */

  const exportBusinessBackup = useCallback(
    async (): Promise<BusinessBackup | null> => {
      const ctx = cloudCtx();
      if (!ctx || roleRef.current !== "owner") return null;
      const { db, uid } = ctx;
      try {
        const readTenant = async (name: string): Promise<JsonDoc[]> => {
          const snap = await getDocs(collection(db, "users", uid, name));
          return snap.docs.map(
            (d) => exportableDoc({ ...(d.data() as JsonDoc), id: d.id })
          );
        };
        const collections: Record<string, JsonDoc[]> = {};
        for (const name of TENANT_COLLECTIONS) {
          collections[name] = await readTenant(name);
        }
        const ownerSnap = await getDoc(doc(db, "users", uid));
        const owner = ownerSnap.exists()
          ? exportableDoc(ownerSnap.data() as JsonDoc)
          : {};
        const readSingle = async (path: string): Promise<JsonDoc | null> => {
          const snap = await getDoc(doc(db, path));
          return snap.exists() ? exportableDoc(snap.data() as JsonDoc) : null;
        };
        const readKeyed = async (path: string) => {
          const snap = await getDocs(collection(db, path));
          return snap.docs.map((d) => ({
            key: d.id,
            data: exportableDoc(d.data() as JsonDoc),
          }));
        };
        const readSlice = async (name: string) => {
          const snap = await getDocs(
            query(collection(db, name), where("businessId", "==", uid))
          );
          return snap.docs.map((d) => ({
            key: d.id,
            data: exportableDoc(d.data() as JsonDoc),
          }));
        };
        const readStorefront = async () => {
          const snap = await getDocs(
            query(collection(db, "storefronts"), where("businessId", "==", uid), limit(1))
          );
          return snap.docs.length > 0
            ? { key: snap.docs[0].id, data: exportableDoc(snap.docs[0].data() as JsonDoc) }
            : null;
        };
        const [registry, counters, stats, members, invites, events, payments, storefront, storeOrders] =
          await Promise.all([
            readSingle(`businesses/${uid}`),
            readSingle(`businessCounters/${uid}`),
            readSingle(`businessStats/${uid}`),
            readKeyed(`businessMembers/${uid}/members`),
            readKeyed(`businessInvites/${uid}/invites`),
            readSlice("businessEvents"),
            readSlice("platformPayments"),
            readStorefront(),
            readSlice("storeOrders"),
          ]);
        return assembleBackup({
          businessId: uid,
          exportedAt: new Date().toISOString(),
          exportedBy: "web",
          owner,
          collections,
          platform: {
            registry, counters, stats, members, invites, events, payments,
            storefront, storeOrders,
          },
        });
      } catch {
        return null;
      }
    },
    [cloudCtx]
  );

  const planBusinessRestore = useCallback(
    async (file: unknown): Promise<RestorePlan | null> => {
      const ctx = cloudCtx();
      if (!ctx || roleRef.current !== "owner") return null;
      const { db, uid } = ctx;
      try {
        const collections: RestoreTargetState["collections"] = {};
        for (const name of TENANT_COLLECTIONS) {
          const snap = await getDocs(collection(db, "users", uid, name));
          collections[name] = snap.docs.map(
            (d) => ({ ...(d.data() as JsonDoc), id: d.id })
          );
        }
        const ownerSnap = await getDoc(doc(db, "users", uid));
        const readKeyed = async (path: string) => {
          const snap = await getDocs(collection(db, path));
          return snap.docs.map((d) => ({
            key: d.id,
            data: d.data() as JsonDoc,
          }));
        };
        const [members, invites] = await Promise.all([
          readKeyed(`businessMembers/${uid}/members`),
          readKeyed(`businessInvites/${uid}/invites`),
        ]);
        // Phase H · H3: the restore's storefront subset probe —
        // the target business's own snapshot (any slug) + inbox.
        const frontSnap = await getDocs(
          query(collection(db, "storefronts"), where("businessId", "==", uid), limit(1))
        );
        const orderSnap = await getDocs(
          query(collection(db, "storeOrders"), where("businessId", "==", uid))
        );
        const target: RestoreTargetState = {
          owner: ownerSnap.exists() ? (ownerSnap.data() as JsonDoc) : null,
          collections,
          members,
          invites,
          storefront:
            frontSnap.docs.length > 0
              ? { key: frontSnap.docs[0].id, data: frontSnap.docs[0].data() as JsonDoc }
              : null,
          storeOrders: orderSnap.docs.map((d) => ({
            key: d.id,
            // createdAt is a server timestamp on the live doc;
            // the backup carries its ISO form (exportableDoc),
            // so the subset test must compare like with like.
            data: exportableDoc(d.data() as JsonDoc),
          })),
        };
        return planRestore({
          file,
          targetBusinessId: uid,
          target,
          actorUid: uid,
          nowISO: new Date().toISOString(),
        });
      } catch {
        return null;
      }
    },
    [cloudCtx]
  );

  const executeBusinessRestore = useCallback(
    async (plan: RestorePlan): Promise<{ ok: boolean; reason?: string }> => {
      const ctx = cloudCtx();
      if (!ctx || roleRef.current !== "owner") {
        return { ok: false, reason: "unavailable" };
      }
      if (!plan.ok) return { ok: false, reason: plan.reason };
      try {
        let batch = writeBatch(ctx.db);
        let n = 0;
        const flush = async () => {
          if (n > 0) {
            await batch.commit();
            batch = writeBatch(ctx.db);
            n = 0;
          }
        };
        for (const w of plan.writes) {
          if (w.kind === "set") {
            // Phase H · H3: an inbox doc's createdAt rides the
            // backup as an ISO string (the export's canonical
            // form); restore it as the timestamp it was born as,
            // so a restored inbox is indistinguishable in type
            // from a live one.
            const data =
              w.path.startsWith("storeOrders/") &&
              typeof w.data.createdAt === "string"
                ? { ...w.data, createdAt: Timestamp.fromDate(new Date(w.data.createdAt)) }
                : w.data;
            batch.set(doc(ctx.db, w.path), data);
          } else {
            batch.set(doc(collection(ctx.db, w.collection)), w.data);
          }
          n++;
          if (n >= 450) await flush();
        }
        await flush();
        return { ok: true };
      } catch {
        return { ok: false, reason: "write-failed" };
      }
    },
    [cloudCtx]
  );

  /* ---------------- Fix Round 2 · FR2: demo data + trash ---------------- */

  /** Classification from LOADED state — what the Dashboard and
   *  Settings buttons show. The actions below re-classify from
   *  fresh reads before writing, so a stale subscription can
   *  never seed into a real book. */
  const demoClass = useMemo<BusinessContentClass>(() => {
    const idDocs = (list: Array<{ id: string }>) => list.map((d) => ({ id: d.id }));
    const docs: Partial<Record<string, Array<{ id: string }>>> = {
      products: idDocs(products),
      sales: idDocs(sales),
    };
    for (const name of DEMO_CONTENT_COLLECTIONS) {
      if (name === "products" || name === "sales") continue;
      docs[name] = idDocs(
        ((cols as unknown as Record<string, Array<{ id: string }>>)[name] ?? [])
      );
    }
    return classifyBusinessContent(docs);
  }, [products, sales, cols]);

  /** Fresh content ids for the FR2 decisions (never state). */
  const readContentIds = useCallback(async (db: Firestore, businessId: string) => {
    const ids: Partial<Record<string, Set<string>>> = {};
    for (const name of DEMO_CONTENT_COLLECTIONS) {
      const snap = await getDocs(collection(db, "users", businessId, name));
      ids[name] = new Set(snap.docs.map((d) => d.id));
    }
    return ids;
  }, []);

  const classFromIds = (ids: Partial<Record<string, Set<string>>>): BusinessContentClass => {
    const docs: Partial<Record<string, Array<{ id: string }>>> = {};
    for (const [name, set] of Object.entries(ids)) {
      docs[name] = [...(set ?? [])].map((id) => ({ id }));
    }
    return classifyBusinessContent(docs);
  };

  /** The post-seed summary, confirmed from the writes actually
   *  committed — the same shape as the pre-list, so the panel
   *  shows "what was added" from evidence, not from the plan. */
  const summaryFromWrites = (writes: DemoSeedWrite[]): DemoSummary => {
    const counts = summarizeSeedWrites(writes);
    const writtenProducts = writes
      .filter((w) => w.collection === "products")
      .map((w) => w.data);
    const num = (v: unknown) => (typeof v === "number" ? v : 0);
    return {
      products: counts.products ?? 0,
      customers: counts.customers ?? 0,
      suppliers: counts.suppliers ?? 0,
      salesRows: counts.sales ?? 0,
      journalEntries: counts.journal ?? 0,
      stockCost: writtenProducts.reduce((n, pr) => n + num(pr.stockQty) * num(pr.costPrice), 0),
      stockRetail: writtenProducts.reduce((n, pr) => n + num(pr.stockQty) * num(pr.salePrice), 0),
    };
  };

  /** FR2 item 1 — "Add demo data": owner-only, cloud-only, and
   *  refused unless the business is EMPTY (fresh classification
   *  first). A demo-only business takes the re-add path, a real
   *  business is refused outright — demo seed never mixes into
   *  real books. */
  const addDemoData = useCallback(async (): Promise<{
    ok: boolean;
    reason?: string;
    summary?: DemoSummary;
  }> => {
    const ctx = cloudCtx();
    if (!ctx || roleRef.current !== "owner") return { ok: false, reason: "unavailable" };
    const { db, uid } = ctx;
    try {
      const existing = await readContentIds(db, uid);
      const cls = classFromIds(existing);
      if (cls !== "empty") {
        return { ok: false, reason: cls === "real" ? "real" : "already" };
      }
      const writes = await seedDemoCollections(db, uid, existing);
      return { ok: true, summary: summaryFromWrites(writes) };
    } catch {
      return { ok: false, reason: "write-failed" };
    }
  }, [cloudCtx, readContentIds]);

  /** FR2 item 1 — "Re-add demo data": the honest reset. Only a
   *  demo-only business re-seeds: its demo docs are wiped first
   *  and the set is planned again, so the result is exactly the
   *  demo set — never a duplicate layer. Empty and real
   *  businesses are refused (empty has nothing to re-add; real
   *  must never be mixed with demo). */
  const resetDemoData = useCallback(async (): Promise<{
    ok: boolean;
    reason?: string;
    summary?: DemoSummary;
  }> => {
    const ctx = cloudCtx();
    if (!ctx || roleRef.current !== "owner") return { ok: false, reason: "unavailable" };
    const { db, uid } = ctx;
    try {
      const existing = await readContentIds(db, uid);
      const cls = classFromIds(existing);
      if (cls === "empty") return { ok: false, reason: "empty" };
      if (cls === "real") {
        /* Mixed (demo + real) vs pure real: the refusal message
         * differs, so the UI can say exactly what is in the way. */
        const demoIds = demoSetIds();
        const hasDemo = DEMO_CONTENT_COLLECTIONS.some((name) =>
          [...(demoIds[name] ?? [])].some((id) => existing[name]?.has(id))
        );
        return { ok: false, reason: hasDemo ? "mixed" : "real" };
      }
      const demoIds = demoSetIds();
      for (const name of DEMO_CONTENT_COLLECTIONS) {
        const ids = [...(demoIds[name] ?? [])].filter((id) => existing[name]?.has(id));
        for (let i = 0; i < ids.length; i += 450) {
          const batch = writeBatch(db);
          for (const id of ids.slice(i, i + 450)) {
            batch.delete(doc(db, "users", uid, name, id));
          }
          await batch.commit();
        }
      }
      const writes = await seedDemoCollections(db, uid, {});
      return { ok: true, summary: summaryFromWrites(writes) };
    } catch {
      return { ok: false, reason: "write-failed" };
    }
  }, [cloudCtx, readContentIds]);

  /** FR2 item 2 — list the trash panel's snapshots, sweeping
   *  expired ones lazily (manifest + chunks deleted on load).
   *  Restored snapshots stay as consumed history; active ones
   *  carry their Restore / Delete-permanently buttons. */
  const listTrash = useCallback(async (): Promise<TrashManifest[]> => {
    const ctx = cloudCtx();
    if (!ctx || roleRef.current !== "owner") return [];
    try {
      const manifests = await readTrashManifests(ctx.db, ctx.uid);
      const now = new Date().toISOString();
      const kept: TrashManifest[] = [];
      for (const m of manifests) {
        if (trashPanelState(m, now) === "expired") {
          await deleteTrashDocs(ctx.db, ctx.uid, m.trashId);
        } else {
          kept.push(m);
        }
      }
      return kept;
    } catch {
      return [];
    }
  }, [cloudCtx]);

  /** FR2 item 2 — "Clear data": snapshot the ENTIRE business into
   *  trash first (the G6 backup format, verified before it is
   *  ever stored), then wipe the tenant data. The owner doc
   *  survives (modified: clearing flag cleared, demoState none,
   *  lock emptied); the structural accounts and the default
   *  warehouse survive (they are byte-identical to the backup,
   *  so the restore subset test still passes); registry,
   *  counters, memberships and events are platform data and are
   *  NOT wiped — clearing cannot evade invoice limits. The
   *  storefront snapshot and inbox are NOT touched: a published
   *  storefront stays live until the owner unpublishes it, and
   *  the panel says so. Clearing again while an ACTIVE snapshot
   *  exists refuses with reason "replace" until the caller
   *  confirms (replaceConfirmed) — the old trash is then lost.
   *  The clear window (owner-doc `clearing` flag) is closed in
   *  a finally: a half-failed wipe never strands it open, and
   *  the trash snapshot restores over any half-wipe (remaining
   *  docs are byte-identical to the backup, so the guard's
   *  subset test passes them). */
  const clearBusinessData = useCallback(async (opts?: {
    replaceConfirmed?: boolean;
  }): Promise<{
    ok: boolean;
    reason?: string;
    manifest?: TrashManifest;
    replaced?: TrashManifest | null;
  }> => {
    const ctx = cloudCtx();
    if (!ctx || roleRef.current !== "owner") return { ok: false, reason: "unavailable" };
    const { db, uid } = ctx;
    try {
      const now = new Date().toISOString();
      const existing = await readTrashManifests(db, uid);
      const replaced = clearReplacesTrash(existing, now);
      if (replaced && !opts?.replaceConfirmed) {
        return { ok: false, reason: "replace", replaced };
      }
      const backup = await exportBusinessBackup();
      if (!backup) return { ok: false, reason: "unavailable" };
      if (!verifyBackup(backup).ok) return { ok: false, reason: "corrupt" };
      if (replaced) await deleteTrashDocs(db, uid, replaced.trashId);
      const trashId = `trash-${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
      const { manifest, chunks } = trashManifestFor({
        trashId,
        backup,
        clearedAtISO: now,
        replacedTrashId: replaced?.trashId ?? null,
      });
      await setDoc(doc(db, "businessTrash", uid, "snapshots", trashId), manifest);
      for (let i = 0; i < chunks.length; i += 450) {
        const batch = writeBatch(db);
        for (const c of chunks.slice(i, i + 450)) {
          batch.set(
            doc(db, "businessTrash", uid, "snapshots", trashId, "chunks", String(c.index)),
            { index: c.index, data: c.data }
          );
        }
        await batch.commit();
      }
      await updateDoc(doc(db, "users", uid), { clearing: now });
      try {
        for (const name of TENANT_COLLECTIONS) {
          if (name === "accounts") continue;
          const snap = await getDocs(collection(db, "users", uid, name));
          const victims =
            name === "warehouses"
              ? snap.docs.filter((d) => d.id !== DEFAULT_WAREHOUSE_ID)
              : snap.docs;
          for (let i = 0; i < victims.length; i += 450) {
            const batch = writeBatch(db);
            for (const d of victims.slice(i, i + 450)) batch.delete(d.ref);
            await batch.commit();
          }
        }
      } finally {
        await updateDoc(doc(db, "users", uid), {
          clearing: deleteField(),
          demoState: "none",
          lockedThrough: "",
        });
      }
      await setDoc(doc(collection(db, "businessEvents")), {
        businessId: uid,
        kind: "data.cleared",
        actor: uid,
        at: now,
        detail: { trashId, totalDocs: manifest.totalDocs },
      });
      return { ok: true, manifest, replaced: replaced ?? null };
    } catch {
      return { ok: false, reason: "write-failed" };
    }
  }, [cloudCtx, exportBusinessBackup]);

  /** FR2 item 2 — restore from trash: the EXISTING restore
   *  pipeline, guard and all. A business that gained new data
   *  after clearing is refused with the existing
   *  "target-not-empty" reason — never merged. On success the
   *  snapshot is CONSUMED: its manifest flips to "restored" and
   *  its chunks are dropped, so it can never restore again. */
  const restoreFromTrash = useCallback(async (
    trashId: string
  ): Promise<{ ok: boolean; reason?: string }> => {
    const ctx = cloudCtx();
    if (!ctx || roleRef.current !== "owner") return { ok: false, reason: "unavailable" };
    const { db, uid } = ctx;
    try {
      const manifestSnap = await getDoc(doc(db, "businessTrash", uid, "snapshots", trashId));
      if (!manifestSnap.exists()) return { ok: false, reason: "missing" };
      const manifest = manifestSnap.data() as TrashManifest;
      const now = new Date().toISOString();
      if (!canRestoreFromTrash(manifest, now)) {
        return { ok: false, reason: trashPanelState(manifest, now) };
      }
      const chunkSnap = await getDocs(
        collection(db, "businessTrash", uid, "snapshots", trashId, "chunks")
      );
      const chunks = chunkSnap.docs.map((d) => ({
        index: Number(d.id),
        data: (d.data() as { data: string }).data,
      }));
      const json = reassembleChunks(chunks, manifest.chunkCount);
      if (!json) return { ok: false, reason: "corrupt" };
      const file = JSON.parse(json) as unknown;
      if (!verifyBackup(file).ok) return { ok: false, reason: "corrupt" };
      const plan = await planBusinessRestore(file);
      if (!plan) return { ok: false, reason: "unavailable" };
      if (!plan.ok) return { ok: false, reason: plan.reason };
      const res = await executeBusinessRestore(plan);
      if (!res.ok) return { ok: false, reason: res.reason };
      await updateDoc(doc(db, "businessTrash", uid, "snapshots", trashId), {
        status: "restored",
      });
      for (let i = 0; i < chunkSnap.docs.length; i += 450) {
        const batch = writeBatch(db);
        for (const d of chunkSnap.docs.slice(i, i + 450)) batch.delete(d.ref);
        await batch.commit();
      }
      return { ok: true };
    } catch {
      return { ok: false, reason: "write-failed" };
    }
  }, [cloudCtx, planBusinessRestore, executeBusinessRestore]);

  /** FR2 item 2 — delete a trash snapshot permanently (manifest
   *  + chunks), with its audit event. */
  const deleteTrashPermanently = useCallback(async (
    trashId: string
  ): Promise<{ ok: boolean; reason?: string }> => {
    const ctx = cloudCtx();
    if (!ctx || roleRef.current !== "owner") return { ok: false, reason: "unavailable" };
    try {
      await deleteTrashDocs(ctx.db, ctx.uid, trashId);
      await setDoc(doc(collection(ctx.db, "businessEvents")), {
        businessId: ctx.uid,
        kind: "data.trashDeleted",
        actor: ctx.uid,
        at: new Date().toISOString(),
        detail: { trashId },
      });
      return { ok: true };
    } catch {
      return { ok: false, reason: "write-failed" };
    }
  }, [cloudCtx]);

  /** FR2 item 3 — retry a failed business setup: complete the
   *  skeleton from the registry's own name/phone. Idempotent
   *  (merge-writes, fixed ids), so a repeated retry is safe. */
  const retryBusinessSetup = useCallback(async (): Promise<boolean> => {
    const ctx = cloudCtx();
    if (!ctx || roleRef.current !== "owner") return false;
    try {
      const regSnap = await getDoc(doc(ctx.db, "businesses", ctx.uid));
      if (!regSnap.exists()) return false;
      const reg = regSnap.data() as { name?: string; phone?: string; city?: string };
      await createEmptyNamespace(
        ctx.db, ctx.uid, user?.email ?? null,
        reg.name ?? "Shop", reg.phone ?? "", reg.city ?? ""
      );
      setSetupIncomplete(false);
      return true;
    } catch {
      return false;
    }
  }, [cloudCtx, user?.email]);

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
    if (!entryBalances(e)) {
      throw new Error(`Refusing to append unbalanced journal entry "${e.memo}" in demo mode.`);
    }
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
      if (!entryBalances(e)) {
        throw new Error(`Refusing to post unbalanced journal entry "${e.memo}" in postEntry.`);
      }
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
      // Phase G · G2: the client plan gate (design §4.2) — a
      // counter sale is an invoice event; it refuses here, with
      // mapped copy, before any write is composed.
      if (planInvoiceCheck()) return false;
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "sales", sale.id), { ...sale });
        batch.update(doc(ctx.db, "users", ctx.uid, "products", productId), {
          stockQty: increment(-qty),
        });
        batchLevelDelta(batch, ctx.db, ctx.uid, defWh, productId, -qty);
        postEntry(batch, entry);
        // Phase G · G2 (§4.2): the invoice counter rides the
        // counter sale's batch, paired by the rules via
        // getAfter().
        rideInvoiceCounter(batch, ctx.db, ctx.uid);
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
    [cloudCtx, appendJournalDemo, resolveAccountId, resolveSlab, qtyAtWh, applyDemoLevels, planInvoiceCheck, rideInvoiceCounter]
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
      // Phase H · H1: a points tender part is validated against
      // the DERIVED loyalty position before anything is composed.
      // The desk quotes from the same fold (lib/loyalty), so a
      // mismatch means stale state — another terminal spent the
      // points, the balance moved, the cap changed — and the save
      // refuses rather than posting a leg the liability cannot
      // cover (the insufficient-position discipline). Points are
      // stamped like a cheque part: the stamp is consumed here
      // and the journal leg is authoritative.
      const loyaltySt = resolveLoyaltySettings(settingsRef.current);
      const rawPointsParts = bill.payments.filter((p) => p.instrument === "points");
      let loyaltyLegPoints = 0;
      if (rawPointsParts.length > 0) {
        if (!bill.customerId) return false;
        const wantedPoints = rawPointsParts.reduce(
          (a, p) => a + Math.max(0, Math.floor(p.loyaltyPoints ?? 0)),
          0
        );
        const wantedRs = round2(rawPointsParts.reduce((a, p) => a + (p.amount || 0), 0));
        const quote = loyaltyRedemptionQuote(
          journalRef.current,
          bill.customerId,
          wantedPoints,
          loyaltyRedeemCapRs(bill.total, loyaltySt)
        );
        if (quote.points !== wantedPoints || Math.abs(quote.rs - wantedRs) > 0.005) {
          return false;
        }
        loyaltyLegPoints = quote.points;
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
        p.instrument === "points"
          ? {
              method: p.method,
              amount: p.amount,
              accountId: null,
              instrument: "points" as const,
              loyaltyPoints: p.loyaltyPoints ?? null,
            }
          : p.instrument === "cheque"
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
          p.instrument === "points"
            ? {
                // H1: the points leg rides INSIDE the bill entry
                // exactly like the cheque leg — Dr loyalty_payable
                // (ref = the customer) settles that share of the
                // bill against the liability, so Phase B void /
                // return mirrors reverse it with no loyalty code
                // in the mirror at all.
                account: "loyalty_payable" as const,
                debit: p.amount,
                credit: 0,
                ref: bill.customerId,
              }
            : p.instrument === "cheque"
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

      // Phase H · H1: the bill's points tender rides its payload
      // (the fold reads the count here; the rupee leg is already
      // in the lines above), and the EARN — the cost of the
      // points this bill grants — is composed by lib/loyalty (one
      // of the design's named loyalty compositions) and written in
      // this bill's OWN batch below: a bill and its earn can never
      // half-land. Walk-in bills and a disabled programme compose
      // nothing (the composer returns null).
      if (loyaltyLegPoints > 0) entry.loyaltyPointsUsed = loyaltyLegPoints;
      const loyaltyEarn = buildLoyaltyEarnEntry({
        journal: journalRef.current,
        bill: posted,
        settings: loyaltySt,
        ts: now,
      });
      guardPostings(entry, ...(loyaltyEarn ? [loyaltyEarn] : [])); // A5 choke point (before any write)
      // Phase G · G2: the client plan gate (design §4.2) — an
      // invoice event refuses HERE, with mapped copy, before
      // any write is composed (createBill and finalizeBill both
      // land in this one function, so both postings gate once).
      if (planInvoiceCheck()) return false;
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
        if (loyaltyEarn) postEntry(batch, loyaltyEarn);
        // Phase G · G2 (§4.2): the invoice counter rides the
        // posting batch — the rules pair it via getAfter().
        rideInvoiceCounter(batch, ctx.db, ctx.uid);
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
        journal: [...prev.journal, entry, ...(loyaltyEarn ? [loyaltyEarn] : [])],
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
    [cloudCtx, resolveAccountId, resolveWh, qtyAtWh, planInvoiceCheck, rideInvoiceCounter]
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

      // Phase H · H1 (§1.1/§1.4): a points-paid bill's RETURN
      // re-credits POINTS, never cash — the tender unwinds in the
      // same proportion as this give-back (fold-priced by
      // lib/loyalty, LIFO at the vintages' snapshot rates), and
      // the money split below shrinks by exactly that value: the
      // customer gets back what they actually surrendered. A VOID
      // computes no share here — it mirrors the tender whole
      // through the payments flatMap's points branch instead.
      const loyaltyShare =
        opts.kind === "return" && bill.customerId
          ? loyaltyRecreditForReturn(journalRef.current, bill, refundTotal, completesBill)
          : { points: 0, rs: 0 };
      const moneyGiveBack = round2(refundTotal - loyaltyShare.rs);

      // F-6: refunds may only eat into the bill's STILL-UNPAID udhaar
      // (its given amount, net of prior return reversals and of
      // repayments FIFO-allocated to this bill). Udhaar the customer
      // already repaid is the shop's money to hand back in cash — it
      // must never be credited out of receivables a second time.
      const creditPosition = billCreditOutstanding(creditsRef.current, bill);
      const creditReduction =
        opts.kind === "void"
          ? creditPosition.outstanding
          : Math.min(moneyGiveBack, creditPosition.outstanding);
      const cashRefund = moneyGiveBack - creditReduction;

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
                  if (p.instrument === "points") {
                    // H1: the points tender hands back as POINTS —
                    // the whole leg returns to the liability
                    // (Cr loyalty_payable, ref = the customer);
                    // the fold reads the count off the void
                    // entry's `loyaltyPointsReturned` payload.
                    return [
                      {
                        account: "loyalty_payable" as const,
                        debit: 0,
                        credit: p.amount,
                        ref: bill.customerId,
                      },
                    ];
                  }
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
        ...(loyaltyShare.rs > 0
          ? [{ account: "loyalty_payable" as const, debit: 0, credit: loyaltyShare.rs, ref: bill.customerId }]
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
      // H1: the fold reads the re-credited points count off this
      // payload — a return's proportional share, or a void's whole
      // tender (read off the bill's own entry payload).
      if (loyaltyShare.points > 0) entry.loyaltyPointsReturned = loyaltyShare.points;
      if (opts.kind === "void") {
        const usedPts =
          journalRef.current.find((e) => e.refId === bill.id && e.refType === "bill")
            ?.loyaltyPointsUsed ?? 0;
        if (usedPts > 0) entry.loyaltyPointsReturned = usedPts;
      }
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
        // H1: the points share of this give-back, stamped so the
        // NEXT return's clawback arithmetic reads prior give-backs
        // whole (refund + udhaar + points) from the docs alone.
        ...(loyaltyShare.rs > 0
          ? { loyaltyRecreditRs: loyaltyShare.rs, loyaltyRecreditPoints: loyaltyShare.points }
          : {}),
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
      // Phase H · H1 (§1.4): the clawback companion — the earn on
      // the given-back portion returns as a negative-points
      // `loyalty_earn` entry, computed cumulatively and FLOORED so
      // the remainder always stays with the customer; a completing
      // return (and every void) absorbs the earn's exact
      // remainder, and the void's companion marks the earn entry
      // reversed. Composed by lib/loyalty (a named loyalty
      // composition), posted in THIS batch — a return and its
      // clawback can never half-land. Its refId names the credit
      // note when one wraps this return, else the return itself;
      // a void's names the bill it annuls.
      const earnEntry0 = bill.customerId
        ? billLoyaltyEarnEntry(journalRef.current, bill.id)
        : null;
      const clawPoints =
        opts.kind === "void"
          ? earnEntry0
            ? (earnEntry0.points ?? 0) - billLoyaltyClawedPoints(journalRef.current, bill.id)
            : 0
          : loyaltyClawbackPoints({
              journal: journalRef.current,
              bill,
              refundTotalRs: refundTotal,
              priorRefundedRs: returnsRef.current
                .filter((r) => r.billId === bill.id)
                .reduce(
                  (a, r) => a + r.refundAmount + (r.creditReduction ?? 0) + (r.loyaltyRecreditRs ?? 0),
                  0
                ),
              completesBill,
            });
      const clawbackEntry =
        earnEntry0 && clawPoints > 0
          ? buildLoyaltyClawbackEntry({
              journal: journalRef.current,
              bill,
              clawPoints,
              refId: opts.kind === "void" ? bill.id : (note?.id ?? ret.id),
              memo:
                opts.kind === "void"
                  ? `Loyalty earn reversed — Bill #${bill.billNo} voided`
                  : `Loyalty points taken back — return on Bill #${bill.billNo}`,
              ts: now,
              reversesId: opts.kind === "void" ? earnEntry0.id : null,
            })
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
      guardPostings(entry, ...(clawbackEntry ? [clawbackEntry] : []));
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
        if (clawbackEntry) postEntry(batch, clawbackEntry);
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
        journal: [...prev.journal, entry, ...(clawbackEntry ? [clawbackEntry] : [])],
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

  /** Phase H · H1 (§1.5): post the expiry releases the DERIVED
   *  due-list names — one entry per due vintage, composed by
   *  lib/loyalty, all in one batch. Expiry is never automatic and
   *  never backdated: the releases post at today's instant under
   *  the period guard like every posting, and the liability keeps
   *  carrying unposted expiries honestly until the owner acts.
   *  Gated on the `loyalty` matrix row (owner/manager write). */
  const postLoyaltyExpiries = useCallback((): number => {
    if (!can(roleRef.current, "loyalty", "write")) return 0;
    const nowIso = new Date().toISOString();
    const due = loyaltyExpiryDue(journalRef.current, nowIso);
    if (due.length === 0) return 0;
    const names = new Map(colsRef.current.customers.map((c) => [c.id, c.name]));
    const entries = due
      .map((d) =>
        buildLoyaltyExpiryEntry({
          customerId: d.customerId,
          customerName: names.get(d.customerId) ?? d.customerId,
          vintage: d.vintage,
          ts: nowIso,
        })
      )
      .filter((e): e is JournalEntry => e !== null);
    if (entries.length === 0) return 0;
    guardPostings(...entries); // A5 choke point (before any write)
    const ctx = cloudCtx();
    if (ctx) {
      const batch = writeBatch(ctx.db);
      for (const e of entries) postEntry(batch, e);
      void batch.commit();
      return entries.length;
    }
    setCols((prev) => ({ ...prev, journal: [...prev.journal, ...entries] }));
    return entries.length;
  }, [cloudCtx]);

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
   * posts through `postBill` alone, exactly once.
   * MC Billing workflow adoption 2026-10-27 (WEB) — STOCK
   * DEDUCTION POINT = "bill" (see lib/workflow.ts): the challan
   * never deducts, the invoice deducts exactly once. */

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

  /* MC Billing workflow adoption 2026-10-27 (WEB) — customer
   * advance receipt (the receipt-split advance half). ONE
   * balanced entry, Dr money / Cr `customer_advances` with
   * ref = customerId, through the guarded choke point in the
   * same batch as nothing else (journal-only: no credits row,
   * so `customerOutstanding` — which treats every non-credit
   * row as a repayment — can never misread an advance as
   * udhaar repaid). Corrections only by reversing entry. */
  const addCustomerAdvance = useCallback(
    (c: {
      customerId: string;
      customerName: string;
      customerPhone: string;
      amount: number;
      method: "cash" | "jazzcash" | "easypaisa" | "bank";
      accountId?: string | null;
      note: string;
    }) => {
      if (!can(roleRef.current, "creditRepayment", "write")) return; // A3 guard (all counter roles pass)
      if (!c.customerId || !(c.amount > 0)) return;
      const entry = makeEntry(
        `Customer advance — ${c.customerName}${c.note ? ` — ${c.note}` : ""}`,
        "customer_advance",
        `adv-${Date.now().toString(36)}`,
        [
          {
            account: accountForMethod(c.method),
            debit: Math.round(c.amount),
            credit: 0,
            ref: resolveAccountId(c.method, c.accountId),
          },
          {
            account: "customer_advances",
            debit: 0,
            credit: Math.round(c.amount),
            ref: c.customerId,
          },
        ]
      );
      guardPostings(entry); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        postEntry(batch, entry);
        void batch.commit();
        return;
      }
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

  /* ---------------- fiscal-year close (Phase D · D4) -------- */

  /**
   * Close a fiscal year (design §4.2/§4.3): the derived checklist
   * is recomputed HERE, before composing any write — hard gates
   * (trial balance zero, purchases clearing zero) refuse, and
   * warnings refuse until the desk has acknowledged them. The
   * close itself is ONE batch: the closing entry (composed in
   * lib/fiscal, dated the FY's last day), the `periods` audit doc
   * (kind "fiscal_year", recording the pre-close lock and the
   * warnings tick), and `lockedThrough` advanced to the FY end
   * if it does not already reach it — monotonic, like every lock
   * movement. The closing entry passes the posting guard against
   * the PRE-close lock state (design §4.3's ordering note): a
   * year whose last day already sits inside an earlier lock
   * refuses whole, with nothing half-committed.
   * Owner-only (matrix row `fiscalClose` — the matrix's only
   * owner-exclusive Phase D row).
   */
  const closeFiscalYear = useCallback(
    (
      fyStartDate: string,
      opts: { note: string; ackWarnings: boolean }
    ): FiscalCloseResult => {
      if (!can(roleRef.current, "fiscalClose", "write"))
        return { ok: false, reason: "permission" };
      if (!isValidDateISO(fyStartDate)) return { ok: false, reason: "invalid" };
      const settings = settingsRef.current;
      const range = fiscalYearRange(settings, startOfDayPktInstant(fyStartDate));
      if (range.startDate !== fyStartDate) return { ok: false, reason: "invalid" };
      if (range.endDate >= todayPktISO()) return { ok: false, reason: "notpast" };
      const cols = colsRef.current;
      const state = fiscalCloseState(cols.journal, cols.periods, range);
      if (state.closed) return { ok: false, reason: "closed" };
      const checklist = fiscalYearCloseChecklist({
        journal: cols.journal,
        payrollRuns: cols.payrollRuns,
        productionOrders: cols.productionOrders,
        cheques: cols.cheques,
        products: productsRef.current,
        range,
        lockedThrough: settings.lockedThrough,
      });
      if (!checklist.hardGatesPass) return { ok: false, reason: "gate" };
      if (checklist.warningIds.length > 0 && !opts.ackWarnings)
        return { ok: false, reason: "warnings" };
      const periodId = newId("per");
      const entry = buildFiscalClosingEntry(cols.journal, range, periodId);
      if (entry) {
        try {
          guardPostings(entry); // pre-close lock state — see header
        } catch (err) {
          if (isPeriodLockedError(err)) return { ok: false, reason: "locked" };
          throw err;
        }
      }
      const cur = settings.lockedThrough ?? "";
      const lockTarget = endOfDayPktInstant(range.endDate);
      const newLock = lockTarget > cur ? lockTarget : cur;
      const period: Period = {
        id: periodId,
        kind: "fiscal_year",
        from: range.fromTs,
        to: lockTarget,
        action: "close",
        byUid: user?.uid ?? "",
        byEmail: user?.email ?? "",
        ts: new Date().toISOString(),
        note: opts.note.trim(),
        prevLockedThrough: cur,
        entryId: entry?.id ?? null,
        warningsAcked: opts.ackWarnings,
      };
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        if (entry) postEntry(batch, entry);
        batch.set(doc(ctx.db, "users", ctx.uid, "periods", period.id), { ...period });
        if (newLock !== cur)
          batch.update(doc(ctx.db, "users", ctx.uid), { lockedThrough: newLock });
        void batch.commit();
        return { ok: true };
      }
      setCols((prev) => ({
        ...prev,
        journal: entry ? [...prev.journal, entry] : prev.journal,
        periods: [...prev.periods, period],
        settings: { ...prev.settings, lockedThrough: newLock },
      }));
      return { ok: true };
    },
    [cloudCtx, user, guardPostings, postEntry]
  );

  /**
   * Fix Round 1 · F5: post the one-time opening-stock entry
   * (lib/fiscal `buildOpeningStockEntry` — Dr inventory[/raw] /
   * Cr capital), the owner path for a shop whose opening stock
   * predates its books. Gated like the fiscal close (owner-only
   * matrix row `fiscalClose`), dated today, and passed through
   * the same posting guard — a today that already sits inside a
   * period lock refuses whole. ONE entry, append-only: a wrong
   * amount is corrected later by a reversing entry, never by
   * editing this one.
   */
  const postOpeningStock = useCallback(
    (amount: number, rawShare: number): FiscalCloseResult => {
      if (!can(roleRef.current, "fiscalClose", "write"))
        return { ok: false, reason: "permission" };
      const entry = buildOpeningStockEntry(amount, rawShare);
      if (!entry) return { ok: false, reason: "invalid" };
      try {
        guardPostings(entry);
      } catch (err) {
        if (isPeriodLockedError(err)) return { ok: false, reason: "locked" };
        throw err;
      }
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        postEntry(batch, entry);
        void batch.commit();
        return { ok: true };
      }
      setCols((prev) => ({ ...prev, journal: [...prev.journal, entry] }));
      return { ok: true };
    },
    [cloudCtx, guardPostings, postEntry]
  );

  /**
   * Reopen a closed fiscal year (design §4.4): the closing
   * entry's exact mirror (dated today — a reversal never
   * backdates into the lock the close set), a `periods` reopen
   * doc citing the close it unwinds, and `lockedThrough`
   * restored to the close doc's `prevLockedThrough` — one batch.
   * Refused when the year is not closed, and when a LATER year
   * is still closed (closes unwind in reverse order only — the
   * stack discipline). The journal keeps both events forever.
   */
  const reopenFiscalYear = useCallback(
    (fyStartDate: string, reason: string): FiscalCloseResult => {
      if (!can(roleRef.current, "fiscalClose", "write"))
        return { ok: false, reason: "permission" };
      if (!reason.trim()) return { ok: false, reason: "reason" };
      if (!isValidDateISO(fyStartDate)) return { ok: false, reason: "invalid" };
      const settings = settingsRef.current;
      const range = fiscalYearRange(settings, startOfDayPktInstant(fyStartDate));
      if (range.startDate !== fyStartDate) return { ok: false, reason: "invalid" };
      const cols = colsRef.current;
      const state = fiscalCloseState(cols.journal, cols.periods, range);
      if (!state.closed || !state.closeDoc) return { ok: false, reason: "notclosed" };
      if (fiscalReopenBlocker(cols.journal, cols.periods, state.closeDoc))
        return { ok: false, reason: "stack" };
      const nowTs = new Date().toISOString();
      const mirror = state.entry
        ? buildFiscalReopenEntry(state.entry, nowTs)
        : null;
      if (mirror) {
        try {
          guardPostings(mirror);
        } catch (err) {
          if (isPeriodLockedError(err)) return { ok: false, reason: "locked" };
          throw err;
        }
      }
      const cur = settings.lockedThrough ?? "";
      const restored = state.closeDoc.prevLockedThrough ?? "";
      const period: Period = {
        id: newId("per"),
        kind: "fiscal_year",
        from: state.closeDoc.from,
        to: state.closeDoc.to,
        action: "reopen",
        byUid: user?.uid ?? "",
        byEmail: user?.email ?? "",
        ts: nowTs,
        note: reason.trim(),
        prevLockedThrough: cur,
        entryId: mirror?.id ?? null,
        reopensPeriodId: state.closeDoc.id,
      };
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        if (mirror) postEntry(batch, mirror);
        batch.set(doc(ctx.db, "users", ctx.uid, "periods", period.id), { ...period });
        batch.update(doc(ctx.db, "users", ctx.uid), { lockedThrough: restored });
        void batch.commit();
        return { ok: true };
      }
      setCols((prev) => ({
        ...prev,
        journal: mirror ? [...prev.journal, mirror] : prev.journal,
        periods: [...prev.periods, period],
        settings: { ...prev.settings, lockedThrough: restored },
      }));
      return { ok: true };
    },
    [cloudCtx, user, guardPostings, postEntry]
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

  /* ---------------- loans (Phase D · D3) ----------------
   * Design §3: one register, two directions. A loan is BORN
   * with its drawdown (doc + entry + opening diary events in
   * ONE batch — a cloud loan never exists journalless, §10.3);
   * charges accrue only as discrete desk-confirmed events, one
   * per instalment; repayments carry their principal/charge
   * split on the diary (attribution), never on the journal
   * lines; corrections are mirror entries with negated diary
   * events — the journal and the diary are both append-only.
   * Write-offs do not exist (§3.4: no gain/loss code, and a
   * waiver is never faked as a repayment). Every action gates
   * on the `loans` matrix row (owner/accountant write, manager
   * read — the A3 row, consumed unchanged). */

  /** Shared dual-path writer: loan doc + its entries, one batch. */
  const commitLoan = useCallback(
    (loan: Loan, entries: JournalEntry[]): void => {
      guardPostings(...entries); // A5 choke point (before any write)
      const ctx = cloudCtx();
      if (ctx) {
        const batch = writeBatch(ctx.db);
        batch.set(doc(ctx.db, "users", ctx.uid, "loans", loan.id), { ...loan });
        for (const e of entries) postEntry(batch, e);
        void batch.commit();
        return;
      }
      setCols((prev) => ({
        ...prev,
        loans: prev.loans.some((l) => l.id === loan.id)
          ? prev.loans.map((l) => (l.id === loan.id ? loan : l))
          : [...prev.loans, loan],
        journal: [...prev.journal, ...entries],
      }));
    },
    [cloudCtx, guardPostings, postEntry]
  );

  const createLoan = useCallback(
    (input: {
      direction: LoanDirection;
      partyName: string;
      partyId?: string | null;
      principal: number;
      chargeType: Loan["chargeType"];
      chargeRate: number;
      feeAmount: number;
      startDateISO: string;
      instalmentCount: number;
      instalmentEvery: Loan["instalmentEvery"];
      firstDueISO: string;
      method: PayMethod;
      accountId?: string | null;
      note?: string;
    }): string | null => {
      if (!can(roleRef.current, "loans", "write")) return null;
      if (input.method === "credit") return null; // money methods only
      const principal = Math.round((input.principal + Number.EPSILON) * 100) / 100;
      const feeAmount = Math.round((input.feeAmount + Number.EPSILON) * 100) / 100;
      const terms = {
        direction: input.direction,
        partyName: input.partyName,
        principal,
        chargeType: input.chargeType,
        chargeRate: input.chargeRate,
        feeAmount,
        instalmentCount: Math.floor(input.instalmentCount),
      };
      // Composition refusals (§3.2/§3.4) — charged receivable
      // lending included: refused here, never silently zeroed.
      if (loanTermsError(terms)) return null;
      if (!isISODate(input.startDateISO) || !isISODate(input.firstDueISO)) {
        return null;
      }
      const number = nextDocNumber(
        "loan",
        colsRef.current.loans.map((l) => l.number),
        settingsRef.current
      );
      const accountId = resolveAccountId(input.method, input.accountId);
      const loan: Loan = {
        id: newId("loan"),
        number,
        direction: input.direction,
        partyName: input.partyName.trim(),
        partyId: input.partyId ?? null,
        principal,
        chargeType: input.chargeType,
        chargeRate: input.chargeType === "flat" || input.chargeType === "reducing"
          ? input.chargeRate
          : 0,
        chargeAmount: loanChargeAmount(terms),
        startDateISO: input.startDateISO,
        instalmentCount: terms.instalmentCount,
        instalmentEvery: input.instalmentEvery,
        firstDueISO: input.firstDueISO,
        events: [],
        status: "active",
        note: input.note?.trim() ?? "",
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      const entry = buildLoanDrawdownEntry(loan, {
        method: input.method,
        accountId,
        feeAmount,
      });
      const now = new Date().toISOString();
      const events: LoanEvent[] = [
        {
          kind: "drawdown",
          amount: principal,
          principalPart: principal,
          chargePart: 0,
          accountId,
          entryId: entry.id,
          dayOffset: 0,
          ts: now,
        },
      ];
      if (feeAmount > 0) {
        // The fee leg of the SAME entry (§3.4): expensed at
        // drawdown, netted from the proceeds — never an accrual.
        events.push({
          kind: "fee",
          amount: feeAmount,
          principalPart: 0,
          chargePart: feeAmount,
          accountId,
          entryId: entry.id,
          dayOffset: 0,
          ts: now,
        });
      }
      commitLoan({ ...loan, events }, [entry]);
      return loan.id;
    },
    [commitLoan, resolveAccountId]
  );

  const accrueLoanCharge = useCallback(
    (loanId: string, instalmentN: number): boolean => {
      if (!can(roleRef.current, "loans", "write")) return false;
      const cur = colsRef.current.loans.find((l) => l.id === loanId);
      if (!cur || cur.status !== "active" || cur.direction !== "payable") {
        return false;
      }
      if (cur.chargeType !== "flat" && cur.chargeType !== "reducing") {
        return false;
      }
      // Ordinal discipline (§3.4): charges accrue in due order,
      // one event per instalment — the desk confirms the NEXT
      // un-accrued instalment, never a later one, never twice.
      if (instalmentN !== accruedChargeCount(cur) + 1) return false;
      const instalment = loanSchedule(cur).find((i) => i.n === instalmentN);
      if (!instalment || !(instalment.chargePart > 0)) return false;
      const entry = buildLoanChargeEntry(cur, { instalment });
      const event: LoanEvent = {
        kind: "charge",
        amount: instalment.chargePart,
        principalPart: 0,
        chargePart: instalment.chargePart,
        accountId: null,
        entryId: entry.id,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      commitLoan({ ...cur, events: [...cur.events, event] }, [entry]);
      return true;
    },
    [commitLoan]
  );

  const repayLoan = useCallback(
    (
      loanId: string,
      input: {
        amount: number;
        method: PayMethod;
        accountId?: string | null;
        principalPart?: number;
        chargePart?: number;
      }
    ): boolean => {
      if (!can(roleRef.current, "loans", "write")) return false;
      if (input.method === "credit") return false; // money methods only
      const amount = Math.round((input.amount + Number.EPSILON) * 100) / 100;
      if (!Number.isFinite(amount) || !(amount > 0)) return false;
      const cur = colsRef.current.loans.find((l) => l.id === loanId);
      if (!cur || cur.status !== "active") return false;
      // The split is attribution (§3.3): charges-first by
      // default, desk-overridable — validated against the
      // derived position, and overpayment beyond the derived
      // outstanding refuses pre-composition (§3.4).
      const split =
        input.principalPart !== undefined && input.chargePart !== undefined
          ? {
              principalPart:
                Math.round((input.principalPart + Number.EPSILON) * 100) / 100,
              chargePart:
                Math.round((input.chargePart + Number.EPSILON) * 100) / 100,
            }
          : defaultRepaymentSplit(cur, amount);
      if (repaymentSplitError(cur, amount, split)) return false;
      const accountId = resolveAccountId(input.method, input.accountId);
      const entry = buildLoanRepaymentEntry(cur, {
        amount,
        method: input.method,
        accountId,
      });
      const event: LoanEvent = {
        kind: "repayment",
        amount,
        principalPart: split.principalPart,
        chargePart: split.chargePart,
        accountId,
        entryId: entry.id,
        dayOffset: 0,
        ts: new Date().toISOString(),
      };
      const next: Loan = { ...cur, events: [...cur.events, event] };
      commitLoan({ ...next, status: loanStatusFor(next) }, [entry]);
      return true;
    },
    [commitLoan, resolveAccountId]
  );

  const reverseLoanEvent = useCallback(
    (loanId: string, entryId: string): boolean => {
      if (!can(roleRef.current, "loans", "write")) return false;
      const cur = colsRef.current.loans.find((l) => l.id === loanId);
      if (!cur) return false;
      // Every standing event the entry posted (a drawdown and
      // its netted fee share one entry — they reverse together,
      // because the mirror reverses the whole entry).
      const standing = cur.events.filter(
        (ev) => ev.entryId === entryId && ev.amount > 0
      );
      if (standing.length === 0) return false;
      const journal = journalRef.current;
      if (journal.some((e) => e.reversesId === entryId)) return false;
      const original = journal.find((e) => e.id === entryId);
      if (!original) return false;
      const kinds = new Set(standing.map((ev) => ev.kind));
      if (kinds.has("drawdown")) {
        // Stack discipline: a drawdown reverses only when no
        // repayment or charge stands against it — those reverse
        // first. The loan then reads cancelled (§3.3).
        const othersStanding = cur.events.some(
          (ev) =>
            ev.entryId !== entryId &&
            ev.amount > 0 &&
            (ev.kind === "repayment" || ev.kind === "charge")
        );
        if (othersStanding) return false;
      }
      const mirror = buildMirrorEntry(
        original,
        `Loan reversal ${cur.number} — ${cur.partyName}`
      );
      const now = new Date().toISOString();
      const negated: LoanEvent[] = standing.map((ev) => ({
        ...ev,
        amount: -ev.amount,
        principalPart: -ev.principalPart,
        chargePart: -ev.chargePart,
        entryId: mirror.id,
        dayOffset: 0,
        ts: now,
      }));
      const next: Loan = { ...cur, events: [...cur.events, ...negated] };
      commitLoan(
        {
          ...next,
          status: kinds.has("drawdown") ? "cancelled" : loanStatusFor(next),
        },
        [mirror]
      );
      return true;
    },
    [commitLoan]
  );

  const deleteLoan = useCallback(
    (id: string): boolean => {
      // Rules mirror: loans delete is owner-only, and the store
      // additionally enforces never-used (no diary events) —
      // a loan that moved money is a posted record (§6.2).
      if (roleRef.current !== "owner") return false;
      const cur = colsRef.current.loans.find((l) => l.id === id);
      if (!cur || cur.events.length > 0) return false;
      removeDoc("loans", id);
      return true;
    },
    [removeDoc]
  );

  const saveDayClose = useCallback(
    (d: Omit<DayClose, "id" | "ts" | "dayOffset">) => {
      if (!can(roleRef.current, "dayClose", "write")) return; // A3 guard
      const row: DayClose = { ...d, id: newId("dc"), dayOffset: 0, ts: new Date().toISOString() };
      putDoc("dayCloses", row);
    },
    [putDoc]
  );

  /* ---------------- brand assets (Phase E · E2) ----------------
   * Owner-only writes (design §5: the rules carry the same gate —
   * read canAccess, write isOwner). The asset arrives fully
   * formed from the lib/branding pipeline with its cap already
   * enforced; the store re-pins the doc id to the kind (the
   * fixed-id discipline) so a slot can never fork into two docs.
   * Assets assert no history: replace overwrites the same doc,
   * removal deletes it, and past prints are paper, not data. */
  const setBrandingAsset = useCallback(
    (asset: BrandingAsset) => {
      if (roleRef.current !== "owner") return;
      putDoc("branding", { ...asset, id: asset.kind });
    },
    [putDoc]
  );

  const removeBrandingAsset = useCallback(
    (kind: BrandingAssetKind) => {
      if (roleRef.current !== "owner") return;
      removeDoc("branding", kind);
    },
    [removeDoc]
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

  /* ---------------- Phase H · H3: the storefront ----------------
   * Design §2. The publish write is the owner's alone (rules v10
   * key it to the uid in the doc's businessId); conversion and
   * dismissal are member acts on the `storefront` matrix row,
   * and conversion additionally rides the `saleOrders` row (it
   * births an SO). NOTHING here composes a journal entry: the
   * inbox is paper, the SO is a Phase B document, and money
   * exists only when a bill is later posted from that SO
   * through the ordinary desks. Demo mode refuses every write —
   * demo publishes nothing and takes no orders (§5.3). */

  const publishStorefront = useCallback(
    async (input: {
      slug?: string;
      tagline?: string | null;
      notice?: string | null;
      excludedProductIds: string[];
      includeProductIds: string[];
    }): Promise<{ ok: boolean; reason?: string }> => {
      const ctx = cloudCtx();
      if (!ctx || roleRef.current !== "owner") {
        return { ok: false, reason: "unavailable" };
      }
      const prev = storefrontRef.current;
      const slug = prev ? prev.slug : (input.slug ?? "").trim();
      if (!prev) {
        const problem = slugProblem(slug);
        if (problem) return { ok: false, reason: `slug-${problem}` };
      }
      const logo = colsRef.current.branding.find((b) => b.kind === "logo");
      const snapshot = assembleStorefrontSnapshot({
        businessId: ctx.uid,
        slug,
        settings: settingsRef.current,
        city: planRegistryRef.current?.city ?? null,
        logoDataUrl: logo?.dataUrl ?? null,
        products: productsRef.current,
        excludedProductIds: input.excludedProductIds,
        includeProductIds: input.includeProductIds,
        tagline: input.tagline,
        notice: input.notice,
        previous: prev,
        nowISO: new Date().toISOString(),
      });
      try {
        await setDoc(doc(ctx.db, "storefronts", slug), { ...snapshot });
        // The slug label rides the owner doc so print/link seams
        // can render the store link without a platform read.
        updateSettings({ storefrontSlug: slug });
        return { ok: true };
      } catch {
        return { ok: false, reason: "write-failed" };
      }
    },
    [cloudCtx, updateSettings]
  );

  const unpublishStorefront = useCallback(async (): Promise<{
    ok: boolean;
    reason?: string;
  }> => {
    const ctx = cloudCtx();
    const prev = storefrontRef.current;
    if (!ctx || roleRef.current !== "owner" || !prev) {
      return { ok: false, reason: "unavailable" };
    }
    try {
      await setDoc(doc(ctx.db, "storefronts", prev.slug), {
        ...prev,
        enabled: false,
        updatedAt: new Date().toISOString(),
      });
      return { ok: true };
    } catch {
      return { ok: false, reason: "write-failed" };
    }
  }, [cloudCtx]);

  const setStorefrontAutoRepublish = useCallback(
    (on: boolean) => {
      updateSettings({ storefront: { autoRepublish: on } });
    },
    [updateSettings]
  );

  /* §2.2's client setting: while the store is live and the owner
   * opted in, a product change re-publishes — but only when the
   * PUBLIC content actually moved (storefrontContentEqual), so
   * the subscription's own echo never loops a write. */
  const autoRepublishTick = useCallback(async () => {
    const ctx = cloudCtx();
    const prev = storefrontRef.current;
    if (!ctx || roleRef.current !== "owner" || !prev || !prev.enabled) return;
    if (settingsRef.current.storefront?.autoRepublish !== true) return;
    const logo = colsRef.current.branding.find((b) => b.kind === "logo");
    const next = assembleStorefrontSnapshot({
      businessId: ctx.uid,
      slug: prev.slug,
      settings: settingsRef.current,
      city: planRegistryRef.current?.city ?? null,
      logoDataUrl: logo?.dataUrl ?? null,
      products: productsRef.current,
      previous: prev,
      nowISO: new Date().toISOString(),
    });
    if (storefrontContentEqual(prev, next)) return;
    try {
      await setDoc(doc(ctx.db, "storefronts", prev.slug), { ...next });
    } catch {
      /* best effort — the desk's manual Republish remains */
    }
  }, [cloudCtx]);

  useEffect(() => {
    if (!cloud) return;
    const h = setTimeout(() => void autoRepublishTick(), 1200);
    return () => clearTimeout(h);
  }, [cloud, products, autoRepublishTick]);

  const convertStoreOrder = useCallback(
    async (
      orderId: string
    ): Promise<{ ok: boolean; reason?: string; soNumber?: string }> => {
      if (
        !can(roleRef.current, "storefront", "write") ||
        !can(roleRef.current, "saleOrders", "write")
      ) {
        return { ok: false, reason: "forbidden" };
      }
      const order = storeOrdersRef.current.find((o) => o.id === orderId);
      if (!order || order.state !== "new") {
        return { ok: false, reason: "not-new" };
      }
      // Re-plan at the moment of the act — never trust a plan
      // the screen composed earlier against staler data.
      const plan = planStoreConversion(
        order,
        storefrontRef.current,
        productsRef.current,
        colsRef.current.customers
      );
      if (!plan) return { ok: false, reason: "nothing-to-convert" };
      const nowISO = new Date().toISOString();
      const number = nextDocNumber(
        "saleOrder",
        colsRef.current.saleOrders.map((o) => o.number),
        settingsRef.current
      );
      // Resolve the customer: the phone match when one exists,
      // else a new customer born from the order's own details —
      // in the SAME batch as the SO and the state flip.
      // Phase H · H6 (audit fix 2): storefront consent is applied
      // HERE, when the order's customer is resolved — from the
      // ORDER's own waOptIn flag, the customer's tick on the
      // public checkout form, and from nothing else. An order
      // without the flag stamps nothing: consent is never
      // inferred from an order's existence or asserted by the
      // desk on the customer's behalf.
      const consent =
        order.waOptIn === true
          ? waConsentPatch("storefront", true, nowISO)
          : null;
      let customerId = plan.customer?.id ?? null;
      let newCustomer: Customer | null = null;
      if (!plan.customer) {
        newCustomer = {
          id: newId("cu"),
          name: order.customerName,
          phone: order.phone,
          address: "",
          note: "",
          ts: nowISO,
          ...(consent ?? {}),
        };
        customerId = newCustomer.id;
      }
      const soFields = buildStoreSaleOrder(order, plan, {
        number,
        customerId,
        customerName: plan.customer?.name ?? order.customerName,
        customerPhone: plan.customer?.phone ?? order.phone,
        products: productsRef.current,
        taxSlabs: taxSlabsRef.current,
        settings: settingsRef.current,
        nowISO,
      });
      const so: SaleOrder = { ...soFields, id: newId("so") };
      const ctx = cloudCtx();
      if (ctx) {
        try {
          const batch = writeBatch(ctx.db);
          if (newCustomer) {
            batch.set(
              doc(ctx.db, "users", ctx.uid, "customers", newCustomer.id),
              { ...newCustomer }
            );
          } else if (consent && plan.customer) {
            batch.update(
              doc(ctx.db, "users", ctx.uid, "customers", plan.customer.id),
              { ...consent }
            );
          }
          batch.set(doc(ctx.db, "users", ctx.uid, "saleOrders", so.id), { ...so });
          batch.update(doc(ctx.db, "storeOrders", order.id), {
            state: "converted",
            convertedSoId: so.id,
            convertedBy: user?.uid ?? "",
            convertedAt: nowISO,
          });
          await batch.commit();
          return { ok: true, soNumber: number };
        } catch {
          return { ok: false, reason: "write-failed" };
        }
      }
      // Demo mode holds no inbox (the preview takes no orders),
      // so this path is unreachable in practice; it exists so
      // the action is total over the store's modes.
      return { ok: false, reason: "unavailable" };
    },
    [cloudCtx, user]
  );

  const dismissStoreOrder = useCallback(
    async (orderId: string): Promise<{ ok: boolean; reason?: string }> => {
      if (!can(roleRef.current, "storefront", "write")) {
        return { ok: false, reason: "forbidden" };
      }
      const order = storeOrdersRef.current.find((o) => o.id === orderId);
      if (!order || order.state !== "new") {
        return { ok: false, reason: "not-new" };
      }
      const ctx = cloudCtx();
      if (!ctx) return { ok: false, reason: "unavailable" };
      try {
        await updateDoc(doc(ctx.db, "storeOrders", order.id), {
          state: "dismissed",
          dismissedBy: user?.uid ?? "",
          dismissedAt: new Date().toISOString(),
        });
        return { ok: true };
      } catch {
        return { ok: false, reason: "write-failed" };
      }
    },
    [cloudCtx, user]
  );

  /* ---------------- Phase H · WhatsApp marketing ----------------
   * Design §3: the organisation of marketing — consent,
   * templates, campaigns, the send queue, the log — as tenant
   * collections written through the generic putDoc path (demo:
   * local state, hermetic by construction; the send step opens
   * wa.me in the shopkeeper's own WhatsApp in both modes, §5.3).
   * NOTHING here composes a journal entry: marketing moves no
   * money, and the makeEntry site count stays exactly 24. */
  const waPlanViewNow = (): PlanView | null =>
    planRegistryRef.current
      ? planViewOf(
          planRegistryRef.current,
          planCountersRef.current,
          new Date().toISOString()
        )
      : null;

  const saveWaTemplate = useCallback(
    (input: {
      id?: string;
      name: string;
      kind: WaTemplateKind;
      body: string;
    }): string => {
      if (!can(roleRef.current, "whatsapp", "write")) return "";
      const now = new Date().toISOString();
      const existing = input.id
        ? colsRef.current.waTemplates.find((x) => x.id === input.id)
        : undefined;
      const tpl: WaTemplate = {
        id: input.id ?? newId("wt"),
        name: input.name.trim(),
        kind: input.kind,
        body: input.body,
        createdBy: existing?.createdBy ?? user?.uid ?? "",
        ts: existing?.ts ?? now,
      };
      if (!tpl.name || !tpl.body.trim()) return "";
      putDoc("waTemplates", tpl);
      return tpl.id;
    },
    [putDoc, user]
  );

  const deleteWaTemplate = useCallback(
    (id: string) => {
      if (!can(roleRef.current, "whatsapp", "write")) return;
      removeDoc("waTemplates", id);
    },
    [removeDoc]
  );

  const createWaCampaign = useCallback(
    (input: { name: string; templateId: string; audience: WaAudience }): string => {
      if (!can(roleRef.current, "whatsapp", "write")) return "";
      if (!input.name.trim() || !input.templateId) return "";
      const campaign: WaCampaign = {
        id: newId("wc"),
        name: input.name.trim(),
        templateId: input.templateId,
        audience: input.audience,
        resolvedCount: null,
        createdBy: user?.uid ?? "",
        ts: new Date().toISOString(),
        state: "draft",
      };
      putDoc("waCampaigns", campaign);
      return campaign.id;
    },
    [putDoc, user]
  );

  const launchWaCampaign = useCallback(
    (campaignId: string): { ok: boolean; reason?: string; count?: number } => {
      if (!can(roleRef.current, "whatsapp", "write")) {
        return { ok: false, reason: "forbidden" };
      }
      const cols = colsRef.current;
      const campaign = cols.waCampaigns.find((c) => c.id === campaignId);
      if (!campaign || campaign.state !== "draft") {
        return { ok: false, reason: "not-draft" };
      }
      if (!cols.waTemplates.some((x) => x.id === campaign.templateId)) {
        return { ok: false, reason: "no-template" };
      }
      // The plan gates read the ASSIGNMENT SNAPSHOT (lib/whatsapp
      // mirrors the doctrine): a shop whose snapshot lacks the
      // module is refused even if today's catalogue grants it,
      // and a lapsed plan pauses sending — never reading.
      const pv = waPlanViewNow();
      if (!waModuleAllowed(pv)) return { ok: false, reason: "plan-module" };
      if (!waSendingAllowed(pv)) return { ok: false, reason: "plan-state" };
      const plan = planWaLaunch(
        campaign,
        {
          customers: cols.customers,
          credits: cols.credits,
          journal: cols.journal,
          bills: cols.bills,
          saleOrders: cols.saleOrders,
          jobs: cols.jobs,
          settings: settingsRef.current,
          nowISO: new Date().toISOString(),
        },
        () => newId("ws")
      );
      for (const s of plan.sends) putDoc("waSends", s);
      const launched: WaCampaign = {
        ...campaign,
        state: "sending",
        resolvedCount: plan.resolvedCount,
      };
      putDoc("waCampaigns", launched);
      return { ok: true, count: plan.resolvedCount };
    },
    [putDoc]
  );

  const advanceWaSend = useCallback(
    (
      campaignId: string,
      act: "opened" | "sent",
      afterId?: string | null
    ): { ok: boolean; reason?: string; outcome?: WaSend["state"] } => {
      if (!can(roleRef.current, "whatsapp", "write")) {
        return { ok: false, reason: "forbidden" };
      }
      const cols = colsRef.current;
      const campaign = cols.waCampaigns.find((c) => c.id === campaignId);
      if (!campaign || campaign.state !== "sending") {
        return { ok: false, reason: "not-sending" };
      }
      const sends = cols.waSends
        .filter((s) => s.campaignId === campaignId)
        .sort((a, b) => a.ts.localeCompare(b.ts) || a.id.localeCompare(b.id));
      const step = waQueueStep(sends, cols.customers, afterId ?? null);
      if (!step) return { ok: false, reason: "queue-empty" };
      // A sendable head under a paused plan refuses BEFORE any
      // write (invariant 5: sending degrades; reading and the
      // log's truth do not — a skip verdict below still records,
      // because it sends nothing).
      if (step.action === "send" && !waSendingAllowed(waPlanViewNow())) {
        return { ok: false, reason: "plan-state" };
      }
      const next = waSendTransition(step.send, act, step.customer);
      putDoc("waSends", next);
      const after = sends.map((s) => (s.id === next.id ? next : s));
      if (waCampaignProgress(after).complete) {
        const closed: WaCampaign = { ...campaign, state: "done" };
        putDoc("waCampaigns", closed);
      }
      return { ok: true, outcome: next.state };
    },
    [putDoc]
  );

  const finishWaCampaign = useCallback(
    (campaignId: string) => {
      if (!can(roleRef.current, "whatsapp", "write")) return;
      const campaign = colsRef.current.waCampaigns.find(
        (c) => c.id === campaignId
      );
      if (campaign && campaign.state === "sending") {
        const closed: WaCampaign = { ...campaign, state: "done" };
        putDoc("waCampaigns", closed);
      }
    },
    [putDoc]
  );

  const setCustomerWaConsent = useCallback(
    (customerId: string, agreed: boolean, source: WaConsentSource) => {
      // Rides updateCustomer's own customersManage guard.
      updateCustomer(
        customerId,
        waConsentPatch(source, agreed, new Date().toISOString())
      );
    },
    [updateCustomer]
  );

  const setWaServiceIntervalDays = useCallback(
    (days: number) => {
      const resolved = resolveWaSettings({
        whatsapp: { serviceIntervalDays: days },
      });
      updateSettings({
        whatsapp: { serviceIntervalDays: resolved.serviceIntervalDays },
      });
    },
    [updateSettings]
  );

  /**
   * A3 staff management (design §3.1), on the G1 tenancy write set
   * (design §1.3). Every change writes the owner doc's `staff[]`
   * (management record) and the `staffEmails` mirror (the leg both
   * published rule versions resolve through) in ONE batch, plus —
   * since G1 — the platform grant: adding staff writes a
   * `businessInvites` doc (the invitee's own client claims it into
   * a uid-keyed membership at their next sign-in) and a
   * `businessEvents` audit entry; role changes land on the invite
   * or membership the member actually has (a pre-G legacy member
   * with neither keeps the A3 `staffIndex` write); removal deletes
   * the index doc, the invite and the membership together with
   * both lists — revocation stays instant on the next read.
   * Owner-only: the store refuses for every staff role, and the
   * rules refuse server-side as well.
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
        // Phase G · G2: the member-cap pre-check (design §4.2)
        // — under enforcement a full house refuses here with
        // mapped copy, before any write is composed. (Checked
        // before the batch: the seat is created by the invite
        // write below, and the cap counts seats + the owner.)
        const reg = planRegistryRef.current;
        if (reg) {
          const refusal = planMemberRefusal(reg, planCountersRef.current);
          if (refusal) {
            setPlanRefusal(refusal);
            return;
          }
        }
        const batch = writeBatch(ctx.db);
        batch.update(doc(ctx.db, "users", ctx.uid), {
          staffEmails: arrayUnion(email),
          staff,
        });
        // Phase G · G1 (design §1.3): the grant is an INVITE —
        // claimed into a membership by the invitee's own client
        // at their next sign-in (the rules gate the claim by
        // email ownership). staffIndex is no longer written by
        // addStaff: the legacy leg keeps serving pre-G staff, and
        // an unclaimed invite confers nothing.
        batch.set(doc(ctx.db, "businessInvites", ctx.uid, "invites", email), {
          email,
          role: staffRole,
          status: "pending",
          invitedBy: ctx.uid,
          createdAt: member.addedAt,
        });
        // Phase G · G2 (§4.2): the seat is created WITH the
        // invite — memberCount +1 rides this batch, paired by
        // the invites create leg via getAfter().
        rideMemberCounter(batch, ctx.db, ctx.uid, 1);
        batch.set(doc(collection(ctx.db, "businessEvents")), {
          businessId: ctx.uid,
          kind: "invite.created",
          actor: ctx.uid,
          at: member.addedAt,
          detail: { email, role: staffRole },
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
    [cloudCtx, rideMemberCounter]
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
        // G1: the role lives on the invite (pending) or the
        // membership (claimed) — whichever this member has. A
        // member with NEITHER is a pre-G legacy member: their
        // staffIndex doc gets the role, exactly as A3 wrote it.
        const inv = invitesRef.current.find((i) => i.email === email);
        const mem = membershipsRef.current.find((m) => m.email === email);
        if (inv) {
          batch.set(
            doc(ctx.db, "businessInvites", ctx.uid, "invites", email),
            { role: staffRole },
            { merge: true }
          );
        }
        if (mem) {
          batch.set(
            doc(ctx.db, "businessMembers", ctx.uid, "members", mem.memberUid),
            { role: staffRole },
            { merge: true }
          );
        }
        if (!inv && !mem) {
          batch.set(
            doc(ctx.db, "staffIndex", email),
            { ownerUid: ctx.uid, email, role: staffRole },
            { merge: true }
          );
        }
        batch.set(doc(collection(ctx.db, "businessEvents")), {
          businessId: ctx.uid,
          kind: "membership.roleChanged",
          actor: ctx.uid,
          at: new Date().toISOString(),
          detail: { email, role: staffRole },
        });
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
        // G1: the G-era grants die in the same batch — the invite
        // (if never claimed) and the membership (if claimed). The
        // mirror cut above already denies BOTH access legs on the
        // member's next read; these deletes make it structural,
        // and the removed member's live session loses the shop
        // when its membership watcher re-resolves.
        const inv = invitesRef.current.find((i) => i.email === email);
        if (inv) {
          batch.delete(doc(ctx.db, "businessInvites", ctx.uid, "invites", email));
        }
        const mem = membershipsRef.current.find((m) => m.email === email);
        if (mem) {
          batch.delete(
            doc(ctx.db, "businessMembers", ctx.uid, "members", mem.memberUid)
          );
        }
        // Phase G · G2 (§4.2): removing a member who holds a
        // grant (invite or membership) frees the seat —
        // memberCount −1 rides this batch ONCE; the invites and
        // members delete legs both validate the same net −1. A
        // pre-G legacy removal (neither grant exists) carries
        // no counter write: no seat was ever counted for them.
        if (inv || mem) rideMemberCounter(batch, ctx.db, ctx.uid, -1);
        batch.set(doc(collection(ctx.db, "businessEvents")), {
          businessId: ctx.uid,
          kind: "membership.removed",
          actor: ctx.uid,
          at: new Date().toISOString(),
          detail: { email },
        });
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
    [cloudCtx, rideMemberCounter]
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
      memberships,
      invites,
      planView,
      planRefusal,
      clearPlanRefusal,
      ownPayments,
      platformConfig,
      suspensionReason,
      submitRenewalPayment,
      exportBusinessBackup,
      planBusinessRestore,
      executeBusinessRestore,
      demoClass,
      addDemoData,
      resetDemoData,
      listTrash,
      clearBusinessData,
      restoreFromTrash,
      deleteTrashPermanently,
      setupIncomplete,
      retryBusinessSetup,
      storefront,
      storeOrders,
      publishStorefront,
      unpublishStorefront,
      setStorefrontAutoRepublish,
      convertStoreOrder,
      dismissStoreOrder,
      saveWaTemplate,
      deleteWaTemplate,
      createWaCampaign,
      launchWaCampaign,
      advanceWaSend,
      finishWaCampaign,
      setCustomerWaConsent,
      setWaServiceIntervalDays,
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
      postLoyaltyExpiries,
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
      addCustomerAdvance,
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
      closeFiscalYear,
      postOpeningStock,
      reopenFiscalYear,
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
      createLoan,
      accrueLoanCharge,
      repayLoan,
      reverseLoanEvent,
      deleteLoan,
      recordAdjustment,
      saveDayClose,
      updateSettings,
      setBrandingAsset,
      removeBrandingAsset,
      addStaff,
      setStaffRole,
      removeStaff,
      importProducts,
    }),
    [
      ready, products, sales, cols, role, isStaff,
      addProduct, updateProduct, deleteProduct, adjustStock, recordSale, resetDemo,
      createBill, holdBill, finalizeBill, discardHeldBill, voidBill, postLoyaltyExpiries, returnItems,
      returnItemsWithNote,
      addSupplier, updateSupplier, deleteSupplier, recordPurchase, recordPurchaseReturn, recordSupplierPayment,
      createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder,
      issuePurchaseOrder, cancelPurchaseOrder, receiveAgainstPo,
      addCustomer, updateCustomer, deleteCustomer, addCredit, addRepayment, addCustomerAdvance,
      depositCheque, clearCheque, bounceCheque, returnCheque,
      addExpense, updateExpense, deleteExpense, addCashEntry,
      addMoneyAccount, renameMoneyAccount, archiveMoneyAccount,
      setDefaultMoneyAccount, transferFunds,
      addTaxSlab, updateTaxSlab, deleteTaxSlab, setTaxDefault, recordTaxPayment,
      closePeriod, reopenPeriod,
      closeFiscalYear, reopenFiscalYear, postOpeningStock,
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
      createLoan, accrueLoanCharge, repayLoan, reverseLoanEvent, deleteLoan,
      recordAdjustment, saveDayClose, updateSettings, setBrandingAsset, removeBrandingAsset,
      addStaff, setStaffRole, removeStaff, importProducts,
      memberships, invites,
      planView, planRefusal, clearPlanRefusal,
      ownPayments, platformConfig, suspensionReason, submitRenewalPayment,
      exportBusinessBackup, planBusinessRestore, executeBusinessRestore,
      demoClass, addDemoData, resetDemoData, listTrash, clearBusinessData,
      restoreFromTrash, deleteTrashPermanently, setupIncomplete, retryBusinessSetup,
      storefront, storeOrders, publishStorefront, unpublishStorefront,
      setStorefrontAutoRepublish, convertStoreOrder, dismissStoreOrder,
      saveWaTemplate, deleteWaTemplate, createWaCampaign, launchWaCampaign,
      advanceWaSend, finishWaCampaign, setCustomerWaConsent,
      setWaServiceIntervalDays,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/* ---------------- seeding (module scope) ---------------- */

/** Fix Round 2 · FR2: a fresh business starts EMPTY. The owner
 *  doc skeleton (lib/tenancy's newBusinessSkeleton — the same
 *  fixed ids and content the first-business skeleton always
 *  used) + the five money accounts + the default warehouse.
 *  No content docs, no journal entries: demo data arrives only
 *  through the explicit owner act (seedDemoCollections below),
 *  never at signup. Merge-writes throughout, so completing a
 *  half-born business (phase-2 failure) is idempotent. */
async function createEmptyNamespace(
  db: Firestore,
  uid: string,
  email: string | null,
  shopName: string,
  phone: string,
  address: string
) {
  const skel = newBusinessSkeleton({
    businessId: uid,
    ownerUid: uid,
    ownerEmail: email ?? "",
    name: shopName,
    phone,
    address,
    nowISO: new Date().toISOString(),
  });
  const docs: Array<{ ref: ReturnType<typeof doc>; data: Record<string, unknown> }> = [
    { ref: doc(db, "users", uid), data: { ...skel.ownerDoc } },
    ...skel.accounts.map((acc) => ({
      ref: doc(db, "users", uid, "accounts", String(acc.id)),
      data: acc,
    })),
    { ref: doc(db, "users", uid, "warehouses", String(skel.warehouse.id)), data: skel.warehouse },
  ];
  for (let i = 0; i < docs.length; i += 450) {
    const batch = writeBatch(db);
    for (const d of docs.slice(i, i + 450)) batch.set(d.ref, d.data, { merge: true });
    await batch.commit();
  }
}

/** Fix Round 2 · FR2: the explicit demo-data act's writer — every
 *  demo document NOT already present (lib/demo's plan), in
 *  450-doc batches, then the owner doc's demoState flips to
 *  "seeded". This writer never decides: the caller classified
 *  first (empty → add; demo-only → wipe then re-add; real →
 *  refused before this function is ever called). Returns the
 *  writes committed, so the caller confirms the post-summary
 *  from what was actually written. */
async function seedDemoCollections(
  db: Firestore,
  uid: string,
  existingIds: Partial<Record<string, Set<string>>>
) {
  const writes = planDemoSeed(existingIds);
  for (let i = 0; i < writes.length; i += 450) {
    const batch = writeBatch(db);
    for (const w of writes.slice(i, i + 450)) {
      batch.set(doc(db, "users", uid, w.collection, w.id), w.data);
    }
    await batch.commit();
  }
  await updateDoc(doc(db, "users", uid), { demoState: "seeded" });
  return writes;
}

/** Fix Round 2 · FR2: read a business's trash manifests, newest
 *  first. The manifest is the panel's whole truth — counts and
 *  fingerprint without reassembling anything. */
async function readTrashManifests(db: Firestore, businessId: string): Promise<TrashManifest[]> {
  const snap = await getDocs(collection(db, "businessTrash", businessId, "snapshots"));
  return (snap.docs.map((d) => d.data() as TrashManifest)).sort((a, b) =>
    b.clearedAt.localeCompare(a.clearedAt)
  );
}

/** Fix Round 2 · FR2: delete a trash snapshot's chunk docs, then
 *  its manifest — the whole snapshot, leaving nothing behind. */
async function deleteTrashDocs(db: Firestore, businessId: string, trashId: string) {
  const chunkSnap = await getDocs(
    collection(db, "businessTrash", businessId, "snapshots", trashId, "chunks")
  );
  for (let i = 0; i < chunkSnap.docs.length; i += 450) {
    const batch = writeBatch(db);
    for (const d of chunkSnap.docs.slice(i, i + 450)) batch.delete(d.ref);
    await batch.commit();
  }
  await deleteDoc(doc(db, "businessTrash", businessId, "snapshots", trashId));
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

/* ---------------- Phase G · G1: tenancy registry (module scope) ----------------
 * The design §7.2 lazy migration and the §4.3 trial birth, executed
 * from the pure lib/tenancy plans. EVERY write lands in a platform
 * collection — zero writes inside any users/{uid} tree, zero
 * journal entries — and the registry doc's own existence is the
 * idempotency marker (no flag is written anywhere), so a second
 * sign-in writes nothing new. */

/** Phase G · G4: the registry read seam normalizes Firestore
 *  Timestamps to ISO strings (the console's PlatformData
 *  precedent) — a trial end is STORED as a timestamp at birth
 *  (the rules validate it as one), while every lib derivation
 *  (plan state, the renewal quote) speaks ISO. Paid period
 *  fields are stored as strings already; the conversion is a
 *  no-op for them. */
function isoValueOf(v: unknown): unknown {
  if (v == null || typeof v === "string") return v;
  const t = v as { toDate?: () => Date };
  if (typeof t.toDate === "function") return t.toDate().toISOString();
  return v;
}

function normPlanRegistryDoc(
  raw: Record<string, unknown>
): BusinessRegistryDoc {
  const plan = (raw.plan ?? {}) as Record<string, unknown>;
  return {
    ...(raw as unknown as BusinessRegistryDoc),
    createdAt: isoValueOf(raw.createdAt) as string,
    plan: {
      ...(plan as unknown as BusinessRegistryDoc["plan"]),
      periodFrom: isoValueOf(plan.periodFrom) as string,
      periodTo: isoValueOf(plan.periodTo) as string | null,
      trialEndsAt: isoValueOf(plan.trialEndsAt) as string | null,
      assignedAt: isoValueOf(plan.assignedAt) as string,
    },
  };
}

/** Phase G · G4: a renewal record as the owner reads it back —
 *  the doc id attached, every date an ISO string (the console
 *  writes settlement fields as ISO already; the birth fields
 *  are ISO by construction of the submission plan). */
function normOwnPayment(
  id: string,
  raw: Record<string, unknown>
): PlatformPaymentDoc {
  return {
    ...(raw as unknown as PlatformPaymentDoc),
    id,
    periodFrom: isoValueOf(raw.periodFrom) as string,
    periodTo: isoValueOf(raw.periodTo) as string,
    submittedAt: isoValueOf(raw.submittedAt) as string,
    confirmedAt: isoValueOf(raw.confirmedAt) as string | null,
  };
}

function normOwnEvent(raw: Record<string, unknown>): BusinessEventDoc {
  return {
    ...(raw as unknown as BusinessEventDoc),
    at: isoValueOf(raw.at) as string,
  };
}

/** Phase H · H3: an inbox doc off the wire — its `createdAt` was
 *  written as a server timestamp by the public page; normalize
 *  it to the ISO string the lib's shapes carry. */
function normStoreOrder(id: string, raw: Record<string, unknown>): StoreOrder {
  return {
    ...(raw as unknown as StoreOrder),
    id,
    createdAt: isoValueOf(raw.createdAt) as string,
  };
}

/** Execute a lib/tenancy write plan (set/add ops only — the index
 *  op belongs to the session resolver in AuthProvider). */
async function applyRegistryWrites(
  db: Firestore,
  writes: PlatformWrite[]
): Promise<void> {
  const batch = writeBatch(db);
  let n = 0;
  for (const w of writes) {
    if (w.kind === "set") {
      batch.set(doc(db, w.path), registryWriteData(w.path, w.data));
      n++;
    } else if (w.kind === "add") {
      batch.set(doc(collection(db, w.collection)), w.data);
      n++;
    }
  }
  if (n > 0) await batch.commit();
}

/** Phase G · G6: make a Firestore document JSON-safe for the
 *  backup file — recursively converts any Firestore Timestamp
 *  (in practice only the registry's trial end, written as a real
 *  timestamp at birth) to its ISO string. Tenant documents store
 *  ISO strings already, so for them this is a faithful pass. */
function exportableDoc<T>(value: T): T {
  if (value && typeof value === "object") {
    const maybeTs = value as { toDate?: unknown };
    if (typeof maybeTs.toDate === "function") {
      return (maybeTs.toDate as () => Date).call(value).toISOString() as T;
    }
    if (Array.isArray(value)) {
      return value.map((v) => exportableDoc(v)) as T;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = exportableDoc(v);
    }
    return out as T;
  }
  return value;
}

/** The plans are pure data (ISO strings), but the rules validate
 *  the registry's trial end as a Firestore TIMESTAMP
 *  (businessBirthOk: `trialEndsAt is timestamp` and after
 *  request.time) — so a businesses/ write converts that one field
 *  at the executor seam. Everything else passes through as-is. */
function registryWriteData(
  path: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  if (!path.startsWith("businesses/")) return data;
  const plan = data.plan as { trialEndsAt?: unknown } | undefined;
  if (plan && typeof plan.trialEndsAt === "string") {
    return {
      ...data,
      plan: {
        ...plan,
        trialEndsAt: Timestamp.fromDate(new Date(plan.trialEndsAt)),
      },
    };
  }
  return data;
}

/** §7.2: a pre-G owner's first G sign-in — the `founding` comp
 *  assignment (Advanced limits, no expiry), membership mirrors
 *  for resolvable staff, and counters initialised from a labelled
 *  baseline count of the existing bills/sales. */
async function ensureBusinessRegistry(
  db: Firestore,
  uid: string,
  ownerEmail: string | null,
  ownerData: Record<string, unknown>
): Promise<void> {
  const regRef = doc(db, "businesses", uid);
  const reg = await getDoc(regRef);
  if (reg.exists()) return;
  const [billSnap, saleSnap] = await Promise.all([
    getDocs(collection(db, "users", uid, "bills")),
    getDocs(collection(db, "users", uid, "sales")),
  ]);
  const bills = billSnap.docs.map(
    (d) => d.data() as { ts: string; status?: string }
  );
  const sales = saleSnap.docs.map((d) => d.data() as { ts: string });
  const writes = planMigration({
    ownerUid: uid,
    ownerEmail: ownerEmail ?? "",
    shopName: String(ownerData.shopName ?? ""),
    phone: String(ownerData.phone ?? ""),
    staffEmails: Array.isArray(ownerData.staffEmails)
      ? (ownerData.staffEmails as string[])
      : [],
    registryExists: false,
    bills,
    sales,
    nowISO: new Date().toISOString(),
  });
  await applyRegistryWrites(db, writes);
}

/** §4.3: a brand-new business's registry birth — the trial
 *  snapshot (2 users / 200 invoices / standard modules, 14 days),
 *  counters at zero, memberCount 1. */
async function createTrialRegistry(
  db: Firestore,
  uid: string,
  ownerEmail: string | null
): Promise<void> {
  const regRef = doc(db, "businesses", uid);
  const reg = await getDoc(regRef);
  if (reg.exists()) return;
  const settings = getSeedSettings();
  const writes = planTrialBirth({
    ownerUid: uid,
    ownerEmail: ownerEmail ?? "",
    shopName: settings.shopName,
    phone: settings.phone,
    nowISO: new Date().toISOString(),
  });
  await applyRegistryWrites(db, writes);
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
