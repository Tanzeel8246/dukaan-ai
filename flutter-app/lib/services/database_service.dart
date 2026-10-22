import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import '../models/product.dart';
import '../models/sale.dart';

/// Dukaan AI — local persistence (sqflite).
///
/// Three tables:
///   products   — the shelf catalogue (id PK)
///   sales      — every sale ever recorded (id PK), incl. a `synced` flag
///   meta       — key/value (e.g. "seeded" marker)
///
/// The app is fully functional on this database alone; Firestore sync is an
/// optional layer on top (see SyncService).
class DatabaseService {
  static const _dbName = 'dukaan_ai.db';
  static const _dbVersion = 1;

  Database? _db;

  Future<Database> get db async {
    final existing = _db;
    if (existing != null) return existing;
    final created = await _open();
    _db = created;
    return created;
  }

  Future<Database> _open() async {
    final dir = await getDatabasesPath();
    return openDatabase(
      p.join(dir, _dbName),
      version: _dbVersion,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE products(
            id TEXT PRIMARY KEY,
            sku TEXT NOT NULL,
            name TEXT NOT NULL,
            urduName TEXT NOT NULL DEFAULT '',
            category TEXT NOT NULL DEFAULT 'General',
            unit TEXT NOT NULL DEFAULT 'pcs',
            costPrice REAL NOT NULL,
            salePrice REAL NOT NULL,
            stockQty INTEGER NOT NULL,
            reorderLevel INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL DEFAULT 0
          )
        ''');
        await db.execute('''
          CREATE TABLE sales(
            id TEXT PRIMARY KEY,
            productId TEXT NOT NULL,
            qty INTEGER NOT NULL,
            unitPrice REAL NOT NULL,
            total REAL NOT NULL,
            dayOffset INTEGER NOT NULL,
            ts TEXT NOT NULL,
            synced INTEGER NOT NULL DEFAULT 1
          )
        ''');
        await db.execute('''
          CREATE TABLE meta(
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
          )
        ''');
        await db.execute('CREATE INDEX idx_sales_day ON sales(dayOffset)');
        await db.execute('CREATE INDEX idx_sales_product ON sales(productId)');
      },
    );
  }

  // ---- meta ----
  Future<String?> getMeta(String key) async {
    final d = await db;
    final rows = await d.query('meta', where: 'key = ?', whereArgs: [key], limit: 1);
    return rows.isEmpty ? null : rows.first['value'] as String;
  }

  Future<void> setMeta(String key, String value) async {
    final d = await db;
    await d.insert('meta', {'key': key, 'value': value},
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  // ---- products ----
  Future<List<Product>> getProducts() async {
    final d = await db;
    final rows = await d.query('products', orderBy: 'name ASC');
    return rows.map(Product.fromMap).toList();
  }

  Future<void> upsertProduct(Product product) async {
    final d = await db;
    await d.insert('products', product.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> deleteProduct(String id) async {
    final d = await db;
    await d.delete('products', where: 'id = ?', whereArgs: [id]);
  }

  // ---- sales ----
  Future<List<Sale>> getSales() async {
    final d = await db;
    final rows = await d.query('sales', orderBy: 'ts DESC');
    return rows.map(Sale.fromMap).toList();
  }

  Future<void> insertSale(Sale sale) async {
    final d = await db;
    await d.insert('sales', sale.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Sale>> getUnsyncedSales() async {
    final d = await db;
    final rows = await d.query('sales', where: 'synced = 0', orderBy: 'ts ASC');
    return rows.map(Sale.fromMap).toList();
  }

  Future<void> markSaleSynced(String id) async {
    final d = await db;
    await d.update('sales', {'synced': 1}, where: 'id = ?', whereArgs: [id]);
  }

  Future<void> close() async {
    await _db?.close();
    _db = null;
  }
}
