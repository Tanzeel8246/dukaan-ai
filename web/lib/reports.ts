/**
 * Dukaan AI — the Reports section's pure builders.
 *
 * READ-ONLY by construction: nothing here posts, writes or mutates.
 * Every figure is derived through the SAME functions the module
 * screens use — the P&L is `profitAndLossInRange`, aging is
 * `receivablesAging` / `payablesAging`, statements run on
 * `accountBook` / `customerOutstanding`'s rows / `supplierBalance`,
 * tax groups come from `taxLinesForItems` (the receipt grouping),
 * stock from the selectors — so a report can never disagree with
 * its screen. The verification harness proves the identities.
 *
 * Language: builders are language-FREE (numbers and raw data only),
 * so EN and UR outputs carry identical figures by construction.
 * The only language-aware helpers are the formatters at the bottom
 * (`moneyIn`, `dateIn`, `reportShareText`), which take the OUTPUT
 * language explicitly — the print/share language is chosen on the
 * report screen and is independent of the app UI language.
 */
import type {
  AccountCode,
  Bill,
  Cheque,
  CreditEntry,
  DayClose,
  DocNote,
  Expense,
  JournalEntry,
  MoneyAccount,
  Product,
  Purchase,
  PurchaseReturn,
  Sale,
  SaleReturn,
  ShopSettings,
  Supplier,
  SupplierPayment,
  TaxSlab,
} from "./types";
import {
  accountBook,
  accountNormalBalance,
  cashBook,
  creditKey,
  expenseTotal,
  payablesAging,
  profitAndLossInRange,
  purchaseReturnGross,
  receivablesAging,
  supplierBalance,
  type AccountBookRow,
  type AgingBuckets,
  type CashBookRow,
  type MonthPL,
} from "./ledger";
import { expiringProducts, lowStockProducts, stockValue, stockValueRetail } from "./selectors";
import {
  allocateProRata,
  computeBillTaxes,
  resolveTaxSlab,
  round2,
  taxLinesForItems,
  type BillTaxLine,
} from "./tax";
import { ACCOUNT_CODES, normalBalanceSign } from "./coa";
import { chequesAtBank, chequesInDrawer, pendingOutCheques } from "./cheques";
import {
  addDaysISO,
  currentFiscalYear,
  isValidDateISO,
  startOfDayPktInstant,
  todayPktISO,
} from "./periods";
import { translate, type I18nKey, type Lang } from "./i18n";

/* ---------------- ranges ---------------- */

export type RangePreset = "today" | "week" | "month" | "fiscal" | "custom";

/** An inclusive PKT business-date range with its instant bounds:
 *  a row belongs when `fromTs <= row.ts < toTs` — the same instant
 *  convention `profitAndLossInRange` and the A5 fiscal windows use. */
export interface ReportRange {
  fromDate: string; // YYYY-MM-DD (PKT)
  toDate: string; // YYYY-MM-DD (PKT)
  fromTs: string;
  toTs: string;
}

type FiscalSettings = Pick<
  ShopSettings,
  "fiscalYearStartMonth" | "fiscalYearStartDay"
> | null | undefined;

function rangeOfDates(fromDate: string, toDate: string): ReportRange {
  return {
    fromDate,
    toDate,
    fromTs: startOfDayPktInstant(fromDate),
    toTs: startOfDayPktInstant(addDaysISO(toDate, 1)),
  };
}

/** Resolve a preset (or a custom pair) to a concrete range. "This
 *  week" starts on Monday; "This month" is the PKT calendar month;
 *  "This fiscal year" is `currentFiscalYear` (A5 — default start
 *  1 July). A reversed or invalid custom pair falls back to the
 *  single given day / today rather than an empty report. */
export function resolveReportRange(
  preset: RangePreset,
  settings: FiscalSettings,
  custom?: { from: string; to: string },
  now: Date = new Date()
): ReportRange {
  const today = todayPktISO(now);
  switch (preset) {
    case "today":
      return rangeOfDates(today, today);
    case "week": {
      const [y, m, d] = today.split("-").map(Number);
      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
      const from = addDaysISO(today, -((dow + 6) % 7)); // back to Monday
      return rangeOfDates(from, addDaysISO(from, 6));
    }
    case "month": {
      const first = `${today.slice(0, 8)}01`;
      const [y, m] = today.split("-").map(Number);
      const nextFirst = m === 12 ? `${y + 1}-01-01` : `${y}-${m + 1 < 10 ? "0" : ""}${m + 1}-01`;
      return rangeOfDates(first, addDaysISO(nextFirst, -1));
    }
    case "fiscal": {
      const fy = currentFiscalYear(settings ?? undefined, now);
      return rangeOfDates(fy.startDate, fy.endDate);
    }
    case "custom": {
      const from = custom && isValidDateISO(custom.from) ? custom.from : today;
      const to = custom && isValidDateISO(custom.to) ? custom.to : from;
      return from <= to ? rangeOfDates(from, to) : rangeOfDates(to, from);
    }
  }
}

/** Does an ISO instant fall inside the range? */
export function inRange(ts: string, range: ReportRange): boolean {
  return ts >= range.fromTs && ts < range.toTs;
}

/* ---------------- 1 · sales ---------------- */

export interface SalesReport {
  rows: Sale[];
  grossSales: number; // Σ totals of sale rows (sticker gross, as the Sales screen sums them)
  returnsTotal: number; // Σ totals of return rows (negative or 0, sticker gross)
  /**
   * The JOURNAL's gross-revenue figure, rebuilt from the documents
   * (live-audit Fix 1): bill + counter revenue net of INCLUSIVE tax,
   * minus returns' net revenue shares — the P&L's `revenue` line.
   * Equals grossSales + returnsTotal whenever no bill carries a
   * discount or inclusive tax.
   */
  revenue: number;
  /**
   * Net discounts, rebuilt from the documents: bill discounts
   * (including the F-2 payment-rounding the desk books to
   * `sales_discount`) minus the discount shares returns credit
   * back — the P&L's `discounts` line.
   */
  discounts: number;
  /** revenue − discounts: the document side of the P&L identity. */
  netSales: number;
  /**
   * Revenue the JOURNAL carries for the period that no sale
   * document explains — the explicit reconciling line of Fix 1
   * (e.g. a legacy journal whose standalone udhaar was posted to
   * sales_revenue before the F-7 correction). Computed only when
   * the caller passes the journal; 0 for document-only data, and
   * the identity `plNetRevenue == netSales + otherRevenue` holds
   * by construction whenever it is.
   */
  otherRevenue: number;
  /** The P&L's net revenue for the period when the journal was
   *  passed; == netSales otherwise. */
  plNetRevenue: number;
  netUnits: number; // Σ qty over all rows (returns net off)
  grossProfit: number; // Σ margin × qty, the profitOnDay formula
  byProduct: Array<{ productId: string; name: string; qty: number; amount: number; profit: number }>;
  byCustomer: Array<{ key: string; name: string; qty: number; amount: number }>;
}

/** Per-row gross profit — the `profitOnDay` formula verbatim
 *  (unitCost snapshot, product cost as the legacy fallback). */
function saleRowProfit(s: Sale, costOf: Map<string, number>): number {
  const cost = s.unitCost ?? costOf.get(s.productId);
  const margin = cost != null ? s.unitPrice - cost : 0;
  return margin * s.qty;
}

/**
 * Optional context the reconciliation needs. ReportsView always
 * passes all of it; a caller that omits it gets the legacy
 * document-only figures (exact whenever no bill carries a discount
 * or inclusive tax and no return reverses one).
 *
 * The derivations mirror the posting templates paisa-for-paisa:
 *  - a bill's journal revenue is `subtotal − inclusiveTax` and its
 *    discount debit is `discountAmount + (total − Σ payments)` —
 *    the ±Rs 1 rounding the desk books to `sales_discount` (F-2);
 *    both bill-level figures are spread over the bill's rows with
 *    the tax engine's cumulative pro-rata, so the rows sum back to
 *    the bill exactly;
 *  - a return's revenue reversal is `gross − inclusiveTaxShare`
 *    and its discount credit is the share the return document
 *    itself proves: `gross − (refundAmount + creditReduction) +
 *    exclusiveTaxShare` (the F-3/A4 identity the store composed
 *    it with — the shares are read off the return's stamped items);
 *  - a counter sale's revenue is its total net of the inclusive
 *    tax the SAME slab resolution + formulas produce at the
 *    counter (`recordSale`).
 */
export interface SalesReportContext {
  returns?: SaleReturn[];
  journal?: JournalEntry[];
  taxSlabs?: TaxSlab[];
  settings?: ShopSettings | null;
}

export function salesReport(
  sales: Sale[],
  products: Product[],
  bills: Bill[],
  range: ReportRange,
  ctx?: SalesReportContext
): SalesReport {
  const rows = sales
    .filter((s) => inRange(s.ts, range))
    .sort((a, b) => a.ts.localeCompare(b.ts));
  const costOf = new Map(products.map((p) => [p.id, p.costPrice]));
  const nameOf = new Map(products.map((p) => [p.id, p.name]));
  const prodById = new Map(products.map((p) => [p.id, p]));
  const billById = new Map(bills.map((b) => [b.id, b]));

  /* ---- per-row NET amounts (the journal view of each row) ---- */
  const netOfRow = new Map<string, number>();
  /** Per-row inclusive-tax share — the revenue side nets off ONLY
   *  this (discounts stay a separate P&L line, as in the journal). */
  const inclOfRow = new Map<string, number>();

  // Bill rows: net off the bill's discount + inclusive tax.
  const billRows = new Map<string, Sale[]>();
  for (const s of rows) {
    if (s.kind === "return" || !s.billId) continue;
    const list = billRows.get(s.billId) ?? [];
    list.push(s);
    billRows.set(s.billId, list);
  }
  for (const [billId, list] of billRows) {
    const bill = billById.get(billId);
    if (!bill) {
      for (const s of list) netOfRow.set(s.id, s.total);
      continue;
    }
    const paidTotal = bill.payments.reduce((a, p) => a + p.amount, 0);
    // F-2: the desk books (bill.total − paid) to sales_discount too.
    const discountNet = bill.discountAmount + (bill.total - paidTotal);
    const inclTax = round2(
      bill.items.reduce((a, it) => a + (it.taxInclusive ? it.taxAmount ?? 0 : 0), 0)
    );
    const totals = list.map((s) => s.total);
    const dShares = allocateProRata(totals, discountNet);
    const tShares = allocateProRata(totals, inclTax);
    list.forEach((s, i) => {
      netOfRow.set(s.id, round2(s.total - (dShares[i] ?? 0) - (tShares[i] ?? 0)));
      inclOfRow.set(s.id, tShares[i] ?? 0);
    });
  }

  // Counter rows (and rows whose bill is gone): net of inclusive
  // tax when the tax context is available — the recordSale mirror.
  for (const s of rows) {
    if (s.kind === "return" || netOfRow.has(s.id)) continue;
    let net = s.total;
    let incl = 0;
    if (ctx?.taxSlabs && ctx.settings) {
      const product = prodById.get(s.productId);
      const slab = resolveTaxSlab(product, ctx.taxSlabs, ctx.settings, "sales");
      if (slab) {
        incl = computeBillTaxes([{ total: s.total, qty: s.qty, slab }], 0).inclusiveTax;
        if (incl > 0) net = round2(s.total - incl);
        else incl = 0;
      }
    }
    netOfRow.set(s.id, net);
    inclOfRow.set(s.id, incl);
  }

  /* ---- returns: the net reversal each return document proves ---- */
  interface ReturnNet {
    billId: string;
    revenueReversal: number; // gross − inclusiveTaxShare (the Dr sales_revenue)
    /** revenueReversal − discountShare: what the return removes
     *  from NET revenue (the Dr revenue net of the Cr discount). */
    netReversal: number;
    perProduct: Map<string, number>; // productId → net amount (negative)
  }
  const returnNets: ReturnNet[] = [];
  for (const r of ctx?.returns ?? []) {
    if (!inRange(r.ts, range)) continue;
    const gross = r.items.reduce((a, i) => a + i.total, 0);
    const inclTax = round2(
      r.items.reduce((a, i) => a + (i.taxInclusive ? i.taxAmount ?? 0 : 0), 0)
    );
    const exclTax = round2(
      r.items.reduce((a, i) => a + (i.taxInclusive ? 0 : i.taxAmount ?? 0), 0)
    );
    // The F-3/A4 identity the return was composed with:
    // refundAmount + creditReduction == gross − discountShare + exclTax.
    const discountShare = round2(
      gross - (r.refundAmount + (r.creditReduction ?? 0)) + exclTax
    );
    const dShares = allocateProRata(
      r.items.map((i) => i.total),
      discountShare
    );
    const perProduct = new Map<string, number>();
    r.items.forEach((it, i) => {
      const inclItem = it.taxInclusive ? it.taxAmount ?? 0 : 0;
      const net = -round2(it.total - inclItem - (dShares[i] ?? 0));
      perProduct.set(it.productId, (perProduct.get(it.productId) ?? 0) + net);
    });
    const revenueReversal = round2(gross - inclTax);
    returnNets.push({
      billId: r.billId,
      revenueReversal,
      netReversal: round2(revenueReversal - discountShare),
      perProduct,
    });
  }
  const hasReturnDocs = (ctx?.returns?.length ?? 0) > 0;

  /* ---- aggregates ---- */
  let grossSales = 0;
  let returnsTotal = 0;
  let netUnits = 0;
  let grossProfit = 0;
  let revenue = 0;
  let netted = 0;
  const prodMap = new Map<string, SalesReport["byProduct"][number]>();
  const custMap = new Map<string, SalesReport["byCustomer"][number]>();
  const custKeyOf = (bill: Bill | undefined): string =>
    bill
      ? bill.customerId ?? `name:${bill.customerName.trim().toLowerCase()}|${bill.customerPhone.trim()}`
      : "walk-in";

  for (const s of rows) {
    if (s.kind === "return") returnsTotal += s.total;
    else grossSales += s.total;
    netUnits += s.qty;
    const profit = saleRowProfit(s, costOf);
    grossProfit += profit;
    if (s.kind !== "return") {
      // Revenue side: net of inclusive tax only (discounts are the
      // P&L's separate line). Net side: net of both.
      revenue += s.total - (inclOfRow.get(s.id) ?? 0);
      netted += netOfRow.get(s.id) ?? s.total;
    } else if (!hasReturnDocs) {
      revenue += s.total; // legacy: gross row netting
      netted += s.total;
    }

    const pr = prodMap.get(s.productId) ?? {
      productId: s.productId,
      name: nameOf.get(s.productId) ?? s.productId,
      qty: 0,
      amount: 0,
      profit: 0,
    };
    pr.qty += s.qty;
    pr.profit += profit;
    // Amounts are NET (journal view) for sale rows; return rows are
    // folded from their documents below when documents are
    // available, else they keep the legacy gross row totals.
    if (s.kind !== "return") pr.amount += netOfRow.get(s.id) ?? s.total;
    else if (!hasReturnDocs) pr.amount += s.total;
    prodMap.set(s.productId, pr);

    const bill = s.billId ? billById.get(s.billId) : undefined;
    const key = custKeyOf(bill);
    const cu = custMap.get(key) ?? {
      key,
      name: bill ? bill.customerName : "",
      qty: 0,
      amount: 0,
    };
    cu.qty += s.qty;
    if (s.kind !== "return") cu.amount += netOfRow.get(s.id) ?? s.total;
    else if (!hasReturnDocs) cu.amount += s.total;
    if (bill && bill.customerName) cu.name = bill.customerName;
    custMap.set(key, cu);
  }

  // Fold the return documents' net reversals into the breakdowns.
  for (const rn of returnNets) {
    revenue -= rn.revenueReversal;
    netted -= rn.netReversal;
    const bill = billById.get(rn.billId);
    const key = custKeyOf(bill);
    const cu = custMap.get(key) ?? { key, name: bill ? bill.customerName : "", qty: 0, amount: 0 };
    for (const [pid, net] of rn.perProduct) {
      const pr = prodMap.get(pid) ?? {
        productId: pid,
        name: nameOf.get(pid) ?? pid,
        qty: 0,
        amount: 0,
        profit: 0,
      };
      pr.amount += net;
      prodMap.set(pid, pr);
      cu.amount += net;
    }
    custMap.set(key, cu);
  }

  // Discounts are DERIVED as revenue − net: in the full-context
  // path this equals the journal's `sales_discount` balance exactly
  // (bill discount debits net of returns' discount credits, F-2/F-3
  // included), because both sides were built from the same shares.
  const revenueR = round2(revenue);
  const netSales = round2(netted);
  const discounts = round2(revenueR - netSales);
  const pl = ctx?.journal
    ? profitAndLossInRange(ctx.journal, range.fromTs, range.toTs)
    : null;
  const otherRevenue = pl ? round2(pl.netRevenue - netSales) : 0;

  return {
    rows,
    grossSales,
    returnsTotal,
    revenue: revenueR,
    discounts,
    netSales,
    otherRevenue,
    plNetRevenue: round2(netSales + otherRevenue),
    netUnits,
    grossProfit,
    byProduct: [...prodMap.values()].sort((a, b) => b.amount - a.amount),
    byCustomer: [...custMap.values()].sort((a, b) => b.amount - a.amount),
  };
}

/* ---------------- 2 · purchases ---------------- */

export interface PurchaseReport {
  rows: Purchase[];
  gross: number; // Σ purchase.total (gross owed, A4)
  goodsNet: number; // Σ net goods value
  taxTotal: number; // Σ input tax stamped on the purchases
  returnsGross: number; // Σ purchaseReturnGross over the period's returns
  net: number; // gross − returnsGross
  bySupplier: Array<{ supplierId: string; name: string; gross: number; returns: number; net: number }>;
  byProduct: Array<{ productId: string; name: string; qty: number; amount: number }>;
}

export function purchaseReport(
  purchases: Purchase[],
  purchaseReturns: PurchaseReturn[],
  suppliers: Supplier[],
  range: ReportRange
): PurchaseReport {
  const rows = purchases
    .filter((p) => inRange(p.ts, range))
    .sort((a, b) => a.ts.localeCompare(b.ts));
  const rets = purchaseReturns.filter((r) => inRange(r.ts, range));
  const nameOf = new Map(suppliers.map((s) => [s.id, s.name]));

  let gross = 0;
  let goodsNet = 0;
  let taxTotal = 0;
  const supMap = new Map<string, PurchaseReport["bySupplier"][number]>();
  const prodMap = new Map<string, PurchaseReport["byProduct"][number]>();

  for (const p of rows) {
    gross += p.total;
    goodsNet += p.netTotal ?? p.total - (p.taxAmount ?? 0);
    taxTotal += p.taxAmount ?? 0;
    const su = supMap.get(p.supplierId) ?? {
      supplierId: p.supplierId,
      name: nameOf.get(p.supplierId) ?? p.supplierId,
      gross: 0,
      returns: 0,
      net: 0,
    };
    su.gross += p.total;
    supMap.set(p.supplierId, su);
    for (const it of p.items) {
      const pr = prodMap.get(it.productId) ?? {
        productId: it.productId,
        name: it.name,
        qty: 0,
        amount: 0,
      };
      pr.qty += it.qty;
      pr.amount += it.total;
      prodMap.set(it.productId, pr);
    }
  }
  let returnsGross = 0;
  for (const r of rets) {
    const g = purchaseReturnGross(r);
    returnsGross += g;
    const su = supMap.get(r.supplierId) ?? {
      supplierId: r.supplierId,
      name: nameOf.get(r.supplierId) ?? r.supplierId,
      gross: 0,
      returns: 0,
      net: 0,
    };
    su.returns += g;
    supMap.set(r.supplierId, su);
  }
  for (const su of supMap.values()) su.net = su.gross - su.returns;

  return {
    rows,
    gross,
    goodsNet,
    taxTotal,
    returnsGross,
    net: gross - returnsGross,
    bySupplier: [...supMap.values()].sort((a, b) => b.gross - a.gross),
    byProduct: [...prodMap.values()].sort((a, b) => b.amount - a.amount),
  };
}

/* ---------------- 3 · stock (snapshot — range-free) ---------------- */

export interface StockReport {
  rows: Array<{ product: Product; value: number }>;
  totalValue: number; // stockValue(products)
  retailValue: number; // stockValueRetail(products)
  low: Product[]; // lowStockProducts(products)
  expiring: Product[]; // expiringProducts(products, 30)
}

export function stockReport(products: Product[]): StockReport {
  const rows = [...products]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({ product: p, value: p.stockQty * p.costPrice }));
  return {
    rows,
    totalValue: stockValue(products),
    retailValue: stockValueRetail(products),
    low: lowStockProducts(products),
    expiring: expiringProducts(products, 30),
  };
}

/* ---------------- 4 · profit & loss ---------------- */

/** The Finance screen's own computation over the report range —
 *  `profitAndLossInRange` IS what FinanceView runs for its fiscal
 *  windows, so the identity holds by construction. */
export function plReport(journal: JournalEntry[], range: ReportRange): MonthPL {
  return profitAndLossInRange(journal, range.fromTs, range.toTs);
}

/* ---------------- 4b · trial balance ---------------- */

export interface TrialBalanceRow {
  account: AccountCode;
  /** Σ debits posted to the account inside the period. */
  debitTotal: number;
  /** Σ credits posted to the account inside the period. */
  creditTotal: number;
  /** Closing balance at the period end (every entry before
   *  `range.toTs`), signed on the account's NORMAL side — the
   *  `accountNormalBalance` convention. */
  closing: number;
  /** The side the closing balance sits on in raw Dr−Cr terms. */
  closingSide: "debit" | "credit";
}

export interface TrialBalanceReport {
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  /** totalDebits − totalCredits for the period. Every journal
   *  entry balances by construction (the posting guard throws
   *  otherwise), so this is 0 — the report's "balanced" state. */
  difference: number;
  /** Σ closing balances sitting on the debit side / credit side
   *  at the period end; their difference is likewise 0. */
  closingDebits: number;
  closingCredits: number;
  closingDifference: number;
  balanced: boolean;
}

/**
 * The trial balance (live-audit Fix 4) — derived from the journal
 * ONLY, like every figure in Finance: per-account debit/credit
 * totals inside the period, each account's closing balance at the
 * period end, and the closing difference, which renders as 0 with
 * a clear balanced state. Accounts appear when they moved in the
 * period or still carry a closing balance, in chart order.
 */
export function trialBalance(
  journal: JournalEntry[],
  range: ReportRange
): TrialBalanceReport {
  const inPeriod = journal.filter((e) => inRange(e.ts, range));
  const upToEnd = journal.filter((e) => e.ts < range.toTs);
  const rows: TrialBalanceRow[] = [];
  let totalDebits = 0;
  let totalCredits = 0;
  let closingDebits = 0;
  let closingCredits = 0;
  for (const code of ACCOUNT_CODES) {
    let dr = 0;
    let cr = 0;
    for (const e of inPeriod) {
      for (const l of e.lines) {
        if (l.account !== code) continue;
        dr += l.debit;
        cr += l.credit;
      }
    }
    const closing = accountNormalBalance(upToEnd, code);
    if (dr === 0 && cr === 0 && closing === 0) continue;
    const raw = closing * normalBalanceSign(code); // back to Dr−Cr terms
    rows.push({
      account: code,
      debitTotal: round2(dr),
      creditTotal: round2(cr),
      closing,
      closingSide: raw >= 0 ? "debit" : "credit",
    });
    totalDebits += dr;
    totalCredits += cr;
    if (raw >= 0) closingDebits += raw;
    else closingCredits += -raw;
  }
  const difference = round2(totalDebits - totalCredits);
  const closingDifference = round2(closingDebits - closingCredits);
  return {
    rows,
    totalDebits: round2(totalDebits),
    totalCredits: round2(totalCredits),
    difference,
    closingDebits: round2(closingDebits),
    closingCredits: round2(closingCredits),
    closingDifference,
    balanced: difference === 0 && closingDifference === 0,
  };
}

/* ---------------- 5 · cash book / account statement ---------------- */

export interface AccountStatement {
  /** Null for the combined cash book (two GL buckets, no single
   *  opening/closing — rows carry their bucket's running balance,
   *  exactly as FinanceView's cash book prints them). */
  opening: number | null;
  closing: number | null;
  totalIn: number;
  totalOut: number;
  rows: Array<{
    entryId: string;
    ts: string;
    memo: string;
    bucket: "cash" | "wallet" | null; // combined-book rows only
    inAmount: number;
    outAmount: number;
    balance: number;
  }>;
}

export function accountStatement(
  journal: JournalEntry[],
  accounts: MoneyAccount[],
  accountId: string | null,
  range: ReportRange
): AccountStatement {
  if (accountId) {
    const account = accounts.find((a) => a.id === accountId);
    if (account) {
      const book: AccountBookRow[] = accountBook(journal, account);
      let opening = 0;
      for (const r of book) {
        if (r.ts < range.fromTs) opening = r.balance;
        else break;
      }
      const rows = book.filter((r) => inRange(r.ts, range));
      return {
        opening,
        closing: rows.length > 0 ? rows[rows.length - 1].balance : opening,
        totalIn: rows.reduce((a, r) => a + r.inAmount, 0),
        totalOut: rows.reduce((a, r) => a + r.outAmount, 0),
        rows: rows.map((r) => ({
          entryId: r.entryId,
          ts: r.ts,
          memo: r.memo,
          bucket: null,
          inAmount: r.inAmount,
          outAmount: r.outAmount,
          balance: r.balance,
        })),
      };
    }
  }
  const book: CashBookRow[] = cashBook(journal);
  const rows = book.filter((r) => inRange(r.ts, range));
  return {
    opening: null,
    closing: null,
    totalIn: rows.reduce((a, r) => a + r.inAmount, 0),
    totalOut: rows.reduce((a, r) => a + r.outAmount, 0),
    rows: rows.map((r) => ({
      entryId: r.entryId,
      ts: r.ts,
      memo: r.memo,
      bucket: r.account,
      inAmount: r.inAmount,
      outAmount: r.outAmount,
      balance: r.balance,
    })),
  };
}

/* ---------------- 6 · tax ---------------- */

export interface TaxReportRow extends BillTaxLine {
  output: number; // net output tax for this slab in the period
  input: number; // net input tax for this slab in the period
}

export interface TaxReport {
  rows: TaxReportRow[];
  outputTotal: number;
  inputTotal: number;
  net: number; // output − input (the period's taxPosition movement)
}

const slabKey = (g: BillTaxLine): string =>
  `${g.name}|${g.rate}|${g.kind}|${g.inclusive ? "in" : "ex"}`;

/** Per-slab tax for the period. Groups come from `taxLinesForItems`
 *  — the receipt grouping over the lines' A4 snapshots — applied to
 *  the period's posted bills minus its sale returns (output) and
 *  the period's purchases minus its purchase returns (input). The
 *  TOTALS therefore equal the journal's tax movement over the same
 *  window (asserted in the harness against `taxPosition`). Held and
 *  voided bills never posted tax and are excluded. */
export function taxReport(
  bills: Bill[],
  returns: SaleReturn[],
  purchases: Purchase[],
  purchaseReturns: PurchaseReturn[],
  range: ReportRange
): TaxReport {
  const merge = (
    map: Map<string, TaxReportRow>,
    groups: BillTaxLine[],
    side: "output" | "input",
    sign: 1 | -1
  ) => {
    for (const g of groups) {
      const key = slabKey(g);
      const row = map.get(key) ?? { ...g, amount: 0, output: 0, input: 0 };
      row[side] += sign * g.amount;
      map.set(key, row);
    }
  };
  const map = new Map<string, TaxReportRow>();

  const postedBills = bills.filter(
    (b) => inRange(b.ts, range) && b.status !== "held" && b.status !== "voided"
  );
  merge(map, taxLinesForItems(postedBills.flatMap((b) => b.items)), "output", 1);
  const rets = returns.filter((r) => inRange(r.ts, range));
  merge(map, taxLinesForItems(rets.flatMap((r) => r.items)), "output", -1);

  const purs = purchases.filter((p) => inRange(p.ts, range));
  merge(map, taxLinesForItems(purs.flatMap((p) => p.items)), "input", 1);
  const prets = purchaseReturns.filter((r) => inRange(r.ts, range));
  merge(map, taxLinesForItems(prets.flatMap((r) => r.items)), "input", -1);

  const rows = [...map.values()]
    .filter((r) => r.output !== 0 || r.input !== 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  const outputTotal = rows.reduce((a, r) => a + r.output, 0);
  const inputTotal = rows.reduce((a, r) => a + r.input, 0);
  return { rows, outputTotal, inputTotal, net: outputTotal - inputTotal };
}

/* ---------------- 7 · customer statement ---------------- */

export interface CustomerStatement {
  key: string;
  opening: number;
  closing: number;
  givenInPeriod: number;
  repaidInPeriod: number;
  rows: Array<{ entry: CreditEntry; signed: number; balance: number }>;
}

/** One customer's khata over the range. The closing balance of a
 *  full-history range IS `customerOutstanding(credits, key)` — the
 *  CreditLedger figure — because both are the same signed sum over
 *  the same rows (harness-asserted). */
export function customerStatement(
  credits: CreditEntry[],
  key: string,
  range: ReportRange
): CustomerStatement {
  const all = credits
    .filter((c) => creditKey(c) === key)
    .sort((a, b) => a.ts.localeCompare(b.ts));
  const signed = (c: CreditEntry): number =>
    c.kind === "credit" ? c.amount : -c.amount;

  let opening = 0;
  for (const c of all) {
    if (c.ts < range.fromTs) opening += signed(c);
    else break;
  }
  let balance = opening;
  let givenInPeriod = 0;
  let repaidInPeriod = 0;
  const rows: CustomerStatement["rows"] = [];
  for (const c of all) {
    if (!inRange(c.ts, range)) continue;
    balance += signed(c);
    if (c.kind === "credit" && c.amount > 0) givenInPeriod += c.amount;
    if (c.kind === "repayment") repaidInPeriod += c.amount;
    rows.push({ entry: c, signed: signed(c), balance });
  }
  return { key, opening, closing: balance, givenInPeriod, repaidInPeriod, rows };
}

/* ---------------- 8 · supplier statement ---------------- */

export interface SupplierStatementEvent {
  ts: string;
  kind: "purchase" | "payment" | "reversal" | "return";
  /** The figure the statement prints for the row. */
  amount: number;
  /** Signed effect on the payable balance — mirrors
   *  `supplierBalance`'s netting exactly: a purchase return moves
   *  the balance by −payableOffset only (the refund leg un-pays,
   *  it does not settle twice). */
  effect: number;
  balance: number;
  note: string;
  /** Purchase returns only: the two settlement legs. */
  returnGross?: number;
  refundAmount?: number;
}

export interface SupplierStatement {
  supplierId: string;
  opening: number;
  closing: number;
  purchasedInPeriod: number;
  paidInPeriod: number;
  returnedInPeriod: number; // Σ gross of the period's purchase returns
  events: SupplierStatementEvent[];
}

export function supplierStatement(
  purchases: Purchase[],
  payments: SupplierPayment[],
  purchaseReturns: PurchaseReturn[],
  supplierId: string,
  range: ReportRange
): SupplierStatement {
  const before = <T extends { ts: string }>(rows: T[]): T[] =>
    rows.filter((r) => r.ts < range.fromTs);
  const opening = supplierBalance(
    before(purchases),
    before(payments),
    supplierId,
    before(purchaseReturns)
  );

  const events: Array<Omit<SupplierStatementEvent, "balance">> = [];
  let purchasedInPeriod = 0;
  let paidInPeriod = 0;
  let returnedInPeriod = 0;

  for (const p of purchases) {
    if (p.supplierId !== supplierId || !inRange(p.ts, range)) continue;
    purchasedInPeriod += p.total;
    events.push({
      ts: p.ts,
      kind: "purchase",
      amount: p.total,
      effect: p.total,
      note: p.note,
    });
  }
  for (const p of payments) {
    if (p.supplierId !== supplierId || !inRange(p.ts, range)) continue;
    if (p.kind === "reversal") {
      events.push({
        ts: p.ts,
        kind: "reversal",
        amount: p.amount,
        effect: p.amount,
        note: p.note,
      });
    } else {
      paidInPeriod += p.amount;
      events.push({
        ts: p.ts,
        kind: "payment",
        amount: p.amount,
        effect: -p.amount,
        note: p.note,
      });
    }
  }
  for (const r of purchaseReturns) {
    if (r.supplierId !== supplierId || !inRange(r.ts, range)) continue;
    const gross = purchaseReturnGross(r);
    returnedInPeriod += gross;
    events.push({
      ts: r.ts,
      kind: "return",
      amount: gross,
      effect: -r.payableOffset,
      note: "",
      returnGross: gross,
      refundAmount: r.refundAmount,
    });
  }

  events.sort((a, b) => a.ts.localeCompare(b.ts));
  let balance = opening;
  const withBalance: SupplierStatementEvent[] = events.map((e) => {
    balance += e.effect;
    return { ...e, balance };
  });

  return {
    supplierId,
    opening,
    closing: balance,
    purchasedInPeriod,
    paidInPeriod,
    returnedInPeriod,
    events: withBalance,
  };
}

/* ---------------- 9 · aging (snapshot — range-free) ---------------- */

export interface AgingReport {
  receivables: AgingBuckets;
  payables: AgingBuckets;
}

/** FinanceView's aging tables, verbatim — the same two calls. */
export function agingReport(
  credits: CreditEntry[],
  purchases: Purchase[],
  payments: SupplierPayment[],
  purchaseReturns: PurchaseReturn[]
): AgingReport {
  return {
    receivables: receivablesAging(credits),
    payables: payablesAging(purchases, payments, purchaseReturns),
  };
}

/* ---------------- 10 · expenses ---------------- */

export interface ExpensesReport {
  rows: Expense[];
  total: number;
  byCategory: Array<{ category: string; amount: number; count: number }>;
}

export function expensesReport(expenses: Expense[], range: ReportRange): ExpensesReport {
  const rows = expenses
    .filter((e) => inRange(e.ts, range))
    .sort((a, b) => a.ts.localeCompare(b.ts));
  const map = new Map<string, { category: string; amount: number; count: number }>();
  for (const e of rows) {
    const g = map.get(e.category) ?? { category: e.category, amount: 0, count: 0 };
    g.amount += e.amount;
    g.count += 1;
    map.set(e.category, g);
  }
  return {
    rows,
    total: expenseTotal(rows),
    byCategory: [...map.values()].sort((a, b) => b.amount - a.amount),
  };
}

/* ---------------- 11 · cheques ---------------- */

export interface ChequesReport {
  groups: Array<{
    id: "drawer" | "atBank" | "issued" | "cleared" | "bounced" | "returned";
    rows: Cheque[];
    total: number;
  }>;
  totalCaptured: number;
}

/** Cheques CAPTURED in the period, grouped by their current status
 *  (the registry's own views — `chequesInDrawer`, `chequesAtBank`,
 *  `pendingOutCheques` — plus the terminal statuses), each group
 *  sorted by due date. */
export function chequesReport(cheques: Cheque[], range: ReportRange): ChequesReport {
  const captured = cheques.filter((c) => inRange(c.ts, range));
  const byDue = (rows: Cheque[]): Cheque[] =>
    [...rows].sort((a, b) => a.dueDateISO.localeCompare(b.dueDateISO));
  const group = (id: ChequesReport["groups"][number]["id"], rows: Cheque[]) => ({
    id,
    rows: byDue(rows),
    total: rows.reduce((a, c) => a + c.amount, 0),
  });
  return {
    groups: [
      group("drawer", chequesInDrawer(captured)),
      group("atBank", chequesAtBank(captured)),
      group("issued", pendingOutCheques(captured)),
      group("cleared", captured.filter((c) => c.status === "cleared")),
      group("bounced", captured.filter((c) => c.status === "bounced")),
      group("returned", captured.filter((c) => c.status === "returned")),
    ],
    totalCaptured: captured.reduce((a, c) => a + c.amount, 0),
  };
}

/* ---------------- 12 · day closes ---------------- */

export interface DayCloseReportRow {
  close: DayClose;
  salesTotal: number; // Σ of the close's recorded salesByMethod
}

export interface DayCloseReport {
  rows: DayCloseReportRow[];
  totals: {
    sales: number;
    expenses: number;
    creditGiven: number;
    creditReceived: number;
    supplierPaid: number;
    expected: number;
    counted: number;
    difference: number;
  };
}

export function dayCloseReport(dayCloses: DayClose[], range: ReportRange): DayCloseReport {
  const rows = dayCloses
    .filter((d) => d.dateISO >= range.fromDate && d.dateISO <= range.toDate)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
    .map((close) => ({
      close,
      salesTotal: Object.values(close.salesByMethod ?? {}).reduce((a, v) => a + v, 0),
    }));
  const sum = (f: (r: DayCloseReportRow) => number): number =>
    rows.reduce((a, r) => a + f(r), 0);
  return {
    rows,
    totals: {
      sales: sum((r) => r.salesTotal),
      expenses: sum((r) => r.close.expensesTotal),
      creditGiven: sum((r) => r.close.creditGiven),
      creditReceived: sum((r) => r.close.creditReceived),
      supplierPaid: sum((r) => r.close.supplierPaid),
      expected: sum((r) => r.close.expectedCash),
      counted: sum((r) => r.close.countedCash),
      difference: sum((r) => r.close.difference),
    },
  };
}

/* ---------------- 13 · notes ---------------- */

export interface NotesReport {
  rows: DocNote[];
  credit: { count: number; goods: number; tax: number; total: number };
  debit: { count: number; goods: number; tax: number; total: number };
}

export function notesReport(notes: DocNote[], range: ReportRange): NotesReport {
  const rows = notes
    .filter((n) => inRange(n.ts, range))
    .sort((a, b) => a.ts.localeCompare(b.ts));
  const side = (kind: "credit" | "debit") => {
    const rs = rows.filter((n) => n.kind === kind);
    return {
      count: rs.length,
      goods: rs.reduce((a, n) => a + n.goodsAmount, 0),
      tax: rs.reduce((a, n) => a + n.taxAmount, 0),
      total: rs.reduce((a, n) => a + n.total, 0),
    };
  };
  return { rows, credit: side("credit"), debit: side("debit") };
}

/* ---------------- output-language formatting ---------------- */

const numFmt = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });

/** `fmtPKR` with an explicit language (the app's formatter follows
 *  the UI language; report output follows the CHOSEN language). */
export function moneyIn(lang: Lang, n: number): string {
  return `${translate(lang, "common.currency" as I18nKey)} ${numFmt.format(Math.round(n))}`;
}

const UNIT_LABELS: Record<Lang, Record<string, string>> = {
  en: { pcs: "pcs", kg: "kg", L: "L", dozen: "dozen", packet: "packet", bag: "bag" },
  ur: { pcs: "پیس", kg: "کلو", L: "لیٹر", dozen: "درجن", packet: "پیکٹ", bag: "تھیلا" },
  ps: { pcs: "پیس", kg: "کيلو", L: "ليټر", dozen: "درځن", packet: "پاکټ", bag: "بوجۍ" },
  fa: { pcs: "دانه", kg: "کیلو", L: "لیتر", dozen: "درجن", packet: "پاکت", bag: "بوجی" },
};

/** `fmtUnit` with an explicit language; unknown units pass through. */
export function unitIn(lang: Lang, unit: string): string {
  return UNIT_LABELS[lang][unit] ?? unit;
}

/** `fmtDate` with an explicit language. */
export function dateIn(lang: Lang, input: string | number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const month = translate(lang, `common.month.${d.getMonth()}` as I18nKey);
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
}

/** A YYYY-MM-DD business date in the given language (no timezone
 *  shift — the date IS the label). */
export function dateISOIn(lang: Lang, dateISO: string): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  if (!y || !m || !d) return dateISO;
  const month = translate(lang, `common.month.${m - 1}` as I18nKey);
  return `${d} ${month} ${y}`;
}

/** "12 Oct 2026 – 18 Oct 2026" in the output language. */
export function rangeLabelIn(lang: Lang, range: ReportRange): string {
  return `${dateISOIn(lang, range.fromDate)} – ${dateISOIn(lang, range.toDate)}`;
}

/**
 * The WhatsApp / Web-Share text for a report: shop name, report
 * title, period and the headline totals — all in the report's
 * chosen language. The figures are formatted by the caller from
 * the SAME builder output the screen and sheet render, so the
 * three surfaces cannot disagree.
 */
export function reportShareText(
  lang: Lang,
  args: {
    shopName: string;
    title: string;
    period: string;
    lines: Array<[string, string]>;
  }
): string {
  const out = [
    args.shopName || "Dukaan AI",
    args.title,
    `${translate(lang, "rep.period" as I18nKey)}: ${args.period}`,
    ...args.lines.map(([label, value]) => `${label}: ${value}`),
    translate(lang, "rep.footer" as I18nKey),
  ];
  return out.join("\n");
}
