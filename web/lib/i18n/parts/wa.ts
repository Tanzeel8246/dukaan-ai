/** i18n part: wa — Phase H · WhatsApp marketing (the marketing
 * desk, templates, campaigns, the send queue, service reminders,
 * and the customer consent copy). en + ur dictionaries
 * (identical key sets enforced by types). */
export const enWa = {
  /* ---- navigation ---- */
  "nav.whatsapp": "WhatsApp Marketing",

  /* ---- the desk ---- */
  "wa.title": "WhatsApp Marketing",
  "wa.subtitle":
    "Campaigns to your own customers, from your own WhatsApp number, sent by your own hand. Dukaan AI organises the consent, the lists and the record — the sending stays yours.",
  "wa.lockedTitle": "WhatsApp marketing is not in your plan",
  "wa.lockedBody":
    "Campaigns, templates and service reminders join the Standard plan. Your customers and their consent choices stay exactly as they are — upgrade to start sending.",
  "wa.sendingPaused":
    "Your plan is not active right now, so launching and sending are paused. Everything here stays readable — renew to send again.",

  /* ---- the honest v1 limits (design §3.6, in plain words) ---- */
  "wa.limits.title": "How sending works — please read",
  "wa.limits.body":
    "Messages go one by one from your own WhatsApp: tap Send, the chat opens with the message ready, you press send there and come back. Nothing is sent automatically or in bulk, and this app cannot see whether a message was delivered or read — “sent” in the log means you confirmed you sent it. Only customers who agreed receive campaigns, and sending too many messages too fast can get a number restricted by WhatsApp — the one-by-one pace is the protection.",

  /* ---- suggested reminders (design §3.5) ---- */
  "wa.suggest.title": "Suggested reminders",
  "wa.suggest.sub":
    "Work your own data is pointing at today. Counts include only customers who agreed to WhatsApp marketing — starting a campaign is always your tap, never automatic.",
  "wa.suggest.udhaarTitle": "Udhaar reminders",
  "wa.suggest.udhaarSub": "{count} customers · udhaar older than {days} days",
  "wa.suggest.pointsTitle": "Points expiring soon",
  "wa.suggest.pointsSub": "{count} customers · points expire within {days} days",
  "wa.suggest.serviceTitle": "Service due",
  "wa.suggest.serviceSub": "{count} customers · last job over {days} days ago",
  "wa.suggest.start": "Start campaign",
  "wa.serviceInterval.label": "Service reminder interval (days)",
  "wa.serviceInterval.sub":
    "A delivered job older than this suggests a service reminder. Set by the owner.",

  /* ---- templates ---- */
  "wa.tpl.title": "Message templates",
  "wa.tpl.sub":
    "Your own words, reused. Placeholders fill in per customer when the queue reaches them.",
  "wa.tpl.placeholders":
    "Placeholders: {name} the customer's name · {shop} your shop's name · {points} their loyalty points · {amount} their outstanding udhaar in rupees",
  "wa.tpl.new": "New template",
  "wa.tpl.name": "Template name",
  "wa.tpl.namePh": "e.g. Eid offer",
  "wa.tpl.kind": "Kind",
  "wa.tpl.kindPromo": "Promotion",
  "wa.tpl.kindReminder": "Reminder",
  "wa.tpl.body": "Message",
  "wa.tpl.bodyPh": "Write the message your customers will receive…",
  "wa.tpl.save": "Save template",
  "wa.tpl.delete": "Delete",
  "wa.tpl.deleteSure": "Delete this template? Campaigns already sent keep their record.",
  "wa.tpl.empty": "No templates yet. Write one, or start from a starter below.",
  "wa.tpl.starters": "Starter templates — copy, then make them yours",
  "wa.tpl.use": "Use this",
  "wa.tpl.starterPromo1Name": "General offer",
  "wa.tpl.starterPromo1":
    "Assalam-o-Alaikum {name}, a special offer at {shop} this week — visit us and save on your regular shopping. Reply STOP to opt out.",
  "wa.tpl.starterPromo2Name": "New stock",
  "wa.tpl.starterPromo2":
    "Assalam-o-Alaikum {name}, fresh stock has arrived at {shop}. Come by while it lasts — and you have {points} loyalty points waiting to spend.",
  "wa.tpl.starterReminder1Name": "Udhaar reminder",
  "wa.tpl.starterReminder1":
    "Assalam-o-Alaikum {name}, a gentle reminder from {shop}: Rs {amount} is outstanding on your account. Please clear it when convenient — thank you.",
  "wa.tpl.starterReminder2Name": "Points expiring",
  "wa.tpl.starterReminder2":
    "Assalam-o-Alaikum {name}, you have {points} loyalty points at {shop} that expire soon. Use them on your next visit so they are not lost.",

  /* ---- campaigns ---- */
  "wa.camp.title": "Campaigns",
  "wa.camp.sub":
    "A campaign is a template plus an audience. The audience is worked out live when you launch — never a frozen list.",
  "wa.camp.new": "New campaign",
  "wa.camp.name": "Campaign name",
  "wa.camp.namePh": "e.g. Eid week offer",
  "wa.camp.template": "Template",
  "wa.camp.templateNone": "Create a template first",
  "wa.camp.audience": "Audience",
  "wa.aud.all": "All opted-in customers",
  "wa.aud.tier": "Loyalty tier",
  "wa.aud.udhaar": "Udhaar outstanding",
  "wa.aud.points": "Points expiring",
  "wa.aud.inactive": "Inactive customers",
  "wa.aud.storefront": "Online store customers",
  "wa.aud.serviceDue": "Service due",
  "wa.aud.minRs": "At least (Rs)",
  "wa.aud.minDays": "Outstanding for at least (days)",
  "wa.aud.withinDays": "Expiring within (days)",
  "wa.aud.inactiveDays": "No bill in (days)",
  "wa.camp.reach": "{count} customers will receive this",
  "wa.camp.create": "Create campaign",
  "wa.camp.stateDraft": "Draft",
  "wa.camp.stateSending": "Sending",
  "wa.camp.stateDone": "Done",
  "wa.camp.launch": "Launch",
  "wa.camp.queued": "{count} recipients queued",
  "wa.camp.progress": "{sent} sent · {skipped} skipped · {total} total",
  "wa.camp.openQueue": "Open send queue",
  "wa.camp.finish": "Finish campaign",
  "wa.camp.empty": "No campaigns yet. Create one from a template and an audience.",

  /* ---- the send queue ---- */
  "wa.queue.title": "Send queue",
  "wa.queue.sub":
    "One customer at a time. Open the chat, send in WhatsApp, come back and confirm.",
  "wa.queue.honestNote":
    "“Sent” here means you confirm you sent it in WhatsApp — this app cannot see delivery or reads, and does not pretend to.",
  "wa.queue.messageLabel": "Message for {name}",
  "wa.queue.send": "Open in WhatsApp",
  "wa.queue.sent": "I sent it",
  "wa.queue.skip": "Skip for now",
  "wa.queue.remaining": "{count} remaining",
  "wa.queue.done": "This queue is finished — every recipient has a result in the log.",
  "wa.queue.skippedOptout": "Skipped: this customer is no longer opted in.",
  "wa.queue.skippedInvalid": "Skipped: this number does not look valid for WhatsApp.",
  "wa.queue.logTitle": "Send log",
  "wa.queue.logEmpty": "Nothing sent yet.",
  "wa.sendState.queued": "Queued",
  "wa.sendState.opened": "Opened",
  "wa.sendState.sent": "Sent",
  "wa.sendState.skipped_optout": "Skipped · opted out",
  "wa.sendState.skipped_invalid": "Skipped · bad number",

  /* ---- notices ---- */
  "wa.notice.templateSaved": "Template saved.",
  "wa.notice.templateDeleted": "Template deleted.",
  "wa.notice.campaignCreated": "Campaign created as a draft.",
  "wa.notice.launched": "Launched — {count} recipients in the queue.",
  "wa.notice.finished": "Campaign finished.",
  "wa.notice.consentSaved": "Consent updated for {name}.",

  /* ---- consent (customer form, profile, storefront conversion) ---- */
  "wa.consent.label": "This customer agrees to receive marketing messages on WhatsApp",
  "wa.consent.sub":
    "Only customers who agree get campaign messages. Bills, receipts and order updates are not marketing and can always be sent.",
  "wa.consent.on": "WhatsApp marketing: agreed",
  "wa.consent.off": "WhatsApp marketing: not agreed",
  "wa.consent.since": "Recorded on {date} · {source}",
  "wa.consent.sourceCounter": "at the counter",
  "wa.consent.sourceStorefront": "via the online store",
  "wa.consent.optIn": "Opt in",
  "wa.consent.optOut": "Opt out",
  "wa.consent.storefrontLabel": "Customer agreed to WhatsApp marketing messages",
  "wa.consent.storefrontSub":
    "Tick only when the customer has agreed — the consent is recorded on their customer record as this order converts.",
} as const;

export const urWa: Record<keyof typeof enWa, string> = {
  "nav.whatsapp": "واٹس ایپ مارکیٹنگ",

  "wa.title": "واٹس ایپ مارکیٹنگ",
  "wa.subtitle":
    "اپنے گاہکوں کے لیے مہمات، اپنے واٹس ایپ نمبر سے، اپنے ہاتھ سے بھیجی ہوئی۔ دکان اے آئی رضامندی، فہرستیں اور ریکارڈ سنبھالتی ہے — بھیجنا آپ ہی کا کام رہتا ہے۔",
  "wa.lockedTitle": "واٹس ایپ مارکیٹنگ آپ کے پلان میں شامل نہیں",
  "wa.lockedBody":
    "مہمات، ٹیمپلیٹس اور سروس ریمائنڈرز اسٹینڈرڈ پلان کے ساتھ ملتے ہیں۔ آپ کے گاہک اور ان کی رضامندی کے فیصلے ویسے کے ویسے رہتے ہیں — بھیجنا شروع کرنے کے لیے پلان بڑھائیں۔",
  "wa.sendingPaused":
    "آپ کا پلان اس وقت فعال نہیں، اس لیے مہم شروع کرنا اور بھیجنا رکا ہوا ہے۔ یہاں سب کچھ پڑھا جا سکتا ہے — دوبارہ بھیجنے کے لیے پلان کی تجدید کریں۔",

  "wa.limits.title": "بھیجنے کا طریقہ — براہ کرم پڑھ لیں",
  "wa.limits.body":
    "پیغامات آپ کے اپنے واٹس ایپ سے ایک ایک کر کے جاتے ہیں: بھیجیں دبائیں، پیغام تیار حالت میں چیٹ کھلتی ہے، آپ وہاں بھیج کر واپس آتے ہیں۔ کچھ بھی خودکار یا تھوک میں نہیں بھیجا جاتا، اور یہ ایپ یہ نہیں دیکھ سکتی کہ پیغام پہنچا یا پڑھا گیا — ریکارڈ میں «بھیجا گیا» کا مطلب ہے کہ آپ نے تصدیق کی کہ آپ نے بھیجا۔ مہمات صرف ان گاہکوں کو جاتی ہیں جنہوں نے رضامندی دی ہو، اور بہت تیزی سے بہت زیادہ پیغامات بھیجنے پر واٹس ایپ نمبر محدود کر سکتا ہے — ایک ایک کر کے بھیجنے کی رفتار ہی حفاظت ہے۔",

  "wa.suggest.title": "تجویز کردہ ریمائنڈرز",
  "wa.suggest.sub":
    "وہ کام جس کی طرف آج آپ کا اپنا ڈیٹا اشارہ کر رہا ہے۔ گنتی میں صرف وہ گاہک شامل ہیں جنہوں نے واٹس ایپ مارکیٹنگ کی رضامندی دی ہے — مہم شروع کرنا ہمیشہ آپ کا اپنا فیصلہ ہے، خودکار کبھی نہیں۔",
  "wa.suggest.udhaarTitle": "اُدھار ریمائنڈرز",
  "wa.suggest.udhaarSub": "{count} گاہک · اُدھار {days} دن سے پرانا",
  "wa.suggest.pointsTitle": "پوائنٹس ختم ہونے والے ہیں",
  "wa.suggest.pointsSub": "{count} گاہک · پوائنٹس {days} دن کے اندر ختم ہو جائیں گے",
  "wa.suggest.serviceTitle": "سروس کا وقت آ گیا",
  "wa.suggest.serviceSub": "{count} گاہک · آخری کام {days} دن سے پرانا",
  "wa.suggest.start": "مہم شروع کریں",
  "wa.serviceInterval.label": "سروس ریمائنڈر کا وقفہ (دن)",
  "wa.serviceInterval.sub":
    "اس سے پرانا مکمل شدہ کام سروس ریمائنڈر کی تجویز بنتا ہے۔ یہ مالک مقرر کرتا ہے۔",

  "wa.tpl.title": "پیغام کے ٹیمپلیٹس",
  "wa.tpl.sub":
    "آپ کے اپنے الفاظ، بار بار استعمال کے لیے۔ جب قطار کسی گاہک تک پہنچتی ہے تو پلیس ہولڈرز اسی کے حساب سے بھر جاتے ہیں۔",
  "wa.tpl.placeholders":
    "پلیس ہولڈرز: {name} گاہک کا نام · {shop} آپ کی دکان کا نام · {points} اس کے لائلٹی پوائنٹس · {amount} اس کا بقایا اُدھار روپوں میں",
  "wa.tpl.new": "نیا ٹیمپلیٹ",
  "wa.tpl.name": "ٹیمپلیٹ کا نام",
  "wa.tpl.namePh": "مثلاً عید آفر",
  "wa.tpl.kind": "قسم",
  "wa.tpl.kindPromo": "پروموشن",
  "wa.tpl.kindReminder": "ریمانڈر",
  "wa.tpl.body": "پیغام",
  "wa.tpl.bodyPh": "وہ پیغام لکھیں جو گاہکوں کو ملے گا…",
  "wa.tpl.save": "ٹیمپلیٹ محفوظ کریں",
  "wa.tpl.delete": "حذف کریں",
  "wa.tpl.deleteSure": "یہ ٹیمپلیٹ حذف کر دیں؟ پہلے بھیجی گئی مہمات کا ریکارڈ برقرار رہے گا۔",
  "wa.tpl.empty": "ابھی کوئی ٹیمپلیٹ نہیں۔ ایک لکھیں، یا نیچے دیے گئے نمونوں سے شروع کریں۔",
  "wa.tpl.starters": "نمونہ ٹیمپلیٹس — نقل کریں، پھر اپنے بنا لیں",
  "wa.tpl.use": "یہ استعمال کریں",
  "wa.tpl.starterPromo1Name": "عام آفر",
  "wa.tpl.starterPromo1":
    "السلام علیکم {name}، اس ہفتے {shop} پر آپ کے لیے خاص آفر ہے — تشریف لائیں اور اپنی معمول کی خریداری پر بچت کریں۔ رکنے کے لیے STOP لکھ کر جواب دیں۔",
  "wa.tpl.starterPromo2Name": "نیا اسٹاک",
  "wa.tpl.starterPromo2":
    "السلام علیکم {name}، {shop} پر تازہ اسٹاک آ گیا ہے۔ ختم ہونے سے پہلے تشریف لائیں — اور آپ کے {points} لائلٹی پوائنٹس بھی خرچ ہونے کے منتظر ہیں۔",
  "wa.tpl.starterReminder1Name": "اُدھار ریمائنڈر",
  "wa.tpl.starterReminder1":
    "السلام علیکم {name}، {shop} کی طرف سے ایک مہذب یاددہانی: آپ کے کھاتے میں {amount} روپے بقایا ہیں۔ سہولت کے مطابق ادا کر دیں — شکریہ۔",
  "wa.tpl.starterReminder2Name": "پوائنٹس ختم ہونے والے ہیں",
  "wa.tpl.starterReminder2":
    "السلام علیکم {name}، {shop} پر آپ کے {points} لائلٹی پوائنٹس جلد ختم ہونے والے ہیں۔ اگلی خریداری پر استعمال کر لیں تاکہ ضائع نہ ہوں۔",

  "wa.camp.title": "مہمات",
  "wa.camp.sub":
    "مہم یعنی ایک ٹیمپلیٹ اور ایک حاضرین کی فہرست۔ فہرست شروع کرتے وقت اسی لمحے کے ڈیٹا سے بنتی ہے — جمی ہوئی فہرست کبھی نہیں۔",
  "wa.camp.new": "نئی مہم",
  "wa.camp.name": "مہم کا نام",
  "wa.camp.namePh": "مثلاً عید ہفتہ آفر",
  "wa.camp.template": "ٹیمپلیٹ",
  "wa.camp.templateNone": "پہلے ایک ٹیمپلیٹ بنائیں",
  "wa.camp.audience": "حاضرین",
  "wa.aud.all": "تمام رضامند گاہک",
  "wa.aud.tier": "لائلٹی درجہ",
  "wa.aud.udhaar": "بقایا اُدھار والے",
  "wa.aud.points": "پوائنٹس ختم ہونے والے",
  "wa.aud.inactive": "غیر فعال گاہک",
  "wa.aud.storefront": "آن لائن اسٹور کے گاہک",
  "wa.aud.serviceDue": "سروس کے وقت والے",
  "wa.aud.minRs": "کم از کم (روپے)",
  "wa.aud.minDays": "کم از کم اتنے دن پرانا (دن)",
  "wa.aud.withinDays": "اتنے دن کے اندر ختم ہونے والے (دن)",
  "wa.aud.inactiveDays": "اتنے دن سے کوئی بل نہیں (دن)",
  "wa.camp.reach": "{count} گاہکوں کو یہ پیغام ملے گا",
  "wa.camp.create": "مہم بنائیں",
  "wa.camp.stateDraft": "مسودہ",
  "wa.camp.stateSending": "بھیجی جا رہی ہے",
  "wa.camp.stateDone": "مکمل",
  "wa.camp.launch": "شروع کریں",
  "wa.camp.queued": "{count} وصول کنندگان قطار میں",
  "wa.camp.progress": "{sent} بھیجے گئے · {skipped} چھوڑے گئے · کل {total}",
  "wa.camp.openQueue": "بھیجنے کی قطار کھولیں",
  "wa.camp.finish": "مہم ختم کریں",
  "wa.camp.empty": "ابھی کوئی مہم نہیں۔ ٹیمپلیٹ اور حاضرین چن کر ایک بنائیں۔",

  "wa.queue.title": "بھیجنے کی قطار",
  "wa.queue.sub":
    "ایک وقت میں ایک گاہک۔ چیٹ کھولیں، واٹس ایپ میں بھیجیں، واپس آ کر تصدیق کریں۔",
  "wa.queue.honestNote":
    "یہاں «بھیجا گیا» کا مطلب ہے کہ آپ تصدیق کرتے ہیں کہ آپ نے واٹس ایپ میں بھیج دیا — یہ ایپ ڈیلیوری یا پڑھا جانا نہیں دیکھ سکتی، اور دکھاوا بھی نہیں کرتی۔",
  "wa.queue.messageLabel": "{name} کے لیے پیغام",
  "wa.queue.send": "واٹس ایپ میں کھولیں",
  "wa.queue.sent": "میں نے بھیج دیا",
  "wa.queue.skip": "ابھی چھوڑ دیں",
  "wa.queue.remaining": "{count} باقی",
  "wa.queue.done": "یہ قطار مکمل ہو گئی — ہر وصول کنندہ کا نتیجہ ریکارڈ میں موجود ہے۔",
  "wa.queue.skippedOptout": "چھوڑ دیا گیا: یہ گاہک اب رضامند نہیں رہا۔",
  "wa.queue.skippedInvalid": "چھوڑ دیا گیا: یہ نمبر واٹس ایپ کے لیے درست نہیں لگتا۔",
  "wa.queue.logTitle": "بھیجنے کا ریکارڈ",
  "wa.queue.logEmpty": "ابھی کچھ نہیں بھیجا گیا۔",
  "wa.sendState.queued": "قطار میں",
  "wa.sendState.opened": "کھولا گیا",
  "wa.sendState.sent": "بھیجا گیا",
  "wa.sendState.skipped_optout": "چھوڑا گیا · رضامندی ختم",
  "wa.sendState.skipped_invalid": "چھوڑا گیا · غلط نمبر",

  "wa.notice.templateSaved": "ٹیمپلیٹ محفوظ ہو گیا۔",
  "wa.notice.templateDeleted": "ٹیمپلیٹ حذف ہو گیا۔",
  "wa.notice.campaignCreated": "مہم مسودے کے طور پر بن گئی۔",
  "wa.notice.launched": "مہم شروع ہو گئی — {count} وصول کنندگان قطار میں ہیں۔",
  "wa.notice.finished": "مہم ختم ہو گئی۔",
  "wa.notice.consentSaved": "{name} کی رضامندی تازہ ہو گئی۔",

  "wa.consent.label": "یہ گاہک واٹس ایپ پر مارکیٹنگ پیغامات وصول کرنے پر راضی ہے",
  "wa.consent.sub":
    "مہمات کے پیغامات صرف ان گاہکوں کو جاتے ہیں جو راضی ہوں۔ بل، رسیدیں اور آرڈر کی اطلاعات مارکیٹنگ نہیں ہیں اور ہمیشہ بھیجی جا سکتی ہیں۔",
  "wa.consent.on": "واٹس ایپ مارکیٹنگ: رضامندی موجود ہے",
  "wa.consent.off": "واٹس ایپ مارکیٹنگ: رضامندی نہیں ہے",
  "wa.consent.since": "{date} کو درج ہوئی · {source}",
  "wa.consent.sourceCounter": "کاؤنٹر پر",
  "wa.consent.sourceStorefront": "آن لائن اسٹور کے ذریعے",
  "wa.consent.optIn": "رضامند کریں",
  "wa.consent.optOut": "رضامندی ختم کریں",
  "wa.consent.storefrontLabel": "گاہک واٹس ایپ مارکیٹنگ پیغامات پر راضی ہے",
  "wa.consent.storefrontSub":
    "صرف اسی وقت نشان لگائیں جب گاہک راضی ہو — اس آرڈر کی تبدیلی کے ساتھ رضامندی اس کے ریکارڈ میں درج ہو جائے گی۔",
};
