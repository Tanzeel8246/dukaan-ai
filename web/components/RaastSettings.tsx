"use client";

/**
 * Phase E · E3 — Settings → Payments (Raast) card (design
 * §3.5). Its own card, beside Print & branding (the designer
 * owns the template toggles; this card owns the Raast setup —
 * §1.8's "Payments & device" grouping).
 *
 * Honesty discipline (§3.1/§3.6), enforced in copy, not just
 * comments: the generated code is labelled PROVISIONAL —
 * pending verification against a real bank Raast QR — and the
 * bank-issued image is named the verified path that wins on
 * paper. Nothing here calls the generated code a merchant
 * (P2M) QR or "verified".
 *
 * The IBAN is validated in full (structure + ISO 13616
 * mod-97) on every keystroke; Save is refused while it is
 * invalid, so a typo'd digit is caught at the desk, not by a
 * customer's failed scan. The moment the IBAN validates, the
 * generated code renders as a live preview — the owner
 * scan-tests it with their own banking app BEFORE saving
 * (the cheapest verification loop there is, §3.5).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import { PrintPageStyle } from "./PrintChrome";
import QrCode from "./QrCode";
import { brandingDataUrls } from "@/lib/branding";
import {
  buildRaastP2pPayload,
  groupIban,
  RAAST_SAMPLE_IBAN,
  resolveRaastBlock,
  validatePkIban,
  validateRaastFiName,
  type PkIbanError,
} from "@/lib/raast";
import { resolvePrintDesign } from "@/lib/print";
import type { I18nKey } from "@/lib/i18n";
import type { PrintDesign } from "@/lib/types";

const IBAN_ERROR_KEY: Record<Exclude<PkIbanError, "empty">, I18nKey> = {
  alias: "print.raast.err.alias",
  notPk: "print.raast.err.notPk",
  badLength: "print.raast.err.length",
  badStructure: "print.raast.err.format",
  badChecksum: "print.raast.err.checksum",
};

const QR_SIZES: Array<{ id: NonNullable<PrintDesign["raastQrSize"]>; key: I18nKey }> = [
  { id: "s", key: "print.logoSize.s" },
  { id: "m", key: "print.logoSize.m" },
  { id: "l", key: "print.logoSize.l" },
];

export default function RaastSettingsSection() {
  const { settings, branding, updateSettings, isStaff } = useStore();
  const { mode } = useAuth();
  const { t } = useLang();
  const demo = mode === "demo";

  const [ibanDraft, setIbanDraft] = useState<string>(() => settings.raastIban ?? "");
  const [fiDraft, setFiDraft] = useState<string>(() => settings.raastFiName ?? "");
  const [savedFlag, setSavedFlag] = useState(false);
  const [printPoster, setPrintPoster] = useState(false);
  const dirtyRef = useRef(false);
  const syncedRef = useRef<string>(
    `${settings.raastIban ?? ""}|${settings.raastFiName ?? ""}`
  );

  // Re-hydrate from settings when the saved values change
  // underneath us and no unsaved edit is in flight (the
  // PrintDesigner discipline).
  useEffect(() => {
    const incoming = `${settings.raastIban ?? ""}|${settings.raastFiName ?? ""}`;
    if (incoming !== syncedRef.current && !dirtyRef.current) {
      syncedRef.current = incoming;
      setIbanDraft(settings.raastIban ?? "");
      setFiDraft(settings.raastFiName ?? "");
    }
  }, [settings.raastIban, settings.raastFiName]);

  const ibanResult = useMemo(() => validatePkIban(ibanDraft), [ibanDraft]);
  const fiResult = useMemo(() => validateRaastFiName(fiDraft), [fiDraft]);
  const ibanErrorKey: I18nKey | null =
    !ibanResult.ok && ibanResult.code !== "empty"
      ? IBAN_ERROR_KEY[ibanResult.code]
      : null;
  const canSave =
    !isStaff && (ibanResult.ok || (!ibanResult.ok && ibanResult.code === "empty")) && fiResult.ok;

  const savedIban = useMemo(() => validatePkIban(settings.raastIban), [settings.raastIban]);
  const assets = useMemo(() => brandingDataUrls(branding), [branding]);
  const imagePresent = !!assets.raastQrImage;

  /* The preview: the DRAFT the moment it validates (scan-test
   * before saving); otherwise the saved IBAN; in demo, with
   * neither, the published sample IBAN — badged as a sample
   * and never printable on a real bill (§7). */
  const preview = useMemo(() => {
    const fi = fiResult.ok ? fiResult.value : "";
    const build = (iban: string, sample: boolean) => {
      try {
        return {
          iban,
          sample,
          payload: buildRaastP2pPayload({ iban, fiName: fi || undefined }),
        };
      } catch {
        return null;
      }
    };
    if (ibanResult.ok) return build(ibanResult.iban, false);
    if (savedIban.ok) return build(savedIban.iban, false);
    if (demo) return build(RAAST_SAMPLE_IBAN, true);
    return null;
  }, [ibanResult, savedIban, fiResult, demo]);

  /* What actually prints on bills today (the saved state). */
  const pathKey: I18nKey = imagePresent
    ? "print.raast.pathImage"
    : savedIban.ok
      ? "print.raast.pathGenerated"
      : "print.raast.pathNone";

  const resolved = useMemo(() => resolvePrintDesign(settings), [settings]);
  const editDesign = (patch: Partial<PrintDesign>) => {
    if (isStaff) return;
    updateSettings({ printDesign: { ...(settings.printDesign ?? {}), ...patch } });
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    const iban = ibanResult.ok ? ibanResult.iban : "";
    const fi = fiResult.ok ? fiResult.value : "";
    updateSettings({ raastIban: iban, raastFiName: fi });
    syncedRef.current = `${iban}|${fi}`;
    dirtyRef.current = false;
    setSavedFlag(true);
  };

  /* The counter poster (§3.4): the static code at poster size,
   * through the same sheet machinery. The active path decides
   * what prints (image wins); in demo, the sample stands in. */
  const posterBlock = useMemo(
    () =>
      resolveRaastBlock({
        enabled: true,
        imagePresent,
        iban: savedIban.ok ? savedIban.iban : demo ? RAAST_SAMPLE_IBAN : null,
        fiName: settings.raastFiName,
        doc: { kind: "poster" },
        size: "l",
        thermal: false,
      }),
    [imagePresent, savedIban, demo, settings.raastFiName]
  );
  const posterIsSample = !imagePresent && !savedIban.ok && demo;

  const printPosterNow = () => {
    setPrintPoster(true);
    window.setTimeout(() => {
      window.print();
      setPrintPoster(false);
    }, 60);
  };

  const errorStyle: React.CSSProperties = {
    color: "var(--danger)",
    fontSize: "0.88rem",
    marginTop: 4,
  };

  return (
    <section className="card" aria-label={t("print.raast.title")}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("print.raast.title")}</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 12 }}>
        {t("print.raast.sub")}
      </p>
      <div className="note-box" style={{ marginBottom: 16 }} role="note">
        {t("print.raast.honest")}
      </div>

      <form className="form" onSubmit={save}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="raast-iban">{t("print.raast.ibanLabel")}</label>
            <input
              id="raast-iban"
              value={ibanDraft}
              onChange={(e) => {
                dirtyRef.current = true;
                setSavedFlag(false);
                setIbanDraft(e.target.value);
              }}
              placeholder={t("print.raast.ibanPh")}
              disabled={isStaff}
              dir="ltr"
              autoComplete="off"
              spellCheck={false}
            />
            {ibanErrorKey ? (
              <div style={errorStyle} role="alert">
                {t(ibanErrorKey)}
              </div>
            ) : ibanResult.ok ? (
              <div style={{ color: "var(--accent-text)", fontSize: "0.88rem", marginTop: 4 }}>
                {t("print.raast.validNote")}
              </div>
            ) : (
              <div style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 4 }}>
                {t("print.raast.ibanHint")}
              </div>
            )}
          </div>
          <div className="field">
            <label htmlFor="raast-fi">{t("print.raast.fiLabel")}</label>
            <input
              id="raast-fi"
              value={fiDraft}
              onChange={(e) => {
                dirtyRef.current = true;
                setSavedFlag(false);
                setFiDraft(e.target.value);
              }}
              placeholder={t("print.raast.fiPh")}
              disabled={isStaff}
              autoComplete="off"
            />
            {!fiResult.ok ? (
              <div style={errorStyle} role="alert">
                {t("print.raast.err.fi")}
              </div>
            ) : (
              <div style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 4 }}>
                {t("print.raast.fiHint")}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" className="btn btn-primary" disabled={!canSave}>
            {t("action.save")}
          </button>
          {savedFlag && !isStaff && (
            <span style={{ color: "var(--accent-text)", fontWeight: 700, fontSize: "0.92rem" }}>
              {t("print.raast.saved")}
            </span>
          )}
        </div>
      </form>

      <p style={{ fontSize: "0.92rem", margin: "16px 0 4px" }} role="status">
        {t(pathKey)}
      </p>

      {preview && (
        <div style={{ marginTop: 14 }}>
          <h3 style={{ fontSize: "1.02rem", margin: "0 0 8px" }}>
            {t("print.raast.previewTitle")}
          </h3>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ position: "relative" }}>
              <QrCode payload={preview.payload} sizePx={168} label={t("print.raast.previewTitle")} />
              {preview.sample && (
                <div className="print-sample-badge" style={{ position: "absolute", top: 6, insetInlineEnd: 6 }}>
                  {t("print.sampleBadge")}
                </div>
              )}
            </div>
            <div style={{ flex: "1 1 260px", minWidth: 240 }}>
              <div style={{ fontSize: "0.95rem", marginBottom: 6 }} dir="ltr">
                {groupIban(preview.iban)}
              </div>
              <div className="note-box" role="note">
                {t("print.raast.provisional")}
                {preview.sample && <div style={{ marginTop: 4 }}>{t("print.raast.sampleNote")}</div>}
              </div>
              <details style={{ marginTop: 10 }}>
                <summary style={{ cursor: "pointer", fontSize: "0.9rem" }}>
                  {t("print.raast.payloadLabel")}
                </summary>
                <code
                  style={{
                    display: "block",
                    marginTop: 6,
                    fontSize: "0.78rem",
                    wordBreak: "break-all",
                    whiteSpace: "pre-wrap",
                  }}
                  dir="ltr"
                >
                  {preview.payload}
                </code>
              </details>
            </div>
          </div>
        </div>
      )}

      <h3 style={{ fontSize: "1.02rem", margin: "20px 0 8px" }}>{t("print.raast.onBills")}</h3>
      <label
        style={{ display: "flex", gap: 10, alignItems: "center", fontSize: "0.95rem", cursor: isStaff ? "default" : "pointer", padding: "4px 0" }}
      >
        <input
          type="checkbox"
          checked={resolved.showRaastQr}
          disabled={isStaff}
          onChange={(e) => editDesign({ showRaastQr: e.target.checked })}
        />
        <span>{t("print.raast.showToggle")}</span>
      </label>
      <label
        style={{ display: "flex", gap: 10, alignItems: "center", fontSize: "0.95rem", cursor: isStaff ? "default" : "pointer", padding: "4px 0" }}
      >
        <input
          type="checkbox"
          checked={resolved.raastDynamic}
          disabled={isStaff}
          onChange={(e) => editDesign({ raastDynamic: e.target.checked })}
        />
        <span>{t("print.raast.dynamicToggle")}</span>
      </label>
      <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: "2px 0 10px" }}>
        {t("print.raast.dynamicNote")}
      </p>
      <div className="field">
        <label>{t("print.raast.sizeLabel")}</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {QR_SIZES.map((o) => (
            <button
              key={o.id}
              type="button"
              className={`btn btn-sm ${resolved.raastQrSize === o.id ? "btn-primary" : "btn-ghost"}`}
              aria-pressed={resolved.raastQrSize === o.id}
              disabled={isStaff}
              onClick={() => editDesign({ raastQrSize: o.id })}
            >
              {t(o.key)}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={posterBlock.path === "none"}
          onClick={printPosterNow}
        >
          {t("print.raast.posterBtn")}
        </button>
        <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
          {t("print.raast.posterNote")}
        </span>
      </div>

      {printPoster && posterBlock.path !== "none" && (
        <div className="receipt-sheet">
          <PrintPageStyle paper="a4" />
          <div className="receipt raast-poster">
            <h3>{settings.shopName}</h3>
            <div className="r-poster-title">{t("print.raast.posterTitle")}</div>
            <div className="r-raast">
              {posterBlock.path === "image" ? (
                <img
                  src={assets.raastQrImage ?? ""}
                  alt=""
                  style={{ width: "50mm", height: "auto" }}
                />
              ) : (
                <QrCode payload={posterBlock.payload} sizeMm={50} />
              )}
              <div className="r-raast-caption">{t("print.raast.caption")}</div>
              {posterBlock.iban && (
                <div className="r-raast-iban">
                  {t("print.raast.paperIban")}:{" "}
                  <span style={{ direction: "ltr", unicodeBidi: "isolate" }}>
                    {groupIban(posterBlock.iban)}
                  </span>
                </div>
              )}
              {posterIsSample && (
                <div className="r-poster-sample">{t("print.sampleBadge")}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
