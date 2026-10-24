/// Dart core unit tests (Phase F design §8.3, F1 subset): the guard,
/// period lock, numbering, PIN known-answer vectors + friction, and
/// the money-account legacy-resolution identity.
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/documents.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/periods.dart';
import 'package:dukaan_ai/core/pinlock.dart';
import 'package:dukaan_ai/core/types.dart';

String hex(Uint8List b) => b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();

void main() {
  group('makeEntry (F-1)', () {
    test('throws on an unbalanced construction', () {
      expect(
        () => makeEntry('bad', 'sale', 'x', [const JournalLine(account: 'cash', debit: 100)]),
        throwsStateError,
      );
    });
    test('filters zero lines and keeps balanced ones', () {
      final e = makeEntry('ok', 'sale', 'x', [
        const JournalLine(account: 'cash', debit: 100),
        const JournalLine(account: 'wallet', debit: 0, credit: 0),
        const JournalLine(account: 'sales_revenue', credit: 100),
      ]);
      expect(e.lines.length, 2);
      expect(entryBalances(e), isTrue);
    });
  });

  group('preparePosting (A5)', () {
    test('stamps dateISO at the PKT boundary', () {
      // 2026-10-22T19:30Z is 2026-10-23 00:30 in Karachi.
      final e = makeEntry('m', 'sale', 'x', [
        const JournalLine(account: 'cash', debit: 1),
        const JournalLine(account: 'sales_revenue', credit: 1),
      ], ts: '2026-10-22T19:30:00.000Z');
      final stamped = preparePosting(e, null);
      expect(stamped.dateISO, '2026-10-23');
    });
    test('refuses an entry dated inside the lock; passes one after', () {
      final lock = endOfDayPktInstant('2026-10-20');
      final inside = makeEntry('m', 'sale', 'x', [
        const JournalLine(account: 'cash', debit: 1),
        const JournalLine(account: 'sales_revenue', credit: 1),
      ], ts: '2026-10-20T10:00:00.000Z');
      expect(() => preparePosting(inside, lock), throwsA(isA<PeriodLockedError>()));
      final after = makeEntry('m', 'sale', 'x', [
        const JournalLine(account: 'cash', debit: 1),
        const JournalLine(account: 'sales_revenue', credit: 1),
      ], ts: '2026-10-21T10:00:00.000Z');
      expect(preparePosting(after, lock).dateISO, '2026-10-21');
    });
    test('an entry already carrying dateISO keeps it (legacy reading)', () {
      final e = JournalEntry(
        id: 'j1', memo: 'm', refType: 'sale', refId: 'x',
        lines: const [JournalLine(account: 'cash', debit: 1), JournalLine(account: 'sales_revenue', credit: 1)],
        ts: '2026-10-22T10:00:00.000Z', dateISO: '2026-10-22',
      );
      expect(preparePosting(e, null).dateISO, '2026-10-22');
    });
    test('businessDateISO / todayPktISO agree with the web primitives', () {
      expect(businessDateISO('2026-01-01T18:59:59.000Z'), '2026-01-01');
      expect(businessDateISO('2026-01-01T19:00:00.000Z'), '2026-01-02');
      expect(addDaysISO('2026-02-28', 1), '2026-03-01');
      expect(isValidDateISO('2026-02-30'), isFalse);
      expect(isValidDateISO('2026-02-28'), isTrue);
    });
  });

  group('numbering (§3.6 hardening)', () {
    test('nextDocNumber is max+1 with default and override prefixes', () {
      expect(nextDocNumber('quotation', ['QT-1', 'QT-7', 'QT-3'], const {}), 'QT-8');
      expect(nextDocNumber('quotation', const [], const {}), 'QT-1');
      expect(nextDocNumber('quotation', ['QT-7'], const {'quotation': 'Q/'}), 'Q/8');
      expect(nextDocNumber('loan', ['LN-2', null, 'draft'], const {}), 'LN-3');
    });
    test('nextBillNo is max+1 and starts at 1', () {
      expect(nextBillNo(const []), 1);
      expect(nextBillNo(const [1, 9, 4]), 10);
    });
    test('duplicateNumbers flags only true collisions', () {
      final dups = duplicateNumbers([
        (id: 'a', number: 'QT-5'),
        (id: 'b', number: 'QT-5'),
        (id: 'c', number: 'QT-6'),
        (id: 'd', number: null),
        (id: 'e', number: ''),
      ]);
      expect(dups.length, 1);
      expect(dups.single.number, 'QT-5');
      expect(dups.single.docIds, ['a', 'b']);
      expect(duplicateNumbers([(id: 'a', number: 'QT-1')]), isEmpty);
    });
  });

  group('PIN (E4 vectors + friction)', () {
    test('PBKDF2-HMAC-SHA256 RFC 7914 §11 known-answer vectors', () {
      final salt = Uint8List.fromList(utf8.encode('salt'));
      expect(hex(derivePinBits('password', salt, 1)),
          '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b');
      expect(hex(derivePinBits('password', salt, 2)),
          'ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43');
      expect(hex(derivePinBits('password', salt, 4096)),
          'c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a');
    });
    test('record round-trip: create → verify accepts, wrong PIN rejects', () {
      final rec = createPinRecord('4821');
      expect(rec.iterations, pinIterations);
      expect(rec.digits, 4);
      expect(verifyPin('4821', rec), isTrue);
      expect(verifyPin('4822', rec), isFalse);
      expect(verifyPin('482', rec), isFalse);
      final restored = PinLockRecord.fromJson(jsonDecode(jsonEncode(rec.toJson())));
      expect(restored, isNotNull);
      expect(verifyPin('4821', restored!), isTrue);
      // The stored record never contains the PIN itself.
      expect(jsonEncode(rec.toJson()).contains('4821'), isFalse);
    });
    test('friction schedule points', () {
      expect(frictionPauseMs(4), 0);
      expect(frictionPauseMs(5), 30000);
      expect(frictionPauseMs(9), 30000);
      expect(frictionPauseMs(10), 120000);
      expect(frictionPauseMs(15), 300000);
      expect(frictionPauseMs(100), 300000);
      var guard = const PinGuardState();
      for (var i = 0; i < 5; i++) {
        guard = applyPinFailure(guard, 1000000);
      }
      expect(guard.failures, 5);
      expect(pinPauseRemainingMs(guard, 1000000), 30000);
      expect(applyPinSuccess().failures, 0);
    });
    test('lock reducer: launch locks with a record; idle check locks', () {
      var s = pinLockReducer(const PinLockState(), const PinLaunch(true, 1000));
      expect(s.locked, isTrue);
      s = pinLockReducer(s, const PinUnlock(2000));
      expect(s.locked, isFalse);
      s = pinLockReducer(s, const PinCheck(2000 + 5 * 60000, 5));
      expect(s.locked, isTrue);
      final launchOnly = pinLockReducer(const PinLockState(), const PinLaunch(false, 0));
      expect(launchOnly.locked, isFalse);
    });
    test('E5 gate: required only with record + pref; fail/cancel compose nothing', () {
      expect(pinGateRequired(const PinLockPrefs(gateSensitive: true), true), isTrue);
      expect(pinGateRequired(const PinLockPrefs(gateSensitive: false), true), isFalse);
      expect(pinGateRequired(const PinLockPrefs(gateSensitive: true), false), isFalse);
      expect(gateAllows(true, 'pass'), isTrue);
      expect(gateAllows(true, 'fail'), isFalse);
      expect(gateAllows(true, 'cancel'), isFalse);
      expect(gateAllows(false, 'cancel'), isTrue);
      expect(sensitiveActions, containsAll(['voidBill', 'dayCloseSubmit', 'periodClose', 'fiscalClose']));
    });
  });

  group('money accounts: legacy resolution identity (A2 §1.4)', () {
    final till = MoneyAccount(id: 'till', name: 'Main Till', kind: 'cash', method: 'cash', legacyFor: 'cash', sortOrder: 0);
    final walletAcc = MoneyAccount(id: 'w1', name: 'Wallet & Bank', kind: 'wallet', legacyFor: 'wallet', sortOrder: 1);
    final jazz = MoneyAccount(id: 'jz', name: 'JazzCash', kind: 'wallet', method: 'jazzcash', sortOrder: 2);
    final accounts = [till, walletAcc, jazz];
    final entries = [
      // Legacy line: ref null → resolves to the legacyFor account.
      JournalEntry(id: 'e1', memo: '', refType: 'sale', refId: null, ts: '2026-10-22T00:00:00.000Z',
          lines: const [JournalLine(account: 'cash', debit: 1000), JournalLine(account: 'sales_revenue', credit: 1000)]),
      // Stamped line: ref = jazz.
      JournalEntry(id: 'e2', memo: '', refType: 'sale', refId: null, ts: '2026-10-22T01:00:00.000Z',
          lines: const [JournalLine(account: 'wallet', debit: 500, ref: 'jz'), JournalLine(account: 'sales_revenue', credit: 500)]),
      // Legacy wallet line.
      JournalEntry(id: 'e3', memo: '', refType: 'sale', refId: null, ts: '2026-10-22T02:00:00.000Z',
          lines: const [JournalLine(account: 'wallet', debit: 200), JournalLine(account: 'sales_revenue', credit: 200)]),
    ];
    test('null-ref lines resolve to legacyFor; stamped lines to their account', () {
      expect(moneyAccountBalance(entries, till), 1000);
      expect(moneyAccountBalance(entries, jazz), 500);
      expect(moneyAccountBalance(entries, walletAcc), 200);
    });
    test('Σ per-account == GL bucket, exactly', () {
      expect(accountsBucketBalance(entries, accounts, 'cash'), accountBalance(entries, 'cash'));
      expect(accountsBucketBalance(entries, accounts, 'wallet'), accountBalance(entries, 'wallet'));
    });
    test('defaultAccountForMethod: exact method, else legacy, never credit', () {
      expect(defaultAccountForMethod(accounts, 'jazzcash')?.id, 'jz');
      expect(defaultAccountForMethod(accounts, 'bank')?.id, 'w1');
      expect(defaultAccountForMethod(accounts, 'cash')?.id, 'till');
      expect(defaultAccountForMethod(accounts, 'credit'), isNull);
    });
  });

  group('classLegLines (C3)', () {
    test('no raw share = the single pre-C3 inventory line', () {
      final lines = classLegLines(1000, 0, 'credit');
      expect(lines.length, 1);
      expect(lines.single.account, 'inventory');
      expect(lines.single.credit, 1000);
    });
    test('raw share splits with the goods residual absorbing the paisa', () {
      final lines = classLegLines(100.01, 33.33, 'debit');
      final total = lines.fold(0.0, (a, l) => a + l.debit);
      expect(total, closeTo(100.01, 1e-9));
      expect(lines.firstWhere((l) => l.account == 'inventory_raw').debit, 33.33);
    });
  });
}
