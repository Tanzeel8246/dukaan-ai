/** i18n part: sales — Farsi / Dari (فارسی) DRAFT dictionary (Phase H design §4.1).
 *  Machine-drafted once at build time; every key's review state lives in
 *  ../review-manifest.json. A draft is a starting point for a named human
 *  reviewer — never finished copy, never runtime translation. */
import type { enSales } from "./sales";

export const faSales: Record<keyof typeof enSales, string> = {
  "sales.eyebrow": "پیشخوان",
  "sales.title": "فروش را ثبت کنید",
  "sales.subtitle": "یک کالا را انتخاب کنید، مقدار را بنویسید — فروش ثبت می‌شود و موجودی فوراً کم می‌شود.",
  "sales.newSaleAria": "فروش جدید",
  "sales.newSale": "فروش جدید",
  "sales.newSaleSub": "مانند پیشخوان دکان کار می‌کند — سریع و ساده.",
  "sales.findProduct": "کالا را پیدا کنید",
  "sales.searchPlaceholder": "کالاها را جستجو کنید — برای انتخاب روی یک نتیجه کلیک کنید…",
  "sales.noResults": "هیچ کالایی با “{query}” مطابقت ندارد.",
  "sales.product": "کالا *",
  "sales.chooseProduct": "— یک کالا انتخاب کنید —",
  "sales.optionLabel": "{name} — {price} ({qty} {unit} در موجودی)",
  "sales.quantity": "مقدار *",
  "sales.decreaseQty": "مقدار را کم کنید",
  "sales.increaseQty": "مقدار را زیاد کنید",
  "sales.stockHint": "{qty} {unit} موجود است · مفاد فی واحد {margin}",
  "sales.recordSale": "فروش را ثبت کنید",
  "sales.errChooseProduct": "لطفاً اول یک کالا انتخاب کنید.",
  "sales.errQtyMin": "مقدار باید حداقل 1 باشد.",
  "sales.errStock": "موجودی کافی نیست — از {name} فقط {qty} {unit} موجود است.",
  "sales.successRecorded": "ثبت شد: {qty} × {name} = {amount}. موجودی به‌روز شد.",
  "sales.errRecordFailed": "فروش ثبت نشد. لطفاً دوباره تلاش کنید.",
  "sales.todayAria": "فروش امروز",
  "sales.todayCounter": "پیشخوان امروز",
  "sales.statRevenue": "درآمد",
  "sales.statItems": "کالاهای فروخته‌شده",
  "sales.statProfit": "مفاد",
  "sales.statTransactions": "معاملات",
  "sales.todayList": "فهرست فروش امروز",
  "sales.emptyToday": "امروز هنوز هیچ فروشی ثبت نشده است.",
  "sales.unknownProduct": "کالای نامعلوم",
  "sales.rowLine": "{qty} × {price}",
};
