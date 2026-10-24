/// Null-safe text search (Dart port of web/lib/search.ts) — the
/// single home for every search box in the app. Documents reach the
/// UI as raw Firestore spreads, so a legacy document may simply not
/// HAVE a field a search touches; these helpers NEVER throw on
/// missing / null / non-string fields, and on well-formed data they
/// return exactly what the web predicates return.
import 'types.dart';

/// Coerce any stored value to searchable text. Never throws.
String searchText(Object? v) {
  if (v is String) return v;
  if (v is num || v is bool) return v.toString();
  return '';
}

/// Normalize a raw query once: trim + lowercase.
String normQuery(String raw) => searchText(raw).trim().toLowerCase();

/// True when the query is blank, or when ANY field contains it.
bool matchesAny(String rawQuery, List<Object?> fields) {
  final q = normQuery(rawQuery);
  if (q.isEmpty) return true;
  return fields.any((f) => searchText(f).toLowerCase().contains(q));
}

/// Product match: name / urduName / sku (+ category when asked).
bool productMatches(Product p, String rawQuery, {bool includeCategory = false}) {
  final fields = <Object?>[p.name, p.urduName, p.sku];
  if (includeCategory) fields.add(p.category);
  return matchesAny(rawQuery, fields);
}

List<Product> filterProducts(List<Product> list, String rawQuery, {bool includeCategory = false}) {
  if (normQuery(rawQuery).isEmpty) return list;
  return list.where((p) => productMatches(p, rawQuery, includeCategory: includeCategory)).toList();
}

/// Exact SKU lookup — the billing desk's barcode/SKU entry. A
/// missing sku simply never matches (never throws).
Product? findProductBySku(List<Product> list, String code) {
  final c = searchText(code).trim().toLowerCase();
  if (c.isEmpty) return null;
  for (final p in list) {
    if (searchText(p.sku).toLowerCase() == c) return p;
  }
  return null;
}

/// Customer match: name / phone / address.
bool customerMatches(Customer c, String rawQuery) => matchesAny(rawQuery, [c.name, c.phone, c.address]);

/// Bill-history match: customer name / phone / bill number — plus,
/// for a walk-in bill, the resolved display label.
bool billMatches(Bill b, String rawQuery, {String? walkInLabel}) {
  final displayName = searchText(b.customerName).isNotEmpty ? b.customerName : searchText(walkInLabel);
  return matchesAny(rawQuery, [displayName, b.customerPhone, b.billNo]);
}
