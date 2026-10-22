/// Dukaan AI — Product model (mirrors the web app's Product type).
class Product {
  final String id;
  final String sku;
  final String name;
  final String urduName;
  final String category;
  final String unit;
  final double costPrice;
  final double salePrice;
  final int stockQty;
  final int reorderLevel;
  final int updatedAt; // epoch ms, for sync conflict resolution

  const Product({
    required this.id,
    required this.sku,
    required this.name,
    required this.urduName,
    required this.category,
    required this.unit,
    required this.costPrice,
    required this.salePrice,
    required this.stockQty,
    required this.reorderLevel,
    required this.updatedAt,
  });

  bool get isLowStock => stockQty <= reorderLevel;
  bool get isCritical => stockQty <= (reorderLevel / 2).ceil();
  double get margin => salePrice - costPrice;

  Product copyWith({
    String? sku,
    String? name,
    String? urduName,
    String? category,
    String? unit,
    double? costPrice,
    double? salePrice,
    int? stockQty,
    int? reorderLevel,
    int? updatedAt,
  }) {
    return Product(
      id: id,
      sku: sku ?? this.sku,
      name: name ?? this.name,
      urduName: urduName ?? this.urduName,
      category: category ?? this.category,
      unit: unit ?? this.unit,
      costPrice: costPrice ?? this.costPrice,
      salePrice: salePrice ?? this.salePrice,
      stockQty: stockQty ?? this.stockQty,
      reorderLevel: reorderLevel ?? this.reorderLevel,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toMap() => {
        'id': id,
        'sku': sku,
        'name': name,
        'urduName': urduName,
        'category': category,
        'unit': unit,
        'costPrice': costPrice,
        'salePrice': salePrice,
        'stockQty': stockQty,
        'reorderLevel': reorderLevel,
        'updatedAt': updatedAt,
      };

  factory Product.fromMap(Map<String, dynamic> m) => Product(
        id: m['id'] as String,
        sku: m['sku'] as String,
        name: m['name'] as String,
        urduName: (m['urduName'] ?? '') as String,
        category: (m['category'] ?? 'General') as String,
        unit: (m['unit'] ?? 'pcs') as String,
        costPrice: (m['costPrice'] as num).toDouble(),
        salePrice: (m['salePrice'] as num).toDouble(),
        stockQty: (m['stockQty'] as num).toInt(),
        reorderLevel: (m['reorderLevel'] as num).toInt(),
        updatedAt: (m['updatedAt'] as num?)?.toInt() ?? 0,
      );
}
