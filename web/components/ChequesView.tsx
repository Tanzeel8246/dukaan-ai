"use client";

/**
 * Phase B · B5 — the Cheque Registry workspace (design §4.4).
 *
 * A registry surface, not a posting surface: every cheque arrives
 * here inside a host payment (bill, udhaar repayment, supplier
 * payment, expense) and this view runs its lifecycle — deposit
 * (custody only, no journal), clear, bounce, return — through
 * the store's guarded actions. The §4.4 views (drawer / at bank /
 * issued-pending / due / terminal) are DERIVED from the
 * collection + today on every render; nothing is a stored
 * counter. The summary strip shows the registry totals beside
 * the ledger's own cheque balances — the design's identity,
 * Σ uncleared registry == GL cheques_in_hand, visible at a
 * glance (and asserted in the harness).
 *
 * RBAC: the `cheques` matrix row (owner/manager/accountant full,
 * cashier none) — a cashier never reaches this page; the
 * cashier's capture at the billing desk is its own matrix row.
 */
import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import PermDenied from "./PermDenied";
import { AccountPicker } from "./MoneyAccounts";
import { todayISO } from "./ChequeCapture";
import { useLang } from "./LangProvider";
import { IconClose, IconSearch, SearchClear } from "./ui";
import { fmtDate, fmtPKR } from "@/lib/format";
import { can } from "@/lib/permissions";
import { matchesAny } from "@/lib/search";
import { accountNormalBalance } from "@/lib/ledger";
import {
  canChequeTransition,
  chequeIsOverdue,
  chequesAtBank,
  chequesDue,
  chequesInDrawer,
  pendingOutCheques,
  pendingOutTotal,
  unclearedInTotal,
  type ChequeAction,
} from "@/lib/cheques";
import type { I18nKey } from "@/lib/i18n";
import type { Cheque } from "@/lib/types";

const STATUS_KEY: Record<Cheque["status"], I18nKey> = {
  received: "chq.status.received",
  deposited: "chq.status.deposited",
  issued: "chq.status.issued",
  cleared: "chq.status.cleared",
  bounced: "chq.status.bounced",
  returned: "chq.status.returned",
};

const STATUS_BADGE: Record<Cheque["status"], string> = {
  received: "badge",
  deposited: "badge amber",
  issued: "badge",
  cleared: "badge green",
  bounced: "badge red",
  returned: "badge",
};

type View = "all" | "drawer" | "atBank" | "issued" | "due" | "cleared" | "bounced" | "returned";

const VIEWS: Array<{ id: View; key: I18nKey }> = [
  { id: "all", key: "chq.view.all" },
  { id: "drawer", key: "chq.view.drawer" },
  { id: "atBank", key: "chq.view.atBank" },
  { id: "issued", key: "chq.view.issued" },
  { id: "due", key: "chq.view.due" },
  { id: "cleared", key: "chq.view.cleared" },
  { id: "bounced", key: "chq.view.bounced" },
  { id: "returned", key: "chq.view.returned" },
];

export default function ChequesView() {
  const {
    ready,
    cheques,
    bills,
    journal,
    depositCheque,
    clearCheque,
    bounceCheque,
    returnCheque,
  } = useStore();
  const { role } = useAuth();
  const { t } = useLang();

  const [view, setView] = useState<View>("all");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [act, setAct] = useState<{ cheque: Cheque; action: ChequeAction } | null>(null);
  const [depAccount, setDepAccount] = useState("");
  const [charges, setCharges] = useState("");

  const today = todayISO();
  const canWrite = can(role, "cheques", "write");

  const drawer = useMemo(() => chequesInDrawer(cheques), [cheques]);
  const atBank = useMemo(() => chequesAtBank(cheques), [cheques]);
  const pendingOut = useMemo(() => pendingOutCheques(cheques), [cheques]);
  const glInHand = useMemo(
    () => accountNormalBalance(journal, "cheques_in_hand"),
    [journal]
  );
  const glIssued = useMemo(
    () => accountNormalBalance(journal, "cheques_issued"),
    [journal]
  );

  const rows = useMemo(() => {
    let base: Cheque[];
    switch (view) {
      case "drawer":
        base = drawer;
        break;
      case "atBank":
        base = atBank;
        break;
      case "issued":
        base = pendingOut;
        break;
      case "due":
        base = chequesDue(cheques, today);
        break;
      case "cleared":
        base = cheques.filter((c) => c.status === "cleared");
        break;
      case "bounced":
        base = cheques.filter((c) => c.status === "bounced");
        break;
      case "returned":
        base = cheques.filter((c) => c.status === "returned");
        break;
      default:
        base = cheques;
    }
    const q = query;
    return [...base]
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .filter((c) => matchesAny(q, [c.chequeNo, c.bankName, c.partyName]));
  }, [cheques, view, query, drawer, atBank, pendingOut, today]);

  if (!can(role, "cheques", "view")) return <PermDenied />;
  if (!ready) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  const sourceLabel = (c: Cheque): string => {
    if (c.sourceType === "bill") {
      const b = bills.find((x) => x.id === c.sourceId);
      return t("chq.src.bill", { no: b ? b.billNo : "—" });
    }
    if (c.sourceType === "repayment") return t("chq.src.repayment");
    if (c.sourceType === "supplier_payment") return t("chq.src.supplierPayment");
    return t("chq.src.expense");
  };

  const openAct = (cheque: Cheque, action: ChequeAction) => {
    setAct({ cheque, action });
    setDepAccount("");
    setCharges("");
    setNotice(null);
  };

  const confirmAct = () => {
    if (!act) return;
    const { cheque, action } = act;
    let ok = false;
    if (action === "deposit") ok = depositCheque(cheque.id, depAccount || null);
    else if (action === "clear") ok = clearCheque(cheque.id);
    else if (action === "bounce")
      ok = bounceCheque(cheque.id, Math.max(0, Number(charges) || 0));
    else ok = returnCheque(cheque.id);
    setAct(null);
    setNotice({
      ok,
      text: ok
        ? t(
            action === "deposit"
              ? "chq.notice.deposited"
              : action === "clear"
                ? "chq.notice.cleared"
                : action === "bounce"
                  ? "chq.notice.bounced"
                  : "chq.notice.returned"
          )
        : t("chq.notice.failed"),
    });
  };

  const actionsFor = (c: Cheque): ChequeAction[] =>
    (["deposit", "clear", "bounce", "return"] as ChequeAction[]).filter((a) =>
      canChequeTransition(c, a)
    );

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("nav.cheques")}</span>
          <h1 className="h2">{t("chq.title")}</h1>
          <p className="lead">{t("chq.subtitle")}</p>
          {/* MC Billing workflow adoption 2026-10-27 (WEB, plan §15):
              status flow — pending (received/issued) → deposited →
              cleared (money lands) or bounced (everything reverses
              through the choke point). Invalid transitions write
              nothing (lib/cheques.canChequeTransition). */}
          <div className="note-box" style={{ marginTop: 12 }}>
            چیک کی حیثیت کا فلو: pending → deposited → cleared (رقم پہنچی) یا bounced (سب کچھ reversing انٹری سے واپس)۔ غلط حیثیت تبدیلی کچھ نہیں لکھتی۔
          </div>
        </div>

        {notice && (
          <div
            className={notice.ok ? "notice ok" : "notice err"}
            role="status"
            style={{ marginBottom: 16 }}
          >
            {notice.text}
          </div>
        )}

        {/* Registry totals beside the ledger's own balances — the
            §4.3 identity, visible: uncleared registry == GL. */}
        <div className="grid-3" style={{ marginBottom: 20 }}>
          <div className="card kpi">
            <div>
              <div className="kpi-label">{t("chq.sum.drawer")}</div>
              <div className="kpi-value">{fmtPKR(drawer.reduce((a, c) => a + c.amount, 0))}</div>
              <div className="kpi-sub">
                {t("fin.chq.ledger")} {t("fin.acct.cheques_in_hand")}: {fmtPKR(glInHand)} ·{" "}
                {t("fin.chq.registry")}: {fmtPKR(unclearedInTotal(cheques))}
              </div>
            </div>
          </div>
          <div className="card kpi">
            <div>
              <div className="kpi-label">{t("chq.sum.atBank")}</div>
              <div className="kpi-value">{fmtPKR(atBank.reduce((a, c) => a + c.amount, 0))}</div>
              <div className="kpi-sub">{atBank.length}</div>
            </div>
          </div>
          <div className="card kpi">
            <div>
              <div className="kpi-label">{t("chq.sum.pendingOut")}</div>
              <div className="kpi-value">{fmtPKR(pendingOutTotal(cheques))}</div>
              <div className="kpi-sub">
                {t("fin.chq.ledger")} {t("fin.acct.cheques_issued")}: {fmtPKR(glIssued)} ·{" "}
                {t("fin.chq.registry")}: {fmtPKR(pendingOutTotal(cheques))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="sticky-bar"
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                className={view === v.id ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                onClick={() => setView(v.id)}
              >
                {t(v.key)}
              </button>
            ))}
          </div>
          <div className="search-box" style={{ marginInlineStart: "auto" }}>
            <IconSearch />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("chq.searchPh")}
              aria-label={t("chq.searchPh")}
            />
            {query && (
              <SearchClear
                onClear={() => setQuery("")}
                label={t("action.clearSearch")}
              />
            )}
          </div>
        </div>

        {cheques.length === 0 ? (
          <div className="empty">{t("chq.empty")}</div>
        ) : rows.length === 0 ? (
          <div className="empty">{t("chq.emptyFilter")}</div>
        ) : (
          <div className="table-wrap card" style={{ padding: 0 }}>
            <table className="data">
              <thead>
                <tr>
                  <th>{t("chq.col.cheque")}</th>
                  <th>{t("chq.col.party")}</th>
                  <th>{t("chq.col.source")}</th>
                  <th>{t("chq.col.dates")}</th>
                  <th>{t("chq.col.status")}</th>
                  <th style={{ textAlign: "end" }}>{t("chq.col.amount")}</th>
                  {canWrite && <th>{t("chq.col.actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const overdue = chequeIsOverdue(c, today);
                  const acts = canWrite ? actionsFor(c) : [];
                  return (
                    <tr key={c.id}>
                      <td>
                        <b>{c.chequeNo}</b>
                        <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                          {c.bankName} · {t(c.direction === "in" ? "chq.dir.in" : "chq.dir.out")}
                        </div>
                      </td>
                      <td>{c.partyName}</td>
                      <td>{sourceLabel(c)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {fmtDate(c.issueDateISO)}
                        <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                          {t("chq.dueOn", { date: fmtDate(c.dueDateISO) })}
                          {overdue && (
                            <>
                              {" · "}
                              <span style={{ color: "var(--danger)" }}>{t("chq.overdue")}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={STATUS_BADGE[c.status]}>{t(STATUS_KEY[c.status])}</span>
                      </td>
                      <td style={{ textAlign: "end", whiteSpace: "nowrap" }}>
                        <b>{fmtPKR(c.amount)}</b>
                      </td>
                      {canWrite && (
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {acts.map((a) => (
                              <button
                                key={a}
                                type="button"
                                className={a === "bounce" ? "btn btn-ghost btn-sm danger" : "btn btn-ghost btn-sm"}
                                onClick={() => openAct(c, a)}
                              >
                                {t(
                                  a === "deposit"
                                    ? "chq.action.deposit"
                                    : a === "clear"
                                      ? "chq.action.clear"
                                      : a === "bounce"
                                        ? "chq.action.bounce"
                                        : "chq.action.return"
                                )}
                              </button>
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ------- lifecycle action modal ------- */}
        {act && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal">
              <div className="modal-head">
                <h3>
                  {t(
                    act.action === "deposit"
                      ? "chq.deposit.title"
                      : act.action === "clear"
                        ? "chq.clear.title"
                        : act.action === "bounce"
                          ? "chq.bounce.title"
                          : "chq.return.title"
                  )}
                </h3>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setAct(null)}
                  aria-label={t("action.close")}
                >
                  <IconClose />
                </button>
              </div>
              <p style={{ color: "var(--muted)", marginBottom: 16 }}>
                <b>{act.cheque.chequeNo}</b> · {act.cheque.bankName} ·{" "}
                {fmtPKR(act.cheque.amount)} · {act.cheque.partyName}
              </p>
              <p style={{ color: "var(--muted)", marginBottom: 16 }}>
                {t(
                  act.action === "deposit"
                    ? "chq.deposit.hint"
                    : act.action === "clear"
                      ? act.cheque.direction === "in"
                        ? "chq.clear.hintIn"
                        : "chq.clear.hintOut"
                      : act.action === "bounce"
                        ? act.cheque.direction === "in"
                          ? "chq.bounce.hintIn"
                          : "chq.bounce.hintOut"
                        : "chq.return.hint"
                )}
              </p>
              {act.action === "deposit" && (
                <div className="form" style={{ marginBottom: 16 }}>
                  <AccountPicker
                    method="bank"
                    value={depAccount}
                    onChange={setDepAccount}
                    label={t("chq.deposit.account")}
                  />
                </div>
              )}
              {act.action === "bounce" && act.cheque.direction === "in" && (
                <div className="form" style={{ marginBottom: 16 }}>
                  <div className="field">
                    <label htmlFor="chq-charges">{t("chq.bounce.charges")}</label>
                    <input
                      id="chq-charges"
                      type="number"
                      min={0}
                      step="any"
                      value={charges}
                      onChange={(e) => setCharges(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setAct(null)}>
                  <IconClose /> {t("action.cancel")}
                </button>
                <button type="button" className="btn btn-primary" onClick={confirmAct}>
                  {t(
                    act.action === "deposit"
                      ? "chq.action.deposit"
                      : act.action === "clear"
                        ? "chq.action.clear"
                        : act.action === "bounce"
                          ? "chq.action.bounce"
                          : "chq.action.return"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
