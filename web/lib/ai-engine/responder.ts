/**
 * Dukaan AI — response generator.
 *
 * Turns a detected intent into a concrete, data-grounded answer using the
 * selectors in lib/selectors.ts. Every number in every reply is computed
 * from the live store — never invented.
 */
import { fmt1, fmtNum, fmtPKR, unitUrdu } from "../format";
import {
  avgDailySales,
  forecastAll,
  lowStockProducts,
  profitOnDay,
  revenueOnDay,
  topSeller,
  unitsOnDay,
} from "../selectors";
import {
  creditKey,
  customerOutstanding,
  expenseTotal,
  expensesOnDay,
  expensesThisMonth,
  payablesTotal,
  profitAndLoss,
  supplierBalance,
  totalOutstandingCredit,
} from "../ledger";
import type {
  Bill,
  CreditEntry,
  Expense,
  JournalEntry,
  Product,
  Purchase,
  PurchaseReturn,
  Sale,
  Supplier,
  SupplierPayment,
} from "../types";
import type { DetectedIntent } from "./intents";

export interface AssistantReply {
  text: string;
  lang: "ur" | "en";
  /** Follow-up suggestion chips shown under the reply. */
  suggestions: string[];
}

export interface AssistantCtx {
  products: Product[];
  sales: Sale[];
  bills?: Bill[];
  suppliers: Supplier[];
  purchases: Purchase[];
  purchaseReturns: PurchaseReturn[];
  supplierPayments: SupplierPayment[];
  credits: CreditEntry[];
  expenses: Expense[];
  journal: JournalEntry[];
  /**
   * UI language override set by the chat UI. When present it wins over the
   * language detected from the typed text, so replies and suggestion chips
   * always follow the interface language.
   */
  lang?: "ur" | "en";
}

type Ctx = AssistantCtx;

const EN_SUGGESTIONS = [
  "Which items are running low?",
  "How much did I sell today?",
  "What are today's expenses?",
  "What should I reorder?",
];
const UR_SUGGESTIONS = [
  "کون سی چیز ختم ہونے والی ہے؟",
  "آج کی فروخت کتنی ہوئی؟",
  "آج کے اخراجات کتنے ہیں؟",
  "مجھے کیا آرڈر کرنا چاہیے؟",
];

function suggestions(lang: "ur" | "en"): string[] {
  return lang === "ur" ? UR_SUGGESTIONS : EN_SUGGESTIONS;
}

/** Follow-up / starter chips for a language (used by the chat UI). */
export function suggestionsFor(lang: "ur" | "en"): string[] {
  return suggestions(lang);
}

function greetingReply(lang: "ur" | "en"): AssistantReply {
  const text =
    lang === "ur"
      ? "السلام علیکم! میں دکان اے آئی ہوں — آپ کی دکان کا ذہین مددگار۔\nآپ مجھ سے اسٹاک، فروخت یا آرڈر کے بارے میں پوچھ سکتے ہیں۔ مثلاً: «چاول کا اسٹاک کتنا ہے؟»"
      : "Hello! I'm Dukaan AI, your shop's smart assistant.\nAsk me about stock, sales or reordering — for example: “How much rice stock is left?”";
  return { text, lang, suggestions: suggestions(lang) };
}

function helpReply(lang: "ur" | "en"): AssistantReply {
  const text =
    lang === "ur"
      ? "میں یہ سب کر سکتا ہوں:\n• کسی چیز کا اسٹاک بتانا — «تیل کا اسٹاک کتنا ہے؟»\n• ختم ہونے والی اشیاء کی فہرست — «کون سی چیز ختم ہونے والی ہے؟»\n• آج کی فروخت — «آج کی فروخت کتنی ہوئی؟»\n• آرڈر کی تجویز — «مجھے کیا آرڈر کرنا چاہیے؟»"
      : "Here's what I can do:\n• Check any item's stock — “How much oil stock is left?”\n• List items running low — “Which items are running low?”\n• Today's sales — “How much did I sell today?”\n• Reorder advice — “What should I reorder?”";
  return { text, lang, suggestions: suggestions(lang) };
}

function stockReply(p: Product, lang: "ur" | "en", products: Product[], sales: Sale[]): AssistantReply {
  const low = p.stockQty <= p.reorderLevel;
  const avg = avgDailySales(sales, p.id, 7);
  const days = avg > 0 ? Math.floor(p.stockQty / avg) : -1;
  const statusEn = low ? "LOW STOCK — time to reorder" : "Stock is healthy";
  const statusUr = low ? "اسٹاک کم ہے — آرڈر کا وقت ہے" : "اسٹاک ٹھیک ہے";
  const text =
    lang === "ur"
      ? `${p.urduName} (${p.name})\n• موجودہ اسٹاک: ${fmtNum(p.stockQty)} ${unitUrdu(p.unit)}\n• قیمتِ فروخت: ${fmtPKR(p.salePrice)}\n• حیثیت: ${statusUr}` +
        (days >= 0 ? `\n• موجودہ رفتار پر تقریباً ${days} دن چلے گا` : "")
      : `${p.name}\n• Current stock: ${fmtNum(p.stockQty)} ${p.unit}\n• Sale price: ${fmtPKR(p.salePrice)}\n• Status: ${statusEn}` +
        (days >= 0 ? `\n• Lasts ~${days} days at current sales rate` : "");
  return { text, lang, suggestions: suggestions(lang) };
}

function lowStockReply(ctx: Ctx, lang: "ur" | "en"): AssistantReply {
  const low = lowStockProducts(ctx.products);
  if (low.length === 0) {
    const text =
      lang === "ur"
        ? "خوشخبری! فی الحال کوئی چیز ری-آرڈر لیول سے نیچے نہیں ہے۔ سب اسٹاک ٹھیک ہے۔"
        : "Good news! Nothing is below its reorder level right now. All stock is healthy.";
    return { text, lang, suggestions: suggestions(lang) };
  }
  const rows = low.slice(0, 6).map((p, i) => {
    const avg = avgDailySales(ctx.sales, p.id, 7);
    const days = avg > 0 ? ` (~${Math.max(0, Math.floor(p.stockQty / avg))} days left)` : "";
    return lang === "ur"
      ? `${i + 1}. ${p.urduName}: ${fmtNum(p.stockQty)} ${unitUrdu(p.unit)} باقی`
      : `${i + 1}. ${p.name}: ${fmtNum(p.stockQty)} ${p.unit} left${days}`;
  });
  const more = low.length > 6 ? (lang === "ur" ? `\n…اور ${low.length - 6} اشیاء` : `\n…and ${low.length - 6} more`) : "";
  const text =
    (lang === "ur" ? "یہ اشیاء ختم ہونے والی ہیں:\n" : "These items are running low:\n") +
    rows.join("\n") +
    more +
    (lang === "ur" ? "\nفوری آرڈر کر لیں تاکہ دکان خالی نہ ہو۔" : "\nReorder soon so the shelf never goes empty.");
  return { text, lang, suggestions: suggestions(lang) };
}

function salesTodayReply(ctx: Ctx, lang: "ur" | "en"): AssistantReply {
  const revenue = revenueOnDay(ctx.sales, 0);
  const units = unitsOnDay(ctx.sales, 0);
  const profit = profitOnDay(ctx.sales, 0, ctx.products, ctx.bills);
  const avg7 = [1, 2, 3, 4, 5, 6, 7].reduce((a, d) => a + revenueOnDay(ctx.sales, d), 0) / 7;
  const trend =
    avg7 > 0
      ? revenue >= avg7
        ? lang === "ur" ? "آج کی فروخت اوسط سے بہتر ہے" : "above your 7-day average"
        : lang === "ur" ? "آج کی فروخت اوسط سے کم ہے" : "below your 7-day average"
      : "";
  const top = topSeller(ctx.products, ctx.sales, 1);
  const text =
    lang === "ur"
      ? `آج کی فروخت:\n• کل آمدنی: ${fmtPKR(revenue)}\n• فروخت شدہ اشیاء: ${fmtNum(units)}\n• تخمینی منافع: ${fmtPKR(profit)}` +
        (trend ? `\n• ${trend}` : "") +
        (top ? `\n• آج سب سے زیادہ بکنے والی چیز: ${top.product.urduName}` : "")
      : `Today's sales:\n• Total revenue: ${fmtPKR(revenue)}\n• Items sold: ${fmtNum(units)}\n• Estimated profit: ${fmtPKR(profit)}` +
        (trend ? `\n• That's ${trend}` : "") +
        (top ? `\n• Today's best seller: ${top.product.name}` : "");
  return { text, lang, suggestions: suggestions(lang) };
}

function forecastReply(ctx: Ctx, lang: "ur" | "en", productId?: string): AssistantReply {
  const rows = forecastAll(ctx.products, ctx.sales).filter((r) => r.avgDaily > 0);
  const pick = productId ? rows.filter((r) => r.product.id === productId) : rows.filter((r) => r.suggestedReorder > 0).slice(0, 5);
  if (pick.length === 0) {
    const text =
      lang === "ur"
        ? "فی الحال کسی چیز کے لیے فوری آرڈر کی ضرورت نہیں — اسٹاک ڈیمانڈ کے مطابق ہے۔"
        : "No urgent reorders needed right now — stock matches demand.";
    return { text, lang, suggestions: suggestions(lang) };
  }
  const lines = pick.map((r, i) => {
    const days = r.daysOfStock === Number.POSITIVE_INFINITY ? "—" : `~${Math.floor(r.daysOfStock)} دن`;
    const daysEn = r.daysOfStock === Number.POSITIVE_INFINITY ? "—" : `~${Math.floor(r.daysOfStock)}d`;
    return lang === "ur"
      ? `${i + 1}. ${r.product.urduName}: روزانہ ~${fmt1(r.avgDaily)} بکتی ہے، اسٹاک ${days} چلے گا → ${fmtNum(r.suggestedReorder)} ${unitUrdu(r.product.unit)} منگوائیں`
      : `${i + 1}. ${r.product.name}: sells ~${fmt1(r.avgDaily)}/day, stock lasts ${daysEn} → order ${fmtNum(r.suggestedReorder)} ${r.product.unit}`;
  });
  const text =
    (lang === "ur"
      ? "پچھلے 7 دن کی اوسط کے حساب سے آرڈر کی تجویز:\n"
      : "Based on your 7-day average sales, here's what to order:\n") + lines.join("\n");
  return { text, lang, suggestions: suggestions(lang) };
}

function fallbackReply(lang: "ur" | "en"): AssistantReply {
  const text =
    lang === "ur"
      ? "معذرت، میں سمجھ نہیں پایا۔ آپ ان میں سے کچھ پوچھ کر دیکھیں:"
      : "Sorry, I didn't catch that. Try one of these:";
  return { text, lang, suggestions: suggestions(lang) };
}

function expensesReply(ctx: Ctx, lang: "ur" | "en"): AssistantReply {
  const today = expensesOnDay(ctx.expenses, 0);
  const todayTotal = expenseTotal(today);
  const monthTotal = expenseTotal(expensesThisMonth(ctx.expenses));
  const rows = today.slice(0, 5).map((e) =>
    lang === "ur"
      ? `• ${e.category}: ${fmtPKR(e.amount)}${e.note ? ` — ${e.note}` : ""}`
      : `• ${e.category}: ${fmtPKR(e.amount)}${e.note ? ` — ${e.note}` : ""}`
  );
  const text =
    lang === "ur"
      ? `آج کے اخراجات: ${fmtPKR(todayTotal)}` +
        (rows.length ? `\n${rows.join("\n")}` : "\nآج کوئی خرچ درج نہیں ہوا۔") +
        `\nاس مہینے کے کل اخراجات: ${fmtPKR(monthTotal)}`
      : `Today's expenses: ${fmtPKR(todayTotal)}` +
        (rows.length ? `\n${rows.join("\n")}` : "\nNo expenses recorded today.") +
        `\nThis month's total expenses: ${fmtPKR(monthTotal)}`;
  return { text, lang, suggestions: suggestions(lang) };
}

function monthNetReply(ctx: Ctx, lang: "ur" | "en"): AssistantReply {
  const pl = profitAndLoss(ctx.journal);
  const text =
    lang === "ur"
      ? `اس مہینے کا حساب (جرنل سے):\n• کل فروخت: ${fmtPKR(pl.revenue)}\n• لاگت (COGS): ${fmtPKR(pl.cogs)}\n• اخراجات: ${fmtPKR(pl.expensesTotal)}\n• خالص منافع: ${fmtPKR(pl.net)}`
      : `This month (from the journal):\n• Revenue: ${fmtPKR(pl.revenue)}\n• Cost of goods: ${fmtPKR(pl.cogs)}\n• Expenses: ${fmtPKR(pl.expensesTotal)}\n• Net profit: ${fmtPKR(pl.net)}`;
  return { text, lang, suggestions: suggestions(lang) };
}

function supplierBalanceReply(ctx: Ctx, lang: "ur" | "en", supplierId?: string): AssistantReply {
  const named = supplierId ? ctx.suppliers.find((s) => s.id === supplierId) : undefined;
  if (named) {
    const bal = supplierBalance(ctx.purchases, ctx.supplierPayments, named.id, ctx.purchaseReturns);
    const text =
      lang === "ur"
        ? `${named.name} کا بقایا: ${fmtPKR(bal)}\n(کل خریداری میں سے ادائیگی کے بعد باقی رقم)`
        : `You owe ${named.name}: ${fmtPKR(bal)}\n(total purchases minus payments made)`;
    return { text, lang, suggestions: suggestions(lang) };
  }
  const total = payablesTotal(ctx.journal);
  const rows = ctx.suppliers
    .map((s) => ({ s, bal: supplierBalance(ctx.purchases, ctx.supplierPayments, s.id, ctx.purchaseReturns) }))
    .filter((r) => r.bal > 0)
    .sort((a, b) => b.bal - a.bal)
    .slice(0, 5)
    .map((r, i) => `${i + 1}. ${r.s.name}: ${fmtPKR(r.bal)}`);
  const text =
    lang === "ur"
      ? `سپلائرز کو کل دینا ہے: ${fmtPKR(total)}` + (rows.length ? `\n${rows.join("\n")}` : "\nکسی سپلائر کا بقایا نہیں۔")
      : `Total supplier payable: ${fmtPKR(total)}` + (rows.length ? `\n${rows.join("\n")}` : "\nNo supplier dues outstanding.");
  return { text, lang, suggestions: suggestions(lang) };
}

function creditOutstandingReply(ctx: Ctx, lang: "ur" | "en"): AssistantReply {
  const total = totalOutstandingCredit(ctx.credits);
  const keys = [...new Set(ctx.credits.map(creditKey))];
  const debtors = keys
    .map((k) => {
      const rows = ctx.credits.filter((c) => creditKey(c) === k);
      const latest = rows[rows.length - 1];
      return { name: latest?.customerName ?? k, bal: customerOutstanding(ctx.credits, k) };
    })
    .filter((d) => d.bal > 0)
    .sort((a, b) => b.bal - a.bal)
    .slice(0, 5)
    .map((d, i) => `${i + 1}. ${d.name}: ${fmtPKR(d.bal)}`);
  const text =
    lang === "ur"
      ? `کل ادھار بقایا: ${fmtPKR(total)}` + (debtors.length ? `\nبڑے بقایا دار:\n${debtors.join("\n")}` : "\nکسی گاہک کا ادھار بقایا نہیں۔")
      : `Total udhaar outstanding: ${fmtPKR(total)}` + (debtors.length ? `\nTop balances:\n${debtors.join("\n")}` : "\nNo customer has an outstanding balance.");
  return { text, lang, suggestions: suggestions(lang) };
}

/** Main entry: detect intent already done by caller; compute the reply. */
export function generateReply(detected: DetectedIntent, ctx: Ctx): AssistantReply {
  const { intent, productId, supplierId } = detected;
  // UI language (ctx.lang, set by AssistantChat from useLang) wins over the
  // language detected from the typed text.
  const lang = ctx.lang ?? detected.lang;
  switch (intent) {
    case "greeting":
      return greetingReply(lang);
    case "help":
      return helpReply(lang);
    case "stock_query": {
      const p = ctx.products.find((x) => x.id === productId);
      if (!p) return fallbackReply(lang);
      return stockReply(p, lang, ctx.products, ctx.sales);
    }
    case "low_stock":
      return lowStockReply(ctx, lang);
    case "sales_today":
      return salesTodayReply(ctx, lang);
    case "forecast_query":
      return forecastReply(ctx, lang, productId);
    case "expenses_query":
      return expensesReply(ctx, lang);
    case "month_net":
      return monthNetReply(ctx, lang);
    case "supplier_balance":
      return supplierBalanceReply(ctx, lang, supplierId);
    case "credit_outstanding":
      return creditOutstandingReply(ctx, lang);
    default:
      return fallbackReply(lang);
  }
}
