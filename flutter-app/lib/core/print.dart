/// Print design resolution + receipt model (Dart port of the
/// receipt-relevant parts of web/lib/print.ts, Phase E · E1). Every
/// default lives here, nowhere else (web §1.2) — the app never
/// redesigns a receipt; it renders the owner's saved
/// settings.printDesign on the device's paper. Print output NEVER
/// follows the app theme (E1): the palette is fixed light.
import 'types.dart';

class PrintDesignView {
  final String paper; // a4 | a4-compact | a5 | thermal80
  final String fontScale; // standard | large
  final bool showLogo;
  final bool showShopName;
  final bool showAddress;
  final bool showPhone;
  final bool colSku;
  final bool colUrduName;
  final bool colTax;
  final bool colDiscount;
  final String footerNote;
  final bool showThanks;
  final String thanksText;
  final String stampMode; // paid | paidDue | off
  final String headerMode; // text | letterhead
  final bool showRaastQr;
  final bool raastDynamic;
  const PrintDesignView({
    required this.paper, required this.fontScale, required this.showLogo,
    required this.showShopName, required this.showAddress, required this.showPhone,
    required this.colSku, required this.colUrduName, required this.colTax,
    required this.colDiscount, required this.footerNote, required this.showThanks,
    required this.thanksText, required this.stampMode, required this.headerMode,
    required this.showRaastQr, required this.raastDynamic,
  });
}

/// resolvePrintDesign with the web's defaults, verbatim.
PrintDesignView resolvePrintDesign(Map<String, dynamic> settings) {
  final d = (settings['printDesign'] as Map?)?.cast<String, dynamic>() ?? const {};
  bool b(String k, bool def) => d[k] is bool ? d[k] as bool : def;
  String s(String k, String def) => d[k]?.toString() ?? def;
  return PrintDesignView(
    paper: s('paper', 'a4'),
    fontScale: s('fontScale', 'standard'),
    showLogo: b('showLogo', false),
    showShopName: b('showShopName', true),
    showAddress: b('showAddress', true),
    showPhone: b('showPhone', true),
    colSku: b('colSku', false),
    colUrduName: b('colUrduName', false),
    colTax: b('colTax', false),
    colDiscount: b('colDiscount', false),
    footerNote: s('footerNote', ''),
    showThanks: b('showThanks', true),
    thanksText: s('thanksText', ''),
    stampMode: s('stampMode', 'paid'),
    headerMode: s('headerMode', 'text'),
    showRaastQr: b('showRaastQr', false),
    raastDynamic: b('raastDynamic', true),
  );
}

/// The receipt's money facts, assembled once for every renderer
/// (screen preview, PDF page, ESC/POS raster, plain-text share).
class ReceiptData {
  final String shopName;
  final String shopPhone;
  final String shopAddress;
  final String? logoDataUrl;
  final String billNoLabel;
  final String dateLabel;
  final String customerLabel;
  final String? customerPhone;
  final List<({String name, String? urduName, String? sku, double qty, double unitPrice, double lineTotal, double tax})> lines;
  final double subtotal;
  final double discount;
  final double tax;
  final double total;
  final List<({String label, double amount})> payments;
  final double creditPart;
  final PrintDesignView design;
  final String? raastIban;
  const ReceiptData({
    required this.shopName, required this.shopPhone, required this.shopAddress,
    required this.logoDataUrl, required this.billNoLabel, required this.dateLabel,
    required this.customerLabel, required this.customerPhone, required this.lines,
    required this.subtotal, required this.discount, required this.tax,
    required this.total, required this.payments, required this.creditPart,
    required this.design, required this.raastIban,
  });
}

ReceiptData receiptForBill({
  required Bill bill,
  required Map<String, dynamic> ownerDoc,
  required Map<String, Product> productsById,
  required String Function(double) money,
  required String walkInLabel,
  required String billNoText,
}) {
  final design = resolvePrintDesign(ownerDoc);
  return ReceiptData(
    shopName: ownerDoc['shopName']?.toString() ?? '',
    shopPhone: ownerDoc['shopPhone']?.toString() ?? '',
    shopAddress: ownerDoc['shopAddress']?.toString() ?? '',
    logoDataUrl: design.showLogo ? ownerDoc['brandLogo']?.toString() : null,
    billNoLabel: '$billNoText ${bill.billNo}',
    dateLabel: bill.ts.length >= 10 ? bill.ts.substring(0, 10) : bill.ts,
    customerLabel: bill.customerName.isNotEmpty ? bill.customerName : walkInLabel,
    customerPhone: bill.customerPhone.isNotEmpty ? bill.customerPhone : null,
    lines: bill.items
        .map((i) => (
              name: i.name,
              urduName: productsById[i.productId]?.urduName,
              sku: productsById[i.productId]?.sku,
              qty: i.qty, unitPrice: i.unitPrice,
              lineTotal: i.total,
              tax: i.taxAmount,
            ))
        .toList(),
    subtotal: bill.subtotal,
    discount: bill.discountAmount,
    tax: bill.taxAmount,
    total: bill.total,
    payments: bill.payments
        .map((p) => (label: p.method, amount: p.amount))
        .toList(),
    creditPart: bill.payments.where((p) => p.method == 'credit').fold(0.0, (a, p) => a + p.amount),
    design: design,
    raastIban: design.showRaastQr ? ownerDoc['raastIban']?.toString() : null,
  );
}

/// Plain-text receipt (share / WhatsApp body) — the §6.3 Android
/// fallback and the E3 WhatsApp send body.
String receiptPlainText(ReceiptData r, String Function(double) money, {required String thanksFallback}) {
  final b = StringBuffer();
  if (r.design.showShopName && r.shopName.isNotEmpty) b.writeln(r.shopName);
  if (r.design.showAddress && r.shopAddress.isNotEmpty) b.writeln(r.shopAddress);
  if (r.design.showPhone && r.shopPhone.isNotEmpty) b.writeln(r.shopPhone);
  b.writeln(r.billNoLabel);
  b.writeln(r.dateLabel);
  b.writeln(r.customerLabel);
  b.writeln('—' * 24);
  for (final l in r.lines) {
    b.writeln('${l.name} × ${l.qty % 1 == 0 ? l.qty.toInt() : l.qty} — ${money(l.lineTotal)}');
  }
  b.writeln('—' * 24);
  if (r.discount > 0) b.writeln('Discount: ${money(r.discount)}');
  if (r.tax > 0) b.writeln('Tax: ${money(r.tax)}');
  b.writeln('Total: ${money(r.total)}');
  if (r.raastIban != null && r.raastIban!.isNotEmpty) b.writeln('Raast IBAN: ${r.raastIban}');
  if (r.design.showThanks) b.writeln(r.design.thanksText.isNotEmpty ? r.design.thanksText : thanksFallback);
  if (r.design.footerNote.isNotEmpty) b.writeln(r.design.footerNote);
  return b.toString();
}

/// Normalize a Pakistani phone for wa.me (E3 discipline): digits
/// only, local 0… → 92…, already-international kept.
String normalizePkPhone(String raw) {
  var d = raw.replaceAll(RegExp(r'\D'), '');
  if (d.startsWith('00')) d = d.substring(2);
  if (d.startsWith('0')) d = '92${d.substring(1)}';
  return d;
}

String whatsAppLink(String phone, String text) =>
    'https://wa.me/${normalizePkPhone(phone)}?text=${Uri.encodeComponent(text)}';
