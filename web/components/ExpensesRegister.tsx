"use client";

import React, { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import PermDenied from "./PermDenied";
import { can } from "@/lib/permissions";
import { IconCash, IconChart, IconClose, IconEdit, IconPlus, IconTrash } from "./ui";
import { fmtDate, fmtPKR } from "@/lib/format";
import { EXPENSE_ACCOUNT_LABEL } from "@/lib/workflow";
import { accountNormalBalance } from "@/lib/ledger";
import { addDaysISO, businessDateISO, isPeriodLockedError, todayPktISO } from "@/lib/periods";
import { revenueOnDay } from "@/lib/selectors";
import {
  expenseTotal,
  expensesOnDay,
  expensesThisMonth,
  outflowPreview,
  salesIncomeThisMonth,
} from "@/lib/ledger";
import type { I18nKey } from "@/lib/i18n";
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from "@/lib/types";
import { AccountPicker, NegativeBalanceWarning } from "./MoneyAccounts";
import {
  ChequeFields,
  chequeDraftOf,
  chequeFormOf,
  emptyChequeForm,
  type ChequeFormState,
} from "./ChequeCapture";

type Method = Expense["method"];
const METHODS: Method[] = ["cash", "jazzcash", "easypaisa", "bank"];

const CAT_LABEL: Record<ExpenseCategory, I18nKey> = {
  rent: "common.expenseCat.rent",
  electricity: "common.expenseCat.electricity",
  salary: "common.expenseCat.salary",
  transport: "common.expenseCat.transport",
  other: "common.expenseCat.other",
};

const PAY_LABEL: Record<Method, I18nKey> = {
  cash: "common.pay.cash",
  jazzcash: "common.pay.jazzcash",
  easypaisa: "common.pay.easypaisa",
  bank: "common.pay.bank",
};

/** B5: the form's extra choice is the cheque INSTRUMENT (the
 *  store row's method rides as "bank"), never a sixth method. */
type UiMethod = Method | "cheque";

function todayISO(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function isoForOffset(dayOffset: number): string {
  const d = new Date(Date.now() - dayOffset * 86400000);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Days between the chosen date (local midnight) and today, clamped 0..365. */
function offsetForDate(dateStr: string): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const chosen = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(chosen.getTime())) return 0;
  const raw = Math.round((start.getTime() - chosen.getTime()) / 86400000);
  return Math.min(365, Math.max(0, raw));
}

export default function ExpensesRegister() {
  const { ready, sales, expenses, cheques, settings, journal, accounts, addExpense, updateExpense, deleteExpense } = useStore();
  const { role } = useAuth();
  const { t, lang } = useLang();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<UiMethod>("cash");
  /** A2: money account the expense is paid from; "" = method default. */
  const [accountId, setAccountId] = useState("");
  const [chequeForm, setChequeForm] = useState<ChequeFormState>(emptyChequeForm());
  const [note, setNote] = useState("");
  const [dateStr, setDateStr] = useState(todayISO());
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Expense | null>(null);
  /** Fix 2: pending negative-balance confirmation for the submit. */
  const [negWarn, setNegWarn] = useState<{
    accountName: string;
    amount: number;
    balanceAfter: number;
    proceed: () => void;
  } | null>(null);

  const summary = useMemo(() => {
    const todayIncome = revenueOnDay(sales, 0);
    const monthIncome = salesIncomeThisMonth(sales);
    const todayExp = expenseTotal(expensesOnDay(expenses, 0));
    const monthExp = expenseTotal(expensesThisMonth(expenses));
    return {
      todayIncome,
      monthIncome,
      todayExp,
      monthExp,
      monthNet: monthIncome - monthExp,
    };
  }, [sales, expenses]);

  const rows = useMemo(
    () => [...expenses].sort((a, b) => b.ts.localeCompare(a.ts)),
    [expenses]
  );

  const openAdd = () => {
    setEditing(null);
    setCategory("other");
    setAmount("");
    setMethod("cash");
    setAccountId("");
    setChequeForm(emptyChequeForm());
    setNote("");
    setDateStr(todayISO());
    setError("");
    setModalOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setCategory(e.category);
    setAmount(String(e.amount));
    // B5: a cheque expense shows its instrument; the registry doc
    // pre-fills the (read-only in spirit) capture fields.
    const chq =
      e.instrument === "cheque" && e.chequeId
        ? cheques.find((x) => x.id === e.chequeId)
        : undefined;
    setMethod(e.instrument === "cheque" ? "cheque" : e.method);
    setAccountId(e.accountId ?? "");
    setChequeForm(
      chq
        ? chequeFormOf({
            chequeNo: chq.chequeNo,
            bankName: chq.bankName,
            issueDateISO: chq.issueDateISO,
            dueDateISO: chq.dueDateISO,
          })
        : emptyChequeForm()
    );
    setNote(e.note);
    setDateStr(isoForOffset(e.dayOffset));
    setError("");
    setModalOpen(true);
  };

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError(t("exp.err.amount"));
      return;
    }
    if (!dateStr) {
      setError(t("exp.err.date"));
      return;
    }
    const dayOffset = offsetForDate(dateStr);
    // B5: a NEW expense by cheque must carry its captured
    // instrument. (Editing a cheque expense keeps its stamps —
    // the store preserves them; a spent cheque refuses the edit.)
    const draft =
      !editing && method === "cheque" ? chequeDraftOf(chequeForm) : null;
    if (!editing && method === "cheque" && !draft) {
      setError(t("chq.err.capture"));
      return;
    }
    const storeMethod: Method =
      method === "cheque" ? "bank" : editing?.instrument === "cheque" ? editing.method : method;
    // A5: the store's period guard refuses a NEW expense dated
    // inside a locked period — the refusal surfaces here as a clear
    // message rather than a silent no-op. Edits of an old expense
    // never trip it: their correction entries repost at today's
    // date (design §5.2).
    const doSubmit = () => {
      try {
        if (editing) {
          const patch: Partial<Expense> = {
            category,
            amount: amt,
            method: storeMethod,
            accountId: accountId || null,
            note: note.trim(),
          };
          // Keep the record's date unless the user actually changed it.
          if (dayOffset !== editing.dayOffset) {
            patch.dayOffset = dayOffset;
            patch.ts = new Date(Date.now() - dayOffset * 86400000).toISOString();
          }
          updateExpense(editing.id, patch);
        } else {
          addExpense({
            category,
            amount: amt,
            method: storeMethod,
            accountId: accountId || null,
            note: note.trim(),
            dayOffset,
            ...(draft ? { instrument: "cheque" as const, cheque: draft } : {}),
          });
        }
      } catch (err) {
        if (isPeriodLockedError(err)) {
          setError(
            t("fin.period.lockedError", {
              date: fmtDate(settings.lockedThrough || ""),
            })
          );
          return;
        }
        throw err;
      }
      setModalOpen(false);
    };
    // Fix 2: warn (never block) when the expense would drive its
    // account negative. A cheque expense settles into
    // `cheques_issued`, not a money account, so it never warns
    // here. On an edit the old posting is reversed first, so when
    // the account is unchanged only the increase is a new outflow.
    if (method !== "cheque" && editing?.instrument !== "cheque") {
      const sameAccount =
        !!editing &&
        editing.method === storeMethod &&
        (editing.accountId ?? null) === (accountId || null);
      const preview = outflowPreview(journal, accounts, {
        method: storeMethod,
        accountId: accountId || null,
        amount: sameAccount ? amt - editing.amount : amt,
      });
      if (preview && preview.balanceAfter < 0) {
        setNegWarn({
          accountName: preview.account.name,
          amount: amt,
          balanceAfter: preview.balanceAfter,
          proceed: doSubmit,
        });
        return;
      }
    }
    doSubmit();
  };

  if (!can(role, "expenses", "view")) return <PermDenied />;

  if (!ready) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("exp.eyebrow")}</span>
          <h1 className="h2">{t("exp.title")}</h1>
          <p className="lead">{t("exp.subtitle")}</p>
        </div>

        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card kpi">
            <div className="kpi-icon green"><IconCash /></div>
            <div>
              <div className="kpi-label">{t("exp.sum.todayIncome")}</div>
              <div className="kpi-value">{fmtPKR(summary.todayIncome)}</div>
              <div className="kpi-sub">{t("exp.sum.todayIncomeSub")}</div>
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon green"><IconChart /></div>
            <div>
              <div className="kpi-label">{t("exp.sum.monthIncome")}</div>
              <div className="kpi-value">{fmtPKR(summary.monthIncome)}</div>
              <div className="kpi-sub">{t("exp.sum.monthIncomeSub")}</div>
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon amber"><IconCash /></div>
            <div>
              <div className="kpi-label">{t("exp.sum.todayExpenses")}</div>
              <div className="kpi-value">{fmtPKR(summary.todayExp)}</div>
              <div className="kpi-sub">{t("exp.sum.todayExpensesSub")}</div>
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon amber"><IconChart /></div>
            <div>
              <div className="kpi-label">{t("exp.sum.monthExpenses")}</div>
              <div className="kpi-value">{fmtPKR(summary.monthExp)}</div>
              <div className="kpi-sub">{t("exp.sum.monthExpensesSub")}</div>
            </div>
          </div>
        </div>

        <div
          className="card"
          style={{
            marginBottom: 24,
            borderColor:
              summary.monthNet >= 0 ? "rgba(21,128,61,0.45)" : "rgba(185,28,28,0.45)",
          }}
        >
          <div className="stat-inline" style={{ marginTop: 0, justifyContent: "space-between" }}>
            <div className="si">
              <span>{t("exp.sum.monthNet")}</span>
              <b
                style={{
                  fontSize: "1.8rem",
                  color: summary.monthNet >= 0 ? "var(--accent-text)" : "var(--danger)",
                }}
              >
                {fmtPKR(summary.monthNet)}
              </b>
            </div>
            <div className="si">
              <b>{fmtPKR(summary.monthIncome)}</b>
              <span>{t("exp.sum.monthIncomeShort")}</span>
            </div>
            <div className="si">
              <b>{fmtPKR(summary.monthExp)}</b>
              <span>{t("exp.sum.monthExpensesShort")}</span>
            </div>
          </div>
        </div>

        <div className="toolbar">
          <div>
            <h2 style={{ fontSize: "1.25rem" }}>{t("exp.register.title")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              {rows.length === 1
                ? t("exp.register.countOne", { count: rows.length })
                : t("exp.register.countMany", { count: rows.length })}
            </p>
          </div>
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <IconPlus /> {t("exp.add")}
          </button>
        </div>

        {(() => {
          const listTotal = rows.reduce((a, e) => a + e.amount, 0);
          const glTotal = (["expense_rent", "expense_electricity", "expense_salary", "expense_transport", "expense_other"] as const)
            .reduce((a, code) => a + accountNormalBalance(journal, code), 0);
          return (
            <section className="card" aria-label="Expense list total vs GL" style={{ marginBottom: 22 }}>
              <p style={{ margin: 0 }}>
                خرچ لسٹ کا مجموعہ: <b>{fmtPKR(listTotal)}</b> · GL اخراجات کا مجموعہ: <b>{fmtPKR(glTotal)}</b>
                {" · "}فرق: <b>{fmtPKR(Math.round(listTotal - glTotal))}</b>
                {Math.round(listTotal - glTotal) === 0 ? " (برابر ✓)" : " — نوٹ: لسٹ میں صرف دکھائے گئے اخراجات ہیں (فلٹر/تاریخ کے مطابق)، GL میں سب ہیں؛ فرق کی وجہ یہیں لکھی جائے۔"}
              </p>
            </section>
          );
        })()}
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("exp.th.date")}</th>
                <th>{t("exp.th.category")}</th>
                <th>{t("exp.th.note")}</th>
                <th>{t("exp.th.method")}</th>
                <th>{t("exp.th.amount")}</th>
                <th>{t("exp.th.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e, idx) => {
                // Fix 3: ONE date source — the expense's own PKT
                // business date (from its ts), the same date the
                // journal carries and the cash book shows. Grouping
                // by dayOffset while displaying ts put a 19-Oct row
                // under "Today" whenever the two drifted apart.
                const dateISO = businessDateISO(e.ts);
                const firstOfGroup =
                  idx === 0 || businessDateISO(rows[idx - 1].ts) !== dateISO;
                const groupLabel =
                  dateISO === todayPktISO()
                    ? t("common.today")
                    : dateISO === addDaysISO(todayPktISO(), -1)
                      ? t("common.yesterday")
                      : fmtDate(e.ts);
                return (
                  <React.Fragment key={e.id}>
                    {firstOfGroup && (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ background: "var(--card-2)", fontWeight: 700 }}
                        >
                          {groupLabel}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDate(e.ts)}</td>
                      <td>
                        <span className="badge amber">{t(CAT_LABEL[e.category])}</span>
                      </td>
                      <td>{e.note || "—"}</td>
                      <td style={{ textTransform: "capitalize" }}>
                        {e.instrument === "cheque" ? t("chq.payOption") : t(PAY_LABEL[e.method])}
                      </td>
                      <td>
                        <b>{fmtPKR(e.amount)}</b>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEdit(e)}
                            aria-label={t("exp.aria.edit")}
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => setConfirmDelete(e)}
                            aria-label={t("exp.aria.delete")}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">{t("exp.empty")}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="note-box">{t("exp.note.journal")}</div>

        {modalOpen && (
          <div
            className="modal-backdrop"
            onClick={() => setModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={editing ? t("exp.edit") : t("exp.add")}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{editing ? t("exp.edit") : t("exp.add")}</h2>
              <p className="modal-sub">
                {editing ? t("exp.editNote") : t("exp.form.addSub")}
              </p>
              <form className="form" onSubmit={submit}>
                {error && <div className="form-error">{error}</div>}
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="exp-category">{t("exp.field.category")}</label>
                    <select
                      id="exp-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    >
                      {EXPENSE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {t(CAT_LABEL[c])}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field" style={{ gridColumn: "1 / -1" }}>
                    <p className="hint" style={{ margin: 0 }}>
                      کیٹیگری → کھاتہ میپنگ: Rent {EXPENSE_ACCOUNT_LABEL.rent} میں جاتا ہے، کبھی متفرق (misc) میں نہیں — ہر کیٹیگری کا اپنا کھاتہ ہے۔
                      چنی ہوئی کیٹیگری کا کھاتہ: <b>{EXPENSE_ACCOUNT_LABEL[category]}</b>
                    </p>
                  </div>
                  <div className="field">
                    <label htmlFor="exp-amount">{t("exp.field.amount")}</label>
                    <input
                      id="exp-amount"
                      type="number"
                      min={0}
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={t("exp.amountPlaceholder")}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="exp-method">{t("exp.field.method")}</label>
                    <select
                      id="exp-method"
                      value={method}
                      disabled={editing?.instrument === "cheque"}
                      onChange={(e) => {
                        setMethod(e.target.value as UiMethod);
                        setAccountId("");
                      }}
                    >
                      {METHODS.map((m) => (
                        <option key={m} value={m}>
                          {t(PAY_LABEL[m])}
                        </option>
                      ))}
                      <option value="cheque">{t("chq.payOption")}</option>
                    </select>
                  </div>
                  <AccountPicker
                    method={method === "cheque" ? "bank" : method}
                    value={accountId}
                    onChange={setAccountId}
                    label={t("common.account")}
                  />
                  {method === "cheque" && !editing && (
                    <ChequeFields
                      idPrefix="exp-chq"
                      value={chequeForm}
                      onChange={setChequeForm}
                    />
                  )}
                  <div className="field">
                    <label htmlFor="exp-date">{t("exp.field.date")}</label>
                    <input
                      id="exp-date"
                      type="date"
                      value={dateStr}
                      max={todayISO()}
                      onChange={(e) => setDateStr(e.target.value)}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="exp-note">{t("exp.field.note")}</label>
                  <input
                    id="exp-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("exp.notePlaceholder")}
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setModalOpen(false)}
                  >
                    <IconClose /> {t("action.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editing ? t("exp.saveChanges") : t("exp.add")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {negWarn && (
          <NegativeBalanceWarning
            accountName={negWarn.accountName}
            amount={negWarn.amount}
            balanceAfter={negWarn.balanceAfter}
            onConfirm={() => {
              const proceed = negWarn.proceed;
              setNegWarn(null);
              proceed();
            }}
            onCancel={() => setNegWarn(null)}
          />
        )}

        {confirmDelete && (
          <div
            className="modal-backdrop"
            onClick={() => setConfirmDelete(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t("exp.delete.confirm")}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{t("exp.delete.title")}</h2>
              <p className="modal-sub">
                {t("exp.delete.body", {
                  category: t(CAT_LABEL[confirmDelete.category]),
                  amount: fmtPKR(confirmDelete.amount),
                })}
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setConfirmDelete(null)}
                >
                  {t("exp.delete.keep")}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    deleteExpense(confirmDelete.id);
                    setConfirmDelete(null);
                  }}
                >
                  <IconTrash /> {t("action.delete")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
