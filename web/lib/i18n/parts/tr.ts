/** i18n part: tr — Phase C · C2 stock transfers (the transfers
 * workspace, dispatch / receive / close-short / return-to-source
 * flows, the transfer print sheet, and the incoming column the
 * warehouses stock view gains). en + ur dictionaries (identical
 * key sets enforced by types). */
export const enTr = {
  /* ---- navigation ---- */
  "nav.stockTransfers": "Stock Transfers",

  /* ---- workspace ---- */
  "tr.eyebrow": "Between warehouses",
  "tr.title": "Stock Transfers",
  "tr.subtitle":
    "Move stock between your own warehouses. Dispatch takes the goods off the source shelf and puts them on the road; receiving lands them at the destination. A transfer moves no money — only a shortage proven at closing posts to the accounts, as a stock loss.",
  "tr.add": "New transfer",
  "tr.empty":
    "No transfers yet. Create one to move stock from one warehouse to another.",
  "tr.summary.inTransit": "{qty} units on the road",
  "tr.summary.open": "{count} open transfer(s)",
  "tr.summary.none": "Nothing on the road",
  "tr.col.number": "Transfer",
  "tr.col.route": "Route",
  "tr.col.items": "Items",
  "tr.col.product": "Product",
  "tr.col.sent": "Sent",
  "tr.col.received": "Received",
  "tr.col.remaining": "On the road",
  "tr.col.status": "Status",
  "tr.col.incoming": "Incoming",
  "tr.status.draft": "Draft",
  "tr.status.dispatched": "Dispatched",
  "tr.status.partially_received": "Partially received",
  "tr.status.received": "Received",
  "tr.status.returned": "Returned to source",
  "tr.status.cancelled": "Cancelled",

  /* ---- create / edit form ---- */
  "tr.form.addTitle": "New stock transfer",
  "tr.form.editTitle": "Edit stock transfer",
  "tr.form.from": "From warehouse",
  "tr.form.to": "To warehouse",
  "tr.form.note": "Note",
  "tr.form.notePh": "Optional — vehicle, driver, reason…",
  "tr.lines.product": "Product",
  "tr.lines.searchPh": "Search products — click or Enter to add…",
  "tr.lines.noResults": "No product matches “{query}”.",
  "tr.lines.empty": "Add at least one product to move.",
  "tr.lines.atSource": "{qty} at source",

  /* ---- errors ---- */
  "tr.err.same": "Source and destination must be different warehouses.",
  "tr.err.route": "Both warehouses must exist — refresh and try again.",
  "tr.err.archived": "An archived warehouse cannot send or receive new transfers.",
  "tr.err.overReceive":
    "A line cannot receive more than was sent. Check the quantities.",

  /* ---- actions ---- */
  "tr.action.dispatch": "Dispatch",
  "tr.action.receive": "Receive goods",
  "tr.action.closeShort": "Close with shortage",
  "tr.action.returnToSource": "Return to source",
  "tr.action.edit": "Edit",
  "tr.action.print": "Print",
  "tr.action.delete": "Delete",
  "tr.action.cancelTransfer": "Cancel transfer",

  /* ---- notices ---- */
  "tr.notice.created": "Draft transfer created.",
  "tr.notice.updated": "Transfer updated.",
  "tr.notice.dispatched": "{number} dispatched — the goods are on the road.",
  "tr.notice.received": "Receipt recorded for {number}.",
  "tr.notice.receivedFull": "{number} fully received.",
  "tr.notice.closedShort":
    "{number} closed — a shortage of {amount} was booked as a stock loss.",
  "tr.notice.returned": "{number} closed — what was still on the road went back to {name}.",
  "tr.notice.cancelled": "Transfer cancelled.",
  "tr.notice.deleted": "Draft transfer deleted.",

  /* ---- receive modal ---- */
  "tr.receive.title": "Receive goods — {number}",
  "tr.receive.help":
    "Enter what actually arrived this time. Anything left stays on the road and can be received later — or closed as a shortage.",
  "tr.receive.thisTime": "Arrived now",
  "tr.receive.stillOut": "{qty} still on the road",
  "tr.receive.fillAll": "Fill all remaining",
  "tr.receive.submit": "Record receipt",

  /* ---- close-short modal ---- */
  "tr.close.title": "Close with shortage — {number}",
  "tr.close.body":
    "These goods were sent but never arrived. Closing books them as a stock loss at today's cost — this is the one transfer action that posts to the accounts, and it cannot be undone.",
  "tr.close.line": "{name} — {qty} short · {amount}",
  "tr.close.total": "Total loss",
  "tr.close.submit": "Close & book the loss",

  /* ---- return-to-source modal ---- */
  "tr.return.title": "Return to source — {number}",
  "tr.return.body":
    "The {qty} unit(s) still on the road go back onto the shelf at {name}. Goods already received stay where they are.",
  "tr.return.submit": "Return to source",

  /* ---- print sheet ---- */
  "tr.print.title": "Stock Transfer",
  "tr.print.quantitiesNote":
    "Quantities only — a transfer moves stock between your own warehouses; no value changes hands.",
  "tr.print.dispatchedBy": "Dispatched by",
  "tr.print.receivedBy": "Received by",
} as const;

export const urTr: Record<keyof typeof enTr, string> = {
  /* ---- navigation ---- */
  "nav.stockTransfers": "اسٹاک منتقلی",

  /* ---- workspace ---- */
  "tr.eyebrow": "گوداموں کے درمیان",
  "tr.title": "اسٹاک منتقلی",
  "tr.subtitle":
    "اپنے ہی گوداموں کے درمیان اسٹاک منتقل کریں۔ روانگی سامان کو ماخذ کی شیلف سے اتار کر راستے پر ڈال دیتی ہے؛ وصولی اسے منزل پر اتارتی ہے۔ منتقلی میں کوئی رقم نہیں چلتی — صرف اختتام پر ثابت شدہ کمی کھاتوں میں درج ہوتی ہے، بطور اسٹاک نقصان۔",
  "tr.add": "نئی منتقلی",
  "tr.empty": "ابھی کوئی منتقلی نہیں۔ ایک بنائیں اور اسٹاک ایک گودام سے دوسرے میں بھیجیں۔",
  "tr.summary.inTransit": "{qty} یونٹ راستے میں ہیں",
  "tr.summary.open": "{count} کھلی منتقلیاں",
  "tr.summary.none": "راستے میں کچھ نہیں",
  "tr.col.number": "منتقلی",
  "tr.col.route": "راستہ",
  "tr.col.items": "اشیاء",
  "tr.col.product": "پروڈکٹ",
  "tr.col.sent": "بھیجا",
  "tr.col.received": "وصول",
  "tr.col.remaining": "راستے میں",
  "tr.col.status": "حالت",
  "tr.col.incoming": "آنے والا",
  "tr.status.draft": "مسودہ",
  "tr.status.dispatched": "روانہ",
  "tr.status.partially_received": "جزوی وصول",
  "tr.status.received": "وصول شدہ",
  "tr.status.returned": "ماخذ کو واپس",
  "tr.status.cancelled": "منسوخ",

  /* ---- create / edit form ---- */
  "tr.form.addTitle": "نئی اسٹاک منتقلی",
  "tr.form.editTitle": "اسٹاک منتقلی میں ترمیم",
  "tr.form.from": "کس گودام سے",
  "tr.form.to": "کس گودام کو",
  "tr.form.note": "نوٹ",
  "tr.form.notePh": "اختیاری — گاڑی، ڈرائیور، وجہ…",
  "tr.lines.product": "پروڈکٹ",
  "tr.lines.searchPh": "پروڈکٹ تلاش کریں — کلک یا Enter سے شامل کریں…",
  "tr.lines.noResults": "“{query}” سے کوئی پروڈکٹ نہیں ملا۔",
  "tr.lines.empty": "منتقل کرنے کے لیے کم از کم ایک پروڈکٹ شامل کریں۔",
  "tr.lines.atSource": "ماخذ پر {qty} موجود",

  /* ---- errors ---- */
  "tr.err.same": "ماخذ اور منزل الگ الگ گودام ہونے چاہئیں۔",
  "tr.err.route": "دونوں گودام موجود ہونے چاہئیں — تازہ کر کے دوبارہ کوشش کریں۔",
  "tr.err.archived": "آرکائیو شدہ گودام نئی منتقلی نہ بھیج سکتا ہے نہ وصول کر سکتا ہے۔",
  "tr.err.overReceive": "کسی لائن میں بھیجی گئی مقدار سے زیادہ وصول نہیں ہو سکتا۔ مقداریں جانچیں۔",

  /* ---- actions ---- */
  "tr.action.dispatch": "روانہ کریں",
  "tr.action.receive": "سامان وصول کریں",
  "tr.action.closeShort": "کمی کے ساتھ بند کریں",
  "tr.action.returnToSource": "ماخذ کو واپس",
  "tr.action.edit": "ترمیم",
  "tr.action.print": "پرنٹ",
  "tr.action.delete": "حذف",
  "tr.action.cancelTransfer": "منتقلی منسوخ کریں",

  /* ---- notices ---- */
  "tr.notice.created": "مسودہ منتقلی بن گئی۔",
  "tr.notice.updated": "منتقلی تازہ ہو گئی۔",
  "tr.notice.dispatched": "{number} روانہ ہو گئی — سامان راستے میں ہے۔",
  "tr.notice.received": "{number} کی وصولی درج ہو گئی۔",
  "tr.notice.receivedFull": "{number} مکمل وصول ہو گئی۔",
  "tr.notice.closedShort": "{number} بند ہو گئی — {amount} کی کمی اسٹاک نقصان کے طور پر درج ہو گئی۔",
  "tr.notice.returned": "{number} بند ہو گئی — جو راستے میں تھا وہ {name} واپس چلا گیا۔",
  "tr.notice.cancelled": "منتقلی منسوخ ہو گئی۔",
  "tr.notice.deleted": "مسودہ منتقلی حذف ہو گئی۔",

  /* ---- receive modal ---- */
  "tr.receive.title": "سامان وصول کریں — {number}",
  "tr.receive.help":
    "اس بار جو واقعی پہنچا وہ درج کریں۔ جو باقی رہے گا وہ راستے میں رہے گا اور بعد میں وصول ہو سکے گا — یا کمی کے طور پر بند ہو سکے گا۔",
  "tr.receive.thisTime": "اس بار پہنچا",
  "tr.receive.stillOut": "{qty} ابھی راستے میں ہیں",
  "tr.receive.fillAll": "تمام باقی درج کریں",
  "tr.receive.submit": "وصولی درج کریں",

  /* ---- close-short modal ---- */
  "tr.close.title": "کمی کے ساتھ بند کریں — {number}",
  "tr.close.body":
    "یہ سامان بھیجا گیا تھا مگر کبھی پہنچا نہیں۔ بند کرنے سے یہ آج کی لاگت پر اسٹاک نقصان کے طور پر درج ہو جائے گا — یہ منتقلی کی وہ واحد کارروائی ہے جو کھاتوں میں درج ہوتی ہے، اور یہ واپس نہیں ہو سکتی۔",
  "tr.close.line": "{name} — {qty} کم · {amount}",
  "tr.close.total": "کل نقصان",
  "tr.close.submit": "بند کریں اور نقصان درج کریں",

  /* ---- return-to-source modal ---- */
  "tr.return.title": "ماخذ کو واپس — {number}",
  "tr.return.body": "جو {qty} یونٹ ابھی راستے میں ہیں وہ {name} کی شیلف پر واپس چلے جائیں گے۔ جو وصول ہو چکا ہے وہ وہیں رہے گا۔",
  "tr.return.submit": "ماخذ کو واپس کریں",

  /* ---- print sheet ---- */
  "tr.print.title": "اسٹاک منتقلی",
  "tr.print.quantitiesNote": "صرف مقداریں — منتقلی آپ کے اپنے گوداموں کے درمیان اسٹاک حرکت دیتی ہے؛ کوئی قیمت ہاتھ نہیں بدلتی۔",
  "tr.print.dispatchedBy": "روانہ کنندہ",
  "tr.print.receivedBy": "وصول کنندہ",
};
