/**
 * Dukaan AI — Tally export + journal CSV (ERP Phase D · D5,
 * design: ERP-PHASE-D-DESIGN.md §5).
 *
 * Two pure renderings of the journal for a chosen range, generated
 * client-side from the subscribed journal — no server, no store
 * writes, no journal changes:
 *
 *  - **Tally XML**: the standard import envelope both TallyPrime and
 *    Tally ERP 9 accept (Gateway → Import Data → Vouchers): ledger
 *    masters first (COA ledgers under the design's FIXED group
 *    mapping, §5.2 — the owner may override ledger NAMES via
 *    `settings.tallyLedgerNames`, never groups), then ONE
 *    `<VOUCHER>` per journal entry, converted per the §5.3
 *    refType → voucher-type table. Party-ref'd lines export
 *    against per-party ledgers (customers/suppliers/employees)
 *    instead of the control ledgers — the subledger refs carry
 *    exactly that truth. When the range does not start at the
 *    shop's first entry, each ledger's OPENINGBALANCE is derived
 *    from the entries before the range and emitted in the file
 *    only (§4.5: our journal never stores opening balances; Tally
 *    needs them, so the export manufactures them per export).
 *  - **Journal CSV**: the same range as flat rows through
 *    `lib/csv.ts` — the fallback that guarantees the data is never
 *    trapped in a Tally dialect (§5.1). Tally import dialects vary
 *    by version; this export targets the documented common subset
 *    and the owner validates with one import.
 *
 * Sign convention (Tally's documented import semantics): an
 * `ALLLEDGERENTRIES` AMOUNT is NEGATIVE for a deemed-positive
 * (debit) line and positive for a credit line; OPENINGBALANCE
 * follows the same rule (a debit opening balance is negative).
 * Every figure here is derived from our Dr/Cr lines before that
 * conversion, and per-voucher ΣDr == ΣCr in OUR terms by the
 * journal's own balance invariant (makeEntry, F-1).
 */
import type {
  AccountCode,
  Customer,
  Employee,
  JournalEntry,
  JournalLine,
  JournalRefType,
  MoneyAccount,
  ShopSettings,
  Supplier,
} from "./types";
import { ACCOUNT_CODES } from "./coa";
import { round2 } from "./tax";
import { businessDateISO, fiscalYearRange, isValidDateISO } from "./periods";
import { fyLabel } from "./fiscal";
import { inRange, type ReportRange } from "./reports";
import { toCSV } from "./csv";

/* ---------------- the fixed COA → Tally mapping (§5.2) ---------------- */

export interface TallyLedgerDef {
  /** Default ledger name (the owner's `tallyLedgerNames` override
   *  replaces this string only). */
  name: string;
  /** Tally predefined group — FIXED. A wrong group silently
   *  corrupts the Tally balance sheet, so groups are never
   *  owner-editable (§5.2). */
  group: string;
}

/** The §5.2 table, verbatim. One completion, recorded in
 *  PRODUCTION.md: the design's table does not name `inventory_loss`
 *  (it lists the six `expense_*` codes); a write-off of stock is a
 *  direct cost of goods, so it maps beside COGS — every COA code
 *  must map, or the export would strand real journal lines. */
export const TALLY_LEDGER_MAP: Record<AccountCode, TallyLedgerDef> = {
  cash: { name: "Cash", group: "Cash-in-Hand" },
  wallet: { name: "Wallet & Bank", group: "Bank Accounts" },
  receivables: { name: "Sundry Debtors — Control", group: "Sundry Debtors" },
  payables: { name: "Sundry Creditors — Control", group: "Sundry Creditors" },
  inventory: { name: "Stock — Goods", group: "Stock-in-Hand" },
  inventory_raw: { name: "Stock — Raw Material", group: "Stock-in-Hand" },
  wip: { name: "Stock — WIP", group: "Stock-in-Hand" },
  tax_payable: { name: "Tax Payable", group: "Duties & Taxes" },
  tax_input: { name: "Input Tax Credit", group: "Duties & Taxes" },
  cheques_in_hand: { name: "Cheques in Hand", group: "Current Assets" },
  cheques_issued: { name: "Cheques Issued", group: "Current Liabilities" },
  salary_payable: { name: "Salary Payable", group: "Current Liabilities" },
  loans_payable: { name: "Loans Payable", group: "Loans (Liability)" },
  loans_receivable: { name: "Loans Receivable", group: "Loans & Advances (Asset)" },
  capital: { name: "Owner Capital", group: "Capital Account" },
  retained_earnings: { name: "Retained Earnings", group: "Reserves & Surplus" },
  drawings: { name: "Owner Drawings", group: "Capital Account" },
  sales_revenue: { name: "Sales", group: "Sales Accounts" },
  sales_discount: { name: "Sales Discount", group: "Sales Accounts" },
  purchases: { name: "Purchases", group: "Purchase Accounts" },
  cogs: { name: "Cost of Goods Sold", group: "Direct Expenses" },
  inventory_loss: { name: "Inventory Loss", group: "Direct Expenses" },
  expense_rent: { name: "Rent", group: "Indirect Expenses" },
  expense_electricity: { name: "Electricity", group: "Indirect Expenses" },
  expense_transport: { name: "Transport", group: "Indirect Expenses" },
  expense_other: { name: "Other Expenses", group: "Indirect Expenses" },
  expense_salary: { name: "Salaries", group: "Indirect Expenses" },
  expense_finance: { name: "Finance Charges", group: "Indirect Expenses" },
  /* Phase H · H1 (Phase H design §1.2): the loyalty pair — fixed
   * groups like every row; the NAMES stay owner-overridable. */
  loyalty_payable: { name: "Customer Loyalty Payable", group: "Current Liabilities" },
  expense_loyalty: { name: "Loyalty Programme Cost", group: "Indirect Expenses" },
};

type TallySettings =
  | Pick<ShopSettings, "shopName" | "tallyLedgerNames" | "fiscalYearStartMonth" | "fiscalYearStartDay">
  | null
  | undefined;

/** The ledger NAME an account exports under: the owner's override
 *  when one is set (trimmed, non-empty), else the §5.2 default. The
 *  GROUP is never affected by overrides. */
export function tallyLedgerName(code: AccountCode, settings: TallySettings): string {
  const override = settings?.tallyLedgerNames?.[code];
  return override && override.trim() ? override.trim() : TALLY_LEDGER_MAP[code].name;
}

/* ---------------- voucher types (§5.3) ---------------- */

export type TallyVoucherType =
  | "Sales"
  | "Purchase"
  | "Payment"
  | "Receipt"
  | "Contra"
  | "Journal"
  | "Debit Note"
  | "Credit Note";

export type LoanDirection = "payable" | "receivable";

/** The §5.3 table for every refType whose voucher type is fixed.
 *  The two loan refTypes are directional (they depend on which
 *  side of the register the cited loan sits) and resolve in
 *  `tallyVoucherType` — they are recorded here as `null`. */
export const TALLY_VOUCHER_TYPE_BY_REFTYPE: Record<JournalRefType, TallyVoucherType | null> = {
  sale: "Sales",
  bill: "Sales",
  bill_void: "Journal",
  return: "Credit Note",
  purchase: "Purchase",
  supplier_payment: "Payment",
  expense: "Payment",
  expense_reversal: "Payment",
  credit: "Receipt",
  repayment: "Receipt",
  adjustment: "Journal",
  cashbook: "Journal",
  seed: "Journal",
  transfer: "Contra",
  tax_payment: "Journal",
  purchase_return: "Debit Note",
  cheque_clearing: "Journal",
  cheque_bounce: "Journal",
  cheque_return: "Journal",
  transfer_loss: "Journal",
  reclass: "Journal",
  production_issue: "Journal",
  production_complete: "Journal",
  production_scrap: "Journal",
  job_material: "Journal",
  job_material_return: "Journal",
  payroll_accrual: "Journal",
  payroll_payment: "Payment",
  salary_advance: "Payment",
  loan_drawdown: null, // payable → Contra · receivable → Receipt
  loan_charge: "Journal",
  loan_repayment: null, // payable → Payment · receivable → Receipt
  fy_close: "Journal",
  /* Phase H · H1: grants/clawbacks/releases are journal acts. */
  loyalty_earn: "Journal",
  loyalty_expire: "Journal",
  // Fix Round 1 · F5: the opening-stock recognition is a classic
  // Tally Journal voucher (Dr stock / Cr capital).
  opening_stock: "Journal",
};

/** The voucher type for a refType; `direction` matters only for
 *  the two loan refTypes (absent direction reads as the payable
 *  side — the register's primary direction). */
export function tallyVoucherType(
  refType: JournalRefType,
  direction?: LoanDirection | null
): TallyVoucherType {
  if (refType === "loan_drawdown") return direction === "receivable" ? "Receipt" : "Contra";
  if (refType === "loan_repayment") return direction === "receivable" ? "Receipt" : "Payment";
  return TALLY_VOUCHER_TYPE_BY_REFTYPE[refType] ?? "Journal";
}

/** The direction of the loan an entry cites, read off its own
 *  lines: a drawdown/repayment always carries exactly one of the
 *  two loan accounts, so the journal alone answers it (no loan
 *  register lookup — the exporter stays a pure journal function). */
export function loanDirectionOf(entry: JournalEntry): LoanDirection | null {
  if (entry.lines.some((l) => l.account === "loans_payable")) return "payable";
  if (entry.lines.some((l) => l.account === "loans_receivable")) return "receivable";
  return null;
}

export function voucherTypeForEntry(entry: JournalEntry): TallyVoucherType {
  return tallyVoucherType(entry.refType, loanDirectionOf(entry));
}

/* ---------------- parties & line → ledger resolution ---------------- */

/** Everything besides the journal the exporter may read: the party
 *  directories (for per-party ledger names), the money accounts
 *  (for the CSV's Party/Ref column — money refs stay on the bucket
 *  ledger in Tally, §5.3), and an optional document-number map the
 *  UI builds from its document collections (refId → the number the
 *  shop knows the document by: a bill's number, a run's PAY-n, a
 *  loan's LN-n, a payment's PV-n …). */
export interface TallyParties {
  customers: Customer[];
  suppliers: Supplier[];
  employees: Employee[];
  accounts: MoneyAccount[];
  docNumbers?: ReadonlyMap<string, string>;
}

/** Accounts whose ref'd lines export against a PER-PARTY ledger
 *  (§5.3): receivables → the customer, payables → the supplier,
 *  salary_payable → the employee. Every other ref (money accounts,
 *  cheques, loans) stays on the account's own ledger. */
const PARTY_LEDGER_GROUP: Partial<Record<AccountCode, string>> = {
  receivables: "Sundry Debtors",
  payables: "Sundry Creditors",
  salary_payable: "Current Liabilities",
  /* Phase H · H1: loyalty lines are customer-ref'd by doctrine —
   * they export against per-customer ledgers in the same group as
   * the control row, exactly as salary_payable does. */
  loyalty_payable: "Current Liabilities",
};

function partyNameFor(code: AccountCode, ref: string, parties: TallyParties): string | null {
  if (code === "receivables") return parties.customers.find((c) => c.id === ref)?.name ?? null;
  if (code === "payables") return parties.suppliers.find((s) => s.id === ref)?.name ?? null;
  if (code === "salary_payable") return parties.employees.find((e) => e.id === ref)?.name ?? null;
  if (code === "loyalty_payable") return parties.customers.find((c) => c.id === ref)?.name ?? null;
  return null;
}

/** A resolved ledger slot: an account ledger (key `acct:<code>`) or
 *  a party ledger (key `party:<code>:<ref>`). Keys, not names, are
 *  the identity — names are assigned in one deterministic pass so
 *  collisions can be disambiguated (§5.3: party ledgers are named
 *  by the party's own name; a second party with the same name gets
 *  a ` (2)` suffix rather than silently merging two people's
 *  ledgers in Tally). */
interface LedgerSlot {
  key: string;
  group: string;
  /** The name this slot asks for before collision resolution. */
  wantedName: string;
  isParty: boolean;
}

function slotForLine(line: JournalLine, parties: TallyParties, settings: TallySettings): LedgerSlot {
  const ref = line.ref ?? null;
  if (ref && PARTY_LEDGER_GROUP[line.account]) {
    return {
      key: `party:${line.account}:${ref}`,
      group: PARTY_LEDGER_GROUP[line.account] as string,
      // An unresolved ref (a party since removed from the
      // directory) still exports under its own id-named ledger —
      // the data is never silently folded into the control ledger.
      wantedName: partyNameFor(line.account, ref, parties) ?? ref,
      isParty: true,
    };
  }
  return {
    key: `acct:${line.account}`,
    group: TALLY_LEDGER_MAP[line.account].group,
    wantedName: tallyLedgerName(line.account, settings),
    isParty: false,
  };
}

/** Human label for a line's ref in the CSV's Party/Ref column: the
 *  party's name when the line is party-ref'd, the money account's
 *  name for money refs, the raw ref otherwise, "" when none. */
function refLabelFor(line: JournalLine, parties: TallyParties): string {
  const ref = line.ref ?? null;
  if (!ref) return "";
  return (
    partyNameFor(line.account, ref, parties) ??
    parties.accounts.find((a) => a.id === ref)?.name ??
    ref
  );
}

/**
 * The one naming pass shared by the XML and the CSV (they must
 * never name a ledger differently): census every slot the WHOLE
 * journal touches — a ledger's name cannot depend on the exported
 * range — then assign names deterministically: account ledgers in
 * chart order first, then party ledgers by (group, wanted name,
 * key); the first claim wins the clean name, later collisions
 * take ` (2)`, ` (3)`, … suffixes.
 */
function resolveLedgerNames(
  journal: JournalEntry[],
  parties: TallyParties,
  settings: TallySettings
): { slots: Map<string, LedgerSlot>; nameByKey: Map<string, string> } {
  const slots = new Map<string, LedgerSlot>();
  const sorted = [...journal].sort(
    (a, b) => a.ts.localeCompare(b.ts) || a.id.localeCompare(b.id)
  );
  for (const e of sorted) {
    for (const l of e.lines) {
      const slot = slotForLine(l, parties, settings);
      if (!slots.has(slot.key)) slots.set(slot.key, slot);
    }
  }
  const ordered = [...slots.values()].sort((a, b) => {
    if (a.isParty !== b.isParty) return a.isParty ? 1 : -1;
    if (!a.isParty) {
      return (
        ACCOUNT_CODES.indexOf(a.key.slice(5) as AccountCode) -
        ACCOUNT_CODES.indexOf(b.key.slice(5) as AccountCode)
      );
    }
    return (
      a.group.localeCompare(b.group) ||
      a.wantedName.localeCompare(b.wantedName) ||
      a.key.localeCompare(b.key)
    );
  });
  const nameByKey = new Map<string, string>();
  const usedNames = new Set<string>();
  for (const slot of ordered) {
    let name = slot.wantedName;
    let n = 2;
    while (usedNames.has(name)) {
      name = `${slot.wantedName} (${n})`;
      n += 1;
    }
    usedNames.add(name);
    nameByKey.set(slot.key, name);
  }
  return { slots, nameByKey };
}

/* ---------------- dates & voucher numbers ---------------- */

/** The entry's business date (YYYY-MM-DD): its stamped `dateISO`
 *  when present and valid, else the PKT date of its instant (the
 *  legacy/seed derivation — the same one the registers group by). */
export function entryDateISO(entry: JournalEntry): string {
  return entry.dateISO && isValidDateISO(entry.dateISO)
    ? entry.dateISO
    : businessDateISO(entry.ts);
}

/** Tally's DATE format: YYYYMMDD. */
export function tallyDateOf(entry: JournalEntry): string {
  return entryDateISO(entry).replace(/-/g, "");
}

/** The voucher number Tally should carry: for a fiscal close, the
 *  FY label (§6.3 — the close takes no series; its identity is the
 *  year); otherwise the cited document's number when the UI's map
 *  knows it; otherwise null (the tag is omitted and Tally
 *  auto-numbers, as it does for unnumbered desk records). */
export function voucherNumberFor(
  entry: JournalEntry,
  parties: TallyParties,
  settings: TallySettings
): string | null {
  if (entry.refType === "fy_close") {
    return fyLabel(fiscalYearRange(settings ?? undefined, entry.ts));
  }
  if (entry.refId && parties.docNumbers) {
    const n = parties.docNumbers.get(entry.refId);
    if (n && n.trim()) return n.trim();
  }
  return null;
}

/* ---------------- the export model ---------------- */

export interface TallyMaster {
  name: string;
  group: string;
  isParty: boolean;
  /** The ledger's balance from entries BEFORE the range, in
   *  Tally's sign convention (credit positive, debit negative) —
   *  emitted as OPENINGBALANCE only when non-zero. */
  openingBalance: number;
}

export interface TallyVoucherLine {
  ledgerName: string;
  /** Our terms, kept for reconciliation: exactly one is non-zero. */
  debit: number;
  credit: number;
  /** Tally's convention: a debit line is deemed positive and its
   *  AMOUNT is negative; a credit line's AMOUNT is positive. */
  isDeemedPositive: boolean;
  amount: number;
}

export interface TallyVoucher {
  entryId: string;
  type: TallyVoucherType;
  dateISO: string;
  date: string; // YYYYMMDD
  narration: string;
  number: string | null;
  lines: TallyVoucherLine[];
  debitTotal: number;
  creditTotal: number;
}

export interface TallyExport {
  company: string;
  fromDate: string;
  toDate: string;
  masters: TallyMaster[];
  vouchers: TallyVoucher[];
  /** Σ voucher debits / credits for the range — by construction
   *  equal to the trial balance of the same range (asserted in
   *  the harness against lib/reports' trialBalance). */
  totalDebits: number;
  totalCredits: number;
}

function entriesInRange(journal: JournalEntry[], range: ReportRange): JournalEntry[] {
  return journal
    .filter((e) => inRange(e.ts, range))
    .sort((a, b) => a.ts.localeCompare(b.ts) || a.id.localeCompare(b.id));
}

/**
 * Build the export model: masters (with derived opening balances)
 * + one voucher per in-range entry. Pure — the same inputs always
 * produce the same model, and the model is what both the XML
 * renderer and the harness reconcile against the trial balance.
 */
export function buildTallyExport(
  journal: JournalEntry[],
  parties: TallyParties,
  settings: TallySettings,
  range: ReportRange
): TallyExport {
  const inRangeEntries = entriesInRange(journal, range);
  const before = journal.filter((e) => e.ts < range.fromTs);
  const { slots, nameByKey } = resolveLedgerNames(journal, parties, settings);
  const ledgerNameOf = (line: JournalLine): string =>
    nameByKey.get(slotForLine(line, parties, settings).key) as string;

  /* ---- opening balances: Σ (credit − debit) before the range,
   * per ledger slot (Tally's sign convention). ---- */
  const openingByKey = new Map<string, number>();
  for (const e of before) {
    for (const l of e.lines) {
      const key = slotForLine(l, parties, settings).key;
      openingByKey.set(key, (openingByKey.get(key) ?? 0) + (l.credit - l.debit));
    }
  }

  /* ---- masters: any ledger used in range, plus any carrying a
   * non-zero opening (its balance must land somewhere in Tally).
   * Emitted in the naming pass's deterministic order. ---- */
  const usedInRange = new Set<string>();
  for (const e of inRangeEntries) {
    for (const l of e.lines) usedInRange.add(slotForLine(l, parties, settings).key);
  }
  const masters: TallyMaster[] = [];
  for (const [key, name] of nameByKey) {
    const slot = slots.get(key) as LedgerSlot;
    const opening = round2(openingByKey.get(key) ?? 0);
    if (!usedInRange.has(key) && opening === 0) continue;
    masters.push({ name, group: slot.group, isParty: slot.isParty, openingBalance: opening });
  }

  /* ---- vouchers: one per entry, lines netted per journal line
   * (a posted line is one-sided by construction; netting keeps
   * the conversion total-preserving even for a pathological
   * both-sided line). ---- */
  const vouchers: TallyVoucher[] = [];
  let totalDebits = 0;
  let totalCredits = 0;
  for (const e of inRangeEntries) {
    const lines: TallyVoucherLine[] = [];
    let debitTotal = 0;
    let creditTotal = 0;
    for (const l of e.lines) {
      const net = round2(l.debit - l.credit);
      if (net === 0) continue;
      const isDebit = net > 0;
      const abs = Math.abs(net);
      if (isDebit) debitTotal += abs;
      else creditTotal += abs;
      lines.push({
        ledgerName: ledgerNameOf(l),
        debit: isDebit ? abs : 0,
        credit: isDebit ? 0 : abs,
        isDeemedPositive: isDebit,
        amount: isDebit ? -abs : abs,
      });
    }
    debitTotal = round2(debitTotal);
    creditTotal = round2(creditTotal);
    totalDebits += debitTotal;
    totalCredits += creditTotal;
    vouchers.push({
      entryId: e.id,
      type: voucherTypeForEntry(e),
      dateISO: entryDateISO(e),
      date: tallyDateOf(e),
      narration: e.memo ?? "",
      number: voucherNumberFor(e, parties, settings),
      lines,
      debitTotal,
      creditTotal,
    });
  }

  return {
    company: (settings?.shopName ?? "").trim() || "Dukaan AI",
    fromDate: range.fromDate,
    toDate: range.toDate,
    masters,
    vouchers,
    totalDebits: round2(totalDebits),
    totalCredits: round2(totalCredits),
  };
}

/* ---------------- XML rendering ---------------- */

/** XML-escape a text node or attribute value. */
export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Amounts in Tally's fixed two-decimal form (never "-0.00"). */
function tallyAmount(n: number): string {
  const v = round2(n);
  return (Object.is(v, -0) ? 0 : v).toFixed(2);
}

/**
 * The Tally import file for the range: the common-denominator
 * envelope TallyPrime and ERP 9 both accept — masters first, then
 * vouchers, one TALLYMESSAGE each, under the shop's company name.
 */
export function tallyXML(
  journal: JournalEntry[],
  parties: TallyParties,
  settings: TallySettings,
  range: ReportRange
): string {
  const model = buildTallyExport(journal, parties, settings, range);
  const out: string[] = [];
  out.push('<?xml version="1.0" encoding="UTF-8"?>');
  out.push("<ENVELOPE>");
  out.push("<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>");
  out.push("<BODY>");
  out.push("<IMPORTDATA>");
  out.push("<REQUESTDESC>");
  out.push("<REPORTNAME>All Masters</REPORTNAME>");
  out.push("<STATICVARIABLES>");
  out.push(`<SVCURRENTCOMPANY>${xmlEscape(model.company)}</SVCURRENTCOMPANY>`);
  out.push("</STATICVARIABLES>");
  out.push("</REQUESTDESC>");
  out.push("<REQUESTDATA>");
  for (const m of model.masters) {
    out.push('<TALLYMESSAGE xmlns:UDF="TallyUDF">');
    out.push(`<LEDGER NAME="${xmlEscape(m.name)}" RESERVEDNAME="">`);
    out.push(`<PARENT>${xmlEscape(m.group)}</PARENT>`);
    if (m.openingBalance !== 0) {
      out.push(`<OPENINGBALANCE>${tallyAmount(m.openingBalance)}</OPENINGBALANCE>`);
    }
    out.push("</LEDGER>");
    out.push("</TALLYMESSAGE>");
  }
  for (const v of model.vouchers) {
    out.push('<TALLYMESSAGE xmlns:UDF="TallyUDF">');
    out.push(
      `<VOUCHER VCHTYPE="${xmlEscape(v.type)}" ACTION="Create" OBJVIEW="Accounting Voucher View">`
    );
    out.push(`<DATE>${v.date}</DATE>`);
    if (v.narration) out.push(`<NARRATION>${xmlEscape(v.narration)}</NARRATION>`);
    out.push(`<VOUCHERTYPENAME>${xmlEscape(v.type)}</VOUCHERTYPENAME>`);
    if (v.number) out.push(`<VOUCHERNUMBER>${xmlEscape(v.number)}</VOUCHERNUMBER>`);
    for (const l of v.lines) {
      out.push("<ALLLEDGERENTRIES.LIST>");
      out.push(`<LEDGERNAME>${xmlEscape(l.ledgerName)}</LEDGERNAME>`);
      out.push(`<ISDEEMEDPOSITIVE>${l.isDeemedPositive ? "Yes" : "No"}</ISDEEMEDPOSITIVE>`);
      out.push(`<AMOUNT>${tallyAmount(l.amount)}</AMOUNT>`);
      out.push("</ALLLEDGERENTRIES.LIST>");
    }
    out.push("</VOUCHER>");
    out.push("</TALLYMESSAGE>");
  }
  out.push("</REQUESTDATA>");
  out.push("</IMPORTDATA>");
  out.push("</BODY>");
  out.push("</ENVELOPE>");
  return out.join("\n") + "\n";
}

/* ---------------- journal CSV (§5.1 fallback) ---------------- */

export const JOURNAL_CSV_HEADERS = [
  "Date",
  "Voucher No",
  "Type",
  "Account",
  "Party/Ref",
  "Debit",
  "Credit",
  "Narration",
] as const;

/**
 * The same range as flat rows — one row per journal LINE, in
 * journal order: Date · Voucher No · Type · Account (the ledger
 * name the line exports against, party ledgers included) ·
 * Party/Ref · Debit · Credit · Narration. Ledger names resolve
 * through the same census + naming pass as the XML, so the two
 * renderings can never name a ledger differently. Rendered
 * through `lib/csv.ts` (the house quoting standard); the download
 * helper adds the UTF-8 BOM that makes Urdu memos render in Excel.
 */
export function journalCSV(
  journal: JournalEntry[],
  parties: TallyParties,
  settings: TallySettings,
  range: ReportRange
): string {
  const { nameByKey } = resolveLedgerNames(journal, parties, settings);
  const ledgerNameOf = (line: JournalLine): string =>
    nameByKey.get(slotForLine(line, parties, settings).key) as string;

  const rows: Array<Array<unknown>> = [];
  for (const e of entriesInRange(journal, range)) {
    const type = voucherTypeForEntry(e);
    const number = voucherNumberFor(e, parties, settings) ?? "";
    const date = entryDateISO(e);
    for (const l of e.lines) {
      rows.push([
        date,
        number,
        type,
        ledgerNameOf(l),
        refLabelFor(l, parties),
        l.debit > 0 ? round2(l.debit) : "",
        l.credit > 0 ? round2(l.credit) : "",
        e.memo ?? "",
      ]);
    }
  }
  return toCSV([...JOURNAL_CSV_HEADERS], rows);
}
