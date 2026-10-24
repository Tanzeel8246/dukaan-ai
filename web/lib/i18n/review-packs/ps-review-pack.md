# Dukaan AI — Pashto (پښتو) review pack

Every UI string in the product, with the English source, the reviewed Urdu, and the Pashto (پښتو) MACHINE DRAFT side by side. Correct the draft in place (edit the CSV twin of this sheet: put fixed text in `corrected`, mark `1` in `seen` for every row you have read). Money surfaces (billing, finance, reports, print) come first on purpose. Keys you mark seen become `reviewed` when the pack is merged; the language keeps its "Draft preview" badge until every key is reviewed.

## billing

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `billing.actions` | Actions | اقدامات | کړنې |
| `billing.addAndSelect` | Add & select | شامل کر کے منتخب کریں | زیات او وټاکئ |
| `billing.addPayment` | Add payment | ادائیگی شامل کریں | تادیه زیاته کړئ |
| `billing.availWarn` | {name}: only {available} available — {promised} already promised on open orders and challans. | {name}: صرف {available} دستیاب ہے — {promised} پہلے ہی کھلے آرڈرز اور چالانوں پر وعدہ شدہ ہے۔ | {name}: یوازې {available} شته — {promised} دمخه په پرانیستو امرونو او چالانونو کې ژمنه شوي۔ |
| `billing.billNoTitle` | Bill #{no} | بل نمبر {no} | بل #{no} |
| `billing.builderHint` | A USB barcode scanner works right away — it types the SKU and presses Enter. | USB بار کوڈ اسکینر فوراً کام کرتا ہے — یہ SKU لکھ کر Enter دبا دیتا ہے۔ | د USB بارکوډ سکینر سم کار کوي — دا SKU لیکي او Enter وهي۔ |
| `billing.cartEmpty` | No items yet — find a product or scan a SKU to add it. | ابھی کوئی شے نہیں — پراڈکٹ تلاش کریں یا SKU اسکین کریں، شامل ہو جائے گی۔ | تر اوسه توکي نشته — یو توکی ومومئ یا SKU سکین کړئ ترڅو زیات یې کړئ۔ |
| `billing.cartItems` | {count} items | {count} اشیاء | {count} توکي |
| `billing.chooseProduct` | — Choose a product — | — پراڈکٹ منتخب کریں — | — یو توکی وټاکئ — |
| `billing.closeDetailAria` | Close bill detail | بل کی تفصیل بند کریں | د بل جزیات بند کړئ |
| `billing.completeBill` | Complete bill | بل مکمل کریں | بل بشپړ کړئ |
| `billing.completeHeldBill` | Complete held bill | رکا ہوا بل مکمل کریں | نیول شوی بل بشپړ کړئ |
| `billing.creditNote` | Credit (udhaar) needs a customer name — the unpaid balance ({amount}) lands in the customer's khata automatically. | ادھار کے لیے گاہک کا نام ضروری ہے — بقایا رقم ({amount}) خود بخود گاہک کے کھاتے میں چلی جاتی ہے۔ | پور (ادھار) د پېرودونکي نوم ته اړتیا لري — نه ورکړل شوی پاتې ({amount}) په اتومات ډول د پېرودونکي په کھاتا کې ځي۔ |
| `billing.customerName` | Customer name | گاہک کا نام | د پېرودونکي نوم |
| `billing.customerNamePlaceholder` | Optional for cash-only bills | صرف نقد بل کے لیے اختیاری | یوازې د نغدو بلونو لپاره اختیاري |
| `billing.customerPhone` | Customer phone | گاہک کا فون | د پېرودونکي تلیفون |
| `billing.customerPhonePlaceholder` | Needed to send the bill on WhatsApp | بل WhatsApp پر بھیجنے کے لیے ضروری | په WhatsApp کې د بل لېږلو لپاره اړین دی |
| `billing.customerSaved` | Customer (saved) | گاہک (محفوظ شدہ) | پېرودونکی (خوندي شوی) |
| `billing.decreaseQtyOf` | Decrease quantity of {name} | {name} کی مقدار کم کریں | د {name} مقدار کم کړئ |
| `billing.detailAria` | Bill detail | بل کی تفصیل | د بل جزیات |
| `billing.discardHeldAria` | Discard held bill {no} | رکا ہوا بل نمبر {no} ختم کریں | نیول شوی بل {no} لرې کړئ |
| `billing.discount` | Discount | رعایت | تخفیف |
| `billing.discountFlat` | Flat (Rs) | فکسڈ (روپے) | ثابت (Rs) |
| `billing.discountPercent` | Percent (%) | فیصد (%) | سلنه (%) |
| `billing.discountValueAria` | Discount value | رعایت کی رقم | د تخفیف ارزښت |
| `billing.errBillFailed` | Could not complete the bill — check the stock and payments, then try again. | بل مکمل نہیں ہو سکا — اسٹاک اور ادائیگیاں جانچ کر دوبارہ کوشش کریں۔ | بل بشپړ نه شو — زېرمه او تادیې وګورئ، بیا هڅه وکړئ۔ |
| `billing.errCreditNeedsName` | A credit (udhaar) payment needs a customer name — pick a customer or type the name first. | ادھار ادائیگی کے لیے گاہک کا نام ضروری ہے — گاہک منتخب کریں یا پہلے نام لکھیں۔ | د پور (ادھار) تادیه د پېرودونکي نوم ته اړتیا لري — یو پېرودونکی وټاکئ یا لومړی نوم ولیکئ۔ |
| `billing.errHeldCompleteFailed` | Could not complete the held bill — stock may have changed since it was held. Check the items and try again. | رکا ہوا بل مکمل نہیں ہو سکا — بل روکنے کے بعد اسٹاک بدل چکا ہو سکتا ہے۔ اشیاء جانچ کر دوبارہ کوشش کریں۔ | نیول شوی بل بشپړ نه شو — له نیولو راهیسې ممکن زېرمه بدله شوې وي۔ توکي وګورئ او بیا هڅه وکړئ۔ |
| `billing.errHeldGone` | That held bill is no longer available. | وہ رکا ہوا بل اب دستیاب نہیں۔ | هغه نیول شوی بل نور نشته۔ |
| `billing.errHoldFailed` | Could not hold this bill. Please try again. | یہ بل روکا نہیں جا سکا۔ براہ کرم دوبارہ کوشش کریں۔ | دا بل ونه نیول شو۔ مهرباني وکړئ بیا هڅه وکړئ۔ |
| `billing.errItemGone` | One of the items is no longer in the inventory. | ایک شے اب اسٹاک میں موجود نہیں۔ | یو توکی نور په موجودۍ کې نشته۔ |
| `billing.errNcName` | Enter the new customer's name first. | پہلے نئے گاہک کا نام لکھیں۔ | لومړی د نوي پېرودونکي نوم ولیکئ۔ |
| `billing.errNoItems` | Add at least one item to the bill first. | پہلے بل میں کم از کم ایک شے شامل کریں۔ | لومړی بل ته لږ تر لږه یو توکی زیات کړئ۔ |
| `billing.errOutOfStock` | Out of stock — only {qty} {unit} of {name} available. | اسٹاک ختم — {name} کے صرف {qty} {unit} دستیاب ہیں۔ | زېرمه ختمه — یوازې {qty} {unit} د {name} شته۔ |
| `billing.errPayMismatch` | Payments add up to {paid} but the bill total is {total}. Adjust the payments so the remaining amount is zero. | ادائیگیوں کا مجموعہ {paid} ہے جبکہ بل کا کل {total} ہے۔ ادائیگیاں اس طرح درست کریں کہ باقی رقم صفر ہو جائے۔ | تادیې {paid} کېږي خو د بل ټول {total} دی۔ تادیې سم کړئ ترڅو پاتې مبلغ صفر شي۔ |
| `billing.errQtyZero` | Quantity for {name} must be more than zero. | {name} کی مقدار صفر سے زیادہ ہونی چاہیے۔ | د {name} مقدار باید له صفر څخه زیات وي۔ |
| `billing.errReturnFailed` | Could not process the return. Please try again. | واپسی کا عمل مکمل نہیں ہو سکا۔ براہ کرم دوبارہ کوشش کریں۔ | بېرته راوړل پروسس نه شو۔ مهرباني وکړئ بیا هڅه وکړئ۔ |
| `billing.errReturnMax` | Only {qty} of {name} can still be returned on this bill. | اس بل پر {name} کے صرف {qty} مزید واپس ہو سکتے ہیں۔ | په دې بل کې یوازې {qty} د {name} نور بېرته راوړل کېدای شي۔ |
| `billing.errReturnNone` | Enter a return quantity for at least one item. | کم از کم ایک شے کی واپسی مقدار لکھیں۔ | د لږ تر لږه یو توکي لپاره د بېرته راوړلو مقدار ولیکئ۔ |
| `billing.errSkuNotFound` | No product found for SKU “{sku}”. | SKU ”{sku}“ کے لیے کوئی پراڈکٹ نہیں ملا۔ | د SKU {sku} لپاره هېڅ توکی ونه موندل شو۔ |
| `billing.errStockFor` | Not enough stock for {name} — only {qty} {unit} available. | {name} کا اسٹاک کافی نہیں — صرف {qty} {unit} دستیاب ہیں۔ | د {name} لپاره کافي زېرمه نشته — یوازې {qty} {unit} شته۔ |
| `billing.errVoidFailed` | Could not void this bill. | یہ بل منسوخ نہیں ہو سکا۔ | دا بل باطل نه شو۔ |
| `billing.eyebrow` | POS | بلنگ | POS |
| `billing.fillCash` | Fill full amount as cash | پوری رقم نقد لکھیں | بشپړ مبلغ د نغدو په توګه ډک کړئ |
| `billing.findProduct` | Find product | پراڈکٹ تلاش کریں | توکی ومومئ |
| `billing.grandTotal` | GRAND TOTAL | کل مجموعہ | لوی ټول |
| `billing.heldAria` | Held bills | رُکے ہوئے بل | نیول شوي بلونه |
| `billing.heldNote` | You are completing held Bill #{no} (total {total}). Payments must match that total — or press “New bill” to start fresh and keep it held. | آپ رکا ہوا بل نمبر {no} (کل {total}) مکمل کر رہے ہیں۔ ادائیگیاں اسی کل کے برابر ہونی چاہئیں — یا ”نیا بل“ دبا کر نیا بل شروع کریں اور اسے رکا ہوا رہنے دیں۔ | تاسو نیول شوی بل #{no} (ټول {total}) بشپړوئ۔ تادیې باید له هغه ټول سره سمون وخوري — یا نوی بل ووهئ ترڅو تازه پیل وکړئ او دا نیول شوی وساتئ۔ |
| `billing.heldTitle` | Held bills ({count}) | رُکے ہوئے بل ({count}) | نیول شوي بلونه ({count}) |
| `billing.historyAria` | Bills history | بلوں کی تاریخ | د بلونو تاریخ |
| `billing.historyEmpty` | No bills match — completed and held bills show up here. | کوئی بل نہیں ملا — مکمل اور رُکے ہوئے بل یہاں نظر آتے ہیں۔ | هېڅ بل سمون نه خوري — بشپړ شوي او نیول شوي بلونه دلته ښکاري۔ |
| `billing.historyTitle` | Bills history | بلوں کی تاریخ | د بلونو تاریخ |
| `billing.histSearchAria` | Search bills | بل تلاش کریں | بلونه ولټوئ |
| `billing.histSearchPlaceholder` | Search name, phone or bill #… | نام، فون یا بل نمبر تلاش کریں… | نوم، تلیفون یا د بل شمېره ولټوئ… |
| `billing.holdBill` | Hold bill | بل روکیں | بل ونیسئ |
| `billing.inCart` | In bill: {qty} | بل میں: {qty} | په بل کې: {qty} |
| `billing.increaseQtyOf` | Increase quantity of {name} | {name} کی مقدار بڑھائیں | د {name} مقدار زیات کړئ |
| `billing.keepBill` | Keep the bill | بل رہنے دیں | بل وساتئ |
| `billing.lineMeta` | {price} / {unit} · {qty} in stock | {price} فی {unit} · اسٹاک میں {qty} | {price} / {unit} · {qty} په زېرمه کې |
| `billing.ncName` | New customer name * | نئے گاہک کا نام * | د نوي پېرودونکي نوم * |
| `billing.ncNamePlaceholder` | e.g. Muhammad Ali | مثلاً محمد علی | د بېلګې په توګه Muhammad Ali |
| `billing.ncPhone` | New customer phone | نئے گاہک کا فون | د نوي پېرودونکي تلیفون |
| `billing.ncPhonePlaceholder` | 03xx xxxxxxx | 03xx xxxxxxx | 03xx xxxxxxx |
| `billing.newBill` | New bill | نیا بل | نوی بل |
| `billing.newBillAria` | New bill | نیا بل | نوی بل |
| `billing.newCustomer` | New customer | نیا گاہک | نوی پېرودونکی |
| `billing.noResults` | No product matches “{query}”. | “{query}” سے کوئی پراڈکٹ نہیں ملا۔ | هېڅ توکی له {query} سره سمون نه خوري۔ |
| `billing.openDetailTitle` | Open bill detail | بل کی تفصیل کھولیں | د بل جزیات پرانیزئ |
| `billing.optionLabel` | {name} — {price} ({qty} {unit} in stock) | {name} — {price} (اسٹاک میں {qty} {unit}) | {name} — {price} ({qty} {unit} په زېرمه کې) |
| `billing.payAmountAria` | Payment amount | ادائیگی کی رقم | د تادیې مبلغ |
| `billing.payAmountPlaceholder` | Amount (Rs) | رقم (روپے) | مبلغ (Rs) |
| `billing.payments` | Payments | ادائیگیاں | تادیې |
| `billing.payMethodAria` | Payment method | ادائیگی کا طریقہ | د تادیې طریقه |
| `billing.processReturn` | Process return | واپسی مکمل کریں | بېرته راوړل پروسس کړئ |
| `billing.product` | Product | پراڈکٹ | توکی |
| `billing.qtyFor` | Quantity for {name} | {name} کی مقدار | د {name} لپاره مقدار |
| `billing.rangeAll` | All time | تمام عرصہ | ټول وخت |
| `billing.rangeAria` | Bill date range | بل کی تاریخ کی حد | د بل د نېټې حد |
| `billing.rangeWeek` | Last 7 days | پچھلے 7 دن | تېرې 7 ورځې |
| `billing.rcpt.amount` | Total | کل | ټول |
| `billing.rcpt.billNo` | Bill #{no} | بل نمبر {no} | بل #{no} |
| `billing.rcpt.customer` | Customer | گاہک | پېرودونکی |
| `billing.rcpt.discount` | Discount | رعایت | تخفیف |
| `billing.rcpt.item` | Item | شے | توکی |
| `billing.rcpt.price` | Price | قیمت | بیه |
| `billing.rcpt.qty` | Qty | مقدار | مقدار |
| `billing.rcpt.subtotal` | Subtotal | ذیلی مجموعہ | فرعي ټول |
| `billing.rcpt.thanks` | Thank you for shopping with us! | ہم سے خریداری کرنے کا شکریہ! | زموږ سره د پېرودلو لپاره مننه! |
| `billing.rcpt.total` | TOTAL | کل مجموعہ | ټول |
| `billing.refundMethodAria` | Refund method | رقم واپسی کا طریقہ | د بېرته ورکولو طریقه |
| `billing.refundPrefix` | Refund: {method} | واپسی: {method} | بېرته ورکول: {method} |
| `billing.remaining` | Remaining: {amount} | باقی: {amount} | پاتې: {amount} |
| `billing.removeFromBill` | Remove {name} from bill | {name} کو بل سے ہٹائیں | {name} له بل څخه لرې کړئ |
| `billing.removePayRowAria` | Remove payment row | ادائیگی کی قطار ہٹائیں | د تادیې قطار لرې کړئ |
| `billing.resultsHint` | Click a product — or use ↑ ↓ + Enter — to add it to the bill. | پراڈکٹ پر کلک کریں — یا ↑ ↓ + Enter استعمال کریں — بل میں شامل ہو جائے گا۔ | یو توکی کلیک کړئ — یا ↑ ↓ + Enter وکاروئ — ترڅو بل ته یې زیات کړئ۔ |
| `billing.resultsLabel` | Product results | پراڈکٹ نتائج | د توکو پایلې |
| `billing.resume` | Resume | دوبارہ کھولیں | بېرته پیل کړئ |
| `billing.resumingHeld` | Resuming held Bill #{no} | رکا ہوا بل نمبر {no} دوبارہ کھولا جا رہا ہے | نیول شوی بل #{no} بېرته پیلېږي |
| `billing.returnItems` | Return items | اشیاء واپس کریں | توکي بېرته راوړئ |
| `billing.returnMeta` | Sold {sold} · returned {returned} · {left} left | فروخت {sold} · واپس {returned} · باقی {left} | پلورل شوي {sold} · بېرته راوړل شوي {returned} · {left} پاتې |
| `billing.returnNote` | Any udhaar part of the bill is reduced first; the rest is refunded by the chosen method. | بل کا ادھار حصہ پہلے کم کیا جاتا ہے؛ باقی رقم منتخب طریقے سے واپس کی جاتی ہے۔ | د بل هر پور برخه لومړی کمېږي؛ پاتې برخه په ټاکل شوې طریقه بېرته ورکول کېږي۔ |
| `billing.returnQtyAria` | Return quantity for {name} | {name} کی واپسی مقدار | د {name} د بېرته راوړلو مقدار |
| `billing.searchPlaceholder` | Search products — click or press Enter to add… | پراڈکٹ تلاش کریں — کلک کریں یا Enter دبائیں، بل میں شامل… | توکي ولټوئ — د زیاتولو لپاره کلیک وکړئ یا Enter ووهئ… |
| `billing.skuHint` | Exact SKU match — Enter adds the item to the bill. | بالکل درست SKU — Enter دبانے سے شے بل میں شامل ہو جاتی ہے۔ | دقیق SKU سمون — Enter توکی بل ته زیاتوي۔ |
| `billing.skuLabel` | SKU / barcode | SKU / بار کوڈ | SKU / بارکوډ |
| `billing.skuPlaceholder` | Scan or type the SKU, then press Enter… | SKU اسکین کریں یا لکھیں، پھر Enter دبائیں… | SKU سکین کړئ یا ولیکئ، بیا Enter ووهئ… |
| `billing.status.held` | Held | رکا ہوا | نیول شوی |
| `billing.status.paid` | Paid | ادا شدہ | ورکړل شو |
| `billing.status.partially_returned` | Partially returned | جزوی واپس | په جزوي ډول بېرته راوړل شو |
| `billing.status.returned` | Returned | واپس شدہ | بېرته راوړل شو |
| `billing.status.voided` | Voided | منسوخ | باطل شو |
| `billing.subtitle` | Scan a barcode or pick items, take split payments — cash, wallet, bank or udhaar — hold bills, print receipts and process returns, all from one desk. | بار کوڈ اسکین کریں یا اشیاء منتخب کریں، تقسیم ادائیگی لیں — نقد، والیٹ، بینک یا ادھار — بل روکیں، رسیدیں چھاپیں اور واپسی کا عمل کریں، سب ایک ہی جگہ سے۔ | بارکوډ سکین کړئ یا توکي وټاکئ، وېشل شوې تادیې واخلئ — نغدې، بټوه، بانک یا پور — بلونه ونیسئ، رسیدونه چاپ کړئ او بېرته راوړل پروسس کړئ، ټول له یوې مېز څخه۔ |
| `billing.subtotal` | Subtotal | ذیلی مجموعہ | فرعي ټول |
| `billing.successBillCompleted` | Bill completed — the receipt is open. | بل مکمل ہو گیا — رسید کھل گئی ہے۔ | بل بشپړ شو — رسید پرانیستی دی۔ |
| `billing.successCustomerAdded` | Customer “{name}” added and selected. | گاہک ”{name}“ شامل کر کے منتخب کر لیا گیا۔ | پېرودونکی {name} زیات او وټاکل شو۔ |
| `billing.successHeld` | Bill held — resume it any time from the held bills list below. | بل روک دیا گیا — نیچے رُکے ہوئے بلوں کی فہرست سے کسی بھی وقت دوبارہ کھولیں۔ | بل ونیول شو — لاندې د نیول شویو بلونو له لیست څخه یې هر وخت بېرته پیل کړئ۔ |
| `billing.successHeldCompleted` | Bill #{no} completed — the receipt is open. | بل نمبر {no} مکمل ہو گیا — رسید کھل گئی ہے۔ | بل #{no} بشپړ شو — رسید پرانیستی دی۔ |
| `billing.successResumed` | Resumed held Bill #{no}. Check the payments below, then press “Complete bill”. | رکا ہوا بل نمبر {no} دوبارہ کھول دیا گیا۔ نیچے ادائیگیاں جانچیں، پھر ”بل مکمل کریں“ دبائیں۔ | نیول شوی بل #{no} بېرته پیل شو۔ لاندې تادیې وګورئ، بیا بل بشپړ کړئ ووهئ۔ |
| `billing.successReturned` | Return processed for Bill #{no}. Stock and accounts updated. | بل نمبر {no} کی واپسی مکمل ہو گئی۔ اسٹاک اور کھاتے اپ ڈیٹ ہو گئے۔ | د بل #{no} لپاره بېرته راوړل پروسس شو۔ زېرمه او حسابونه تازه شول۔ |
| `billing.successVoided` | Bill #{no} voided — stock and payments reversed. | بل نمبر {no} منسوخ ہو گیا — اسٹاک اور ادائیگیاں واپس ہو گئیں۔ | بل #{no} باطل شو — زېرمه او تادیې بېرته شوې۔ |
| `billing.tax.includedNote` | included in prices | قیمتوں میں شامل | په بیو کې شامله |
| `billing.tax.lineAmount` | + Tax {amount} | + ٹیکس {amount} | + مالیه {amount} |
| `billing.tax.lineAmountIncl` | Tax incl. {amount} | شامل ٹیکس {amount} | مالیه شامله {amount} |
| `billing.thBillNo` | Bill # | بل نمبر | د بل شمېره |
| `billing.thCustomer` | Customer | گاہک | پېرودونکی |
| `billing.thDate` | Date & time | تاریخ و وقت | نېټه او وخت |
| `billing.thItems` | Items | اشیاء | توکي |
| `billing.thStatus` | Status | حالت | حالت |
| `billing.thTotal` | Total | کل | ټول |
| `billing.title` | Billing | بلنگ | بلینګ |
| `billing.viewCart` | View bill | بل دیکھیں | بل وګورئ |
| `billing.voidBill` | Void bill | بل منسوخ کریں | بل باطل کړئ |
| `billing.voidBody` | The full {total} will be reversed — stock goes back on the shelf, every payment is returned through its own method, and any udhaar is cancelled. This cannot be undone. | پوری رقم {total} واپس ہو جائے گی — اسٹاک دوبارہ شیلف پر آ جائے گا، ہر ادائیگی اپنے طریقے سے واپس ہوگی اور ادھار ختم ہو جائے گا۔ یہ عمل واپس نہیں ہو سکتا۔ | بشپړ {total} به بېرته شي — زېرمه بېرته المارۍ ته ځي، هره تادیه په خپله طریقه بېرته ورکول کېږي، او هر پور لغوه کېږي۔ دا بېرته نه شي کېدای۔ |
| `billing.voidModalAria` | Confirm void bill | بل منسوخی کی تصدیق | د بل باطلولو تایید |
| `billing.voidTitle` | Void Bill #{no}? | بل نمبر {no} منسوخ کریں؟ | بل #{no} باطل کړئ؟ |
| `billing.wa.billLine` | Bill #{no} — {date} | بل نمبر {no} — {date} | بل #{no} — {date} |
| `billing.wa.discount` | Discount: − {amount} | رعایت: − {amount} | تخفیف: − {amount} |
| `billing.wa.itemLine` | {name} × {qty} — {amount} | {name} × {qty} — {amount} | {name} × {qty} — {amount} |
| `billing.wa.payment` | Payment: {payments} | ادائیگی: {payments} | تادیه: {payments} |
| `billing.wa.raastLine` | Pay via Raast — IBAN {iban} | راست سے ادائیگی — IBAN {iban} | د Raast له لارې ورکړئ — IBAN {iban} |
| `billing.wa.tax` | {label}: {amount} | {label}: {amount} | {label}: {amount} |
| `billing.wa.taxIncluded` | {label}: {amount} (included in prices) | {label}: {amount} (قیمتوں میں شامل) | {label}: {amount} (په بیو کې شامله) |
| `billing.wa.thanks` | Thank you for shopping with us! | ہم سے خریداری کرنے کا شکریہ! | زموږ سره د پېرودلو لپاره مننه! |
| `billing.wa.total` | TOTAL: {amount} | کل: {amount} | ټول: {amount} |
| `billing.walkIn` | Walk-in | عام گاہک | راتلونکی |
| `billing.walkInCustomer` | Walk-in customer | عام گاہک | راتلونکی پېرودونکی |
| `billing.walkInOption` | — Walk-in / type the name — | — عام گاہک / نام لکھیں — | — راتلونکی / نوم ولیکئ — |
## fin

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `fin.acct.bucketBreakdown` | Per-account breakdown | ہر کھاتے کی تفصیل | د هر حساب جلاوالی |
| `fin.acct.capital` | Owner capital | مالک کا سرمایہ | د مالک پانګه |
| `fin.acct.cash` | Cash | نقدی | نغدې |
| `fin.acct.cheques_in_hand` | Cheques in hand | موصولہ چیک | په لاس کې چکونه |
| `fin.acct.cheques_issued` | Cheques issued | جاری کردہ چیک | ورکړل شوي چکونه |
| `fin.acct.cogs` | Cost of goods sold | فروخت شدہ سامان کی لاگت | د پلورل شویو توکو لګښت |
| `fin.acct.drawings` | Owner drawings | مالک کی ذاتی نکاسی | د مالک اخیستنې |
| `fin.acct.expense_finance` | Finance charges | مالی اخراجات | مالي لګښتونه |
| `fin.acct.inventory` | Inventory | اسٹاک | موجودي |
| `fin.acct.inventory_loss` | Inventory loss | اسٹاک نقصان | د موجودۍ زیان |
| `fin.acct.inventory_raw` | Raw materials | خام مال | خام مواد |
| `fin.acct.loans_payable` | Loans payable | ادا طلب قرضے | د ورکړې پورونه |
| `fin.acct.loans_receivable` | Loans receivable | وصول طلب قرضے | ترلاسه کېدونکي پورونه |
| `fin.acct.negative` | Negative balance — this account is overdrawn; money went out before it came in. | منفی بیلنس — اس کھاتے سے رقم آنے سے پہلے نکل گئی ہے۔ | منفي پاتې — دا حساب ډېر وتل شوی دی؛ پیسې مخکې له راتلو څخه وتلې. |
| `fin.acct.negativeLine` | {label}: {name} — {amount} | {label}: {name} — {amount} | {label}: {name} — {amount} |
| `fin.acct.negativeShort` | Negative balance | منفی بیلنس | منفي پاتې |
| `fin.acct.payables` | Payables | ادائیگیاں | ورکړل کېدونکي |
| `fin.acct.purchases` | Purchases | خریداری | پېرودونه |
| `fin.acct.receivables` | Receivables | وصولیاں | ترلاسه کېدونکي |
| `fin.acct.retained_earnings` | Retained earnings | محفوظ منافع | ساتلې ګټې |
| `fin.acct.salary_payable` | Salaries payable | ادا طلب تنخواہیں | د ورکړې معاشونه |
| `fin.acct.sales_discount` | Sales discount | فروخت پر رعایت | د پلور تخفیف |
| `fin.acct.sales_revenue` | Sales revenue | فروخت کی آمدنی | د پلور عاید |
| `fin.acct.tax_input` | Input tax | ان پٹ ٹیکس | داخلي مالیه |
| `fin.acct.tax_payable` | Tax payable | ادا طلب ٹیکس | د ورکړې مالیه |
| `fin.acct.wallet` | Wallet / bank | والیٹ / بینک | بټوه / بانک |
| `fin.acct.wip` | Work in progress | زیرِ تکمیل کام | روان کار |
| `fin.accts.title` | Money accounts | رقم کے کھاتے | د پیسو حسابونه |
| `fin.aging.age` | Age | مدت | عمر |
| `fin.aging.amount` | Amount | رقم | مبلغ |
| `fin.aging.current` | 0–30 days | 0–30 دن | 0–30 ورځې |
| `fin.aging.d31_60` | 31–60 days | 31–60 دن | 31–60 ورځې |
| `fin.aging.over60` | 60+ days | 60 سے زائد دن | 60+ ورځې |
| `fin.aging.payablesTitle` | Payables aging — supplier dues | ادائیگیوں کی مدت — سپلائر بقایا | د ورکړل کېدونکو عمر — د عرضه کوونکي پاتې |
| `fin.aging.receivablesTitle` | Receivables aging — udhaar | وصولیوں کی مدت — ادھار | د ترلاسه کېدونکو عمر — پور |
| `fin.aging.total` | Total | کل | ټول |
| `fin.cash.account` | Account | کھاتہ | حساب |
| `fin.cash.amount` | Amount (PKR) * | رقم (روپے) * | مبلغ (PKR) * |
| `fin.cash.amountError` | Amount must be greater than 0. | رقم 0 سے زیادہ ہونا چاہیے۔ | مبلغ باید له 0 څخه ډېر وي. |
| `fin.cash.amountPlaceholder` | e.g. 5000 | مثلاً 5000 | لکه 5000 |
| `fin.cash.caption` | In posts as Owner Capital, Out as Owner Drawings. | آنے والی رقم مالک کے سرمائے کے طور پر اور جانے والی رقم مالک کی ذاتی نکاسی کے طور پر درج ہوتی ہے۔ | دننه د مالک پانګې په توګه ثبتېږي، بهر د مالک اخیستنو په توګه. |
| `fin.cash.in` | Cash in | نقد آمد | نغدې دننه |
| `fin.cash.kind` | Kind | قسم | ډول |
| `fin.cash.note` | Note | نوٹ | یادښت |
| `fin.cash.notePlaceholder` | e.g. Owner added cash to till | مثلاً مالک نے گلّے میں نقدی ڈالی | لکه مالک ګلې ته نغدې زیاتې کړې |
| `fin.cash.out` | Cash out | نقد اخراج | نغدې بهر |
| `fin.cash.post` | Post entry | اندراج کریں | ننوتنه ثبت کړئ |
| `fin.cash.posted` | Posted: {kind} of {amount} ({method}). | اندراج ہو گیا — {kind}: {amount} ({method}) | ثبت شو: {kind} د {amount} ({method}). |
| `fin.cash.title` | Cash book — manual entry | کیش بک — دستی اندراج | د نغدو کتاب — لاسي ننوتنه |
| `fin.cb.account` | Account | کھاتہ | حساب |
| `fin.cb.balance` | Balance | بیلنس | پاتې |
| `fin.cb.caption` | Showing the latest 60 entries, newest first. Balance is the running balance of that entry's account right after it posted. | تازہ ترین 60 اندراج دکھائے جا رہے ہیں، نئے پہلے۔ بیلنس اس اندراج کے فوراً بعد اسی کھاتے کا جاری بیلنس ہے۔ | وروستۍ 60 ننوتنې ښودل کېږي، نوې لومړی. پاتې د هغې ننوتنې د حساب روان پاتې دی سم له ثبتېدو وروسته. |
| `fin.cb.date` | Date | تاریخ | نېټه |
| `fin.cb.description` | Description | تفصیل | تشریح |
| `fin.cb.empty` | No cash book entries yet. | ابھی تک کیش بک میں کوئی اندراج نہیں۔ | لا تر اوسه د نغدو کتاب هېڅ ننوتنه نشته. |
| `fin.cb.in` | In | آمد | دننه |
| `fin.cb.out` | Out | اخراج | بهر |
| `fin.cb.title` | Cash book | کیش بک | د نغدو کتاب |
| `fin.chq.caption` | What banks and customers owe the shop in instruments, and what the shop has issued — straight from the ledger's cheque accounts, always equal to the registry's pending totals. | بینکوں اور گاہکوں کے ذمے چیک کی صورت میں واجب رقم، اور دکان کے جاری کردہ چیک — سیدھا کھاتے کے چیک اکاؤنٹس سے، ہمیشہ رجسٹری کے زیر التوا کل کے برابر۔ | هغه څه چې بانکونه او پېرودونکي د وسایلو په توګه هټۍ ته پوروړي دي، او هغه څه چې هټۍ ورکړي — سم د کھاتہ له چک حسابونو څخه، تل د راجستر له ځنډېدلو ټولونو سره برابر. |
| `fin.chq.ledger` | Ledger | کھاتہ | کھاتہ |
| `fin.chq.open` | Open the registry | رجسٹری کھولیں | راجستر پرانیزئ |
| `fin.chq.registry` | Registry | رجسٹری | راجستر |
| `fin.chq.title` | Cheques | چیک | چکونه |
| `fin.export.all` | All entries | تمام اندراجات | ټولې ننوتنې |
| `fin.export.caption` | Download CSV files for your accountant or for safekeeping. | اپنے اکاؤنٹنٹ کے لیے یا محفوظ رکھنے کے لیے CSV فائلیں ڈاؤن لوڈ کریں۔ | د خپل محاسب لپاره یا د خوندیتوب لپاره CSV فایلونه ښکته کړئ. |
| `fin.export.count` | {count} journal entries in this range | اس مدت میں {count} جرنل اندراجات | په دې موده کې {count} ژورنال ننوتنې |
| `fin.export.customers` | Export customers CSV | گاہکوں کی CSV برآمد کریں | د پېرودونکو CSV صادر کړئ |
| `fin.export.empty` | No journal entries in this range. | اس مدت میں کوئی جرنل اندراج نہیں۔ | په دې موده کې هېڅ ژورنال ننوتنه نشته. |
| `fin.export.expenses` | Export expenses CSV | اخراجات کی CSV برآمد کریں | د لګښتونو CSV صادر کړئ |
| `fin.export.journalCsv` | Export journal CSV | جرنل CSV برآمد کریں | ژورنال CSV صادر کړئ |
| `fin.export.lastFiscal` | Last fiscal year | پچھلا مالی سال | تېر مالي کال |
| `fin.export.ledgerNames` | Tally ledger names | Tally لیجر کے نام | د Tally کھاتہ نومونه |
| `fin.export.ledgerNamesCaption` | If your Tally already keeps a ledger for an account below, write its name here and exports will use it. Only names can change — each ledger's Tally group is fixed, because a wrong group silently distorts the balance sheet. | اگر آپ کے Tally میں نیچے دیے گئے کسی کھاتے کا لیجر پہلے سے موجود ہے تو اس کا نام یہاں لکھ دیں، برآمد میں وہی نام استعمال ہوگا۔ صرف نام بدلا جا سکتا ہے — ہر لیجر کا Tally گروپ مقرر ہے، کیونکہ غلط گروپ بیلنس شیٹ کو خاموشی سے بگاڑ دیتا ہے۔ | که ستاسو Tally لا دمخه د لاندې حساب لپاره یو کھاتہ لري، دلته یې نوم ولیکئ او صادرات به یې وکاروي. یوازې نومونه بدلېدای شي — د هر کھاتہ Tally ګروپ ټاکل شوی دی، ځکه غلط ګروپ د بیلانس پاڼه په چوپتیا سره خرابوي. |
| `fin.export.ledgerSaved` | Ledger names saved | لیجر کے نام محفوظ ہو گئے | د کھاتہ نومونه خوندي شول |
| `fin.export.products` | Export products CSV | مصنوعات کی CSV برآمد کریں | د توکو CSV صادر کړئ |
| `fin.export.range` | Export range | برآمد کی مدت | د صادراتو موده |
| `fin.export.sales` | Export sales CSV | فروخت کی CSV برآمد کریں | د پلور CSV صادر کړئ |
| `fin.export.tally` | Export Tally XML | Tally XML برآمد کریں | Tally XML صادر کړئ |
| `fin.export.tallyNote` | TallyPrime and Tally ERP 9 accept this standard import file (Gateway → Import Data → Vouchers). Tally versions differ slightly, so import once to validate — the journal CSV carries exactly the same data if your version needs another route. | TallyPrime اور Tally ERP 9 یہ معیاری امپورٹ فائل قبول کرتے ہیں (Gateway ← Import Data ← Vouchers)۔ Tally کے ورژنز میں معمولی فرق ہوتا ہے، اس لیے ایک بار امپورٹ کر کے جانچ لیں — اگر آپ کے ورژن کو کوئی اور راستہ درکار ہو تو جرنل CSV میں بالکل یہی ڈیٹا موجود ہے۔ | TallyPrime او Tally ERP 9 دا معیاري وارد فایل مني (Gateway → Import Data → Vouchers). د Tally نسخې لږ توپیر لري، نو یو ځل یې وارد کړئ تر څو وازمایی — ژورنال CSV هماغه معلومات لري که ستاسو نسخه بلې لارې ته اړتیا ولري. |
| `fin.export.tallyTitle` | Tally & journal export | Tally اور جرنل برآمد | Tally او ژورنال صادرات |
| `fin.export.title` | Export data | ڈیٹا برآمد کریں | معلومات صادر کړئ |
| `fin.eyebrow` | Ledger | کھاتہ | کھاتہ |
| `fin.fy.ackWarnings` | I have seen the open items above — close the year with them as they stand. | میں نے اوپر کے کھلے معاملات دیکھ لیے ہیں — سال اسی حالت میں بند کر دیں۔ | ما پورته پرانیستي توکي ولیدل — کال په همدې حالت کې وتړئ. |
| `fin.fy.caption` | Closing a year moves its income and expense balances into retained earnings in one journal entry and locks the year. Balance-sheet accounts carry forward on their own — the journal is continuous, so there are no opening entries to post. | سال بند کرنے سے اس کی آمدنی اور اخراجات کے بیلنس ایک ہی جرنل اندراج میں محفوظ منافع (retained earnings) میں منتقل ہو جاتے ہیں اور سال مقفل ہو جاتا ہے۔ بیلنس شیٹ کے کھاتے خود بخود آگے بڑھتے ہیں — جرنل مسلسل ہے، اس لیے کوئی ابتدائی اندراجات درج نہیں کیے جاتے۔ | د یوه کال تړل د هغې عاید او لګښت پاتې په یوه ژورنال ننوتنه کې ساتل شوې ګټې ته لېږدوي او کال بندوي. د بیلانس پاڼې حسابونه په خپله مخ ته ځي — ژورنال پرله پسې دی، نو د پرانیستلو ننوتنې ثبتولو ته اړتیا نشته. |
| `fin.fy.check.cheques` | Uncleared cheques at year end | سال کے اختتام پر غیر کلیئر چیک | د کال په پای کې ناپاک چکونه |
| `fin.fy.check.chequesDetail` | In hand {inHand} · issued {issued} — carries forward. | موصولہ {inHand} · جاری کردہ {issued} — آگے بڑھتے ہیں۔ | په لاس کې {inHand} · ورکړل شوي {issued} — مخ ته ځي. |
| `fin.fy.check.clearing` | Purchases clearing account is zero at year end | سال کے اختتام پر خریداری کلیئرنگ کھاتہ صفر ہے | د پېرود پاکولو حساب د کال په پای کې صفر دی |
| `fin.fy.check.clearingDetail` | Clearing balance {amount} — it nets to zero on every purchase; a balance here means a real defect the close must not bury. | کلیئرنگ بیلنس {amount} — یہ ہر خریداری پر صفر ہو جاتا ہے؛ یہاں بیلنس کا مطلب اصل خرابی ہے جسے اختتام تلے دبنا نہیں چاہیے۔ | د پاکولو پاتې {amount} — دا په هر پېرود کې صفر ته رسیږي؛ دلته پاتې د یوې رښتینې نیمګړتیا معنی لري چې تړل یې باید پټ نه کړي. |
| `fin.fy.check.draftPayroll` | Draft payroll runs inside the year | سال کے اندر مسودہ تنخواہ رن | د کال دننه د معاش مسودې چلونه |
| `fin.fy.check.draftPayrollDetail` | {count} draft run(s) not yet finalised — they post nothing, but finalise or delete them before closing if the year should carry their salaries. | {count} مسودہ رن ابھی حتمی نہیں ہوئے — ان سے کوئی اندراج نہیں ہوتا، لیکن اگر اس سال میں ان کی تنخواہیں آنی چاہئیں تو بند کرنے سے پہلے انہیں حتمی کریں یا حذف کر دیں۔ | {count} مسوده چل(ونه) لا وروستي شوي نه دي — هغوی هېڅ نه ثبتوي، خو که کال باید د هغوی معاشونه ولري له تړلو مخکې یې وروستي یا ړنګ کړئ. |
| `fin.fy.check.lock` | Period lock | مدت کا قفل | د مودې بندول |
| `fin.fy.check.lockAlready` | The year is already locked through its last day. | سال پہلے ہی اس کے آخری دن تک مقفل ہے۔ | کال لا دمخه تر خپلې وروستۍ ورځې پورې بند دی. |
| `fin.fy.check.lockWill` | This close will lock the year — no posting can be dated inside it afterwards. | یہ اختتام سال کو مقفل کر دے گا — اس کے بعد اس سال کی تاریخ کا کوئی اندراج درج نہیں ہو سکے گا۔ | دا تړل به کال بند کړي — له هغې وروسته هېڅ ننوتنه په دننه کې نېټه نه شي نیولای. |
| `fin.fy.check.production` | Open production orders holding work-in-progress | کھلے پیداواری آرڈر جن میں نیم تیار مال (WIP) موجود ہے | پرانیستي د تولید امرونه چې روان کار لري |
| `fin.fy.check.productionDetail` | {count} order(s), pool {amount} — work-in-progress carries forward legitimately; this is a warning, not a fault. | {count} آرڈر، مجموعہ {amount} — نیم تیار مال جائز طور پر آگے بڑھتا ہے؛ یہ انتباہ ہے، خرابی نہیں۔ | {count} امر(ونه)، ټول {amount} — روان کار په قانوني توګه مخ ته ځي؛ دا یو خبرداری دی، نیمګړتیا نه. |
| `fin.fy.check.salary` | Salary payable at year end | سال کے اختتام پر واجب الادا تنخواہ | د کال په پای کې واجب معاش |
| `fin.fy.check.salaryDetail` | Owed to staff {owed} · advances outstanding {advances} · production accruals {unassigned} — carries forward. | عملے کے واجبات {owed} · بقایا ایڈوانس {advances} · پیداواری مزدوری {unassigned} — آگے بڑھتا ہے۔ | کارکوونکو ته پاتې {owed} · پاتې وړاندې تادیې {advances} · د تولید استحقاقونه {unassigned} — مخ ته ځي. |
| `fin.fy.check.stock` | Stock: ledger vs shelf | اسٹاک: کھاتہ بمقابلہ شیلف | موجودي: کھاتہ د المارۍ په مقابل کې |
| `fin.fy.check.stockDetail` | Ledger {gl} · shelf {shelf} · difference {diff} — a valuation difference, shown for the record; it does not block the close. | کھاتہ {gl} · شیلف {shelf} · فرق {diff} — یہ قدر کا فرق ہے، ریکارڈ کے لیے دکھایا گیا ہے؛ یہ اختتام نہیں روکتا۔ | کھاتہ {gl} · المارۍ {shelf} · توپیر {diff} — د ارزښت توپیر، د ریکارډ لپاره ښودل شوی؛ دا تړل نه بندوي. |
| `fin.fy.check.tb` | Trial balance for the year balances | سال کا ٹرائل بیلنس متوازن ہے | د کال آزمایښتي پاتې برابریږي |
| `fin.fy.check.tbDetail` | Difference {difference} · closing difference {closing} | فرق {difference} · اختتامی فرق {closing} | توپیر {difference} · د تړلو توپیر {closing} |
| `fin.fy.checklist` | Pre-close checklist | بند کرنے سے پہلے کی جانچ فہرست | له تړلو مخکې لېست |
| `fin.fy.close` | Close this fiscal year | یہ مالی سال بند کریں | دا مالي کال وتړئ |
| `fin.fy.closeConfirmBody` | One closing entry will zero the year's income and expense accounts into retained earnings, and the year will lock. This is reversible only by a recorded reopening, which posts a mirror entry — the journal keeps both, forever. | ایک اختتامی اندراج سال کے آمدنی و اخراجات کے کھاتے صفر کر کے محفوظ منافع میں ڈال دے گا، اور سال مقفل ہو جائے گا۔ یہ عمل صرف درج شدہ دوبارہ کھولنے سے واپس ہو سکتا ہے، جو آئینہ اندراج درج کرتا ہے — جرنل دونوں کو ہمیشہ محفوظ رکھتا ہے۔ | یوه تړونکې ننوتنه به د کال عاید او لګښت حسابونه ساتل شوې ګټې ته صفر کړي، او کال به بند شي. دا یوازې د ثبت شوي بیا پرانیستلو په واسطه بېرته کېدای شي، کوم چې یوه هنداره ننوتنه ثبتوي — ژورنال دواړه تل ساتي. |
| `fin.fy.closeConfirmTitle` | Close {fy}? | {fy} بند کریں؟ | {fy} وتړئ؟ |
| `fin.fy.closedNotice` | {fy} is closed. Its result now sits in retained earnings; its reports still read exactly as before. | {fy} بند ہو گیا۔ اس کا نتیجہ اب محفوظ منافع میں ہے؛ اس کی رپورٹیں پہلے ہی کی طرح پڑھی جائیں گی۔ | {fy} تړل شوی دی. پایله یې اوس په ساتل شوې ګټه کې ده؛ راپورونه یې لا هماغسې لوستل کېږي لکه مخکې. |
| `fin.fy.closedOn` | Closed on {date} by {email} | {date} کو {email} نے بند کیا | په {date} {email} تړلی |
| `fin.fy.errClosed` | This fiscal year is already closed. | یہ مالی سال پہلے ہی بند ہو چکا ہے۔ | دا مالي کال لا دمخه تړل شوی دی. |
| `fin.fy.errGate` | A hard check is failing — see the checklist above. | ایک سخت جانچ ناکام ہے — اوپر فہرست دیکھیں۔ | یوه سخته کتنه ناکامه ده — پورته لېست وګورئ. |
| `fin.fy.errInvalid` | That fiscal year could not be identified. | اس مالی سال کی شناخت نہیں ہو سکی۔ | هغه مالي کال ونه پېژندل شو. |
| `fin.fy.errLocked` | The closing entry's date already falls inside a locked period, so the close is refused. Reopen that lock first if this year truly must close. | اختتامی اندراج کی تاریخ پہلے ہی مقفل مدت میں آتی ہے، اس لیے اختتام مسترد ہوا۔ اگر یہ سال واقعی بند کرنا ہے تو پہلے وہ قفل دوبارہ کھولیں۔ | د تړونکې ننوتنې نېټه لا دمخه په بنده موده کې راځي، نو تړل رد شو. که دا کال رښتیا باید وتړل شي لومړی هغه بندول بیا پرانیزئ. |
| `fin.fy.errNotClosed` | This fiscal year is not closed. | یہ مالی سال بند نہیں ہے۔ | دا مالي کال نه دی تړل شوی. |
| `fin.fy.errNotPast` | Only a fully past fiscal year can be closed. | صرف مکمل گزرا ہوا مالی سال بند ہو سکتا ہے۔ | یوازې یو بشپړ تېر شوی مالي کال تړل کېدای شي. |
| `fin.fy.errReason` | A reason is required to reopen a closed year. | بند سال کھولنے کے لیے وجہ درج کرنا ضروری ہے۔ | د تړل شوي کال د بیا پرانیستلو لپاره لامل اړین دی. |
| `fin.fy.errStack` | A later fiscal year is still closed. Reopen the later year first — closes unwind in reverse order. | بعد کا ایک مالی سال ابھی بند ہے۔ پہلے بعد والے سال کو کھولیں — اختتام الٹی ترتیب سے کھلتے ہیں۔ | یو وروستی مالي کال لا تړل شوی دی. لومړی وروستی کال بیا پرانیزئ — تړل په برعکس ترتیب کې خلاصیږي. |
| `fin.fy.errWarnings` | Tick the acknowledgement for the open items first. | پہلے کھلے معاملات کی تصدیق پر نشان لگائیں۔ | لومړی د پرانیستو توکو لپاره منښت ټک کړئ. |
| `fin.fy.gateBlocked` | A hard check above is failing — the year cannot close until it passes. | اوپر کی ایک سخت جانچ ناکام ہے — اس کے پاس ہونے تک سال بند نہیں ہو سکتا۔ | پورته یوه سخته کتنه ناکامه ده — کال تر هغې نه شي تړل کېدای چې تېر نه شي. |
| `fin.fy.note` | Note (optional) | نوٹ (اختیاری) | یادښت (اختیاري) |
| `fin.fy.notePlaceholder` | e.g. Closed after the annual stock count | مثلاً سالانہ اسٹاک گنتی کے بعد بند کیا | لکه د کلني موجودي شمېرنې وروسته وتړل شو |
| `fin.fy.openingsCaption` | These are the balances the next year opens with, derived from the journal. No opening entries are posted — a continuous double-entry journal carries every balance-sheet account forward by itself. (Export files for Tally carry these figures as opening balances; the journal never stores them.) | یہ وہ بیلنس ہیں جن سے اگلا سال شروع ہوتا ہے، جرنل سے اخذ کردہ۔ کوئی ابتدائی اندراج درج نہیں کیا جاتا — مسلسل ڈبل انٹری جرنل ہر بیلنس شیٹ کھاتے کو خود آگے لے جاتا ہے۔ (Tally کی برآمدی فائلوں میں یہی رقوم ابتدائی بیلنس کے طور پر جاتی ہیں؛ جرنل انہیں کبھی ذخیرہ نہیں کرتا۔) | دا هغه پاتې دي چې بل کال یې له هغوی سره پرانیستل کېږي، له ژورنال څخه اخیستل شوي. هېڅ پرانیستونکې ننوتنه نه ثبتېږي — یو پرله پسې دوه ګونی ژورنال هر بیلانس پاڼې حساب په خپله مخ ته وړي. (د Tally صادر فایلونه دا شمېرې د پرانیستونکو پاتې په توګه وړي؛ ژورنال یې هېڅکله نه ساتي.) |
| `fin.fy.openingsEmpty` | No balance-sheet balances carry into this year. | اس سال میں کوئی بیلنس شیٹ بیلنس آگے نہیں بڑھتا۔ | هېڅ بیلانس پاڼې پاتې دې کال ته نه ځي. |
| `fin.fy.openingsTitle` | Opening balances — {fy} | ابتدائی بیلنس — {fy} | پرانیستونکي پاتې — {fy} |
| `fin.fy.openStock.action` | Record opening stock — {amount} | ابتدائی اسٹاک درج کریں — {amount} | پرانیستی مال ثبت کړئ — {amount} |
| `fin.fy.openStock.caption` | The shelf holds more stock than the books recognise ({amount}) — usually opening stock that was never entered when the shop started on the app. Record it once: Debit Stock, Credit Capital. | شیلف پر کھاتے سے زیادہ اسٹاک ہے ({amount}) — عموماً یہ وہ ابتدائی اسٹاک ہے جو دکان کے ایپ پر شروع ہوتے وقت درج ہی نہیں ہوا تھا۔ اسے ایک بار ریکارڈ کر لیں: ڈیبٹ اسٹاک، کریڈٹ سرمایہ۔ | په المارۍ کې تر کھاتې زیات مال شته ({amount}) — معمولاً هغه پرانیستی مال دی چې دوکان په ایپ پیل شو نو هیڅکله نه دی ثبت شوی. یو ځل یې ثبت کړئ: ډیبیټ مال، کریډیټ پانګه. |
| `fin.fy.openStock.confirm` | This posts ONE journal entry dated today: Debit Stock {amount}, Credit Capital {amount}. The journal is append-only — this entry can never be edited or deleted; if the amount is wrong, a reversing entry corrects it. | اس سے آج کی تاریخ کا ایک ہی جرنل اندراج لگے گا: ڈیبٹ اسٹاک {amount}، کریڈٹ سرمایہ {amount}۔ جرنل صرف آگے بڑھتا ہے — یہ اندراج کبھی تبدیل یا حذف نہیں ہو سکتا؛ رقم غلط ہو تو الٹ اندراج سے درستگی ہوتی ہے۔ | دا د نن نېټې یو ژورنال اندراج لګوي: ډیبیټ مال {amount}، کریډیټ پانګه {amount}. ژورنال یوازې مخکې ځي — دا اندراج هیڅکله نه بدلیږي او نه حذف کیږي؛ که اندازه غلطه وي، په برعکس اندراج سمیږي. |
| `fin.fy.openStock.posted` | Opening stock recorded — the stock book now matches the shelf. | ابتدائی اسٹاک درج ہو گیا — اب اسٹاک کا کھاتہ شیلف سے مل گیا ہے۔ | پرانیستی مال ثبت شو — اوس د مال کھاتہ له المارۍ سره سمون لري. |
| `fin.fy.pick` | Fiscal year | مالی سال | مالي کال |
| `fin.fy.plNote` | Reports for a closed year still show its true revenue and expenses: profit & loss reports exclude the closing entry by design, while the trial balance includes it and shows the year zeroed. | بند سال کی رپورٹیں اس کی اصل آمدنی و اخراجات ہی دکھاتی ہیں: نفع و نقصان رپورٹیں اختتامی اندراج کو ڈیزائن کے مطابق شامل نہیں کرتیں، جبکہ ٹرائل بیلنس اسے شامل کر کے سال کو صفر دکھاتا ہے۔ | د یوه تړل شوي کال راپورونه لا هم رښتینی عاید او لګښتونه ښيي: د ګټې او زیان راپورونه د جوړښت له مخې تړونکې ننوتنه لرې کوي، په داسې حال کې چې آزمایښتي پاتې یې شاملیږي او کال صفر ښيي. |
| `fin.fy.reopen` | Reopen {fy} | {fy} دوبارہ کھولیں | {fy} بیا پرانیزئ |
| `fin.fy.reopenConfirmBody` | A mirror entry will reverse the closing entry to the paisa, the year's accounts will carry their balances again, and the period lock returns to where it stood before the close. The close and this reopening both stay in the journal and the audit trail. | ایک آئینہ اندراج اختتامی اندراج کو پیسے تک واپس کر دے گا، سال کے کھاتے اپنے بیلنس دوبارہ حاصل کر لیں گے، اور مدت کا قفل اختتام سے پہلے والی حالت پر لوٹ جائے گا۔ اختتام اور یہ دوبارہ کھولنا — دونوں جرنل اور آڈٹ ریکارڈ میں رہیں گے۔ | یوه هنداره ننوتنه به تړونکې ننوتنه تر پیسې پورې بېرته واړوي، د کال حسابونه به بیا خپل پاتې ولري، او د مودې بندول به هغه ځای ته راستون شي چې له تړلو مخکې ولاړ و. تړل او دا بیا پرانیستل دواړه په ژورنال او د پلټنې په لار کې پاتې کېږي. |
| `fin.fy.reopenConfirmTitle` | Reopen {fy}? | {fy} دوبارہ کھولیں؟ | {fy} بیا پرانیزئ؟ |
| `fin.fy.reopenedNotice` | {fy} is open again. Remember to close it again when the correction is done. | {fy} دوبارہ کھل گیا۔ درستگی مکمل ہونے پر اسے دوبارہ بند کرنا یاد رکھیں۔ | {fy} بیا پرانیستی دی. کله چې سمون بشپړ شي بیا یې تړل په یاد ولرئ. |
| `fin.fy.reopenReason` | Reason for reopening (recorded) | دوبارہ کھولنے کی وجہ (درج ہوگی) | د بیا پرانیستلو لامل (ثبتېږي) |
| `fin.fy.reopenReasonPlaceholder` | e.g. A supplier bill for June was missed | مثلاً جون کا ایک سپلائر بل رہ گیا تھا | لکه د جون لپاره د عرضه کوونکي بل پاتې شوی و |
| `fin.fy.reopenTitle` | Reopen this fiscal year | یہ مالی سال دوبارہ کھولیں | دا مالي کال بیا پرانیزئ |
| `fin.fy.statusClosed` | Closed | بند ہو چکا | تړل شوی |
| `fin.fy.statusOpen` | Open — not closed yet | کھلا — ابھی بند نہیں ہوا | پرانیستی — لا نه دی تړل شوی |
| `fin.fy.summaryNetLoss` | Net loss charged to retained earnings | محفوظ منافع پر ڈالا گیا خالص نقصان | ساتل شوې ګټې ته لګول شوی خالص زیان |
| `fin.fy.summaryNetProfit` | Net profit carried to retained earnings | محفوظ منافع میں منتقل شدہ خالص منافع | ساتل شوې ګټې ته وړل شوې خالصه ګټه |
| `fin.fy.summaryTitle` | The year's result — from the closing entry | سال کا نتیجہ — اختتامی اندراج سے | د کال پایله — له تړونکې ننوتنې څخه |
| `fin.fy.title` | Fiscal year close | مالی سال کا اختتام | د مالي کال تړل |
| `fin.journal.balanced` | Balanced | متوازن | برابر شوی |
| `fin.journal.caption` | Every posting, newest first — expand an entry to see its debit and credit lines. Each entry must balance. | ہر اندراج، نیا سب سے پہلے — کسی اندراج کو کھول کر اس کی ڈیبٹ اور کریڈٹ سطریں دیکھیں۔ ہر اندراج کا متوازن ہونا ضروری ہے۔ | هره ننوتنه، نوې لومړی — یوه ننوتنه پراخه کړئ تر څو یې ډیبټ او کریډټ کرښې وګورئ. هره ننوتنه باید برابر شي. |
| `fin.journal.count` | {count} entries | {count} اندراجات | {count} ننوتنې |
| `fin.journal.empty` | No journal entries yet. | ابھی کوئی جرنل اندراج نہیں۔ | لا تر اوسه هېڅ ژورنال ننوتنه نشته. |
| `fin.journal.showingLatest` | Showing the latest {count} entries | تازہ ترین {count} اندراجات دکھائے جا رہے ہیں | وروستۍ {count} ننوتنې ښودل کېږي |
| `fin.journal.title` | Journal | جرنل | ژورنال |
| `fin.journal.unbalanced` | Does not balance | غیر متوازن | نه برابریږي |
| `fin.kpi.cash` | Cash in hand | نقدی موجود | په لاس کې نغدې |
| `fin.kpi.cashSub` | till / drawer balance | گلّے / دراز کا بیلنس | د ګلې / دراز پاتې |
| `fin.kpi.payables` | Payables | ادائیگیاں | ورکړل کېدونکي |
| `fin.kpi.payablesSub` | supplier dues | سپلائر کے بقایا جات | د عرضه کوونکي پاتې |
| `fin.kpi.receivables` | Receivables | وصولیاں | ترلاسه کېدونکي |
| `fin.kpi.receivablesSub` | udhaar outstanding | بقایا ادھار | د پور پاتې |
| `fin.kpi.wallet` | Wallet & bank | والیٹ اور بینک | بټوه او بانک |
| `fin.kpi.walletSub` | JazzCash · Easypaisa · bank | JazzCash · Easypaisa · بینک | JazzCash · Easypaisa · بانک |
| `fin.loan.borrowed` | Borrowed — outstanding (register) | لیے گئے قرضے — بقایا (رجسٹر) | اخیستل شوي — پاتې (راجستر) |
| `fin.loan.caption` | The loans register's derived position beside the ledger's own balances — the two always agree for loans that have been drawn. | قرض رجسٹر کی اخذ شدہ صورتحال کھاتے کے اپنے بیلنس کے ساتھ — جو قرضے جاری ہو چکے ہیں ان میں دونوں ہمیشہ برابر رہتے ہیں۔ | د پورونو راجستر اخیستل شوی حالت د کھاتہ د خپلو پاتې تر څنګ — دواړه تل د هغو پورونو لپاره برابر دي چې اخیستل شوي دي. |
| `fin.loan.lent` | Lent — outstanding (register) | دیے گئے قرضے — بقایا (رجسٹر) | ورکړل شوي — پاتې (راجستر) |
| `fin.loan.open` | Open the register | رجسٹر کھولیں | راجستر پرانیزئ |
| `fin.loan.payableGl` | Loans payable (ledger) | واجب الادا قرضے (کھاتہ) | واجب پورونه (کھاتہ) |
| `fin.loan.receivableGl` | Loans receivable (ledger) | قابل وصول قرضے (کھاتہ) | ترلاسه کېدونکي پورونه (کھاتہ) |
| `fin.loan.title` | Loans | قرضے | پورونه |
| `fin.neg.body` | Paying {amount} from {account} will take its balance to {balance}. If this is an informal overdraft you know about, post it anyway. | {account} سے {amount} کی ادائیگی سے اس کا بیلنس {balance} ہو جائے گا۔ اگر یہ آپ کے علم میں غیر رسمی اوور ڈرافٹ ہے تو پھر بھی درج کر دیں۔ | له {account} څخه د {amount} ورکول به یې پاتې {balance} ته ورسوي. که دا یو نارسمی ډېر وتل وي چې تاسو یې په اړه پوهېږئ، په هر حال یې ثبت کړئ. |
| `fin.neg.confirm` | Post anyway | پھر بھی درج کریں | په هر حال ثبت کړئ |
| `fin.neg.title` | This account will go negative | یہ کھاتہ منفی ہو جائے گا | دا حساب به منفي شي |
| `fin.period.lockedError` | That date falls in a closed period (the books are locked through {date}). Nothing can be posted into a closed period — corrections are recorded at today's date instead. | یہ تاریخ بند مدت میں آتی ہے (کھاتے {date} تک مقفل ہیں)۔ بند مدت میں کوئی اندراج نہیں ہو سکتا — تصحیح اس کے بجائے آج کی تاریخ سے درج ہوتی ہے۔ | هغه نېټه په بنده موده کې راځي (کتابونه تر {date} پورې تړل شوي دي). په بنده موده کې هېڅ نه شي ثبتېدای — سمونونه پر ځای یې د نن ورځې په نېټه ثبتېږي. |
| `fin.pl.caption` | Computed from this month's journal entries only. | صرف اس مہینے کے جرنل اندراجوں سے شمار کیا گیا۔ | یوازې د دې میاشتې له ژورنال ننوتنو څخه شمېرل شوی. |
| `fin.pl.captionRange` | Computed from journal entries in the selected period only. | صرف منتخب مدت کے جرنل اندراجوں سے شمار کیا گیا۔ | یوازې په ټاکلې موده کې له ژورنال ننوتنو څخه شمېرل شوی. |
| `fin.pl.cogs` | Less COGS (cost of goods sold) | فروخت شدہ سامان کی لاگت | کم COGS (د پلورل شویو توکو لګښت) |
| `fin.pl.discounts` | Less discounts | رعایت | کم تخفیفونه |
| `fin.pl.expenseRow` | Less expense — {category} | خرچ — {category} | کم لګښت — {category} |
| `fin.pl.grossProfit` | = Gross profit | = مجموعی منافع | = ناخالصه ګټه |
| `fin.pl.lastFiscalYear` | Last fiscal year | پچھلا مالی سال | تېر مالي کال |
| `fin.pl.netProfit` | = NET PROFIT | = خالص منافع | = خالصه ګټه |
| `fin.pl.netRevenue` | Net revenue | خالص فروخت | خالص عاید |
| `fin.pl.range` | Period | مدت | موده |
| `fin.pl.revenue` | Gross revenue | کل فروخت | ناخالص عاید |
| `fin.pl.stockLoss` | Stock loss (inventory write-offs) | اسٹاک نقصان (خراب / ختم شدہ سامان) | د موجودۍ زیان (د موجودۍ ړنګېدل) |
| `fin.pl.thisFiscalYear` | This fiscal year | یہ مالی سال | دا مالي کال |
| `fin.pl.thisMonth` | This month | یہ مہینہ | دا میاشت |
| `fin.pl.title` | Profit & loss — {month} | نفع و نقصان — {month} | ګټه او زیان — {month} |
| `fin.ref.adjustment` | Stock adjustment | اسٹاک درستگی | د موجودۍ سمون |
| `fin.ref.bill` | Bill #{no} | بل نمبر {no} | بل #{no} |
| `fin.ref.chequeBounce` | Cheque bounced | چیک باؤنس | چک وګرځېد |
| `fin.ref.chequeClearing` | Cheque cleared | چیک کلیئر | چک پاک شو |
| `fin.ref.chequeReturn` | Cheque returned | چیک واپس | چک بېرته ورکړل شو |
| `fin.ref.credit` | Udhaar given | ادھار دیا | ورکړل شوی پور |
| `fin.ref.expense` | Expense | خرچ | لګښت |
| `fin.ref.expenseReversal` | Expense reversal | خرچ کی واپسی | د لګښت بېرته اړول |
| `fin.ref.loanCharge` | Loan charge | قرض چارج | د پور لګښت |
| `fin.ref.loanDrawdown` | Loan drawdown | قرض اجرا | د پور اخیستل |
| `fin.ref.loanRepayment` | Loan repayment | قرض کی واپسی | د پور بېرته تادیه |
| `fin.ref.ownerCapital` | owner capital | مالک کا سرمایہ | د مالک پانګه |
| `fin.ref.ownerDrawings` | owner drawings | مالک کی ذاتی نکاسی | د مالک اخیستنې |
| `fin.ref.payment` | Supplier payment | سپلائر کو ادائیگی | عرضه کوونکي ته تادیه |
| `fin.ref.payrollAccrual` | Payroll accrual | تنخواہ استحقاق | د معاش استحقاق |
| `fin.ref.payrollPayment` | Salary payment | تنخواہ کی ادائیگی | د معاش تادیه |
| `fin.ref.purchase` | Purchase — stock received | خریداری — سامان وصول | پېرود — موجودي ترلاسه شوه |
| `fin.ref.purchaseReturn` | Purchase return | خرید واپسی | د پېرود بېرته ورکول |
| `fin.ref.repayment` | Udhaar repayment | ادھار کی واپسی | د پور بېرته تادیه |
| `fin.ref.return` | Return | واپسی | بېرته ورکول |
| `fin.ref.salaryAdvance` | Salary advance | تنخواہ پیشگی | د معاش وړاندې تادیه |
| `fin.ref.sale` | Counter sale | کاؤنٹر فروخت | د کاونټر پلور |
| `fin.ref.taxPayment` | Tax payment | ٹیکس ادائیگی | د مالیې تادیه |
| `fin.ref.transfer` | Transfer | منتقلی | لېږد |
| `fin.ref.void` | Bill voided | بل منسوخ | بل باطل شو |
| `fin.sal.advances` | Advances outstanding | بقایا پیشگیاں | پاتې وړاندې تادیې |
| `fin.sal.caption` | The composition of the salaries-payable account, derived from the journal: what the shop owes its staff, the advances staff owe back, and production labour accrued without a named person. | واجب الادا تنخواہوں کے کھاتے کی ترکیب، جرنل سے اخذ شدہ: دکان کے ذمے عملے کی واجب رقم، عملے کے ذمے بقایا پیشگیاں، اور بے نام جمع شدہ پیداواری مزدوری۔ | د واجب معاشونو د حساب جوړښت، له ژورنال څخه اخیستل شوی: هغه څه چې هټۍ خپلو کارکوونکو ته پوروړې ده، هغه وړاندې تادیې چې کارکوونکي یې بېرته پوروړي دي، او د تولید مزدوري چې له نوم پرته استحقاق شوې. |
| `fin.sal.owed` | Owed to employees | ملازمین کے واجب | کارکوونکو ته پاتې |
| `fin.sal.title` | Salaries payable | واجب الادا تنخواہیں | واجب معاشونه |
| `fin.sal.total` | Account balance | کھاتے کا بیلنس | د حساب پاتې |
| `fin.sal.unassigned` | Production labour (unassigned) | پیداواری مزدوری (بے نام) | د تولید مزدوري (بې نومه) |
| `fin.subtitle` | Every number below is derived live from the double-entry journal — balances, profit & loss and the cash book can never drift apart. | نیچے دیا گیا ہر عدد ڈبل انٹری جرنل سے براہِ راست نکلتا ہے — بیلنس، نفع و نقصان اور کیش بک کبھی ایک دوسرے سے الگ نہیں ہو سکتے۔ | لاندې هره شمېره د دوه ګوني ژورنال څخه ژوندۍ اخیستل کېږي — پاتې، ګټه او زیان او د نغدو کتاب هېڅکله له یو بل څخه نه جلا کېږي. |
| `fin.tax.amount` | Amount (PKR) * | رقم (PKR) * | مبلغ (PKR) * |
| `fin.tax.balance` | Balance | بیلنس | پاتې |
| `fin.tax.caption` | Derived from the journal's tax accounts. Tax is a pass-through between your customers, suppliers and the government — it never enters profit & loss. | یہ اعداد جرنل کے ٹیکس کھاتوں سے نکلتے ہیں۔ ٹیکس آپ کے گاہکوں، سپلائرز اور حکومت کے درمیان ایک امانت ہے — یہ نفع و نقصان میں کبھی شامل نہیں ہوتا۔ | د ژورنال له مالیې حسابونو څخه اخیستل شوی. مالیه ستاسو د پېرودونکو، عرضه کوونکو او حکومت ترمنځ یو تېرېدونکی بهیر دی — دا هېڅکله ګټې او زیان ته نه ننوځي. |
| `fin.tax.errAmount` | Amount must be greater than 0. | رقم 0 سے زیادہ ہونی چاہیے۔ | مبلغ باید له 0 څخه ډېر وي. |
| `fin.tax.errExceeds` | Amount is more than the net tax payable ({due}). | رقم خالص واجب الادا ٹیکس ({due}) سے زیادہ ہے۔ | مبلغ له خالصې واجب مالیې ({due}) څخه ډېر دی. |
| `fin.tax.input` | Input tax (paid on purchases) | ان پٹ ٹیکس (خریداری پر ادا) | داخلي مالیه (په پېرودونو ورکړل شوې) |
| `fin.tax.netDue` | Net tax payable | خالص واجب الادا ٹیکس | خالص واجب مالیه |
| `fin.tax.none` | No tax activity yet. Once tax slabs are configured and a taxed sale or purchase is posted, the position appears here. | ابھی کوئی ٹیکس سرگرمی نہیں۔ جب ٹیکس سلیبز ترتیب دی جائیں گی اور ٹیکس والی فروخت یا خریداری درج ہوگی تو صورتحال یہاں نظر آئے گی۔ | لا تر اوسه د مالیې هېڅ فعالیت نشته. کله چې د مالیې پوړونه تنظیم شي او یو مالیه لرونکی پلور یا پېرود ثبت شي، حالت به دلته راښکاره شي. |
| `fin.tax.note` | Note | نوٹ | یادښت |
| `fin.tax.notePlaceholder` | e.g. Monthly return — October | مثلاً ماہانہ ریٹرن — اکتوبر | لکه میاشتنی راستنېدل — اکټوبر |
| `fin.tax.output` | Output tax (collected on sales) | آؤٹ پٹ ٹیکس (فروخت پر وصول) | وتونکې مالیه (په پلور راټوله شوې) |
| `fin.tax.paid` | Tax payment of {amount} recorded. | {amount} کی ٹیکس ادائیگی درج ہو گئی۔ | د {amount} د مالیې تادیه ثبت شوه. |
| `fin.tax.pay` | Record tax payment | ٹیکس ادائیگی درج کریں | د مالیې تادیه ثبت کړئ |
| `fin.tax.payCaption` | Records a payment against the net tax payable: it reduces Tax payable and leaves from the chosen account. | خالص واجب الادا ٹیکس کے خلاف ادائیگی درج کرتا ہے: ادا طلب ٹیکس کم ہوتا ہے اور رقم منتخب کھاتے سے نکلتی ہے۔ | د خالصې واجب مالیې په مقابل کې یوه تادیه ثبتوي: دا د ورکړې مالیه کموي او له ټاکل شوي حساب څخه وځي. |
| `fin.tax.payTitle` | Pay tax to government | حکومت کو ٹیکس ادا کریں | حکومت ته مالیه ورکړئ |
| `fin.tax.thisMonth` | This month | اس مہینے | دا میاشت |
| `fin.tax.title` | Tax position | ٹیکس کی صورتحال | د مالیې حالت |
| `fin.title` | Finance | مالیات | مالي چارې |
| `loan.accrue` | Accrue charge | چارج جمع کریں | لګښت استحقاق کړئ |
| `loan.accrue.confirm` | Accrue the charge for instalment {n} ({amount})? It posts to the ledger now, as its own entry. | قسط {n} کا چارج ({amount}) جمع کریں؟ یہ ابھی کھاتے میں اپنے الگ اندراج کے طور پر درج ہوگا۔ | د قسط {n} ({amount}) لګښت استحقاق کړئ؟ دا اوس په کھاتہ کې ثبتېږي، د خپلې ننوتنې په توګه. |
| `loan.accrue.done` | Charge of {amount} accrued for instalment {n}. | قسط {n} کا {amount} چارج جمع ہو گیا۔ | د قسط {n} لپاره د {amount} لګښت استحقاق شو. |
| `loan.accrued.badge` | Accrued | جمع شدہ | استحقاق شوی |
| `loan.back` | All loans | تمام قرضے | ټول پورونه |
| `loan.charge.feeOnly` | One-off fee — {amount} | یک وقتی فیس — {amount} | یو ځل فیس — {amount} |
| `loan.charge.flat` | Flat — {rate}% of principal | فلیٹ — اصل رقم کا {rate}٪ | ثابت — د اصل {rate}% |
| `loan.charge.none` | No charge | کوئی چارج نہیں | هېڅ لګښت نشته |
| `loan.charge.reducing` | Reducing — {rate}% per period | کم ہوتا ہوا — {rate}٪ فی مدت | کمېدونکی — په هره موده کې {rate}% |
| `loan.col.nextDue` | Next due | اگلی قسط | راتلونکی واجب |
| `loan.col.number` | Number | نمبر | شمېره |
| `loan.col.outstanding` | Outstanding | بقایا | پاتې |
| `loan.col.party` | Party | فریق | اړخ |
| `loan.col.principal` | Principal | اصل رقم | اصل |
| `loan.created` | Loan {number} created and drawn down. | قرض {number} بن گیا اور جاری ہو گیا۔ | پور {number} جوړ شو او واخیستل شو. |
| `loan.delete` | Delete loan | قرض حذف کریں | پور ړنګ کړئ |
| `loan.delete.confirm` | Delete this unused loan? It has no events and posted nothing. | یہ غیر استعمال شدہ قرض حذف کریں؟ اس کا کوئی واقعہ نہیں اور اس نے کچھ درج نہیں کیا۔ | دا نه کارول شوی پور ړنګ کړئ؟ دا هېڅ پېښه نه لري او هېڅ یې نه دي ثبت کړي. |
| `loan.detail.charge` | Charge | چارج | لګښت |
| `loan.detail.chargesAccrued` | Charges accrued | جمع شدہ چارجز | استحقاق شوي لګښتونه |
| `loan.detail.every.month` | Monthly | ماہانہ | میاشتنی |
| `loan.detail.every.week` | Weekly | ہفتہ وار | اونیز |
| `loan.detail.firstDue` | First due | پہلی قسط کی تاریخ | لومړی واجب |
| `loan.detail.instalments` | Instalments | اقساط | قسطونه |
| `loan.detail.repaid` | Repaid so far | اب تک واپس شدہ | تر اوسه بېرته ورکړل شوی |
| `loan.detail.start` | Drawdown date | اجرا کی تاریخ | د اخیستلو نېټه |
| `loan.dir.payable` | Borrowed | لیا گیا | اخیستل شوی |
| `loan.dir.receivable` | Lent | دیا گیا | ورکړل شوی |
| `loan.empty` | No loans yet. Create the first loan to start the register. | ابھی کوئی قرض نہیں۔ رجسٹر شروع کرنے کے لیے پہلا قرض بنائیں۔ | لا تر اوسه هېڅ پور نشته. د راجستر د پیل لپاره لومړی پور جوړ کړئ. |
| `loan.emptyFiltered` | No loans match this view. | اس منظر سے کوئی قرض نہیں ملتا۔ | هېڅ پور له دې لید سره سمون نه خوري. |
| `loan.ev.account` | Account | کھاتہ | حساب |
| `loan.ev.amount` | Amount | رقم | مبلغ |
| `loan.ev.charge` | Charge accrual | چارج جمع | د لګښت استحقاق |
| `loan.ev.date` | Date | تاریخ | نېټه |
| `loan.ev.drawdown` | Drawdown | اجرا | اخیستل |
| `loan.ev.fee` | Fee | فیس | فیس |
| `loan.ev.repayment` | Repayment | واپسی | بېرته تادیه |
| `loan.ev.reversal` | Reversal | الٹ اندراج | بېرته اړول |
| `loan.ev.split` | Principal / charge | اصل / چارج | اصل / لګښت |
| `loan.events.empty` | No events yet. | ابھی کوئی واقعہ نہیں۔ | لا تر اوسه هېڅ پېښه نشته. |
| `loan.events.title` | Loan diary | قرض کی ڈائری | د پور کتابچه |
| `loan.filter.all` | All | تمام | ټول |
| `loan.filter.payable` | Borrowed | لیے گئے | اخیستل شوي |
| `loan.filter.receivable` | Lent | دیے گئے | ورکړل شوي |
| `loan.form.account` | Account | کھاتہ | حساب |
| `loan.form.chargeRate` | Charge rate (%) | چارج کی شرح (٪) | د لګښت نرخ (%) |
| `loan.form.chargeType` | Charge | چارج | لګښت |
| `loan.form.chargeType.feeOnly` | One-off fee only | صرف یک وقتی فیس | یوازې یو ځل فیس |
| `loan.form.chargeType.flat` | Flat (% of principal, whole term) | فلیٹ (اصل رقم کا ٪، پوری مدت) | ثابت (د اصل ٪، ټوله موده) |
| `loan.form.chargeType.none` | No charge | کوئی چارج نہیں | هېڅ لګښت نشته |
| `loan.form.chargeType.reducing` | Reducing (% per period on outstanding) | کم ہوتا ہوا (بقایا پر ٪ فی مدت) | کمېدونکی (په پاتې باندې ٪ په هره موده کې) |
| `loan.form.count` | Instalments | اقساط | قسطونه |
| `loan.form.create` | Create & draw down | بنائیں اور جاری کریں | جوړ کړئ او واخلئ |
| `loan.form.direction` | Direction | سمت | لوری |
| `loan.form.errTerms` | Check the loan terms: a party, a principal above 0, at least one instalment, and a fee below the principal. | قرض کی شرائط دیکھیں: فریق، 0 سے بڑی اصل رقم، کم از کم ایک قسط، اور اصل رقم سے کم فیس۔ | د پور شرایط وګورئ: یو اړخ، له 0 څخه ډېر اصل، لږ تر لږه یو قسط، او له اصل څخه کم فیس. |
| `loan.form.every` | Every | ہر | هر |
| `loan.form.fee` | Upfront fee (PKR) | ابتدائی فیس (PKR) | مخکینی فیس (PKR) |
| `loan.form.feeHint` | Netted from the proceeds at drawdown and recorded as a finance expense. Leave 0 for none. | اجرا کے وقت حاصل شدہ رقم سے کاٹی جاتی ہے اور مالی خرچ کے طور پر درج ہوتی ہے۔ نہ ہو تو 0 رکھیں۔ | د اخیستلو پر مهال له عاید څخه نیول کېږي او د مالي لګښت په توګه ثبتېږي. د نشتوالي لپاره 0 پرېږدئ. |
| `loan.form.feeOnlyLabel` | Fee amount (PKR) * | فیس کی رقم (PKR) * | د فیس مبلغ (PKR) * |
| `loan.form.firstDue` | First due date | پہلی قسط کی تاریخ | د لومړي واجب نېټه |
| `loan.form.method` | Money method | رقم کا طریقہ | د پیسو طریقه |
| `loan.form.note` | Note | نوٹ | یادښت |
| `loan.form.party` | Party name * | فریق کا نام * | د اړخ نوم * |
| `loan.form.partyLink` | Linked record (optional) | منسلک ریکارڈ (اختیاری) | تړل شوی ریکارډ (اختیاري) |
| `loan.form.partyNone` | No link | کوئی ربط نہیں | هېڅ تړاو نشته |
| `loan.form.principal` | Principal (PKR) * | اصل رقم (PKR) * | اصل (PKR) * |
| `loan.form.receivableHint` | Loans the shop lends are recorded without any charge. | دکان جو قرض دیتی ہے وہ بغیر کسی چارج کے درج ہوتا ہے۔ | هغه پورونه چې هټۍ یې ورکوي پرته له کوم لګښت څخه ثبتېږي. |
| `loan.form.start` | Drawdown date | اجرا کی تاریخ | د اخیستلو نېټه |
| `loan.form.title` | New loan | نیا قرض | نوی پور |
| `loan.kpi.borrowed` | Borrowed outstanding | لیے گئے قرضوں کا بقایا | د اخیستل شویو پاتې |
| `loan.kpi.chargesFy` | Charges this fiscal year | اس مالی سال کے چارجز | په دې مالي کال کې لګښتونه |
| `loan.kpi.count` | Active loans | فعال قرضے | فعال پورونه |
| `loan.kpi.lent` | Lent outstanding | دیے گئے قرضوں کا بقایا | د ورکړل شویو پاتې |
| `loan.new` | New loan | نیا قرض | نوی پور |
| `loan.notAccrued.badge` | Not accrued | جمع نہیں ہوا | استحقاق نه دی شوی |
| `loan.overdueCount` | {count} overdue | {count} مؤخر | {count} ځنډېدلی |
| `loan.repay` | Record repayment | واپسی درج کریں | بېرته تادیه ثبت کړئ |
| `loan.repay.account` | Account | کھاتہ | حساب |
| `loan.repay.amount` | Amount (PKR) * | رقم (PKR) * | مبلغ (PKR) * |
| `loan.repay.chargePart` | Charge part | چارج حصہ | د لګښت برخه |
| `loan.repay.done` | Repayment of {amount} recorded for {number}. | {number} کی {amount} واپسی درج ہو گئی۔ | د {number} لپاره د {amount} بېرته تادیه ثبت شوه. |
| `loan.repay.errAmount` | Enter an amount within the outstanding balance, with a split that adds up to it. | بقایا کے اندر رقم درج کریں، اور تقسیم اسی رقم کے برابر رکھیں۔ | یو مبلغ ولیکئ چې د پاتې په دننه کې وي، داسې وېش سره چې ورسره یوځای شي. |
| `loan.repay.method` | Method | طریقہ | طریقه |
| `loan.repay.principalPart` | Principal part | اصل حصہ | د اصل برخه |
| `loan.repay.remaining` | Outstanding: {amount} | بقایا: {amount} | پاتې: {amount} |
| `loan.repay.splitHint` | The split is attribution: by default charges are settled first. The ledger records the full amount either way. | یہ تقسیم محض نسبت ہے: عموماً چارج پہلے طے ہوتا ہے۔ کھاتے میں پوری رقم ہی درج ہوتی ہے۔ | وېش منسوبول دی: په ټاکلي ډول لګښتونه لومړی برابریږي. کھاتہ په هره توګه بشپړ مبلغ ثبتوي. |
| `loan.repay.title` | Repayment — {number} | واپسی — {number} | بېرته تادیه — {number} |
| `loan.reverse` | Reverse | الٹیں | بېرته واړوئ |
| `loan.reverse.confirm` | Reverse this event? A mirror entry will be posted — the original stays in the journal. | یہ واقعہ الٹیں؟ ایک آئینہ اندراج درج ہوگا — اصل اندراج جرنل میں برقرار رہے گا۔ | دا پېښه بېرته واړوئ؟ یوه هنداره ننوتنه به ثبت شي — اصلي په ژورنال کې پاتې کېږي. |
| `loan.schedule.charge` | Charge | چارج | لګښت |
| `loan.schedule.due` | Due date | تاریخ استحقاق | د واجب نېټه |
| `loan.schedule.n` | # | # | # |
| `loan.schedule.paid` | Paid | ادا شدہ | ورکړل شوی |
| `loan.schedule.principal` | Principal | اصل | اصل |
| `loan.schedule.state` | State | حالت | حالت |
| `loan.schedule.title` | Instalment schedule | اقساط کا شیڈول | د قسطونو مهالوېش |
| `loan.schedule.total` | Total | کل | ټول |
| `loan.searchPlaceholder` | Search number, party or note… | نمبر، فریق یا نوٹ تلاش کریں… | شمېره، اړخ یا یادښت ولټوئ… |
| `loan.settled.notice` | This loan is fully settled. | یہ قرض مکمل طور پر طے ہو چکا ہے۔ | دا پور په بشپړه توګه برابر شوی دی. |
| `loan.state.due` | Due | واجب | واجب |
| `loan.state.overdue` | Overdue | مؤخر | ځنډېدلی |
| `loan.state.paid` | Paid | ادا شدہ | ورکړل شوی |
| `loan.state.partial` | Partial | جزوی | برخې |
| `loan.state.upcoming` | Upcoming | آنے والی | راتلونکی |
| `loan.status.active` | Active | فعال | فعال |
| `loan.status.cancelled` | Cancelled | منسوخ | لغوه شوی |
| `loan.status.settled` | Settled | مکمل ادا | برابر شوی |
| `loan.subtitle` | Money the shop has borrowed and money it has lent. Outstanding figures derive from the journal and each loan's diary — nothing is stored as a balance. | وہ رقم جو دکان نے ادھار لی اور جو دکان نے ادھار دی۔ بقایا اعداد جرنل اور ہر قرض کی ڈائری سے اخذ ہوتے ہیں — کوئی بیلنس محفوظ نہیں کیا جاتا۔ | هغه پیسې چې هټۍ پور اخیستي او هغه پیسې چې هغې پور ورکړې. پاتې شمېرې له ژورنال او د هر پور له کتابچه څخه اخیستل کېږي — هېڅ د پاتې په توګه نه ساتل کېږي. |
| `loan.title` | Loans | قرضے | پورونه |
| `nav.loans` | Loans | قرضے | پورونه |
## reports

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `nav.reports` | Reports | رپورٹس | راپورونه |
| `rep.aging.desc` | Who owes the shop and whom the shop owes, aged 0–30, 31–60 and over 60 days — identical to Finance. | کس نے دکان کو دینا ہے اور دکان نے کس کو، عمر کے حساب سے 0–30، 31–60 اور 60 دن سے زائد — مالیات جیسا ہی۔ | څوک هټۍ ته پوروړی دی او هټۍ چا ته پوروړې ده، د 0–30، 31–60 او له 60 ورځو زیات عمر سره — له مالي سره یو شان۔ |
| `rep.aging.title` | Aging — Receivables & Payables | واجبات کی عمر — لینا اور دینا | زوړوالی — ترلاسه کېدونکي او ورکول کېدونکي |
| `rep.allAccounts` | All accounts (cash book) | تمام اکاؤنٹس (کیش بک) | ټول حسابونه (د نغدو کتاب) |
| `rep.bs.asAt` | As at {date} | {date} تک کی صورتحال | تر {date} پورې |
| `rep.bs.assets` | Assets | اثاثے | شتمنۍ |
| `rep.bs.desc` | What the shop owns and owes as at the end of the period, from the journal: assets on one side, liabilities, capital and the unclosed result on the other — the two sides must be equal. | مدت کے اختتام پر دکان کے اثاثے اور واجبات، جرنل سے: ایک طرف اثاثے، دوسری طرف واجبات، سرمایہ اور غیر بند نتیجہ — دونوں طرفیں برابر ہونی چاہئیں۔ | د مودې په پای کې د دوکان شتمنۍ او پورونه، له ژورنال څخه: یوه خوا شتمنۍ، بله خوا پورونه، پانګه او نه تړل شوې پایله — دواړه خواوې باید برابرې وي۔ |
| `rep.bs.equity` | Capital & Equity | سرمایہ و حقوق | پانګه او حقوق |
| `rep.bs.liabilities` | Liabilities | واجبات | پورونه |
| `rep.bs.result` | Result to date (unclosed) | اب تک کا نتیجہ (غیر بند) | تر اوسه پایله (نه تړل شوې) |
| `rep.bs.title` | Balance Sheet | بیلنس شیٹ | د بیلانس شیټ |
| `rep.bs.totalAssets` | Total Assets | کل اثاثے | ټولې شتمنۍ |
| `rep.bs.totalLiabEquity` | Total Liabilities & Equity | کل واجبات و حقوق | ټول پورونه او حقوق |
| `rep.cashbook.desc` | Money in and out for one account (or the whole cash book), with opening and closing balances. | ایک اکاؤنٹ (یا پوری کیش بک) کی آمد و خرچ، ابتدائی اور اختتامی بیلنس کے ساتھ۔ | د یو حساب (یا ټول نغدي کتاب) لپاره پیسې دننه او بهر، د پرانیستلو او تړلو پاتې سره۔ |
| `rep.cashbook.title` | Cash Book & Account Statement | کیش بک اور اکاؤنٹ اسٹیٹمنٹ | د نغدو کتاب او د حساب بیان |
| `rep.catalogue` | Choose a report | رپورٹ منتخب کریں | یو راپور وټاکئ |
| `rep.cheques.desc` | Cheques captured in the period, grouped by where they stand: drawer, bank, issued, cleared, bounced. | مدت میں لیے/دیے گئے چیک، اپنی حالت کے حساب سے: دراز میں، بینک میں، جاری شدہ، کلیئر، باؤنس۔ | په موده کې اخیستل شوي چیکونه، د هغوی د حالت له مخې ډلبندي شوي: درازونکی، بانک، صادر شوی، پاک شوی، باونس شوی۔ |
| `rep.cheques.title` | Cheques Report | چیکس کی رپورٹ | د چیکونو راپور |
| `rep.closing` | Closing balance | اختتامی بیلنس | تړونکی پاتې |
| `rep.col.account` | Account | اکاؤنٹ | حساب |
| `rep.col.amount` | Amount | رقم | مبلغ |
| `rep.col.balance` | Balance | بیلنس | پاتې |
| `rep.col.bank` | Bank | بینک | بانک |
| `rep.col.billNo` | Bill | بل | بل |
| `rep.col.category` | Category | زمرہ | کټګوري |
| `rep.col.chequeNo` | Cheque no. | چیک نمبر | د چیک شمېره |
| `rep.col.cost` | Cost price | لاگت قیمت | د لګښت بیه |
| `rep.col.customer` | Customer | گاہک | پېرودونکی |
| `rep.col.date` | Date | تاریخ | نېټه |
| `rep.col.description` | Description | تفصیل | تشریح |
| `rep.col.dueDate` | Due date | واجب تاریخ | د ورکړې نېټه |
| `rep.col.expiry` | Expiry | ختم ہونے کی تاریخ | ختمېدل |
| `rep.col.goods` | Goods | مال | توکي |
| `rep.col.in` | In | آمد | دننه |
| `rep.col.kind` | Kind | قسم | ډول |
| `rep.col.method` | Method | طریقہ | طریقه |
| `rep.col.note` | Note | نوٹ | یادښت |
| `rep.col.number` | No. | نمبر | شمېره |
| `rep.col.out` | Out | خرچ | بهر |
| `rep.col.party` | Party | فریق | اړخ |
| `rep.col.product` | Product | پروڈکٹ | توکی |
| `rep.col.qty` | Qty | تعداد | مقدار |
| `rep.col.reorder` | Reorder level | دوبارہ آرڈر سطح | د بیا امر کچه |
| `rep.col.salePrice` | Sale price | فروخت قیمت | د پلور بیه |
| `rep.col.status` | Status | حالت | حالت |
| `rep.col.stock` | Stock | اسٹاک | زېرمه |
| `rep.col.supplier` | Supplier | سپلائر | عرضه کوونکی |
| `rep.col.tax` | Tax | ٹیکس | مالیه |
| `rep.col.total` | Total | کل | ټول |
| `rep.col.value` | Value at cost | لاگت پر مالیت | په لګښت ارزښت |
| `rep.customer.desc` | One customer's khata: opening balance, udhaar given, repayments and the closing balance. | ایک گاہک کا کھاتہ: ابتدائی بیلنس، دیا گیا ادھار، وصولیاں اور اختتامی بیلنس۔ | د یو پېرودونکي کھاتا: پرانیستونکی پاتې، ورکړل شوی پور، بېرته ورکول او تړونکی پاتې۔ |
| `rep.customer.title` | Customer Statement | گاہک کا کھاتہ | د پېرودونکي بیان |
| `rep.dayclose.desc` | The recorded day closes inside the period, with their counted and expected cash. | مدت کے اندر ریکارڈ شدہ دن کی بندشیں، ان کی گنی اور متوقع نقدی کے ساتھ۔ | په موده کې ثبت شوي د ورځې تړل، د هغوی شمېرل شویو او تمه شویو نغدو سره۔ |
| `rep.dayclose.title` | Day Close Summary | روزنامچہ بندش کا خلاصہ | د ورځې تړلو لنډیز |
| `rep.dc.counted` | Counted cash | گنی گئی نقدی | شمېرل شوې نغدې |
| `rep.dc.difference` | Difference | فرق | توپیر |
| `rep.dc.expected` | Expected cash | متوقع نقدی | تمه شوې نغدې |
| `rep.dc.sales` | Sales | فروخت | پلور |
| `rep.empty` | No records in this period. | اس مدت میں کوئی ریکارڈ نہیں۔ | په دې موده کې ریکارډونه نشته۔ |
| `rep.expenses.desc` | Every expense of the period, grouped by category. | مدت کا ہر خرچ، زمرے کے حساب سے ترتیب شدہ۔ | د مودې هر لګښت، د کټګورۍ له مخې ډلبندي شوی۔ |
| `rep.expenses.title` | Expenses Report | اخراجات کی رپورٹ | د لګښتونو راپور |
| `rep.eyebrow` | Finance | مالیات | مالي چارې |
| `rep.footer` | Report generated by Dukaan AI | یہ رپورٹ Dukaan AI سے تیار کی گئی | راپور د Dukaan AI لخوا جوړ شو |
| `rep.from` | From | سے | له |
| `rep.generatedAt` | Generated | تیار کردہ | جوړ شو |
| `rep.kind.bill` | Bill {no} | بل {no} | بل {no} |
| `rep.kind.credit` | Udhaar given | ادھار دیا | ورکړل شوی پور |
| `rep.kind.payment` | Payment | ادائیگی | تادیه |
| `rep.kind.purchase` | Purchase | خرید | پېرود |
| `rep.kind.repayment` | Repayment | وصولی | بېرته ورکول |
| `rep.kind.return` | Purchase return | خرید واپسی | د پېرود بېرته راوړل |
| `rep.kind.returnLegs` | Gross {gross} · cash back {refund} | کل {gross} · نقد واپس {refund} | ناخالص {gross} · نغدې بېرته {refund} |
| `rep.kind.reversal` | Cheque bounced — payment reversed | چیک باؤنس — ادائیگی واپس | چیک باونس شو — تادیه بېرته شوه |
| `rep.notes.credit` | Credit notes | کریڈٹ نوٹس | کریډیټ یادښتونه |
| `rep.notes.debit` | Debit notes | ڈیبٹ نوٹس | ډیبیټ یادښتونه |
| `rep.notes.desc` | The formal notes issued in the period — credit notes to customers, debit notes to suppliers. | مدت میں جاری شدہ رسمی نوٹس — گاہکوں کے کریڈٹ نوٹس، سپلائرز کے ڈیبٹ نوٹس۔ | په موده کې صادر شوي رسمي یادښتونه — پېرودونکو ته کریډیټ یادښتونه، عرضه کوونکو ته ډیبیټ یادښتونه۔ |
| `rep.notes.title` | Credit & Debit Notes | کریڈٹ و ڈیبٹ نوٹس | کریډیټ او ډیبیټ یادښتونه |
| `rep.opening` | Opening balance | ابتدائی بیلنس | پرانیستونکی پاتې |
| `rep.outLang` | Print / share language | پرنٹ / شیئر کی زبان | د چاپ / شریکولو ژبه |
| `rep.period` | Period | مدت | موده |
| `rep.pl.desc` | Revenue, cost of goods, expenses and net profit for the period — the Finance screen's own computation. | مدت کی آمدنی، مال کی لاگت، اخراجات اور خالص منافع — مالیات کی اسکرین کا اپنا حساب۔ | د مودې لپاره عاید، د توکو لګښت، لګښتونه او خالصه ګټه — د مالي سکرین خپل حساب۔ |
| `rep.pl.title` | Profit & Loss | نفع و نقصان | ګټه او زیان |
| `rep.print` | Print | پرنٹ کریں | چاپ |
| `rep.purchase.desc` | What came in during the period, by supplier and by product, net of purchase returns. | مدت میں آنے والا مال، سپلائر اور پروڈکٹ کے حساب سے، خرید واپسی کاٹنے کے بعد۔ | په موده کې څه راغلل، د عرضه کوونکي او توکي له مخې، د پېرود بېرته راوړلو له کمولو وروسته۔ |
| `rep.purchase.title` | Purchase Report | خرید کی رپورٹ | د پېرود راپور |
| `rep.range` | Date range | مدت | د نېټې حد |
| `rep.range.custom` | Custom | اپنی مدت | ګمرکي |
| `rep.range.fiscal` | This fiscal year | اس مالی سال | دا مالي کال |
| `rep.range.month` | This month | اس مہینے | دا میاشت |
| `rep.range.today` | Today | آج | نن |
| `rep.range.week` | This week | اس ہفتے | دا اونۍ |
| `rep.records` | records | ریکارڈ | ریکارډونه |
| `rep.sales.desc` | Period totals, best-selling products and sales by customer — returns netted exactly as the Sales screen nets them. | مدت کے مجموعے، سب سے زیادہ بکنے والی اشیاء اور گاہک کے حساب سے فروخت — واپسیاں بالکل ویسے ہی کاٹ کر جیسے فروخت کی اسکرین کاٹتی ہے۔ | د مودې ټول، تر ټولو ډېر پلورل کېدونکي توکي او د پېرودونکي له مخې پلور — بېرته راوړل په سمه توګه لکه څنګه چې د پلور سکرین یې کموي۔ |
| `rep.sales.title` | Sales Report | فروخت کی رپورٹ | د پلور راپور |
| `rep.savePdf` | Save as PDF | PDF محفوظ کریں | د PDF په توګه خوندي کړئ |
| `rep.sec.byCategory` | By category | زمرے کے حساب سے | د کټګورۍ له مخې |
| `rep.sec.byCustomer` | By customer | گاہک کے حساب سے | د پېرودونکي له مخې |
| `rep.sec.byProduct` | By product | پروڈکٹ کے حساب سے | د توکي له مخې |
| `rep.sec.bySupplier` | By supplier | سپلائر کے حساب سے | د عرضه کوونکي له مخې |
| `rep.sec.currentStock` | Current stock | موجودہ اسٹاک | اوسنۍ زېرمه |
| `rep.sec.detail` | Detail | تفصیل | جزیات |
| `rep.sec.lowStock` | Low stock | کم اسٹاک | کم شوی |
| `rep.sec.nearExpiry` | Near expiry (30 days) | ختم ہونے کے قریب (30 دن) | ختمېدو ته نږدې (30 ورځې) |
| `rep.selectAccount` | Money account | رقم اکاؤنٹ | د پیسو حساب |
| `rep.selectCustomer` | Customer | گاہک | پېرودونکی |
| `rep.selectSupplier` | Supplier | سپلائر | عرضه کوونکی |
| `rep.share` | Share | شیئر کریں | شریک کړئ |
| `rep.snapshotNote` | This report shows the current position — the date range does not apply to it. | یہ رپورٹ موجودہ صورتحال دکھاتی ہے — اس پر مدت کا اطلاق نہیں ہوتا۔ | دا راپور اوسنی حالت ښيي — د نېټې حد پرې نه پلي کېږي۔ |
| `rep.stock.desc` | Current stock with its value at cost, the low-stock list and what expires within 30 days. | موجودہ اسٹاک اور لاگت پر اس کی مالیت، کم اسٹاک کی فہرست اور 30 دن میں ختم ہونے والی اشیاء۔ | اوسنۍ زېرمه په لګښت کې د هغې ارزښت سره، د کمې زېرمې لیست او هغه څه چې په 30 ورځو کې ختمېږي۔ |
| `rep.stock.title` | Stock Report | اسٹاک رپورٹ | د زېرمې راپور |
| `rep.subtitle` | Every figure in the shop, on paper: sales, purchases, stock, profit, tax, statements and more — the same numbers the screens show, ready to save, print and share. | دکان کا ہر حساب کاغذ پر: فروخت، خرید، اسٹاک، منافع، ٹیکس، کھاتے اور بہت کچھ — وہی اعداد جو اسکرینوں پر نظر آتے ہیں، محفوظ کرنے، چھاپنے اور بھیجنے کے لیے تیار۔ | د هټۍ هره شمېره په کاغذ کې: پلور، پېرود، زېرمه، ګټه، مالیه، بیانونه او نور — هماغه شمېرې چې سکرینونه یې ښيي، د خوندي کولو، چاپولو او شریکولو لپاره چمتو۔ |
| `rep.supplier.desc` | One supplier's account: purchases, payments, purchase returns and the closing balance. | ایک سپلائر کا حساب: خرید، ادائیگیاں، خرید واپسی اور اختتامی بیلنس۔ | د یو عرضه کوونکي حساب: پېرودونه، تادیې، د پېرود بېرته راوړل او تړونکی پاتې۔ |
| `rep.supplier.title` | Supplier Statement | سپلائر کا کھاتہ | د عرضه کوونکي بیان |
| `rep.tax.desc` | Output tax collected on sales and input tax paid on purchases, slab by slab, and the net position. | فروخت پر وصول شدہ آؤٹ پٹ ٹیکس اور خرید پر ادا شدہ ان پٹ ٹیکس، سلیب بہ سلیب، اور خالص پوزیشن۔ | په پلور کې راټوله شوې وتنۍ مالیه او په پېرود کې ورکړل شوې دننۍ مالیه، سلیب په سلیب، او خالص حالت۔ |
| `rep.tax.input` | Input tax | ان پٹ ٹیکس | دننۍ مالیه |
| `rep.tax.net` | Net position (output − input) | خالص پوزیشن (آؤٹ پٹ − ان پٹ) | خالص حالت (وتنۍ − دننۍ) |
| `rep.tax.output` | Output tax | آؤٹ پٹ ٹیکس | وتنۍ مالیه |
| `rep.tax.slab` | Slab | سلیب | سلیب |
| `rep.tax.title` | Tax Report | ٹیکس رپورٹ | د مالیې راپور |
| `rep.tb.balanced` | Balanced — total debits equal total credits | متوازن — کل ڈیبٹ کل کریڈٹ کے برابر ہے | متوازن — ټول ډیبیټ له ټول کریډیټ سره برابر دی |
| `rep.tb.cr` | Cr | جمع | Cr |
| `rep.tb.credit` | Credit | کریڈٹ | کریډیټ |
| `rep.tb.debit` | Debit | ڈیبٹ | ډیبیټ |
| `rep.tb.desc` | Per-account debit and credit totals from the journal for the period, with closing balances — the difference must be zero. | مدت کے لیے جرنل سے ہر کھاتے کے ڈیبٹ اور کریڈٹ کے مجموعے، اختتامی بیلنس کے ساتھ — فرق صفر ہونا چاہیے۔ | د مودې لپاره له ژورنال څخه د هر حساب ډیبیټ او کریډیټ ټول، د تړلو پاتې سره — توپیر باید صفر وي۔ |
| `rep.tb.difference` | Difference | فرق | توپیر |
| `rep.tb.dr` | Dr | نام | Dr |
| `rep.tb.title` | Trial Balance | ٹرائل بیلنس | د آزموینې بیلانس |
| `rep.tb.unbalanced` | Out of balance | غیر متوازن | نامتوازن |
| `rep.title` | Reports | رپورٹس | راپورونه |
| `rep.to` | To | تک | تر |
| `rep.tot.expenses` | Total expenses | کل اخراجات | ټول لګښتونه |
| `rep.tot.given` | Udhaar given in period | مدت میں دیا گیا ادھار | په موده کې ورکړل شوی پور |
| `rep.tot.grossPurchases` | Gross purchases | مجموعی خرید | ناخالص پېرودونه |
| `rep.tot.grossSales` | Gross sales | مجموعی فروخت | ناخالص پلور |
| `rep.tot.netPurchases` | Net purchases | خالص خرید | خالص پېرودونه |
| `rep.tot.netSales` | Net sales | خالص فروخت | خالص پلور |
| `rep.tot.otherRevenue` | Other revenue (journal only) | دیگر آمدنی (صرف جرنل میں) | نور عاید (یوازې ژورنال) |
| `rep.tot.paid` | Payments in period | مدت میں ادائیگیاں | په موده کې تادیې |
| `rep.tot.plNetRevenue` | Net revenue per profit & loss | نفع و نقصان کے مطابق خالص آمدنی | د ګټې او زیان له مخې خالص عاید |
| `rep.tot.purchased` | Purchases in period | مدت میں خرید | په موده کې پېرودونه |
| `rep.tot.purchaseReturns` | Purchase returns | خرید واپسی | د پېرود بېرته راوړل |
| `rep.tot.repaid` | Repaid in period | مدت میں وصولی | په موده کې بېرته ورکړل شو |
| `rep.tot.returned` | Returns in period | مدت میں واپسی | په موده کې بېرته راوړل |
| `rep.tot.returns` | Returns | واپسیاں | بېرته راوړل |
| `rep.tot.stockValue` | Stock value (at cost) | اسٹاک مالیت (لاگت پر) | د زېرمې ارزښت (په لګښت) |
| `rep.tot.stockValueRetail` | Stock value (at sale price) | اسٹاک مالیت (فروخت قیمت پر) | د زېرمې ارزښت (په پلور بیه) |
| `rep.tot.units` | Units sold (net) | فروخت شدہ یونٹس (خالص) | پلورل شوي واحدونه (خالص) |
| `rep.walkIn` | Walk-in / counter | عام گاہک / کاؤنٹر | راتلونکی / کاونټر |
| `rep.whatsapp` | WhatsApp | واٹس ایپ | WhatsApp |
## print

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `pin.back` | Back | واپس | بېرته |
| `pin.change` | Change PIN | پن بدلیں | PIN بدل کړئ |
| `pin.changedDone` | PIN changed on this device. | اس آلے پر پن بدل گیا۔ | په دې وسیله PIN بدل شو. |
| `pin.confirmPin` | Confirm PIN | پن کی تصدیق کریں | PIN تایید کړئ |
| `pin.currentPin` | Current PIN | موجودہ پن | اوسنی PIN |
| `pin.demoErase.body` | There is no account password in demo mode. Erasing resets the demo shop to its sample data and removes this device's PIN. | ڈیمو موڈ میں اکاؤنٹ پاس ورڈ نہیں ہوتا۔ مٹانے سے ڈیمو دکان اپنے نمونہ ڈیٹا پر واپس آ جاتی ہے اور اس آلے کا پن ہٹ جاتا ہے۔ | په ډیمو حالت کې د حساب پټنوم نشته. پاکول ډیمو هټۍ خپل نمونه معلوماتو ته بیا تنظیموي او د دې وسیلې PIN لرې کوي. |
| `pin.demoErase.submit` | Erase data and remove PIN | ڈیٹا مٹائیں اور پن ہٹائیں | معلومات پاک کړئ او PIN لرې کړئ |
| `pin.demoErase.title` | Erase demo data and remove the PIN | ڈیمو ڈیٹا مٹائیں اور پن ہٹائیں | ډیمو معلومات پاک کړئ او PIN لرې کړئ |
| `pin.demoErase.typeLabel` | Type the shop name to confirm | تصدیق کے لیے دکان کا نام لکھیں | د تایید لپاره د هټۍ نوم ولیکئ |
| `pin.demoRecovery` | There is no password in demo mode: if this PIN is forgotten, the lock screen can erase the demo data and remove the PIN. | ڈیمو موڈ میں پاس ورڈ نہیں ہوتا: یہ پن بھول جائیں تو لاک اسکرین سے ڈیمو ڈیٹا مٹا کر پن ہٹایا جا سکتا ہے۔ | په ډیمو حالت کې پټنوم نشته: که دا PIN هېر شي، د بند سکرین کولی شي ډیمو معلومات پاک کړي او PIN لرې کړي. |
| `pin.digits` | PIN length | پن کی لمبائی | د PIN اوږدوالی |
| `pin.digitsOption` | {n} digits | {n} ہندسے | {n} عددونه |
| `pin.errCurrent` | That current PIN is not correct — nothing was changed. | موجودہ پن درست نہیں — کچھ نہیں بدلا گیا۔ | هغه اوسنی PIN سم نه دی — هېڅ بدل نه شو. |
| `pin.errDigits` | Enter exactly {n} digits, numbers only. | ٹھیک {n} ہندسے درج کریں، صرف اعداد۔ | بالکل {n} عددونه دننه کړئ، یوازې شمېرې. |
| `pin.errMismatch` | The two PINs do not match. | دونوں پن ایک جیسے نہیں ہیں۔ | دواړه PINونه سمون نه خوري. |
| `pin.errPassword` | That account password was not accepted — nothing was changed. | اکاؤنٹ پاس ورڈ قبول نہیں ہوا — کچھ نہیں بدلا گیا۔ | هغه د حساب پټنوم ونه منل شو — هېڅ بدل نه شو. |
| `pin.forgot` | Forgot PIN? | پن بھول گئے؟ | PIN مو هېر شو؟ |
| `pin.gate` | Ask for the PIN before sensitive actions | حساس اعمال سے پہلے پن پوچھیں | د حساسو کړنو څخه مخکې PIN وغواړئ |
| `pin.gate.actDayClose` | Submit the day close | دن کا اختتام جمع کرنا | د ورځې تړل وسپارئ |
| `pin.gate.actFiscal` | Close or reopen the fiscal year | مالی سال بند یا دوبارہ کھولنا | مالي کال وتړئ یا بیا خلاص کړئ |
| `pin.gate.actPeriod` | Close or reopen a period | مدت بند یا دوبارہ کھولنا | موده وتړئ یا بیا خلاصه کړئ |
| `pin.gate.actVoid` | Void a posted bill | درج شدہ بل منسوخ کرنا | ثبت شوی بل باطل کړئ |
| `pin.gate.body` | Enter this device's PIN to continue. | جاری رکھنے کے لیے اس آلے کا پن درج کریں۔ | د دوام لپاره د دې وسیلې PIN دننه کړئ. |
| `pin.gate.title` | PIN required | پن درکار ہے | PIN ته اړتیا ده |
| `pin.gateSub` | Voiding a bill, submitting the day close, and closing or reopening a period or fiscal year will ask for this device's PIN first — only on this device, and only while a PIN is set. | بل منسوخ کرنا، دن کا اختتام جمع کرنا، اور مدت یا مالی سال بند یا دوبارہ کھولنا — ان سے پہلے اس آلے کا پن پوچھا جائے گا — صرف اس آلے پر، اور صرف اس وقت جب پن لگا ہو۔ | د بل باطلول، د ورځې تړل سپارل، او د مودې یا مالي کال تړل یا بیا خلاصول به لومړی د دې وسیلې PIN وغواړي — یوازې په دې وسیله، او یوازې پداسې حال کې چې PIN تنظیم وي. |
| `pin.honesty` | The PIN keeps this device's app private from casual use at the counter. It is not a replacement for your account password — anyone who knows the account password can remove the PIN. Your shop data stays protected by your account sign-in. | پن اس آلے پر ایپ کو کاؤنٹر پر اتفاقی استعمال سے نجی رکھتا ہے۔ یہ آپ کے اکاؤنٹ پاس ورڈ کا متبادل نہیں — جو بھی اکاؤنٹ پاس ورڈ جانتا ہے وہ پن ہٹا سکتا ہے۔ آپ کی دکان کا ڈیٹا آپ کے اکاؤنٹ سائن ان سے محفوظ رہتا ہے۔ | PIN د دې وسیلې ایپ د کاونټر په عادي کارونې څخه خصوصي ساتي. هغه ستاسو د حساب پټنوم بدیل نه دی — هر څوک چې د حساب پټنوم پېژني کولی شي PIN لرې کړي. ستاسو د هټۍ معلومات ستاسو د حساب ننوتلو لخوا خوندي پاتې کېږي. |
| `pin.idle` | Lock automatically when idle | غیر فعالیت پر خودکار لاک | کله چې بېکاره وي په اتومات ډول بند کړئ |
| `pin.idleLaunch` | Only when the app opens | صرف اس وقت جب ایپ کھلے | یوازې کله چې ایپ خلاص شي |
| `pin.idleMinutes` | After {n} min idle | {n} منٹ غیر فعالیت کے بعد | له {n} دقیقو بېکارۍ وروسته |
| `pin.lock.paused` | Too many wrong tries. The pad opens again in {sec} seconds. | غلط کوششیں زیادہ ہو گئیں۔ پیڈ {sec} سیکنڈ میں دوبارہ کھلے گا۔ | ډېرې غلطې هڅې. پیډ په {sec} ثانیو کې بیا خلاصېږي. |
| `pin.lock.prompt` | Enter the device PIN | آلے کا پن درج کریں | د وسیلې PIN دننه کړئ |
| `pin.lock.wrong` | Wrong PIN — try again. | غلط پن — دوبارہ کوشش کریں۔ | غلط PIN — بیا هڅه وکړئ. |
| `pin.lockNow` | Lock now | ابھی لاک کریں | اوس بند کړئ |
| `pin.newPin` | New PIN | نیا پن | نوی PIN |
| `pin.pad.backspace` | Delete last digit | آخری ہندسہ مٹائیں | وروستی عدد ړنګ کړئ |
| `pin.password` | Account password | اکاؤنٹ پاس ورڈ | د حساب پټنوم |
| `pin.passwordAlt` | …or with your account password | …یا اپنے اکاؤنٹ پاس ورڈ سے | …یا ستاسو د حساب پټنوم سره |
| `pin.recover.body` | Enter the password of the account signed in on this device. The PIN is removed, the app opens, and you can set a new PIN in Settings. Forgetting the PIN never locks you out of your own shop. | اس آلے پر سائن ان اکاؤنٹ کا پاس ورڈ درج کریں۔ پن ہٹ جائے گا، ایپ کھل جائے گی، اور آپ ترتیبات میں نیا پن لگا سکیں گے۔ پن بھولنے سے آپ اپنی ہی دکان سے کبھی بند نہیں ہوتے۔ | په دې وسیله ننوتي حساب پټنوم دننه کړئ. PIN لرې کېږي، ایپ خلاصېږي، او تاسو په تنظیمات کې نوی PIN تنظیم کولی شئ. د PIN هېرول هېڅکله تاسو له خپلې هټۍ څخه نه بندوي. |
| `pin.recover.failed` | That password was not accepted — the lock stays on. | پاس ورڈ قبول نہیں ہوا — لاک برقرار ہے۔ | هغه پټنوم ونه منل شو — بند پاتې دی. |
| `pin.recover.submit` | Remove PIN and open | پن ہٹائیں اور کھولیں | PIN لرې کړئ او خلاص کړئ |
| `pin.recover.title` | Forgot the PIN? | پن بھول گئے؟ | PIN مو هېر شو؟ |
| `pin.remove` | Remove PIN | پن ہٹائیں | PIN لرې کړئ |
| `pin.removedDone` | PIN removed from this device. | اس آلے سے پن ہٹ گیا۔ | له دې وسیلې PIN لرې شو. |
| `pin.removeWithPassword` | Remove with password | پاس ورڈ سے ہٹائیں | په پټنوم لرې کړئ |
| `pin.set` | Set PIN | پن لگائیں | PIN تنظیم کړئ |
| `pin.setDone` | PIN set on this device. | اس آلے پر پن لگ گیا۔ | په دې وسیله PIN تنظیم شو. |
| `pin.statusNone` | No PIN is set on this device — the app opens here without a PIN. | اس آلے پر کوئی پن نہیں لگا — یہاں ایپ بغیر پن کے کھلتی ہے۔ | په دې وسیله PIN نه دی تنظیم شوی — ایپ دلته له PIN پرته خلاصېږي. |
| `pin.statusSet` | A PIN is set on this device since {date}. | اس آلے پر {date} سے پن لگا ہوا ہے۔ | په دې وسیله له {date} راهیسې PIN تنظیم شوی دی. |
| `pin.title` | This device's lock | اس آلے کا لاک | د دې وسیلې بند |
| `print.authorisedSignature` | Authorised signature | مجاز دستخط | واک لرونکی لاسلیک |
| `print.brand.badType` | That file could not be read as an image. | یہ فائل تصویر کے طور پر نہیں پڑھی جا سکی۔ | هغه فایل د انځور په توګه نه شو لوستل کېدلی. |
| `print.brand.capNote` | Limit {cap} KB after automatic compression | خودکار کمپریشن کے بعد حد {cap} KB | د اتومات کمپریشن وروسته حد {cap} KB |
| `print.brand.compressing` | Compressing image… | تصویر چھوٹی ہو رہی ہے… | انځور کمپریس کېږي… |
| `print.brand.empty` | No image yet | ابھی کوئی تصویر نہیں | تر اوسه انځور نشته |
| `print.brand.letterheadFooter` | Letterhead — footer banner | لیٹر ہیڈ — نیچے کا بینر | د لیک سرلیک — د پای بینر |
| `print.brand.letterheadFooterToggle` | Print the letterhead footer banner | لیٹر ہیڈ کا نیچے والا بینر چھاپیں | د لیک سرلیک پای بینر چاپ کړئ |
| `print.brand.letterheadHeader` | Letterhead — header banner | لیٹر ہیڈ — اوپر کا بینر | د لیک سرلیک — د سر بینر |
| `print.brand.letterheadHint` | A full-width banner image. On thermal 80mm prints the text header is used instead — banners never print on thermal. | پوری چوڑائی کی بینر تصویر۔ تھرمل 80mm پر بینر کبھی نہیں چھپتا — وہاں متنی ہیڈر استعمال ہوتا ہے۔ | د بشپړ پلنوالي بینر انځور. په ترمل 80mm چاپونو کې پر ځای متني سرلیک کارول کېږي — بینرونه هېڅکله په ترمل نه چاپېږي. |
| `print.brand.logo` | Shop logo | دکان کا لوگو | د هټۍ نښان |
| `print.brand.logoHint` | Shown in the header when the design calls for it. A transparent PNG works best. | ڈیزائن میں منتخب ہونے پر ہیڈر میں دکھائی دیتا ہے۔ شفاف PNG بہترین رہتا ہے۔ | کله چې ډیزاین یې غواړي په سرلیک کې ښودل کېږي. روڼ PNG غوره کار کوي. |
| `print.brand.raastNote` | The QR your bank gave you, saved from your banking app. It prints with Raast payments once Raast is set up (Payments). | آپ کے بینک کا دیا ہوا QR، آپ کی بینکنگ ایپ سے محفوظ کیا گیا۔ راست سیٹ اپ (ادائیگیاں) مکمل ہونے پر راست ادائیگیوں کے ساتھ چھپے گا۔ | هغه QR چې ستاسو بانک درکړی، ستاسو له بانک ایپ څخه خوندي شوی. هغه د Raast تادیاتو سره چاپېږي کله چې Raast تنظیم شي (تادیې). |
| `print.brand.raastQr` | Bank Raast QR image | بینک راست QR تصویر | د بانک Raast QR انځور |
| `print.brand.remove` | Remove | ہٹائیں | لرې کړئ |
| `print.brand.removed` | Image removed. | تصویر ہٹا دی گئی۔ | انځور لرې شو. |
| `print.brand.replace` | Replace | تبدیل کریں | بدل کړئ |
| `print.brand.saved` | Image saved. | تصویر محفوظ ہو گئی۔ | انځور خوندي شو. |
| `print.brand.signature` | Authorised signature | مجاز دستخط | واک لرونکی لاسلیک |
| `print.brand.signatureHint` | Replaces the ruled signature line on the documents you choose below. A transparent PNG works best. | نیچے منتخب دستاویزات پر بنی ہوئی دستخطی لکیر کی جگہ چھپتا ہے۔ شفاف PNG بہترین رہتا ہے۔ | لاندې ستاسو غوره شوي سندونو کې د کرښې لرونکي لاسلیک کرښه بدلوي. روڼ PNG غوره کار کوي. |
| `print.brand.signOn` | Signature image on | دستخط کی تصویر ان پر | د لاسلیک انځور په |
| `print.brand.signSlips` | Salary slips | تنخواہ کی پرچیاں | د معاش رسیدونه |
| `print.brand.signVouchers` | Payment vouchers | ادائیگی واؤچرز | د تادیې واؤچرونه |
| `print.brand.sizeLine` | {size} KB · {w} × {h} px | {size} KB · {w} × {h} پکسل | {size} KB · {w} × {h} px |
| `print.brand.stamp` | Shop stamp / seal | دکان کی مہر | د هټۍ مهر / ټاپه |
| `print.brand.stampAlso` | Also stamp | ان پر بھی مہر | همدارنګه مهر ولګوئ |
| `print.brand.stampAlways` | Every bill | ہر بل پر | هر بل |
| `print.brand.stampHint` | A transparent PNG prints like a real stamp impression. | شفاف PNG اصلی مہر کے نشان کی طرح چھپتا ہے۔ | روڼ PNG د اصلي مهر نښې په څېر چاپېږي. |
| `print.brand.stampMode` | Stamp on bills | بلوں پر مہر | په بلونو مهر |
| `print.brand.stampNever` | Never | کبھی نہیں | هېڅکله نه |
| `print.brand.stampNotes` | Credit / debit notes | کریڈٹ / ڈیبٹ نوٹس | کریډټ / ډېبټ یادښتونه |
| `print.brand.stampPaid` | Fully-paid bills only | صرف مکمل ادا شدہ بلوں پر | یوازې په بشپړ تادیه شوي بلونه |
| `print.brand.stampQuotes` | Quotations & orders | کوٹیشنز اور آرڈرز | نرخ ليکونه او امرونه |
| `print.brand.stampVouchers` | Payment vouchers | ادائیگی واؤچرز | د تادیې واؤچرونه |
| `print.brand.sub` | Your logo, letterhead, stamp and signature, printed on bills and documents. Images are compressed automatically on this device and stored with your shop. | آپ کا لوگو، لیٹر ہیڈ، مہر اور دستخط — بلوں اور دستاویزات پر چھپتے ہیں۔ تصاویر اسی ڈیوائس پر خودکار طور پر چھوٹی کر کے آپ کی دکان کے ساتھ محفوظ ہوتی ہیں۔ | ستاسو نښان، د لیک سرلیک، مهر او لاسلیک، په بلونو او سندونو چاپ شوي. انځورونه په دې وسیله په اتومات ډول کمپریس کېږي او ستاسو له هټۍ سره ساتل کېږي. |
| `print.brand.title` | Brand assets | برانڈ اثاثے | د نښې شتمنۍ |
| `print.brand.tooLarge` | This image compresses to {actual} KB — over the {cap} KB limit. Crop it or use a simpler image, then try again. | یہ تصویر چھوٹی ہو کر بھی {actual} KB رہتی ہے — حد {cap} KB سے زیادہ۔ اسے تراشیں یا سادہ تصویر استعمال کر کے دوبارہ کوشش کریں۔ | دا انځور {actual} KB ته کمپریس کېږي — د {cap} KB حد څخه زیات. هغه پرې کړئ یا یو ساده انځور وکاروئ، بیا بیا هڅه وکړئ. |
| `print.brand.totalLine` | All brand images together: {size} KB | تمام برانڈ تصاویر مل کر: {size} KB | ټولې نښې انځورونه یوځای: {size} KB |
| `print.brand.upload` | Upload image | تصویر اپ لوڈ کریں | انځور پورته کړئ |
| `print.col.discount` | Discount | رعایت | تخفیف |
| `print.col.sku` | SKU | SKU | SKU |
| `print.col.tax` | Tax | ٹیکس | مالیه |
| `print.colDiscount` | Per-line discount column | فی سطر رعایت کالم | د هرې کرښې تخفیف ستنه |
| `print.colSku` | SKU column | SKU کالم | SKU ستنه |
| `print.colTax` | Per-line tax column | فی سطر ٹیکس کالم | د هرې کرښې مالیې ستنه |
| `print.colTaxNote` | Bills and notes only — quotations and orders carry estimates, never per-line tax. | صرف بلوں اور نوٹس کے لیے — کوٹیشن اور آرڈر پر تخمینے ہوتے ہیں، فی سطر ٹیکس نہیں۔ | یوازې بلونه او یادښتونه — نرخ ليکونه او امرونه اټکلونه لري، هېڅکله د هرې کرښې مالیه نه. |
| `print.columnsTitle` | Item columns | اشیا کے کالم | د توکو ستنې |
| `print.colUrduName` | Urdu name under each item | ہر شے کے نیچے اردو نام | د هر توکي لاندې اردو نوم |
| `print.fontScale` | Text size | متن کا سائز | د متن اندازه |
| `print.fontScale.large` | Large | بڑا | لوی |
| `print.fontScale.standard` | Standard | معیاری | معیاري |
| `print.footerNote` | Footer note | فوٹر نوٹ | د پایلیک یادښت |
| `print.footerNotePh` | Printed at the end of bills and documents | بلوں اور دستاویزات کے آخر میں چھپے گا | د بلونو او سندونو په پای کې چاپ شوی |
| `print.footerTitle` | Footer | فوٹر | پایلیک |
| `print.headerMode` | Header style | ہیڈر کا انداز | د سرلیک بڼه |
| `print.headerMode.letterhead` | Letterhead image | لیٹر ہیڈ تصویر | د لیک سرلیک انځور |
| `print.headerMode.logoText` | Logo + text | لوگو + متن | نښان + متن |
| `print.headerMode.text` | Text | متن | متن |
| `print.headerModeNote` | Letterhead and logo images are added under Brand assets; until an image exists, the text header prints. | لیٹر ہیڈ اور لوگو کی تصاویر برانڈ اثاثوں میں شامل ہوتی ہیں؛ تصویر موجود نہ ہو تو متنی ہیڈر ہی چھپتا ہے۔ | د لیک سرلیک او نښان انځورونه د نښې شتمنیو لاندې زیاتېږي؛ تر څو چې انځور موجود نه وي، متني سرلیک چاپېږي. |
| `print.headerTitle` | Header | ہیڈر | سرلیک |
| `print.logoSize` | Logo size | لوگو کا سائز | د نښان اندازه |
| `print.logoSize.l` | Large | بڑا | لوی |
| `print.logoSize.m` | Medium | درمیانہ | منځنی |
| `print.logoSize.s` | Small | چھوٹا | کوچنی |
| `print.paper` | Paper & layout | کاغذ اور لے آؤٹ | کاغذ او جوړښت |
| `print.paper.a4` | Classic A4 | کلاسک A4 | کلاسیک A4 |
| `print.paper.a4compact` | Compact A4 | کمپیکٹ A4 | کمپیکټ A4 |
| `print.paper.a5` | A5 | A5 | A5 |
| `print.paper.thermal80` | Thermal 80mm | تھرمل 80mm | ترمل 80mm |
| `print.previewBill` | Sample bill | نمونہ بل | نمونه بل |
| `print.previewQuote` | Sample quotation | نمونہ کوٹیشن | نمونه نرخ ليک |
| `print.previewTitle` | Live preview | براہِ راست پیش نظارہ | ژوندی مخکتنه |
| `print.raast.caption` | Scan with any banking app to pay via Raast | کسی بھی بینکنگ ایپ سے اسکین کر کے راست سے ادائیگی کریں | د Raast له لارې تادیې لپاره په هر بانک ایپ سکین کړئ |
| `print.raast.dynamicNote` | The code carries the bill total, so the customer just scans and pays — and the bill number lets you match the payment later. Quotations always carry a plain code with no amount: an estimate is not a demand. | کوڈ میں بل کی کل رقم ہوتی ہے — گاہک بس اسکین کر کے ادا کرتا ہے — اور بل نمبر سے آپ بعد میں ادائیگی ملا سکتے ہیں۔ کوٹیشن پر ہمیشہ بغیر رقم والا سادہ کوڈ چھپتا ہے: تخمینہ کوئی تقاضا نہیں ہوتا۔ | کوډ د بل ټول لري، نو پېرودونکی یوازې سکین کوي او تادیه کوي — او د بل شمېره تاسو ته اجازه درکوي وروسته تادیه سره ونښلوئ. نرخ ليکونه تل ساده کوډ له مبلغ پرته لري: اټکل غوښتنه نه ده. |
| `print.raast.dynamicToggle` | Put the bill's amount and number in the QR (dynamic) | QR میں بل کی رقم اور نمبر شامل کریں (ڈائنامک) | د بل مبلغ او شمېره په QR کې واچوئ (متحرک) |
| `print.raast.err.alias` | A mobile number cannot be used here — the Raast QR standard carries an IBAN, not a phone alias. Your IBAN is on your cheque book and in your banking app. | یہاں موبائل نمبر نہیں چلے گا — راست QR کے معیار میں فون علیاس نہیں، IBAN ہوتا ہے۔ آپ کا IBAN چیک بک پر اور بینکنگ ایپ میں ملے گا۔ | دلته د موبایل شمېره نه شي کارول کېدلی — د Raast QR معیار IBAN لري، نه د تلیفون مستعار نوم. ستاسو IBAN ستاسو په چک کتاب او ستاسو په بانک ایپ کې دی. |
| `print.raast.err.checksum` | The IBAN's check digits do not match — a digit is wrong somewhere. Copy it exactly from your cheque book or banking app. | IBAN کے جانچ ہندسے میل نہیں کھا رہے — کہیں کوئی ہندسہ غلط ہے۔ چیک بک یا بینکنگ ایپ سے ہو بہو نقل کریں۔ | د IBAN تایید عددونه سمون نه خوري — چېرته یو عدد غلط دی. هغه بالکل له خپل چک کتاب یا بانک ایپ څخه کاپي کړئ. |
| `print.raast.err.fi` | The bank name must be at most 25 characters, in English letters as your bank prints it. | بینک کا نام زیادہ سے زیادہ 25 حروف ہو، انگریزی حروف میں جیسا آپ کا بینک لکھتا ہے۔ | د بانک نوم باید لږ تر لږه 25 توري وي، په انګلیسي تورو لکه څنګه چې ستاسو بانک یې چاپوي. |
| `print.raast.err.format` | The middle of an IBAN is a 4-letter bank code followed by the account number. Copy it exactly as printed. | IBAN کے درمیان میں چار حروف کا بینک کوڈ اور پھر اکاؤنٹ نمبر ہوتا ہے۔ بالکل ویسا ہی لکھیں جیسا چھپا ہے۔ | د IBAN منځ د 4 تورو بانک کوډ دی ورپسې د حساب شمېره. هغه بالکل لکه چاپ شوی کاپي کړئ. |
| `print.raast.err.length` | A Pakistani IBAN is exactly 24 characters — a character seems missing or extra. | پاکستانی IBAN پورے 24 حروف کا ہوتا ہے — کوئی حرف کم یا زیادہ لگ رہا ہے۔ | پاکستانی IBAN بالکل 24 توري دی — یو توری ورک یا زیات ښکاري. |
| `print.raast.err.notPk` | Only a Pakistani (PK) IBAN works with Raast. | راست کے لیے صرف پاکستانی (PK) IBAN چلتا ہے۔ | یوازې پاکستانی (PK) IBAN له Raast سره کار کوي. |
| `print.raast.fiHint` | As your bank prints it — up to 25 characters. | جیسا آپ کا بینک لکھتا ہے — زیادہ سے زیادہ 25 حروف۔ | لکه څنګه چې ستاسو بانک یې چاپوي — تر 25 تورو پورې. |
| `print.raast.fiLabel` | Bank name (optional) | بینک کا نام (اختیاری) | د بانک نوم (اختیاري) |
| `print.raast.fiPh` | e.g. Meezan Bank | مثلاً Meezan Bank | لکه Meezan Bank |
| `print.raast.honest` | Two ways, honestly labelled. Your bank's own QR image (uploaded under Brand assets) is the verified path — when it exists, it prints. The code generated here follows the State Bank's published person-to-person (P2P) template, built from your IBAN alone. It is not a bank-issued merchant (P2M) code — only your bank can issue one of those — and the generated code has not yet been verified against a real bank Raast QR, so scan-test it with your own banking app before you rely on it. | دو راستے، دونوں صاف لکھے ہوئے۔ آپ کے بینک کی اپنی QR تصویر (برانڈ اثاثوں میں لگائی گئی) تصدیق شدہ راستہ ہے — وہ موجود ہو تو وہی چھپتی ہے۔ یہاں بننے والا کوڈ اسٹیٹ بینک کے شائع شدہ شخص-تا-شخص (P2P) سانچے کے مطابق صرف آپ کے IBAN سے بنتا ہے۔ یہ بینک کا جاری کردہ مرچنٹ (P2M) کوڈ نہیں — وہ صرف آپ کا بینک جاری کر سکتا ہے — اور بنائے گئے کوڈ کی تصدیق ابھی کسی اصل بینک راست QR سے نہیں ہوئی، اس لیے بھروسا کرنے سے پہلے اسے اپنی بینکنگ ایپ سے اسکین کر کے جانچیں۔ | دوه لارې، په رښتیا نومول شوې. ستاسو د بانک خپل QR انځور (د نښې شتمنیو لاندې پورته شوی) تایید شوې لار ده — کله چې موجود وي، هغه چاپېږي. دلته جوړ شوی کوډ د دولتي بانک خپور شوی شخص-ته-شخص (P2P) نمونه تعقیبوي، یوازې ستاسو له IBAN څخه جوړ شوی. هغه د بانک لخوا جاري شوی سوداګریز (P2M) کوډ نه دی — یوازې ستاسو بانک کولی شي له هغو څخه یو جاري کړي — او جوړ شوی کوډ لا د اصلي بانک Raast QR په وړاندې نه دی تایید شوی، نو مخکې له دې چې پرې تکیه وکړئ هغه په خپل بانک ایپ سکین-ازموینه وکړئ. |
| `print.raast.ibanHint` | Your IBAN is printed on your cheque book and shown in your banking app under account details. | آپ کا IBAN چیک بک پر چھپا ہوتا ہے اور بینکنگ ایپ میں اکاؤنٹ کی تفصیل میں نظر آتا ہے۔ | ستاسو IBAN ستاسو په چک کتاب چاپ شوی او ستاسو په بانک ایپ کې د حساب جزئیاتو لاندې ښودل شوی. |
| `print.raast.ibanLabel` | Your Raast IBAN | آپ کا راست IBAN | ستاسو Raast IBAN |
| `print.raast.ibanPh` | PK36 … (24 characters) | PK36 … (24 حروف) | PK36 … (24 توري) |
| `print.raast.onBills` | On bills | بلوں پر | په بلونو |
| `print.raast.paperIban` | Raast IBAN | راست IBAN | Raast IBAN |
| `print.raast.pathGenerated` | On bills: the generated Raast code from this IBAN prints. | بلوں پر: اس IBAN سے بنا راست کوڈ چھپے گا۔ | په بلونو: له دې IBAN څخه جوړ شوی Raast کوډ چاپېږي. |
| `print.raast.pathImage` | On bills: your bank's QR image prints (Brand assets) — the verified path. | بلوں پر: آپ کے بینک کی QR تصویر چھپے گی (برانڈ اثاثے) — یہی تصدیق شدہ راستہ ہے۔ | په بلونو: ستاسو د بانک QR انځور چاپېږي (د نښې شتمنۍ) — تایید شوې لار. |
| `print.raast.pathNone` | On bills: no Raast QR yet — save an IBAN here, or upload your bank's QR image under Brand assets. | بلوں پر: ابھی کوئی راست QR نہیں — یہاں IBAN محفوظ کریں، یا برانڈ اثاثوں میں بینک کی QR تصویر لگائیں۔ | په بلونو: تر اوسه Raast QR نشته — دلته IBAN خوندي کړئ، یا د نښې شتمنیو لاندې د خپل بانک QR انځور پورته کړئ. |
| `print.raast.payloadLabel` | QR contents (for checking) | QR کا متن (جانچ کے لیے) | د QR محتوا (د کتلو لپاره) |
| `print.raast.posterBtn` | Print counter poster | کاؤنٹر پوسٹر چھاپیں | د کاونټر پوستره چاپ کړئ |
| `print.raast.posterNote` | One static code for the counter — the customer scans and types the amount. | کاؤنٹر کے لیے ایک ساکن کوڈ — گاہک اسکین کر کے رقم خود لکھتا ہے۔ | د کاونټر لپاره یو ثابت کوډ — پېرودونکی سکین کوي او مبلغ لیکي. |
| `print.raast.posterTitle` | Pay via Raast | راست سے ادائیگی کریں | د Raast له لارې تادیه وکړئ |
| `print.raast.previewTitle` | Preview — scan-test this code | پیش نظارہ — اس کوڈ کو اسکین کر کے جانچیں | مخکتنه — دا کوډ سکین-ازموینه کړئ |
| `print.raast.provisional` | Generated QR: pending verification against a real bank Raast QR. | بنایا گیا QR: اصل بینک راست QR سے تصدیق باقی ہے۔ | جوړ شوی QR: د اصلي بانک Raast QR په وړاندې تایید په تمه دی. |
| `print.raast.sampleNote` | A test IBAN for the demo, shown only so you can see the code. It never prints on a real bill. | ڈیمو نمونہ — آزمائشی IBAN، صرف کوڈ دکھانے کے لیے۔ یہ کبھی اصل بل پر نہیں چھپتا۔ | د ډیمو لپاره ازموینې IBAN، یوازې ښودل شوی تر څو تاسو کوډ وګورئ. هغه هېڅکله په اصلي بل نه چاپېږي. |
| `print.raast.saved` | Raast settings saved. | راست ترتیبات محفوظ ہو گئیں۔ | د Raast تنظیمات خوندي شول. |
| `print.raast.showToggle` | Print a Raast QR on bills | بلوں پر راست QR چھاپیں | په بلونو Raast QR چاپ کړئ |
| `print.raast.sizeLabel` | QR size on bills | بل پر QR کا سائز | په بلونو د QR اندازه |
| `print.raast.sub` | Print a Raast QR on bills so customers can scan with any banking app and pay straight to your account. | بلوں پر راست QR چھاپیں تاکہ گاہک کسی بھی بینکنگ ایپ سے اسکین کر کے سیدھا آپ کے اکاؤنٹ میں ادائیگی کر سکے۔ | په بلونو Raast QR چاپ کړئ تر څو پېرودونکي په هر بانک ایپ سکین کړي او مستقیم ستاسو حساب ته تادیه وکړي. |
| `print.raast.title` | Payments — Raast QR | ادائیگیاں — راست QR | تادیې — Raast QR |
| `print.raast.validNote` | This IBAN checks out. Before relying on it, scan the preview with your banking app and confirm YOUR name and account appear. | یہ IBAN درست نکلا۔ بھروسا کرنے سے پہلے پیش نظارہ اپنی بینکنگ ایپ سے اسکین کریں اور تصدیق کریں کہ آپ کا اپنا نام اور اکاؤنٹ ہی آ رہا ہے۔ | دا IBAN سم دی. مخکې له دې چې پرې تکیه وکړئ، مخکتنه په خپل بانک ایپ سکین کړئ او تایید کړئ چې ستاسو نوم او حساب ښکاري. |
| `print.reset` | Reset to today's look | آج کی صورت پر واپس کریں | د نن بڼې ته بیا تنظیم کړئ |
| `print.sampleBadge` | SAMPLE · نمونہ | نمونہ · SAMPLE | SAMPLE · نمونہ |
| `print.saved` | Print design saved. | پرنٹ ڈیزائن محفوظ ہو گیا۔ | د چاپ ډیزاین خوندي شو. |
| `print.shopNameAlt` | Shop name (other script) | دکان کا نام (دوسری رسم الخط) | د هټۍ نوم (بل رسم الخط) |
| `print.shopNameAltPh` | e.g. مدینہ جنرل اسٹور | مثلاً مدینہ جنرل اسٹور | لکه مدینہ جنرل اسٹور |
| `print.showAddress` | Show address | پتا دکھائیں | پته وښایاست |
| `print.showLogo` | Show logo in the header | ہیڈر میں لوگو دکھائیں | په سرلیک کې نښان وښایاست |
| `print.showPhone` | Show phone | فون دکھائیں | تلیفون وښایاست |
| `print.showShopName` | Show shop name | دکان کا نام دکھائیں | د هټۍ نوم وښایاست |
| `print.showShopNameAlt` | Show the second name line | نام کی دوسری سطر دکھائیں | د نوم دویمه کرښه وښایاست |
| `print.showSignature` | Authorised signature block on bills | بلوں پر مجاز دستخط کا خانہ | په بلونو د واک لرونکي لاسلیک برخه |
| `print.showThanks` | Show the thank-you line | شکریے کی سطر دکھائیں | د مننې کرښه وښایاست |
| `print.sub` | How bills and documents look on paper — paper, header, item columns and footer. Until you change anything here, printing stays exactly as it is today. | بل اور دستاویزات کاغذ پر کیسے دکھیں — کاغذ، ہیڈر، اشیا کے کالم اور فوٹر۔ جب تک یہاں کچھ نہ بدلیں، پرنٹنگ بالکل ویسی ہی رہے گی جیسی آج ہے۔ | بلونه او سندونه په کاغذ څنګه ښکاري — کاغذ، سرلیک، د توکو ستنې او پایلیک. تر څو چې تاسو دلته څه بدل نه کړئ، چاپ بالکل لکه نن پاتې کېږي. |
| `print.termsLabel` | Terms | شرائط | شرایط |
| `print.termsPh` | Your terms, printed small in the footer | آپ کی شرائط، فوٹر میں چھوٹے حروف میں چھپیں گی | ستاسو شرایط، په پایلیک کې کوچني چاپ شوي |
| `print.termsText` | Terms & conditions | شرائط و ضوابط | شرایط او ضوابط |
| `print.thanksPh` | Leave empty for the standard line | معیاری سطر کے لیے خالی چھوڑیں | د معیاري کرښې لپاره تش پرېږدئ |
| `print.thanksText` | Custom thank-you line | اپنی شکریے کی سطر | خپله د مننې کرښه |
| `print.title` | Print & branding | پرنٹ اور برانڈنگ | چاپ او نښه کول |
## sales

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `sales.chooseProduct` | — Choose a product — | — پراڈکٹ منتخب کریں — | — یو توکی وټاکئ — |
| `sales.decreaseQty` | Decrease quantity | مقدار کم کریں | مقدار کم کړئ |
| `sales.emptyToday` | No sales recorded today yet. | آج ابھی کوئی بکری درج نہیں ہوئی۔ | نن لا تر اوسه هېڅ پلور نه دی ثبت شوی. |
| `sales.errChooseProduct` | Please choose a product first. | براہ کرم پہلے پراڈکٹ منتخب کریں۔ | مهرباني وکړئ لومړی یو توکی وټاکئ. |
| `sales.errQtyMin` | Quantity must be at least 1. | مقدار کم از کم 1 ہونی چاہیے۔ | مقدار باید لږ تر لږه 1 وي. |
| `sales.errRecordFailed` | Could not record the sale. Please try again. | بکری درج نہیں ہو سکی۔ براہ کرم دوبارہ کوشش کریں۔ | پلور ثبت نه شو. مهرباني وکړئ بیا هڅه وکړئ. |
| `sales.errStock` | Not enough stock — only {qty} {unit} of {name} available. | اسٹاک کافی نہیں — {name} کے صرف {qty} {unit} دستیاب ہیں۔ | کافي موجودي نشته — د {name} یوازې {qty} {unit} شته. |
| `sales.eyebrow` | Counter | کاؤنٹر | کاونټر |
| `sales.findProduct` | Find product | پراڈکٹ تلاش کریں | توکی ومومئ |
| `sales.increaseQty` | Increase quantity | مقدار بڑھائیں | مقدار زیات کړئ |
| `sales.newSale` | New sale | نئی بکری | نوی پلور |
| `sales.newSaleAria` | New sale | نئی بکری | نوی پلور |
| `sales.newSaleSub` | Works like the shop counter — quick and simple. | بالکل دکان کے کاؤنٹر کی طرح — تیز اور آسان۔ | د هټۍ د کاونټر په څېر کار کوي — چټک او اسانه. |
| `sales.noResults` | No product matches “{query}”. | “{query}” سے کوئی پراڈکٹ نہیں ملا۔ | هېڅ توکی له “{query}” سره سمون نه خوري. |
| `sales.optionLabel` | {name} — {price} ({qty} {unit} in stock) | {name} — {price} (اسٹاک میں {qty} {unit}) | {name} — {price} (په موجودي کې {qty} {unit}) |
| `sales.product` | Product * | پراڈکٹ * | توکی * |
| `sales.quantity` | Quantity * | مقدار * | مقدار * |
| `sales.recordSale` | Record sale | بکری درج کریں | پلور ثبت کړئ |
| `sales.rowLine` | {qty} × {price} | {qty} × {price} | {qty} × {price} |
| `sales.searchPlaceholder` | Search products — click a result to select… | پراڈکٹ تلاش کریں — نتیجے پر کلک کر کے منتخب کریں… | توکي ولټوئ — د ټاکلو لپاره په پایله کلیک وکړئ… |
| `sales.statItems` | Items sold | اشیاء فروخت | پلورل شوي توکي |
| `sales.statProfit` | Profit | منافع | ګټه |
| `sales.statRevenue` | Revenue | آمدنی | عاید |
| `sales.statTransactions` | Transactions | لین دین | معاملې |
| `sales.stockHint` | {qty} {unit} available · margin {margin}/unit | {qty} {unit} دستیاب · فی {unit} منافع {margin} | {qty} {unit} شته · په هر واحد کې ګټه {margin} |
| `sales.subtitle` | Pick a product, enter the quantity — the sale is logged and the stock is decremented instantly. | پراڈکٹ منتخب کریں، مقدار لکھیں — بکری درج ہو جائے گی اور اسٹاک فوراً کم ہو جائے گا۔ | یو توکی وټاکئ، مقدار ولیکئ — پلور ثبتېږي او موجودي سمدستي کمېږي. |
| `sales.successRecorded` | Recorded: {qty} × {name} = {amount}. Stock updated. | درج ہو گئی: {qty} × {name} = {amount}۔ اسٹاک اپ ڈیٹ ہو گیا۔ | ثبت شو: {qty} × {name} = {amount}. موجودي تازه شوه. |
| `sales.title` | Record a sale | بکری درج کریں | پلور ثبت کړئ |
| `sales.todayAria` | Today's sales | آج کی بکری | د نن ورځې پلور |
| `sales.todayCounter` | Today's counter | آج کا کاؤنٹر | د نن ورځې کاونټر |
| `sales.todayList` | Today's sales list | آج کی بکری کی فہرست | د نن ورځې د پلور لېست |
| `sales.unknownProduct` | Unknown product | نامعلوم پراڈکٹ | نامعلوم توکی |
## docs

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `challan.convertToBill` | Convert to bill | بل میں تبدیل کریں | بل ته بدل کړئ |
| `challan.deskNote` | Billed at the order's agreed prices where the challan cites one; otherwise at the challan's own prices. | جہاں چالان کسی آرڈر سے منسلک ہو وہاں بل آرڈر کی طے شدہ قیمتوں پر بنے گا؛ ورنہ چالان کی اپنی قیمتوں پر۔ | چېرته چې چالان یو امر یادوي، د امر په منل شوو بیو بل جوړېږي؛ که نه، د چالان په خپلو بیو. |
| `challan.dispatch` | Dispatch | روانہ کریں | ولېږئ |
| `challan.driverName` | Driver name | ڈرائیور کا نام | د چلوونکي نوم |
| `challan.empty.none` | No delivery challans yet. Create one for a delivery, or convert a sale order. | ابھی کوئی ڈیلیوری چالان نہیں۔ ترسیل کے لیے ایک بنائیں، یا سیل آرڈر تبدیل کریں۔ | تر اوسه د سپارلو چالان نشته. د سپارلو لپاره یو جوړ کړئ، یا د پلور امر بدل کړئ. |
| `challan.errOrderGone` | The source order can no longer send goods out. | ماخذ آرڈر اب مال نہیں بھیج سکتا۔ | سرچینه امر نور توکي نه شي لېږلی. |
| `challan.eyebrow` | Sales documents | فروخت کی دستاویزات | د پلور سندونه |
| `challan.form.addTitle` | New delivery challan | نیا ڈیلیوری چالان | د سپارلو نوی چالان |
| `challan.form.editTitle` | Edit challan draft | چالان ڈرافٹ تبدیل کریں | د چالان مسوده سم کړئ |
| `challan.form.sub` | Saving keeps this a draft. It receives its DC number only when dispatched. | محفوظ کرنے سے یہ ڈرافٹ ہی رہے گا۔ DC نمبر اسے روانگی پر ہی ملے گا۔ | خوندي کول دا مسوده ساتي. هغه خپله DC شمېره یوازې د لېږلو پر وخت ترلاسه کوي. |
| `challan.new` | New delivery challan | نیا ڈیلیوری چالان | د سپارلو نوی چالان |
| `challan.notice.cancelled` | Challan cancelled. | چالان منسوخ ہو گیا۔ | چالان لغوه شو. |
| `challan.notice.created` | Challan draft saved. | چالان ڈرافٹ محفوظ ہو گیا۔ | د چالان مسوده خوندي شوه. |
| `challan.notice.deleted` | Challan draft deleted. | چالان ڈرافٹ حذف ہو گیا۔ | د چالان مسوده ړنګه شوه. |
| `challan.notice.dispatched` | Challan {number} dispatched. | چالان {number} روانہ ہو گیا۔ | چالان {number} ولېږل شو. |
| `challan.notice.draftReady` | Bill draft for {number} is ready at the billing desk — complete the payment there to post it. | {number} کا بل ڈرافٹ بلنگ ڈیسک پر تیار ہے — درج کرنے کے لیے وہاں ادائیگی مکمل کریں۔ | د {number} لپاره د بل مسوده د بل جوړولو په ځای کې چمتو ده — هلته تادیه بشپړه کړئ تر څو ثبت شي. |
| `challan.notice.fromOrder` | Challan draft created from {number} — add dispatch details, then dispatch it. | {number} سے چالان ڈرافٹ بن گیا — روانگی کی تفصیلات شامل کر کے اسے روانہ کریں۔ | د {number} څخه د چالان مسوده جوړه شوه — د لېږلو جزئیات زیات کړئ، بیا یې ولېږئ. |
| `challan.notice.updated` | Challan draft updated. | چالان ڈرافٹ اپ ڈیٹ ہو گیا۔ | د چالان مسوده تازه شوه. |
| `challan.printTitle` | Delivery Challan | ڈیلیوری چالان | د سپارلو چالان |
| `challan.quantitiesOnly` | Quantities only — this is a delivery note, not a bill. | صرف مقداریں — یہ ترسیلی پرچی ہے، بل نہیں۔ | یوازې مقدارونه — دا د سپارلو یادښت دی، بل نه دی. |
| `challan.receivedBy` | Received by | وصول کنندہ | ترلاسه کوونکی |
| `challan.sourceOrder` | Sale order | سیل آرڈر | د پلور امر |
| `challan.standalone` | Standalone delivery | براہِ راست ترسیل | جلا سپارل |
| `challan.subtitle` | Delivery notes for goods leaving the shop. A challan posts nothing and moves no stock — the bill does that when the delivery is charged. | دکان سے نکلنے والے مال کی ترسیلی پرچیاں۔ چالان کچھ درج نہیں کرتا اور نہ اسٹاک ہلاتا ہے — یہ کام بل کرتا ہے جب ترسیل کا بل بنے۔ | له هټۍ څخه د وتلو توکو لپاره د سپارلو یادښتونه. چالان هېڅ نه ثبتوي او موجودي نه خوځوي — بل هغه کار کوي کله چې سپارل چارج شي. |
| `challan.title` | Delivery Challans | ڈیلیوری چالان | د سپارلو چالانونه |
| `challan.vehicleNo` | Vehicle no. | گاڑی نمبر | د موټر شمېره. |
| `doc.action.edit` | Edit | تبدیل کریں | سم کړئ |
| `doc.action.print` | Print | پرنٹ | چاپ |
| `doc.action.view` | View | دیکھیں | وګورئ |
| `doc.agreedPrices` | Agreed prices from the order apply. | آرڈر کی طے شدہ قیمتیں لاگو ہیں۔ | د امر منل شوې بیې پلي کېږي. |
| `doc.billedQty` | Billed | بل شدہ | بل شوی |
| `doc.cancelConfirmBody` | {label} will be marked cancelled. It never posted anything, so no accounts change. | {label} منسوخ نشان زد ہو جائے گی۔ اس نے کبھی کچھ درج نہیں کیا، اس لیے کوئی کھاتہ نہیں بدلے گا۔ | {label} به لغوه شوی په نښه شي. هغه هېڅکله هېڅ نه دي ثبت کړي، نو هېڅ حساب نه بدلېږي. |
| `doc.cancelConfirmTitle` | Cancel this document? | یہ دستاویز منسوخ کریں؟ | دا سند لغوه شي؟ |
| `doc.cancelDoc` | Cancel document | دستاویز منسوخ کریں | سند لغوه کړئ |
| `doc.convertedQty` | Converted | تبدیل شدہ | بدل شوی |
| `doc.convertQtyTitle` | Quantities | مقداریں | مقدارونه |
| `doc.customer` | Customer | گاہک | پېرودونکی |
| `doc.customerNamePh` | Customer name | گاہک کا نام | د پېرودونکي نوم |
| `doc.customerSelect` | Select a customer… | گاہک منتخب کریں… | یو پېرودونکی وټاکئ… |
| `doc.date` | Date | تاریخ | نېټه |
| `doc.deleteConfirmBody` | The draft will be removed. Drafts carry no number and post nothing. | ڈرافٹ حذف ہو جائے گا۔ ڈرافٹ کا کوئی نمبر نہیں ہوتا اور یہ کچھ درج نہیں کرتا۔ | مسوده به لرې شي. مسودې شمېره نه لري او هېڅ نه ثبتوي. |
| `doc.deleteConfirmTitle` | Delete this draft? | یہ ڈرافٹ حذف کریں؟ | دا مسوده ړنګه شي؟ |
| `doc.deleteDraft` | Delete draft | ڈرافٹ حذف کریں | مسوده ړنګه کړئ |
| `doc.deliveredQty` | Delivered | ترسیل شدہ | سپارل شوی |
| `doc.discount` | Discount | رعایت | تخفیف |
| `doc.discountFlat` | Flat Rs | فلیٹ روپے | ټاکلی Rs |
| `doc.discountPercent` | Percent % | فیصد % | سلنه % |
| `doc.draftLabel` | Draft | ڈرافٹ | مسوده |
| `doc.emptyNoMatch` | No documents match your search. | آپ کی تلاش سے کوئی دستاویز نہیں ملی۔ | هېڅ سند ستاسو د لټون سره سمون نه خوري. |
| `doc.errCancelBlocked` | This document already has fulfilled quantities, so it cannot be cancelled. | اس دستاویز کی کچھ مقداریں پوری ہو چکی ہیں، اس لیے یہ منسوخ نہیں ہو سکتی۔ | دا سند مخکې بشپړ شوي مقدارونه لري، نو لغوه کېدای نه شي. |
| `doc.errConvertState` | This document can no longer be converted. | یہ دستاویز اب تبدیل نہیں ہو سکتی۔ | دا سند نور بدلېدای نه شي. |
| `doc.errNoLines` | Add at least one item first. | پہلے کم از کم ایک آئٹم شامل کریں۔ | لومړی لږ تر لږه یو توکی زیات کړئ. |
| `doc.errNotEditable` | Only a draft can be edited — an issued document is a promise. Cancel it and issue a new one to change it. | صرف ڈرافٹ میں تبدیلی ہو سکتی ہے — جاری شدہ دستاویز ایک وعدہ ہے۔ تبدیلی کے لیے اسے منسوخ کر کے نئی جاری کریں۔ | یوازې مسوده سمول کېدای شي — جاري شوی سند یو ژمنه ده. د بدلولو لپاره یې لغوه کړئ او نوی جاري کړئ. |
| `doc.errNothingRemaining` | Nothing remains to convert on this document. | اس دستاویز میں تبدیل کرنے کے لیے کچھ باقی نہیں۔ | په دې سند کې د بدلولو لپاره هېڅ پاتې نه دي. |
| `doc.errPriceZero` | Every item needs a price above zero. | ہر آئٹم کی قیمت صفر سے زیادہ ہونی چاہیے۔ | هر توکی بیه له صفر څخه زیات ته اړتیا لري. |
| `doc.errQtyZero` | Every item needs a quantity above zero. | ہر آئٹم کی مقدار صفر سے زیادہ ہونی چاہیے۔ | هر توکی مقدار له صفر څخه زیات ته اړتیا لري. |
| `doc.estimateNote` | Estimate only — agreed prices and discounts hold; tax is fixed by the bill when the sale is made. | یہ صرف تخمینہ ہے — طے شدہ قیمتیں اور رعایت برقرار رہیں گی؛ ٹیکس فروخت کے وقت بل پر طے ہوتا ہے۔ | یوازې اټکل — منل شوې بیې او تخفیفونه ساتل کېږي؛ مالیه د پلور پر وخت د بل له خوا ټاکل کېږي. |
| `doc.estTax` | Estimated tax | تخمینی ٹیکس | اټکلي مالیه |
| `doc.fromChallan` | From delivery challan {number} | ڈیلیوری چالان {number} سے | د سپارلو چالان {number} څخه |
| `doc.fromOrder` | From sale order {number} | سیل آرڈر {number} سے | د پلور امر {number} څخه |
| `doc.fromQuotation` | From quotation {number} | کوٹیشن {number} سے | د نرخ ليک {number} څخه |
| `doc.fromQuotationDraft` | From a quotation | ایک کوٹیشن سے | د یوه نرخ ليک څخه |
| `doc.fulfilment` | Fulfilment | تکمیل | بشپړتیا |
| `doc.keep` | Keep it | رہنے دیں | پرې یې ږدئ |
| `doc.lines.add` | Add item | آئٹم شامل کریں | توکی زیات کړئ |
| `doc.lines.amount` | Amount | رقم | مبلغ |
| `doc.lines.cost` | Cost | لاگت | لګښت |
| `doc.lines.noResults` | No product matches “{query}”. | “{query}” سے کوئی آئٹم نہیں ملا۔ | هېڅ توکی د “{query}” سره سمون نه خوري. |
| `doc.lines.price` | Price | قیمت | بیه |
| `doc.lines.product` | Product | آئٹم | توکی |
| `doc.lines.qty` | Qty | مقدار | مقدار |
| `doc.lines.removeAria` | Remove {name} | {name} ہٹائیں | {name} لرې کړئ |
| `doc.lines.searchPh` | Search products — click or Enter to add… | آئٹم تلاش کریں — کلک یا Enter سے شامل کریں… | توکي ولټوئ — د زیاتولو لپاره کلیک وکړئ یا Enter ووهئ… |
| `doc.lines.stock` | {qty} {unit} in stock | اسٹاک میں {qty} {unit} | {qty} {unit} په موجودي کې |
| `doc.note` | Note | نوٹ | یادښت |
| `doc.notePh` | Terms, delivery notes… | شرائط، ترسیل کے نوٹس… | شرایط، د سپارلو یادښتونه… |
| `doc.number` | Number | نمبر | شمېره |
| `doc.receivedQty` | Received | وصول شدہ | ترلاسه شوی |
| `doc.remainingQty` | Remaining | باقی | پاتې |
| `doc.searchPh` | Search number, customer or phone… | نمبر، گاہک یا فون تلاش کریں… | شمېره، پېرودونکی یا تلیفون ولټوئ… |
| `doc.sourceLabel` | Source | ماخذ | سرچینه |
| `doc.status.accepted` | Accepted | منظور شدہ | منل شوی |
| `doc.status.billed` | Billed | بل شدہ | بل شوی |
| `doc.status.cancelled` | Cancelled | منسوخ | لغوه شوی |
| `doc.status.converted` | Converted | تبدیل شدہ | بدل شوی |
| `doc.status.dispatched` | Dispatched | روانہ شدہ | لېږل شوی |
| `doc.status.draft` | Draft | ڈرافٹ | مسوده |
| `doc.status.expired` | Expired | میعاد ختم | وخت تېر شوی |
| `doc.status.fulfilled` | Fulfilled | مکمل | بشپړ شوی |
| `doc.status.issued` | Issued | جاری شدہ | جاري شوی |
| `doc.status.open` | Open | کھلا | خلاص |
| `doc.status.partially_billed` | Partially billed | جزوی بل شدہ | په جزوي ډول بل شوی |
| `doc.status.partially_fulfilled` | Partially billed | جزوی بل شدہ | په جزوي ډول بل شوی |
| `doc.status.partially_received` | Partially received | جزوی وصول شدہ | په جزوي ډول ترلاسه شوی |
| `doc.status.posted` | Posted | درج شدہ | ثبت شوی |
| `doc.status.received` | Received | وصول شدہ | ترلاسه شوی |
| `doc.status.rejected` | Rejected | مسترد شدہ | رد شوی |
| `doc.subtotal` | Subtotal | ذیلی کل | فرعي ټول |
| `doc.supplier` | Supplier | سپلائر | عرضه کوونکی |
| `doc.supplierSelect` | Select a supplier… | سپلائر منتخب کریں… | یو عرضه کوونکی وټاکئ… |
| `doc.th.actions` | Actions | ایکشن | کړنې |
| `doc.th.customer` | Customer | گاہک | پېرودونکی |
| `doc.th.date` | Date | تاریخ | نېټه |
| `doc.th.number` | Number | نمبر | شمېره |
| `doc.th.status` | Status | حالت | حالت |
| `doc.th.supplier` | Supplier | سپلائر | عرضه کوونکی |
| `doc.th.total` | Total | کل | ټول |
| `doc.total` | Total | کل | ټول |
| `doc.validityExpired` | Validity has passed | میعاد گزر چکی ہے | د اعتبار موده تېره شوې |
| `doc.walkIn` | Walk-in customer | عام گاہک | ګرځېدونکی پېرودونکی |
| `nav.deliveryChallans` | Delivery Challans | ڈیلیوری چالان | د سپارلو چالانونه |
| `nav.notes` | Notes | نوٹس | یادښتونه |
| `nav.purchaseOrders` | Purchase Orders | پرچیز آرڈرز | د پېرود امرونه |
| `nav.quotations` | Quotations | کوٹیشنز | نرخ ليکونه |
| `nav.saleOrders` | Sale Orders | سیل آرڈرز | د پلور امرونه |
| `order.confirm` | Confirm order | آرڈر کی تصدیق کریں | امر تایید کړئ |
| `order.convertToBill` | Convert to bill | بل میں تبدیل کریں | بل ته بدل کړئ |
| `order.convertToChallan` | Create delivery challan | ڈیلیوری چالان بنائیں | د سپارلو چالان جوړ کړئ |
| `order.empty.none` | No sale orders yet. Create one directly, or convert an accepted quotation. | ابھی کوئی سیل آرڈر نہیں۔ براہِ راست بنائیں، یا منظور شدہ کوٹیشن تبدیل کریں۔ | تر اوسه د پلور امر نشته. یو مستقیم جوړ کړئ، یا منل شوی نرخ ليک بدل کړئ. |
| `order.expectedDate` | Expected delivery | متوقع ترسیل | د سپارلو تمه شوې نېټه |
| `order.eyebrow` | Sales documents | فروخت کی دستاویزات | د پلور سندونه |
| `order.form.addTitle` | New sale order | نیا سیل آرڈر | د پلور نوی امر |
| `order.form.editTitle` | Edit sale order draft | سیل آرڈر ڈرافٹ تبدیل کریں | د پلور امر مسوده سم کړئ |
| `order.form.sub` | Saving keeps this a draft. It receives its SO number only when confirmed. | محفوظ کرنے سے یہ ڈرافٹ ہی رہے گا۔ SO نمبر اسے تصدیق ہونے پر ہی ملے گا۔ | خوندي کول دا مسوده ساتي. هغه خپله SO شمېره یوازې د تایید پر وخت ترلاسه کوي. |
| `order.new` | New sale order | نیا سیل آرڈر | د پلور نوی امر |
| `order.notice.cancelled` | Sale order cancelled. | سیل آرڈر منسوخ ہو گیا۔ | د پلور امر لغوه شو. |
| `order.notice.confirmed` | Sale order {number} confirmed. | سیل آرڈر {number} کی تصدیق ہو گئی۔ | د پلور امر {number} تایید شو. |
| `order.notice.created` | Sale order draft saved. | سیل آرڈر ڈرافٹ محفوظ ہو گیا۔ | د پلور امر مسوده خوندي شوه. |
| `order.notice.deleted` | Sale order draft deleted. | سیل آرڈر ڈرافٹ حذف ہو گیا۔ | د پلور امر مسوده ړنګه شوه. |
| `order.notice.draftReady` | Bill draft for {number} is ready at the billing desk — complete the payment there to post it. | {number} کا بل ڈرافٹ بلنگ ڈیسک پر تیار ہے — درج کرنے کے لیے وہاں ادائیگی مکمل کریں۔ | د {number} لپاره د بل مسوده د بل جوړولو په ځای کې چمتو ده — هلته تادیه بشپړه کړئ تر څو ثبت شي. |
| `order.notice.updated` | Sale order draft updated. | سیل آرڈر ڈرافٹ اپ ڈیٹ ہو گیا۔ | د پلور امر مسوده تازه شوه. |
| `order.printTitle` | Sale Order | سیل آرڈر | د پلور امر |
| `order.subtitle` | Confirmed orders at agreed prices. An order posts nothing itself — converting it prepares a bill at the billing desk. | طے شدہ قیمتوں پر تصدیق شدہ آرڈرز۔ آرڈر خود کچھ درج نہیں کرتا — اس کی تبدیلی بلنگ ڈیسک پر بل تیار کرتی ہے۔ | په منل شوو بیو تایید شوي امرونه. یو امر په خپله هېڅ نه ثبتوي — بدلول یې د بل جوړولو په ځای کې یو بل چمتو کوي. |
| `order.title` | Sale Orders | سیل آرڈرز | د پلور امرونه |
| `po.agreedCost` | Agreed cost | طے شدہ لاگت | منل شوی لګښت |
| `po.empty.none` | No purchase orders yet. Create one to order stock from a supplier. | ابھی کوئی پرچیز آرڈر نہیں۔ سپلائر سے اسٹاک منگوانے کے لیے ایک بنائیں۔ | تر اوسه د پېرود امر نشته. له عرضه کوونکي څخه د موجودي امر لپاره یو جوړ کړئ. |
| `po.errOverReceipt` | A quantity exceeds what is still outstanding on this order — receiving more than was ordered is refused. | ایک مقدار اس آرڈر پر باقی ماندہ مقدار سے زیادہ ہے — آرڈر سے زیادہ وصولی قبول نہیں ہوتی۔ | یو مقدار له هغه څه زیات دی چې لا په دې امر کې پاتې دی — له امر څخه د زیاتو ترلاسه کول رد کېږي. |
| `po.errReceive` | These goods could not be received against this order. | یہ مال اس آرڈر کے تحت وصول نہیں ہو سکا۔ | دا توکي د دې امر په وړاندې نه شول ترلاسه کېدلی. |
| `po.eyebrow` | Purchase documents | خرید کی دستاویزات | د پېرود سندونه |
| `po.form.addTitle` | New purchase order | نیا پرچیز آرڈر | د پېرود نوی امر |
| `po.form.editTitle` | Edit purchase order draft | پرچیز آرڈر ڈرافٹ تبدیل کریں | د پېرود امر مسوده سم کړئ |
| `po.form.sub` | Saving keeps this a draft. It receives its PO number only when issued. | محفوظ کرنے سے یہ ڈرافٹ ہی رہے گا۔ PO نمبر اسے جاری ہونے پر ہی ملے گا۔ | خوندي کول دا مسوده ساتي. هغه خپله PO شمېره یوازې د جاري کېدو پر وخت ترلاسه کوي. |
| `po.issue` | Issue | جاری کریں | جاري کړئ |
| `po.new` | New purchase order | نیا پرچیز آرڈر | د پېرود نوی امر |
| `po.notice.cancelled` | Purchase order cancelled. | پرچیز آرڈر منسوخ ہو گیا۔ | د پېرود امر لغوه شو. |
| `po.notice.created` | Purchase order draft saved. | پرچیز آرڈر ڈرافٹ محفوظ ہو گیا۔ | د پېرود امر مسوده خوندي شوه. |
| `po.notice.deleted` | Purchase order draft deleted. | پرچیز آرڈر ڈرافٹ حذف ہو گیا۔ | د پېرود امر مسوده ړنګه شوه. |
| `po.notice.issued` | Purchase order {number} issued. | پرچیز آرڈر {number} جاری ہو گیا۔ | د پېرود امر {number} جاري شو. |
| `po.notice.received` | Goods received against {number} — the purchase is recorded in the supplier's book. | {number} کے تحت مال وصول ہو گیا — خریداری سپلائر کی کتاب میں درج ہے۔ | د {number} په وړاندې توکي ترلاسه شول — پېرود د عرضه کوونکي په کتاب کې ثبت دی. |
| `po.notice.updated` | Purchase order draft updated. | پرچیز آرڈر ڈرافٹ اپ ڈیٹ ہو گیا۔ | د پېرود امر مسوده تازه شوه. |
| `po.printNote` | Order at agreed costs — tax is fixed when the goods are received. | طے شدہ لاگت پر آرڈر — ٹیکس مال کی وصولی پر طے ہوتا ہے۔ | په منل شوو لګښتونو امر — مالیه کله چې توکي ترلاسه شي ټاکل کېږي. |
| `po.printTitle` | Purchase Order | پرچیز آرڈر | د پېرود امر |
| `po.receive` | Receive goods | مال وصول کریں | توکي ترلاسه کړئ |
| `po.receiveSub` | Quantities start at what is still outstanding, at the order's agreed costs — correct a cost to the supplier's actual invoice where it differs. Receiving posts the goods through the ordinary purchase book; the purchase cites this order. | مقداریں باقی ماندہ مقدار سے شروع ہوتی ہیں، آرڈر کی طے شدہ لاگت پر — جہاں سپلائر کی اصل انوائس مختلف ہو وہاں لاگت درست کر لیں۔ وصولی مال کو معمول کی خریداری کتاب سے درج کرتی ہے؛ خریداری اس آرڈر کا حوالہ رکھتی ہے۔ | مقدارونه له هغه څه پیلېږي چې لا پاتې دي، د امر په منل شوو لګښتونو — چېرته چې توپیر وي، لګښت د عرضه کوونکي اصلي بل ته سم کړئ. ترلاسه کول توکي د عادي پېرود کتاب له لارې ثبتوي؛ پېرود دا امر یادوي. |
| `po.receiveTitle` | Receive against this order | اس آرڈر کے تحت وصولی | د دې امر په وړاندې ترلاسه کړئ |
| `po.subtitle` | Orders placed with suppliers at agreed costs. A purchase order posts nothing — stock and the supplier's payable move only when goods are received against it. | طے شدہ لاگت پر سپلائرز کو دیے گئے آرڈرز۔ پرچیز آرڈر کچھ درج نہیں کرتا — اسٹاک اور سپلائر کا بقایا صرف اس وقت ہلتا ہے جب اس کے تحت مال وصول ہو۔ | په منل شوو لګښتونو عرضه کوونکو ته ورکړل شوي امرونه. د پېرود امر هېڅ نه ثبتوي — موجودي او د عرضه کوونکي پور یوازې هغه وخت خوځي چې توکي یې په وړاندې ترلاسه شي. |
| `po.title` | Purchase Orders | پرچیز آرڈرز | د پېرود امرونه |
| `quote.accept` | Mark accepted | منظور نشان زد کریں | منل شوی په نښه کړئ |
| `quote.convertToBill` | Convert to bill | بل میں تبدیل کریں | بل ته بدل کړئ |
| `quote.convertToOrder` | Convert to sale order | سیل آرڈر میں تبدیل کریں | د پلور امر ته بدل کړئ |
| `quote.empty.none` | No quotations yet. Create one to quote a customer a price before selling. | ابھی کوئی کوٹیشن نہیں۔ فروخت سے پہلے گاہک کو قیمت دینے کے لیے ایک بنائیں۔ | تر اوسه نرخ ليک نشته. د پلور څخه مخکې پېرودونکي ته د بیې ورکولو لپاره یو جوړ کړئ. |
| `quote.eyebrow` | Sales documents | فروخت کی دستاویزات | د پلور سندونه |
| `quote.form.addTitle` | New quotation | نئی کوٹیشن | نوی نرخ ليک |
| `quote.form.editTitle` | Edit quotation draft | کوٹیشن ڈرافٹ تبدیل کریں | د نرخ ليک مسوده سم کړئ |
| `quote.form.sub` | Saving keeps this a draft. It receives its QT number only when issued. | محفوظ کرنے سے یہ ڈرافٹ ہی رہے گی۔ QT نمبر اسے جاری ہونے پر ہی ملے گا۔ | خوندي کول دا مسوده ساتي. هغه خپله QT شمېره یوازې د جاري کېدو پر وخت ترلاسه کوي. |
| `quote.issue` | Issue | جاری کریں | جاري کړئ |
| `quote.new` | New quotation | نئی کوٹیشن | نوی نرخ ليک |
| `quote.notice.accepted` | Quotation {number} marked accepted. | کوٹیشن {number} منظور نشان زد ہو گئی۔ | نرخ ليک {number} منل شوی په نښه شو. |
| `quote.notice.cancelled` | Quotation cancelled. | کوٹیشن منسوخ ہو گئی۔ | نرخ ليک لغوه شو. |
| `quote.notice.converted` | Sale order draft created from {number}. | {number} سے سیل آرڈر ڈرافٹ بن گیا۔ | د {number} څخه د پلور امر مسوده جوړه شوه. |
| `quote.notice.created` | Quotation draft saved. | کوٹیشن ڈرافٹ محفوظ ہو گئی۔ | د نرخ ليک مسوده خوندي شوه. |
| `quote.notice.deleted` | Quotation draft deleted. | کوٹیشن ڈرافٹ حذف ہو گئی۔ | د نرخ ليک مسوده ړنګه شوه. |
| `quote.notice.draftReadyBill` | Bill draft for {number} is ready at the billing desk — complete the payment there to post it. | {number} کا بل ڈرافٹ بلنگ ڈیسک پر تیار ہے — درج کرنے کے لیے وہاں ادائیگی مکمل کریں۔ | د {number} لپاره د بل مسوده د بل جوړولو په ځای کې چمتو ده — هلته تادیه بشپړه کړئ تر څو ثبت شي. |
| `quote.notice.issued` | Quotation {number} issued. | کوٹیشن {number} جاری ہو گئی۔ | نرخ ليک {number} جاري شو. |
| `quote.notice.rejected` | Quotation {number} marked rejected. | کوٹیشن {number} مسترد نشان زد ہو گئی۔ | نرخ ليک {number} رد شوی په نښه شو. |
| `quote.notice.updated` | Quotation draft updated. | کوٹیشن ڈرافٹ اپ ڈیٹ ہو گئی۔ | د نرخ ليک مسوده تازه شوه. |
| `quote.printTitle` | Quotation · Estimate | کوٹیشن · تخمینہ | نرخ ليک · اټکل |
| `quote.reject` | Mark rejected | مسترد نشان زد کریں | رد شوی په نښه کړئ |
| `quote.subtitle` | Priced promises to customers. A quotation posts nothing — no stock, no udhaar, no journal — until it converts. | گاہکوں کو دی گئی قیمتوں کے وعدے۔ کوٹیشن کچھ درج نہیں کرتی — نہ اسٹاک، نہ ادھار، نہ جرنل — جب تک تبدیل نہ ہو جائے۔ | پېرودونکو ته د بیې ژمنې. نرخ ليک هېڅ نه ثبتوي — نه موجودي، نه پور، نه ژورنال — تر څو چې بدل شي. |
| `quote.title` | Quotations | کوٹیشنز | نرخ ليکونه |
| `quote.validUntil` | Valid until | تک مؤثر | تر دې نېټې اعتبار لري |
| `quote.wa.estTax` | Estimated tax: {amount} | تخمینی ٹیکس: {amount} | اټکلي مالیه: {amount} |
| `quote.wa.title` | Quotation {number} — {date} | کوٹیشن {number} — {date} | نرخ ليک {number} — {date} |
| `quote.wa.validUntil` | Valid until: {date} | تک مؤثر: {date} | تر دې نېټې اعتبار لري: {date} |
| `settings.docSeriesSaved` | Numbering prefixes saved. | نمبرنگ کے سابقے محفوظ ہو گئے۔ | د شمېرنې مختاړي خوندي شول. |
| `settings.docSeriesSub` | The prefix each document series is numbered with. A change applies to documents numbered from now on; numbers already issued never change. | ہر دستاویزی سلسلے کے نمبر کا سابقہ (prefix)۔ تبدیلی آج کے بعد نمبر پانے والی دستاویزات پر لاگو ہوگی؛ پہلے جاری شدہ نمبر کبھی نہیں بدلتے۔ | هغه مختاړی چې هر سند لړۍ ورسره شمېرل کېږي. بدلون له اوس څخه شمېرل کېدونکو سندونو ته پلي کېږي؛ مخکې جاري شوې شمېرې هېڅکله نه بدلېږي. |
| `settings.docSeriesTitle` | Document numbering | دستاویزات کی نمبرنگ | د سندونو شمېرنه |
| `settings.series.challan` | Delivery challans | ڈیلیوری چالان | د سپارلو چالانونه |
| `settings.series.creditNote` | Credit notes | کریڈٹ نوٹس | کریډټ یادښتونه |
| `settings.series.debitNote` | Debit notes | ڈیبٹ نوٹس | ډېبټ یادښتونه |
| `settings.series.job` | Jobs | جابز | دندې |
| `settings.series.loan` | Loans | قرضے | پورونه |
| `settings.series.paymentVoucher` | Payment vouchers | ادائیگی واؤچرز | د تادیې واؤچرونه |
| `settings.series.payrollRun` | Payroll runs | تنخواہ رنز | د معاش چلونې |
| `settings.series.productionOrder` | Production orders | پروڈکشن آرڈرز | د تولید امرونه |
| `settings.series.purchaseOrder` | Purchase orders | پرچیز آرڈرز | د پېرود امرونه |
| `settings.series.quotation` | Quotations | کوٹیشنز | نرخ ليکونه |
| `settings.series.receiptVoucher` | Receipt vouchers | وصولی واؤچرز | د رسید واؤچرونه |
| `settings.series.saleOrder` | Sale orders | سیل آرڈرز | د پلور امرونه |
| `settings.series.stockTransfer` | Stock transfers | اسٹاک منتقلیاں | د موجودي لېږدونه |
| `voucher.balanceAfterCustomer` | Outstanding balance now | موجودہ بقایا بیلنس | اوس پاتې بیلانس |
| `voucher.balanceAfterSupplier` | Payable balance now | موجودہ واجب الادا بیلنس | اوس د ورکړې وړ بیلانس |
| `voucher.paymentTitle` | Payment Voucher | ادائیگی واؤچر | د تادیې واؤچر |
| `voucher.receiptTitle` | Receipt Voucher | رسید واؤچر | د رسید واؤچر |
| `voucher.signature` | Signature | دستخط | لاسلیک |
## dc

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `dc.alreadyClosed.text` | Today ({date}) was already closed. Saving again will add another close record for today. | آج ({date}) پہلے ہی بند ہو چکا ہے۔ دوبارہ محفوظ کرنے سے آج کا ایک اور بندش ریکارڈ شامل ہو جائے گا۔ | نن ({date}) لا دمخه تړل شوې وه. بیا خوندي کول به د نن لپاره بل د تړلو ریکارډ زیات کړي. |
| `dc.alreadyClosed.title` | Day already closed | دن پہلے ہی بند ہو چکا ہے | ورځ لا دمخه تړل شوې ده |
| `dc.backlog` | Un-closed earlier days: {days} day(s) moved {amount} at the till — already inside today's opening balance; this close records today only. | پچھلے غیر بند دن: {days} دنوں میں کاؤنٹر پر {amount} کی آمد و رفت — یہ رقم آج کی ابتدائی بیلنس میں پہلے سے شامل ہے؛ یہ بندش صرف آج کی ریکارڈ کرتی ہے۔ | پخواني نه تړل شوي ورځې: {days} ورځو کې په کاونټر {amount} حرکت کړی — دا پیسې د نن په پرانیستي بیلانس کې لا دمخه شاملې دي؛ دا تړنه یوازې نن ثبتوي. |
| `dc.close.caption` | Opening defaults to the last close's counted cash, or the current cash balance when there is no earlier close. | ابتدائی نقدی پچھلی بندش کی گنی ہوئی نقدی ہوتی ہے، اور اگر پہلے کوئی بندش نہ ہو تو موجودہ نقد بیلنس۔ | پرانیستل د وروستي تړلو د شمېرل شویو نغدو څخه پیل کېږي، یا اوسنی نغد بیلانس کله چې مخکینی تړل نه وي. |
| `dc.close.title` | Close today | آج کا دن بند کریں | نن ورځ وتړئ |
| `dc.closedDiff` | Day closed — difference of {amount} recorded. | دن بند ہو گیا — {amount} کا فرق درج کر لیا گیا ہے۔ | ورځ وتړل شوه — د {amount} توپیر ثبت شو. |
| `dc.closedExact` | Day closed — counted cash matches the expected cash exactly. | دن بند ہو گیا — گنی ہوئی نقدی متوقع نقدی سے بالکل ملتی ہے۔ | ورځ وتړل شوه — شمېرل شوې نغدې له تمه شویو نغدو سره په سمه توګه سمون خوري. |
| `dc.counted.label` | Counted cash (PKR) * | گنی ہوئی نقدی (روپے) * | شمېرل شوې نغدې (PKR) * |
| `dc.counted.placeholder` | Count the till and type it here | گلّہ گن کر یہاں لکھیں | دراز وشمېرئ او دلته یې ولیکئ |
| `dc.countedError` | Please enter the counted cash from the till. | براہ کرم گلّے کی گنی ہوئی نقدی درج کریں۔ | مهرباني وکړئ له دراز څخه شمېرل شوې نغدې ولیکئ. |
| `dc.crossCheck` | Counter summary (cross-check) | کاؤنٹر خلاصہ (تصدیقی جائزہ) | د کاونټر لنډیز (کراس چیک) |
| `dc.diff.label` | Difference (counted − expected) | فرق (گنی ہوئی − متوقع) | توپیر (شمېرل شوې − تمه شوې) |
| `dc.diff.match` | Exact match | بالکل درست | سم سمون |
| `dc.diff.over` | Over by {amount} | {amount} زیادہ | {amount} زیات |
| `dc.diff.short` | Short by {amount} | {amount} کم | {amount} کم |
| `dc.expected` | Expected cash: {amount} | متوقع نقدی: {amount} | تمه شوې نغدې: {amount} |
| `dc.expectedJournal` | Expected per journal — {account}: {amount} | جرنل کے مطابق متوقع — {account}: {amount} | د ژورنال له مخې تمه شوې — {account}: {amount} |
| `dc.eyebrow` | End of day | دن کا اختتام | د ورځې پای |
| `dc.history.counted` | Counted | گنی ہوئی | شمېرل شوې |
| `dc.history.date` | Date | تاریخ | نېټه |
| `dc.history.difference` | Difference | فرق | توپیر |
| `dc.history.empty` | No day closes saved yet. | ابھی تک کوئی دن بندش محفوظ نہیں۔ | لا تر اوسه د ورځې تړل خوندي شوي نه دي. |
| `dc.history.expected` | Expected | متوقع | تمه شوې |
| `dc.history.note` | Note | نوٹ | یادښت |
| `dc.history.opening` | Opening | ابتدائی | پرانیستل |
| `dc.history.title` | History | تاریخچہ | تاریخ |
| `dc.journalNote` | The saved expected cash is the journal figure for {account}; the counter summary above stays as a cross-check. | محفوظ شدہ متوقع نقدی {account} کے جرنل سے آتی ہے؛ اوپر والا کاؤنٹر خلاصہ تصدیقی جائزے کے طور پر رہتا ہے۔ | خوندي شوې تمه شوې نغدې د {account} لپاره د ژورنال شمېره ده؛ پورته د کاونټر لنډیز د کراس چیک په توګه پاتې کېږي. |
| `dc.note.label` | Note | نوٹ | یادښت |
| `dc.note.placeholder` | e.g. Short by change given at closing | مثلاً بندش پر ریزگاری دینے سے کمی ہوئی | لکه په تړلو کې د ورکړل شوي بدل له امله کم |
| `dc.opening.hint` | Cash in the till at the start of the day. | دن کے آغاز پر گلّے میں موجود نقدی۔ | د ورځې په پیل کې په دراز کې نغدې. |
| `dc.opening.label` | Opening cash (PKR) | ابتدائی نقدی (روپے) | پرانیستونکې نغدې (PKR) |
| `dc.save` | Save day close | دن بند کر کے محفوظ کریں | د ورځې تړل خوندي کړئ |
| `dc.stat.counted` | Counted cash | گنی ہوئی نقدی | شمېرل شوې نغدې |
| `dc.stat.difference` | Difference | فرق | توپیر |
| `dc.stat.expected` | Expected cash | متوقع نقدی | تمه شوې نغدې |
| `dc.stat.opening` | Opening cash | ابتدائی نقدی | پرانیستونکې نغدې |
| `dc.subtitle` | Count the cash in the till, compare it with what the books expect, and lock the day in. | گلّے کی نقدی گنیں، کھاتوں کی متوقع رقم سے ملائیں، اور دن بند کر دیں۔ | په دراز کې نغدې وشمېرئ، له هغه څه سره یې پرتله کړئ چې کتابونه یې تمه کوي، او ورځ وتړئ. |
| `dc.title` | Day Close | دن کی بندش | د ورځې تړل |
| `dc.totals.cashIn` | Cash in today | آج کی نقد آمد | نن نغدې راغلې |
| `dc.totals.cashOut` | Cash out today | آج کا نقد اخراج | نن نغدې وتلې |
| `dc.totals.creditGiven` | Udhaar given today | آج دیا گیا ادھار | نن ورکړل شوی پور |
| `dc.totals.creditReceived` | Udhaar received today | آج وصول شدہ ادھار | نن ترلاسه شوی پور |
| `dc.totals.expenses` | Expenses today | آج کے اخراجات | د نن لګښتونه |
| `dc.totals.refunds` | Refunds (cash) | رقم واپسیاں (نقد) | بېرته ورکړې (نغدې) |
| `dc.totals.salesByMethod` | Sales by method | طریقے کے مطابق فروخت | د طریقې له مخې پلور |
| `dc.totals.supplierPaid` | Supplier payments (cash) | سپلائر ادائیگیاں (نقد) | عرضه کوونکي ته تادیې (نغدې) |
| `dc.totals.title` | Today's auto totals | آج کے خودکار مجموعے | د نن اتومات ټولټال |
| `dc.totals.totalSales` | Total sales | کل فروخت | ټول پلور |
## chq

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `chq.action.bounce` | Bounce | باؤنس | بېرته راوګرځوئ |
| `chq.action.clear` | Mark cleared | کلیئر قرار دیں | پاک وګڼئ |
| `chq.action.deposit` | Deposit | بینک جمع کریں | بانک ته کېږدئ |
| `chq.action.return` | Return to customer | گاہک کو واپس کریں | پېرودونکي ته بېرته ورکړئ |
| `chq.bounce.charges` | Bank charges (optional) | بینک چارجز (اختیاری) | د بانک لګښتونه (اختیاري) |
| `chq.bounce.hintIn` | The amount becomes owed by the customer again — it re-opens on their udhaar, against the original bill where there is one. | رقم دوبارہ گاہک کے ذمے واجب الادا ہو جائے گی — اس کے کھاتے میں، اور جہاں اصل بل ہو وہاں اسی بل کے مد میں۔ | مبلغ بیا د پېرودونکي په غاړه کېږي — د هغه په پور کې بیا پرانستل کېږي، چیرته چې اصلي بل وي د هغه پر وړاندې. |
| `chq.bounce.hintOut` | The amount becomes owed to the supplier again. | رقم دوبارہ سپلائر کو واجب الادا ہو جائے گی۔ | مبلغ بیا عرضه کوونکي ته په غاړه کېږي. |
| `chq.bounce.title` | Cheque bounced | چیک باؤنس | چک بېرته راغی |
| `chq.clear.hintIn` | The bank has paid — the amount lands in the deposit account now. | بینک نے ادائیگی کر دی ہے — رقم اب جمع والے اکاؤنٹ میں آ جائے گی۔ | بانک ورکړه کړې ده — مبلغ اوس د اېښودلو په حساب کې راځي. |
| `chq.clear.hintOut` | The bank has paid — the amount leaves the drawn-on account now. | بینک نے ادائیگی کر دی ہے — رقم اب جاری کردہ اکاؤنٹ سے نکل جائے گی۔ | بانک ورکړه کړې ده — مبلغ اوس له ایستل شوي حساب څخه وځي. |
| `chq.clear.title` | Mark cheque cleared | چیک کلیئر قرار دیں | چک پاک وګڼئ |
| `chq.col.actions` | Actions | اقدامات | کړنې |
| `chq.col.amount` | Amount | رقم | مبلغ |
| `chq.col.cheque` | Cheque | چیک | چک |
| `chq.col.dates` | Dates | تاریخیں | نېټې |
| `chq.col.party` | Party | فریق | لوری |
| `chq.col.source` | Against | مد | پر وړاندې |
| `chq.col.status` | Status | حالت | حالت |
| `chq.deposit.account` | Deposit into account | جمع کروانے کا اکاؤنٹ | په کوم حساب کې کېښودل |
| `chq.deposit.hint` | Depositing is a custody move only — no money moves yet. The amount lands in the chosen account when the cheque clears. | جمع کروانا صرف حفاظت کی تبدیلی ہے — ابھی کوئی رقم حرکت نہیں کرتی۔ رقم کلیئرنگ پر منتخب اکاؤنٹ میں آئے گی۔ | اېښودل یوازې د ساتنې خوځښت دی — لا پیسې نه خوځي. کله چې چک پاک شي مبلغ په ټاکلي حساب کې راځي. |
| `chq.deposit.title` | Deposit cheque | چیک بینک میں جمع کریں | چک بانک ته کېږدئ |
| `chq.dir.in` | Received | موصولہ | ترلاسه شوی |
| `chq.dir.out` | Issued | جاری کردہ | ورکړل شوی |
| `chq.dueOn` | Due {date} | تاریخ ادائیگی {date} | په {date} ورکړل کېږي |
| `chq.empty` | No cheques yet. Choose Cheque in a bill, an udhaar repayment, a supplier payment or an expense and it will appear here. | ابھی کوئی چیک نہیں۔ بل، ادھار واپسی، سپلائر ادائیگی یا خرچ میں چیک منتخب کریں تو وہ یہاں آئے گا۔ | لا تر اوسه چکونه نشته. په بل، د پور په بېرته ورکړه، عرضه کوونکي ته په تادیه یا په لګښت کې چک وټاکئ، دلته به راشي. |
| `chq.emptyFilter` | No cheques in this view. | اس منظر میں کوئی چیک نہیں۔ | په دې لید کې چکونه نشته. |
| `chq.err.capture` | Enter the cheque number, bank and both dates first. | پہلے چیک نمبر، بینک اور دونوں تاریخیں درج کریں۔ | لومړی د چیک شمېره، بانک او دواړه نېټې ولیکئ. |
| `chq.field.bank` | Bank | بینک | بانک |
| `chq.field.charges` | Bank charges | بینک چارجز | د بانک لګښتونه |
| `chq.field.dueDate` | Due date (PDC) | تاریخ ادائیگی (PDC) | د ورکړې نېټه (PDC) |
| `chq.field.issueDate` | Cheque date | چیک کی تاریخ | د چیک نېټه |
| `chq.field.no` | Cheque no. | چیک نمبر | د چیک شمېره |
| `chq.notice.bounced` | Cheque bounce recorded. | چیک باؤنس ریکارڈ ہو گیا۔ | د چیک بېرته راتګ ثبت شو. |
| `chq.notice.cleared` | Cheque marked cleared. | چیک کلیئر قرار دے دیا گیا۔ | چک پاک وګڼل شو. |
| `chq.notice.deposited` | Cheque deposited at the bank. | چیک بینک میں جمع کر دیا گیا۔ | چک بانک ته کېښودل شو. |
| `chq.notice.failed` | That action could not be completed. | یہ عمل مکمل نہیں ہو سکا۔ | هغه کړنه بشپړه نشوه. |
| `chq.notice.returned` | Cheque returned to the customer. | چیک گاہک کو واپس کر دیا گیا۔ | چک پېرودونکي ته بېرته ورکړل شو. |
| `chq.overdue` | Overdue | میعاد گزر گئی | وخت تېر شوی |
| `chq.payOption` | Cheque | چیک | چک |
| `chq.return.hint` | The cheque is handed back undeposited — the amount becomes owed by the customer again. Take the replacement as an ordinary repayment afterwards. | چیک بینک جمع ہوئے بغیر واپس کر دیا گیا — رقم دوبارہ گاہک کے ذمے واجب الادا ہو جائے گی۔ متبادل رقم بعد میں معمول کی واپسی کے طور پر لیں۔ | چک له بانک ته اېښودلو پرته بېرته ورکول کېږي — مبلغ بیا د پېرودونکي په غاړه کېږي. بدیل وروسته د عادي بېرته ورکړې په توګه واخلئ. |
| `chq.return.title` | Return cheque to customer | چیک گاہک کو واپس کریں | چک پېرودونکي ته بېرته ورکړئ |
| `chq.searchPh` | Search cheque number, bank or party… | چیک نمبر، بینک یا فریق تلاش کریں… | د چیک شمېره، بانک یا لوری ولټوئ… |
| `chq.src.bill` | Bill #{no} | بل نمبر {no} | بل #{no} |
| `chq.src.expense` | Expense | خرچ | لګښت |
| `chq.src.repayment` | Udhaar repayment | ادھار واپسی | د پور بېرته ورکړه |
| `chq.src.supplierPayment` | Supplier payment | سپلائر ادائیگی | عرضه کوونکي ته تادیه |
| `chq.status.bounced` | Bounced | باؤنس | بېرته راغلی |
| `chq.status.cleared` | Cleared | کلیئر | پاک شوی |
| `chq.status.deposited` | At bank | بینک میں | په بانک کې |
| `chq.status.issued` | Issued | جاری کردہ | ورکړل شوی |
| `chq.status.received` | In drawer | دراز میں | په دراز کې |
| `chq.status.returned` | Returned | واپس کردہ | بېرته ورکړل شو |
| `chq.subtitle` | Every cheque the shop has received or issued, through its whole life — captured with a payment, deposited, cleared or bounced. The registry is the instrument's diary; the money itself always moves through the ledger. | دکان کے موصولہ اور جاری کردہ تمام چیک — پوری زندگی کے ساتھ: وصولی، بینک جمع، کلیئرنگ یا باؤنس۔ رجسٹری چیک کی ڈائری ہے؛ رقم ہمیشہ کھاتے کے ذریعے حرکت کرتی ہے۔ | هر هغه چک چې هټۍ ترلاسه کړی یا ورکړی دی، د هغه د ټول ژوند په اوږدو کې — له تادیې سره نیول شوی، بانک ته اېښودل شوی، پاک شوی یا بېرته راغلی. راجستر د وسیلې ډایري ده؛ پیسې پخپله تل د حساب له لارې خوځي. |
| `chq.sum.atBank` | At bank | بینک میں | په بانک کې |
| `chq.sum.drawer` | In drawer | دراز میں | په دراز کې |
| `chq.sum.pendingOut` | Issued, pending | جاری کردہ زیر التوا | ورکړل شوي، په تمه |
| `chq.title` | Cheque Registry | چیک رجسٹری | د چیکونو راجستر |
| `chq.view.all` | All | تمام | ټول |
| `chq.view.atBank` | At bank | بینک میں | په بانک کې |
| `chq.view.bounced` | Bounced | باؤنس | بېرته راغلي |
| `chq.view.cleared` | Cleared | کلیئر شدہ | پاک شوي |
| `chq.view.drawer` | In drawer | دراز میں | په دراز کې |
| `chq.view.due` | Due now | قابلِ کلیئرنگ | اوس ورکړل کېدونکي |
| `chq.view.issued` | Issued, pending | جاری کردہ زیر التوا | ورکړل شوي، په تمه |
| `chq.view.returned` | Returned | واپس کردہ | بېرته ورکړل شوي |
| `nav.cheques` | Cheques | چیک | چکونه |
## credit

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `credit.badge.advance` | {amount} advance | {amount} پیشگی | {amount} مخکې ورکړه |
| `credit.badge.clear` | Clear | صاف | پاک |
| `credit.badge.due` | {amount} due | {amount} بقایا | {amount} پاتې |
| `credit.empty.none` | The khata is empty. Give your first udhaar to open an account here. | کھاتہ خالی ہے۔ یہاں کھاتہ کھولنے کے لیے پہلا ادھار دیں۔ | حساب تش دی. دلته د حساب پرانستلو لپاره خپل لومړی پور ورکړئ. |
| `credit.empty.search` | No credit accounts match your search. | آپ کی تلاش سے کوئی ادھار کھاتہ نہیں ملا۔ | هېڅ د پور حساب ستاسو له لټون سره سمون نه خوري. |
| `credit.eyebrow` | Khata | کھاتہ | حساب |
| `credit.field.amount` | Amount (PKR) * | رقم (روپے) * | مبلغ (PKR) * |
| `credit.field.customer` | Customer | گاہک | پېرودونکی |
| `credit.field.method` | Method | طریقہ | طریقه |
| `credit.field.name` | Name * | نام * | نوم * |
| `credit.field.note` | Note | نوٹ | یادښت |
| `credit.field.outstanding` | Outstanding | بقایا | پاتې |
| `credit.field.phone` | Phone | فون | تلیفون |
| `credit.give` | Give udhaar | ادھار دیں | پور ورکړئ |
| `credit.give.err.amount` | Enter an udhaar amount above 0. | 0 سے زیادہ ادھار کی رقم لکھیں۔ | له 0 څخه پورته د پور مبلغ ولیکئ. |
| `credit.give.err.customer` | Please choose a customer or switch to Walk-in. | کوئی گاہک منتخب کریں یا واک ان پر جائیں۔ | مهرباني وکړئ پېرودونکی وټاکئ یا راغلي ته لاړ شئ. |
| `credit.give.err.name` | Enter the customer's name for a walk-in udhaar entry. | واک ان ادھار کے لیے گاہک کا نام لکھیں۔ | د راغلي پور د ثبت لپاره د پېرودونکي نوم ولیکئ. |
| `credit.give.namePlaceholder` | Customer name | گاہک کا نام | د پېرودونکي نوم |
| `credit.give.notePlaceholder` | Cash loan, promise date… | نقد قرض، وعدے کی تاریخ… | نغد پور، د وعدې نېټه… |
| `credit.give.phonePlaceholder` | 03xx-xxxxxxx | 03xx-xxxxxxx | 03xx-xxxxxxx |
| `credit.give.sub` | Record a cash loan from the till — money the customer owes you back. For goods sold on credit, use Billing with the Udhaar payment option instead: that records the sale, the stock and the udhaar together. | دراز سے نقد قرض درج کریں — یہ رقم گاہک کے ذمے آپ کو واپس ہے۔ سامان ادھار پر بیچنا ہو تو اس کے بجائے بلنگ میں ادھار ادائیگی کا آپشن منتخب کریں: اس سے فروخت، اسٹاک اور ادھار تینوں ایک ساتھ درج ہوتے ہیں۔ | له دراز څخه نغد پور ثبت کړئ — هغه پیسې چې پېرودونکی یې تاسو ته په غاړه دی. په پور پلورل شویو توکو لپاره، پر ځای یې د پور د تادیې له اختیار سره بل جوړول وکاروئ: دا پلور، زېرمه او پور یو ځای ثبتوي. |
| `credit.given` | Udhaar | ادھار | پور |
| `credit.hideHistory` | Hide history | تاریخ چھپائیں | تاریخ پټ کړئ |
| `credit.history` | History | تاریخ | تاریخ |
| `credit.khataOf` | Khata — {name} | کھاتہ — {name} | حساب — {name} |
| `credit.note.appendOnly` | The khata is append-only — mistakes are corrected with an opposite entry, entries are never edited or deleted. Every udhaar and repayment below stays on record exactly as it was written. | کھاتہ صرف آگے بڑھتا ہے — غلطی الٹ اندراج سے درست ہوتی ہے، اندراج کبھی بدلے یا حذف نہیں ہوتے۔ نیچے دیا گیا ہر ادھار اور واپسی بالکل ویسے ہی ریکارڈ پر رہتی ہے جیسے لکھی گئی تھی۔ | حساب یوازې مخ په وړاندې ځي — تېروتنې په مخالف ثبت سره سمیږي، ثبتونه هېڅکله نه سمیږي او نه ړنګېږي. لاندې هر پور او بېرته ورکړه په سمه توګه په ریکارډ کې پاتې کېږي لکه څنګه چې لیکل شوې وه. |
| `credit.notice.given` | Udhaar of {amount} given to {name}. Khata updated. | {name} کو {amount} ادھار دیا گیا۔ کھاتہ اپڈیٹ ہو گیا۔ | {name} ته د {amount} پور ورکړل شو. حساب تازه شو. |
| `credit.notice.repaid` | Repayment of {amount} received from {name}. Khata updated. | {name} سے {amount} واپسی وصول ہوئی۔ کھاتہ اپڈیٹ ہو گیا۔ | له {name} څخه د {amount} بېرته ورکړه ترلاسه شوه. حساب تازه شو. |
| `credit.repay` | Repayment | واپسی | بېرته ورکړه |
| `credit.repay.err.amount` | Enter a repayment amount above 0. | 0 سے زیادہ واپسی کی رقم لکھیں۔ | له 0 څخه پورته د بېرته ورکړې مبلغ ولیکئ. |
| `credit.repay.err.exceeds` | Amount cannot exceed the outstanding balance of {amount}. | رقم بقایا {amount} سے زیادہ نہیں ہو سکتی۔ | مبلغ د پاتې بیلانس {amount} څخه نشي زیاتېدای. |
| `credit.repay.from` | From {name} | منجانب {name} | له {name} څخه |
| `credit.repay.maxHint` | Maximum: {amount} | زیادہ سے زیادہ: {amount} | اعظمي: {amount} |
| `credit.repay.notePlaceholder` | Partial payment, full settlement… | جزوی ادائیگی، مکمل تصفیہ… | جزوي تادیه، بشپړه تصفیه… |
| `credit.repay.title` | Record repayment | واپسی درج کریں | بېرته ورکړه ثبت کړئ |
| `credit.repayment` | Repayment | واپسی | بېرته ورکړه |
| `credit.search.aria` | Search credit accounts | ادھار کھاتے تلاش کریں | د پور حسابونه ولټوئ |
| `credit.search.placeholder` | Search customer name or phone… | گاہک کا نام یا فون تلاش کریں… | د پېرودونکي نوم یا تلیفون ولټوئ… |
| `credit.subtitle` | Who owes you what — udhaar given, repayments received, and the balance still outstanding for every customer. | کس کے ذمے کتنا ہے — دیا گیا ادھار، وصول شدہ واپسیاں، اور ہر گاہک کا باقی بقایا۔ | څوک ستاسو څومره پوروړی دی — ورکړل شوی پور، ترلاسه شوې بېرته ورکړې، او د هر پېرودونکي لپاره لا پاتې بیلانس. |
| `credit.sum.receivedToday` | Received today | آج وصول ہوا | نن ترلاسه شول |
| `credit.sum.receivedTodaySub` | repayments collected today | آج وصول شدہ واپسیاں | نن راټولې شوې بېرته ورکړې |
| `credit.sum.totalOutstanding` | Total outstanding | کل بقایا | ټول پاتې |
| `credit.sum.totalOutstandingSub` | udhaar still to collect | ادھار جو ابھی وصول کرنا ہے | لا راټولېدونکی پور |
| `credit.sum.withBalance` | Customers with balance | بقایا والے گاہک | هغه پېرودونکي چې بیلانس لري |
| `credit.sum.withBalanceSub` | accounts not yet clear | کھاتے جو ابھی صاف نہیں ہوئے | حسابونه چې لا پاک شوي نه دي |
| `credit.th.actions` | Actions | کارروائیاں | کړنې |
| `credit.th.amount` | Amount | رقم | مبلغ |
| `credit.th.bill` | Bill | بل | بل |
| `credit.th.customer` | Customer | گاہک | پېرودونکی |
| `credit.th.date` | Date | تاریخ | نېټه |
| `credit.th.kind` | Kind | قسم | ډول |
| `credit.th.note` | Note | نوٹ | یادښت |
| `credit.th.outstanding` | Outstanding | بقایا | پاتې |
| `credit.th.repaid` | Repaid | واپس ہوا | بېرته ورکړل شو |
| `credit.th.totalUdhaar` | Total udhaar | کل ادھار | ټول پور |
| `credit.title` | Udhaar Khata (Credit Ledger) | ادھار کھاتہ | د پور حساب (د کریډټ لیجر) |
| `credit.unknownCustomer` | Unknown | نامعلوم | نامعلوم |
| `credit.viewBill` | View bill | بل دیکھیں | بل وګورئ |
| `credit.walkin` | Walk-in / not in directory | واک ان / ڈائریکٹری میں نہیں | راغلی / په لارښود کې نشته |
## cust

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `cust.action.view` | View | دیکھیں | وګورئ |
| `cust.add` | Add customer | گاہک شامل کریں | پېرودونکی زیات کړئ |
| `cust.aria.delete` | Delete {name} | {name} حذف کریں | {name} ړنګول |
| `cust.aria.edit` | Edit {name} | {name} میں ترمیم کریں | {name} سمول |
| `cust.badge.clear` | Clear | حساب صاف | پاک |
| `cust.badge.due` | {amount} due | {amount} باقی | {amount} پاتې |
| `cust.billStatus.held` | Held | روکا گیا | ځنډول شوی |
| `cust.billStatus.paid` | Paid | ادا شدہ | ورکړل شوی |
| `cust.billStatus.partiallyReturned` | Partially returned | جزوی واپسی | په جزوي ډول بېرته راغلی |
| `cust.billStatus.returned` | Returned | واپس شدہ | بېرته راغلی |
| `cust.billStatus.voided` | Voided | منسوخ | لغوه شوی |
| `cust.credit.given` | Udhaar | ادھار | پور |
| `cust.credit.received` | Repayment | وصولی | بېرته ورکړه |
| `cust.delete.aria` | Delete customer | گاہک حذف کریں | پېرودونکی ړنګ کړئ |
| `cust.delete.blocked` | This customer still owes {amount} in udhaar. Collect the repayment first — a customer with an outstanding balance cannot be deleted. | اس گاہک کے ذمے اب بھی {amount} ادھار باقی ہے۔ پہلے وصولی کریں — جس گاہک کا بیلنس باقی ہو اسے حذف نہیں کیا جا سکتا۔ | دې پېرودونکي لا {amount} پور پاتې دی. لومړی بېرته ورکړه راټوله کړئ — هغه پېرودونکی چې پاتې بیلانس لري نشي ړنګېدای. |
| `cust.delete.body` | {name} will be removed from your customer directory. Past bills and khata entries stay in your records. | {name} آپ کی گاہک فہرست سے ہٹا دیا جائے گا۔ پچھلے بل اور کھاتے کی اندراجات آپ کے ریکارڈ میں رہیں گے۔ | {name} به ستاسو د پېرودونکو له لارښود څخه لرې شي. پخواني بلونه او د حساب ثبتونه ستاسو په ریکارډونو کې پاتې کېږي. |
| `cust.delete.keep` | Keep it | رہنے دیں | پرېږدئ |
| `cust.delete.title` | Delete customer? | گاہک حذف کریں؟ | پېرودونکی ړنګ کړئ؟ |
| `cust.empty.noMatch` | No customers match your search. | آپ کی تلاش سے کوئی گاہک نہیں ملا۔ | هېڅ پېرودونکی ستاسو له لټون سره سمون نه خوري. |
| `cust.empty.none` | No customers yet. Add your first customer to build the directory. | ابھی کوئی گاہک نہیں۔ فہرست بنانے کے لیے پہلا گاہک شامل کریں۔ | لا تر اوسه پېرودونکي نشته. د لارښود جوړولو لپاره خپل لومړی پېرودونکی زیات کړئ. |
| `cust.eyebrow` | Directory | فہرست | لارښود |
| `cust.form.address` | Address | پتہ | پته |
| `cust.form.addressPh` | Street, area, city | گلی، علاقہ، شہر | کوڅه، سیمه، ښار |
| `cust.form.addSub` | Add a new customer to your directory. | اپنی فہرست میں نیا گاہک شامل کریں۔ | په خپل لارښود کې نوی پېرودونکی زیات کړئ. |
| `cust.form.addTitle` | Add customer | گاہک شامل کریں | پېرودونکی زیات کړئ |
| `cust.form.editSub` | Update the customer details below. | نیچے گاہک کی تفصیلات اپ ڈیٹ کریں۔ | لاندې د پېرودونکي توضیحات تازه کړئ. |
| `cust.form.editTitle` | Edit customer | گاہک میں ترمیم | پېرودونکی سمول |
| `cust.form.name` | Name * | نام * | نوم * |
| `cust.form.namePh` | e.g. Muhammad Imran | مثلاً محمد عمران | لکه محمد عمران |
| `cust.form.nameRequired` | Customer name is required. | گاہک کا نام ضروری ہے۔ | د پېرودونکي نوم اړین دی. |
| `cust.form.note` | Note | نوٹ | یادښت |
| `cust.form.notePh` | Monthly account, family… | ماہانہ کھاتہ، خاندان… | میاشتنی حساب، کورنۍ… |
| `cust.form.phone` | Phone | فون | تلیفون |
| `cust.form.phonePh` | 03xx-xxxxxxx | 03xx-xxxxxxx | 03xx-xxxxxxx |
| `cust.form.saveChanges` | Save changes | تبدیلیاں محفوظ کریں | بدلونونه خوندي کړئ |
| `cust.noteBox` | Total purchased counts every completed bill for the customer (held and voided bills are excluded). Credit outstanding comes straight from the udhaar khata. | کل خریداری میں گاہک کے تمام مکمل بل شامل ہیں (روکے گئے اور منسوخ بل شامل نہیں)۔ باقی ادھار براہِ راست ادھار کھاتے سے آتا ہے۔ | ټول پېرود د پېرودونکي هر بشپړ شوی بل شمېري (ځنډول شوي او لغوه شوي بلونه پکې نه راځي). پاتې پور نیغ په نیغه د پور له حساب څخه راځي. |
| `cust.notice.added` | Customer "{name}" added. | گاہک "{name}" شامل ہو گیا۔ | پېرودونکی "{name}" زیات شو. |
| `cust.notice.deleted` | Customer "{name}" deleted. | گاہک "{name}" حذف ہو گیا۔ | پېرودونکی "{name}" ړنګ شو. |
| `cust.notice.updated` | Customer "{name}" updated. | گاہک "{name}" اپ ڈیٹ ہو گیا۔ | پېرودونکی "{name}" تازه شو. |
| `cust.profile.aria` | Customer profile | گاہک پروفائل | د پېرودونکي پروفایل |
| `cust.profile.billsSub` | {count} bills | {count} بل | {count} بلونه |
| `cust.profile.creditLedger` | Credit ledger | ادھار کھاتہ | د پور حساب |
| `cust.profile.khata` | Khata entries | کھاتہ اندراجات | د حساب ثبتونه |
| `cust.profile.khataSub` | credit + repayments | ادھار + وصولیاں | پور + بېرته ورکړې |
| `cust.profile.noBills` | No bills for this customer yet. | اس گاہک کا ابھی کوئی بل نہیں۔ | د دې پېرودونکي لپاره لا بلونه نشته. |
| `cust.profile.noCredit` | No udhaar entries for this customer. | اس گاہک کی کوئی ادھار اندراج نہیں۔ | د دې پېرودونکي لپاره د پور ثبتونه نشته. |
| `cust.profile.noPhone` | No phone | فون نمبر نہیں | تلیفون نشته |
| `cust.profile.outstanding` | Outstanding | باقی رقم | پاتې |
| `cust.profile.outstandingSub` | udhaar still due | اب بھی واجب الادا ادھار | لا پاتې پور |
| `cust.profile.purchaseHistory` | Purchase history | خریداری کی تاریخ | د پېرود تاریخ |
| `cust.profile.th.amount` | Amount | رقم | مبلغ |
| `cust.profile.th.billNo` | Bill no | بل نمبر | د بل شمېره |
| `cust.profile.th.date` | Date | تاریخ | نېټه |
| `cust.profile.th.kind` | Kind | قسم | ډول |
| `cust.profile.th.note` | Note | نوٹ | یادښت |
| `cust.profile.th.status` | Status | حالت | حالت |
| `cust.profile.th.total` | Total | کل | ټول |
| `cust.profile.totalPurchased` | Total purchased | کل خریداری | ټول پېرود |
| `cust.searchAria` | Search customers | گاہک تلاش کریں | پېرودونکي ولټوئ |
| `cust.searchPlaceholder` | Search name, phone or address… | نام، فون یا پتہ تلاش کریں… | نوم، تلیفون یا پته ولټوئ… |
| `cust.subtitle` | Your regulars in one place — how much each customer has bought and how much udhaar is still outstanding against them. | آپ کے مستقل گاہک ایک ہی جگہ — ہر گاہک نے کتنا خریدا اور ان کے ذمے کتنا ادھار باقی ہے۔ | ستاسو منظم پېرودونکي په یوه ځای کې — هر پېرودونکي څومره پېرودلي او څومره پور یې لا پاتې دی. |
| `cust.th.actions` | Actions | کارروائی | کړنې |
| `cust.th.address` | Address | پتہ | پته |
| `cust.th.creditOutstanding` | Credit outstanding | باقی ادھار | پاتې پور |
| `cust.th.name` | Name | نام | نوم |
| `cust.th.phone` | Phone | فون | تلیفون |
| `cust.th.totalPurchased` | Total purchased | کل خریداری | ټول پېرود |
| `cust.title` | Customers | گاہک | پېرودونکي |
## exp

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `exp.add` | Add expense | خرچ شامل کریں | لګښت زیات کړئ |
| `exp.amountPlaceholder` | e.g. 1500 | مثلاً 1500 | لکه 1500 |
| `exp.aria.delete` | Delete expense | خرچ حذف کریں | لګښت ړنګول |
| `exp.aria.edit` | Edit expense | خرچ میں ترمیم کریں | لګښت سمول |
| `exp.delete.body` | {category} — {amount} will be removed from the register. A reversing entry is posted to the journal, so the books stay balanced. | {category} — {amount} رجسٹر سے ہٹا دیا جائے گا۔ جرنل میں الٹ اندراج لگے گا، اس لیے حساب برابر رہے گا۔ | {category} — {amount} به له راجستر څخه لرې شي. ژورنال ته یو برعکس ثبت اچول کېږي، نو کتابونه متوازن پاتې کېږي. |
| `exp.delete.confirm` | Confirm delete | حذف کی تصدیق | ړنګول تایید کړئ |
| `exp.delete.keep` | Keep it | رہنے دیں | پرېږدئ |
| `exp.delete.title` | Delete expense? | خرچ حذف کریں؟ | لګښت ړنګ کړئ؟ |
| `exp.edit` | Edit expense | خرچ میں ترمیم | لګښت سمول |
| `exp.editNote` | Update the expense — a reversing entry keeps the journal honest. | خرچ اپڈیٹ کریں — الٹ اندراج جرنل کو درست رکھتا ہے۔ | لګښت تازه کړئ — یو برعکس ثبت ژورنال صادق ساتي. |
| `exp.empty` | No expenses recorded yet. | ابھی کوئی خرچ درج نہیں ہوا۔ | لا تر اوسه لګښتونه ثبت شوي نه دي. |
| `exp.err.amount` | Amount must be greater than 0. | رقم 0 سے زیادہ ہونی چاہیے۔ | مبلغ باید له 0 څخه زیات وي. |
| `exp.err.date` | Please pick a date. | تاریخ منتخب کریں۔ | مهرباني وکړئ نېټه وټاکئ. |
| `exp.eyebrow` | Khata | کھاتہ | حساب |
| `exp.field.amount` | Amount (PKR) * | رقم (روپے) * | مبلغ (PKR) * |
| `exp.field.category` | Category | قسم | کټګوري |
| `exp.field.date` | Date | تاریخ | نېټه |
| `exp.field.method` | Method | طریقہ | طریقه |
| `exp.field.note` | Note | نوٹ | یادښت |
| `exp.form.addSub` | Record a new shop expense. | دکان کا نیا خرچ درج کریں۔ | د هټۍ نوی لګښت ثبت کړئ. |
| `exp.note.journal` | The journal is append-only: editing or deleting an expense posts a reversing entry plus the corrected entry — history is never rewritten. | جرنل صرف آگے بڑھتا ہے: خرچ کی ترمیم یا حذف پر الٹ اندراج اور درست اندراج لگتا ہے — تاریخ کبھی دوبارہ نہیں لکھی جاتی۔ | ژورنال یوازې مخ په وړاندې ځي: د لګښت سمول یا ړنګول یو برعکس ثبت او سم شوی ثبت اچوي — تاریخ هېڅکله نه لیکل کېږي. |
| `exp.notePlaceholder` | e.g. Electricity bill — October | مثلاً بجلی کا بل — اکتوبر | لکه د برېښنا بل — اکتوبر |
| `exp.register.countMany` | {count} records on file. | {count} ریکارڈ موجود ہیں۔ | {count} ریکارډونه په فایل کې دي. |
| `exp.register.countOne` | {count} record on file. | {count} ریکارڈ موجود ہے۔ | {count} ریکارډ په فایل کې دی. |
| `exp.register.title` | Expense register | اخراجات رجسٹر | د لګښتونو راجستر |
| `exp.saveChanges` | Save changes | تبدیلیاں محفوظ کریں | بدلونونه خوندي کړئ |
| `exp.subtitle` | Every shop expense in one register, set against the income it came out of — so the month's real picture is always in front of you. | دکان کا ہر خرچ ایک ہی رجسٹر میں، اس آمدن کے مقابل جس سے وہ نکلا — تاکہ مہینے کی اصل صورتحال ہمیشہ سامنے رہے۔ | د هټۍ هر لګښت په یوه راجستر کې، د هغه عاید پر وړاندې چې ترې راغلی — نو د میاشتې ریښتینی انځور تل ستاسو په مخ کې وي. |
| `exp.sum.monthExpenses` | This month's expenses | اس مہینے کے اخراجات | د دې میاشتې لګښتونه |
| `exp.sum.monthExpensesShort` | Month expenses | مہینے کے اخراجات | د میاشتې لګښتونه |
| `exp.sum.monthExpensesSub` | all categories this month | اس مہینے کی تمام قسمیں | دې میاشت کې ټولې کټګورۍ |
| `exp.sum.monthIncome` | This month's income | اس مہینے کی آمدن | د دې میاشتې عاید |
| `exp.sum.monthIncomeShort` | Month income | مہینے کی آمدن | د میاشتې عاید |
| `exp.sum.monthIncomeSub` | gross sales this month | اس مہینے کی کل فروخت | دې میاشت کې ناخالص پلور |
| `exp.sum.monthNet` | Month net — income minus expenses | مہینے کا خالص — آمدن منفی اخراجات | د میاشتې خالص — عاید منفي لګښتونه |
| `exp.sum.todayExpenses` | Today's expenses | آج کے اخراجات | د نن لګښتونه |
| `exp.sum.todayExpensesSub` | spent today | آج خرچ ہوا | نن لګول شوي |
| `exp.sum.todayIncome` | Today's sales income | آج کی فروخت آمدن | د نن د پلور عاید |
| `exp.sum.todayIncomeSub` | counter + billed sales today | آج کی کاؤنٹر + بل شدہ فروخت | نن کاونټر + بل شوی پلور |
| `exp.th.actions` | Actions | کارروائیاں | کړنې |
| `exp.th.amount` | Amount | رقم | مبلغ |
| `exp.th.category` | Category | قسم | کټګوري |
| `exp.th.date` | Date | تاریخ | نېټه |
| `exp.th.method` | Method | طریقہ | طریقه |
| `exp.th.note` | Note | نوٹ | یادښت |
| `exp.title` | Income & Expenses | آمدن و اخراجات | عاید او لګښتونه |
## inv

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `fc.avg7` | 7-day avg | 7 دن کی اوسط | د 7 ورځو اوسط |
| `fc.daysLeft` | ~{d} days of stock | ~{d} دن کا اسٹاک | ~{d} ورځې زېرمه |
| `fc.daysLeftInf` | No recent sales | حال ہی میں کوئی فروخت نہیں | په دې وروستیو کې پلور نشته |
| `fc.empty` | No sales history yet — record some sales to unlock forecasts. | ابھی کوئی فروخت درج نہیں ہوئی — پیش گوئی دیکھنے کے لیے کچھ فروخت درج کریں۔ | تر اوسه د پلور تاریخ نشته — د وړاندوینو لپاره یو څه پلور ثبت کړئ۔ |
| `fc.eyebrow` | Demand forecast | ڈیمانڈ کی پیش گوئی | د تقاضا وړاندوینه |
| `fc.howAssistant` | AI assistant | اے آئی اسسٹنٹ | AI مرستیال |
| `fc.howBody1` | moving average = units sold in the last 7 days ÷ 7. Days of stock = current stock ÷ moving average. Suggested reorder = ceil(avg × 14 × 1.2 − stock). Slow movers with no recent sales are excluded — ask the | اوسط = پچھلے 7 دن میں بکی مقدار ÷ 7۔ اسٹاک کے دن = موجودہ اسٹاک ÷ اوسط۔ تجویز کردہ ری آرڈر = اوسط × 14 × 1.2 − اسٹاک (اوپر کی طرف مکمل کر کے)۔ جن چیزوں کی حالیہ فروخت نہیں، وہ شامل نہیں — کسی مخصوص چیز کے بارے میں | خوځنده اوسط = په تېرو 7 ورځو کې پلورل شوي واحدونه ÷ 7۔ د زېرمې ورځې = اوسنۍ زېرمه ÷ خوځنده اوسط۔ وړاندیز شوی بیا امر = ceil(avg × 14 × 1.2 − stock)۔ ورو پلورل کېدونکي چې وروستی پلور نلري لرې کېږي — پرځای یې د |
| `fc.howBody2` | about any specific item instead. | سے پوچھیں۔ |  څخه د کوم ځانګړي توکي په اړه وپوښتئ۔ |
| `fc.howTitle` | How it works: | طریقہ کار: | دا څنګه کار کوي: |
| `fc.noOrder` | No order needed | آرڈر کی ضرورت نہیں | امر ته اړتیا نشته |
| `fc.order` | Order {qty} {unit} | {qty} {unit} منگوائیں | امر {qty} {unit} |
| `fc.orderBadge` | {name} — order {qty} {unit} | {name} — {qty} {unit} منگوائیں | {name} — امر {qty} {unit} |
| `fc.perDay` | {n}/day | {n} فی دن | {n}/ورځ |
| `fc.reorderSummary` | {n} items · estimated purchase cost {cost} | {n} چیزیں · متوقع خریداری لاگت {cost} | {n} توکي · د پېرود اټکلي لګښت {cost} |
| `fc.reorderTitle` | Reorder shopping list | ری آرڈر خریداری فہرست | د بیا امر د پېرود لیست |
| `fc.status.critical` | Critical | انتہائی کم | جدي |
| `fc.status.low` | Reorder soon | جلد ری آرڈر کریں | ژر بیا امر وکړئ |
| `fc.status.ok` | Healthy | مناسب | روغ |
| `fc.subtitleBold` | 7-day moving average | پچھلے 7 دن کی اوسط فروخت | د 7 ورځو خوځنده اوسط |
| `fc.subtitlePost` |  of units sold, estimate how many days your current stock will last, and suggest a reorder quantity covering 14 days of demand plus a 20% safety buffer. |  لیتے ہیں، اندازہ لگاتے ہیں کہ موجودہ اسٹاک کتنے دن چلے گا، اور 14 دن کی ڈیمانڈ کے ساتھ 20% اضافی حفاظتی اسٹاک ملا کر ری آرڈر کی مقدار تجویز کرتے ہیں۔ |  د پلورل شویو واحدونو اخلو، اټکل کوو چې ستاسو اوسنۍ زېرمه به څو ورځې دوام وکړي، او د 14 ورځو تقاضا او 20% خوندیتوب سره د بیا امر مقدار وړاندیز کوو۔ |
| `fc.subtitlePre` | For each fast-moving product we take the  | ہر تیزی سے بکنے والی پروڈکٹ کے لیے ہم  | د هر چټک پلورل کېدونکي توکي لپاره موږ  |
| `fc.title` | What to order next | آگے کیا منگوانا ہے | بل څه امر وکړئ |
| `fc.topAria` | Per-product forecast | فی پروڈکٹ پیش گوئی | د هر توکي وړاندوینه |
| `fc.topSub` | Sorted by days of stock remaining — the most urgent first. | باقی اسٹاک کے دنوں کے حساب سے ترتیب — سب سے فوری پہلے۔ | د پاتې زېرمې د ورځو له مخې ترتیب شوي — تر ټولو بیړني لومړی۔ |
| `fc.topTitle` | Top products by demand | ڈیمانڈ کے لحاظ سے سرفہرست پروڈکٹس | د تقاضا له مخې غوره توکي |
| `inv.addProduct` | Add product | پروڈکٹ شامل کریں | توکی زیات کړئ |
| `inv.adj.aria` | Adjust stock | اسٹاک ایڈجسٹ کریں | زېرمه سم کړئ |
| `inv.adj.current` | — currently {qty} {unit} on shelf. | — اس وقت شیلف پر {qty} {unit} موجود ہے۔ | — اوس مهال په المارۍ کې {qty} {unit} شته۔ |
| `inv.adj.deltaLabel` | Quantity change (+ add / − remove) | مقدار میں تبدیلی (+ شامل / − خارج) | د مقدار بدلون (+ زیات / − کم) |
| `inv.adj.deltaPlaceholder` | e.g. 5 or -3 | مثلاً 5 یا -3 | د بېلګې په توګه 5 یا -3 |
| `inv.adj.error` | Enter a quantity change other than 0 (e.g. 5 or -3). | 0 کے علاوہ مقدار کی تبدیلی لکھیں (مثلاً 5 یا -3)۔ | له 0 پرته د مقدار بدلون ولیکئ (د بېلګې په توګه 5 یا -3)۔ |
| `inv.adj.journalNote` | Negative adjustments post an inventory write-off at cost to the journal. | منفی ایڈجسٹمنٹ پر لاگت کے حساب سے انوینٹری کی کٹوتی جرنل میں درج ہوتی ہے۔ | منفي سمونونه په ژورنال کې په لګښت د موجودۍ لیکل بندوي۔ |
| `inv.adj.note` | Note | نوٹ | یادښت |
| `inv.adj.notePlaceholder` | Optional note | اختیاری نوٹ | اختیاري یادښت |
| `inv.adj.reason` | Reason | وجہ | لامل |
| `inv.adj.save` | Save adjustment | ایڈجسٹمنٹ محفوظ کریں | سمون خوندي کړئ |
| `inv.adj.title` | Adjust stock | اسٹاک ایڈجسٹ کریں | زېرمه سم کړئ |
| `inv.adjReason.correction` | Correction | درستگی | سمون |
| `inv.adjReason.damage` | Damage | ٹوٹ پھوٹ | زیان |
| `inv.adjReason.expiry` | Expiry | میعاد ختم | ختمېدل |
| `inv.adjReason.theft` | Theft | چوری | غلا |
| `inv.adjustAria` | Adjust stock for {name} | {name} کا اسٹاک ایڈجسٹ کریں | د {name} زېرمه سم کړئ |
| `inv.adjustTitle` | Adjust stock | اسٹاک ایڈجسٹ کریں | زېرمه سم کړئ |
| `inv.available` | available {n} | دستیاب {n} | شته {n} |
| `inv.cat.beverages` | Beverages | مشروبات | څښاکونه |
| `inv.cat.cooking` | Cooking Essentials | کھانا پکانے کی اشیاء | د پخلي اړتیاوې |
| `inv.cat.dairy` | Dairy | دودھ و دہی | لبنیات |
| `inv.cat.general` | General | عام | عام |
| `inv.cat.household` | Household | گھریلو اشیاء | کورني |
| `inv.cat.lentils` | Lentils & Pulses | دالیں | دالونه او لوبیا |
| `inv.cat.personalCare` | Personal Care | ذاتی نگہداشت | شخصي پاملرنه |
| `inv.cat.rice` | Rice & Grains | چاول و اناج | وریجې او غلې |
| `inv.cat.snacks` | Snacks | اسنیکس | ناشتي |
| `inv.cat.spices` | Spices | مصالحہ جات | مصالحې |
| `inv.class.goods` | Goods (for resale) | اشیاء (فروخت کے لیے) | توکي (د بیا پلور لپاره) |
| `inv.class.raw` | Raw material | خام مال | خام مواد |
| `inv.dead.daysAgo` | Last sold {d} days ago | آخری فروخت {d} دن پہلے | وروستی پلور {d} ورځې مخکې |
| `inv.dead.explain` | These items are sitting on the shelf but have not sold in over 60 days — consider a discount or clearing them out. | یہ چیزیں شیلف پر موجود ہیں مگر 60 دن سے فروخت نہیں ہوئیں — رعایت دے کر یا ختم کر کے جگہ خالی کرنے پر غور کریں۔ | دا توکي په المارۍ کې پراته دي خو له 60 ورځو څخه زیات نه دي پلورل شوي — تخفیف ورکولو یا یې پاکولو ته پام وکړئ۔ |
| `inv.dead.never` | Never sold | کبھی فروخت نہیں ہوئی | هېڅکله نه دی پلورل شوی |
| `inv.delete.aria` | Confirm delete | حذف کی تصدیق | د ړنګولو تایید |
| `inv.delete.body` | will be removed from your inventory. Past sales records stay untouched. This cannot be undone. | آپ کی انوینٹری سے ہٹا دیا جائے گا۔ پچھلی فروخت کا ریکارڈ برقرار رہے گا۔ یہ عمل واپس نہیں ہو سکتا۔ | ستاسو له موجودۍ څخه به لرې شي۔ د تېر پلور ریکارډونه به پاتې شي۔ دا بېرته نه شي کېدای۔ |
| `inv.delete.keep` | Keep it | رہنے دیں | وساتئ |
| `inv.delete.title` | Delete product? | پروڈکٹ حذف کریں؟ | توکی ړنګ کړئ؟ |
| `inv.deleteAria` | Delete {name} | {name} حذف کریں | {name} ړنګ کړئ |
| `inv.editAria` | Edit {name} | {name} میں ترمیم کریں | {name} سم کړئ |
| `inv.empty.adjustments` | No stock adjustments recorded yet. | ابھی تک کوئی اسٹاک ایڈجسٹمنٹ درج نہیں ہوئی۔ | تر اوسه د زېرمې سمونونه نه دي ثبت شوي۔ |
| `inv.empty.all` | No products yet. Add your first product to get started. | ابھی کوئی پروڈکٹ نہیں ہے۔ پہلی پروڈکٹ شامل کر کے آغاز کریں۔ | تر اوسه هېڅ توکی نشته۔ د پیل لپاره خپل لومړی توکی زیات کړئ۔ |
| `inv.empty.dead` | No dead stock. Everything has sold recently. | کوئی ڈیڈ اسٹاک نہیں ہے۔ ہر چیز حال ہی میں بکی ہے۔ | مړه زېرمه نشته۔ هر څه په دې وروستیو کې پلورل شوي۔ |
| `inv.empty.expiring` | Nothing is expiring in the next 30 days. | اگلے 30 دن میں کوئی چیز ختم نہیں ہو رہی۔ | په راتلونکو 30 ورځو کې هېڅ شی نه ختمېږي۔ |
| `inv.empty.low` | No low-stock products. Your shelf is well stocked. | کوئی پروڈکٹ کم اسٹاک میں نہیں ہے۔ شیلف اچھی طرح بھری ہے۔ | کم شوي توکي نشته۔ ستاسو المارۍ ښه ډکه ده۔ |
| `inv.empty.search` | No products match your search. | آپ کی تلاش سے کوئی پروڈکٹ نہیں ملی۔ | ستاسو لټون سره هېڅ توکی نه سمون خوري۔ |
| `inv.err.nameRequired` | Product name is required. | پروڈکٹ کا نام ضروری ہے۔ | د توکي نوم اړین دی۔ |
| `inv.err.saleBelowCost` | Sale price is below cost price — you would lose money on every sale. | فروخت قیمت لاگت قیمت سے کم ہے — ہر فروخت پر نقصان ہوگا۔ | د پلور بیه د لګښت له بیې ټیټه ده — په هر پلور کې به زیان وکړئ۔ |
| `inv.err.salePricePositive` | Sale price must be greater than 0. | فروخت قیمت 0 سے زیادہ ہونی چاہیے۔ | د پلور بیه باید له 0 څخه زیاته وي۔ |
| `inv.err.skuDuplicate` | SKU "{sku}" is already used by {name}. | SKU "{sku}" پہلے ہی {name} کے لیے استعمال ہو رہا ہے۔ | SKU {sku} دمخه د {name} لخوا کارول کېږي۔ |
| `inv.err.skuRequired` | SKU is required. | SKU ضروری ہے۔ | SKU اړین دی۔ |
| `inv.expiry.expired` | Expired {d} days ago | میعاد {d} دن پہلے ختم ہو گئی | {d} ورځې مخکې ختم شو |
| `inv.expiry.inDays` | Expires in {d} days | میعاد ختم ہونے میں {d} دن باقی | په {d} ورځو کې ختمېږي |
| `inv.expiry.today` | Expires today | آج میعاد ختم | نن ختمېږي |
| `inv.exportCsv` | Export CSV | CSV برآمد کریں | CSV صادر کړئ |
| `inv.eyebrow` | Stock register | اسٹاک رجسٹر | د زېرمې ثبت |
| `inv.form.addSub` | Add a new item to your shelf. | اپنی شیلف میں نئی چیز شامل کریں۔ | خپلې المارۍ ته نوی توکی زیات کړئ۔ |
| `inv.form.category` | Category | زمرہ | کټګوري |
| `inv.form.class` | Stock class | اسٹاک کی قسم | د زېرمې ټولګی |
| `inv.form.classHint` | Raw materials are bought to be consumed by production (recipes / manufacturing); their stock value is held in the Raw materials account. Goods — including finished products you make — stay in the Inventory account. | خام مال پیداوار (ترکیب / مینوفیکچرنگ) میں استعمال کے لیے خریدا جاتا ہے؛ اس کی اسٹاک مالیت خام مال کے کھاتے میں رہتی ہے۔ اشیاء — بشمول آپ کی بنائی ہوئی تیار پروڈکٹس — انوینٹری کھاتے میں رہتی ہیں۔ | خام مواد د تولید (ترکیبونو / جوړولو) لخوا د مصرف لپاره اخیستل کېږي؛ د دوی د زېرمې ارزښت د خامو موادو په حساب کې ساتل کېږي۔ توکي — ستاسو جوړ شوي بشپړ توکي په ګډون — د موجودۍ په حساب کې پاتې کېږي۔ |
| `inv.form.classReclassNote` | Changing the class moves the stock on hand ({amount}) between the Inventory and Raw materials accounts with one reclass entry in the journal. The goods themselves do not move. | قسم بدلنے سے موجودہ اسٹاک ({amount}) جرنل میں ایک ری کلاس اندراج کے ذریعے انوینٹری اور خام مال کے کھاتوں کے درمیان منتقل ہو جائے گا۔ سامان خود کہیں نہیں جاتا۔ | د ټولګي بدلول په لاس کې زېرمه ({amount}) په ژورنال کې د یوې بیا ډلبندۍ ننوتنې سره د موجودۍ او خامو موادو حسابونو ترمنځ لېږدوي۔ توکي پخپله نه خوځېږي۔ |
| `inv.form.costPrice` | Cost price (PKR) | لاگت قیمت (روپے) | د لګښت بیه (PKR) |
| `inv.form.editSub` | Update the details below. | نیچے دی گئی تفصیلات اپ ڈیٹ کریں۔ | لاندې جزیات تازه کړئ۔ |
| `inv.form.editTitle` | Edit product | پروڈکٹ میں ترمیم | توکی سم کړئ |
| `inv.form.expiryDate` | Expiry date | میعاد ختم ہونے کی تاریخ | د ختمېدو نېټه |
| `inv.form.expiryHint` | Optional — for perishables only. | اختیاری — صرف خراب ہونے والی چیزوں کے لیے۔ | اختیاري — یوازې د خرابېدونکو لپاره۔ |
| `inv.form.name` | Product name * | پروڈکٹ کا نام * | د توکي نوم * |
| `inv.form.namePlaceholder` | e.g. Dalda Cooking Oil 5L | مثلاً ڈالڈا کوکنگ آئل 5L | د بېلګې په توګه Dalda Cooking Oil 5L |
| `inv.form.reorderHint` | Alert when stock falls to this level. | اسٹاک اس سطح تک آ جائے تو خبردار کریں۔ | کله چې زېرمه دې کچې ته ورسېږي خبر ورکړئ۔ |
| `inv.form.reorderLevel` | Reorder level | ری آرڈر کی سطح | د بیا امر کچه |
| `inv.form.salePrice` | Sale price (PKR) * | فروخت قیمت (روپے) * | د پلور بیه (PKR) * |
| `inv.form.saveChanges` | Save changes | تبدیلیاں محفوظ کریں | بدلونونه خوندي کړئ |
| `inv.form.sku` | SKU * | SKU * | SKU * |
| `inv.form.skuPlaceholder` | e.g. DLD-OIL-5L | مثلاً DLD-OIL-5L | د بېلګې په توګه DLD-OIL-5L |
| `inv.form.stockQty` | Stock quantity | اسٹاک کی مقدار | د زېرمې مقدار |
| `inv.form.taxDefault` | Shop default | دکان کی ڈیفالٹ | د هټۍ اصلي |
| `inv.form.taxExempt` | Tax exempt (never taxed) | ٹیکس سے مستثنیٰ (کبھی ٹیکس نہیں) | له مالیې معاف (هېڅکله مالیه نه لګېږي) |
| `inv.form.taxHint` | Leave on Shop default unless this product carries its own rate. Exempt wins over every slab. | اسے دکان کی ڈیفالٹ پر رہنے دیں، الا یہ کہ اس پروڈکٹ کی اپنی شرح ہو۔ استثنیٰ ہر سلیب پر غالب ہے۔ | د هټۍ په اصلي پرېږدئ مګر دا چې دا توکی خپله کچه ولري۔ معافي په هر سلیب بریالۍ ده۔ |
| `inv.form.taxSlab` | Tax slab | ٹیکس سلیب | د مالیې سلیب |
| `inv.form.unit` | Unit | یونٹ | واحد |
| `inv.form.urduName` | Urdu name | اردو نام | اردو نوم |
| `inv.form.urduNamePlaceholder` | Urdu name | اردو نام | اردو نوم |
| `inv.import.done` | Imported {n} products. | {n} پروڈکٹس درآمد ہو گئیں۔ | {n} توکي وارد شول۔ |
| `inv.import.doneSkipped` | Imported {n} products ({skipped} skipped). | {n} پروڈکٹس درآمد ہو گئیں ({skipped} چھوڑ دی گئیں)۔ | {n} توکي وارد شول ({skipped} پاتې شول)۔ |
| `inv.import.error` | Could not read that CSV file. Please check the file and try again. | وہ CSV فائل نہیں پڑھی جا سکی۔ فائل چیک کر کے دوبارہ کوشش کریں۔ | هغه CSV فایل ونه لوستل شو۔ مهرباني وکړئ فایل وګورئ او بیا هڅه وکړئ۔ |
| `inv.importAria` | Import products from CSV | CSV سے پروڈکٹس درآمد کریں | له CSV څخه توکي وارد کړئ |
| `inv.importCsv` | Import CSV | CSV درآمد کریں | CSV وارد کړئ |
| `inv.kpi.costValue` | Stock value (cost) | اسٹاک کی مالیت (لاگت) | د زېرمې ارزښت (لګښت) |
| `inv.kpi.dead` | Dead stock | ڈیڈ اسٹاک | مړه زېرمه |
| `inv.kpi.deadSub` | no sale in 60 days | 60 دن سے فروخت نہیں ہوئی | په 60 ورځو کې پلور نشته |
| `inv.kpi.expiring` | Expiring ≤30 days | 30 دن کے اندر ختم ہونے والی | په 30 ورځو کې ختمېدونکي |
| `inv.kpi.expiringAction` | check dates & clear first | تاریخیں دیکھ کر پہلے ختم کریں | نېټې وګورئ او لومړی یې ختم کړئ |
| `inv.kpi.expiringNone` | nothing expiring soon | جلد کوئی چیز ختم نہیں ہو رہی | ژر هېڅ شی نه ختمېږي |
| `inv.kpi.productsOnShelf` | {n} products on shelf | شیلف پر {n} پروڈکٹس | په المارۍ کې {n} توکي |
| `inv.kpi.retailSub` | what the shelf would sell for | شیلف کی کل متوقع فروخت | المارۍ به په څومره وپلورل شي |
| `inv.kpi.retailValue` | Stock value (sale price) | اسٹاک کی مالیت (فروخت قیمت) | د زېرمې ارزښت (د پلور بیه) |
| `inv.promised` | promised {n} | وعدہ شدہ {n} | ژمنه شوي {n} |
| `inv.rawBadge` | Raw material | خام مال | خام مواد |
| `inv.reorderAt` | reorder at {n} | ری آرڈر سطح: {n} | په {n} بیا امر وکړئ |
| `inv.searchAria` | Search products | پروڈکٹس تلاش کریں | توکي ولټوئ |
| `inv.searchPlaceholder` | Search name, SKU or category… | نام، SKU یا زمرہ تلاش کریں… | نوم، SKU یا کټګوري ولټوئ… |
| `inv.status.critical` | Critical | انتہائی کم | جدي |
| `inv.status.inStock` | Healthy | مناسب | روغ |
| `inv.status.low` | Low stock | کم اسٹاک | کم شوی |
| `inv.status.out` | Out of stock | اسٹاک ختم | زېرمه ختمه |
| `inv.subtitle` | Every item on your shelf. Rows highlighted in amber are at or below their reorder level — time to restock. | آپ کی شیلف پر موجود ہر چیز۔ عنبری رنگ سے نمایاں قطاریں ری آرڈر کی سطح پر یا اس سے نیچے ہیں — اسٹاک دوبارہ منگوانے کا وقت ہے۔ | ستاسو په المارۍ کې هر توکی۔ په عنبري رنګ نښه شوي قطارونه د بیا امر کچې ته رسېدلي یا ترې ټیټ دي — د بیا ډکولو وخت دی۔ |
| `inv.th.actions` | Actions | کارروائیاں | کړنې |
| `inv.th.change` | Change | تبدیلی | بدلون |
| `inv.th.cost` | Cost | لاگت | لګښت |
| `inv.th.date` | Date | تاریخ | نېټه |
| `inv.th.margin` | Margin | منافع | ګټه |
| `inv.th.note` | Note | نوٹ | یادښت |
| `inv.th.product` | Product | پروڈکٹ | توکی |
| `inv.th.reason` | Reason | وجہ | لامل |
| `inv.th.salePrice` | Sale price | فروخت قیمت | د پلور بیه |
| `inv.th.sku` | SKU | SKU | SKU |
| `inv.th.status` | Status | حالت | حالت |
| `inv.th.stock` | Stock | اسٹاک | زېرمه |
| `inv.title` | Inventory | اسٹاک | موجودي |
| `inv.view.adjustments` | Adjustments log | ایڈجسٹمنٹ لاگ | د سمونونو ثبت |
| `inv.view.all` | All | تمام | ټول |
| `inv.view.dead` | Dead stock (60d) | ڈیڈ اسٹاک (60 دن) | مړه زېرمه (60 ورځې) |
| `inv.view.expiring` | Expiring (30d) | ختم ہونے والی (30 دن) | ختمېدونکي (30 ورځې) |
| `inv.view.low` | Low stock | کم اسٹاک | کم شوی |
| `inv.viewsAria` | Inventory views | اسٹاک کے ویوز | د موجودۍ لیدونه |
## sup

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `sup.action.view` | View | دیکھیں | وګورئ |
| `sup.add` | Add supplier | سپلائر شامل کریں | عرضه کوونکی زیات کړئ |
| `sup.aria.delete` | Delete {name} | {name} حذف کریں | {name} ړنګ کړئ |
| `sup.aria.edit` | Edit {name} | {name} میں ترمیم کریں | {name} سم کړئ |
| `sup.aria.recordPayment` | Record payment to {name} | {name} کو ادائیگی درج کریں | {name} ته تادیه ثبت کړئ |
| `sup.aria.recordPurchase` | Record purchase from {name} | {name} سے خریداری درج کریں | له {name} څخه پېرود ثبت کړئ |
| `sup.delete.aria` | Delete supplier | سپلائر حذف کریں | عرضه کوونکی ړنګ کړئ |
| `sup.delete.blockedBalance` | This supplier still has a payable balance of {amount}. Record the payment first — a supplier with an open balance cannot be deleted. | اس سپلائر کا {amount} اب بھی دینا باقی ہے۔ پہلے ادائیگی درج کریں — جس سپلائر کا بیلنس باقی ہو اسے حذف نہیں کیا جا سکتا۔ | دې عرضه کوونکي ته لا هم {amount} پاتې دي. لومړی تادیه ثبت کړئ — هغه عرضه کوونکی چې پاتې یې وي نه شي ړنګېدلی. |
| `sup.delete.blockedHistory` | This supplier has purchase or payment history, so it cannot be deleted. The history is part of your accounts record. | اس سپلائر کی خریداری یا ادائیگی کی تاریخ موجود ہے، اس لیے اسے حذف نہیں کیا جا سکتا۔ یہ تاریخ آپ کے کھاتوں کے ریکارڈ کا حصہ ہے۔ | دې عرضه کوونکي د پېرود یا تادیې تاریخ لري، نو نه شي ړنګېدلی. تاریخ ستاسو د حسابونو د ریکارډ برخه ده. |
| `sup.delete.body` | {name} will be removed from your supplier directory. | {name} آپ کی سپلائر فہرست سے ہٹا دیا جائے گا۔ | {name} به ستاسو د عرضه کوونکو له لارښود څخه لرې شي. |
| `sup.delete.bodyCompany` | {name} ({company}) will be removed from your supplier directory. | {name} ({company}) آپ کی سپلائر فہرست سے ہٹا دیا جائے گا۔ | {name} ({company}) به ستاسو د عرضه کوونکو له لارښود څخه لرې شي. |
| `sup.delete.keep` | Keep it | رہنے دیں | وساتئ |
| `sup.delete.title` | Delete supplier? | سپلائر حذف کریں؟ | عرضه کوونکی ړنګ کړئ؟ |
| `sup.detail.aria` | Supplier detail | سپلائر کی تفصیل | د عرضه کوونکي جزئیات |
| `sup.detail.balanceLabel` | Balance payable | واجب الادا بیلنس | د ورکړې وړ پاتې |
| `sup.detail.fromPo` | Against purchase order {number} | پرچیز آرڈر {number} کے تحت | د پېرود امر {number} په وړاندې |
| `sup.detail.fromPoDraft` | Against a purchase order | ایک پرچیز آرڈر کے تحت | د پېرود امر په وړاندې |
| `sup.detail.noPayments` | No payments recorded yet. | ابھی کوئی ادائیگی درج نہیں۔ | لا هیڅ تادیه نه ده ثبت شوې. |
| `sup.detail.noPhone` | No phone | فون نمبر نہیں | تلیفون نشته |
| `sup.detail.noPurchases` | No purchases recorded yet. | ابھی کوئی خریداری درج نہیں۔ | لا هیڅ پېرود نه دی ثبت شوی. |
| `sup.detail.payable` | {amount} payable | {amount} دینا ہے | {amount} د ورکړې وړ |
| `sup.detail.paymentsTitle` | Payments history | ادائیگیوں کی تاریخ | د تادیاتو تاریخ |
| `sup.detail.purchasesTitle` | Purchases history | خریداری کی تاریخ | د پېرود تاریخ |
| `sup.detail.settled` | Settled | حساب صاف | تصفیه شوی |
| `sup.detail.summary` | Purchased {purchased} · Paid {paid} | خریداری {purchased} · ادا شدہ {paid} | پېرودل شوي {purchased} · ورکړل شوي {paid} |
| `sup.detail.th.amount` | Amount | رقم | مبلغ |
| `sup.detail.th.date` | Date | تاریخ | نېټه |
| `sup.detail.th.items` | Items | اشیاء | توکي |
| `sup.detail.th.method` | Method | طریقہ | طریقه |
| `sup.detail.th.note` | Note | نوٹ | یادښت |
| `sup.detail.th.total` | Total | کل | ټول |
| `sup.empty.noMatch` | No suppliers match your search. | آپ کی تلاش سے کوئی سپلائر نہیں ملا۔ | ستاسو له لټون سره هیڅ عرضه کوونکی نه سمون خوري. |
| `sup.empty.none` | No suppliers yet. Add your first supplier to start recording purchases. | ابھی کوئی سپلائر نہیں۔ خریداری درج کرنے کے لیے پہلا سپلائر شامل کریں۔ | لا عرضه کوونکي نشته. د پېرود ثبتولو لپاره خپل لومړی عرضه کوونکی زیات کړئ. |
| `sup.eyebrow` | Purchasing | خریداری | پېرود |
| `sup.form.addSub` | Add a new supplier to your directory. | اپنی فہرست میں نیا سپلائر شامل کریں۔ | خپل لارښود ته نوی عرضه کوونکی زیات کړئ. |
| `sup.form.addTitle` | Add supplier | سپلائر شامل کریں | عرضه کوونکی زیات کړئ |
| `sup.form.company` | Company | کمپنی | شرکت |
| `sup.form.companyPh` | e.g. Lahore Wholesale Traders | مثلاً لاہور ہول سیل ٹریڈرز | د بېلګې په توګه لاهور عمده پلورونکي |
| `sup.form.editSub` | Update the supplier details below. | نیچے سپلائر کی تفصیلات اپ ڈیٹ کریں۔ | لاندې د عرضه کوونکي جزئیات تازه کړئ. |
| `sup.form.editTitle` | Edit supplier | سپلائر میں ترمیم | عرضه کوونکی سم کړئ |
| `sup.form.name` | Name * | نام * | نوم * |
| `sup.form.namePh` | e.g. Haji Sahib | مثلاً حاجی صاحب | د بېلګې په توګه حاجي صاحب |
| `sup.form.nameRequired` | Supplier name is required. | سپلائر کا نام ضروری ہے۔ | د عرضه کوونکي نوم اړین دی. |
| `sup.form.notes` | Notes | نوٹس | یادښتونه |
| `sup.form.notesPh` | Terms, delivery days… | شرائط، ڈیلیوری کے دن… | شرایط، د رسولو ورځې… |
| `sup.form.phone` | Phone | فون | تلیفون |
| `sup.form.phonePh` | 03xx-xxxxxxx | 03xx-xxxxxxx | 03xx-xxxxxxx |
| `sup.form.saveChanges` | Save changes | تبدیلیاں محفوظ کریں | بدلونونه خوندي کړئ |
| `sup.kpi.countLabel` | Suppliers | سپلائرز | عرضه کوونکي |
| `sup.kpi.countSub` | in your directory | آپ کی فہرست میں | ستاسو په لارښود کې |
| `sup.kpi.paidLabel` | Paid this month | اس مہینے کی ادائیگی | دا میاشت ورکړل شوي |
| `sup.kpi.paidSub` | payments made this month | اس مہینے کی گئی ادائیگیاں | دا میاشت شوې تادیې |
| `sup.kpi.payableLabel` | Total payable | کل واجب الادا | ټول د ورکړې وړ |
| `sup.kpi.payableSub` | owed to all suppliers | تمام سپلائرز کو دینا ہے | ټولو عرضه کوونکو ته پور |
| `sup.kpi.purchasedLabel` | Purchased this month | اس مہینے کی خریداری | دا میاشت پېرودل شوي |
| `sup.kpi.purchasedSub` | stock bought this month | اس مہینے خریدا گیا اسٹاک | دا میاشت پېرودل شوې موجودي |
| `sup.notice.added` | Supplier "{name}" added. | سپلائر "{name}" شامل ہو گیا۔ | عرضه کوونکی "{name}" زیات شو. |
| `sup.notice.deleted` | Supplier "{name}" deleted. | سپلائر "{name}" حذف ہو گیا۔ | عرضه کوونکی "{name}" ړنګ شو. |
| `sup.notice.updated` | Supplier "{name}" updated. | سپلائر "{name}" اپ ڈیٹ ہو گیا۔ | عرضه کوونکی "{name}" تازه شو. |
| `sup.payment.amount` | Amount (PKR) * | رقم (روپے) * | مبلغ (PKR) * |
| `sup.payment.aria` | Record supplier payment | سپلائر کو ادائیگی درج کریں | د عرضه کوونکي تادیه ثبت کړئ |
| `sup.payment.errAmount` | Enter a payment amount above 0. | 0 سے زیادہ ادائیگی کی رقم درج کریں۔ | له 0 څخه زیاته د تادیې مبلغ ولیکئ. |
| `sup.payment.method` | Method | طریقہ | طریقه |
| `sup.payment.note` | Note | نوٹ | یادښت |
| `sup.payment.notePh` | Reference, cheque no… | حوالہ، چیک نمبر… | حواله، د چک شمېره… |
| `sup.payment.sub` | Paying {name} — current balance {balance}. | {name} کو ادائیگی — موجودہ بیلنس {balance}۔ | {name} ته تادیه — اوسنی پاتې {balance}. |
| `sup.payment.success` | Payment of {amount} recorded to {name}. | {name} کو {amount} کی ادائیگی درج ہو گئی۔ | {name} ته د {amount} تادیه ثبت شوه. |
| `sup.payment.title` | Record payment | ادائیگی درج کریں | تادیه ثبت کړئ |
| `sup.purchase.addLine` | Add line | لائن شامل کریں | کرښه زیاته کړئ |
| `sup.purchase.costNote` | The latest unit cost becomes the product's cost price. | تازہ ترین فی یونٹ قیمت پروڈکٹ کی لاگت قیمت بن جاتی ہے۔ | تر ټولو وروستۍ د واحد لګښت د توکي د لګښت بیه کېږي. |
| `sup.purchase.errFailed` | Could not record the purchase. Please check the lines and try again. | خریداری درج نہیں ہو سکی۔ لائنیں چیک کر کے دوبارہ کوشش کریں۔ | پېرود ثبت نه شو. مهرباني وکړئ کرښې وګورئ او بیا هڅه وکړئ. |
| `sup.purchase.errInvalidLine` | Every line needs a product and a quantity above 0. | ہر لائن کے لیے پروڈکٹ اور 0 سے زیادہ مقدار ضروری ہے۔ | هره کرښه یو توکي او له 0 څخه زیات مقدار ته اړتیا لري. |
| `sup.purchase.errNegativeCost` | Unit cost cannot be negative. | فی یونٹ قیمت منفی نہیں ہو سکتی۔ | د واحد لګښت منفي نه شي کېدلی. |
| `sup.purchase.errNoLines` | Add at least one product line. | کم از کم ایک پروڈکٹ لائن شامل کریں۔ | لږ تر لږه یوه د توکي کرښه زیاته کړئ. |
| `sup.purchase.grossTotal` | Total payable (incl. tax) | کل واجب الادا (بشمول ٹیکس) | ټول د ورکړې وړ (د مالیې په ګډون) |
| `sup.purchase.inStock` | {qty} {unit} in stock | اسٹاک میں {qty} {unit} | {qty} {unit} په موجودي کې |
| `sup.purchase.lineTotal` | Line total: {amount} | لائن کل: {amount} | د کرښې ټول: {amount} |
| `sup.purchase.net` | Goods (net) | مال (خالص) | توکي (خالص) |
| `sup.purchase.note` | Note | نوٹ | یادښت |
| `sup.purchase.notePh` | Invoice no, delivery note… | انوائس نمبر، ڈیلیوری نوٹ… | د رسید شمېره، د رسولو یادښت… |
| `sup.purchase.product` | Product | پروڈکٹ | توکی |
| `sup.purchase.qty` | Qty | مقدار | مقدار |
| `sup.purchase.removeLine` | Remove line | لائن ہٹائیں | کرښه لرې کړئ |
| `sup.purchase.sub` | From {name}. Stock is increased as soon as you save. | {name} سے خریداری۔ محفوظ کرتے ہی اسٹاک بڑھ جائے گا۔ | له {name} څخه. کله چې تاسو خوندي کړئ موجودي سمدلاسه زیاتېږي. |
| `sup.purchase.subCompany` | From {name} — {company}. Stock is increased as soon as you save. | {name} — {company} سے خریداری۔ محفوظ کرتے ہی اسٹاک بڑھ جائے گا۔ | له {name} — {company} څخه. کله چې تاسو خوندي کړئ موجودي سمدلاسه زیاتېږي. |
| `sup.purchase.success` | Purchase of {amount} recorded from {name}. Stock increased; payable updated. | {name} سے {amount} کی خریداری درج ہو گئی۔ اسٹاک بڑھ گیا؛ واجب الادا رقم اپ ڈیٹ ہو گئی۔ | له {name} څخه د {amount} پېرود ثبت شو. موجودي زیاته شوه؛ د ورکړې وړ تازه شو. |
| `sup.purchase.tax` | Tax | ٹیکس | مالیه |
| `sup.purchase.title` | Record purchase | خریداری درج کریں | پېرود ثبت کړئ |
| `sup.purchase.total` | Purchase total | خریداری کل | د پېرود ټول |
| `sup.purchase.unitCost` | Unit cost | فی یونٹ قیمت | د واحد لګښت |
| `sup.receiveAgainstPo` | Receive against a purchase order | پرچیز آرڈر کے تحت مال وصول کریں | د پېرود امر په وړاندې ترلاسه کړئ |
| `sup.searchAria` | Search suppliers | سپلائر تلاش کریں | عرضه کوونکي ولټوئ |
| `sup.searchPlaceholder` | Search name, company or phone… | نام، کمپنی یا فون نمبر تلاش کریں… | نوم، شرکت یا تلیفون ولټوئ… |
| `sup.subtitle` | Everyone you buy stock from — what you purchased, what you paid, and what is still payable to each supplier. | وہ سب لوگ جن سے آپ اسٹاک خریدتے ہیں — آپ نے کیا خریدا، کیا ادا کیا، اور ہر سپلائر کو کتنا دینا باقی ہے۔ | هر هغه څوک چې تاسو ترې موجودي پېرئ — تاسو څه پېرودل، څه مو ورکړل، او هر عرضه کوونکي ته څومره پاتې دي. |
| `sup.th.actions` | Actions | کارروائی | کړنې |
| `sup.th.balance` | Balance | بیلنس | پاتې |
| `sup.th.paid` | Paid | ادا شدہ | ورکړل شوي |
| `sup.th.phone` | Phone | فون | تلیفون |
| `sup.th.purchased` | Purchased | خریداری | پېرودل شوي |
| `sup.th.supplier` | Supplier | سپلائر | عرضه کوونکی |
| `sup.title` | Suppliers | سپلائرز | عرضه کوونکي |
## wh

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `nav.warehouses` | Warehouses | گودام | ګودامونه |
| `wh.add` | Add warehouse | گودام شامل کریں | ګودام زیات کړئ |
| `wh.archive` | Archive | محفوظ کریں | ارشیف کړئ |
| `wh.archivedBadge` | Archived | محفوظ شدہ | ارشیف شوی |
| `wh.cannotArchiveDefault` | The default warehouse cannot be archived — make another warehouse the default first. | طے شدہ گودام محفوظ نہیں ہو سکتا — پہلے کسی اور گودام کو طے شدہ بنائیں۔ | ډیفالټ ګودام نشي ارشیف کېدای — لومړی بل ګودام ډیفالټ کړئ. |
| `wh.col.available` | Available | دستیاب | شته |
| `wh.col.onHand` | On hand | موجود | په لاس کې |
| `wh.col.product` | Product | پروڈکٹ | توکی |
| `wh.col.promised` | Promised | وعدہ شدہ | وعده شوی |
| `wh.col.value` | Value | مالیت | ارزښت |
| `wh.defaultBadge` | Default | طے شدہ | ډیفالټ |
| `wh.drift.body` | {count} product(s) have warehouse quantities that no longer add up to their totals — this happens when an older version of the app recorded stock without locations. Your totals and accounts are correct; only the split needs repair. | {count} پروڈکٹ کی گودام وار مقدار ان کے کُل سے نہیں ملتی — ایسا تب ہوتا ہے جب ایپ کے پرانے ورژن نے مقام کے بغیر اسٹاک درج کیا ہو۔ آپ کے کُل اور کھاتے درست ہیں؛ صرف تقسیم کی مرمت درکار ہے۔ | {count} توکي د ګودام مقدارونه لري چې نور د دوی له ټولټال سره نه جمع کېږي — دا هغه وخت کېږي کله چې د ایپ زاړه نسخې له ځایونو پرته زېرمه ثبت کړې وي. ستاسو ټولټال او حسابونه سم دي؛ یوازې وېش ترمیم ته اړتیا لري. |
| `wh.drift.done` | Recount complete — {count} product(s) repaired. No accounts were touched. | دوبارہ گنتی مکمل — {count} پروڈکٹ کی مرمت ہو گئی۔ کسی کھاتے کو نہیں چھیڑا گیا۔ | بیا شمېرنه بشپړه شوه — {count} توکي ترمیم شول. هېڅ حسابونه لمس نشول. |
| `wh.drift.item` | {name}: locations add up to {rows}, total is {total} | {name}: مقامات کا مجموعہ {rows}، کُل {total} ہے | {name}: ځایونه {rows} ته جمع کېږي، ټولټال {total} دی |
| `wh.drift.recount` | Recount locations | مقامات کی دوبارہ گنتی | ځایونه بیا وشمېرئ |
| `wh.drift.title` | Location split needs a recount | مقامات کی تقسیم کو دوبارہ گنتی درکار ہے | د ځای وېش بیا شمېرنې ته اړتیا لري |
| `wh.edit` | Edit | ترمیم | سمون |
| `wh.empty` | No warehouses yet. Add one to split your stock by location. | ابھی کوئی گودام نہیں۔ اسٹاک کو مقامات کے حساب سے بانٹنے کے لیے ایک شامل کریں۔ | لا تر اوسه ګودامونه نشته. د ځای له مخې د خپلې زېرمې وېشلو لپاره یو زیات کړئ. |
| `wh.err.nameRequired` | Give the warehouse a name. | گودام کا نام لکھیں۔ | ګودام ته نوم ورکړئ. |
| `wh.eyebrow` | Stock locations | اسٹاک کے مقامات | د زېرمې ځایونه |
| `wh.form.addTitle` | New warehouse | نیا گودام | نوی ګودام |
| `wh.form.editTitle` | Edit warehouse | گودام میں ترمیم | ګودام سمول |
| `wh.form.name` | Name | نام | نوم |
| `wh.form.namePh` | e.g. Godown — Shahdara | مثلاً گودام — شاہدرہ | لکه ګودام — شهدارا |
| `wh.form.note` | Note (address / keeper) | نوٹ (پتہ / نگران) | یادښت (پته / ساتونکی) |
| `wh.form.notePh` | Optional | اختیاری | اختیاري |
| `wh.makeDefault` | Make default | طے شدہ بنائیں | ډیفالټ کړئ |
| `wh.notice.archived` | Warehouse archived. Its stock history stays readable. | گودام محفوظ ہو گیا۔ اس کے اسٹاک کی تاریخ پڑھی جا سکے گی۔ | ګودام ارشیف شو. د هغه د زېرمې تاریخ د لوستلو وړ پاتې کېږي. |
| `wh.notice.created` | Warehouse “{name}” added. | گودام ”{name}“ شامل ہو گیا۔ | ګودام “{name}” زیات شو. |
| `wh.notice.defaultSet` | “{name}” is now the default warehouse. | ”{name}“ اب طے شدہ گودام ہے۔ | “{name}” اوس ډیفالټ ګودام دی. |
| `wh.notice.unarchived` | Warehouse restored. | گودام بحال ہو گیا۔ | ګودام بېرته راوستل شو. |
| `wh.notice.updated` | Warehouse updated. | گودام اپ ڈیٹ ہو گیا۔ | ګودام تازه شو. |
| `wh.pickerDefaultSuffix` | (default) | (طے شدہ) | (ډیفالټ) |
| `wh.pickerLabel` | Warehouse | گودام | ګودام |
| `wh.pickerNone` | Default warehouse | طے شدہ گودام | ډیفالټ ګودام |
| `wh.pickerUseDefault` | Shop default | دکان کا طے شدہ | د هټۍ ډیفالټ |
| `wh.rowQty` | {qty} {unit} here | یہاں {qty} {unit} | {qty} {unit} دلته |
| `wh.stockEmpty` | Nothing is stocked at this warehouse yet. | اس گودام میں ابھی کوئی اسٹاک نہیں۔ | لا تر اوسه په دې ګودام کې هیڅ نه دی زېرمه شوی. |
| `wh.stockTitle` | Stock by warehouse | گودام کے حساب سے اسٹاک | د ګودام له مخې زېرمه |
| `wh.subtitle` | The places your stock sits. Every product's total is split across these warehouses; sales, purchases and adjustments each record the warehouse they touched. Stock value is always at the product's one cost price — a warehouse is a place, not a separate business. | وہ جگہیں جہاں آپ کا اسٹاک پڑا ہے۔ ہر پروڈکٹ کی کل مقدار انہی گوداموں میں بٹی ہوئی ہے؛ فروخت، خرید اور ایڈجسٹمنٹ — ہر ایک اپنے گودام کے ساتھ درج ہوتی ہے۔ اسٹاک کی قیمت ہمیشہ پروڈکٹ کی ایک ہی لاگت پر گنی جاتی ہے — گودام ایک جگہ ہے، الگ کاروبار نہیں۔ | هغه ځایونه چې ستاسو زېرمه پکې پرته ده. د هر توکي ټولټال په دې ګودامونو وېشل شوی دی؛ پلور، پېرود او سمونونه هر یو هغه ګودام ثبتوي چې دوی لمس کړی. د زېرمې ارزښت تل د توکي په یوه لګښت بیه وي — ګودام یو ځای دی، جلا سوداګري نه ده. |
| `wh.title` | Warehouses | گودام | ګودامونه |
| `wh.totalRow` | All warehouses | تمام گودام | ټول ګودامونه |
| `wh.unarchive` | Restore | بحال کریں | بېرته راوستل |
| `wh.unitsHere` | {qty} units | {qty} یونٹ | {qty} واحدونه |
| `wh.valueHere` | Stock value {amount} | اسٹاک مالیت {amount} | د زېرمې ارزښت {amount} |
## tr

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `nav.stockTransfers` | Stock Transfers | اسٹاک منتقلی | د زېرمې لېږدونه |
| `tr.action.cancelTransfer` | Cancel transfer | منتقلی منسوخ کریں | لېږد لغوه کړئ |
| `tr.action.closeShort` | Close with shortage | کمی کے ساتھ بند کریں | له کمښت سره وتړئ |
| `tr.action.delete` | Delete | حذف | ړنګ کړئ |
| `tr.action.dispatch` | Dispatch | روانہ کریں | ولېږئ |
| `tr.action.edit` | Edit | ترمیم | سمون |
| `tr.action.print` | Print | پرنٹ | چاپ کړئ |
| `tr.action.receive` | Receive goods | سامان وصول کریں | توکي ترلاسه کړئ |
| `tr.action.returnToSource` | Return to source | ماخذ کو واپس | سرچینې ته بېرته ورکړئ |
| `tr.add` | New transfer | نئی منتقلی | نوی لېږد |
| `tr.close.body` | These goods were sent but never arrived. Closing books them as a stock loss at today's cost — this is the one transfer action that posts to the accounts, and it cannot be undone. | یہ سامان بھیجا گیا تھا مگر کبھی پہنچا نہیں۔ بند کرنے سے یہ آج کی لاگت پر اسٹاک نقصان کے طور پر درج ہو جائے گا — یہ منتقلی کی وہ واحد کارروائی ہے جو کھاتوں میں درج ہوتی ہے، اور یہ واپس نہیں ہو سکتی۔ | دا توکي ولېږل شول خو هېڅکله ونه رسېدل. تړل یې د نن ورځې په بیه د زېرمې د زیان په توګه ثبتوي — دا د لېږد یوازینۍ کړنه ده چې په حسابونو کې ثبتېږي، او بېرته نه شي کېدای. |
| `tr.close.line` | {name} — {qty} short · {amount} | {name} — {qty} کم · {amount} | {name} — {qty} کم · {amount} |
| `tr.close.submit` | Close & book the loss | بند کریں اور نقصان درج کریں | وتړئ او زیان ثبت کړئ |
| `tr.close.title` | Close with shortage — {number} | کمی کے ساتھ بند کریں — {number} | له کمښت سره وتړئ — {number} |
| `tr.close.total` | Total loss | کل نقصان | ټول زیان |
| `tr.col.incoming` | Incoming | آنے والا | راتلونکی |
| `tr.col.items` | Items | اشیاء | توکي |
| `tr.col.number` | Transfer | منتقلی | لېږد |
| `tr.col.product` | Product | پروڈکٹ | توکی |
| `tr.col.received` | Received | وصول | ترلاسه شوی |
| `tr.col.remaining` | On the road | راستے میں | په لاره کې |
| `tr.col.route` | Route | راستہ | لار |
| `tr.col.sent` | Sent | بھیجا | لېږل شوی |
| `tr.col.status` | Status | حالت | حالت |
| `tr.empty` | No transfers yet. Create one to move stock from one warehouse to another. | ابھی کوئی منتقلی نہیں۔ ایک بنائیں اور اسٹاک ایک گودام سے دوسرے میں بھیجیں۔ | لا تر اوسه لېږدونه نشته. یو جوړ کړئ او زېرمه له یوه ګودامه بل ته ولېږدوئ. |
| `tr.err.archived` | An archived warehouse cannot send or receive new transfers. | آرکائیو شدہ گودام نئی منتقلی نہ بھیج سکتا ہے نہ وصول کر سکتا ہے۔ | ارشیف شوی ګودام نوي لېږدونه نه شي لېږلی او نه یې ترلاسه کولی شي. |
| `tr.err.overReceive` | A line cannot receive more than was sent. Check the quantities. | کسی لائن میں بھیجی گئی مقدار سے زیادہ وصول نہیں ہو سکتا۔ مقداریں جانچیں۔ | یوه کرښه له لېږل شوي څخه زیات نشي ترلاسه کولی. مقدارونه وګورئ. |
| `tr.err.route` | Both warehouses must exist — refresh and try again. | دونوں گودام موجود ہونے چاہئیں — تازہ کر کے دوبارہ کوشش کریں۔ | دواړه ګودامونه باید موجود وي — تازه کړئ او بیا هڅه وکړئ. |
| `tr.err.same` | Source and destination must be different warehouses. | ماخذ اور منزل الگ الگ گودام ہونے چاہئیں۔ | سرچینه او منزل باید بېل ګودامونه وي. |
| `tr.eyebrow` | Between warehouses | گوداموں کے درمیان | د ګودامونو ترمنځ |
| `tr.form.addTitle` | New stock transfer | نئی اسٹاک منتقلی | د زېرمې نوی لېږد |
| `tr.form.editTitle` | Edit stock transfer | اسٹاک منتقلی میں ترمیم | د زېرمې لېږد سمول |
| `tr.form.from` | From warehouse | کس گودام سے | له کوم ګودام څخه |
| `tr.form.note` | Note | نوٹ | یادښت |
| `tr.form.notePh` | Optional — vehicle, driver, reason… | اختیاری — گاڑی، ڈرائیور، وجہ… | اختیاري — موټر، چلوونکی، لامل… |
| `tr.form.to` | To warehouse | کس گودام کو | کوم ګودام ته |
| `tr.lines.atSource` | {qty} at source | ماخذ پر {qty} موجود | {qty} په سرچینه کې |
| `tr.lines.empty` | Add at least one product to move. | منتقل کرنے کے لیے کم از کم ایک پروڈکٹ شامل کریں۔ | د لېږدولو لپاره لږ تر لږه یو توکی زیات کړئ. |
| `tr.lines.noResults` | No product matches “{query}”. | “{query}” سے کوئی پروڈکٹ نہیں ملا۔ | هېڅ توکی له “{query}” سره سمون نه خوري. |
| `tr.lines.product` | Product | پروڈکٹ | توکی |
| `tr.lines.searchPh` | Search products — click or Enter to add… | پروڈکٹ تلاش کریں — کلک یا Enter سے شامل کریں… | توکي ولټوئ — د زیاتولو لپاره کلیک یا Enter… |
| `tr.notice.cancelled` | Transfer cancelled. | منتقلی منسوخ ہو گئی۔ | لېږد لغوه شو. |
| `tr.notice.closedShort` | {number} closed — a shortage of {amount} was booked as a stock loss. | {number} بند ہو گئی — {amount} کی کمی اسٹاک نقصان کے طور پر درج ہو گئی۔ | {number} وتړل شو — د {amount} کمښت د زېرمې د زیان په توګه ثبت شو. |
| `tr.notice.created` | Draft transfer created. | مسودہ منتقلی بن گئی۔ | مسوده لېږد جوړ شو. |
| `tr.notice.deleted` | Draft transfer deleted. | مسودہ منتقلی حذف ہو گئی۔ | مسوده لېږد ړنګ شو. |
| `tr.notice.dispatched` | {number} dispatched — the goods are on the road. | {number} روانہ ہو گئی — سامان راستے میں ہے۔ | {number} ولېږل شو — توکي په لاره کې دي. |
| `tr.notice.received` | Receipt recorded for {number}. | {number} کی وصولی درج ہو گئی۔ | د {number} رسید ثبت شو. |
| `tr.notice.receivedFull` | {number} fully received. | {number} مکمل وصول ہو گئی۔ | {number} په بشپړ ډول ترلاسه شو. |
| `tr.notice.returned` | {number} closed — what was still on the road went back to {name}. | {number} بند ہو گئی — جو راستے میں تھا وہ {name} واپس چلا گیا۔ | {number} وتړل شو — هغه څه چې لا په لاره کې وو {name} ته بېرته لاړل. |
| `tr.notice.updated` | Transfer updated. | منتقلی تازہ ہو گئی۔ | لېږد تازه شو. |
| `tr.print.dispatchedBy` | Dispatched by | روانہ کنندہ | لېږونکی |
| `tr.print.quantitiesNote` | Quantities only — a transfer moves stock between your own warehouses; no value changes hands. | صرف مقداریں — منتقلی آپ کے اپنے گوداموں کے درمیان اسٹاک حرکت دیتی ہے؛ کوئی قیمت ہاتھ نہیں بدلتی۔ | یوازې مقدارونه — لېږد ستاسو د خپلو ګودامونو ترمنځ زېرمه خوځوي؛ هېڅ ارزښت لاس نه بدلوي. |
| `tr.print.receivedBy` | Received by | وصول کنندہ | ترلاسه کوونکی |
| `tr.print.title` | Stock Transfer | اسٹاک منتقلی | د زېرمې لېږد |
| `tr.receive.fillAll` | Fill all remaining | تمام باقی درج کریں | ټول پاتې ډک کړئ |
| `tr.receive.help` | Enter what actually arrived this time. Anything left stays on the road and can be received later — or closed as a shortage. | اس بار جو واقعی پہنچا وہ درج کریں۔ جو باقی رہے گا وہ راستے میں رہے گا اور بعد میں وصول ہو سکے گا — یا کمی کے طور پر بند ہو سکے گا۔ | دا ځل په حقیقت کې څه راورسېدل ولیکئ. پاتې برخه په لاره کې پاتې کېږي او وروسته ترلاسه کېدای شي — یا د کمښت په توګه تړل کېدای شي. |
| `tr.receive.stillOut` | {qty} still on the road | {qty} ابھی راستے میں ہیں | {qty} لا په لاره کې دي |
| `tr.receive.submit` | Record receipt | وصولی درج کریں | رسید ثبت کړئ |
| `tr.receive.thisTime` | Arrived now | اس بار پہنچا | اوس راورسېدل |
| `tr.receive.title` | Receive goods — {number} | سامان وصول کریں — {number} | توکي ترلاسه کړئ — {number} |
| `tr.return.body` | The {qty} unit(s) still on the road go back onto the shelf at {name}. Goods already received stay where they are. | جو {qty} یونٹ ابھی راستے میں ہیں وہ {name} کی شیلف پر واپس چلے جائیں گے۔ جو وصول ہو چکا ہے وہ وہیں رہے گا۔ | هغه {qty} واحدونه چې لا په لاره کې دي په {name} کې بېرته المارۍ ته ځي. لا دمخه ترلاسه شوي توکي په خپل ځای پاتې کېږي. |
| `tr.return.submit` | Return to source | ماخذ کو واپس کریں | سرچینې ته بېرته ورکړئ |
| `tr.return.title` | Return to source — {number} | ماخذ کو واپس — {number} | سرچینې ته بېرته ورکړئ — {number} |
| `tr.status.cancelled` | Cancelled | منسوخ | لغوه شوی |
| `tr.status.dispatched` | Dispatched | روانہ | لېږل شوی |
| `tr.status.draft` | Draft | مسودہ | مسوده |
| `tr.status.partially_received` | Partially received | جزوی وصول | په جزوي ډول ترلاسه شوی |
| `tr.status.received` | Received | وصول شدہ | ترلاسه شوی |
| `tr.status.returned` | Returned to source | ماخذ کو واپس | سرچینې ته بېرته ورکړل شو |
| `tr.subtitle` | Move stock between your own warehouses. Dispatch takes the goods off the source shelf and puts them on the road; receiving lands them at the destination. A transfer moves no money — only a shortage proven at closing posts to the accounts, as a stock loss. | اپنے ہی گوداموں کے درمیان اسٹاک منتقل کریں۔ روانگی سامان کو ماخذ کی شیلف سے اتار کر راستے پر ڈال دیتی ہے؛ وصولی اسے منزل پر اتارتی ہے۔ منتقلی میں کوئی رقم نہیں چلتی — صرف اختتام پر ثابت شدہ کمی کھاتوں میں درج ہوتی ہے، بطور اسٹاک نقصان۔ | د خپلو ګودامونو ترمنځ زېرمه ولېږدوئ. لېږل توکي د سرچینې له المارۍ ښکته کوي او په لاره یې اچوي؛ ترلاسه کول یې په منزل کې ښکته کوي. لېږد هېڅ پیسې نه خوځوي — یوازې په تړلو کې ثابت شوی کمښت په حسابونو کې ثبتېږي، د زېرمې د زیان په توګه. |
| `tr.summary.inTransit` | {qty} units on the road | {qty} یونٹ راستے میں ہیں | {qty} واحدونه په لاره کې دي |
| `tr.summary.none` | Nothing on the road | راستے میں کچھ نہیں | په لاره کې هیڅ نشته |
| `tr.summary.open` | {count} open transfer(s) | {count} کھلی منتقلیاں | {count} پرانیستی لېږدونه |
| `tr.title` | Stock Transfers | اسٹاک منتقلی | د زېرمې لېږدونه |
## mfg

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `mfg.activeBadge` | Active | فعال | فعال |
| `mfg.addFor` | Add recipe | ترکیب شامل کریں | ترکیب زیات کړئ |
| `mfg.batchCost` | Batch cost | بیچ کی لاگت | د بیچ لګښت |
| `mfg.close.confirm` | Close this order? The remaining in-progress value of {amount} will be written off to loss. | یہ آرڈر بند کریں؟ زیرِ تکمیل باقی مالیت {amount} نقصان میں لکھ دی جائے گی۔ | دا امر وتړئ؟ پاتې روان ارزښت {amount} به زیان ته له منځه یوړل شي. |
| `mfg.close.confirmEmpty` | Close this order? Nothing remains in progress for it. | یہ آرڈر بند کریں؟ اس کے لیے زیرِ تکمیل کچھ باقی نہیں۔ | دا امر وتړئ؟ د دې لپاره په روان کې هیڅ نه پاتې کېږي. |
| `mfg.close.submit` | Confirm close | تصدیق کے ساتھ بند کریں | تړل تایید کړئ |
| `mfg.complete.final` | Final completion — absorb the whole remaining cost pool | حتمی تکمیل — باقی تمام لاگت جذب کر لیں | وروستۍ بشپړتیا — ټول پاتې لګښت حوض جذب کړئ |
| `mfg.complete.qty` | Finished units completed | مکمل تیار یونٹ | بشپړ شوي واحدونه بشپړ شول |
| `mfg.complete.submit` | Record completion | تکمیل درج کریں | بشپړتیا ثبت کړئ |
| `mfg.complete.title` | Record completion — {name} | تکمیل درج کریں — {name} | بشپړتیا ثبت کړئ — {name} |
| `mfg.complete.unitCost` | Cost per finished unit | فی تیار یونٹ لاگت | د بشپړ شوي واحد لګښت |
| `mfg.complete.value` | Value into finished stock | تیار اسٹاک میں منتقل مالیت | په بشپړې شوې موجودي کې ارزښت |
| `mfg.empty` | No recipes yet. Add one for a product you make — a repack, a blend, an assembly — and production can run against it. | ابھی کوئی ترکیب نہیں۔ جو پروڈکٹ آپ بناتے ہیں — ری پیک، آمیزہ، اسمبلی — اس کی ترکیب شامل کریں، پھر پیداوار اسی کے مطابق چلے گی۔ | لا ترکیبونه نشته. د هغه توکي لپاره یو زیات کړئ چې تاسو یې جوړوئ — بیا بسته کول، یو مخلوط، یو راټولول — او تولید یې پر وړاندې چلېدلی شي. |
| `mfg.err.badBatch` | Batch size must be above zero and costs cannot be negative. | بیچ سائز صفر سے زیادہ ہو اور لاگت منفی نہیں ہو سکتی۔ | د بیچ اندازه باید له صفر څخه زیاته وي او لګښتونه منفي نه شي کېدلی. |
| `mfg.err.badQty` | Every component needs a quantity above zero. | ہر جز کی مقدار صفر سے زیادہ ہونی چاہیے۔ | هره برخه له صفر څخه زیات مقدار ته اړتیا لري. |
| `mfg.err.emptyLines` | Add at least one component. | کم از کم ایک جز شامل کریں۔ | لږ تر لږه یوه برخه زیاته کړئ. |
| `mfg.err.generic` | This recipe could not be saved. | یہ ترکیب محفوظ نہیں ہو سکی۔ | دا ترکیب ونه خوندي شو. |
| `mfg.err.outputRaw` | A raw material cannot be a recipe's finished product. | خام مال کسی ترکیب کی تیار پروڈکٹ نہیں ہو سکتی۔ | خام توکی د ترکیب بشپړ شوی توکی نه شي کېدلی. |
| `mfg.err.outputRequired` | Choose the finished product first. | پہلے تیار پروڈکٹ منتخب کریں۔ | لومړی بشپړ شوی توکی وټاکئ. |
| `mfg.err.selfComponent` | A product cannot be its own component. | کوئی پروڈکٹ خود اپنا جز نہیں ہو سکتی۔ | یو توکی خپله برخه نه شي کېدلی. |
| `mfg.ev.accrued` | Accrued (salaries payable) | ادھار (واجب الادا تنخواہیں) | پور شو (د معاشونو د ورکړې وړ) |
| `mfg.ev.closeout` | Close-out write-off | اختتامی نقصان | د تړلو له منځه وړل |
| `mfg.ev.completion` | Completed | تکمیل | بشپړ شو |
| `mfg.ev.issue` | Materials issued | خام مال جاری ہوا | توکي ورکړل شول |
| `mfg.ev.labour` | Labour | مزدوری | مزدوري |
| `mfg.ev.overhead` | Overhead | دیگر خرچ | اضافي لګښت |
| `mfg.ev.paidFrom` | Paid from {name} | {name} سے ادا شدہ | له {name} څخه ورکړل شو |
| `mfg.ev.scrap` | Scrap | خرابی | ضایعات |
| `mfg.eyebrow` | Production | پیداوار | تولید |
| `mfg.form.addComponent` | Add component | جز شامل کریں | برخه زیاته کړئ |
| `mfg.form.batchSize` | Batch size (finished units) | بیچ سائز (تیار یونٹ) | د بیچ اندازه (بشپړ شوي واحدونه) |
| `mfg.form.componentPh` | Choose a component | جز منتخب کریں | برخه وټاکئ |
| `mfg.form.components` | Components per batch | اجزاء فی بیچ | په هر بیچ کې برخې |
| `mfg.form.labour` | Labour per batch | مزدوری فی بیچ | په هر بیچ کې مزدوري |
| `mfg.form.newTitle` | New recipe | نئی ترکیب | نوی ترکیب |
| `mfg.form.noResults` | No product matches "{query}". | "{query}" سے کوئی پروڈکٹ نہیں ملی۔ | هیڅ توکی له "{query}" سره نه سمون خوري. |
| `mfg.form.note` | Note | نوٹ | یادښت |
| `mfg.form.notePh` | Optional | اختیاری | اختیاري |
| `mfg.form.output` | Finished product | تیار پروڈکٹ | بشپړ شوی توکی |
| `mfg.form.outputPh` | Choose a product | پروڈکٹ منتخب کریں | توکی وټاکئ |
| `mfg.form.overhead` | Overhead per batch | دیگر خرچ فی بیچ | په هر بیچ کې اضافي لګښت |
| `mfg.form.qty` | Qty | مقدار | مقدار |
| `mfg.form.removeLine` | Remove {name} | {name} ہٹائیں | {name} لرې کړئ |
| `mfg.form.save` | Save recipe | ترکیب محفوظ کریں | ترکیب خوندي کړئ |
| `mfg.form.saveVersion` | Save as new version | بطور نیا ورژن محفوظ کریں | د نوې نسخې په توګه خوندي کړئ |
| `mfg.form.versionTitle` | New version — {name} | نیا ورژن — {name} | نوې نسخه — {name} |
| `mfg.history` | Version history | ورژن کی تاریخ | د نسخې تاریخ |
| `mfg.immutableNote` | A recipe is never edited in place. Saving a change creates a new version and the old version stays readable forever, so a production order always shows the exact recipe its costs came from. | ترکیب کبھی اپنی جگہ تبدیل نہیں ہوتی۔ تبدیلی محفوظ کرنے سے نیا ورژن بنتا ہے اور پرانا ورژن ہمیشہ قابلِ مطالعہ رہتا ہے، تاکہ ہر پروڈکشن آرڈر ہمیشہ وہی ترکیب دکھائے جس سے اس کی لاگت آئی تھی۔ | یو ترکیب هیڅکله په ځای کې نه سمونېږي. د بدلون خوندي کول نوې نسخه جوړوي او زړه نسخه د تل لپاره لوستل کېږي، نو د تولید امر تل هغه دقیق ترکیب ښيي چې لګښتونه ترې راغلي دي. |
| `mfg.issue.account` | Paid from account | ادائیگی کا اکاؤنٹ | له حساب څخه ورکړل شو |
| `mfg.issue.accrue` | Accrue — owe it (salaries payable) | ادھار رکھیں — تنخواہوں میں واجب الادا | پور کړئ — پور یې کړئ (د معاشونو د ورکړې وړ) |
| `mfg.issue.atWarehouse` | At this warehouse: {qty} {unit} | اس گودام میں: {qty} {unit} | په دې ګودام کې: {qty} {unit} |
| `mfg.issue.components` | Components for this run | اس رن کے اجزاء | د دې چلولو لپاره برخې |
| `mfg.issue.labour` | Labour for this run | اس رن کی مزدوری | د دې چلولو لپاره مزدوري |
| `mfg.issue.makeDefault` | Remember this settlement as my default | اس ادائیگی کو میری مستقل پسند رکھیں | دا تصفیه زما د ډیفالټ په توګه په یاد ولرئ |
| `mfg.issue.materialsValue` | Materials value | اجزاء کی مالیت | د توکو ارزښت |
| `mfg.issue.overhead` | Overhead for this run | اس رن کا دیگر خرچ | د دې چلولو لپاره اضافي لګښت |
| `mfg.issue.paidNow` | Paid now from an account | ابھی اکاؤنٹ سے ادا کریں | اوس له حساب څخه ورکړل شو |
| `mfg.issue.runQty` | Run size (finished units intended) | رن کا سائز (تیار یونٹ مطلوب) | د چلولو اندازه (بشپړ شوي واحدونه موخه) |
| `mfg.issue.settlement` | Labour & overhead settlement | مزدوری و دیگر خرچ کی ادائیگی | د مزدورۍ او اضافي لګښت تصفیه |
| `mfg.issue.submit` | Issue materials | خام مال جاری کریں | توکي ورکړئ |
| `mfg.issue.title` | Issue materials — {name} | خام مال جاری کریں — {name} | توکي ورکړئ — {name} |
| `mfg.issue.totalValue` | Total into work-in-progress | زیرِ تکمیل میں کل منتقلی | روان کار ته ټول |
| `mfg.materialsCost` | Materials | اجزاء | توکي |
| `mfg.newRecipe` | New recipe | نئی ترکیب | نوی ترکیب |
| `mfg.newVersion` | New version | نیا ورژن | نوې نسخه |
| `mfg.noRecipe` | No recipe yet | ابھی ترکیب نہیں | لا ترکیب نشته |
| `mfg.perBatchSuffix` | per batch | فی بیچ | په هر بیچ کې |
| `mfg.po.cancel` | Cancel order | آرڈر منسوخ کریں | امر لغوه کړئ |
| `mfg.po.close` | Close order | آرڈر بند کریں | امر وتړئ |
| `mfg.po.complete` | Record completion | تکمیل درج کریں | بشپړتیا ثبت کړئ |
| `mfg.po.completedTotal` | Absorbed into finished stock | تیار اسٹاک میں جذب شدہ | په بشپړې شوې موجودي کې جذب شوی |
| `mfg.po.delete` | Delete draft | مسودہ حذف کریں | مسوده ړنګه کړئ |
| `mfg.po.draftLabel` | Draft | مسودہ | مسوده |
| `mfg.po.edit` | Edit draft | مسودہ بدلیں | مسوده سم کړئ |
| `mfg.po.empty` | No production orders yet. Create one from a recipe to start making a product. | ابھی کوئی پروڈکشن آرڈر نہیں۔ کسی ترکیب سے آرڈر بنائیں اور پروڈکٹ بنانا شروع کریں۔ | لا د تولید امرونه نشته. د توکي جوړولو پیل کولو لپاره له ترکیب څخه یو جوړ کړئ. |
| `mfg.po.err.badQty` | Quantities must be above zero. | مقدار صفر سے زیادہ ہونی چاہیے۔ | مقدارونه باید له صفر څخه زیات وي. |
| `mfg.po.err.emptyPool` | Nothing is in progress for this order — issue materials first. | اس آرڈر کے لیے زیرِ تکمیل کچھ نہیں — پہلے خام مال جاری کریں۔ | دې امر لپاره په روان کې هیڅ نشته — لومړی توکي ورکړئ. |
| `mfg.po.err.generic` | This production action could not be saved. | یہ پیداواری عمل محفوظ نہیں ہو سکا۔ | دا د تولید کړنه ونه خوندي شوه. |
| `mfg.po.err.insufficient` | Not enough {name} at the order's warehouse. | آرڈر کے گودام میں {name} کافی نہیں۔ | د امر په ګودام کې {name} کافي نشته. |
| `mfg.po.err.noAccount` | No money account is available for the payment. | ادائیگی کے لیے کوئی رقم اکاؤنٹ دستیاب نہیں۔ | د تادیې لپاره د پیسو حساب شتون نه لري. |
| `mfg.po.err.notOpen` | This order is closed to further events. | یہ آرڈر مزید واقعات کے لیے بند ہے۔ | دا امر د نورو پېښو لپاره تړل شوی دی. |
| `mfg.po.err.outputGone` | The finished product no longer exists. | تیار پروڈکٹ اب موجود نہیں۔ | بشپړ شوی توکی نور شتون نه لري. |
| `mfg.po.err.zeroValue` | This issue would move no value — give the run materials or conversion costs. | اس اجراء سے کوئی مالیت منتقل نہیں ہوتی — رن کو اجزاء یا تبدیلی لاگت دیں۔ | دا ورکول به هیڅ ارزښت ونه خوځوي — چلولو ته توکي یا د بدلون لګښتونه ورکړئ. |
| `mfg.po.events` | Production record | پیداوار کا ریکارڈ | د تولید ریکارډ |
| `mfg.po.form.editTitle` | Edit draft — {name} | مسودہ بدلیں — {name} | مسوده سم کړئ — {name} |
| `mfg.po.form.plannedQty` | Planned quantity (finished units) | منصوبہ شدہ مقدار (تیار یونٹ) | پلان شوی مقدار (بشپړ شوي واحدونه) |
| `mfg.po.form.recipe` | Recipe (finished product) | ترکیب (تیار پروڈکٹ) | ترکیب (بشپړ شوی توکی) |
| `mfg.po.form.recipePh` | Choose a recipe | ترکیب منتخب کریں | ترکیب وټاکئ |
| `mfg.po.form.save` | Create order | آرڈر بنائیں | امر جوړ کړئ |
| `mfg.po.form.saveEdit` | Save changes | تبدیلیاں محفوظ کریں | بدلونونه خوندي کړئ |
| `mfg.po.form.title` | New production order | نیا پروڈکشن آرڈر | د تولید نوی امر |
| `mfg.po.issue` | Issue materials | خام مال جاری کریں | توکي ورکړئ |
| `mfg.po.issuedTotal` | Issued into production | پیداوار میں جاری شدہ | تولید ته ورکړل شوی |
| `mfg.po.new` | New production order | نیا پروڈکشن آرڈر | د تولید نوی امر |
| `mfg.po.noEvents` | No production events yet. | ابھی کوئی پیداواری واقعہ نہیں۔ | لا د تولید پېښې نشته. |
| `mfg.po.open` | Open order | آرڈر کھولیں | امر پرانیزئ |
| `mfg.po.planned` | Planned | منصوبہ شدہ | پلان شوی |
| `mfg.po.pool` | In progress (WIP) | زیرِ تکمیل (WIP) | روان دی (WIP) |
| `mfg.po.print` | Print order | آرڈر چھاپیں | امر چاپ کړئ |
| `mfg.po.produced` | Produced | تیار شدہ | تولید شوی |
| `mfg.po.recipe` | Recipe | ترکیب | ترکیب |
| `mfg.po.remaining` | Remaining | باقی | پاتې |
| `mfg.po.scrap` | Record scrap | خرابی درج کریں | ضایعات ثبت کړئ |
| `mfg.po.snapshotNote` | Recipe snapshot — version {v}. Later recipe versions never change this order's costs. | ترکیب کا عکس — ورژن {v}۔ بعد کے ورژن اس آرڈر کی لاگت کبھی نہیں بدلتے۔ | د ترکیب عکس — نسخه {v}. وروستۍ نسخې هیڅکله د دې امر لګښتونه نه بدلوي. |
| `mfg.po.status.cancelled` | Cancelled | منسوخ | لغوه شو |
| `mfg.po.status.completed` | Completed | مکمل | بشپړ شو |
| `mfg.po.status.draft` | Draft | مسودہ | مسوده |
| `mfg.po.status.open` | Open | کھلا | پرانستی |
| `mfg.po.sub` | Run production against a recipe: issue materials into work-in-progress, land finished units at their absorbed cost, and write off what spoils. | کسی ترکیب کے مطابق پیداوار چلائیں: خام مال زیرِ تکمیل کام میں جاری کریں، تیار یونٹ ان کی جذب شدہ لاگت پر اتاریں، اور خراب ہونے والا حصہ نقصان میں لکھیں۔ | د ترکیب په وړاندې تولید وچلوئ: توکي په روان کار کې ورکړئ، بشپړ شوي واحدونه په جذب شوي لګښت کې کېږدئ، او هغه څه چې خرابېږي له منځه یوسئ. |
| `mfg.po.title` | Production orders | پروڈکشن آرڈرز | د تولید امرونه |
| `mfg.po.unitCostNow` | Cost per produced unit | فی تیار یونٹ لاگت | د تولید شوي واحد لګښت |
| `mfg.po.writtenOff` | Written off (scrap + close-out) | نقصان میں لکھا گیا (خراب + اختتامی) | له منځه وړل شوی (ضایعات + تړل) |
| `mfg.print.components` | Recipe (per batch) | ترکیب (فی بیچ) | ترکیب (په هر بیچ کې) |
| `mfg.print.events` | Production record | پیداوار کا ریکارڈ | د تولید ریکارډ |
| `mfg.print.planned` | Planned | منصوبہ شدہ | پلان شوی |
| `mfg.print.pool` | In progress | زیرِ تکمیل | روان دی |
| `mfg.print.produced` | Produced | تیار شدہ | تولید شوی |
| `mfg.print.title` | Production order | پروڈکشن آرڈر | د تولید امر |
| `mfg.raw.sub` | Products classed as raw material — their stock value sits in the Raw materials account and recipes consume them. Set a product's class in Inventory. | خام مال کی قسم والی پروڈکٹس — ان کی اسٹاک مالیت خام مال کے کھاتے میں رہتی ہے اور ترکیبیں انہیں استعمال کرتی ہیں۔ پروڈکٹ کی قسم انوینٹری میں مقرر کریں۔ | هغه توکي چې د خامو توکو په توګه طبقه بندي شوي دي — د دوی د موجودي ارزښت د خامو توکو په حساب کې ناست دی او ترکیبونه یې مصرفوي. د توکي طبقه په موجودي کې وټاکئ. |
| `mfg.raw.title` | Raw materials on the shelf | شیلف پر خام مال | په المارۍ کې خام توکي |
| `mfg.scrap.qty` | Units spoiled | خراب یونٹ | خراب شوي واحدونه |
| `mfg.scrap.submit` | Record scrap | خرابی درج کریں | ضایعات ثبت کړئ |
| `mfg.scrap.title` | Record scrap — {name} | خرابی درج کریں — {name} | ضایعات ثبت کړئ — {name} |
| `mfg.scrap.value` | Value written off | نقصان میں لکھی مالیت | له منځه وړل شوی ارزښت |
| `mfg.subtitle` | Recipes (BOMs) for the products you make: what one batch consumes, what it yields, and what a finished unit costs. Recipes never post anything — production does, when it runs. | آپ کی بنائی ہوئی پروڈکٹس کی ترکیبیں (BOM): ایک بیچ میں کیا لگتا ہے، کیا بنتا ہے، اور ایک تیار یونٹ کی لاگت کیا پڑتی ہے۔ ترکیب خود کچھ پوسٹ نہیں کرتی — پوسٹنگ پیداوار چلنے پر ہوتی ہے۔ | د هغو توکو لپاره ترکیبونه (BOMs) چې تاسو یې جوړوئ: یو بیچ څه مصرفوي، څه حاصلوي، او یو بشپړ شوی واحد څومره لګښت لري. ترکیبونه هیڅکله هیڅ نه ثبتوي — تولید یې کوي، کله چې وچلېږي. |
| `mfg.supersededBadge` | Superseded | پرانا ورژن | ځای ناستی شوی |
| `mfg.title` | Manufacturing | مینوفیکچرنگ | تولید |
| `mfg.unitCost` | Cost per finished unit | فی تیار یونٹ لاگت | د بشپړ شوي واحد لګښت |
| `mfg.version` | Version {v} | ورژن {v} | نسخه {v} |
| `mfg.yields` | Yields {qty} {unit} per batch | فی بیچ {qty} {unit} بنتے ہیں | په هر بیچ کې {qty} {unit} حاصلوي |
| `nav.manufacturing` | Manufacturing | مینوفیکچرنگ | تولید |
## jobs

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `job.act.advance` | Record advance | پیشگی درج کریں | پرمختګ ثبت کړئ |
| `job.act.bill` | Bill this job | اس جاب کا بل بنائیں | دې کار ته بل وکړئ |
| `job.act.cancel` | Cancel job | جاب منسوخ کریں | کار لغوه کړئ |
| `job.act.deliver` | Mark delivered | ترسیل شدہ لکھیں | سپارل شوی په نښه کړئ |
| `job.act.edit` | Edit job | جاب میں ترمیم | کار سم کړئ |
| `job.act.issue` | Issue materials | سامان جاری کریں | توکي ورکړئ |
| `job.act.labour` | Set labour | مزدوری درج کریں | مزدوري وټاکئ |
| `job.act.print` | Print work slip | ورک سلپ چھاپیں | د کار رسید چاپ کړئ |
| `job.act.return` | Return materials | سامان واپس کریں | توکي بېرته ورکړئ |
| `job.act.stage` | Move to stage | مرحلہ بدلیں | پړاو ته بوځئ |
| `job.adv.account` | Into account | اکاؤنٹ میں | په حساب کې |
| `job.adv.accountDefault` | Method's default account | طریقے کا طے شدہ اکاؤنٹ | د طریقې ډیفالټ حساب |
| `job.adv.amount` | Amount | رقم | مبلغ |
| `job.adv.done` | Advance of {amount} recorded for {number}. | {number} کے لیے {amount} پیشگی درج ہو گئی۔ | د {number} لپاره د {amount} پرمختګ ثبت شو. |
| `job.adv.errAmount` | Enter an amount greater than zero. | صفر سے زیادہ رقم درج کریں۔ | له صفر څخه زیات مبلغ ولیکئ. |
| `job.adv.errCheque` | Complete the cheque details first. | پہلے چیک کی تفصیل مکمل کریں۔ | لومړی د چک جزئیات بشپړ کړئ. |
| `job.adv.errFailed` | The advance could not be recorded. Nothing was written. | پیشگی درج نہیں ہو سکی۔ کچھ نہیں لکھا گیا۔ | پرمختګ ثبت نه شو. هیڅ شی نه دی لیکل شوی. |
| `job.adv.method` | Received by | وصولی کا طریقہ | ترلاسه شو له خوا |
| `job.adv.save` | Record advance | پیشگی درج کریں | پرمختګ ثبت کړئ |
| `job.adv.sub` | An advance is ordinary money in against this customer's future bill — it sits in the customer's pool and the job's bill absorbs it when posted. | پیشگی اس کسٹمر کے آئندہ بل کے خلاف عام رقم ہے — یہ کسٹمر کے کھاتے میں رہتی ہے اور بل بنتے ہی جاب کا بل اسے جذب کر لیتا ہے۔ | پرمختګ د دې پېرودونکي د راتلونکي بل په وړاندې عادي پیسې دي — دا د پېرودونکي په حوض کې ناست دی او د کار بل یې جذبوي کله چې ثبت شي. |
| `job.adv.title` | Record advance — {number} | پیشگی درج کریں — {number} | پرمختګ ثبت کړئ — {number} |
| `job.advances` | Advances | پیشگی رقمیں | پرمختګونه |
| `job.advanceTotal` | Advances received | موصولہ پیشگی | ترلاسه شوي پرمختګونه |
| `job.bill.materialsSub` | These goods already left the shelf and were charged to the job's cost — do not add them as bill lines again. | یہ سامان شیلف سے نکل چکا ہے اور جاب کی لاگت میں شامل ہے — اسے دوبارہ بل کی لائنوں میں نہ ڈالیں۔ | دا توکي لا دمخه له المارۍ څخه وتلي دي او د کار په لګښت کې اخیستل شوي دي — دوی بیا د بل کرښو په توګه مه زیاتوئ. |
| `job.bill.materialsTitle` | Materials already issued to {number} | {number} کو پہلے سے جاری شدہ سامان | {number} ته لا دمخه ورکړل شوي توکي |
| `job.billCogs` | Bill goods cost | بل کے سامان کی لاگت | د بل د توکو لګښت |
| `job.bills` | Bills | بل | بلونه |
| `job.confirm.cancel` | Cancel job {number}? | کیا جاب {number} منسوخ کر دی جائے؟ | کار {number} لغوه کړئ؟ |
| `job.confirm.deliver` | Mark {number} as delivered? | کیا {number} کو ترسیل شدہ لکھ دیا جائے؟ | {number} سپارل شوی په نښه کړئ؟ |
| `job.due` | Due | ترسیل کی تاریخ | ټاکل شوې نېټه |
| `job.empty` | No jobs yet. Take a customer's work order — the job is born with its number, ready to go on the customer's slip. | ابھی کوئی جاب نہیں۔ کسٹمر کا ورک آرڈر لیں — جاب اپنے نمبر کے ساتھ پیدا ہوتی ہے، کسٹمر کی پرچی پر لکھنے کے لیے تیار۔ | لا کارونه نشته. د پېرودونکي کاري امر واخلئ — کار په خپل شمېره سره زېږېږي، د پېرودونکي په رسید کې لیکلو ته چمتو. |
| `job.ev.issue` | Issued | جاری شدہ | ورکړل شو |
| `job.ev.return` | Returned | واپس شدہ | بېرته ورکړل شو |
| `job.eyebrow` | Workshop | ورکشاپ | ورکشاپ |
| `job.form.customer` | Customer | کسٹمر | پېرودونکی |
| `job.form.customerPh` | Choose a customer | کسٹمر منتخب کریں | پېرودونکی وټاکئ |
| `job.form.description` | Description | تفصیل | تفصیل |
| `job.form.due` | Due date | ترسیل کی تاریخ | ټاکل شوې نېټه |
| `job.form.editTitle` | Edit job — {number} | جاب میں ترمیم — {number} | کار سم کړئ — {number} |
| `job.form.errName` | The customer's name is required. | کسٹمر کا نام ضروری ہے۔ | د پېرودونکي نوم اړین دی. |
| `job.form.errSave` | The job could not be saved. Nothing was written. | جاب محفوظ نہیں ہو سکی۔ کچھ نہیں لکھا گیا۔ | کار ونه خوندي شو. هیڅ شی نه دی لیکل شوی. |
| `job.form.errTitle` | Give the job a title — the work, in a few words. | جاب کو ایک عنوان دیں — کام، چند الفاظ میں۔ | کار ته سرلیک ورکړئ — کار، په څو ټکو کې. |
| `job.form.errWarehouse` | That warehouse is no longer available. | وہ گودام اب دستیاب نہیں۔ | هغه ګودام نور شتون نه لري. |
| `job.form.labour` | Declared labour (for job profit) | درج مزدوری (جاب منافع کے لیے) | اعلان شوې مزدوري (د کار د ګټې لپاره) |
| `job.form.name` | Customer name | کسٹمر کا نام | د پېرودونکي نوم |
| `job.form.newTitle` | New job | نئی جاب | نوی کار |
| `job.form.note` | Note | نوٹ | یادښت |
| `job.form.phone` | Phone | فون | تلیفون |
| `job.form.save` | Create job | جاب بنائیں | کار جوړ کړئ |
| `job.form.saveEdit` | Save changes | تبدیلیاں محفوظ کریں | بدلونونه خوندي کړئ |
| `job.form.title` | Work title | کام کا عنوان | د کار سرلیک |
| `job.form.titlePh` | e.g. Wedding cards × 500 | مثلاً شادی کارڈ × 500 | د بېلګې په توګه د واده کارتونه × 500 |
| `job.form.warehouseLocked` | The warehouse is fixed once materials have been issued to the job. | سامان جاری ہونے کے بعد جاب کا گودام تبدیل نہیں ہوتا۔ | کله چې توکي کار ته ورکړل شي ګودام ټینګېږي. |
| `job.labour` | Labour | مزدوری | مزدوري |
| `job.mat.addLine` | Add product | پروڈکٹ شامل کریں | توکی زیات کړئ |
| `job.mat.available` | {qty} available here | یہاں {qty} دستیاب | {qty} دلته شته |
| `job.mat.err.bad_qty` | Quantities must be greater than zero. | مقدار صفر سے زیادہ ہونی چاہیے۔ | مقدارونه باید له صفر څخه زیات وي. |
| `job.mat.err.empty_lines` | Pick at least one product. | کم از کم ایک پروڈکٹ منتخب کریں۔ | لږ تر لږه یو توکی وټاکئ. |
| `job.mat.err.failed` | The materials could not be posted. Nothing was written. | سامان پوسٹ نہیں ہو سکا۔ کچھ نہیں لکھا گیا۔ | توکي ثبت نه شول. هیڅ شی نه دی لیکل شوی. |
| `job.mat.err.insufficient` | Not enough stock at the job's warehouse for {name}. | جاب کے گودام میں {name} کا اسٹاک کافی نہیں۔ | د کار په ګودام کې د {name} لپاره کافي موجودي نشته. |
| `job.mat.err.not_active` | This job is closed — materials no longer move on it. | یہ جاب بند ہے — اب اس پر سامان نہیں چلتا۔ | دا کار بند دی — توکي نور پرې نه خوځېږي. |
| `job.mat.err.over_return` | The job holds only {qty} of {name} to return. | جاب کے پاس واپسی کے لیے صرف {qty} {name} ہے۔ | کار یوازې {qty} د {name} څخه لري چې بېرته ورکړي. |
| `job.mat.err.unknown_product` | A picked product no longer exists. | منتخب پروڈکٹ اب موجود نہیں۔ | یو ټاکل شوی توکی نور شتون نه لري. |
| `job.mat.err.zero_value` | These materials carry no cost — there is nothing to post. | اس سامان کی کوئی لاگت نہیں — پوسٹ کرنے کو کچھ نہیں۔ | دا توکي هیڅ لګښت نه لري — د ثبتولو لپاره هیڅ نشته. |
| `job.mat.held` | {qty} with the job | جاب کے پاس {qty} | {qty} له کار سره |
| `job.mat.issueSave` | Issue materials | سامان جاری کریں | توکي ورکړئ |
| `job.mat.issueTitle` | Issue materials — {number} | سامان جاری کریں — {number} | توکي ورکړئ — {number} |
| `job.mat.product` | Product | پروڈکٹ | توکی |
| `job.mat.productPh` | Choose a product | پروڈکٹ منتخب کریں | توکی وټاکئ |
| `job.mat.qty` | Qty | مقدار | مقدار |
| `job.mat.removeLine` | Remove {name} | {name} ہٹائیں | {name} لرې کړئ |
| `job.mat.returnSave` | Return materials | سامان واپس کریں | توکي بېرته ورکړئ |
| `job.mat.returnTitle` | Return materials — {number} | سامان واپس کریں — {number} | توکي بېرته ورکړئ — {number} |
| `job.mat.value` | Value | مالیت | ارزښت |
| `job.materials` | Materials | سامان | توکي |
| `job.new` | New job | نئی جاب | نوی کار |
| `job.noAdvances` | No advances recorded for this job. | اس جاب پر کوئی پیشگی درج نہیں۔ | دې کار لپاره هیڅ پرمختګ نه دی ثبت شوی. |
| `job.noBills` | Not billed yet. | ابھی بل نہیں بنا۔ | لا بل نه دی شوی. |
| `job.noDue` | No due date | کوئی تاریخ مقرر نہیں | ټاکل شوې نېټه نشته |
| `job.noMaterials` | No materials issued yet. | ابھی کوئی سامان جاری نہیں ہوا۔ | لا هیڅ توکي نه دي ورکړل شوي. |
| `job.noResults` | No jobs match your search. | آپ کی تلاش سے کوئی جاب نہیں ملی۔ | ستاسو له لټون سره هیڅ کار نه سمون خوري. |
| `job.notice.cancelled` | {number} cancelled. | {number} منسوخ ہو گئی۔ | {number} لغوه شو. |
| `job.notice.created` | Job {number} created. | جاب {number} بن گئی۔ | کار {number} جوړ شو. |
| `job.notice.delivered` | {number} marked delivered. | {number} ترسیل شدہ لکھ دی گئی۔ | {number} سپارل شوی په نښه شو. |
| `job.notice.draftReady` | Billing job {number} — compose the charge lines. Materials already issued to this job are listed below and must not be billed again. | جاب {number} کا بل بن رہا ہے — چارج لائنیں ترتیب دیں۔ اس جاب کو پہلے سے جاری شدہ سامان نیچے درج ہے اور اسے دوبارہ بل میں نہیں ڈالنا۔ | د {number} کار ته بل کول — د لګښت کرښې ترتیب کړئ. دې کار ته لا دمخه ورکړل شوي توکي لاندې لېست شوي دي او باید بیا بل نه شي. |
| `job.notice.issued` | Materials issued to {number}. | {number} کو سامان جاری ہو گیا۔ | توکي {number} ته ورکړل شول. |
| `job.notice.returned` | Materials returned from {number}. | {number} سے سامان واپس آ گیا۔ | توکي له {number} څخه بېرته راغلل. |
| `job.notice.stage` | {number} moved to {stage}. | {number} مرحلہ {stage} پر چلی گئی۔ | {number} {stage} ته لاړ. |
| `job.notice.updated` | Job {number} updated. | جاب {number} تازہ ہو گئی۔ | کار {number} تازه شو. |
| `job.overdue` | Overdue | تاریخ گزر گئی | وخت تېر شوی |
| `job.print.customer` | Customer | کسٹمر | پېرودونکی |
| `job.print.due` | Due date | ترسیل کی تاریخ | ټاکل شوې نېټه |
| `job.print.issued` | Issued | جاری شدہ | ورکړل شوي |
| `job.print.labour` | Labour | مزدوری | مزدوري |
| `job.print.materials` | Materials issued | جاری شدہ سامان | ورکړل شوي توکي |
| `job.print.net` | Net materials | خالص سامان | خالص توکي |
| `job.print.noMaterials` | No materials issued. | کوئی سامان جاری نہیں ہوا۔ | هیڅ توکي نه دي ورکړل شوي. |
| `job.print.receivedBy` | Received by | وصول کنندہ | ترلاسه کوونکی |
| `job.print.returned` | Returned | واپس شدہ | بېرته ورکړل شوي |
| `job.print.stage` | Stage | مرحلہ | پړاو |
| `job.print.title` | Work slip | ورک سلپ | د کار رسید |
| `job.profit` | Job profit | جاب کا منافع | د کار ګټه |
| `job.revenue` | Billed | بل شدہ | بل شوی |
| `job.searchPh` | Search jobs… | جاب تلاش کریں… | کارونه ولټوئ… |
| `job.stage` | Stage | مرحلہ | پړاو |
| `job.stages.reset` | Use defaults | طے شدہ مراحل لیں | ډیفالټ وکاروئ |
| `job.stages.save` | Save stages | مراحل محفوظ کریں | پړاوونه خوندي کړئ |
| `job.stages.saved` | Job stages saved. | جاب کے مراحل محفوظ ہو گئے۔ | د کار پړاوونه خوندي شول. |
| `job.stages.sub` | The workshop stages a job moves through — one per line, in order. A new job starts at the first; reaching the last marks it Ready. Jobs keep the stage name they already carry if you rename the list. | ورکشاپ کے وہ مراحل جن سے جاب گزرتی ہے — ہر سطر میں ایک، اسی ترتیب میں۔ نئی جاب پہلے مرحلے سے شروع ہوتی ہے؛ آخری مرحلے پر پہنچنا اسے تیار لکھتا ہے۔ فہرست کے نام بدلنے سے جابوں پر موجود مرحلے کے نام نہیں بدلتے۔ | د ورکشاپ پړاوونه چې یو کار ترې تېرېږي — په هره کرښه کې یو، په ترتیب سره. نوی کار له لومړي څخه پیلېږي؛ وروستي ته رسېدل یې چمتو په نښه کوي. کارونه هغه پړاو نوم ساتي چې لا دمخه یې لري که تاسو لېست بدل کړئ. |
| `job.stages.title` | Job stages | جاب کے مراحل | د کار پړاوونه |
| `job.status.cancelled` | Cancelled | منسوخ | لغوه شو |
| `job.status.delivered` | Delivered | ترسیل شدہ | وسپارل شو |
| `job.status.in_progress` | In progress | جاری | روان دی |
| `job.status.open` | Open | کھلی | پرانستی |
| `job.status.ready` | Ready | تیار | چمتو |
| `job.subtitle` | Customer work orders — printing, binding, made-to-order work — tracked from receipt to delivery: materials issued to the job, advances held in the customer's pool, and the bill that settles it. | کسٹمر کے ورک آرڈر — چھپائی، جلد بندی، فرمائشی کام — وصولی سے ترسیل تک: جاب پر جاری شدہ سامان، کسٹمر کے کھاتے میں موجود پیشگی رقم، اور اسے نبٹانے والا بل۔ | د پېرودونکي کاري امرونه — چاپول، تړل، په امر جوړ شوی کار — له ترلاسه کولو څخه تر سپارلو پورې تعقیبېږي: کار ته ورکړل شوي توکي، د پېرودونکي په حوض کې نیول شوي پرمختګونه، او هغه بل چې دا تصفیه کوي. |
| `job.title` | Job Tracker | جاب ٹریکر | د کار تعقیبوونکی |
| `nav.jobs` | Jobs | جابز | کارونه |
## hr

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `att.cellAria` | {name}, day {day}: {mark} | {name}، دن {day}: {mark} | {name}, ورځ {day}: {mark} |
| `att.col.employee` | Employee | ملازم | کارکوونکی |
| `att.col.summary` | Summary | خلاصہ | لنډیز |
| `att.empty` | No active employees yet — add staff in the Directory tab and the register opens for them. | ابھی کوئی فعال ملازم نہیں — ڈائریکٹری ٹیب میں عملہ شامل کریں، رجسٹر ان کے لیے کھل جائے گا۔ | لا تر اوسه هېڅ فعال کارکوونکی نشته — په لارښود کې کارکوونکي زیات کړئ او راجستر به د هغوی لپاره پرانیستل شي. |
| `att.help` | Unmarked days stay blank: the register never assumes a day was worked. | بے نشان دن خالی رہتے ہیں: رجسٹر کبھی خود سے کسی دن کو کام کا دن نہیں مانتا۔ | بې نښې ورځې تشې پاتې کېږي: راجستر هېڅکله نه ګومان کوي چې یوه ورځ کار شوی و. |
| `att.legend` | Marks: P present · A absent · H half day · L leave · O weekly off. One tap cycles to the next mark; tapping an off day clears it back to unmarked. | نشانات: P حاضر · A غیر حاضر · H آدھا دن · L چھٹی · O ہفتہ وار چھٹی۔ ہر بار چھونے سے اگلا نشان آتا ہے؛ ہفتہ وار چھٹی والے دن کو چھونے سے نشان صاف ہو جاتا ہے۔ | نښې: P حاضر · A غیر حاضر · H نیمه ورځ · L رخصتي · O اونیزه رخصتي. یو ټک بلې نښې ته ځي؛ په رخصت ورځ ټک کول یې بې نښې ته پاکوي. |
| `att.mark.absent` | Absent | غیر حاضر | غیر حاضر |
| `att.mark.half` | Half day | آدھا دن | نیمه ورځ |
| `att.mark.leave` | Leave | چھٹی | رخصتي |
| `att.mark.none` | Unmarked | نشان نہیں | بې نښې |
| `att.mark.off` | Weekly off | ہفتہ وار چھٹی | اونیزه رخصتي |
| `att.mark.present` | Present | حاضر | حاضر |
| `att.nextMonth` | Next month | اگلا مہینہ | راتلونکې میاشت |
| `att.postedWarning` | A payroll run for this month is already posted. Editing these marks changes no posted slip — it would only change a re-run, which the payroll reversal flow governs. | اس مہینے کا تنخواہ رن پہلے ہی درج ہو چکا ہے۔ ان نشانات کی تبدیلی کسی درج شدہ پرچی کو نہیں بدلتی — یہ صرف دوبارہ رن کو بدلے گی، جو تنخواہ کے ریورسل طریقے کے تابع ہے۔ | د دې میاشتې لپاره معاش لا دمخه ثبت شوی دی. د دې نښو بدلول هېڅ ثبت شوی رسید نه بدلوي — یوازې بیا چل بدلولی شي، کوم چې د معاش د بېرته اړولو بهیر یې سمبالوي. |
| `att.prevMonth` | Previous month | پچھلا مہینہ | تېره میاشت |
| `att.short.absent` | A | A | A |
| `att.short.half` | H | H | H |
| `att.short.leave` | L | L | L |
| `att.short.off` | O | O | O |
| `att.short.present` | P | P | P |
| `att.subtitle` | Tap a day to cycle its mark. The register records time only — it never posts money; payroll reads it when a run is composed. | کسی دن کو چھوئیں تو اس کا نشان بدل جائے گا۔ رجسٹر صرف وقت درج کرتا ہے — کبھی رقم درج نہیں کرتا؛ تنخواہ رن بنتے وقت اسی کو پڑھتی ہے۔ | په یوه ورځ ټک وکړئ تر څو یې نښه بدله شي. راجستر یوازې وخت ثبتوي — هېڅکله پیسې نه ثبتوي؛ معاش یې هغه وخت لولي چې یو چل چمتو کېږي. |
| `att.summary` | P {present} · A {absent} · H {half} · L {leave} | P {present} · A {absent} · H {half} · L {leave} | P {present} · A {absent} · H {half} · L {leave} |
| `att.title` | Attendance register | حاضری رجسٹر | د حاضرۍ راجستر |
| `nav.staff` | Staff | عملہ | کارکوونکي |
| `pay.action.advance` | Give advance | پیشگی دیں | وړاندې تادیه ورکړئ |
| `pay.action.deleteDraft` | Delete draft | مسودہ حذف کریں | مسوده ړنګه کړئ |
| `pay.action.finalise` | Finalise & post | حتمی کریں اور درج کریں | وروستی کړئ او ثبت کړئ |
| `pay.action.open` | Open | کھولیں | پرانیزئ |
| `pay.action.pay` | Pay | ادائیگی | ورکړئ |
| `pay.action.reversePayment` | Reverse | واپس لیں | بېرته واړوئ |
| `pay.action.reverseRun` | Reverse run | رن واپس لیں | چل بېرته واړوئ |
| `pay.action.slip` | Slip | پرچی | رسید |
| `pay.advance.caption` | An advance is money ahead of earnings: it debits the employee's salary position, never an expense. It is recovered from future salary by derivation — the next run's slip shows the recovery. | پیشگی کمائی سے پہلے کی رقم ہے: یہ ملازم کی تنخواہ صورتحال کو ڈیبٹ کرتی ہے، خرچ کبھی نہیں بنتی۔ اس کی وصولی آئندہ تنخواہ سے خود بخود اخذ ہوتی ہے — اگلے رن کی پرچی وصولی دکھائے گی۔ | وړاندې تادیه له ګټلو مخکې پیسې دي: دا د کارکوونکي د معاش حالت ډیبټ کوي، هېڅکله لګښت نه. دا له راتلونکي معاش څخه د اخیستلو له لارې بېرته اخیستل کېږي — د راتلونکي چل رسید بېرته اخیستل ښيي. |
| `pay.advance.done` | Advance of {amount} given to {name}. | {name} کو {amount} پیشگی دی گئی۔ | {name} ته د {amount} وړاندې تادیه ورکړل شوه. |
| `pay.advance.errAmount` | Enter an advance amount above zero. | پیشگی کی رقم صفر سے زیادہ لکھیں۔ | د وړاندې تادیې مبلغ ولیکئ چې له صفر څخه ډېر وي. |
| `pay.advance.title` | Salary advance — {name} | تنخواہ پیشگی — {name} | د معاش وړاندې تادیه — {name} |
| `pay.back` | All runs | تمام رنز | ټول چلونه |
| `pay.bucket.caption` | Production orders accrued {amount} of labour and overhead to salaries payable without naming a person (the order, not the worker, was the record). Pay it here against any posted run; the ledger total falls the same either way. | پیداواری آرڈرز نے {amount} کی مزدوری اور بالائی خرچ کسی شخص کا نام لیے بغیر واجب الادا تنخواہوں میں جمع کیا تھا (ریکارڈ آرڈر تھا، مزدور نہیں)۔ کسی بھی درج شدہ رن کے ذریعے یہاں ادائیگی کریں؛ کھاتے کا مجموعہ دونوں صورتوں میں ایک جیسا گھٹتا ہے۔ | د تولید امرونو {amount} مزدوري او سر لګښت واجب معاشونو ته پرته له دې چې یو کس نومول شي استحقاق کړی (امر ریکارډ و، کارکوونکی نه). دلته یې د هر ثبت شوي چل په مقابل کې ورکړئ؛ د کھاتې ټول په هره توګه یو شان کمیږي. |
| `pay.bucket.title` | Production labour awaiting payment | ادائیگی کی منتظر پیداواری مزدوری | د تولید مزدوري چې تادیې ته په تمه ده |
| `pay.casualHint` | Casual day labour that is NOT on this directory is still paid from Expenses (salary category). A person on payroll must be paid through payroll, or their pay double-counts. | جو عارضی مزدور اس ڈائریکٹری میں نہیں، اس کی ادائیگی بدستور اخراجات سے (تنخواہ زمرہ) ہوتی ہے۔ جو شخص تنخواہ فہرست میں ہے، اس کی ادائیگی تنخواہ ہی سے ہو — ورنہ اس کی رقم دگنی گنی جائے گی۔ | هغه عارضي ورځني مزدوران چې په دې لارښود کې نه دي لا هم له لګښتونو څخه ورکول کېږي (د معاش کټګوري). یو کس چې په معاش کې دی باید د معاش له لارې ورکړل شي، ګني معاش یې دوه ځله شمېرل کېږي. |
| `pay.col.deductions` | Deductions | کٹوتیاں | کټونې |
| `pay.col.gross` | Gross | مجموعی | ټول |
| `pay.col.month` | Month | مہینہ | میاشت |
| `pay.col.net` | Net accrued | خالص مستحق | خالص استحقاق |
| `pay.col.paid` | Paid | ادا شدہ | ورکړل شوی |
| `pay.col.run` | Run | رن | چل |
| `pay.col.status` | Status | حیثیت | درجې |
| `pay.compose` | Compose run | رن بنائیں | چل جوړ کړئ |
| `pay.det.accrued` | Accrued (this run) | مستحق (اس رن) | استحقاق شوی (دا چل) |
| `pay.det.advanceBefore` | Advance before | سابقہ پیشگی | مخکې وړاندې تادیه |
| `pay.det.paid` | Paid (this run) | ادا شدہ (اس رن) | ورکړل شوی (دا چل) |
| `pay.det.recovered` | Advance recovered | وصول شدہ پیشگی | بېرته اخیستل شوې وړاندې تادیه |
| `pay.det.settled` | Settled | حساب صاف | برابر شوی |
| `pay.det.stillOwed` | Still owed | بقایا واجب | لا پاتې |
| `pay.detail.caption` | Accrued, advanced, paid and still owed — every figure derives from the journal and this run's payment events; nothing here is typed in. | مستحق، پیشگی، ادا شدہ اور بقایا واجب — ہر عدد جرنل اور اس رن کے ادائیگی واقعات سے اخذ ہوتا ہے؛ یہاں کچھ ہاتھ سے نہیں لکھا جاتا۔ | استحقاق شوی، وړاندې ورکړل شوی، ورکړل شوی او لا پاتې — هره شمېره له ژورنال او د دې چل له تادیې پېښو څخه اخیستل کېږي؛ دلته هېڅ په لاس نه لیکل کېږي. |
| `pay.draftLabel` | Draft (unnumbered) | مسودہ (بے نمبر) | مسوده (بې شمېرې) |
| `pay.editor.caption` | Lines were composed from the attendance register and each employee's current terms. Adjust allowances or add deductions — the figures you finalise are exactly what posts. Absence beyond paid leave is already inside the earned base. | یہ سطریں حاضری رجسٹر اور ہر ملازم کی موجودہ شرائط سے بنی ہیں۔ الاؤنس بدلیں یا کٹوتی شامل کریں — جو اعداد آپ حتمی کریں گے، عین وہی درج ہوں گے۔ تنخواہ سمیت چھٹی سے زائد غیر حاضری پہلے ہی کمایا ہوا بنیادی حصے میں شامل ہے۔ | کرښې د حاضرۍ راجستر او د هر کارکوونکي له اوسنيو شرایطو څخه جوړې شوې. اضافې سمې کړئ یا کټونې زیاتې کړئ — هغه شمېرې چې تاسو یې وروستۍ کوئ هماغه ثبتېږي. له معاش رخصتۍ هاخوا غیر حاضري لا دمخه په ګټل شوي بنسټ کې دننه ده. |
| `pay.editor.title` | Run for {month} | {month} کا رن | د {month} چل |
| `pay.empty.none` | No payroll runs yet. Compose the first run for a month — it starts as a draft and posts nothing until you finalise it. | ابھی کوئی تنخواہ رن نہیں۔ کسی مہینے کا پہلا رن بنائیں — یہ مسودے سے شروع ہوتا ہے اور حتمی ہونے تک کچھ درج نہیں کرتا۔ | لا تر اوسه هېڅ معاش چل نشته. د یوې میاشتې لپاره لومړی چل جوړ کړئ — دا د مسودې په توګه پیلېږي او تر وروستي کولو پورې هېڅ نه ثبتوي. |
| `pay.finalise.confirmBody` | This posts ONE journal entry: salary expense {net} against salaries payable, per employee at net. The run can afterwards only be corrected by reversing it. Payments are recorded separately as salaries are handed out. | اس سے جرنل میں ایک ہی اندراج درج ہوگا: تنخواہ خرچ {net} بمقابلہ واجب الادا تنخواہیں، فی ملازم خالص بنیاد پر۔ اس کے بعد رن کی درستگی صرف اسے واپس لے کر ہو سکتی ہے۔ ادائیگیاں تنخواہ دیتے وقت الگ سے درج ہوتی ہیں۔ | دا یو ژورنال ننوتنه ثبتوي: د معاش لګښت {net} د واجب معاشونو په مقابل کې، د هر کارکوونکي لپاره په خالص. چل له هغې وروسته یوازې په بېرته اړولو سره سمېدای شي. تادیې په جلا توګه ثبتېږي کله چې معاشونه ورکول کېږي. |
| `pay.finalise.confirmTitle` | Finalise {number}? | {number} حتمی کریں؟ | {number} وروستی کړئ؟ |
| `pay.finalise.nothing` | Nothing accrues in this run (every line nets to zero), so there is no entry to post. | اس رن میں کچھ مستحق نہیں بنتا (ہر سطر کا خالص صفر ہے)، اس لیے درج کرنے کے لیے کوئی اندراج نہیں۔ | په دې چل کې هېڅ نه استحقاقېږي (هره کرښه صفر ته رسیږي)، نو د ثبتولو لپاره هېڅ ننوتنه نشته. |
| `pay.finalise.postedMonth` | A posted run already covers {month}. Reverse it first if the month must be re-run — two accruals for one month would double the expense. | {month} کا ایک درج شدہ رن پہلے سے موجود ہے۔ مہینہ دوبارہ چلانا ہو تو پہلے اسے واپس لیں — ایک مہینے کے دو اندراج خرچ دگنا کر دیں گے۔ | یو ثبت شوی چل لا دمخه {month} پوښي. که میاشت باید بیا وچلول شي لومړی یې بېرته واړوئ — د یوې میاشتې لپاره دوه استحقاقونه لګښت دوه چنده کوي. |
| `pay.history.col.net` | Net accrued | خالص مستحق | خالص استحقاق |
| `pay.history.col.paid` | Paid | ادا شدہ | ورکړل شوی |
| `pay.history.col.run` | Run | رن | چل |
| `pay.history.empty` | No payroll runs cite this employee yet. | ابھی کوئی تنخواہ رن اس ملازم کا حوالہ نہیں دیتا۔ | لا تر اوسه هېڅ معاش چل دې کارکوونکي ته اشاره نه کوي. |
| `pay.history.title` | Salary history | تنخواہ کی تاریخ | د معاش تاریخ |
| `pay.line.addAllowance` | Add allowance | الاؤنس شامل کریں | اضافه زیاته کړئ |
| `pay.line.addDeduction` | Add deduction | کٹوتی شامل کریں | کټونه زیاته کړئ |
| `pay.line.allowances` | Allowances | الاؤنسز | اضافې |
| `pay.line.days` | P · A · H · L | ح · غ · آ · چ | P · A · H · L |
| `pay.line.deductions` | Deductions | کٹوتیاں | کټونې |
| `pay.line.earned` | Earned base | کمایا ہوا بنیاد | ګټل شوی بنسټ |
| `pay.line.employee` | Employee | ملازم | کارکوونکی |
| `pay.line.gross` | Gross | مجموعی | ټول |
| `pay.line.net` | Net | خالص | خالص |
| `pay.line.removeRow` | Remove line | سطر ہٹائیں | کرښه لرې کړئ |
| `pay.monthLabel` | Month | مہینہ | میاشت |
| `pay.noteLabel` | Run note | رن کا نوٹ | د چل یادښت |
| `pay.notePh` | Optional | اختیاری | اختیاري |
| `pay.notice.bucketPaid` | Paid {amount} against production labour. | پیداواری مزدوری کے خلاف {amount} ادا کیے گئے۔ | د تولید مزدورۍ په مقابل کې {amount} ورکړل شول. |
| `pay.notice.composed` | Draft run composed for {month}. | {month} کا مسودہ رن بن گیا۔ | د {month} لپاره مسوده چل جوړ شو. |
| `pay.notice.deleted` | Draft run deleted. | مسودہ رن حذف ہو گیا۔ | مسوده چل ړنګ شو. |
| `pay.notice.finalised` | {number} finalised — the accrual is in the journal. | {number} حتمی ہو گیا — اندراج جرنل میں درج ہے۔ | {number} وروستی شو — استحقاق په ژورنال کې دی. |
| `pay.notice.paid` | Paid {amount} to {name}. | {name} کو {amount} ادا کیے گئے۔ | {name} ته {amount} ورکړل شول. |
| `pay.notice.paymentReversed` | Payment reversed — the mirror entry is in the journal. | ادائیگی واپس ہو گئی — آئینہ اندراج جرنل میں درج ہے۔ | تادیه بېرته واړول شوه — هنداره ننوتنه په ژورنال کې ده. |
| `pay.notice.runReversed` | {number} reversed. The month can be re-run. | {number} واپس لیا گیا۔ مہینہ دوبارہ چل سکتا ہے۔ | {number} بېرته واړول شو. میاشت بیا چلول کېدای شي. |
| `pay.notice.saved` | Draft saved. | مسودہ محفوظ ہو گیا۔ | مسوده خوندي شوه. |
| `pay.pay.account` | From account | کس کھاتے سے | له کوم حساب څخه |
| `pay.pay.amount` | Amount (Rs) | رقم (روپے) | مبلغ (Rs) |
| `pay.pay.bucketRemaining` | Unassigned balance: {amount} | بے نام بقایا: {amount} | بې نومه پاتې: {amount} |
| `pay.pay.errAmount` | Enter an amount above zero and no more than what is still owed. | رقم صفر سے زیادہ اور بقایا واجب سے زیادہ نہ لکھیں۔ | یو مبلغ ولیکئ چې له صفر څخه ډېر وي او له هغه څه څخه ډېر نه وي چې لا پاتې دي. |
| `pay.pay.method` | Paid by | ادائیگی کا ذریعہ | ورکړل شو له خوا |
| `pay.pay.remaining` | Still to pay on this run: {amount} | اس رن پر بقایا ادائیگی: {amount} | په دې چل کې لا ورکولو ته پاتې: {amount} |
| `pay.pay.title` | Pay salary | تنخواہ کی ادائیگی | معاش ورکړئ |
| `pay.payments.bucketRow` | Production labour (unassigned) | پیداواری مزدوری (بے نام) | د تولید مزدوري (بې نومه) |
| `pay.payments.empty` | No payments recorded yet. | ابھی کوئی ادائیگی درج نہیں۔ | لا تر اوسه هېڅ تادیه نه ده ثبت شوې. |
| `pay.payments.reversedRow` | Reversal of a payment | ادائیگی کی واپسی | د یوې تادیې بېرته اړول |
| `pay.payments.title` | Payments | ادائیگیاں | تادیې |
| `pay.reverse.confirmBody` | A mirror entry undoes the accrual and the run reads Reversed; the month can then be re-run. Payments already made STAND — the money really moved — and now sit as advance positions for those employees. | ایک آئینہ اندراج اس استحقاق کو ختم کر دے گا اور رن «واپس لیا گیا» پڑھا جائے گا؛ پھر مہینہ دوبارہ چل سکتا ہے۔ پہلے کی گئی ادائیگیاں برقرار رہتی ہیں — رقم حقیقت میں گئی تھی — اور اب ان ملازمین کی پیشگی صورتحال میں شامل ہیں۔ | یوه هنداره ننوتنه استحقاق ختموي او چل بېرته اړول شوی لوستل کېږي؛ میاشت بیا چلول کېدای شي. لا دمخه شوې تادیې پاتې کېږي — پیسې رښتیا خوځېدلې — او اوس د هغو کارکوونکو لپاره د وړاندې تادیې په حالت کې دي. |
| `pay.reverse.confirmTitle` | Reverse {number}? | {number} واپس لیں؟ | {number} بېرته واړوئ؟ |
| `pay.saveDraft` | Save draft | مسودہ محفوظ کریں | مسوده خوندي کړئ |
| `pay.status.draft` | Draft | مسودہ | مسوده |
| `pay.status.posted` | Posted | درج شدہ | ثبت شوی |
| `pay.status.reversed` | Reversed | واپس لیا گیا | بېرته اړول شوی |
| `pay.subtitle` | One run per month: composed from the register, finalised into the journal as a single net accrual, then paid in cash or bank. Corrections are reversals — a posted run is never edited. | ہر مہینے ایک رن: رجسٹر سے بنتا ہے، ایک ہی خالص اندراج کی صورت میں جرنل میں درج ہوتا ہے، پھر نقد یا بینک سے ادائیگی ہوتی ہے۔ درستگی ریورسل سے ہوتی ہے — درج شدہ رن میں کبھی ترمیم نہیں ہوتی۔ | هره میاشت یو چل: له راجستر څخه جوړېږي، په ژورنال کې د یوه خالص استحقاق په توګه وروستی کېږي، بیا په نغدو یا بانک ورکول کېږي. سمونونه بېرته اړول دي — ثبت شوی چل هېڅکله نه سمیږي. |
| `pay.title` | Payroll runs | تنخواہ رنز | د معاش چلونه |
| `slip.advAfter` | Advance still outstanding | اب بھی بقایا پیشگی | لا پاتې وړاندې تادیه |
| `slip.advances` | Advances | پیشگیاں | وړاندې تادیې |
| `slip.advBefore` | Advance outstanding before this run | اس رن سے پہلے بقایا پیشگی | له دې چل مخکې پاتې وړاندې تادیه |
| `slip.advRecovered` | Recovered from this salary | اس تنخواہ سے وصول | له دې معاش څخه بېرته اخیستل شوې |
| `slip.att.counts` | Present {present} · Absent {absent} · Half {half} · Leave {leave} | حاضر {present} · غیر حاضر {absent} · آدھا دن {half} · چھٹی {leave} | حاضر {present} · غیر حاضر {absent} · نیم {half} · رخصتي {leave} |
| `slip.att.days` | {days} days in month | مہینے کے {days} دن | په میاشت کې {days} ورځې |
| `slip.attendance` | Attendance | حاضری | حاضري |
| `slip.base` | Base salary (earned) | بنیادی تنخواہ (کمائی ہوئی) | بنسټیز معاش (ګټل شوی) |
| `slip.deductions` | Deductions | کٹوتیاں | کټونې |
| `slip.designation` | Designation | عہدہ | دنده |
| `slip.earnings` | Earnings | آمدنی | ګټې |
| `slip.employee` | Employee | ملازم | کارکوونکی |
| `slip.gross` | Gross | مجموعی | ټول |
| `slip.month` | Month | مہینہ | میاشت |
| `slip.net` | Net accrued | خالص مستحق | خالص استحقاق |
| `slip.paid` | Paid | ادا شدہ | ورکړل شوی |
| `slip.print` | Print slip | پرچی چھاپیں | رسید چاپ کړئ |
| `slip.signature` | Employee signature | ملازم کے دستخط | د کارکوونکي لاسلیک |
| `slip.stillOwed` | Still owed | بقایا واجب | لا پاتې |
| `slip.title` | Salary slip | تنخواہ پرچی | د معاش رسید |
| `staff.action.deactivate` | Deactivate | غیر فعال کریں | غیر فعال کړئ |
| `staff.action.reactivate` | Reactivate | دوبارہ فعال کریں | بیا فعال کړئ |
| `staff.action.view` | View | دیکھیں | وګورئ |
| `staff.add` | Add employee | ملازم شامل کریں | کارکوونکی زیات کړئ |
| `staff.badge.active` | Active | فعال | فعال |
| `staff.badge.inactive` | Inactive | غیر فعال | غیر فعال |
| `staff.delete.aria` | Delete employee | ملازم حذف کریں | کارکوونکی ړنګ کړئ |
| `staff.delete.blocked` | This employee has records (attendance, payroll or journal entries), so they can only be deactivated — history is never deleted. | اس ملازم کا ریکارڈ موجود ہے (حاضری، تنخواہ یا جرنل اندراجات)، اس لیے اسے صرف غیر فعال کیا جا سکتا ہے — تاریخ کبھی حذف نہیں ہوتی۔ | دا کارکوونکی ریکارډونه لري (حاضري، معاش یا ژورنال ننوتنې)، نو یوازې غیر فعالېدای شي — تاریخ هېڅکله نه ړنګېږي. |
| `staff.delete.body` | “{name}” has no attendance, payroll, loan or journal records, so the directory entry can be removed. This cannot be undone. | “{name}” کا کوئی حاضری، تنخواہ، قرض یا جرنل ریکارڈ نہیں، اس لیے ڈائریکٹری کا اندراج ہٹایا جا سکتا ہے۔ یہ عمل واپس نہیں ہو سکتا۔ | “{name}” هېڅ حاضري، معاش، پور یا ژورنال ریکارډ نه لري، نو د لارښود ننوتنه لرې کېدای شي. دا بېرته نه راګرځي. |
| `staff.delete.keep` | Keep | رکھیں | وساتئ |
| `staff.delete.title` | Delete this employee? | یہ ملازم حذف کریں؟ | دا کارکوونکی ړنګ کړئ؟ |
| `staff.empty.noMatch` | No employee matches your search. | کوئی ملازم آپ کی تلاش سے میل نہیں کھاتا۔ | هېڅ کارکوونکی ستاسو له لټون سره سمون نه خوري. |
| `staff.empty.none` | No employees yet. Add your first team member to open the directory and the attendance register. | ابھی کوئی ملازم نہیں۔ ڈائریکٹری اور حاضری رجسٹر کھولنے کے لیے پہلا رکن شامل کریں۔ | لا تر اوسه هېڅ کارکوونکی نشته. خپل لومړی د ټیم غړی زیات کړئ تر څو لارښود او د حاضرۍ راجستر پرانیستل شي. |
| `staff.err.baseInvalid` | Enter the pay amount (0 or more). | تنخواہ کی رقم لکھیں (0 یا زیادہ)۔ | د معاش مبلغ ولیکئ (0 یا ډېر). |
| `staff.err.nameRequired` | Give the employee a name. | ملازم کا نام لکھیں۔ | کارکوونکي ته نوم ورکړئ. |
| `staff.eyebrow` | Team & attendance | عملہ اور حاضری | ټیم او حاضري |
| `staff.form.addAllowance` | Add allowance | الاؤنس شامل کریں | اضافه زیاته کړئ |
| `staff.form.addSub` | Identity and current pay terms. A raise edited here changes future payroll runs only — posted runs keep their snapshots. | شناخت اور موجودہ تنخواہ کی شرائط۔ یہاں کی گئی تبدیلی صرف آئندہ تنخواہ رنز پر لاگو ہوگی — درج شدہ رنز اپنے سنیپ شاٹ برقرار رکھتے ہیں۔ | پېژندنه او د اوسني معاش شرایط. دلته بدل شوی زیاتوالی یوازې راتلونکي معاشونه بدلوي — ثبت شوي یې خپل عکسونه ساتي. |
| `staff.form.addTitle` | New employee | نیا ملازم | نوی کارکوونکی |
| `staff.form.allowanceAmountPh` | Amount | رقم | مبلغ |
| `staff.form.allowanceLabelPh` | Label — e.g. Transport | عنوان — مثلاً کرایہ سفر | سرلیک — لکه ترانسپورت |
| `staff.form.allowances` | Fixed allowances | مقررہ الاؤنسز | ټاکلې اضافې پیسې |
| `staff.form.baseDaily` | Daily rate (Rs) | روزانہ شرح (روپے) | ورځنی نرخ (Rs) |
| `staff.form.baseMonthly` | Monthly base salary (Rs) | ماہانہ بنیادی تنخواہ (روپے) | میاشتنی بنسټیز معاش (Rs) |
| `staff.form.basis.daily` | Daily wage | روزانہ اجرت | ورځنۍ مزدوري |
| `staff.form.basis.monthly` | Monthly salary | ماہانہ تنخواہ | میاشتنی معاش |
| `staff.form.designation` | Designation | عہدہ | دنده |
| `staff.form.designationPh` | e.g. Salesman, Darzi, Driver | مثلاً سیلز مین، درزی، ڈرائیور | لکه پلورونکی، خیاط، موټر چلوونکی |
| `staff.form.editSub` | Terms are the employee's CURRENT terms; runs already posted keep the terms they snapshotted. | شرائط ملازم کی موجودہ شرائط ہیں؛ پہلے سے درج رنز وہی شرائط رکھتے ہیں جو انہوں نے سنیپ شاٹ کی تھیں۔ | شرایط د کارکوونکي اوسني شرایط دي؛ مخکې ثبت شوي یې هغه شرایط ساتي چې عکس یې اخیستی و. |
| `staff.form.editTitle` | Edit employee | ملازم میں ترمیم | کارکوونکی سم کړئ |
| `staff.form.joinDate` | Joining date | ملازمت کی تاریخ | د یوځای کېدو نېټه |
| `staff.form.linkedEmail` | Linked login email (optional) | منسلک لاگ اِن ای میل (اختیاری) | تړلې ننوتنې برېښنالیک (اختیاري) |
| `staff.form.linkedEmailPh` | Only if this person also signs in | صرف تب جب یہ شخص سائن اِن بھی کرتا ہو | یوازې که دا کس ننوځي هم |
| `staff.form.linkedHelp` | Informational only — it grants no access and gates nothing. Logins and roles are managed in Settings. | صرف معلوماتی — نہ یہ رسائی دیتا ہے، نہ کسی چیز کی شرط ہے۔ لاگ اِن اور کردار ترتیبات میں منظم ہوتے ہیں۔ | یوازې معلوماتي — هېڅ لاسرسی نه ورکوي او هېڅ نه بندوي. ننوتنې او رولونه په تنظیماتو کې سمبالېږي. |
| `staff.form.name` | Name | نام | نوم |
| `staff.form.namePh` | e.g. Muhammad Imran | مثلاً محمد عمران | لکه محمد عمران |
| `staff.form.note` | Note | نوٹ | یادښت |
| `staff.form.notePh` | Optional | اختیاری | اختیاري |
| `staff.form.paidLeaveDays` | Paid leave days / month | ماہانہ تنخواہ سمیت چھٹیاں | په میاشت کې د معاش رخصتۍ ورځې |
| `staff.form.paidLeaveHelp` | Monthly basis only: absences within this allowance do not reduce the salary; beyond it, pay is docked pro-rata over the month's days. Daily-basis staff are paid per day present. | صرف ماہانہ بنیاد کے لیے: اس حد کے اندر غیر حاضری تنخواہ نہیں گھٹاتی؛ اس سے آگے تنخواہ مہینے کے دنوں کے تناسب سے کٹتی ہے۔ روزانہ بنیاد والے عملے کو حاضر دنوں کی اجرت ملتی ہے۔ | یوازې میاشتنی بنسټ: په دې اجازه کې دننه غیر حاضرۍ معاش نه کموي؛ له هغې هاخوا، معاش د میاشتې د ورځو په تناسب کمیږي. ورځني کارکوونکو ته د حاضرې هرې ورځې معاش ورکول کېږي. |
| `staff.form.payBasis` | Pay basis | تنخواہ کی بنیاد | د معاش بنسټ |
| `staff.form.phone` | Phone | فون | تلیفون |
| `staff.form.phonePh` | 03xx-xxxxxxx | 03xx-xxxxxxx | 03xx-xxxxxxx |
| `staff.form.removeAllowance` | Remove allowance | الاؤنس ہٹائیں | اضافه لرې کړئ |
| `staff.form.saveChanges` | Save changes | تبدیلیاں محفوظ کریں | بدلونونه خوندي کړئ |
| `staff.noteBox` | Positions are read from the double-entry journal (salaries payable, per employee) — never typed in. Deactivated staff keep their full history and can be reactivated any time. | صورتحال ڈبل انٹری جرنل سے پڑھی جاتی ہے (فی ملازم واجب الادا تنخواہیں) — کبھی ہاتھ سے نہیں لکھی جاتی۔ غیر فعال عملے کی مکمل تاریخ محفوظ رہتی ہے اور وہ کسی بھی وقت دوبارہ فعال ہو سکتے ہیں۔ | حالتونه د دوه ګوني ژورنال څخه لوستل کېږي (د معاشونو پاتې، د هر کارکوونکي لپاره) — هېڅکله په لاس نه لیکل کېږي. غیر فعال شوي کارکوونکي خپل بشپړ تاریخ ساتي او هر وخت بیا فعالېدای شي. |
| `staff.notice.added` | “{name}” added to the directory. | “{name}” ڈائریکٹری میں شامل ہو گیا۔ | “{name}” په لارښود کې زیات شو. |
| `staff.notice.deactivated` | “{name}” deactivated — their history stays readable. | “{name}” غیر فعال ہو گیا — اس کی تاریخ پڑھنے کے لیے موجود رہے گی۔ | “{name}” غیر فعال شو — تاریخ یې د لوستلو لپاره پاتې ده. |
| `staff.notice.deleted` | “{name}” deleted. | “{name}” حذف ہو گیا۔ | “{name}” ړنګ شو. |
| `staff.notice.reactivated` | “{name}” is active again. | “{name}” دوبارہ فعال ہو گیا۔ | “{name}” بیا فعال دی. |
| `staff.notice.updated` | Employee updated. | ملازم کی تفصیل تازہ ہو گئی۔ | کارکوونکی تازه شو. |
| `staff.pay.daily` | {amount} / day | {amount} / دن | {amount} / ورځ |
| `staff.pay.monthly` | {amount} / month | {amount} / ماہ | {amount} / میاشت |
| `staff.pos.advance` | Advance {amount} | پیشگی {amount} | وړاندې تادیه {amount} |
| `staff.pos.owed` | Owed {amount} | واجب الادا {amount} | پاتې {amount} |
| `staff.pos.settled` | Settled | حساب صاف | برابر شوی |
| `staff.profile.advance` | Advance outstanding | بقایا پیشگی | پاتې وړاندې تادیه |
| `staff.profile.aria` | Employee detail | ملازم کی تفصیل | د کارکوونکي تفصیل |
| `staff.profile.attendanceThisMonth` | This month so far: {present} present · {absent} absent · {half} half · {leave} leave | اس ماہ اب تک: {present} حاضر · {absent} غیر حاضر · {half} آدھا دن · {leave} چھٹی | په دې میاشت کې تر اوسه: {present} حاضر · {absent} غیر حاضر · {half} نیم · {leave} رخصتي |
| `staff.profile.joined` | Joined {date} | ملازمت: {date} | یوځای شو {date} |
| `staff.profile.noPhone` | No phone recorded | فون درج نہیں | تلیفون نه دی ثبت شوی |
| `staff.profile.owed` | Shop owes them | دکان کے ذمے واجب | هټۍ یې پوروړې ده |
| `staff.profile.payrollNote` | Salary accruals, advances and payments join this position as payroll runs are posted; the figures above are always derived from the journal, never stored. | تنخواہ کے رنز درج ہوتے جائیں گے تو مستحق تنخواہ، پیشگیاں اور ادائیگیاں اسی صورتحال میں شامل ہوتی جائیں گی؛ اوپر کے اعداد ہمیشہ جرنل سے اخذ ہوتے ہیں، کبھی ذخیرہ نہیں ہوتے۔ | د معاش استحقاق، وړاندې تادیې او تادیې له دې حالت سره یوځای کېږي کله چې معاشونه ثبت شي؛ پورته شمېرې تل له ژورنال څخه اخیستل کېږي، هېڅکله نه ساتل کېږي. |
| `staff.profile.positionTitle` | Salary position (from the journal) | تنخواہ کی صورتحال (جرنل سے) | د معاش حالت (له ژورنال څخه) |
| `staff.profile.terms` | Current terms | موجودہ شرائط | اوسني شرایط |
| `staff.searchAria` | Search employees | ملازمین تلاش کریں | کارکوونکي ولټوئ |
| `staff.searchPlaceholder` | Search name, phone or designation… | نام، فون یا عہدہ تلاش کریں… | نوم، تلیفون یا دنده ولټوئ… |
| `staff.subtitle` | Everyone who works here — their terms, their attendance, and what the journal says they are owed. Employees are not logins: most staff never sign in, and their records live here, not in Settings. | یہاں کام کرنے والے تمام افراد — ان کی شرائط، ان کی حاضری، اور جرنل کے مطابق ان کی واجب الادا رقم۔ ملازمین لاگ اِن نہیں ہوتے: بیشتر عملہ کبھی سائن اِن نہیں کرتا، اور ان کا ریکارڈ یہیں رہتا ہے، ترتیبات میں نہیں۔ | هر څوک چې دلته کار کوي — د هغوی شرایط، حاضري، او هغه څه چې ژورنال وايي د هغوی پاتې دي. کارکوونکي ننوتنې نه دي: ډېری کارکوونکي هېڅکله نه ننوځي، او د هغوی ریکارډونه دلته دي، په تنظیماتو کې نه. |
| `staff.tab.attendance` | Attendance | حاضری | حاضري |
| `staff.tab.directory` | Directory | ڈائریکٹری | لارښود |
| `staff.tab.payroll` | Payroll | تنخواہ | معاش |
| `staff.tabsAria` | Staff sections | عملے کے حصے | د کارکوونکو برخې |
| `staff.th.actions` | Actions | اعمال | کړنې |
| `staff.th.designation` | Designation | عہدہ | دنده |
| `staff.th.name` | Name | نام | نوم |
| `staff.th.pay` | Pay | تنخواہ | معاش |
| `staff.th.phone` | Phone | فون | تلیفون |
| `staff.th.position` | Position | صورتحال | حالت |
| `staff.th.status` | Status | حیثیت | درجې |
| `staff.title` | Staff | عملہ | کارکوونکي |
## loyalty

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `bill.earnPreview` | This bill earns {points} points | اس بل پر {points} پوائنٹس بنیں گے | دا بل {points} پوائنټونه ګټي |
| `bill.payPoints` | Points | پوائنٹس | پوائنټونه |
| `bill.pointsBalance` | Points available | دستیاب پوائنٹس | شته پوائنټونه |
| `bill.pointsMaxNote` | Up to {cap}% of this bill can be paid in points. | اس بل کا زیادہ سے زیادہ {cap} فیصد پوائنٹس سے ادا ہو سکتا ہے۔ | د دې بل تر {cap}% پورې په پوائنټونو ورکول کېدای شي. |
| `bill.pointsNeedsCustomer` | Points can only be used on a named customer's bill. | پوائنٹس صرف نام والے گاہک کے بل پر استعمال ہو سکتے ہیں۔ | پوائنټونه یوازې د نومول شوي پېرودونکي په بل کې کارول کېدای شي. |
| `bill.pointsPart` | Points | پوائنٹس | پوائنټونه |
| `bill.pointsUsePh` | Points to use | استعمال کرنے کے پوائنٹس | د کارولو پوائنټونه |
| `bill.walkinNoEarn` | Walk-in bills don't earn loyalty points — add the customer to earn. | بے نام بل پر پوائنٹس نہیں بنتے — پوائنٹس کے لیے گاہک شامل کریں۔ | راغلي بلونه د وفادارۍ پوائنټونه نه ګټي — د ګټلو لپاره پېرودونکی زیات کړئ. |
| `cust.loyaltyPoints` | Loyalty points | وفاداری پوائنٹس | د وفادارۍ پوائنټونه |
| `loyalty.col.customer` | Customer | گاہک | پېرودونکی |
| `loyalty.col.nextExpiry` | Next expiry | اگلی میعاد ختم | راتلونکی تېرېدل |
| `loyalty.col.points` | Points | پوائنٹس | پوائنټونه |
| `loyalty.col.tier` | Tier | درجہ | کچه |
| `loyalty.col.value` | Value | مالیت | ارزښت |
| `loyalty.customersWithBalance` | Customers with points | پوائنٹس رکھنے والے گاہک | هغه پېرودونکي چې پوائنټونه لري |
| `loyalty.empty` | No customer has loyalty points yet. Points are earned automatically on a named customer's bill while the programme is on. | ابھی کسی گاہک کے پاس پوائنٹس نہیں ہیں۔ پروگرام آن ہو تو نام والے گاہک کے بل پر پوائنٹس خود بخود بنتے ہیں۔ | لا هېڅ پېرودونکي د وفادارۍ پوائنټونه نه لري. پوائنټونه په اتومات ډول د نومول شوي پېرودونکي په بل کې ګټل کېږي کله چې پروګرام فعال وي. |
| `loyalty.expiredSub` | These points passed their expiry date. They still count in the liability above until you post the release — posting moves them out of the liability and back against the programme's cost. Nothing expires on its own. | ان پوائنٹس کی میعاد گزر چکی ہے۔ جب تک آپ ان کی رہائی درج نہیں کرتے، یہ اوپر والی ذمہ داری میں شامل رہتے ہیں — درج کرنے سے یہ ذمہ داری سے نکل کر پروگرام کی لاگت کے مقابل واپس آ جاتے ہیں۔ کوئی پوائنٹ خود سے ختم نہیں ہوتا۔ | دې پوائنټونو خپله د تېرېدو نېټه تېره کړې ده. تر هغه چې تاسو خوشې کول ثبت نه کړئ، په پورته مسؤلیت کې شمېرل کېږي — ثبتول یې له مسؤلیت څخه باسي او د پروګرام د لګښت پر وړاندې یې بېرته راولي. هېڅ شی په خپله نه تېرېږي. |
| `loyalty.expiredTitle` | Expired — not yet posted | ختم شدہ — ابھی درج نہیں | تېر شوي — لا ثبت شوي نه دي |
| `loyalty.expiringSoon` | Expiring in 30 days | 30 دن میں ختم ہونے والے | په 30 ورځو کې تېرېږي |
| `loyalty.off` | The loyalty programme is switched off in Settings. Existing balances stay here — customers can still spend them, and expired points can still be posted. | وفاداری پروگرام ترتیبات میں بند ہے۔ موجودہ بیلنس یہیں رہیں گے — گاہک انہیں خرچ کر سکتے ہیں، اور ختم شدہ پوائنٹس اب بھی درج کیے جا سکتے ہیں۔ | د وفادارۍ پروګرام په ترتیباتو کې بند دی. موجود بیلانسونه دلته پاتې کېږي — پېرودونکي لا هم کولی شي هغه ولګوي، او تېر شوي پوائنټونه لا هم ثبتېدای شي. |
| `loyalty.pointsOutstanding` | Points outstanding | باقی پوائنٹس | پاتې پوائنټونه |
| `loyalty.postedCount` | Expiry releases posted | میعاد کی انٹریاں درج ہو گئیں | د تېرېدو خوشې کول ثبت شول |
| `loyalty.postExpiries` | Post expiry releases | میعاد ختم ہونے کی انٹریاں درج کریں | د تېرېدو خوشې کول ثبت کړئ |
| `loyalty.subtitle` | Points your customers have earned and not yet spent. Every point is a rupee the shop owes — earned, spent, returned and expired points all move through the ledger, so this page always agrees with your books. | وہ پوائنٹس جو گاہکوں نے کمائے اور ابھی خرچ نہیں کیے۔ ہر پوائنٹ ایک روپیہ ہے جو دکان کے ذمے ہے — کمائے، خرچ کیے، واپس ملے اور ختم ہوئے پوائنٹس سب کھاتے سے گزرتے ہیں، اس لیے یہ صفحہ ہمیشہ آپ کے کھاتوں سے میل کھاتا ہے۔ | هغه پوائنټونه چې ستاسو پېرودونکو ګټلي او لا یې نه دي لګولي. هر پوائنټ یوه روپۍ ده چې هټۍ یې په غاړه ده — ګټل شوي، لګول شوي، بېرته راغلي او تېر شوي پوائنټونه ټول د حساب له لارې تېرېږي، نو دا مخ تل ستاسو له کتابونو سره سمون خوري. |
| `loyalty.tier.gold` | Gold | گولڈ | د سرو زرو |
| `loyalty.tier.silver` | Silver | سلور | د سپینو زرو |
| `loyalty.tier.standard` | Standard | عام | معیاري |
| `loyalty.title` | Loyalty Points | وفاداری پوائنٹس | د وفادارۍ پوائنټونه |
| `loyalty.totalLiability` | Points liability | پوائنٹس کی ذمہ داری | د پوائنټونو مسؤلیت |
| `loyalty.vintageLeft` | {points} points left | {points} پوائنٹس باقی | {points} پوائنټونه پاتې |
| `loyalty.vintageLine` | Bill #{bill} · earned {date} · expires {expiry} | بل نمبر {bill} · کمائے {date} · میعاد ختم {expiry} | بل #{bill} · ګټل شوی {date} · تېرېږي {expiry} |
| `nav.loyalty` | Loyalty | وفاداری پوائنٹس | وفاداري |
| `rep.loyalty.clawed` | Points taken back (returns) | واپسی پر کاٹے گئے پوائنٹس | بېرته اخیستل شوي پوائنټونه (بېرته راتګ) |
| `rep.loyalty.earned` | Points earned | کمائے گئے پوائنٹس | ګټل شوي پوائنټونه |
| `rep.loyalty.expired` | Points expired | میعاد ختم پوائنٹس | تېر شوي پوائنټونه |
| `rep.loyalty.liability` | Points liability at period end | مدت کے آخر میں پوائنٹس کی ذمہ داری | د دورې په پای کې د پوائنټونو مسؤلیت |
| `rep.loyalty.recredited` | Points re-credited (returns) | واپسی پر دوبارہ ملے پوائنٹس | بیا ورکړل شوي پوائنټونه (بېرته راتګ) |
| `rep.loyalty.redeemed` | Points redeemed | خرچ کیے گئے پوائنٹس | لګول شوي پوائنټونه |
| `rep.loyalty.title` | Loyalty points | وفاداری پوائنٹس | د وفادارۍ پوائنټونه |
| `set.loyalty.earnBase` | Rupees of a bill per point earned | ایک پوائنٹ کے لیے بل کی رقم (روپے) | د یوه ګټل شوي پوائنټ لپاره د بل روپۍ |
| `set.loyalty.enabled` | Programme on | پروگرام آن کریں | پروګرام فعال |
| `set.loyalty.expiryMonths` | Points expire after (months) | پوائنٹس کی میعاد (مہینے) | پوائنټونه وروسته تېرېږي (میاشتې) |
| `set.loyalty.goldAt` | Gold tier — points earned in a year | گولڈ درجہ — ایک سال میں کمائے گئے پوائنٹس | د سرو زرو کچه — په یوه کال کې ګټل شوي پوائنټونه |
| `set.loyalty.goldMult` | Gold earn multiplier (×) | گولڈ کمائی کا ضارب (×) | د سرو زرو د ګټلو ضرب (×) |
| `set.loyalty.note` | Tiers only make points accumulate faster — a point is worth the same rupees for every customer. Switching the programme off stops new points; balances already earned stay spendable and expirable. | درجے صرف پوائنٹس کی کمائی تیز کرتے ہیں — ہر گاہک کے لیے پوائنٹ کی مالیت ایک جتنی رہتی ہے۔ پروگرام بند کرنے سے نئے پوائنٹس رک جاتے ہیں؛ پہلے سے بنے بیلنس خرچ اور میعاد ختم کے قابل رہتے ہیں۔ | کچې یوازې پوائنټونه ګړندي راټولوي — یو پوائنټ د هر پېرودونکي لپاره په ورته روپیو ارزښت لري. د پروګرام بندول نوي پوائنټونه دروي؛ لا دمخه ګټل شوي بیلانسونه د لګولو او تېرېدو وړ پاتې کېږي. |
| `set.loyalty.pointValue` | Value of 1 point (Rs) | ایک پوائنٹ کی مالیت (روپے) | د 1 پوائنټ ارزښت (Rs) |
| `set.loyalty.redeemCap` | Most of a bill payable in points (%) | بل کا زیادہ سے زیادہ حصہ پوائنٹس سے (فیصد) | د بل تر ټولو زیاته برخه چې په پوائنټونو ورکول کېږي (%) |
| `set.loyalty.silverAt` | Silver tier — points earned in a year | سلور درجہ — ایک سال میں کمائے گئے پوائنٹس | د سپینو زرو کچه — په یوه کال کې ګټل شوي پوائنټونه |
| `set.loyalty.silverMult` | Silver earn multiplier (×) | سلور کمائی کا ضارب (×) | د سپینو زرو د ګټلو ضرب (×) |
| `set.loyalty.sub` | Reward repeat customers with points. Points are a liability in your books: earned points cost the programme account, spent points pay part of a bill, and expired points are released only when you post them from the Loyalty page. | بار بار آنے والے گاہکوں کو پوائنٹس سے نوازیں۔ پوائنٹس آپ کے کھاتوں میں ایک ذمہ داری ہیں: بنے ہوئے پوائنٹس پروگرام کے کھاتے پر لاگت ڈالتے ہیں، خرچ کیے گئے پوائنٹس بل کا کچھ حصہ ادا کرتے ہیں، اور میعاد ختم پوائنٹس تبھی نکلتے ہیں جب آپ وفاداری والے صفحے سے انہیں درج کریں۔ | تکراري پېرودونکي په پوائنټونو ونازوئ. پوائنټونه ستاسو په کتابونو کې یو مسؤلیت دی: ګټل شوي پوائنټونه د پروګرام حساب ته لګښت اچوي، لګول شوي پوائنټونه د بل یوه برخه ورکوي، او تېر شوي پوائنټونه یوازې هغه وخت خوشې کېږي کله چې تاسو یې د وفادارۍ له مخ څخه ثبت کړئ. |
| `set.loyalty.title` | Loyalty programme | وفاداری پروگرام | د وفادارۍ پروګرام |
## store

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `nav.storefront` | Online Store | آن لائن اسٹور | آنلاین هټۍ |
| `print.storeLink.caption` | Order online from our store | ہمارے اسٹور سے آن لائن آرڈر کریں | زموږ له هټۍ څخه آنلاین امر وکړئ |
| `shop.add` | Add | شامل کریں | زیات کړئ |
| `shop.available` | Available | دستیاب | شته |
| `shop.cartEmpty` | Your order is empty — add something you need. | آپ کا آرڈر خالی ہے — جو چاہیے شامل کریں۔ | ستاسو امر خالي دی — هغه څه زیات کړئ چې ورته اړتیا لرئ. |
| `shop.cartTitle` | Your order | آپ کا آرڈر | ستاسو امر |
| `shop.cartTotal` | Estimated total | تخمینی کل | اټکلي ټول |
| `shop.checkoutTitle` | Your details | آپ کی تفصیل | ستاسو جزئیات |
| `shop.consentLabel` | I agree to receive marketing messages from this shop on WhatsApp | میں اس دکان سے واٹس ایپ پر مارکیٹنگ پیغامات وصول کرنے پر راضی ہوں | زه موافق یم چې له دې هټۍ څخه په WhatsApp کې د بازارموندنې پیغامونه ترلاسه کړم |
| `shop.errEmpty` | Your order is empty. | آپ کا آرڈر خالی ہے۔ | ستاسو امر خالي دی. |
| `shop.errName` | Please write your name. | براہ کرم اپنا نام لکھیں۔ | مهرباني وکړئ خپل نوم ولیکئ. |
| `shop.errPhone` | That phone number doesn't look right. | یہ فون نمبر درست نہیں لگتا۔ | دا د تلیفون شمېره سمه نه ښکاري. |
| `shop.errSend` | The order couldn't be sent. Please try again, or message the shop on WhatsApp. | آرڈر نہ بھیجا جا سکا۔ دوبارہ کوشش کریں، یا دکان کو واٹس ایپ پر پیغام بھیجیں۔ | امر ونه لېږل شو. مهرباني وکړئ بیا هڅه وکړئ، یا هټۍ ته په WhatsApp پیغام ورکړئ. |
| `shop.fulfilment.delivery` | Please deliver, if you can | اگر ممکن ہو تو پہنچا دیں | مهرباني وکړئ ورسوئ، که شونې وي |
| `shop.fulfilment.pickup` | I'll pick it up | میں خود آ کر لوں گا | زه به یې واخلم |
| `shop.fulfilmentLabel` | How will you get it? | آپ اسے کیسے لیں گے؟ | تاسو به یې څنګه ترلاسه کوئ؟ |
| `shop.inCart` | In your order | آپ کے آرڈر میں | ستاسو په امر کې |
| `shop.loading` | Opening the store… | اسٹور کھل رہا ہے… | هټۍ پرانستل کېږي… |
| `shop.lowStock` | Running low | ختم ہونے والا | کمېږي |
| `shop.nameLabel` | Your name | آپ کا نام | ستاسو نوم |
| `shop.noResults` | Nothing matches that search. | اس تلاش سے کچھ نہیں ملا۔ | له دې لټون سره هیڅ شی نه سمون خوري. |
| `shop.noteLabel` | Note for the shop (optional) | دکان کے لیے نوٹ (اختیاری) | د هټۍ لپاره یادښت (اختیاري) |
| `shop.orderAgain` | Place another order | ایک اور آرڈر کریں | بل امر وکړئ |
| `shop.orderPlacedBody` | The shop has your order and will confirm it with you, usually on WhatsApp. Nothing is charged until the shop confirms. | دکان کو آپ کا آرڈر مل گیا ہے اور وہ آپ سے تصدیق کرے گی، عموماً واٹس ایپ پر۔ دکان کی تصدیق سے پہلے کوئی رقم نہیں لی جاتی۔ | هټۍ ستاسو امر لري او له تاسو سره به یې تایید کړي، معمولا په WhatsApp. تر هغه چې هټۍ تایید نه کړي هیڅ شی نه اخیستل کېږي. |
| `shop.orderPlacedTitle` | Order placed — thank you | آرڈر ہو گیا — شکریہ | امر وشو — مننه |
| `shop.outOfStock` | Out of stock | ختم | موجودي ختمه ده |
| `shop.phoneLabel` | Phone / WhatsApp number | فون / واٹس ایپ نمبر | تلیفون / WhatsApp شمېره |
| `shop.placeOrder` | Place order | آرڈر کریں | امر وکړئ |
| `shop.placing` | Sending… | بھیجا جا رہا ہے… | لېږل کېږي… |
| `shop.poweredBy` | Store by Dukaan AI | اسٹور: Dukaan AI | هټۍ د Dukaan AI لخوا |
| `shop.previewBadge` | Preview | پیش منظر | مخکتنه |
| `shop.priceNote` | Prices are confirmed by the shop when it confirms your order. | قیمتیں دکان آپ کے آرڈر کی تصدیق کے وقت کنفرم کرتی ہے۔ | بیې د هټۍ لخوا تاییدېږي کله چې ستاسو امر تایید کړي. |
| `shop.searchPh` | Search products… | پروڈکٹس تلاش کریں… | توکي ولټوئ… |
| `shop.unavailableBody` | The shop may have moved or switched its store off. Please check the link, or contact the shop directly. | شاید دکان نے اپنا اسٹور بند کر دیا ہو یا لنک بدل گیا ہو۔ لنک جانچ لیں، یا دکان سے براہِ راست رابطہ کریں۔ | کېدای شي هټۍ تللې وي یا خپله هټۍ یې بنده کړې وي. مهرباني وکړئ لینک وګورئ، یا له هټۍ سره مستقیم اړیکه ونیسئ. |
| `shop.unavailableTitle` | This store isn't open | یہ اسٹور کھلا نہیں ہے | دا هټۍ پرانستې نه ده |
| `shop.whatsappShop` | Message the shop on WhatsApp | دکان کو واٹس ایپ پر پیغام بھیجیں | هټۍ ته په WhatsApp پیغام ورکړئ |
| `store.autoRepublish` | Update the store automatically when products change | پروڈکٹس بدلنے پر اسٹور خود بخود تازہ ہو جائے | کله چې توکي بدل شي هټۍ په اتومات ډول تازه کړئ |
| `store.band.hidden` | Hidden | چھپا ہوا | پټ |
| `store.band.in` | Available | دستیاب | شته |
| `store.band.low` | Running low | ختم ہونے والا | کمېږي |
| `store.band.out` | Out of stock | ختم | موجودي ختمه ده |
| `store.col.customer` | Customer | گاہک | پېرودونکی |
| `store.col.fulfilment` | Fulfilment | وصولی | بشپړول |
| `store.col.phone` | Phone | فون | تلیفون |
| `store.col.price` | Price | قیمت | بیه |
| `store.col.product` | Product | پروڈکٹ | توکی |
| `store.col.show` | Show | دکھائیں | ښودل |
| `store.col.stock` | Stock | اسٹاک | موجودي |
| `store.convert` | Convert to sale order | سیلز آرڈر میں تبدیل کریں | د پلور امر ته واړوئ |
| `store.convertedOk` | Sale order {number} created | سیلز آرڈر {number} بن گیا | د پلور امر {number} جوړ شو |
| `store.convertedTo` | Became {number} | {number} بن گیا | {number} شو |
| `store.convertFailed` | That order could not be converted — it may already be handled. | یہ آرڈر تبدیل نہ ہو سکا — شاید یہ پہلے ہی نمٹایا جا چکا ہے۔ | دا امر ونه اړول شو — کېدای شي لا دمخه سمبال شوی وي. |
| `store.converting` | Converting… | تبدیل ہو رہا ہے… | اړول کېږي… |
| `store.convertWa` | Tell the customer on WhatsApp | گاہک کو واٹس ایپ پر بتائیں | پېرودونکي ته په WhatsApp ووایئ |
| `store.copied` | Copied | کاپی ہو گیا | کاپي شو |
| `store.copyLink` | Copy link | لنک کاپی کریں | لینک کاپي کړئ |
| `store.customerMatch` | Existing customer matched by phone: {name} | فون سے موجودہ گاہک مل گیا: {name} | د تلیفون له مخې موجود پېرودونکی وموندل شو: {name} |
| `store.customerNew` | No matching customer — converting creates one from this order. | کوئی گاہک نہیں ملا — تبدیل کرنے پر اس آرڈر سے نیا گاہک بنے گا۔ | هیڅ سمون لرونکی پېرودونکی نشته — اړول له دې امر څخه یو جوړوي. |
| `store.demoNote` | This is the demo: publishing is off, and the store preview below is built from this device's demo data. No page is public and no order can be placed. | یہ ڈیمو ہے: اشاعت بند ہے، اور نیچے اسٹور کا پیش منظر اسی آلے کے ڈیمو ڈیٹا سے بنا ہے۔ کوئی صفحہ عوامی نہیں اور کوئی آرڈر نہیں ہو سکتا۔ | دا ډیمو ده: خپرول بند دي، او لاندې د هټۍ مخکتنه د دې وسیلې له ډیمو معلوماتو څخه جوړه شوې ده. هیڅ پاڼه عامه نه ده او هیڅ امر نه شي کېدلی. |
| `store.dismiss` | Dismiss | مسترد کریں | رد کړئ |
| `store.dismissedOk` | Order dismissed | آرڈر مسترد ہو گیا | امر رد شو |
| `store.drift.changed` | changed | بدل گئی | بدله شوې |
| `store.drift.live` | Live | لائیو | ژوندۍ |
| `store.drift.missing` | This product has been deleted — its line is dropped. | یہ پروڈکٹ حذف ہو چکی ہے — اس کی لائن ختم ہو جائے گی۔ | دا توکی ړنګ شوی دی — کرښه یې غورځول کېږي. |
| `store.drift.published` | Published | شائع شدہ | خپره شوې |
| `store.driftNote` | Orders always convert at today's live prices. Any difference from the published price is shown here, before you confirm — the customer hears the confirmed price from you. | آرڈر ہمیشہ آج کی لائیو قیمتوں پر تبدیل ہوتے ہیں۔ شائع شدہ قیمت سے کوئی فرق ہو تو کنفرم کرنے سے پہلے یہاں دکھتا ہے — کنفرم شدہ قیمت گاہک کو آپ بتاتے ہیں۔ | امرونه تل د نن ورځې په ژوندیو بیو اړول کېږي. له خپرې شوې بیې څخه هر توپیر دلته ښودل کېږي، مخکې له دې چې تاسو تایید کړئ — تایید شوې بیه پېرودونکی له تاسو څخه اوري. |
| `store.driftTitle` | Price check at today's live prices | آج کی لائیو قیمتوں پر جانچ | د نن ورځې په ژوندیو بیو کې د بیې کتنه |
| `store.fulfilment.delivery` | Delivery requested | ڈیلیوری کی درخواست | د رسولو غوښتنه شوې |
| `store.fulfilment.pickup` | Pickup | خود آ کر لے گا | اخیستل |
| `store.inboxEmpty` | No store orders yet. Orders placed on your public store land here, ready to convert. | ابھی کوئی اسٹور آرڈر نہیں۔ آپ کے عوامی اسٹور پر آنے والے آرڈر یہاں آئیں گے، تبدیل کرنے کے لیے تیار۔ | لا د هټۍ امرونه نشته. ستاسو په عامه هټۍ کې شوي امرونه دلته راځي، د اړولو لپاره چمتو دي. |
| `store.inboxTitle` | Store orders | اسٹور آرڈرز | د هټۍ امرونه |
| `store.linkLabel` | Your store link | آپ کے اسٹور کا لنک | ستاسو د هټۍ لینک |
| `store.noteFromCustomer` | Customer note | گاہک کا نوٹ | د پېرودونکي یادښت |
| `store.noticeLabel` | Notice for customers (optional) | گاہکوں کے لیے اطلاع (اختیاری) | د پېرودونکو لپاره خبرتیا (اختیاري) |
| `store.noticePh` | e.g. Orders placed after 8 pm are confirmed the next morning. | مثلاً: رات 8 بجے کے بعد کے آرڈر اگلی صبح کنفرم ہوں گے۔ | د بېلګې په توګه د شپې له 8 بجو وروسته امرونه بل سهار تاییدېږي. |
| `store.openStore` | Open store | اسٹور کھولیں | هټۍ پرانیزئ |
| `store.orderTotal` | Order total at live prices: {total} | لائیو قیمتوں پر آرڈر کا کل: {total} | په ژوندیو بیو د امر ټول: {total} |
| `store.phoneLabel` | Public / WhatsApp number | عوامی / واٹس ایپ نمبر | عامه / WhatsApp شمېره |
| `store.previewLink` | Preview the store | اسٹور کا پیش منظر دیکھیں | د هټۍ مخکتنه وګورئ |
| `store.productsHelp` | Tick what the world may see. Prices and stock bands refresh every time you publish; stock is always shown as a band, never a count. | جس پر نشان لگائیں گے دنیا وہی دیکھے گی۔ قیمتیں اور اسٹاک کی حالت ہر اشاعت پر تازہ ہوتی ہیں؛ اسٹاک ہمیشہ ایک درجے کی صورت میں دکھتا ہے، گنتی کبھی نہیں۔ | هغه څه په نښه کړئ چې نړۍ یې لیدلی شي. بیې او د موجودي کچې هر ځل چې تاسو خپروئ تازه کېږي؛ موجودي تل د یوې کچې په توګه ښودل کېږي، هیڅکله د شمېر په توګه نه. |
| `store.productsTitle` | Products in the store | اسٹور کی مصنوعات | په هټۍ کې توکي |
| `store.publish` | Publish store | اسٹور شائع کریں | هټۍ خپره کړئ |
| `store.publishedOk` | Store published | اسٹور شائع ہو گیا | هټۍ خپره شوه |
| `store.publishFailed` | Publishing failed — please try again. | اشاعت ناکام رہی — دوبارہ کوشش کریں۔ | خپرول ناکام شول — مهرباني وکړئ بیا هڅه وکړئ. |
| `store.qrCaption` | Print this code and keep it at the counter — customers scan it to open your store. | یہ کوڈ چھاپ کر کاؤنٹر پر رکھیں — گاہک اسے اسکین کر کے آپ کا اسٹور کھولتے ہیں۔ | دا کوډ چاپ کړئ او په کانټر کې یې وساتئ — پېرودونکي یې سکین کوي تر څو ستاسو هټۍ پرانیزي. |
| `store.republish` | Republish | دوبارہ شائع کریں | بیا خپره کړئ |
| `store.slugError.bad-chars` | Only lowercase letters, digits and single hyphens. | صرف چھوٹے انگریزی حروف، ہندسے اور ایک ایک ہائفن۔ | یوازې کوچني توري، شمېرې او یوازیني هایفنونه. |
| `store.slugError.reserved` | That name is reserved — please pick another. | یہ نام محفوظ ہے — کوئی اور چنیں۔ | دا نوم ساتل شوی دی — مهرباني وکړئ بل وټاکئ. |
| `store.slugError.too-long` | Too long — at most 40 characters. | بہت لمبا ہے — زیادہ سے زیادہ 40 حروف۔ | ډېر اوږد دی — تر ټولو زیات 40 توري. |
| `store.slugError.too-short` | Too short — at least 3 characters. | بہت چھوٹا ہے — کم از کم 3 حروف۔ | ډېر لنډ دی — لږ تر لږه 3 توري. |
| `store.slugHelp` | Lowercase letters, digits and hyphens. Customers will see this in your store link. | چھوٹے انگریزی حروف، ہندسے اور ہائفن۔ گاہک یہ نام آپ کے اسٹور لنک میں دیکھیں گے۔ | کوچني توري، شمېرې او هایفنونه. پېرودونکي به دا ستاسو د هټۍ په لینک کې وویني. |
| `store.slugImmutable` | Claimed — this link name never changes, so printed links keep working. | یہ نام طے ہو چکا ہے — یہ کبھی نہیں بدلتا، تاکہ چھپے ہوئے لنک چلتے رہیں۔ | اخیستل شوی — دا د لینک نوم هیڅکله نه بدلېږي، نو چاپ شوي لینکونه کار کوي. |
| `store.slugLabel` | Store link name | اسٹور کے لنک کا نام | د هټۍ د لینک نوم |
| `store.state.darkPlan` | Your store is hidden: the online store is part of the Advanced plan, and your current plan does not include it. Your published page and slug are kept — upgrading brings the store straight back. | آپ کا اسٹور چھپا ہوا ہے: آن لائن اسٹور ایڈوانسڈ پلان کا حصہ ہے اور آپ کے موجودہ پلان میں شامل نہیں۔ آپ کا شائع شدہ صفحہ اور سلگ محفوظ ہیں — اپ گریڈ کرتے ہی اسٹور واپس آ جائے گا۔ | ستاسو هټۍ پټه ده: آنلاین هټۍ د Advanced پلان برخه ده، او ستاسو اوسنی پلان یې نه لري. ستاسو خپور شوی پاڼه او سلګ ساتل کېږي — لوړول هټۍ سمدلاسه بېرته راولي. |
| `store.state.darkState` | Your store is hidden while your plan is {state}. Your published page and slug are kept — renewing brings the store straight back. | جب تک آپ کا پلان {state} حالت میں ہے، اسٹور چھپا رہے گا۔ آپ کا شائع شدہ صفحہ اور سلگ محفوظ ہیں — تجدید کرتے ہی اسٹور واپس آ جائے گا۔ | ستاسو هټۍ تر هغه پټه ده چې ستاسو پلان په {state} حالت کې وي. ستاسو خپور شوی پاڼه او سلګ ساتل کېږي — نوي کول هټۍ سمدلاسه بېرته راولي. |
| `store.state.disabled` | Your store is switched off | آپ کا اسٹور بند ہے | ستاسو هټۍ بنده ده |
| `store.state.lit` | Your store is live | آپ کا اسٹور لائیو ہے | ستاسو هټۍ ژوندۍ ده |
| `store.state.noPlan` | Publishing needs a registered business. Once this shop has a plan, its store can go live here. | شائع کرنے کے لیے رجسٹرڈ کاروبار درکار ہے۔ جب اس دکان کا پلان بن جائے گا تو اس کا اسٹور یہیں لائیو ہو سکے گا۔ | خپرولو لپاره راجستر شوی کاروبار اړین دی. کله چې دا هټۍ پلان ولري، هټۍ یې دلته ژوندۍ کېدلی شي. |
| `store.stateConverted` | Converted | تبدیل شدہ | اړول شوی |
| `store.stateDismissed` | Dismissed | مسترد | رد شوی |
| `store.stateNew` | New | نیا | نوی |
| `store.subtitle` | Your shop on the web: a published catalogue your customers can order from. Orders land in an inbox here and become ordinary sale orders — nothing is sold, and no money moves, until you convert an order. | آپ کی دکان ویب پر: ایک شائع شدہ فہرست جس سے گاہک آرڈر کر سکتے ہیں۔ آرڈر یہاں ایک ان باکس میں آتے ہیں اور معمول کے سیلز آرڈر بنتے ہیں — جب تک آپ آرڈر کو تبدیل نہ کریں، نہ کچھ بکتا ہے نہ پیسہ چلتا ہے۔ | ستاسو هټۍ په ویب کې: یوه خپره شوې فهرست چې پېرودونکي ترې امر کولی شي. امرونه دلته په یوه ان باکس کې راځي او عادي پلور امرونه کېږي — تر هغه چې تاسو یو امر واړوئ، هیڅ شی نه پلورل کېږي او هیڅ پیسې نه خوځېږي. |
| `store.taglineLabel` | Tagline (optional) | تعارفی جملہ (اختیاری) | شعار (اختیاري) |
| `store.taglinePh` | e.g. Fresh groceries, delivered in Farooka | مثلاً: تازہ سودا، فروکہ میں ڈیلیوری کے ساتھ | د بېلګې په توګه تازه سودا، په فاروقه کې رسول کېږي |
| `store.title` | Online Store | آن لائن اسٹور | آنلاین هټۍ |
| `store.unpublish` | Switch store off | اسٹور بند کریں | هټۍ بنده کړئ |
| `store.unpublishedOk` | Store switched off — the page and order intake are closed. | اسٹور بند ہو گیا — صفحہ اور آرڈر لینا دونوں بند ہیں۔ | هټۍ بنده شوه — پاڼه او د امر اخیستل بند دي. |
| `store.updatedAt` | Last published {date} | آخری اشاعت {date} | وروستی خپرول {date} |
| `store.viewOrder` | View sale order | سیلز آرڈر دیکھیں | د پلور امر وګورئ |
## wa

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `nav.whatsapp` | WhatsApp Marketing | واٹس ایپ مارکیٹنگ | WhatsApp بازارموندنه |
| `wa.aud.all` | All opted-in customers | تمام رضامند گاہک | ټول ګډون کړي پېرودونکي |
| `wa.aud.inactive` | Inactive customers | غیر فعال گاہک | غیر فعال پېرودونکي |
| `wa.aud.inactiveDays` | No bill in (days) | اتنے دن سے کوئی بل نہیں (دن) | هیڅ بل نشته (ورځې) |
| `wa.aud.minDays` | Outstanding for at least (days) | کم از کم اتنے دن پرانا (دن) | لږ تر لږه پاتې (ورځې) |
| `wa.aud.minRs` | At least (Rs) | کم از کم (روپے) | لږ تر لږه (Rs) |
| `wa.aud.points` | Points expiring | پوائنٹس ختم ہونے والے | نقطې ختمېږي |
| `wa.aud.serviceDue` | Service due | سروس کے وقت والے | د خدمت وخت رارسېدلی |
| `wa.aud.storefront` | Online store customers | آن لائن اسٹور کے گاہک | د آنلاین هټۍ پېرودونکي |
| `wa.aud.tier` | Loyalty tier | لائلٹی درجہ | د وفادارۍ کچه |
| `wa.aud.udhaar` | Udhaar outstanding | بقایا اُدھار والے | پاتې پور |
| `wa.aud.withinDays` | Expiring within (days) | اتنے دن کے اندر ختم ہونے والے (دن) | په دننه کې ختمېږي (ورځې) |
| `wa.camp.audience` | Audience | حاضرین | اورېدونکي |
| `wa.camp.create` | Create campaign | مہم بنائیں | کمپاین جوړ کړئ |
| `wa.camp.empty` | No campaigns yet. Create one from a template and an audience. | ابھی کوئی مہم نہیں۔ ٹیمپلیٹ اور حاضرین چن کر ایک بنائیں۔ | لا کمپاینونه نشته. له یوې بېلګې او اورېدونکو څخه یو جوړ کړئ. |
| `wa.camp.finish` | Finish campaign | مہم ختم کریں | کمپاین بشپړ کړئ |
| `wa.camp.launch` | Launch | شروع کریں | پیل کړئ |
| `wa.camp.name` | Campaign name | مہم کا نام | د کمپاین نوم |
| `wa.camp.namePh` | e.g. Eid week offer | مثلاً عید ہفتہ آفر | د بېلګې په توګه د اختر اونۍ وړاندیز |
| `wa.camp.new` | New campaign | نئی مہم | نوی کمپاین |
| `wa.camp.openQueue` | Open send queue | بھیجنے کی قطار کھولیں | د لېږلو کتار پرانیزئ |
| `wa.camp.progress` | {sent} sent · {skipped} skipped · {total} total | {sent} بھیجے گئے · {skipped} چھوڑے گئے · کل {total} | {sent} لېږل شوي · {skipped} پرېښودل شوي · {total} ټول |
| `wa.camp.queued` | {count} recipients queued | {count} وصول کنندگان قطار میں | {count} ترلاسه کوونکي په کتار کې |
| `wa.camp.reach` | {count} customers will receive this | {count} گاہکوں کو یہ پیغام ملے گا | {count} پېرودونکي به دا ترلاسه کړي |
| `wa.camp.stateDone` | Done | مکمل | بشپړ شو |
| `wa.camp.stateDraft` | Draft | مسودہ | مسوده |
| `wa.camp.stateSending` | Sending | بھیجی جا رہی ہے | لېږل کېږي |
| `wa.camp.sub` | A campaign is a template plus an audience. The audience is worked out live when you launch — never a frozen list. | مہم یعنی ایک ٹیمپلیٹ اور ایک حاضرین کی فہرست۔ فہرست شروع کرتے وقت اسی لمحے کے ڈیٹا سے بنتی ہے — جمی ہوئی فہرست کبھی نہیں۔ | کمپاین یوه بېلګه جمع اورېدونکي دي. اورېدونکي ژوندۍ محاسبه کېږي کله چې تاسو پیل کړئ — هیڅکله کنګل شوی لېست نه دی. |
| `wa.camp.template` | Template | ٹیمپلیٹ | بېلګه |
| `wa.camp.templateNone` | Create a template first | پہلے ایک ٹیمپلیٹ بنائیں | لومړی بېلګه جوړه کړئ |
| `wa.camp.title` | Campaigns | مہمات | کمپاینونه |
| `wa.consent.label` | This customer agrees to receive marketing messages on WhatsApp | یہ گاہک واٹس ایپ پر مارکیٹنگ پیغامات وصول کرنے پر راضی ہے | دا پېرودونکی موافق دی چې په WhatsApp کې د بازارموندنې پیغامونه ترلاسه کړي |
| `wa.consent.off` | WhatsApp marketing: not agreed | واٹس ایپ مارکیٹنگ: رضامندی نہیں ہے | WhatsApp بازارموندنه: موافقه نه ده شوې |
| `wa.consent.on` | WhatsApp marketing: agreed | واٹس ایپ مارکیٹنگ: رضامندی موجود ہے | WhatsApp بازارموندنه: موافقه شوې |
| `wa.consent.optIn` | Opt in | رضامند کریں | ګډون وکړئ |
| `wa.consent.optOut` | Opt out | رضامندی ختم کریں | ګډون ختم کړئ |
| `wa.consent.since` | Recorded on {date} · {source} | {date} کو درج ہوئی · {source} | په {date} ثبت شو · {source} |
| `wa.consent.sourceCounter` | at the counter | کاؤنٹر پر | په کانټر کې |
| `wa.consent.sourceStorefront` | via the online store | آن لائن اسٹور کے ذریعے | د آنلاین هټۍ له لارې |
| `wa.consent.storefrontLabel` | Customer agreed to WhatsApp marketing messages | گاہک واٹس ایپ مارکیٹنگ پیغامات پر راضی ہے | پېرودونکی د WhatsApp بازارموندنې پیغامونو سره موافق دی |
| `wa.consent.storefrontSub` | Tick only when the customer has agreed — the consent is recorded on their customer record as this order converts. | صرف اسی وقت نشان لگائیں جب گاہک راضی ہو — اس آرڈر کی تبدیلی کے ساتھ رضامندی اس کے ریکارڈ میں درج ہو جائے گی۔ | یوازې هغه وخت په نښه کړئ کله چې پېرودونکي موافقه کړې وي — رضایت د دوی د پېرودونکي په ریکارډ کې ثبتېږي کله چې دا امر واړول شي. |
| `wa.consent.sub` | Only customers who agree get campaign messages. Bills, receipts and order updates are not marketing and can always be sent. | مہمات کے پیغامات صرف ان گاہکوں کو جاتے ہیں جو راضی ہوں۔ بل، رسیدیں اور آرڈر کی اطلاعات مارکیٹنگ نہیں ہیں اور ہمیشہ بھیجی جا سکتی ہیں۔ | یوازې هغه پېرودونکي چې موافق وي د کمپاین پیغامونه ترلاسه کوي. بلونه، رسیدونه او د امر تازه معلومات بازارموندنه نه ده او تل لېږل کېدلی شي. |
| `wa.limits.body` | Messages go one by one from your own WhatsApp: tap Send, the chat opens with the message ready, you press send there and come back. Nothing is sent automatically or in bulk, and this app cannot see whether a message was delivered or read — “sent” in the log means you confirmed you sent it. Only customers who agreed receive campaigns, and sending too many messages too fast can get a number restricted by WhatsApp — the one-by-one pace is the protection. | پیغامات آپ کے اپنے واٹس ایپ سے ایک ایک کر کے جاتے ہیں: بھیجیں دبائیں، پیغام تیار حالت میں چیٹ کھلتی ہے، آپ وہاں بھیج کر واپس آتے ہیں۔ کچھ بھی خودکار یا تھوک میں نہیں بھیجا جاتا، اور یہ ایپ یہ نہیں دیکھ سکتی کہ پیغام پہنچا یا پڑھا گیا — ریکارڈ میں «بھیجا گیا» کا مطلب ہے کہ آپ نے تصدیق کی کہ آپ نے بھیجا۔ مہمات صرف ان گاہکوں کو جاتی ہیں جنہوں نے رضامندی دی ہو، اور بہت تیزی سے بہت زیادہ پیغامات بھیجنے پر واٹس ایپ نمبر محدود کر سکتا ہے — ایک ایک کر کے بھیجنے کی رفتار ہی حفاظت ہے۔ | پیغامونه ستاسو له خپل WhatsApp څخه یو په یو ځي: لېږل ټک کړئ، چیټ د چمتو پیغام سره پرانستل کېږي، تاسو هلته لېږئ او بېرته راځئ. هیڅ شی په اتومات ډول یا په ډله ایز ډول نه لېږل کېږي، او دا اپلیکیشن نه شي لیدلی چې پیغام ورسېد یا ولوستل شو — په لاګ کې لېږل شوی مطلب دا دی چې تاسو تایید کړه چې تاسو یې ولېږه. یوازې هغه پېرودونکي چې موافقه یې کړې وي کمپاینونه ترلاسه کوي، او ډېر پیغامونه ډېر ژر لېږل کولی شي شمېره د WhatsApp لخوا محدوده کړي — یو په یو سرعت ساتنه ده. |
| `wa.limits.title` | How sending works — please read | بھیجنے کا طریقہ — براہ کرم پڑھ لیں | لېږل څنګه کار کوي — مهرباني وکړئ ولولئ |
| `wa.lockedBody` | Campaigns, templates and service reminders join the Standard plan. Your customers and their consent choices stay exactly as they are — upgrade to start sending. | مہمات، ٹیمپلیٹس اور سروس ریمائنڈرز اسٹینڈرڈ پلان کے ساتھ ملتے ہیں۔ آپ کے گاہک اور ان کی رضامندی کے فیصلے ویسے کے ویسے رہتے ہیں — بھیجنا شروع کرنے کے لیے پلان بڑھائیں۔ | کمپاینونه، بېلګې او د خدمت یادونې له Standard پلان سره یوځای کېږي. ستاسو پېرودونکي او د دوی د رضایت انتخابونه همداسې پاتې کېږي — د لېږلو پیل کولو لپاره لوړ کړئ. |
| `wa.lockedTitle` | WhatsApp marketing is not in your plan | واٹس ایپ مارکیٹنگ آپ کے پلان میں شامل نہیں | WhatsApp بازارموندنه ستاسو په پلان کې نشته |
| `wa.notice.campaignCreated` | Campaign created as a draft. | مہم مسودے کے طور پر بن گئی۔ | کمپاین د مسودې په توګه جوړ شو. |
| `wa.notice.consentSaved` | Consent updated for {name}. | {name} کی رضامندی تازہ ہو گئی۔ | د {name} لپاره رضایت تازه شو. |
| `wa.notice.finished` | Campaign finished. | مہم ختم ہو گئی۔ | کمپاین بشپړ شو. |
| `wa.notice.launched` | Launched — {count} recipients in the queue. | مہم شروع ہو گئی — {count} وصول کنندگان قطار میں ہیں۔ | پیل شو — {count} ترلاسه کوونکي په کتار کې. |
| `wa.notice.templateDeleted` | Template deleted. | ٹیمپلیٹ حذف ہو گیا۔ | بېلګه ړنګه شوه. |
| `wa.notice.templateSaved` | Template saved. | ٹیمپلیٹ محفوظ ہو گیا۔ | بېلګه خوندي شوه. |
| `wa.queue.done` | This queue is finished — every recipient has a result in the log. | یہ قطار مکمل ہو گئی — ہر وصول کنندہ کا نتیجہ ریکارڈ میں موجود ہے۔ | دا کتار بشپړ شو — هر ترلاسه کوونکی په لاګ کې پایله لري. |
| `wa.queue.honestNote` | “Sent” here means you confirm you sent it in WhatsApp — this app cannot see delivery or reads, and does not pretend to. | یہاں «بھیجا گیا» کا مطلب ہے کہ آپ تصدیق کرتے ہیں کہ آپ نے واٹس ایپ میں بھیج دیا — یہ ایپ ڈیلیوری یا پڑھا جانا نہیں دیکھ سکتی، اور دکھاوا بھی نہیں کرتی۔ | دلته لېږل شوی مطلب دا دی چې تاسو تاییدوئ چې تاسو یې په WhatsApp کې ولېږه — دا اپلیکیشن رسول یا لوستل نه شي لیدلی، او ښيي هم نه. |
| `wa.queue.logEmpty` | Nothing sent yet. | ابھی کچھ نہیں بھیجا گیا۔ | لا هیڅ شی نه دی لېږل شوی. |
| `wa.queue.logTitle` | Send log | بھیجنے کا ریکارڈ | د لېږلو لاګ |
| `wa.queue.messageLabel` | Message for {name} | {name} کے لیے پیغام | د {name} لپاره پیغام |
| `wa.queue.remaining` | {count} remaining | {count} باقی | {count} پاتې |
| `wa.queue.send` | Open in WhatsApp | واٹس ایپ میں کھولیں | په WhatsApp کې پرانیزئ |
| `wa.queue.sent` | I sent it | میں نے بھیج دیا | ما ولېږه |
| `wa.queue.skip` | Skip for now | ابھی چھوڑ دیں | اوس لپاره پرېږدئ |
| `wa.queue.skippedInvalid` | Skipped: this number does not look valid for WhatsApp. | چھوڑ دیا گیا: یہ نمبر واٹس ایپ کے لیے درست نہیں لگتا۔ | پرېښودل شو: دا شمېره د WhatsApp لپاره سمه نه ښکاري. |
| `wa.queue.skippedOptout` | Skipped: this customer is no longer opted in. | چھوڑ دیا گیا: یہ گاہک اب رضامند نہیں رہا۔ | پرېښودل شو: دا پېرودونکی نور ګډون نه لري. |
| `wa.queue.sub` | One customer at a time. Open the chat, send in WhatsApp, come back and confirm. | ایک وقت میں ایک گاہک۔ چیٹ کھولیں، واٹس ایپ میں بھیجیں، واپس آ کر تصدیق کریں۔ | په یو وخت کې یو پېرودونکی. چیټ پرانیزئ، په WhatsApp کې ولېږئ، بېرته راشئ او تایید کړئ. |
| `wa.queue.title` | Send queue | بھیجنے کی قطار | د لېږلو کتار |
| `wa.sendingPaused` | Your plan is not active right now, so launching and sending are paused. Everything here stays readable — renew to send again. | آپ کا پلان اس وقت فعال نہیں، اس لیے مہم شروع کرنا اور بھیجنا رکا ہوا ہے۔ یہاں سب کچھ پڑھا جا سکتا ہے — دوبارہ بھیجنے کے لیے پلان کی تجدید کریں۔ | ستاسو پلان اوس فعال نه دی، نو پیلول او لېږل ځنډول شوي دي. دلته هر څه لوستل کېږي — د بیا لېږلو لپاره نوي کړئ. |
| `wa.sendState.opened` | Opened | کھولا گیا | پرانستل شو |
| `wa.sendState.queued` | Queued | قطار میں | په کتار کې |
| `wa.sendState.sent` | Sent | بھیجا گیا | ولېږل شو |
| `wa.sendState.skipped_invalid` | Skipped · bad number | چھوڑا گیا · غلط نمبر | پرېښودل شو · ناسمه شمېره |
| `wa.sendState.skipped_optout` | Skipped · opted out | چھوڑا گیا · رضامندی ختم | پرېښودل شو · ګډون ختم شو |
| `wa.serviceInterval.label` | Service reminder interval (days) | سروس ریمائنڈر کا وقفہ (دن) | د خدمت یادونې وقفه (ورځې) |
| `wa.serviceInterval.sub` | A delivered job older than this suggests a service reminder. Set by the owner. | اس سے پرانا مکمل شدہ کام سروس ریمائنڈر کی تجویز بنتا ہے۔ یہ مالک مقرر کرتا ہے۔ | له دې څخه زوړ بشپړ شوی کار د خدمت یادونه وړاندیز کوي. د مالک لخوا ټاکل کېږي. |
| `wa.subtitle` | Campaigns to your own customers, from your own WhatsApp number, sent by your own hand. Dukaan AI organises the consent, the lists and the record — the sending stays yours. | اپنے گاہکوں کے لیے مہمات، اپنے واٹس ایپ نمبر سے، اپنے ہاتھ سے بھیجی ہوئی۔ دکان اے آئی رضامندی، فہرستیں اور ریکارڈ سنبھالتی ہے — بھیجنا آپ ہی کا کام رہتا ہے۔ | ستاسو خپلو پېرودونکو ته کمپاینونه، ستاسو له خپل WhatsApp شمېرې څخه، ستاسو په خپل لاس لېږل شوي. Dukaan AI رضایت، لېستونه او ریکارډ تنظیموي — لېږل ستاسو پاتې کېږي. |
| `wa.suggest.pointsSub` | {count} customers · points expire within {days} days | {count} گاہک · پوائنٹس {days} دن کے اندر ختم ہو جائیں گے | {count} پېرودونکي · نقطې په {days} ورځو کې ختمېږي |
| `wa.suggest.pointsTitle` | Points expiring soon | پوائنٹس ختم ہونے والے ہیں | نقطې ژر ختمېږي |
| `wa.suggest.serviceSub` | {count} customers · last job over {days} days ago | {count} گاہک · آخری کام {days} دن سے پرانا | {count} پېرودونکي · وروستی کار له {days} ورځو څخه مخکې |
| `wa.suggest.serviceTitle` | Service due | سروس کا وقت آ گیا | د خدمت وخت رارسېدلی |
| `wa.suggest.start` | Start campaign | مہم شروع کریں | کمپاین پیل کړئ |
| `wa.suggest.sub` | Work your own data is pointing at today. Counts include only customers who agreed to WhatsApp marketing — starting a campaign is always your tap, never automatic. | وہ کام جس کی طرف آج آپ کا اپنا ڈیٹا اشارہ کر رہا ہے۔ گنتی میں صرف وہ گاہک شامل ہیں جنہوں نے واٹس ایپ مارکیٹنگ کی رضامندی دی ہے — مہم شروع کرنا ہمیشہ آپ کا اپنا فیصلہ ہے، خودکار کبھی نہیں۔ | هغه کار چې ستاسو خپل معلومات نن ورته اشاره کوي. شمېرنې یوازې هغه پېرودونکي لري چې د WhatsApp بازارموندنې سره یې موافقه کړې ده — د کمپاین پیلول تل ستاسو ټک دی، هیڅکله اتومات نه دی. |
| `wa.suggest.title` | Suggested reminders | تجویز کردہ ریمائنڈرز | وړاندیز شوې یادونې |
| `wa.suggest.udhaarSub` | {count} customers · udhaar older than {days} days | {count} گاہک · اُدھار {days} دن سے پرانا | {count} پېرودونکي · پور له {days} ورځو څخه زوړ |
| `wa.suggest.udhaarTitle` | Udhaar reminders | اُدھار ریمائنڈرز | د پور یادونې |
| `wa.title` | WhatsApp Marketing | واٹس ایپ مارکیٹنگ | WhatsApp بازارموندنه |
| `wa.tpl.body` | Message | پیغام | پیغام |
| `wa.tpl.bodyPh` | Write the message your customers will receive… | وہ پیغام لکھیں جو گاہکوں کو ملے گا… | هغه پیغام ولیکئ چې ستاسو پېرودونکي به یې ترلاسه کړي… |
| `wa.tpl.delete` | Delete | حذف کریں | ړنګ کړئ |
| `wa.tpl.deleteSure` | Delete this template? Campaigns already sent keep their record. | یہ ٹیمپلیٹ حذف کر دیں؟ پہلے بھیجی گئی مہمات کا ریکارڈ برقرار رہے گا۔ | دا بېلګه ړنګه کړئ؟ لا دمخه لېږل شوي کمپاینونه خپل ریکارډ ساتي. |
| `wa.tpl.empty` | No templates yet. Write one, or start from a starter below. | ابھی کوئی ٹیمپلیٹ نہیں۔ ایک لکھیں، یا نیچے دیے گئے نمونوں سے شروع کریں۔ | لا بېلګې نشته. یوه ولیکئ، یا له لاندې پیل کوونکې څخه پیل وکړئ. |
| `wa.tpl.kind` | Kind | قسم | ډول |
| `wa.tpl.kindPromo` | Promotion | پروموشن | ترویج |
| `wa.tpl.kindReminder` | Reminder | ریمانڈر | یادونه |
| `wa.tpl.name` | Template name | ٹیمپلیٹ کا نام | د بېلګې نوم |
| `wa.tpl.namePh` | e.g. Eid offer | مثلاً عید آفر | د بېلګې په توګه د اختر وړاندیز |
| `wa.tpl.new` | New template | نیا ٹیمپلیٹ | نوې بېلګه |
| `wa.tpl.placeholders` | Placeholders: {name} the customer's name · {shop} your shop's name · {points} their loyalty points · {amount} their outstanding udhaar in rupees | پلیس ہولڈرز: {name} گاہک کا نام · {shop} آپ کی دکان کا نام · {points} اس کے لائلٹی پوائنٹس · {amount} اس کا بقایا اُدھار روپوں میں | ځای ناستي: {name} د پېرودونکي نوم · {shop} ستاسو د هټۍ نوم · {points} د دوی د وفادارۍ نقطې · {amount} د دوی پاتې پور په روپیو کې |
| `wa.tpl.save` | Save template | ٹیمپلیٹ محفوظ کریں | بېلګه خوندي کړئ |
| `wa.tpl.starterPromo1` | Assalam-o-Alaikum {name}, a special offer at {shop} this week — visit us and save on your regular shopping. Reply STOP to opt out. | السلام علیکم {name}، اس ہفتے {shop} پر آپ کے لیے خاص آفر ہے — تشریف لائیں اور اپنی معمول کی خریداری پر بچت کریں۔ رکنے کے لیے STOP لکھ کر جواب دیں۔ | السلام علیکم {name}، دا اونۍ په {shop} کې ځانګړی وړاندیز — راشئ او په خپل منظم پېرود کې سپما وکړئ. د وتلو لپاره STOP ځواب ورکړئ. |
| `wa.tpl.starterPromo1Name` | General offer | عام آفر | عام وړاندیز |
| `wa.tpl.starterPromo2` | Assalam-o-Alaikum {name}, fresh stock has arrived at {shop}. Come by while it lasts — and you have {points} loyalty points waiting to spend. | السلام علیکم {name}، {shop} پر تازہ اسٹاک آ گیا ہے۔ ختم ہونے سے پہلے تشریف لائیں — اور آپ کے {points} لائلٹی پوائنٹس بھی خرچ ہونے کے منتظر ہیں۔ | السلام علیکم {name}، په {shop} کې تازه موجودي رارسېدلې ده. تر هغه چې وي راشئ — او تاسو {points} د وفادارۍ نقطې لرئ چې مصرفولو ته چمتو دي. |
| `wa.tpl.starterPromo2Name` | New stock | نیا اسٹاک | نوې موجودي |
| `wa.tpl.starterReminder1` | Assalam-o-Alaikum {name}, a gentle reminder from {shop}: Rs {amount} is outstanding on your account. Please clear it when convenient — thank you. | السلام علیکم {name}، {shop} کی طرف سے ایک مہذب یاددہانی: آپ کے کھاتے میں {amount} روپے بقایا ہیں۔ سہولت کے مطابق ادا کر دیں — شکریہ۔ | السلام علیکم {name}، له {shop} څخه یوه نرمه یادونه: ستاسو په حساب کې Rs {amount} پاتې دي. مهرباني وکړئ کله چې اسانه وي تصفیه یې کړئ — مننه. |
| `wa.tpl.starterReminder1Name` | Udhaar reminder | اُدھار ریمائنڈر | د پور یادونه |
| `wa.tpl.starterReminder2` | Assalam-o-Alaikum {name}, you have {points} loyalty points at {shop} that expire soon. Use them on your next visit so they are not lost. | السلام علیکم {name}، {shop} پر آپ کے {points} لائلٹی پوائنٹس جلد ختم ہونے والے ہیں۔ اگلی خریداری پر استعمال کر لیں تاکہ ضائع نہ ہوں۔ | السلام علیکم {name}، تاسو په {shop} کې {points} د وفادارۍ نقطې لرئ چې ژر ختمېږي. په خپل راتلونکي لیدنه کې یې وکاروئ تر څو له لاسه ورنه کړئ. |
| `wa.tpl.starterReminder2Name` | Points expiring | پوائنٹس ختم ہونے والے ہیں | نقطې ختمېږي |
| `wa.tpl.starters` | Starter templates — copy, then make them yours | نمونہ ٹیمپلیٹس — نقل کریں، پھر اپنے بنا لیں | پیل کوونکې بېلګې — کاپي کړئ، بیا یې خپلې کړئ |
| `wa.tpl.sub` | Your own words, reused. Placeholders fill in per customer when the queue reaches them. | آپ کے اپنے الفاظ، بار بار استعمال کے لیے۔ جب قطار کسی گاہک تک پہنچتی ہے تو پلیس ہولڈرز اسی کے حساب سے بھر جاتے ہیں۔ | ستاسو خپلې خبرې، بیا کارول شوې. ځای ناستي د هر پېرودونکي لپاره ډکېږي کله چې کتار دوی ته ورسېږي. |
| `wa.tpl.title` | Message templates | پیغام کے ٹیمپلیٹس | د پیغام بېلګې |
| `wa.tpl.use` | Use this | یہ استعمال کریں | دا وکاروئ |
## dash

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `dash.activity.bill` | Bill #{no} | بل نمبر {no} | بل #{no} |
| `dash.activity.empty` | No bills or expenses recorded yet. | ابھی کوئی بل یا خرچ درج نہیں۔ | لا هیڅ بل یا لګښت نه دی ثبت شوی. |
| `dash.activity.title` | Recent activity | حالیہ سرگرمی | وروستۍ کړنې |
| `dash.alerts.expEmpty` | Nothing expiring in the next 30 days. | اگلے 30 دن میں کسی چیز کی میعاد ختم نہیں ہو رہی۔ | په راتلونکو 30 ورځو کې هیڅ شی نه ختمېږي. |
| `dash.alerts.expired` | Expired | میعاد ختم ہو چکی | ختم شوی |
| `dash.alerts.expiresIn` | expires in {days} days | میعاد {days} دن میں ختم | په {days} ورځو کې ختمېږي |
| `dash.alerts.expiring` | Expiring soon | میعاد ختم ہونے کے قریب | ژر ختمېږي |
| `dash.alerts.left` | left | باقی | پاتې |
| `dash.alerts.lowEmpty` | Nothing below reorder level. Shelf is healthy. | کوئی چیز ری آرڈر سطح سے نیچے نہیں۔ شیلف ٹھیک ہے۔ | هیڅ شی د بیا امر له کچې څخه ښکته نه دی. المارۍ روغه ده. |
| `dash.alerts.lowStock` | Low stock | کم اسٹاک | کم موجودي |
| `dash.alerts.outOfStock` | Out of stock | اسٹاک ختم | موجودي ختمه ده |
| `dash.alerts.title` | Needs attention | توجہ طلب امور | پاملرنې ته اړتیا لري |
| `dash.askAi` | Ask the AI assistant | اے آئی اسسٹنٹ سے پوچھیں | له AI مرستیال څخه وپوښتئ |
| `dash.chart.aria` | Bar chart of daily revenue for the last 14 days. Total: {total}. | پچھلے 14 دن کی روزانہ آمدن کا بار چارٹ۔ کل آمدن: {total}۔ | د تېرو 14 ورځو د ورځني عوایدو بار چارټ. ټول: {total}. |
| `dash.chart.caption` | Daily counter totals, oldest to today. | روزانہ کی فروخت — پرانے دن سے آج تک۔ | د ورځني کانټر ټول، له زاړه څخه تر نن پورې. |
| `dash.chart.noData` | No sales recorded in the last 14 days yet. | پچھلے 14 دن میں ابھی کوئی فروخت درج نہیں ہوئی۔ | په تېرو 14 ورځو کې لا پلور نه دی ثبت شوی. |
| `dash.chart.title` | Last 14 days revenue | پچھلے 14 دن کی آمدن | د تېرو 14 ورځو عواید |
| `dash.eyebrow` | Shop overview | دکان کا جائزہ | د هټۍ کتنه |
| `dash.greeting` | Assalam-o-Alaikum, Shopkeeper! | السلام علیکم، دکاندار صاحب! | السلام علیکم، هټۍ واله! |
| `dash.insight.checkPlan` | Check the reorder plan | ری آرڈر منصوبہ دیکھیں | د بیا امر پلان وګورئ |
| `dash.insight.down` | down | کم | ښکته |
| `dash.insight.lowCount` | {count} items at or below reorder level. | {count} اشیاء ری آرڈر سطح پر یا اس سے نیچے ہیں۔ | {count} توکي د بیا امر په کچه یا ترې ښکته دي. |
| `dash.insight.runOut` | {name} will run out in about {days} days at the current rate ({perDay} per day). Suggested reorder: {qty} {unit}. | {name} موجودہ رفتار ({perDay} یومیہ) پر تقریباً {days} دن میں ختم ہو جائے گا۔ تجویز کردہ ری آرڈر: {qty} {unit}۔ | {name} به د اوسني نرخ ({perDay} په ورځ کې) له مخې شاوخوا په {days} ورځو کې ختم شي. وړاندیز شوی بیا امر: {qty} {unit}. |
| `dash.insight.todayVsAvg` | Today's revenue is {dir} {pct}% vs your 7-day average of {avg}. | آج کی آمدن 7 دن کی اوسط {avg} کے مقابلے میں {pct} فیصد {dir} ہے۔ | د نن ورځې عواید ستاسو د 7 ورځو اوسط {avg} په پرتله {dir} {pct}% دي. |
| `dash.insight.topSeller` | {name} is your star performer — {units} units sold in the last 7 days. Keep its shelf full. | {name} آپ کی سرفہرست چیز ہے — پچھلے 7 دن میں {units} یونٹ فروخت ہوئے۔ اس کی شیلف بھری رکھیں۔ | {name} ستاسو تر ټولو غوره پلورونکی دی — په تېرو 7 ورځو کې {units} واحدونه وپلورل شول. المارۍ یې ډکه وساتئ. |
| `dash.insight.up` | up | زیادہ | پورته |
| `dash.insights.caption` | Computed live from your sales history — no guesswork. | آپ کی فروخت کی تاریخ سے براہِ راست حساب — محض اندازے نہیں۔ | ستاسو د پلور له تاریخ څخه ژوندۍ محاسبه شوې — اټکل نه دی. |
| `dash.insights.empty` | Not enough data yet — record a few sales first. | ابھی ڈیٹا ناکافی ہے — پہلے کچھ فروخت درج کریں۔ | لا کافي معلومات نشته — لومړی څو پلورونه ثبت کړئ. |
| `dash.insights.title` | AI insights | اے آئی تجزیے | د AI بصیرتونه |
| `dash.kpi.monthProfit` | Net profit · this month | اس مہینے کا خالص منافع | خالصه ګټه · دا میاشت |
| `dash.kpi.stockSub` | Retail {retail} · {count} products on shelf | خوردہ قیمت {retail} · {count} اشیاء شیلف پر | پرچون {retail} · {count} توکي په المارۍ کې |
| `dash.kpi.stockValue` | Stock value (cost) | اسٹاک کی قیمت (لاگت قیمت پر) | د موجودي ارزښت (په لګښت) |
| `dash.kpi.todayProfit` | Today's profit | آج کا منافع | د نن ورځې ګټه |
| `dash.kpi.todaySales` | Today's sales | آج کی فروخت | د نن ورځې پلور |
| `dash.lead` | Your dukaan at a glance — stock health, today's counter, and what the AI thinks you should do next. | آپ کی دکان ایک نظر میں — اسٹاک کی صورتحال، آج کی فروخت، اور اے آئی کی اگلی تجاویز۔ | ستاسو هټۍ په یوه کتنه کې — د موجودي حالت، د نن ورځې پلور، او هغه څه چې AI یې وړاندیز کوي تاسو ورپسې وکړئ. |
| `dash.loading` | Loading shop data… | دکان کا ڈیٹا لوڈ ہو رہا ہے… | د هټۍ معلومات بارېږي… |
| `dash.money.cash` | Cash in hand | ہاتھ میں نقد رقم | په لاس کې نغدې |
| `dash.money.expenses` | Expenses · this month | اس مہینے کے اخراجات | لګښتونه · دا میاشت |
| `dash.money.payable` | Supplier payable | سپلائرز کو واجب الادا | عرضه کوونکي ته د ورکړې وړ |
| `dash.money.title` | Money snapshot | رقوم کا خلاصہ | د پیسو لنډیز |
| `dash.money.udhaar` | Udhaar outstanding | بقایا ادھار | پاتې پور |
| `dash.resetDemo` | Reset demo data | ڈیمو ڈیٹا ری سیٹ کریں | ډیمو معلومات بیا تنظیم کړئ |
| `dash.top.caption` | Best sellers by units sold, last 14 days. | پچھلے 14 دن میں یونٹ کے حساب سے سرفہرست اشیاء۔ | په تېرو 14 ورځو کې د پلورل شویو واحدونو له مخې غوره پلورونکي. |
| `dash.top.empty` | No sales in the last 14 days yet. | پچھلے 14 دن میں ابھی کوئی فروخت نہیں ہوئی۔ | په تېرو 14 ورځو کې لا پلور نه دی شوی. |
| `dash.top.title` | Top products | زیادہ بکنے والی اشیاء | غوره توکي |
| `dash.top.units` | {n} units sold | {n} یونٹ فروخت | {n} واحدونه وپلورل شول |
| `dash.trend.new` | New | نیا آغاز | نوی |
| `dash.trend.vsLastMonth` | {sign}{pct}% vs last month | پچھلے مہینے کے مقابلے میں {sign}{pct} فیصد | {sign}{pct}% د تېرې میاشتې په پرتله |
| `dash.trend.vsYesterday` | {sign}{pct}% vs yesterday | کل کے مقابلے میں {sign}{pct} فیصد | {sign}{pct}% د پرون په پرتله |
## common

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `action.add` | Add | شامل کریں | زیات کړئ |
| `action.askAi` | Ask AI | اے آئی سے پوچھیں | له AI څخه وپوښتئ |
| `action.back` | Back | واپس | بېرته |
| `action.cancel` | Cancel | منسوخ کریں | لغوه کړئ |
| `action.clearSearch` | Clear search | تلاش صاف کریں | لټون پاک کړئ |
| `action.close` | Close | بند کریں | وتړئ |
| `action.confirm` | Confirm | تصدیق کریں | تایید کړئ |
| `action.delete` | Delete | حذف کریں | ړنګ کړئ |
| `action.edit` | Edit | تبدیل کریں | سمون |
| `action.login` | Login | لاگ اِن | ننوتل |
| `action.logout` | Logout | لاگ آؤٹ | وتل |
| `action.print` | Print | پرنٹ کریں | چاپ کړئ |
| `action.record` | Record | درج کریں | ثبت کړئ |
| `action.remove` | Remove | ہٹائیں | لرې کړئ |
| `action.save` | Save | محفوظ کریں | خوندي کړئ |
| `action.search` | Search | تلاش کریں | لټون |
| `action.signup` | Sign up | سائن اپ | راجسترېدل |
| `action.viewAll` | View all | تمام دیکھیں | ټول وګورئ |
| `action.whatsapp` | WhatsApp | WhatsApp | WhatsApp |
| `common.accessDenied` | Access restricted | رسائی محدود ہے | لاسرسی محدود دی |
| `common.accessDeniedBody` | Your role in this shop does not include this section. Ask the shop owner if you need access. | اس دکان میں آپ کے کردار میں یہ حصہ شامل نہیں ہے۔ رسائی درکار ہو تو دکان کے مالک سے رجوع کریں۔ | په دې هټۍ کې ستاسو په رول کې دا برخه نشته. که لاسرسي ته اړتیا لرئ، د هټۍ له مالک سره خبرې وکړئ. |
| `common.account` | Account | کھاتہ | حساب |
| `common.actions` | Actions | کارروائی | کړنې |
| `common.address` | Address | پتا | پته |
| `common.all` | All | تمام | ټول |
| `common.amount` | Amount | رقم | مبلغ |
| `common.currency` | Rs | روپے | روپۍ |
| `common.date` | Date | تاریخ | نېټه |
| `common.expenseCat.electricity` | Electricity | بجلی | برېښنا |
| `common.expenseCat.other` | Other | دیگر | نور |
| `common.expenseCat.rent` | Rent | کرایہ | کرایه |
| `common.expenseCat.salary` | Salary | تنخواہ | معاش |
| `common.expenseCat.transport` | Transport | نقل و حمل | ترانسپورت |
| `common.items` | items | اشیاء | توکي |
| `common.loading` | Loading… | لوڈ ہو رہا ہے… | بارېږي… |
| `common.month.0` | January | جنوری | جنوري |
| `common.month.1` | February | فروری | فبروري |
| `common.month.10` | November | نومبر | نومبر |
| `common.month.11` | December | دسمبر | ډسمبر |
| `common.month.2` | March | مارچ | مارچ |
| `common.month.3` | April | اپریل | اپریل |
| `common.month.4` | May | مئی | مې |
| `common.month.5` | June | جون | جون |
| `common.month.6` | July | جولائی | جولای |
| `common.month.7` | August | اگست | اګست |
| `common.month.8` | September | ستمبر | سپتمبر |
| `common.month.9` | October | اکتوبر | اکتوبر |
| `common.name` | Name | نام | نوم |
| `common.none` | None | کوئی نہیں | هیڅ |
| `common.noResults` | Nothing found. | کچھ نہیں ملا۔ | هیڅ ونه موندل شول. |
| `common.notes` | Notes | نوٹ | یادښتونه |
| `common.pay.bank` | Bank | بینک | بانک |
| `common.pay.cash` | Cash | نقد | نغدې |
| `common.pay.credit` | Credit (Udhaar) | ادھار | پور (ادھار) |
| `common.pay.easypaisa` | Easypaisa | Easypaisa | Easypaisa |
| `common.pay.jazzcash` | JazzCash | JazzCash | JazzCash |
| `common.perDay` | /day | /دن | /ورځ |
| `common.phone` | Phone | فون | تلیفون |
| `common.status` | Status | حالت | حالت |
| `common.today` | Today | آج | نن |
| `common.total` | Total | کل | ټول |
| `common.weekday.0` | Sunday | اتوار | یکشنبه |
| `common.weekday.1` | Monday | پیر | دوشنبه |
| `common.weekday.2` | Tuesday | منگل | سه شنبه |
| `common.weekday.3` | Wednesday | بدھ | چهارشنبه |
| `common.weekday.4` | Thursday | جمعرات | پنجشنبه |
| `common.weekday.5` | Friday | جمعہ | جمعه |
| `common.weekday.6` | Saturday | ہفتہ | شنبه |
| `common.yesterday` | Yesterday | کل | پرون |
| `nav.assistant` | AI Assistant | اے آئی معاون | AI مرستیال |
| `nav.billing` | Billing | بلنگ | بل جوړول |
| `nav.credit` | Credit · Udhaar | ادھار کھاتہ | پور · ادھار |
| `nav.customers` | Customers | گاہک | پېرودونکي |
| `nav.dashboard` | Dashboard | ڈیش بورڈ | ډشبورډ |
| `nav.dayclose` | Day Close | دن کا حساب | د ورځې تړل |
| `nav.expenses` | Expenses | اخراجات | لګښتونه |
| `nav.finance` | Finance | مالیات | مالي چارې |
| `nav.forecast` | Forecast | پیش گوئی | وړاندوینه |
| `nav.group.finance` | Finance | مالیات | مالي چارې |
| `nav.group.main` | Main | مرکزی | اصلي |
| `nav.group.manage` | Manage | انتظام | اداره |
| `nav.group.system` | System | نظام | سیستم |
| `nav.inventory` | Inventory | اسٹاک | زېرمه |
| `nav.sales` | Sales | فروخت | پلور |
| `nav.settings` | Settings | ترتیبات | ترتیبات |
| `nav.suppliers` | Suppliers | سپلائرز | عرضه کوونکي |
## shell

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `shell.backHome` | Back to dashboard | ڈیش بورڈ پر واپس جائیں | ډشبورډ ته بېرته لاړ شئ |
| `shell.brandFallback` | Dukaan AI | Dukaan AI | Dukaan AI |
| `shell.checkingSession` | Checking your session… | سیشن چیک ہو رہا ہے… | ستاسو سېشن کتل کېږي… |
| `shell.chooseTheme` | Choose theme | تھیم منتخب کریں | تیم وټاکئ |
| `shell.closeMenu` | Close menu | مینیو بند کریں | مینو بند کړئ |
| `shell.collapseSidebar` | Collapse sidebar | سائیڈبار سکیڑیں | اړخ پټه راټوله کړئ |
| `shell.demoBadgeTitle` | Bundled sample data — connect Firebase to go live | نمونہ ڈیٹا چل رہا ہے — لائیو کرنے کے لیے Firebase جوڑیں | نمونوي معلومات چلېږي — ژوندي کولو لپاره Firebase سره وصل کړئ |
| `shell.demoMode` | Demo mode | ڈیمو موڈ | ډیمو موډ |
| `shell.demoPill` | Demo project — all data is fictional | ڈیمو پروجیکٹ — تمام ڈیٹا فرضی ہے | ډیمو پروژه — ټول معلومات فرضي دي |
| `shell.expandSidebar` | Expand sidebar | سائیڈبار پھیلائیں | اړخ پټه پراخه کړئ |
| `shell.footerAboutHeading` | About | ہمارے بارے میں | زموږ په اړه |
| `shell.footerAppHeading` | App | ایپ | ایپ |
| `shell.footerByDemo` | Demo AI project crafted by | ڈیمو اے آئی پروجیکٹ — تیار کردہ | ډیمو AI پروژه — جوړه کړې |
| `shell.footerByProd` | Shop management system by | دکان مینجمنٹ سسٹم — تیار کردہ | د هټۍ مدیریت سیسټم — د |
| `shell.footerColCompany` | Company & System | کمپنی اور نظام | شرکت او سیسټم |
| `shell.footerColFinance` | Finance & Reports | مالیات اور رپورٹیں | مالي چارې او راپورونه |
| `shell.footerColGrowth` | Customers & Growth | گاہک اور کاروباری فروغ | پېرودونکي او وده |
| `shell.footerColSales` | Sales & Orders | فروخت اور آرڈرز | پلور او امرونه |
| `shell.footerColStock` | Stock & Operations | اسٹاک اور آپریشن | موجودي او عملیات |
| `shell.footerRights` | © 2026 Dukaan AI | © 2026 Dukaan AI | © 2026 Dukaan AI |
| `shell.footerRightsDemo` | © 2026 Dukaan AI · Fictional demo data | © 2026 Dukaan AI · فرضی ڈیمو ڈیٹا | © 2026 Dukaan AI · فرضي ډیمو معلومات |
| `shell.footerTagline` | A complete ERP for every kind of business — smart stock, sales and accounts, demand forecasting, and an AI assistant that answers from your business's own data. | ہر قسم کے کاروبار کے لیے مکمل ERP — اسمارٹ اسٹاک، فروخت اور حساب، طلب کی پیشن گوئی، اور ایک آئی معاون جو آپ کے کاروبار کے ڈیٹا سے جواب دیتا ہے۔ | د هر ډول کاروبار لپاره بشپړ ERP — هوښیار موجودي، پلور او حسابونه، د تقاضا وړاندوینه، او د AI مرستیال چې ستاسو د کاروبار له خپلو معلوماتو څخه ځواب ورکوي۔ |
| `shell.footerTech` | Next.js · Firebase · Flutter | Next.js · Firebase · Flutter | Next.js · Firebase · Flutter |
| `shell.homeLabel` | Dukaan AI home | Dukaan AI ہوم | Dukaan AI کور |
| `shell.langName` | English | اردو | پښتو |
| `shell.mainNav` | Main navigation | مرکزی نیویگیشن | اصلي لارښود |
| `shell.menu` | Menu | مینیو | مینو |
| `shell.notFoundBody` | This page doesn't exist in the dukaan. Let's head back to the counter. | یہ صفحہ دکان میں موجود نہیں۔ آئیے واپس ڈیش بورڈ کی طرف چلیں۔ | دا پاڼه په هټۍ کې نشته۔ راځئ بېرته ډشبورډ ته لاړ شو۔ |
| `shell.notFoundTitle` | Shelf not found | صفحہ نہیں ملا | پاڼه ونه موندل شوه |
| `shell.openMenu` | Open menu | مینیو کھولیں | مینو پرانیزئ |
| `shell.theme.dusk` | Dusk Violet | شفق بنفشی | ماښامي بنفشي |
| `shell.theme.emerald` | Emerald Calm | زمردی سکون | زمردي سکون |
| `shell.theme.midnight` | Midnight Slate | نیم شب سلیٹ | نیمې شپې سلیټ |
| `shell.theme.ocean` | Ocean | سمندری لہر | سمندري څپه |
| `shell.theme.sand` | Warm Sand | گرم ریت | ګرمې شګې |
| `shell.toggleTheme` | Switch theme | تھیم بدلیں | تیم بدل کړئ |
| `sync.online` | Online | آن لائن | آنلاین |
## auth

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `auth.createAccountLink` | Create an account | اکاؤنٹ بنائیں | حساب جوړ کړئ |
| `auth.demoNote` | Accounts are not enabled on this demo deployment. The shop data you see is bundled sample data — no login needed. | اس ڈیمو پر اکاؤنٹ سسٹم فعال نہیں ہے۔ آپ جو دکان کا ڈیٹا دیکھ رہے ہیں وہ نمونہ ڈیٹا ہے — لاگ اِن کی ضرورت نہیں۔ | په دې ډیمو کې حسابونه فعال نه دي. د هټۍ معلومات چې تاسو یې ګورئ، بنډل شوي نمونه معلومات دي — ننوتل پکار نه دي. |
| `auth.email` | Email | ای میل | برېښنالیک |
| `auth.emailPlaceholder` | you@example.com | you@example.com | you@example.com |
| `auth.err.emailInUse` | An account with this email already exists — try logging in. | اس ای میل سے اکاؤنٹ پہلے سے موجود ہے — لاگ اِن کر کے دیکھیں۔ | په دې برېښنالیک یو حساب مخکې شته — د ننوتلو هڅه وکړئ. |
| `auth.err.generic` | Something went wrong. Please try again. | کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔ | یو څه غلط شو. مهرباني وکړئ بیا هڅه وکړئ. |
| `auth.err.invalidCredential` | Email or password is incorrect. | ای میل یا پاس ورڈ غلط ہے۔ | برېښنالیک یا پټنوم ناسم دی. |
| `auth.err.invalidEmail` | That email address looks invalid. | یہ ای میل درست نہیں لگتی۔ | دا برېښنالیک پته سمه نه ښکاري. |
| `auth.err.network` | Network error — check your connection. | نیٹ ورک کا مسئلہ ہے — اپنا کنکشن چیک کریں۔ | د شبکې تېروتنه — خپله اړیکه وګورئ. |
| `auth.err.tooMany` | Too many attempts — wait a moment and try again. | بہت زیادہ کوششیں ہو گئی ہیں — تھوڑی دیر بعد دوبارہ کوشش کریں۔ | ډېرې هڅې وشوې — لږ انتظار وکړئ او بیا هڅه وکړئ. |
| `auth.err.weakPassword` | Password must be at least 6 characters. | پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔ | پټنوم باید لږ تر لږه 6 توري وي. |
| `auth.eyebrow` | Dukaan AI Account | Dukaan AI اکاؤنٹ | Dukaan AI حساب |
| `auth.haveAccount` | Already have an account? | پہلے سے اکاؤنٹ موجود ہے؟ | مخکې له مخکې حساب لرئ؟ |
| `auth.loginLink` | Log in | لاگ اِن | ننوتل |
| `auth.loginSub` | Log in to see your shop's live inventory, sales and forecasts. | اپنی دکان کا اسٹاک، فروخت اور پیش گوئی دیکھنے کے لیے لاگ اِن کریں۔ | د خپلې هټۍ ژوندی موجودي، پلور او وړاندوینې لیدلو لپاره ننوځئ. |
| `auth.loginTitle` | Welcome back | خوش آمدید | ښه راغلاست |
| `auth.newHere` | New to Dukaan AI? | Dukaan AI پر نئے ہیں؟ | په Dukaan AI کې نوي یاست؟ |
| `auth.password` | Password | پاس ورڈ | پټنوم |
| `auth.passwordPlaceholder` | •••••••• | •••••••• | •••••••• |
| `auth.signupSub` | Sign up to run your shop on Dukaan AI — your data stays private to your account. | Dukaan AI پر اپنی دکان چلانے کے لیے سائن اپ کریں — آپ کا ڈیٹا صرف آپ کے اکاؤنٹ تک محفوظ رہے گا۔ | په Dukaan AI کې خپله هټۍ چلولو لپاره نوم لیکنه وکړئ — ستاسو معلومات یوازې ستاسو حساب ته خصوصي پاتې کېږي. |
| `auth.signupTitle` | Create your shop account | اپنی دکان کا اکاؤنٹ بنائیں | د خپلې هټۍ حساب جوړ کړئ |
| `auth.submitLogin` | Log in | لاگ اِن | ننوتل |
| `auth.submitSignup` | Create account | اکاؤنٹ بنائیں | حساب جوړ کړئ |
| `auth.wait` | Please wait… | براہ کرم انتظار کریں… | مهرباني وکړئ انتظار وکړئ… |
## settings

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `backup.exportBody` | Downloads one JSON file with the complete business: every collection, the full journal, and this business's own platform records (registry, memberships, counters, events, payments). | ایک JSON فائل ڈاؤن لوڈ ہوگی جس میں مکمل کاروبار ہوگا: تمام کلیکشنز، مکمل جرنل، اور اس کاروبار کے اپنے پلیٹ فارم ریکارڈ (رجسٹری، رکنیتیں، کاؤنٹرز، واقعات، ادائیگیاں)۔ | یو JSON فایل ډاونلوډ کوي چې بشپړ کاروبار پکې دی: هره ټولګه، بشپړ ژورنال، او د دې کاروبار خپل پلیټ فارم ریکارډونه (ثبت، غړیتوبونه، شمېرونکي، پېښې، تادیې)۔ |
| `backup.exportButton` | Download backup | بیک اپ ڈاؤن لوڈ کریں | بیک اپ ډاونلوډ کړئ |
| `backup.exportDone` | Backup downloaded — {docs} documents, {journal} journal entries. | بیک اپ ڈاؤن لوڈ ہو گیا — {docs} دستاویزات، {journal} جرنل اندراجات۔ | بیک اپ ډاونلوډ شو — {docs} اسناد، {journal} ژورنال ننوتنې۔ |
| `backup.exportFailed` | The backup could not be prepared. Nothing was changed. | بیک اپ تیار نہیں ہو سکا۔ کچھ تبدیل نہیں ہوا۔ | بیک اپ چمتو نه شو۔ هېڅ شی بدل نه شو۔ |
| `backup.exporting` | Preparing… | تیار ہو رہا ہے… | چمتو کېږي… |
| `backup.exportTitle` | Export backup | بیک اپ ایکسپورٹ کریں | بیک اپ صادر کړئ |
| `backup.fingerprint` | Journal fingerprint | جرنل فنگر پرنٹ | د ژورنال ګوتې نښه |
| `backup.ownerOnly` | Only the business owner can back up or restore. | صرف کاروبار کا مالک بیک اپ یا بحالی کر سکتا ہے۔ | یوازې د کاروبار مالک بیک اپ یا بحالولی شي۔ |
| `backup.refused.manifestMismatch` | The file does not match its own manifest (counts or the journal fingerprint differ) — it may be damaged or edited. Nothing was written. | فائل اپنے مینی فیسٹ سے نہیں ملتی (تعداد یا جرنل فنگر پرنٹ مختلف ہے) — ممکن ہے فائل خراب یا تبدیل شدہ ہو۔ کچھ نہیں لکھا گیا۔ | فایل له خپل مینیفیسټ سره سمون نه خوري (شمېرې یا د ژورنال ګوتې نښه توپیر لري) — ممکن زیانمن شوی یا سم شوی وي۔ هېڅ ونه لیکل شو۔ |
| `backup.refused.notABackup` | That file is not a Dukaan AI business backup. | یہ فائل دکان AI کے کاروبار کا بیک اپ نہیں ہے۔ | هغه فایل د Dukaan AI کاروبار بیک اپ نه دی۔ |
| `backup.refused.targetNotEmpty` | This business is not empty — restore is refused so a live book is never overwritten. Create a new business and restore there. | یہ کاروبار خالی نہیں ہے — بحالی سے انکار ہے تاکہ چلتا کھاتہ کبھی اوور رائٹ نہ ہو۔ نیا کاروبار بنائیں اور وہاں بحال کریں۔ | دا کاروبار تش نه دی — بحالول رد شو ترڅو ژوندی کتاب هېڅکله ونه لیکل شي۔ نوی کاروبار جوړ کړئ او هلته بحال کړئ۔ |
| `backup.refused.unknownFormat` | That backup uses a format this version does not know — use a backup exported by this version. | یہ بیک اپ ایسے فارمیٹ میں ہے جسے یہ ورژن نہیں جانتا — اسی ورژن سے ایکسپورٹ شدہ بیک اپ استعمال کریں۔ | هغه بیک اپ داسې بڼه کاروي چې دا نسخه یې نه پېژني — د دې نسخې لخوا صادر شوی بیک اپ وکاروئ۔ |
| `backup.restoreAlready` | This backup is already fully restored here — nothing to write. | یہ بیک اپ یہاں پہلے ہی مکمل بحال ہے — لکھنے کو کچھ نہیں۔ | دا بیک اپ دمخه دلته په بشپړ ډول بحال شوی — د لیکلو لپاره هېڅ نشته۔ |
| `backup.restoreBody` | Restore works ONLY into a new, empty business — the books here must be empty. A live business is never overwritten: restore the file into a fresh business and trade there. | بحالی صرف نئے، خالی کاروبار میں ممکن ہے — یہاں کے کھاتے خالی ہونے چاہئیں۔ چلتا ہوا کاروبار کبھی اوور رائٹ نہیں ہوتا: فائل کو نئے کاروبار میں بحال کریں اور وہیں کاروبار کریں۔ | بحالول یوازې په نوي، تش کاروبار کې کار کوي — دلته کتابونه باید تش وي۔ ژوندی کاروبار هېڅکله نه لیکل کېږي: فایل په تازه کاروبار کې بحال کړئ او هلته سوداګري وکړئ۔ |
| `backup.restoreConfirm` | Restore into this business | اس کاروبار میں بحال کریں | په دې کاروبار کې بحال کړئ |
| `backup.restoreDone` | Restore complete — {written} documents written. This business now holds the backup's books. | بحالی مکمل — {written} دستاویزات لکھی گئیں۔ اب اس کاروبار میں بیک اپ کے کھاتے ہیں۔ | بحالول بشپړ شو — {written} اسناد ولیکل شول۔ دا کاروبار اوس د بیک اپ کتابونه لري۔ |
| `backup.restoreFailed` | The restore could not be completed. Anything already written matches the backup exactly — pick the same file again to resume. | بحالی مکمل نہیں ہو سکی۔ جو کچھ لکھا جا چکا ہے وہ بیک اپ سے حرف بہ حرف ملتا ہے — دوبارہ یہی فائل منتخب کر کے بحالی آگے بڑھائیں۔ | بحالول بشپړ نه شو۔ هغه څه چې دمخه لیکل شوي په سمه توګه له بیک اپ سره سمون خوري — د بیا پیل لپاره هماغه فایل بیا وټاکئ۔ |
| `backup.restorePick` | Choose backup file | بیک اپ فائل منتخب کریں | د بیک اپ فایل وټاکئ |
| `backup.restoreReading` | Checking the file… | فائل جانچی جا رہی ہے… | فایل کتل کېږي… |
| `backup.restoreSource` | Backup of {business} · exported {date} | {business} کا بیک اپ · ایکسپورٹ {date} | د {business} بیک اپ · صادر شو {date} |
| `backup.restoreSummary` | {docs} documents to write ({journal} journal entries) — fingerprint verified against the file's own manifest. | {docs} دستاویزات لکھی جائیں گی ({journal} جرنل اندراجات) — فنگر پرنٹ فائل کے اپنے مینی فیسٹ سے تصدیق شدہ ہے۔ | {docs} اسناد د لیکلو لپاره ({journal} ژورنال ننوتنې) — د ګوتې نښه د فایل د خپل مینیفیسټ په وړاندې تایید شوه۔ |
| `backup.restoreTitle` | Restore into this business | اس کاروبار میں بحال کریں | په دې کاروبار کې بحال کړئ |
| `backup.restoring` | Restoring… | بحالی جاری ہے… | بحالېږي… |
| `backup.sub` | Your whole business in one file — every bill, entry and record. The file is yours: export works in every plan state, always. | آپ کا پورا کاروبار ایک فائل میں — ہر بل، ہر اندراج، ہر ریکارڈ۔ یہ فائل آپ کی ملکیت ہے: ایکسپورٹ ہر پلان حالت میں ہمیشہ ممکن ہے۔ | ستاسو ټول کاروبار په یوه فایل کې — هر بل، ننوتنه او ریکارډ۔ فایل ستاسو دی: صادرول په هر پلان حالت کې کار کوي، تل۔ |
| `backup.title` | Backup & restore | بیک اپ اور بحالی | بیک اپ او بحالول |
| `settings.accountEmail` | Email | ای میل | برېښنالیک |
| `settings.accountMode` | Mode | موڈ | موډ |
| `settings.accountRole` | Role | کردار | رول |
| `settings.accountSub` | Your sign-in details for this shop. | اس دکان کے لیے آپ کی لاگ اِن تفصیلات۔ | د دې هټۍ لپاره ستاسو د ننوتلو جزیات۔ |
| `settings.accountTitle` | Account | اکاؤنٹ | حساب |
| `settings.acct.add` | Add account | کھاتہ شامل کریں | حساب زیات کړئ |
| `settings.acct.addTitle` | Add an account | نیا کھاتہ شامل کریں | یو حساب زیات کړئ |
| `settings.acct.amount` | Amount (PKR) * | رقم (روپے) * | مبلغ (PKR) * |
| `settings.acct.archive` | Archive | بند کریں | ارشیف |
| `settings.acct.archiveBlocked` | This account carries your pre-accounts history and cannot be archived. | اس کھاتے میں کھاتوں سے پہلے کی تاریخ ہے، اسے بند نہیں کیا جا سکتا۔ | دا حساب ستاسو د حسابونو مخکې تاریخ لري او ارشیف نه شي کېدای۔ |
| `settings.acct.archived` | Archived | بند شدہ | ارشیف شوی |
| `settings.acct.balance` | Balance | بیلنس | پاتې |
| `settings.acct.defaultBadge` | Default for {method} | {method} کے لیے طے شدہ | د {method} لپاره اصلي |
| `settings.acct.defaultShort` | Default | طے شدہ | اصلي |
| `settings.acct.defaultsSub` | New payments settle into the default account for their method; the desk can still pick a different account on any payment. | نئی ادائیگیاں اپنے طریقے کے طے شدہ کھاتے میں جاتی ہیں؛ کاؤنٹر پر کسی بھی ادائیگی کے لیے دوسرا کھاتہ بھی منتخب کیا جا سکتا ہے۔ | نوي تادیې د دوی د طریقې لپاره اصلي حساب ته ځي؛ مېز لاهم په هره تادیه کې بل حساب ټاکلی شي۔ |
| `settings.acct.defaultsTitle` | Payment defaults | ادائیگی کے طے شدہ کھاتے | د تادیې اصلي |
| `settings.acct.doTransfer` | Transfer | منتقل کریں | ولېږدوئ |
| `settings.acct.errAmount` | Enter an amount greater than 0. | 0 سے زیادہ رقم درج کریں۔ | له 0 څخه زیات مبلغ ولیکئ۔ |
| `settings.acct.errName` | Enter an account name. | کھاتے کا نام درج کریں۔ | د حساب نوم ولیکئ۔ |
| `settings.acct.errSame` | Choose two different accounts. | دو مختلف کھاتے منتخب کریں۔ | دوه مختلف حسابونه وټاکئ۔ |
| `settings.acct.from` | From account | اس کھاتے سے | له حساب څخه |
| `settings.acct.kind` | Type | قسم | ډول |
| `settings.acct.kindBank` | Bank account | بینک کھاتہ | بانکي حساب |
| `settings.acct.kindCash` | Cash (till) | نقد (گلّہ) | نغدې (دراز) |
| `settings.acct.kindWallet` | Wallet | والیٹ | بټوه |
| `settings.acct.legacyNote` | Holds all history from before money accounts — rename only, cannot be archived. | رقم کے کھاتوں سے پہلے کی تمام تاریخ اسی کھاتے میں ہے — صرف نام بدلا جا سکتا ہے، بند نہیں کیا جا سکتا۔ | د پیسو حسابونو څخه مخکې ټول تاریخ ساتي — یوازې نوم بدلول، ارشیف نه شي کېدای۔ |
| `settings.acct.method` | Default for payments by | ادائیگی کا طے شدہ طریقہ | د تادیو لپاره اصلي له مخې |
| `settings.acct.methodNone` | None — choose at the desk | کوئی نہیں — کاؤنٹر پر منتخب کریں | هېڅ — په مېز کې وټاکئ |
| `settings.acct.name` | Account name | کھاتے کا نام | د حساب نوم |
| `settings.acct.namePlaceholder` | e.g. HBL Current, Shop Easypaisa | مثلاً HBL کرنٹ، دکان کا Easypaisa | د بېلګې په توګه HBL Current, Shop Easypaisa |
| `settings.acct.noMethod` | No payment default | ادائیگی کا کوئی طے شدہ کھاتہ نہیں | د تادیې اصلي نشته |
| `settings.acct.note` | Note | نوٹ | یادښت |
| `settings.acct.notePlaceholder` | e.g. Day's takings deposited to bank | مثلاً دن کی کمائی بینک میں جمع کرائی | د بېلګې په توګه د ورځې عواید بانک ته ولېږدول شول |
| `settings.acct.rename` | Rename | نام بدلیں | نوم بدل کړئ |
| `settings.acct.staffNote` | Money accounts are managed by the shop owner. | رقم کے کھاتے دکان کا مالک چلاتا ہے۔ | د پیسو حسابونه د هټۍ مالک لخوا اداره کېږي۔ |
| `settings.acct.sub` | Where your money sits — the till, wallets and bank accounts. Balances are derived live from the journal; accounts are archived, never deleted. | آپ کی رقم کہاں ہے — گلّہ، والیٹس اور بینک کھاتے۔ بیلنس جرنل سے براہِ راست نکلتے ہیں؛ کھاتے بند (آرکائیو) ہوتے ہیں، کبھی حذف نہیں ہوتے۔ | ستاسو پیسې چیرته دي — دراز، بټوې او بانکي حسابونه۔ پاتې په ژوندي ډول له ژورنال څخه اخیستل کېږي؛ حسابونه ارشیف کېږي، هېڅکله نه ړنګېږي۔ |
| `settings.acct.title` | Money accounts | رقم کے کھاتے | د پیسو حسابونه |
| `settings.acct.to` | To account | اس کھاتے میں | حساب ته |
| `settings.acct.transfer` | Transfer money | رقم منتقل کریں | پیسې ولېږدوئ |
| `settings.acct.transferDone` | Transferred {amount} from {from} to {to}. | {amount} {from} سے {to} میں منتقل ہو گئی۔ | {amount} له {from} څخه {to} ته ولېږدول شو۔ |
| `settings.acct.transferTitle` | Transfer between accounts | کھاتوں کے درمیان منتقلی | د حسابونو ترمنځ لېږد |
| `settings.addressPlaceholder` | Shop address | دکان کا پتا | د هټۍ پته |
| `settings.confirmAria` | Confirm reset | ری سیٹ کی تصدیق | د بیا تنظیم تایید |
| `settings.confirmBody` | All current products, sales and records will be replaced with the sample shop data. In production this reseeds the owner's namespace. This cannot be undone. | تمام موجودہ مصنوعات، فروخت اور ریکارڈ نمونہ دکان کے ڈیٹا سے بدل جائیں گے۔ پروڈکشن میں یہ مالک کے ڈیٹا کو دوبارہ سیٹ کرتا ہے۔ یہ عمل واپس نہیں لیا جا سکتا۔ | ټول اوسني توکي، پلور او ریکارډونه به د نمونوي هټۍ معلوماتو سره بدل شي۔ په تولید کې دا د مالک نوم ځای بیا کښت کوي۔ دا بېرته نه شي کېدای۔ |
| `settings.confirmReset` | Reset data | ڈیٹا ری سیٹ کریں | معلومات بیا تنظیم کړئ |
| `settings.confirmTitle` | Reset demo data? | ڈیمو ڈیٹا ری سیٹ کریں؟ | د ډیمو معلومات بیا تنظیم کړئ؟ |
| `settings.dataSub` | Reset demo data restores the sample shop. In production this reseeds the owner's namespace. | ڈیمو ڈیٹا ری سیٹ کرنے سے نمونہ دکان واپس آ جاتی ہے۔ پروڈکشن میں یہ مالک کے ڈیٹا کو دوبارہ نمونہ ڈیٹا سے بدل دیتا ہے۔ | د ډیمو معلوماتو بیا تنظیم کول نمونوي هټۍ بېرته راولي۔ په تولید کې دا د مالک نوم ځای بیا کښت کوي۔ |
| `settings.dataTitle` | Data | ڈیٹا | معلومات |
| `settings.demoMode` | Demo mode | ڈیمو موڈ | ډیمو موډ |
| `settings.eyebrow` | Shop settings | دکان کی ترتیبات | د هټۍ تنظیمات |
| `settings.invalidEmail` | Enter a valid email address. | درست ای میل ایڈریس درج کریں۔ | یو باوري برېښنالیک پته ولیکئ۔ |
| `settings.inviteNote` | Invite by email and pick a role → the staff member signs up / signs in with that exact email → they land in THIS shop with the access of their role; removing an email cuts access immediately. Manager = full shop access except settings and staff; Cashier = sales, billing, returns and day close only; Accountant = finance, expenses and payments, no selling. | ای میل سے دعوت دیں اور کردار منتخب کریں ← عملے کا فرد اسی ای میل سے سائن اپ / لاگ اِن کرے ← وہ اسی دکان میں اپنے کردار کی رسائی کے ساتھ آئے گا؛ ای میل ہٹاتے ہی رسائی فوراً ختم ہو جاتی ہے۔ منیجر = ترتیبات اور عملے کے سوا دکان کی مکمل رسائی؛ کیشیئر = صرف فروخت، بلنگ، واپسی اور ڈے کلوز؛ اکاؤنٹنٹ = مالیات، اخراجات اور ادائیگیاں، فروخت نہیں۔ | په برېښنالیک بلنه ورکړئ او رول وټاکئ ← کارکوونکی په هماغه برېښنالیک لاسلیک / ننوځي ← دوی په دې هټۍ کې د دوی د رول لاسرسي سره راځي؛ د برېښنالیک لرې کول سمدلاسه لاسرسی پرې کوي۔ مدیر = د تنظیماتو او کارکوونکو پرته د هټۍ بشپړ لاسرسی؛ کیشر = یوازې پلور، بلینګ، بېرته راوړل او د ورځې تړل؛ محاسب = مالي چارې، لګښتونه او تادیې، پلور نشته۔ |
| `settings.langDraftPreview` | Draft preview | مسودہ | مسوده |
| `settings.langEnglish` | English | English | English |
| `settings.langFarsi` | فارسی | فارسی | فارسی |
| `settings.langPashto` | پښتو | پښتو | پښتو |
| `settings.languageSub` | App language — English or Urdu. | ایپ کی زبان — انگریزی یا اردو۔ | د ایپ ژبه — انګلیسي، اردو، پښتو یا فارسي۔ |
| `settings.languageTitle` | Language | زبان | ژبه |
| `settings.langUrdu` | اردو | اردو | اردو |
| `settings.lead` | Your shop profile, who can work in this shop, language and data. | آپ کی دکان کی معلومات، دکان میں کام کرنے والے افراد، زبان اور ڈیٹا۔ | ستاسو د هټۍ پروفایل، څوک په دې هټۍ کې کار کولی شي، ژبه او معلومات۔ |
| `settings.loading` | Loading settings… | ترتیبات لوڈ ہو رہی ہیں… | تنظیمات بارېږي… |
| `settings.modeDemo` | Demo | ڈیمو | ډیمو |
| `settings.modeLive` | Live | لائیو | ژوندی |
| `settings.noStaff` | No staff added yet. | ابھی کوئی عملہ شامل نہیں کیا گیا۔ | تر اوسه کارکوونکي نه دي زیات شوي۔ |
| `settings.per.actionClose` | Closed | بند کی گئی | وتړل شوه |
| `settings.per.actionReopen` | Reopened | دوبارہ کھولی گئی | بیا پرانیستل شوه |
| `settings.per.by` | by {email} | از {email} | د {email} لخوا |
| `settings.per.close` | Close period | مدت بند کریں | موده وتړئ |
| `settings.per.closeConfirm` | Lock the books through {date}? This cannot be undone quietly — reopening requires a recorded reason and stays in the history below. | کھاتے {date} تک مقفل کر دیں؟ یہ خاموشی سے واپس نہیں ہوتا — دوبارہ کھولنے کے لیے وجہ درج ہوگی اور وہ نیچے تاریخ میں محفوظ رہے گی۔ | کتابونه تر {date} پورې قلف کړئ؟ دا په خاموشۍ سره بېرته نه شي کېدای — بیا پرانیستل ثبت شوي لامل ته اړتیا لري او په لاندې تاریخ کې پاتې کېږي۔ |
| `settings.per.closed` | Books locked through {date}. | کھاتے {date} تک مقفل ہو گئے۔ | کتابونه تر {date} پورې قلف شول۔ |
| `settings.per.closeLabel` | Close period through | مدت اس تاریخ تک بند کریں | موده تر تړل |
| `settings.per.closeNote` | Note (optional) | نوٹ (اختیاری) | یادښت (اختیاري) |
| `settings.per.closeNotePlaceholder` | e.g. Month reviewed with the accountant | مثلاً مہینہ اکاؤنٹنٹ کے ساتھ جانچ لیا گیا | د بېلګې په توګه میاشت د محاسب سره وکتل شوه |
| `settings.per.day` | Day | دن | ورځ |
| `settings.per.errBackwards` | That date is already locked. To move the lock back, use Reopen below. | یہ تاریخ پہلے ہی مقفل ہے۔ قفل پیچھے لے جانے کے لیے نیچے دوبارہ کھولیں استعمال کریں۔ | هغه نېټه دمخه قلف ده۔ د قلف شاته لېږدولو لپاره، لاندې بیا پرانیستل وکاروئ۔ |
| `settings.per.errDate` | Choose a valid date. | درست تاریخ منتخب کریں۔ | یوه باوري نېټه وټاکئ۔ |
| `settings.per.errNothing` | There is no lock to reopen. | کھولنے کے لیے کوئی قفل موجود نہیں۔ | د بیا پرانیستلو لپاره قلف نشته۔ |
| `settings.per.errRail` | A close cannot cover today or yesterday — offline entries may still be syncing. The latest closable date is {date}. | بندش آج یا کل کی تاریخ نہیں لے سکتی — آف لائن اندراج ابھی سنک ہو رہے ہو سکتے ہیں۔ آخری قابلِ بندش تاریخ {date} ہے۔ | تړل نن یا پرون نه شي پوښلی — آفلاین ننوتنې ممکن لاهم همغږي کېږي۔ وروستۍ د تړلو وړ نېټه {date} ده۔ |
| `settings.per.errReason` | A reason is required — every reopening is recorded in the history. | وجہ ضروری ہے — ہر دوبارہ کھولنا تاریخ میں درج ہوتا ہے۔ | لامل اړین دی — هر بیا پرانیستل په تاریخ کې ثبت کېږي۔ |
| `settings.per.fiscalCurrent` | Current fiscal year: {start} – {end} | موجودہ مالی سال: {start} – {end} | اوسنی مالي کال: {start} – {end} |
| `settings.per.fiscalSaved` | Fiscal year start saved. | مالی سال کا آغاز محفوظ ہو گیا۔ | د مالي کال پیل خوندي شو۔ |
| `settings.per.fiscalStart` | Fiscal year starts on | مالی سال شروع ہوتا ہے | مالي کال په پیلېږي |
| `settings.per.historyEmpty` | No period has been closed or reopened yet. | ابھی کوئی مدت بند یا دوبارہ کھولی نہیں گئی۔ | تر اوسه هېڅ موده نه ده تړل شوې یا بیا پرانیستل شوې۔ |
| `settings.per.historyTitle` | Period history | مدتوں کی تاریخ | د مودې تاریخ |
| `settings.per.lockedThrough` | The books are locked through {date}. No posting — sale, expense, bill or correction — can be dated on or before it. | کھاتے {date} تک مقفل ہیں۔ کوئی اندراج — فروخت، خرچ، بل یا تصحیح — اس تاریخ یا اس سے پہلے کی تاریخ سے درج نہیں ہو سکتا۔ | کتابونه تر {date} پورې قلف دي۔ هېڅ پوسټینګ — پلور، لګښت، بل یا سمون — په هغې یا ترې مخکې نه شي نیټه کېدای۔ |
| `settings.per.lockTitle` | Period lock | مدت کا قفل | د مودې قلف |
| `settings.per.month` | Month | مہینہ | میاشت |
| `settings.per.notLocked` | No period is locked yet. Postings can still be dated on any past day. | ابھی کوئی مدت مقفل نہیں ہے۔ اندراج کسی بھی پچھلی تاریخ سے ہو سکتا ہے۔ | تر اوسه هېڅ موده نه ده قلف شوې۔ پوسټینګونه لاهم په هره تېره ورځ نیټه کېدای شي۔ |
| `settings.per.open` | no lock | کوئی قفل نہیں | قلف نشته |
| `settings.per.reason` | Reason * | وجہ * | لامل * |
| `settings.per.reasonPlaceholder` | e.g. A missed expense must be entered for last month | مثلاً پچھلے مہینے کا ایک خرچ درج کرنا رہ گیا تھا | د بېلګې په توګه د تېرې میاشتې لپاره یو ورک شوی لګښت باید ولیکل شي |
| `settings.per.reopen` | Reopen | دوبارہ کھولیں | بیا پرانیزئ |
| `settings.per.reopened` | Lock moved back — the books are now locked through {date}. | قفل پیچھے ہو گیا — کھاتے اب {date} تک مقفل ہیں۔ | قلف شاته ولېږدول شو — کتابونه اوس تر {date} پورې قلف دي۔ |
| `settings.per.reopenedFully` | Periods reopened — no lock is in force. | مدتیں کھول دی گئیں — اب کوئی قفل نہیں ہے۔ | مودې بیا پرانیستل شوې — هېڅ قلف په عمل کې نشته۔ |
| `settings.per.reopenFully` | Fully reopen — remove the lock | مکمل کھولیں — قفل ختم کریں | بشپړ بیا پرانیزئ — قلف لرې کړئ |
| `settings.per.reopenLabel` | Move the lock back — locked through | قفل پیچھے لے جائیں — مقفل رہے | قلف شاته ولېږدوئ — تر قلف |
| `settings.per.reopenTitle` | Reopen a closed period | بند مدت دوبارہ کھولیں | تړل شوې موده بیا پرانیزئ |
| `settings.per.sub` | When your fiscal year starts, and period closing. Once a period is closed, no posting can be dated inside it — corrections are recorded at the correction date, never backdated, exactly as in paper books. | آپ کا مالی سال کب شروع ہوتا ہے، اور مدت بند کرنا۔ مدت بند ہو جانے کے بعد اس کے اندر کی تاریخ سے کوئی اندراج نہیں ہو سکتا — تصحیح ہمیشہ تصحیح والی تاریخ سے درج ہوتی ہے، پچھلی تاریخ سے کبھی نہیں، بالکل کاغذی کھاتوں کی طرح۔ | ستاسو مالي کال کله پیلېږي، او د مودې تړل۔ کله چې یوه موده وتړل شي، هېڅ پوسټینګ د هغې دننه نه شي نیټه کېدای — سمونونه د سمون په نېټه ثبت کېږي، هېڅکله شاته نه، په سمه توګه لکه په کاغذي کتابونو کې۔ |
| `settings.per.through` | through {date} | {date} تک | تر {date} پورې |
| `settings.per.title` | Fiscal year & periods | مالی سال اور مدتیں | مالي کال او مودې |
| `settings.phonePlaceholder` | e.g. 0300-1234567 | مثلاً 0300-1234567 | د بېلګې په توګه 0300-1234567 |
| `settings.profileSub` | Shown on bills and across the app. | بلوں پر اور پوری ایپ میں دکھائی جاتی ہے۔ | په بلونو او په ټول ایپ کې ښودل کېږي۔ |
| `settings.profileTitle` | Shop profile | دکان کی معلومات | د هټۍ پروفایل |
| `settings.resetDemo` | Reset demo data | ڈیمو ڈیٹا ری سیٹ کریں | د ډیمو معلومات بیا تنظیم کړئ |
| `settings.roleAccountant` | Accountant | اکاؤنٹنٹ | محاسب |
| `settings.roleCashier` | Cashier | کیشیئر | کیشر |
| `settings.roleManager` | Manager | منیجر | مدیر |
| `settings.roleOwner` | Owner | مالک | مالک |
| `settings.roleStaff` | Staff | عملہ | کارکوونکي |
| `settings.roleUpdated` | Role updated. | کردار تبدیل ہو گیا۔ | رول تازه شو۔ |
| `settings.saved` | Saved. | محفوظ ہو گیا۔ | خوندي شو۔ |
| `settings.shopName` | Shop name | دکان کا نام | د هټۍ نوم |
| `settings.shopNamePlaceholder` | e.g. Al-Madina Kiryana Store | مثلاً المدینہ کریانہ اسٹور | د بېلګې په توګه Al-Madina Kiryana Store |
| `settings.signedInAs` | Signed in as {email} — {role} | {email} کے طور پر لاگ اِن — {role} | د {email} په توګه ننوتل — {role} |
| `settings.staffEmail` | Staff email | عملے کی ای میل | د کارکوونکي برېښنالیک |
| `settings.staffEmailPlaceholder` | staff@example.com | staff@example.com | staff@example.com |
| `settings.staffLegacyNote` | Staff added before roles were introduced keep Manager access — exactly the access they have always had. Change anyone's role here whenever you are ready. | کرداروں کے نظام سے پہلے شامل کیا گیا عملہ منیجر کی رسائی رکھتا ہے — بالکل وہی رسائی جو ہمیشہ سے تھی۔ جب چاہیں یہاں سے کسی کا کردار بدل لیں۔ | هغه کارکوونکي چې د رولونو له معرفي مخکې زیات شوي د مدیر لاسرسی ساتي — په سمه توګه هغه لاسرسی چې دوی تل درلود۔ هر وخت چې چمتو یاست دلته د هر چا رول بدل کړئ۔ |
| `settings.staffOnlyNote` | Only the shop owner can change shop settings. | دکان کی ترتیبات صرف دکان کا مالک بدل سکتا ہے۔ | یوازې د هټۍ مالک د هټۍ تنظیمات بدلولی شي۔ |
| `settings.staffRole` | Role | کردار | رول |
| `settings.staffRoleAria` | Role for {email} | {email} کے لیے کردار | د {email} لپاره رول |
| `settings.staffSelfNote` | You are signed in as staff of this shop. Settings are managed by the owner. | آپ اس دکان کے عملے کے طور پر لاگ اِن ہیں۔ ترتیبات کا انتظام مالک کے پاس ہے۔ | تاسو د دې هټۍ د کارکوونکي په توګه ننوتي یاست۔ تنظیمات د مالک لخوا اداره کېږي۔ |
| `settings.staffSub` | People who can work in this shop. | وہ افراد جو اس دکان میں کام کر سکتے ہیں۔ | هغه خلک چې په دې هټۍ کې کار کولی شي۔ |
| `settings.staffTitle` | Staff access | عملے کی رسائی | د کارکوونکو لاسرسی |
| `settings.title` | Settings | ترتیبات | تنظیمات |
## tax

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `tax.active` | Active | فعال | فعال |
| `tax.add` | Add slab | سلیب شامل کریں | سلیب زیات کړئ |
| `tax.addTitle` | Add a tax slab | نئی ٹیکس سلیب بنائیں | د مالیې سلیب زیات کړئ |
| `tax.appliesBoth` | Sales & purchases | فروخت و خریداری | پلور او پېرود |
| `tax.appliesPurchases` | Purchases | خریداری | پېرود |
| `tax.appliesSales` | Sales | فروخت | پلور |
| `tax.appliesTo` | Applies to | لاگو ہوتی ہے | پلي کېږي په |
| `tax.defaultBadge` | Default | ڈیفالٹ | ډیفالټ |
| `tax.defaultPurchases` | Default for purchases | خریداری کی ڈیفالٹ | د پېرود لپاره ډیفالټ |
| `tax.defaultSales` | Default for sales | فروخت کی ڈیفالٹ | د پلور لپاره ډیفالټ |
| `tax.defaultSaved` | Tax defaults updated. | ٹیکس ڈیفالٹس اپ ڈیٹ ہو گئیں۔ | د مالیې ډیفالټونه تازه شول. |
| `tax.defaultsSub` | The default slab applies to every product that does not carry its own slab. Choose “No tax” to switch tax off for that side — existing bills and purchases never change. | ڈیفالٹ سلیب ہر اس پروڈکٹ پر لاگو ہوتی ہے جس کی اپنی سلیب نہیں۔ اس طرف کا ٹیکس بند کرنے کے لیے ”کوئی ٹیکس نہیں“ منتخب کریں — پرانے بل اور خریداریاں کبھی نہیں بدلتیں۔ | ډیفالټ سلیب په هر هغه توکي پلي کېږي چې خپل سلیب نه لري. د دې اړخ لپاره مالیه بندولو لپاره “هېڅ مالیه نه” وټاکئ — موجوده بلونه او پېرودونه هېڅکله نه بدلېږي. |
| `tax.defaultsTitle` | Shop defaults | دکان کی ڈیفالٹس | د هټۍ ډیفالټونه |
| `tax.edit` | Edit | تبدیل کریں | سم کړئ |
| `tax.editTitle` | Edit tax slab | ٹیکس سلیب تبدیل کریں | د مالیې سلیب سم کړئ |
| `tax.empty` | No tax slabs yet. | ابھی کوئی ٹیکس سلیب نہیں۔ | تر اوسه د مالیې سلیب نشته. |
| `tax.errName` | Give the slab a name. | سلیب کو ایک نام دیں۔ | سلیب ته نوم ورکړئ. |
| `tax.errRate` | Rate must be 0 or more. | شرح 0 یا اس سے زیادہ ہونی چاہیے۔ | شرح باید 0 یا زیات وي. |
| `tax.exclusiveBadge` | Added on top | قیمت کے اوپر | په سر اضافه |
| `tax.inactive` | Inactive | غیر فعال | غیر فعال |
| `tax.inclusive` | Prices already include this tax | قیمتوں میں یہ ٹیکس پہلے سے شامل ہے | بیې مخکې له مخکې دا مالیه لري |
| `tax.inclusiveBadge` | Inclusive | شاملِ قیمت | شامله |
| `tax.kind` | Kind | قسم | ډول |
| `tax.kindFixed` | Fixed amount per unit | فی یونٹ مقررہ رقم | په هر واحد ټاکلی مبلغ |
| `tax.kindPercent` | Percent of price | قیمت کا فیصد | د بیې سلنه |
| `tax.name` | Slab name | سلیب کا نام | د سلیب نوم |
| `tax.namePlaceholder` | e.g. GST | مثلاً GST | لکه GST |
| `tax.noDefault` | No tax | کوئی ٹیکس نہیں | هېڅ مالیه نه |
| `tax.perUnit` | {amount} per unit | {amount} فی یونٹ | {amount} په هر واحد |
| `tax.rateFixed` | Amount per unit (PKR) | فی یونٹ رقم (PKR) | په هر واحد مبلغ (PKR) |
| `tax.ratePercent` | Rate (%) | شرح (%) | شرح (%) |
| `tax.readonlyNote` | You can view the tax slabs; only the owner can change them. | آپ ٹیکس سلیبز دیکھ سکتے ہیں؛ تبدیلی صرف مالک کر سکتا ہے۔ | تاسو د مالیې سلیبونه لیدلی شئ؛ یوازې مالک یې بدلولی شي. |
| `tax.removed` | Tax slab removed. | ٹیکس سلیب ختم کر دی گئی۔ | د مالیې سلیب لرې شو. |
| `tax.saved` | Tax slab saved. | ٹیکس سلیب محفوظ ہو گئی۔ | د مالیې سلیب خوندي شو. |
| `tax.sub` | Define the taxes your shop charges (e.g. GST). A slab only ever applies when it is active AND set as a shop default below or assigned to a product — until then, no bill or purchase carries tax. | اپنی دکان کے ٹیکسز متعین کریں (مثلاً GST)۔ کوئی سلیب تبھی لاگو ہوتی ہے جب وہ فعال ہو اور نیچے دکان کی ڈیفالٹ مقرر ہو یا کسی پروڈکٹ کو دی گئی ہو — اس سے پہلے کسی بل یا خریداری پر کوئی ٹیکس نہیں لگتا۔ | هغه مالیې وټاکئ چې ستاسو هټۍ یې اخلي (لکه GST). یو سلیب یوازې هغه وخت پلي کېږي چې فعال وي او لاندې د هټۍ ډیفالټ وټاکل شي یا کوم توکي ته ورکړل شي — تر هغه وخته، په هېڅ بل یا پېرود کې مالیه نه وي. |
| `tax.title` | Tax slabs | ٹیکس سلیبز | د مالیې سلیبونه |
## notes

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `billing.returnReason` | Reason (printed on the credit note) | وجہ (کریڈٹ نوٹ پر چھپے گی) | لامل (په کریډټ یادښت چاپېږي) |
| `billing.returnReasonPh` | Reason for the return… | واپسی کی وجہ… | د بېرته راتګ لامل… |
| `billing.successReturnedNote` | Bill #{no} returned — credit note {note} issued. | بل نمبر {no} واپس ہو گیا — کریڈٹ نوٹ {note} جاری ہو گیا۔ | بل #{no} بېرته راغی — کریډټ یادښت {note} ورکړل شو. |
| `note.againstBill` | Bill #{no} | بل نمبر {no} | بل #{no} |
| `note.againstPurchase` | Purchase · {date} | خریداری · {date} | پېرود · {date} |
| `note.col.against` | Against | بنام | پر وړاندې |
| `note.col.goods` | Goods | سامان | توکي |
| `note.col.kind` | Kind | قسم | ډول |
| `note.col.number` | Note | نوٹ | یادښت |
| `note.col.party` | Party | فریق | لوری |
| `note.col.tax` | Tax reversed | واپس شدہ ٹیکس | بېرته شوی مالیات |
| `note.empty` | No notes yet. Post a formal bill return or return goods to a supplier and its note will appear here. | ابھی کوئی نوٹ نہیں۔ بل کی باقاعدہ واپسی درج کریں یا سپلائر کو سامان واپس کریں — اس کا نوٹ یہاں آ جائے گا۔ | لا تر اوسه یادښتونه نشته. د بل رسمي بېرته راتګ ثبت کړئ یا عرضه کوونکي ته توکي بېرته ورکړئ، یادښت به یې دلته راشي. |
| `note.filter.all` | All notes | تمام نوٹس | ټول یادښتونه |
| `note.filter.credit` | Credit notes | کریڈٹ نوٹس | کریډټ یادښتونه |
| `note.filter.debit` | Debit notes | ڈیبٹ نوٹس | ډیبټ یادښتونه |
| `note.issue.account` | Refund from account | واپسی کس کھاتے سے | له کوم حساب څخه بېرته ورکړه |
| `note.issue.bill` | Bill | بل | بل |
| `note.issue.customer` | Customer | گاہک | پېرودونکی |
| `note.issue.failed` | The return could not be posted. | واپسی درج نہیں ہو سکی۔ | بېرته راتګ ثبت نشو. |
| `note.issue.left` | {qty} left | {qty} باقی | {qty} پاتې |
| `note.issue.method` | Refund method | رقم واپسی کا طریقہ | د بېرته ورکړې طریقه |
| `note.issue.noBills` | No posted bills can take a return right now. | اس وقت کوئی درج شدہ بل واپسی کے قابل نہیں۔ | اوس هېڅ ثبت شوی بل بېرته راتګ نشي اخیستی. |
| `note.issue.reasonPh` | Why are the goods coming back? | سامان واپس کیوں آ رہا ہے؟ | توکي ولې بېرته راځي؟ |
| `note.issue.returnQty` | Return qty | واپسی مقدار | د بېرته راتګ مقدار |
| `note.issue.selectBill` | Select a posted bill… | درج شدہ بل منتخب کریں… | ثبت شوی بل وټاکئ… |
| `note.issue.sub` | Post a return against a posted bill — the return posts through the ordinary returns engine and the credit note is minted with it, in the same step. | درج شدہ بل کے خلاف واپسی لگائیں — واپسی معمول کے واپسی نظام سے درج ہوتی ہے اور کریڈٹ نوٹ اسی قدم میں اس کے ساتھ بنتا ہے۔ | د ثبت شوي بل پر وړاندې بېرته راتګ ثبت کړئ — بېرته راتګ د عادي بېرته راتګ انجن له لارې ثبتېږي او کریډټ یادښت په هماغه ګام کې ورسره جوړېږي. |
| `note.issue.submit` | Post return & issue note | واپسی درج کر کے نوٹ جاری کریں | بېرته راتګ ثبت کړئ او یادښت ورکړئ |
| `note.issue.success` | Credit note {number} issued against Bill #{no}. | بل نمبر {no} کے خلاف کریڈٹ نوٹ {number} جاری ہو گیا۔ | د بل #{no} پر وړاندې کریډټ یادښت {number} ورکړل شو. |
| `note.issue.title` | Issue credit note | کریڈٹ نوٹ جاری کریں | کریډټ یادښت ورکړئ |
| `note.kind.credit` | Credit note | کریڈٹ نوٹ | کریډټ یادښت |
| `note.kind.debit` | Debit note | ڈیبٹ نوٹ | ډیبټ یادښت |
| `note.posted` | Posted | درج شدہ | ثبت شوی |
| `note.print` | Print | چھاپیں | چاپ کړئ |
| `note.print.againstBill` | Against Bill #{no} | بنام بل نمبر {no} | د بل #{no} پر وړاندې |
| `note.print.againstPurchase` | Against purchase of {date} | بنام خریداری بتاریخ {date} | د {date} د پېرود پر وړاندې |
| `note.print.cashBack` | Cash received back | نقد وصول ہوا | نغدې بېرته ترلاسه شوې |
| `note.print.creditTitle` | Credit Note | کریڈٹ نوٹ | کریډټ یادښت |
| `note.print.debitTitle` | Debit Note | ڈیبٹ نوٹ | ډیبټ یادښت |
| `note.print.footer` | This note formalizes a return already posted to the shop's ledger. | یہ نوٹ اس واپسی کی باقاعدہ دستاویز ہے جو دکان کے کھاتے میں پہلے سے درج ہے۔ | دا یادښت هغه بېرته راتګ رسمي کوي چې لا دمخه د هټۍ په حساب کې ثبت شوی دی. |
| `note.print.goods` | Goods returned | واپس شدہ سامان | بېرته راغلي توکي |
| `note.print.payableReduced` | Payable reduced | واجب الادا کم ہوا | ورکړل کېدونکی کم شو |
| `note.print.refundedCash` | Refunded in cash | نقد واپس ہوا | په نغدو بېرته ورکړل شو |
| `note.print.tax` | Tax reversed | واپس شدہ ٹیکس | بېرته شوی مالیات |
| `note.print.udhaarReduced` | Udhaar reduced | ادھار کم ہوا | پور کم شو |
| `note.reason` | Reason | وجہ | لامل |
| `note.searchPh` | Search note number or party… | نوٹ نمبر یا فریق تلاش کریں… | د یادښت شمېره یا لوری ولټوئ… |
| `note.settle.cash_refund` | Cash refund | نقد واپسی | نغدې بېرته ورکړه |
| `note.settle.credit_reduction` | Udhaar reduced | ادھار کم ہوا | پور کم شو |
| `note.settle.payable_offset` | Payable reduced | واجب الادا کم ہوا | ورکړل کېدونکی کم شو |
| `note.settlement` | Settlement | تصفیہ | تصفیه |
| `note.subtitle` | The formal paper for returned goods. A credit note is minted with a bill return; a debit note with goods returned to a supplier. Every note wraps a posting that is already in the ledger — the note itself never moves money. | واپس شدہ سامان کی باقاعدہ دستاویز۔ کریڈٹ نوٹ بل کی واپسی کے ساتھ بنتا ہے؛ ڈیبٹ نوٹ سپلائر کو سامان واپس کرنے پر۔ ہر نوٹ اس اندراج کی دستاویز ہے جو کھاتے میں پہلے سے درج ہے — نوٹ خود کوئی رقم نہیں چلاتا۔ | د بېرته راغلو توکو رسمي کاغذ. کریډټ یادښت د بل له بېرته راتګ سره جوړېږي؛ ډیبټ یادښت عرضه کوونکي ته د توکو له بېرته ورکولو سره. هر یادښت هغه ثبت رانغاړي چې لا دمخه په حساب کې دی — یادښت پخپله هېڅکله پیسې نه خوځوي. |
| `note.title` | Credit & Debit Notes | کریڈٹ و ڈیبٹ نوٹس | کریډټ او ډیبټ یادښتونه |
| `note.view` | View | دیکھیں | وګورئ |
| `sup.detail.summaryFull` | Purchased {purchased} · Returned {returned} · Paid {paid} | خریداری {purchased} · واپسی {returned} · ادا شدہ {paid} | پېرودل شوی {purchased} · بېرته ورکړل شوی {returned} · ورکړل شوی {paid} |
| `sup.preturn.account` | Refund into account | رقم کس کھاتے میں آئے | په کوم حساب کې بېرته ورکړه |
| `sup.preturn.against` | Against purchase of {date} | خریداری بتاریخ {date} کے خلاف | د {date} د پېرود پر وړاندې |
| `sup.preturn.alreadyReturned` | {qty} already returned | {qty} پہلے واپس ہو چکا | {qty} لا دمخه بېرته ورکړل شوی |
| `sup.preturn.button` | Return goods | سامان واپس کریں | توکي بېرته ورکړئ |
| `sup.preturn.errMax` | Only {qty} of {name} can still be returned. | {name} کی صرف {qty} مقدار مزید واپس ہو سکتی ہے۔ | د {name} یوازې {qty} لا بېرته ورکول کېدای شي. |
| `sup.preturn.failed` | The purchase return could not be posted. | خرید واپسی درج نہیں ہو سکی۔ | د پېرود بېرته ورکول ثبت نشول. |
| `sup.preturn.historyTitle` | Purchase returns | خرید واپسیاں | د پېرود بېرته ورکول |
| `sup.preturn.method` | Refund method | رقم واپسی کا طریقہ | د بېرته ورکړې طریقه |
| `sup.preturn.none` | Enter a return quantity for at least one item. | کم از کم ایک شے کی واپسی مقدار لکھیں۔ | لږ تر لږه د یوه توکي د بېرته ورکولو مقدار ولیکئ. |
| `sup.preturn.noReturns` | No purchase returns yet. | ابھی کوئی خرید واپسی نہیں۔ | لا تر اوسه د پېرود بېرته ورکول نشته. |
| `sup.preturn.offset` | Reduce what we owe (payable) | ہمارا واجب الادا کم کریں | زموږ ورکړل کېدونکی کم کړئ |
| `sup.preturn.purchasedLine` | Purchased {qty} · at {cost} | خریدا گیا {qty} · {cost} پر | پېرودل شوی {qty} · په {cost} |
| `sup.preturn.qty` | Return qty | واپسی مقدار | د بېرته ورکولو مقدار |
| `sup.preturn.reason` | Reason | وجہ | لامل |
| `sup.preturn.reasonPh` | Damaged, wrong item, expired… | خراب، غلط شے، زائد المیعاد… | زیانمن، غلط توکی، تېر شوی… |
| `sup.preturn.refund` | Supplier refunds money now | سپلائر ابھی رقم واپس کرے | عرضه کوونکی اوس پیسې بېرته ورکوي |
| `sup.preturn.settlement` | Settlement | تصفیہ | تصفیه |
| `sup.preturn.sub` | Against the purchase of {date} · {amount} | خریداری بتاریخ {date} · {amount} کے خلاف | د {date} د پېرود پر وړاندې · {amount} |
| `sup.preturn.submit` | Post return & debit note | واپسی درج کر کے ڈیبٹ نوٹ جاری کریں | بېرته ورکول ثبت کړئ او ډیبټ یادښت ورکړئ |
| `sup.preturn.success` | Debit note {number} issued — the goods are returned. | ڈیبٹ نوٹ {number} جاری ہو گیا — سامان واپس ہو گیا۔ | ډیبټ یادښت {number} ورکړل شو — توکي بېرته ورکړل شول. |
| `sup.preturn.title` | Return goods to supplier | سپلائر کو سامان واپسی | عرضه کوونکي ته توکي بېرته ورکړئ |
## ai

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `ai.chatLabel` | Conversation with Dukaan AI | دکان اے آئی سے گفتگو | له Dukaan AI سره خبرې اترې |
| `ai.error` | Sorry, something went wrong while answering. Please try again. | معذرت، جواب دیتے ہوئے مسئلہ ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔ | بخښنه غواړم، د ځواب ورکولو پر مهال ستونزه رامنځته شوه. مهرباني وکړئ بیا هڅه وکړئ. |
| `ai.eyebrow` | Urdu · English | اردو · انگریزی | اردو · English |
| `ai.inputLabel` | Ask the AI assistant | اے آئی معاون سے پوچھیں | له AI مرستیال څخه وپوښتئ |
| `ai.loading` | Waking up the assistant… | معاون جاگ رہا ہے… | مرستیال راویښېږي… |
| `ai.note` | Answers are grounded in your shop data. On the live deployment a Gemini-powered assistant (via /api/chat) answers first; the on-device intent engine covers everything else — no key, no network, no problem. | جوابات آپ کی دکان کے ڈیٹا پر مبنی ہوتے ہیں۔ لائیو تعیناتی پر Gemini سے چلنے والا معاون (/api/chat کے ذریعے) پہلے جواب دیتا ہے؛ باقی سب کچھ ڈیوائس پر موجود انٹینٹ انجن سنبھالتا ہے — نہ کلید درکار، نہ نیٹ ورک، کوئی مسئلہ نہیں۔ | ځوابونه ستاسو د هټۍ په معلوماتو ولاړ دي. په ژوندۍ کارونه کې د Gemini پر بنسټ مرستیال (د /api/chat له لارې) لومړی ځواب ورکوي؛ په وسیله کې دننه انجن نور هر څه سمبالوي — نه کیلي پکار ده، نه شبکه، هېڅ ستونزه نشته. |
| `ai.placeholder` | Ask anything about your shop… | اپنی دکان کے بارے میں کچھ بھی پوچھیں… | د خپلې هټۍ په اړه هر څه وپوښتئ… |
| `ai.send` | Send | بھجیں | ولېږئ |
| `ai.sendLabel` | Send message | پیغام بھیجیں | پیغام ولېږئ |
| `ai.subtitle` | Ask in Urdu or English — every answer is computed live from your shop's data. Try the starters below. | اردو یا انگریزی میں پوچھیں — ہر جواب آپ کی دکان کے ڈیٹا سے براہِ راست شمار ہوتا ہے۔ نیچے دیے گئے سوالات آزمائیں۔ | په اردو یا انګلیسي کې وپوښتئ — هر ځواب ستاسو د هټۍ له معلوماتو څخه ژوندی شمېرل کېږي. لاندې پیل ټکي وازمایئ. |
| `ai.title` | AI Assistant | اے آئی معاون | د AI مرستیال |
| `ai.typing` | Assistant is typing | معاون لکھ رہا ہے | مرستیال لیکي |
## platform

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `biz.activeBusiness` | Active business | فعال کاروبار | فعال کاروبار |
| `biz.addressLabel` | Address | پتہ | پته |
| `biz.businessFallback` | Business | کاروبار | سوداګري |
| `biz.createBody` | A new, empty business on the Free Trial plan. Your current business is untouched. | مفت ٹرائل پلان پر ایک نیا، خالی کاروبار۔ آپ کا موجودہ کاروبار اچھوتا رہے گا۔ | په وړیا آزمېښتي پلان یو نوی، تش کاروبار. ستاسو اوسنی کاروبار نه لمس کېږي. |
| `biz.createButton` | Create business | کاروبار بنائیں | کاروبار جوړ کړئ |
| `biz.created` | Business created — switched to {name}. | کاروبار بن گیا — {name} پر منتقل ہو گئے۔ | کاروبار جوړ شو — {name} ته لاړئ. |
| `biz.createFailed` | Could not create the business. Please try again. | کاروبار نہیں بن سکا۔ دوبارہ کوشش کریں۔ | کاروبار جوړ نشو. بیا هڅه وکړئ. |
| `biz.createTitle` | Create a new business | نیا کاروبار بنائیں | نوی کاروبار جوړ کړئ |
| `biz.memberJoined` | Joined | شامل | ګډ شو |
| `biz.memberLegacy` | Legacy access | پرانے نظام سے رسائی | زوړ لاسرسی |
| `biz.memberPending` | Invite pending | دعوت زیرِ التوا | بلنه ځنډېدلې |
| `biz.nameLabel` | Business name | کاروبار کا نام | د کاروبار نوم |
| `biz.namePlaceholder` | e.g. Second Shop | مثلاً دوسری دکان | بېلګه: دوهمه هټۍ |
| `biz.newBusiness` | New business | نیا کاروبار | نوی کاروبار |
| `biz.noAccessBody` | This account does not belong to any business right now. If you were removed from a shop, its owner can invite you again. | یہ اکاؤنٹ اس وقت کسی کاروبار کا حصہ نہیں ہے۔ اگر آپ کو کسی دکان سے ہٹا دیا گیا تھا تو اس کا مالک آپ کو دوبارہ دعوت دے سکتا ہے۔ | دا حساب اوس د هېڅ سوداګرۍ برخه نه دی. که تاسو له یوې هټۍ څخه لرې شوي یاست، د هغې مالک کولی شي تاسو ته بیا بلنه درکړي. |
| `biz.noAccessTitle` | No business access | کسی کاروبار تک رسائی نہیں | سوداګرۍ ته لاسرسی نشته |
| `biz.phoneLabel` | Phone | فون | ټېلیفون |
| `biz.retrySetup` | Retry setup | تیاری دوبارہ کریں | بیا ترتیب کړئ |
| `biz.setupIncomplete` | This business is still being set up. | اس کاروبار کی تیاری ابھی جاری ہے۔ | دا کاروبار لا ترتیبو کېږي. |
| `biz.switchBusiness` | Switch business | کاروبار بدلیں | سوداګري بدله کړئ |
| `biz.yourBusiness` | Your business | آپ کا کاروبار | ستاسو سوداګري |
| `plan.graceBanner` | Your plan ended {days} days ago. You can view, print and export everything, but new entries are paused until renewal. | آپ کا پلان {days} دن پہلے ختم ہوا۔ آپ سب کچھ دیکھ، پرنٹ اور ایکسپورٹ کر سکتے ہیں، لیکن تجدید تک نئی انٹریاں رکی ہوئی ہیں۔ | ستاسو پلان {days} ورځې مخکې پای ته ورسېد. تاسو هر څه لیدلی، چاپولی او صادرولی شئ، مګر نوي داخلې تر نوي کولو پورې ځنډېدلې دي. |
| `plan.includedIn` | Included in {tier} and above | {tier} اور اوپر شامل | په {tier} او پورته کې شامل دی |
| `plan.limitInvoices` | Invoice limit reached for this period ({limit}). Posting resumes next period or after an upgrade. | اس مدت کی رسیدوں کی حد ({limit}) پوری ہو گئی۔ اگلی مدت یا اپ گریڈ کے بعد اندراج جاری ہوگا۔ | د دې مودې لپاره د بل حد ته رسېدلی ({limit}). ثبت کول په بله موده یا له لوړولو وروسته بیا پیلېږي. |
| `plan.limitMembers` | Your plan allows {limit} users. Remove a member or upgrade to add more. | آپ کے پلان میں {limit} صارفین کی گنجائش ہے۔ مزید شامل کرنے کے لیے ممبر ہٹائیں یا اپ گریڈ کریں۔ | ستاسو پلان {limit} کاروونکو ته اجازه ورکوي. یو غړی لرې کړئ یا د نورو زیاتولو لپاره لوړ کړئ. |
| `plan.lockedBody` | This feature is part of the {tier} plan and above. Your current plan is {plan}. | یہ سہولت {tier} پلان اور اس سے اوپر شامل ہے۔ آپ کا موجودہ پلان {plan} ہے۔ | دا ځانګړتیا د {tier} پلان او پورته برخه ده. ستاسو اوسنی پلان {plan} دی. |
| `plan.lockedTitle` | Not included in your plan | آپ کے پلان میں شامل نہیں | ستاسو په پلان کې شامل نه دی |
| `plan.name.advanced` | Advanced | ایڈوانسڈ | پرمختللی |
| `plan.name.basic` | Basic | بنیادی | بنسټیز |
| `plan.name.enterprise` | Enterprise | انٹرپرائز | Enterprise |
| `plan.name.founding` | Founding | بانی | بنسټ ایښودونکی |
| `plan.name.standard` | Standard | معیاری | معیاري |
| `plan.name.trial` | Free Trial | مفت ٹرائل | وړیا آزموینه |
| `plan.panel.actual` | Actual | اصل | اصلي |
| `plan.panel.counter` | Counter | کاؤنٹر | شمېرونکی |
| `plan.panel.enforceOff` | Enforcement is off — usage is being observed only | نفاذ بند ہے — استعمال صرف مشاہدے میں ہے | پلي کول بند دی — کارونه یوازې څارل کېږي |
| `plan.panel.enforceOn` | Enforcement is ON for this shop | اس دکان پر نفاذ فعال ہے | د دې هټۍ لپاره پلي کول فعال دی |
| `plan.panel.invoices` | Invoices | رسیدیں | بلونه |
| `plan.panel.members` | Members | ممبر | غړي |
| `plan.panel.modules` | Modules tier | ماڈیولز درجہ | د ماډلونو کچه |
| `plan.panel.period` | Period | مدت | موده |
| `plan.panel.plan` | Plan | پلان | پلان |
| `plan.panel.state` | Status | حالت | حالت |
| `plan.panel.title` | Plan & usage | پلان اور استعمال | پلان او کارونه |
| `plan.panel.trialEnds` | Trial ends | ٹرائل ختم | آزموینه پای ته رسېږي |
| `plan.postingPaused` | Posting is paused while the shop is {state}. You can still view, print and export. | دکان کی حالت {state} ہے، اس لیے اندراج رکا ہوا ہے۔ آپ دیکھ، پرنٹ اور ایکسپورٹ پھر بھی کر سکتے ہیں۔ | ثبت کول ځنډېدلی دی پداسې حال کې چې هټۍ {state} ده. تاسو لا هم لیدلی، چاپولی او صادرولی شئ. |
| `plan.readonlyBanner` | This shop is read-only: the plan's grace period has ended. Your data stays safe and fully viewable. | یہ دکان صرف مطالعے کے لیے ہے: پلان کی رعایتی مدت ختم ہو چکی ہے۔ آپ کا ڈیٹا محفوظ اور مکمل قابلِ مطالعہ ہے۔ | دا هټۍ یوازې لوستل ده: د پلان د مهلت موده پای ته رسېدلې ده. ستاسو معلومات خوندي او په بشپړ ډول د لیدو وړ پاتې دي. |
| `plan.state.active` | Active | فعال | فعال |
| `plan.state.founding` | Founding | بانی | بنسټ ایښودونکی |
| `plan.state.grace` | Grace period | رعایتی مدت | د مهلت موده |
| `plan.state.readonly` | Read-only | صرف مطالعہ | یوازې لوستل |
| `plan.state.suspended` | Suspended | معطل | ځنډول شوی |
| `plan.state.trial` | Trial | ٹرائل | آزموینه |
| `plan.suspendedBanner` | This shop has been suspended by the platform. You can still view all your data. | پلیٹ فارم نے یہ دکان معطل کر دی ہے۔ آپ اپنا تمام ڈیٹا پھر بھی دیکھ سکتے ہیں۔ | دا هټۍ د پلیټفارم له خوا ځنډول شوې ده. تاسو لا هم خپل ټول معلومات لیدلی شئ. |
| `plan.thisMonth` | Invoices this month | اس ماہ کی رسیدیں | د دې میاشتې بلونه |
| `plan.trialBanner` | Free trial — {days} days left, {left} invoices remaining of {limit} | مفت ٹرائل — {days} دن باقی، {limit} میں سے {left} رسیدیں باقی | وړیا آزموینه — {days} ورځې پاتې، د {limit} څخه {left} بلونه پاتې |
| `plan.trialPool` | {used} of {limit} trial invoices used | {limit} میں سے {used} ٹرائل رسیدیں استعمال ہوئیں | د {limit} څخه {used} آزموینې بلونه وکارول شول |
| `platform.act.activate` | Reactivate | دوبارہ فعال کریں | بیا فعال کړئ |
| `platform.act.assign` | Assign plan | پلان تفویض کریں | پلان وګمارئ |
| `platform.act.assignTitle` | Assign plan | پلان تفویض کریں | پلان وګمارئ |
| `platform.act.compTrial` | Complimentary trial (comp) — logged as a comp act | اعزازی ٹرائل (رعایت) — بطور رعایتی عمل درج ہوگا | وړیا آزموینه (comp) — د comp عمل په توګه ثبت شوی |
| `platform.act.confirmDisagree` | I checked the figures — flip anyway | میں نے اعداد جانچ لیے ہیں — پھر بھی نافذ کریں | ما شمېرې وکتلې — بیا هم بدل کړئ |
| `platform.act.counterVs` | Counter vs platform figures | کاؤنٹر بمقابلہ پلیٹ فارم اعداد | شمېرونکی په مقابل کې د پلیټفارم شمېرې |
| `platform.act.disagree` | The counter and the platform figures disagree. Check before enforcing — enforcing a disagreeing counter as-is can refuse a healthy shop's postings. | کاؤنٹر اور پلیٹ فارم کے اعداد میں فرق ہے۔ نفاذ سے پہلے جانچ لیں — مختلف کاؤنٹر کو یونہی نافذ کرنا صحت مند دکان کے اندراج روک سکتا ہے۔ | شمېرونکی او د پلیټفارم شمېرې موافق نه دي. د پلي کولو څخه مخکې وګورئ — د ناموافق شمېرونکي په همدې ډول پلي کول کولی شي د یوې روغې هټۍ ثبت کول رد کړي. |
| `platform.act.done` | Done — the act and its event were recorded. | ہو گیا — عمل اور اس کا واقعہ درج ہو گیا۔ | ترسره شو — عمل او د هغه پېښه ثبت شوه. |
| `platform.act.enforceOff` | Turn enforcement OFF | نفاذ بند کریں | پلي کول بند کړئ |
| `platform.act.enforceOn` | Turn enforcement ON | نفاذ فعال کریں | پلي کول فعال کړئ |
| `platform.act.enforceTitle` | Enforcement | نفاذ | پلي کول |
| `platform.act.extend` | Extend | بڑھائیں | وغځوئ |
| `platform.act.extendTitle` | Extend period | مدت بڑھائیں | موده وغځوئ |
| `platform.act.failed` | The act failed. Nothing was written. | عمل ناکام رہا۔ کچھ درج نہیں ہوا۔ | عمل ناکام شو. هېڅ ولیکل نه شو. |
| `platform.act.invoicesLimit` | Invoices limit (blank = plan default) | رسیدوں کی حد (خالی = پلان کی طے شدہ) | د بلونو حد (تش = د پلان ډیفالټ) |
| `platform.act.newEnd` | New end date | نئی آخری تاریخ | د پای نوې نېټه |
| `platform.act.periodEnd` | Period ends | مدت ختم | موده پای ته رسېږي |
| `platform.act.reason` | Reason (recorded in the event log) | وجہ (واقعات کے ریکارڈ میں درج ہوگی) | دلیل (د پېښو په لاګ کې ثبت شوی) |
| `platform.act.suspend` | Suspend | معطل کریں | وځنډوئ |
| `platform.act.suspendTitle` | Suspend business | کاروبار معطل کریں | سوداګري وځنډوئ |
| `platform.act.usersLimit` | Users limit (blank = plan default) | صارفین کی حد (خالی = پلان کی طے شدہ) | د کاروونکو حد (تش = د پلان ډیفالټ) |
| `platform.admins.added` | Added | شمولیت | زیات شوی |
| `platform.admins.addedBy` | Added by | شامل کنندہ | زیات شوی لخوا |
| `platform.admins.email` | Email | ای میل | برېښنالیک |
| `platform.admins.grant` | Grant admin | منتظم بنائیں | مدیر ورکړئ |
| `platform.admins.lastNote` | The last admin cannot be revoked. | آخری منتظم کو نہیں ہٹایا جا سکتا۔ | وروستی مدیر نه شي لغوه کېدلی. |
| `platform.admins.revoke` | Revoke | ہٹائیں | لغوه کړئ |
| `platform.admins.selfNote` | You cannot revoke yourself. | آپ خود کو نہیں ہٹا سکتے۔ | تاسو خپل ځان نه شئ لغوه کولی. |
| `platform.admins.title` | Platform admins | پلیٹ فارم منتظمین | د پلیټفارم مدیران |
| `platform.admins.uid` | User ID (from Firebase Authentication) | صارف شناخت (Firebase Authentication سے) | د کاروونکي ID (د Firebase Authentication څخه) |
| `platform.admins.you` | You | آپ | تاسو |
| `platform.agg.enforced` | Enforcement on | نفاذ فعال | پلي کول فعال |
| `platform.agg.invoicesMonth` | Invoices this month (from counters) | اس ماہ کی رسیدیں (کاؤنٹرز سے) | د دې میاشتې بلونه (له شمېرونکو) |
| `platform.agg.pending` | Payments awaiting confirmation | تصدیق کی منتظر ادائیگیاں | تایید ته انتظار تادیې |
| `platform.agg.revenue` | Confirmed revenue | تصدیق شدہ آمدنی | تایید شوي عایدات |
| `platform.agg.suspended` | Suspended | معطل | ځنډول شوي |
| `platform.agg.total` | Businesses | کاروبار | سوداګرۍ |
| `platform.agg.trialPool` | Trial invoices used (pool) | استعمال شدہ ٹرائل رسیدیں (مجموعی) | کارول شوي آزموینې بلونه (ټولګه) |
| `platform.back` | Back to directory | فہرست کی طرف واپس | لارښود ته بېرته |
| `platform.badge` | Platform | پلیٹ فارم | پلیټفارم |
| `platform.cfg.accountTitle` | Account title | اکاؤنٹ عنوان | د حساب سرلیک |
| `platform.cfg.bank` | Bank name | بینک کا نام | د بانک نوم |
| `platform.cfg.iban` | IBAN | IBAN | IBAN |
| `platform.cfg.instructions` | Instructions (shown verbatim) | ہدایات (بعیینہٖ دکھائی جائیں گی) | لارښوونې (په لفظي ډول ښودل شوي) |
| `platform.cfg.intro` | What shopkeepers see on the renewal surface: where to send plan payments, and how to reach support. Display text only — there is no gateway behind it. | تجدید کی سطح پر دکان دار یہ دیکھتے ہیں: پلان کی ادائیگی کہاں بھیجنی ہے، اور معاونت کے لیے کس سے رابطہ کرنا ہے۔ یہ صرف معلوماتی متن ہے — اس کے پیچھے کوئی گیٹ وے نہیں۔ | هغه څه چې هټۍ والا د نوي کولو په ځای کې ګوري: د پلان تادیې چېرته ولېږي، او ملاتړ ته څنګه ورسېږي. یوازې ښودل کېدونکی متن — د هغه تر شا هېڅ دروازه نشته. |
| `platform.cfg.raast` | Raast number | راست نمبر | Raast شمېره |
| `platform.cfg.save` | Save instructions | ہدایات محفوظ کریں | لارښوونې خوندي کړئ |
| `platform.cfg.support` | Support contact | معاونت رابطہ | د ملاتړ اړیکه |
| `platform.cfg.title` | Payment instructions | ادائیگی ہدایات | د تادیې لارښوونې |
| `platform.cfg.updated` | Last updated {date} by {by} | آخری تبدیلی {date}، بذریعہ {by} | وروستی تازه {date} لخوا {by} |
| `platform.col.business` | Business | کاروبار | سوداګري |
| `platform.col.enforce` | Enforce | نفاذ | پلي کړئ |
| `platform.col.invoices` | Invoices | رسیدیں | بلونه |
| `platform.col.lastActive` | Last active | آخری سرگرمی | وروستی فعالیت |
| `platform.col.members` | Members | ممبر | غړي |
| `platform.col.owner` | Owner | مالک | مالک |
| `platform.demoBody` | The platform console runs on the live platform only — demo mode has no businesses to administer. | پلیٹ فارم کنسول صرف اصل پلیٹ فارم پر چلتا ہے — ڈیمو حالت میں انتظام کے لیے کوئی کاروبار نہیں ہوتا۔ | د پلیټفارم کنسول یوازې په ژوندي پلیټفارم چلېږي — ډیمو حالت د اداره کولو لپاره سوداګرۍ نه لري. |
| `platform.deniedBody` | This section belongs to the platform team. It opens only with a platform admin grant — shop accounts, including shop owners, do not open it. | یہ حصہ پلیٹ فارم ٹیم کے لیے ہے۔ یہ صرف پلیٹ فارم منتظم کی اجازت سے کھلتا ہے — دکان کے اکاؤنٹ، بشمول دکان کے مالک، اسے نہیں کھولتے۔ | دا برخه د پلیټفارم ډلې پورې اړه لري. هغه یوازې د پلیټفارم مدیر په اجازه خلاصېږي — د هټۍ حسابونه، د هټۍ مالکانو په ګډون، هغه نه خلاصوي. |
| `platform.deniedTitle` | Not a platform admin | پلیٹ فارم منتظم نہیں | د پلیټفارم مدیر نه دی |
| `platform.detail.assignedBy` | Assigned by | تفویض کنندہ | ګمارل شوی لخوا |
| `platform.detail.businessId` | Business ID (owner account) | کاروبار شناخت (مالک اکاؤنٹ) | د سوداګرۍ ID (د مالک حساب) |
| `platform.detail.city` | City | شہر | ښار |
| `platform.detail.counters` | Counters (rules-verified) | کاؤنٹرز (اصولوں سے تصدیق شدہ) | شمېرونکي (د قواعدو له مخې تایید شوي) |
| `platform.detail.created` | Created | قیام | جوړ شوی |
| `platform.detail.events` | Event timeline | واقعات کی تفصیل | د پېښو مهال وېش |
| `platform.detail.history` | Plan history | پلان کی تاریخ | د پلان تاریخ |
| `platform.detail.membersJoined` | Members joined (membership records) | شامل ممبر (رکنیت ریکارڈ سے) | ګډ شوي غړي (د غړیتوب ریکارډونه) |
| `platform.detail.payments` | Payments | ادائیگیاں | تادیې |
| `platform.detail.registry` | Registry | رجسٹری | راجسټري |
| `platform.detail.snapshot` | Current assignment | موجودہ تفویض | اوسنی ګمارنه |
| `platform.detail.telemetry` | Telemetry | سرگرمی اعداد | له لرې اندازه کول |
| `platform.empty` | No businesses match. | کوئی کاروبار مطابق نہیں ملا۔ | هېڅ سوداګري سمون نه خوري. |
| `platform.events.empty` | No platform events yet. | ابھی کوئی پلیٹ فارم واقعہ نہیں۔ | تر اوسه د پلیټفارم پېښې نشته. |
| `platform.filter.allEnforce` | Enforcement: all | نفاذ: تمام | پلي کول: ټول |
| `platform.filter.allPlans` | All plans | تمام پلان | ټول پلانونه |
| `platform.filter.allStates` | All states | تمام حالتیں | ټول حالتونه |
| `platform.filter.allStatuses` | All statuses | تمام درجے | ټول حالتونه |
| `platform.filter.enforceOff` | Enforcement off | نفاذ بند | پلي کول بند |
| `platform.filter.enforceOn` | Enforcement on | نفاذ فعال | پلي کول فعال |
| `platform.history.empty` | No plan changes recorded. | پلان کی کوئی تبدیلی درج نہیں۔ | د پلان هېڅ بدلون نه دی ثبت شوی. |
| `platform.never` | Never | کبھی نہیں | هېڅکله نه |
| `platform.pay.confirm` | Confirm | تصدیق کریں | تایید کړئ |
| `platform.pay.confirmed` | Confirmed | تصدیق شدہ | تایید شوی |
| `platform.pay.empty` | The confirmation queue is empty. | تصدیق کی قطار خالی ہے۔ | د تایید کتار تش دی. |
| `platform.pay.method` | Method | طریقہ | طریقه |
| `platform.pay.mismatch` | Differs from the catalogue price | کیٹلاگ قیمت سے مختلف | د کټالوګ له بیې څخه توپیر لري |
| `platform.pay.note` | Rejection note (the owner sees this) | مسترد کرنے کی یادداشت (مالک اسے دیکھے گا) | د ردولو یادښت (مالک دا ګوري) |
| `platform.pay.period` | Period bought | خریدی گئی مدت | اخیستل شوې موده |
| `platform.pay.raast` | Raast | راست | Raast |
| `platform.pay.reference` | Reference | حوالہ | حواله |
| `platform.pay.reject` | Reject | مسترد کریں | رد کړئ |
| `platform.pay.submitted` | Submitted | جمع شدہ | سپارل شوی |
| `platform.payments.empty` | No payments recorded. | کوئی ادائیگی درج نہیں۔ | هېڅ تادیه نه ده ثبت شوې. |
| `platform.searchPlaceholder` | Search name, email, phone, city… | نام، ای میل، فون، شہر تلاش کریں… | نوم، برېښنالیک، تلیفون، ښار ولټوئ… |
| `platform.signInPrompt` | Sign in with an admin account to continue. | جاری رکھنے کے لیے منتظم اکاؤنٹ سے سائن ان کریں۔ | د دوام لپاره په مدیر حساب ننوځئ. |
| `platform.softLabel` | Reported by the shop's app (soft) | دکان کی ایپ کی اطلاع (غیر حتمی) | د هټۍ ایپ له خوا راپور شوی (نرم) |
| `platform.tab.admins` | Admins | منتظمین | مدیران |
| `platform.tab.businesses` | Businesses | کاروبار | سوداګرۍ |
| `platform.tab.config` | Payment instructions | ادائیگی ہدایات | د تادیې لارښوونې |
| `platform.tab.payments` | Payment queue | ادائیگیوں کی قطار | د تادیې کتار |
| `platform.title` | Platform console | پلیٹ فارم کنسول | د پلیټفارم کنسول |
| `renew.accountTitle` | Account title | اکاؤنٹ عنوان | د حساب سرلیک |
| `renew.amount` | Amount to pay | قابلِ ادائیگی رقم | د ورکړې مبلغ |
| `renew.bank` | Bank | بینک | بانک |
| `renew.banner.graceLeft` | {days} days of grace left before the shop becomes read-only. | دکان کے صرف مطالعہ ہونے سے پہلے رعایتی مدت کے {days} دن باقی ہیں۔ | د هټۍ یوازې لوستل کېدو څخه مخکې {days} ورځې مهلت پاتې دی. |
| `renew.banner.suspendedReason` | Reason: {reason} | وجہ: {reason} | دلیل: {reason} |
| `renew.banner.suspendedRemedy` | To restore posting, submit the plan payment from Settings or contact the platform. | اندراج بحال کرنے کے لیے ترتیبات سے پلان کی ادائیگی جمع کرائیں یا پلیٹ فارم سے رابطہ کریں۔ | د ثبت کولو بیا راوستلو لپاره، له تنظیمات څخه د پلان تادیه وسپارئ یا له پلیټفارم سره اړیکه ونیسئ. |
| `renew.banner.trialApproaching` | Your free trial ends in {days} days — renew now so posting continues without a pause. | آپ کا مفت ٹرائل {days} دن میں ختم ہو رہا ہے — ابھی تجدید کریں تاکہ اندراج بغیر رکاوٹ جاری رہے۔ | ستاسو وړیا آزموینه په {days} ورځو کې پای ته رسېږي — اوس نوي کړئ تر څو ثبت کول له ځنډ پرته دوام وکړي. |
| `renew.banner.trialUrgent` | Your free trial ends in {days} day(s) — renew today to keep posting. | آپ کا مفت ٹرائل {days} دن میں ختم ہو رہا ہے — اندراج جاری رکھنے کے لیے آج ہی تجدید کریں۔ | ستاسو وړیا آزموینه په {days} ورځ(و) کې پای ته رسېږي — د ثبت کولو ساتلو لپاره نن نوي کړئ. |
| `renew.billing.annual` | Annual — 12 months for the price of 10 | سالانہ — 10 کی قیمت میں 12 ماہ | کلنی — د 10 په بیه 12 میاشتې |
| `renew.billing.monthly` | Monthly | ماہانہ | میاشتنی |
| `renew.billingLabel` | Billing period | ادائیگی کی مدت | د بل کولو موده |
| `renew.cta` | Renew now | ابھی تجدید کریں | اوس نوي کړئ |
| `renew.enterpriseNote` | Enterprise terms are arranged directly with the platform — this plan's renewals are handled by the platform team. | انٹرپرائز شرائط براہِ راست پلیٹ فارم سے طے ہوتی ہیں — اس پلان کی تجدید پلیٹ فارم ٹیم کے ذریعے ہوتی ہے۔ | د Enterprise شرایط مستقیم له پلیټفارم سره تنظیمېږي — د دې پلان نوي کول د پلیټفارم ډلې له خوا کېږي. |
| `renew.error.quoteChanged` | The amount or period changed — review the figures, then submit again. | رقم یا مدت بدل گئی ہے — اعداد دیکھ کر دوبارہ جمع کرائیں۔ | مبلغ یا موده بدله شوه — شمېرې وګورئ، بیا بیا وسپارئ. |
| `renew.error.referenceRequired` | Enter the transaction reference first — the platform checks it against the transfer. | پہلے ٹرانزیکشن حوالہ درج کریں — پلیٹ فارم اسی سے منتقلی کی جانچ کرتا ہے۔ | لومړی د راکړې ورکړې حواله دننه کړئ — پلیټفارم هغه د لېږد په وړاندې ګوري. |
| `renew.historyTitle` | Your payment records | آپ کے ادائیگی ریکارڈ | ستاسو د تادیې ریکارډونه |
| `renew.iban` | IBAN | IBAN | IBAN |
| `renew.instructionsNone` | Payment instructions have not been published yet — please contact the platform before paying. | ادائیگی کی ہدایات ابھی شائع نہیں ہوئیں — ادائیگی سے پہلے پلیٹ فارم سے رابطہ کریں۔ | د تادیې لارښوونې لا نه دي خپرې شوې — مهرباني وکړئ د تادیې څخه مخکې له پلیټفارم سره اړیکه ونیسئ. |
| `renew.instructionsTitle` | How to pay | ادائیگی کا طریقہ | څنګه تادیه وکړئ |
| `renew.intro` | Pay the platform by transfer, then submit the record here. Your new period starts when the platform confirms the payment — from the later of your current period's end and the confirmation. | منتقلی کے ذریعے پلیٹ فارم کو ادائیگی کریں، پھر ریکارڈ یہاں جمع کرائیں۔ آپ کی نئی مدت پلیٹ فارم کی تصدیق پر شروع ہوتی ہے — موجودہ مدت کے اختتام اور تصدیق میں سے جو بعد میں ہو۔ | پلیټفارم ته د لېږد له لارې تادیه وکړئ، بیا ریکارډ دلته وسپارئ. ستاسو نوې موده کله چې پلیټفارم تادیه تایید کړي پیلېږي — ستاسو د اوسنۍ مودې د پای او تایید له وروستي څخه. |
| `renew.methodLabel` | I paid via | میں نے ادائیگی کی بذریعہ | ما له لارې تادیه وکړه |
| `renew.noteLabel` | Note (optional) | یادداشت (اختیاری) | یادښت (اختیاري) |
| `renew.pay.confirmedPeriod` | Confirmed — your plan now runs to {date}. | تصدیق شدہ — آپ کا پلان اب {date} تک چلے گا۔ | تایید شو — ستاسو پلان اوس تر {date} پورې چلېږي. |
| `renew.pay.pending` | Awaiting platform confirmation | پلیٹ فارم کی تصدیق کی منتظر | د پلیټفارم تایید ته انتظار |
| `renew.pay.rejectedHint` | You can pay again and submit a new record. | آپ دوبارہ ادائیگی کر کے نیا ریکارڈ جمع کرا سکتے ہیں۔ | تاسو بیا تادیه کولی شئ او نوی ریکارډ وسپارئ. |
| `renew.periodPreview` | Period this buys: {from} → {to} | اس سے ملنے والی مدت: {from} ← {to} | دا موده اخلي: {from} → {to} |
| `renew.planLabel` | Plan | پلان | پلان |
| `renew.raastNumber` | Raast number | راست نمبر | Raast شمېره |
| `renew.referenceHint` | Shown in your banking app or on the slip | آپ کی بینک ایپ یا سلپ پر درج ہوتا ہے | ستاسو په بانک ایپ یا په رسید کې ښودل شوی |
| `renew.referenceLabel` | Transaction ID / reference | ٹرانزیکشن شناخت / حوالہ | د راکړې ورکړې ID / حواله |
| `renew.submit` | Submit payment record | ادائیگی کا ریکارڈ جمع کرائیں | د تادیې ریکارډ وسپارئ |
| `renew.submit.done` | Submitted. The platform confirms after checking the transfer; your period extends at confirmation. | جمع ہو گیا۔ پلیٹ فارم منتقلی کی جانچ کے بعد تصدیق کرتا ہے؛ تصدیق پر آپ کی مدت بڑھ جائے گی۔ | وسپارل شو. پلیټفارم د لېږد له کتلو وروسته تایید کوي؛ ستاسو موده په تایید سره غځېږي. |
| `renew.submit.failed` | The submission failed — nothing was recorded. Please try again. | جمع کرانا ناکام رہا — کچھ درج نہیں ہوا۔ دوبارہ کوشش کریں۔ | سپارل ناکام شو — هېڅ ثبت نه شو. مهرباني وکړئ بیا هڅه وکړئ. |
| `renew.supportLabel` | Support | معاونت | ملاتړ |
| `renew.title` | Renew or upgrade | تجدید یا اپ گریڈ | نوي کړئ یا لوړ کړئ |
## demo

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `demo.addBody` | Your business is empty. The demo set below will be added so you can explore every screen with realistic data. It never mixes with real books: once you trade for real, demo data can no longer be added. | آپ کا کاروبار خالی ہے۔ نیچے دیا گیا ڈیمو سیٹ شامل ہو جائے گا تاکہ آپ ہر اسکرین حقیقی جیسے ڈیٹا کے ساتھ دیکھ سکیں۔ یہ کبھی اصل کھاتوں میں نہیں ملے گا: ایک بار اصل لین دین شروع ہو جائے تو ڈیمو ڈیٹا شامل نہیں ہو سکے گا۔ | ستاسو کاروبار تش دی. لاندې ډیمو ټولګه به اضافه شي ترڅو تاسو هره پرده په واقعي معلوماتو وګورئ. دا هېڅکله له اصلي کتابونو سره نه ګډېږي: کله چې تاسو په رښتیا تجارت پیل کړئ، نو ډیمو معلومات نور نشي اضافه کېدای. |
| `demo.addButton` | Add demo data | ڈیمو ڈیٹا شامل کریں | ډیمو معلومات اضافه کړئ |
| `demo.addedBody` | Added: {products} products, {customers} customers, {suppliers} suppliers, {sales} sales rows, {journal} journal entries. | شامل ہوا: {products} مصنوعات، {customers} گاہک، {suppliers} سپلائر، {sales} فروخت کی قطاریں، {journal} جرنل اندراجات۔ | اضافه شول: {products} توکي، {customers} پېرودونکي، {suppliers} عرضه کوونکي، {sales} د پلور قطارونه، {journal} ژورنال لیکنې. |
| `demo.addedTitle` | Demo data added | ڈیمو ڈیٹا شامل ہو گیا | ډیمو معلومات اضافه شول |
| `demo.addFailed` | Could not add demo data. Please try again. | ڈیمو ڈیٹا شامل نہیں ہو سکا۔ دوبارہ کوشش کریں۔ | ډیمو معلومات اضافه نشول. بیا هڅه وکړئ. |
| `demo.addTitle` | Add demo data? | ڈیمو ڈیٹا شامل کریں؟ | ډیمو معلومات اضافه کړئ؟ |
| `demo.confirmAdd` | Add demo data | ڈیمو ڈیٹا شامل کریں | ډیمو معلومات اضافه کړئ |
| `demo.confirmReAdd` | Wipe demo & re-add | ڈیمو صاف کریں اور دوبارہ شامل کریں | ډیمو پاک کړئ او بیا اضافه کړئ |
| `demo.preListCustomers` | {n} customers | {n} گاہک | {n} پېرودونکي |
| `demo.preListJournal` | {n} journal entries | {n} جرنل اندراجات | {n} ژورنال لیکنې |
| `demo.preListProducts` | {n} products | {n} مصنوعات | {n} توکي |
| `demo.preListSales` | {n} sales rows | {n} فروخت کی قطاریں | {n} د پلور قطارونه |
| `demo.preListStock` | Stock worth {amount} at cost | اسٹاک مالیت {amount} (لاگت پر) | زېرمه په ارزښت {amount} په لګښت |
| `demo.preListSuppliers` | {n} suppliers | {n} سپلائر | {n} عرضه کوونکي |
| `demo.preListTitle` | This demo set will be added | یہ ڈیمو سیٹ شامل ہو گا | دا ډیمو ټولګه به اضافه شي |
| `demo.reAddBody` | This wipes the current demo data and adds a fresh demo set. Your real data is never touched — this action is refused if the business holds any real record. | اس سے موجودہ ڈیمو ڈیٹا صاف ہو کر نیا ڈیمو سیٹ شامل ہو جائے گا۔ آپ کا اصل ڈیٹا کبھی نہیں چھوا جائے گا — اگر کاروبار میں کوئی اصل ریکارڈ ہو تو یہ عمل انکار کر دیا جائے گا۔ | دا به اوسني ډیمو معلومات پاک کړي او تازه ډیمو ټولګه اضافه کړي. ستاسو اصلي معلومات هېڅکله نه لمس کېږي — که کاروبار کوم اصلي ریکارډ ولري، نو دا عمل ردېږي. |
| `demo.reAddButton` | Re-add demo data | ڈیمو ڈیٹا دوبارہ شامل کریں | ډیمو معلومات بیا اضافه کړئ |
| `demo.reAddTitle` | Re-add demo data? | ڈیمو ڈیٹا دوبارہ شامل کریں؟ | ډیمو معلومات بیا اضافه کړئ؟ |
| `demo.refusedMixed` | Demo data cannot be re-added: the business holds real records alongside the demo set. Clear the business first if you want to start over. | ڈیمو ڈیٹا دوبارہ شامل نہیں ہو سکتا: کاروبار میں ڈیمو سیٹ کے ساتھ اصل ریکارڈ بھی موجود ہیں۔ نئے سرے سے شروع کرنا ہو تو پہلے کاروبار کا ڈیٹا صاف کریں۔ | ډیمو معلومات بیا نشي اضافه کېدای: کاروبار د ډیمو ټولګې ترڅنګ اصلي ریکارډونه هم لري. که غواړئ له سره پیل وکړئ، لومړی د کاروبار معلومات پاک کړئ. |
| `demo.refusedReal` | Demo data cannot be added: this business already holds real records. Clear the business first if you want to start over. | ڈیمو ڈیٹا شامل نہیں ہو سکتا: اس کاروبار میں پہلے سے اصل ریکارڈ موجود ہیں۔ نئے سرے سے شروع کرنا ہو تو پہلے کاروبار کا ڈیٹا صاف کریں۔ | ډیمو معلومات نشي اضافه کېدای: دا کاروبار له وړاندې اصلي ریکارډونه لري. که غواړئ له سره پیل وکړئ، لومړی د کاروبار معلومات پاک کړئ. |
## trash

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `trash.clearBody` | Everything in this business — bills, stock, customers, journal, the lot — is snapshotted into trash first, then wiped. The trash snapshot stays restorable for 30 days. Your shop profile, team and plan are NOT cleared. | اس کاروبار کی ہر چیز — بل، اسٹاک، گاہک، جرنل، سب کچھ — پہلے ٹریش میں محفوظ ہو گی، پھر صاف ہو جائے گی۔ ٹریش کا اسنیپ شاٹ 30 دن تک بحال کیا جا سکے گا۔ آپ کی دکان کی پروفائل، ٹیم اور پلان صاف نہیں ہوں گے۔ | په دې کاروبار کې هرڅه — بیلونه، زېرمه، پېرودونکي، ژورنال، ټول — لومړی په کثافاتو کې خوندي کېږي، بیا پاکېږي. د کثافاتو انځور ۳۰ ورځې د بېرته راګرځولو وړ پاتې کېږي. ستاسو د هټۍ پروفایل، ډله او پلان نه پاکېږي. |
| `trash.clearButton` | Clear all data | تمام ڈیٹا صاف کریں | ټول معلومات پاک کړئ |
| `trash.cleared` | Business cleared. The snapshot is in trash until {date}. | کاروبار صاف ہو گیا۔ اسنیپ شاٹ {date} تک ٹریش میں رہے گا۔ | کاروبار پاک شو. انځور تر {date} پورې په کثافاتو کې دی. |
| `trash.clearedAt` | Cleared {date} | صاف کیا گیا {date} | پاک شو {date} |
| `trash.clearFailed` | Could not clear the business. Nothing was wiped. | کاروبار صاف نہیں ہو سکا۔ کچھ بھی صاف نہیں ہوا۔ | کاروبار پاک نشو. هېڅ شی پاک نشو. |
| `trash.clearing` | Clearing… | صاف ہو رہا ہے… | پاکېږي… |
| `trash.clearTitle` | Clear all data? | تمام ڈیٹا صاف کریں؟ | ټول معلومات پاک کړئ؟ |
| `trash.dangerSub` | These actions change the whole business. They are owner-only and PIN-gated. | یہ اقدامات پورے کاروبار کو بدل دیتے ہیں۔ یہ صرف مالک کے لیے ہیں اور PIN سے محفوظ ہیں۔ | دا کړنې ټول کاروبار بدلوي. دا یوازې د مالک لپاره دي او په PIN خوندي دي. |
| `trash.dangerTitle` | Danger zone | خطرناک زون | خطرناکه سیمه |
| `trash.deleteButton` | Delete permanently | مستقل حذف کریں | د تل لپاره ړنګ کړئ |
| `trash.deleted` | Trash snapshot deleted permanently. | ٹریش اسنیپ شاٹ مستقل طور پر حذف ہو گیا۔ | د کثافاتو انځور د تل لپاره ړنګ شو. |
| `trash.docs` | {n} documents · {journal} journal entries | {n} دستاویزات · {journal} جرنل اندراجات | {n} سندونه · {journal} ژورنال لیکنې |
| `trash.empty` | Trash is empty. | ٹریش خالی ہے۔ | کثافات تش دي. |
| `trash.expiredLabel` | Expired | معیاد ختم | موده تېره |
| `trash.expires` | Restorable until {date} | بحالی کی آخری تاریخ {date} | تر {date} پورې د بېرته راګرځولو وړ |
| `trash.replaceWarning` | Warning: an active trash snapshot already exists. Clearing again will DELETE it permanently — it cannot be restored afterwards. | خبردار: ٹریش میں پہلے سے ایک فعال اسنیپ شاٹ موجود ہے۔ دوبارہ صاف کرنے سے وہ مستقل طور پر حذف ہو جائے گا — اس کے بعد اسے بحال نہیں کیا جا سکے گا۔ | خبرداری: په کثافاتو کې له وړاندې یو فعال انځور شته. بیا پاکول به هغه د تل لپاره ړنګ کړي — له هغه وروسته یې بېرته نشئ راګرځولای. |
| `trash.restoreButton` | Restore | بحال کریں | بېرته راګرځول |
| `trash.restoredLabel` | Restored | بحال شدہ | بېرته راګرځېدلی |
| `trash.restoreDone` | Restored. The business now holds the trashed books exactly. | بحال ہو گیا۔ کاروبار میں اب بالکل وہی کھاتے ہیں جو ٹریش میں تھے۔ | بېرته راګرځېدلی. کاروبار اوس په کره توګه هغه کتابونه لري چې په کثافاتو کې وو. |
| `trash.restoreExpired` | This trash snapshot has expired and can no longer be restored. | اس ٹریش اسنیپ شاٹ کی معیاد ختم ہو گئی ہے، اب اسے بحال نہیں کیا جا سکتا۔ | د دې کثافاتو انځور موده تېره شوې او نور نشي بېرته راګرځېدای. |
| `trash.restoreRefused` | Restore refused: the business is no longer empty. New data must be cleared first — a restore never merges. | بحالی انکار: کاروبار اب خالی نہیں رہا۔ پہلے نیا ڈیٹا صاف کرنا ہو گا — بحالی کبھی ضم نہیں کرتی۔ | بېرته راګرځول رد شو: کاروبار نور تش نه دی. لومړی باید نوي معلومات پاک شي — بېرته راګرځول هېڅکله نه ګډېږي. |
| `trash.storefrontNote` | Note: a published storefront is not cleared with the business. Unpublish it from the storefront screen if you no longer want it public. | نوٹ: شائع شدہ اسٹور فرنٹ کاروبار کے ساتھ صاف نہیں ہوتا۔ اگر اسے عوامی نہیں رکھنا تو اسٹور فرنٹ اسکرین سے غیر شائع کریں۔ | یادونه: خپور شوی سټورفرنټ له کاروبار سره نه پاکېږي. که نور یې عامه نه غواړئ، له سټورفرنټ پردې یې ناخپور کړئ. |
| `trash.sweepNote` | Expired snapshots are deleted when this panel opens. | معیاد ختم شدہ اسنیپ شاٹ اس پینل کے کھلنے پر حذف ہو جاتے ہیں۔ | موده تېره انځورونه د دې پینل په پرانیستلو ړنګېږي. |
| `trash.title` | Trash | ٹریش | کثافات |
| `trash.typeLabel` | Type CLEAR to confirm | تصدیق کے لیے CLEAR لکھیں | د تایید لپاره CLEAR ولیکئ |
| `trash.typeMismatch` | Type CLEAR exactly to confirm. | تصدیق کے لیے بالکل CLEAR لکھیں۔ | د تایید لپاره په کره توګه CLEAR ولیکئ. |
