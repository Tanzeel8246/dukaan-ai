/// Dukaan AI — PIN lock core (Dart port of web/lib/pinlock.ts, Phase
/// E · E4/E5 semantics, Phase F design §4.3).
///
/// DEVICE-LOCAL by design: the record lives in this device's
/// keystore-backed storage under the web's logical key names and is
/// never synced and never written to Firestore. PBKDF2-HMAC-SHA256,
/// 150,000 iterations, 16-byte salt, 32-byte output — pinned to the
/// same RFC 7914 §11 known-answer vectors the web's E4 suite uses.
import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:pointycastle/export.dart';

const String pinRecordKey = 'dukaan-ai-pinlock';
const String pinPrefsKey = 'dukaan-ai-pinlock-prefs';
const String pinGuardKey = 'dukaan-ai-pinlock-guard';

const int pinIterations = 150000;
const int pinSaltBytes = 16;
const int pinHashBytes = 32;

/// PBKDF2-HMAC-SHA256 — the one derivation, behind the crypto seam.
Uint8List derivePinBits(String pin, Uint8List salt, int iterations) {
  final derivator = PBKDF2KeyDerivator(HMac(SHA256Digest(), 64));
  derivator.init(Pbkdf2Parameters(salt, iterations, pinHashBytes));
  return derivator.process(Uint8List.fromList(utf8.encode(pin)));
}

Uint8List secureRandomBytes(int n) {
  final rnd = Random.secure();
  return Uint8List.fromList(List.generate(n, (_) => rnd.nextInt(256)));
}

bool timingSafeEqualBytes(Uint8List a, Uint8List b) {
  if (a.length != b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff == 0;
}

bool isValidPinFormat(String pin) => RegExp(r'^\d{4,6}$').hasMatch(pin);

class PinLockRecord {
  final int v;
  final String salt; // base64, 16 bytes
  final String hash; // base64, 32 bytes
  final int iterations;
  final int digits;
  final String setAt;
  const PinLockRecord({this.v = 1, required this.salt, required this.hash,
    required this.iterations, required this.digits, required this.setAt});
  Map<String, dynamic> toJson() => {
        'v': v, 'salt': salt, 'hash': hash, 'iterations': iterations,
        'digits': digits, 'setAt': setAt,
      };
  static PinLockRecord? fromJson(Object? raw) {
    if (raw is! Map) return null;
    try {
      final salt = raw['salt'], hash = raw['hash'];
      if (salt is! String || hash is! String) return null;
      final saltBytes = base64.decode(salt);
      final hashBytes = base64.decode(hash);
      if (saltBytes.length != pinSaltBytes || hashBytes.length != pinHashBytes) return null;
      final iterations = raw['iterations'];
      if (iterations is! num || iterations <= 0) return null;
      return PinLockRecord(
        v: 1, salt: salt, hash: hash, iterations: iterations.toInt(),
        digits: (raw['digits'] as num?)?.toInt() ?? 4,
        setAt: raw['setAt']?.toString() ?? '',
      );
    } catch (_) {
      return null;
    }
  }
}

PinLockRecord createPinRecord(String pin, {Uint8List? saltOverride}) {
  final salt = saltOverride ?? secureRandomBytes(pinSaltBytes);
  final hash = derivePinBits(pin, salt, pinIterations);
  return PinLockRecord(
    salt: base64.encode(salt), hash: base64.encode(hash),
    iterations: pinIterations, digits: pin.length,
    setAt: DateTime.now().toUtc().toIso8601String(),
  );
}

bool verifyPin(String pin, PinLockRecord record) {
  if (!isValidPinFormat(pin)) return false;
  final salt = base64.decode(record.salt);
  final expected = base64.decode(record.hash);
  final actual = derivePinBits(pin, Uint8List.fromList(salt), record.iterations);
  return timingSafeEqualBytes(actual, Uint8List.fromList(expected));
}

class PinLockPrefs {
  final int idleMinutes; // 0 = lock on launch only
  final bool gateSensitive; // E5 — default false
  const PinLockPrefs({this.idleMinutes = 5, this.gateSensitive = false});
  Map<String, dynamic> toJson() => {'idleMinutes': idleMinutes, 'gateSensitive': gateSensitive};
  static PinLockPrefs fromJson(Object? raw) {
    if (raw is! Map) return const PinLockPrefs();
    return PinLockPrefs(
      idleMinutes: (raw['idleMinutes'] as num?)?.toInt() ?? 5,
      gateSensitive: raw['gateSensitive'] == true,
    );
  }
}

class PinGuardState {
  final int failures;
  final int pausedUntil; // epoch ms
  const PinGuardState({this.failures = 0, this.pausedUntil = 0});
  Map<String, dynamic> toJson() => {'failures': failures, 'pausedUntil': pausedUntil};
  static PinGuardState fromJson(Object? raw) {
    if (raw is! Map) return const PinGuardState();
    return PinGuardState(
      failures: (raw['failures'] as num?)?.toInt() ?? 0,
      pausedUntil: (raw['pausedUntil'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Pause (ms) once `consecutiveFailures` is reached: free below 5;
/// at 5 a 30s pause; then 2 minutes; 5-minute cap (§4.4).
int frictionPauseMs(int consecutiveFailures) {
  if (consecutiveFailures < 5) return 0;
  final block = (consecutiveFailures - 5) ~/ 5;
  const schedule = [30000, 120000, 300000];
  return schedule[block < schedule.length ? block : schedule.length - 1];
}

PinGuardState applyPinFailure(PinGuardState guard, int now) {
  final failures = guard.failures + 1;
  final pause = frictionPauseMs(failures);
  return PinGuardState(failures: failures, pausedUntil: pause > 0 ? now + pause : guard.pausedUntil);
}

PinGuardState applyPinSuccess() => const PinGuardState();

int pinPauseRemainingMs(PinGuardState guard, int now) {
  final r = guard.pausedUntil - now;
  return r > 0 ? r : 0;
}

/* ---------------- lock state machine (§4.4) ---------------- */

class PinLockState {
  final bool locked;
  final int lastActivityAt;
  const PinLockState({this.locked = false, this.lastActivityAt = 0});
}

sealed class PinLockEvent {
  const PinLockEvent();
}

class PinLaunch extends PinLockEvent {
  final bool hasRecord;
  final int now;
  const PinLaunch(this.hasRecord, this.now);
}

class PinActivity extends PinLockEvent {
  final int now;
  const PinActivity(this.now);
}

class PinCheck extends PinLockEvent {
  final int now;
  final int idleMinutes;
  const PinCheck(this.now, this.idleMinutes);
}

class PinLockNow extends PinLockEvent {
  const PinLockNow();
}

class PinUnlock extends PinLockEvent {
  final int now;
  const PinUnlock(this.now);
}

PinLockState pinLockReducer(PinLockState state, PinLockEvent event) {
  switch (event) {
    case PinLaunch():
      return PinLockState(locked: event.hasRecord, lastActivityAt: event.now);
    case PinActivity():
      return state.locked ? state : PinLockState(locked: false, lastActivityAt: event.now);
    case PinCheck():
      if (state.locked || event.idleMinutes == 0) return state;
      return event.now - state.lastActivityAt >= event.idleMinutes * 60000
          ? PinLockState(locked: true, lastActivityAt: state.lastActivityAt)
          : state;
    case PinLockNow():
      return PinLockState(locked: true, lastActivityAt: state.lastActivityAt);
    case PinUnlock():
      return PinLockState(locked: false, lastActivityAt: event.now);
  }
}

/* ---------------- E5 sensitive-action gating ---------------- */

/// The E5 v1 gate list (design §4.6) — exactly these actions, no more:
/// void posted bill · day-close submit · period close/reopen ·
/// fiscal close/reopen. Payroll/loan money actions are NOT gated.
const Set<String> sensitiveActions = {
  'voidBill',
  'dayCloseSubmit',
  'periodClose',
  'periodReopen',
  'fiscalClose',
  'fiscalReopen',
};

/// The gate applies ONLY when this device has a PIN record AND the
/// owner turned the pref on.
bool pinGateRequired(PinLockPrefs prefs, bool hasRecord) => hasRecord && prefs.gateSensitive;

/// A gated write composes exactly when the gate is not required or
/// the challenge passed. Fail/cancel composes NOTHING.
bool gateAllows(bool required, String outcome) {
  if (!required) return true;
  return outcome == 'pass';
}
