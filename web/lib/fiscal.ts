/**
 * Dukaan AI — fiscal-year close (ERP Phase D · D4).
 *
 * Design: ERP-PHASE-D-DESIGN.md §4. Pure derivations + entry
 * builders only — the store (components/StoreProvider.tsx) wires
 * them into the posting choke point, the Finance FY surface and
 * the Settings periods panel, and the verification harness
 * exercises them directly.
 *
 * The doctrine, in one paragraph: at FY end the year's income and
 * expense accounts are zeroed into `retained_earnings` by ONE
 * closing entry (`refType: "fy_close"`, dated the FY's last day),
 * written in the same batch as a `periods` audit doc and the
 * advance of `lockedThrough` to the FY end. Balance-sheet
 * accounts carry forward BY DERIVATION — the journal is
 * continuous, so there are NO opening entries, ever (§4.5).
 * Reopening is a mirror entry (`reversesId`), owner-only, with
 * stack discipline (§4.4). P&L-type reports exclude `fy_close`
 * entries (lib/ledger's `plOver`), so a closed year's P&L keeps
 * reading exactly as it did before the close (§4.6); the trial
 * balance does NOT exclude them and shows the zeroed truth.
 */
import type {
  AccountCode,
  Cheque,
  JournalEntry,
  JournalLine,
  PayrollRun,
  Period,
  Product,
  ProductionOrder,
} from "./types";
import { ACCOUNT_CODES, CHART_OF_ACCOUNTS, normalBalanceSign } from "./coa";
import {
  accountBalance,
  accountNormalBalance,
  classLegLines,
  makeEntry,
} from "./ledger";
import { trialBalance, type ReportRange, type TrialBalanceReport } from "./reports";
import {
  endOfDayPktInstant,
  todayPktISO,
  type FiscalYearRange,
} from "./periods";
import {
  buildMirrorEntry,
  salaryPayableComposition,
  type SalaryPayableComposition,
} from "./payroll";
import { deriveProductionStatus, poolOf } from "./production";
import { pendingOutTotal, unclearedInTotal } from "./cheques";
import { stockValue } from "./selectors";

/** Round to the paisa (the codebase-wide convention). */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/* ---------------- the P&L account set (registry-driven) ------------ */

/** The closing set is exactly the COA registry's P&L class —
 *  `income`, `contra_income` and `expense` — read from lib/coa.ts,
 *  never a hand list, so a future expense code joins the close
 *  automatically (design §4.3). Balance-sheet accounts and the
 *  `purchases` clearing account are never in a closing entry. */
const PL_TYPES: ReadonlySet<string> = new Set(["income", "contra_income", "expense"]);

export function plAccountCodes(): AccountCode[] {
  return ACCOUNT_CODES.filter((c) => PL_TYPES.has(CHART_OF_ACCOUNTS[c].type));
}

/** Every non-P&L account (asset / liability / equity /
 *  contra_equity / clearing), in registry order — the accounts
 *  whose balances carry forward across a close. */
export function balanceSheetAccountCodes(): AccountCode[] {
  return ACCOUNT_CODES.filter((c) => !PL_TYPES.has(CHART_OF_ACCOUNTS[c].type));
}

/* ---------------- labels & ranges ---------------------------------- */

/** The FY's identity label (`FY 2026-27`; a 1-January year is
 *  simply `FY 2027`). Used in memos, the close doc trail and
 *  exports (design §6.3 — the close takes no number series). */
export function fyLabel(range: FiscalYearRange): string {
  const y = Number(range.startDate.slice(0, 4));
  if (range.startDate.endsWith("-01-01")) return `FY ${y}`;
  return `FY ${y}-${String(y + 1).slice(2)}`;
}

/** The reports-layer range for the same window. */
export function reportRangeOf(range: FiscalYearRange): ReportRange {
  return {
    fromDate: range.startDate,
    toDate: range.endDate,
    fromTs: range.fromTs,
    toTs: range.toTs,
  };
}

/* ---------------- FY movements & the closing entry --------------- */

export interface FyMovement {
  account: AccountCode;
  /** Net movement inside the FY in raw terms (debits − credits),
   *  `fy_close` entries excluded — the year's own trading fact. */
  raw: number;
}

/** Each P&L account's net movement inside the FY, in registry
 *  order, zero movements omitted. `fy_close` entries (an earlier
 *  close of this same year and its reopening mirror) are excluded:
 *  they cancel by construction, and excluding both keeps a
 *  re-close after a reopen recomputing the true trading figures. */
export function fyPlMovements(
  entries: JournalEntry[],
  range: FiscalYearRange
): FyMovement[] {
  const inFy = entries.filter(
    (e) => e.refType !== "fy_close" && e.ts >= range.fromTs && e.ts < range.toTs
  );
  const out: FyMovement[] = [];
  for (const account of plAccountCodes()) {
    const raw = round2(accountBalance(inFy, account));
    if (raw !== 0) out.push({ account, raw });
  }
  return out;
}

/**
 * Compose THE closing entry for a fiscal year (design §4.3): one
 * line per P&L account on the opposite side of its FY balance
 * (zeroing it), and `retained_earnings` taking the balancing
 * line — credited with a profit, debited with a loss. The entry
 * is dated the FY's last day (its `dateISO` stamps to that date)
 * and cites the `periods` close doc as its `refId`.
 *
 * Returns null when the year carries no P&L movement at all —
 * the close then writes its audit doc and lock advance with no
 * journal entry (there is nothing to zero).
 */
export function buildFiscalClosingEntry(
  entries: JournalEntry[],
  range: FiscalYearRange,
  periodId: string
): JournalEntry | null {
  const moves = fyPlMovements(entries, range);
  if (moves.length === 0) return null;
  const lines: JournalLine[] = [];
  let sumRaw = 0;
  for (const m of moves) {
    sumRaw += m.raw;
    lines.push(
      m.raw > 0
        ? { account: m.account, debit: 0, credit: m.raw, ref: null }
        : { account: m.account, debit: -m.raw, credit: 0, ref: null }
    );
  }
  // Σ zeroing-line raws == −sumRaw, so the retained-earnings line
  // carries raw == sumRaw: a credit when the year's P&L movements
  // net credit (a profit), a debit when they net debit (a loss).
  const retainedRaw = round2(sumRaw);
  if (retainedRaw < 0) {
    lines.push({ account: "retained_earnings", debit: 0, credit: -retainedRaw, ref: null });
  } else if (retainedRaw > 0) {
    lines.push({ account: "retained_earnings", debit: retainedRaw, credit: 0, ref: null });
  }
  const dayOffset = Math.max(
    0,
    Math.round(
      (Date.parse(todayPktISO()) - Date.parse(range.endDate)) / 86400000
    )
  );
  return makeEntry(
    `Fiscal year close — ${fyLabel(range)}`,
    "fy_close",
    periodId,
    lines,
    { ts: endOfDayPktInstant(range.endDate), dayOffset }
  );
}

/** The reopening mirror (§4.4): the closing entry's exact lines
 *  swapped, posted at today's instant under the correction-dating
 *  doctrine (its own date is inside the lock the close set — a
 *  reversal never backdates). Same builder as payroll's mirrors. */
export function buildFiscalReopenEntry(
  closingEntry: JournalEntry,
  ts: string
): JournalEntry {
  return buildMirrorEntry(
    closingEntry,
    "Fiscal year reopened — closing entry reversed",
    { ts }
  );
}

/* ---------------- the year's summary, from the entry itself ------ */

export interface ClosingEntrySummary {
  /** Per P&L account: the year's balance on its normal side —
   *  read back off the closing entry's own lines, so this view
   *  and the pre-close P&L agree by identity (§4.6). */
  rows: Array<{ account: AccountCode; amount: number }>;
  /** The retained-earnings movement, credit-positive: positive
   *  is a profit carried into equity, negative a loss. */
  net: number;
}

/** Render a closed year's result from its closing entry: the
 *  entry's lines ARE the year's result, by construction. */
export function closingEntrySummary(entry: JournalEntry): ClosingEntrySummary {
  const rows: ClosingEntrySummary["rows"] = [];
  let net = 0;
  for (const l of entry.lines) {
    const raw = l.debit - l.credit;
    if (l.account === "retained_earnings") {
      net = round2(-raw);
    } else {
      rows.push({
        account: l.account,
        amount: round2(-raw * normalBalanceSign(l.account)),
      });
    }
  }
  return { rows, net };
}

/* ---------------- close state (derived from docs + journal) ------ */

export interface FiscalCloseState {
  /** True while a close of this FY stands unreversed. */
  closed: boolean;
  /** The latest close doc for the FY (null: never closed). */
  closeDoc: Period | null;
  /** The closing entry that doc posted (null for a zero-movement
   *  year, or if the doc's entry is somehow absent). */
  entry: JournalEntry | null;
  /** The reopen doc that unwound the close, when there is one. */
  reopenDoc: Period | null;
}

function entryOfCloseDoc(
  journal: JournalEntry[],
  doc: Period
): JournalEntry | null {
  if (doc.entryId) return journal.find((e) => e.id === doc.entryId) ?? null;
  return (
    journal.find(
      (e) => e.refType === "fy_close" && e.refId === doc.id && !e.reversesId
    ) ?? null
  );
}

function closeDocInForce(
  journal: JournalEntry[],
  periods: Period[],
  doc: Period
): boolean {
  const entry = entryOfCloseDoc(journal, doc);
  const reversed = entry
    ? journal.some((e) => e.reversesId === entry.id)
    : false;
  const reopened = periods.some(
    (p) =>
      p.kind === "fiscal_year" &&
      p.action === "reopen" &&
      p.reopensPeriodId === doc.id
  );
  return !reversed && !reopened;
}

/** Is this FY currently closed? Derived — the close doc, its
 *  entry's reversal state and any reopen doc together decide;
 *  nothing is cached anywhere. */
export function fiscalCloseState(
  journal: JournalEntry[],
  periods: Period[],
  range: FiscalYearRange
): FiscalCloseState {
  const closes = periods
    .filter(
      (p) =>
        p.kind === "fiscal_year" && p.action === "close" && p.from === range.fromTs
    )
    .sort((a, b) => b.ts.localeCompare(a.ts));
  const closeDoc = closes[0] ?? null;
  if (!closeDoc) return { closed: false, closeDoc: null, entry: null, reopenDoc: null };
  const entry = entryOfCloseDoc(journal, closeDoc);
  const reopenDoc =
    periods
      .filter(
        (p) =>
          p.kind === "fiscal_year" &&
          p.action === "reopen" &&
          p.reopensPeriodId === closeDoc.id
      )
      .sort((a, b) => b.ts.localeCompare(a.ts))[0] ?? null;
  return {
    closed: closeDocInForce(journal, periods, closeDoc),
    closeDoc,
    entry,
    reopenDoc,
  };
}

/** Stack discipline (§4.4): closes unwind in reverse order only.
 *  Returns the later FY's close doc still in force that blocks
 *  reopening `closeDoc`, or null when the reopen may proceed. */
export function fiscalReopenBlocker(
  journal: JournalEntry[],
  periods: Period[],
  closeDoc: Period
): Period | null {
  const later = periods
    .filter(
      (p) =>
        p.kind === "fiscal_year" &&
        p.action === "close" &&
        p.id !== closeDoc.id &&
        p.to > closeDoc.to
    )
    .sort((a, b) => a.to.localeCompare(b.to));
  for (const doc of later) {
    if (closeDocInForce(journal, periods, doc)) return doc;
  }
  return null;
}

/* ---------------- the pre-close checklist (all derived) ---------- */

export interface FiscalChecklistItem {
  id:
    | "trialBalance"
    | "purchasesClearing"
    | "draftPayroll"
    | "productionPools"
    | "salaryPayable"
    | "cheques"
    | "stock"
    | "lock";
  severity: "gate" | "warning" | "info";
  /** Gates: the check passes. Warnings: the warned condition is
   *  present (the desk must tick to proceed). Info: always true —
   *  the row exists to show its figures. */
  triggered: boolean;
  /** The item's headline figure (its meaning is per-item, below). */
  value: number;
}

export interface FiscalYearChecklist {
  items: FiscalChecklistItem[];
  /** Both hard gates pass — the Close action may compose. */
  hardGatesPass: boolean;
  /** Ids of warning items currently triggered. */
  warningIds: string[];
  trialBalance: TrialBalanceReport;
  /** `purchases` clearing balance at FY end (gate: must be 0). */
  purchasesClearing: number;
  /** Draft (unposted) payroll runs for months inside the FY. */
  draftPayrollRuns: number;
  /** Open production orders still holding a WIP pool. */
  openProductionOrders: number;
  openProductionPoolTotal: number;
  /** `salary_payable` composition at FY end (carries forward). */
  salary: SalaryPayableComposition;
  /** Uncleared cheques in hand / issued, as at FY end. */
  chequesInHand: number;
  chequesIssued: number;
  /** GL inventory (+ raw) at FY end vs the shelf's current value
   *  — the known latest-cost divergence, shown with its figure. */
  stockGl: number;
  stockShelf: number;
  stockDivergence: number;
  /** The lock already covers the FY end (else the close sets it). */
  lockCoversFyEnd: boolean;
}

/** The §4.2 checklist, computed live when the close screen opens
 *  and recomputed inside the close action before composing any
 *  write — nothing on it is stored. */
export function fiscalYearCloseChecklist(args: {
  journal: JournalEntry[];
  payrollRuns: PayrollRun[];
  productionOrders: ProductionOrder[];
  cheques: Cheque[];
  products: Product[];
  range: FiscalYearRange;
  lockedThrough?: string | null;
}): FiscalYearChecklist {
  const { journal, range } = args;
  const before = journal.filter((e) => e.ts < range.toTs);

  const tb = trialBalance(journal, reportRangeOf(range));
  const tbOk = tb.difference === 0 && tb.closingDifference === 0;

  const purchasesClearing = round2(accountNormalBalance(before, "purchases"));
  const clearingOk = purchasesClearing === 0;

  const startMonth = range.startDate.slice(0, 7);
  const endMonth = range.endDate.slice(0, 7);
  const draftPayrollRuns = args.payrollRuns.filter(
    (r) => r.status === "draft" && r.month >= startMonth && r.month <= endMonth
  ).length;

  let openProductionOrders = 0;
  let openProductionPoolTotal = 0;
  for (const o of args.productionOrders) {
    const pool = poolOf(o);
    if (pool > 0) {
      const st = deriveProductionStatus(o);
      if (st !== "completed" && st !== "cancelled") {
        openProductionOrders += 1;
        openProductionPoolTotal += pool;
      }
    }
  }
  openProductionPoolTotal = round2(openProductionPoolTotal);

  const salary = salaryPayableComposition(before);

  const chequesBefore = args.cheques.filter((c) => c.ts < range.toTs);
  const chequesInHand = unclearedInTotal(chequesBefore);
  const chequesIssued = pendingOutTotal(chequesBefore);

  const stockGl = round2(
    accountNormalBalance(before, "inventory") +
      accountNormalBalance(before, "inventory_raw")
  );
  const stockShelf = round2(stockValue(args.products));
  const stockDivergence = round2(stockGl - stockShelf);

  const lockCoversFyEnd = !!args.lockedThrough &&
    args.lockedThrough >= endOfDayPktInstant(range.endDate);

  const items: FiscalChecklistItem[] = [
    { id: "trialBalance", severity: "gate", triggered: !tbOk, value: tb.closingDifference },
    { id: "purchasesClearing", severity: "gate", triggered: !clearingOk, value: purchasesClearing },
    { id: "draftPayroll", severity: "warning", triggered: draftPayrollRuns > 0, value: draftPayrollRuns },
    { id: "productionPools", severity: "warning", triggered: openProductionOrders > 0, value: openProductionPoolTotal },
    { id: "salaryPayable", severity: "info", triggered: false, value: salary.glBalance },
    { id: "cheques", severity: "info", triggered: false, value: round2(chequesInHand + chequesIssued) },
    { id: "stock", severity: "info", triggered: false, value: stockDivergence },
    { id: "lock", severity: "info", triggered: false, value: lockCoversFyEnd ? 1 : 0 },
  ];
  return {
    items,
    hardGatesPass: tbOk && clearingOk,
    warningIds: items
      .filter((i) => i.severity === "warning" && i.triggered)
      .map((i) => i.id),
    trialBalance: tb,
    purchasesClearing,
    draftPayrollRuns,
    openProductionOrders,
    openProductionPoolTotal,
    salary,
    chequesInHand,
    chequesIssued,
    stockGl,
    stockShelf,
    stockDivergence,
    lockCoversFyEnd,
  };
}

/* ---------------- carried balances (the "opening" panel) --------- */

export interface AccountBalanceRow {
  account: AccountCode;
  /** Balance on the account's normal side. */
  balance: number;
}

/** Balance-sheet balances as at an instant — derived, never
 *  stored. With `beforeTs` = a fiscal year's first instant these
 *  ARE that year's opening balances (§4.5): a continuous journal
 *  needs no opening entries, and this panel is where an
 *  accountant arriving from Tally sees them instead. */
export function balanceSheetBalances(
  entries: JournalEntry[],
  beforeTs: string
): AccountBalanceRow[] {
  const before = entries.filter((e) => e.ts < beforeTs);
  const rows: AccountBalanceRow[] = [];
  for (const account of balanceSheetAccountCodes()) {
    const balance = accountNormalBalance(before, account);
    if (balance !== 0) rows.push({ account, balance });
  }
  return rows;
}

/* ---------------- the Balance Sheet report (Fix Round 1 · F2) ---- */

export interface BalanceSheetReport {
  /** The statement's instant: every entry with `ts < range.toTs`
   *  is in; the range's START plays no part (a balance sheet is
   *  a point-in-time statement, presented "as at" the end). */
  asAtDate: string;
  /** Asset rows (registry order), balances on the normal side. */
  assets: AccountBalanceRow[];
  assetsTotal: number;
  /** The `purchases` clearing account's balance, presented as
   *  its own line INSIDE the assets side when non-zero (it is a
   *  debit-side in-transit amount until purchases clear into
   *  inventory/COGS) so the identity holds to the paisa even
   *  mid-clearing. Zero on a settled book — the FY close hard-
   *  gates on exactly that. */
  clearing: number;
  liabilities: AccountBalanceRow[];
  liabilitiesTotal: number;
  /** Equity rows as CONTRIBUTIONS: capital and retained earnings
   *  positive, drawings (contra-equity) negative — the rows sum
   *  to `equityTotal` by construction. */
  equity: AccountBalanceRow[];
  equityTotal: number;
  /** The unclosed result to date: the net of every P&L account
   *  at the same instant, `fy_close` entries INCLUDED — so after
   *  a year closes, this line reads only the NEW unclosed result
   *  while the closed years sit inside retained earnings. A
   *  profit is positive, a loss negative. */
  resultToDate: number;
  /** assetsTotal + clearing. */
  totalAssets: number;
  /** liabilitiesTotal + equityTotal + resultToDate. */
  totalLiabilitiesEquity: number;
  difference: number;
  balanced: boolean;
}

/**
 * The user-facing Balance Sheet (Fix Round 1 · F2) — the figures
 * have existed since Phase D (`balanceSheetBalances`, behind the
 * FY-close panel) but no statement presented them. Derived from
 * the journal ONLY, at the range end:
 *
 *   Assets + Clearing = Liabilities + Equity + Result to date
 *
 * which is the double-entry identity Σ raw balances = 0 restated
 * by section, so `balanced` is true on any journal the posting
 * guard accepted — and the report shows its difference either
 * way, exactly like the trial balance does.
 */
export function balanceSheetReport(
  journal: JournalEntry[],
  range: ReportRange
): BalanceSheetReport {
  const upToEnd = journal.filter((e) => e.ts < range.toTs);
  const assets: AccountBalanceRow[] = [];
  const liabilities: AccountBalanceRow[] = [];
  const equity: AccountBalanceRow[] = [];
  let clearing = 0;
  for (const code of balanceSheetAccountCodes()) {
    const type = CHART_OF_ACCOUNTS[code].type;
    const normal = accountNormalBalance(upToEnd, code);
    if (normal === 0) continue;
    if (type === "asset") assets.push({ account: code, balance: normal });
    else if (type === "liability")
      liabilities.push({ account: code, balance: normal });
    else if (type === "equity") equity.push({ account: code, balance: normal });
    else if (type === "contra_equity")
      // Drawings state on their own (debit) side in
      // `balanceSheetBalances`; as an equity CONTRIBUTION the
      // same amount is negative — it reduces the owner's stake.
      equity.push({ account: code, balance: -normal });
    else if (type === "clearing") clearing = normal;
  }
  let resultRaw = 0;
  for (const code of plAccountCodes()) resultRaw += accountBalance(upToEnd, code);
  const sum = (rows: AccountBalanceRow[]) =>
    round2(rows.reduce((a, r) => a + r.balance, 0));
  const assetsTotal = sum(assets);
  const liabilitiesTotal = sum(liabilities);
  const equityTotal = sum(equity);
  const resultToDate = round2(-resultRaw);
  const totalAssets = round2(assetsTotal + clearing);
  const totalLiabilitiesEquity = round2(
    liabilitiesTotal + equityTotal + resultToDate
  );
  const difference = round2(totalAssets - totalLiabilitiesEquity);
  return {
    asAtDate: range.toDate,
    assets,
    assetsTotal,
    clearing: round2(clearing),
    liabilities,
    liabilitiesTotal,
    equity,
    equityTotal,
    resultToDate,
    totalAssets,
    totalLiabilitiesEquity,
    difference,
    balanced: difference === 0,
  };
}

/* ---------------- opening stock (Fix Round 1 · F5) --------------- */

export interface OpeningStockGap {
  /** The shelf's value at cost, today (lib/selectors stockValue). */
  shelf: number;
  /** The books' inventory position, today: the GL normal balance
   *  of `inventory` + `inventory_raw` over the whole journal. */
  book: number;
  /** shelf − book, floored at 0: the amount a one-time opening
   *  entry must recognise. Zero (or negative — the books ahead of
   *  the shelf, a different problem) offers no action. */
  gap: number;
  /** The raw-class share of the gap (the C3 class split): the raw
   *  shelf's excess over the raw book, clamped inside the gap. */
  rawGap: number;
}

/**
 * The live opening-stock gap (Fix Round 1 · F5). The owner's shop
 * was created before the journal era of the app: its opening
 * stock was loaded onto the shelf but never journalized, so the
 * Inventory GL sat at (in the live test) a negative credit while
 * the shelf held real goods — the FY checklist's stock row is
 * where the owner sees exactly this divergence. The gap is
 * computed on TODAY's figures (the entry is dated today; the
 * checklist's own figures are as at a fiscal year's end).
 */
export function openingStockGap(
  journal: JournalEntry[],
  products: Product[]
): OpeningStockGap {
  const shelf = round2(stockValue(products));
  const book = round2(
    accountNormalBalance(journal, "inventory") +
      accountNormalBalance(journal, "inventory_raw")
  );
  const gap = Math.max(0, round2(shelf - book));
  const rawShelf = round2(
    stockValue(products.filter((p) => p.stockClass === "raw"))
  );
  const rawBook = round2(accountNormalBalance(journal, "inventory_raw"));
  const rawGap = Math.min(gap, Math.max(0, round2(rawShelf - rawBook)));
  return { shelf, book, gap, rawGap };
}

/**
 * The one-time opening-stock entry: Dr `inventory` (split across
 * the raw class account by `rawShare` via the C3 class-leg seam)
 * / Cr `capital` — the stock was the owner's own investment in
 * the shop, so it lands in capital, NOT in any P&L account (a
 * stock adjustment would credit a loss/gain account and corrupt
 * the period's result; there is deliberately no manual-journal
 * surface in this app, so this composed, single-purpose entry IS
 * the owner path). Dated today by the caller; the journal is
 * append-only, so a wrong amount is later corrected by a
 * reversing entry, never by editing this one.
 */
export function buildOpeningStockEntry(
  amount: number,
  rawShare: number,
  opts?: { ts?: string }
): JournalEntry | null {
  const amt = round2(amount);
  if (!(amt > 0)) return null;
  const lines = [
    ...classLegLines(amt, rawShare, "debit"),
    { account: "capital" as const, debit: 0, credit: amt },
  ];
  return makeEntry(
    "Opening stock — one-time recognition",
    "opening_stock",
    null,
    lines,
    { ts: opts?.ts, idPrefix: "j" }
  );
}
