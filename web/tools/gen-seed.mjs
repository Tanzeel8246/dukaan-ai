/**
 * Dukaan AI — deterministic seed-data generator.
 *
 * Generates 25 realistic kiryana products (PKR pricing) + 14 days of sample
 * sales, and writes:
 *   - web/lib/seed-data.json   (bundled fallback so the web demo works offline)
 *   - firebase/seed.json        (canonical seed for Firestore import)
 *
 * Sales carry `dayOffset` (0 = today, 13 = thirteen days ago). The web data
 * layer converts dayOffset -> actual calendar dates at runtime, so the demo's
 * "today's sales" and 7-day forecasts always look fresh no matter when the
 * demo is opened. `ts` is a fixed ISO timestamp (generation time, PKT) for
 * Firestore, where dayOffset is kept as an extra field.
 *
 * Run: node tools/gen-seed.mjs   (from the web/ directory)
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url)); // web/tools
const WEB_LIB = join(HERE, "..", "lib");
const FIREBASE_DIR = join(HERE, "..", "..", "firebase");

// Deterministic PRNG so every build produces identical demo data.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261020);

/**
 * id, sku, name, urduName, category, unit, cost, sale, stock, reorder,
 * keywords (EN+UR for the AI assistant), demandPerDay (units)
 */
const PRODUCTS = [
  ["p01", "DLD-OIL-5L", "Dalda Cooking Oil 5L", "ڈالڈا کوکنگ آئل 5 لیٹر", "Cooking Essentials", "pcs", 2450, 2600, 14, 5, ["oil", "dalda", "cooking oil", "تیل", "ڈالڈا"], 1.2],
  ["p02", "RICE-SKB-1K", "Super Kernel Basmati Rice 1kg", "سپر کرنل باسمتی چاول 1 کلو", "Rice & Grains", "pcs", 390, 430, 42, 10, ["rice", "basmati", "super kernel", "چاول", "باسمتی"], 4.5],
  ["p03", "SALT-NTL-800", "National Salt 800g", "نیشنل نمک 800 گرام", "Cooking Essentials", "pcs", 78, 95, 60, 15, ["salt", "نمک"], 3.2],
  ["p04", "TEA-TPL-475", "Tapal Danedar Tea 475g", "تپال دانے دار چائے 475 گرام", "Beverages", "pcs", 980, 1050, 18, 6, ["tea", "tapal", "danedar", "چائے", "تپال"], 2.1],
  ["p05", "SHN-BIR-50", "Shan Chicken Biryani Masala 50g", "شان چکن بریانی مصالحہ 50 گرام", "Spices", "pcs", 105, 125, 120, 30, ["biryani", "masala", "shan", "بریانی", "مصالحہ", "شان"], 6.0],
  ["p06", "ATTA-CHK-20K", "Fresh Chakki Atta 20kg", "تازہ چکی آٹا 20 کلو", "Rice & Grains", "bag", 2750, 2900, 8, 4, ["atta", "flour", "آٹا"], 1.0],
  ["p07", "DAL-MNG-1K", "Dal Moong (Washed) 1kg", "دال مونگ دھلی 1 کلو", "Lentils & Pulses", "kg", 340, 380, 25, 8, ["moong", "دال مونگ", "مونگ"], 2.4],
  ["p08", "DAL-CHN-1K", "Dal Chana 1kg", "دال چنا 1 کلو", "Lentils & Pulses", "kg", 280, 320, 22, 8, ["chana", "دال چنا", "چنا"], 2.2],
  ["p09", "DAL-MSR-1K", "Dal Masoor (Red Lentils) 1kg", "دال مسور 1 کلو", "Lentils & Pulses", "kg", 300, 340, 20, 8, ["masoor", "red lentil", "دال مسور", "مسور"], 2.6],
  ["p10", "SUGAR-5K", "Sugar 5kg", "چینی 5 کلو", "Cooking Essentials", "bag", 690, 750, 30, 10, ["sugar", "چینی"], 3.0],
  ["p11", "MLK-MLP-1L", "Nestlé Milkpak 1L", "نیسلے ملک پیک 1 لیٹر", "Dairy", "pcs", 235, 260, 48, 12, ["milk", "milkpak", "دودھ", "ملک پیک"], 5.5],
  ["p12", "MLK-OLP-15L", "Olper's Full Cream Milk 1.5L", "اولپرز فل کریم دودھ 1.5 لیٹر", "Dairy", "pcs", 395, 430, 24, 8, ["olpers", "دودھ", "اولپرز"], 2.8],
  ["p13", "SHN-HLM-60", "Shan Haleem Mix 60g", "شان حلیم مکس 60 گرام", "Spices", "pcs", 90, 110, 45, 12, ["haleem", "حلیم"], 2.0],
  ["p14", "KNR-CUB-20", "Knorr Chicken Cubes 20g", "کنور چکن کیوبز 20 گرام", "Cooking Essentials", "pcs", 115, 135, 55, 15, ["knorr", "cube", "کیوب", "کنور"], 3.4],
  ["p15", "VIM-BAR-200", "Vim Dishwashing Bar 200g", "وم ڈش واشنگ بار 200 گرام", "Household", "pcs", 85, 105, 40, 12, ["vim", "dishwash", "bar", "وم", "برتن"], 2.2],
  ["p16", "SRF-EXL-1K", "Surf Excel 1kg", "سرف ایکسل 1 کلو", "Household", "pcs", 420, 460, 16, 6, ["surf", "detergent", "سرف", "ایکسل"], 1.8],
  ["p17", "LFB-SOP-140", "Lifebuoy Soap 140g", "لائف بوائے صابن 140 گرام", "Personal Care", "pcs", 130, 150, 70, 20, ["soap", "lifebuoy", "صابن"], 4.0],
  ["p18", "SNK-SHM-180", "Sunsilk Shampoo 180ml", "سن سلک شیمپو 180 ملی لیٹر", "Personal Care", "pcs", 380, 420, 22, 8, ["shampoo", "sunsilk", "شیمپو"], 1.6],
  ["p19", "CLG-TP-90", "Colgate Toothpaste 90g", "کولگیٹ ٹوتھ پیسٹ 90 گرام", "Personal Care", "pcs", 260, 290, 35, 10, ["toothpaste", "colgate", "ٹوتھ پیسٹ", "کولگیٹ"], 2.4],
  ["p20", "PF-GLC-HR", "Peak Freans Gluco Biscuits (Half Roll)", "پیک فرینز گلوکو بسکٹ", "Snacks", "pcs", 145, 170, 50, 15, ["biscuit", "gluco", "بسکٹ", "گلوکو"], 4.8],
  ["p21", "CCL-15L", "Coca-Cola 1.5L", "کوکا کولا 1.5 لیٹر", "Beverages", "pcs", 195, 230, 60, 20, ["coke", "cola", "coca", "کوک", "کولا"], 5.0],
  ["p22", "RAF-800", "Rooh Afza 800ml", "روح افزا 800 ملی لیٹر", "Beverages", "pcs", 640, 700, 12, 5, ["rooh afza", "روح افزا"], 1.4],
  ["p23", "EWD-WHT-12K", "Everyday Whitener 1.2kg", "ایوری ڈے وائٹنر 1.2 کلو", "Dairy", "pcs", 990, 1080, 10, 4, ["everyday", "whitener", "وائٹنر"], 1.1],
  ["p24", "NTL-GRM-50", "National Garam Masala 50g", "نیشنل گرم مصالحہ 50 گرام", "Spices", "pcs", 120, 145, 65, 18, ["garam masala", "گرم مصالحہ"], 2.8],
  ["p25", "RICE-FLK-5K", "Falak Basmati Rice 5kg", "فلک باسمتی چاول 5 کلو", "Rice & Grains", "bag", 1950, 2100, 6, 3, ["falak", "rice 5kg", "چاول", "فلک"], 0.9],
];

const products = PRODUCTS.map(
  ([id, sku, name, urduName, category, unit, costPrice, salePrice, stockQty, reorderLevel, keywords, demandPerDay]) => ({
    id, sku, name, urduName, category, unit, costPrice, salePrice, stockQty, reorderLevel, keywords,
  })
);

// Sales: 14 days of history, one aggregated entry per product per day.
// PKT = UTC+5. dayOffset 0 = today (partial day), 1..13 = full days.
const now = new Date();
const sales = [];
let seq = 1;
for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
  const day = new Date(now.getTime() - dayOffset * 86400000);
  const dow = day.getDay(); // 5 = Friday
  const fridayBoost = dow === 5 ? 1.25 : 1.0;
  for (const p of PRODUCTS) {
    const demand = p[11];
    const partial = dayOffset === 0 ? 0.45 : 1.0; // today is only partly over
    const qty = Math.max(0, Math.round(demand * fridayBoost * partial * (0.55 + rand() * 0.9)));
    if (qty <= 0) continue;
    const hour = 9 + Math.floor(rand() * 12);
    const min = Math.floor(rand() * 60);
    const ts = new Date(day);
    ts.setHours(hour, min, 0, 0);
    // Format as PKT ISO with +05:00
    const pad = (n) => String(n).padStart(2, "0");
    const iso = `${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}T${pad(ts.getHours())}:${pad(ts.getMinutes())}:00+05:00`;
    sales.push({
      id: `s-${String(seq++).padStart(4, "0")}`,
      productId: p[0],
      qty,
      unitPrice: p[7],
      total: qty * p[7],
      dayOffset,
      ts: iso,
    });
  }
}

const payload = {
  generatedAt: now.toISOString(),
  note: "Dukaan AI demo seed: 25 kiryana products (PKR) + 14 days of sample sales. All fictional.",
  products,
  sales,
};

mkdirSync(WEB_LIB, { recursive: true });
mkdirSync(FIREBASE_DIR, { recursive: true });
writeFileSync(join(WEB_LIB, "seed-data.json"), JSON.stringify(payload, null, 2) + "\n");
writeFileSync(join(FIREBASE_DIR, "seed.json"), JSON.stringify(payload, null, 2) + "\n");

console.log(`products: ${products.length}, sales: ${sales.length}`);
console.log(`wrote web/lib/seed-data.json and firebase/seed.json`);
