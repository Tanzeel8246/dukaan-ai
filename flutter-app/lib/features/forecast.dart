/// Forecast (F2): the web's derived demand forecast — average
/// daily sales over the trailing window, days of stock left,
/// suggested reorder quantities — plus low-stock, expiring and
/// dead-stock surfaces. Everything is computed from sales rows
/// and live stock; nothing is stored.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app_state.dart';
import '../core/selectors.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;

class ForecastScreen extends StatelessWidget {
  const ForecastScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;
    final rows = forecastAll(store.products, store.sales);
    final critical = rows.where((r) => r.status == 'critical').length;
    final low = lowStockProducts(store.products);
    final expiring = expiringProducts(store.products);
    final dead = deadStockProducts(store.products, store.sales);

    return ListView(padding: const EdgeInsets.all(16), children: [
      Wrap(spacing: 12, runSpacing: 12, children: [
        StatCardX(label: s.raw('fc.status.critical'), value: '$critical', color: tokens.danger),
        StatCardX(label: s.raw('dash.alerts.lowStock'), value: '${low.length}', color: tokens.amberText),
        StatCardX(label: s.raw('rep.sec.nearExpiry'), value: '${expiring.length}'),
      ]),
      const SizedBox(height: 16),
      Text(s.raw('fc.title'), style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 6),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          columnSpacing: 16,
          columns: [
            DataColumn(label: Text(s.raw('rep.col.product'))),
            DataColumn(label: Text(s.raw('fc.avg7')), numeric: true),
            DataColumn(label: Text(s.raw('rep.col.stock')), numeric: true),
            DataColumn(label: Text(s.raw('fc.daysLeft').replaceAll('{d}', '').replaceAll('~', '').trim()), numeric: true),
            DataColumn(label: Text(s.raw('rep.col.reorder')), numeric: true),
            DataColumn(label: Text(s.raw('rep.col.status'))),
          ],
          rows: [
            for (final r in rows)
              DataRow(cells: [
                DataCell(Text(r.product.name)),
                DataCell(Text(r.avgDaily.toStringAsFixed(2))),
                DataCell(Text('${r.product.stockQty}')),
                DataCell(Text(r.daysOfStock.isInfinite ? '∞' : r.daysOfStock.toStringAsFixed(0))),
                DataCell(Text('${r.suggestedReorder}')),
                DataCell(Text(
                  s.raw('fc.status.${r.status}'),
                  style: TextStyle(color: r.status == 'critical' ? tokens.danger : r.status == 'low' ? tokens.amberText : null),
                )),
              ]),
          ],
        ),
      ),
      if (expiring.isNotEmpty) ...[
        const SizedBox(height: 16),
        Text(s.raw('rep.sec.nearExpiry'), style: Theme.of(context).textTheme.titleMedium),
        for (final p in expiring)
          ListTile(dense: true, title: Text(p.name), subtitle: Text('${p.expiryDate} · ${p.stockQty}')),
      ],
      if (dead.isNotEmpty) ...[
        const SizedBox(height: 16),
        Text(s.raw('inv.dead.explain'), style: Theme.of(context).textTheme.titleSmall),
        for (final p in dead)
          ListTile(dense: true, title: Text(p.name), subtitle: Text('${s.raw('rep.col.stock')}: ${p.stockQty} · ${fmtRs(p.stockQty * p.costPrice)}')),
      ],
    ]);
  }
}

/// Local stat card (kept tiny; mirrors f2_common's StatCard).
class StatCardX extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;
  const StatCardX({super.key, required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
          Text(label, style: Theme.of(context).textTheme.bodySmall),
          Text(value, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: color, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}
