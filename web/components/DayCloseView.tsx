"use client";

import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import { can } from "@/lib/permissions";
import { IconCash } from "./ui";
import { fmtDate, fmtPKR } from "@/lib/format";
import type { I18nKey } from "@/lib/i18n";
import {
  accountDayNet,
  cashBalance,
  dayCloseSummary,
  defaultAccountForMethod,
  expectedCloseForAccount,
  moneyAccountBalance,
} from "@/lib/ledger";
import type { PayMethod } from "@/lib/types";

const METHOD_FALLBACK: Record<PayMethod, string> = {
  cash: "Cash",
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bank: "Bank",
  credit: "Credit (udhaar)",
};

const METHOD_ORDER: PayMethod[] = ["cash", "jazzcash", "easypaisa", "bank", "credit"];

function diffBadgeCls(diff: number): string {
  if (diff === 0) return "badge green";
  if (Math.abs(diff) <= 200) return "badge amber";
  return "badge red";
}

export default function DayCloseView() {
  const {
    ready,
    sales,
    bills,
    expenses,
    credits,
    supplierPayments,
    returns,
    cashEntries,
    dayCloses,
    journal,
    accounts,
    saveDayClose,
  } = useStore();
  const { role } = useAuth();
  /* A3: performing a day close is owner/manager/cashier; the
   * accountant sees the close history read-only (matrix rows
   * dayClose / dayCloseHistory). */
  const canPerform = can(role, "dayClose", "write");
  const { t } = useLang();

  const payLabel = (m: PayMethod): string => {
    const key = `common.pay.${m}` as I18nKey;
    const label = t(key);
    return label === key ? METHOD_FALLBACK[m] : label;
  };

  const diffLabel = (diff: number): string => {
    if (diff === 0) return t("dc.diff.match");
    if (diff > 0) return t("dc.diff.over", { amount: fmtPKR(diff) });
    return t("dc.diff.short", { amount: fmtPKR(-diff) });
  };

  const [openingInput, setOpeningInput] = useState<string | null>(null);
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [error, setError] = useState("");

  /**
   * A2 (design §1.4): the close counts ONE cash account — the till
   * (the `legacyFor: "cash"` account, else the cash method default).
   * The RECORDED expected cash is the journal-derived figure for that
   * account: its pre-today journal balance + today's journal movement
   * (== its full journal balance). The operational summary below stays
   * as the cross-check display.
   */
  const tillAccount = useMemo(() => {
    if (!ready) return null;
    return (
      accounts.find((a) => !a.archived && a.legacyFor === "cash") ??
      defaultAccountForMethod(accounts, "cash")
    );
  }, [ready, accounts]);

  const journalClose = useMemo(() => {
    if (!tillAccount) return null;
    const balance = moneyAccountBalance(journal, tillAccount);
    const opening = balance - accountDayNet(journal, tillAccount, 0);
    return {
      opening,
      expected: expectedCloseForAccount(journal, tillAccount, opening),
    };
  }, [journal, tillAccount]);

  const defaultOpening = useMemo(() => {
    if (!ready) return 0;
    const sorted = [...dayCloses].sort((a, b) => b.ts.localeCompare(a.ts));
    if (sorted.length > 0) return sorted[0].countedCash;
    // No earlier close: the till's journal balance (per-account form
    // of the old whole-journal cashBalance default — same figure).
    if (tillAccount) return moneyAccountBalance(journal, tillAccount);
    return cashBalance(journal);
  }, [ready, dayCloses, journal, tillAccount]);

  const openingCash =
    openingInput === null ? defaultOpening : Number(openingInput) || 0;
  const countedCash = Number(counted) || 0;

  const summary = useMemo(() => {
    if (!ready) return null;
    // F-8: expected CASH may only be reduced by refunds that actually
    // left the drawer — cash-method refunds on bills that still stand.
    // Wallet/bank refunds never touched the till, and a voided bill's
    // payments are already excluded from salesByMethod, so counting
    // its refund too would charge the drawer twice.
    const voidedBillIds = new Set(
      bills.filter((b) => b.status === "voided").map((b) => b.id)
    );
    const returnsRefundCash = returns
      .filter(
        (r) =>
          r.dayOffset === 0 && r.method === "cash" && !voidedBillIds.has(r.billId)
      )
      .reduce((a, r) => a + r.refundAmount, 0);
    const cashIn = cashEntries
      .filter((c) => c.dayOffset === 0 && c.kind === "in" && c.method === "cash")
      .reduce((a, c) => a + c.amount, 0);
    const cashOut = cashEntries
      .filter((c) => c.dayOffset === 0 && c.kind === "out" && c.method === "cash")
      .reduce((a, c) => a + c.amount, 0);
    return dayCloseSummary({
      sales,
      bills,
      expenses,
      credits,
      supplierPayments,
      returnsRefundCash,
      cashIn,
      cashOut,
      openingCash,
    });
  }, [ready, sales, bills, expenses, credits, supplierPayments, returns, cashEntries, openingCash]);

  const todayClose = useMemo(
    () => dayCloses.find((d) => d.dayOffset === 0) ?? null,
    [dayCloses]
  );

  const history = useMemo(
    () => [...dayCloses].sort((a, b) => b.ts.localeCompare(a.ts)),
    [dayCloses]
  );

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice(null);
    if (!summary) return;
    if (counted.trim() === "" || Number.isNaN(Number(counted))) {
      setError(t("dc.countedError"));
      return;
    }
    // A2: the recorded expectation is the JOURNAL figure for the till
    // account; the operational summary remains the cross-check.
    const recordedExpected = journalClose ? journalClose.expected : summary.expectedCash;
    const recordedOpening = journalClose ? journalClose.opening : openingCash;
    const difference = countedCash - recordedExpected;
    saveDayClose({
      dateISO: new Date().toISOString().slice(0, 10),
      accountId: tillAccount?.id ?? null,
      openingCash: recordedOpening,
      salesByMethod: { ...summary.salesByMethod },
      expensesTotal: summary.expensesTotal,
      creditGiven: summary.creditGiven,
      creditReceived: summary.creditReceived,
      supplierPaid: summary.supplierPaidCash,
      expectedCash: recordedExpected,
      countedCash,
      difference,
      note: note.trim(),
    });
    setNotice({
      ok: true,
      text:
        difference === 0
          ? t("dc.closedExact")
          : t("dc.closedDiff", { amount: fmtPKR(difference) }),
    });
  };

  if (!ready || !summary) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  // The difference the owner sees (and the badge) is against the
  // figure that will be recorded — the journal expectation (A2).
  const recordedExpected = journalClose ? journalClose.expected : summary.expectedCash;
  const difference = countedCash - recordedExpected;
  const totalSales = METHOD_ORDER.reduce(
    (a, m) => a + (summary.salesByMethod[m] ?? 0),
    0
  );
  const cashInToday = cashEntries
    .filter((c) => c.dayOffset === 0 && c.kind === "in" && c.method === "cash")
    .reduce((a, c) => a + c.amount, 0);
  const cashOutToday = cashEntries
    .filter((c) => c.dayOffset === 0 && c.kind === "out" && c.method === "cash")
    .reduce((a, c) => a + c.amount, 0);

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("dc.eyebrow")}</span>
          <h1 className="h2">{t("dc.title")}</h1>
          <p className="lead">{t("dc.subtitle")}</p>
        </div>

        {todayClose && (
          <div className="card" style={{ marginBottom: 24, borderColor: "rgba(21,128,61,0.45)" }}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 8 }}>{t("dc.alreadyClosed.title")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.94rem", marginBottom: 14 }}>
              {t("dc.alreadyClosed.text", { date: fmtDate(todayClose.ts) })}
            </p>
            <div className="stat-inline" style={{ marginTop: 0 }}>
              <div className="si">
                <b>{fmtPKR(todayClose.openingCash)}</b>
                <span>{t("dc.stat.opening")}</span>
              </div>
              <div className="si">
                <b>{fmtPKR(todayClose.expectedCash)}</b>
                <span>{t("dc.stat.expected")}</span>
              </div>
              <div className="si">
                <b>{fmtPKR(todayClose.countedCash)}</b>
                <span>{t("dc.stat.counted")}</span>
              </div>
              <div className="si">
                <b style={{ color: todayClose.difference === 0 ? "var(--accent-text)" : "var(--danger)" }}>
                  {fmtPKR(todayClose.difference)}
                </b>
                <span>{t("dc.stat.difference")}</span>
              </div>
            </div>
          </div>
        )}

        {canPerform && (
        <div className="grid-2" style={{ alignItems: "start", marginBottom: 24 }}>
          <section className="card" aria-label={t("dc.close.title")}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("dc.close.title")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 20 }}>
              {t("dc.close.caption")}
            </p>
            <form className="form" onSubmit={save}>
              {error && <div className="form-error">{error}</div>}
              <div className="field">
                <label htmlFor="dc-opening">{t("dc.opening.label")}</label>
                <input
                  id="dc-opening"
                  type="number"
                  step="any"
                  value={openingInput === null ? String(defaultOpening) : openingInput}
                  onChange={(e) => setOpeningInput(e.target.value)}
                />
                <div className="hint">{t("dc.opening.hint")}</div>
              </div>
              <div className="field">
                <label htmlFor="dc-counted">{t("dc.counted.label")}</label>
                <input
                  id="dc-counted"
                  type="number"
                  step="any"
                  value={counted}
                  onChange={(e) => setCounted(e.target.value)}
                  placeholder={t("dc.counted.placeholder")}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="dc-note">{t("dc.note.label")}</label>
                <input
                  id="dc-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("dc.note.placeholder")}
                />
              </div>
              {notice && (
                <div
                  className="note-box"
                  style={{ marginTop: 0, borderStyle: "solid", borderColor: "var(--accent)" }}
                >
                  {notice.text}
                </div>
              )}
              <button type="submit" className="btn btn-primary btn-lg">
                <IconCash /> {t("dc.save")}
              </button>
            </form>
          </section>

          <section className="card" aria-label={t("dc.totals.title")}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 14 }}>{t("dc.totals.title")}</h2>
            <div style={{ display: "grid", gap: 10, fontSize: "0.97rem" }}>
              <div style={{ fontWeight: 700, color: "var(--muted)", fontSize: "0.82rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {t("dc.totals.salesByMethod")}
              </div>
              {METHOD_ORDER.map((m) => (
                <div key={m} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{payLabel(m)}</span>
                  <b>{fmtPKR(summary.salesByMethod[m] ?? 0)}</b>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <span>{t("dc.totals.totalSales")}</span>
                <b>{fmtPKR(totalSales)}</b>
              </div>
              <div style={{ borderTop: "1px solid var(--line)", paddingTop: 10, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{t("dc.totals.expenses")}</span>
                  <b>{fmtPKR(summary.expensesTotal)}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{t("dc.totals.creditGiven")}</span>
                  <b>{fmtPKR(summary.creditGiven)}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{t("dc.totals.creditReceived")}</span>
                  <b>{fmtPKR(summary.creditReceived)}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{t("dc.totals.supplierPaid")}</span>
                  <b>{fmtPKR(summary.supplierPaidCash)}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{t("dc.totals.refunds")}</span>
                  <b>{fmtPKR(summary.refundsCash)}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{t("dc.totals.cashIn")}</span>
                  <b>{fmtPKR(cashInToday)}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span>{t("dc.totals.cashOut")}</span>
                  <b>{fmtPKR(cashOutToday)}</b>
                </div>
              </div>
              <div
                style={{
                  borderTop: "2px solid var(--line)",
                  paddingTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <b style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>
                  {tillAccount && journalClose
                    ? t("dc.expectedJournal", {
                        account: tillAccount.name,
                        amount: fmtPKR(journalClose.expected),
                      })
                    : t("dc.expected", { amount: fmtPKR(summary.expectedCash) })}
                </b>
              </div>
              {tillAccount && journalClose && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "var(--muted)" }}>
                    <span>{t("dc.crossCheck")}</span>
                    <span>{fmtPKR(summary.expectedCash)}</span>
                  </div>
                  <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>
                    {t("dc.journalNote", { account: tillAccount.name })}
                  </p>
                </>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <span>{t("dc.diff.label")}</span>
                <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <b>{fmtPKR(difference)}</b>
                  <span className={diffBadgeCls(difference)}>{diffLabel(difference)}</span>
                </span>
              </div>
            </div>
          </section>
        </div>
        )}

        <section aria-label={t("dc.history.title")}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: 14 }}>{t("dc.history.title")}</h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("dc.history.date")}</th>
                  <th>{t("dc.history.opening")}</th>
                  <th>{t("dc.history.expected")}</th>
                  <th>{t("dc.history.counted")}</th>
                  <th>{t("dc.history.difference")}</th>
                  <th>{t("dc.history.note")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((d) => {
                  const cls = diffBadgeCls(d.difference);
                  const acctName = d.accountId
                    ? accounts.find((a) => a.id === d.accountId)?.name
                    : undefined;
                  return (
                    <tr key={d.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {d.dateISO} <span style={{ color: "var(--muted)" }}>({fmtDate(d.ts)})</span>
                        {acctName && (
                          <span style={{ color: "var(--muted)" }}> · {acctName}</span>
                        )}
                      </td>
                      <td>{fmtPKR(d.openingCash)}</td>
                      <td>{fmtPKR(d.expectedCash)}</td>
                      <td><b>{fmtPKR(d.countedCash)}</b></td>
                      <td>
                        <span className={cls}>{fmtPKR(d.difference)}</span>
                      </td>
                      <td>{d.note || "—"}</td>
                    </tr>
                  );
                })}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty">{t("dc.history.empty")}</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
