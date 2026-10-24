/**
 * Phase H · H2 fixture exporter — produces fixtures/h2-core.json
 * consumed by flutter-app/test/h2_fixtures_test.dart. Every
 * expected value here is computed by the REAL compiled web
 * functions (../harness/out/loyalty.js + ledger/fiscal/tally over
 * the H1 suite's exact lifecycle walk), so the Dart port is proven
 * against TypeScript behaviour, never against hand-typed
 * expectations: the settings resolver truth table, the full
 * loyalty lifecycle (earn across tier crossings → split-tender
 * redemption → partial + completing returns with re-credit and
 * clawback → void mirror + earn reversal → FY close → owner-posted
 * expiry) with per-step derived positions, the guardrail quotes,
 * the snapshot-rate scenario, the clawback flooring sequence, the
 * loyalty report, the Tally masters, and the frozen seed's zero
 * loyalty readings.
 *
 * Entry ids are re-stamped deterministically (h2-e1, h2-e2, …) at
 * append time so the fixture is byte-stable across regenerations
 * (the web makeEntry mints wall-clock ids; the fold never reads
 * an id except the expiry's earn-entry targeting, which resolves
 * AFTER the stamp, so semantics are unchanged). The FY closing
 * entry's dayOffset is normalized to 0: both clients derive it
 * from the run date by design, and the Dart test compares the
 * close's lines, not its run-date arithmetic.
 */
const fs = require("fs");
const path = require("path");
const loyalty = require("./out/loyalty.js");
const ledger = require("./out/ledger.js");
const coa = require("./out/coa.js");
const fiscal = require("./out/fiscal.js");
const periods = require("./out/periods.js");
const tally = require("./out/tally.js");
const reports = require("./out/reports.js");
const seed = require("./out/seed.js");

const J = (v) => JSON.parse(JSON.stringify(v));
const S = loyalty.resolveLoyaltySettings({ loyalty: { enabled: true } });
const CUST = "h1-cust";
const T = (d) => `${d}T05:00:00.000Z`; // 10:00 PKT the same day

/* Phase H · H6 (audit fix 4) — determinism, by construction.
 * The seed getters re-base their timestamps against TODAY (the
 * demo's rolling history), so a fixture embedding them raw drifts
 * daily. pinRowTs re-anchors every (ts, dayOffset) row to the
 * fixture epoch 2026-10-23, preserving the getter's PKT
 * time-of-day — the bytes the committed fixture already carries —
 * so re-export is byte-stable on any day. (The FY-close half of
 * the fix is at Step 7: the close entry is stamped BEFORE the
 * case captures it.) */
const FIXED_TODAY = "2026-10-23";
function pinRowTs(row) {
  if (!row || typeof row.ts !== "string" || typeof row.dayOffset !== "number") return row;
  const src = new Date(row.ts);
  if (Number.isNaN(src.getTime())) return row;
  const pkt = new Date(src.getTime() + periods.PKT_OFFSET_MS);
  const todMs =
    ((pkt.getUTCHours() * 60 + pkt.getUTCMinutes()) * 60 + pkt.getUTCSeconds()) * 1000 +
    pkt.getUTCMilliseconds();
  const day = periods.addDaysISO(FIXED_TODAY, -row.dayOffset);
  return {
    ...row,
    ts: new Date(Date.parse(periods.startOfDayPktInstant(day)) + todMs).toISOString(),
  };
}

/* ---------- settings resolver truth table ---------- */
const resolverCases = [
  { name: "absent", settings: {} },
  { name: "enabled-defaults", settings: { loyalty: { enabled: true } } },
  {
    name: "partial-invalid",
    settings: { loyalty: { enabled: true, pointValueRs: 2, earnRsPerPointBase: -5, silverMult: 0.5 } },
  },
  { name: "rs2", settings: { loyalty: { enabled: true, pointValueRs: 2 } } },
  { name: "cap-clamped", settings: { loyalty: { enabled: true, redeemCapPct: 140 } } },
  { name: "no-settings", settings: null },
].map((c) => ({ ...c, resolved: loyalty.resolveLoyaltySettings(c.settings) }));

/* ---------- COA facts ---------- */
const coaCase = {
  codes: coa.ACCOUNT_CODES,
  loyalty_payable: coa.accountMeta("loyalty_payable"),
  expense_loyalty: coa.accountMeta("expense_loyalty"),
  tallyMap: {
    loyalty_payable: tally.TALLY_LEDGER_MAP.loyalty_payable,
    expense_loyalty: tally.TALLY_LEDGER_MAP.expense_loyalty,
  },
  voucherTypes: {
    loyalty_earn: tally.TALLY_VOUCHER_TYPE_BY_REFTYPE.loyalty_earn,
    loyalty_expire: tally.TALLY_VOUCHER_TYPE_BY_REFTYPE.loyalty_expire,
  },
  plIncludesExpenseLoyalty: fiscal.plAccountCodes().includes("expense_loyalty"),
  plIncludesLoyaltyPayable: fiscal.plAccountCodes().includes("loyalty_payable"),
  bsIncludesLoyaltyPayable: fiscal.balanceSheetAccountCodes().includes("loyalty_payable"),
};

/* ---------- the frozen seed reads zero loyalty ---------- */
const seedProducts = seed.getSeedProducts();
const seedSales = seed.getSeedSales();
const seedJournal = seed.getSeedJournal(
  seedProducts,
  seedSales,
  seed.getSeedPurchases(),
  seed.getSeedSupplierPayments(),
  seed.getSeedExpenses(),
  seed.getSeedCredits()
).map(pinRowTs);
const seedCase = {
  journal: seedJournal,
  loyaltyPayableNormal: ledger.accountNormalBalance(seedJournal, "loyalty_payable"),
  expenseLoyaltyBalance: ledger.accountBalance(seedJournal, "expense_loyalty"),
  customerIds: loyalty.loyaltyCustomerIds(seedJournal),
};

/* ---------- the lifecycle walk (the H1 suite, verbatim) ---------- */
let seq = 0;
const stamp = (e) => {
  e.id = `h2-e${++seq}`;
  return e;
};
const WALK = [];
const steps = [];
function recordStep(name, nowISO, appended, extra = {}) {
  steps.push({
    name,
    nowISO,
    appended: J(appended),
    position: loyalty.customerLoyalty(WALK, CUST, S, nowISO),
    glLoyaltyPayable: ledger.accountNormalBalance(WALK, "loyalty_payable"),
    sumByCustomer: [...loyalty.loyaltyRupeesByCustomer(WALK).values()].reduce((a, v) => a + v, 0),
    tbTotal: coa.ACCOUNT_CODES.reduce((a, c) => a + ledger.accountBalance(WALK, c), 0),
    ...extra,
  });
}
function billWithEarn(id, billNo, total, cost, ts, extraLines = [], payload = null) {
  const appended = [];
  const e = ledger.makeEntry(`Bill #${billNo}`, "bill", id, [
    { account: "cash", debit: total - extraLines.reduce((a, l) => a + l.debit, 0), credit: 0 },
    ...extraLines,
    { account: "cogs", debit: cost, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: total },
    { account: "inventory", debit: 0, credit: cost },
  ], { ts });
  if (payload) Object.assign(e, payload);
  WALK.push(stamp(e));
  appended.push(e);
  const earn = loyalty.buildLoyaltyEarnEntry({
    journal: WALK, bill: { id, billNo, customerId: CUST, total }, settings: S, ts,
  });
  if (earn) {
    WALK.push(stamp(earn));
    appended.push(earn);
  }
  return { appended, earn };
}

// Step 1 — earn on a cash bill (Standard tier).
{
  const { appended } = billWithEarn("h1-b1", 1, 10000, 6000, T("2026-01-05"));
  recordStep("earn-first", T("2026-01-05"), appended);
}
// Step 2 — earns crossing Silver then Gold (speed only).
{
  const appended = [];
  appended.push(...billWithEarn("h1-b2", 2, 150000, 90000, T("2026-02-01")).appended);
  appended.push(...billWithEarn("h1-b3", 3, 10000, 6000, T("2026-02-02")).appended);
  appended.push(...billWithEarn("h1-b4", 4, 40000, 24000, T("2026-02-03")).appended);
  appended.push(...billWithEarn("h1-b5", 5, 10000, 6000, T("2026-02-04")).appended);
  recordStep("earn-tier-crossings", T("2026-02-04"), appended);
}
// Step 3 — redemption as a split tender inside bill #6.
{
  const capRs = loyalty.loyaltyRedeemCapRs(2000, S);
  const q6 = loyalty.loyaltyRedemptionQuote(WALK, CUST, 500, capRs);
  const { appended } = billWithEarn("h1-b6", 6, 2000, 1200, T("2026-02-05"),
    [{ account: "loyalty_payable", debit: 500, credit: 0, ref: CUST }],
    { loyaltyPointsUsed: 500 });
  recordStep("redeem-split-tender", T("2026-02-05"), appended, {
    quoteBefore: { pointsWanted: 500, capRs, quote: q6 },
  });
}
// Step 4 — partial return of bill #6: re-credit + clawback.
{
  const rec1 = loyalty.loyaltyRecreditForReturn(WALK, { id: "h1-b6", total: 2000 }, 1000, false);
  const appended = [];
  const ret1 = ledger.makeEntry("Return against Bill #6", "return", "h1-b6", [
    { account: "sales_revenue", debit: 1000, credit: 0 },
    { account: "inventory", debit: 600, credit: 0 },
    { account: "loyalty_payable", debit: 0, credit: rec1.rs, ref: CUST },
    { account: "cash", debit: 0, credit: 750 },
    { account: "cogs", debit: 0, credit: 600 },
  ], { ts: T("2026-02-06") });
  ret1.loyaltyPointsReturned = rec1.points;
  WALK.push(stamp(ret1));
  appended.push(ret1);
  const clawPts1 = loyalty.loyaltyClawbackPoints({
    journal: WALK, bill: { id: "h1-b6", total: 2000 },
    refundTotalRs: 1000, priorRefundedRs: 0, completesBill: false,
  });
  const claw1 = loyalty.buildLoyaltyClawbackEntry({
    journal: WALK, bill: { id: "h1-b6", billNo: 6, customerId: CUST },
    clawPoints: clawPts1, refId: "h1-cn-1",
    memo: "Loyalty points taken back — return on Bill #6", ts: T("2026-02-06"),
  });
  if (claw1) {
    WALK.push(stamp(claw1));
    appended.push(claw1);
  }
  recordStep("return-partial", T("2026-02-06"), appended, {
    recreditBefore: { billId: "h1-b6", billTotal: 2000, refundTotalRs: 1000, completesBill: false, quote: rec1 },
    clawPoints: clawPts1,
  });
}
// Step 5 — the completing return absorbs the exact remainders.
{
  const rec2 = loyalty.loyaltyRecreditForReturn(WALK, { id: "h1-b6", total: 2000 }, 1000, true);
  const appended = [];
  const ret2 = ledger.makeEntry("Return against Bill #6", "return", "h1-b6", [
    { account: "sales_revenue", debit: 1000, credit: 0 },
    { account: "inventory", debit: 600, credit: 0 },
    { account: "loyalty_payable", debit: 0, credit: rec2.rs, ref: CUST },
    { account: "cash", debit: 0, credit: 750 },
    { account: "cogs", debit: 0, credit: 600 },
  ], { ts: T("2026-02-07") });
  ret2.loyaltyPointsReturned = rec2.points;
  WALK.push(stamp(ret2));
  appended.push(ret2);
  const clawPts2 = loyalty.loyaltyClawbackPoints({
    journal: WALK, bill: { id: "h1-b6", total: 2000 },
    refundTotalRs: 1000, priorRefundedRs: 1000, completesBill: true,
  });
  const claw2 = loyalty.buildLoyaltyClawbackEntry({
    journal: WALK, bill: { id: "h1-b6", billNo: 6, customerId: CUST },
    clawPoints: clawPts2, refId: "h1-cn-2",
    memo: "Loyalty points taken back — return on Bill #6", ts: T("2026-02-07"),
  });
  if (claw2) {
    WALK.push(stamp(claw2));
    appended.push(claw2);
  }
  recordStep("return-completing", T("2026-02-07"), appended, {
    recreditBefore: { billId: "h1-b6", billTotal: 2000, refundTotalRs: 1000, completesBill: true, quote: rec2 },
    clawPoints: clawPts2,
  });
}
// Step 6 — bill #7 spends, then voids: mirror + earn reversal.
{
  const capRs7 = loyalty.loyaltyRedeemCapRs(3000, S);
  const q7 = loyalty.loyaltyRedemptionQuote(WALK, CUST, 1000, capRs7);
  const { appended, earn: earn7 } = billWithEarn("h1-b7", 7, 3000, 1800, T("2026-02-08"),
    [{ account: "loyalty_payable", debit: q7.rs, credit: 0, ref: CUST }],
    { loyaltyPointsUsed: q7.points });
  const voidEntry = ledger.makeEntry("Bill #7 voided", "bill_void", "h1-b7", [
    { account: "sales_revenue", debit: 3000, credit: 0 },
    { account: "inventory", debit: 1800, credit: 0 },
    { account: "cash", debit: 0, credit: 2000 },
    { account: "loyalty_payable", debit: 0, credit: 1000, ref: CUST },
    { account: "cogs", debit: 0, credit: 1800 },
  ], { ts: T("2026-02-09") });
  voidEntry.loyaltyPointsReturned = 1000;
  WALK.push(stamp(voidEntry));
  appended.push(voidEntry);
  const earnBack = (earn7.points ?? 0) - loyalty.billLoyaltyClawedPoints(WALK, "h1-b7");
  const voidClaw = loyalty.buildLoyaltyClawbackEntry({
    journal: WALK, bill: { id: "h1-b7", billNo: 7, customerId: CUST },
    clawPoints: earnBack, refId: "h1-b7",
    memo: "Loyalty earn reversed — Bill #7 voided",
    ts: T("2026-02-09"), reversesId: earn7.id,
  });
  if (voidClaw) {
    WALK.push(stamp(voidClaw));
    appended.push(voidClaw);
  }
  recordStep("void-mirror", T("2026-02-09"), appended, {
    quoteBefore: { pointsWanted: 1000, capRs: capRs7, quote: q7 },
    earnEntryAfterVoid: loyalty.billLoyaltyEarnEntry(WALK, "h1-b7"),
  });
}
// Step 7 — FY close sweeps the cost, never the liability.
let fyCloseCase;
{
  const fyRange = periods.fiscalYearRange(null, "2026-02-10T00:00:00.000Z");
  const closeEntry = fiscal.buildFiscalClosingEntry(WALK, fyRange, "per-h1-1");
  // H6 (audit fix 4): stamp BEFORE the case captures the entry.
  // The committed fixture's fyCloseCase.entry.id was a wall-clock
  // id (j-mvks8hhtl, minted by makeEntry at export time) while
  // the same entry in the walk carried its stamped id (h2-e21) —
  // the file could only be reproduced by recovering that id
  // after the fact (the H4 incident). By construction now: case
  // and walk hold the one stamped id.
  if (closeEntry) stamp(closeEntry);
  fyCloseCase = {
    range: { startDate: fyRange.startDate, endDate: fyRange.endDate, fromTs: fyRange.fromTs, toTs: fyRange.toTs },
    entry: closeEntry ? { ...J(closeEntry), dayOffset: 0 } : null,
  };
  const appended = [];
  if (closeEntry) {
    WALK.push(closeEntry);
    appended.push(closeEntry);
  }
  recordStep("fy-close", "2026-02-10T00:00:00.000Z", appended, {
    expenseLoyaltyBalance: ledger.accountBalance(WALK, "expense_loyalty"),
  });
}
// Step 8 — expiry: derived due-list, owner-posted release.
let expiryCase;
{
  const at = "2027-01-05T10:00:00.000Z";
  const due = loyalty.loyaltyExpiryDue(WALK, at, CUST);
  const totalsBefore = loyalty.loyaltyProgrammeTotals(WALK, at);
  const expEntry = loyalty.buildLoyaltyExpiryEntry({
    customerId: CUST, customerName: "H1 Customer", vintage: due[0].vintage, ts: at,
  });
  expiryCase = {
    at,
    due: J(due),
    totalsBefore,
    entry: expEntry ? J(stamp(expEntry)) : null,
  };
  const appended = [];
  if (expEntry) {
    WALK.push(expEntry);
    appended.push(expEntry);
  }
  recordStep("expiry-posted", "2027-01-06T00:00:00.000Z", appended, {
    expenseLoyaltyBalance: ledger.accountBalance(WALK, "expense_loyalty"),
  });
  const spentVintage = loyalty.customerLoyalty(WALK, CUST, S, "2027-01-06T00:00:00.000Z")
    .vintages.find((v) => v.billId === "h1-b6");
  expiryCase.spentVintage = J(spentVintage);
  expiryCase.spentVintageComposesNull =
    loyalty.buildLoyaltyExpiryEntry({
      customerId: CUST, customerName: "H1 Customer", vintage: spentVintage, ts: "2027-01-06T00:00:00.000Z",
    }) === null;
}

/* ---------- guardrail quotes over the final walk journal ---------- */
const off = loyalty.resolveLoyaltySettings({});
const guardrails = {
  overBalance: loyalty.loyaltyRedemptionQuote(WALK, CUST, 999999, 100000000),
  overCap: loyalty.loyaltyRedemptionQuote(WALK, CUST, 2275, loyalty.loyaltyRedeemCapRs(100, S)),
  walkInEarn: loyalty.buildLoyaltyEarnEntry({
    journal: WALK, bill: { id: "h1-walk", billNo: 99, customerId: null, total: 5000 }, settings: S, ts: T("2026-02-10"),
  }),
  subBaseEarnQuote: loyalty.loyaltyEarnQuote(WALK, CUST, 50, S, T("2026-02-10")),
  disabledEarnQuote: loyalty.loyaltyEarnQuote(WALK, CUST, 10000, off, T("2026-02-10")),
  disabledEarn: loyalty.buildLoyaltyEarnEntry({
    journal: WALK, bill: { id: "h1-off", billNo: 98, customerId: CUST, total: 10000 }, settings: off, ts: T("2026-02-10"),
  }),
  disabledRedeemQuote: loyalty.loyaltyRedemptionQuote(WALK, CUST, 100, 100000),
  positionNow: loyalty.customerLoyalty(WALK, CUST, S, "2027-01-06T00:00:00.000Z"),
};

/* ---------- snapshot rates: a point is worth what its earn said ---------- */
const S2 = loyalty.resolveLoyaltySettings({ loyalty: { enabled: true, pointValueRs: 2 } });
const J2 = [];
{
  const b = ledger.makeEntry("Bill #1", "bill", "h1x-b1", [
    { account: "cash", debit: 10000, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 10000 },
  ], { ts: T("2026-03-01") });
  J2.push(stamp(b));
  const earn = loyalty.buildLoyaltyEarnEntry({
    journal: J2, bill: { id: "h1x-b1", billNo: 1, customerId: CUST, total: 10000 }, settings: S2, ts: T("2026-03-01"),
  });
  if (earn) J2.push(stamp(earn));
}
const snapshotCase = {
  settings: { loyalty: { enabled: true, pointValueRs: 2 } },
  journal: J(J2),
  quote: loyalty.loyaltyRedemptionQuote(J2, CUST, 100, 100000),
  position: loyalty.customerLoyalty(J2, CUST, S2, T("2026-03-01")),
};

/* ---------- clawback flooring: thirds of a 3-point earn ---------- */
const J3 = [];
const clawSeq = [];
{
  J3.push(stamp(ledger.makeEntry("Bill #1", "bill", "h1y-b1", [
    { account: "cash", debit: 300, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 300 },
  ], { ts: T("2026-03-01") })));
  const earn = loyalty.buildLoyaltyEarnEntry({
    journal: J3, bill: { id: "h1y-b1", billNo: 1, customerId: CUST, total: 300 }, settings: S, ts: T("2026-03-01"),
  });
  if (earn) J3.push(stamp(earn));
  let prior = 0;
  [false, false, true].forEach((completes, i) => {
    const pts = loyalty.loyaltyClawbackPoints({
      journal: J3, bill: { id: "h1y-b1", total: 300 },
      refundTotalRs: 100, priorRefundedRs: prior, completesBill: completes,
    });
    clawSeq.push(pts);
    const ce = loyalty.buildLoyaltyClawbackEntry({
      journal: J3, bill: { id: "h1y-b1", billNo: 1, customerId: CUST },
      clawPoints: pts, refId: `h1y-ret-${i + 1}`, memo: "clawback", ts: T("2026-03-02"),
    });
    if (ce) J3.push(stamp(ce));
    prior += 100;
  });
}
const clawbackFloorCase = {
  journal: J(J3),
  clawSeq,
  finalPoints: loyalty.customerLoyalty(J3, CUST, S, T("2026-03-03")).points,
};

/* ---------- the report + the Tally masters over the walk ---------- */
const reportCase = {
  range: { fromTs: "2026-01-01T00:00:00.000Z", toTs: "2026-03-01T00:00:00.000Z" },
  report: loyalty.loyaltyReport(WALK, { fromTs: "2026-01-01T00:00:00.000Z", toTs: "2026-03-01T00:00:00.000Z" }),
};
const tallyRange = reports.resolveReportRange("custom", null, { from: "2026-01-01", to: "2026-12-31" });
const tallyModel = tally.buildTallyExport(
  WALK,
  { customers: [{ id: CUST, name: "H1 Customer" }], suppliers: [] },
  { shopName: "Madina General Store" },
  tallyRange
);
const tallyCase = {
  range: { fromTs: tallyRange.fromTs, toTs: tallyRange.toTs },
  masters: tallyModel.masters,
};

const out = {
  about:
    "H2 core fixture — expected values computed by the compiled web lib/loyalty (+ ledger/fiscal/tally) over the H1 suite's lifecycle walk; consumed by flutter-app/test/h2_fixtures_test.dart. Regenerate: node fixtures-export-h2.js (after compiling harness/tsconfig).",
  customerId: CUST,
  settings: { loyalty: { enabled: true } },
  resolverCases,
  coaCase,
  seedCase,
  steps,
  guardrails,
  snapshotCase,
  clawbackFloorCase,
  expiryCase,
  fyCloseCase,
  reportCase,
  tallyCase,
};
const dest = path.join(__dirname, "fixtures", "h2-core.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log("wrote", dest);
