/// The designed document page renderer + print sheet (F5) — the
/// sibling of ReceiptView for vouchers, work slips, salary slips
/// and reports. ONE renderer for the screen preview, the PDF
/// image-page and the ESC/POS raster (§6.1/§6.2): fixed light
/// palette (print never follows the theme), Urdu in Noto Nastaliq
/// Urdu, rasterised by the app's own engine.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/print_docs.dart';
import '../../data/store.dart';
import '../../l10n/app_strings.dart';
import '../../platform/direct_printing.dart';
import '../../platform/printing.dart';
import 'receipt_view.dart' show captureReceiptPng;
import '../billing.dart' show showPrinterSettingsDialog;

class DocPageView extends StatelessWidget {
  final DocPageData data;
  final double width; // logical px; 302 ≈ 80mm thermal, ~700 ≈ A4 text width
  const DocPageView({super.key, required this.data, this.width = 302});

  TextStyle get _base => const TextStyle(color: Color(0xFF1A1A1A), fontSize: 12, height: 1.35);
  TextStyle get _urdu => _base.copyWith(fontFamily: 'NotoNastaliqUrdu', height: 1.9);
  TextStyle get _naskh => _base.copyWith(fontFamily: 'NotoNaskhArabic', height: 1.7);

  bool _hasUrdu(String s) => RegExp(r'[؀-ۿ]').hasMatch(s);

  /// Script choice (Phase H §4.5): Arabic-block text renders Nastaliq
  /// in an Urdu context — but Pashto/Farsi are Naskh languages, so when
  /// the ACTIVE locale is ps/fa the same block renders in the bundled
  /// Naskh face; Nastaliq is never forced on them. The raster path
  /// captures these very widgets, so shaping survives to print.
  TextStyle _scriptStyle(String text) {
    if (!_hasUrdu(text)) return _base;
    return (S.language == 'ps' || S.language == 'fa') ? _naskh : _urdu;
  }

  Widget _line(String text, {TextStyle? style, TextAlign align = TextAlign.center}) {
    final st = style ?? _scriptStyle(text);
    return Text(text, style: st, textAlign: align,
        textDirection: _hasUrdu(text) ? TextDirection.rtl : TextDirection.ltr);
  }

  Widget _row(DocRow r) {
    final style = r.strong ? _base.copyWith(fontWeight: FontWeight.bold, fontSize: 13) : null;
    if (r.cells.length == 1) return _line(r.cells[0], style: style, align: TextAlign.start);
    return Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Expanded(child: _line(r.cells[0], style: style, align: TextAlign.start)),
      for (final c in r.cells.skip(1))
        Padding(
          padding: const EdgeInsetsDirectional.only(start: 10),
          child: _line(c, style: style, align: TextAlign.end),
        ),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final d = data.design;
    final rows = <Widget>[];
    if (d.showShopName && data.shopName.isNotEmpty) {
      rows.add(_line(data.shopName,
          style: _scriptStyle(data.shopName).copyWith(fontSize: 17, fontWeight: FontWeight.bold)));
    }
    if (d.showAddress && data.shopAddress.isNotEmpty) rows.add(_line(data.shopAddress));
    if (d.showPhone && data.shopPhone.isNotEmpty) rows.add(_line(data.shopPhone));
    rows.add(const Divider(color: Color(0xFF999999), height: 14));
    rows.add(Row(children: [
      Expanded(child: _line(data.title, style: _base.copyWith(fontSize: 15, fontWeight: FontWeight.bold), align: TextAlign.start)),
      if (data.titleRight.isNotEmpty) _line(data.titleRight, style: _base.copyWith(fontWeight: FontWeight.bold)),
    ]));
    if (data.partyLine != null && data.partyLine!.isNotEmpty) {
      rows.add(_line(data.partyLine!, style: _base.copyWith(fontSize: 13, fontWeight: FontWeight.w600), align: TextAlign.start));
    }
    for (final r in data.meta) {
      rows.add(_row(r));
    }
    for (final sec in data.sections) {
      rows.add(const Divider(color: Color(0xFF999999), height: 14));
      if (sec.title != null && sec.title!.isNotEmpty) {
        rows.add(_line(sec.title!, style: _base.copyWith(fontWeight: FontWeight.bold), align: TextAlign.start));
      }
      for (final r in sec.rows) {
        rows.add(_row(r));
      }
    }
    if (data.totals.isNotEmpty) {
      rows.add(const Divider(color: Color(0xFF999999), height: 14));
      for (final r in data.totals) {
        rows.add(_row(r));
      }
    }
    if (data.note != null && data.note!.isNotEmpty) {
      rows.add(const SizedBox(height: 6));
      rows.add(_line(data.note!, align: TextAlign.start));
    }
    if (data.signatureLabel != null && data.signatureLabel!.isNotEmpty) {
      rows.add(const SizedBox(height: 28));
      rows.add(_line('${data.signatureLabel!}: ____________________', align: TextAlign.start));
    }
    if (d.showThanks && d.thanksText.isNotEmpty) rows.add(_line(d.thanksText));
    if (d.footerNote.isNotEmpty) rows.add(_line(d.footerNote));
    return Container(
      width: width,
      color: Colors.white,
      padding: const EdgeInsets.all(12),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: rows),
    );
  }
}

/// The print sheet for a designed document page — the receipt
/// modal's three transports, verbatim discipline: system print
/// (PDF image-page), 80mm ESC/POS (configured direct printer
/// first, share-sheet .bin fallback), plain-text share.
Future<void> showDocPrintSheet(
  BuildContext context,
  DocPageData data, {
  required String jobName,
  double width = 302,
}) async {
  final s = S.current;
  final boundaryKey = GlobalKey();
  final thermalPaper = data.design.paper == 'thermal80';
  await showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      content: SingleChildScrollView(
        child: RepaintBoundary(
          key: boundaryKey,
          child: DocPageView(data: data, width: width),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () async {
            final png = await captureReceiptPng(boundaryKey);
            if (png != null) {
              await SystemPrintPrinter().printPng(png, jobName: jobName, thermal: thermalPaper);
            }
          },
          child: Text(s.actionPrint),
        ),
        TextButton(
          onPressed: () async {
            final png = await captureReceiptPng(boundaryKey);
            if (png == null) return;
            final direct = await configuredDirectPrinter();
            var delivered = false;
            if (direct != null) {
              try {
                await direct.printPng(png, jobName: jobName, thermal: true);
                delivered = true;
              } catch (_) {
                delivered = false;
              }
            }
            if (!delivered) {
              await PosRasterPrinter().printPng(png, jobName: jobName, thermal: true);
            }
          },
          child: const Text('80mm'),
        ),
        IconButton(
          icon: const Icon(Icons.print_outlined, size: 19),
          tooltip: 'POS printer',
          onPressed: () => showPrinterSettingsDialog(context),
        ),
        TextButton(
          onPressed: () => Share.share(docPagePlainText(data), subject: jobName),
          child: Text(s.raw('rep.share')),
        ),
        ElevatedButton(onPressed: () => Navigator.pop(ctx), child: Text(s.raw('action.close'))),
      ],
    ),
  );
}

/// Convenience for callers inside a store-watching widget: the
/// current owner's shop document for design resolution.
Map<String, dynamic> ownerDocOf(BuildContext context) =>
    context.read<ShopStore>().ownerDoc;
