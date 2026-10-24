/**
 * Phase H · H5 fixture exporter — produces fixtures/h5-core.json
 * consumed by flutter-app/test/h5_fixtures_test.dart. Every
 * expected value here is computed by the REAL compiled web
 * functions (../harness/out/whatsapp.js + loyalty + ledger +
 * plans + backup over the WA harness suite's exact cases), so
 * the Dart port is proven against TypeScript behaviour, never
 * against hand-typed expectations: the consent truth table +
 * import guard, phone/link normalisation, template rendering,
 * the udhaar FIFO positions, every audience derivation (segment
 * table + resolved lists, consent filter LAST), the suggested
 * reminders, the launch materialisation, the full queue walk
 * (confirm → opt-out-after-launch → bad number → progress →
 * cursor semantics), the queue message, the snapshot plan gates,
 * and the backup manifest/restore slice for the three WhatsApp
 * collections.
 *
 * Determinism: the WA suite builds its loyalty journal through
 * ledger.makeEntry, whose ids are wall-clock minted. The
 * derivations never read entry ids, so this exporter re-stamps
 * them (j-wa-1…) in array order before export — the fixture is
 * byte-stable and joins the CI freshness gate (app-ci.yml),
 * unlike the g6/h2 exporters whose caveat stands elsewhere.
 *
 * The pre-WA backup case is exported with BOTH verdicts: the
 * web's (not-a-backup — its computeManifest requires the wa
 * arrays) and the Dart port's expected tolerance (verifies —
 * the H3 platform-count precedent; see H5-REPORT.md).
 *
 * Regenerate: node fixtures-export-h5.js (after compiling
 * harness/tsconfig, the h2/g5/h4 pattern).
 */
const fs = require("fs");
const path = require("path");
const whatsapp = require("./out/whatsapp.js");
const loyalty = require("./out/loyalty.js");
const ledger = require("./out/ledger.js");
const plans = require("./out/plans.js");
const backup = require("./out/backup.js");
const seed = require("./out/seed.js");

const J = (v) => JSON.parse(JSON.stringify(v));
const NOW = "2026-11-15T10:00:00.000Z";
const settings = {
  shopName: "Madina General Store",
  phone: "0301-2345678",
  loyalty: { enabled: true },
  whatsapp: { serviceIntervalDays: 90 },
};

/* ---- consent: the truth table (design §3.2) ---- */
const consentCases = {
  optedInAbsent: whatsapp.customerOptedIn({ id: "x" }),
  optedInFalse: whatsapp.customerOptedIn({ id: "x", waOptIn: false }),
  optedInTrue: whatsapp.customerOptedIn({ id: "x", waOptIn: true }),
  patchCounterGrant: whatsapp.waConsentPatch("counter", true, NOW),
  patchStorefrontRevoke: whatsapp.waConsentPatch("storefront", false, NOW),
  importRow: {
    name: "Bought List", phone: "0300-0000000", waOptIn: "yes",
    waOptInAt: "2020-01-01", waOptInSource: "import",
  },
  settingsAbsent: whatsapp.resolveWaSettings({}).serviceIntervalDays,
  settings30: whatsapp.resolveWaSettings({ whatsapp: { serviceIntervalDays: 30 } }).serviceIntervalDays,
  settingsNegative: whatsapp.resolveWaSettings({ whatsapp: { serviceIntervalDays: -5 } }).serviceIntervalDays,
};
consentCases.importStripped = whatsapp.stripImportConsent(consentCases.importRow);
consentCases.importStrippedOptedIn = whatsapp.customerOptedIn(consentCases.importStripped);

/* ---- phone + links + rendering ---- */
const phoneCases = {
  intlLocal: whatsapp.waIntlPhone("0300-1112233"),
  intlPlus: whatsapp.waIntlPhone("+92 300 1112233"),
  okLocal: whatsapp.waPhoneOk("0300-1112233"),
  okStub: whatsapp.waPhoneOk("123"),
  link: whatsapp.waMeLink("0300-1112233", "Salam alaikum"),
  rendered: whatsapp.renderWaMessage(
    "Salam {name}, Rs {amount} due at {shop}; {points} pts; code {xyz}",
    { name: "Ahmad", shop: "Madina", points: 2500, amount: 3000.4 }
  ),
};

/* ---- fixtures: five customers, one of each story ---- */
const customers = [
  { id: "wa-al", name: "Ahmad Ali", phone: "0300-1112233", address: "", note: "", ts: "2026-01-01T00:00:00.000Z", waOptIn: true, waOptInAt: "2026-10-01T00:00:00.000Z", waOptInSource: "counter" },
  { id: "wa-bina", name: "Bilal Hussain", phone: "0321-4445566", address: "", note: "", ts: "2026-01-01T00:00:00.000Z", waOptIn: true, waOptInAt: "2026-10-02T00:00:00.000Z", waOptInSource: "storefront" },
  { id: "wa-cid", name: "Chaudhry Iqbal", phone: "0333-7778899", address: "", note: "", ts: "2026-01-01T00:00:00.000Z" },
  { id: "wa-dal", name: "Daud Khan", phone: "0345-9990011", address: "", note: "", ts: "2026-01-01T00:00:00.000Z", waOptIn: true, waOptInAt: "2026-10-03T00:00:00.000Z", waOptInSource: "counter" },
  { id: "wa-eza", name: "Ehsan Ullah", phone: "123", address: "", note: "", ts: "2026-01-01T00:00:00.000Z", waOptIn: true, waOptInAt: "2026-10-04T00:00:00.000Z", waOptInSource: "counter" },
];
const credits = [
  { id: "cr-al-1", customerId: "wa-al", customerName: "Ahmad Ali", customerPhone: "0300-1112233", kind: "credit", amount: 5000, note: "", dayOffset: 20, ts: "2026-10-26T00:00:00.000Z" },
  { id: "cr-al-2", customerId: "wa-al", customerName: "Ahmad Ali", customerPhone: "0300-1112233", kind: "repayment", amount: 2000, note: "", dayOffset: 5, ts: "2026-11-10T00:00:00.000Z" },
  { id: "cr-bi-1", customerId: "wa-bina", customerName: "Bilal Hussain", customerPhone: "0321-4445566", kind: "credit", amount: 1000, note: "", dayOffset: 40, ts: "2026-10-06T00:00:00.000Z" },
  { id: "cr-bi-2", customerId: "wa-bina", customerName: "Bilal Hussain", customerPhone: "0321-4445566", kind: "credit", amount: 500, note: "", dayOffset: 3, ts: "2026-11-12T00:00:00.000Z" },
  { id: "cr-bi-3", customerId: "wa-bina", customerName: "Bilal Hussain", customerPhone: "0321-4445566", kind: "repayment", amount: 1200, note: "", dayOffset: 1, ts: "2026-11-14T00:00:00.000Z" },
  { id: "cr-ci-1", customerId: "wa-cid", customerName: "Chaudhry Iqbal", customerPhone: "0333-7778899", kind: "credit", amount: 9000, note: "", dayOffset: 30, ts: "2026-10-16T00:00:00.000Z" },
];

/* loyalty journal: real H1 earn entries for al (gold, expiring)
 * and bina (standard, fresh) — the WA suite's recipe verbatim. */
const journalRaw = [];
const earnFor = (cid, billId, total, ts) => {
  journalRaw.push(ledger.makeEntry(`Bill #${billId}`, "bill", billId, [
    { account: "cash", debit: total, credit: 0 },
    { account: "cogs", debit: Math.round(total * 0.6), credit: 0 },
    { account: "sales_revenue", debit: 0, credit: total },
    { account: "inventory", debit: 0, credit: Math.round(total * 0.6) },
  ], { ts }));
  const earn = loyalty.buildLoyaltyEarnEntry({
    journal: journalRaw,
    bill: { id: billId, billNo: 1, customerId: cid, total },
    settings: loyalty.resolveLoyaltySettings({ loyalty: { enabled: true } }),
    ts,
  });
  if (earn) journalRaw.push(earn);
  return earn;
};
const earnAl = earnFor("wa-al", "wa-b-al", 250000, "2025-11-20T05:00:00.000Z");
earnFor("wa-bina", "wa-b-bi", 10000, "2026-10-01T05:00:00.000Z");
/* Re-stamp the wall-clock ids deterministically (see header). */
const journal = journalRaw.map((e, i) => ({ ...e, id: `j-wa-${i + 1}` }));
const earnAlEntry = journal.find((e) => e.refType === "loyalty_earn" && e.refId === "wa-b-al");

const data = {
  customers,
  credits,
  journal,
  bills: [
    { id: "wa-bill-al", customerId: "wa-al", status: "paid", ts: "2026-11-10T05:00:00.000Z", total: 1200 },
    { id: "wa-bill-bi", customerId: "wa-bina", status: "paid", ts: "2026-08-01T05:00:00.000Z", total: 800 },
  ],
  saleOrders: [
    { id: "wa-so-1", customerId: "wa-bina", sourceType: "storefront" },
    { id: "wa-so-2", customerId: "wa-al", sourceType: "phone" },
  ],
  jobs: [
    { id: "wa-job-al", customerId: "wa-al", status: "delivered", ts: "2026-07-01T05:00:00.000Z" },
    { id: "wa-job-bi", customerId: "wa-bina", status: "delivered", ts: "2026-11-01T05:00:00.000Z" },
  ],
  settings,
  nowISO: NOW,
};

const udhaarCases = {
  al: whatsapp.customerUdhaarPosition(credits, "wa-al"),
  bina: whatsapp.customerUdhaarPosition(credits, "wa-bina"),
};

/* ---- audiences: segment table + resolved lists ---- */
const audiences = [
  { kind: "all_opted_in" },
  { kind: "udhaar_outstanding", minRs: 1, minDays: 7 },
  { kind: "points_expiring", withinDays: 7 },
  { kind: "tier", tier: "gold" },
  { kind: "tier", tier: "silver" },
  { kind: "inactive", days: 60 },
  { kind: "storefront_customers" },
  { kind: "service_due" },
];
const segmentCases = [];
for (const aud of audiences) {
  for (const c of customers) {
    segmentCases.push({
      audience: aud,
      customerId: c.id,
      matches: whatsapp.waSegmentMatches(aud, c, data),
    });
  }
}
const audienceCases = audiences.map((aud) => ({
  audience: aud,
  ids: whatsapp.resolveWaAudience(aud, data).map((c) => c.id),
  count: whatsapp.waAudienceCount(aud, data),
}));
const suggestions = whatsapp.waSuggestedReminders(data);

/* ---- launch + the queue walk (the WA suite's sequence) ---- */
const campaign = {
  id: "wac-1", name: "Fixture campaign", templateId: "wat-1",
  audience: { kind: "all_opted_in" }, resolvedCount: null,
  createdBy: "owner-1", ts: NOW, state: "draft",
};
let n = 0;
const plan = whatsapp.planWaLaunch(campaign, data, () => `was-${++n}`);
const byId = (arr, id) => arr.find((s) => s.id === id);
let sends = [...plan.sends];
const step1 = whatsapp.waQueueStep(sends, customers, null);
const opened = whatsapp.waSendTransition(step1.send, "opened", customers[0]);
const sent = whatsapp.waSendTransition(opened, "sent", customers[0]);
sends = sends.map((s) => (s.id === "was-1" ? sent : s));
const binaSent = whatsapp.waSendTransition(byId(sends, "was-2"), "sent", customers[1]);
sends = sends.map((s) => (s.id === "was-2" ? binaSent : s));
const customersAfterOptOut = customers.map((c) =>
  c.id === "wa-dal" ? { ...c, ...whatsapp.waConsentPatch("counter", false, NOW) } : c);
const stepDal = whatsapp.waQueueStep(sends, customersAfterOptOut, null);
const dalLanded = whatsapp.waSendTransition(
  stepDal.send, "sent", customersAfterOptOut.find((c) => c.id === "wa-dal"));
sends = sends.map((s) => (s.id === "was-3" ? dalLanded : s));
const stepEza = whatsapp.waQueueStep(sends, customersAfterOptOut, null);
const ezaLanded = whatsapp.waSendTransition(
  stepEza.send, "opened", customersAfterOptOut.find((c) => c.id === "wa-eza"));
sends = sends.map((s) => (s.id === "was-4" ? ezaLanded : s));
const queueCases = {
  campaign,
  planSends: J(plan.sends),
  resolvedCount: plan.resolvedCount,
  step1: { sendId: step1.send.id, action: step1.action },
  openedState: opened.state,
  sentState: sent.state,
  binaSentState: binaSent.state,
  stepDal: { sendId: stepDal.send.id, action: stepDal.action },
  dalLandedState: dalLanded.state,
  stepEza: { sendId: stepEza.send.id, action: stepEza.action },
  ezaLandedState: ezaLanded.state,
  finalSends: J(sends),
  progress: whatsapp.waCampaignProgress(sends),
  stepAfterCompleteIsNull: whatsapp.waQueueStep(sends, customersAfterOptOut, null) === null,
  cursorAfterWas1: whatsapp.waQueueStep(plan.sends, customers, "was-1").send.id,
  headWithoutCursor: whatsapp.waQueueStep(plan.sends, customers, null).send.id,
  planSendsStillQueued: plan.sends.every((s) => s.state === "queued"),
  message: whatsapp.waQueueMessage(
    "Assalam-o-Alaikum {name}, Rs {amount} outstanding at {shop}; you have {points} points.",
    customers[0], data),
  recheckGoneCustomer: whatsapp.waSendRecheck(plan.sends[0], undefined),
};

/* ---- plan gates: the snapshot governs ---- */
const basicView = {
  snapshot: plans.snapshotFor("basic", "2026-10-06T00:00:00.000Z", { assignedBy: "signup" }),
  enforce: true, suspended: false, state: "active", counters: null,
};
const standardView = {
  snapshot: plans.snapshotFor("standard", "2026-10-06T00:00:00.000Z", { assignedBy: "signup" }),
  enforce: true, suspended: false, state: "active", counters: null,
};
const gateCases = {
  basicSnapshot: J(basicView.snapshot),
  standardSnapshot: J(standardView.snapshot),
  catalogueStandardHasWhatsapp: plans.tierIncludesModule("standard", "whatsapp"),
  moduleBasic: whatsapp.waModuleAllowed(basicView),
  moduleStandard: whatsapp.waModuleAllowed(standardView),
  sendingStandard: whatsapp.waSendingAllowed(standardView),
  moduleGrace: whatsapp.waModuleAllowed({ ...standardView, state: "grace" }),
  sendingGrace: whatsapp.waSendingAllowed({ ...standardView, state: "grace" }),
  sendingSuspendedState: whatsapp.waSendingAllowed({ ...standardView, state: "suspended" }),
  moduleNull: whatsapp.waModuleAllowed(null),
  sendingNull: whatsapp.waSendingAllowed(null),
};

/* ---- backup: the manifest gains the three collections ---- */
const seedJournal = seed.getSeedJournal(
  seed.getSeedProducts(), seed.getSeedSales(), seed.getSeedPurchases(),
  seed.getSeedSupplierPayments(), seed.getSeedExpenses(), seed.getSeedCredits()
);
const emptyCols = Object.fromEntries(backup.TENANT_COLLECTIONS.map((nm) => [nm, []]));
emptyCols.journal = J(seedJournal);
const tplDoc = { id: "wat-1", name: "Fixture offer", kind: "promo", body: "Salam {name}", createdBy: "owner-1", ts: NOW };
const campDoc = { ...campaign, state: "done", resolvedCount: 4 };
const sendDoc = { id: "was-1", campaignId: "wac-1", customerId: "wa-al", phone: "0300-1112233", state: "sent", ts: NOW };
emptyCols.waTemplates = [tplDoc];
emptyCols.waCampaigns = [campDoc];
emptyCols.waSends = [sendDoc];
const file = backup.assembleBackup({
  businessId: "bizWA", exportedAt: NOW, exportedBy: "web",
  owner: { shopName: "Madina General Store", staffEmails: [], staff: [] },
  collections: emptyCols,
  platform: { registry: null, counters: null, stats: null, members: [], invites: [], events: [], payments: [], storefront: null },
});
const restorePlan = backup.planRestore({
  file, targetBusinessId: "bizWA2",
  target: { ...backup.emptyNamespace(), owner: { shopName: "New Shop", staffEmails: [], staff: [] } },
  actorUid: "bizWA2", nowISO: NOW,
});
const restored = backup.applyRestoreWrites(backup.emptyNamespace(), "bizWA2", restorePlan.writes);
/* A pre-WA file: the same file with the wa arrays + counts cut
 * and totalDocs as the pre-WA assembler would have computed it
 * (the three wa docs were never in it). */
const preWaFile = JSON.parse(JSON.stringify(file));
delete preWaFile.collections.waTemplates;
delete preWaFile.collections.waCampaigns;
delete preWaFile.collections.waSends;
delete preWaFile.manifest.counts.waTemplates;
delete preWaFile.manifest.counts.waCampaigns;
delete preWaFile.manifest.counts.waSends;
preWaFile.manifest.totalDocs -= 3;
const backupCases = {
  tenantCollections: [...backup.TENANT_COLLECTIONS],
  tplDoc, campDoc, sendDoc,
  file: J(file),
  fileVerifies: backup.verifyBackup(file).ok === true,
  planOk: restorePlan.ok === true,
  waWritePaths: ["waTemplates/wat-1", "waCampaigns/wac-1", "waSends/was-1"].map((tail) => ({
    tail,
    planned: restorePlan.writes.some((w) => w.kind === "set" && w.path === `users/bizWA2/${tail}`),
  })),
  roundTrip: {
    tpl: backup.docsEqual(restored.collections.waTemplates[0], tplDoc),
    camp: backup.docsEqual(restored.collections.waCampaigns[0], campDoc),
    send: backup.docsEqual(restored.collections.waSends[0], sendDoc),
  },
  preWaFile,
  webVerdictOnPreWaFile: backup.verifyBackup(preWaFile).problem ?? null,
};

const out = {
  about:
    "H5 core fixture — expected values computed by the compiled web lib/whatsapp (+ loyalty + ledger + plans + backup) over the WA harness suite's cases; consumed by flutter-app/test/h5_fixtures_test.dart. Regenerate: node fixtures-export-h5.js (after compiling harness/tsconfig).",
  now: NOW,
  settings,
  consentCases,
  phoneCases,
  customers,
  credits,
  journal,
  earnAlPoints: earnAl ? earnAl.points : null,
  earnAlEntry: J(earnAlEntry),
  data: J(data),
  udhaarCases,
  segmentCases,
  audienceCases,
  suggestions,
  queueCases,
  gateCases,
  backupCases,
};
const dest = path.join(__dirname, "fixtures", "h5-core.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log("wrote", dest);
