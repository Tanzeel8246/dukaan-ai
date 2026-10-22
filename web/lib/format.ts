/** Dukaan AI — number / currency / date formatting helpers.
 *
 * Language-aware: LangProvider calls setFormatLang() whenever the UI
 * language changes, so fmtPKR / fmtUnit / fmtDate / fmtWeekday render in
 * the active language. Numerals are always standard digits (0-9).
 */
import { translate, type I18nKey, type Lang } from "./i18n";

const num = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 });

let currentLang: Lang = "ur";

/** Called by LangProvider on mount and on every language change. */
export function setFormatLang(l: Lang): void {
  currentLang = l;
}

export function getFormatLang(): Lang {
  return currentLang;
}

/** 2600 -> "Rs 2,600" (EN) / "روپے 2,600" (UR) */
export function fmtPKR(n: number): string {
  return `${translate(currentLang, "common.currency")} ${num.format(Math.round(n))}`;
}

/** 2600 -> "2,600" */
export function fmtNum(n: number): string {
  return num.format(Math.round(n));
}

/** 4.666 -> "4.7" */
export function fmt1(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

const UNIT_LABELS: Record<Lang, Record<string, string>> = {
  en: { pcs: "pcs", kg: "kg", L: "L", dozen: "dozen", packet: "packet", bag: "bag" },
  ur: { pcs: "پیس", kg: "کلو", L: "لیٹر", dozen: "درجن", packet: "پیکٹ", bag: "تھیلا" },
};

/** Unit label in the active language; unknown units pass through raw. */
export function fmtUnit(unit: string): string {
  return UNIT_LABELS[currentLang][unit] ?? unit;
}

/** "pcs" -> "پیس", "kg" -> "کلو", "bag" -> "تھیلا" (legacy Urdu-only helper). */
export function unitUrdu(unit: string): string {
  if (unit === "kg") return "کلو";
  if (unit === "bag") return "تھیلا";
  return "پیس";
}

function toDate(input: string | number | Date): Date {
  return input instanceof Date ? input : new Date(input);
}

/** "12 Oct 2026" style — "12 October 2026" (EN) / "12 اکتوبر 2026" (UR). */
export function fmtDate(input: string | number | Date): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return "";
  const month = translate(currentLang, `common.month.${d.getMonth()}` as I18nKey);
  return `${d.getDate()} ${month} ${d.getFullYear()}`;
}

/** "12/10/2026" in both modes. */
export function fmtDateShort(input: string | number | Date): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/** Weekday name in the active language, e.g. "Monday" / "پیر". */
export function fmtWeekday(input: string | number | Date): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return "";
  return translate(currentLang, `common.weekday.${d.getDay()}` as I18nKey);
}
