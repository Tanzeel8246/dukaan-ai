"use client";

/**
 * Phase E · E1 — Settings → Print & branding (the Template
 * group; E2 joins it with the Brand assets group below the form
 * — components/BrandAssets.tsx — while Raast and the device
 * lock get their own cards in E3/E4). The owner edits
 * an UNSAVED PrintDesign draft; every control re-renders the
 * live preview instantly, and Save writes `settings.printDesign`
 * once via updateSettings (design §1.8).
 *
 * Defaults discipline: the draft starts from the shop's SAVED
 * design (absent ⇒ {}), controls display RESOLVED values
 * (resolvePrintDesign), and the preview opens showing exactly
 * what prints today. Reset writes the empty object — through
 * the single resolver seam an empty design IS absence (today's
 * look), and this store's merge-write has no field-delete, so
 * {} is how "back to no template" is recorded.
 *
 * The preview renders the REAL sheets (BillPrintSheet /
 * DocPrintSheet) against the lib/print sample fixtures, inside
 * a screen-only frame that sits outside `.receipt-sheet` — the
 * sample can never reach paper.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./StoreProvider";
import { useLang } from "./LangProvider";
import BrandAssetsGroup from "./BrandAssets";
import { brandingDataUrls } from "@/lib/branding";
import type { I18nKey } from "@/lib/i18n";
import {
  resolvePrintDesign,
  sampleBill,
  sampleProducts,
  sampleQuotation,
  type ResolvedPrintDesign,
} from "@/lib/print";
import type { PrintDesign, PrintPaper } from "@/lib/types";
import DocPrintSheet, { BillPrintSheet } from "./DocPrintSheet";

const PAPER_OPTIONS: Array<{ id: PrintPaper; key: I18nKey }> = [
  { id: "a4", key: "print.paper.a4" },
  { id: "a4-compact", key: "print.paper.a4compact" },
  { id: "a5", key: "print.paper.a5" },
  { id: "thermal80", key: "print.paper.thermal80" },
];

const HEADER_MODES: Array<{ id: NonNullable<PrintDesign["headerMode"]>; key: I18nKey }> = [
  { id: "text", key: "print.headerMode.text" },
  { id: "letterhead", key: "print.headerMode.letterhead" },
  { id: "logo-text", key: "print.headerMode.logoText" },
];

const LOGO_SIZES: Array<{ id: NonNullable<PrintDesign["logoSize"]>; key: I18nKey }> = [
  { id: "s", key: "print.logoSize.s" },
  { id: "m", key: "print.logoSize.m" },
  { id: "l", key: "print.logoSize.l" },
];

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

function OptionRow<T extends string>({
  label,
  options,
  value,
  disabled,
  onChange,
}: {
  label: string;
  options: Array<{ id: T; key: I18nKey }>;
  value: T;
  disabled?: boolean;
  onChange: (v: T) => void;
}) {
  const { t } = useLang();
  return (
    <div className="field">
      <label>{label}</label>
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
    </div>
  );
}

export default function PrintDesignerSection() {
  const { settings, branding, updateSettings, isStaff } = useStore();
  const { t } = useLang();

  const [draft, setDraft] = useState<PrintDesign>(() => settings.printDesign ?? {});
  const [altName, setAltName] = useState<string>(() => settings.shopNameAlt ?? "");
  const [tab, setTab] = useState<"bill" | "quote">("bill");
  const [savedFlag, setSavedFlag] = useState(false);
  const dirtyRef = useRef(false);
  const syncedRef = useRef<string>(JSON.stringify(settings.printDesign ?? {}));

  // Re-hydrate from settings only when the SAVED design changed
  // underneath us and the owner has no unsaved edits in flight.
  useEffect(() => {
    const incoming = JSON.stringify(settings.printDesign ?? {});
    if (incoming !== syncedRef.current && !dirtyRef.current) {
      syncedRef.current = incoming;
      setDraft(settings.printDesign ?? {});
      setAltName(settings.shopNameAlt ?? "");
    }
  }, [settings.printDesign, settings.shopNameAlt]);

  const edit = (patch: Partial<PrintDesign>) => {
    dirtyRef.current = true;
    setSavedFlag(false);
    setDraft((d) => ({ ...d, ...patch }));
  };

  const resolved: ResolvedPrintDesign = useMemo(
    () => resolvePrintDesign({ ...settings, printDesign: draft }),
    [settings, draft]
  );
  const previewSettings = useMemo(
    () => ({ ...settings, printDesign: draft, shopNameAlt: altName }),
    [settings, draft, altName]
  );
  const bill = useMemo(() => sampleBill(), []);
  const quote = useMemo(() => sampleQuotation(), []);
  const prods = useMemo(() => sampleProducts(), []);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaff) return;
    updateSettings({ printDesign: draft, shopNameAlt: altName.trim() });
    syncedRef.current = JSON.stringify(draft);
    dirtyRef.current = false;
    setSavedFlag(true);
  };

  const reset = () => {
    if (isStaff) return;
    updateSettings({ printDesign: {} });
    syncedRef.current = "{}";
    dirtyRef.current = false;
    setDraft({});
    setSavedFlag(true);
  };

  const groupTitle: React.CSSProperties = {
    fontSize: "1.02rem",
    margin: "18px 0 8px",
  };

  return (
    <section className="card" aria-label={t("print.title")}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("print.title")}</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
        {t("print.sub")}
      </p>
      <form className="form" onSubmit={save}>
        <OptionRow
          label={t("print.paper")}
          options={PAPER_OPTIONS}
          value={resolved.paper}
          disabled={isStaff}
          onChange={(v) => edit({ paper: v })}
        />
        <OptionRow
          label={t("print.fontScale")}
          options={[
            { id: "standard" as const, key: "print.fontScale.standard" as I18nKey },
            { id: "large" as const, key: "print.fontScale.large" as I18nKey },
          ]}
          value={resolved.fontScale}
          disabled={isStaff}
          onChange={(v) => edit({ fontScale: v })}
        />

        <h3 style={groupTitle}>{t("print.headerTitle")}</h3>
        <OptionRow
          label={t("print.headerMode")}
          options={HEADER_MODES}
          value={resolved.headerMode}
          disabled={isStaff}
          onChange={(v) => edit({ headerMode: v })}
        />
        <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: "2px 0 10px" }}>
          {t("print.headerModeNote")}
        </p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="pd-altname">{t("print.shopNameAlt")}</label>
            <input
              id="pd-altname"
              value={altName}
              onChange={(e) => {
                dirtyRef.current = true;
                setSavedFlag(false);
                setAltName(e.target.value);
              }}
              placeholder={t("print.shopNameAltPh")}
              disabled={isStaff}
            />
          </div>
          <OptionRow
            label={t("print.logoSize")}
            options={LOGO_SIZES}
            value={resolved.logoSize}
            disabled={isStaff}
            onChange={(v) => edit({ logoSize: v })}
          />
        </div>
        <Toggle label={t("print.showLogo")} checked={resolved.showLogo} disabled={isStaff} onChange={(v) => edit({ showLogo: v })} />
        <Toggle label={t("print.showShopName")} checked={resolved.showShopName} disabled={isStaff} onChange={(v) => edit({ showShopName: v })} />
        <Toggle label={t("print.showShopNameAlt")} checked={resolved.showShopNameAlt} disabled={isStaff} onChange={(v) => edit({ showShopNameAlt: v })} />
        <Toggle label={t("print.showAddress")} checked={resolved.showAddress} disabled={isStaff} onChange={(v) => edit({ showAddress: v })} />
        <Toggle label={t("print.showPhone")} checked={resolved.showPhone} disabled={isStaff} onChange={(v) => edit({ showPhone: v })} />

        <h3 style={groupTitle}>{t("print.columnsTitle")}</h3>
        <Toggle label={t("print.colSku")} checked={resolved.colSku} disabled={isStaff} onChange={(v) => edit({ colSku: v })} />
        <Toggle label={t("print.colUrduName")} checked={resolved.colUrduName} disabled={isStaff} onChange={(v) => edit({ colUrduName: v })} />
        <Toggle label={t("print.colTax")} checked={resolved.colTax} disabled={isStaff} onChange={(v) => edit({ colTax: v })} />
        <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: "2px 0 6px" }}>
          {t("print.colTaxNote")}
        </p>
        <Toggle label={t("print.colDiscount")} checked={resolved.colDiscount} disabled={isStaff} onChange={(v) => edit({ colDiscount: v })} />

        <h3 style={groupTitle}>{t("print.footerTitle")}</h3>
        <div className="field">
          <label htmlFor="pd-footernote">{t("print.footerNote")}</label>
          <input
            id="pd-footernote"
            value={draft.footerNote ?? ""}
            onChange={(e) => edit({ footerNote: e.target.value })}
            placeholder={t("print.footerNotePh")}
            disabled={isStaff}
          />
        </div>
        <div className="field">
          <label htmlFor="pd-terms">{t("print.termsText")}</label>
          <textarea
            id="pd-terms"
            value={draft.termsText ?? ""}
            onChange={(e) => edit({ termsText: e.target.value })}
            placeholder={t("print.termsPh")}
            rows={3}
            disabled={isStaff}
          />
        </div>
        <Toggle label={t("print.showThanks")} checked={resolved.showThanks} disabled={isStaff} onChange={(v) => edit({ showThanks: v })} />
        <div className="field">
          <label htmlFor="pd-thanks">{t("print.thanksText")}</label>
          <input
            id="pd-thanks"
            value={draft.thanksText ?? ""}
            onChange={(e) => edit({ thanksText: e.target.value })}
            placeholder={t("print.thanksPh")}
            disabled={isStaff}
          />
        </div>
        <Toggle label={t("print.showSignature")} checked={resolved.showSignature} disabled={isStaff} onChange={(v) => edit({ showSignature: v })} />

        <div className="form-actions-sticky" style={{ marginTop: 18 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button type="submit" className="btn btn-primary" disabled={isStaff}>
              {t("action.save")}
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset} disabled={isStaff}>
              {t("print.reset")}
            </button>
            {savedFlag && !isStaff && (
              <span style={{ color: "var(--accent-text)", fontWeight: 700, fontSize: "0.92rem" }}>
                {t("print.saved")}
              </span>
            )}
          </div>
        </div>
      </form>

      {/* Phase E · E2: the Brand assets group — uploads save
          immediately (they are documents, not design); its
          design-side toggles ride the same draft + Save above. */}
      <BrandAssetsGroup resolved={resolved} edit={edit} disabled={isStaff} />
      {/* MC Billing workflow adoption 2026-10-27 (WEB, plan §4):
          print uses ONLY this business's own branding/letterhead
          from its own settings — never another tenant's stored
          image. Tax-invoice format comes from the sheet's tax
          columns; the Raast QR slot shows the bank-issued image
          when one is saved, and a generated QR stays labelled
          provisional in the sheet itself. */}
      <p className="hint" style={{ marginTop: 10 }}>
        پرنٹ پر صرف اسی دکان کا اپنا لیٹرہیڈ/لوگو آتا ہے — کسی دوسری دکان کا stored امیج کبھی نہیں۔ Raast QR سلاٹ میں بینک کا جاری کردہ امیج لگتا ہے؛ خود بنایا ہوا QR provisional رہتا ہے۔
      </p>

      <h3 style={{ ...groupTitle, marginTop: 26 }}>{t("print.previewTitle")}</h3>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button
          type="button"
          className={`btn btn-sm ${tab === "bill" ? "btn-primary" : "btn-ghost"}`}
          aria-pressed={tab === "bill"}
          onClick={() => setTab("bill")}
        >
          {t("print.previewBill")}
        </button>
        <button
          type="button"
          className={`btn btn-sm ${tab === "quote" ? "btn-primary" : "btn-ghost"}`}
          aria-pressed={tab === "quote"}
          onClick={() => setTab("quote")}
        >
          {t("print.previewQuote")}
        </button>
      </div>
      <div className="print-preview-frame">
        <div className="print-sample-badge">{t("print.sampleBadge")}</div>
        {tab === "bill" ? (
          <BillPrintSheet bill={bill} settings={previewSettings} products={prods} assets={brandingDataUrls(branding)} preview />
        ) : (
          <DocPrintSheet doc={quote} kind="quotation" settings={previewSettings} products={prods} assets={brandingDataUrls(branding)} preview />
        )}
      </div>
    </section>
  );
}
