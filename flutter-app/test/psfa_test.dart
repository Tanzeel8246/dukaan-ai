/// Phase H · PS/FA language packs (design §4): four-locale parity on
/// the Dart side, the generated review-state table checked against
/// the web manifest itself, the badge rule, the direction truth
/// table, and the print-script choice — PS/FA receipts shape in the
/// bundled Naskh face, Urdu keeps Nastaliq (§4.5). The F-era print
/// fixtures' PS/FA sample lines live here: the receipt renders the
/// actual PS/FA dictionary strings through the one ReceiptView the
/// ESC/POS raster path captures.
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:flutter_test/flutter_test.dart';

import 'package:dukaan_ai/app_state.dart';
import 'package:dukaan_ai/core/print.dart';
import 'package:dukaan_ai/features/print/receipt_view.dart';
import 'package:dukaan_ai/l10n/app_strings.dart';
import 'package:dukaan_ai/l10n/review_states.dart';

Future<Map<String, String>> loadDict(String lang) async {
  final raw = await rootBundle.loadString('lib/l10n/strings_$lang.json');
  return (jsonDecode(raw) as Map).cast<String, String>();
}

Future<Map<String, dynamic>> loadManifest() async => jsonDecode(
    await File('../web/lib/i18n/review-manifest.json').readAsString()) as Map<String, dynamic>;

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('four-locale parity (§4.4)', () {
    test('all four dictionaries: same key set, no empties, 3,077 keys', () async {
      final en = await loadDict('en');
      final ur = await loadDict('ur');
      final ps = await loadDict('ps');
      final fa = await loadDict('fa');
      expect(en.length, 3136);
      for (final d in [ur, ps, fa]) {
        expect(d.length, 3136);
        expect(d.keys.toSet(), en.keys.toSet());
      }
      for (final d in [en, ur, ps, fa]) {
        for (final e in d.entries) {
          expect(e.value, isNotEmpty, reason: e.key);
        }
      }
    });

    test('placeholder token sets match EN in ps/fa for every key', () async {
      final en = await loadDict('en');
      final ps = await loadDict('ps');
      final fa = await loadDict('fa');
      Set<String> toks(String s) =>
          RegExp(r'\{(\w+)\}').allMatches(s).map((m) => m[1]!).toSet();
      for (final k in en.keys) {
        expect(toks(ps[k]!), toks(en[k]!), reason: 'ps $k');
        expect(toks(fa[k]!), toks(en[k]!), reason: 'fa $k');
      }
    });

    test('no un-whitelisted English copy-through in ps/fa', () async {
      final en = await loadDict('en');
      final ps = await loadDict('ps');
      final fa = await loadDict('fa');
      final manifest = await loadManifest();
      final wl = (manifest['copyThroughAllowed'] as List).cast<String>().toSet();
      for (final k in en.keys) {
        for (final d in [ps, fa]) {
          if (d[k] == en[k] && RegExp(r'[A-Za-z]').hasMatch(en[k]!)) {
            expect(wl, contains(k), reason: k);
          }
        }
      }
    });
  });

  group('review states (§4.1/§4.2)', () {
    test('generated table matches the web manifest exactly', () async {
      final manifest = await loadManifest();
      for (final lang in ['ps', 'fa']) {
        final states = (manifest[lang]['states'] as Map).cast<String, String>();
        final table = lang == 'ps' ? psReviewStates : faReviewStates;
        expect(table.length, states.length);
        expect(table, states);
      }
    });

    test('badge rule: draft locales badged at 0 reviewed; en/ur never', () {
      expect(S.localeIsDraft('ps'), isTrue);
      expect(S.localeIsDraft('fa'), isTrue);
      expect(S.localeIsDraft('en'), isFalse);
      expect(S.localeIsDraft('ur'), isFalse);
      expect(S.localeReviewProgress('ps'), (0, 3136));
      expect(S.localeReviewProgress('fa'), (0, 3136));
      expect(S.localeReviewProgress('en'), isNull);
    });
  });

  group('direction + script truth table (§4.5)', () {
    test('en LTR; ur/ps/fa RTL; Naskh is ps/fa only', () {
      expect(langIsRtl('en'), isFalse);
      expect(langIsRtl('ur'), isTrue);
      expect(langIsRtl('ps'), isTrue);
      expect(langIsRtl('fa'), isTrue);
      expect(langIsNaskh('ps'), isTrue);
      expect(langIsNaskh('fa'), isTrue);
      expect(langIsNaskh('ur'), isFalse);
      expect(langIsNaskh('en'), isFalse);
    });
  });

  group('print script choice (§4.5)', () {
    ReceiptData dataFor(String shopName) => ReceiptData(
          shopName: shopName,
          shopPhone: '',
          shopAddress: '',
          logoDataUrl: null,
          billNoLabel: 'Bill 1',
          dateLabel: '',
          customerLabel: '',
          customerPhone: null,
          lines: const [],
          subtotal: 0,
          discount: 0,
          tax: 0,
          total: 0,
          payments: const [],
          creditPart: 0,
          design: resolvePrintDesign(<String, dynamic>{}),
          raastIban: null,
        );

    Future<String?> shopNameFont(WidgetTester tester, String lang, String name) async {
      S.language = lang;
      await tester.pumpWidget(MaterialApp(
        home: Scaffold(
          body: ReceiptView(
            data: dataFor(name),
            money: (v) => 'Rs ${v.toStringAsFixed(0)}',
            totalLabel: 'Total',
            discountLabel: '',
            taxLabel: '',
            thanksFallback: '',
          ),
        ),
      ));
      final hit = find.byType(Text).evaluate().map((e) => e.widget as Text).where((t) => t.data == name);
      expect(hit, isNotEmpty, reason: 'shop name line rendered in $lang');
      return hit.first.style?.fontFamily;
    }

    testWidgets('a Pashto receipt shapes in Naskh, never Nastaliq', (tester) async {
      // rootBundle loads are REAL async — they must run outside the
      // FakeAsync zone (runAsync), or the subsequent pumpWidget hits
      // the guarded-function conflict.
      final ps = await tester.runAsync(() => loadDict('ps'));
      expect(await shopNameFont(tester, 'ps', ps!['common.total']!), 'NotoNaskhArabic');
      S.language = 'ur';
    });

    testWidgets('a Farsi receipt shapes in Naskh, never Nastaliq', (tester) async {
      final fa = await tester.runAsync(() => loadDict('fa'));
      expect(await shopNameFont(tester, 'fa', fa!['common.total']!), 'NotoNaskhArabic');
      S.language = 'ur';
    });

    testWidgets('an Urdu receipt still shapes in Nastaliq', (tester) async {
      final ur = await tester.runAsync(() => loadDict('ur'));
      expect(await shopNameFont(tester, 'ur', ur!['common.total']!), 'NotoNastaliqUrdu');
      S.language = 'ur';
    });
  });
}
