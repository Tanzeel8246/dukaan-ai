/** i18n part: ai — Farsi / Dari (فارسی) DRAFT dictionary (Phase H design §4.1).
 *  Machine-drafted once at build time; every key's review state lives in
 *  ../review-manifest.json. A draft is a starting point for a named human
 *  reviewer — never finished copy, never runtime translation. */
import type { enAi } from "./ai";

export const faAi: Record<keyof typeof enAi, string> = {
  "ai.title": "دستیار AI",
  "ai.eyebrow": "اردو · English",
  "ai.subtitle": "به اردو یا انگلیسی بپرسید — هر پاسخ زنده از معلومات دکان شما محاسبه می‌شود. آغازگرهای زیر را امتحان کنید.",
  "ai.loading": "دستیار بیدار می‌شود…",
  "ai.placeholder": "درباره دکان خود هر چیزی بپرسید…",
  "ai.inputLabel": "از دستیار AI بپرسید",
  "ai.send": "بفرستید",
  "ai.sendLabel": "پیام بفرستید",
  "ai.typing": "دستیار می‌نویسد",
  "ai.chatLabel": "گفتگو با Dukaan AI",
  "ai.error": "معذرت می‌خواهم، هنگام پاسخ دادن مشکل پیش آمد. لطفاً دوباره تلاش کنید.",
  "ai.note": "پاسخ‌ها بر اساس معلومات دکان شما است. در نشر زنده، دستیار مبتنی بر Gemini (از طریق /api/chat) اول پاسخ می‌دهد؛ انجن داخل دستگاه بقیه همه چیز را اداره می‌کند — نه کلید لازم است، نه شبکه، هیچ مشکلی نیست.",
};
