"use client";

/**
 * Phase E · E4/E5 — Settings → "This device's lock" card
 * (design §4.2/§4.5/§4.7/§5).
 *
 * The card is DEVICE-LOCAL state, operated by whoever holds
 * the device — deliberately NOT role-gated (§5: a role gate on
 * a device feature would be theatre; the device is the
 * boundary). Change/remove are guarded instead by §4.5's rule:
 * the current PIN, or the signed-in account's password via
 * Firebase reauthentication (staff sessions included,
 * deliberately — §4.5). In demo mode there is no password:
 * the card explains the lock screen's erase recovery (§4.8).
 *
 * The honesty paragraph (§4.7) is copy, in both languages:
 * the PIN is a counter-privacy convenience, never a
 * replacement for the account password, and nothing here (or
 * anywhere) calls it "security" unqualified.
 */
import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import { usePinGate } from "./PinGate";
import { fmtDate } from "@/lib/format";
import type { PinDigits, PinIdleMinutes } from "@/lib/pinlock";
import type { I18nKey, TParams } from "@/lib/i18n";

const DIGIT_CHOICES: PinDigits[] = [4, 5, 6];
const IDLE_CHOICES: PinIdleMinutes[] = [0, 1, 5, 15, 30];

const digitsOnly = (value: string, max: number): string =>
  value.replace(/[^0-9]/g, "").slice(0, max);

export default function DeviceLockCard() {
  const { mode } = useAuth();
  const { t } = useLang();
  const {
    active,
    hasPin,
    record,
    prefs,
    setPin,
    changePin,
    removePinWithPin,
    removePinWithPassword,
    updatePrefs,
  } = usePinGate();
  const demo = mode === "demo";

  /* set-flow state */
  const [digits, setDigits] = useState<PinDigits>(4);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  /* manage-flow state */
  const [currentPin, setCurrentPin] = useState("");
  const [changeDigits, setChangeDigits] = useState<PinDigits>(record?.digits ?? 4);
  const [changedPin, setChangedPin] = useState("");
  const [password, setPassword] = useState("");
  /* shared feedback */
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  if (!active) return null;

  const fail = (key: I18nKey, params?: TParams) => {
    setError(t(key, params));
    setNotice("");
  };
  const done = (key: I18nKey) => {
    setNotice(t(key));
    setError("");
    setNewPin("");
    setConfirmPin("");
    setCurrentPin("");
    setChangedPin("");
    setPassword("");
  };

  const submitSet = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (newPin.length !== digits) return fail("pin.errDigits", { n: digits });
    if (newPin !== confirmPin) return fail("pin.errMismatch");
    setBusy(true);
    const ok = await setPin(newPin);
    setBusy(false);
    if (ok) done("pin.setDone");
  };

  const submitChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!record) return;
    if (currentPin.length !== record.digits)
      return fail("pin.errDigits", { n: record.digits });
    if (changedPin.length !== changeDigits)
      return fail("pin.errDigits", { n: changeDigits });
    setBusy(true);
    const ok = await changePin(currentPin, changedPin);
    setBusy(false);
    if (ok) done("pin.changedDone");
    else fail("pin.errCurrent");
  };

  const submitRemoveWithPin = async () => {
    setError("");
    setNotice("");
    if (!record) return;
    if (currentPin.length !== record.digits)
      return fail("pin.errDigits", { n: record.digits });
    setBusy(true);
    const ok = await removePinWithPin(currentPin);
    setBusy(false);
    if (ok) done("pin.removedDone");
    else fail("pin.errCurrent");
  };

  const submitRemoveWithPassword = async () => {
    setError("");
    setNotice("");
    if (!password) return;
    setBusy(true);
    const ok = await removePinWithPassword(password);
    setBusy(false);
    if (ok) done("pin.removedDone");
    else fail("pin.errPassword");
  };

  const pinInput = (
    id: string,
    label: I18nKey,
    value: string,
    set: (v: string) => void,
    max: number
  ) => (
    <div className="field">
      <label htmlFor={id}>{t(label)}</label>
      <input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        value={value}
        onChange={(e) => set(digitsOnly(e.target.value, max))}
      />
    </div>
  );

  const digitsPicker = (
    value: PinDigits,
    set: (d: PinDigits) => void,
    label: string
  ) => (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} role="group" aria-label={label}>
      {DIGIT_CHOICES.map((d) => (
        <button
          key={d}
          type="button"
          className={`btn ${value === d ? "btn-primary" : "btn-ghost"}`}
          aria-pressed={value === d}
          onClick={() => set(d)}
        >
          {t("pin.digitsOption", { n: d })}
        </button>
      ))}
    </div>
  );

  return (
    <section className="card" aria-label={t("pin.title")}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("pin.title")}</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
        {t("pin.honesty")}
      </p>

      {!hasPin ? (
        <form className="form" onSubmit={submitSet}>
          <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>{t("pin.statusNone")}</p>
          <div className="field">
            <label>{t("pin.digits")}</label>
            {digitsPicker(digits, (d) => {
              setDigits(d);
              setNewPin((v) => v.slice(0, d));
              setConfirmPin((v) => v.slice(0, d));
            }, t("pin.digits"))}
          </div>
          <div className="form-grid">
            {pinInput("pin-new", "pin.newPin", newPin, setNewPin, digits)}
            {pinInput("pin-confirm", "pin.confirmPin", confirmPin, setConfirmPin, digits)}
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          {notice && (
            <p style={{ color: "var(--accent-text)", fontWeight: 700, fontSize: "0.92rem" }}>
              {notice}
            </p>
          )}
          <div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {t("pin.set")}
            </button>
          </div>
          {demo && (
            <div className="note-box">{t("pin.demoRecovery")}</div>
          )}
        </form>
      ) : (
        <div className="form">
          <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
            {t("pin.statusSet", { date: record ? fmtDate(record.setAt) : "" })}
          </p>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="pin-idle">{t("pin.idle")}</label>
              <select
                id="pin-idle"
                value={prefs.idleMinutes}
                onChange={(e) =>
                  updatePrefs({
                    ...prefs,
                    idleMinutes: Number(e.target.value) as PinIdleMinutes,
                  })
                }
              >
                {IDLE_CHOICES.map((m) => (
                  <option key={m} value={m}>
                    {m === 0 ? t("pin.idleLaunch") : t("pin.idleMinutes", { n: m })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label
            style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={prefs.gateSensitive}
              onChange={(e) => updatePrefs({ ...prefs, gateSensitive: e.target.checked })}
              style={{ marginTop: 3 }}
            />
            <span>
              <span style={{ fontWeight: 700 }}>{t("pin.gate")}</span>
              <span style={{ display: "block", color: "var(--muted)", fontSize: "0.88rem" }}>
                {t("pin.gateSub")}
              </span>
            </span>
          </label>

          <form className="form" onSubmit={submitChange} style={{ marginTop: 8 }}>
            <div className="form-grid">
              {pinInput(
                "pin-current",
                "pin.currentPin",
                currentPin,
                setCurrentPin,
                record?.digits ?? 6
              )}
              {pinInput("pin-changed", "pin.newPin", changedPin, setChangedPin, changeDigits)}
            </div>
            <div className="field">
              <label>{t("pin.digits")}</label>
              {digitsPicker(changeDigits, (d) => {
                setChangeDigits(d);
                setChangedPin((v) => v.slice(0, d));
              }, t("pin.digits"))}
            </div>
            <div>
              <button type="submit" className="btn btn-ghost" disabled={busy}>
                {t("pin.change")}
              </button>
            </div>
          </form>

          {error && <div className="form-error" role="alert">{error}</div>}
          {notice && (
            <p style={{ color: "var(--accent-text)", fontWeight: 700, fontSize: "0.92rem" }}>
              {notice}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              borderTop: "1px solid var(--line)",
              paddingTop: 16,
            }}
          >
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy}
              onClick={() => void submitRemoveWithPin()}
            >
              {t("pin.remove")}
            </button>
            {!demo && (
              <>
                <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                  {t("pin.passwordAlt")}
                </span>
                <input
                  type="password"
                  aria-label={t("pin.password")}
                  placeholder={t("pin.password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ minWidth: 200 }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy || !password}
                  onClick={() => void submitRemoveWithPassword()}
                >
                  {t("pin.removeWithPassword")}
                </button>
              </>
            )}
          </div>
          {demo && <div className="note-box">{t("pin.demoRecovery")}</div>}
        </div>
      )}
    </section>
  );
}
