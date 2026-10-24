/**
 * Golden-fixture export for ERP Phase F · F2 (design §8.2, §9 F2:
 * "Fixtures extended to every F2 template; report ≡ screen
 * identities asserted in Dart").
 *
 * Dev-only tooling — no app behaviour changes. Companion to
 * fixtures-export.js (F1, untouched: its output stays byte-stable).
 * This file composes the F2 scenarios through the REAL compiled
 * web/lib functions (makeEntry, cheques line composers, documents
 * derivations, reports builders, selectors), transcribing the
 * StoreProvider F2 templates (recordSupplierPayment,
 * recordPurchaseReturn, addExpense + its F-5 mirror reversal,
 * addCashEntry, transferFunds, recordTaxPayment, the cheque
 * lifecycle, postBill/addRepayment cheque capture, the void
 * engine's cheque handback) line-for-line, and writes canonical
 * JSON the Dart suite asserts against.
 *
 * Run AFTER the harness compile:
 *   cd ../web && npx tsc -p ../harness/tsconfig.json
 *   node ../harness/harness.js            (must stay ALL SUITES GREEN)
 *   node ../harness/fixtures-export-f2.js (writes fixtures/f2-core.json)
 *
 * Self-checks: every entry balances (makeEntry throws otherwise)
 * and the whole F2 fixture journal's trial balance is 0.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const L = require("./out/ledger.js");
const T = require("./out/tax.js");
const C = require("./out/cheques.js");
const D = require("./out/documents.js");
const R = require("./out/reports.js");
const S = require("./out/selectors.js");
const round2 = T.round2;

/* ---------------- fixture shop (F1 shop + a bank account) ---------------- */

const f1 = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "f1-core.json"), "utf8"));
const accounts = [
  ...f1.accounts,
  { id: "acct-bank", name: "Meezan Bank", kind: "bank", method: "bank", legacyFor: null, archived: false, sortOrder: 3, ts: "2026-01-01T00:00:00.000Z" },
];
const products = f1.products;
const slabs = f1.slabs;
const noTaxSettings = { defaultSalesTaxSlabId: null, defaultPurchaseTaxSlabId: null, docSeries: {} };
const customer = f1.customer;
const supplier = f1.supplier;

const resolveAccountId = (method) => {
  const a = L.defaultAccountForMethod(accounts, method);
  return a ? a.id : null;
};
const glFor = (id) => L.glForAccount(accounts.find((a) => a.id === id));
const prod = (id) => products.find((p) => p.id === id);

/* ------- template transcriptions (StoreProvider, verbatim logic) ------- */

/** composeBill with B5 cheque parts (postBill). */
function composeBill({ id, billNo, customerId = null, customerName = "", customerPhone = "", lines, discountType = "flat", discountValue = 0, payments, ts = "2026-10-22T10:00:00.000Z" }) {
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
    total: taxed.total, payments: [], status: "paid", returnedQty: {}, dayOffset: 0,
    ts,
  };
  const costTotal = items.reduce((a, i) => a + i.qty * i.unitCost, 0);
  const stampedPayments = payments.map((p) =>
    p.instrument === "cheque"
      ? { method: p.method, amount: p.amount, accountId: null, instrument: "cheque", chequeId: p.chequeId }
      : { method: p.method, amount: p.amount, accountId: p.method === "credit" ? null : resolveAccountId(p.method) }
  );
  bill.payments = stampedPayments;
  const paidTotal = stampedPayments.reduce((a, p) => a + p.amount, 0);
  const rounding = bill.total - paidTotal;
  const discountDebit = bill.discountAmount + Math.max(0, rounding);
  const billTax = bill.taxAmount ?? 0;
  const inclusiveTax = round2(bill.items.reduce((a, it) => a + (it.taxInclusive ? (it.taxAmount ?? 0) : 0), 0));
  const rawCostShare = items.reduce((a, it) => a + (prod(it.productId).stockClass === "raw" ? it.qty * it.unitCost : 0), 0);
  const linesJ = [
    ...stampedPayments.map((p) =>
      p.instrument === "cheque"
        ? { account: "cheques_in_hand", debit: p.amount, credit: 0, ref: p.chequeId }
        : { account: L.accountForMethod(p.method), debit: p.amount, credit: 0, ref: p.method === "credit" ? bill.customerId : p.accountId }
    ),
    ...(discountDebit > 0 ? [{ account: "sales_discount", debit: discountDebit, credit: 0 }] : []),
    ...(rounding < 0 ? [{ account: "sales_discount", debit: 0, credit: -rounding }] : []),
    { account: "cogs", debit: costTotal, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: inclusiveTax > 0 ? round2(bill.subtotal - inclusiveTax) : bill.subtotal },
    ...(billTax > 0 ? [{ account: "tax_payable", debit: 0, credit: billTax }] : []),
    ...L.classLegLines(costTotal, rawCostShare, "credit"),
  ];
  const entry = L.makeEntry(`Bill #${bill.billNo} — ${bill.customerName || "Walk-in customer"}`, "bill", bill.id, linesJ, { ts: bill.ts });
  const cheques = [];
  for (const p of stampedPayments) {
    if (p.instrument !== "cheque") continue;
    const draft = payments.find((x) => x.chequeId === p.chequeId).cheque;
    cheques.push({
      id: p.chequeId, direction: "in", chequeNo: draft.chequeNo, bankName: draft.bankName,
      amount: p.amount, issueDateISO: draft.issueDateISO, dueDateISO: draft.dueDateISO,
      partyId: bill.customerId, partyName: bill.customerName, partyKind: "customer",
      status: "received", sourceType: "bill", sourceId: bill.id, accountId: null,
      chargesOnBounce: 0, entryIds: { captured: "ENTRY" }, note: "", dayOffset: 0, ts: bill.ts,
    });
  }
  const creditPart = stampedPayments.filter((p) => p.method === "credit").reduce((a, p) => a + p.amount, 0);
  const creditRow = creditPart > 0 ? {
    id: `cr-${bill.id}`, customerId: bill.customerId, customerName: bill.customerName,
    customerPhone: bill.customerPhone, kind: "credit", amount: creditPart,
    note: `Bill #${bill.billNo} — part payment on udhaar`, billId: bill.id, dayOffset: 0, ts: bill.ts,
  } : null;
  return { bill, entry, cheques, creditRow };
}

/** recordPurchase (the F1 transcription, reused for return bases). */
function composePurchase({ id, supplierId, lines, ts = "2026-10-22T09:00:00.000Z" }) {
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

/** The return engine (kind "return") — F1 transcription, reused. */
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
    id: `ret-${bill.id}-note`, billId: bill.id, billNo: bill.billNo,
    items: retItems, refundAmount: cashRefund, creditReduction, method: refundMethod,
    accountId: refundAccountId, dayOffset: 0, ts: entry.ts,
  };
  return { entry, ret };
}

/** recordPurchaseReturn (B4) — full transcription incl. the DN. */
function composePurchaseReturn({ purchase, priorReturns = [], lines, settlement, method = "cash", retId, noteNumber, ts = "2026-10-22T12:30:00.000Z" }) {
  const composed = D.composePurchaseReturnLines(purchase, priorReturns, lines);
  if (!composed) return null;
  const items = D.purchaseReturnItems(purchase, composed);
  const taxShares = T.purchaseReturnTaxShares(purchase, priorReturns, items);
  for (const it of items) it.taxAmount = taxShares.perLine.get(it.productId) ?? 0;
  const srcById = new Map(purchase.items.map((i) => [i.productId, i]));
  const netOf = (it) => (srcById.get(it.productId)?.taxInclusive ? it.total - (it.taxAmount ?? 0) : it.total);
  const netTotal = round2(items.reduce((a, it) => a + netOf(it), 0));
  const rawReturnShare = items.reduce((a, it) => a + (prod(it.productId).stockClass === "raw" ? netOf(it) : 0), 0);
  const taxTotal = taxShares.taxShare;
  const gross = round2(netTotal + taxTotal);
  const refundMethod = settlement === "cash_refund" ? method : null;
  const refundAccountId = refundMethod !== null ? resolveAccountId(refundMethod) : null;
  const ret = {
    id: retId, purchaseId: purchase.id, supplierId: purchase.supplierId, items,
    payableOffset: settlement === "payable_offset" ? gross : 0,
    refundAmount: settlement === "cash_refund" ? gross : 0,
    method: refundMethod, accountId: refundAccountId, dayOffset: 0, ts,
  };
  const entry = L.makeEntry(`Purchase return — goods sent back`, "purchase_return", ret.id, [
    ...(ret.payableOffset > 0 ? [{ account: "payables", debit: ret.payableOffset, credit: 0, ref: purchase.supplierId }] : []),
    ...(ret.refundAmount > 0 && refundMethod ? [{ account: L.accountForMethod(refundMethod), debit: ret.refundAmount, credit: 0, ref: refundAccountId }] : []),
    ...L.classLegLines(netTotal, rawReturnShare, "credit"),
    ...(taxTotal > 0 ? [{ account: "tax_input", debit: 0, credit: taxTotal }] : []),
  ], { ts });
  const figures = D.debitNoteFigures(ret);
  const note = {
    id: `note-${retId}`, number: noteNumber, kind: "debit", returnId: ret.id,
    billId: null, billNo: null, purchaseId: purchase.id, partyId: purchase.supplierId,
    partyName: supplier.name, items: D.noteItemsFromPurchaseReturn(ret),
    goodsAmount: figures.goodsAmount, taxAmount: figures.taxAmount, total: figures.total,
    settlement, journalEntryId: "ENTRY", reason: "Damaged stock", status: "posted", dayOffset: 0, ts,
  };
  return { ret, entry, note };
}

/* ---------------- scenarios ---------------- */

const scenarios = [];
function normEntry(e, labels) {
  return {
    memo: e.memo, refType: e.refType, refId: e.refId,
    reversesId: e.reversesId ? (labels.get(e.reversesId) ?? "EXT") : null,
    lines: e.lines.map((l) => ({ account: l.account, debit: l.debit, credit: l.credit, ref: l.ref ?? null })),
  };
}
function push(id, title, docs, entries) {
  const labels = new Map(entries.map((e, i) => [e.id, `e${i}`]));
  scenarios.push({ id, title, docs, entries: entries.map((e) => normEntry(e, labels)) });
}

// 1 — supplier payment in cash (PV-1)
{
  const payment = { id: "spay-1", supplierId: supplier.id, amount: 4000, method: "cash", accountId: "acct-till", voucherNo: "PV-1", note: "Part payment", dayOffset: 0, ts: "2026-10-22T09:30:00.000Z" };
  const entry = L.makeEntry(`Supplier payment`, "supplier_payment", payment.id, [
    { account: "payables", debit: 4000, credit: 0, ref: supplier.id },
    { account: L.accountForMethod("cash"), debit: 0, credit: 4000, ref: payment.accountId },
  ], { ts: payment.ts });
  push("supplier-payment-cash", "Supplier payment in cash settles payables through the till", { payment }, [entry]);
}
// 2 — supplier payment by bank transfer (PV-2)
{
  const payment = { id: "spay-2", supplierId: supplier.id, amount: 2500, method: "bank", accountId: "acct-bank", voucherNo: "PV-2", note: "", dayOffset: 0, ts: "2026-10-22T09:35:00.000Z" };
  const entry = L.makeEntry(`Supplier payment`, "supplier_payment", payment.id, [
    { account: "payables", debit: 2500, credit: 0, ref: supplier.id },
    { account: L.accountForMethod("bank"), debit: 0, credit: 2500, ref: payment.accountId },
  ], { ts: payment.ts });
  push("supplier-payment-bank", "Supplier payment by bank: wallet bucket, bank account ref", { payment }, [entry]);
}
// 3 — supplier payment by cheque: payable settles at issuance (PV-3)
{
  const chequeId = "chq-out-1";
  const payment = { id: "spay-3", supplierId: supplier.id, amount: 6000, method: "bank", accountId: "acct-bank", instrument: "cheque", chequeId, voucherNo: "PV-3", note: "PDC", dayOffset: 0, ts: "2026-10-22T09:40:00.000Z" };
  const entry = L.makeEntry(`Supplier payment`, "supplier_payment", payment.id, [
    { account: "payables", debit: 6000, credit: 0, ref: supplier.id },
    { account: "cheques_issued", debit: 0, credit: 6000, ref: chequeId },
  ], { ts: payment.ts });
  const cheque = {
    id: chequeId, direction: "out", chequeNo: "000123", bankName: "Meezan Bank", amount: 6000,
    issueDateISO: "2026-10-22", dueDateISO: "2026-10-29", partyId: supplier.id, partyName: supplier.name,
    partyKind: "supplier", status: "issued", sourceType: "supplier_payment", sourceId: payment.id,
    accountId: "acct-bank", chargesOnBounce: 0, entryIds: { captured: "ENTRY" }, note: "PDC", dayOffset: 0, ts: payment.ts,
  };
  push("supplier-payment-cheque", "Cheque payment settles the payable at issuance via cheques_issued", { payment, cheque }, [entry]);
}
// 4 — expense in cash
{
  const row = { id: "exp-1", category: "rent", amount: 15000, method: "cash", accountId: "acct-till", note: "October rent", dayOffset: 0, ts: "2026-10-22T08:00:00.000Z" };
  const entry = L.makeEntry(`Expense — rent`, "expense", row.id, [
    { account: "expense_rent", debit: 15000, credit: 0 },
    { account: L.accountForMethod("cash"), debit: 0, credit: 15000, ref: row.accountId },
  ], { ts: row.ts, dayOffset: 0 });
  push("expense-cash", "Expense paid in cash from the till", { expense: row }, [entry]);
  // 5 — its F-5 mirror reversal (update/delete expense)
  const reversal = L.makeEntry(`Expense reversal — rent`, "expense_reversal", row.id,
    entry.lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit, ref: l.ref ?? null })),
    { reversesId: entry.id, ts: "2026-10-22T13:00:00.000Z" });
  push("expense-reversal", "Expense correction is a mirror entry citing the original (F-5)", { expense: row }, [entry, reversal]);
}
// 6 — expense paid by cheque (OUT lifecycle host)
{
  const row = { id: "exp-2", category: "other", amount: 3000, method: "bank", accountId: "acct-bank", instrument: "cheque", chequeId: "chq-out-2", note: "Printer repair", dayOffset: 0, ts: "2026-10-22T08:10:00.000Z" };
  const entry = L.makeEntry(`Expense — other`, "expense", row.id, [
    { account: "expense_other", debit: 3000, credit: 0 },
    { account: "cheques_issued", debit: 0, credit: 3000, ref: "chq-out-2" },
  ], { ts: row.ts, dayOffset: 0 });
  const cheque = {
    id: "chq-out-2", direction: "out", chequeNo: "000124", bankName: "Meezan Bank", amount: 3000,
    issueDateISO: "2026-10-22", dueDateISO: "2026-10-25", partyId: null, partyName: "Printer repair",
    partyKind: "expense", status: "issued", sourceType: "expense", sourceId: row.id,
    accountId: "acct-bank", chargesOnBounce: 0, entryIds: { captured: "ENTRY" }, note: "Printer repair", dayOffset: 0, ts: row.ts,
  };
  push("expense-cheque", "Cheque expense credits the cheques_issued bridge, no money account", { expense: row, cheque }, [entry]);
}
// 7 — cash in: owner capital
{
  const row = { id: "cash-1", kind: "in", amount: 50000, method: "cash", accountId: "acct-till", note: "Owner capital", dayOffset: 0, ts: "2026-10-22T08:20:00.000Z" };
  const entry = L.makeEntry(`Cash in — Owner capital`, "cashbook", row.id, [
    { account: "cash", debit: 50000, credit: 0, ref: row.accountId },
    { account: "capital", debit: 0, credit: 50000 },
  ], { ts: row.ts });
  push("cash-in-capital", "Manual cash in books owner capital", { cashEntry: row }, [entry]);
}
// 8 — cash out: owner drawings from the wallet bucket
{
  const row = { id: "cash-2", kind: "out", amount: 8000, method: "wallet", accountId: "acct-wallet", note: "Owner drawings", dayOffset: 0, ts: "2026-10-22T08:25:00.000Z" };
  const entry = L.makeEntry(`Cash out — Owner drawings`, "cashbook", row.id, [
    { account: "drawings", debit: 8000, credit: 0 },
    { account: "wallet", debit: 0, credit: 8000, ref: row.accountId },
  ], { ts: row.ts });
  push("cash-out-drawings", "Manual cash out books owner drawings", { cashEntry: row }, [entry]);
}
// 9 — transfer wallet → till (cross-bucket)
{
  const row = { id: "cash-3", kind: "transfer", amount: 5000, method: "wallet", accountId: null, fromAccountId: "acct-wallet", toAccountId: "acct-till", note: "Till top-up", dayOffset: 0, ts: "2026-10-22T08:30:00.000Z" };
  const entry = L.makeEntry(`Transfer — Wallet & Bank → Main Till`, "transfer", row.id, [
    { account: "cash", debit: 5000, credit: 0, ref: "acct-till" },
    { account: "wallet", debit: 0, credit: 5000, ref: "acct-wallet" },
  ], { ts: row.ts });
  push("transfer-cross-bucket", "Transfer between buckets moves both GL accounts", { cashEntry: row }, [entry]);
}
// 10 — transfer JazzCash → Wallet & Bank (same bucket: GL-net-zero, refs move)
{
  const row = { id: "cash-4", kind: "transfer", amount: 2000, method: "wallet", accountId: null, fromAccountId: "acct-jazz", toAccountId: "acct-wallet", note: "Sweep", dayOffset: 0, ts: "2026-10-22T08:35:00.000Z" };
  const entry = L.makeEntry(`Transfer — JazzCash → Wallet & Bank`, "transfer", row.id, [
    { account: "wallet", debit: 2000, credit: 0, ref: "acct-wallet" },
    { account: "wallet", debit: 0, credit: 2000, ref: "acct-jazz" },
  ], { ts: row.ts });
  push("transfer-same-bucket", "Same-bucket transfer: two wallet lines, bucket total unmoved", { cashEntry: row }, [entry]);
}
// 11 — tax payment capped at the position of the taxed bill before it
{
  const { bill, entry: billEntry } = composeBill({ id: "bill-tax-1", billNo: 21, lines: [{ productId: "p-oil", qty: 2 }], payments: [{ method: "cash", amount: 2808 }] });
  const pos = T.taxPosition([billEntry], new Date("2026-10-22T12:00:00.000Z"));
  const row = { id: "cash-5", kind: "out", amount: 300, method: "cash", accountId: "acct-till", note: "Tax payment", dayOffset: 0, ts: "2026-10-22T12:40:00.000Z" };
  const entry = L.makeEntry(`Tax payment — government`, "tax_payment", row.id, [
    { account: "tax_payable", debit: 300, credit: 0 },
    { account: "cash", debit: 0, credit: 300, ref: "acct-till" },
  ], { ts: row.ts });
  push("tax-payment", "Tax payment is capped at taxPosition.netPayable of the journal before it", { bill, cashEntry: row, taxDueBefore: pos.netPayable }, [billEntry, entry]);
}
// 12 — purchase return settled by payable offset (debit note DN-1)
{
  const { purchase } = composePurchase({ id: "pur-9", supplierId: supplier.id, lines: [{ productId: "p-oil", qty: 5, unitCost: 1000 }, { productId: "p-raw", qty: 4, unitCost: 500 }] });
  const r = composePurchaseReturn({ purchase, lines: [{ productId: "p-oil", qty: 2 }], settlement: "payable_offset", retId: "pret-1", noteNumber: "DN-1" });
  push("purchase-return-offset", "Purchase return by payable offset: Dr payables / Cr inventory + tax_input; DN wraps it", { purchase, purchaseReturn: r.ret, note: r.note }, [r.entry]);
}
// 13 — purchase return settled by cash refund
{
  const { purchase } = composePurchase({ id: "pur-10", supplierId: supplier.id, lines: [{ productId: "p-oil", qty: 5, unitCost: 1000 }] });
  const r = composePurchaseReturn({ purchase, lines: [{ productId: "p-oil", qty: 1 }], settlement: "cash_refund", retId: "pret-2", noteNumber: "DN-2" });
  push("purchase-return-refund", "Purchase return by cash refund: Dr cash / Cr inventory + tax_input", { purchase, purchaseReturn: r.ret, note: r.note }, [r.entry]);
}
// 14 — cheque lifecycle: IN cheque clears into its deposit account
{
  const chq = {
    id: "chq-in-1", direction: "in", chequeNo: "A-778", bankName: "HBL", amount: 5000,
    issueDateISO: "2026-10-20", dueDateISO: "2026-10-22", partyId: customer.id, partyName: customer.name,
    partyKind: "customer", status: "deposited", sourceType: "repayment", sourceId: "cr-x",
    accountId: "acct-wallet", chargesOnBounce: 0, entryIds: { captured: "EXT" }, note: "", dayOffset: 0, ts: "2026-10-20T10:00:00.000Z",
  };
  const entry = L.makeEntry(`Cheque A-778 cleared — ${customer.name}`, "cheque_clearing", chq.id,
    C.clearingLines(chq, glFor("acct-wallet")), { ts: "2026-10-22T13:00:00.000Z" });
  push("cheque-clear-in", "IN clearing: Dr deposit account bucket / Cr cheques_in_hand", { cheque: chq }, [entry]);
}
// 15 — cheque lifecycle: IN bounce + bank charges (two entries, one batch)
{
  const chq = {
    id: "chq-in-2", direction: "in", chequeNo: "A-779", bankName: "HBL", amount: 7000,
    issueDateISO: "2026-10-19", dueDateISO: "2026-10-21", partyId: customer.id, partyName: customer.name,
    partyKind: "customer", status: "deposited", sourceType: "bill", sourceId: "bill-x",
    accountId: "acct-wallet", chargesOnBounce: 0, entryIds: { captured: "EXT" }, note: "", dayOffset: 0, ts: "2026-10-19T10:00:00.000Z",
  };
  const e1 = L.makeEntry(`Cheque A-779 bounced — ${customer.name}`, "cheque_bounce", chq.id, C.bounceInLines(chq), { ts: "2026-10-22T13:05:00.000Z" });
  const e2 = L.makeEntry(`Bank charges — cheque A-779 bounced`, "cheque_bounce", chq.id, C.bounceChargesLines(chq, glFor("acct-wallet"), 150), { ts: "2026-10-22T13:05:00.000Z" });
  const creditRow = {
    id: "cr-comp-1", customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
    kind: "credit", amount: 7000, instrument: "cheque", chequeId: chq.id,
    note: `Cheque bounced — HBL A-779`, billId: "bill-x", dayOffset: 0, ts: "2026-10-22T13:05:00.000Z",
  };
  push("cheque-bounce-in", "IN bounce restores the receivable; charges are a separate entry; compensating credit row re-opens the khata", { cheque: chq, creditRow }, [e1, e2]);
}
// 16 — cheque lifecycle: IN cheque returned undeposited
{
  const chq = {
    id: "chq-in-3", direction: "in", chequeNo: "A-780", bankName: "UBL", amount: 2200,
    issueDateISO: "2026-10-21", dueDateISO: "2026-10-28", partyId: customer.id, partyName: customer.name,
    partyKind: "customer", status: "received", sourceType: "repayment", sourceId: "cr-y",
    accountId: null, chargesOnBounce: 0, entryIds: { captured: "EXT" }, note: "", dayOffset: 0, ts: "2026-10-21T10:00:00.000Z",
  };
  const entry = L.makeEntry(`Cheque A-780 returned — ${customer.name}`, "cheque_return", chq.id, C.returnInLines(chq), { ts: "2026-10-22T13:10:00.000Z" });
  const creditRow = {
    id: "cr-comp-2", customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
    kind: "credit", amount: 2200, instrument: "cheque", chequeId: chq.id,
    note: `Cheque returned — UBL A-780`, billId: null, dayOffset: 0, ts: "2026-10-22T13:10:00.000Z",
  };
  push("cheque-return-in", "IN return (undeposited) mirrors capture and re-opens the khata", { cheque: chq, creditRow }, [entry]);
}
// 17 — cheque lifecycle: OUT cheque clears from its drawn-on account
{
  const chq = {
    id: "chq-out-1", direction: "out", chequeNo: "000123", bankName: "Meezan Bank", amount: 6000,
    issueDateISO: "2026-10-22", dueDateISO: "2026-10-29", partyId: supplier.id, partyName: supplier.name,
    partyKind: "supplier", status: "issued", sourceType: "supplier_payment", sourceId: "spay-3",
    accountId: "acct-bank", chargesOnBounce: 0, entryIds: { captured: "EXT" }, note: "PDC", dayOffset: 0, ts: "2026-10-22T09:40:00.000Z",
  };
  const entry = L.makeEntry(`Cheque 000123 cleared — ${supplier.name}`, "cheque_clearing", chq.id,
    C.clearingLines(chq, glFor("acct-bank")), { ts: "2026-10-22T13:15:00.000Z" });
  push("cheque-clear-out", "OUT clearing: Dr cheques_issued / Cr drawn-on account bucket", { cheque: chq }, [entry]);
}
// 18 — cheque lifecycle: OUT bounce re-opens the payable + reversal row
{
  const chq = {
    id: "chq-out-1", direction: "out", chequeNo: "000123", bankName: "Meezan Bank", amount: 6000,
    issueDateISO: "2026-10-22", dueDateISO: "2026-10-29", partyId: supplier.id, partyName: supplier.name,
    partyKind: "supplier", status: "issued", sourceType: "supplier_payment", sourceId: "spay-3",
    accountId: "acct-bank", chargesOnBounce: 0, entryIds: { captured: "EXT" }, note: "PDC", dayOffset: 0, ts: "2026-10-22T09:40:00.000Z",
  };
  const entry = L.makeEntry(`Cheque 000123 bounced — ${supplier.name}`, "cheque_bounce", chq.id, C.bounceOutLines(chq), { ts: "2026-10-22T13:20:00.000Z" });
  const reversalRow = {
    id: "spay-rev-1", supplierId: supplier.id, amount: 6000, method: "bank", accountId: "acct-bank",
    kind: "reversal", instrument: "cheque", chequeId: chq.id,
    note: `Cheque bounced — Meezan Bank 000123`, dayOffset: 0, ts: "2026-10-22T13:20:00.000Z",
  };
  push("cheque-bounce-out", "OUT bounce: Dr cheques_issued / Cr payables; reversal row nets supplierPaid", { cheque: chq, paymentRow: reversalRow }, [entry]);
}
// 19 — bill paid by cheque: capture inside the host bill entry
{
  const draft = { chequeNo: "B-100", bankName: "MCB", issueDateISO: "2026-10-22", dueDateISO: "2026-10-24" };
  const { bill, entry, cheques } = composeBill({
    id: "bill-8", billNo: 8, customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
    lines: [{ productId: "p-tea", qty: 1 }],
    payments: [{ method: "bank", amount: 1050, instrument: "cheque", chequeId: "chq-in-9", cheque: draft }],
  });
  push("bill-cheque-capture", "Cheque part debits cheques_in_hand inside the bill entry; registry doc is born received", { bill, cheque: cheques[0] }, [entry]);
  // 20 — void of that bill while the cheque is still in hand: handback
  const gross = bill.items.reduce((a, i) => a + i.total, 0);
  const cost = bill.items.reduce((a, i) => a + i.qty * i.unitCost, 0);
  const voidEntry = L.makeEntry(`Bill #8 voided`, "bill_void", bill.id, [
    { account: "sales_revenue", debit: gross, credit: 0 },
    ...L.classLegLines(cost, 0, "debit"),
    { account: "cheques_in_hand", debit: 0, credit: 1050, ref: "chq-in-9" },
    { account: "cogs", debit: 0, credit: cost },
  ], { ts: "2026-10-22T14:00:00.000Z" });
  push("void-cheque-handback", "Void hands a still-in-hand cheque back: Cr cheques_in_hand, registry closes returned", { bill, cheque: cheques[0] }, [voidEntry]);
}
// 21 — repayment received by cheque (RV-9)
{
  const row = {
    id: "cr-repay-chq", customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
    kind: "repayment", amount: 4500, method: "bank", accountId: null, instrument: "cheque", chequeId: "chq-in-10",
    voucherNo: "RV-9", note: "", billId: null, dayOffset: 0, ts: "2026-10-22T14:05:00.000Z",
  };
  const entry = L.makeEntry(`Udhaar repayment — ${customer.name}`, "repayment", row.id, [
    { account: "cheques_in_hand", debit: 4500, credit: 0, ref: "chq-in-10" },
    { account: "receivables", debit: 0, credit: 4500, ref: customer.id },
  ], { ts: row.ts });
  const cheque = {
    id: "chq-in-10", direction: "in", chequeNo: "B-101", bankName: "MCB", amount: 4500,
    issueDateISO: "2026-10-22", dueDateISO: "2026-10-26", partyId: customer.id, partyName: customer.name,
    partyKind: "customer", status: "received", sourceType: "repayment", sourceId: row.id,
    accountId: null, chargesOnBounce: 0, entryIds: { captured: "ENTRY" }, note: "", dayOffset: 0, ts: row.ts,
  };
  push("repayment-cheque", "Cheque repayment settles the receivable now, value in cheques_in_hand", { creditRow: row, cheque }, [entry]);
}
// 22 — formal return with credit note: figures read off the engine's return
{
  const { bill, entry: _be, creditRow } = composeBill({
    id: "bill-9", billNo: 9, customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
    lines: [{ productId: "p-tea", qty: 1 }, { productId: "p-sugar", qty: 2 }], discountValue: 40,
    payments: [{ method: "cash", amount: 500 }, { method: "credit", amount: 800 }],
  });
  const r = composeReturn({ bill, priorReturns: [], credits: creditRow ? [creditRow] : [], lines: [{ productId: "p-sugar", qty: 1 }] });
  const figures = D.creditNoteFigures(r.ret);
  const note = {
    id: "note-ret-1", number: "CN-1", kind: "credit", returnId: r.ret.id, billId: bill.id, billNo: bill.billNo,
    purchaseId: null, partyId: customer.id, partyName: customer.name, items: r.ret.items,
    goodsAmount: figures.goodsAmount, taxAmount: figures.taxAmount, total: figures.total,
    settlement: r.ret.creditReduction > 0 && r.ret.refundAmount <= 0 ? "credit_reduction" : "cash_refund",
    journalEntryId: "ENTRY", reason: "Customer request", status: "posted", dayOffset: 0, ts: r.ret.ts,
  };
  push("return-with-note", "Credit note figures EQUAL the return engine's figures by construction", { bill, saleReturn: r.ret, note }, [r.entry]);
}

/* ---------------- documents: fulfilment derivations ---------------- */

const mapObj = (m) => Object.fromEntries([...m.entries()].sort((a, b) => a[0].localeCompare(b[0])));
const docLines = (arr) => arr.map(([productId, qty, unitPrice]) => ({ productId, name: prod(productId).name, qty, unitPrice, total: qty * unitPrice, sourceProductId: productId }));

const qt1 = {
  id: "qt-1", number: "QT-1", customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
  lines: docLines([["p-tea", 10, 1000], ["p-sugar", 5, 140]]),
  subtotal: 10700, discountType: "flat", discountValue: 0, discountAmount: 0, estimatedTax: 0, total: 10700,
  validUntil: null, note: "", status: "accepted", issuedTs: "2026-10-18T09:00:00.000Z", dayOffset: 0, ts: "2026-10-18T09:00:00.000Z",
};
const so1 = {
  id: "so-1", number: "SO-1", customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
  lines: docLines([["p-tea", 4, 1000]]),
  subtotal: 4000, discountType: "flat", discountValue: 0, discountAmount: 0, estimatedTax: 0, total: 4000,
  source: { type: "quotation", id: "qt-1" }, expectedDate: null, note: "", status: "open", dayOffset: 0, ts: "2026-10-19T09:00:00.000Z",
};
const so2 = {
  id: "so-2", number: "SO-2", customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
  lines: docLines([["p-tea", 3, 1050], ["p-sugar", 5, 145]]),
  subtotal: 3875, discountType: "flat", discountValue: 0, discountAmount: 0, estimatedTax: 0, total: 3875,
  source: null, expectedDate: null, note: "", status: "open", dayOffset: 0, ts: "2026-10-19T10:00:00.000Z",
};
const dc1 = {
  id: "dc-1", number: "DC-1", orderId: "so-2", customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
  lines: docLines([["p-tea", 2, 1050]]),
  vehicleNo: "LEA-123", driverName: "Driver", note: "", status: "dispatched", dayOffset: 0, ts: "2026-10-20T09:00:00.000Z",
};
const billItem = (productId, qty) => {
  const p = prod(productId);
  return { productId, name: p.name, qty, unitPrice: p.salePrice, unitCost: p.costPrice, total: qty * p.salePrice, sourceProductId: productId, taxAmount: 0, taxSlabId: null, taxSlabName: null, taxRate: 0, taxKind: "percent", taxInclusive: false };
};
const mkBill = (id, billNo, sourceType, sourceId, items) => ({
  id, billNo, customerId: customer.id, customerName: customer.name, customerPhone: customer.phone,
  items, subtotal: items.reduce((a, i) => a + i.total, 0), discountType: "flat", discountValue: 0, discountAmount: 0,
  taxAmount: 0, total: items.reduce((a, i) => a + i.total, 0),
  payments: [{ method: "cash", amount: items.reduce((a, i) => a + i.total, 0), accountId: "acct-till" }],
  status: "paid", returnedQty: {}, sourceType, sourceId, dayOffset: 0, ts: "2026-10-21T09:00:00.000Z",
});
const billA = mkBill("bill-a", 31, "order", "so-2", [billItem("p-sugar", 5)]);
const billB = mkBill("bill-b", 32, "challan", "dc-1", [billItem("p-tea", 1)]);
const billC = mkBill("bill-c", 33, "quotation", "qt-1", [billItem("p-sugar", 2)]);
const docBills = [billA, billB, billC];
const docOrders = [so1, so2];
const docChallans = [dc1];
const po1 = {
  id: "po-1", number: "PO-1", supplierId: supplier.id, supplierName: supplier.name,
  lines: [
    { productId: "p-tea", name: "Tapal Danedar Tea 475g", qty: 20, unitCost: 800, total: 16000 },
    { productId: "p-oil", name: "Cooking Oil 5L", qty: 4, unitCost: 1000, total: 4000 },
  ],
  total: 20000, expectedDate: null, note: "", status: "issued", dayOffset: 0, ts: "2026-10-18T08:00:00.000Z",
};
const purX = { id: "pur-x", supplierId: supplier.id, items: [{ productId: "p-tea", name: "Tapal Danedar Tea 475g", qty: 8, unitCost: 800, total: 6400, taxAmount: 0 }], total: 6400, netTotal: 6400, taxAmount: 0, note: "", sourcePoId: "po-1", dayOffset: 0, ts: "2026-10-20T08:00:00.000Z" };

const documents = {
  quotation: qt1, orders: docOrders, challans: docChallans, bills: docBills, purchaseOrder: po1, purchases: [purX],
  expected: {
    quotationConvertedQty: mapObj(D.quotationConvertedQty(qt1, docOrders)),
    quotationConvertedTotalQty: mapObj(D.quotationConvertedTotalQty(qt1, docOrders, docBills)),
    orderBilledQtySo2: mapObj(D.orderBilledQty(so2, docBills, docChallans)),
    orderDeliveredQtySo2: mapObj(D.orderDeliveredQty(so2, docChallans)),
    challanBilledQtyDc1: mapObj(D.challanBilledQty(dc1, docBills)),
    deriveOrderStatusSo2: D.deriveOrderStatus(so2, docBills, docChallans),
    deriveQuotationStatusQt1: D.deriveQuotationStatus(qt1, docOrders, docBills),
    deriveChallanStatusDc1: D.deriveChallanStatus(dc1, docBills),
    poReceivedQty: mapObj(D.poReceivedQty(po1, [purX])),
    derivePoStatus: D.derivePoStatus(po1, [purX]),
    poReceiptOk: D.composePoReceiptLines(po1, [purX], [{ productId: "p-tea", qty: 5 }, { productId: "p-oil", qty: 4, unitCost: 990 }]),
    poReceiptOver: D.composePoReceiptLines(po1, [purX], [{ productId: "p-tea", qty: 13 }]),
    promised: mapObj(D.promisedQtyByProduct(docOrders, docChallans, docBills)),
    estimateTotalsQt1: D.estimateDocTotals(qt1.lines, "flat", 0, products, slabs, noTaxSettings),
    voucherRv: D.receiptVoucherData(
      { id: "cr-v", customerId: customer.id, customerName: customer.name, customerPhone: customer.phone, kind: "repayment", amount: 1200, method: "cash", accountId: "acct-till", voucherNo: "RV-3", note: "Part", billId: null, dayOffset: 0, ts: "2026-10-21T11:00:00.000Z" },
      { accountName: "Main Till", balanceAfter: 3400 }
    ),
    voucherPv: D.paymentVoucherData(
      { id: "spay-v", supplierId: supplier.id, amount: 4000, method: "cash", accountId: "acct-till", voucherNo: "PV-1", note: "Part payment", dayOffset: 0, ts: "2026-10-21T11:05:00.000Z" },
      supplier.name,
      { accountName: "Main Till", balanceAfter: 2600 }
    ),
  },
};

/* ---------------- reports: builders over one dataset ---------------- */

const repRange = R.resolveReportRange("custom", null, { from: "2026-10-01", to: "2026-10-31" }, new Date("2026-10-15T00:00:00.000Z"));
const repJournal = [];
const repBills = [], repSales = [], repPurchases = [], repReturns = [], repPRets = [], repCredits = [], repPayments = [], repExpenses = [], repCheques = [], repNotes = [];
{
  const { purchase, entry } = composePurchase({ id: "pur-r1", supplierId: supplier.id, lines: [{ productId: "p-tea", qty: 10, unitCost: 800 }], ts: "2026-10-03T09:00:00.000Z" });
  repPurchases.push(purchase); repJournal.push(entry);
  const pr = composePurchaseReturn({ purchase, lines: [{ productId: "p-tea", qty: 1 }], settlement: "payable_offset", retId: "pret-r1", noteNumber: "DN-7", ts: "2026-10-07T09:00:00.000Z" });
  repPRets.push(pr.ret); repNotes.push(pr.note); repJournal.push(pr.entry);

  const b1 = composeBill({ id: "bill-r1", billNo: 41, customerId: customer.id, customerName: customer.name, customerPhone: customer.phone, lines: [{ productId: "p-tea", qty: 2 }], payments: [{ method: "cash", amount: 1300 }, { method: "credit", amount: 800 }], ts: "2026-10-05T10:00:00.000Z" });
  repBills.push(b1.bill); repJournal.push(b1.entry);
  repSales.push({ id: "bill-r1-s0", productId: "p-tea", qty: 2, unitPrice: 1050, unitCost: 800, total: 2100, billId: "bill-r1", kind: "sale", dayOffset: 2, ts: b1.bill.ts });
  if (b1.creditRow) repCredits.push({ ...b1.creditRow, id: "cr-r1", dayOffset: 40, ts: b1.bill.ts });

  const b2 = composeBill({ id: "bill-r2", billNo: 42, lines: [{ productId: "p-oil", qty: 1 }], payments: [{ method: "cash", amount: 1404 }], ts: "2026-10-06T10:00:00.000Z" });
  repBills.push(b2.bill); repJournal.push(b2.entry);
  repSales.push({ id: "bill-r2-s0", productId: "p-oil", qty: 1, unitPrice: 1200, unitCost: 1000, total: 1200, billId: "bill-r2", kind: "sale", dayOffset: 1, ts: b2.bill.ts });
  repSales.push({ id: "sale-r3", productId: "p-sugar", qty: 3, unitPrice: 145, unitCost: 130, total: 435, billId: null, kind: "sale", dayOffset: 0, ts: "2026-10-06T11:00:00.000Z" });
  repJournal.push(L.makeEntry(`Counter sale — Sugar 1kg × 3`, "sale", "sale-r3", [
    { account: "cash", debit: 435, credit: 0, ref: "acct-till" },
    { account: "cogs", debit: 390, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 435 },
    { account: "inventory", debit: 0, credit: 390 },
  ], { ts: "2026-10-06T11:00:00.000Z" }));

  const expRow = { id: "exp-r1", category: "rent", amount: 15000, method: "cash", accountId: "acct-till", note: "October rent", dayOffset: 0, ts: "2026-10-04T08:00:00.000Z" };
  repExpenses.push(expRow);
  repJournal.push(L.makeEntry(`Expense — rent`, "expense", expRow.id, [
    { account: "expense_rent", debit: 15000, credit: 0 },
    { account: "cash", debit: 0, credit: 15000, ref: "acct-till" },
  ], { ts: expRow.ts }));

  const payRow = { id: "spay-r1", supplierId: supplier.id, amount: 4000, method: "cash", accountId: "acct-till", voucherNo: "PV-5", note: "", dayOffset: 0, ts: "2026-10-09T09:00:00.000Z" };
  repPayments.push(payRow);
  repJournal.push(L.makeEntry(`Supplier payment`, "supplier_payment", payRow.id, [
    { account: "payables", debit: 4000, credit: 0, ref: supplier.id },
    { account: "cash", debit: 0, credit: 4000, ref: "acct-till" },
  ], { ts: payRow.ts }));

  repCredits.push({ id: "cr-r2", customerId: customer.id, customerName: customer.name, customerPhone: customer.phone, kind: "repayment", amount: 300, method: "cash", accountId: "acct-till", voucherNo: "RV-5", note: "", billId: null, dayOffset: 5, ts: "2026-10-08T09:00:00.000Z" });
  repJournal.push(L.makeEntry(`Udhaar repayment — ${customer.name}`, "repayment", "cr-r2", [
    { account: "cash", debit: 300, credit: 0, ref: "acct-till" },
    { account: "receivables", debit: 0, credit: 300, ref: customer.id },
  ], { ts: "2026-10-08T09:00:00.000Z" }));

  repCheques.push({
    id: "chq-r1", direction: "in", chequeNo: "C-55", bankName: "HBL", amount: 1170,
    issueDateISO: "2026-10-06", dueDateISO: "2026-10-09", partyId: customer.id, partyName: customer.name,
    partyKind: "customer", status: "received", sourceType: "bill", sourceId: "bill-r2",
    accountId: null, chargesOnBounce: 0, entryIds: {}, note: "", dayOffset: 0, ts: "2026-10-06T10:30:00.000Z",
  });
}
const repSuppliers = [{ id: supplier.id, name: supplier.name, phone: "", company: "", notes: "", ts: "2026-01-01T00:00:00.000Z" }];
const repDayCloses = [{
  id: "dc-r1", dateISO: "2026-10-05", accountId: "acct-till", openingCash: 1000,
  salesByMethod: { cash: 1300, credit: 800 }, expensesTotal: 0, creditGiven: 800, creditReceived: 0,
  supplierPaid: 0, expectedCash: 2300, countedCash: 2300, difference: 0, note: "", dayOffset: 0, ts: "2026-10-05T20:00:00.000Z",
}];
const custKey = L.creditKey(repCredits.find((c) => c.customerId === customer.id));
/* Entry ids are client-generated and NOT part of the money contract
 * (the F1 normalization doctrine) — statement rows cite them, so
 * rewrite them to positional labels over the dataset journal. */
const repLabels = new Map(repJournal.map((e, i) => [e.id, `e${i}`]));
const relabelStmt = (stmt) => ({ ...stmt, rows: stmt.rows.map((r) => ({ ...r, entryId: repLabels.get(r.entryId) ?? "EXT" })) });
const plRep = R.plReport(repJournal, repRange);
const salesRep = R.salesReport(repSales, products, repBills, repRange, { returns: repReturns, journal: repJournal, taxSlabs: slabs, settings: noTaxSettings });
const reports = {
  range: repRange,
  dataset: { journal: repJournal.map((e) => ({ ...normEntry(e, new Map()), ts: e.ts, dayOffset: e.dayOffset ?? 0 })), bills: repBills, sales: repSales, purchases: repPurchases, purchaseReturns: repPRets, credits: repCredits, payments: repPayments, expenses: repExpenses, cheques: repCheques, notes: repNotes, suppliers: repSuppliers, dayCloses: repDayCloses },
  expected: {
    sales: { grossSales: salesRep.grossSales, returnsTotal: salesRep.returnsTotal, revenue: salesRep.revenue, discounts: salesRep.discounts, netSales: salesRep.netSales, otherRevenue: salesRep.otherRevenue, plNetRevenue: salesRep.plNetRevenue, netUnits: salesRep.netUnits, grossProfit: salesRep.grossProfit, byProduct: salesRep.byProduct, byCustomer: salesRep.byCustomer },
    purchase: R.purchaseReport(repPurchases, repPRets, repSuppliers, repRange),
    stock: (() => { const s = R.stockReport(products); return { totalValue: s.totalValue, retailValue: s.retailValue, lowCount: s.low.length, expiringCount: s.expiring.length }; })(),
    pl: plRep,
    plIdentity: { plNetRevenue: plRep.netRevenue, salesNetPlusOther: round2(salesRep.netSales + salesRep.otherRevenue) },
    trialBalance: R.trialBalance(repJournal, repRange),
    accountStatementTill: relabelStmt(R.accountStatement(repJournal, accounts, "acct-till", repRange)),
    accountStatementCombined: relabelStmt(R.accountStatement(repJournal, accounts, null, repRange)),
    tax: R.taxReport(repBills, repReturns, repPurchases, repPRets, repRange),
    taxPosition: T.taxPosition(repJournal, new Date("2026-10-15T00:00:00.000Z")),
    customerStatement: R.customerStatement(repCredits, custKey, repRange),
    supplierStatement: R.supplierStatement(repPurchases, repPayments, repPRets, supplier.id, repRange),
    aging: R.agingReport(repCredits, repPurchases, repPayments, repPRets),
    expenses: R.expensesReport(repExpenses, repRange),
    cheques: R.chequesReport(repCheques, repRange),
    dayClose: R.dayCloseReport(repDayCloses, repRange),
    notes: R.notesReport(repNotes, repRange),
    forecast: S.forecastAll(products, repSales).map((f) => ({
      productId: f.product.id, avgDaily: f.avgDaily,
      daysOfStock: Number.isFinite(f.daysOfStock) ? f.daysOfStock : null,
      suggestedReorder: f.suggestedReorder, status: f.status,
    })),
    supplierBalance: L.supplierBalance(repPurchases, repPayments, supplier.id, repPRets),
    payablesGL: L.accountNormalBalance(repJournal, "payables"),
    receivablesGL: L.accountNormalBalance(repJournal, "receivables"),
  },
};

/* ---------------- self-checks ---------------- */

const all = scenarios.flatMap((s) => s.entries);
let failures = 0;
const tb = {};
for (const e of all) for (const l of e.lines) tb[l.account] = (tb[l.account] ?? 0) + l.debit - l.credit;
const tbTotal = Object.values(tb).reduce((a, n) => a + n, 0);
if (Math.abs(tbTotal) > 0.009) { console.error(`F2 FIXTURE SELF-CHECK FAILED: trial balance ${tbTotal}`); failures++; }
if (reports.expected.plIdentity.plNetRevenue !== reports.expected.plIdentity.salesNetPlusOther) {
  console.error("F2 FIXTURE SELF-CHECK FAILED: P&L ≡ sales identity broken in the fixture itself");
  failures++;
}
if (Math.abs(reports.expected.supplierBalance - reports.expected.payablesGL) > 0.009) {
  console.error(`F2 FIXTURE SELF-CHECK FAILED: supplierBalance ${reports.expected.supplierBalance} != payables GL ${reports.expected.payablesGL}`);
  failures++;
}
if (failures) process.exit(1);

const out = {
  version: 2,
  source: "web/lib via harness/out (makeEntry, tax, ledger, cheques, documents, reports, selectors) + StoreProvider F2 template transcriptions",
  accounts, products, slabs, settings: noTaxSettings, customer, supplier,
  scenarios, documents, reports,
};
const dir = path.join(__dirname, "fixtures");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "f2-core.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`f2 fixtures: ${scenarios.length} scenarios, ${all.length} entries, trial balance ${tbTotal} — wrote fixtures/f2-core.json`);
