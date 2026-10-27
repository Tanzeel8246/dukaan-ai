/// F4 core edge tests (no fixtures): the refusal and boundary
/// behaviour of the Phase D ports that the golden scenarios do
/// not exercise — proration edges, ordinal charge discipline,
/// split validation, close-state edges, branding caps, Raast
/// guards, CSV quoting and the CRC check value.
import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/branding.dart';
import 'package:dukaan_ai/core/fiscal.dart';
import 'package:dukaan_ai/core/ledger.dart';
import 'package:dukaan_ai/core/loans.dart';
import 'package:dukaan_ai/core/payroll.dart';
import 'package:dukaan_ai/core/periods.dart' hide addDaysISO;
import 'package:dukaan_ai/core/raast.dart';
import 'package:dukaan_ai/core/tally.dart';
import 'package:dukaan_ai/core/types.dart';

Employee _emp({String basis = 'monthly', double base = 30000, int paidLeave = 0}) =>
    Employee(id: 'e1', name: 'Test', payBasis: basis, baseAmount: base, paidLeaveDays: paidLeave);

Loan _loan({String direction = 'payable', String chargeType = 'flat', double rate = 10,
    double principal = 100000, int count = 7, List<LoanEvent> events = const [],
    String status = 'active'}) =>
    Loan(
      id: 'l1', number: 'LN-1', direction: direction, partyName: 'Bank',
      principal: principal, chargeType: chargeType, chargeRate: rate,
      chargeAmount: chargeType == 'flat' ? principal * rate / 100 : 0,
      startDateISO: '2026-07-01', instalmentCount: count, firstDueISO: '2026-08-01',
      events: events, status: status);

void main() {
  group('payroll proration edges (§1.4)', () {
    test('monthly: leave allowance absorbs absences first', () {
      const sum = AttendanceSummary(present: 20, absent: 5, half: 0, leave: 0, off: 5, markedDays: 30, workedUnits: 25);
      final r = earnedBaseFor(_emp(paidLeave: 2), sum, 30);
      expect(r.unpaidAbsent, 3);
      expect(r.earnedBase, 27000); // 30000 × 27/30
    });
    test('monthly: no attendance doc at all earns the full base', () {
      final r = earnedBaseFor(_emp(), attendanceSummary(null), 30);
      expect(r.unpaidAbsent, 0);
      expect(r.earnedBase, 30000);
    });
    test('daily: half days count half; leave/off do not pay', () {
      const sum = AttendanceSummary(present: 10, absent: 2, half: 3, leave: 4, off: 1, markedDays: 20, workedUnits: 16.5);
      final r = earnedBaseFor(_emp(basis: 'daily', base: 800), sum, 31);
      expect(r.earnedBase, 9200); // 800 × 11.5
    });
    test('accrual builder returns null when nothing accrues', () {
      final run = PayrollRun(id: 'r', month: '2026-09', lines: [
        PayrollRunLine(employeeId: 'e1', name: 'T', netAccrued: 0),
      ]);
      expect(buildPayrollAccrualEntry(run), isNull);
    });
    test('attendance summary ignores unknown marks', () {
      final doc = AttendanceMonth(id: 'x', days: {'1': 'present', '2': 'weird', '3': 'half'});
      final sum = attendanceSummary(doc);
      expect(sum.markedDays, 2);
      expect(sum.workedUnits, 1.5);
    });
  });

  group('loans — ordinal charges and split discipline (§3.4)', () {
    test('splitEvenly: cumulative allocation sums exactly to the total', () {
      // The web's cumulative-allocation discipline (verified
      // against lib/loans splitEvenly via the golden schedule):
      // parts alternate 14285.71/14285.72 and sum to exactly
      // 100,000 — the residual is spread, never dumped whole.
      final parts = splitEvenly(100000, 7);
      expect(parts.length, 7);
      expect((parts.fold(0.0, (a, b) => a + b) - 100000).abs(), lessThan(0.001));
      expect(parts, [14285.71, 14285.72, 14285.71, 14285.72, 14285.71, 14285.72, 14285.71]);
      final three = splitEvenly(100, 3);
      expect(three[0], closeTo(33.33, 0.001));
      expect(three[1], closeTo(33.34, 0.001));
      expect(three[2], closeTo(33.33, 0.001));
    });
    test('nextChargeAccrual is ordinal and stops at the schedule end', () {
      var loan = _loan(events: const [LoanEvent(kind: 'drawdown', amount: 100000, principalPart: 100000)]);
      expect(nextChargeAccrual(loan)?.n, 1);
      loan = loan.copyWith(events: [
        ...loan.events,
        const LoanEvent(kind: 'charge', amount: 1428.57, chargePart: 1428.57, entryId: 'x'),
      ]);
      expect(nextChargeAccrual(loan)?.n, 2);
      // A reversal un-accrues the latest: [+, −, +] nets to ONE
      // standing accrual (instalment 1), so next is instalment 2.
      loan = loan.copyWith(events: [
        ...loan.events,
        const LoanEvent(kind: 'charge', amount: -1428.57, chargePart: -1428.57, entryId: 'y'),
        const LoanEvent(kind: 'charge', amount: 1428.57, chargePart: 1428.57, entryId: 'z'),
      ]);
      expect(accruedChargeCount(loan), 1);
      expect(nextChargeAccrual(loan)?.n, 2);
    });
    test('receivable and fee_only loans never propose a charge', () {
      expect(nextChargeAccrual(_loan(direction: 'receivable', chargeType: 'none')), isNull);
      expect(nextChargeAccrual(_loan(chargeType: 'fee_only')), isNull);
      expect(nextChargeAccrual(_loan(chargeType: 'none')), isNull);
      expect(nextChargeAccrual(_loan(status: 'settled')), isNull);
    });
    test('split validation: bad sums and side overflows refuse', () {
      final loan = _loan(events: const [
        LoanEvent(kind: 'drawdown', amount: 100000, principalPart: 100000),
        LoanEvent(kind: 'charge', amount: 2000, chargePart: 2000, entryId: 'c'),
      ]);
      expect(repaymentSplitError(loan, 5000, (principalPart: 4000.0, chargePart: 500.0)), 'split');
      expect(repaymentSplitError(loan, 5000, (principalPart: 2000.0, chargePart: 3000.0)), 'split'); // charge side over
      expect(repaymentSplitError(loan, 5000, (principalPart: 3000.0, chargePart: 2000.0)), isNull);
      expect(repaymentSplitError(loan, 0, (principalPart: 0.0, chargePart: 0.0)), 'split');
    });
    test('cancelled status is sticky through loanStatusFor', () {
      expect(loanStatusFor(_loan(status: 'cancelled')), 'cancelled');
    });
    test('addMonthsISO clamps to the target month length', () {
      expect(addMonthsISO('2026-01-31', 1), '2026-02-28');
      expect(addMonthsISO('2028-01-31', 1), '2028-02-29');
      expect(addDaysISO('2026-12-31', 1), '2027-01-01');
      expect(instalmentDueISO(_loan(), 3), '2026-10-01');
    });
  });

  group('fiscal — close-state edges (§4.4)', () {
    test('a zero-movement year composes no closing entry', () {
      const range = FiscalYearRange('2025-07-01', '2026-06-30', '2025-06-30T19:00:00.000Z', '2026-06-30T19:00:00.000Z');
      expect(buildFiscalClosingEntry(const [], range, 'p1'), isNull);
    });
    test('balance-sheet codes exclude exactly the P&L set', () {
      final bs = balanceSheetAccountCodes();
      expect(bs.contains('purchases'), isTrue); // clearing carries forward
      expect(bs.contains('sales_revenue'), isFalse);
      // 28 at F4; H1/H2 added the loyalty pair (loyalty_payable to
      // the balance sheet, expense_loyalty to the P&L set) => 30;
      // 2026-10-27 added customer_advances (liability, balance
      // sheet) => 31 (owner decision: web convention).
      expect(bs.length + plAccountCodes().length, 31);
      expect(bs.contains('loyalty_payable'), isTrue);
      expect(bs.contains('customer_advances'), isTrue);
      expect(plAccountCodes().contains('expense_loyalty'), isTrue);
    });
    test('close state: never closed reads open', () {
      const range = FiscalYearRange('2025-07-01', '2026-06-30', 'F', 'T');
      final st = fiscalCloseState(const [], const [], range);
      expect(st.closed, isFalse);
      expect(st.closeDoc, isNull);
    });
  });

  group('branding — the cap is hard (§2.2)', () {
    test('buildBrandingAsset refuses an over-cap payload', () {
      final big = 'data:image/png;base64,${'A' * 200001}';
      expect(buildBrandingAsset('logo', big, 100, 100, 't'), isNull);
    });
    test('buildBrandingAsset refuses a non-image data URL', () {
      expect(buildBrandingAsset('logo', 'data:text/html;base64,QUJD', 100, 100, 't'), isNull);
    });
    test('the ladder walks down until an encode fits', () {
      var calls = 0;
      final outcome = runCompressionPlan('logo', width: 1200, height: 900, hasAlpha: false,
        encode: (step) {
          calls++;
          // Steps 0–2 report over-cap; step 3 fits.
          return (dataUrl: 'data:image/jpeg;base64,QUJD', bytes: calls < 4 ? 999999 : 42);
        });
      expect(outcome.ok, isTrue);
      expect(outcome.stepIndex, 3);
      expect(calls, 4);
    });
    test('the ladder refuses with figures when nothing fits', () {
      final outcome = runCompressionPlan('logo', width: 1200, height: 900, hasAlpha: false,
        encode: (step) => (dataUrl: 'data:image/jpeg;base64,QUJD', bytes: 999999));
      expect(outcome.ok, isFalse);
      expect(outcome.capBytes, 150000);
      expect(outcome.lastBytes, 999999);
      expect(outcome.stepsTried, 4);
    });
    test('fitWithinBox never upscales', () {
      final fit = fitWithinBox(100, 50, brandingSpecs['logo']!);
      expect(fit.width, 100);
      expect(fit.height, 50);
    });
  });

  group('raast — guards and CRC (§3.2/§3.3)', () {
    test('CRC-16/CCITT-FALSE check value', () {
      expect(crc16CcittHex('123456789'), '29B1');
    });
    test('FI name: empty is fine, 26 chars refuse, Urdu refuses', () {
      expect(validateRaastFiName('').ok, isTrue);
      expect(validateRaastFiName('A' * 26).code, 'fiTooLong');
      expect(validateRaastFiName('میزان').code, 'fiBadChars');
    });
    test('amount formatting trims zeros and refuses overflow', () {
      expect(formatRaastAmount(1500), '1500');
      expect(formatRaastAmount(1500.50), '1500.5');
      expect(formatRaastAmount(0.1), '0.1');
      expect(() => formatRaastAmount(12345678901), throwsA(isA<RaastError>()));
      expect(() => formatRaastAmount(0), throwsA(isA<RaastError>()));
      expect(() => formatRaastAmount(-5), throwsA(isA<RaastError>()));
    });
    test('the builder refuses an invalid IBAN and bad particulars', () {
      expect(() => buildRaastP2pPayload(const RaastP2pInput(iban: 'PK00')),
          throwsA(isA<RaastError>()));
      expect(
          () => buildRaastP2pPayload(RaastP2pInput(iban: raastSampleIban, particulars: 'x' * 31)),
          throwsA(isA<RaastError>()));
    });
    test('a tampered payload fails its CRC', () {
      final good = buildRaastP2pPayload(const RaastP2pInput(iban: raastSampleIban));
      final bad = '${good.substring(0, good.length - 1)}${good.endsWith('0') ? '1' : '0'}';
      expect(parseRaastP2pPayload(bad).ok, isFalse);
      expect(parseRaastP2pPayload(bad).code, 'crc');
    });
    test('print resolution: bank image wins; other docs get none', () {
      final img = resolveRaastBlock(const RaastPrintInput(
        enabled: true, imagePresent: true, iban: raastSampleIban,
        doc: RaastDocContext('bill', billNo: 5, total: 900, dynamic: true)));
      expect(img.path, 'image');
      final none = resolveRaastBlock(const RaastPrintInput(
        enabled: true, imagePresent: false, iban: raastSampleIban,
        doc: RaastDocContext('other')));
      expect(none.path, 'none');
      final gen = resolveRaastBlock(const RaastPrintInput(
        enabled: true, imagePresent: false, iban: raastSampleIban,
        doc: RaastDocContext('poster'), size: 'l', thermal: true));
      expect(gen.path, 'generated');
      expect(gen.sizeMm, 28); // thermal cap
      expect(gen.dynamic, isFalse);
    });
  });

  group('tally — naming and CSV discipline (§5)', () {
    test('voucher types: directional defaults + fixed table', () {
      expect(tallyVoucherType('loan_drawdown'), 'Contra');
      expect(tallyVoucherType('loan_drawdown', 'receivable'), 'Receipt');
      expect(tallyVoucherType('loan_repayment'), 'Payment');
      expect(tallyVoucherType('bill'), 'Sales');
      expect(tallyVoucherType('unknown_ref'), 'Journal');
    });
    test('ledger name override trims; group never moves', () {
      const settings = ShopSettingsView(tallyLedgerNames: {'cash': '  Main Till  '});
      expect(tallyLedgerName('cash', settings), 'Main Till');
      expect(tallyLedgerMap['cash']!.group, 'Cash-in-Hand');
      expect(tallyLedgerName('cash', null), 'Cash');
    });
    test('toCSV quotes only when needed and doubles quotes', () {
      final csv = toCSV(['A', 'B'], [
        ['plain', 'has,comma'],
        ['has"quote', 'line\nbreak'],
        [1500, 1500.5],
      ]);
      expect(csv, 'A,B\nplain,"has,comma"\n"has""quote","line\nbreak"\n1500,1500.5');
    });
    test('entryDateISO prefers a valid stamp', () {
      final stamped = JournalEntry(id: 'x', memo: 'm', refType: 'bill', lines: const [],
          dayOffset: 0, ts: '2026-08-10T09:00:00.000Z', dateISO: '2026-06-30');
      expect(entryDateISO(stamped), '2026-06-30');
      final unstamped = JournalEntry(id: 'x', memo: 'm', refType: 'bill', lines: const [],
          dayOffset: 0, ts: '2026-08-10T09:00:00.000Z');
      expect(entryDateISO(unstamped), '2026-08-10');
    });
  });

  group('ledger choke point still guards (makeEntry)', () {
    test('an unbalanced composition throws', () {
      expect(
        () => makeEntry('x', 'bill', null, [
          const JournalLine(account: 'cash', debit: 100, credit: 0),
        ]),
        throwsA(isA<StateError>()));
    });
  });
}
