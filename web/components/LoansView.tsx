"use client";

/**
 * Loans screen (Phase D · D3, design §3.5): the register of money
 * the shop has borrowed and money it has lent. Every figure on
 * this screen derives from the journal + each loan's events
 * diary through lib/loans — outstanding, the schedule's state
 * and the header totals are computed at render, never stored.
 *
 * Charges (§3.2): the register's default is NO charge; a charge
 * exists only where the desk chose a type at creation, and it
 * posts only as a discrete confirmed accrual per instalment —
 * the screen proposes ("accrue" on the next instalment), the
 * desk confirms, the store posts. Receivable loans are
 * charge-free in v1, enforced at composition in the store.
 *
 * Gating is the pre-declared `loans` matrix row (A3): owner /
 * accountant write, manager read, cashier none (PermDenied —
 * and the sidebar hides the link). Salary-grade sensitivity:
 * reads are narrowed in the rules exactly like payroll's.
 */
import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import PermDenied from "./PermDenied";
import { can } from "@/lib/permissions";
import {
  IconCash,
  IconChevronLeft,
  IconClose,
  IconPlus,
  IconSearch,
  SearchClear,
} from "./ui";
import { AccountPicker, NegativeBalanceWarning } from "./MoneyAccounts";
import { fmtDate, fmtNum, fmtPKR } from "@/lib/format";
import type { I18nKey } from "@/lib/i18n";
import { loanMatches } from "@/lib/search";
import { outflowPreview } from "@/lib/ledger";
import { currentFiscalYear, todayPktISO } from "@/lib/periods";
import { nextDocNumber } from "@/lib/documents";
import {
  addMonthsISO,
  defaultRepaymentSplit,
  loanInstalmentStates,
  loanNextDue,
  loanPosition,
  loanTermsError,
  loansRegisterTotals,
  nextChargeAccrual,
} from "@/lib/loans";
import type { Loan, PayMethod } from "@/lib/types";

const PAY_METHODS: Array<Exclude<PayMethod, "credit">> = [
  "cash",
  "jazzcash",
  "easypaisa",
  "bank",
];
const PAY_METHOD_KEY: Record<Exclude<PayMethod, "credit">, I18nKey> = {
  cash: "common.pay.cash",
  jazzcash: "common.pay.jazzcash",
  easypaisa: "common.pay.easypaisa",
  bank: "common.pay.bank",
};

type DirFilter = "all" | "payable" | "receivable";

const STATUS_KEY: Record<Loan["status"], I18nKey> = {
  active: "loan.status.active",
  settled: "loan.status.settled",
  cancelled: "loan.status.cancelled",
};
const STATE_KEY: Record<string, I18nKey> = {
  paid: "loan.state.paid",
  partial: "loan.state.partial",
  overdue: "loan.state.overdue",
  due: "loan.state.due",
  upcoming: "loan.state.upcoming",
};
const EV_KEY: Record<string, I18nKey> = {
  drawdown: "loan.ev.drawdown",
  charge: "loan.ev.charge",
  repayment: "loan.ev.repayment",
  fee: "loan.ev.fee",
};

function chargeLabel(loan: Loan, t: (k: I18nKey, p?: Record<string, string | number>) => string): string {
  switch (loan.chargeType) {
    case "flat":
      return t("loan.charge.flat", { rate: fmtNum(loan.chargeRate) });
    case "reducing":
      return t("loan.charge.reducing", { rate: fmtNum(loan.chargeRate) });
    case "fee_only":
      return t("loan.charge.feeOnly", { amount: fmtPKR(loan.chargeAmount) });
    default:
      return t("loan.charge.none");
  }
}

export default function LoansView() {
  const store = useStore();
  const { loans, journal, settings } = store;
  const { role } = useAuth();
  const { t } = useLang();
  const canWrite = can(role, "loans", "write");

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DirFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const today = todayPktISO();
  const totals = useMemo(() => loansRegisterTotals(loans), [loans]);
  const chargesFy = useMemo(() => {
    const fy = currentFiscalYear(settings);
    let sum = 0;
    for (const e of journal) {
      if (e.ts < fy.fromTs || e.ts >= fy.toTs) continue;
      for (const l of e.lines) {
        if (l.account === "expense_finance") sum += l.debit - l.credit;
      }
    }
    return Math.round((sum + Number.EPSILON) * 100) / 100;
  }, [journal, settings]);
  const activeCount = loans.filter((l) => l.status === "active").length;

  const visible = useMemo(
    () =>
      [...loans]
        .filter((l) => filter === "all" || l.direction === filter)
        .filter((l) => loanMatches(l, query))
        .sort((a, b) => b.ts.localeCompare(a.ts)),
    [loans, filter, query]
  );

  if (!can(role, "loans", "view")) return <PermDenied />;

  const openLoan = openId ? (loans.find((l) => l.id === openId) ?? null) : null;

  return (
    <div className="section">
      <div className="container">
        {openLoan ? (
          <LoanDetail
            loan={openLoan}
            canWrite={canWrite}
            onBack={() => setOpenId(null)}
            onNotice={setNotice}
          />
        ) : (
          <>
            <div className="toolbar">
              <div>
                <h1 style={{ fontSize: "1.6rem" }}>{t("loan.title")}</h1>
                <p style={{ color: "var(--muted)", maxWidth: 640 }}>
                  {t("loan.subtitle")}
                </p>
              </div>
              {canWrite && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowCreate(true)}
                >
                  <IconPlus /> {t("loan.new")}
                </button>
              )}
            </div>

            {notice && (
              <div className={notice.ok ? "notice ok" : "notice err"} role="status">
                {notice.text}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginBottom: 20,
              }}
            >
              {[
                { label: t("loan.kpi.borrowed"), value: fmtPKR(totals.borrowedOutstanding) },
                { label: t("loan.kpi.lent"), value: fmtPKR(totals.lentOutstanding) },
                { label: t("loan.kpi.chargesFy"), value: fmtPKR(chargesFy) },
                { label: t("loan.kpi.count"), value: fmtNum(activeCount) },
              ].map((kpi) => (
                <div key={kpi.label} className="card" style={{ padding: "14px 16px" }}>
                  <div style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                    {kpi.label}
                  </div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700 }}>{kpi.value}</div>
                </div>
              ))}
            </div>

            <div className="toolbar">
              <div className="search-box">
                <IconSearch />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("loan.searchPlaceholder")}
                  aria-label={t("loan.searchPlaceholder")}
                />
                {query && (
                  <SearchClear
                    onClear={() => setQuery("")}
                    label={t("action.clearSearch")}
                  />
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {(
                  [
                    ["all", "loan.filter.all"],
                    ["payable", "loan.filter.payable"],
                    ["receivable", "loan.filter.receivable"],
                  ] as Array<[DirFilter, I18nKey]>
                ).map(([f, key]) => (
                  <button
                    key={f}
                    type="button"
                    className={filter === f ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                    onClick={() => setFilter(f)}
                  >
                    {t(key)}
                  </button>
                ))}
              </div>
            </div>

            {loans.length === 0 ? (
              <div className="empty">{t("loan.empty")}</div>
            ) : visible.length === 0 ? (
              <div className="empty">{t("loan.emptyFiltered")}</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data">
                  <thead>
                    <tr>
                      <th>{t("loan.col.number")}</th>
                      <th>{t("loan.col.party")}</th>
                      <th>{t("loan.col.principal")}</th>
                      <th>{t("loan.col.outstanding")}</th>
                      <th>{t("loan.col.nextDue")}</th>
                      <th>{t("loan.schedule.state")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((loan) => {
                      const pos = loanPosition(loan);
                      const next = loan.status === "active" ? loanNextDue(loan, today) : null;
                      return (
                        <tr
                          key={loan.id}
                          onClick={() => setOpenId(loan.id)}
                          style={{ cursor: "pointer" }}
                        >
                          <td>
                            <b>{loan.number}</b>
                          </td>
                          <td>
                            {loan.partyName}{" "}
                            <span
                              className={
                                loan.direction === "payable" ? "badge amber" : "badge green"
                              }
                            >
                              {t(
                                loan.direction === "payable"
                                  ? "loan.dir.payable"
                                  : "loan.dir.receivable"
                              )}
                            </span>
                          </td>
                          <td>{fmtPKR(loan.principal)}</td>
                          <td>
                            <b>{fmtPKR(pos.outstanding)}</b>
                          </td>
                          <td>
                            {next ? (
                              <>
                                {fmtDate(next.instalment.dueISO)} ·{" "}
                                {fmtPKR(next.instalment.owed - next.instalment.paidAmount)}
                                {next.overdueCount > 0 && (
                                  <>
                                    {" "}
                                    <span className="badge red">
                                      {t("loan.overdueCount", { count: next.overdueCount })}
                                    </span>
                                  </>
                                )}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <span
                              className={
                                loan.status === "settled"
                                  ? "badge green"
                                  : loan.status === "cancelled"
                                    ? "badge red"
                                    : "badge"
                              }
                            >
                              {t(STATUS_KEY[loan.status])}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {showCreate && (
          <CreateLoanModal
            onClose={() => setShowCreate(false)}
            onCreated={(number) => {
              setShowCreate(false);
              setNotice({ ok: true, text: t("loan.created", { number }) });
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail                                                              */
/* ------------------------------------------------------------------ */

function LoanDetail({
  loan,
  canWrite,
  onBack,
  onNotice,
}: {
  loan: Loan;
  canWrite: boolean;
  onBack: () => void;
  onNotice: (n: { ok: boolean; text: string }) => void;
}) {
  const store = useStore();
  const { accounts } = store;
  const { t } = useLang();
  const [showRepay, setShowRepay] = useState(false);
  const [confirmAccrue, setConfirmAccrue] = useState(false);
  const [confirmReverseId, setConfirmReverseId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const today = todayPktISO();
  const pos = loanPosition(loan);
  const states = useMemo(() => loanInstalmentStates(loan, today), [loan, today]);
  const accrual = nextChargeAccrual(loan);
  const accountName = (id: string | null) =>
    id ? (accounts.find((a) => a.id === id)?.name ?? "—") : "—";

  const doAccrue = () => {
    if (!accrual) return;
    if (store.accrueLoanCharge(loan.id, accrual.n)) {
      onNotice({
        ok: true,
        text: t("loan.accrue.done", {
          n: accrual.n,
          amount: fmtPKR(accrual.chargePart),
        }),
      });
    }
    setConfirmAccrue(false);
  };

  const doReverse = (entryId: string) => {
    store.reverseLoanEvent(loan.id, entryId);
    setConfirmReverseId(null);
  };

  // Events newest first; a reversal event is labelled by the
  // mirror it belongs to (its entry posted the reversal).
  const journal = store.journal;
  const reversedEntryIds = useMemo(
    () => new Set(journal.map((e) => e.reversesId).filter(Boolean) as string[]),
    [journal]
  );
  const eventsNewest = [...loan.events].reverse();

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        style={{ marginBottom: 16 }}
        onClick={onBack}
      >
        <IconChevronLeft /> {t("loan.back")}
      </button>

      <div className="card" style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ fontSize: "1.35rem" }}>
              {loan.number} — {loan.partyName}{" "}
              <span className={loan.direction === "payable" ? "badge amber" : "badge green"}>
                {t(loan.direction === "payable" ? "loan.dir.payable" : "loan.dir.receivable")}
              </span>{" "}
              <span
                className={
                  loan.status === "settled"
                    ? "badge green"
                    : loan.status === "cancelled"
                      ? "badge red"
                      : "badge"
                }
              >
                {t(STATUS_KEY[loan.status])}
              </span>
            </h2>
            {loan.note && <p style={{ color: "var(--muted)" }}>{loan.note}</p>}
          </div>
          {canWrite && loan.status === "active" && pos.outstanding > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowRepay(true)}
            >
              <IconCash /> {t("loan.repay")}
            </button>
          )}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 10,
            marginTop: 14,
            fontSize: "0.95rem",
          }}
        >
          {[
            { label: t("loan.col.principal"), value: fmtPKR(loan.principal) },
            { label: t("loan.col.outstanding"), value: fmtPKR(pos.outstanding) },
            { label: t("loan.detail.repaid"), value: fmtPKR(pos.totalRepaid) },
            { label: t("loan.detail.chargesAccrued"), value: fmtPKR(pos.chargesAccrued) },
            { label: t("loan.detail.charge"), value: chargeLabel(loan, t) },
            { label: t("loan.detail.start"), value: fmtDate(loan.startDateISO) },
            {
              label: t("loan.detail.instalments"),
              value: `${fmtNum(loan.instalmentCount)} · ${t(
                loan.instalmentEvery === "week"
                  ? "loan.detail.every.week"
                  : "loan.detail.every.month"
              )}`,
            },
            { label: t("loan.detail.firstDue"), value: fmtDate(loan.firstDueISO) },
          ].map((row) => (
            <div key={row.label}>
              <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{row.label}</div>
              <b>{row.value}</b>
            </div>
          ))}
        </div>
        {loan.status === "settled" && (
          <p style={{ marginTop: 12, color: "var(--muted)" }}>{t("loan.settled.notice")}</p>
        )}
        {canWrite && loan.events.length === 0 && (
          <div style={{ marginTop: 12 }}>
            {!confirmDelete ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmDelete(true)}
              >
                {t("loan.delete")}
              </button>
            ) : (
              <>
                <span style={{ marginInlineEnd: 8 }}>{t("loan.delete.confirm")}</span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    if (store.deleteLoan(loan.id)) onBack();
                  }}
                >
                  {t("loan.delete")}
                </button>{" "}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  {t("action.cancel")}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ marginBottom: 12 }}>{t("loan.schedule.title")}</h3>
        <div style={{ overflowX: "auto" }}>
          <table className="data" style={{ minWidth: 0 }}>
            <thead>
              <tr>
                <th>{t("loan.schedule.n")}</th>
                <th>{t("loan.schedule.due")}</th>
                <th>{t("loan.schedule.principal")}</th>
                <th>{t("loan.schedule.charge")}</th>
                <th>{t("loan.schedule.total")}</th>
                <th>{t("loan.schedule.paid")}</th>
                <th>{t("loan.schedule.state")}</th>
                {canWrite && <th></th>}
              </tr>
            </thead>
            <tbody>
              {states.map((s) => (
                <tr key={s.n}>
                  <td>{s.n}</td>
                  <td>{fmtDate(s.dueISO)}</td>
                  <td>{fmtPKR(s.principalPart)}</td>
                  <td>
                    {s.chargePart > 0 ? (
                      <>
                        {fmtPKR(s.chargePart)}{" "}
                        <span className={s.chargeAccrued ? "badge green" : "badge"}>
                          {t(s.chargeAccrued ? "loan.accrued.badge" : "loan.notAccrued.badge")}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{fmtPKR(s.total)}</td>
                  <td>{fmtPKR(s.paidAmount)}</td>
                  <td>
                    <span
                      className={
                        s.state === "paid"
                          ? "badge green"
                          : s.state === "overdue"
                            ? "badge red"
                            : s.state === "partial" || s.state === "due"
                              ? "badge amber"
                              : "badge"
                      }
                    >
                      {t(STATE_KEY[s.state])}
                    </span>
                  </td>
                  {canWrite && (
                    <td>
                      {accrual && accrual.n === s.n && loan.status === "active" ? (
                        !confirmAccrue ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setConfirmAccrue(true)}
                          >
                            {t("loan.accrue")}
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={doAccrue}
                            >
                              {t("action.confirm")}
                            </button>{" "}
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setConfirmAccrue(false)}
                            >
                              {t("action.cancel")}
                            </button>
                          </>
                        )
                      ) : null}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {accrual && (
          <p style={{ color: "var(--muted)", marginTop: 10, fontSize: "0.9rem" }}>
            {t("loan.accrue.confirm", { n: accrual.n, amount: fmtPKR(accrual.chargePart) })}
          </p>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>{t("loan.events.title")}</h3>
        {eventsNewest.length === 0 ? (
          <div className="empty">{t("loan.events.empty")}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data" style={{ minWidth: 0 }}>
              <thead>
                <tr>
                  <th>{t("loan.ev.date")}</th>
                  <th></th>
                  <th>{t("loan.ev.amount")}</th>
                  <th>{t("loan.ev.split")}</th>
                  <th>{t("loan.ev.account")}</th>
                  {canWrite && <th></th>}
                </tr>
              </thead>
              <tbody>
                {eventsNewest.map((ev, i) => {
                  const isReversal = ev.amount < 0;
                  const standing =
                    !isReversal && !reversedEntryIds.has(ev.entryId);
                  return (
                    <tr key={`${ev.entryId}-${ev.kind}-${i}`}>
                      <td>{fmtDate(ev.ts.slice(0, 10))}</td>
                      <td>
                        {t(EV_KEY[ev.kind] ?? "loan.ev.repayment")}
                        {isReversal && <> · {t("loan.ev.reversal")}</>}
                      </td>
                      <td>{fmtPKR(Math.abs(ev.amount))}</td>
                      <td>
                        {ev.kind === "repayment" || ev.kind === "drawdown"
                          ? `${fmtPKR(Math.abs(ev.principalPart))} / ${fmtPKR(Math.abs(ev.chargePart))}`
                          : "—"}
                      </td>
                      <td>{accountName(ev.accountId)}</td>
                      {canWrite && (
                        <td>
                          {standing && loan.status !== "cancelled" ? (
                            confirmReverseId === ev.entryId ? (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => doReverse(ev.entryId)}
                                >
                                  {t("action.confirm")}
                                </button>{" "}
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => setConfirmReverseId(null)}
                                >
                                  {t("action.cancel")}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setConfirmReverseId(ev.entryId)}
                                title={t("loan.reverse.confirm")}
                              >
                                {t("loan.reverse")}
                              </button>
                            )
                          ) : null}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showRepay && (
        <RepayModal
          loan={loan}
          onClose={() => setShowRepay(false)}
          onDone={(text) => {
            setShowRepay(false);
            onNotice({ ok: true, text });
          }}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Repay modal — money out for payable loans warns first (§3.4)        */
/* ------------------------------------------------------------------ */

function RepayModal({
  loan,
  onClose,
  onDone,
}: {
  loan: Loan;
  onClose: () => void;
  onDone: (text: string) => void;
}) {
  const { journal, accounts, repayLoan } = useStore();
  const { t } = useLang();
  const pos = loanPosition(loan);
  const def = defaultRepaymentSplit(loan, pos.outstanding);
  const [amount, setAmount] = useState(String(pos.outstanding || ""));
  const [principalPart, setPrincipalPart] = useState(String(def.principalPart || ""));
  const [chargePart, setChargePart] = useState(String(def.chargePart || ""));
  const [method, setMethod] = useState<Exclude<PayMethod, "credit">>("cash");
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState("");
  const [negWarn, setNegWarn] = useState<{
    accountName: string;
    amount: number;
    balanceAfter: number;
  } | null>(null);

  const onAmountChange = (v: string) => {
    setAmount(v);
    const amt = Number(v);
    if (Number.isFinite(amt) && amt > 0) {
      const split = defaultRepaymentSplit(loan, Math.min(amt, pos.outstanding));
      setPrincipalPart(String(split.principalPart || ""));
      setChargePart(String(split.chargePart || ""));
    }
  };

  const post = (amt: number): boolean =>
    repayLoan(loan.id, {
      amount: amt,
      method,
      accountId: accountId || null,
      principalPart: Number(principalPart) || 0,
      chargePart: Number(chargePart) || 0,
    });

  const attempt = () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || !(amt > 0) || amt > pos.outstanding + 0.001) {
      setError(t("loan.repay.errAmount"));
      return;
    }
    // Money LEAVES the shop only when repaying a borrowed loan;
    // a lent loan's repayment is money in (no warning, §3.4).
    if (loan.direction === "payable") {
      const preview = outflowPreview(journal, accounts, {
        method,
        accountId: accountId || null,
        amount: amt,
      });
      if (preview && preview.balanceAfter < 0) {
        setNegWarn({
          accountName: preview.account.name,
          amount: amt,
          balanceAfter: preview.balanceAfter,
        });
        return;
      }
    }
    if (post(amt)) onDone(t("loan.repay.done", { amount: fmtPKR(amt), number: loan.number }));
    else setError(t("loan.repay.errAmount"));
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("loan.repay.title", { number: loan.number })}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("loan.repay.title", { number: loan.number })}</h2>
        <p className="modal-sub">{t("loan.repay.remaining", { amount: fmtPKR(pos.outstanding) })}</p>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            attempt();
          }}
        >
          <div className="form-grid">
            <div className="field">
              <label htmlFor="loan-repay-amount">{t("loan.repay.amount")}</label>
              <input
                id="loan-repay-amount"
                type="number"
                min={0}
                step="any"
                value={amount}
                onChange={(e) => onAmountChange(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="loan-repay-principal">{t("loan.repay.principalPart")}</label>
              <input
                id="loan-repay-principal"
                type="number"
                min={0}
                step="any"
                value={principalPart}
                onChange={(e) => setPrincipalPart(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="loan-repay-charge">{t("loan.repay.chargePart")}</label>
              <input
                id="loan-repay-charge"
                type="number"
                min={0}
                step="any"
                value={chargePart}
                onChange={(e) => setChargePart(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="loan-repay-method">{t("loan.repay.method")}</label>
              <select
                id="loan-repay-method"
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value as Exclude<PayMethod, "credit">);
                  setAccountId("");
                }}
              >
                {PAY_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(PAY_METHOD_KEY[m])}
                  </option>
                ))}
              </select>
            </div>
            <AccountPicker
              method={method}
              value={accountId}
              onChange={setAccountId}
              label={t("loan.repay.account")}
            />
          </div>
          <p className="modal-sub">{t("loan.repay.splitHint")}</p>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <IconClose /> {t("action.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              <IconCash /> {t("loan.repay")}
            </button>
          </div>
        </form>
      </div>
      {negWarn && (
        <NegativeBalanceWarning
          accountName={negWarn.accountName}
          amount={negWarn.amount}
          balanceAfter={negWarn.balanceAfter}
          onCancel={() => setNegWarn(null)}
          onConfirm={() => {
            const amt = Number(amount);
            setNegWarn(null);
            if (post(amt)) {
              onDone(t("loan.repay.done", { amount: fmtPKR(amt), number: loan.number }));
            } else {
              setError(t("loan.repay.errAmount"));
            }
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create modal — the loan is born with its drawdown (§3.4/§10.3).     */
/* A receivable drawdown is money OUT: it warns first (§3.4).          */
/* ------------------------------------------------------------------ */

function CreateLoanModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (number: string) => void;
}) {
  const {
    journal,
    accounts,
    suppliers,
    customers,
    employees,
    createLoan,
    loans,
    settings,
  } = useStore();
  const { t } = useLang();
  const today = todayPktISO();
  const [direction, setDirection] = useState<Loan["direction"]>("payable");
  const [partyName, setPartyName] = useState("");
  const [partyId, setPartyId] = useState("");
  const [principal, setPrincipal] = useState("");
  const [chargeType, setChargeType] = useState<Loan["chargeType"]>("none");
  const [chargeRate, setChargeRate] = useState("");
  const [feeAmount, setFeeAmount] = useState("");
  const [startDateISO, setStartDateISO] = useState(today);
  const [count, setCount] = useState("12");
  const [every, setEvery] = useState<Loan["instalmentEvery"]>("month");
  const [firstDueISO, setFirstDueISO] = useState(addMonthsISO(today, 1));
  const [method, setMethod] = useState<Exclude<PayMethod, "credit">>("cash");
  const [accountId, setAccountId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [negWarn, setNegWarn] = useState<{
    accountName: string;
    amount: number;
    balanceAfter: number;
  } | null>(null);

  const effectiveChargeType = direction === "receivable" ? "none" : chargeType;

  const build = () => ({
    direction,
    partyName: partyName.trim(),
    partyId: partyId || null,
    principal: Number(principal) || 0,
    chargeType: effectiveChargeType,
    chargeRate: Number(chargeRate) || 0,
    feeAmount: direction === "payable" ? Number(feeAmount) || 0 : 0,
    startDateISO,
    instalmentCount: Number(count) || 0,
    instalmentEvery: every,
    firstDueISO,
    method,
    accountId: accountId || null,
    note: note.trim(),
  });

  const post = (): boolean => {
    const input = build();
    // The number the store will mint (the §1.3 max+1 mechanism
    // over the same snapshot) — read before posting, because
    // this closure's `loans` is the pre-post snapshot.
    const expectedNumber = nextDocNumber(
      "loan",
      loans.map((l) => l.number),
      settings
    );
    const id = createLoan(input);
    if (!id) return false;
    onCreated(expectedNumber);
    return true;
  };

  const attempt = () => {
    const input = build();
    if (
      loanTermsError({
        direction: input.direction,
        partyName: input.partyName,
        principal: input.principal,
        chargeType: input.chargeType,
        chargeRate: input.chargeRate,
        feeAmount: input.feeAmount,
        instalmentCount: input.instalmentCount,
      })
    ) {
      setError(t("loan.form.errTerms"));
      return;
    }
    // Lending money out warns before it posts (§3.4); borrowing
    // is money in — no warning.
    if (direction === "receivable") {
      const preview = outflowPreview(journal, accounts, {
        method,
        accountId: accountId || null,
        amount: input.principal,
      });
      if (preview && preview.balanceAfter < 0) {
        setNegWarn({
          accountName: preview.account.name,
          amount: input.principal,
          balanceAfter: preview.balanceAfter,
        });
        return;
      }
    }
    if (!post()) setError(t("loan.form.errTerms"));
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("loan.form.title")}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("loan.form.title")}</h2>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            attempt();
          }}
        >
          <div className="form-grid">
            <div className="field">
              <label htmlFor="loan-direction">{t("loan.form.direction")}</label>
              <select
                id="loan-direction"
                value={direction}
                onChange={(e) => setDirection(e.target.value as Loan["direction"])}
              >
                <option value="payable">{t("loan.dir.payable")}</option>
                <option value="receivable">{t("loan.dir.receivable")}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="loan-party">{t("loan.form.party")}</label>
              <input
                id="loan-party"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="loan-link">{t("loan.form.partyLink")}</label>
              <select
                id="loan-link"
                value={partyId}
                onChange={(e) => {
                  const v = e.target.value;
                  setPartyId(v);
                  const sup = suppliers.find((s) => s.id === v);
                  const cus = customers.find((c) => c.id === v);
                  const emp = employees.find((x) => x.id === v);
                  const name = sup?.name ?? cus?.name ?? emp?.name;
                  if (name) setPartyName(name);
                }}
              >
                <option value="">{t("loan.form.partyNone")}</option>
                {suppliers.length > 0 && (
                  <optgroup label={t("nav.suppliers")}>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {customers.length > 0 && (
                  <optgroup label={t("nav.customers")}>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {employees.length > 0 && (
                  <optgroup label={t("nav.staff")}>
                    {employees.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="field">
              <label htmlFor="loan-principal">{t("loan.form.principal")}</label>
              <input
                id="loan-principal"
                type="number"
                min={0}
                step="any"
                value={principal}
                onChange={(e) => setPrincipal(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="loan-charge-type">{t("loan.form.chargeType")}</label>
              <select
                id="loan-charge-type"
                value={effectiveChargeType}
                disabled={direction === "receivable"}
                onChange={(e) => setChargeType(e.target.value as Loan["chargeType"])}
              >
                <option value="none">{t("loan.form.chargeType.none")}</option>
                <option value="flat">{t("loan.form.chargeType.flat")}</option>
                <option value="reducing">{t("loan.form.chargeType.reducing")}</option>
                <option value="fee_only">{t("loan.form.chargeType.feeOnly")}</option>
              </select>
            </div>
            {(effectiveChargeType === "flat" || effectiveChargeType === "reducing") && (
              <div className="field">
                <label htmlFor="loan-charge-rate">{t("loan.form.chargeRate")}</label>
                <input
                  id="loan-charge-rate"
                  type="number"
                  min={0}
                  step="any"
                  value={chargeRate}
                  onChange={(e) => setChargeRate(e.target.value)}
                  required
                />
              </div>
            )}
            {direction === "payable" && (
              <div className="field">
                <label htmlFor="loan-fee">
                  {effectiveChargeType === "fee_only"
                    ? t("loan.form.feeOnlyLabel")
                    : t("loan.form.fee")}
                </label>
                <input
                  id="loan-fee"
                  type="number"
                  min={0}
                  step="any"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  required={effectiveChargeType === "fee_only"}
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="loan-start">{t("loan.form.start")}</label>
              <input
                id="loan-start"
                type="date"
                value={startDateISO}
                onChange={(e) => setStartDateISO(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="loan-count">{t("loan.form.count")}</label>
              <input
                id="loan-count"
                type="number"
                min={1}
                step={1}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="loan-every">{t("loan.form.every")}</label>
              <select
                id="loan-every"
                value={every}
                onChange={(e) => setEvery(e.target.value as Loan["instalmentEvery"])}
              >
                <option value="month">{t("loan.detail.every.month")}</option>
                <option value="week">{t("loan.detail.every.week")}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="loan-first-due">{t("loan.form.firstDue")}</label>
              <input
                id="loan-first-due"
                type="date"
                value={firstDueISO}
                onChange={(e) => setFirstDueISO(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="loan-method">{t("loan.form.method")}</label>
              <select
                id="loan-method"
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value as Exclude<PayMethod, "credit">);
                  setAccountId("");
                }}
              >
                {PAY_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(PAY_METHOD_KEY[m])}
                  </option>
                ))}
              </select>
            </div>
            <AccountPicker
              method={method}
              value={accountId}
              onChange={setAccountId}
              label={t("loan.form.account")}
            />
            <div className="field">
              <label htmlFor="loan-note">{t("loan.form.note")}</label>
              <input
                id="loan-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          {direction === "receivable" && (
            <p className="modal-sub">{t("loan.form.receivableHint")}</p>
          )}
          {direction === "payable" && effectiveChargeType !== "fee_only" && (
            <p className="modal-sub">{t("loan.form.feeHint")}</p>
          )}
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <IconClose /> {t("action.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              <IconPlus /> {t("loan.form.create")}
            </button>
          </div>
        </form>
      </div>
      {negWarn && (
        <NegativeBalanceWarning
          accountName={negWarn.accountName}
          amount={negWarn.amount}
          balanceAfter={negWarn.balanceAfter}
          onCancel={() => setNegWarn(null)}
          onConfirm={() => {
            setNegWarn(null);
            if (!post()) setError(t("loan.form.errTerms"));
          }}
        />
      )}
    </div>
  );
}
