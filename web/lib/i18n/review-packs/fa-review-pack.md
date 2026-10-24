# Dukaan AI — Farsi / Dari (فارسی) review pack

Every UI string in the product, with the English source, the reviewed Urdu, and the Farsi / Dari (فارسی) MACHINE DRAFT side by side. Correct the draft in place (edit the CSV twin of this sheet: put fixed text in `corrected`, mark `1` in `seen` for every row you have read). Money surfaces (billing, finance, reports, print) come first on purpose. Keys you mark seen become `reviewed` when the pack is merged; the language keeps its "Draft preview" badge until every key is reviewed.

## billing

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `billing.actions` | Actions | اقدامات | اقدامات |
| `billing.addAndSelect` | Add & select | شامل کر کے منتخب کریں | اضافه و انتخاب كنيد |
| `billing.addPayment` | Add payment | ادائیگی شامل کریں | پرداخت اضافه كنيد |
| `billing.availWarn` | {name}: only {available} available — {promised} already promised on open orders and challans. | {name}: صرف {available} دستیاب ہے — {promised} پہلے ہی کھلے آرڈرز اور چالانوں پر وعدہ شدہ ہے۔ | {name}: فقط {available} موجود است — {promised} قبلاً در سفارش‌ها و چالان‌هاي باز وعده داده شده است۔ |
| `billing.billNoTitle` | Bill #{no} | بل نمبر {no} | بل #{no} |
| `billing.builderHint` | A USB barcode scanner works right away — it types the SKU and presses Enter. | USB بار کوڈ اسکینر فوراً کام کرتا ہے — یہ SKU لکھ کر Enter دبا دیتا ہے۔ | اسكنر باركد USB فوراً كار مي‌كند — SKU را مي‌نويسد و Enter مي‌زند۔ |
| `billing.cartEmpty` | No items yet — find a product or scan a SKU to add it. | ابھی کوئی شے نہیں — پراڈکٹ تلاش کریں یا SKU اسکین کریں، شامل ہو جائے گی۔ | هنوز كالايي نيست — يك كالا پيدا كنيد يا SKU را اسكن كنيد تا اضافه شود۔ |
| `billing.cartItems` | {count} items | {count} اشیاء | {count} كالا |
| `billing.chooseProduct` | — Choose a product — | — پراڈکٹ منتخب کریں — | — يك كالا انتخاب كنيد — |
| `billing.closeDetailAria` | Close bill detail | بل کی تفصیل بند کریں | جزئيات بل را ببنديد |
| `billing.completeBill` | Complete bill | بل مکمل کریں | بل را تكميل كنيد |
| `billing.completeHeldBill` | Complete held bill | رکا ہوا بل مکمل کریں | بل نگه‌داشته‌شده را تكميل كنيد |
| `billing.creditNote` | Credit (udhaar) needs a customer name — the unpaid balance ({amount}) lands in the customer's khata automatically. | ادھار کے لیے گاہک کا نام ضروری ہے — بقایا رقم ({amount}) خود بخود گاہک کے کھاتے میں چلی جاتی ہے۔ | قرض (ادهار) به نام مشتري نياز دارد — مانده پرداخت‌نشده ({amount}) به‌طور خودكار به حساب مشتري مي‌رود۔ |
| `billing.customerName` | Customer name | گاہک کا نام | نام مشتري |
| `billing.customerNamePlaceholder` | Optional for cash-only bills | صرف نقد بل کے لیے اختیاری | براي بل‌هاي فقط نقد اختياري است |
| `billing.customerPhone` | Customer phone | گاہک کا فون | تلفن مشتري |
| `billing.customerPhonePlaceholder` | Needed to send the bill on WhatsApp | بل WhatsApp پر بھیجنے کے لیے ضروری | براي فرستادن بل در WhatsApp لازم است |
| `billing.customerSaved` | Customer (saved) | گاہک (محفوظ شدہ) | مشتري (ذخيره‌شده) |
| `billing.decreaseQtyOf` | Decrease quantity of {name} | {name} کی مقدار کم کریں | مقدار {name} را كم كنيد |
| `billing.detailAria` | Bill detail | بل کی تفصیل | جزئيات بل |
| `billing.discardHeldAria` | Discard held bill {no} | رکا ہوا بل نمبر {no} ختم کریں | بل نگه‌داشته‌شده {no} را دور بيندازيد |
| `billing.discount` | Discount | رعایت | تخفيف |
| `billing.discountFlat` | Flat (Rs) | فکسڈ (روپے) | ثابت (Rs) |
| `billing.discountPercent` | Percent (%) | فیصد (%) | درصد (%) |
| `billing.discountValueAria` | Discount value | رعایت کی رقم | مقدار تخفيف |
| `billing.errBillFailed` | Could not complete the bill — check the stock and payments, then try again. | بل مکمل نہیں ہو سکا — اسٹاک اور ادائیگیاں جانچ کر دوبارہ کوشش کریں۔ | بل تكميل نشد — موجودي و پرداخت‌ها را بررسي كنيد، بعد دوباره تلاش كنيد۔ |
| `billing.errCreditNeedsName` | A credit (udhaar) payment needs a customer name — pick a customer or type the name first. | ادھار ادائیگی کے لیے گاہک کا نام ضروری ہے — گاہک منتخب کریں یا پہلے نام لکھیں۔ | پرداخت قرض (ادهار) به نام مشتري نياز دارد — يك مشتري انتخاب كنيد يا اول نام را بنويسيد۔ |
| `billing.errHeldCompleteFailed` | Could not complete the held bill — stock may have changed since it was held. Check the items and try again. | رکا ہوا بل مکمل نہیں ہو سکا — بل روکنے کے بعد اسٹاک بدل چکا ہو سکتا ہے۔ اشیاء جانچ کر دوبارہ کوشش کریں۔ | بل نگه‌داشته‌شده تكميل نشد — ممكن است موجودي از زمان نگه‌داشتن تغيير كرده باشد۔ كالاها را بررسي كنيد و دوباره تلاش كنيد۔ |
| `billing.errHeldGone` | That held bill is no longer available. | وہ رکا ہوا بل اب دستیاب نہیں۔ | آن بل نگه‌داشته‌شده ديگر موجود نيست۔ |
| `billing.errHoldFailed` | Could not hold this bill. Please try again. | یہ بل روکا نہیں جا سکا۔ براہ کرم دوبارہ کوشش کریں۔ | اين بل نگه داشته نشد۔ لطفاً دوباره تلاش كنيد۔ |
| `billing.errItemGone` | One of the items is no longer in the inventory. | ایک شے اب اسٹاک میں موجود نہیں۔ | يكي از كالاها ديگر در موجودي نيست۔ |
| `billing.errNcName` | Enter the new customer's name first. | پہلے نئے گاہک کا نام لکھیں۔ | اول نام مشتري جديد را وارد كنيد۔ |
| `billing.errNoItems` | Add at least one item to the bill first. | پہلے بل میں کم از کم ایک شے شامل کریں۔ | اول حداقل يك كالا به بل اضافه كنيد۔ |
| `billing.errOutOfStock` | Out of stock — only {qty} {unit} of {name} available. | اسٹاک ختم — {name} کے صرف {qty} {unit} دستیاب ہیں۔ | موجودي تمام — فقط {qty} {unit} از {name} موجود است۔ |
| `billing.errPayMismatch` | Payments add up to {paid} but the bill total is {total}. Adjust the payments so the remaining amount is zero. | ادائیگیوں کا مجموعہ {paid} ہے جبکہ بل کا کل {total} ہے۔ ادائیگیاں اس طرح درست کریں کہ باقی رقم صفر ہو جائے۔ | پرداخت‌ها {paid} مي‌شود اما مجموع بل {total} است۔ پرداخت‌ها را تنظيم كنيد تا مانده صفر شود۔ |
| `billing.errQtyZero` | Quantity for {name} must be more than zero. | {name} کی مقدار صفر سے زیادہ ہونی چاہیے۔ | مقدار {name} بايد بيشتر از صفر باشد۔ |
| `billing.errReturnFailed` | Could not process the return. Please try again. | واپسی کا عمل مکمل نہیں ہو سکا۔ براہ کرم دوبارہ کوشش کریں۔ | برگشت انجام نشد۔ لطفاً دوباره تلاش كنيد۔ |
| `billing.errReturnMax` | Only {qty} of {name} can still be returned on this bill. | اس بل پر {name} کے صرف {qty} مزید واپس ہو سکتے ہیں۔ | فقط {qty} از {name} در اين بل هنوز قابل برگشت است۔ |
| `billing.errReturnNone` | Enter a return quantity for at least one item. | کم از کم ایک شے کی واپسی مقدار لکھیں۔ | مقدار برگشت براي حداقل يك كالا وارد كنيد۔ |
| `billing.errSkuNotFound` | No product found for SKU “{sku}”. | SKU ”{sku}“ کے لیے کوئی پراڈکٹ نہیں ملا۔ | براي SKU {sku} كالايي يافت نشد۔ |
| `billing.errStockFor` | Not enough stock for {name} — only {qty} {unit} available. | {name} کا اسٹاک کافی نہیں — صرف {qty} {unit} دستیاب ہیں۔ | موجودي {name} كافي نيست — فقط {qty} {unit} موجود است۔ |
| `billing.errVoidFailed` | Could not void this bill. | یہ بل منسوخ نہیں ہو سکا۔ | اين بل باطل نشد۔ |
| `billing.eyebrow` | POS | بلنگ | POS |
| `billing.fillCash` | Fill full amount as cash | پوری رقم نقد لکھیں | مبلغ كامل را نقد پر كنيد |
| `billing.findProduct` | Find product | پراڈکٹ تلاش کریں | كالا را پيدا كنيد |
| `billing.grandTotal` | GRAND TOTAL | کل مجموعہ | مجموع كل |
| `billing.heldAria` | Held bills | رُکے ہوئے بل | بل‌هاي نگه‌داشته‌شده |
| `billing.heldNote` | You are completing held Bill #{no} (total {total}). Payments must match that total — or press “New bill” to start fresh and keep it held. | آپ رکا ہوا بل نمبر {no} (کل {total}) مکمل کر رہے ہیں۔ ادائیگیاں اسی کل کے برابر ہونی چاہئیں — یا ”نیا بل“ دبا کر نیا بل شروع کریں اور اسے رکا ہوا رہنے دیں۔ | شما بل نگه‌داشته‌شده #{no} (مجموع {total}) را تكميل مي‌كنيد۔ پرداخت‌ها بايد با آن مجموع برابر باشد — يا بل جديد را بزنيد تا تازه شروع كنيد و آن را نگه داريد۔ |
| `billing.heldTitle` | Held bills ({count}) | رُکے ہوئے بل ({count}) | بل‌هاي نگه‌داشته‌شده ({count}) |
| `billing.historyAria` | Bills history | بلوں کی تاریخ | تاريخچه بل‌ها |
| `billing.historyEmpty` | No bills match — completed and held bills show up here. | کوئی بل نہیں ملا — مکمل اور رُکے ہوئے بل یہاں نظر آتے ہیں۔ | هيچ بلي مطابقت ندارد — بل‌هاي تكميل‌شده و نگه‌داشته‌شده اينجا نشان داده مي‌شوند۔ |
| `billing.historyTitle` | Bills history | بلوں کی تاریخ | تاريخچه بل‌ها |
| `billing.histSearchAria` | Search bills | بل تلاش کریں | بل‌ها را جستجو كنيد |
| `billing.histSearchPlaceholder` | Search name, phone or bill #… | نام، فون یا بل نمبر تلاش کریں… | نام، تلفن يا شماره بل را جستجو كنيد… |
| `billing.holdBill` | Hold bill | بل روکیں | بل را نگه داريد |
| `billing.inCart` | In bill: {qty} | بل میں: {qty} | در بل: {qty} |
| `billing.increaseQtyOf` | Increase quantity of {name} | {name} کی مقدار بڑھائیں | مقدار {name} را زياد كنيد |
| `billing.keepBill` | Keep the bill | بل رہنے دیں | بل را نگه داريد |
| `billing.lineMeta` | {price} / {unit} · {qty} in stock | {price} فی {unit} · اسٹاک میں {qty} | {price} / {unit} · {qty} در موجودي |
| `billing.ncName` | New customer name * | نئے گاہک کا نام * | نام مشتري جديد * |
| `billing.ncNamePlaceholder` | e.g. Muhammad Ali | مثلاً محمد علی | مثال Muhammad Ali |
| `billing.ncPhone` | New customer phone | نئے گاہک کا فون | تلفن مشتري جديد |
| `billing.ncPhonePlaceholder` | 03xx xxxxxxx | 03xx xxxxxxx | 03xx xxxxxxx |
| `billing.newBill` | New bill | نیا بل | بل جديد |
| `billing.newBillAria` | New bill | نیا بل | بل جديد |
| `billing.newCustomer` | New customer | نیا گاہک | مشتري جديد |
| `billing.noResults` | No product matches “{query}”. | “{query}” سے کوئی پراڈکٹ نہیں ملا۔ | هيچ كالايي با {query} مطابقت ندارد۔ |
| `billing.openDetailTitle` | Open bill detail | بل کی تفصیل کھولیں | جزئيات بل را باز كنيد |
| `billing.optionLabel` | {name} — {price} ({qty} {unit} in stock) | {name} — {price} (اسٹاک میں {qty} {unit}) | {name} — {price} ({qty} {unit} در موجودي) |
| `billing.payAmountAria` | Payment amount | ادائیگی کی رقم | مبلغ پرداخت |
| `billing.payAmountPlaceholder` | Amount (Rs) | رقم (روپے) | مبلغ (Rs) |
| `billing.payments` | Payments | ادائیگیاں | پرداخت‌ها |
| `billing.payMethodAria` | Payment method | ادائیگی کا طریقہ | روش پرداخت |
| `billing.processReturn` | Process return | واپسی مکمل کریں | برگشت را انجام دهيد |
| `billing.product` | Product | پراڈکٹ | كالا |
| `billing.qtyFor` | Quantity for {name} | {name} کی مقدار | مقدار براي {name} |
| `billing.rangeAll` | All time | تمام عرصہ | همه زمان‌ها |
| `billing.rangeAria` | Bill date range | بل کی تاریخ کی حد | بازه تاريخ بل |
| `billing.rangeWeek` | Last 7 days | پچھلے 7 دن | 7 روز گذشته |
| `billing.rcpt.amount` | Total | کل | مجموع |
| `billing.rcpt.billNo` | Bill #{no} | بل نمبر {no} | بل #{no} |
| `billing.rcpt.customer` | Customer | گاہک | مشتري |
| `billing.rcpt.discount` | Discount | رعایت | تخفيف |
| `billing.rcpt.item` | Item | شے | كالا |
| `billing.rcpt.price` | Price | قیمت | قيمت |
| `billing.rcpt.qty` | Qty | مقدار | مقدار |
| `billing.rcpt.subtotal` | Subtotal | ذیلی مجموعہ | جمع فرعي |
| `billing.rcpt.thanks` | Thank you for shopping with us! | ہم سے خریداری کرنے کا شکریہ! | از خريد شما تشكر مي‌كنيم! |
| `billing.rcpt.total` | TOTAL | کل مجموعہ | مجموع |
| `billing.refundMethodAria` | Refund method | رقم واپسی کا طریقہ | روش بازپرداخت |
| `billing.refundPrefix` | Refund: {method} | واپسی: {method} | بازپرداخت: {method} |
| `billing.remaining` | Remaining: {amount} | باقی: {amount} | مانده: {amount} |
| `billing.removeFromBill` | Remove {name} from bill | {name} کو بل سے ہٹائیں | {name} را از بل حذف كنيد |
| `billing.removePayRowAria` | Remove payment row | ادائیگی کی قطار ہٹائیں | قطار پرداخت را حذف كنيد |
| `billing.resultsHint` | Click a product — or use ↑ ↓ + Enter — to add it to the bill. | پراڈکٹ پر کلک کریں — یا ↑ ↓ + Enter استعمال کریں — بل میں شامل ہو جائے گا۔ | يك كالا را كليك كنيد — يا از ↑ ↓ + Enter استفاده كنيد — تا به بل اضافه شود۔ |
| `billing.resultsLabel` | Product results | پراڈکٹ نتائج | نتايج كالا |
| `billing.resume` | Resume | دوبارہ کھولیں | از سر بگيريد |
| `billing.resumingHeld` | Resuming held Bill #{no} | رکا ہوا بل نمبر {no} دوبارہ کھولا جا رہا ہے | بل نگه‌داشته‌شده #{no} از سر گرفته مي‌شود |
| `billing.returnItems` | Return items | اشیاء واپس کریں | كالاها را برگردانيد |
| `billing.returnMeta` | Sold {sold} · returned {returned} · {left} left | فروخت {sold} · واپس {returned} · باقی {left} | فروخته {sold} · برگشته {returned} · {left} مانده |
| `billing.returnNote` | Any udhaar part of the bill is reduced first; the rest is refunded by the chosen method. | بل کا ادھار حصہ پہلے کم کیا جاتا ہے؛ باقی رقم منتخب طریقے سے واپس کی جاتی ہے۔ | هر بخش قرض بل اول كم مي‌شود؛ بقيه با روش انتخاب‌شده بازپرداخت مي‌شود۔ |
| `billing.returnQtyAria` | Return quantity for {name} | {name} کی واپسی مقدار | مقدار برگشت براي {name} |
| `billing.searchPlaceholder` | Search products — click or press Enter to add… | پراڈکٹ تلاش کریں — کلک کریں یا Enter دبائیں، بل میں شامل… | كالاها را جستجو كنيد — براي اضافه كردن كليك كنيد يا Enter بزنيد… |
| `billing.skuHint` | Exact SKU match — Enter adds the item to the bill. | بالکل درست SKU — Enter دبانے سے شے بل میں شامل ہو جاتی ہے۔ | مطابقت دقيق SKU — Enter كالا را به بل اضافه مي‌كند۔ |
| `billing.skuLabel` | SKU / barcode | SKU / بار کوڈ | SKU / باركد |
| `billing.skuPlaceholder` | Scan or type the SKU, then press Enter… | SKU اسکین کریں یا لکھیں، پھر Enter دبائیں… | SKU را اسكن كنيد يا بنويسيد، بعد Enter بزنيد… |
| `billing.status.held` | Held | رکا ہوا | نگه‌داشته‌شده |
| `billing.status.paid` | Paid | ادا شدہ | پرداخت‌شده |
| `billing.status.partially_returned` | Partially returned | جزوی واپس | جزئي برگشته |
| `billing.status.returned` | Returned | واپس شدہ | برگشته |
| `billing.status.voided` | Voided | منسوخ | باطل‌شده |
| `billing.subtitle` | Scan a barcode or pick items, take split payments — cash, wallet, bank or udhaar — hold bills, print receipts and process returns, all from one desk. | بار کوڈ اسکین کریں یا اشیاء منتخب کریں، تقسیم ادائیگی لیں — نقد، والیٹ، بینک یا ادھار — بل روکیں، رسیدیں چھاپیں اور واپسی کا عمل کریں، سب ایک ہی جگہ سے۔ | باركد را اسكن كنيد يا كالاها را انتخاب كنيد، پرداخت‌هاي تقسيم‌شده بگيريد — نقد، كيف پول، بانك يا قرض — بل‌ها را نگه داريد، رسيدها را چاپ كنيد و برگشت‌ها را انجام دهيد، همه از يك ميز۔ |
| `billing.subtotal` | Subtotal | ذیلی مجموعہ | جمع فرعي |
| `billing.successBillCompleted` | Bill completed — the receipt is open. | بل مکمل ہو گیا — رسید کھل گئی ہے۔ | بل تكميل شد — رسيد باز است۔ |
| `billing.successCustomerAdded` | Customer “{name}” added and selected. | گاہک ”{name}“ شامل کر کے منتخب کر لیا گیا۔ | مشتري {name} اضافه و انتخاب شد۔ |
| `billing.successHeld` | Bill held — resume it any time from the held bills list below. | بل روک دیا گیا — نیچے رُکے ہوئے بلوں کی فہرست سے کسی بھی وقت دوبارہ کھولیں۔ | بل نگه داشته شد — هر وقت از ليست بل‌هاي نگه‌داشته‌شده در پايين آن را از سر بگيريد۔ |
| `billing.successHeldCompleted` | Bill #{no} completed — the receipt is open. | بل نمبر {no} مکمل ہو گیا — رسید کھل گئی ہے۔ | بل #{no} تكميل شد — رسيد باز است۔ |
| `billing.successResumed` | Resumed held Bill #{no}. Check the payments below, then press “Complete bill”. | رکا ہوا بل نمبر {no} دوبارہ کھول دیا گیا۔ نیچے ادائیگیاں جانچیں، پھر ”بل مکمل کریں“ دبائیں۔ | بل نگه‌داشته‌شده #{no} از سر گرفته شد۔ پرداخت‌هاي پايين را بررسي كنيد، بعد بل را تكميل كنيد را بزنيد۔ |
| `billing.successReturned` | Return processed for Bill #{no}. Stock and accounts updated. | بل نمبر {no} کی واپسی مکمل ہو گئی۔ اسٹاک اور کھاتے اپ ڈیٹ ہو گئے۔ | برگشت بل #{no} انجام شد۔ موجودي و حساب‌ها به‌روز شد۔ |
| `billing.successVoided` | Bill #{no} voided — stock and payments reversed. | بل نمبر {no} منسوخ ہو گیا — اسٹاک اور ادائیگیاں واپس ہو گئیں۔ | بل #{no} باطل شد — موجودي و پرداخت‌ها برگشت۔ |
| `billing.tax.includedNote` | included in prices | قیمتوں میں شامل | در قيمت‌ها شامل است |
| `billing.tax.lineAmount` | + Tax {amount} | + ٹیکس {amount} | + ماليات {amount} |
| `billing.tax.lineAmountIncl` | Tax incl. {amount} | شامل ٹیکس {amount} | ماليات شامل {amount} |
| `billing.thBillNo` | Bill # | بل نمبر | شماره بل |
| `billing.thCustomer` | Customer | گاہک | مشتري |
| `billing.thDate` | Date & time | تاریخ و وقت | تاريخ و وقت |
| `billing.thItems` | Items | اشیاء | كالاها |
| `billing.thStatus` | Status | حالت | وضعيت |
| `billing.thTotal` | Total | کل | مجموع |
| `billing.title` | Billing | بلنگ | بل‌سازي |
| `billing.viewCart` | View bill | بل دیکھیں | بل را ببينيد |
| `billing.voidBill` | Void bill | بل منسوخ کریں | بل را باطل كنيد |
| `billing.voidBody` | The full {total} will be reversed — stock goes back on the shelf, every payment is returned through its own method, and any udhaar is cancelled. This cannot be undone. | پوری رقم {total} واپس ہو جائے گی — اسٹاک دوبارہ شیلف پر آ جائے گا، ہر ادائیگی اپنے طریقے سے واپس ہوگی اور ادھار ختم ہو جائے گا۔ یہ عمل واپس نہیں ہو سکتا۔ | مبلغ كامل {total} برگردانده خواهد شد — موجودي به قفسه برمي‌گردد، هر پرداخت با روش خودش برگردانده مي‌شود و هر قرض لغو مي‌شود۔ اين كار قابل برگشت نيست۔ |
| `billing.voidModalAria` | Confirm void bill | بل منسوخی کی تصدیق | باطل كردن بل را تأييد كنيد |
| `billing.voidTitle` | Void Bill #{no}? | بل نمبر {no} منسوخ کریں؟ | بل #{no} باطل شود؟ |
| `billing.wa.billLine` | Bill #{no} — {date} | بل نمبر {no} — {date} | بل #{no} — {date} |
| `billing.wa.discount` | Discount: − {amount} | رعایت: − {amount} | تخفيف: − {amount} |
| `billing.wa.itemLine` | {name} × {qty} — {amount} | {name} × {qty} — {amount} | {name} × {qty} — {amount} |
| `billing.wa.payment` | Payment: {payments} | ادائیگی: {payments} | پرداخت: {payments} |
| `billing.wa.raastLine` | Pay via Raast — IBAN {iban} | راست سے ادائیگی — IBAN {iban} | با Raast پرداخت كنيد — IBAN {iban} |
| `billing.wa.tax` | {label}: {amount} | {label}: {amount} | {label}: {amount} |
| `billing.wa.taxIncluded` | {label}: {amount} (included in prices) | {label}: {amount} (قیمتوں میں شامل) | {label}: {amount} (در قيمت‌ها شامل است) |
| `billing.wa.thanks` | Thank you for shopping with us! | ہم سے خریداری کرنے کا شکریہ! | از خريد شما تشكر مي‌كنيم! |
| `billing.wa.total` | TOTAL: {amount} | کل: {amount} | مجموع: {amount} |
| `billing.walkIn` | Walk-in | عام گاہک | گذري |
| `billing.walkInCustomer` | Walk-in customer | عام گاہک | مشتري گذري |
| `billing.walkInOption` | — Walk-in / type the name — | — عام گاہک / نام لکھیں — | — مشتري گذري / نام را بنويسيد — |
## fin

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `fin.acct.bucketBreakdown` | Per-account breakdown | ہر کھاتے کی تفصیل | تفکیک برای هر حساب |
| `fin.acct.capital` | Owner capital | مالک کا سرمایہ | سرمایه مالک |
| `fin.acct.cash` | Cash | نقدی | نقد |
| `fin.acct.cheques_in_hand` | Cheques in hand | موصولہ چیک | چک‌های در دست |
| `fin.acct.cheques_issued` | Cheques issued | جاری کردہ چیک | چک‌های صادرشده |
| `fin.acct.cogs` | Cost of goods sold | فروخت شدہ سامان کی لاگت | قیمت تمام‌شده کالاهای فروخته‌شده |
| `fin.acct.drawings` | Owner drawings | مالک کی ذاتی نکاسی | برداشت‌های مالک |
| `fin.acct.expense_finance` | Finance charges | مالی اخراجات | هزینه‌های مالی |
| `fin.acct.inventory` | Inventory | اسٹاک | موجودی |
| `fin.acct.inventory_loss` | Inventory loss | اسٹاک نقصان | زیان موجودی |
| `fin.acct.inventory_raw` | Raw materials | خام مال | مواد خام |
| `fin.acct.loans_payable` | Loans payable | ادا طلب قرضے | قرض‌های قابل پرداخت |
| `fin.acct.loans_receivable` | Loans receivable | وصول طلب قرضے | قرض‌های دریافتنی |
| `fin.acct.negative` | Negative balance — this account is overdrawn; money went out before it came in. | منفی بیلنس — اس کھاتے سے رقم آنے سے پہلے نکل گئی ہے۔ | مانده منفی — این حساب بیش از حد برداشت شده است؛ پول قبل از آمدن خارج شده است. |
| `fin.acct.negativeLine` | {label}: {name} — {amount} | {label}: {name} — {amount} | {label}: {name} — {amount} |
| `fin.acct.negativeShort` | Negative balance | منفی بیلنس | مانده منفی |
| `fin.acct.payables` | Payables | ادائیگیاں | پرداختنی‌ها |
| `fin.acct.purchases` | Purchases | خریداری | خریدها |
| `fin.acct.receivables` | Receivables | وصولیاں | دریافتنی‌ها |
| `fin.acct.retained_earnings` | Retained earnings | محفوظ منافع | مفاد نگهداشته‌شده |
| `fin.acct.salary_payable` | Salaries payable | ادا طلب تنخواہیں | معاش‌های قابل پرداخت |
| `fin.acct.sales_discount` | Sales discount | فروخت پر رعایت | تخفیف فروش |
| `fin.acct.sales_revenue` | Sales revenue | فروخت کی آمدنی | درآمد فروش |
| `fin.acct.tax_input` | Input tax | ان پٹ ٹیکس | مالیات ورودی |
| `fin.acct.tax_payable` | Tax payable | ادا طلب ٹیکس | مالیات قابل پرداخت |
| `fin.acct.wallet` | Wallet / bank | والیٹ / بینک | کیف پول / بانک |
| `fin.acct.wip` | Work in progress | زیرِ تکمیل کام | کار در جریان |
| `fin.accts.title` | Money accounts | رقم کے کھاتے | حساب‌های پول |
| `fin.aging.age` | Age | مدت | سن |
| `fin.aging.amount` | Amount | رقم | مبلغ |
| `fin.aging.current` | 0–30 days | 0–30 دن | 0–30 روز |
| `fin.aging.d31_60` | 31–60 days | 31–60 دن | 31–60 روز |
| `fin.aging.over60` | 60+ days | 60 سے زائد دن | 60+ روز |
| `fin.aging.payablesTitle` | Payables aging — supplier dues | ادائیگیوں کی مدت — سپلائر بقایا | سن پرداختنی‌ها — بدهی تأمین‌کننده |
| `fin.aging.receivablesTitle` | Receivables aging — udhaar | وصولیوں کی مدت — ادھار | سن دریافتنی‌ها — قرض |
| `fin.aging.total` | Total | کل | مجموع |
| `fin.cash.account` | Account | کھاتہ | حساب |
| `fin.cash.amount` | Amount (PKR) * | رقم (روپے) * | مبلغ (PKR) * |
| `fin.cash.amountError` | Amount must be greater than 0. | رقم 0 سے زیادہ ہونا چاہیے۔ | مبلغ باید بزرگ‌تر از 0 باشد. |
| `fin.cash.amountPlaceholder` | e.g. 5000 | مثلاً 5000 | مثلاً 5000 |
| `fin.cash.caption` | In posts as Owner Capital, Out as Owner Drawings. | آنے والی رقم مالک کے سرمائے کے طور پر اور جانے والی رقم مالک کی ذاتی نکاسی کے طور پر درج ہوتی ہے۔ | داخل به صورت سرمایه مالک ثبت می‌شود، خارج به صورت برداشت مالک. |
| `fin.cash.in` | Cash in | نقد آمد | نقد داخل |
| `fin.cash.kind` | Kind | قسم | نوع |
| `fin.cash.note` | Note | نوٹ | یادداشت |
| `fin.cash.notePlaceholder` | e.g. Owner added cash to till | مثلاً مالک نے گلّے میں نقدی ڈالی | مثلاً مالک نقد به صندوق اضافه کرد |
| `fin.cash.out` | Cash out | نقد اخراج | نقد خارج |
| `fin.cash.post` | Post entry | اندراج کریں | مدخل را ثبت کنید |
| `fin.cash.posted` | Posted: {kind} of {amount} ({method}). | اندراج ہو گیا — {kind}: {amount} ({method}) | ثبت شد: {kind} از {amount} ({method}). |
| `fin.cash.title` | Cash book — manual entry | کیش بک — دستی اندراج | کتاب نقد — ثبت دستی |
| `fin.cb.account` | Account | کھاتہ | حساب |
| `fin.cb.balance` | Balance | بیلنس | مانده |
| `fin.cb.caption` | Showing the latest 60 entries, newest first. Balance is the running balance of that entry's account right after it posted. | تازہ ترین 60 اندراج دکھائے جا رہے ہیں، نئے پہلے۔ بیلنس اس اندراج کے فوراً بعد اسی کھاتے کا جاری بیلنس ہے۔ | آخرین 60 مدخل نمایش داده می‌شود، جدیدترین اول. مانده، مانده جاری حساب آن مدخل درست بعد از ثبت آن است. |
| `fin.cb.date` | Date | تاریخ | تاریخ |
| `fin.cb.description` | Description | تفصیل | توضیح |
| `fin.cb.empty` | No cash book entries yet. | ابھی تک کیش بک میں کوئی اندراج نہیں۔ | هنوز هیچ مدخل کتاب نقدی نیست. |
| `fin.cb.in` | In | آمد | داخل |
| `fin.cb.out` | Out | اخراج | خارج |
| `fin.cb.title` | Cash book | کیش بک | کتاب نقد |
| `fin.chq.caption` | What banks and customers owe the shop in instruments, and what the shop has issued — straight from the ledger's cheque accounts, always equal to the registry's pending totals. | بینکوں اور گاہکوں کے ذمے چیک کی صورت میں واجب رقم، اور دکان کے جاری کردہ چیک — سیدھا کھاتے کے چیک اکاؤنٹس سے، ہمیشہ رجسٹری کے زیر التوا کل کے برابر۔ | آنچه بانک‌ها و مشتریان در اسناد به دکان بدهکارند، و آنچه دکان صادر کرده است — مستقیم از حساب‌های چک دفتر، همیشه برابر با مجموع‌های معلق ثبت. |
| `fin.chq.ledger` | Ledger | کھاتہ | دفتر حساب |
| `fin.chq.open` | Open the registry | رجسٹری کھولیں | ثبت را باز کنید |
| `fin.chq.registry` | Registry | رجسٹری | ثبت |
| `fin.chq.title` | Cheques | چیک | چک‌ها |
| `fin.export.all` | All entries | تمام اندراجات | همه مدخل‌ها |
| `fin.export.caption` | Download CSV files for your accountant or for safekeeping. | اپنے اکاؤنٹنٹ کے لیے یا محفوظ رکھنے کے لیے CSV فائلیں ڈاؤن لوڈ کریں۔ | فایل‌های CSV را برای محاسب خود یا برای نگهداری دانلود کنید. |
| `fin.export.count` | {count} journal entries in this range | اس مدت میں {count} جرنل اندراجات | {count} مدخل ژورنال در این محدوده |
| `fin.export.customers` | Export customers CSV | گاہکوں کی CSV برآمد کریں | CSV مشتریان را صادر کنید |
| `fin.export.empty` | No journal entries in this range. | اس مدت میں کوئی جرنل اندراج نہیں۔ | در این محدوده هیچ مدخل ژورنالی نیست. |
| `fin.export.expenses` | Export expenses CSV | اخراجات کی CSV برآمد کریں | CSV مصارف را صادر کنید |
| `fin.export.journalCsv` | Export journal CSV | جرنل CSV برآمد کریں | ژورنال CSV را صادر کنید |
| `fin.export.lastFiscal` | Last fiscal year | پچھلا مالی سال | سال مالی گذشته |
| `fin.export.ledgerNames` | Tally ledger names | Tally لیجر کے نام | نام‌های دفتر Tally |
| `fin.export.ledgerNamesCaption` | If your Tally already keeps a ledger for an account below, write its name here and exports will use it. Only names can change — each ledger's Tally group is fixed, because a wrong group silently distorts the balance sheet. | اگر آپ کے Tally میں نیچے دیے گئے کسی کھاتے کا لیجر پہلے سے موجود ہے تو اس کا نام یہاں لکھ دیں، برآمد میں وہی نام استعمال ہوگا۔ صرف نام بدلا جا سکتا ہے — ہر لیجر کا Tally گروپ مقرر ہے، کیونکہ غلط گروپ بیلنس شیٹ کو خاموشی سے بگاڑ دیتا ہے۔ | اگر Tally شما قبلاً برای یک حساب زیر دفتر دارد، نام آن را اینجا بنویسید و صادرات از آن استفاده می‌کند. فقط نام‌ها می‌توانند تغییر کنند — گروه Tally هر دفتر ثابت است، چون یک گروه اشتباه ترازنامه را بی‌صدا خراب می‌کند. |
| `fin.export.ledgerSaved` | Ledger names saved | لیجر کے نام محفوظ ہو گئے | نام‌های دفتر ذخیره شد |
| `fin.export.products` | Export products CSV | مصنوعات کی CSV برآمد کریں | CSV کالاها را صادر کنید |
| `fin.export.range` | Export range | برآمد کی مدت | محدوده صادرات |
| `fin.export.sales` | Export sales CSV | فروخت کی CSV برآمد کریں | CSV فروش را صادر کنید |
| `fin.export.tally` | Export Tally XML | Tally XML برآمد کریں | Tally XML را صادر کنید |
| `fin.export.tallyNote` | TallyPrime and Tally ERP 9 accept this standard import file (Gateway → Import Data → Vouchers). Tally versions differ slightly, so import once to validate — the journal CSV carries exactly the same data if your version needs another route. | TallyPrime اور Tally ERP 9 یہ معیاری امپورٹ فائل قبول کرتے ہیں (Gateway ← Import Data ← Vouchers)۔ Tally کے ورژنز میں معمولی فرق ہوتا ہے، اس لیے ایک بار امپورٹ کر کے جانچ لیں — اگر آپ کے ورژن کو کوئی اور راستہ درکار ہو تو جرنل CSV میں بالکل یہی ڈیٹا موجود ہے۔ | TallyPrime و Tally ERP 9 این فایل وارداتی استاندارد را می‌پذیرند (Gateway → Import Data → Vouchers). نسخه‌های Tally کمی تفاوت دارند، پس یک بار وارد کنید تا اعتبارسنجی شود — ژورنال CSV دقیقاً همان داده را دارد اگر نسخه شما به مسیر دیگری نیاز داشته باشد. |
| `fin.export.tallyTitle` | Tally & journal export | Tally اور جرنل برآمد | صادرات Tally و ژورنال |
| `fin.export.title` | Export data | ڈیٹا برآمد کریں | داده‌ها را صادر کنید |
| `fin.eyebrow` | Ledger | کھاتہ | دفتر حساب |
| `fin.fy.ackWarnings` | I have seen the open items above — close the year with them as they stand. | میں نے اوپر کے کھلے معاملات دیکھ لیے ہیں — سال اسی حالت میں بند کر دیں۔ | موارد باز بالا را دیده‌ام — سال را همان‌طور که هستند ببندید. |
| `fin.fy.caption` | Closing a year moves its income and expense balances into retained earnings in one journal entry and locks the year. Balance-sheet accounts carry forward on their own — the journal is continuous, so there are no opening entries to post. | سال بند کرنے سے اس کی آمدنی اور اخراجات کے بیلنس ایک ہی جرنل اندراج میں محفوظ منافع (retained earnings) میں منتقل ہو جاتے ہیں اور سال مقفل ہو جاتا ہے۔ بیلنس شیٹ کے کھاتے خود بخود آگے بڑھتے ہیں — جرنل مسلسل ہے، اس لیے کوئی ابتدائی اندراجات درج نہیں کیے جاتے۔ | بستن یک سال مانده‌های درآمد و مصرف آن را در یک مدخل ژورنال به مفاد نگهداشته‌شده منتقل می‌کند و سال را قفل می‌کند. حساب‌های ترازنامه خودشان به جلو می‌روند — ژورنال پیوسته است، پس مدخل‌های افتتاحیه‌ای برای ثبت نیست. |
| `fin.fy.check.cheques` | Uncleared cheques at year end | سال کے اختتام پر غیر کلیئر چیک | چک‌های تسویه‌نشده در پایان سال |
| `fin.fy.check.chequesDetail` | In hand {inHand} · issued {issued} — carries forward. | موصولہ {inHand} · جاری کردہ {issued} — آگے بڑھتے ہیں۔ | در دست {inHand} · صادرشده {issued} — به جلو می‌رود. |
| `fin.fy.check.clearing` | Purchases clearing account is zero at year end | سال کے اختتام پر خریداری کلیئرنگ کھاتہ صفر ہے | حساب تسویه خریدها در پایان سال صفر است |
| `fin.fy.check.clearingDetail` | Clearing balance {amount} — it nets to zero on every purchase; a balance here means a real defect the close must not bury. | کلیئرنگ بیلنس {amount} — یہ ہر خریداری پر صفر ہو جاتا ہے؛ یہاں بیلنس کا مطلب اصل خرابی ہے جسے اختتام تلے دبنا نہیں چاہیے۔ | مانده تسویه {amount} — در هر خرید به صفر می‌رسد؛ مانده اینجا یعنی یک نقص واقعی که بستن نباید آن را دفن کند. |
| `fin.fy.check.draftPayroll` | Draft payroll runs inside the year | سال کے اندر مسودہ تنخواہ رن | اجراهای پیش‌نویس معاش در داخل سال |
| `fin.fy.check.draftPayrollDetail` | {count} draft run(s) not yet finalised — they post nothing, but finalise or delete them before closing if the year should carry their salaries. | {count} مسودہ رن ابھی حتمی نہیں ہوئے — ان سے کوئی اندراج نہیں ہوتا، لیکن اگر اس سال میں ان کی تنخواہیں آنی چاہئیں تو بند کرنے سے پہلے انہیں حتمی کریں یا حذف کر دیں۔ | {count} اجرای پیش‌نویس هنوز نهایی نشده‌اند — چیزی ثبت نمی‌کنند، اما اگر سال باید معاش‌های آن‌ها را داشته باشد قبل از بستن نهایی یا حذف کنید. |
| `fin.fy.check.lock` | Period lock | مدت کا قفل | قفل دوره |
| `fin.fy.check.lockAlready` | The year is already locked through its last day. | سال پہلے ہی اس کے آخری دن تک مقفل ہے۔ | سال قبلاً تا آخرین روزش قفل است. |
| `fin.fy.check.lockWill` | This close will lock the year — no posting can be dated inside it afterwards. | یہ اختتام سال کو مقفل کر دے گا — اس کے بعد اس سال کی تاریخ کا کوئی اندراج درج نہیں ہو سکے گا۔ | این بستن سال را قفل می‌کند — بعد از آن هیچ ثبتی نمی‌تواند در داخل آن تاریخ بگیرد. |
| `fin.fy.check.production` | Open production orders holding work-in-progress | کھلے پیداواری آرڈر جن میں نیم تیار مال (WIP) موجود ہے | سفارش‌های تولید باز که کار در جریان دارند |
| `fin.fy.check.productionDetail` | {count} order(s), pool {amount} — work-in-progress carries forward legitimately; this is a warning, not a fault. | {count} آرڈر، مجموعہ {amount} — نیم تیار مال جائز طور پر آگے بڑھتا ہے؛ یہ انتباہ ہے، خرابی نہیں۔ | {count} سفارش، مجموع {amount} — کار در جریان به طور قانونی به جلو می‌رود؛ این یک هشدار است، نه خطا. |
| `fin.fy.check.salary` | Salary payable at year end | سال کے اختتام پر واجب الادا تنخواہ | معاش قابل پرداخت در پایان سال |
| `fin.fy.check.salaryDetail` | Owed to staff {owed} · advances outstanding {advances} · production accruals {unassigned} — carries forward. | عملے کے واجبات {owed} · بقایا ایڈوانس {advances} · پیداواری مزدوری {unassigned} — آگے بڑھتا ہے۔ | بدهکار به کارمندان {owed} · پیش‌پرداخت‌های باقیمانده {advances} · استحقاق‌های تولید {unassigned} — به جلو می‌رود. |
| `fin.fy.check.stock` | Stock: ledger vs shelf | اسٹاک: کھاتہ بمقابلہ شیلف | موجودی: دفتر در برابر قفسه |
| `fin.fy.check.stockDetail` | Ledger {gl} · shelf {shelf} · difference {diff} — a valuation difference, shown for the record; it does not block the close. | کھاتہ {gl} · شیلف {shelf} · فرق {diff} — یہ قدر کا فرق ہے، ریکارڈ کے لیے دکھایا گیا ہے؛ یہ اختتام نہیں روکتا۔ | دفتر {gl} · قفسه {shelf} · تفاوت {diff} — یک تفاوت ارزش‌گذاری، برای سابقه نمایش داده شده؛ بستن را متوقف نمی‌کند. |
| `fin.fy.check.tb` | Trial balance for the year balances | سال کا ٹرائل بیلنس متوازن ہے | تراز آزمایشی سال متوازن است |
| `fin.fy.check.tbDetail` | Difference {difference} · closing difference {closing} | فرق {difference} · اختتامی فرق {closing} | تفاوت {difference} · تفاوت بستن {closing} |
| `fin.fy.checklist` | Pre-close checklist | بند کرنے سے پہلے کی جانچ فہرست | چک‌لیست قبل از بستن |
| `fin.fy.close` | Close this fiscal year | یہ مالی سال بند کریں | این سال مالی را ببندید |
| `fin.fy.closeConfirmBody` | One closing entry will zero the year's income and expense accounts into retained earnings, and the year will lock. This is reversible only by a recorded reopening, which posts a mirror entry — the journal keeps both, forever. | ایک اختتامی اندراج سال کے آمدنی و اخراجات کے کھاتے صفر کر کے محفوظ منافع میں ڈال دے گا، اور سال مقفل ہو جائے گا۔ یہ عمل صرف درج شدہ دوبارہ کھولنے سے واپس ہو سکتا ہے، جو آئینہ اندراج درج کرتا ہے — جرنل دونوں کو ہمیشہ محفوظ رکھتا ہے۔ | یک مدخل بستن حساب‌های درآمد و مصرف سال را به مفاد نگهداشته‌شده صفر می‌کند، و سال قفل می‌شود. این فقط با یک بازگشایی ثبت‌شده قابل برگشت است، که یک مدخل آینه‌ای ثبت می‌کند — ژورنال هر دو را برای همیشه نگه می‌دارد. |
| `fin.fy.closeConfirmTitle` | Close {fy}? | {fy} بند کریں؟ | {fy} بسته شود؟ |
| `fin.fy.closedNotice` | {fy} is closed. Its result now sits in retained earnings; its reports still read exactly as before. | {fy} بند ہو گیا۔ اس کا نتیجہ اب محفوظ منافع میں ہے؛ اس کی رپورٹیں پہلے ہی کی طرح پڑھی جائیں گی۔ | {fy} بسته شده است. نتیجه آن حالا در مفاد نگهداشته‌شده قرار دارد؛ گزارش‌هایش هنوز دقیقاً مانند قبل خوانده می‌شوند. |
| `fin.fy.closedOn` | Closed on {date} by {email} | {date} کو {email} نے بند کیا | در {date} توسط {email} بسته شد |
| `fin.fy.errClosed` | This fiscal year is already closed. | یہ مالی سال پہلے ہی بند ہو چکا ہے۔ | این سال مالی قبلاً بسته شده است. |
| `fin.fy.errGate` | A hard check is failing — see the checklist above. | ایک سخت جانچ ناکام ہے — اوپر فہرست دیکھیں۔ | یک بررسی سخت ناموفق است — چک‌لیست بالا را ببینید. |
| `fin.fy.errInvalid` | That fiscal year could not be identified. | اس مالی سال کی شناخت نہیں ہو سکی۔ | آن سال مالی شناسایی نشد. |
| `fin.fy.errLocked` | The closing entry's date already falls inside a locked period, so the close is refused. Reopen that lock first if this year truly must close. | اختتامی اندراج کی تاریخ پہلے ہی مقفل مدت میں آتی ہے، اس لیے اختتام مسترد ہوا۔ اگر یہ سال واقعی بند کرنا ہے تو پہلے وہ قفل دوبارہ کھولیں۔ | تاریخ مدخل بستن قبلاً در یک دوره قفل‌شده قرار می‌گیرد، پس بستن رد می‌شود. اگر این سال واقعاً باید بسته شود اول آن قفل را دوباره باز کنید. |
| `fin.fy.errNotClosed` | This fiscal year is not closed. | یہ مالی سال بند نہیں ہے۔ | این سال مالی بسته نیست. |
| `fin.fy.errNotPast` | Only a fully past fiscal year can be closed. | صرف مکمل گزرا ہوا مالی سال بند ہو سکتا ہے۔ | فقط یک سال مالی کاملاً گذشته می‌تواند بسته شود. |
| `fin.fy.errReason` | A reason is required to reopen a closed year. | بند سال کھولنے کے لیے وجہ درج کرنا ضروری ہے۔ | برای بازگشایی یک سال بسته دلیل لازم است. |
| `fin.fy.errStack` | A later fiscal year is still closed. Reopen the later year first — closes unwind in reverse order. | بعد کا ایک مالی سال ابھی بند ہے۔ پہلے بعد والے سال کو کھولیں — اختتام الٹی ترتیب سے کھلتے ہیں۔ | یک سال مالی بعدی هنوز بسته است. اول سال بعدی را باز کنید — بستن‌ها به ترتیب معکوس باز می‌شوند. |
| `fin.fy.errWarnings` | Tick the acknowledgement for the open items first. | پہلے کھلے معاملات کی تصدیق پر نشان لگائیں۔ | اول تأییدیه موارد باز را علامت بزنید. |
| `fin.fy.gateBlocked` | A hard check above is failing — the year cannot close until it passes. | اوپر کی ایک سخت جانچ ناکام ہے — اس کے پاس ہونے تک سال بند نہیں ہو سکتا۔ | یک بررسی سخت بالا ناموفق است — سال تا عبور آن نمی‌تواند بسته شود. |
| `fin.fy.note` | Note (optional) | نوٹ (اختیاری) | یادداشت (اختیاری) |
| `fin.fy.notePlaceholder` | e.g. Closed after the annual stock count | مثلاً سالانہ اسٹاک گنتی کے بعد بند کیا | مثلاً بعد از شمارش سالانه موجودی بسته شد |
| `fin.fy.openingsCaption` | These are the balances the next year opens with, derived from the journal. No opening entries are posted — a continuous double-entry journal carries every balance-sheet account forward by itself. (Export files for Tally carry these figures as opening balances; the journal never stores them.) | یہ وہ بیلنس ہیں جن سے اگلا سال شروع ہوتا ہے، جرنل سے اخذ کردہ۔ کوئی ابتدائی اندراج درج نہیں کیا جاتا — مسلسل ڈبل انٹری جرنل ہر بیلنس شیٹ کھاتے کو خود آگے لے جاتا ہے۔ (Tally کی برآمدی فائلوں میں یہی رقوم ابتدائی بیلنس کے طور پر جاتی ہیں؛ جرنل انہیں کبھی ذخیرہ نہیں کرتا۔) | این‌ها مانده‌هایی هستند که سال بعدی با آن‌ها باز می‌شود، گرفته‌شده از ژورنال. هیچ مدخل افتتاحیه‌ای ثبت نمی‌شود — یک ژورنال دوطرفه پیوسته هر حساب ترازنامه را خودش به جلو می‌برد. (فایل‌های صادراتی برای Tally این ارقام را به صورت مانده‌های افتتاحیه می‌برند؛ ژورنال هرگز آن‌ها را ذخیره نمی‌کند.) |
| `fin.fy.openingsEmpty` | No balance-sheet balances carry into this year. | اس سال میں کوئی بیلنس شیٹ بیلنس آگے نہیں بڑھتا۔ | هیچ مانده ترازنامه‌ای به این سال منتقل نمی‌شود. |
| `fin.fy.openingsTitle` | Opening balances — {fy} | ابتدائی بیلنس — {fy} | مانده‌های افتتاحیه — {fy} |
| `fin.fy.openStock.action` | Record opening stock — {amount} | ابتدائی اسٹاک درج کریں — {amount} | ثبت موجودي آغازين — {amount} |
| `fin.fy.openStock.caption` | The shelf holds more stock than the books recognise ({amount}) — usually opening stock that was never entered when the shop started on the app. Record it once: Debit Stock, Credit Capital. | شیلف پر کھاتے سے زیادہ اسٹاک ہے ({amount}) — عموماً یہ وہ ابتدائی اسٹاک ہے جو دکان کے ایپ پر شروع ہوتے وقت درج ہی نہیں ہوا تھا۔ اسے ایک بار ریکارڈ کر لیں: ڈیبٹ اسٹاک، کریڈٹ سرمایہ۔ | در قفسه بيش از دفتر موجودي هست ({amount}) — معمولاً موجودي آغازيني است که هنگام شروع فروشگاه در برنامه هرگز ثبت نشده است. يک بار ثبتش کنيد: بدهي موجودي، اعتبار سرمايه. |
| `fin.fy.openStock.confirm` | This posts ONE journal entry dated today: Debit Stock {amount}, Credit Capital {amount}. The journal is append-only — this entry can never be edited or deleted; if the amount is wrong, a reversing entry corrects it. | اس سے آج کی تاریخ کا ایک ہی جرنل اندراج لگے گا: ڈیبٹ اسٹاک {amount}، کریڈٹ سرمایہ {amount}۔ جرنل صرف آگے بڑھتا ہے — یہ اندراج کبھی تبدیل یا حذف نہیں ہو سکتا؛ رقم غلط ہو تو الٹ اندراج سے درستگی ہوتی ہے۔ | اين کار يک قلم ژورنال با تاريخ امروز ثبت مي‌کند: بدهي موجودي {amount}، اعتبار سرمايه {amount}. ژورنال فقط افزوده مي‌شود — اين قلم هرگز ويرايش يا حذف نمي‌شود؛ اگر مبلغ اشتباه باشد، با يک قلم معکوس اصلاح مي‌شود. |
| `fin.fy.openStock.posted` | Opening stock recorded — the stock book now matches the shelf. | ابتدائی اسٹاک درج ہو گیا — اب اسٹاک کا کھاتہ شیلف سے مل گیا ہے۔ | موجودي آغازين ثبت شد — اکنون دفتر موجودي با قفسه برابر است. |
| `fin.fy.pick` | Fiscal year | مالی سال | سال مالی |
| `fin.fy.plNote` | Reports for a closed year still show its true revenue and expenses: profit & loss reports exclude the closing entry by design, while the trial balance includes it and shows the year zeroed. | بند سال کی رپورٹیں اس کی اصل آمدنی و اخراجات ہی دکھاتی ہیں: نفع و نقصان رپورٹیں اختتامی اندراج کو ڈیزائن کے مطابق شامل نہیں کرتیں، جبکہ ٹرائل بیلنس اسے شامل کر کے سال کو صفر دکھاتا ہے۔ | گزارش‌های یک سال بسته هنوز درآمد و مصارف واقعی آن را نشان می‌دهند: گزارش‌های مفاد و زیان مدخل بستن را طبق طراحی حذف می‌کنند، در حالی که تراز آزمایشی آن را شامل می‌کند و سال را صفر نشان می‌دهد. |
| `fin.fy.reopen` | Reopen {fy} | {fy} دوبارہ کھولیں | {fy} را دوباره باز کنید |
| `fin.fy.reopenConfirmBody` | A mirror entry will reverse the closing entry to the paisa, the year's accounts will carry their balances again, and the period lock returns to where it stood before the close. The close and this reopening both stay in the journal and the audit trail. | ایک آئینہ اندراج اختتامی اندراج کو پیسے تک واپس کر دے گا، سال کے کھاتے اپنے بیلنس دوبارہ حاصل کر لیں گے، اور مدت کا قفل اختتام سے پہلے والی حالت پر لوٹ جائے گا۔ اختتام اور یہ دوبارہ کھولنا — دونوں جرنل اور آڈٹ ریکارڈ میں رہیں گے۔ | یک مدخل آینه‌ای مدخل بستن را تا پیسه برمی‌گرداند، حساب‌های سال دوباره مانده‌های خود را خواهند داشت، و قفل دوره به جایی که قبل از بستن بود برمی‌گردد. بستن و این بازگشایی هر دو در ژورنال و ردپای ممیزی باقی می‌مانند. |
| `fin.fy.reopenConfirmTitle` | Reopen {fy}? | {fy} دوبارہ کھولیں؟ | {fy} دوباره باز شود؟ |
| `fin.fy.reopenedNotice` | {fy} is open again. Remember to close it again when the correction is done. | {fy} دوبارہ کھل گیا۔ درستگی مکمل ہونے پر اسے دوبارہ بند کرنا یاد رکھیں۔ | {fy} دوباره باز است. وقتی اصلاح تمام شد به یاد داشته باشید دوباره آن را ببندید. |
| `fin.fy.reopenReason` | Reason for reopening (recorded) | دوبارہ کھولنے کی وجہ (درج ہوگی) | دلیل بازگشایی (ثبت می‌شود) |
| `fin.fy.reopenReasonPlaceholder` | e.g. A supplier bill for June was missed | مثلاً جون کا ایک سپلائر بل رہ گیا تھا | مثلاً یک بل تأمین‌کننده برای جون از دست رفته بود |
| `fin.fy.reopenTitle` | Reopen this fiscal year | یہ مالی سال دوبارہ کھولیں | این سال مالی را دوباره باز کنید |
| `fin.fy.statusClosed` | Closed | بند ہو چکا | بسته شده |
| `fin.fy.statusOpen` | Open — not closed yet | کھلا — ابھی بند نہیں ہوا | باز — هنوز بسته نشده |
| `fin.fy.summaryNetLoss` | Net loss charged to retained earnings | محفوظ منافع پر ڈالا گیا خالص نقصان | زیان خالص کسرشده از مفاد نگهداشته‌شده |
| `fin.fy.summaryNetProfit` | Net profit carried to retained earnings | محفوظ منافع میں منتقل شدہ خالص منافع | مفاد خالص منتقل‌شده به مفاد نگهداشته‌شده |
| `fin.fy.summaryTitle` | The year's result — from the closing entry | سال کا نتیجہ — اختتامی اندراج سے | نتیجه سال — از مدخل بستن |
| `fin.fy.title` | Fiscal year close | مالی سال کا اختتام | بستن سال مالی |
| `fin.journal.balanced` | Balanced | متوازن | متوازن |
| `fin.journal.caption` | Every posting, newest first — expand an entry to see its debit and credit lines. Each entry must balance. | ہر اندراج، نیا سب سے پہلے — کسی اندراج کو کھول کر اس کی ڈیبٹ اور کریڈٹ سطریں دیکھیں۔ ہر اندراج کا متوازن ہونا ضروری ہے۔ | هر ثبت، جدیدترین اول — یک مدخل را باز کنید تا سطرهای بدهکار و بستانکار آن را ببینید. هر مدخل باید متوازن شود. |
| `fin.journal.count` | {count} entries | {count} اندراجات | {count} مدخل |
| `fin.journal.empty` | No journal entries yet. | ابھی کوئی جرنل اندراج نہیں۔ | هنوز هیچ مدخل ژورنالی نیست. |
| `fin.journal.showingLatest` | Showing the latest {count} entries | تازہ ترین {count} اندراجات دکھائے جا رہے ہیں | آخرین {count} مدخل نمایش داده می‌شود |
| `fin.journal.title` | Journal | جرنل | ژورنال |
| `fin.journal.unbalanced` | Does not balance | غیر متوازن | متوازن نمی‌شود |
| `fin.kpi.cash` | Cash in hand | نقدی موجود | نقد در دست |
| `fin.kpi.cashSub` | till / drawer balance | گلّے / دراز کا بیلنس | مانده صندوق / کشو |
| `fin.kpi.payables` | Payables | ادائیگیاں | پرداختنی‌ها |
| `fin.kpi.payablesSub` | supplier dues | سپلائر کے بقایا جات | بدهی‌های تأمین‌کننده |
| `fin.kpi.receivables` | Receivables | وصولیاں | دریافتنی‌ها |
| `fin.kpi.receivablesSub` | udhaar outstanding | بقایا ادھار | قرض باقیمانده |
| `fin.kpi.wallet` | Wallet & bank | والیٹ اور بینک | کیف پول و بانک |
| `fin.kpi.walletSub` | JazzCash · Easypaisa · bank | JazzCash · Easypaisa · بینک | JazzCash · Easypaisa · بانک |
| `fin.loan.borrowed` | Borrowed — outstanding (register) | لیے گئے قرضے — بقایا (رجسٹر) | گرفته‌شده — باقیمانده (ثبت) |
| `fin.loan.caption` | The loans register's derived position beside the ledger's own balances — the two always agree for loans that have been drawn. | قرض رجسٹر کی اخذ شدہ صورتحال کھاتے کے اپنے بیلنس کے ساتھ — جو قرضے جاری ہو چکے ہیں ان میں دونوں ہمیشہ برابر رہتے ہیں۔ | وضعیت گرفته‌شده ثبت قرض‌ها در کنار مانده‌های خود دفتر — این دو همیشه برای قرض‌هایی که برداشت شده‌اند موافق هستند. |
| `fin.loan.lent` | Lent — outstanding (register) | دیے گئے قرضے — بقایا (رجسٹر) | داده‌شده — باقیمانده (ثبت) |
| `fin.loan.open` | Open the register | رجسٹر کھولیں | ثبت را باز کنید |
| `fin.loan.payableGl` | Loans payable (ledger) | واجب الادا قرضے (کھاتہ) | قرض‌های قابل پرداخت (دفتر) |
| `fin.loan.receivableGl` | Loans receivable (ledger) | قابل وصول قرضے (کھاتہ) | قرض‌های دریافتنی (دفتر) |
| `fin.loan.title` | Loans | قرضے | قرض‌ها |
| `fin.neg.body` | Paying {amount} from {account} will take its balance to {balance}. If this is an informal overdraft you know about, post it anyway. | {account} سے {amount} کی ادائیگی سے اس کا بیلنس {balance} ہو جائے گا۔ اگر یہ آپ کے علم میں غیر رسمی اوور ڈرافٹ ہے تو پھر بھی درج کر دیں۔ | پرداخت {amount} از {account} مانده آن را به {balance} می‌رساند. اگر این یک اضافه‌برداشت غیررسمی است که از آن خبر دارید، در هر صورت ثبت کنید. |
| `fin.neg.confirm` | Post anyway | پھر بھی درج کریں | در هر صورت ثبت کنید |
| `fin.neg.title` | This account will go negative | یہ کھاتہ منفی ہو جائے گا | این حساب منفی خواهد شد |
| `fin.period.lockedError` | That date falls in a closed period (the books are locked through {date}). Nothing can be posted into a closed period — corrections are recorded at today's date instead. | یہ تاریخ بند مدت میں آتی ہے (کھاتے {date} تک مقفل ہیں)۔ بند مدت میں کوئی اندراج نہیں ہو سکتا — تصحیح اس کے بجائے آج کی تاریخ سے درج ہوتی ہے۔ | آن تاریخ در یک دوره بسته قرار می‌گیرد (کتاب‌ها تا {date} قفل هستند). هیچ چیزی نمی‌تواند در یک دوره بسته ثبت شود — اصلاحات در عوض با تاریخ امروز ثبت می‌شوند. |
| `fin.pl.caption` | Computed from this month's journal entries only. | صرف اس مہینے کے جرنل اندراجوں سے شمار کیا گیا۔ | فقط از مدخل‌های ژورنال این ماه محاسبه شده است. |
| `fin.pl.captionRange` | Computed from journal entries in the selected period only. | صرف منتخب مدت کے جرنل اندراجوں سے شمار کیا گیا۔ | فقط از مدخل‌های ژورنال در دوره انتخاب‌شده محاسبه شده است. |
| `fin.pl.cogs` | Less COGS (cost of goods sold) | فروخت شدہ سامان کی لاگت | کم COGS (قیمت تمام‌شده کالاهای فروخته‌شده) |
| `fin.pl.discounts` | Less discounts | رعایت | کم تخفیف‌ها |
| `fin.pl.expenseRow` | Less expense — {category} | خرچ — {category} | کم مصرف — {category} |
| `fin.pl.grossProfit` | = Gross profit | = مجموعی منافع | = مفاد ناخالص |
| `fin.pl.lastFiscalYear` | Last fiscal year | پچھلا مالی سال | سال مالی گذشته |
| `fin.pl.netProfit` | = NET PROFIT | = خالص منافع | = مفاد خالص |
| `fin.pl.netRevenue` | Net revenue | خالص فروخت | درآمد خالص |
| `fin.pl.range` | Period | مدت | دوره |
| `fin.pl.revenue` | Gross revenue | کل فروخت | درآمد ناخالص |
| `fin.pl.stockLoss` | Stock loss (inventory write-offs) | اسٹاک نقصان (خراب / ختم شدہ سامان) | زیان موجودی (حذف موجودی) |
| `fin.pl.thisFiscalYear` | This fiscal year | یہ مالی سال | این سال مالی |
| `fin.pl.thisMonth` | This month | یہ مہینہ | این ماه |
| `fin.pl.title` | Profit & loss — {month} | نفع و نقصان — {month} | مفاد و زیان — {month} |
| `fin.ref.adjustment` | Stock adjustment | اسٹاک درستگی | تنظیم موجودی |
| `fin.ref.bill` | Bill #{no} | بل نمبر {no} | بل #{no} |
| `fin.ref.chequeBounce` | Cheque bounced | چیک باؤنس | چک برگشت خورد |
| `fin.ref.chequeClearing` | Cheque cleared | چیک کلیئر | چک تسویه شد |
| `fin.ref.chequeReturn` | Cheque returned | چیک واپس | چک برگشت داده شد |
| `fin.ref.credit` | Udhaar given | ادھار دیا | قرض داده شده |
| `fin.ref.expense` | Expense | خرچ | مصرف |
| `fin.ref.expenseReversal` | Expense reversal | خرچ کی واپسی | برگشت مصرف |
| `fin.ref.loanCharge` | Loan charge | قرض چارج | هزینه قرض |
| `fin.ref.loanDrawdown` | Loan drawdown | قرض اجرا | برداشت قرض |
| `fin.ref.loanRepayment` | Loan repayment | قرض کی واپسی | بازپرداخت قرض |
| `fin.ref.ownerCapital` | owner capital | مالک کا سرمایہ | سرمایه مالک |
| `fin.ref.ownerDrawings` | owner drawings | مالک کی ذاتی نکاسی | برداشت‌های مالک |
| `fin.ref.payment` | Supplier payment | سپلائر کو ادائیگی | پرداخت به تأمین‌کننده |
| `fin.ref.payrollAccrual` | Payroll accrual | تنخواہ استحقاق | استحقاق معاش |
| `fin.ref.payrollPayment` | Salary payment | تنخواہ کی ادائیگی | پرداخت معاش |
| `fin.ref.purchase` | Purchase — stock received | خریداری — سامان وصول | خرید — موجودی دریافت شد |
| `fin.ref.purchaseReturn` | Purchase return | خرید واپسی | بازگشت خرید |
| `fin.ref.repayment` | Udhaar repayment | ادھار کی واپسی | بازپرداخت قرض |
| `fin.ref.return` | Return | واپسی | بازگشت |
| `fin.ref.salaryAdvance` | Salary advance | تنخواہ پیشگی | پیش‌پرداخت معاش |
| `fin.ref.sale` | Counter sale | کاؤنٹر فروخت | فروش پیشخوان |
| `fin.ref.taxPayment` | Tax payment | ٹیکس ادائیگی | پرداخت مالیات |
| `fin.ref.transfer` | Transfer | منتقلی | انتقال |
| `fin.ref.void` | Bill voided | بل منسوخ | بل باطل شد |
| `fin.sal.advances` | Advances outstanding | بقایا پیشگیاں | پیش‌پرداخت‌های باقیمانده |
| `fin.sal.caption` | The composition of the salaries-payable account, derived from the journal: what the shop owes its staff, the advances staff owe back, and production labour accrued without a named person. | واجب الادا تنخواہوں کے کھاتے کی ترکیب، جرنل سے اخذ شدہ: دکان کے ذمے عملے کی واجب رقم، عملے کے ذمے بقایا پیشگیاں، اور بے نام جمع شدہ پیداواری مزدوری۔ | ترکیب حساب معاش‌های قابل پرداخت، گرفته‌شده از ژورنال: آنچه دکان به کارمندانش بدهکار است، پیش‌پرداخت‌هایی که کارمندان باید برگردانند، و کار تولیدی مستحق‌شده بدون نام شخص. |
| `fin.sal.owed` | Owed to employees | ملازمین کے واجب | بدهکار به کارمندان |
| `fin.sal.title` | Salaries payable | واجب الادا تنخواہیں | معاش‌های قابل پرداخت |
| `fin.sal.total` | Account balance | کھاتے کا بیلنس | مانده حساب |
| `fin.sal.unassigned` | Production labour (unassigned) | پیداواری مزدوری (بے نام) | کار تولیدی (بدون نام) |
| `fin.subtitle` | Every number below is derived live from the double-entry journal — balances, profit & loss and the cash book can never drift apart. | نیچے دیا گیا ہر عدد ڈبل انٹری جرنل سے براہِ راست نکلتا ہے — بیلنس، نفع و نقصان اور کیش بک کبھی ایک دوسرے سے الگ نہیں ہو سکتے۔ | هر عدد زیر زنده از ژورنال دوطرفه گرفته می‌شود — مانده‌ها، مفاد و زیان و کتاب نقد هرگز از هم جدا نمی‌شوند. |
| `fin.tax.amount` | Amount (PKR) * | رقم (PKR) * | مبلغ (PKR) * |
| `fin.tax.balance` | Balance | بیلنس | مانده |
| `fin.tax.caption` | Derived from the journal's tax accounts. Tax is a pass-through between your customers, suppliers and the government — it never enters profit & loss. | یہ اعداد جرنل کے ٹیکس کھاتوں سے نکلتے ہیں۔ ٹیکس آپ کے گاہکوں، سپلائرز اور حکومت کے درمیان ایک امانت ہے — یہ نفع و نقصان میں کبھی شامل نہیں ہوتا۔ | از حساب‌های مالیات ژورنال گرفته شده است. مالیات یک گذر بین مشتریان، تأمین‌کنندگان و حکومت شما است — هرگز وارد مفاد و زیان نمی‌شود. |
| `fin.tax.errAmount` | Amount must be greater than 0. | رقم 0 سے زیادہ ہونی چاہیے۔ | مبلغ باید بزرگ‌تر از 0 باشد. |
| `fin.tax.errExceeds` | Amount is more than the net tax payable ({due}). | رقم خالص واجب الادا ٹیکس ({due}) سے زیادہ ہے۔ | مبلغ بیشتر از مالیات خالص قابل پرداخت ({due}) است. |
| `fin.tax.input` | Input tax (paid on purchases) | ان پٹ ٹیکس (خریداری پر ادا) | مالیات ورودی (روی خرید پرداخت‌شده) |
| `fin.tax.netDue` | Net tax payable | خالص واجب الادا ٹیکس | مالیات خالص قابل پرداخت |
| `fin.tax.none` | No tax activity yet. Once tax slabs are configured and a taxed sale or purchase is posted, the position appears here. | ابھی کوئی ٹیکس سرگرمی نہیں۔ جب ٹیکس سلیبز ترتیب دی جائیں گی اور ٹیکس والی فروخت یا خریداری درج ہوگی تو صورتحال یہاں نظر آئے گی۔ | هنوز هیچ فعالیت مالیاتی نیست. وقتی طبقات مالیات پیکربندی شوند و یک فروش یا خرید مالیاتی ثبت شود، وضعیت اینجا ظاهر می‌شود. |
| `fin.tax.note` | Note | نوٹ | یادداشت |
| `fin.tax.notePlaceholder` | e.g. Monthly return — October | مثلاً ماہانہ ریٹرن — اکتوبر | مثلاً اظهارنامه ماهانه — اکتبر |
| `fin.tax.output` | Output tax (collected on sales) | آؤٹ پٹ ٹیکس (فروخت پر وصول) | مالیات خروجی (روی فروش جمع‌شده) |
| `fin.tax.paid` | Tax payment of {amount} recorded. | {amount} کی ٹیکس ادائیگی درج ہو گئی۔ | پرداخت مالیات {amount} ثبت شد. |
| `fin.tax.pay` | Record tax payment | ٹیکس ادائیگی درج کریں | پرداخت مالیات را ثبت کنید |
| `fin.tax.payCaption` | Records a payment against the net tax payable: it reduces Tax payable and leaves from the chosen account. | خالص واجب الادا ٹیکس کے خلاف ادائیگی درج کرتا ہے: ادا طلب ٹیکس کم ہوتا ہے اور رقم منتخب کھاتے سے نکلتی ہے۔ | پرداختی را در برابر مالیات خالص قابل پرداخت ثبت می‌کند: مالیات قابل پرداخت را کم می‌کند و از حساب انتخاب‌شده خارج می‌شود. |
| `fin.tax.payTitle` | Pay tax to government | حکومت کو ٹیکس ادا کریں | مالیات را به حکومت پرداخت کنید |
| `fin.tax.thisMonth` | This month | اس مہینے | این ماه |
| `fin.tax.title` | Tax position | ٹیکس کی صورتحال | وضعیت مالیات |
| `fin.title` | Finance | مالیات | امور مالی |
| `loan.accrue` | Accrue charge | چارج جمع کریں | هزینه را مستحق کنید |
| `loan.accrue.confirm` | Accrue the charge for instalment {n} ({amount})? It posts to the ledger now, as its own entry. | قسط {n} کا چارج ({amount}) جمع کریں؟ یہ ابھی کھاتے میں اپنے الگ اندراج کے طور پر درج ہوگا۔ | هزینه قسط {n} ({amount}) مستحق شود؟ حالا در دفتر ثبت می‌شود، به صورت مدخل خودش. |
| `loan.accrue.done` | Charge of {amount} accrued for instalment {n}. | قسط {n} کا {amount} چارج جمع ہو گیا۔ | هزینه {amount} برای قسط {n} مستحق شد. |
| `loan.accrued.badge` | Accrued | جمع شدہ | مستحق شده |
| `loan.back` | All loans | تمام قرضے | همه قرض‌ها |
| `loan.charge.feeOnly` | One-off fee — {amount} | یک وقتی فیس — {amount} | فقط فیس یک‌باره — {amount} |
| `loan.charge.flat` | Flat — {rate}% of principal | فلیٹ — اصل رقم کا {rate}٪ | ثابت — {rate}% از اصل |
| `loan.charge.none` | No charge | کوئی چارج نہیں | بدون هزینه |
| `loan.charge.reducing` | Reducing — {rate}% per period | کم ہوتا ہوا — {rate}٪ فی مدت | کاهشی — {rate}% در هر دوره |
| `loan.col.nextDue` | Next due | اگلی قسط | سررسید بعدی |
| `loan.col.number` | Number | نمبر | شماره |
| `loan.col.outstanding` | Outstanding | بقایا | باقیمانده |
| `loan.col.party` | Party | فریق | طرف |
| `loan.col.principal` | Principal | اصل رقم | اصل |
| `loan.created` | Loan {number} created and drawn down. | قرض {number} بن گیا اور جاری ہو گیا۔ | قرض {number} ساخته و برداشت شد. |
| `loan.delete` | Delete loan | قرض حذف کریں | قرض را حذف کنید |
| `loan.delete.confirm` | Delete this unused loan? It has no events and posted nothing. | یہ غیر استعمال شدہ قرض حذف کریں؟ اس کا کوئی واقعہ نہیں اور اس نے کچھ درج نہیں کیا۔ | این قرض استفاده‌نشده حذف شود؟ هیچ رویدادی ندارد و چیزی ثبت نکرده است. |
| `loan.detail.charge` | Charge | چارج | هزینه |
| `loan.detail.chargesAccrued` | Charges accrued | جمع شدہ چارجز | هزینه‌های مستحق‌شده |
| `loan.detail.every.month` | Monthly | ماہانہ | ماهانه |
| `loan.detail.every.week` | Weekly | ہفتہ وار | هفتگی |
| `loan.detail.firstDue` | First due | پہلی قسط کی تاریخ | اولین سررسید |
| `loan.detail.instalments` | Instalments | اقساط | اقساط |
| `loan.detail.repaid` | Repaid so far | اب تک واپس شدہ | تا حالا بازپرداخت شده |
| `loan.detail.start` | Drawdown date | اجرا کی تاریخ | تاریخ برداشت |
| `loan.dir.payable` | Borrowed | لیا گیا | گرفته‌شده |
| `loan.dir.receivable` | Lent | دیا گیا | داده‌شده |
| `loan.empty` | No loans yet. Create the first loan to start the register. | ابھی کوئی قرض نہیں۔ رجسٹر شروع کرنے کے لیے پہلا قرض بنائیں۔ | هنوز هیچ قرضی نیست. اولین قرض را بسازید تا ثبت شروع شود. |
| `loan.emptyFiltered` | No loans match this view. | اس منظر سے کوئی قرض نہیں ملتا۔ | هیچ قرضی با این نما مطابقت ندارد. |
| `loan.ev.account` | Account | کھاتہ | حساب |
| `loan.ev.amount` | Amount | رقم | مبلغ |
| `loan.ev.charge` | Charge accrual | چارج جمع | استحقاق هزینه |
| `loan.ev.date` | Date | تاریخ | تاریخ |
| `loan.ev.drawdown` | Drawdown | اجرا | برداشت |
| `loan.ev.fee` | Fee | فیس | فیس |
| `loan.ev.repayment` | Repayment | واپسی | بازپرداخت |
| `loan.ev.reversal` | Reversal | الٹ اندراج | برگشت |
| `loan.ev.split` | Principal / charge | اصل / چارج | اصل / هزینه |
| `loan.events.empty` | No events yet. | ابھی کوئی واقعہ نہیں۔ | هنوز هیچ رویدادی نیست. |
| `loan.events.title` | Loan diary | قرض کی ڈائری | دفتر خاطرات قرض |
| `loan.filter.all` | All | تمام | همه |
| `loan.filter.payable` | Borrowed | لیے گئے | گرفته‌شده |
| `loan.filter.receivable` | Lent | دیے گئے | داده‌شده |
| `loan.form.account` | Account | کھاتہ | حساب |
| `loan.form.chargeRate` | Charge rate (%) | چارج کی شرح (٪) | نرخ هزینه (%) |
| `loan.form.chargeType` | Charge | چارج | هزینه |
| `loan.form.chargeType.feeOnly` | One-off fee only | صرف یک وقتی فیس | فقط فیس یک‌باره |
| `loan.form.chargeType.flat` | Flat (% of principal, whole term) | فلیٹ (اصل رقم کا ٪، پوری مدت) | ثابت (% از اصل، کل دوره) |
| `loan.form.chargeType.none` | No charge | کوئی چارج نہیں | بدون هزینه |
| `loan.form.chargeType.reducing` | Reducing (% per period on outstanding) | کم ہوتا ہوا (بقایا پر ٪ فی مدت) | کاهشی (% در هر دوره روی باقیمانده) |
| `loan.form.count` | Instalments | اقساط | اقساط |
| `loan.form.create` | Create & draw down | بنائیں اور جاری کریں | بسازید و برداشت کنید |
| `loan.form.direction` | Direction | سمت | جهت |
| `loan.form.errTerms` | Check the loan terms: a party, a principal above 0, at least one instalment, and a fee below the principal. | قرض کی شرائط دیکھیں: فریق، 0 سے بڑی اصل رقم، کم از کم ایک قسط، اور اصل رقم سے کم فیس۔ | شرایط قرض را بررسی کنید: یک طرف، اصلی بالاتر از 0، حداقل یک قسط، و فیسی کمتر از اصل. |
| `loan.form.every` | Every | ہر | هر |
| `loan.form.fee` | Upfront fee (PKR) | ابتدائی فیس (PKR) | فیس پیش‌پرداخت (PKR) |
| `loan.form.feeHint` | Netted from the proceeds at drawdown and recorded as a finance expense. Leave 0 for none. | اجرا کے وقت حاصل شدہ رقم سے کاٹی جاتی ہے اور مالی خرچ کے طور پر درج ہوتی ہے۔ نہ ہو تو 0 رکھیں۔ | هنگام برداشت از عواید کسر می‌شود و به صورت مصرف مالی ثبت می‌شود. برای هیچ، 0 بگذارید. |
| `loan.form.feeOnlyLabel` | Fee amount (PKR) * | فیس کی رقم (PKR) * | مبلغ فیس (PKR) * |
| `loan.form.firstDue` | First due date | پہلی قسط کی تاریخ | تاریخ اولین سررسید |
| `loan.form.method` | Money method | رقم کا طریقہ | روش پول |
| `loan.form.note` | Note | نوٹ | یادداشت |
| `loan.form.party` | Party name * | فریق کا نام * | نام طرف * |
| `loan.form.partyLink` | Linked record (optional) | منسلک ریکارڈ (اختیاری) | سابقه مرتبط (اختیاری) |
| `loan.form.partyNone` | No link | کوئی ربط نہیں | بدون پیوند |
| `loan.form.principal` | Principal (PKR) * | اصل رقم (PKR) * | اصل (PKR) * |
| `loan.form.receivableHint` | Loans the shop lends are recorded without any charge. | دکان جو قرض دیتی ہے وہ بغیر کسی چارج کے درج ہوتا ہے۔ | قرض‌هایی که دکان می‌دهد بدون هیچ هزینه‌ای ثبت می‌شوند. |
| `loan.form.start` | Drawdown date | اجرا کی تاریخ | تاریخ برداشت |
| `loan.form.title` | New loan | نیا قرض | قرض جدید |
| `loan.kpi.borrowed` | Borrowed outstanding | لیے گئے قرضوں کا بقایا | باقیمانده گرفته‌شده |
| `loan.kpi.chargesFy` | Charges this fiscal year | اس مالی سال کے چارجز | هزینه‌ها در این سال مالی |
| `loan.kpi.count` | Active loans | فعال قرضے | قرض‌های فعال |
| `loan.kpi.lent` | Lent outstanding | دیے گئے قرضوں کا بقایا | باقیمانده داده‌شده |
| `loan.new` | New loan | نیا قرض | قرض جدید |
| `loan.notAccrued.badge` | Not accrued | جمع نہیں ہوا | مستحق نشده |
| `loan.overdueCount` | {count} overdue | {count} مؤخر | {count} معوق |
| `loan.repay` | Record repayment | واپسی درج کریں | بازپرداخت را ثبت کنید |
| `loan.repay.account` | Account | کھاتہ | حساب |
| `loan.repay.amount` | Amount (PKR) * | رقم (PKR) * | مبلغ (PKR) * |
| `loan.repay.chargePart` | Charge part | چارج حصہ | بخش هزینه |
| `loan.repay.done` | Repayment of {amount} recorded for {number}. | {number} کی {amount} واپسی درج ہو گئی۔ | بازپرداخت {amount} برای {number} ثبت شد. |
| `loan.repay.errAmount` | Enter an amount within the outstanding balance, with a split that adds up to it. | بقایا کے اندر رقم درج کریں، اور تقسیم اسی رقم کے برابر رکھیں۔ | مبلغی در داخل مانده باقیمانده بنویسید، با تقسیمی که به آن جمع شود. |
| `loan.repay.method` | Method | طریقہ | روش |
| `loan.repay.principalPart` | Principal part | اصل حصہ | بخش اصل |
| `loan.repay.remaining` | Outstanding: {amount} | بقایا: {amount} | باقیمانده: {amount} |
| `loan.repay.splitHint` | The split is attribution: by default charges are settled first. The ledger records the full amount either way. | یہ تقسیم محض نسبت ہے: عموماً چارج پہلے طے ہوتا ہے۔ کھاتے میں پوری رقم ہی درج ہوتی ہے۔ | تقسیم انتساب است: به طور پیش‌فرض هزینه‌ها اول تسویه می‌شوند. دفتر در هر صورت مبلغ کامل را ثبت می‌کند. |
| `loan.repay.title` | Repayment — {number} | واپسی — {number} | بازپرداخت — {number} |
| `loan.reverse` | Reverse | الٹیں | برگردانید |
| `loan.reverse.confirm` | Reverse this event? A mirror entry will be posted — the original stays in the journal. | یہ واقعہ الٹیں؟ ایک آئینہ اندراج درج ہوگا — اصل اندراج جرنل میں برقرار رہے گا۔ | این رویداد برگردانده شود؟ یک مدخل آینه‌ای ثبت می‌شود — اصل در ژورنال باقی می‌ماند. |
| `loan.schedule.charge` | Charge | چارج | هزینه |
| `loan.schedule.due` | Due date | تاریخ استحقاق | تاریخ سررسید |
| `loan.schedule.n` | # | # | # |
| `loan.schedule.paid` | Paid | ادا شدہ | پرداخت شده |
| `loan.schedule.principal` | Principal | اصل | اصل |
| `loan.schedule.state` | State | حالت | حالت |
| `loan.schedule.title` | Instalment schedule | اقساط کا شیڈول | جدول اقساط |
| `loan.schedule.total` | Total | کل | مجموع |
| `loan.searchPlaceholder` | Search number, party or note… | نمبر، فریق یا نوٹ تلاش کریں… | شماره، طرف یا یادداشت را جستجو کنید… |
| `loan.settled.notice` | This loan is fully settled. | یہ قرض مکمل طور پر طے ہو چکا ہے۔ | این قرض کاملاً تسویه شده است. |
| `loan.state.due` | Due | واجب | سررسید |
| `loan.state.overdue` | Overdue | مؤخر | معوق |
| `loan.state.paid` | Paid | ادا شدہ | پرداخت شده |
| `loan.state.partial` | Partial | جزوی | جزئی |
| `loan.state.upcoming` | Upcoming | آنے والی | آینده |
| `loan.status.active` | Active | فعال | فعال |
| `loan.status.cancelled` | Cancelled | منسوخ | لغو شده |
| `loan.status.settled` | Settled | مکمل ادا | تسویه شده |
| `loan.subtitle` | Money the shop has borrowed and money it has lent. Outstanding figures derive from the journal and each loan's diary — nothing is stored as a balance. | وہ رقم جو دکان نے ادھار لی اور جو دکان نے ادھار دی۔ بقایا اعداد جرنل اور ہر قرض کی ڈائری سے اخذ ہوتے ہیں — کوئی بیلنس محفوظ نہیں کیا جاتا۔ | پولی که دکان قرض گرفته و پولی که قرض داده است. ارقام باقیمانده از ژورنال و دفتر خاطرات هر قرض گرفته می‌شود — هیچ چیزی به صورت مانده ذخیره نمی‌شود. |
| `loan.title` | Loans | قرضے | قرض‌ها |
| `nav.loans` | Loans | قرضے | قرض‌ها |
## reports

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `nav.reports` | Reports | رپورٹس | گزارش‌ها |
| `rep.aging.desc` | Who owes the shop and whom the shop owes, aged 0–30, 31–60 and over 60 days — identical to Finance. | کس نے دکان کو دینا ہے اور دکان نے کس کو، عمر کے حساب سے 0–30، 31–60 اور 60 دن سے زائد — مالیات جیسا ہی۔ | چه كسي به دكان بدهكار است و دكان به چه كسي، با قدمت 0–30، 31–60 و بيش از 60 روز — همانند امور مالي۔ |
| `rep.aging.title` | Aging — Receivables & Payables | واجبات کی عمر — لینا اور دینا | قدمت — دريافتني‌ها و پرداختني‌ها |
| `rep.allAccounts` | All accounts (cash book) | تمام اکاؤنٹس (کیش بک) | همه حساب‌ها (كتاب نقد) |
| `rep.bs.asAt` | As at {date} | {date} تک کی صورتحال | تا تاريخ {date} |
| `rep.bs.assets` | Assets | اثاثے | دارايي‌ها |
| `rep.bs.desc` | What the shop owns and owes as at the end of the period, from the journal: assets on one side, liabilities, capital and the unclosed result on the other — the two sides must be equal. | مدت کے اختتام پر دکان کے اثاثے اور واجبات، جرنل سے: ایک طرف اثاثے، دوسری طرف واجبات، سرمایہ اور غیر بند نتیجہ — دونوں طرفیں برابر ہونی چاہئیں۔ | دارايي‌ها و بدهي‌هاي فروشگاه در پايان دوره، از ژورنال: يک سو دارايي‌ها، سوي ديگر بدهي‌ها، سرمايه و نتيجه بسته‌نشده — دو سو بايد برابر باشند۔ |
| `rep.bs.equity` | Capital & Equity | سرمایہ و حقوق | سرمايه و حقوق |
| `rep.bs.liabilities` | Liabilities | واجبات | بدهي‌ها |
| `rep.bs.result` | Result to date (unclosed) | اب تک کا نتیجہ (غیر بند) | نتيجه تا کنون (بسته‌نشده) |
| `rep.bs.title` | Balance Sheet | بیلنس شیٹ | ترازنامه |
| `rep.bs.totalAssets` | Total Assets | کل اثاثے | مجموع دارايي‌ها |
| `rep.bs.totalLiabEquity` | Total Liabilities & Equity | کل واجبات و حقوق | مجموع بدهي‌ها و حقوق |
| `rep.cashbook.desc` | Money in and out for one account (or the whole cash book), with opening and closing balances. | ایک اکاؤنٹ (یا پوری کیش بک) کی آمد و خرچ، ابتدائی اور اختتامی بیلنس کے ساتھ۔ | پول ورودي و خروجي براي يك حساب (يا كل كتاب نقد)، با مانده آغازين و پاياني۔ |
| `rep.cashbook.title` | Cash Book & Account Statement | کیش بک اور اکاؤنٹ اسٹیٹمنٹ | كتاب نقد و صورت حساب |
| `rep.catalogue` | Choose a report | رپورٹ منتخب کریں | يك گزارش انتخاب كنيد |
| `rep.cheques.desc` | Cheques captured in the period, grouped by where they stand: drawer, bank, issued, cleared, bounced. | مدت میں لیے/دیے گئے چیک، اپنی حالت کے حساب سے: دراز میں، بینک میں، جاری شدہ، کلیئر، باؤنس۔ | چك‌هاي گرفته‌شده در دوره، بر اساس وضعيت‌شان گروپ‌بندي‌شده: كشو، بانك، صادرشده، تسويه‌شده، برگشته۔ |
| `rep.cheques.title` | Cheques Report | چیکس کی رپورٹ | گزارش چك‌ها |
| `rep.closing` | Closing balance | اختتامی بیلنس | مانده پاياني |
| `rep.col.account` | Account | اکاؤنٹ | حساب |
| `rep.col.amount` | Amount | رقم | مبلغ |
| `rep.col.balance` | Balance | بیلنس | مانده |
| `rep.col.bank` | Bank | بینک | بانك |
| `rep.col.billNo` | Bill | بل | بل |
| `rep.col.category` | Category | زمرہ | دسته |
| `rep.col.chequeNo` | Cheque no. | چیک نمبر | شماره چك |
| `rep.col.cost` | Cost price | لاگت قیمت | قيمت هزينه |
| `rep.col.customer` | Customer | گاہک | مشتري |
| `rep.col.date` | Date | تاریخ | تاريخ |
| `rep.col.description` | Description | تفصیل | توضيح |
| `rep.col.dueDate` | Due date | واجب تاریخ | تاريخ سررسيد |
| `rep.col.expiry` | Expiry | ختم ہونے کی تاریخ | انقضا |
| `rep.col.goods` | Goods | مال | كالا |
| `rep.col.in` | In | آمد | ورودي |
| `rep.col.kind` | Kind | قسم | نوع |
| `rep.col.method` | Method | طریقہ | روش |
| `rep.col.note` | Note | نوٹ | يادداشت |
| `rep.col.number` | No. | نمبر | شماره |
| `rep.col.out` | Out | خرچ | خروجي |
| `rep.col.party` | Party | فریق | طرف |
| `rep.col.product` | Product | پروڈکٹ | كالا |
| `rep.col.qty` | Qty | تعداد | مقدار |
| `rep.col.reorder` | Reorder level | دوبارہ آرڈر سطح | سطح سفارش مجدد |
| `rep.col.salePrice` | Sale price | فروخت قیمت | قيمت فروش |
| `rep.col.status` | Status | حالت | وضعيت |
| `rep.col.stock` | Stock | اسٹاک | موجودي |
| `rep.col.supplier` | Supplier | سپلائر | تأمین‌کننده |
| `rep.col.tax` | Tax | ٹیکس | ماليات |
| `rep.col.total` | Total | کل | مجموع |
| `rep.col.value` | Value at cost | لاگت پر مالیت | ارزش به هزينه |
| `rep.customer.desc` | One customer's khata: opening balance, udhaar given, repayments and the closing balance. | ایک گاہک کا کھاتہ: ابتدائی بیلنس، دیا گیا ادھار، وصولیاں اور اختتامی بیلنس۔ | حساب يك مشتري: مانده آغازين، قرض داده‌شده، بازپرداخت‌ها و مانده پاياني۔ |
| `rep.customer.title` | Customer Statement | گاہک کا کھاتہ | صورت حساب مشتري |
| `rep.dayclose.desc` | The recorded day closes inside the period, with their counted and expected cash. | مدت کے اندر ریکارڈ شدہ دن کی بندشیں، ان کی گنی اور متوقع نقدی کے ساتھ۔ | بستن‌هاي روز ثبت‌شده در دوره، با نقد شمرده‌شده و مورد انتظارشان۔ |
| `rep.dayclose.title` | Day Close Summary | روزنامچہ بندش کا خلاصہ | خلاصه بستن روز |
| `rep.dc.counted` | Counted cash | گنی گئی نقدی | نقد شمرده‌شده |
| `rep.dc.difference` | Difference | فرق | تفاوت |
| `rep.dc.expected` | Expected cash | متوقع نقدی | نقد مورد انتظار |
| `rep.dc.sales` | Sales | فروخت | فروش |
| `rep.empty` | No records in this period. | اس مدت میں کوئی ریکارڈ نہیں۔ | در اين دوره سوابقي نيست۔ |
| `rep.expenses.desc` | Every expense of the period, grouped by category. | مدت کا ہر خرچ، زمرے کے حساب سے ترتیب شدہ۔ | هر مصرف دوره، بر اساس دسته گروپ‌بندي‌شده۔ |
| `rep.expenses.title` | Expenses Report | اخراجات کی رپورٹ | گزارش مصارف |
| `rep.eyebrow` | Finance | مالیات | امور مالي |
| `rep.footer` | Report generated by Dukaan AI | یہ رپورٹ Dukaan AI سے تیار کی گئی | گزارش ساخته‌شده توسط Dukaan AI |
| `rep.from` | From | سے | از |
| `rep.generatedAt` | Generated | تیار کردہ | ساخته‌شده |
| `rep.kind.bill` | Bill {no} | بل {no} | بل {no} |
| `rep.kind.credit` | Udhaar given | ادھار دیا | قرض داده‌شده |
| `rep.kind.payment` | Payment | ادائیگی | پرداخت |
| `rep.kind.purchase` | Purchase | خرید | خريد |
| `rep.kind.repayment` | Repayment | وصولی | بازپرداخت |
| `rep.kind.return` | Purchase return | خرید واپسی | برگشت خريد |
| `rep.kind.returnLegs` | Gross {gross} · cash back {refund} | کل {gross} · نقد واپس {refund} | ناخالص {gross} · نقد برگشته {refund} |
| `rep.kind.reversal` | Cheque bounced — payment reversed | چیک باؤنس — ادائیگی واپس | چك برگشت — پرداخت برگردانده شد |
| `rep.notes.credit` | Credit notes | کریڈٹ نوٹس | يادداشت‌هاي اعتبار |
| `rep.notes.debit` | Debit notes | ڈیبٹ نوٹس | يادداشت‌هاي بدهي |
| `rep.notes.desc` | The formal notes issued in the period — credit notes to customers, debit notes to suppliers. | مدت میں جاری شدہ رسمی نوٹس — گاہکوں کے کریڈٹ نوٹس، سپلائرز کے ڈیبٹ نوٹس۔ | يادداشت‌هاي رسمي صادرشده در دوره — يادداشت‌هاي اعتبار به مشتريان، يادداشت‌هاي بدهي به تأمین‌کننده‌ها۔ |
| `rep.notes.title` | Credit & Debit Notes | کریڈٹ و ڈیبٹ نوٹس | يادداشت‌هاي اعتبار و بدهي |
| `rep.opening` | Opening balance | ابتدائی بیلنس | مانده آغازين |
| `rep.outLang` | Print / share language | پرنٹ / شیئر کی زبان | زبان چاپ / اشتراك |
| `rep.period` | Period | مدت | دوره |
| `rep.pl.desc` | Revenue, cost of goods, expenses and net profit for the period — the Finance screen's own computation. | مدت کی آمدنی، مال کی لاگت، اخراجات اور خالص منافع — مالیات کی اسکرین کا اپنا حساب۔ | درآمد، هزينه كالا، مصارف و مفاد خالص براي دوره — محاسبه خود صفحه امور مالي۔ |
| `rep.pl.title` | Profit & Loss | نفع و نقصان | مفاد و زيان |
| `rep.print` | Print | پرنٹ کریں | چاپ |
| `rep.purchase.desc` | What came in during the period, by supplier and by product, net of purchase returns. | مدت میں آنے والا مال، سپلائر اور پروڈکٹ کے حساب سے، خرید واپسی کاٹنے کے بعد۔ | آنچه در دوره وارد شد، بر اساس تأمین‌کننده و كالا، پس از كسر برگشت‌هاي خريد۔ |
| `rep.purchase.title` | Purchase Report | خرید کی رپورٹ | گزارش خريد |
| `rep.range` | Date range | مدت | بازه تاريخ |
| `rep.range.custom` | Custom | اپنی مدت | دلخواه |
| `rep.range.fiscal` | This fiscal year | اس مالی سال | اين سال مالي |
| `rep.range.month` | This month | اس مہینے | اين ماه |
| `rep.range.today` | Today | آج | امروز |
| `rep.range.week` | This week | اس ہفتے | اين هفته |
| `rep.records` | records | ریکارڈ | سوابق |
| `rep.sales.desc` | Period totals, best-selling products and sales by customer — returns netted exactly as the Sales screen nets them. | مدت کے مجموعے، سب سے زیادہ بکنے والی اشیاء اور گاہک کے حساب سے فروخت — واپسیاں بالکل ویسے ہی کاٹ کر جیسے فروخت کی اسکرین کاٹتی ہے۔ | مجموع دوره، پرفروش‌ترين كالاها و فروش بر اساس مشتري — برگشت‌ها دقيقاً همان‌طور كه صفحه فروش كم مي‌كند۔ |
| `rep.sales.title` | Sales Report | فروخت کی رپورٹ | گزارش فروش |
| `rep.savePdf` | Save as PDF | PDF محفوظ کریں | به‌صورت PDF ذخيره كنيد |
| `rep.sec.byCategory` | By category | زمرے کے حساب سے | بر اساس دسته |
| `rep.sec.byCustomer` | By customer | گاہک کے حساب سے | بر اساس مشتري |
| `rep.sec.byProduct` | By product | پروڈکٹ کے حساب سے | بر اساس كالا |
| `rep.sec.bySupplier` | By supplier | سپلائر کے حساب سے | بر اساس تأمین‌کننده |
| `rep.sec.currentStock` | Current stock | موجودہ اسٹاک | موجودي فعلي |
| `rep.sec.detail` | Detail | تفصیل | جزئيات |
| `rep.sec.lowStock` | Low stock | کم اسٹاک | كم شده |
| `rep.sec.nearExpiry` | Near expiry (30 days) | ختم ہونے کے قریب (30 دن) | نزديك انقضا (30 روز) |
| `rep.selectAccount` | Money account | رقم اکاؤنٹ | حساب پول |
| `rep.selectCustomer` | Customer | گاہک | مشتري |
| `rep.selectSupplier` | Supplier | سپلائر | تأمین‌کننده |
| `rep.share` | Share | شیئر کریں | اشتراك |
| `rep.snapshotNote` | This report shows the current position — the date range does not apply to it. | یہ رپورٹ موجودہ صورتحال دکھاتی ہے — اس پر مدت کا اطلاق نہیں ہوتا۔ | اين گزارش وضعيت فعلي را نشان مي‌دهد — بازه تاريخ بر آن اعمال نمي‌شود۔ |
| `rep.stock.desc` | Current stock with its value at cost, the low-stock list and what expires within 30 days. | موجودہ اسٹاک اور لاگت پر اس کی مالیت، کم اسٹاک کی فہرست اور 30 دن میں ختم ہونے والی اشیاء۔ | موجودي فعلي با ارزش آن به هزينه، ليست موجودي كم و آنچه در 30 روز منقضي مي‌شود۔ |
| `rep.stock.title` | Stock Report | اسٹاک رپورٹ | گزارش موجودي |
| `rep.subtitle` | Every figure in the shop, on paper: sales, purchases, stock, profit, tax, statements and more — the same numbers the screens show, ready to save, print and share. | دکان کا ہر حساب کاغذ پر: فروخت، خرید، اسٹاک، منافع، ٹیکس، کھاتے اور بہت کچھ — وہی اعداد جو اسکرینوں پر نظر آتے ہیں، محفوظ کرنے، چھاپنے اور بھیجنے کے لیے تیار۔ | هر رقم دكان روي كاغذ: فروش، خريد، موجودي، مفاد، ماليات، صورت‌حساب‌ها و بيشتر — همان ارقامي كه صفحه‌ها نشان مي‌دهند، آماده براي ذخيره، چاپ و اشتراك۔ |
| `rep.supplier.desc` | One supplier's account: purchases, payments, purchase returns and the closing balance. | ایک سپلائر کا حساب: خرید، ادائیگیاں، خرید واپسی اور اختتامی بیلنس۔ | حساب يك تأمین‌کننده: خريدها، پرداخت‌ها، برگشت‌هاي خريد و مانده پاياني۔ |
| `rep.supplier.title` | Supplier Statement | سپلائر کا کھاتہ | صورت حساب تأمین‌کننده |
| `rep.tax.desc` | Output tax collected on sales and input tax paid on purchases, slab by slab, and the net position. | فروخت پر وصول شدہ آؤٹ پٹ ٹیکس اور خرید پر ادا شدہ ان پٹ ٹیکس، سلیب بہ سلیب، اور خالص پوزیشن۔ | ماليات خروجي جمع‌شده از فروش و ماليات ورودي پرداخته‌شده در خريد، پله به پله، و وضعيت خالص۔ |
| `rep.tax.input` | Input tax | ان پٹ ٹیکس | ماليات ورودي |
| `rep.tax.net` | Net position (output − input) | خالص پوزیشن (آؤٹ پٹ − ان پٹ) | وضعيت خالص (خروجي − ورودي) |
| `rep.tax.output` | Output tax | آؤٹ پٹ ٹیکس | ماليات خروجي |
| `rep.tax.slab` | Slab | سلیب | پله |
| `rep.tax.title` | Tax Report | ٹیکس رپورٹ | گزارش ماليات |
| `rep.tb.balanced` | Balanced — total debits equal total credits | متوازن — کل ڈیبٹ کل کریڈٹ کے برابر ہے | متوازن — مجموع بدهي‌ها برابر مجموع اعتبارها است |
| `rep.tb.cr` | Cr | جمع | Cr |
| `rep.tb.credit` | Credit | کریڈٹ | اعتبار |
| `rep.tb.debit` | Debit | ڈیبٹ | بدهي |
| `rep.tb.desc` | Per-account debit and credit totals from the journal for the period, with closing balances — the difference must be zero. | مدت کے لیے جرنل سے ہر کھاتے کے ڈیبٹ اور کریڈٹ کے مجموعے، اختتامی بیلنس کے ساتھ — فرق صفر ہونا چاہیے۔ | مجموع بدهي و اعتبار هر حساب از ژورنال براي دوره، با مانده‌هاي پاياني — تفاوت بايد صفر باشد۔ |
| `rep.tb.difference` | Difference | فرق | تفاوت |
| `rep.tb.dr` | Dr | نام | Dr |
| `rep.tb.title` | Trial Balance | ٹرائل بیلنس | تراز آزمايشي |
| `rep.tb.unbalanced` | Out of balance | غیر متوازن | نامتوازن |
| `rep.title` | Reports | رپورٹس | گزارش‌ها |
| `rep.to` | To | تک | تا |
| `rep.tot.expenses` | Total expenses | کل اخراجات | مجموع مصارف |
| `rep.tot.given` | Udhaar given in period | مدت میں دیا گیا ادھار | قرض داده‌شده در دوره |
| `rep.tot.grossPurchases` | Gross purchases | مجموعی خرید | خريد ناخالص |
| `rep.tot.grossSales` | Gross sales | مجموعی فروخت | فروش ناخالص |
| `rep.tot.netPurchases` | Net purchases | خالص خرید | خريد خالص |
| `rep.tot.netSales` | Net sales | خالص فروخت | فروش خالص |
| `rep.tot.otherRevenue` | Other revenue (journal only) | دیگر آمدنی (صرف جرنل میں) | درآمد ديگر (فقط ژورنال) |
| `rep.tot.paid` | Payments in period | مدت میں ادائیگیاں | پرداخت‌ها در دوره |
| `rep.tot.plNetRevenue` | Net revenue per profit & loss | نفع و نقصان کے مطابق خالص آمدنی | درآمد خالص بر اساس مفاد و زيان |
| `rep.tot.purchased` | Purchases in period | مدت میں خرید | خريدها در دوره |
| `rep.tot.purchaseReturns` | Purchase returns | خرید واپسی | برگشت‌هاي خريد |
| `rep.tot.repaid` | Repaid in period | مدت میں وصولی | بازپرداخت‌شده در دوره |
| `rep.tot.returned` | Returns in period | مدت میں واپسی | برگشت‌ها در دوره |
| `rep.tot.returns` | Returns | واپسیاں | برگشت‌ها |
| `rep.tot.stockValue` | Stock value (at cost) | اسٹاک مالیت (لاگت پر) | ارزش موجودي (به هزينه) |
| `rep.tot.stockValueRetail` | Stock value (at sale price) | اسٹاک مالیت (فروخت قیمت پر) | ارزش موجودي (به قيمت فروش) |
| `rep.tot.units` | Units sold (net) | فروخت شدہ یونٹس (خالص) | واحدهاي فروخته‌شده (خالص) |
| `rep.walkIn` | Walk-in / counter | عام گاہک / کاؤنٹر | گذري / پيشخوان |
| `rep.whatsapp` | WhatsApp | واٹس ایپ | WhatsApp |
## print

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `pin.back` | Back | واپس | بازگشت |
| `pin.change` | Change PIN | پن بدلیں | PIN را تغییر دهید |
| `pin.changedDone` | PIN changed on this device. | اس آلے پر پن بدل گیا۔ | PIN روی این دستگاه تغییر کرد. |
| `pin.confirmPin` | Confirm PIN | پن کی تصدیق کریں | PIN را تأیید کنید |
| `pin.currentPin` | Current PIN | موجودہ پن | PIN فعلی |
| `pin.demoErase.body` | There is no account password in demo mode. Erasing resets the demo shop to its sample data and removes this device's PIN. | ڈیمو موڈ میں اکاؤنٹ پاس ورڈ نہیں ہوتا۔ مٹانے سے ڈیمو دکان اپنے نمونہ ڈیٹا پر واپس آ جاتی ہے اور اس آلے کا پن ہٹ جاتا ہے۔ | در حالت دیمو رمز عبور حسابی نیست. پاک کردن دکان دیمو را به معلومات نمونه‌ای آن باز می‌گرداند و PIN این دستگاه را حذف می‌کند. |
| `pin.demoErase.submit` | Erase data and remove PIN | ڈیٹا مٹائیں اور پن ہٹائیں | معلومات را پاک کنید و PIN را حذف کنید |
| `pin.demoErase.title` | Erase demo data and remove the PIN | ڈیمو ڈیٹا مٹائیں اور پن ہٹائیں | معلومات دیمو را پاک کنید و PIN را حذف کنید |
| `pin.demoErase.typeLabel` | Type the shop name to confirm | تصدیق کے لیے دکان کا نام لکھیں | نام دکان را برای تأیید بنویسید |
| `pin.demoRecovery` | There is no password in demo mode: if this PIN is forgotten, the lock screen can erase the demo data and remove the PIN. | ڈیمو موڈ میں پاس ورڈ نہیں ہوتا: یہ پن بھول جائیں تو لاک اسکرین سے ڈیمو ڈیٹا مٹا کر پن ہٹایا جا سکتا ہے۔ | در حالت دیمو رمز عبوری نیست: اگر این PIN فراموش شود، صفحه قفل معلومات دیمو را پاک کرده و PIN را حذف کرده می‌تواند. |
| `pin.digits` | PIN length | پن کی لمبائی | طول PIN |
| `pin.digitsOption` | {n} digits | {n} ہندسے | {n} رقم |
| `pin.errCurrent` | That current PIN is not correct — nothing was changed. | موجودہ پن درست نہیں — کچھ نہیں بدلا گیا۔ | آن PIN فعلی درست نیست — چیزی تغییر نکرد. |
| `pin.errDigits` | Enter exactly {n} digits, numbers only. | ٹھیک {n} ہندسے درج کریں، صرف اعداد۔ | دقیقاً {n} رقم وارد کنید، فقط اعداد. |
| `pin.errMismatch` | The two PINs do not match. | دونوں پن ایک جیسے نہیں ہیں۔ | دو PIN مطابقت ندارند. |
| `pin.errPassword` | That account password was not accepted — nothing was changed. | اکاؤنٹ پاس ورڈ قبول نہیں ہوا — کچھ نہیں بدلا گیا۔ | آن رمز عبور حساب پذیرفته نشد — چیزی تغییر نکرد. |
| `pin.forgot` | Forgot PIN? | پن بھول گئے؟ | PIN را فراموش کردید؟ |
| `pin.gate` | Ask for the PIN before sensitive actions | حساس اعمال سے پہلے پن پوچھیں | قبل از اقدامات حساس PIN بخواهید |
| `pin.gate.actDayClose` | Submit the day close | دن کا اختتام جمع کرنا | بستن روز را ثبت کنید |
| `pin.gate.actFiscal` | Close or reopen the fiscal year | مالی سال بند یا دوبارہ کھولنا | سال مالی را ببندید یا دوباره باز کنید |
| `pin.gate.actPeriod` | Close or reopen a period | مدت بند یا دوبارہ کھولنا | یک دوره را ببندید یا دوباره باز کنید |
| `pin.gate.actVoid` | Void a posted bill | درج شدہ بل منسوخ کرنا | یک بل ثبت‌شده را باطل کنید |
| `pin.gate.body` | Enter this device's PIN to continue. | جاری رکھنے کے لیے اس آلے کا پن درج کریں۔ | برای ادامه PIN این دستگاه را وارد کنید. |
| `pin.gate.title` | PIN required | پن درکار ہے | PIN لازم است |
| `pin.gateSub` | Voiding a bill, submitting the day close, and closing or reopening a period or fiscal year will ask for this device's PIN first — only on this device, and only while a PIN is set. | بل منسوخ کرنا، دن کا اختتام جمع کرنا، اور مدت یا مالی سال بند یا دوبارہ کھولنا — ان سے پہلے اس آلے کا پن پوچھا جائے گا — صرف اس آلے پر، اور صرف اس وقت جب پن لگا ہو۔ | باطل کردن یک بل، ثبت بستن روز، و بستن یا باز کردن دوباره یک دوره یا سال مالی اول PIN این دستگاه را خواهد خواست — فقط روی این دستگاه، و فقط وقتی یک PIN تنظیم باشد. |
| `pin.honesty` | The PIN keeps this device's app private from casual use at the counter. It is not a replacement for your account password — anyone who knows the account password can remove the PIN. Your shop data stays protected by your account sign-in. | پن اس آلے پر ایپ کو کاؤنٹر پر اتفاقی استعمال سے نجی رکھتا ہے۔ یہ آپ کے اکاؤنٹ پاس ورڈ کا متبادل نہیں — جو بھی اکاؤنٹ پاس ورڈ جانتا ہے وہ پن ہٹا سکتا ہے۔ آپ کی دکان کا ڈیٹا آپ کے اکاؤنٹ سائن ان سے محفوظ رہتا ہے۔ | PIN اپلیکیشن این دستگاه را از استفاده عادی در پیشخوان خصوصی نگه می‌دارد. این جایگزین رمز عبور حساب شما نیست — هر کسی که رمز عبور حساب را بداند PIN را حذف کرده می‌تواند. معلومات دکان شما با ورود حساب شما محافظت می‌ماند. |
| `pin.idle` | Lock automatically when idle | غیر فعالیت پر خودکار لاک | وقتی بیکار است خودکار قفل کنید |
| `pin.idleLaunch` | Only when the app opens | صرف اس وقت جب ایپ کھلے | فقط وقتی اپلیکیشن باز می‌شود |
| `pin.idleMinutes` | After {n} min idle | {n} منٹ غیر فعالیت کے بعد | بعد از {n} دقیقه بیکاری |
| `pin.lock.paused` | Too many wrong tries. The pad opens again in {sec} seconds. | غلط کوششیں زیادہ ہو گئیں۔ پیڈ {sec} سیکنڈ میں دوبارہ کھلے گا۔ | کوشش‌های اشتباه زیاد شد. صفحه کلید در {sec} ثانیه دوباره باز می‌شود. |
| `pin.lock.prompt` | Enter the device PIN | آلے کا پن درج کریں | PIN دستگاه را وارد کنید |
| `pin.lock.wrong` | Wrong PIN — try again. | غلط پن — دوبارہ کوشش کریں۔ | PIN اشتباه — دوباره کوشش کنید. |
| `pin.lockNow` | Lock now | ابھی لاک کریں | حالا قفل کنید |
| `pin.newPin` | New PIN | نیا پن | PIN جدید |
| `pin.pad.backspace` | Delete last digit | آخری ہندسہ مٹائیں | آخرین رقم را حذف کنید |
| `pin.password` | Account password | اکاؤنٹ پاس ورڈ | رمز عبور حساب |
| `pin.passwordAlt` | …or with your account password | …یا اپنے اکاؤنٹ پاس ورڈ سے | …یا با رمز عبور حساب شما |
| `pin.recover.body` | Enter the password of the account signed in on this device. The PIN is removed, the app opens, and you can set a new PIN in Settings. Forgetting the PIN never locks you out of your own shop. | اس آلے پر سائن ان اکاؤنٹ کا پاس ورڈ درج کریں۔ پن ہٹ جائے گا، ایپ کھل جائے گی، اور آپ ترتیبات میں نیا پن لگا سکیں گے۔ پن بھولنے سے آپ اپنی ہی دکان سے کبھی بند نہیں ہوتے۔ | رمز عبور حسابی را که روی این دستگاه وارد شده است وارد کنید. PIN حذف می‌شود، اپلیکیشن باز می‌شود، و شما یک PIN جدید در تنظیمات تنظیم کرده می‌توانید. فراموش کردن PIN هرگز شما را از دکان خودتان محروم نمی‌کند. |
| `pin.recover.failed` | That password was not accepted — the lock stays on. | پاس ورڈ قبول نہیں ہوا — لاک برقرار ہے۔ | آن رمز عبور پذیرفته نشد — قفل باقی می‌ماند. |
| `pin.recover.submit` | Remove PIN and open | پن ہٹائیں اور کھولیں | PIN را حذف کنید و باز کنید |
| `pin.recover.title` | Forgot the PIN? | پن بھول گئے؟ | PIN را فراموش کردید؟ |
| `pin.remove` | Remove PIN | پن ہٹائیں | PIN را حذف کنید |
| `pin.removedDone` | PIN removed from this device. | اس آلے سے پن ہٹ گیا۔ | PIN از این دستگاه حذف شد. |
| `pin.removeWithPassword` | Remove with password | پاس ورڈ سے ہٹائیں | با رمز عبور حذف کنید |
| `pin.set` | Set PIN | پن لگائیں | PIN تنظیم کنید |
| `pin.setDone` | PIN set on this device. | اس آلے پر پن لگ گیا۔ | PIN روی این دستگاه تنظیم شد. |
| `pin.statusNone` | No PIN is set on this device — the app opens here without a PIN. | اس آلے پر کوئی پن نہیں لگا — یہاں ایپ بغیر پن کے کھلتی ہے۔ | هیچ PIN ای روی این دستگاه تنظیم نشده است — اپلیکیشن اینجا بدون PIN باز می‌شود. |
| `pin.statusSet` | A PIN is set on this device since {date}. | اس آلے پر {date} سے پن لگا ہوا ہے۔ | یک PIN از {date} روی این دستگاه تنظیم است. |
| `pin.title` | This device's lock | اس آلے کا لاک | قفل این دستگاه |
| `print.authorisedSignature` | Authorised signature | مجاز دستخط | امضای مجاز |
| `print.brand.badType` | That file could not be read as an image. | یہ فائل تصویر کے طور پر نہیں پڑھی جا سکی۔ | آن فایل به حیث تصویر خوانده شده نتوانست. |
| `print.brand.capNote` | Limit {cap} KB after automatic compression | خودکار کمپریشن کے بعد حد {cap} KB | حد {cap} KB بعد از فشرده‌سازی خودکار |
| `print.brand.compressing` | Compressing image… | تصویر چھوٹی ہو رہی ہے… | تصویر فشرده می‌شود… |
| `print.brand.empty` | No image yet | ابھی کوئی تصویر نہیں | هنوز تصویری نیست |
| `print.brand.letterheadFooter` | Letterhead — footer banner | لیٹر ہیڈ — نیچے کا بینر | سربرگ — بنر پایین |
| `print.brand.letterheadFooterToggle` | Print the letterhead footer banner | لیٹر ہیڈ کا نیچے والا بینر چھاپیں | بنر پایین سربرگ را چاپ کنید |
| `print.brand.letterheadHeader` | Letterhead — header banner | لیٹر ہیڈ — اوپر کا بینر | سربرگ — بنر بالا |
| `print.brand.letterheadHint` | A full-width banner image. On thermal 80mm prints the text header is used instead — banners never print on thermal. | پوری چوڑائی کی بینر تصویر۔ تھرمل 80mm پر بینر کبھی نہیں چھپتا — وہاں متنی ہیڈر استعمال ہوتا ہے۔ | یک تصویر بنر تمام‌عرض. در چاپ‌های حرارتی 80mm به جای آن سرخط متنی استفاده می‌شود — بنرها هرگز روی حرارتی چاپ نمی‌شوند. |
| `print.brand.logo` | Shop logo | دکان کا لوگو | لوگوی دکان |
| `print.brand.logoHint` | Shown in the header when the design calls for it. A transparent PNG works best. | ڈیزائن میں منتخب ہونے پر ہیڈر میں دکھائی دیتا ہے۔ شفاف PNG بہترین رہتا ہے۔ | وقتی طرح ایجاب کند در سرخط نشان داده می‌شود. یک PNG شفاف بهترین کار می‌کند. |
| `print.brand.raastNote` | The QR your bank gave you, saved from your banking app. It prints with Raast payments once Raast is set up (Payments). | آپ کے بینک کا دیا ہوا QR، آپ کی بینکنگ ایپ سے محفوظ کیا گیا۔ راست سیٹ اپ (ادائیگیاں) مکمل ہونے پر راست ادائیگیوں کے ساتھ چھپے گا۔ | QR ای که بانک شما داده است، از اپلیکیشن بانکی شما ذخیره شده. وقتی Raast تنظیم شود (پرداخت‌ها) با پرداخت‌های Raast چاپ می‌شود. |
| `print.brand.raastQr` | Bank Raast QR image | بینک راست QR تصویر | تصویر QR بانک Raast |
| `print.brand.remove` | Remove | ہٹائیں | حذف کنید |
| `print.brand.removed` | Image removed. | تصویر ہٹا دی گئی۔ | تصویر حذف شد. |
| `print.brand.replace` | Replace | تبدیل کریں | جایگزین کنید |
| `print.brand.saved` | Image saved. | تصویر محفوظ ہو گئی۔ | تصویر ذخیره شد. |
| `print.brand.signature` | Authorised signature | مجاز دستخط | امضای مجاز |
| `print.brand.signatureHint` | Replaces the ruled signature line on the documents you choose below. A transparent PNG works best. | نیچے منتخب دستاویزات پر بنی ہوئی دستخطی لکیر کی جگہ چھپتا ہے۔ شفاف PNG بہترین رہتا ہے۔ | خط امضای خط‌دار را روی اسنادی که در پایین انتخاب می‌کنید جایگزین می‌کند. یک PNG شفاف بهترین کار می‌کند. |
| `print.brand.signOn` | Signature image on | دستخط کی تصویر ان پر | تصویر امضا روی |
| `print.brand.signSlips` | Salary slips | تنخواہ کی پرچیاں | رسیدهای معاش |
| `print.brand.signVouchers` | Payment vouchers | ادائیگی واؤچرز | سندهای پرداخت |
| `print.brand.sizeLine` | {size} KB · {w} × {h} px | {size} KB · {w} × {h} پکسل | {size} KB · {w} × {h} px |
| `print.brand.stamp` | Shop stamp / seal | دکان کی مہر | مهر / نشان دکان |
| `print.brand.stampAlso` | Also stamp | ان پر بھی مہر | همچنین مهر بزنید |
| `print.brand.stampAlways` | Every bill | ہر بل پر | هر بل |
| `print.brand.stampHint` | A transparent PNG prints like a real stamp impression. | شفاف PNG اصلی مہر کے نشان کی طرح چھپتا ہے۔ | یک PNG شفاف مانند اثر یک مهر واقعی چاپ می‌شود. |
| `print.brand.stampMode` | Stamp on bills | بلوں پر مہر | مهر روی بل‌ها |
| `print.brand.stampNever` | Never | کبھی نہیں | هرگز |
| `print.brand.stampNotes` | Credit / debit notes | کریڈٹ / ڈیبٹ نوٹس | یادداشت‌های کریدت / دبت |
| `print.brand.stampPaid` | Fully-paid bills only | صرف مکمل ادا شدہ بلوں پر | فقط بل‌های کاملاً پرداخت‌شده |
| `print.brand.stampQuotes` | Quotations & orders | کوٹیشنز اور آرڈرز | پیشنهادهای قیمت و سفارش‌ها |
| `print.brand.stampVouchers` | Payment vouchers | ادائیگی واؤچرز | سندهای پرداخت |
| `print.brand.sub` | Your logo, letterhead, stamp and signature, printed on bills and documents. Images are compressed automatically on this device and stored with your shop. | آپ کا لوگو، لیٹر ہیڈ، مہر اور دستخط — بلوں اور دستاویزات پر چھپتے ہیں۔ تصاویر اسی ڈیوائس پر خودکار طور پر چھوٹی کر کے آپ کی دکان کے ساتھ محفوظ ہوتی ہیں۔ | لوگو، سربرگ، مهر و امضای شما، روی بل‌ها و اسناد چاپ می‌شود. تصاویر به صورت خودکار روی این دستگاه فشرده می‌شوند و با دکان شما ذخیره می‌شوند. |
| `print.brand.title` | Brand assets | برانڈ اثاثے | دارایی‌های برند |
| `print.brand.tooLarge` | This image compresses to {actual} KB — over the {cap} KB limit. Crop it or use a simpler image, then try again. | یہ تصویر چھوٹی ہو کر بھی {actual} KB رہتی ہے — حد {cap} KB سے زیادہ۔ اسے تراشیں یا سادہ تصویر استعمال کر کے دوبارہ کوشش کریں۔ | این تصویر به {actual} KB فشرده می‌شود — بیشتر از حد {cap} KB. آن را ببرید یا یک تصویر ساده‌تر استفاده کنید، بعد دوباره کوشش کنید. |
| `print.brand.totalLine` | All brand images together: {size} KB | تمام برانڈ تصاویر مل کر: {size} KB | همه تصاویر برند با هم: {size} KB |
| `print.brand.upload` | Upload image | تصویر اپ لوڈ کریں | تصویر را بارگذاری کنید |
| `print.col.discount` | Discount | رعایت | تخفیف |
| `print.col.sku` | SKU | SKU | SKU |
| `print.col.tax` | Tax | ٹیکس | مالیات |
| `print.colDiscount` | Per-line discount column | فی سطر رعایت کالم | ستون تخفیف فی خط |
| `print.colSku` | SKU column | SKU کالم | ستون SKU |
| `print.colTax` | Per-line tax column | فی سطر ٹیکس کالم | ستون مالیات فی خط |
| `print.colTaxNote` | Bills and notes only — quotations and orders carry estimates, never per-line tax. | صرف بلوں اور نوٹس کے لیے — کوٹیشن اور آرڈر پر تخمینے ہوتے ہیں، فی سطر ٹیکس نہیں۔ | فقط بل‌ها و یادداشت‌ها — پیشنهادهای قیمت و سفارش‌ها تخمین دارند، هرگز مالیات فی خط ندارند. |
| `print.columnsTitle` | Item columns | اشیا کے کالم | ستون‌های کالا |
| `print.colUrduName` | Urdu name under each item | ہر شے کے نیچے اردو نام | نام اردو زیر هر کالا |
| `print.fontScale` | Text size | متن کا سائز | اندازه متن |
| `print.fontScale.large` | Large | بڑا | بزرگ |
| `print.fontScale.standard` | Standard | معیاری | معیاری |
| `print.footerNote` | Footer note | فوٹر نوٹ | یادداشت پانویس |
| `print.footerNotePh` | Printed at the end of bills and documents | بلوں اور دستاویزات کے آخر میں چھپے گا | در پایان بل‌ها و اسناد چاپ می‌شود |
| `print.footerTitle` | Footer | فوٹر | پانویس |
| `print.headerMode` | Header style | ہیڈر کا انداز | سبک سرخط |
| `print.headerMode.letterhead` | Letterhead image | لیٹر ہیڈ تصویر | تصویر سربرگ |
| `print.headerMode.logoText` | Logo + text | لوگو + متن | لوگو + متن |
| `print.headerMode.text` | Text | متن | متن |
| `print.headerModeNote` | Letterhead and logo images are added under Brand assets; until an image exists, the text header prints. | لیٹر ہیڈ اور لوگو کی تصاویر برانڈ اثاثوں میں شامل ہوتی ہیں؛ تصویر موجود نہ ہو تو متنی ہیڈر ہی چھپتا ہے۔ | تصاویر سربرگ و لوگو در بخش دارایی‌های برند اضافه می‌شوند؛ تا وقتی تصویری وجود نداشته باشد، سرخط متنی چاپ می‌شود. |
| `print.headerTitle` | Header | ہیڈر | سرخط |
| `print.logoSize` | Logo size | لوگو کا سائز | اندازه لوگو |
| `print.logoSize.l` | Large | بڑا | بزرگ |
| `print.logoSize.m` | Medium | درمیانہ | متوسط |
| `print.logoSize.s` | Small | چھوٹا | کوچک |
| `print.paper` | Paper & layout | کاغذ اور لے آؤٹ | کاغذ و چیدمان |
| `print.paper.a4` | Classic A4 | کلاسک A4 | A4 کلاسیک |
| `print.paper.a4compact` | Compact A4 | کمپیکٹ A4 | A4 فشرده |
| `print.paper.a5` | A5 | A5 | A5 |
| `print.paper.thermal80` | Thermal 80mm | تھرمل 80mm | حرارتی 80mm |
| `print.previewBill` | Sample bill | نمونہ بل | بل نمونه |
| `print.previewQuote` | Sample quotation | نمونہ کوٹیشن | پیشنهاد قیمت نمونه |
| `print.previewTitle` | Live preview | براہِ راست پیش نظارہ | پیش‌نمایش زنده |
| `print.raast.caption` | Scan with any banking app to pay via Raast | کسی بھی بینکنگ ایپ سے اسکین کر کے راست سے ادائیگی کریں | با هر اپلیکیشن بانکی اسکن کنید تا از طریق Raast پرداخت کنید |
| `print.raast.dynamicNote` | The code carries the bill total, so the customer just scans and pays — and the bill number lets you match the payment later. Quotations always carry a plain code with no amount: an estimate is not a demand. | کوڈ میں بل کی کل رقم ہوتی ہے — گاہک بس اسکین کر کے ادا کرتا ہے — اور بل نمبر سے آپ بعد میں ادائیگی ملا سکتے ہیں۔ کوٹیشن پر ہمیشہ بغیر رقم والا سادہ کوڈ چھپتا ہے: تخمینہ کوئی تقاضا نہیں ہوتا۔ | کد مجموع بل را دارد، پس مشتری فقط اسکن می‌کند و پرداخت می‌کند — و شماره بل به شما اجازه می‌دهد پرداخت را بعداً مطابقت دهید. پیشنهادهای قیمت همیشه یک کد ساده بدون مبلغ دارند: یک تخمین یک مطالبه نیست. |
| `print.raast.dynamicToggle` | Put the bill's amount and number in the QR (dynamic) | QR میں بل کی رقم اور نمبر شامل کریں (ڈائنامک) | مبلغ و شماره بل را در QR بگذارید (پویا) |
| `print.raast.err.alias` | A mobile number cannot be used here — the Raast QR standard carries an IBAN, not a phone alias. Your IBAN is on your cheque book and in your banking app. | یہاں موبائل نمبر نہیں چلے گا — راست QR کے معیار میں فون علیاس نہیں، IBAN ہوتا ہے۔ آپ کا IBAN چیک بک پر اور بینکنگ ایپ میں ملے گا۔ | یک شماره موبایل اینجا استفاده شده نمی‌تواند — معیار QR Raast یک IBAN دارد، نه یک نام مستعار تلیفون. IBAN شما روی کتاب چک شما و در اپلیکیشن بانکی شما است. |
| `print.raast.err.checksum` | The IBAN's check digits do not match — a digit is wrong somewhere. Copy it exactly from your cheque book or banking app. | IBAN کے جانچ ہندسے میل نہیں کھا رہے — کہیں کوئی ہندسہ غلط ہے۔ چیک بک یا بینکنگ ایپ سے ہو بہو نقل کریں۔ | ارقام بررسی IBAN مطابقت ندارند — یک رقم در جایی اشتباه است. آن را دقیقاً از کتاب چک یا اپلیکیشن بانکی خود کپی کنید. |
| `print.raast.err.fi` | The bank name must be at most 25 characters, in English letters as your bank prints it. | بینک کا نام زیادہ سے زیادہ 25 حروف ہو، انگریزی حروف میں جیسا آپ کا بینک لکھتا ہے۔ | نام بانک باید حداکثر 25 حرف باشد، با حروف انگلیسی همان‌گونه که بانک شما چاپ می‌کند. |
| `print.raast.err.format` | The middle of an IBAN is a 4-letter bank code followed by the account number. Copy it exactly as printed. | IBAN کے درمیان میں چار حروف کا بینک کوڈ اور پھر اکاؤنٹ نمبر ہوتا ہے۔ بالکل ویسا ہی لکھیں جیسا چھپا ہے۔ | وسط یک IBAN یک کد بانکی 4 حرفی است و بعد شماره حساب. آن را دقیقاً همان‌گونه که چاپ شده کپی کنید. |
| `print.raast.err.length` | A Pakistani IBAN is exactly 24 characters — a character seems missing or extra. | پاکستانی IBAN پورے 24 حروف کا ہوتا ہے — کوئی حرف کم یا زیادہ لگ رہا ہے۔ | یک IBAN پاکستانی دقیقاً 24 حرف است — یک حرف کم یا زیاد معلوم می‌شود. |
| `print.raast.err.notPk` | Only a Pakistani (PK) IBAN works with Raast. | راست کے لیے صرف پاکستانی (PK) IBAN چلتا ہے۔ | فقط یک IBAN پاکستانی (PK) با Raast کار می‌کند. |
| `print.raast.fiHint` | As your bank prints it — up to 25 characters. | جیسا آپ کا بینک لکھتا ہے — زیادہ سے زیادہ 25 حروف۔ | همان‌گونه که بانک شما چاپ می‌کند — تا 25 حرف. |
| `print.raast.fiLabel` | Bank name (optional) | بینک کا نام (اختیاری) | نام بانک (اختیاری) |
| `print.raast.fiPh` | e.g. Meezan Bank | مثلاً Meezan Bank | مثلاً Meezan Bank |
| `print.raast.honest` | Two ways, honestly labelled. Your bank's own QR image (uploaded under Brand assets) is the verified path — when it exists, it prints. The code generated here follows the State Bank's published person-to-person (P2P) template, built from your IBAN alone. It is not a bank-issued merchant (P2M) code — only your bank can issue one of those — and the generated code has not yet been verified against a real bank Raast QR, so scan-test it with your own banking app before you rely on it. | دو راستے، دونوں صاف لکھے ہوئے۔ آپ کے بینک کی اپنی QR تصویر (برانڈ اثاثوں میں لگائی گئی) تصدیق شدہ راستہ ہے — وہ موجود ہو تو وہی چھپتی ہے۔ یہاں بننے والا کوڈ اسٹیٹ بینک کے شائع شدہ شخص-تا-شخص (P2P) سانچے کے مطابق صرف آپ کے IBAN سے بنتا ہے۔ یہ بینک کا جاری کردہ مرچنٹ (P2M) کوڈ نہیں — وہ صرف آپ کا بینک جاری کر سکتا ہے — اور بنائے گئے کوڈ کی تصدیق ابھی کسی اصل بینک راست QR سے نہیں ہوئی، اس لیے بھروسا کرنے سے پہلے اسے اپنی بینکنگ ایپ سے اسکین کر کے جانچیں۔ | دو راه، صادقانه نام‌گذاری شده. تصویر QR خود بانک شما (در بخش دارایی‌های برند بارگذاری شده) راه تأییدشده است — وقتی وجود داشته باشد، همان چاپ می‌شود. کدی که اینجا ساخته می‌شود قالب شخص-به-شخص (P2P) منتشرشده بانک دولتی را دنبال می‌کند، که فقط از IBAN شما ساخته شده است. این یک کد تاجر صادرشده توسط بانک (P2M) نیست — فقط بانک شما یکی از آن‌ها را صادر کرده می‌تواند — و کد ساخته‌شده هنوز در برابر یک QR واقعی Raast بانک تأیید نشده است، پس قبل از اعتماد به آن، آن را با اپلیکیشن بانکی خود اسکن-آزمایش کنید. |
| `print.raast.ibanHint` | Your IBAN is printed on your cheque book and shown in your banking app under account details. | آپ کا IBAN چیک بک پر چھپا ہوتا ہے اور بینکنگ ایپ میں اکاؤنٹ کی تفصیل میں نظر آتا ہے۔ | IBAN شما روی کتاب چک شما چاپ است و در اپلیکیشن بانکی شما زیر جزئیات حساب نشان داده می‌شود. |
| `print.raast.ibanLabel` | Your Raast IBAN | آپ کا راست IBAN | IBAN Raast شما |
| `print.raast.ibanPh` | PK36 … (24 characters) | PK36 … (24 حروف) | PK36 … (24 حرف) |
| `print.raast.onBills` | On bills | بلوں پر | روی بل‌ها |
| `print.raast.paperIban` | Raast IBAN | راست IBAN | IBAN Raast |
| `print.raast.pathGenerated` | On bills: the generated Raast code from this IBAN prints. | بلوں پر: اس IBAN سے بنا راست کوڈ چھپے گا۔ | روی بل‌ها: کد Raast ساخته‌شده از این IBAN چاپ می‌شود. |
| `print.raast.pathImage` | On bills: your bank's QR image prints (Brand assets) — the verified path. | بلوں پر: آپ کے بینک کی QR تصویر چھپے گی (برانڈ اثاثے) — یہی تصدیق شدہ راستہ ہے۔ | روی بل‌ها: تصویر QR بانک شما چاپ می‌شود (دارایی‌های برند) — راه تأییدشده. |
| `print.raast.pathNone` | On bills: no Raast QR yet — save an IBAN here, or upload your bank's QR image under Brand assets. | بلوں پر: ابھی کوئی راست QR نہیں — یہاں IBAN محفوظ کریں، یا برانڈ اثاثوں میں بینک کی QR تصویر لگائیں۔ | روی بل‌ها: هنوز QR Raast نیست — یک IBAN اینجا ذخیره کنید، یا تصویر QR بانک خود را در بخش دارایی‌های برند بارگذاری کنید. |
| `print.raast.payloadLabel` | QR contents (for checking) | QR کا متن (جانچ کے لیے) | محتوای QR (برای بررسی) |
| `print.raast.posterBtn` | Print counter poster | کاؤنٹر پوسٹر چھاپیں | پوستر پیشخوان را چاپ کنید |
| `print.raast.posterNote` | One static code for the counter — the customer scans and types the amount. | کاؤنٹر کے لیے ایک ساکن کوڈ — گاہک اسکین کر کے رقم خود لکھتا ہے۔ | یک کد ثابت برای پیشخوان — مشتری اسکن می‌کند و مبلغ را می‌نویسد. |
| `print.raast.posterTitle` | Pay via Raast | راست سے ادائیگی کریں | از طریق Raast پرداخت کنید |
| `print.raast.previewTitle` | Preview — scan-test this code | پیش نظارہ — اس کوڈ کو اسکین کر کے جانچیں | پیش‌نمایش — این کد را اسکن-آزمایش کنید |
| `print.raast.provisional` | Generated QR: pending verification against a real bank Raast QR. | بنایا گیا QR: اصل بینک راست QR سے تصدیق باقی ہے۔ | QR ساخته‌شده: در انتظار تأیید در برابر یک QR واقعی Raast بانک. |
| `print.raast.sampleNote` | A test IBAN for the demo, shown only so you can see the code. It never prints on a real bill. | ڈیمو نمونہ — آزمائشی IBAN، صرف کوڈ دکھانے کے لیے۔ یہ کبھی اصل بل پر نہیں چھپتا۔ | یک IBAN آزمایشی برای دیمو، فقط نشان داده شده تا کد را ببینید. هرگز روی یک بل واقعی چاپ نمی‌شود. |
| `print.raast.saved` | Raast settings saved. | راست ترتیبات محفوظ ہو گئیں۔ | تنظیمات Raast ذخیره شد. |
| `print.raast.showToggle` | Print a Raast QR on bills | بلوں پر راست QR چھاپیں | یک QR Raast روی بل‌ها چاپ کنید |
| `print.raast.sizeLabel` | QR size on bills | بل پر QR کا سائز | اندازه QR روی بل‌ها |
| `print.raast.sub` | Print a Raast QR on bills so customers can scan with any banking app and pay straight to your account. | بلوں پر راست QR چھاپیں تاکہ گاہک کسی بھی بینکنگ ایپ سے اسکین کر کے سیدھا آپ کے اکاؤنٹ میں ادائیگی کر سکے۔ | یک QR Raast روی بل‌ها چاپ کنید تا مشتریان با هر اپلیکیشن بانکی اسکن کنند و مستقیم به حساب شما پرداخت کنند. |
| `print.raast.title` | Payments — Raast QR | ادائیگیاں — راست QR | پرداخت‌ها — QR Raast |
| `print.raast.validNote` | This IBAN checks out. Before relying on it, scan the preview with your banking app and confirm YOUR name and account appear. | یہ IBAN درست نکلا۔ بھروسا کرنے سے پہلے پیش نظارہ اپنی بینکنگ ایپ سے اسکین کریں اور تصدیق کریں کہ آپ کا اپنا نام اور اکاؤنٹ ہی آ رہا ہے۔ | این IBAN درست است. قبل از اعتماد به آن، پیش‌نمایش را با اپلیکیشن بانکی خود اسکن کنید و تأیید کنید که نام و حساب شما ظاهر می‌شود. |
| `print.reset` | Reset to today's look | آج کی صورت پر واپس کریں | به شکل امروز بازگردانید |
| `print.sampleBadge` | SAMPLE · نمونہ | نمونہ · SAMPLE | SAMPLE · نمونہ |
| `print.saved` | Print design saved. | پرنٹ ڈیزائن محفوظ ہو گیا۔ | طرح چاپ ذخیره شد. |
| `print.shopNameAlt` | Shop name (other script) | دکان کا نام (دوسری رسم الخط) | نام دکان (خط دیگر) |
| `print.shopNameAltPh` | e.g. مدینہ جنرل اسٹور | مثلاً مدینہ جنرل اسٹور | مثلاً مدینہ جنرل اسٹور |
| `print.showAddress` | Show address | پتا دکھائیں | آدرس را نشان دهید |
| `print.showLogo` | Show logo in the header | ہیڈر میں لوگو دکھائیں | لوگو را در سرخط نشان دهید |
| `print.showPhone` | Show phone | فون دکھائیں | تلیفون را نشان دهید |
| `print.showShopName` | Show shop name | دکان کا نام دکھائیں | نام دکان را نشان دهید |
| `print.showShopNameAlt` | Show the second name line | نام کی دوسری سطر دکھائیں | خط دوم نام را نشان دهید |
| `print.showSignature` | Authorised signature block on bills | بلوں پر مجاز دستخط کا خانہ | بخش امضای مجاز روی بل‌ها |
| `print.showThanks` | Show the thank-you line | شکریے کی سطر دکھائیں | خط تشکر را نشان دهید |
| `print.sub` | How bills and documents look on paper — paper, header, item columns and footer. Until you change anything here, printing stays exactly as it is today. | بل اور دستاویزات کاغذ پر کیسے دکھیں — کاغذ، ہیڈر، اشیا کے کالم اور فوٹر۔ جب تک یہاں کچھ نہ بدلیں، پرنٹنگ بالکل ویسی ہی رہے گی جیسی آج ہے۔ | بل‌ها و اسناد روی کاغذ چگونه معلوم می‌شوند — کاغذ، سرخط، ستون‌های کالا و پانویس. تا وقتی اینجا چیزی را تغییر ندهید، چاپ دقیقاً مانند امروز می‌ماند. |
| `print.termsLabel` | Terms | شرائط | شرایط |
| `print.termsPh` | Your terms, printed small in the footer | آپ کی شرائط، فوٹر میں چھوٹے حروف میں چھپیں گی | شرایط شما، کوچک در پانویس چاپ می‌شود |
| `print.termsText` | Terms & conditions | شرائط و ضوابط | شرایط و ضوابط |
| `print.thanksPh` | Leave empty for the standard line | معیاری سطر کے لیے خالی چھوڑیں | برای خط معیاری خالی بگذارید |
| `print.thanksText` | Custom thank-you line | اپنی شکریے کی سطر | خط تشکر دلخواه |
| `print.title` | Print & branding | پرنٹ اور برانڈنگ | چاپ و برندینگ |
## sales

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `sales.chooseProduct` | — Choose a product — | — پراڈکٹ منتخب کریں — | — یک کالا انتخاب کنید — |
| `sales.decreaseQty` | Decrease quantity | مقدار کم کریں | مقدار را کم کنید |
| `sales.emptyToday` | No sales recorded today yet. | آج ابھی کوئی بکری درج نہیں ہوئی۔ | امروز هنوز هیچ فروشی ثبت نشده است. |
| `sales.errChooseProduct` | Please choose a product first. | براہ کرم پہلے پراڈکٹ منتخب کریں۔ | لطفاً اول یک کالا انتخاب کنید. |
| `sales.errQtyMin` | Quantity must be at least 1. | مقدار کم از کم 1 ہونی چاہیے۔ | مقدار باید حداقل 1 باشد. |
| `sales.errRecordFailed` | Could not record the sale. Please try again. | بکری درج نہیں ہو سکی۔ براہ کرم دوبارہ کوشش کریں۔ | فروش ثبت نشد. لطفاً دوباره تلاش کنید. |
| `sales.errStock` | Not enough stock — only {qty} {unit} of {name} available. | اسٹاک کافی نہیں — {name} کے صرف {qty} {unit} دستیاب ہیں۔ | موجودی کافی نیست — از {name} فقط {qty} {unit} موجود است. |
| `sales.eyebrow` | Counter | کاؤنٹر | پیشخوان |
| `sales.findProduct` | Find product | پراڈکٹ تلاش کریں | کالا را پیدا کنید |
| `sales.increaseQty` | Increase quantity | مقدار بڑھائیں | مقدار را زیاد کنید |
| `sales.newSale` | New sale | نئی بکری | فروش جدید |
| `sales.newSaleAria` | New sale | نئی بکری | فروش جدید |
| `sales.newSaleSub` | Works like the shop counter — quick and simple. | بالکل دکان کے کاؤنٹر کی طرح — تیز اور آسان۔ | مانند پیشخوان دکان کار می‌کند — سریع و ساده. |
| `sales.noResults` | No product matches “{query}”. | “{query}” سے کوئی پراڈکٹ نہیں ملا۔ | هیچ کالایی با “{query}” مطابقت ندارد. |
| `sales.optionLabel` | {name} — {price} ({qty} {unit} in stock) | {name} — {price} (اسٹاک میں {qty} {unit}) | {name} — {price} ({qty} {unit} در موجودی) |
| `sales.product` | Product * | پراڈکٹ * | کالا * |
| `sales.quantity` | Quantity * | مقدار * | مقدار * |
| `sales.recordSale` | Record sale | بکری درج کریں | فروش را ثبت کنید |
| `sales.rowLine` | {qty} × {price} | {qty} × {price} | {qty} × {price} |
| `sales.searchPlaceholder` | Search products — click a result to select… | پراڈکٹ تلاش کریں — نتیجے پر کلک کر کے منتخب کریں… | کالاها را جستجو کنید — برای انتخاب روی یک نتیجه کلیک کنید… |
| `sales.statItems` | Items sold | اشیاء فروخت | کالاهای فروخته‌شده |
| `sales.statProfit` | Profit | منافع | مفاد |
| `sales.statRevenue` | Revenue | آمدنی | درآمد |
| `sales.statTransactions` | Transactions | لین دین | معاملات |
| `sales.stockHint` | {qty} {unit} available · margin {margin}/unit | {qty} {unit} دستیاب · فی {unit} منافع {margin} | {qty} {unit} موجود است · مفاد فی واحد {margin} |
| `sales.subtitle` | Pick a product, enter the quantity — the sale is logged and the stock is decremented instantly. | پراڈکٹ منتخب کریں، مقدار لکھیں — بکری درج ہو جائے گی اور اسٹاک فوراً کم ہو جائے گا۔ | یک کالا را انتخاب کنید، مقدار را بنویسید — فروش ثبت می‌شود و موجودی فوراً کم می‌شود. |
| `sales.successRecorded` | Recorded: {qty} × {name} = {amount}. Stock updated. | درج ہو گئی: {qty} × {name} = {amount}۔ اسٹاک اپ ڈیٹ ہو گیا۔ | ثبت شد: {qty} × {name} = {amount}. موجودی به‌روز شد. |
| `sales.title` | Record a sale | بکری درج کریں | فروش را ثبت کنید |
| `sales.todayAria` | Today's sales | آج کی بکری | فروش امروز |
| `sales.todayCounter` | Today's counter | آج کا کاؤنٹر | پیشخوان امروز |
| `sales.todayList` | Today's sales list | آج کی بکری کی فہرست | فهرست فروش امروز |
| `sales.unknownProduct` | Unknown product | نامعلوم پراڈکٹ | کالای نامعلوم |
## docs

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `challan.convertToBill` | Convert to bill | بل میں تبدیل کریں | به بل تبدیل کنید |
| `challan.deskNote` | Billed at the order's agreed prices where the challan cites one; otherwise at the challan's own prices. | جہاں چالان کسی آرڈر سے منسلک ہو وہاں بل آرڈر کی طے شدہ قیمتوں پر بنے گا؛ ورنہ چالان کی اپنی قیمتوں پر۔ | جایی که چالان یک سفارش را ذکر می‌کند با قیمت‌های توافق‌شده سفارش بل می‌شود؛ در غیر آن با قیمت‌های خود چالان. |
| `challan.dispatch` | Dispatch | روانہ کریں | ارسال کنید |
| `challan.driverName` | Driver name | ڈرائیور کا نام | نام راننده |
| `challan.empty.none` | No delivery challans yet. Create one for a delivery, or convert a sale order. | ابھی کوئی ڈیلیوری چالان نہیں۔ ترسیل کے لیے ایک بنائیں، یا سیل آرڈر تبدیل کریں۔ | هنوز هیچ چالان تحویلی نیست. برای یک تحویل یکی بسازید، یا یک سفارش فروش را تبدیل کنید. |
| `challan.errOrderGone` | The source order can no longer send goods out. | ماخذ آرڈر اب مال نہیں بھیج سکتا۔ | سفارش منبع دیگر کالا ارسال کرده نمی‌تواند. |
| `challan.eyebrow` | Sales documents | فروخت کی دستاویزات | اسناد فروش |
| `challan.form.addTitle` | New delivery challan | نیا ڈیلیوری چالان | چالان تحویل جدید |
| `challan.form.editTitle` | Edit challan draft | چالان ڈرافٹ تبدیل کریں | پیش‌نویس چالان را ویرایش کنید |
| `challan.form.sub` | Saving keeps this a draft. It receives its DC number only when dispatched. | محفوظ کرنے سے یہ ڈرافٹ ہی رہے گا۔ DC نمبر اسے روانگی پر ہی ملے گا۔ | ذخیره کردن این را پیش‌نویس نگه می‌دارد. شماره DC خود را فقط هنگام ارسال می‌گیرد. |
| `challan.new` | New delivery challan | نیا ڈیلیوری چالان | چالان تحویل جدید |
| `challan.notice.cancelled` | Challan cancelled. | چالان منسوخ ہو گیا۔ | چالان لغو شد. |
| `challan.notice.created` | Challan draft saved. | چالان ڈرافٹ محفوظ ہو گیا۔ | پیش‌نویس چالان ذخیره شد. |
| `challan.notice.deleted` | Challan draft deleted. | چالان ڈرافٹ حذف ہو گیا۔ | پیش‌نویس چالان حذف شد. |
| `challan.notice.dispatched` | Challan {number} dispatched. | چالان {number} روانہ ہو گیا۔ | چالان {number} ارسال شد. |
| `challan.notice.draftReady` | Bill draft for {number} is ready at the billing desk — complete the payment there to post it. | {number} کا بل ڈرافٹ بلنگ ڈیسک پر تیار ہے — درج کرنے کے لیے وہاں ادائیگی مکمل کریں۔ | پیش‌نویس بل برای {number} در میز بل آماده است — پرداخت را در آنجا تکمیل کنید تا ثبت شود. |
| `challan.notice.fromOrder` | Challan draft created from {number} — add dispatch details, then dispatch it. | {number} سے چالان ڈرافٹ بن گیا — روانگی کی تفصیلات شامل کر کے اسے روانہ کریں۔ | پیش‌نویس چالان از {number} ساخته شد — جزئیات ارسال را اضافه کنید، بعد آن را ارسال کنید. |
| `challan.notice.updated` | Challan draft updated. | چالان ڈرافٹ اپ ڈیٹ ہو گیا۔ | پیش‌نویس چالان به‌روز شد. |
| `challan.printTitle` | Delivery Challan | ڈیلیوری چالان | چالان تحویل |
| `challan.quantitiesOnly` | Quantities only — this is a delivery note, not a bill. | صرف مقداریں — یہ ترسیلی پرچی ہے، بل نہیں۔ | فقط مقدارها — این یک یادداشت تحویل است، نه یک بل. |
| `challan.receivedBy` | Received by | وصول کنندہ | دریافت‌کننده |
| `challan.sourceOrder` | Sale order | سیل آرڈر | سفارش فروش |
| `challan.standalone` | Standalone delivery | براہِ راست ترسیل | تحویل مستقل |
| `challan.subtitle` | Delivery notes for goods leaving the shop. A challan posts nothing and moves no stock — the bill does that when the delivery is charged. | دکان سے نکلنے والے مال کی ترسیلی پرچیاں۔ چالان کچھ درج نہیں کرتا اور نہ اسٹاک ہلاتا ہے — یہ کام بل کرتا ہے جب ترسیل کا بل بنے۔ | یادداشت‌های تحویل برای کالاهایی که از دکان خارج می‌شوند. یک چالان چیزی ثبت نمی‌کند و موجودی را حرکت نمی‌دهد — بل آن کار را وقتی می‌کند که تحویل چارج شود. |
| `challan.title` | Delivery Challans | ڈیلیوری چالان | چالان‌های تحویل |
| `challan.vehicleNo` | Vehicle no. | گاڑی نمبر | شماره وسیله نقلیه. |
| `doc.action.edit` | Edit | تبدیل کریں | ویرایش |
| `doc.action.print` | Print | پرنٹ | چاپ |
| `doc.action.view` | View | دیکھیں | ببینید |
| `doc.agreedPrices` | Agreed prices from the order apply. | آرڈر کی طے شدہ قیمتیں لاگو ہیں۔ | قیمت‌های توافق‌شده سفارش تطبیق می‌شود. |
| `doc.billedQty` | Billed | بل شدہ | بل شده |
| `doc.cancelConfirmBody` | {label} will be marked cancelled. It never posted anything, so no accounts change. | {label} منسوخ نشان زد ہو جائے گی۔ اس نے کبھی کچھ درج نہیں کیا، اس لیے کوئی کھاتہ نہیں بدلے گا۔ | {label} لغوشده نشانی خواهد شد. آن هرگز چیزی ثبت نکرده است، پس هیچ حسابی تغییر نمی‌کند. |
| `doc.cancelConfirmTitle` | Cancel this document? | یہ دستاویز منسوخ کریں؟ | این سند لغو شود؟ |
| `doc.cancelDoc` | Cancel document | دستاویز منسوخ کریں | سند را لغو کنید |
| `doc.convertedQty` | Converted | تبدیل شدہ | تبدیل شده |
| `doc.convertQtyTitle` | Quantities | مقداریں | مقدارها |
| `doc.customer` | Customer | گاہک | مشتری |
| `doc.customerNamePh` | Customer name | گاہک کا نام | نام مشتری |
| `doc.customerSelect` | Select a customer… | گاہک منتخب کریں… | یک مشتری انتخاب کنید… |
| `doc.date` | Date | تاریخ | تاریخ |
| `doc.deleteConfirmBody` | The draft will be removed. Drafts carry no number and post nothing. | ڈرافٹ حذف ہو جائے گا۔ ڈرافٹ کا کوئی نمبر نہیں ہوتا اور یہ کچھ درج نہیں کرتا۔ | پیش‌نویس حذف خواهد شد. پیش‌نویس‌ها شماره ندارند و چیزی ثبت نمی‌کنند. |
| `doc.deleteConfirmTitle` | Delete this draft? | یہ ڈرافٹ حذف کریں؟ | این پیش‌نویس حذف شود؟ |
| `doc.deleteDraft` | Delete draft | ڈرافٹ حذف کریں | پیش‌نویس را حذف کنید |
| `doc.deliveredQty` | Delivered | ترسیل شدہ | تحویل شده |
| `doc.discount` | Discount | رعایت | تخفیف |
| `doc.discountFlat` | Flat Rs | فلیٹ روپے | ثابت Rs |
| `doc.discountPercent` | Percent % | فیصد % | فیصد % |
| `doc.draftLabel` | Draft | ڈرافٹ | پیش‌نویس |
| `doc.emptyNoMatch` | No documents match your search. | آپ کی تلاش سے کوئی دستاویز نہیں ملی۔ | هیچ سندی با جستجوی شما مطابقت ندارد. |
| `doc.errCancelBlocked` | This document already has fulfilled quantities, so it cannot be cancelled. | اس دستاویز کی کچھ مقداریں پوری ہو چکی ہیں، اس لیے یہ منسوخ نہیں ہو سکتی۔ | این سند قبلاً مقدارهای تکمیل‌شده دارد، پس لغو شده نمی‌تواند. |
| `doc.errConvertState` | This document can no longer be converted. | یہ دستاویز اب تبدیل نہیں ہو سکتی۔ | این سند دیگر تبدیل شده نمی‌تواند. |
| `doc.errNoLines` | Add at least one item first. | پہلے کم از کم ایک آئٹم شامل کریں۔ | اول کم از کم یک کالا اضافه کنید. |
| `doc.errNotEditable` | Only a draft can be edited — an issued document is a promise. Cancel it and issue a new one to change it. | صرف ڈرافٹ میں تبدیلی ہو سکتی ہے — جاری شدہ دستاویز ایک وعدہ ہے۔ تبدیلی کے لیے اسے منسوخ کر کے نئی جاری کریں۔ | فقط یک پیش‌نویس ویرایش شده می‌تواند — سند صادرشده یک تعهد است. برای تغییر آن را لغو کنید و یک سند جدید صادر کنید. |
| `doc.errNothingRemaining` | Nothing remains to convert on this document. | اس دستاویز میں تبدیل کرنے کے لیے کچھ باقی نہیں۔ | چیزی برای تبدیل در این سند باقی نمانده است. |
| `doc.errPriceZero` | Every item needs a price above zero. | ہر آئٹم کی قیمت صفر سے زیادہ ہونی چاہیے۔ | هر کالا به قیمتی بیشتر از صفر نیاز دارد. |
| `doc.errQtyZero` | Every item needs a quantity above zero. | ہر آئٹم کی مقدار صفر سے زیادہ ہونی چاہیے۔ | هر کالا به مقداری بیشتر از صفر نیاز دارد. |
| `doc.estimateNote` | Estimate only — agreed prices and discounts hold; tax is fixed by the bill when the sale is made. | یہ صرف تخمینہ ہے — طے شدہ قیمتیں اور رعایت برقرار رہیں گی؛ ٹیکس فروخت کے وقت بل پر طے ہوتا ہے۔ | فقط تخمین است — قیمت‌ها و تخفیف‌های توافق‌شده برقرار می‌مانند؛ مالیات هنگام فروش توسط بل تعیین می‌شود. |
| `doc.estTax` | Estimated tax | تخمینی ٹیکس | مالیات تخمینی |
| `doc.fromChallan` | From delivery challan {number} | ڈیلیوری چالان {number} سے | از چالان تحویل {number} |
| `doc.fromOrder` | From sale order {number} | سیل آرڈر {number} سے | از سفارش فروش {number} |
| `doc.fromQuotation` | From quotation {number} | کوٹیشن {number} سے | از پیشنهاد قیمت {number} |
| `doc.fromQuotationDraft` | From a quotation | ایک کوٹیشن سے | از یک پیشنهاد قیمت |
| `doc.fulfilment` | Fulfilment | تکمیل | تکمیل |
| `doc.keep` | Keep it | رہنے دیں | نگه دارید |
| `doc.lines.add` | Add item | آئٹم شامل کریں | کالا اضافه کنید |
| `doc.lines.amount` | Amount | رقم | مبلغ |
| `doc.lines.cost` | Cost | لاگت | هزینه |
| `doc.lines.noResults` | No product matches “{query}”. | “{query}” سے کوئی آئٹم نہیں ملا۔ | هیچ کالایی با “{query}” مطابقت ندارد. |
| `doc.lines.price` | Price | قیمت | قیمت |
| `doc.lines.product` | Product | آئٹم | کالا |
| `doc.lines.qty` | Qty | مقدار | مقدار |
| `doc.lines.removeAria` | Remove {name} | {name} ہٹائیں | {name} را حذف کنید |
| `doc.lines.searchPh` | Search products — click or Enter to add… | آئٹم تلاش کریں — کلک یا Enter سے شامل کریں… | کالاها را جستجو کنید — برای اضافه کردن کلیک کنید یا Enter بزنید… |
| `doc.lines.stock` | {qty} {unit} in stock | اسٹاک میں {qty} {unit} | {qty} {unit} در موجودی |
| `doc.note` | Note | نوٹ | یادداشت |
| `doc.notePh` | Terms, delivery notes… | شرائط، ترسیل کے نوٹس… | شرایط، یادداشت‌های تحویل… |
| `doc.number` | Number | نمبر | شماره |
| `doc.receivedQty` | Received | وصول شدہ | دریافت شده |
| `doc.remainingQty` | Remaining | باقی | باقیمانده |
| `doc.searchPh` | Search number, customer or phone… | نمبر، گاہک یا فون تلاش کریں… | شماره، مشتری یا تلیفون را جستجو کنید… |
| `doc.sourceLabel` | Source | ماخذ | منبع |
| `doc.status.accepted` | Accepted | منظور شدہ | پذیرفته شده |
| `doc.status.billed` | Billed | بل شدہ | بل شده |
| `doc.status.cancelled` | Cancelled | منسوخ | لغو شده |
| `doc.status.converted` | Converted | تبدیل شدہ | تبدیل شده |
| `doc.status.dispatched` | Dispatched | روانہ شدہ | ارسال شده |
| `doc.status.draft` | Draft | ڈرافٹ | پیش‌نویس |
| `doc.status.expired` | Expired | میعاد ختم | منقضی شده |
| `doc.status.fulfilled` | Fulfilled | مکمل | تکمیل شده |
| `doc.status.issued` | Issued | جاری شدہ | صادر شده |
| `doc.status.open` | Open | کھلا | باز |
| `doc.status.partially_billed` | Partially billed | جزوی بل شدہ | قسماً بل شده |
| `doc.status.partially_fulfilled` | Partially billed | جزوی بل شدہ | قسماً بل شده |
| `doc.status.partially_received` | Partially received | جزوی وصول شدہ | قسماً دریافت شده |
| `doc.status.posted` | Posted | درج شدہ | ثبت شده |
| `doc.status.received` | Received | وصول شدہ | دریافت شده |
| `doc.status.rejected` | Rejected | مسترد شدہ | رد شده |
| `doc.subtotal` | Subtotal | ذیلی کل | مجموع فرعی |
| `doc.supplier` | Supplier | سپلائر | تأمین‌کننده |
| `doc.supplierSelect` | Select a supplier… | سپلائر منتخب کریں… | یک تأمین‌کننده انتخاب کنید… |
| `doc.th.actions` | Actions | ایکشن | اقدامات |
| `doc.th.customer` | Customer | گاہک | مشتری |
| `doc.th.date` | Date | تاریخ | تاریخ |
| `doc.th.number` | Number | نمبر | شماره |
| `doc.th.status` | Status | حالت | وضعیت |
| `doc.th.supplier` | Supplier | سپلائر | تأمین‌کننده |
| `doc.th.total` | Total | کل | مجموع |
| `doc.total` | Total | کل | مجموع |
| `doc.validityExpired` | Validity has passed | میعاد گزر چکی ہے | مدت اعتبار گذشته است |
| `doc.walkIn` | Walk-in customer | عام گاہک | مشتری گذری |
| `nav.deliveryChallans` | Delivery Challans | ڈیلیوری چالان | چالان‌های تحویل |
| `nav.notes` | Notes | نوٹس | یادداشت‌ها |
| `nav.purchaseOrders` | Purchase Orders | پرچیز آرڈرز | سفارش‌های خرید |
| `nav.quotations` | Quotations | کوٹیشنز | پیشنهادهای قیمت |
| `nav.saleOrders` | Sale Orders | سیل آرڈرز | سفارش‌های فروش |
| `order.confirm` | Confirm order | آرڈر کی تصدیق کریں | سفارش را تأیید کنید |
| `order.convertToBill` | Convert to bill | بل میں تبدیل کریں | به بل تبدیل کنید |
| `order.convertToChallan` | Create delivery challan | ڈیلیوری چالان بنائیں | چالان تحویل بسازید |
| `order.empty.none` | No sale orders yet. Create one directly, or convert an accepted quotation. | ابھی کوئی سیل آرڈر نہیں۔ براہِ راست بنائیں، یا منظور شدہ کوٹیشن تبدیل کریں۔ | هنوز هیچ سفارش فروشی نیست. مستقیماً یکی بسازید، یا یک پیشنهاد قیمت پذیرفته‌شده را تبدیل کنید. |
| `order.expectedDate` | Expected delivery | متوقع ترسیل | تحویل مورد انتظار |
| `order.eyebrow` | Sales documents | فروخت کی دستاویزات | اسناد فروش |
| `order.form.addTitle` | New sale order | نیا سیل آرڈر | سفارش فروش جدید |
| `order.form.editTitle` | Edit sale order draft | سیل آرڈر ڈرافٹ تبدیل کریں | پیش‌نویس سفارش فروش را ویرایش کنید |
| `order.form.sub` | Saving keeps this a draft. It receives its SO number only when confirmed. | محفوظ کرنے سے یہ ڈرافٹ ہی رہے گا۔ SO نمبر اسے تصدیق ہونے پر ہی ملے گا۔ | ذخیره کردن این را پیش‌نویس نگه می‌دارد. شماره SO خود را فقط هنگام تأیید می‌گیرد. |
| `order.new` | New sale order | نیا سیل آرڈر | سفارش فروش جدید |
| `order.notice.cancelled` | Sale order cancelled. | سیل آرڈر منسوخ ہو گیا۔ | سفارش فروش لغو شد. |
| `order.notice.confirmed` | Sale order {number} confirmed. | سیل آرڈر {number} کی تصدیق ہو گئی۔ | سفارش فروش {number} تأیید شد. |
| `order.notice.created` | Sale order draft saved. | سیل آرڈر ڈرافٹ محفوظ ہو گیا۔ | پیش‌نویس سفارش فروش ذخیره شد. |
| `order.notice.deleted` | Sale order draft deleted. | سیل آرڈر ڈرافٹ حذف ہو گیا۔ | پیش‌نویس سفارش فروش حذف شد. |
| `order.notice.draftReady` | Bill draft for {number} is ready at the billing desk — complete the payment there to post it. | {number} کا بل ڈرافٹ بلنگ ڈیسک پر تیار ہے — درج کرنے کے لیے وہاں ادائیگی مکمل کریں۔ | پیش‌نویس بل برای {number} در میز بل آماده است — پرداخت را در آنجا تکمیل کنید تا ثبت شود. |
| `order.notice.updated` | Sale order draft updated. | سیل آرڈر ڈرافٹ اپ ڈیٹ ہو گیا۔ | پیش‌نویس سفارش فروش به‌روز شد. |
| `order.printTitle` | Sale Order | سیل آرڈر | سفارش فروش |
| `order.subtitle` | Confirmed orders at agreed prices. An order posts nothing itself — converting it prepares a bill at the billing desk. | طے شدہ قیمتوں پر تصدیق شدہ آرڈرز۔ آرڈر خود کچھ درج نہیں کرتا — اس کی تبدیلی بلنگ ڈیسک پر بل تیار کرتی ہے۔ | سفارش‌های تأییدشده با قیمت‌های توافق‌شده. یک سفارش خودش چیزی ثبت نمی‌کند — تبدیل آن یک بل را در میز بل آماده می‌کند. |
| `order.title` | Sale Orders | سیل آرڈرز | سفارش‌های فروش |
| `po.agreedCost` | Agreed cost | طے شدہ لاگت | هزینه توافق‌شده |
| `po.empty.none` | No purchase orders yet. Create one to order stock from a supplier. | ابھی کوئی پرچیز آرڈر نہیں۔ سپلائر سے اسٹاک منگوانے کے لیے ایک بنائیں۔ | هنوز هیچ سفارش خریدی نیست. برای سفارش موجودی از یک تأمین‌کننده یکی بسازید. |
| `po.errOverReceipt` | A quantity exceeds what is still outstanding on this order — receiving more than was ordered is refused. | ایک مقدار اس آرڈر پر باقی ماندہ مقدار سے زیادہ ہے — آرڈر سے زیادہ وصولی قبول نہیں ہوتی۔ | یک مقدار از آنچه هنوز در این سفارش باقیمانده است بیشتر است — دریافت بیشتر از سفارش رد می‌شود. |
| `po.errReceive` | These goods could not be received against this order. | یہ مال اس آرڈر کے تحت وصول نہیں ہو سکا۔ | این کالاها در برابر این سفارش دریافت شده نتوانستند. |
| `po.eyebrow` | Purchase documents | خرید کی دستاویزات | اسناد خرید |
| `po.form.addTitle` | New purchase order | نیا پرچیز آرڈر | سفارش خرید جدید |
| `po.form.editTitle` | Edit purchase order draft | پرچیز آرڈر ڈرافٹ تبدیل کریں | پیش‌نویس سفارش خرید را ویرایش کنید |
| `po.form.sub` | Saving keeps this a draft. It receives its PO number only when issued. | محفوظ کرنے سے یہ ڈرافٹ ہی رہے گا۔ PO نمبر اسے جاری ہونے پر ہی ملے گا۔ | ذخیره کردن این را پیش‌نویس نگه می‌دارد. شماره PO خود را فقط هنگام صدور می‌گیرد. |
| `po.issue` | Issue | جاری کریں | صادر کنید |
| `po.new` | New purchase order | نیا پرچیز آرڈر | سفارش خرید جدید |
| `po.notice.cancelled` | Purchase order cancelled. | پرچیز آرڈر منسوخ ہو گیا۔ | سفارش خرید لغو شد. |
| `po.notice.created` | Purchase order draft saved. | پرچیز آرڈر ڈرافٹ محفوظ ہو گیا۔ | پیش‌نویس سفارش خرید ذخیره شد. |
| `po.notice.deleted` | Purchase order draft deleted. | پرچیز آرڈر ڈرافٹ حذف ہو گیا۔ | پیش‌نویس سفارش خرید حذف شد. |
| `po.notice.issued` | Purchase order {number} issued. | پرچیز آرڈر {number} جاری ہو گیا۔ | سفارش خرید {number} صادر شد. |
| `po.notice.received` | Goods received against {number} — the purchase is recorded in the supplier's book. | {number} کے تحت مال وصول ہو گیا — خریداری سپلائر کی کتاب میں درج ہے۔ | کالا در برابر {number} دریافت شد — خرید در کتاب تأمین‌کننده ثبت است. |
| `po.notice.updated` | Purchase order draft updated. | پرچیز آرڈر ڈرافٹ اپ ڈیٹ ہو گیا۔ | پیش‌نویس سفارش خرید به‌روز شد. |
| `po.printNote` | Order at agreed costs — tax is fixed when the goods are received. | طے شدہ لاگت پر آرڈر — ٹیکس مال کی وصولی پر طے ہوتا ہے۔ | سفارش با هزینه‌های توافق‌شده — مالیات وقتی تعیین می‌شود که کالا دریافت شود. |
| `po.printTitle` | Purchase Order | پرچیز آرڈر | سفارش خرید |
| `po.receive` | Receive goods | مال وصول کریں | کالا را دریافت کنید |
| `po.receiveSub` | Quantities start at what is still outstanding, at the order's agreed costs — correct a cost to the supplier's actual invoice where it differs. Receiving posts the goods through the ordinary purchase book; the purchase cites this order. | مقداریں باقی ماندہ مقدار سے شروع ہوتی ہیں، آرڈر کی طے شدہ لاگت پر — جہاں سپلائر کی اصل انوائس مختلف ہو وہاں لاگت درست کر لیں۔ وصولی مال کو معمول کی خریداری کتاب سے درج کرتی ہے؛ خریداری اس آرڈر کا حوالہ رکھتی ہے۔ | مقدارها از آنچه هنوز باقیمانده است شروع می‌شوند، با هزینه‌های توافق‌شده سفارش — جایی که متفاوت است هزینه را به صورتحساب واقعی تأمین‌کننده اصلاح کنید. دریافت کردن کالا را از طریق کتاب خرید عادی ثبت می‌کند؛ خرید این سفارش را ذکر می‌کند. |
| `po.receiveTitle` | Receive against this order | اس آرڈر کے تحت وصولی | در برابر این سفارش دریافت کنید |
| `po.subtitle` | Orders placed with suppliers at agreed costs. A purchase order posts nothing — stock and the supplier's payable move only when goods are received against it. | طے شدہ لاگت پر سپلائرز کو دیے گئے آرڈرز۔ پرچیز آرڈر کچھ درج نہیں کرتا — اسٹاک اور سپلائر کا بقایا صرف اس وقت ہلتا ہے جب اس کے تحت مال وصول ہو۔ | سفارش‌هایی که با هزینه‌های توافق‌شده به تأمین‌کنندگان داده شده‌اند. یک سفارش خرید چیزی ثبت نمی‌کند — موجودی و مبلغ قابل پرداخت تأمین‌کننده فقط وقتی حرکت می‌کند که کالا در برابر آن دریافت شود. |
| `po.title` | Purchase Orders | پرچیز آرڈرز | سفارش‌های خرید |
| `quote.accept` | Mark accepted | منظور نشان زد کریں | پذیرفته‌شده نشانی کنید |
| `quote.convertToBill` | Convert to bill | بل میں تبدیل کریں | به بل تبدیل کنید |
| `quote.convertToOrder` | Convert to sale order | سیل آرڈر میں تبدیل کریں | به سفارش فروش تبدیل کنید |
| `quote.empty.none` | No quotations yet. Create one to quote a customer a price before selling. | ابھی کوئی کوٹیشن نہیں۔ فروخت سے پہلے گاہک کو قیمت دینے کے لیے ایک بنائیں۔ | هنوز هیچ پیشنهاد قیمتی نیست. برای دادن قیمت به مشتری قبل از فروش یکی بسازید. |
| `quote.eyebrow` | Sales documents | فروخت کی دستاویزات | اسناد فروش |
| `quote.form.addTitle` | New quotation | نئی کوٹیشن | پیشنهاد قیمت جدید |
| `quote.form.editTitle` | Edit quotation draft | کوٹیشن ڈرافٹ تبدیل کریں | پیش‌نویس پیشنهاد قیمت را ویرایش کنید |
| `quote.form.sub` | Saving keeps this a draft. It receives its QT number only when issued. | محفوظ کرنے سے یہ ڈرافٹ ہی رہے گی۔ QT نمبر اسے جاری ہونے پر ہی ملے گا۔ | ذخیره کردن این را پیش‌نویس نگه می‌دارد. شماره QT خود را فقط هنگام صدور می‌گیرد. |
| `quote.issue` | Issue | جاری کریں | صادر کنید |
| `quote.new` | New quotation | نئی کوٹیشن | پیشنهاد قیمت جدید |
| `quote.notice.accepted` | Quotation {number} marked accepted. | کوٹیشن {number} منظور نشان زد ہو گئی۔ | پیشنهاد قیمت {number} پذیرفته‌شده نشانی شد. |
| `quote.notice.cancelled` | Quotation cancelled. | کوٹیشن منسوخ ہو گئی۔ | پیشنهاد قیمت لغو شد. |
| `quote.notice.converted` | Sale order draft created from {number}. | {number} سے سیل آرڈر ڈرافٹ بن گیا۔ | پیش‌نویس سفارش فروش از {number} ساخته شد. |
| `quote.notice.created` | Quotation draft saved. | کوٹیشن ڈرافٹ محفوظ ہو گئی۔ | پیش‌نویس پیشنهاد قیمت ذخیره شد. |
| `quote.notice.deleted` | Quotation draft deleted. | کوٹیشن ڈرافٹ حذف ہو گئی۔ | پیش‌نویس پیشنهاد قیمت حذف شد. |
| `quote.notice.draftReadyBill` | Bill draft for {number} is ready at the billing desk — complete the payment there to post it. | {number} کا بل ڈرافٹ بلنگ ڈیسک پر تیار ہے — درج کرنے کے لیے وہاں ادائیگی مکمل کریں۔ | پیش‌نویس بل برای {number} در میز بل آماده است — پرداخت را در آنجا تکمیل کنید تا ثبت شود. |
| `quote.notice.issued` | Quotation {number} issued. | کوٹیشن {number} جاری ہو گئی۔ | پیشنهاد قیمت {number} صادر شد. |
| `quote.notice.rejected` | Quotation {number} marked rejected. | کوٹیشن {number} مسترد نشان زد ہو گئی۔ | پیشنهاد قیمت {number} ردشده نشانی شد. |
| `quote.notice.updated` | Quotation draft updated. | کوٹیشن ڈرافٹ اپ ڈیٹ ہو گئی۔ | پیش‌نویس پیشنهاد قیمت به‌روز شد. |
| `quote.printTitle` | Quotation · Estimate | کوٹیشن · تخمینہ | پیشنهاد قیمت · تخمین |
| `quote.reject` | Mark rejected | مسترد نشان زد کریں | ردشده نشانی کنید |
| `quote.subtitle` | Priced promises to customers. A quotation posts nothing — no stock, no udhaar, no journal — until it converts. | گاہکوں کو دی گئی قیمتوں کے وعدے۔ کوٹیشن کچھ درج نہیں کرتی — نہ اسٹاک، نہ ادھار، نہ جرنل — جب تک تبدیل نہ ہو جائے۔ | تعهدهای قیمت به مشتریان. یک پیشنهاد قیمت چیزی ثبت نمی‌کند — نه موجودی، نه قرض، نه ژورنال — تا وقتی تبدیل شود. |
| `quote.title` | Quotations | کوٹیشنز | پیشنهادهای قیمت |
| `quote.validUntil` | Valid until | تک مؤثر | معتبر تا |
| `quote.wa.estTax` | Estimated tax: {amount} | تخمینی ٹیکس: {amount} | مالیات تخمینی: {amount} |
| `quote.wa.title` | Quotation {number} — {date} | کوٹیشن {number} — {date} | پیشنهاد قیمت {number} — {date} |
| `quote.wa.validUntil` | Valid until: {date} | تک مؤثر: {date} | معتبر تا: {date} |
| `settings.docSeriesSaved` | Numbering prefixes saved. | نمبرنگ کے سابقے محفوظ ہو گئے۔ | پیشوندهای شماره‌گذاری ذخیره شد. |
| `settings.docSeriesSub` | The prefix each document series is numbered with. A change applies to documents numbered from now on; numbers already issued never change. | ہر دستاویزی سلسلے کے نمبر کا سابقہ (prefix)۔ تبدیلی آج کے بعد نمبر پانے والی دستاویزات پر لاگو ہوگی؛ پہلے جاری شدہ نمبر کبھی نہیں بدلتے۔ | پیشوندی که هر سلسله اسناد با آن شماره‌گذاری می‌شود. یک تغییر بر اسنادی که از حالا شماره‌گذاری می‌شوند تطبیق می‌شود؛ شماره‌هایی که قبلاً صادر شده‌اند هرگز تغییر نمی‌کنند. |
| `settings.docSeriesTitle` | Document numbering | دستاویزات کی نمبرنگ | شماره‌گذاری اسناد |
| `settings.series.challan` | Delivery challans | ڈیلیوری چالان | چالان‌های تحویل |
| `settings.series.creditNote` | Credit notes | کریڈٹ نوٹس | یادداشت‌های کریدت |
| `settings.series.debitNote` | Debit notes | ڈیبٹ نوٹس | یادداشت‌های دبت |
| `settings.series.job` | Jobs | جابز | کارها |
| `settings.series.loan` | Loans | قرضے | قرض‌ها |
| `settings.series.paymentVoucher` | Payment vouchers | ادائیگی واؤچرز | سندهای پرداخت |
| `settings.series.payrollRun` | Payroll runs | تنخواہ رنز | اجرای معاشات |
| `settings.series.productionOrder` | Production orders | پروڈکشن آرڈرز | سفارش‌های تولید |
| `settings.series.purchaseOrder` | Purchase orders | پرچیز آرڈرز | سفارش‌های خرید |
| `settings.series.quotation` | Quotations | کوٹیشنز | پیشنهادهای قیمت |
| `settings.series.receiptVoucher` | Receipt vouchers | وصولی واؤچرز | سندهای دریافت |
| `settings.series.saleOrder` | Sale orders | سیل آرڈرز | سفارش‌های فروش |
| `settings.series.stockTransfer` | Stock transfers | اسٹاک منتقلیاں | انتقال‌های موجودی |
| `voucher.balanceAfterCustomer` | Outstanding balance now | موجودہ بقایا بیلنس | مانده باقیمانده اکنون |
| `voucher.balanceAfterSupplier` | Payable balance now | موجودہ واجب الادا بیلنس | مانده قابل پرداخت اکنون |
| `voucher.paymentTitle` | Payment Voucher | ادائیگی واؤچر | سند پرداخت |
| `voucher.receiptTitle` | Receipt Voucher | رسید واؤچر | سند دریافت |
| `voucher.signature` | Signature | دستخط | امضا |
## dc

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `dc.alreadyClosed.text` | Today ({date}) was already closed. Saving again will add another close record for today. | آج ({date}) پہلے ہی بند ہو چکا ہے۔ دوبارہ محفوظ کرنے سے آج کا ایک اور بندش ریکارڈ شامل ہو جائے گا۔ | امروز ({date}) قبلاً بسته شده بود. ذخیره دوباره یك سابقه بستن دیگر برای امروز اضافه می‌كند. |
| `dc.alreadyClosed.title` | Day already closed | دن پہلے ہی بند ہو چکا ہے | روز قبلاً بسته شده است |
| `dc.backlog` | Un-closed earlier days: {days} day(s) moved {amount} at the till — already inside today's opening balance; this close records today only. | پچھلے غیر بند دن: {days} دنوں میں کاؤنٹر پر {amount} کی آمد و رفت — یہ رقم آج کی ابتدائی بیلنس میں پہلے سے شامل ہے؛ یہ بندش صرف آج کی ریکارڈ کرتی ہے۔ | روزهای قبلیِ بسته‌نشده: {days} روز، {amount} در پیشخوان جابه‌جا شده است — این مبلغ هم‌اکنون در موجودی آغازین امروز قرار دارد؛ این بستن فقط امروز را ثبت می‌کند. |
| `dc.close.caption` | Opening defaults to the last close's counted cash, or the current cash balance when there is no earlier close. | ابتدائی نقدی پچھلی بندش کی گنی ہوئی نقدی ہوتی ہے، اور اگر پہلے کوئی بندش نہ ہو تو موجودہ نقد بیلنس۔ | افتتاح به طور پیش‌فرض نقد شمارش‌شده آخرین بستن است، یا مانده نقد فعلی وقتی بستن قبلی نباشد. |
| `dc.close.title` | Close today | آج کا دن بند کریں | بستن امروز |
| `dc.closedDiff` | Day closed — difference of {amount} recorded. | دن بند ہو گیا — {amount} کا فرق درج کر لیا گیا ہے۔ | روز بسته شد — تفاوت {amount} ثبت شد. |
| `dc.closedExact` | Day closed — counted cash matches the expected cash exactly. | دن بند ہو گیا — گنی ہوئی نقدی متوقع نقدی سے بالکل ملتی ہے۔ | روز بسته شد — نقد شمارش‌شده دقیقاً با نقد مورد انتظار مطابقت دارد. |
| `dc.counted.label` | Counted cash (PKR) * | گنی ہوئی نقدی (روپے) * | نقد شمارش شده (PKR) * |
| `dc.counted.placeholder` | Count the till and type it here | گلّہ گن کر یہاں لکھیں | دراز را بشمارید و اینجا بنویسید |
| `dc.countedError` | Please enter the counted cash from the till. | براہ کرم گلّے کی گنی ہوئی نقدی درج کریں۔ | لطفاً نقد شمارش‌شده از دراز را وارد كنید. |
| `dc.crossCheck` | Counter summary (cross-check) | کاؤنٹر خلاصہ (تصدیقی جائزہ) | خلاصه پیشخوان (بررسی متقابل) |
| `dc.diff.label` | Difference (counted − expected) | فرق (گنی ہوئی − متوقع) | تفاوت (شمارش شده − مورد انتظار) |
| `dc.diff.match` | Exact match | بالکل درست | مطابقت دقیق |
| `dc.diff.over` | Over by {amount} | {amount} زیادہ | {amount} بیشتر |
| `dc.diff.short` | Short by {amount} | {amount} کم | {amount} كمتر |
| `dc.expected` | Expected cash: {amount} | متوقع نقدی: {amount} | نقد مورد انتظار: {amount} |
| `dc.expectedJournal` | Expected per journal — {account}: {amount} | جرنل کے مطابق متوقع — {account}: {amount} | مورد انتظار بر اساس ژورنال — {account}: {amount} |
| `dc.eyebrow` | End of day | دن کا اختتام | پایان روز |
| `dc.history.counted` | Counted | گنی ہوئی | شمارش شده |
| `dc.history.date` | Date | تاریخ | تاریخ |
| `dc.history.difference` | Difference | فرق | تفاوت |
| `dc.history.empty` | No day closes saved yet. | ابھی تک کوئی دن بندش محفوظ نہیں۔ | هنوز بستن روزی ذخیره نشده است. |
| `dc.history.expected` | Expected | متوقع | مورد انتظار |
| `dc.history.note` | Note | نوٹ | یادداشت |
| `dc.history.opening` | Opening | ابتدائی | افتتاحی |
| `dc.history.title` | History | تاریخچہ | تاریخچه |
| `dc.journalNote` | The saved expected cash is the journal figure for {account}; the counter summary above stays as a cross-check. | محفوظ شدہ متوقع نقدی {account} کے جرنل سے آتی ہے؛ اوپر والا کاؤنٹر خلاصہ تصدیقی جائزے کے طور پر رہتا ہے۔ | نقد مورد انتظار ذخیره‌شده رقم ژورنال برای {account} است؛ خلاصه پیشخوان در بالا به عنوان بررسی متقابل می‌ماند. |
| `dc.note.label` | Note | نوٹ | یادداشت |
| `dc.note.placeholder` | e.g. Short by change given at closing | مثلاً بندش پر ریزگاری دینے سے کمی ہوئی | مثلاً كمبود به دلیل پول خرد داده شده هنگام بستن |
| `dc.opening.hint` | Cash in the till at the start of the day. | دن کے آغاز پر گلّے میں موجود نقدی۔ | نقد در دراز در شروع روز. |
| `dc.opening.label` | Opening cash (PKR) | ابتدائی نقدی (روپے) | نقد افتتاحی (PKR) |
| `dc.save` | Save day close | دن بند کر کے محفوظ کریں | ذخیره بستن روز |
| `dc.stat.counted` | Counted cash | گنی ہوئی نقدی | نقد شمارش شده |
| `dc.stat.difference` | Difference | فرق | تفاوت |
| `dc.stat.expected` | Expected cash | متوقع نقدی | نقد مورد انتظار |
| `dc.stat.opening` | Opening cash | ابتدائی نقدی | نقد افتتاحی |
| `dc.subtitle` | Count the cash in the till, compare it with what the books expect, and lock the day in. | گلّے کی نقدی گنیں، کھاتوں کی متوقع رقم سے ملائیں، اور دن بند کر دیں۔ | نقد دراز را بشمارید، آن را با آنچه كتاب‌ها انتظار دارند مقایسه كنید و روز را قفل كنید. |
| `dc.title` | Day Close | دن کی بندش | بستن روز |
| `dc.totals.cashIn` | Cash in today | آج کی نقد آمد | نقد ورودی امروز |
| `dc.totals.cashOut` | Cash out today | آج کا نقد اخراج | نقد خروجی امروز |
| `dc.totals.creditGiven` | Udhaar given today | آج دیا گیا ادھار | قرض داده شده امروز |
| `dc.totals.creditReceived` | Udhaar received today | آج وصول شدہ ادھار | قرض دریافت شده امروز |
| `dc.totals.expenses` | Expenses today | آج کے اخراجات | مصارف امروز |
| `dc.totals.refunds` | Refunds (cash) | رقم واپسیاں (نقد) | بازپرداخت‌ها (نقد) |
| `dc.totals.salesByMethod` | Sales by method | طریقے کے مطابق فروخت | فروش بر اساس طریقه |
| `dc.totals.supplierPaid` | Supplier payments (cash) | سپلائر ادائیگیاں (نقد) | پرداخت‌های تأمین‌كننده (نقد) |
| `dc.totals.title` | Today's auto totals | آج کے خودکار مجموعے | مجموع‌های خودكار امروز |
| `dc.totals.totalSales` | Total sales | کل فروخت | مجموع فروش |
## chq

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `chq.action.bounce` | Bounce | باؤنس | برگشت بزنید |
| `chq.action.clear` | Mark cleared | کلیئر قرار دیں | تصفیه شده علامت بزنید |
| `chq.action.deposit` | Deposit | بینک جمع کریں | به بانك بسپارید |
| `chq.action.return` | Return to customer | گاہک کو واپس کریں | به مشتری برگردانید |
| `chq.bounce.charges` | Bank charges (optional) | بینک چارجز (اختیاری) | مصارف بانكی (اختیاری) |
| `chq.bounce.hintIn` | The amount becomes owed by the customer again — it re-opens on their udhaar, against the original bill where there is one. | رقم دوبارہ گاہک کے ذمے واجب الادا ہو جائے گی — اس کے کھاتے میں، اور جہاں اصل بل ہو وہاں اسی بل کے مد میں۔ | مبلغ دوباره بر ذمه مشتری می‌شود — در قرض او دوباره باز می‌شود، در برابر بل اصلی در جایی كه باشد. |
| `chq.bounce.hintOut` | The amount becomes owed to the supplier again. | رقم دوبارہ سپلائر کو واجب الادا ہو جائے گی۔ | مبلغ دوباره بر ذمه تأمین‌كننده می‌شود. |
| `chq.bounce.title` | Cheque bounced | چیک باؤنس | چك برگشت خورد |
| `chq.clear.hintIn` | The bank has paid — the amount lands in the deposit account now. | بینک نے ادائیگی کر دی ہے — رقم اب جمع والے اکاؤنٹ میں آ جائے گی۔ | بانك پرداخت كرده است — مبلغ حالا به حساب سپرده می‌رسد. |
| `chq.clear.hintOut` | The bank has paid — the amount leaves the drawn-on account now. | بینک نے ادائیگی کر دی ہے — رقم اب جاری کردہ اکاؤنٹ سے نکل جائے گی۔ | بانك پرداخت كرده است — مبلغ حالا از حساب برداشت‌شده خارج می‌شود. |
| `chq.clear.title` | Mark cheque cleared | چیک کلیئر قرار دیں | علامت زدن چك به عنوان تصفیه شده |
| `chq.col.actions` | Actions | اقدامات | اقدامات |
| `chq.col.amount` | Amount | رقم | مبلغ |
| `chq.col.cheque` | Cheque | چیک | چك |
| `chq.col.dates` | Dates | تاریخیں | تاریخ‌ها |
| `chq.col.party` | Party | فریق | طرف |
| `chq.col.source` | Against | مد | در برابر |
| `chq.col.status` | Status | حالت | حالت |
| `chq.deposit.account` | Deposit into account | جمع کروانے کا اکاؤنٹ | سپردن به حساب |
| `chq.deposit.hint` | Depositing is a custody move only — no money moves yet. The amount lands in the chosen account when the cheque clears. | جمع کروانا صرف حفاظت کی تبدیلی ہے — ابھی کوئی رقم حرکت نہیں کرتی۔ رقم کلیئرنگ پر منتخب اکاؤنٹ میں آئے گی۔ | سپردن فقط یك حركت نگهداری است — هنوز پولی حركت نمی‌كند. مبلغ وقتی چك تصفیه شود به حساب انتخاب‌شده می‌رسد. |
| `chq.deposit.title` | Deposit cheque | چیک بینک میں جمع کریں | سپردن چك به بانك |
| `chq.dir.in` | Received | موصولہ | دریافت شده |
| `chq.dir.out` | Issued | جاری کردہ | صادر شده |
| `chq.dueOn` | Due {date} | تاریخ ادائیگی {date} | سررسید {date} |
| `chq.empty` | No cheques yet. Choose Cheque in a bill, an udhaar repayment, a supplier payment or an expense and it will appear here. | ابھی کوئی چیک نہیں۔ بل، ادھار واپسی، سپلائر ادائیگی یا خرچ میں چیک منتخب کریں تو وہ یہاں آئے گا۔ | هنوز چكی نیست. در یك بل، بازپرداخت قرض، پرداخت به تأمین‌كننده یا یك مصرف، چك را انتخاب كنید تا اینجا ظاهر شود. |
| `chq.emptyFilter` | No cheques in this view. | اس منظر میں کوئی چیک نہیں۔ | در این نما چكی نیست. |
| `chq.err.capture` | Enter the cheque number, bank and both dates first. | پہلے چیک نمبر، بینک اور دونوں تاریخیں درج کریں۔ | اول شماره چك، بانك و هر دو تاریخ را وارد كنید. |
| `chq.field.bank` | Bank | بینک | بانك |
| `chq.field.charges` | Bank charges | بینک چارجز | مصارف بانكی |
| `chq.field.dueDate` | Due date (PDC) | تاریخ ادائیگی (PDC) | تاریخ سررسید (PDC) |
| `chq.field.issueDate` | Cheque date | چیک کی تاریخ | تاریخ چك |
| `chq.field.no` | Cheque no. | چیک نمبر | شماره چك |
| `chq.notice.bounced` | Cheque bounce recorded. | چیک باؤنس ریکارڈ ہو گیا۔ | برگشت چك ثبت شد. |
| `chq.notice.cleared` | Cheque marked cleared. | چیک کلیئر قرار دے دیا گیا۔ | چك تصفیه شده علامت خورد. |
| `chq.notice.deposited` | Cheque deposited at the bank. | چیک بینک میں جمع کر دیا گیا۔ | چك به بانك سپرده شد. |
| `chq.notice.failed` | That action could not be completed. | یہ عمل مکمل نہیں ہو سکا۔ | آن اقدام تكمیل نشد. |
| `chq.notice.returned` | Cheque returned to the customer. | چیک گاہک کو واپس کر دیا گیا۔ | چك به مشتری برگردانده شد. |
| `chq.overdue` | Overdue | میعاد گزر گئی | سررسید گذشته |
| `chq.payOption` | Cheque | چیک | چك |
| `chq.return.hint` | The cheque is handed back undeposited — the amount becomes owed by the customer again. Take the replacement as an ordinary repayment afterwards. | چیک بینک جمع ہوئے بغیر واپس کر دیا گیا — رقم دوبارہ گاہک کے ذمے واجب الادا ہو جائے گی۔ متبادل رقم بعد میں معمول کی واپسی کے طور پر لیں۔ | چك بدون سپردن به بانك پس داده می‌شود — مبلغ دوباره بر ذمه مشتری می‌شود. جایگزین را بعداً به عنوان یك بازپرداخت معمولی بگیرید. |
| `chq.return.title` | Return cheque to customer | چیک گاہک کو واپس کریں | برگرداندن چك به مشتری |
| `chq.searchPh` | Search cheque number, bank or party… | چیک نمبر، بینک یا فریق تلاش کریں… | شماره چك، بانك یا طرف را جستجو كنید… |
| `chq.src.bill` | Bill #{no} | بل نمبر {no} | بل #{no} |
| `chq.src.expense` | Expense | خرچ | مصرف |
| `chq.src.repayment` | Udhaar repayment | ادھار واپسی | بازپرداخت قرض |
| `chq.src.supplierPayment` | Supplier payment | سپلائر ادائیگی | پرداخت به تأمین‌كننده |
| `chq.status.bounced` | Bounced | باؤنس | برگشت خورده |
| `chq.status.cleared` | Cleared | کلیئر | تصفیه شده |
| `chq.status.deposited` | At bank | بینک میں | در بانك |
| `chq.status.issued` | Issued | جاری کردہ | صادر شده |
| `chq.status.received` | In drawer | دراز میں | در دراز |
| `chq.status.returned` | Returned | واپس کردہ | برگردانده شده |
| `chq.subtitle` | Every cheque the shop has received or issued, through its whole life — captured with a payment, deposited, cleared or bounced. The registry is the instrument's diary; the money itself always moves through the ledger. | دکان کے موصولہ اور جاری کردہ تمام چیک — پوری زندگی کے ساتھ: وصولی، بینک جمع، کلیئرنگ یا باؤنس۔ رجسٹری چیک کی ڈائری ہے؛ رقم ہمیشہ کھاتے کے ذریعے حرکت کرتی ہے۔ | هر چكی كه دكان دریافت كرده یا صادر كرده است، در تمام عمرش — با پرداخت گرفته شده، به بانك سپرده شده، تصفیه شده یا برگشت خورده. این ثبت، خاطرات وسیله است؛ خود پول همیشه از طریق دفتر حركت می‌كند. |
| `chq.sum.atBank` | At bank | بینک میں | در بانك |
| `chq.sum.drawer` | In drawer | دراز میں | در دراز |
| `chq.sum.pendingOut` | Issued, pending | جاری کردہ زیر التوا | صادر شده، در انتظار |
| `chq.title` | Cheque Registry | چیک رجسٹری | ثبت چك‌ها |
| `chq.view.all` | All | تمام | همه |
| `chq.view.atBank` | At bank | بینک میں | در بانك |
| `chq.view.bounced` | Bounced | باؤنس | برگشت خورده |
| `chq.view.cleared` | Cleared | کلیئر شدہ | تصفیه شده |
| `chq.view.drawer` | In drawer | دراز میں | در دراز |
| `chq.view.due` | Due now | قابلِ کلیئرنگ | حالا سررسید |
| `chq.view.issued` | Issued, pending | جاری کردہ زیر التوا | صادر شده، در انتظار |
| `chq.view.returned` | Returned | واپس کردہ | برگردانده شده |
| `nav.cheques` | Cheques | چیک | چك‌ها |
## credit

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `credit.badge.advance` | {amount} advance | {amount} پیشگی | {amount} پیش‌پرداخت |
| `credit.badge.clear` | Clear | صاف | تسویه |
| `credit.badge.due` | {amount} due | {amount} بقایا | {amount} باقی |
| `credit.empty.none` | The khata is empty. Give your first udhaar to open an account here. | کھاتہ خالی ہے۔ یہاں کھاتہ کھولنے کے لیے پہلا ادھار دیں۔ | دفتر خالی است. اولین قرض خود را بدهید تا حسابی اینجا باز شود. |
| `credit.empty.search` | No credit accounts match your search. | آپ کی تلاش سے کوئی ادھار کھاتہ نہیں ملا۔ | هیچ حساب قرضی با جستجوی شما مطابقت ندارد. |
| `credit.eyebrow` | Khata | کھاتہ | دفتر |
| `credit.field.amount` | Amount (PKR) * | رقم (روپے) * | مبلغ (PKR) * |
| `credit.field.customer` | Customer | گاہک | مشتری |
| `credit.field.method` | Method | طریقہ | طریقه |
| `credit.field.name` | Name * | نام * | نام * |
| `credit.field.note` | Note | نوٹ | یادداشت |
| `credit.field.outstanding` | Outstanding | بقایا | باقی‌مانده |
| `credit.field.phone` | Phone | فون | تلیفون |
| `credit.give` | Give udhaar | ادھار دیں | قرض بدهید |
| `credit.give.err.amount` | Enter an udhaar amount above 0. | 0 سے زیادہ ادھار کی رقم لکھیں۔ | مبلغ قرض بیشتر از 0 وارد كنید. |
| `credit.give.err.customer` | Please choose a customer or switch to Walk-in. | کوئی گاہک منتخب کریں یا واک ان پر جائیں۔ | لطفاً یك مشتری انتخاب كنید یا به مهمان بروید. |
| `credit.give.err.name` | Enter the customer's name for a walk-in udhaar entry. | واک ان ادھار کے لیے گاہک کا نام لکھیں۔ | برای ثبت قرض مهمان، نام مشتری را وارد كنید. |
| `credit.give.namePlaceholder` | Customer name | گاہک کا نام | نام مشتری |
| `credit.give.notePlaceholder` | Cash loan, promise date… | نقد قرض، وعدے کی تاریخ… | قرض نقد، تاریخ وعده… |
| `credit.give.phonePlaceholder` | 03xx-xxxxxxx | 03xx-xxxxxxx | 03xx-xxxxxxx |
| `credit.give.sub` | Record a cash loan from the till — money the customer owes you back. For goods sold on credit, use Billing with the Udhaar payment option instead: that records the sale, the stock and the udhaar together. | دراز سے نقد قرض درج کریں — یہ رقم گاہک کے ذمے آپ کو واپس ہے۔ سامان ادھار پر بیچنا ہو تو اس کے بجائے بلنگ میں ادھار ادائیگی کا آپشن منتخب کریں: اس سے فروخت، اسٹاک اور ادھار تینوں ایک ساتھ درج ہوتے ہیں۔ | یك قرض نقد از دراز ثبت كنید — پولی كه مشتری به شما پس بدهكار است. برای كالای فروخته شده به قرض، به جای آن از بل با گزینه پرداخت قرض استفاده كنید: آن فروش، موجودی و قرض را با هم ثبت می‌كند. |
| `credit.given` | Udhaar | ادھار | قرض |
| `credit.hideHistory` | Hide history | تاریخ چھپائیں | پنهان كردن تاریخچه |
| `credit.history` | History | تاریخ | تاریخچه |
| `credit.khataOf` | Khata — {name} | کھاتہ — {name} | دفتر — {name} |
| `credit.note.appendOnly` | The khata is append-only — mistakes are corrected with an opposite entry, entries are never edited or deleted. Every udhaar and repayment below stays on record exactly as it was written. | کھاتہ صرف آگے بڑھتا ہے — غلطی الٹ اندراج سے درست ہوتی ہے، اندراج کبھی بدلے یا حذف نہیں ہوتے۔ نیچے دیا گیا ہر ادھار اور واپسی بالکل ویسے ہی ریکارڈ پر رہتی ہے جیسے لکھی گئی تھی۔ | دفتر فقط افزودنی است — اشتباهات با یك ثبت مخالف اصلاح می‌شوند، ثبت‌ها هرگز ویرایش یا حذف نمی‌شوند. هر قرض و بازپرداخت در زیر دقیقاً همان‌طور كه نوشته شده در سوابق می‌ماند. |
| `credit.notice.given` | Udhaar of {amount} given to {name}. Khata updated. | {name} کو {amount} ادھار دیا گیا۔ کھاتہ اپڈیٹ ہو گیا۔ | قرض {amount} به {name} داده شد. دفتر به‌روز شد. |
| `credit.notice.repaid` | Repayment of {amount} received from {name}. Khata updated. | {name} سے {amount} واپسی وصول ہوئی۔ کھاتہ اپڈیٹ ہو گیا۔ | بازپرداخت {amount} از {name} دریافت شد. دفتر به‌روز شد. |
| `credit.repay` | Repayment | واپسی | بازپرداخت |
| `credit.repay.err.amount` | Enter a repayment amount above 0. | 0 سے زیادہ واپسی کی رقم لکھیں۔ | مبلغ بازپرداخت بیشتر از 0 وارد كنید. |
| `credit.repay.err.exceeds` | Amount cannot exceed the outstanding balance of {amount}. | رقم بقایا {amount} سے زیادہ نہیں ہو سکتی۔ | مبلغ نمی‌تواند از مانده باقی {amount} بیشتر شود. |
| `credit.repay.from` | From {name} | منجانب {name} | از {name} |
| `credit.repay.maxHint` | Maximum: {amount} | زیادہ سے زیادہ: {amount} | حداكثر: {amount} |
| `credit.repay.notePlaceholder` | Partial payment, full settlement… | جزوی ادائیگی، مکمل تصفیہ… | پرداخت قسمتی، تسویه كامل… |
| `credit.repay.title` | Record repayment | واپسی درج کریں | ثبت بازپرداخت |
| `credit.repayment` | Repayment | واپسی | بازپرداخت |
| `credit.search.aria` | Search credit accounts | ادھار کھاتے تلاش کریں | جستجوی حساب‌های قرض |
| `credit.search.placeholder` | Search customer name or phone… | گاہک کا نام یا فون تلاش کریں… | نام مشتری یا تلیفون را جستجو كنید… |
| `credit.subtitle` | Who owes you what — udhaar given, repayments received, and the balance still outstanding for every customer. | کس کے ذمے کتنا ہے — دیا گیا ادھار، وصول شدہ واپسیاں، اور ہر گاہک کا باقی بقایا۔ | چه كسی چقدر به شما بدهكار است — قرض داده شده، بازپرداخت‌های دریافت شده، و مانده باقی برای هر مشتری. |
| `credit.sum.receivedToday` | Received today | آج وصول ہوا | امروز دریافت شد |
| `credit.sum.receivedTodaySub` | repayments collected today | آج وصول شدہ واپسیاں | بازپرداخت‌های گرفته شده امروز |
| `credit.sum.totalOutstanding` | Total outstanding | کل بقایا | مجموع باقی‌مانده |
| `credit.sum.totalOutstandingSub` | udhaar still to collect | ادھار جو ابھی وصول کرنا ہے | قرضی كه هنوز باید گرفته شود |
| `credit.sum.withBalance` | Customers with balance | بقایا والے گاہک | مشتریان با مانده |
| `credit.sum.withBalanceSub` | accounts not yet clear | کھاتے جو ابھی صاف نہیں ہوئے | حساب‌هایی كه هنوز تسویه نشده‌اند |
| `credit.th.actions` | Actions | کارروائیاں | اقدامات |
| `credit.th.amount` | Amount | رقم | مبلغ |
| `credit.th.bill` | Bill | بل | بل |
| `credit.th.customer` | Customer | گاہک | مشتری |
| `credit.th.date` | Date | تاریخ | تاریخ |
| `credit.th.kind` | Kind | قسم | نوع |
| `credit.th.note` | Note | نوٹ | یادداشت |
| `credit.th.outstanding` | Outstanding | بقایا | باقی‌مانده |
| `credit.th.repaid` | Repaid | واپس ہوا | بازپرداخت شده |
| `credit.th.totalUdhaar` | Total udhaar | کل ادھار | مجموع قرض |
| `credit.title` | Udhaar Khata (Credit Ledger) | ادھار کھاتہ | دفتر قرض (دفتر كریدت) |
| `credit.unknownCustomer` | Unknown | نامعلوم | نامعلوم |
| `credit.viewBill` | View bill | بل دیکھیں | مشاهده بل |
| `credit.walkin` | Walk-in / not in directory | واک ان / ڈائریکٹری میں نہیں | مهمان / در فهرست نیست |
## cust

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `cust.action.view` | View | دیکھیں | مشاهده |
| `cust.add` | Add customer | گاہک شامل کریں | اضافه كردن مشتری |
| `cust.aria.delete` | Delete {name} | {name} حذف کریں | حذف {name} |
| `cust.aria.edit` | Edit {name} | {name} میں ترمیم کریں | ویرایش {name} |
| `cust.badge.clear` | Clear | حساب صاف | تسویه |
| `cust.badge.due` | {amount} due | {amount} باقی | {amount} باقی |
| `cust.billStatus.held` | Held | روکا گیا | نگه‌داشته شده |
| `cust.billStatus.paid` | Paid | ادا شدہ | پرداخت شده |
| `cust.billStatus.partiallyReturned` | Partially returned | جزوی واپسی | قسماً برگردانده شده |
| `cust.billStatus.returned` | Returned | واپس شدہ | برگردانده شده |
| `cust.billStatus.voided` | Voided | منسوخ | باطل شده |
| `cust.credit.given` | Udhaar | ادھار | قرض |
| `cust.credit.received` | Repayment | وصولی | بازپرداخت |
| `cust.delete.aria` | Delete customer | گاہک حذف کریں | حذف مشتری |
| `cust.delete.blocked` | This customer still owes {amount} in udhaar. Collect the repayment first — a customer with an outstanding balance cannot be deleted. | اس گاہک کے ذمے اب بھی {amount} ادھار باقی ہے۔ پہلے وصولی کریں — جس گاہک کا بیلنس باقی ہو اسے حذف نہیں کیا جا سکتا۔ | این مشتری هنوز {amount} قرض دارد. اول بازپرداخت را بگیرید — مشتریی كه مانده باقی دارد حذف نمی‌شود. |
| `cust.delete.body` | {name} will be removed from your customer directory. Past bills and khata entries stay in your records. | {name} آپ کی گاہک فہرست سے ہٹا دیا جائے گا۔ پچھلے بل اور کھاتے کی اندراجات آپ کے ریکارڈ میں رہیں گے۔ | {name} از فهرست مشتریان شما برداشته می‌شود. بل‌های گذشته و ثبت‌های دفتر در سوابق شما می‌ماند. |
| `cust.delete.keep` | Keep it | رہنے دیں | نگه دارید |
| `cust.delete.title` | Delete customer? | گاہک حذف کریں؟ | مشتری حذف شود؟ |
| `cust.empty.noMatch` | No customers match your search. | آپ کی تلاش سے کوئی گاہک نہیں ملا۔ | هیچ مشتریی با جستجوی شما مطابقت ندارد. |
| `cust.empty.none` | No customers yet. Add your first customer to build the directory. | ابھی کوئی گاہک نہیں۔ فہرست بنانے کے لیے پہلا گاہک شامل کریں۔ | هنوز مشتریی نیست. اولین مشتری خود را اضافه كنید تا فهرست ساخته شود. |
| `cust.eyebrow` | Directory | فہرست | فهرست |
| `cust.form.address` | Address | پتہ | آدرس |
| `cust.form.addressPh` | Street, area, city | گلی، علاقہ، شہر | كوچه، ناحیه، شهر |
| `cust.form.addSub` | Add a new customer to your directory. | اپنی فہرست میں نیا گاہک شامل کریں۔ | یك مشتری جدید به فهرست خود اضافه كنید. |
| `cust.form.addTitle` | Add customer | گاہک شامل کریں | اضافه كردن مشتری |
| `cust.form.editSub` | Update the customer details below. | نیچے گاہک کی تفصیلات اپ ڈیٹ کریں۔ | جزئیات مشتری را در زیر به‌روز كنید. |
| `cust.form.editTitle` | Edit customer | گاہک میں ترمیم | ویرایش مشتری |
| `cust.form.name` | Name * | نام * | نام * |
| `cust.form.namePh` | e.g. Muhammad Imran | مثلاً محمد عمران | مثلاً محمد عمران |
| `cust.form.nameRequired` | Customer name is required. | گاہک کا نام ضروری ہے۔ | نام مشتری ضروری است. |
| `cust.form.note` | Note | نوٹ | یادداشت |
| `cust.form.notePh` | Monthly account, family… | ماہانہ کھاتہ، خاندان… | حساب ماهانه، خانواده… |
| `cust.form.phone` | Phone | فون | تلیفون |
| `cust.form.phonePh` | 03xx-xxxxxxx | 03xx-xxxxxxx | 03xx-xxxxxxx |
| `cust.form.saveChanges` | Save changes | تبدیلیاں محفوظ کریں | ذخیره تغییرات |
| `cust.noteBox` | Total purchased counts every completed bill for the customer (held and voided bills are excluded). Credit outstanding comes straight from the udhaar khata. | کل خریداری میں گاہک کے تمام مکمل بل شامل ہیں (روکے گئے اور منسوخ بل شامل نہیں)۔ باقی ادھار براہِ راست ادھار کھاتے سے آتا ہے۔ | مجموع خرید هر بل تكمیل‌شده مشتری را می‌شمارد (بل‌های نگه‌داشته‌شده و باطل‌شده شامل نیستند). قرض باقی‌مانده مستقیم از دفتر قرض می‌آید. |
| `cust.notice.added` | Customer "{name}" added. | گاہک "{name}" شامل ہو گیا۔ | مشتری "{name}" اضافه شد. |
| `cust.notice.deleted` | Customer "{name}" deleted. | گاہک "{name}" حذف ہو گیا۔ | مشتری "{name}" حذف شد. |
| `cust.notice.updated` | Customer "{name}" updated. | گاہک "{name}" اپ ڈیٹ ہو گیا۔ | مشتری "{name}" به‌روز شد. |
| `cust.profile.aria` | Customer profile | گاہک پروفائل | پروفایل مشتری |
| `cust.profile.billsSub` | {count} bills | {count} بل | {count} بل |
| `cust.profile.creditLedger` | Credit ledger | ادھار کھاتہ | دفتر قرض |
| `cust.profile.khata` | Khata entries | کھاتہ اندراجات | ثبت‌های دفتر |
| `cust.profile.khataSub` | credit + repayments | ادھار + وصولیاں | قرض + بازپرداخت‌ها |
| `cust.profile.noBills` | No bills for this customer yet. | اس گاہک کا ابھی کوئی بل نہیں۔ | هنوز بلی برای این مشتری نیست. |
| `cust.profile.noCredit` | No udhaar entries for this customer. | اس گاہک کی کوئی ادھار اندراج نہیں۔ | ثبت قرضی برای این مشتری نیست. |
| `cust.profile.noPhone` | No phone | فون نمبر نہیں | تلیفون ندارد |
| `cust.profile.outstanding` | Outstanding | باقی رقم | باقی‌مانده |
| `cust.profile.outstandingSub` | udhaar still due | اب بھی واجب الادا ادھار | قرض هنوز باقی |
| `cust.profile.purchaseHistory` | Purchase history | خریداری کی تاریخ | تاریخچه خرید |
| `cust.profile.th.amount` | Amount | رقم | مبلغ |
| `cust.profile.th.billNo` | Bill no | بل نمبر | شماره بل |
| `cust.profile.th.date` | Date | تاریخ | تاریخ |
| `cust.profile.th.kind` | Kind | قسم | نوع |
| `cust.profile.th.note` | Note | نوٹ | یادداشت |
| `cust.profile.th.status` | Status | حالت | حالت |
| `cust.profile.th.total` | Total | کل | مجموع |
| `cust.profile.totalPurchased` | Total purchased | کل خریداری | مجموع خرید |
| `cust.searchAria` | Search customers | گاہک تلاش کریں | جستجوی مشتریان |
| `cust.searchPlaceholder` | Search name, phone or address… | نام، فون یا پتہ تلاش کریں… | نام، تلیفون یا آدرس را جستجو كنید… |
| `cust.subtitle` | Your regulars in one place — how much each customer has bought and how much udhaar is still outstanding against them. | آپ کے مستقل گاہک ایک ہی جگہ — ہر گاہک نے کتنا خریدا اور ان کے ذمے کتنا ادھار باقی ہے۔ | مشتریان دائمی شما در یك جا — هر مشتری چقدر خریده و چقدر قرض هنوز بر ذمه‌اش باقی است. |
| `cust.th.actions` | Actions | کارروائی | اقدامات |
| `cust.th.address` | Address | پتہ | آدرس |
| `cust.th.creditOutstanding` | Credit outstanding | باقی ادھار | قرض باقی‌مانده |
| `cust.th.name` | Name | نام | نام |
| `cust.th.phone` | Phone | فون | تلیفون |
| `cust.th.totalPurchased` | Total purchased | کل خریداری | مجموع خرید |
| `cust.title` | Customers | گاہک | مشتریان |
## exp

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `exp.add` | Add expense | خرچ شامل کریں | اضافه كردن مصرف |
| `exp.amountPlaceholder` | e.g. 1500 | مثلاً 1500 | مثلاً 1500 |
| `exp.aria.delete` | Delete expense | خرچ حذف کریں | حذف مصرف |
| `exp.aria.edit` | Edit expense | خرچ میں ترمیم کریں | ویرایش مصرف |
| `exp.delete.body` | {category} — {amount} will be removed from the register. A reversing entry is posted to the journal, so the books stay balanced. | {category} — {amount} رجسٹر سے ہٹا دیا جائے گا۔ جرنل میں الٹ اندراج لگے گا، اس لیے حساب برابر رہے گا۔ | {category} — {amount} از ثبت برداشته می‌شود. یك ثبت معكوس به ژورنال گذاشته می‌شود، پس كتاب‌ها متوازن می‌مانند. |
| `exp.delete.confirm` | Confirm delete | حذف کی تصدیق | تأیید حذف |
| `exp.delete.keep` | Keep it | رہنے دیں | نگه دارید |
| `exp.delete.title` | Delete expense? | خرچ حذف کریں؟ | مصرف حذف شود؟ |
| `exp.edit` | Edit expense | خرچ میں ترمیم | ویرایش مصرف |
| `exp.editNote` | Update the expense — a reversing entry keeps the journal honest. | خرچ اپڈیٹ کریں — الٹ اندراج جرنل کو درست رکھتا ہے۔ | مصرف را به‌روز كنید — یك ثبت معكوس ژورنال را درست نگه می‌دارد. |
| `exp.empty` | No expenses recorded yet. | ابھی کوئی خرچ درج نہیں ہوا۔ | هنوز مصرفی ثبت نشده است. |
| `exp.err.amount` | Amount must be greater than 0. | رقم 0 سے زیادہ ہونی چاہیے۔ | مبلغ باید بیشتر از 0 باشد. |
| `exp.err.date` | Please pick a date. | تاریخ منتخب کریں۔ | لطفاً یك تاریخ انتخاب كنید. |
| `exp.eyebrow` | Khata | کھاتہ | دفتر |
| `exp.field.amount` | Amount (PKR) * | رقم (روپے) * | مبلغ (PKR) * |
| `exp.field.category` | Category | قسم | دسته |
| `exp.field.date` | Date | تاریخ | تاریخ |
| `exp.field.method` | Method | طریقہ | طریقه |
| `exp.field.note` | Note | نوٹ | یادداشت |
| `exp.form.addSub` | Record a new shop expense. | دکان کا نیا خرچ درج کریں۔ | یك مصرف جدید دكان ثبت كنید. |
| `exp.note.journal` | The journal is append-only: editing or deleting an expense posts a reversing entry plus the corrected entry — history is never rewritten. | جرنل صرف آگے بڑھتا ہے: خرچ کی ترمیم یا حذف پر الٹ اندراج اور درست اندراج لگتا ہے — تاریخ کبھی دوبارہ نہیں لکھی جاتی۔ | ژورنال فقط افزودنی است: ویرایش یا حذف یك مصرف یك ثبت معكوس و ثبت اصلاح‌شده می‌گذارد — تاریخ هرگز بازنویسی نمی‌شود. |
| `exp.notePlaceholder` | e.g. Electricity bill — October | مثلاً بجلی کا بل — اکتوبر | مثلاً بل برق — اكتوبر |
| `exp.register.countMany` | {count} records on file. | {count} ریکارڈ موجود ہیں۔ | {count} سابقه در فایل است. |
| `exp.register.countOne` | {count} record on file. | {count} ریکارڈ موجود ہے۔ | {count} سابقه در فایل است. |
| `exp.register.title` | Expense register | اخراجات رجسٹر | ثبت مصارف |
| `exp.saveChanges` | Save changes | تبدیلیاں محفوظ کریں | ذخیره تغییرات |
| `exp.subtitle` | Every shop expense in one register, set against the income it came out of — so the month's real picture is always in front of you. | دکان کا ہر خرچ ایک ہی رجسٹر میں، اس آمدن کے مقابل جس سے وہ نکلا — تاکہ مہینے کی اصل صورتحال ہمیشہ سامنے رہے۔ | هر مصرف دكان در یك ثبت، در برابر درآمدی كه از آن بیرون آمده است — تا تصویر واقعی ماه همیشه پیش روی شما باشد. |
| `exp.sum.monthExpenses` | This month's expenses | اس مہینے کے اخراجات | مصارف این ماه |
| `exp.sum.monthExpensesShort` | Month expenses | مہینے کے اخراجات | مصارف ماه |
| `exp.sum.monthExpensesSub` | all categories this month | اس مہینے کی تمام قسمیں | همه دسته‌ها این ماه |
| `exp.sum.monthIncome` | This month's income | اس مہینے کی آمدن | درآمد این ماه |
| `exp.sum.monthIncomeShort` | Month income | مہینے کی آمدن | درآمد ماه |
| `exp.sum.monthIncomeSub` | gross sales this month | اس مہینے کی کل فروخت | فروش ناخالص این ماه |
| `exp.sum.monthNet` | Month net — income minus expenses | مہینے کا خالص — آمدن منفی اخراجات | خالص ماه — درآمد منهای مصارف |
| `exp.sum.todayExpenses` | Today's expenses | آج کے اخراجات | مصارف امروز |
| `exp.sum.todayExpensesSub` | spent today | آج خرچ ہوا | امروز خرج شده |
| `exp.sum.todayIncome` | Today's sales income | آج کی فروخت آمدن | درآمد فروش امروز |
| `exp.sum.todayIncomeSub` | counter + billed sales today | آج کی کاؤنٹر + بل شدہ فروخت | فروش پیشخوان + بل‌شده امروز |
| `exp.th.actions` | Actions | کارروائیاں | اقدامات |
| `exp.th.amount` | Amount | رقم | مبلغ |
| `exp.th.category` | Category | قسم | دسته |
| `exp.th.date` | Date | تاریخ | تاریخ |
| `exp.th.method` | Method | طریقہ | طریقه |
| `exp.th.note` | Note | نوٹ | یادداشت |
| `exp.title` | Income & Expenses | آمدن و اخراجات | درآمد و مصارف |
## inv

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `fc.avg7` | 7-day avg | 7 دن کی اوسط | ميانگين 7 روزه |
| `fc.daysLeft` | ~{d} days of stock | ~{d} دن کا اسٹاک | ~{d} روز موجودي |
| `fc.daysLeftInf` | No recent sales | حال ہی میں کوئی فروخت نہیں | فروش اخيري نيست |
| `fc.empty` | No sales history yet — record some sales to unlock forecasts. | ابھی کوئی فروخت درج نہیں ہوئی — پیش گوئی دیکھنے کے لیے کچھ فروخت درج کریں۔ | هنوز سابقه فروشي نيست — چند فروش ثبت كنيد تا پيش‌بيني‌ها باز شود۔ |
| `fc.eyebrow` | Demand forecast | ڈیمانڈ کی پیش گوئی | پيش‌بيني تقاضا |
| `fc.howAssistant` | AI assistant | اے آئی اسسٹنٹ | دستيار AI |
| `fc.howBody1` | moving average = units sold in the last 7 days ÷ 7. Days of stock = current stock ÷ moving average. Suggested reorder = ceil(avg × 14 × 1.2 − stock). Slow movers with no recent sales are excluded — ask the | اوسط = پچھلے 7 دن میں بکی مقدار ÷ 7۔ اسٹاک کے دن = موجودہ اسٹاک ÷ اوسط۔ تجویز کردہ ری آرڈر = اوسط × 14 × 1.2 − اسٹاک (اوپر کی طرف مکمل کر کے)۔ جن چیزوں کی حالیہ فروخت نہیں، وہ شامل نہیں — کسی مخصوص چیز کے بارے میں | ميانگين متحرك = واحدهاي فروخته‌شده در 7 روز گذشته ÷ 7۔ روزهاي موجودي = موجودي فعلي ÷ ميانگين متحرك۔ سفارش مجدد پيشنهادي = ceil(avg × 14 × 1.2 − stock)۔ كالاهاي كم‌فروش بدون فروش اخير حذف مي‌شوند — درباره هر كالاي خاص از |
| `fc.howBody2` | about any specific item instead. | سے پوچھیں۔ |  بپرسيد۔ |
| `fc.howTitle` | How it works: | طریقہ کار: | چگونه كار مي‌كند: |
| `fc.noOrder` | No order needed | آرڈر کی ضرورت نہیں | سفارشي لازم نيست |
| `fc.order` | Order {qty} {unit} | {qty} {unit} منگوائیں | سفارش {qty} {unit} |
| `fc.orderBadge` | {name} — order {qty} {unit} | {name} — {qty} {unit} منگوائیں | {name} — سفارش {qty} {unit} |
| `fc.perDay` | {n}/day | {n} فی دن | {n}/روز |
| `fc.reorderSummary` | {n} items · estimated purchase cost {cost} | {n} چیزیں · متوقع خریداری لاگت {cost} | {n} كالا · هزينه تخميني خريد {cost} |
| `fc.reorderTitle` | Reorder shopping list | ری آرڈر خریداری فہرست | ليست خريد سفارش مجدد |
| `fc.status.critical` | Critical | انتہائی کم | بحراني |
| `fc.status.low` | Reorder soon | جلد ری آرڈر کریں | به‌زودي سفارش دهيد |
| `fc.status.ok` | Healthy | مناسب | سالم |
| `fc.subtitleBold` | 7-day moving average | پچھلے 7 دن کی اوسط فروخت | ميانگين متحرك 7 روزه |
| `fc.subtitlePost` |  of units sold, estimate how many days your current stock will last, and suggest a reorder quantity covering 14 days of demand plus a 20% safety buffer. |  لیتے ہیں، اندازہ لگاتے ہیں کہ موجودہ اسٹاک کتنے دن چلے گا، اور 14 دن کی ڈیمانڈ کے ساتھ 20% اضافی حفاظتی اسٹاک ملا کر ری آرڈر کی مقدار تجویز کرتے ہیں۔ |  واحدهاي فروخته‌شده را مي‌گيريم، تخمين مي‌زنيم موجودي فعلي شما چند روز دوام مي‌آورد، و مقدار سفارش مجدد براي 14 روز تقاضا به‌علاوه 20% ذخيره احتياطي پيشنهاد مي‌كنيم۔ |
| `fc.subtitlePre` | For each fast-moving product we take the  | ہر تیزی سے بکنے والی پروڈکٹ کے لیے ہم  | براي هر كالاي پرفروش ما  |
| `fc.title` | What to order next | آگے کیا منگوانا ہے | بعد چه سفارش دهيد |
| `fc.topAria` | Per-product forecast | فی پروڈکٹ پیش گوئی | پيش‌بيني براي هر كالا |
| `fc.topSub` | Sorted by days of stock remaining — the most urgent first. | باقی اسٹاک کے دنوں کے حساب سے ترتیب — سب سے فوری پہلے۔ | بر اساس روزهاي موجودي باقي‌مانده مرتب شده — فوري‌ترين اول۔ |
| `fc.topTitle` | Top products by demand | ڈیمانڈ کے لحاظ سے سرفہرست پروڈکٹس | كالاهاي برتر بر اساس تقاضا |
| `inv.addProduct` | Add product | پروڈکٹ شامل کریں | كالا اضافه كنيد |
| `inv.adj.aria` | Adjust stock | اسٹاک ایڈجسٹ کریں | موجودي را تعديل كنيد |
| `inv.adj.current` | — currently {qty} {unit} on shelf. | — اس وقت شیلف پر {qty} {unit} موجود ہے۔ | — فعلاً {qty} {unit} در قفسه موجود است۔ |
| `inv.adj.deltaLabel` | Quantity change (+ add / − remove) | مقدار میں تبدیلی (+ شامل / − خارج) | تغيير مقدار (+ اضافه / − كم) |
| `inv.adj.deltaPlaceholder` | e.g. 5 or -3 | مثلاً 5 یا -3 | مثال 5 يا -3 |
| `inv.adj.error` | Enter a quantity change other than 0 (e.g. 5 or -3). | 0 کے علاوہ مقدار کی تبدیلی لکھیں (مثلاً 5 یا -3)۔ | تغيير مقداري غير از 0 وارد كنيد (مثال 5 يا -3)۔ |
| `inv.adj.journalNote` | Negative adjustments post an inventory write-off at cost to the journal. | منفی ایڈجسٹمنٹ پر لاگت کے حساب سے انوینٹری کی کٹوتی جرنل میں درج ہوتی ہے۔ | تعديلات منفي يك حذف موجودي به هزينه در ژورنال ثبت مي‌كند۔ |
| `inv.adj.note` | Note | نوٹ | يادداشت |
| `inv.adj.notePlaceholder` | Optional note | اختیاری نوٹ | يادداشت اختياري |
| `inv.adj.reason` | Reason | وجہ | دليل |
| `inv.adj.save` | Save adjustment | ایڈجسٹمنٹ محفوظ کریں | تعديل را ذخيره كنيد |
| `inv.adj.title` | Adjust stock | اسٹاک ایڈجسٹ کریں | موجودي را تعديل كنيد |
| `inv.adjReason.correction` | Correction | درستگی | تصحيح |
| `inv.adjReason.damage` | Damage | ٹوٹ پھوٹ | آسيب |
| `inv.adjReason.expiry` | Expiry | میعاد ختم | انقضا |
| `inv.adjReason.theft` | Theft | چوری | سرقت |
| `inv.adjustAria` | Adjust stock for {name} | {name} کا اسٹاک ایڈجسٹ کریں | موجودي {name} را تعديل كنيد |
| `inv.adjustTitle` | Adjust stock | اسٹاک ایڈجسٹ کریں | موجودي را تعديل كنيد |
| `inv.available` | available {n} | دستیاب {n} | موجود {n} |
| `inv.cat.beverages` | Beverages | مشروبات | نوشيدني‌ها |
| `inv.cat.cooking` | Cooking Essentials | کھانا پکانے کی اشیاء | ضروريات آشپزي |
| `inv.cat.dairy` | Dairy | دودھ و دہی | لبنيات |
| `inv.cat.general` | General | عام | عمومي |
| `inv.cat.household` | Household | گھریلو اشیاء | خانه |
| `inv.cat.lentils` | Lentils & Pulses | دالیں | عدس و حبوبات |
| `inv.cat.personalCare` | Personal Care | ذاتی نگہداشت | مراقبت شخصي |
| `inv.cat.rice` | Rice & Grains | چاول و اناج | برنج و غلات |
| `inv.cat.snacks` | Snacks | اسنیکس | ميان‌وعده‌ها |
| `inv.cat.spices` | Spices | مصالحہ جات | ادويه‌ها |
| `inv.class.goods` | Goods (for resale) | اشیاء (فروخت کے لیے) | كالا (براي فروش مجدد) |
| `inv.class.raw` | Raw material | خام مال | مواد خام |
| `inv.dead.daysAgo` | Last sold {d} days ago | آخری فروخت {d} دن پہلے | آخرين فروش {d} روز قبل |
| `inv.dead.explain` | These items are sitting on the shelf but have not sold in over 60 days — consider a discount or clearing them out. | یہ چیزیں شیلف پر موجود ہیں مگر 60 دن سے فروخت نہیں ہوئیں — رعایت دے کر یا ختم کر کے جگہ خالی کرنے پر غور کریں۔ | اين كالاها در قفسه هستند اما بيش از 60 روز است فروخته نشده‌اند — تخفيف دادن يا پاك كردن آنها را در نظر بگيريد۔ |
| `inv.dead.never` | Never sold | کبھی فروخت نہیں ہوئی | هرگز فروخته نشده |
| `inv.delete.aria` | Confirm delete | حذف کی تصدیق | حذف را تأييد كنيد |
| `inv.delete.body` | will be removed from your inventory. Past sales records stay untouched. This cannot be undone. | آپ کی انوینٹری سے ہٹا دیا جائے گا۔ پچھلی فروخت کا ریکارڈ برقرار رہے گا۔ یہ عمل واپس نہیں ہو سکتا۔ | از موجودي شما حذف خواهد شد۔ سوابق فروش گذشته دست‌نخورده مي‌ماند۔ اين كار قابل برگشت نيست۔ |
| `inv.delete.keep` | Keep it | رہنے دیں | نگه داريد |
| `inv.delete.title` | Delete product? | پروڈکٹ حذف کریں؟ | كالا حذف شود؟ |
| `inv.deleteAria` | Delete {name} | {name} حذف کریں | {name} را حذف كنيد |
| `inv.editAria` | Edit {name} | {name} میں ترمیم کریں | {name} را ويرايش كنيد |
| `inv.empty.adjustments` | No stock adjustments recorded yet. | ابھی تک کوئی اسٹاک ایڈجسٹمنٹ درج نہیں ہوئی۔ | هنوز هيچ تعديل موجودي ثبت نشده است۔ |
| `inv.empty.all` | No products yet. Add your first product to get started. | ابھی کوئی پروڈکٹ نہیں ہے۔ پہلی پروڈکٹ شامل کر کے آغاز کریں۔ | هنوز هيچ كالايي نيست۔ اولين كالاي خود را اضافه كنيد تا شروع كنيد۔ |
| `inv.empty.dead` | No dead stock. Everything has sold recently. | کوئی ڈیڈ اسٹاک نہیں ہے۔ ہر چیز حال ہی میں بکی ہے۔ | موجودي مرده‌اي نيست۔ همه چيز اخيراً فروخته شده است۔ |
| `inv.empty.expiring` | Nothing is expiring in the next 30 days. | اگلے 30 دن میں کوئی چیز ختم نہیں ہو رہی۔ | در 30 روز آينده چيزي منقضي نمي‌شود۔ |
| `inv.empty.low` | No low-stock products. Your shelf is well stocked. | کوئی پروڈکٹ کم اسٹاک میں نہیں ہے۔ شیلف اچھی طرح بھری ہے۔ | كالاي كم‌شده‌اي نيست۔ قفسه شما خوب پر است۔ |
| `inv.empty.search` | No products match your search. | آپ کی تلاش سے کوئی پروڈکٹ نہیں ملی۔ | هيچ كالايي با جستجوي شما مطابقت ندارد۔ |
| `inv.err.nameRequired` | Product name is required. | پروڈکٹ کا نام ضروری ہے۔ | نام كالا ضروري است۔ |
| `inv.err.saleBelowCost` | Sale price is below cost price — you would lose money on every sale. | فروخت قیمت لاگت قیمت سے کم ہے — ہر فروخت پر نقصان ہوگا۔ | قيمت فروش پايين‌تر از قيمت هزينه است — در هر فروش زيان خواهيد كرد۔ |
| `inv.err.salePricePositive` | Sale price must be greater than 0. | فروخت قیمت 0 سے زیادہ ہونی چاہیے۔ | قيمت فروش بايد بيشتر از 0 باشد۔ |
| `inv.err.skuDuplicate` | SKU "{sku}" is already used by {name}. | SKU "{sku}" پہلے ہی {name} کے لیے استعمال ہو رہا ہے۔ | SKU {sku} قبلاً توسط {name} استفاده شده است۔ |
| `inv.err.skuRequired` | SKU is required. | SKU ضروری ہے۔ | SKU ضروري است۔ |
| `inv.expiry.expired` | Expired {d} days ago | میعاد {d} دن پہلے ختم ہو گئی | {d} روز قبل منقضي شد |
| `inv.expiry.inDays` | Expires in {d} days | میعاد ختم ہونے میں {d} دن باقی | در {d} روز منقضي مي‌شود |
| `inv.expiry.today` | Expires today | آج میعاد ختم | امروز منقضي مي‌شود |
| `inv.exportCsv` | Export CSV | CSV برآمد کریں | CSV صادر كنيد |
| `inv.eyebrow` | Stock register | اسٹاک رجسٹر | ثبت موجودي |
| `inv.form.addSub` | Add a new item to your shelf. | اپنی شیلف میں نئی چیز شامل کریں۔ | يك كالاي جديد به قفسه خود اضافه كنيد۔ |
| `inv.form.category` | Category | زمرہ | دسته |
| `inv.form.class` | Stock class | اسٹاک کی قسم | صنف موجودي |
| `inv.form.classHint` | Raw materials are bought to be consumed by production (recipes / manufacturing); their stock value is held in the Raw materials account. Goods — including finished products you make — stay in the Inventory account. | خام مال پیداوار (ترکیب / مینوفیکچرنگ) میں استعمال کے لیے خریدا جاتا ہے؛ اس کی اسٹاک مالیت خام مال کے کھاتے میں رہتی ہے۔ اشیاء — بشمول آپ کی بنائی ہوئی تیار پروڈکٹس — انوینٹری کھاتے میں رہتی ہیں۔ | مواد خام براي مصرف توسط توليد (دستورها / ساخت) خريده مي‌شود؛ ارزش موجودي آنها در حساب مواد خام نگه داشته مي‌شود۔ كالاها — از جمله محصولات تمام‌شده‌اي كه مي‌سازيد — در حساب موجودي مي‌مانند۔ |
| `inv.form.classReclassNote` | Changing the class moves the stock on hand ({amount}) between the Inventory and Raw materials accounts with one reclass entry in the journal. The goods themselves do not move. | قسم بدلنے سے موجودہ اسٹاک ({amount}) جرنل میں ایک ری کلاس اندراج کے ذریعے انوینٹری اور خام مال کے کھاتوں کے درمیان منتقل ہو جائے گا۔ سامان خود کہیں نہیں جاتا۔ | تغيير صنف، موجودي در دست ({amount}) را با يك ورودي طبقه‌بندي مجدد در ژورنال بين حساب‌هاي موجودي و مواد خام منتقل مي‌كند۔ خود كالاها حركت نمي‌كنند۔ |
| `inv.form.costPrice` | Cost price (PKR) | لاگت قیمت (روپے) | قيمت هزينه (PKR) |
| `inv.form.editSub` | Update the details below. | نیچے دی گئی تفصیلات اپ ڈیٹ کریں۔ | جزئيات زير را به‌روز كنيد۔ |
| `inv.form.editTitle` | Edit product | پروڈکٹ میں ترمیم | كالا را ويرايش كنيد |
| `inv.form.expiryDate` | Expiry date | میعاد ختم ہونے کی تاریخ | تاريخ انقضا |
| `inv.form.expiryHint` | Optional — for perishables only. | اختیاری — صرف خراب ہونے والی چیزوں کے لیے۔ | اختياري — فقط براي فاسدشدني‌ها۔ |
| `inv.form.name` | Product name * | پروڈکٹ کا نام * | نام كالا * |
| `inv.form.namePlaceholder` | e.g. Dalda Cooking Oil 5L | مثلاً ڈالڈا کوکنگ آئل 5L | مثال Dalda Cooking Oil 5L |
| `inv.form.reorderHint` | Alert when stock falls to this level. | اسٹاک اس سطح تک آ جائے تو خبردار کریں۔ | وقتي موجودي به اين سطح رسيد هشدار دهيد۔ |
| `inv.form.reorderLevel` | Reorder level | ری آرڈر کی سطح | سطح سفارش مجدد |
| `inv.form.salePrice` | Sale price (PKR) * | فروخت قیمت (روپے) * | قيمت فروش (PKR) * |
| `inv.form.saveChanges` | Save changes | تبدیلیاں محفوظ کریں | تغييرات را ذخيره كنيد |
| `inv.form.sku` | SKU * | SKU * | SKU * |
| `inv.form.skuPlaceholder` | e.g. DLD-OIL-5L | مثلاً DLD-OIL-5L | مثال DLD-OIL-5L |
| `inv.form.stockQty` | Stock quantity | اسٹاک کی مقدار | مقدار موجودي |
| `inv.form.taxDefault` | Shop default | دکان کی ڈیفالٹ | پيش‌فرض دكان |
| `inv.form.taxExempt` | Tax exempt (never taxed) | ٹیکس سے مستثنیٰ (کبھی ٹیکس نہیں) | معاف از ماليات (هرگز ماليات نمي‌گيرد) |
| `inv.form.taxHint` | Leave on Shop default unless this product carries its own rate. Exempt wins over every slab. | اسے دکان کی ڈیفالٹ پر رہنے دیں، الا یہ کہ اس پروڈکٹ کی اپنی شرح ہو۔ استثنیٰ ہر سلیب پر غالب ہے۔ | روي پيش‌فرض دكان بگذاريد مگر اين كالا نرخ خودش را داشته باشد۔ معافيت بر همه پله‌ها غالب است۔ |
| `inv.form.taxSlab` | Tax slab | ٹیکس سلیب | پله ماليات |
| `inv.form.unit` | Unit | یونٹ | واحد |
| `inv.form.urduName` | Urdu name | اردو نام | نام اردو |
| `inv.form.urduNamePlaceholder` | Urdu name | اردو نام | نام اردو |
| `inv.import.done` | Imported {n} products. | {n} پروڈکٹس درآمد ہو گئیں۔ | {n} كالا وارد شد۔ |
| `inv.import.doneSkipped` | Imported {n} products ({skipped} skipped). | {n} پروڈکٹس درآمد ہو گئیں ({skipped} چھوڑ دی گئیں)۔ | {n} كالا وارد شد ({skipped} رد شد)۔ |
| `inv.import.error` | Could not read that CSV file. Please check the file and try again. | وہ CSV فائل نہیں پڑھی جا سکی۔ فائل چیک کر کے دوبارہ کوشش کریں۔ | آن فايل CSV خوانده نشد۔ لطفاً فايل را بررسي كنيد و دوباره تلاش كنيد۔ |
| `inv.importAria` | Import products from CSV | CSV سے پروڈکٹس درآمد کریں | كالاها را از CSV وارد كنيد |
| `inv.importCsv` | Import CSV | CSV درآمد کریں | CSV وارد كنيد |
| `inv.kpi.costValue` | Stock value (cost) | اسٹاک کی مالیت (لاگت) | ارزش موجودي (هزينه) |
| `inv.kpi.dead` | Dead stock | ڈیڈ اسٹاک | موجودي مرده |
| `inv.kpi.deadSub` | no sale in 60 days | 60 دن سے فروخت نہیں ہوئی | در 60 روز فروشي نشده |
| `inv.kpi.expiring` | Expiring ≤30 days | 30 دن کے اندر ختم ہونے والی | در 30 روز منقضي مي‌شود |
| `inv.kpi.expiringAction` | check dates & clear first | تاریخیں دیکھ کر پہلے ختم کریں | تاريخ‌ها را ببينيد و اول تمام كنيد |
| `inv.kpi.expiringNone` | nothing expiring soon | جلد کوئی چیز ختم نہیں ہو رہی | به‌زودي چيزي منقضي نمي‌شود |
| `inv.kpi.productsOnShelf` | {n} products on shelf | شیلف پر {n} پروڈکٹس | {n} كالا در قفسه |
| `inv.kpi.retailSub` | what the shelf would sell for | شیلف کی کل متوقع فروخت | قفسه به چقدر فروخته خواهد شد |
| `inv.kpi.retailValue` | Stock value (sale price) | اسٹاک کی مالیت (فروخت قیمت) | ارزش موجودي (قيمت فروش) |
| `inv.promised` | promised {n} | وعدہ شدہ {n} | وعده‌شده {n} |
| `inv.rawBadge` | Raw material | خام مال | مواد خام |
| `inv.reorderAt` | reorder at {n} | ری آرڈر سطح: {n} | سفارش مجدد در {n} |
| `inv.searchAria` | Search products | پروڈکٹس تلاش کریں | كالاها را جستجو كنيد |
| `inv.searchPlaceholder` | Search name, SKU or category… | نام، SKU یا زمرہ تلاش کریں… | نام، SKU يا دسته را جستجو كنيد… |
| `inv.status.critical` | Critical | انتہائی کم | بحراني |
| `inv.status.inStock` | Healthy | مناسب | سالم |
| `inv.status.low` | Low stock | کم اسٹاک | كم شده |
| `inv.status.out` | Out of stock | اسٹاک ختم | موجودي تمام |
| `inv.subtitle` | Every item on your shelf. Rows highlighted in amber are at or below their reorder level — time to restock. | آپ کی شیلف پر موجود ہر چیز۔ عنبری رنگ سے نمایاں قطاریں ری آرڈر کی سطح پر یا اس سے نیچے ہیں — اسٹاک دوبارہ منگوانے کا وقت ہے۔ | هر كالا در قفسه شما۔ قطارهاي مشخص‌شده با رنگ عنبري در سطح سفارش مجدد يا پايين‌تر از آن هستند — وقت پر كردن دوباره است۔ |
| `inv.th.actions` | Actions | کارروائیاں | اقدامات |
| `inv.th.change` | Change | تبدیلی | تغيير |
| `inv.th.cost` | Cost | لاگت | هزينه |
| `inv.th.date` | Date | تاریخ | تاريخ |
| `inv.th.margin` | Margin | منافع | مفاد |
| `inv.th.note` | Note | نوٹ | يادداشت |
| `inv.th.product` | Product | پروڈکٹ | كالا |
| `inv.th.reason` | Reason | وجہ | دليل |
| `inv.th.salePrice` | Sale price | فروخت قیمت | قيمت فروش |
| `inv.th.sku` | SKU | SKU | SKU |
| `inv.th.status` | Status | حالت | وضعيت |
| `inv.th.stock` | Stock | اسٹاک | موجودي |
| `inv.title` | Inventory | اسٹاک | موجودي |
| `inv.view.adjustments` | Adjustments log | ایڈجسٹمنٹ لاگ | ثبت تعديلات |
| `inv.view.all` | All | تمام | همه |
| `inv.view.dead` | Dead stock (60d) | ڈیڈ اسٹاک (60 دن) | موجودي مرده (60 روز) |
| `inv.view.expiring` | Expiring (30d) | ختم ہونے والی (30 دن) | منقضي‌شونده (30 روز) |
| `inv.view.low` | Low stock | کم اسٹاک | كم شده |
| `inv.viewsAria` | Inventory views | اسٹاک کے ویوز | نماهاي موجودي |
## sup

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `sup.action.view` | View | دیکھیں | مشاهده |
| `sup.add` | Add supplier | سپلائر شامل کریں | تأمین‌کننده اضافه کنید |
| `sup.aria.delete` | Delete {name} | {name} حذف کریں | {name} را حذف کنید |
| `sup.aria.edit` | Edit {name} | {name} میں ترمیم کریں | {name} را ویرایش کنید |
| `sup.aria.recordPayment` | Record payment to {name} | {name} کو ادائیگی درج کریں | پرداخت به {name} را ثبت کنید |
| `sup.aria.recordPurchase` | Record purchase from {name} | {name} سے خریداری درج کریں | خرید از {name} را ثبت کنید |
| `sup.delete.aria` | Delete supplier | سپلائر حذف کریں | تأمین‌کننده را حذف کنید |
| `sup.delete.blockedBalance` | This supplier still has a payable balance of {amount}. Record the payment first — a supplier with an open balance cannot be deleted. | اس سپلائر کا {amount} اب بھی دینا باقی ہے۔ پہلے ادائیگی درج کریں — جس سپلائر کا بیلنس باقی ہو اسے حذف نہیں کیا جا سکتا۔ | این تأمین‌کننده هنوز مانده قابل پرداخت {amount} دارد. ابتدا پرداخت را ثبت کنید — تأمین‌کننده‌ای که مانده باز دارد حذف نمی‌شود. |
| `sup.delete.blockedHistory` | This supplier has purchase or payment history, so it cannot be deleted. The history is part of your accounts record. | اس سپلائر کی خریداری یا ادائیگی کی تاریخ موجود ہے، اس لیے اسے حذف نہیں کیا جا سکتا۔ یہ تاریخ آپ کے کھاتوں کے ریکارڈ کا حصہ ہے۔ | این تأمین‌کننده سابقه خرید یا پرداخت دارد، پس حذف نمی‌شود. این سابقه بخشی از سوابق حساب‌های شماست. |
| `sup.delete.body` | {name} will be removed from your supplier directory. | {name} آپ کی سپلائر فہرست سے ہٹا دیا جائے گا۔ | {name} از فهرست تأمین‌کننده‌گان شما حذف خواهد شد. |
| `sup.delete.bodyCompany` | {name} ({company}) will be removed from your supplier directory. | {name} ({company}) آپ کی سپلائر فہرست سے ہٹا دیا جائے گا۔ | {name} ({company}) از فهرست تأمین‌کننده‌گان شما حذف خواهد شد. |
| `sup.delete.keep` | Keep it | رہنے دیں | نگه دارید |
| `sup.delete.title` | Delete supplier? | سپلائر حذف کریں؟ | تأمین‌کننده حذف شود؟ |
| `sup.detail.aria` | Supplier detail | سپلائر کی تفصیل | جزئیات تأمین‌کننده |
| `sup.detail.balanceLabel` | Balance payable | واجب الادا بیلنس | مانده قابل پرداخت |
| `sup.detail.fromPo` | Against purchase order {number} | پرچیز آرڈر {number} کے تحت | در برابر سفارش خرید {number} |
| `sup.detail.fromPoDraft` | Against a purchase order | ایک پرچیز آرڈر کے تحت | در برابر یک سفارش خرید |
| `sup.detail.noPayments` | No payments recorded yet. | ابھی کوئی ادائیگی درج نہیں۔ | هنوز پرداختی ثبت نشده است. |
| `sup.detail.noPhone` | No phone | فون نمبر نہیں | تلیفون ندارد |
| `sup.detail.noPurchases` | No purchases recorded yet. | ابھی کوئی خریداری درج نہیں۔ | هنوز خریدی ثبت نشده است. |
| `sup.detail.payable` | {amount} payable | {amount} دینا ہے | {amount} قابل پرداخت |
| `sup.detail.paymentsTitle` | Payments history | ادائیگیوں کی تاریخ | تاریخچه پرداخت‌ها |
| `sup.detail.purchasesTitle` | Purchases history | خریداری کی تاریخ | تاریخچه خریدها |
| `sup.detail.settled` | Settled | حساب صاف | تصفیه شده |
| `sup.detail.summary` | Purchased {purchased} · Paid {paid} | خریداری {purchased} · ادا شدہ {paid} | خریداری‌شده {purchased} · پرداخت‌شده {paid} |
| `sup.detail.th.amount` | Amount | رقم | مبلغ |
| `sup.detail.th.date` | Date | تاریخ | تاریخ |
| `sup.detail.th.items` | Items | اشیاء | اقلام |
| `sup.detail.th.method` | Method | طریقہ | روش |
| `sup.detail.th.note` | Note | نوٹ | یادداشت |
| `sup.detail.th.total` | Total | کل | مجموع |
| `sup.empty.noMatch` | No suppliers match your search. | آپ کی تلاش سے کوئی سپلائر نہیں ملا۔ | هیچ تأمین‌کننده‌ای با جستجوی شما مطابقت ندارد. |
| `sup.empty.none` | No suppliers yet. Add your first supplier to start recording purchases. | ابھی کوئی سپلائر نہیں۔ خریداری درج کرنے کے لیے پہلا سپلائر شامل کریں۔ | هنوز تأمین‌کننده‌ای نیست. اولین تأمین‌کننده را اضافه کنید تا ثبت خرید را شروع کنید. |
| `sup.eyebrow` | Purchasing | خریداری | خرید |
| `sup.form.addSub` | Add a new supplier to your directory. | اپنی فہرست میں نیا سپلائر شامل کریں۔ | یک تأمین‌کننده جدید به فهرست خود اضافه کنید. |
| `sup.form.addTitle` | Add supplier | سپلائر شامل کریں | تأمین‌کننده اضافه کنید |
| `sup.form.company` | Company | کمپنی | شرکت |
| `sup.form.companyPh` | e.g. Lahore Wholesale Traders | مثلاً لاہور ہول سیل ٹریڈرز | مثال: تاجران عمده‌فروش لاهور |
| `sup.form.editSub` | Update the supplier details below. | نیچے سپلائر کی تفصیلات اپ ڈیٹ کریں۔ | جزئیات تأمین‌کننده را در پایین به‌روز کنید. |
| `sup.form.editTitle` | Edit supplier | سپلائر میں ترمیم | تأمین‌کننده را ویرایش کنید |
| `sup.form.name` | Name * | نام * | نام * |
| `sup.form.namePh` | e.g. Haji Sahib | مثلاً حاجی صاحب | مثال: حاجی صاحب |
| `sup.form.nameRequired` | Supplier name is required. | سپلائر کا نام ضروری ہے۔ | نام تأمین‌کننده ضروری است. |
| `sup.form.notes` | Notes | نوٹس | یادداشت‌ها |
| `sup.form.notesPh` | Terms, delivery days… | شرائط، ڈیلیوری کے دن… | شرایط، روزهای تحویل… |
| `sup.form.phone` | Phone | فون | تلیفون |
| `sup.form.phonePh` | 03xx-xxxxxxx | 03xx-xxxxxxx | 03xx-xxxxxxx |
| `sup.form.saveChanges` | Save changes | تبدیلیاں محفوظ کریں | تغییرات را ذخیره کنید |
| `sup.kpi.countLabel` | Suppliers | سپلائرز | تأمین‌کننده‌گان |
| `sup.kpi.countSub` | in your directory | آپ کی فہرست میں | در فهرست شما |
| `sup.kpi.paidLabel` | Paid this month | اس مہینے کی ادائیگی | پرداخت این ماه |
| `sup.kpi.paidSub` | payments made this month | اس مہینے کی گئی ادائیگیاں | پرداخت‌های انجام‌شده در این ماه |
| `sup.kpi.payableLabel` | Total payable | کل واجب الادا | مجموع قابل پرداخت |
| `sup.kpi.payableSub` | owed to all suppliers | تمام سپلائرز کو دینا ہے | بدهکار به همه تأمین‌کننده‌گان |
| `sup.kpi.purchasedLabel` | Purchased this month | اس مہینے کی خریداری | خرید این ماه |
| `sup.kpi.purchasedSub` | stock bought this month | اس مہینے خریدا گیا اسٹاک | موجودی خریداری‌شده در این ماه |
| `sup.notice.added` | Supplier "{name}" added. | سپلائر "{name}" شامل ہو گیا۔ | تأمین‌کننده "{name}" اضافه شد. |
| `sup.notice.deleted` | Supplier "{name}" deleted. | سپلائر "{name}" حذف ہو گیا۔ | تأمین‌کننده "{name}" حذف شد. |
| `sup.notice.updated` | Supplier "{name}" updated. | سپلائر "{name}" اپ ڈیٹ ہو گیا۔ | تأمین‌کننده "{name}" به‌روز شد. |
| `sup.payment.amount` | Amount (PKR) * | رقم (روپے) * | مبلغ (PKR) * |
| `sup.payment.aria` | Record supplier payment | سپلائر کو ادائیگی درج کریں | پرداخت تأمین‌کننده را ثبت کنید |
| `sup.payment.errAmount` | Enter a payment amount above 0. | 0 سے زیادہ ادائیگی کی رقم درج کریں۔ | مبلغ پرداختی بیشتر از 0 وارد کنید. |
| `sup.payment.method` | Method | طریقہ | روش |
| `sup.payment.note` | Note | نوٹ | یادداشت |
| `sup.payment.notePh` | Reference, cheque no… | حوالہ، چیک نمبر… | مرجع، شماره چک… |
| `sup.payment.sub` | Paying {name} — current balance {balance}. | {name} کو ادائیگی — موجودہ بیلنس {balance}۔ | پرداخت به {name} — مانده فعلی {balance}. |
| `sup.payment.success` | Payment of {amount} recorded to {name}. | {name} کو {amount} کی ادائیگی درج ہو گئی۔ | پرداخت {amount} به {name} ثبت شد. |
| `sup.payment.title` | Record payment | ادائیگی درج کریں | پرداخت را ثبت کنید |
| `sup.purchase.addLine` | Add line | لائن شامل کریں | خط اضافه کنید |
| `sup.purchase.costNote` | The latest unit cost becomes the product's cost price. | تازہ ترین فی یونٹ قیمت پروڈکٹ کی لاگت قیمت بن جاتی ہے۔ | آخرین هزینه واحد، قیمت تمام‌شده کالا می‌شود. |
| `sup.purchase.errFailed` | Could not record the purchase. Please check the lines and try again. | خریداری درج نہیں ہو سکی۔ لائنیں چیک کر کے دوبارہ کوشش کریں۔ | خرید ثبت نشد. لطفاً خط‌ها را بررسی کنید و دوباره تلاش کنید. |
| `sup.purchase.errInvalidLine` | Every line needs a product and a quantity above 0. | ہر لائن کے لیے پروڈکٹ اور 0 سے زیادہ مقدار ضروری ہے۔ | هر خط به یک کالا و مقداری بیشتر از 0 نیاز دارد. |
| `sup.purchase.errNegativeCost` | Unit cost cannot be negative. | فی یونٹ قیمت منفی نہیں ہو سکتی۔ | هزینه واحد نمی‌تواند منفی باشد. |
| `sup.purchase.errNoLines` | Add at least one product line. | کم از کم ایک پروڈکٹ لائن شامل کریں۔ | حداقل یک خط کالا اضافه کنید. |
| `sup.purchase.grossTotal` | Total payable (incl. tax) | کل واجب الادا (بشمول ٹیکس) | مجموع قابل پرداخت (شامل مالیات) |
| `sup.purchase.inStock` | {qty} {unit} in stock | اسٹاک میں {qty} {unit} | {qty} {unit} در موجودی |
| `sup.purchase.lineTotal` | Line total: {amount} | لائن کل: {amount} | مجموع خط: {amount} |
| `sup.purchase.net` | Goods (net) | مال (خالص) | کالاها (خالص) |
| `sup.purchase.note` | Note | نوٹ | یادداشت |
| `sup.purchase.notePh` | Invoice no, delivery note… | انوائس نمبر، ڈیلیوری نوٹ… | شماره رسید، یادداشت تحویل… |
| `sup.purchase.product` | Product | پروڈکٹ | کالا |
| `sup.purchase.qty` | Qty | مقدار | مقدار |
| `sup.purchase.removeLine` | Remove line | لائن ہٹائیں | خط را حذف کنید |
| `sup.purchase.sub` | From {name}. Stock is increased as soon as you save. | {name} سے خریداری۔ محفوظ کرتے ہی اسٹاک بڑھ جائے گا۔ | از {name}. به محض ذخیره، موجودی افزایش می‌یابد. |
| `sup.purchase.subCompany` | From {name} — {company}. Stock is increased as soon as you save. | {name} — {company} سے خریداری۔ محفوظ کرتے ہی اسٹاک بڑھ جائے گا۔ | از {name} — {company}. به محض ذخیره، موجودی افزایش می‌یابد. |
| `sup.purchase.success` | Purchase of {amount} recorded from {name}. Stock increased; payable updated. | {name} سے {amount} کی خریداری درج ہو گئی۔ اسٹاک بڑھ گیا؛ واجب الادا رقم اپ ڈیٹ ہو گئی۔ | خرید {amount} از {name} ثبت شد. موجودی افزایش یافت؛ قابل پرداخت به‌روز شد. |
| `sup.purchase.tax` | Tax | ٹیکس | مالیات |
| `sup.purchase.title` | Record purchase | خریداری درج کریں | خرید را ثبت کنید |
| `sup.purchase.total` | Purchase total | خریداری کل | مجموع خرید |
| `sup.purchase.unitCost` | Unit cost | فی یونٹ قیمت | هزینه واحد |
| `sup.receiveAgainstPo` | Receive against a purchase order | پرچیز آرڈر کے تحت مال وصول کریں | در برابر سفارش خرید دریافت کنید |
| `sup.searchAria` | Search suppliers | سپلائر تلاش کریں | جستجوی تأمین‌کننده‌گان |
| `sup.searchPlaceholder` | Search name, company or phone… | نام، کمپنی یا فون نمبر تلاش کریں… | نام، شرکت یا تلیفون را جستجو کنید… |
| `sup.subtitle` | Everyone you buy stock from — what you purchased, what you paid, and what is still payable to each supplier. | وہ سب لوگ جن سے آپ اسٹاک خریدتے ہیں — آپ نے کیا خریدا، کیا ادا کیا، اور ہر سپلائر کو کتنا دینا باقی ہے۔ | هر کسی که از او موجودی می‌خرید — چه خریده‌اید، چه پرداخته‌اید، و به هر تأمین‌کننده چقدر باقی است. |
| `sup.th.actions` | Actions | کارروائی | اقدامات |
| `sup.th.balance` | Balance | بیلنس | مانده |
| `sup.th.paid` | Paid | ادا شدہ | پرداخت‌شده |
| `sup.th.phone` | Phone | فون | تلیفون |
| `sup.th.purchased` | Purchased | خریداری | خریداری‌شده |
| `sup.th.supplier` | Supplier | سپلائر | تأمین‌کننده |
| `sup.title` | Suppliers | سپلائرز | تأمین‌کننده‌گان |
## wh

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `nav.warehouses` | Warehouses | گودام | گدام‌ها |
| `wh.add` | Add warehouse | گودام شامل کریں | اضافه كردن گدام |
| `wh.archive` | Archive | محفوظ کریں | آرشیف كنید |
| `wh.archivedBadge` | Archived | محفوظ شدہ | آرشیف شده |
| `wh.cannotArchiveDefault` | The default warehouse cannot be archived — make another warehouse the default first. | طے شدہ گودام محفوظ نہیں ہو سکتا — پہلے کسی اور گودام کو طے شدہ بنائیں۔ | گدام پیش‌فرض آرشیف نمی‌شود — اول گدام دیگری را پیش‌فرض بسازید. |
| `wh.col.available` | Available | دستیاب | در دسترس |
| `wh.col.onHand` | On hand | موجود | موجود |
| `wh.col.product` | Product | پروڈکٹ | كالا |
| `wh.col.promised` | Promised | وعدہ شدہ | وعده داده شده |
| `wh.col.value` | Value | مالیت | ارزش |
| `wh.defaultBadge` | Default | طے شدہ | پیش‌فرض |
| `wh.drift.body` | {count} product(s) have warehouse quantities that no longer add up to their totals — this happens when an older version of the app recorded stock without locations. Your totals and accounts are correct; only the split needs repair. | {count} پروڈکٹ کی گودام وار مقدار ان کے کُل سے نہیں ملتی — ایسا تب ہوتا ہے جب ایپ کے پرانے ورژن نے مقام کے بغیر اسٹاک درج کیا ہو۔ آپ کے کُل اور کھاتے درست ہیں؛ صرف تقسیم کی مرمت درکار ہے۔ | {count} كالا مقدارهای گدامی دارند كه دیگر با مجموع آن‌ها جمع نمی‌شوند — این وقتی اتفاق می‌افتد كه نسخه قدیمی‌تر برنامه موجودی را بدون موقعیت ثبت كرده باشد. مجموع‌ها و حساب‌های شما درست هستند؛ فقط تقسیم به تعمیر نیاز دارد. |
| `wh.drift.done` | Recount complete — {count} product(s) repaired. No accounts were touched. | دوبارہ گنتی مکمل — {count} پروڈکٹ کی مرمت ہو گئی۔ کسی کھاتے کو نہیں چھیڑا گیا۔ | شمارش دوباره تكمیل شد — {count} كالا تعمیر شد. هیچ حسابی لمس نشد. |
| `wh.drift.item` | {name}: locations add up to {rows}, total is {total} | {name}: مقامات کا مجموعہ {rows}، کُل {total} ہے | {name}: موقعیت‌ها به {rows} جمع می‌شوند، مجموع {total} است |
| `wh.drift.recount` | Recount locations | مقامات کی دوبارہ گنتی | شمارش دوباره موقعیت‌ها |
| `wh.drift.title` | Location split needs a recount | مقامات کی تقسیم کو دوبارہ گنتی درکار ہے | تقسیم موقعیت به شمارش دوباره نیاز دارد |
| `wh.edit` | Edit | ترمیم | ویرایش |
| `wh.empty` | No warehouses yet. Add one to split your stock by location. | ابھی کوئی گودام نہیں۔ اسٹاک کو مقامات کے حساب سے بانٹنے کے لیے ایک شامل کریں۔ | هنوز گدامی نیست. یكی اضافه كنید تا موجودی خود را بر اساس موقعیت تقسیم كنید. |
| `wh.err.nameRequired` | Give the warehouse a name. | گودام کا نام لکھیں۔ | به گدام یك نام بدهید. |
| `wh.eyebrow` | Stock locations | اسٹاک کے مقامات | موقعیت‌های موجودی |
| `wh.form.addTitle` | New warehouse | نیا گودام | گدام جدید |
| `wh.form.editTitle` | Edit warehouse | گودام میں ترمیم | ویرایش گدام |
| `wh.form.name` | Name | نام | نام |
| `wh.form.namePh` | e.g. Godown — Shahdara | مثلاً گودام — شاہدرہ | مثلاً گدام — شهدارا |
| `wh.form.note` | Note (address / keeper) | نوٹ (پتہ / نگران) | یادداشت (آدرس / نگهدارنده) |
| `wh.form.notePh` | Optional | اختیاری | اختیاری |
| `wh.makeDefault` | Make default | طے شدہ بنائیں | پیش‌فرض بسازید |
| `wh.notice.archived` | Warehouse archived. Its stock history stays readable. | گودام محفوظ ہو گیا۔ اس کے اسٹاک کی تاریخ پڑھی جا سکے گی۔ | گدام آرشیف شد. تاریخچه موجودی آن قابل خواندن می‌ماند. |
| `wh.notice.created` | Warehouse “{name}” added. | گودام ”{name}“ شامل ہو گیا۔ | گدام “{name}” اضافه شد. |
| `wh.notice.defaultSet` | “{name}” is now the default warehouse. | ”{name}“ اب طے شدہ گودام ہے۔ | “{name}” حالا گدام پیش‌فرض است. |
| `wh.notice.unarchived` | Warehouse restored. | گودام بحال ہو گیا۔ | گدام بازیابی شد. |
| `wh.notice.updated` | Warehouse updated. | گودام اپ ڈیٹ ہو گیا۔ | گدام به‌روز شد. |
| `wh.pickerDefaultSuffix` | (default) | (طے شدہ) | (پیش‌فرض) |
| `wh.pickerLabel` | Warehouse | گودام | گدام |
| `wh.pickerNone` | Default warehouse | طے شدہ گودام | گدام پیش‌فرض |
| `wh.pickerUseDefault` | Shop default | دکان کا طے شدہ | پیش‌فرض دكان |
| `wh.rowQty` | {qty} {unit} here | یہاں {qty} {unit} | {qty} {unit} اینجا |
| `wh.stockEmpty` | Nothing is stocked at this warehouse yet. | اس گودام میں ابھی کوئی اسٹاک نہیں۔ | هنوز چیزی در این گدام موجود نیست. |
| `wh.stockTitle` | Stock by warehouse | گودام کے حساب سے اسٹاک | موجودی بر اساس گدام |
| `wh.subtitle` | The places your stock sits. Every product's total is split across these warehouses; sales, purchases and adjustments each record the warehouse they touched. Stock value is always at the product's one cost price — a warehouse is a place, not a separate business. | وہ جگہیں جہاں آپ کا اسٹاک پڑا ہے۔ ہر پروڈکٹ کی کل مقدار انہی گوداموں میں بٹی ہوئی ہے؛ فروخت، خرید اور ایڈجسٹمنٹ — ہر ایک اپنے گودام کے ساتھ درج ہوتی ہے۔ اسٹاک کی قیمت ہمیشہ پروڈکٹ کی ایک ہی لاگت پر گنی جاتی ہے — گودام ایک جگہ ہے، الگ کاروبار نہیں۔ | جاهایی كه موجودی شما در آن قرار دارد. مجموع هر كالا بین این گدام‌ها تقسیم شده است؛ فروش، خرید و تنظیمات هر كدام گدامی را كه لمس كرده‌اند ثبت می‌كنند. ارزش موجودی همیشه به یك قیمت تمام‌شده كالا است — گدام یك جا است، نه یك تجارت جدا. |
| `wh.title` | Warehouses | گودام | گدام‌ها |
| `wh.totalRow` | All warehouses | تمام گودام | همه گدام‌ها |
| `wh.unarchive` | Restore | بحال کریں | بازیابی كنید |
| `wh.unitsHere` | {qty} units | {qty} یونٹ | {qty} واحد |
| `wh.valueHere` | Stock value {amount} | اسٹاک مالیت {amount} | ارزش موجودی {amount} |
## tr

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `nav.stockTransfers` | Stock Transfers | اسٹاک منتقلی | انتقالات موجودی |
| `tr.action.cancelTransfer` | Cancel transfer | منتقلی منسوخ کریں | لغو انتقال |
| `tr.action.closeShort` | Close with shortage | کمی کے ساتھ بند کریں | بستن با كمبود |
| `tr.action.delete` | Delete | حذف | حذف |
| `tr.action.dispatch` | Dispatch | روانہ کریں | ارسال كنید |
| `tr.action.edit` | Edit | ترمیم | ویرایش |
| `tr.action.print` | Print | پرنٹ | چاپ |
| `tr.action.receive` | Receive goods | سامان وصول کریں | دریافت كالا |
| `tr.action.returnToSource` | Return to source | ماخذ کو واپس | برگرداندن به مبدأ |
| `tr.add` | New transfer | نئی منتقلی | انتقال جدید |
| `tr.close.body` | These goods were sent but never arrived. Closing books them as a stock loss at today's cost — this is the one transfer action that posts to the accounts, and it cannot be undone. | یہ سامان بھیجا گیا تھا مگر کبھی پہنچا نہیں۔ بند کرنے سے یہ آج کی لاگت پر اسٹاک نقصان کے طور پر درج ہو جائے گا — یہ منتقلی کی وہ واحد کارروائی ہے جو کھاتوں میں درج ہوتی ہے، اور یہ واپس نہیں ہو سکتی۔ | این كالاها ارسال شدند اما هرگز نرسیدند. بستن آن‌ها را به قیمت امروز به عنوان زیان موجودی ثبت می‌كند — این تنها اقدام انتقال است كه در حساب‌ها ثبت می‌شود و قابل برگشت نیست. |
| `tr.close.line` | {name} — {qty} short · {amount} | {name} — {qty} کم · {amount} | {name} — {qty} كم · {amount} |
| `tr.close.submit` | Close & book the loss | بند کریں اور نقصان درج کریں | ببندید و زیان را ثبت كنید |
| `tr.close.title` | Close with shortage — {number} | کمی کے ساتھ بند کریں — {number} | بستن با كمبود — {number} |
| `tr.close.total` | Total loss | کل نقصان | زیان مجموعی |
| `tr.col.incoming` | Incoming | آنے والا | ورودی |
| `tr.col.items` | Items | اشیاء | اقلام |
| `tr.col.number` | Transfer | منتقلی | انتقال |
| `tr.col.product` | Product | پروڈکٹ | كالا |
| `tr.col.received` | Received | وصول | دریافت شده |
| `tr.col.remaining` | On the road | راستے میں | در راه |
| `tr.col.route` | Route | راستہ | مسیر |
| `tr.col.sent` | Sent | بھیجا | ارسال شده |
| `tr.col.status` | Status | حالت | حالت |
| `tr.empty` | No transfers yet. Create one to move stock from one warehouse to another. | ابھی کوئی منتقلی نہیں۔ ایک بنائیں اور اسٹاک ایک گودام سے دوسرے میں بھیجیں۔ | هنوز انتقالی نیست. یكی بسازید تا موجودی را از یك گدام به گدام دیگر انتقال دهید. |
| `tr.err.archived` | An archived warehouse cannot send or receive new transfers. | آرکائیو شدہ گودام نئی منتقلی نہ بھیج سکتا ہے نہ وصول کر سکتا ہے۔ | گدام آرشیف‌شده نمی‌تواند انتقال جدید بفرستد یا بگیرد. |
| `tr.err.overReceive` | A line cannot receive more than was sent. Check the quantities. | کسی لائن میں بھیجی گئی مقدار سے زیادہ وصول نہیں ہو سکتا۔ مقداریں جانچیں۔ | یك سطر نمی‌تواند بیشتر از مقدار ارسال‌شده دریافت كند. مقدارها را بررسی كنید. |
| `tr.err.route` | Both warehouses must exist — refresh and try again. | دونوں گودام موجود ہونے چاہئیں — تازہ کر کے دوبارہ کوشش کریں۔ | هر دو گدام باید موجود باشند — تازه‌سازی كنید و دوباره تلاش كنید. |
| `tr.err.same` | Source and destination must be different warehouses. | ماخذ اور منزل الگ الگ گودام ہونے چاہئیں۔ | مبدأ و مقصد باید گدام‌های متفاوت باشند. |
| `tr.eyebrow` | Between warehouses | گوداموں کے درمیان | بین گدام‌ها |
| `tr.form.addTitle` | New stock transfer | نئی اسٹاک منتقلی | انتقال جدید موجودی |
| `tr.form.editTitle` | Edit stock transfer | اسٹاک منتقلی میں ترمیم | ویرایش انتقال موجودی |
| `tr.form.from` | From warehouse | کس گودام سے | از گدام |
| `tr.form.note` | Note | نوٹ | یادداشت |
| `tr.form.notePh` | Optional — vehicle, driver, reason… | اختیاری — گاڑی، ڈرائیور، وجہ… | اختیاری — واسطه، راننده، دلیل… |
| `tr.form.to` | To warehouse | کس گودام کو | به گدام |
| `tr.lines.atSource` | {qty} at source | ماخذ پر {qty} موجود | {qty} در مبدأ |
| `tr.lines.empty` | Add at least one product to move. | منتقل کرنے کے لیے کم از کم ایک پروڈکٹ شامل کریں۔ | برای انتقال حداقل یك كالا اضافه كنید. |
| `tr.lines.noResults` | No product matches “{query}”. | “{query}” سے کوئی پروڈکٹ نہیں ملا۔ | هیچ كالایی با “{query}” مطابقت ندارد. |
| `tr.lines.product` | Product | پروڈکٹ | كالا |
| `tr.lines.searchPh` | Search products — click or Enter to add… | پروڈکٹ تلاش کریں — کلک یا Enter سے شامل کریں… | كالاها را جستجو كنید — برای افزودن كلیك یا Enter… |
| `tr.notice.cancelled` | Transfer cancelled. | منتقلی منسوخ ہو گئی۔ | انتقال لغو شد. |
| `tr.notice.closedShort` | {number} closed — a shortage of {amount} was booked as a stock loss. | {number} بند ہو گئی — {amount} کی کمی اسٹاک نقصان کے طور پر درج ہو گئی۔ | {number} بسته شد — كمبود {amount} به عنوان زیان موجودی ثبت شد. |
| `tr.notice.created` | Draft transfer created. | مسودہ منتقلی بن گئی۔ | انتقال پیش‌نویس ساخته شد. |
| `tr.notice.deleted` | Draft transfer deleted. | مسودہ منتقلی حذف ہو گئی۔ | انتقال پیش‌نویس حذف شد. |
| `tr.notice.dispatched` | {number} dispatched — the goods are on the road. | {number} روانہ ہو گئی — سامان راستے میں ہے۔ | {number} ارسال شد — كالا در راه است. |
| `tr.notice.received` | Receipt recorded for {number}. | {number} کی وصولی درج ہو گئی۔ | رسید {number} ثبت شد. |
| `tr.notice.receivedFull` | {number} fully received. | {number} مکمل وصول ہو گئی۔ | {number} به طور كامل دریافت شد. |
| `tr.notice.returned` | {number} closed — what was still on the road went back to {name}. | {number} بند ہو گئی — جو راستے میں تھا وہ {name} واپس چلا گیا۔ | {number} بسته شد — آنچه هنوز در راه بود به {name} برگشت. |
| `tr.notice.updated` | Transfer updated. | منتقلی تازہ ہو گئی۔ | انتقال به‌روز شد. |
| `tr.print.dispatchedBy` | Dispatched by | روانہ کنندہ | ارسال‌كننده |
| `tr.print.quantitiesNote` | Quantities only — a transfer moves stock between your own warehouses; no value changes hands. | صرف مقداریں — منتقلی آپ کے اپنے گوداموں کے درمیان اسٹاک حرکت دیتی ہے؛ کوئی قیمت ہاتھ نہیں بدلتی۔ | فقط مقدارها — انتقال موجودی را بین گدام‌های خودتان حركت می‌دهد؛ هیچ ارزشی دست به دست نمی‌شود. |
| `tr.print.receivedBy` | Received by | وصول کنندہ | دریافت‌كننده |
| `tr.print.title` | Stock Transfer | اسٹاک منتقلی | انتقال موجودی |
| `tr.receive.fillAll` | Fill all remaining | تمام باقی درج کریں | پر كردن همه باقی‌مانده |
| `tr.receive.help` | Enter what actually arrived this time. Anything left stays on the road and can be received later — or closed as a shortage. | اس بار جو واقعی پہنچا وہ درج کریں۔ جو باقی رہے گا وہ راستے میں رہے گا اور بعد میں وصول ہو سکے گا — یا کمی کے طور پر بند ہو سکے گا۔ | آنچه این بار واقعاً رسید را وارد كنید. بقیه در راه می‌ماند و بعداً دریافت می‌شود — یا به عنوان كمبود بسته می‌شود. |
| `tr.receive.stillOut` | {qty} still on the road | {qty} ابھی راستے میں ہیں | {qty} هنوز در راه است |
| `tr.receive.submit` | Record receipt | وصولی درج کریں | ثبت رسید |
| `tr.receive.thisTime` | Arrived now | اس بار پہنچا | حالا رسید |
| `tr.receive.title` | Receive goods — {number} | سامان وصول کریں — {number} | دریافت كالا — {number} |
| `tr.return.body` | The {qty} unit(s) still on the road go back onto the shelf at {name}. Goods already received stay where they are. | جو {qty} یونٹ ابھی راستے میں ہیں وہ {name} کی شیلف پر واپس چلے جائیں گے۔ جو وصول ہو چکا ہے وہ وہیں رہے گا۔ | آن {qty} واحد كه هنوز در راه است به قفسه در {name} برمی‌گردد. كالای قبلاً دریافت‌شده در جایش می‌ماند. |
| `tr.return.submit` | Return to source | ماخذ کو واپس کریں | برگرداندن به مبدأ |
| `tr.return.title` | Return to source — {number} | ماخذ کو واپس — {number} | برگرداندن به مبدأ — {number} |
| `tr.status.cancelled` | Cancelled | منسوخ | لغو شده |
| `tr.status.dispatched` | Dispatched | روانہ | ارسال شده |
| `tr.status.draft` | Draft | مسودہ | پیش‌نویس |
| `tr.status.partially_received` | Partially received | جزوی وصول | قسماً دریافت شده |
| `tr.status.received` | Received | وصول شدہ | دریافت شده |
| `tr.status.returned` | Returned to source | ماخذ کو واپس | به مبدأ برگردانده شد |
| `tr.subtitle` | Move stock between your own warehouses. Dispatch takes the goods off the source shelf and puts them on the road; receiving lands them at the destination. A transfer moves no money — only a shortage proven at closing posts to the accounts, as a stock loss. | اپنے ہی گوداموں کے درمیان اسٹاک منتقل کریں۔ روانگی سامان کو ماخذ کی شیلف سے اتار کر راستے پر ڈال دیتی ہے؛ وصولی اسے منزل پر اتارتی ہے۔ منتقلی میں کوئی رقم نہیں چلتی — صرف اختتام پر ثابت شدہ کمی کھاتوں میں درج ہوتی ہے، بطور اسٹاک نقصان۔ | موجودی را بین گدام‌های خودتان انتقال دهید. ارسال كالا را از قفسه مبدأ برمی‌دارد و در راه می‌گذارد؛ دریافت آن را در مقصد پیاده می‌كند. انتقال هیچ پولی را حركت نمی‌دهد — فقط كمبودی كه هنگام بستن ثابت شود در حساب‌ها ثبت می‌شود، به عنوان زیان موجودی. |
| `tr.summary.inTransit` | {qty} units on the road | {qty} یونٹ راستے میں ہیں | {qty} واحد در راه است |
| `tr.summary.none` | Nothing on the road | راستے میں کچھ نہیں | چیزی در راه نیست |
| `tr.summary.open` | {count} open transfer(s) | {count} کھلی منتقلیاں | {count} انتقال باز |
| `tr.title` | Stock Transfers | اسٹاک منتقلی | انتقالات موجودی |
## mfg

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `mfg.activeBadge` | Active | فعال | فعال |
| `mfg.addFor` | Add recipe | ترکیب شامل کریں | دستور اضافه کنید |
| `mfg.batchCost` | Batch cost | بیچ کی لاگت | هزینه بچ |
| `mfg.close.confirm` | Close this order? The remaining in-progress value of {amount} will be written off to loss. | یہ آرڈر بند کریں؟ زیرِ تکمیل باقی مالیت {amount} نقصان میں لکھ دی جائے گی۔ | این سفارش بسته شود؟ ارزش در جریان باقی‌مانده {amount} به زیان حذف خواهد شد. |
| `mfg.close.confirmEmpty` | Close this order? Nothing remains in progress for it. | یہ آرڈر بند کریں؟ اس کے لیے زیرِ تکمیل کچھ باقی نہیں۔ | این سفارش بسته شود؟ چیزی در جریان برای آن باقی نمانده است. |
| `mfg.close.submit` | Confirm close | تصدیق کے ساتھ بند کریں | بستن را تأیید کنید |
| `mfg.complete.final` | Final completion — absorb the whole remaining cost pool | حتمی تکمیل — باقی تمام لاگت جذب کر لیں | تکمیل نهایی — کل حوض هزینه باقی‌مانده را جذب کنید |
| `mfg.complete.qty` | Finished units completed | مکمل تیار یونٹ | واحدهای تمام‌شده تکمیل‌شده |
| `mfg.complete.submit` | Record completion | تکمیل درج کریں | تکمیل را ثبت کنید |
| `mfg.complete.title` | Record completion — {name} | تکمیل درج کریں — {name} | تکمیل را ثبت کنید — {name} |
| `mfg.complete.unitCost` | Cost per finished unit | فی تیار یونٹ لاگت | هزینه هر واحد تمام‌شده |
| `mfg.complete.value` | Value into finished stock | تیار اسٹاک میں منتقل مالیت | ارزش به موجودی تمام‌شده |
| `mfg.empty` | No recipes yet. Add one for a product you make — a repack, a blend, an assembly — and production can run against it. | ابھی کوئی ترکیب نہیں۔ جو پروڈکٹ آپ بناتے ہیں — ری پیک، آمیزہ، اسمبلی — اس کی ترکیب شامل کریں، پھر پیداوار اسی کے مطابق چلے گی۔ | هنوز دستوری نیست. یکی برای کالایی که می‌سازید اضافه کنید — یک بسته‌بندی مجدد، یک مخلوط، یک مونتاژ — و تولید می‌تواند در برابر آن اجرا شود. |
| `mfg.err.badBatch` | Batch size must be above zero and costs cannot be negative. | بیچ سائز صفر سے زیادہ ہو اور لاگت منفی نہیں ہو سکتی۔ | اندازه بچ باید بیشتر از صفر باشد و هزینه‌ها نمی‌توانند منفی باشند. |
| `mfg.err.badQty` | Every component needs a quantity above zero. | ہر جز کی مقدار صفر سے زیادہ ہونی چاہیے۔ | هر جز به مقداری بیشتر از صفر نیاز دارد. |
| `mfg.err.emptyLines` | Add at least one component. | کم از کم ایک جز شامل کریں۔ | حداقل یک جز اضافه کنید. |
| `mfg.err.generic` | This recipe could not be saved. | یہ ترکیب محفوظ نہیں ہو سکی۔ | این دستور ذخیره نشد. |
| `mfg.err.outputRaw` | A raw material cannot be a recipe's finished product. | خام مال کسی ترکیب کی تیار پروڈکٹ نہیں ہو سکتی۔ | یک ماده خام نمی‌تواند کالای تمام‌شده یک دستور باشد. |
| `mfg.err.outputRequired` | Choose the finished product first. | پہلے تیار پروڈکٹ منتخب کریں۔ | ابتدا کالای تمام‌شده را انتخاب کنید. |
| `mfg.err.selfComponent` | A product cannot be its own component. | کوئی پروڈکٹ خود اپنا جز نہیں ہو سکتی۔ | یک کالا نمی‌تواند جز خودش باشد. |
| `mfg.ev.accrued` | Accrued (salaries payable) | ادھار (واجب الادا تنخواہیں) | انباشته شد (معاش‌های قابل پرداخت) |
| `mfg.ev.closeout` | Close-out write-off | اختتامی نقصان | حذف بستن |
| `mfg.ev.completion` | Completed | تکمیل | تکمیل شد |
| `mfg.ev.issue` | Materials issued | خام مال جاری ہوا | مواد صادر شد |
| `mfg.ev.labour` | Labour | مزدوری | مزد |
| `mfg.ev.overhead` | Overhead | دیگر خرچ | هزینه اضافی |
| `mfg.ev.paidFrom` | Paid from {name} | {name} سے ادا شدہ | از {name} پرداخت شد |
| `mfg.ev.scrap` | Scrap | خرابی | ضایعات |
| `mfg.eyebrow` | Production | پیداوار | تولید |
| `mfg.form.addComponent` | Add component | جز شامل کریں | جز اضافه کنید |
| `mfg.form.batchSize` | Batch size (finished units) | بیچ سائز (تیار یونٹ) | اندازه بچ (واحدهای تمام‌شده) |
| `mfg.form.componentPh` | Choose a component | جز منتخب کریں | یک جز انتخاب کنید |
| `mfg.form.components` | Components per batch | اجزاء فی بیچ | اجزا در هر بچ |
| `mfg.form.labour` | Labour per batch | مزدوری فی بیچ | مزد در هر بچ |
| `mfg.form.newTitle` | New recipe | نئی ترکیب | دستور جدید |
| `mfg.form.noResults` | No product matches "{query}". | "{query}" سے کوئی پروڈکٹ نہیں ملی۔ | هیچ کالایی با "{query}" مطابقت ندارد. |
| `mfg.form.note` | Note | نوٹ | یادداشت |
| `mfg.form.notePh` | Optional | اختیاری | اختیاری |
| `mfg.form.output` | Finished product | تیار پروڈکٹ | کالای تمام‌شده |
| `mfg.form.outputPh` | Choose a product | پروڈکٹ منتخب کریں | یک کالا انتخاب کنید |
| `mfg.form.overhead` | Overhead per batch | دیگر خرچ فی بیچ | هزینه اضافی در هر بچ |
| `mfg.form.qty` | Qty | مقدار | مقدار |
| `mfg.form.removeLine` | Remove {name} | {name} ہٹائیں | {name} را حذف کنید |
| `mfg.form.save` | Save recipe | ترکیب محفوظ کریں | دستور را ذخیره کنید |
| `mfg.form.saveVersion` | Save as new version | بطور نیا ورژن محفوظ کریں | به‌عنوان نسخه جدید ذخیره کنید |
| `mfg.form.versionTitle` | New version — {name} | نیا ورژن — {name} | نسخه جدید — {name} |
| `mfg.history` | Version history | ورژن کی تاریخ | تاریخچه نسخه‌ها |
| `mfg.immutableNote` | A recipe is never edited in place. Saving a change creates a new version and the old version stays readable forever, so a production order always shows the exact recipe its costs came from. | ترکیب کبھی اپنی جگہ تبدیل نہیں ہوتی۔ تبدیلی محفوظ کرنے سے نیا ورژن بنتا ہے اور پرانا ورژن ہمیشہ قابلِ مطالعہ رہتا ہے، تاکہ ہر پروڈکشن آرڈر ہمیشہ وہی ترکیب دکھائے جس سے اس کی لاگت آئی تھی۔ | یک دستور هرگز در جایش ویرایش نمی‌شود. ذخیره یک تغییر نسخه جدیدی ایجاد می‌کند و نسخه قدیمی برای همیشه خوانا می‌ماند، پس یک سفارش تولید همیشه دستور دقیق هزینه‌هایش را نشان می‌دهد. |
| `mfg.issue.account` | Paid from account | ادائیگی کا اکاؤنٹ | از حساب پرداخت شد |
| `mfg.issue.accrue` | Accrue — owe it (salaries payable) | ادھار رکھیں — تنخواہوں میں واجب الادا | انباشته کنید — بدهکار شوید (معاش‌های قابل پرداخت) |
| `mfg.issue.atWarehouse` | At this warehouse: {qty} {unit} | اس گودام میں: {qty} {unit} | در این گدام: {qty} {unit} |
| `mfg.issue.components` | Components for this run | اس رن کے اجزاء | اجزا برای این اجرا |
| `mfg.issue.labour` | Labour for this run | اس رن کی مزدوری | مزد برای این اجرا |
| `mfg.issue.makeDefault` | Remember this settlement as my default | اس ادائیگی کو میری مستقل پسند رکھیں | این تصفیه را به‌عنوان پیش‌فرض من به یاد داشته باشید |
| `mfg.issue.materialsValue` | Materials value | اجزاء کی مالیت | ارزش مواد |
| `mfg.issue.overhead` | Overhead for this run | اس رن کا دیگر خرچ | هزینه اضافی برای این اجرا |
| `mfg.issue.paidNow` | Paid now from an account | ابھی اکاؤنٹ سے ادا کریں | اکنون از یک حساب پرداخت شد |
| `mfg.issue.runQty` | Run size (finished units intended) | رن کا سائز (تیار یونٹ مطلوب) | اندازه اجرا (واحدهای تمام‌شده مورد نظر) |
| `mfg.issue.settlement` | Labour & overhead settlement | مزدوری و دیگر خرچ کی ادائیگی | تصفیه مزد و هزینه اضافی |
| `mfg.issue.submit` | Issue materials | خام مال جاری کریں | مواد صادر کنید |
| `mfg.issue.title` | Issue materials — {name} | خام مال جاری کریں — {name} | مواد صادر کنید — {name} |
| `mfg.issue.totalValue` | Total into work-in-progress | زیرِ تکمیل میں کل منتقلی | مجموع به کار در جریان |
| `mfg.materialsCost` | Materials | اجزاء | مواد |
| `mfg.newRecipe` | New recipe | نئی ترکیب | دستور جدید |
| `mfg.newVersion` | New version | نیا ورژن | نسخه جدید |
| `mfg.noRecipe` | No recipe yet | ابھی ترکیب نہیں | هنوز دستوری نیست |
| `mfg.perBatchSuffix` | per batch | فی بیچ | در هر بچ |
| `mfg.po.cancel` | Cancel order | آرڈر منسوخ کریں | سفارش را لغو کنید |
| `mfg.po.close` | Close order | آرڈر بند کریں | سفارش را ببندید |
| `mfg.po.complete` | Record completion | تکمیل درج کریں | تکمیل را ثبت کنید |
| `mfg.po.completedTotal` | Absorbed into finished stock | تیار اسٹاک میں جذب شدہ | جذب‌شده در موجودی تمام‌شده |
| `mfg.po.delete` | Delete draft | مسودہ حذف کریں | پیش‌نویس را حذف کنید |
| `mfg.po.draftLabel` | Draft | مسودہ | پیش‌نویس |
| `mfg.po.edit` | Edit draft | مسودہ بدلیں | پیش‌نویس را ویرایش کنید |
| `mfg.po.empty` | No production orders yet. Create one from a recipe to start making a product. | ابھی کوئی پروڈکشن آرڈر نہیں۔ کسی ترکیب سے آرڈر بنائیں اور پروڈکٹ بنانا شروع کریں۔ | هنوز سفارش تولیدی نیست. یکی از یک دستور ایجاد کنید تا ساخت یک کالا را شروع کنید. |
| `mfg.po.err.badQty` | Quantities must be above zero. | مقدار صفر سے زیادہ ہونی چاہیے۔ | مقدارها باید بیشتر از صفر باشند. |
| `mfg.po.err.emptyPool` | Nothing is in progress for this order — issue materials first. | اس آرڈر کے لیے زیرِ تکمیل کچھ نہیں — پہلے خام مال جاری کریں۔ | چیزی در جریان برای این سفارش نیست — ابتدا مواد صادر کنید. |
| `mfg.po.err.generic` | This production action could not be saved. | یہ پیداواری عمل محفوظ نہیں ہو سکا۔ | این اقدام تولید ذخیره نشد. |
| `mfg.po.err.insufficient` | Not enough {name} at the order's warehouse. | آرڈر کے گودام میں {name} کافی نہیں۔ | {name} کافی در گدام سفارش نیست. |
| `mfg.po.err.noAccount` | No money account is available for the payment. | ادائیگی کے لیے کوئی رقم اکاؤنٹ دستیاب نہیں۔ | هیچ حساب پولی برای پرداخت موجود نیست. |
| `mfg.po.err.notOpen` | This order is closed to further events. | یہ آرڈر مزید واقعات کے لیے بند ہے۔ | این سفارش برای رویدادهای بیشتر بسته است. |
| `mfg.po.err.outputGone` | The finished product no longer exists. | تیار پروڈکٹ اب موجود نہیں۔ | کالای تمام‌شده دیگر وجود ندارد. |
| `mfg.po.err.zeroValue` | This issue would move no value — give the run materials or conversion costs. | اس اجراء سے کوئی مالیت منتقل نہیں ہوتی — رن کو اجزاء یا تبدیلی لاگت دیں۔ | این صدور هیچ ارزشی را جابه‌جا نمی‌کند — به اجرا مواد یا هزینه‌های تبدیل بدهید. |
| `mfg.po.events` | Production record | پیداوار کا ریکارڈ | سابقه تولید |
| `mfg.po.form.editTitle` | Edit draft — {name} | مسودہ بدلیں — {name} | پیش‌نویس را ویرایش کنید — {name} |
| `mfg.po.form.plannedQty` | Planned quantity (finished units) | منصوبہ شدہ مقدار (تیار یونٹ) | مقدار پلان‌شده (واحدهای تمام‌شده) |
| `mfg.po.form.recipe` | Recipe (finished product) | ترکیب (تیار پروڈکٹ) | دستور (کالای تمام‌شده) |
| `mfg.po.form.recipePh` | Choose a recipe | ترکیب منتخب کریں | یک دستور انتخاب کنید |
| `mfg.po.form.save` | Create order | آرڈر بنائیں | سفارش ایجاد کنید |
| `mfg.po.form.saveEdit` | Save changes | تبدیلیاں محفوظ کریں | تغییرات را ذخیره کنید |
| `mfg.po.form.title` | New production order | نیا پروڈکشن آرڈر | سفارش تولید جدید |
| `mfg.po.issue` | Issue materials | خام مال جاری کریں | مواد صادر کنید |
| `mfg.po.issuedTotal` | Issued into production | پیداوار میں جاری شدہ | صادرشده به تولید |
| `mfg.po.new` | New production order | نیا پروڈکشن آرڈر | سفارش تولید جدید |
| `mfg.po.noEvents` | No production events yet. | ابھی کوئی پیداواری واقعہ نہیں۔ | هنوز رویداد تولیدی نیست. |
| `mfg.po.open` | Open order | آرڈر کھولیں | سفارش را باز کنید |
| `mfg.po.planned` | Planned | منصوبہ شدہ | پلان‌شده |
| `mfg.po.pool` | In progress (WIP) | زیرِ تکمیل (WIP) | در جریان (WIP) |
| `mfg.po.print` | Print order | آرڈر چھاپیں | سفارش را چاپ کنید |
| `mfg.po.produced` | Produced | تیار شدہ | تولیدشده |
| `mfg.po.recipe` | Recipe | ترکیب | دستور |
| `mfg.po.remaining` | Remaining | باقی | باقی‌مانده |
| `mfg.po.scrap` | Record scrap | خرابی درج کریں | ضایعات را ثبت کنید |
| `mfg.po.snapshotNote` | Recipe snapshot — version {v}. Later recipe versions never change this order's costs. | ترکیب کا عکس — ورژن {v}۔ بعد کے ورژن اس آرڈر کی لاگت کبھی نہیں بدلتے۔ | عکس دستور — نسخه {v}. نسخه‌های بعدی دستور هرگز هزینه‌های این سفارش را تغییر نمی‌دهند. |
| `mfg.po.status.cancelled` | Cancelled | منسوخ | لغو شد |
| `mfg.po.status.completed` | Completed | مکمل | تکمیل شد |
| `mfg.po.status.draft` | Draft | مسودہ | پیش‌نویس |
| `mfg.po.status.open` | Open | کھلا | باز |
| `mfg.po.sub` | Run production against a recipe: issue materials into work-in-progress, land finished units at their absorbed cost, and write off what spoils. | کسی ترکیب کے مطابق پیداوار چلائیں: خام مال زیرِ تکمیل کام میں جاری کریں، تیار یونٹ ان کی جذب شدہ لاگت پر اتاریں، اور خراب ہونے والا حصہ نقصان میں لکھیں۔ | تولید را در برابر یک دستور اجرا کنید: مواد را به کار در جریان صادر کنید، واحدهای تمام‌شده را با هزینه جذب‌شده‌شان بنشانید، و آنچه خراب می‌شود را حذف کنید. |
| `mfg.po.title` | Production orders | پروڈکشن آرڈرز | سفارش‌های تولید |
| `mfg.po.unitCostNow` | Cost per produced unit | فی تیار یونٹ لاگت | هزینه هر واحد تولیدشده |
| `mfg.po.writtenOff` | Written off (scrap + close-out) | نقصان میں لکھا گیا (خراب + اختتامی) | حذف‌شده (ضایعات + بستن) |
| `mfg.print.components` | Recipe (per batch) | ترکیب (فی بیچ) | دستور (در هر بچ) |
| `mfg.print.events` | Production record | پیداوار کا ریکارڈ | سابقه تولید |
| `mfg.print.planned` | Planned | منصوبہ شدہ | پلان‌شده |
| `mfg.print.pool` | In progress | زیرِ تکمیل | در جریان |
| `mfg.print.produced` | Produced | تیار شدہ | تولیدشده |
| `mfg.print.title` | Production order | پروڈکشن آرڈر | سفارش تولید |
| `mfg.raw.sub` | Products classed as raw material — their stock value sits in the Raw materials account and recipes consume them. Set a product's class in Inventory. | خام مال کی قسم والی پروڈکٹس — ان کی اسٹاک مالیت خام مال کے کھاتے میں رہتی ہے اور ترکیبیں انہیں استعمال کرتی ہیں۔ پروڈکٹ کی قسم انوینٹری میں مقرر کریں۔ | کالاهایی که به‌عنوان مواد خام طبقه‌بندی شده‌اند — ارزش موجودی آن‌ها در حساب مواد خام می‌نشیند و دستورها آن‌ها را مصرف می‌کنند. طبقه یک کالا را در موجودی تنظیم کنید. |
| `mfg.raw.title` | Raw materials on the shelf | شیلف پر خام مال | مواد خام روی قفسه |
| `mfg.scrap.qty` | Units spoiled | خراب یونٹ | واحدهای خراب‌شده |
| `mfg.scrap.submit` | Record scrap | خرابی درج کریں | ضایعات را ثبت کنید |
| `mfg.scrap.title` | Record scrap — {name} | خرابی درج کریں — {name} | ضایعات را ثبت کنید — {name} |
| `mfg.scrap.value` | Value written off | نقصان میں لکھی مالیت | ارزش حذف‌شده |
| `mfg.subtitle` | Recipes (BOMs) for the products you make: what one batch consumes, what it yields, and what a finished unit costs. Recipes never post anything — production does, when it runs. | آپ کی بنائی ہوئی پروڈکٹس کی ترکیبیں (BOM): ایک بیچ میں کیا لگتا ہے، کیا بنتا ہے، اور ایک تیار یونٹ کی لاگت کیا پڑتی ہے۔ ترکیب خود کچھ پوسٹ نہیں کرتی — پوسٹنگ پیداوار چلنے پر ہوتی ہے۔ | دستورها (BOMs) برای کالاهایی که می‌سازید: یک بچ چه مصرف می‌کند، چه تولید می‌کند، و یک واحد تمام‌شده چقدر هزینه دارد. دستورها هرگز چیزی ثبت نمی‌کنند — تولید این کار را می‌کند، وقتی اجرا شود. |
| `mfg.supersededBadge` | Superseded | پرانا ورژن | جایگزین‌شده |
| `mfg.title` | Manufacturing | مینوفیکچرنگ | تولید |
| `mfg.unitCost` | Cost per finished unit | فی تیار یونٹ لاگت | هزینه هر واحد تمام‌شده |
| `mfg.version` | Version {v} | ورژن {v} | نسخه {v} |
| `mfg.yields` | Yields {qty} {unit} per batch | فی بیچ {qty} {unit} بنتے ہیں | در هر بچ {qty} {unit} تولید می‌کند |
| `nav.manufacturing` | Manufacturing | مینوفیکچرنگ | تولید |
## jobs

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `job.act.advance` | Record advance | پیشگی درج کریں | پیش‌پرداخت ثبت کنید |
| `job.act.bill` | Bill this job | اس جاب کا بل بنائیں | این کار را بل کنید |
| `job.act.cancel` | Cancel job | جاب منسوخ کریں | کار را لغو کنید |
| `job.act.deliver` | Mark delivered | ترسیل شدہ لکھیں | تحویل‌شده علامت بزنید |
| `job.act.edit` | Edit job | جاب میں ترمیم | کار را ویرایش کنید |
| `job.act.issue` | Issue materials | سامان جاری کریں | مواد صادر کنید |
| `job.act.labour` | Set labour | مزدوری درج کریں | مزد را تنظیم کنید |
| `job.act.print` | Print work slip | ورک سلپ چھاپیں | رسید کار را چاپ کنید |
| `job.act.return` | Return materials | سامان واپس کریں | مواد را برگردانید |
| `job.act.stage` | Move to stage | مرحلہ بدلیں | به مرحله بروید |
| `job.adv.account` | Into account | اکاؤنٹ میں | به حساب |
| `job.adv.accountDefault` | Method's default account | طریقے کا طے شدہ اکاؤنٹ | حساب پیش‌فرض روش |
| `job.adv.amount` | Amount | رقم | مبلغ |
| `job.adv.done` | Advance of {amount} recorded for {number}. | {number} کے لیے {amount} پیشگی درج ہو گئی۔ | پیش‌پرداخت {amount} برای {number} ثبت شد. |
| `job.adv.errAmount` | Enter an amount greater than zero. | صفر سے زیادہ رقم درج کریں۔ | مبلغی بیشتر از صفر وارد کنید. |
| `job.adv.errCheque` | Complete the cheque details first. | پہلے چیک کی تفصیل مکمل کریں۔ | ابتدا جزئیات چک را تکمیل کنید. |
| `job.adv.errFailed` | The advance could not be recorded. Nothing was written. | پیشگی درج نہیں ہو سکی۔ کچھ نہیں لکھا گیا۔ | پیش‌پرداخت ثبت نشد. چیزی نوشته نشد. |
| `job.adv.method` | Received by | وصولی کا طریقہ | دریافت‌شده توسط |
| `job.adv.save` | Record advance | پیشگی درج کریں | پیش‌پرداخت ثبت کنید |
| `job.adv.sub` | An advance is ordinary money in against this customer's future bill — it sits in the customer's pool and the job's bill absorbs it when posted. | پیشگی اس کسٹمر کے آئندہ بل کے خلاف عام رقم ہے — یہ کسٹمر کے کھاتے میں رہتی ہے اور بل بنتے ہی جاب کا بل اسے جذب کر لیتا ہے۔ | یک پیش‌پرداخت پول عادی در برابر بل آینده این مشتری است — در حوض مشتری می‌نشیند و بل کار وقتی ثبت شود آن را جذب می‌کند. |
| `job.adv.title` | Record advance — {number} | پیشگی درج کریں — {number} | پیش‌پرداخت ثبت کنید — {number} |
| `job.advances` | Advances | پیشگی رقمیں | پیش‌پرداخت‌ها |
| `job.advanceTotal` | Advances received | موصولہ پیشگی | پیش‌پرداخت‌های دریافتی |
| `job.bill.materialsSub` | These goods already left the shelf and were charged to the job's cost — do not add them as bill lines again. | یہ سامان شیلف سے نکل چکا ہے اور جاب کی لاگت میں شامل ہے — اسے دوبارہ بل کی لائنوں میں نہ ڈالیں۔ | این کالاها قبلاً قفسه را ترک کرده‌اند و به هزینه کار گرفته شده‌اند — آن‌ها را دوباره به‌عنوان خط‌های بل اضافه نکنید. |
| `job.bill.materialsTitle` | Materials already issued to {number} | {number} کو پہلے سے جاری شدہ سامان | مواد قبلاً صادرشده به {number} |
| `job.billCogs` | Bill goods cost | بل کے سامان کی لاگت | هزینه کالاهای بل |
| `job.bills` | Bills | بل | بل‌ها |
| `job.confirm.cancel` | Cancel job {number}? | کیا جاب {number} منسوخ کر دی جائے؟ | کار {number} لغو شود؟ |
| `job.confirm.deliver` | Mark {number} as delivered? | کیا {number} کو ترسیل شدہ لکھ دیا جائے؟ | {number} به‌عنوان تحویل‌شده علامت زده شود؟ |
| `job.due` | Due | ترسیل کی تاریخ | سررسید |
| `job.empty` | No jobs yet. Take a customer's work order — the job is born with its number, ready to go on the customer's slip. | ابھی کوئی جاب نہیں۔ کسٹمر کا ورک آرڈر لیں — جاب اپنے نمبر کے ساتھ پیدا ہوتی ہے، کسٹمر کی پرچی پر لکھنے کے لیے تیار۔ | هنوز کاری نیست. یک سفارش کاری مشتری را بگیرید — کار با شماره‌اش متولد می‌شود، آماده است روی رسید مشتری برود. |
| `job.ev.issue` | Issued | جاری شدہ | صادر شد |
| `job.ev.return` | Returned | واپس شدہ | برگردانده شد |
| `job.eyebrow` | Workshop | ورکشاپ | ورکشاپ |
| `job.form.customer` | Customer | کسٹمر | مشتری |
| `job.form.customerPh` | Choose a customer | کسٹمر منتخب کریں | یک مشتری انتخاب کنید |
| `job.form.description` | Description | تفصیل | توضیحات |
| `job.form.due` | Due date | ترسیل کی تاریخ | تاریخ سررسید |
| `job.form.editTitle` | Edit job — {number} | جاب میں ترمیم — {number} | کار را ویرایش کنید — {number} |
| `job.form.errName` | The customer's name is required. | کسٹمر کا نام ضروری ہے۔ | نام مشتری ضروری است. |
| `job.form.errSave` | The job could not be saved. Nothing was written. | جاب محفوظ نہیں ہو سکی۔ کچھ نہیں لکھا گیا۔ | کار ذخیره نشد. چیزی نوشته نشد. |
| `job.form.errTitle` | Give the job a title — the work, in a few words. | جاب کو ایک عنوان دیں — کام، چند الفاظ میں۔ | به کار یک عنوان بدهید — کار، در چند کلمه. |
| `job.form.errWarehouse` | That warehouse is no longer available. | وہ گودام اب دستیاب نہیں۔ | آن گدام دیگر موجود نیست. |
| `job.form.labour` | Declared labour (for job profit) | درج مزدوری (جاب منافع کے لیے) | مزد اعلام‌شده (برای مفاد کار) |
| `job.form.name` | Customer name | کسٹمر کا نام | نام مشتری |
| `job.form.newTitle` | New job | نئی جاب | کار جدید |
| `job.form.note` | Note | نوٹ | یادداشت |
| `job.form.phone` | Phone | فون | تلیفون |
| `job.form.save` | Create job | جاب بنائیں | کار ایجاد کنید |
| `job.form.saveEdit` | Save changes | تبدیلیاں محفوظ کریں | تغییرات را ذخیره کنید |
| `job.form.title` | Work title | کام کا عنوان | عنوان کار |
| `job.form.titlePh` | e.g. Wedding cards × 500 | مثلاً شادی کارڈ × 500 | مثال: کارت‌های عروسی × 500 |
| `job.form.warehouseLocked` | The warehouse is fixed once materials have been issued to the job. | سامان جاری ہونے کے بعد جاب کا گودام تبدیل نہیں ہوتا۔ | گدام وقتی ثابت می‌شود که مواد به کار صادر شده باشند. |
| `job.labour` | Labour | مزدوری | مزد |
| `job.mat.addLine` | Add product | پروڈکٹ شامل کریں | کالا اضافه کنید |
| `job.mat.available` | {qty} available here | یہاں {qty} دستیاب | {qty} اینجا موجود است |
| `job.mat.err.bad_qty` | Quantities must be greater than zero. | مقدار صفر سے زیادہ ہونی چاہیے۔ | مقدارها باید بیشتر از صفر باشند. |
| `job.mat.err.empty_lines` | Pick at least one product. | کم از کم ایک پروڈکٹ منتخب کریں۔ | حداقل یک کالا انتخاب کنید. |
| `job.mat.err.failed` | The materials could not be posted. Nothing was written. | سامان پوسٹ نہیں ہو سکا۔ کچھ نہیں لکھا گیا۔ | مواد ثبت نشدند. چیزی نوشته نشد. |
| `job.mat.err.insufficient` | Not enough stock at the job's warehouse for {name}. | جاب کے گودام میں {name} کا اسٹاک کافی نہیں۔ | موجودی کافی در گدام کار برای {name} نیست. |
| `job.mat.err.not_active` | This job is closed — materials no longer move on it. | یہ جاب بند ہے — اب اس پر سامان نہیں چلتا۔ | این کار بسته است — مواد دیگر روی آن حرکت نمی‌کنند. |
| `job.mat.err.over_return` | The job holds only {qty} of {name} to return. | جاب کے پاس واپسی کے لیے صرف {qty} {name} ہے۔ | کار فقط {qty} از {name} را برای برگرداندن دارد. |
| `job.mat.err.unknown_product` | A picked product no longer exists. | منتخب پروڈکٹ اب موجود نہیں۔ | یک کالای انتخاب‌شده دیگر وجود ندارد. |
| `job.mat.err.zero_value` | These materials carry no cost — there is nothing to post. | اس سامان کی کوئی لاگت نہیں — پوسٹ کرنے کو کچھ نہیں۔ | این مواد هیچ هزینه‌ای ندارند — چیزی برای ثبت نیست. |
| `job.mat.held` | {qty} with the job | جاب کے پاس {qty} | {qty} نزد کار |
| `job.mat.issueSave` | Issue materials | سامان جاری کریں | مواد صادر کنید |
| `job.mat.issueTitle` | Issue materials — {number} | سامان جاری کریں — {number} | مواد صادر کنید — {number} |
| `job.mat.product` | Product | پروڈکٹ | کالا |
| `job.mat.productPh` | Choose a product | پروڈکٹ منتخب کریں | یک کالا انتخاب کنید |
| `job.mat.qty` | Qty | مقدار | مقدار |
| `job.mat.removeLine` | Remove {name} | {name} ہٹائیں | {name} را حذف کنید |
| `job.mat.returnSave` | Return materials | سامان واپس کریں | مواد را برگردانید |
| `job.mat.returnTitle` | Return materials — {number} | سامان واپس کریں — {number} | مواد را برگردانید — {number} |
| `job.mat.value` | Value | مالیت | ارزش |
| `job.materials` | Materials | سامان | مواد |
| `job.new` | New job | نئی جاب | کار جدید |
| `job.noAdvances` | No advances recorded for this job. | اس جاب پر کوئی پیشگی درج نہیں۔ | برای این کار پیش‌پرداختی ثبت نشده است. |
| `job.noBills` | Not billed yet. | ابھی بل نہیں بنا۔ | هنوز بل نشده است. |
| `job.noDue` | No due date | کوئی تاریخ مقرر نہیں | تاریخ سررسیدی نیست |
| `job.noMaterials` | No materials issued yet. | ابھی کوئی سامان جاری نہیں ہوا۔ | هنوز موادی صادر نشده است. |
| `job.noResults` | No jobs match your search. | آپ کی تلاش سے کوئی جاب نہیں ملی۔ | هیچ کاری با جستجوی شما مطابقت ندارد. |
| `job.notice.cancelled` | {number} cancelled. | {number} منسوخ ہو گئی۔ | {number} لغو شد. |
| `job.notice.created` | Job {number} created. | جاب {number} بن گئی۔ | کار {number} ایجاد شد. |
| `job.notice.delivered` | {number} marked delivered. | {number} ترسیل شدہ لکھ دی گئی۔ | {number} تحویل‌شده علامت زده شد. |
| `job.notice.draftReady` | Billing job {number} — compose the charge lines. Materials already issued to this job are listed below and must not be billed again. | جاب {number} کا بل بن رہا ہے — چارج لائنیں ترتیب دیں۔ اس جاب کو پہلے سے جاری شدہ سامان نیچے درج ہے اور اسے دوبارہ بل میں نہیں ڈالنا۔ | بل کردن کار {number} — خط‌های هزینه را تنظیم کنید. مواد قبلاً صادرشده به این کار در پایین فهرست شده‌اند و نباید دوباره بل شوند. |
| `job.notice.issued` | Materials issued to {number}. | {number} کو سامان جاری ہو گیا۔ | مواد به {number} صادر شد. |
| `job.notice.returned` | Materials returned from {number}. | {number} سے سامان واپس آ گیا۔ | مواد از {number} برگردانده شد. |
| `job.notice.stage` | {number} moved to {stage}. | {number} مرحلہ {stage} پر چلی گئی۔ | {number} به {stage} رفت. |
| `job.notice.updated` | Job {number} updated. | جاب {number} تازہ ہو گئی۔ | کار {number} به‌روز شد. |
| `job.overdue` | Overdue | تاریخ گزر گئی | از موعد گذشته |
| `job.print.customer` | Customer | کسٹمر | مشتری |
| `job.print.due` | Due date | ترسیل کی تاریخ | تاریخ سررسید |
| `job.print.issued` | Issued | جاری شدہ | صادرشده |
| `job.print.labour` | Labour | مزدوری | مزد |
| `job.print.materials` | Materials issued | جاری شدہ سامان | مواد صادرشده |
| `job.print.net` | Net materials | خالص سامان | مواد خالص |
| `job.print.noMaterials` | No materials issued. | کوئی سامان جاری نہیں ہوا۔ | موادی صادر نشده است. |
| `job.print.receivedBy` | Received by | وصول کنندہ | دریافت‌کننده |
| `job.print.returned` | Returned | واپس شدہ | برگردانده‌شده |
| `job.print.stage` | Stage | مرحلہ | مرحله |
| `job.print.title` | Work slip | ورک سلپ | رسید کار |
| `job.profit` | Job profit | جاب کا منافع | مفاد کار |
| `job.revenue` | Billed | بل شدہ | بل‌شده |
| `job.searchPh` | Search jobs… | جاب تلاش کریں… | کارها را جستجو کنید… |
| `job.stage` | Stage | مرحلہ | مرحله |
| `job.stages.reset` | Use defaults | طے شدہ مراحل لیں | از پیش‌فرض‌ها استفاده کنید |
| `job.stages.save` | Save stages | مراحل محفوظ کریں | مراحل را ذخیره کنید |
| `job.stages.saved` | Job stages saved. | جاب کے مراحل محفوظ ہو گئے۔ | مراحل کار ذخیره شد. |
| `job.stages.sub` | The workshop stages a job moves through — one per line, in order. A new job starts at the first; reaching the last marks it Ready. Jobs keep the stage name they already carry if you rename the list. | ورکشاپ کے وہ مراحل جن سے جاب گزرتی ہے — ہر سطر میں ایک، اسی ترتیب میں۔ نئی جاب پہلے مرحلے سے شروع ہوتی ہے؛ آخری مرحلے پر پہنچنا اسے تیار لکھتا ہے۔ فہرست کے نام بدلنے سے جابوں پر موجود مرحلے کے نام نہیں بدلتے۔ | مراحل ورکشاپ که یک کار از آن‌ها می‌گذرد — یکی در هر خط، به ترتیب. یک کار جدید از اولی شروع می‌شود؛ رسیدن به آخری آن را آماده علامت می‌زند. کارها نام مرحله‌ای را که قبلاً دارند نگه می‌دارند اگر فهرست را تغییر نام دهید. |
| `job.stages.title` | Job stages | جاب کے مراحل | مراحل کار |
| `job.status.cancelled` | Cancelled | منسوخ | لغو شد |
| `job.status.delivered` | Delivered | ترسیل شدہ | تحویل داده شد |
| `job.status.in_progress` | In progress | جاری | در جریان |
| `job.status.open` | Open | کھلی | باز |
| `job.status.ready` | Ready | تیار | آماده |
| `job.subtitle` | Customer work orders — printing, binding, made-to-order work — tracked from receipt to delivery: materials issued to the job, advances held in the customer's pool, and the bill that settles it. | کسٹمر کے ورک آرڈر — چھپائی، جلد بندی، فرمائشی کام — وصولی سے ترسیل تک: جاب پر جاری شدہ سامان، کسٹمر کے کھاتے میں موجود پیشگی رقم، اور اسے نبٹانے والا بل۔ | سفارش‌های کاری مشتری — چاپ، صحافی، کار سفارشی — از دریافت تا تحویل ردیابی می‌شود: مواد صادرشده به کار، پیش‌پرداخت‌های نگهداشته‌شده در حوض مشتری، و بلی که آن را تصفیه می‌کند. |
| `job.title` | Job Tracker | جاب ٹریکر | ردیاب کار |
| `nav.jobs` | Jobs | جابز | کارها |
## hr

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `att.cellAria` | {name}, day {day}: {mark} | {name}، دن {day}: {mark} | {name}, روز {day}: {mark} |
| `att.col.employee` | Employee | ملازم | کارمند |
| `att.col.summary` | Summary | خلاصہ | خلاصه |
| `att.empty` | No active employees yet — add staff in the Directory tab and the register opens for them. | ابھی کوئی فعال ملازم نہیں — ڈائریکٹری ٹیب میں عملہ شامل کریں، رجسٹر ان کے لیے کھل جائے گا۔ | هنوز هیچ کارمند فعالی نیست — در بخش فهرست کارمند اضافه کنید و دفتر برای آن‌ها باز می‌شود. |
| `att.help` | Unmarked days stay blank: the register never assumes a day was worked. | بے نشان دن خالی رہتے ہیں: رجسٹر کبھی خود سے کسی دن کو کام کا دن نہیں مانتا۔ | روزهای بدون علامت خالی می‌مانند: دفتر هرگز فرض نمی‌کند روزی کار شده است. |
| `att.legend` | Marks: P present · A absent · H half day · L leave · O weekly off. One tap cycles to the next mark; tapping an off day clears it back to unmarked. | نشانات: P حاضر · A غیر حاضر · H آدھا دن · L چھٹی · O ہفتہ وار چھٹی۔ ہر بار چھونے سے اگلا نشان آتا ہے؛ ہفتہ وار چھٹی والے دن کو چھونے سے نشان صاف ہو جاتا ہے۔ | علامت‌ها: P حاضر · A غایب · H نیم روز · L رخصتی · O رخصتی هفتگی. یک ضربه به علامت بعدی می‌رود؛ زدن روی روز رخصتی آن را به بدون علامت پاک می‌کند. |
| `att.mark.absent` | Absent | غیر حاضر | غایب |
| `att.mark.half` | Half day | آدھا دن | نیم روز |
| `att.mark.leave` | Leave | چھٹی | رخصتی |
| `att.mark.none` | Unmarked | نشان نہیں | بدون علامت |
| `att.mark.off` | Weekly off | ہفتہ وار چھٹی | رخصتی هفتگی |
| `att.mark.present` | Present | حاضر | حاضر |
| `att.nextMonth` | Next month | اگلا مہینہ | ماه آینده |
| `att.postedWarning` | A payroll run for this month is already posted. Editing these marks changes no posted slip — it would only change a re-run, which the payroll reversal flow governs. | اس مہینے کا تنخواہ رن پہلے ہی درج ہو چکا ہے۔ ان نشانات کی تبدیلی کسی درج شدہ پرچی کو نہیں بدلتی — یہ صرف دوبارہ رن کو بدلے گی، جو تنخواہ کے ریورسل طریقے کے تابع ہے۔ | یک اجرای معاش برای این ماه قبلاً ثبت شده است. تغییر این علامت‌ها هیچ فیش ثبت‌شده‌ای را تغییر نمی‌دهد — فقط یک اجرای دوباره را تغییر می‌دهد، که روند برگشت معاش آن را اداره می‌کند. |
| `att.prevMonth` | Previous month | پچھلا مہینہ | ماه گذشته |
| `att.short.absent` | A | A | A |
| `att.short.half` | H | H | H |
| `att.short.leave` | L | L | L |
| `att.short.off` | O | O | O |
| `att.short.present` | P | P | P |
| `att.subtitle` | Tap a day to cycle its mark. The register records time only — it never posts money; payroll reads it when a run is composed. | کسی دن کو چھوئیں تو اس کا نشان بدل جائے گا۔ رجسٹر صرف وقت درج کرتا ہے — کبھی رقم درج نہیں کرتا؛ تنخواہ رن بنتے وقت اسی کو پڑھتی ہے۔ | روی یک روز بزنید تا علامتش بچرخد. دفتر فقط وقت را ثبت می‌کند — هرگز پول ثبت نمی‌کند؛ معاش وقتی یک اجرا ساخته می‌شود آن را می‌خواند. |
| `att.summary` | P {present} · A {absent} · H {half} · L {leave} | P {present} · A {absent} · H {half} · L {leave} | P {present} · A {absent} · H {half} · L {leave} |
| `att.title` | Attendance register | حاضری رجسٹر | دفتر حاضری |
| `nav.staff` | Staff | عملہ | کارمندان |
| `pay.action.advance` | Give advance | پیشگی دیں | پیش‌پرداخت بدهید |
| `pay.action.deleteDraft` | Delete draft | مسودہ حذف کریں | پیش‌نویس را حذف کنید |
| `pay.action.finalise` | Finalise & post | حتمی کریں اور درج کریں | نهایی و ثبت کنید |
| `pay.action.open` | Open | کھولیں | باز کنید |
| `pay.action.pay` | Pay | ادائیگی | پرداخت کنید |
| `pay.action.reversePayment` | Reverse | واپس لیں | برگردانید |
| `pay.action.reverseRun` | Reverse run | رن واپس لیں | اجرا را برگردانید |
| `pay.action.slip` | Slip | پرچی | فیش |
| `pay.advance.caption` | An advance is money ahead of earnings: it debits the employee's salary position, never an expense. It is recovered from future salary by derivation — the next run's slip shows the recovery. | پیشگی کمائی سے پہلے کی رقم ہے: یہ ملازم کی تنخواہ صورتحال کو ڈیبٹ کرتی ہے، خرچ کبھی نہیں بنتی۔ اس کی وصولی آئندہ تنخواہ سے خود بخود اخذ ہوتی ہے — اگلے رن کی پرچی وصولی دکھائے گی۔ | پیش‌پرداخت پول پیش از درآمد است: وضعیت معاش کارمند را بدهکار می‌کند، هرگز مصرف نیست. از معاش آینده با استنتاج بازیافته می‌شود — فیش اجرای بعدی بازیابی را نشان می‌دهد. |
| `pay.advance.done` | Advance of {amount} given to {name}. | {name} کو {amount} پیشگی دی گئی۔ | پیش‌پرداخت {amount} به {name} داده شد. |
| `pay.advance.errAmount` | Enter an advance amount above zero. | پیشگی کی رقم صفر سے زیادہ لکھیں۔ | مبلغ پیش‌پرداختی بالاتر از صفر بنویسید. |
| `pay.advance.title` | Salary advance — {name} | تنخواہ پیشگی — {name} | پیش‌پرداخت معاش — {name} |
| `pay.back` | All runs | تمام رنز | همه اجراها |
| `pay.bucket.caption` | Production orders accrued {amount} of labour and overhead to salaries payable without naming a person (the order, not the worker, was the record). Pay it here against any posted run; the ledger total falls the same either way. | پیداواری آرڈرز نے {amount} کی مزدوری اور بالائی خرچ کسی شخص کا نام لیے بغیر واجب الادا تنخواہوں میں جمع کیا تھا (ریکارڈ آرڈر تھا، مزدور نہیں)۔ کسی بھی درج شدہ رن کے ذریعے یہاں ادائیگی کریں؛ کھاتے کا مجموعہ دونوں صورتوں میں ایک جیسا گھٹتا ہے۔ | سفارش‌های تولید {amount} کار و سربار را بدون نام بردن از یک شخص به معاش‌های قابل پرداخت مستحق کردند (سفارش سابقه بود، نه کارگر). اینجا در برابر هر اجرای ثبت‌شده پرداخت کنید؛ مجموع دفتر در هر صورت یکسان کم می‌شود. |
| `pay.bucket.title` | Production labour awaiting payment | ادائیگی کی منتظر پیداواری مزدوری | کار تولیدی در انتظار پرداخت |
| `pay.casualHint` | Casual day labour that is NOT on this directory is still paid from Expenses (salary category). A person on payroll must be paid through payroll, or their pay double-counts. | جو عارضی مزدور اس ڈائریکٹری میں نہیں، اس کی ادائیگی بدستور اخراجات سے (تنخواہ زمرہ) ہوتی ہے۔ جو شخص تنخواہ فہرست میں ہے، اس کی ادائیگی تنخواہ ہی سے ہو — ورنہ اس کی رقم دگنی گنی جائے گی۔ | کار روزانه اتفاقی که در این فهرست نیست هنوز از مصارف پرداخت می‌شود (دسته معاش). شخصی که در فهرست معاش است باید از طریق معاش پرداخت شود، وگرنه معاشش دو برابر حساب می‌شود. |
| `pay.col.deductions` | Deductions | کٹوتیاں | کسورات |
| `pay.col.gross` | Gross | مجموعی | ناخالص |
| `pay.col.month` | Month | مہینہ | ماه |
| `pay.col.net` | Net accrued | خالص مستحق | خالص مستحق |
| `pay.col.paid` | Paid | ادا شدہ | پرداخت شده |
| `pay.col.run` | Run | رن | اجرا |
| `pay.col.status` | Status | حیثیت | حالت |
| `pay.compose` | Compose run | رن بنائیں | اجرا بسازید |
| `pay.det.accrued` | Accrued (this run) | مستحق (اس رن) | مستحق (این اجرا) |
| `pay.det.advanceBefore` | Advance before | سابقہ پیشگی | پیش‌پرداخت قبلی |
| `pay.det.paid` | Paid (this run) | ادا شدہ (اس رن) | پرداخت شده (این اجرا) |
| `pay.det.recovered` | Advance recovered | وصول شدہ پیشگی | پیش‌پرداخت بازیافته |
| `pay.det.settled` | Settled | حساب صاف | تسویه شده |
| `pay.det.stillOwed` | Still owed | بقایا واجب | هنوز باقیمانده |
| `pay.detail.caption` | Accrued, advanced, paid and still owed — every figure derives from the journal and this run's payment events; nothing here is typed in. | مستحق، پیشگی، ادا شدہ اور بقایا واجب — ہر عدد جرنل اور اس رن کے ادائیگی واقعات سے اخذ ہوتا ہے؛ یہاں کچھ ہاتھ سے نہیں لکھا جاتا۔ | مستحق، پیش‌پرداخت‌شده، پرداخت‌شده و هنوز باقیمانده — هر رقم از ژورنال و رویدادهای پرداخت این اجرا گرفته می‌شود؛ اینجا چیزی با دست نوشته نمی‌شود. |
| `pay.draftLabel` | Draft (unnumbered) | مسودہ (بے نمبر) | پیش‌نویس (بدون شماره) |
| `pay.editor.caption` | Lines were composed from the attendance register and each employee's current terms. Adjust allowances or add deductions — the figures you finalise are exactly what posts. Absence beyond paid leave is already inside the earned base. | یہ سطریں حاضری رجسٹر اور ہر ملازم کی موجودہ شرائط سے بنی ہیں۔ الاؤنس بدلیں یا کٹوتی شامل کریں — جو اعداد آپ حتمی کریں گے، عین وہی درج ہوں گے۔ تنخواہ سمیت چھٹی سے زائد غیر حاضری پہلے ہی کمایا ہوا بنیادی حصے میں شامل ہے۔ | سطرها از دفتر حاضری و شرایط فعلی هر کارمند ساخته شده‌اند. کمک‌هزینه‌ها را تنظیم کنید یا کسورات اضافه کنید — ارقامی که نهایی می‌کنید دقیقاً همان است که ثبت می‌شود. غیبت فراتر از رخصتی با معاش قبلاً داخل پایه به‌دست‌آمده است. |
| `pay.editor.title` | Run for {month} | {month} کا رن | اجرای {month} |
| `pay.empty.none` | No payroll runs yet. Compose the first run for a month — it starts as a draft and posts nothing until you finalise it. | ابھی کوئی تنخواہ رن نہیں۔ کسی مہینے کا پہلا رن بنائیں — یہ مسودے سے شروع ہوتا ہے اور حتمی ہونے تک کچھ درج نہیں کرتا۔ | هنوز هیچ اجرای معاشی نیست. اولین اجرا را برای یک ماه بسازید — به صورت پیش‌نویس شروع می‌شود و تا نهایی شدن چیزی ثبت نمی‌کند. |
| `pay.finalise.confirmBody` | This posts ONE journal entry: salary expense {net} against salaries payable, per employee at net. The run can afterwards only be corrected by reversing it. Payments are recorded separately as salaries are handed out. | اس سے جرنل میں ایک ہی اندراج درج ہوگا: تنخواہ خرچ {net} بمقابلہ واجب الادا تنخواہیں، فی ملازم خالص بنیاد پر۔ اس کے بعد رن کی درستگی صرف اسے واپس لے کر ہو سکتی ہے۔ ادائیگیاں تنخواہ دیتے وقت الگ سے درج ہوتی ہیں۔ | این یک مدخل ژورنال ثبت می‌کند: مصرف معاش {net} در برابر معاش‌های قابل پرداخت، برای هر کارمند به خالص. اجرا بعد از آن فقط با برگرداندن اصلاح می‌شود. پرداخت‌ها جداگانه وقتی معاش‌ها داده می‌شوند ثبت می‌شوند. |
| `pay.finalise.confirmTitle` | Finalise {number}? | {number} حتمی کریں؟ | {number} نهایی شود؟ |
| `pay.finalise.nothing` | Nothing accrues in this run (every line nets to zero), so there is no entry to post. | اس رن میں کچھ مستحق نہیں بنتا (ہر سطر کا خالص صفر ہے)، اس لیے درج کرنے کے لیے کوئی اندراج نہیں۔ | در این اجرا چیزی مستحق نمی‌شود (هر سطر به صفر می‌رسد)، پس مدخلی برای ثبت نیست. |
| `pay.finalise.postedMonth` | A posted run already covers {month}. Reverse it first if the month must be re-run — two accruals for one month would double the expense. | {month} کا ایک درج شدہ رن پہلے سے موجود ہے۔ مہینہ دوبارہ چلانا ہو تو پہلے اسے واپس لیں — ایک مہینے کے دو اندراج خرچ دگنا کر دیں گے۔ | یک اجرای ثبت‌شده قبلاً {month} را پوشش می‌دهد. اگر ماه باید دوباره اجرا شود اول آن را برگردانید — دو استحقاق برای یک ماه مصرف را دو برابر می‌کند. |
| `pay.history.col.net` | Net accrued | خالص مستحق | خالص مستحق |
| `pay.history.col.paid` | Paid | ادا شدہ | پرداخت شده |
| `pay.history.col.run` | Run | رن | اجرا |
| `pay.history.empty` | No payroll runs cite this employee yet. | ابھی کوئی تنخواہ رن اس ملازم کا حوالہ نہیں دیتا۔ | هنوز هیچ اجرای معاشی به این کارمند اشاره نمی‌کند. |
| `pay.history.title` | Salary history | تنخواہ کی تاریخ | تاریخ معاش |
| `pay.line.addAllowance` | Add allowance | الاؤنس شامل کریں | کمک‌هزینه اضافه کنید |
| `pay.line.addDeduction` | Add deduction | کٹوتی شامل کریں | کسر اضافه کنید |
| `pay.line.allowances` | Allowances | الاؤنسز | کمک‌هزینه‌ها |
| `pay.line.days` | P · A · H · L | ح · غ · آ · چ | P · A · H · L |
| `pay.line.deductions` | Deductions | کٹوتیاں | کسورات |
| `pay.line.earned` | Earned base | کمایا ہوا بنیاد | پایه به‌دست‌آمده |
| `pay.line.employee` | Employee | ملازم | کارمند |
| `pay.line.gross` | Gross | مجموعی | ناخالص |
| `pay.line.net` | Net | خالص | خالص |
| `pay.line.removeRow` | Remove line | سطر ہٹائیں | سطر را حذف کنید |
| `pay.monthLabel` | Month | مہینہ | ماه |
| `pay.noteLabel` | Run note | رن کا نوٹ | یادداشت اجرا |
| `pay.notePh` | Optional | اختیاری | اختیاری |
| `pay.notice.bucketPaid` | Paid {amount} against production labour. | پیداواری مزدوری کے خلاف {amount} ادا کیے گئے۔ | {amount} در برابر کار تولیدی پرداخت شد. |
| `pay.notice.composed` | Draft run composed for {month}. | {month} کا مسودہ رن بن گیا۔ | اجرای پیش‌نویس برای {month} ساخته شد. |
| `pay.notice.deleted` | Draft run deleted. | مسودہ رن حذف ہو گیا۔ | اجرای پیش‌نویس حذف شد. |
| `pay.notice.finalised` | {number} finalised — the accrual is in the journal. | {number} حتمی ہو گیا — اندراج جرنل میں درج ہے۔ | {number} نهایی شد — استحقاق در ژورنال است. |
| `pay.notice.paid` | Paid {amount} to {name}. | {name} کو {amount} ادا کیے گئے۔ | {amount} به {name} پرداخت شد. |
| `pay.notice.paymentReversed` | Payment reversed — the mirror entry is in the journal. | ادائیگی واپس ہو گئی — آئینہ اندراج جرنل میں درج ہے۔ | پرداخت برگردانده شد — مدخل آینه‌ای در ژورنال است. |
| `pay.notice.runReversed` | {number} reversed. The month can be re-run. | {number} واپس لیا گیا۔ مہینہ دوبارہ چل سکتا ہے۔ | {number} برگردانده شد. ماه می‌تواند دوباره اجرا شود. |
| `pay.notice.saved` | Draft saved. | مسودہ محفوظ ہو گیا۔ | پیش‌نویس ذخیره شد. |
| `pay.pay.account` | From account | کس کھاتے سے | از حساب |
| `pay.pay.amount` | Amount (Rs) | رقم (روپے) | مبلغ (Rs) |
| `pay.pay.bucketRemaining` | Unassigned balance: {amount} | بے نام بقایا: {amount} | مانده بدون نام: {amount} |
| `pay.pay.errAmount` | Enter an amount above zero and no more than what is still owed. | رقم صفر سے زیادہ اور بقایا واجب سے زیادہ نہ لکھیں۔ | مبلغی بالاتر از صفر و نه بیشتر از آنچه هنوز باقیمانده است بنویسید. |
| `pay.pay.method` | Paid by | ادائیگی کا ذریعہ | پرداخت شده توسط |
| `pay.pay.remaining` | Still to pay on this run: {amount} | اس رن پر بقایا ادائیگی: {amount} | هنوز برای پرداخت در این اجرا: {amount} |
| `pay.pay.title` | Pay salary | تنخواہ کی ادائیگی | معاش را پرداخت کنید |
| `pay.payments.bucketRow` | Production labour (unassigned) | پیداواری مزدوری (بے نام) | کار تولیدی (بدون نام) |
| `pay.payments.empty` | No payments recorded yet. | ابھی کوئی ادائیگی درج نہیں۔ | هنوز هیچ پرداختی ثبت نشده است. |
| `pay.payments.reversedRow` | Reversal of a payment | ادائیگی کی واپسی | برگشت یک پرداخت |
| `pay.payments.title` | Payments | ادائیگیاں | پرداخت‌ها |
| `pay.reverse.confirmBody` | A mirror entry undoes the accrual and the run reads Reversed; the month can then be re-run. Payments already made STAND — the money really moved — and now sit as advance positions for those employees. | ایک آئینہ اندراج اس استحقاق کو ختم کر دے گا اور رن «واپس لیا گیا» پڑھا جائے گا؛ پھر مہینہ دوبارہ چل سکتا ہے۔ پہلے کی گئی ادائیگیاں برقرار رہتی ہیں — رقم حقیقت میں گئی تھی — اور اب ان ملازمین کی پیشگی صورتحال میں شامل ہیں۔ | یک مدخل آینه‌ای استحقاق را خنثی می‌کند و اجرا برگشت داده شده خوانده می‌شود؛ ماه بعد می‌تواند دوباره اجرا شود. پرداخت‌هایی که قبلاً انجام شده باقی می‌مانند — پول واقعاً حرکت کرده — و حالا به صورت وضعیت پیش‌پرداخت برای آن کارمندان قرار دارند. |
| `pay.reverse.confirmTitle` | Reverse {number}? | {number} واپس لیں؟ | {number} برگردانده شود؟ |
| `pay.saveDraft` | Save draft | مسودہ محفوظ کریں | پیش‌نویس را ذخیره کنید |
| `pay.status.draft` | Draft | مسودہ | پیش‌نویس |
| `pay.status.posted` | Posted | درج شدہ | ثبت شده |
| `pay.status.reversed` | Reversed | واپس لیا گیا | برگشت داده شده |
| `pay.subtitle` | One run per month: composed from the register, finalised into the journal as a single net accrual, then paid in cash or bank. Corrections are reversals — a posted run is never edited. | ہر مہینے ایک رن: رجسٹر سے بنتا ہے، ایک ہی خالص اندراج کی صورت میں جرنل میں درج ہوتا ہے، پھر نقد یا بینک سے ادائیگی ہوتی ہے۔ درستگی ریورسل سے ہوتی ہے — درج شدہ رن میں کبھی ترمیم نہیں ہوتی۔ | هر ماه یک اجرا: از دفتر ساخته می‌شود، به صورت یک استحقاق خالص در ژورنال نهایی می‌شود، بعد نقد یا بانکی پرداخت می‌شود. اصلاحات برگشت هستند — یک اجرای ثبت‌شده هرگز ویرایش نمی‌شود. |
| `pay.title` | Payroll runs | تنخواہ رنز | اجراهای معاش |
| `slip.advAfter` | Advance still outstanding | اب بھی بقایا پیشگی | پیش‌پرداخت هنوز باقیمانده |
| `slip.advances` | Advances | پیشگیاں | پیش‌پرداخت‌ها |
| `slip.advBefore` | Advance outstanding before this run | اس رن سے پہلے بقایا پیشگی | پیش‌پرداخت باقیمانده قبل از این اجرا |
| `slip.advRecovered` | Recovered from this salary | اس تنخواہ سے وصول | از این معاش بازیافته |
| `slip.att.counts` | Present {present} · Absent {absent} · Half {half} · Leave {leave} | حاضر {present} · غیر حاضر {absent} · آدھا دن {half} · چھٹی {leave} | حاضر {present} · غایب {absent} · نیم {half} · رخصتی {leave} |
| `slip.att.days` | {days} days in month | مہینے کے {days} دن | {days} روز در ماه |
| `slip.attendance` | Attendance | حاضری | حاضری |
| `slip.base` | Base salary (earned) | بنیادی تنخواہ (کمائی ہوئی) | معاش پایه (به‌دست‌آمده) |
| `slip.deductions` | Deductions | کٹوتیاں | کسورات |
| `slip.designation` | Designation | عہدہ | وظیفه |
| `slip.earnings` | Earnings | آمدنی | درآمدها |
| `slip.employee` | Employee | ملازم | کارمند |
| `slip.gross` | Gross | مجموعی | ناخالص |
| `slip.month` | Month | مہینہ | ماه |
| `slip.net` | Net accrued | خالص مستحق | خالص مستحق |
| `slip.paid` | Paid | ادا شدہ | پرداخت شده |
| `slip.print` | Print slip | پرچی چھاپیں | فیش را چاپ کنید |
| `slip.signature` | Employee signature | ملازم کے دستخط | امضای کارمند |
| `slip.stillOwed` | Still owed | بقایا واجب | هنوز باقیمانده |
| `slip.title` | Salary slip | تنخواہ پرچی | فیش معاش |
| `staff.action.deactivate` | Deactivate | غیر فعال کریں | غیرفعال کنید |
| `staff.action.reactivate` | Reactivate | دوبارہ فعال کریں | دوباره فعال کنید |
| `staff.action.view` | View | دیکھیں | ببینید |
| `staff.add` | Add employee | ملازم شامل کریں | کارمند اضافه کنید |
| `staff.badge.active` | Active | فعال | فعال |
| `staff.badge.inactive` | Inactive | غیر فعال | غیرفعال |
| `staff.delete.aria` | Delete employee | ملازم حذف کریں | کارمند را حذف کنید |
| `staff.delete.blocked` | This employee has records (attendance, payroll or journal entries), so they can only be deactivated — history is never deleted. | اس ملازم کا ریکارڈ موجود ہے (حاضری، تنخواہ یا جرنل اندراجات)، اس لیے اسے صرف غیر فعال کیا جا سکتا ہے — تاریخ کبھی حذف نہیں ہوتی۔ | این کارمند سوابق دارد (حاضری، معاش یا مدخل‌های ژورنال)، پس فقط می‌تواند غیرفعال شود — تاریخ هرگز حذف نمی‌شود. |
| `staff.delete.body` | “{name}” has no attendance, payroll, loan or journal records, so the directory entry can be removed. This cannot be undone. | “{name}” کا کوئی حاضری، تنخواہ، قرض یا جرنل ریکارڈ نہیں، اس لیے ڈائریکٹری کا اندراج ہٹایا جا سکتا ہے۔ یہ عمل واپس نہیں ہو سکتا۔ | “{name}” هیچ سابقه حاضری، معاش، قرض یا ژورنال ندارد، پس مدخل فهرست می‌تواند حذف شود. این قابل بازگشت نیست. |
| `staff.delete.keep` | Keep | رکھیں | نگه دارید |
| `staff.delete.title` | Delete this employee? | یہ ملازم حذف کریں؟ | این کارمند حذف شود؟ |
| `staff.empty.noMatch` | No employee matches your search. | کوئی ملازم آپ کی تلاش سے میل نہیں کھاتا۔ | هیچ کارمندی با جستجوی شما مطابقت ندارد. |
| `staff.empty.none` | No employees yet. Add your first team member to open the directory and the attendance register. | ابھی کوئی ملازم نہیں۔ ڈائریکٹری اور حاضری رجسٹر کھولنے کے لیے پہلا رکن شامل کریں۔ | هنوز هیچ کارمندی نیست. اولین عضو تیم خود را اضافه کنید تا فهرست و دفتر حاضری باز شود. |
| `staff.err.baseInvalid` | Enter the pay amount (0 or more). | تنخواہ کی رقم لکھیں (0 یا زیادہ)۔ | مبلغ معاش را بنویسید (0 یا بیشتر). |
| `staff.err.nameRequired` | Give the employee a name. | ملازم کا نام لکھیں۔ | به کارمند نام بدهید. |
| `staff.eyebrow` | Team & attendance | عملہ اور حاضری | تیم و حاضری |
| `staff.form.addAllowance` | Add allowance | الاؤنس شامل کریں | کمک‌هزینه اضافه کنید |
| `staff.form.addSub` | Identity and current pay terms. A raise edited here changes future payroll runs only — posted runs keep their snapshots. | شناخت اور موجودہ تنخواہ کی شرائط۔ یہاں کی گئی تبدیلی صرف آئندہ تنخواہ رنز پر لاگو ہوگی — درج شدہ رنز اپنے سنیپ شاٹ برقرار رکھتے ہیں۔ | هویت و شرایط فعلی معاش. افزایشی که اینجا ویرایش شود فقط اجراهای آینده معاش را تغییر می‌دهد — اجراهای ثبت‌شده عکس‌های خود را نگه می‌دارند. |
| `staff.form.addTitle` | New employee | نیا ملازم | کارمند جدید |
| `staff.form.allowanceAmountPh` | Amount | رقم | مبلغ |
| `staff.form.allowanceLabelPh` | Label — e.g. Transport | عنوان — مثلاً کرایہ سفر | عنوان — مثلاً ترانسپورت |
| `staff.form.allowances` | Fixed allowances | مقررہ الاؤنسز | کمک‌هزینه‌های ثابت |
| `staff.form.baseDaily` | Daily rate (Rs) | روزانہ شرح (روپے) | نرخ روزانه (Rs) |
| `staff.form.baseMonthly` | Monthly base salary (Rs) | ماہانہ بنیادی تنخواہ (روپے) | معاش پایه ماهانه (Rs) |
| `staff.form.basis.daily` | Daily wage | روزانہ اجرت | مزد روزانه |
| `staff.form.basis.monthly` | Monthly salary | ماہانہ تنخواہ | معاش ماهانه |
| `staff.form.designation` | Designation | عہدہ | وظیفه |
| `staff.form.designationPh` | e.g. Salesman, Darzi, Driver | مثلاً سیلز مین، درزی، ڈرائیور | مثلاً فروشنده، خیاط، راننده |
| `staff.form.editSub` | Terms are the employee's CURRENT terms; runs already posted keep the terms they snapshotted. | شرائط ملازم کی موجودہ شرائط ہیں؛ پہلے سے درج رنز وہی شرائط رکھتے ہیں جو انہوں نے سنیپ شاٹ کی تھیں۔ | شرایط، شرایط فعلی کارمند است؛ اجراهایی که قبلاً ثبت شده‌اند شرایطی را نگه می‌دارند که عکس گرفته بودند. |
| `staff.form.editTitle` | Edit employee | ملازم میں ترمیم | کارمند را ویرایش کنید |
| `staff.form.joinDate` | Joining date | ملازمت کی تاریخ | تاریخ شروع کار |
| `staff.form.linkedEmail` | Linked login email (optional) | منسلک لاگ اِن ای میل (اختیاری) | ایمیل ورود مرتبط (اختیاری) |
| `staff.form.linkedEmailPh` | Only if this person also signs in | صرف تب جب یہ شخص سائن اِن بھی کرتا ہو | فقط اگر این شخص وارد هم می‌شود |
| `staff.form.linkedHelp` | Informational only — it grants no access and gates nothing. Logins and roles are managed in Settings. | صرف معلوماتی — نہ یہ رسائی دیتا ہے، نہ کسی چیز کی شرط ہے۔ لاگ اِن اور کردار ترتیبات میں منظم ہوتے ہیں۔ | فقط اطلاعاتی — هیچ دسترسی نمی‌دهد و هیچ چیزی را مشروط نمی‌کند. ورودها و نقش‌ها در تنظیمات مدیریت می‌شوند. |
| `staff.form.name` | Name | نام | نام |
| `staff.form.namePh` | e.g. Muhammad Imran | مثلاً محمد عمران | مثلاً محمد عمران |
| `staff.form.note` | Note | نوٹ | یادداشت |
| `staff.form.notePh` | Optional | اختیاری | اختیاری |
| `staff.form.paidLeaveDays` | Paid leave days / month | ماہانہ تنخواہ سمیت چھٹیاں | روزهای رخصتی با معاش / ماه |
| `staff.form.paidLeaveHelp` | Monthly basis only: absences within this allowance do not reduce the salary; beyond it, pay is docked pro-rata over the month's days. Daily-basis staff are paid per day present. | صرف ماہانہ بنیاد کے لیے: اس حد کے اندر غیر حاضری تنخواہ نہیں گھٹاتی؛ اس سے آگے تنخواہ مہینے کے دنوں کے تناسب سے کٹتی ہے۔ روزانہ بنیاد والے عملے کو حاضر دنوں کی اجرت ملتی ہے۔ | فقط مبنای ماهانه: غیبت در داخل این مقدار معاش را کم نمی‌کند؛ فراتر از آن، معاش به تناسب روزهای ماه کسر می‌شود. کارمندان روزانه برای هر روز حاضر پرداخت می‌شوند. |
| `staff.form.payBasis` | Pay basis | تنخواہ کی بنیاد | مبنای معاش |
| `staff.form.phone` | Phone | فون | تلفن |
| `staff.form.phonePh` | 03xx-xxxxxxx | 03xx-xxxxxxx | 03xx-xxxxxxx |
| `staff.form.removeAllowance` | Remove allowance | الاؤنس ہٹائیں | کمک‌هزینه را حذف کنید |
| `staff.form.saveChanges` | Save changes | تبدیلیاں محفوظ کریں | تغییرات را ذخیره کنید |
| `staff.noteBox` | Positions are read from the double-entry journal (salaries payable, per employee) — never typed in. Deactivated staff keep their full history and can be reactivated any time. | صورتحال ڈبل انٹری جرنل سے پڑھی جاتی ہے (فی ملازم واجب الادا تنخواہیں) — کبھی ہاتھ سے نہیں لکھی جاتی۔ غیر فعال عملے کی مکمل تاریخ محفوظ رہتی ہے اور وہ کسی بھی وقت دوبارہ فعال ہو سکتے ہیں۔ | وضعیت‌ها از ژورنال دوطرفه خوانده می‌شود (معاش‌های قابل پرداخت، برای هر کارمند) — هرگز با دست نوشته نمی‌شود. کارمندان غیرفعال تاریخ کامل خود را نگه می‌دارند و هر وقت می‌توانند دوباره فعال شوند. |
| `staff.notice.added` | “{name}” added to the directory. | “{name}” ڈائریکٹری میں شامل ہو گیا۔ | “{name}” به فهرست اضافه شد. |
| `staff.notice.deactivated` | “{name}” deactivated — their history stays readable. | “{name}” غیر فعال ہو گیا — اس کی تاریخ پڑھنے کے لیے موجود رہے گی۔ | “{name}” غیرفعال شد — تاریخش برای خواندن باقی می‌ماند. |
| `staff.notice.deleted` | “{name}” deleted. | “{name}” حذف ہو گیا۔ | “{name}” حذف شد. |
| `staff.notice.reactivated` | “{name}” is active again. | “{name}” دوبارہ فعال ہو گیا۔ | “{name}” دوباره فعال است. |
| `staff.notice.updated` | Employee updated. | ملازم کی تفصیل تازہ ہو گئی۔ | کارمند به‌روز شد. |
| `staff.pay.daily` | {amount} / day | {amount} / دن | {amount} / روز |
| `staff.pay.monthly` | {amount} / month | {amount} / ماہ | {amount} / ماه |
| `staff.pos.advance` | Advance {amount} | پیشگی {amount} | پیش‌پرداخت {amount} |
| `staff.pos.owed` | Owed {amount} | واجب الادا {amount} | باقیمانده {amount} |
| `staff.pos.settled` | Settled | حساب صاف | تسویه شده |
| `staff.profile.advance` | Advance outstanding | بقایا پیشگی | پیش‌پرداخت باقیمانده |
| `staff.profile.aria` | Employee detail | ملازم کی تفصیل | جزئیات کارمند |
| `staff.profile.attendanceThisMonth` | This month so far: {present} present · {absent} absent · {half} half · {leave} leave | اس ماہ اب تک: {present} حاضر · {absent} غیر حاضر · {half} آدھا دن · {leave} چھٹی | در این ماه تا حالا: {present} حاضر · {absent} غایب · {half} نیم · {leave} رخصتی |
| `staff.profile.joined` | Joined {date} | ملازمت: {date} | شروع کار {date} |
| `staff.profile.noPhone` | No phone recorded | فون درج نہیں | تلفن ثبت نشده |
| `staff.profile.owed` | Shop owes them | دکان کے ذمے واجب | دکان به او بدهکار است |
| `staff.profile.payrollNote` | Salary accruals, advances and payments join this position as payroll runs are posted; the figures above are always derived from the journal, never stored. | تنخواہ کے رنز درج ہوتے جائیں گے تو مستحق تنخواہ، پیشگیاں اور ادائیگیاں اسی صورتحال میں شامل ہوتی جائیں گی؛ اوپر کے اعداد ہمیشہ جرنل سے اخذ ہوتے ہیں، کبھی ذخیرہ نہیں ہوتے۔ | استحقاق معاش، پیش‌پرداخت‌ها و پرداخت‌ها وقتی اجراهای معاش ثبت می‌شوند به این وضعیت می‌پیوندند؛ ارقام بالا همیشه از ژورنال گرفته می‌شوند، هرگز ذخیره نمی‌شوند. |
| `staff.profile.positionTitle` | Salary position (from the journal) | تنخواہ کی صورتحال (جرنل سے) | وضعیت معاش (از ژورنال) |
| `staff.profile.terms` | Current terms | موجودہ شرائط | شرایط فعلی |
| `staff.searchAria` | Search employees | ملازمین تلاش کریں | کارمندان را جستجو کنید |
| `staff.searchPlaceholder` | Search name, phone or designation… | نام، فون یا عہدہ تلاش کریں… | نام، تلفن یا وظیفه را جستجو کنید… |
| `staff.subtitle` | Everyone who works here — their terms, their attendance, and what the journal says they are owed. Employees are not logins: most staff never sign in, and their records live here, not in Settings. | یہاں کام کرنے والے تمام افراد — ان کی شرائط، ان کی حاضری، اور جرنل کے مطابق ان کی واجب الادا رقم۔ ملازمین لاگ اِن نہیں ہوتے: بیشتر عملہ کبھی سائن اِن نہیں کرتا، اور ان کا ریکارڈ یہیں رہتا ہے، ترتیبات میں نہیں۔ | همه کسانی که اینجا کار می‌کنند — شرایط‌شان، حاضری‌شان، و آنچه ژورنال می‌گوید به آن‌ها بدهکار است. کارمندان ورود نیستند: بیشتر کارمندان هرگز وارد نمی‌شوند، و سوابق‌شان اینجا است، نه در تنظیمات. |
| `staff.tab.attendance` | Attendance | حاضری | حاضری |
| `staff.tab.directory` | Directory | ڈائریکٹری | فهرست |
| `staff.tab.payroll` | Payroll | تنخواہ | معاش |
| `staff.tabsAria` | Staff sections | عملے کے حصے | بخش‌های کارمندان |
| `staff.th.actions` | Actions | اعمال | اقدامات |
| `staff.th.designation` | Designation | عہدہ | وظیفه |
| `staff.th.name` | Name | نام | نام |
| `staff.th.pay` | Pay | تنخواہ | معاش |
| `staff.th.phone` | Phone | فون | تلفن |
| `staff.th.position` | Position | صورتحال | وضعیت |
| `staff.th.status` | Status | حیثیت | حالت |
| `staff.title` | Staff | عملہ | کارمندان |
## loyalty

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `bill.earnPreview` | This bill earns {points} points | اس بل پر {points} پوائنٹس بنیں گے | این بل {points} امتیاز به دست می‌آورد |
| `bill.payPoints` | Points | پوائنٹس | امتیازها |
| `bill.pointsBalance` | Points available | دستیاب پوائنٹس | امتیازهای موجود |
| `bill.pointsMaxNote` | Up to {cap}% of this bill can be paid in points. | اس بل کا زیادہ سے زیادہ {cap} فیصد پوائنٹس سے ادا ہو سکتا ہے۔ | تا {cap}% این بل با امتیاز پرداخت می‌شود. |
| `bill.pointsNeedsCustomer` | Points can only be used on a named customer's bill. | پوائنٹس صرف نام والے گاہک کے بل پر استعمال ہو سکتے ہیں۔ | امتیازها فقط در بل یك مشتری نام‌دار استفاده می‌شوند. |
| `bill.pointsPart` | Points | پوائنٹس | امتیازها |
| `bill.pointsUsePh` | Points to use | استعمال کرنے کے پوائنٹس | امتیازهای قابل استفاده |
| `bill.walkinNoEarn` | Walk-in bills don't earn loyalty points — add the customer to earn. | بے نام بل پر پوائنٹس نہیں بنتے — پوائنٹس کے لیے گاہک شامل کریں۔ | بل‌های مهمان امتیاز وفاداری به دست نمی‌آورند — برای به دست آوردن، مشتری را اضافه كنید. |
| `cust.loyaltyPoints` | Loyalty points | وفاداری پوائنٹس | امتیازهای وفاداری |
| `loyalty.col.customer` | Customer | گاہک | مشتری |
| `loyalty.col.nextExpiry` | Next expiry | اگلی میعاد ختم | انقضای بعدی |
| `loyalty.col.points` | Points | پوائنٹس | امتیازها |
| `loyalty.col.tier` | Tier | درجہ | سطح |
| `loyalty.col.value` | Value | مالیت | ارزش |
| `loyalty.customersWithBalance` | Customers with points | پوائنٹس رکھنے والے گاہک | مشتریان با امتیاز |
| `loyalty.empty` | No customer has loyalty points yet. Points are earned automatically on a named customer's bill while the programme is on. | ابھی کسی گاہک کے پاس پوائنٹس نہیں ہیں۔ پروگرام آن ہو تو نام والے گاہک کے بل پر پوائنٹس خود بخود بنتے ہیں۔ | هنوز هیچ مشتریی امتیاز وفاداری ندارد. امتیازها به طور خودكار در بل یك مشتری نام‌دار به دست می‌آیند وقتی برنامه روشن باشد. |
| `loyalty.expiredSub` | These points passed their expiry date. They still count in the liability above until you post the release — posting moves them out of the liability and back against the programme's cost. Nothing expires on its own. | ان پوائنٹس کی میعاد گزر چکی ہے۔ جب تک آپ ان کی رہائی درج نہیں کرتے، یہ اوپر والی ذمہ داری میں شامل رہتے ہیں — درج کرنے سے یہ ذمہ داری سے نکل کر پروگرام کی لاگت کے مقابل واپس آ جاتے ہیں۔ کوئی پوائنٹ خود سے ختم نہیں ہوتا۔ | این امتیازها از تاریخ انقضای خود گذشته‌اند. تا وقتی آزادسازی را ثبت نكنید، هنوز در بدهی بالا حساب می‌شوند — ثبت كردن آن‌ها را از بدهی خارج می‌كند و در برابر هزینه برنامه برمی‌گرداند. هیچ چیزی خودبه‌خود منقضی نمی‌شود. |
| `loyalty.expiredTitle` | Expired — not yet posted | ختم شدہ — ابھی درج نہیں | منقضی شده — هنوز ثبت نشده |
| `loyalty.expiringSoon` | Expiring in 30 days | 30 دن میں ختم ہونے والے | در 30 روز منقضی می‌شود |
| `loyalty.off` | The loyalty programme is switched off in Settings. Existing balances stay here — customers can still spend them, and expired points can still be posted. | وفاداری پروگرام ترتیبات میں بند ہے۔ موجودہ بیلنس یہیں رہیں گے — گاہک انہیں خرچ کر سکتے ہیں، اور ختم شدہ پوائنٹس اب بھی درج کیے جا سکتے ہیں۔ | برنامه وفاداری در تنظیمات خاموش است. مانده‌های موجود اینجا می‌مانند — مشتریان هنوز می‌توانند آن‌ها را خرج كنند و امتیازهای منقضی شده هنوز ثبت می‌شوند. |
| `loyalty.pointsOutstanding` | Points outstanding | باقی پوائنٹس | امتیازهای باقی‌مانده |
| `loyalty.postedCount` | Expiry releases posted | میعاد کی انٹریاں درج ہو گئیں | آزادسازی‌های انقضا ثبت شد |
| `loyalty.postExpiries` | Post expiry releases | میعاد ختم ہونے کی انٹریاں درج کریں | ثبت آزادسازی‌های انقضا |
| `loyalty.subtitle` | Points your customers have earned and not yet spent. Every point is a rupee the shop owes — earned, spent, returned and expired points all move through the ledger, so this page always agrees with your books. | وہ پوائنٹس جو گاہکوں نے کمائے اور ابھی خرچ نہیں کیے۔ ہر پوائنٹ ایک روپیہ ہے جو دکان کے ذمے ہے — کمائے، خرچ کیے، واپس ملے اور ختم ہوئے پوائنٹس سب کھاتے سے گزرتے ہیں، اس لیے یہ صفحہ ہمیشہ آپ کے کھاتوں سے میل کھاتا ہے۔ | امتیازهایی كه مشتریان شما به دست آورده‌اند و هنوز خرج نكرده‌اند. هر امتیاز یك روپیه است كه دكان بدهكار است — امتیازهای به دست آمده، خرج شده، برگشته و منقضی شده همه از دفتر می‌گذرند، پس این صفحه همیشه با كتاب‌های شما مطابقت دارد. |
| `loyalty.tier.gold` | Gold | گولڈ | طلایی |
| `loyalty.tier.silver` | Silver | سلور | نقره‌ای |
| `loyalty.tier.standard` | Standard | عام | معمولی |
| `loyalty.title` | Loyalty Points | وفاداری پوائنٹس | امتیازهای وفاداری |
| `loyalty.totalLiability` | Points liability | پوائنٹس کی ذمہ داری | بدهی امتیازها |
| `loyalty.vintageLeft` | {points} points left | {points} پوائنٹس باقی | {points} امتیاز باقی |
| `loyalty.vintageLine` | Bill #{bill} · earned {date} · expires {expiry} | بل نمبر {bill} · کمائے {date} · میعاد ختم {expiry} | بل #{bill} · به دست آمده {date} · منقضی می‌شود {expiry} |
| `nav.loyalty` | Loyalty | وفاداری پوائنٹس | وفاداری |
| `rep.loyalty.clawed` | Points taken back (returns) | واپسی پر کاٹے گئے پوائنٹس | امتیازهای پس گرفته شده (برگشت‌ها) |
| `rep.loyalty.earned` | Points earned | کمائے گئے پوائنٹس | امتیازهای به دست آمده |
| `rep.loyalty.expired` | Points expired | میعاد ختم پوائنٹس | امتیازهای منقضی شده |
| `rep.loyalty.liability` | Points liability at period end | مدت کے آخر میں پوائنٹس کی ذمہ داری | بدهی امتیازها در پایان دوره |
| `rep.loyalty.recredited` | Points re-credited (returns) | واپسی پر دوبارہ ملے پوائنٹس | امتیازهای دوباره داده شده (برگشت‌ها) |
| `rep.loyalty.redeemed` | Points redeemed | خرچ کیے گئے پوائنٹس | امتیازهای خرج شده |
| `rep.loyalty.title` | Loyalty points | وفاداری پوائنٹس | امتیازهای وفاداری |
| `set.loyalty.earnBase` | Rupees of a bill per point earned | ایک پوائنٹ کے لیے بل کی رقم (روپے) | روپیه‌های یك بل برای هر امتیاز به دست آمده |
| `set.loyalty.enabled` | Programme on | پروگرام آن کریں | برنامه روشن |
| `set.loyalty.expiryMonths` | Points expire after (months) | پوائنٹس کی میعاد (مہینے) | امتیازها بعد از (ماه) منقضی می‌شوند |
| `set.loyalty.goldAt` | Gold tier — points earned in a year | گولڈ درجہ — ایک سال میں کمائے گئے پوائنٹس | سطح طلایی — امتیازهای به دست آمده در یك سال |
| `set.loyalty.goldMult` | Gold earn multiplier (×) | گولڈ کمائی کا ضارب (×) | ضریب به دست آوردن طلایی (×) |
| `set.loyalty.note` | Tiers only make points accumulate faster — a point is worth the same rupees for every customer. Switching the programme off stops new points; balances already earned stay spendable and expirable. | درجے صرف پوائنٹس کی کمائی تیز کرتے ہیں — ہر گاہک کے لیے پوائنٹ کی مالیت ایک جتنی رہتی ہے۔ پروگرام بند کرنے سے نئے پوائنٹس رک جاتے ہیں؛ پہلے سے بنے بیلنس خرچ اور میعاد ختم کے قابل رہتے ہیں۔ | سطح‌ها فقط امتیازها را سریع‌تر جمع می‌كنند — یك امتیاز برای هر مشتری به همان روپیه می‌ارزد. خاموش كردن برنامه امتیازهای جدید را متوقف می‌كند؛ مانده‌های قبلاً به دست آمده قابل خرج و انقضا می‌مانند. |
| `set.loyalty.pointValue` | Value of 1 point (Rs) | ایک پوائنٹ کی مالیت (روپے) | ارزش 1 امتیاز (Rs) |
| `set.loyalty.redeemCap` | Most of a bill payable in points (%) | بل کا زیادہ سے زیادہ حصہ پوائنٹس سے (فیصد) | بیشترین بخش بل قابل پرداخت با امتیاز (%) |
| `set.loyalty.silverAt` | Silver tier — points earned in a year | سلور درجہ — ایک سال میں کمائے گئے پوائنٹس | سطح نقره‌ای — امتیازهای به دست آمده در یك سال |
| `set.loyalty.silverMult` | Silver earn multiplier (×) | سلور کمائی کا ضارب (×) | ضریب به دست آوردن نقره‌ای (×) |
| `set.loyalty.sub` | Reward repeat customers with points. Points are a liability in your books: earned points cost the programme account, spent points pay part of a bill, and expired points are released only when you post them from the Loyalty page. | بار بار آنے والے گاہکوں کو پوائنٹس سے نوازیں۔ پوائنٹس آپ کے کھاتوں میں ایک ذمہ داری ہیں: بنے ہوئے پوائنٹس پروگرام کے کھاتے پر لاگت ڈالتے ہیں، خرچ کیے گئے پوائنٹس بل کا کچھ حصہ ادا کرتے ہیں، اور میعاد ختم پوائنٹس تبھی نکلتے ہیں جب آپ وفاداری والے صفحے سے انہیں درج کریں۔ | به مشتریان تكراری با امتیاز پاداش دهید. امتیازها در كتاب‌های شما یك بدهی هستند: امتیازهای به دست آمده به حساب برنامه هزینه می‌گذارند، امتیازهای خرج شده بخشی از یك بل را می‌پردازند و امتیازهای منقضی شده فقط وقتی آزاد می‌شوند كه آن‌ها را از صفحه وفاداری ثبت كنید. |
| `set.loyalty.title` | Loyalty programme | وفاداری پروگرام | برنامه وفاداری |
## store

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `nav.storefront` | Online Store | آن لائن اسٹور | دکان آنلاین |
| `print.storeLink.caption` | Order online from our store | ہمارے اسٹور سے آن لائن آرڈر کریں | از دکان ما آنلاین سفارش دهید |
| `shop.add` | Add | شامل کریں | اضافه کنید |
| `shop.available` | Available | دستیاب | موجود |
| `shop.cartEmpty` | Your order is empty — add something you need. | آپ کا آرڈر خالی ہے — جو چاہیے شامل کریں۔ | سفارش شما خالی است — آنچه نیاز دارید اضافه کنید. |
| `shop.cartTitle` | Your order | آپ کا آرڈر | سفارش شما |
| `shop.cartTotal` | Estimated total | تخمینی کل | مجموع تخمینی |
| `shop.checkoutTitle` | Your details | آپ کی تفصیل | جزئیات شما |
| `shop.consentLabel` | I agree to receive marketing messages from this shop on WhatsApp | میں اس دکان سے واٹس ایپ پر مارکیٹنگ پیغامات وصول کرنے پر راضی ہوں | موافقم که پیام‌های بازاریابی این فروشگاه را در WhatsApp دریافت کنم |
| `shop.errEmpty` | Your order is empty. | آپ کا آرڈر خالی ہے۔ | سفارش شما خالی است. |
| `shop.errName` | Please write your name. | براہ کرم اپنا نام لکھیں۔ | لطفاً نام خود را بنویسید. |
| `shop.errPhone` | That phone number doesn't look right. | یہ فون نمبر درست نہیں لگتا۔ | آن شماره تلیفون درست به نظر نمی‌رسد. |
| `shop.errSend` | The order couldn't be sent. Please try again, or message the shop on WhatsApp. | آرڈر نہ بھیجا جا سکا۔ دوبارہ کوشش کریں، یا دکان کو واٹس ایپ پر پیغام بھیجیں۔ | سفارش ارسال نشد. لطفاً دوباره تلاش کنید، یا به دکان در WhatsApp پیام دهید. |
| `shop.fulfilment.delivery` | Please deliver, if you can | اگر ممکن ہو تو پہنچا دیں | لطفاً اگر می‌توانید تحویل دهید |
| `shop.fulfilment.pickup` | I'll pick it up | میں خود آ کر لوں گا | خودم تحویل می‌گیرم |
| `shop.fulfilmentLabel` | How will you get it? | آپ اسے کیسے لیں گے؟ | چگونه آن را دریافت می‌کنید؟ |
| `shop.inCart` | In your order | آپ کے آرڈر میں | در سفارش شما |
| `shop.loading` | Opening the store… | اسٹور کھل رہا ہے… | دکان در حال باز شدن است… |
| `shop.lowStock` | Running low | ختم ہونے والا | در حال تمام شدن |
| `shop.nameLabel` | Your name | آپ کا نام | نام شما |
| `shop.noResults` | Nothing matches that search. | اس تلاش سے کچھ نہیں ملا۔ | هیچ چیزی با آن جستجو مطابقت ندارد. |
| `shop.noteLabel` | Note for the shop (optional) | دکان کے لیے نوٹ (اختیاری) | یادداشت برای دکان (اختیاری) |
| `shop.orderAgain` | Place another order | ایک اور آرڈر کریں | سفارش دیگری دهید |
| `shop.orderPlacedBody` | The shop has your order and will confirm it with you, usually on WhatsApp. Nothing is charged until the shop confirms. | دکان کو آپ کا آرڈر مل گیا ہے اور وہ آپ سے تصدیق کرے گی، عموماً واٹس ایپ پر۔ دکان کی تصدیق سے پہلے کوئی رقم نہیں لی جاتی۔ | دکان سفارش شما را دارد و آن را با شما تأیید خواهد کرد، معمولاً در WhatsApp. تا وقتی دکان تأیید نکند چیزی هزینه نمی‌شود. |
| `shop.orderPlacedTitle` | Order placed — thank you | آرڈر ہو گیا — شکریہ | سفارش ثبت شد — تشکر |
| `shop.outOfStock` | Out of stock | ختم | موجودی تمام شده |
| `shop.phoneLabel` | Phone / WhatsApp number | فون / واٹس ایپ نمبر | تلیفون / شماره WhatsApp |
| `shop.placeOrder` | Place order | آرڈر کریں | سفارش دهید |
| `shop.placing` | Sending… | بھیجا جا رہا ہے… | در حال ارسال… |
| `shop.poweredBy` | Store by Dukaan AI | اسٹور: Dukaan AI | دکان توسط Dukaan AI |
| `shop.previewBadge` | Preview | پیش منظر | پیش‌نمایش |
| `shop.priceNote` | Prices are confirmed by the shop when it confirms your order. | قیمتیں دکان آپ کے آرڈر کی تصدیق کے وقت کنفرم کرتی ہے۔ | قیمت‌ها توسط دکان وقتی سفارش شما را تأیید می‌کند، تأیید می‌شوند. |
| `shop.searchPh` | Search products… | پروڈکٹس تلاش کریں… | کالاها را جستجو کنید… |
| `shop.unavailableBody` | The shop may have moved or switched its store off. Please check the link, or contact the shop directly. | شاید دکان نے اپنا اسٹور بند کر دیا ہو یا لنک بدل گیا ہو۔ لنک جانچ لیں، یا دکان سے براہِ راست رابطہ کریں۔ | ممکن است دکان نقل مکان کرده یا دکان خود را خاموش کرده باشد. لطفاً لینک را بررسی کنید، یا مستقیماً با دکان تماس بگیرید. |
| `shop.unavailableTitle` | This store isn't open | یہ اسٹور کھلا نہیں ہے | این دکان باز نیست |
| `shop.whatsappShop` | Message the shop on WhatsApp | دکان کو واٹس ایپ پر پیغام بھیجیں | به دکان در WhatsApp پیام دهید |
| `store.autoRepublish` | Update the store automatically when products change | پروڈکٹس بدلنے پر اسٹور خود بخود تازہ ہو جائے | وقتی کالاها تغییر می‌کنند دکان را به‌صورت خودکار به‌روز کنید |
| `store.band.hidden` | Hidden | چھپا ہوا | پنهان |
| `store.band.in` | Available | دستیاب | موجود |
| `store.band.low` | Running low | ختم ہونے والا | در حال تمام شدن |
| `store.band.out` | Out of stock | ختم | موجودی تمام شده |
| `store.col.customer` | Customer | گاہک | مشتری |
| `store.col.fulfilment` | Fulfilment | وصولی | تکمیل |
| `store.col.phone` | Phone | فون | تلیفون |
| `store.col.price` | Price | قیمت | قیمت |
| `store.col.product` | Product | پروڈکٹ | کالا |
| `store.col.show` | Show | دکھائیں | نمایش |
| `store.col.stock` | Stock | اسٹاک | موجودی |
| `store.convert` | Convert to sale order | سیلز آرڈر میں تبدیل کریں | به سفارش فروش تبدیل کنید |
| `store.convertedOk` | Sale order {number} created | سیلز آرڈر {number} بن گیا | سفارش فروش {number} ایجاد شد |
| `store.convertedTo` | Became {number} | {number} بن گیا | به {number} تبدیل شد |
| `store.convertFailed` | That order could not be converted — it may already be handled. | یہ آرڈر تبدیل نہ ہو سکا — شاید یہ پہلے ہی نمٹایا جا چکا ہے۔ | آن سفارش تبدیل نشد — ممکن است قبلاً رسیدگی شده باشد. |
| `store.converting` | Converting… | تبدیل ہو رہا ہے… | در حال تبدیل… |
| `store.convertWa` | Tell the customer on WhatsApp | گاہک کو واٹس ایپ پر بتائیں | به مشتری در WhatsApp بگویید |
| `store.copied` | Copied | کاپی ہو گیا | کاپی شد |
| `store.copyLink` | Copy link | لنک کاپی کریں | لینک را کاپی کنید |
| `store.customerMatch` | Existing customer matched by phone: {name} | فون سے موجودہ گاہک مل گیا: {name} | مشتری موجود بر اساس تلیفون یافت شد: {name} |
| `store.customerNew` | No matching customer — converting creates one from this order. | کوئی گاہک نہیں ملا — تبدیل کرنے پر اس آرڈر سے نیا گاہک بنے گا۔ | مشتری منطبقی نیست — تبدیل از این سفارش یکی ایجاد می‌کند. |
| `store.demoNote` | This is the demo: publishing is off, and the store preview below is built from this device's demo data. No page is public and no order can be placed. | یہ ڈیمو ہے: اشاعت بند ہے، اور نیچے اسٹور کا پیش منظر اسی آلے کے ڈیمو ڈیٹا سے بنا ہے۔ کوئی صفحہ عوامی نہیں اور کوئی آرڈر نہیں ہو سکتا۔ | این نمایشی است: انتشار خاموش است، و پیش‌نمایش دکان در پایین از معلومات نمایشی این دستگاه ساخته شده است. هیچ صفحه‌ای عمومی نیست و هیچ سفارشی داده نمی‌شود. |
| `store.dismiss` | Dismiss | مسترد کریں | رد کنید |
| `store.dismissedOk` | Order dismissed | آرڈر مسترد ہو گیا | سفارش رد شد |
| `store.drift.changed` | changed | بدل گئی | تغییر کرده |
| `store.drift.live` | Live | لائیو | زنده |
| `store.drift.missing` | This product has been deleted — its line is dropped. | یہ پروڈکٹ حذف ہو چکی ہے — اس کی لائن ختم ہو جائے گی۔ | این کالا حذف شده است — خط آن حذف می‌شود. |
| `store.drift.published` | Published | شائع شدہ | منتشرشده |
| `store.driftNote` | Orders always convert at today's live prices. Any difference from the published price is shown here, before you confirm — the customer hears the confirmed price from you. | آرڈر ہمیشہ آج کی لائیو قیمتوں پر تبدیل ہوتے ہیں۔ شائع شدہ قیمت سے کوئی فرق ہو تو کنفرم کرنے سے پہلے یہاں دکھتا ہے — کنفرم شدہ قیمت گاہک کو آپ بتاتے ہیں۔ | سفارش‌ها همیشه با قیمت‌های زنده امروز تبدیل می‌شوند. هر تفاوتی با قیمت منتشرشده اینجا نشان داده می‌شود، قبل از اینکه تأیید کنید — مشتری قیمت تأییدشده را از شما می‌شنود. |
| `store.driftTitle` | Price check at today's live prices | آج کی لائیو قیمتوں پر جانچ | بررسی قیمت با قیمت‌های زنده امروز |
| `store.fulfilment.delivery` | Delivery requested | ڈیلیوری کی درخواست | تحویل درخواستی |
| `store.fulfilment.pickup` | Pickup | خود آ کر لے گا | تحویل حضوری |
| `store.inboxEmpty` | No store orders yet. Orders placed on your public store land here, ready to convert. | ابھی کوئی اسٹور آرڈر نہیں۔ آپ کے عوامی اسٹور پر آنے والے آرڈر یہاں آئیں گے، تبدیل کرنے کے لیے تیار۔ | هنوز سفارش دکانی نیست. سفارش‌های داده‌شده در دکان عمومی شما اینجا می‌آیند، آماده تبدیل. |
| `store.inboxTitle` | Store orders | اسٹور آرڈرز | سفارش‌های دکان |
| `store.linkLabel` | Your store link | آپ کے اسٹور کا لنک | لینک دکان شما |
| `store.noteFromCustomer` | Customer note | گاہک کا نوٹ | یادداشت مشتری |
| `store.noticeLabel` | Notice for customers (optional) | گاہکوں کے لیے اطلاع (اختیاری) | اطلاعیه برای مشتریان (اختیاری) |
| `store.noticePh` | e.g. Orders placed after 8 pm are confirmed the next morning. | مثلاً: رات 8 بجے کے بعد کے آرڈر اگلی صبح کنفرم ہوں گے۔ | مثال: سفارش‌های بعد از ساعت 8 شب صبح روز بعد تأیید می‌شوند. |
| `store.openStore` | Open store | اسٹور کھولیں | دکان را باز کنید |
| `store.orderTotal` | Order total at live prices: {total} | لائیو قیمتوں پر آرڈر کا کل: {total} | مجموع سفارش با قیمت‌های زنده: {total} |
| `store.phoneLabel` | Public / WhatsApp number | عوامی / واٹس ایپ نمبر | شماره عمومی / WhatsApp |
| `store.previewLink` | Preview the store | اسٹور کا پیش منظر دیکھیں | پیش‌نمایش دکان را ببینید |
| `store.productsHelp` | Tick what the world may see. Prices and stock bands refresh every time you publish; stock is always shown as a band, never a count. | جس پر نشان لگائیں گے دنیا وہی دیکھے گی۔ قیمتیں اور اسٹاک کی حالت ہر اشاعت پر تازہ ہوتی ہیں؛ اسٹاک ہمیشہ ایک درجے کی صورت میں دکھتا ہے، گنتی کبھی نہیں۔ | آنچه را که دنیا می‌تواند ببیند علامت بزنید. قیمت‌ها و باندهای موجودی هر بار که منتشر می‌کنید تازه می‌شوند؛ موجودی همیشه به‌صورت یک باند نشان داده می‌شود، هرگز به‌صورت شمارش. |
| `store.productsTitle` | Products in the store | اسٹور کی مصنوعات | کالاها در دکان |
| `store.publish` | Publish store | اسٹور شائع کریں | دکان را منتشر کنید |
| `store.publishedOk` | Store published | اسٹور شائع ہو گیا | دکان منتشر شد |
| `store.publishFailed` | Publishing failed — please try again. | اشاعت ناکام رہی — دوبارہ کوشش کریں۔ | انتشار ناموفق بود — لطفاً دوباره تلاش کنید. |
| `store.qrCaption` | Print this code and keep it at the counter — customers scan it to open your store. | یہ کوڈ چھاپ کر کاؤنٹر پر رکھیں — گاہک اسے اسکین کر کے آپ کا اسٹور کھولتے ہیں۔ | این کود را چاپ کنید و در پیشخوان نگه دارید — مشتریان آن را اسکن می‌کنند تا دکان شما را باز کنند. |
| `store.republish` | Republish | دوبارہ شائع کریں | دوباره منتشر کنید |
| `store.slugError.bad-chars` | Only lowercase letters, digits and single hyphens. | صرف چھوٹے انگریزی حروف، ہندسے اور ایک ایک ہائفن۔ | فقط حروف کوچک، ارقام و خط‌های فاصله تکی. |
| `store.slugError.reserved` | That name is reserved — please pick another. | یہ نام محفوظ ہے — کوئی اور چنیں۔ | آن نام رزرو شده است — لطفاً دیگری انتخاب کنید. |
| `store.slugError.too-long` | Too long — at most 40 characters. | بہت لمبا ہے — زیادہ سے زیادہ 40 حروف۔ | خیلی طولانی است — حداکثر 40 حرف. |
| `store.slugError.too-short` | Too short — at least 3 characters. | بہت چھوٹا ہے — کم از کم 3 حروف۔ | خیلی کوتاه است — حداقل 3 حرف. |
| `store.slugHelp` | Lowercase letters, digits and hyphens. Customers will see this in your store link. | چھوٹے انگریزی حروف، ہندسے اور ہائفن۔ گاہک یہ نام آپ کے اسٹور لنک میں دیکھیں گے۔ | حروف کوچک، ارقام و خط فاصله. مشتریان این را در لینک دکان شما خواهند دید. |
| `store.slugImmutable` | Claimed — this link name never changes, so printed links keep working. | یہ نام طے ہو چکا ہے — یہ کبھی نہیں بدلتا، تاکہ چھپے ہوئے لنک چلتے رہیں۔ | ثبت شده — این نام لینک هرگز تغییر نمی‌کند، تا لینک‌های چاپ‌شده کار کنند. |
| `store.slugLabel` | Store link name | اسٹور کے لنک کا نام | نام لینک دکان |
| `store.state.darkPlan` | Your store is hidden: the online store is part of the Advanced plan, and your current plan does not include it. Your published page and slug are kept — upgrading brings the store straight back. | آپ کا اسٹور چھپا ہوا ہے: آن لائن اسٹور ایڈوانسڈ پلان کا حصہ ہے اور آپ کے موجودہ پلان میں شامل نہیں۔ آپ کا شائع شدہ صفحہ اور سلگ محفوظ ہیں — اپ گریڈ کرتے ہی اسٹور واپس آ جائے گا۔ | دکان شما پنهان است: دکان آنلاین بخشی از پلان Advanced است و پلان فعلی شما آن را شامل نمی‌شود. صفحه منتشرشده و نام لینک شما نگه داشته می‌شود — ارتقا دکان را فوراً برمی‌گرداند. |
| `store.state.darkState` | Your store is hidden while your plan is {state}. Your published page and slug are kept — renewing brings the store straight back. | جب تک آپ کا پلان {state} حالت میں ہے، اسٹور چھپا رہے گا۔ آپ کا شائع شدہ صفحہ اور سلگ محفوظ ہیں — تجدید کرتے ہی اسٹور واپس آ جائے گا۔ | دکان شما در حالی که پلان شما {state} است پنهان می‌ماند. صفحه منتشرشده و نام لینک شما نگه داشته می‌شود — تمدید دکان را فوراً برمی‌گرداند. |
| `store.state.disabled` | Your store is switched off | آپ کا اسٹور بند ہے | دکان شما خاموش است |
| `store.state.lit` | Your store is live | آپ کا اسٹور لائیو ہے | دکان شما زنده است |
| `store.state.noPlan` | Publishing needs a registered business. Once this shop has a plan, its store can go live here. | شائع کرنے کے لیے رجسٹرڈ کاروبار درکار ہے۔ جب اس دکان کا پلان بن جائے گا تو اس کا اسٹور یہیں لائیو ہو سکے گا۔ | برای انتشار به یک تجارت ثبت‌شده نیاز است. وقتی این دکان پلان داشته باشد، دکانش می‌تواند اینجا زنده شود. |
| `store.stateConverted` | Converted | تبدیل شدہ | تبدیل‌شده |
| `store.stateDismissed` | Dismissed | مسترد | ردشده |
| `store.stateNew` | New | نیا | جدید |
| `store.subtitle` | Your shop on the web: a published catalogue your customers can order from. Orders land in an inbox here and become ordinary sale orders — nothing is sold, and no money moves, until you convert an order. | آپ کی دکان ویب پر: ایک شائع شدہ فہرست جس سے گاہک آرڈر کر سکتے ہیں۔ آرڈر یہاں ایک ان باکس میں آتے ہیں اور معمول کے سیلز آرڈر بنتے ہیں — جب تک آپ آرڈر کو تبدیل نہ کریں، نہ کچھ بکتا ہے نہ پیسہ چلتا ہے۔ | دکان شما در ویب: یک فهرست منتشرشده که مشتریان می‌توانند از آن سفارش دهند. سفارش‌ها اینجا در یک صندوق ورودی می‌آیند و به سفارش‌های فروش عادی تبدیل می‌شوند — تا وقتی سفارشی را تبدیل نکنید، چیزی فروخته نمی‌شود و پولی جابه‌جا نمی‌شود. |
| `store.taglineLabel` | Tagline (optional) | تعارفی جملہ (اختیاری) | شعار (اختیاری) |
| `store.taglinePh` | e.g. Fresh groceries, delivered in Farooka | مثلاً: تازہ سودا، فروکہ میں ڈیلیوری کے ساتھ | مثال: مواد غذایی تازه، در فاروقه تحویل داده می‌شود |
| `store.title` | Online Store | آن لائن اسٹور | دکان آنلاین |
| `store.unpublish` | Switch store off | اسٹور بند کریں | دکان را خاموش کنید |
| `store.unpublishedOk` | Store switched off — the page and order intake are closed. | اسٹور بند ہو گیا — صفحہ اور آرڈر لینا دونوں بند ہیں۔ | دکان خاموش شد — صفحه و دریافت سفارش بسته است. |
| `store.updatedAt` | Last published {date} | آخری اشاعت {date} | آخرین انتشار {date} |
| `store.viewOrder` | View sale order | سیلز آرڈر دیکھیں | سفارش فروش را ببینید |
## wa

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `nav.whatsapp` | WhatsApp Marketing | واٹس ایپ مارکیٹنگ | بازاریابی WhatsApp |
| `wa.aud.all` | All opted-in customers | تمام رضامند گاہک | همه مشتریان اشتراک‌کرده |
| `wa.aud.inactive` | Inactive customers | غیر فعال گاہک | مشتریان غیرفعال |
| `wa.aud.inactiveDays` | No bill in (days) | اتنے دن سے کوئی بل نہیں (دن) | بدون بل در (روز) |
| `wa.aud.minDays` | Outstanding for at least (days) | کم از کم اتنے دن پرانا (دن) | حداقل باقی‌مانده برای (روز) |
| `wa.aud.minRs` | At least (Rs) | کم از کم (روپے) | حداقل (Rs) |
| `wa.aud.points` | Points expiring | پوائنٹس ختم ہونے والے | امتیازها منقضی می‌شوند |
| `wa.aud.serviceDue` | Service due | سروس کے وقت والے | خدمت سررسید |
| `wa.aud.storefront` | Online store customers | آن لائن اسٹور کے گاہک | مشتریان دکان آنلاین |
| `wa.aud.tier` | Loyalty tier | لائلٹی درجہ | سطح وفاداری |
| `wa.aud.udhaar` | Udhaar outstanding | بقایا اُدھار والے | قرض باقی‌مانده |
| `wa.aud.withinDays` | Expiring within (days) | اتنے دن کے اندر ختم ہونے والے (دن) | منقضی‌شونده ظرف (روز) |
| `wa.camp.audience` | Audience | حاضرین | مخاطب |
| `wa.camp.create` | Create campaign | مہم بنائیں | کمپین ایجاد کنید |
| `wa.camp.empty` | No campaigns yet. Create one from a template and an audience. | ابھی کوئی مہم نہیں۔ ٹیمپلیٹ اور حاضرین چن کر ایک بنائیں۔ | هنوز کمپینی نیست. یکی از یک قالب و یک مخاطب ایجاد کنید. |
| `wa.camp.finish` | Finish campaign | مہم ختم کریں | کمپین را تمام کنید |
| `wa.camp.launch` | Launch | شروع کریں | راه‌اندازی |
| `wa.camp.name` | Campaign name | مہم کا نام | نام کمپین |
| `wa.camp.namePh` | e.g. Eid week offer | مثلاً عید ہفتہ آفر | مثال: پیشنهاد هفته عید |
| `wa.camp.new` | New campaign | نئی مہم | کمپین جدید |
| `wa.camp.openQueue` | Open send queue | بھیجنے کی قطار کھولیں | صف ارسال را باز کنید |
| `wa.camp.progress` | {sent} sent · {skipped} skipped · {total} total | {sent} بھیجے گئے · {skipped} چھوڑے گئے · کل {total} | {sent} ارسال شد · {skipped} رد شد · {total} مجموع |
| `wa.camp.queued` | {count} recipients queued | {count} وصول کنندگان قطار میں | {count} گیرنده در صف |
| `wa.camp.reach` | {count} customers will receive this | {count} گاہکوں کو یہ پیغام ملے گا | {count} مشتری این را دریافت خواهند کرد |
| `wa.camp.stateDone` | Done | مکمل | تمام شد |
| `wa.camp.stateDraft` | Draft | مسودہ | پیش‌نویس |
| `wa.camp.stateSending` | Sending | بھیجی جا رہی ہے | در حال ارسال |
| `wa.camp.sub` | A campaign is a template plus an audience. The audience is worked out live when you launch — never a frozen list. | مہم یعنی ایک ٹیمپلیٹ اور ایک حاضرین کی فہرست۔ فہرست شروع کرتے وقت اسی لمحے کے ڈیٹا سے بنتی ہے — جمی ہوئی فہرست کبھی نہیں۔ | یک کمپین یک قالب به‌علاوه یک مخاطب است. مخاطب وقتی راه‌اندازی می‌کنید به‌صورت زنده محاسبه می‌شود — هرگز یک فهرست منجمد نیست. |
| `wa.camp.template` | Template | ٹیمپلیٹ | قالب |
| `wa.camp.templateNone` | Create a template first | پہلے ایک ٹیمپلیٹ بنائیں | ابتدا یک قالب ایجاد کنید |
| `wa.camp.title` | Campaigns | مہمات | کمپین‌ها |
| `wa.consent.label` | This customer agrees to receive marketing messages on WhatsApp | یہ گاہک واٹس ایپ پر مارکیٹنگ پیغامات وصول کرنے پر راضی ہے | این مشتری موافق است پیام‌های بازاریابی را در WhatsApp دریافت کند |
| `wa.consent.off` | WhatsApp marketing: not agreed | واٹس ایپ مارکیٹنگ: رضامندی نہیں ہے | بازاریابی WhatsApp: موافقت نشده |
| `wa.consent.on` | WhatsApp marketing: agreed | واٹس ایپ مارکیٹنگ: رضامندی موجود ہے | بازاریابی WhatsApp: موافقت شده |
| `wa.consent.optIn` | Opt in | رضامند کریں | اشتراک کنید |
| `wa.consent.optOut` | Opt out | رضامندی ختم کریں | اشتراک را لغو کنید |
| `wa.consent.since` | Recorded on {date} · {source} | {date} کو درج ہوئی · {source} | در {date} ثبت شد · {source} |
| `wa.consent.sourceCounter` | at the counter | کاؤنٹر پر | در پیشخوان |
| `wa.consent.sourceStorefront` | via the online store | آن لائن اسٹور کے ذریعے | از طریق دکان آنلاین |
| `wa.consent.storefrontLabel` | Customer agreed to WhatsApp marketing messages | گاہک واٹس ایپ مارکیٹنگ پیغامات پر راضی ہے | مشتری با پیام‌های بازاریابی WhatsApp موافقت کرده است |
| `wa.consent.storefrontSub` | Tick only when the customer has agreed — the consent is recorded on their customer record as this order converts. | صرف اسی وقت نشان لگائیں جب گاہک راضی ہو — اس آرڈر کی تبدیلی کے ساتھ رضامندی اس کے ریکارڈ میں درج ہو جائے گی۔ | فقط وقتی علامت بزنید که مشتری موافقت کرده باشد — رضایت در سابقه مشتری آن‌ها ثبت می‌شود وقتی این سفارش تبدیل شود. |
| `wa.consent.sub` | Only customers who agree get campaign messages. Bills, receipts and order updates are not marketing and can always be sent. | مہمات کے پیغامات صرف ان گاہکوں کو جاتے ہیں جو راضی ہوں۔ بل، رسیدیں اور آرڈر کی اطلاعات مارکیٹنگ نہیں ہیں اور ہمیشہ بھیجی جا سکتی ہیں۔ | فقط مشتریانی که موافق هستند پیام‌های کمپین دریافت می‌کنند. بل‌ها، رسیدها و به‌روزرسانی‌های سفارش بازاریابی نیستند و همیشه می‌توانند ارسال شوند. |
| `wa.limits.body` | Messages go one by one from your own WhatsApp: tap Send, the chat opens with the message ready, you press send there and come back. Nothing is sent automatically or in bulk, and this app cannot see whether a message was delivered or read — “sent” in the log means you confirmed you sent it. Only customers who agreed receive campaigns, and sending too many messages too fast can get a number restricted by WhatsApp — the one-by-one pace is the protection. | پیغامات آپ کے اپنے واٹس ایپ سے ایک ایک کر کے جاتے ہیں: بھیجیں دبائیں، پیغام تیار حالت میں چیٹ کھلتی ہے، آپ وہاں بھیج کر واپس آتے ہیں۔ کچھ بھی خودکار یا تھوک میں نہیں بھیجا جاتا، اور یہ ایپ یہ نہیں دیکھ سکتی کہ پیغام پہنچا یا پڑھا گیا — ریکارڈ میں «بھیجا گیا» کا مطلب ہے کہ آپ نے تصدیق کی کہ آپ نے بھیجا۔ مہمات صرف ان گاہکوں کو جاتی ہیں جنہوں نے رضامندی دی ہو، اور بہت تیزی سے بہت زیادہ پیغامات بھیجنے پر واٹس ایپ نمبر محدود کر سکتا ہے — ایک ایک کر کے بھیجنے کی رفتار ہی حفاظت ہے۔ | پیام‌ها یکی‌یکی از WhatsApp خودتان می‌روند: ارسال را بزنید، چت با پیام آماده باز می‌شود، شما آنجا ارسال می‌کنید و برمی‌گردید. هیچ چیزی به‌صورت خودکار یا انبوه ارسال نمی‌شود، و این برنامه نمی‌تواند ببیند پیام تحویل داده شد یا خوانده شد — فرستاده‌شده در سوابق یعنی شما تأیید کردید که فرستادید. فقط مشتریانی که موافقت کرده‌اند کمپین دریافت می‌کنند، و ارسال پیام‌های زیادی خیلی سریع می‌تواند یک شماره را توسط WhatsApp محدود کند — سرعت یکی‌یکی محافظت است. |
| `wa.limits.title` | How sending works — please read | بھیجنے کا طریقہ — براہ کرم پڑھ لیں | ارسال چگونه کار می‌کند — لطفاً بخوانید |
| `wa.lockedBody` | Campaigns, templates and service reminders join the Standard plan. Your customers and their consent choices stay exactly as they are — upgrade to start sending. | مہمات، ٹیمپلیٹس اور سروس ریمائنڈرز اسٹینڈرڈ پلان کے ساتھ ملتے ہیں۔ آپ کے گاہک اور ان کی رضامندی کے فیصلے ویسے کے ویسے رہتے ہیں — بھیجنا شروع کرنے کے لیے پلان بڑھائیں۔ | کمپین‌ها، قالب‌ها و یادآوری‌های خدمت به پلان Standard می‌پیوندند. مشتریان شما و انتخاب‌های رضایت آن‌ها دقیقاً همان‌طور می‌مانند — برای شروع ارسال ارتقا دهید. |
| `wa.lockedTitle` | WhatsApp marketing is not in your plan | واٹس ایپ مارکیٹنگ آپ کے پلان میں شامل نہیں | بازاریابی WhatsApp در پلان شما نیست |
| `wa.notice.campaignCreated` | Campaign created as a draft. | مہم مسودے کے طور پر بن گئی۔ | کمپین به‌صورت پیش‌نویس ایجاد شد. |
| `wa.notice.consentSaved` | Consent updated for {name}. | {name} کی رضامندی تازہ ہو گئی۔ | رضایت برای {name} به‌روز شد. |
| `wa.notice.finished` | Campaign finished. | مہم ختم ہو گئی۔ | کمپین تمام شد. |
| `wa.notice.launched` | Launched — {count} recipients in the queue. | مہم شروع ہو گئی — {count} وصول کنندگان قطار میں ہیں۔ | راه‌اندازی شد — {count} گیرنده در صف. |
| `wa.notice.templateDeleted` | Template deleted. | ٹیمپلیٹ حذف ہو گیا۔ | قالب حذف شد. |
| `wa.notice.templateSaved` | Template saved. | ٹیمپلیٹ محفوظ ہو گیا۔ | قالب ذخیره شد. |
| `wa.queue.done` | This queue is finished — every recipient has a result in the log. | یہ قطار مکمل ہو گئی — ہر وصول کنندہ کا نتیجہ ریکارڈ میں موجود ہے۔ | این صف تمام شد — هر گیرنده نتیجه‌ای در سوابق دارد. |
| `wa.queue.honestNote` | “Sent” here means you confirm you sent it in WhatsApp — this app cannot see delivery or reads, and does not pretend to. | یہاں «بھیجا گیا» کا مطلب ہے کہ آپ تصدیق کرتے ہیں کہ آپ نے واٹس ایپ میں بھیج دیا — یہ ایپ ڈیلیوری یا پڑھا جانا نہیں دیکھ سکتی، اور دکھاوا بھی نہیں کرتی۔ | فرستاده‌شده اینجا یعنی شما تأیید می‌کنید که در WhatsApp فرستادید — این برنامه نمی‌تواند تحویل یا خواندن را ببیند، و تظاهر هم نمی‌کند. |
| `wa.queue.logEmpty` | Nothing sent yet. | ابھی کچھ نہیں بھیجا گیا۔ | هنوز چیزی ارسال نشده است. |
| `wa.queue.logTitle` | Send log | بھیجنے کا ریکارڈ | سوابق ارسال |
| `wa.queue.messageLabel` | Message for {name} | {name} کے لیے پیغام | پیام برای {name} |
| `wa.queue.remaining` | {count} remaining | {count} باقی | {count} باقی‌مانده |
| `wa.queue.send` | Open in WhatsApp | واٹس ایپ میں کھولیں | در WhatsApp باز کنید |
| `wa.queue.sent` | I sent it | میں نے بھیج دیا | فرستادم |
| `wa.queue.skip` | Skip for now | ابھی چھوڑ دیں | فعلاً رد کنید |
| `wa.queue.skippedInvalid` | Skipped: this number does not look valid for WhatsApp. | چھوڑ دیا گیا: یہ نمبر واٹس ایپ کے لیے درست نہیں لگتا۔ | رد شد: این شماره برای WhatsApp معتبر به نظر نمی‌رسد. |
| `wa.queue.skippedOptout` | Skipped: this customer is no longer opted in. | چھوڑ دیا گیا: یہ گاہک اب رضامند نہیں رہا۔ | رد شد: این مشتری دیگر اشتراک ندارد. |
| `wa.queue.sub` | One customer at a time. Open the chat, send in WhatsApp, come back and confirm. | ایک وقت میں ایک گاہک۔ چیٹ کھولیں، واٹس ایپ میں بھیجیں، واپس آ کر تصدیق کریں۔ | یک مشتری در یک زمان. چت را باز کنید، در WhatsApp ارسال کنید، برگردید و تأیید کنید. |
| `wa.queue.title` | Send queue | بھیجنے کی قطار | صف ارسال |
| `wa.sendingPaused` | Your plan is not active right now, so launching and sending are paused. Everything here stays readable — renew to send again. | آپ کا پلان اس وقت فعال نہیں، اس لیے مہم شروع کرنا اور بھیجنا رکا ہوا ہے۔ یہاں سب کچھ پڑھا جا سکتا ہے — دوبارہ بھیجنے کے لیے پلان کی تجدید کریں۔ | پلان شما فعلاً فعال نیست، پس راه‌اندازی و ارسال متوقف است. همه چیز اینجا خوانا می‌ماند — برای ارسال دوباره تمدید کنید. |
| `wa.sendState.opened` | Opened | کھولا گیا | باز شد |
| `wa.sendState.queued` | Queued | قطار میں | در صف |
| `wa.sendState.sent` | Sent | بھیجا گیا | ارسال شد |
| `wa.sendState.skipped_invalid` | Skipped · bad number | چھوڑا گیا · غلط نمبر | رد شد · شماره بد |
| `wa.sendState.skipped_optout` | Skipped · opted out | چھوڑا گیا · رضامندی ختم | رد شد · اشتراک لغو شد |
| `wa.serviceInterval.label` | Service reminder interval (days) | سروس ریمائنڈر کا وقفہ (دن) | فاصله یادآوری خدمت (روز) |
| `wa.serviceInterval.sub` | A delivered job older than this suggests a service reminder. Set by the owner. | اس سے پرانا مکمل شدہ کام سروس ریمائنڈر کی تجویز بنتا ہے۔ یہ مالک مقرر کرتا ہے۔ | یک کار تحویل‌شده قدیمی‌تر از این، یک یادآوری خدمت را پیشنهاد می‌کند. توسط مالک تنظیم می‌شود. |
| `wa.subtitle` | Campaigns to your own customers, from your own WhatsApp number, sent by your own hand. Dukaan AI organises the consent, the lists and the record — the sending stays yours. | اپنے گاہکوں کے لیے مہمات، اپنے واٹس ایپ نمبر سے، اپنے ہاتھ سے بھیجی ہوئی۔ دکان اے آئی رضامندی، فہرستیں اور ریکارڈ سنبھالتی ہے — بھیجنا آپ ہی کا کام رہتا ہے۔ | کمپین‌ها به مشتریان خودتان، از شماره WhatsApp خودتان، با دست خودتان ارسال‌شده. Dukaan AI رضایت، فهرست‌ها و سوابق را تنظیم می‌کند — ارسال از شما می‌ماند. |
| `wa.suggest.pointsSub` | {count} customers · points expire within {days} days | {count} گاہک · پوائنٹس {days} دن کے اندر ختم ہو جائیں گے | {count} مشتری · امتیازها ظرف {days} روز منقضی می‌شوند |
| `wa.suggest.pointsTitle` | Points expiring soon | پوائنٹس ختم ہونے والے ہیں | امتیازها به‌زودی منقضی می‌شوند |
| `wa.suggest.serviceSub` | {count} customers · last job over {days} days ago | {count} گاہک · آخری کام {days} دن سے پرانا | {count} مشتری · آخرین کار بیش از {days} روز پیش |
| `wa.suggest.serviceTitle` | Service due | سروس کا وقت آ گیا | خدمت سررسید |
| `wa.suggest.start` | Start campaign | مہم شروع کریں | کمپین را شروع کنید |
| `wa.suggest.sub` | Work your own data is pointing at today. Counts include only customers who agreed to WhatsApp marketing — starting a campaign is always your tap, never automatic. | وہ کام جس کی طرف آج آپ کا اپنا ڈیٹا اشارہ کر رہا ہے۔ گنتی میں صرف وہ گاہک شامل ہیں جنہوں نے واٹس ایپ مارکیٹنگ کی رضامندی دی ہے — مہم شروع کرنا ہمیشہ آپ کا اپنا فیصلہ ہے، خودکار کبھی نہیں۔ | کاری که معلومات خودتان امروز به آن اشاره می‌کند. شمارش‌ها فقط شامل مشتریانی است که با بازاریابی WhatsApp موافقت کرده‌اند — شروع یک کمپین همیشه تصمیم شماست، هرگز خودکار نیست. |
| `wa.suggest.title` | Suggested reminders | تجویز کردہ ریمائنڈرز | یادآوری‌های پیشنهادی |
| `wa.suggest.udhaarSub` | {count} customers · udhaar older than {days} days | {count} گاہک · اُدھار {days} دن سے پرانا | {count} مشتری · قرض قدیمی‌تر از {days} روز |
| `wa.suggest.udhaarTitle` | Udhaar reminders | اُدھار ریمائنڈرز | یادآوری‌های قرض |
| `wa.title` | WhatsApp Marketing | واٹس ایپ مارکیٹنگ | بازاریابی WhatsApp |
| `wa.tpl.body` | Message | پیغام | پیام |
| `wa.tpl.bodyPh` | Write the message your customers will receive… | وہ پیغام لکھیں جو گاہکوں کو ملے گا… | پیامی را بنویسید که مشتریان شما دریافت خواهند کرد… |
| `wa.tpl.delete` | Delete | حذف کریں | حذف کنید |
| `wa.tpl.deleteSure` | Delete this template? Campaigns already sent keep their record. | یہ ٹیمپلیٹ حذف کر دیں؟ پہلے بھیجی گئی مہمات کا ریکارڈ برقرار رہے گا۔ | این قالب حذف شود؟ کمپین‌های قبلاً ارسال‌شده سوابق خود را نگه می‌دارند. |
| `wa.tpl.empty` | No templates yet. Write one, or start from a starter below. | ابھی کوئی ٹیمپلیٹ نہیں۔ ایک لکھیں، یا نیچے دیے گئے نمونوں سے شروع کریں۔ | هنوز قالبی نیست. یکی بنویسید، یا از یک آغازین در پایین شروع کنید. |
| `wa.tpl.kind` | Kind | قسم | نوع |
| `wa.tpl.kindPromo` | Promotion | پروموشن | ترویج |
| `wa.tpl.kindReminder` | Reminder | ریمانڈر | یادآوری |
| `wa.tpl.name` | Template name | ٹیمپلیٹ کا نام | نام قالب |
| `wa.tpl.namePh` | e.g. Eid offer | مثلاً عید آفر | مثال: پیشنهاد عید |
| `wa.tpl.new` | New template | نیا ٹیمپلیٹ | قالب جدید |
| `wa.tpl.placeholders` | Placeholders: {name} the customer's name · {shop} your shop's name · {points} their loyalty points · {amount} their outstanding udhaar in rupees | پلیس ہولڈرز: {name} گاہک کا نام · {shop} آپ کی دکان کا نام · {points} اس کے لائلٹی پوائنٹس · {amount} اس کا بقایا اُدھار روپوں میں | جای‌خالی‌ها: {name} نام مشتری · {shop} نام دکان شما · {points} امتیازهای وفاداری آن‌ها · {amount} قرض باقی‌مانده آن‌ها به روپیه |
| `wa.tpl.save` | Save template | ٹیمپلیٹ محفوظ کریں | قالب را ذخیره کنید |
| `wa.tpl.starterPromo1` | Assalam-o-Alaikum {name}, a special offer at {shop} this week — visit us and save on your regular shopping. Reply STOP to opt out. | السلام علیکم {name}، اس ہفتے {shop} پر آپ کے لیے خاص آفر ہے — تشریف لائیں اور اپنی معمول کی خریداری پر بچت کریں۔ رکنے کے لیے STOP لکھ کر جواب دیں۔ | السلام علیکم {name}، یک پیشنهاد ویژه در {shop} در این هفته — به ما سر بزنید و در خرید معمول خود صرفه‌جویی کنید. برای لغو اشتراک STOP پاسخ دهید. |
| `wa.tpl.starterPromo1Name` | General offer | عام آفر | پیشنهاد عمومی |
| `wa.tpl.starterPromo2` | Assalam-o-Alaikum {name}, fresh stock has arrived at {shop}. Come by while it lasts — and you have {points} loyalty points waiting to spend. | السلام علیکم {name}، {shop} پر تازہ اسٹاک آ گیا ہے۔ ختم ہونے سے پہلے تشریف لائیں — اور آپ کے {points} لائلٹی پوائنٹس بھی خرچ ہونے کے منتظر ہیں۔ | السلام علیکم {name}، موجودی تازه به {shop} رسیده است. تا وقتی هست بیایید — و شما {points} امتیاز وفاداری دارید که منتظر خرج شدن هستند. |
| `wa.tpl.starterPromo2Name` | New stock | نیا اسٹاک | موجودی جدید |
| `wa.tpl.starterReminder1` | Assalam-o-Alaikum {name}, a gentle reminder from {shop}: Rs {amount} is outstanding on your account. Please clear it when convenient — thank you. | السلام علیکم {name}، {shop} کی طرف سے ایک مہذب یاددہانی: آپ کے کھاتے میں {amount} روپے بقایا ہیں۔ سہولت کے مطابق ادا کر دیں — شکریہ۔ | السلام علیکم {name}، یک یادآوری ملایم از {shop}: Rs {amount} در حساب شما باقی است. لطفاً وقتی راحت بودید تصفیه کنید — تشکر. |
| `wa.tpl.starterReminder1Name` | Udhaar reminder | اُدھار ریمائنڈر | یادآوری قرض |
| `wa.tpl.starterReminder2` | Assalam-o-Alaikum {name}, you have {points} loyalty points at {shop} that expire soon. Use them on your next visit so they are not lost. | السلام علیکم {name}، {shop} پر آپ کے {points} لائلٹی پوائنٹس جلد ختم ہونے والے ہیں۔ اگلی خریداری پر استعمال کر لیں تاکہ ضائع نہ ہوں۔ | السلام علیکم {name}، شما در {shop} {points} امتیاز وفاداری دارید که به‌زودی منقضی می‌شوند. در بازدید بعدی خود از آن‌ها استفاده کنید تا از دست نروند. |
| `wa.tpl.starterReminder2Name` | Points expiring | پوائنٹس ختم ہونے والے ہیں | امتیازها منقضی می‌شوند |
| `wa.tpl.starters` | Starter templates — copy, then make them yours | نمونہ ٹیمپلیٹس — نقل کریں، پھر اپنے بنا لیں | قالب‌های آغازین — کاپی کنید، سپس آن‌ها را از خود کنید |
| `wa.tpl.sub` | Your own words, reused. Placeholders fill in per customer when the queue reaches them. | آپ کے اپنے الفاظ، بار بار استعمال کے لیے۔ جب قطار کسی گاہک تک پہنچتی ہے تو پلیس ہولڈرز اسی کے حساب سے بھر جاتے ہیں۔ | سخنان خودتان، دوباره استفاده‌شده. جای‌خالی‌ها برای هر مشتری وقتی نوبت به آن‌ها می‌رسد پر می‌شوند. |
| `wa.tpl.title` | Message templates | پیغام کے ٹیمپلیٹس | قالب‌های پیام |
| `wa.tpl.use` | Use this | یہ استعمال کریں | این را استفاده کنید |
## dash

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `dash.activity.bill` | Bill #{no} | بل نمبر {no} | بل #{no} |
| `dash.activity.empty` | No bills or expenses recorded yet. | ابھی کوئی بل یا خرچ درج نہیں۔ | هنوز هیچ بل یا مصرفی ثبت نشده است. |
| `dash.activity.title` | Recent activity | حالیہ سرگرمی | فعالیت اخیر |
| `dash.alerts.expEmpty` | Nothing expiring in the next 30 days. | اگلے 30 دن میں کسی چیز کی میعاد ختم نہیں ہو رہی۔ | هیچ چیزی در 30 روز آینده منقضی نمی‌شود. |
| `dash.alerts.expired` | Expired | میعاد ختم ہو چکی | منقضی شده |
| `dash.alerts.expiresIn` | expires in {days} days | میعاد {days} دن میں ختم | در {days} روز منقضی می‌شود |
| `dash.alerts.expiring` | Expiring soon | میعاد ختم ہونے کے قریب | نزدیک به انقضا |
| `dash.alerts.left` | left | باقی | مانده |
| `dash.alerts.lowEmpty` | Nothing below reorder level. Shelf is healthy. | کوئی چیز ری آرڈر سطح سے نیچے نہیں۔ شیلف ٹھیک ہے۔ | هیچ چیزی پایین‌تر از سطح سفارش مجدد نیست. قفسه سالم است. |
| `dash.alerts.lowStock` | Low stock | کم اسٹاک | موجودی کم |
| `dash.alerts.outOfStock` | Out of stock | اسٹاک ختم | موجودی تمام شده |
| `dash.alerts.title` | Needs attention | توجہ طلب امور | نیاز به توجه |
| `dash.askAi` | Ask the AI assistant | اے آئی اسسٹنٹ سے پوچھیں | از دستیار AI بپرسید |
| `dash.chart.aria` | Bar chart of daily revenue for the last 14 days. Total: {total}. | پچھلے 14 دن کی روزانہ آمدن کا بار چارٹ۔ کل آمدن: {total}۔ | چارت میله‌ای عواید روزانه 14 روز گذشته. مجموع: {total}. |
| `dash.chart.caption` | Daily counter totals, oldest to today. | روزانہ کی فروخت — پرانے دن سے آج تک۔ | مجموع روزانه فروش، از قدیم تا امروز. |
| `dash.chart.noData` | No sales recorded in the last 14 days yet. | پچھلے 14 دن میں ابھی کوئی فروخت درج نہیں ہوئی۔ | هنوز فروشی در 14 روز گذشته ثبت نشده است. |
| `dash.chart.title` | Last 14 days revenue | پچھلے 14 دن کی آمدن | عواید 14 روز گذشته |
| `dash.eyebrow` | Shop overview | دکان کا جائزہ | نمای کلی دکان |
| `dash.greeting` | Assalam-o-Alaikum, Shopkeeper! | السلام علیکم، دکاندار صاحب! | السلام علیکم، دکاندار صاحب! |
| `dash.insight.checkPlan` | Check the reorder plan | ری آرڈر منصوبہ دیکھیں | پلان سفارش مجدد را ببینید |
| `dash.insight.down` | down | کم | پایین |
| `dash.insight.lowCount` | {count} items at or below reorder level. | {count} اشیاء ری آرڈر سطح پر یا اس سے نیچے ہیں۔ | {count} کالا در سطح سفارش مجدد یا پایین‌تر از آن است. |
| `dash.insight.runOut` | {name} will run out in about {days} days at the current rate ({perDay} per day). Suggested reorder: {qty} {unit}. | {name} موجودہ رفتار ({perDay} یومیہ) پر تقریباً {days} دن میں ختم ہو جائے گا۔ تجویز کردہ ری آرڈر: {qty} {unit}۔ | {name} با نرخ فعلی ({perDay} در روز) در حدود {days} روز تمام خواهد شد. سفارش مجدد پیشنهادی: {qty} {unit}. |
| `dash.insight.todayVsAvg` | Today's revenue is {dir} {pct}% vs your 7-day average of {avg}. | آج کی آمدن 7 دن کی اوسط {avg} کے مقابلے میں {pct} فیصد {dir} ہے۔ | عواید امروز نسبت به میانگین 7 روزه شما {avg}، {dir} {pct}% است. |
| `dash.insight.topSeller` | {name} is your star performer — {units} units sold in the last 7 days. Keep its shelf full. | {name} آپ کی سرفہرست چیز ہے — پچھلے 7 دن میں {units} یونٹ فروخت ہوئے۔ اس کی شیلف بھری رکھیں۔ | {name} بهترین فروشنده شماست — {units} واحد در 7 روز گذشته فروخته شد. قفسه آن را پر نگه دارید. |
| `dash.insight.up` | up | زیادہ | بالا |
| `dash.insights.caption` | Computed live from your sales history — no guesswork. | آپ کی فروخت کی تاریخ سے براہِ راست حساب — محض اندازے نہیں۔ | به‌صورت زنده از تاریخچه فروش شما محاسبه شده — حدس نیست. |
| `dash.insights.empty` | Not enough data yet — record a few sales first. | ابھی ڈیٹا ناکافی ہے — پہلے کچھ فروخت درج کریں۔ | هنوز معلومات کافی نیست — ابتدا چند فروش ثبت کنید. |
| `dash.insights.title` | AI insights | اے آئی تجزیے | بینش‌های AI |
| `dash.kpi.monthProfit` | Net profit · this month | اس مہینے کا خالص منافع | مفاد خالص · این ماه |
| `dash.kpi.stockSub` | Retail {retail} · {count} products on shelf | خوردہ قیمت {retail} · {count} اشیاء شیلف پر | خرده‌فروشی {retail} · {count} کالا روی قفسه |
| `dash.kpi.stockValue` | Stock value (cost) | اسٹاک کی قیمت (لاگت قیمت پر) | ارزش موجودی (به قیمت تمام‌شده) |
| `dash.kpi.todayProfit` | Today's profit | آج کا منافع | مفاد امروز |
| `dash.kpi.todaySales` | Today's sales | آج کی فروخت | فروش امروز |
| `dash.lead` | Your dukaan at a glance — stock health, today's counter, and what the AI thinks you should do next. | آپ کی دکان ایک نظر میں — اسٹاک کی صورتحال، آج کی فروخت، اور اے آئی کی اگلی تجاویز۔ | دکان شما در یک نگاه — وضعیت موجودی، فروش امروز، و آنچه AI پیشنهاد می‌کند. |
| `dash.loading` | Loading shop data… | دکان کا ڈیٹا لوڈ ہو رہا ہے… | معلومات دکان در حال بارگیری است… |
| `dash.money.cash` | Cash in hand | ہاتھ میں نقد رقم | نقد در دست |
| `dash.money.expenses` | Expenses · this month | اس مہینے کے اخراجات | مصارف · این ماه |
| `dash.money.payable` | Supplier payable | سپلائرز کو واجب الادا | قابل پرداخت به تأمین‌کننده |
| `dash.money.title` | Money snapshot | رقوم کا خلاصہ | خلاصه پول |
| `dash.money.udhaar` | Udhaar outstanding | بقایا ادھار | قرض باقی‌مانده |
| `dash.resetDemo` | Reset demo data | ڈیمو ڈیٹا ری سیٹ کریں | بازنشانی معلومات نمایشی |
| `dash.top.caption` | Best sellers by units sold, last 14 days. | پچھلے 14 دن میں یونٹ کے حساب سے سرفہرست اشیاء۔ | پرفروش‌ترین‌ها بر اساس واحدهای فروخته‌شده، 14 روز گذشته. |
| `dash.top.empty` | No sales in the last 14 days yet. | پچھلے 14 دن میں ابھی کوئی فروخت نہیں ہوئی۔ | هنوز فروشی در 14 روز گذشته نشده است. |
| `dash.top.title` | Top products | زیادہ بکنے والی اشیاء | کالاهای برتر |
| `dash.top.units` | {n} units sold | {n} یونٹ فروخت | {n} واحد فروخته شد |
| `dash.trend.new` | New | نیا آغاز | جدید |
| `dash.trend.vsLastMonth` | {sign}{pct}% vs last month | پچھلے مہینے کے مقابلے میں {sign}{pct} فیصد | {sign}{pct}% نسبت به ماه گذشته |
| `dash.trend.vsYesterday` | {sign}{pct}% vs yesterday | کل کے مقابلے میں {sign}{pct} فیصد | {sign}{pct}% نسبت به دیروز |
## common

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `action.add` | Add | شامل کریں | اضافه كنید |
| `action.askAi` | Ask AI | اے آئی سے پوچھیں | از AI بپرسید |
| `action.back` | Back | واپس | بازگشت |
| `action.cancel` | Cancel | منسوخ کریں | لغو كنید |
| `action.clearSearch` | Clear search | تلاش صاف کریں | پاك كردن جستجو |
| `action.close` | Close | بند کریں | ببندید |
| `action.confirm` | Confirm | تصدیق کریں | تأیید كنید |
| `action.delete` | Delete | حذف کریں | حذف كنید |
| `action.edit` | Edit | تبدیل کریں | ویرایش |
| `action.login` | Login | لاگ اِن | ورود |
| `action.logout` | Logout | لاگ آؤٹ | خروج |
| `action.print` | Print | پرنٹ کریں | چاپ كنید |
| `action.record` | Record | درج کریں | ثبت كنید |
| `action.remove` | Remove | ہٹائیں | بردارید |
| `action.save` | Save | محفوظ کریں | ذخیره كنید |
| `action.search` | Search | تلاش کریں | جستجو |
| `action.signup` | Sign up | سائن اپ | ثبت نام |
| `action.viewAll` | View all | تمام دیکھیں | مشاهده همه |
| `action.whatsapp` | WhatsApp | WhatsApp | WhatsApp |
| `common.accessDenied` | Access restricted | رسائی محدود ہے | دسترسی محدود است |
| `common.accessDeniedBody` | Your role in this shop does not include this section. Ask the shop owner if you need access. | اس دکان میں آپ کے کردار میں یہ حصہ شامل نہیں ہے۔ رسائی درکار ہو تو دکان کے مالک سے رجوع کریں۔ | نقش شما در این دکان شامل این بخش نمی‌شود. اگر به دسترسی ضرورت دارید، با مالک دکان صحبت كنید. |
| `common.account` | Account | کھاتہ | حساب |
| `common.actions` | Actions | کارروائی | اقدامات |
| `common.address` | Address | پتا | آدرس |
| `common.all` | All | تمام | همه |
| `common.amount` | Amount | رقم | مبلغ |
| `common.currency` | Rs | روپے | روپیه |
| `common.date` | Date | تاریخ | تاریخ |
| `common.expenseCat.electricity` | Electricity | بجلی | برق |
| `common.expenseCat.other` | Other | دیگر | دیگر |
| `common.expenseCat.rent` | Rent | کرایہ | كرایه |
| `common.expenseCat.salary` | Salary | تنخواہ | معاش |
| `common.expenseCat.transport` | Transport | نقل و حمل | ترانسپورت |
| `common.items` | items | اشیاء | اقلام |
| `common.loading` | Loading… | لوڈ ہو رہا ہے… | در حال بارگذاری… |
| `common.month.0` | January | جنوری | جنوری |
| `common.month.1` | February | فروری | فبروری |
| `common.month.10` | November | نومبر | نومبر |
| `common.month.11` | December | دسمبر | دسمبر |
| `common.month.2` | March | مارچ | مارچ |
| `common.month.3` | April | اپریل | اپریل |
| `common.month.4` | May | مئی | می |
| `common.month.5` | June | جون | جون |
| `common.month.6` | July | جولائی | جولای |
| `common.month.7` | August | اگست | آگست |
| `common.month.8` | September | ستمبر | سپتمبر |
| `common.month.9` | October | اکتوبر | اكتوبر |
| `common.name` | Name | نام | نام |
| `common.none` | None | کوئی نہیں | هیچ |
| `common.noResults` | Nothing found. | کچھ نہیں ملا۔ | چیزی یافت نشد. |
| `common.notes` | Notes | نوٹ | یادداشت‌ها |
| `common.pay.bank` | Bank | بینک | بانك |
| `common.pay.cash` | Cash | نقد | نقد |
| `common.pay.credit` | Credit (Udhaar) | ادھار | قرض (ادھار) |
| `common.pay.easypaisa` | Easypaisa | Easypaisa | Easypaisa |
| `common.pay.jazzcash` | JazzCash | JazzCash | JazzCash |
| `common.perDay` | /day | /دن | /روز |
| `common.phone` | Phone | فون | تلیفون |
| `common.status` | Status | حالت | حالت |
| `common.today` | Today | آج | امروز |
| `common.total` | Total | کل | مجموع |
| `common.weekday.0` | Sunday | اتوار | یكشنبه |
| `common.weekday.1` | Monday | پیر | دوشنبه |
| `common.weekday.2` | Tuesday | منگل | سه‌شنبه |
| `common.weekday.3` | Wednesday | بدھ | چهارشنبه |
| `common.weekday.4` | Thursday | جمعرات | پنجشنبه |
| `common.weekday.5` | Friday | جمعہ | جمعه |
| `common.weekday.6` | Saturday | ہفتہ | شنبه |
| `common.yesterday` | Yesterday | کل | دیروز |
| `nav.assistant` | AI Assistant | اے آئی معاون | دستیار AI |
| `nav.billing` | Billing | بلنگ | بل |
| `nav.credit` | Credit · Udhaar | ادھار کھاتہ | قرض · ادھار |
| `nav.customers` | Customers | گاہک | مشتریان |
| `nav.dashboard` | Dashboard | ڈیش بورڈ | داشبورد |
| `nav.dayclose` | Day Close | دن کا حساب | بستن روز |
| `nav.expenses` | Expenses | اخراجات | مصارف |
| `nav.finance` | Finance | مالیات | مالی |
| `nav.forecast` | Forecast | پیش گوئی | پیش‌بینی |
| `nav.group.finance` | Finance | مالیات | مالی |
| `nav.group.main` | Main | مرکزی | اصلی |
| `nav.group.manage` | Manage | انتظام | مدیریت |
| `nav.group.system` | System | نظام | سیستم |
| `nav.inventory` | Inventory | اسٹاک | موجودی |
| `nav.sales` | Sales | فروخت | فروش |
| `nav.settings` | Settings | ترتیبات | تنظیمات |
| `nav.suppliers` | Suppliers | سپلائرز | تأمین‌كننده‌ها |
## shell

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `shell.backHome` | Back to dashboard | ڈیش بورڈ پر واپس جائیں | بازگشت به داشبورد |
| `shell.brandFallback` | Dukaan AI | Dukaan AI | Dukaan AI |
| `shell.checkingSession` | Checking your session… | سیشن چیک ہو رہا ہے… | جلسه شما بررسي مي‌شود… |
| `shell.chooseTheme` | Choose theme | تھیم منتخب کریں | قالب را انتخاب كنيد |
| `shell.closeMenu` | Close menu | مینیو بند کریں | منو را ببنديد |
| `shell.collapseSidebar` | Collapse sidebar | سائیڈبار سکیڑیں | نوار كناري را جمع كنيد |
| `shell.demoBadgeTitle` | Bundled sample data — connect Firebase to go live | نمونہ ڈیٹا چل رہا ہے — لائیو کرنے کے لیے Firebase جوڑیں | داده نمونه در حال اجرا است — براي زنده شدن Firebase را وصل كنيد |
| `shell.demoMode` | Demo mode | ڈیمو موڈ | حالت نمايشي |
| `shell.demoPill` | Demo project — all data is fictional | ڈیمو پروجیکٹ — تمام ڈیٹا فرضی ہے | پروژه نمايشي — همه داده‌ها خيالي است |
| `shell.expandSidebar` | Expand sidebar | سائیڈبار پھیلائیں | نوار كناري را باز كنيد |
| `shell.footerAboutHeading` | About | ہمارے بارے میں | درباره ما |
| `shell.footerAppHeading` | App | ایپ | برنامه |
| `shell.footerByDemo` | Demo AI project crafted by | ڈیمو اے آئی پروجیکٹ — تیار کردہ | پروژه نمايشي AI — ساخته |
| `shell.footerByProd` | Shop management system by | دکان مینجمنٹ سسٹم — تیار کردہ | سيستم مديريت دكان توسط |
| `shell.footerColCompany` | Company & System | کمپنی اور نظام | شركت و سيستم |
| `shell.footerColFinance` | Finance & Reports | مالیات اور رپورٹیں | مالي و گزارش‌ها |
| `shell.footerColGrowth` | Customers & Growth | گاہک اور کاروباری فروغ | مشتريان و رشد |
| `shell.footerColSales` | Sales & Orders | فروخت اور آرڈرز | فروش و سفارش‌ها |
| `shell.footerColStock` | Stock & Operations | اسٹاک اور آپریشن | موجودي و عمليات |
| `shell.footerRights` | © 2026 Dukaan AI | © 2026 Dukaan AI | © 2026 Dukaan AI |
| `shell.footerRightsDemo` | © 2026 Dukaan AI · Fictional demo data | © 2026 Dukaan AI · فرضی ڈیمو ڈیٹا | © 2026 Dukaan AI · داده نمايشي خيالي |
| `shell.footerTagline` | A complete ERP for every kind of business — smart stock, sales and accounts, demand forecasting, and an AI assistant that answers from your business's own data. | ہر قسم کے کاروبار کے لیے مکمل ERP — اسمارٹ اسٹاک، فروخت اور حساب، طلب کی پیشن گوئی، اور ایک آئی معاون جو آپ کے کاروبار کے ڈیٹا سے جواب دیتا ہے۔ | يک ERP کامل براي هر نوع كسب‌وكار — موجودي هوشمند، فروش و حساب‌ها، پيش‌بيني تقاضا، و يک دستيار هوش مصنوعي که از داده‌هاي خود كسب‌وكار شما پاسخ مي‌دهد۔ |
| `shell.footerTech` | Next.js · Firebase · Flutter | Next.js · Firebase · Flutter | Next.js · Firebase · Flutter |
| `shell.homeLabel` | Dukaan AI home | Dukaan AI ہوم | خانه Dukaan AI |
| `shell.langName` | English | اردو | فارسی |
| `shell.mainNav` | Main navigation | مرکزی نیویگیشن | راهبري اصلي |
| `shell.menu` | Menu | مینیو | منو |
| `shell.notFoundBody` | This page doesn't exist in the dukaan. Let's head back to the counter. | یہ صفحہ دکان میں موجود نہیں۔ آئیے واپس ڈیش بورڈ کی طرف چلیں۔ | اين صفحه در دكان موجود نيست۔ بياييد به داشبورد برگرديم۔ |
| `shell.notFoundTitle` | Shelf not found | صفحہ نہیں ملا | صفحه يافت نشد |
| `shell.openMenu` | Open menu | مینیو کھولیں | منو را باز كنيد |
| `shell.theme.dusk` | Dusk Violet | شفق بنفشی | بنفش غروب |
| `shell.theme.emerald` | Emerald Calm | زمردی سکون | آرامش زمردي |
| `shell.theme.midnight` | Midnight Slate | نیم شب سلیٹ | تخته نيمه‌شب |
| `shell.theme.ocean` | Ocean | سمندری لہر | موج اقيانوس |
| `shell.theme.sand` | Warm Sand | گرم ریت | شن گرم |
| `shell.toggleTheme` | Switch theme | تھیم بدلیں | قالب را تغيير دهيد |
| `sync.online` | Online | آن لائن | آنلاين |
## auth

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `auth.createAccountLink` | Create an account | اکاؤنٹ بنائیں | حساب بسازید |
| `auth.demoNote` | Accounts are not enabled on this demo deployment. The shop data you see is bundled sample data — no login needed. | اس ڈیمو پر اکاؤنٹ سسٹم فعال نہیں ہے۔ آپ جو دکان کا ڈیٹا دیکھ رہے ہیں وہ نمونہ ڈیٹا ہے — لاگ اِن کی ضرورت نہیں۔ | حساب‌ها در این دیمو فعال نیستند. معلومات دکانی که می‌بینید معلومات نمونه‌ای بسته‌بندی شده است — ورود لازم نیست. |
| `auth.email` | Email | ای میل | ایمیل |
| `auth.emailPlaceholder` | you@example.com | you@example.com | you@example.com |
| `auth.err.emailInUse` | An account with this email already exists — try logging in. | اس ای میل سے اکاؤنٹ پہلے سے موجود ہے — لاگ اِن کر کے دیکھیں۔ | حسابی با این ایمیل قبلاً وجود دارد — وارد شدن را امتحان کنید. |
| `auth.err.generic` | Something went wrong. Please try again. | کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔ | چیزی اشتباه شد. لطفاً دوباره کوشش کنید. |
| `auth.err.invalidCredential` | Email or password is incorrect. | ای میل یا پاس ورڈ غلط ہے۔ | ایمیل یا رمز عبور نادرست است. |
| `auth.err.invalidEmail` | That email address looks invalid. | یہ ای میل درست نہیں لگتی۔ | این آدرس ایمیل درست معلوم نمی‌شود. |
| `auth.err.network` | Network error — check your connection. | نیٹ ورک کا مسئلہ ہے — اپنا کنکشن چیک کریں۔ | خطای شبکه — اتصال خود را بررسی کنید. |
| `auth.err.tooMany` | Too many attempts — wait a moment and try again. | بہت زیادہ کوششیں ہو گئی ہیں — تھوڑی دیر بعد دوبارہ کوشش کریں۔ | کوشش‌های زیاد شد — یک لحظه منتظر بمانید و دوباره کوشش کنید. |
| `auth.err.weakPassword` | Password must be at least 6 characters. | پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔ | رمز عبور باید کم از کم 6 حرف باشد. |
| `auth.eyebrow` | Dukaan AI Account | Dukaan AI اکاؤنٹ | حساب Dukaan AI |
| `auth.haveAccount` | Already have an account? | پہلے سے اکاؤنٹ موجود ہے؟ | قبلاً حساب دارید؟ |
| `auth.loginLink` | Log in | لاگ اِن | وارد شوید |
| `auth.loginSub` | Log in to see your shop's live inventory, sales and forecasts. | اپنی دکان کا اسٹاک، فروخت اور پیش گوئی دیکھنے کے لیے لاگ اِن کریں۔ | برای دیدن موجودی زنده، فروش و پیش‌بینی‌های دکان خود وارد شوید. |
| `auth.loginTitle` | Welcome back | خوش آمدید | خوش آمدید |
| `auth.newHere` | New to Dukaan AI? | Dukaan AI پر نئے ہیں؟ | در Dukaan AI جدید هستید؟ |
| `auth.password` | Password | پاس ورڈ | رمز عبور |
| `auth.passwordPlaceholder` | •••••••• | •••••••• | •••••••• |
| `auth.signupSub` | Sign up to run your shop on Dukaan AI — your data stays private to your account. | Dukaan AI پر اپنی دکان چلانے کے لیے سائن اپ کریں — آپ کا ڈیٹا صرف آپ کے اکاؤنٹ تک محفوظ رہے گا۔ | برای چلاندن دکان خود در Dukaan AI ثبت‌نام کنید — معلومات شما فقط برای حساب شما خصوصی می‌ماند. |
| `auth.signupTitle` | Create your shop account | اپنی دکان کا اکاؤنٹ بنائیں | حساب دکان خود را بسازید |
| `auth.submitLogin` | Log in | لاگ اِن | وارد شوید |
| `auth.submitSignup` | Create account | اکاؤنٹ بنائیں | حساب بسازید |
| `auth.wait` | Please wait… | براہ کرم انتظار کریں… | لطفاً منتظر بمانید… |
## settings

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `backup.exportBody` | Downloads one JSON file with the complete business: every collection, the full journal, and this business's own platform records (registry, memberships, counters, events, payments). | ایک JSON فائل ڈاؤن لوڈ ہوگی جس میں مکمل کاروبار ہوگا: تمام کلیکشنز، مکمل جرنل، اور اس کاروبار کے اپنے پلیٹ فارم ریکارڈ (رجسٹری، رکنیتیں، کاؤنٹرز، واقعات، ادائیگیاں)۔ | يك فايل JSON با تجارت كامل دانلود مي‌شود: هر مجموعه، ژورنال كامل، و سوابق پلتفرم خود اين تجارت (ثبت، عضويت‌ها، شمارنده‌ها، رويدادها، پرداخت‌ها)۔ |
| `backup.exportButton` | Download backup | بیک اپ ڈاؤن لوڈ کریں | پشتيبان را دانلود كنيد |
| `backup.exportDone` | Backup downloaded — {docs} documents, {journal} journal entries. | بیک اپ ڈاؤن لوڈ ہو گیا — {docs} دستاویزات، {journal} جرنل اندراجات۔ | پشتيبان دانلود شد — {docs} سند، {journal} ورودي ژورنال۔ |
| `backup.exportFailed` | The backup could not be prepared. Nothing was changed. | بیک اپ تیار نہیں ہو سکا۔ کچھ تبدیل نہیں ہوا۔ | پشتيبان آماده نشد۔ چيزي تغيير نكرد۔ |
| `backup.exporting` | Preparing… | تیار ہو رہا ہے… | آماده مي‌شود… |
| `backup.exportTitle` | Export backup | بیک اپ ایکسپورٹ کریں | پشتيبان را صادر كنيد |
| `backup.fingerprint` | Journal fingerprint | جرنل فنگر پرنٹ | اثر انگشت ژورنال |
| `backup.ownerOnly` | Only the business owner can back up or restore. | صرف کاروبار کا مالک بیک اپ یا بحالی کر سکتا ہے۔ | فقط مالك تجارت مي‌تواند پشتيبان بگيرد يا بازيابي كند۔ |
| `backup.refused.manifestMismatch` | The file does not match its own manifest (counts or the journal fingerprint differ) — it may be damaged or edited. Nothing was written. | فائل اپنے مینی فیسٹ سے نہیں ملتی (تعداد یا جرنل فنگر پرنٹ مختلف ہے) — ممکن ہے فائل خراب یا تبدیل شدہ ہو۔ کچھ نہیں لکھا گیا۔ | فايل با مانيفيست خودش مطابقت ندارد (شمارها يا اثر انگشت ژورنال فرق دارد) — ممكن است آسيب ديده يا ويرايش شده باشد۔ چيزي نوشته نشد۔ |
| `backup.refused.notABackup` | That file is not a Dukaan AI business backup. | یہ فائل دکان AI کے کاروبار کا بیک اپ نہیں ہے۔ | آن فايل پشتيبان تجارت Dukaan AI نيست۔ |
| `backup.refused.targetNotEmpty` | This business is not empty — restore is refused so a live book is never overwritten. Create a new business and restore there. | یہ کاروبار خالی نہیں ہے — بحالی سے انکار ہے تاکہ چلتا کھاتہ کبھی اوور رائٹ نہ ہو۔ نیا کاروبار بنائیں اور وہاں بحال کریں۔ | اين تجارت خالي نيست — بازيابي رد شد تا كتاب زنده هرگز بازنويسي نشود۔ يك تجارت جديد بسازيد و آنجا بازيابي كنيد۔ |
| `backup.refused.unknownFormat` | That backup uses a format this version does not know — use a backup exported by this version. | یہ بیک اپ ایسے فارمیٹ میں ہے جسے یہ ورژن نہیں جانتا — اسی ورژن سے ایکسپورٹ شدہ بیک اپ استعمال کریں۔ | آن پشتيبان از قالبي استفاده مي‌كند كه اين نسخه نمي‌شناسد — از پشتيباني كه اين نسخه صادر كرده استفاده كنيد۔ |
| `backup.restoreAlready` | This backup is already fully restored here — nothing to write. | یہ بیک اپ یہاں پہلے ہی مکمل بحال ہے — لکھنے کو کچھ نہیں۔ | اين پشتيبان قبلاً اينجا كاملاً بازيابي شده است — چيزي براي نوشتن نيست۔ |
| `backup.restoreBody` | Restore works ONLY into a new, empty business — the books here must be empty. A live business is never overwritten: restore the file into a fresh business and trade there. | بحالی صرف نئے، خالی کاروبار میں ممکن ہے — یہاں کے کھاتے خالی ہونے چاہئیں۔ چلتا ہوا کاروبار کبھی اوور رائٹ نہیں ہوتا: فائل کو نئے کاروبار میں بحال کریں اور وہیں کاروبار کریں۔ | بازيابي فقط در يك تجارت جديد و خالي كار مي‌كند — كتاب‌هاي اينجا بايد خالي باشد۔ يك تجارت زنده هرگز بازنويسي نمي‌شود: فايل را در يك تجارت تازه بازيابي كنيد و آنجا تجارت كنيد۔ |
| `backup.restoreConfirm` | Restore into this business | اس کاروبار میں بحال کریں | در اين تجارت بازيابي كنيد |
| `backup.restoreDone` | Restore complete — {written} documents written. This business now holds the backup's books. | بحالی مکمل — {written} دستاویزات لکھی گئیں۔ اب اس کاروبار میں بیک اپ کے کھاتے ہیں۔ | بازيابي كامل شد — {written} سند نوشته شد۔ اين تجارت اكنون كتاب‌هاي پشتيبان را دارد۔ |
| `backup.restoreFailed` | The restore could not be completed. Anything already written matches the backup exactly — pick the same file again to resume. | بحالی مکمل نہیں ہو سکی۔ جو کچھ لکھا جا چکا ہے وہ بیک اپ سے حرف بہ حرف ملتا ہے — دوبارہ یہی فائل منتخب کر کے بحالی آگے بڑھائیں۔ | بازيابي كامل نشد۔ هر چه قبلاً نوشته شده دقيقاً با پشتيبان مطابقت دارد — همان فايل را دوباره انتخاب كنيد تا ادامه دهيد۔ |
| `backup.restorePick` | Choose backup file | بیک اپ فائل منتخب کریں | فايل پشتيبان را انتخاب كنيد |
| `backup.restoreReading` | Checking the file… | فائل جانچی جا رہی ہے… | فايل بررسي مي‌شود… |
| `backup.restoreSource` | Backup of {business} · exported {date} | {business} کا بیک اپ · ایکسپورٹ {date} | پشتيبان {business} · صادرشده {date} |
| `backup.restoreSummary` | {docs} documents to write ({journal} journal entries) — fingerprint verified against the file's own manifest. | {docs} دستاویزات لکھی جائیں گی ({journal} جرنل اندراجات) — فنگر پرنٹ فائل کے اپنے مینی فیسٹ سے تصدیق شدہ ہے۔ | {docs} سند براي نوشتن ({journal} ورودي ژورنال) — اثر انگشت در برابر مانيفيست خود فايل تأييد شد۔ |
| `backup.restoreTitle` | Restore into this business | اس کاروبار میں بحال کریں | در اين تجارت بازيابي كنيد |
| `backup.restoring` | Restoring… | بحالی جاری ہے… | در حال بازيابي… |
| `backup.sub` | Your whole business in one file — every bill, entry and record. The file is yours: export works in every plan state, always. | آپ کا پورا کاروبار ایک فائل میں — ہر بل، ہر اندراج، ہر ریکارڈ۔ یہ فائل آپ کی ملکیت ہے: ایکسپورٹ ہر پلان حالت میں ہمیشہ ممکن ہے۔ | كل تجارت شما در يك فايل — هر بل، ورودي و سابقه۔ فايل مال شما است: صادر كردن در هر حالت پلان كار مي‌كند، هميشه۔ |
| `backup.title` | Backup & restore | بیک اپ اور بحالی | پشتيبان و بازيابي |
| `settings.accountEmail` | Email | ای میل | ايميل |
| `settings.accountMode` | Mode | موڈ | حالت |
| `settings.accountRole` | Role | کردار | نقش |
| `settings.accountSub` | Your sign-in details for this shop. | اس دکان کے لیے آپ کی لاگ اِن تفصیلات۔ | جزئيات ورود شما براي اين دكان۔ |
| `settings.accountTitle` | Account | اکاؤنٹ | حساب |
| `settings.acct.add` | Add account | کھاتہ شامل کریں | حساب اضافه كنيد |
| `settings.acct.addTitle` | Add an account | نیا کھاتہ شامل کریں | يك حساب اضافه كنيد |
| `settings.acct.amount` | Amount (PKR) * | رقم (روپے) * | مبلغ (PKR) * |
| `settings.acct.archive` | Archive | بند کریں | بايگاني |
| `settings.acct.archiveBlocked` | This account carries your pre-accounts history and cannot be archived. | اس کھاتے میں کھاتوں سے پہلے کی تاریخ ہے، اسے بند نہیں کیا جا سکتا۔ | اين حساب تاريخ قبل از حساب‌ها را دارد و بايگاني نمي‌شود۔ |
| `settings.acct.archived` | Archived | بند شدہ | بايگاني‌شده |
| `settings.acct.balance` | Balance | بیلنس | مانده |
| `settings.acct.defaultBadge` | Default for {method} | {method} کے لیے طے شدہ | پيش‌فرض براي {method} |
| `settings.acct.defaultShort` | Default | طے شدہ | پيش‌فرض |
| `settings.acct.defaultsSub` | New payments settle into the default account for their method; the desk can still pick a different account on any payment. | نئی ادائیگیاں اپنے طریقے کے طے شدہ کھاتے میں جاتی ہیں؛ کاؤنٹر پر کسی بھی ادائیگی کے لیے دوسرا کھاتہ بھی منتخب کیا جا سکتا ہے۔ | پرداخت‌هاي جديد به حساب پيش‌فرض روش خود مي‌روند؛ ميز هنوز مي‌تواند در هر پرداخت حساب ديگري انتخاب كند۔ |
| `settings.acct.defaultsTitle` | Payment defaults | ادائیگی کے طے شدہ کھاتے | پيش‌فرض‌هاي پرداخت |
| `settings.acct.doTransfer` | Transfer | منتقل کریں | انتقال دهيد |
| `settings.acct.errAmount` | Enter an amount greater than 0. | 0 سے زیادہ رقم درج کریں۔ | مبلغي بيشتر از 0 وارد كنيد۔ |
| `settings.acct.errName` | Enter an account name. | کھاتے کا نام درج کریں۔ | نام حساب را وارد كنيد۔ |
| `settings.acct.errSame` | Choose two different accounts. | دو مختلف کھاتے منتخب کریں۔ | دو حساب متفاوت انتخاب كنيد۔ |
| `settings.acct.from` | From account | اس کھاتے سے | از حساب |
| `settings.acct.kind` | Type | قسم | نوع |
| `settings.acct.kindBank` | Bank account | بینک کھاتہ | حساب بانكي |
| `settings.acct.kindCash` | Cash (till) | نقد (گلّہ) | نقد (كشو) |
| `settings.acct.kindWallet` | Wallet | والیٹ | كيف پول |
| `settings.acct.legacyNote` | Holds all history from before money accounts — rename only, cannot be archived. | رقم کے کھاتوں سے پہلے کی تمام تاریخ اسی کھاتے میں ہے — صرف نام بدلا جا سکتا ہے، بند نہیں کیا جا سکتا۔ | همه تاريخ قبل از حساب‌هاي پول را نگه مي‌دارد — فقط نام قابل تغيير است، بايگاني نمي‌شود۔ |
| `settings.acct.method` | Default for payments by | ادائیگی کا طے شدہ طریقہ | پيش‌فرض براي پرداخت با |
| `settings.acct.methodNone` | None — choose at the desk | کوئی نہیں — کاؤنٹر پر منتخب کریں | هيچ — روي ميز انتخاب كنيد |
| `settings.acct.name` | Account name | کھاتے کا نام | نام حساب |
| `settings.acct.namePlaceholder` | e.g. HBL Current, Shop Easypaisa | مثلاً HBL کرنٹ، دکان کا Easypaisa | مثال HBL Current, Shop Easypaisa |
| `settings.acct.noMethod` | No payment default | ادائیگی کا کوئی طے شدہ کھاتہ نہیں | پيش‌فرض پرداخت نيست |
| `settings.acct.note` | Note | نوٹ | يادداشت |
| `settings.acct.notePlaceholder` | e.g. Day's takings deposited to bank | مثلاً دن کی کمائی بینک میں جمع کرائی | مثال درآمدهاي روز به بانك واريز شد |
| `settings.acct.rename` | Rename | نام بدلیں | نام را تغيير دهيد |
| `settings.acct.staffNote` | Money accounts are managed by the shop owner. | رقم کے کھاتے دکان کا مالک چلاتا ہے۔ | حساب‌هاي پول توسط مالك دكان مديريت مي‌شود۔ |
| `settings.acct.sub` | Where your money sits — the till, wallets and bank accounts. Balances are derived live from the journal; accounts are archived, never deleted. | آپ کی رقم کہاں ہے — گلّہ، والیٹس اور بینک کھاتے۔ بیلنس جرنل سے براہِ راست نکلتے ہیں؛ کھاتے بند (آرکائیو) ہوتے ہیں، کبھی حذف نہیں ہوتے۔ | پول شما كجا است — كشو، كيف پول‌ها و حساب‌هاي بانكي۔ مانده‌ها به‌صورت زنده از ژورنال گرفته مي‌شود؛ حساب‌ها بايگاني مي‌شوند، هرگز حذف نمي‌شوند۔ |
| `settings.acct.title` | Money accounts | رقم کے کھاتے | حساب‌هاي پول |
| `settings.acct.to` | To account | اس کھاتے میں | به حساب |
| `settings.acct.transfer` | Transfer money | رقم منتقل کریں | پول را انتقال دهيد |
| `settings.acct.transferDone` | Transferred {amount} from {from} to {to}. | {amount} {from} سے {to} میں منتقل ہو گئی۔ | {amount} از {from} به {to} انتقال يافت۔ |
| `settings.acct.transferTitle` | Transfer between accounts | کھاتوں کے درمیان منتقلی | انتقال بين حساب‌ها |
| `settings.addressPlaceholder` | Shop address | دکان کا پتا | آدرس دكان |
| `settings.confirmAria` | Confirm reset | ری سیٹ کی تصدیق | بازنشاني را تأييد كنيد |
| `settings.confirmBody` | All current products, sales and records will be replaced with the sample shop data. In production this reseeds the owner's namespace. This cannot be undone. | تمام موجودہ مصنوعات، فروخت اور ریکارڈ نمونہ دکان کے ڈیٹا سے بدل جائیں گے۔ پروڈکشن میں یہ مالک کے ڈیٹا کو دوبارہ سیٹ کرتا ہے۔ یہ عمل واپس نہیں لیا جا سکتا۔ | همه كالاها، فروش‌ها و سوابق فعلي با داده دكان نمونه جايگزين خواهد شد۔ در توليد اين فضاي نام مالك را دوباره مي‌كارد۔ اين كار قابل برگشت نيست۔ |
| `settings.confirmReset` | Reset data | ڈیٹا ری سیٹ کریں | داده را بازنشاني كنيد |
| `settings.confirmTitle` | Reset demo data? | ڈیمو ڈیٹا ری سیٹ کریں؟ | داده نمايشي بازنشاني شود؟ |
| `settings.dataSub` | Reset demo data restores the sample shop. In production this reseeds the owner's namespace. | ڈیمو ڈیٹا ری سیٹ کرنے سے نمونہ دکان واپس آ جاتی ہے۔ پروڈکشن میں یہ مالک کے ڈیٹا کو دوبارہ نمونہ ڈیٹا سے بدل دیتا ہے۔ | بازنشاني داده نمايشي دكان نمونه را برمي‌گرداند۔ در توليد اين فضاي نام مالك را دوباره مي‌كارد۔ |
| `settings.dataTitle` | Data | ڈیٹا | داده‌ها |
| `settings.demoMode` | Demo mode | ڈیمو موڈ | حالت نمايشي |
| `settings.eyebrow` | Shop settings | دکان کی ترتیبات | تنظيمات دكان |
| `settings.invalidEmail` | Enter a valid email address. | درست ای میل ایڈریس درج کریں۔ | يك آدرس ايميل معتبر وارد كنيد۔ |
| `settings.inviteNote` | Invite by email and pick a role → the staff member signs up / signs in with that exact email → they land in THIS shop with the access of their role; removing an email cuts access immediately. Manager = full shop access except settings and staff; Cashier = sales, billing, returns and day close only; Accountant = finance, expenses and payments, no selling. | ای میل سے دعوت دیں اور کردار منتخب کریں ← عملے کا فرد اسی ای میل سے سائن اپ / لاگ اِن کرے ← وہ اسی دکان میں اپنے کردار کی رسائی کے ساتھ آئے گا؛ ای میل ہٹاتے ہی رسائی فوراً ختم ہو جاتی ہے۔ منیجر = ترتیبات اور عملے کے سوا دکان کی مکمل رسائی؛ کیشیئر = صرف فروخت، بلنگ، واپسی اور ڈے کلوز؛ اکاؤنٹنٹ = مالیات، اخراجات اور ادائیگیاں، فروخت نہیں۔ | با ايميل دعوت كنيد و نقش انتخاب كنيد ← كاركن با همان ايميل ثبت‌نام / وارد مي‌شود ← آنها با دسترسي نقش خود به اين دكان مي‌آيند؛ حذف ايميل دسترسي را فوراً قطع مي‌كند۔ مدير = دسترسي كامل دكان به‌جز تنظيمات و كاركنان؛ صندوقدار = فقط فروش، بل‌سازي، برگشت و بستن روز؛ محاسب = امور مالي، مصارف و پرداخت‌ها، بدون فروش۔ |
| `settings.langDraftPreview` | Draft preview | مسودہ | پیش‌نویس |
| `settings.langEnglish` | English | English | English |
| `settings.langFarsi` | فارسی | فارسی | فارسی |
| `settings.langPashto` | پښتو | پښتو | پښتو |
| `settings.languageSub` | App language — English or Urdu. | ایپ کی زبان — انگریزی یا اردو۔ | زبان برنامه — انگلیسی، اردو، پشتو یا فارسی۔ |
| `settings.languageTitle` | Language | زبان | زبان |
| `settings.langUrdu` | اردو | اردو | اردو |
| `settings.lead` | Your shop profile, who can work in this shop, language and data. | آپ کی دکان کی معلومات، دکان میں کام کرنے والے افراد، زبان اور ڈیٹا۔ | پروفايل دكان شما، چه كساني مي‌توانند در اين دكان كار كنند، زبان و داده‌ها۔ |
| `settings.loading` | Loading settings… | ترتیبات لوڈ ہو رہی ہیں… | تنظيمات بار مي‌شود… |
| `settings.modeDemo` | Demo | ڈیمو | نمايشي |
| `settings.modeLive` | Live | لائیو | زنده |
| `settings.noStaff` | No staff added yet. | ابھی کوئی عملہ شامل نہیں کیا گیا۔ | هنوز كاركني اضافه نشده است۔ |
| `settings.per.actionClose` | Closed | بند کی گئی | بسته شد |
| `settings.per.actionReopen` | Reopened | دوبارہ کھولی گئی | باز شد |
| `settings.per.by` | by {email} | از {email} | توسط {email} |
| `settings.per.close` | Close period | مدت بند کریں | دوره را ببنديد |
| `settings.per.closeConfirm` | Lock the books through {date}? This cannot be undone quietly — reopening requires a recorded reason and stays in the history below. | کھاتے {date} تک مقفل کر دیں؟ یہ خاموشی سے واپس نہیں ہوتا — دوبارہ کھولنے کے لیے وجہ درج ہوگی اور وہ نیچے تاریخ میں محفوظ رہے گی۔ | كتاب‌ها تا {date} قفل شود؟ اين به‌آرامي قابل برگشت نيست — بازگشايي به دليل ثبت‌شده نياز دارد و در تاريخ زير مي‌ماند۔ |
| `settings.per.closed` | Books locked through {date}. | کھاتے {date} تک مقفل ہو گئے۔ | كتاب‌ها تا {date} قفل شد۔ |
| `settings.per.closeLabel` | Close period through | مدت اس تاریخ تک بند کریں | دوره را تا ببنديد |
| `settings.per.closeNote` | Note (optional) | نوٹ (اختیاری) | يادداشت (اختياري) |
| `settings.per.closeNotePlaceholder` | e.g. Month reviewed with the accountant | مثلاً مہینہ اکاؤنٹنٹ کے ساتھ جانچ لیا گیا | مثال ماه با محاسب بررسي شد |
| `settings.per.day` | Day | دن | روز |
| `settings.per.errBackwards` | That date is already locked. To move the lock back, use Reopen below. | یہ تاریخ پہلے ہی مقفل ہے۔ قفل پیچھے لے جانے کے لیے نیچے دوبارہ کھولیں استعمال کریں۔ | آن تاريخ قبلاً قفل است۔ براي برگرداندن قفل به عقب، از بازگشايي در پايين استفاده كنيد۔ |
| `settings.per.errDate` | Choose a valid date. | درست تاریخ منتخب کریں۔ | يك تاريخ معتبر انتخاب كنيد۔ |
| `settings.per.errNothing` | There is no lock to reopen. | کھولنے کے لیے کوئی قفل موجود نہیں۔ | قفلي براي باز كردن نيست۔ |
| `settings.per.errRail` | A close cannot cover today or yesterday — offline entries may still be syncing. The latest closable date is {date}. | بندش آج یا کل کی تاریخ نہیں لے سکتی — آف لائن اندراج ابھی سنک ہو رہے ہو سکتے ہیں۔ آخری قابلِ بندش تاریخ {date} ہے۔ | بستن نمي‌تواند امروز يا ديروز را بپوشاند — ورودي‌هاي آفلاين ممكن است هنوز همگام شوند۔ آخرين تاريخ قابل بستن {date} است۔ |
| `settings.per.errReason` | A reason is required — every reopening is recorded in the history. | وجہ ضروری ہے — ہر دوبارہ کھولنا تاریخ میں درج ہوتا ہے۔ | دليل لازم است — هر بازگشايي در تاريخ ثبت مي‌شود۔ |
| `settings.per.fiscalCurrent` | Current fiscal year: {start} – {end} | موجودہ مالی سال: {start} – {end} | سال مالي فعلي: {start} – {end} |
| `settings.per.fiscalSaved` | Fiscal year start saved. | مالی سال کا آغاز محفوظ ہو گیا۔ | شروع سال مالي ذخيره شد۔ |
| `settings.per.fiscalStart` | Fiscal year starts on | مالی سال شروع ہوتا ہے | سال مالي شروع مي‌شود در |
| `settings.per.historyEmpty` | No period has been closed or reopened yet. | ابھی کوئی مدت بند یا دوبارہ کھولی نہیں گئی۔ | هنوز دوره‌اي بسته يا باز نشده است۔ |
| `settings.per.historyTitle` | Period history | مدتوں کی تاریخ | تاريخ دوره‌ها |
| `settings.per.lockedThrough` | The books are locked through {date}. No posting — sale, expense, bill or correction — can be dated on or before it. | کھاتے {date} تک مقفل ہیں۔ کوئی اندراج — فروخت، خرچ، بل یا تصحیح — اس تاریخ یا اس سے پہلے کی تاریخ سے درج نہیں ہو سکتا۔ | كتاب‌ها تا {date} قفل هستند۔ هيچ ثبتي — فروش، مصرف، بل يا اصلاح — نمي‌تواند در آن تاريخ يا قبل از آن ثبت شود۔ |
| `settings.per.lockTitle` | Period lock | مدت کا قفل | قفل دوره |
| `settings.per.month` | Month | مہینہ | ماه |
| `settings.per.notLocked` | No period is locked yet. Postings can still be dated on any past day. | ابھی کوئی مدت مقفل نہیں ہے۔ اندراج کسی بھی پچھلی تاریخ سے ہو سکتا ہے۔ | هنوز دوره‌اي قفل نشده است۔ ثبت‌ها هنوز مي‌توانند در هر روز گذشته تاريخ بخورند۔ |
| `settings.per.open` | no lock | کوئی قفل نہیں | قفلي نيست |
| `settings.per.reason` | Reason * | وجہ * | دليل * |
| `settings.per.reasonPlaceholder` | e.g. A missed expense must be entered for last month | مثلاً پچھلے مہینے کا ایک خرچ درج کرنا رہ گیا تھا | مثال يك مصرف از دست‌رفته بايد براي ماه گذشته وارد شود |
| `settings.per.reopen` | Reopen | دوبارہ کھولیں | باز كنيد |
| `settings.per.reopened` | Lock moved back — the books are now locked through {date}. | قفل پیچھے ہو گیا — کھاتے اب {date} تک مقفل ہیں۔ | قفل به عقب رفت — كتاب‌ها اكنون تا {date} قفل هستند۔ |
| `settings.per.reopenedFully` | Periods reopened — no lock is in force. | مدتیں کھول دی گئیں — اب کوئی قفل نہیں ہے۔ | دوره‌ها باز شد — هيچ قفلي در كار نيست۔ |
| `settings.per.reopenFully` | Fully reopen — remove the lock | مکمل کھولیں — قفل ختم کریں | كاملاً باز كنيد — قفل را حذف كنيد |
| `settings.per.reopenLabel` | Move the lock back — locked through | قفل پیچھے لے جائیں — مقفل رہے | قفل را به عقب ببريد — قفل تا |
| `settings.per.reopenTitle` | Reopen a closed period | بند مدت دوبارہ کھولیں | يك دوره بسته را باز كنيد |
| `settings.per.sub` | When your fiscal year starts, and period closing. Once a period is closed, no posting can be dated inside it — corrections are recorded at the correction date, never backdated, exactly as in paper books. | آپ کا مالی سال کب شروع ہوتا ہے، اور مدت بند کرنا۔ مدت بند ہو جانے کے بعد اس کے اندر کی تاریخ سے کوئی اندراج نہیں ہو سکتا — تصحیح ہمیشہ تصحیح والی تاریخ سے درج ہوتی ہے، پچھلی تاریخ سے کبھی نہیں، بالکل کاغذی کھاتوں کی طرح۔ | سال مالي شما چه وقت شروع مي‌شود، و بستن دوره۔ وقتي دوره‌اي بسته شد، هيچ ثبتي نمي‌تواند داخل آن تاريخ بخورد — اصلاحات در تاريخ اصلاح ثبت مي‌شود، هرگز به عقب برنمي‌گردد، دقيقاً مانند كتاب‌هاي كاغذي۔ |
| `settings.per.through` | through {date} | {date} تک | تا {date} |
| `settings.per.title` | Fiscal year & periods | مالی سال اور مدتیں | سال مالي و دوره‌ها |
| `settings.phonePlaceholder` | e.g. 0300-1234567 | مثلاً 0300-1234567 | مثال 0300-1234567 |
| `settings.profileSub` | Shown on bills and across the app. | بلوں پر اور پوری ایپ میں دکھائی جاتی ہے۔ | در بل‌ها و در سراسر برنامه نشان داده مي‌شود۔ |
| `settings.profileTitle` | Shop profile | دکان کی معلومات | پروفايل دكان |
| `settings.resetDemo` | Reset demo data | ڈیمو ڈیٹا ری سیٹ کریں | داده نمايشي را بازنشاني كنيد |
| `settings.roleAccountant` | Accountant | اکاؤنٹنٹ | محاسب |
| `settings.roleCashier` | Cashier | کیشیئر | صندوقدار |
| `settings.roleManager` | Manager | منیجر | مدير |
| `settings.roleOwner` | Owner | مالک | مالك |
| `settings.roleStaff` | Staff | عملہ | كاركنان |
| `settings.roleUpdated` | Role updated. | کردار تبدیل ہو گیا۔ | نقش به‌روز شد۔ |
| `settings.saved` | Saved. | محفوظ ہو گیا۔ | ذخيره شد۔ |
| `settings.shopName` | Shop name | دکان کا نام | نام دكان |
| `settings.shopNamePlaceholder` | e.g. Al-Madina Kiryana Store | مثلاً المدینہ کریانہ اسٹور | مثال Al-Madina Kiryana Store |
| `settings.signedInAs` | Signed in as {email} — {role} | {email} کے طور پر لاگ اِن — {role} | با {email} وارد شده‌ايد — {role} |
| `settings.staffEmail` | Staff email | عملے کی ای میل | ايميل كاركن |
| `settings.staffEmailPlaceholder` | staff@example.com | staff@example.com | staff@example.com |
| `settings.staffLegacyNote` | Staff added before roles were introduced keep Manager access — exactly the access they have always had. Change anyone's role here whenever you are ready. | کرداروں کے نظام سے پہلے شامل کیا گیا عملہ منیجر کی رسائی رکھتا ہے — بالکل وہی رسائی جو ہمیشہ سے تھی۔ جب چاہیں یہاں سے کسی کا کردار بدل لیں۔ | كاركناني كه قبل از معرفي نقش‌ها اضافه شده‌اند دسترسي مدير را نگه مي‌دارند — دقيقاً همان دسترسي كه هميشه داشته‌اند۔ هر وقت آماده بوديد نقش هر كس را اينجا تغيير دهيد۔ |
| `settings.staffOnlyNote` | Only the shop owner can change shop settings. | دکان کی ترتیبات صرف دکان کا مالک بدل سکتا ہے۔ | فقط مالك دكان مي‌تواند تنظيمات دكان را تغيير دهد۔ |
| `settings.staffRole` | Role | کردار | نقش |
| `settings.staffRoleAria` | Role for {email} | {email} کے لیے کردار | نقش براي {email} |
| `settings.staffSelfNote` | You are signed in as staff of this shop. Settings are managed by the owner. | آپ اس دکان کے عملے کے طور پر لاگ اِن ہیں۔ ترتیبات کا انتظام مالک کے پاس ہے۔ | شما به‌عنوان كاركن اين دكان وارد شده‌ايد۔ تنظيمات توسط مالك مديريت مي‌شود۔ |
| `settings.staffSub` | People who can work in this shop. | وہ افراد جو اس دکان میں کام کر سکتے ہیں۔ | افرادي كه مي‌توانند در اين دكان كار كنند۔ |
| `settings.staffTitle` | Staff access | عملے کی رسائی | دسترسي كاركنان |
| `settings.title` | Settings | ترتیبات | تنظیمات |
## tax

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `tax.active` | Active | فعال | فعال |
| `tax.add` | Add slab | سلیب شامل کریں | سلیب اضافه کنید |
| `tax.addTitle` | Add a tax slab | نئی ٹیکس سلیب بنائیں | یک سلیب مالیاتی اضافه کنید |
| `tax.appliesBoth` | Sales & purchases | فروخت و خریداری | فروش و خرید |
| `tax.appliesPurchases` | Purchases | خریداری | خرید |
| `tax.appliesSales` | Sales | فروخت | فروش |
| `tax.appliesTo` | Applies to | لاگو ہوتی ہے | تطبیق می‌شود بر |
| `tax.defaultBadge` | Default | ڈیفالٹ | پیش‌فرض |
| `tax.defaultPurchases` | Default for purchases | خریداری کی ڈیفالٹ | پیش‌فرض برای خرید |
| `tax.defaultSales` | Default for sales | فروخت کی ڈیفالٹ | پیش‌فرض برای فروش |
| `tax.defaultSaved` | Tax defaults updated. | ٹیکس ڈیفالٹس اپ ڈیٹ ہو گئیں۔ | پیش‌فرض‌های مالیات به‌روز شد. |
| `tax.defaultsSub` | The default slab applies to every product that does not carry its own slab. Choose “No tax” to switch tax off for that side — existing bills and purchases never change. | ڈیفالٹ سلیب ہر اس پروڈکٹ پر لاگو ہوتی ہے جس کی اپنی سلیب نہیں۔ اس طرف کا ٹیکس بند کرنے کے لیے ”کوئی ٹیکس نہیں“ منتخب کریں — پرانے بل اور خریداریاں کبھی نہیں بدلتیں۔ | سلیب پیش‌فرض بر هر کالایی تطبیق می‌شود که سلیب خودش را ندارد. برای خاموش کردن مالیات آن طرف، “بدون مالیات” را انتخاب کنید — بل‌ها و خریدهای موجود هرگز تغییر نمی‌کنند. |
| `tax.defaultsTitle` | Shop defaults | دکان کی ڈیفالٹس | پیش‌فرض‌های دکان |
| `tax.edit` | Edit | تبدیل کریں | ویرایش |
| `tax.editTitle` | Edit tax slab | ٹیکس سلیب تبدیل کریں | سلیب مالیاتی را ویرایش کنید |
| `tax.empty` | No tax slabs yet. | ابھی کوئی ٹیکس سلیب نہیں۔ | هنوز هیچ سلیب مالیاتی نیست. |
| `tax.errName` | Give the slab a name. | سلیب کو ایک نام دیں۔ | به سلیب یک نام بدهید. |
| `tax.errRate` | Rate must be 0 or more. | شرح 0 یا اس سے زیادہ ہونی چاہیے۔ | نرخ باید 0 یا بیشتر باشد. |
| `tax.exclusiveBadge` | Added on top | قیمت کے اوپر | اضافه بر قیمت |
| `tax.inactive` | Inactive | غیر فعال | غیرفعال |
| `tax.inclusive` | Prices already include this tax | قیمتوں میں یہ ٹیکس پہلے سے شامل ہے | قیمت‌ها قبلاً این مالیات را شامل‌اند |
| `tax.inclusiveBadge` | Inclusive | شاملِ قیمت | شامل قیمت |
| `tax.kind` | Kind | قسم | نوع |
| `tax.kindFixed` | Fixed amount per unit | فی یونٹ مقررہ رقم | مبلغ ثابت فی واحد |
| `tax.kindPercent` | Percent of price | قیمت کا فیصد | فیصدی از قیمت |
| `tax.name` | Slab name | سلیب کا نام | نام سلیب |
| `tax.namePlaceholder` | e.g. GST | مثلاً GST | مثلاً GST |
| `tax.noDefault` | No tax | کوئی ٹیکس نہیں | بدون مالیات |
| `tax.perUnit` | {amount} per unit | {amount} فی یونٹ | {amount} فی واحد |
| `tax.rateFixed` | Amount per unit (PKR) | فی یونٹ رقم (PKR) | مبلغ فی واحد (PKR) |
| `tax.ratePercent` | Rate (%) | شرح (%) | نرخ (%) |
| `tax.readonlyNote` | You can view the tax slabs; only the owner can change them. | آپ ٹیکس سلیبز دیکھ سکتے ہیں؛ تبدیلی صرف مالک کر سکتا ہے۔ | شما سلیب‌های مالیاتی را دیده می‌توانید؛ فقط مالک آن‌ها را تغییر داده می‌تواند. |
| `tax.removed` | Tax slab removed. | ٹیکس سلیب ختم کر دی گئی۔ | سلیب مالیاتی حذف شد. |
| `tax.saved` | Tax slab saved. | ٹیکس سلیب محفوظ ہو گئی۔ | سلیب مالیاتی ذخیره شد. |
| `tax.sub` | Define the taxes your shop charges (e.g. GST). A slab only ever applies when it is active AND set as a shop default below or assigned to a product — until then, no bill or purchase carries tax. | اپنی دکان کے ٹیکسز متعین کریں (مثلاً GST)۔ کوئی سلیب تبھی لاگو ہوتی ہے جب وہ فعال ہو اور نیچے دکان کی ڈیفالٹ مقرر ہو یا کسی پروڈکٹ کو دی گئی ہو — اس سے پہلے کسی بل یا خریداری پر کوئی ٹیکس نہیں لگتا۔ | مالیاتی را که دکان شما می‌گیرد مشخص کنید (مثلاً GST). یک سلیب فقط وقتی تطبیق می‌شود که فعال باشد و در پایین به حیث پیش‌فرض دکان تعیین شود یا به یک کالا داده شود — تا آن وقت، هیچ بل یا خریدی مالیات ندارد. |
| `tax.title` | Tax slabs | ٹیکس سلیبز | سلیب‌های مالیات |
## notes

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `billing.returnReason` | Reason (printed on the credit note) | وجہ (کریڈٹ نوٹ پر چھپے گی) | دلیل (روی یادداشت كریدت چاپ می‌شود) |
| `billing.returnReasonPh` | Reason for the return… | واپسی کی وجہ… | دلیل برگشت… |
| `billing.successReturnedNote` | Bill #{no} returned — credit note {note} issued. | بل نمبر {no} واپس ہو گیا — کریڈٹ نوٹ {note} جاری ہو گیا۔ | بل #{no} برگردانده شد — یادداشت كریدت {note} صادر شد. |
| `note.againstBill` | Bill #{no} | بل نمبر {no} | بل #{no} |
| `note.againstPurchase` | Purchase · {date} | خریداری · {date} | خرید · {date} |
| `note.col.against` | Against | بنام | در برابر |
| `note.col.goods` | Goods | سامان | كالا |
| `note.col.kind` | Kind | قسم | نوع |
| `note.col.number` | Note | نوٹ | یادداشت |
| `note.col.party` | Party | فریق | طرف |
| `note.col.tax` | Tax reversed | واپس شدہ ٹیکس | مالیات برگشتی |
| `note.empty` | No notes yet. Post a formal bill return or return goods to a supplier and its note will appear here. | ابھی کوئی نوٹ نہیں۔ بل کی باقاعدہ واپسی درج کریں یا سپلائر کو سامان واپس کریں — اس کا نوٹ یہاں آ جائے گا۔ | هنوز یادداشتی نیست. یك برگشت رسمی بل ثبت كنید یا كالا را به تأمین‌كننده برگردانید، یادداشت آن اینجا ظاهر می‌شود. |
| `note.filter.all` | All notes | تمام نوٹس | همه یادداشت‌ها |
| `note.filter.credit` | Credit notes | کریڈٹ نوٹس | یادداشت‌های كریدت |
| `note.filter.debit` | Debit notes | ڈیبٹ نوٹس | یادداشت‌های دبت |
| `note.issue.account` | Refund from account | واپسی کس کھاتے سے | بازپرداخت از حساب |
| `note.issue.bill` | Bill | بل | بل |
| `note.issue.customer` | Customer | گاہک | مشتری |
| `note.issue.failed` | The return could not be posted. | واپسی درج نہیں ہو سکی۔ | برگشت ثبت نشد. |
| `note.issue.left` | {qty} left | {qty} باقی | {qty} باقی |
| `note.issue.method` | Refund method | رقم واپسی کا طریقہ | طریقه بازپرداخت |
| `note.issue.noBills` | No posted bills can take a return right now. | اس وقت کوئی درج شدہ بل واپسی کے قابل نہیں۔ | در حال حاضر هیچ بل ثبت‌شده‌ای نمی‌تواند برگشت بگیرد. |
| `note.issue.reasonPh` | Why are the goods coming back? | سامان واپس کیوں آ رہا ہے؟ | چرا كالا برگشت می‌خورد؟ |
| `note.issue.returnQty` | Return qty | واپسی مقدار | مقدار برگشت |
| `note.issue.selectBill` | Select a posted bill… | درج شدہ بل منتخب کریں… | یك بل ثبت‌شده را انتخاب كنید… |
| `note.issue.sub` | Post a return against a posted bill — the return posts through the ordinary returns engine and the credit note is minted with it, in the same step. | درج شدہ بل کے خلاف واپسی لگائیں — واپسی معمول کے واپسی نظام سے درج ہوتی ہے اور کریڈٹ نوٹ اسی قدم میں اس کے ساتھ بنتا ہے۔ | در برابر یك بل ثبت‌شده برگشت ثبت كنید — برگشت از طریق انجن معمول برگشت‌ها ثبت می‌شود و یادداشت كریدت در همان مرحله با آن ساخته می‌شود. |
| `note.issue.submit` | Post return & issue note | واپسی درج کر کے نوٹ جاری کریں | ثبت برگشت و صدور یادداشت |
| `note.issue.success` | Credit note {number} issued against Bill #{no}. | بل نمبر {no} کے خلاف کریڈٹ نوٹ {number} جاری ہو گیا۔ | یادداشت كریدت {number} در برابر بل #{no} صادر شد. |
| `note.issue.title` | Issue credit note | کریڈٹ نوٹ جاری کریں | صدور یادداشت كریدت |
| `note.kind.credit` | Credit note | کریڈٹ نوٹ | یادداشت كریدت |
| `note.kind.debit` | Debit note | ڈیبٹ نوٹ | یادداشت دبت |
| `note.posted` | Posted | درج شدہ | ثبت شده |
| `note.print` | Print | چھاپیں | چاپ |
| `note.print.againstBill` | Against Bill #{no} | بنام بل نمبر {no} | در برابر بل #{no} |
| `note.print.againstPurchase` | Against purchase of {date} | بنام خریداری بتاریخ {date} | در برابر خرید {date} |
| `note.print.cashBack` | Cash received back | نقد وصول ہوا | نقد پس گرفته شد |
| `note.print.creditTitle` | Credit Note | کریڈٹ نوٹ | یادداشت كریدت |
| `note.print.debitTitle` | Debit Note | ڈیبٹ نوٹ | یادداشت دبت |
| `note.print.footer` | This note formalizes a return already posted to the shop's ledger. | یہ نوٹ اس واپسی کی باقاعدہ دستاویز ہے جو دکان کے کھاتے میں پہلے سے درج ہے۔ | این یادداشت برگشتی را رسمی می‌كند كه قبلاً در دفتر دكان ثبت شده است. |
| `note.print.goods` | Goods returned | واپس شدہ سامان | كالای برگشتی |
| `note.print.payableReduced` | Payable reduced | واجب الادا کم ہوا | قابل پرداخت كاهش یافت |
| `note.print.refundedCash` | Refunded in cash | نقد واپس ہوا | به صورت نقد بازپرداخت شد |
| `note.print.tax` | Tax reversed | واپس شدہ ٹیکس | مالیات برگشتی |
| `note.print.udhaarReduced` | Udhaar reduced | ادھار کم ہوا | قرض كاهش یافت |
| `note.reason` | Reason | وجہ | دلیل |
| `note.searchPh` | Search note number or party… | نوٹ نمبر یا فریق تلاش کریں… | شماره یادداشت یا طرف را جستجو كنید… |
| `note.settle.cash_refund` | Cash refund | نقد واپسی | بازپرداخت نقد |
| `note.settle.credit_reduction` | Udhaar reduced | ادھار کم ہوا | قرض كاهش یافت |
| `note.settle.payable_offset` | Payable reduced | واجب الادا کم ہوا | قابل پرداخت كاهش یافت |
| `note.settlement` | Settlement | تصفیہ | تسویه |
| `note.subtitle` | The formal paper for returned goods. A credit note is minted with a bill return; a debit note with goods returned to a supplier. Every note wraps a posting that is already in the ledger — the note itself never moves money. | واپس شدہ سامان کی باقاعدہ دستاویز۔ کریڈٹ نوٹ بل کی واپسی کے ساتھ بنتا ہے؛ ڈیبٹ نوٹ سپلائر کو سامان واپس کرنے پر۔ ہر نوٹ اس اندراج کی دستاویز ہے جو کھاتے میں پہلے سے درج ہے — نوٹ خود کوئی رقم نہیں چلاتا۔ | سند رسمی كالاهای برگشتی. یادداشت كریدت با برگشت بل ساخته می‌شود؛ یادداشت دبت با برگشت كالا به تأمین‌كننده. هر یادداشت ثبتی را در بر می‌گیرد كه قبلاً در دفتر است — خود یادداشت هیچ‌گاه پول را حركت نمی‌دهد. |
| `note.title` | Credit & Debit Notes | کریڈٹ و ڈیبٹ نوٹس | یادداشت‌های كریدت و دبت |
| `note.view` | View | دیکھیں | مشاهده |
| `sup.detail.summaryFull` | Purchased {purchased} · Returned {returned} · Paid {paid} | خریداری {purchased} · واپسی {returned} · ادا شدہ {paid} | خریداری شده {purchased} · برگردانده شده {returned} · پرداخت شده {paid} |
| `sup.preturn.account` | Refund into account | رقم کس کھاتے میں آئے | بازپرداخت به حساب |
| `sup.preturn.against` | Against purchase of {date} | خریداری بتاریخ {date} کے خلاف | در برابر خرید {date} |
| `sup.preturn.alreadyReturned` | {qty} already returned | {qty} پہلے واپس ہو چکا | {qty} قبلاً برگردانده شده |
| `sup.preturn.button` | Return goods | سامان واپس کریں | برگرداندن كالا |
| `sup.preturn.errMax` | Only {qty} of {name} can still be returned. | {name} کی صرف {qty} مقدار مزید واپس ہو سکتی ہے۔ | فقط {qty} از {name} هنوز برگردانده می‌شود. |
| `sup.preturn.failed` | The purchase return could not be posted. | خرید واپسی درج نہیں ہو سکی۔ | برگشت خرید ثبت نشد. |
| `sup.preturn.historyTitle` | Purchase returns | خرید واپسیاں | برگشت‌های خرید |
| `sup.preturn.method` | Refund method | رقم واپسی کا طریقہ | طریقه بازپرداخت |
| `sup.preturn.none` | Enter a return quantity for at least one item. | کم از کم ایک شے کی واپسی مقدار لکھیں۔ | برای حداقل یك قلم مقدار برگشت وارد كنید. |
| `sup.preturn.noReturns` | No purchase returns yet. | ابھی کوئی خرید واپسی نہیں۔ | هنوز برگشت خریدی نیست. |
| `sup.preturn.offset` | Reduce what we owe (payable) | ہمارا واجب الادا کم کریں | قابل پرداخت ما را كاهش دهید |
| `sup.preturn.purchasedLine` | Purchased {qty} · at {cost} | خریدا گیا {qty} · {cost} پر | خریداری شده {qty} · به {cost} |
| `sup.preturn.qty` | Return qty | واپسی مقدار | مقدار برگشت |
| `sup.preturn.reason` | Reason | وجہ | دلیل |
| `sup.preturn.reasonPh` | Damaged, wrong item, expired… | خراب، غلط شے، زائد المیعاد… | آسیب‌دیده، كالای اشتباه، تاریخ‌گذشته… |
| `sup.preturn.refund` | Supplier refunds money now | سپلائر ابھی رقم واپس کرے | تأمین‌كننده حالا پول را پس می‌دهد |
| `sup.preturn.settlement` | Settlement | تصفیہ | تسویه |
| `sup.preturn.sub` | Against the purchase of {date} · {amount} | خریداری بتاریخ {date} · {amount} کے خلاف | در برابر خرید {date} · {amount} |
| `sup.preturn.submit` | Post return & debit note | واپسی درج کر کے ڈیبٹ نوٹ جاری کریں | ثبت برگشت و صدور یادداشت دبت |
| `sup.preturn.success` | Debit note {number} issued — the goods are returned. | ڈیبٹ نوٹ {number} جاری ہو گیا — سامان واپس ہو گیا۔ | یادداشت دبت {number} صادر شد — كالا برگردانده شد. |
| `sup.preturn.title` | Return goods to supplier | سپلائر کو سامان واپسی | برگرداندن كالا به تأمین‌كننده |
## ai

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `ai.chatLabel` | Conversation with Dukaan AI | دکان اے آئی سے گفتگو | گفتگو با Dukaan AI |
| `ai.error` | Sorry, something went wrong while answering. Please try again. | معذرت، جواب دیتے ہوئے مسئلہ ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔ | معذرت می‌خواهم، هنگام پاسخ دادن مشکل پیش آمد. لطفاً دوباره تلاش کنید. |
| `ai.eyebrow` | Urdu · English | اردو · انگریزی | اردو · English |
| `ai.inputLabel` | Ask the AI assistant | اے آئی معاون سے پوچھیں | از دستیار AI بپرسید |
| `ai.loading` | Waking up the assistant… | معاون جاگ رہا ہے… | دستیار بیدار می‌شود… |
| `ai.note` | Answers are grounded in your shop data. On the live deployment a Gemini-powered assistant (via /api/chat) answers first; the on-device intent engine covers everything else — no key, no network, no problem. | جوابات آپ کی دکان کے ڈیٹا پر مبنی ہوتے ہیں۔ لائیو تعیناتی پر Gemini سے چلنے والا معاون (/api/chat کے ذریعے) پہلے جواب دیتا ہے؛ باقی سب کچھ ڈیوائس پر موجود انٹینٹ انجن سنبھالتا ہے — نہ کلید درکار، نہ نیٹ ورک، کوئی مسئلہ نہیں۔ | پاسخ‌ها بر اساس معلومات دکان شما است. در نشر زنده، دستیار مبتنی بر Gemini (از طریق /api/chat) اول پاسخ می‌دهد؛ انجن داخل دستگاه بقیه همه چیز را اداره می‌کند — نه کلید لازم است، نه شبکه، هیچ مشکلی نیست. |
| `ai.placeholder` | Ask anything about your shop… | اپنی دکان کے بارے میں کچھ بھی پوچھیں… | درباره دکان خود هر چیزی بپرسید… |
| `ai.send` | Send | بھجیں | بفرستید |
| `ai.sendLabel` | Send message | پیغام بھیجیں | پیام بفرستید |
| `ai.subtitle` | Ask in Urdu or English — every answer is computed live from your shop's data. Try the starters below. | اردو یا انگریزی میں پوچھیں — ہر جواب آپ کی دکان کے ڈیٹا سے براہِ راست شمار ہوتا ہے۔ نیچے دیے گئے سوالات آزمائیں۔ | به اردو یا انگلیسی بپرسید — هر پاسخ زنده از معلومات دکان شما محاسبه می‌شود. آغازگرهای زیر را امتحان کنید. |
| `ai.title` | AI Assistant | اے آئی معاون | دستیار AI |
| `ai.typing` | Assistant is typing | معاون لکھ رہا ہے | دستیار می‌نویسد |
## platform

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `biz.activeBusiness` | Active business | فعال کاروبار | کسب‌وکار فعال |
| `biz.addressLabel` | Address | پتہ | نشانی |
| `biz.businessFallback` | Business | کاروبار | کسب‌وکار |
| `biz.createBody` | A new, empty business on the Free Trial plan. Your current business is untouched. | مفت ٹرائل پلان پر ایک نیا، خالی کاروبار۔ آپ کا موجودہ کاروبار اچھوتا رہے گا۔ | کسب‌وکاری جدید و خالی در طرح آزمایشی رایگان. کسب‌وکار کنونی شما دست‌نخورده می‌ماند. |
| `biz.createButton` | Create business | کاروبار بنائیں | ایجاد کسب‌وکار |
| `biz.created` | Business created — switched to {name}. | کاروبار بن گیا — {name} پر منتقل ہو گئے۔ | کسب‌وکار ساخته شد — به {name} منتقل شدید. |
| `biz.createFailed` | Could not create the business. Please try again. | کاروبار نہیں بن سکا۔ دوبارہ کوشش کریں۔ | کسب‌وکار ساخته نشد. دوباره تلاش کنید. |
| `biz.createTitle` | Create a new business | نیا کاروبار بنائیں | ایجاد کسب‌وکار جدید |
| `biz.memberJoined` | Joined | شامل | پیوسته |
| `biz.memberLegacy` | Legacy access | پرانے نظام سے رسائی | دسترسی قدیمی |
| `biz.memberPending` | Invite pending | دعوت زیرِ التوا | دعوت در انتظار |
| `biz.nameLabel` | Business name | کاروبار کا نام | نام کسب‌وکار |
| `biz.namePlaceholder` | e.g. Second Shop | مثلاً دوسری دکان | مثلاً فروشگاه دوم |
| `biz.newBusiness` | New business | نیا کاروبار | کسب‌وکار جدید |
| `biz.noAccessBody` | This account does not belong to any business right now. If you were removed from a shop, its owner can invite you again. | یہ اکاؤنٹ اس وقت کسی کاروبار کا حصہ نہیں ہے۔ اگر آپ کو کسی دکان سے ہٹا دیا گیا تھا تو اس کا مالک آپ کو دوبارہ دعوت دے سکتا ہے۔ | این حساب فعلاً به هیچ کسب‌وکاری تعلق ندارد. اگر از یک دکان حذف شده بودید، مالک آن دوباره شما را دعوت کرده می‌تواند. |
| `biz.noAccessTitle` | No business access | کسی کاروبار تک رسائی نہیں | دسترسی به کسب‌وکار نیست |
| `biz.phoneLabel` | Phone | فون | تلفن |
| `biz.retrySetup` | Retry setup | تیاری دوبارہ کریں | تلاش دوباره راه‌اندازی |
| `biz.setupIncomplete` | This business is still being set up. | اس کاروبار کی تیاری ابھی جاری ہے۔ | راه‌اندازی این کسب‌وکار هنوز ادامه دارد. |
| `biz.switchBusiness` | Switch business | کاروبار بدلیں | کسب‌وکار را تغییر دهید |
| `biz.yourBusiness` | Your business | آپ کا کاروبار | کسب‌وکار شما |
| `plan.graceBanner` | Your plan ended {days} days ago. You can view, print and export everything, but new entries are paused until renewal. | آپ کا پلان {days} دن پہلے ختم ہوا۔ آپ سب کچھ دیکھ، پرنٹ اور ایکسپورٹ کر سکتے ہیں، لیکن تجدید تک نئی انٹریاں رکی ہوئی ہیں۔ | پلان شما {days} روز پیش تمام شد. شما همه چیز را دیده، چاپ و صادر کرده می‌توانید، اما ثبت‌های جدید تا تمدید متوقف‌اند. |
| `plan.includedIn` | Included in {tier} and above | {tier} اور اوپر شامل | در {tier} و بالاتر شامل است |
| `plan.limitInvoices` | Invoice limit reached for this period ({limit}). Posting resumes next period or after an upgrade. | اس مدت کی رسیدوں کی حد ({limit}) پوری ہو گئی۔ اگلی مدت یا اپ گریڈ کے بعد اندراج جاری ہوگا۔ | حد بل برای این دوره رسیده است ({limit}). ثبت کردن در دوره بعدی یا بعد از ارتقا از سر گرفته می‌شود. |
| `plan.limitMembers` | Your plan allows {limit} users. Remove a member or upgrade to add more. | آپ کے پلان میں {limit} صارفین کی گنجائش ہے۔ مزید شامل کرنے کے لیے ممبر ہٹائیں یا اپ گریڈ کریں۔ | پلان شما به {limit} کاربر اجازه می‌دهد. یک عضو را حذف کنید یا برای اضافه کردن بیشتر ارتقا دهید. |
| `plan.lockedBody` | This feature is part of the {tier} plan and above. Your current plan is {plan}. | یہ سہولت {tier} پلان اور اس سے اوپر شامل ہے۔ آپ کا موجودہ پلان {plan} ہے۔ | این ویژگی بخشی از پلان {tier} و بالاتر است. پلان فعلی شما {plan} است. |
| `plan.lockedTitle` | Not included in your plan | آپ کے پلان میں شامل نہیں | در پلان شما شامل نیست |
| `plan.name.advanced` | Advanced | ایڈوانسڈ | پیشرفته |
| `plan.name.basic` | Basic | بنیادی | اساسی |
| `plan.name.enterprise` | Enterprise | انٹرپرائز | Enterprise |
| `plan.name.founding` | Founding | بانی | بنیان‌گذار |
| `plan.name.standard` | Standard | معیاری | معیاری |
| `plan.name.trial` | Free Trial | مفت ٹرائل | آزمایشی رایگان |
| `plan.panel.actual` | Actual | اصل | واقعی |
| `plan.panel.counter` | Counter | کاؤنٹر | شمارنده |
| `plan.panel.enforceOff` | Enforcement is off — usage is being observed only | نفاذ بند ہے — استعمال صرف مشاہدے میں ہے | اجرا خاموش است — استفاده فقط مشاهده می‌شود |
| `plan.panel.enforceOn` | Enforcement is ON for this shop | اس دکان پر نفاذ فعال ہے | اجرا برای این دکان فعال است |
| `plan.panel.invoices` | Invoices | رسیدیں | بل‌ها |
| `plan.panel.members` | Members | ممبر | اعضا |
| `plan.panel.modules` | Modules tier | ماڈیولز درجہ | درجه ماژول‌ها |
| `plan.panel.period` | Period | مدت | دوره |
| `plan.panel.plan` | Plan | پلان | پلان |
| `plan.panel.state` | Status | حالت | وضعیت |
| `plan.panel.title` | Plan & usage | پلان اور استعمال | پلان و استفاده |
| `plan.panel.trialEnds` | Trial ends | ٹرائل ختم | آزمایشی تمام می‌شود |
| `plan.postingPaused` | Posting is paused while the shop is {state}. You can still view, print and export. | دکان کی حالت {state} ہے، اس لیے اندراج رکا ہوا ہے۔ آپ دیکھ، پرنٹ اور ایکسپورٹ پھر بھی کر سکتے ہیں۔ | ثبت کردن متوقف است در حالی که دکان {state} است. شما هنوز دیده، چاپ و صادر کرده می‌توانید. |
| `plan.readonlyBanner` | This shop is read-only: the plan's grace period has ended. Your data stays safe and fully viewable. | یہ دکان صرف مطالعے کے لیے ہے: پلان کی رعایتی مدت ختم ہو چکی ہے۔ آپ کا ڈیٹا محفوظ اور مکمل قابلِ مطالعہ ہے۔ | این دکان فقط خواندنی است: دوره مهلت پلان تمام شده است. معلومات شما امن و کاملاً قابل دیدن می‌ماند. |
| `plan.state.active` | Active | فعال | فعال |
| `plan.state.founding` | Founding | بانی | بنیان‌گذار |
| `plan.state.grace` | Grace period | رعایتی مدت | دوره مهلت |
| `plan.state.readonly` | Read-only | صرف مطالعہ | فقط خواندنی |
| `plan.state.suspended` | Suspended | معطل | معلق |
| `plan.state.trial` | Trial | ٹرائل | آزمایشی |
| `plan.suspendedBanner` | This shop has been suspended by the platform. You can still view all your data. | پلیٹ فارم نے یہ دکان معطل کر دی ہے۔ آپ اپنا تمام ڈیٹا پھر بھی دیکھ سکتے ہیں۔ | این دکان توسط پلتفارم معلق شده است. شما هنوز همه معلومات خود را دیده می‌توانید. |
| `plan.thisMonth` | Invoices this month | اس ماہ کی رسیدیں | بل‌های این ماه |
| `plan.trialBanner` | Free trial — {days} days left, {left} invoices remaining of {limit} | مفت ٹرائل — {days} دن باقی، {limit} میں سے {left} رسیدیں باقی | آزمایشی رایگان — {days} روز باقی، {left} بل از {limit} باقی |
| `plan.trialPool` | {used} of {limit} trial invoices used | {limit} میں سے {used} ٹرائل رسیدیں استعمال ہوئیں | {used} از {limit} بل آزمایشی استفاده شد |
| `platform.act.activate` | Reactivate | دوبارہ فعال کریں | دوباره فعال کنید |
| `platform.act.assign` | Assign plan | پلان تفویض کریں | پلان تخصیص دهید |
| `platform.act.assignTitle` | Assign plan | پلان تفویض کریں | پلان تخصیص دهید |
| `platform.act.compTrial` | Complimentary trial (comp) — logged as a comp act | اعزازی ٹرائل (رعایت) — بطور رعایتی عمل درج ہوگا | آزمایشی رایگان (comp) — به حیث یک عمل comp ثبت می‌شود |
| `platform.act.confirmDisagree` | I checked the figures — flip anyway | میں نے اعداد جانچ لیے ہیں — پھر بھی نافذ کریں | ارقام را بررسی کردم — باز هم تغییر دهید |
| `platform.act.counterVs` | Counter vs platform figures | کاؤنٹر بمقابلہ پلیٹ فارم اعداد | شمارنده در برابر ارقام پلتفارم |
| `platform.act.disagree` | The counter and the platform figures disagree. Check before enforcing — enforcing a disagreeing counter as-is can refuse a healthy shop's postings. | کاؤنٹر اور پلیٹ فارم کے اعداد میں فرق ہے۔ نفاذ سے پہلے جانچ لیں — مختلف کاؤنٹر کو یونہی نافذ کرنا صحت مند دکان کے اندراج روک سکتا ہے۔ | شمارنده و ارقام پلتفارم موافق نیستند. قبل از اجرا بررسی کنید — اجرای یک شمارنده ناموافق به همان شکل می‌تواند ثبت‌های یک دکان سالم را رد کند. |
| `platform.act.done` | Done — the act and its event were recorded. | ہو گیا — عمل اور اس کا واقعہ درج ہو گیا۔ | انجام شد — عمل و رویداد آن ثبت شد. |
| `platform.act.enforceOff` | Turn enforcement OFF | نفاذ بند کریں | اجرا را خاموش کنید |
| `platform.act.enforceOn` | Turn enforcement ON | نفاذ فعال کریں | اجرا را فعال کنید |
| `platform.act.enforceTitle` | Enforcement | نفاذ | اجرا |
| `platform.act.extend` | Extend | بڑھائیں | تمدید کنید |
| `platform.act.extendTitle` | Extend period | مدت بڑھائیں | دوره را تمدید کنید |
| `platform.act.failed` | The act failed. Nothing was written. | عمل ناکام رہا۔ کچھ درج نہیں ہوا۔ | عمل ناموفق بود. چیزی نوشته نشد. |
| `platform.act.invoicesLimit` | Invoices limit (blank = plan default) | رسیدوں کی حد (خالی = پلان کی طے شدہ) | حد بل‌ها (خالی = پیش‌فرض پلان) |
| `platform.act.newEnd` | New end date | نئی آخری تاریخ | تاریخ پایان جدید |
| `platform.act.periodEnd` | Period ends | مدت ختم | دوره تمام می‌شود |
| `platform.act.reason` | Reason (recorded in the event log) | وجہ (واقعات کے ریکارڈ میں درج ہوگی) | دلیل (در لاگ رویدادها ثبت می‌شود) |
| `platform.act.suspend` | Suspend | معطل کریں | معلق کنید |
| `platform.act.suspendTitle` | Suspend business | کاروبار معطل کریں | کسب‌وکار را معلق کنید |
| `platform.act.usersLimit` | Users limit (blank = plan default) | صارفین کی حد (خالی = پلان کی طے شدہ) | حد کاربران (خالی = پیش‌فرض پلان) |
| `platform.admins.added` | Added | شمولیت | اضافه شده |
| `platform.admins.addedBy` | Added by | شامل کنندہ | اضافه شده توسط |
| `platform.admins.email` | Email | ای میل | ایمیل |
| `platform.admins.grant` | Grant admin | منتظم بنائیں | مدیر اعطا کنید |
| `platform.admins.lastNote` | The last admin cannot be revoked. | آخری منتظم کو نہیں ہٹایا جا سکتا۔ | آخرین مدیر لغو شده نمی‌تواند. |
| `platform.admins.revoke` | Revoke | ہٹائیں | لغو کنید |
| `platform.admins.selfNote` | You cannot revoke yourself. | آپ خود کو نہیں ہٹا سکتے۔ | شما خود را لغو کرده نمی‌توانید. |
| `platform.admins.title` | Platform admins | پلیٹ فارم منتظمین | مدیران پلتفارم |
| `platform.admins.uid` | User ID (from Firebase Authentication) | صارف شناخت (Firebase Authentication سے) | شناسه کاربر (از Firebase Authentication) |
| `platform.admins.you` | You | آپ | شما |
| `platform.agg.enforced` | Enforcement on | نفاذ فعال | اجرا فعال |
| `platform.agg.invoicesMonth` | Invoices this month (from counters) | اس ماہ کی رسیدیں (کاؤنٹرز سے) | بل‌های این ماه (از شمارنده‌ها) |
| `platform.agg.pending` | Payments awaiting confirmation | تصدیق کی منتظر ادائیگیاں | پرداخت‌های در انتظار تأیید |
| `platform.agg.revenue` | Confirmed revenue | تصدیق شدہ آمدنی | درآمد تأییدشده |
| `platform.agg.suspended` | Suspended | معطل | معلق |
| `platform.agg.total` | Businesses | کاروبار | کسب‌وکارها |
| `platform.agg.trialPool` | Trial invoices used (pool) | استعمال شدہ ٹرائل رسیدیں (مجموعی) | بل‌های آزمایشی استفاده‌شده (مجموع) |
| `platform.back` | Back to directory | فہرست کی طرف واپس | بازگشت به فهرست |
| `platform.badge` | Platform | پلیٹ فارم | پلتفارم |
| `platform.cfg.accountTitle` | Account title | اکاؤنٹ عنوان | عنوان حساب |
| `platform.cfg.bank` | Bank name | بینک کا نام | نام بانک |
| `platform.cfg.iban` | IBAN | IBAN | IBAN |
| `platform.cfg.instructions` | Instructions (shown verbatim) | ہدایات (بعیینہٖ دکھائی جائیں گی) | دستورالعمل‌ها (عیناً نشان داده می‌شوند) |
| `platform.cfg.intro` | What shopkeepers see on the renewal surface: where to send plan payments, and how to reach support. Display text only — there is no gateway behind it. | تجدید کی سطح پر دکان دار یہ دیکھتے ہیں: پلان کی ادائیگی کہاں بھیجنی ہے، اور معاونت کے لیے کس سے رابطہ کرنا ہے۔ یہ صرف معلوماتی متن ہے — اس کے پیچھے کوئی گیٹ وے نہیں۔ | آنچه دکانداران روی صفحه تمدید می‌بینند: پرداخت‌های پلان را کجا بفرستند، و چگونه به پشتیبانی برسند. فقط متن نمایشی است — هیچ دروازه‌ای پشت آن نیست. |
| `platform.cfg.raast` | Raast number | راست نمبر | شماره Raast |
| `platform.cfg.save` | Save instructions | ہدایات محفوظ کریں | دستورالعمل‌ها را ذخیره کنید |
| `platform.cfg.support` | Support contact | معاونت رابطہ | تماس پشتیبانی |
| `platform.cfg.title` | Payment instructions | ادائیگی ہدایات | دستورالعمل‌های پرداخت |
| `platform.cfg.updated` | Last updated {date} by {by} | آخری تبدیلی {date}، بذریعہ {by} | آخرین به‌روزرسانی {date} توسط {by} |
| `platform.col.business` | Business | کاروبار | کسب‌وکار |
| `platform.col.enforce` | Enforce | نفاذ | اجرا |
| `platform.col.invoices` | Invoices | رسیدیں | بل‌ها |
| `platform.col.lastActive` | Last active | آخری سرگرمی | آخرین فعالیت |
| `platform.col.members` | Members | ممبر | اعضا |
| `platform.col.owner` | Owner | مالک | مالک |
| `platform.demoBody` | The platform console runs on the live platform only — demo mode has no businesses to administer. | پلیٹ فارم کنسول صرف اصل پلیٹ فارم پر چلتا ہے — ڈیمو حالت میں انتظام کے لیے کوئی کاروبار نہیں ہوتا۔ | کنسول پلتفارم فقط روی پلتفارم زنده کار می‌کند — حالت دیمو کسب‌وکاری برای اداره ندارد. |
| `platform.deniedBody` | This section belongs to the platform team. It opens only with a platform admin grant — shop accounts, including shop owners, do not open it. | یہ حصہ پلیٹ فارم ٹیم کے لیے ہے۔ یہ صرف پلیٹ فارم منتظم کی اجازت سے کھلتا ہے — دکان کے اکاؤنٹ، بشمول دکان کے مالک، اسے نہیں کھولتے۔ | این بخش متعلق به تیم پلتفارم است. فقط با اجازه مدیر پلتفارم باز می‌شود — حساب‌های دکان، بشمول مالکان دکان، آن را باز نمی‌کنند. |
| `platform.deniedTitle` | Not a platform admin | پلیٹ فارم منتظم نہیں | مدیر پلتفارم نیست |
| `platform.detail.assignedBy` | Assigned by | تفویض کنندہ | تخصیص داده شده توسط |
| `platform.detail.businessId` | Business ID (owner account) | کاروبار شناخت (مالک اکاؤنٹ) | شناسه کسب‌وکار (حساب مالک) |
| `platform.detail.city` | City | شہر | شهر |
| `platform.detail.counters` | Counters (rules-verified) | کاؤنٹرز (اصولوں سے تصدیق شدہ) | شمارنده‌ها (بررسی‌شده با قواعد) |
| `platform.detail.created` | Created | قیام | ساخته شده |
| `platform.detail.events` | Event timeline | واقعات کی تفصیل | خط زمانی رویدادها |
| `platform.detail.history` | Plan history | پلان کی تاریخ | تاریخچه پلان |
| `platform.detail.membersJoined` | Members joined (membership records) | شامل ممبر (رکنیت ریکارڈ سے) | اعضای پیوسته (ریکاردهای عضویت) |
| `platform.detail.payments` | Payments | ادائیگیاں | پرداخت‌ها |
| `platform.detail.registry` | Registry | رجسٹری | رجیستری |
| `platform.detail.snapshot` | Current assignment | موجودہ تفویض | تخصیص فعلی |
| `platform.detail.telemetry` | Telemetry | سرگرمی اعداد | تله‌متری |
| `platform.empty` | No businesses match. | کوئی کاروبار مطابق نہیں ملا۔ | هیچ کسب‌وکاری مطابقت ندارد. |
| `platform.events.empty` | No platform events yet. | ابھی کوئی پلیٹ فارم واقعہ نہیں۔ | هنوز هیچ رویداد پلتفارمی نیست. |
| `platform.filter.allEnforce` | Enforcement: all | نفاذ: تمام | اجرا: همه |
| `platform.filter.allPlans` | All plans | تمام پلان | همه پلان‌ها |
| `platform.filter.allStates` | All states | تمام حالتیں | همه وضعیت‌ها |
| `platform.filter.allStatuses` | All statuses | تمام درجے | همه وضعیت‌ها |
| `platform.filter.enforceOff` | Enforcement off | نفاذ بند | اجرا خاموش |
| `platform.filter.enforceOn` | Enforcement on | نفاذ فعال | اجرا فعال |
| `platform.history.empty` | No plan changes recorded. | پلان کی کوئی تبدیلی درج نہیں۔ | هیچ تغییر پلانی ثبت نشده است. |
| `platform.never` | Never | کبھی نہیں | هرگز |
| `platform.pay.confirm` | Confirm | تصدیق کریں | تأیید کنید |
| `platform.pay.confirmed` | Confirmed | تصدیق شدہ | تأیید شده |
| `platform.pay.empty` | The confirmation queue is empty. | تصدیق کی قطار خالی ہے۔ | صف تأیید خالی است. |
| `platform.pay.method` | Method | طریقہ | روش |
| `platform.pay.mismatch` | Differs from the catalogue price | کیٹلاگ قیمت سے مختلف | با قیمت کاتالوگ متفاوت است |
| `platform.pay.note` | Rejection note (the owner sees this) | مسترد کرنے کی یادداشت (مالک اسے دیکھے گا) | یادداشت رد (مالک این را می‌بیند) |
| `platform.pay.period` | Period bought | خریدی گئی مدت | دوره خریداری‌شده |
| `platform.pay.raast` | Raast | راست | Raast |
| `platform.pay.reference` | Reference | حوالہ | مرجع |
| `platform.pay.reject` | Reject | مسترد کریں | رد کنید |
| `platform.pay.submitted` | Submitted | جمع شدہ | ثبت شده |
| `platform.payments.empty` | No payments recorded. | کوئی ادائیگی درج نہیں۔ | هیچ پرداختی ثبت نشده است. |
| `platform.searchPlaceholder` | Search name, email, phone, city… | نام، ای میل، فون، شہر تلاش کریں… | نام، ایمیل، تلیفون، شهر را جستجو کنید… |
| `platform.signInPrompt` | Sign in with an admin account to continue. | جاری رکھنے کے لیے منتظم اکاؤنٹ سے سائن ان کریں۔ | با یک حساب مدیر وارد شوید تا ادامه دهید. |
| `platform.softLabel` | Reported by the shop's app (soft) | دکان کی ایپ کی اطلاع (غیر حتمی) | گزارش‌شده توسط اپلیکیشن دکان (نرم) |
| `platform.tab.admins` | Admins | منتظمین | مدیران |
| `platform.tab.businesses` | Businesses | کاروبار | کسب‌وکارها |
| `platform.tab.config` | Payment instructions | ادائیگی ہدایات | دستورالعمل‌های پرداخت |
| `platform.tab.payments` | Payment queue | ادائیگیوں کی قطار | صف پرداخت |
| `platform.title` | Platform console | پلیٹ فارم کنسول | کنسول پلتفارم |
| `renew.accountTitle` | Account title | اکاؤنٹ عنوان | عنوان حساب |
| `renew.amount` | Amount to pay | قابلِ ادائیگی رقم | مبلغ قابل پرداخت |
| `renew.bank` | Bank | بینک | بانک |
| `renew.banner.graceLeft` | {days} days of grace left before the shop becomes read-only. | دکان کے صرف مطالعہ ہونے سے پہلے رعایتی مدت کے {days} دن باقی ہیں۔ | {days} روز مهلت باقی است قبل از اینکه دکان فقط خواندنی شود. |
| `renew.banner.suspendedReason` | Reason: {reason} | وجہ: {reason} | دلیل: {reason} |
| `renew.banner.suspendedRemedy` | To restore posting, submit the plan payment from Settings or contact the platform. | اندراج بحال کرنے کے لیے ترتیبات سے پلان کی ادائیگی جمع کرائیں یا پلیٹ فارم سے رابطہ کریں۔ | برای بازگرداندن ثبت کردن، پرداخت پلان را از تنظیمات ثبت کنید یا با پلتفارم تماس بگیرید. |
| `renew.banner.trialApproaching` | Your free trial ends in {days} days — renew now so posting continues without a pause. | آپ کا مفت ٹرائل {days} دن میں ختم ہو رہا ہے — ابھی تجدید کریں تاکہ اندراج بغیر رکاوٹ جاری رہے۔ | آزمایشی رایگان شما در {days} روز تمام می‌شود — حالا تمدید کنید تا ثبت کردن بدون توقف ادامه یابد. |
| `renew.banner.trialUrgent` | Your free trial ends in {days} day(s) — renew today to keep posting. | آپ کا مفت ٹرائل {days} دن میں ختم ہو رہا ہے — اندراج جاری رکھنے کے لیے آج ہی تجدید کریں۔ | آزمایشی رایگان شما در {days} روز تمام می‌شود — امروز تمدید کنید تا ثبت کردن ادامه یابد. |
| `renew.billing.annual` | Annual — 12 months for the price of 10 | سالانہ — 10 کی قیمت میں 12 ماہ | سالانه — 12 ماه به قیمت 10 |
| `renew.billing.monthly` | Monthly | ماہانہ | ماهانه |
| `renew.billingLabel` | Billing period | ادائیگی کی مدت | دوره صورتحساب |
| `renew.cta` | Renew now | ابھی تجدید کریں | حالا تمدید کنید |
| `renew.enterpriseNote` | Enterprise terms are arranged directly with the platform — this plan's renewals are handled by the platform team. | انٹرپرائز شرائط براہِ راست پلیٹ فارم سے طے ہوتی ہیں — اس پلان کی تجدید پلیٹ فارم ٹیم کے ذریعے ہوتی ہے۔ | شرایط Enterprise مستقیماً با پلتفارم تنظیم می‌شود — تمدیدهای این پلان توسط تیم پلتفارم انجام می‌شود. |
| `renew.error.quoteChanged` | The amount or period changed — review the figures, then submit again. | رقم یا مدت بدل گئی ہے — اعداد دیکھ کر دوبارہ جمع کرائیں۔ | مبلغ یا دوره تغییر کرد — ارقام را ببینید، بعد دوباره ثبت کنید. |
| `renew.error.referenceRequired` | Enter the transaction reference first — the platform checks it against the transfer. | پہلے ٹرانزیکشن حوالہ درج کریں — پلیٹ فارم اسی سے منتقلی کی جانچ کرتا ہے۔ | اول مرجع تراکنش را وارد کنید — پلتفارم آن را در برابر انتقال بررسی می‌کند. |
| `renew.historyTitle` | Your payment records | آپ کے ادائیگی ریکارڈ | ریکاردهای پرداخت شما |
| `renew.iban` | IBAN | IBAN | IBAN |
| `renew.instructionsNone` | Payment instructions have not been published yet — please contact the platform before paying. | ادائیگی کی ہدایات ابھی شائع نہیں ہوئیں — ادائیگی سے پہلے پلیٹ فارم سے رابطہ کریں۔ | دستورالعمل‌های پرداخت هنوز نشر نشده‌اند — لطفاً قبل از پرداخت با پلتفارم تماس بگیرید. |
| `renew.instructionsTitle` | How to pay | ادائیگی کا طریقہ | چگونه پرداخت کنید |
| `renew.intro` | Pay the platform by transfer, then submit the record here. Your new period starts when the platform confirms the payment — from the later of your current period's end and the confirmation. | منتقلی کے ذریعے پلیٹ فارم کو ادائیگی کریں، پھر ریکارڈ یہاں جمع کرائیں۔ آپ کی نئی مدت پلیٹ فارم کی تصدیق پر شروع ہوتی ہے — موجودہ مدت کے اختتام اور تصدیق میں سے جو بعد میں ہو۔ | از طریق انتقال به پلتفارم پرداخت کنید، بعد ریکارد را اینجا ثبت کنید. دوره جدید شما وقتی شروع می‌شود که پلتفارم پرداخت را تأیید کند — از دیرترِ پایان دوره فعلی شما و تأیید. |
| `renew.methodLabel` | I paid via | میں نے ادائیگی کی بذریعہ | من از طریق پرداخت کردم |
| `renew.noteLabel` | Note (optional) | یادداشت (اختیاری) | یادداشت (اختیاری) |
| `renew.pay.confirmedPeriod` | Confirmed — your plan now runs to {date}. | تصدیق شدہ — آپ کا پلان اب {date} تک چلے گا۔ | تأیید شد — پلان شما حالا تا {date} ادامه دارد. |
| `renew.pay.pending` | Awaiting platform confirmation | پلیٹ فارم کی تصدیق کی منتظر | در انتظار تأیید پلتفارم |
| `renew.pay.rejectedHint` | You can pay again and submit a new record. | آپ دوبارہ ادائیگی کر کے نیا ریکارڈ جمع کرا سکتے ہیں۔ | شما دوباره پرداخت کرده و یک ریکارد جدید ثبت کرده می‌توانید. |
| `renew.periodPreview` | Period this buys: {from} → {to} | اس سے ملنے والی مدت: {from} ← {to} | دوره‌ای که این می‌خرد: {from} → {to} |
| `renew.planLabel` | Plan | پلان | پلان |
| `renew.raastNumber` | Raast number | راست نمبر | شماره Raast |
| `renew.referenceHint` | Shown in your banking app or on the slip | آپ کی بینک ایپ یا سلپ پر درج ہوتا ہے | در اپلیکیشن بانکی شما یا روی رسید نشان داده می‌شود |
| `renew.referenceLabel` | Transaction ID / reference | ٹرانزیکشن شناخت / حوالہ | شناسه تراکنش / مرجع |
| `renew.submit` | Submit payment record | ادائیگی کا ریکارڈ جمع کرائیں | ریکارد پرداخت را ثبت کنید |
| `renew.submit.done` | Submitted. The platform confirms after checking the transfer; your period extends at confirmation. | جمع ہو گیا۔ پلیٹ فارم منتقلی کی جانچ کے بعد تصدیق کرتا ہے؛ تصدیق پر آپ کی مدت بڑھ جائے گی۔ | ثبت شد. پلتفارم بعد از بررسی انتقال تأیید می‌کند؛ دوره شما هنگام تأیید تمدید می‌شود. |
| `renew.submit.failed` | The submission failed — nothing was recorded. Please try again. | جمع کرانا ناکام رہا — کچھ درج نہیں ہوا۔ دوبارہ کوشش کریں۔ | ثبت ناموفق بود — چیزی ثبت نشد. لطفاً دوباره کوشش کنید. |
| `renew.supportLabel` | Support | معاونت | پشتیبانی |
| `renew.title` | Renew or upgrade | تجدید یا اپ گریڈ | تمدید یا ارتقا |
## demo

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `demo.addBody` | Your business is empty. The demo set below will be added so you can explore every screen with realistic data. It never mixes with real books: once you trade for real, demo data can no longer be added. | آپ کا کاروبار خالی ہے۔ نیچے دیا گیا ڈیمو سیٹ شامل ہو جائے گا تاکہ آپ ہر اسکرین حقیقی جیسے ڈیٹا کے ساتھ دیکھ سکیں۔ یہ کبھی اصل کھاتوں میں نہیں ملے گا: ایک بار اصل لین دین شروع ہو جائے تو ڈیمو ڈیٹا شامل نہیں ہو سکے گا۔ | کسب‌وکار شما خالی است. مجموعه نمایشی زیر اضافه می‌شود تا بتوانید هر صفحه را با داده‌های واقع‌نما ببینید. این داده هرگز با دفاتر واقعی مخلوط نمی‌شود: وقتی معامله واقعی را شروع کنید، دیگر نمی‌توان داده نمایشی اضافه کرد. |
| `demo.addButton` | Add demo data | ڈیمو ڈیٹا شامل کریں | افزودن داده نمایشی |
| `demo.addedBody` | Added: {products} products, {customers} customers, {suppliers} suppliers, {sales} sales rows, {journal} journal entries. | شامل ہوا: {products} مصنوعات، {customers} گاہک، {suppliers} سپلائر، {sales} فروخت کی قطاریں، {journal} جرنل اندراجات۔ | اضافه شد: {products} کالا، {customers} مشتری، {suppliers} تأمین‌کننده، {sales} ردیف فروش، {journal} ثبت ژورنال. |
| `demo.addedTitle` | Demo data added | ڈیمو ڈیٹا شامل ہو گیا | داده نمایشی اضافه شد |
| `demo.addFailed` | Could not add demo data. Please try again. | ڈیمو ڈیٹا شامل نہیں ہو سکا۔ دوبارہ کوشش کریں۔ | داده نمایشی اضافه نشد. دوباره تلاش کنید. |
| `demo.addTitle` | Add demo data? | ڈیمو ڈیٹا شامل کریں؟ | داده نمایشی اضافه شود؟ |
| `demo.confirmAdd` | Add demo data | ڈیمو ڈیٹا شامل کریں | افزودن داده نمایشی |
| `demo.confirmReAdd` | Wipe demo & re-add | ڈیمو صاف کریں اور دوبارہ شامل کریں | پاک‌کردن نمایشی و افزودن دوباره |
| `demo.preListCustomers` | {n} customers | {n} گاہک | {n} مشتری |
| `demo.preListJournal` | {n} journal entries | {n} جرنل اندراجات | {n} ثبت ژورنال |
| `demo.preListProducts` | {n} products | {n} مصنوعات | {n} کالا |
| `demo.preListSales` | {n} sales rows | {n} فروخت کی قطاریں | {n} ردیف فروش |
| `demo.preListStock` | Stock worth {amount} at cost | اسٹاک مالیت {amount} (لاگت پر) | موجودی به ارزش {amount} به بهای تمام‌شده |
| `demo.preListSuppliers` | {n} suppliers | {n} سپلائر | {n} تأمین‌کننده |
| `demo.preListTitle` | This demo set will be added | یہ ڈیمو سیٹ شامل ہو گا | این مجموعه نمایشی اضافه خواهد شد |
| `demo.reAddBody` | This wipes the current demo data and adds a fresh demo set. Your real data is never touched — this action is refused if the business holds any real record. | اس سے موجودہ ڈیمو ڈیٹا صاف ہو کر نیا ڈیمو سیٹ شامل ہو جائے گا۔ آپ کا اصل ڈیٹا کبھی نہیں چھوا جائے گا — اگر کاروبار میں کوئی اصل ریکارڈ ہو تو یہ عمل انکار کر دیا جائے گا۔ | این کار داده نمایشی کنونی را پاک می‌کند و مجموعه نمایشی تازه‌ای اضافه می‌کند. داده واقعی شما هرگز لمس نمی‌شود — اگر کسب‌وکار رکورد واقعی داشته باشد، این عمل رد می‌شود. |
| `demo.reAddButton` | Re-add demo data | ڈیمو ڈیٹا دوبارہ شامل کریں | افزودن دوباره داده نمایشی |
| `demo.reAddTitle` | Re-add demo data? | ڈیمو ڈیٹا دوبارہ شامل کریں؟ | داده نمایشی دوباره اضافه شود؟ |
| `demo.refusedMixed` | Demo data cannot be re-added: the business holds real records alongside the demo set. Clear the business first if you want to start over. | ڈیمو ڈیٹا دوبارہ شامل نہیں ہو سکتا: کاروبار میں ڈیمو سیٹ کے ساتھ اصل ریکارڈ بھی موجود ہیں۔ نئے سرے سے شروع کرنا ہو تو پہلے کاروبار کا ڈیٹا صاف کریں۔ | داده نمایشی قابل افزودن دوباره نیست: کسب‌وکار در کنار مجموعه نمایشی رکوردهای واقعی هم دارد. اگر می‌خواهید از نو شروع کنید، نخست داده کسب‌وکار را پاک کنید. |
| `demo.refusedReal` | Demo data cannot be added: this business already holds real records. Clear the business first if you want to start over. | ڈیمو ڈیٹا شامل نہیں ہو سکتا: اس کاروبار میں پہلے سے اصل ریکارڈ موجود ہیں۔ نئے سرے سے شروع کرنا ہو تو پہلے کاروبار کا ڈیٹا صاف کریں۔ | داده نمایشی قابل افزودن نیست: این کسب‌وکار از قبل رکوردهای واقعی دارد. اگر می‌خواهید از نو شروع کنید، نخست داده کسب‌وکار را پاک کنید. |
## trash

| Key | English | اردو | Draft |
| --- | --- | --- | --- |
| `trash.clearBody` | Everything in this business — bills, stock, customers, journal, the lot — is snapshotted into trash first, then wiped. The trash snapshot stays restorable for 30 days. Your shop profile, team and plan are NOT cleared. | اس کاروبار کی ہر چیز — بل، اسٹاک، گاہک، جرنل، سب کچھ — پہلے ٹریش میں محفوظ ہو گی، پھر صاف ہو جائے گی۔ ٹریش کا اسنیپ شاٹ 30 دن تک بحال کیا جا سکے گا۔ آپ کی دکان کی پروفائل، ٹیم اور پلان صاف نہیں ہوں گے۔ | همه‌چیز این کسب‌وکار — فاکتورها، موجودی، مشتریان، ژورنال، همه — نخست در زباله‌دان ذخیره می‌شود، سپس پاک می‌شود. تصویر زباله‌دان تا ۳۰ روز قابل بازیابی می‌ماند. نمایه فروشگاه، تیم و طرح شما پاک نمی‌شوند. |
| `trash.clearButton` | Clear all data | تمام ڈیٹا صاف کریں | پاک‌کردن همه داده‌ها |
| `trash.cleared` | Business cleared. The snapshot is in trash until {date}. | کاروبار صاف ہو گیا۔ اسنیپ شاٹ {date} تک ٹریش میں رہے گا۔ | کسب‌وکار پاک شد. تصویر تا {date} در زباله‌دان می‌ماند. |
| `trash.clearedAt` | Cleared {date} | صاف کیا گیا {date} | پاک‌شده {date} |
| `trash.clearFailed` | Could not clear the business. Nothing was wiped. | کاروبار صاف نہیں ہو سکا۔ کچھ بھی صاف نہیں ہوا۔ | کسب‌وکار پاک نشد. چیزی پاک نشد. |
| `trash.clearing` | Clearing… | صاف ہو رہا ہے… | در حال پاک‌کردن… |
| `trash.clearTitle` | Clear all data? | تمام ڈیٹا صاف کریں؟ | همه داده‌ها پاک شود؟ |
| `trash.dangerSub` | These actions change the whole business. They are owner-only and PIN-gated. | یہ اقدامات پورے کاروبار کو بدل دیتے ہیں۔ یہ صرف مالک کے لیے ہیں اور PIN سے محفوظ ہیں۔ | این اقدامات کل کسب‌وکار را تغییر می‌دهند. فقط مالک می‌تواند انجامشان دهد و با PIN محافظت می‌شوند. |
| `trash.dangerTitle` | Danger zone | خطرناک زون | منطقه خطر |
| `trash.deleteButton` | Delete permanently | مستقل حذف کریں | حذف دائمی |
| `trash.deleted` | Trash snapshot deleted permanently. | ٹریش اسنیپ شاٹ مستقل طور پر حذف ہو گیا۔ | تصویر زباله‌دان برای همیشه حذف شد. |
| `trash.docs` | {n} documents · {journal} journal entries | {n} دستاویزات · {journal} جرنل اندراجات | {n} سند · {journal} ثبت ژورنال |
| `trash.empty` | Trash is empty. | ٹریش خالی ہے۔ | زباله‌دان خالی است. |
| `trash.expiredLabel` | Expired | معیاد ختم | منقضی |
| `trash.expires` | Restorable until {date} | بحالی کی آخری تاریخ {date} | قابل بازیابی تا {date} |
| `trash.replaceWarning` | Warning: an active trash snapshot already exists. Clearing again will DELETE it permanently — it cannot be restored afterwards. | خبردار: ٹریش میں پہلے سے ایک فعال اسنیپ شاٹ موجود ہے۔ دوبارہ صاف کرنے سے وہ مستقل طور پر حذف ہو جائے گا — اس کے بعد اسے بحال نہیں کیا جا سکے گا۔ | هشدار: از قبل یک تصویر فعال در زباله‌دان هست. پاک‌کردن دوباره آن را برای همیشه حذف می‌کند — پس از آن قابل بازیابی نیست. |
| `trash.restoreButton` | Restore | بحال کریں | بازیابی |
| `trash.restoredLabel` | Restored | بحال شدہ | بازیابی‌شده |
| `trash.restoreDone` | Restored. The business now holds the trashed books exactly. | بحال ہو گیا۔ کاروبار میں اب بالکل وہی کھاتے ہیں جو ٹریش میں تھے۔ | بازیابی شد. کسب‌وکار اکنون دقیقاً همان دفاتری را دارد که در زباله‌دان بود. |
| `trash.restoreExpired` | This trash snapshot has expired and can no longer be restored. | اس ٹریش اسنیپ شاٹ کی معیاد ختم ہو گئی ہے، اب اسے بحال نہیں کیا جا سکتا۔ | مهلت این تصویر زباله‌دان گذشته و دیگر قابل بازیابی نیست. |
| `trash.restoreRefused` | Restore refused: the business is no longer empty. New data must be cleared first — a restore never merges. | بحالی انکار: کاروبار اب خالی نہیں رہا۔ پہلے نیا ڈیٹا صاف کرنا ہو گا — بحالی کبھی ضم نہیں کرتی۔ | بازیابی رد شد: کسب‌وکار دیگر خالی نیست. نخست باید داده جدید پاک شود — بازیابی هرگز ادغام نمی‌کند. |
| `trash.storefrontNote` | Note: a published storefront is not cleared with the business. Unpublish it from the storefront screen if you no longer want it public. | نوٹ: شائع شدہ اسٹور فرنٹ کاروبار کے ساتھ صاف نہیں ہوتا۔ اگر اسے عوامی نہیں رکھنا تو اسٹور فرنٹ اسکرین سے غیر شائع کریں۔ | توجه: ویترین منتشرشده همراه کسب‌وکار پاک نمی‌شود. اگر دیگر نمی‌خواهید عمومی باشد، از صفحه ویترین انتشارش را لغو کنید. |
| `trash.sweepNote` | Expired snapshots are deleted when this panel opens. | معیاد ختم شدہ اسنیپ شاٹ اس پینل کے کھلنے پر حذف ہو جاتے ہیں۔ | تصویرهای منقضی با بازشدن این پنل حذف می‌شوند. |
| `trash.title` | Trash | ٹریش | زباله‌دان |
| `trash.typeLabel` | Type CLEAR to confirm | تصدیق کے لیے CLEAR لکھیں | برای تأیید CLEAR بنویسید |
| `trash.typeMismatch` | Type CLEAR exactly to confirm. | تصدیق کے لیے بالکل CLEAR لکھیں۔ | برای تأیید دقیقاً CLEAR بنویسید. |
