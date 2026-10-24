"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import PermDenied from "./PermDenied";
import FiscalClosePanel from "./FiscalClosePanel";
import ExportsPanel from "./ExportsPanel";
import { can } from "@/lib/permissions";
import { IconCash, IconChart, IconTruck } from "./ui";
import { fmtDate, fmtPKR } from "@/lib/format";
import type { I18nKey } from "@/lib/i18n";
import type { AccountCode, JournalEntry } from "@/lib/types";
import {
  accountNormalBalance,
  accountsBucketBalance,
  cashBalance,
  cashBook,
  entryBalances,
  glForAccount,
  moneyAccountBalance,
  payablesAging,
  payablesTotal,
  profitAndLoss,
  profitAndLossInRange,
  receivablesAging,
  receivablesTotal,
  walletBalance,
} from "@/lib/ledger";
import { pendingOutTotal, unclearedInTotal } from "@/lib/cheques";
import { salaryPayableComposition } from "@/lib/payroll";
import { loansRegisterTotals } from "@/lib/loans";
import {
  currentFiscalYear,
  previousFiscalYear,
  type FiscalYearRange,
} from "@/lib/periods";
import { downloadCSV, toCSV } from "@/lib/csv";
import { taxPosition } from "@/lib/tax";
import { TransferModal, kindLabelKey } from "./MoneyAccounts";

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const EXPENSE_CATS = ["rent", "electricity", "salary", "transport", "other"];

function AgingTable({
  title,
  buckets,
}: {
  title: string;
  buckets: { current: number; mid: number; old: number; total: number };
}) {
  const { t } = useLang();
  return (
    <section className="card" aria-label={title}>
      <h2 style={{ fontSize: "1.2rem", marginBottom: 14 }}>{title}</h2>
      <div className="table-wrap" style={{ boxShadow: "none" }}>
        <table className="data" style={{ minWidth: 0 }}>
          <thead>
            <tr>
              <th>{t("fin.aging.age")}</th>
              <th>{t("fin.aging.amount")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t("fin.aging.current")}</td>
              <td><b>{fmtPKR(buckets.current)}</b></td>
            </tr>
            <tr>
              <td>{t("fin.aging.d31_60")}</td>
              <td><b>{fmtPKR(buckets.mid)}</b></td>
            </tr>
            <tr>
              <td>{t("fin.aging.over60")}</td>
              <td><b>{fmtPKR(buckets.old)}</b></td>
            </tr>
            <tr>
              <td><b>{t("fin.aging.total")}</b></td>
              <td><b>{fmtPKR(buckets.total)}</b></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function FinanceView() {
  const {
    ready,
    journal,
    credits,
    purchases,
    supplierPayments,
    purchaseReturns,
    products,
    sales,
    expenses,
    customers,
    suppliers,
    employees,
    accounts,
    cheques,
    loans,
    settings,
    addCashEntry,
    recordTaxPayment,
  } = useStore();
  const { role } = useAuth();
  const { t } = useLang();

  const [kind, setKind] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  // A4: tax payment form state (design §2.4 — pay the net position
  // down; the store caps the amount at what is actually owed).
  const [taxAmt, setTaxAmt] = useState("");
  const [taxAcctId, setTaxAcctId] = useState("");
  const [taxNote, setTaxNote] = useState("");
  const [taxNotice, setTaxNotice] = useState<{ ok: boolean; text: string } | null>(null);
  // A5: the P&L period picker — this month (the original behaviour)
  // or a fiscal-year window derived from the shop's fiscal settings.
  const [plRange, setPlRange] = useState<"month" | "fiscal" | "lastFiscal">("month");
  // Fix 4: the journal viewer's expanded entry (one at a time).
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const journalRows = useMemo(
    () =>
      [...journal]
        .sort((a, b) => b.ts.localeCompare(a.ts) || b.id.localeCompare(a.id))
        .slice(0, 100),
    [journal]
  );
  /** Display name for a journal line's `ref` when it names a money
   *  account, customer or supplier; the raw id otherwise. */
  const refName = (ref: string | null | undefined): string => {
    if (!ref) return "";
    return (
      accounts.find((a) => a.id === ref)?.name ??
      customers.find((c) => c.id === ref)?.name ??
      suppliers.find((s) => s.id === ref)?.name ??
      employees.find((e) => e.id === ref)?.name ??
      ref
    );
  };
  const fyCurrent = useMemo(() => currentFiscalYear(settings), [settings]);
  const fyPrevious = useMemo(() => previousFiscalYear(settings), [settings]);

  /** Localized label for any journal account code. Expense accounts reuse
   *  the shared expense-category vocabulary. */
  const accountLabel = (code: AccountCode): string => {
    if (code.startsWith("expense_")) {
      const cat = code.replace("expense_", "");
      if (EXPENSE_CATS.includes(cat)) return t(`common.expenseCat.${cat}` as I18nKey);
    }
    const key = `fin.acct.${code}` as I18nKey;
    const label = t(key);
    return label === key ? cap(code.replace(/_/g, " ")) : label;
  };

  /** Localized label for a P&L expense category key ("rent", "salary", …). */
  const expenseCatLabel = (cat: string): string => {
    if (EXPENSE_CATS.includes(cat)) return t(`common.expenseCat.${cat}` as I18nKey);
    return cap(cat);
  };

  const entryById = useMemo(
    () => new Map<string, JournalEntry>(journal.map((e) => [e.id, e])),
    [journal]
  );

  /**
   * Build the cash-book description from the journal entry's refType plus
   * the data tail of its memo (product / customer names and notes stay
   * as-is — they are data, not UI).
   */
  const describeEntry = (entryId: string, memo: string): string => {
    const entry = entryById.get(entryId);
    if (!entry) return memo;
    const [head, ...rest] = memo.split(" — ");
    const tail = rest.join(" — ");
    const billNo = head.match(/^Bill #(.+)$/)?.[1] ?? head.match(/Bill #(.+)$/)?.[1];
    switch (entry.refType) {
      case "sale":
        return tail ? `${t("fin.ref.sale")} — ${tail}` : t("fin.ref.sale");
      case "bill":
        if (!billNo) return memo;
        return tail
          ? `${t("fin.ref.bill", { no: billNo })} — ${tail}`
          : t("fin.ref.bill", { no: billNo });
      case "bill_void":
        return billNo
          ? `${t("fin.ref.void")} — ${t("fin.ref.bill", { no: billNo })}`
          : t("fin.ref.void");
      case "return":
        return billNo
          ? `${t("fin.ref.return")} — ${t("fin.ref.bill", { no: billNo })}`
          : t("fin.ref.return");
      case "purchase":
        return t("fin.ref.purchase");
      case "supplier_payment":
        return t("fin.ref.payment");
      case "expense":
        return tail
          ? `${t("fin.ref.expense")} — ${expenseCatLabel(tail)}`
          : t("fin.ref.expense");
      case "expense_reversal":
        return tail
          ? `${t("fin.ref.expenseReversal")} — ${expenseCatLabel(tail)}`
          : t("fin.ref.expenseReversal");
      case "credit":
        return tail ? `${t("fin.ref.credit")} — ${tail}` : t("fin.ref.credit");
      case "repayment":
        return tail ? `${t("fin.ref.repayment")} — ${tail}` : t("fin.ref.repayment");
      case "cashbook": {
        const label = head.startsWith("Cash in") ? t("fin.cash.in") : t("fin.cash.out");
        if (!tail) return label;
        if (tail === "owner capital") return `${label} — ${t("fin.ref.ownerCapital")}`;
        if (tail === "owner drawings") return `${label} — ${t("fin.ref.ownerDrawings")}`;
        return `${label} — ${tail}`;
      }
      case "transfer":
        // Memo tail carries "From → To" account names (owner data).
        return tail ? `${t("fin.ref.transfer")} — ${tail}` : t("fin.ref.transfer");
      case "tax_payment":
        return tail
          ? `${t("fin.ref.taxPayment")} — ${tail}`
          : t("fin.ref.taxPayment");
      case "purchase_return":
        return tail
          ? `${t("fin.ref.purchaseReturn")} — ${tail}`
          : t("fin.ref.purchaseReturn");
      case "cheque_clearing":
        return tail
          ? `${t("fin.ref.chequeClearing")} — ${tail}`
          : t("fin.ref.chequeClearing");
      case "cheque_bounce":
        return tail
          ? `${t("fin.ref.chequeBounce")} — ${tail}`
          : t("fin.ref.chequeBounce");
      case "payroll_accrual":
        return tail
          ? `${t("fin.ref.payrollAccrual")} — ${tail}`
          : t("fin.ref.payrollAccrual");
      case "payroll_payment":
        return tail
          ? `${t("fin.ref.payrollPayment")} — ${tail}`
          : t("fin.ref.payrollPayment");
      case "salary_advance":
        return tail
          ? `${t("fin.ref.salaryAdvance")} — ${tail}`
          : t("fin.ref.salaryAdvance");
      case "loan_drawdown":
        return tail
          ? `${t("fin.ref.loanDrawdown")} — ${tail}`
          : t("fin.ref.loanDrawdown");
      case "loan_charge":
        return tail
          ? `${t("fin.ref.loanCharge")} — ${tail}`
          : t("fin.ref.loanCharge");
      case "loan_repayment":
        return tail
          ? `${t("fin.ref.loanRepayment")} — ${tail}`
          : t("fin.ref.loanRepayment");
      case "cheque_return":
        return tail
          ? `${t("fin.ref.chequeReturn")} — ${tail}`
          : t("fin.ref.chequeReturn");
      case "adjustment": {
        const reason = head.replace(/^Stock\s+/, "");
        const parts = [t("fin.ref.adjustment")];
        if (reason && reason !== head) parts.push(reason);
        if (tail) parts.push(tail);
        return parts.join(" — ");
      }
      default:
        return memo;
    }
  };

  const data = useMemo(() => {
    if (!ready) return null;
    const pl = profitAndLoss(journal);
    const book = [...cashBook(journal)].reverse().slice(0, 60);
    // A2: headline cash/wallet are the SUM of the per-account balances
    // whenever accounts exist — identical to the GL totals by the
    // legacy-resolution identity (design §1.4), so nothing moves.
    const hasAccounts = accounts.length > 0;
    return {
      cash: hasAccounts
        ? accountsBucketBalance(journal, accounts, "cash")
        : cashBalance(journal),
      wallet: hasAccounts
        ? accountsBucketBalance(journal, accounts, "wallet")
        : walletBalance(journal),
      receivables: receivablesTotal(journal),
      payables: payablesTotal(journal),
      pl,
      recAging: receivablesAging(credits),
      payAging: payablesAging(purchases, supplierPayments, purchaseReturns),
      book,
      accountRows: [...accounts]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((a) => {
          const balance = moneyAccountBalance(journal, a);
          /* Shell/polish fix A (display scope only): a legacy
           * account REPRESENTS its GL bucket on this row of cards,
           * so its headline is the bucket total — the figure the
           * header KPIs, cash book, journal and trial balance all
           * show — with the per-account breakdown beneath it. The
           * derivations themselves are untouched: headline +
           * breakdown members come from the same two selectors. */
          const bucket = a.legacyFor
            ? {
                total: accountsBucketBalance(journal, accounts, a.legacyFor),
                members: [...accounts]
                  .filter((m) => glForAccount(m) === a.legacyFor)
                  .sort((x, y) => x.sortOrder - y.sortOrder)
                  .map((m) => ({
                    account: m,
                    balance: moneyAccountBalance(journal, m),
                  })),
              }
            : null;
          return { account: a, balance, bucket };
        }),
    };
  }, [ready, journal, credits, purchases, supplierPayments, purchaseReturns, accounts]);

  const liveAccounts = useMemo(
    () =>
      accounts
        .filter((a) => !a.archived)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [accounts]
  );
  const effectiveAccountId =
    accountId || liveAccounts.find((a) => a.legacyFor === "cash")?.id || liveAccounts[0]?.id || "";

  // A4: the tax position, straight from the journal's two tax
  // accounts (lib/tax.taxPosition) — never from bill documents.
  const taxPos = useMemo(() => taxPosition(journal), [journal]);
  // B5: the cheque balances, straight from the journal's two
  // cheque accounts — with the registry's pending totals beside
  // them (the design's identity: the two are always equal).
  const chqPos = useMemo(
    () => ({
      inHand: accountNormalBalance(journal, "cheques_in_hand"),
      issued: accountNormalBalance(journal, "cheques_issued"),
      registryIn: unclearedInTotal(cheques),
      registryOut: pendingOutTotal(cheques),
    }),
    [journal, cheques]
  );
  // Phase D · D2 (§2.8): the salary_payable composition — the
  // account's two-part truth (per-employee positions + the
  // unassigned production bucket) beside its GL balance.
  const salComp = useMemo(() => salaryPayableComposition(journal), [journal]);
  // Phase D · D3 (§3.5): the loans register's derived totals
  // beside the ledger's own balances for the two loan accounts —
  // for drawn loans the two always agree (§3.3's identity).
  const loanTotals = useMemo(() => loansRegisterTotals(loans), [loans]);
  const loansGl = useMemo(
    () => ({
      payable: accountNormalBalance(journal, "loans_payable"),
      receivable: accountNormalBalance(journal, "loans_receivable"),
    }),
    [journal]
  );
  const canWriteFinance = can(role, "finance", "write");
  const taxAcct =
    liveAccounts.find((a) => a.id === taxAcctId) ??
    liveAccounts.find((a) => a.legacyFor === "cash") ??
    liveAccounts[0] ??
    null;

  const postTaxPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(taxAmt);
    if (!Number.isFinite(amt) || amt <= 0) {
      setTaxNotice({ ok: false, text: t("fin.tax.errAmount") });
      return;
    }
    if (amt > taxPos.netPayable + 0.001) {
      setTaxNotice({
        ok: false,
        text: t("fin.tax.errExceeds", { due: fmtPKR(Math.max(0, taxPos.netPayable)) }),
      });
      return;
    }
    const ok = recordTaxPayment({
      amount: amt,
      method:
        taxAcct?.method && taxAcct.method !== "credit"
          ? taxAcct.method
          : taxAcct?.kind === "bank"
            ? "bank"
            : "cash",
      accountId: taxAcct?.id ?? null,
      note: taxNote.trim(),
    });
    if (!ok) {
      setTaxNotice({ ok: false, text: t("fin.tax.errExceeds", { due: fmtPKR(Math.max(0, taxPos.netPayable)) }) });
      return;
    }
    setTaxNotice({ ok: true, text: t("fin.tax.paid", { amount: fmtPKR(amt) }) });
    setTaxAmt("");
    setTaxNote("");
  };

  const postEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setNotice({ ok: false, text: t("fin.cash.amountError") });
      return;
    }
    const chosen = liveAccounts.find((a) => a.id === effectiveAccountId) ?? null;
    addCashEntry({
      kind,
      amount: amt,
      note: note.trim(),
      accountId: chosen?.id ?? null,
    });
    setNotice({
      ok: true,
      text: t("fin.cash.posted", {
        kind: kind === "in" ? t("fin.cash.in") : t("fin.cash.out"),
        amount: fmtPKR(amt),
        method: chosen ? chosen.name : accountLabel("cash"),
      }),
    });
    setAmount("");
    setNote("");
  };

  const exportProducts = () => {
    const csv = toCSV(
      ["SKU", "Name", "Urdu Name", "Category", "Unit", "Cost Price", "Sale Price", "Stock Qty", "Reorder Level", "Expiry Date"],
      products.map((p) => [
        p.sku, p.name, p.urduName, p.category, p.unit, p.costPrice, p.salePrice,
        p.stockQty, p.reorderLevel, p.expiryDate ?? "",
      ])
    );
    downloadCSV("dukaan-products.csv", csv);
  };

  const exportSales = () => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const csv = toCSV(
      ["ID", "Date", "Product", "Qty", "Unit Price", "Unit Cost", "Total", "Bill ID", "Kind"],
      sales.map((s) => [
        s.id, s.ts, byId.get(s.productId)?.name ?? s.productId, s.qty, s.unitPrice,
        s.unitCost ?? "", s.total, s.billId ?? "", s.kind ?? "sale",
      ])
    );
    downloadCSV("dukaan-sales.csv", csv);
  };

  const exportExpenses = () => {
    const csv = toCSV(
      ["Date", "Category", "Amount", "Method", "Note"],
      expenses.map((x) => [x.ts, x.category, x.amount, x.method, x.note])
    );
    downloadCSV("dukaan-expenses.csv", csv);
  };

  const exportCustomers = () => {
    const csv = toCSV(
      ["Name", "Phone", "Address", "Note"],
      customers.map((c) => [c.name, c.phone, c.address, c.note])
    );
    downloadCSV("dukaan-customers.csv", csv);
  };

  if (!can(role, "finance", "view")) return <PermDenied />;

  if (!data) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  // A5: the displayed P&L — the month window is the original
  // computation untouched; a fiscal-year window runs the SAME
  // computation over the fiscal range's instants (design §5:
  // helpers derive the range, the P&L respects it exactly as it
  // respects month ranges).
  const fyRange: FiscalYearRange | null =
    plRange === "fiscal" ? fyCurrent : plRange === "lastFiscal" ? fyPrevious : null;
  const pl = fyRange
    ? profitAndLossInRange(journal, fyRange.fromTs, fyRange.toTs)
    : data.pl;
  const expenseRows = Object.entries(pl.expensesByCategory).filter(([, v]) => v !== 0);
  const now = new Date();
  const monthLabel = `${t(`common.month.${now.getMonth()}` as I18nKey)} ${now.getFullYear()}`;
  const fyLabelOf = (r: FiscalYearRange): string => {
    const s = r.startDate.split("-").map(Number);
    const e = r.endDate.split("-").map(Number);
    return `${t(`common.month.${s[1] - 1}` as I18nKey)} ${s[0]} – ${t(`common.month.${e[1] - 1}` as I18nKey)} ${e[0]}`;
  };
  const plLabel = fyRange ? fyLabelOf(fyRange) : monthLabel;

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("fin.eyebrow")}</span>
          <h1 className="h2">{t("fin.title")}</h1>
          <p className="lead">{t("fin.subtitle")}</p>
        </div>

        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card kpi">
            <div className="kpi-icon green"><IconCash /></div>
            <div>
              <div className="kpi-label">{t("fin.kpi.cash")}</div>
              <div className="kpi-value">{fmtPKR(data.cash)}</div>
              <div className="kpi-sub">{t("fin.kpi.cashSub")}</div>
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon green"><IconChart /></div>
            <div>
              <div className="kpi-label">{t("fin.kpi.wallet")}</div>
              <div className="kpi-value">{fmtPKR(data.wallet)}</div>
              <div className="kpi-sub">{t("fin.kpi.walletSub")}</div>
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon amber"><IconChart /></div>
            <div>
              <div className="kpi-label">{t("fin.kpi.receivables")}</div>
              <div className="kpi-value">{fmtPKR(data.receivables)}</div>
              <div className="kpi-sub">{t("fin.kpi.receivablesSub")}</div>
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon brown"><IconTruck /></div>
            <div>
              <div className="kpi-label">{t("fin.kpi.payables")}</div>
              <div className="kpi-value">{fmtPKR(data.payables)}</div>
              <div className="kpi-sub">{t("fin.kpi.payablesSub")}</div>
            </div>
          </div>
        </div>

        {data.accountRows.length > 0 && (
          <section aria-label={t("fin.accts.title")} style={{ marginBottom: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <h2 style={{ fontSize: "1.2rem" }}>{t("fin.accts.title")}</h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={data.accountRows.filter((r) => !r.account.archived).length < 2}
                onClick={() => setTransferOpen(true)}
              >
                {t("settings.acct.transfer")}
              </button>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {data.accountRows.map(({ account: a, balance, bucket }) => {
                const headline = bucket ? bucket.total : balance;
                return (
                <div
                  key={a.id}
                  className="card"
                  style={{ padding: "12px 16px", opacity: a.archived ? 0.55 : 1 }}
                >
                  <div style={{ fontWeight: 700 }}>
                    {a.name}{" "}
                    <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: "0.82rem" }}>
                      · {t(kindLabelKey(a.kind))}
                      {a.archived ? ` · ${t("settings.acct.archived")}` : ""}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      color: headline < 0 ? "var(--danger)" : undefined,
                    }}
                  >
                    {fmtPKR(headline)}
                  </div>
                  {headline < 0 && (
                    <div
                      style={{ color: "var(--danger)", fontSize: "0.82rem", fontWeight: 600 }}
                    >
                      {t("fin.acct.negative")}
                    </div>
                  )}
                  {bucket && bucket.members.length > 1 && (
                    <div style={{ marginTop: 8, display: "grid", gap: 2, minWidth: 190 }}>
                      <div
                        style={{ color: "var(--muted)", fontSize: "0.76rem", fontWeight: 700 }}
                      >
                        {t("fin.acct.bucketBreakdown")}
                      </div>
                      {bucket.members.map(({ account: m, balance: mb }) => (
                        <div
                          key={m.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 14,
                            fontSize: "0.85rem",
                          }}
                        >
                          <span style={{ color: "var(--muted)" }}>{m.name}</span>
                          <b style={mb < 0 ? { color: "var(--danger)" } : undefined}>
                            {fmtPKR(mb)}
                          </b>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </section>
        )}

        {/* A4: tax position (design §2.4) — output collected minus
            input paid, from the journal's tax accounts only. */}
        <section className="card" aria-label={t("fin.tax.title")} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("fin.tax.title")}</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 18 }}>
            {t("fin.tax.caption")}
          </p>
          {taxPos.outputTax === 0 && taxPos.inputTax === 0 ? (
            <p style={{ color: "var(--muted)" }}>{t("fin.tax.none")}</p>
          ) : (
            <>
              <div style={{ display: "grid", gap: 6, marginBottom: 18 }}>
                {(
                  [
                    { label: t("fin.tax.output"), month: taxPos.outputThisMonth, bal: taxPos.outputTax },
                    { label: t("fin.tax.input"), month: taxPos.inputThisMonth, bal: taxPos.inputTax },
                  ] as const
                ).map((r) => (
                  <div
                    key={r.label}
                    style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "4px 0" }}
                  >
                    <span style={{ color: "var(--muted)" }}>{r.label}</span>
                    <span>
                      {t("fin.tax.thisMonth")}: <b>{fmtPKR(r.month)}</b>
                      {"  ·  "}
                      {t("fin.tax.balance")}: <b>{fmtPKR(r.bal)}</b>
                    </span>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    borderTop: "1px solid var(--line)",
                    marginTop: 6,
                    paddingTop: 10,
                    fontSize: "1.1rem",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{t("fin.tax.netDue")}</span>
                  <b style={{ fontFamily: "var(--font-display)" }}>
                    {fmtPKR(Math.max(0, taxPos.netPayable))}
                  </b>
                </div>
              </div>
              {canWriteFinance && taxPos.netPayable > 0 && (
                <>
                  <h3 style={{ fontSize: "1.05rem", marginBottom: 4 }}>{t("fin.tax.payTitle")}</h3>
                  <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 14 }}>
                    {t("fin.tax.payCaption")}
                  </p>
                  <form className="form" onSubmit={postTaxPayment}>
                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor="tax-amount">{t("fin.tax.amount")}</label>
                        <input
                          id="tax-amount"
                          type="number"
                          min={0}
                          step="any"
                          value={taxAmt}
                          onChange={(e) => setTaxAmt(e.target.value)}
                          required
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="tax-account">{t("fin.cash.account")}</label>
                        <select
                          id="tax-account"
                          value={taxAcct?.id ?? ""}
                          onChange={(e) => setTaxAcctId(e.target.value)}
                        >
                          {liveAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                          {liveAccounts.length === 0 && (
                            <option value="">{accountLabel("cash")}</option>
                          )}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor="tax-note">{t("fin.tax.note")}</label>
                        <input
                          id="tax-note"
                          value={taxNote}
                          onChange={(e) => setTaxNote(e.target.value)}
                          placeholder={t("fin.tax.notePlaceholder")}
                        />
                      </div>
                    </div>
                    {taxNotice && (
                      <div
                        className={taxNotice.ok ? "note-box" : "form-error"}
                        style={taxNotice.ok ? { marginTop: 0, borderStyle: "solid", borderColor: "var(--accent)" } : undefined}
                      >
                        {taxNotice.text}
                      </div>
                    )}
                    <button type="submit" className="btn btn-primary">
                      <IconCash /> {t("fin.tax.pay")}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </section>

        {/* B5: cheque balances (design §4.4) — the two COA cheque
            accounts as ordinary derived balances, shown next to
            the registry's pending totals. Rendered only when the
            shop has instruments in flight (or a balance at all). */}
        {(cheques.length > 0 || chqPos.inHand !== 0 || chqPos.issued !== 0) && (
          <section className="card" aria-label={t("fin.chq.title")} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("fin.chq.title")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 14 }}>
              {t("fin.chq.caption")}
            </p>
            <div style={{ display: "grid", gap: 10, fontSize: "0.97rem", marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{t("fin.acct.cheques_in_hand")}</span>
                <span>
                  {t("fin.chq.ledger")} <b>{fmtPKR(chqPos.inHand)}</b> · {t("fin.chq.registry")}{" "}
                  <b>{fmtPKR(chqPos.registryIn)}</b>
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{t("fin.acct.cheques_issued")}</span>
                <span>
                  {t("fin.chq.ledger")} <b>{fmtPKR(chqPos.issued)}</b> · {t("fin.chq.registry")}{" "}
                  <b>{fmtPKR(chqPos.registryOut)}</b>
                </span>
              </div>
            </div>
            <Link href="/cheques" className="btn btn-ghost btn-sm">
              {t("fin.chq.open")}
            </Link>
          </section>
        )}

        {/* Phase D · D2 (§2.8): salaries-payable composition —
            read figures only, rendered when the account carries
            anything at all (a payroll accrual, an advance, or a
            production bucket balance). */}
        {(salComp.glBalance !== 0 ||
          salComp.owedToEmployees !== 0 ||
          salComp.advancesOutstanding !== 0 ||
          salComp.unassignedAccrued !== 0) && (
          <section className="card" aria-label={t("fin.sal.title")} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("fin.sal.title")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 14 }}>
              {t("fin.sal.caption")}
            </p>
            <div style={{ display: "grid", gap: 10, fontSize: "0.97rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{t("fin.sal.owed")}</span>
                <b>{fmtPKR(salComp.owedToEmployees)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{t("fin.sal.advances")}</span>
                <b>{fmtPKR(salComp.advancesOutstanding)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{t("fin.sal.unassigned")}</span>
                <b>{fmtPKR(salComp.unassignedAccrued)}</b>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  borderTop: "1px solid var(--line)",
                  paddingTop: 10,
                }}
              >
                <span>
                  {t("fin.sal.total")} ({accountLabel("salary_payable")})
                </span>
                <b>{fmtPKR(salComp.glBalance)}</b>
              </div>
            </div>
          </section>
        )}

        {/* Phase D · D3 (§3.5): loans breakdown — the register's
            derived outstanding beside the ledger balances of the
            two loan accounts, rendered when the shop carries any
            loan at all. */}
        {(loans.length > 0 || loansGl.payable !== 0 || loansGl.receivable !== 0) && (
          <section className="card" aria-label={t("fin.loan.title")} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("fin.loan.title")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 14 }}>
              {t("fin.loan.caption")}
            </p>
            <div style={{ display: "grid", gap: 10, fontSize: "0.97rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{t("fin.loan.borrowed")}</span>
                <b>{fmtPKR(loanTotals.borrowedOutstanding)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{t("fin.loan.lent")}</span>
                <b>{fmtPKR(loanTotals.lentOutstanding)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>
                  {t("fin.loan.payableGl")} ({accountLabel("loans_payable")})
                </span>
                <b>{fmtPKR(loansGl.payable)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>
                  {t("fin.loan.receivableGl")} ({accountLabel("loans_receivable")})
                </span>
                <b>{fmtPKR(loansGl.receivable)}</b>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <Link href="/loans" className="btn btn-ghost btn-sm">
                {t("fin.loan.open")}
              </Link>
            </div>
          </section>
        )}

        <div className="grid-2" style={{ alignItems: "start", marginBottom: 24 }}>
          <section className="card" aria-label={t("fin.pl.title", { month: plLabel })}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>
              {t("fin.pl.title", { month: plLabel })}
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 14 }}>
              {fyRange ? t("fin.pl.captionRange") : t("fin.pl.caption")}
            </p>
            <div className="field" style={{ maxWidth: 280, marginBottom: 18 }}>
              <label htmlFor="fin-pl-range">{t("fin.pl.range")}</label>
              <select
                id="fin-pl-range"
                value={plRange}
                onChange={(e) =>
                  setPlRange(e.target.value as "month" | "fiscal" | "lastFiscal")
                }
              >
                <option value="month">{t("fin.pl.thisMonth")}</option>
                <option value="fiscal">{t("fin.pl.thisFiscalYear")}</option>
                <option value="lastFiscal">{t("fin.pl.lastFiscalYear")}</option>
              </select>
            </div>
            <div style={{ display: "grid", gap: 10, fontSize: "0.97rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{t("fin.pl.revenue")}</span>
                <b>{fmtPKR(pl.revenue)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--muted)" }}>
                <span>{t("fin.pl.discounts")}</span>
                <span>− {fmtPKR(pl.discounts)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <span>{t("fin.pl.netRevenue")}</span>
                <b>{fmtPKR(pl.netRevenue)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--muted)" }}>
                <span>{t("fin.pl.cogs")}</span>
                <span>− {fmtPKR(pl.cogs)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <b>{t("fin.pl.grossProfit")}</b>
                <b>{fmtPKR(pl.grossProfit)}</b>
              </div>
              {expenseRows.map(([cat, v]) => (
                <div key={cat} style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--muted)" }}>
                  <span>{t("fin.pl.expenseRow", { category: expenseCatLabel(cat) })}</span>
                  <span>− {fmtPKR(v)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--muted)" }}>
                <span>{t("fin.pl.stockLoss")}</span>
                <span>− {fmtPKR(pl.stockLoss)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  borderTop: "2px solid var(--line)",
                  paddingTop: 12,
                  fontSize: "1.08rem",
                }}
              >
                <b>{t("fin.pl.netProfit")}</b>
                <b style={{ color: pl.net >= 0 ? "var(--accent-text)" : "var(--danger)" }}>
                  {fmtPKR(pl.net)}
                </b>
              </div>
            </div>
          </section>

          <div style={{ display: "grid", gap: 20 }}>
            <AgingTable title={t("fin.aging.receivablesTitle")} buckets={data.recAging} />
            <AgingTable title={t("fin.aging.payablesTitle")} buckets={data.payAging} />
          </div>
        </div>

        {/* Phase D · D4: fiscal-year close — checklist, closing
            entry summary, openings and reopen (owner-only inside). */}
        <FiscalClosePanel />

        <div className="grid-2" style={{ alignItems: "start", marginBottom: 24 }}>
          <section className="card" aria-label={t("fin.cash.title")}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("fin.cash.title")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 20 }}>
              {t("fin.cash.caption")}
            </p>
            <form className="form" onSubmit={postEntry}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="cb-kind">{t("fin.cash.kind")}</label>
                  <select
                    id="cb-kind"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as "in" | "out")}
                  >
                    <option value="in">{t("fin.cash.in")}</option>
                    <option value="out">{t("fin.cash.out")}</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="cb-amount">{t("fin.cash.amount")}</label>
                  <input
                    id="cb-amount"
                    type="number"
                    min={0}
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={t("fin.cash.amountPlaceholder")}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="cb-method">{t("fin.cash.account")}</label>
                  <select
                    id="cb-method"
                    value={effectiveAccountId}
                    onChange={(e) => setAccountId(e.target.value)}
                  >
                    {liveAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                    {liveAccounts.length === 0 && (
                      <>
                        <option value="">{accountLabel("cash")}</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="cb-note">{t("fin.cash.note")}</label>
                  <input
                    id="cb-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("fin.cash.notePlaceholder")}
                  />
                </div>
              </div>
              {notice && (
                <div
                  className={notice.ok ? "note-box" : "form-error"}
                  style={notice.ok ? { marginTop: 0, borderStyle: "solid", borderColor: "var(--accent)" } : undefined}
                >
                  {notice.text}
                </div>
              )}
              <button type="submit" className="btn btn-primary">
                <IconCash /> {t("fin.cash.post")}
              </button>
            </form>
          </section>

          <section className="card" aria-label={t("fin.export.title")}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("fin.export.title")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 20 }}>
              {t("fin.export.caption")}
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-ghost" onClick={exportProducts}>
                {t("fin.export.products")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={exportSales}>
                {t("fin.export.sales")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={exportExpenses}>
                {t("fin.export.expenses")}
              </button>
              <button type="button" className="btn btn-ghost" onClick={exportCustomers}>
                {t("fin.export.customers")}
              </button>
            </div>
            {/* Phase D · D5 (design §5): Tally XML + journal CSV —
                the journal joins the exportable datasets, gated on
                the trialBalanceExports row inside the panel. */}
            <ExportsPanel />
          </section>
        </div>

        <section aria-label={t("fin.cb.title")}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: 14 }}>{t("fin.cb.title")}</h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("fin.cb.date")}</th>
                  <th>{t("fin.cb.description")}</th>
                  <th>{t("fin.cb.account")}</th>
                  <th>{t("fin.cb.in")}</th>
                  <th>{t("fin.cb.out")}</th>
                  <th>{t("fin.cb.balance")}</th>
                </tr>
              </thead>
              <tbody>
                {data.book.map((r, i) => (
                  <tr key={`${r.entryId}-${r.account}-${i}`}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.ts)}</td>
                    <td>{describeEntry(r.entryId, r.memo)}</td>
                    <td>{accountLabel(r.account)}</td>
                    <td>{r.inAmount > 0 ? fmtPKR(r.inAmount) : "—"}</td>
                    <td>{r.outAmount > 0 ? fmtPKR(r.outAmount) : "—"}</td>
                    <td><b>{fmtPKR(r.balance)}</b></td>
                  </tr>
                ))}
                {data.book.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty">{t("fin.cb.empty")}</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 10 }}>
            {t("fin.cb.caption")}
          </p>
        </section>

        {/* Fix 4: the journal viewer — every entry with its balance
            check, expandable to its Dr/Cr lines. Read-only: the
            figures are the journal's own lines, nothing is derived
            twice. The trial balance over any period lives in the
            Reports section (14th report). */}
        <section aria-label={t("fin.journal.title")} style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("fin.journal.title")}</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 14 }}>
            {t("fin.journal.caption")}{" "}
            {t("fin.journal.count", { count: journal.length })}
            {journal.length > journalRows.length
              ? ` · ${t("fin.journal.showingLatest", { count: journalRows.length })}`
              : ""}
          </p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("fin.cb.date")}</th>
                  <th>{t("fin.cb.description")}</th>
                  <th>{t("rep.tb.debit")}</th>
                  <th>{t("rep.tb.credit")}</th>
                  <th>{t("fin.journal.balanced")}</th>
                </tr>
              </thead>
              <tbody>
                {journalRows.map((e) => {
                  const dr = e.lines.reduce((a, l) => a + l.debit, 0);
                  const cr = e.lines.reduce((a, l) => a + l.credit, 0);
                  const balanced = entryBalances(e);
                  const open = expandedEntry === e.id;
                  return (
                    <Fragment key={e.id}>
                      <tr
                        onClick={() => setExpandedEntry(open ? null : e.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(e.ts)}</td>
                        <td>
                          <span aria-hidden="true">{open ? "▾ " : "▸ "}</span>
                          {e.memo}
                          <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                            {" "}· {e.refType}
                          </span>
                        </td>
                        <td>{fmtPKR(dr)}</td>
                        <td>{fmtPKR(cr)}</td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              color: balanced ? "var(--accent-text)" : "var(--danger)",
                              fontWeight: 700,
                            }}
                          >
                            {balanced ? t("fin.journal.balanced") : t("fin.journal.unbalanced")}
                          </span>
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={5} style={{ background: "var(--card-2)" }}>
                            <table className="data" style={{ minWidth: 0, boxShadow: "none" }}>
                              <tbody>
                                {e.lines.map((l, i) => (
                                  <tr key={i}>
                                    <td>
                                      {accountLabel(l.account)}
                                      {l.ref ? (
                                        <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
                                          {" "}· {refName(l.ref)}
                                        </span>
                                      ) : null}
                                    </td>
                                    <td>{l.debit > 0 ? fmtPKR(l.debit) : "—"}</td>
                                    <td>{l.credit > 0 ? fmtPKR(l.credit) : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {journalRows.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty">{t("fin.journal.empty")}</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {transferOpen && (
          <TransferModal
            onClose={() => setTransferOpen(false)}
            onDone={(text) => setNotice({ ok: true, text })}
          />
        )}
      </div>
    </div>
  );
}
