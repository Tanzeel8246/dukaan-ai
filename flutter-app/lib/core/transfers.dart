/// Dukaan AI — Phase C · C2: stock transfers (Dart port of
/// web/lib/transfers.ts, design ERP-PHASE-C-DESIGN.md §2). Pure
/// derivations + the one posting composition, shared by the
/// store, the desks and the test suite.
///
/// THE MODEL (§2.1/§2.2): a transfer is a movement document
/// between the shop's OWN warehouses. Dispatch drops the source
/// warehouse's rows; receives raise the destination's; the
/// product TOTAL never changes while goods are on the road —
/// in-transit is a DERIVED quantity (Σ over open transfers of
/// qtySent − qtyReceived), not a place, not a GL account, and
/// available for sale NOWHERE.
///
/// VALUE (§2.3): dispatch and receipt post NOTHING. The one
/// exception is a proven shortage at close-short: the missing
/// units are a stock loss at the product's current shelf cost,
/// posted through the adjustment template's shape (refType
/// "transfer_loss") in the same batch as the close, and the
/// product total drops by the shortage — restoring §1.3's
/// identity (Σ rows + in-transit == stockQty) with the loss
/// INSIDE the ledger.
import 'ledger.dart' show fmtQty, makeEntry, roundPaisa;
import 'types.dart';

double round2(double n) => roundPaisa(n);

/* ---------------- line arithmetic & in-transit (§2.2) ---------------- */

/// What one line still owes the destination: sent, not yet
/// received. The derivation — never the cached status label —
/// gates what may still be received.
double lineRemaining(StockTransferLine line) {
  final r = line.qtySent - line.qtyReceived;
  return r > 0 ? r : 0;
}

double transferSentQty(StockTransfer t) => t.lines.fold(0.0, (a, l) => a + l.qtySent);
double transferReceivedQty(StockTransfer t) => t.lines.fold(0.0, (a, l) => a + l.qtyReceived);

/// A transfer is OPEN while its goods are (partly) on the road.
bool isOpenTransfer(StockTransfer t) => t.status == 'dispatched' || t.status == 'partially_received';

/// Σ (qtySent − qtyReceived) over OPEN transfers, per product —
/// the goods on the road.
Map<String, double> inTransitByProduct(List<StockTransfer> transfers) {
  final out = <String, double>{};
  for (final t in transfers) {
    if (!isOpenTransfer(t)) continue;
    for (final l in t.lines) {
      final r = lineRemaining(l);
      if (r > 0) out[l.productId] = (out[l.productId] ?? 0) + r;
    }
  }
  return out;
}

/// Total units on the road across every open transfer.
double inTransitTotalQty(List<StockTransfer> transfers) =>
    inTransitByProduct(transfers).values.fold(0.0, (a, v) => a + v);

/// Goods on the road TO one warehouse, per product — the
/// "incoming" figure the desks show (§8). In NO warehouse's
/// availability (§2.2).
Map<String, double> incomingByProductAtWarehouse(List<StockTransfer> transfers, String warehouseId) {
  final out = <String, double>{};
  for (final t in transfers) {
    if (!isOpenTransfer(t) || t.toWarehouseId != warehouseId) continue;
    for (final l in t.lines) {
      final r = lineRemaining(l);
      if (r > 0) out[l.productId] = (out[l.productId] ?? 0) + r;
    }
  }
  return out;
}

/// Goods on the road between one pair of warehouses (display).
double inTransitBetween(List<StockTransfer> transfers, String fromWarehouseId, String toWarehouseId) {
  var n = 0.0;
  for (final t in transfers) {
    if (!isOpenTransfer(t)) continue;
    if (t.fromWarehouseId != fromWarehouseId || t.toWarehouseId != toWarehouseId) continue;
    for (final l in t.lines) {
      n += lineRemaining(l);
    }
  }
  return n;
}

/* ---------------- the transition table (§2.4) ---------------- */

/// Whether a transfer action is legal from the transfer's current
/// status. The store validates through this BEFORE composing any
/// write, so a refused action writes nothing.
bool canTransferTransition(StockTransfer t, String action) {
  switch (action) {
    case 'edit':
    case 'delete':
    case 'cancel':
    case 'dispatch':
      // Drafts are freely editable/deletable/cancellable and are
      // the only state dispatch can leave (§2.4).
      return t.status == 'draft';
    case 'receive':
    case 'closeShort':
    case 'returnToSource':
      // A dispatched transfer's only exits (§2.4).
      return isOpenTransfer(t);
  }
  return false;
}

/// The cached status label recomputed from the lines after a
/// receive (§2.2).
String statusAfterReceive(List<StockTransferLine> lines) {
  final sent = lines.fold(0.0, (a, l) => a + l.qtySent);
  final received = lines.fold(0.0, (a, l) => a + l.qtyReceived);
  if (received <= 0) return 'dispatched';
  if (received >= sent) return 'received';
  return 'partially_received';
}

/* ---------------- composition & validation (§2.4) ---------------- */

/// Why a transfer route cannot be composed: "same" | "missing" |
/// "archived"; null when the route is legal. Archived endpoints
/// refuse NEW drafts; dispatch tolerates an endpoint archived
/// after drafting (the store decides).
String? transferRouteProblem(String fromWarehouseId, String toWarehouseId, List<Warehouse> warehouses) {
  if (fromWarehouseId == toWarehouseId) return 'same';
  Warehouse? from, to;
  for (final w in warehouses) {
    if (w.id == fromWarehouseId) from = w;
    if (w.id == toWarehouseId) to = w;
  }
  if (from == null || to == null) return 'missing';
  if (from.archived || to.archived) return 'archived';
  return null;
}

/// Compose transfer lines from the desk's picks: duplicate picks
/// of one product merge, names snapshot from the product,
/// `qtyReceived` starts at 0. Returns null — refusing the whole
/// composition — on an unknown product, a non-positive quantity,
/// or no lines at all.
List<StockTransferLine>? composeTransferLines(
    List<Product> products, List<({String productId, double qty})> picks) {
  final byId = {for (final p in products) p.id: p};
  final merged = <String, double>{};
  for (final pick in picks) {
    if (!byId.containsKey(pick.productId)) return null;
    if (!pick.qty.isFinite || pick.qty <= 0) return null;
    merged[pick.productId] = (merged[pick.productId] ?? 0) + pick.qty;
  }
  if (merged.isEmpty) return null;
  return [
    for (final e in merged.entries)
      StockTransferLine(productId: e.key, name: byId[e.key]?.name ?? e.key, qtySent: e.value, qtyReceived: 0),
  ];
}

/// Validate a receive's picks against the transfer's DERIVED
/// remainders (§2.4): every pick must name a line of the transfer,
/// carry a positive quantity, and keep the line's cumulative
/// received ≤ sent. Over-receipt is refused HERE — before the
/// store composes any write. Returns the merged picks, or null.
List<({String productId, double qty})>? validateReceivePicks(
    StockTransfer t, List<({String productId, double qty})> picks) {
  if (picks.isEmpty) return null;
  final merged = <String, double>{};
  for (final pick in picks) {
    if (!pick.qty.isFinite || pick.qty <= 0) return null;
    merged[pick.productId] = (merged[pick.productId] ?? 0) + pick.qty;
  }
  for (final e in merged.entries) {
    StockTransferLine? line;
    for (final l in t.lines) {
      if (l.productId == e.key) line = l;
    }
    if (line == null) return null;
    if (line.qtyReceived + e.value > line.qtySent + 1e-9) return null;
  }
  return [for (final e in merged.entries) (productId: e.key, qty: e.value)];
}

/// Apply validated receive picks to the lines: the ONLY writer of
/// `qtyReceived` (§2.2).
List<StockTransferLine> applyReceivePicks(
    List<StockTransferLine> lines, List<({String productId, double qty})> picks) {
  final byId = {for (final p in picks) p.productId: p.qty};
  return [
    for (final l in lines)
      byId.containsKey(l.productId)
          ? l.copyWith(qtyReceived: l.qtyReceived + byId[l.productId]!)
          : l,
  ];
}

/// The shortage a close-short would book, per line: what was sent
/// and never arrived (§2.3/§2.4).
List<({String productId, String name, double qty})> transferShortages(StockTransfer t) => [
      for (final l in t.lines)
        if (lineRemaining(l) > 0) (productId: l.productId, name: l.name, qty: lineRemaining(l)),
    ];

/* ---------------- class accounts + the loss posting (§2.3/§4.1) ---------------- */

/// The inventory account that holds a stock class's value:
/// `inventory_raw` for raw materials, `inventory` for goods
/// (§4.1). With no raw products every template is byte-identical
/// to pre-C3.
String inventoryAccountForClass(String? stockClass) =>
    stockClass == 'raw' ? 'inventory_raw' : 'inventory';

/// The class-change reclass entry (design §4.1): moving a product
/// between classes with stock on hand moves the shelf value
/// (qtyOnHand × costPrice) between the class accounts in ONE
/// documented entry, refType "reclass" — the A §1.6 true-up form.
/// Returns null when there is nothing to move: same class, zero
/// stock, or zero value (a bare flag flip posts nothing). A
/// negative on-hand quantity reclasses as the mirror image.
JournalEntry? buildReclassEntry(Product product, String? toClass, double qtyOnHand, double costPrice) {
  final from = inventoryAccountForClass(product.stockClass);
  final to = inventoryAccountForClass(toClass);
  if (from == to) return null;
  final amount = round2(qtyOnHand * costPrice);
  if (amount == 0) return null;
  final memo = 'Stock class reclass — ${product.name} (${from == 'inventory_raw' ? 'raw material → goods' : 'goods → raw material'})';
  return amount > 0
      ? makeEntry(memo, 'reclass', product.id, [
          JournalLine(account: to, debit: amount),
          JournalLine(account: from, credit: amount),
        ])
      : makeEntry(memo, 'reclass', product.id, [
          JournalLine(account: from, debit: -amount),
          JournalLine(account: to, credit: -amount),
        ]);
}

/// The value a shortage list carries: Σ short × the product's
/// CURRENT shelf `costPrice` (§2.3). A shortage line whose product
/// no longer exists contributes 0.
double transferLossValue(
    List<({String productId, String name, double qty})> shortages, Map<String, Product> productsById) {
  var total = 0.0;
  for (final s in shortages) {
    total += s.qty * (productsById[s.productId]?.costPrice ?? 0);
  }
  return total;
}

/// Compose the close-short loss entry (§2.3), through the real
/// `makeEntry` guard:
///
///   Dr  inventory_loss                     Σ short × costPrice
///       Cr  inventory | inventory_raw      per product class
///
/// refType "transfer_loss", refId the transfer. Returns null when
/// the shortage carries no value.
JournalEntry? buildTransferLossEntry(
  StockTransfer transfer,
  List<({String productId, String name, double qty})> shortages,
  Map<String, Product> productsById,
) {
  final byAccount = <String, double>{};
  for (final s in shortages) {
    final p = productsById[s.productId];
    if (p == null) continue;
    final value = s.qty * p.costPrice;
    if (value <= 0) continue;
    final acct = inventoryAccountForClass(p.stockClass);
    byAccount[acct] = (byAccount[acct] ?? 0) + value;
  }
  if (byAccount.isEmpty) return null;
  final total = byAccount.values.fold(0.0, (a, v) => a + v);
  final units = shortages.fold(0.0, (a, s) => a + s.qty);
  return makeEntry(
    'Transfer loss — ${transfer.number ?? transfer.id} (${fmtQty(units)} unit${units == 1 ? '' : 's'} short on receipt)',
    'transfer_loss',
    transfer.id,
    [
      JournalLine(account: 'inventory_loss', debit: total),
      for (final e in byAccount.entries) JournalLine(account: e.key, credit: e.value),
    ],
  );
}
