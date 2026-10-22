/**
 * Dukaan AI — complete bilingual i18n (EN / اردو).
 *
 * Architecture: the dictionary is split into per-module part files under
 * ./parts (common, shell, auth, settings, dash, sales, billing, inv, sup,
 * cust, credit, exp, fin, dc, ai). Each part exports `en<Part>` (as const)
 * and `ur<Part>` typed as Record<keyof typeof en<Part>, string>, so the two
 * languages can never drift apart inside a part. This index merges all
 * parts; the merged `ur` is typed Record<I18nKey, string>, so a key missing
 * from ANY part fails compilation.
 *
 * Rules:
 * - Every user-visible UI string lives here — components call t("part.key").
 * - Interpolation: "Hello {name}" + t(key, { name }) — placeholders are
 *   {word} tokens replaced at render time.
 * - NOT translated (data, not UI): user-entered names/notes, brand names
 *   (Dukaan AI, CodeHubb, JazzCash, Easypaisa), SKUs, emails.
 * - Numerals are always standard digits (0-9) in both languages.
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

export type Lang = "en" | "ur";

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
};

export type TParams = Record<string, string | number>;

/** Look up `key` in `lang`, replacing {placeholder} tokens from `params`. */
export function translate(lang: Lang, key: I18nKey, params?: TParams): string {
  const raw = (lang === "ur" ? ur : en)[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name: string) =>
    params[name] !== undefined ? String(params[name]) : m
  );
}
