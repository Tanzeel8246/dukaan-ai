/// Dashboard (design §5, F1 row — redesigned 2026-10-25 on the MC
/// Billing pattern): today's counter picture from the journal +
/// operational docs. Dense 2-column KPI cards with colour meaning
/// (green = money in, amber = due from customers, purple = dues to
/// suppliers), a quick-actions row, the 14-day chart, and the
/// attention list (low stock, negative stock, duplicate bill
/// numbers, rejected writes). Figures derive live from the
/// subscriptions; only the shell identity (business name/role) is
/// cache-first — figures are never painted stale.
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
  /// Jump to another shell module by its plan-module id (the
  /// AppShell resolves it to the current tab index); null renders
  /// the quick actions inert (e.g. standalone use).
  final void Function(String planModule)? onOpenModule;
  const DashboardScreen({super.key, this.onOpenModule});

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

    // Personalised greeting: the cached/live shop name when known,
    // the static dictionary greeting otherwise (and in locales
    // whose dictionary has no named key yet — never a raw key).
    final activeBid = store.activeBusinessId;
    final shopName = activeBid == null ? '' : store.businessNameFor(activeBid);
    final namedRaw = s.raw('dash.greetingNamed');
    final greeting = shopName.isNotEmpty && namedRaw != 'dash.greetingNamed'
        ? namedRaw.replaceAll('{name}', shopName)
        : s.raw('dash.greeting');

    Widget kpi(String label, String value, IconData icon, {Color? color, Color? soft}) => Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(color: soft ?? tokens.card2, shape: BoxShape.circle),
                  child: Icon(icon, size: 20, color: color ?? tokens.muted),
                ),
                const SizedBox(width: 8),
                Expanded(child: Text(label, style: TextStyle(color: tokens.muted, fontSize: 13))),
              ]),
              const SizedBox(height: 10),
              Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(color: color)),
            ]),
          ),
        );

    Widget actionTile(IconData icon, String label, String planModule) => Expanded(
          child: InkWell(
            onTap: onOpenModule == null ? null : () => onOpenModule!(planModule),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
              child: Column(children: [
                Icon(icon, size: 26, color: tokens.accentText),
                const SizedBox(height: 6),
                Text(label, textAlign: TextAlign.center, style: const TextStyle(fontSize: 12)),
              ]),
            ),
          ),
        );

    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(s.raw('dash.eyebrow'), style: TextStyle(color: tokens.muted, fontSize: 12)),
      const SizedBox(height: 4),
      Text(greeting, style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 12),
      // Honest loading state: while the session is still resolving,
      // say so — never paint zeros as if they were figures.
      if (!store.ready)
        Card(
          color: tokens.infoSoft,
          child: ListTile(
            leading: Icon(Icons.sync_outlined, color: tokens.infoText),
            title: Text(s.raw('dash.loading'), style: TextStyle(color: tokens.infoText)),
          ),
        ),
      if (!store.ready) const SizedBox(height: 12),
      LayoutBuilder(builder: (ctx, constraints) {
        final cols = constraints.maxWidth >= 900 ? 4 : 2;
        return GridView.count(
          crossAxisCount: cols,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.55,
          children: [
            kpi(s.raw('dash.kpi.todaySales'), fmtRs(todaySales), Icons.calendar_today_outlined,
                color: tokens.accentText, soft: tokens.accentSoft),
            kpi(s.raw('credit.sum.totalOutstanding'), fmtRs(receivables), Icons.people_outline,
                color: receivables > 0 ? tokens.amberText : null, soft: tokens.amberSoft),
            kpi(s.raw('dash.money.payable'), fmtRs(payables), Icons.business_outlined,
                color: tokens.infoText, soft: tokens.infoSoft),
            kpi(s.raw('dash.kpi.stockValue'), fmtRs(stockValue), Icons.inventory_2_outlined),
            kpi(s.raw('dc.stat.expected'), fmtRs(tillBalance), Icons.account_balance_wallet_outlined),
          ],
        );
      }),
      const SizedBox(height: 12),
      Card(
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Row(children: [
            actionTile(Icons.receipt_long_outlined, s.raw('nav.billing'), 'billing'),
            actionTile(Icons.point_of_sale_outlined, s.raw('nav.sales'), 'salesCounter'),
            actionTile(Icons.inventory_2_outlined, s.raw('nav.inventory'), 'inventoryView'),
            actionTile(Icons.people_outline, s.raw('nav.customers'), 'customersManage'),
          ]),
        ),
      ),
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
