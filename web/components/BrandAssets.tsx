"use client";

/**
 * Phase E · E2 — Settings → Print & branding, Brand assets group
 * (design: ERP-PHASE-E-DESIGN.md §2.5). One row per asset slot:
 * live thumbnail (checkerboard behind transparent art), the
 * encoded size + pixel dimensions, Upload / Replace / Remove.
 *
 * Upload runs the §2.2 pipeline HERE (the DOM half): decode,
 * alpha scan, then lib/branding's pure plan walked by
 * `runCompressionPlan` with a canvas encoder. The caps are
 * HARD — an image that cannot be brought under its cap is
 * REFUSED with the actual figures, never silently degraded or
 * truncated. A saved asset is one `branding` doc (owner-only
 * write in the store, matching the rules); removal deletes it
 * and the slot simply stops printing.
 *
 * The design-side controls that belong to the slots (stamp mode
 * + per-document stamp/signature toggles, the letterhead-footer
 * toggle) edit the SAME unsaved PrintDesign draft as the
 * Template group above (the `edit` prop), so the card's one Save
 * persists template + brand choices together.
 */
import { useRef, useState } from "react";
import { useStore } from "./StoreProvider";
import { useLang } from "./LangProvider";
import { fmtNum } from "@/lib/format";
import type { I18nKey } from "@/lib/i18n";
import {
  BRANDING_SPECS,
  buildBrandingAsset,
  brandingByKind,
  brandingTotalBytes,
  dataUrlBytes,
  fitWithinBox,
  runCompressionPlan,
  type CompressionStep,
} from "@/lib/branding";
import type { BrandingAsset, BrandingAssetKind, PrintDesign, StampMode } from "@/lib/types";
import type { ResolvedPrintDesign } from "@/lib/print";

/* ---------------- the DOM pipeline (§2.2 steps 1–3) ---------------- */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode"));
    img.src = src;
  });
}

function drawToCanvas(img: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, width);
  c.height = Math.max(1, height);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no-2d-context");
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** The pixel-alpha scan (§2.2 step 2): the pipeline checks for
 *  transparency, the owner doesn't. Drawn at the fitted box so
 *  the scan sees the pixels that will actually be encoded. */
function detectAlpha(img: HTMLImageElement, kind: BrandingAssetKind): boolean {
  const fit = fitWithinBox(img.naturalWidth, img.naturalHeight, BRANDING_SPECS[kind]);
  if (fit.width === 0 || fit.height === 0) return false;
  const ctx = drawToCanvas(img, fit.width, fit.height).getContext("2d");
  if (!ctx) return false;
  const data = ctx.getImageData(0, 0, fit.width, fit.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

type ProcessResult =
  | { ok: true; asset: BrandingAsset }
  | { ok: false; reason: "badType" }
  | { ok: false; reason: "tooLarge"; actual: number; cap: number };

async function processFile(kind: BrandingAssetKind, file: File): Promise<ProcessResult> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const info = {
      width: img.naturalWidth,
      height: img.naturalHeight,
      hasAlpha: false,
    };
    if (!(info.width > 0) || !(info.height > 0)) return { ok: false, reason: "badType" };
    info.hasAlpha = detectAlpha(img, kind);
    const outcome = runCompressionPlan(kind, info, (step: CompressionStep) => {
      const dataUrl = drawToCanvas(img, step.width, step.height).toDataURL(
        step.mime,
        step.quality ?? undefined
      );
      return { dataUrl, bytes: dataUrlBytes(dataUrl) };
    });
    if (!outcome.ok) {
      return { ok: false, reason: "tooLarge", actual: outcome.lastBytes, cap: outcome.capBytes };
    }
    // The boundary guard re-checks the finished encode (its mime
    // is whatever the canvas actually produced — a browser that
    // cannot encode WebP returns PNG, and the doc records THAT).
    const asset = buildBrandingAsset(
      kind,
      outcome.dataUrl,
      outcome.step.width,
      outcome.step.height,
      new Date().toISOString()
    );
    if (!asset) {
      return { ok: false, reason: "tooLarge", actual: outcome.bytes, cap: BRANDING_SPECS[kind].capBytes };
    }
    return { ok: true, asset };
  } catch {
    return { ok: false, reason: "badType" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------------- small controls (the designer's idiom) ---------------- */

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        fontSize: "0.95rem",
        cursor: disabled ? "default" : "pointer",
        padding: "4px 0",
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function Segmented<T extends string>({
  options,
  value,
  disabled,
  onChange,
}: {
  options: Array<{ id: T; key: I18nKey }>;
  value: T;
  disabled?: boolean;
  onChange: (v: T) => void;
}) {
  const { t } = useLang();
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`btn btn-sm ${value === o.id ? "btn-primary" : "btn-ghost"}`}
          aria-pressed={value === o.id}
          disabled={disabled}
          onClick={() => onChange(o.id)}
        >
          {t(o.key)}
        </button>
      ))}
    </div>
  );
}

/* ---------------- the group ---------------- */

const KIND_ROWS: Array<{
  kind: BrandingAssetKind;
  label: I18nKey;
  hint: I18nKey;
  wide?: boolean;
}> = [
  { kind: "logo", label: "print.brand.logo", hint: "print.brand.logoHint" },
  { kind: "letterheadHeader", label: "print.brand.letterheadHeader", hint: "print.brand.letterheadHint", wide: true },
  { kind: "letterheadFooter", label: "print.brand.letterheadFooter", hint: "print.brand.letterheadHint", wide: true },
  { kind: "stamp", label: "print.brand.stamp", hint: "print.brand.stampHint" },
  { kind: "signature", label: "print.brand.signature", hint: "print.brand.signatureHint", wide: true },
  { kind: "raastQrImage", label: "print.brand.raastQr", hint: "print.brand.raastNote" },
];

const CHECKER: React.CSSProperties = {
  backgroundImage:
    "repeating-conic-gradient(rgba(120,110,90,0.25) 0% 25%, rgba(0,0,0,0) 0% 50%)",
  backgroundSize: "12px 12px",
  border: "1px solid var(--line, rgba(120,110,90,0.35))",
  borderRadius: 8,
};

/** KB in the design's own convention: the caps are authored as
 *  150 KB = 150,000 bytes, so every figure in this group divides
 *  by 1000 — one unit, no mixed arithmetic on screen. */
const kb = (bytes: number): string => fmtNum(Math.round(bytes / 1000));

export default function BrandAssetsGroup({
  resolved,
  edit,
  disabled,
}: {
  resolved: ResolvedPrintDesign;
  edit: (patch: Partial<PrintDesign>) => void;
  disabled?: boolean;
}) {
  const { branding, setBrandingAsset, removeBrandingAsset } = useStore();
  const { t } = useLang();
  const byKind = brandingByKind(branding);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingKind = useRef<BrandingAssetKind | null>(null);
  const [busyKind, setBusyKind] = useState<BrandingAssetKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const pick = (kind: BrandingAssetKind) => {
    if (disabled || busyKind) return;
    pendingKind.current = kind;
    setError(null);
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const kind = pendingKind.current;
    if (!file || !kind) return;
    setBusyKind(kind);
    setFlash(null);
    setError(null);
    const res = await processFile(kind, file);
    setBusyKind(null);
    if (res.ok) {
      setBrandingAsset(res.asset);
      setFlash(t("print.brand.saved"));
    } else if (res.reason === "badType") {
      setError(t("print.brand.badType"));
    } else {
      setError(
        t("print.brand.tooLarge", { actual: kb(res.actual), cap: kb(res.cap) })
      );
    }
  };

  const remove = (kind: BrandingAssetKind) => {
    if (disabled || busyKind) return;
    removeBrandingAsset(kind);
    setError(null);
    setFlash(t("print.brand.removed"));
  };

  const groupTitle: React.CSSProperties = { fontSize: "1.02rem", margin: "18px 0 8px" };

  return (
    <div>
      <h3 style={groupTitle}>{t("print.brand.title")}</h3>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 12 }}>
        {t("print.brand.sub")}
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        style={{ display: "none" }}
        aria-hidden="true"
        tabIndex={-1}
      />
      {KIND_ROWS.map(({ kind, label, hint, wide }) => {
        const asset = byKind[kind];
        const spec = BRANDING_SPECS[kind];
        return (
          <div key={kind} style={{ padding: "10px 0", borderTop: "1px solid var(--line, rgba(120,110,90,0.2))" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div
                style={{
                  ...CHECKER,
                  width: wide ? 150 : 76,
                  height: 56,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {asset ? (
                  <img
                    src={asset.dataUrl}
                    alt=""
                    style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <span style={{ fontSize: "0.72rem", color: "var(--muted)", padding: 4, textAlign: "center" }}>
                    {t("print.brand.empty")}
                  </span>
                )}
              </div>
              <div style={{ flex: "1 1 260px", minWidth: 240 }}>
                <div style={{ fontWeight: 700, fontSize: "0.98rem" }}>{t(label)}</div>
                <div style={{ color: "var(--muted)", fontSize: "0.86rem", margin: "2px 0 6px" }}>
                  {t(hint)}
                </div>
                {asset ? (
                  <div style={{ fontSize: "0.86rem" }}>
                    {t("print.brand.sizeLine", {
                      size: kb(asset.bytes),
                      w: fmtNum(asset.width),
                      h: fmtNum(asset.height),
                    })}
                    <span style={{ color: "var(--muted)" }}>
                      {" · "}
                      {t("print.brand.capNote", { cap: kb(spec.capBytes) })}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: "0.86rem", color: "var(--muted)" }}>
                    {t("print.brand.capNote", { cap: kb(spec.capBytes) })}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={disabled || busyKind !== null}
                    onClick={() => pick(kind)}
                  >
                    {busyKind === kind
                      ? t("print.brand.compressing")
                      : asset
                        ? t("print.brand.replace")
                        : t("print.brand.upload")}
                  </button>
                  {asset && (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      disabled={disabled || busyKind !== null}
                      onClick={() => remove(kind)}
                    >
                      {t("print.brand.remove")}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {kind === "letterheadFooter" && (
              <Toggle
                label={t("print.brand.letterheadFooterToggle")}
                checked={resolved.showLetterheadFooter}
                disabled={disabled}
                onChange={(v) => edit({ showLetterheadFooter: v })}
              />
            )}
            {kind === "stamp" && (
              <div style={{ marginTop: 8 }}>
                <div className="field" style={{ marginBottom: 8 }}>
                  <label>{t("print.brand.stampMode")}</label>
                  <Segmented<StampMode>
                    options={[
                      { id: "paid", key: "print.brand.stampPaid" },
                      { id: "always", key: "print.brand.stampAlways" },
                      { id: "never", key: "print.brand.stampNever" },
                    ]}
                    value={resolved.stampMode}
                    disabled={disabled}
                    onChange={(v) => edit({ stampMode: v })}
                  />
                </div>
                <div style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: 2 }}>
                  {t("print.brand.stampAlso")}
                </div>
                <Toggle
                  label={t("print.brand.stampNotes")}
                  checked={resolved.stampDocs.notes}
                  disabled={disabled}
                  onChange={(v) => edit({ stampDocs: { ...resolved.stampDocs, notes: v } })}
                />
                <Toggle
                  label={t("print.brand.stampVouchers")}
                  checked={resolved.stampDocs.vouchers}
                  disabled={disabled}
                  onChange={(v) => edit({ stampDocs: { ...resolved.stampDocs, vouchers: v } })}
                />
                <Toggle
                  label={t("print.brand.stampQuotes")}
                  checked={resolved.stampDocs.quotations}
                  disabled={disabled}
                  onChange={(v) => edit({ stampDocs: { ...resolved.stampDocs, quotations: v } })}
                />
              </div>
            )}
            {kind === "signature" && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: 2 }}>
                  {t("print.brand.signOn")}
                </div>
                <Toggle
                  label={t("print.brand.signVouchers")}
                  checked={resolved.signDocs.vouchers}
                  disabled={disabled}
                  onChange={(v) => edit({ signDocs: { ...resolved.signDocs, vouchers: v } })}
                />
                <Toggle
                  label={t("print.brand.signSlips")}
                  checked={resolved.signDocs.salarySlips}
                  disabled={disabled}
                  onChange={(v) => edit({ signDocs: { ...resolved.signDocs, salarySlips: v } })}
                />
              </div>
            )}
          </div>
        );
      })}
      {branding.length > 0 && (
        <div style={{ fontSize: "0.86rem", color: "var(--muted)", marginTop: 10 }}>
          {t("print.brand.totalLine", { size: kb(brandingTotalBytes(branding)) })}
        </div>
      )}
      {error && (
        <div role="alert" style={{ color: "var(--danger)", fontSize: "0.9rem", marginTop: 10 }}>
          {error}
        </div>
      )}
      {flash && !error && (
        <div style={{ color: "var(--accent-text)", fontWeight: 700, fontSize: "0.92rem", marginTop: 10 }}>
          {flash}
        </div>
      )}
    </div>
  );
}
