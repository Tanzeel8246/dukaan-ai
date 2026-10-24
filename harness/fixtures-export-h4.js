/**
 * Phase H · H4 fixture exporter — produces fixtures/h4-core.json
 * consumed by flutter-app/test/h4_fixtures_test.dart. Every
 * expected value here is computed by the REAL compiled web
 * functions (../harness/out/storefront.js + plans + backup over
 * the H3 suite's exact cases), so the Dart port is proven against
 * TypeScript behaviour, never against hand-typed expectations:
 * the slug/band truth tables, the snapshot assemblies (first
 * publish, sticky hide, re-show, the content-equality seam), the
 * lit/dark derivation over plan states, the inbox hostile-shape
 * table + the composing merger, the public page model, conversion
 * planning (clean, drift, exactly-once refusals) + the born sale
 * order, the member-side journey (publish → order → convert →
 * SO), and the backup platform slice (assemble filter, pre-H3
 * tolerance, restore writes + the slug-conflict refusal + resume).
 *
 * Regenerate: node fixtures-export-h4.js (after compiling
 * harness/tsconfig, the h2/g5/g6 pattern).
 */
const fs = require("fs");
const path = require("path");
const storefront = require("./out/storefront.js");
const plans = require("./out/plans.js");
const backup = require("./out/backup.js");
const seed = require("./out/seed.js");

const J = (v) => JSON.parse(JSON.stringify(v));
const NOW = "2026-10-23T10:00:00.000Z";
const BIZ = "bizH3";
const settings = { shopName: "Madina General Store", phone: "0301-2345678" };
const products = [
  { id: "p-rice", name: "Rice Basmati 5kg", urduName: "چاول باسمتی", category: "Grocery", salePrice: 1450, costPrice: 1200, stockQty: 40, reorderLevel: 5, unit: "bag" },
  { id: "p-oil", name: "Cooking Oil 5L", category: "Grocery", salePrice: 2600, costPrice: 2450, stockQty: 3, reorderLevel: 5, unit: "tin" },
  { id: "p-soap", name: "Soap Bar", category: "Care", salePrice: 120, costPrice: 80, stockQty: 0, reorderLevel: 2, unit: "pc" },
  { id: "p-tea", name: "Tea 500g", category: "Grocery", salePrice: 950, costPrice: 800, stockQty: 12, reorderLevel: 3, unit: "pack" },
];

/* ---------- slug truth table (the H3 suite's cases) ---------- */
const slugInputs = [
  "madina-store", "a1b", "x".repeat(40), "", "ab", "x".repeat(41),
  "Madina", "my shop", "-lead", "trail-", "double--hyphen", "under_score",
  "demo", "platform", "s", "storefront", "my-shop-2",
];
const slugCases = slugInputs.map((input) => ({
  input,
  problem: storefront.slugProblem(input),
  ok: storefront.slugOk(input),
}));
const suggestCases = [
  { name: "Madina General Store", slug: storefront.suggestSlug("Madina General Store") },
  { name: "مدینہ سٹور", slug: storefront.suggestSlug("مدینہ سٹور") },
  { name: "Demo", slug: storefront.suggestSlug("Demo") },
  { name: "  Al-Noor  Mart!! ", slug: storefront.suggestSlug("  Al-Noor  Mart!! ") },
];

/* ---------- stock bands ---------- */
const bandCases = [
  { stockQty: 0, reorderLevel: 5 },
  { stockQty: -2, reorderLevel: 5 },
  { stockQty: 5, reorderLevel: 5 },
  { stockQty: 6, reorderLevel: 5 },
  { stockQty: 1, reorderLevel: 0 },
  { stockQty: 3, reorderLevel: 5 },
].map((c) => ({ ...c, band: storefront.stockBandFor(c) }));

/* ---------- snapshots ---------- */
const asm = (extra) => storefront.assembleStorefrontSnapshot({
  businessId: BIZ, slug: "madina-store", settings, city: "Sargodha",
  logoDataUrl: null, products, nowISO: NOW, ...extra,
});
const snap1 = asm({ previous: null });
const snapHidden = asm({ excludedProductIds: ["p-tea"], previous: snap1 });
const snapStillHidden = asm({ previous: snapHidden });
const snapShown = asm({ includeProductIds: ["p-tea"], previous: snapHidden });
const snapPriceMoved = asm({
  products: products.map((p) => (p.id === "p-rice" ? { ...p, salePrice: 1500 } : p)),
  previous: snap1,
});
const snapshotCases = {
  first: J(snap1),
  hidden: J(snapHidden),
  stillHidden: J(snapStillHidden),
  shown: J(snapShown),
  priceMoved: J(snapPriceMoved),
  contentEqualRestamped: storefront.storefrontContentEqual(snap1, {
    ...snap1,
    publishedAt: "2027-01-01T00:00:00.000Z",
    updatedAt: "2027-01-01T00:00:00.000Z",
  }),
  contentEqualPriceMoved: storefront.storefrontContentEqual(snap1, snapPriceMoved),
  contentEqualNull: storefront.storefrontContentEqual(null, snap1),
  contentEqualSame: storefront.storefrontContentEqual(snap1, snap1),
};

/* ---------- the lit/dark derivation ---------- */
const reg = (plan, extra) => ({
  ownerUid: BIZ, ownerEmail: "o@x.pk", name: "Shop", phone: "", city: "",
  createdAt: "2026-10-01T00:00:00.000Z", status: "active", enforce: false,
  plan, ...(extra || {}),
});
const advActive = reg(plans.snapshotFor("advanced", "2026-10-01T00:00:00.000Z", { assignedBy: "admin", periodTo: "2026-11-01T00:00:00.000Z" }));
const advGrace = reg(plans.snapshotFor("advanced", "2026-09-01T00:00:00.000Z", { assignedBy: "admin", periodTo: "2026-10-10T00:00:00.000Z" }));
const founding = reg(plans.snapshotFor("founding", "2026-10-01T00:00:00.000Z", { assignedBy: "migration" }));
const trial = reg(plans.snapshotFor("trial", "2026-10-20T00:00:00.000Z", { assignedBy: "signup" }));
const standard = reg(plans.snapshotFor("standard", "2026-10-01T00:00:00.000Z", { assignedBy: "admin", periodTo: "2026-11-01T00:00:00.000Z" }));
const suspended = reg(advActive.plan, { status: "suspended" });
const litCases = [
  { name: "advanced-active", registry: advActive, doc: snap1 },
  { name: "founding", registry: founding, doc: snap1 },
  { name: "trial", registry: trial, doc: snap1 },
  { name: "standard", registry: standard, doc: snap1 },
  { name: "advanced-grace", registry: advGrace, doc: snap1 },
  { name: "suspended", registry: suspended, doc: snap1 },
  { name: "disabled-doc", registry: advActive, doc: { ...snap1, enabled: false } },
  { name: "no-registry", registry: null, doc: snap1 },
  { name: "no-doc", registry: advActive, doc: null },
].map((c) => ({ ...c, registry: J(c.registry), doc: J(c.doc), lit: storefront.storefrontLit(c.registry, c.doc, NOW) }));
const litStateCases = [
  { tier: "advanced", state: "active", enabled: true },
  { tier: "advanced", state: "founding", enabled: true },
  { tier: "standard", state: "active", enabled: true },
  { tier: "advanced", state: "grace", enabled: true },
  { tier: "advanced", state: "readonly", enabled: true },
  { tier: "advanced", state: "suspended", enabled: true },
  { tier: "advanced", state: "trial", enabled: true },
  { tier: "advanced", state: "active", enabled: false },
].map((c) => ({
  ...c,
  lit: storefront.storefrontLitState(c.tier, c.state, c.enabled ? snap1 : { ...snap1, enabled: false }),
}));

/* ---------- the inbox shape: the hostile table ---------- */
const goodOrder = {
  businessId: BIZ, slug: "madina-store", customerName: "Ahmed Raza", phone: "0301-2345678",
  lines: [{ productId: "p-rice", qty: 2 }], fulfilment: "pickup", createdAt: NOW, state: "new",
};
const shapeCases = [
  { name: "good", data: goodOrder },
  { name: "good-with-note", data: { ...goodOrder, note: "please pack separately" } },
  { name: "extra-key-coupon", data: { ...goodOrder, coupon: "SAVE10" } },
  { name: "extra-key-total", data: { ...goodOrder, total: 2900 } },
  { name: "state-converted", data: { ...goodOrder, state: "converted" } },
  { name: "state-dismissed", data: { ...goodOrder, state: "dismissed" } },
  { name: "createdAt-not-a-date", data: { ...goodOrder, createdAt: "not-a-date" } },
  { name: "slug-unslug", data: { ...goodOrder, slug: "Demo" } },
  { name: "qty-zero", data: { ...goodOrder, lines: [{ productId: "p-rice", qty: 0 }] } },
  { name: "qty-1000", data: { ...goodOrder, lines: [{ productId: "p-rice", qty: 1000 }] } },
  { name: "qty-fractional", data: { ...goodOrder, lines: [{ productId: "p-rice", qty: 1.5 }] } },
  { name: "line-with-price", data: { ...goodOrder, lines: [{ productId: "p-rice", qty: 1, price: 1 }] } },
  { name: "no-lines", data: { ...goodOrder, lines: [] } },
  { name: "51-lines", data: { ...goodOrder, lines: Array.from({ length: 51 }, () => ({ productId: "p-rice", qty: 1 })) } },
  { name: "name-61", data: { ...goodOrder, customerName: "x".repeat(61) } },
  { name: "name-blank", data: { ...goodOrder, customerName: "   " } },
  { name: "phone-short", data: { ...goodOrder, phone: "123" } },
  { name: "phone-20", data: { ...goodOrder, phone: "0".repeat(20) } },
  { name: "note-301", data: { ...goodOrder, note: "x".repeat(301) } },
  { name: "fulfilment-cod", data: { ...goodOrder, fulfilment: "cod" } },
  { name: "not-an-object", data: "order please" },
  { name: "businessId-empty", data: { ...goodOrder, businessId: "" } },
].map((c) => ({ name: c.name, data: J(c.data), ok: storefront.storeOrderShapeOk(c.data) }));

const composeCases = {
  merged: J(storefront.composeStoreOrder(
    { customerName: "  Ahmed Raza ", phone: "0301-2345678", note: " ", fulfilment: "delivery",
      lines: [{ productId: "p-rice", qty: 2 }, { productId: "p-rice", qty: 3 }, { productId: "p-oil", qty: 1 }] },
    { businessId: BIZ, slug: "madina-store", nowISO: NOW }
  )),
  overflow: storefront.composeStoreOrder(
    { customerName: "A", phone: "0301-2345678", fulfilment: "pickup",
      lines: [{ productId: "p-rice", qty: 600 }, { productId: "p-rice", qty: 600 }] },
    { businessId: BIZ, slug: "madina-store", nowISO: NOW }
  ),
};

/* ---------- phone matching ---------- */
const phoneCases = [
  { phone: "0301-2345678", normalized: storefront.normalizePhone("0301-2345678") },
  { phone: "+92 301 2345678", normalized: storefront.normalizePhone("+92 301 2345678") },
  { phone: "0092 301 2345678", normalized: storefront.normalizePhone("0092 301 2345678") },
  { phone: "3012345678", normalized: storefront.normalizePhone("3012345678") },
];

/* ---------- the page model (snapshot alone) ---------- */
const pageModel = J(storefront.storefrontPageModel(snapHidden));

/* ---------- conversion ---------- */
const customers = [
  { id: "cu-1", name: "Ahmed Raza", phone: "+92 301 2345678", address: "", note: "", ts: NOW },
];
const order = { id: "ord-1", ...goodOrder, lines: [{ productId: "p-rice", qty: 2 }, { productId: "p-oil", qty: 1 }] };
const productsMoved = products
  .map((p) => (p.id === "p-rice" ? { ...p, salePrice: 1500 } : p))
  .filter((p) => p.id !== "p-oil");
const planClean = storefront.planStoreConversion(order, snap1, products, customers);
const planDrift = storefront.planStoreConversion(order, snap1, productsMoved, customers);
const conversionCases = {
  customers: J(customers),
  order: J(order),
  productsMoved: J(productsMoved),
  clean: J(planClean),
  drift: J(planDrift),
  allMissingNull: storefront.planStoreConversion(
    { ...order, lines: [{ productId: "p-oil", qty: 1 }] }, snap1, productsMoved, customers) === null,
  convertedNull: storefront.planStoreConversion({ ...order, state: "converted" }, snap1, products, customers) === null,
  dismissedNull: storefront.planStoreConversion({ ...order, state: "dismissed" }, snap1, products, customers) === null,
  noSnapshotPlan: J(storefront.planStoreConversion(order, null, products, customers)),
  soFromDrift: J(storefront.buildStoreSaleOrder(order, planDrift, {
    number: "SO-1", customerId: "cu-1", customerName: "Ahmed Raza", customerPhone: "+92 301 2345678",
    products: productsMoved, taxSlabs: [], settings, nowISO: NOW,
  })),
  counts: storefront.storeOrderCounts([
    order,
    { ...order, id: "o2", state: "converted" },
    { ...order, id: "o3", state: "dismissed" },
  ]),
};

/* ---------- the member-side journey ---------- */
const journeyComposed = storefront.composeStoreOrder(
  { customerName: "Ahmed Raza", phone: "0301-2345678", fulfilment: "pickup", lines: [{ productId: "p-rice", qty: 2 }] },
  { businessId: BIZ, slug: "madina-store", nowISO: NOW }
);
const journeyOrder = { id: "ord-9", ...journeyComposed };
const journeyPlan = storefront.planStoreConversion(journeyOrder, snap1, products, customers);
const journey = {
  order: J(journeyOrder),
  plan: J(journeyPlan),
  so: J(storefront.buildStoreSaleOrder(journeyOrder, journeyPlan, {
    number: "SO-9", customerId: "cu-1", customerName: "Ahmed Raza", customerPhone: "0301-2345678",
    products, taxSlabs: [], settings, nowISO: NOW,
  })),
};

/* ---------- the backup platform slice ---------- */
const seedJournal = seed.getSeedJournal(
  seed.getSeedProducts(), seed.getSeedSales(), seed.getSeedPurchases(),
  seed.getSeedSupplierPayments(), seed.getSeedExpenses(), seed.getSeedCredits()
);
const emptyCols = Object.fromEntries(backup.TENANT_COLLECTIONS.map((n) => [n, []]));
emptyCols.journal = J(seedJournal);
const backupInputs = {
  businessId: BIZ, exportedAt: NOW, exportedBy: "web",
  owner: { shopName: "Madina General Store" },
  collections: emptyCols,
  platform: {
    registry: null, counters: null, stats: null, members: [], invites: [], events: [], payments: [],
    storefront: { key: "madina-store", data: J(snap1) },
    storeOrders: [
      { key: "ord-1", data: J(goodOrder) },
      { key: "ord-x", data: { ...goodOrder, businessId: "another-shop" } },
    ],
  },
};
const fileH4 = backup.assembleBackup(backupInputs);
const foreignFrontFile = backup.assembleBackup({
  ...backupInputs,
  platform: {
    ...backupInputs.platform,
    storefront: { key: "other-shop", data: { ...snap1, businessId: "another-shop", slug: "other-shop" } },
    storeOrders: [],
  },
});
const legacy = JSON.parse(JSON.stringify(fileH4));
delete legacy.platform.storefront;
delete legacy.platform.storeOrders;
delete legacy.manifest.platformCounts.storefront;
delete legacy.manifest.platformCounts.storeOrders;
const targetEmpty = {
  owner: null,
  collections: Object.fromEntries(backup.TENANT_COLLECTIONS.map((n) => [n, []])),
  members: [], invites: [], storefront: null, storeOrders: [],
};
const planEmpty = backup.planRestore({ file: fileH4, targetBusinessId: BIZ, target: targetEmpty, actorUid: BIZ, nowISO: NOW });
const planForeignSlug = backup.planRestore({
  file: fileH4, targetBusinessId: BIZ, actorUid: BIZ, nowISO: NOW,
  target: { ...targetEmpty, storefront: { key: "someone-else", data: { businessId: BIZ, slug: "someone-else" } } },
});
const planSlugDiffContent = backup.planRestore({
  file: fileH4, targetBusinessId: BIZ, actorUid: BIZ, nowISO: NOW,
  target: { ...targetEmpty, storefront: { key: "madina-store", data: { ...snap1, shopName: "A Different Shop" } } },
});
const planForeignOrder = backup.planRestore({
  file: fileH4, targetBusinessId: BIZ, actorUid: BIZ, nowISO: NOW,
  target: { ...targetEmpty, storeOrders: [{ key: "ord-9", data: { ...goodOrder } }] },
});
const planShape = (p) => p.ok
  ? {
      ok: true, skipped: p.skipped, alreadyRestored: p.alreadyRestored,
      setPaths: p.writes.filter((w) => w.kind === "set").map((w) => w.path),
      addCollections: p.writes.filter((w) => w.kind === "add").map((w) => w.collection),
      eventKind: p.event ? p.event.kind : null,
    }
  : { ok: false, reason: p.reason, conflicts: p.conflicts };
const backupCases = {
  inputs: J(backupInputs),
  file: J(fileH4),
  fileVerifies: backup.verifyBackup(fileH4).ok,
  foreignFront: {
    storefront: foreignFrontFile.platform.storefront,
    counts: foreignFrontFile.manifest.platformCounts,
  },
  legacyVerifies: backup.verifyBackup(legacy).ok,
  planEmpty: planShape(planEmpty),
  planForeignSlug: planShape(planForeignSlug),
  planSlugDiffContent: planShape(planSlugDiffContent),
  planForeignOrder: planShape(planForeignOrder),
  // Resume: the empty-target plan applied, then re-planned — the
  // storefront + the surviving order are the resume case (skipped),
  // everything else already landed with them.
  planResumeTarget: {
    owner: { shopName: "Madina General Store" },
    collections: emptyCols,
    members: [], invites: [],
    storefront: { key: "madina-store", data: J(snap1) },
    storeOrders: [{ key: "ord-1", data: J(goodOrder) }],
  },
};
backupCases.planResume = planShape(backup.planRestore({
  file: fileH4, targetBusinessId: BIZ, target: backupCases.planResumeTarget, actorUid: BIZ, nowISO: NOW,
}));

/* ---------- link seams ---------- */
const linkCases = {
  path: storefront.storefrontPath("madina-store"),
  url: storefront.storefrontUrl("madina-store"),
  resolved: storefront.resolveStorefrontLink({ storefrontSlug: "madina-store" }),
  resolvedEmpty: storefront.resolveStorefrontLink({ storefrontSlug: "" }),
  resolvedAbsent: storefront.resolveStorefrontLink({}),
  resolvedNull: storefront.resolveStorefrontLink(null),
};

const out = {
  about:
    "H4 core fixture — expected values computed by the compiled web lib/storefront (+ plans + backup) over the H3 suite's cases; consumed by flutter-app/test/h4_fixtures_test.dart. Regenerate: node fixtures-export-h4.js (after compiling harness/tsconfig).",
  now: NOW,
  businessId: BIZ,
  settings,
  products,
  slugCases,
  suggestCases,
  bandCases,
  snapshotCases,
  litCases,
  litStateCases,
  shapeCases,
  composeCases,
  phoneCases,
  pageModel,
  conversionCases,
  journey,
  backupCases,
  linkCases,
};
const dest = path.join(__dirname, "fixtures", "h4-core.json");
fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log("wrote", dest);
