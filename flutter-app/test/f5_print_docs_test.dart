/// F5 — the designed document pages (core/print_docs.dart): the
/// voucher, work-slip and salary-slip builders are dumb renderers
/// over derived figures; these tests pin their structure (slot
/// discipline included) without a device or a printer.
import 'package:flutter_test/flutter_test.dart';
import 'package:dukaan_ai/core/documents.dart';
import 'package:dukaan_ai/core/print_docs.dart';
import 'package:dukaan_ai/core/types.dart';

const owner = {
  'shopName': 'Madina General Store',
  'shopAddress': 'Main Bazaar Road',
  'shopPhone': '0301-2345678',
};

String rs(double v) => 'Rs ${v.toStringAsFixed(0)}';
String q(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toString();

void main() {
  group('voucher page (RV)', () {
    final page = voucherDocPage(
      v: const VoucherPrintData(
        number: 'RV-12', kind: 'receipt', partyName: 'Ahmed Traders',
        amount: 500, method: 'cash', accountName: 'Main Till',
        balanceAfter: 500, note: 'part payment', ts: '2026-09-09T10:00:00.000Z',
      ),
      ownerDoc: owner,
      title: 'Receipt Voucher', dateLabel: 'Date', amountLabel: 'Amount',
      balanceLabel: 'Outstanding balance now', signatureLabel: 'Signature',
      chequeLabel: 'Cheque', bankLabel: 'Bank', money: rs,
    );
    test('header, party, amount + balance totals, shop signature slot', () {
      expect(page.shopName, 'Madina General Store');
      expect(page.title, 'Receipt Voucher');
      expect(page.titleRight, 'RV-12');
      expect(page.partyLine, 'Ahmed Traders');
      expect(page.totals.first.cells, ['Amount', 'Rs 500']);
      expect(page.totals.first.strong, isTrue);
      expect(page.totals.last.cells, ['Outstanding balance now', 'Rs 500']);
      expect(page.signatureLabel, 'Signature');
      expect(page.note, 'part payment');
      final text = docPagePlainText(page);
      expect(text, contains('RV-12'));
      expect(text, contains('Ahmed Traders'));
      expect(text, contains('Rs 500'));
    });
  });

  group('job work slip', () {
    final job = Job(
      id: 'job-1', number: 'JB-3', customerName: 'Bilal Ahmed',
      title: 'Gate welding', stage: 'In progress', warehouseId: 'wh-main',
      labourCost: 1500, note: 'Urgent',
      materialEvents: const [
        JobMaterialEvent(kind: 'issue', productId: 'p-rod', name: 'Welding Rod', qty: 10, unitCost: 50, value: 500, entryId: 'e1'),
        JobMaterialEvent(kind: 'return', productId: 'p-rod', name: 'Welding Rod', qty: 2, unitCost: 50, value: 100, entryId: 'e2'),
      ],
    );
    final page = jobSlipDocPage(
      job: job, ownerDoc: owner, warehouseName: 'Main Shop',
      title: 'Work slip', customerLabel: 'Customer', stageLabel: 'Stage',
      dueLabel: 'Due date', warehouseLabel: 'Warehouse',
      materialsTitle: 'Materials issued', issuedLabel: 'Issued',
      returnedLabel: 'Returned', netMaterialsLabel: 'Net materials',
      labourLabel: 'Labour', receivedByLabel: 'Received by',
      noMaterialsLabel: 'No materials issued.', money: rs, qty: q,
    );
    test('event rows verbatim, net materials derived, receiver line (customer slot)', () {
      final rows = page.sections.single.rows;
      expect(rows, hasLength(2));
      expect(rows[0].cells, ['Issued · Welding Rod', '10', 'Rs 500']);
      expect(rows[1].cells, ['Returned · Welding Rod', '2', 'Rs 100']);
      // Net = Σ issues − Σ returns (500 − 100) via jobMaterialsCost.
      expect(page.totals.first.cells, ['Net materials', 'Rs 400']);
      expect(page.totals.last.cells, ['Labour', 'Rs 1500']);
      expect(page.signatureLabel, 'Received by');
      expect(page.titleRight, 'JB-3');
    });
  });

  group('salary slip', () {
    final run = PayrollRun(
      id: 'run-1', number: 'PAY-1', month: '2026-08',
      lines: const [], payments: const [], status: 'posted',
    );
    final line = PayrollRunLine(
      employeeId: 'emp-a', name: 'Muhammad Aslam', payBasis: 'monthly',
      daysInMonth: 31, present: 26, absent: 2, half: 1, leave: 2,
      unpaidAbsent: 2, earnedBase: 28000,
      allowances: const [PayLine(label: 'Transport', amount: 2000)],
      deductions: const [PayLine(label: 'Late', amount: 500)],
      gross: 30000, netAccrued: 29500,
    );
    final page = salarySlipDocPage(
      run: run, line: line, designation: 'Salesman',
      figures: const SlipFigures(advanceBefore: 5000, advanceRecovered: 5000, cashPaid: 24500, stillOwed: 0),
      ownerDoc: owner,
      title: 'Salary Slip', monthLabel: 'Month', employeeLabel: 'Employee',
      designationLabel: 'Designation', attendanceLabel: 'Attendance',
      attendanceText: 'P 26 · A 2', earningsTitle: 'Earnings',
      baseLabel: 'Base', grossLabel: 'Gross', deductionsTitle: 'Deductions',
      netLabel: 'Net', advanceBeforeLabel: 'Advance before',
      advanceRecoveredLabel: 'Recovered', paidLabel: 'Paid',
      stillOwedLabel: 'Still owed', signatureLabel: 'Signature', money: rs,
    );
    test('earnings + deductions sections; net and settlement totals', () {
      expect(page.sections, hasLength(2));
      final earn = page.sections[0];
      expect(earn.rows.last.cells, ['Gross', 'Rs 30000']);
      expect(earn.rows.last.strong, isTrue);
      expect(page.sections[1].rows.single.cells, ['Late', '−Rs 500']);
      expect(page.totals.first.cells, ['Net', 'Rs 29500']);
      expect(page.totals.last.cells, ['Still owed', 'Rs 0']);
      expect(page.signatureLabel, 'Signature');
      expect(page.titleRight, 'PAY-1');
    });
  });

  group('report page', () {
    final page = reportDocPage(
      title: 'Sales Report', ownerDoc: owner,
      periodLabel: 'Range', period: '2026-09-07 → 2026-09-13',
      lines: const [
        (label: 'Gross sales', value: 'Rs 3,939'),
        (label: 'Net revenue', value: 'Rs 2,535'),
        (label: 'Notes section', value: ''),
      ],
    );
    test('label/value rows; a value-less line stays a single cell', () {
      final rows = page.sections.single.rows;
      expect(rows[0].cells, ['Gross sales', 'Rs 3,939']);
      expect(rows[2].cells, ['Notes section']);
      expect(page.meta.single.cells, ['Range', '2026-09-07 → 2026-09-13']);
    });
  });
}
