/// Reports (F2): the web's 14 bilingual reports rendered in-app
/// from the same core builders the harness pins — sales, purchases,
/// stock, P&L, trial balance, account statement, tax, customer and
/// supplier statements, aging, expenses, cheques, day close and
/// notes. A slim sticky toolbar carries the report picker and the
/// range presets (the owner's reports-UX rule); share sends the
/// localized text rendering (reportShareText); F5 adds the
/// designed print page (reportDocPage) on the shared transports.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';


import '../core/fiscal.dart';
import '../core/loyalty.dart';
import '../core/print_docs.dart';
import '../core/reports.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f2_common.dart';
import 'print/doc_view.dart';

class _ReportDef {
  final String id;
  final String titleKey;
  const _ReportDef(this.id, this.titleKey);
}

const _reports = [
  _ReportDef('sales', 'rep.sales.title'),
  _ReportDef('purchase', 'rep.purchase.title'),
  _ReportDef('stock', 'rep.stock.title'),
  _ReportDef('pl', 'rep.pl.title'),
  _ReportDef('trialBalance', 'rep.tb.title'),
  _ReportDef('balanceSheet', 'rep.bs.title'),
  _ReportDef('accountStatement', 'rep.cashbook.title'),
  _ReportDef('tax', 'rep.tax.title'),
  _ReportDef('customerStatement', 'rep.customer.title'),
  _ReportDef('supplierStatement', 'rep.supplier.title'),
  _ReportDef('aging', 'rep.aging.title'),
  _ReportDef('expenses', 'rep.expenses.title'),
  _ReportDef('cheques', 'rep.cheques.title'),
  _ReportDef('dayClose', 'rep.dayclose.title'),
  _ReportDef('notes', 'rep.notes.title'),
];

typedef _ShareLine = ({String label, String value});

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});
  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  // MC workflow §13 — the Reports HUB is the landing view (MC
  // Billing has no hub; Dukaan does better): one card per report,
  // one tap to open it. The picker view remains for browsing.
  bool _hub = true;
  String _report = 'sales';
  String _preset = 'month';
  String? _customerKey;
  String? _supplierId;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    if (_hub) {
      return Column(children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Align(
            alignment: AlignmentDirectional.centerStart,
            child: Text(s.raw('mc.rep.hubHelp'), style: Theme.of(context).textTheme.bodySmall),
          ),
        ),
        Expanded(
          child: GridView.count(
            crossAxisCount: 2,
            padding: const EdgeInsets.all(12),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.6,
            children: [
              for (final r in _reports)
                Card(
                  child: InkWell(
                    onTap: () => setState(() {
                      _report = r.id;
                      _hub = false;
                    }),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.assessment_outlined),
                          const SizedBox(height: 6),
                          Text(s.raw(r.titleKey), style: const TextStyle(fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ]);
    }
    final range = resolveReportRange(_preset, settings: store.settings);
    final def = _reports.firstWhere((r) => r.id == _report);
    final built = _buildReport(store, range);

    return Column(children: [
      Material(
        elevation: 1,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Row(children: [
            IconButton(
              icon: const Icon(Icons.grid_view_outlined),
              tooltip: s.raw('mc.rep.hub'),
              onPressed: () => setState(() => _hub = true),
            ),
            Expanded(
              child: DropdownButton<String>(
                value: _report,
                isExpanded: true,
                items: [
                  for (final r in _reports) DropdownMenuItem(value: r.id, child: Text(s.raw(r.titleKey))),
                ],
                onChanged: (v) => setState(() => _report = v ?? 'sales'),
              ),
            ),
            const SizedBox(width: 8),
            DropdownButton<String>(
              value: _preset,
              items: [
                for (final p in ['today', 'week', 'month', 'fiscal'])
                  DropdownMenuItem(value: p, child: Text(s.raw('rep.range.$p'))),
              ],
              onChanged: (v) => setState(() => _preset = v ?? 'month'),
            ),
            IconButton(
              icon: const Icon(Icons.print_outlined),
              tooltip: s.actionPrint,
              onPressed: () => showDocPrintSheet(
                context,
                reportDocPage(
                  title: s.raw(def.titleKey),
                  ownerDoc: store.ownerDoc,
                  periodLabel: s.raw('fin.export.range'),
                  period: '${range.fromDate} → ${range.toDate}',
                  lines: built.$1,
                ),
                jobName: 'report-${def.id}',
                width: 700,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.share_outlined),
              onPressed: () => Share.share(reportShareText(
                shopName: store.ownerDoc['shopName']?.toString() ?? '',
                title: s.raw(def.titleKey),
                periodLabel: s.raw('fin.export.range'),
                period: '${range.fromDate} → ${range.toDate}',
                lines: built.$1,
                footer: '',
              )),
            ),
          ]),
        ),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        child: Align(
          alignment: AlignmentDirectional.centerStart,
          child: Text('${range.fromDate} → ${range.toDate}', style: Theme.of(context).textTheme.bodySmall),
        ),
      ),
      if (_report == 'customerStatement')
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: DropdownButtonFormField<String>(
            initialValue: _customerKey,
            decoration: InputDecoration(labelText: s.raw('rep.customer.title'), isDense: true),
            items: [
              for (final c in store.customers) DropdownMenuItem(value: c.id, child: Text(c.name)),
            ],
            onChanged: (v) => setState(() => _customerKey = v),
          ),
        ),
      if (_report == 'supplierStatement')
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: DropdownButtonFormField<String>(
            initialValue: _supplierId,
            decoration: InputDecoration(labelText: s.raw('rep.supplier.title'), isDense: true),
            items: [
              for (final sup in store.suppliers) DropdownMenuItem(value: sup.id, child: Text(sup.name)),
            ],
            onChanged: (v) => setState(() => _supplierId = v),
          ),
        ),
      Expanded(child: built.$2),
    ]);
  }

  /// (share lines, body widget)
  (List<_ShareLine>, Widget) _buildReport(ShopStore store, ReportRange range) {
    final s = S.current;
    switch (_report) {
      case 'sales':
        final r = salesReport(store.sales, store.products, store.bills, range,
            returns: store.returns, journal: store.journal, taxSlabs: store.taxSlabs, settings: store.settings);
        final lines = <_ShareLine>[
          (label: s.raw('rep.tot.grossSales'), value: fmtRs(r.grossSales)),
          (label: s.raw('rep.tot.returns'), value: fmtRs(r.returnsTotal)),
          (label: s.raw('rep.tot.netSales'), value: fmtRs(r.netSales)),
          (label: s.raw('rep.tot.otherRevenue'), value: fmtRs(r.otherRevenue)),
          (label: s.raw('fin.pl.grossProfit'), value: fmtRs(r.grossProfit)),
          for (final p in r.byProduct) (label: p.name, value: '${p.qty} · ${fmtRs(p.amount)}'),
        ];
        return (
          lines,
          _scroll([
            for (final l in lines.take(5)) _kv(l.label, l.value),
            const Divider(),
            for (final p in r.byProduct) _row3(p.name, '${p.qty}', fmtRs(p.amount)),
          ]),
        );
      case 'purchase':
        final r = purchaseReport(store.purchases, store.purchaseReturns, store.suppliers, range);
        final lines = <_ShareLine>[
          (label: s.raw('rep.tot.grossPurchases'), value: fmtRs(r.gross)),
          (label: s.raw('rep.col.tax'), value: fmtRs(r.taxTotal)),
          (label: s.raw('rep.tot.netPurchases'), value: fmtRs(r.net)),
          for (final x in r.bySupplier) (label: x.name, value: fmtRs(x.net)),
        ];
        return (
          lines,
          _scroll([
            for (final l in lines.take(3)) _kv(l.label, l.value),
            const Divider(),
            for (final x in r.bySupplier) _row3(x.name, '', fmtRs(x.net)),
          ]),
        );
      case 'stock':
        final r = stockReport(store.products);
        final lines = <_ShareLine>[
          (label: s.raw('rep.tot.stockValue'), value: fmtRs(r.totalValue)),
          (label: s.raw('rep.tot.stockValueRetail'), value: fmtRs(r.retailValue)),
          for (final x in r.rows) (label: x.product.name, value: '${x.product.stockQty} · ${fmtRs(x.value)}'),
        ];
        return (
          lines,
          _scroll([
            for (final l in lines.take(2)) _kv(l.label, l.value),
            const Divider(),
            for (final x in r.rows) _row3(x.product.name, '${x.product.stockQty}', fmtRs(x.value)),
          ]),
        );
      case 'pl':
        final r = plReport(store.journal, range);
        final lines = <_ShareLine>[
          (label: s.raw('fin.pl.revenue'), value: fmtRs(r.revenue)),
          (label: s.raw('fin.pl.netRevenue'), value: fmtRs(r.netRevenue)),
          (label: s.raw('fin.pl.cogs'), value: fmtRs(r.cogs)),
          (label: s.raw('fin.pl.grossProfit'), value: fmtRs(r.grossProfit)),
          (label: s.raw('fin.pl.netProfit'), value: fmtRs(r.net)),
        ];
        return (lines, _scroll([for (final l in lines) _kv(l.label, l.value)]));
      case 'trialBalance':
        final r = trialBalanceReport(store.journal, range);
        final lines = <_ShareLine>[
          (label: s.raw('rep.tb.difference'), value: fmtRs(r.difference)),
          for (final x in r.rows)
            (label: accountLabel(x.account), value: '${fmtRs(x.debitTotal)} / ${fmtRs(x.creditTotal)}'),
        ];
        return (
          lines,
          _scroll([
            _kv(lines.first.label, lines.first.value),
            const Divider(),
            for (final x in r.rows) _row3(accountLabel(x.account), fmtRs(x.debitTotal), fmtRs(x.creditTotal)),
          ]),
        );
      case 'balanceSheet':
        final r = balanceSheetReport(store.journal, range);
        final lines = <_ShareLine>[
          (label: s.raw('rep.bs.totalAssets'), value: fmtRs(r.totalAssets)),
          (label: s.raw('rep.bs.totalLiabEquity'), value: fmtRs(r.totalLiabilitiesEquity)),
          (label: s.raw('rep.tb.difference'), value: fmtRs(r.difference)),
        ];
        return (
          lines,
          _scroll([
            _kv(s.raw('rep.bs.assets'), ''),
            for (final x in r.assets) _row3(accountLabel(x.account), '', fmtRs(x.balance)),
            if (r.clearing != 0) _row3(accountLabel('purchases'), '', fmtRs(r.clearing)),
            _kv(s.raw('rep.bs.totalAssets'), fmtRs(r.totalAssets)),
            const Divider(),
            _kv(s.raw('rep.bs.liabilities'), ''),
            for (final x in r.liabilities) _row3(accountLabel(x.account), '', fmtRs(x.balance)),
            _kv(s.raw('rep.col.total'), fmtRs(r.liabilitiesTotal)),
            const Divider(),
            _kv(s.raw('rep.bs.equity'), ''),
            for (final x in r.equity) _row3(accountLabel(x.account), '', fmtRs(x.balance)),
            _row3(s.raw('rep.bs.result'), '', fmtRs(r.resultToDate)),
            _kv(s.raw('rep.bs.totalLiabEquity'), fmtRs(r.totalLiabilitiesEquity)),
          ]),
        );
      case 'accountStatement':
        final r = accountStatement(store.journal, store.accounts, null, range);
        final lines = <_ShareLine>[
          for (final x in r.rows)
            (label: '${fmtDate(x.ts)} · ${x.memo}', value: x.inAmount > 0 ? '+${fmtRs(x.inAmount)}' : '−${fmtRs(x.outAmount)}'),
        ];
        return (
          lines,
          _scroll([
            for (final x in r.rows.reversed)
              _row3('${fmtDate(x.ts)} · ${x.memo}', x.inAmount > 0 ? '+${fmtRs(x.inAmount)}' : '−${fmtRs(x.outAmount)}', fmtRs(x.balance)),
          ]),
        );
      case 'tax':
        final r = taxReport(store.bills, store.returns, store.purchases, store.purchaseReturns, range);
        final lines = <_ShareLine>[
          (label: s.raw('fin.tax.output'), value: fmtRs(r.outputTotal)),
          (label: s.raw('fin.tax.input'), value: fmtRs(r.inputTotal)),
          (label: s.raw('fin.tax.netDue'), value: fmtRs(r.net)),
          for (final x in r.rows) (label: '${x.name} ${x.rate}%', value: '${fmtRs(x.output)} / ${fmtRs(x.input)}'),
        ];
        return (
          lines,
          _scroll([
            for (final l in lines.take(3)) _kv(l.label, l.value),
            const Divider(),
            for (final x in r.rows) _row3('${x.name} ${x.rate}%', fmtRs(x.output), fmtRs(x.input)),
          ]),
        );
      case 'customerStatement':
        final key = _customerKey ?? store.customers.firstOrNull?.id;
        if (key == null) return (const [], Center(child: Text(s.raw('common.none'))));
        final r = customerStatement(store.credits, key, range);
        // H2: the customer's loyalty movements for the range,
        // folded by core/loyalty (the web's customers-report
        // loyalty section) — zeros when the customer never
        // touched the programme.
        final lr = loyaltyReport(store.journal, fromTs: range.fromTs, toTs: range.toTs);
        LoyaltyReportRow? lrow;
        for (final x in lr.rows) {
          if (x.customerId == key) lrow = x;
        }
        final loyaltyLines = <_ShareLine>[
          (label: s.raw('rep.loyalty.earned'), value: '${lrow?.earnedPoints ?? 0}'),
          (label: s.raw('rep.loyalty.redeemed'), value: '${lrow?.redeemedPoints ?? 0}'),
          (label: s.raw('rep.loyalty.recredited'), value: '${lrow?.recreditedPoints ?? 0}'),
          (label: s.raw('rep.loyalty.clawed'), value: '${lrow?.clawedPoints ?? 0}'),
          (label: s.raw('rep.loyalty.expired'), value: '${lrow?.expiredPoints ?? 0}'),
          (label: s.raw('rep.loyalty.liability'), value: '${lrow?.points ?? 0} · ${fmtRs(lrow?.rupees ?? 0)}'),
        ];
        final lines = <_ShareLine>[
          (label: s.raw('rep.col.balance'), value: fmtRs(r.closing)),
          for (final x in r.rows) (label: fmtDate(x.entry.ts), value: fmtRs(x.signed)),
          ...loyaltyLines,
        ];
        return (
          lines,
          _scroll([
            _kv(lines.first.label, lines.first.value),
            const Divider(),
            for (final x in r.rows) _row3(fmtDate(x.entry.ts), fmtRs(x.signed), fmtRs(x.balance)),
            const Divider(),
            Text(s.raw('rep.loyalty.title'), style: Theme.of(context).textTheme.titleSmall),
            for (final l in loyaltyLines) _kv(l.label, l.value),
          ]),
        );
      case 'supplierStatement':
        final id = _supplierId ?? store.suppliers.firstOrNull?.id;
        if (id == null) return (const [], Center(child: Text(s.raw('common.none'))));
        final r = supplierStatement(store.purchases, store.supplierPayments, store.purchaseReturns, id, range);
        final lines = <_ShareLine>[
          (label: s.raw('rep.col.balance'), value: fmtRs(r.closing)),
          for (final x in r.events) (label: '${fmtDate(x.ts)} · ${x.kind}', value: fmtRs(x.amount)),
        ];
        return (
          lines,
          _scroll([
            _kv(lines.first.label, lines.first.value),
            const Divider(),
            for (final x in r.events) _row3('${fmtDate(x.ts)} · ${x.kind}', fmtRs(x.amount), fmtRs(x.balance)),
          ]),
        );
      case 'aging':
        final r = agingReport(store.credits, store.purchases, store.supplierPayments, store.purchaseReturns);
        final lines = <_ShareLine>[
          (label: s.raw('fin.kpi.receivables'), value: fmtRs(r.receivables.total)),
          (label: s.raw('fin.kpi.payables'), value: fmtRs(r.payables.total)),
        ];
        return (
          lines,
          _scroll([
            _row3(s.raw('fin.kpi.receivables'), fmtRs(r.receivables.current), '${fmtRs(r.receivables.mid)} · ${fmtRs(r.receivables.old)} · ${fmtRs(r.receivables.total)}'),
            _row3(s.raw('fin.kpi.payables'), fmtRs(r.payables.current), '${fmtRs(r.payables.mid)} · ${fmtRs(r.payables.old)} · ${fmtRs(r.payables.total)}'),
          ]),
        );
      case 'expenses':
        final r = expensesReport(store.expenses, range);
        final lines = <_ShareLine>[
          (label: s.raw('fin.aging.total'), value: fmtRs(r.total)),
          for (final x in r.byCategory) (label: x.category, value: fmtRs(x.amount)),
        ];
        return (
          lines,
          _scroll([
            _kv(lines.first.label, lines.first.value),
            const Divider(),
            for (final x in r.byCategory) _row3(x.category, '${x.count}', fmtRs(x.amount)),
          ]),
        );
      case 'cheques':
        final r = chequesReport(store.cheques, range);
        final lines = <_ShareLine>[
          for (final g in r.groups)
            for (final c in g.rows) (label: '${c.chequeNo} · ${c.partyName}', value: fmtRs(c.amount)),
        ];
        return (
          lines,
          _scroll([
            for (final g in r.groups) ...[
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(s.raw('chq.status.${g.id}'), style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
              for (final c in g.rows) _row3('${c.chequeNo} · ${c.bankName}', c.partyName, fmtRs(c.amount)),
            ],
          ]),
        );
      case 'dayClose':
        final r = dayCloseReport(store.dayCloses, range);
        final lines = <_ShareLine>[
          (label: s.raw('dc.stat.difference'), value: fmtRs(r.totals.difference)),
          for (final x in r.rows) (label: x.close.dateISO, value: fmtRs(x.close.countedCash)),
        ];
        return (
          lines,
          _scroll([
            _kv(lines.first.label, lines.first.value),
            const Divider(),
            for (final x in r.rows) _row3(x.close.dateISO, fmtRs(x.close.expectedCash), fmtRs(x.close.countedCash)),
          ]),
        );
      case 'notes':
        final r = notesReport(store.notes, range);
        final lines = <_ShareLine>[
          (label: s.raw('note.filter.credit'), value: fmtRs(r.credit.total)),
          (label: s.raw('note.filter.debit'), value: fmtRs(r.debit.total)),
          for (final n in r.rows) (label: n.number, value: fmtRs(n.total)),
        ];
        return (
          lines,
          _scroll([
            for (final l in lines.take(2)) _kv(l.label, l.value),
            const Divider(),
            for (final n in r.rows) _row3(n.number, n.partyName, fmtRs(n.total)),
          ]),
        );
    }
    return (const [], const SizedBox.shrink());
  }

  Widget _scroll(List<Widget> children) => ListView(padding: const EdgeInsets.all(16), children: children);

  Widget _kv(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(children: [
          Expanded(child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ]),
      );

  Widget _row3(String a, String b, String c) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(children: [
          Expanded(child: Text(a, style: const TextStyle(fontSize: 13))),
          if (b.isNotEmpty) SizedBox(width: 90, child: Text(b, textAlign: TextAlign.end, style: const TextStyle(fontSize: 13))),
          SizedBox(width: 110, child: Text(c, textAlign: TextAlign.end, style: const TextStyle(fontSize: 13))),
        ]),
      );
}
