"use client";

/**
 * The Reports section's ONE print sheet — built on the same print
 * shell as the B6 voucher/document sheets (`.receipt-sheet` +
 * `.receipt`): in print, everything else is hidden and only this
 * sheet renders, full width. Print and "Save as PDF" both come
 * through here into the browser print flow — deliberately, because
 * browser rendering is what shapes Urdu script correctly in the
 * resulting PDF (no client PDF library is involved).
 *
 * The sheet is a DUMB renderer: the view builds every string from
 * the report builders' output in the CHOSEN output language
 * (independent of the app UI language), so the printed figures are
 * the on-screen figures by construction. When the output language
 * is Urdu the sheet carries its own `dir="rtl"` + Nastaliq class —
 * the page around it may well be in English.
 */
import { isNaskhLang, langDir, translate, type Lang } from "@/lib/i18n";
import { resolvePrintDesign } from "@/lib/print";
import { PrintFooter, PrintHeader, PrintPageStyle, type PrintAssets } from "./PrintChrome";
import type { ShopSettings } from "@/lib/types";

export interface ReportSheetSection {
  heading?: string;
  columns: string[];
  /** Body rows, already formatted as strings in the output language. */
  rows: string[][];
  /** Optional emphasised closing rows (e.g. a group total). */
  foot?: string[][];
}

export interface ReportSheetData {
  title: string;
  period: string;
  generatedAt: string;
  sections: ReportSheetSection[];
  /** Headline label/value pairs printed under the sections. */
  totals: Array<[string, string]>;
}

export default function ReportPrintSheet({
  data,
  settings,
  outLang,
  assets,
}: {
  data: ReportSheetData;
  settings: ShopSettings;
  outLang: Lang;
  /** Phase E · E2: brand assets — reports gain the letterhead
   *  header/footer chrome (§2.3); every other slot stays off for
   *  reports under the §1.5 matrix. */
  assets?: PrintAssets | null;
}) {
  const tr = (key: Parameters<typeof translate>[1]) => translate(outLang, key);
  // Reports are always A4 (§1.5): the template's header toggles
  // and footer note dress the report, its paper never applies —
  // the chrome is fed the design with the paper pinned to A4 so
  // its suppression rules judge the sheet actually printing.
  const design = { ...resolvePrintDesign(settings), paper: "a4" as const };
  return (
    <div
      className="receipt-sheet"
      dir={langDir(outLang)}
      lang={outLang}
      aria-hidden="true"
    >
      <PrintPageStyle paper="a4" />
      <div className={`receipt report-doc${outLang === "ur" ? " ur" : isNaskhLang(outLang) ? " naskh" : ""}`}>
        <PrintHeader settings={settings} design={design} assets={assets} />
        <div className="r-title">
          <span>{data.title}</span>
          <span>{data.period}</span>
        </div>
        <div className="r-meta">
          <span>{tr("rep.generatedAt")}</span>
          <span>{data.generatedAt}</span>
        </div>
        {data.sections.map((sec, i) => (
          <div key={i}>
            {sec.heading && <h4 className="rep-sec">{sec.heading}</h4>}
            <table>
              <thead>
                <tr>
                  {sec.columns.map((c, j) => (
                    <th key={j} className={j > 0 ? "num" : undefined}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sec.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} className={ci > 0 ? "num" : undefined}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {sec.foot && sec.foot.length > 0 && (
                <tfoot>
                  {sec.foot.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} className={ci > 0 ? "num" : undefined}>
                          <b>{cell}</b>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tfoot>
              )}
            </table>
          </div>
        ))}
        {data.totals.map(([label, value]) => (
          <div className="r-row" key={label}>
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
        <PrintFooter
          settings={settings}
          design={design}
          assets={assets}
          doc={{ kind: "report" }}
          footText={tr("rep.footer")}
        />
      </div>
    </div>
  );
}
