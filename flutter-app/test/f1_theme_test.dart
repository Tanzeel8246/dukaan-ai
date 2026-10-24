/// Theme source-invariant (design §6.4): the five Dart token sets
/// must carry the SAME values as the web's [data-theme] blocks in
/// web/app/globals.css — the app never redesigns a theme. If the
/// web palette moves, this test fails until the Dart port follows.
import 'dart:io';

import 'package:dukaan_ai/theme/themes.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

String _hexOf(Color c) =>
    '#${(c.r * 255).round().toRadixString(16).padLeft(2, '0')}${(c.g * 255).round().toRadixString(16).padLeft(2, '0')}${(c.b * 255).round().toRadixString(16).padLeft(2, '0')}'
        .toUpperCase();

void main() {
  final css = File('../web/app/globals.css').readAsStringSync();

  Map<String, String> blockFor(String selector) {
    final start = css.indexOf(selector);
    expect(start, isNonNegative, reason: 'CSS block $selector missing');
    final open = css.indexOf('{', start);
    final close = css.indexOf('}', open);
    final body = css.substring(open + 1, close);
    final out = <String, String>{};
    for (final decl in body.split(';')) {
      final i = decl.indexOf(':');
      if (i < 0) continue;
      out[decl.substring(0, i).trim()] = decl.substring(i + 1).trim();
    }
    return out;
  }

  group('five calm themes (§6.4)', () {
    test('emerald tokens equal the CSS :root defaults', () {
      final cssVars = blockFor(':root');
      final t = dukaanThemes['emerald']!;
      expect(_hexOf(t.bg), cssVars['--bg']!.toUpperCase());
      expect(_hexOf(t.card), cssVars['--card']!.toUpperCase());
      expect(_hexOf(t.text), cssVars['--text']!.toUpperCase());
      expect(_hexOf(t.accent), cssVars['--accent']!.toUpperCase());
      expect(_hexOf(t.accentText), cssVars['--accent-text']!.toUpperCase());
      expect(_hexOf(t.sbBg), cssVars['--sb-bg']!.toUpperCase());
    });

    test('dark + alternate themes carry their CSS values', () {
      final cases = <String, (Color Function(DukaanTokens), String)>{
        'midnight': ((t) => t.bg, '--bg'),
        'ocean': ((t) => t.accent, '--accent'),
        'sand': ((t) => t.sbBg, '--sb-bg'),
        'dusk': ((t) => t.accent, '--accent'),
      };
      cases.forEach((theme, spec) {
        final cssVars = blockFor('[data-theme="$theme"]');
        final t = dukaanThemes[theme]!;
        expect(_hexOf(spec.$1(t)), cssVars[spec.$2]!.toUpperCase(), reason: '$theme ${spec.$2}');
      });
    });

    test('all five themes exist with the web ids, emerald default', () {
      expect(dukaanThemeIds, ['emerald', 'sand', 'ocean', 'midnight', 'dusk']);
      expect(defaultThemeId, 'emerald');
      expect(dukaanThemes['midnight']!.dark, isTrue);
      expect(dukaanThemes['dusk']!.dark, isTrue);
      expect(dukaanThemes['emerald']!.dark, isFalse);
    });
  });
}
