/// Dukaan AI — brand assets pure core (Dart port of
/// web/lib/branding.ts, Phase E · E2).
///
/// Design: ERP-PHASE-E-DESIGN.md §2. Every DECISION — the
/// target box, the format, the quality/scale ladder, the hard
/// caps, the refusal — lives here; the platform encode (the
/// `image` package) lives in the Settings editor. An encode
/// that exceeds its cap steps down (quality −0.1, then box
/// ×0.75) up to three times; still over ⇒ REFUSED with the
/// actual figures. No input can produce a stored payload over
/// its cap: [buildBrandingAsset] re-checks at the boundary.
import 'types.dart';

const List<String> brandingKinds = [
  'logo',
  'letterheadHeader',
  'letterheadFooter',
  'stamp',
  'signature',
  'raastQrImage',
];

class BrandingSpec {
  final int maxWidth;
  final int maxHeight;
  final int capBytes;
  final bool banner;
  const BrandingSpec(this.maxWidth, this.maxHeight, this.capBytes, this.banner);
}

const Map<String, BrandingSpec> brandingSpecs = {
  'logo': BrandingSpec(600, 600, 150000, false),
  'letterheadHeader': BrandingSpec(1600, 400, 300000, true),
  'letterheadFooter': BrandingSpec(1600, 400, 300000, true),
  'stamp': BrandingSpec(600, 600, 150000, false),
  'signature': BrandingSpec(800, 300, 150000, false),
  'raastQrImage': BrandingSpec(800, 800, 200000, false),
};

/// The worst-case total across all six docs at cap (§2.2).
const int brandingTotalCapBytes = 1250000;

/* ------------------------------------------------------------------ */
/* Data-URL facts                                                      */
/* ------------------------------------------------------------------ */

final _dataUrlRe = RegExp(r'^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$');

/// The mime a data-URL carries, or null when the payload is
/// not one of the three encodings the pipeline stores.
String? dataUrlMime(String dataUrl) {
  final m = _dataUrlRe.firstMatch(dataUrl);
  return m?.group(1);
}

/// The decoded byte length of a base64 data-URL — computed
/// from the payload itself. −1 for a malformed payload.
int dataUrlBytes(String dataUrl) {
  final comma = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || comma < 0) return -1;
  if (!dataUrl.substring(0, comma).endsWith(';base64')) return -1;
  final b64 = dataUrl.substring(comma + 1);
  if (b64.isEmpty || b64.length % 4 != 0) return -1;
  var pad = 0;
  if (b64.endsWith('==')) {
    pad = 2;
  } else if (b64.endsWith('=')) {
    pad = 1;
  }
  return (b64.length * 3) ~/ 4 - pad;
}

/* ------------------------------------------------------------------ */
/* The plan — pure decisions (§2.2 steps 2–3)                          */
/* ------------------------------------------------------------------ */

/// Fit (w × h) inside the kind's box, preserving aspect,
/// NEVER upscaling. Degenerate inputs collapse to 0×0.
({int width, int height}) fitWithinBox(int width, int height, BrandingSpec spec) {
  if (!(width > 0) || !(height > 0)) return (width: 0, height: 0);
  var scale = 1.0;
  final sw = spec.maxWidth / width;
  final sh = spec.maxHeight / height;
  if (sw < scale) scale = sw;
  if (sh < scale) scale = sh;
  final w = (width * scale).floor();
  final h = (height * scale).floor();
  return (width: w > 1 ? w : 1, height: h > 1 ? h : 1);
}

/// The encode format (§2.2): letterhead banners are JPEG; an
/// image WITH alpha keeps WebP; no alpha encodes JPEG.
String chooseFormat(String kind, bool hasAlpha) {
  if (brandingSpecs[kind]!.banner) return 'image/jpeg';
  return hasAlpha ? 'image/webp' : 'image/jpeg';
}

class CompressionStep {
  final String mime;
  final double? quality;
  final int width;
  final int height;
  const CompressionStep(this.mime, this.quality, this.width, this.height);
  Map<String, dynamic> toJson() => {
        'mime': mime, 'quality': quality, 'width': width, 'height': height,
      };
}

/// The step ladder (§2.2): step 0 at the fitted box and the
/// base quality, then up to THREE step-downs — quality −0.1,
/// then box ×0.75, then quality −0.1 at the shrunken box.
List<CompressionStep> compressionPlan(
  String kind, {
  required int width,
  required int height,
  required bool hasAlpha,
}) {
  final spec = brandingSpecs[kind]!;
  final mime = chooseFormat(kind, hasAlpha);
  final fit = fitWithinBox(width, height, spec);
  final double? baseQuality = mime == 'image/jpeg'
      ? (spec.banner ? 0.85 : 0.9)
      : mime == 'image/webp'
          ? 0.92
          : null;
  double? q(double? base, int drops) =>
      base == null ? null : ((base - 0.1 * drops) * 100).round() / 100;
  CompressionStep at(double? quality, double scale) {
    final w = (fit.width * scale).floor();
    final h = (fit.height * scale).floor();
    return CompressionStep(mime, quality, w > 1 ? w : 1, h > 1 ? h : 1);
  }

  if (fit.width == 0 || fit.height == 0) return [];
  return [
    at(baseQuality, 1),
    at(q(baseQuality, 1), 1),
    at(q(baseQuality, 1), 0.75),
    at(q(baseQuality, 2), 0.75 * 0.75),
  ];
}

class CompressionOutcome {
  final bool ok;
  final int stepIndex;
  final CompressionStep? step;
  final String? dataUrl;
  final int bytes;
  final int capBytes;
  final int lastBytes;
  final int stepsTried;
  const CompressionOutcome._(this.ok, this.stepIndex, this.step, this.dataUrl,
      this.bytes, this.capBytes, this.lastBytes, this.stepsTried);
  factory CompressionOutcome.success(
          int stepIndex, CompressionStep step, String dataUrl, int bytes) =>
      CompressionOutcome._(true, stepIndex, step, dataUrl, bytes, 0, bytes, stepIndex + 1);
  factory CompressionOutcome.refused(int capBytes, int lastBytes, int stepsTried) =>
      CompressionOutcome._(false, -1, null, null, 0, capBytes, lastBytes, stepsTried);
}

/// Walk the ladder with the caller's encoder and stop at the
/// first encode under the cap. The cap is HARD.
CompressionOutcome runCompressionPlan(
  String kind, {
  required int width,
  required int height,
  required bool hasAlpha,
  required ({String dataUrl, int bytes}) Function(CompressionStep step) encode,
}) {
  final spec = brandingSpecs[kind]!;
  final steps = compressionPlan(kind, width: width, height: height, hasAlpha: hasAlpha);
  var lastBytes = 0;
  for (var i = 0; i < steps.length; i++) {
    final r = encode(steps[i]);
    lastBytes = r.bytes;
    if (r.bytes >= 0 && r.bytes <= spec.capBytes) {
      return CompressionOutcome.success(i, steps[i], r.dataUrl, r.bytes);
    }
  }
  return CompressionOutcome.refused(spec.capBytes, lastBytes, steps.length);
}

/* ------------------------------------------------------------------ */
/* The asset boundary                                                  */
/* ------------------------------------------------------------------ */

/// Build the stored doc from a finished encode — the boundary
/// guard every write passes (§2.2). Null = refused.
BrandingAsset? buildBrandingAsset(
  String kind,
  String dataUrl,
  double width,
  double height,
  String updatedAt,
) {
  final mime = dataUrlMime(dataUrl);
  if (mime == null) return null;
  final bytes = dataUrlBytes(dataUrl);
  if (bytes < 0 || bytes > brandingSpecs[kind]!.capBytes) return null;
  final w = width.round();
  final h = height.round();
  if (!w.isFinite || !h.isFinite || w <= 0 || h <= 0) return null;
  return BrandingAsset(
    id: kind, kind: kind, dataUrl: dataUrl, mime: mime,
    width: w, height: h, bytes: bytes, updatedAt: updatedAt,
  );
}

/* ------------------------------------------------------------------ */
/* Read seam (§2.1)                                                    */
/* ------------------------------------------------------------------ */

/// Assets by kind; a kind with no doc is simply absent.
Map<String, BrandingAsset> brandingByKind(List<BrandingAsset> list) {
  final out = <String, BrandingAsset>{};
  for (final a in list) {
    if (brandingKinds.contains(a.kind)) out[a.kind] = a;
  }
  return out;
}

/// The data-URL map the print chrome consumes (null per slot).
Map<String, String?> brandingDataUrls(List<BrandingAsset> list) {
  final by = brandingByKind(list);
  return {
    'logo': by['logo']?.dataUrl,
    'letterheadHeader': by['letterheadHeader']?.dataUrl,
    'letterheadFooter': by['letterheadFooter']?.dataUrl,
    'stamp': by['stamp']?.dataUrl,
    'signature': by['signature']?.dataUrl,
    'raastQrImage': by['raastQrImage']?.dataUrl,
  };
}

/// Σ stored bytes across the shop's assets.
int brandingTotalBytes(List<BrandingAsset> list) =>
    list.fold(0, (sum, a) => sum + a.bytes);
