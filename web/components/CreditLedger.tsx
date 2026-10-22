"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import { can } from "@/lib/permissions";
import { IconCash, IconClose, IconPlus, IconSearch, SearchClear } from "./ui";
import { fmtDate, fmtPKR } from "@/lib/format";
import {
  creditKey,
  customerOutstanding,
  totalOutstandingCredit,
} from "@/lib/ledger";
import { creditGroupMatches } from "@/lib/search";
import { receiptVoucherData } from "@/lib/documents";
import { VoucherPrintSheet } from "./DocPrintSheet";
import type { I18nKey } from "@/lib/i18n";
import type { CreditEntry } from "@/lib/types";
import { AccountPicker } from "./MoneyAccounts";
import {
  ChequeFields,
  chequeDraftOf,
  emptyChequeForm,
  type ChequeFormState,
} from "./ChequeCapture";

/** B5: the picker's extra choice is the cheque INSTRUMENT (the
 *  store row's method rides as "bank"), never a sixth PayMethod. */
type PayMethodValue = "cash" | "jazzcash" | "easypaisa" | "bank" | "cheque";

const PAY_LABEL: Record<PayMethodValue, I18nKey> = {
  cash: "common.pay.cash",
  jazzcash: "common.pay.jazzcash",
  easypaisa: "common.pay.easypaisa",
  bank: "common.pay.bank",
  cheque: "chq.payOption",
};

interface Group {
  key: string;
  customerId: string | null;
  name: string;
  phone: string;
  entries: CreditEntry[];
  totalUdhaar: number;
  repaid: number;
  outstanding: number;
}

const WALKIN = "__walkin";

export default function CreditLedger() {
  const { ready, customers, credits, accounts, cheques, settings, addCredit, addRepayment } = useStore();
  const { role } = useAuth();
  /* A3: giving standalone udhaar is owner/manager; recording a
   * repayment is open to every role (separate matrix rows). */
  const canGive = can(role, "creditGive", "write");
  const canRepay = can(role, "creditRepayment", "write");
  /* Phase B · B6 (G-4): voucher prints follow the host surface —
   * the stamp adds no access of its own. */
  const canVoucher = can(role, "vouchers", "view");
  /** B6: the repayment row whose receipt voucher is printing. */
  const [printRow, setPrintRow] = useState<CreditEntry | null>(null);
  const printVoucher = (en: CreditEntry) => {
    setPrintRow(en);
    setTimeout(() => window.print(), 60);
  };
  const { t, lang } = useLang();

  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Give udhaar
  const [giveOpen, setGiveOpen] = useState(false);
  const [giveCustomerSel, setGiveCustomerSel] = useState<string>("");
  const [giveName, setGiveName] = useState("");
  const [givePhone, setGivePhone] = useState("");
  const [giveAmount, setGiveAmount] = useState("");
  const [giveNote, setGiveNote] = useState("");
  const [giveError, setGiveError] = useState("");

  // Repayment
  const [repayTarget, setRepayTarget] = useState<Group | null>(null);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayMethod, setRepayMethod] = useState<PayMethodValue>("cash");
  /** A2: money account the repayment settles into; "" = method default. */
  const [repayAccountId, setRepayAccountId] = useState("");
  const [repayCheque, setRepayCheque] = useState<ChequeFormState>(emptyChequeForm());
  const [repayNote, setRepayNote] = useState("");
  const [repayError, setRepayError] = useState("");

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, CreditEntry[]>();
    for (const c of credits) {
      const k = creditKey(c);
      const arr = map.get(k) ?? [];
      arr.push(c);
      map.set(k, arr);
    }
    const out: Group[] = [];
    for (const [key, entries] of map) {
      const sorted = [...entries].sort((a, b) => b.ts.localeCompare(a.ts));
      const latest = sorted[0];
      const directory = customers.find((cu) => cu.id === key);
      const totalUdhaar = entries
        .filter((e) => e.kind === "credit")
        .reduce((a, e) => a + e.amount, 0);
      const repaid = entries
        .filter((e) => e.kind === "repayment")
        .reduce((a, e) => a + e.amount, 0);
      out.push({
        key,
        customerId: directory ? directory.id : (latest?.customerId ?? null),
        name: directory?.name ?? latest?.customerName ?? t("credit.unknownCustomer"),
        phone: directory?.phone ?? latest?.customerPhone ?? "",
        entries: sorted,
        totalUdhaar,
        repaid,
        outstanding: customerOutstanding(credits, key),
      });
    }
    return out.sort((a, b) => b.outstanding - a.outstanding || a.name.localeCompare(b.name));
  }, [credits, customers, t]);

  const filtered = useMemo(() => {
    // lib/search: null-safe against groups with a missing phone.
    return groups.filter((g) => creditGroupMatches(g, search));
  }, [groups, search]);

  const summary = useMemo(() => {
    const totalOutstanding = totalOutstandingCredit(credits);
    const withBalance = groups.filter((g) => g.outstanding > 0).length;
    const receivedToday = credits
      .filter((c) => c.kind === "repayment" && c.dayOffset === 0)
      .reduce((a, c) => a + c.amount, 0);
    return { totalOutstanding, withBalance, receivedToday };
  }, [credits, groups]);

  /* ---------------- give udhaar ---------------- */

  const openGive = (preselect?: Group) => {
    setGiveError("");
    setGiveAmount("");
    setGiveNote("");
    setNotice(null);
    if (preselect) {
      if (preselect.customerId && customers.some((c) => c.id === preselect.customerId)) {
        setGiveCustomerSel(preselect.customerId);
        setGiveName("");
        setGivePhone("");
      } else {
        setGiveCustomerSel(WALKIN);
        setGiveName(preselect.name);
        setGivePhone(preselect.phone);
      }
    } else {
      setGiveCustomerSel(customers[0]?.id ?? WALKIN);
      setGiveName("");
      setGivePhone("");
    }
    setGiveOpen(true);
  };

  const onGiveCustomerChange = (value: string) => {
    setGiveCustomerSel(value);
    if (value === WALKIN) {
      // keep manual fields as-is for typing
      return;
    }
    setGiveName("");
    setGivePhone("");
  };

  const submitGive = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(giveAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setGiveError(t("credit.give.err.amount"));
      return;
    }
    let customerId: string | null = null;
    let customerName = "";
    let customerPhone = "";
    if (giveCustomerSel && giveCustomerSel !== WALKIN) {
      const cu = customers.find((c) => c.id === giveCustomerSel);
      if (!cu) {
        setGiveError(t("credit.give.err.customer"));
        return;
      }
      customerId = cu.id;
      customerName = cu.name;
      customerPhone = cu.phone;
    } else {
      if (!giveName.trim()) {
        setGiveError(t("credit.give.err.name"));
        return;
      }
      customerId = null;
      customerName = giveName.trim();
      customerPhone = givePhone.trim();
    }
    addCredit({
      customerId,
      customerName,
      customerPhone,
      amount,
      note: giveNote.trim(),
    });
    setGiveOpen(false);
    setNotice({
      ok: true,
      text: t("credit.notice.given", { amount: fmtPKR(amount), name: customerName }),
    });
  };

  /* ---------------- repayment ---------------- */

  const openRepay = (g: Group) => {
    setRepayTarget(g);
    setRepayAmount(g.outstanding > 0 ? String(g.outstanding) : "");
    setRepayMethod("cash");
    setRepayAccountId("");
    setRepayCheque(emptyChequeForm());
    setRepayNote("");
    setRepayError("");
    setNotice(null);
  };

  const submitRepay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayTarget) return;
    const amount = Number(repayAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setRepayError(t("credit.repay.err.amount"));
      return;
    }
    if (amount > repayTarget.outstanding) {
      setRepayError(
        t("credit.repay.err.exceeds", { amount: fmtPKR(repayTarget.outstanding) })
      );
      return;
    }
    // B5: a cheque repayment must carry its captured instrument.
    const draft = repayMethod === "cheque" ? chequeDraftOf(repayCheque) : null;
    if (repayMethod === "cheque" && !draft) {
      setRepayError(t("chq.err.capture"));
      return;
    }
    addRepayment({
      customerId: repayTarget.customerId,
      customerName: repayTarget.name,
      customerPhone: repayTarget.phone,
      amount,
      method: repayMethod === "cheque" ? "bank" : repayMethod,
      accountId: repayMethod === "cheque" ? null : repayAccountId || null,
      note: repayNote.trim(),
      ...(repayMethod === "cheque" && draft
        ? { instrument: "cheque" as const, cheque: draft }
        : {}),
    });
    setNotice({
      ok: true,
      text: t("credit.notice.repaid", { amount: fmtPKR(amount), name: repayTarget.name }),
    });
    setRepayTarget(null);
  };

  if (!ready) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  const giveSelectedCustomer =
    giveCustomerSel && giveCustomerSel !== WALKIN
      ? customers.find((c) => c.id === giveCustomerSel) ?? null
      : null;

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("credit.eyebrow")}</span>
          <h1 className="h2">{t("credit.title")}</h1>
          <p className="lead">{t("credit.subtitle")}</p>
        </div>

        <div className="grid-3" style={{ marginBottom: 24 }}>
          <div className="card kpi">
            <div className="kpi-icon amber">
              <IconCash />
            </div>
            <div>
              <div className="kpi-label">{t("credit.sum.totalOutstanding")}</div>
              <div className="kpi-value">{fmtPKR(summary.totalOutstanding)}</div>
              <div className="kpi-sub">{t("credit.sum.totalOutstandingSub")}</div>
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon brown">
              <IconCash />
            </div>
            <div>
              <div className="kpi-label">{t("credit.sum.withBalance")}</div>
              <div className="kpi-value">{summary.withBalance}</div>
              <div className="kpi-sub">{t("credit.sum.withBalanceSub")}</div>
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon green">
              <IconCash />
            </div>
            <div>
              <div className="kpi-label">{t("credit.sum.receivedToday")}</div>
              <div className="kpi-value">{fmtPKR(summary.receivedToday)}</div>
              <div className="kpi-sub">{t("credit.sum.receivedTodaySub")}</div>
            </div>
          </div>
        </div>

        {notice && (
          <div
            className={notice.ok ? "note-box" : "form-error"}
            style={notice.ok ? { marginTop: 0, marginBottom: 22 } : { marginBottom: 22 }}
            role="status"
          >
            {notice.text}
          </div>
        )}

        <div className="toolbar">
          <div className="search-box">
            <IconSearch />
            <input
              type="search"
              placeholder={t("credit.search.placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("credit.search.aria")}
            />
            {search && (
              <SearchClear
                onClear={() => setSearch("")}
                label={t("action.clearSearch")}
              />
            )}
          </div>
          {canGive && (
            <button type="button" className="btn btn-primary" onClick={() => openGive()}>
              <IconPlus /> {t("credit.give")}
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("credit.th.customer")}</th>
                <th>{t("credit.th.totalUdhaar")}</th>
                <th>{t("credit.th.repaid")}</th>
                <th>{t("credit.th.outstanding")}</th>
                <th>{t("credit.th.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const expanded = expandedKey === g.key;
                return (
                  <React.Fragment key={g.key}>
                    <tr>
                      <td>
                        <b>{g.name}</b>
                        {g.phone && (
                          <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{g.phone}</div>
                        )}
                        {!g.customerId && (
                          <div style={{ fontSize: "0.78rem", color: "var(--muted-2)" }}>
                            {t("credit.walkin")}
                          </div>
                        )}
                      </td>
                      <td>{fmtPKR(g.totalUdhaar)}</td>
                      <td>{fmtPKR(g.repaid)}</td>
                      <td>
                        {g.outstanding > 0 ? (
                          <span className="badge red">
                            {t("credit.badge.due", { amount: fmtPKR(g.outstanding) })}
                          </span>
                        ) : g.outstanding < 0 ? (
                          <span className="badge amber">
                            {t("credit.badge.advance", { amount: fmtPKR(Math.abs(g.outstanding)) })}
                          </span>
                        ) : (
                          <span className="badge green">{t("credit.badge.clear")}</span>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          {canGive && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => openGive(g)}
                            >
                              {t("credit.give")}
                            </button>
                          )}
                          {canRepay && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => openRepay(g)}
                            >
                              {t("credit.repay")}
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setExpandedKey(expanded ? null : g.key)}
                            aria-expanded={expanded}
                          >
                            {expanded ? t("credit.hideHistory") : t("credit.history")}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr>
                        <td colSpan={5} style={{ background: "var(--card-2)" }}>
                          <div style={{ padding: "6px 2px" }}>
                            <b style={{ fontSize: "0.9rem" }}>
                              {t("credit.khataOf", { name: g.name })}
                            </b>
                            <div className="table-wrap" style={{ marginTop: 10, boxShadow: "none" }}>
                              <table className="data" style={{ minWidth: 0 }}>
                                <thead>
                                  <tr>
                                    <th>{t("credit.th.date")}</th>
                                    <th>{t("credit.th.kind")}</th>
                                    <th>{t("credit.th.amount")}</th>
                                    <th>{t("credit.th.note")}</th>
                                    <th>{t("credit.th.bill")}</th>
                                    <th></th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {g.entries.map((en) => (
                                    <tr key={en.id}>
                                      <td style={{ whiteSpace: "nowrap" }}>
                                        {fmtDate(en.ts)}
                                      </td>
                                      <td>
                                        {en.kind === "credit" ? (
                                          <span className="badge red">{t("credit.given")}</span>
                                        ) : (
                                          <span className="badge green">
                                            {t("credit.repayment")}
                                            {en.instrument === "cheque"
                                              ? ` · ${t("chq.payOption")}`
                                              : en.method
                                                ? ` · ${t(PAY_LABEL[en.method])}`
                                                : ""}
                                          </span>
                                        )}
                                        {en.kind === "repayment" && (
                                          <div style={{ fontSize: "0.78rem", color: "var(--muted-2)", marginTop: 3 }}>
                                            {en.voucherNo ?? "—"}
                                          </div>
                                        )}
                                      </td>
                                      <td>
                                        <b>
                                          {en.kind === "credit" ? "+ " : "− "}
                                          {fmtPKR(en.amount)}
                                        </b>
                                      </td>
                                      <td>{en.note || "—"}</td>
                                      <td>
                                        {en.billId ? (
                                          <Link
                                            href="/sales"
                                            style={{ color: "var(--accent-text)", fontWeight: 700 }}
                                          >
                                            {t("credit.viewBill")}
                                          </Link>
                                        ) : (
                                          "—"
                                        )}
                                      </td>
                                      <td style={{ whiteSpace: "nowrap" }}>
                                        {en.kind === "repayment" && canVoucher && (
                                          <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => printVoucher(en)}
                                          >
                                            {t("action.print")}
                                          </button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">
                      {credits.length === 0
                        ? t("credit.empty.none")
                        : t("credit.empty.search")}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="note-box">{t("credit.note.appendOnly")}</div>

        {/* ---------- Give udhaar ---------- */}
        {giveOpen && (
          <div
            className="modal-backdrop"
            onClick={() => setGiveOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={t("credit.give")}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{t("credit.give")}</h2>
              <p className="modal-sub">{t("credit.give.sub")}</p>
              <form className="form" onSubmit={submitGive}>
                {giveError && <div className="form-error">{giveError}</div>}
                <div className="field">
                  <label htmlFor="cr-customer">{t("credit.field.customer")}</label>
                  <select
                    id="cr-customer"
                    value={giveCustomerSel}
                    onChange={(e) => onGiveCustomerChange(e.target.value)}
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.phone ? ` — ${c.phone}` : ""}
                      </option>
                    ))}
                    <option value={WALKIN}>{t("credit.walkin")}</option>
                  </select>
                  {giveSelectedCustomer && (
                    <div className="hint">
                      {giveSelectedCustomer.name}
                      {giveSelectedCustomer.phone ? ` · ${giveSelectedCustomer.phone}` : ""}
                      {" · "}{t("credit.field.outstanding")}: {fmtPKR(customerOutstanding(credits, giveSelectedCustomer.id))}
                    </div>
                  )}
                </div>
                {giveCustomerSel === WALKIN && (
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="cr-name">{t("credit.field.name")}</label>
                      <input
                        id="cr-name"
                        value={giveName}
                        onChange={(e) => setGiveName(e.target.value)}
                        placeholder={t("credit.give.namePlaceholder")}
                        required
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="cr-phone">{t("credit.field.phone")}</label>
                      <input
                        id="cr-phone"
                        value={givePhone}
                        onChange={(e) => setGivePhone(e.target.value)}
                        placeholder={t("credit.give.phonePlaceholder")}
                      />
                    </div>
                  </div>
                )}
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="cr-amount">{t("credit.field.amount")}</label>
                    <input
                      id="cr-amount"
                      type="number"
                      min={0}
                      step="any"
                      value={giveAmount}
                      onChange={(e) => setGiveAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="cr-note">{t("credit.field.note")}</label>
                    <input
                      id="cr-note"
                      value={giveNote}
                      onChange={(e) => setGiveNote(e.target.value)}
                      placeholder={t("credit.give.notePlaceholder")}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setGiveOpen(false)}>
                    <IconClose /> {t("action.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <IconPlus /> {t("credit.give")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------- Repayment ---------- */}
        {repayTarget && (
          <div
            className="modal-backdrop"
            onClick={() => setRepayTarget(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t("credit.repay.title")}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{t("credit.repay.title")}</h2>
              <p className="modal-sub">
                {t("credit.repay.from", { name: repayTarget.name })}
                {repayTarget.phone ? ` — ${repayTarget.phone}` : ""}. {t("credit.field.outstanding")}:{" "}
                <b>{fmtPKR(repayTarget.outstanding)}</b>.
              </p>
              <form className="form" onSubmit={submitRepay}>
                {repayError && <div className="form-error">{repayError}</div>}
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="rp-amount">{t("credit.field.amount")}</label>
                    <input
                      id="rp-amount"
                      type="number"
                      min={0}
                      step="any"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      required
                    />
                    <div className="hint">
                      {t("credit.repay.maxHint", { amount: fmtPKR(repayTarget.outstanding) })}
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="rp-method">{t("credit.field.method")}</label>
                    <select
                      id="rp-method"
                      value={repayMethod}
                      onChange={(e) => {
                        setRepayMethod(e.target.value as PayMethodValue);
                        setRepayAccountId("");
                      }}
                    >
                      <option value="cash">{t("common.pay.cash")}</option>
                      <option value="jazzcash">{t("common.pay.jazzcash")}</option>
                      <option value="easypaisa">{t("common.pay.easypaisa")}</option>
                      <option value="bank">{t("common.pay.bank")}</option>
                      <option value="cheque">{t("chq.payOption")}</option>
                    </select>
                  </div>
                  {repayMethod !== "cheque" && (
                    <AccountPicker
                      method={repayMethod}
                      value={repayAccountId}
                      onChange={setRepayAccountId}
                      label={t("common.account")}
                    />
                  )}
                  {repayMethod === "cheque" && (
                    <ChequeFields
                      idPrefix="rp-chq"
                      value={repayCheque}
                      onChange={setRepayCheque}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="rp-note">{t("credit.field.note")}</label>
                  <input
                    id="rp-note"
                    value={repayNote}
                    onChange={(e) => setRepayNote(e.target.value)}
                    placeholder={t("credit.repay.notePlaceholder")}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setRepayTarget(null)}>
                    <IconClose /> {t("action.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <IconCash /> {t("credit.repay.title")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* B6: the receipt voucher — the repayment row itself,
            printed (§5.2). Balance-after is the customer's CURRENT
            derived outstanding, as the design prescribes. */}
        {printRow && (
          <VoucherPrintSheet
            data={receiptVoucherData(printRow, {
              accountName: printRow.accountId
                ? (accounts.find((a) => a.id === printRow.accountId)?.name ?? null)
                : null,
              cheque: printRow.chequeId
                ? (cheques.find((c) => c.id === printRow.chequeId) ?? null)
                : null,
              balanceAfter: customerOutstanding(credits, creditKey(printRow)),
            })}
            settings={settings}
          />
        )}
      </div>
    </div>
  );
}
