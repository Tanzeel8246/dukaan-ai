/** i18n part: notes — Phase B · B4 formal credit/debit notes
 * (notes list, note prints, the credit-note issuance flow) and the
 * purchase-return desk copy used inside Suppliers. en + ur
 * dictionaries (identical key sets enforced by types). */
export const enNotes = {
  /* ---- notes workspace ---- */
  "note.title": "Credit & Debit Notes",
  "note.subtitle":
    "The formal paper for returned goods. A credit note is minted with a bill return; a debit note with goods returned to a supplier. Every note wraps a posting that is already in the ledger — the note itself never moves money.",
  "note.filter.all": "All notes",
  "note.filter.credit": "Credit notes",
  "note.filter.debit": "Debit notes",
  "note.searchPh": "Search note number or party…",
  "note.empty":
    "No notes yet. Post a formal bill return or return goods to a supplier and its note will appear here.",
  "note.col.number": "Note",
  "note.col.kind": "Kind",
  "note.col.party": "Party",
  "note.col.against": "Against",
  "note.col.goods": "Goods",
  "note.col.tax": "Tax reversed",
  "note.kind.credit": "Credit note",
  "note.kind.debit": "Debit note",
  "note.againstBill": "Bill #{no}",
  "note.againstPurchase": "Purchase · {date}",
  "note.settlement": "Settlement",
  "note.settle.cash_refund": "Cash refund",
  "note.settle.credit_reduction": "Udhaar reduced",
  "note.settle.payable_offset": "Payable reduced",
  "note.reason": "Reason",
  "note.view": "View",
  "note.print": "Print",
  "note.posted": "Posted",

  /* ---- credit-note issuance (formal return) ---- */
  "note.issue.title": "Issue credit note",
  "note.issue.sub":
    "Post a return against a posted bill — the return posts through the ordinary returns engine and the credit note is minted with it, in the same step.",
  "note.issue.bill": "Bill",
  "note.issue.selectBill": "Select a posted bill…",
  "note.issue.noBills": "No posted bills can take a return right now.",
  "note.issue.customer": "Customer",
  "note.issue.returnQty": "Return qty",
  "note.issue.left": "{qty} left",
  "note.issue.method": "Refund method",
  "note.issue.account": "Refund from account",
  "note.issue.reasonPh": "Why are the goods coming back?",
  "note.issue.submit": "Post return & issue note",
  "note.issue.success": "Credit note {number} issued against Bill #{no}.",
  "note.issue.failed": "The return could not be posted.",

  /* ---- note print ---- */
  "note.print.creditTitle": "Credit Note",
  "note.print.debitTitle": "Debit Note",
  "note.print.againstBill": "Against Bill #{no}",
  "note.print.againstPurchase": "Against purchase of {date}",
  "note.print.goods": "Goods returned",
  "note.print.tax": "Tax reversed",
  "note.print.refundedCash": "Refunded in cash",
  "note.print.udhaarReduced": "Udhaar reduced",
  "note.print.payableReduced": "Payable reduced",
  "note.print.cashBack": "Cash received back",
  "note.print.footer":
    "This note formalizes a return already posted to the shop's ledger.",

  /* ---- purchase returns (Suppliers desk) ---- */
  "sup.preturn.button": "Return goods",
  "sup.preturn.title": "Return goods to supplier",
  "sup.preturn.sub": "Against the purchase of {date} · {amount}",
  "sup.preturn.qty": "Return qty",
  "sup.preturn.alreadyReturned": "{qty} already returned",
  "sup.preturn.settlement": "Settlement",
  "sup.preturn.offset": "Reduce what we owe (payable)",
  "sup.preturn.refund": "Supplier refunds money now",
  "sup.preturn.method": "Refund method",
  "sup.preturn.account": "Refund into account",
  "sup.preturn.reason": "Reason",
  "sup.preturn.reasonPh": "Damaged, wrong item, expired…",
  "sup.preturn.submit": "Post return & debit note",
  "sup.preturn.success": "Debit note {number} issued — the goods are returned.",
  "sup.preturn.failed": "The purchase return could not be posted.",
  "sup.preturn.none": "Enter a return quantity for at least one item.",
  "sup.preturn.errMax": "Only {qty} of {name} can still be returned.",
  "sup.preturn.purchasedLine": "Purchased {qty} · at {cost}",
  "sup.preturn.historyTitle": "Purchase returns",
  "sup.preturn.noReturns": "No purchase returns yet.",
  "sup.preturn.against": "Against purchase of {date}",
  "sup.detail.summaryFull": "Purchased {purchased} · Returned {returned} · Paid {paid}",

  /* ---- billing desk: formal return ---- */
  "billing.returnReason": "Reason (printed on the credit note)",
  "billing.returnReasonPh": "Reason for the return…",
  "billing.successReturnedNote":
    "Bill #{no} returned — credit note {note} issued.",
};

export const urNotes: Record<keyof typeof enNotes, string> = {
  /* ---- notes workspace ---- */
  "note.title": "کریڈٹ و ڈیبٹ نوٹس",
  "note.subtitle":
    "واپس شدہ سامان کی باقاعدہ دستاویز۔ کریڈٹ نوٹ بل کی واپسی کے ساتھ بنتا ہے؛ ڈیبٹ نوٹ سپلائر کو سامان واپس کرنے پر۔ ہر نوٹ اس اندراج کی دستاویز ہے جو کھاتے میں پہلے سے درج ہے — نوٹ خود کوئی رقم نہیں چلاتا۔",
  "note.filter.all": "تمام نوٹس",
  "note.filter.credit": "کریڈٹ نوٹس",
  "note.filter.debit": "ڈیبٹ نوٹس",
  "note.searchPh": "نوٹ نمبر یا فریق تلاش کریں…",
  "note.empty":
    "ابھی کوئی نوٹ نہیں۔ بل کی باقاعدہ واپسی درج کریں یا سپلائر کو سامان واپس کریں — اس کا نوٹ یہاں آ جائے گا۔",
  "note.col.number": "نوٹ",
  "note.col.kind": "قسم",
  "note.col.party": "فریق",
  "note.col.against": "بنام",
  "note.col.goods": "سامان",
  "note.col.tax": "واپس شدہ ٹیکس",
  "note.kind.credit": "کریڈٹ نوٹ",
  "note.kind.debit": "ڈیبٹ نوٹ",
  "note.againstBill": "بل نمبر {no}",
  "note.againstPurchase": "خریداری · {date}",
  "note.settlement": "تصفیہ",
  "note.settle.cash_refund": "نقد واپسی",
  "note.settle.credit_reduction": "ادھار کم ہوا",
  "note.settle.payable_offset": "واجب الادا کم ہوا",
  "note.reason": "وجہ",
  "note.view": "دیکھیں",
  "note.print": "چھاپیں",
  "note.posted": "درج شدہ",

  /* ---- credit-note issuance (formal return) ---- */
  "note.issue.title": "کریڈٹ نوٹ جاری کریں",
  "note.issue.sub":
    "درج شدہ بل کے خلاف واپسی لگائیں — واپسی معمول کے واپسی نظام سے درج ہوتی ہے اور کریڈٹ نوٹ اسی قدم میں اس کے ساتھ بنتا ہے۔",
  "note.issue.bill": "بل",
  "note.issue.selectBill": "درج شدہ بل منتخب کریں…",
  "note.issue.noBills": "اس وقت کوئی درج شدہ بل واپسی کے قابل نہیں۔",
  "note.issue.customer": "گاہک",
  "note.issue.returnQty": "واپسی مقدار",
  "note.issue.left": "{qty} باقی",
  "note.issue.method": "رقم واپسی کا طریقہ",
  "note.issue.account": "واپسی کس کھاتے سے",
  "note.issue.reasonPh": "سامان واپس کیوں آ رہا ہے؟",
  "note.issue.submit": "واپسی درج کر کے نوٹ جاری کریں",
  "note.issue.success": "بل نمبر {no} کے خلاف کریڈٹ نوٹ {number} جاری ہو گیا۔",
  "note.issue.failed": "واپسی درج نہیں ہو سکی۔",

  /* ---- note print ---- */
  "note.print.creditTitle": "کریڈٹ نوٹ",
  "note.print.debitTitle": "ڈیبٹ نوٹ",
  "note.print.againstBill": "بنام بل نمبر {no}",
  "note.print.againstPurchase": "بنام خریداری بتاریخ {date}",
  "note.print.goods": "واپس شدہ سامان",
  "note.print.tax": "واپس شدہ ٹیکس",
  "note.print.refundedCash": "نقد واپس ہوا",
  "note.print.udhaarReduced": "ادھار کم ہوا",
  "note.print.payableReduced": "واجب الادا کم ہوا",
  "note.print.cashBack": "نقد وصول ہوا",
  "note.print.footer":
    "یہ نوٹ اس واپسی کی باقاعدہ دستاویز ہے جو دکان کے کھاتے میں پہلے سے درج ہے۔",

  /* ---- purchase returns (Suppliers desk) ---- */
  "sup.preturn.button": "سامان واپس کریں",
  "sup.preturn.title": "سپلائر کو سامان واپسی",
  "sup.preturn.sub": "خریداری بتاریخ {date} · {amount} کے خلاف",
  "sup.preturn.qty": "واپسی مقدار",
  "sup.preturn.alreadyReturned": "{qty} پہلے واپس ہو چکا",
  "sup.preturn.settlement": "تصفیہ",
  "sup.preturn.offset": "ہمارا واجب الادا کم کریں",
  "sup.preturn.refund": "سپلائر ابھی رقم واپس کرے",
  "sup.preturn.method": "رقم واپسی کا طریقہ",
  "sup.preturn.account": "رقم کس کھاتے میں آئے",
  "sup.preturn.reason": "وجہ",
  "sup.preturn.reasonPh": "خراب، غلط شے، زائد المیعاد…",
  "sup.preturn.submit": "واپسی درج کر کے ڈیبٹ نوٹ جاری کریں",
  "sup.preturn.success": "ڈیبٹ نوٹ {number} جاری ہو گیا — سامان واپس ہو گیا۔",
  "sup.preturn.failed": "خرید واپسی درج نہیں ہو سکی۔",
  "sup.preturn.none": "کم از کم ایک شے کی واپسی مقدار لکھیں۔",
  "sup.preturn.errMax": "{name} کی صرف {qty} مقدار مزید واپس ہو سکتی ہے۔",
  "sup.preturn.purchasedLine": "خریدا گیا {qty} · {cost} پر",
  "sup.preturn.historyTitle": "خرید واپسیاں",
  "sup.preturn.noReturns": "ابھی کوئی خرید واپسی نہیں۔",
  "sup.preturn.against": "خریداری بتاریخ {date} کے خلاف",
  "sup.detail.summaryFull": "خریداری {purchased} · واپسی {returned} · ادا شدہ {paid}",

  /* ---- billing desk: formal return ---- */
  "billing.returnReason": "وجہ (کریڈٹ نوٹ پر چھپے گی)",
  "billing.returnReasonPh": "واپسی کی وجہ…",
  "billing.successReturnedNote":
    "بل نمبر {no} واپس ہو گیا — کریڈٹ نوٹ {note} جاری ہو گیا۔",
};
