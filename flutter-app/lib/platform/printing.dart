/// The ReceiptPrinter seam (design §6.1) — screens depend on this,
/// never on a transport.
///
/// F1 transports:
///  - SystemPrintPrinter: the platform print flow (Android system
///    print / share-sheet printers; on Windows the system print
///    dialog) with the receipt as a PDF IMAGE-PAGE — the §6.2 rule:
///    Urdu text is rasterized by the app's own engine, so no printer
///    driver ever shapes Nastaliq.
///  - PosRasterPrinter: ESC/POS raster bytes for 80mm thermal
///    printers, delivered via the platform share sheet to the
///    printer's app/driver (the §6.3 Android route). Direct
///    Bluetooth/USB socket transport is deliberately NOT in F1 —
///    flagged for F5 with the owner's printer model (design §11).
///  - ShareTextPrinter: the plain-text receipt (WhatsApp body /
///    any share target).
import 'dart:typed_data';

import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:image/image.dart' as img;
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:share_plus/share_plus.dart';

abstract class ReceiptPrinter {
  String get id;
  Future<void> printPng(Uint8List pngBytes, {required String jobName, required bool thermal});
}

class SystemPrintPrinter implements ReceiptPrinter {
  @override
  String get id => 'system';
  @override
  Future<void> printPng(Uint8List pngBytes, {required String jobName, required bool thermal}) async {
    await Printing.layoutPdf(
      name: jobName,
      format: thermal ? const PdfPageFormat(80 * PdfPageFormat.mm, double.infinity, marginAll: 4 * PdfPageFormat.mm) : PdfPageFormat.a4,
      onLayout: (format) async {
        final doc = pw.Document();
        final image = pw.MemoryImage(pngBytes);
        doc.addPage(pw.Page(
          pageFormat: format,
          build: (_) => pw.Center(child: pw.Image(image, fit: pw.BoxFit.scaleDown)),
        ));
        return doc.save();
      },
    );
  }
}

/// The ESC/POS raster byte stream for a receipt PNG (mm80, feed +
/// drawer kick + cut) — one builder for every thermal transport:
/// the share-sheet .bin (PosRasterPrinter) and the direct
/// Bluetooth/USB printers (direct_printing.dart, F2 §8).
Future<List<int>> escPosRasterBytes(Uint8List pngBytes) async {
  final decoded = img.decodePng(pngBytes);
  if (decoded == null) throw StateError('receipt raster decode failed');
  final profile = await CapabilityProfile.load();
  final generator = Generator(PaperSize.mm80, profile);
  return <int>[
    ...generator.reset(),
    ...generator.imageRaster(decoded, imageFn: PosImageFn.graphics),
    ...generator.feed(2),
    ...generator.drawer(),
    ...generator.cut(),
  ];
}

class PosRasterPrinter implements ReceiptPrinter {
  @override
  String get id => 'escpos-raster';
  @override
  Future<void> printPng(Uint8List pngBytes, {required String jobName, required bool thermal}) async {
    final bytes = await escPosRasterBytes(pngBytes);
    final file = XFile.fromData(Uint8List.fromList(bytes), name: '$jobName.bin', mimeType: 'application/octet-stream');
    await Share.shareXFiles([file], subject: jobName);
  }
}

class ShareTextPrinter {
  Future<void> share(String text, {required String subject}) =>
      Share.share(text, subject: subject);
}
