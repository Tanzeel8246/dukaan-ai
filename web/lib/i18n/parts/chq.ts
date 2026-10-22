/** i18n part: chq — Phase B · B5 cheque registry (capture fields in
 * the payment pickers, the registry workspace, lifecycle actions)
 * and the Finance cheque balances. en + ur dictionaries (identical
 * key sets enforced by types). */
export const enChq = {
  /* ---- navigation ---- */
  "nav.cheques": "Cheques",

  /* ---- registry workspace ---- */
  "chq.title": "Cheque Registry",
  "chq.subtitle":
    "Every cheque the shop has received or issued, through its whole life — captured with a payment, deposited, cleared or bounced. The registry is the instrument's diary; the money itself always moves through the ledger.",
  "chq.searchPh": "Search cheque number, bank or party…",
  "chq.empty":
    "No cheques yet. Choose Cheque in a bill, an udhaar repayment, a supplier payment or an expense and it will appear here.",
  "chq.emptyFilter": "No cheques in this view.",
  "chq.col.cheque": "Cheque",
  "chq.col.party": "Party",
  "chq.col.amount": "Amount",
  "chq.col.dates": "Dates",
  "chq.col.status": "Status",
  "chq.col.source": "Against",
  "chq.col.actions": "Actions",

  /* ---- directions & statuses ---- */
  "chq.dir.in": "Received",
  "chq.dir.out": "Issued",
  "chq.status.received": "In drawer",
  "chq.status.deposited": "At bank",
  "chq.status.issued": "Issued",
  "chq.status.cleared": "Cleared",
  "chq.status.bounced": "Bounced",
  "chq.status.returned": "Returned",

  /* ---- views & summary ---- */
  "chq.view.all": "All",
  "chq.view.drawer": "In drawer",
  "chq.view.atBank": "At bank",
  "chq.view.issued": "Issued, pending",
  "chq.view.due": "Due now",
  "chq.view.cleared": "Cleared",
  "chq.view.bounced": "Bounced",
  "chq.view.returned": "Returned",
  "chq.sum.drawer": "In drawer",
  "chq.sum.atBank": "At bank",
  "chq.sum.pendingOut": "Issued, pending",
  "chq.overdue": "Overdue",
  "chq.dueOn": "Due {date}",

  /* ---- capture (payment pickers) ---- */
  "chq.payOption": "Cheque",
  "chq.field.no": "Cheque no.",
  "chq.field.bank": "Bank",
  "chq.field.issueDate": "Cheque date",
  "chq.field.dueDate": "Due date (PDC)",
  "chq.field.charges": "Bank charges",
  "chq.err.capture": "Enter the cheque number, bank and both dates first.",

  /* ---- sources ---- */
  "chq.src.bill": "Bill #{no}",
  "chq.src.repayment": "Udhaar repayment",
  "chq.src.supplierPayment": "Supplier payment",
  "chq.src.expense": "Expense",

  /* ---- lifecycle actions ---- */
  "chq.action.deposit": "Deposit",
  "chq.action.clear": "Mark cleared",
  "chq.action.bounce": "Bounce",
  "chq.action.return": "Return to customer",
  "chq.deposit.title": "Deposit cheque",
  "chq.deposit.hint":
    "Depositing is a custody move only — no money moves yet. The amount lands in the chosen account when the cheque clears.",
  "chq.deposit.account": "Deposit into account",
  "chq.clear.title": "Mark cheque cleared",
  "chq.clear.hintIn": "The bank has paid — the amount lands in the deposit account now.",
  "chq.clear.hintOut": "The bank has paid — the amount leaves the drawn-on account now.",
  "chq.bounce.title": "Cheque bounced",
  "chq.bounce.hintIn":
    "The amount becomes owed by the customer again — it re-opens on their udhaar, against the original bill where there is one.",
  "chq.bounce.hintOut": "The amount becomes owed to the supplier again.",
  "chq.bounce.charges": "Bank charges (optional)",
  "chq.return.title": "Return cheque to customer",
  "chq.return.hint":
    "The cheque is handed back undeposited — the amount becomes owed by the customer again. Take the replacement as an ordinary repayment afterwards.",
  "chq.notice.deposited": "Cheque deposited at the bank.",
  "chq.notice.cleared": "Cheque marked cleared.",
  "chq.notice.bounced": "Cheque bounce recorded.",
  "chq.notice.returned": "Cheque returned to the customer.",
  "chq.notice.failed": "That action could not be completed.",
} as const;

export const urChq: Record<keyof typeof enChq, string> = {
  "nav.cheques": "چیک",
  "chq.title": "چیک رجسٹری",
  "chq.subtitle":
    "دکان کے موصولہ اور جاری کردہ تمام چیک — پوری زندگی کے ساتھ: وصولی، بینک جمع، کلیئرنگ یا باؤنس۔ رجسٹری چیک کی ڈائری ہے؛ رقم ہمیشہ کھاتے کے ذریعے حرکت کرتی ہے۔",
  "chq.searchPh": "چیک نمبر، بینک یا فریق تلاش کریں…",
  "chq.empty":
    "ابھی کوئی چیک نہیں۔ بل، ادھار واپسی، سپلائر ادائیگی یا خرچ میں چیک منتخب کریں تو وہ یہاں آئے گا۔",
  "chq.emptyFilter": "اس منظر میں کوئی چیک نہیں۔",
  "chq.col.cheque": "چیک",
  "chq.col.party": "فریق",
  "chq.col.amount": "رقم",
  "chq.col.dates": "تاریخیں",
  "chq.col.status": "حالت",
  "chq.col.source": "مد",
  "chq.col.actions": "اقدامات",
  "chq.dir.in": "موصولہ",
  "chq.dir.out": "جاری کردہ",
  "chq.status.received": "دراز میں",
  "chq.status.deposited": "بینک میں",
  "chq.status.issued": "جاری کردہ",
  "chq.status.cleared": "کلیئر",
  "chq.status.bounced": "باؤنس",
  "chq.status.returned": "واپس کردہ",
  "chq.view.all": "تمام",
  "chq.view.drawer": "دراز میں",
  "chq.view.atBank": "بینک میں",
  "chq.view.issued": "جاری کردہ زیر التوا",
  "chq.view.due": "قابلِ کلیئرنگ",
  "chq.view.cleared": "کلیئر شدہ",
  "chq.view.bounced": "باؤنس",
  "chq.view.returned": "واپس کردہ",
  "chq.sum.drawer": "دراز میں",
  "chq.sum.atBank": "بینک میں",
  "chq.sum.pendingOut": "جاری کردہ زیر التوا",
  "chq.overdue": "میعاد گزر گئی",
  "chq.dueOn": "تاریخ ادائیگی {date}",
  "chq.payOption": "چیک",
  "chq.field.no": "چیک نمبر",
  "chq.field.bank": "بینک",
  "chq.field.issueDate": "چیک کی تاریخ",
  "chq.field.dueDate": "تاریخ ادائیگی (PDC)",
  "chq.field.charges": "بینک چارجز",
  "chq.err.capture": "پہلے چیک نمبر، بینک اور دونوں تاریخیں درج کریں۔",
  "chq.src.bill": "بل نمبر {no}",
  "chq.src.repayment": "ادھار واپسی",
  "chq.src.supplierPayment": "سپلائر ادائیگی",
  "chq.src.expense": "خرچ",
  "chq.action.deposit": "بینک جمع کریں",
  "chq.action.clear": "کلیئر قرار دیں",
  "chq.action.bounce": "باؤنس",
  "chq.action.return": "گاہک کو واپس کریں",
  "chq.deposit.title": "چیک بینک میں جمع کریں",
  "chq.deposit.hint":
    "جمع کروانا صرف حفاظت کی تبدیلی ہے — ابھی کوئی رقم حرکت نہیں کرتی۔ رقم کلیئرنگ پر منتخب اکاؤنٹ میں آئے گی۔",
  "chq.deposit.account": "جمع کروانے کا اکاؤنٹ",
  "chq.clear.title": "چیک کلیئر قرار دیں",
  "chq.clear.hintIn": "بینک نے ادائیگی کر دی ہے — رقم اب جمع والے اکاؤنٹ میں آ جائے گی۔",
  "chq.clear.hintOut": "بینک نے ادائیگی کر دی ہے — رقم اب جاری کردہ اکاؤنٹ سے نکل جائے گی۔",
  "chq.bounce.title": "چیک باؤنس",
  "chq.bounce.hintIn":
    "رقم دوبارہ گاہک کے ذمے واجب الادا ہو جائے گی — اس کے کھاتے میں، اور جہاں اصل بل ہو وہاں اسی بل کے مد میں۔",
  "chq.bounce.hintOut": "رقم دوبارہ سپلائر کو واجب الادا ہو جائے گی۔",
  "chq.bounce.charges": "بینک چارجز (اختیاری)",
  "chq.return.title": "چیک گاہک کو واپس کریں",
  "chq.return.hint":
    "چیک بینک جمع ہوئے بغیر واپس کر دیا گیا — رقم دوبارہ گاہک کے ذمے واجب الادا ہو جائے گی۔ متبادل رقم بعد میں معمول کی واپسی کے طور پر لیں۔",
  "chq.notice.deposited": "چیک بینک میں جمع کر دیا گیا۔",
  "chq.notice.cleared": "چیک کلیئر قرار دے دیا گیا۔",
  "chq.notice.bounced": "چیک باؤنس ریکارڈ ہو گیا۔",
  "chq.notice.returned": "چیک گاہک کو واپس کر دیا گیا۔",
  "chq.notice.failed": "یہ عمل مکمل نہیں ہو سکا۔",
};
