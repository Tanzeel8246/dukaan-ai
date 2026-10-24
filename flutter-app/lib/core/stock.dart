/// Dukaan AI — Phase C · C1: the location subledger (Dart port of
/// web/lib/stock.ts, design ERP-PHASE-C-DESIGN.md §1). Pure
/// derivations over warehouses + stockLevels, shared by the store,
/// the desks and the test suite so every surface agrees on the
/// same quantities.
///
/// THE MODEL (§1.1): stock-level rows are the per-location truth;
/// `Product.stockQty` stays the product total, updated in the same
/// batch as every row change it mirrors. The journal never learns
/// where goods sit (§1.4) — location is a subledger dimension
/// under the one inventory GL.
///
/// THE RESOLUTION RULE (§1.3): a product with NO rows at all
/// resolves as — all of `stockQty` sits in the default warehouse.
/// Once ANY row exists for a product, rows are its complete truth
/// and a missing (product, warehouse) pair reads as 0.
import 'documents.dart' show challanBilledQty, orderBilledQty;
import 'transfers.dart' show inTransitByProduct;
import 'types.dart';

/// The default warehouse's FIXED id (§1.2) — pre-migration readers
/// can resolve the constant before any doc exists.
const String defaultWarehouseIdConst = 'wh-main';

/// The deterministic row id (§1.3): every row write is an
/// idempotent set/increment on a known doc.
String levelIdFor(String warehouseId, String productId) => '${warehouseId}__$productId';

StockLevel makeLevel(String warehouseId, String productId, double qty) =>
    StockLevel(id: levelIdFor(warehouseId, productId), warehouseId: warehouseId, productId: productId, qty: qty);

/// Warehouses in display order (sortOrder, then name).
List<Warehouse> sortedWarehouses(List<Warehouse> warehouses) {
  final out = [...warehouses];
  out.sort((a, b) {
    final c = a.sortOrder.compareTo(b.sortOrder);
    return c != 0 ? c : a.name.compareTo(b.name);
  });
  return out;
}

/// Warehouses a desk may pick / stock may sit in: not archived.
List<Warehouse> activeWarehouses(List<Warehouse> warehouses) =>
    sortedWarehouses(warehouses).where((w) => !w.archived).toList();

/// The shop's default warehouse (§1.2): the non-archived warehouse
/// flagged `isDefault`. Falls back to any flagged warehouse, then
/// the first active one; null when the shop has no warehouses yet.
Warehouse? defaultWarehouse(List<Warehouse> warehouses) {
  for (final w in warehouses) {
    if (w.isDefault && !w.archived) return w;
  }
  for (final w in warehouses) {
    if (w.isDefault) return w;
  }
  final active = activeWarehouses(warehouses);
  return active.isEmpty ? null : active.first;
}

String defaultWarehouseId(List<Warehouse> warehouses) =>
    defaultWarehouse(warehouses)?.id ?? defaultWarehouseIdConst;

/// Resolve a document's warehouse stamp to the warehouse a movement
/// touches: the stamp itself when it names a warehouse that exists
/// (archived included — history stays where history happened), else
/// the default warehouse (§1.3/§1.6: absent stamp ⇒ default).
String resolveWarehouseId(List<Warehouse> warehouses, String? stamp) {
  if (stamp != null && warehouses.any((w) => w.id == stamp)) return stamp;
  return defaultWarehouseId(warehouses);
}

/// True when the product has at least one stock-level row — the
/// switch between the §1.3 resolution rule and rows-as-truth.
bool productHasRows(List<StockLevel> levels, String productId) =>
    levels.any((l) => l.productId == productId);

/// The raw row quantity (0 when the pair has no row) — no
/// resolution rule applied.
double rowQtyOf(List<StockLevel> levels, String warehouseId, String productId) {
  for (final l in levels) {
    if (l.warehouseId == warehouseId && l.productId == productId) return l.qty;
  }
  return 0;
}

/// Σ of a product's rows, over every warehouse.
double rowsTotal(List<StockLevel> levels, String productId) =>
    levels.where((l) => l.productId == productId).fold(0.0, (a, l) => a + l.qty);

/// How much of a product sits at a warehouse — THE read every desk
/// uses. Applies the §1.3 resolution rule.
double qtyAtWarehouse(Product product, List<StockLevel> levels,
    List<Warehouse> warehouses, String warehouseId) {
  if (!productHasRows(levels, product.id)) {
    return warehouseId == defaultWarehouseId(warehouses) ? product.stockQty : 0;
  }
  return rowQtyOf(levels, warehouseId, product.id);
}

/// Apply a signed quantity delta to one (product, warehouse) row —
/// the pure-list mirror of the cloud batch's `increment` write
/// (used by tests; the store writes through Firestore increments).
/// Creates the row when the pair has none.
List<StockLevel> applyLevelDelta(
    List<StockLevel> levels, String warehouseId, String productId, double delta) {
  if (delta == 0) return levels;
  final id = levelIdFor(warehouseId, productId);
  if (!levels.any((l) => l.id == id)) {
    return [...levels, makeLevel(warehouseId, productId, delta)];
  }
  return [
    for (final l in levels)
      if (l.id == id)
        StockLevel(id: l.id, warehouseId: l.warehouseId, productId: l.productId, qty: l.qty + delta)
      else
        l,
  ];
}

/* ---------------- the stockV1 migration (§10.1) ---------------- */

/// The rows `stockV1` must CREATE for a shop: for every product
/// with no rows at all, its default-warehouse row at the product's
/// current `stockQty`. Products that already have rows are skipped
/// whole. Writes no journal entries and changes no total.
List<StockLevel> stockV1Rows(List<Product> products, List<StockLevel> levels,
    [String warehouseId = defaultWarehouseIdConst]) {
  final withRows = levels.map((l) => l.productId).toSet();
  return [
    for (final p in products)
      if (!withRows.contains(p.id)) makeLevel(warehouseId, p.id, p.stockQty),
  ];
}

/* ---------------- promised / availability, per warehouse (§1.6) ---------------- */

/// A document's EFFECTIVE warehouse for the promise partition: its
/// own `warehouseId` when set, else the default warehouse.
String effectiveWarehouseId(String? docWarehouseId, String defaultWhId) =>
    docWarehouseId ?? defaultWhId;

double _remainingQty(double lineQty, Map<String, double> fulfilled, String productId) {
  final r = lineQty - (fulfilled[productId] ?? 0);
  return r > 0 ? r : 0;
}

/// Quantities PROMISED per warehouse, per product: the B §2.5
/// derived reservation partitioned by each promising document's
/// effective warehouse. Σ over warehouses reproduces the global
/// promised figure per product exactly.
Map<String, Map<String, double>> promisedByWarehouse(
  List<SaleOrder> orders,
  List<DeliveryChallan> challans,
  List<Bill> bills,
  String defaultWhId,
) {
  final out = <String, Map<String, double>>{};
  void add(String warehouseId, String productId, double qty) {
    if (qty <= 0) return;
    final byProduct = out.putIfAbsent(warehouseId, () => <String, double>{});
    byProduct[productId] = (byProduct[productId] ?? 0) + qty;
  }

  void addRemaining(
      String warehouseId, List<DocLine> lines, Map<String, double> fulfilled) {
    for (final l in lines) {
      add(warehouseId, l.productId, _remainingQty(l.qty, fulfilled, l.productId));
    }
  }

  final activeOrders = <String>{};
  for (final o in orders) {
    if (o.status == 'draft' || o.status == 'cancelled') continue;
    activeOrders.add(o.id);
    addRemaining(effectiveWarehouseId(o.warehouseId, defaultWhId), o.lines,
        orderBilledQty(o, bills, challans));
  }
  for (final c in challans) {
    if (c.status != 'dispatched' && c.status != 'partially_billed' && c.status != 'billed') {
      continue;
    }
    if (c.orderId != null && activeOrders.contains(c.orderId)) continue;
    addRemaining(effectiveWarehouseId(c.warehouseId, defaultWhId), c.lines,
        challanBilledQty(c, bills));
  }
  return out;
}

class WarehouseAvailability {
  final double onHand;
  final double promised;
  final double available;
  const WarehouseAvailability({required this.onHand, required this.promised, required this.available});
  Map<String, dynamic> toMap() => {'onHand': onHand, 'promised': promised, 'available': available};
}

/// The availability report for ONE warehouse (§1.6): per product,
/// on-hand at that warehouse, promised at that warehouse, and the
/// difference. A report figure: it warns at the desks, never
/// blocks a posting.
Map<String, WarehouseAvailability> availabilityByProductAtWarehouse(
  List<Product> products,
  List<StockLevel> levels,
  List<Warehouse> warehouses,
  List<SaleOrder> orders,
  List<DeliveryChallan> challans,
  List<Bill> bills,
  String warehouseId,
) {
  final promised =
      promisedByWarehouse(orders, challans, bills, defaultWarehouseId(warehouses))[warehouseId];
  final out = <String, WarehouseAvailability>{};
  for (final p in products) {
    final onHand = qtyAtWarehouse(p, levels, warehouses, warehouseId);
    final pr = promised?[p.id] ?? 0;
    out[p.id] = WarehouseAvailability(onHand: onHand, promised: pr, available: onHand - pr);
  }
  return out;
}

/* ---------------- the drift detector + recount (§1.7) ---------------- */

class StockDrift {
  final String productId;
  final double rowsTotal;
  final double inTransit;
  final double stockQty;
  final double drift; // rowsTotal + inTransit − stockQty
  const StockDrift({required this.productId, required this.rowsTotal,
    required this.inTransit, required this.stockQty, required this.drift});
  Map<String, dynamic> toMap() => {
        'productId': productId, 'rowsTotal': rowsTotal, 'inTransit': inTransit,
        'stockQty': stockQty, 'drift': drift,
      };
}

/// Every product whose rows disagree with its total (§1.7). Only
/// products WITH rows can drift: a product with no rows resolves
/// exactly (§1.3). The comparison is the §1.3 mirror identity —
/// Σ rows + in-transit == stockQty.
List<StockDrift> stockDrift(
  List<Product> products,
  List<StockLevel> levels,
  List<StockTransfer> transfers,
) {
  final inTransit = inTransitByProduct(transfers);
  final out = <StockDrift>[];
  for (final p in products) {
    if (!productHasRows(levels, p.id)) continue;
    final total = rowsTotal(levels, p.id);
    final transit = inTransit[p.id] ?? 0;
    final drift = total + transit - p.stockQty;
    if (drift.abs() > 1e-9) {
      out.add(StockDrift(
          productId: p.id, rowsTotal: total, inTransit: transit, stockQty: p.stockQty, drift: drift));
    }
  }
  return out;
}

/// Recount locations (§1.7): rewrite the ROWS ONLY so each drifted
/// product's split matches its `stockQty` — the excess/deficit is
/// absorbed by the DEFAULT warehouse's row. Fabricates no journal
/// history (rows are operational detail). Returns the corrected
/// levels plus how many products were repaired.
({List<StockLevel> levels, int repaired}) recountLevels(
  List<Product> products,
  List<StockLevel> levels,
  List<Warehouse> warehouses,
  List<StockTransfer> transfers,
) {
  final drifted = stockDrift(products, levels, transfers);
  if (drifted.isEmpty) return (levels: levels, repaired: 0);
  final defId = defaultWarehouseId(warehouses);
  var next = levels;
  for (final d in drifted) {
    next = applyLevelDelta(next, defId, d.productId, -d.drift);
  }
  return (levels: next, repaired: drifted.length);
}
