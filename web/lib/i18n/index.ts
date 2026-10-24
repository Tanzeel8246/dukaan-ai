/**
 * Dukaan AI — complete four-locale i18n (EN / اردو / پښتو / فارسی).
 *
 * Architecture: the dictionary is split into per-module part files under
 * ./parts (common, shell, auth, settings, dash, sales, billing, inv, sup,
 * cust, credit, exp, fin, dc, ai). Each part exports `en<Part>` (as const)
 * and `ur<Part>` typed as Record<keyof typeof en<Part>, string>, so the two
 * languages can never drift apart inside a part. This index merges all
 * parts; the merged `ur` is typed Record<I18nKey, string>, so a key missing
 * from ANY part fails compilation.
 *
 * Pashto (ps) and Farsi/Dari (fa) — Phase H design §4 — live in satellite
 * part files (./parts/<part>.ps.ts / <part>.fa.ts), each typed the same
 * way against its en part, so a missing PS/FA key also fails compilation.
 * PS/FA are MACHINE DRAFTS: every key carries a draft|reviewed state in
 * review-manifest.json (see ./review.ts); there is no runtime machine
 * translation anywhere — the shipped dictionaries are static text.
 *
 * Rules:
 * - Every user-visible UI string lives here — components call t("part.key").
 * - Interpolation: "Hello {name}" + t(key, { name }) — placeholders are
 *   {word} tokens replaced at render time.
 * - NOT translated (data, not UI): user-entered names/notes, brand names
 *   (Dukaan AI, CodeHubb, JazzCash, Easypaisa), SKUs, emails.
 * - Numerals are always standard digits (0-9) in all four languages.
 */
import { enCommon, urCommon } from "./parts/common";
import { enShell, urShell } from "./parts/shell";
import { enAuth, urAuth } from "./parts/auth";
import { enSettings, urSettings } from "./parts/settings";
import { enDash, urDash } from "./parts/dash";
import { enSales, urSales } from "./parts/sales";
import { enBilling, urBilling } from "./parts/billing";
import { enInv, urInv } from "./parts/inv";
import { enSup, urSup } from "./parts/sup";
import { enCust, urCust } from "./parts/cust";
import { enCredit, urCredit } from "./parts/credit";
import { enExp, urExp } from "./parts/exp";
import { enFin, urFin } from "./parts/fin";
import { enTax, urTax } from "./parts/tax";
import { enDc, urDc } from "./parts/dc";
import { enAi, urAi } from "./parts/ai";
import { enDocs, urDocs } from "./parts/docs";
import { enNotes, urNotes } from "./parts/notes";
import { enChq, urChq } from "./parts/chq";
import { enReports, urReports } from "./parts/reports";
import { enWh, urWh } from "./parts/wh";
import { enTr, urTr } from "./parts/tr";
import { enMfg, urMfg } from "./parts/mfg";
import { enJobs, urJobs } from "./parts/jobs";
import { enHr, urHr } from "./parts/hr";
import { enPrint, urPrint } from "./parts/print";
import { enLoyalty, urLoyalty } from "./parts/loyalty";
import { enPlatform, urPlatform } from "./parts/platform";
import { enStore, urStore } from "./parts/store";
import { enWa, urWa } from "./parts/wa";
import { enDemo, urDemo } from "./parts/demo";
import { enTrash, urTrash } from "./parts/trash";
import { psCommon } from "./parts/common.ps";
import { faCommon } from "./parts/common.fa";
import { psShell } from "./parts/shell.ps";
import { faShell } from "./parts/shell.fa";
import { psAuth } from "./parts/auth.ps";
import { faAuth } from "./parts/auth.fa";
import { psSettings } from "./parts/settings.ps";
import { faSettings } from "./parts/settings.fa";
import { psDash } from "./parts/dash.ps";
import { faDash } from "./parts/dash.fa";
import { psSales } from "./parts/sales.ps";
import { faSales } from "./parts/sales.fa";
import { psBilling } from "./parts/billing.ps";
import { faBilling } from "./parts/billing.fa";
import { psInv } from "./parts/inv.ps";
import { faInv } from "./parts/inv.fa";
import { psSup } from "./parts/sup.ps";
import { faSup } from "./parts/sup.fa";
import { psCust } from "./parts/cust.ps";
import { faCust } from "./parts/cust.fa";
import { psCredit } from "./parts/credit.ps";
import { faCredit } from "./parts/credit.fa";
import { psExp } from "./parts/exp.ps";
import { faExp } from "./parts/exp.fa";
import { psFin } from "./parts/fin.ps";
import { faFin } from "./parts/fin.fa";
import { psTax } from "./parts/tax.ps";
import { faTax } from "./parts/tax.fa";
import { psDc } from "./parts/dc.ps";
import { faDc } from "./parts/dc.fa";
import { psAi } from "./parts/ai.ps";
import { faAi } from "./parts/ai.fa";
import { psDocs } from "./parts/docs.ps";
import { faDocs } from "./parts/docs.fa";
import { psNotes } from "./parts/notes.ps";
import { faNotes } from "./parts/notes.fa";
import { psChq } from "./parts/chq.ps";
import { faChq } from "./parts/chq.fa";
import { psReports } from "./parts/reports.ps";
import { faReports } from "./parts/reports.fa";
import { psWh } from "./parts/wh.ps";
import { faWh } from "./parts/wh.fa";
import { psTr } from "./parts/tr.ps";
import { faTr } from "./parts/tr.fa";
import { psMfg } from "./parts/mfg.ps";
import { faMfg } from "./parts/mfg.fa";
import { psJobs } from "./parts/jobs.ps";
import { faJobs } from "./parts/jobs.fa";
import { psHr } from "./parts/hr.ps";
import { faHr } from "./parts/hr.fa";
import { psPrint } from "./parts/print.ps";
import { faPrint } from "./parts/print.fa";
import { psLoyalty } from "./parts/loyalty.ps";
import { faLoyalty } from "./parts/loyalty.fa";
import { psPlatform } from "./parts/platform.ps";
import { faPlatform } from "./parts/platform.fa";
import { psStore } from "./parts/store.ps";
import { faStore } from "./parts/store.fa";
import { psWa } from "./parts/wa.ps";
import { faWa } from "./parts/wa.fa";
import { psDemo } from "./parts/demo.ps";
import { faDemo } from "./parts/demo.fa";
import { psTrash } from "./parts/trash.ps";
import { faTrash } from "./parts/trash.fa";

export type Lang = "en" | "ur" | "ps" | "fa";

/** All locales, in picker order. */
export const LANGS: readonly Lang[] = ["en", "ur", "ps", "fa"];

/** RTL locales: Urdu (Nastaliq) + Pashto/Farsi (Naskh) share the
 *  shell's direction flip wholesale (Phase H design §4.5). */
export const RTL_LANGS: readonly Lang[] = ["ur", "ps", "fa"];

export function isRtlLang(l: Lang): boolean {
  return l === "ur" || l === "ps" || l === "fa";
}

export function langDir(l: Lang): "rtl" | "ltr" {
  return isRtlLang(l) ? "rtl" : "ltr";
}

/** Locales whose script is Naskh (never Nastaliq — §4.5). */
export function isNaskhLang(l: Lang): boolean {
  return l === "ps" || l === "fa";
}

export const LANG_STORAGE_KEY = "dukaan-ai-lang";

export const en = {
  ...enCommon,
  ...enShell,
  ...enAuth,
  ...enSettings,
  ...enDash,
  ...enSales,
  ...enBilling,
  ...enInv,
  ...enSup,
  ...enCust,
  ...enCredit,
  ...enExp,
  ...enFin,
  ...enTax,
  ...enDc,
  ...enAi,
  ...enDocs,
  ...enNotes,
  ...enChq,
  ...enReports,
  ...enWh,
  ...enTr,
  ...enMfg,
  ...enJobs,
  ...enHr,
  ...enPrint,
  ...enLoyalty,
  ...enPlatform,
  ...enStore,
  ...enWa,
  ...enDemo,
  ...enTrash,
} as const;

export type I18nKey = keyof typeof en;

export const ur: Record<I18nKey, string> = {
  ...urCommon,
  ...urShell,
  ...urAuth,
  ...urSettings,
  ...urDash,
  ...urSales,
  ...urBilling,
  ...urInv,
  ...urSup,
  ...urCust,
  ...urCredit,
  ...urExp,
  ...urFin,
  ...urTax,
  ...urDc,
  ...urAi,
  ...urDocs,
  ...urNotes,
  ...urChq,
  ...urReports,
  ...urWh,
  ...urTr,
  ...urMfg,
  ...urJobs,
  ...urHr,
  ...urPrint,
  ...urLoyalty,
  ...urPlatform,
  ...urStore,
  ...urWa,
  ...urDemo,
  ...urTrash,
};

export const ps: Record<I18nKey, string> = {
  ...psCommon,
  ...psShell,
  ...psAuth,
  ...psSettings,
  ...psDash,
  ...psSales,
  ...psBilling,
  ...psInv,
  ...psSup,
  ...psCust,
  ...psCredit,
  ...psExp,
  ...psFin,
  ...psTax,
  ...psDc,
  ...psAi,
  ...psDocs,
  ...psNotes,
  ...psChq,
  ...psReports,
  ...psWh,
  ...psTr,
  ...psMfg,
  ...psJobs,
  ...psHr,
  ...psPrint,
  ...psLoyalty,
  ...psPlatform,
  ...psStore,
  ...psWa,
  ...psDemo,
  ...psTrash,
};

export const fa: Record<I18nKey, string> = {
  ...faCommon,
  ...faShell,
  ...faAuth,
  ...faSettings,
  ...faDash,
  ...faSales,
  ...faBilling,
  ...faInv,
  ...faSup,
  ...faCust,
  ...faCredit,
  ...faExp,
  ...faFin,
  ...faTax,
  ...faDc,
  ...faAi,
  ...faDocs,
  ...faNotes,
  ...faChq,
  ...faReports,
  ...faWh,
  ...faTr,
  ...faMfg,
  ...faJobs,
  ...faHr,
  ...faPrint,
  ...faLoyalty,
  ...faPlatform,
  ...faStore,
  ...faWa,
  ...faDemo,
  ...faTrash,
};

export const DICTS: Record<Lang, Record<I18nKey, string>> = { en, ur, ps, fa };

export type TParams = Record<string, string | number>;

/** Look up `key` in `lang`, replacing {placeholder} tokens from `params`. */
export function translate(lang: Lang, key: I18nKey, params?: TParams): string {
  const raw = DICTS[lang][key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) =>
    params[name] !== undefined ? String(params[name]) : m
  );
}
