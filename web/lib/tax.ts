/**
 * Dukaan AI — tax engine (ERP Phase A · A4, design §2).
 *
 * Pure computation only: slab resolution, per-line tax on the
 * post-discount base, purchase input tax, return tax shares and the
 * Finance tax position. Every posting path in the store calls these
 * helpers, and the verification harness exercises them directly —
 * the numbers the desks show and the numbers the journal posts can
 * never diverge.
 *
 * The invariants this module exists to protect (design §2.3/§2.4):
 *  - Tax is computed PER LINE on the line's post-discount base, and
 *    the bill tax is the SUM of line taxes — never re-rounded at
 *    bill level. Discount is spread over lines with the cumulative
 *    allocation the F-3 fix proved, so line bases always sum to
 *    (subtotal − discount) exactly.
 *  - Tax NEVER enters revenue, COGS or the P&L: sales tax posts to
 *    `tax_payable` (output), purchase tax to `tax_input`
 *    (recoverable) — a pass-through between the counterparty and
 *    the government.
 *  - Returns reverse tax with the same cumulative discipline over
 *    each line's OWN tax, so returning a taxed bill item-by-item
 *    reverses the original tax to the paisa.
 *  - With no slab resolved anywhere, every function here returns
 *    zeros and the callers' arithmetic collapses to the exact
 *    pre-A4 figures — the no-tax path is byte-identical by
 *    construction (harness-proved).
 */
import type {
  Bill,
  BillItem,
  JournalEntry,
  Product,
  Purchase,
  PurchaseItem,
  PurchaseReturn,
  SaleReturn,
  ShopSettings,
  TaxSlab,
} from "./types";
import { accountNormalBalance, entriesInMonth } from "./ledger";

/** Round to the paisa (2 dp) — the only rounding the tax engine does. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type TaxDirection = "sales" | "purchases";

type TaxSettings = Pick<
  ShopSettings,
  "defaultSalesTaxSlabId" | "defaultPurchaseTaxSlabId"
>;

/**
 * Resolve the slab for one line (design §2.2): a tax-exempt product
 * is never taxed; an explicit product slab wins when it is active
 * and applies to this direction; otherwise the shop default for the
 * direction when it exists, is active and applies; otherwise no tax.
 */
export function resolveTaxSlab(
  product: Pick<Product, "taxSlabId" | "taxExempt"> | null | undefined,
  slabs: TaxSlab[],
  settings: TaxSettings,
  direction: TaxDirection
): TaxSlab | null {
  if (product?.taxExempt) return null;
  const applies = (s: TaxSlab) =>
    s.active && (s.appliesTo === direction || s.appliesTo === "both");
  if (product?.taxSlabId) {
    const own = slabs.find((s) => s.id === product.taxSlabId);
    if (own && applies(own)) return own;
  }
  const defaultId =
    direction === "sales"
      ? settings.defaultSalesTaxSlabId
      : settings.defaultPurchaseTaxSlabId;
  if (defaultId) {
    const dflt = slabs.find((s) => s.id === defaultId);
    if (dflt && applies(dflt)) return dflt;
  }
  return null;
}

/**
 * Spread a bill-level amount (the discount) across line gross
 * totals, pro-rata, using cumulative rounding: share_i is the
 * increment of round2(amount × cumulativeGross / totalGross). The
 * shares sum EXACTLY to `amount` (the last line's cumulative is the
 * amount itself) — the F-3 discipline, applied across lines instead
 * of across return events.
 */
export function allocateProRata(lineTotals: number[], amount: number): number[] {
  const total = lineTotals.reduce((a, n) => a + n, 0);
  if (total <= 0 || amount === 0) return lineTotals.map(() => 0);
  const out: number[] = [];
  let cumGross = 0;
  let cumAllocated = 0;
  for (const t of lineTotals) {
    cumGross += t;
    const cum = round2((amount * cumGross) / total);
    out.push(round2(cum - cumAllocated));
    cumAllocated = cum;
  }
  return out;
}

/** Tax for ONE line on its post-discount base (design §2.3). */
export function lineTaxAmount(base: number, qty: number, slab: TaxSlab): number {
  if (slab.kind === "fixed") {
    // PKR per unit — identical for inclusive and exclusive; for an
    // inclusive slab the amount is extracted from the base instead
    // of added on top of it (the callers handle that distinction).
    return round2(slab.rate * qty);
  }
  if (slab.inclusive) {
    // The base IS the sticker amount; the tax is the part of it
    // above the net-of-tax value.
    if (slab.rate <= -100) return 0;
    return round2(base - base / (1 + slab.rate / 100));
  }
  return round2((base * slab.rate) / 100);
}

export interface TaxedLine {
  /** This line's share of the bill discount (sales only). */
  discountShare: number;
  /** Post-discount base the tax was computed on. For purchases this
   *  is the line's NET goods value (sticker − tax when inclusive). */
  base: number;
  taxAmount: number;
  slab: TaxSlab | null;
}

export interface BillTaxResult {
  lines: TaxedLine[];
  subtotal: number;
  taxAmount: number; // exclusive + inclusive
  exclusiveTax: number;
  inclusiveTax: number;
  /** What the customer pays: subtotal − discount + exclusive tax. */
  total: number;
}

/**
 * Full tax computation for a bill (design §2.3). `lines` are the
 * priced bill lines (gross `total`, `qty`) with their resolved slab
 * (null = untaxed). Revenue is credited at subtotal − inclusiveTax
 * by the posting template; the P&L's discount contra completes the
 * netting to (subtotal − discount − inclusiveTax).
 */
export function computeBillTaxes(
  lines: Array<{ total: number; qty: number; slab: TaxSlab | null }>,
  discountAmount: number
): BillTaxResult {
  const subtotal = lines.reduce((a, l) => a + l.total, 0);
  const shares = allocateProRata(
    lines.map((l) => l.total),
    discountAmount
  );
  let exclusiveTax = 0;
  let inclusiveTax = 0;
  const out: TaxedLine[] = lines.map((l, i) => {
    const discountShare = shares[i] ?? 0;
    const base = round2(l.total - discountShare);
    const taxAmount = l.slab ? lineTaxAmount(base, l.qty, l.slab) : 0;
    if (l.slab) {
      if (l.slab.inclusive) inclusiveTax += taxAmount;
      else exclusiveTax += taxAmount;
    }
    return { discountShare, base, taxAmount, slab: l.slab };
  });
  exclusiveTax = round2(exclusiveTax);
  inclusiveTax = round2(inclusiveTax);
  return {
    lines: out,
    subtotal,
    taxAmount: round2(exclusiveTax + inclusiveTax),
    exclusiveTax,
    inclusiveTax,
    total: round2(subtotal - discountAmount + exclusiveTax),
  };
}

export interface PurchaseTaxResult {
  lines: TaxedLine[];
  /** Goods value net of tax — what Inventory / Purchases post. */
  netTotal: number;
  taxAmount: number;
  /** Gross owed to the supplier: netTotal + taxAmount. For an
   *  exclusive slab this is sticker + tax; for an inclusive slab it
   *  is the sticker itself (net + extracted tax). */
  grossTotal: number;
}

/** Tax computation for a purchase (design §2.4): no discount; the
 *  supplier is owed the GROSS, stock enters at the NET. */
export function computePurchaseTaxes(
  lines: Array<{ total: number; qty: number; slab: TaxSlab | null }>
): PurchaseTaxResult {
  let netTotal = 0;
  let taxAmount = 0;
  const out: TaxedLine[] = lines.map((l) => {
    const tax = l.slab ? lineTaxAmount(l.total, l.qty, l.slab) : 0;
    const net = l.slab?.inclusive ? round2(l.total - tax) : l.total;
    netTotal += net;
    taxAmount += tax;
    return { discountShare: 0, base: net, taxAmount: tax, slab: l.slab };
  });
  netTotal = round2(netTotal);
  taxAmount = round2(taxAmount);
  return { lines: out, netTotal, taxAmount, grossTotal: round2(netTotal + taxAmount) };
}

export interface ReturnTaxShares {
  /** Total tax this return reverses (exclusive + inclusive). */
  taxShare: number;
  /** The part that had been ADDED to the customer's payment —
   *  this is what swells the refund beyond (gross − discount). */
  exclusiveTaxShare: number;
  /** The part that had been embedded in prices — reverses out of
   *  revenue (via tax_payable), never out of the refund. */
  inclusiveTaxShare: number;
  /** Per-productId tax share — stamped onto the SaleReturn's items
   *  so later partial returns accumulate against the truth. */
  perLine: Map<string, number>;
}

/**
 * Tax reversed by returning `retItems` from `bill` (design §2.4):
 * per line, the cumulative share of THAT line's snapshotted tax —
 * round2(lineTax × cumulativeReturnedGross / lineGross), minus what
 * prior returns already reversed; the completing return of a line
 * absorbs its paisa residual. Mirrors the F-3 discount discipline,
 * over gross and tax independently, so a taxed bill returned
 * item-by-item reverses exactly its original tax — and returning an
 * exempt line of a mixed bill reverses exactly zero.
 */
export function returnTaxShares(
  bill: Bill,
  priorReturns: SaleReturn[],
  retItems: BillItem[]
): ReturnTaxShares {
  const perLine = new Map<string, number>();
  let exclusiveTaxShare = 0;
  let inclusiveTaxShare = 0;
  for (const it of retItems) {
    const src = bill.items.find((x) => x.productId === it.productId);
    const lineTax = src?.taxAmount ?? 0;
    if (!src || lineTax <= 0 || src.total <= 0) {
      perLine.set(it.productId, 0);
      continue;
    }
    let priorGross = 0;
    let alreadyTax = 0;
    for (const r of priorReturns) {
      for (const ri of r.items) {
        if (ri.productId !== it.productId) continue;
        priorGross += ri.total;
        alreadyTax += ri.taxAmount ?? 0;
      }
    }
    const cumGross = priorGross + it.total;
    const cumTax =
      cumGross >= src.total - 1e-9
        ? lineTax
        : round2((lineTax * cumGross) / src.total);
    const share = Math.min(
      Math.max(0, round2(cumTax - alreadyTax)),
      Math.max(0, round2(lineTax - alreadyTax))
    );
    perLine.set(it.productId, share);
    if (src.taxInclusive) inclusiveTaxShare += share;
    else exclusiveTaxShare += share;
  }
  exclusiveTaxShare = round2(exclusiveTaxShare);
  inclusiveTaxShare = round2(inclusiveTaxShare);
  return {
    taxShare: round2(exclusiveTaxShare + inclusiveTaxShare),
    exclusiveTaxShare,
    inclusiveTaxShare,
    perLine,
  };
}

export interface PurchaseReturnTaxShares {
  /** Total input tax this return reverses. */
  taxShare: number;
  /** Per-productId tax share — stamped onto the PurchaseReturn's
   *  items so later partial returns accumulate against the truth. */
  perLine: Map<string, number>;
}

/**
 * Input tax reversed by returning `retItems` from `purchase`
 * (Phase B · B4, design §3.2) — the exact analogue of
 * `returnTaxShares`, on the purchase side. Per line, the cumulative
 * share of THAT line's snapshotted tax: round2(lineTax ×
 * cumulativeReturnedTotal / lineTotal), minus what prior purchase
 * returns already reversed; the completing return of a line absorbs
 * its paisa residual. Returning a taxed purchase item-by-item
 * therefore reverses its `tax_input` to the paisa, and returning an
 * untaxed line of a mixed purchase reverses exactly zero.
 *
 * `retItems` carry the purchase line's own basis: `total` is the
 * returned qty × the purchase line's unitCost (the sticker the tax
 * snapshot was computed on), exactly as sales returns carry the
 * bill line's gross.
 */
export function purchaseReturnTaxShares(
  purchase: Purchase,
  priorReturns: PurchaseReturn[],
  retItems: Array<Pick<PurchaseItem, "productId" | "total">>
): PurchaseReturnTaxShares {
  const perLine = new Map<string, number>();
  let taxShare = 0;
  for (const it of retItems) {
    const src = purchase.items.find((x) => x.productId === it.productId);
    const lineTax = src?.taxAmount ?? 0;
    if (!src || lineTax <= 0 || src.total <= 0) {
      perLine.set(it.productId, 0);
      continue;
    }
    let priorTotal = 0;
    let alreadyTax = 0;
    for (const r of priorReturns) {
      for (const ri of r.items) {
        if (ri.productId !== it.productId) continue;
        priorTotal += ri.total;
        alreadyTax += ri.taxAmount ?? 0;
      }
    }
    const cumTotal = priorTotal + it.total;
    const cumTax =
      cumTotal >= src.total - 1e-9
        ? lineTax
        : round2((lineTax * cumTotal) / src.total);
    const share = Math.min(
      Math.max(0, round2(cumTax - alreadyTax)),
      Math.max(0, round2(lineTax - alreadyTax))
    );
    perLine.set(it.productId, share);
    taxShare += share;
  }
  return { taxShare: round2(taxShare), perLine };
}

export interface BillTaxLine {
  name: string;
  rate: number;
  kind: "percent" | "fixed";
  inclusive: boolean;
  amount: number;
}

/**
 * Receipt/print tax lines for a set of stamped lines (design
 * §2.3): one entry per slab used, amounts summed from the line
 * snapshots — so a print produced after the slab was renamed or
 * deleted still shows the tax exactly as it was charged. Empty
 * when the lines carry no tax. Used by bill receipts (via
 * `billTaxLines`) and by Phase B · B4 note prints, whose stamped
 * items carry the same snapshot fields (§3.4).
 */
export function taxLinesForItems(
  items: Array<
    Pick<
      BillItem,
      "taxAmount" | "taxSlabId" | "taxSlabName" | "taxRate" | "taxKind" | "taxInclusive"
    >
  >
): BillTaxLine[] {
  const groups = new Map<string, BillTaxLine>();
  for (const it of items) {
    const amt = it.taxAmount ?? 0;
    if (amt <= 0) continue;
    const key = `${it.taxSlabId ?? it.taxSlabName ?? "?"}|${it.taxInclusive ? "in" : "ex"}`;
    const g = groups.get(key) ?? {
      name: it.taxSlabName ?? "Tax",
      rate: it.taxRate ?? 0,
      kind: it.taxKind ?? "percent",
      inclusive: !!it.taxInclusive,
      amount: 0,
    };
    g.amount = round2(g.amount + amt);
    groups.set(key, g);
  }
  return [...groups.values()];
}

/**
 * Receipt tax lines for a posted bill (design §2.3) — the grouping
 * of `taxLinesForItems` over the bill's stamped lines. The no-tax
 * receipt stays byte-identical to the pre-A4 layout.
 */
export function billTaxLines(bill: Bill): BillTaxLine[] {
  return taxLinesForItems(bill.items);
}

/* ---------------- Finance tax position ---------------- */

export interface TaxPosition {
  /** Output tax collected and still owed to the government
   *  (tax_payable on its normal, credit, side). */
  outputTax: number;
  /** Input tax paid on purchases, recoverable (tax_input, debit). */
  inputTax: number;
  /** Net amount payable: output − input (may be negative when the
   *  shop is in a refund position). The two accounts are reported
   *  gross here; the offsetting entry belongs to fiscal close. */
  netPayable: number;
  /** This month's movements: output tax charged, input tax claimed. */
  outputThisMonth: number;
  inputThisMonth: number;
}

/** The shop's tax position, derived from journal lines only —
 *  balances of the two tax accounts plus the current month's
 *  movements (design §2.4). */
export function taxPosition(entries: JournalEntry[], ref = new Date()): TaxPosition {
  const outputTax = accountNormalBalance(entries, "tax_payable");
  const inputTax = accountNormalBalance(entries, "tax_input");
  let outputThisMonth = 0;
  let inputThisMonth = 0;
  for (const e of entriesInMonth(entries, ref)) {
    for (const l of e.lines) {
      if (l.account === "tax_payable") outputThisMonth += l.credit - l.debit;
      if (l.account === "tax_input") inputThisMonth += l.debit - l.credit;
    }
  }
  return {
    outputTax: round2(outputTax),
    inputTax: round2(inputTax),
    netPayable: round2(outputTax - inputTax),
    outputThisMonth: round2(outputThisMonth),
    inputThisMonth: round2(inputThisMonth),
  };
}
