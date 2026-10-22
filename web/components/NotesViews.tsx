"use client";

/**
 * Phase B · B4 — the Credit & Debit Notes workspace (design §3).
 *
 * A note is the formal paper over a return posting: it is minted
 * inside the return's own batch by the store and is NEVER edited
 * or re-posted here — this surface lists, inspects and prints
 * notes, and hosts the FORMAL return flow that issues credit
 * notes (for roles whose matrix row is `creditDebitNotes`: the
 * billing desk's plain return flow stays as it was). Debit notes
 * are issued from the Suppliers desk, where the purchase lives.
 */
import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import PermDenied from "./PermDenied";
import { AccountPicker } from "./MoneyAccounts";
import { NotePrintSheet } from "./DocPrintSheet";
import { useLang } from "./LangProvider";
import type { I18nKey } from "@/lib/i18n";
import { IconPlus, IconReceipt, IconSearch, SearchClear } from "./ui";
import { fmtDate, fmtPKR } from "@/lib/format";
import { can } from "@/lib/permissions";
import { matchesAny } from "@/lib/search";
import type { Bill, DocNote, PayMethod } from "@/lib/types";

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

const REFUND_METHODS: Array<Exclude<PayMethod, "credit">> = [
  "cash",
  "jazzcash",
  "easypaisa",
  "bank",
];

const PAY_KEY: Record<Exclude<PayMethod, "credit">, I18nKey> = {
  cash: "common.pay.cash",
  jazzcash: "common.pay.jazzcash",
  easypaisa: "common.pay.easypaisa",
  bank: "common.pay.bank",
};

const SETTLE_KEY: Record<DocNote["settlement"], I18nKey> = {
  cash_refund: "note.settle.cash_refund",
  credit_reduction: "note.settle.credit_reduction",
  payable_offset: "note.settle.payable_offset",
};

function Notice({ notice }: { notice: { ok: boolean; text: string } | null }) {
  if (!notice) return null;
  return (
    <div
      className={notice.ok ? "notice ok" : "notice err"}
      role="status"
      style={{ marginBottom: 16 }}
    >
      {notice.text}
    </div>
  );
}

export function NotesManager() {
  const store = useStore();
  const {
    ready,
    notes,
    returns,
    purchaseReturns,
    purchases,
    bills,
    settings,
    returnItemsWithNote,
  } = store;
  const { role } = useAuth();
  const { t } = useLang();
  const canWrite = can(role, "creditDebitNotes", "write");

  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "credit" | "debit">("all");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [printNote, setPrintNote] = useState<DocNote | null>(null);

  /* ---- issue-credit-note (formal return) state ---- */
  const [issueOpen, setIssueOpen] = useState(false);
  const [issueBillId, setIssueBillId] = useState("");
  const [issueQty, setIssueQty] = useState<Record<string, string>>({});
  const [issueMethod, setIssueMethod] =
    useState<Exclude<PayMethod, "credit">>("cash");
  const [issueAccountId, setIssueAccountId] = useState("");
  const [issueReason, setIssueReason] = useState("");

  const returnableBills = useMemo(
    () =>
      bills.filter(
        (b) =>
          (b.status === "paid" || b.status === "partially_returned") &&
          b.items.some((it) => it.qty - (b.returnedQty?.[it.productId] ?? 0) > 0)
      ),
    [bills]
  );
  const issueBill: Bill | null = useMemo(
    () => returnableBills.find((b) => b.id === issueBillId) ?? null,
    [returnableBills, issueBillId]
  );

  if (!ready) return null;
  if (!can(role, "creditDebitNotes", "view")) return <PermDenied />;

  const filtered = notes
    .filter((n) => kindFilter === "all" || n.kind === kindFilter)
    .filter((n) => matchesAny(query, [n.number, n.partyName, n.billNo]))
    .sort((a, b) => b.ts.localeCompare(a.ts));

  const selected = notes.find((n) => n.id === selectedId) ?? null;
  const sourceReturnFor = (n: DocNote) =>
    n.kind === "credit"
      ? (returns.find((r) => r.id === n.returnId) ?? null)
      : (purchaseReturns.find((r) => r.id === n.returnId) ?? null);
  const purchaseTsFor = (n: DocNote) =>
    n.purchaseId ? (purchases.find((p) => p.id === n.purchaseId)?.ts ?? null) : null;

  const print = (n: DocNote) => {
    setPrintNote(n);
    setTimeout(() => window.print(), 60);
  };

  const openIssue = () => {
    setIssueBillId("");
    setIssueQty({});
    setIssueMethod("cash");
    setIssueAccountId("");
    setIssueReason("");
    setIssueOpen(true);
    setNotice(null);
  };

  const submitIssue = () => {
    if (!issueBill) return;
    const lines = issueBill.items
      .map((it) => ({
        productId: it.productId,
        qty: Math.max(0, parseFloat(issueQty[it.productId] ?? "") || 0),
      }))
      .filter((l) => l.qty > 0);
    if (lines.length === 0) {
      setNotice({ ok: false, text: t("billing.errReturnNone") });
      return;
    }
    for (const l of lines) {
      const it = issueBill.items.find((x) => x.productId === l.productId);
      if (!it) continue;
      const max = it.qty - (issueBill.returnedQty?.[it.productId] ?? 0);
      if (l.qty > max) {
        setNotice({
          ok: false,
          text: t("billing.errReturnMax", { qty: fmtQty(max), name: it.name }),
        });
        return;
      }
    }
    const box: { note: DocNote | null } = { note: null };
    const ok = returnItemsWithNote(
      issueBill.id,
      lines,
      issueMethod,
      issueAccountId || null,
      issueReason,
      (note) => {
        box.note = note;
      }
    );
    if (!ok || !box.note) {
      setNotice({ ok: false, text: t("note.issue.failed") });
      return;
    }
    const note: DocNote = box.note;
    setIssueOpen(false);
    setSelectedId(note.id);
    setNotice({
      ok: true,
      text: t("note.issue.success", { number: note.number, no: issueBill.billNo }),
    });
  };

  return (
    <div className="section">
      <div className="container">
        <div className="section-head" style={{ textAlign: "start", marginBottom: 8 }}>
          <span className="eyebrow">{t("nav.notes")}</span>
          <h2 style={{ fontSize: "1.9rem" }}>{t("note.title")}</h2>
          <p style={{ marginInlineStart: 0 }}>{t("note.subtitle")}</p>
        </div>

        <div
          className="sticky-bar"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div className="search-box" style={{ flex: "1 1 260px" }}>
            <IconSearch />
            <input
              type="search"
              placeholder={t("note.searchPh")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("note.searchPh")}
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
                ["all", "note.filter.all"],
                ["credit", "note.filter.credit"],
                ["debit", "note.filter.debit"],
              ] as const
            ).map(([k, key]) => (
              <button
                key={k}
                type="button"
                className={kindFilter === k ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                onClick={() => setKindFilter(k)}
              >
                {t(key)}
              </button>
            ))}
          </div>
          {canWrite && (
            <button type="button" className="btn btn-primary" onClick={openIssue}>
              <IconPlus /> {t("note.issue.title")}
            </button>
          )}
        </div>

        <Notice notice={notice} />

        {issueOpen && (
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: 6 }}>{t("note.issue.title")}</h3>
            <p style={{ color: "var(--muted)", marginBottom: 14 }}>{t("note.issue.sub")}</p>
            {returnableBills.length === 0 ? (
              <div className="empty" style={{ padding: "20px" }}>
                {t("note.issue.noBills")}
              </div>
            ) : (
              <>
                <div className="field" style={{ maxWidth: 420, marginBottom: 14 }}>
                  <label>{t("note.issue.bill")}</label>
                  <select
                    value={issueBillId}
                    onChange={(e) => {
                      setIssueBillId(e.target.value);
                      setIssueQty({});
                    }}
                  >
                    <option value="">{t("note.issue.selectBill")}</option>
                    {returnableBills.map((b) => (
                      <option key={b.id} value={b.id}>
                        #{b.billNo} · {b.customerName || t("billing.walkIn")} ·{" "}
                        {fmtPKR(b.total)} · {fmtDate(b.ts)}
                      </option>
                    ))}
                  </select>
                </div>

                {issueBill && (
                  <>
                    <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                      {issueBill.items.map((it) => {
                        const already = issueBill.returnedQty?.[it.productId] ?? 0;
                        const max = it.qty - already;
                        return (
                          <div
                            key={it.productId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ flex: "1 1 150px" }}>
                              <b style={{ fontSize: "0.92rem" }}>{it.name}</b>
                              <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                                {t("note.issue.left", { qty: fmtQty(max) })}
                              </div>
                            </div>
                            <div className="field" style={{ flex: "0 0 130px" }}>
                              <input
                                type="number"
                                min={0}
                                max={max}
                                step="any"
                                disabled={max <= 0}
                                value={issueQty[it.productId] ?? ""}
                                onChange={(e) => setIssueQty((s) => ({ ...s, [it.productId]: e.target.value }))}
                                placeholder="0"
                                aria-label={t("note.issue.returnQty")}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "end",
                        marginBottom: 14,
                      }}
                    >
                      <div className="field" style={{ flex: "0 0 180px" }}>
                        <label>{t("note.issue.method")}</label>
                        <select
                          value={issueMethod}
                          onChange={(e) => {
                            setIssueMethod(e.target.value as Exclude<PayMethod, "credit">);
                            setIssueAccountId("");
                          }}
                        >
                          {REFUND_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {t(PAY_KEY[m])}
                            </option>
                          ))}
                        </select>
                      </div>
                      <AccountPicker
                        method={issueMethod}
                        value={issueAccountId}
                        onChange={setIssueAccountId}
                        label={t("note.issue.account")}
                      />
                      <div className="field" style={{ flex: "1 1 220px" }}>
                        <label>{t("note.reason")}</label>
                        <input
                          type="text"
                          value={issueReason}
                          onChange={(e) => setIssueReason(e.target.value)}
                          placeholder={t("note.issue.reasonPh")}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button type="button" className="btn btn-primary" onClick={submitIssue}>
                        <IconReceipt /> {t("note.issue.submit")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => setIssueOpen(false)}
                      >
                        {t("action.cancel")}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="empty">{t("note.empty")}</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("note.col.number")}</th>
                  <th>{t("common.date")}</th>
                  <th>{t("note.col.kind")}</th>
                  <th>{t("note.col.party")}</th>
                  <th>{t("note.col.against")}</th>
                  <th>{t("note.col.goods")}</th>
                  <th>{t("note.col.tax")}</th>
                  <th>{t("doc.total")}</th>
                  <th>{t("note.settlement")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <b>{n.number}</b>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(n.ts)}</td>
                    <td>
                      <span className={n.kind === "credit" ? "badge amber" : "badge"}>
                        {t(n.kind === "credit" ? "note.kind.credit" : "note.kind.debit")}
                      </span>
                    </td>
                    <td>{n.partyName}</td>
                    <td>
                      {n.kind === "credit"
                        ? t("note.againstBill", { no: n.billNo ?? "" })
                        : t("note.againstPurchase", {
                            date: purchaseTsFor(n) ? fmtDate(purchaseTsFor(n) as string) : "",
                          })}
                    </td>
                    <td>{fmtPKR(n.goodsAmount)}</td>
                    <td>{fmtPKR(n.taxAmount)}</td>
                    <td>
                      <b>{fmtPKR(n.total)}</b>
                    </td>
                    <td>{t(SETTLE_KEY[n.settlement])}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelectedId(n.id)}
                      >
                        {t("note.view")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => print(n)}
                      >
                        {t("note.print")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && (
          <div
            className="modal-backdrop"
            onClick={() => setSelectedId(null)}
            role="dialog"
            aria-modal="true"
            aria-label={selected.number}
          >
            <div
              className="modal"
              style={{ width: "min(680px, 100%)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>
                {selected.number}{" "}
                <span className={selected.kind === "credit" ? "badge amber" : "badge"}>
                  {t(selected.kind === "credit" ? "note.kind.credit" : "note.kind.debit")}
                </span>{" "}
                <span className="badge green">{t("note.posted")}</span>
              </h2>
              <p className="modal-sub">
                {fmtDate(selected.ts)} · {selected.partyName} ·{" "}
                {selected.kind === "credit"
                  ? t("note.againstBill", { no: selected.billNo ?? "" })
                  : t("note.againstPurchase", {
                      date: purchaseTsFor(selected)
                        ? fmtDate(purchaseTsFor(selected) as string)
                        : "",
                    })}
              </p>

              <div className="table-wrap" style={{ marginBottom: 16 }}>
                <table className="data" style={{ minWidth: 0 }}>
                  <thead>
                    <tr>
                      <th>{t("billing.rcpt.item")}</th>
                      <th>{t("billing.rcpt.qty")}</th>
                      <th>{t("billing.rcpt.price")}</th>
                      <th>{t("billing.rcpt.amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.items.map((it) => (
                      <tr key={it.productId}>
                        <td>{it.name}</td>
                        <td>{fmtQty(it.qty)}</td>
                        <td>{fmtPKR(it.unitPrice)}</td>
                        <td>
                          <b>{fmtPKR(it.total)}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t("note.print.goods")}</span>
                  <b>{fmtPKR(selected.goodsAmount)}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t("note.print.tax")}</span>
                  <b>{fmtPKR(selected.taxAmount)}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t("doc.total")}</span>
                  <b>{fmtPKR(selected.total)}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t("note.settlement")}</span>
                  <b>{t(SETTLE_KEY[selected.settlement])}</b>
                </div>
                {selected.reason && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>{t("note.reason")}</span>
                    <b>{selected.reason}</b>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => print(selected)}
                >
                  {t("note.print")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setSelectedId(null)}
                >
                  {t("action.close")}
                </button>
              </div>
            </div>
          </div>
        )}

        {printNote && (
          <NotePrintSheet
            note={printNote}
            settings={settings}
            sourceReturn={sourceReturnFor(printNote)}
            purchaseTs={purchaseTsFor(printNote)}
          />
        )}
      </div>
    </div>
  );
}
