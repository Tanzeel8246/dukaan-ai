/// Holder for the active generated dictionary (hand-written glue —
/// strings.dart itself is GENERATED and never edited). Screens read
/// `S.current.<key>`; AppState swaps the instance on language change.
import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import 'review_states.dart';
import 'strings.dart';

class S {
  static Strings current = const Strings({});
  static String language = 'ur';

  static Future<void> load(String lang) async {
    language = lang;
    final raw = await rootBundle.loadString('lib/l10n/strings_$lang.json');
    final map = (jsonDecode(raw) as Map).cast<String, String>();
    current = Strings(map);
  }

  /// The §4.2 badge rule, from the GENERATED review-state table (which
  /// the drift gate keeps identical to web/lib/i18n/review-manifest.json):
  /// a PS/FA locale wears the "Draft preview" label while any of its
  /// keys is still an unreviewed draft. EN/UR are never badged.
  static bool localeIsDraft(String lang) {
    final states = lang == 'ps'
        ? psReviewStates
        : lang == 'fa'
            ? faReviewStates
            : null;
    if (states == null || states.isEmpty) return false;
    return states.values.any((v) => v == 'draft');
  }

  /// (reviewed, total) for a draft locale; null for en/ur.
  static (int, int)? localeReviewProgress(String lang) {
    final states = lang == 'ps'
        ? psReviewStates
        : lang == 'fa'
            ? faReviewStates
            : null;
    if (states == null) return null;
    final reviewed = states.values.where((v) => v == 'reviewed').length;
    return (reviewed, states.length);
  }
}
