/// Dukaan AI — Phase C · C3: BOM recipes (Dart port of
/// web/lib/boms.ts, design ERP-PHASE-C-DESIGN.md §3). Pure
/// derivations + draft validation over the `boms` collection.
///
/// A BOM is a RECIPE document: it posts nothing, holds no stock
/// and carries no tax. BOMs are IMMUTABLE once created (§3.2): an
/// edit is a new version and the old version stays readable
/// forever, so a production order can always prove which recipe
/// its costs came from.
import 'ledger.dart' show roundPaisa;
import 'types.dart';

double round2(double n) => roundPaisa(n);

/// Every version of the recipe for one output product, oldest first.
List<Bom> bomsForOutput(List<Bom> boms, String outputProductId) {
  final out = boms.where((b) => b.outputProductId == outputProductId).toList();
  out.sort((a, b) => a.version.compareTo(b.version));
  return out;
}

/// The one active recipe for an output product, if any (§3.1:
/// exactly one active BOM per output product).
Bom? activeBomFor(List<Bom> boms, String outputProductId) {
  for (final b in bomsForOutput(boms, outputProductId)) {
    if (b.active) return b;
  }
  return null;
}

/// The version number a new version of this output's recipe gets:
/// max existing + 1 (1 for a product's first recipe).
int nextBomVersion(List<Bom> boms, String outputProductId) =>
    bomsForOutput(boms, outputProductId).fold(0, (m, b) => b.version > m ? b.version : m) + 1;

/// Output products that carry at least one BOM version.
List<String> bomOutputIds(List<Bom> boms) =>
    boms.map((b) => b.outputProductId).toSet().toList();

class BomDraft {
  final String outputProductId;
  final double outputQty;
  final double labourCost;
  final double overheadCost;
  final List<({String productId, double qty})> lines;
  const BomDraft({required this.outputProductId, required this.outputQty,
    this.labourCost = 0, this.overheadCost = 0, required this.lines});
}

/// Validate a recipe draft BEFORE anything is composed or
/// written (the store refuses a problem draft whole).
/// Problem codes: "output_unknown" | "output_raw" | "empty_lines"
/// | "self_component" | "unknown_component" | "bad_qty" |
/// "bad_batch"; null when the draft is legal. Single-level only
/// (§3.3): a component that is itself a manufactured product is
/// legitimate and consumed at its shelf cost.
String? validateBomDraft(List<Product> products, BomDraft draft) {
  final byId = {for (final p in products) p.id: p};
  final output = byId[draft.outputProductId];
  if (output == null) return 'output_unknown';
  if (output.stockClass == 'raw') return 'output_raw';
  if (draft.lines.isEmpty) return 'empty_lines';
  for (final l in draft.lines) {
    if (l.productId == draft.outputProductId) return 'self_component';
    if (!byId.containsKey(l.productId)) return 'unknown_component';
    if (!(l.qty > 0)) return 'bad_qty';
  }
  if (!(draft.outputQty > 0) || draft.labourCost < 0 || draft.overheadCost < 0) {
    return 'bad_batch';
  }
  return null;
}

/// The materials cost of ONE batch at current shelf costs:
/// Σ component qty × the component's current `costPrice`. A
/// display/standard figure — production values issues at the
/// costs in force when they happen.
double bomBatchMaterialCost(Bom bom, List<Product> products) {
  final byId = {for (final p in products) p.id: p};
  return round2(bom.lines.fold(
      0.0, (a, l) => a + l.qty * (byId[l.productId]?.costPrice ?? 0)));
}

/// The standard cost of ONE finished unit: (batch materials +
/// the batch's declared labour + overhead) / batch size.
double bomUnitCost(Bom bom, List<Product> products) {
  if (!(bom.outputQty > 0)) return 0;
  return round2(
      (bomBatchMaterialCost(bom, products) + bom.labourCost + bom.overheadCost) / bom.outputQty);
}
