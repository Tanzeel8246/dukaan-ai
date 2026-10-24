/// Dukaan AI — document models mirroring web/lib/types.ts (the schema of
/// record). Field names and shapes are the Firestore contract: a document
/// written by this app is byte-for-byte a document the web reads.
/// Readers are tolerant of missing legacy fields (the SEARCH-suite
/// lesson: legacy documents may lack newer fields; never throw).

double _d(Object? v, [double fallback = 0]) =>
    v is num ? v.toDouble() : (v is String ? double.tryParse(v) ?? fallback : fallback);
int _i(Object? v, [int fallback = 0]) => v is num ? v.toInt() : fallback;
String _s(Object? v, [String fallback = '']) => v is String ? v : fallback;
String? _sn(Object? v) => v is String ? v : null;
bool _b(Object? v, [bool fallback = false]) => v is bool ? v : fallback;

class Product {
  final String id;
  final String sku;
  final String name;
  final String urduName;
  final String category;
  final String unit;
  final double costPrice;
  final double salePrice;
  final double stockQty;
  final double reorderLevel;
  final List<String> keywords;
  final String? expiryDate;
  final String? taxSlabId;
  final bool taxExempt;
  final String? stockClass; // "raw" | null (goods)
  const Product({
    required this.id, this.sku = '', this.name = '', this.urduName = '',
    this.category = '', this.unit = 'pcs', this.costPrice = 0, this.salePrice = 0,
    this.stockQty = 0, this.reorderLevel = 0, this.keywords = const [],
    this.expiryDate, this.taxSlabId, this.taxExempt = false, this.stockClass,
  });
  bool get isRaw => stockClass == 'raw';
  factory Product.fromMap(String id, Map<String, dynamic> m) => Product(
        id: id,
        sku: _s(m['sku']), name: _s(m['name']), urduName: _s(m['urduName']),
        category: _s(m['category']), unit: _s(m['unit'], 'pcs'),
        costPrice: _d(m['costPrice']), salePrice: _d(m['salePrice']),
        stockQty: _d(m['stockQty']), reorderLevel: _d(m['reorderLevel']),
        keywords: (m['keywords'] is List) ? (m['keywords'] as List).map((e) => e.toString()).toList() : const [],
        expiryDate: _sn(m['expiryDate']), taxSlabId: _sn(m['taxSlabId']),
        taxExempt: _b(m['taxExempt']), stockClass: _sn(m['stockClass']),
      );
  Map<String, dynamic> toMap() => {
        'sku': sku, 'name': name, 'urduName': urduName, 'category': category,
        'unit': unit, 'costPrice': costPrice, 'salePrice': salePrice,
        'stockQty': stockQty, 'reorderLevel': reorderLevel, 'keywords': keywords,
        'expiryDate': expiryDate, 'taxSlabId': taxSlabId, 'taxExempt': taxExempt,
        'stockClass': stockClass,
      };
  Product copyWith({double? stockQty, double? costPrice, double? salePrice, String? name}) => Product(
        id: id, sku: sku, name: name ?? this.name, urduName: urduName, category: category,
        unit: unit, costPrice: costPrice ?? this.costPrice, salePrice: salePrice ?? this.salePrice,
        stockQty: stockQty ?? this.stockQty, reorderLevel: reorderLevel, keywords: keywords,
        expiryDate: expiryDate, taxSlabId: taxSlabId, taxExempt: taxExempt, stockClass: stockClass,
      );
}

class Sale {
  final String id;
  final String productId;
  final double qty;
  final double unitPrice;
  final double? unitCost;
  final double total;
  final String? billId;
  final String kind; // "sale" | "return"
  final int dayOffset;
  final String ts;
  const Sale({required this.id, required this.productId, this.qty = 0, this.unitPrice = 0,
    this.unitCost, this.total = 0, this.billId, this.kind = 'sale', this.dayOffset = 0, this.ts = ''});
  factory Sale.fromMap(String id, Map<String, dynamic> m) => Sale(
        id: id, productId: _s(m['productId']), qty: _d(m['qty']), unitPrice: _d(m['unitPrice']),
        unitCost: m['unitCost'] is num ? _d(m['unitCost']) : null, total: _d(m['total']),
        billId: _sn(m['billId']), kind: _s(m['kind'], 'sale'), dayOffset: _i(m['dayOffset']), ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'productId': productId, 'qty': qty, 'unitPrice': unitPrice, 'unitCost': unitCost,
        'total': total, 'billId': billId, 'kind': kind, 'dayOffset': dayOffset, 'ts': ts,
      };
}

class BillItem {
  final String productId;
  final String name;
  final double qty;
  final double unitPrice;
  final double unitCost;
  final double total;
  final String? sourceProductId;
  final double taxAmount;
  final String? taxSlabId;
  final String? taxSlabName;
  final double taxRate;
  final String taxKind; // "percent" | "fixed"
  final bool taxInclusive;
  const BillItem({required this.productId, this.name = '', this.qty = 0, this.unitPrice = 0,
    this.unitCost = 0, this.total = 0, this.sourceProductId, this.taxAmount = 0,
    this.taxSlabId, this.taxSlabName, this.taxRate = 0, this.taxKind = 'percent', this.taxInclusive = false});
  factory BillItem.fromMap(Map<String, dynamic> m) => BillItem(
        productId: _s(m['productId']), name: _s(m['name']), qty: _d(m['qty']),
        unitPrice: _d(m['unitPrice']), unitCost: _d(m['unitCost']), total: _d(m['total']),
        sourceProductId: _sn(m['sourceProductId']), taxAmount: _d(m['taxAmount']),
        taxSlabId: _sn(m['taxSlabId']), taxSlabName: _sn(m['taxSlabName']),
        taxRate: _d(m['taxRate']), taxKind: _s(m['taxKind'], 'percent'), taxInclusive: _b(m['taxInclusive']),
      );
  Map<String, dynamic> toMap() => {
        'productId': productId, 'name': name, 'qty': qty, 'unitPrice': unitPrice,
        'unitCost': unitCost, 'total': total,
        if (sourceProductId != null) 'sourceProductId': sourceProductId,
        'taxAmount': taxAmount, 'taxSlabId': taxSlabId, 'taxSlabName': taxSlabName,
        'taxRate': taxRate, 'taxKind': taxKind, 'taxInclusive': taxInclusive,
      };
  BillItem copyWith({double? qty, double? total, double? taxAmount}) => BillItem(
        productId: productId, name: name, qty: qty ?? this.qty, unitPrice: unitPrice,
        unitCost: unitCost, total: total ?? this.total, sourceProductId: sourceProductId,
        taxAmount: taxAmount ?? this.taxAmount, taxSlabId: taxSlabId, taxSlabName: taxSlabName,
        taxRate: taxRate, taxKind: taxKind, taxInclusive: taxInclusive);
}

/// A cheque capture draft — INPUT only (web ChequeDraft): it rides a
/// payment/expense/payment-row input into the posting action, which
/// consumes it into a registry doc; it is never stored on the row.
class ChequeDraft {
  final String chequeNo;
  final String bankName;
  final String issueDateISO;
  final String dueDateISO;
  const ChequeDraft({required this.chequeNo, required this.bankName, required this.issueDateISO, required this.dueDateISO});
}

class BillPayment {
  final String method; // PayMethod
  final double amount;
  final String? accountId;
  final String? instrument; // "cheque" | "points" | null
  final String? chequeId;
  final ChequeDraft? cheque; // capture draft, input only — never stored
  /// Phase H · H1/H2: on a `points` instrument part, the points
  /// the customer tenders (stored on the posted bill, like the
  /// web). The part's `amount` is the RUPEE value those points
  /// carry — lib/loyalty's FIFO quote, re-validated by the store
  /// at posting; the part's journal line posts Dr
  /// `loyalty_payable` (ref: customerId) in place of a money line.
  final int? loyaltyPoints;
  const BillPayment({required this.method, this.amount = 0, this.accountId, this.instrument, this.chequeId, this.cheque, this.loyaltyPoints});
  factory BillPayment.fromMap(Map<String, dynamic> m) => BillPayment(
        method: _s(m['method'], 'cash'), amount: _d(m['amount']), accountId: _sn(m['accountId']),
        instrument: _sn(m['instrument']), chequeId: _sn(m['chequeId']),
        loyaltyPoints: m['loyaltyPoints'] is num ? _i(m['loyaltyPoints']) : null,
      );
  Map<String, dynamic> toMap() => {
        'method': method, 'amount': amount, 'accountId': accountId,
        if (instrument != null) 'instrument': instrument,
        if (chequeId != null) 'chequeId': chequeId,
        if (loyaltyPoints != null) 'loyaltyPoints': loyaltyPoints,
      };
}

class Bill {
  final String id;
  final int billNo;
  final String? customerId;
  final String customerName;
  final String customerPhone;
  final List<BillItem> items;
  final double subtotal;
  final String discountType; // "flat" | "percent"
  final double discountValue;
  final double discountAmount;
  final double taxAmount;
  final double total;
  final List<BillPayment> payments;
  final String status; // paid | held | voided | partially_returned | returned
  final Map<String, double> returnedQty;
  final String? sourceType;
  final String? sourceId;
  final String? warehouseId;
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const Bill({required this.id, this.billNo = 0, this.customerId, this.customerName = '',
    this.customerPhone = '', this.items = const [], this.subtotal = 0, this.discountType = 'flat',
    this.discountValue = 0, this.discountAmount = 0, this.taxAmount = 0, this.total = 0,
    this.payments = const [], this.status = 'paid', this.returnedQty = const {},
    this.sourceType, this.sourceId, this.warehouseId, this.dayOffset = 0, this.ts = '', this.originDevice});
  factory Bill.fromMap(String id, Map<String, dynamic> m) => Bill(
        id: id, billNo: _i(m['billNo']), customerId: _sn(m['customerId']),
        customerName: _s(m['customerName']), customerPhone: _s(m['customerPhone']),
        items: (m['items'] is List) ? (m['items'] as List).whereType<Map>().map((e) => BillItem.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        subtotal: _d(m['subtotal']), discountType: _s(m['discountType'], 'flat'),
        discountValue: _d(m['discountValue']), discountAmount: _d(m['discountAmount']),
        taxAmount: _d(m['taxAmount']), total: _d(m['total']),
        payments: (m['payments'] is List) ? (m['payments'] as List).whereType<Map>().map((e) => BillPayment.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        status: _s(m['status'], 'paid'),
        returnedQty: (m['returnedQty'] is Map) ? (m['returnedQty'] as Map).map((k, v) => MapEntry(k.toString(), _d(v))) : const {},
        sourceType: _sn(m['sourceType']), sourceId: _sn(m['sourceId']), warehouseId: _sn(m['warehouseId']),
        dayOffset: _i(m['dayOffset']), ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'billNo': billNo, 'customerId': customerId, 'customerName': customerName,
        'customerPhone': customerPhone, 'items': items.map((e) => e.toMap()).toList(),
        'subtotal': subtotal, 'discountType': discountType, 'discountValue': discountValue,
        'discountAmount': discountAmount, 'taxAmount': taxAmount, 'total': total,
        'payments': payments.map((e) => e.toMap()).toList(), 'status': status,
        'returnedQty': returnedQty,
        if (sourceType != null) 'sourceType': sourceType,
        if (sourceId != null) 'sourceId': sourceId,
        'warehouseId': warehouseId, 'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
}

class SaleReturn {
  final String id;
  final String billId;
  final int billNo;
  final List<BillItem> items;
  final double refundAmount;
  final double creditReduction;
  /// Phase H · H1/H2: the portion of the refund settled by
  /// re-crediting loyalty points (rupees + the point count) —
  /// points come back as points, never as cash. 0 on returns of
  /// bills that carried no points tender. The web stamps these
  /// only when the rupee share is > 0; toMap mirrors that.
  final double loyaltyRecreditRs;
  final int loyaltyRecreditPoints;
  final String method;
  final String? accountId;
  final int dayOffset;
  final String ts;
  const SaleReturn({required this.id, required this.billId, this.billNo = 0, this.items = const [],
    this.refundAmount = 0, this.creditReduction = 0, this.loyaltyRecreditRs = 0,
    this.loyaltyRecreditPoints = 0, this.method = 'cash', this.accountId,
    this.dayOffset = 0, this.ts = ''});
  factory SaleReturn.fromMap(String id, Map<String, dynamic> m) => SaleReturn(
        id: id, billId: _s(m['billId']), billNo: _i(m['billNo']),
        items: (m['items'] is List) ? (m['items'] as List).whereType<Map>().map((e) => BillItem.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        refundAmount: _d(m['refundAmount']), creditReduction: _d(m['creditReduction']),
        loyaltyRecreditRs: _d(m['loyaltyRecreditRs']), loyaltyRecreditPoints: _i(m['loyaltyRecreditPoints']),
        method: _s(m['method'], 'cash'), accountId: _sn(m['accountId']),
        dayOffset: _i(m['dayOffset']), ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'billId': billId, 'billNo': billNo, 'items': items.map((e) => e.toMap()).toList(),
        'refundAmount': refundAmount, 'creditReduction': creditReduction,
        if (loyaltyRecreditRs > 0) 'loyaltyRecreditRs': loyaltyRecreditRs,
        if (loyaltyRecreditRs > 0) 'loyaltyRecreditPoints': loyaltyRecreditPoints,
        'method': method,
        'accountId': accountId, 'dayOffset': dayOffset, 'ts': ts,
      };
}

class Customer {
  final String id;
  final String name;
  final String phone;
  final String address;
  final String note;
  final String ts;
  /// Phase H · WhatsApp (design §3.2): marketing consent —
  /// absent/false means NO marketing, ever. Transactional
  /// messages (bill shares, order updates) are not marketing
  /// and are untouched by this flag. Granted only by a capture
  /// the customer agreed to (counter / storefront conversion);
  /// an import can NEVER set it — core/whatsapp's sanitizer
  /// strips any consent claim from imported rows, so a bought
  /// list cannot launder consent through a spreadsheet. The
  /// three fields are a unit (the latest act's stamp); toMap
  /// writes them only once a stamp exists, exactly as the web's
  /// patch leaves unconsented docs without the keys.
  final bool? waOptIn;
  /// When the current consent state was stamped (ISO).
  final String? waOptInAt;
  /// Where the consent was captured: "counter" | "storefront".
  /// "import" is deliberately NOT a member: no code path may
  /// stamp it (design §3.2's capture list names an import
  /// column, but the §6 checkpoint rules that import never sets
  /// opt-in — the checkpoint governs).
  final String? waOptInSource;
  const Customer({required this.id, this.name = '', this.phone = '', this.address = '', this.note = '', this.ts = '',
    this.waOptIn, this.waOptInAt, this.waOptInSource});
  factory Customer.fromMap(String id, Map<String, dynamic> m) => Customer(
        id: id, name: _s(m['name']), phone: _s(m['phone']), address: _s(m['address']),
        note: _s(m['note']), ts: _s(m['ts']),
        waOptIn: m['waOptIn'] is bool ? m['waOptIn'] as bool : null,
        waOptInAt: _sn(m['waOptInAt']), waOptInSource: _sn(m['waOptInSource']),
      );
  Map<String, dynamic> toMap() => {
        'name': name, 'phone': phone, 'address': address, 'note': note, 'ts': ts,
        if (waOptIn != null) 'waOptIn': waOptIn,
        if (waOptInAt != null) 'waOptInAt': waOptInAt,
        if (waOptInSource != null) 'waOptInSource': waOptInSource,
      };
}

class CreditEntry {
  final String id;
  final String? customerId;
  final String customerName;
  final String customerPhone;
  final String kind; // "credit" | "repayment"
  final double amount; // negative credit rows are bill-void/return reversals
  final String? method;
  final String? accountId;
  final String? instrument;
  final String? chequeId;
  final String? voucherNo;
  final String note;
  final String? billId;
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const CreditEntry({required this.id, this.customerId, this.customerName = '', this.customerPhone = '',
    this.kind = 'credit', this.amount = 0, this.method, this.accountId, this.instrument,
    this.chequeId, this.voucherNo, this.note = '', this.billId, this.dayOffset = 0, this.ts = '', this.originDevice});
  factory CreditEntry.fromMap(String id, Map<String, dynamic> m) => CreditEntry(
        id: id, customerId: _sn(m['customerId']), customerName: _s(m['customerName']),
        customerPhone: _s(m['customerPhone']), kind: _s(m['kind'], 'credit'), amount: _d(m['amount']),
        method: _sn(m['method']), accountId: _sn(m['accountId']), instrument: _sn(m['instrument']),
        chequeId: _sn(m['chequeId']), voucherNo: _sn(m['voucherNo']), note: _s(m['note']),
        billId: _sn(m['billId']), dayOffset: _i(m['dayOffset']), ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'customerId': customerId, 'customerName': customerName, 'customerPhone': customerPhone,
        'kind': kind, 'amount': amount, 'method': method, 'accountId': accountId,
        if (instrument != null) 'instrument': instrument,
        if (chequeId != null) 'chequeId': chequeId,
        if (voucherNo != null) 'voucherNo': voucherNo,
        'note': note, 'billId': billId, 'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
}

class PurchaseItem {
  final String productId;
  final String name;
  final double qty;
  final double unitCost;
  final double total;
  final double taxAmount;
  final String? taxSlabId;
  final String? taxSlabName;
  final double taxRate;
  final String taxKind;
  final bool taxInclusive;
  const PurchaseItem({required this.productId, this.name = '', this.qty = 0, this.unitCost = 0,
    this.total = 0, this.taxAmount = 0, this.taxSlabId, this.taxSlabName, this.taxRate = 0,
    this.taxKind = 'percent', this.taxInclusive = false});
  factory PurchaseItem.fromMap(Map<String, dynamic> m) => PurchaseItem(
        productId: _s(m['productId']), name: _s(m['name']), qty: _d(m['qty']),
        unitCost: _d(m['unitCost']), total: _d(m['total']), taxAmount: _d(m['taxAmount']),
        taxSlabId: _sn(m['taxSlabId']), taxSlabName: _sn(m['taxSlabName']), taxRate: _d(m['taxRate']),
        taxKind: _s(m['taxKind'], 'percent'), taxInclusive: _b(m['taxInclusive']),
      );
  Map<String, dynamic> toMap() => {
        'productId': productId, 'name': name, 'qty': qty, 'unitCost': unitCost, 'total': total,
        'taxAmount': taxAmount, 'taxSlabId': taxSlabId, 'taxSlabName': taxSlabName,
        'taxRate': taxRate, 'taxKind': taxKind, 'taxInclusive': taxInclusive,
      };
}

class Purchase {
  final String id;
  final String supplierId;
  final List<PurchaseItem> items;
  final double total; // gross owed
  final double? netTotal;
  final double taxAmount;
  final String note;
  final String? sourcePoId;
  final String? warehouseId;
  final int dayOffset;
  final String ts;
  const Purchase({required this.id, required this.supplierId, this.items = const [], this.total = 0,
    this.netTotal, this.taxAmount = 0, this.note = '', this.sourcePoId, this.warehouseId,
    this.dayOffset = 0, this.ts = ''});
  factory Purchase.fromMap(String id, Map<String, dynamic> m) => Purchase(
        id: id, supplierId: _s(m['supplierId']),
        items: (m['items'] is List) ? (m['items'] as List).whereType<Map>().map((e) => PurchaseItem.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        total: _d(m['total']), netTotal: m['netTotal'] is num ? _d(m['netTotal']) : null,
        taxAmount: _d(m['taxAmount']), note: _s(m['note']), sourcePoId: _sn(m['sourcePoId']),
        warehouseId: _sn(m['warehouseId']), dayOffset: _i(m['dayOffset']), ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'supplierId': supplierId, 'items': items.map((e) => e.toMap()).toList(),
        'total': total, 'netTotal': netTotal, 'taxAmount': taxAmount, 'note': note,
        if (sourcePoId != null) 'sourcePoId': sourcePoId,
        'warehouseId': warehouseId, 'dayOffset': dayOffset, 'ts': ts,
      };
}

class MoneyAccount {
  final String id;
  final String name;
  final String kind; // "cash" | "wallet" | "bank"
  final String? method; // PayMethod | null
  final String? legacyFor; // "cash" | "wallet" | null
  final bool archived;
  final int sortOrder;
  final String ts;
  const MoneyAccount({required this.id, this.name = '', this.kind = 'cash', this.method,
    this.legacyFor, this.archived = false, this.sortOrder = 0, this.ts = ''});
  factory MoneyAccount.fromMap(String id, Map<String, dynamic> m) => MoneyAccount(
        id: id, name: _s(m['name']), kind: _s(m['kind'], 'cash'), method: _sn(m['method']),
        legacyFor: _sn(m['legacyFor']), archived: _b(m['archived']),
        sortOrder: _i(m['sortOrder']), ts: _s(m['ts']),
      );
  MoneyAccount copyWith({String? name, String? method, bool clearMethod = false,
      bool? archived}) => MoneyAccount(
        id: id, name: name ?? this.name, kind: kind,
        method: clearMethod ? null : (method ?? this.method),
        legacyFor: legacyFor, archived: archived ?? this.archived,
        sortOrder: sortOrder, ts: ts);
  Map<String, dynamic> toMap() => {
        'name': name, 'kind': kind, 'method': method, 'legacyFor': legacyFor,
        'archived': archived, 'sortOrder': sortOrder, 'ts': ts,
      };
}

class TaxSlab {
  final String id;
  final String name;
  final String kind; // "percent" | "fixed"
  final double rate;
  final String appliesTo; // "sales" | "purchases" | "both"
  final bool inclusive;
  final bool isDefault;
  final bool active;
  final String ts;
  const TaxSlab({required this.id, this.name = '', this.kind = 'percent', this.rate = 0,
    this.appliesTo = 'both', this.inclusive = false, this.isDefault = false, this.active = true, this.ts = ''});
  factory TaxSlab.fromMap(String id, Map<String, dynamic> m) => TaxSlab(
        id: id, name: _s(m['name']), kind: _s(m['kind'], 'percent'), rate: _d(m['rate']),
        appliesTo: _s(m['appliesTo'], 'both'), inclusive: _b(m['inclusive']),
        isDefault: _b(m['isDefault']), active: _b(m['active'], true), ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'name': name, 'kind': kind, 'rate': rate, 'appliesTo': appliesTo,
        'inclusive': inclusive, 'isDefault': isDefault, 'active': active, 'ts': ts,
      };
  TaxSlab copyWith({String? name, String? kind, double? rate, String? appliesTo,
      bool? inclusive, bool? isDefault, bool? active}) => TaxSlab(
        id: id, name: name ?? this.name, kind: kind ?? this.kind,
        rate: rate ?? this.rate, appliesTo: appliesTo ?? this.appliesTo,
        inclusive: inclusive ?? this.inclusive, isDefault: isDefault ?? this.isDefault,
        active: active ?? this.active, ts: ts);
}

class JournalLine {
  final String account;
  final double debit;
  final double credit;
  final String? ref;
  const JournalLine({required this.account, this.debit = 0, this.credit = 0, this.ref});
  factory JournalLine.fromMap(Map<String, dynamic> m) => JournalLine(
        account: _s(m['account']), debit: _d(m['debit']), credit: _d(m['credit']), ref: _sn(m['ref']),
      );
  Map<String, dynamic> toMap() => {'account': account, 'debit': debit, 'credit': credit, 'ref': ref};
}

class JournalEntry {
  final String id;
  final String memo;
  final String refType;
  final String? refId;
  final String? reversesId;
  final List<JournalLine> lines;
  final int dayOffset;
  final String ts;
  final String? dateISO;
  final String? originDevice;
  /* ---- Phase H · H1/H2 loyalty payloads (web types.ts) ----
   * The journal carries RUPEES; points are a DERIVED view folded
   * from these payloads by core/loyalty.dart — no points figure
   * is ever stored on the customer doc. Every field is optional;
   * entries with no loyalty content carry none of them. */
  /// On `loyalty_earn`: points granted (positive) or clawed back
  /// (negative). On `loyalty_expire`: the points released.
  final int? points;
  /// On earn entries with points > 0: the point's rupee value
  /// snapshotted at earn time.
  final double? rsPerPoint;
  /// On earn entries: the expiry horizon (months) snapshotted.
  final int? loyaltyExpiryMonths;
  /// On earn entries: the tier multiplier that WAS applied.
  final double? loyaltyTierMult;
  /// On `bill` entries carrying a points tender: the points the
  /// bill's Dr `loyalty_payable` leg settled.
  final int? loyaltyPointsUsed;
  /// On `return` / `bill_void` entries: points re-credited.
  final int? loyaltyPointsReturned;
  /// On clawback / void earn-reversal entries: the bill whose
  /// earn this entry takes back.
  final String? loyaltySourceBillId;
  const JournalEntry({required this.id, this.memo = '', this.refType = '', this.refId,
    this.reversesId, this.lines = const [], this.dayOffset = 0, this.ts = '', this.dateISO, this.originDevice,
    this.points, this.rsPerPoint, this.loyaltyExpiryMonths, this.loyaltyTierMult,
    this.loyaltyPointsUsed, this.loyaltyPointsReturned, this.loyaltySourceBillId});
  factory JournalEntry.fromMap(String id, Map<String, dynamic> m) => JournalEntry(
        id: id, memo: _s(m['memo']), refType: _s(m['refType']), refId: _sn(m['refId']),
        reversesId: _sn(m['reversesId']),
        lines: (m['lines'] is List) ? (m['lines'] as List).whereType<Map>().map((e) => JournalLine.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        dayOffset: _i(m['dayOffset']), ts: _s(m['ts']), dateISO: _sn(m['dateISO']), originDevice: _sn(m['originDevice']),
        points: m['points'] is num ? _i(m['points']) : null,
        rsPerPoint: m['rsPerPoint'] is num ? _d(m['rsPerPoint']) : null,
        loyaltyExpiryMonths: m['loyaltyExpiryMonths'] is num ? _i(m['loyaltyExpiryMonths']) : null,
        loyaltyTierMult: m['loyaltyTierMult'] is num ? _d(m['loyaltyTierMult']) : null,
        loyaltyPointsUsed: m['loyaltyPointsUsed'] is num ? _i(m['loyaltyPointsUsed']) : null,
        loyaltyPointsReturned: m['loyaltyPointsReturned'] is num ? _i(m['loyaltyPointsReturned']) : null,
        loyaltySourceBillId: _sn(m['loyaltySourceBillId']),
      );
  Map<String, dynamic> toMap() => {
        'memo': memo, 'refType': refType, 'refId': refId, 'reversesId': reversesId,
        'lines': lines.map((e) => e.toMap()).toList(), 'dayOffset': dayOffset, 'ts': ts,
        if (dateISO != null) 'dateISO': dateISO,
        if (originDevice != null) 'originDevice': originDevice,
        if (points != null) 'points': points,
        if (rsPerPoint != null) 'rsPerPoint': rsPerPoint,
        if (loyaltyExpiryMonths != null) 'loyaltyExpiryMonths': loyaltyExpiryMonths,
        if (loyaltyTierMult != null) 'loyaltyTierMult': loyaltyTierMult,
        if (loyaltyPointsUsed != null) 'loyaltyPointsUsed': loyaltyPointsUsed,
        if (loyaltyPointsReturned != null) 'loyaltyPointsReturned': loyaltyPointsReturned,
        if (loyaltySourceBillId != null) 'loyaltySourceBillId': loyaltySourceBillId,
      };
  JournalEntry copyWith({String? dateISO, String? originDevice,
      int? points, double? rsPerPoint, int? loyaltyExpiryMonths, double? loyaltyTierMult,
      int? loyaltyPointsUsed, int? loyaltyPointsReturned, String? loyaltySourceBillId}) => JournalEntry(
        id: id, memo: memo, refType: refType, refId: refId, reversesId: reversesId,
        lines: lines, dayOffset: dayOffset, ts: ts,
        dateISO: dateISO ?? this.dateISO, originDevice: originDevice ?? this.originDevice,
        points: points ?? this.points, rsPerPoint: rsPerPoint ?? this.rsPerPoint,
        loyaltyExpiryMonths: loyaltyExpiryMonths ?? this.loyaltyExpiryMonths,
        loyaltyTierMult: loyaltyTierMult ?? this.loyaltyTierMult,
        loyaltyPointsUsed: loyaltyPointsUsed ?? this.loyaltyPointsUsed,
        loyaltyPointsReturned: loyaltyPointsReturned ?? this.loyaltyPointsReturned,
        loyaltySourceBillId: loyaltySourceBillId ?? this.loyaltySourceBillId);
}

/// The F1 slice of the owner-doc settings (web ShopSettings). Unknown
/// fields are preserved by the store's raw owner-doc map; this typed
/// view covers what the apps read.
class ShopSettingsView {
  final String shopName;
  final String address;
  final String phone;
  final String? shopNameAlt;
  final String? defaultSalesTaxSlabId;
  final String? defaultPurchaseTaxSlabId;
  final int fiscalYearStartMonth;
  final int fiscalYearStartDay;
  final String lockedThrough;
  final Map<String, String> docSeries;
  final List<String> jobStages;
  final Map<String, String> tallyLedgerNames; // Phase D · D5 name overrides (names only, never groups)
  /// Phase H · H1/H2: the loyalty programme's raw settings block
  /// (web LoyaltySettings) — interpreted ONLY through
  /// core/loyalty.dart's resolver, never read raw by surfaces.
  final Map<String, dynamic> loyaltyBlock;
  /// Phase H · H3/H4 (design §2.2): the storefront publish
  /// preferences block (web StorefrontSettings — autoRepublish).
  final Map<String, dynamic> storefrontBlock;
  /// Phase H · WhatsApp (design §3.5): the WhatsApp settings
  /// block (web WaSettings — serviceIntervalDays) — interpreted
  /// ONLY through core/whatsapp.dart's resolver, never read raw
  /// by surfaces. (The audience derivations read the raw owner
  /// doc through WaAudienceData, as the web reads ShopSettings.)
  final Map<String, dynamic> whatsappBlock;
  /// Phase H · H3/H4: the shop's claimed storefront slug, cached
  /// on the owner doc at publish time so print/link seams can
  /// render the store link without a platform read. A label: the
  /// `storefronts/{slug}` doc is the slug's home. Null ⇒ no store
  /// has been published.
  final String? storefrontSlug;
  const ShopSettingsView({this.shopName = '', this.address = '', this.phone = '', this.shopNameAlt,
    this.defaultSalesTaxSlabId, this.defaultPurchaseTaxSlabId, this.fiscalYearStartMonth = 7,
    this.fiscalYearStartDay = 1, this.lockedThrough = '', this.docSeries = const {},
    this.jobStages = const [], this.tallyLedgerNames = const {}, this.loyaltyBlock = const {},
    this.storefrontBlock = const {}, this.whatsappBlock = const {}, this.storefrontSlug});
  factory ShopSettingsView.fromMap(Map<String, dynamic> m) => ShopSettingsView(
        shopName: _s(m['shopName']), address: _s(m['address']), phone: _s(m['phone']),
        shopNameAlt: _sn(m['shopNameAlt']),
        defaultSalesTaxSlabId: _sn(m['defaultSalesTaxSlabId']),
        defaultPurchaseTaxSlabId: _sn(m['defaultPurchaseTaxSlabId']),
        fiscalYearStartMonth: m['fiscalYearStartMonth'] is num ? _i(m['fiscalYearStartMonth']) : 7,
        fiscalYearStartDay: m['fiscalYearStartDay'] is num ? _i(m['fiscalYearStartDay']) : 1,
        lockedThrough: _s(m['lockedThrough']),
        docSeries: (m['docSeries'] is Map) ? (m['docSeries'] as Map).map((k, v) => MapEntry(k.toString(), v.toString())) : const {},
        jobStages: (m['jobStages'] is List) ? (m['jobStages'] as List).map((e) => e.toString()).toList() : const [],
        tallyLedgerNames: (m['tallyLedgerNames'] is Map) ? (m['tallyLedgerNames'] as Map).map((k, v) => MapEntry(k.toString(), v.toString())) : const {},
        loyaltyBlock: (m['loyalty'] is Map) ? Map<String, dynamic>.from(m['loyalty'] as Map) : const {},
        storefrontBlock: (m['storefront'] is Map) ? Map<String, dynamic>.from(m['storefront'] as Map) : const {},
        whatsappBlock: (m['whatsapp'] is Map) ? Map<String, dynamic>.from(m['whatsapp'] as Map) : const {},
        storefrontSlug: _sn(m['storefrontSlug']),
      );
}

class DayClose {
  final String id;
  final String dateISO;
  final String? accountId;
  final double openingCash;
  final Map<String, double> salesByMethod;
  final double expensesTotal;
  final double creditGiven;
  final double creditReceived;
  final double supplierPaid;
  final double expectedCash;
  final double countedCash;
  final double difference; // counted - expected
  final String note;
  final int dayOffset;
  final String ts;
  const DayClose({required this.id, this.dateISO = '', this.accountId, this.openingCash = 0,
    this.salesByMethod = const {}, this.expensesTotal = 0, this.creditGiven = 0,
    this.creditReceived = 0, this.supplierPaid = 0, this.expectedCash = 0,
    this.countedCash = 0, this.difference = 0, this.note = '', this.dayOffset = 0, this.ts = ''});
  factory DayClose.fromMap(String id, Map<String, dynamic> m) => DayClose(
        id: id, dateISO: _s(m['dateISO']), accountId: _sn(m['accountId']),
        openingCash: _d(m['openingCash']),
        salesByMethod: (m['salesByMethod'] is Map) ? (m['salesByMethod'] as Map).map((k, v) => MapEntry(k.toString(), _d(v))) : const {},
        expensesTotal: _d(m['expensesTotal']), creditGiven: _d(m['creditGiven']),
        creditReceived: _d(m['creditReceived']), supplierPaid: _d(m['supplierPaid']),
        expectedCash: _d(m['expectedCash']), countedCash: _d(m['countedCash']),
        difference: _d(m['difference']), note: _s(m['note']),
        dayOffset: _i(m['dayOffset']), ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'dateISO': dateISO, 'accountId': accountId, 'openingCash': openingCash,
        'salesByMethod': salesByMethod, 'expensesTotal': expensesTotal,
        'creditGiven': creditGiven, 'creditReceived': creditReceived,
        'supplierPaid': supplierPaid, 'expectedCash': expectedCash,
        'countedCash': countedCash, 'difference': difference, 'note': note,
        'dayOffset': dayOffset, 'ts': ts,
      };
}

class StockLevel {
  final String id; // "${warehouseId}__${productId}" on web
  final String warehouseId;
  final String productId;
  final double qty;
  const StockLevel({required this.id, this.warehouseId = '', this.productId = '', this.qty = 0});
  factory StockLevel.fromMap(String id, Map<String, dynamic> m) => StockLevel(
        id: id, warehouseId: _s(m['warehouseId']), productId: _s(m['productId']), qty: _d(m['qty']),
      );
  Map<String, dynamic> toMap() => {'productId': productId, 'warehouseId': warehouseId, 'qty': qty};
}

class Warehouse {
  final String id;
  final String name;
  final String note;
  final bool isDefault;
  final bool archived;
  final int sortOrder;
  final String ts;
  const Warehouse({required this.id, this.name = '', this.note = '', this.isDefault = false,
    this.archived = false, this.sortOrder = 0, this.ts = ''});
  factory Warehouse.fromMap(String id, Map<String, dynamic> m) => Warehouse(
        id: id, name: _s(m['name']), note: _s(m['note']), isDefault: _b(m['isDefault']),
        archived: _b(m['archived']), sortOrder: _i(m['sortOrder']), ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'name': name, 'note': note, 'isDefault': isDefault, 'archived': archived,
        'sortOrder': sortOrder, 'ts': ts,
      };
  Warehouse copyWith({String? name, String? note, bool? isDefault, bool? archived}) => Warehouse(
        id: id, name: name ?? this.name, note: note ?? this.note,
        isDefault: isDefault ?? this.isDefault, archived: archived ?? this.archived,
        sortOrder: sortOrder, ts: ts);
}

/* ---------------- Phase F · F2 types (web/lib/types.ts) ---------------- */

class Supplier {
  final String id;
  final String name;
  final String phone;
  final String company;
  final String notes;
  final String ts;
  const Supplier({required this.id, this.name = '', this.phone = '', this.company = '', this.notes = '', this.ts = ''});
  factory Supplier.fromMap(String id, Map<String, dynamic> m) => Supplier(
        id: id, name: _s(m['name']), phone: _s(m['phone']), company: _s(m['company']),
        notes: _s(m['notes']), ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {'name': name, 'phone': phone, 'company': company, 'notes': notes, 'ts': ts};
}

class SupplierPayment {
  final String id;
  final String supplierId;
  final double amount;
  final String method; // cash | jazzcash | easypaisa | bank
  final String? accountId;
  final String? kind; // "reversal" on a bounced cheque's compensating row
  final String? instrument; // "cheque"
  final String? chequeId;
  final String? voucherNo; // PV-n stamp (B6)
  final String note;
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const SupplierPayment({required this.id, required this.supplierId, this.amount = 0, this.method = 'cash',
    this.accountId, this.kind, this.instrument, this.chequeId, this.voucherNo, this.note = '',
    this.dayOffset = 0, this.ts = '', this.originDevice});
  factory SupplierPayment.fromMap(String id, Map<String, dynamic> m) => SupplierPayment(
        id: id, supplierId: _s(m['supplierId']), amount: _d(m['amount']), method: _s(m['method'], 'cash'),
        accountId: _sn(m['accountId']), kind: _sn(m['kind']), instrument: _sn(m['instrument']),
        chequeId: _sn(m['chequeId']), voucherNo: _sn(m['voucherNo']), note: _s(m['note']),
        dayOffset: _i(m['dayOffset']), ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'supplierId': supplierId, 'amount': amount, 'method': method, 'accountId': accountId,
        if (kind != null) 'kind': kind,
        if (instrument != null) 'instrument': instrument,
        if (chequeId != null) 'chequeId': chequeId,
        if (voucherNo != null) 'voucherNo': voucherNo,
        'note': note, 'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
}

class Expense {
  final String id;
  final String category; // rent | electricity | salary | transport | other
  final double amount;
  final String method; // cash | jazzcash | easypaisa | bank
  final String? accountId;
  final String? instrument; // "cheque"
  final String? chequeId;
  final String note;
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const Expense({required this.id, this.category = 'other', this.amount = 0, this.method = 'cash',
    this.accountId, this.instrument, this.chequeId, this.note = '', this.dayOffset = 0, this.ts = '', this.originDevice});
  factory Expense.fromMap(String id, Map<String, dynamic> m) => Expense(
        id: id, category: _s(m['category'], 'other'), amount: _d(m['amount']), method: _s(m['method'], 'cash'),
        accountId: _sn(m['accountId']), instrument: _sn(m['instrument']), chequeId: _sn(m['chequeId']),
        note: _s(m['note']), dayOffset: _i(m['dayOffset']), ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'category': category, 'amount': amount, 'method': method, 'accountId': accountId,
        if (instrument != null) 'instrument': instrument,
        if (chequeId != null) 'chequeId': chequeId,
        'note': note, 'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
  Expense copyWith({String? category, double? amount, String? method, String? accountId, String? note, int? dayOffset, String? ts}) => Expense(
        id: id, category: category ?? this.category, amount: amount ?? this.amount, method: method ?? this.method,
        accountId: accountId ?? this.accountId, instrument: instrument, chequeId: chequeId,
        note: note ?? this.note, dayOffset: dayOffset ?? this.dayOffset, ts: ts ?? this.ts, originDevice: originDevice);
}

class CashEntry {
  final String id;
  final String kind; // "in" | "out" | "transfer"
  final double amount;
  final String method; // GL bucket: "cash" | "wallet"
  final String? accountId;
  final String? fromAccountId;
  final String? toAccountId;
  final String note;
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const CashEntry({required this.id, this.kind = 'in', this.amount = 0, this.method = 'cash',
    this.accountId, this.fromAccountId, this.toAccountId, this.note = '', this.dayOffset = 0, this.ts = '', this.originDevice});
  factory CashEntry.fromMap(String id, Map<String, dynamic> m) => CashEntry(
        id: id, kind: _s(m['kind'], 'in'), amount: _d(m['amount']), method: _s(m['method'], 'cash'),
        accountId: _sn(m['accountId']), fromAccountId: _sn(m['fromAccountId']), toAccountId: _sn(m['toAccountId']),
        note: _s(m['note']), dayOffset: _i(m['dayOffset']), ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'kind': kind, 'amount': amount, 'method': method, 'accountId': accountId,
        if (fromAccountId != null) 'fromAccountId': fromAccountId,
        if (toAccountId != null) 'toAccountId': toAccountId,
        'note': note, 'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
}

class DocLine {
  final String productId;
  final String name; // snapshot
  final double qty;
  final double unitPrice; // the AGREED price
  final double total; // qty × unitPrice
  final String? sourceProductId;
  const DocLine({required this.productId, this.name = '', this.qty = 0, this.unitPrice = 0, this.total = 0, this.sourceProductId});
  factory DocLine.fromMap(Map<String, dynamic> m) => DocLine(
        productId: _s(m['productId']), name: _s(m['name']), qty: _d(m['qty']),
        unitPrice: _d(m['unitPrice']), total: _d(m['total']), sourceProductId: _sn(m['sourceProductId']),
      );
  Map<String, dynamic> toMap() => {
        'productId': productId, 'name': name, 'qty': qty, 'unitPrice': unitPrice, 'total': total,
        if (sourceProductId != null) 'sourceProductId': sourceProductId,
      };
  DocLine copyWith({double? qty, String? sourceProductId}) => DocLine(
        productId: productId, name: name, qty: qty ?? this.qty, unitPrice: unitPrice,
        total: (qty ?? this.qty) * unitPrice, sourceProductId: sourceProductId ?? this.sourceProductId);
}

class Quotation {
  final String id;
  final String? number; // QT-n once issued; null while draft
  final String? customerId;
  final String customerName;
  final String customerPhone;
  final List<DocLine> lines;
  final double subtotal;
  final String discountType;
  final double discountValue;
  final double discountAmount;
  final double estimatedTax; // display-only estimate, never posted
  final double total;
  final String? validUntil;
  final String note;
  final String status; // draft|issued|accepted|rejected|converted|cancelled
  final String? issuedTs;
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const Quotation({required this.id, this.number, this.customerId, this.customerName = '', this.customerPhone = '',
    this.lines = const [], this.subtotal = 0, this.discountType = 'flat', this.discountValue = 0,
    this.discountAmount = 0, this.estimatedTax = 0, this.total = 0, this.validUntil, this.note = '',
    this.status = 'draft', this.issuedTs, this.dayOffset = 0, this.ts = '', this.originDevice});
  factory Quotation.fromMap(String id, Map<String, dynamic> m) => Quotation(
        id: id, number: _sn(m['number']), customerId: _sn(m['customerId']),
        customerName: _s(m['customerName']), customerPhone: _s(m['customerPhone']),
        lines: (m['lines'] is List) ? (m['lines'] as List).whereType<Map>().map((e) => DocLine.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        subtotal: _d(m['subtotal']), discountType: _s(m['discountType'], 'flat'), discountValue: _d(m['discountValue']),
        discountAmount: _d(m['discountAmount']), estimatedTax: _d(m['estimatedTax']), total: _d(m['total']),
        validUntil: _sn(m['validUntil']), note: _s(m['note']), status: _s(m['status'], 'draft'),
        issuedTs: _sn(m['issuedTs']), dayOffset: _i(m['dayOffset']), ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'number': number, 'customerId': customerId, 'customerName': customerName, 'customerPhone': customerPhone,
        'lines': lines.map((e) => e.toMap()).toList(), 'subtotal': subtotal, 'discountType': discountType,
        'discountValue': discountValue, 'discountAmount': discountAmount, 'estimatedTax': estimatedTax,
        'total': total, 'validUntil': validUntil, 'note': note, 'status': status, 'issuedTs': issuedTs,
        'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
  Quotation copyWith({String? number, String? status, String? issuedTs}) => Quotation(
        id: id, number: number ?? this.number, customerId: customerId, customerName: customerName,
        customerPhone: customerPhone, lines: lines, subtotal: subtotal, discountType: discountType,
        discountValue: discountValue, discountAmount: discountAmount, estimatedTax: estimatedTax,
        total: total, validUntil: validUntil, note: note, status: status ?? this.status,
        issuedTs: issuedTs ?? this.issuedTs, dayOffset: dayOffset, ts: ts, originDevice: originDevice);
}

class SaleOrder {
  final String id;
  final String? number; // SO-n once confirmed; null while draft
  final String? customerId;
  final String customerName;
  final String customerPhone;
  final List<DocLine> lines;
  final double subtotal;
  final String discountType;
  final double discountValue;
  final double discountAmount;
  final double estimatedTax;
  final double total;
  final ({String type, String id})? source; // {type: "quotation", id}
  /// Phase H · H3/H4 (design §2.5): the storefront linkage — set
  /// on orders born by converting a public inbox order. The
  /// journal never sees it; it traces the order back to the
  /// public paper it came from. Null on every other order.
  final String? sourceType; // "storefront"
  final String? sourceOrderId;
  final String? expectedDate;
  final String? warehouseId;
  final String note;
  final String status; // draft|open|partially_fulfilled|fulfilled|cancelled
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const SaleOrder({required this.id, this.number, this.customerId, this.customerName = '', this.customerPhone = '',
    this.lines = const [], this.subtotal = 0, this.discountType = 'flat', this.discountValue = 0,
    this.discountAmount = 0, this.estimatedTax = 0, this.total = 0, this.source, this.sourceType,
    this.sourceOrderId, this.expectedDate,
    this.warehouseId, this.note = '', this.status = 'draft', this.dayOffset = 0, this.ts = '', this.originDevice});
  factory SaleOrder.fromMap(String id, Map<String, dynamic> m) => SaleOrder(
        id: id, number: _sn(m['number']), customerId: _sn(m['customerId']),
        customerName: _s(m['customerName']), customerPhone: _s(m['customerPhone']),
        lines: (m['lines'] is List) ? (m['lines'] as List).whereType<Map>().map((e) => DocLine.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        subtotal: _d(m['subtotal']), discountType: _s(m['discountType'], 'flat'), discountValue: _d(m['discountValue']),
        discountAmount: _d(m['discountAmount']), estimatedTax: _d(m['estimatedTax']), total: _d(m['total']),
        source: (m['source'] is Map) ? (type: _s((m['source'] as Map)['type']), id: _s((m['source'] as Map)['id'])) : null,
        sourceType: _sn(m['sourceType']), sourceOrderId: _sn(m['sourceOrderId']),
        expectedDate: _sn(m['expectedDate']), warehouseId: _sn(m['warehouseId']),
        note: _s(m['note']), status: _s(m['status'], 'draft'),
        dayOffset: _i(m['dayOffset']), ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'number': number, 'customerId': customerId, 'customerName': customerName, 'customerPhone': customerPhone,
        'lines': lines.map((e) => e.toMap()).toList(), 'subtotal': subtotal, 'discountType': discountType,
        'discountValue': discountValue, 'discountAmount': discountAmount, 'estimatedTax': estimatedTax,
        'total': total,
        'source': source == null ? null : {'type': source!.type, 'id': source!.id},
        if (sourceType != null) 'sourceType': sourceType,
        if (sourceOrderId != null) 'sourceOrderId': sourceOrderId,
        'expectedDate': expectedDate, 'warehouseId': warehouseId, 'note': note, 'status': status,
        'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
  SaleOrder copyWith({String? number, String? status}) => SaleOrder(
        id: id, number: number ?? this.number, customerId: customerId, customerName: customerName,
        customerPhone: customerPhone, lines: lines, subtotal: subtotal, discountType: discountType,
        discountValue: discountValue, discountAmount: discountAmount, estimatedTax: estimatedTax,
        total: total, source: source, sourceType: sourceType, sourceOrderId: sourceOrderId,
        expectedDate: expectedDate, warehouseId: warehouseId,
        note: note, status: status ?? this.status, dayOffset: dayOffset, ts: ts, originDevice: originDevice);
}

class DeliveryChallan {
  final String id;
  final String? number; // DC-n once dispatched; null while draft
  final String? orderId;
  final String? customerId;
  final String customerName;
  final String customerPhone;
  final List<DocLine> lines; // quantities only — a challan carries NO totals
  final String vehicleNo;
  final String driverName;
  final String? warehouseId;
  final String note;
  final String status; // draft|dispatched|partially_billed|billed|cancelled
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const DeliveryChallan({required this.id, this.number, this.orderId, this.customerId, this.customerName = '',
    this.customerPhone = '', this.lines = const [], this.vehicleNo = '', this.driverName = '',
    this.warehouseId, this.note = '', this.status = 'draft', this.dayOffset = 0, this.ts = '', this.originDevice});
  factory DeliveryChallan.fromMap(String id, Map<String, dynamic> m) => DeliveryChallan(
        id: id, number: _sn(m['number']), orderId: _sn(m['orderId']), customerId: _sn(m['customerId']),
        customerName: _s(m['customerName']), customerPhone: _s(m['customerPhone']),
        lines: (m['lines'] is List) ? (m['lines'] as List).whereType<Map>().map((e) => DocLine.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        vehicleNo: _s(m['vehicleNo']), driverName: _s(m['driverName']), warehouseId: _sn(m['warehouseId']),
        note: _s(m['note']), status: _s(m['status'], 'draft'),
        dayOffset: _i(m['dayOffset']), ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'number': number, 'orderId': orderId, 'customerId': customerId, 'customerName': customerName,
        'customerPhone': customerPhone, 'lines': lines.map((e) => e.toMap()).toList(),
        'vehicleNo': vehicleNo, 'driverName': driverName, 'warehouseId': warehouseId, 'note': note,
        'status': status, 'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
  DeliveryChallan copyWith({String? number, String? status}) => DeliveryChallan(
        id: id, number: number ?? this.number, orderId: orderId, customerId: customerId,
        customerName: customerName, customerPhone: customerPhone, lines: lines, vehicleNo: vehicleNo,
        driverName: driverName, warehouseId: warehouseId, note: note, status: status ?? this.status,
        dayOffset: dayOffset, ts: ts, originDevice: originDevice);
}

class PoLine {
  final String productId;
  final String name;
  final double qty;
  final double unitCost; // agreed cost
  final double total;
  const PoLine({required this.productId, this.name = '', this.qty = 0, this.unitCost = 0, this.total = 0});
  factory PoLine.fromMap(Map<String, dynamic> m) => PoLine(
        productId: _s(m['productId']), name: _s(m['name']), qty: _d(m['qty']),
        unitCost: _d(m['unitCost']), total: _d(m['total']),
      );
  Map<String, dynamic> toMap() => {'productId': productId, 'name': name, 'qty': qty, 'unitCost': unitCost, 'total': total};
}

class PurchaseOrder {
  final String id;
  final String? number; // PO-n once issued; null while draft
  final String supplierId;
  final String supplierName; // snapshot
  final List<PoLine> lines;
  final double total; // estimate — tax resolves at receipt
  final String? expectedDate;
  final String? warehouseId;
  final String note;
  final String status; // draft|issued|partially_received|received|cancelled
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const PurchaseOrder({required this.id, this.number, required this.supplierId, this.supplierName = '',
    this.lines = const [], this.total = 0, this.expectedDate, this.warehouseId, this.note = '',
    this.status = 'draft', this.dayOffset = 0, this.ts = '', this.originDevice});
  factory PurchaseOrder.fromMap(String id, Map<String, dynamic> m) => PurchaseOrder(
        id: id, number: _sn(m['number']), supplierId: _s(m['supplierId']), supplierName: _s(m['supplierName']),
        lines: (m['lines'] is List) ? (m['lines'] as List).whereType<Map>().map((e) => PoLine.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        total: _d(m['total']), expectedDate: _sn(m['expectedDate']), warehouseId: _sn(m['warehouseId']),
        note: _s(m['note']), status: _s(m['status'], 'draft'),
        dayOffset: _i(m['dayOffset']), ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'number': number, 'supplierId': supplierId, 'supplierName': supplierName,
        'lines': lines.map((e) => e.toMap()).toList(), 'total': total, 'expectedDate': expectedDate,
        'warehouseId': warehouseId, 'note': note, 'status': status, 'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
  PurchaseOrder copyWith({String? number, String? status}) => PurchaseOrder(
        id: id, number: number ?? this.number, supplierId: supplierId, supplierName: supplierName,
        lines: lines, total: total, expectedDate: expectedDate, warehouseId: warehouseId, note: note,
        status: status ?? this.status, dayOffset: dayOffset, ts: ts, originDevice: originDevice);
}

class DocNote {
  final String id;
  final String number; // CN-n / DN-n — minted at posting, never null
  final String kind; // "credit" | "debit"
  final String? returnId;
  final String? billId;
  final int? billNo;
  final String? purchaseId;
  final String? partyId;
  final String partyName;
  final List<BillItem> items; // the return engine's stamped lines
  final double goodsAmount;
  final double taxAmount;
  final double total;
  final String settlement; // cash_refund | credit_reduction | payable_offset
  final String journalEntryId;
  final String reason;
  final String status; // always "posted" — notes are born posted
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const DocNote({required this.id, required this.number, required this.kind, this.returnId, this.billId,
    this.billNo, this.purchaseId, this.partyId, this.partyName = '', this.items = const [],
    this.goodsAmount = 0, this.taxAmount = 0, this.total = 0, this.settlement = 'cash_refund',
    this.journalEntryId = '', this.reason = '', this.status = 'posted', this.dayOffset = 0, this.ts = '', this.originDevice});
  factory DocNote.fromMap(String id, Map<String, dynamic> m) => DocNote(
        id: id, number: _s(m['number']), kind: _s(m['kind'], 'credit'), returnId: _sn(m['returnId']),
        billId: _sn(m['billId']), billNo: m['billNo'] is num ? _i(m['billNo']) : null,
        purchaseId: _sn(m['purchaseId']), partyId: _sn(m['partyId']), partyName: _s(m['partyName']),
        items: (m['items'] is List) ? (m['items'] as List).whereType<Map>().map((e) => BillItem.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        goodsAmount: _d(m['goodsAmount']), taxAmount: _d(m['taxAmount']), total: _d(m['total']),
        settlement: _s(m['settlement'], 'cash_refund'), journalEntryId: _s(m['journalEntryId']),
        reason: _s(m['reason']), status: _s(m['status'], 'posted'),
        dayOffset: _i(m['dayOffset']), ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'number': number, 'kind': kind, 'returnId': returnId, 'billId': billId, 'billNo': billNo,
        'purchaseId': purchaseId, 'partyId': partyId, 'partyName': partyName,
        'items': items.map((e) => e.toMap()).toList(), 'goodsAmount': goodsAmount,
        'taxAmount': taxAmount, 'total': total, 'settlement': settlement,
        'journalEntryId': journalEntryId, 'reason': reason, 'status': status,
        'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
}

class PurchaseReturn {
  final String id;
  final String purchaseId;
  final String supplierId;
  final List<PurchaseItem> items; // tax shares stamped
  final double payableOffset;
  final double refundAmount;
  final String? method; // refund leg method; null for offset
  final String? accountId;
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const PurchaseReturn({required this.id, required this.purchaseId, required this.supplierId,
    this.items = const [], this.payableOffset = 0, this.refundAmount = 0, this.method,
    this.accountId, this.dayOffset = 0, this.ts = '', this.originDevice});
  factory PurchaseReturn.fromMap(String id, Map<String, dynamic> m) => PurchaseReturn(
        id: id, purchaseId: _s(m['purchaseId']), supplierId: _s(m['supplierId']),
        items: (m['items'] is List) ? (m['items'] as List).whereType<Map>().map((e) => PurchaseItem.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        payableOffset: _d(m['payableOffset']), refundAmount: _d(m['refundAmount']),
        method: _sn(m['method']), accountId: _sn(m['accountId']),
        dayOffset: _i(m['dayOffset']), ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'purchaseId': purchaseId, 'supplierId': supplierId, 'items': items.map((e) => e.toMap()).toList(),
        'payableOffset': payableOffset, 'refundAmount': refundAmount, 'method': method,
        'accountId': accountId, 'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
}

class Cheque {
  final String id;
  final String direction; // "in" | "out"
  final String chequeNo;
  final String bankName;
  final double amount;
  final String issueDateISO;
  final String dueDateISO;
  final String? partyId;
  final String partyName;
  final String partyKind; // customer | supplier | expense | other
  final String status; // received|deposited|issued|cleared|bounced|returned
  final String sourceType; // bill | repayment | supplier_payment | expense
  final String sourceId;
  final String? accountId; // in: chosen at deposit; out: drawn-on, at issue
  final double chargesOnBounce;
  final Map<String, String?> entryIds; // captured/deposited(null)/cleared/bounced/returned
  final String note;
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const Cheque({required this.id, this.direction = 'in', this.chequeNo = '', this.bankName = '',
    this.amount = 0, this.issueDateISO = '', this.dueDateISO = '', this.partyId, this.partyName = '',
    this.partyKind = 'other', this.status = 'received', this.sourceType = '', this.sourceId = '',
    this.accountId, this.chargesOnBounce = 0, this.entryIds = const {}, this.note = '',
    this.dayOffset = 0, this.ts = '', this.originDevice});
  factory Cheque.fromMap(String id, Map<String, dynamic> m) => Cheque(
        id: id, direction: _s(m['direction'], 'in'), chequeNo: _s(m['chequeNo']), bankName: _s(m['bankName']),
        amount: _d(m['amount']), issueDateISO: _s(m['issueDateISO']), dueDateISO: _s(m['dueDateISO']),
        partyId: _sn(m['partyId']), partyName: _s(m['partyName']), partyKind: _s(m['partyKind'], 'other'),
        status: _s(m['status'], 'received'), sourceType: _s(m['sourceType']), sourceId: _s(m['sourceId']),
        accountId: _sn(m['accountId']), chargesOnBounce: _d(m['chargesOnBounce']),
        entryIds: (m['entryIds'] is Map) ? (m['entryIds'] as Map).map((k, v) => MapEntry(k.toString(), v?.toString())) : const {},
        note: _s(m['note']), dayOffset: _i(m['dayOffset']), ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'direction': direction, 'chequeNo': chequeNo, 'bankName': bankName, 'amount': amount,
        'issueDateISO': issueDateISO, 'dueDateISO': dueDateISO, 'partyId': partyId,
        'partyName': partyName, 'partyKind': partyKind, 'status': status, 'sourceType': sourceType,
        'sourceId': sourceId, 'accountId': accountId, 'chargesOnBounce': chargesOnBounce,
        'entryIds': entryIds, 'note': note, 'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
  Cheque copyWith({String? status, String? accountId, double? chargesOnBounce, Map<String, String?>? entryIds, double? amount}) => Cheque(
        id: id, direction: direction, chequeNo: chequeNo, bankName: bankName, amount: amount ?? this.amount,
        issueDateISO: issueDateISO, dueDateISO: dueDateISO, partyId: partyId, partyName: partyName,
        partyKind: partyKind, status: status ?? this.status, sourceType: sourceType, sourceId: sourceId,
        accountId: accountId ?? this.accountId, chargesOnBounce: chargesOnBounce ?? this.chargesOnBounce,
        entryIds: entryIds ?? this.entryIds, note: note, dayOffset: dayOffset, ts: ts, originDevice: originDevice);
}

/* ---------------- Phase F · F3 types (web/lib/types.ts, Phase C) ---------------- */

class StockTransferLine {
  final String productId;
  final String name; // snapshot
  final double qtySent;
  final double qtyReceived; // written ONLY by receive actions (§2.2)
  const StockTransferLine({required this.productId, this.name = '', this.qtySent = 0, this.qtyReceived = 0});
  factory StockTransferLine.fromMap(Map<String, dynamic> m) => StockTransferLine(
        productId: _s(m['productId']), name: _s(m['name']),
        qtySent: _d(m['qtySent']), qtyReceived: _d(m['qtyReceived']),
      );
  Map<String, dynamic> toMap() => {
        'productId': productId, 'name': name, 'qtySent': qtySent, 'qtyReceived': qtyReceived,
      };
  StockTransferLine copyWith({double? qtyReceived}) => StockTransferLine(
        productId: productId, name: name, qtySent: qtySent, qtyReceived: qtyReceived ?? this.qtyReceived);
}

class StockTransfer {
  final String id;
  final String? number; // "TR-4" once dispatched; null in draft (§6.3)
  final String fromWarehouseId;
  final String toWarehouseId;
  final List<StockTransferLine> lines;
  final String note;
  final String status; // draft|dispatched|partially_received|received|returned|cancelled
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const StockTransfer({required this.id, this.number, required this.fromWarehouseId,
    required this.toWarehouseId, this.lines = const [], this.note = '', this.status = 'draft',
    this.dayOffset = 0, this.ts = '', this.originDevice});
  factory StockTransfer.fromMap(String id, Map<String, dynamic> m) => StockTransfer(
        id: id, number: _sn(m['number']), fromWarehouseId: _s(m['fromWarehouseId']),
        toWarehouseId: _s(m['toWarehouseId']),
        lines: (m['lines'] is List) ? (m['lines'] as List).whereType<Map>().map((e) => StockTransferLine.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        note: _s(m['note']), status: _s(m['status'], 'draft'), dayOffset: _i(m['dayOffset']),
        ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'number': number, 'fromWarehouseId': fromWarehouseId, 'toWarehouseId': toWarehouseId,
        'lines': lines.map((e) => e.toMap()).toList(), 'note': note, 'status': status,
        'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
  StockTransfer copyWith({String? number, String? fromWarehouseId, String? toWarehouseId,
      List<StockTransferLine>? lines, String? note, String? status}) => StockTransfer(
        id: id, number: number ?? this.number,
        fromWarehouseId: fromWarehouseId ?? this.fromWarehouseId,
        toWarehouseId: toWarehouseId ?? this.toWarehouseId,
        lines: lines ?? this.lines, note: note ?? this.note, status: status ?? this.status,
        dayOffset: dayOffset, ts: ts, originDevice: originDevice);
}

class BomLine {
  final String productId;
  final String name; // snapshot
  final double qty; // consumed per batch of outputQty
  const BomLine({required this.productId, this.name = '', this.qty = 0});
  factory BomLine.fromMap(Map<String, dynamic> m) => BomLine(
        productId: _s(m['productId']), name: _s(m['name']), qty: _d(m['qty']),
      );
  Map<String, dynamic> toMap() => {'productId': productId, 'name': name, 'qty': qty};
}

class Bom {
  final String id;
  final String outputProductId;
  final String outputName; // snapshot
  final double outputQty;
  final int version;
  final List<BomLine> lines;
  final double labourCost;
  final double overheadCost;
  final bool active; // exactly one active BOM per output product
  final String note;
  final String ts;
  const Bom({required this.id, required this.outputProductId, this.outputName = '',
    this.outputQty = 1, this.version = 1, this.lines = const [], this.labourCost = 0,
    this.overheadCost = 0, this.active = false, this.note = '', this.ts = ''});
  factory Bom.fromMap(String id, Map<String, dynamic> m) => Bom(
        id: id, outputProductId: _s(m['outputProductId']), outputName: _s(m['outputName']),
        outputQty: _d(m['outputQty'], 1), version: _i(m['version'], 1),
        lines: (m['lines'] is List) ? (m['lines'] as List).whereType<Map>().map((e) => BomLine.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        labourCost: _d(m['labourCost']), overheadCost: _d(m['overheadCost']),
        active: _b(m['active']), note: _s(m['note']), ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'outputProductId': outputProductId, 'outputName': outputName, 'outputQty': outputQty,
        'version': version, 'lines': lines.map((e) => e.toMap()).toList(),
        'labourCost': labourCost, 'overheadCost': overheadCost, 'active': active,
        'note': note, 'ts': ts,
      };
  Bom copyWith({bool? active}) => Bom(
        id: id, outputProductId: outputProductId, outputName: outputName, outputQty: outputQty,
        version: version, lines: lines, labourCost: labourCost, overheadCost: overheadCost,
        active: active ?? this.active, note: note, ts: ts);
}

/// The recipe snapshot a production order is born with (§4.2/§3.2):
/// a deep copy of one BOM version's economics.
class BomSnapshot {
  final double outputQty;
  final List<BomLine> lines;
  final double labourCost;
  final double overheadCost;
  const BomSnapshot({this.outputQty = 1, this.lines = const [], this.labourCost = 0, this.overheadCost = 0});
  factory BomSnapshot.fromMap(Map<String, dynamic> m) => BomSnapshot(
        outputQty: _d(m['outputQty'], 1),
        lines: (m['lines'] is List) ? (m['lines'] as List).whereType<Map>().map((e) => BomLine.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        labourCost: _d(m['labourCost']), overheadCost: _d(m['overheadCost']),
      );
  Map<String, dynamic> toMap() => {
        'outputQty': outputQty, 'lines': lines.map((e) => e.toMap()).toList(),
        'labourCost': labourCost, 'overheadCost': overheadCost,
      };
}

class ProductionEventLine {
  final String productId;
  final String name;
  final double qty;
  final double unitCost;
  final double value;
  const ProductionEventLine({required this.productId, this.name = '', this.qty = 0, this.unitCost = 0, this.value = 0});
  factory ProductionEventLine.fromMap(Map<String, dynamic> m) => ProductionEventLine(
        productId: _s(m['productId']), name: _s(m['name']), qty: _d(m['qty']),
        unitCost: _d(m['unitCost']), value: _d(m['value']),
      );
  Map<String, dynamic> toMap() => {
        'productId': productId, 'name': name, 'qty': qty, 'unitCost': unitCost, 'value': value,
      };
}

class ProductionEvent {
  final String kind; // issue | completion | scrap | closeout
  final double qty; // finished-unit terms for completion/scrap; 0 for issue/closeout
  final List<ProductionEventLine>? lines; // issue only
  final double? labourCost; // issue only
  final double? overheadCost; // issue only
  final String? paidFromAccountId; // issue only: account id | "accrue" | null
  final double value; // the journal value this event moved
  final String entryId; // the ONE journal entry that posted it
  final int dayOffset;
  final String ts;
  const ProductionEvent({required this.kind, this.qty = 0, this.lines, this.labourCost,
    this.overheadCost, this.paidFromAccountId, this.value = 0, this.entryId = '',
    this.dayOffset = 0, this.ts = ''});
  factory ProductionEvent.fromMap(Map<String, dynamic> m) => ProductionEvent(
        kind: _s(m['kind']), qty: _d(m['qty']),
        lines: (m['lines'] is List) ? (m['lines'] as List).whereType<Map>().map((e) => ProductionEventLine.fromMap(Map<String, dynamic>.from(e))).toList() : null,
        labourCost: m['labourCost'] is num ? _d(m['labourCost']) : null,
        overheadCost: m['overheadCost'] is num ? _d(m['overheadCost']) : null,
        paidFromAccountId: _sn(m['paidFromAccountId']),
        value: _d(m['value']), entryId: _s(m['entryId']),
        dayOffset: _i(m['dayOffset']), ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'kind': kind, 'qty': qty,
        if (lines != null) 'lines': lines!.map((e) => e.toMap()).toList(),
        if (labourCost != null) 'labourCost': labourCost,
        if (overheadCost != null) 'overheadCost': overheadCost,
        'paidFromAccountId': paidFromAccountId,
        'value': value, 'entryId': entryId, 'dayOffset': dayOffset, 'ts': ts,
      };
}

class ProductionOrder {
  final String id;
  final String? number; // "PR-3" once opened; null in draft (§6.3)
  final String bomId;
  final int bomVersion;
  final BomSnapshot bomSnapshot;
  final String outputProductId;
  final String outputName; // snapshot
  final String warehouseId; // ONE warehouse: materials out, finished in (§4.5)
  final double plannedQty;
  final List<ProductionEvent> events; // the order's subledger — append-only
  final String note;
  final String status; // draft | open | completed | cancelled
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const ProductionOrder({required this.id, this.number, this.bomId = '', this.bomVersion = 1,
    this.bomSnapshot = const BomSnapshot(), required this.outputProductId, this.outputName = '',
    required this.warehouseId, this.plannedQty = 0, this.events = const [], this.note = '',
    this.status = 'draft', this.dayOffset = 0, this.ts = '', this.originDevice});
  factory ProductionOrder.fromMap(String id, Map<String, dynamic> m) => ProductionOrder(
        id: id, number: _sn(m['number']), bomId: _s(m['bomId']), bomVersion: _i(m['bomVersion'], 1),
        bomSnapshot: (m['bomSnapshot'] is Map) ? BomSnapshot.fromMap(Map<String, dynamic>.from(m['bomSnapshot'] as Map)) : const BomSnapshot(),
        outputProductId: _s(m['outputProductId']), outputName: _s(m['outputName']),
        warehouseId: _s(m['warehouseId']), plannedQty: _d(m['plannedQty']),
        events: (m['events'] is List) ? (m['events'] as List).whereType<Map>().map((e) => ProductionEvent.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        note: _s(m['note']), status: _s(m['status'], 'draft'), dayOffset: _i(m['dayOffset']),
        ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'number': number, 'bomId': bomId, 'bomVersion': bomVersion,
        'bomSnapshot': bomSnapshot.toMap(), 'outputProductId': outputProductId,
        'outputName': outputName, 'warehouseId': warehouseId, 'plannedQty': plannedQty,
        'events': events.map((e) => e.toMap()).toList(), 'note': note, 'status': status,
        'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
  ProductionOrder copyWith({String? number, String? warehouseId, double? plannedQty,
      List<ProductionEvent>? events, String? note, String? status}) => ProductionOrder(
        id: id, number: number ?? this.number, bomId: bomId, bomVersion: bomVersion,
        bomSnapshot: bomSnapshot, outputProductId: outputProductId, outputName: outputName,
        warehouseId: warehouseId ?? this.warehouseId, plannedQty: plannedQty ?? this.plannedQty,
        events: events ?? this.events, note: note ?? this.note, status: status ?? this.status,
        dayOffset: dayOffset, ts: ts, originDevice: originDevice);
}

class JobMaterialEvent {
  final String kind; // issue | return
  final String productId;
  final String name; // snapshot
  final double qty;
  final double unitCost; // shelf cost snapshot at the event
  final double value;
  final String entryId; // the ONE journal entry that posted it
  final int dayOffset;
  final String ts;
  const JobMaterialEvent({required this.kind, required this.productId, this.name = '',
    this.qty = 0, this.unitCost = 0, this.value = 0, this.entryId = '', this.dayOffset = 0, this.ts = ''});
  factory JobMaterialEvent.fromMap(Map<String, dynamic> m) => JobMaterialEvent(
        kind: _s(m['kind']), productId: _s(m['productId']), name: _s(m['name']),
        qty: _d(m['qty']), unitCost: _d(m['unitCost']), value: _d(m['value']),
        entryId: _s(m['entryId']), dayOffset: _i(m['dayOffset']), ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'kind': kind, 'productId': productId, 'name': name, 'qty': qty,
        'unitCost': unitCost, 'value': value, 'entryId': entryId,
        'dayOffset': dayOffset, 'ts': ts,
      };
}

class Job {
  final String id;
  final String number; // "JB-7" — minted AT CREATION (§5.1)
  final String? customerId;
  final String customerName; // snapshot
  final String customerPhone; // snapshot
  final String title;
  final String description;
  final String stage; // the current stage NAME (settings jobStages, §5.2)
  final String status; // open | in_progress | ready | delivered | cancelled
  final String? dueDateISO;
  final String warehouseId; // materials are issued from here (§5.3)
  final List<JobMaterialEvent> materialEvents; // append-only subledger
  final double labourCost; // declared figure for profit — NON-posting (§5.3)
  final String note;
  final int dayOffset;
  final String ts;
  final String? originDevice;
  const Job({required this.id, required this.number, this.customerId, this.customerName = '',
    this.customerPhone = '', this.title = '', this.description = '', this.stage = '',
    this.status = 'open', this.dueDateISO, required this.warehouseId,
    this.materialEvents = const [], this.labourCost = 0, this.note = '',
    this.dayOffset = 0, this.ts = '', this.originDevice});
  factory Job.fromMap(String id, Map<String, dynamic> m) => Job(
        id: id, number: _s(m['number']), customerId: _sn(m['customerId']),
        customerName: _s(m['customerName']), customerPhone: _s(m['customerPhone']),
        title: _s(m['title']), description: _s(m['description']), stage: _s(m['stage']),
        status: _s(m['status'], 'open'), dueDateISO: _sn(m['dueDateISO']),
        warehouseId: _s(m['warehouseId']),
        materialEvents: (m['materialEvents'] is List) ? (m['materialEvents'] as List).whereType<Map>().map((e) => JobMaterialEvent.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        labourCost: _d(m['labourCost']), note: _s(m['note']), dayOffset: _i(m['dayOffset']),
        ts: _s(m['ts']), originDevice: _sn(m['originDevice']),
      );
  Map<String, dynamic> toMap() => {
        'number': number, 'customerId': customerId, 'customerName': customerName,
        'customerPhone': customerPhone, 'title': title, 'description': description,
        'stage': stage, 'status': status, 'dueDateISO': dueDateISO,
        'warehouseId': warehouseId, 'materialEvents': materialEvents.map((e) => e.toMap()).toList(),
        'labourCost': labourCost, 'note': note, 'dayOffset': dayOffset, 'ts': ts,
        if (originDevice != null) 'originDevice': originDevice,
      };
  Job copyWith({String? customerName, String? customerPhone, String? title, String? description,
      String? stage, String? status, String? dueDateISO, bool clearDueDate = false,
      String? warehouseId, List<JobMaterialEvent>? materialEvents, double? labourCost,
      String? note}) => Job(
        id: id, number: number, customerId: customerId,
        customerName: customerName ?? this.customerName,
        customerPhone: customerPhone ?? this.customerPhone,
        title: title ?? this.title, description: description ?? this.description,
        stage: stage ?? this.stage, status: status ?? this.status,
        dueDateISO: clearDueDate ? null : (dueDateISO ?? this.dueDateISO),
        warehouseId: warehouseId ?? this.warehouseId,
        materialEvents: materialEvents ?? this.materialEvents,
        labourCost: labourCost ?? this.labourCost, note: note ?? this.note,
        dayOffset: dayOffset, ts: ts, originDevice: originDevice);
}

/* ================================================================== */
/* Phase D · F4 — employees, attendance, payroll, loans, periods      */
/* ================================================================== */

/// A labelled money line on a payroll run line (an allowance or a
/// reducer deduction — design §2.3). Snapshotted onto the run.
class PayLine {
  final String label;
  final double amount;
  const PayLine({this.label = '', this.amount = 0});
  factory PayLine.fromMap(Map<String, dynamic> m) =>
      PayLine(label: _s(m['label']), amount: _d(m['amount']));
  Map<String, dynamic> toMap() => {'label': label, 'amount': amount};
  PayLine copyWith({String? label, double? amount}) =>
      PayLine(label: label ?? this.label, amount: amount ?? this.amount);
}

/// An employee (design §1.1): identity + CURRENT pay terms in a
/// collection of their own — NOT a login. Carries no balance:
/// positions derive from the journal (core/payroll.dart).
class Employee {
  final String id;
  final String name;
  final String phone;
  final String designation;
  final String? linkedUserEmail; // informational only (§1.1)
  final String? joinDateISO;
  final String payBasis; // monthly | daily
  final double baseAmount;
  final List<PayLine> allowances;
  final int paidLeaveDays;
  final bool active; // deactivated, never deleted (§1.5)
  final String note;
  final String ts;
  const Employee({required this.id, this.name = '', this.phone = '', this.designation = '',
    this.linkedUserEmail, this.joinDateISO, this.payBasis = 'monthly', this.baseAmount = 0,
    this.allowances = const [], this.paidLeaveDays = 0, this.active = true, this.note = '', this.ts = ''});
  factory Employee.fromMap(String id, Map<String, dynamic> m) => Employee(
        id: id, name: _s(m['name']), phone: _s(m['phone']), designation: _s(m['designation']),
        linkedUserEmail: _sn(m['linkedUserEmail']), joinDateISO: _sn(m['joinDateISO']),
        payBasis: _s(m['payBasis'], 'monthly'), baseAmount: _d(m['baseAmount']),
        allowances: (m['allowances'] is List) ? (m['allowances'] as List).whereType<Map>().map((e) => PayLine.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        paidLeaveDays: _i(m['paidLeaveDays']), active: _b(m['active'], true),
        note: _s(m['note']), ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'name': name, 'phone': phone, 'designation': designation,
        'linkedUserEmail': linkedUserEmail, 'joinDateISO': joinDateISO,
        'payBasis': payBasis, 'baseAmount': baseAmount,
        'allowances': allowances.map((e) => e.toMap()).toList(),
        'paidLeaveDays': paidLeaveDays, 'active': active, 'note': note, 'ts': ts,
      };
  Employee copyWith({String? name, String? phone, String? designation, String? linkedUserEmail,
      bool clearLinkedEmail = false, String? joinDateISO, bool clearJoinDate = false,
      String? payBasis, double? baseAmount, List<PayLine>? allowances, int? paidLeaveDays,
      bool? active, String? note}) => Employee(
        id: id, name: name ?? this.name, phone: phone ?? this.phone,
        designation: designation ?? this.designation,
        linkedUserEmail: clearLinkedEmail ? null : (linkedUserEmail ?? this.linkedUserEmail),
        joinDateISO: clearJoinDate ? null : (joinDateISO ?? this.joinDateISO),
        payBasis: payBasis ?? this.payBasis, baseAmount: baseAmount ?? this.baseAmount,
        allowances: allowances ?? this.allowances, paidLeaveDays: paidLeaveDays ?? this.paidLeaveDays,
        active: active ?? this.active, note: note ?? this.note, ts: ts);
}

/// One employee-month attendance doc (design §1.3). Deterministic
/// id `${employeeId}__${yyyyMm}`; sparse marks only — an unmarked
/// day asserts nothing and is never silently present.
class AttendanceMonth {
  final String id;
  final String employeeId;
  final String month; // "2026-10"
  final Map<String, String> days; // "1".."31" → present|absent|half|leave|off
  final String ts;
  const AttendanceMonth({required this.id, this.employeeId = '', this.month = '',
    this.days = const {}, this.ts = ''});
  factory AttendanceMonth.fromMap(String id, Map<String, dynamic> m) => AttendanceMonth(
        id: id, employeeId: _s(m['employeeId']), month: _s(m['month']),
        days: (m['days'] is Map) ? (m['days'] as Map).map((k, v) => MapEntry(k.toString(), v.toString())) : const {},
        ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'employeeId': employeeId, 'month': month, 'days': days, 'ts': ts,
      };
}

/// One employee's line on a payroll run (design §2.3) — a snapshot:
/// attendance counts, the §1.4 earned base, allowances, reducer
/// deductions; gross/net always derive via payrollLineTotals.
class PayrollRunLine {
  final String employeeId;
  final String name;
  final String payBasis; // monthly | daily (snapshot)
  final int daysInMonth;
  final int present;
  final int absent;
  final int half;
  final int leave;
  final int unpaidAbsent;
  final double earnedBase;
  final List<PayLine> allowances;
  final List<PayLine> deductions; // reducers — never journal (§2.5)
  final double gross;
  final double netAccrued;
  const PayrollRunLine({required this.employeeId, this.name = '', this.payBasis = 'monthly',
    this.daysInMonth = 0, this.present = 0, this.absent = 0, this.half = 0, this.leave = 0,
    this.unpaidAbsent = 0, this.earnedBase = 0, this.allowances = const [],
    this.deductions = const [], this.gross = 0, this.netAccrued = 0});
  factory PayrollRunLine.fromMap(Map<String, dynamic> m) => PayrollRunLine(
        employeeId: _s(m['employeeId']), name: _s(m['name']),
        payBasis: _s(m['payBasis'], 'monthly'), daysInMonth: _i(m['daysInMonth']),
        present: _i(m['present']), absent: _i(m['absent']), half: _i(m['half']),
        leave: _i(m['leave']), unpaidAbsent: _i(m['unpaidAbsent']),
        earnedBase: _d(m['earnedBase']),
        allowances: (m['allowances'] is List) ? (m['allowances'] as List).whereType<Map>().map((e) => PayLine.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        deductions: (m['deductions'] is List) ? (m['deductions'] as List).whereType<Map>().map((e) => PayLine.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        gross: _d(m['gross']), netAccrued: _d(m['netAccrued']),
      );
  Map<String, dynamic> toMap() => {
        'employeeId': employeeId, 'name': name, 'payBasis': payBasis,
        'daysInMonth': daysInMonth, 'present': present, 'absent': absent,
        'half': half, 'leave': leave, 'unpaidAbsent': unpaidAbsent,
        'earnedBase': earnedBase,
        'allowances': allowances.map((e) => e.toMap()).toList(),
        'deductions': deductions.map((e) => e.toMap()).toList(),
        'gross': gross, 'netAccrued': netAccrued,
      };
  PayrollRunLine copyWith({List<PayLine>? allowances, List<PayLine>? deductions,
      double? earnedBase, double? gross, double? netAccrued}) => PayrollRunLine(
        employeeId: employeeId, name: name, payBasis: payBasis,
        daysInMonth: daysInMonth, present: present, absent: absent, half: half,
        leave: leave, unpaidAbsent: unpaidAbsent,
        earnedBase: earnedBase ?? this.earnedBase,
        allowances: allowances ?? this.allowances, deductions: deductions ?? this.deductions,
        gross: gross ?? this.gross, netAccrued: netAccrued ?? this.netAccrued);
}

/// One payment event on a posted run (design §2.3) — append-only;
/// a reversal is a second event with a negative amount (§2.6).
class PayrollPaymentEvent {
  final String? employeeId; // null = settles the unassigned bucket (§2.2)
  final String name; // snapshot ("Production labour" for null)
  final double amount;
  final String method; // money methods only — never "credit"
  final String? accountId;
  final String entryId; // the ONE entry that posted it
  final int dayOffset;
  final String ts;
  const PayrollPaymentEvent({this.employeeId, this.name = '', this.amount = 0,
    this.method = 'cash', this.accountId, this.entryId = '', this.dayOffset = 0, this.ts = ''});
  factory PayrollPaymentEvent.fromMap(Map<String, dynamic> m) => PayrollPaymentEvent(
        employeeId: _sn(m['employeeId']), name: _s(m['name']), amount: _d(m['amount']),
        method: _s(m['method'], 'cash'), accountId: _sn(m['accountId']),
        entryId: _s(m['entryId']), dayOffset: _i(m['dayOffset']), ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'employeeId': employeeId, 'name': name, 'amount': amount, 'method': method,
        'accountId': accountId, 'entryId': entryId, 'dayOffset': dayOffset, 'ts': ts,
      };
  PayrollPaymentEvent copyWith({double? amount, String? entryId, String? ts}) =>
      PayrollPaymentEvent(
        employeeId: employeeId, name: name, amount: amount ?? this.amount,
        method: method, accountId: accountId, entryId: entryId ?? this.entryId,
        dayOffset: dayOffset, ts: ts ?? this.ts);
}

/// A payroll run for one calendar month (design §2.3). Drafts post
/// nothing; finalise mints PAY- and posts the ONE net accrual
/// entry; paid state derives, only the status label is cached.
class PayrollRun {
  final String id;
  final String? number; // "PAY-5" once finalised; drafts burn no numbers
  final String month; // "2026-10" — the month the run PAYS FOR
  final List<PayrollRunLine> lines;
  final ({double gross, double deductions, double netAccrued}) totals;
  final List<PayrollPaymentEvent> payments; // append-only
  final String? accrualEntryId;
  final String status; // draft | posted | reversed
  final String note;
  final int dayOffset;
  final String ts;
  const PayrollRun({required this.id, this.number, this.month = '', this.lines = const [],
    this.totals = (gross: 0, deductions: 0, netAccrued: 0), this.payments = const [],
    this.accrualEntryId, this.status = 'draft', this.note = '', this.dayOffset = 0, this.ts = ''});
  factory PayrollRun.fromMap(String id, Map<String, dynamic> m) {
    final t = (m['totals'] is Map) ? Map<String, dynamic>.from(m['totals'] as Map) : const <String, dynamic>{};
    return PayrollRun(
      id: id, number: _sn(m['number']), month: _s(m['month']),
      lines: (m['lines'] is List) ? (m['lines'] as List).whereType<Map>().map((e) => PayrollRunLine.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
      totals: (gross: _d(t['gross']), deductions: _d(t['deductions']), netAccrued: _d(t['netAccrued'])),
      payments: (m['payments'] is List) ? (m['payments'] as List).whereType<Map>().map((e) => PayrollPaymentEvent.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
      accrualEntryId: _sn(m['accrualEntryId']), status: _s(m['status'], 'draft'),
      note: _s(m['note']), dayOffset: _i(m['dayOffset']), ts: _s(m['ts']),
    );
  }
  Map<String, dynamic> toMap() => {
        'number': number, 'month': month,
        'lines': lines.map((e) => e.toMap()).toList(),
        'totals': {'gross': totals.gross, 'deductions': totals.deductions, 'netAccrued': totals.netAccrued},
        'payments': payments.map((e) => e.toMap()).toList(),
        'accrualEntryId': accrualEntryId, 'status': status, 'note': note,
        'dayOffset': dayOffset, 'ts': ts,
      };
  PayrollRun copyWith({String? number, List<PayrollRunLine>? lines,
      ({double gross, double deductions, double netAccrued})? totals,
      List<PayrollPaymentEvent>? payments, String? accrualEntryId, String? status,
      String? note}) => PayrollRun(
        id: id, number: number ?? this.number, month: month,
        lines: lines ?? this.lines, totals: totals ?? this.totals,
        payments: payments ?? this.payments,
        accrualEntryId: accrualEntryId ?? this.accrualEntryId,
        status: status ?? this.status, note: note ?? this.note,
        dayOffset: dayOffset, ts: ts);
}

/// One event in a loan's append-only diary (design §3.3) — the
/// attribution record; the journal carries the money truth.
class LoanEvent {
  final String kind; // drawdown | charge | repayment | fee | writeoff
  final double amount;
  final double principalPart;
  final double chargePart;
  final String? accountId;
  final String entryId;
  final int dayOffset;
  final String ts;
  const LoanEvent({required this.kind, this.amount = 0, this.principalPart = 0,
    this.chargePart = 0, this.accountId, this.entryId = '', this.dayOffset = 0, this.ts = ''});
  factory LoanEvent.fromMap(Map<String, dynamic> m) => LoanEvent(
        kind: _s(m['kind']), amount: _d(m['amount']),
        principalPart: _d(m['principalPart']), chargePart: _d(m['chargePart']),
        accountId: _sn(m['accountId']), entryId: _s(m['entryId']),
        dayOffset: _i(m['dayOffset']), ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'kind': kind, 'amount': amount, 'principalPart': principalPart,
        'chargePart': chargePart, 'accountId': accountId, 'entryId': entryId,
        'dayOffset': dayOffset, 'ts': ts,
      };
  LoanEvent copyWith({double? amount, double? principalPart, double? chargePart,
      String? entryId, String? ts}) => LoanEvent(
        kind: kind, amount: amount ?? this.amount,
        principalPart: principalPart ?? this.principalPart,
        chargePart: chargePart ?? this.chargePart, accountId: accountId,
        entryId: entryId ?? this.entryId, dayOffset: dayOffset, ts: ts ?? this.ts);
}

/// A loan in the register (design §3.1) — one register, two
/// directions. Born numbered (LN-) WITH its drawdown; the schedule
/// and outstanding are pure derivations (core/loans.dart).
class Loan {
  final String id;
  final String number; // "LN-3" — minted at creation
  final String direction; // payable | receivable
  final String partyName;
  final String? partyId;
  final double principal;
  final String chargeType; // none | flat | reducing | fee_only
  final double chargeRate;
  final double chargeAmount; // snapshotted at creation (flat/fee)
  final String startDateISO;
  final int instalmentCount;
  final String instalmentEvery; // month | week
  final String firstDueISO;
  final List<LoanEvent> events; // append-only diary (§3.3)
  final String status; // active | settled | cancelled (cached label)
  final String note;
  final int dayOffset;
  final String ts;
  const Loan({required this.id, this.number = '', this.direction = 'payable',
    this.partyName = '', this.partyId, this.principal = 0, this.chargeType = 'none',
    this.chargeRate = 0, this.chargeAmount = 0, this.startDateISO = '',
    this.instalmentCount = 0, this.instalmentEvery = 'month', this.firstDueISO = '',
    this.events = const [], this.status = 'active', this.note = '',
    this.dayOffset = 0, this.ts = ''});
  factory Loan.fromMap(String id, Map<String, dynamic> m) => Loan(
        id: id, number: _s(m['number']), direction: _s(m['direction'], 'payable'),
        partyName: _s(m['partyName']), partyId: _sn(m['partyId']),
        principal: _d(m['principal']), chargeType: _s(m['chargeType'], 'none'),
        chargeRate: _d(m['chargeRate']), chargeAmount: _d(m['chargeAmount']),
        startDateISO: _s(m['startDateISO']), instalmentCount: _i(m['instalmentCount']),
        instalmentEvery: _s(m['instalmentEvery'], 'month'), firstDueISO: _s(m['firstDueISO']),
        events: (m['events'] is List) ? (m['events'] as List).whereType<Map>().map((e) => LoanEvent.fromMap(Map<String, dynamic>.from(e))).toList() : const [],
        status: _s(m['status'], 'active'), note: _s(m['note']),
        dayOffset: _i(m['dayOffset']), ts: _s(m['ts']),
      );
  Map<String, dynamic> toMap() => {
        'number': number, 'direction': direction, 'partyName': partyName,
        'partyId': partyId, 'principal': principal, 'chargeType': chargeType,
        'chargeRate': chargeRate, 'chargeAmount': chargeAmount,
        'startDateISO': startDateISO, 'instalmentCount': instalmentCount,
        'instalmentEvery': instalmentEvery, 'firstDueISO': firstDueISO,
        'events': events.map((e) => e.toMap()).toList(), 'status': status,
        'note': note, 'dayOffset': dayOffset, 'ts': ts,
      };
  Loan copyWith({List<LoanEvent>? events, String? status}) => Loan(
        id: id, number: number, direction: direction, partyName: partyName,
        partyId: partyId, principal: principal, chargeType: chargeType,
        chargeRate: chargeRate, chargeAmount: chargeAmount,
        startDateISO: startDateISO, instalmentCount: instalmentCount,
        instalmentEvery: instalmentEvery, firstDueISO: firstDueISO,
        events: events ?? this.events, status: status ?? this.status,
        note: note, dayOffset: dayOffset, ts: ts);
}

/// A period-lock / fiscal-year audit doc (Phase A §5.1 shape;
/// Phase D §4.3 adds the fiscal fields). The trail and the lock
/// value can never drift apart — both move in one batch.
class PeriodDoc {
  final String id;
  final String kind; // period | fiscal_year
  final String from; // ISO instant ("" = from the beginning)
  final String to; // ISO instant ("" = fully reopened)
  final String action; // close | reopen
  final String byUid;
  final String byEmail;
  final String ts;
  final String note;
  final String? prevLockedThrough;
  final String? entryId; // the fy_close entry (or its mirror)
  final String? reopensPeriodId;
  final bool? warningsAcked;
  const PeriodDoc({required this.id, this.kind = 'period', this.from = '', this.to = '',
    this.action = 'close', this.byUid = '', this.byEmail = '', this.ts = '', this.note = '',
    this.prevLockedThrough, this.entryId, this.reopensPeriodId, this.warningsAcked});
  factory PeriodDoc.fromMap(String id, Map<String, dynamic> m) => PeriodDoc(
        id: id, kind: _s(m['kind'], 'period'), from: _s(m['from']), to: _s(m['to']),
        action: _s(m['action'], 'close'), byUid: _s(m['byUid']),
        byEmail: _s(m['byEmail']), ts: _s(m['ts']), note: _s(m['note']),
        prevLockedThrough: _sn(m['prevLockedThrough']), entryId: _sn(m['entryId']),
        reopensPeriodId: _sn(m['reopensPeriodId']),
        warningsAcked: m['warningsAcked'] is bool ? m['warningsAcked'] as bool : null,
      );
  Map<String, dynamic> toMap() => {
        'kind': kind, 'from': from, 'to': to, 'action': action,
        'byUid': byUid, 'byEmail': byEmail, 'ts': ts, 'note': note,
        if (prevLockedThrough != null) 'prevLockedThrough': prevLockedThrough,
        if (entryId != null) 'entryId': entryId,
        if (reopensPeriodId != null) 'reopensPeriodId': reopensPeriodId,
        if (warningsAcked != null) 'warningsAcked': warningsAcked,
      };
}

/// A brand asset (Phase E · E2) — one doc per slot in the
/// `branding` collection, id == kind. Payload is a compressed
/// data-URL under a HARD cap (core/branding.dart enforces it).
class BrandingAsset {
  final String id;
  final String kind; // logo | letterheadHeader | letterheadFooter | stamp | signature | raastQrImage
  final String dataUrl;
  final String mime; // image/png | image/jpeg | image/webp
  final int width;
  final int height;
  final int bytes;
  final String updatedAt;
  const BrandingAsset({required this.id, required this.kind, this.dataUrl = '',
    this.mime = 'image/png', this.width = 0, this.height = 0, this.bytes = 0, this.updatedAt = ''});
  factory BrandingAsset.fromMap(String id, Map<String, dynamic> m) => BrandingAsset(
        id: id, kind: _s(m['kind'], id), dataUrl: _s(m['dataUrl']),
        mime: _s(m['mime'], 'image/png'), width: _i(m['width']), height: _i(m['height']),
        bytes: _i(m['bytes']), updatedAt: _s(m['updatedAt']),
      );
  Map<String, dynamic> toMap() => {
        'kind': kind, 'dataUrl': dataUrl, 'mime': mime, 'width': width,
        'height': height, 'bytes': bytes, 'updatedAt': updatedAt,
      };
}
