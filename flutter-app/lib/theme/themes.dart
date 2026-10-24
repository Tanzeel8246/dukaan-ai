/// Dukaan AI — the five calm themes (design §6.4): token sets ported
/// from web/app/globals.css [data-theme] blocks with the SAME token
/// names and values — emerald (light, default), sand (light), ocean
/// (light), midnight (dark), dusk (dark). Calm, AA-contrast, per the
/// owner's standing theme directive. Persisted device-locally under
/// the web's logical key (dukaan-ai-theme). Print NEVER reads these
/// (print colours are the E1 hard-coded palette).
import 'package:flutter/material.dart';

class DukaanTokens extends ThemeExtension<DukaanTokens> {
  final Color bg;
  final Color bg2;
  final Color card;
  final Color card2;
  final Color line;
  final Color text;
  final Color text2;
  final Color muted;
  final Color muted2;
  final Color accent;
  final Color accentSoft;
  final Color accentText;
  final Color amber;
  final Color amberSoft;
  final Color amberText;
  final Color danger;
  final Color dangerSoft;
  final Color info;
  final Color infoSoft;
  final Color infoText;
  final Color onAccent;
  final Color onAmber;
  final Color sbBg;
  final Color sbText;
  final Color sbMuted;
  final Color sbActiveBg;
  final Color sbActiveText;
  final Color sbLine;
  final bool dark;

  const DukaanTokens({
    required this.bg, required this.bg2, required this.card, required this.card2,
    required this.line, required this.text, required this.text2, required this.muted,
    required this.muted2, required this.accent, required this.accentSoft,
    required this.accentText, required this.amber, required this.amberSoft,
    required this.amberText, required this.danger, required this.dangerSoft,
    required this.info, required this.infoSoft, required this.infoText,
    required this.onAccent, required this.onAmber, required this.sbBg,
    required this.sbText, required this.sbMuted, required this.sbActiveBg,
    required this.sbActiveText, required this.sbLine, required this.dark,
  });

  @override
  DukaanTokens copyWith() => this;

  @override
  DukaanTokens lerp(ThemeExtension<DukaanTokens>? other, double t) =>
      other is DukaanTokens ? other : this;

  ThemeData toThemeData() {
    final scheme = ColorScheme(
      brightness: dark ? Brightness.dark : Brightness.light,
      primary: accent,
      onPrimary: onAccent,
      secondary: amber,
      onSecondary: onAmber,
      error: danger,
      onError: Colors.white,
      surface: card,
      onSurface: text,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      scaffoldBackgroundColor: bg,
      canvasColor: bg,
      cardColor: card,
      dividerColor: line,
      fontFamily: null, // platform default for Latin (design §6.4)
      extensions: [this],
      appBarTheme: AppBarTheme(backgroundColor: card, foregroundColor: text, elevation: 0),
      navigationBarTheme: NavigationBarThemeData(backgroundColor: sbBg,
          indicatorColor: sbActiveBg,
          labelTextStyle: WidgetStatePropertyAll(TextStyle(color: sbText, fontSize: 11)),
          iconTheme: WidgetStatePropertyAll(IconThemeData(color: sbText))),
      inputDecorationTheme: InputDecorationTheme(
        filled: true, fillColor: card2,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: line)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: line)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: accent, width: 1.5)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(backgroundColor: accent, foregroundColor: onAccent,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)))),
    );
  }
}

Color _hex(String h) => Color(int.parse('FF${h.substring(1)}', radix: 16));
Color _rgba(int r, int g, int b, double a) => Color.fromRGBO(r, g, b, a);

/// Token tables — values ARE the CSS values (pinned by
/// test/f1_theme_test.dart against web/app/globals.css).
final Map<String, DukaanTokens> dukaanThemes = {
  'emerald': _emerald,
  'sand': _sand,
  'ocean': _ocean,
  'midnight': _midnight,
  'dusk': _dusk,
};

const List<String> dukaanThemeIds = ['emerald', 'sand', 'ocean', 'midnight', 'dusk'];
const String defaultThemeId = 'emerald';
const String themeStorageKey = 'dukaan-ai-theme';

final _emerald = DukaanTokens(
  bg: _hex('#F7F5EF'), bg2: _hex('#EFECE3'), card: _hex('#FDFCFA'), card2: _hex('#F4F1E9'),
  line: _rgba(11, 61, 46, .10), text: _hex('#20302A'), text2: _hex('#45584F'),
  muted: _hex('#61756A'), muted2: _hex('#8A9B90'),
  accent: _hex('#0E7A4B'), accentSoft: _rgba(14, 122, 75, .09), accentText: _hex('#0A5C37'),
  amber: _hex('#C77414'), amberSoft: _rgba(199, 116, 20, .11), amberText: _hex('#8F4209'),
  danger: _hex('#B23A34'), dangerSoft: _rgba(178, 58, 52, .08),
  info: _hex('#7A5BA6'), infoSoft: _rgba(122, 91, 166, .12), infoText: _hex('#7A5BA6'),
  onAccent: _hex('#FFFFFF'), onAmber: _hex('#FFFFFF'),
  sbBg: _hex('#103B2C'), sbText: _hex('#DAEAE0'), sbMuted: _hex('#92B3A3'),
  sbActiveBg: _rgba(110, 231, 183, .13), sbActiveText: _hex('#A9E8CB'), sbLine: _rgba(255, 255, 255, .08),
  dark: false,
);
// Note: the CSS emerald block omits --radius/--sb-bg-grad in this table
// (gradient approximated by sbBg in the app shell).

final _midnight = DukaanTokens(
  bg: _hex('#15181D'), bg2: _hex('#1A1F26'), card: _hex('#1E242C'), card2: _hex('#242B34'),
  line: _rgba(178, 198, 214, .11), text: _hex('#E9EDEF'), text2: _hex('#C4CDD4'),
  muted: _hex('#9AA5AF'), muted2: _hex('#707B87'),
  accent: _hex('#43A97E'), accentSoft: _rgba(67, 169, 126, .13), accentText: _hex('#83C7A8'),
  amber: _hex('#E3AC4E'), amberSoft: _rgba(227, 172, 78, .12), amberText: _hex('#EDC27C'),
  danger: _hex('#E08A84'), dangerSoft: _rgba(224, 138, 132, .10),
  info: _hex('#A78BFA'), infoSoft: _rgba(167, 139, 250, .12), infoText: _hex('#A78BFA'),
  onAccent: _hex('#06231A'), onAmber: _hex('#2A1A05'),
  sbBg: _hex('#15181D'), sbText: _hex('#E9EDEF'), sbMuted: _hex('#9AA5AF'),
  sbActiveBg: _rgba(67, 169, 126, .13), sbActiveText: _hex('#83C7A8'), sbLine: _rgba(255, 255, 255, .08),
  dark: true,
);

final _ocean = DukaanTokens(
  bg: _hex('#EEF5F4'), bg2: _hex('#E0ECEB'), card: _hex('#FBFDFC'), card2: _hex('#EAF2F1'),
  line: _rgba(10, 63, 71, .10), text: _hex('#1C3238'), text2: _hex('#3E5A61'),
  muted: _hex('#5E7A80'), muted2: _hex('#87A0A5'),
  accent: _hex('#0C6B6E'), accentSoft: _rgba(12, 107, 110, .09), accentText: _hex('#084E55'),
  amber: _hex('#B96E12'), amberSoft: _rgba(185, 110, 18, .11), amberText: _hex('#8A4D0B'),
  danger: _hex('#AF3A34'), dangerSoft: _rgba(175, 58, 52, .08),
  info: _hex('#4A6FA5'), infoSoft: _rgba(74, 111, 165, .11), infoText: _hex('#3D5E8C'),
  onAccent: _hex('#FFFFFF'), onAmber: _hex('#FFFFFF'),
  sbBg: _hex('#0D3542'), sbText: _hex('#D9EBEE'), sbMuted: _hex('#8FB4BC'),
  sbActiveBg: _rgba(125, 211, 202, .14), sbActiveText: _hex('#A5E3D8'), sbLine: _rgba(255, 255, 255, .08),
  dark: false,
);

final _sand = DukaanTokens(
  bg: _hex('#F8F2E7'), bg2: _hex('#F0E7D3'), card: _hex('#FEFCF7'), card2: _hex('#F4EDDC'),
  line: _rgba(74, 54, 28, .11), text: _hex('#322A20'), text2: _hex('#57493A'),
  muted: _hex('#7A6A54'), muted2: _hex('#A08E74'),
  accent: _hex('#0E7A4B'), accentSoft: _rgba(14, 122, 75, .09), accentText: _hex('#0A5C37'),
  amber: _hex('#BC6C10'), amberSoft: _rgba(188, 108, 16, .12), amberText: _hex('#8A4A08'),
  danger: _hex('#B23A34'), dangerSoft: _rgba(178, 58, 52, .08),
  info: _hex('#5B6FA6'), infoSoft: _rgba(91, 111, 166, .11), infoText: _hex('#4C5E8C'),
  onAccent: _hex('#FFFFFF'), onAmber: _hex('#FFFFFF'),
  sbBg: _hex('#3A2F22'), sbText: _hex('#EFE6D4'), sbMuted: _hex('#BBA98C'),
  sbActiveBg: _rgba(240, 196, 140, .15), sbActiveText: _hex('#F0C48C'), sbLine: _rgba(255, 255, 255, .08),
  dark: false,
);

final _dusk = DukaanTokens(
  bg: _hex('#1A1921'), bg2: _hex('#201E29'), card: _hex('#262430'), card2: _hex('#2E2C3A'),
  line: _rgba(198, 182, 235, .12), text: _hex('#ECE9F2'), text2: _hex('#CFC9DB'),
  muted: _hex('#A29BB2'), muted2: _hex('#7B748C'),
  accent: _hex('#9D8BD0'), accentSoft: _rgba(157, 139, 208, .14), accentText: _hex('#C9B8EE'),
  amber: _hex('#DDA95E'), amberSoft: _rgba(221, 169, 94, .12), amberText: _hex('#EDC48C'),
  danger: _hex('#DE8B94'), dangerSoft: _rgba(222, 139, 148, .11),
  info: _hex('#93B8E8'), infoSoft: _rgba(147, 184, 232, .12), infoText: _hex('#A9CBF2'),
  onAccent: _hex('#1D1730'), onAmber: _hex('#2A1E06'),
  sbBg: _hex('#231C31'), sbText: _hex('#E4DFF2'), sbMuted: _hex('#A99CC4'),
  sbActiveBg: _rgba(196, 181, 253, .14), sbActiveText: _hex('#D6C6F7'), sbLine: _rgba(255, 255, 255, .08),
  dark: true,
);
