/**
 * Golden-fixture export for ERP Phase G · G5 (design §5/§8-G5:
 * "shared truth-table fixtures — resolver truth table, plan-state
 * boundary table, quote table, counter readings").
 *
 * Dev-only tooling — no app behaviour changes. Every expected
 * value below is produced by the REAL compiled web functions
 * (lib/tenancy, lib/plans, lib/renewal) — nothing is hand-computed
 * here; the exporter only arranges inputs and records outputs.
 * The Dart suite (flutter-app/test/g5_fixtures_test.dart) runs the
 * Dart ports over the same inputs and asserts equality,
 * semantics-for-semantics (write plans, boundary states, quotes,
 * counter transitions), plus the cross-client leg: one staffer
 * trading in TWO businesses whose web-composed journals the Dart
 * composers must reproduce to the rupee.
 *
 * Run AFTER the harness compile:
 *   cd ../web && npx tsc -p ../harness/tsconfig.json
 *   node ../harness/harness.js            (must stay ALL SUITES GREEN)
 *   node ../harness/fixtures-export-g5.js (writes fixtures/g5-core.json)
 *
 * Companions fixtures-export{,-f2,-f3,-f4,-f5}.js are untouched;
 * their outputs must stay byte-stable.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const TN = require("./out/tenancy.js");
const PL = require("./out/plans.js");
const RN = require("./out/renewal.js");
const L = require("./out/ledger.js");
const T = require("./out/tax.js");
const round2 = T.round2;

const J = (v) => JSON.parse(JSON.stringify(v ?? null));
const NOW = "2026-10-23T10:00:00.000Z";

/* ================= resolver truth table (§1.3) ================= */

const BIZ = "biz-a";
const MIRROR = ["staff@x.com", "gone@x.com"];
const resolver = [];
function rCase(id, title, input) {
  resolver.push({ id, title, input: J(input), expected: J(TN.resolveAccess(input)) });
}
rCase("owner-uid", "uid == businessId ⇒ owner, before every other leg",
  { callerUid: BIZ, callerEmail: "", businessId: BIZ, staffEmails: [], membership: null, staffIndex: null });
rCase("membership-role", "membership doc + mirror ⇒ its role",
  { callerUid: "u-1", callerEmail: "staff@x.com", businessId: BIZ, staffEmails: MIRROR, membership: { role: "cashier" }, staffIndex: null });
rCase("membership-no-role", "membership without a role ⇒ manager (legacy default)",
  { callerUid: "u-1", callerEmail: "staff@x.com", businessId: BIZ, staffEmails: MIRROR, membership: {}, staffIndex: null });
rCase("membership-mirror-cut", "membership but email REMOVED from the mirror ⇒ no access (removal cuts both legs)",
  { callerUid: "u-1", callerEmail: "other@x.com", businessId: BIZ, staffEmails: MIRROR, membership: { role: "cashier" }, staffIndex: null });
rCase("legacy-role", "no membership; staffIndex at this business + mirror ⇒ legacy role",
  { callerUid: "u-2", callerEmail: "staff@x.com", businessId: BIZ, staffEmails: MIRROR, membership: null, staffIndex: { ownerUid: BIZ, role: "accountant" } });
rCase("legacy-other-business", "staffIndex points at ANOTHER business ⇒ no access here (cross-business isolation)",
  { callerUid: "u-2", callerEmail: "staff@x.com", businessId: BIZ, staffEmails: MIRROR, membership: null, staffIndex: { ownerUid: "biz-b", role: "accountant" } });
rCase("legacy-mirror-cut", "staffIndex at this business but email removed from mirror ⇒ no access",
  { callerUid: "u-3", callerEmail: "gone@x.com", businessId: BIZ, staffEmails: ["staff@x.com"], membership: null, staffIndex: { ownerUid: BIZ, role: "cashier" } });
rCase("legacy-bad-role", "staffIndex role unrecognised ⇒ manager",
  { callerUid: "u-2", callerEmail: "staff@x.com", businessId: BIZ, staffEmails: MIRROR, membership: null, staffIndex: { ownerUid: BIZ, role: "boss" } });
rCase("email-normalised", "caller email is trimmed + lowercased before the mirror test",
  { callerUid: "u-1", callerEmail: "  Staff@X.com ", businessId: BIZ, staffEmails: MIRROR, membership: { role: "cashier" }, staffIndex: null });
rCase("membership-beats-legacy", "both legs present ⇒ membership wins over legacy",
  { callerUid: "u-1", callerEmail: "staff@x.com", businessId: BIZ, staffEmails: MIRROR, membership: { role: "cashier" }, staffIndex: { ownerUid: BIZ, role: "accountant" } });
rCase("stranger", "no legs at all ⇒ none",
  { callerUid: "u-9", callerEmail: "nobody@x.com", businessId: BIZ, staffEmails: MIRROR, membership: null, staffIndex: null });

/* ================= claims + backfill + index (§1.3/§1.4/§7.2) ================= */

const claims = [];
function cCase(id, title, input) {
  claims.push({ id, title, input: J(input), expected: J(TN.planClaim(input)) });
}
const INV = { email: "Staff@Example.com", role: "cashier", status: "pending", invitedBy: BIZ, createdAt: "2026-10-20T09:00:00.000Z" };
cCase("claim-ok", "pending invite for the caller's verified email ⇒ membership + claim + index + event",
  { businessId: BIZ, callerUid: "u-1", callerEmail: "staff@example.com", invite: INV, existingMembership: null, nowISO: NOW });
cCase("claim-no-invite", "no invite ⇒ refused, no writes",
  { businessId: BIZ, callerUid: "u-1", callerEmail: "staff@example.com", invite: null, existingMembership: null, nowISO: NOW });
cCase("claim-email-mismatch", "invite is for a different email ⇒ refused",
  { businessId: BIZ, callerUid: "u-1", callerEmail: "other@example.com", invite: INV, existingMembership: null, nowISO: NOW });
cCase("claim-already-by-other", "invite claimed by someone else ⇒ refused",
  { businessId: BIZ, callerUid: "u-1", callerEmail: "staff@example.com", invite: { ...INV, status: "claimed", claimedBy: "u-9", claimedAt: "2026-10-21T09:00:00.000Z" }, existingMembership: null, nowISO: NOW });
cCase("claim-idempotent-own", "own claim + membership present ⇒ ok, zero writes",
  { businessId: BIZ, callerUid: "u-1", callerEmail: "staff@example.com", invite: { ...INV, status: "claimed", claimedBy: "u-1", claimedAt: "2026-10-21T09:00:00.000Z" }, existingMembership: { email: "staff@example.com", role: "accountant", addedBy: BIZ, addedAt: "2026-10-21T09:00:00.000Z", source: "invite" }, nowISO: NOW });
cCase("claim-own-no-membership", "own claim but membership gone ⇒ already-claimed (the claim is spent)",
  { businessId: BIZ, callerUid: "u-1", callerEmail: "staff@example.com", invite: { ...INV, status: "claimed", claimedBy: "u-1", claimedAt: "2026-10-21T09:00:00.000Z" }, existingMembership: null, nowISO: NOW });
cCase("claim-not-pending", "invite in a non-pending, non-claimed state ⇒ refused",
  { businessId: BIZ, callerUid: "u-1", callerEmail: "staff@example.com", invite: { ...INV, status: "revoked" }, existingMembership: null, nowISO: NOW });

const backfill = [];
function bCase(id, title, input) {
  backfill.push({ id, title, input: J(input), expected: J(TN.planLegacyBackfill(input)) });
}
bCase("backfill-ok", "legacy staffer, no membership ⇒ mirror write plan (source staff)",
  { businessId: BIZ, callerUid: "u-2", callerEmail: "staff@x.com", staffIndex: { ownerUid: BIZ, role: "accountant" }, existingMembership: null, nowISO: NOW });
bCase("backfill-has-membership", "membership already exists ⇒ no-op",
  { businessId: BIZ, callerUid: "u-2", callerEmail: "staff@x.com", staffIndex: { ownerUid: BIZ, role: "accountant" }, existingMembership: { email: "staff@x.com", role: "accountant", addedBy: BIZ, addedAt: "2026-10-01T00:00:00.000Z", source: "staff" }, nowISO: NOW });
bCase("backfill-other-business", "index points elsewhere ⇒ no-op",
  { businessId: BIZ, callerUid: "u-2", callerEmail: "staff@x.com", staffIndex: { ownerUid: "biz-b", role: "accountant" }, existingMembership: null, nowISO: NOW });
bCase("backfill-no-index", "no index ⇒ no-op",
  { businessId: BIZ, callerUid: "u-2", callerEmail: "staff@x.com", staffIndex: null, existingMembership: null, nowISO: NOW });

const indexCases = [];
{
  const entries = [
    { businessId: "biz-a", role: "cashier" },
    { businessId: "biz-b", role: "manager" },
    { businessId: "biz-a", role: "accountant" }, // duplicate — first wins the walk
    { businessId: "biz-c", role: "cashier" },
  ];
  const live = {
    "biz-a": { email: "s@x.com", role: "manager", addedBy: "biz-a", addedAt: NOW, source: "invite" },
    "biz-b": null, // removed — dropped on sight
    "biz-c": { email: "s@x.com", role: "cashier", addedBy: "biz-c", addedAt: NOW, source: "staff" },
  };
  indexCases.push({
    id: "heal", title: "healIndex: dead entries drop, roles refresh from live docs, dupes collapse",
    entries: J(entries), live: J(live), expected: J(TN.healIndex(entries, live)),
  });
  indexCases.push({
    id: "merge", title: "indexWith: an existing entry is replaced (role refreshed) and moves last",
    entries: J(entries.slice(0, 2)), add: { businessId: "biz-a", role: "owner" },
    expected: J(TN.indexWith(entries.slice(0, 2), { businessId: "biz-a", role: "owner" })),
  });
  const own = { businessId: "own-1", name: "Fallback Name" };
  const sw = [
    { businessId: "biz-b", role: "manager" },
    { businessId: "biz-a", role: "cashier" },
    { businessId: "own-1", role: "cashier" }, // own via membership too — listed once, as owner
  ];
  const names = { "own-1": "My Shop", "biz-a": "Alpha Store", "biz-b": "Beta Store" };
  indexCases.push({
    id: "switcher-list", title: "buildSwitcherList: own first, memberships in name order, own never duplicated",
    own: J(own), entries: J(sw), names: J(names), expected: J(TN.buildSwitcherList({ own, entries: sw, names })),
  });
  indexCases.push({
    id: "switcher-no-own", title: "buildSwitcherList without an own business",
    own: null, entries: J(sw.slice(0, 2)), names: J(names),
    expected: J(TN.buildSwitcherList({ own: null, entries: sw.slice(0, 2), names })),
  });
  const ms = [{ email: "Joined@X.com" }, { email: "gone@x.com" }];
  const iv = [{ email: "invited@x.com", status: "pending" }, { email: "joined@x.com", status: "claimed" }];
  indexCases.push({
    id: "member-status", title: "membershipStatusFor: joined > pending > legacy",
    cases: ["joined@x.com", "invited@x.com", "other@x.com"].map((email) => ({
      email, expected: TN.membershipStatusFor(email, ms, iv),
    })),
    memberships: J(ms), invites: J(iv),
  });
}

/* ================= snapshots + month keys (§3.2/§7.2) ================= */

const snapshots = [];
function sCase(id, title, run) { snapshots.push({ id, title, expected: J(run()) }); }
sCase("trial-snapshot", "trialPlanSnapshot: 14 days, 2 users, 200 pool, Standard set", () => TN.trialPlanSnapshot(NOW));
sCase("founding-snapshot", "foundingPlanSnapshot: Advanced set + limits, no expiry", () => TN.foundingPlanSnapshot(NOW));
sCase("snapshot-basic", "snapshotFor basic with an admin period end", () =>
  PL.snapshotFor("basic", NOW, { periodTo: "2026-11-23T10:00:00.000Z", assignedBy: "admin" }));
sCase("snapshot-standard", "snapshotFor standard", () =>
  PL.snapshotFor("standard", NOW, { periodTo: "2026-11-23T10:00:00.000Z", assignedBy: "admin" }));
sCase("snapshot-enterprise-default", "snapshotFor enterprise: catalogue nulls store as 0 (= unlimited)", () =>
  PL.snapshotFor("enterprise", NOW, { assignedBy: "admin" }));
sCase("snapshot-enterprise-pinned", "snapshotFor enterprise with pinned limits (null invoice limit ⇒ 0)", () =>
  PL.snapshotFor("enterprise", NOW, { assignedBy: "admin", usersLimit: 25, invoiceLimit: null }));
sCase("snapshot-trial", "snapshotFor trial re-derives the trial end and nulls the period", () =>
  PL.snapshotFor("trial", NOW, { assignedBy: "signup" }));
const monthKeys = ["2026-10-31T18:59:59.000Z", "2026-10-31T19:00:00.000Z", "2026-01-01T00:00:00.000Z", "2026-12-31T19:30:00.000Z"]
  .map((iso) => ({ iso, expected: TN.pktMonthKey(iso) }));

/* ================= plan-state boundary table (§3.6) ================= */

const END = "2026-11-01T00:00:00.000Z";
const TEND = "2026-10-15T00:00:00.000Z";
const DAY = 86400000;
const plus = (iso, ms) => new Date(new Date(iso).getTime() + ms).toISOString();
function registryOf(plan, extra = {}) {
  return {
    ownerUid: "biz-x", ownerEmail: "o@x.com", name: "X", phone: "", city: "",
    createdAt: "2026-10-01T00:00:00.000Z", status: "active", enforce: false, plan, ...extra,
  };
}
const trialReg = registryOf({ ...TN.trialPlanSnapshot("2026-10-01T00:00:00.000Z"), trialEndsAt: TEND });
const basicReg = registryOf(PL.snapshotFor("basic", "2026-10-01T00:00:00.000Z", { periodTo: END, assignedBy: "admin" }));
const foundingReg = registryOf(TN.foundingPlanSnapshot("2026-10-01T00:00:00.000Z"));
const datelessReg = registryOf({ ...PL.snapshotFor("basic", "2026-10-01T00:00:00.000Z", { assignedBy: "admin" }), periodTo: null, trialEndsAt: null });

const planState = [];
function pCase(id, title, registry, now) {
  planState.push({
    id, title, registry: J(registry), now,
    expected: {
      state: PL.derivePlanState(registry, now),
      allowsPosting: PL.stateAllowsPosting(PL.derivePlanState(registry, now)),
      rulesPostable: PL.rulesPlanPostable(registry, now),
    },
  });
}
pCase("none", "no registry ⇒ none (pre-G shop; nothing gates)", null, NOW);
pCase("trial-mid", "trial, mid-window", trialReg, "2026-10-10T00:00:00.000Z");
pCase("trial-end-minus-1ms", "trial: 1ms before the end instant is still trial", trialReg, plus(TEND, -1));
pCase("trial-end-exact", "trial: the end instant itself still belongs to the trial", trialReg, TEND);
pCase("trial-end-plus-1ms", "trial: 1ms past the end ⇒ grace", trialReg, plus(TEND, 1));
pCase("trial-grace-day30", "trial: end + 30 days exactly ⇒ still grace (inclusive)", trialReg, plus(TEND, 30 * DAY));
pCase("trial-grace-day30-plus-1ms", "trial: end + 30 days + 1ms ⇒ readonly", trialReg, plus(TEND, 30 * DAY + 1));
pCase("active-mid", "paid: mid-period ⇒ active", basicReg, "2026-10-20T00:00:00.000Z");
pCase("active-end-exact", "paid: the end instant itself is still active", basicReg, END);
pCase("active-end-plus-1ms", "paid: 1ms past ⇒ grace", basicReg, plus(END, 1));
pCase("grace-day30", "paid: end + 30 days ⇒ grace", basicReg, plus(END, 30 * DAY));
pCase("readonly-day30-plus-1ms", "paid: end + 30 days + 1ms ⇒ readonly", basicReg, plus(END, 30 * DAY + 1));
pCase("founding-eternal", "founding at any instant ⇒ founding", foundingReg, "2031-05-05T00:00:00.000Z");
pCase("suspended-over-active", "suspension overlays an active period", { ...basicReg, status: "suspended" }, "2026-10-20T00:00:00.000Z");
pCase("suspended-over-founding", "suspension overlays even founding", { ...foundingReg, status: "suspended" }, NOW);
pCase("dateless-paid", "a paid-shaped snapshot without dates reads active (never bricks a shop)", datelessReg, "2027-01-01T00:00:00.000Z");

const gates = [];
function gCase(id, title, registry, counters, now) {
  gates.push({ id, title, registry: J(registry), counters: J(counters), now, expected: J(PL.planGate(registry, counters, now)) });
}
const basicCtr = { invoiceMonth: "2026-10", invoiceCount: 41, memberCount: 2 };
gCase("gate-none", "no registry: state none, nothing refused, counters read 0", null, null, NOW);
gCase("gate-observe-grace", "grace but enforce OFF ⇒ postable (observation)", { ...basicReg }, basicCtr, plus(END, 5 * DAY));
gCase("gate-enforced-grace", "grace + enforce ⇒ refusal: state", { ...basicReg, enforce: true }, basicCtr, plus(END, 5 * DAY));
gCase("gate-enforced-cap", "active + enforce, counter AT the limit ⇒ the next event refuses: invoice-cap",
  { ...basicReg, enforce: true }, { ...basicCtr, invoiceCount: 500 }, "2026-10-20T00:00:00.000Z");
gCase("gate-enforced-under-cap", "active + enforce, one below the limit ⇒ postable, projected count = limit",
  { ...basicReg, enforce: true }, { ...basicCtr, invoiceCount: 499 }, "2026-10-20T00:00:00.000Z");
gCase("gate-trial-pool-cap", "trial + enforce, pool exhausted ⇒ invoice-cap (the pool is the limit)",
  { ...trialReg, enforce: true }, { invoiceMonth: "2026-10", invoiceCount: 200, memberCount: 1 }, "2026-10-10T00:00:00.000Z");
gCase("gate-trial-no-roll", "trial + enforce: the projected count accumulates across the month edge (no roll)",
  { ...trialReg, enforce: true }, { invoiceMonth: "2026-10", invoiceCount: 7, memberCount: 1 }, "2026-11-01T00:00:00.000Z");

/* ================= counter arithmetic (§4.2) ================= */

const countersFx = [];
function ctr(id, title, run) { countersFx.push({ id, title, expected: J(run()) }); }
const ctrBase = { invoiceMonth: "2026-10", invoiceCount: 41, memberCount: 2 };
ctr("next-same-month", "invoice +1 within the PKT month", () =>
  PL.nextInvoiceCounter(ctrBase, basicReg.plan, "2026-10-23T10:00:00.000Z"));
ctr("next-roll", "a new PKT month (Oct 31 19:00Z = Nov 1 PKT) rolls to 1", () =>
  PL.nextInvoiceCounter(ctrBase, basicReg.plan, "2026-10-31T19:00:00.000Z"));
ctr("next-trial-noroll", "trial NEVER rolls — the pool accumulates across the edge", () =>
  PL.nextInvoiceCounter({ invoiceMonth: "2026-10", invoiceCount: 199, memberCount: 1 }, trialReg.plan, "2026-11-02T00:00:00.000Z"));
ctr("member-plus", "seat +1 at invite", () => PL.nextMemberCounter(ctrBase, 1));
ctr("member-minus", "seat −1 at removal", () => PL.nextMemberCounter(ctrBase, -1));
ctr("member-floor", "seat −1 floors at 0", () => PL.nextMemberCounter({ ...ctrBase, memberCount: 0 }, -1));
const transitions = [
  ["ok-plus1", ctrBase, { ...ctrBase, invoiceCount: 42 }, "invoice", true],
  ["ok-roll", ctrBase, { invoiceMonth: "2026-11", invoiceCount: 1, memberCount: 2 }, "invoice", null],
  ["bad-plus2", ctrBase, { ...ctrBase, invoiceCount: 43 }, "invoice", false],
  ["bad-month-back", ctrBase, { invoiceMonth: "2026-09", invoiceCount: 1, memberCount: 2 }, "invoice", false],
  ["bad-member-moved", ctrBase, { ...ctrBase, invoiceCount: 42, memberCount: 3 }, "invoice", false],
  ["bad-baseline-moved", { ...ctrBase, baseline: "migration" }, { ...ctrBase, invoiceCount: 42 }, "invoice", false],
  ["ok-member-plus", ctrBase, { ...ctrBase, memberCount: 3 }, "member-plus", null],
  ["ok-member-minus", ctrBase, { ...ctrBase, memberCount: 1 }, "member-minus", null],
  ["bad-member-minus-below0", { ...ctrBase, memberCount: 0 }, { ...ctrBase, memberCount: -1 }, "member-minus", false],
  ["bad-invoice-moved-on-member", ctrBase, { ...ctrBase, memberCount: 3, invoiceCount: 42 }, "member-plus", false],
].map(([id, before, after, kind, forced]) => ({
  id, before: J(before), after: J(after), kind,
  expected: forced !== null ? forced : PL.counterTransitionOk(before, after, kind),
  computed: PL.counterTransitionOk(before, after, kind),
}));
// The two "ok-roll"/member rows above pass forced=null so the
// recorded expectation IS the function's own output; the Dart
// suite asserts its port agrees with `computed` on every row and
// with `expected` where the design pins it.
const capCases = [
  { id: "event-at-limit", run: () => PL.invoiceEventAllowed({ ...ctrBase, invoiceCount: 499 }, { ...ctrBase, invoiceCount: 500 }, { ...basicReg.plan, invoiceLimit: 500 }) },
  { id: "event-over-limit", run: () => PL.invoiceEventAllowed({ ...ctrBase, invoiceCount: 500 }, { ...ctrBase, invoiceCount: 501 }, { ...basicReg.plan, invoiceLimit: 500 }) },
  { id: "event-unlimited", run: () => PL.invoiceEventAllowed(ctrBase, { ...ctrBase, invoiceCount: 42 }, { ...basicReg.plan, invoiceLimit: 0 }) },
  { id: "event-illegal-transition", run: () => PL.invoiceEventAllowed(ctrBase, { ...ctrBase, invoiceCount: 99 }, basicReg.plan) },
  { id: "member-at-cap", run: () => PL.memberCapOk({ ...ctrBase, memberCount: 2 }, { ...basicReg.plan, usersLimit: 3 }) },
  { id: "member-over-cap", run: () => PL.memberCapOk({ ...ctrBase, memberCount: 3 }, { ...basicReg.plan, usersLimit: 3 }) },
  { id: "member-unlimited", run: () => PL.memberCapOk({ ...ctrBase, memberCount: 99 }, { ...basicReg.plan, usersLimit: 0 }) },
].map((c) => ({ id: c.id, expected: c.run() }));
const actualRows = {
  bills: [
    { ts: "2026-10-05T10:00:00.000Z", status: "paid" },
    { ts: "2026-10-06T10:00:00.000Z", status: "held" },
    { ts: "2026-10-31T19:30:00.000Z", status: "paid" }, // Nov 1 in PKT — outside October
    { ts: "2026-09-30T18:00:00.000Z", status: "paid" }, // Sep 30 23:00 PKT — outside
  ],
  sales: [
    { ts: "2026-10-07T10:00:00.000Z", billId: null, kind: "sale" },
    { ts: "2026-10-08T10:00:00.000Z", billId: "bill-1", kind: "sale" }, // a bill's row — not an event
    { ts: "2026-10-09T10:00:00.000Z", billId: null, kind: "return" }, // a return row — not an event
    { ts: "2026-10-10T10:00:00.000Z" }, // bare record — a counter sale
  ],
};
const actuals = [
  {
    id: "actual-monthly", title: "monthly reading: held bills, bill rows, returns and other PKT months excluded",
    bills: J(actualRows.bills), sales: J(actualRows.sales), staffEmails: ["a@x.com", "b@x.com"],
    plan: J(basicReg.plan), now: "2026-10-23T10:00:00.000Z",
    expected: J(PL.deriveActualCounters(actualRows.bills, actualRows.sales, ["a@x.com", "b@x.com"], basicReg, "2026-10-23T10:00:00.000Z")),
  },
  {
    id: "actual-trial-pool", title: "trial reading: the pool consumed since periodFrom (month edges ignored)",
    bills: J(actualRows.bills), sales: J(actualRows.sales), staffEmails: ["a@x.com"],
    plan: J({ ...trialReg.plan, periodFrom: "2026-10-06T00:00:00.000Z" }), now: "2026-10-23T10:00:00.000Z",
    expected: J(PL.deriveActualCounters(actualRows.bills, actualRows.sales, ["a@x.com"], { plan: { ...trialReg.plan, periodFrom: "2026-10-06T00:00:00.000Z" } }, "2026-10-23T10:00:00.000Z")),
  },
];

/* ================= quotes + submissions (§3.5) ================= */

const monthAdds = [
  ["2026-01-31T00:00:00.000Z", 1], ["2024-01-31T00:00:00.000Z", 1],
  ["2026-12-15T00:00:00.000Z", 1], ["2026-10-23T10:30:00.000Z", 12],
  ["2026-03-31T00:00:00.000Z", 1], ["2026-10-31T00:00:00.000Z", 1],
].map(([iso, months]) => ({ iso, months, expected: RN.addMonthsISO(iso, months) }));

const quotes = [];
function qCase(id, title, registry, planId, billing, now) {
  quotes.push({ id, title, registry: J(registry), planId, billing, now, expected: J(RN.renewalQuote(registry, planId, billing, now)) });
}
qCase("basic-monthly-early", "renew early: the new period starts at the CURRENT period's end (nothing bought is lost)",
  basicReg, "basic", "monthly", "2026-10-20T00:00:00.000Z");
qCase("basic-annual", "annual = 10 × monthly over 12 months", basicReg, "basic", "annual", "2026-10-20T00:00:00.000Z");
qCase("standard-from-grace", "renew from grace: the period starts NOW", basicReg, "standard", "monthly", plus(END, 5 * DAY));
qCase("advanced-annual-trial", "from trial: the period starts at the trial's end", trialReg, "advanced", "annual", "2026-10-10T00:00:00.000Z");
qCase("founding-refused", "founding has nothing to renew", foundingReg, "basic", "monthly", NOW);
qCase("enterprise-current", "an enterprise business renews by console conversation", registryOf(PL.snapshotFor("enterprise", NOW, { assignedBy: "admin" })), "basic", "monthly", NOW);
qCase("enterprise-target", "enterprise is not purchasable from the surface", basicReg, "enterprise", "monthly", NOW);
qCase("trial-target", "trial is a birth state, not purchasable", basicReg, "trial", "monthly", NOW);
qCase("no-registry", "no registry ⇒ no quote", null, "basic", "monthly", NOW);
qCase("dateless-registry", "a dateless paid snapshot renews from now", datelessReg, "standard", "monthly", "2026-10-20T00:00:00.000Z");

const submissions = [];
function subCase(id, title, input) {
  submissions.push({ id, title, input: J(input), expected: J(RN.planRenewalSubmission(input)) });
}
const SUB = { registry: basicReg, businessId: "biz-x", planId: "standard", billing: "monthly", method: "raast", reference: "FT-98213", actor: "biz-x", now: "2026-10-20T00:00:00.000Z" };
subCase("submit-ok", "the record is born submitted, in the owner's name, amount from the catalogue", SUB);
subCase("submit-ok-note", "a non-blank owner note rides; the amount follows an annual quote",
  { ...SUB, billing: "annual", ownerNote: "  paid via branch  " });
subCase("submit-suspended-ok", "submission stays open while SUSPENDED (the remedy must reach it)",
  { ...SUB, registry: { ...basicReg, status: "suspended" } });
subCase("submit-not-owner", "actor ≠ business ⇒ refused (a member cannot submit the owner's renewal)",
  { ...SUB, actor: "u-7" });
subCase("submit-bad-method", "an unknown method refuses", { ...SUB, method: "card" });
subCase("submit-blank-reference", "a blank reference refuses (nothing to check against the bank)", { ...SUB, reference: "   " });
subCase("submit-no-registry", "no registry ⇒ refused", { ...SUB, registry: null });
subCase("submit-founding", "founding refuses through the quote", { ...SUB, registry: foundingReg });

/* ================= lifecycle banner + suspension reason (§3.4/§2.4) ================= */

const lifecycle = [];
function lCase(id, title, registry, counters, now) {
  const view = registry ? PL.planViewOf(registry, counters, now) : null;
  lifecycle.push({
    id, title, registry: J(registry), counters: J(counters), now,
    expected: J(view ? RN.lifecycleBanner(view, now) : null),
  });
}
const trialRegNow = registryOf(TN.trialPlanSnapshot("2026-10-20T09:00:00.000Z")); // ends 2026-11-03T09:00Z
lCase("lc-trial-far", "trial with > 7 days left: plain countdown + pool figures", trialRegNow, { invoiceMonth: "2026-10", invoiceCount: 12, memberCount: 1 }, "2026-10-23T09:00:00.000Z");
lCase("lc-trial-approaching", "7 days left ⇒ approaching", trialRegNow, null, "2026-10-27T09:00:00.000Z");
lCase("lc-trial-urgent", "1 day left ⇒ urgent", trialRegNow, null, "2026-11-02T09:00:00.000Z");
lCase("lc-trial-urgent-halfday", "12 hours left: ceil ⇒ 1 day, urgent", trialRegNow, null, "2026-11-02T21:00:00.000Z");
lCase("lc-grace", "5 days into grace: elapsed + left", basicReg, null, plus(END, 5 * DAY));
lCase("lc-grace-last-hour", "the last hour of grace: elapsed floors, left ceils to 1", basicReg, null, plus(END, 30 * DAY - 3600000));
lCase("lc-readonly", "past grace ⇒ readonly", basicReg, null, plus(END, 31 * DAY));
lCase("lc-suspended", "suspended", { ...basicReg, status: "suspended" }, null, NOW);
lCase("lc-active-calm", "active ⇒ no banner", basicReg, null, "2026-10-20T00:00:00.000Z");
lCase("lc-founding-calm", "founding ⇒ no banner, ever", foundingReg, null, "2031-01-01T00:00:00.000Z");
const ev = (kind, at, detail = {}) => ({ businessId: "biz-x", kind, actor: "admin-1", at, detail });
const reasonCases = [
  { id: "reason-latest", events: [ev("business.suspended", "2026-10-01T00:00:00.000Z", { reason: "Non-payment" })] },
  { id: "reason-cleared-by-activation", events: [ev("business.suspended", "2026-10-01T00:00:00.000Z", { reason: "Non-payment" }), ev("business.activated", "2026-10-05T00:00:00.000Z")] },
  { id: "reason-second-suspension", events: [ev("business.suspended", "2026-09-01T00:00:00.000Z", { reason: "First" }), ev("business.activated", "2026-09-05T00:00:00.000Z"), ev("business.suspended", "2026-10-01T00:00:00.000Z", { reason: "Second" })] },
  { id: "reason-none-recorded", events: [ev("business.suspended", "2026-10-01T00:00:00.000Z", {})] },
  { id: "reason-no-events", events: [] },
].map((c) => ({ ...c, events: J(c.events), expected: RN.latestSuspensionReason(c.events) }));

/* ================= cross-client leg (§8-G5 checkpoint) ================= */

// ONE staffer, TWO businesses. The shops' trades are composed
// here through the same template transcriptions the F1 exporter
// uses (postBill / recordSale over makeEntry); the Dart suite
// re-composes them with the Dart composers and asserts equality
// to the rupee, per business, with each business's own counters
// and plan state derived independently.
const shopAccounts = [
  { id: "acct-till", name: "Main Till", kind: "cash", method: "cash", legacyFor: "cash", archived: false, sortOrder: 0, ts: "2026-01-01T00:00:00.000Z" },
  { id: "acct-wallet", name: "Wallet & Bank", kind: "wallet", method: null, legacyFor: "wallet", archived: false, sortOrder: 1, ts: "2026-01-01T00:00:00.000Z" },
];
const shopProducts = [
  { id: "p-tea", sku: "TEA-475", name: "Tapal Danedar Tea 475g", costPrice: 800, salePrice: 1050, stockClass: null, taxSlabId: null, taxExempt: false },
  { id: "p-sugar", sku: "SUG-1KG", name: "Sugar 1kg", costPrice: 130, salePrice: 145, stockClass: null, taxSlabId: null, taxExempt: false },
];
const resolveAccountId = (method) => {
  const a = L.defaultAccountForMethod(shopAccounts, method);
  return a ? a.id : null;
};
function normEntry(e) {
  return { memo: e.memo, refType: e.refType, refId: e.refId, reversesId: e.reversesId ?? null,
    lines: e.lines.map((l) => ({ account: l.account, debit: l.debit, credit: l.credit, ref: l.ref ?? null })) };
}
function composeBillEntry({ id, billNo, lines, payments }) {
  const items = lines.map((l) => {
    const p = shopProducts.find((x) => x.id === l.productId);
    return { productId: p.id, name: p.name, qty: l.qty, unitPrice: p.salePrice, unitCost: p.costPrice, total: l.qty * p.salePrice };
  });
  const subtotal = items.reduce((a, i) => a + i.total, 0);
  const costTotal = items.reduce((a, i) => a + i.qty * i.unitCost, 0);
  const stamped = payments.map((p) => ({ method: p.method, amount: p.amount, accountId: p.method === "credit" ? null : resolveAccountId(p.method) }));
  const linesJ = [
    ...stamped.map((p) => ({ account: L.accountForMethod(p.method), debit: p.amount, credit: 0, ref: p.method === "credit" ? null : p.accountId })),
    { account: "cogs", debit: costTotal, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: subtotal },
    ...L.classLegLines(costTotal, 0, "credit"),
  ];
  return L.makeEntry(`Bill #${billNo} — Walk-in customer`, "bill", id, linesJ, { ts: "2026-10-23T10:05:00.000Z" });
}
function composeCounterSaleEntry({ id, productId, qty }) {
  const p = shopProducts.find((x) => x.id === productId);
  const total = qty * p.salePrice;
  return L.makeEntry(`Counter sale — ${p.name} × ${qty}`, "sale", id, [
    { account: "cash", debit: total, credit: 0, ref: resolveAccountId("cash") },
    { account: "cogs", debit: qty * p.costPrice, credit: 0 },
    { account: "sales_revenue", debit: 0, credit: total },
    { account: "inventory", debit: 0, credit: qty * p.costPrice },
  ], { ts: "2026-10-23T10:06:00.000Z" });
}
const STAFFER = "shared@staff.com";
const bizA = {
  businessId: "biz-a",
  registry: registryOf(TN.trialPlanSnapshot("2026-10-20T09:00:00.000Z"), {}),
  counters: { invoiceMonth: "2026-10", invoiceCount: 3, memberCount: 1 },
  staffEmails: [STAFFER],
  membership: { role: "cashier" },
};
bizA.registry.ownerUid = "biz-a";
const bizB = {
  businessId: "biz-b",
  registry: registryOf(PL.snapshotFor("basic", "2026-10-01T09:00:00.000Z", { periodTo: "2026-11-01T09:00:00.000Z", assignedBy: "admin" }), {}),
  counters: { invoiceMonth: "2026-10", invoiceCount: 41, memberCount: 2 },
  staffEmails: [STAFFER, "second@staff.com"],
  membership: { role: "manager" },
};
bizB.registry.ownerUid = "biz-b";
const entryA = composeBillEntry({ id: "bill-a1", billNo: 1, lines: [{ productId: "p-tea", qty: 2 }], payments: [{ method: "cash", amount: 2100 }] });
const entryB = composeCounterSaleEntry({ id: "sale-b1", productId: "p-sugar", qty: 3 });
const crossClient = {
  now: NOW,
  stafferEmail: STAFFER,
  accounts: shopAccounts, products: shopProducts,
  businesses: [bizA, bizB].map((b) => ({
    businessId: b.businessId,
    registry: J(b.registry),
    counters: J(b.counters),
    staffEmails: b.staffEmails,
    membership: b.membership,
    expected: {
      resolution: J(TN.resolveAccess({ callerUid: "u-staffer", callerEmail: STAFFER, businessId: b.businessId, staffEmails: b.staffEmails, membership: b.membership, staffIndex: null })),
      state: PL.derivePlanState(b.registry, NOW),
      counterAfter: J(PL.nextInvoiceCounter(b.counters, b.registry.plan, NOW)),
    },
  })),
  trades: [
    { businessId: "biz-a", kind: "bill", input: { id: "bill-a1", billNo: 1, lines: [{ productId: "p-tea", qty: 2 }], payments: [{ method: "cash", amount: 2100 }] }, entry: normEntry(entryA) },
    { businessId: "biz-b", kind: "counter", input: { id: "sale-b1", productId: "p-sugar", qty: 3 }, entry: normEntry(entryB) },
  ],
};

/* ---------------- self-checks ---------------- */

let failures = 0;
for (const t of crossClient.trades) {
  const tb = t.entry.lines.reduce((a, l) => a + l.debit - l.credit, 0);
  if (Math.abs(tb) > 0.009) { console.error(`FIXTURE SELF-CHECK FAILED: cross-client ${t.businessId} TB ${tb}`); failures++; }
}
for (const c of transitions) {
  if (c.expected !== c.computed && ["ok-plus1", "bad-plus2"].includes(c.id)) {
    console.error(`FIXTURE SELF-CHECK FAILED: transition ${c.id}`); failures++;
  }
}
if (failures) process.exit(1);

const out = {
  version: 1,
  source: "web/lib via harness/out (tenancy, plans, renewal, ledger, tax) — G5 shared truth tables",
  resolver, claims, backfill, index: indexCases, snapshots, monthKeys,
  planState, gates, counters: countersFx, transitions, caps: capCases, actuals,
  monthAdds, quotes, submissions, lifecycle, reasons: reasonCases, crossClient,
};
const dir = path.join(__dirname, "fixtures");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "g5-core.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`fixtures: resolver ${resolver.length}, claims ${claims.length}, backfill ${backfill.length}, planState ${planState.length}, gates ${gates.length}, quotes ${quotes.length}, submissions ${submissions.length}, lifecycle ${lifecycle.length} — wrote fixtures/g5-core.json`);
