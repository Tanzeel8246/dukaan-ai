/**
 * Dukaan AI — Phase H · H3 online storefront (design: ERP-PHASE-H-
 * DESIGN.md §2). Pure functions only — no Firebase, no store, no
 * DOM — so the harness proves the storefront contract (snapshot
 * shape, slug rules, the public-read truth table, the inbox shape,
 * conversion drift + exactly-once) against the same code the
 * clients run, and rules v10 mirror the derivations here.
 *
 * The shape in one paragraph (design §2.1): a snapshot the owner
 * publishes, a public page that renders it, and an inbox that
 * hands orders to the document chain — in that order of trust.
 *
 *  - The snapshot (`storefronts/{slug}`) is a denormalised
 *    publishing artefact assembled HERE from live data. It carries
 *    NO cost price, NO stock count, NO tenant path — stock travels
 *    as a band, prices as advertising. The public page renders
 *    from this doc ALONE (storefrontPageModel is its only input).
 *  - The inbox (`storeOrders`) is create-only for the public and
 *    shape-validated (storeOrderShapeOk is the rules' mirror).
 *    An order is PAPER: it posts nothing, reserves nothing, and
 *    creates no customer. Its worst abuse case is dismissible
 *    paper, never a posting (§2.4).
 *  - Conversion is a member act (planStoreConversion +
 *    buildStoreSaleOrder): lines are re-priced against LIVE
 *    products with the drift computed for display BEFORE the
 *    member confirms; a product deleted since publishing drops
 *    its line with a flag; the SO is born `open` carrying
 *    sourceType/sourceOrderId, and the inbox doc's state flip in
 *    the same batch is the exactly-once claim (§2.5).
 *  - The public-read derivation (storefrontLit) is the rules'
 *    mirror: lit only while the assignment SNAPSHOT's tier holds
 *    `storefront` AND the derived plan state is active/founding —
 *    dark in trial (Standard's set), grace, read-only and
 *    suspension. The shop's own preview is a MEMBER read and is
 *    not this function (§2.6).
 *
 * This module composes NO journal entry and imports no posting
 * path: storefront money exists only later, as ordinary bills
 * converted from the SO through the Phase B machinery.
 */

import { estimateDocTotals } from "./documents";
import { derivePlanState, tierIncludesModule } from "./plans";
import type { BusinessRegistryDoc } from "./tenancy";
import type {
  Customer,
  DocLine,
  Product,
  SaleOrder,
  ShopSettings,
  StoreOrder,
  StorefrontDoc,
  StorefrontProduct,
  StoreStockState,
  TaxSlab,
} from "./types";

/* ------------------------------------------------------------------ */
/* Links (design §2.3)                                                 */
/* ------------------------------------------------------------------ */

/** The product's one public origin (the root layout's SITE_URL).
 *  Per-shop subdomains are NOT offered in Phase H — wildcard
 *  routing per tenant is a hosting conversation, named in the
 *  design so nobody promises it. The shareable link is a path. */
export const STOREFRONT_ORIGIN = "https://dukaan-ai.codehubb.com";

export function storefrontPath(slug: string): string {
  return `/s/${slug}`;
}

export function storefrontUrl(slug: string): string {
  return `${STOREFRONT_ORIGIN}${storefrontPath(slug)}`;
}

/** The print/link seam (design §2.3): the absolute store URL a
 *  receipt QR encodes, resolved from the owner doc's cached slug
 *  label. Null when the shop has never published — every legacy
 *  receipt then prints exactly as it always has. The QR this
 *  feeds is a LINK qr (lib/qr machinery), rendered in its own
 *  slot, never styled as the Raast payment QR (E3's honesty
 *  discipline). */
export function resolveStorefrontLink(
  settings: Pick<ShopSettings, "storefrontSlug"> | null | undefined
): string | null {
  const slug = settings?.storefrontSlug;
  return typeof slug === "string" && slug !== "" ? storefrontUrl(slug) : null;
}

/* ------------------------------------------------------------------ */
/* Slugs (design §2.2/§2.6, Q7)                                        */
/* ------------------------------------------------------------------ */

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 40;

/** Slugs that would collide with the app's own routes or lie
 *  about what they are. `demo` is the §5.3 labelled preview's
 *  slug — it can never be a real shop's. */
export const RESERVED_SLUGS: readonly string[] = [
  "demo", "platform", "login", "signup", "settings", "api", "s",
  "storefront", "sales", "billing", "reports", "customers",
  "inventory", "admin", "support", "help", "www", "app", "owner",
];

export type SlugProblem = "too-short" | "too-long" | "bad-chars" | "reserved";

/** Validate a slug CANDIDATE (as typed — no silent rewriting:
 *  the slug is printed on receipts, so what the owner sees is
 *  what the world gets). Lowercase letters/digits with single
 *  hyphens between groups; never a leading/trailing hyphen. */
export function slugProblem(slug: string): SlugProblem | null {
  if (typeof slug !== "string") return "bad-chars";
  if (slug.length < SLUG_MIN_LENGTH) return "too-short";
  if (slug.length > SLUG_MAX_LENGTH) return "too-long";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "bad-chars";
  if (RESERVED_SLUGS.includes(slug)) return "reserved";
  return null;
}

export function slugOk(slug: string): boolean {
  return slugProblem(slug) === null;
}

/** A starting suggestion from the shop's name (the owner edits
 *  it at claim time; collisions take a suffix he picks — Q7).
 *  Returns "" when the name yields nothing usable. */
export function suggestSlug(shopName: string): string {
  const base = (shopName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
  return base.length >= SLUG_MIN_LENGTH && !RESERVED_SLUGS.includes(base)
    ? base
    : "";
}

/* ------------------------------------------------------------------ */
/* Stock bands (design §2.2) — bands, never counts                     */
/* ------------------------------------------------------------------ */

/** The public stock band for a product: `out` at zero, `low` at
 *  or below the product's own reorder level, else `in`. The
 *  count itself never leaves the shop. */
export function stockBandFor(
  p: Pick<Product, "stockQty" | "reorderLevel">
): Exclude<StoreStockState, "hidden"> {
  if (!(p.stockQty > 0)) return "out";
  if (p.stockQty <= Math.max(0, p.reorderLevel || 0)) return "low";
  return "in";
}

/* ------------------------------------------------------------------ */
/* The snapshot assembler (design §2.2)                                */
/* ------------------------------------------------------------------ */

/** A Firestore doc cannot grow without bound; a kiryana
 *  catalogue fits far inside this. The rules cap identically. */
export const MAX_STOREFRONT_PRODUCTS = 500;

export interface PublishInput {
  businessId: string;
  /** The claimed slug — MUST equal the previous doc's slug when
   *  one exists (the store refuses a change before calling). */
  slug: string;
  settings: Pick<ShopSettings, "shopName" | "phone">;
  city?: string | null;
  /** The E2 logo asset's data URL, copied in (the public page
   *  may read nothing else, so the snapshot carries its logo). */
  logoDataUrl?: string | null;
  products: Product[];
  /** Products the owner excludes from the public store. The
   *  union with the previous snapshot's hidden set is published
   *  (an exclusion is sticky until the owner un-excludes it). */
  excludedProductIds?: string[];
  includeProductIds?: string[]; // explicit un-exclusions
  tagline?: string | null;
  notice?: string | null;
  previous?: StorefrontDoc | null;
  nowISO: string;
}

/**
 * Assemble the published snapshot from live data. Pure: the same
 * inputs always produce the same doc, which is what lets the
 * store's auto-republish compare before writing. Carries NO cost
 * price and NO stock count — the harness deep-scans the output
 * for both. `enabled` and `publishedAt` are the previous doc's
 * (unpublishing is its own act, never a re-publish side effect).
 */
export function assembleStorefrontSnapshot(input: PublishInput): StorefrontDoc {
  const prev = input.previous ?? null;
  const hidden = new Set<string>(input.excludedProductIds ?? []);
  for (const p of prev?.products ?? []) {
    if (p.stockState === "hidden") hidden.add(p.productId);
  }
  for (const id of input.includeProductIds ?? []) hidden.delete(id);

  const sorted = [...input.products].sort((a, b) =>
    (a.category || "").localeCompare(b.category || "") ||
    a.name.localeCompare(b.name)
  );
  const products: StorefrontProduct[] = sorted
    .slice(0, MAX_STOREFRONT_PRODUCTS)
    .map((p, i) => {
      const entry: StorefrontProduct = {
        productId: p.id,
        name: p.name,
        price: p.salePrice,
        unit: p.unit,
        stockState: hidden.has(p.id) ? "hidden" : stockBandFor(p),
        sort: i,
      };
      if (p.urduName && p.urduName.trim() !== "") entry.nameUr = p.urduName;
      if (p.category && p.category.trim() !== "") entry.category = p.category;
      return entry;
    });

  const doc: StorefrontDoc = {
    businessId: input.businessId,
    slug: input.slug,
    shopName: input.settings.shopName,
    phone: input.settings.phone,
    enabled: prev ? prev.enabled : true,
    publishedAt: prev ? prev.publishedAt : input.nowISO,
    updatedAt: input.nowISO,
    currency: "PKR",
    products,
  };
  const tagline = input.tagline !== undefined ? input.tagline : prev?.tagline;
  if (tagline && tagline.trim() !== "") doc.tagline = tagline.trim();
  const notice = input.notice !== undefined ? input.notice : prev?.notice;
  if (notice && notice.trim() !== "") doc.notice = notice.trim();
  const city = input.city !== undefined ? input.city : prev?.city;
  if (city && city.trim() !== "") doc.city = city.trim();
  const logo = input.logoDataUrl !== undefined ? input.logoDataUrl : prev?.logoRef;
  if (logo) doc.logoRef = logo;
  return doc;
}

/** Two snapshots carry the same PUBLIC content when everything
 *  but the publish stamps matches (the auto-republish seam: a
 *  product save that changes nothing public writes nothing). */
export function storefrontContentEqual(
  a: StorefrontDoc | null,
  b: StorefrontDoc | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const strip = (d: StorefrontDoc) => {
    const { publishedAt: _p, updatedAt: _u, ...rest } = d;
    return JSON.stringify(rest);
  };
  return strip(a) === strip(b);
}

/* ------------------------------------------------------------------ */
/* The public-read derivation (design §2.6) — the rules' mirror        */
/* ------------------------------------------------------------------ */

/**
 * Is this snapshot PUBLICLY READABLE right now? The storefront
 * doc's read rule derives exactly this from the businesses doc:
 * the snapshot exists and is enabled, the assignment SNAPSHOT's
 * tier holds `storefront` (Advanced — a trial's Standard set
 * never lights a store), and the derived plan state is `active`
 * or `founding`. Grace, read-only and suspension are DARK: the
 * storefront is a selling surface, not the shopkeeper's data
 * right, and a lapsed shop taking orders it cannot be reminded
 * to fulfil is worse than a dark page. Enforcement staging does
 * not enter into it — a plan fact, not an enforcement act.
 */
/** The lit rule over its two derived inputs — the desk reads
 *  these off its PlanView; `storefrontLit` derives them from a
 *  registry doc. One rule, two doors. */
export function storefrontLitState(
  modulesTier: string,
  state: string,
  doc: Pick<StorefrontDoc, "enabled"> | null
): boolean {
  if (!doc || doc.enabled !== true) return false;
  if (!tierIncludesModule(modulesTier, "storefront")) return false;
  return state === "active" || state === "founding";
}

export function storefrontLit(
  registry: Pick<BusinessRegistryDoc, "status" | "plan"> | null,
  doc: Pick<StorefrontDoc, "enabled"> | null,
  nowISO: string
): boolean {
  if (!registry || !registry.plan) return false;
  return storefrontLitState(
    registry.plan.modulesTier,
    derivePlanState(registry, nowISO),
    doc
  );
}

/* ------------------------------------------------------------------ */
/* The public page model — the snapshot is the ONLY input              */
/* ------------------------------------------------------------------ */

export interface StorefrontCard {
  productId: string;
  name: string;
  nameUr?: string;
  price: number;
  unit: string;
  category: string; // "" = the shop's uncategorised group
  stockState: Exclude<StoreStockState, "hidden">;
  /** `out` goods display but cannot be ordered. */
  orderable: boolean;
}

export interface StorefrontPageModel {
  shopName: string;
  tagline?: string;
  phone: string;
  city?: string;
  logoRef?: string;
  notice?: string;
  currency: "PKR";
  cards: StorefrontCard[];
  groups: Array<{ category: string; cards: StorefrontCard[] }>;
}

/**
 * Everything the public page renders, derived from the snapshot
 * alone — the acceptance seam: given ONLY a StorefrontDoc (no
 * tenant access of any kind), this produces the whole page.
 * Hidden products never reach the model; groups preserve the
 * snapshot's category order, cards their publish sort.
 */
export function storefrontPageModel(doc: StorefrontDoc): StorefrontPageModel {
  const cards: StorefrontCard[] = doc.products
    .filter((p) => p.stockState !== "hidden")
    .sort((a, b) => a.sort - b.sort)
    .map((p) => {
      const card: StorefrontCard = {
        productId: p.productId,
        name: p.name,
        price: p.price,
        unit: p.unit,
        category: p.category ?? "",
        stockState: p.stockState as Exclude<StoreStockState, "hidden">,
        orderable: p.stockState !== "out",
      };
      if (p.nameUr) card.nameUr = p.nameUr;
      return card;
    });
  const groups: StorefrontPageModel["groups"] = [];
  for (const card of cards) {
    const g = groups.find((x) => x.category === card.category);
    if (g) g.cards.push(card);
    else groups.push({ category: card.category, cards: [card] });
  }
  const model: StorefrontPageModel = {
    shopName: doc.shopName,
    phone: doc.phone,
    currency: doc.currency,
    cards,
    groups,
  };
  if (doc.tagline) model.tagline = doc.tagline;
  if (doc.city) model.city = doc.city;
  if (doc.logoRef) model.logoRef = doc.logoRef;
  if (doc.notice) model.notice = doc.notice;
  return model;
}

/* ------------------------------------------------------------------ */
/* The order inbox (design §2.4) — shape, compose, validate            */
/* ------------------------------------------------------------------ */

export const STORE_ORDER_LIMITS = {
  nameMax: 60,
  phoneMin: 7,
  phoneMax: 16,
  noteMax: 300,
  linesMax: 50,
  qtyMin: 1,
  qtyMax: 999,
} as const;

const STORE_ORDER_KEYS: ReadonlySet<string> = new Set([
  "businessId", "slug", "customerName", "phone", "lines", "note",
  "fulfilment", "createdAt", "state",
  // Phase H · H6 (audit fix 2): the customer's own checkout
  // consent tick joins the exactly-keyed shape (rules v10
  // amendment, same span discipline). Present ⇒ exactly true.
  "waOptIn",
]);

/** A phone as the shop dials it: optional leading +, digits,
 *  spaces and hyphens, 7–16 characters total. */
export function phoneShapeOk(phone: unknown): phone is string {
  return (
    typeof phone === "string" &&
    phone.length >= STORE_ORDER_LIMITS.phoneMin &&
    phone.length <= STORE_ORDER_LIMITS.phoneMax &&
    /^\+?[0-9][0-9 -]*$/.test(phone)
  );
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * The inbox shape, validated exactly as rules v10 validate it —
 * the hostile-shape mirror. A create is legal iff: the key set is
 * exactly the §2.4 set (note optional), every scalar is in
 * bounds, the lines are 1–50 of exactly {productId, qty} with
 * integer qty 1..999, the state is born "new", and createdAt is
 * an ISO instant (the page writes a server timestamp, which
 * Firestore materialises to request.time — the rules compare
 * against request.time itself; this mirror validates the
 * composed payload the page submits).
 */
export function storeOrderShapeOk(data: unknown): boolean {
  if (!isPlainObject(data)) return false;
  for (const k of Object.keys(data)) {
    if (!STORE_ORDER_KEYS.has(k)) return false;
  }
  const { businessId, slug, customerName, phone, lines, note, fulfilment, createdAt, state, waOptIn } = data;
  // H6: the consent tick may only ever be exactly true — false,
  // a string, or any other value is a shape violation, and an
  // absent key (unticked) is the only other legal state.
  if (waOptIn !== undefined && waOptIn !== true) return false;
  if (typeof businessId !== "string" || businessId === "" || businessId.length > 128) return false;
  if (typeof slug !== "string" || !slugOk(slug)) return false;
  if (
    typeof customerName !== "string" ||
    customerName.trim() === "" ||
    customerName.length > STORE_ORDER_LIMITS.nameMax
  ) return false;
  if (!phoneShapeOk(phone)) return false;
  if (note !== undefined && (typeof note !== "string" || note.length > STORE_ORDER_LIMITS.noteMax)) return false;
  if (fulfilment !== "pickup" && fulfilment !== "delivery") return false;
  if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt))) return false;
  if (state !== "new") return false;
  if (!Array.isArray(lines) || lines.length < 1 || lines.length > STORE_ORDER_LIMITS.linesMax) return false;
  for (const line of lines) {
    if (!isPlainObject(line)) return false;
    const keys = Object.keys(line);
    if (keys.length !== 2 || !("productId" in line) || !("qty" in line)) return false;
    if (typeof line.productId !== "string" || line.productId === "") return false;
    if (
      typeof line.qty !== "number" ||
      !Number.isInteger(line.qty) ||
      line.qty < STORE_ORDER_LIMITS.qtyMin ||
      line.qty > STORE_ORDER_LIMITS.qtyMax
    ) return false;
  }
  return true;
}

export interface StoreOrderInput {
  customerName: string;
  phone: string;
  note?: string;
  fulfilment: "pickup" | "delivery";
  lines: Array<{ productId: string; qty: number }>;
  /** H6: the customer's own WhatsApp consent tick on the public
   *  checkout form. Only an explicit true composes the key onto
   *  the order; anything else leaves it absent (≡ no consent). */
  waOptIn?: boolean;
}

/**
 * Compose the order document the public page submits (sans its
 * Firestore id). Duplicate products merge (a cart cannot hold a
 * product twice; a hand-built payload might try) — a merge that
 * overflows the qty cap refuses the whole order rather than
 * silently truncating what a customer asked for. Returns null
 * when the composed shape fails storeOrderShapeOk.
 */
export function composeStoreOrder(
  input: StoreOrderInput,
  ctx: { businessId: string; slug: string; nowISO: string }
): Omit<StoreOrder, "id"> | null {
  const merged = new Map<string, number>();
  for (const l of input.lines ?? []) {
    merged.set(l.productId, (merged.get(l.productId) ?? 0) + l.qty);
  }
  const lines = [...merged.entries()].map(([productId, qty]) => ({ productId, qty }));
  const candidate: Record<string, unknown> = {
    businessId: ctx.businessId,
    slug: ctx.slug,
    customerName: (input.customerName ?? "").trim(),
    phone: (input.phone ?? "").trim(),
    lines,
    fulfilment: input.fulfilment,
    createdAt: ctx.nowISO,
    state: "new",
  };
  const note = (input.note ?? "").trim();
  if (note !== "") candidate.note = note;
  if (input.waOptIn === true) candidate.waOptIn = true;
  if (!storeOrderShapeOk(candidate)) return null;
  return candidate as unknown as Omit<StoreOrder, "id">;
}

/** Phone comparison for customer matching: digits only, with
 *  the Pakistani trunk/country forms folded (0300… ≡ +92 300…).
 *  Matching is an OFFER to the member at conversion, never a
 *  silent merge (§2.5) — this only finds the candidate. */
export function normalizePhone(phone: string): string {
  let d = (phone ?? "").replace(/\D/g, "");
  if (d.startsWith("92") && d.length === 12) d = "0" + d.slice(2);
  if (d.startsWith("0092")) d = "0" + d.slice(4);
  return d;
}

export function matchCustomerByPhone(
  order: Pick<StoreOrder, "phone">,
  customers: Customer[]
): Customer | null {
  const want = normalizePhone(order.phone);
  if (want === "") return null;
  return customers.find((c) => normalizePhone(c.phone) === want) ?? null;
}

/* ------------------------------------------------------------------ */
/* Conversion (design §2.5) — an order becomes an SO-, or nothing      */
/* ------------------------------------------------------------------ */

export interface ConversionDriftLine {
  productId: string;
  /** The name the customer saw (the snapshot's), falling back
   *  to the live product's, then the id. */
  name: string;
  qty: number;
  /** The advertised price at publish; null when the product is
   *  not in the snapshot (defensive — it cannot be ordered). */
  publishedPrice: number | null;
  /** The LIVE price the SO will carry; null when the product
   *  has been deleted since publishing (the line drops). */
  livePrice: number | null;
  priceChanged: boolean;
  productMissing: boolean;
}

export interface StoreConversionPlan {
  /** The SO's lines at LIVE prices, missing products dropped. */
  lines: DocLine[];
  drift: ConversionDriftLine[];
  droppedCount: number;
  /** The phone-matched existing customer, or null (the member
   *  confirms; conversion creates the customer when null). */
  customer: Customer | null;
}

/**
 * Plan a conversion against LIVE data. Returns null when the
 * conversion must be refused before anything is composed:
 *  - the order is not `new` — the state IS the exactly-once
 *    claim; a converted or dismissed order converts never again;
 *  - every line's product is gone (an SO of nothing is nothing).
 * Quantities are NOT clamped to stock — SOs may exceed stock;
 * Phase B's derived fulfilment already speaks backorder (§2.5).
 */
export function planStoreConversion(
  order: StoreOrder,
  snapshot: StorefrontDoc | null,
  products: Product[],
  customers: Customer[]
): StoreConversionPlan | null {
  if (order.state !== "new") return null;
  const byId = new Map(products.map((p) => [p.id, p]));
  const published = new Map(
    (snapshot?.products ?? []).map((p) => [p.productId, p])
  );
  const drift: ConversionDriftLine[] = [];
  const lines: DocLine[] = [];
  for (const l of order.lines) {
    const live = byId.get(l.productId);
    const pub = published.get(l.productId);
    const entry: ConversionDriftLine = {
      productId: l.productId,
      name: pub?.name ?? live?.name ?? l.productId,
      qty: l.qty,
      publishedPrice: pub ? pub.price : null,
      livePrice: live ? live.salePrice : null,
      priceChanged: !!live && !!pub && live.salePrice !== pub.price,
      productMissing: !live,
    };
    drift.push(entry);
    if (live) {
      lines.push({
        productId: live.id,
        name: live.name,
        qty: l.qty,
        unitPrice: live.salePrice,
        total: l.qty * live.salePrice,
        sourceProductId: l.productId,
      });
    }
  }
  if (lines.length === 0) return null;
  return {
    lines,
    drift,
    droppedCount: drift.filter((d) => d.productMissing).length,
    customer: matchCustomerByPhone(order, customers),
  };
}

/**
 * The sale order a conversion births (sans its id — the store
 * assigns ids). Born `open` with its number already minted: the
 * member reviewed the drift and confirmed, which IS the
 * confirmation a desk order gets from confirmSaleOrder. Totals
 * are the Phase B estimate over the live-priced lines (§7's
 * display-only tax estimate, as every SO carries).
 */
export function buildStoreSaleOrder(
  order: StoreOrder,
  plan: StoreConversionPlan,
  opts: {
    number: string;
    customerId: string | null;
    customerName: string;
    customerPhone: string;
    products: Product[];
    taxSlabs: TaxSlab[];
    settings: Pick<
      ShopSettings,
      "defaultSalesTaxSlabId" | "defaultPurchaseTaxSlabId" | "docSeries"
    >;
    nowISO: string;
  }
): Omit<SaleOrder, "id"> {
  const totals = estimateDocTotals(
    plan.lines,
    "flat",
    0,
    opts.products,
    opts.taxSlabs,
    opts.settings
  );
  return {
    number: opts.number,
    customerId: opts.customerId,
    customerName: opts.customerName,
    customerPhone: opts.customerPhone,
    lines: plan.lines,
    subtotal: totals.subtotal,
    discountType: "flat",
    discountValue: 0,
    discountAmount: totals.discountAmount,
    estimatedTax: totals.estimatedTax,
    total: totals.total,
    source: null,
    sourceType: "storefront",
    sourceOrderId: order.id,
    expectedDate: null,
    note: order.note ?? "",
    status: "open",
    dayOffset: 0,
    ts: opts.nowISO,
  };
}

/** The inbox's headline figures for the desk (derived, never
 *  stored — the derivation doctrine). */
export function storeOrderCounts(orders: StoreOrder[]): {
  fresh: number;
  converted: number;
  dismissed: number;
} {
  return {
    fresh: orders.filter((o) => o.state === "new").length,
    converted: orders.filter((o) => o.state === "converted").length,
    dismissed: orders.filter((o) => o.state === "dismissed").length,
  };
}
