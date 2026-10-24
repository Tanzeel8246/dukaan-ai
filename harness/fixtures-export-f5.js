/**
 * Golden-fixture export for ERP Phase F · F5 (design §9 F5
 * checkpoint: "a scripted week-in-the-life — mixed postings from
 * web + Android + Windows — ends with TB == 0 and every
 * cross-checked figure identical on all clients to the rupee").
 *
 * ONE evolving shop, SEVEN trading days (Mon 2026-09-07 →
 * Sun 2026-09-13), SIXTEEN posting events whose `client` tags
 * alternate web/app — including the cross-client moments that are
 * the phase's thesis: a bill composed on the APP is returned on
 * the WEB; a salary advance given on the WEB is absorbed by a run
 * finalised on the WEB and PAID from the APP; production labour
 * accrued from an APP issue settles through the run as the
 * unassigned bucket. Every entry is composed here through the REAL
 * compiled web/lib functions (+ StoreProvider template
 * transcriptions copied from the F1/F2 exporters, the established
 * pattern); the Dart suite (test/f5_week_test.dart) re-composes
 * every APP-tagged entry with the Dart composers and asserts
 * byte-for-byte equality, then merges the whole journal and
 * asserts the cross-client identities:
 *
 *   trial balance == 0 (after every event, and at week end)
 *   P&L net revenue == sales-report net revenue (before AND
 *     after the FY-close drill — the §4.6 identity)
 *   salary_payable GL == Σ employee positions + unassigned bucket
 *     at five checkpoints, ending at exactly 0
 *   stock: Σ level rows + in-transit == product stockQty for
 *     every product; inventory GL movement == the shelf value
 *     delta (produced blend valued at its absorbed unit cost)
 *   receivables GL == credits subledger; payables GL == supplier
 *     subledger
 *   the FY-close drill entry == FI.buildFiscalClosingEntry over
 *     the merged journal; retained_earnings afterwards == the
 *     pre-close P&L net (a loss — the fixture FY contains only
 *     this week, so one month of salaries outweighs seven days
 *     of sales; the identities, not the sign, are the assertion)
 *
 * Dev-only tooling — no app behaviour changes. Companions
 * fixtures-export{,-f2,-f3,-f4}.js are untouched; their outputs
 * must stay byte-stable.
 *
 * Run AFTER the harness compile:
 *   cd ../web && npx tsc -p ../harness/tsconfig.json
 *   node ../harness/harness.js            (must stay ALL SUITES GREEN)
 *   node ../harness/fixtures-export-f5.js (writes fixtures/f5-week.json)
 */
"use strict";
const fs = require("fs");
const path = require("path");

const L = require("./out/ledger.js");
const T = require("./out/tax.js");
const ST = require("./out/stock.js");
const TR = require("./out/transfers.js");
const PR = require("./out/production.js");
const PA = require("./out/payroll.js");
const FI = require("./out/fiscal.js");
const PE = require("./out/periods.js");
const round2 = T.round2;

/* ---------------- fixture shop (the F1 shop, grown) ---------------- */

const f1 = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "f1-core.json"), "utf8")
);
const accounts = f1.accounts;
const slabs = f1.slabs;
const noTaxSettings = { defaultSalesTaxSlabId: null, defaultPurchaseTaxSlabId: null };
const customer = f1.customer;
const supplier = f1.supplier;
const openingProducts = [
  ...f1.products,
  { id: "p-pack", name: "Packing Box", salePrice: 40, costPrice: 20, stockQty: 100, reorderLevel: 10, stockClass: null },
  { id: "p-blend", name: "House Tea Blend 500g", salePrice: 950, costPrice: 0, stockQty: 0, reorderLevel: 5, stockClass: null },
];
const byId0 = new Map(openingProducts.map((p) => [p.id, p]));
const warehouses = [
  { id: "wh-main", name: "Main Warehouse", note: "", isDefault: true, archived: false, sortOrder: 0, ts: "2026-01-01T00:00:00.000Z" },
  { id: "wh-godown", name: "Godown — Shahdara", note: "", isDefault: false, archived: false, sortOrder: 1, ts: "2026-01-01T00:00:00.000Z" },
];
const bomV1 = {
  id: "bom-1", outputProductId: "p-blend", outputName: "House Tea Blend 500g",
  outputQty: 10, version: 1,
  lines: [
    { productId: "p-raw", name: "Raw Tea Leaf 1kg", qty: 8 },
    { productId: "p-sugar", name: "Sugar 1kg", qty: 2 },
    { productId: "p-pack", name: "Packing Box", qty: 10 },
  ],
  labourCost: 300, overheadCost: 100, active: true, note: "", ts: "2026-01-02T00:00:00.000Z",
};
const employees = [
  { id: "emp-a", name: "Muhammad Aslam", phone: "03011111111", designation: "Counter in-charge", linkedUserEmail: null, joinDateISO: "2025-03-01", payBasis: "monthly", baseAmount: 30000, allowances: [{ label: "Transport", amount: 2000 }], paidLeaveDays: 2, active: true, note: "", ts: "2026-01-05T09:00:00.000Z" },
  { id: "emp-b", name: "Bilal Ahmed", phone: "03022222222", designation: "Loader", linkedUserEmail: null, joinDateISO: "2026-01-10", payBasis: "daily", baseAmount: 800, allowances: [], paidLeaveDays: 0, active: true, note: "", ts: "2026-01-05T09:00:00.000Z" },
];
const daysOf = (marks) => {
  const out = {};
  let d = 1;
  for (const [mark, count] of marks) for (let i = 0; i < count; i++) out[String(d++)] = mark;
  return out;
};
const attendance = [
  { id: PA.attendanceDocId("emp-a", "2026-08"), employeeId: "emp-a", month: "2026-08", days: daysOf([["present", 26], ["absent", 2], ["half", 1], ["leave", 2]]), ts: "2026-08-31T18:00:00.000Z" },
  { id: PA.attendanceDocId("emp-b", "2026-08"), employeeId: "emp-b", month: "2026-08", days: daysOf([["present", 22], ["half", 4], ["absent", 5]]), ts: "2026-08-31T18:00:00.000Z" },
];
const SETTINGS = { shopName: "Madina General Store", fiscalYearStartMonth: 7, fiscalYearStartDay: 1 };

/* ------- template transcriptions (StoreProvider, via F1/F2) ------- */

const resolveAccountId = (method) => {
  const a = L.defaultAccountForMethod(accounts, method);
  return a ? a.id : null;
};
let products = openingProducts.map((p) => ({ ...p }));
const prod = (id) => products.find((p) => p.id === id);

function composeBill({ id, billNo, customerId = null, customerName = "", customerPhone = "", lines, discountType = "flat", discountValue = 0, payments, ts }) {
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
    total: taxed.total, payments: [], status: "paid", returnedQty: {}, dayOffset: 0, ts,
  };
  const costTotal = items.reduce((a, i) => a + i.qty * i.unitCost, 0);
  const stampedPayments = payments.map((p) => ({
    method: p.method, amount: p.amount,
    accountId: p.method === "credit" ? null : resolveAccountId(p.method),
  }));
  bill.payments = stampedPayments;
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

function composeCounterSale({ id, productId, qty, ts }) {
  const p = prod(productId);
  const total = qty * p.salePrice;
  const ct = T.computeBillTaxes([{ total, qty, slab: T.resolveTaxSlab(p, slabs, noTaxSettings, "sales") }], 0);
  const entry = L.makeEntry(`Counter sale — ${p.name} × ${qty}`, "sale", id, [
    { account: "cash", debit: total + ct.exclusiveTax, credit: 0, ref: resolveAccountId("cash") },
    { account: "cogs", debit: qty * p.costPrice, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: ct.inclusiveTax > 0 ? round2(total - ct.inclusiveTax) : total },
    ...(ct.taxAmount > 0 ? [{ account: "tax_payable", debit: 0, credit: ct.taxAmount }] : []),
    { account: p.stockClass === "raw" ? "inventory_raw" : "inventory", debit: 0, credit: qty * p.costPrice },
  ], { ts });
  const sale = {
    id, productId, qty, unitPrice: p.salePrice, unitCost: p.costPrice,
    billId: null, kind: "sale", total, dayOffset: 0, ts,
  };
  return { entry, sale };
}

function composePurchase({ id, supplierId, lines, ts }) {
  const items = lines.map((l) => {
    const p = prod(l.productId);
    return { productId: p.id, name: p.name, qty: l.qty, unitCost: l.unitCost, total: l.qty * l.unitCost };
  });
  const pt = T.computePurchaseTaxes(items.map((it) => ({ total: it.total, qty: it.qty, slab: T.resolveTaxSlab(prod(it.productId), slabs, noTaxSettings, "purchases") })));
  items.forEach((it, i) => {
    it.taxAmount = pt.lines[i].taxAmount;
    it.taxSlabId = pt.lines[i].slab ? pt.lines[i].slab.id : null;
    it.taxSlabName = pt.lines[i].slab ? pt.lines[i].slab.name : null;
    it.taxRate = pt.lines[i].slab ? pt.lines[i].slab.rate : 0;
    it.taxKind = pt.lines[i].slab ? pt.lines[i].slab.kind : "percent";
    it.taxInclusive = pt.lines[i].slab ? pt.lines[i].slab.inclusive : false;
  });
  const rawNetShare = items.reduce((a, it, i) => a + (prod(it.productId).stockClass === "raw" ? (pt.lines[i]?.base ?? 0) : 0), 0);
  const purchase = { id, supplierId, items, total: pt.grossTotal, netTotal: pt.netTotal, taxAmount: pt.taxAmount, note: "", dayOffset: 0, ts };
  const entry = L.makeEntry(`Purchase — stock received`, "purchase", id, [
    { account: "purchases", debit: pt.netTotal, credit: 0 },
    ...(pt.taxAmount > 0 ? [{ account: "tax_input", debit: pt.taxAmount, credit: 0 }] : []),
    ...L.classLegLines(pt.netTotal, rawNetShare, "debit"),
    { account: "purchases", debit: 0, credit: pt.netTotal },
    { account: "payables", debit: 0, credit: pt.grossTotal, ref: supplierId },
  ], { ts });
  return { purchase, entry };
}

function composeReturn({ bill, priorReturns, credits, lines, refundMethod = "cash", ts }) {
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
  const entry = L.makeEntry(`Return against Bill #${bill.billNo}`, "return", bill.id, linesJ, { ts });
  const ret = {
    id: `ret-${bill.id}-1`, billId: bill.id, billNo: bill.billNo,
    items: retItems, refundAmount: cashRefund, creditReduction, method: refundMethod,
    accountId: refundAccountId, dayOffset: 0, ts,
  };
  return { entry, ret };
}

/* ---------------- evolving shop state ---------------- */

const J = [];               // the merged journal, in event order
const events = [];          // fixture event records
const labelByRawId = new Map(); // entry raw id → fixture label (e01…)
let levels = openingProducts.map((p) => ST.makeLevel("wh-main", p.id, p.stockQty));
const credits = [];
const bills = [];
const saleReturns = [];
const sales = [];
const purchases = [];
const supplierPayments = [];
const expenses = [];

let failures = 0;
function check(cond, msg) {
  if (!cond) { failures++; console.error(`SELF-CHECK FAILED: ${msg}`); }
}
const near = (a, b) => Math.abs(a - b) <= 0.001;

function normEntry(e, label) {
  return {
    id: label, ts: e.ts, dayOffset: e.dayOffset ?? 0, dateISO: e.dateISO ?? null,
    memo: e.memo, refType: e.refType, refId: e.refId, reversesId: e.reversesId ?? null,
    originDevice: e.originDevice ?? null,
    lines: e.lines.map((l) => ({ account: l.account, debit: l.debit, credit: l.credit, ref: l.ref ?? null })),
  };
}
function tbTotal(entries) {
  const tb = {};
  for (const e of entries) for (const l of e.lines) tb[l.account] = (tb[l.account] ?? 0) + l.debit - l.credit;
  return Object.values(tb).reduce((a, n) => a + n, 0);
}
function compJson(entries) {
  const c = PA.salaryPayableComposition(entries);
  return {
    glBalance: c.glBalance, employees: c.employees,
    owedToEmployees: c.owedToEmployees,
    advancesOutstanding: c.advancesOutstanding,
    unassignedAccrued: c.unassignedAccrued,
  };
}
function stockDelta(productId, delta) {
  products = products.map((p) => (p.id === productId ? { ...p, stockQty: p.stockQty + delta } : p));
}
function levelDelta(warehouseId, productId, delta) {
  levels = ST.applyLevelDelta(levels, warehouseId, productId, delta);
  stockDelta(productId, delta);
}

/** Production events cite their entry by raw id + carry a
 *  wall-clock ts; normalise to the fixture label, ts dropped
 *  (the F3 pattern). */
function normProdEvent(ev) {
  return {
    kind: ev.kind, qty: ev.qty,
    lines: ev.lines ?? null,
    labourCost: ev.labourCost ?? null, overheadCost: ev.overheadCost ?? null,
    paidFromAccountId: ev.paidFromAccountId ?? null,
    value: ev.value, entryId: labelByRawId.get(ev.entryId) ?? "EXT",
  };
}

/** Record one posting event; asserts the running TB stays 0. */
function post({ day, client, kind, title, entry, docs = {}, originDevice = null }) {
  if (originDevice) entry.originDevice = originDevice;
  const label = `e${String(J.length + 1).padStart(2, "0")}`;
  labelByRawId.set(entry.id, label);
  J.push(entry);
  check(near(tbTotal(J), 0), `${label} ${kind}: running trial balance after event`);
  events.push({ seq: events.length + 1, day, client, kind, title, entry: normEntry(entry, label), docs });
  return label;
}

/* ================= Day 1 — Mon 2026-09-07 ================= */

// e01 · WEB · purchase: tea +10, raw leaf +10, packing +20 (untaxed).
{
  const { purchase, entry } = composePurchase({
    id: "pur-w1", supplierId: supplier.id,
    lines: [
      { productId: "p-tea", qty: 10, unitCost: 800 },
      { productId: "p-raw", qty: 10, unitCost: 500 },
      { productId: "p-pack", qty: 20, unitCost: 20 },
    ],
    ts: "2026-09-07T09:00:00.000Z",
  });
  post({ day: 1, client: "web", kind: "purchase", title: "Purchase from Lahore Tea Co — tea, raw leaf, packing", entry, docs: { purchase } });
  purchases.push(purchase);
  levelDelta("wh-main", "p-tea", 10);
  levelDelta("wh-main", "p-raw", 10);
  levelDelta("wh-main", "p-pack", 20);
}

// e02 · APP · counter sale: sugar ×3 cash.
{
  const { entry, sale } = composeCounterSale({ id: "sale-w1", productId: "p-sugar", qty: 3, ts: "2026-09-07T11:00:00.000Z" });
  post({ day: 1, client: "app", kind: "counter_sale", title: "Counter sale — Sugar 1kg × 3", entry, docs: { sale: { id: "sale-w1", productId: "p-sugar", qty: 3 } }, originDevice: "Counter Tablet" });
  sales.push(sale);
  levelDelta("wh-main", "p-sugar", -3);
}

/* ================= Day 2 — Tue 2026-09-08 ================= */

// e03 · APP · bill #101: tea ×2 + oil ×1 (exclusive GST), cash 2,504 + udhaar 1,000.
let billW1, creditRowW1;
{
  const r = composeBill({
    id: "bill-w1", billNo: 101, customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
    lines: [{ productId: "p-tea", qty: 2 }, { productId: "p-oil", qty: 1 }],
    payments: [{ method: "cash", amount: 2504 }, { method: "credit", amount: 1000 }],
    ts: "2026-09-08T10:00:00.000Z",
  });
  billW1 = r.bill; creditRowW1 = r.creditRow;
  check(billW1.total === 3504, `bill-w1 total 3,504 (got ${billW1.total})`);
  post({ day: 2, client: "app", kind: "bill", title: "Bill #101 — Ahmed Traders, part udhaar", entry: r.entry, docs: { bill: billW1, creditRow: creditRowW1 }, originDevice: "Counter Tablet" });
  bills.push(billW1);
  credits.push(creditRowW1);
  // The desk's per-item sale rows (StoreProvider.postBill shape).
  billW1.items.forEach((it, i) => sales.push({
    id: `${billW1.id}-s${i}`, productId: it.productId, qty: it.qty,
    unitPrice: it.unitPrice, unitCost: it.unitCost, total: it.total,
    billId: billW1.id, kind: "sale", dayOffset: 0, ts: billW1.ts,
  }));
  levelDelta("wh-main", "p-tea", -2);
  levelDelta("wh-main", "p-oil", -1);
}

// e04 · WEB · salary advance: emp-a, Rs 5,000 cash from the till.
{
  const entry = PA.buildSalaryAdvanceEntry({ employeeId: "emp-a", name: "Muhammad Aslam", amount: 5000, method: "cash", accountId: "acct-till", ts: "2026-09-08T12:00:00.000Z" });
  post({ day: 2, client: "web", kind: "salary_advance", title: "Salary advance — Muhammad Aslam", entry,
    docs: { input: { employeeId: "emp-a", name: "Muhammad Aslam", amount: 5000, method: "cash", accountId: "acct-till", ts: "2026-09-08T12:00:00.000Z" } } });
}
const checkpointAfterAdvance = compJson(J);

/* ================= Day 3 — Wed 2026-09-09 ================= */

// e05 · APP · udhaar repayment: Ahmed Traders repays Rs 500 cash.
{
  const row = {
    id: "cr-repay-w1", customerId: customer.id, customerName: customer.name,
    customerPhone: customer.phone, kind: "repayment", amount: 500,
    note: "Part repayment", method: "cash", accountId: "acct-till", billId: null,
    dayOffset: 0, ts: "2026-09-09T10:00:00.000Z",
  };
  const entry = L.makeEntry(`Udhaar repayment — ${customer.name}`, "repayment", row.id, [
    { account: L.accountForMethod("cash"), debit: 500, credit: 0, ref: resolveAccountId("cash") },
    { account: "receivables", debit: 0, credit: 500, ref: customer.id },
  ], { ts: row.ts });
  post({ day: 3, client: "app", kind: "repayment", title: "Udhaar repayment — Ahmed Traders Rs 500", entry, docs: { creditRow: row }, originDevice: "Owner Phone" });
  credits.push(row);
}

// e06 · WEB · return against the APP's bill #101: oil ×1 — the
// refund first eats the remaining udhaar (500), the rest is cash.
let retW1;
{
  const r = composeReturn({
    bill: billW1, priorReturns: [], credits: [...credits],
    lines: [{ productId: "p-oil", qty: 1 }], ts: "2026-09-09T12:00:00.000Z",
  });
  retW1 = r.ret;
  check(retW1.creditReduction === 500 && retW1.refundAmount === 904,
    `return-w1 figures: creditReduction 500 / cash refund 904 (got ${retW1.creditReduction}/${retW1.refundAmount})`);
  post({ day: 3, client: "web", kind: "return", title: "Return against Bill #101 — Cooking Oil 5L × 1", entry: r.entry,
    docs: { bill: billW1, priorReturns: [], credits: [...credits], returnLines: [{ productId: "p-oil", qty: 1 }], saleReturn: retW1 } });
  saleReturns.push(retW1);
  // The desk's return side-effects (StoreProvider.postReturn): a
  // negative sale row per returned item + a negative credit row
  // reversing the eaten udhaar.
  retW1.items.forEach((it, i) => sales.push({
    id: `${retW1.id}-s${i}`, productId: it.productId, qty: it.qty,
    unitPrice: it.unitPrice, unitCost: it.unitCost, total: -it.total,
    billId: billW1.id, kind: "return", dayOffset: 0, ts: retW1.ts,
  }));
  if (retW1.creditReduction > 0) credits.push({
    id: "cr-ret-bill-w1", customerId: billW1.customerId, customerName: billW1.customerName,
    customerPhone: billW1.customerPhone, kind: "credit", amount: -retW1.creditReduction,
    note: `Return on Bill #${billW1.billNo} — udhaar reduced`, billId: billW1.id,
    dayOffset: 0, ts: retW1.ts,
  });
  billW1 = { ...billW1, returnedQty: { "p-oil": 1 } };
  bills[0] = billW1;
  levelDelta("wh-main", "p-oil", 1);
}

/* ================= Day 4 — Thu 2026-09-10 ================= */

// e07 · APP · transfer TR-1: sugar ×10 main → godown; 9 arrive;
// close-short posts the ONLY transfer entry (Rs 130 loss).
let transferFinal;
{
  const dispatched = {
    id: "tr-w1", number: "TR-1", fromWarehouseId: "wh-main", toWarehouseId: "wh-godown",
    lines: [{ productId: "p-sugar", name: "Sugar 1kg", qtySent: 10, qtyReceived: 0 }],
    note: "", status: "dispatched", dayOffset: 0, ts: "2026-09-10T09:00:00.000Z",
  };
  levels = ST.applyLevelDelta(levels, "wh-main", "p-sugar", -10); // dispatch: rows only, total unchanged
  const received = {
    ...dispatched,
    lines: [{ productId: "p-sugar", name: "Sugar 1kg", qtySent: 10, qtyReceived: 9 }],
    status: "partially_received",
  };
  levels = ST.applyLevelDelta(levels, "wh-godown", "p-sugar", 9); // receive: rows only
  const shortages = TR.transferShortages(received);
  const entry = TR.buildTransferLossEntry(received, shortages, new Map(products.map((p) => [p.id, p])));
  if (!entry) throw new Error("week: transfer loss entry composed null");
  entry.ts = "2026-09-10T09:30:00.000Z"; // the lib builder stamps wall-clock; pin it
  transferFinal = { ...received, status: "received" }; // the store's close label (§2.3)
  post({ day: 4, client: "app", kind: "transfer_close_short", title: "Transfer TR-1 close-short — 1 kg sugar lost on the road", entry,
    docs: { transfer: received, shortages, lossValue: TR.transferLossValue(shortages, new Map(products.map((p) => [p.id, p]))) },
    originDevice: "Counter Tablet" });
  stockDelta("p-sugar", -1); // totalDrops: the missing unit leaves the product total
}

// e08 · WEB · expense: shop rent Rs 5,000 cash.
{
  const row = { id: "exp-w1", category: "rent", amount: 5000, method: "cash", accountId: "acct-till", note: "September rent", dayOffset: 0, ts: "2026-09-10T13:00:00.000Z" };
  const entry = L.makeEntry(`Expense — rent`, "expense", row.id, [
    { account: "expense_rent", debit: 5000, credit: 0 },
    { account: L.accountForMethod("cash"), debit: 0, credit: 5000, ref: row.accountId },
  ], { ts: row.ts, dayOffset: 0 });
  post({ day: 4, client: "web", kind: "expense", title: "Expense — September rent", entry, docs: { expense: row } });
  expenses.push(row);
}

/* ================= Day 5 — Fri 2026-09-11 ================= */

// e09 · APP · production PR-1 issue: the BOM batch for 10 blends;
// labour + overhead ACCRUE to the salary_payable bucket.
let orderW1, poolAfterIssue = null, completionUnitCost = null;
{
  let order = {
    id: "pr-w1", number: "PR-1", bomId: bomV1.id, bomVersion: 1,
    bomSnapshot: PR.snapshotOfBom(bomV1),
    outputProductId: "p-blend", outputName: "House Tea Blend 500g",
    warehouseId: "wh-main", plannedQty: 10, events: [], note: "", status: "open",
    dayOffset: 0, ts: "2026-09-11T09:00:00.000Z",
  };
  const input = {
    runQty: 10, lines: PR.defaultIssueLines({ bomSnapshot: order.bomSnapshot }, 10),
    labourCost: 300, overheadCost: 100, settlement: "accrue",
  };
  const levelsBefore = levels.map((l) => ({ ...l }));
  const res = PR.prepareIssue(order, products, levels, warehouses, accounts, input);
  if ("problem" in res) throw new Error(`week issue refused: ${res.problem}`);
  res.prepared.entry.ts = "2026-09-11T09:05:00.000Z";
  post({ day: 5, client: "app", kind: "production_issue", title: "Production PR-1 — issue materials for 10 blends (labour accrued)", entry: res.prepared.entry,
    docs: { orderBefore: order, input, levelsBefore }, originDevice: "Owner Phone" });
  order = { ...order, events: [...order.events, res.prepared.event] };
  order = { ...order, status: PR.deriveProductionStatus(order) };
  poolAfterIssue = PR.poolOf(order);
  check(poolAfterIssue === 4860, `pool after issue 4,860 (got ${poolAfterIssue})`);
  levelDelta("wh-main", "p-raw", -8);
  levelDelta("wh-main", "p-sugar", -2);
  levelDelta("wh-main", "p-pack", -10);
  orderW1 = order;
}
const checkpointAfterIssue = compJson(J);
check(checkpointAfterIssue.unassignedAccrued === 400, "bucket holds the accrued 400 after the issue");

// e10 · APP · production completion: 10 blends — pool → exactly 0.
{
  const orderBefore = orderW1;
  const res = PR.completionAbsorb(orderBefore, 10, false);
  if ("problem" in res) throw new Error(`week completion refused: ${res.problem}`);
  const entry = PR.buildCompletionEntry(orderBefore, 10, res.value);
  entry.ts = "2026-09-11T15:00:00.000Z";
  post({ day: 5, client: "app", kind: "production_completion", title: "Production PR-1 — 10 blends completed, pool absorbed", entry,
    docs: { orderBefore: { ...orderBefore, events: orderBefore.events.map(normProdEvent) }, qty: 10, final: false, value: res.value, unitCost: res.unitCost }, originDevice: "Owner Phone" });
  completionUnitCost = res.unitCost;
  const event = { kind: "completion", qty: 10, value: res.value, entryId: entry.id, dayOffset: 0, ts: "2026-09-11T15:00:00.000Z" };
  orderW1 = { ...orderBefore, events: [...orderBefore.events, event] };
  orderW1 = { ...orderW1, status: PR.deriveProductionStatus(orderW1) };
  check(PR.poolOf(orderW1) === 0, `pool after completion is exactly 0 (got ${PR.poolOf(orderW1)})`);
  levelDelta("wh-main", "p-blend", 10);
}

/* ================= Day 6 — Sat 2026-09-12 ================= */

// e11 · WEB · payroll PAY-1 for August: ONE net accrual entry.
let runW1;
{
  const lines = PA.buildRunLines(employees, attendance, "2026-08");
  const totals = PA.payrollRunTotals(lines);
  let run = {
    id: "run-w1", number: "PAY-1", month: "2026-08", lines, totals, payments: [],
    accrualEntryId: null, status: "draft", note: "", dayOffset: 0, ts: "2026-09-12T19:00:00.000Z",
  };
  const runDraft = { ...run };
  const accrual = PA.buildPayrollAccrualEntry(run, { ts: "2026-09-12T19:05:00.000Z" });
  if (!accrual) throw new Error("week: accrual composed null");
  post({ day: 6, client: "web", kind: "payroll_accrual", title: "Payroll PAY-1 — August accrual (net per employee)", entry: accrual, docs: { runDraft } });
  // Keep the RAW accrual id on the working run: runLineFigures
  // resolves positions through it. Labels are applied at export.
  run = { ...run, status: "posted", accrualEntryId: accrual.id };
  runW1 = run;
}
const checkpointAfterAccrual = compJson(J);

// e12 · APP · pay emp-a the still-owed remainder (advance absorbed).
{
  const line = runW1.lines.find((l) => l.employeeId === "emp-a");
  const fig = PA.runLineFigures(J, runW1, line);
  check(fig.advanceBefore === 5000 && fig.advanceRecovered === 5000, `emp-a figures absorb the advance (before ${fig.advanceBefore}, recovered ${fig.advanceRecovered})`);
  const input = { employeeId: "emp-a", name: "Muhammad Aslam", amount: fig.stillOwed, method: "cash", accountId: "acct-till", ts: "2026-09-12T19:30:00.000Z" };
  const entry = PA.buildPayrollPaymentEntry({ run: runW1, ...input });
  const runBefore = { ...runW1, payments: runW1.payments.map((p) => ({ ...p })) };
  const label = post({ day: 6, client: "app", kind: "payroll_payment", title: "Salary paid — Muhammad Aslam (August remainder)", entry, docs: { input, runBefore }, originDevice: "Owner Phone" });
  runW1 = { ...runW1, payments: [...runW1.payments, { employeeId: "emp-a", name: "Muhammad Aslam", amount: input.amount, method: "cash", accountId: "acct-till", entryId: entry.id, dayOffset: 0, ts: input.ts }] };
}

// e13 · APP · pay emp-b in full, by bank (wallet bucket).
{
  const line = runW1.lines.find((l) => l.employeeId === "emp-b");
  const fig = PA.runLineFigures(J, runW1, line);
  const input = { employeeId: "emp-b", name: "Bilal Ahmed", amount: fig.stillOwed, method: "bank", accountId: "acct-wallet", ts: "2026-09-12T19:35:00.000Z" };
  check(input.amount === 19200, `emp-b still owed 19,200 (got ${input.amount})`);
  const entry = PA.buildPayrollPaymentEntry({ run: runW1, ...input });
  const runBefore = { ...runW1, payments: runW1.payments.map((p) => ({ ...p })) };
  const label = post({ day: 6, client: "app", kind: "payroll_payment", title: "Salary paid — Bilal Ahmed (August, by bank)", entry, docs: { input, runBefore }, originDevice: "Owner Phone" });
  runW1 = { ...runW1, payments: [...runW1.payments, { employeeId: "emp-b", name: "Bilal Ahmed", amount: input.amount, method: "bank", accountId: "acct-wallet", entryId: entry.id, dayOffset: 0, ts: input.ts }] };
}
const checkpointAfterPayments = compJson(J);
check(checkpointAfterPayments.glBalance === 400, `after run payments only the bucket remains (got ${checkpointAfterPayments.glBalance})`);

/* ================= Day 7 — Sun 2026-09-13 ================= */

// e14 · APP · settle the unassigned production bucket off PAY-1.
{
  const input = { employeeId: null, name: "Production labour", amount: 400, method: "cash", accountId: "acct-till", ts: "2026-09-13T10:00:00.000Z" };
  const entry = PA.buildPayrollPaymentEntry({ run: runW1, ...input });
  const runBefore = { ...runW1, payments: runW1.payments.map((p) => ({ ...p })) };
  const label = post({ day: 7, client: "app", kind: "payroll_bucket_payment", title: "Production labour bucket settled off PAY-1", entry, docs: { input, runBefore }, originDevice: "Owner Phone" });
  runW1 = { ...runW1, payments: [...runW1.payments, { employeeId: null, name: "Production labour", amount: 400, method: "cash", accountId: "acct-till", entryId: entry.id, dayOffset: 0, ts: input.ts }] };
}
const checkpointFinal = compJson(J);
check(checkpointFinal.glBalance === 0, `salary_payable ends the week at exactly 0 (got ${checkpointFinal.glBalance})`);

// e15 · WEB · supplier payment: Rs 6,000 cash against pur-w1.
{
  const payment = { id: "spay-w1", supplierId: supplier.id, amount: 6000, method: "cash", accountId: "acct-till", voucherNo: "PV-1", note: "Part payment", dayOffset: 0, ts: "2026-09-13T11:00:00.000Z" };
  const entry = L.makeEntry(`Supplier payment`, "supplier_payment", payment.id, [
    { account: "payables", debit: 6000, credit: 0, ref: supplier.id },
    { account: L.accountForMethod("cash"), debit: 0, credit: 6000, ref: payment.accountId },
  ], { ts: payment.ts });
  post({ day: 7, client: "web", kind: "supplier_payment", title: "Supplier payment PV-1 — Lahore Tea Co Rs 6,000", entry, docs: { payment } });
  supplierPayments.push(payment);
}

// e16 · WEB · the FY-close DRILL over FY 2026-27 (the year that
// contains the week): one closing entry to retained earnings.
let fyRange, plBefore, closeSummary;
{
  fyRange = PE.fiscalYearRange(SETTINGS, "2026-09-13T12:00:00.000Z");
  check(fyRange.startDate === "2026-07-01" && fyRange.endDate === "2027-06-30", `FY range is 2026-27 (got ${fyRange.startDate}→${fyRange.endDate})`);
  plBefore = L.profitAndLossInRange(J, fyRange.fromTs, fyRange.toTs);
  const closing = FI.buildFiscalClosingEntry(J, fyRange, "per-fy1");
  if (!closing) throw new Error("week: closing entry composed null");
  closing.ts = "2026-09-13T12:00:00.000Z";
  closeSummary = FI.closingEntrySummary(closing);
  check(near(closeSummary.net, plBefore.net), "closing summary net == pre-close P&L net");
  post({ day: 7, client: "web", kind: "fy_close", title: "FY-close drill — FY 2026-27 closed to retained earnings", entry: closing,
    docs: { periodId: "per-fy1", range: { startDate: fyRange.startDate, endDate: fyRange.endDate, fromTs: fyRange.fromTs, toTs: fyRange.toTs } } });
  const plAfter = L.profitAndLossInRange(J, fyRange.fromTs, fyRange.toTs);
  check(near(plAfter.net, plBefore.net) && near(plAfter.revenue, plBefore.revenue), "§4.6: P&L in range unchanged by the close");
  check(near(L.accountNormalBalance(J, "retained_earnings"), plBefore.net), "retained earnings after the drill == the week's P&L net");
}

/* ---------------- end state + expectations ---------------- */

// Production order with entry ids normalised to journal labels.
const productionOrderFinal = { ...orderW1, events: orderW1.events.map(normProdEvent) };

// Stock identities (TS side): rows + in-transit == stockQty.
const inTransitEnd = Object.fromEntries(TR.inTransitByProduct([transferFinal]));
for (const p of products) {
  const rows = ST.rowsTotal(levels, p.id);
  const transit = inTransitEnd[p.id] ?? 0;
  check(near(rows + transit, p.stockQty), `stock identity ${p.id}: rows ${rows} + transit ${transit} == stockQty ${p.stockQty}`);
}

// Inventory value identity: GL movement == shelf value delta,
// the produced blend valued at its absorbed unit cost.
const unitValue = (p) => (p.id === "p-blend" ? completionUnitCost : p.costPrice);
const shelfValue = (prods, lvls) =>
  prods.reduce((a, p) => a + ST.rowsTotal(lvls, p.id) * unitValue(p), 0);
const openingLevels = openingProducts.map((p) => ST.makeLevel("wh-main", p.id, p.stockQty));
const shelfDelta = shelfValue(products, levels) - shelfValue(openingProducts, openingLevels);
const inventoryGl = L.accountNormalBalance(J, "inventory") + L.accountNormalBalance(J, "inventory_raw");
check(near(inventoryGl, shelfDelta), `inventory GL movement ${inventoryGl} == shelf value delta ${shelfDelta}`);

// Subledger identities.
const receivablesGl = L.accountNormalBalance(J, "receivables");
check(near(receivablesGl, 0), `receivables end at 0 (got ${receivablesGl})`);
const payablesGl = L.accountNormalBalance(J, "payables");
const payablesForSupplier = J.flatMap((e) => e.lines)
  .filter((l) => l.account === "payables" && l.ref === supplier.id)
  .reduce((a, l) => a + l.credit - l.debit, 0);
check(near(payablesGl, payablesForSupplier) && near(payablesGl, 7400), `payables GL == supplier subledger == 7,400 (got ${payablesGl}/${payablesForSupplier})`);

// Purchases clearing nets zero across the week.
{
  const net = J.flatMap((e) => e.lines).filter((l) => l.account === "purchases")
    .reduce((a, l) => a + l.debit - l.credit, 0);
  check(near(net, 0), `purchases clearing nets zero (got ${net})`);
}

// The whole-week trial balance, per account.
const tbMap = {};
for (const e of J) for (const l of e.lines) tbMap[l.account] = round2((tbMap[l.account] ?? 0) + l.debit - l.credit);
check(near(tbTotal(J), 0), "final trial balance is zero");

const relabelRun = (run) => (run == null ? run : {
  ...run,
  accrualEntryId: run.accrualEntryId ? (labelByRawId.get(run.accrualEntryId) ?? run.accrualEntryId) : run.accrualEntryId,
  payments: (run.payments ?? []).map((p) => ({ ...p, entryId: labelByRawId.get(p.entryId) ?? p.entryId })),
});
for (const ev of events) {
  if (ev.docs && ev.docs.runBefore) ev.docs = { ...ev.docs, runBefore: relabelRun(ev.docs.runBefore) };
}

const out = {
  version: 1,
  kind: "week-in-the-life",
  source: "web/lib via harness/out + StoreProvider template transcriptions (F1/F2 pattern); one evolving shop, 2026-09-07 → 2026-09-13",
  shop: {
    accounts, products: openingProducts, slabs, settings: noTaxSettings,
    customer, supplier, warehouses, bom: bomV1, employees, attendance,
    fiscalSettings: SETTINGS,
  },
  opening: { levels: openingLevels },
  events,
  endState: {
    products, levels, credits, bills, returns: saleReturns, sales,
    purchases, supplierPayments, expenses,
    transfer: transferFinal, productionOrder: productionOrderFinal,
    payrollRun: relabelRun(runW1),
    periodDoc: { id: "per-fy1", kind: "fiscal_year", entryId: "e16" },
  },
  checkpoints: {
    salary: {
      afterAdvance: checkpointAfterAdvance,
      afterIssue: checkpointAfterIssue,
      afterAccrual: checkpointAfterAccrual,
      afterPayments: checkpointAfterPayments,
      final: checkpointFinal,
    },
  },
  expect: {
    trialBalance: tbMap,
    glCash: L.accountNormalBalance(J, "cash"),
    glWallet: L.accountNormalBalance(J, "wallet"),
    receivables: receivablesGl,
    creditsOutstandingCust1: credits.filter((c) => c.customerId === "cust-1")
      .reduce((a, c) => a + (c.kind === "credit" ? c.amount : -c.amount), 0),
    payables: payablesGl,
    payablesBySupplier: { [supplier.id]: payablesForSupplier },
    salaryPayable: L.accountNormalBalance(J, "salary_payable"),
    wip: L.accountNormalBalance(J, "wip"),
    inventoryGl,
    inventoryValueDelta: shelfDelta,
    blendUnitCost: completionUnitCost,
    taxPayable: L.accountNormalBalance(J, "tax_payable"),
    retainedEarnings: L.accountNormalBalance(J, "retained_earnings"),
    pnl: { revenue: plBefore.revenue, cogs: plBefore.cogs, expensesTotal: plBefore.expensesTotal, net: plBefore.net },
    fyClose: {
      range: { startDate: fyRange.startDate, endDate: fyRange.endDate, fromTs: fyRange.fromTs, toTs: fyRange.toTs },
      summaryNet: closeSummary.net,
    },
    production: { poolAfterIssue, poolFinal: PR.poolOf(orderW1), producedQty: PR.producedQty(orderW1), unitCost: completionUnitCost },
  },
};

if (failures) { console.error(`${failures} self-check(s) failed — fixture NOT written`); process.exit(1); }
const dir = path.join(__dirname, "fixtures");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "f5-week.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`week fixture: ${events.length} events, ${J.length} entries, trial balance ${tbTotal(J)} — wrote fixtures/f5-week.json`);
