/// Dukaan AI — Fix Round 2 · FR2 item 1: demo data opt-in (Dart
/// port of web/lib/demo.ts's pure core).
///
/// New businesses start EMPTY; demo data arrives only through
/// the explicit owner act. This file is what the app needs to
/// classify a business and to show the pre-list: the demo set's
/// ids, the classification, and the summary figures.
///
/// The web derives the ids from its seed generators; the app
/// carries no seed generators, so the id sets are data here —
/// the contract ("these ids ARE demo") the fixture proves
/// byte-for-byte against the web's generators. Product prices
/// are the seed-data table (stockQty × costPrice / salePrice),
/// so demoSummary() is computed, not constant-folded: its sums
/// must land on 272,805 cost / 303,250 retail exactly.
library;

/// Content collections: everything the backup covers except the
/// structural pair (accounts, warehouses). Classification runs
/// over these alone — a business holding only the skeleton is
/// still "empty".
const List<String> demoContentCollections = [
  'products',
  'sales',
  'bills',
  'suppliers',
  'purchases',
  'supplierPayments',
  'expenses',
  'credits',
  'customers',
  'returns',
  'adjustments',
  'dayCloses',
  'cashEntries',
  'journal',
  'taxSlabs',
  'stockLevels',
];

/// All demo collections (content + structural), the set the
/// "Add demo data" write plan covers.
const List<String> cloudDemoCollections = [
  'products',
  'sales',
  'bills',
  'suppliers',
  'purchases',
  'supplierPayments',
  'expenses',
  'credits',
  'customers',
  'returns',
  'adjustments',
  'dayCloses',
  'cashEntries',
  'journal',
  'accounts',
  'taxSlabs',
  'warehouses',
  'stockLevels',
];

/// The demo seed's 25 products: (id, stockQty, costPrice,
/// salePrice) from web/lib/seed-data.json. Sums: cost 272,805,
/// retail 303,250 — the figures the live demo business carries.
const List<(String, int, int, int)> demoProducts = [
  ('p01', 14, 2450, 2600),
  ('p02', 42, 390, 430),
  ('p03', 60, 78, 95),
  ('p04', 18, 980, 1050),
  ('p05', 120, 105, 125),
  ('p06', 8, 2750, 2900),
  ('p07', 25, 340, 380),
  ('p08', 22, 280, 320),
  ('p09', 20, 300, 340),
  ('p10', 30, 690, 750),
  ('p11', 48, 235, 260),
  ('p12', 24, 395, 430),
  ('p13', 45, 90, 110),
  ('p14', 55, 115, 135),
  ('p15', 40, 85, 105),
  ('p16', 16, 420, 460),
  ('p17', 70, 130, 150),
  ('p18', 22, 380, 420),
  ('p19', 35, 260, 290),
  ('p20', 50, 145, 170),
  ('p21', 60, 195, 230),
  ('p22', 12, 640, 700),
  ('p23', 10, 990, 1080),
  ('p24', 65, 120, 145),
  ('p25', 6, 1950, 2100),
];

/// The frozen 21 journal ids (the seed journal) — the demo
/// journal is these PLUS the 8 loyalty entries below.
const List<String> demoFrozenJournalIds = [
  'j-seed-opening',
  'j-seed-sale-0',
  'j-seed-sale-1',
  'j-seed-sale-2',
  'j-seed-sale-3',
  'j-seed-sale-4',
  'j-seed-sale-5',
  'j-seed-sale-6',
  'j-seed-sale-7',
  'j-seed-sale-8',
  'j-seed-sale-9',
  'j-seed-sale-10',
  'j-seed-sale-11',
  'j-seed-sale-12',
  'j-seed-sale-13',
  'j-seed-pur-pur-1',
  'j-seed-spay-spay-1',
  'j-seed-exp-exp-1',
  'j-seed-exp-exp-2',
  'j-seed-cr-cr-1',
  'j-seed-cr-cr-2',
];

/// The demo loyalty story's 8 journal ids (4 loyalty bills +
/// 4 loyalty earns) — the live demo business carries 29 journal
/// entries, not 21.
const List<String> demoLoyaltyJournalIds = [
  'j-demo-loyalty-bill-1',
  'j-demo-loyalty-bill-2',
  'j-demo-loyalty-bill-3',
  'j-demo-loyalty-bill-4',
  'j-demo-loyalty-earn-1',
  'j-demo-loyalty-earn-2',
  'j-demo-loyalty-earn-3',
  'j-demo-loyalty-earn-4',
];

String _padded(int n) => n.toString().padLeft(4, '0');

/// The demo set's ids per collection — the web's demoSetIds(),
/// as data. Products p01..p25, sales s-0001..s-0347 and stock
/// levels wh-main__pXX are generated (the web's ids are
/// sequential too); the rest are the fixed ids the fixture pins.
Map<String, Set<String>> demoSetIds() {
  final products = {for (final p in demoProducts) p.$1};
  return {
    'products': products,
    'sales': {for (var i = 1; i <= 347; i++) 's-${_padded(i)}'},
    'bills': {},
    'suppliers': {'sup-1', 'sup-2'},
    'purchases': {'pur-1'},
    'supplierPayments': {'spay-1'},
    'expenses': {'exp-1', 'exp-2'},
    'credits': {'cr-1', 'cr-2'},
    'customers': {'cu-1', 'cu-2', 'cu-3'},
    'returns': {},
    'adjustments': {},
    'dayCloses': {},
    'cashEntries': {},
    'journal': {...demoLoyaltyJournalIds, ...demoFrozenJournalIds},
    'accounts': {'acc-till', 'acc-wallet-legacy', 'acc-jazzcash', 'acc-easypaisa', 'acc-bank'},
    'taxSlabs': {'tax-sample-gst'},
    'warehouses': {'wh-main'},
    'stockLevels': {for (final p in demoProducts) 'wh-main__${p.$1}'},
  };
}

/// What "Add demo data" will add — the pre-list the owner sees,
/// computed from the id sets and the product table.
class DemoSummary {
  final int products;
  final int customers;
  final int suppliers;
  final int salesRows;
  final int journalEntries;
  final int stockCost;
  final int stockRetail;
  const DemoSummary({
    required this.products,
    required this.customers,
    required this.suppliers,
    required this.salesRows,
    required this.journalEntries,
    required this.stockCost,
    required this.stockRetail,
  });
}

DemoSummary demoSummary() {
  final ids = demoSetIds();
  var cost = 0;
  var retail = 0;
  for (final p in demoProducts) {
    cost += p.$2 * p.$3;
    retail += p.$2 * p.$4;
  }
  return DemoSummary(
    products: ids['products']!.length,
    customers: ids['customers']!.length,
    suppliers: ids['suppliers']!.length,
    salesRows: ids['sales']!.length,
    journalEntries: ids['journal']!.length,
    stockCost: cost,
    stockRetail: retail,
  );
}

/// Classify a business's content: "empty" = zero content docs
/// (structural skeleton alone still counts as empty); "demo-only"
/// = at least one content doc and every content doc id belongs
/// to the demo set; "real" = any content doc id outside it.
/// User-created ids are timestamp-based and can never equal a
/// demo id, so a real document cannot masquerade as demo.
String classifyBusinessContent(
  Map<String, List<String>> docs, [
  Map<String, Set<String>>? demoIds,
]) {
  final demo = demoIds ?? demoSetIds();
  var any = false;
  for (final name in demoContentCollections) {
    for (final id in docs[name] ?? const <String>[]) {
      any = true;
      if (!(demo[name]?.contains(id) ?? false)) return 'real';
    }
  }
  return any ? 'demo-only' : 'empty';
}

/// Per-collection counts of a seed-write list (the confirmed
/// post-seed summary: what WAS added, from the writes actually
/// committed — never from a pre-computed figure).
Map<String, int> summarizeSeedWrites(Iterable<(String collection, String id)> writes) {
  final out = <String, int>{};
  for (final w in writes) {
    out[w.$1] = (out[w.$1] ?? 0) + 1;
  }
  return out;
}
