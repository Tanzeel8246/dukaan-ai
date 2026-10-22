/* Dukaan AI — verification harness (reconstructed for Phase B · B1).
 * Compiles lib/ FRESH (see tsconfig.json) and re-runs the documented
 * suites: FIN 34 · COA 10 · A2 16 · RBAC 115 · A4 56 · A5 51 = 282
 * prior checks, plus the B1 (40), B2 (39) and B3 (37) suites = 398,
 * plus the SEARCH suite (72) = 470 — null-safe search predicates
 * (49 through the B3-era fix + 23 for the deferred SuppliersManager
 * and NotesViews predicates, landed with the B4 release),
 * plus the B4 suite (34) = 504 — credit/debit notes + the
 * purchase-return engine and the amended payables subledger,
 * plus the B5 suite (38) = 542 — the cheque registry: capture /
 * deposit / clear / bounce / return identities (registry ≡ GL on
 * both cheque accounts at every step), issuance-settles-payable,
 * the F-6 compensating rows, PDC edges and the day-close
 * instrument exclusions,
 * plus the B6 suite — payment vouchers: RV-/PV- stamping on the
 * repayment / supplier-payment rows (§5.1), sequence + no-burn +
 * legacy-unaffected proofs, the journal byte-stillness of a
 * voucher-only session, and the print-data builders equalling
 * their source rows,
 * plus the REPORTS suite — the Reports section (lib/reports.ts):
 * every report builder proven equal to the screen derivation it
 * mirrors (P&L, tax position, stock, aging, both statements, the
 * account statement), range edges, EN/UR determinism, legacy-row
 * safety, and the read-only source invariants,
 * plus the C1 suite — Phase C · C1 warehouses & stock rows: the
 * entry-free stockV1 migration identity (rows sum to totals, the
 * journal + its SHA + the GL identities untouched), the §1.3
 * resolution rule, an every-path workload asserting Σ rows ==
 * stockQty after each movement, journal byte-stillness across
 * warehouses, the promise partition reproducing B2's globals, the
 * drift detector catching an injected drift + the recount repair,
 * the warehouses RBAC row, C1 i18n parity, and the additive-only
 * rules proof (strip-and-hash back to the pre-C1 file),
 * plus the C2 suite — Phase C · C2 stock transfers: the TR-
 * series (drafts burn no numbers), route/composition refusals
 * (same-warehouse, archived, unknown product), dispatch moving
 * rows with the journal byte-still, in-transit derived exactly,
 * partial receives summing to the unit, over-receipt refused
 * pre-composition, the close-short loss posting exactly
 * (short × costPrice, class-account seam) with §1.3's identity
 * restored, return-to-source, the §2.5 period-lock scenario
 * (receive ungated, loss gated at today), the transfer-aware
 * drift detector + recount, the demo draft seed, RBAC, i18n
 * parity and the additive-only rules proof,
 * plus the C3 suite — Phase C · C3 product class & BOM: the
 * `inventoryAccountFor` resolver + the `classLegLines` split
 * (the no-raw byte-identical regression at template level), the
 * raw/mixed purchase legs with tax untouched, raw sale + counter
 * + return mirrors, purchase-return split, the reclass builder
 * (flip with stock / at zero / negative, identities after), the
 * class identities replayed over a mixed workload, BOM draft
 * validation + immutable versioning + standard costs, the demo
 * BOM seed (fresh seed class-free), the manufacturing RBAC row,
 * C3 i18n parity, source invariants (v13 demo bump; still 24
 * makeEntry calls in the store — the reclass composes in
 * lib/transfers) and the additive-only rules proof (strip the
 * C3 block → the pre-C3 file's SHA),
 * plus the C4 suite — Phase C · C4 production orders: the
 * recipe snapshot (mid-order BOM edit never re-costs), the full
 * worked production (issue split across class accounts with
 * labour paid from the till → partial completion → scrap →
 * final completion, GL wip == Σ pools asserted at every step,
 * the roll-up to the paisa), the accrued-labour scenario
 * (salary_payable, no money line) with a nothing-produced
 * closeout, over-production spreading the whole pool, the
 * closeout residual exact, the paisa scenario (33.33 + 33.34 +
 * 33.33 == 100), the refusal set (empty pool, insufficient at
 * the ORDER warehouse, zero value, no account, closed orders),
 * PR- numbering, the demo draft seed, RBAC, i18n parity
 * (+87 keys → 1,839), source invariants (v14 demo bump; the
 * C3 boms-subscription repair; still 24 makeEntry calls) and
 * the additive-only rules proof (strip the C4 block → the
 * pre-C4 file's SHA),
 * plus the C5 suite — Phase C · C5 job tracker: the stage
 * lifecycle derivation (defaults, custom lists, sticky terminal
 * states, renamed-away stages), JB- numbering (born numbered),
 * material issue/return through the real lib/jobs compositions
 * (Dr cogs / Cr the class account at shelf cost, rows + totals +
 * GL moving together, the refusal set), the pooled advance
 * identity (the journal diff of a job advance is EXACTLY one
 * ordinary repayment entry, the pool goes negative, the citing
 * bill's F-6 lot absorbs it), the citing-bill citation
 * discipline (only POSTED citing bills count as revenue), the
 * §5.5 profit figure hand-computed over a mixed scenario (and
 * revenue 0 for an unbilled job), the demo seed job, the
 * jobTracker RBAC row AS DECLARED, C5 i18n parity (+119 keys →
 * 1,958), source invariants (v15 demo bump; still 24 makeEntry
 * calls) and the additive-only rules proof (strip the C5 block
 * → the pre-C5 file's SHA).
 * The FIX suite (37) covers the live-audit fixes (2026-10-22):
 * the P&L ≡ sales-report revenue identity over the seed and a
 * synthetic mixed workload (templates composed through the REAL
 * makeEntry guard), the labelled 8,500 reconciling line for a
 * legacy journal-only revenue entry, the Rs 375 counter-sale
 * bucketing case, outflowPreview against the seed's −45,000
 * Wallet & Bank, expense register ≡ cash-book dates, the trial
 * balance's balanced state + frozen closings, walk-in bill
 * search, and the FIX i18n keys. It also carries the amended
 * i18n count pins (tr 74 · mfg 131 · total 1,992 EN ≡ UR — the
 * UX overhaul's +11 and this increment's +23, amended in the
 * established same-check style).
 * The D1 suite covers ERP Phase D · D1 — declarations, employees
 * & attendance (NO postings): the additive `loans_receivable`
 * code (the COA literal above amended 27 → 28 in the same
 * style), the seven declared Phase D refTypes + the PAY-/LN-
 * series defaults, the §1.4 proration fixtures reproduced to
 * hand-computed figures, the §2.2 salary_payable composition
 * identity over a synthetic journal mixing employee-ref lines
 * with a C4-style ref-less accrual (GL ≡ Σ positions + the
 * unassigned bucket, to the paisa), attendance tallies + the
 * mark cycle, the staffDirectory RBAC cells AS DECLARED, the
 * zero-journal-footprint demo seed (2 employees + the current
 * month's register; the frozen seed identities re-asserted),
 * D1 i18n parity (103 hr keys; the total pin above amended
 * 1,992 → 2,098), and the additive-only rules proof (strip the
 * D1 blocks → the v6 file's SHA).
 * The D2 suite covers ERP Phase D · D2 — payroll runs, payments,
 * advances, slips (design §2): run lines composed by the REAL
 * `buildRunLines` from fixture employees + attendance (the §1.4
 * proration snapshotted), desk overrides through
 * `payrollLineTotals` (gross/net derived, never stored twice),
 * the finalise accrual composed by the REAL builder (NET per
 * employee, refs on both lines, ΣDr expense_salary == run net,
 * reducer deductions NOWHERE in the journal), the
 * one-posted-run-per-month guard + caps as store-source proofs,
 * partial payments, the advance → accrual → payment sequence
 * with the §2.7 slip figures derived by `runLineFigures`
 * (advanceBefore / recovered / stillOwed to the paisa), the
 * composition identity after MIXED traffic (payroll + a
 * C4-shaped ref-less accrual + advance + bucket payment — GL ≡
 * Σ employees + unassigned bucket at every step), payment and
 * run reversals (positions restored; a reversed run's payments
 * STAND as advance positions, §2.6), period-lock refusal for a
 * backdated accrual/payment through the real preparePosting,
 * the payroll RBAC cells, the demo DRAFT seed (zero journal
 * footprint; frozen identities re-asserted), D2 i18n parity
 * (+114 keys; the total pin above amended 2,098 → 2,212), source
 * invariants (still 24 makeEntry calls in the store — D2's
 * entries compose in lib/payroll) and the additive-only rules
 * proof (strip the D2 block → the D1-state file's SHA).
 * Store-level templates that
 * cannot execute headless are replicated line-faithfully from source
 * and composed through the REAL makeEntry guard (which throws on
 * imbalance), exactly as the original harnesses did. */
"use strict";
const fs = require("fs");
const crypto = require("crypto");
const assert = require("assert");

const ledger = require("./out/ledger.js");
const seed = require("./out/seed.js");
const coa = require("./out/coa.js");
const perm = require("./out/permissions.js");
const tax = require("./out/tax.js");
const periods = require("./out/periods.js");
const docs = require("./out/documents.js");
const selectors = require("./out/selectors.js");
const search = require("./out/search.js");
const cheques = require("./out/cheques.js");
const reports = require("./out/reports.js");
const stock = require("./out/stock.js");
const transfers = require("./out/transfers.js");
const boms = require("./out/boms.js");
const production = require("./out/production.js");
const jobs = require("./out/jobs.js");
const payroll = require("./out/payroll.js");
const i18n = require("./out/i18n/index.js");

/* ------------------------------- framework ------------------------------- */
let cur = null;
const suites = [];
function suite(name, expected) {
  cur = { name, expected, pass: 0, fail: 0, failures: [] };
  suites.push(cur);
}
function check(cond, label) {
  if (cond) cur.pass++;
  else {
    cur.fail++;
    cur.failures.push(label);
    console.log(`  FAIL [${cur.name}] ${label}`);
  }
}
const eq = (a, b) => Math.abs(a - b) < 0.005;
const sum = (arr) => arr.reduce((x, y) => x + y, 0);

/* ------------------------------- seed data ------------------------------- */
const products = seed.getSeedProducts();
const sales = seed.getSeedSales();
const purchases = seed.getSeedPurchases();
const payments = seed.getSeedSupplierPayments();
const expenses = seed.getSeedExpenses();
const credits = seed.getSeedCredits();
const customers = seed.getSeedCustomers();
const journal = seed.getSeedJournal(products, sales, purchases, payments, expenses, credits);
const accounts = seed.getSeedAccounts();
const byId = (arr, id) => arr.find((x) => x.id === id);

/* =============================== FIN (34) =============================== */
suite("FIN", 34);
{
  // F-1: the balance guard is enforced in makeEntry.
  let threw = false;
  try {
    ledger.makeEntry("bad", "sale", null, [
      { account: "cash", debit: 100, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 99 },
    ]);
  } catch { threw = true; }
  check(threw, "F-1 unbalanced entry throws");

  const zero = ledger.makeEntry("zero", "sale", null, [
    { account: "cash", debit: 0, credit: 0 },
  ]);
  check(zero.lines.length === 0 && ledger.entryBalances(zero), "F-1 zero-only entry legal");

  // Seed integrity (F-12 identities).
  check(journal.length === 21, "seed journal has 21 entries");
  check(journal.every((e) => ledger.entryBalances(e)), "every seed entry balances");
  check(eq(ledger.accountBalance(journal, "inventory"), 272805), "journal Inventory == 272,805");
  check(eq(ledger.cashBalance(journal), 50000) && seed.SEED_OPENING_TILL === 50000, "journal Cash == opening till 50,000");
  check(eq(ledger.payablesTotal(journal), 27900), "payables == 27,900");
  check(eq(ledger.receivablesTotal(journal), 5500), "receivables == 5,500");
  check(
    eq(sum(coa.ACCOUNT_CODES.map((c) => ledger.accountBalance(journal, c))), 0),
    "trial balance == 0"
  );

  // F-2: tolerance difference booked as an explicit discount line.
  const over = ledger.makeEntry("bill 166.5 paid 167", "sale", null, [
    { account: "cash", debit: 167, credit: 0 },
    { account: "cogs", debit: 100, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 166.5 },
    { account: "inventory", debit: 0, credit: 100 },
    { account: "sales_discount", debit: 0, credit: 0.5 },
  ]);
  check(ledger.entryBalances(over), "F-2 overpayment entry balances exactly");
  const under = ledger.makeEntry("bill 1000 paid 999", "sale", null, [
    { account: "cash", debit: 999, credit: 0 },
    { account: "sales_discount", debit: 1, credit: 0 },
    { account: "cogs", debit: 600, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 1000 },
    { account: "inventory", debit: 0, credit: 600 },
  ]);
  const discLine = under.lines.find((l) => l.account === "sales_discount");
  check(ledger.entryBalances(under) && discLine && eq(discLine.debit, 1), "F-2 underpayment books Dr discount 1");

  // F-3: cumulative discount allocation across item-by-item returns.
  const subtotal = 300, discount = 100;
  let reversedSoFar = 0, refunds = 0; const shares = [];
  for (let i = 0; i < 3; i++) {
    const cumGross = (i + 1) * 100;
    const share = Math.round((discount * cumGross) / subtotal) - reversedSoFar;
    shares.push(share); reversedSoFar += share; refunds += 100 - share;
  }
  check(eq(refunds, 200), "F-3 item-by-item refunds total exactly 200");
  check(eq(sum(shares), 100), "F-3 discount reversed exactly 100");
  const oldShares = [0, 0, 0].map(() => Math.round((discount * 100) / subtotal));
  check(eq(sum(oldShares.map((s) => 100 - s)), 201), "F-3 control: old per-event formula over-refunds 201");

  // F-4 (audit S6): buy 10@100 -> reprice 120 (revaluation) -> sell out.
  const s6 = [
    ledger.makeEntry("buy", "purchase", null, [
      { account: "purchases", debit: 1000, credit: 0 },
      { account: "inventory", debit: 1000, credit: 0 },
      { account: "purchases", debit: 0, credit: 1000 },
      { account: "payables", debit: 0, credit: 1000 },
    ]),
    ledger.makeEntry("revalue", "adjustment", null, [
      { account: "inventory", debit: 200, credit: 0 },
      { account: "capital", debit: 0, credit: 200 },
    ]),
    ledger.makeEntry("sell out", "sale", null, [
      { account: "cash", debit: 1500, credit: 0 },
      { account: "cogs", debit: 1200, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 1500 },
      { account: "inventory", debit: 0, credit: 1200 },
    ]),
  ];
  check(eq(ledger.accountBalance(s6, "inventory"), 0), "F-4 reprice-then-sell-out leaves Inventory 0");

  // F-5: seeded expenses are reversible by refId across refTypes.
  const elec = expenses.find((e) => e.amount === 8450);
  const rent = expenses.find((e) => e.amount === 25000);
  const elecEntry = ledger.findUnreversedPosting(journal, elec.id);
  check(!!elecEntry && elecEntry.refType === "seed", "F-5 finder locates the seeded electricity posting");
  const acctOf = (entry) => entry.lines.find((l) => l.debit > 0).account;
  const netForRef = (entries, refId, acct) =>
    sum(entries.filter((e) => e.refId === refId).flatMap((e) => e.lines.filter((l) => l.account === acct).map((l) => l.debit - l.credit)));
  const swap = (entry, refType) =>
    ledger.makeEntry("reversal", refType, entry.refId,
      entry.lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit })),
      { reversesId: entry.id });
  const elecAcct = acctOf(elecEntry);
  const edited = [...journal, swap(elecEntry, "expense"),
    ledger.makeEntry("repost", "expense", elec.id, [
      { account: elecAcct, debit: 9000, credit: 0 },
      { account: "cash", debit: 0, credit: 9000 },
    ])];
  check(eq(netForRef(edited, elec.id, elecAcct), 9000), "F-5 seeded expense edit nets exactly 9,000");
  const deleted = [...journal, swap(elecEntry, "expense")];
  check(eq(netForRef(deleted, elec.id, elecAcct), 0), "F-5 seeded expense delete nets 0");
  const rentEntry = ledger.findUnreversedPosting(journal, rent.id);
  const rentDeleted = [...journal, swap(rentEntry, "expense")];
  check(eq(netForRef(rentDeleted, rent.id, acctOf(rentEntry)), 0), "F-5 seeded rent delete nets 0");

  // F-6: bill-linked udhaar outstanding under FIFO repayment allocation.
  const mkCredit = (patch) => ({
    id: patch.id, customerId: "c1", customerName: "A", customerPhone: "1",
    kind: "credit", amount: 0, note: "", billId: null, dayOffset: 0,
    ts: "2026-10-01T00:00:00.000Z", ...patch,
  });
  const bill1 = { id: "b1", customerId: "c1", customerName: "A", customerPhone: "1" };
  const repaid = [
    mkCredit({ id: "cr1", amount: 1000, billId: "b1" }),
    mkCredit({ id: "rp1", kind: "repayment", amount: 1000 }),
  ];
  const pos = ledger.billCreditOutstanding(repaid, bill1);
  check(eq(pos.outstanding, 0), "F-6 fully repaid bill: outstanding 0");
  check(eq(pos.repaidAllocated, 1000), "F-6 repaid allocated 1,000");
  const partial = [
    mkCredit({ id: "cr1", amount: 1000, billId: "b1" }),
    mkCredit({ id: "rp1", kind: "repayment", amount: 400 }),
  ];
  check(eq(ledger.billCreditOutstanding(partial, bill1).outstanding, 600), "F-6 partial repayment: outstanding 600");
  const withReversal = [
    mkCredit({ id: "cr1", amount: 1000, billId: "b1" }),
    mkCredit({ id: "cr2", amount: -300, billId: "b1" }),
  ];
  check(eq(ledger.billCreditOutstanding(withReversal, bill1).outstanding, 700), "F-6 return reversal nets: outstanding 700");

  // F-7: the seed's standalone udhaar is a cash loan, not revenue.
  const cr1 = credits.find((c) => c.amount === 8500) ?? credits[0];
  const cr1Entry = journal.find((e) => e.refId === cr1.id);
  check(
    !!cr1Entry &&
      cr1Entry.lines.some((l) => l.account === "cash" && eq(l.credit, 8500)) &&
      !cr1Entry.lines.some((l) => l.account === "sales_revenue"),
    "F-7 standalone udhaar credits cash, never revenue"
  );

  // F-9: dashboard profit uses the sale's cost snapshot.
  const p1 = { id: "p1", costPrice: 130 };
  const saleSnap = [{ productId: "p1", qty: 2, unitPrice: 500, unitCost: 100, total: 1000, dayOffset: 0 }];
  check(eq(selectors.profitOnDay(saleSnap, 0, [p1]), 800), "F-9 profit uses unitCost snapshot (800)");
  const saleNoSnap = [{ productId: "p1", qty: 2, unitPrice: 500, total: 1000, dayOffset: 0 }];
  check(eq(selectors.profitOnDay(saleNoSnap, 0, [p1]), 740), "F-9 seed-shaped rows fall back to product cost (740)");

  // F-11: adjustments clamp to the shelf before posting.
  check(ledger.appliedAdjustmentDelta(4, -10) === -4, "F-11 (4,-10) -> -4");
  check(ledger.appliedAdjustmentDelta(4, -3) === -3, "F-11 (4,-3) -> -3");
  check(ledger.appliedAdjustmentDelta(4, 7) === 7, "F-11 (4,+7) -> +7");

  // F-14: top-up opening entry from the subledgers.
  const topUp = seed.getTopUpOpeningEntry(products, credits, purchases, payments);
  check(!!topUp && ledger.entryBalances(topUp), "F-14 top-up entry balances");
  check(eq(ledger.accountBalance([topUp], "inventory"), 272805), "F-14 inventory 272,805");
  check(eq(ledger.accountBalance([topUp], "receivables"), 5500), "F-14 receivables 5,500");
  check(eq(-ledger.accountBalance([topUp], "payables"), 27900), "F-14 payables 27,900");
  check(eq(-ledger.accountBalance([topUp], "capital"), 250405), "F-14 capital credit 250,405");
}

/* =============================== COA (10) =============================== */
suite("COA", 10);
{
  /* Phase D · D1 amended this literal (same check): the registry
   * gained its ONE Phase D code additively — `loans_receivable`
   * (design §3.1) — 27 → 28. The v1/A counts below are untouched. */
  check(coa.ACCOUNT_CODES.length === 28, "registry holds 28 codes");
  const v1 = Object.entries(coa.CHART_OF_ACCOUNTS).filter(([, m]) => m.since === "v1").map(([c]) => c);
  check(v1.length === 17, "17 v1 codes frozen");
  const phaseA = Object.entries(coa.CHART_OF_ACCOUNTS).filter(([, m]) => m.since === "A").map(([c]) => c);
  check(phaseA.length === 10, "10 Phase A codes added");
  check(coa.normalBalanceSign("tax_payable") === -1, "tax_payable is credit-normal");
  check(coa.normalBalanceSign("tax_input") === 1, "tax_input is debit-normal");
  check(
    coa.normalBalanceSign("inventory") === 1 && coa.normalBalanceSign("sales_revenue") === -1,
    "inventory debit-normal, revenue credit-normal"
  );
  check(coa.isAccountCode("cogs") === true, "isAccountCode accepts a real code");
  check(coa.isAccountCode("bogus") === false, "isAccountCode rejects an unknown code");
  check(coa.accountMeta("capital").type === "equity", "capital typed equity");
  check(
    coa.ACCOUNT_CODES.every((c) => {
      const m = coa.accountMeta(c);
      return !!m && typeof m.type === "string" &&
        (m.normalBalance === null ? coa.normalBalanceSign(c) === 1 : (m.normalBalance === "credit") === (coa.normalBalanceSign(c) === -1));
    }),
    "every code's meta agrees with its normal-balance sign"
  );
}

/* ================================ A2 (16) =============================== */
suite("A2", 16);
{
  const till = byId(accounts, seed.SEED_ACCOUNT_IDS.till);
  const walletLegacy = byId(accounts, seed.SEED_ACCOUNT_IDS.walletLegacy);
  const jazz = byId(accounts, seed.SEED_ACCOUNT_IDS.jazzcash);
  const easy = byId(accounts, seed.SEED_ACCOUNT_IDS.easypaisa);
  const bank = byId(accounts, seed.SEED_ACCOUNT_IDS.bank);
  check(accounts.length === 5, "five seeded money accounts");
  check(
    [till, walletLegacy, jazz, easy, bank].every(Boolean) &&
      new Set(accounts.map((a) => a.id)).size === 5,
    "fixed account ids, unique"
  );
  check(till.legacyFor === "cash" && till.kind === "cash" && till.method === "cash", "Main Till is the cash legacy account");
  check(walletLegacy.legacyFor === "wallet", "Wallet & Bank is the wallet legacy account");
  check(eq(ledger.moneyAccountBalance(journal, till), 50000), "Main Till == GL cash 50,000");
  check(
    eq(ledger.moneyAccountBalance(journal, walletLegacy), ledger.walletBalance(journal)),
    "Wallet & Bank == GL wallet"
  );
  check(eq(ledger.walletBalance(journal), -45000), "GL wallet == -45,000 on seed data");
  check(
    eq(ledger.accountsBucketBalance(journal, accounts, "cash"), ledger.cashBalance(journal)),
    "invariant: cash bucket per-account sum == GL"
  );
  check(
    eq(ledger.accountsBucketBalance(journal, accounts, "wallet"), ledger.walletBalance(journal)),
    "invariant: wallet bucket per-account sum == GL"
  );
  // Transfer inside one bucket (wallet->wallet): GL-neutral, accounts move.
  const tIn = ledger.makeEntry("transfer", "transfer", null, [
    { account: "wallet", debit: 5000, credit: 0, ref: easy.id },
    { account: "wallet", debit: 0, credit: 5000, ref: jazz.id },
  ]);
  const j2 = [...journal, tIn];
  check(
    eq(ledger.walletBalance(j2), ledger.walletBalance(journal)) &&
      eq(ledger.moneyAccountBalance(j2, easy) - ledger.moneyAccountBalance(journal, easy), 5000) &&
      eq(ledger.moneyAccountBalance(j2, jazz) - ledger.moneyAccountBalance(journal, jazz), -5000),
    "wallet->wallet transfer moves exactly the amount, GL-neutral"
  );
  // Transfer across buckets (till -> bank).
  const tX = ledger.makeEntry("transfer", "transfer", null, [
    { account: "wallet", debit: 7000, credit: 0, ref: bank.id },
    { account: "cash", debit: 0, credit: 7000, ref: till.id },
  ]);
  const j3 = [...journal, tX];
  check(
    eq(ledger.cashBalance(j3) - ledger.cashBalance(journal), -7000) &&
      eq(ledger.walletBalance(j3) - ledger.walletBalance(journal), 7000),
    "cross-bucket transfer moves both GL buckets by the amount"
  );
  check(
    eq(ledger.moneyAccountBalance(j3, till) - ledger.moneyAccountBalance(journal, till), -7000) &&
      eq(ledger.moneyAccountBalance(j3, bank) - ledger.moneyAccountBalance(journal, bank), 7000),
    "cross-bucket transfer moves the two accounts by the amount"
  );
  check(ledger.defaultAccountForMethod(accounts, "jazzcash")?.id === jazz.id, "default for JazzCash is its account");
  check(ledger.defaultAccountForMethod(accounts, "cash")?.id === till.id, "default for cash is the till");
  const book = ledger.accountBook(journal, till);
  check(
    book.length > 0 && eq(book[book.length - 1].balance, 50000),
    "till cash book runs to the journal balance"
  );
  const preToday = journal.filter((e) => e.dayOffset !== 0);
  const opening = ledger.moneyAccountBalance(preToday, till);
  check(
    eq(ledger.expectedCloseForAccount(journal, till, opening), ledger.moneyAccountBalance(journal, till)),
    "day-close expectation == journal balance"
  );
}

/* ============================== RBAC (115) ============================== */
suite("RBAC", 115);
{
  // R-2: manager IS legacy staff, module for module (26).
  for (const m of perm.CURRENT_MODULES) {
    check(perm.accessOf("manager", m) === perm.LEGACY_STAFF_ACCESS[m], `manager == legacy: ${m}`);
  }
  // Owner is unrestricted across all 40 rows.
  for (const m of Object.keys(perm.PERMISSION_MATRIX)) {
    check(perm.accessOf("owner", m) === "full", `owner full: ${m}`);
  }
  // Role resolution defaults to the legacy profile (manager).
  check(perm.resolveStaffRole(undefined) === "manager", "resolve undefined -> manager");
  check(perm.resolveStaffRole(null) === "manager", "resolve null -> manager");
  check(perm.resolveStaffRole("cashier") === "cashier", "resolve cashier");
  check(perm.resolveStaffRole("bogus") === "manager", "resolve bogus -> manager");
  check(perm.resolveStaffRole("accountant") === "accountant", "resolve accountant");
  // can() semantics — spot rows incl. the Phase B rows B1 relies on.
  const spots = [
    ["accountant", "quotations", "view", true],
    ["accountant", "quotations", "write", false],
    ["cashier", "quotations", "write", true],
    ["cashier", "purchaseOrders", "write", false],
    ["accountant", "purchaseOrders", "view", true],
    ["cashier", "finance", "view", false],
    ["accountant", "finance", "write", true],
    ["manager", "billingVoid", "write", true],
    ["cashier", "billingVoid", "write", false],
    ["accountant", "salesCounter", "view", false],
    ["none", "dashboard", "view", false],
    ["owner", "periods", "write", true],
    ["manager", "periods", "view", false],
    ["accountant", "taxSlabs", "view", true],
    ["accountant", "taxSlabs", "write", false],
    ["cashier", "creditRepayment", "write", true],
    ["manager", "accountsManage", "view", false],
    ["accountant", "cheques", "write", true],
    ["cashier", "cheques", "view", false],
  ];
  for (const [r, m, a, want] of spots) {
    check(perm.can(r, m, a) === want, `can(${r}, ${m}, ${a}) === ${want}`);
  }
  check(perm.canBrowseJournal("owner") === true, "journal browse: owner");
  check(perm.canBrowseJournal("manager") === true, "journal browse: manager");
  check(perm.canBrowseJournal("accountant") === true, "journal browse: accountant");
  check(perm.canBrowseJournal("cashier") === false, "journal browse: cashier denied");
  // Migration backfill (design SS6.1).
  const NOW = "2026-10-22T00:00:00.000Z";
  const bf1 = perm.backfillStaff({ staffEmails: ["a@x"], staff: [], indexRoles: {}, now: NOW });
  check(bf1.staff.length === 1 && bf1.staff[0].role === "manager" && bf1.indexRoleWrites.length === 0,
    "backfill: bare email becomes manager, no index write");
  const bf2 = perm.backfillStaff({
    staffEmails: ["a@x"], staff: [{ email: "a@x", role: "cashier", addedAt: NOW }],
    indexRoles: { "a@x": "manager" }, now: NOW,
  });
  check(bf2.staff[0].role === "cashier", "backfill: existing staff[] role wins");
  const bf3 = perm.backfillStaff({ staffEmails: ["a@x"], staff: [], indexRoles: { "a@x": "accountant" }, now: NOW });
  check(bf3.staff[0].role === "accountant" && bf3.indexRoleWrites.length === 0,
    "backfill: valid index role adopted, not rewritten");
  const bf4 = perm.backfillStaff({ staffEmails: ["a@x"], staff: [], indexRoles: { "a@x": "boss" }, now: NOW });
  check(bf4.staff[0].role === "manager" && bf4.indexRoleWrites.length === 1 && bf4.indexRoleWrites[0].role === "manager",
    "backfill: invalid index role repaired to manager");
  const bf5 = perm.backfillStaff({ staffEmails: ["a@x"], staff: bf1.staff, indexRoles: {}, now: NOW });
  check(JSON.stringify(bf5.staff) === JSON.stringify(bf1.staff), "backfill: idempotent");
  const bf6 = perm.backfillStaff({ staffEmails: [], staff: [], indexRoles: {}, now: NOW });
  check(bf6.staff.length === 0 && bf6.indexRoleWrites.length === 0, "backfill: empty in, empty out");
  // Matrix integrity.
  check(Object.keys(perm.PERMISSION_MATRIX).length === 40, "matrix has 40 rows");
  check(perm.CURRENT_MODULES.length === 26, "26 current modules");
  check(
    Object.values(perm.PERMISSION_MATRIX).every((row) =>
      ["owner", "manager", "cashier", "accountant"].every((r) => ["full", "read", "none"].includes(row[r]))),
    "every row grades all four roles"
  );
  check(perm.accessOf("cashier", "creditDebitNotes") === "none", "G-2 row: notes cashier none");
  check(perm.accessOf("accountant", "creditDebitNotes") === "full", "G-2 row: notes accountant full");
  // Phase B-D pre-declared rows.
  check(perm.accessOf("manager", "quotations") === "full", "quotations manager full");
  check(perm.accessOf("accountant", "quotations") === "read", "quotations accountant read");
  check(perm.accessOf("cashier", "saleOrders") === "full", "saleOrders cashier full");
  check(perm.accessOf("accountant", "saleOrders") === "read", "saleOrders accountant read");
  check(perm.accessOf("manager", "purchaseOrders") === "full", "purchaseOrders manager full");
  check(perm.accessOf("accountant", "vouchers") === "full", "vouchers accountant full");
  check(perm.accessOf("cashier", "vouchers") === "full", "vouchers cashier full");
  check(perm.accessOf("manager", "cheques") === "full", "cheques manager full");
  check(perm.accessOf("cashier", "jobTracker") === "read", "jobTracker cashier read");
  check(perm.accessOf("manager", "payroll") === "read", "payroll manager read");
}

/* ================================ A4 (56) =============================== */
suite("A4", 56);
{
  const GST = { id: "gst", name: "GST 17%", kind: "percent", rate: 17, appliesTo: "both", inclusive: false, active: true };
  const GSTI = { ...GST, id: "gsti", name: "GST incl", inclusive: true };
  const FIX = { id: "fix", name: "Levy", kind: "fixed", rate: 10, appliesTo: "both", inclusive: false, active: true };
  const FIXI = { ...FIX, id: "fixi", inclusive: true };
  const S = (patch) => ({ defaultSalesTaxSlabId: null, defaultPurchaseTaxSlabId: null, ...patch });
  const prod = (patch) => ({ taxSlabId: undefined, taxExempt: false, ...patch });

  // Design worked example — taxed sale (Sigma 5,492).
  const saleTax = tax.computeBillTaxes([{ total: 2600, qty: 1, slab: GST }], 0);
  check(eq(saleTax.taxAmount, 442), "worked sale: tax 442");
  check(eq(saleTax.total, 3042), "worked sale: customer total 3,042");
  const saleEntry = ledger.makeEntry("taxed sale", "sale", null, [
    { account: "cash", debit: 3042, credit: 0 },
    { account: "cogs", debit: 2450, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 2600 },
    { account: "tax_payable", debit: 0, credit: 442 },
    { account: "inventory", debit: 0, credit: 2450 },
  ]);
  check(
    ledger.entryBalances(saleEntry) && eq(sum(saleEntry.lines.map((l) => l.debit)), 5492),
    "worked sale: entry balances at Sigma 5,492"
  );
  check(
    eq(saleTax.exclusiveTax, 442) && eq(saleTax.inclusiveTax, 0) && eq(saleTax.subtotal, 2600),
    "worked sale: exclusive only, revenue base untouched"
  );
  // Design worked example — taxed purchase (Sigma 86,800).
  const purTax = tax.computePurchaseTaxes([{ total: 40000, qty: 1, slab: GST }]);
  check(eq(purTax.taxAmount, 6800), "worked purchase: tax 6,800");
  check(eq(purTax.grossTotal, 46800), "worked purchase: gross owed 46,800");
  check(eq(purTax.netTotal, 40000), "worked purchase: stock enters at net 40,000");
  const purEntry = ledger.makeEntry("taxed purchase", "purchase", null, [
    { account: "purchases", debit: 40000, credit: 0 },
    { account: "tax_input", debit: 6800, credit: 0 },
    { account: "inventory", debit: 40000, credit: 0 },
    { account: "purchases", debit: 0, credit: 40000 },
    { account: "payables", debit: 0, credit: 46800 },
  ]);
  check(
    ledger.entryBalances(purEntry) && eq(sum(purEntry.lines.map((l) => l.debit)), 86800),
    "worked purchase: entry balances at Sigma 86,800"
  );

  // Resolution matrix (design SS2.2).
  check(tax.resolveTaxSlab(prod({ taxExempt: true, taxSlabId: "gst" }), [GST], S({ defaultSalesTaxSlabId: "gst" }), "sales") === null,
    "resolve: exempt product never taxed");
  check(tax.resolveTaxSlab(prod({ taxSlabId: "gst" }), [GST, GSTI], S({ defaultSalesTaxSlabId: "gsti" }), "sales")?.id === "gst",
    "resolve: product slab wins over default");
  check(tax.resolveTaxSlab(prod({}), [GST], S({ defaultSalesTaxSlabId: "gst" }), "sales")?.id === "gst",
    "resolve: shop default applies");
  check(tax.resolveTaxSlab(prod({ taxSlabId: "gst" }), [{ ...GST, active: false }, GSTI], S({ defaultSalesTaxSlabId: "gsti" }), "sales")?.id === "gsti",
    "resolve: inactive product slab falls through to default");
  check(tax.resolveTaxSlab(prod({}), [{ ...GST, active: false }], S({ defaultSalesTaxSlabId: "gst" }), "sales") === null,
    "resolve: inactive default switches tax off");
  check(tax.resolveTaxSlab(prod({}), [{ ...GST, appliesTo: "sales" }], S({ defaultPurchaseTaxSlabId: "gst" }), "purchases") === null,
    "resolve: sales-only slab ignored for purchases");
  check(tax.resolveTaxSlab(prod({}), [GST], S({ defaultPurchaseTaxSlabId: "gst" }), "purchases")?.id === "gst",
    "resolve: both-direction slab applies to purchases");
  check(tax.resolveTaxSlab(prod({}), [GST], S({}), "sales") === null, "resolve: no configuration, no tax");
  check(tax.resolveTaxSlab(prod({ taxSlabId: "gone" }), [GST], S({ defaultSalesTaxSlabId: "gst" }), "sales")?.id === "gst",
    "resolve: dangling product slab id falls back to default");

  // Discount base + pro-rata discipline.
  const discTax = tax.computeBillTaxes([{ total: 1000, qty: 1, slab: GST }], 100);
  check(eq(discTax.taxAmount, 153), "tax computed on the post-discount base (153)");
  const pr = tax.allocateProRata([100, 300], 100);
  check(eq(pr[0], 25) && eq(pr[1], 75), "pro-rata split 25/75");
  check(eq(sum(tax.allocateProRata([100, 100, 100], 100)), 100), "pro-rata shares sum exactly (F-3 discipline)");
  const twoLine = tax.computeBillTaxes(
    [{ total: 600, qty: 1, slab: GST }, { total: 400, qty: 1, slab: GST }], 100);
  check(eq(twoLine.taxAmount, 153), "two-line discount spread: tax 153");
  check(twoLine.lines[0].slab?.id === "gst" && eq(twoLine.lines[0].base, 540), "line snapshot: slab + post-discount base 540");

  // Inclusive + fixed slabs.
  const incl = tax.computeBillTaxes([{ total: 1170, qty: 1, slab: GSTI }], 0);
  check(eq(incl.taxAmount, 170), "inclusive sale: tax extracted 170");
  check(eq(incl.total, 1170) && eq(incl.inclusiveTax, 170) && eq(incl.exclusiveTax, 0),
    "inclusive sale: customer total unchanged");
  const inclPur = tax.computePurchaseTaxes([{ total: 1170, qty: 1, slab: GSTI }]);
  check(eq(inclPur.netTotal, 1000) && eq(inclPur.grossTotal, 1170), "inclusive purchase: net 1,000, gross 1,170");
  check(eq(tax.lineTaxAmount(500, 5, FIX), 50), "fixed slab: rate x qty");
  const fixPur = tax.computePurchaseTaxes([{ total: 550, qty: 5, slab: FIXI }]);
  check(eq(fixPur.taxAmount, 50) && eq(fixPur.netTotal, 500) && eq(fixPur.grossTotal, 550),
    "fixed inclusive purchase: extracted, gross = sticker");
  const fixSale = tax.computeBillTaxes([{ total: 500, qty: 5, slab: FIX }], 0);
  check(eq(fixSale.taxAmount, 50) && eq(fixSale.total, 550), "fixed exclusive sale adds on top");

  // Mixed cart + return reversal discipline.
  const mixed = tax.computeBillTaxes(
    [{ total: 500, qty: 1, slab: null }, { total: 500, qty: 1, slab: GST }], 0);
  check(eq(mixed.taxAmount, 85), "mixed cart: only the taxed line is taxed");
  const bill170 = { id: "bt", items: [{ productId: "p1", qty: 4, total: 1000, taxAmount: 170, taxInclusive: false }] };
  let priors = [];
  for (let i = 0; i < 4; i++) {
    const sh = tax.returnTaxShares(bill170, priors, [{ productId: "p1", qty: 1, total: 250 }]);
    check(eq(sh.taxShare, 42.5), `return ${i + 1} of 4: tax share 42.50`);
    priors = [...priors, { items: [{ productId: "p1", total: 250, taxAmount: sh.taxShare }] }];
  }
  const billOdd = { id: "bo", items: [{ productId: "p1", qty: 3, total: 900, taxAmount: 169.83, taxInclusive: false }] };
  let priors2 = []; const oddShares = [];
  for (let i = 0; i < 3; i++) {
    const sh = tax.returnTaxShares(billOdd, priors2, [{ productId: "p1", qty: 1, total: 300 }]);
    oddShares.push(sh.taxShare);
    priors2 = [...priors2, { items: [{ productId: "p1", total: 300, taxAmount: sh.taxShare }] }];
  }
  check(eq(sum(oddShares), 169.83), "odd-paisa returns reverse exactly 169.83 in total");
  check(oddShares.every((s) => eq(s, 56.61)), "odd-paisa shares are 56.61 each");
  const fullRet = tax.returnTaxShares(bill170, [], [{ productId: "p1", qty: 4, total: 1000 }]);
  check(eq(fullRet.taxShare, 170), "one-shot full return reverses the full tax");
  const exemptRet = tax.returnTaxShares(
    { id: "be", items: [{ productId: "p2", qty: 1, total: 500, taxAmount: 0, taxInclusive: false }] },
    [], [{ productId: "p2", qty: 1, total: 500 }]);
  check(eq(exemptRet.taxShare, 0), "returning an exempt line reverses exactly zero");
  const halfRet = tax.returnTaxShares(bill170, [], [{ productId: "p1", qty: 2, total: 500 }]);
  check(eq(halfRet.taxShare, 85), "half-gross return reverses half the tax");
  const billIncl = { id: "bi", items: [{ productId: "p1", qty: 4, total: 1000, taxAmount: 170, taxInclusive: true }] };
  const inclRet = tax.returnTaxShares(billIncl, [], [{ productId: "p1", qty: 1, total: 250 }]);
  check(eq(inclRet.inclusiveTaxShare, 42.5) && eq(inclRet.exclusiveTaxShare, 0),
    "inclusive return share stays on the inclusive side");

  // Tax position + receipt grouping (one derivation, one data set).
  const posEntries = [saleEntry, ledger.makeEntry("taxed purchase (input)", "purchase", null, [
    { account: "tax_input", debit: 170, credit: 0 },
    { account: "payables", debit: 0, credit: 170 },
  ])];
  const pos = tax.taxPosition(posEntries, new Date());
  check(eq(pos.outputTax, 442), "tax position: output 442");
  check(eq(pos.inputTax, 170), "tax position: input 170");
  check(eq(pos.netPayable, 272), "tax position: net payable 272");
  check(eq(pos.outputThisMonth, 442) && eq(pos.inputThisMonth, 170), "tax position: month movements");
  const paid = [...posEntries, ledger.makeEntry("tax payment", "tax_payment", null, [
    { account: "tax_payable", debit: 272, credit: 0 },
    { account: "cash", debit: 0, credit: 272 },
  ])];
  check(eq(tax.taxPosition(paid, new Date()).netPayable, 0), "tax payment settles the position to 0");
  const billGroups = { id: "bg", items: [
    { productId: "p1", qty: 1, total: 1000, taxAmount: 170, taxSlabId: "gst", taxSlabName: "GST 17%", taxRate: 17, taxKind: "percent", taxInclusive: false },
    { productId: "p2", qty: 1, total: 500, taxAmount: 85, taxSlabId: "gst", taxSlabName: "GST 17%", taxRate: 17, taxKind: "percent", taxInclusive: false },
  ]};
  const groups = tax.billTaxLines(billGroups);
  check(groups.length === 1 && eq(groups[0].amount, 255), "receipt groups tax per slab (255)");
  const billTwoSlabs = { id: "bg2", items: [...billGroups.items,
    { productId: "p3", qty: 1, total: 200, taxAmount: 20, taxSlabId: "fix", taxSlabName: "Levy", taxRate: 10, taxKind: "fixed", taxInclusive: false }] };
  check(tax.billTaxLines(billTwoSlabs).length === 2, "receipt shows one line per slab used");
  check(tax.billTaxLines({ id: "bg3", items: [{ productId: "p1", qty: 1, total: 100, taxAmount: 0 }] }).length === 0,
    "no-tax receipt carries no tax lines");

  // No-tax path collapses to the pre-A4 formulas.
  const noTax = tax.computeBillTaxes([{ total: 500, qty: 2, slab: null }], 0);
  check(eq(noTax.taxAmount, 0) && eq(noTax.total, 500), "no-tax bill: identity");
  const noTaxPur = tax.computePurchaseTaxes([{ total: 500, qty: 2, slab: null }]);
  check(eq(noTaxPur.taxAmount, 0) && eq(noTaxPur.netTotal, 500) && eq(noTaxPur.grossTotal, 500),
    "no-tax purchase: net == gross");
  // The no-tax seed journal fingerprint. NOTE (B1 reconstruction):
  // the A4-era harness's exact normalization string was ephemeral
  // and is lost; the normalization below (drop the wall-clock `ts`,
  // keep ids/memo/refs/dayOffset/lines) is the recorded B1 baseline.
  // The money content itself is pinned independently by the FIN
  // suite's identity checks and by journal length 21.
  const normalized = journal.map((e) => {
    const { ts, ...rest } = e; return rest;
  });
  const sha = crypto.createHash("sha256").update(JSON.stringify(normalized), "utf8").digest("hex");
  check(sha === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "seed journal fingerprint (B1-recorded normalization) unchanged");

  // Misc engine edges.
  check(tax.round2(0.125) === 0.13 && tax.round2(169.83) === 169.83, "round2 half-up at the paisa");
  check(eq(tax.lineTaxAmount(200, 1, GST), 34), "lineTaxAmount percent exclusive");
  check(eq(discTax.total, 1053), "bill total = subtotal - discount + exclusive tax (1,053)");
  check(
    JSON.stringify(tax.allocateProRata([], 100)) === "[]" &&
      JSON.stringify(tax.allocateProRata([0, 0], 50)) === "[0,0]",
    "pro-rata degenerates safely");
  const sampleSlabs = seed.getSeedTaxSlabs();
  check(sampleSlabs.length >= 1 && sampleSlabs.every((s) => !s.active), "seeded sample slab ships inactive (tax off)");
  check(tax.resolveTaxSlab(prod({}), [GST], S({ defaultPurchaseTaxSlabId: "gst" }), "purchases")?.id === "gst",
    "resolve: purchase default honoured for purchases");
}

/* ================================ A5 (51) =============================== */
suite("A5", 51);
{
  // PKT business-date edges.
  check(periods.businessDateISO("2026-10-22T00:30:00.000Z") === "2026-10-22", "biz date: 00:30Z is 05:30 PKT, same day");
  check(periods.businessDateISO("2026-10-22T18:59:59.000Z") === "2026-10-22", "biz date: 18:59Z is 23:59 PKT, same day");
  check(periods.businessDateISO("2026-10-22T19:00:00.000Z") === "2026-10-23", "biz date: 19:00Z is midnight PKT, next day");
  check(periods.businessDateISO("2026-10-21T19:00:00.000Z") === "2026-10-22", "biz date: previous UTC evening is today PKT");
  check(periods.todayPktISO(new Date("2026-10-22T19:30:00.000Z")) === "2026-10-23", "todayPktISO rolls at PKT midnight");
  check(periods.startOfDayPktInstant("2026-10-22") === "2026-10-21T19:00:00.000Z", "PKT day starts 19:00Z");
  check(periods.endOfDayPktInstant("2026-10-22") === "2026-10-22T18:59:59.999Z", "PKT day ends 18:59:59.999Z");

  // Lock boundary semantics.
  const LOCK = periods.endOfDayPktInstant("2026-10-20");
  check(periods.isPeriodLocked("", "2026-10-20T00:00:00.000Z") === false, "no lock: nothing is locked");
  check(periods.isPeriodLocked(LOCK, "2026-10-20T10:00:00.000Z") === true, "posting inside the locked day refused");
  check(periods.isPeriodLocked(LOCK, LOCK) === true, "posting exactly at the lock instant refused");
  check(periods.isPeriodLocked(LOCK, "2026-10-21T00:00:00.000Z") === false, "posting after the lock day allowed");
  let lockErr = null;
  try { periods.assertPeriodOpen(LOCK, "2026-10-19T00:00:00.000Z"); } catch (e) { lockErr = e; }
  check(!!lockErr && periods.isPeriodLockedError(lockErr), "assertPeriodOpen throws PeriodLockedError");
  let openOk = true;
  try { periods.assertPeriodOpen(LOCK, "2026-10-21T00:00:00.000Z"); } catch { openOk = false; }
  check(openOk, "assertPeriodOpen passes in the open period");
  const stamped = periods.preparePosting(
    ledger.makeEntry("s", "sale", null, [
      { account: "cash", debit: 10, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 10 },
    ], { ts: "2026-10-15T10:00:00.000Z" }), "");
  check(stamped.dateISO === "2026-10-15", "preparePosting stamps dateISO from ts");
  const prestamped = periods.preparePosting({ ...stamped, dateISO: "2026-01-01" }, "");
  check(prestamped.dateISO === "2026-01-01", "preparePosting preserves an existing dateISO");
  let prepThrew = false;
  try {
    periods.preparePosting(
      ledger.makeEntry("s", "sale", null, [
        { account: "cash", debit: 10, credit: 0 },
        { account: "sales_revenue", debit: 0, credit: 10 },
      ], { ts: "2026-10-19T10:00:00.000Z" }), LOCK);
  } catch { prepThrew = true; }
  check(prepThrew, "preparePosting refuses a backdated entry under lock");

  // Lock display + the close rail (R-5: never today/yesterday).
  check(periods.lockedThroughDate(LOCK) === "2026-10-20", "lockedThroughDate reads the lock date back");
  check(periods.lockedThroughDate("") === "", "lockedThroughDate of no lock is empty");
  const NOW = new Date("2026-10-22T10:00:00.000Z"); // 15:00 PKT, 22 Oct
  check(periods.maxClosableDateISO(NOW) === "2026-10-20", "max closable = day before yesterday (PKT)");
  check(periods.canCloseThroughDate("2026-10-20", NOW) === true, "closing through 20 Oct allowed");
  check(periods.canCloseThroughDate("2026-10-21", NOW) === false, "closing through yesterday refused (rail)");
  check(periods.canCloseThroughDate("2026-10-22", NOW) === false, "closing through today refused (rail)");
  check(periods.canCloseThroughDate("not-a-date", NOW) === false, "invalid close date refused");

  // Corrections never backdate (design SS5.2).
  const nowTs = "2026-10-22T09:00:00.000Z";
  check(
    periods.correctionDating(LOCK, "2026-10-10T10:00:00.000Z", "2026-10-10T10:00:00.000Z", 12, nowTs).ts === nowTs,
    "correction of a locked original posts today");
  check(
    periods.correctionDating(LOCK, "2026-10-21T10:00:00.000Z", "2026-10-15T10:00:00.000Z", 7, nowTs).ts === nowTs,
    "correction targeting a locked date posts today");
  const kept = periods.correctionDating(LOCK, "2026-10-21T10:00:00.000Z", "2026-10-21T12:00:00.000Z", 1, nowTs);
  check(kept.ts === "2026-10-21T12:00:00.000Z" && kept.dayOffset === 1, "open-period correction keeps its date");
  const orig = ledger.makeEntry("elec", "expense", "exp1", [
    { account: "expense_electricity", debit: 8450, credit: 0 },
    { account: "cash", debit: 0, credit: 8450 },
  ], { ts: "2026-10-10T10:00:00.000Z" });
  const origSnapshot = JSON.stringify(orig);
  const reversal = ledger.makeEntry("reversal", "expense", "exp1",
    orig.lines.map((l) => ({ account: l.account, debit: l.credit, credit: l.debit })),
    { reversesId: orig.id, ts: nowTs });
  const repost = ledger.makeEntry("repost", "expense", "exp1", [
    { account: "expense_electricity", debit: 9000, credit: 0 },
    { account: "cash", debit: 0, credit: 9000 },
  ], { ts: nowTs });
  check(JSON.stringify(orig) === origSnapshot, "locked original stays byte-untouched by its correction");
  check(
    eq(ledger.accountBalance([orig, reversal, repost], "expense_electricity"), 9000),
    "correction at today's date nets exactly the new amount");

  // Reopen restores posting date-by-date.
  const REOPENED = periods.endOfDayPktInstant("2026-10-15");
  check(periods.isPeriodLocked(REOPENED, "2026-10-18T00:00:00.000Z") === false, "after reopen, 18 Oct posts again");
  check(periods.isPeriodLocked(REOPENED, "2026-10-14T00:00:00.000Z") === true, "after reopen, 14 Oct stays locked");

  // Fiscal year (PK default 1 July).
  check(JSON.stringify(periods.fiscalStartOf(null)) === JSON.stringify({ month: 7, day: 1 }), "fiscal default is 1 July");
  check(JSON.stringify(periods.fiscalStartOf({ fiscalYearStartMonth: 4, fiscalYearStartDay: 1 })) === JSON.stringify({ month: 4, day: 1 }),
    "fiscal start honours settings");
  check(periods.fiscalStartDateInYear({ month: 2, day: 31 }, 2027) === "2027-02-28", "start day clamps to short months");
  const fyNow = periods.currentFiscalYear(null, NOW);
  check(fyNow.startDate === "2026-07-01", "current FY starts 2026-07-01");
  check(fyNow.endDate === "2027-06-30", "current FY ends 2027-06-30");
  check(periods.previousFiscalYear(null, NOW).startDate === "2025-07-01", "previous FY starts 2025-07-01");
  check(periods.fiscalYearRange(null, "2027-01-15T00:00:00.000Z").startDate === "2026-07-01",
    "January belongs to the FY that began last July");
  check(periods.fiscalYearRange({ fiscalYearStartMonth: 4, fiscalYearStartDay: 1 }, "2027-02-10T00:00:00.000Z").startDate === "2026-04-01",
    "April-start FY: February belongs to the FY begun last April");
  check(
    fyNow.fromTs === periods.startOfDayPktInstant("2026-07-01") && fyNow.toTs === periods.startOfDayPktInstant("2027-07-01"),
    "FY bounds are PKT day-edge instants");
  check(periods.fiscalYearRange(null, "2026-06-30T18:59:59.000Z").startDate === "2025-07-01",
    "the last PKT instant of June still belongs to the old FY");

  // P&L range windows run the same computation as the month P&L.
  const plEntries = [
    ledger.makeEntry("aug sale", "sale", null, [
      { account: "cash", debit: 1000, credit: 0 },
      { account: "cogs", debit: 600, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 1000 },
      { account: "inventory", debit: 0, credit: 600 },
    ], { ts: "2026-08-05T10:00:00.000Z" }),
    ledger.makeEntry("aug rent", "expense", null, [
      { account: "expense_rent", debit: 200, credit: 0 },
      { account: "cash", debit: 0, credit: 200 },
    ], { ts: "2026-08-06T10:00:00.000Z" }),
    ledger.makeEntry("next fy sale", "sale", null, [
      { account: "cash", debit: 5000, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 5000 },
    ], { ts: "2027-08-05T10:00:00.000Z" }),
  ];
  const fyRange = periods.fiscalYearRange(null, "2026-10-22T10:00:00.000Z");
  const plFy = ledger.profitAndLossInRange(plEntries, fyRange.fromTs, fyRange.toTs);
  check(eq(plFy.revenue, 1000), "FY P&L: revenue inside the window only");
  check(eq(plFy.cogs, 600) && eq(plFy.grossProfit, 400), "FY P&L: cogs + gross profit");
  check(eq(plFy.expensesTotal, 200) && eq(plFy.expensesByCategory.rent, 200), "FY P&L: expenses by category");
  check(eq(plFy.net, 200), "FY P&L: net");
  const plNext = ledger.profitAndLossInRange(plEntries, fyRange.toTs, "2028-07-01T00:00:00.000Z");
  check(eq(plNext.revenue, 5000), "next FY window sees only its own revenue");
  const plMonth = ledger.profitAndLoss(plEntries, new Date("2026-08-20T00:00:00.000Z"));
  check(eq(plMonth.revenue, 1000) && eq(plMonth.net, 200), "month P&L unchanged (same computation)");

  // Small helpers.
  check(periods.addDaysISO("2026-10-20", 2) === "2026-10-22", "addDaysISO basic");
  check(periods.addDaysISO("2026-10-31", 1) === "2026-11-01", "addDaysISO month edge");
  check(periods.isValidDateISO("2026-02-29") === false, "2026 is not a leap year");
  check(periods.isValidDateISO("2028-02-29") === true, "2028 is a leap year");
  check(
    new Date(periods.endOfDayPktInstant("2026-10-22")).getTime() -
      new Date(periods.startOfDayPktInstant("2026-10-22")).getTime() === 86399999,
    "a PKT day spans exactly 86,399,999 ms");
}

/* ============================ B1 (Phase B) ============================ */
suite("B1", null); // new suite: reports its own count
{
  const fsx = fs;
  const storeSrc = fsx.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  const docsSrc = fsx.readFileSync("/home/hatch/workspace/ai-dukaan-ai/web/lib/documents.ts", "utf8");
  const NT = { defaultSalesTaxSlabId: null, defaultPurchaseTaxSlabId: null };

  /* ---- zero-posting proof ---- */
  check(!/from "\.\/ledger"/.test(docsSrc), "documents.ts imports no ledger (pure derivations only)");
  const regionStart = storeSrc.indexOf("const createQuotation");
  const regionEnd = storeSrc.indexOf("/* ---------------- suppliers", regionStart);
  const region = storeSrc.slice(regionStart, regionEnd);
  check(regionStart > 0 && regionEnd > regionStart, "document-actions region located in StoreProvider");
  check(
    !region.includes("makeEntry") && !region.includes("postEntry") &&
      !region.includes("guardPostings") && !region.includes("batchJournal"),
    "zero-posting: no document action reaches a posting primitive");
  // B2 widened the allowed set with the increment's own collection
  // (deliveryChallans). The assertion's substance is unchanged: the
  // document-actions region may never write a money or subledger
  // collection.
  const putTargets = new Set([...region.matchAll(/putDoc\("(\w+)"/g)].map((m) => m[1]));
  check(
    [...putTargets].every(
      (n) => n === "quotations" || n === "saleOrders" || n === "deliveryChallans"),
    "zero-posting: document actions write ONLY their own collections");
  const cobStart = storeSrc.indexOf("const convertOrderToBill");
  const cob = storeSrc.slice(cobStart, regionEnd);
  check(
    cob.includes("setBillDraft") && !cob.includes("makeEntry") && !cob.includes('putDoc("bills"'),
    "convert-to-bill only prepares an in-memory desk draft (posts nothing)");
  // The full document lifecycle, exercised through the pure library
  // over seed-shaped state, leaves every money collection identical.
  const moneyBefore = JSON.stringify({ journal, sales, products });
  const simProducts = products.map((p) => ({ id: p.id, taxSlabId: p.taxSlabId, taxExempt: p.taxExempt }));
  const simTotals = docs.estimateDocTotals(
    [{ productId: products[0].id, qty: 3, total: 3 * products[0].salePrice }],
    "flat", 0, simProducts, [], NT);
  check(simTotals.total > 0, "lifecycle simulation composes document totals");
  check(JSON.stringify({ journal, sales, products }) === moneyBefore,
    "zero-posting: journal/sales/stock byte-identical across the lifecycle");

  /* ---- numbering (design SS1.3) ---- */
  check(docs.nextDocNumber("quotation", [], NT) === "QT-1", "numbering: first mint is QT-1");
  check(docs.nextDocNumber("quotation", [null, "QT-1"], NT) === "QT-2", "numbering: drafts (null) burn no numbers");
  check(docs.nextDocNumber("quotation", ["QT-1", "QT-2"], NT) === "QT-3", "numbering: sequential");
  check(docs.nextDocNumber("saleOrder", ["SO-1", "SO-2"], NT) === "SO-3",
    "numbering: each series mints from its own collection (the store passes only that series' numbers)");
  check(
    docs.nextDocNumber("quotation", ["QT-3"], { ...NT, docSeries: { quotation: "EST-" } }) === "EST-4",
    "numbering: owner prefix override, sequence stays monotonic across the change");
  check(docs.parseSeriesSeq("QT-12") === 12, "parseSeriesSeq reads the trailing integer");
  check(docs.parseSeriesSeq("Draft") === null, "parseSeriesSeq: no digits, no sequence");
  // Interleaved creates: within one subscribed list, minting is
  // unique; two devices racing from one snapshot may duplicate a
  // number (the design's accepted caveat) but the series then
  // continues from the merged maximum.
  const list = [];
  for (let i = 0; i < 5; i++) list.push(docs.nextDocNumber("quotation", list, NT));
  check(new Set(list).size === 5 && list[4] === "QT-5", "numbering: no duplicates within one list");
  const deviceA = docs.nextDocNumber("quotation", ["QT-1"], NT);
  const deviceB = docs.nextDocNumber("quotation", ["QT-1"], NT);
  check(
    docs.nextDocNumber("quotation", ["QT-1", deviceA, deviceB], NT) === "QT-3",
    "numbering: merged racing lists continue from the maximum");

  /* ---- estimates (design SS7) ---- */
  const p0 = { id: products[0].id, taxSlabId: undefined, taxExempt: false };
  const estFlat = docs.estimateDocTotals([{ productId: p0.id, qty: 2, total: 500 }], "flat", 50, [p0], [], NT);
  check(eq(estFlat.subtotal, 500) && eq(estFlat.discountAmount, 50) && eq(estFlat.estimatedTax, 0) && eq(estFlat.total, 450),
    "estimate: no-tax total = subtotal - discount");
  const estPct = docs.estimateDocTotals([{ productId: p0.id, qty: 2, total: 500 }], "percent", 10, [p0], [], NT);
  check(eq(estPct.discountAmount, 50), "estimate: percent discount follows the house rule");
  const estCap = docs.estimateDocTotals([{ productId: p0.id, qty: 2, total: 500 }], "percent", 150, [p0], [], NT);
  check(eq(estCap.discountAmount, 500) && eq(estCap.total, 0), "estimate: discount capped at subtotal");
  const GST = { id: "gst", name: "GST 17%", kind: "percent", rate: 17, appliesTo: "both", inclusive: false, active: true };
  const estTaxed = docs.estimateDocTotals(
    [{ productId: p0.id, qty: 1, total: 2600 }], "flat", 0, [p0], [GST],
    { defaultSalesTaxSlabId: "gst", defaultPurchaseTaxSlabId: null });
  const direct = tax.computeBillTaxes([{ total: 2600, qty: 1, slab: GST }], 0);
  check(eq(estTaxed.estimatedTax, direct.taxAmount) && eq(estTaxed.total, direct.total),
    "estimate: tax figure IS the bill engine's figure at today's resolution");
  const estOff = docs.estimateDocTotals(
    [{ productId: p0.id, qty: 1, total: 2600 }], "flat", 0, [p0], [{ ...GST, active: false }],
    { defaultSalesTaxSlabId: "gst", defaultPurchaseTaxSlabId: null });
  check(eq(estOff.estimatedTax, 0), "estimate: slab switched off -> estimate follows (never promised)");

  /* ---- fulfilment derivation + lifecycles (SS2.1 / SS1.4) ---- */
  const line = (patch) => ({ productId: "p1", name: "P1", qty: 10, unitPrice: 100, total: 1000, ...patch });
  const quote = { id: "q1", status: "issued", validUntil: null, lines: [line({})] };
  const orderFrom = (qty, status) => ({
    id: "o1", status, source: { type: "quotation", id: "q1" },
    lines: [line({ qty, total: qty * 100, sourceProductId: "p1" })],
  });
  check(eq(docs.quotationConvertedQty(quote, [orderFrom(4, "open")]).get("p1"), 4),
    "derivation: quotation converted qty comes from citing orders");
  check(eq(docs.quotationConvertedQty(quote, [orderFrom(4, "cancelled")]).get("p1") ?? 0, 0),
    "derivation: a cancelled order converts nothing");
  check(docs.deriveQuotationStatus(quote, [orderFrom(4, "open")]) === "issued",
    "lifecycle: partial conversion leaves the quotation issued");
  check(docs.deriveQuotationStatus(quote, [orderFrom(10, "open")]) === "converted",
    "lifecycle: full conversion derives converted");
  check(docs.displayQuotationStatus({ ...quote, validUntil: "2026-10-21" }, [], "2026-10-22") === "expired",
    "lifecycle: past validity displays expired (derived, never stored)");
  check(docs.displayQuotationStatus({ ...quote, validUntil: "2026-10-23" }, [], "2026-10-22") === "issued",
    "lifecycle: validity in future stays issued");

  const order = { id: "o9", status: "open", lines: [line({})] };
  const mkBill = (status, items, patch) => ({
    status, sourceType: "order", sourceId: "o9", items, ...patch,
  });
  const billItems = (qty, patch) => [{ productId: "p1", qty, ...patch }];
  check(docs.deriveOrderStatus({ ...order, status: "draft" }, []) === "draft", "lifecycle: draft order passes through");
  check(docs.deriveOrderStatus(order, []) === "open", "lifecycle: confirmed order with no bills is open");
  check(docs.deriveOrderStatus(order, [mkBill("paid", billItems(4))]) === "partially_fulfilled",
    "lifecycle: partial bill derives partially_fulfilled");
  check(docs.deriveOrderStatus(order, [mkBill("paid", billItems(10))]) === "fulfilled",
    "lifecycle: full bill derives fulfilled");
  check(eq(docs.orderBilledQty(order, [mkBill("held", billItems(10))]).get("p1") ?? 0, 0),
    "derivation: a held (unposted) bill fulfils nothing");
  check(eq(docs.orderBilledQty(order, [mkBill("voided", billItems(10))]).get("p1") ?? 0, 0),
    "derivation: a voided bill fulfils nothing");
  const challan = { id: "dc1", orderId: "o9", status: "billed", lines: [] };
  const viaChallan = mkBill("paid", billItems(6), { sourceType: "challan", sourceId: "dc1" });
  check(eq(docs.orderBilledQty(order, [viaChallan], [challan]).get("p1"), 6),
    "derivation: one hop bill -> challan -> order counts");
  check(eq(docs.orderBilledQty(order, [mkBill("paid", [{ productId: "px", sourceProductId: "p1", qty: 3 }])]).get("p1"), 3),
    "derivation: child lines key on sourceProductId (parent line identity)");
  check(docs.remainingQty(10, new Map([["p1", 14]]), "p1") === 0, "derivation: remaining never negative");

  /* ---- convert-to-bill posts exactly once, through the desk engine ---- */
  // The desk composition for a converted line at the AGREED price
  // (450) rather than the shelf price (500), replicated from
  // priceLines + postBill and composed through the real makeEntry:
  // exactly one balanced entry, revenue at the agreed total.
  const agreedEntry = ledger.makeEntry("bill (converted)", "sale", null, [
    { account: "cash", debit: 1350, credit: 0 },
    { account: "cogs", debit: 900, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 1350 },
    { account: "inventory", debit: 0, credit: 900 },
  ]);
  const composed = [agreedEntry];
  check(composed.length === 1 && ledger.entryBalances(agreedEntry),
    "convert-to-bill: completing the draft posts exactly one balanced entry");
  const revLine = agreedEntry.lines.find((l) => l.account === "sales_revenue");
  check(eq(revLine.credit, 1350), "convert-to-bill: revenue at the AGREED price (3 x 450), not the shelf price");

  /* ---- demo discoverability seeds (design SS10) ---- */
  const seedQuotes = seed.getSeedQuotations(customers, products);
  check(
    seedQuotes.length === 1 && seedQuotes[0].number === "QT-1" && seedQuotes[0].status === "issued" &&
      eq(seedQuotes[0].total, sum(seedQuotes[0].lines.map((l) => l.total))),
    "seed: one issued demo quotation QT-1, totals consistent");
  const seedOrders = seed.getSeedSaleOrders(customers, products);
  check(
    seedOrders.length === 1 && seedOrders[0].number === "SO-1" && seedOrders[0].status === "open" &&
      eq(seedOrders[0].total, sum(seedOrders[0].lines.map((l) => l.total))),
    "seed: one open demo order SO-1, totals consistent");
}

/* ===================== B2 (Phase B) =====================
 * Delivery challans + the conversion seam. Challans are
 * NON-POSTING delivery documents (design §2.2, §2.5): zero journal
 * entries, zero stock movement, zero receivables. Stock and money
 * move only when a challan's goods are BILLED, through the one
 * posting engine, exactly once. Fulfilment derives through the
 * one-hop chain bill -> challan -> order (§2.1); the reservation
 * report (§2.5) is derived the same way. */
suite("B2", null);
{
  const fsx = fs;

  /* ---- zero-posting proof for challans (§2.2 discipline) ---- */
  const storeSrc2 = fsx.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx",
    "utf8"
  );
  const chStart = storeSrc2.indexOf("const createChallan");
  const chEnd = storeSrc2.indexOf("/* ---------------- suppliers", chStart);
  const chRegion = storeSrc2.slice(chStart, chEnd);
  check(chStart > 0 && chEnd > chStart, "challan-actions region located in StoreProvider");
  check(
    !chRegion.includes("makeEntry") &&
      !chRegion.includes("postEntry") &&
      !chRegion.includes("guardPostings") &&
      !chRegion.includes("batchJournal"),
    "zero-posting: no challan action reaches a posting primitive"
  );
  const chPut = new Set([...chRegion.matchAll(/putDoc\("(\w+)"/g)].map((m) => m[1]));
  check(
    [...chPut].every((n) => n === "deliveryChallans"),
    "zero-posting: challan CRUD writes ONLY deliveryChallans"
  );
  const convStart = storeSrc2.indexOf("const convertChallanToBill");
  const convRegion = storeSrc2.slice(convStart, chEnd);
  check(
    convRegion.includes("setBillDraft") &&
      !convRegion.includes("putDoc(") &&
      !convRegion.includes("makeEntry"),
    "conversion seam: challan/quotation -> bill only prepares in-memory desk drafts"
  );
  check(
    (chRegion.match(/can\(roleRef\.current, "saleOrders", "write"\)/g) || []).length >= 7,
    "G-1: every challan action gates on the saleOrders matrix row"
  );
  check(
    storeSrc2.includes("deriveChallanStatus(challan, billsWithPosted)") &&
      storeSrc2.includes('"deliveryChallans", challanStatusUpdate.id'),
    "conversion seam: postBill recomputes the challan status inside the posting batch"
  );

  /* ---- numbering: the DC- series shares the B1 machinery ---- */
  const NT2 = { defaultSalesTaxSlabId: null, defaultPurchaseTaxSlabId: null };
  check(docs.nextDocNumber("challan", [], NT2) === "DC-1", "numbering: first challan mint is DC-1");
  check(
    docs.nextDocNumber("challan", [null, "DC-1"], NT2) === "DC-2",
    "numbering: challan drafts burn no numbers (draft carries null)"
  );

  /* ---- G-1 RBAC spot rows (challans ride the saleOrders row) ---- */
  check(
    perm.accessOf("cashier", "saleOrders") === "full" &&
      perm.accessOf("manager", "saleOrders") === "full",
    "G-1: cashier/manager full on the chain row (challans ride it)"
  );
  check(
    perm.accessOf("accountant", "saleOrders") === "read",
    "G-1: accountant read-only on the chain row"
  );

  /* ---- §2.6 worked example, end to end (one hop) ---- */
  const order7 = {
    id: "so7", number: "SO-7", status: "open",
    lines: [{ productId: "oil", name: "Cooking Oil 5L", qty: 10, unitPrice: 2600, total: 26000 }],
  };
  // The challan's own line carries the shelf price at issue (2,700);
  // the bill must honour the ORDER's agreed 2,600 (design §2.4).
  const challan21 = {
    id: "dc21", number: "DC-21", orderId: "so7", status: "dispatched",
    lines: [{ productId: "oil", name: "Cooking Oil 5L", qty: 10, unitPrice: 2700, total: 27000, sourceProductId: "oil" }],
  };
  const moneyBefore2 = JSON.stringify({ journal, sales, products });
  const exTax = tax.computeBillTaxes([{ total: 26000, qty: 10, slab: null }], 0);
  check(eq(exTax.total, 26000) && eq(exTax.taxAmount, 0), "worked example: no default slab at bill time -> no tax");
  const exEntry = ledger.makeEntry("Bill — converted from DC-21", "bill", "b-ex", [
    { account: "cash", debit: exTax.total, credit: 0 },
    { account: "cogs", debit: 24500, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 26000 },
    { account: "inventory", debit: 0, credit: 24500 },
  ]);
  check(ledger.entryBalances(exEntry), "worked example §2.6: the bill's entry balances");
  check(eq(exEntry.lines.reduce((a, l) => a + l.debit, 0), 50500), "worked example §2.6: Dr == Cr == 50,500 (agreed 26,000 + COGS 24,500)");
  const exBill = {
    id: "b-ex", status: "paid", sourceType: "challan", sourceId: "dc21",
    items: [{ productId: "oil", qty: 10, sourceProductId: "oil" }],
  };
  check(eq(docs.challanBilledQty(challan21, [exBill]).get("oil"), 10), "one hop: the challan is fully billed by its citing bill");
  check(eq(docs.orderBilledQty(order7, [exBill], [challan21]).get("oil"), 10), "one hop: the order sees the bill THROUGH its challan");
  check(docs.deriveOrderStatus(order7, [exBill], [challan21]) === "fulfilled", "one hop: order derives fulfilled from the challan's bill alone");
  check(docs.deriveChallanStatus(challan21, [exBill]) === "billed", "one hop: challan derives billed");
  check(
    docs.remainingQty(10, docs.orderBilledQty(order7, [exBill], [challan21]), "oil") === 0,
    "double conversion refused by derivation: the 10 billed via the challan leave 0 billable directly"
  );
  check(
    JSON.stringify({ journal, sales, products }) === moneyBefore2,
    "zero-posting: seed journal/sales/stock byte-identical across the whole challan lifecycle"
  );

  /* ---- tax re-resolves at bill time (§2.4) ---- */
  const oilProducts = [{ id: "oil", taxSlabId: null, taxExempt: false }];
  const estAtOrder = docs.estimateDocTotals(order7.lines, "flat", 0, oilProducts, [], NT2);
  check(eq(estAtOrder.estimatedTax, 0), "tax at bill time: the order's estimate was 0 under the old resolution (never promised)");
  // The owner creates a GST 17% exclusive slab and makes it the
  // default AFTER the order; the converted bill must carry it.
  const GST17 = { id: "gst17", name: "GST 17%", rate: 17, mode: "exclusive", appliesTo: "both", active: true };
  const billTax = tax.computeBillTaxes([{ total: 26000, qty: 10, slab: GST17 }], 0);
  const tpEntry = ledger.makeEntry("Bill — tax re-resolved", "bill", "b-tax", [
    { account: "cash", debit: billTax.total, credit: 0 },
    { account: "cogs", debit: 24500, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 26000 },
    { account: "tax_payable", debit: 0, credit: billTax.taxAmount },
    { account: "inventory", debit: 0, credit: 24500 },
  ]);
  check(ledger.entryBalances(tpEntry), "tax at bill time: entry with the NEW slab balances");
  const tpLine = tpEntry.lines.find((l) => l.account === "tax_payable");
  check(
    tpLine && eq(tpLine.credit, 4420) && eq(billTax.total, 30420),
    "tax at bill time: bill carries the NEW 17% tax (4,420; total 30,420), not the stale estimate"
  );

  /* ---- partial chains: order 10 -> challan 4 -> bill 4, then
   *      direct 6; the billed 4 cannot be billed again (§7 B2) ---- */
  const order10 = {
    id: "so10", status: "open",
    lines: [{ productId: "rice", name: "Rice Basmati 5kg", qty: 10, unitPrice: 500, total: 5000 }],
  };
  const ch4 = {
    id: "dc4", orderId: "so10", status: "dispatched",
    lines: [{ productId: "rice", name: "Rice Basmati 5kg", qty: 4, unitPrice: 500, total: 2000, sourceProductId: "rice" }],
  };
  const billVia = (id, qty) => ({
    id, status: "paid", sourceType: "challan", sourceId: "dc4",
    items: [{ productId: "rice", qty, sourceProductId: "rice" }],
  });
  const billDirect = (id, qty) => ({
    id, status: "paid", sourceType: "order", sourceId: "so10",
    items: [{ productId: "rice", qty, sourceProductId: "rice" }],
  });
  check(eq(docs.orderDeliveredQty(order10, [ch4]).get("rice"), 4), "partial chain: 4 of 10 delivered on the challan");
  const pb1 = billVia("pb1", 4);
  check(eq(docs.orderBilledQty(order10, [pb1], [ch4]).get("rice"), 4), "partial chain: order billed 4 via the challan");
  check(docs.deriveChallanStatus(ch4, [pb1]) === "billed", "partial chain: the challan (all its 4) derives billed");
  check(
    docs.remainingQty(10, docs.orderBilledQty(order10, [pb1], [ch4]), "rice") === 6,
    "partial chain: exactly 6 remain billable directly from the order"
  );
  const pb2 = billDirect("pb2", 6);
  check(
    docs.deriveOrderStatus(order10, [pb1, pb2], [ch4]) === "fulfilled",
    "partial chain: direct bill of the remaining 6 fulfils the order"
  );
  check(
    docs.remainingQty(4, docs.challanBilledQty(ch4, [pb1, pb2]), "rice") === 0,
    "partial chain: the billed 4 cannot be billed again through the challan"
  );
  const ceiling = [billDirect("bd6", 6), billVia("bv4", 4)];
  check(
    eq(docs.orderBilledQty(order10, ceiling, [ch4]).get("rice"), 10),
    "ceiling: direct 6 + via-challan 4 totals the order's 10 — never 14"
  );

  /* ---- one challan billed across two bills sums exactly ---- */
  const chBig = {
    id: "dcB", orderId: null, status: "dispatched",
    lines: [{ productId: "rice", name: "Rice Basmati 5kg", qty: 10, unitPrice: 500, total: 5000 }],
  };
  const sb1 = { id: "sb1", status: "paid", sourceType: "challan", sourceId: "dcB", items: [{ productId: "rice", qty: 4 }] };
  check(docs.deriveChallanStatus(chBig, [sb1]) === "partially_billed", "partial billing: first bill derives partially_billed");
  const sb2 = { id: "sb2", status: "paid", sourceType: "challan", sourceId: "dcB", items: [{ productId: "rice", qty: 6 }] };
  check(
    docs.deriveChallanStatus(chBig, [sb1, sb2]) === "billed" &&
      eq(docs.challanBilledQty(chBig, [sb1, sb2]).get("rice"), 10),
    "partial billing: the two bills sum exactly to the challan's 10"
  );

  /* ---- reservation derivation (§2.5), hand-computed ----
   * Shelf: A 12, B 5. Order ro1 (open): A×10, B×2. A draft order
   * A×7 and a cancelled order A×3 promise NOTHING. Standalone
   * challan rc1 (dispatched): A×4, 1 billed -> 3 promised.
   * Challan rc2 cites ro1: A×3, 1 billed THROUGH it -> ro1's billed
   * is 1 (one hop), so ro1 promises 9; rc2 itself adds NOTHING on
   * top (no double promise). Cancelled challan A×9 and draft
   * challan B×4 promise nothing.
   * => promised A = 12, available A = 0; promised B = 2, available B = 3. */
  const rProducts = [{ id: "A", stockQty: 12 }, { id: "B", stockQty: 5 }];
  const rOrders = [
    { id: "ro1", status: "open", lines: [
      { productId: "A", name: "A", qty: 10, unitPrice: 100, total: 1000 },
      { productId: "B", name: "B", qty: 2, unitPrice: 100, total: 200 },
    ] },
    { id: "ro2", status: "draft", lines: [{ productId: "A", name: "A", qty: 7, unitPrice: 100, total: 700 }] },
    { id: "ro3", status: "cancelled", lines: [{ productId: "A", name: "A", qty: 3, unitPrice: 100, total: 300 }] },
  ];
  const rChallans = [
    { id: "rc1", orderId: null, status: "dispatched", lines: [{ productId: "A", name: "A", qty: 4, unitPrice: 100, total: 400 }] },
    { id: "rc2", orderId: "ro1", status: "dispatched", lines: [{ productId: "A", name: "A", qty: 3, unitPrice: 100, total: 300, sourceProductId: "A" }] },
    { id: "rc3", orderId: null, status: "cancelled", lines: [{ productId: "A", name: "A", qty: 9, unitPrice: 100, total: 900 }] },
    { id: "rc4", orderId: null, status: "draft", lines: [{ productId: "B", name: "B", qty: 4, unitPrice: 100, total: 400 }] },
  ];
  const rBills = [
    { id: "rb1", status: "paid", sourceType: "challan", sourceId: "rc2", items: [{ productId: "A", qty: 1, sourceProductId: "A" }] },
    { id: "rb2", status: "paid", sourceType: "challan", sourceId: "rc1", items: [{ productId: "A", qty: 1 }] },
  ];
  const promised = docs.promisedQtyByProduct(rOrders, rChallans, rBills);
  check(eq(promised.get("A"), 12), "reservation: promised A == 12 (order remainder 9 + standalone challan 3, no double count)");
  check(eq(promised.get("B"), 2), "reservation: promised B == 2 (draft challan promises nothing)");
  const rAvail = docs.availabilityByProduct(rProducts, rOrders, rChallans, rBills);
  check(
    eq(rAvail.get("A").available, 0) && eq(rAvail.get("A").onHand, 12),
    "reservation: available A == 0 of 12 on hand"
  );
  check(eq(rAvail.get("B").available, 3), "reservation: available B == 3 of 5 on hand");

  /* ---- seed demo challan (§10: discoverable, non-posting) ---- */
  const seedOrders2 = seed.getSeedSaleOrders(customers, products);
  const seedChallans = seed.getSeedDeliveryChallans(seedOrders2);
  check(
    seedChallans.length === 1 &&
      seedChallans[0].number === "DC-1" &&
      seedChallans[0].status === "dispatched",
    "seed: one dispatched demo challan DC-1"
  );
  check(seedChallans[0].orderId === seedOrders2[0].id, "seed: the demo challan cites the demo order SO-1");
  const firstLineId = seedOrders2[0].lines[0].productId;
  check(
    eq(docs.orderDeliveredQty(seedOrders2[0], seedChallans).get(firstLineId), 8) &&
      eq(seedOrders2[0].lines[0].qty, 20),
    "seed: delivered 8 of 20 — a partial delivery to discover"
  );
  check(journal.length === 21, "seed identities: journal still 21 entries (the seeded challan posted nothing)");
}

/* ===================== B3 (Phase B) =====================
 * Purchase orders + receipt linkage. A PO is a NON-POSTING order
 * to a supplier (design §2.2): its lifecycle writes only its own
 * document. Goods move ONLY when received against it, and the
 * receipt posts through the ONE existing purchase engine — so a
 * PO receipt's journal entry must be line-for-line the direct
 * purchase's entry for the same goods (template identity),
 * including A4 tax resolved at receipt time. Received quantities
 * are DERIVED from the purchases citing the PO (§2.1); an
 * over-receipt is refused before anything is composed. */
suite("B3", null);
{
  const storeSrc3 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx",
    "utf8"
  );
  const NT3 = { defaultSalesTaxSlabId: null, defaultPurchaseTaxSlabId: null };

  /* ---- zero-posting proof: PO CRUD writes ONLY purchaseOrders ---- */
  const poStart = storeSrc3.indexOf("const createPurchaseOrder");
  const poEnd = storeSrc3.indexOf("const recordSupplierPayment", poStart);
  const poRegion = storeSrc3.slice(poStart, poEnd);
  check(poStart > 0 && poEnd > poStart, "PO-actions region located in StoreProvider");
  const recvStart = poRegion.indexOf("const receiveAgainstPo");
  const crudRegion = poRegion.slice(0, recvStart);
  check(
    !crudRegion.includes("makeEntry") &&
      !crudRegion.includes("postEntry") &&
      !crudRegion.includes("guardPostings") &&
      !crudRegion.includes("batchJournal") &&
      !crudRegion.includes("recordPurchase("),
    "zero-posting: no PO CRUD action reaches a posting primitive (not even the purchase engine)"
  );
  const poPut = new Set([...crudRegion.matchAll(/putDoc\("(\w+)"/g)].map((m) => m[1]));
  check(
    poPut.size === 1 && poPut.has("purchaseOrders"),
    "zero-posting: PO CRUD writes ONLY purchaseOrders"
  );
  check(
    (crudRegion.match(/removeDoc\("purchaseOrders"/g) || []).length === 1 &&
      !crudRegion.includes("removeDoc(\"purchases\""),
    "zero-posting: PO delete removes ONLY its own document"
  );
  check(
    (poRegion.match(/can\(roleRef\.current, "purchaseOrders", "write"\)/g) || []).length >= 6,
    "RBAC: every PO action (CRUD + receive) gates on the purchaseOrders matrix row"
  );

  /* ---- the receipt seam: delegation, citation, in-batch status ---- */
  const recvRegion = poRegion.slice(recvStart);
  check(
    recvRegion.includes("composePoReceiptLines") &&
      recvRegion.includes("recordPurchase(") &&
      recvRegion.includes("sourcePoId: po.id"),
    "receipt seam: receiveAgainstPo validates via lib/documents and posts ONLY through recordPurchase, citing the PO"
  );
  check(
    !recvRegion.includes("makeEntry") && !recvRegion.includes("postEntry"),
    "receipt seam: receiveAgainstPo composes no journal entry of its own"
  );
  check(
    storeSrc3.includes("...(input.sourcePoId ? { sourcePoId: input.sourcePoId } : {})"),
    "receipt seam: recordPurchase stamps sourcePoId onto the Purchase only when cited"
  );
  check(
    storeSrc3.includes('"purchaseOrders", poStatusUpdate.id') &&
      storeSrc3.includes("derivePoStatus(po, [...colsRef.current.purchases, purchase])"),
    "receipt seam: recordPurchase recomputes the PO status over purchases incl. this one, inside the receipt batch"
  );

  /* ---- RBAC matrix rows (design §6.1) ---- */
  check(
    perm.accessOf("owner", "purchaseOrders") === "full" &&
      perm.accessOf("manager", "purchaseOrders") === "full",
    "RBAC: owner/manager full on purchaseOrders"
  );
  check(perm.accessOf("cashier", "purchaseOrders") === "none", "RBAC: cashier has NO purchaseOrders access");
  check(perm.accessOf("accountant", "purchaseOrders") === "read", "RBAC: accountant read-only on purchaseOrders");

  /* ---- numbering: the PO- series shares the B1 machinery ---- */
  check(docs.nextDocNumber("purchaseOrder", [], NT3) === "PO-1", "numbering: first PO mint is PO-1");
  check(
    docs.nextDocNumber("purchaseOrder", [null, "PO-1"], NT3) === "PO-2",
    "numbering: PO drafts burn no numbers (draft carries null)"
  );

  /* ---- derivation + partial receipts (§2.1, §9 B3) ----
   * PO-1: Oil 10 @ 2,450 agreed + Rice 20 @ 400 agreed. */
  const po1 = {
    id: "po1", number: "PO-1", status: "issued", supplierId: "sup1", supplierName: "Supplier One",
    lines: [
      { productId: "oil", name: "Cooking Oil 5L", qty: 10, unitCost: 2450, total: 24500 },
      { productId: "rice", name: "Rice Basmati 5kg", qty: 20, unitCost: 400, total: 8000 },
    ],
    total: 32500,
  };
  const receipt = (id, items, gross) => ({
    id, supplierId: "sup1", sourcePoId: "po1", total: gross,
    items: items.map(([productId, qty, unitCost]) => ({
      productId, name: productId, qty, unitCost, total: qty * unitCost,
    })),
  });
  const moneyBefore3 = JSON.stringify({ journal, sales, products });
  check(docs.derivePoStatus(po1, []) === "issued", "derivation: an issued PO with no receipts is issued");
  check(
    docs.derivePoStatus(po1, [{ sourcePoId: "poOTHER", items: [{ productId: "oil", qty: 10 }] }]) === "issued",
    "derivation: purchases citing ANOTHER PO fulfil nothing here"
  );
  const r1 = receipt("r1", [["oil", 4, 2450]], 11466);
  check(
    eq(docs.poReceivedQty(po1, [r1]).get("oil"), 4) &&
      eq(docs.remainingQty(10, docs.poReceivedQty(po1, [r1]), "oil"), 6),
    "partial receipts: 10 ordered -> 4 received -> 6 remaining"
  );
  check(
    docs.derivePoStatus(po1, [r1]) === "partially_received",
    "partial receipts: first receipt derives partially_received"
  );
  const r2 = receipt("r2", [["oil", 6, 2450], ["rice", 20, 400]], 25199);
  check(
    docs.derivePoStatus(po1, [r1, r2]) === "received" &&
      eq(docs.poReceivedQty(po1, [r1, r2]).get("oil"), 10) &&
      eq(docs.poReceivedQty(po1, [r1, r2]).get("rice"), 20),
    "partial receipts: the second receipt closes the PO (two receipts sum to the PO exactly)"
  );
  check(
    eq(ledger.supplierBalance([r1, r2], [], "sup1"), 11466 + 25199),
    "payable: supplier payable after receipts == Σ receipt gross totals (36,665)"
  );

  /* ---- receipt composition: the store's gate (composePoReceiptLines) ---- */
  const fresh = docs.composePoReceiptLines(po1, [], [{ productId: "oil", qty: 4 }]);
  check(
    Array.isArray(fresh) && fresh.length === 1 && fresh[0].qty === 4 && fresh[0].unitCost === 2450,
    "compose: a pick without a cost takes the PO's AGREED cost (2,450)"
  );
  const corrected = docs.composePoReceiptLines(po1, [], [{ productId: "oil", qty: 4, unitCost: 2400 }]);
  check(
    Array.isArray(corrected) && corrected[0].unitCost === 2400,
    "compose: the desk may correct the cost to the actual invoice (2,400)"
  );
  check(
    docs.composePoReceiptLines(po1, [r1], [{ productId: "oil", qty: 7 }]) === null,
    "over-receipt refused: 7 against 6 remaining composes nothing"
  );
  check(
    docs.composePoReceiptLines(po1, [], [{ productId: "oil", qty: 11 }]) === null,
    "over-receipt refused: 11 against 10 ordered composes nothing"
  );
  check(
    Array.isArray(docs.composePoReceiptLines(po1, [r1], [{ productId: "oil", qty: 6 }])),
    "compose: exactly the remaining quantity is allowed (boundary)"
  );
  check(
    docs.composePoReceiptLines(po1, [], [{ productId: "ghee", qty: 1 }]) === null,
    "compose refused: goods the PO never ordered cannot cite it (they are a direct purchase)"
  );
  check(
    docs.composePoReceiptLines({ ...po1, status: "cancelled" }, [], [{ productId: "oil", qty: 1 }]) === null,
    "cancelled PO receives nothing"
  );
  check(
    docs.composePoReceiptLines({ ...po1, status: "draft" }, [], [{ productId: "oil", qty: 1 }]) === null &&
      docs.composePoReceiptLines({ ...po1, status: "received" }, [r1, r2], [{ productId: "oil", qty: 1 }]) === null,
    "compose refused: draft and fully-received POs take no goods"
  );
  check(
    docs.composePoReceiptLines(po1, [], [{ productId: "oil", qty: 0 }]) === null &&
      docs.composePoReceiptLines(po1, [], [{ productId: "oil", qty: 2, unitCost: -5 }]) === null,
    "compose refused: an all-zero receipt and a negative cost compose nothing"
  );

  /* ---- TEMPLATE IDENTITY (§9 B3): a PO receipt posts the direct
   * purchase's entry, line for line — incl. A4 tax at receipt-time
   * resolution. The composition below replicates recordPurchase
   * line-faithfully (computePurchaseTaxes + the perpetual-clearing
   * makeEntry template) and runs through the REAL makeEntry guard. */
  const GSTP = { id: "gstp", name: "GST 17%", kind: "percent", rate: 17, appliesTo: "both", inclusive: false, active: true };
  const taxProducts = new Map([
    ["oil", { id: "oil", taxSlabId: "gstp", taxExempt: false }],
    ["rice", { id: "rice", taxSlabId: null, taxExempt: false }],
  ]);
  const composePurchaseEntry = (lines, refId) => {
    const purchaseTax = tax.computePurchaseTaxes(
      lines.map((l) => ({
        total: l.qty * l.unitCost,
        qty: l.qty,
        slab: tax.resolveTaxSlab(taxProducts.get(l.productId), [GSTP], NT3, "purchases"),
      }))
    );
    const entry = ledger.makeEntry("Purchase — stock received", "purchase", refId, [
      { account: "purchases", debit: purchaseTax.netTotal, credit: 0 },
      ...(purchaseTax.taxAmount > 0
        ? [{ account: "tax_input", debit: purchaseTax.taxAmount, credit: 0 }]
        : []),
      { account: "inventory", debit: purchaseTax.netTotal, credit: 0 },
      { account: "purchases", debit: 0, credit: purchaseTax.netTotal },
      { account: "payables", debit: 0, credit: purchaseTax.grossTotal, ref: "sup1" },
    ]);
    return { purchaseTax, entry };
  };
  // The same goods two ways: typed directly at the purchase desk,
  // and composed from PO-1 by the receiving desk.
  const directLines = [{ productId: "oil", qty: 10, unitCost: 2450 }];
  const poLines = docs.composePoReceiptLines(po1, [], [{ productId: "oil", qty: 10 }]);
  const directC = composePurchaseEntry(directLines, "pur-direct");
  const poC = composePurchaseEntry(poLines, "pur-po");
  check(
    JSON.stringify(directC.entry.lines) === JSON.stringify(poC.entry.lines),
    "template identity: PO-receipt entry is line-for-line the direct-purchase entry (taxed)"
  );
  check(
    ledger.entryBalances(poC.entry) && eq(poC.purchaseTax.taxAmount, 4165) &&
      eq(poC.purchaseTax.grossTotal, 28665),
    "template identity: A4 tax at receipt (net 24,500 + GST 4,165 = gross 28,665), entry balances"
  );
  check(
    eq(ledger.payablesTotal([poC.entry]), 28665),
    "template identity: the journal payable is the receipt GROSS (28,665)"
  );
  // Stock effects identical too (recordPurchase's shelf rule:
  // stock += qty per product, shelf cost := the received cost).
  const shelfAfter = (lines) => {
    const shelf = { oil: { stockQty: 3, costPrice: 2300 } };
    for (const l of lines) {
      shelf[l.productId].stockQty += l.qty;
      shelf[l.productId].costPrice = l.unitCost;
    }
    return shelf;
  };
  check(
    JSON.stringify(shelfAfter(directLines)) === JSON.stringify(shelfAfter(poLines)) &&
      shelfAfter(poLines).oil.stockQty === 13 && shelfAfter(poLines).oil.costPrice === 2450,
    "template identity: stock-in effects identical (3 + 10 on shelf, cost re-priced to 2,450)"
  );
  // Untaxed identity: no slab anywhere -> the pre-A4 template, equal both ways.
  const plainProducts = new Map([["rice", { id: "rice", taxSlabId: null, taxExempt: false }]]);
  const composePlain = (lines, refId) => {
    const purchaseTax = tax.computePurchaseTaxes(
      lines.map((l) => ({
        total: l.qty * l.unitCost, qty: l.qty,
        slab: tax.resolveTaxSlab(plainProducts.get(l.productId), [], NT3, "purchases"),
      }))
    );
    return ledger.makeEntry("Purchase — stock received", "purchase", refId, [
      { account: "purchases", debit: purchaseTax.netTotal, credit: 0 },
      { account: "inventory", debit: purchaseTax.netTotal, credit: 0 },
      { account: "purchases", debit: 0, credit: purchaseTax.netTotal },
      { account: "payables", debit: 0, credit: purchaseTax.grossTotal, ref: "sup1" },
    ]);
  };
  const plainDirect = composePlain([{ productId: "rice", qty: 20, unitCost: 400 }], "pur-d2");
  const plainPo = composePlain(
    docs.composePoReceiptLines(po1, [], [{ productId: "rice", qty: 20 }]),
    "pur-p2"
  );
  check(
    JSON.stringify(plainDirect.lines) === JSON.stringify(plainPo.lines) &&
      !plainPo.lines.some((l) => l.account === "tax_input"),
    "template identity: untaxed PO receipt == untaxed direct purchase (no tax line either way)"
  );

  /* ---- seed identities + fingerprint intact ---- */
  check(
    JSON.stringify({ journal, sales, products }) === moneyBefore3,
    "zero-posting: seed journal/sales/stock byte-identical across the whole PO lifecycle"
  );
  check(journal.length === 21, "seed identities: journal still 21 entries (no PO action posted anything)");
  const normalized3 = journal.map((e) => {
    const { ts, ...rest } = e; return rest;
  });
  const sha3 = crypto.createHash("sha256").update(JSON.stringify(normalized3), "utf8").digest("hex");
  check(
    sha3 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "seed identities: journal fingerprint (B1-recorded normalization) unchanged"
  );
}

/* ============================== SEARCH (72) ==============================
 * Null-safe search helpers (web/lib/search.ts) — the fix for the
 * owner's "search bars don't work anywhere" report. The legacy
 * component predicates called .toLowerCase()/.includes() directly on
 * raw Firestore fields; a document written by an older build may not
 * HAVE the field at all (product without urduName/sku/category,
 * customer without address, bill without customerPhone), and the
 * first typed keystroke then threw a TypeError that unmounted the
 * whole page (the app has no error boundary). These checks prove:
 * (a) on well-formed data the new helpers return EXACTLY what the
 * verbatim legacy predicates returned; (b) on field-missing legacy
 * shapes nothing throws and the surviving fields still match. */
suite("B4", null);
{
  /* Phase B · B4 — Credit/Debit Notes + Purchase-Return Engine
   * (design §3). The store templates that cannot execute headless
   * are replicated line-faithfully and composed through the REAL
   * makeEntry / computePurchaseTaxes / purchaseReturnTaxShares /
   * composePurchaseReturnLines / ledger selectors, so every figure
   * asserted here is the figure the app posts. */
  const GST17 = { id: "gst17", name: "GST 17%", kind: "percent", rate: 17, appliesTo: "both", inclusive: false, active: true };
  const STD18I = { id: "std18i", name: "Std 18% incl", kind: "percent", rate: 18, appliesTo: "both", inclusive: true, active: true };
  const R2 = tax.round2;

  const mkPurchase = (id, supplierId, lines, dayOffset = 0) => {
    const taxRes = tax.computePurchaseTaxes(
      lines.map((l) => ({ total: l.qty * l.unitCost, qty: l.qty, slab: l.slab ?? null }))
    );
    const items = lines.map((l, i) => {
      const info = taxRes.lines[i];
      const slab = info.slab;
      return {
        productId: l.productId, name: l.name, qty: l.qty, unitCost: l.unitCost,
        total: l.qty * l.unitCost, taxAmount: info.taxAmount,
        taxSlabId: slab?.id ?? null, taxSlabName: slab?.name ?? null,
        taxRate: slab?.rate ?? 0, taxKind: slab?.kind ?? "percent",
        taxInclusive: slab?.inclusive ?? false,
      };
    });
    return {
      id, supplierId, items, total: taxRes.grossTotal, netTotal: taxRes.netTotal,
      taxAmount: taxRes.taxAmount, note: "", dayOffset,
      ts: "2026-03-01T09:00:00.000Z",
    };
  };
  // Line-faithful to StoreProvider.recordPurchase.
  const purchaseEntry = (p) =>
    ledger.makeEntry("Purchase — stock received", "purchase", p.id, [
      { account: "purchases", debit: p.netTotal, credit: 0 },
      ...(p.taxAmount > 0 ? [{ account: "tax_input", debit: p.taxAmount, credit: 0 }] : []),
      { account: "inventory", debit: p.netTotal, credit: 0 },
      { account: "purchases", debit: 0, credit: p.netTotal },
      { account: "payables", debit: 0, credit: p.total, ref: p.supplierId },
    ]);
  const paymentEntry = (pay) =>
    ledger.makeEntry("Supplier payment", "supplier_payment", pay.id, [
      { account: "payables", debit: pay.amount, credit: 0, ref: pay.supplierId },
      { account: "cash", debit: 0, credit: pay.amount, ref: "acct-cash" },
    ]);
  // Line-faithful to StoreProvider.recordPurchaseReturn.
  const applyPurchaseReturn = (state, purchase, picks, settlement, method) => {
    const lines = docs.composePurchaseReturnLines(purchase, state.purchaseReturns, picks);
    if (!lines) return null;
    const priors = state.purchaseReturns.filter((r) => r.purchaseId === purchase.id);
    const items = docs.purchaseReturnItems(purchase, lines);
    const shares = tax.purchaseReturnTaxShares(purchase, priors, items);
    for (const it of items) it.taxAmount = shares.perLine.get(it.productId) ?? 0;
    const srcById = new Map(purchase.items.map((i) => [i.productId, i]));
    const net = R2(
      items.reduce(
        (a, it) => a + (srcById.get(it.productId).taxInclusive ? it.total - it.taxAmount : it.total),
        0
      )
    );
    const t = shares.taxShare;
    const gross = R2(net + t);
    const ret = {
      id: `pret${state.purchaseReturns.length + 1}`,
      purchaseId: purchase.id, supplierId: purchase.supplierId, items,
      payableOffset: settlement === "payable_offset" ? gross : 0,
      refundAmount: settlement === "cash_refund" ? gross : 0,
      method: settlement === "cash_refund" ? (method ?? "cash") : null,
      accountId: settlement === "cash_refund" ? "acct-cash" : null,
      dayOffset: 0, ts: "2026-03-20T10:00:00.000Z",
    };
    const entry = ledger.makeEntry("Purchase return — goods sent back", "purchase_return", ret.id, [
      ...(ret.payableOffset > 0
        ? [{ account: "payables", debit: ret.payableOffset, credit: 0, ref: purchase.supplierId }]
        : []),
      ...(ret.refundAmount > 0
        ? [{ account: "cash", debit: ret.refundAmount, credit: 0, ref: "acct-cash" }]
        : []),
      { account: "inventory", debit: 0, credit: net },
      ...(t > 0 ? [{ account: "tax_input", debit: 0, credit: t }] : []),
    ]);
    state.purchaseReturns.push(ret);
    state.journal.push(entry);
    return { ret, entry };
  };
  const journalPayables = (journal, sid) =>
    journal.reduce(
      (a, e) =>
        a + e.lines
          .filter((l) => l.account === "payables" && l.ref === sid)
          .reduce((x, l) => x + l.credit - l.debit, 0),
      0
    );

  /* --- numbering: kind-filtered independent sequences (§3.1) --- */
  check(
    docs.nextDocNumber("creditNote", [], null) === "CN-1" &&
      docs.nextDocNumber("creditNote", ["CN-1"], null) === "CN-2" &&
      docs.nextDocNumber("debitNote", [], null) === "DN-1" &&
      docs.nextDocNumber("debitNote", ["DN-3"], null) === "DN-4",
    "numbering: CN and DN sequences run independently over the caller's kind-filtered numbers"
  );

  /* --- the taxed fixture purchase (exclusive GST 17%) --- */
  const taxPurchase = mkPurchase("pB4a", "sup1", [
    { productId: "pa", name: "Alpha", qty: 1, unitCost: 10000, slab: GST17 },
    { productId: "pb", name: "Beta", qty: 2, unitCost: 5000, slab: GST17 },
    { productId: "pc", name: "Gamma", qty: 3, unitCost: 1500, slab: GST17 },
  ]);
  check(
    eq(taxPurchase.netTotal, 24500) && eq(taxPurchase.taxAmount, 4165) && eq(taxPurchase.total, 28665),
    "fixture: taxed purchase is net 24,500 + tax 4,165 = gross 28,665"
  );

  /* --- cumulative tax reversal, to the paisa: return the taxed
   * purchase in three slices; tax_input must end at exactly 0 --- */
  {
    const st = { purchaseReturns: [], journal: [purchaseEntry(taxPurchase)] };
    applyPurchaseReturn(st, taxPurchase, [{ productId: "pa", qty: 1 }], "payable_offset");
    applyPurchaseReturn(st, taxPurchase, [{ productId: "pb", qty: 1 }], "payable_offset");
    applyPurchaseReturn(st, taxPurchase, [
      { productId: "pb", qty: 1 },
      { productId: "pc", qty: 3 },
    ], "payable_offset");
    const reversed = st.purchaseReturns.reduce(
      (a, r) => a + r.items.reduce((x, i) => x + i.taxAmount, 0), 0
    );
    check(eq(reversed, 4165), "tax reversal: three partial returns reverse input tax to the paisa (4,165)");
    check(
      eq(ledger.accountBalance(st.journal, "tax_input"), 0),
      "tax reversal: the journal's tax_input balance returns to exactly 0"
    );
  }
  /* Inclusive slab + untaxed mix reverses exactly the purchase tax. */
  {
    const p = mkPurchase("pB4b", "sup1", [
      { productId: "pd", name: "Delta", qty: 4, unitCost: 1170, slab: STD18I },
      { productId: "pe", name: "Plain", qty: 2, unitCost: 1000, slab: null },
    ]);
    const st = { purchaseReturns: [], journal: [purchaseEntry(p)] };
    const full = applyPurchaseReturn(st, p, [
      { productId: "pd", qty: 4 },
      { productId: "pe", qty: 2 },
    ], "payable_offset");
    check(
      full !== null &&
        eq(full.ret.items.reduce((a, i) => a + i.taxAmount, 0), p.taxAmount) &&
        eq(full.ret.items.find((i) => i.productId === "pe").taxAmount, 0) &&
        eq(ledger.accountBalance(st.journal, "tax_input"), 0),
      "tax reversal: inclusive + untaxed purchase reverses exactly its tax, untaxed line zero"
    );
  }

  /* --- compose guards: over-return refused BEFORE composition --- */
  {
    const p = mkPurchase("pB4c", "sup1", [
      { productId: "pa", name: "Alpha", qty: 2, unitCost: 1000, slab: null },
    ]);
    const priors = [{ purchaseId: "pB4c", supplierId: "sup1", items: [{ productId: "pa", qty: 1, total: 1000, taxAmount: 0 }] }];
    check(
      docs.composePurchaseReturnLines(p, priors, [{ productId: "pa", qty: 2 }]) === null,
      "over-return: more than purchased − already-returned is refused"
    );
    check(
      docs.composePurchaseReturnLines(p, priors, [{ productId: "pa", qty: 1 }]) !== null &&
        docs.composePurchaseReturnLines(p, priors, [{ productId: "zz", qty: 1 }]) === null &&
        docs.composePurchaseReturnLines(p, priors, []) === null,
      "over-return: exact remainder allowed; unknown product and empty picks refused"
    );
    const merged = docs.composePurchaseReturnLines(p, [], [
      { productId: "pa", qty: 1 },
      { productId: "pa", qty: 1 },
    ]);
    check(
      merged !== null && merged.length === 1 && eq(merged[0].qty, 2),
      "compose: duplicate picks merge before the cap is judged"
    );
  }

  /* --- journal ≡ subledger identity across a mixed sequence ---
   * purchase 28,665 → pay 10,000 → return 1× Beta (offset 5,850)
   * → return the rest. Both derivations agree at EVERY step. */
  {
    const st = { purchaseReturns: [], journal: [purchaseEntry(taxPurchase)] };
    const payments = [];
    const identity = (label, expected) => {
      const sub = ledger.supplierBalance([taxPurchase], payments, "sup1", st.purchaseReturns);
      const gl = journalPayables(st.journal, "sup1");
      check(
        eq(sub, gl) && eq(sub, expected) && eq(ledger.payablesTotal(st.journal), gl),
        `identity: journal ≡ subledger after ${label} (${expected})`
      );
    };
    identity("purchase", 28665);
    const pay = { id: "pay1", supplierId: "sup1", amount: 10000, method: "cash", ts: "2026-03-05T09:00:00.000Z" };
    payments.push(pay);
    st.journal.push(paymentEntry(pay));
    identity("partial payment", 18665);
    const first = applyPurchaseReturn(st, taxPurchase, [{ productId: "pb", qty: 1 }], "payable_offset");
    check(
      first !== null && ledger.entryBalances(first.entry) && eq(first.ret.payableOffset, 5850),
      "template: partial return entry balances; payable offset is the full gross 5,850"
    );
    identity("partial return", 12815);
    applyPurchaseReturn(st, taxPurchase, [
      { productId: "pa", qty: 1 },
      { productId: "pb", qty: 1 },
      { productId: "pc", qty: 3 },
    ], "payable_offset");
    identity("return of the rest — all goods back, the 10,000 paid is now an advance", -10000);
    const aging = ledger.payablesAging([taxPurchase], payments, st.purchaseReturns);
    check(
      eq(aging.total, 0),
      "aging: a fully-returned purchase contributes nothing to payables aging"
    );
    check(
      eq(
        st.journal
          .filter((e) => e.refType === "purchase_return")
          .reduce((a, e) => a + e.lines.filter((l) => l.account === "inventory").reduce((x, l) => x + l.credit, 0), 0),
        24500
      ),
      "template: inventory is credited back exactly the purchase net (24,500)"
    );
  }

  /* --- paid-in-full, THEN returned: payable goes negative = a
   * supplier advance, identically in both derivations (§3.2) --- */
  {
    const p = mkPurchase("pB4e", "sup1", [
      { productId: "pa", name: "Alpha", qty: 2, unitCost: 3000, slab: null },
    ]);
    const st = { purchaseReturns: [], journal: [purchaseEntry(p)] };
    const pay = { id: "payF", supplierId: "sup1", amount: 6000, method: "cash", ts: "2026-03-03T09:00:00.000Z" };
    st.journal.push(paymentEntry(pay));
    applyPurchaseReturn(st, p, [{ productId: "pa", qty: 2 }], "payable_offset");
    check(
      eq(ledger.supplierBalance([p], [pay], "sup1", st.purchaseReturns), -6000) &&
        eq(journalPayables(st.journal, "sup1"), -6000),
      "advance: return against a PAID purchase ⇒ balance −6,000 in subledger AND journal"
    );
    check(
      eq(ledger.payablesAging([p], [pay], st.purchaseReturns).total, 0),
      "advance: an advance position contributes nothing to payables aging"
    );
  }

  /* --- cash_refund settlement: money returns, payable untouched --- */
  {
    const p = mkPurchase("pB4f", "sup1", [
      { productId: "pa", name: "Alpha", qty: 1, unitCost: 4000, slab: null },
    ]);
    const st = { purchaseReturns: [], journal: [purchaseEntry(p)] };
    const pay = { id: "payG", supplierId: "sup1", amount: 4000, method: "cash", ts: "2026-03-02T09:00:00.000Z" };
    st.journal.push(paymentEntry(pay));
    const back = applyPurchaseReturn(st, p, [{ productId: "pa", qty: 1 }], "cash_refund", "cash");
    check(
      back !== null &&
        eq(back.ret.refundAmount, 4000) && eq(back.ret.payableOffset, 0) &&
        back.entry.lines.some((l) => l.account === "cash" && eq(l.debit, 4000)) &&
        eq(ledger.supplierBalance([p], [pay], "sup1", st.purchaseReturns), 0) &&
        eq(journalPayables(st.journal, "sup1"), 0),
      "cash_refund: money account debited; the refund un-pays, so BOTH derivations read the settled 0 (no phantom advance)"
    );
    /* Mixed sequence on ONE purchase: pay part, refund part,
     * offset the rest — identity after every leg (§9). */
    const p2 = mkPurchase("pB4g", "sup1", [
      { productId: "pa", name: "Alpha", qty: 10, unitCost: 1000, slab: null },
    ]);
    const st2 = { purchaseReturns: [], journal: [purchaseEntry(p2)] };
    const pay2 = { id: "payH", supplierId: "sup1", amount: 4000, method: "cash", ts: "2026-03-04T09:00:00.000Z" };
    st2.journal.push(paymentEntry(pay2));
    applyPurchaseReturn(st2, p2, [{ productId: "pa", qty: 3 }], "cash_refund", "cash");
    applyPurchaseReturn(st2, p2, [{ productId: "pa", qty: 2 }], "payable_offset");
    check(
      eq(ledger.supplierBalance([p2], [pay2], "sup1", st2.purchaseReturns), 4000) &&
        eq(journalPayables(st2.journal, "sup1"), 4000) &&
        eq(ledger.payablesAging([p2], [pay2], st2.purchaseReturns).total, 4000),
      "identity: pay 4,000 → refund-return 3,000 → offset-return 2,000 ⇒ 4,000 owed in journal, subledger AND aging"
    );
  }

  /* --- debit-note figures ≡ the purchase return they wrap --- */
  {
    const st = { purchaseReturns: [], journal: [purchaseEntry(taxPurchase)] };
    const { ret } = applyPurchaseReturn(st, taxPurchase, [{ productId: "pb", qty: 1 }], "payable_offset");
    const fig = docs.debitNoteFigures(ret);
    check(
      eq(fig.total, ret.payableOffset + ret.refundAmount) && eq(fig.taxAmount, 850) &&
        eq(fig.goodsAmount, 5000) && eq(fig.total, 5850),
      "debit note: total ≡ return gross (5,850); tax ≡ reversed input tax (850); goods ≡ net (5,000)"
    );
    const noteItems = docs.noteItemsFromPurchaseReturn(ret);
    check(
      noteItems.length === 1 && eq(noteItems[0].unitPrice, 5000) && eq(noteItems[0].total, 5000),
      "debit note: items carry the purchase line's in-cost as their price"
    );
  }

  /* --- credit-note figures ≡ the returns engine, partial sequence ---
   * A taxed bill returned item-by-item: the notes' totals sum to
   * the bill total (the engine's refund totals), their tax legs to
   * the bill's tax — to the paisa. */
  {
    const billLines = [
      { productId: "p1", name: "P1", qty: 2, unitPrice: 585, unitCost: 300, total: 1170, slab: STD18I },
      { productId: "p2", name: "P2", qty: 2, unitPrice: 499, unitCost: 250, total: 998, slab: GST17 },
    ];
    const bt = tax.computeBillTaxes(billLines.map((l) => ({ total: l.total, qty: l.qty, slab: l.slab })), 0);
    const bill = {
      id: "bB4", billNo: 77, discountAmount: 0, taxAmount: bt.taxAmount, total: bt.total,
      ts: "2026-03-01T09:00:00.000Z",
      items: billLines.map((l, i) => ({
        productId: l.productId, name: l.name, qty: l.qty, unitPrice: l.unitPrice,
        unitCost: l.unitCost, total: l.total, taxAmount: bt.lines[i].taxAmount,
        taxSlabId: l.slab.id, taxSlabName: l.slab.name, taxRate: l.slab.rate,
        taxKind: "percent", taxInclusive: l.slab.inclusive,
      })),
    };
    const mkSaleReturn = (id, picks, shares) => {
      const items = picks.map((p) => {
        const src = bill.items.find((x) => x.productId === p.productId);
        return { ...src, qty: p.qty, total: p.total, taxAmount: shares.perLine.get(p.productId) ?? 0 };
      });
      const gross = items.reduce((a, i) => a + i.total, 0);
      return {
        id, billId: bill.id, billNo: bill.billNo, items,
        refundAmount: R2(gross + shares.exclusiveTaxShare), creditReduction: 0,
        method: "cash", accountId: "acct-cash", dayOffset: 0, ts: bill.ts,
      };
    };
    const shares1 = tax.returnTaxShares(bill, [], [{ productId: "p1", qty: 1, total: 585 }]);
    const r1 = mkSaleReturn("r1", [{ productId: "p1", qty: 1, total: 585 }], shares1);
    const cn1 = docs.creditNoteFigures(r1);
    const shares2 = tax.returnTaxShares(bill, [r1], [
      { productId: "p1", qty: 1, total: 585 },
      { productId: "p2", qty: 2, total: 998 },
    ]);
    const r2 = mkSaleReturn("r2", [
      { productId: "p1", qty: 1, total: 585 },
      { productId: "p2", qty: 2, total: 998 },
    ], shares2);
    const cn2 = docs.creditNoteFigures(r2);
    check(
      eq(cn1.total + cn2.total, bill.total) && eq(cn1.taxAmount + cn2.taxAmount, bill.taxAmount),
      "credit notes: item-by-item returns sum to the bill total and reverse its tax to the paisa"
    );
    check(
      eq(cn1.goodsAmount + cn1.taxAmount, cn1.total) && eq(cn2.goodsAmount + cn2.taxAmount, cn2.total),
      "credit notes: goods + tax == total on every note, by construction"
    );
    const udhaarFig = docs.creditNoteFigures({
      id: "r3", billId: bill.id, billNo: bill.billNo, items: [],
      refundAmount: 0, creditReduction: 2750, method: null, ts: bill.ts, dayOffset: 0,
    });
    check(
      eq(udhaarFig.total, 2750) && eq(udhaarFig.goodsAmount, 2750) && eq(udhaarFig.taxAmount, 0),
      "credit notes: a pure-udhaar return's total is the credit reduction alone"
    );
  }

  /* --- RBAC: the note row vs the returns row (G-2) --- */
  check(
    perm.accessOf("cashier", "creditDebitNotes") === "none" &&
      perm.accessOf("accountant", "creditDebitNotes") === "full" &&
      perm.accessOf("manager", "creditDebitNotes") === "full",
    "RBAC: note issuance is creditDebitNotes alone (cashier none, accountant full)"
  );
  check(
    perm.accessOf("cashier", "returns") === "full" && perm.accessOf("accountant", "returns") === "none",
    "RBAC: the plain returns row is untouched (cashier full / accountant none)"
  );

  /* --- source invariants: gating + same-batch minting + guard --- */
  const storeSrcB4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8"
  );
  const regionB4 = (a, b) => {
    const i = storeSrcB4.indexOf(a);
    const j = storeSrcB4.indexOf(b, i);
    return i >= 0 && j > i ? storeSrcB4.slice(i, j) : "";
  };
  check(
    regionB4("const returnItems = useCallback(", "const returnItemsWithNote").includes(
      'can(roleRef.current, "returns", "write")'
    ),
    "source: the plain returnItems action still gates on the returns row (unchanged)"
  );
  check(
    regionB4("const returnItemsWithNote = useCallback(", "const voidBill").includes(
      '"creditDebitNotes", "write"'
    ),
    "source: the formal return flow gates on creditDebitNotes (G-2), never re-checking returns"
  );
  const engB4 = regionB4("const reverseBillItems = useCallback(", "const returnItems = useCallback(");
  check(
    engB4.includes('"creditNote"') && engB4.includes("creditNoteFigures(ret)") &&
      engB4.includes('"notes", note.id'),
    "source: the engine mints the credit note inside the return's own batch"
  );
  check(
    engB4.includes('opts.kind === "return" && opts.note'),
    "source: note composition is gated to returns — voids never mint notes"
  );
  const prB4 = regionB4("const recordPurchaseReturn = useCallback(", "/* ---------------- customers & credit");
  check(
    prB4.includes('"creditDebitNotes", "write"') && prB4.includes("guardPostings(entry)") &&
      prB4.includes('"purchase_return"') && prB4.includes('"debitNote"') &&
      prB4.includes("purchaseReturnTaxShares(purchase, priorReturns, items)") &&
      prB4.includes("composePurchaseReturnLines("),
    "source: recordPurchaseReturn gates, guards, composes via the derivation and mints the DN in-batch"
  );
  check(
    storeSrcB4.includes("supplierBalance(c.purchases, c.supplierPayments, id, c.purchaseReturns)"),
    "source: the delete-supplier guard reads the returns-aware balance"
  );

  /* --- rules: additive notes + purchaseReturns blocks (§6.2) --- */
  const rulesB4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8"
  );
  const CREATE_LINE =
    "allow create: if hasRole(uid, ['owner', 'manager', 'accountant']) && createInOpenPeriod(uid);";
  const blockB4 = (marker, next) => {
    const i = rulesB4.indexOf(marker);
    const j = rulesB4.indexOf(next, i);
    return i >= 0 && j > i ? rulesB4.slice(i, j) : "";
  };
  check(
    blockB4("match /notes/{noteId}", "match /purchaseReturns/").includes(CREATE_LINE) &&
      blockB4("match /notes/{noteId}", "match /purchaseReturns/").includes("allow read: if canAccess(uid);"),
    "rules: notes block carries the §6.2 posture (read any role; create owner/manager/accountant in an open period)"
  );
  check(
    blockB4("match /purchaseReturns/{purchaseReturnId}", "// Expenses:").includes(CREATE_LINE),
    "rules: purchaseReturns block carries the same create posture"
  );
}

/* =============================== B5 =============================== */
suite("B5", null);
{
  /* Phase B · B5 — Cheque Registry (design §4). Store templates
   * that cannot execute headless are replicated line-faithfully
   * (the money legs of postBill / addRepayment /
   * recordSupplierPayment, and the lifecycle entries composed
   * through the REAL lib/cheques line composers) through the REAL
   * makeEntry guard, so every figure asserted is the figure the
   * app posts. The invariant under test throughout:
   *   Σ registry uncleared (in)  == GL cheques_in_hand
   *   Σ registry pending (out)   == GL cheques_issued
   * at EVERY step of both lifecycles. */
  const till = byId(accounts, "acc-till");
  const bankAcct = byId(accounts, "acc-bank");
  const TODAY = "2026-10-22";
  const glInHand = (j) => ledger.accountNormalBalance(j, "cheques_in_hand");
  const glIssued = (j) => ledger.accountNormalBalance(j, "cheques_issued");
  const recvFor = (j, cid) =>
    j.reduce(
      (a, e) =>
        a +
        e.lines
          .filter((l) => l.account === "receivables" && l.ref === cid)
          .reduce((x, l) => x + l.debit - l.credit, 0),
      0
    );
  const payFor = (j, sid) =>
    j.reduce(
      (a, e) =>
        a +
        e.lines
          .filter((l) => l.account === "payables" && l.ref === sid)
          .reduce((x, l) => x + l.credit - l.debit, 0),
      0
    );
  const mkCheque = (patch) => ({
    id: "chq-x", direction: "in", status: "received", chequeNo: "0001", bankName: "Meezan Bank",
    amount: 0, issueDateISO: TODAY, dueDateISO: TODAY,
    partyId: null, partyName: "", partyKind: "customer",
    sourceType: "bill", sourceId: "", accountId: null, chargesOnBounce: 0,
    entryIds: { captured: null, deposited: null, cleared: null, bounced: null, returned: null },
    note: "", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z", ...patch,
  });
  /* Line-faithful to StoreProvider.postBill's payment legs for a
   * tax-free bill (the cogs/inventory pair included so the entry
   * is complete): credit part → receivables; cheque part →
   * cheques_in_hand ref chequeId; money part → its account's GL. */
  const billEntryFor = (bill, parts) => {
    const lines = [];
    for (const p of parts) {
      if (p.method === "credit")
        lines.push({ account: "receivables", debit: p.amount, credit: 0, ref: bill.customerId });
      else if (p.instrument === "cheque")
        lines.push({ account: "cheques_in_hand", debit: p.amount, credit: 0, ref: p.chequeId });
      else {
        const acct = byId(accounts, p.accountId);
        lines.push({ account: ledger.glForAccount(acct), debit: p.amount, credit: 0, ref: p.accountId });
      }
    }
    lines.push({ account: "sales_revenue", debit: 0, credit: bill.total });
    lines.push({ account: "cogs", debit: bill.cost, credit: 0 });
    lines.push({ account: "inventory", debit: 0, credit: bill.cost });
    return ledger.makeEntry(`Bill #${bill.billNo}`, "bill", bill.id, lines);
  };
  const purchaseEntryFor = (p) =>
    ledger.makeEntry("Purchase — stock received", "purchase", p.id, [
      { account: "purchases", debit: p.total, credit: 0 },
      { account: "inventory", debit: p.total, credit: 0 },
      { account: "purchases", debit: 0, credit: p.total },
      { account: "payables", debit: 0, credit: p.total, ref: p.supplierId },
    ]);
  const cashPaymentEntryFor = (pay) =>
    ledger.makeEntry("Supplier payment", "supplier_payment", pay.id, [
      { account: "payables", debit: pay.amount, credit: 0, ref: pay.supplierId },
      { account: "cash", debit: 0, credit: pay.amount, ref: pay.accountId },
    ]);
  const chequePaymentEntryFor = (pay) =>
    ledger.makeEntry("Supplier payment", "supplier_payment", pay.id, [
      { account: "payables", debit: pay.amount, credit: 0, ref: pay.supplierId },
      { account: "cheques_issued", debit: 0, credit: pay.amount, ref: pay.chequeId },
    ]);
  const mkCreditRow = (patch) => ({
    id: patch.id, customerId: "cust1", customerName: "Ahmad", customerPhone: "0300",
    kind: "credit", amount: 0, method: null, accountId: null, instrument: null,
    chequeId: null, note: "", billId: null, dayOffset: 0,
    ts: "2026-10-22T09:00:00.000Z", ...patch,
  });

  /* ---- seed identities: the cheque accounts start at zero ---- */
  check(
    eq(glInHand(journal), 0) && eq(glIssued(journal), 0) &&
      eq(cheques.unclearedInTotal([]), 0) && eq(cheques.pendingOutTotal([]), 0),
    "seed: GL cheques_in_hand == GL cheques_issued == 0 over the frozen seed journal"
  );

  /* ---- capture validation: a PDC's future due date is legal ---- */
  check(
    cheques.isValidChequeDraft({ chequeNo: "123", bankName: "Meezan", issueDateISO: TODAY, dueDateISO: "2027-03-01" }) === true &&
      cheques.isValidChequeDraft({ chequeNo: " ", bankName: "Meezan", issueDateISO: TODAY, dueDateISO: TODAY }) === false &&
      cheques.isValidChequeDraft({ chequeNo: "123", bankName: "Meezan", issueDateISO: TODAY, dueDateISO: "2026-13-40" }) === false &&
      cheques.isValidChequeDraft(null) === false,
    "capture: post-dated due dates validate; blank numbers and impossible dates refuse"
  );

  /* ================= IN lifecycle: bill → deposit → clear ================= */
  {
    const j = [...journal];
    const registry = [];
    const bill = { id: "bB5a", billNo: 501, customerId: "cust1", total: 15000, cost: 9000 };
    const chq1 = mkCheque({
      id: "chq1", chequeNo: "771201", amount: 10000, dueDateISO: "2026-11-21",
      partyId: "cust1", partyName: "Ahmad", sourceType: "bill", sourceId: "bB5a",
    });
    const tillBefore = ledger.moneyAccountBalance(j, till);
    const entry = billEntryFor(bill, [
      { method: "cash", amount: 5000, accountId: "acc-till" },
      { method: "bank", amount: 10000, instrument: "cheque", chequeId: "chq1" },
    ]);
    chq1.entryIds.captured = entry.id;
    j.push(entry);
    registry.push(chq1);
    check(ledger.entryBalances(entry), "IN capture: the host bill entry balances with the cheque leg inside it");
    check(
      eq(glInHand(j), 10000) && eq(glInHand(j), cheques.unclearedInTotal(registry)),
      "IN capture: GL cheques_in_hand 10,000 == Σ registry uncleared"
    );
    check(
      eq(ledger.moneyAccountBalance(j, till), tillBefore + 5000),
      "IN capture: only the cash part touched the till (+5,000); the cheque part touched no money account"
    );
    check(
      chq1.dueDateISO > TODAY && !cheques.chequeIsDue(chq1, TODAY) && !cheques.chequeIsOverdue(chq1, TODAY),
      "PDC: a cheque due 2026-11-21 captured today is neither due nor overdue"
    );

    /* deposit: custody only — the journal must not grow */
    const lenBefore = j.length;
    const deposited = { ...chq1, status: "deposited", accountId: "acc-bank" };
    registry[0] = deposited;
    check(
      j.length === lenBefore && eq(glInHand(j), cheques.unclearedInTotal(registry)),
      "deposit posts NOTHING: journal length unchanged, identity intact"
    );

    /* clear: exactly C lands in the deposit account */
    const bankBefore = ledger.moneyAccountBalance(j, bankAcct);
    const clearEntry = ledger.makeEntry(
      "Cheque cleared", "cheque_clearing", deposited.id,
      cheques.clearingLines(deposited, ledger.glForAccount(bankAcct))
    );
    j.push(clearEntry);
    registry[0] = { ...deposited, status: "cleared", entryIds: { ...deposited.entryIds, cleared: clearEntry.id } };
    check(
      ledger.entryBalances(clearEntry) && eq(ledger.moneyAccountBalance(j, bankAcct), bankBefore + 10000),
      "clear: Dr deposit account exactly 10,000, entry balanced"
    );
    check(
      eq(glInHand(j), 0) && eq(glInHand(j), cheques.unclearedInTotal(registry)),
      "clear: GL cheques_in_hand back to 0 == registry"
    );
    check(
      !cheques.canChequeTransition(registry[0], "clear") &&
        !cheques.canChequeTransition(registry[0], "bounce") &&
        !cheques.canChequeTransition(registry[0], "deposit"),
      "refusals: double-clear, bounce-after-clear and re-deposit of a cleared cheque all refuse"
    );
  }

  /* ============ IN bounce: receivable restored in BOTH books ============ */
  {
    const j = [...journal];
    const registry = [];
    const rows = [];
    const bill = { id: "bB5b", billNo: 502, customerId: "cust1", customerName: "Ahmad", customerPhone: "0300", total: 20000, cost: 12000 };
    const chq2 = mkCheque({
      id: "chq2", chequeNo: "771202", amount: 12000,
      partyId: "cust1", partyName: "Ahmad", sourceType: "bill", sourceId: "bB5b",
    });
    const recv0 = recvFor(j, "cust1");
    j.push(billEntryFor(bill, [
      { method: "credit", amount: 8000 },
      { method: "bank", amount: 12000, instrument: "cheque", chequeId: "chq2" },
    ]));
    rows.push(mkCreditRow({ id: "cr-b5b", kind: "credit", amount: 8000, billId: "bB5b" }));
    registry.push(chq2);
    check(
      eq(ledger.billCreditOutstanding(rows, bill).outstanding, 8000) &&
        eq(recvFor(j, "cust1"), recv0 + 8000),
      "bounce fixture: bill outstanding is the 8,000 credit part; journal receivables carry it too"
    );
    const deposited = { ...chq2, status: "deposited", accountId: "acc-bank" };
    registry[0] = deposited;
    const bankBefore = ledger.moneyAccountBalance(j, bankAcct);
    const bounceEntry = ledger.makeEntry(
      "Cheque bounced", "cheque_bounce", deposited.id, cheques.bounceInLines(deposited)
    );
    const chargesEntry = ledger.makeEntry(
      "Cheque bounced — bank charges", "cheque_bounce", deposited.id,
      cheques.bounceChargesLines(deposited, ledger.glForAccount(bankAcct), 500)
    );
    j.push(bounceEntry, chargesEntry);
    rows.push(mkCreditRow({ id: "cr-b5b-x", kind: "credit", amount: 12000, billId: "bB5b", note: "cheque bounced" }));
    registry[0] = { ...deposited, status: "bounced", chargesOnBounce: 500 };
    check(
      ledger.entryBalances(bounceEntry) && ledger.entryBalances(chargesEntry) &&
        chargesEntry.lines.some((l) => l.account === "expense_finance" && eq(l.debit, 500)) &&
        eq(ledger.moneyAccountBalance(j, bankAcct), bankBefore - 500),
      "bounce charges: their OWN balanced entry (Dr expense_finance 500), paid from the deposit account"
    );
    check(
      eq(glInHand(j), 0) && eq(glInHand(j), cheques.unclearedInTotal(registry)),
      "bounce: GL cheques_in_hand 0 == registry (bounced cheques are no longer in hand)"
    );
    check(
      eq(recvFor(j, "cust1"), recv0 + 20000) &&
        eq(ledger.billCreditOutstanding(rows, bill).outstanding, 20000),
      "bounce: receivable restored to the paisa in BOTH derivations (journal +20,000 over its prior level; F-6 lot 20,000)"
    );
    check(
      !cheques.canChequeTransition(registry[0], "clear") && !cheques.canChequeTransition(registry[0], "bounce"),
      "refusals: clearing or re-bouncing a bounced cheque refuses"
    );

    /* R-B3 orderings: bounce×return converge in the F-6 lot */
    const retRow = mkCreditRow({ id: "cr-b5b-r", kind: "credit", amount: -5000, billId: "bB5b" });
    const orderA = [...rows, retRow]; // bounce (already in rows) then return
    const orderB = [
      mkCreditRow({ id: "cr-b5b", kind: "credit", amount: 8000, billId: "bB5b" }),
      retRow,
      mkCreditRow({ id: "cr-b5b-x", kind: "credit", amount: 12000, billId: "bB5b", note: "cheque bounced" }),
    ]; // return then bounce
    check(
      eq(ledger.billCreditOutstanding(orderA, bill).outstanding, 15000) &&
        eq(ledger.billCreditOutstanding(orderB, bill).outstanding, 15000),
      "R-B3: bounce-then-return and return-then-bounce converge (outstanding 15,000 both ways)"
    );
  }

  /* ============ IN return undeposited (repayment capture) ============ */
  {
    const j = [...journal];
    const registry = [];
    const rows = [mkCreditRow({ id: "cr-b5c", kind: "credit", amount: 9000 })];
    const chq3 = mkCheque({
      id: "chq3", chequeNo: "771203", amount: 6000,
      partyId: "cust1", partyName: "Ahmad", sourceType: "repayment", sourceId: "rp-b5c",
    });
    j.push(ledger.makeEntry("Udhaar repayment received", "repayment", "rp-b5c", [
      { account: "cheques_in_hand", debit: 6000, credit: 0, ref: "chq3" },
      { account: "receivables", debit: 0, credit: 6000, ref: "cust1" },
    ]));
    rows.push(mkCreditRow({ id: "rp-b5c", kind: "repayment", amount: 6000, method: "bank", instrument: "cheque", chequeId: "chq3" }));
    registry.push(chq3);
    const key = ledger.creditKey(rows[0]);
    check(
      eq(ledger.customerOutstanding(rows, key), 3000) && eq(glInHand(j), cheques.unclearedInTotal(registry)),
      "repayment capture: udhaar falls by the cheque (9,000 → 3,000) while identity holds"
    );
    const retEntry = ledger.makeEntry(
      "Cheque returned to customer", "cheque_return", chq3.id, cheques.returnInLines(chq3)
    );
    j.push(retEntry);
    rows.push(mkCreditRow({ id: "cr-b5c-x", kind: "credit", amount: 6000, note: "cheque returned" }));
    registry[0] = { ...chq3, status: "returned" };
    check(
      ledger.entryBalances(retEntry) && eq(ledger.customerOutstanding(rows, key), 9000) &&
        eq(glInHand(j), 0) && eq(glInHand(j), cheques.unclearedInTotal(registry)),
      "return undeposited: receivable restored in both books; identity back to 0"
    );
  }

  /* ================= OUT lifecycle: issuance settles ================= */
  {
    const j = [...journal];
    const registry = [];
    const purchase = { id: "pB5a", supplierId: "sup1", total: 30000, dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
    const payments = [];
    j.push(purchaseEntryFor(purchase));
    const chqOut = mkCheque({
      id: "chqOut1", direction: "out", status: "issued", chequeNo: "990011", amount: 30000,
      partyId: "sup1", partyName: "Supplier One", partyKind: "supplier",
      sourceType: "supplier_payment", sourceId: "pay-b5a", accountId: "acc-bank",
    });
    const payRow = { id: "pay-b5a", supplierId: "sup1", amount: 30000, method: "bank", accountId: "acc-bank", instrument: "cheque", chequeId: "chqOut1", note: "", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
    j.push(chequePaymentEntryFor(payRow));
    payments.push(payRow);
    registry.push(chqOut);
    check(
      eq(payFor(j, "sup1"), 0) && eq(ledger.supplierBalance([purchase], payments, "sup1"), 0) &&
        eq(ledger.payablesAging([purchase], payments).total, 0),
      "issuance settles the payable AT ISSUANCE: journal ≡ subledger ≡ aging, all 0"
    );
    check(
      eq(glIssued(j), 30000) && eq(glIssued(j), cheques.pendingOutTotal(registry)),
      "issuance: GL cheques_issued 30,000 == Σ registry pending out"
    );
    const bankBefore = ledger.moneyAccountBalance(j, bankAcct);
    const clearEntry = ledger.makeEntry(
      "Cheque cleared", "cheque_clearing", chqOut.id,
      cheques.clearingLines(chqOut, ledger.glForAccount(bankAcct))
    );
    j.push(clearEntry);
    registry[0] = { ...chqOut, status: "cleared" };
    check(
      ledger.entryBalances(clearEntry) &&
        eq(ledger.moneyAccountBalance(j, bankAcct), bankBefore - 30000) &&
        eq(glIssued(j), 0) && eq(glIssued(j), cheques.pendingOutTotal(registry)),
      "OUT clear: drawn-on account falls by exactly 30,000; bridge back to 0 == registry"
    );
  }

  /* ============ OUT bounce pre-clearing: payable re-opens ============ */
  {
    const j = [...journal];
    const registry = [];
    const purchase = { id: "pB5b", supplierId: "sup1", total: 30000, dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
    const payments = [];
    j.push(purchaseEntryFor(purchase));
    const chqOut = mkCheque({
      id: "chqOut2", direction: "out", status: "issued", chequeNo: "990012", amount: 30000,
      partyId: "sup1", partyName: "Supplier One", partyKind: "supplier",
      sourceType: "supplier_payment", sourceId: "pay-b5b", accountId: "acc-bank",
    });
    const payRow = { id: "pay-b5b", supplierId: "sup1", amount: 30000, method: "bank", accountId: "acc-bank", instrument: "cheque", chequeId: "chqOut2", note: "", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
    j.push(chequePaymentEntryFor(payRow));
    payments.push(payRow);
    registry.push(chqOut);
    const bounceEntry = ledger.makeEntry(
      "Cheque bounced", "cheque_bounce", chqOut.id, cheques.bounceOutLines(chqOut)
    );
    j.push(bounceEntry);
    payments.push({ ...payRow, id: "pay-b5b-x", kind: "reversal", instrument: null, chequeId: null, note: "cheque bounced" });
    registry[0] = { ...chqOut, status: "bounced" };
    check(
      ledger.entryBalances(bounceEntry) && eq(ledger.supplierPaid(payments, "sup1"), 0),
      "OUT bounce: the reversal row nets supplierPaid back to 0 (the kind carries the sign)"
    );
    check(
      eq(payFor(j, "sup1"), 30000) &&
        eq(ledger.supplierBalance([purchase], payments, "sup1"), 30000) &&
        eq(ledger.payablesAging([purchase], payments).total, 30000),
      "OUT bounce: payable re-opens to the paisa in journal ≡ subledger ≡ aging (30,000)"
    );
    check(
      eq(glIssued(j), 0) && eq(glIssued(j), cheques.pendingOutTotal(registry)),
      "OUT bounce: bridge back to 0 == registry"
    );
  }

  /* ============ partial: cash + cheque; bounce reopens only the cheque ============ */
  {
    const j = [...journal];
    const purchase = { id: "pB5c", supplierId: "sup1", total: 30000, dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
    const payments = [];
    j.push(purchaseEntryFor(purchase));
    const cashRow = { id: "pay-b5c1", supplierId: "sup1", amount: 10000, method: "cash", accountId: "acc-till", note: "", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
    j.push(cashPaymentEntryFor(cashRow));
    payments.push(cashRow);
    const chqRow = { id: "pay-b5c2", supplierId: "sup1", amount: 20000, method: "bank", accountId: "acc-bank", instrument: "cheque", chequeId: "chqOut3", note: "", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" };
    j.push(chequePaymentEntryFor(chqRow));
    payments.push(chqRow);
    const chqOut3 = mkCheque({
      id: "chqOut3", direction: "out", status: "issued", amount: 20000,
      partyId: "sup1", partyName: "Supplier One", partyKind: "supplier",
      sourceType: "supplier_payment", sourceId: "pay-b5c2", accountId: "acc-bank",
    });
    j.push(ledger.makeEntry("Cheque bounced", "cheque_bounce", chqOut3.id, cheques.bounceOutLines(chqOut3)));
    payments.push({ ...chqRow, id: "pay-b5c2-x", kind: "reversal", instrument: null, chequeId: null });
    check(
      eq(payFor(j, "sup1"), 20000) && eq(ledger.supplierBalance([purchase], payments, "sup1"), 20000),
      "partial: bouncing the 20,000 cheque re-opens exactly 20,000 — the 10,000 cash part stays settled"
    );
  }

  /* ============ two cheques on one bill: Σ identity under mix ============ */
  {
    const j = [...journal];
    const registry = [];
    const bill = { id: "bB5d", billNo: 504, customerId: "cust1", total: 25000, cost: 15000 };
    const cA = mkCheque({ id: "chqA", amount: 10000, partyId: "cust1", sourceType: "bill", sourceId: "bB5d" });
    const cB = mkCheque({ id: "chqB", amount: 15000, partyId: "cust1", sourceType: "bill", sourceId: "bB5d" });
    const recv0 = recvFor(j, "cust1");
    j.push(billEntryFor(bill, [
      { method: "bank", amount: 10000, instrument: "cheque", chequeId: "chqA" },
      { method: "bank", amount: 15000, instrument: "cheque", chequeId: "chqB" },
    ]));
    registry.push(cA, cB);
    const depA = { ...cA, status: "deposited", accountId: "acc-bank" };
    const depB = { ...cB, status: "deposited", accountId: "acc-bank" };
    registry[0] = depA;
    registry[1] = depB;
    j.push(ledger.makeEntry("Cheque cleared", "cheque_clearing", depA.id, cheques.clearingLines(depA, ledger.glForAccount(bankAcct))));
    registry[0] = { ...depA, status: "cleared" };
    j.push(ledger.makeEntry("Cheque bounced", "cheque_bounce", depB.id, cheques.bounceInLines(depB)));
    registry[1] = { ...depB, status: "bounced" };
    check(
      eq(glInHand(j), 0) && eq(glInHand(j), cheques.unclearedInTotal(registry)) &&
        eq(recvFor(j, "cust1"), recv0 + 15000),
      "mixed: one clears (+10,000 to the bank), one bounces (+15,000 receivable) — GL ≡ registry at 0"
    );
  }

  /* ================= transition refusal matrix ================= */
  {
    const inReceived = mkCheque({ id: "m1", status: "received" });
    const inDeposited = mkCheque({ id: "m2", status: "deposited", accountId: "acc-bank" });
    const outIssued = mkCheque({ id: "m3", direction: "out", status: "issued", sourceType: "supplier_payment" });
    const outExpense = mkCheque({ id: "m4", direction: "out", status: "issued", sourceType: "expense", partyKind: "expense" });
    check(
      !cheques.canChequeTransition(inReceived, "clear") && !cheques.canChequeTransition(inReceived, "bounce"),
      "refusals: clear-before-deposit and bounce-before-deposit refuse (the bank has not seen it)"
    );
    check(
      !cheques.canChequeTransition(outIssued, "deposit") && !cheques.canChequeTransition(inDeposited, "return"),
      "refusals: depositing an OUT cheque and returning a DEPOSITED cheque refuse"
    );
    check(
      cheques.canChequeTransition(outExpense, "clear") && !cheques.canChequeTransition(outExpense, "bounce"),
      "expense cheques: clearing is a registry action; bouncing is NOT (the F-5 expense path owns it)"
    );
  }

  /* ================= PDC due / overdue edges ================= */
  {
    const dueToday = mkCheque({ id: "d1", status: "received", dueDateISO: TODAY });
    const dueYesterday = mkCheque({ id: "d2", status: "deposited", dueDateISO: "2026-10-21" });
    const clearedOld = mkCheque({ id: "d3", status: "cleared", dueDateISO: "2026-10-01" });
    check(
      cheques.chequeIsDue(dueToday, TODAY) && !cheques.chequeIsOverdue(dueToday, TODAY),
      "PDC edge: due today is DUE, not overdue"
    );
    check(
      cheques.chequeIsOverdue(dueYesterday, TODAY) && !cheques.chequeIsOverdue(clearedOld, TODAY),
      "PDC edge: pending past due is overdue; a cleared cheque never is"
    );
  }

  /* ============ day close: instrument parts leave the cash buckets ============ */
  {
    const dc = ledger.dayCloseSummary({
      sales: [],
      bills: [{
        id: "bB5e", billNo: 505, dayOffset: 0, status: "paid",
        payments: [
          { method: "cash", amount: 5000 },
          { method: "bank", amount: 10000, instrument: "cheque", chequeId: "chqZ" },
        ],
      }],
      expenses: [
        { id: "e1", category: "rent", amount: 2000, method: "cash", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" },
        { id: "e2", category: "other", amount: 3000, method: "bank", instrument: "cheque", chequeId: "chqY", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" },
      ],
      credits: [
        mkCreditRow({ id: "rp1", kind: "repayment", amount: 4000, method: "cash" }),
        mkCreditRow({ id: "rp2", kind: "repayment", amount: 6000, method: "bank", instrument: "cheque", chequeId: "chqW" }),
      ],
      supplierPayments: [
        { id: "sp1", supplierId: "sup1", amount: 7000, method: "bank", instrument: "cheque", chequeId: "chqV", dayOffset: 0, ts: "2026-10-22T09:00:00.000Z" },
      ],
      returnsRefundCash: 0, cashIn: 0, cashOut: 0, openingCash: 0,
    });
    check(
      eq(dc.salesByMethod.cash, 5000) && eq(dc.salesByMethod.bank, 0),
      "day close: the cheque bill part is in NO method bucket (cash 5,000 only)"
    );
    check(
      eq(dc.creditReceived, 10000) && eq(dc.expectedCash, 5000 + 4000 - 2000),
      "day close: cheque repayment counts as received value but not as drawer cash (expected cash excludes it)"
    );
    check(
      eq(dc.expensesTotal, 5000) && eq(dc.expensesCash, 2000) && eq(dc.supplierPaidCash, 0),
      "day close: cheque expense counts in expensesTotal, leaves expensesCash; cheque supplier payment is not cash out"
    );
  }

  /* ================= RBAC: the cheques matrix row ================= */
  check(
    perm.can("owner", "cheques", "write") && perm.can("manager", "cheques", "write") &&
      perm.can("accountant", "cheques", "write") && perm.can("accountant", "cheques", "view"),
    "RBAC: owner / manager / accountant hold the cheques row in full"
  );
  check(
    !perm.can("cashier", "cheques", "view") && !perm.can("cashier", "cheques", "write"),
    "RBAC: the cashier has NO registry access (capture at the desk is the billing row's business)"
  );

  /* ================= source invariants ================= */
  const storeSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8"
  );
  check(
    storeSrc.includes("depositCheque") && storeSrc.includes("cheques_issued") &&
      storeSrc.includes("compensatingCreditRow") && storeSrc.includes("commitChequeTransition"),
    "source: StoreProvider carries the cheque capture + lifecycle actions"
  );
  const rulesSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8"
  );
  const chqBlock = rulesSrc.slice(
    rulesSrc.indexOf("match /cheques/{chequeId}"),
    rulesSrc.indexOf("match /cheques/{chequeId}") + 400
  );
  check(
    chqBlock.includes("allow create: if canAccess(uid) && createInOpenPeriod(uid);") &&
      chqBlock.includes("allow update: if hasRole(uid, ['owner', 'manager', 'accountant']);") &&
      rulesSrc.includes("R-B6"),
    "rules: cheques block = canAccess create (G-3, R-B6 noted) + matrix-row update + owner delete"
  );
}

suite("B6", null); // payment vouchers + prints (design §5, §9 B6)
{
  /* ---- numbering: the §1.3 max+1 pattern, RV-/PV- series ---- */
  check(docs.nextDocNumber("receiptVoucher", [], null) === "RV-1",
    "RV: empty series mints RV-1");
  check(docs.nextDocNumber("receiptVoucher", ["RV-1", "RV-2"], null) === "RV-3",
    "RV: sequence continues at max+1");
  check(docs.nextDocNumber("receiptVoucher", [null, undefined, "RV-3"], null) === "RV-4",
    "RV: unstamped (pre-B6) rows contribute no sequence");
  check(docs.nextDocNumber("paymentVoucher", ["PV-2"], null) === "PV-3",
    "PV: independent series, max+1");
  const overrideSettings = { docSeries: { receiptVoucher: "RCPT-" } };
  check(docs.nextDocNumber("receiptVoucher", [], overrideSettings) === "RCPT-1",
    "RV: owner prefix override applies to future mints");
  check(docs.nextDocNumber("receiptVoucher", ["RV-7"], overrideSettings) === "RCPT-8",
    "RV: sequence stays monotonic across a prefix change (stored numbers never rewritten)");

  /* ---- mixed workload: stamping replicates the store's two
   * expressions exactly (nextDocNumber over the subscribed rows,
   * stamped INSIDE the row the action writes). ---- */
  const wCredits = credits.map((c) => ({ ...c }));
  const wPayments = payments.map((p) => ({ ...p }));
  check(wCredits.filter((e) => e.kind === "repayment").every((e) => e.voucherNo == null),
    "legacy: seed repayment rows carry no voucherNo");
  check(wPayments.every((p) => p.voucherNo == null),
    "legacy: seed supplier payments carry no voucherNo");
  const stampRv = () => docs.nextDocNumber("receiptVoucher",
    wCredits.filter((e) => e.kind === "repayment").map((e) => e.voucherNo), null);
  const stampPv = () => docs.nextDocNumber("paymentVoucher",
    wPayments.map((p) => p.voucherNo), null);
  const minted = [];
  const repay = (amount) => {
    const row = { id: `cr-w${minted.length}`, customerId: "cu1", customerName: "W", customerPhone: "",
      kind: "repayment", amount, method: "cash", voucherNo: stampRv(), note: "", billId: null, dayOffset: 0, ts: "" };
    wCredits.push(row); minted.push(row.voucherNo); return row;
  };
  const pay = (amount) => {
    const row = { id: `sp-w${minted.length}`, supplierId: "su1", amount, method: "cash",
      voucherNo: stampPv(), note: "", dayOffset: 0, ts: "" };
    wPayments.push(row); minted.push(row.voucherNo); return row;
  };
  check(repay(5000).voucherNo === "RV-1", "workload: first repayment mints RV-1");
  check(pay(8000).voucherNo === "PV-1", "workload: first supplier payment mints PV-1");
  check(repay(2500).voucherNo === "RV-2", "workload: RV sequence independent of PV writes");
  // a cheque-bounce reversal row (B5) is written WITHOUT a stamp:
  wPayments.push({ id: "sp-rev", supplierId: "su1", amount: 8000, method: "bank", kind: "reversal", note: "", dayOffset: 0, ts: "" });
  check(pay(1000).voucherNo === "PV-2", "workload: unstamped reversal row does not disturb the PV sequence");
  check(repay(700).voucherNo === "RV-3", "workload: RV-3 next");
  check(new Set(minted).size === minted.length, "workload: every minted number unique across the mixed session");
  const wouldBe = stampRv();
  // (a posting refused by the guard writes nothing — the number is
  // computed again from stored rows, so the refusal burns nothing)
  check(stampRv() === wouldBe && repay(300).voucherNo === wouldBe,
    "no-burn: a refused posting's number is re-minted by the next successful repayment");
  check(wCredits.slice(0, credits.length).every((e) => e.voucherNo == null) &&
        wPayments.slice(0, payments.length).every((p) => p.voucherNo == null),
    "legacy: pre-B6 rows were never rewritten by the workload");

  /* ---- no journal writes anywhere in this increment ---- */
  check(journal.length === 21, "journal: still the frozen 21 seed entries after a voucher-only session");
  const tbNet = journal.reduce((a, e) => a + e.lines.reduce((x, l) => x + l.debit - l.credit, 0), 0);
  check(Math.abs(tbNet) < 0.005 && journal.every((e) => ledger.entryBalances(e)),
    "journal: trial balance still 0, every entry balanced");
  const storeSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check((storeSrc.match(/makeEntry\(/g) || []).length === 24,
    "source: B6 added no makeEntry call (24 == pre-B6 count) — stamping posts nothing");
  check((storeSrc.match(/voucherNo: nextDocNumber\(/g) || []).length === 2 &&
        storeSrc.includes('"receiptVoucher"') && storeSrc.includes('"paymentVoucher"'),
    "source: exactly two stamp sites (addRepayment RV-, recordSupplierPayment PV-), inside the row writes");
  const rulesSrc6 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  /* Phase C · C1 amended this check (same check, same count): the
   * rules file gained ADDITIVE C1 blocks (warehouses + stockLevels)
   * after B6. Stripping exactly those blocks must reproduce the
   * pre-B6 file byte-for-byte — the original SHA below — which
   * proves C1 changed NO existing rule line. */
  const c1Start6 = rulesSrc6.indexOf("      // Phase C · C1");
  const c1End6 = rulesSrc6.indexOf("      // Expenses:", c1Start6);
  const rulesStripped6 = c1Start6 >= 0 && c1End6 > c1Start6
    ? rulesSrc6.slice(0, c1Start6) + rulesSrc6.slice(c1End6)
    : rulesSrc6;
  check(crypto.createHash("sha256").update(rulesStripped6, "utf8").digest("hex") ===
        "73177ac06f42d4a65ab68c6a7eb6f74e776c38da525742d90a77de0502436e87" &&
        !rulesSrc6.includes("match /vouchers"),
    "rules: byte-identical to pre-B6 outside the additive C1 blocks (no voucher collection, fields ride existing documents)");

  /* ---- print data builders: figures EQUAL the source rows ---- */
  const rvRow = { id: "cr-x", customerId: "cu1", customerName: "Ahmed Raza", customerPhone: "0300-1",
    kind: "repayment", amount: 5000, method: "jazzcash", accountId: "acc-w",
    voucherNo: "RV-1", note: "part payment", billId: null, dayOffset: 0, ts: "2026-10-22T05:00:00.000Z" };
  const rv = docs.receiptVoucherData(rvRow, { accountName: "JazzCash Wallet", balanceAfter: 2500 });
  check(rv.kind === "receipt" && rv.number === "RV-1", "RV print: kind + stamped number");
  check(rv.amount === rvRow.amount && rv.method === "jazzcash" && rv.note === rvRow.note,
    "RV print: amount/method/note equal the source row exactly");
  check(rv.partyName === "Ahmed Raza" && rv.partyPhone === "0300-1" && rv.ts === rvRow.ts,
    "RV print: party snapshot + date from the row");
  check(rv.accountName === "JazzCash Wallet" && rv.balanceAfter === 2500,
    "RV print: account name resolved for display; balance-after is the caller-derived current balance");
  check(rv.instrument === null && rv.chequeNo === null && rv.chequeBank === null && rv.chequeDueDateISO === null,
    "RV print: a money repayment carries no cheque fields");
  const rvChq = docs.receiptVoucherData(
    { ...rvRow, method: "bank", accountId: null, instrument: "cheque", chequeId: "chq1", voucherNo: "RV-2" },
    { cheque: { chequeNo: "004512", bankName: "HBL", dueDateISO: "2026-11-01" }, balanceAfter: 0 });
  check(rvChq.instrument === "cheque" && rvChq.chequeNo === "004512" && rvChq.chequeBank === "HBL" &&
        rvChq.chequeDueDateISO === "2026-11-01" && rvChq.accountName === null,
    "RV print: a cheque repayment shows the instrument (number/bank/due date), no money account");
  const rvLegacy = docs.receiptVoucherData(
    { id: "cr-old", customerId: null, customerName: "Old", customerPhone: "", kind: "repayment",
      amount: 900, method: "cash", note: "", billId: null, dayOffset: 3, ts: "2026-10-01T00:00:00.000Z" },
    { balanceAfter: 100 });
  check(rvLegacy.number === null && rvLegacy.amount === 900,
    "RV print: a pre-B6 row prints UNNUMBERED without error (no fabricated history)");
  const pvRow = { id: "sp-x", supplierId: "su1", amount: 8000, method: "bank", accountId: "acc-b",
    voucherNo: "PV-2", note: "against Oct invoice", dayOffset: 0, ts: "2026-10-22T06:00:00.000Z" };
  const pv = docs.paymentVoucherData(pvRow, "Malik Traders", { accountName: "Main Bank", balanceAfter: 12000 });
  check(pv.kind === "payment" && pv.number === "PV-2" && pv.amount === pvRow.amount && pv.method === "bank",
    "PV print: kind/number/amount/method equal the source row exactly");
  check(pv.partyName === "Malik Traders" && pv.accountName === "Main Bank" && pv.balanceAfter === 12000 && pv.note === pvRow.note,
    "PV print: supplier name supplied by caller; account + current payable resolved for display");
  const pvChq = docs.paymentVoucherData(
    { ...pvRow, instrument: "cheque", chequeId: "chq9", voucherNo: "PV-3" },
    "Malik Traders",
    { cheque: { chequeNo: "778899", bankName: "MCB", dueDateISO: "2026-10-30" }, balanceAfter: 4000 });
  check(pvChq.instrument === "cheque" && pvChq.chequeNo === "778899" && pvChq.chequeDueDateISO === "2026-10-30",
    "PV print: an issued-cheque payment shows the instrument it settled with");
  const rvAgain = docs.receiptVoucherData(rvRow, { accountName: "JazzCash Wallet", balanceAfter: 2500 });
  check(JSON.stringify(rvAgain) === JSON.stringify(rv),
    "print builders are language-neutral: identical figures in EN and UR modes (labels are dictionary-side)");

  /* ---- i18n: every B6 key exists in BOTH dictionaries ---- */
  const docsI18n = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/i18n/parts/docs.ts", "utf8");
  const twice = (k) => (docsI18n.match(new RegExp(`"${k.replace(/\./g, "\\.")}"`, "g")) || []).length === 2;
  check(["voucher.receiptTitle", "voucher.paymentTitle", "voucher.balanceAfterCustomer",
         "voucher.balanceAfterSupplier", "voucher.signature"].every(twice),
    "i18n: all voucher.* keys present in EN and UR");
  check(["quote.wa.title", "quote.wa.estTax", "quote.wa.validUntil"].every(twice),
    "i18n: all quote.wa.* keys present in EN and UR");
}

suite("SEARCH", 72);
{
  const refProductPred = (s) => (p) => {
    const q = s.trim().toLowerCase();
    return p.name.toLowerCase().includes(q) || p.urduName.includes(s.trim()) || p.sku.toLowerCase().includes(q);
  };
  const refInvPred = (s) => (p) => {
    const q = s.trim().toLowerCase();
    return p.name.toLowerCase().includes(q) || p.urduName.includes(s.trim()) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q);
  };
  const refCustPred = (s) => (c) => {
    const q = s.trim().toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(s.trim()) || c.address.toLowerCase().includes(q);
  };
  const ids = (arr) => arr.map((x) => x.id).join(",");

  /* (a) equivalence on well-formed seed data */
  for (const q of ["tapal", "TEA", "چائے", "oil", "rice", "salt", "zzz", "", "  "]) {
    check(
      ids(products.filter(refProductPred(q))) === ids(search.filterProducts(products, q)),
      `product equivalence for query ${JSON.stringify(q)}`
    );
  }
  for (const q of ["beverages", "oil", "zzz"]) {
    check(
      ids(products.filter(refInvPred(q))) === ids(search.filterProducts(products, q, true)),
      `inventory (with category) equivalence for query ${JSON.stringify(q)}`
    );
  }
  for (const q of ["a", "0300", "zzz", ""]) {
    check(
      ids(customers.filter(refCustPred(q))) ===
        ids(customers.filter((c) => search.customerMatches(c, q))),
      `customer equivalence for query ${JSON.stringify(q)}`
    );
  }

  /* findProductBySku (billing desk SKU entry) */
  const tapal = products.find((p) => p.name.includes("Tapal"));
  check(search.findProductBySku(products, tapal.sku.toLowerCase()) === tapal, "SKU lookup: exact hit, case-insensitive");
  check(search.findProductBySku(products, "NO-SUCH-SKU") === undefined, "SKU lookup: miss is undefined");
  check(search.findProductBySku(products, "   ") === undefined, "SKU lookup: blank code is undefined");

  /* (b) legacy field-missing products */
  const noUrdu = { id: "L1", name: "Old Tea", sku: "OLD-1", category: "General" };
  const noSku = { id: "L2", name: "Old Rice", urduName: "پرانا چاول", category: "General" };
  const noCat = { id: "L3", name: "Old Oil", urduName: "پرانا تیل", sku: "OLD-3" };
  const noName = { id: "L4", urduName: "بے نام", sku: "OLD-4", category: "General" };
  const nullFields = { id: "L5", name: "Null Fields", urduName: null, sku: null, category: null };
  const numericSku = { id: "L6", name: "Numeric SKU", urduName: "", sku: 12345, category: "General" };
  const legacy = [noUrdu, noSku, noCat, noName, nullFields, numericSku];

  check(ids(search.filterProducts(legacy, "old tea")) === "L1", "missing urduName: still found by name");
  check(ids(search.filterProducts(legacy, "old-1")) === "L1", "missing urduName: still found by sku");
  check(search.filterProducts(legacy, "zzz").length === 0, "mixed legacy list: non-matching query returns [] without throwing");
  check(ids(search.filterProducts(legacy, "پرانا چاول")) === "L2", "missing sku: still found by urduName");
  check(ids(search.filterProducts(legacy, "old oil")) === "L3", "missing category: found by name (category search on)");
  check(search.filterProducts(legacy, "zzz", true).length === 0, "missing category: category search never throws");
  check(ids(search.filterProducts(legacy, "بے نام")) === "L4", "missing name: still found by urduName");
  check(ids(search.filterProducts(legacy, "old-4")) === "L4", "missing name: still found by sku");
  check(ids(search.filterProducts(legacy, "null fields")) === "L5", "null fields: found by name");
  check(search.filterProducts([nullFields], "zzz").length === 0, "null fields: non-matching query never throws");
  check(ids(search.filterProducts(legacy, "12345")) === "L6", "numeric sku coerced: found by its digits");
  check(
    ids(search.filterProducts([tapal, noUrdu], "zzz")) === "" &&
      ids(search.filterProducts([tapal, noUrdu], "tapal")) === tapal.id,
    "one field-missing doc no longer poisons the whole list"
  );
  check(search.findProductBySku(legacy, "OLD-3") === noCat, "SKU lookup across sku-less docs still hits");
  check(search.findProductBySku(legacy, "OLD-9") === undefined, "SKU lookup across sku-less docs: miss is undefined");

  /* legacy customers */
  const custNoAddr = { id: "c9", name: "Bilal Ahmad", phone: "03219998877" };
  const custNoPhone = { id: "c10", name: "Sana", address: "Farooka Bazaar" };
  check(search.customerMatches(custNoAddr, "bilal") === true, "customer missing address: found by name");
  check(search.customerMatches(custNoAddr, "0321") === true, "customer missing address: found by phone");
  check(search.customerMatches(custNoAddr, "zzz") === false, "customer missing address: miss never throws");
  check(search.customerMatches(custNoPhone, "bazaar") === true, "customer missing phone: found by address");

  /* legacy bills (history search) */
  const billNoPhone = { billNo: 102, customerName: "Walk-in Customer" };
  const billNoName = { billNo: 103, customerPhone: "03112223334" };
  check(search.billMatches(billNoPhone, "walk-in") === true, "bill missing phone: found by customer name");
  check(search.billMatches(billNoPhone, "102") === true, "bill missing phone: found by bill number");
  check(search.billMatches(billNoPhone, "zzz") === false, "bill missing phone: miss never throws");
  check(search.billMatches(billNoName, "0311") === true, "bill missing name: found by phone");

  /* credit groups + generic document matching */
  check(search.creditGroupMatches({ name: "Haji Sahib" }, "haji") === true, "credit group missing phone: found by name");
  check(search.creditGroupMatches({ name: "Haji Sahib" }, "zzz") === false, "credit group missing phone: miss never throws");
  check(search.matchesAny("ahmed", [null, "Ahmed Raza", undefined]) === true, "document match: null number skipped, name hits");
  check(search.matchesAny("zzz", [undefined, null]) === false, "document match: all fields absent is a miss, not a throw");
  check(search.matchesAny("", [undefined]) === true, "document match: blank query matches (early-return parity)");

  /* adjustments */
  const adjNoNote = { productName: "Tapal Tea", reason: "damage" };
  check(search.adjustmentMatches(adjNoNote, "tapal") === true, "adjustment missing note: found by product");
  check(search.adjustmentMatches(adjNoNote, "damage") === true, "adjustment missing note: found by reason");
  check(search.adjustmentMatches(adjNoNote, "zzz") === false, "adjustment missing note: miss never throws");

  /* suppliers — the deferred SuppliersManager fix (B4 release) */
  const refSuppPred = (s) => (x) => {
    const q = s.trim().toLowerCase();
    return x.name.toLowerCase().includes(q) || x.company.toLowerCase().includes(q) || x.phone.includes(s.trim());
  };
  const seedSuppliers = seed.getSeedSuppliers();
  for (const q of ["malik", "0300", "tea", "zzz", ""]) {
    check(
      ids(seedSuppliers.filter(refSuppPred(q))) ===
        ids(seedSuppliers.filter((x) => search.supplierMatches(x, q))),
      `supplier equivalence for query ${JSON.stringify(q)}`
    );
  }
  const supNoCompany = { id: "sL1", name: "Bilal Sons", phone: "0311-5556667" };
  const supNoPhone = { id: "sL2", name: "Chenab Foods", company: "Chenab Foods (Pvt) Ltd" };
  const supNull = { id: "sL3", name: null, company: null, phone: null };
  check(search.supplierMatches(supNoCompany, "bilal") === true, "supplier missing company: found by name");
  check(search.supplierMatches(supNoCompany, "0311") === true, "supplier missing company: found by phone");
  check(search.supplierMatches(supNoCompany, "zzz") === false, "supplier missing company: miss never throws");
  check(search.supplierMatches(supNoPhone, "chenab foods (pvt)") === true, "supplier missing phone: found by company");
  check(search.supplierMatches(supNull, "zzz") === false, "supplier null fields: miss never throws");
  check(
    ids([seedSuppliers[0], supNoCompany].filter((x) => search.supplierMatches(x, "malik"))) === "sup-1" &&
      [seedSuppliers[0], supNoCompany].filter((x) => search.supplierMatches(x, "zzz")).length === 0,
    "one field-missing supplier no longer poisons the whole list"
  );

  /* notes — the deferred NotesViews fix (B4 release). The component
   * predicate IS matchesAny(query, [n.number, n.partyName, n.billNo]),
   * so these checks exercise that exact call shape. */
  const refNotePred = (s) => (n) => {
    const q = s.trim().toLowerCase();
    if (!q) return true;
    return (
      n.number.toLowerCase().includes(q) ||
      n.partyName.toLowerCase().includes(q) ||
      (n.billNo != null && String(n.billNo).includes(q))
    );
  };
  const notePred = (n, q) => search.matchesAny(q, [n.number, n.partyName, n.billNo]);
  const wellNotes = [
    { id: "n1", number: "CN-1", partyName: "Ahmed Raza", billNo: 105 },
    { id: "n2", number: "DN-2", partyName: "Malik Traders", billNo: null },
  ];
  for (const q of ["cn-", "malik", "105", "zzz"]) {
    check(
      ids(wellNotes.filter(refNotePred(q))) === ids(wellNotes.filter((n) => notePred(n, q))),
      `note equivalence for query ${JSON.stringify(q)}`
    );
  }
  const noteNoBill = { number: "CN-1", partyName: "Ahmed Raza" };
  const noteNumericBill = { number: "DN-2", partyName: "Malik Traders", billNo: 105 };
  const noteNullBill = { number: "CN-9", partyName: "Walk-in Customer", billNo: null };
  check(notePred(noteNoBill, "cn-1") === true, "note missing billNo: found by number");
  check(notePred(noteNoBill, "ahmed") === true, "note missing billNo: found by party name");
  check(notePred(noteNoBill, "zzz") === false, "note missing billNo: miss never throws");
  check(notePred(noteNumericBill, "105") === true, "note numeric billNo: coerced and found by bill number");
  check(notePred(noteNullBill, "105") === false, "note null billNo: bill-number query is a miss, not a throw");
  check(notePred(noteNullBill, "walk-in") === true, "note null billNo: found by party name");

  /* source invariants: the two components delegate to lib/search */
  const suppSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/SuppliersManager.tsx", "utf8"
  );
  check(
    suppSrc.includes("supplierMatches(s, search)") && !suppSrc.includes("s.company.toLowerCase()"),
    "source: SuppliersManager delegates its search to supplierMatches (no raw predicate left)"
  );
  const notesSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/NotesViews.tsx", "utf8"
  );
  check(
    notesSrc.includes("matchesAny(query, [n.number, n.partyName, n.billNo])") &&
      !notesSrc.includes("n.partyName.toLowerCase()"),
    "source: NotesViews delegates its search to matchesAny (no raw predicate left)"
  );
}

suite("REPORTS", null); // Reports section — report == screen identities
{
  const R = reports;
  const FULL = {
    fromDate: "2000-01-01",
    toDate: "2999-12-31",
    fromTs: "2000-01-01T00:00:00.000Z",
    toTs: "2999-01-01T00:00:00.000Z",
  };
  const settings = seed.getSeedSettings();
  const rProducts = seed.getSeedProducts();
  const rSales = seed.getSeedSales();
  const rPurchases = seed.getSeedPurchases();
  const rPayments = seed.getSeedSupplierPayments();
  const rExpenses = seed.getSeedExpenses();
  const rCredits = seed.getSeedCredits();
  const rSuppliers = seed.getSeedSuppliers();
  const rAccounts = seed.getSeedAccounts();
  const rJournal = seed.getSeedJournal(
    rProducts, rSales, rPurchases, rPayments, rExpenses, rCredits
  );

  /* ---- ranges: presets, FY boundary, inclusivity edges ---- */
  const oct = R.resolveReportRange("custom", settings, { from: "2026-10-01", to: "2026-10-31" });
  check(oct.fromTs === periods.startOfDayPktInstant("2026-10-01"), "range: custom fromTs is the PKT start of the from-date");
  check(oct.toTs === periods.startOfDayPktInstant("2026-11-01"), "range: custom toTs is the PKT start of the day AFTER the to-date");
  check(R.inRange(oct.fromTs, oct) === true, "range: fromTs instant itself is included");
  check(R.inRange(oct.toTs, oct) === false, "range: toTs instant itself is excluded (half-open)");
  check(R.inRange(periods.endOfDayPktInstant("2026-10-31"), oct) === true, "range: the to-date's last PKT instant is included");
  const fy = periods.currentFiscalYear(settings);
  const fyRange = R.resolveReportRange("fiscal", settings);
  check(fyRange.fromDate === fy.startDate && fyRange.toDate === fy.endDate,
    "range: fiscal preset == currentFiscalYear (A5)");
  check(R.inRange(fy.fromTs, fyRange) === true && R.inRange(fy.toTs, fyRange) === false,
    "range: FY boundary — first instant in, first instant of next FY out");
  const todayR = R.resolveReportRange("today", settings);
  check(todayR.fromDate === periods.todayPktISO() && todayR.toDate === todayR.fromDate,
    "range: today preset is the single PKT business date");
  const weekR = R.resolveReportRange("week", settings);
  const [wy, wm, wd] = weekR.fromDate.split("-").map(Number);
  check(new Date(Date.UTC(wy, wm - 1, wd)).getUTCDay() === 1, "range: week starts on a Monday");
  check(periods.addDaysISO(weekR.fromDate, 6) === weekR.toDate, "range: week spans 7 days");
  const monthR = R.resolveReportRange("month", settings);
  check(monthR.fromDate.endsWith("-01") && periods.addDaysISO(monthR.toDate, 1).endsWith("-01"),
    "range: month runs 1st to the month's last day");

  /* ---- P&L identity: report == FinanceView's computation ---- */
  const plFull = R.plReport(rJournal, FULL);
  const plRef = ledger.profitAndLossInRange(rJournal, FULL.fromTs, FULL.toTs);
  check(
    eq(plFull.revenue, plRef.revenue) && eq(plFull.cogs, plRef.cogs) &&
    eq(plFull.grossProfit, plRef.grossProfit) && eq(plFull.net, plRef.net) &&
    eq(plFull.expensesTotal, plRef.expensesTotal),
    "P&L: report == profitAndLossInRange over the same window (the Finance FY path)"
  );
  const plFy = R.plReport(rJournal, fyRange);
  const plFyRef = ledger.profitAndLossInRange(rJournal, fy.fromTs, fy.toTs);
  check(eq(plFy.net, plFyRef.net) && eq(plFy.revenue, plFyRef.revenue),
    "P&L: report over the fiscal range == FinanceView's fiscal-year P&L");
  const miniJournal = [
    ledger.makeEntry("sale", "sale", null, [
      { account: "cash", debit: 1000, credit: 0 },
      { account: "cogs", debit: 600, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 1000 },
      { account: "inventory", debit: 0, credit: 600 },
    ], { ts: "2026-10-05T10:00:00.000Z" }),
    ledger.makeEntry("rent", "expense", null, [
      { account: "expense_rent", debit: 200, credit: 0 },
      { account: "cash", debit: 0, credit: 200 },
    ], { ts: "2026-10-06T10:00:00.000Z" }),
    ledger.makeEntry("later sale", "sale", null, [
      { account: "cash", debit: 5000, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 5000 },
    ], { ts: "2026-11-02T10:00:00.000Z" }),
  ];
  const plMini = R.plReport(miniJournal, oct);
  check(
    eq(plMini.revenue, 1000) && eq(plMini.cogs, 600) && eq(plMini.grossProfit, 400) &&
    eq(plMini.expensesTotal, 200) && eq(plMini.net, 200),
    "P&L: hand-computed mini journal (out-of-range entry excluded)"
  );

  /* ---- tax identity: per-slab totals == taxPosition movement ---- */
  const slabFields = {
    taxSlabId: "gst", taxSlabName: "GST", taxRate: 17,
    taxKind: "percent", taxInclusive: false,
  };
  const taxBills = [
    { id: "tb1", billNo: 1, customerId: "c1", customerName: "A", customerPhone: "",
      items: [{ productId: "p1", name: "Tea", qty: 10, unitPrice: 100, unitCost: 60, total: 1000, taxAmount: 170, ...slabFields }],
      subtotal: 1000, discountType: "flat", discountValue: 0, discountAmount: 0,
      taxAmount: 170, total: 1170, payments: [], status: "paid", dayOffset: 0, ts: "2026-10-03T09:00:00.000Z" },
    { id: "tb2", billNo: 2, customerId: "c1", customerName: "A", customerPhone: "",
      items: [{ productId: "p1", name: "Tea", qty: 5, unitPrice: 100, unitCost: 60, total: 500, taxAmount: 500, ...slabFields }],
      subtotal: 500, discountType: "flat", discountValue: 0, discountAmount: 0,
      taxAmount: 500, total: 1000, payments: [], status: "voided", dayOffset: 0, ts: "2026-10-04T09:00:00.000Z" },
    { id: "tb3", billNo: 3, customerId: "c1", customerName: "A", customerPhone: "",
      items: [{ productId: "p1", name: "Tea", qty: 3, unitPrice: 100, unitCost: 60, total: 300, taxAmount: 300, ...slabFields }],
      subtotal: 300, discountType: "flat", discountValue: 0, discountAmount: 0,
      taxAmount: 300, total: 600, payments: [], status: "held", dayOffset: 0, ts: "2026-10-04T10:00:00.000Z" },
  ];
  const taxReturns = [
    { id: "tr1", billId: "tb1", billNo: 1,
      items: [{ productId: "p1", name: "Tea", qty: 2, unitPrice: 100, unitCost: 60, total: 200, taxAmount: 34, ...slabFields }],
      refundAmount: 234, method: "cash", dayOffset: 0, ts: "2026-10-05T09:00:00.000Z" },
  ];
  const taxPurchases = [
    { id: "tp1", supplierId: "s1",
      items: [{ productId: "p1", name: "Tea", qty: 5, unitCost: 200, total: 1000, taxAmount: 170, ...slabFields }],
      total: 1170, netTotal: 1000, taxAmount: 170, note: "", dayOffset: 0, ts: "2026-10-03T08:00:00.000Z" },
  ];
  const taxPReturns = [
    { id: "tpr1", purchaseId: "tp1", supplierId: "s1",
      items: [{ productId: "p1", name: "Tea", qty: 1, unitCost: 200, total: 200, taxAmount: 34, ...slabFields }],
      payableOffset: 234, refundAmount: 0, method: null, accountId: null, dayOffset: 0, ts: "2026-10-06T08:00:00.000Z" },
  ];
  const taxJournal = [
    ledger.makeEntry("bill", "sale", "tb1", [
      { account: "cash", debit: 1170, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 1000 },
      { account: "tax_payable", debit: 0, credit: 170 },
    ], { ts: "2026-10-03T09:00:00.000Z" }),
    ledger.makeEntry("return", "return", "tb1", [
      { account: "sales_revenue", debit: 200, credit: 0 },
      { account: "tax_payable", debit: 34, credit: 0 },
      { account: "cash", debit: 0, credit: 234 },
    ], { ts: "2026-10-05T09:00:00.000Z" }),
    ledger.makeEntry("purchase", "purchase", "tp1", [
      { account: "inventory", debit: 1000, credit: 0 },
      { account: "tax_input", debit: 170, credit: 0 },
      { account: "payables", debit: 0, credit: 1170 },
    ], { ts: "2026-10-03T08:00:00.000Z" }),
    ledger.makeEntry("purchase return", "purchase_return", "tpr1", [
      { account: "payables", debit: 234, credit: 0 },
      { account: "inventory", debit: 0, credit: 200 },
      { account: "tax_input", debit: 0, credit: 34 },
    ], { ts: "2026-10-06T08:00:00.000Z" }),
    ledger.makeEntry("old sale", "sale", null, [
      { account: "cash", debit: 1999, credit: 0 },
      { account: "sales_revenue", debit: 0, credit: 1000 },
      { account: "tax_payable", debit: 0, credit: 999 },
    ], { ts: "2026-09-15T09:00:00.000Z" }),
  ];
  const taxRep = R.taxReport(taxBills, taxReturns, taxPurchases, taxPReturns, oct);
  check(eq(taxRep.outputTotal, 136), "tax: output = bill tax 170 − return share 34 (voided/held bills excluded)");
  check(eq(taxRep.inputTotal, 136), "tax: input = purchase tax 170 − purchase-return share 34");
  check(eq(taxRep.net, 0), "tax: net position over the period");
  check(taxRep.rows.length === 1 && taxRep.rows[0].name === "GST" &&
    eq(taxRep.rows[0].output, 136) && eq(taxRep.rows[0].input, 136),
    "tax: per-slab row carries both sides for GST 17%");
  const taxPosInRange = tax.taxPosition(taxJournal.filter((e) => R.inRange(e.ts, oct)));
  check(eq(taxRep.outputTotal, taxPosInRange.outputTax),
    "tax identity: report output == taxPosition(journal in range).outputTax");
  check(eq(taxRep.inputTotal, taxPosInRange.inputTax),
    "tax identity: report input == taxPosition(journal in range).inputTax");
  check(eq(taxRep.net, taxPosInRange.netPayable),
    "tax identity: report net == taxPosition(journal in range).netPayable");

  /* ---- stock identity ---- */
  const stockRep = R.stockReport(rProducts);
  check(eq(stockRep.totalValue, selectors.stockValue(rProducts)),
    "stock identity: report valuation == stockValue(products)");
  check(eq(stockRep.totalValue, sum(rProducts.map((p) => p.stockQty * p.costPrice))),
    "stock: valuation == hand-summed qty × cost");
  check(
    JSON.stringify(stockRep.low.map((p) => p.id)) ===
    JSON.stringify(selectors.lowStockProducts(rProducts).map((p) => p.id)),
    "stock identity: low-stock list == lowStockProducts (the Inventory screen's derivation)"
  );
  check(
    JSON.stringify(stockRep.expiring.map((p) => p.id)) ===
    JSON.stringify(selectors.expiringProducts(rProducts, 30).map((p) => p.id)),
    "stock identity: near-expiry list == expiringProducts(products, 30)"
  );

  /* ---- aging identity ---- */
  const agingRep = R.agingReport(rCredits, rPurchases, rPayments, []);
  const recRef = ledger.receivablesAging(rCredits);
  const payRef = ledger.payablesAging(rPurchases, rPayments, []);
  check(
    eq(agingRep.receivables.current, recRef.current) && eq(agingRep.receivables.mid, recRef.mid) &&
    eq(agingRep.receivables.old, recRef.old) && eq(agingRep.receivables.total, recRef.total),
    "aging identity: receivables == receivablesAging (FinanceView)"
  );
  check(
    eq(agingRep.payables.current, payRef.current) && eq(agingRep.payables.mid, payRef.mid) &&
    eq(agingRep.payables.old, payRef.old) && eq(agingRep.payables.total, payRef.total),
    "aging identity: payables == payablesAging (FinanceView, B4-amended)"
  );

  /* ---- customer statement identity ---- */
  const custKeys = [...new Set(rCredits.map((c) => ledger.creditKey(c)))];
  check(custKeys.length > 0, "customer statement: seed carries credit keys");
  for (const key of custKeys) {
    const st = R.customerStatement(rCredits, key, FULL);
    check(eq(st.closing, ledger.customerOutstanding(rCredits, key)),
      `customer identity: full-range closing == customerOutstanding (${key})`);
    check(eq(st.opening, 0), `customer statement: full-range opening is 0 (${key})`);
  }
  {
    // Sub-range: opening must equal the outstanding of the pre-range rows.
    const key = custKeys[0];
    const rows = rCredits.filter((c) => ledger.creditKey(c) === key)
      .sort((a, b) => a.ts.localeCompare(b.ts));
    if (rows.length >= 2) {
      const midTs = rows[1].ts;
      const sub = { ...FULL, fromTs: midTs };
      const st = R.customerStatement(rCredits, key, sub);
      const preRows = rCredits.filter((c) => c.ts < midTs);
      check(eq(st.opening, ledger.customerOutstanding(preRows, key)),
        "customer statement: sub-range opening == outstanding of pre-range rows");
      check(eq(st.closing, ledger.customerOutstanding(rCredits, key)),
        "customer statement: sub-range closing still lands on the full outstanding");
    } else {
      check(true, "customer statement: sub-range fixture skipped (single-row key)");
    }
  }

  /* ---- supplier statement identity ---- */
  for (const s of rSuppliers) {
    const st = R.supplierStatement(rPurchases, rPayments, [], s.id, FULL);
    check(eq(st.closing, ledger.supplierBalance(rPurchases, rPayments, s.id, [])),
      `supplier identity: full-range closing == supplierBalance (${s.id})`);
  }
  {
    const ps = [{ id: "fp1", supplierId: "fs1",
      items: [{ productId: "p1", name: "Tea", qty: 10, unitCost: 1000, total: 10000 }],
      total: 10000, note: "", dayOffset: 0, ts: "2026-10-02T08:00:00.000Z" }];
    const pays = [{ id: "fpay1", supplierId: "fs1", amount: 4000, method: "cash",
      note: "", dayOffset: 0, ts: "2026-10-03T08:00:00.000Z" }];
    const rets = [{ id: "fr1", purchaseId: "fp1", supplierId: "fs1", items: [],
      payableOffset: 3000, refundAmount: 1000, method: "cash", accountId: null,
      dayOffset: 0, ts: "2026-10-04T08:00:00.000Z" }];
    const st = R.supplierStatement(ps, pays, rets, "fs1", oct);
    check(eq(ledger.supplierBalance(ps, pays, "fs1", rets), 3000),
      "supplier fixture: supplierBalance with an offset+refund return is 3,000");
    check(eq(st.closing, 3000), "supplier identity: statement closing == supplierBalance (with purchase return)");
    check(
      JSON.stringify(st.events.map((e) => e.balance)) === JSON.stringify([10000, 6000, 3000]),
      "supplier statement: running balances step +purchase −payment −offset (refund un-pays, never double-settles)"
    );
    check(eq(st.returnedInPeriod, 4000), "supplier statement: returned gross = offset + refund");
  }

  /* ---- cash book / account statement identity ---- */
  const till = rAccounts.find((a) => a.legacyFor === "cash");
  check(!!till, "cashbook fixture: seed has a legacy cash account");
  if (till) {
    const st = R.accountStatement(rJournal, rAccounts, till.id, FULL);
    check(eq(st.closing ?? NaN, ledger.moneyAccountBalance(rJournal, till)),
      "cashbook identity: statement closing == moneyAccountBalance (FinanceView)");
    check(eq(st.opening ?? NaN, 0) && eq((st.totalIn - st.totalOut), st.closing ?? NaN),
      "cashbook: full-range opening 0 and in − out == closing");
    const all = R.accountStatement(rJournal, rAccounts, null, FULL);
    check(all.rows.length === ledger.cashBook(rJournal).length && all.opening === null,
      "cashbook identity: combined book rows == cashBook(journal) rows");
  }

  /* ---- sales report: netting + legacy safety ---- */
  {
    const prods = [{ id: "p1", name: "Tea", urduName: "", sku: "T1", category: "grocery",
      unit: "packet", costPrice: 60, salePrice: 100, stockQty: 50, reorderLevel: 5 }];
    const billsF = [{ id: "b1", billNo: 7, customerId: "c1", customerName: "Ahmed",
      customerPhone: "0300", items: [], subtotal: 0, discountType: "flat",
      discountValue: 0, discountAmount: 0, total: 0, payments: [], status: "paid",
      dayOffset: 0, ts: "2026-10-03T09:00:00.000Z" }];
    const salesF = [
      { id: "s1", productId: "p1", qty: 3, unitPrice: 100, unitCost: 60, total: 300, billId: "b1", kind: "sale", dayOffset: 0, ts: "2026-10-03T09:00:00.000Z" },
      { id: "s2", productId: "p1", qty: -1, unitPrice: 100, unitCost: 60, total: -100, billId: "b1", kind: "return", dayOffset: 0, ts: "2026-10-04T09:00:00.000Z" },
      { id: "s3", productId: "p1", qty: 2, unitPrice: 100, total: 200, dayOffset: 0, ts: "2026-10-05T09:00:00.000Z" }, // legacy: no unitCost, no billId, no kind
      { id: "s4", productId: "gone", qty: 1, unitPrice: 50, total: 50, dayOffset: 0, ts: "2026-10-05T10:00:00.000Z" }, // product deleted since
      { id: "s5", productId: "p1", qty: 9, unitPrice: 100, unitCost: 60, total: 900, dayOffset: 0, ts: "2026-11-05T09:00:00.000Z" }, // out of range
    ];
    const rep = R.salesReport(salesF, prods, billsF, oct);
    check(eq(rep.grossSales, 550) && eq(rep.returnsTotal, -100) && eq(rep.netSales, 450),
      "sales: gross / returns / net — returns netted as negative rows, exactly as the Sales screen sums them");
    check(eq(rep.netUnits, 5), "sales: net units count returns against sales");
    check(eq(rep.grossProfit, 160), "sales: profit = snapshot margins, legacy row falls back to product cost, missing product contributes 0 — never throws");
    const cust = Object.fromEntries(rep.byCustomer.map((r) => [r.key, r.amount]));
    check(eq(cust["c1"], 200) && eq(cust["walk-in"], 250),
      "sales: by-customer attributes bill rows to the bill's customer, counter rows to walk-in");
    const again = R.salesReport(salesF, prods, billsF, oct);
    check(JSON.stringify(again) === JSON.stringify(rep),
      "sales: builder is deterministic (language-free figures — EN and UR outputs cannot drift)");
  }

  /* ---- purchases / expenses / notes / cheques / day-close ---- */
  {
    const rep = R.purchaseReport(rPurchases, [], rSuppliers, FULL);
    check(eq(rep.gross, sum(rPurchases.map((p) => p.total))) && eq(rep.net, rep.gross),
      "purchases: gross == Σ purchase.total over the seed, no returns seeded");
    const legacy = R.purchaseReport(
      [{ id: "lp", supplierId: "s1", items: [], total: 700, note: "", dayOffset: 0, ts: "2026-10-02T00:00:00.000Z" }],
      [], [], oct);
    check(eq(legacy.goodsNet, 700) && eq(legacy.taxTotal, 0),
      "purchases: legacy row without netTotal/taxAmount reads net == total, tax 0 — never throws");
  }
  {
    const rep = R.expensesReport(rExpenses, FULL);
    check(eq(rep.total, ledger.expenseTotal(rExpenses)),
      "expenses identity: report total == expenseTotal (Expenses screen)");
    check(eq(sum(rep.byCategory.map((g) => g.amount)), rep.total),
      "expenses: category groups sum back to the total");
  }
  {
    const closes = [
      { id: "dc1", dateISO: "2026-10-03", openingCash: 0, salesByMethod: { cash: 1000, jazzcash: 500 },
        expensesTotal: 100, creditGiven: 200, creditReceived: 50, supplierPaid: 300,
        expectedCash: 900, countedCash: 890, difference: -10, note: "", dayOffset: 0, ts: "2026-10-03T20:00:00.000Z" },
      { id: "dc2", dateISO: "2026-11-03", openingCash: 0, salesByMethod: { cash: 7000 },
        expensesTotal: 0, creditGiven: 0, creditReceived: 0, supplierPaid: 0,
        expectedCash: 7000, countedCash: 7000, difference: 0, note: "", dayOffset: 0, ts: "2026-11-03T20:00:00.000Z" },
      { id: "dc3", dateISO: "2026-10-04", openingCash: 0, // legacy: no salesByMethod
        expensesTotal: 0, creditGiven: 0, creditReceived: 0, supplierPaid: 0,
        expectedCash: 0, countedCash: 0, difference: 0, note: "", dayOffset: 0, ts: "2026-10-04T20:00:00.000Z" },
    ];
    const rep = R.dayCloseReport(closes, oct);
    check(rep.rows.length === 2 && eq(rep.totals.sales, 1500) && eq(rep.totals.difference, -10),
      "day-close: only the period's closes, sales summed across methods, missing salesByMethod reads 0");
  }
  {
    const notesF = [
      { id: "n1", number: "CN-1", kind: "credit", returnId: "r1", billId: "b1", billNo: 7,
        purchaseId: null, partyId: "c1", partyName: "Ahmed", items: [], goodsAmount: 800,
        taxAmount: 136, total: 936, settlement: "cash_refund", journalEntryId: "j1",
        reason: "", status: "posted", dayOffset: 0, ts: "2026-10-05T09:00:00.000Z" },
      { id: "n2", number: "DN-1", kind: "debit", returnId: "r2", billId: null, billNo: null,
        purchaseId: "p1", partyId: "s1", partyName: "Supplier Co", items: [], goodsAmount: 500,
        taxAmount: 85, total: 585, settlement: "payable_offset", journalEntryId: "j2",
        reason: "", status: "posted", dayOffset: 0, ts: "2026-10-06T09:00:00.000Z" },
    ];
    const rep = R.notesReport(notesF, oct);
    check(rep.credit.count === 1 && eq(rep.credit.total, 936) && rep.debit.count === 1 && eq(rep.debit.goods, 500),
      "notes: credit/debit sides totalled from the notes' own stamped figures");
  }
  {
    const chqs = [
      { id: "q1", direction: "in", chequeNo: "111", bankName: "HBL", amount: 5000,
        issueDateISO: "2026-10-02", dueDateISO: "2026-10-20", partyId: "c1", partyName: "Ahmed",
        partyKind: "customer", status: "received", sourceType: "bill", sourceId: "b1",
        accountId: null, chargesOnBounce: 0, entryIds: {}, note: "", dayOffset: 0, ts: "2026-10-02T09:00:00.000Z" },
      { id: "q2", direction: "in", chequeNo: "112", bankName: "HBL", amount: 3000,
        issueDateISO: "2026-10-02", dueDateISO: "2026-10-10", partyId: "c1", partyName: "Ahmed",
        partyKind: "customer", status: "deposited", sourceType: "bill", sourceId: "b1",
        accountId: null, chargesOnBounce: 0, entryIds: {}, note: "", dayOffset: 0, ts: "2026-10-02T10:00:00.000Z" },
      { id: "q3", direction: "out", chequeNo: "900", bankName: "MCB", amount: 8000,
        issueDateISO: "2026-10-03", dueDateISO: "2026-10-15", partyId: "s1", partyName: "Supplier Co",
        partyKind: "supplier", status: "issued", sourceType: "supplier_payment", sourceId: "sp1",
        accountId: null, chargesOnBounce: 0, entryIds: {}, note: "", dayOffset: 0, ts: "2026-10-03T09:00:00.000Z" },
      { id: "q4", direction: "in", chequeNo: "113", bankName: "HBL", amount: 9999,
        issueDateISO: "2026-09-01", dueDateISO: "2026-09-05", partyId: "c1", partyName: "Ahmed",
        partyKind: "customer", status: "cleared", sourceType: "bill", sourceId: "b0",
        accountId: null, chargesOnBounce: 0, entryIds: {}, note: "", dayOffset: 0, ts: "2026-09-01T09:00:00.000Z" },
    ];
    const rep = R.chequesReport(chqs, oct);
    const g = Object.fromEntries(rep.groups.map((x) => [x.id, x]));
    check(eq(g.drawer.total, 5000) && eq(g.atBank.total, 3000) && eq(g.issued.total, 8000) && eq(g.cleared.rows.length, 0),
      "cheques: captured-in-period grouped by the registry's own views; last month's cleared cheque excluded");
    check(eq(rep.totalCaptured, 16000), "cheques: total captured in period");
    check(eq(g.drawer.total + g.atBank.total, cheques.unclearedInTotal(chqs.filter((c) => R.inRange(c.ts, oct)))),
      "cheques identity: drawer + at-bank == unclearedInTotal over the same set (lib/cheques)");
  }

  /* ---- output-language formatting & share text ---- */
  check(R.moneyIn("en", 2600) === "Rs 2,600", "moneyIn EN: 'Rs 2,600' (== fmtPKR in EN)");
  check(R.moneyIn("ur", 2600) === "روپے 2,600", "moneyIn UR: 'روپے 2,600' (== fmtPKR in UR)");
  check(R.dateISOIn("en", "2026-10-12") === "12 October 2026", "dateISOIn EN renders the business date");
  check(R.dateISOIn("ur", "2026-10-12") === "12 اکتوبر 2026", "dateISOIn UR renders the business date in Urdu");
  const shareArgs = (lang) => ({
    shopName: "Madina Store",
    title: i18n.translate(lang, "rep.sales.title"),
    period: R.rangeLabelIn(lang, oct),
    lines: [[i18n.translate(lang, "rep.tot.netSales"), R.moneyIn(lang, 2600)]],
  });
  const shareEn = R.reportShareText("en", shareArgs("en"));
  const shareUr = R.reportShareText("ur", shareArgs("ur"));
  check(shareEn.includes("Sales Report") && shareEn.includes("2,600") && shareEn.includes("Madina Store"),
    "share text EN: title, shop and the formatted figure");
  check(shareUr.includes("فروخت کی رپورٹ") && shareUr.includes("2,600"),
    "share text UR: Urdu title carries the IDENTICAL figure (language determinism)");
  check(shareEn.split("\n").length === shareUr.split("\n").length,
    "share text: same structure in both languages");

  /* ---- source invariants: the section is read-only ---- */
  const repSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/reports.ts", "utf8"
  );
  check(!/makeEntry|postEntry|writeBatch|setDoc|addDoc/.test(repSrc),
    "source: lib/reports.ts contains no posting/write machinery (read-only by construction)");
  const viewSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/ReportsView.tsx", "utf8"
  );
  check(viewSrc.includes('can(role, "finance", "view")'),
    "source: ReportsView gates on the finance matrix row (no dedicated reports row exists)");
  check(!/jsPDF|jspdf|html2canvas/.test(viewSrc + repSrc),
    "source: no client PDF library — print/save go through the browser pipeline");

  /* ---- i18n: every rep.* key exists in BOTH dictionaries ---- */
  const repKeys = Object.keys(i18n.en).filter((k) => k.startsWith("rep.") || k === "nav.reports");
  check(repKeys.length >= 100, `i18n: reports part carries ${repKeys.length} keys`);
  check(repKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "i18n: every reports key present and non-empty in Urdu (parity)");
}

/* ============================ C1 (warehouses) ============================ */
suite("C1", null); // Phase C · C1 — warehouses & stock rows (design §1)
{
  const MAIN = "wh-main";
  const GODOWN = "wh-godown";
  const whs = seed.getSeedWarehouses();

  /* ---- the stockV1 migration: annotation, not conversion (§10.1) ---- */
  const migRows = stock.stockV1Rows(products, []);
  check(migRows.length === products.length && migRows.every((l) => l.warehouseId === MAIN),
    "migration: one row per product, all at the default warehouse");
  check(products.every((p) => stock.rowsTotal(migRows, p.id) === p.stockQty) &&
        eq(sum(migRows.map((l) => l.qty)), sum(products.map((p) => p.stockQty))),
    "migration: every product's rows sum to its stockQty (identity Σ rows == stockQty)");
  check(stock.stockV1Rows(products, migRows).length === 0,
    "migration: idempotent — a second run creates nothing");
  const partial = [stock.makeLevel(GODOWN, products[0].id, 1)];
  const skipRows = stock.stockV1Rows(products, partial);
  check(skipRows.length === products.length - 1 && skipRows.every((l) => l.productId !== products[0].id),
    "migration: per-product skip-whole — a product with ANY row is left exactly as it is");
  check(stock.stockV1Rows([], []).length === 0, "migration: an empty shop migrates to nothing");

  /* ---- frozen seed identities survive the migration untouched ---- */
  check(journal.length === 21, "migration: the seed journal still has its frozen 21 entries");
  const normalizedC1 = journal.map((e) => { const { ts, ...rest } = e; return rest; });
  const shaC1 = crypto.createHash("sha256").update(JSON.stringify(normalizedC1), "utf8").digest("hex");
  check(shaC1 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "migration: seed journal SHA unchanged (zero entries written, zero totals moved)");
  check(eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.accountBalance(journal, "cash"), 50000),
    "migration: GL identities hold — Inventory 272,805 · Cash 50,000");

  /* ---- seed warehouses + rows (the born-migrated end-state) ---- */
  check(whs.length === 2 && whs[0].id === MAIN && whs[0].isDefault === true && whs[0].sortOrder === 0 &&
        whs[1].id === seed.SEED_GODOWN_ID && whs[1].isDefault === false,
    "seed: Main (default, sortOrder 0) + one Godown — the migrated end-state directly");
  const seedLevels = seed.getSeedStockLevels(products);
  check(seedLevels.length === products.length &&
        seedLevels.every((l) => l.warehouseId === MAIN && l.id === stock.levelIdFor(MAIN, l.productId)) &&
        products.every((p) => stock.rowsTotal(seedLevels, p.id) === p.stockQty),
    "seed: complete rows at the default warehouse, deterministic ids, sums == totals");

  /* ---- the §1.3 resolution rule + stamp resolution ---- */
  const P9 = { id: "P", stockQty: 9 };
  check(stock.qtyAtWarehouse(P9, [], whs, MAIN) === 9 && stock.qtyAtWarehouse(P9, [], whs, GODOWN) === 0,
    "resolution: a row-less product reads its whole total at the default, 0 elsewhere");
  const pRows = [stock.makeLevel(MAIN, "P", 4), stock.makeLevel(GODOWN, "P", 5)];
  check(stock.qtyAtWarehouse(P9, pRows, whs, MAIN) === 4 &&
        stock.qtyAtWarehouse(P9, pRows, whs, GODOWN) === 5 &&
        stock.qtyAtWarehouse(P9, pRows, whs, "wh-gone") === 0,
    "resolution: with rows, the rows are the truth (missing pair = 0)");
  check(stock.resolveWarehouseId(whs, GODOWN) === GODOWN &&
        stock.resolveWarehouseId(whs, "wh-gone") === MAIN &&
        stock.resolveWarehouseId(whs, null) === MAIN &&
        stock.defaultWarehouseId([]) === MAIN,
    "resolution: a real stamp wins; absent/unknown stamps and empty lists fall to the default");

  /* ---- every stock path keeps Σ rows == stockQty (§1.5 workload) ----
   * Replicates the store's demo discipline path by path: the total
   * moves exactly as the path moves it, and the row at the touched
   * warehouse receives the SAME applied delta. After every step the
   * drift detector must be silent for the touched product. */
  const wProducts = [
    { id: "X", stockQty: 20, costPrice: 100 },
    { id: "Y", stockQty: 5, costPrice: 40 },
  ];
  let wLevels = stock.stockV1Rows(wProducts, []);
  const wMove = (pid, whId, appliedDelta) => {
    const p = wProducts.find((x) => x.id === pid);
    p.stockQty += appliedDelta;
    wLevels = stock.applyLevelDelta(wLevels, whId, pid, appliedDelta);
  };
  const wOk = (pid) =>
    stock.stockDrift(wProducts, wLevels).every((d) => d.productId !== pid) &&
    stock.rowsTotal(wLevels, pid) === wProducts.find((x) => x.id === pid).stockQty;
  check(wOk("X") && wOk("Y"), "workload: migrated start — no drift");
  wMove("X", GODOWN, +10); // purchase received into the godown
  check(wOk("X") && stock.rowQtyOf(wLevels, GODOWN, "X") === 10, "workload: purchase into godown — rows follow");
  wMove("X", GODOWN, -6); // bill posted at the godown
  check(wOk("X") && stock.rowQtyOf(wLevels, GODOWN, "X") === 4, "workload: godown bill — its row drops, total follows");
  wMove("X", MAIN, -5); // counter sale (always the default warehouse)
  check(wOk("X") && stock.rowQtyOf(wLevels, MAIN, "X") === 15, "workload: counter sale — the default row drops");
  wMove("X", GODOWN, +2); // return against that godown bill
  check(wOk("X"), "workload: bill return — goods back at the bill's warehouse");
  wMove("X", GODOWN, -3); // purchase return out of the receiving warehouse
  check(wOk("X") && stock.rowQtyOf(wLevels, GODOWN, "X") === 3, "workload: purchase return — out of the receipt warehouse");
  wMove("X", GODOWN, -4); // adjustment at the godown, clamped on the TOTAL
  check(wOk("X") && stock.rowQtyOf(wLevels, GODOWN, "X") === -1,
    "workload: adjustment — the row takes the total-clamped delta (a negative row is the sanctioned split, §1.5)");
  wMove("X", MAIN, +6); // product-form stock edit (warehouse-naive ⇒ default)
  check(wOk("X") && stock.rowQtyOf(wLevels, MAIN, "X") === 21, "workload: product edit — the delta lands at the default");
  const zRow = stock.makeLevel(MAIN, "Z", 7); // CSV import lands at the default
  wProducts.push({ id: "Z", stockQty: 7, costPrice: 10 });
  wLevels = [...wLevels, zRow];
  check(wOk("Z"), "workload: CSV import — opening row at the default warehouse");
  const y = wProducts.find((x) => x.id === "Y"); // delete: rows zeroed with the product
  y.stockQty = 0;
  wLevels = wLevels.map((l) => (l.productId === "Y" ? { ...l, qty: 0 } : l));
  check(wOk("Y") && stock.rowsTotal(wLevels, "Y") === 0, "workload: product delete — its rows are zeroed, never orphaned");

  /* ---- a warehouse never enters the journal (§1.4) ---- */
  const saleLines = [
    { account: "cash", debit: 500, credit: 0 },
    { account: "sales", debit: 0, credit: 500 },
    { account: "cogs", debit: 240, credit: 0 },
    { account: "inventory", debit: 0, credit: 240 },
  ];
  const eMain = ledger.makeEntry("Sale — X", "sale", null, saleLines);
  const eGodown = ledger.makeEntry("Sale — X", "sale", null, saleLines);
  const strip = (e) => { const { ts, id, ...rest } = e; return JSON.stringify(rest); };
  check(strip(eMain) === strip(eGodown) && ledger.entryBalances(eGodown),
    "journal: the same sale composed at any warehouse is byte-identical (location is subledger-only)");
  const stockSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/stock.ts", "utf8");
  check(!/makeEntry|postEntry/.test(stockSrc),
    "source: lib/stock.ts carries no posting machinery — rows are operational detail");

  /* ---- the promise partition (§1.6): B2's figures, split ---- */
  const rProducts = [{ id: "A", stockQty: 12 }, { id: "B", stockQty: 5 }];
  const rOrders = [
    { id: "ro1", status: "open", lines: [
      { productId: "A", name: "A", qty: 10, unitPrice: 100, total: 1000 },
      { productId: "B", name: "B", qty: 2, unitPrice: 100, total: 200 },
    ] },
    { id: "ro2", status: "draft", lines: [{ productId: "A", name: "A", qty: 7, unitPrice: 100, total: 700 }] },
    { id: "ro3", status: "cancelled", lines: [{ productId: "A", name: "A", qty: 3, unitPrice: 100, total: 300 }] },
  ];
  const rChallans = [
    { id: "rc1", orderId: null, status: "dispatched", lines: [{ productId: "A", name: "A", qty: 4, unitPrice: 100, total: 400 }] },
    { id: "rc2", orderId: "ro1", status: "dispatched", lines: [{ productId: "A", name: "A", qty: 3, unitPrice: 100, total: 300, sourceProductId: "A" }] },
    { id: "rc3", orderId: null, status: "cancelled", lines: [{ productId: "A", name: "A", qty: 9, unitPrice: 100, total: 900 }] },
    { id: "rc4", orderId: null, status: "draft", lines: [{ productId: "B", name: "B", qty: 4, unitPrice: 100, total: 400 }] },
  ];
  const rBills = [
    { id: "rb1", status: "paid", sourceType: "challan", sourceId: "rc2", items: [{ productId: "A", qty: 1, sourceProductId: "A" }] },
    { id: "rb2", status: "paid", sourceType: "challan", sourceId: "rc1", items: [{ productId: "A", qty: 1 }] },
  ];
  const rLevels = [stock.makeLevel(MAIN, "A", 12), stock.makeLevel(MAIN, "B", 5)];
  const globalPromised = docs.promisedQtyByProduct(rOrders, rChallans, rBills);
  const partAll = stock.promisedByWarehouse(rOrders, rChallans, rBills, MAIN);
  check(eq(partAll.get(MAIN)?.get("A") ?? 0, globalPromised.get("A")) &&
        eq(partAll.get(MAIN)?.get("B") ?? 0, globalPromised.get("B")) && partAll.size === 1,
    "partition: unstamped documents promise everything at the default (== the B2 globals)");
  const rOrdersStamped = rOrders.map((o) => (o.id === "ro1" ? { ...o, warehouseId: GODOWN } : o));
  const part = stock.promisedByWarehouse(rOrdersStamped, rChallans, rBills, MAIN);
  check(eq(part.get(GODOWN)?.get("A") ?? 0, 9) && eq(part.get(GODOWN)?.get("B") ?? 0, 2) &&
        eq(part.get(MAIN)?.get("A") ?? 0, 3),
    "partition: the stamped order promises at its warehouse; the standalone challan at the default");
  check(eq((part.get(GODOWN)?.get("A") ?? 0) + (part.get(MAIN)?.get("A") ?? 0), globalPromised.get("A")) &&
        eq((part.get(GODOWN)?.get("B") ?? 0) + (part.get(MAIN)?.get("B") ?? 0), globalPromised.get("B")),
    "partition: Σ over warehouses reproduces promisedQtyByProduct per product exactly");
  const avMain = stock.availabilityByProductAtWarehouse(rProducts, rLevels, whs, rOrdersStamped, rChallans, rBills, MAIN);
  const avGodown = stock.availabilityByProductAtWarehouse(rProducts, rLevels, whs, rOrdersStamped, rChallans, rBills, GODOWN);
  const avGlobal = docs.availabilityByProduct(rProducts, rOrders, rChallans, rBills);
  check(eq(avMain.get("A").onHand, 12) && eq(avMain.get("A").promised, 3) && eq(avMain.get("A").available, 9),
    "availability at Main: on-hand from the row, promised from Main's partition");
  check(eq(avGodown.get("A").onHand, 0) && eq(avGodown.get("A").promised, 9) && eq(avGodown.get("A").available, -9),
    "availability at Godown: nothing shelved, the order's 9 promised against it");
  check(eq(avMain.get("A").available + avGodown.get("A").available, avGlobal.get("A").available) &&
        eq(avMain.get("B").available + avGodown.get("B").available, avGlobal.get("B").available),
    "availability: Σ over warehouses reproduces the B2 global availability per product");

  /* ---- drift injection + recount repair (§1.7) ---- */
  const dProducts = products.slice(0, 4).map((p) => ({ id: p.id, stockQty: p.stockQty }));
  let dLevels = stock.stockV1Rows(dProducts, []);
  const victim = dProducts[1];
  const otherRowBefore = stock.rowQtyOf(dLevels, MAIN, dProducts[2].id);
  dLevels = stock.applyLevelDelta(dLevels, MAIN, victim.id, +5);
  const drift = stock.stockDrift(dProducts, dLevels);
  check(drift.length === 1 && drift[0].productId === victim.id && eq(drift[0].drift, 5) &&
        eq(drift[0].rowsTotal, victim.stockQty + 5) && eq(drift[0].stockQty, victim.stockQty),
    "drift: the detector catches an injected +5 and names the product, the split and the total");
  const rec = stock.recountLevels(dProducts, dLevels, whs);
  check(rec.repaired === 1 && stock.stockDrift(dProducts, rec.levels).length === 0 &&
        stock.rowQtyOf(rec.levels, MAIN, victim.id) === victim.stockQty &&
        stock.rowQtyOf(rec.levels, MAIN, dProducts[2].id) === otherRowBefore,
    "recount: the default row absorbs the drift; every other row is untouched");
  const clean = stock.recountLevels(dProducts, stock.stockV1Rows(dProducts, []), whs);
  check(clean.repaired === 0, "recount: clean data is a no-op");
  const splitProducts = [{ id: "S", stockQty: 10 }];
  const splitLevels = [stock.makeLevel(GODOWN, "S", 2)]; // default row missing entirely
  const recSplit = stock.recountLevels(splitProducts, splitLevels, whs);
  check(recSplit.repaired === 1 && stock.rowQtyOf(recSplit.levels, MAIN, "S") === 8 &&
        stock.rowQtyOf(recSplit.levels, GODOWN, "S") === 2,
    "recount: a missing default row is created holding the difference; other rows untouched");

  /* ---- RBAC: the warehouses matrix row (§1.9) ---- */
  check(perm.accessOf("owner", "warehouses") === "full" && perm.accessOf("manager", "warehouses") === "full",
    "RBAC: warehouses row — owner/manager full");
  check(perm.accessOf("accountant", "warehouses") === "read" && perm.accessOf("cashier", "warehouses") === "none",
    "RBAC: warehouses row — accountant read-only, cashier none");
  check(perm.can("accountant", "warehouses", "view") && !perm.can("accountant", "warehouses", "write") &&
        !perm.can("cashier", "warehouses", "view"),
    "RBAC: can() honours the row (the surface gates view/write on it)");

  /* ---- i18n parity for the C1 strings ---- */
  const whKeys = Object.keys(i18n.en).filter((k) => k.startsWith("wh.") || k === "nav.warehouses");
  check(whKeys.length === 45, `i18n: the C1 part carries ${whKeys.length} keys (45 expected)`);
  check(whKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "i18n: every C1 key present and non-empty in Urdu (parity)");

  /* ---- source invariants: the store wiring ---- */
  const storeSrcC1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcC1.includes('"warehouses"') && storeSrcC1.includes('"stockLevels"') &&
        storeSrcC1.includes("ensureStock") && storeSrcC1.includes("phaseC.stockV1"),
    "source: collections + the stockV1 migration are wired into the store");
  check(storeSrcC1.includes('"dukaan-ai-store-v11"'),
    "source: demo storage key bumped to v11 for the new collections");
  check((storeSrcC1.match(/makeEntry\(/g) || []).length === 24,
    "source: C1 added no makeEntry call (24 == pre-C1 count) — rows and warehouses post nothing");

  /* ---- rules: additive C1 blocks only ---- */
  const rulesC1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const c1Seg = rulesC1.slice(
    rulesC1.indexOf("      // Phase C · C1"),
    rulesC1.indexOf("      // Expenses:"));
  check(c1Seg.includes("match /warehouses/{warehouseId}") &&
        c1Seg.includes("hasRole(uid, ['owner', 'manager'])"),
    "rules: warehouses block — read any role (picker names, G-C1), write owner/manager, per the matrix row");
  check(c1Seg.includes("match /stockLevels/{levelId}") && c1Seg.includes("R-B6"),
    "rules: stockLevels block carries the G-C2 widening + the R-B6 do-not-tighten warning");
  const strippedC1 = rulesC1.slice(0, rulesC1.indexOf("      // Phase C · C1")) +
    rulesC1.slice(rulesC1.indexOf("      // Expenses:"));
  check(crypto.createHash("sha256").update(strippedC1, "utf8").digest("hex") ===
        "73177ac06f42d4a65ab68c6a7eb6f74e776c38da525742d90a77de0502436e87",
    "rules: stripping the C1 blocks reproduces the pre-C1 file byte-for-byte (additive only)");
}

/* ============================ C2 (stock transfers) ============================ */
suite("C2", null); // Phase C · C2 — stock transfers (design §2)
{
  const MAIN = "wh-main";
  const GODOWN = "wh-godown";
  const whs = seed.getSeedWarehouses();
  const c2Products = [
    { id: "A", name: "Atta 10kg", stockQty: 50, costPrice: 200 },
    { id: "B", name: "Basmati Rice 5kg", stockQty: 30, costPrice: 150 },
    { id: "R", name: "Raw Jute Roll", stockQty: 10, costPrice: 100, stockClass: "raw" },
  ];
  const byId = new Map(c2Products.map((p) => [p.id, p]));
  const totalsMap = new Map(c2Products.map((p) => [p.id, p.stockQty]));
  let lv = stock.stockV1Rows(c2Products, []);
  let flowJournal = []; // every posting the simulated flow produces
  const applyDeltas = (deltas) => {
    for (const d of deltas) lv = stock.applyLevelDelta(lv, d.wh, d.pid, d.delta);
  };
  const identity = (list) =>
    c2Products.every((p) => {
      const rows = stock.rowsTotal(lv, p.id);
      const transit = transfers.inTransitByProduct(list).get(p.id) ?? 0;
      return eq(rows + transit, totalsMap.get(p.id));
    });
  const mkTransfer = (id, lines, status) => ({
    id, number: null, fromWarehouseId: MAIN, toWarehouseId: GODOWN,
    lines, note: "", status, dayOffset: 0, ts: "2026-10-20T09:00:00.000Z",
  });

  /* ---- the TR- series (§6.3): prefix, mint-at-dispatch, no burn ---- */
  check(docs.seriesPrefix("stockTransfer", null) === "TR-" &&
        docs.seriesPrefix("stockTransfer", { docSeries: { stockTransfer: "MV-" } }) === "MV-",
    "series: TR- is the default prefix and the owner-doc override applies");
  check(docs.nextDocNumber("stockTransfer", [null, null], null) === "TR-1",
    "series: drafts (null numbers) burn no numbers — the first dispatch mints TR-1");
  check(docs.nextDocNumber("stockTransfer", ["TR-1", null, "TR-7"], null) === "TR-8",
    "series: minting is max+1 over the numbered documents only");

  /* ---- composition + route validation (pre-composition refusals) ---- */
  const composed = transfers.composeTransferLines(c2Products, [
    { productId: "A", qty: 20 }, { productId: "B", qty: 10 }, { productId: "A", qty: 5 },
  ]);
  check(composed !== null && composed.length === 2 &&
        composed.find((l) => l.productId === "A").qtySent === 25 &&
        composed.find((l) => l.productId === "B").qtySent === 10 &&
        composed.every((l) => l.qtyReceived === 0 && typeof l.name === "string" && l.name.length > 0),
    "compose: duplicate picks merge, names snapshot, qtyReceived starts at 0");
  check(transfers.composeTransferLines(c2Products, [{ productId: "nope", qty: 1 }]) === null,
    "compose: an unknown product refuses the whole composition");
  check(transfers.composeTransferLines(c2Products, [{ productId: "A", qty: 0 }]) === null &&
        transfers.composeTransferLines(c2Products, [{ productId: "A", qty: -2 }]) === null &&
        transfers.composeTransferLines(c2Products, []) === null,
    "compose: non-positive quantities and an empty pick list refuse");
  check(transfers.transferRouteProblem(MAIN, MAIN, whs) === "same",
    "route: a transfer from a warehouse to itself is refused (same-warehouse)");
  check(transfers.transferRouteProblem(MAIN, GODOWN, whs) === null &&
        transfers.transferRouteProblem(MAIN, "wh-nope", whs) === "missing" &&
        transfers.transferRouteProblem(MAIN, GODOWN, whs.map((w) => (w.id === GODOWN ? { ...w, archived: true } : w))) === "archived",
    "route: a real pair composes; a missing endpoint and an archived endpoint refuse");

  /* ---- draft + dispatch: rows move, the journal does not (§2.3) ---- */
  let t1 = mkTransfer("st-t1", composed, "draft");
  check(transfers.inTransitByProduct([t1]).size === 0 && identity([t1]),
    "draft: nothing sent yet — no in-transit, the identity already holds");
  check(transfers.canTransferTransition(t1, "dispatch") &&
        !transfers.canTransferTransition(t1, "receive") &&
        !transfers.canTransferTransition(t1, "closeShort"),
    "transitions: a draft may dispatch but never receive or close");
  t1 = { ...t1, number: docs.nextDocNumber("stockTransfer", [t1.number], null), status: "dispatched" };
  applyDeltas(t1.lines.map((l) => ({ wh: MAIN, pid: l.productId, delta: -l.qtySent })));
  check(flowJournal.length === 0,
    "dispatch: the journal is byte-still — dispatch composes no entry at all");
  const shaC2 = crypto.createHash("sha256")
    .update(JSON.stringify(journal.map((e) => { const { ts, ...rest } = e; return rest; })), "utf8")
    .digest("hex");
  check(shaC2 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "dispatch: the frozen seed journal + SHA are untouched");
  check(t1.number === "TR-1" && stock.rowQtyOf(lv, MAIN, "A") === 25 &&
        stock.rowQtyOf(lv, MAIN, "B") === 20 && totalsMap.get("A") === 50 && totalsMap.get("B") === 30,
    "dispatch: source rows drop by qtySent; product totals do NOT change");
  check((transfers.inTransitByProduct([t1]).get("A") ?? 0) === 25 &&
        (transfers.inTransitByProduct([t1]).get("B") ?? 0) === 10 && identity([t1]),
    "dispatch: in-transit derives exactly (A 25 · B 10) and §1.3's identity holds");
  check(transfers.statusAfterReceive(t1.lines) === "dispatched" &&
        transfers.canTransferTransition(t1, "receive") &&
        transfers.canTransferTransition(t1, "closeShort") &&
        transfers.canTransferTransition(t1, "returnToSource") &&
        !transfers.canTransferTransition(t1, "edit") &&
        !transfers.canTransferTransition(t1, "dispatch"),
    "transitions: a dispatched transfer's exits are receive / close-short / return only");
  check(transfers.validateReceivePicks(t1, [{ productId: "A", qty: 26 }]) === null &&
        transfers.validateReceivePicks(t1, [{ productId: "Z", qty: 1 }]) === null &&
        transfers.validateReceivePicks(t1, [{ productId: "A", qty: 0 }]) === null &&
        transfers.validateReceivePicks(t1, []) === null,
    "receive validation: over-receipt, unknown lines, zero and empty picks all refuse pre-composition");
  const mergedPicks = transfers.validateReceivePicks(t1, [
    { productId: "A", qty: 10 }, { productId: "A", qty: 5 },
  ]);
  check(mergedPicks !== null && mergedPicks.length === 1 && mergedPicks[0].qty === 15,
    "receive validation: duplicate picks merge before the cumulative check");

  /* ---- partial receives sum exactly; the road empties line by line ---- */
  const recv = (tr, picks) => {
    const merged = transfers.validateReceivePicks(tr, picks);
    const lines = transfers.applyReceivePicks(tr.lines, merged);
    applyDeltas(merged.map((p) => ({ wh: tr.toWarehouseId, pid: p.productId, delta: p.qty })));
    return { ...tr, lines, status: transfers.statusAfterReceive(lines) };
  };
  t1 = recv(t1, [{ productId: "A", qty: 10 }]);
  check(t1.status === "partially_received" && stock.rowQtyOf(lv, GODOWN, "A") === 10 &&
        identity([t1]) && flowJournal.length === 0,
    "receive #1: 10 of A lands at the destination; still partial; identity holds; no entry");
  t1 = recv(t1, [{ productId: "A", qty: 15 }, { productId: "B", qty: 4 }]);
  check(transfers.transferReceivedQty(t1) === 29 && t1.status === "partially_received" &&
        t1.lines.find((l) => l.productId === "A").qtyReceived === 25 &&
        identity([t1]) && flowJournal.length === 0,
    "receive #2: partial receives sum exactly (A complete at 25, B at 4 of 10); zero journal writes across the whole transfer");
  const incoming = transfers.incomingByProductAtWarehouse([t1], GODOWN);
  check((incoming.get("B") ?? 0) === 6 && !incoming.has("A") &&
        transfers.incomingByProductAtWarehouse([t1], MAIN).size === 0 &&
        transfers.inTransitBetween([t1], MAIN, GODOWN) === 6,
    "incoming: the destination desk sees B's 6 on the road, A's none; the pair figure agrees");

  /* ---- close-short: the ONE posting, restoring the identity (§2.3) ---- */
  const shortages = transfers.transferShortages(t1);
  check(shortages.length === 1 && shortages[0].productId === "B" && shortages[0].qty === 6,
    "close-short: the shortage is exactly what was sent and never arrived (B × 6)");
  check(eq(transfers.transferLossValue(shortages, byId), 900),
    "close-short: the loss values at the current shelf cost (6 × 150 = 900)");
  const lossEntry = transfers.buildTransferLossEntry(t1, shortages, byId);
  check(lossEntry !== null && lossEntry.refType === "transfer_loss" && lossEntry.refId === "st-t1" &&
        lossEntry.lines.length === 2 &&
        lossEntry.lines[0].account === "inventory_loss" && eq(lossEntry.lines[0].debit, 900) &&
        lossEntry.lines[1].account === "inventory" && eq(lossEntry.lines[1].credit, 900) &&
        ledger.entryBalances(lossEntry),
    "close-short: Dr inventory_loss / Cr inventory at the shortage value, through the balance guard");
  check(transfers.buildTransferLossEntry(t1, [], byId) === null,
    "close-short: nothing short composes no entry at all");
  /* §2.5 — the loss is dated TODAY and gated by the lock like every
   * entry; a dispatched transfer's RECEIVE is not gated at all. */
  const datedLoss = { ...lossEntry, ts: "2026-10-20T10:00:00.000Z" };
  let lockThrew = false;
  try { periods.preparePosting(datedLoss, periods.endOfDayPktInstant("2026-10-20")); }
  catch (e) { lockThrew = periods.isPeriodLockedError(e); }
  check(lockThrew && periods.preparePosting(datedLoss, periods.endOfDayPktInstant("2026-10-19")).dateISO === "2026-10-20",
    "§2.5: the loss posts at today's date — refused when today is locked, stamped + open the day before");
  totalsMap.set("B", totalsMap.get("B") - 6); // the store drops the shorted total in the close batch
  t1 = { ...t1, status: "received" };
  flowJournal = [...flowJournal, lossEntry];
  check(identity([t1]) && eq(stock.rowsTotal(lv, "B"), 24) &&
        eq(ledger.accountBalance(flowJournal, "inventory_loss"), 900) &&
        eq(ledger.accountBalance(flowJournal, "inventory"), -900),
    "close-short applied: totals drop by the shortage, §1.3's identity is restored, the GL carries the loss");

  /* ---- a full receipt writes zero journal entries, end to end ---- */
  let t2 = mkTransfer("st-t2", transfers.composeTransferLines(c2Products, [{ productId: "A", qty: 5 }]), "draft");
  t2 = { ...t2, number: "TR-2", status: "dispatched" };
  applyDeltas(t2.lines.map((l) => ({ wh: MAIN, pid: l.productId, delta: -l.qtySent })));
  t2 = recv(t2, [{ productId: "A", qty: 5 }]);
  check(t2.status === "received" && flowJournal.length === 1 && identity([t1, t2]) &&
        stock.rowQtyOf(lv, GODOWN, "A") === 30 && stock.rowQtyOf(lv, MAIN, "A") === 20,
    "full receipt: received in one landing, rows exact, and the journal gained NOTHING across the whole transfer");

  /* ---- return-to-source: what is still on the road goes home ---- */
  let t3 = mkTransfer("st-t3", transfers.composeTransferLines(c2Products, [{ productId: "A", qty: 8 }]), "draft");
  t3 = { ...t3, number: "TR-3", status: "dispatched" };
  applyDeltas(t3.lines.map((l) => ({ wh: MAIN, pid: l.productId, delta: -l.qtySent })));
  t3 = recv(t3, [{ productId: "A", qty: 3 }]);
  const t3Short = transfers.transferShortages(t3);
  applyDeltas(t3Short.map((s) => ({ wh: MAIN, pid: s.productId, delta: s.qty })));
  t3 = { ...t3, status: "returned" };
  check(stock.rowQtyOf(lv, MAIN, "A") === 17 && transfers.inTransitByProduct([t3]).size === 0 &&
        identity([t1, t2, t3]) && flowJournal.length === 1,
    "return-to-source: the 5 still on the road land back at the source; the 3 received stay; nothing posts");
  check(!transfers.canTransferTransition(t3, "receive") &&
        !transfers.canTransferTransition(t3, "returnToSource") &&
        !transfers.canTransferTransition(t1, "receive"),
    "transitions: terminal transfers (returned / received) accept no further movement");

  /* ---- §2.5 scenario: dispatched BEFORE a lock, received after it ---- */
  let t4 = mkTransfer("st-t4", transfers.composeTransferLines(c2Products, [{ productId: "B", qty: 5 }]), "draft");
  t4 = { ...t4, number: "TR-4", status: "dispatched" };
  applyDeltas(t4.lines.map((l) => ({ wh: MAIN, pid: l.productId, delta: -l.qtySent })));
  t4 = recv(t4, [{ productId: "B", qty: 5 }]); // received "after the lock" — a receive composes no entry to gate
  check(t4.status === "received" && flowJournal.length === 1 && identity([t1, t2, t3, t4]),
    "§2.5: a transfer dispatched before a period lock is received after it — only its shortage could ever post");
  let t5 = mkTransfer("st-t5", transfers.composeTransferLines(c2Products, [{ productId: "B", qty: 4 }]), "draft");
  t5 = { ...t5, number: "TR-5", status: "dispatched" };
  applyDeltas(t5.lines.map((l) => ({ wh: MAIN, pid: l.productId, delta: -l.qtySent })));
  const t5Entry = transfers.buildTransferLossEntry(t5, transfers.transferShortages(t5), byId);
  let closeThrew = false;
  try { periods.preparePosting({ ...t5Entry, ts: "2026-10-20T10:00:00.000Z" }, periods.endOfDayPktInstant("2026-10-20")); }
  catch (e) { closeThrew = periods.isPeriodLockedError(e); }
  check(closeThrew && t5.status === "dispatched" && totalsMap.get("B") === 24 && flowJournal.length === 1,
    "§2.5: with today locked the close-short refuses with its loss — the transfer simply stays open, totals untouched");

  /* ---- the class-account seam (§4.1, adopted early by §2.3) ---- */
  check(transfers.inventoryAccountFor({}) === "inventory" &&
        transfers.inventoryAccountFor({ stockClass: "raw" }) === "inventory_raw",
    "class: goods resolve to inventory, raw-class to inventory_raw");
  const rawEntry = transfers.buildTransferLossEntry(
    { id: "st-raw", number: "TR-9" },
    [{ productId: "R", name: "Raw Jute Roll", qty: 2 }],
    byId
  );
  check(rawEntry !== null &&
        rawEntry.lines.some((l) => l.account === "inventory_raw" && eq(l.credit, 200)) &&
        !rawEntry.lines.some((l) => l.account === "inventory") &&
        eq(rawEntry.lines[0].debit, 200),
    "class: a raw product's shortage credits inventory_raw (2 × 100), never inventory");

  /* ---- the drift detector is in-transit aware (C2 extends §1.7) ---- */
  /* The detector reads each product's CURRENT total — after the
   * close-short above, B's live total is 24, not its opening 30. */
  const liveProducts = c2Products.map((p) => ({ ...p, stockQty: totalsMap.get(p.id) }));
  const allOpen = [t5];
  check(stock.stockDrift(liveProducts, lv, allOpen).length === 0,
    "drift: with transfers passed, an open transfer's road stock is NOT drift — the identity already accounts for it");
  const legacyDrift = stock.stockDrift(liveProducts, lv);
  check(legacyDrift.length === 1 && legacyDrift[0].productId === "B" && eq(legacyDrift[0].drift, -4),
    "drift: the pre-C2 two-argument reading would misread B's 4 on the road as drift — why the signature grew");
  const lvDrifted = stock.applyLevelDelta(lv, MAIN, "A", +5);
  const caught = stock.stockDrift(liveProducts, lvDrifted, allOpen);
  check(caught.length === 1 && caught[0].productId === "A" && eq(caught[0].drift, 5) &&
        eq(caught[0].inTransit, 0),
    "drift: an injected +5 is still caught exactly, with a transfer open");
  const repaired = stock.recountLevels(liveProducts, lvDrifted, whs, allOpen);
  check(repaired.repaired === 1 && stock.stockDrift(liveProducts, repaired.levels, allOpen).length === 0 &&
        (transfers.inTransitByProduct(allOpen).get("B") ?? 0) === 4 &&
        stock.rowQtyOf(repaired.levels, MAIN, "B") === stock.rowQtyOf(lv, MAIN, "B"),
    "recount: the default row absorbs the drift; the transfer's road stock is never touched");

  /* ---- the demo seed draft (§10.3): flavour that moves nothing ---- */
  const seedTransfers = seed.getSeedStockTransfers(products);
  check(seedTransfers.length === 1 && seedTransfers[0].status === "draft" &&
        seedTransfers[0].number === null &&
        seedTransfers[0].fromWarehouseId === MAIN && seedTransfers[0].toWarehouseId === GODOWN &&
        seedTransfers[0].lines.every((l) => l.qtyReceived === 0 && l.qtySent > 0),
    "seed: exactly one DRAFT transfer (Main → Godown), unnumbered, nothing received");
  check(transfers.inTransitByProduct(seedTransfers).size === 0 &&
        journal.length === 21 &&
        eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.accountBalance(journal, "cash"), 50000),
    "seed: the draft moves nothing — no in-transit, frozen journal identities intact (21 entries · Inventory 272,805 · Cash 50,000)");

  /* ---- RBAC: the transfers surface rides the warehouses row (§6.1) ---- */
  check(perm.can("owner", "warehouses", "write") && perm.can("manager", "warehouses", "write") &&
        !perm.can("accountant", "warehouses", "write") && perm.can("accountant", "warehouses", "view") &&
        !perm.can("cashier", "warehouses", "view"),
    "RBAC: transfers gate on the warehouses row — owner/manager run them, accountant reads, cashier never reaches the surface");

  /* ---- i18n parity for the C2 strings ---- */
  const trKeys = Object.keys(i18n.en).filter((k) => k.startsWith("tr.") || k === "nav.stockTransfers");
  check(trKeys.length === 74, `i18n: the C2 part carries ${trKeys.length} keys (74 expected)`);
  check(trKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0) &&
        typeof i18n.en["settings.series.stockTransfer"] === "string" &&
        typeof i18n.ur["settings.series.stockTransfer"] === "string" &&
        i18n.ur["settings.series.stockTransfer"].length > 0,
    "i18n: every C2 key present and non-empty in Urdu (parity), incl. the numbering-settings label");
  /* Phase C · C3 amended this total (same parity check): the
   * dictionary grew by the C3 keys (44 mfg + 6 inv additions).
   * Phase C · C4 amended it again (same check): +87 — the 86
   * production keys in the mfg part + the productionOrder
   * series label.
   * Phase C · C5 amended it again (same check): +119 — the 118
   * job keys in the jobs part (incl. nav.jobs) + the job series
   * label.
   * The UX overhaul amended it again (same check): +11 keys.
   * The live-audit fixes amend it again (same check): +23 — the
   * 12 fin keys (negative-balance warning + journal viewer) and
   * the 11 reports keys (trial balance + sales reconciliation).
   * Phase D · D1 amends it again (same check): +106 — the 103
   * hr-part keys (staff directory + attendance register, incl.
   * nav.staff), the `fin.acct.loans_receivable` label, and the
   * two settings.series labels (payrollRun / loan).
   * Phase D · D2 amends it again (same check): +114 — the 84
   * pay.* keys + 20 slip.* keys + the staff.tab.payroll chip in
   * the hr part, and 9 fin keys (the salary_payable composition
   * card + the three payroll journal labels).
   * The shell/theme/polish increment amends it again (same
   * check): +2 — the fin bucket-breakdown label and the
   * single-string negative-balance line (fixes A + E). */
  check(Object.keys(i18n.en).length === 2214 && Object.keys(i18n.ur).length === 2214,
    "i18n: the dictionary now carries 2,214 keys, EN ≡ UR");

  /* ---- source invariants: the store wiring ---- */
  const storeSrcC2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcC2.includes('"stockTransfers"') && storeSrcC2.includes('"dukaan-ai-store-v12"') &&
        storeSrcC2.includes("buildTransferLossEntry") && storeSrcC2.includes("commitTransferMovement"),
    "source: the collection, the v12 demo bump and the movement writer are wired into the store");
  check((storeSrcC2.match(/makeEntry\(/g) || []).length === 24,
    "source: still 24 makeEntry calls in the store — the transfer loss is composed in lib/transfers, no new inline posting path");
  const viewSrcC2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/TransfersView.tsx", "utf8");
  const sheetSrcC2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/DocPrintSheet.tsx", "utf8");
  check(viewSrcC2.includes("TransferPrintSheet") && sheetSrcC2.includes("export function TransferPrintSheet") &&
        viewSrcC2.includes('can(role, "warehouses", "view")'),
    "source: the transfers workspace + its print sheet ship, gated on the warehouses row");

  /* ---- rules: additive C2 block only ---- */
  const rulesC2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  /* Segment end amended at Phase D · D2 (same-check style): the
   * C2–C5 segment-content checks originally sliced to the
   * Expenses block, a span that now legitimately contains the
   * Phase D blocks — and D2's payrollRuns block carries
   * createInOpenPeriod BY DESIGN (§6.2). Each segment now ends
   * at the NEXT block's marker, so the checks assert exactly
   * what they always asserted: their OWN block's content. The
   * strip proofs below keep the Expenses end (they remove the
   * whole span, Phase D included, reproducing the era file). */
  const c2Seg = rulesC2.slice(
    rulesC2.indexOf("      // Phase C · C2"),
    rulesC2.indexOf("      // Phase C · C3"));
  check(c2Seg.includes("match /stockTransfers/{transferId}") &&
        c2Seg.includes("hasRole(uid, ['owner', 'manager'])") &&
        c2Seg.includes("allow read: if canAccess(uid);"),
    "rules: stockTransfers block — read canAccess, write owner/manager (design §6.2)");
  check(!c2Seg.includes("createInOpenPeriod"),
    "rules: NO period backstop on the transfer doc — dispatch/receive post nothing; the loss is guarded at the journal (§2.5)");
  const strippedC2 = rulesC2.slice(0, rulesC2.indexOf("      // Phase C · C2")) +
    rulesC2.slice(rulesC2.indexOf("      // Expenses:"));
  check(crypto.createHash("sha256").update(strippedC2, "utf8").digest("hex") ===
        "21582bd131ecc692f995381cdbccc1e7f55489b9dd93f793c4fd28d549bc5152",
    "rules: stripping the C2 block reproduces the pre-C2 file byte-for-byte (additive only)");
}

/* ============================ C3 (product class & BOM) ============================ */
suite("C3", null); // Phase C · C3 — product class & BOM (design §3 + §4.1)
{
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const lineOf = (e, account) => e.lines.find((l) => l.account === account);

  /* ---- the class resolver (real, lib/transfers) ---- */
  check(transfers.inventoryAccountFor({}) === "inventory",
    "class: a product with no class flag resolves to `inventory` (goods)");
  check(transfers.inventoryAccountFor({ stockClass: null }) === "inventory",
    "class: stockClass null resolves to `inventory` (goods)");
  check(transfers.inventoryAccountFor({ stockClass: "raw" }) === "inventory_raw",
    "class: stockClass raw resolves to `inventory_raw`");

  /* ---- the split helper (real, lib/ledger classLegLines) ---- */
  check(eq(ledger.classLegLines(34500, 0, "debit"),
        [{ account: "inventory", debit: 34500, credit: 0 }]),
    "split: no raw share ⇒ the single legacy `inventory` line, byte-identical");
  check(eq(ledger.classLegLines(34500, 0, "credit"),
        [{ account: "inventory", debit: 0, credit: 34500 }]),
    "split: no raw share on the credit side ⇒ the single legacy line");
  check(eq(ledger.classLegLines(0, 0, "debit"),
        [{ account: "inventory", debit: 0, credit: 0 }]),
    "split: a zero movement keeps the legacy zero line (makeEntry filters it, as before)");
  check(eq(ledger.classLegLines(34500, 10000, "debit"),
        [{ account: "inventory", debit: 24500, credit: 0 },
         { account: "inventory_raw", debit: 10000, credit: 0 }]),
    "split: a mixed movement splits per class, goods line first, parts sum to the total");
  check(eq(ledger.classLegLines(5000, 5000, "credit"),
        [{ account: "inventory_raw", debit: 0, credit: 5000 }]),
    "split: an all-raw movement is a single `inventory_raw` line");
  {
    // Float-dust discipline: the parts must sum to the total to
    // the paisa and the composed entry must balance.
    const legs = ledger.classLegLines(100.005, 33.335, "debit");
    const sum = legs.reduce((a, l) => a + l.debit, 0);
    const e = ledger.makeEntry("dust", "adjustment", null, [
      ...legs,
      { account: "capital", debit: 0, credit: 100.005 },
    ]);
    check(Math.abs(sum - 100.005) < 0.01 && ledger.entryBalances(e),
      "split: fractional-paisa shares still sum to the total (final-absorb) and balance");
  }

  /* ---- the no-raw regression gate at template level ---- */
  {
    // postBill's tail, pre-C3 vs generalised with zero raw share.
    const legacyTail = [{ account: "inventory", debit: 0, credit: 1380 }];
    check(eq(legacyTail, ledger.classLegLines(1380, 0, "credit")),
      "regression: the bill COGS tail with no raw lines is byte-identical to pre-C3");
    // recordPurchase's full entry, legacy vs generalised.
    const strip = (e) => { const { ts, id, ...rest } = e; return JSON.stringify(rest); };
    const legacy = ledger.makeEntry("Purchase — stock received", "purchase", "pur-x", [
      { account: "purchases", debit: 34500, credit: 0 },
      { account: "inventory", debit: 34500, credit: 0 },
      { account: "purchases", debit: 0, credit: 34500 },
      { account: "payables", debit: 0, credit: 34500, ref: "sup-1" },
    ]);
    const generalised = ledger.makeEntry("Purchase — stock received", "purchase", "pur-x", [
      { account: "purchases", debit: 34500, credit: 0 },
      ...ledger.classLegLines(34500, 0, "debit"),
      { account: "purchases", debit: 0, credit: 34500 },
      { account: "payables", debit: 0, credit: 34500, ref: "sup-1" },
    ]);
    check(strip(legacy) === strip(generalised),
      "regression: the whole purchase entry with no raw lines is byte-identical to pre-C3");
  }

  /* ---- purchase legs: raw + mixed, tax untouched (real tax engine) ---- */
  {
    const gst = { id: "gst17", name: "GST 17%", kind: "percent", rate: 17, inclusive: false, active: true };
    const pt = tax.computePurchaseTaxes([
      { total: 24500, qty: 100, slab: gst },   // goods line, exclusive GST
      { total: 10000, qty: 50, slab: null },   // raw line, untaxed
    ]);
    check(pt.netTotal === 34500 && pt.taxAmount === 4165 && pt.grossTotal === 38665,
      "purchase: the tax composition is untouched by class (net 34,500 + GST 4,165 = gross 38,665)");
    // The store's raw-share derivation: Σ per-line NET bases of raw lines.
    const rawShare = [24500, 10000].reduce(
      (a, _t, i) => a + (i === 1 ? pt.lines[i].base : 0), 0);
    check(rawShare === 10000 && pt.lines[0].base === 24500,
      "purchase: per-line bases split cleanly by class (goods 24,500 / raw 10,000)");
    const entry = ledger.makeEntry("Purchase — stock received", "purchase", "pur-y", [
      { account: "purchases", debit: pt.netTotal, credit: 0 },
      { account: "tax_input", debit: pt.taxAmount, credit: 0 },
      ...ledger.classLegLines(pt.netTotal, rawShare, "debit"),
      { account: "purchases", debit: 0, credit: pt.netTotal },
      { account: "payables", debit: 0, credit: pt.grossTotal, ref: "sup-1" },
    ]);
    check(lineOf(entry, "inventory").debit === 24500 &&
          lineOf(entry, "inventory_raw").debit === 10000 &&
          lineOf(entry, "tax_input").debit === 4165 &&
          lineOf(entry, "payables").credit === 38665 &&
          ledger.entryBalances(entry),
      "purchase: a mixed purchase splits its inventory leg per class; tax + payables legs unchanged");
    const allRaw = ledger.makeEntry("Purchase — stock received", "purchase", "pur-z", [
      { account: "purchases", debit: 10000, credit: 0 },
      ...ledger.classLegLines(10000, 10000, "debit"),
      { account: "purchases", debit: 0, credit: 10000 },
      { account: "payables", debit: 0, credit: 10000, ref: "sup-1" },
    ]);
    check(allRaw.lines.filter((l) => l.account === "inventory").length === 0 &&
          lineOf(allRaw, "inventory_raw").debit === 10000,
      "purchase: an all-raw purchase debits only `inventory_raw`");
  }

  /* ---- sale / counter / return mirrors ---- */
  {
    // Bill COGS: goods 2 × 390 + raw 3 × 200 = 1,380.
    const legs = ledger.classLegLines(1380, 600, "credit");
    check(eq(legs, [{ account: "inventory", debit: 0, credit: 780 },
                    { account: "inventory_raw", debit: 0, credit: 600 }]),
      "sale: a mixed bill's COGS credit splits per class (780 goods / 600 raw)");
    // Counter sale of a raw product: the tail line is its class account.
    const counterTail = {
      account: transfers.inventoryAccountFor({ stockClass: "raw" }),
      debit: 0, credit: 3 * 200,
    };
    check(counterTail.account === "inventory_raw" && counterTail.credit === 600,
      "sale: a raw product sold at the counter credits `inventory_raw`");
    check(eq(ledger.classLegLines(500, 200, "debit"),
          [{ account: "inventory", debit: 300, credit: 0 },
           { account: "inventory_raw", debit: 200, credit: 0 }]),
      "return: a mixed sale return debits each class account its own share back");
    check(eq(ledger.classLegLines(5000, 2000, "credit"),
          [{ account: "inventory", debit: 0, credit: 3000 },
           { account: "inventory_raw", debit: 0, credit: 2000 }]),
      "purchase return: the inventory credit splits per class over the per-item nets");
  }

  /* ---- the reclass builder (real, lib/transfers) ---- */
  {
    const goods = { id: "p-g", name: "Atta 20kg", stockClass: null };
    const raw = { id: "p-r", name: "Bulk Rice 5kg", stockClass: "raw" };
    const flip = transfers.buildReclassEntry(goods, "raw", 10, 250);
    check(flip !== null && flip.refType === "reclass" && flip.refId === "p-g" &&
          eq(flip.lines, [{ account: "inventory_raw", debit: 2500, credit: 0 },
                          { account: "inventory", debit: 0, credit: 2500 }]),
      "reclass: goods → raw with stock posts exactly ONE entry of stockQty × costPrice");
    const back = transfers.buildReclassEntry(raw, null, 10, 250);
    check(back !== null &&
          eq(back.lines, [{ account: "inventory", debit: 2500, credit: 0 },
                          { account: "inventory_raw", debit: 0, credit: 2500 }]),
      "reclass: raw → goods mirrors the entry");
    check(transfers.buildReclassEntry(goods, "raw", 0, 250) === null,
      "reclass: at zero stock the flip posts NOTHING (bare flag change)");
    check(transfers.buildReclassEntry(goods, "raw", 10, 0) === null,
      "reclass: at zero value the flip posts NOTHING");
    check(transfers.buildReclassEntry(goods, null, 10, 250) === null,
      "reclass: no class change ⇒ no entry");
    const neg = transfers.buildReclassEntry(goods, "raw", -4, 250);
    check(neg !== null &&
          eq(neg.lines, [{ account: "inventory", debit: 1000, credit: 0 },
                          { account: "inventory_raw", debit: 0, credit: 1000 }]),
      "reclass: a negative on-hand quantity reclasses as the mirror image");
    const journal = [
      ledger.makeEntry("Opening stock on product create", "adjustment", "p-g", [
        { account: "inventory", debit: 2500, credit: 0 },
        { account: "capital", debit: 0, credit: 2500 },
      ]),
      flip,
    ];
    check(ledger.accountBalance(journal, "inventory") === 0 &&
          ledger.accountBalance(journal, "inventory_raw") === 2500,
      "reclass: after the flip the whole shelf value sits in the new class account");
  }

  /* ---- the class identities over a mixed workload (replayed) ---- */
  {
    const j = [];
    j.push(ledger.makeEntry("Purchase — stock received", "purchase", "w1", [
      { account: "inventory", debit: 24500, credit: 0 },
      { account: "payables", debit: 0, credit: 24500, ref: "sup-1" },
    ]));
    j.push(ledger.makeEntry("Purchase — stock received", "purchase", "w2", [
      { account: "inventory_raw", debit: 10000, credit: 0 },
      { account: "payables", debit: 0, credit: 10000, ref: "sup-1" },
    ]));
    j.push(ledger.makeEntry("Bill #1", "bill", "w3", [
      { account: "cogs", debit: 1380, credit: 0 },
      { account: "receivables", debit: 2000, credit: 0, ref: "cu-1" },
      { account: "sales_revenue", debit: 0, credit: 2000 },
      ...ledger.classLegLines(1380, 600, "credit"),
    ]));
    j.push(ledger.makeEntry("Return against Bill #1", "return", "w3", [
      ...ledger.classLegLines(200, 200, "debit"),
      { account: "cogs", debit: 0, credit: 200 },
    ]));
    j.push(ledger.makeEntry("Stock damage — Atta", "adjustment", "w5", [
      { account: "inventory_loss", debit: 100, credit: 0 },
      { account: transfers.inventoryAccountFor({ stockClass: null }), debit: 0, credit: 100 },
    ]));
    j.push(ledger.makeEntry("Purchase return — goods sent back", "purchase_return", "w6", [
      { account: "payables", debit: 2000, credit: 0, ref: "sup-1" },
      ...ledger.classLegLines(2000, 2000, "credit"),
    ]));
    check(ledger.accountBalance(j, "inventory") === 24500 - 780 - 100,
      "identity: GL `inventory` == goods-class valued movements (24,500 − 780 − 100 = 23,620)");
    check(ledger.accountBalance(j, "inventory_raw") === 10000 - 600 + 200 - 2000,
      "identity: GL `inventory_raw` == raw-class valued movements (10,000 − 600 + 200 − 2,000 = 7,600)");
    const td = j.reduce((a, e) => a + e.lines.reduce((x, l) => x + l.debit, 0), 0);
    const tc = j.reduce((a, e) => a + e.lines.reduce((x, l) => x + l.credit, 0), 0);
    check(j.every((e) => ledger.entryBalances(e)) && Math.abs(td - tc) < 0.01,
      "identity: the whole mixed workload balances (trial balance 0)");
  }

  /* ---- BOM: validation, immutable versioning, standard costs ---- */
  {
    const products = [
      { id: "out", stockClass: null, costPrice: 500 },
      { id: "bulk", stockClass: "raw", costPrice: 1950 },
      { id: "salt", stockClass: null, costPrice: 78 },
    ];
    const draft = {
      outputProductId: "out", outputQty: 5, labourCost: 100, overheadCost: 50,
      lines: [{ productId: "bulk", qty: 1 }],
    };
    check(boms.validateBomDraft(products, draft) === null,
      "bom: a well-formed draft validates (goods-class components are legal too)");
    check(boms.validateBomDraft(products, { ...draft, lines: [{ productId: "out", qty: 1 }] }) === "self_component",
      "bom: a product listing ITSELF as a component is refused (self_component)");
    check(boms.validateBomDraft(products, { ...draft, outputProductId: "bulk" }) === "output_raw",
      "bom: a raw material cannot be a recipe's output (output_raw)");
    check(boms.validateBomDraft(products, { ...draft, lines: [] }) === "empty_lines",
      "bom: a recipe with no components is refused (empty_lines)");
    check(boms.validateBomDraft(products, { ...draft, lines: [{ productId: "ghost", qty: 1 }] }) === "unknown_component",
      "bom: an unknown component is refused (unknown_component)");
    check(boms.validateBomDraft(products, { ...draft, lines: [{ productId: "bulk", qty: 0 }] }) === "bad_qty",
      "bom: a zero component quantity is refused (bad_qty)");
    check(boms.validateBomDraft(products, { ...draft, outputQty: 0 }) === "bad_batch",
      "bom: a zero batch size is refused (bad_batch)");
    check(boms.validateBomDraft(products, { ...draft, outputProductId: "ghost" }) === "output_unknown",
      "bom: an unknown output product is refused (output_unknown)");

    // The store's versioning composition, over the real helpers:
    // save v1, then save again — n+1 mints, n deactivates, both stay.
    let list = [];
    const save = (d) => {
      const prev = list.find((b) => b.outputProductId === d.outputProductId && b.active);
      const bom = {
        id: `bom-${list.length + 1}`, outputProductId: d.outputProductId,
        outputName: "Out", outputQty: d.outputQty,
        version: boms.nextBomVersion(list, d.outputProductId),
        lines: d.lines.map((l) => ({ ...l, name: l.productId })),
        labourCost: d.labourCost, overheadCost: d.overheadCost,
        active: true, note: "", ts: "2026-01-01T00:00:00.000Z",
      };
      list = [...list.map((b) => (prev && b.id === prev.id ? { ...b, active: false } : b)), bom];
      return bom;
    };
    const v1 = save(draft);
    check(v1.version === 1 && boms.activeBomFor(list, "out") === v1,
      "bom: the first save mints version 1, active");
    const v2 = save({ ...draft, outputQty: 6 });
    const history = boms.bomsForOutput(list, "out");
    check(v2.version === 2 && history.length === 2 &&
          history[0].version === 1 && history[0].active === false &&
          history[0].outputQty === 5 && boms.activeBomFor(list, "out").version === 2,
      "bom: an edit is version n+1 — version n stays readable, deactivated, unrewritten");
    check(boms.bomOutputIds(list).length === 1 &&
          boms.nextBomVersion(list, "other") === 1,
      "bom: versions are per output product (a new product starts at 1)");
    check(boms.bomBatchMaterialCost(v1, products) === 1950 &&
          boms.bomUnitCost(v1, products) === 420,
      "bom: standard costs — batch materials 1,950; unit (1,950 + 100 + 50) / 5 = 420");
  }

  /* ---- seed / demo: the demo BOM posts nothing; fresh seeds stay class-free ---- */
  {
    const seedProducts = seed.getSeedProducts();
    const demoBoms = seed.getSeedBoms(seedProducts);
    check(demoBoms.length === 1 && demoBoms[0].outputProductId === "p02" &&
          demoBoms[0].version === 1 && demoBoms[0].active === true &&
          demoBoms[0].lines.length === 1 &&
          demoBoms[0].lines[0].productId === seed.SEED_DEMO_RAW_PRODUCT_ID &&
          demoBoms[0].outputQty === 5,
      "seed: ONE demo BOM — bulk rice (p25) repacked into 1 kg packs (p02), batch of 5");
    check(seedProducts.every((p) => p.stockClass == null),
      "seed: the seed product list carries NO raw products — a fresh shop's journal is the frozen one");
  }

  /* ---- RBAC: the manufacturing row (design §6.1) ---- */
  check(perm.can("owner", "manufacturing", "write") && perm.can("manager", "manufacturing", "write"),
    "RBAC: owner/manager write recipes (manufacturing row F/F)");
  check(!perm.can("cashier", "manufacturing", "view"),
    "RBAC: the cashier never reaches the manufacturing surface (row N)");
  check(perm.can("accountant", "manufacturing", "view") && !perm.can("accountant", "manufacturing", "write"),
    "RBAC: the accountant reads recipes but cannot write them (row R)");

  /* ---- i18n parity for the C3 strings ---- */
  const mfgKeys = Object.keys(i18n.en).filter((k) => k.startsWith("mfg.") || k === "nav.manufacturing");
  /* Phase C · C4 amended this count (same parity check): the
   * mfg part grew by the 86 production keys (orders, issue,
   * completion, scrap, close, events, print).
   * The UX overhaul amended it again (same check): +1 mfg key. */
  check(mfgKeys.length === 131, `i18n: the mfg part carries ${mfgKeys.length} keys (131 expected — 44 C3 + 86 C4 + 1 UX)`);
  check(mfgKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "i18n: every C3 key present and non-empty in Urdu (parity)");
  const invKeys = ["inv.form.class", "inv.class.goods", "inv.class.raw",
    "inv.form.classHint", "inv.form.classReclassNote", "inv.rawBadge"];
  check(invKeys.every((k) => typeof i18n.en[k] === "string" && i18n.en[k].length > 0 &&
        typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "i18n: the product-class strings (form, hint, reclass note, raw badge) exist in both languages");
  check(typeof i18n.en["fin.acct.inventory_raw"] === "string" &&
        typeof i18n.en["fin.acct.wip"] === "string" &&
        i18n.ur["fin.acct.inventory_raw"].length > 0 && i18n.ur["fin.acct.wip"].length > 0,
    "i18n: the Phase A account labels for `inventory_raw` + `wip` exist in both languages (§8 verification)");

  /* ---- source invariants: the store wiring ---- */
  const storeSrcC3 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcC3.includes('"boms"') && storeSrcC3.includes('"dukaan-ai-store-v13"') &&
        storeSrcC3.includes("saveBomVersion") && storeSrcC3.includes("buildReclassEntry("),
    "source: boms collection wired + v13 demo bump + the save/reclass actions exist");
  check((storeSrcC3.match(/makeEntry\(/g) || []).length === 24,
    "source: still 24 makeEntry calls in the store — the reclass composes in lib/transfers (C2 pattern)");
  check(!storeSrcC3.includes('account: "inventory"') &&
        (storeSrcC3.match(/classLegLines\(/g) || []).length >= 5 &&
        (storeSrcC3.match(/inventoryAccountFor\(/g) || []).length >= 3,
    "source: NO stock-value template in the store hardcodes the `inventory` account — the split paths (bill/returns/purchase/purchase-return/import) go through classLegLines, the single-product paths (adjustments/opening, revaluation, counter sale) through inventoryAccountFor, the reclass through lib's builder");

  /* ---- rules: additive boms block only ---- */
  const rulesC3 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const c3Seg = rulesC3.slice(
    rulesC3.indexOf("      // Phase C · C3"),
    rulesC3.indexOf("      // Phase C · C4"));
  check(c3Seg.includes("match /boms/{bomId}") &&
        c3Seg.includes("allow read: if canAccess(uid);") &&
        c3Seg.includes("hasRole(uid, ['owner', 'manager'])"),
    "rules: boms block — read canAccess, write owner/manager (design §6.2)");
  check(!c3Seg.includes("createInOpenPeriod"),
    "rules: NO period backstop on boms — a recipe posts nothing (§7)");
  const strippedC3 = rulesC3.slice(0, rulesC3.indexOf("      // Phase C · C3")) +
    rulesC3.slice(rulesC3.indexOf("      // Expenses:"));
  check(crypto.createHash("sha256").update(strippedC3, "utf8").digest("hex") ===
        "fbacf2980246845b7293b5b9e66913aaa191212ce766c4d1f50fd1d9fe023603",
    "rules: stripping the C3 block reproduces the pre-C3 file byte-for-byte (additive only)");
}

/* ============================ C4 (production orders) ============================ */
suite("C4", null); // Phase C · C4 — production orders (design §4)
{
  const MAIN = "wh-main";
  const GODOWN = seed.SEED_GODOWN_ID;
  const whs = seed.getSeedWarehouses();
  const dLine = (e, account, ref) =>
    e.lines.find((l) => l.account === account && l.debit > 0 && (ref === undefined || l.ref === ref));
  const cLine = (e, account, ref) =>
    e.lines.find((l) => l.account === account && l.credit > 0 && (ref === undefined || l.ref === ref));

  /* Fixture shop: two raw materials, one goods component, one
   * finished product; all stock at the default warehouse. The
   * scenario journal starts EMPTY — identities are asserted
   * within the scenario, and the frozen seed is re-verified at
   * the end. */
  const products = [
    { id: "flour", name: "Flour (bulk)", stockClass: "raw", costPrice: 100, stockQty: 100 },
    { id: "sugar", name: "Sugar (bulk)", stockClass: "raw", costPrice: 50, stockQty: 100 },
    { id: "bottle", name: "Glass bottle", stockClass: null, costPrice: 20, stockQty: 200 },
    { id: "jam", name: "Mixed fruit jam 500g", stockClass: null, costPrice: 300, stockQty: 5 },
  ];
  let levels = stock.stockV1Rows(products, []);
  const j = [];
  const till = accounts.find((a) => a.legacyFor === "cash");
  const prod = (id) => products.find((p) => p.id === id);
  const glWip = () => ledger.accountBalance(j, "wip");
  const pools = (...os) => os.reduce((a, o) => a + production.poolOf(o), 0);
  const driftSilent = () => stock.stockDrift(products, levels, []).length === 0;
  const qtyEvent = (kind, qty, value, entry) =>
    ({ kind, qty, value, entryId: entry.id, dayOffset: 0, ts: "2026-01-01T00:00:00.000Z" });
  /* Land an event exactly as the store's demo path does
   * (commitProductionEvent): entry appended, product totals +
   * rows moved by the event, status label recomputed from the
   * derivation. */
  const land = (order, event, entry, fx = {}) => {
    if (entry) j.push(entry);
    if (event.kind === "issue") {
      for (const l of event.lines) {
        prod(l.productId).stockQty -= l.qty;
        levels = stock.applyLevelDelta(levels, order.warehouseId, l.productId, -l.qty);
      }
    }
    if (event.kind === "completion") {
      prod(order.outputProductId).stockQty += event.qty;
      if (fx.unitCost !== undefined) prod(order.outputProductId).costPrice = fx.unitCost;
      levels = stock.applyLevelDelta(levels, order.warehouseId, order.outputProductId, event.qty);
    }
    const next = { ...order, events: [...order.events, event] };
    next.status = production.deriveProductionStatus(next);
    return next;
  };

  const bomV1 = {
    id: "bom-jam-1", outputProductId: "jam", outputName: "Mixed fruit jam 500g",
    outputQty: 10, version: 1, active: true, labourCost: 500, overheadCost: 300,
    note: "", ts: "2026-01-01T00:00:00.000Z",
    lines: [
      { productId: "flour", name: "Flour (bulk)", qty: 20 },
      { productId: "sugar", name: "Sugar (bulk)", qty: 10 },
      { productId: "bottle", name: "Glass bottle", qty: 10 },
    ],
  };
  const mkOrder = (id, number, plannedQty, status = "open") => ({
    id, number, bomId: bomV1.id, bomVersion: 1,
    bomSnapshot: production.snapshotOfBom(bomV1),
    outputProductId: "jam", outputName: "Mixed fruit jam 500g",
    warehouseId: MAIN, plannedQty, events: [], note: "", status,
    dayOffset: 0, ts: "2026-01-01T00:00:00.000Z",
  });

  /* ---- the snapshot: mid-order BOM edits never re-cost (§3.2/R-C4) ---- */
  {
    const bomMutable = JSON.parse(JSON.stringify(bomV1));
    const snapOrder = { ...mkOrder("ord-snap", null, 10, "draft"), bomSnapshot: production.snapshotOfBom(bomMutable) };
    bomMutable.lines[0].qty = 999;
    bomMutable.labourCost = 9999;
    check(snapOrder.bomSnapshot.lines[0].qty === 20 && snapOrder.bomSnapshot.labourCost === 500,
      "snapshot: the order's recipe is a deep copy — editing the BOM afterwards changes nothing on the order");
    const defs = production.defaultIssueLines(snapOrder, 10);
    check(defs.find((l) => l.productId === "flour")?.qty === 20 && defs.find((l) => l.productId === "sugar")?.qty === 10,
      "snapshot: issue defaults scale the SNAPSHOT (flour 20 per batch), never the edited recipe");
    const conv = production.defaultIssueConversion(snapOrder, 20);
    check(eq(conv.labourCost, 1000) && eq(conv.overheadCost, 600),
      "snapshot: default conversion scales per-batch labour/overhead by run size");
  }

  /* ---- Scenario A: the full worked production (paid labour) ---- */
  let orderA = mkOrder("ord-a", "PR-1", 20);
  const inA = {
    runQty: 10, lines: production.defaultIssueLines(orderA, 10),
    labourCost: 500, overheadCost: 300, settlement: "paid", paidFromAccountId: till.id,
  };
  const prepA1 = production.prepareIssue(orderA, products, levels, whs, accounts, inA);
  check("prepared" in prepA1, "A: the first issue prepares (components in stock at the order warehouse)");
  const P1 = prepA1.prepared;
  check(eq(P1.materialsValue, 2700) && eq(P1.event.value, 3500),
    "A: materials valued at snapshot shelf costs (flour 2,000 + sugar 500 + bottle 200 = 2,700); event value adds the run's labour + overhead (3,500)");
  const e1 = P1.entry;
  check(e1.refType === "production_issue" && e1.refId === "ord-a" && ledger.entryBalances(e1),
    "A: the issue is ONE balanced entry, refType production_issue, refId the order");
  check(eq(dLine(e1, "wip", "ord-a")?.debit, 3500),
    "A: Dr wip (ref: order) carries materials + labour + overhead");
  check(eq(cLine(e1, "inventory_raw", "flour")?.credit, 2000) && eq(cLine(e1, "inventory_raw", "sugar")?.credit, 500),
    "A: raw components credit `inventory_raw`, one line per component, ref'd to the product (§4.1)");
  check(eq(cLine(e1, "inventory", "bottle")?.credit, 200),
    "A: a GOODS-class component credits `inventory` — the class split follows the component (§3.3)");
  check(eq(cLine(e1, "cash", till.id)?.credit, 800),
    "A: paid settlement credits the money account's bucket with the account as ref (labour 500 + overhead 300)");
  check(P1.event.paidFromAccountId === till.id && P1.event.lines.length === 3,
    "A: the event stamps the paying account and carries the valued component lines");
  orderA = land(orderA, P1.event, P1.entry);
  check(eq(production.poolOf(orderA), 3500) && eq(glWip(), 3500) && eq(glWip(), pools(orderA)),
    "A §4.3: after issue 1, GL wip == Σ pools == 3,500");
  check(prod("flour").stockQty === 80 && stock.rowQtyOf(levels, MAIN, "flour") === 80 && driftSilent(),
    "A: component totals and the order warehouse's rows drop together (§1.3 identity holds)");

  const prepA2 = production.prepareIssue(orderA, products, levels, whs, accounts, inA);
  check("prepared" in prepA2, "A: the second run's issue prepares");
  orderA = land(orderA, prepA2.prepared.event, prepA2.prepared.entry);
  check(eq(production.poolOf(orderA), 7000) && eq(glWip(), pools(orderA)) && prod("flour").stockQty === 60,
    "A §4.3: after issue 2, pool == GL wip == 7,000");

  const cA1 = production.completionAbsorb(orderA, 8, false);
  check("value" in cA1 && eq(cA1.value, 2800) && eq(cA1.unitCost, 350),
    "A: a partial completion absorbs pool × F / remaining plan (7,000 × 8/20 = 2,800; unit cost 350)");
  const ceA1 = production.buildCompletionEntry(orderA, 8, cA1.value);
  check(ceA1.refType === "production_complete" && eq(dLine(ceA1, "inventory", "ord-a")?.debit, 2800) &&
        eq(cLine(ceA1, "wip", "ord-a")?.credit, 2800),
    "A: completion entry — Dr inventory / Cr wip at the absorbed value, both legs ref'd to the order");
  orderA = land(orderA, qtyEvent("completion", 8, cA1.value, ceA1), ceA1, { unitCost: cA1.unitCost });
  check(prod("jam").stockQty === 13 && eq(prod("jam").costPrice, 350) &&
        stock.rowQtyOf(levels, MAIN, "jam") === 13 && eq(production.poolOf(orderA), 4200) && eq(glWip(), pools(orderA)),
    "A: finished units land in the order warehouse's row; the shelf costPrice becomes the absorbed unit cost (350)");

  const sA = production.scrapAbsorb(orderA, 2);
  check("value" in sA && eq(sA.value, 700),
    "A: scrap absorbs the same share a completion would (4,200 × 2/12 = 700)");
  const seA = production.buildScrapEntry(orderA, 2, sA.value, "scrap");
  check(seA.refType === "production_scrap" && eq(dLine(seA, "inventory_loss")?.debit, 700) &&
        eq(cLine(seA, "wip", "ord-a")?.credit, 700),
    "A: scrap entry — Dr inventory_loss / Cr wip");
  orderA = land(orderA, qtyEvent("scrap", 2, sA.value, seA), seA);
  check(eq(production.poolOf(orderA), 3500) && eq(glWip(), pools(orderA)) && prod("jam").stockQty === 13 && driftSilent(),
    "A: scrap moves NO stock rows — spoiled units were never finished stock");

  const cA2 = production.completionAbsorb(orderA, 12, false);
  check("value" in cA2 && eq(cA2.value, 3500) && eq(cA2.unitCost, 291.67),
    "A: reaching the plan makes the completion FINAL — it absorbs the entire remaining pool (3,500; unit 291.67)");
  const ceA2 = production.buildCompletionEntry(orderA, 12, cA2.value);
  orderA = land(orderA, qtyEvent("completion", 12, cA2.value, ceA2), ceA2, { unitCost: cA2.unitCost });
  check(production.poolOf(orderA) === 0 && production.producedQty(orderA) === 20 && orderA.status === "completed",
    "A: the final completion zeroes the pool exactly and the order completes");
  check(eq(production.completedValue(orderA) + production.writtenOffValue(orderA), production.issuedValue(orderA)) &&
        eq(production.issuedValue(orderA), 7000),
    "A §4.3 roll-up: completions (6,300) + scraps (700) == issues (7,000) to the paisa — nothing strands in WIP");
  check(prod("jam").stockQty === 25 && eq(prod("jam").costPrice, 291.67) && eq(glWip(), 0) && driftSilent(),
    "A: finished stock 25 on the shelf and in the row; GL wip back to 0");

  /* ---- Scenario B: accrued labour, closed with nothing produced ---- */
  let orderB = mkOrder("ord-b", "PR-2", 10);
  const prepB = production.prepareIssue(orderB, products, levels, whs, accounts, {
    runQty: 10, lines: production.defaultIssueLines(orderB, 10),
    labourCost: 500, overheadCost: 300, settlement: "accrue", paidFromAccountId: null,
  });
  check("prepared" in prepB, "B: the accrued issue prepares");
  const eB = prepB.prepared.entry;
  check(eq(cLine(eB, "salary_payable")?.credit, 800) &&
        !eB.lines.some((l) => l.account === "cash" || l.account === "wallet"),
    "B: accrued settlement credits `salary_payable` and touches NO money account (§4.4)");
  check(prepB.prepared.event.paidFromAccountId === "accrue",
    "B: the event stamps the accrual settlement");
  orderB = land(orderB, prepB.prepared.event, prepB.prepared.entry);
  check(eq(ledger.accountNormalBalance(j, "salary_payable"), 800) && eq(glWip(), 3500) && eq(glWip(), pools(orderA, orderB)),
    "B §4.3: GL wip == Σ pools across live orders (0 + 3,500); the accrual sits in salary_payable");
  const poolB = production.poolOf(orderB);
  const ceB = production.buildScrapEntry(orderB, 0, poolB, "closeout");
  check(ceB.refType === "production_scrap" && eq(dLine(ceB, "inventory_loss")?.debit, 3500),
    "B: the closeout entry posts the residual as production_scrap (§6.4)");
  orderB = land(orderB, qtyEvent("closeout", 0, poolB, ceB), ceB);
  orderB = { ...orderB, status: production.producedQty(orderB) > 0 ? "completed" : "cancelled" };
  check(production.poolOf(orderB) === 0 && orderB.status === "cancelled" && eq(glWip(), 0),
    "B: closing a never-produced order lands it cancelled with its pool fully written off");
  check(eq(ledger.accountBalance(j, "inventory_loss"), 4200),
    "B: inventory_loss now carries scrap (700) + closeout (3,500)");

  /* ---- Scenario C: over-production spreads the whole pool ---- */
  let orderC = mkOrder("ord-c", "PR-3", 10);
  const prepC = production.prepareIssue(orderC, products, levels, whs, accounts, {
    runQty: 10, lines: [{ productId: "flour", qty: 10 }],
    labourCost: 0, overheadCost: 0, settlement: "paid", paidFromAccountId: till.id,
  });
  check("prepared" in prepC && eq(prepC.prepared.event.value, 1000) &&
        prepC.prepared.event.paidFromAccountId === null && prepC.prepared.entry.lines.length === 2,
    "C: zero conversion cost ⇒ no settlement line at all and a null event stamp");
  orderC = land(orderC, prepC.prepared.event, prepC.prepared.entry);
  const cC = production.completionAbsorb(orderC, 15, false);
  check("value" in cC && eq(cC.value, 1000) && eq(cC.unitCost, 66.67),
    "C: completing beyond plan is a final completion — the whole pool (1,000) spreads over all 15 units (66.67)");
  const ceC = production.buildCompletionEntry(orderC, 15, cC.value);
  orderC = land(orderC, qtyEvent("completion", 15, cC.value, ceC), ceC, { unitCost: cC.unitCost });
  check(production.producedQty(orderC) === 15 && production.poolOf(orderC) === 0 && orderC.status === "completed" && eq(glWip(), 0),
    "C: over-production completes with pool exactly 0");

  /* ---- Scenario D: closeout residual after partial production ---- */
  let orderD = mkOrder("ord-d", "PR-4", 10);
  const prepD = production.prepareIssue(orderD, products, levels, whs, accounts, {
    runQty: 10,
    lines: [{ productId: "sugar", qty: 20 }, { productId: "bottle", qty: 10 }],
    labourCost: 0, overheadCost: 0, settlement: "paid", paidFromAccountId: null,
  });
  check("prepared" in prepD && eq(prepD.prepared.event.value, 1200), "D: the issue prepares at 1,200");
  orderD = land(orderD, prepD.prepared.event, prepD.prepared.entry);
  const cD = production.completionAbsorb(orderD, 4, false);
  check("value" in cD && eq(cD.value, 480), "D: partial completion absorbs 1,200 × 4/10 = 480");
  const ceD = production.buildCompletionEntry(orderD, 4, cD.value);
  orderD = land(orderD, qtyEvent("completion", 4, cD.value, ceD), ceD, { unitCost: cD.unitCost });
  const poolD = production.poolOf(orderD);
  check(eq(poolD, 720), "D: the residual pool before close is exactly 720");
  const ceoD = production.buildScrapEntry(orderD, 0, poolD, "closeout");
  orderD = land(orderD, qtyEvent("closeout", 0, poolD, ceoD), ceoD);
  orderD = { ...orderD, status: production.producedQty(orderD) > 0 ? "completed" : "cancelled" };
  check(production.poolOf(orderD) === 0 && orderD.status === "completed" &&
        eq(ledger.accountBalance(j, "inventory_loss"), 4920) && eq(glWip(), 0),
    "D: close-out posts the residual to inventory_loss EXACTLY (720) and the half-produced order lands completed");
  check(driftSilent(), "D: the §1.3 quantity identity held through every scenario (Σ rows == stockQty per product)");

  /* ---- Scenario E: the paisa discipline (F-3's third appearance) ---- */
  {
    const eProducts = [{ id: "sugar-e", name: "Sugar", stockClass: "raw", costPrice: 50, stockQty: 10 }];
    const eLevels = stock.stockV1Rows(eProducts, []);
    let orderE = {
      ...mkOrder("ord-e", "PR-5", 3),
      bomSnapshot: { outputQty: 3, lines: [{ productId: "sugar-e", name: "Sugar", qty: 2 }], labourCost: 0, overheadCost: 0 },
    };
    const prepE = production.prepareIssue(orderE, eProducts, eLevels, whs, [], {
      runQty: 3, lines: [{ productId: "sugar-e", qty: 2 }],
      labourCost: 0, overheadCost: 0, settlement: "paid", paidFromAccountId: null,
    });
    check("prepared" in prepE && eq(prepE.prepared.event.value, 100),
      "E: the paisa fixture issues a pool of exactly 100 against a plan of 3");
    orderE = { ...orderE, events: [...orderE.events, prepE.prepared.event] };
    const v1 = production.completionAbsorb(orderE, 1, false);
    check("value" in v1 && eq(v1.value, 33.33), "E: completion 1 of 3 absorbs round2(100/3) = 33.33");
    orderE = { ...orderE, events: [...orderE.events, { kind: "completion", qty: 1, value: v1.value, entryId: "j-e1", dayOffset: 0, ts: "" }] };
    const v2 = production.completionAbsorb(orderE, 1, false);
    check("value" in v2 && eq(v2.value, 33.34), "E: completion 2 absorbs round2(66.67/2) = 33.34 (cumulative average, not a fresh third)");
    orderE = { ...orderE, events: [...orderE.events, { kind: "completion", qty: 1, value: v2.value, entryId: "j-e2", dayOffset: 0, ts: "" }] };
    const v3 = production.completionAbsorb(orderE, 1, false);
    check("value" in v3 && eq(v3.value, 33.33) && production.poolOf(orderE) > 0,
      "E: the last unit is a final completion — it takes the whole remainder (33.33)");
    orderE = { ...orderE, events: [...orderE.events, { kind: "completion", qty: 1, value: v3.value, entryId: "j-e3", dayOffset: 0, ts: "" }] };
    check(production.poolOf(orderE) === 0 && eq(production.completedValue(orderE), 100),
      "E: Σ completions == the issue to the paisa (33.33 + 33.34 + 33.33 == 100) — no residue strands in WIP");
  }

  /* ---- refusals: everything fails BEFORE composition ---- */
  const draftOrder = mkOrder("ord-f", null, 10, "draft");
  check(production.completionAbsorb(draftOrder, 1, false).problem === "not_open",
    "refusal: a draft order completes nothing (it has issued nothing)");
  const freshOpen = mkOrder("ord-g", "PR-9", 10);
  check(production.completionAbsorb(freshOpen, 1, false).problem === "empty_pool",
    "refusal: completion with an empty pool — the units' materials were never issued (§4.2)");
  check(production.scrapAbsorb(freshOpen, 1).problem === "empty_pool",
    "refusal: scrap with an empty pool");
  check(production.completionAbsorb(orderA, 1, false).problem === "not_open",
    "refusal: a completed order takes no further events");
  const rClosed = production.prepareIssue(orderA, products, levels, whs, accounts, inA);
  check("problem" in rClosed && rClosed.problem === "not_open",
    "refusal: no issue against a completed order");
  check(production.scrapAbsorb(orderD, 1).problem === "not_open",
    "refusal: a closed-out (completed) order takes no further events — its pool already left WIP exactly");
  {
    // Per-warehouse discipline (§4.5): the stock exists, but at
    // the OTHER warehouse.
    const cocoaProducts = [{ id: "cocoa", name: "Cocoa powder", stockClass: "raw", costPrice: 80, stockQty: 12 }];
    const cocoaLevels = [stock.makeLevel(GODOWN, "cocoa", 12)];
    const cocoaOrder = {
      ...mkOrder("ord-h", "PR-10", 5),
      bomSnapshot: { outputQty: 5, lines: [{ productId: "cocoa", name: "Cocoa powder", qty: 6 }], labourCost: 0, overheadCost: 0 },
    };
    const cocoaInput = {
      runQty: 5, lines: [{ productId: "cocoa", qty: 6 }],
      labourCost: 0, overheadCost: 0, settlement: "paid", paidFromAccountId: null,
    };
    const rIns = production.prepareIssue(cocoaOrder, cocoaProducts, cocoaLevels, whs, accounts, cocoaInput);
    check("problem" in rIns && rIns.problem === "insufficient" && rIns.productId === "cocoa",
      "refusal: insufficient stock AT THE ORDER'S WAREHOUSE refuses the issue — another warehouse's rows are never silently reached for");
    const rOk = production.prepareIssue({ ...cocoaOrder, warehouseId: GODOWN }, cocoaProducts, cocoaLevels, whs, accounts, cocoaInput);
    check("prepared" in rOk, "the same issue prepares at the warehouse that actually holds the stock");
    const rOver = production.prepareIssue({ ...cocoaOrder, warehouseId: GODOWN }, cocoaProducts, cocoaLevels, whs, accounts,
      { ...cocoaInput, lines: [{ productId: "cocoa", qty: 13 }] });
    check("problem" in rOver && rOver.problem === "insufficient",
      "refusal: issuing more than the row holds refuses whole");
  }
  {
    const freeProducts = [{ id: "freebie", name: "Free sample sachet", stockClass: null, costPrice: 0, stockQty: 10 }];
    const freeLevels = stock.stockV1Rows(freeProducts, []);
    const freeOrder = {
      ...mkOrder("ord-i", "PR-11", 5),
      bomSnapshot: { outputQty: 5, lines: [{ productId: "freebie", name: "Free sample sachet", qty: 2 }], labourCost: 0, overheadCost: 0 },
    };
    const rZero = production.prepareIssue(freeOrder, freeProducts, freeLevels, whs, accounts, {
      runQty: 5, lines: [{ productId: "freebie", qty: 2 }],
      labourCost: 0, overheadCost: 0, settlement: "paid", paidFromAccountId: null,
    });
    check("problem" in rZero && rZero.problem === "zero_value",
      "refusal: an issue that would move no value at all posts nothing (zero-cost components, no conversion)");
    const rNoAcct = production.prepareIssue(freeOrder, freeProducts, freeLevels, whs, [], {
      runQty: 5, lines: [{ productId: "freebie", qty: 2 }],
      labourCost: 100, overheadCost: 0, settlement: "paid", paidFromAccountId: null,
    });
    check("problem" in rNoAcct && rNoAcct.problem === "no_account",
      "refusal: a paid settlement with no money account in the shop refuses");
    const rMerged = production.prepareIssue(freeOrder, freeProducts, freeLevels, whs, accounts, {
      runQty: 5, lines: [{ productId: "freebie", qty: 1 }, { productId: "freebie", qty: 1 }],
      labourCost: 10, overheadCost: 0, settlement: "accrue", paidFromAccountId: null,
    });
    check("prepared" in rMerged && rMerged.prepared.lines.length === 1 && rMerged.prepared.lines[0].qty === 2,
      "composition: duplicate picks of one component merge into a single valued line");
  }

  /* ---- numbering: the PR- series (§6.3) ---- */
  check(docs.nextDocNumber("productionOrder", [null, "PR-1", "PR-2"], null) === "PR-3",
    "numbering: PR- mints max+1 over the collection; drafts (null numbers) burn nothing");
  check(docs.nextDocNumber("productionOrder", ["PR-7"], { docSeries: { productionOrder: "MO-" } }) === "MO-8",
    "numbering: the owner's prefix override applies to future mints, sequence read prefix-agnostically");
  check(docs.SERIES_DEFAULT_PREFIX.productionOrder === "PR-",
    "numbering: the design default prefix is PR-");

  /* ---- the demo seed draft (§10.3) + the frozen ground ---- */
  const seedProductsC4 = seed.getSeedProducts();
  const seedOrders = seed.getSeedProductionOrders(
    seedProductsC4, seed.getSeedBoms(seedProductsC4));
  check(seedOrders.length === 1 && seedOrders[0].status === "draft" && seedOrders[0].number === null &&
        seedOrders[0].events.length === 0 && seedOrders[0].plannedQty === 10 &&
        seedOrders[0].warehouseId === MAIN && seedOrders[0].bomSnapshot.outputQty === 5,
    "seed: exactly ONE draft production order against the demo BOM (two batches planned), unnumbered, no events");
  check(production.poolOf(seedOrders[0]) === 0 && production.producedQty(seedOrders[0]) === 0,
    "seed: the draft carries no pool and no production — zero journal footprint");
  check(journal.length === 21, "frozen: the seed journal still has its 21 entries");
  const normalizedC4 = journal.map((e) => { const { ts, ...rest } = e; return rest; });
  const shaC4 = crypto.createHash("sha256").update(JSON.stringify(normalizedC4), "utf8").digest("hex");
  check(shaC4 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "frozen: seed journal SHA unchanged (e17e5bda…1168)");
  check(eq(ledger.accountBalance(journal, "inventory"), 272805) && eq(ledger.accountBalance(journal, "cash"), 50000) &&
        eq(ledger.accountBalance(journal, "wip"), 0) && eq(ledger.accountBalance(journal, "salary_payable"), 0),
    "frozen: seed identities hold — Inventory 272,805 · Cash 50,000 · wip and salary_payable still zero on the seed");

  /* ---- RBAC: the manufacturing row (§6.1) ---- */
  check(perm.can("owner", "manufacturing", "write") && perm.can("manager", "manufacturing", "write") &&
        !perm.can("cashier", "manufacturing", "view") &&
        perm.can("accountant", "manufacturing", "view") && !perm.can("accountant", "manufacturing", "write"),
    "RBAC: production rides the manufacturing row — owner/manager run it, accountant reads, cashier never reaches the surface");

  /* ---- i18n parity for the C4 strings ---- */
  const c4Keys = Object.keys(i18n.en).filter((k) => /^mfg\.(po|issue|complete|scrap|close|ev|print)\./.test(k));
  check(c4Keys.length === 86, `i18n: the C4 production keys number ${c4Keys.length} (86 expected)`);
  check(c4Keys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0) &&
        typeof i18n.en["settings.series.productionOrder"] === "string" &&
        typeof i18n.ur["settings.series.productionOrder"] === "string" &&
        i18n.ur["settings.series.productionOrder"].length > 0,
    "i18n: every C4 key present and non-empty in Urdu (parity), incl. the numbering-settings label");

  /* ---- source invariants: the store + surface wiring ---- */
  const storeSrcC4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcC4.includes('"productionOrders"') && storeSrcC4.includes('"dukaan-ai-store-v14"') &&
        storeSrcC4.includes("prepareIssue") && storeSrcC4.includes("commitProductionEvent") &&
        storeSrcC4.includes("sub<ProductionOrder>") && storeSrcC4.includes("sub<Bom>"),
    "source: the collection, the v14 demo bump, the event writer and BOTH live subscriptions (incl. the C3 boms-subscription repair) are wired into the store");
  check((storeSrcC4.match(/makeEntry\(/g) || []).length === 24,
    "source: still 24 makeEntry calls in the store — production entries compose in lib/production, no new inline posting path");
  check(!storeSrcC4.includes('account: "wip"'),
    "source: no production journal template is inlined in the store");
  const mfgViewSrcC4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/ManufacturingView.tsx", "utf8");
  const sectionSrcC4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/ProductionSection.tsx", "utf8");
  const sheetSrcC4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/DocPrintSheet.tsx", "utf8");
  check(mfgViewSrcC4.includes("ProductionSection") &&
        sectionSrcC4.includes('can(role, "manufacturing", "write")') &&
        sectionSrcC4.includes("completionAbsorb") && sectionSrcC4.includes("prepareIssue") &&
        sheetSrcC4.includes("export function ProductionPrintSheet"),
    "source: the production section + its print sheet ship on the manufacturing surface; desk previews compose through lib/production");

  /* ---- rules: additive productionOrders block only ---- */
  const rulesC4 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const c4Seg = rulesC4.slice(
    rulesC4.indexOf("      // Phase C · C4"),
    rulesC4.indexOf("      // Phase C · C5"));
  check(c4Seg.includes("match /productionOrders/{orderId}") &&
        c4Seg.includes("allow read: if canAccess(uid);") &&
        c4Seg.includes("hasRole(uid, ['owner', 'manager'])"),
    "rules: productionOrders block — read canAccess, write owner/manager (design §6.2)");
  check(!c4Seg.includes("createInOpenPeriod"),
    "rules: NO period backstop on the order doc — its events' entries are guarded creates at the journal (§6.2)");
  const strippedC4 = rulesC4.slice(0, rulesC4.indexOf("      // Phase C · C4")) +
    rulesC4.slice(rulesC4.indexOf("      // Expenses:"));
  check(crypto.createHash("sha256").update(strippedC4, "utf8").digest("hex") ===
        "a8decf0291e8ca9a2939a8542f995848c8957891ae5c366063ec258ca6cf9f86",
    "rules: stripping the C4 block reproduces the pre-C4 file byte-for-byte (additive only)");
}

/* =============================== C5 =============================== */
suite("C5", null); // Phase C · C5 — job tracker (design §5)
{
  const MAIN = "wh-main";
  const whs = seed.getSeedWarehouses();
  const dLine = (e, account, ref) =>
    e.lines.find((l) => l.account === account && l.debit > 0 && (ref === undefined || l.ref === ref));
  const cLine = (e, account, ref) =>
    e.lines.find((l) => l.account === account && l.credit > 0 && (ref === undefined || l.ref === ref));
  const mkJob = (patch = {}) => ({
    id: "job-1", number: "JB-1",
    customerId: "cu-x", customerName: "Ahmed Raza", customerPhone: "0300-111",
    title: "Wedding cards × 500", description: "",
    stage: "In Progress", status: "in_progress",
    dueDateISO: null, warehouseId: MAIN,
    materialEvents: [], labourCost: 0, note: "",
    dayOffset: 0, ts: "2026-01-01T00:00:00.000Z",
    ...patch,
  });

  /* ---- (a) stages: defaults, custom lists, the lifecycle ---- */
  check(JSON.stringify(jobs.effectiveJobStages(null)) ===
        JSON.stringify(["Received", "In Progress", "Ready", "Delivered"]),
    "stages: an absent settings list falls back to the four default stages");
  check(JSON.stringify(jobs.effectiveJobStages({ jobStages: [] })) ===
        JSON.stringify([...jobs.DEFAULT_JOB_STAGES]),
    "stages: an empty settings list also falls back to the defaults");
  check(JSON.stringify(jobs.effectiveJobStages({ jobStages: [" Intake ", "", "Intake", "Paint", " Paint "] })) ===
        JSON.stringify(["Intake", "Paint"]),
    "stages: the owner's list is trimmed, blanks dropped, duplicates collapsed (first wins)");
  const stages = jobs.effectiveJobStages(null);
  check(jobs.deriveJobStatus(mkJob({ stage: "Received", status: "open" }), stages) === "open",
    "lifecycle: the FIRST stage reads open");
  check(jobs.deriveJobStatus(mkJob({ stage: "In Progress", status: "open" }), stages) === "in_progress",
    "lifecycle: a middle stage reads in_progress");
  check(jobs.deriveJobStatus(mkJob({ stage: "Delivered", status: "in_progress" }), stages) === "ready",
    "lifecycle: the LAST stage reads ready (the delivered STATUS is set only by Deliver or a citing bill, §5.2/§5.4)");
  check(jobs.deriveJobStatus(mkJob({ stage: "Received", status: "delivered" }), stages) === "delivered" &&
        jobs.deriveJobStatus(mkJob({ stage: "In Progress", status: "cancelled" }), stages) === "cancelled",
    "lifecycle: delivered and cancelled are sticky — stage movement never resurrects them");
  check(jobs.jobStageIndex(mkJob({ stage: "Painting" }), stages) === -1 &&
        jobs.deriveJobStatus(mkJob({ stage: "Painting", status: "open" }), stages) === "open",
    "lifecycle: a renamed-away stage keeps the job open while nothing has happened on it");
  check(jobs.deriveJobStatus(
          mkJob({ stage: "Painting", status: "open",
                  materialEvents: [{ kind: "issue", productId: "p", name: "P", qty: 1, unitCost: 1, value: 1, entryId: "e", dayOffset: 0, ts: "2026-01-01T00:00:00.000Z" }] }),
          stages) === "in_progress",
    "lifecycle: a renamed-away stage WITH material events reads in_progress — the job has visibly started");

  /* ---- numbering: JB- born numbered (§5.1/§6.3) ---- */
  check(docs.SERIES_DEFAULT_PREFIX.job === "JB-",
    "numbering: the design default prefix is JB-");
  check(docs.nextDocNumber("job", [], null) === "JB-1",
    "numbering: the FIRST job mints JB-1 at creation — there is no draft state to defer it");
  check(docs.nextDocNumber("job", ["JB-1", "JB-2"], null) === "JB-3" &&
        docs.nextDocNumber("job", ["WO-4"], { docSeries: { job: "WO-" } }) === "WO-5",
    "numbering: max+1 over the collection; the owner's prefix override applies, sequence read prefix-agnostically");

  /* ---- (c) materials: issue/return through the real compositions ---- */
  const products = [
    { id: "paper", name: "Paper (ream)", stockClass: "raw", costPrice: 40, stockQty: 100 },
    { id: "ink", name: "Gold ink pot", stockClass: null, costPrice: 250, stockQty: 20 },
    { id: "sticker", name: "Seal sticker", stockClass: null, costPrice: 0, stockQty: 50 },
  ];
  let levels = stock.stockV1Rows(products, []);
  const j = [];
  const prod = (id) => products.find((p) => p.id === id);
  const driftSilent = () => stock.stockDrift(products, levels, []).length === 0;
  let job = mkJob();
  /* Land an event exactly as the store's demo path does
   * (commitJobMaterialEvent): entry appended, events appended,
   * the job warehouse's rows and the product totals moved by
   * the signed quantities. */
  const land = (jobIn, prepared, kind) => {
    j.push(prepared.entry);
    for (const l of prepared.lines) {
      const sign = kind === "issue" ? -1 : 1;
      prod(l.productId).stockQty += sign * l.qty;
      levels = stock.applyLevelDelta(levels, jobIn.warehouseId, l.productId, sign * l.qty);
    }
    return { ...jobIn, materialEvents: [...jobIn.materialEvents, ...prepared.events] };
  };

  const merged = jobs.prepareMaterialEvent(job, products, levels, whs, "issue",
    [{ productId: "paper", qty: 2 }, { productId: "paper", qty: 3 }]);
  check("prepared" in merged && merged.prepared.lines.length === 1 &&
        merged.prepared.lines[0].qty === 5 && eq(merged.prepared.value, 200),
    "materials: duplicate picks of one product merge into a single valued line (5 × 40 = 200)");

  const issue = jobs.prepareMaterialEvent(job, products, levels, whs, "issue",
    [{ productId: "paper", qty: 10 }, { productId: "ink", qty: 2 }]);
  check("prepared" in issue, "materials: the mixed-class issue prepares (raw paper + goods ink)");
  const PI = issue.prepared;
  check(eq(PI.value, 900), "materials: valued at shelf cost — paper 10 × 40 + ink 2 × 250 = 900");
  check(PI.entry.refType === "job_material" && PI.entry.refId === "job-1" && ledger.entryBalances(PI.entry),
    "materials: the issue is ONE balanced entry, refType job_material, refId the job");
  check(eq(dLine(PI.entry, "cogs", "job-1")?.debit, 900),
    "materials §5.3: Dr cogs (ref: job) carries the whole event — NO job WIP account is touched (§12.3)");
  check(eq(cLine(PI.entry, "inventory_raw", "paper")?.credit, 400) &&
        eq(cLine(PI.entry, "inventory", "ink")?.credit, 500),
    "materials §5.3: each component credits ITS class account (raw → inventory_raw, goods → inventory), ref'd to the product");
  check(PI.events.length === 2 && PI.events.every((e) => e.entryId === PI.entry.id),
    "materials: one event record per product, every one citing the ONE entry that posted it");
  job = land(job, PI, "issue");
  check(prod("paper").stockQty === 90 && stock.rowQtyOf(levels, MAIN, "paper") === 90 &&
        prod("ink").stockQty === 18 && stock.rowQtyOf(levels, MAIN, "ink") === 18 && driftSilent(),
    "materials: totals and the job warehouse's rows drop together (§1.3 identity holds)");
  check(eq(ledger.accountBalance(j, "cogs"), 900) && eq(ledger.accountBalance(j, "inventory_raw"), -400) &&
        eq(ledger.accountBalance(j, "inventory"), -500),
    "materials: GL — cogs 900, inventory_raw −400, inventory −500 after the issue");
  check(eq(jobs.jobMaterialsIssuedValue(job), 900) && jobs.jobMaterialNetQty(job, "ink") === 2,
    "materials: the selectors read the event log (issued 900; the job holds 2 ink)");

  const rIns = jobs.prepareMaterialEvent(job, products, levels, whs, "issue", [{ productId: "paper", qty: 1000 }]);
  check("problem" in rIns && rIns.problem === "insufficient" && rIns.productId === "paper",
    "refusal: an issue beyond the JOB warehouse's row refuses pre-composition (another warehouse is never reached for)");
  const rZero = jobs.prepareMaterialEvent(job, products, levels, whs, "issue", [{ productId: "sticker", qty: 5 }]);
  check("problem" in rZero && rZero.problem === "zero_value",
    "refusal: a zero-cost issue would move no value — nothing to post");
  const rEmpty = jobs.prepareMaterialEvent(job, products, levels, whs, "issue", []);
  const rUnknown = jobs.prepareMaterialEvent(job, products, levels, whs, "issue", [{ productId: "nope", qty: 1 }]);
  const rBadQty = jobs.prepareMaterialEvent(job, products, levels, whs, "issue", [{ productId: "paper", qty: 0 }]);
  check("problem" in rEmpty && rEmpty.problem === "empty_lines" &&
        "problem" in rUnknown && rUnknown.problem === "unknown_product" &&
        "problem" in rBadQty && rBadQty.problem === "bad_qty",
    "refusal: empty picks / unknown product / non-positive qty all refuse pre-composition");

  const ret = jobs.prepareMaterialEvent(job, products, levels, whs, "return", [{ productId: "ink", qty: 1 }]);
  check("prepared" in ret, "materials: the partial return prepares");
  const PR = ret.prepared;
  check(PR.entry.refType === "job_material_return" && eq(dLine(PR.entry, "inventory", "ink")?.debit, 250) &&
        eq(cLine(PR.entry, "cogs", "job-1")?.credit, 250) && ledger.entryBalances(PR.entry),
    "materials §5.3: the return is the exact mirror — Dr the class account / Cr cogs, refType job_material_return");
  job = land(job, PR, "return");
  check(eq(ledger.accountBalance(j, "cogs"), 650) && eq(jobs.jobMaterialsCost(job), 650) &&
        jobs.jobMaterialNetQty(job, "ink") === 1 && stock.rowQtyOf(levels, MAIN, "ink") === 19 && driftSilent(),
    "materials: after the return, GL cogs == the job's materials cost == 650 to the paisa; the row restores");
  const rOver = jobs.prepareMaterialEvent(job, products, levels, whs, "return", [{ productId: "ink", qty: 2 }]);
  check("problem" in rOver && rOver.problem === "over_return",
    "refusal: returning more than the job still holds refuses (it holds 1 ink)");
  const rDead = jobs.prepareMaterialEvent({ ...job, status: "delivered" }, products, levels, whs, "issue",
    [{ productId: "paper", qty: 1 }]);
  check("problem" in rDead && rDead.problem === "not_active",
    "refusal: a delivered job takes no material events");

  /* ---- (b) advances: the pooled repayment identity (§5.3, Q2) ---- */
  const till = accounts.find((a) => a.legacyFor === "cash");
  const cust = { customerId: "cu-x", customerName: "Ahmed Raza", customerPhone: "0300-111" };
  check(jobs.advanceNoteFor({ number: "JB-1" }) === "Advance — Job JB-1",
    "advance: the citation is the note on an ordinary repayment row — the ONLY job trace (no job field stores money)");
  const ADV = 2000;
  const advRow = {
    id: "cr-adv-1", ...cust, kind: "repayment", amount: ADV, method: "cash",
    accountId: till.id, note: jobs.advanceNoteFor({ number: "JB-1" }),
    billId: null, dayOffset: 0, ts: "2026-01-01T00:00:00.000Z",
  };
  // Composed EXACTLY as the store's addRepayment composes it
  // (StoreProvider): memo, refType "repayment", refId the row,
  // Dr accountForMethod ref'd to the resolved account /
  // Cr receivables ref'd to the customer.
  const advEntry = ledger.makeEntry(`Udhaar repayment — ${cust.customerName}`, "repayment", advRow.id, [
    { account: ledger.accountForMethod("cash"), debit: ADV, credit: 0, ref: advRow.accountId },
    { account: "receivables", debit: 0, credit: ADV, ref: cust.customerId },
  ]);
  const plainEntry = ledger.makeEntry(`Udhaar repayment — ${cust.customerName}`, "repayment", "cr-plain-1", [
    { account: ledger.accountForMethod("cash"), debit: ADV, credit: 0, ref: till.id },
    { account: "receivables", debit: 0, credit: ADV, ref: cust.customerId },
  ]);
  check(advEntry.memo === plainEntry.memo && advEntry.refType === plainEntry.refType &&
        JSON.stringify(advEntry.lines) === JSON.stringify(plainEntry.lines),
    "advance: the entry is a plain repayment's entry — identical memo, refType and lines (modulo the row id it cites)");
  check(!JSON.stringify(advEntry).includes("JB-1") && !JSON.stringify(advEntry).includes("job"),
    "advance: the journal entry carries NO job reference at all — the job lives only in the row's note");
  const jB = [advEntry];
  const creditsB = [advRow];
  check(jB.length === 1 && ledger.entryBalances(jB[0]),
    "advance: the journal diff of recording a job advance is EXACTLY ONE balanced repayment entry");
  check(eq(ledger.customerOutstanding(creditsB, "cu-x"), -ADV) &&
        eq(ledger.accountBalance(jB, "receivables"), -ADV),
    "advance: the customer's pool goes negative by the advance (−2,000) — subledger and GL agree");
  check(eq(jobs.jobAdvanceTotal(mkJob(), creditsB), ADV) && jobs.jobAdvanceRows(mkJob(), creditsB).length === 1,
    "advance: the job surface reads its advances back by the citing note (total 2,000)");
  // The job's bill posts on credit: the F-6 lot absorbs the pool.
  const jobBill = {
    id: "bill-job-1", billNo: 101, ...cust,
    sourceType: "job", sourceId: "job-1", status: "paid", total: 5000,
    items: [{ productId: "card", name: "Wedding cards", qty: 1, unitPrice: 5000, unitCost: 0, total: 5000 }],
    ts: "2026-01-03T00:00:00.000Z",
  };
  creditsB.push({
    id: "cr-bill-1", ...cust, kind: "credit", amount: 5000,
    note: "", billId: "bill-job-1", dayOffset: 0, ts: "2026-01-03T00:00:00.000Z",
  });
  const pos = ledger.billCreditOutstanding(creditsB, jobBill);
  check(eq(pos.repaidAllocated, ADV) && eq(pos.outstanding, 3000),
    "advance §5.3: the citing bill's F-6 lot absorbs the pooled advance (allocated 2,000 of 5,000; 3,000 genuinely owed)");
  check(eq(ledger.customerOutstanding(creditsB, "cu-x"), 3000),
    "advance: after the bill, the customer owes total − advance (5,000 − 2,000 = 3,000) — the pool did the settling");

  /* ---- (d)+(e) revenue citation discipline + the §5.5 profit ---- */
  const evP = (kind, qty, value) => ({
    kind, productId: "paper", name: "Paper (ream)", qty, unitCost: 40, value,
    entryId: "e-p", dayOffset: 0, ts: "2026-01-01T00:00:00.000Z",
  });
  const jobP = mkJob({
    id: "job-p", number: "JB-7", labourCost: 500,
    materialEvents: [evP("issue", 10, 400), evP("return", 2, 80)],
  });
  const billP = (patch) => ({
    id: "b-p1", billNo: 201, customerId: "cu-x", customerName: "Ahmed Raza", customerPhone: "0300-111",
    sourceType: "job", sourceId: "job-p", status: "paid", total: 3000,
    items: [{ productId: "card", name: "Wedding cards", qty: 1, unitPrice: 3000, unitCost: 700, total: 3000 }],
    ts: "2026-01-04T00:00:00.000Z", ...patch,
  });
  const billsP = [
    billP({}),
    billP({ id: "b-p2", billNo: 202, status: "held", total: 9999 }),
    billP({ id: "b-p3", billNo: 203, status: "voided", total: 7777 }),
    billP({ id: "b-p4", billNo: 204, sourceType: null, sourceId: null, total: 8888 }),
    billP({ id: "b-p5", billNo: 205, sourceId: "job-other", total: 6666 }),
  ];
  check(jobs.jobBills(jobP, billsP).length === 1 && jobs.jobBills(jobP, billsP)[0].id === "b-p1",
    "revenue: only the POSTED bill CITING this job counts — held and voided citing bills, a direct bill and another job's bill all contribute nothing");
  check(eq(jobs.jobRevenue(jobP, billsP), 3000) && eq(jobs.jobBillCogs(jobP, billsP), 700),
    "profit §5.5: revenue 3,000 from the citing bill; its OWN lines' COGS 700 from their unitCost snapshots");
  const figsP = jobs.jobProfitFigures(jobP, billsP);
  check(eq(figsP.materials, 320) && eq(figsP.labour, 500) &&
        eq(figsP.profit, 1480),
    "profit §5.5 hand-computed: 3,000 revenue − 320 materials (400 issued − 80 returned) − 700 bill COGS − 500 labour = 1,480");
  const jobNB = mkJob({ id: "job-nb", number: "JB-8", labourCost: 500,
                        materialEvents: [evP("issue", 10, 400), evP("return", 2, 80)] });
  const figsNB = jobs.jobProfitFigures(jobNB, billsP);
  check(eq(figsNB.revenue, 0) && eq(figsNB.profit, -820),
    "profit §5.5: an unbilled job reports revenue 0 and profit == −(materials + labour) = −820 — costs are real before any bill exists");

  /* ---- (f) the demo seed job (§10.3) + the frozen ground ---- */
  const seedJobs = seed.getSeedJobs(customers);
  check(seedJobs.length === 1 && seedJobs[0].number === "JB-1" && seedJobs[0].status === "open" &&
        seedJobs[0].stage === "Received" && seedJobs[0].materialEvents.length === 0 &&
        seedJobs[0].labourCost === 0 && seedJobs[0].warehouseId === MAIN &&
        seedJobs[0].customerId === customers[0].id,
    "seed: exactly ONE open job at the first stage (JB-1, the seed's first customer, no events, no labour)");
  check(eq(jobs.jobAdvanceTotal(seedJobs[0], credits), 0) &&
        eq(jobs.jobProfitFigures(seedJobs[0], []).profit, 0),
    "seed: the demo job has no advance and no figures — zero journal footprint");
  check(journal.length === 21, "frozen: the seed journal still has its 21 entries");
  const normalizedC5 = journal.map((e) => { const { ts, ...rest } = e; return rest; });
  const shaC5 = crypto.createHash("sha256").update(JSON.stringify(normalizedC5), "utf8").digest("hex");
  check(shaC5 === "e17e5bda19e87de698b0c0a37e923f9b396bc387e2092b2ffbbd7d60d4971168",
    "frozen: seed journal SHA unchanged (e17e5bda…1168)");
  check(eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.accountBalance(journal, "cash"), 50000) &&
        eq(sum(coa.ACCOUNT_CODES.map((c) => ledger.accountBalance(journal, c))), 0),
    "frozen: seed identities hold — Inventory 272,805 · Cash 50,000 · trial balance 0");

  /* ---- (g) RBAC: the jobTracker row AS DECLARED (§5.6/G-C4) ---- */
  check(perm.can("owner", "jobTracker", "write") && perm.can("manager", "jobTracker", "write"),
    "RBAC: owner/manager run the job tracker (the row as pre-declared, unchanged)");
  check(perm.can("cashier", "jobTracker", "view") && !perm.can("cashier", "jobTracker", "write"),
    "RBAC: the cashier READS jobs but never writes — the matrix row stands exactly as declared (G-C4)");
  check(perm.can("accountant", "jobTracker", "view") && !perm.can("accountant", "jobTracker", "write"),
    "RBAC: the accountant reads jobs, writes nothing (F/F/R/R)");

  /* ---- (h) i18n parity for the C5 strings ---- */
  const jobKeys = Object.keys(i18n.en).filter((k) => k.startsWith("job.") || k === "nav.jobs");
  check(jobKeys.length === 118, `i18n: the C5 job keys number ${jobKeys.length} (118 expected, incl. nav.jobs)`);
  check(jobKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0) &&
        typeof i18n.en["settings.series.job"] === "string" &&
        typeof i18n.ur["settings.series.job"] === "string" &&
        i18n.ur["settings.series.job"].length > 0,
    "i18n: every C5 key present and non-empty in Urdu (parity), incl. the numbering-settings label");

  /* ---- (i) source invariants: the store + surface wiring ---- */
  const storeSrcC5 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcC5.includes('"jobs"') && storeSrcC5.includes('"dukaan-ai-store-v15"') &&
        storeSrcC5.includes("prepareMaterialEvent") && storeSrcC5.includes("commitJobMaterialEvent") &&
        storeSrcC5.includes("sub<Job>"),
    "source: the jobs collection, the v15 demo bump, the pre-composition + event writer and the live subscription are wired into the store");
  check(storeSrcC5.includes("convertJobToBill") && storeSrcC5.includes('sourceType: "job"') &&
        storeSrcC5.includes("statusUpdates.job"),
    "source: the job→bill conversion prefills the desk citing the job, and postBill flips a citing job to delivered in its own batch (§5.4)");
  check((storeSrcC5.match(/makeEntry\(/g) || []).length === 24,
    "source: still 24 makeEntry calls in the store — job entries compose in lib/jobs, no new inline posting path");
  check(!storeSrcC5.includes('"job_material"'),
    "source: the store never names the job refTypes — job entries compose only in lib/jobs (the store's own inline cogs lines belong to postBill's sale template, untouched)");
  const jobsViewSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/JobsView.tsx", "utf8");
  const sheetSrcC5 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/DocPrintSheet.tsx", "utf8");
  const navSrcC5 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/nav.ts", "utf8");
  check(jobsViewSrc.includes("addRepayment") && jobsViewSrc.includes("advanceNoteFor") &&
        jobsViewSrc.includes("prepareMaterialEvent"),
    "source: the job surface records advances through the EXISTING addRepayment machinery with the citing note, and previews materials through lib/jobs");
  check(sheetSrcC5.includes("export function JobPrintSheet") &&
        navSrcC5.includes('href: "/jobs"') &&
        fs.existsSync("/home/hatch/workspace/ai-dukaan-ai/web/app/jobs/page.tsx"),
    "source: the work slip ships on the shared print sheet, the nav carries /jobs, and the route exists");

  /* ---- (j) rules: additive jobs block only ---- */
  const rulesC5 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const c5Seg = rulesC5.slice(
    rulesC5.indexOf("      // Phase C · C5"),
    rulesC5.indexOf("      // Phase D · D1"));
  check(c5Seg.includes("match /jobs/{jobId}") &&
        c5Seg.includes("allow read: if canAccess(uid);") &&
        c5Seg.includes("hasRole(uid, ['owner', 'manager'])"),
    "rules: jobs block — read canAccess, write owner/manager (design §6.2)");
  check(!c5Seg.includes("createInOpenPeriod"),
    "rules: NO period backstop on the job doc — its material entries are guarded creates at the journal (§6.2)");
  const strippedC5 = rulesC5.slice(0, rulesC5.indexOf("      // Phase C · C5")) +
    rulesC5.slice(rulesC5.indexOf("      // Expenses:"));
  check(crypto.createHash("sha256").update(strippedC5, "utf8").digest("hex") ===
        "94077e04a2479bca232a1d7529454a724abff2024044c69c60982a8c9f81b404",
    "rules: stripping the C5 block reproduces the pre-C5 file byte-for-byte (additive only)");
}

/* ============================ FIX (live-audit) ============================ */
suite("FIX", null); // Live-audit fixes — P&L≡sales reconciliation, negative-balance
// warnings, expense-date single-sourcing, journal viewer + trial
// balance, walk-in bill search (owner's live account audit, 2026-10-22)
{
  const FIXFULL = {
    fromDate: "2000-01-01", toDate: "2999-12-31",
    fromTs: "2000-01-01T00:00:00.000Z", toTs: "2999-01-01T00:00:00.000Z",
  };
  const seedSlabs = seed.getSeedTaxSlabs();
  const seedSettings = seed.getSeedSettings();
  const seedCtx = { returns: [], journal, taxSlabs: seedSlabs, settings: seedSettings };

  /* ---- Fix 1a: the seed identity — P&L == sales report ---- */
  const plFull = ledger.profitAndLossInRange(journal, FIXFULL.fromTs, FIXFULL.toTs);
  const seedRep = reports.salesReport(sales, products, [], FIXFULL, seedCtx);
  check(eq(seedRep.netSales, plFull.netRevenue),
    "FIX1 seed: sales-report net == P&L net revenue over the whole seed (the audit's 8,500 gap is 0 on the current construction)");
  check(eq(seedRep.otherRevenue, 0) && eq(seedRep.plNetRevenue, seedRep.netSales),
    "FIX1 seed: reconciling line is 0 — no journal-only revenue in the seed (the F-7 shape is gone from the template)");
  check(eq(seedRep.grossSales, sum(sales.map((s) => s.total))) && eq(seedRep.discounts, 0),
    "FIX1 seed: gross == Σ row totals and discounts 0 (seed bills carry neither discounts nor tax)");

  /* ---- Fix 1b: the Rs 375 counter-sale bucketing case ---- */
  const todayRange = reports.resolveReportRange("today", seedSettings);
  const todayRep = reports.salesReport(sales, products, [], todayRange, seedCtx);
  check(eq(todayRep.netSales, selectors.revenueOnDay(sales, 0)),
    "FIX1 seed: the report's 'today' net == the counter page's today total (revenueOnDay) — one bucketing, by ts, after the re-base");
  check(eq(todayRep.otherRevenue, 0),
    "FIX1 seed: 'today' also reconciles exactly (the day's journal summary is built from the same rows)");
  const row375 = sales.find((s) => s.productId === "p05" && s.total === 375 && s.dayOffset === 9);
  check(!!row375, "FIX1 seed: the audit's Rs 375 counter sale exists (Shan Biryani 3 × 125, dayOffset 9)");
  if (row375) {
    const dayISO = periods.businessDateISO(row375.ts);
    check(dayISO === periods.addDaysISO(periods.todayPktISO(), -9),
      "FIX1 seed construction: the 375 row's ts now falls on its dayOffset day (re-based)");
    const dayRange = reports.resolveReportRange("custom", seedSettings, { from: dayISO, to: dayISO });
    const dayRep = reports.salesReport(sales, products, [], dayRange, seedCtx);
    check(eq(dayRep.netSales, selectors.revenueOnDay(sales, 9)) && eq(dayRep.otherRevenue, 0),
      "FIX1 seed: on the 375 row's own day, report == counter total == journal — all three derivations agree");
  }

  /* ---- Fix 1c: synthetic mixed workload (the posting templates
   * composed verbatim through the REAL makeEntry guard) ---- */
  const inclSlab = { id: "fx-incl", name: "GST Incl", kind: "percent", rate: 25,
    appliesTo: "sales", inclusive: true, isDefault: false, active: true, ts: "2026-10-01T00:00:00.000Z" };
  const fxSlabs = [inclSlab];
  const fxSettings = { defaultSalesTaxSlabId: null, defaultPurchaseTaxSlabId: null };
  const fxProducts = [
    { id: "fx-a", name: "Taxed Tea", urduName: "", sku: "FXA", category: "grocery", unit: "packet", costPrice: 60, salePrice: 125, stockQty: 50, reorderLevel: 5, taxSlabId: "fx-incl" },
    { id: "fx-b", name: "Plain Rice", urduName: "", sku: "FXB", category: "grocery", unit: "kg", costPrice: 40, salePrice: 100, stockQty: 50, reorderLevel: 5 },
  ];
  // Bill 1: discounted, inclusive-taxed, paid Rs 1 short (F-2 rounding).
  const fxTax1 = tax.computeBillTaxes(
    [{ total: 250, qty: 2, slab: inclSlab }, { total: 200, qty: 2, slab: null }], 50);
  const fxBill1 = { id: "fx-b1", billNo: 1, customerId: "fx-c1", customerName: "Ahmed",
    customerPhone: "0300", items: [
      { productId: "fx-a", name: "Taxed Tea", qty: 2, unitPrice: 125, unitCost: 60, total: 250, taxAmount: fxTax1.lines[0].taxAmount, taxInclusive: true },
      { productId: "fx-b", name: "Plain Rice", qty: 2, unitPrice: 100, unitCost: 40, total: 200, taxAmount: 0 },
    ], subtotal: 450, discountType: "flat", discountValue: 50, discountAmount: 50,
    taxAmount: fxTax1.taxAmount, total: fxTax1.total,
    payments: [{ method: "cash", amount: 399, accountId: "acc-till" }],
    status: "paid", dayOffset: 0, ts: "2026-10-10T10:00:00.000Z" };
  const fxE1 = ledger.makeEntry("Bill #1 — Ahmed", "bill", "fx-b1", [
    { account: "cash", debit: 399, credit: 0, ref: "acc-till" },
    { account: "sales_discount", debit: 50 + (fxBill1.total - 399), credit: 0 },
    { account: "cogs", debit: 200, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: tax.round2(450 - fxTax1.inclusiveTax) },
    { account: "tax_payable", debit: 0, credit: fxTax1.taxAmount },
    { account: "inventory", debit: 0, credit: 200 },
  ], { ts: fxBill1.ts });
  // Counter sale of the taxed product (recordSale template).
  const fxCounterTax = tax.computeBillTaxes([{ total: 125, qty: 1, slab: inclSlab }], 0);
  const fxE2 = ledger.makeEntry("Counter sale — Taxed Tea × 1", "sale", "fx-sc", [
    { account: "cash", debit: 125, credit: 0, ref: "acc-till" },
    { account: "cogs", debit: 60, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: tax.round2(125 - fxCounterTax.inclusiveTax) },
    { account: "tax_payable", debit: 0, credit: fxCounterTax.taxAmount },
    { account: "inventory", debit: 0, credit: 60 },
  ], { ts: "2026-10-11T09:00:00.000Z" });
  // Partial return of bill 1 (reverseBillItems template; the tax
  // shares come from the REAL returnTaxShares, the discount share
  // from the store's F-3 cumulative formula).
  const fxRetItems = [{ productId: "fx-a", name: "Taxed Tea", qty: 1, unitPrice: 125,
    unitCost: 60, total: 125, taxAmount: 0, taxInclusive: true }];
  const fxShares = tax.returnTaxShares(fxBill1, [], fxRetItems);
  fxRetItems[0].taxAmount = fxShares.perLine.get("fx-a") ?? 0;
  const fxDiscShare = Math.round((fxBill1.discountAmount * 125) / fxBill1.subtotal);
  const fxRefund = 125 - fxDiscShare + fxShares.exclusiveTaxShare;
  const fxReturn = { id: "fx-r1", billId: "fx-b1", billNo: 1, items: fxRetItems,
    refundAmount: fxRefund, creditReduction: 0, method: "cash", accountId: "acc-till",
    dayOffset: 0, ts: "2026-10-12T09:00:00.000Z" };
  const fxE3 = ledger.makeEntry("Return against Bill #1", "return", "fx-b1", [
    { account: "sales_revenue", debit: tax.round2(125 - fxShares.inclusiveTaxShare), credit: 0 },
    { account: "tax_payable", debit: fxShares.taxShare, credit: 0 },
    { account: "inventory", debit: 60, credit: 0 },
    { account: "sales_discount", debit: 0, credit: fxDiscShare },
    { account: "cash", debit: 0, credit: fxRefund, ref: "acc-till" },
    { account: "cogs", debit: 0, credit: 60 },
  ], { ts: fxReturn.ts });
  // Bill 2 posted, then VOIDED in full (a SaleReturn doc covers it).
  const fxBill2 = { id: "fx-b2", billNo: 2, customerId: null, customerName: "",
    customerPhone: "", items: [
      { productId: "fx-b", name: "Plain Rice", qty: 1, unitPrice: 100, unitCost: 40, total: 100, taxAmount: 0 },
    ], subtotal: 100, discountType: "flat", discountValue: 0, discountAmount: 0,
    taxAmount: 0, total: 100,
    payments: [{ method: "cash", amount: 100, accountId: "acc-till" }],
    status: "voided", dayOffset: 0, ts: "2026-10-13T09:00:00.000Z" };
  const fxE4 = ledger.makeEntry("Bill #2 — Walk-in customer", "bill", "fx-b2", [
    { account: "cash", debit: 100, credit: 0, ref: "acc-till" },
    { account: "cogs", debit: 40, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: 100 },
    { account: "inventory", debit: 0, credit: 40 },
  ], { ts: fxBill2.ts });
  const fxVoid = { id: "fx-r2", billId: "fx-b2", billNo: 2,
    items: [{ productId: "fx-b", name: "Plain Rice", qty: 1, unitPrice: 100, unitCost: 40, total: 100, taxAmount: 0 }],
    refundAmount: 100, creditReduction: 0, method: "cash", accountId: null,
    dayOffset: 0, ts: "2026-10-13T10:00:00.000Z" };
  const fxE5 = ledger.makeEntry("Bill #2 voided", "bill_void", "fx-b2", [
    { account: "sales_revenue", debit: 100, credit: 0 },
    { account: "inventory", debit: 40, credit: 0 },
    { account: "cash", debit: 0, credit: 100, ref: "acc-till" },
    { account: "cogs", debit: 0, credit: 40 },
  ], { ts: fxVoid.ts });
  // A HELD bill: documents only — no rows, no entry, no effect.
  const fxBill3 = { ...fxBill2, id: "fx-b3", billNo: 3, status: "held", ts: "2026-10-13T11:00:00.000Z" };
  const fxBills = [fxBill1, fxBill2, fxBill3];
  const fxReturns = [fxReturn, fxVoid];
  const fxSales = [
    { id: "fx-b1-s0", productId: "fx-a", qty: 2, unitPrice: 125, unitCost: 60, total: 250, billId: "fx-b1", kind: "sale", dayOffset: 0, ts: fxBill1.ts },
    { id: "fx-b1-s1", productId: "fx-b", qty: 2, unitPrice: 100, unitCost: 40, total: 200, billId: "fx-b1", kind: "sale", dayOffset: 0, ts: fxBill1.ts },
    { id: "fx-sc-row", productId: "fx-a", qty: 1, unitPrice: 125, unitCost: 60, total: 125, billId: null, kind: "sale", dayOffset: 0, ts: "2026-10-11T09:00:00.000Z" },
    { id: "fx-b1-r0", productId: "fx-a", qty: -1, unitPrice: 125, unitCost: 60, total: -125, billId: "fx-b1", kind: "return", dayOffset: 0, ts: fxReturn.ts },
    { id: "fx-b2-s0", productId: "fx-b", qty: 1, unitPrice: 100, unitCost: 40, total: 100, billId: "fx-b2", kind: "sale", dayOffset: 0, ts: fxBill2.ts },
    { id: "fx-b2-r0", productId: "fx-b", qty: -1, unitPrice: 100, unitCost: 40, total: -100, billId: "fx-b2", kind: "return", dayOffset: 0, ts: fxVoid.ts },
  ];
  const fxJournal = [fxE1, fxE2, fxE3, fxE4, fxE5];
  const FXOCT = reports.resolveReportRange("custom", null, { from: "2026-10-01", to: "2026-10-31" });
  const fxCtx = { returns: fxReturns, journal: fxJournal, taxSlabs: fxSlabs, settings: fxSettings };
  const fxPl = ledger.profitAndLossInRange(fxJournal, FXOCT.fromTs, FXOCT.toTs);
  const fxRep = reports.salesReport(fxSales, fxProducts, fxBills, FXOCT, fxCtx);
  check(eq(fxRep.netSales, fxPl.netRevenue) && eq(fxRep.otherRevenue, 0),
    "FIX1 synthetic: discounted+taxed bill, taxed counter sale, partial return, voided bill, held bill — report net == P&L net EXACTLY, reconciling line 0");
  check(eq(fxRep.revenue, fxPl.revenue) && eq(fxRep.discounts, fxPl.discounts),
    "FIX1 synthetic: the report's revenue and discounts lines equal the P&L's own two lines (not just their difference)");
  check(eq(sum(fxRep.byProduct.map((r) => r.amount)), fxRep.netSales) &&
        eq(sum(fxRep.byCustomer.map((r) => r.amount)), fxRep.netSales),
    "FIX1 synthetic: by-product and by-customer breakdowns sum back to net sales (breakdowns carry the same netting)");
  // The legacy shape: one journal-only revenue entry (pre-F-7
  // standalone udhaar posted to sales_revenue, Rs 8,500).
  const fxLegacy = ledger.makeEntry("Udhaar given — Haji Muhammad Saleem (legacy)", "credit", "fx-cr-legacy", [
    { account: "receivables", debit: 8500, credit: 0, ref: "fx-c9" },
    { account: "sales_revenue", debit: 0, credit: 8500 },
  ], { ts: "2026-10-14T09:00:00.000Z" });
  const fxJournalL = [...fxJournal, fxLegacy];
  const fxRepL = reports.salesReport(fxSales, fxProducts, fxBills, FXOCT,
    { ...fxCtx, journal: fxJournalL });
  const fxPlL = ledger.profitAndLossInRange(fxJournalL, FXOCT.fromTs, FXOCT.toTs);
  check(eq(fxRepL.otherRevenue, 8500) && eq(fxRepL.plNetRevenue, fxPlL.netRevenue) &&
        eq(fxRepL.netSales, fxRep.netSales),
    "FIX1 legacy: the 8,500 journal-only revenue surfaces as the labelled reconciling line; the document figures do not move");

  /* ---- Fix 2: negative money-account warning ---- */
  const walletLegacy = accounts.find((a) => a.id === "acc-wallet-legacy");
  check(!!walletLegacy && eq(ledger.moneyAccountBalance(journal, walletLegacy), -45000),
    "FIX2 seed: Wallet & Bank sits at −45,000 (the audit's silent overdraft, reproduced)");
  const prev1 = ledger.outflowPreview(journal, accounts,
    { method: "bank", accountId: "acc-wallet-legacy", amount: 1000 });
  check(!!prev1 && eq(prev1.balance, -45000) && eq(prev1.balanceAfter, -46000),
    "FIX2: previewing a further outflow from the overdrawn account reports the deeper negative (the warning's figures)");
  const prev2 = ledger.outflowPreview(journal, accounts,
    { method: "cash", accountId: null, amount: 60000 });
  check(!!prev2 && prev2.account.id === "acc-till" && eq(prev2.balanceAfter, -10000),
    "FIX2: a 60,000 cash outflow resolves to the till (50,000) and previews −10,000 — the warn case");
  const prev3 = ledger.outflowPreview(journal, accounts,
    { method: "cash", accountId: null, amount: 40000 });
  check(!!prev3 && eq(prev3.balanceAfter, 10000),
    "FIX2: an in-balance outflow previews positive — no warning fires");
  check(ledger.outflowPreview(journal, [], { method: "cash", accountId: null, amount: 1 }) === null,
    "FIX2: no accounts at all → null (the legacy GL-only path has no per-account figure to warn about)");

  /* ---- Fix 3: expense dates single-sourced ---- */
  const bookRows = ledger.cashBook(journal);
  let datesAgree = true;
  for (const e of expenses) {
    const entry = journal.find((j) => j.id === `j-seed-exp-${e.id}`);
    const row = entry ? bookRows.find((r) => r.entryId === entry.id) : undefined;
    if (!entry || !row ||
        periods.businessDateISO(e.ts) !== periods.businessDateISO(entry.ts) ||
        periods.businessDateISO(row.ts) !== periods.businessDateISO(e.ts)) {
      datesAgree = false;
      break;
    }
  }
  check(datesAgree,
    "FIX3 seed: every expense's register date == its journal entry's date == its cash-book row's date");
  const rebaseOk = [...sales, ...expenses, ...purchases, ...payments, ...credits]
    .every((r) => periods.businessDateISO(r.ts) === periods.addDaysISO(periods.todayPktISO(), -r.dayOffset));
  check(rebaseOk,
    "FIX3 seed construction: every day-bucketed seed row's ts falls on the calendar day its dayOffset denotes");
  const expSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/ExpensesRegister.tsx", "utf8");
  check(expSrc.includes("businessDateISO(e.ts)") && !expSrc.includes("e.dayOffset === 0"),
    "FIX3 source: the register groups AND labels by the expense's own business date — dayOffset grouping is gone");

  /* ---- Fix 4: journal viewer data + trial balance ---- */
  check(journal.every((e) => ledger.entryBalances(e)),
    "FIX4: every seed journal entry passes its ΣDr == ΣCr balance check (the journal viewer's badge)");
  const tb = reports.trialBalance(journal, FIXFULL);
  check(tb.balanced && eq(tb.difference, 0) && eq(tb.closingDifference, 0),
    "FIX4: seed trial balance renders the balanced state — period and closing differences are 0");
  check(eq(tb.totalDebits, tb.totalCredits) && eq(tb.closingDebits, tb.closingCredits),
    "FIX4: seed trial balance — Σ period debits == Σ period credits, Σ closing Dr == Σ closing Cr");
  const tbCash = tb.rows.find((r) => r.account === "cash");
  const tbInv = tb.rows.find((r) => r.account === "inventory");
  check(!!tbCash && eq(tbCash.closing, 50000) && !!tbInv && eq(tbInv.closing, 272805),
    "FIX4: trial-balance closings carry the frozen identities (cash 50,000 · inventory 272,805)");
  const tbToday = reports.trialBalance(journal, todayRange);
  check(tbToday.balanced && eq(tbToday.difference, 0),
    "FIX4: the trial balance balances on a single-day range too");
  const finSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/FinanceView.tsx", "utf8");
  check(finSrc.includes("fin.journal.title") && finSrc.includes("entryBalances") &&
        finSrc.includes("fin.acct.negative"),
    "FIX4/FIX2 source: FinanceView ships the journal viewer (with per-entry balance checks) and the account-card negative warning");
  const repViewSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/ReportsView.tsx", "utf8");
  check(repViewSrc.includes('"trialbalance"') && repViewSrc.includes("trialBalance(journal, range)"),
    "FIX4 source: the trial balance is the 14th report in the catalogue, built from the journal");

  /* ---- Fix 5: walk-in bill search ---- */
  const walkInBill = { id: "fx-w", billNo: 42, customerId: null, customerName: "",
    customerPhone: "", items: [], subtotal: 0, discountType: "flat", discountValue: 0,
    discountAmount: 0, total: 0, payments: [], status: "paid", dayOffset: 0,
    ts: "2026-10-10T10:00:00.000Z" };
  check(search.billMatches(walkInBill, "walk-in", "Walk-in customer") === true &&
        search.billMatches(walkInBill, "Walk-in Customer", "Walk-in customer") === true,
    "FIX5: a walk-in bill matches its displayed label, in part and in full");
  check(search.billMatches(walkInBill, "عام", "عام گاہک") === true,
    "FIX5: a walk-in bill matches its Urdu label (عام گاہک)");
  check(search.billMatches({ ...walkInBill, customerName: "Ahmed" }, "walk-in", "Walk-in customer") === false,
    "FIX5: a NAMED bill never matches the walk-in label");
  check(search.billMatches(walkInBill, "walk-in") === false &&
        search.billMatches(walkInBill, "42", "Walk-in customer") === true,
    "FIX5: without a label the legacy behaviour is unchanged; the bill number still matches");
  const deskSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/BillingDesk.tsx", "utf8");
  check(deskSrc.includes('billMatches(b, histSearch, t("billing.walkInCustomer"))'),
    "FIX5 source: the desk's bill-history search passes the localized walk-in label");

  /* ---- Fix 2 source: the warning is wired at every money-out desk ---- */
  const maSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/MoneyAccounts.tsx", "utf8");
  const supSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/SuppliersManager.tsx", "utf8");
  const dashSrc = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/Dashboard.tsx", "utf8");
  check(maSrc.includes("export function NegativeBalanceWarning") && maSrc.includes("fin.acct.negative"),
    "FIX2 source: the shared warning modal ships in MoneyAccounts and the Settings account list warns inline");
  check(expSrc.includes("outflowPreview") && expSrc.includes("NegativeBalanceWarning") &&
        supSrc.includes("outflowPreview") && supSrc.includes("NegativeBalanceWarning") &&
        maSrc.includes("outflowPreview"),
    "FIX2 source: expenses, supplier payments and transfers all preview the outflow and raise the warning before posting");
  check(dashSrc.includes("negativeAccounts") && dashSrc.includes("fin.acct.negativeShort"),
    "FIX2 source: the dashboard money snapshot names its negative accounts");

  /* ---- i18n: the live-audit keys, both languages ---- */
  const fixKeys = ["fin.acct.negative", "fin.acct.negativeShort", "fin.neg.title",
    "fin.neg.body", "fin.neg.confirm", "fin.journal.title", "fin.journal.caption",
    "fin.journal.balanced", "fin.journal.unbalanced", "fin.journal.count",
    "fin.journal.showingLatest", "fin.journal.empty", "rep.tb.title", "rep.tb.desc",
    "rep.tb.debit", "rep.tb.credit", "rep.tb.dr", "rep.tb.cr", "rep.tb.difference",
    "rep.tb.balanced", "rep.tb.unbalanced", "rep.tot.otherRevenue", "rep.tot.plNetRevenue"];
  check(fixKeys.every((k) => typeof i18n.en[k] === "string" && i18n.en[k].length > 0 &&
        typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "FIX i18n: all 23 live-audit keys present and non-empty in EN and UR");
  check(Object.keys(i18n.en).length === Object.keys(i18n.ur).length &&
        Object.keys(i18n.en).every((k) => k in i18n.ur),
    "FIX i18n: full dictionary parity EN ≡ UR after the additions");
}

/* ============================ D1 (Phase D · declarations, employees & attendance) ============================ */
suite("D1", null); // Phase D · D1 — declarations, employees & attendance (design §1/§2.2/§6/§9 D1; NO postings)
{
  /* ---- declarations: the ONE additive COA code (§3.1) ---- */
  check(coa.ACCOUNT_CODES.length === 28 && coa.ACCOUNT_CODES[27] === "loans_receivable",
    "D1 COA: loans_receivable is appended as code #28 — every prior code keeps its place");
  const lrMeta = coa.accountMeta("loans_receivable");
  check(lrMeta.type === "asset" && lrMeta.normalBalance === "debit" && lrMeta.since === "D" &&
        coa.normalBalanceSign("loans_receivable") === 1 && coa.isAccountCode("loans_receivable"),
    "D1 COA: loans_receivable is a debit-normal asset declared since \"D\"");
  check(Object.entries(coa.CHART_OF_ACCOUNTS).filter(([, m]) => m.since === "D").length === 1 &&
        Object.entries(coa.CHART_OF_ACCOUNTS).filter(([, m]) => m.since === "v1").length === 17 &&
        Object.entries(coa.CHART_OF_ACCOUNTS).filter(([, m]) => m.since === "A").length === 10,
    "D1 COA: exactly ONE Phase D code — the 17 v1 and 10 Phase A codes are untouched");

  /* ---- declarations: types + series (source-level, A1 pattern) ---- */
  const typesSrcD1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/types.ts", "utf8");
  check(["payroll_accrual", "payroll_payment", "salary_advance", "loan_drawdown",
         "loan_charge", "loan_repayment", "fy_close"]
        .every((r) => typesSrcD1.includes(`"${r}"`)),
    "D1 types: all seven Phase D journal refTypes are declared (type-only, unposted)");
  check(typesSrcD1.includes("interface Employee") && typesSrcD1.includes("interface AttendanceMonth") &&
        typesSrcD1.includes("interface PayrollRun") && typesSrcD1.includes("interface PayrollRunLine") &&
        typesSrcD1.includes("interface Loan") && typesSrcD1.includes("interface LoanEvent") &&
        typesSrcD1.includes('"payrollRun"') && typesSrcD1.includes('"loan"'),
    "D1 types: Employee / AttendanceMonth / PayrollRun(+Line) / Loan(+Event) and the payrollRun + loan series are declared");
  check(docs.seriesPrefix("payrollRun", null) === "PAY-" && docs.seriesPrefix("loan", null) === "LN-" &&
        docs.seriesPrefix("payrollRun", { docSeries: { payrollRun: "PR-" } }) === "PR-",
    "D1 series: PAY- (minted at finalise) and LN- (born numbered) defaults resolve, owner override honoured");

  /* ---- attendance summaries + the mark cycle (§1.3) ---- */
  const mkAtt = (days) => ({ id: "e1__2026-10", employeeId: "e1", month: "2026-10", days, ts: "" });
  const mixed = payroll.attendanceSummary(mkAtt(
    { "1": "present", "2": "present", "3": "absent", "4": "half", "5": "leave", "6": "off" }));
  check(mixed.present === 2 && mixed.absent === 1 && mixed.half === 1 && mixed.leave === 1 &&
        mixed.off === 1 && mixed.markedDays === 6,
    "D1 attendance: the summary counts each mark once (P2 A1 H1 L1 O1, 6 marked)");
  check(eq(mixed.workedUnits, 4.5),
    "D1 attendance: workedUnits = present + 0.5×half + leave + off = 4.5 (paid units, §1.4)");
  const emptySum = payroll.attendanceSummary(null);
  check(emptySum.markedDays === 0 && emptySum.workedUnits === 0,
    "D1 attendance: no doc reads as a blank register — never silently present");
  check(payroll.nextAttendanceMark(null) === "present" &&
        payroll.nextAttendanceMark("present") === "absent" &&
        payroll.nextAttendanceMark("absent") === "half" &&
        payroll.nextAttendanceMark("half") === "leave" &&
        payroll.nextAttendanceMark("leave") === "off" &&
        payroll.nextAttendanceMark("off") === null,
    "D1 attendance: one tap cycles present → absent → half → leave → off → cleared");
  check(payroll.attendanceDocId("emp-9", "2026-10") === "emp-9__2026-10" &&
        payroll.daysInMonthOf("2026-10") === 31 && payroll.daysInMonthOf("2026-02") === 28 &&
        payroll.daysInMonthOf("2024-02") === 29 && payroll.daysInMonthOf("bogus") === 0 &&
        payroll.shiftMonth("2026-12", 1) === "2027-01" && payroll.shiftMonth("2026-01", -1) === "2025-12",
    "D1 attendance: deterministic doc id, month lengths and month shifting are exact");

  /* ---- proration (§1.4) — hand-computed fixtures ---- */
  const monthly = { payBasis: "monthly", baseAmount: 31000, paidLeaveDays: 2 };
  const sumA = { present: 26, absent: 3, half: 0, leave: 1, off: 1, markedDays: 31, workedUnits: 28 };
  const earnedA = payroll.earnedBaseFor(monthly, sumA, 31);
  check(earnedA.unpaidAbsent === 1 && eq(earnedA.earnedBase, 30000),
    "D1 proration monthly: 3 absences − 2 paid leave = 1 unpaid → 31,000 × 30/31 = 30,000 exactly");
  const earnedB = payroll.earnedBaseFor(monthly, { ...sumA, absent: 2 }, 31);
  check(earnedB.unpaidAbsent === 0 && eq(earnedB.earnedBase, 31000),
    "D1 proration monthly: absences inside the paid-leave allowance dock nothing — full base");
  const earnedC = payroll.earnedBaseFor(
    { payBasis: "monthly", baseAmount: 10000, paidLeaveDays: 0 },
    { ...sumA, absent: 1 }, 31);
  check(eq(earnedC.earnedBase, 9677.42),
    "D1 proration monthly: the pro-rata division rounds to the paisa (10,000 × 30/31 = 9,677.42)");
  const earnedHalf = payroll.earnedBaseFor(monthly,
    { present: 29, absent: 0, half: 2, leave: 0, off: 0, markedDays: 31, workedUnits: 30 }, 31);
  check(eq(earnedHalf.earnedBase, 31000),
    "D1 proration monthly: half days are PAID days in the monthly bargain — no deduction");
  const daily = { payBasis: "daily", baseAmount: 1200, paidLeaveDays: 0 };
  const earnedD = payroll.earnedBaseFor(daily,
    { present: 20, absent: 3, half: 2, leave: 0, off: 4, markedDays: 29, workedUnits: 25 });
  check(earnedD.unpaidAbsent === 0 && eq(earnedD.earnedBase, 25200),
    "D1 proration daily: 1,200 × (20 present + 2 half) = 25,200 — absence simply earns nothing");
  check(eq(payroll.earnedBaseFor(daily,
    { present: 0, absent: 30, half: 0, leave: 0, off: 0, markedDays: 30, workedUnits: 0 }).earnedBase, 0),
    "D1 proration daily: a month with no presence earns exactly 0");

  /* ---- the salary_payable composition (§2.2) ---- */
  const sp = (memo, refType, lines) => ledger.makeEntry(memo, refType, null, lines);
  const spJournal = [
    sp("accrual emp-1", "payroll_accrual", [
      { account: "expense_salary", debit: 30000, credit: 0, ref: "emp-1" },
      { account: "salary_payable", debit: 0, credit: 30000, ref: "emp-1" }]),
    sp("accrual emp-2", "payroll_accrual", [
      { account: "expense_salary", debit: 20000, credit: 0, ref: "emp-2" },
      { account: "salary_payable", debit: 0, credit: 20000, ref: "emp-2" }]),
    // The C4 shape, verbatim: the accrual line carries NO ref key at all.
    sp("production issue (accrue)", "production_issue", [
      { account: "wip", debit: 5000, credit: 0, ref: "ord-1" },
      { account: "salary_payable", debit: 0, credit: 5000 }]),
    sp("advance emp-1", "salary_advance", [
      { account: "salary_payable", debit: 8000, credit: 0, ref: "emp-1" },
      { account: "cash", debit: 0, credit: 8000, ref: null }]),
    sp("payment emp-2", "payroll_payment", [
      { account: "salary_payable", debit: 20000, credit: 0, ref: "emp-2" },
      { account: "cash", debit: 0, credit: 20000, ref: null }]),
    sp("advance emp-3", "salary_advance", [
      { account: "salary_payable", debit: 5000, credit: 0, ref: "emp-3" },
      { account: "cash", debit: 0, credit: 5000, ref: null }]),
  ];
  check(eq(payroll.employeePosition(spJournal, "emp-1"), -22000) &&
        eq(payroll.employeePosition(spJournal, "emp-2"), 0) &&
        eq(payroll.employeePosition(spJournal, "emp-3"), 5000),
    "D1 composition: positions derive per employee — emp-1 owed 22,000, emp-2 settled, emp-3 advance 5,000");
  const comp = payroll.salaryPayableComposition(spJournal);
  check(eq(comp.glBalance, 22000) && eq(comp.owedToEmployees, 22000) &&
        eq(comp.advancesOutstanding, 5000) && eq(comp.unassignedAccrued, 5000),
    "D1 composition: GL 22,000 = owed 22,000 + unassigned (C4) bucket 5,000, advances 5,000 on the other side");
  check(eq(comp.owedToEmployees - comp.advancesOutstanding + comp.unassignedAccrued, comp.glBalance) &&
        eq(comp.glBalance, ledger.accountNormalBalance(spJournal, "salary_payable")),
    "D1 composition: the §2.2 identity holds to the paisa — GL ≡ Σ employee positions + unassigned bucket");
  const compSeed = payroll.salaryPayableComposition(journal);
  check(eq(compSeed.glBalance, 0) && compSeed.employees.length === 0 && eq(compSeed.unassignedAccrued, 0),
    "D1 composition: the seed journal carries no salary_payable at all — the composition is honestly empty");
  check(payroll.hasPostedRunForMonth([{ month: "2026-10", status: "posted" }], "2026-10") === true &&
        payroll.hasPostedRunForMonth([{ month: "2026-09", status: "draft" }], "2026-09") === false &&
        payroll.hasPostedRunForMonth([{ month: "2026-08", status: "reversed" }], "2026-08") === false &&
        payroll.hasPostedRunForMonth([], "2026-10") === false,
    "D1 register warning: only a POSTED run marks its month — drafts and reversed runs do not");

  /* ---- RBAC: the pre-declared rows, as declared (§6.1) ---- */
  check(perm.can("owner", "staffDirectory", "write") && perm.can("manager", "staffDirectory", "write") &&
        !perm.can("cashier", "staffDirectory", "view") && perm.can("accountant", "staffDirectory", "view") &&
        !perm.can("accountant", "staffDirectory", "write"),
    "RBAC staffDirectory: owner/manager write, accountant reads terms, cashier never reaches the surface (G-D1)");
  check(perm.can("accountant", "payroll", "write") && perm.can("manager", "payroll", "view") &&
        !perm.can("manager", "payroll", "write") && !perm.can("cashier", "payroll", "view") &&
        perm.can("accountant", "loans", "write") && !perm.can("manager", "loans", "write"),
    "RBAC payroll/loans rows stand as pre-declared in A3 (D2/D3 will consume them unchanged)");

  /* ---- demo seed: directory data only, zero journal footprint (§10.3) ---- */
  const seedEmps = seed.getSeedEmployees();
  const seedAtt = seed.getSeedAttendance(seedEmps);
  check(seedEmps.length === 2 && seedEmps.filter((e) => e.payBasis === "monthly").length === 1 &&
        seedEmps.filter((e) => e.payBasis === "daily").length === 1 &&
        seedEmps.every((e) => e.active),
    "D1 seed: two sample employees — one monthly-basis, one daily-basis, both active");
  check(seedAtt.length === 2 && seedAtt.every((a) =>
          a.id === payroll.attendanceDocId(a.employeeId, a.month) && a.month === payroll.currentMonthKey()),
    "D1 seed: one attendance doc per employee for the CURRENT (PKT) month, deterministic ids");
  check(seedAtt.every((a) => {
          const s = payroll.attendanceSummary(a);
          return s.markedDays === Object.keys(a.days).length && s.markedDays > 0;
        }),
    "D1 seed: the register is marked for the elapsed days and its summary re-derives exactly");
  check(journal.length === 21 && eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.accountBalance(journal, "cash"), 50000) &&
        journal.every((e) => ledger.entryBalances(e)),
    "D1 seed: the frozen journal identities stand — 21 entries, inventory 272,805, cash 50,000, every entry balanced");

  /* ---- employee search (lib/search, null-safe like every desk) ---- */
  check(search.employeeMatches({ name: "Muhammad Imran", phone: "0300-1", designation: "Salesman" }, "imran") &&
        search.employeeMatches({ name: "Rashid Ali", phone: null, designation: undefined }, "rashid") &&
        !search.employeeMatches({ name: "Rashid Ali" }, "imran") &&
        search.employeeMatches({ name: null, phone: null, designation: null }, "") === true,
    "D1 search: employeeMatches hits name/designation, never throws on missing fields");

  /* ---- source invariants: store wiring, NO new posting route ---- */
  const storeSrcD1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcD1.includes('"employees"') && storeSrcD1.includes('"attendance"') &&
        storeSrcD1.includes('"payrollRuns"') && storeSrcD1.includes('"loans"') &&
        storeSrcD1.includes('"dukaan-ai-store-v16"') && storeSrcD1.includes("ensurePhaseD") &&
        storeSrcD1.includes("setAttendanceMark") && storeSrcD1.includes('"phaseD.hrV1": true'),
    "source: the four Phase D collections, the v16 demo bump and the flag-only hrV1 migration are wired into the store");
  check((storeSrcD1.match(/makeEntry\(/g) || []).length === 24,
    "source: still 24 makeEntry calls in the store — D1 adds NO posting path (employees/attendance write docs only)");
  const payrollSrcD1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/lib/payroll.ts", "utf8");
  /* Amended at D2 (same-check style): in D1 lib/payroll composed
   * nothing; D2 deliberately lands the §2.4 posting TEMPLATES
   * there (the C3/C4/C5 pattern — entries compose in lib through
   * the real makeEntry guard). The invariant that survives, and
   * the one this check now asserts: lib/payroll never GUARDS or
   * posts — guardPostings stays the store's choke point alone. */
  check(payrollSrcD1.includes("buildPayrollAccrualEntry") && !payrollSrcD1.includes("guardPostings("),
    "source: lib/payroll composes D2's entries through makeEntry but never guards a posting — the choke point stays in the store");
  const staffSrcD1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StaffView.tsx", "utf8");
  check(staffSrcD1.includes('can(role, "staffDirectory", "view")') &&
        staffSrcD1.includes("employeeMatches") && staffSrcD1.includes("hasPostedRunForMonth") &&
        staffSrcD1.includes("nextAttendanceMark"),
    "source: the Staff screen gates on staffDirectory, searches via lib/search and cycles marks via the pure core");

  /* ---- i18n: the D1 strings, both languages ---- */
  const hrKeys = Object.keys(i18n.en).filter(
    (k) => k.startsWith("staff.") || k.startsWith("att.") || k === "nav.staff");
  /* 103 at D1; +1 at D2 (staff.tab.payroll — the third Staff tab
   * chip lives in the same key family). */
  check(hrKeys.length === 104, `i18n: the hr part carries ${hrKeys.length} keys (104 expected)`);
  check(hrKeys.every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0) &&
        typeof i18n.en["fin.acct.loans_receivable"] === "string" &&
        i18n.ur["fin.acct.loans_receivable"].length > 0 &&
        i18n.en["settings.series.payrollRun"].length > 0 && i18n.ur["settings.series.payrollRun"].length > 0 &&
        i18n.en["settings.series.loan"].length > 0 && i18n.ur["settings.series.loan"].length > 0,
    "i18n: every D1 key present and non-empty in Urdu (parity), incl. the account + series labels");

  /* ---- rules: additive D1 blocks, narrowed reads (§6.2) ---- */
  const rulesD1 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const d1Seg = rulesD1.slice(
    rulesD1.indexOf("      // Phase D · D1"),
    rulesD1.indexOf("      // Expenses:"));
  check(d1Seg.includes("match /employees/{employeeId}") && d1Seg.includes("match /attendance/{attendanceId}") &&
        d1Seg.includes("hasRole(uid, ['owner', 'manager', 'accountant'])") &&
        d1Seg.includes("hasRole(uid, ['owner', 'manager'])"),
    "rules: employees + attendance blocks — read owner/manager/accountant, write owner/manager (design §6.2)");
  check(!d1Seg.includes("canAccess(uid)") && d1Seg.indexOf("match /employees") < d1Seg.indexOf("match /attendance"),
    "rules: Phase D reads are NARROWED — no canAccess read on either HR collection (salary data is not counter data)");
  const strippedD1 = rulesD1.slice(0, rulesD1.indexOf("      // Phase D · D1")) +
    rulesD1.slice(rulesD1.indexOf("      // Expenses:"));
  check(crypto.createHash("sha256").update(strippedD1, "utf8").digest("hex") ===
        "78df93ea7f53412bc634da26ab039ab40c33bcf1e110ac99cf02ce2f519b4761",
    "rules: stripping the D1 blocks reproduces the v6 file byte-for-byte (additive only)");
}

/* ============================ D2 (Phase D · payroll runs, payments, advances, slips) ============================ */
suite("D2", null); // Phase D · D2 — payroll (design §2; the phase's heaviest finance checkpoint)
{
  const FULL = {
    fromDate: "2000-01-01", toDate: "2999-12-31",
    fromTs: "2000-01-01T00:00:00.000Z", toTs: "2999-01-01T00:00:00.000Z",
  };
  const T = {
    adv: "2026-10-02T05:00:00.000Z",
    c4: "2026-10-03T05:00:00.000Z",
    accr: "2026-11-01T05:00:00.000Z",
    pay: "2026-11-02T05:00:00.000Z",
    bucket: "2026-11-03T05:00:00.000Z",
    rev: "2026-11-04T05:00:00.000Z",
  };

  /* ---- fixtures: two employees + October attendance (§1.4) ---- */
  const empA = {
    id: "emp-a", name: "Ahmed Raza", phone: "0300-1", designation: "Salesman",
    linkedUserEmail: null, joinDateISO: "2024-01-01", payBasis: "monthly",
    baseAmount: 31000, allowances: [{ label: "Transport", amount: 3000 }],
    paidLeaveDays: 2, active: true, note: "", ts: "",
  };
  const empB = {
    id: "emp-b", name: "Bilal Hussain", phone: "0300-2", designation: "Helper",
    linkedUserEmail: null, joinDateISO: "2025-01-01", payBasis: "daily",
    baseAmount: 1200, allowances: [], paidLeaveDays: 0, active: true, note: "", ts: "",
  };
  const empOff = { ...empB, id: "emp-off", name: "Old Hand", active: false };
  const attDays = (marks) => {
    const days = {};
    let d = 1;
    for (const [mark, count] of marks) for (let i = 0; i < count; i++) days[String(d++)] = mark;
    return days;
  };
  const attA = { id: "emp-a__2026-10", employeeId: "emp-a", month: "2026-10",
    days: attDays([["present", 26], ["absent", 3], ["leave", 1], ["off", 1]]), ts: "" };
  const attB = { id: "emp-b__2026-10", employeeId: "emp-b", month: "2026-10",
    days: attDays([["present", 20], ["half", 2], ["absent", 3]]), ts: "" };

  /* ---- composition: lines snapshot the proration (§2.3) ---- */
  const lines = payroll.buildRunLines([empA, empB, empOff], [attA, attB], "2026-10");
  check(lines.length === 2 && lines.every((l) => l.employeeId !== "emp-off"),
    "D2 compose: one line per ACTIVE employee — the deactivated employee is not composed");
  const lineA = lines.find((l) => l.employeeId === "emp-a");
  const lineB = lines.find((l) => l.employeeId === "emp-b");
  check(lineA.present === 26 && lineA.absent === 3 && lineA.leave === 1 && lineA.unpaidAbsent === 1 &&
        eq(lineA.earnedBase, 30000) && eq(lineA.gross, 33000) && eq(lineA.netAccrued, 33000),
    "D2 compose: monthly line snapshots counts + §1.4 (31,000×30/31 = 30,000 earned; +3,000 allowance = 33,000)");
  check(eq(lineB.earnedBase, 25200) && eq(lineB.netAccrued, 25200) && lineB.unpaidAbsent === 0,
    "D2 compose: daily line = 1,200 × (20 + 2 halves) = 25,200");
  check(payroll.buildRunLines([], [], "2026-10").length === 0,
    "D2 compose: a shop with no employees composes no lines (Phase D posts nothing until used)");

  /* ---- desk overrides: reducers live on the line (§2.3/§2.5) ---- */
  const lineA2 = payroll.payrollLineTotals({
    ...lineA, deductions: [{ label: "Fine", amount: 500 }],
  });
  check(eq(lineA2.gross, 33000) && eq(lineA2.netAccrued, 32500),
    "D2 override: a 500 fine reduces the NET (33,000 − 500 = 32,500) — gross stays the slip's story");
  const runLines = [lineA2, lineB];
  const totals = payroll.payrollRunTotals(runLines);
  check(eq(totals.gross, 58200) && eq(totals.deductions, 500) && eq(totals.netAccrued, 57700),
    "D2 totals: run totals are a pure function of the lines (58,200 / 500 / 57,700)");

  const runDraft = {
    id: "run-1", number: null, month: "2026-10", lines: runLines, totals,
    payments: [], accrualEntryId: null, status: "draft", note: "", dayOffset: 0, ts: T.accr,
  };
  const runPosted = { ...runDraft, number: "PAY-1", status: "posted" };

  /* ---- the accrual entry (§2.4): NET, refs, no reducers ---- */
  const accrual = payroll.buildPayrollAccrualEntry(runPosted, { ts: T.accr });
  check(!!accrual && accrual.refType === "payroll_accrual" && accrual.refId === "run-1" &&
        ledger.entryBalances(accrual),
    "D2 accrual: ONE entry, refType payroll_accrual citing the run, balanced by construction");
  const spLines = accrual.lines.filter((l) => l.account === "salary_payable");
  const exLines = accrual.lines.filter((l) => l.account === "expense_salary");
  check(accrual.lines.length === 4 && spLines.length === 2 && exLines.length === 2 &&
        spLines.every((l) => l.credit > 0 && (l.ref === "emp-a" || l.ref === "emp-b")) &&
        exLines.every((l) => l.debit > 0 && (l.ref === "emp-a" || l.ref === "emp-b")),
    "D2 accrual: per-employee Dr expense_salary / Cr salary_payable pairs, BOTH lines carrying ref = employeeId");
  check(eq(sum(exLines.map((l) => l.debit)), totals.netAccrued) &&
        eq(sum(spLines.map((l) => l.credit)), totals.netAccrued),
    "D2 accrual: Σ lines == the run's net total (57,700) on both accounts");
  check(!accrual.lines.some((l) => l.debit === 500 || l.credit === 500) &&
        !accrual.lines.some((l) => l.debit === 58200 || l.credit === 58200),
    "D2 accrual: the 500 reducer and the 58,200 gross are NOWHERE in the journal — net accrual, never grossed up (§2.4)");
  check(payroll.buildPayrollAccrualEntry({ ...runDraft, lines: [
          { ...lineB, earnedBase: 0, allowances: [], gross: 0, netAccrued: 0 }] }) === null,
    "D2 accrual: a run whose lines all net to zero composes NO entry (finalise refuses)");

  /* ---- the mixed journal: advance + C4 accrual + run + payments ---- */
  const advEntry = payroll.buildSalaryAdvanceEntry({
    employeeId: "emp-a", name: "Ahmed Raza", amount: 8000,
    method: "cash", accountId: "acc-main", ts: T.adv,
  });
  check(advEntry.refType === "salary_advance" && advEntry.refId === "emp-a" &&
        advEntry.lines[0].account === "salary_payable" && advEntry.lines[0].debit === 8000 &&
        advEntry.lines[0].ref === "emp-a" && advEntry.lines[1].account === "cash" &&
        advEntry.lines[1].ref === "acc-main",
    "D2 advance: Dr salary_payable (ref = employee) / Cr cash (ref = account) — not an expense, not the customer khata");
  const c4Entry = ledger.makeEntry("Production issue — labour accrued", "production_issue", "ord-1", [
    { account: "wip", debit: 5000, credit: 0, ref: "ord-1" },
    { account: "salary_payable", debit: 0, credit: 5000 }, // the C4 shape: NO ref key
  ], { ts: T.c4 });
  const J = [advEntry, c4Entry, accrual];
  runPosted.accrualEntryId = accrual.id;

  check(eq(payroll.employeePosition(J, "emp-a"), -32500 + 8000),
    "D2 advance→position: after advance + accrual, emp-a's position is −24,500 (owed 32,500, advanced 8,000)");
  let comp = payroll.salaryPayableComposition(J);
  check(eq(comp.glBalance, 54700) && eq(comp.owedToEmployees, 24500 + 25200) &&
        eq(comp.advancesOutstanding, 0) && eq(comp.unassignedAccrued, 5000),
    "D2 composition (pre-payment): GL 54,700 = owed 49,700 + unassigned bucket 5,000 (the 8,000 advance debit nets inside emp-a's position)");
  check(eq(comp.owedToEmployees - comp.advancesOutstanding + comp.unassignedAccrued, comp.glBalance),
    "D2 composition identity holds after advance + C4 + accrual");

  /* ---- partial payment + the §2.7 slip figures ---- */
  const payEntry = payroll.buildPayrollPaymentEntry({
    run: runPosted, employeeId: "emp-a", name: "Ahmed Raza", amount: 20000,
    method: "cash", accountId: "acc-main", ts: T.pay,
  });
  check(payEntry.refType === "payroll_payment" && payEntry.refId === "run-1" &&
        payEntry.lines[0].account === "salary_payable" && payEntry.lines[0].ref === "emp-a" &&
        payEntry.lines[1].account === "cash" && payEntry.lines[1].credit === 20000,
    "D2 payment: Dr salary_payable (ref = employee) / Cr money — recovery is NOT a journal leg (§2.4)");
  const runPaid = { ...runPosted, payments: [{
    employeeId: "emp-a", name: "Ahmed Raza", amount: 20000, method: "cash",
    accountId: "acc-main", entryId: payEntry.id, dayOffset: 0, ts: T.pay,
  }] };
  J.push(payEntry);
  check(eq(payroll.paidForRun(runPaid, "emp-a"), 20000) && eq(payroll.paidForRun(runPaid, "emp-b"), 0),
    "D2 paidForRun: the run's events derive its paid state — 20,000 for emp-a, 0 for emp-b");
  const fig = payroll.runLineFigures(J, runPaid, lineA2);
  check(eq(fig.advanceBefore, 8000) && eq(fig.cashPaid, 20000) &&
        eq(fig.advanceRecovered, 8000) && eq(fig.stillOwed, 4500) && eq(fig.advanceOutstanding, 0),
    "D2 slip figures (§2.7): advance before 8,000 · recovered min(8,000, 32,500−20,000) = 8,000 · paid 20,000 · still owed 4,500");
  comp = payroll.salaryPayableComposition(J);
  check(eq(comp.glBalance, 34700) && eq(comp.owedToEmployees, 4500 + 25200) &&
        eq(comp.unassignedAccrued, 5000) &&
        eq(comp.owedToEmployees - comp.advancesOutstanding + comp.unassignedAccrued, comp.glBalance),
    "D2 composition (post-payment): GL 34,700 = owed 29,700 + bucket 5,000 — identity holds after the payment");

  /* ---- the unassigned bucket payment (§2.2/§2.4) ---- */
  const bucketEntry = payroll.buildPayrollPaymentEntry({
    run: runPaid, employeeId: null, name: "Production labour", amount: 5000,
    method: "cash", accountId: "acc-main", ts: T.bucket,
  });
  check(bucketEntry.lines[0].account === "salary_payable" && (bucketEntry.lines[0].ref ?? null) === null,
    "D2 bucket payment: the Dr salary_payable line carries NO ref — it settles the bucket, no employee");
  J.push(bucketEntry);
  comp = payroll.salaryPayableComposition(J);
  check(eq(comp.unassignedAccrued, 0) && eq(comp.glBalance, 29700) &&
        eq(comp.owedToEmployees, 29700) &&
        eq(comp.owedToEmployees - comp.advancesOutstanding + comp.unassignedAccrued, comp.glBalance),
    "D2 composition (bucket paid): bucket 0, GL 29,700 = owed 29,700 — the identity survives mixed traffic");

  /* ---- trial balance over the whole D2 journal ---- */
  const tbD2 = reports.trialBalance(J, FULL);
  check(tbD2.balanced && eq(tbD2.difference, 0) && eq(tbD2.closingDifference, 0),
    "D2 trial balance: the mixed payroll journal balances — period and closing differences are 0");
  const tbSal = tbD2.rows.find((r) => r.account === "salary_payable");
  check(!!tbSal && eq(tbSal.closing, 29700),
    "D2 trial balance: salary_payable closes at the composition's GL (29,700)");

  /* ---- run reversal: payments STAND as advances (§2.6) ---- */
  const runMirror = payroll.buildMirrorEntry(accrual, "Payroll reversal PAY-1 — 2026-10", { ts: T.rev });
  check(runMirror.reversesId === accrual.id && runMirror.refType === "payroll_accrual" &&
        ledger.entryBalances(runMirror),
    "D2 run reversal: the mirror cites the accrual via reversesId and balances");
  const J2 = [...J, runMirror];
  check(eq(payroll.employeePosition(J2, "emp-a"), 28000) &&
        eq(payroll.employeePosition(J2, "emp-b"), 0),
    "D2 run reversal: emp-a's 20,000 payment + 8,000 advance now sit as a 28,000 ADVANCE position (payments stand); emp-b restored to 0");
  const comp2 = payroll.salaryPayableComposition(J2);
  check(eq(comp2.glBalance, -28000) && eq(comp2.advancesOutstanding, 28000) &&
        eq(comp2.owedToEmployees, 0) && eq(comp2.unassignedAccrued, 0) &&
        eq(comp2.owedToEmployees - comp2.advancesOutstanding + comp2.unassignedAccrued, comp2.glBalance),
    "D2 composition (run reversed): GL −28,000 ≡ advances 28,000 — the two-bucket identity holds through reversal");
  const tbD2r = reports.trialBalance(J2, FULL);
  check(tbD2r.balanced && eq(tbD2r.closingDifference, 0),
    "D2 trial balance: still 0 after the run reversal");

  /* ---- payment reversal restores the position (§2.6) ---- */
  const J3 = [accrual];
  const payB = payroll.buildPayrollPaymentEntry({
    run: runPosted, employeeId: "emp-b", name: "Bilal Hussain", amount: 10000,
    method: "bank", accountId: "acc-bank", ts: T.pay,
  });
  J3.push(payB);
  check(eq(payroll.employeePosition(J3, "emp-b"), -15200),
    "D2 partial payment: emp-b owed 25,200 − paid 10,000 → position −15,200");
  const payBMirror = payroll.buildMirrorEntry(payB, "Salary payment reversal — Bilal Hussain", { ts: T.rev });
  J3.push(payBMirror);
  check(payBMirror.reversesId === payB.id && eq(payroll.employeePosition(J3, "emp-b"), -25200),
    "D2 payment reversal: the mirror restores emp-b's position to the full accrual (−25,200)");
  const runPaidB = { ...runPosted, payments: [
    { employeeId: "emp-b", name: "Bilal Hussain", amount: 10000, method: "bank",
      accountId: "acc-bank", entryId: payB.id, dayOffset: 0, ts: T.pay },
    { employeeId: "emp-b", name: "Bilal Hussain", amount: -10000, method: "bank",
      accountId: "acc-bank", entryId: payBMirror.id, dayOffset: 0, ts: T.rev },
  ] };
  check(eq(payroll.paidForRun(runPaidB, "emp-b"), 0),
    "D2 payment reversal: the reversing event (negative amount) nets the run's paid derivation back to 0");

  /* ---- period locks: backdated postings refuse (§7) ---- */
  const lockEnd = periods.endOfDayPktInstant("2026-10-31");
  const backdated = payroll.buildPayrollAccrualEntry(runPosted, { ts: "2026-10-05T05:00:00.000Z" });
  let lockThrew = false;
  try { periods.preparePosting(backdated, lockEnd); }
  catch (e) { lockThrew = periods.isPeriodLockedError(e); }
  check(lockThrew,
    "D2 period lock: an accrual dated inside the locked period is refused by preparePosting (PeriodLockedError)");
  check(periods.preparePosting(accrual, lockEnd).dateISO === "2026-11-01",
    "D2 period lock: the same accrual at its real (November) date passes — a run FOR a locked month finalises today (§7)");
  const backPay = payroll.buildPayrollPaymentEntry({
    run: runPosted, employeeId: "emp-a", name: "Ahmed Raza", amount: 1000,
    method: "cash", accountId: "acc-main", ts: "2026-10-05T05:00:00.000Z",
  });
  let payLockThrew = false;
  try { periods.preparePosting(backPay, lockEnd); }
  catch (e) { payLockThrew = periods.isPeriodLockedError(e); }
  check(payLockThrew,
    "D2 period lock: a backdated payment refuses the same way — the journal leg fails the whole batch");

  /* ---- RBAC: the payroll row, as pre-declared (§6.1) ---- */
  check(perm.can("owner", "payroll", "write") && perm.can("accountant", "payroll", "write") &&
        perm.can("manager", "payroll", "view") && !perm.can("manager", "payroll", "write") &&
        !perm.can("cashier", "payroll", "view"),
    "RBAC payroll: owner/accountant write, manager reads (G-D2), cashier excluded — the A3 row consumed unchanged");

  /* ---- demo seed: the DRAFT run, zero journal footprint (§10.3) ---- */
  const seedEmpsD2 = seed.getSeedEmployees();
  const seedAttD2 = seed.getSeedAttendance(seedEmpsD2);
  const draft = seed.getSeedPayrollRunDraft(seedEmpsD2, seedAttD2);
  check(draft.status === "draft" && draft.number === null && draft.accrualEntryId === null &&
        draft.payments.length === 0 && draft.lines.length === 2 &&
        draft.month === payroll.currentMonthKey(),
    "D2 seed: ONE draft run for the current month — unnumbered, unposted, no payments, both sample employees composed");
  const draftTotals = payroll.payrollRunTotals(draft.lines);
  check(eq(draft.totals.gross, draftTotals.gross) && eq(draft.totals.netAccrued, draftTotals.netAccrued),
    "D2 seed: the draft's totals are the composer's own totals over its lines");
  check(journal.length === 21 && eq(ledger.accountBalance(journal, "inventory"), 272805) &&
        eq(ledger.accountBalance(journal, "cash"), 50000) &&
        eq(ledger.accountBalance(journal, "salary_payable"), 0),
    "D2 seed: frozen identities stand — 21 entries, inventory 272,805, cash 50,000, no salary_payable in the seed journal");

  /* ---- source invariants: wiring + guards + no new posting route ---- */
  const storeSrcD2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StoreProvider.tsx", "utf8");
  check(storeSrcD2.includes("finalisePayrollRun") && storeSrcD2.includes("payPayrollEmployee") &&
        storeSrcD2.includes("giveSalaryAdvance") && storeSrcD2.includes("reversePayrollRun") &&
        storeSrcD2.includes("reversePayrollPayment") && storeSrcD2.includes("getSeedPayrollRunDraft"),
    "source: the D2 store actions + the demo draft are wired into the store");
  check(storeSrcD2.includes('r.month === cur.month && r.status === "posted"') &&
        storeSrcD2.includes("buildPayrollAccrualEntry") && storeSrcD2.includes("buildMirrorEntry"),
    "source: the one-posted-run-per-month guard refuses pre-composition; entries compose in lib/payroll");
  check((storeSrcD2.match(/makeEntry\(/g) || []).length === 24,
    "source: still 24 makeEntry calls in the store — D2 adds NO posting route (templates live in lib/payroll)");
  const staffSrcD2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/StaffView.tsx", "utf8");
  check(staffSrcD2.includes('can(role, "payroll", "view")') && staffSrcD2.includes("runLineFigures") &&
        staffSrcD2.includes("SalarySlipSheet") && staffSrcD2.includes("NegativeBalanceWarning") &&
        staffSrcD2.includes("outflowPreview"),
    "source: the Payroll tab gates on the payroll row, derives via runLineFigures, prints slips, and warns via outflowPreview");
  const finSrcD2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/web/components/FinanceView.tsx", "utf8");
  check(finSrcD2.includes("salaryPayableComposition") && finSrcD2.includes("fin.sal.title"),
    "source: Finance renders the §2.8 salary_payable composition card from the journal");

  /* ---- i18n: the D2 strings, both languages ---- */
  const payKeys = Object.keys(i18n.en).filter((k) => k.startsWith("pay."));
  const slipKeys = Object.keys(i18n.en).filter((k) => k.startsWith("slip."));
  check(payKeys.length === 84 && slipKeys.length === 20,
    `i18n: the hr part carries ${payKeys.length} pay.* + ${slipKeys.length} slip.* keys (84 + 20 expected)`);
  check([...payKeys, ...slipKeys].every((k) => typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0) &&
        ["fin.sal.title", "fin.sal.owed", "fin.sal.advances", "fin.sal.unassigned",
         "fin.ref.payrollAccrual", "fin.ref.payrollPayment", "fin.ref.salaryAdvance"]
          .every((k) => typeof i18n.en[k] === "string" && i18n.en[k].length > 0 &&
                       typeof i18n.ur[k] === "string" && i18n.ur[k].length > 0),
    "i18n: every D2 key present and non-empty in Urdu (parity), incl. the Finance composition + journal labels");
  check(Object.keys(i18n.en).length === 2214 && Object.keys(i18n.ur).length === 2214,
    "i18n: the dictionary now carries 2,214 keys, EN ≡ UR");

  /* ---- rules: the additive payrollRuns block (§6.2) ---- */
  const rulesD2 = fs.readFileSync(
    "/home/hatch/workspace/ai-dukaan-ai/firebase/firestore.rules", "utf8");
  const d2Seg = rulesD2.slice(
    rulesD2.indexOf("      // Phase D · D2"),
    rulesD2.indexOf("      // Expenses:"));
  check(d2Seg.includes("match /payrollRuns/{runId}") &&
        d2Seg.includes("hasRole(uid, ['owner', 'manager', 'accountant'])") &&
        d2Seg.includes("hasRole(uid, ['owner', 'accountant']) && createInOpenPeriod(uid)") &&
        d2Seg.includes("allow delete: if isOwner(uid);"),
    "rules: payrollRuns — narrowed read (o/m/a), create owner/accountant + period backstop, update o/a, delete owner-only");
  check(!d2Seg.includes("canAccess(uid)"),
    "rules: payroll reads are NARROWED — no canAccess read on payrollRuns (salary data is not counter data)");
  const strippedD2 = rulesD2.slice(0, rulesD2.indexOf("      // Phase D · D2")) +
    rulesD2.slice(rulesD2.indexOf("      // Expenses:"));
  check(crypto.createHash("sha256").update(strippedD2, "utf8").digest("hex") ===
        "00d810dfb60d0b75faf9f58f078a4720121581c07d4d2216b0c054465c67bf4a",
    "rules: stripping the D2 block reproduces the D1-state file byte-for-byte (additive only)");
}

/* -------------------------------- runner -------------------------------- */
let totalPass = 0, totalFail = 0, countProblems = 0;
for (const s of suites) {
  totalPass += s.pass; totalFail += s.fail;
  const counted = s.pass + s.fail;
  const countOk = s.expected === null || counted === s.expected;
  if (!countOk) countProblems++;
  console.log(
    `${s.name}: ${s.pass} passed, ${s.fail} failed` +
    (s.expected !== null ? ` (expected ${s.expected}, ran ${counted}${countOk ? "" : " — COUNT MISMATCH"})` : ` (${counted} checks)`)
  );
}
console.log(`TOTAL: ${totalPass} passed, ${totalFail} failed, ${totalPass + totalFail} checks`);
if (totalFail > 0 || countProblems > 0) process.exit(1);
console.log("ALL SUITES GREEN");
