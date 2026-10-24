/**
 * Phase E · E1 — the print-design seam (design: ERP-PHASE-E-DESIGN.md
 * §1). Templates are settings; this module is the ONLY place they
 * are interpreted. Every print sheet resolves the shop's design
 * through `resolvePrintDesign` and renders through the shared
 * chrome (components/PrintChrome.tsx) — no sheet reads a raw
 * settings field for a print decision again.
 *
 * Phase E posts NOTHING: this module imports no posting path, no
 * store, no Firestore. Its derivations are display-only (§1.4) and
 * reuse harness-proven machinery — the per-line discount column is
 * the F-3 allocator's output, the per-line tax column is A4's
 * snapshotted `taxAmount` read verbatim. Nothing here is stored.
 */
import { allocateProRata } from "./tax";
import type {
  Bill,
  BillItem,
  PrintDesign,
  Product,
  Quotation,
  ShopSettings,
} from "./types";

export type { PrintDesign, PrintPaper, StampMode } from "./types";
import type { PrintPaper } from "./types";

/* ------------------------------------------------------------------ */
/* Resolution — every default lives here, nowhere else (§1.2)          */
/* ------------------------------------------------------------------ */

/** A PrintDesign with every field concrete, nested toggles too. */
export interface ResolvedPrintDesign
  extends Omit<Required<PrintDesign>, "stampDocs" | "signDocs"> {
  stampDocs: Required<NonNullable<PrintDesign["stampDocs"]>>;
  signDocs: Required<NonNullable<PrintDesign["signDocs"]>>;
}

export function resolvePrintDesign(settings: ShopSettings): ResolvedPrintDesign {
  const d = settings.printDesign ?? {};
  return {
    paper: d.paper ?? "a4",
    fontScale: d.fontScale ?? "standard",
    showLogo: d.showLogo ?? false,
    logoSize: d.logoSize ?? "m",
    showShopName: d.showShopName ?? true,
    showShopNameAlt: d.showShopNameAlt ?? true,
    showAddress: d.showAddress ?? true,
    showPhone: d.showPhone ?? true,
    colSku: d.colSku ?? false,
    colUrduName: d.colUrduName ?? false,
    colTax: d.colTax ?? false,
    colDiscount: d.colDiscount ?? false,
    footerNote: d.footerNote ?? "",
    termsText: d.termsText ?? "",
    showThanks: d.showThanks ?? true,
    thanksText: d.thanksText ?? "",
    showSignature: d.showSignature ?? false,
    headerMode: d.headerMode ?? "text",
    showLetterheadFooter: d.showLetterheadFooter ?? false,
    stampMode: d.stampMode ?? "paid",
    stampDocs: {
      notes: d.stampDocs?.notes ?? false,
      vouchers: d.stampDocs?.vouchers ?? false,
      quotations: d.stampDocs?.quotations ?? false,
    },
    signDocs: {
      vouchers: d.signDocs?.vouchers ?? true,
      salarySlips: d.signDocs?.salarySlips ?? true,
      bills: d.signDocs?.bills ?? false,
    },
    showRaastQr: d.showRaastQr ?? false,
    raastQrSize: d.raastQrSize ?? "m",
    raastDynamic: d.raastDynamic ?? true,
  };
}

/* ------------------------------------------------------------------ */
/* Paper mechanics (§1.7)                                              */
/* ------------------------------------------------------------------ */

/** The `@page` payload for a paper — asserted verbatim by the
 *  harness (§9 E1). a4-compact is a LAYOUT on A4 paper, so its
 *  page rule is A4's; the compactness lives in the layout class. */
export function paperPageRule(paper: PrintPaper): string {
  switch (paper) {
    case "a5":
      return "size: A5 portrait; margin: 8mm";
    case "thermal80":
      return "size: 80mm auto; margin: 4mm";
    case "a4":
    case "a4-compact":
    default:
      return "size: A4 portrait; margin: 10mm";
  }
}

/** The receipt element's class list for a resolved design. The
 *  classic A4 layout is the bare `.receipt` (today's measure);
 *  `paperOverride` is the desk's per-print choice (Print 80mm). */
export function receiptClassName(
  design: ResolvedPrintDesign,
  paperOverride?: PrintPaper
): string {
  const paper = paperOverride ?? design.paper;
  const parts = ["receipt"];
  if (paper === "a4-compact") parts.push("receipt-compact");
  else if (paper === "a5") parts.push("receipt-a5");
  else if (paper === "thermal80") parts.push("receipt-80");
  if (design.fontScale === "large") parts.push("receipt-lg");
  return parts.join(" ");
}

/* ------------------------------------------------------------------ */
/* The slot matrix (§1.5) — per-document sanity, enforced here so a    */
/* toggle can never give a document a slot its kind does not have.     */
/* The challan row is the invariant to notice: NO price-bearing        */
/* column exists for it, whatever the design says (B §2.3).            */
/* ------------------------------------------------------------------ */

export type PrintDocKind =
  | "bill"
  | "quotation"
  | "order"
  | "challan"
  | "po"
  | "note"
  | "voucher"
  | "transfer"
  | "production"
  | "job"
  | "salarySlip"
  | "report";

export interface PrintSlots {
  /** The template paper applies (reports are A4 always). */
  paper: boolean;
  colSku: boolean;
  colUrduName: boolean;
  colTax: boolean;
  colDiscount: boolean;
  footerNote: boolean;
  terms: boolean;
  /** "rule" = the bill's §2.4 status rule; "toggle" = a stampDocs
   *  boolean; "none" = the slot does not exist for this document. */
  stamp: "rule" | "toggle" | "none";
  /** "shop" = the shop's signature slot; "customer" = a receiver's
   *  ruled line that is body content, never the shop signature. */
  signature: "shop" | "customer" | "none";
}

export const PRINT_SLOTS: Record<PrintDocKind, PrintSlots> = {
  bill: {
    paper: true, colSku: true, colUrduName: true, colTax: true,
    colDiscount: true, footerNote: true, terms: true,
    stamp: "rule", signature: "shop",
  },
  quotation: {
    paper: true, colSku: true, colUrduName: true, colTax: false,
    colDiscount: true, footerNote: true, terms: true,
    stamp: "toggle", signature: "none",
  },
  order: {
    paper: true, colSku: true, colUrduName: true, colTax: false,
    colDiscount: true, footerNote: true, terms: true,
    stamp: "toggle", signature: "none",
  },
  challan: {
    paper: true, colSku: false, colUrduName: false, colTax: false,
    colDiscount: false, footerNote: true, terms: true,
    stamp: "none", signature: "customer",
  },
  po: {
    paper: true, colSku: false, colUrduName: false, colTax: false,
    colDiscount: false, footerNote: true, terms: true,
    stamp: "none", signature: "none",
  },
  note: {
    paper: true, colSku: true, colUrduName: true, colTax: true,
    colDiscount: false, footerNote: true, terms: true,
    stamp: "toggle", signature: "none",
  },
  voucher: {
    paper: true, colSku: false, colUrduName: false, colTax: false,
    colDiscount: false, footerNote: true, terms: true,
    stamp: "toggle", signature: "shop",
  },
  transfer: {
    paper: true, colSku: false, colUrduName: false, colTax: false,
    colDiscount: false, footerNote: false, terms: false,
    stamp: "none", signature: "none",
  },
  production: {
    paper: true, colSku: false, colUrduName: false, colTax: false,
    colDiscount: false, footerNote: false, terms: false,
    stamp: "none", signature: "none",
  },
  job: {
    paper: true, colSku: false, colUrduName: false, colTax: false,
    colDiscount: false, footerNote: true, terms: true,
    stamp: "none", signature: "customer",
  },
  salarySlip: {
    paper: true, colSku: false, colUrduName: false, colTax: false,
    colDiscount: false, footerNote: false, terms: false,
    stamp: "none", signature: "shop",
  },
  report: {
    paper: false, colSku: false, colUrduName: false, colTax: false,
    colDiscount: false, footerNote: true, terms: false,
    stamp: "none", signature: "none",
  },
};

export function slotsFor(kind: PrintDocKind): PrintSlots {
  return PRINT_SLOTS[kind];
}

/** The item-table columns a document actually gets: the design's
 *  toggles INTERSECTED with the kind's slots. A challan with every
 *  toggle on still gets no columns — that is the enforcement. */
export function resolveItemColumns(
  design: ResolvedPrintDesign,
  kind: PrintDocKind
): { sku: boolean; urduName: boolean; tax: boolean; discount: boolean } {
  const s = slotsFor(kind);
  return {
    sku: design.colSku && s.colSku,
    urduName: design.colUrduName && s.colUrduName,
    tax: design.colTax && s.colTax,
    discount: design.colDiscount && s.colDiscount,
  };
}

/* ------------------------------------------------------------------ */
/* Header slot resolution (§1.3, §1.7, §2.3)                           */
/* ------------------------------------------------------------------ */

/** The letterhead header REPLACES the text header wholesale when
 *  the mode selects it and the asset exists. Thermal suppresses
 *  letterheads unconditionally (§1.7 hard rule) — the text header
 *  prints instead, no owner action needed. */
export function letterheadHeaderVisible(
  design: ResolvedPrintDesign,
  hasAsset: boolean
): boolean {
  return (
    design.headerMode === "letterhead" && hasAsset && design.paper !== "thermal80"
  );
}

export function letterheadFooterVisible(
  design: ResolvedPrintDesign,
  hasAsset: boolean
): boolean {
  return (
    design.showLetterheadFooter && hasAsset && design.paper !== "thermal80"
  );
}

/** The logo prints in the text header when the mode is "logo-text",
 *  or in "text" mode when the showLogo toggle is on — and never
 *  when a letterhead banner has replaced the header. On thermal
 *  the logo still prints (small, centred — §1.7); it is the one
 *  image thermal keeps. */
export function logoVisible(
  design: ResolvedPrintDesign,
  hasAsset: boolean,
  hasLetterheadAsset: boolean
): boolean {
  if (!hasAsset) return false;
  if (letterheadHeaderVisible(design, hasLetterheadAsset)) return false;
  return design.headerMode === "logo-text" || design.showLogo;
}

/* ------------------------------------------------------------------ */
/* The stamp rule (§2.4) — a pure function of design + asset + doc.    */
/* The stamp asserts settlement: "paid" prints it only on a fully-   */
/* paid bill (a partially-returned bill has lost that assertion);    */
/* a held bill never carries it in any mode (held paper is not a     */
/* receipt). Per-doc toggles govern notes/vouchers/quotations.       */
/* Thermal suppresses the stamp (§1.7). Assets land in E2 — in E1    */
/* `asset` is always absent, so the slot renders nothing.            */
/* ------------------------------------------------------------------ */

export function stampVisible(
  design: ResolvedPrintDesign,
  asset: string | null | undefined,
  docKind: PrintDocKind,
  billStatus?: string
): boolean {
  if (!asset) return false;
  if (design.paper === "thermal80") return false;
  const slots = slotsFor(docKind);
  if (slots.stamp === "none") return false;
  if (slots.stamp === "toggle") {
    if (docKind === "note") return design.stampDocs.notes;
    if (docKind === "voucher") return design.stampDocs.vouchers;
    return design.stampDocs.quotations; // quotation + order family
  }
  // docKind === "bill": the §2.4 status rule.
  if (billStatus === "held") return false;
  if (design.stampMode === "never") return false;
  if (design.stampMode === "always") return true;
  return billStatus === "paid";
}

/** Whether the SHOP's signature slot renders for a document: the
 *  slot matrix grants it, and the per-doc default/toggle allows
 *  it. Bills are governed by `showSignature` (or signDocs.bills);
 *  vouchers and salary slips carry the slot by default (§2.4). */
export function shopSignatureVisible(
  design: ResolvedPrintDesign,
  docKind: PrintDocKind
): boolean {
  if (slotsFor(docKind).signature !== "shop") return false;
  if (docKind === "bill") return design.showSignature || design.signDocs.bills;
  if (docKind === "voucher") return design.signDocs.vouchers;
  if (docKind === "salarySlip") return design.signDocs.salarySlips;
  return false;
}

/* ------------------------------------------------------------------ */
/* Item-column sources (§1.4) — what is data, what is derivation       */
/* ------------------------------------------------------------------ */

/** SKU + Urdu name resolve LIVE from the subscribed products list
 *  by productId — documents snapshot neither. A deleted product
 *  prints blank. Display-only; never a snapshot change. */
export function productPrintInfo(
  products: readonly Product[] | undefined,
  productId: string
): { sku: string; urduName: string } {
  const p = products?.find((x) => x.id === productId);
  return { sku: p?.sku ?? "", urduName: p?.urduName ?? "" };
}

/** The per-line TAX column reads A4's snapshotted `taxAmount`
 *  verbatim — real document data, never recomputed at print
 *  (invariant 5). Absent (pre-A4 lines) ⇒ 0. */
export function printLineTax(item: Pick<BillItem, "taxAmount">): number {
  return item.taxAmount ?? 0;
}

/** The per-line DISCOUNT column is a DISPLAY-ONLY DERIVATION
 *  (§1.4): the document's discount spread over its line totals by
 *  `allocateProRata` — the F-3 allocator, whose final-absorbs rule
 *  makes the shares sum to the document discount to the paisa.
 *  Labelled a derivation here so nobody later "optimises" it into
 *  a stored field. */
export function printLineDiscounts(
  lineTotals: number[],
  discountAmount: number
): number[] {
  return allocateProRata(lineTotals, discountAmount);
}

/* ------------------------------------------------------------------ */
/* Sample fixtures (§1.8) — the designer's live preview renders the    */
/* REAL sheets against these fixed, obviously-fictional documents.     */
/* Code, not seed data (§10.3); fresh copies on every call.            */
/* ------------------------------------------------------------------ */

export function sampleProducts(): Product[] {
  return [
    {
      id: "sample-p1",
      sku: "SMP-001",
      name: "Sample Rice 5kg",
      urduName: "نمونہ چاول",
      category: "Grocery",
      unit: "packet",
      costPrice: 1200,
      salePrice: 1450,
      stockQty: 40,
      reorderLevel: 5,
      keywords: ["sample"],
    },
    {
      id: "sample-p2",
      sku: "SMP-002",
      name: "Sample Cooking Oil 1L",
      urduName: "نمونہ تیل",
      category: "Grocery",
      unit: "L",
      costPrice: 540,
      salePrice: 620,
      stockQty: 60,
      reorderLevel: 8,
      keywords: ["sample"],
    },
  ];
}

/** A paid sample bill: two lines, a flat discount, ONE exclusive
 *  tax line (snapshotted on the oil, GST 18% on its post-discount
 *  base of 1,781.85 ⇒ 320.73), a split cash/bank payment. The
 *  arithmetic closes: 4,760 − 200 + 320.73 = 4,880.73, and the
 *  payments sum to the total. */
export function sampleBill(): Bill {
  return {
    id: "sample-bill",
    billNo: 101,
    customerId: null,
    customerName: "Sample Customer",
    customerPhone: "0300-0000000",
    items: [
      {
        productId: "sample-p1",
        name: "Sample Rice 5kg",
        qty: 2,
        unitPrice: 1450,
        unitCost: 1200,
        total: 2900,
      },
      {
        productId: "sample-p2",
        name: "Sample Cooking Oil 1L",
        qty: 3,
        unitPrice: 620,
        unitCost: 540,
        total: 1860,
        taxAmount: 320.73,
        taxSlabId: "sample-gst",
        taxSlabName: "GST 18%",
        taxRate: 18,
        taxKind: "percent",
        taxInclusive: false,
      },
    ],
    subtotal: 4760,
    discountType: "flat",
    discountValue: 200,
    discountAmount: 200,
    taxAmount: 320.73,
    total: 4880.73,
    payments: [
      { method: "cash", amount: 3000, accountId: null },
      { method: "bank", amount: 1880.73, accountId: null },
    ],
    status: "paid",
    dayOffset: 0,
    ts: "2026-01-15T05:30:00.000Z",
  };
}

/** The family's other shape (§1.8): an issued quotation over the
 *  same sample lines — estimate-labelled, its tax an estimate. */
export function sampleQuotation(): Quotation {
  return {
    id: "sample-quotation",
    number: "QT-101",
    customerId: null,
    customerName: "Sample Customer",
    customerPhone: "0300-0000000",
    lines: [
      { productId: "sample-p1", name: "Sample Rice 5kg", qty: 2, unitPrice: 1450, total: 2900 },
      { productId: "sample-p2", name: "Sample Cooking Oil 1L", qty: 3, unitPrice: 620, total: 1860 },
    ],
    subtotal: 4760,
    discountType: "flat",
    discountValue: 200,
    discountAmount: 200,
    estimatedTax: 320.73,
    total: 4880.73,
    validUntil: "2026-01-31",
    note: "",
    status: "issued",
    issuedTs: "2026-01-15T05:30:00.000Z",
    dayOffset: 0,
    ts: "2026-01-15T05:30:00.000Z",
  };
}
