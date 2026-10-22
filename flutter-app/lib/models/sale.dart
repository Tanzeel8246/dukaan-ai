/// Dukaan AI — Sale model. dayOffset 0 = today, 1 = yesterday, …
/// (same convention as the web app, so forecasts stay in sync).
class Sale {
  final String id;
  final String productId;
  final int qty;
  final double unitPrice;
  final double total;
  final int dayOffset;
  final String ts; // ISO-8601 timestamp
  final bool synced; // false = queued, waiting for Firestore sync

  const Sale({
    required this.id,
    required this.productId,
    required this.qty,
    required this.unitPrice,
    required this.total,
    required this.dayOffset,
    required this.ts,
    this.synced = true,
  });

  Sale copyWith({bool? synced}) => Sale(
        id: id,
        productId: productId,
        qty: qty,
        unitPrice: unitPrice,
        total: total,
        dayOffset: dayOffset,
        ts: ts,
        synced: synced ?? this.synced,
      );

  Map<String, dynamic> toMap() => {
        'id': id,
        'productId': productId,
        'qty': qty,
        'unitPrice': unitPrice,
        'total': total,
        'dayOffset': dayOffset,
        'ts': ts,
        'synced': synced ? 1 : 0,
      };

  factory Sale.fromMap(Map<String, dynamic> m) => Sale(
        id: m['id'] as String,
        productId: m['productId'] as String,
        qty: (m['qty'] as num).toInt(),
        unitPrice: (m['unitPrice'] as num).toDouble(),
        total: (m['total'] as num).toDouble(),
        dayOffset: (m['dayOffset'] as num).toInt(),
        ts: m['ts'] as String,
        synced: (m['synced'] as num?)?.toInt() == 1,
      );
}
