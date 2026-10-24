/** i18n part: loyalty — Phase H · H1 customer loyalty programme
 * (the loyalty desk, the billing points tender, customer-card and
 * report figures, programme settings). en + ur dictionaries
 * (identical key sets enforced by types). */
export const enLoyalty = {
  /* ---- navigation ---- */
  "nav.loyalty": "Loyalty",

  /* ---- tiers ---- */
  "loyalty.tier.standard": "Standard",
  "loyalty.tier.silver": "Silver",
  "loyalty.tier.gold": "Gold",

  /* ---- the desk ---- */
  "loyalty.title": "Loyalty Points",
  "loyalty.subtitle":
    "Points your customers have earned and not yet spent. Every point is a rupee the shop owes — earned, spent, returned and expired points all move through the ledger, so this page always agrees with your books.",
  "loyalty.off":
    "The loyalty programme is switched off in Settings. Existing balances stay here — customers can still spend them, and expired points can still be posted.",
  "loyalty.totalLiability": "Points liability",
  "loyalty.pointsOutstanding": "Points outstanding",
  "loyalty.customersWithBalance": "Customers with points",
  "loyalty.expiringSoon": "Expiring in 30 days",
  "loyalty.expiredTitle": "Expired — not yet posted",
  "loyalty.expiredSub":
    "These points passed their expiry date. They still count in the liability above until you post the release — posting moves them out of the liability and back against the programme's cost. Nothing expires on its own.",
  "loyalty.postExpiries": "Post expiry releases",
  "loyalty.postedCount": "Expiry releases posted",
  "loyalty.empty":
    "No customer has loyalty points yet. Points are earned automatically on a named customer's bill while the programme is on.",
  "loyalty.col.customer": "Customer",
  "loyalty.col.points": "Points",
  "loyalty.col.value": "Value",
  "loyalty.col.tier": "Tier",
  "loyalty.col.nextExpiry": "Next expiry",
  "loyalty.vintageLine": "Bill #{bill} · earned {date} · expires {expiry}",
  "loyalty.vintageLeft": "{points} points left",

  /* ---- billing tender ---- */
  "bill.payPoints": "Points",
  "bill.pointsBalance": "Points available",
  "bill.pointsUsePh": "Points to use",
  "bill.pointsMaxNote": "Up to {cap}% of this bill can be paid in points.",
  "bill.earnPreview": "This bill earns {points} points",
  "bill.walkinNoEarn": "Walk-in bills don't earn loyalty points — add the customer to earn.",
  "bill.pointsPart": "Points",
  "bill.pointsNeedsCustomer": "Points can only be used on a named customer's bill.",

  /* ---- customers ---- */
  "cust.loyaltyPoints": "Loyalty points",

  /* ---- reports ---- */
  "rep.loyalty.title": "Loyalty points",
  "rep.loyalty.earned": "Points earned",
  "rep.loyalty.redeemed": "Points redeemed",
  "rep.loyalty.recredited": "Points re-credited (returns)",
  "rep.loyalty.clawed": "Points taken back (returns)",
  "rep.loyalty.expired": "Points expired",
  "rep.loyalty.liability": "Points liability at period end",

  /* ---- settings ---- */
  "set.loyalty.title": "Loyalty programme",
  "set.loyalty.sub":
    "Reward repeat customers with points. Points are a liability in your books: earned points cost the programme account, spent points pay part of a bill, and expired points are released only when you post them from the Loyalty page.",
  "set.loyalty.enabled": "Programme on",
  "set.loyalty.earnBase": "Rupees of a bill per point earned",
  "set.loyalty.pointValue": "Value of 1 point (Rs)",
  "set.loyalty.redeemCap": "Most of a bill payable in points (%)",
  "set.loyalty.expiryMonths": "Points expire after (months)",
  "set.loyalty.silverAt": "Silver tier — points earned in a year",
  "set.loyalty.goldAt": "Gold tier — points earned in a year",
  "set.loyalty.silverMult": "Silver earn multiplier (×)",
  "set.loyalty.goldMult": "Gold earn multiplier (×)",
  "set.loyalty.note":
    "Tiers only make points accumulate faster — a point is worth the same rupees for every customer. Switching the programme off stops new points; balances already earned stay spendable and expirable.",
};

export const urLoyalty = {
  /* ---- navigation ---- */
  "nav.loyalty": "وفاداری پوائنٹس",

  /* ---- tiers ---- */
  "loyalty.tier.standard": "عام",
  "loyalty.tier.silver": "سلور",
  "loyalty.tier.gold": "گولڈ",

  /* ---- the desk ---- */
  "loyalty.title": "وفاداری پوائنٹس",
  "loyalty.subtitle":
    "وہ پوائنٹس جو گاہکوں نے کمائے اور ابھی خرچ نہیں کیے۔ ہر پوائنٹ ایک روپیہ ہے جو دکان کے ذمے ہے — کمائے، خرچ کیے، واپس ملے اور ختم ہوئے پوائنٹس سب کھاتے سے گزرتے ہیں، اس لیے یہ صفحہ ہمیشہ آپ کے کھاتوں سے میل کھاتا ہے۔",
  "loyalty.off":
    "وفاداری پروگرام ترتیبات میں بند ہے۔ موجودہ بیلنس یہیں رہیں گے — گاہک انہیں خرچ کر سکتے ہیں، اور ختم شدہ پوائنٹس اب بھی درج کیے جا سکتے ہیں۔",
  "loyalty.totalLiability": "پوائنٹس کی ذمہ داری",
  "loyalty.pointsOutstanding": "باقی پوائنٹس",
  "loyalty.customersWithBalance": "پوائنٹس رکھنے والے گاہک",
  "loyalty.expiringSoon": "30 دن میں ختم ہونے والے",
  "loyalty.expiredTitle": "ختم شدہ — ابھی درج نہیں",
  "loyalty.expiredSub":
    "ان پوائنٹس کی میعاد گزر چکی ہے۔ جب تک آپ ان کی رہائی درج نہیں کرتے، یہ اوپر والی ذمہ داری میں شامل رہتے ہیں — درج کرنے سے یہ ذمہ داری سے نکل کر پروگرام کی لاگت کے مقابل واپس آ جاتے ہیں۔ کوئی پوائنٹ خود سے ختم نہیں ہوتا۔",
  "loyalty.postExpiries": "میعاد ختم ہونے کی انٹریاں درج کریں",
  "loyalty.postedCount": "میعاد کی انٹریاں درج ہو گئیں",
  "loyalty.empty":
    "ابھی کسی گاہک کے پاس پوائنٹس نہیں ہیں۔ پروگرام آن ہو تو نام والے گاہک کے بل پر پوائنٹس خود بخود بنتے ہیں۔",
  "loyalty.col.customer": "گاہک",
  "loyalty.col.points": "پوائنٹس",
  "loyalty.col.value": "مالیت",
  "loyalty.col.tier": "درجہ",
  "loyalty.col.nextExpiry": "اگلی میعاد ختم",
  "loyalty.vintageLine": "بل نمبر {bill} · کمائے {date} · میعاد ختم {expiry}",
  "loyalty.vintageLeft": "{points} پوائنٹس باقی",
  "bill.payPoints": "پوائنٹس",
  "bill.pointsBalance": "دستیاب پوائنٹس",
  "bill.pointsUsePh": "استعمال کرنے کے پوائنٹس",
  "bill.pointsMaxNote": "اس بل کا زیادہ سے زیادہ {cap} فیصد پوائنٹس سے ادا ہو سکتا ہے۔",
  "bill.earnPreview": "اس بل پر {points} پوائنٹس بنیں گے",
  "bill.walkinNoEarn": "بے نام بل پر پوائنٹس نہیں بنتے — پوائنٹس کے لیے گاہک شامل کریں۔",
  "bill.pointsPart": "پوائنٹس",
  "bill.pointsNeedsCustomer": "پوائنٹس صرف نام والے گاہک کے بل پر استعمال ہو سکتے ہیں۔",

  /* ---- customers ---- */
  "cust.loyaltyPoints": "وفاداری پوائنٹس",

  /* ---- reports ---- */
  "rep.loyalty.title": "وفاداری پوائنٹس",
  "rep.loyalty.earned": "کمائے گئے پوائنٹس",
  "rep.loyalty.redeemed": "خرچ کیے گئے پوائنٹس",
  "rep.loyalty.recredited": "واپسی پر دوبارہ ملے پوائنٹس",
  "rep.loyalty.clawed": "واپسی پر کاٹے گئے پوائنٹس",
  "rep.loyalty.expired": "میعاد ختم پوائنٹس",
  "rep.loyalty.liability": "مدت کے آخر میں پوائنٹس کی ذمہ داری",

  /* ---- settings ---- */
  "set.loyalty.title": "وفاداری پروگرام",
  "set.loyalty.sub":
    "بار بار آنے والے گاہکوں کو پوائنٹس سے نوازیں۔ پوائنٹس آپ کے کھاتوں میں ایک ذمہ داری ہیں: بنے ہوئے پوائنٹس پروگرام کے کھاتے پر لاگت ڈالتے ہیں، خرچ کیے گئے پوائنٹس بل کا کچھ حصہ ادا کرتے ہیں، اور میعاد ختم پوائنٹس تبھی نکلتے ہیں جب آپ وفاداری والے صفحے سے انہیں درج کریں۔",
  "set.loyalty.enabled": "پروگرام آن کریں",
  "set.loyalty.earnBase": "ایک پوائنٹ کے لیے بل کی رقم (روپے)",
  "set.loyalty.pointValue": "ایک پوائنٹ کی مالیت (روپے)",
  "set.loyalty.redeemCap": "بل کا زیادہ سے زیادہ حصہ پوائنٹس سے (فیصد)",
  "set.loyalty.expiryMonths": "پوائنٹس کی میعاد (مہینے)",
  "set.loyalty.silverAt": "سلور درجہ — ایک سال میں کمائے گئے پوائنٹس",
  "set.loyalty.goldAt": "گولڈ درجہ — ایک سال میں کمائے گئے پوائنٹس",
  "set.loyalty.silverMult": "سلور کمائی کا ضارب (×)",
  "set.loyalty.goldMult": "گولڈ کمائی کا ضارب (×)",
  "set.loyalty.note":
    "درجے صرف پوائنٹس کی کمائی تیز کرتے ہیں — ہر گاہک کے لیے پوائنٹ کی مالیت ایک جتنی رہتی ہے۔ پروگرام بند کرنے سے نئے پوائنٹس رک جاتے ہیں؛ پہلے سے بنے بیلنس خرچ اور میعاد ختم کے قابل رہتے ہیں۔",
};
