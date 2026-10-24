/**
 * Golden-fixture export for ERP Phase F (design §8.2).
 *
 * Dev-only tooling — no app behaviour changes. Composes the F1 core
 * scenarios through the REAL compiled web/lib functions (makeEntry,
 * computeBillTaxes, computePurchaseTaxes, returnTaxShares,
 * classLegLines, billCreditOutstanding, defaultAccountForMethod),
 * transcribing the StoreProvider posting templates (postBill,
 * recordSale, the return engine, recordPurchase, addRepayment,
 * giveCredit) line-for-line, and writes canonical JSON the Dart
 * suite asserts against byte-for-byte (accounts / refs / amounts /
 * line order; entry ids + timestamps are normalised OUT — they are
 * client-generated and not part of the money contract).
 *
 * Run AFTER the harness compile:
 *   cd ../web && npx tsc -p ../harness/tsconfig.json
 *   node ../harness/harness.js            (must stay ALL SUITES GREEN)
 *   node ../harness/fixtures-export.js    (writes fixtures/f1-core.json)
 *
 * The exporter self-checks: every entry balances (makeEntry throws
 * otherwise), the whole fixture journal's trial balance is 0, and
 * purchases clearing nets to zero per purchase scenario.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const L = require("./out/ledger.js");
const T = require("./out/tax.js");
const round2 = T.round2;

/* ---------------- fixture shop ---------------- */

const accounts = [
  { id: "acct-till", name: "Main Till", kind: "cash", method: "cash", legacyFor: "cash", archived: false, sortOrder: 0, ts: "2026-01-01T00:00:00.000Z" },
  { id: "acct-wallet", name: "Wallet & Bank", kind: "wallet", method: null, legacyFor: "wallet", archived: false, sortOrder: 1, ts: "2026-01-01T00:00:00.000Z" },
  { id: "acct-jazz", name: "JazzCash", kind: "wallet", method: "jazzcash", legacyFor: null, archived: false, sortOrder: 2, ts: "2026-01-01T00:00:00.000Z" },
];
const resolveAccountId = (method) => {
  const a = L.defaultAccountForMethod(accounts, method);
  return a ? a.id : null;
};

const products = [
  { id: "p-tea", sku: "TEA-475", name: "Tapal Danedar Tea 475g", urduName: "چائے", category: "Grocery", unit: "pcs", costPrice: 800, salePrice: 1050, stockQty: 50, reorderLevel: 5, keywords: [], taxSlabId: null, taxExempt: false, stockClass: null },
  { id: "p-sugar", sku: "SUG-1KG", name: "Sugar 1kg", urduName: "چینی", category: "Grocery", unit: "kg", costPrice: 130, salePrice: 145, stockQty: 100, reorderLevel: 10, keywords: [], taxSlabId: null, taxExempt: false, stockClass: null },
  { id: "p-raw", sku: "RAW-LEAF", name: "Raw Tea Leaf 1kg", urduName: "کچی پتی", category: "Raw", unit: "kg", costPrice: 500, salePrice: 600, stockQty: 40, reorderLevel: 5, keywords: [], taxSlabId: null, taxExempt: false, stockClass: "raw" },
  { id: "p-oil", sku: "OIL-5L", name: "Cooking Oil 5L", urduName: "تیل", category: "Grocery", unit: "pcs", costPrice: 1000, salePrice: 1200, stockQty: 20, reorderLevel: 3, keywords: [], taxSlabId: "slab-gst-ex", taxExempt: false, stockClass: null },
  { id: "p-ghee", sku: "GHEE-1KG", name: "Desi Ghee 1kg", urduName: "گھی", category: "Grocery", unit: "kg", costPrice: 900, salePrice: 1170, stockQty: 15, reorderLevel: 3, keywords: [], taxSlabId: "slab-gst-in", taxExempt: false, stockClass: null },
];
const slabs = [
  { id: "slab-gst-ex", name: "GST 17%", kind: "percent", rate: 17, appliesTo: "both", inclusive: false, isDefault: false, active: true, ts: "2026-01-01T00:00:00.000Z" },
  { id: "slab-gst-in", name: "GST 17% incl", kind: "percent", rate: 17, appliesTo: "both", inclusive: true, isDefault: false, active: true, ts: "2026-01-01T00:00:00.000Z" },
];
const noTaxSettings = { defaultSalesTaxSlabId: null, defaultPurchaseTaxSlabId: null };
const customer = { id: "cust-1", name: "Ahmed Traders", phone: "03001234567" };
const supplier = { id: "sup-1", name: "Lahore Tea Co" };

const prod = (id) => products.find((p) => p.id === id);

/* ------- template transcriptions (StoreProvider, verbatim logic) ------- */

/** buildBill + stampBillTaxes + postBill's entry, minus batch writes. */
function composeBill({ id, billNo, customerId = null, customerName = "", customerPhone = "", lines, discountType = "flat", discountValue = 0, payments }) {
  const items = lines.map((l) => {
    const p = prod(l.productId);
    const unitPrice = l.unitPrice != null ? l.unitPrice : p.salePrice;
    return { productId: p.id, name: p.name, qty: l.qty, unitPrice, unitCost: p.costPrice, total: l.qty * unitPrice };
  });
  const subtotal = items.reduce((a, i) => a + i.total, 0);
  const discountAmount = discountType === "percent" ? round2((subtotal * discountValue) / 100) : discountValue;
  const taxed = T.computeBillTaxes(
    items.map((it) => ({ total: it.total, qty: it.qty, slab: T.resolveTaxSlab(prod(it.productId), slabs, noTaxSettings, "sales") })),
    discountAmount
  );
  items.forEach((it, i) => {
    const tl = taxed.lines[i];
    it.taxAmount = tl.taxAmount;
    it.taxSlabId = tl.slab ? tl.slab.id : null;
    it.taxSlabName = tl.slab ? tl.slab.name : null;
    it.taxRate = tl.slab ? tl.slab.rate : 0;
    it.taxKind = tl.slab ? tl.slab.kind : "percent";
    it.taxInclusive = tl.slab ? tl.slab.inclusive : false;
  });
  const bill = {
    id, billNo, customerId, customerName, customerPhone, items, subtotal,
    discountType, discountValue, discountAmount, taxAmount: taxed.taxAmount,
    total: taxed.total, payments, status: "paid", returnedQty: {}, dayOffset: 0,
    ts: "2026-10-22T10:00:00.000Z",
  };
  const costTotal = items.reduce((a, i) => a + i.qty * i.unitCost, 0);
  // postBill entry composition:
  const stampedPayments = payments.map((p) => ({
    method: p.method, amount: p.amount,
    accountId: p.method === "credit" ? null : resolveAccountId(p.method),
  }));
  const paidTotal = stampedPayments.reduce((a, p) => a + p.amount, 0);
  const rounding = bill.total - paidTotal;
  const discountDebit = bill.discountAmount + Math.max(0, rounding);
  const billTax = bill.taxAmount ?? 0;
  const inclusiveTax = round2(bill.items.reduce((a, it) => a + (it.taxInclusive ? (it.taxAmount ?? 0) : 0), 0));
  const rawCostShare = items.reduce((a, it) => a + (prod(it.productId).stockClass === "raw" ? it.qty * it.unitCost : 0), 0);
  const linesJ = [
    ...stampedPayments.map((p) => ({
      account: L.accountForMethod(p.method), debit: p.amount, credit: 0,
      ref: p.method === "credit" ? bill.customerId : p.accountId,
    })),
    ...(discountDebit > 0 ? [{ account: "sales_discount", debit: discountDebit, credit: 0 }] : []),
    ...(rounding < 0 ? [{ account: "sales_discount", debit: 0, credit: -rounding }] : []),
    { account: "cogs", debit: costTotal, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: inclusiveTax > 0 ? round2(bill.subtotal - inclusiveTax) : bill.subtotal },
    ...(billTax > 0 ? [{ account: "tax_payable", debit: 0, credit: billTax }] : []),
    ...L.classLegLines(costTotal, rawCostShare, "credit"),
  ];
  const entry = L.makeEntry(`Bill #${bill.billNo} — ${bill.customerName || "Walk-in customer"}`, "bill", bill.id, linesJ, { ts: bill.ts });
  const creditPart = stampedPayments.filter((p) => p.method === "credit").reduce((a, p) => a + p.amount, 0);
  const creditRow = creditPart > 0 ? {
    id: `cr-${bill.id}`, customerId: bill.customerId, customerName: bill.customerName,
    customerPhone: bill.customerPhone, kind: "credit", amount: creditPart,
    note: `Bill #${bill.billNo} — part payment on udhaar`, billId: bill.id, dayOffset: 0, ts: bill.ts,
  } : null;
  return { bill, entry, creditRow };
}

/** recordSale (counter) entry. */
function composeCounterSale({ id, productId, qty }) {
  const p = prod(productId);
  const total = qty * p.salePrice;
  const ct = T.computeBillTaxes([{ total, qty, slab: T.resolveTaxSlab(p, slabs, noTaxSettings, "sales") }], 0);
  const entry = L.makeEntry(`Counter sale — ${p.name} × ${qty}`, "sale", id, [
    { account: "cash", debit: total + ct.exclusiveTax, credit: 0, ref: resolveAccountId("cash") },
    { account: "cogs", debit: qty * p.costPrice, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: ct.inclusiveTax > 0 ? round2(total - ct.inclusiveTax) : total },
    ...(ct.taxAmount > 0 ? [{ account: "tax_payable", debit: 0, credit: ct.taxAmount }] : []),
    { account: p.stockClass === "raw" ? "inventory_raw" : "inventory", debit: 0, credit: qty * p.costPrice },
  ], { ts: "2026-10-22T10:05:00.000Z" });
  return { entry };
}

/** The return engine (kind: "return") entry + SaleReturn figures. */
function composeReturn({ bill, priorReturns, credits, lines, refundMethod = "cash" }) {
  const byPid = new Map(bill.items.map((i) => [i.productId, i]));
  const retItems = [];
  let gross = 0, cost = 0, costRaw = 0;
  for (const l of lines) {
    const src = byPid.get(l.productId);
    if (!src || l.qty <= 0) continue;
    const already = bill.returnedQty?.[l.productId] ?? 0;
    const qty = Math.min(l.qty, src.qty - already);
    if (qty <= 0) continue;
    retItems.push({ ...src, qty, total: qty * src.unitPrice });
    gross += qty * src.unitPrice;
    cost += qty * src.unitCost;
    if (prod(l.productId).stockClass === "raw") costRaw += qty * src.unitCost;
  }
  const taxShares = T.returnTaxShares(bill, priorReturns, retItems);
  for (const it of retItems) it.taxAmount = taxShares.perLine.get(it.productId) ?? 0;
  const priorGross = bill.items.reduce((a, i) => a + (bill.returnedQty?.[i.productId] ?? 0) * i.unitPrice, 0);
  const alreadyReversedDiscount = priorReturns.reduce(
    (a, r) => a + (r.items.reduce((x, i) => x + i.total, 0) - (r.refundAmount + (r.creditReduction ?? 0)) +
      r.items.reduce((x, i) => x + (i.taxInclusive ? 0 : (i.taxAmount ?? 0)), 0)), 0);
  const completesBill = priorGross + gross >= bill.subtotal - 1e-9;
  const cumulativeDiscount = bill.subtotal > 0 ? Math.round((bill.discountAmount * (priorGross + gross)) / bill.subtotal) : 0;
  const discountShare = Math.max(0, (completesBill ? bill.discountAmount : cumulativeDiscount) - alreadyReversedDiscount);
  const refundTotal = gross - discountShare + taxShares.exclusiveTaxShare;
  const creditPosition = L.billCreditOutstanding(credits, bill);
  const creditReduction = Math.min(refundTotal, creditPosition.outstanding);
  const cashRefund = refundTotal - creditReduction;
  const refundAccountId = resolveAccountId(refundMethod);
  const linesJ = [
    { account: "sales_revenue", debit: taxShares.inclusiveTaxShare > 0 ? round2(gross - taxShares.inclusiveTaxShare) : gross, credit: 0 },
    ...(taxShares.taxShare > 0 ? [{ account: "tax_payable", debit: taxShares.taxShare, credit: 0 }] : []),
    ...L.classLegLines(cost, costRaw, "debit"),
    ...(discountShare > 0 ? [{ account: "sales_discount", debit: 0, credit: discountShare }] : []),
    ...(creditReduction > 0 ? [{ account: "receivables", debit: 0, credit: creditReduction, ref: bill.customerId }] : []),
    ...(cashRefund > 0 ? [{ account: L.accountForMethod(refundMethod), debit: 0, credit: cashRefund, ref: refundAccountId }] : []),
    { account: "cogs", debit: 0, credit: cost },
  ];
  const entry = L.makeEntry(`Return against Bill #${bill.billNo}`, "return", bill.id, linesJ, { ts: "2026-10-22T11:00:00.000Z" });
  const ret = {
    id: `ret-${bill.id}-${priorReturns.length + 1}`, billId: bill.id, billNo: bill.billNo,
    items: retItems, refundAmount: cashRefund, creditReduction, method: refundMethod,
    accountId: refundAccountId, dayOffset: 0, ts: entry.ts,
  };
  return { entry, ret };
}

/** recordPurchase entry. */
function composePurchase({ id, supplierId, lines }) {
  const items = lines.map((l) => {
    const p = prod(l.productId);
    return { productId: p.id, name: p.name, qty: l.qty, unitCost: l.unitCost, total: l.qty * l.unitCost };
  });
  const pt = T.computePurchaseTaxes(items.map((it) => ({ total: it.total, qty: it.qty, slab: T.resolveTaxSlab(prod(it.productId), slabs, noTaxSettings, "purchases") })));
  items.forEach((it, i) => { it.taxAmount = pt.lines[i].taxAmount; });
  const rawNetShare = items.reduce((a, it, i) => a + (prod(it.productId).stockClass === "raw" ? (pt.lines[i]?.base ?? 0) : 0), 0);
  const purchase = { id, supplierId, items, total: pt.grossTotal, netTotal: pt.netTotal, taxAmount: pt.taxAmount, note: "", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
  const entry = L.makeEntry(`Purchase — stock received`, "purchase", id, [
    { account: "purchases", debit: pt.netTotal, credit: 0 },
    ...(pt.taxAmount > 0 ? [{ account: "tax_input", debit: pt.taxAmount, credit: 0 }] : []),
    ...L.classLegLines(pt.netTotal, rawNetShare, "debit"),
    { account: "purchases", debit: 0, credit: pt.netTotal },
    { account: "payables", debit: 0, credit: pt.grossTotal, ref: supplierId },
  ], { ts: purchase.ts });
  return { purchase, entry };
}

/* ---------------- scenarios ---------------- */

const scenarios = [];
const push = (id, title, docs, entries) => scenarios.push({ id, title, docs, entries: entries.map(normEntry) });
function normEntry(e) {
  return { memo: e.memo, refType: e.refType, refId: e.refId, reversesId: e.reversesId ?? null,
    lines: e.lines.map((l) => ({ account: l.account, debit: l.debit, credit: l.credit, ref: l.ref ?? null })) };
}

// 1 — plain cash bill
{
  const { bill, entry } = composeBill({ id: "bill-1", billNo: 1, lines: [{ productId: "p-tea", qty: 2 }], payments: [{ method: "cash", amount: 2100 }] });
  push("bill-cash", "Bill paid fully in cash, no tax, no discount", { bill }, [entry]);
}
// 2 — split cash + udhaar with a flat discount
{
  const { bill, entry, creditRow } = composeBill({ id: "bill-2", billNo: 2, customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
    lines: [{ productId: "p-tea", qty: 1 }, { productId: "p-sugar", qty: 2 }], discountValue: 40,
    payments: [{ method: "cash", amount: 500 }, { method: "credit", amount: 800 }] });
  push("bill-credit-split", "Bill with flat discount, part cash part udhaar", { bill, creditRow }, [entry]);
  // 9 — partial return against bill-2 (udhaar still outstanding)
  const r1 = composeReturn({ bill, priorReturns: [], credits: [creditRow], lines: [{ productId: "p-sugar", qty: 1 }] });
  push("return-partial-udhaar", "Partial return: refund first reduces outstanding udhaar", { bill, priorReturns: [], credits: [creditRow], returnLines: [{ productId: "p-sugar", qty: 1 }], saleReturn: r1.ret }, [r1.entry]);
}
// 3 — underpaid by Rs 1 (F-2 tolerance books the difference to sales_discount)
{
  const { bill, entry } = composeBill({ id: "bill-3", billNo: 3, lines: [{ productId: "p-sugar", qty: 1 }], payments: [{ method: "cash", amount: 144 }] });
  push("bill-underpay-tolerance", "Bill underpaid by Rs 1 — rounding booked to sales_discount (Dr)", { bill }, [entry]);
}
// 4 — overpaid by Rs 1
{
  const { bill, entry } = composeBill({ id: "bill-4", billNo: 4, lines: [{ productId: "p-sugar", qty: 1 }], payments: [{ method: "cash", amount: 146 }] });
  push("bill-overpay-tolerance", "Bill overpaid by Rs 1 — rounding booked to sales_discount (Cr)", { bill }, [entry]);
}
// 5 — exclusive-taxed bill, then item-by-item returns reversing tax to the paisa
{
  const { bill, entry } = composeBill({ id: "bill-5", billNo: 5, lines: [{ productId: "p-oil", qty: 2 }], payments: [{ method: "cash", amount: 2808 }] });
  push("bill-tax-exclusive", "Exclusive GST 17%: tax added on top, credited to tax_payable", { bill }, [entry]);
  const r1 = composeReturn({ bill, priorReturns: [], credits: [], lines: [{ productId: "p-oil", qty: 1 }] });
  const billAfter1 = { ...bill, returnedQty: { "p-oil": 1 } };
  const r2 = composeReturn({ bill: billAfter1, priorReturns: [r1.ret], credits: [], lines: [{ productId: "p-oil", qty: 1 }] });
  push("return-taxed-item-by-item", "Taxed bill returned item-by-item: tax reverses to the paisa across two returns",
    { bill, steps: [{ bill, priorReturns: [], returnLines: [{ productId: "p-oil", qty: 1 }] }, { bill: billAfter1, priorReturns: [r1.ret], returnLines: [{ productId: "p-oil", qty: 1 }] }], saleReturns: [r1.ret, r2.ret] },
    [r1.entry, r2.entry]);
}
// 6 — inclusive-taxed bill (wallet payment)
{
  const { bill, entry } = composeBill({ id: "bill-6", billNo: 6, lines: [{ productId: "p-ghee", qty: 1 }], payments: [{ method: "jazzcash", amount: 1170 }] });
  push("bill-tax-inclusive", "Inclusive GST 17%: revenue credited net of embedded tax", { bill }, [entry]);
}
// 7 — counter sale, untaxed
{
  const { entry } = composeCounterSale({ id: "sale-1", productId: "p-sugar", qty: 3 });
  push("counter-sale", "Counter sale, cash, untaxed", { sale: { id: "sale-1", productId: "p-sugar", qty: 3 } }, [entry]);
}
// 8 — counter sale of a raw-class product (COGS credits inventory_raw)
{
  const { entry } = composeCounterSale({ id: "sale-2", productId: "p-raw", qty: 2 });
  push("counter-sale-raw", "Counter sale of raw-class product: inventory_raw leg", { sale: { id: "sale-2", productId: "p-raw", qty: 2 } }, [entry]);
}
// 10 — purchase, untaxed (perpetual clearing nets zero)
{
  const { purchase, entry } = composePurchase({ id: "pur-1", supplierId: supplier.id, lines: [{ productId: "p-tea", qty: 10, unitCost: 800 }] });
  push("purchase-untaxed", "Purchase on supplier credit: purchases clearing nets zero", { purchase }, [entry]);
}
// 11 — purchase with exclusive input tax + a raw line (class split on net bases)
{
  const { purchase, entry } = composePurchase({ id: "pur-2", supplierId: supplier.id, lines: [{ productId: "p-oil", qty: 5, unitCost: 1000 }, { productId: "p-raw", qty: 4, unitCost: 500 }] });
  push("purchase-taxed-mixed", "Purchase: exclusive input tax to tax_input; raw share to inventory_raw", { purchase }, [entry]);
}
// 12 — udhaar repayment in cash
{
  const entry = L.makeEntry(`Udhaar repayment — ${customer.name}`, "repayment", "cr-repay-1", [
    { account: L.accountForMethod("cash"), debit: 300, credit: 0, ref: resolveAccountId("cash") },
    { account: "receivables", debit: 0, credit: 300, ref: customer.id },
  ], { ts: "2026-10-22T12:00:00.000Z" });
  push("repayment-cash", "Udhaar repayment received in cash", { creditRow: { id: "cr-repay-1", customerId: customer.id, customerName: customer.name, customerPhone: customer.phone, kind: "repayment", amount: 300, method: "cash", accountId: "acct-till", billId: null, dayOffset: 0, ts: "2026-10-22T12:00:00.000Z" } }, [entry]);
}
// 13 — standalone udhaar (cash loan): Dr receivables / Cr cash, never revenue
{
  const entry = L.makeEntry(`Udhaar (cash loan) — ${customer.name}`, "credit", "cr-loan-1", [
    { account: "receivables", debit: 2000, credit: 0, ref: customer.id },
    { account: "cash", debit: 0, credit: 2000, ref: resolveAccountId("cash") },
  ], { ts: "2026-10-22T12:05:00.000Z" });
  push("credit-given-standalone", "Standalone udhaar is a cash loan out of the till, never revenue", { creditRow: { id: "cr-loan-1", customerId: customer.id, customerName: customer.name, customerPhone: customer.phone, kind: "credit", amount: 2000, billId: null, dayOffset: 0, ts: "2026-10-22T12:05:00.000Z" } }, [entry]);
}
// 14 — bill whose lines mix goods + raw (COGS class split)
{
  const { bill, entry } = composeBill({ id: "bill-7", billNo: 7, lines: [{ productId: "p-tea", qty: 1 }, { productId: "p-raw", qty: 2 }], payments: [{ method: "cash", amount: 2250 }] });
  push("bill-mixed-class", "Bill with goods + raw lines: COGS credit splits by class", { bill }, [entry]);
}

/* ---------------- self-checks ---------------- */

const all = scenarios.flatMap((s) => s.entries);
let failures = 0;
const tb = {};
for (const e of all) for (const l of e.lines) tb[l.account] = (tb[l.account] ?? 0) + l.debit - l.credit;
const tbTotal = Object.values(tb).reduce((a, n) => a + n, 0);
if (Math.abs(tbTotal) > 0.009) { console.error(`FIXTURE SELF-CHECK FAILED: trial balance ${tbTotal}`); failures++; }
for (const s of scenarios) {
  const pur = s.entries.filter((e) => e.refType === "purchase");
  for (const e of pur) {
    const net = e.lines.filter((l) => l.account === "purchases").reduce((a, l) => a + l.debit - l.credit, 0);
    if (Math.abs(net) > 0.009) { console.error(`FIXTURE SELF-CHECK FAILED: ${s.id} purchases clearing ${net}`); failures++; }
  }
}
if (failures) process.exit(1);

const out = {
  version: 1,
  source: "web/lib via harness/out (makeEntry, tax, ledger) + StoreProvider template transcriptions",
  accounts, products, slabs, settings: noTaxSettings, customer, supplier,
  scenarios,
};
const dir = path.join(__dirname, "fixtures");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "f1-core.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`fixtures: ${scenarios.length} scenarios, ${all.length} entries, trial balance ${tbTotal} — wrote fixtures/f1-core.json`);
