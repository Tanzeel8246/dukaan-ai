/** i18n part: jobs — Phase C · C5, the job / work-order
 *  tracker (design §5). en + ur dictionaries (identical key
 *  sets enforced by types). Stage NAMES are shop data and
 *  never appear here (§5.2) — only the chrome around them. */
export const enJobs = {
  /* ---- navigation ---- */
  "nav.jobs": "Jobs",

  /* ---- surface ---- */
  "job.eyebrow": "Workshop",
  "job.title": "Job Tracker",
  "job.subtitle":
    "Customer work orders — printing, binding, made-to-order work — tracked from receipt to delivery: materials issued to the job, advances held in the customer's pool, and the bill that settles it.",
  "job.new": "New job",
  "job.empty":
    "No jobs yet. Take a customer's work order — the job is born with its number, ready to go on the customer's slip.",
  "job.noResults": "No jobs match your search.",
  "job.searchPh": "Search jobs…",

  /* ---- card & detail ---- */
  "job.stage": "Stage",
  "job.status.open": "Open",
  "job.status.in_progress": "In progress",
  "job.status.ready": "Ready",
  "job.status.delivered": "Delivered",
  "job.status.cancelled": "Cancelled",
  "job.due": "Due",
  "job.noDue": "No due date",
  "job.overdue": "Overdue",
  "job.labour": "Labour",
  "job.materials": "Materials",
  "job.revenue": "Billed",
  "job.billCogs": "Bill goods cost",
  "job.profit": "Job profit",
  "job.advances": "Advances",
  "job.advanceTotal": "Advances received",
  "job.noMaterials": "No materials issued yet.",
  "job.noAdvances": "No advances recorded for this job.",
  "job.noBills": "Not billed yet.",
  "job.bills": "Bills",
  "job.confirm.deliver": "Mark {number} as delivered?",
  "job.confirm.cancel": "Cancel job {number}?",

  /* ---- actions ---- */
  "job.act.stage": "Move to stage",
  "job.act.issue": "Issue materials",
  "job.act.return": "Return materials",
  "job.act.advance": "Record advance",
  "job.act.bill": "Bill this job",
  "job.act.deliver": "Mark delivered",
  "job.act.cancel": "Cancel job",
  "job.act.edit": "Edit job",
  "job.act.print": "Print work slip",
  "job.act.labour": "Set labour",

  /* ---- create / edit form ---- */
  "job.form.newTitle": "New job",
  "job.form.editTitle": "Edit job — {number}",
  "job.form.customer": "Customer",
  "job.form.customerPh": "Choose a customer",
  "job.form.name": "Customer name",
  "job.form.phone": "Phone",
  "job.form.title": "Work title",
  "job.form.titlePh": "e.g. Wedding cards × 500",
  "job.form.description": "Description",
  "job.form.due": "Due date",
  "job.form.labour": "Declared labour (for job profit)",
  "job.form.note": "Note",
  "job.form.save": "Create job",
  "job.form.saveEdit": "Save changes",
  "job.form.errTitle": "Give the job a title — the work, in a few words.",
  "job.form.errName": "The customer's name is required.",
  "job.form.errWarehouse": "That warehouse is no longer available.",
  "job.form.errSave": "The job could not be saved. Nothing was written.",
  "job.form.warehouseLocked":
    "The warehouse is fixed once materials have been issued to the job.",

  /* ---- materials modal ---- */
  "job.mat.issueTitle": "Issue materials — {number}",
  "job.mat.returnTitle": "Return materials — {number}",
  "job.mat.product": "Product",
  "job.mat.productPh": "Choose a product",
  "job.mat.qty": "Qty",
  "job.mat.addLine": "Add product",
  "job.mat.removeLine": "Remove {name}",
  "job.mat.available": "{qty} available here",
  "job.mat.held": "{qty} with the job",
  "job.mat.value": "Value",
  "job.mat.issueSave": "Issue materials",
  "job.mat.returnSave": "Return materials",
  "job.mat.err.not_active": "This job is closed — materials no longer move on it.",
  "job.mat.err.empty_lines": "Pick at least one product.",
  "job.mat.err.unknown_product": "A picked product no longer exists.",
  "job.mat.err.bad_qty": "Quantities must be greater than zero.",
  "job.mat.err.insufficient": "Not enough stock at the job's warehouse for {name}.",
  "job.mat.err.over_return": "The job holds only {qty} of {name} to return.",
  "job.mat.err.zero_value": "These materials carry no cost — there is nothing to post.",
  "job.mat.err.failed": "The materials could not be posted. Nothing was written.",

  /* ---- advance modal ---- */
  "job.adv.title": "Record advance — {number}",
  "job.adv.sub":
    "An advance is ordinary money in against this customer's future bill — it sits in the customer's pool and the job's bill absorbs it when posted.",
  "job.adv.amount": "Amount",
  "job.adv.method": "Received by",
  "job.adv.account": "Into account",
  "job.adv.accountDefault": "Method's default account",
  "job.adv.save": "Record advance",
  "job.adv.errAmount": "Enter an amount greater than zero.",
  "job.adv.errCheque": "Complete the cheque details first.",
  "job.adv.errFailed": "The advance could not be recorded. Nothing was written.",
  "job.adv.done": "Advance of {amount} recorded for {number}.",

  /* ---- notices ---- */
  "job.notice.created": "Job {number} created.",
  "job.notice.updated": "Job {number} updated.",
  "job.notice.stage": "{number} moved to {stage}.",
  "job.notice.issued": "Materials issued to {number}.",
  "job.notice.returned": "Materials returned from {number}.",
  "job.notice.delivered": "{number} marked delivered.",
  "job.notice.cancelled": "{number} cancelled.",
  "job.notice.draftReady":
    "Billing job {number} — compose the charge lines. Materials already issued to this job are listed below and must not be billed again.",

  /* ---- billing desk: the issued-materials panel (R-C7) ---- */
  "job.bill.materialsTitle": "Materials already issued to {number}",
  "job.bill.materialsSub":
    "These goods already left the shelf and were charged to the job's cost — do not add them as bill lines again.",

  /* ---- work slip (print) ---- */
  "job.print.title": "Work slip",
  "job.print.customer": "Customer",
  "job.print.stage": "Stage",
  "job.print.due": "Due date",
  "job.print.materials": "Materials issued",
  "job.print.issued": "Issued",
  "job.print.returned": "Returned",
  "job.print.net": "Net materials",
  "job.print.labour": "Labour",
  "job.print.receivedBy": "Received by",
  "job.print.noMaterials": "No materials issued.",

  /* ---- material events ---- */
  "job.ev.issue": "Issued",
  "job.ev.return": "Returned",

  /* ---- settings: stage list editor (§5.2) ---- */
  "job.stages.title": "Job stages",
  "job.stages.sub":
    "The workshop stages a job moves through — one per line, in order. A new job starts at the first; reaching the last marks it Ready. Jobs keep the stage name they already carry if you rename the list.",
  "job.stages.save": "Save stages",
  "job.stages.saved": "Job stages saved.",
  "job.stages.reset": "Use defaults",
};

export const urJobs: Record<keyof typeof enJobs, string> = {
  /* ---- navigation ---- */
  "nav.jobs": "جابز",

  /* ---- surface ---- */
  "job.eyebrow": "ورکشاپ",
  "job.title": "جاب ٹریکر",
  "job.subtitle":
    "کسٹمر کے ورک آرڈر — چھپائی، جلد بندی، فرمائشی کام — وصولی سے ترسیل تک: جاب پر جاری شدہ سامان، کسٹمر کے کھاتے میں موجود پیشگی رقم، اور اسے نبٹانے والا بل۔",
  "job.new": "نئی جاب",
  "job.empty":
    "ابھی کوئی جاب نہیں۔ کسٹمر کا ورک آرڈر لیں — جاب اپنے نمبر کے ساتھ پیدا ہوتی ہے، کسٹمر کی پرچی پر لکھنے کے لیے تیار۔",
  "job.noResults": "آپ کی تلاش سے کوئی جاب نہیں ملی۔",
  "job.searchPh": "جاب تلاش کریں…",

  /* ---- card & detail ---- */
  "job.stage": "مرحلہ",
  "job.status.open": "کھلی",
  "job.status.in_progress": "جاری",
  "job.status.ready": "تیار",
  "job.status.delivered": "ترسیل شدہ",
  "job.status.cancelled": "منسوخ",
  "job.due": "ترسیل کی تاریخ",
  "job.noDue": "کوئی تاریخ مقرر نہیں",
  "job.overdue": "تاریخ گزر گئی",
  "job.labour": "مزدوری",
  "job.materials": "سامان",
  "job.revenue": "بل شدہ",
  "job.billCogs": "بل کے سامان کی لاگت",
  "job.profit": "جاب کا منافع",
  "job.advances": "پیشگی رقمیں",
  "job.advanceTotal": "موصولہ پیشگی",
  "job.noMaterials": "ابھی کوئی سامان جاری نہیں ہوا۔",
  "job.noAdvances": "اس جاب پر کوئی پیشگی درج نہیں۔",
  "job.noBills": "ابھی بل نہیں بنا۔",
  "job.bills": "بل",
  "job.confirm.deliver": "کیا {number} کو ترسیل شدہ لکھ دیا جائے؟",
  "job.confirm.cancel": "کیا جاب {number} منسوخ کر دی جائے؟",

  /* ---- actions ---- */
  "job.act.stage": "مرحلہ بدلیں",
  "job.act.issue": "سامان جاری کریں",
  "job.act.return": "سامان واپس کریں",
  "job.act.advance": "پیشگی درج کریں",
  "job.act.bill": "اس جاب کا بل بنائیں",
  "job.act.deliver": "ترسیل شدہ لکھیں",
  "job.act.cancel": "جاب منسوخ کریں",
  "job.act.edit": "جاب میں ترمیم",
  "job.act.print": "ورک سلپ چھاپیں",
  "job.act.labour": "مزدوری درج کریں",

  /* ---- create / edit form ---- */
  "job.form.newTitle": "نئی جاب",
  "job.form.editTitle": "جاب میں ترمیم — {number}",
  "job.form.customer": "کسٹمر",
  "job.form.customerPh": "کسٹمر منتخب کریں",
  "job.form.name": "کسٹمر کا نام",
  "job.form.phone": "فون",
  "job.form.title": "کام کا عنوان",
  "job.form.titlePh": "مثلاً شادی کارڈ × 500",
  "job.form.description": "تفصیل",
  "job.form.due": "ترسیل کی تاریخ",
  "job.form.labour": "درج مزدوری (جاب منافع کے لیے)",
  "job.form.note": "نوٹ",
  "job.form.save": "جاب بنائیں",
  "job.form.saveEdit": "تبدیلیاں محفوظ کریں",
  "job.form.errTitle": "جاب کو ایک عنوان دیں — کام، چند الفاظ میں۔",
  "job.form.errName": "کسٹمر کا نام ضروری ہے۔",
  "job.form.errWarehouse": "وہ گودام اب دستیاب نہیں۔",
  "job.form.errSave": "جاب محفوظ نہیں ہو سکی۔ کچھ نہیں لکھا گیا۔",
  "job.form.warehouseLocked":
    "سامان جاری ہونے کے بعد جاب کا گودام تبدیل نہیں ہوتا۔",

  /* ---- materials modal ---- */
  "job.mat.issueTitle": "سامان جاری کریں — {number}",
  "job.mat.returnTitle": "سامان واپس کریں — {number}",
  "job.mat.product": "پروڈکٹ",
  "job.mat.productPh": "پروڈکٹ منتخب کریں",
  "job.mat.qty": "مقدار",
  "job.mat.addLine": "پروڈکٹ شامل کریں",
  "job.mat.removeLine": "{name} ہٹائیں",
  "job.mat.available": "یہاں {qty} دستیاب",
  "job.mat.held": "جاب کے پاس {qty}",
  "job.mat.value": "مالیت",
  "job.mat.issueSave": "سامان جاری کریں",
  "job.mat.returnSave": "سامان واپس کریں",
  "job.mat.err.not_active": "یہ جاب بند ہے — اب اس پر سامان نہیں چلتا۔",
  "job.mat.err.empty_lines": "کم از کم ایک پروڈکٹ منتخب کریں۔",
  "job.mat.err.unknown_product": "منتخب پروڈکٹ اب موجود نہیں۔",
  "job.mat.err.bad_qty": "مقدار صفر سے زیادہ ہونی چاہیے۔",
  "job.mat.err.insufficient": "جاب کے گودام میں {name} کا اسٹاک کافی نہیں۔",
  "job.mat.err.over_return": "جاب کے پاس واپسی کے لیے صرف {qty} {name} ہے۔",
  "job.mat.err.zero_value": "اس سامان کی کوئی لاگت نہیں — پوسٹ کرنے کو کچھ نہیں۔",
  "job.mat.err.failed": "سامان پوسٹ نہیں ہو سکا۔ کچھ نہیں لکھا گیا۔",

  /* ---- advance modal ---- */
  "job.adv.title": "پیشگی درج کریں — {number}",
  "job.adv.sub":
    "پیشگی اس کسٹمر کے آئندہ بل کے خلاف عام رقم ہے — یہ کسٹمر کے کھاتے میں رہتی ہے اور بل بنتے ہی جاب کا بل اسے جذب کر لیتا ہے۔",
  "job.adv.amount": "رقم",
  "job.adv.method": "وصولی کا طریقہ",
  "job.adv.account": "اکاؤنٹ میں",
  "job.adv.accountDefault": "طریقے کا طے شدہ اکاؤنٹ",
  "job.adv.save": "پیشگی درج کریں",
  "job.adv.errAmount": "صفر سے زیادہ رقم درج کریں۔",
  "job.adv.errCheque": "پہلے چیک کی تفصیل مکمل کریں۔",
  "job.adv.errFailed": "پیشگی درج نہیں ہو سکی۔ کچھ نہیں لکھا گیا۔",
  "job.adv.done": "{number} کے لیے {amount} پیشگی درج ہو گئی۔",

  /* ---- notices ---- */
  "job.notice.created": "جاب {number} بن گئی۔",
  "job.notice.updated": "جاب {number} تازہ ہو گئی۔",
  "job.notice.stage": "{number} مرحلہ {stage} پر چلی گئی۔",
  "job.notice.issued": "{number} کو سامان جاری ہو گیا۔",
  "job.notice.returned": "{number} سے سامان واپس آ گیا۔",
  "job.notice.delivered": "{number} ترسیل شدہ لکھ دی گئی۔",
  "job.notice.cancelled": "{number} منسوخ ہو گئی۔",
  "job.notice.draftReady":
    "جاب {number} کا بل بن رہا ہے — چارج لائنیں ترتیب دیں۔ اس جاب کو پہلے سے جاری شدہ سامان نیچے درج ہے اور اسے دوبارہ بل میں نہیں ڈالنا۔",

  /* ---- billing desk: the issued-materials panel (R-C7) ---- */
  "job.bill.materialsTitle": "{number} کو پہلے سے جاری شدہ سامان",
  "job.bill.materialsSub":
    "یہ سامان شیلف سے نکل چکا ہے اور جاب کی لاگت میں شامل ہے — اسے دوبارہ بل کی لائنوں میں نہ ڈالیں۔",

  /* ---- work slip (print) ---- */
  "job.print.title": "ورک سلپ",
  "job.print.customer": "کسٹمر",
  "job.print.stage": "مرحلہ",
  "job.print.due": "ترسیل کی تاریخ",
  "job.print.materials": "جاری شدہ سامان",
  "job.print.issued": "جاری شدہ",
  "job.print.returned": "واپس شدہ",
  "job.print.net": "خالص سامان",
  "job.print.labour": "مزدوری",
  "job.print.receivedBy": "وصول کنندہ",
  "job.print.noMaterials": "کوئی سامان جاری نہیں ہوا۔",

  /* ---- material events ---- */
  "job.ev.issue": "جاری شدہ",
  "job.ev.return": "واپس شدہ",

  /* ---- settings: stage list editor (§5.2) ---- */
  "job.stages.title": "جاب کے مراحل",
  "job.stages.sub":
    "ورکشاپ کے وہ مراحل جن سے جاب گزرتی ہے — ہر سطر میں ایک، اسی ترتیب میں۔ نئی جاب پہلے مرحلے سے شروع ہوتی ہے؛ آخری مرحلے پر پہنچنا اسے تیار لکھتا ہے۔ فہرست کے نام بدلنے سے جابوں پر موجود مرحلے کے نام نہیں بدلتے۔",
  "job.stages.save": "مراحل محفوظ کریں",
  "job.stages.saved": "جاب کے مراحل محفوظ ہو گئے۔",
  "job.stages.reset": "طے شدہ مراحل لیں",
};
