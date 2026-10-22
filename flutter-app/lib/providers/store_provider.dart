import 'dart:math';

import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import '../models/product.dart';
import '../models/sale.dart';
import '../services/database_service.dart';
import '../services/sync_service.dart';

/// Dukaan AI — app state (ChangeNotifier).
///
/// Owns products + sales, mirrors the web app's selectors (stock value,
/// low-stock list, daily revenue, 7-day moving averages, reorder suggestions),
/// and persists everything to sqflite. Sales recorded offline are queued
/// (synced=false) and pushed by [SyncService] on reconnect.
class StoreProvider extends ChangeNotifier {
  final DatabaseService _db = DatabaseService();
  late final SyncService sync;
  final _uuid = const Uuid();

  bool _ready = false;
  bool get ready => _ready;

  List<Product> _products = [];
  List<Sale> _sales = [];

  List<Product> get products => List.unmodifiable(_products);
  List<Sale> get sales => List.unmodifiable(_sales);

  Future<void> init() async {
    sync = SyncService(_db);
    final seeded = await _db.getMeta('seeded');
    if (seeded != '1') {
      await _seedDemoData();
      await _db.setMeta('seeded', '1');
    }
    _products = await _db.getProducts();
    _sales = await _db.getSales();
    _ready = true;
    notifyListeners();
    await sync.init(); // no-op when Firebase is not configured
    // Refresh from any pulled remote changes.
    _products = await _db.getProducts();
    _sales = await _db.getSales();
    notifyListeners();
  }

  /// Called by the auth gate once a user is signed in: re-runs cloud sync
  /// (now scoped to `users/{uid}`) and refreshes from pulled changes.
  Future<void> onAuthReady() async {
    await sync.init();
    _products = await _db.getProducts();
    _sales = await _db.getSales();
    notifyListeners();
  }

  // ---------- selectors (same math as the web app) ----------
  double get stockValue =>
      _products.fold(0, (s, p) => s + p.stockQty * p.costPrice);

  List<Product> get lowStock {
    final list = _products.where((p) => p.isLowStock).toList();
    list.sort((a, b) =>
        (a.stockQty / max(a.reorderLevel, 1))
            .compareTo(b.stockQty / max(b.reorderLevel, 1)));
    return list;
  }

  List<Sale> salesOnDay(int dayOffset) =>
      _sales.where((s) => s.dayOffset == dayOffset).toList();

  double revenueOnDay(int dayOffset) =>
      salesOnDay(dayOffset).fold(0, (s, x) => s + x.total);

  int unitsOnDay(int dayOffset) =>
      salesOnDay(dayOffset).fold(0, (s, x) => s + x.qty);

  double profitOnDay(int dayOffset) {
    final byId = {for (final p in _products) p.id: p};
    return salesOnDay(dayOffset).fold(0, (s, x) {
      final p = byId[x.productId];
      return s + (p == null ? 0 : (x.unitPrice - p.costPrice) * x.qty);
    });
  }

  double avgDailySales(String productId, [int days = 7]) {
    var qty = 0;
    for (var d = 0; d < days; d++) {
      qty += _sales
          .where((s) => s.productId == productId && s.dayOffset == d)
          .fold(0, (s, x) => s + x.qty);
    }
    return qty / days;
  }

  double daysOfStock(Product p) {
    final avg = avgDailySales(p.id);
    return avg > 0 ? p.stockQty / avg : double.infinity;
  }

  int suggestedReorder(Product p) {
    final avg = avgDailySales(p.id);
    if (avg <= 0) return 0;
    return max(0, (avg * 14 * 1.2 - p.stockQty).ceil());
  }

  // ---------- mutations ----------
  int _nowMs() => DateTime.now().millisecondsSinceEpoch;

  Future<void> adjustStock(String id, int delta) async {
    final i = _products.indexWhere((p) => p.id == id);
    if (i < 0) return;
    final p = _products[i];
    final updated = p.copyWith(
      stockQty: max(0, p.stockQty + delta),
      updatedAt: _nowMs(),
    );
    _products[i] = updated;
    await _db.upsertProduct(updated);
    notifyListeners();
    unawaited(sync.syncNow());
  }

  /// Returns false when quantity invalid or stock insufficient.
  Future<bool> recordSale(String productId, int qty) async {
    if (qty <= 0) return false;
    final i = _products.indexWhere((p) => p.id == productId);
    if (i < 0) return false;
    final p = _products[i];
    if (p.stockQty < qty) return false;

    final sale = Sale(
      id: _uuid.v4(),
      productId: productId,
      qty: qty,
      unitPrice: p.salePrice,
      total: qty * p.salePrice,
      dayOffset: 0,
      ts: DateTime.now().toIso8601String(),
      synced: false, // queued; SyncService pushes on reconnect
    );
    await _db.insertSale(sale);
    _sales = [sale, ..._sales];

    final updated = p.copyWith(
      stockQty: p.stockQty - qty,
      updatedAt: _nowMs(),
    );
    _products[i] = updated;
    await _db.upsertProduct(updated);
    notifyListeners();
    unawaited(sync.syncNow());
    return true;
  }

  Future<void> addProduct(Product p) async {
    _products = [..._products, p];
    await _db.upsertProduct(p);
    notifyListeners();
    unawaited(sync.syncNow());
  }

  Future<void> deleteProduct(String id) async {
    _products = _products.where((p) => p.id != id).toList();
    await _db.deleteProduct(id);
    notifyListeners();
    unawaited(sync.syncNow());
  }

  // ---------- demo seed ----------
  /// 25 realistic kiryana products (PKR). Fictional demo data.
  static const List<List<dynamic>> _seedProducts = [
    // id, sku, name, urduName, category, unit, cost, sale, stock, reorder, demand/day
    ['p01', 'DLD-OIL-5L', 'Dalda Cooking Oil 5L', 'ڈالڈا کوکنگ آئل 5 لیٹر', 'Cooking Essentials', 'pcs', 2450, 2600, 14, 5, 1.2],
    ['p02', 'RICE-SKB-1K', 'Super Kernel Basmati Rice 1kg', 'سپر کرنل باسمتی چاول 1 کلو', 'Rice & Grains', 'pcs', 390, 430, 42, 10, 4.5],
    ['p03', 'SALT-NTL-800', 'National Salt 800g', 'نیشنل نمک 800 گرام', 'Cooking Essentials', 'pcs', 78, 95, 60, 15, 3.2],
    ['p04', 'TEA-TPL-475', 'Tapal Danedar Tea 475g', 'تپال دانے دار چائے 475 گرام', 'Beverages', 'pcs', 980, 1050, 18, 6, 2.1],
    ['p05', 'SHN-BIR-50', 'Shan Chicken Biryani Masala 50g', 'شان چکن بریانی مصالحہ 50 گرام', 'Spices', 'pcs', 105, 125, 120, 30, 6.0],
    ['p06', 'ATTA-CHK-20K', 'Fresh Chakki Atta 20kg', 'تازہ چکی آٹا 20 کلو', 'Rice & Grains', 'bag', 2750, 2900, 8, 4, 1.0],
    ['p07', 'DAL-MNG-1K', 'Dal Moong (Washed) 1kg', 'دال مونگ دھلی 1 کلو', 'Lentils & Pulses', 'kg', 340, 380, 25, 8, 2.4],
    ['p08', 'DAL-CHN-1K', 'Dal Chana 1kg', 'دال چنا 1 کلو', 'Lentils & Pulses', 'kg', 280, 320, 22, 8, 2.2],
    ['p09', 'DAL-MSR-1K', 'Dal Masoor (Red Lentils) 1kg', 'دال مسور 1 کلو', 'Lentils & Pulses', 'kg', 300, 340, 20, 8, 2.6],
    ['p10', 'SUGAR-5K', 'Sugar 5kg', 'چینی 5 کلو', 'Cooking Essentials', 'bag', 690, 750, 30, 10, 3.0],
    ['p11', 'MLK-MLP-1L', 'Nestlé Milkpak 1L', 'نیسلے ملک پیک 1 لیٹر', 'Dairy', 'pcs', 235, 260, 48, 12, 5.5],
    ['p12', 'MLK-OLP-15L', "Olper's Full Cream Milk 1.5L", 'اولپرز فل کریم دودھ 1.5 لیٹر', 'Dairy', 'pcs', 395, 430, 24, 8, 2.8],
    ['p13', 'SHN-HLM-60', 'Shan Haleem Mix 60g', 'شان حلیم مکس 60 گرام', 'Spices', 'pcs', 90, 110, 45, 12, 2.0],
    ['p14', 'KNR-CUB-20', 'Knorr Chicken Cubes 20g', 'کنور چکن کیوبز 20 گرام', 'Cooking Essentials', 'pcs', 115, 135, 55, 15, 3.4],
    ['p15', 'VIM-BAR-200', 'Vim Dishwashing Bar 200g', 'وم ڈش واشنگ بار 200 گرام', 'Household', 'pcs', 85, 105, 40, 12, 2.2],
    ['p16', 'SRF-EXL-1K', 'Surf Excel 1kg', 'سرف ایکسل 1 کلو', 'Household', 'pcs', 420, 460, 16, 6, 1.8],
    ['p17', 'LFB-SOP-140', 'Lifebuoy Soap 140g', 'لائف بوائے صابن 140 گرام', 'Personal Care', 'pcs', 130, 150, 70, 20, 4.0],
    ['p18', 'SNK-SHM-180', 'Sunsilk Shampoo 180ml', 'سن سلک شیمپو 180 ملی لیٹر', 'Personal Care', 'pcs', 380, 420, 22, 8, 1.6],
    ['p19', 'CLG-TP-90', 'Colgate Toothpaste 90g', 'کولگیٹ ٹوتھ پیسٹ 90 گرام', 'Personal Care', 'pcs', 260, 290, 35, 10, 2.4],
    ['p20', 'PF-GLC-HR', 'Peak Freans Gluco Biscuits (Half Roll)', 'پیک فرینز گلوکو بسکٹ', 'Snacks', 'pcs', 145, 170, 50, 15, 4.8],
    ['p21', 'CCL-15L', 'Coca-Cola 1.5L', 'کوکا کولا 1.5 لیٹر', 'Beverages', 'pcs', 195, 230, 60, 20, 5.0],
    ['p22', 'RAF-800', 'Rooh Afza 800ml', 'روح افزا 800 ملی لیٹر', 'Beverages', 'pcs', 640, 700, 12, 5, 1.4],
    ['p23', 'EWD-WHT-12K', 'Everyday Whitener 1.2kg', 'ایوری ڈے وائٹنر 1.2 کلو', 'Dairy', 'pcs', 990, 1080, 10, 4, 1.1],
    ['p24', 'NTL-GRM-50', 'National Garam Masala 50g', 'نیشنل گرم مصالحہ 50 گرام', 'Spices', 'pcs', 120, 145, 65, 18, 2.8],
    ['p25', 'RICE-FLK-5K', 'Falak Basmati Rice 5kg', 'فلک باسمتی چاول 5 کلو', 'Rice & Grains', 'bag', 1950, 2100, 6, 3, 0.9],
  ];

  Future<void> _seedDemoData() async {
    final rand = Random(20261020);
    final now = DateTime.now();
    for (final row in _seedProducts) {
      final product = Product(
        id: row[0] as String,
        sku: row[1] as String,
        name: row[2] as String,
        urduName: row[3] as String,
        category: row[4] as String,
        unit: row[5] as String,
        costPrice: (row[6] as num).toDouble(),
        salePrice: (row[7] as num).toDouble(),
        stockQty: row[8] as int,
        reorderLevel: row[9] as int,
        updatedAt: now.millisecondsSinceEpoch,
      );
      await _db.upsertProduct(product);

      final demand = (row[10] as num).toDouble();
      for (var dayOffset = 13; dayOffset >= 0; dayOffset--) {
        final partial = dayOffset == 0 ? 0.45 : 1.0;
        final qty = max(0, (demand * partial * (0.55 + rand.nextDouble() * 0.9)).round());
        if (qty <= 0) continue;
        final day = now.subtract(Duration(days: dayOffset));
        final ts = DateTime(day.year, day.month, day.day, 9 + rand.nextInt(12), rand.nextInt(60));
        await _db.insertSale(Sale(
          id: _uuid.v4(),
          productId: product.id,
          qty: qty,
          unitPrice: product.salePrice,
          total: qty * product.salePrice,
          dayOffset: dayOffset,
          ts: ts.toIso8601String(),
          synced: true,
        ));
      }
    }
  }
}
