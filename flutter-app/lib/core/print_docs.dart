/// Designed document pages beyond the bill receipt (F5, closing
/// the F2/F3/F4 print partials): RV/PV vouchers, the job work
/// slip, the salary slip and generic report pages — the Dart port
/// of the web's DocPrintSheet layouts (web/lib/print.ts slot
/// matrix + DocPrintSheet.tsx). Like the web sheets, these
/// builders are DUMB renderers: every figure is derived by the
/// caller from the journal/documents; the page stores nothing.
///
/// Slot discipline (web PRINT_SLOTS): vouchers carry the shop
/// signature slot; the work slip carries the RECEIVER's ruled line
/// (customer signature — body content, never the shop signature);
/// the salary slip carries the shop signature slot; reports get
/// the footer note only. A challan-style price ban is structural
/// here too: the work slip's material rows show quantities and
/// values exactly as the web slip does.
import 'documents.dart';
import 'jobs.dart';
import 'mc_workflow.dart' show formatDdMmYyyy;
import 'print.dart';
import 'types.dart';

/// One printed row: cells[0] is the label (start-aligned), the
/// rest are right-aligned values.
class DocRow {
  final List<String> cells;
  final bool strong;
  const DocRow(this.cells, {this.strong = false});
}

class DocSection {
  final String? title;
  final List<DocRow> rows;
  const DocSection({this.title, this.rows = const []});
}

class DocPageData {
  final String shopName;
  final String shopAddress;
  final String shopPhone;
  final PrintDesignView design;
  final String title;
  final String titleRight; // document number / period, title row right side
  final String? partyLine; // prominent line under the title (party name)
  final List<DocRow> meta;
  final List<DocSection> sections;
  final List<DocRow> totals;
  final String? note;
  final String? signatureLabel; // ruled-line label per the slot matrix
  const DocPageData({
    required this.shopName, required this.shopAddress, required this.shopPhone,
    required this.design, required this.title, this.titleRight = '',
    this.partyLine, this.meta = const [], this.sections = const [],
    this.totals = const [], this.note, this.signatureLabel,
  });
}

({String name, String address, String phone, PrintDesignView design}) _shop(
        Map<String, dynamic> ownerDoc) =>
    (
      name: ownerDoc['shopName']?.toString() ?? '',
      address: ownerDoc['shopAddress']?.toString() ?? '',
      phone: ownerDoc['shopPhone']?.toString() ?? '',
      design: resolvePrintDesign(ownerDoc),
    );

/// MC workflow adoption: document dates print DD/MM/YYYY, never ISO.
String _dateOf(String ts) => formatDdMmYyyy(ts);

/* ---------------- delivery challan ---------------- */

/// MC workflow §3 — challan print page: the shop's OWN branding
/// (via [_shop], never another tenant's stored image), quantities
/// only (a challan carries no prices), date DD/MM/YYYY.
DocPageData challanDocPage({
  required DeliveryChallan challan,
  required Map<String, dynamic> ownerDoc,
  required String title,
  required String dateLabel,
  required String vehicleLabel,
  required String driverLabel,
  required String receivedByLabel,
  required String Function(double) qty,
}) {
  final shop = _shop(ownerDoc);
  return DocPageData(
    shopName: shop.name, shopAddress: shop.address, shopPhone: shop.phone,
    design: shop.design,
    title: title,
    titleRight: challan.number ?? '',
    partyLine: challan.customerName.isNotEmpty ? challan.customerName : null,
    meta: [
      DocRow([dateLabel, _dateOf(challan.ts)]),
      if (challan.orderId != null) DocRow(['SO', challan.orderId!]),
      if (challan.vehicleNo.isNotEmpty) DocRow([vehicleLabel, challan.vehicleNo]),
      if (challan.driverName.isNotEmpty) DocRow([driverLabel, challan.driverName]),
    ],
    sections: [
      DocSection(rows: [
        for (final l in challan.lines) DocRow([l.name, qty(l.qty)]),
      ]),
    ],
    note: challan.note.isNotEmpty ? challan.note : null,
    signatureLabel: receivedByLabel,
  );
}

/* ---------------- vouchers (RV / PV) ---------------- */

DocPageData voucherDocPage({
  required VoucherPrintData v,
  required Map<String, dynamic> ownerDoc,
  required String title,
  required String dateLabel,
  required String amountLabel,
  required String balanceLabel,
  required String signatureLabel,
  required String chequeLabel,
  required String bankLabel,
  required String Function(double) money,
}) {
  final shop = _shop(ownerDoc);
  return DocPageData(
    shopName: shop.name, shopAddress: shop.address, shopPhone: shop.phone,
    design: shop.design,
    title: title,
    titleRight: v.number,
    partyLine: v.partyName,
    meta: [
      DocRow([dateLabel, _dateOf(v.ts)]),
      if (v.accountName != null && v.accountName!.isNotEmpty)
        DocRow([v.method, v.accountName!]),
      if (v.chequeNo != null && v.chequeNo!.isNotEmpty)
        DocRow([chequeLabel, v.chequeNo!]),
      if (v.bankName != null && v.bankName!.isNotEmpty)
        DocRow([bankLabel, v.bankName!]),
    ],
    totals: [
      DocRow([amountLabel, money(v.amount)], strong: true),
      if (v.balanceAfter != null) DocRow([balanceLabel, money(v.balanceAfter!)]),
    ],
    note: v.note,
    signatureLabel: signatureLabel,
  );
}

/* ---------------- job work slip ---------------- */

DocPageData jobSlipDocPage({
  required Job job,
  required Map<String, dynamic> ownerDoc,
  required String warehouseName,
  required String title,
  required String customerLabel,
  required String stageLabel,
  required String dueLabel,
  required String warehouseLabel,
  required String materialsTitle,
  required String issuedLabel,
  required String returnedLabel,
  required String netMaterialsLabel,
  required String labourLabel,
  required String receivedByLabel,
  required String noMaterialsLabel,
  required String Function(double) money,
  required String Function(double) qty,
}) {
  final shop = _shop(ownerDoc);
  return DocPageData(
    shopName: shop.name, shopAddress: shop.address, shopPhone: shop.phone,
    design: shop.design,
    title: title,
    titleRight: job.number,
    partyLine: job.title.isNotEmpty ? job.title : null,
    meta: [
      DocRow([customerLabel, job.customerName]),
      if (job.description.isNotEmpty) DocRow(['', job.description]),
      DocRow([stageLabel, job.stage]),
      if (job.dueDateISO != null && job.dueDateISO!.isNotEmpty)
        DocRow([dueLabel, job.dueDateISO!]),
      DocRow([warehouseLabel, warehouseName]),
    ],
    sections: [
      DocSection(
        title: materialsTitle,
        rows: job.materialEvents.isEmpty
            ? [DocRow([noMaterialsLabel])]
            : [
                for (final e in job.materialEvents)
                  DocRow([
                    '${e.kind == 'return' ? returnedLabel : issuedLabel} · ${e.name}',
                    qty(e.qty),
                    money(e.value),
                  ]),
              ],
      ),
    ],
    totals: [
      DocRow([netMaterialsLabel, money(jobMaterialsCost(job))], strong: true),
      if (job.labourCost > 0) DocRow([labourLabel, money(job.labourCost)]),
    ],
    note: job.note.isNotEmpty ? job.note : null,
    signatureLabel: receivedByLabel,
  );
}

/* ---------------- salary slip ---------------- */

/// The §2.7 derived figures the desk computes at print time
/// (advance before / recovered in this run / cash paid / still
/// owed) — mirrors web runLineFigures.
class SlipFigures {
  final double advanceBefore;
  final double advanceRecovered;
  final double cashPaid;
  final double stillOwed;
  const SlipFigures({
    required this.advanceBefore, required this.advanceRecovered,
    required this.cashPaid, required this.stillOwed,
  });
}

DocPageData salarySlipDocPage({
  required PayrollRun run,
  required PayrollRunLine line,
  required String designation,
  required SlipFigures figures,
  required Map<String, dynamic> ownerDoc,
  required String title,
  required String monthLabel,
  required String employeeLabel,
  required String designationLabel,
  required String attendanceLabel,
  required String attendanceText,
  required String earningsTitle,
  required String baseLabel,
  required String grossLabel,
  required String deductionsTitle,
  required String netLabel,
  required String advanceBeforeLabel,
  required String advanceRecoveredLabel,
  required String paidLabel,
  required String stillOwedLabel,
  required String signatureLabel,
  required String Function(double) money,
}) {
  final shop = _shop(ownerDoc);
  return DocPageData(
    shopName: shop.name, shopAddress: shop.address, shopPhone: shop.phone,
    design: shop.design,
    title: title,
    titleRight: run.number ?? '',
    meta: [
      DocRow([monthLabel, run.month]),
      DocRow([employeeLabel, line.name]),
      if (designation.isNotEmpty) DocRow([designationLabel, designation]),
      DocRow([attendanceLabel, attendanceText]),
    ],
    sections: [
      DocSection(
        title: earningsTitle,
        rows: [
          DocRow([baseLabel, money(line.earnedBase)]),
          for (final a in line.allowances) DocRow([a.label, money(a.amount)]),
          DocRow([grossLabel, money(line.gross)], strong: true),
        ],
      ),
      if (line.deductions.isNotEmpty)
        DocSection(
          title: deductionsTitle,
          rows: [
            for (final d in line.deductions) DocRow([d.label, '−${money(d.amount)}']),
          ],
        ),
    ],
    totals: [
      DocRow([netLabel, money(line.netAccrued)], strong: true),
      DocRow([advanceBeforeLabel, money(figures.advanceBefore)]),
      DocRow([advanceRecoveredLabel, money(figures.advanceRecovered)]),
      DocRow([paidLabel, money(figures.cashPaid)]),
      DocRow([stillOwedLabel, money(figures.stillOwed)], strong: true),
    ],
    signatureLabel: signatureLabel,
  );
}

/* ---------------- generic report page ---------------- */

DocPageData reportDocPage({
  required String title,
  required Map<String, dynamic> ownerDoc,
  required String periodLabel,
  required String period,
  required List<({String label, String value})> lines,
  String? footer,
}) {
  final shop = _shop(ownerDoc);
  return DocPageData(
    shopName: shop.name, shopAddress: shop.address, shopPhone: shop.phone,
    design: shop.design,
    title: title,
    meta: [DocRow([periodLabel, period])],
    sections: [
      DocSection(rows: [
        for (final l in lines)
          DocRow(l.value.isEmpty ? [l.label] : [l.label, l.value]),
      ]),
    ],
    note: footer,
  );
}

/* ---------------- plain text (share / WhatsApp) ---------------- */

String docPagePlainText(DocPageData d) {
  final b = StringBuffer();
  if (d.design.showShopName && d.shopName.isNotEmpty) b.writeln(d.shopName);
  if (d.design.showAddress && d.shopAddress.isNotEmpty) b.writeln(d.shopAddress);
  if (d.design.showPhone && d.shopPhone.isNotEmpty) b.writeln(d.shopPhone);
  b.writeln(d.titleRight.isEmpty ? d.title : '${d.title} · ${d.titleRight}');
  if (d.partyLine != null && d.partyLine!.isNotEmpty) b.writeln(d.partyLine);
  for (final r in d.meta) {
    b.writeln(r.cells.where((c) => c.isNotEmpty).join(' · '));
  }
  b.writeln('—' * 24);
  for (final sec in d.sections) {
    if (sec.title != null && sec.title!.isNotEmpty) b.writeln(sec.title);
    for (final r in sec.rows) {
      b.writeln(r.cells.where((c) => c.isNotEmpty).join(' · '));
    }
  }
  if (d.totals.isNotEmpty) b.writeln('—' * 24);
  for (final r in d.totals) {
    b.writeln(r.cells.where((c) => c.isNotEmpty).join(' · '));
  }
  if (d.note != null && d.note!.isNotEmpty) b.writeln(d.note);
  if (d.design.showThanks) {
    b.writeln(d.design.thanksText);
  }
  if (d.design.footerNote.isNotEmpty) b.writeln(d.design.footerNote);
  return b.toString();
}
