"use client";

/**
 * Dukaan AI — fiscal-year close UI (Phase D · D4, design §4).
 *
 * One surface, mounted in Finance (the FY section) and beside
 * Settings' periods panel: an FY picker, the derived pre-close
 * checklist (hard gates vs warnings vs carried-forward figures —
 * computed live by lib/fiscal, never stored), the close action
 * with its recorded warnings acknowledgement, the closed year's
 * summary read off the closing entry itself, the next year's
 * derived opening balances (§4.5 — there are no opening entries),
 * and the owner-only reopen-by-reversal with its mandatory
 * recorded reason.
 *
 * Owner-only in the matrix (`fiscalClose` F/N/N/N): every other
 * role never sees this card, the store refuses their calls.
 */
import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import { usePinGate } from "./PinGate";
import { can } from "@/lib/permissions";
import { fmtDate, fmtPKR } from "@/lib/format";
import type { I18nKey } from "@/lib/i18n";
import type { AccountCode } from "@/lib/types";
import {
  fiscalStartDateInYear,
  fiscalStartOf,
  fiscalYearRange,
  previousFiscalYear,
  startOfDayPktInstant,
  todayPktISO,
  type FiscalYearRange,
} from "@/lib/periods";
import {
  balanceSheetBalances,
  closingEntrySummary,
  fiscalCloseState,
  fiscalYearCloseChecklist,
  fyLabel,
  openingStockGap,
} from "@/lib/fiscal";

const EXPENSE_CATS = ["rent", "electricity", "salary", "transport", "other", "finance"];

export default function FiscalClosePanel() {
  const {
    settings,
    journal,
    periods,
    payrollRuns,
    productionOrders,
    cheques,
    products,
    closeFiscalYear,
    reopenFiscalYear,
    postOpeningStock,
  } = useStore();
  const { role } = useAuth();
  const { requirePin } = usePinGate();
  const { t } = useLang();

  /** "1 July 2026" from a YYYY-MM-DD business date (parts-composed,
   *  the PeriodsPanel convention — no timezone shift possible). */
  const dateLabel = (dateISO: string): string => {
    const [y, m, d] = dateISO.split("-").map(Number);
    if (!y || !m || !d) return dateISO;
    return `${d} ${t(`common.month.${m - 1}` as I18nKey)} ${y}`;
  };

  const accountLabel = (code: AccountCode): string => {
    if (code.startsWith("expense_")) {
      const cat = code.replace("expense_", "");
      if (EXPENSE_CATS.includes(cat)) return t(`common.expenseCat.${cat}` as I18nKey);
    }
    const key = `fin.acct.${code}` as I18nKey;
    const label = t(key);
    return label === key ? code.replace(/_/g, " ") : label;
  };

  /* ---- the FY picker list: from the earliest journal year
   *  through the current FY, newest first ---- */
  const ranges = useMemo<FiscalYearRange[]>(() => {
    const start = fiscalStartOf(settings);
    const curStartYear = Number(
      fiscalYearRange(settings, new Date().toISOString()).startDate.slice(0, 4)
    );
    let firstYear = curStartYear - 1;
    if (journal.length > 0) {
      const earliest = [...journal].sort((a, b) => a.ts.localeCompare(b.ts))[0];
      firstYear = Math.min(
        firstYear,
        Number(fiscalYearRange(settings, earliest.ts).startDate.slice(0, 4))
      );
    }
    const out: FiscalYearRange[] = [];
    for (let y = curStartYear; y >= firstYear; y--) {
      const startDate = fiscalStartDateInYear(start, y);
      out.push(fiscalYearRange(settings, startOfDayPktInstant(startDate)));
    }
    return out;
  }, [settings, journal]);

  const prevFy = useMemo(() => previousFiscalYear(settings), [settings]);
  const [selected, setSelected] = useState<string>("");
  const range =
    ranges.find((r) => r.startDate === selected) ??
    ranges.find((r) => r.startDate === prevFy.startDate) ??
    ranges[0];

  const [note, setNote] = useState("");
  const [ack, setAck] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmOpenStock, setConfirmOpenStock] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const state = useMemo(
    () => (range ? fiscalCloseState(journal, periods, range) : null),
    [journal, periods, range]
  );
  const checklist = useMemo(
    () =>
      range
        ? fiscalYearCloseChecklist({
            journal,
            payrollRuns,
            productionOrders,
            cheques,
            products,
            range,
            lockedThrough: settings.lockedThrough,
          })
        : null,
    [journal, payrollRuns, productionOrders, cheques, products, range, settings.lockedThrough]
  );
  const summary = useMemo(
    () => (state?.entry ? closingEntrySummary(state.entry) : null),
    [state]
  );
  /* Fix Round 1 · F5: the LIVE opening-stock gap (today's shelf
   * vs today's books — the checklist row above is as at the
   * selected year's end, the entry is dated today). */
  const osGap = useMemo(
    () => openingStockGap(journal, products),
    [journal, products]
  );
  const nextRange = useMemo(
    () => (range ? fiscalYearRange(settings, range.toTs) : null),
    [settings, range]
  );
  const openings = useMemo(
    () => (range ? balanceSheetBalances(journal, range.toTs) : []),
    [journal, range]
  );

  if (!can(role, "fiscalClose", "view") || !range || !state || !checklist) return null;

  const fail = (reason: string) => {
    setConfirmClose(false);
    setConfirmReopen(false);
    if (reason === "notpast") setError(t("fin.fy.errNotPast"));
    else if (reason === "closed") setError(t("fin.fy.errClosed"));
    else if (reason === "gate") setError(t("fin.fy.errGate"));
    else if (reason === "warnings") setError(t("fin.fy.errWarnings"));
    else if (reason === "locked") setError(t("fin.fy.errLocked"));
    else if (reason === "notclosed") setError(t("fin.fy.errNotClosed"));
    else if (reason === "stack") setError(t("fin.fy.errStack"));
    else if (reason === "reason") setError(t("fin.fy.errReason"));
    else setError(t("fin.fy.errInvalid"));
  };

  const doOpenStock = async () => {
    /* E5: posting to the journal is a gated act — the same
     * fiscal PIN challenge as the close itself. */
    if (!(await requirePin("pin.gate.actFiscal"))) {
      setConfirmOpenStock(false);
      return;
    }
    const res = postOpeningStock(osGap.gap, osGap.rawGap);
    if (!res.ok) return fail(res.reason);
    setConfirmOpenStock(false);
    setError("");
    setNotice(t("fin.fy.openStock.posted"));
  };

  const doClose = async () => {
    /* E5 (design §4.6): fiscal-year close is a gated action —
     * the PIN challenge precedes the store call; cancel/fail
     * composes nothing. */
    if (!(await requirePin("pin.gate.actFiscal"))) {
      setConfirmClose(false);
      return;
    }
    const res = closeFiscalYear(range.startDate, { note, ackWarnings: ack });
    if (!res.ok) return fail(res.reason);
    setConfirmClose(false);
    setError("");
    setNote("");
    setAck(false);
    setNotice(t("fin.fy.closedNotice", { fy: fyLabel(range) }));
  };

  const doReopen = async () => {
    /* E5 (design §4.6): fiscal-year reopen is gated with close —
     * the same device PIN challenge first; cancel/fail
     * composes nothing. */
    if (!(await requirePin("pin.gate.actFiscal"))) {
      setConfirmReopen(false);
      return;
    }
    const res = reopenFiscalYear(range.startDate, reopenReason);
    if (!res.ok) return fail(res.reason);
    setConfirmReopen(false);
    setError("");
    setReopenReason("");
    setNotice(t("fin.fy.reopenedNotice", { fy: fyLabel(range) }));
  };

  const checkRow = (
    mark: string,
    color: string,
    label: string,
    detail: string
  ) => (
    <div
      style={{
        display: "flex",
        gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--line)",
        alignItems: "flex-start",
      }}
    >
      <span
        aria-hidden
        style={{ color, fontWeight: 800, minWidth: 20, textAlign: "center" }}
      >
        {mark}
      </span>
      <div style={{ display: "grid", gap: 2 }}>
        <span style={{ fontWeight: 700 }}>{label}</span>
        <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>{detail}</span>
      </div>
    </div>
  );

  return (
    <section className="card" aria-label={t("fin.fy.title")} style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("fin.fy.title")}</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
        {t("fin.fy.caption")}
      </p>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 8 }}>
        <div className="field" style={{ minWidth: 240 }}>
          <label htmlFor="fy-pick">{t("fin.fy.pick")}</label>
          <select
            id="fy-pick"
            value={range.startDate}
            onChange={(e) => {
              setSelected(e.target.value);
              setError("");
              setNotice("");
              setAck(false);
            }}
          >
            {ranges.map((r) => (
              <option key={r.startDate} value={r.startDate}>
                {fyLabel(r)} · {dateLabel(r.startDate)} – {dateLabel(r.endDate)}
              </option>
            ))}
          </select>
        </div>
        <span
          className={`badge ${state.closed ? "amber" : "green"}`}
          style={{ marginBottom: 10 }}
        >
          {state.closed ? t("fin.fy.statusClosed") : t("fin.fy.statusOpen")}
        </span>
      </div>

      {notice && (
        <div
          className="note-box"
          style={{ marginTop: 8, marginBottom: 16, borderStyle: "solid", borderColor: "var(--accent)" }}
        >
          {notice}
        </div>
      )}
      {error && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {state.closed && state.closeDoc ? (
        <>
          <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 6 }}>
            {t("fin.fy.closedOn", {
              date: fmtDate(state.closeDoc.ts),
              email: state.closeDoc.byEmail || "—",
            })}
            {state.closeDoc.note ? ` · ${state.closeDoc.note}` : ""}
          </p>
          {summary && (
            <>
              <h3 style={{ fontSize: "1.05rem", margin: "18px 0 6px" }}>
                {t("fin.fy.summaryTitle")}
              </h3>
              <div>
                {summary.rows.map((r) => (
                  <div
                    key={r.account}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "7px 0",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <span>{accountLabel(r.account)}</span>
                    <b>{fmtPKR(r.amount)}</b>
                  </div>
                ))}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "9px 0",
                  }}
                >
                  <b>
                    {summary.net >= 0
                      ? t("fin.fy.summaryNetProfit")
                      : t("fin.fy.summaryNetLoss")}
                  </b>
                  <b>{fmtPKR(Math.abs(summary.net))}</b>
                </div>
              </div>
            </>
          )}
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 10 }}>
            {t("fin.fy.plNote")}
          </p>

          {/* reopen — owner-only, reason recorded, stack-checked */}
          <h3 style={{ fontSize: "1.05rem", margin: "22px 0 10px" }}>
            {t("fin.fy.reopenTitle")}
          </h3>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              setNotice("");
              setConfirmReopen(true);
            }}
          >
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="fy-reopen-reason">{t("fin.fy.reopenReason")}</label>
              <input
                id="fy-reopen-reason"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder={t("fin.fy.reopenReasonPlaceholder")}
              />
            </div>
            <button type="submit" className="btn btn-ghost">
              {t("fin.fy.reopen", { fy: fyLabel(range) })}
            </button>
          </form>
        </>
      ) : (
        <>
          <h3 style={{ fontSize: "1.05rem", margin: "14px 0 4px" }}>
            {t("fin.fy.checklist")}
          </h3>
          <div style={{ marginBottom: 16 }}>
            {checkRow(
              checklist.items[0].triggered ? "✕" : "✓",
              checklist.items[0].triggered ? "var(--danger)" : "var(--accent-text)",
              t("fin.fy.check.tb"),
              t("fin.fy.check.tbDetail", {
                difference: fmtPKR(checklist.trialBalance.difference),
                closing: fmtPKR(checklist.trialBalance.closingDifference),
              })
            )}
            {checkRow(
              checklist.items[1].triggered ? "✕" : "✓",
              checklist.items[1].triggered ? "var(--danger)" : "var(--accent-text)",
              t("fin.fy.check.clearing"),
              t("fin.fy.check.clearingDetail", {
                amount: fmtPKR(checklist.purchasesClearing),
              })
            )}
            {checkRow(
              checklist.items[2].triggered ? "!" : "✓",
              checklist.items[2].triggered ? "var(--amber)" : "var(--accent-text)",
              t("fin.fy.check.draftPayroll"),
              t("fin.fy.check.draftPayrollDetail", { count: checklist.draftPayrollRuns })
            )}
            {checkRow(
              checklist.items[3].triggered ? "!" : "✓",
              checklist.items[3].triggered ? "var(--amber)" : "var(--accent-text)",
              t("fin.fy.check.production"),
              t("fin.fy.check.productionDetail", {
                count: checklist.openProductionOrders,
                amount: fmtPKR(checklist.openProductionPoolTotal),
              })
            )}
            {checkRow(
              "i",
              "var(--muted)",
              t("fin.fy.check.salary"),
              t("fin.fy.check.salaryDetail", {
                owed: fmtPKR(checklist.salary.owedToEmployees),
                advances: fmtPKR(checklist.salary.advancesOutstanding),
                unassigned: fmtPKR(checklist.salary.unassignedAccrued),
              })
            )}
            {checkRow(
              "i",
              "var(--muted)",
              t("fin.fy.check.cheques"),
              t("fin.fy.check.chequesDetail", {
                inHand: fmtPKR(checklist.chequesInHand),
                issued: fmtPKR(checklist.chequesIssued),
              })
            )}
            {checkRow(
              "i",
              "var(--muted)",
              t("fin.fy.check.stock"),
              t("fin.fy.check.stockDetail", {
                gl: fmtPKR(checklist.stockGl),
                shelf: fmtPKR(checklist.stockShelf),
                diff: fmtPKR(checklist.stockDivergence),
              })
            )}
            {checkRow(
              "i",
              "var(--muted)",
              t("fin.fy.check.lock"),
              checklist.lockCoversFyEnd
                ? t("fin.fy.check.lockAlready")
                : t("fin.fy.check.lockWill")
            )}
          </div>

          {/* Fix Round 1 · F5: the one-time opening-stock action,
              offered only while today's shelf exceeds today's
              books — the exact divergence the stock row above
              reports. One composed entry (Dr stock / Cr capital),
              PIN-gated, append-only. */}
          {osGap.gap > 0 && (
            <div
              className="note-box"
              style={{ marginBottom: 16, borderStyle: "solid" }}
            >
              <p style={{ margin: "0 0 10px" }}>
                {t("fin.fy.openStock.caption", { amount: fmtPKR(osGap.gap) })}
              </p>
              {!confirmOpenStock ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setError("");
                    setNotice("");
                    setConfirmOpenStock(true);
                  }}
                >
                  {t("fin.fy.openStock.action", { amount: fmtPKR(osGap.gap) })}
                </button>
              ) : (
                <>
                  <p style={{ margin: "0 0 10px", fontWeight: 600 }}>
                    {t("fin.fy.openStock.confirm", { amount: fmtPKR(osGap.gap) })}
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={doOpenStock}
                    >
                      {t("action.confirm")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setConfirmOpenStock(false)}
                    >
                      {t("action.cancel")}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {!checklist.hardGatesPass && (
            <div className="form-error" style={{ marginBottom: 16 }}>
              {t("fin.fy.gateBlocked")}
            </div>
          )}
          {checklist.warningIds.length > 0 && (
            <label
              style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 14 }}
            >
              <input
                type="checkbox"
                checked={ack}
                onChange={(e) => setAck(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>{t("fin.fy.ackWarnings")}</span>
            </label>
          )}
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              setNotice("");
              if (!checklist.hardGatesPass) return fail("gate");
              if (checklist.warningIds.length > 0 && !ack) return fail("warnings");
              if (range.endDate >= todayPktISO()) return fail("notpast");
              setConfirmClose(true);
            }}
          >
            <div className="field" style={{ marginBottom: 12 }}>
              <label htmlFor="fy-close-note">{t("fin.fy.note")}</label>
              <input
                id="fy-close-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("fin.fy.notePlaceholder")}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!checklist.hardGatesPass}
            >
              {t("fin.fy.close")}
            </button>
          </form>
        </>
      )}

      {/* §4.5: the next year's openings are derived figures, shown
       *  where an accountant looks for opening entries. */}
      {nextRange && (
        <>
          <h3 style={{ fontSize: "1.05rem", margin: "24px 0 6px" }}>
            {t("fin.fy.openingsTitle", { fy: fyLabel(nextRange) })}
          </h3>
          <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginBottom: 10 }}>
            {t("fin.fy.openingsCaption")}
          </p>
          {openings.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>{t("fin.fy.openingsEmpty")}</p>
          ) : (
            <div>
              {openings.map((r) => (
                <div
                  key={r.account}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "7px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span>{accountLabel(r.account)}</span>
                  <b>{fmtPKR(r.balance)}</b>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {confirmClose && (
        <div
          className="modal-backdrop"
          onClick={() => setConfirmClose(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t("fin.fy.close")}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t("fin.fy.closeConfirmTitle", { fy: fyLabel(range) })}</h2>
            <p className="modal-sub">{t("fin.fy.closeConfirmBody")}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmClose(false)}
              >
                {t("action.cancel")}
              </button>
              <button type="button" className="btn btn-primary" onClick={doClose}>
                {t("action.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmReopen && (
        <div
          className="modal-backdrop"
          onClick={() => setConfirmReopen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t("fin.fy.reopenTitle")}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t("fin.fy.reopenConfirmTitle", { fy: fyLabel(range) })}</h2>
            <p className="modal-sub">{t("fin.fy.reopenConfirmBody")}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmReopen(false)}
              >
                {t("action.cancel")}
              </button>
              <button type="button" className="btn btn-primary" onClick={doReopen}>
                {t("action.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
