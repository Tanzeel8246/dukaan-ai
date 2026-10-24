/**
 * Golden-fixture export for ERP Phase F · F3 (design §8.2, §9 F3:
 * "production + transfer fixtures green; WIP/stock identities join
 * §8"). Dev-only tooling — no app behaviour changes. Companion to
 * fixtures-export.js (F1) and fixtures-export-f2.js (F2), both
 * untouched: their outputs must stay byte-stable.
 *
 * This file composes the F3 scenarios through the REAL compiled
 * web/lib Phase C functions (lib/stock, lib/transfers, lib/boms,
 * lib/production, lib/jobs) — the same functions the web store
 * calls — and writes canonical JSON the Dart suite asserts
 * against: journal entries byte-for-byte (memo / refType / refId /
 * lines), production events (entryId normalised to the entry's
 * position label), and the derived figures (pools, in-transit,
 * availability partitions, drift + recount, job profit).
 *
 * Run AFTER the harness compile:
 *   cd ../web && npx tsc -p ../harness/tsconfig.json
 *   node ../harness/harness.js            (must stay ALL SUITES GREEN)
 *   node ../harness/fixtures-export-f3.js (writes fixtures/f3-core.json)
 *
 * Self-checks: the whole F3 fixture journal's trial balance is 0;
 * the production cycle ends with GL wip == Σ pools == 0; the
 * transfer quantity identity (Σ rows + in-transit == stockQty)
 * holds at every exported step.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const ST = require("./out/stock.js");
const TR = require("./out/transfers.js");
const BO = require("./out/boms.js");
const PR = require("./out/production.js");
const JB = require("./out/jobs.js");
const L = require("./out/ledger.js");

/* ---------------- fixture shop (F1 shop + manufacturing) ---------------- */

const f1 = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "f1-core.json"), "utf8")
);
const accounts = f1.accounts;
const products = [
  ...f1.products,
  { id: "p-pack", name: "Packing Box", salePrice: 40, costPrice: 20, stockQty: 100, reorderLevel: 10, stockClass: null },
  { id: "p-blend", name: "House Tea Blend 500g", salePrice: 950, costPrice: 0, stockQty: 0, reorderLevel: 5, stockClass: null },
];
const byId = new Map(products.map((p) => [p.id, p]));
const customer = f1.customer;

const warehouses = [
  { id: "wh-main", name: "Main Warehouse", note: "", isDefault: true, archived: false, sortOrder: 0, ts: "2026-01-01T00:00:00.000Z" },
  { id: "wh-godown", name: "Godown — Shahdara", note: "", isDefault: false, archived: false, sortOrder: 1, ts: "2026-01-01T00:00:00.000Z" },
];

/** Post-migration levels: every product's whole stock at wh-main. */
const baseLevels = products.map((p) => ST.makeLevel("wh-main", p.id, p.stockQty));

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
const bomV2 = { ...bomV1, id: "bom-2", version: 2, active: false, labourCost: 350 };

/* ---------------- entry / event normalisation (F1 style) ---------------- */

function normEntry(e) {
  return {
    memo: e.memo, refType: e.refType, refId: e.refId, reversesId: e.reversesId ?? null,
    lines: e.lines.map((l) => ({ account: l.account, debit: l.debit, credit: l.credit, ref: l.ref ?? null })),
  };
}

/** Production events cite their entry by id; normalise the id to
 *  the entry's position label within the scenario (e0, e1, …) and
 *  pin the wall-clock ts the web composition stamped. */
function normProdEvent(ev, entryIds) {
  return {
    kind: ev.kind, qty: ev.qty,
    lines: ev.lines ?? null,
    labourCost: ev.labourCost ?? null, overheadCost: ev.overheadCost ?? null,
    paidFromAccountId: ev.paidFromAccountId ?? null,
    value: ev.value, entryId: entryIds.get(ev.entryId) ?? "EXT",
  };
}

function normJobEvent(ev, entryIds) {
  return {
    kind: ev.kind, productId: ev.productId, name: ev.name, qty: ev.qty,
    unitCost: ev.unitCost, value: ev.value, entryId: entryIds.get(ev.entryId) ?? "EXT",
  };
}

const scenarios = [];
const push = (id, title, docs, entries, extra = {}) =>
  scenarios.push({ id, title, docs, entries: entries.map(normEntry), ...extra });

/* ==================================================================
 * S1 — transfer close-short, goods class (the loss posts, §2.3)
 * ================================================================== */
{
  const transfer = {
    id: "tr-1", number: "TR-1", fromWarehouseId: "wh-main", toWarehouseId: "wh-godown",
    lines: [{ productId: "p-sugar", name: "Sugar 1kg", qtySent: 10, qtyReceived: 9 }],
    note: "", status: "partially_received", dayOffset: 0, ts: "2026-10-23T08:00:00.000Z",
  };
  const shortages = TR.transferShortages(transfer);
  const entry = TR.buildTransferLossEntry(transfer, shortages, byId);
  push("transfer-loss-goods", "Close-short of a goods line posts Dr inventory_loss / Cr inventory", {
    transfer,
    shortages,
    lossValue: TR.transferLossValue(shortages, byId),
    inTransitBefore: Object.fromEntries(TR.inTransitByProduct([transfer])),
  }, [entry]);
}

/* ==================================================================
 * S2 — transfer close-short, raw class (loss credits inventory_raw)
 * ================================================================== */
{
  const transfer = {
    id: "tr-2", number: "TR-2", fromWarehouseId: "wh-main", toWarehouseId: "wh-godown",
    lines: [{ productId: "p-raw", name: "Raw Tea Leaf 1kg", qtySent: 4, qtyReceived: 3 }],
    note: "", status: "partially_received", dayOffset: 0, ts: "2026-10-23T08:30:00.000Z",
  };
  const shortages = TR.transferShortages(transfer);
  const entry = TR.buildTransferLossEntry(transfer, shortages, byId);
  push("transfer-loss-raw", "Close-short of a raw line credits inventory_raw", {
    transfer, shortages, lossValue: TR.transferLossValue(shortages, byId),
  }, [entry]);
}

/* ==================================================================
 * S3 — production full cycle, labour PAID from the till (§4.2/§4.4)
 * issue → partial completion → scrap → final completion; the
 * final completion absorbs the pool to EXACTLY zero.
 * ================================================================== */
function productionScenario({ id, title, orderId, number, plannedQty, steps }) {
  let order = {
    id: orderId, number, bomId: bomV1.id, bomVersion: 1,
    bomSnapshot: PR.snapshotOfBom(bomV1),
    outputProductId: "p-blend", outputName: "House Tea Blend 500g",
    warehouseId: "wh-main", plannedQty, events: [], note: "", status: "open",
    dayOffset: 0, ts: "2026-10-23T09:00:00.000Z",
  };
  const entries = [];
  const entryIds = new Map();
  const stepDocs = [];
  const label = (entry) => {
    const l = `e${entries.length}`;
    entryIds.set(entry.id, l);
    entries.push(entry);
    return l;
  };
  for (const step of steps) {
    if (step.kind === "issue") {
      const res = PR.prepareIssue(order, products, baseLevels, warehouses, accounts, step.input);
      if ("problem" in res) throw new Error(`${id}: issue refused: ${res.problem}`);
      label(res.prepared.entry);
      order = { ...order, events: [...order.events, res.prepared.event] };
      order = { ...order, status: PR.deriveProductionStatus(order) };
      stepDocs.push({
        kind: "issue", entry: normEntry(res.prepared.entry),
        event: normProdEvent(res.prepared.event, entryIds),
        poolAfter: PR.poolOf(order), producedAfter: PR.producedQty(order), statusAfter: order.status,
      });
    } else if (step.kind === "completion") {
      const res = PR.completionAbsorb(order, step.qty, step.final ?? false);
      if ("problem" in res) throw new Error(`${id}: completion refused: ${res.problem}`);
      const entry = PR.buildCompletionEntry(order, step.qty, res.value);
      label(entry);
      const event = { kind: "completion", qty: step.qty, value: res.value, entryId: entry.id, dayOffset: 0, ts: "2026-10-23T09:00:00.000Z" };
      order = { ...order, events: [...order.events, event] };
      order = { ...order, status: PR.deriveProductionStatus(order) };
      stepDocs.push({
        kind: "completion", entry: normEntry(entry),
        event: normProdEvent(event, entryIds),
        value: res.value, unitCost: res.unitCost,
        poolAfter: PR.poolOf(order), producedAfter: PR.producedQty(order), statusAfter: order.status,
      });
    } else if (step.kind === "scrap") {
      const res = PR.scrapAbsorb(order, step.qty);
      if ("problem" in res) throw new Error(`${id}: scrap refused: ${res.problem}`);
      const entry = PR.buildScrapEntry(order, step.qty, res.value, "scrap");
      label(entry);
      const event = { kind: "scrap", qty: step.qty, value: res.value, entryId: entry.id, dayOffset: 0, ts: "2026-10-23T09:00:00.000Z" };
      order = { ...order, events: [...order.events, event] };
      order = { ...order, status: PR.deriveProductionStatus(order) };
      stepDocs.push({
        kind: "scrap", entry: normEntry(entry),
        event: normProdEvent(event, entryIds),
        value: res.value,
        poolAfter: PR.poolOf(order), producedAfter: PR.producedQty(order), statusAfter: order.status,
      });
    } else if (step.kind === "closeout") {
      const pool = PR.poolOf(order);
      const entry = PR.buildScrapEntry(order, 0, pool, "closeout");
      label(entry);
      const event = { kind: "closeout", qty: 0, value: pool, entryId: entry.id, dayOffset: 0, ts: "2026-10-23T09:00:00.000Z" };
      order = { ...order, events: [...order.events, event] };
      stepDocs.push({
        kind: "closeout", entry: normEntry(entry),
        event: normProdEvent(event, entryIds),
        value: pool,
        poolAfter: PR.poolOf(order), producedAfter: PR.producedQty(order),
        // The store's close label (§4.2): produced > 0 ⇒ completed.
        statusAfter: PR.producedQty(order) > 0 ? "completed" : "cancelled",
      });
      order = { ...order, status: stepDocs[stepDocs.length - 1].statusAfter };
    }
  }
  return { order, entries, stepDocs };
}

{
  const { order, entries, stepDocs } = productionScenario({
    id: "production-cycle-paid", title: "x", orderId: "pr-1", number: "PR-1", plannedQty: 20,
    steps: [
      { kind: "issue", input: { runQty: 20, lines: PR.defaultIssueLines({ bomSnapshot: PR.snapshotOfBom(bomV1) }, 20), labourCost: 600, overheadCost: 200, settlement: "paid", paidFromAccountId: "acct-till" } },
      { kind: "completion", qty: 12, final: false },
      { kind: "scrap", qty: 2 },
      { kind: "completion", qty: 8, final: false },
    ],
  });
  push("production-cycle-paid",
    "Issue (paid) → partial completion → scrap → final completion absorbs the pool to exactly zero",
    { steps: stepDocs, finalOrder: { ...order, events: order.events.map((e) => normProdEvent(e, new Map(entries.map((en, i) => [en.id, `e${i}`])))) } },
    entries,
    { wipIdentity: { glWip: null, sumPools: PR.poolOf(order) } });
}

/* ==================================================================
 * S4 — production, labour ACCRUED + over-production (§4.4)
 * ================================================================== */
{
  const { order, entries, stepDocs } = productionScenario({
    id: "production-accrue-overproduce", title: "x", orderId: "pr-2", number: "PR-2", plannedQty: 10,
    steps: [
      { kind: "issue", input: { runQty: 10, lines: PR.defaultIssueLines({ bomSnapshot: PR.snapshotOfBom(bomV1) }, 10), labourCost: 300, overheadCost: 100, settlement: "accrue" } },
      { kind: "completion", qty: 12, final: false },
    ],
  });
  push("production-accrue-overproduce",
    "Issue accrued to salary_payable; producing past the plan is a final completion spreading the whole pool",
    { steps: stepDocs, finalPool: PR.poolOf(order), finalProduced: PR.producedQty(order), finalStatus: order.status },
    entries);
}

/* ==================================================================
 * S5 — production close-out: residual pool to inventory_loss (§4.2)
 * ================================================================== */
{
  const { order, entries, stepDocs } = productionScenario({
    id: "production-closeout", title: "x", orderId: "pr-3", number: "PR-3", plannedQty: 10,
    steps: [
      { kind: "issue", input: { runQty: 10, lines: PR.defaultIssueLines({ bomSnapshot: PR.snapshotOfBom(bomV1) }, 10), labourCost: 300, overheadCost: 100, settlement: "paid", paidFromAccountId: "acct-jazz" } },
      { kind: "completion", qty: 4, final: false },
      { kind: "closeout" },
    ],
  });
  push("production-closeout",
    "A half-produced order closes: the residual WIP pool posts to inventory_loss exactly",
    { steps: stepDocs, finalPool: PR.poolOf(order), finalStatus: order.status },
    entries);
}

/* ==================================================================
 * S6 — job materials cycle + profit (§5.3/§5.5)
 * ================================================================== */
{
  const job = {
    id: "job-1", number: "JB-1", customerId: customer.id, customerName: customer.name,
    customerPhone: customer.phone, title: "Wedding cards × 500", description: "",
    stage: "In Progress", status: "in_progress", dueDateISO: null,
    warehouseId: "wh-main", materialEvents: [], labourCost: 1000, note: "",
    dayOffset: 0, ts: "2026-10-23T09:30:00.000Z",
  };
  const entries = [];
  const entryIds = new Map();
  const issue = JB.prepareMaterialEvent(job, products, baseLevels, warehouses, "issue",
    [{ productId: "p-sugar", qty: 5 }, { productId: "p-pack", qty: 10 }, { productId: "p-raw", qty: 1 }]);
  if ("problem" in issue) throw new Error(`job issue refused: ${issue.problem}`);
  entryIds.set(issue.prepared.entry.id, "e0");
  entries.push(issue.prepared.entry);
  const jobAfterIssue = { ...job, materialEvents: [...issue.prepared.events] };
  const ret = JB.prepareMaterialEvent(jobAfterIssue, products, baseLevels, warehouses, "return",
    [{ productId: "p-sugar", qty: 2 }]);
  if ("problem" in ret) throw new Error(`job return refused: ${ret.problem}`);
  entryIds.set(ret.prepared.entry.id, "e1");
  entries.push(ret.prepared.entry);
  const jobFinal = { ...jobAfterIssue, materialEvents: [...jobAfterIssue.materialEvents, ...ret.prepared.events] };

  const citingBill = {
    id: "bill-job-1", billNo: 41, sourceType: "job", sourceId: "job-1", status: "paid",
    total: 5000, ts: "2026-10-23T11:00:00.000Z",
    items: [{ productId: "p-blend", name: "House Tea Blend 500g", qty: 10, unitPrice: 500, unitCost: 405, total: 5000 }],
  };
  const credits = [
    { id: "cr-adv-1", customerId: customer.id, kind: "repayment", amount: 2000, note: JB.advanceNoteFor(jobFinal) },
    { id: "cr-adv-2", customerId: customer.id, kind: "repayment", amount: 500, note: "Advance — Job JB-9" },
    { id: "cr-cr-1", customerId: customer.id, kind: "credit", amount: 700, note: JB.advanceNoteFor(jobFinal) },
  ];
  push("job-materials-cycle",
    "Job material issue (two class legs) + partial return mirror; profit derived per §5.5",
    {
      job: { ...jobFinal, materialEvents: jobFinal.materialEvents.map((e) => normJobEvent(e, entryIds)) },
      issueValue: issue.prepared.value, returnValue: ret.prepared.value,
      materialsCost: JB.jobMaterialsCost(jobFinal),
      netQty: { "p-sugar": JB.jobMaterialNetQty(jobFinal, "p-sugar"), "p-pack": JB.jobMaterialNetQty(jobFinal, "p-pack"), "p-raw": JB.jobMaterialNetQty(jobFinal, "p-raw") },
      advanceTotal: JB.jobAdvanceTotal(jobFinal, credits),
      credits,
      citingBill,
      profit: JB.jobProfitFigures(jobFinal, [citingBill]),
    },
    entries);
}

/* ==================================================================
 * S7 — class reclass entries (§4.1)
 * ================================================================== */
{
  const oil = byId.get("p-oil");
  const raw = byId.get("p-raw");
  const a = TR.buildReclassEntry(oil, "raw", oil.stockQty, oil.costPrice);
  const b = TR.buildReclassEntry(raw, null, raw.stockQty, raw.costPrice);
  const nullSame = TR.buildReclassEntry(oil, null, oil.stockQty, oil.costPrice);
  const nullZero = TR.buildReclassEntry(oil, "raw", 0, oil.costPrice);
  push("class-reclass",
    "Class change with stock on hand moves the shelf value between class accounts in one entry",
    { nullCases: [nullSame === null, nullZero === null] },
    [a, b]);
}

/* ==================================================================
 * Derivations section — stock / transfers / BOM / production / jobs
 * ================================================================== */
const ops = (() => {
  // --- stock resolution (§1.3) ---
  const tea = byId.get("p-tea");
  const noRows = {
    atDefault: ST.qtyAtWarehouse(tea, [], warehouses, "wh-main"),
    atGodown: ST.qtyAtWarehouse(tea, [], warehouses, "wh-godown"),
  };
  const godownOnly = [ST.makeLevel("wh-godown", "p-tea", 5)];
  const withRows = {
    atDefault: ST.qtyAtWarehouse(tea, godownOnly, warehouses, "wh-main"),
    atGodown: ST.qtyAtWarehouse(tea, godownOnly, warehouses, "wh-godown"),
  };
  const v1Rows = ST.stockV1Rows(
    [{ id: "p-tea", stockQty: 50 }, { id: "p-sugar", stockQty: 100 }],
    [ST.makeLevel("wh-godown", "p-sugar", 3)]
  );

  // --- promised partition + availability (§1.6) ---
  const order = {
    id: "so-1", status: "confirmed", warehouseId: "wh-godown",
    lines: [{ productId: "p-tea", name: "Tapal Danedar Tea 475g", qty: 10, unitPrice: 900 }],
  };
  const challan = {
    id: "dc-1", orderId: null, status: "dispatched", warehouseId: null,
    lines: [{ productId: "p-tea", name: "Tapal Danedar Tea 475g", qty: 3, unitPrice: 900 }],
  };
  const billForOrder = {
    id: "bill-so-1", status: "paid", sourceType: "order", sourceId: "so-1",
    items: [{ productId: "p-tea", qty: 4 }],
  };
  const teaLevels = [ST.makeLevel("wh-main", "p-tea", 45), ST.makeLevel("wh-godown", "p-tea", 5)];
  const availMain = ST.availabilityByProductAtWarehouse(products, teaLevels, warehouses, [order], [challan], [billForOrder], "wh-main").get("p-tea");
  const availGodown = ST.availabilityByProductAtWarehouse(products, teaLevels, warehouses, [order], [challan], [billForOrder], "wh-godown").get("p-tea");

  // --- in-transit / incoming (§2.2) ---
  const openTransfer = {
    id: "tr-x", number: "TR-9", fromWarehouseId: "wh-main", toWarehouseId: "wh-godown",
    lines: [{ productId: "p-tea", name: "Tapal Danedar Tea 475g", qtySent: 5, qtyReceived: 0 }],
    note: "", status: "dispatched", dayOffset: 0, ts: "2026-10-23T08:00:00.000Z",
  };
  const transit = {
    byProduct: Object.fromEntries(TR.inTransitByProduct([openTransfer])),
    total: TR.inTransitTotalQty([openTransfer]),
    between: TR.inTransitBetween([openTransfer], "wh-main", "wh-godown"),
    incomingGodown: Object.fromEntries(TR.incomingByProductAtWarehouse([openTransfer], "wh-godown")),
  };

  // --- drift + recount (§1.7) ---
  const driftLevels = [ST.makeLevel("wh-main", "p-tea", 42), ST.makeLevel("wh-godown", "p-tea", 5)];
  const drift = ST.stockDrift([{ id: "p-tea", stockQty: 50 }], driftLevels, [openTransfer]);
  const recounted = ST.recountLevels([{ id: "p-tea", stockQty: 50 }], driftLevels, warehouses, [openTransfer]);

  // --- transfer composition helpers (§2) ---
  const composed = TR.composeTransferLines(products, [
    { productId: "p-sugar", qty: 2 }, { productId: "p-sugar", qty: 3 }, { productId: "p-tea", qty: 1 },
  ]);
  const overReceipt = TR.validateReceivePicks(openTransfer, [{ productId: "p-tea", qty: 6 }]);
  const okReceipt = TR.validateReceivePicks(openTransfer, [{ productId: "p-tea", qty: 5 }]);
  const statusCases = {
    none: TR.statusAfterReceive([{ qtySent: 5, qtyReceived: 0 }]),
    partial: TR.statusAfterReceive([{ qtySent: 5, qtyReceived: 2 }]),
    full: TR.statusAfterReceive([{ qtySent: 5, qtyReceived: 5 }]),
  };

  // --- BOM derivations (§3) ---
  const bom = {
    forOutput: BO.bomsForOutput([bomV2, bomV1], "p-blend").map((b) => b.version),
    activeVersion: BO.activeBomFor([bomV1, bomV2], "p-blend")?.version ?? null,
    nextVersion: BO.nextBomVersion([bomV1, bomV2], "p-blend"),
    batchMaterialCost: BO.bomBatchMaterialCost(bomV1, products),
    unitCost: BO.bomUnitCost(bomV1, products),
    problems: {
      outputRaw: BO.validateBomDraft(products, { outputProductId: "p-raw", outputQty: 1, labourCost: 0, overheadCost: 0, lines: [{ productId: "p-sugar", qty: 1 }] }),
      selfComponent: BO.validateBomDraft(products, { outputProductId: "p-blend", outputQty: 1, labourCost: 0, overheadCost: 0, lines: [{ productId: "p-blend", qty: 1 }] }),
      emptyLines: BO.validateBomDraft(products, { outputProductId: "p-blend", outputQty: 1, labourCost: 0, overheadCost: 0, lines: [] }),
      badQty: BO.validateBomDraft(products, { outputProductId: "p-blend", outputQty: 1, labourCost: 0, overheadCost: 0, lines: [{ productId: "p-sugar", qty: 0 }] }),
      ok: BO.validateBomDraft(products, { outputProductId: "p-blend", outputQty: 10, labourCost: 300, overheadCost: 100, lines: bomV1.lines }),
    },
  };

  // --- production desk defaults (§4.2) ---
  const draftOrder = { bomSnapshot: PR.snapshotOfBom(bomV1), plannedQty: 20 };
  const prodDefaults = {
    issueLines5: PR.defaultIssueLines(draftOrder, 5),
    conversion5: PR.defaultIssueConversion(draftOrder, 5),
  };

  // --- job stage lifecycle (§5.2) ---
  const stages = JB.effectiveJobStages({ jobStages: [" Intake ", "", "Press", "Press", "Done"] });
  const jobAt = (stage, status, materialEvents = []) => ({
    id: "job-x", number: "JB-7", stage, status, materialEvents,
  });
  const jobStages = {
    effective: stages,
    firstIs: JB.deriveJobStatus(jobAt("Intake", "open"), stages),
    lastIs: JB.deriveJobStatus(jobAt("Done", "in_progress"), stages),
    midIs: JB.deriveJobStatus(jobAt("Press", "open"), stages),
    deliveredSticky: JB.deriveJobStatus(jobAt("Intake", "delivered"), stages),
    renamedWithEvents: JB.deriveJobStatus(jobAt("Old Stage", "open", [{ kind: "issue" }]), stages),
    defaults: JB.effectiveJobStages({}),
    advanceNote: JB.advanceNoteFor({ number: "JB-7" }),
  };

  return {
    stock: { noRows, withRows, v1Rows, availMain, availGodown },
    transit, drift, recounted: { repaired: recounted.repaired, levels: recounted.levels },
    composed, overReceiptNull: overReceipt === null, okReceipt, statusCases,
    bom, prodDefaults, jobStages,
  };
})();

/* ---------------- self-checks ---------------- */

const all = scenarios.flatMap((s) => s.entries);
let failures = 0;
const tb = {};
for (const e of all) for (const l of e.lines) tb[l.account] = (tb[l.account] ?? 0) + l.debit - l.credit;
const tbTotal = Object.values(tb).reduce((a, n) => a + n, 0);
if (Math.abs(tbTotal) > 0.009) { console.error(`F3 FIXTURE SELF-CHECK FAILED: trial balance ${tbTotal}`); failures++; }
// Production identity: every F3 production scenario must end pool-free,
// so the fixture journal's wip balance is exactly 0.
if (Math.abs(tb["wip"] ?? 0) > 0.009) { console.error(`F3 FIXTURE SELF-CHECK FAILED: wip balance ${tb["wip"]} != 0`); failures++; }
if (failures) process.exit(1);

const out = {
  version: 3,
  source: "web/lib via harness/out (stock, transfers, boms, production, jobs) — the real Phase C composition + derivation functions",
  accounts, products, warehouses, bom: bomV1, customer,
  scenarios, ops,
};
const dir = path.join(__dirname, "fixtures");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "f3-core.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`f3 fixtures: ${scenarios.length} scenarios, ${all.length} entries, trial balance ${tbTotal}, wip ${tb["wip"] ?? 0} — wrote fixtures/f3-core.json`);
