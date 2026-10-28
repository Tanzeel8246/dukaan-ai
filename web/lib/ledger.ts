/**
 * Dukaan AI — double-entry ledger helpers + finance selectors.
 *
 * Every report in the Complete edition (P&L, cash book, day close,
 * receivables/payables) is DERIVED from the append-only `journal`
 * collection plus the operational subledgers (credits, purchases,
 * supplier payments). No separate mutable totals exist anywhere, so
 * reports can never drift from the journal.
 *
 * Journal conventions (see PRODUCTION.md):
 *  - sale/bill:   Dr cash|wallet|receivables (by payment part),
 *                 Dr sales_discount, Dr cogs / Cr sales_revenue, Cr inventory
 *  - purchase:    Dr purchases + Dr inventory / Cr purchases + Cr payables
 *                 (purchases clear into inventory — perpetual method)
 *  - supplier payment: Dr payables / Cr cash|wallet
 *  - expense:     Dr expense_<category> / Cr cash|wallet
 *  - credit given (standalone): Dr receivables / Cr cash — a standalone
 *                 udhaar is a CASH LOAN out of the till, never revenue.
 *                 Goods sold on credit go through a bill whose credit
 *                 payment part debits receivables inside the bill entry
 *                 (with revenue + COGS posted there).
 *  - repayment:    Dr cash|wallet / Cr receivables
 *  - return/void:  Dr sales_revenue + Dr inventory /
 *                  Cr cash (refund) + Cr receivables (credit part) + Cr cogs
 *  - purchase return (B4): Dr payables (offset) and/or Dr cash|wallet
 *                  (supplier refund) / Cr inventory (at the purchase
 *                  line's in-cost, net of tax) + Cr tax_input
 *  - cheques (B5): capture rides the host entry — an IN part debits
 *                  cheques_in_hand (ref: chequeId) in place of money;
 *                  an OUT issuance credits cheques_issued (ref:
 *                  chequeId) in place of money. Deposit posts
 *                  NOTHING (custody only). Clearing: Dr cash|wallet
 *                  / Cr cheques_in_hand (in) or Dr cheques_issued /
 *                  Cr cash|wallet (out). Bounce restores the claim:
 *                  Dr receivables / Cr cheques_in_hand (in, with a
 *                  compensating credits row in the bill's F-6 lot)
 *                  or Dr cheques_issued / Cr payables (out, with a
 *                  compensating supplierPayments "reversal" row that
 *                  supplierPaid nets out). Full templates: §4.3 of
 *                  the Phase B design; composers in lib/cheques.ts.
 *  - stock loss:   Dr inventory_loss / Cr inventory (and reverse for gains)
 *  - cash book:    in → Dr cash|wallet / Cr capital;
 *                  out → Dr drawings / Cr cash|wallet
 */
import type {
  AccountCode,
  Bill,
  BillStatus,
  CreditEntry,
  Expense,
  JournalEntry,
  JournalLine,
  JournalRefType,
  MoneyAccount,
  PayMethod,
  Product,
  Purchase,
  PurchaseReturn,
  Sale,
  SupplierPayment,
} from "./types";
import { revenueOnDay, salesOnDay } from "./selectors";
import { normalBalanceSign } from "./coa";

/* ---------------- entry construction ---------------- */

let seq = 0;
/** Unique-enough client id, matching the store's existing id style. */
export function newId(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}`;
}

export function makeEntry(
  memo: string,
  refType: JournalRefType,
  refId: string | null,
  lines: JournalLine[],
  opts?: { dayOffset?: number; ts?: string; reversesId?: string | null; idPrefix?: string }
): JournalEntry {
  const clean = lines.filter((l) => l.debit > 0 || l.credit > 0);
  const entry: JournalEntry = {
    id: newId(opts?.idPrefix ?? "j"),
    memo,
    refType,
    refId,
    reversesId: opts?.reversesId ?? null,
    lines: clean,
    dayOffset: opts?.dayOffset ?? 0,
    ts: opts?.ts ?? new Date().toISOString(),
  };
  // F-1: the balance invariant is ENFORCED here, at the single point
  // every posting path passes through. The journal is append-only, so
  // an unbalanced entry could never be repaired in place — refuse to
  // construct it at all.
  if (!entryBalances(entry)) {
    throw new Error(
      `Refusing to post unbalanced journal entry "${memo}" (Σdebit ≠ Σcredit).`
    );
  }
  return entry;
}

/** An entry balances when Σdebit == Σcredit (to the paisa). */
export function entryBalances(e: JournalEntry): boolean {
  const d = e.lines.reduce((a, l) => a + l.debit, 0);
  const c = e.lines.reduce((a, l) => a + l.credit, 0);
  return Math.abs(d - c) < 0.01;
}

/** Round to the paisa — mirrors lib/tax's `round2` exactly (tax
 *  imports from this module, so the helper cannot be shared). */
function roundPaisa(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Phase C · C3 (design §4.1): compose the stock-value leg of a
 * movement as one journal line per CLASS account it touches. The
 * caller supplies the movement's total value and the raw-class
 * share of it (Σ of the raw products' valued parts); the goods
 * share is the residual, so the parts sum to the total to the
 * paisa by construction — the F-3 final-absorb discipline.
 *
 * With NO raw share this returns exactly the single `inventory`
 * line every template posted before C3 — the no-raw regression
 * gate: a shop with no raw products sees byte-identical journal
 * output from every generalised template.
 */
export function classLegLines(
  total: number,
  rawShare: number,
  side: "debit" | "credit"
): JournalLine[] {
  const line = (
    account: "inventory" | "inventory_raw",
    amount: number
  ): JournalLine =>
    side === "debit"
      ? { account, debit: amount, credit: 0 }
      : { account, debit: 0, credit: amount };
  const rawAmt = roundPaisa(rawShare);
  if (rawAmt <= 0) return [line("inventory", total)];
  const goodsAmt = roundPaisa(total - rawAmt);
  if (goodsAmt < 0) return [line("inventory_raw", total)]; // float-dust guard
  const lines: JournalLine[] = [];
  if (goodsAmt !== 0) lines.push(line("inventory", goodsAmt));
  lines.push(line("inventory_raw", rawAmt));
  return lines;
}

/**
 * The latest UNREVERSED posting for a refId, whatever its refType
 * (F-5: seeded postings carry refType "seed", live ones "expense",
 * reposts "expense" — the reversal engine must find the current live
 * posting by refId alone, skipping entries already reversed and
 * skipping reversal entries themselves).
 */
export function findUnreversedPosting(
  entries: JournalEntry[],
  refId: string
): JournalEntry | null {
  const reversedIds = new Set(
    entries.map((e) => e.reversesId).filter((x): x is string => !!x)
  );
  const candidates = entries.filter(
    (e) => e.refId === refId && e.reversesId == null && !reversedIds.has(e.id)
  );
  candidates.sort((a, b) => b.ts.localeCompare(a.ts));
  return candidates[0] ?? null;
}

/**
 * The part of a stock adjustment that can actually be applied to the
 * shelf (F-11): a removal can never exceed what is on hand. Postings
 * must use this clamped delta so the journal and the shelf agree.
 */
export function appliedAdjustmentDelta(stockQty: number, delta: number): number {
  if (delta >= 0) return delta;
  return -Math.min(-delta, Math.max(0, stockQty));
}

export interface BillCreditPosition {
  /** Udhaar originally posted against this bill. */
  given: number;
  /** Already reversed by returns/voids of this bill. */
  reversed: number;
  /** Repayments FIFO-allocated to this bill (customer-level pool). */
  repaidAllocated: number;
  /** given − reversed − repaidAllocated, floored at 0. */
  outstanding: number;
}

/**
 * How much of a bill's udhaar part is still genuinely owed (F-6).
 * Repayments are not bill-linked, so they are allocated FIFO across
 * the customer's credit lots (oldest first, each lot net of its own
 * return/void reversals) — the same convention as receivablesAging.
 * A void/return may only reduce receivables by `outstanding`; any
 * already-repaid part is money the shop must hand back in cash.
 */
export function billCreditOutstanding(
  credits: CreditEntry[],
  bill: Bill
): BillCreditPosition {
  const groupKey =
    bill.customerId ??
    `name:${bill.customerName.trim().toLowerCase()}|${bill.customerPhone.trim()}`;
  const rows = credits.filter((c) => creditKey(c) === groupKey);

  let given = 0;
  let reversed = 0;
  // Lots keyed by billId (standalone rows are their own lot, by row id).
  const lots = new Map<string, { net: number; dayOffset: number; ts: string }>();
  const lotOf = (c: CreditEntry) => c.billId ?? `row:${c.id}`;
  for (const c of rows) {
    if (c.kind !== "credit") continue;
    const lot = lots.get(lotOf(c)) ?? { net: 0, dayOffset: c.dayOffset, ts: c.ts };
    lot.net += c.amount; // negative rows are reversals of their own lot
    if (c.dayOffset > lot.dayOffset) {
      lot.dayOffset = c.dayOffset;
      lot.ts = c.ts;
    }
    lots.set(lotOf(c), lot);
    if (c.billId === bill.id) {
      if (c.amount > 0) given += c.amount;
      else reversed += -c.amount;
    }
  }
  let pool = rows
    .filter((c) => c.kind === "repayment")
    .reduce((a, c) => a + c.amount, 0);
  const ordered = [...lots.entries()].sort(
    (a, b) => b[1].dayOffset - a[1].dayOffset || a[1].ts.localeCompare(b[1].ts)
  );
  let repaidAllocated = 0;
  for (const [lotKey, lot] of ordered) {
    if (pool <= 0) break;
    const applied = Math.min(pool, Math.max(0, lot.net));
    pool -= applied;
    if (lotKey === bill.id) repaidAllocated = applied;
  }
  return {
    given,
    reversed,
    repaidAllocated,
    outstanding: Math.max(0, given - reversed - repaidAllocated),
  };
}

/**
 * Live payment status of a bill: accounts for outstanding credit balance.
 * Returns "paid", "partial", "unpaid", "held", "voided", "returned", or "partially_returned".
 */
export function effectiveBillStatus(
  bill: Bill,
  credits?: CreditEntry[]
): BillStatus {
  if (
    bill.status === "held" ||
    bill.status === "voided" ||
    bill.status === "returned" ||
    bill.status === "partially_returned"
  ) {
    return bill.status;
  }
  const creditPart = bill.payments.find((p) => p.method === "credit")?.amount ?? 0;
  if (creditPart <= 0) return "paid";
  if (credits && credits.length > 0) {
    const pos = billCreditOutstanding(credits, bill);
    if (pos.outstanding <= 0.01) return "paid";
    if (pos.outstanding < bill.total - 0.01) return "partial";
    return "unpaid";
  }
  if (creditPart >= bill.total - 0.01) return "unpaid";
  return "partial";
}

/** Settlement account for a payment method (credit → receivables). */
export function accountForMethod(method: PayMethod): AccountCode {
  if (method === "cash") return "cash";
  if (method === "credit") return "receivables";
  return "wallet";
}

/* ---------------- balances from the journal ---------------- */

/** Net balance of an account (debits − credits) across all entries. */
export function accountBalance(entries: JournalEntry[], account: AccountCode): number {
  let bal = 0;
  for (const e of entries) {
    for (const l of e.lines) {
      if (l.account === account) bal += l.debit - l.credit;
    }
  }
  return bal;
}

/**
 * Balance of an account stated on its NORMAL side, per the COA v2
 * registry (lib/coa.ts): debit-normal accounts (assets, expenses,
 * contra-income/equity) report debits − credits — identical to
 * `accountBalance`; credit-normal accounts (liabilities, income,
 * equity) report credits − debits. This replaces the hand-negations
 * that used to be scattered through the selectors below.
 */
export function accountNormalBalance(
  entries: JournalEntry[],
  account: AccountCode
): number {
  return normalBalanceSign(account) * accountBalance(entries, account);
}

export function cashBalance(entries: JournalEntry[]): number {
  return accountBalance(entries, "cash");
}

export function walletBalance(entries: JournalEntry[]): number {
  return accountBalance(entries, "wallet");
}

/* ---------------- money accounts (Phase A · A2) ----------------
 * The GL stays coarse: `cash` and `wallet` are the only money buckets.
 * WHICH money account a line belongs to is the line's `ref` — the same
 * subledger pattern as receivables (per-customer ref) / payables
 * (per-supplier ref). Lines written before A2 carry `ref == null`;
 * they resolve to the account flagged `legacyFor` its GL bucket, which
 * makes per-account sums IDENTICAL to the GL totals by construction —
 * an identity, not an approximation (design §1.4, harness-verified).
 */

/** GL bucket a money account settles into (bank rides in `wallet`). */
export function glForAccount(a: MoneyAccount): "cash" | "wallet" {
  return a.kind === "cash" ? "cash" : "wallet";
}

/** Does this journal line belong to this money account? */
export function lineResolvesTo(line: JournalLine, account: MoneyAccount): boolean {
  if (line.account !== glForAccount(account)) return false;
  if (line.ref != null) return line.ref === account.id;
  return account.legacyFor === line.account;
}

/** Derived balance of one money account (debits − credits over every
 *  line that resolves to it). Never stored anywhere. */
export function moneyAccountBalance(entries: JournalEntry[], account: MoneyAccount): number {
  let bal = 0;
  for (const e of entries) {
    for (const l of e.lines) {
      if (lineResolvesTo(l, account)) bal += l.debit - l.credit;
    }
  }
  return bal;
}

/** Σ of one GL bucket's per-account balances. By the legacy-resolution
 *  identity this equals `accountBalance(entries, bucket)` exactly
 *  whenever the shop's account set carries its `legacyFor` pair. */
export function accountsBucketBalance(
  entries: JournalEntry[],
  accounts: MoneyAccount[],
  bucket: "cash" | "wallet"
): number {
  return accounts
    .filter((a) => glForAccount(a) === bucket)
    .reduce((sum, a) => sum + moneyAccountBalance(entries, a), 0);
}

/**
 * The account a payment method settles into when the desk does not
 * choose one explicitly: the non-archived account carrying that method
 * as its default; failing that, the bucket's legacy account; failing
 * that, the first live account in the bucket. Null only when the shop
 * has no account in the bucket at all.
 */
export function defaultAccountForMethod(
  accounts: MoneyAccount[],
  method: PayMethod
): MoneyAccount | null {
  if (method === "credit") return null; // credit is not money
  const live = accounts.filter((a) => !a.archived);
  const exact = live.find((a) => a.method === method);
  if (exact) return exact;
  const bucket = method === "cash" ? "cash" : "wallet";
  const legacy = live.find((a) => a.legacyFor === bucket);
  if (legacy) return legacy;
  const inBucket = live
    .filter((a) => glForAccount(a) === bucket)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return inBucket[0] ?? null;
}

export interface OutflowPreview {
  account: MoneyAccount;
  /** The account's derived balance right now. */
  balance: number;
  /** What the balance becomes after the outflow (balance − amount). */
  balanceAfter: number;
}

/**
 * Preview a money OUTFLOW against the account it will settle from —
 * the resolution mirrors the posting side exactly (an explicit
 * account id wins when it names a live account; otherwise the
 * method's default, `defaultAccountForMethod`). The desks use this
 * to warn BEFORE posting when an expense / payment / transfer would
 * drive its account negative — a warning, never a block: informal
 * overdrafts are real, but they should never be silent. Returns
 * null when no account resolves at all (a shop with no accounts —
 * the legacy GL-only path, where there is no per-account figure to
 * warn about).
 */
export function outflowPreview(
  entries: JournalEntry[],
  accounts: MoneyAccount[],
  input: { method: PayMethod; accountId?: string | null; amount: number }
): OutflowPreview | null {
  const explicit = input.accountId
    ? accounts.find((a) => a.id === input.accountId && !a.archived)
    : undefined;
  const account = explicit ?? defaultAccountForMethod(accounts, input.method);
  if (!account) return null;
  const balance = moneyAccountBalance(entries, account);
  return { account, balance, balanceAfter: balance - input.amount };
}

/** Per-account cash book: every journal line resolving to the account,
 *  oldest first, with a running balance — `cashBook` generalised. */export interface AccountBookRow {
  entryId: string;
  ts: string;
  dayOffset: number;
  memo: string;
  inAmount: number;
  outAmount: number;
  balance: number;
}

export function accountBook(entries: JournalEntry[], account: MoneyAccount): AccountBookRow[] {
  const sorted = [...entries].sort((a, b) => a.ts.localeCompare(b.ts));
  let balance = 0;
  const rows: AccountBookRow[] = [];
  for (const e of sorted) {
    for (const l of e.lines) {
      if (!lineResolvesTo(l, account)) continue;
      balance += l.debit - l.credit;
      rows.push({
        entryId: e.id,
        ts: e.ts,
        dayOffset: e.dayOffset,
        memo: e.memo,
        inAmount: l.debit,
        outAmount: l.credit,
        balance,
      });
    }
  }
  return rows;
}

/** Net movement of one money account within a dayOffset window
 *  (0 = today, in the app's day convention). */
export function accountDayNet(
  entries: JournalEntry[],
  account: MoneyAccount,
  dayOffset = 0
): number {
  let net = 0;
  for (const e of entries) {
    if (e.dayOffset !== dayOffset) continue;
    for (const l of e.lines) {
      if (lineResolvesTo(l, account)) net += l.debit - l.credit;
    }
  }
  return net;
}

/**
 * Journal-derived day-close expectation for one cash account
 * (design §1.4): opening + the account's journal movement today. When
 * `openingCash` is the account's pre-today journal balance this equals
 * `moneyAccountBalance(entries, account)` exactly.
 */
export function expectedCloseForAccount(
  entries: JournalEntry[],
  account: MoneyAccount,
  openingCash: number
): number {
  return openingCash + accountDayNet(entries, account, 0);
}

export function receivablesTotal(entries: JournalEntry[]): number {
  // Receivables is a debit-normal asset: normal balance == raw balance.
  return accountNormalBalance(entries, "receivables");
}

export function payablesTotal(entries: JournalEntry[]): number {
  // Payables is a credit-normal liability (registry): balance = credits − debits.
  return accountNormalBalance(entries, "payables");
}

/* ---------------- month windows ---------------- */

export function sameMonth(ts: string, ref = new Date()): boolean {
  const d = new Date(ts);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function entriesInMonth(entries: JournalEntry[], ref = new Date()): JournalEntry[] {
  return entries.filter((e) => sameMonth(e.ts, ref));
}

export interface MonthPL {
  revenue: number; // gross sales_revenue credits
  discounts: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  expensesByCategory: Record<string, number>;
  expensesTotal: number;
  stockLoss: number;
  net: number;
}

const CORE_EXPENSE_ACCOUNTS: AccountCode[] = [
  "expense_rent",
  "expense_electricity",
  "expense_salary",
  "expense_transport",
  "expense_other",
];

const EXTENDED_EXPENSE_ACCOUNTS: AccountCode[] = [
  "expense_finance",
  "expense_loyalty",
];

/** P&L over an already-filtered entry set — the single computation
 *  behind both the month window and arbitrary ranges. */
function plOver(selected: JournalEntry[]): MonthPL {
  // Phase D · D4 (design §4.6): P&L-type reports EXCLUDE `fy_close`
  // entries. A closing entry is a transfer of the year's result
  // into retained earnings, not trading activity — excluding it
  // keeps a closed year's P&L reading exactly as it did the day
  // before the close, while the trial balance (which must NOT
  // exclude it) shows the zeroed truth.
  const trading = selected.filter((e) => e.refType !== "fy_close");
  const net = (account: AccountCode) => accountNormalBalance(trading, account);
  const revenue = net("sales_revenue");
  const discounts = net("sales_discount");
  const cogs = net("cogs");
  const expensesByCategory: Record<string, number> = {};
  let expensesTotal = 0;
  for (const acc of CORE_EXPENSE_ACCOUNTS) {
    const v = net(acc);
    expensesByCategory[acc.replace("expense_", "")] = v;
    expensesTotal += v;
  }
  for (const acc of EXTENDED_EXPENSE_ACCOUNTS) {
    const v = net(acc);
    expensesTotal += v;
    if (v !== 0) {
      expensesByCategory[acc.replace("expense_", "")] = v;
    }
  }
  const stockLoss = net("inventory_loss");
  const netRevenue = revenue - discounts;
  const grossProfit = netRevenue - cogs;
  return {
    revenue,
    discounts,
    netRevenue,
    cogs,
    grossProfit,
    expensesByCategory,
    expensesTotal,
    stockLoss,
    net: grossProfit - expensesTotal - stockLoss,
  };
}

/** Monthly profit & loss, computed purely from journal lines. Every
 *  figure is the account's balance on its registry normal side
 *  (income: credits − debits; expenses / contra-income: debits −
 *  credits) via `accountNormalBalance`. */
export function profitAndLoss(entries: JournalEntry[], ref = new Date()): MonthPL {
  return plOver(entriesInMonth(entries, ref));
}

/**
 * Profit & loss over an arbitrary instant range (`fromTs <= ts <
 * toTs`) — the fiscal-year windows of Phase A · A5 (design §5).
 * Identical computation to the monthly P&L; only the entry window
 * differs, so a fiscal-year P&L respects its range exactly as the
 * monthly P&L respects its month.
 */
export function profitAndLossInRange(
  entries: JournalEntry[],
  fromTs: string,
  toTs: string
): MonthPL {
  return plOver(entries.filter((e) => e.ts >= fromTs && e.ts < toTs));
}

/** Cash-book rows: every journal line touching cash/wallet, oldest first,
 *  with a running balance per account. */
export interface CashBookRow {
  entryId: string;
  ts: string;
  dayOffset: number;
  memo: string;
  account: "cash" | "wallet";
  inAmount: number;
  outAmount: number;
  balance: number;
}

export function cashBook(entries: JournalEntry[]): CashBookRow[] {
  const sorted = [...entries].sort((a, b) => a.ts.localeCompare(b.ts));
  const balances: Record<string, number> = { cash: 0, wallet: 0 };
  const rows: CashBookRow[] = [];
  for (const e of sorted) {
    for (const l of e.lines) {
      if (l.account !== "cash" && l.account !== "wallet") continue;
      balances[l.account] += l.debit - l.credit;
      rows.push({
        entryId: e.id,
        ts: e.ts,
        dayOffset: e.dayOffset,
        memo: e.memo,
        account: l.account,
        inAmount: l.debit,
        outAmount: l.credit,
        balance: balances[l.account],
      });
    }
  }
  return rows;
}

/* ---------------- subledger selectors ---------------- */

/** Gross claim reversed by ONE purchase return: the part settled
 *  by reducing the payable plus any cash the supplier handed back.
 *  Both legs extinguish the same claim, so the supplier's purchased
 *  side nets by their sum (Phase B · B4, design §3.2). */
export function purchaseReturnGross(ret: PurchaseReturn): number {
  return ret.payableOffset + ret.refundAmount;
}

/** Σ gross of the purchase returns recorded against ONE purchase. */
export function purchaseReturnedGross(
  purchaseReturns: PurchaseReturn[],
  purchaseId: string
): number {
  return purchaseReturns
    .filter((r) => r.purchaseId === purchaseId)
    .reduce((a, r) => a + purchaseReturnGross(r), 0);
}

/** Σ gross of one supplier's purchase returns. */
export function supplierReturned(
  purchaseReturns: PurchaseReturn[],
  supplierId: string
): number {
  return purchaseReturns
    .filter((r) => r.supplierId === supplierId)
    .reduce((a, r) => a + purchaseReturnGross(r), 0);
}

/** Σ of the CASH leg of one supplier's purchase returns — money
 *  the supplier handed back. In the balance derivation a refund
 *  is a NEGATIVE PAYMENT (the F-6 compensating discipline): the
 *  journal's cash_refund template (Dr cash / Cr inventory +
 *  tax_input) never touches `payables`, so the only way journal ≡
 *  subledger survives a refund — the design §9 checkpoint asserts
 *  it after offset AND after cash refund — is for the subledger
 *  to un-pay the refunded amount here. */
export function supplierRefunded(
  purchaseReturns: PurchaseReturn[],
  supplierId: string
): number {
  return purchaseReturns
    .filter((r) => r.supplierId === supplierId)
    .reduce((a, r) => a + r.refundAmount, 0);
}

/**
 * What a supplier has supplied, NET of goods sent back (Phase B ·
 * B4 amendment, design §3.2): purchased − Σ purchase-return gross.
 * A returned purchase stops counting as supplied the moment its
 * return posts — the exact moment the journal debits `payables`
 * for it — so this derivation and the journal can never drift
 * (the R-B2 discipline: engine and selectors amended together).
 */
export function supplierPurchased(
  purchases: Purchase[],
  supplierId: string,
  purchaseReturns: PurchaseReturn[] = []
): number {
  const bought = purchases
    .filter((p) => p.supplierId === supplierId)
    .reduce((a, p) => a + p.total, 0);
  return bought - supplierReturned(purchaseReturns, supplierId);
}

export function supplierPaid(payments: SupplierPayment[], supplierId: string): number {
  // Phase B · B5: a compensating row written when an issued cheque
  // bounces carries kind "reversal" and NETS OUT of the paid total
  // (its amount stays positive; the kind carries the sign — the
  // debit-side analogue of F-6's negative credit rows). Without
  // this, a bounced cheque would leave the subledger payable
  // settled while the journal re-opened it (design §4.3).
  return payments
    .filter((p) => p.supplierId === supplierId)
    .reduce((a, p) => a + (p.kind === "reversal" ? -p.amount : p.amount), 0);
}

/** Payable balance for one supplier: purchased (net of purchase
 *  returns) − paid (net of refunds received). A purchase return
 *  settled by payable offset against an already-paid purchase
 *  drives this NEGATIVE — the supplier holds the shop's money as
 *  an advance, exactly as the journal's `payables` balance reads.
 *  A CASH-refund return does NOT create an advance: the money
 *  already came back, so the refund un-pays (`supplierRefunded`)
 *  and both derivations read the settled position (design §3.2 +
 *  §9 identity, asserted by the harness after every scenario). */
export function supplierBalance(
  purchases: Purchase[],
  payments: SupplierPayment[],
  supplierId: string,
  purchaseReturns: PurchaseReturn[] = []
): number {
  return (
    supplierPurchased(purchases, supplierId, purchaseReturns) -
    (supplierPaid(payments, supplierId) - supplierRefunded(purchaseReturns, supplierId))
  );
}

/** Grouping key for credit rows that predate the customers directory. */
export function creditKey(c: CreditEntry): string {
  return c.customerId ?? `name:${c.customerName.trim().toLowerCase()}|${c.customerPhone.trim()}`;
}

export function customerOutstanding(credits: CreditEntry[], key: string): number {
  return credits
    .filter((c) => creditKey(c) === key)
    .reduce((a, c) => a + (c.kind === "credit" ? c.amount : -c.amount), 0);
}

export function totalOutstandingCredit(credits: CreditEntry[]): number {
  return credits.reduce((a, c) => a + (c.kind === "credit" ? c.amount : -c.amount), 0);
}

/* ---------------- aging (FIFO allocation) ---------------- */

export interface AgingBuckets {
  current: number; // 0–30 days
  mid: number; // 31–60 days
  old: number; // 60+ days
  total: number;
}

function bucketFor(dayOffset: number): keyof Omit<AgingBuckets, "total"> {
  if (dayOffset <= 30) return "current";
  if (dayOffset <= 60) return "mid";
  return "old";
}

export interface CreditLotRemaining {
  /** The lot's key: the bill id, or `row:<id>` for a standalone row. */
  lotKey: string;
  /** The lot's age: the LARGEST dayOffset among its rows (a return
   *  reversal is stamped today; it must not make its bill younger). */
  dayOffset: number;
  /** Still owed on this lot after reversals and FIFO repayments. */
  remaining: number;
}

/**
 * The ONE FIFO allocation over a single customer's credit rows —
 * the lot model `billCreditOutstanding` has always used, now shared
 * by the aging report and the WhatsApp udhaar position so all three
 * can never drift apart again (Fix Round 1 · F4).
 *
 * Rows group into LOTS by bill (standalone rows are their own lot).
 * A return/void REVERSAL row (kind "credit", negative amount) nets
 * against its own lot first — it un-gives that bill's udhaar, it is
 * NOT a repayment and never enters the repayment pool. Repayments
 * then retire the oldest lots first; what remains on a lot carries
 * the lot's age.
 *
 * The pre-fix aging skipped negative rows entirely (their
 * `Math.max(amount, 0)` was 0 and the remainder check dropped
 * them), so a credit note reduced the journal and the customer's
 * outstanding but never the aging buckets — the owner's live test
 * of 2026-10-24: bill 300 → repaid 100 → CN 150 left aging at
 * 5,700 against Finance's correct 5,550.
 */
export function creditLotsRemaining(rows: CreditEntry[]): CreditLotRemaining[] {
  const lots = new Map<string, { net: number; dayOffset: number; ts: string }>();
  const lotOf = (c: CreditEntry) => c.billId ?? `row:${c.id}`;
  for (const c of rows) {
    if (c.kind !== "credit") continue;
    const lot = lots.get(lotOf(c)) ?? { net: 0, dayOffset: c.dayOffset, ts: c.ts };
    lot.net += c.amount; // negative rows are reversals of their own lot
    if (c.dayOffset > lot.dayOffset) {
      lot.dayOffset = c.dayOffset;
      lot.ts = c.ts;
    }
    lots.set(lotOf(c), lot);
  }
  let pool = rows
    .filter((c) => c.kind === "repayment")
    .reduce((a, c) => a + c.amount, 0);
  const ordered = [...lots.entries()].sort(
    (a, b) => b[1].dayOffset - a[1].dayOffset || a[1].ts.localeCompare(b[1].ts)
  );
  const out: CreditLotRemaining[] = [];
  for (const [lotKey, lot] of ordered) {
    const open = Math.max(0, lot.net);
    const applied = Math.min(pool, open);
    pool -= applied;
    const remaining = open - applied;
    if (remaining > 0) out.push({ lotKey, dayOffset: lot.dayOffset, remaining });
  }
  return out;
}

/** Age outstanding RECEIVABLES on the shared lot allocation:
 *  reversals net their own bill's lot, repayments retire the
 *  oldest lots first, and what remains carries its lot's age.
 *  The buckets' total therefore equals Σ positive
 *  `customerOutstanding` by construction. */
export function receivablesAging(credits: CreditEntry[]): AgingBuckets {
  const out: AgingBuckets = { current: 0, mid: 0, old: 0, total: 0 };
  const keys = [...new Set(credits.map(creditKey))];
  for (const key of keys) {
    const rows = credits.filter((c) => creditKey(c) === key);
    for (const lot of creditLotsRemaining(rows)) {
      out[bucketFor(lot.dayOffset)] += lot.remaining;
      out.total += lot.remaining;
    }
  }
  return out;
}

/** Age outstanding PAYABLES per supplier, FIFO against oldest
 *  purchases. Phase B · B4: each purchase ages only its NET owed —
 *  total minus the gross its purchase returns reversed — and the
 *  payment pool is net of refunds received (a refund un-pays,
 *  exactly as in `supplierBalance`), so a returned purchase stops
 *  ageing as owed (design §3.2) and the buckets' total equals
 *  Σ positive supplierBalance by construction. A supplier in an
 *  advance position (offset returns against paid purchases)
 *  contributes nothing here: aging reports what is OWED, and the
 *  negative balance lives in supplierBalance / the journal. */
export function payablesAging(
  purchases: Purchase[],
  payments: SupplierPayment[],
  purchaseReturns: PurchaseReturn[] = []
): AgingBuckets {
  const out: AgingBuckets = { current: 0, mid: 0, old: 0, total: 0 };
  const supplierIds = [...new Set(purchases.map((p) => p.supplierId))];
  for (const sid of supplierIds) {
    let paid = supplierPaid(payments, sid) - supplierRefunded(purchaseReturns, sid);
    const rows = purchases
      .filter((p) => p.supplierId === sid)
      .sort((a, b) => b.dayOffset - a.dayOffset); // oldest first
    for (const p of rows) {
      const owed = Math.max(0, p.total - purchaseReturnedGross(purchaseReturns, p.id));
      const applied = Math.min(paid, owed);
      paid -= applied;
      const remaining = owed - applied;
      if (remaining > 0) {
        out[bucketFor(p.dayOffset)] += remaining;
        out.total += remaining;
      }
    }
  }
  return out;
}

/* ---------------- expense / income selectors ---------------- */

export function expensesOnDay(expenses: Expense[], dayOffset: number): Expense[] {
  return expenses.filter((e) => e.dayOffset === dayOffset);
}

export function expenseTotal(expenses: Expense[]): number {
  return expenses.reduce((a, e) => a + e.amount, 0);
}

export function expensesThisMonth(expenses: Expense[], ref = new Date()): Expense[] {
  return expenses.filter((e) => sameMonth(e.ts, ref));
}

/** Sales income (gross, from sale records) inside the current month. */
export function salesIncomeThisMonth(sales: Sale[], ref = new Date()): number {
  return sales.filter((s) => sameMonth(s.ts, ref)).reduce((a, s) => a + s.total, 0);
}

/* ---------------- day close ---------------- */

export interface DayCloseSummary {
  salesByMethod: Record<PayMethod, number>;
  cashSales: number;
  expensesTotal: number;
  expensesCash: number;
  creditGiven: number;
  creditReceived: number;
  customerAdvancesCash?: number;
  supplierPaidCash: number;
  refundsCash: number;
  expectedCash: number;
}

/** Auto totals for today's close. Cash expectation:
 *  opening + cash sales + cash repayments + customer advance cash + cash-in
 *  − cash expenses − cash supplier payments − cash refunds − cash-out. */
export function dayCloseSummary(args: {
  sales: Sale[];
  bills: Bill[];
  expenses: Expense[];
  credits: CreditEntry[];
  supplierPayments: SupplierPayment[];
  returnsRefundCash: number;
  cashIn: number;
  cashOut: number;
  openingCash: number;
  customerAdvancesCash?: number;
}): DayCloseSummary {
  const byMethod: Record<PayMethod, number> = {
    cash: 0,
    jazzcash: 0,
    easypaisa: 0,
    bank: 0,
    credit: 0,
  };
  // Billed sales: use the bills' payment splits (exact methods).
  // Phase B · B5 (design §4.4): a cheque part never touches a money
  // account until its clearing day, so instrument-stamped parts are
  // EXCLUDED from every cash/wallet bucket of this operational
  // cross-check — the JOURNAL-derived expected cash (A2) stays the
  // authoritative figure and is correct by construction.
  for (const b of args.bills) {
    if (b.dayOffset !== 0 || b.status === "held" || b.status === "voided") continue;
    for (const p of b.payments) {
      // H1: a points part settles against the loyalty liability,
      // not a money account — excluded from the buckets on the
      // same principle as the cheque part above.
      if (p.instrument === "cheque" || p.instrument === "points") continue;
      byMethod[p.method] += p.amount;
    }
  }
  // Counter sales (no bill) are cash by definition.
  const counterCash = salesOnDay(args.sales, 0)
    .filter((s) => !s.billId)
    .reduce((a, s) => a + s.total, 0);
  byMethod.cash += counterCash;

  const todayExpenses = expensesOnDay(args.expenses, 0);
  // B5: a cheque expense is still an expense (expensesTotal above
  // counts it) but no cash left the till — excluded from expCash.
  const expCash = todayExpenses
    .filter((e) => e.method === "cash" && e.instrument !== "cheque")
    .reduce((a, e) => a + e.amount, 0);
  const creditGiven = args.credits
    .filter((c) => c.dayOffset === 0 && c.kind === "credit")
    .reduce((a, c) => a + c.amount, 0);
  const creditReceived = args.credits
    .filter((c) => c.dayOffset === 0 && c.kind === "repayment")
    .reduce((a, c) => a + c.amount, 0);
  // B5: a cheque repayment IS received value (creditReceived above
  // counts it) but it is not cash in the drawer until clearing.
  const creditReceivedCash = args.credits
    .filter(
      (c) =>
        c.dayOffset === 0 &&
        c.kind === "repayment" &&
        (c.method ?? "cash") === "cash" &&
        c.instrument !== "cheque"
    )
    .reduce((a, c) => a + c.amount, 0);
  // B5: an issued cheque pays the supplier on paper today but the
  // cash leaves at clearing; a reversal row is not a payment at all.
  const supplierPaidCash = args.supplierPayments
    .filter(
      (p) =>
        p.dayOffset === 0 &&
        p.method === "cash" &&
        p.instrument !== "cheque" &&
        p.kind !== "reversal"
    )
    .reduce((a, p) => a + p.amount, 0);

  const customerAdvancesCash = args.customerAdvancesCash ?? 0;
  const expectedCash =
    args.openingCash +
    byMethod.cash +
    creditReceivedCash +
    customerAdvancesCash +
    args.cashIn -
    expCash -
    supplierPaidCash -
    args.returnsRefundCash -
    args.cashOut;

  return {
    salesByMethod: byMethod,
    cashSales: byMethod.cash,
    expensesTotal: expenseTotal(todayExpenses),
    expensesCash: expCash,
    creditGiven,
    creditReceived,
    customerAdvancesCash,
    supplierPaidCash,
    refundsCash: args.returnsRefundCash,
    expectedCash,
  };
}

/** Revenue helper re-exported for the Finance page convenience. */
export { revenueOnDay };
