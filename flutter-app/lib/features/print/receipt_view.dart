/// The receipt widget — ONE renderer for the screen preview, the
/// PDF image-page and the ESC/POS raster (design §6.1/§6.2): what
/// the owner designed on the web (E1) is what prints, on every
/// surface. Fixed light palette (print never follows the theme).
/// Urdu text renders in Noto Nastaliq Urdu (bundled asset).
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';

import '../../core/print.dart';
import '../../l10n/app_strings.dart';

class ReceiptView extends StatelessWidget {
  final ReceiptData data;
  final String Function(double) money;
  final String totalLabel;
  final String discountLabel;
  final String taxLabel;
  final String thanksFallback;
  final double width; // logical px; 302 ≈ 80mm at 96dpi
  const ReceiptView({
    super.key,
    required this.data,
    required this.money,
    required this.totalLabel,
    required this.discountLabel,
    required this.taxLabel,
    required this.thanksFallback,
    this.width = 302,
  });

  TextStyle get _base => const TextStyle(color: Color(0xFF1A1A1A), fontSize: 12, height: 1.35);
  TextStyle get _urdu => _base.copyWith(fontFamily: 'NotoNastaliqUrdu', height: 1.9);
  TextStyle get _naskh => _base.copyWith(fontFamily: 'NotoNaskhArabic', height: 1.7);

  bool _hasUrdu(String s) => RegExp(r'[؀-ۿ]').hasMatch(s);

  /// Script choice (Phase H §4.5): Arabic-block text renders Nastaliq
  /// in an Urdu context — but Pashto/Farsi are Naskh languages, so when
  /// the ACTIVE locale is ps/fa the same block renders in the bundled
  /// Naskh face; Nastaliq is never forced on them. The ESC/POS raster
  /// path captures these very widgets, so shaping survives to print.
  TextStyle _scriptStyle(String text) {
    if (!_hasUrdu(text)) return _base;
    return (S.language == 'ps' || S.language == 'fa') ? _naskh : _urdu;
  }

  Widget _line(String text, {TextStyle? style, TextAlign align = TextAlign.center}) {
    final st = style ?? _scriptStyle(text);
    return Text(text, style: st, textAlign: align, textDirection: _hasUrdu(text) ? TextDirection.rtl : TextDirection.ltr);
  }

  @override
  Widget build(BuildContext context) {
    final d = data.design;
    final rows = <Widget>[];
    if (d.showShopName && data.shopName.isNotEmpty) {
      rows.add(_line(data.shopName, style: _scriptStyle(data.shopName).copyWith(fontSize: 17, fontWeight: FontWeight.bold)));
    }
    if (d.showAddress && data.shopAddress.isNotEmpty) rows.add(_line(data.shopAddress));
    if (d.showPhone && data.shopPhone.isNotEmpty) rows.add(_line(data.shopPhone));
    rows.add(_line('${data.billNoLabel} · ${data.dateLabel}'));
    rows.add(_line(data.customerLabel));
    rows.add(const Divider(color: Color(0xFF999999), height: 14));
    for (final l in data.lines) {
      rows.add(Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(child: _line(l.name, align: TextAlign.start)),
          _line('×${l.qty % 1 == 0 ? l.qty.toInt() : l.qty}'),
          SizedBox(width: 70, child: _line(money(l.lineTotal), align: TextAlign.end)),
        ],
      ));
      if (d.colUrduName && l.urduName != null && l.urduName!.isNotEmpty) {
        rows.add(_line(l.urduName!, align: TextAlign.start));
      }
    }
    rows.add(const Divider(color: Color(0xFF999999), height: 14));
    if (data.discount > 0) {
      rows.add(Row(children: [Expanded(child: _line(discountLabel, align: TextAlign.start)), _line('-${money(data.discount)}')]));
    }
    if (data.tax > 0) {
      rows.add(Row(children: [Expanded(child: _line(taxLabel, align: TextAlign.start)), _line(money(data.tax))]));
    }
    rows.add(Row(children: [
      Expanded(child: _line(totalLabel, style: _base.copyWith(fontSize: 15, fontWeight: FontWeight.bold), align: TextAlign.start)),
      _line(money(data.total), style: _base.copyWith(fontSize: 15, fontWeight: FontWeight.bold)),
    ]));
    for (final p in data.payments) {
      rows.add(Row(children: [Expanded(child: _line(p.label, align: TextAlign.start)), _line(money(p.amount))]));
    }
    if (data.raastIban != null && data.raastIban!.isNotEmpty) {
      rows.add(_line('Raast IBAN: ${data.raastIban}'));
    }
    // MC workflow §4 — Raast QR SLOT: the box the owner's
    // bank-issued QR image occupies. A generated QR is only ever
    // provisional (see core/raast.dart) and is never printed as
    // if it were the bank's own code.
    if (d.showRaastQr) {
      rows.add(Container(
        margin: const EdgeInsets.symmetric(vertical: 6),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(border: Border.all(color: const Color(0xFF999999))),
        child: _line('Raast QR'),
      ));
    }
    if (d.showThanks) {
      rows.add(_line(d.thanksText.isNotEmpty ? d.thanksText : thanksFallback));
    }
    if (d.footerNote.isNotEmpty) rows.add(_line(d.footerNote));
    return Container(
      width: width,
      color: Colors.white,
      padding: const EdgeInsets.all(12),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: rows),
    );
  }
}

/// Capture a RepaintBoundary's widget as PNG bytes (pixelRatio 2 ≈
/// 200dpi at 302px width — legible Nastaliq on thermal paper).
Future<Uint8List?> captureReceiptPng(GlobalKey boundaryKey) async {
  final obj = boundaryKey.currentContext?.findRenderObject();
  if (obj is! RenderRepaintBoundary) return null;
  final image = await obj.toImage(pixelRatio: 2.0);
  final data = await image.toByteData(format: ui.ImageByteFormat.png);
  return data?.buffer.asUint8List();
}
