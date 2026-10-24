/// Dashboard (design §5, F1 row): today's counter picture from the
/// journal + operational docs — KPI cards (today sales, receivables,
/// payables, stock value, till cash) and the attention list (low
/// stock, negative stock, duplicate bill numbers, rejected writes).
/// Everything derives live from the subscriptions; nothing cached.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app_state.dart';
import '../core/documents.dart';
import '../core/ledger.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../l10n/strings.dart';
import '../main.dart' show fmtRs;
import '../theme/themes.dart';

/// Last-14-days sales bars (design §2 dashboard row: KPIs, chart,
/// attention items). Totals are the same bill documents the KPI
/// cards read — non-held bills bucketed by their dayOffset.
Widget _salesChart(BuildContext context, Strings s, DukaanTokens tokens) {
  final store = context.watch<ShopStore>();
  final days = List<double>.generate(14, (i) {
    final offset = 13 - i;
    return store.bills
        .where((b) => b.dayOffset == offset && b.status != 'held')
        .fold<double>(0, (a, b) => a + b.total);
  });
  final maxDay = days.fold<double>(0, (a, d) => d > a ? d : a);
  return Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(s.raw('dash.chart.title'), style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 4),
        Text(s.raw('dash.chart.caption'), style: TextStyle(color: tokens.muted, fontSize: 12)),
        const SizedBox(height: 16),
        if (maxDay <= 0)
          Text(s.raw('dash.chart.noData'), style: TextStyle(color: tokens.muted))
        else
          SizedBox(
            height: 96,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (var i = 0; i < 14; i++) ...[
                  if (i > 0) const SizedBox(width: 6),
                  Expanded(
                    child: Tooltip(
                      message: fmtRs(days[i]),
                      child: Container(
                        height: 6 + 90 * (days[i] / maxDay),
                        decoration: BoxDecoration(
                          color: i == 13 ? tokens.accent : tokens.accentSoft,
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
      ]),
    ),
  );
}

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;

    final todayBills = store.bills.where((b) => b.dayOffset == 0 && b.status != 'held').toList();
    final todaySales = todayBills.fold<double>(0, (a, b) => a + b.total);
    final receivables = receivablesTotal(store.journal);
    final payables = payablesTotal(store.journal);
    final stockValue = store.products.fold<double>(0, (a, p) => a + p.stockQty * p.costPrice);
    final till = store.accounts.where((a) => a.kind == 'cash').toList();
    final tillBalance = till.isEmpty ? accountBalance(store.journal, 'cash') : moneyAccountBalance(store.journal, till.first);
    final lowStock = store.products.where((p) => p.stockQty <= p.reorderLevel && p.stockQty >= 0).toList();
    final negative = store.products.where((p) => p.stockQty < 0).toList();
    final dupes = duplicateBillNumbers(store.bills.map((b) => (id: b.id, billNo: b.billNo)).toList());

    Widget kpi(String label, String value, {Color? color}) => Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: TextStyle(color: tokens.muted)),
              const SizedBox(height: 6),
              Text(value, style: Theme.of(context).textTheme.headlineSmall?.copyWith(color: color)),
            ]),
          ),
        );

    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(s.raw('dash.greeting'), style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 12),
      Wrap(spacing: 12, runSpacing: 12, children: [
        SizedBox(width: 220, child: kpi(s.raw('dash.kpi.todaySales'), fmtRs(todaySales))),
        SizedBox(width: 220, child: kpi(s.raw('credit.sum.totalOutstanding'), fmtRs(receivables), color: receivables > 0 ? tokens.amberText : null)),
        SizedBox(width: 220, child: kpi(s.raw('fin.payables'), fmtRs(payables))),
        SizedBox(width: 220, child: kpi(s.raw('dash.kpi.stockValue'), fmtRs(stockValue))),
        SizedBox(width: 220, child: kpi(s.raw('dc.stat.expected'), fmtRs(tillBalance))),
      ]),
      const SizedBox(height: 20),
      _salesChart(context, s, tokens),
      const SizedBox(height: 20),
      if (negative.isNotEmpty)
        Card(color: tokens.dangerSoft, child: ListTile(
          leading: Icon(Icons.warning_amber, color: tokens.danger),
          title: Text('${negative.length} — negative stock'), // counts are data, not copy
          subtitle: Text(negative.map((p) => p.name).join(', ')),
        )),
      if (lowStock.isNotEmpty)
        Card(child: ListTile(
          leading: Icon(Icons.inventory_2_outlined, color: tokens.amberText),
          title: Text(s.raw('inv.lowStock')),
          subtitle: Text(lowStock.map((p) => '${p.name} (${p.stockQty})').join(', ')),
        )),
      if (dupes.isNotEmpty)
        Card(color: tokens.dangerSoft, child: ListTile(
          leading: Icon(Icons.copy_all_outlined, color: tokens.danger),
          title: Text('Duplicate bill numbers: ${dupes.map((g) => g.number).join(', ')}'), // detector output (§3.6)
        )),
      if (store.rejectedTray.isNotEmpty)
        Card(color: tokens.dangerSoft, child: ListTile(
          leading: Icon(Icons.cloud_off, color: tokens.danger),
          title: Text('${store.rejectedTray.length} rejected writes — see Sync Centre'),
        )),
    ]);
  }
}
