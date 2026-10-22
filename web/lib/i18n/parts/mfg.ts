/** i18n part: mfg — Phase C · C3 manufacturing: BOM recipes and
 *  their version history (the production orders of C4 join this
 *  surface later). en + ur dictionaries (identical key sets
 *  enforced by types). */
export const enMfg = {
  /* ---- navigation ---- */
  "nav.manufacturing": "Manufacturing",

  /* ---- surface ---- */
  "mfg.eyebrow": "Production",
  "mfg.title": "Manufacturing",
  "mfg.subtitle":
    "Recipes (BOMs) for the products you make: what one batch consumes, what it yields, and what a finished unit costs. Recipes never post anything — production does, when it runs.",
  "mfg.newRecipe": "New recipe",
  "mfg.immutableNote":
    "A recipe is never edited in place. Saving a change creates a new version and the old version stays readable forever, so a production order always shows the exact recipe its costs came from.",
  "mfg.empty":
    "No recipes yet. Add one for a product you make — a repack, a blend, an assembly — and production can run against it.",
  "mfg.noRecipe": "No recipe yet",
  "mfg.addFor": "Add recipe",
  "mfg.newVersion": "New version",
  "mfg.history": "Version history",
  "mfg.version": "Version {v}",
  "mfg.activeBadge": "Active",
  "mfg.supersededBadge": "Superseded",
  "mfg.yields": "Yields {qty} {unit} per batch",
  "mfg.batchCost": "Batch cost",
  "mfg.materialsCost": "Materials",
  "mfg.unitCost": "Cost per finished unit",
  "mfg.perBatchSuffix": "per batch",

  /* ---- raw materials strip ---- */
  "mfg.raw.title": "Raw materials on the shelf",
  "mfg.raw.sub":
    "Products classed as raw material — their stock value sits in the Raw materials account and recipes consume them. Set a product's class in Inventory.",

  /* ---- form ---- */
  "mfg.form.newTitle": "New recipe",
  "mfg.form.versionTitle": "New version — {name}",
  "mfg.form.output": "Finished product",
  "mfg.form.outputPh": "Choose a product",
  "mfg.form.batchSize": "Batch size (finished units)",
  "mfg.form.labour": "Labour per batch",
  "mfg.form.overhead": "Overhead per batch",
  "mfg.form.note": "Note",
  "mfg.form.notePh": "Optional",
  "mfg.form.components": "Components per batch",
  "mfg.form.componentPh": "Choose a component",
  "mfg.form.qty": "Qty",
  "mfg.form.addComponent": "Add component",
  "mfg.form.noResults": "No product matches \"{query}\".",
  "mfg.form.removeLine": "Remove {name}",
  "mfg.form.save": "Save recipe",
  "mfg.form.saveVersion": "Save as new version",

  /* ---- production orders (Phase C · C4) ---- */
  "mfg.po.title": "Production orders",
  "mfg.po.sub":
    "Run production against a recipe: issue materials into work-in-progress, land finished units at their absorbed cost, and write off what spoils.",
  "mfg.po.new": "New production order",
  "mfg.po.empty":
    "No production orders yet. Create one from a recipe to start making a product.",
  "mfg.po.draftLabel": "Draft",
  "mfg.po.status.draft": "Draft",
  "mfg.po.status.open": "Open",
  "mfg.po.status.completed": "Completed",
  "mfg.po.status.cancelled": "Cancelled",
  "mfg.po.planned": "Planned",
  "mfg.po.produced": "Produced",
  "mfg.po.remaining": "Remaining",
  "mfg.po.pool": "In progress (WIP)",
  "mfg.po.issuedTotal": "Issued into production",
  "mfg.po.completedTotal": "Absorbed into finished stock",
  "mfg.po.writtenOff": "Written off (scrap + close-out)",
  "mfg.po.unitCostNow": "Cost per produced unit",
  "mfg.po.recipe": "Recipe",
  "mfg.po.snapshotNote":
    "Recipe snapshot — version {v}. Later recipe versions never change this order's costs.",
  "mfg.po.events": "Production record",
  "mfg.po.noEvents": "No production events yet.",
  "mfg.po.open": "Open order",
  "mfg.po.edit": "Edit draft",
  "mfg.po.issue": "Issue materials",
  "mfg.po.complete": "Record completion",
  "mfg.po.scrap": "Record scrap",
  "mfg.po.close": "Close order",
  "mfg.po.cancel": "Cancel order",
  "mfg.po.delete": "Delete draft",
  "mfg.po.print": "Print order",

  /* ---- order create / edit form ---- */
  "mfg.po.form.title": "New production order",
  "mfg.po.form.editTitle": "Edit draft — {name}",
  "mfg.po.form.recipe": "Recipe (finished product)",
  "mfg.po.form.recipePh": "Choose a recipe",
  "mfg.po.form.plannedQty": "Planned quantity (finished units)",
  "mfg.po.form.save": "Create order",
  "mfg.po.form.saveEdit": "Save changes",

  /* ---- issue form ---- */
  "mfg.issue.title": "Issue materials — {name}",
  "mfg.issue.runQty": "Run size (finished units intended)",
  "mfg.issue.components": "Components for this run",
  "mfg.issue.atWarehouse": "At this warehouse: {qty} {unit}",
  "mfg.issue.labour": "Labour for this run",
  "mfg.issue.overhead": "Overhead for this run",
  "mfg.issue.settlement": "Labour & overhead settlement",
  "mfg.issue.paidNow": "Paid now from an account",
  "mfg.issue.accrue": "Accrue — owe it (salaries payable)",
  "mfg.issue.account": "Paid from account",
  "mfg.issue.makeDefault": "Remember this settlement as my default",
  "mfg.issue.materialsValue": "Materials value",
  "mfg.issue.totalValue": "Total into work-in-progress",
  "mfg.issue.submit": "Issue materials",

  /* ---- completion form ---- */
  "mfg.complete.title": "Record completion — {name}",
  "mfg.complete.qty": "Finished units completed",
  "mfg.complete.final": "Final completion — absorb the whole remaining cost pool",
  "mfg.complete.value": "Value into finished stock",
  "mfg.complete.unitCost": "Cost per finished unit",
  "mfg.complete.submit": "Record completion",

  /* ---- scrap form ---- */
  "mfg.scrap.title": "Record scrap — {name}",
  "mfg.scrap.qty": "Units spoiled",
  "mfg.scrap.value": "Value written off",
  "mfg.scrap.submit": "Record scrap",

  /* ---- close ---- */
  "mfg.close.confirm":
    "Close this order? The remaining in-progress value of {amount} will be written off to loss.",
  "mfg.close.confirmEmpty": "Close this order? Nothing remains in progress for it.",
  "mfg.close.submit": "Confirm close",

  /* ---- event log ---- */
  "mfg.ev.issue": "Materials issued",
  "mfg.ev.completion": "Completed",
  "mfg.ev.scrap": "Scrap",
  "mfg.ev.closeout": "Close-out write-off",
  "mfg.ev.labour": "Labour",
  "mfg.ev.overhead": "Overhead",
  "mfg.ev.paidFrom": "Paid from {name}",
  "mfg.ev.accrued": "Accrued (salaries payable)",

  /* ---- print ---- */
  "mfg.print.title": "Production order",
  "mfg.print.planned": "Planned",
  "mfg.print.produced": "Produced",
  "mfg.print.pool": "In progress",
  "mfg.print.events": "Production record",
  "mfg.print.components": "Recipe (per batch)",

  /* ---- errors ---- */
  "mfg.err.outputRequired": "Choose the finished product first.",
  "mfg.err.outputRaw": "A raw material cannot be a recipe's finished product.",
  "mfg.err.selfComponent": "A product cannot be its own component.",
  "mfg.err.emptyLines": "Add at least one component.",
  "mfg.err.badQty": "Every component needs a quantity above zero.",
  "mfg.err.badBatch": "Batch size must be above zero and costs cannot be negative.",
  "mfg.err.generic": "This recipe could not be saved.",

  /* ---- production errors (Phase C · C4) ---- */
  "mfg.po.err.generic": "This production action could not be saved.",
  "mfg.po.err.insufficient": "Not enough {name} at the order's warehouse.",
  "mfg.po.err.emptyPool":
    "Nothing is in progress for this order — issue materials first.",
  "mfg.po.err.badQty": "Quantities must be above zero.",
  "mfg.po.err.noAccount": "No money account is available for the payment.",
  "mfg.po.err.zeroValue":
    "This issue would move no value — give the run materials or conversion costs.",
  "mfg.po.err.notOpen": "This order is closed to further events.",
  "mfg.po.err.outputGone": "The finished product no longer exists.",
} as const;

export const urMfg: Record<keyof typeof enMfg, string> = {
  /* ---- navigation ---- */
  "nav.manufacturing": "مینوفیکچرنگ",

  /* ---- surface ---- */
  "mfg.eyebrow": "پیداوار",
  "mfg.title": "مینوفیکچرنگ",
  "mfg.subtitle":
    "آپ کی بنائی ہوئی پروڈکٹس کی ترکیبیں (BOM): ایک بیچ میں کیا لگتا ہے، کیا بنتا ہے، اور ایک تیار یونٹ کی لاگت کیا پڑتی ہے۔ ترکیب خود کچھ پوسٹ نہیں کرتی — پوسٹنگ پیداوار چلنے پر ہوتی ہے۔",
  "mfg.newRecipe": "نئی ترکیب",
  "mfg.immutableNote":
    "ترکیب کبھی اپنی جگہ تبدیل نہیں ہوتی۔ تبدیلی محفوظ کرنے سے نیا ورژن بنتا ہے اور پرانا ورژن ہمیشہ قابلِ مطالعہ رہتا ہے، تاکہ ہر پروڈکشن آرڈر ہمیشہ وہی ترکیب دکھائے جس سے اس کی لاگت آئی تھی۔",
  "mfg.empty":
    "ابھی کوئی ترکیب نہیں۔ جو پروڈکٹ آپ بناتے ہیں — ری پیک، آمیزہ، اسمبلی — اس کی ترکیب شامل کریں، پھر پیداوار اسی کے مطابق چلے گی۔",
  "mfg.noRecipe": "ابھی ترکیب نہیں",
  "mfg.addFor": "ترکیب شامل کریں",
  "mfg.newVersion": "نیا ورژن",
  "mfg.history": "ورژن کی تاریخ",
  "mfg.version": "ورژن {v}",
  "mfg.activeBadge": "فعال",
  "mfg.supersededBadge": "پرانا ورژن",
  "mfg.yields": "فی بیچ {qty} {unit} بنتے ہیں",
  "mfg.batchCost": "بیچ کی لاگت",
  "mfg.materialsCost": "اجزاء",
  "mfg.unitCost": "فی تیار یونٹ لاگت",
  "mfg.perBatchSuffix": "فی بیچ",

  /* ---- raw materials strip ---- */
  "mfg.raw.title": "شیلف پر خام مال",
  "mfg.raw.sub":
    "خام مال کی قسم والی پروڈکٹس — ان کی اسٹاک مالیت خام مال کے کھاتے میں رہتی ہے اور ترکیبیں انہیں استعمال کرتی ہیں۔ پروڈکٹ کی قسم انوینٹری میں مقرر کریں۔",

  /* ---- form ---- */
  "mfg.form.newTitle": "نئی ترکیب",
  "mfg.form.versionTitle": "نیا ورژن — {name}",
  "mfg.form.output": "تیار پروڈکٹ",
  "mfg.form.outputPh": "پروڈکٹ منتخب کریں",
  "mfg.form.batchSize": "بیچ سائز (تیار یونٹ)",
  "mfg.form.labour": "مزدوری فی بیچ",
  "mfg.form.overhead": "دیگر خرچ فی بیچ",
  "mfg.form.note": "نوٹ",
  "mfg.form.notePh": "اختیاری",
  "mfg.form.components": "اجزاء فی بیچ",
  "mfg.form.componentPh": "جز منتخب کریں",
  "mfg.form.qty": "مقدار",
  "mfg.form.addComponent": "جز شامل کریں",
  "mfg.form.noResults": "\"{query}\" سے کوئی پروڈکٹ نہیں ملی۔",
  "mfg.form.removeLine": "{name} ہٹائیں",
  "mfg.form.save": "ترکیب محفوظ کریں",
  "mfg.form.saveVersion": "بطور نیا ورژن محفوظ کریں",

  /* ---- production orders (Phase C · C4) ---- */
  "mfg.po.title": "پروڈکشن آرڈرز",
  "mfg.po.sub":
    "کسی ترکیب کے مطابق پیداوار چلائیں: خام مال زیرِ تکمیل کام میں جاری کریں، تیار یونٹ ان کی جذب شدہ لاگت پر اتاریں، اور خراب ہونے والا حصہ نقصان میں لکھیں۔",
  "mfg.po.new": "نیا پروڈکشن آرڈر",
  "mfg.po.empty":
    "ابھی کوئی پروڈکشن آرڈر نہیں۔ کسی ترکیب سے آرڈر بنائیں اور پروڈکٹ بنانا شروع کریں۔",
  "mfg.po.draftLabel": "مسودہ",
  "mfg.po.status.draft": "مسودہ",
  "mfg.po.status.open": "کھلا",
  "mfg.po.status.completed": "مکمل",
  "mfg.po.status.cancelled": "منسوخ",
  "mfg.po.planned": "منصوبہ شدہ",
  "mfg.po.produced": "تیار شدہ",
  "mfg.po.remaining": "باقی",
  "mfg.po.pool": "زیرِ تکمیل (WIP)",
  "mfg.po.issuedTotal": "پیداوار میں جاری شدہ",
  "mfg.po.completedTotal": "تیار اسٹاک میں جذب شدہ",
  "mfg.po.writtenOff": "نقصان میں لکھا گیا (خراب + اختتامی)",
  "mfg.po.unitCostNow": "فی تیار یونٹ لاگت",
  "mfg.po.recipe": "ترکیب",
  "mfg.po.snapshotNote":
    "ترکیب کا عکس — ورژن {v}۔ بعد کے ورژن اس آرڈر کی لاگت کبھی نہیں بدلتے۔",
  "mfg.po.events": "پیداوار کا ریکارڈ",
  "mfg.po.noEvents": "ابھی کوئی پیداواری واقعہ نہیں۔",
  "mfg.po.open": "آرڈر کھولیں",
  "mfg.po.edit": "مسودہ بدلیں",
  "mfg.po.issue": "خام مال جاری کریں",
  "mfg.po.complete": "تکمیل درج کریں",
  "mfg.po.scrap": "خرابی درج کریں",
  "mfg.po.close": "آرڈر بند کریں",
  "mfg.po.cancel": "آرڈر منسوخ کریں",
  "mfg.po.delete": "مسودہ حذف کریں",
  "mfg.po.print": "آرڈر چھاپیں",

  /* ---- order create / edit form ---- */
  "mfg.po.form.title": "نیا پروڈکشن آرڈر",
  "mfg.po.form.editTitle": "مسودہ بدلیں — {name}",
  "mfg.po.form.recipe": "ترکیب (تیار پروڈکٹ)",
  "mfg.po.form.recipePh": "ترکیب منتخب کریں",
  "mfg.po.form.plannedQty": "منصوبہ شدہ مقدار (تیار یونٹ)",
  "mfg.po.form.save": "آرڈر بنائیں",
  "mfg.po.form.saveEdit": "تبدیلیاں محفوظ کریں",

  /* ---- issue form ---- */
  "mfg.issue.title": "خام مال جاری کریں — {name}",
  "mfg.issue.runQty": "رن کا سائز (تیار یونٹ مطلوب)",
  "mfg.issue.components": "اس رن کے اجزاء",
  "mfg.issue.atWarehouse": "اس گودام میں: {qty} {unit}",
  "mfg.issue.labour": "اس رن کی مزدوری",
  "mfg.issue.overhead": "اس رن کا دیگر خرچ",
  "mfg.issue.settlement": "مزدوری و دیگر خرچ کی ادائیگی",
  "mfg.issue.paidNow": "ابھی اکاؤنٹ سے ادا کریں",
  "mfg.issue.accrue": "ادھار رکھیں — تنخواہوں میں واجب الادا",
  "mfg.issue.account": "ادائیگی کا اکاؤنٹ",
  "mfg.issue.makeDefault": "اس ادائیگی کو میری مستقل پسند رکھیں",
  "mfg.issue.materialsValue": "اجزاء کی مالیت",
  "mfg.issue.totalValue": "زیرِ تکمیل میں کل منتقلی",
  "mfg.issue.submit": "خام مال جاری کریں",

  /* ---- completion form ---- */
  "mfg.complete.title": "تکمیل درج کریں — {name}",
  "mfg.complete.qty": "مکمل تیار یونٹ",
  "mfg.complete.final": "حتمی تکمیل — باقی تمام لاگت جذب کر لیں",
  "mfg.complete.value": "تیار اسٹاک میں منتقل مالیت",
  "mfg.complete.unitCost": "فی تیار یونٹ لاگت",
  "mfg.complete.submit": "تکمیل درج کریں",

  /* ---- scrap form ---- */
  "mfg.scrap.title": "خرابی درج کریں — {name}",
  "mfg.scrap.qty": "خراب یونٹ",
  "mfg.scrap.value": "نقصان میں لکھی مالیت",
  "mfg.scrap.submit": "خرابی درج کریں",

  /* ---- close ---- */
  "mfg.close.confirm":
    "یہ آرڈر بند کریں؟ زیرِ تکمیل باقی مالیت {amount} نقصان میں لکھ دی جائے گی۔",
  "mfg.close.confirmEmpty": "یہ آرڈر بند کریں؟ اس کے لیے زیرِ تکمیل کچھ باقی نہیں۔",
  "mfg.close.submit": "تصدیق کے ساتھ بند کریں",

  /* ---- event log ---- */
  "mfg.ev.issue": "خام مال جاری ہوا",
  "mfg.ev.completion": "تکمیل",
  "mfg.ev.scrap": "خرابی",
  "mfg.ev.closeout": "اختتامی نقصان",
  "mfg.ev.labour": "مزدوری",
  "mfg.ev.overhead": "دیگر خرچ",
  "mfg.ev.paidFrom": "{name} سے ادا شدہ",
  "mfg.ev.accrued": "ادھار (واجب الادا تنخواہیں)",

  /* ---- print ---- */
  "mfg.print.title": "پروڈکشن آرڈر",
  "mfg.print.planned": "منصوبہ شدہ",
  "mfg.print.produced": "تیار شدہ",
  "mfg.print.pool": "زیرِ تکمیل",
  "mfg.print.events": "پیداوار کا ریکارڈ",
  "mfg.print.components": "ترکیب (فی بیچ)",

  /* ---- errors ---- */
  "mfg.err.outputRequired": "پہلے تیار پروڈکٹ منتخب کریں۔",
  "mfg.err.outputRaw": "خام مال کسی ترکیب کی تیار پروڈکٹ نہیں ہو سکتی۔",
  "mfg.err.selfComponent": "کوئی پروڈکٹ خود اپنا جز نہیں ہو سکتی۔",
  "mfg.err.emptyLines": "کم از کم ایک جز شامل کریں۔",
  "mfg.err.badQty": "ہر جز کی مقدار صفر سے زیادہ ہونی چاہیے۔",
  "mfg.err.badBatch": "بیچ سائز صفر سے زیادہ ہو اور لاگت منفی نہیں ہو سکتی۔",
  "mfg.err.generic": "یہ ترکیب محفوظ نہیں ہو سکی۔",

  /* ---- production errors (Phase C · C4) ---- */
  "mfg.po.err.generic": "یہ پیداواری عمل محفوظ نہیں ہو سکا۔",
  "mfg.po.err.insufficient": "آرڈر کے گودام میں {name} کافی نہیں۔",
  "mfg.po.err.emptyPool":
    "اس آرڈر کے لیے زیرِ تکمیل کچھ نہیں — پہلے خام مال جاری کریں۔",
  "mfg.po.err.badQty": "مقدار صفر سے زیادہ ہونی چاہیے۔",
  "mfg.po.err.noAccount": "ادائیگی کے لیے کوئی رقم اکاؤنٹ دستیاب نہیں۔",
  "mfg.po.err.zeroValue":
    "اس اجراء سے کوئی مالیت منتقل نہیں ہوتی — رن کو اجزاء یا تبدیلی لاگت دیں۔",
  "mfg.po.err.notOpen": "یہ آرڈر مزید واقعات کے لیے بند ہے۔",
  "mfg.po.err.outputGone": "تیار پروڈکٹ اب موجود نہیں۔",
};
