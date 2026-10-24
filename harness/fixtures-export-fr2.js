/**
 * Golden-fixture export for Fix Round 2 (demo opt-in, clear-to-
 * trash, multi-business). Companions fixtures-export*.js are
 * untouched: their outputs must stay byte-stable — this exporter
 * is NEW, and deterministic by construction:
 *   - every timestamp is fixed (2026-10-24T07:00:00.000Z); the
 *     seed's today-relative `ts` values NEVER enter this file
 *     (the journal fingerprint drops `ts` by construction, and
 *     the fixture carries id sets + counts, never seed rows);
 *   - the trash round-trip case uses a fixed synthetic JSON
 *     string, not a live backup (a real backup's exportedAt +
 *     rebased seed timestamps would drift daily);
 *   - the new-business plans + skeleton use the fixed instant.
 *
 * Cases: the demo summary (the live demo business's exact
 * figures) + the cloud demo id sets + classification scenarios;
 * trash chunking + manifest + state machine cases; the
 * new-business phase plans + skeleton; the demo-set backup
 * manifest (counts + journal fingerprint) for the restore
 * round-trip the Dart tests prove.
 *
 * Run AFTER the harness compile:
 *   node ../harness/fixtures-export-fr2.js (writes fixtures/fr2-core.json)
 */
"use strict";
const fs = require("fs");
const path = require("path");

const DEMO = require("./out/demo.js");
const TRASH = require("./out/trash.js");
const TEN = require("./out/tenancy.js");
const BACKUP = require("./out/backup.js");

const NOW = "2026-10-24T07:00:00.000Z";

/* ---------------- demo set ---------------- */
const demoSummary = DEMO.demoSummary();
const demoDocs = DEMO.demoSetDocs();
const demoIdSets = {};
for (const name of DEMO.CLOUD_DEMO_COLLECTIONS) {
  demoIdSets[name] = [...(DEMO.demoSetIds()[name] ?? [])].sort();
}
const classificationScenarios = [
  { name: "empty", docs: {}, expected: "empty" },
  {
    name: "structural-only",
    docs: {
      accounts: [{ id: "acc-till" }],
      warehouses: [{ id: "wh-main" }],
    },
    expected: "empty",
  },
  {
    name: "demo-only",
    docs: Object.fromEntries(
      Object.entries(demoDocs).map(([k, v]) => [k, v.map((d) => ({ id: d.id }))])
    ),
    expected: "demo-only",
  },
  {
    name: "demo-minus-one-row",
    docs: Object.fromEntries(
      Object.entries(demoDocs).map(([k, v]) => [
        k,
        v.slice(0, Math.max(0, v.length - 1)).map((d) => ({ id: d.id })),
      ])
    ),
    expected: "demo-only",
  },
  {
    name: "real-single-product",
    docs: { products: [{ id: "p-mh123abc" }] },
    expected: "real",
  },
  {
    name: "demo-plus-real-bill",
    docs: {
      products: demoDocs.products.map((d) => ({ id: d.id })),
      bills: [{ id: "bill-real-1" }],
    },
    expected: "real",
  },
];

/* ---------------- trash ---------------- */
const sampleJson = JSON.stringify({
  kind: "dukaan-ai/business-backup",
  manifest: { businessId: "biz-fr2-sample", totalDocs: 3 },
  note: "fixed synthetic payload — the chunking round-trip case",
  pad: "x".repeat(900000),
});
const sampleChunks = TRASH.chunkBackupJson(sampleJson);
const sampleManifest = TRASH.trashManifestFor({
  trashId: "trash-fr2-sample",
  backup: {
    manifest: {
      businessId: "biz-fr2-sample",
      counts: { products: 2, journal: 1 },
      totalDocs: 4,
      journalCount: 1,
      journalFingerprint: "aa".repeat(32),
    },
  },
  clearedAtISO: NOW,
  replacedTrashId: null,
}).manifest;
const trashCases = {
  sampleJsonLength: sampleJson.length,
  chunkCount: sampleChunks.length,
  chunkLengths: sampleChunks.map((c) => c.data.length),
  reassembledEqual: TRASH.reassembleChunks(sampleChunks) === sampleJson,
  reassembledShuffledEqual:
    TRASH.reassembleChunks([...sampleChunks].reverse()) === sampleJson,
  reassembledGapNull:
    TRASH.reassembleChunks([sampleChunks[0], sampleChunks[2]]) === null,
  reassembledTruncatedNull:
    TRASH.reassembleChunks(sampleChunks.slice(0, 2), sampleChunks.length) === null,
  reassembledWrongCountNull:
    TRASH.reassembleChunks(sampleChunks, sampleChunks.length + 1) === null,
  manifest: sampleManifest,
  states: {
    atClear: TRASH.trashPanelState(sampleManifest, NOW),
    at29Days: TRASH.trashPanelState(sampleManifest, "2026-11-22T07:00:00.000Z"),
    at30DaysPlus1s: TRASH.trashPanelState(sampleManifest, "2026-11-23T07:00:01.000Z"),
    restoredPastExpiry: TRASH.trashPanelState(
      { ...sampleManifest, status: "restored" },
      "2026-12-25T07:00:00.000Z"
    ),
  },
  canRestore: {
    atClear: TRASH.canRestoreFromTrash(sampleManifest, NOW),
    expired: TRASH.canRestoreFromTrash(sampleManifest, "2026-11-23T07:00:01.000Z"),
    restored: TRASH.canRestoreFromTrash(
      { ...sampleManifest, status: "restored" },
      NOW
    ),
  },
};

/* ---------------- new business ---------------- */
const nbInput = {
  businessId: "biz-fr2-generated-001",
  ownerUid: "user-fr2-uid-001",
  ownerEmail: "owner-fr2@example.com",
  name: "Second Shop",
  phone: "0300-1112233",
  address: "Main Road",
  nowISO: NOW,
};
const newBusiness = {
  inputOk: TEN.newBusinessInputOk({ name: "Second Shop", phone: "0300-1", address: "Main Road" }),
  inputBad: TEN.newBusinessInputOk({ name: "   ", phone: "", address: "" }),
  phase1: TEN.planNewBusinessPhase1(nbInput),
  phase2: TEN.planNewBusinessPhase2(nbInput),
  skeleton: TEN.newBusinessSkeleton(nbInput),
  healed: TEN.healIndex(
    [
      { businessId: "biz-fr2-generated-001", role: "owner" },
      { businessId: "biz-fr2-gone", role: "manager" },
    ],
    { "biz-fr2-gone": null },
    ["biz-fr2-generated-001"]
  ),
  switcher: TEN.buildSwitcherList({
    own: { businessId: "user-fr2-uid-001", name: "First Shop" },
    entries: [
      { businessId: "biz-fr2-generated-001", role: "owner", own: true },
      { businessId: "biz-fr2-member", role: "manager" },
    ],
    names: {
      "biz-fr2-generated-001": "Second Shop",
      "biz-fr2-member": "A Shop",
    },
  }),
};

/* ---------------- demo-set backup manifest ---------------- */
/* The manifest over the demo set (owner = the skeleton doc):
 * counts + journal fingerprint only — the ts-dropped fingerprint
 * is day-stable, unlike any raw seed row. */
const demoBackup = BACKUP.assembleBackup({
  businessId: "biz-fr2-demo",
  exportedAt: NOW,
  exportedBy: "web",
  owner: { shopName: "Demo Shop", demoState: "seeded" },
  collections: demoDocs,
  platform: {
    registry: null,
    members: [],
    invites: [],
    counters: null,
    stats: null,
    events: [],
    payments: [],
    storefront: null,
    storeOrders: [],
  },
});
const backupManifest = {
  counts: demoBackup.manifest.counts,
  totalDocs: demoBackup.manifest.totalDocs,
  journalCount: demoBackup.manifest.journalCount,
  journalFingerprint: demoBackup.manifest.journalFingerprint,
  verified: BACKUP.verifyBackup(demoBackup).ok,
};

const out = {
  demoSummary,
  demoIdSets,
  classificationScenarios: classificationScenarios.map((s) => ({
    name: s.name,
    docs: s.docs,
    expected: s.expected,
    actual: DEMO.classifyBusinessContent(s.docs),
  })),
  trashCases,
  newBusiness,
  backupManifest,
};
fs.writeFileSync(
  path.join(__dirname, "fixtures", "fr2-core.json"),
  JSON.stringify(out, null, 1) + "\n"
);
console.log("wrote fixtures/fr2-core.json");
