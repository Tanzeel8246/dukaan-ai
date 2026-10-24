/**
 * Phase G · G6 fixture exporter — produces fixtures/g6-core.json
 * consumed by flutter-app/test/g6_fixtures_test.dart. Every
 * expected value here is computed by the REAL compiled web
 * functions (../harness/out/backup.js over the B1 seed getters),
 * so the Dart port is proven against TypeScript behaviour, never
 * against hand-typed expectations: SHA-256 known answers, the
 * journal fingerprint (incl. the frozen seed SHA), one assembled
 * backup file, tampered-file variants with their verify outcomes,
 * and the restore planner's truth table (fresh / altered / extra /
 * resumed / completed targets with exact write paths).
 */
const fs = require("fs");
const path = require("path");
const backup = require("./out/backup.js");
const seed = require("./out/seed.js");
const tenancy = require("./out/tenancy.js");
const periods = require("./out/periods.js");

const J = (v) => JSON.parse(JSON.stringify(v));
const NOW = "2026-10-15T10:00:00.000Z";

/* Phase H · H6 (audit fix 4) — determinism, by construction.
 * The seed getters re-base their timestamps against TODAY (the
 * demo's rolling history), so a fixture embedding them raw
 * drifts daily. pinRowTs re-anchors every (ts, dayOffset) row
 * to the fixture epoch 2026-10-23, preserving the getter's PKT
 * time-of-day — the bytes the committed fixture already
 * carries — so re-export is byte-stable on any day. (The same
 * fix in fixtures-export-h2.js; the H6 audit records the
 * re-baseline of this fixture to the current assemble shape —
 * the H3 storefront slice + the WhatsApp collections — with the
 * pin in place.) */
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
const A = "biz-g6-source";
const B = "biz-g6-target";

/* ---------- SHA-256 + fingerprint cases ---------- */
const seedProducts = seed.getSeedProducts();
const seedSales = seed.getSeedSales().map(pinRowTs);
const seedJournal = seed.getSeedJournal(
  seedProducts,
  seedSales,
  seed.getSeedPurchases(),
  seed.getSeedSupplierPayments(),
  seed.getSeedExpenses(),
  seed.getSeedCredits()
).map(pinRowTs);
const smallJournal = J(seedJournal.slice(0, 2));
const sha256Kats = ["", "abc", "دکان ایپ", "x".repeat(100000)].map((s) => ({
  input: s,
  sha: backup.sha256Hex(s),
}));
const fingerprintCases = [
  { name: "seed", journal: seedJournal, sha: backup.journalFingerprint(seedJournal) },
  { name: "small", journal: smallJournal, sha: backup.journalFingerprint(smallJournal) },
];

/* ---------- one assembled backup file ---------- */
const migrationWrites = tenancy.planMigration({
  ownerUid: A,
  ownerEmail: "owner@shop.pk",
  shopName: "Fixture General Store",
  phone: "0300-0000000",
  staffEmails: ["staff@shop.pk"],
  registryExists: false,
  bills: [],
  sales: [],
  nowISO: NOW,
});
const regWrite = migrationWrites.find((w) => w.kind === "set" && w.path === `businesses/${A}`);
const ctrWrite = migrationWrites.find((w) => w.kind === "set" && w.path === `businessCounters/${A}`);
const migEvent = migrationWrites.find((w) => w.kind === "add");
const member = {
  key: "uid-staff-1",
  data: {
    businessId: A, uid: "uid-staff-1", email: "staff@shop.pk", role: "manager",
    status: "active", invitedBy: A, joinedAt: NOW, source: "staff",
  },
};
const invite = {
  key: "pending@shop.pk",
  data: {
    businessId: A, email: "pending@shop.pk", role: "cashier", status: "pending",
    invitedBy: A, createdAt: NOW,
  },
};
const foreignEvent = {
  key: "evt-foreign",
  data: { businessId: "biz-other", kind: "plan.migrated", at: NOW, actor: "biz-other", detail: {} },
};
const foreignPayment = {
  key: "pay-foreign",
  data: { businessId: "biz-other", planId: "basic", amount: 1500, status: "submitted", submittedAt: NOW },
};
const collections = {};
for (const name of backup.TENANT_COLLECTIONS) collections[name] = [];
collections.products = J(seedProducts.slice(0, 2));
collections.sales = J(seedSales.slice(0, 1));
collections.journal = smallJournal;
const file = backup.assembleBackup({
  businessId: A,
  exportedAt: NOW,
  exportedBy: "fixture",
  owner: {
    shopName: "Fixture General Store",
    staffEmails: ["staff@shop.pk"],
    staff: [{ email: "staff@shop.pk", role: "manager", addedAt: NOW }],
    lockedThrough: "2026-09-30",
  },
  collections,
  platform: {
    registry: J(regWrite.data),
    counters: J(ctrWrite.data),
    stats: null,
    members: [member],
    invites: [invite],
    events: [{ key: "evt-mig", data: J(migEvent.data) }, foreignEvent],
    payments: [foreignPayment],
  },
});

/* ---------- verify outcomes (whole + tampered) ---------- */
const tamper = (fn) => {
  const c = J(file);
  fn(c);
  return c;
};
const verifyCases = [
  { name: "whole", file, expect: null },
  { name: "count-plus-one", file: tamper((c) => { c.manifest.counts.journal += 1; }), expect: "manifest-mismatch" },
  {
    name: "journal-digit",
    file: tamper((c) => { c.collections.journal[0].lines[0].debit += 5; }),
    expect: "manifest-mismatch",
  },
  { name: "format-99", file: tamper((c) => { c.formatVersion = 99; }), expect: "unknown-format" },
  { name: "schema-7", file: tamper((c) => { c.manifest.schemaVersion = 7; }), expect: "unknown-format" },
  { name: "not-a-backup", file: { hello: "world" }, expect: "not-a-backup" },
];

/* ---------- the restore truth table ---------- */
function targetFromWrites(writes) {
  const t = backup.emptyNamespace();
  t.owner = null;
  for (const w of writes) {
    if (w.kind !== "set") continue;
    const seg = w.path.split("/");
    const data = J(w.data);
    if (seg.length === 2 && seg[0] === "users") t.owner = data;
    else if (seg[0] === "users") (t.collections[seg[2]] = t.collections[seg[2]] || []).push(data);
    else if (seg[0] === "businessMembers") t.members.push({ key: seg[3], data });
    else if (seg[0] === "businessInvites") t.invites.push({ key: seg[3], data });
  }
  return t;
}
const bornTarget = { ...backup.emptyNamespace(), owner: { shopName: "New Shop", staffEmails: [], staff: [] } };
const freshPlan = backup.planRestore({ file, targetBusinessId: B, target: bornTarget, actorUid: B, nowISO: NOW });
const freshSets = freshPlan.writes.filter((w) => w.kind === "set");
const halfTarget = targetFromWrites(freshSets.slice(0, Math.floor(freshSets.length / 2)));
halfTarget.owner = J(bornTarget.owner);
const fullTarget = targetFromWrites(freshSets);
const alteredDoc = J(file.collections.journal[0]);
alteredDoc.lines[0].debit += 5;
const planCases = [
  { name: "fresh", target: bornTarget },
  { name: "altered-journal", target: { ...backup.emptyNamespace(), owner: J(bornTarget.owner), collections: { ...backup.emptyNamespace().collections, journal: [alteredDoc] } } },
  { name: "extra-entry", target: { ...backup.emptyNamespace(), owner: J(bornTarget.owner), collections: { ...backup.emptyNamespace().collections, journal: [{ id: "j-foreign", ts: NOW, dateISO: "2026-10-01", kind: "sale", lines: [] }] } } },
  { name: "resumed", target: halfTarget },
  { name: "completed", target: fullTarget },
].map((c) => {
  const plan = backup.planRestore({ file, targetBusinessId: B, target: c.target, actorUid: B, nowISO: NOW });
  return {
    name: c.name,
    target: c.target,
    expect: plan.ok
      ? {
          ok: true,
          reason: null,
          alreadyRestored: plan.alreadyRestored,
          skipped: plan.skipped,
          setPaths: plan.writes.filter((w) => w.kind === "set").map((w) => w.path),
          eventKind: plan.event ? plan.event.kind : null,
        }
      : { ok: false, reason: plan.reason, alreadyRestored: false, skipped: 0, setPaths: [], eventKind: null },
  };
});

const out = {
  about:
    "G6 core fixture — expected values computed by the compiled web lib/backup (harness/out) over the B1 seed getters; consumed by flutter-app/test/g6_fixtures_test.dart. Regenerate: node fixtures-export-g6.js (after compiling harness/tsconfig).",
  businessId: A,
  targetBusinessId: B,
  nowISO: NOW,
  sha256Kats,
  fingerprintCases,
  file,
  verifyCases,
  planCases,
};
const dest = path.join(__dirname, "fixtures", "g6-core.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log("wrote", dest);
