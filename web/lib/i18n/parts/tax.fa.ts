/** i18n part: tax — Farsi / Dari (فارسی) DRAFT dictionary (Phase H design §4.1).
 *  Machine-drafted once at build time; every key's review state lives in
 *  ../review-manifest.json. A draft is a starting point for a named human
 *  reviewer — never finished copy, never runtime translation. */
import type { enTax } from "./tax";

export const faTax: Record<keyof typeof enTax, string> = {
  "tax.title": "سلیب‌های مالیات",
  "tax.sub": "مالیاتی را که دکان شما می‌گیرد مشخص کنید (مثلاً GST). یک سلیب فقط وقتی تطبیق می‌شود که فعال باشد و در پایین به حیث پیش‌فرض دکان تعیین شود یا به یک کالا داده شود — تا آن وقت، هیچ بل یا خریدی مالیات ندارد.",
  "tax.empty": "هنوز هیچ سلیب مالیاتی نیست.",
  "tax.name": "نام سلیب",
  "tax.namePlaceholder": "مثلاً GST",
  "tax.kind": "نوع",
  "tax.kindPercent": "فیصدی از قیمت",
  "tax.kindFixed": "مبلغ ثابت فی واحد",
  "tax.ratePercent": "نرخ (%)",
  "tax.rateFixed": "مبلغ فی واحد (PKR)",
  "tax.appliesTo": "تطبیق می‌شود بر",
  "tax.appliesSales": "فروش",
  "tax.appliesPurchases": "خرید",
  "tax.appliesBoth": "فروش و خرید",
  "tax.inclusive": "قیمت‌ها قبلاً این مالیات را شامل‌اند",
  "tax.inclusiveBadge": "شامل قیمت",
  "tax.exclusiveBadge": "اضافه بر قیمت",
  "tax.active": "فعال",
  "tax.inactive": "غیرفعال",
  "tax.defaultBadge": "پیش‌فرض",
  "tax.edit": "ویرایش",
  "tax.addTitle": "یک سلیب مالیاتی اضافه کنید",
  "tax.editTitle": "سلیب مالیاتی را ویرایش کنید",
  "tax.add": "سلیب اضافه کنید",
  "tax.errName": "به سلیب یک نام بدهید.",
  "tax.errRate": "نرخ باید 0 یا بیشتر باشد.",
  "tax.saved": "سلیب مالیاتی ذخیره شد.",
  "tax.removed": "سلیب مالیاتی حذف شد.",
  "tax.defaultsTitle": "پیش‌فرض‌های دکان",
  "tax.defaultsSub": "سلیب پیش‌فرض بر هر کالایی تطبیق می‌شود که سلیب خودش را ندارد. برای خاموش کردن مالیات آن طرف، “بدون مالیات” را انتخاب کنید — بل‌ها و خریدهای موجود هرگز تغییر نمی‌کنند.",
  "tax.defaultSales": "پیش‌فرض برای فروش",
  "tax.defaultPurchases": "پیش‌فرض برای خرید",
  "tax.noDefault": "بدون مالیات",
  "tax.defaultSaved": "پیش‌فرض‌های مالیات به‌روز شد.",
  "tax.readonlyNote": "شما سلیب‌های مالیاتی را دیده می‌توانید؛ فقط مالک آن‌ها را تغییر داده می‌تواند.",
  "tax.perUnit": "{amount} فی واحد",
};
