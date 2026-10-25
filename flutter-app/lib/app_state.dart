/// Device-local app state (design §3.5/§4.3): theme choice, locale,
/// the PIN lock session. Everything here is THIS DEVICE ONLY —
/// nothing in this class ever syncs. The PIN record, prefs and
/// friction guard live in flutter_secure_storage under the web's
/// three key names (pinlock.dart) — stored separately, exactly as
/// the web stores them, never in Firestore.
import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/pinlock.dart';
import 'l10n/app_strings.dart';
import 'theme/themes.dart';

/// The four locales (Phase H design §4.1): en | ur | ps | fa.
const List<String> kLangs = ['en', 'ur', 'ps', 'fa'];

/// Direction truth table (§4.5): ur/ps/fa are RTL, en is LTR. The
/// shell's UR flip carries PS/FA wholesale — no new layout logic.
bool langIsRtl(String l) => l == 'ur' || l == 'ps' || l == 'fa';

/// PS/FA are Naskh-script locales (Nastaliq is never forced on them).
bool langIsNaskh(String l) => l == 'ps' || l == 'fa';

/// UR is the Nastaliq locale (fix round 2026-10-25): the bundled
/// NotoNastaliqUrdu face renders the Urdu UI, not just print.
bool langIsNastaliq(String l) => l == 'ur';

class AppState extends ChangeNotifier {
  final _secure = const FlutterSecureStorage();
  String themeId = defaultThemeId;
  String lang = 'ur'; // the web's default locale is Urdu
  Timer? _idleTimer;

  bool get isUrdu => lang == 'ur';
  bool get isRtl => langIsRtl(lang);
  bool get isNaskh => langIsNaskh(lang);
  bool get isNastaliq => langIsNastaliq(lang);
  DukaanTokens get tokens => dukaanThemes[themeId] ?? dukaanThemes[defaultThemeId]!;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    themeId = prefs.getString(themeStorageKey) ?? defaultThemeId;
    if (!dukaanThemes.containsKey(themeId)) themeId = defaultThemeId;
    lang = prefs.getString('dukaan-ai-lang') ?? 'ur';
    if (!kLangs.contains(lang)) lang = 'ur';
    await S.load(lang);
    await _loadPin();
    _idleTimer = Timer.periodic(const Duration(seconds: 20), (_) => _checkIdle());
    notifyListeners();
  }

  @override
  void dispose() {
    _idleTimer?.cancel();
    super.dispose();
  }

  Future<void> setTheme(String id) async {
    themeId = id;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(themeStorageKey, id);
    notifyListeners();
  }

  Future<void> setLang(String l) async {
    if (!kLangs.contains(l)) return;
    lang = l;
    await S.load(l);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('dukaan-ai-lang', l);
    notifyListeners();
  }

  /* ---------------- PIN lock (E4 parity) ---------------- */

  PinLockRecord? _record;
  PinLockPrefs pinPrefs = const PinLockPrefs();
  PinGuardState _guard = const PinGuardState();
  PinLockState lockState = const PinLockState();

  bool get hasPin => _record != null;
  bool get locked => hasPin && lockState.locked;
  bool get gateRequired => pinGateRequired(pinPrefs, hasPin);

  int _now() => DateTime.now().millisecondsSinceEpoch;

  Future<void> _loadPin() async {
    final raw = await _secure.read(key: pinRecordKey);
    _record = raw == null ? null : PinLockRecord.fromJson(jsonDecode(raw));
    final rawPrefs = await _secure.read(key: pinPrefsKey);
    pinPrefs = PinLockPrefs.fromJson(rawPrefs == null ? null : jsonDecode(rawPrefs));
    final rawGuard = await _secure.read(key: pinGuardKey);
    _guard = PinGuardState.fromJson(rawGuard == null ? null : jsonDecode(rawGuard));
    lockState = pinLockReducer(lockState, PinLaunch(hasPin, _now()));
  }

  Future<void> _persistGuard() =>
      _secure.write(key: pinGuardKey, value: jsonEncode(_guard.toJson()));

  Future<void> setPin(String pin) async {
    _record = createPinRecord(pin);
    await _secure.write(key: pinRecordKey, value: jsonEncode(_record!.toJson()));
    _guard = applyPinSuccess();
    await _persistGuard();
    lockState = pinLockReducer(lockState, PinUnlock(_now()));
    notifyListeners();
  }

  Future<void> setPinPrefs(PinLockPrefs prefs) async {
    pinPrefs = prefs;
    await _secure.write(key: pinPrefsKey, value: jsonEncode(prefs.toJson()));
    notifyListeners();
  }

  /// Attempt an unlock. Returns null on success; 'wrong' on a bad
  /// PIN; 'wait:N' (seconds) while a friction pause runs.
  Future<String?> tryUnlock(String pin) async {
    final rec = _record;
    if (rec == null) return null;
    final remaining = pinPauseRemainingMs(_guard, _now());
    if (remaining > 0) return 'wait:${(remaining / 1000).ceil()}';
    if (verifyPin(pin, rec)) {
      _guard = applyPinSuccess();
      await _persistGuard();
      lockState = pinLockReducer(lockState, PinUnlock(_now()));
      notifyListeners();
      return null;
    }
    _guard = applyPinFailure(_guard, _now());
    await _persistGuard();
    notifyListeners();
    return 'wrong';
  }

  /// Verify a PIN for an E5 sensitive-action challenge WITHOUT
  /// unlocking the session (the gate is a separate outcome).
  Future<bool> challengePin(String pin) async {
    final rec = _record;
    if (rec == null) return false;
    if (pinPauseRemainingMs(_guard, _now()) > 0) return false;
    final ok = verifyPin(pin, rec);
    _guard = ok ? applyPinSuccess() : applyPinFailure(_guard, _now());
    await _persistGuard();
    return ok;
  }

  void lockNow() {
    lockState = pinLockReducer(lockState, const PinLockNow());
    notifyListeners();
  }

  void noteActivity() {
    if (!locked) {
      lockState = pinLockReducer(lockState, PinActivity(_now()));
    }
  }

  void _checkIdle() {
    if (!hasPin || locked) return;
    final next = pinLockReducer(lockState, PinCheck(_now(), pinPrefs.idleMinutes));
    if (next.locked != lockState.locked) {
      lockState = next;
      notifyListeners();
    }
  }

  /// Forgot-PIN recovery (E4): the UI reauthenticates with Firebase
  /// first; only then may it call this to wipe the device record.
  Future<void> wipePinAfterReauth() async {
    _record = null;
    _guard = const PinGuardState();
    await _secure.delete(key: pinRecordKey);
    await _secure.delete(key: pinGuardKey);
    lockState = const PinLockState();
    notifyListeners();
  }
}
