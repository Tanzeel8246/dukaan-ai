/**
 * Golden-fixture export for Fix Round 1 (the owner's live test of
 * 2026-10-24). Companions fixtures-export*.js are untouched:
 * their outputs must stay byte-stable — this exporter is NEW, and
 * deterministic by construction (fixed timestamps throughout; the
 * one wall-clock-derived field, a closing entry's stored
 * dayOffset, is EXCLUDED from the normalized entries because
 * since FR1·F3 dayOffset is a load-derived field, not a stored
 * truth — the derivations proven here do not read it).
 *
 * Cases: F4 the credit-lot aging + WhatsApp udhaar positions on
 * the live failure scenario; F3 `dayOffsetForTs` pairs; F2 the
 * Balance Sheet on the frozen seed, a trading walk, a
 * mid-clearing state, and across an FY close; F5 the
 * opening-stock gap + entries (both class shapes).
 *
 * Run AFTER the harness compile:
 *   node ../harness/fixtures-export-fr1.js (writes fixtures/fr1-core.json)
 */
"use strict";
const fs = require("fs");
const path = require("path");

const L = require("./out/ledger.js");
const FI = require("./out/fiscal.js");
const PE = require("./out/periods.js");
const WA = require("./out/whatsapp.js");
const SEED = require("./out/seed.js");

const ALL_RANGE = {
  fromDate: "2000-01-01", toDate: "2100-12-31",
  fromTs: "2000-01-01T00:00:00.000Z", toTs: "2100-01-01T00:00:00.000Z",
};

/** Canonical entry shape (no dayOffset — see header). */
const normEntry = (e, i) => ({
  id: `e${i}`,
  ts: e.ts,
  memo: e.memo,
  refType: e.refType,
  refId: e.refId ?? null,
  reversesId: e.reversesId ?? null,
  lines: e.lines.map((l) => ({
    account: l.account, debit: l.debit, credit: l.credit, ref: l.ref ?? null,
  })),
});
const normJournal = (entries) => entries.map(normEntry);

/* ---------------- F4: the live aging scenario ------------------ */
const crFR1 = (id, customerId, kind, amount, billId, dayOffset) => ({
  id, customerId, customerName: customerId, customerPhone: "", kind, amount,
  method: "cash", accountId: null, voucherNo: null, note: "", billId, dayOffset,
  ts: "2026-10-24T05:00:00.000Z",
});
const credits = [
  crFR1("fr1-c1", "fr1-cust-1", "credit", 5500, "fr1-bill-old", 70),
  crFR1("fr1-c2", "fr1-cust-1", "credit", 300, "fr1-bill-test", 0),
  crFR1("fr1-c3", "fr1-cust-1", "repayment", 100, null, 0),
  crFR1("fr1-c4", "fr1-cust-1", "credit", -150, "fr1-bill-test", 0),
  crFR1("fr1-c5", "fr1-cust-2", "credit", 200, "fr1-bill-a", 45),
  crFR1("fr1-c6", "fr1-cust-2", "credit", 400, "fr1-bill-b", 10),
  crFR1("fr1-c7", "fr1-cust-2", "credit", -50, "fr1-bill-b", 0),
  crFR1("fr1-c8", "fr1-cust-2", "repayment", 150, null, 0),
];
const purchases = [{ id: "fr1-p1", supplierId: "fr1-sup-1", total: 1000, dayOffset: 70, ts: "2026-08-14T05:00:00.000Z" }];
const purchaseReturns = [{ id: "fr1-pr1", purchaseId: "fr1-p1", supplierId: "fr1-sup-1", items: [], payableOffset: 300, refundAmount: 0, method: null, accountId: null, dayOffset: 0, ts: "2026-10-24T05:00:00.000Z" }];
const supplierPayments = [{ id: "fr1-sp1", supplierId: "fr1-sup-1", amount: 200, dayOffset: 0, ts: "2026-10-24T05:00:00.000Z", method: "cash" }];
const aging = {
  credits,
  purchases,
  purchaseReturns,
  supplierPayments,
  expected: {
    receivables: L.receivablesAging(credits),
    lotsCust1: L.creditLotsRemaining(credits.filter((c) => c.customerId === "fr1-cust-1")),
    lotsCust2: L.creditLotsRemaining(credits.filter((c) => c.customerId === "fr1-cust-2")),
    udhaarCust1: WA.customerUdhaarPosition(credits, "fr1-cust-1"),
    udhaarCust2: WA.customerUdhaarPosition(credits, "fr1-cust-2"),
    payables: L.payablesAging(purchases, supplierPayments, purchaseReturns),
    supplierBalance: L.supplierBalance(purchases, supplierPayments, "fr1-sup-1", purchaseReturns),
  },
};

/* ---------------- F3: derived day offsets ---------------------- */
const dayOffsets = {
  cases: [
    { ts: "2026-10-22T05:00:00.000Z", today: "2026-10-24" },
    { ts: "2026-10-24T05:00:00.000Z", today: "2026-10-24" },
    { ts: "2026-10-24T19:30:00.000Z", today: "2026-10-24" }, // 00:30 PKT next day → floor 0
    { ts: "2026-10-20T18:59:59.999Z", today: "2026-10-24" }, // 23:59:59 PKT on the 20th → 4
    { ts: "not-a-date", today: "2026-10-24", fallback: 7 },
  ].map((c) => ({ ...c, expected: PE.dayOffsetForTs(c.ts, c.today, c.fallback ?? 0) })),
};

/* ---------------- F2: the Balance Sheet ------------------------ */
const seedProducts = SEED.getSeedProducts();
const seedSales = SEED.getSeedSales();
const seedJournal = SEED.getSeedJournal(
  seedProducts, seedSales, SEED.getSeedPurchases(),
  SEED.getSeedSupplierPayments(), SEED.getSeedExpenses(), SEED.getSeedCredits()
);
const JL = (account, debit, credit) => ({ account, debit, credit });
const walk = [
  L.makeEntry("Capital in", "cashbook", null, [JL("cash", 100000, 0), JL("capital", 0, 100000)], { ts: "2026-02-10T05:00:00.000Z" }),
  L.makeEntry("Stock bought on credit", "purchase", null, [JL("inventory", 40000, 0), JL("payables", 0, 40000)], { ts: "2026-02-11T05:00:00.000Z" }),
  L.makeEntry("Sale", "bill", null, [JL("cash", 25000, 0), JL("sales_revenue", 0, 25000)], { ts: "2026-02-12T05:00:00.000Z" }),
  L.makeEntry("COGS", "bill", null, [JL("cogs", 15000, 0), JL("inventory", 0, 15000)], { ts: "2026-02-12T05:01:00.000Z" }),
  L.makeEntry("Rent", "expense", null, [JL("expense_rent", 5000, 0), JL("cash", 0, 5000)], { ts: "2026-02-13T05:00:00.000Z" }),
  L.makeEntry("Drawings", "cashbook", null, [JL("drawings", 2000, 0), JL("cash", 0, 2000)], { ts: "2026-02-14T05:00:00.000Z" }),
  L.makeEntry("Supplier paid", "supplier_payment", null, [JL("payables", 10000, 0), JL("cash", 0, 10000)], { ts: "2026-02-15T05:00:00.000Z" }),
];
const walkClearing = [
  ...walk,
  L.makeEntry("Purchase mid-clearing", "purchase", null, [JL("purchases", 8000, 0), JL("payables", 0, 8000)], { ts: "2026-02-16T05:00:00.000Z" }),
];
const fyRange = PE.fiscalYearRange({}, "2026-02-10T05:00:00.000Z");
const closeEntry = FI.buildFiscalClosingEntry(walk, fyRange, "per-fr1-1");
const balanceSheet = {
  range: ALL_RANGE,
  seedEntries: normJournal(seedJournal),
  walkEntries: normJournal(walk),
  walkClearingEntries: normJournal(walkClearing),
  walkClosedEntries: normJournal([...walk, closeEntry]),
  expected: {
    seed: FI.balanceSheetReport(seedJournal, ALL_RANGE),
    walk: FI.balanceSheetReport(walk, ALL_RANGE),
    walkClearing: FI.balanceSheetReport(walkClearing, ALL_RANGE),
    walkClosed: FI.balanceSheetReport([...walk, closeEntry], ALL_RANGE),
  },
};

/* ---------------- F5: opening stock ---------------------------- */
const osProducts = [
  { id: "fr1-p1", name: "Goods", stockQty: 10, costPrice: 1000, salePrice: 1200, stockClass: null },
  { id: "fr1-p2", name: "Raw", stockQty: 5, costPrice: 2000, salePrice: 2600, stockClass: "raw" },
];
const osJournalA = [
  L.makeEntry("Bought goods", "purchase", null, [JL("inventory", 4000, 0), JL("payables", 0, 4000)], { ts: "2026-10-20T05:00:00.000Z" }),
  L.makeEntry("Bought raw", "purchase", null, [JL("inventory_raw", 12000, 0), JL("payables", 0, 12000)], { ts: "2026-10-20T05:01:00.000Z" }),
];
const osJournalB = [
  osJournalA[0],
  L.makeEntry("Bought raw", "purchase", null, [JL("inventory_raw", 6000, 0), JL("payables", 0, 6000)], { ts: "2026-10-20T05:01:00.000Z" }),
];
const gapA = FI.openingStockGap(osJournalA, osProducts);
const gapB = FI.openingStockGap(osJournalB, osProducts);
const entryA = FI.buildOpeningStockEntry(gapA.gap, gapA.rawGap, { ts: "2026-10-24T05:00:00.000Z" });
const entryB = FI.buildOpeningStockEntry(gapB.gap, gapB.rawGap, { ts: "2026-10-24T05:00:00.000Z" });
const openingStock = {
  products: osProducts,
  journalA: normJournal(osJournalA),
  journalB: normJournal(osJournalB),
  expected: {
    gapA,
    entryA: normEntry(entryA, 0),
    gapAfterA: FI.openingStockGap([...osJournalA, entryA], osProducts),
    gapB,
    entryB: normEntry(entryB, 0),
  },
};

const out = { aging, dayOffsets, balanceSheet, openingStock };
fs.writeFileSync(
  path.join(__dirname, "fixtures", "fr1-core.json"),
  JSON.stringify(out, null, 1) + "\n"
);
console.log("wrote fixtures/fr1-core.json");
