/**
 * Phase H · H6 fixture exporter — produces fixtures/h6-core.json
 * consumed by flutter-app/test/h6_fixtures_test.dart. The expected
 * values are computed by the REAL compiled web dayCloseSummary
 * (./out/ledger.js) over a crafted dataset exercising every
 * bucket rule the H6 alignment fixed on the Dart side: cheque +
 * points payment parts, a voided bill, a held bill, a credit
 * part, a counter sale, a cheque expense / repayment / supplier
 * payment and a reversal supplier row. Deterministic by
 * construction: literal data only — no ids minted, no clock
 * read — so the exporter sits in the CI freshness gate.
 */
const fs = require("fs");
const path = require("path");
const ledger = require("./out/ledger.js");

const TS = "2026-10-15T10:00:00.000Z";
const inputs = {
  bills: [
    {
      id: "b1", billNo: 1, status: "paid", dayOffset: 0, ts: TS, total: 4600,
      payments: [
        { method: "cash", amount: 1000 },
        { method: "jazzcash", amount: 500 },
        { method: "credit", amount: 800 },
        { method: "cash", amount: 2000, instrument: "cheque" },
        { method: "cash", amount: 300, instrument: "points", loyaltyPoints: 300 },
      ],
    },
    { id: "b2", billNo: 2, status: "voided", dayOffset: 0, ts: TS, total: 700, payments: [{ method: "cash", amount: 700 }] },
    { id: "b3", billNo: 3, status: "held", dayOffset: 0, ts: TS, total: 400, payments: [{ method: "cash", amount: 400 }] },
    { id: "b4", billNo: 4, status: "paid", dayOffset: 1, ts: TS, total: 999, payments: [{ method: "cash", amount: 999 }] },
    { id: "b5", billNo: 5, status: "returned", dayOffset: 0, ts: TS, total: 250, payments: [{ method: "cash", amount: 250 }] },
  ],
  sales: [
    { id: "s1", productId: "p1", qty: 1, unitPrice: 350, total: 350, dayOffset: 0, ts: TS },
    { id: "s2", productId: "p1", qty: 1, unitPrice: 200, total: 200, billId: "b1", dayOffset: 0, ts: TS },
    { id: "s3", productId: "p1", qty: 1, unitPrice: 150, total: 150, dayOffset: 1, ts: TS },
  ],
  expenses: [
    { id: "e1", category: "rent", amount: 300, method: "cash", dayOffset: 0, ts: TS },
    { id: "e2", category: "other", amount: 200, method: "cash", instrument: "cheque", dayOffset: 0, ts: TS },
    { id: "e3", category: "transport", amount: 150, method: "jazzcash", dayOffset: 0, ts: TS },
    { id: "e4", category: "rent", amount: 999, method: "cash", dayOffset: 1, ts: TS },
  ],
  credits: [
    { id: "c1", customerId: "cu-1", customerName: "A", customerPhone: "", kind: "credit", amount: 1200, dayOffset: 0, ts: TS },
    { id: "c2", customerId: "cu-1", customerName: "A", customerPhone: "", kind: "repayment", amount: 450, method: "cash", dayOffset: 0, ts: TS },
    { id: "c3", customerId: "cu-1", customerName: "A", customerPhone: "", kind: "repayment", amount: 275, method: "cash", instrument: "cheque", dayOffset: 0, ts: TS },
    { id: "c4", customerId: "cu-1", customerName: "A", customerPhone: "", kind: "repayment", amount: 100, method: "jazzcash", dayOffset: 0, ts: TS },
  ],
  supplierPayments: [
    { id: "p1", supplierId: "su-1", amount: 600, method: "cash", dayOffset: 0, ts: TS },
    { id: "p2", supplierId: "su-1", amount: 400, method: "cash", instrument: "cheque", dayOffset: 0, ts: TS },
    { id: "p3", supplierId: "su-1", amount: 300, method: "cash", kind: "reversal", dayOffset: 0, ts: TS },
    { id: "p4", supplierId: "su-1", amount: 200, method: "jazzcash", dayOffset: 0, ts: TS },
  ],
  returnsRefundCash: 125,
  cashIn: 80,
  cashOut: 45,
  openingCash: 5000,
};

const s = ledger.dayCloseSummary(inputs);
const expected = {
  salesByMethod: s.salesByMethod,
  cashSales: s.cashSales,
  expensesTotal: s.expensesTotal,
  expensesCash: s.expensesCash,
  creditGiven: s.creditGiven,
  creditReceived: s.creditReceived,
  supplierPaidCash: s.supplierPaidCash,
  refundsCash: s.refundsCash,
  expectedCash: s.expectedCash,
};

const out = {
  about:
    "H6 core fixture — the web dayCloseSummary's outputs over a crafted bucket-rule dataset, computed by the compiled web lib/ledger (harness/out); consumed by flutter-app/test/h6_fixtures_test.dart to prove the Dart port (core/ledger.dayCloseSummary) reproduces the web derivation exactly. Regenerate: node fixtures-export-h6.js (after compiling harness/tsconfig).",
  inputs,
  expected,
};
const dest = path.join(__dirname, "fixtures", "h6-core.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log("wrote", dest, JSON.stringify(expected));
