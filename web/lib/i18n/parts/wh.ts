/** i18n part: wh — Phase C · C1 warehouses & stock rows (the
 * management surface, the per-warehouse stock view, the drift
 * detector/recount, and the warehouse pickers shared by every desk
 * and document form). en + ur dictionaries (identical key sets
 * enforced by types). */
export const enWh = {
  /* ---- navigation ---- */
  "nav.warehouses": "Warehouses",

  /* ---- shared picker (billing / purchase / adjustment / docs) ---- */
  "wh.pickerLabel": "Warehouse",
  "wh.pickerDefaultSuffix": "(default)",
  "wh.pickerNone": "Default warehouse",
  "wh.pickerUseDefault": "Shop default",
  "wh.rowQty": "{qty} {unit} here",

  /* ---- management surface ---- */
  "wh.eyebrow": "Stock locations",
  "wh.title": "Warehouses",
  "wh.subtitle":
    "The places your stock sits. Every product's total is split across these warehouses; sales, purchases and adjustments each record the warehouse they touched. Stock value is always at the product's one cost price — a warehouse is a place, not a separate business.",
  "wh.add": "Add warehouse",
  "wh.form.addTitle": "New warehouse",
  "wh.form.editTitle": "Edit warehouse",
  "wh.form.name": "Name",
  "wh.form.namePh": "e.g. Godown — Shahdara",
  "wh.form.note": "Note (address / keeper)",
  "wh.form.notePh": "Optional",
  "wh.defaultBadge": "Default",
  "wh.archivedBadge": "Archived",
  "wh.makeDefault": "Make default",
  "wh.archive": "Archive",
  "wh.unarchive": "Restore",
  "wh.edit": "Edit",
  "wh.err.nameRequired": "Give the warehouse a name.",
  "wh.notice.created": "Warehouse “{name}” added.",
  "wh.notice.updated": "Warehouse updated.",
  "wh.notice.defaultSet": "“{name}” is now the default warehouse.",
  "wh.notice.archived": "Warehouse archived. Its stock history stays readable.",
  "wh.notice.unarchived": "Warehouse restored.",
  "wh.cannotArchiveDefault":
    "The default warehouse cannot be archived — make another warehouse the default first.",
  "wh.empty": "No warehouses yet. Add one to split your stock by location.",
  "wh.unitsHere": "{qty} units",
  "wh.valueHere": "Stock value {amount}",

  /* ---- per-warehouse stock view ---- */
  "wh.stockTitle": "Stock by warehouse",
  "wh.col.product": "Product",
  "wh.col.onHand": "On hand",
  "wh.col.promised": "Promised",
  "wh.col.available": "Available",
  "wh.col.value": "Value",
  "wh.stockEmpty": "Nothing is stocked at this warehouse yet.",
  "wh.totalRow": "All warehouses",

  /* ---- drift detector / recount (§1.7) ---- */
  "wh.drift.title": "Location split needs a recount",
  "wh.drift.body":
    "{count} product(s) have warehouse quantities that no longer add up to their totals — this happens when an older version of the app recorded stock without locations. Your totals and accounts are correct; only the split needs repair.",
  "wh.drift.recount": "Recount locations",
  "wh.drift.done": "Recount complete — {count} product(s) repaired. No accounts were touched.",
  "wh.drift.item": "{name}: locations add up to {rows}, total is {total}",
} as const;

export const urWh: Record<keyof typeof enWh, string> = {
  "nav.warehouses": "گودام",

  "wh.pickerLabel": "گودام",
  "wh.pickerDefaultSuffix": "(طے شدہ)",
  "wh.pickerNone": "طے شدہ گودام",
  "wh.pickerUseDefault": "دکان کا طے شدہ",
  "wh.rowQty": "یہاں {qty} {unit}",

  "wh.eyebrow": "اسٹاک کے مقامات",
  "wh.title": "گودام",
  "wh.subtitle":
    "وہ جگہیں جہاں آپ کا اسٹاک پڑا ہے۔ ہر پروڈکٹ کی کل مقدار انہی گوداموں میں بٹی ہوئی ہے؛ فروخت، خرید اور ایڈجسٹمنٹ — ہر ایک اپنے گودام کے ساتھ درج ہوتی ہے۔ اسٹاک کی قیمت ہمیشہ پروڈکٹ کی ایک ہی لاگت پر گنی جاتی ہے — گودام ایک جگہ ہے، الگ کاروبار نہیں۔",
  "wh.add": "گودام شامل کریں",
  "wh.form.addTitle": "نیا گودام",
  "wh.form.editTitle": "گودام میں ترمیم",
  "wh.form.name": "نام",
  "wh.form.namePh": "مثلاً گودام — شاہدرہ",
  "wh.form.note": "نوٹ (پتہ / نگران)",
  "wh.form.notePh": "اختیاری",
  "wh.defaultBadge": "طے شدہ",
  "wh.archivedBadge": "محفوظ شدہ",
  "wh.makeDefault": "طے شدہ بنائیں",
  "wh.archive": "محفوظ کریں",
  "wh.unarchive": "بحال کریں",
  "wh.edit": "ترمیم",
  "wh.err.nameRequired": "گودام کا نام لکھیں۔",
  "wh.notice.created": "گودام ”{name}“ شامل ہو گیا۔",
  "wh.notice.updated": "گودام اپ ڈیٹ ہو گیا۔",
  "wh.notice.defaultSet": "”{name}“ اب طے شدہ گودام ہے۔",
  "wh.notice.archived": "گودام محفوظ ہو گیا۔ اس کے اسٹاک کی تاریخ پڑھی جا سکے گی۔",
  "wh.notice.unarchived": "گودام بحال ہو گیا۔",
  "wh.cannotArchiveDefault":
    "طے شدہ گودام محفوظ نہیں ہو سکتا — پہلے کسی اور گودام کو طے شدہ بنائیں۔",
  "wh.empty": "ابھی کوئی گودام نہیں۔ اسٹاک کو مقامات کے حساب سے بانٹنے کے لیے ایک شامل کریں۔",
  "wh.unitsHere": "{qty} یونٹ",
  "wh.valueHere": "اسٹاک مالیت {amount}",

  "wh.stockTitle": "گودام کے حساب سے اسٹاک",
  "wh.col.product": "پروڈکٹ",
  "wh.col.onHand": "موجود",
  "wh.col.promised": "وعدہ شدہ",
  "wh.col.available": "دستیاب",
  "wh.col.value": "مالیت",
  "wh.stockEmpty": "اس گودام میں ابھی کوئی اسٹاک نہیں۔",
  "wh.totalRow": "تمام گودام",

  "wh.drift.title": "مقامات کی تقسیم کو دوبارہ گنتی درکار ہے",
  "wh.drift.body":
    "{count} پروڈکٹ کی گودام وار مقدار ان کے کُل سے نہیں ملتی — ایسا تب ہوتا ہے جب ایپ کے پرانے ورژن نے مقام کے بغیر اسٹاک درج کیا ہو۔ آپ کے کُل اور کھاتے درست ہیں؛ صرف تقسیم کی مرمت درکار ہے۔",
  "wh.drift.recount": "مقامات کی دوبارہ گنتی",
  "wh.drift.done": "دوبارہ گنتی مکمل — {count} پروڈکٹ کی مرمت ہو گئی۔ کسی کھاتے کو نہیں چھیڑا گیا۔",
  "wh.drift.item": "{name}: مقامات کا مجموعہ {rows}، کُل {total} ہے",
};
