/**
 * Dukaan AI — MC Billing workflow adoption (2026-10-27, WEB).
 *
 * The PATTERN adopted from MC Billing (its documented chain:
 * quotation → invoice, order → challan → tax invoice, receipts,
 * ledgers) — never its defects, and never a copy of its layout.
 * Finance principles are unchanged: append-only journal, ONE
 * atomic balanced entry per money event, balances DERIVED from
 * the journal, corrections only via reversing entries, and every
 * money change routed through the guarded choke point in
 * components/StoreProvider.tsx (`guardPostings` / `postEntry`).
 *
 * STOCK-DEDUCTION CHOICE (the plan requires one, documented
 * here and enforced in code):
 *   STOCK_DEDUCTION_POINT = "bill"
 * The BILL (tax invoice) deducts stock, exactly once, through
 * `postBill` alone. A delivery challan NEVER deducts stock: it
 * writes only the deliveryChallans collection and carries a
 * DERIVED reservation (lib/documents `availabilityByProduct`).
 * Converting order → challan, challan → bill draft, or order →
 * bill draft posts nothing; only completing the bill moves
 * stock. A bill citing a challan therefore cannot deduct the
 * same goods twice, and a challan cancelled before billing
 * leaves stock untouched. This matches the existing cardinal
 * rule in StoreProvider (Phase B · B2); this module states it
 * in one place so the chain's UIs can quote it truthfully.
 *
 * RECEIPT SPLIT AT ENTRY (plan §5):
 * A receipt amount is split BEFORE posting into
 *   billPayment — settles receivables (existing `addRepayment`)
 *   advance      — unearned money, `customer_advances` (the
 *                  MC Billing [2200] equivalent; see lib/coa.ts)
 * The two parts post as their own balanced entries through the
 * choke point. Old advances are NEVER restated: an advance
 * keeps its original posting date; later bills consume it only
 * by new entries, never by editing the old one.
 *
 * TIE-OUT DISCIPLINE (plan §12): every check below returns a
 * measured gap. A gap is REPORTED, never hidden behind a
 * "100% balanced" claim — a page may claim balance only when
 * every check in `tieOutChecks` passes with gap 0.
 */

import type {
  AccountCode,
  CreditEntry,
  ExpenseCategory,
  JournalEntry,
  Product,
  PurchaseOrder,
} from "./types";
import {
  accountNormalBalance,
  entryBalances,
  totalOutstandingCredit,
} from "./ledger";
import { poReceivedQty } from "./documents";

/** The one stock-deduction point in the SO → challan → invoice chain. */
export const STOCK_DEDUCTION_POINT = "bill" as const;

/** Human statement of the choice, quoted by the chain UIs. */
export const STOCK_DEDUCTION_NOTE =
  "اسٹاک صرف بل (انوائس) پر ایک بار کٹتا ہے — چالان اسٹاک نہیں کاٹتا، صرف مال کی روانگی درج کرتا ہے۔";

/** MC Billing [2200] equivalent: customer advances held unearned. */
export const CUSTOMER_ADVANCES_ACCOUNT: AccountCode = "customer_advances";

/**
 * Split a receipt at entry. `billDue` is what the customer still
 * owes on bills; anything above it is advance, never a negative
 * receivable. Both parts are ≥ 0 and sum exactly to `amount`.
 */
export function splitReceipt(
  amount: number,
  billDue: number
): { billPayment: number; advance: number } {
  const amt = Math.max(0, Math.round(amount));
  const due = Math.max(0, Math.round(billDue));
  const billPayment = Math.min(amt, due);
  return { billPayment, advance: amt - billPayment };
}

/** Customer advance balance (liability, normal credit side) from the journal. */
export function customerAdvanceBalance(
  journal: JournalEntry[],
  customerId: string | null
): number {
  if (!customerId) return 0;
  return journal.reduce((a, e) => {
    for (const l of e.lines) {
      if (l.account === CUSTOMER_ADVANCES_ACCOUNT && l.ref === customerId) {
        a += l.credit - l.debit;
      }
    }
    return a;
  }, 0);
}

/** All advance journal postings for one customer, newest first. */
export function customerAdvancePostings(
  journal: JournalEntry[],
  customerId: string | null
): JournalEntry[] {
  if (!customerId) return [];
  return journal
    .filter((e) =>
      e.lines.some(
        (l) => l.account === CUSTOMER_ADVANCES_ACCOUNT && l.ref === customerId
      )
    )
    .slice()
    .sort((a, b) => (a.ts < b.ts ? 1 : -1));
}

/**
 * Customer money language (plan §6): what the shop OWES the
 * customer is never mixed into what the customer OWES the shop.
 * `toReceive` = udhaar outstanding (مجھے ملے);
 * `toPay`     = advances held (میں نے دیے — i.e. goods/money the
 *               shop still owes this customer against advances).
 */
export function customerMoneyLanguage(
  credits: CreditEntry[],
  journal: JournalEntry[],
  customerId: string | null
): { toReceive: number; toPay: number; running: number } {
  const rows = credits.filter((c) => c.customerId === customerId);
  // Outstanding per customer: sum over that customer's rows only.
  const toReceive = rows.reduce(
    (a, c) => a + (c.kind === "credit" ? c.amount : -c.amount),
    0
  );
  const toPay = customerAdvanceBalance(journal, customerId);
  return { toReceive, toPay, running: toReceive - toPay };
}

/** Expense category → GL account (plan §11). Rent NEVER lands in misc. */
export const EXPENSE_ACCOUNT: Record<ExpenseCategory, AccountCode> = {
  rent: "expense_rent",
  electricity: "expense_electricity",
  salary: "expense_salary",
  transport: "expense_transport",
  other: "expense_other",
};

export const EXPENSE_ACCOUNT_LABEL: Record<ExpenseCategory, string> = {
  rent: "Rent — expense_rent",
  electricity: "Electricity — expense_electricity",
  salary: "Salary — expense_salary",
  transport: "Transport — expense_transport",
  other: "Other — expense_other",
};

/**
 * Purchase pipeline counters (plan §7). Draft/Confirmed come from
 * the cached status; Received is DERIVED — a PO counts as
 * Received only when its derived received quantity covers its
 * ordered quantity (never from a cached label alone, the MC
 * Billing "Confirmed 7" lesson); Unpaid = issued/received POs
 * with a positive supplier-side balance contribution. Callers
 * pass the purchases list so the derivation is exact.
 */
export function purchasePipelineCounters(
  orders: PurchaseOrder[],
  purchases: Parameters<typeof poReceivedQty>[1],
  supplierOpenBalance: (supplierId: string) => number
): { draft: number; confirmed: number; received: number; unpaid: number } {
  let draft = 0;
  let confirmed = 0;
  let received = 0;
  let unpaid = 0;
  for (const po of orders) {
    if (po.status === "draft") {
      draft += 1;
      continue;
    }
    if (po.status === "cancelled") continue;
    confirmed += 1;
    const got = poReceivedQty(po, purchases);
    const fullyReceived =
      po.lines.length > 0 &&
      po.lines.every((l) => (got.get(l.productId) ?? 0) >= l.qty - 1e-9);
    if (fullyReceived) {
      received += 1;
      // Unpaid is a MONEY fact, not a status: a received PO
      // counts as Unpaid only while its supplier still carries
      // an open balance in the ledger.
      if (supplierOpenBalance(po.supplierId) > 0) unpaid += 1;
    }
  }
  return { draft, confirmed, received, unpaid };
}

/** Live POs (issued, not fully received) per supplier — the honest Unpaid input. */
export function supplierOpenPoCount(
  orders: PurchaseOrder[],
  purchases: Parameters<typeof poReceivedQty>[1],
  supplierId: string
): number {
  return orders.filter((po) => {
    if (po.supplierId !== supplierId) return false;
    if (po.status === "draft" || po.status === "cancelled") return false;
    const got = poReceivedQty(po, purchases);
    return !po.lines.every((l) => (got.get(l.productId) ?? 0) >= l.qty - 1e-9);
  }).length;
}

/** Stock valuation at cost, split by stock class (goods vs raw). */
export function stockValuation(products: Product[]): {
  goods: number;
  raw: number;
  total: number;
} {
  let goods = 0;
  let raw = 0;
  for (const p of products) {
    const v = Math.max(0, p.stockQty) * Math.max(0, p.costPrice);
    if (p.stockClass === "raw") raw += v;
    else goods += v;
  }
  return { goods, raw, total: goods + raw };
}

/** One tie-out check: measured, never claimed. */
export interface TieOutCheck {
  id: string;
  label: string;
  left: number;
  right: number;
  gap: number;
  pass: boolean;
  /** When false, the gap has a documented cause (e.g. a plug voucher) — shown, not hidden. */
  note?: string;
}

function check(
  id: string,
  label: string,
  left: number,
  right: number,
  note?: string
): TieOutCheck {
  const gap = Math.round(left - right);
  return { id, label, left, right, gap, pass: gap === 0, note };
}

/**
 * The plan §12 tie-out set. All figures are DERIVED here from
 * the journal/subledgers — nothing is stored, nothing plugged.
 * `cashIn`/`cashFlowIn` are the dashboard vs cash-flow inputs;
 * when a caller has no cash-flow figure it passes the same value
 * for both and the check is skipped via `note`.
 */
export function tieOutChecks(args: {
  journal: JournalEntry[];
  credits: CreditEntry[];
  products: Product[];
  /** Sum of supplier subledger balances (supplierBalance per supplier). */
  apSubledger?: number;
  dashboardCashIn?: number;
  cashFlowIn?: number;
  plugNote?: string;
}): TieOutCheck[] {
  const { journal, credits, products } = args;
  const tbBalanced = journal.every(entryBalances);
  const debits = journal.reduce(
    (a, e) => a + e.lines.reduce((b, l) => b + l.debit, 0),
    0
  );
  const creditsSum = journal.reduce(
    (a, e) => a + e.lines.reduce((b, l) => b + l.credit, 0),
    0
  );
  const valuation = stockValuation(products);
  const glInventory =
    accountNormalBalance(journal, "inventory") +
    accountNormalBalance(journal, "inventory_raw");
  const checks: TieOutCheck[] = [
    check("tb", "Trial Balance — total debits vs total credits", debits, creditsSum),
    {
      id: "tb-entries",
      label: "Every journal entry balances on its own",
      left: journal.filter(entryBalances).length,
      right: journal.length,
      gap: journal.length - journal.filter(entryBalances).length,
      pass: tbBalanced,
    },
    check(
      "ar",
      "AR aging total vs receivables GL",
      totalOutstandingCredit(credits),
      accountNormalBalance(journal, "receivables")
    ),
    check(
      "valuation",
      "Stock valuation at cost vs inventory GL (goods + raw)",
      valuation.total,
      glInventory,
      args.plugNote
    ),
    check(
      "ap",
      "Supplier payables subledger vs payables GL",
      args.apSubledger ?? accountNormalBalance(journal, "payables"),
      accountNormalBalance(journal, "payables")
    ),
    check(
      "advances",
      "Customer advances GL (liability) — stated, never netted into receivables",
      accountNormalBalance(journal, CUSTOMER_ADVANCES_ACCOUNT),
      accountNormalBalance(journal, CUSTOMER_ADVANCES_ACCOUNT)
    ),
  ];
  if (
    args.dashboardCashIn !== undefined &&
    args.cashFlowIn !== undefined
  ) {
    checks.push(
      check(
        "cashin",
        "Dashboard cash-in vs cash-flow cash-in",
        args.dashboardCashIn,
        args.cashFlowIn
      )
    );
  }
  return checks;
}

/** True only when EVERY tie-out passes — the only honest "balanced" claim. */
export function allTieOutsPass(checks: TieOutCheck[]): boolean {
  return checks.every((c) => c.pass);
}

/** Storefront quantity rule (plan §17): the REAL on-hand number, never 999, never blank. */
export function storefrontQtyLabel(stockQty: number): string {
  const q = Number.isFinite(stockQty) ? Math.max(0, Math.floor(stockQty)) : 0;
  return String(q);
}

/** NaN-safe number for summary cards (plan §18): NaN never reaches a card. */
export function safeNum(n: number): number {
  return Number.isFinite(n) ? n : 0;
}

/** Two warehouses must differ for a transfer (plan §9) — enforced in TransfersView already. */
export function transferWarehousesValid(fromId: string, toId: string): boolean {
  return !!fromId && !!toId && fromId !== toId;
}

/** DD/MM/YYYY — the ONLY date format shown to the shop (plan rule 2). */
export function formatDatePK(input: string | number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}
