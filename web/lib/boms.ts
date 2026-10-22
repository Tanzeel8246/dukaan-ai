/**
 * Dukaan AI — Phase C · C3: BOM recipes (design ERP-PHASE-C-DESIGN.md
 * §3). Pure derivations + draft validation over the `boms`
 * collection, shared by the store, the manufacturing surface and
 * the harness so every surface agrees on versions, the active
 * recipe and what a legal recipe is.
 *
 * A BOM is a RECIPE document: it posts nothing, holds no stock and
 * carries no tax (§7 — components were taxed, if at all, when
 * purchased; the finished good is taxed, if at all, when sold).
 * BOMs are IMMUTABLE once created (§3.2): an edit is a new version
 * and the old version stays readable forever, so a production
 * order can always prove which recipe its costs came from.
 */
import type { Bom, Product } from "./types";
import { round2 } from "./tax";

/** Every version of the recipe for one output product, oldest first. */
export function bomsForOutput(boms: Bom[], outputProductId: string): Bom[] {
  return boms
    .filter((b) => b.outputProductId === outputProductId)
    .sort((a, b) => a.version - b.version);
}

/** The one active recipe for an output product, if any (§3.1:
 *  exactly one active BOM per output product). */
export function activeBomFor(boms: Bom[], outputProductId: string): Bom | undefined {
  return bomsForOutput(boms, outputProductId).find((b) => b.active);
}

/** The version number a new version of this output's recipe gets:
 *  max existing + 1 (1 for a product's first recipe). */
export function nextBomVersion(boms: Bom[], outputProductId: string): number {
  return (
    bomsForOutput(boms, outputProductId).reduce((m, b) => Math.max(m, b.version), 0) + 1
  );
}

/** Output products that carry at least one BOM version. */
export function bomOutputIds(boms: Bom[]): string[] {
  return [...new Set(boms.map((b) => b.outputProductId))];
}

export interface BomDraft {
  outputProductId: string;
  outputQty: number;
  labourCost: number;
  overheadCost: number;
  lines: Array<{ productId: string; qty: number }>;
}

export type BomDraftProblem =
  | "output_unknown" // the finished product does not exist
  | "output_raw" // a raw material cannot be a recipe's output (§3.1)
  | "empty_lines" // a recipe needs at least one component
  | "self_component" // a product may not list itself as a component (§3.3)
  | "unknown_component" // a component product does not exist
  | "bad_qty" // a component quantity must be > 0
  | "bad_batch"; // batch size > 0, conversion costs >= 0

/**
 * Validate a recipe draft BEFORE anything is composed or written
 * (the store refuses a problem draft whole — B's pre-composition
 * refusal discipline). Single-level only (§3.3): a component that
 * is itself a manufactured product is legitimate and consumed at
 * its shelf cost; its own BOM is never exploded.
 */
export function validateBomDraft(
  products: Array<Pick<Product, "id" | "stockClass">>,
  draft: BomDraft
): BomDraftProblem | null {
  const byId = new Map(products.map((p) => [p.id, p]));
  const output = byId.get(draft.outputProductId);
  if (!output) return "output_unknown";
  if (output.stockClass === "raw") return "output_raw";
  if (!draft.lines || draft.lines.length === 0) return "empty_lines";
  for (const l of draft.lines) {
    if (l.productId === draft.outputProductId) return "self_component";
    if (!byId.has(l.productId)) return "unknown_component";
    if (!(l.qty > 0)) return "bad_qty";
  }
  if (!(draft.outputQty > 0) || draft.labourCost < 0 || draft.overheadCost < 0)
    return "bad_batch";
  return null;
}

/** The materials cost of ONE batch at current shelf costs:
 *  Σ component qty × the component's current `costPrice`. A
 *  display/standard figure — production (C4) values issues at the
 *  costs in force when they happen. */
export function bomBatchMaterialCost(
  bom: Pick<Bom, "lines">,
  products: Array<Pick<Product, "id" | "costPrice">>
): number {
  const byId = new Map(products.map((p) => [p.id, p]));
  return round2(
    bom.lines.reduce((a, l) => a + l.qty * (byId.get(l.productId)?.costPrice ?? 0), 0)
  );
}

/** The standard cost of ONE finished unit: (batch materials +
 *  the batch's declared labour + overhead) / batch size. */
export function bomUnitCost(
  bom: Pick<Bom, "lines" | "outputQty" | "labourCost" | "overheadCost">,
  products: Array<Pick<Product, "id" | "costPrice">>
): number {
  if (!(bom.outputQty > 0)) return 0;
  return round2(
    (bomBatchMaterialCost(bom, products) + bom.labourCost + bom.overheadCost) /
      bom.outputQty
  );
}
