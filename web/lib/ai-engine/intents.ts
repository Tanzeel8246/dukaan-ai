/**
 * Dukaan AI — intent & pattern matcher (bilingual: Urdu + English).
 *
 * Matches a free-text message against keyword/regex patterns and, when a
 * product is mentioned, resolves it to a product id via the product keyword
 * map. No ML model, no network — deterministic and fully offline.
 */
import type { Product, Supplier } from "../types";

export type Intent =
  | "greeting"
  | "stock_query"
  | "low_stock"
  | "sales_today"
  | "forecast_query"
  | "expenses_query"
  | "month_net"
  | "supplier_balance"
  | "credit_outstanding"
  | "help"
  | "fallback";

export interface DetectedIntent {
  intent: Intent;
  /** Resolved product id when the message mentions a specific product. */
  productId?: string;
  /** Resolved supplier id when the message names a supplier. */
  supplierId?: string;
  /** "ur" when the message is Urdu, otherwise "en". */
  lang: "ur" | "en";
}

/** Strip Arabic diacritics/harakaat so matching is spelling-tolerant. */
function normalize(text: string): string {
  return text
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/آ/g, "ا")
    .replace(/ة/g, "ہ")
    .toLowerCase();
}

const GREETING = [/\b(hello|hi|hey|salam|assalam|aoa|good\s?(morning|evening|afternoon))\b/, /سلام|السلام|آداب/];
const HELP = [/\b(help|guide|commands|what can you)\b/, /مدد|رہنمائی|ہدایت|کیا کر سکتے/];
const LOW_STOCK = [/\b(low stock|running (out|low)|out of stock|shortage|reorder alert|almost (gone|finished)|which items are running low)\b/, /ختم|کم اسٹاک|کم سٹاک|قلیل|نایاب|کون سی چیز ختم/];
const SALES_TODAY = [/\b(sales?|sell|selling|revenue|turnover|earned|sold today|today'?s sale|how much did i sell today)\b/, /فروخت|بکری|کمائی|سیل|آمدنی|آج کی فروخت/];
const FORECAST = [/\b(forecast|predict|reorder|suggest|how much.*order|demand|stock up|what should i reorder)\b/, /پیش.?گوئی|آرڈر|منگوانا|کتنا منگواؤ|ڈیمانڈ|کیا آرڈر/];
const STOCK = [/\b(stock|inventory|available|quantity|how many|left)\b/, /اسٹاک|سٹاک|موجود|کتنا ہے|کتنی ہے|بچا/];
const EXPENSES = [/\b(expense|expenses|spending|spent|what are today'?s expenses)\b/, /خرچ|اخراجات|خرچہ|آج کے اخراجات/];
const MONTH_NET = [/\b(net profit|monthly profit|profit this month|this month.*(profit|net)|munafa)\b/, /منافع|خالص نفع|مہینے کا نفع|بچت/];
const SUPPLIER = [/\b(supplier|payable|payables|owe|dues)\b/, /سپلائر|بقایا|دینا ہے|قرض/];
const CREDIT = [/\b(udhaar|credit outstanding|receivable|receivables|outstanding|who owes)\b/, /ادھار|وصولی|لینا ہے|کس نے دینا/];

function matches(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

/** Find a product mentioned in the text via its keyword map. */
export function findProduct(text: string, products: Product[]): Product | undefined {
  const norm = ` ${normalize(text)} `;
  let best: Product | undefined;
  let bestLen = 0;
  for (const p of products) {
    for (const kw of p.keywords) {
      const k = normalize(kw).trim();
      if (!k) continue;
      // Single-char keywords would over-match; require word-ish context.
      const hit = k.length === 1 ? norm.includes(` ${k} `) : norm.includes(k);
      if (hit && k.length > bestLen) {
        best = p;
        bestLen = k.length;
      }
    }
  }
  return best;
}

/** Find a supplier mentioned by name (or company) in the text. */
export function findSupplier(text: string, suppliers: Supplier[]): Supplier | undefined {
  const norm = normalize(text);
  let best: Supplier | undefined;
  let bestLen = 0;
  for (const s of suppliers) {
    for (const cand of [s.name, s.company]) {
      const k = normalize(cand).trim();
      if (k.length >= 3 && norm.includes(k) && k.length > bestLen) {
        best = s;
        bestLen = k.length;
      }
    }
  }
  return best;
}

export function detectIntent(rawText: string, products: Product[], suppliers: Supplier[] = []): DetectedIntent {
  const text = rawText.trim();
  const norm = normalize(text);
  const lang: "ur" | "en" = /[\u0600-\u06FF]/.test(text) ? "ur" : "en";
  const product = findProduct(text, products);
  const productId = product?.id;
  const supplier = findSupplier(text, suppliers);
  const supplierId = supplier?.id;

  if (matches(norm, GREETING)) return { intent: "greeting", lang };
  if (matches(norm, HELP)) return { intent: "help", lang };
  if (matches(norm, LOW_STOCK)) return { intent: "low_stock", lang };
  if (matches(norm, EXPENSES)) return { intent: "expenses_query", lang };
  if (matches(norm, MONTH_NET)) return { intent: "month_net", lang };
  if (supplier || matches(norm, SUPPLIER)) return { intent: "supplier_balance", lang, supplierId };
  if (matches(norm, CREDIT)) return { intent: "credit_outstanding", lang };
  if (matches(norm, SALES_TODAY)) return { intent: "sales_today", lang };
  if (matches(norm, FORECAST)) return { intent: "forecast_query", lang, productId };
  if (matches(norm, STOCK) || product) return { intent: "stock_query", lang, productId };
  return { intent: "fallback", lang, productId };
}
