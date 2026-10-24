/// Dukaan AI — Raast QR pure core (Dart port of
/// web/lib/raast.ts, Phase E · E3).
///
/// Design: ERP-PHASE-E-DESIGN.md §3. Two honest paths: the
/// bank-issued QR IMAGE (the `raastQrImage` brand asset —
/// verified, preferred) and the GENERATED SBP P2P payload
/// built from the owner's IBAN. There is NO generated P2M
/// merchant QR — acquirer-issued, cannot be minted from an
/// IBAN.
///
/// PROVISIONAL STATUS (§3.6 release gate): the generated
/// path is NOT yet conformance-verified. The framing detail
/// lives in the ONE seam below ([raastFraming]); until the
/// owner's own bank-app QR pins it byte-for-byte, the UI
/// copy says "pending verification" and the bank image is
/// the documented, verified route.

/// THE FRAMING SEAM — the one place the unverified detail
/// lives. Builder, parser and CRC input all derive from it.
class RaastFraming {
  final String mode; // bare | tlv
  final String status; // provisional | confirmed
  final String? pinnedBy;
  const RaastFraming(this.mode, this.status, this.pinnedBy);
}

const RaastFraming raastFraming = RaastFraming('bare', 'provisional', null);

/// Builder-guard failure with a machine-readable [code].
class RaastError implements Exception {
  final String code;
  final String message;
  const RaastError(this.code, this.message);
  @override
  String toString() => 'RaastError($code): $message';
}

/* ================================================================== */
/* IBAN — full ISO 13616 validation for Pakistani IBANs (§3.2)         */
/* ================================================================== */

/// Entry normalisation: strip spaces and dashes, upper-case.
String normaliseIbanInput(String raw) =>
    raw.replaceAll(RegExp(r'[\s-]+'), '').toUpperCase();

/// ISO 13616 mod-97 over an already-normalised IBAN, computed
/// in 7-digit chunks so no big-integer arithmetic is needed.
int ibanMod97(String iban) {
  final rearranged = iban.substring(4) + iban.substring(0, 4);
  final digits = StringBuffer();
  for (var i = 0; i < rearranged.length; i++) {
    final ch = rearranged[i];
    final code = ch.codeUnitAt(0);
    digits.write(code >= 65 && code <= 90 ? '${code - 55}' : ch);
  }
  final d = digits.toString();
  var rem = 0;
  for (var i = 0; i < d.length; i += 7) {
    final end = i + 7 > d.length ? d.length : i + 7;
    rem = int.parse('$rem${d.substring(i, end)}') % 97;
  }
  return rem;
}

/// Compose a checksum-valid PK IBAN from its parts (fixtures
/// and tests — the standard's own 98 − mod-97 computation).
String pkIbanWithCheckDigits(String bankCode, String accountNumber) {
  final bban = bankCode.toUpperCase() + accountNumber;
  final numeric = StringBuffer();
  final src = '${bban}PK00';
  for (var i = 0; i < src.length; i++) {
    final ch = src[i];
    final code = ch.codeUnitAt(0);
    numeric.write(code >= 65 && code <= 90 ? '${code - 55}' : ch);
  }
  final d = numeric.toString();
  var rem = 0;
  for (var i = 0; i < d.length; i += 7) {
    final end = i + 7 > d.length ? d.length : i + 7;
    rem = int.parse('$rem${d.substring(i, end)}') % 97;
  }
  final check = (98 - rem).toString().padLeft(2, '0');
  return 'PK$check$bban';
}

/// True when the input is a phone-number-shaped string — the
/// Raast *alias* form. There is NO alias object in the P2P
/// template, so an alias is refused with its own error code.
bool looksLikeRaastAlias(String normalised) {
  if (!RegExp(r'^\+?\d+$').hasMatch(normalised)) return false;
  final digits = normalised.replaceAll(RegExp(r'\D'), '');
  return digits.length >= 10 && digits.length <= 15;
}

class PkIbanResult {
  final bool ok;
  final String iban;
  final String? code; // empty | alias | notPk | badLength | badStructure | badChecksum
  const PkIbanResult._(this.ok, this.iban, this.code);
  factory PkIbanResult.valid(String iban) => PkIbanResult._(true, iban, null);
  factory PkIbanResult.invalid(String code) => PkIbanResult._(false, '', code);
}

/// Full validation, at entry, before Settings will save
/// (§3.2): PK + 2 check digits + 4-letter bank code +
/// 16-digit account = 24 chars; structure AND the ISO 13616
/// mod-97 checksum must pass.
PkIbanResult validatePkIban(String? raw) {
  final s = normaliseIbanInput(raw ?? '');
  if (s.isEmpty) return PkIbanResult.invalid('empty');
  if (looksLikeRaastAlias(s)) return PkIbanResult.invalid('alias');
  if (!s.startsWith('PK')) return PkIbanResult.invalid('notPk');
  if (s.length != 24) return PkIbanResult.invalid('badLength');
  if (!RegExp(r'^PK\d{2}[A-Z]{4}\d{16}$').hasMatch(s)) {
    return PkIbanResult.invalid('badStructure');
  }
  if (ibanMod97(s) != 1) return PkIbanResult.invalid('badChecksum');
  return PkIbanResult.valid(s);
}

/// Display grouping in fours: "PK36 SCBL 0000 …".
String groupIban(String iban) =>
    iban.replaceAllMapped(RegExp(r'(.{4})'), (m) => '${m.group(1)} ').trim();

/// The published IBAN-registry example for Pakistan —
/// checksum-valid format sample; demo previews only.
const String raastSampleIban = 'PK36SCBL0000001123456702';

/* ================================================================== */
/* FI name (payload object 03)                                         */
/* ================================================================== */

class RaastFiNameResult {
  final bool ok;
  final String value;
  final String? code; // fiTooLong | fiBadChars
  const RaastFiNameResult._(this.ok, this.value, this.code);
  factory RaastFiNameResult.valid(String v) => RaastFiNameResult._(true, v, null);
  factory RaastFiNameResult.invalid(String c) => RaastFiNameResult._(false, '', c);
}

RaastFiNameResult validateRaastFiName(String? raw) {
  final value = (raw ?? '').trim();
  if (value.isEmpty) return RaastFiNameResult.valid('');
  if (value.length > 25) return RaastFiNameResult.invalid('fiTooLong');
  if (!RegExp(r'^[\x20-\x7E]+$').hasMatch(value)) {
    return RaastFiNameResult.invalid('fiBadChars');
  }
  return RaastFiNameResult.valid(value);
}

/* ================================================================== */
/* CRC-16/CCITT (poly 0x1021, init 0xFFFF — "CCITT-FALSE")             */
/* ================================================================== */

int crc16Ccitt(String input) {
  var crc = 0xffff;
  for (var i = 0; i < input.length; i++) {
    crc ^= (input.codeUnitAt(i) & 0xff) << 8;
    for (var bit = 0; bit < 8; bit++) {
      crc = (crc & 0x8000) != 0 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc;
}

/// The CRC as it appears in the payload: 4 uppercase hex chars.
String crc16CcittHex(String input) =>
    crc16Ccitt(input).toRadixString(16).toUpperCase().padLeft(4, '0');

/* ================================================================== */
/* Framing                                                             */
/* ================================================================== */

String _frameObject(String id, String value, String mode) => mode == 'tlv'
    ? id + value.length.toString().padLeft(2, '0') + value
    : id + value;

/// The CRC object itself, framed; its value is the checksum
/// of everything before it INCLUDING the CRC object's
/// framing prefix — "10" in bare mode, "1004" in TLV mode.
String _crcObjectFor(String prefix, String mode) {
  final crcInput = mode == 'tlv' ? '${prefix}1004' : '${prefix}10';
  final crc = crc16CcittHex(crcInput);
  return mode == 'tlv' ? '1004$crc' : '10$crc';
}

/* ================================================================== */
/* Amount + particulars (§3.3)                                         */
/* ================================================================== */

/// Object 05 formatting: numeric, at most one decimal point,
/// no thousands separators, trailing zeros trimmed. An
/// amount needing ≥ 10 chars is refused at composition.
String formatRaastAmount(double amount) {
  if (!amount.isFinite || amount <= 0) {
    throw RaastError('badAmount', 'Raast amount must be positive, got $amount');
  }
  final rounded = (amount * 100).round() / 100;
  var s = _jsNumber(rounded);
  if (RegExp(r'[eE]').hasMatch(s)) {
    s = rounded.toStringAsFixed(2).replaceAll(RegExp(r'\.?0+$'), '');
  }
  if (s.length > 10) {
    throw RaastError('amountTooLong', 'Raast amount "$s" exceeds the object\'s 10 characters');
  }
  return s;
}

/// JS `String(number)` formatting (shortest round-trip).
String _jsNumber(double v) {
  if (v == v.truncateToDouble() && v.abs() < 1e21) return v.toInt().toString();
  return v.toString();
}

/// The dynamic bill particulars (object 06): the bill label
/// and nothing else — ASCII by construction.
String billParticulars(Object billNo) => 'Bill #$billNo';

void _assertParticulars(String particulars) {
  if (particulars.length > 30 || !RegExp(r'^[\x20-\x7E]+$').hasMatch(particulars)) {
    throw const RaastError('badParticulars', 'Raast particulars must be ≤ 30 ASCII characters');
  }
}

/* ================================================================== */
/* The P2P payload builder (§3.3)                                      */
/* ================================================================== */

class RaastP2pInput {
  final String iban;
  final String? fiName;
  final double? amount; // present ⇒ dynamic (initiation "12")
  final String? particulars;
  const RaastP2pInput({required this.iban, this.fiName, this.amount, this.particulars});
}

String buildRaastP2pPayload(RaastP2pInput input, [String framing = 'bare']) {
  final mode = framing;
  final v = validatePkIban(input.iban);
  if (!v.ok) {
    throw RaastError('iban:${v.code}', 'Refusing to build a Raast payload for an invalid IBAN (${v.code})');
  }
  final fi = validateRaastFiName(input.fiName);
  if (!fi.ok) {
    throw RaastError('fiName:${fi.code}', 'Invalid Raast FI name (${fi.code})');
  }
  final dynamic = input.amount != null;
  if (input.particulars != null) _assertParticulars(input.particulars!);

  var payload = '';
  payload += _frameObject('00', '02', mode); // Payload Format Indicator
  payload += _frameObject('01', dynamic ? '12' : '11', mode); // Point of Initiation
  payload += _frameObject('02', '30', mode); // Scheme Identifier — Raast
  if (fi.value.isNotEmpty) payload += _frameObject('03', fi.value, mode);
  payload += _frameObject('04', v.iban, mode);
  if (dynamic) payload += _frameObject('05', formatRaastAmount(input.amount!), mode);
  if (input.particulars != null) payload += _frameObject('06', input.particulars!, mode);
  payload += _crcObjectFor(payload, mode);
  return payload;
}

/* ================================================================== */
/* The round-trip parser (§3.3)                                        */
/* ================================================================== */

class RaastP2pObjects {
  final String pfi;
  final String initiation;
  final String scheme;
  final String? fiName;
  final String iban;
  final String? amount;
  final String? particulars;
  final String crc;
  const RaastP2pObjects({
    required this.pfi, required this.initiation, required this.scheme,
    this.fiName, required this.iban, this.amount, this.particulars,
    required this.crc,
  });
  Map<String, dynamic> toJson() => {
        'pfi': pfi, 'initiation': initiation, 'scheme': scheme,
        if (fiName != null) 'fiName': fiName,
        'iban': iban,
        if (amount != null) 'amount': amount,
        if (particulars != null) 'particulars': particulars,
        'crc': crc,
      };
}

class RaastParseResult {
  final bool ok;
  final RaastP2pObjects? objects;
  final String? code;
  const RaastParseResult._(this.ok, this.objects, this.code);
  factory RaastParseResult.valid(RaastP2pObjects o) => RaastParseResult._(true, o, null);
  factory RaastParseResult.invalid(String c) => RaastParseResult._(false, null, c);
}

const _objectOrder = ['00', '01', '02', '03', '04', '05', '06', '10'];

String _slice(String s, int start, int end) {
  if (start < 0) return '';
  if (start >= s.length) return '';
  final e = end > s.length ? s.length : end;
  if (e <= start) return '';
  return s.substring(start, e);
}

RaastParseResult _parseTlv(String payload) {
  final found = <String, ({String value, int start})>{};
  var pos = 0;
  var lastOrder = -1;
  while (pos < payload.length) {
    final id = _slice(payload, pos, pos + 2);
    final lenStr = _slice(payload, pos + 2, pos + 4);
    if (!_objectOrder.contains(id) || !RegExp(r'^\d{2}$').hasMatch(lenStr)) {
      return RaastParseResult.invalid('framing');
    }
    final order = _objectOrder.indexOf(id);
    if (order <= lastOrder || found.containsKey(id)) {
      return RaastParseResult.invalid('order');
    }
    lastOrder = order;
    final len = int.parse(lenStr);
    final value = _slice(payload, pos + 4, pos + 4 + len);
    if (value.length != len) return RaastParseResult.invalid('truncated');
    found[id] = (value: value, start: pos);
    pos += 4 + len;
    if (id == '10') break;
  }
  if (pos != payload.length) return RaastParseResult.invalid('trailing');
  return _finishParse(payload, found, 'tlv');
}

RaastParseResult _parseBare(String payload) {
  final found = <String, ({String value, int start})>{};
  var pos = 0;
  String? expect(String id, int len) {
    if (_slice(payload, pos, pos + 2) != id) return null;
    final value = _slice(payload, pos + 2, pos + 2 + len);
    if (value.length != len) return null;
    found[id] = (value: value, start: pos);
    pos += 2 + len;
    return value;
  }

  if (expect('00', 2) == null) return RaastParseResult.invalid('framing');
  if (expect('01', 2) == null) return RaastParseResult.invalid('framing');
  if (expect('02', 2) == null) return RaastParseResult.invalid('framing');
  if (_slice(payload, pos, pos + 2) == '03') {
    final fiStart = pos + 2;
    RaastParseResult? accepted;
    for (var i = fiStart + 1; i + 26 <= payload.length - 6; i++) {
      if (_slice(payload, i, i + 2) != '04' || _slice(payload, i + 2, i + 4) != 'PK') continue;
      if (i - fiStart > 25) break;
      final trial = <String, ({String value, int start})>{
        ...found,
        '03': (value: payload.substring(fiStart, i), start: pos),
        '04': (value: _slice(payload, i + 2, i + 26), start: i),
      };
      final rest = _parseBareTail(payload, i + 26, trial);
      if (rest.ok) {
        accepted = rest;
        break;
      }
    }
    return accepted ?? RaastParseResult.invalid('framing');
  }
  if (expect('04', 24) == null) return RaastParseResult.invalid('framing');
  return _parseBareTail(payload, pos, found);
}

RaastParseResult _parseBareTail(
  String payload,
  int pos,
  Map<String, ({String value, int start})> found,
) {
  if (_slice(payload, pos, pos + 2) == '05') {
    final m = RegExp(r'^[0-9.]+').firstMatch(payload.substring(pos + 2));
    final run = m?.group(0) ?? '';
    final maxLen = run.length < 10 ? run.length : 10;
    for (var len = 1; len <= maxLen; len++) {
      final amount = run.substring(0, len);
      if (!RegExp(r'^\d+(\.\d+)?$').hasMatch(amount)) continue;
      final trial = <String, ({String value, int start})>{
        ...found,
        '05': (value: amount, start: pos),
      };
      final rest = _parseBareAfterAmount(payload, pos + 2 + len, trial);
      if (rest.ok) return rest;
    }
    return RaastParseResult.invalid('framing');
  }
  return _parseBareAfterAmount(payload, pos, found);
}

RaastParseResult _parseBareAfterAmount(
  String payload,
  int pos,
  Map<String, ({String value, int start})> found,
) {
  var p = pos;
  final out = Map<String, ({String value, int start})>.from(found);
  if (_slice(payload, p, p + 2) == '06') {
    final crcStart = payload.length - 6;
    if (crcStart <= p + 2) return RaastParseResult.invalid('framing');
    final value = payload.substring(p + 2, crcStart);
    if (value.length > 30) return RaastParseResult.invalid('framing');
    out['06'] = (value: value, start: p);
    p = crcStart;
  }
  if (_slice(payload, p, p + 2) != '10' || p + 6 != payload.length) {
    return RaastParseResult.invalid('framing');
  }
  out['10'] = (value: _slice(payload, p + 2, p + 6), start: p);
  return _finishParse(payload, out, 'bare');
}

RaastParseResult _finishParse(
  String payload,
  Map<String, ({String value, int start})> found,
  String framing,
) {
  for (final required in ['00', '01', '02', '04', '10']) {
    if (!found.containsKey(required)) return RaastParseResult.invalid('missing');
  }
  if (found['00']!.value != '02') return RaastParseResult.invalid('pfi');
  if (found['02']!.value != '30') return RaastParseResult.invalid('scheme');
  final ibanCheck = validatePkIban(found['04']!.value);
  if (!ibanCheck.ok) return RaastParseResult.invalid('iban:${ibanCheck.code}');
  final crcStart = found['10']!.start;
  final expected = framing == 'tlv'
      ? crc16CcittHex('${payload.substring(0, crcStart)}1004')
      : crc16CcittHex('${payload.substring(0, crcStart)}10');
  if (expected != found['10']!.value.toUpperCase()) {
    return RaastParseResult.invalid('crc');
  }
  return RaastParseResult.valid(RaastP2pObjects(
    pfi: found['00']!.value,
    initiation: found['01']!.value,
    scheme: found['02']!.value,
    iban: found['04']!.value,
    crc: found['10']!.value,
    fiName: found['03']?.value,
    amount: found['05']?.value,
    particulars: found['06']?.value,
  ));
}

RaastParseResult parseRaastP2pPayload(String payload, [String framing = 'bare']) {
  if (payload.length < 20) return RaastParseResult.invalid('framing');
  return framing == 'tlv' ? _parseTlv(payload) : _parseBare(payload);
}

/* ================================================================== */
/* Print resolution (§3.4/§3.5)                                        */
/* ================================================================== */

const Map<String, int> raastQrSizeMmMap = {'s': 22, 'm': 28, 'l': 36};
const int raastThermalMaxMm = 28;

int raastQrSizeMm(String size, bool thermal) {
  final mm = raastQrSizeMmMap[size]!;
  return thermal ? (mm < raastThermalMaxMm ? mm : raastThermalMaxMm) : mm;
}

class RaastDocContext {
  final String kind; // bill | quotation | order | poster | other
  final Object? billNo;
  final double? total;
  final bool dynamic;
  const RaastDocContext(this.kind, {this.billNo, this.total, this.dynamic = false});
}

class RaastPrintInput {
  final bool enabled;
  final bool imagePresent;
  final String? iban;
  final String? fiName;
  final RaastDocContext doc;
  final String size;
  final bool thermal;
  const RaastPrintInput({
    required this.enabled, required this.imagePresent, this.iban,
    this.fiName, required this.doc, this.size = 'm', this.thermal = false,
  });
}

class RaastPrintBlock {
  final String path; // none | image | generated
  final int sizeMm;
  final String? iban;
  final String? payload;
  final bool dynamic;
  const RaastPrintBlock(this.path, this.sizeMm, {this.iban, this.payload, this.dynamic = false});
}

/// The resolver never throws: a payload that cannot be built
/// degrades dynamic → static → none rather than breaking the
/// sheet it rides on.
String? _safeBuild(RaastP2pInput input) {
  try {
    return buildRaastP2pPayload(input);
  } catch (_) {
    return null;
  }
}

RaastPrintBlock resolveRaastBlock(RaastPrintInput input) {
  if (!input.enabled || input.doc.kind == 'other') {
    return const RaastPrintBlock('none', 0);
  }
  final sizeMm = raastQrSizeMm(input.size, input.thermal);
  final check = validatePkIban(input.iban);
  final validIban = check.ok ? check.iban : null;

  if (input.imagePresent) {
    return RaastPrintBlock('image', sizeMm, iban: validIban);
  }
  if (validIban == null) return const RaastPrintBlock('none', 0);

  final fi = validateRaastFiName(input.fiName);
  final fiName = fi.ok ? fi.value : '';
  final base = RaastP2pInput(iban: validIban, fiName: fiName.isEmpty ? null : fiName);
  RaastPrintBlock staticBlock(String? payload) => payload != null
      ? RaastPrintBlock('generated', sizeMm, iban: validIban, payload: payload)
      : const RaastPrintBlock('none', 0);

  if (input.doc.kind == 'bill') {
    final particulars = billParticulars(input.doc.billNo ?? '');
    final total = input.doc.total ?? 0;
    if (input.doc.dynamic && total > 0) {
      final payload = _safeBuild(RaastP2pInput(
        iban: base.iban, fiName: base.fiName, amount: total, particulars: particulars,
      ));
      if (payload != null) {
        return RaastPrintBlock('generated', sizeMm, iban: validIban, payload: payload, dynamic: true);
      }
    }
    return staticBlock(
      _safeBuild(RaastP2pInput(iban: base.iban, fiName: base.fiName, particulars: particulars)) ??
          _safeBuild(base),
    );
  }
  return staticBlock(_safeBuild(base));
}
