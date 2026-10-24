/// Dukaan AI — the online storefront (Dart port of
/// web/lib/storefront.ts, ERP Phase H · H4; doctrine: Phase H
/// design §2). Pure functions only — no Firebase, no store, no
/// I/O — proven against the web functions by
/// harness/fixtures/h4-core.json (test/h4_fixtures_test.dart).
///
/// The shape in one paragraph (design §2.1): a snapshot the owner
/// publishes, a public page that renders it, and an inbox that
/// hands orders to the document chain — in that order of trust.
///
///  - The snapshot (`storefronts/{slug}`) is a denormalised
///    publishing artefact assembled HERE from live data. It
///    carries NO cost price, NO stock count, NO tenant path —
///    stock travels as a band, prices as advertising. The public
///    page renders from this doc ALONE ([storefrontPageModel] is
///    its only input) — and that page is a WEB surface; the apps
///    carry the member side (publish, preview, inbox, convert).
///  - The inbox (`storeOrders`) is create-only for the public
///    and shape-validated ([storeOrderShapeOk] is the rules'
///    mirror). An order is PAPER: it posts nothing, reserves
///    nothing, and creates no customer. Its worst abuse case is
///    dismissible paper, never a posting (§2.4).
///  - Conversion is a member act ([planStoreConversion] +
///    [buildStoreSaleOrder]): lines are re-priced against LIVE
///    products with the drift computed for display BEFORE the
///    member confirms; a product deleted since publishing drops
///    its line with a flag; the SO is born `open` carrying
///    sourceType/sourceOrderId, and the inbox doc's state flip in
///    the same batch is the exactly-once claim (§2.5).
///  - The public-read derivation ([storefrontLit]) is the
///    rules' mirror: lit only while the assignment SNAPSHOT's
///    tier holds `storefront` AND the derived plan state is
///    active/founding — dark in trial (Standard's set), grace,
///    read-only and suspension. The shop's own preview is a
///    MEMBER read and is not this function (§2.6).
///
/// This module composes NO journal entry and imports no posting
/// path: storefront money exists only later, as ordinary bills
/// converted from the SO through the Phase B machinery.
library;

import 'dart:convert';

import 'documents.dart' show estimateDocTotals;
import 'plans.dart' show derivePlanState, tierIncludesModule;
import 'tenancy.dart' show BusinessRegistryDoc;
import 'types.dart';

/* ------------------------------------------------------------------ */
/* Doc types (web/lib/types.ts — the storefront family)                */
/* ------------------------------------------------------------------ */

/// One published product row: an ADVERTISED price and a stock
/// BAND — never a count, never a cost.
class StorefrontProduct {
  final String productId;
  final String name;
  final String? nameUr;
  final double price;
  final String unit;
  final String? category;
  final String stockState; // in | low | out | hidden
  final int sort;
  const StorefrontProduct({
    required this.productId,
    required this.name,
    this.nameUr,
    required this.price,
    required this.unit,
    this.category,
    required this.stockState,
    required this.sort,
  });
  factory StorefrontProduct.fromMap(Map<String, dynamic> m) => StorefrontProduct(
        productId: _s(m['productId']),
        name: _s(m['name']),
        nameUr: _sn(m['nameUr']),
        price: _d(m['price']),
        unit: _s(m['unit']),
        category: _sn(m['category']),
        stockState: _s(m['stockState']),
        sort: _i(m['sort']),
      );
  Map<String, dynamic> toMap() => {
        'productId': productId,
        'name': name,
        if (nameUr != null) 'nameUr': nameUr,
        'price': price,
        'unit': unit,
        if (category != null) 'category': category,
        'stockState': stockState,
        'sort': sort,
      };
}

/// The published snapshot — `storefronts/{slug}`. The slug is the
/// doc id: immutable after claim, never recycled (§2.6).
class StorefrontDoc {
  final String businessId;
  final String slug;
  final String shopName;
  final String? tagline;
  final String phone;
  final String? city;
  final String? logoRef;
  final bool enabled;
  final String publishedAt;
  final String updatedAt;
  final String currency;
  final List<StorefrontProduct> products;
  final String? notice;
  const StorefrontDoc({
    required this.businessId,
    required this.slug,
    required this.shopName,
    this.tagline,
    required this.phone,
    this.city,
    this.logoRef,
    required this.enabled,
    required this.publishedAt,
    required this.updatedAt,
    this.currency = 'PKR',
    required this.products,
    this.notice,
  });
  factory StorefrontDoc.fromMap(Map<String, dynamic> m) => StorefrontDoc(
        businessId: _s(m['businessId']),
        slug: _s(m['slug']),
        shopName: _s(m['shopName']),
        tagline: _sn(m['tagline']),
        phone: _s(m['phone']),
        city: _sn(m['city']),
        logoRef: _sn(m['logoRef']),
        enabled: m['enabled'] == true,
        publishedAt: _s(m['publishedAt']),
        updatedAt: _s(m['updatedAt']),
        currency: _s(m['currency'], 'PKR'),
        products: (m['products'] is List)
            ? (m['products'] as List)
                .whereType<Map>()
                .map((e) => StorefrontProduct.fromMap(Map<String, dynamic>.from(e)))
                .toList()
            : const [],
        notice: _sn(m['notice']),
      );
  Map<String, dynamic> toMap() => {
        'businessId': businessId,
        'slug': slug,
        'shopName': shopName,
        if (tagline != null) 'tagline': tagline,
        'phone': phone,
        if (city != null) 'city': city,
        if (logoRef != null) 'logoRef': logoRef,
        'enabled': enabled,
        'publishedAt': publishedAt,
        'updatedAt': updatedAt,
        'currency': currency,
        'products': products.map((p) => p.toMap()).toList(),
        if (notice != null) 'notice': notice,
      };
}

class StoreOrderLine {
  final String productId;
  final int qty; // 1..999 (rules-validated shape, §2.4)
  const StoreOrderLine({required this.productId, required this.qty});
  factory StoreOrderLine.fromMap(Map<String, dynamic> m) => StoreOrderLine(
        productId: _s(m['productId']),
        qty: _i(m['qty']),
      );
  Map<String, dynamic> toMap() => {'productId': productId, 'qty': qty};
}

/// One public order — `storeOrders/{autoId}`. Create-only for the
/// public; the shop side reads it, converts it (exactly once) or
/// dismisses it. It is PAPER: it posts nothing, reserves nothing,
/// and creates no customer until conversion resolves one (§2.5).
class StoreOrder {
  final String id;
  final String businessId;
  final String slug;
  final String customerName;
  final String phone;
  final List<StoreOrderLine> lines;
  final String? note;
  final String fulfilment; // pickup | delivery
  final String createdAt; // ISO instant (a server timestamp on the live doc)
  // H6: the customer's OWN WhatsApp consent tick from the public
  // checkout form — true only when the order carries waOptIn: true;
  // absent ≡ no consent. Conversion stamps from this flag alone.
  final bool waOptIn;
  final String state; // new | converted | dismissed
  final String? convertedSoId;
  final String? convertedBy;
  final String? convertedAt;
  final String? dismissedBy;
  final String? dismissedAt;
  const StoreOrder({
    required this.id,
    required this.businessId,
    required this.slug,
    required this.customerName,
    required this.phone,
    required this.lines,
    this.note,
    required this.fulfilment,
    required this.createdAt,
    this.waOptIn = false,
    required this.state,
    this.convertedSoId,
    this.convertedBy,
    this.convertedAt,
    this.dismissedBy,
    this.dismissedAt,
  });
  factory StoreOrder.fromMap(String id, Map<String, dynamic> m) => StoreOrder(
        id: id,
        businessId: _s(m['businessId']),
        slug: _s(m['slug']),
        customerName: _s(m['customerName']),
        phone: _s(m['phone']),
        lines: (m['lines'] is List)
            ? (m['lines'] as List)
                .whereType<Map>()
                .map((e) => StoreOrderLine.fromMap(Map<String, dynamic>.from(e)))
                .toList()
            : const [],
        note: _sn(m['note']),
        fulfilment: _s(m['fulfilment']),
        createdAt: _s(m['createdAt']),
        waOptIn: m['waOptIn'] == true,
        state: _s(m['state'], 'new'),
        convertedSoId: _sn(m['convertedSoId']),
        convertedBy: _sn(m['convertedBy']),
        convertedAt: _sn(m['convertedAt']),
        dismissedBy: _sn(m['dismissedBy']),
        dismissedAt: _sn(m['dismissedAt']),
      );
  Map<String, dynamic> toMap() => {
        'businessId': businessId,
        'slug': slug,
        'customerName': customerName,
        'phone': phone,
        'lines': lines.map((l) => l.toMap()).toList(),
        if (note != null) 'note': note,
        'fulfilment': fulfilment,
        'createdAt': createdAt,
        if (waOptIn) 'waOptIn': true,
        'state': state,
        if (convertedSoId != null) 'convertedSoId': convertedSoId,
        if (convertedBy != null) 'convertedBy': convertedBy,
        if (convertedAt != null) 'convertedAt': convertedAt,
        if (dismissedBy != null) 'dismissedBy': dismissedBy,
        if (dismissedAt != null) 'dismissedAt': dismissedAt,
      };
}

String _s(Object? v, [String fallback = '']) =>
    v is String ? v : (v == null ? fallback : v.toString());
String? _sn(Object? v) => v is String && v.isNotEmpty ? v : null;
double _d(Object? v) => v is num ? v.toDouble() : 0;
int _i(Object? v) => v is num ? v.toInt() : 0;

/* ------------------------------------------------------------------ */
/* Links (design §2.3)                                                 */
/* ------------------------------------------------------------------ */

/// The product's one public origin. Per-shop subdomains are NOT
/// offered in Phase H — the shareable link is a path.
const String storefrontOrigin = 'https://dukaan-ai.codehubb.com';

String storefrontPath(String slug) => '/s/$slug';

String storefrontUrl(String slug) => '$storefrontOrigin${storefrontPath(slug)}';

/// The print/link seam (design §2.3): the absolute store URL a
/// receipt QR encodes, resolved from the owner doc's cached slug
/// label. Null when the shop has never published.
String? resolveStorefrontLink(String? storefrontSlug) =>
    (storefrontSlug != null && storefrontSlug != '')
        ? storefrontUrl(storefrontSlug)
        : null;

/* ------------------------------------------------------------------ */
/* Slugs (design §2.2/§2.6, Q7)                                        */
/* ------------------------------------------------------------------ */

const int slugMinLength = 3;
const int slugMaxLength = 40;

/// Slugs that would collide with the app's own routes or lie
/// about what they are. `demo` is the §5.3 labelled preview's
/// slug — it can never be a real shop's.
const List<String> reservedSlugs = [
  'demo', 'platform', 'login', 'signup', 'settings', 'api', 's',
  'storefront', 'sales', 'billing', 'reports', 'customers',
  'inventory', 'admin', 'support', 'help', 'www', 'app', 'owner',
];

final RegExp _slugRe = RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$');

/// Validate a slug CANDIDATE (as typed — no silent rewriting:
/// the slug is printed on receipts, so what the owner sees is
/// what the world gets). Returns the problem name or null.
String? slugProblem(String slug) {
  if (slug.length < slugMinLength) return 'too-short';
  if (slug.length > slugMaxLength) return 'too-long';
  if (!_slugRe.hasMatch(slug)) return 'bad-chars';
  if (reservedSlugs.contains(slug)) return 'reserved';
  return null;
}

bool slugOk(String slug) => slugProblem(slug) == null;

/// A starting suggestion from the shop's name (the owner edits
/// it at claim time; collisions take a suffix he picks — Q7).
/// Returns "" when the name yields nothing usable.
String suggestSlug(String shopName) {
  var base = shopName
      .toLowerCase()
      .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
      .replaceAll(RegExp(r'^-+|-+$'), '');
  if (base.length > slugMaxLength) {
    base = base.substring(0, slugMaxLength).replaceAll(RegExp(r'-+$'), '');
  }
  return (base.length >= slugMinLength && !reservedSlugs.contains(base))
      ? base
      : '';
}

/* ------------------------------------------------------------------ */
/* Stock bands (design §2.2) — bands, never counts                     */
/* ------------------------------------------------------------------ */

/// The public stock band for a product: `out` at zero, `low` at
/// or below the product's own reorder level, else `in`. The
/// count itself never leaves the shop.
String stockBandFor(double stockQty, double reorderLevel) {
  if (!(stockQty > 0)) return 'out';
  if (stockQty <= (reorderLevel > 0 ? reorderLevel : 0)) return 'low';
  return 'in';
}

/* ------------------------------------------------------------------ */
/* The snapshot assembler (design §2.2)                                */
/* ------------------------------------------------------------------ */

/// A Firestore doc cannot grow without bound; a kiryana
/// catalogue fits far inside this. The rules cap identically.
const int maxStorefrontProducts = 500;

/// Assemble the published snapshot from live data. Pure: the same
/// inputs always produce the same doc, which is what lets the
/// store's auto-republish compare before writing. Carries NO
/// cost price and NO stock count. `enabled` and `publishedAt`
/// are the previous doc's (unpublishing is its own act, never a
/// re-publish side effect).
///
/// The optional text fields mirror the TS `undefined` semantics
/// with explicit set-flags: an UNSET field keeps the previous
/// doc's value; a SET field replaces it (null/blank clears it).
StorefrontDoc assembleStorefrontSnapshot({
  required String businessId,
  required String slug,
  required String shopName,
  required String phone,
  String? city,
  bool citySet = false,
  String? logoDataUrl,
  bool logoSet = false,
  required List<Product> products,
  List<String> excludedProductIds = const [],
  List<String> includeProductIds = const [],
  String? tagline,
  bool taglineSet = false,
  String? notice,
  bool noticeSet = false,
  StorefrontDoc? previous,
  required String nowISO,
}) {
  final prev = previous;
  final hidden = <String>{...excludedProductIds};
  for (final p in prev?.products ?? const <StorefrontProduct>[]) {
    if (p.stockState == 'hidden') hidden.add(p.productId);
  }
  for (final id in includeProductIds) {
    hidden.remove(id);
  }

  // The TS sort is stable; Dart's is not — decorate with the
  // original index so equal (category, name) keys keep order.
  final decorated = [
    for (var i = 0; i < products.length; i++) (i: i, p: products[i]),
  ]..sort((a, b) {
      final byCat = a.p.category.compareTo(b.p.category);
      if (byCat != 0) return byCat;
      final byName = a.p.name.compareTo(b.p.name);
      if (byName != 0) return byName;
      return a.i.compareTo(b.i);
    });
  final sorted = decorated.map((e) => e.p).take(maxStorefrontProducts).toList();
  final entries = <StorefrontProduct>[];
  for (var i = 0; i < sorted.length; i++) {
    final p = sorted[i];
    entries.add(StorefrontProduct(
      productId: p.id,
      name: p.name,
      nameUr: (p.urduName.trim() != '') ? p.urduName : null,
      price: p.salePrice,
      unit: p.unit,
      category: (p.category.trim() != '') ? p.category : null,
      stockState: hidden.contains(p.id) ? 'hidden' : stockBandFor(p.stockQty, p.reorderLevel),
      sort: i,
    ));
  }

  String? opt(String? value, bool isSet, String? prevValue) {
    final v = isSet ? value : prevValue;
    return (v != null && v.trim() != '') ? v.trim() : null;
  }

  final logo = logoSet ? logoDataUrl : prev?.logoRef;
  return StorefrontDoc(
    businessId: businessId,
    slug: slug,
    shopName: shopName,
    phone: phone,
    enabled: prev?.enabled ?? true,
    publishedAt: prev?.publishedAt ?? nowISO,
    updatedAt: nowISO,
    currency: 'PKR',
    products: entries,
    tagline: opt(tagline, taglineSet, prev?.tagline),
    notice: opt(notice, noticeSet, prev?.notice),
    city: opt(city, citySet, prev?.city),
    logoRef: (logo != null && logo != '') ? logo : null,
  );
}

/// JS-style JSON for content comparison: object keys sorted,
/// numbers rendered the way JSON.stringify renders them (an
/// integral double loses its fraction), so a doc assembled here
/// and the same doc read back from JSON compare equal.
String _canonicalJson(Object? value) {
  if (value is Map) {
    final keys = value.keys.map((k) => '$k').toList()..sort();
    final parts = keys.map((k) => '${jsonEncode(k)}:${_canonicalJson(value[k])}');
    return '{${parts.join(',')}}';
  }
  if (value is List) {
    return '[${value.map(_canonicalJson).join(',')}]';
  }
  if (value is num) {
    if (value == value.truncateToDouble() && value.abs() < 1e15) {
      return '${value.toInt()}';
    }
    return '$value';
  }
  return jsonEncode(value);
}

/// Two snapshots carry the same PUBLIC content when everything
/// but the publish stamps matches (the auto-republish seam: a
/// product save that changes nothing public writes nothing).
bool storefrontContentEqual(StorefrontDoc? a, StorefrontDoc? b) {
  if (identical(a, b)) return true;
  if (a == null || b == null) return false;
  String strip(StorefrontDoc d) {
    final m = d.toMap()
      ..remove('publishedAt')
      ..remove('updatedAt');
    return _canonicalJson(m);
  }

  return strip(a) == strip(b);
}

/* ------------------------------------------------------------------ */
/* The public-read derivation (design §2.6) — the rules' mirror        */
/* ------------------------------------------------------------------ */

/// The lit rule over its two derived inputs — the desk reads
/// these off its PlanView; [storefrontLit] derives them from a
/// registry doc. One rule, two doors.
bool storefrontLitState(String modulesTier, String state, StorefrontDoc? doc) {
  if (doc == null || doc.enabled != true) return false;
  if (!tierIncludesModule(modulesTier, 'storefront')) return false;
  return state == 'active' || state == 'founding';
}

/// Is this snapshot PUBLICLY READABLE right now? The storefront
/// doc's read rule derives exactly this from the businesses doc:
/// the snapshot exists and is enabled, the assignment SNAPSHOT's
/// tier holds `storefront` (Advanced — a trial's Standard set
/// never lights a store), and the derived plan state is `active`
/// or `founding`. Grace, read-only and suspension are DARK.
bool storefrontLit(BusinessRegistryDoc? registry, StorefrontDoc? doc, String nowISO) {
  if (registry == null || registry.plan.planId == '') return false;
  return storefrontLitState(
    registry.plan.modulesTier,
    derivePlanState(registry, nowISO),
    doc,
  );
}

/* ------------------------------------------------------------------ */
/* The public page model — the snapshot is the ONLY input              */
/* ------------------------------------------------------------------ */

class StorefrontCard {
  final String productId;
  final String name;
  final String? nameUr;
  final double price;
  final String unit;
  final String category; // "" = the shop's uncategorised group
  final String stockState; // in | low | out (never hidden)
  final bool orderable; // `out` goods display but cannot be ordered
  const StorefrontCard({
    required this.productId,
    required this.name,
    this.nameUr,
    required this.price,
    required this.unit,
    required this.category,
    required this.stockState,
    required this.orderable,
  });
  Map<String, dynamic> toMap() => {
        'productId': productId,
        'name': name,
        if (nameUr != null) 'nameUr': nameUr,
        'price': price,
        'unit': unit,
        'category': category,
        'stockState': stockState,
        'orderable': orderable,
      };
}

class StorefrontPageModel {
  final String shopName;
  final String? tagline;
  final String phone;
  final String? city;
  final String? logoRef;
  final String? notice;
  final String currency;
  final List<StorefrontCard> cards;
  final List<({String category, List<StorefrontCard> cards})> groups;
  const StorefrontPageModel({
    required this.shopName,
    this.tagline,
    required this.phone,
    this.city,
    this.logoRef,
    this.notice,
    required this.currency,
    required this.cards,
    required this.groups,
  });
  Map<String, dynamic> toMap() => {
        'shopName': shopName,
        if (tagline != null) 'tagline': tagline,
        'phone': phone,
        if (city != null) 'city': city,
        if (logoRef != null) 'logoRef': logoRef,
        if (notice != null) 'notice': notice,
        'currency': currency,
        'cards': cards.map((c) => c.toMap()).toList(),
        'groups': [
          for (final g in groups)
            {'category': g.category, 'cards': g.cards.map((c) => c.toMap()).toList()},
        ],
      };
}

/// Everything the public page renders, derived from the snapshot
/// alone — the acceptance seam: given ONLY a StorefrontDoc (no
/// tenant access of any kind), this produces the whole page.
/// Hidden products never reach the model; groups preserve the
/// snapshot's category order, cards their publish sort.
StorefrontPageModel storefrontPageModel(StorefrontDoc doc) {
  final visible = doc.products.where((p) => p.stockState != 'hidden').toList()
    ..sort((a, b) => a.sort.compareTo(b.sort));
  final cards = [
    for (final p in visible)
      StorefrontCard(
        productId: p.productId,
        name: p.name,
        nameUr: p.nameUr,
        price: p.price,
        unit: p.unit,
        category: p.category ?? '',
        stockState: p.stockState,
        orderable: p.stockState != 'out',
      ),
  ];
  final groups = <({String category, List<StorefrontCard> cards})>[];
  for (final card in cards) {
    final i = groups.indexWhere((g) => g.category == card.category);
    if (i >= 0) {
      groups[i].cards.add(card);
    } else {
      groups.add((category: card.category, cards: [card]));
    }
  }
  return StorefrontPageModel(
    shopName: doc.shopName,
    tagline: doc.tagline,
    phone: doc.phone,
    city: doc.city,
    logoRef: doc.logoRef,
    notice: doc.notice,
    currency: doc.currency,
    cards: cards,
    groups: groups,
  );
}

/* ------------------------------------------------------------------ */
/* The order inbox (design §2.4) — shape, compose, validate            */
/* ------------------------------------------------------------------ */

const Map<String, int> storeOrderLimits = {
  'nameMax': 60,
  'phoneMin': 7,
  'phoneMax': 16,
  'noteMax': 300,
  'linesMax': 50,
  'qtyMin': 1,
  'qtyMax': 999,
};

const Set<String> _storeOrderKeys = {
  'businessId', 'slug', 'customerName', 'phone', 'lines', 'note',
  'fulfilment', 'createdAt', 'state',
  // Phase H · H6 (audit fix 2): the customer's own checkout
  // consent tick joins the exactly-keyed shape (rules v10
  // amendment). Present ⇒ exactly true.
  'waOptIn',
};

final RegExp _phoneRe = RegExp(r'^\+?[0-9][0-9 -]*$');

/// A phone as the shop dials it: optional leading +, digits,
/// spaces and hyphens, 7–16 characters total.
bool phoneShapeOk(Object? phone) =>
    phone is String &&
    phone.length >= storeOrderLimits['phoneMin']! &&
    phone.length <= storeOrderLimits['phoneMax']! &&
    _phoneRe.hasMatch(phone);

/// The inbox shape, validated exactly as rules v10 validate it —
/// the hostile-shape mirror. A create is legal iff: the key set
/// is exactly the §2.4 set (note optional), every scalar is in
/// bounds, the lines are 1–50 of exactly {productId, qty} with
/// integer qty 1..999, the state is born "new", and createdAt is
/// an ISO instant (the page writes a server timestamp, which
/// Firestore materialises to request.time — the rules compare
/// against request.time itself; this mirror validates the
/// composed payload the page submits).
bool storeOrderShapeOk(Object? data) {
  if (data is! Map) return false;
  for (final k in data.keys) {
    if (!_storeOrderKeys.contains(k)) return false;
  }
  final businessId = data['businessId'];
  final slug = data['slug'];
  final customerName = data['customerName'];
  final phone = data['phone'];
  final lines = data['lines'];
  final note = data['note'];
  final fulfilment = data['fulfilment'];
  final createdAt = data['createdAt'];
  final state = data['state'];
  // H6: the consent tick may only ever be exactly true — any
  // other present value is a shape violation; absent ≡ unticked.
  final waOptIn = data['waOptIn'];
  if (waOptIn != null && waOptIn != true) return false;
  if (businessId is! String || businessId == '' || businessId.length > 128) return false;
  if (slug is! String || !slugOk(slug)) return false;
  if (customerName is! String ||
      customerName.trim() == '' ||
      customerName.length > storeOrderLimits['nameMax']!) {
    return false;
  }
  if (!phoneShapeOk(phone)) return false;
  if (note != null && (note is! String || note.length > storeOrderLimits['noteMax']!)) {
    return false;
  }
  if (fulfilment != 'pickup' && fulfilment != 'delivery') return false;
  if (createdAt is! String || DateTime.tryParse(createdAt) == null) return false;
  if (state != 'new') return false;
  if (lines is! List || lines.isEmpty || lines.length > storeOrderLimits['linesMax']!) {
    return false;
  }
  for (final line in lines) {
    if (line is! Map) return false;
    if (line.length != 2 || !line.containsKey('productId') || !line.containsKey('qty')) {
      return false;
    }
    final productId = line['productId'];
    final qty = line['qty'];
    if (productId is! String || productId == '') return false;
    if (qty is! num ||
        qty != qty.truncateToDouble() ||
        qty < storeOrderLimits['qtyMin']! ||
        qty > storeOrderLimits['qtyMax']!) {
      return false;
    }
  }
  return true;
}

/// Compose the order document the public page submits (sans its
/// Firestore id). Duplicate products merge (a cart cannot hold a
/// product twice; a hand-built payload might try) — a merge that
/// overflows the qty cap refuses the whole order rather than
/// silently truncating what a customer asked for. Returns null
/// when the composed shape fails [storeOrderShapeOk].
Map<String, dynamic>? composeStoreOrder({
  required String customerName,
  required String phone,
  String? note,
  required String fulfilment,
  // H6: the customer's own consent tick; only an explicit true
  // composes the key onto the order.
  bool waOptIn = false,
  required List<({String productId, double qty})> lines,
  required String businessId,
  required String slug,
  required String nowISO,
}) {
  final merged = <String, double>{};
  for (final l in lines) {
    merged[l.productId] = (merged[l.productId] ?? 0) + l.qty;
  }
  final mergedLines = [
    for (final e in merged.entries) {'productId': e.key, 'qty': e.value},
  ];
  final candidate = <String, dynamic>{
    'businessId': businessId,
    'slug': slug,
    'customerName': customerName.trim(),
    'phone': phone.trim(),
    'lines': mergedLines,
    'fulfilment': fulfilment,
    'createdAt': nowISO,
    'state': 'new',
  };
  final noteTrimmed = (note ?? '').trim();
  if (noteTrimmed != '') candidate['note'] = noteTrimmed;
  if (waOptIn) candidate['waOptIn'] = true;
  if (!storeOrderShapeOk(candidate)) return null;
  return candidate;
}

/// Phone comparison for customer matching: digits only, with the
/// Pakistani trunk/country forms folded (0300… ≡ +92 300…).
/// Matching is an OFFER to the member at conversion, never a
/// silent merge (§2.5) — this only finds the candidate.
String normalizePhone(String phone) {
  var d = phone.replaceAll(RegExp(r'\D'), '');
  if (d.startsWith('92') && d.length == 12) d = '0${d.substring(2)}';
  if (d.startsWith('0092')) d = '0${d.substring(4)}';
  return d;
}

Customer? matchCustomerByPhone(String orderPhone, List<Customer> customers) {
  final want = normalizePhone(orderPhone);
  if (want == '') return null;
  for (final c in customers) {
    if (normalizePhone(c.phone) == want) return c;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Conversion (design §2.5) — an order becomes an SO-, or nothing      */
/* ------------------------------------------------------------------ */

class ConversionDriftLine {
  final String productId;
  /// The name the customer saw (the snapshot's), falling back to
  /// the live product's, then the id.
  final String name;
  final double qty;
  /// The advertised price at publish; null when the product is
  /// not in the snapshot (defensive — it cannot be ordered).
  final double? publishedPrice;
  /// The LIVE price the SO will carry; null when the product has
  /// been deleted since publishing (the line drops).
  final double? livePrice;
  final bool priceChanged;
  final bool productMissing;
  const ConversionDriftLine({
    required this.productId,
    required this.name,
    required this.qty,
    required this.publishedPrice,
    required this.livePrice,
    required this.priceChanged,
    required this.productMissing,
  });
  Map<String, dynamic> toMap() => {
        'productId': productId,
        'name': name,
        'qty': qty,
        'publishedPrice': publishedPrice,
        'livePrice': livePrice,
        'priceChanged': priceChanged,
        'productMissing': productMissing,
      };
}

class StoreConversionPlan {
  /// The SO's lines at LIVE prices, missing products dropped.
  final List<DocLine> lines;
  final List<ConversionDriftLine> drift;
  final int droppedCount;
  /// The phone-matched existing customer, or null (the member
  /// confirms; conversion creates the customer when null).
  final Customer? customer;
  const StoreConversionPlan({
    required this.lines,
    required this.drift,
    required this.droppedCount,
    required this.customer,
  });
  Map<String, dynamic> toMap() => {
        'lines': lines.map((l) => l.toMap()).toList(),
        'drift': drift.map((d) => d.toMap()).toList(),
        'droppedCount': droppedCount,
        'customer': customer == null
            ? null
            : {'id': customer!.id, ...customer!.toMap()},
      };
}

/// Plan a conversion against LIVE data. Returns null when the
/// conversion must be refused before anything is composed:
///  - the order is not `new` — the state IS the exactly-once
///    claim; a converted or dismissed order converts never again;
///  - every line's product is gone (an SO of nothing is nothing).
/// Quantities are NOT clamped to stock — SOs may exceed stock;
/// Phase B's derived fulfilment already speaks backorder (§2.5).
StoreConversionPlan? planStoreConversion(
  StoreOrder order,
  StorefrontDoc? snapshot,
  List<Product> products,
  List<Customer> customers,
) {
  if (order.state != 'new') return null;
  final byId = {for (final p in products) p.id: p};
  final published = {
    for (final p in snapshot?.products ?? const <StorefrontProduct>[]) p.productId: p,
  };
  final drift = <ConversionDriftLine>[];
  final lines = <DocLine>[];
  for (final l in order.lines) {
    final live = byId[l.productId];
    final pub = published[l.productId];
    drift.add(ConversionDriftLine(
      productId: l.productId,
      name: pub?.name ?? live?.name ?? l.productId,
      qty: l.qty.toDouble(),
      publishedPrice: pub?.price,
      livePrice: live?.salePrice,
      priceChanged: live != null && pub != null && live.salePrice != pub.price,
      productMissing: live == null,
    ));
    if (live != null) {
      lines.add(DocLine(
        productId: live.id,
        name: live.name,
        qty: l.qty.toDouble(),
        unitPrice: live.salePrice,
        total: l.qty * live.salePrice,
        sourceProductId: l.productId,
      ));
    }
  }
  if (lines.isEmpty) return null;
  return StoreConversionPlan(
    lines: lines,
    drift: drift,
    droppedCount: drift.where((d) => d.productMissing).length,
    customer: matchCustomerByPhone(order.phone, customers),
  );
}

/// The sale order a conversion births (sans its id — the store
/// assigns ids). Born `open` with its number already minted: the
/// member reviewed the drift and confirmed, which IS the
/// confirmation a desk order gets from confirmSaleOrder. Totals
/// are the Phase B estimate over the live-priced lines (the
/// display-only tax estimate, as every SO carries).
SaleOrder buildStoreSaleOrder(
  StoreOrder order,
  StoreConversionPlan plan, {
  required String number,
  required String? customerId,
  required String customerName,
  required String customerPhone,
  required List<Product> products,
  required List<TaxSlab> taxSlabs,
  required ShopSettingsView settings,
  required String nowISO,
}) {
  final totals = estimateDocTotals(
    plan.lines,
    'flat',
    0,
    products: products,
    slabs: taxSlabs,
    settings: settings,
  );
  return SaleOrder(
    id: '',
    number: number,
    customerId: customerId,
    customerName: customerName,
    customerPhone: customerPhone,
    lines: plan.lines,
    subtotal: totals.subtotal,
    discountType: 'flat',
    discountValue: 0,
    discountAmount: totals.discountAmount,
    estimatedTax: totals.estimatedTax,
    total: totals.total,
    source: null,
    sourceType: 'storefront',
    sourceOrderId: order.id,
    expectedDate: null,
    note: order.note ?? '',
    status: 'open',
    dayOffset: 0,
    ts: nowISO,
  );
}

/// The inbox's headline figures for the desk (derived, never
/// stored — the derivation doctrine).
({int fresh, int converted, int dismissed}) storeOrderCounts(List<StoreOrder> orders) => (
      fresh: orders.where((o) => o.state == 'new').length,
      converted: orders.where((o) => o.state == 'converted').length,
      dismissed: orders.where((o) => o.state == 'dismissed').length,
    );
