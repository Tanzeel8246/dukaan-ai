"use client";

/**
 * Phase E · E1 — the shared print chrome (design: ERP-PHASE-E-
 * DESIGN.md §1.3). The header/footer that nine sheets used to
 * hand-copy live here once, driven by the resolved PrintDesign
 * (lib/print.ts). Sheets keep their BODIES — line tables, totals,
 * document-specific blocks — untouched in structure; under the
 * default design (no printDesign saved) this chrome renders
 * exactly what the hand-copied markup rendered.
 *
 * Assets (logo / letterhead / stamp / signature images) landed
 * in E2: every sheet threads the shop's `brandingDataUrls` map
 * (lib/branding) into this chrome, and the slots below render
 * from it under their suppression rules (letterhead/stamp never
 * on thermal, the stamp only when lib/print's `stampVisible`
 * rule fires, the shop signature only in its §1.5 slots). An
 * absent map — a shop with no assets — renders nothing, which
 * is exactly the E1 behaviour.
 */
import { useLang } from "./LangProvider";
import { fmtNum, fmtPKR } from "@/lib/format";
import {
  letterheadFooterVisible,
  letterheadHeaderVisible,
  logoVisible,
  paperPageRule,
  printLineDiscounts,
  printLineTax,
  productPrintInfo,
  resolveItemColumns,
  shopSignatureVisible,
  slotsFor,
  stampVisible,
  type PrintDocKind,
  type ResolvedPrintDesign,
} from "@/lib/print";
import type { PrintPaper, Product, ShopSettings } from "@/lib/types";
import {
  groupIban,
  resolveRaastBlock,
  type RaastDocContext,
} from "@/lib/raast";
import { resolveStorefrontLink } from "@/lib/storefront";
import QrCode from "./QrCode";

/** Brand-asset data-URLs by slot (E2's BrandingAssets map adapts
 *  to this shape). Absent/null ⇒ the slot renders nothing. */
export interface PrintAssets {
  logo?: string | null;
  letterheadHeader?: string | null;
  letterheadFooter?: string | null;
  stamp?: string | null;
  signature?: string | null;
  raastQrImage?: string | null;
}

/** Quantity formatting preserves each family's historical
 *  convention: the document sheets print integers raw, the bill
 *  receipt groups them (fmtNum) — both round fractions to 3dp. */
function fmtQty(n: number, grouped: boolean): string {
  if (Number.isInteger(n)) return grouped ? fmtNum(n) : String(n);
  return String(Math.round(n * 1000) / 1000);
}

/** The sheet's own `@page` rule (§1.7). Rendered ONLY inside the
 *  sheet instance that is the current print target — never in
 *  always-mounted lists or the designer preview — so two mounted
 *  sheets can never fight over the page rule (R-E7). */
export function PrintPageStyle({ paper }: { paper: PrintPaper }) {
  return <style>{`@page { ${paperPageRule(paper)} }`}</style>;
}

/**
 * The print header: a letterhead banner (mode + asset) OR the
 * text header — logo, shop name, second-script name line, and
 * the address · phone line, each honouring its toggle. When the
 * letterhead replaces the header the text block is suppressed
 * wholesale (a letterhead already carries the name/address).
 */
export function PrintHeader({
  settings,
  design,
  assets,
  fallbackName,
}: {
  settings: ShopSettings;
  design: ResolvedPrintDesign;
  assets?: PrintAssets | null;
  /** The bill receipt's historical fallback when shopName is
   *  empty; other sheets pass nothing and print the name as-is. */
  fallbackName?: string;
}) {
  if (letterheadHeaderVisible(design, !!assets?.letterheadHeader)) {
    return (
      <div className="r-letterhead">
        <img src={assets?.letterheadHeader ?? ""} alt="" />
      </div>
    );
  }
  const showLogo = logoVisible(design, !!assets?.logo, !!assets?.letterheadHeader);
  return (
    <>
      {showLogo && (
        <div className={`r-logo r-logo-${design.logoSize}`}>
          <img src={assets?.logo ?? ""} alt="" />
        </div>
      )}
      {design.showShopName && (
        <h3>{settings.shopName || fallbackName || ""}</h3>
      )}
      {design.showShopNameAlt && settings.shopNameAlt ? (
        <div className="r-alt-name">{settings.shopNameAlt}</div>
      ) : null}
      {(design.showAddress || design.showPhone) && (
        <div className="r-shop">
          {[
            design.showAddress ? settings.address : "",
            design.showPhone ? settings.phone : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
      )}
    </>
  );
}

const THANKS_KINDS: PrintDocKind[] = [
  "bill",
  "quotation",
  "order",
  "voucher",
  "po",
  "note",
];

/**
 * The print footer, in the design's order (§1.3): footer note,
 * terms, the Raast block (E3), the stamp image (when the §2.4
 * rule fires), the letterhead footer banner, the signature
 * slot, the thanks line. Slots a document kind does not have
 * (§1.5 matrix) never render, whatever the design says.
 * Reports pass `footText` — their own closing line in the
 * output language — and get the footer note only.
 *
 * The Raast block (§3.5) resolves through lib/raast's
 * resolveRaastBlock: the bank-issued image (the `raastQrImage`
 * asset) wins whenever it exists; the generated SBP P2P code
 * is the fallback; the caption and the IBAN in grouped text
 * ride beneath either, so a failed scan still leaves a manual
 * Raast transfer possible from the same paper. The generated
 * path is PROVISIONAL — unverified against a real bank QR
 * (lib/raast's framing seam); the honesty copy lives in
 * Settings, where the owner configures it.
 */
export function PrintFooter({
  settings,
  design,
  assets,
  doc,
  footText,
}: {
  settings: ShopSettings;
  design: ResolvedPrintDesign;
  assets?: PrintAssets | null;
  doc: { kind: PrintDocKind; status?: string; billNo?: number; total?: number };
  footText?: string;
}) {
  const { t } = useLang();
  const kind = doc.kind;
  const slots = slotsFor(kind);
  const showNote = slots.footerNote && design.footerNote.trim().length > 0;
  const showTerms = slots.terms && design.termsText.trim().length > 0;
  const raastDoc: RaastDocContext =
    kind === "bill"
      ? {
          kind: "bill",
          billNo: doc.billNo,
          total: doc.total,
          dynamic: design.raastDynamic,
        }
      : kind === "quotation" || kind === "order"
        ? { kind }
        : { kind: "other" };
  const raast = resolveRaastBlock({
    enabled: design.showRaastQr,
    imagePresent: !!assets?.raastQrImage,
    iban: settings.raastIban,
    fiName: settings.raastFiName,
    doc: raastDoc,
    size: design.raastQrSize,
    thermal: design.paper === "thermal80",
  });
  /* Phase H · H3 (§2.3): the store link QR — bills only, and
   * only for a shop that has published (its slug label rides
   * the owner doc). A LINK qr in its own block, never merged
   * into the Raast payment block: paying and ordering are
   * different acts and the paper keeps them apart. */
  const storeLink = kind === "bill" ? resolveStorefrontLink(settings) : null;
  const stamp = stampVisible(design, assets?.stamp, kind, doc.status);
  const letterheadFoot = letterheadFooterVisible(design, !!assets?.letterheadFooter);
  const sig = shopSignatureVisible(design, kind);
  const showThanks =
    footText === undefined && THANKS_KINDS.includes(kind) && design.showThanks;
  return (
    <>
      {showNote && <div className="r-note">{design.footerNote}</div>}
      {showTerms && (
        <div className="r-terms">
          <span className="r-terms-label">{t("print.termsLabel")}: </span>
          {design.termsText}
        </div>
      )}
      {raast.path !== "none" && (
        <div className="r-raast">
          {raast.path === "image" ? (
            <img
              src={assets?.raastQrImage ?? ""}
              alt=""
              style={{ width: `${raast.sizeMm}mm`, height: "auto" }}
            />
          ) : (
            <QrCode payload={raast.payload} sizeMm={raast.sizeMm} />
          )}
          <div className="r-raast-caption">{t("print.raast.caption")}</div>
          {raast.iban && (
            <div className="r-raast-iban">
              {t("print.raast.paperIban")}:{" "}
              <span style={{ direction: "ltr", unicodeBidi: "isolate" }}>
                {groupIban(raast.iban)}
              </span>
            </div>
          )}
        </div>
      )}
      {storeLink && (
        <div className="r-store-link">
          <QrCode payload={storeLink} sizeMm={22} />
          <div className="r-store-link-caption">{t("print.storeLink.caption")}</div>
          <div className="r-store-link-url">{storeLink.replace("https://", "")}</div>
        </div>
      )}
      {stamp && assets?.stamp && (
        <div className="r-stamp">
          <img src={assets.stamp} alt="" />
        </div>
      )}
      {letterheadFoot && (
        <div className="r-letterhead r-letterhead-foot">
          <img src={assets?.letterheadFooter ?? ""} alt="" />
        </div>
      )}
      {sig &&
        (assets?.signature ? (
          <div className="r-meta" style={{ marginTop: kind === "salarySlip" ? 16 : 14 }}>
            <span>
              {kind === "bill"
                ? t("print.authorisedSignature")
                : kind === "voucher"
                  ? t("voucher.signature")
                  : t("slip.signature")}
            </span>
            <span>
              <img className="r-sign-img" src={assets.signature} alt="" />
            </span>
          </div>
        ) : (
          <div className="r-meta" style={{ marginTop: kind === "salarySlip" ? 16 : 14 }}>
            <span>
              {kind === "bill"
                ? t("print.authorisedSignature")
                : kind === "voucher"
                  ? t("voucher.signature")
                  : t("slip.signature")}
            </span>
            <span>____________________</span>
          </div>
        ))}
      {showThanks && (
        <div className="r-foot">{design.thanksText || t("billing.rcpt.thanks")}</div>
      )}
      {footText !== undefined && <div className="r-foot">{footText}</div>}
    </>
  );
}

/** One line of a receipt-family item table, normalised across
 *  bills (BillItem), documents (DocLine) and notes (BillItem). */
export interface PrintTableLine {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
  amount: number;
  /** A4's snapshotted per-line tax (bills/notes only). */
  taxAmount?: number;
}

/**
 * The shared items table for bill / quotation / order / note
 * sheets (§1.4), column order fixed: Item · SKU? · Qty · Price ·
 * Discount? · Tax? · Amount. Optional columns come from the
 * resolved design INTERSECTED with the kind's slots — the table
 * itself enforces the matrix, so a challan can never be given
 * this table with prices (it does not use it at all).
 *
 * `plain` preserves the bill receipt's historical rendering
 * (numeric cells without the `.num` alignment class, exactly as
 * the inline receipt has always printed).
 */
export function PrintItemsTable({
  lines,
  design,
  kind,
  products,
  discountAmount,
  plain,
}: {
  lines: PrintTableLine[];
  design: ResolvedPrintDesign;
  kind: PrintDocKind;
  products?: readonly Product[];
  discountAmount: number;
  plain?: boolean;
}) {
  const { t } = useLang();
  const cols = resolveItemColumns(design, kind);
  const shares = cols.discount
    ? printLineDiscounts(
        lines.map((l) => l.amount),
        discountAmount
      )
    : [];
  const num = plain ? undefined : "num";
  return (
    <table>
      <thead>
        <tr>
          <th>{t("billing.rcpt.item")}</th>
          {cols.sku && <th>{t("print.col.sku")}</th>}
          <th className={num}>{t("billing.rcpt.qty")}</th>
          <th className={num}>{t("billing.rcpt.price")}</th>
          {cols.discount && <th className={num}>{t("print.col.discount")}</th>}
          {cols.tax && <th className={num}>{t("print.col.tax")}</th>}
          <th className={num}>{t("billing.rcpt.amount")}</th>
        </tr>
      </thead>
      <tbody>
        {lines.map((l, i) => {
          const info =
            cols.sku || cols.urduName
              ? productPrintInfo(products, l.productId)
              : { sku: "", urduName: "" };
          const share = shares[i] ?? 0;
          return (
            <tr key={l.productId}>
              <td>
                {l.name}
                {cols.urduName && info.urduName && (
                  <div className="r-urdu-name">{info.urduName}</div>
                )}
              </td>
              {cols.sku && <td>{info.sku}</td>}
              <td className={num}>{fmtQty(l.qty, !!plain)}</td>
              <td className={num}>{fmtPKR(l.unitPrice)}</td>
              {cols.discount && (
                <td className={num}>
                  {share > 0 ? `− ${fmtPKR(share)}` : fmtPKR(0)}
                </td>
              )}
              {cols.tax && <td className={num}>{fmtPKR(printLineTax(l))}</td>}
              <td className={num}>{fmtPKR(l.amount)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
