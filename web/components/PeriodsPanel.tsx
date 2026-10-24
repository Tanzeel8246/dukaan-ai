"use client";

/**
 * Dukaan AI — fiscal year & period locking UI (Phase A · A5,
 * design §5.4).
 *
 * Settings surface for the period foundation:
 *  - the fiscal-year start (month + day; Pakistan default 1 July)
 *    with the current fiscal year it produces;
 *  - the period lock: current status, Close through a date (the
 *    today/yesterday rail of risk R-5 is enforced in the store AND
 *    mirrored here as the date picker's max), and Reopen — which
 *    always demands a recorded reason;
 *  - the `periods` audit trail, newest first.
 *
 * Owner-only: the matrix row `periods` grants every other role no
 * access at all, the store refuses their calls, and the rules keep
 * the collection + the owner doc's `lockedThrough` owner-write.
 */
import { useEffect, useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import { usePinGate } from "./PinGate";
import { can } from "@/lib/permissions";
import { fmtDate } from "@/lib/format";
import type { I18nKey } from "@/lib/i18n";
import {
  currentFiscalYear,
  fiscalStartOf,
  lockedThroughDate,
  maxClosableDateISO,
} from "@/lib/periods";

export default function PeriodsPanel() {
  const { settings, periods, updateSettings, closePeriod, reopenPeriod } =
    useStore();
  const { role } = useAuth();
  const { requirePin } = usePinGate();
  const { t } = useLang();

  /** "1 July 2026" from a YYYY-MM-DD business date — composed from
   *  parts so no timezone conversion can shift the day. */
  const dateLabel = (dateISO: string): string => {
    const [y, m, d] = dateISO.split("-").map(Number);
    if (!y || !m || !d) return dateISO;
    return `${d} ${t(`common.month.${m - 1}` as I18nKey)} ${y}`;
  };

  /* ---- fiscal-year start form ---- */
  const start = fiscalStartOf(settings);
  const [fyMonth, setFyMonth] = useState(String(start.month));
  const [fyDay, setFyDay] = useState(String(start.day));
  const [fyNotice, setFyNotice] = useState("");
  useEffect(() => {
    setFyMonth(String(start.month));
    setFyDay(String(start.day));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.fiscalYearStartMonth, settings.fiscalYearStartDay]);

  const fyNow = useMemo(() => currentFiscalYear(settings), [settings]);

  const saveFiscal = (e: React.FormEvent) => {
    e.preventDefault();
    const month = Math.min(12, Math.max(1, Math.floor(Number(fyMonth) || 7)));
    const day = Math.min(31, Math.max(1, Math.floor(Number(fyDay) || 1)));
    updateSettings({ fiscalYearStartMonth: month, fiscalYearStartDay: day });
    setFyMonth(String(month));
    setFyDay(String(day));
    setFyNotice(t("settings.per.fiscalSaved"));
  };

  /* ---- lock state ---- */
  const lockedThrough = settings.lockedThrough ?? "";
  const lockDate = lockedThroughDate(lockedThrough); // "" when unlocked
  const maxClose = maxClosableDateISO();

  const [closeDate, setCloseDate] = useState(maxClose);
  const [closeNote, setCloseNote] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [reopenDate, setReopenDate] = useState("");
  const [reopenFully, setReopenFully] = useState(false);
  const [reopenReason, setReopenReason] = useState("");

  const fail = (reason: string) => {
    setConfirmClose(false);
    if (reason === "rail")
      setError(t("settings.per.errRail", { date: dateLabel(maxClosableDateISO()) }));
    else if (reason === "backwards") setError(t("settings.per.errBackwards"));
    else if (reason === "reason") setError(t("settings.per.errReason"));
    else if (reason === "nothing") setError(t("settings.per.errNothing"));
    else setError(t("settings.per.errDate"));
  };

  const doClose = async () => {
    /* E5 (design §4.6): period close is a gated action — the PIN
     * challenge precedes the store call; cancel/fail composes
     * nothing. */
    if (!(await requirePin("pin.gate.actPeriod"))) {
      setConfirmClose(false);
      return;
    }
    const res = closePeriod(closeDate, closeNote);
    if (!res.ok) return fail(res.reason);
    setConfirmClose(false);
    setError("");
    setCloseNote("");
    setNotice(t("settings.per.closed", { date: dateLabel(closeDate) }));
  };

  const doReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    /* E5 (design §4.6): period reopen is gated with close — the
     * same device PIN challenge first; cancel/fail composes
     * nothing. */
    if (!(await requirePin("pin.gate.actPeriod"))) return;
    const res = reopenPeriod(reopenFully ? null : reopenDate || null, reopenReason);
    if (!res.ok) return fail(res.reason);
    setError("");
    setReopenReason("");
    setNotice(
      reopenFully || !reopenDate
        ? t("settings.per.reopenedFully")
        : t("settings.per.reopened", { date: dateLabel(reopenDate) })
    );
  };

  const history = useMemo(
    () => [...periods].sort((a, b) => b.ts.localeCompare(a.ts)),
    [periods]
  );

  if (!can(role, "periods", "view")) return null;

  return (
    <section className="card" aria-label={t("settings.per.title")}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("settings.per.title")}</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
        {t("settings.per.sub")}
      </p>

      {/* fiscal-year start */}
      <form className="form" onSubmit={saveFiscal} style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ minWidth: 180 }}>
            <label htmlFor="per-fy-month">{t("settings.per.fiscalStart")} — {t("settings.per.month")}</label>
            <select
              id="per-fy-month"
              value={fyMonth}
              onChange={(e) => { setFyMonth(e.target.value); setFyNotice(""); }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {t(`common.month.${i}` as I18nKey)}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ width: 110 }}>
            <label htmlFor="per-fy-day">{t("settings.per.day")}</label>
            <input
              id="per-fy-day"
              type="number"
              min={1}
              max={31}
              value={fyDay}
              onChange={(e) => { setFyDay(e.target.value); setFyNotice(""); }}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            {t("action.save")}
          </button>
          {fyNotice && (
            <span style={{ color: "var(--accent-text)", fontWeight: 700, fontSize: "0.92rem" }}>
              {fyNotice}
            </span>
          )}
        </div>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 10 }}>
          {t("settings.per.fiscalCurrent", {
            start: dateLabel(fyNow.startDate),
            end: dateLabel(fyNow.endDate),
          })}
        </p>
      </form>

      {/* lock status + close */}
      <h3 style={{ fontSize: "1.05rem", marginBottom: 4 }}>{t("settings.per.lockTitle")}</h3>
      <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 14 }}>
        {lockedThrough
          ? t("settings.per.lockedThrough", { date: dateLabel(lockDate) })
          : t("settings.per.notLocked")}
      </p>

      {notice && (
        <div
          className="note-box"
          style={{ marginTop: 0, marginBottom: 16, borderStyle: "solid", borderColor: "var(--accent)" }}
        >
          {notice}
        </div>
      )}
      {error && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          setNotice("");
          setConfirmClose(true);
        }}
      >
        <div className="form-grid">
          <div className="field">
            <label htmlFor="per-close-date">{t("settings.per.closeLabel")}</label>
            <input
              id="per-close-date"
              type="date"
              value={closeDate}
              max={maxClose}
              onChange={(e) => setCloseDate(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="per-close-note">{t("settings.per.closeNote")}</label>
            <input
              id="per-close-note"
              value={closeNote}
              onChange={(e) => setCloseNote(e.target.value)}
              placeholder={t("settings.per.closeNotePlaceholder")}
            />
          </div>
        </div>
        <button type="submit" className="btn btn-primary">
          {t("settings.per.close")}
        </button>
      </form>

      {/* reopen — only meaningful while a lock is in force */}
      {lockedThrough && (
        <form className="form" onSubmit={doReopen} style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: "1.05rem", marginBottom: 12 }}>
            {t("settings.per.reopenTitle")}
          </h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="per-reopen-date">{t("settings.per.reopenLabel")}</label>
              <input
                id="per-reopen-date"
                type="date"
                value={reopenDate}
                max={lockDate}
                disabled={reopenFully}
                onChange={(e) => setReopenDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="per-reopen-reason">{t("settings.per.reason")}</label>
              <input
                id="per-reopen-reason"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder={t("settings.per.reasonPlaceholder")}
              />
            </div>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={reopenFully}
              onChange={(e) => setReopenFully(e.target.checked)}
            />
            {t("settings.per.reopenFully")}
          </label>
          <button type="submit" className="btn btn-ghost">
            {t("settings.per.reopen")}
          </button>
        </form>
      )}

      {/* audit trail */}
      <h3 style={{ fontSize: "1.05rem", margin: "24px 0 10px" }}>
        {t("settings.per.historyTitle")}
      </h3>
      {history.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>{t("settings.per.historyEmpty")}</p>
      ) : (
        <div style={{ display: "grid", gap: 0 }}>
          {history.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                padding: "10px 0",
                borderBottom: "1px solid var(--line)",
              }}
            >
              <div style={{ display: "grid", gap: 2 }}>
                <span style={{ fontWeight: 700 }}>
                  {t(
                    p.action === "close"
                      ? "settings.per.actionClose"
                      : "settings.per.actionReopen"
                  )}{" "}
                  <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: "0.85rem" }}>
                    ·{" "}
                    {p.to
                      ? t("settings.per.through", {
                          date: dateLabel(lockedThroughDate(p.to)),
                        })
                      : t("settings.per.open")}
                  </span>
                </span>
                {p.note && (
                  <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>{p.note}</span>
                )}
              </div>
              <span style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "end" }}>
                {fmtDate(p.ts)}
                {p.byEmail && (
                  <>
                    <br />
                    {t("settings.per.by", { email: p.byEmail })}
                  </>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* close confirmation (same modal pattern as demo reset) */}
      {confirmClose && (
        <div
          className="modal-backdrop"
          onClick={() => setConfirmClose(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t("settings.per.close")}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t("settings.per.close")}</h2>
            <p className="modal-sub">
              {t("settings.per.closeConfirm", {
                date: closeDate ? dateLabel(closeDate) : "",
              })}
            </p>
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
    </section>
  );
}
