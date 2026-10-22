import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

import '../models/product.dart';
import '../models/sale.dart';
import 'database_service.dart';

/// Dukaan AI — Firestore sync layer (PRODUCTION: per-user namespaces).
///
/// Behaviour:
///   * Firebase is OPTIONAL. If `google-services.json` /
///     `GoogleService-Info.plist` is missing, [available] stays false and
///     the app runs fully offline on sqflite (all sales recorded locally).
///   * When Firebase is configured, sync ALSO requires a signed-in user
///     (see AuthService / LoginScreen) and every read/write is scoped to
///     `users/{uid}/products` and `users/{uid}/sales` — the exact
///     namespace the Firestore security rules enforce. Without a user,
///     sync is a no-op and data stays local.
///   * Firestore offline persistence is enabled, so reads work with no
///     network, and unsynced sales are pushed in order on reconnect.
///   * Products merge by `updatedAt` (last write wins).
class SyncService {
  final DatabaseService _db;
  FirebaseFirestore? _firestore;
  bool _firestoreReady = false;

  SyncService(this._db);

  /// True only when Firestore is configured AND a user is signed in.
  bool get available =>
      _firestoreReady && FirebaseAuth.instance.currentUser != null;

  /// Call once at startup (and again after sign-in). Never throws —
  /// failure just means offline mode.
  Future<void> init() async {
    try {
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }
      _firestore = FirebaseFirestore.instance;
      try {
        _firestore!.settings = const Settings(persistenceEnabled: true);
      } catch (_) {
        // Settings already applied or unsupported on this platform —
        // persistence defaults are fine.
      }
      _firestoreReady = true;
      await syncNow();
    } catch (_) {
      // No Firebase config / no network: stay in offline demo mode.
      _firestoreReady = false;
    }
  }

  /// The signed-in user's sub-collection, or null when signed out.
  CollectionReference<Map<String, dynamic>>? _userCollection(String name) {
    final fs = _firestore;
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (fs == null || uid == null) return null;
    return fs.collection('users').doc(uid).collection(name);
  }

  /// Push queued writes, then pull remote changes. Safe to call repeatedly.
  Future<void> syncNow() async {
    if (!available) return;
    try {
      await _pushProducts();
      await _pushSales();
      await _pullProducts();
    } catch (_) {
      // Transient failure (offline etc.) — the queue survives; next
      // syncNow() retries. Never lose local data over a failed sync.
    }
  }

  Future<void> _pushProducts() async {
    final col = _userCollection('products');
    if (col == null) return;
    final products = await _db.getProducts();
    final batch = _firestore!.batch();
    var count = 0;
    for (final product in products) {
      batch.set(
        col.doc(product.id),
        _productToFirestore(product),
        SetOptions(merge: true),
      );
      if (++count >= 400) break; // keep batches bounded
    }
    if (count > 0) await batch.commit();
  }

  Future<void> _pushSales() async {
    final col = _userCollection('sales');
    if (col == null) return;
    final pending = await _db.getUnsyncedSales();
    for (final sale in pending) {
      await col.doc(sale.id).set(_saleToFirestore(sale));
      await _db.markSaleSynced(sale.id);
    }
  }

  Future<void> _pullProducts() async {
    final col = _userCollection('products');
    if (col == null) return;
    final snap = await col.get(
      const GetOptions(source: Source.serverAndCache),
    );
    final local = {for (final p in await _db.getProducts()) p.id: p};
    for (final doc in snap.docs) {
      final remote = _productFromFirestore(doc.id, doc.data());
      final existing = local[remote.id];
      // Last-write-wins on updatedAt; local-only products are kept.
      if (existing == null || remote.updatedAt > existing.updatedAt) {
        await _db.upsertProduct(remote);
      }
    }
  }

  Map<String, dynamic> _productToFirestore(Product p) => {
        'sku': p.sku,
        'name': p.name,
        'urduName': p.urduName,
        'category': p.category,
        'unit': p.unit,
        'costPrice': p.costPrice,
        'salePrice': p.salePrice,
        'stockQty': p.stockQty,
        'reorderLevel': p.reorderLevel,
        'updatedAt': p.updatedAt,
      };

  Product _productFromFirestore(String id, Map<String, dynamic> d) => Product(
        id: id,
        sku: (d['sku'] ?? '') as String,
        name: (d['name'] ?? '') as String,
        urduName: (d['urduName'] ?? '') as String,
        category: (d['category'] ?? 'General') as String,
        unit: (d['unit'] ?? 'pcs') as String,
        costPrice: (d['costPrice'] as num? ?? 0).toDouble(),
        salePrice: (d['salePrice'] as num? ?? 0).toDouble(),
        stockQty: (d['stockQty'] as num? ?? 0).toInt(),
        reorderLevel: (d['reorderLevel'] as num? ?? 0).toInt(),
        updatedAt: (d['updatedAt'] as num? ?? 0).toInt(),
      );

  Map<String, dynamic> _saleToFirestore(Sale s) => {
        'productId': s.productId,
        'qty': s.qty,
        'unitPrice': s.unitPrice,
        'total': s.total,
        'dayOffset': s.dayOffset,
        'ts': s.ts,
      };
}
