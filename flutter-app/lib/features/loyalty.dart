/// Loyalty desk (Phase H · H2 — web LoyaltyView parity).
///
/// A derived surface over the journal, like every desk in this
/// app: balances, tiers and vintages are folded from entries by
/// core/loyalty on every build — nothing here is a stored
/// counter. The desk's one write is the expiry release: the
/// due-list is derived, and the owner posts the releases
/// deliberately (there is no scheduler; unposted expiries keep
/// sitting in the liability, honestly labelled, until posted).
///
/// RBAC: the `loyalty` matrix row (owner/manager full, accountant
/// read, cashier none) — a cashier never reaches this page (the
/// nav hides it); the cashier's points tender at the billing desk
/// rides the `billing` row.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app_state.dart';
import '../core/loyalty.dart';
import '../core/permissions.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f2_common.dart';

class LoyaltyScreen extends StatefulWidget {
  const LoyaltyScreen({super.key});
  @override
  State<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends State<LoyaltyScreen> {
  int? _postedMsg;
  bool _posting = false;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;
    final canWrite = can(store.role, 'loyalty', 'write');
    final loyaltySt = resolveLoyaltySettings(store.ownerDoc);
    final nowIso = DateTime.now().toUtc().toIso8601String();
    final totals = loyaltyProgrammeTotals(store.journal, nowIso);
    final nameOf = {for (final c in store.customers) c.id: c.name};
    final billNoOf = {for (final b in store.bills) b.id: b.billNo};
    final rows = loyaltyCustomerIds(store.journal)
        .map((cid) => (
              id: cid,
              name: nameOf[cid] ?? cid,
              pos: customerLoyalty(store.journal, cid, loyaltySt, nowIso),
            ))
        .where((r) => r.pos.points != 0 || r.pos.rupees != 0)
        .toList()
      ..sort((a, b) {
        final byRs = b.pos.rupees.compareTo(a.pos.rupees);
        return byRs != 0 ? byRs : a.name.compareTo(b.name);
      });

    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(s.raw('loyalty.title'), style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 4),
      Text(s.raw('loyalty.subtitle'), style: TextStyle(color: tokens.muted)),
      const SizedBox(height: 12),
      if (!loyaltySt.enabled)
        Card(
          color: tokens.card2,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Text(s.raw('loyalty.off')),
          ),
        ),
      if (_postedMsg != null)
        Card(
          color: tokens.card2,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Text('${s.raw('loyalty.postedCount')}: $_postedMsg'),
          ),
        ),
      const SizedBox(height: 4),
      Wrap(spacing: 12, runSpacing: 12, children: [
        StatCard(label: s.raw('loyalty.totalLiability'), value: fmtRs(totals.liabilityRs)),
        StatCard(label: s.raw('loyalty.pointsOutstanding'), value: '${totals.pointsOutstanding}'),
        StatCard(label: s.raw('loyalty.customersWithBalance'), value: '${totals.customersWithBalance}'),
        StatCard(
          label: s.raw('loyalty.expiringSoon'),
          value: totals.expiringSoonPoints > 0
              ? '${totals.expiringSoonPoints} · ${fmtRs(totals.expiringSoonRs)}'
              : '${totals.expiringSoonPoints}',
        ),
      ]),
      const SizedBox(height: 16),
      if (totals.expiredUnposted.isNotEmpty)
        Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s.raw('loyalty.expiredTitle'), style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 4),
              Text(s.raw('loyalty.expiredSub'), style: TextStyle(color: tokens.muted)),
              if (canWrite) ...[
                const SizedBox(height: 10),
                ElevatedButton(
                  onPressed: _posting
                      ? null
                      : () async {
                          setState(() => _posting = true);
                          final n = await store.postLoyaltyExpiries();
                          if (!mounted) return;
                          setState(() {
                            _posting = false;
                            if (n > 0) _postedMsg = n;
                          });
                        },
                  child: Text(
                      '${s.raw('loyalty.postExpiries')} (${totals.expiredUnpostedPoints} · ${fmtRs(totals.expiredUnpostedRs)})'),
                ),
              ],
            ]),
          ),
        ),
      const SizedBox(height: 8),
      if (rows.isEmpty)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Text(s.raw('loyalty.empty'), style: TextStyle(color: tokens.muted)),
        )
      else
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: DataTable(
            columnSpacing: 16,
            columns: [
              DataColumn(label: Text(s.raw('loyalty.col.customer'))),
              DataColumn(label: Text(s.raw('loyalty.col.tier'))),
              DataColumn(label: Text(s.raw('loyalty.col.points')), numeric: true),
              DataColumn(label: Text(s.raw('loyalty.col.value')), numeric: true),
              DataColumn(label: Text(s.raw('loyalty.col.nextExpiry'))),
            ],
            rows: [
              for (final r in rows)
                DataRow(cells: [
                  DataCell(Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(r.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                      for (final v in r.pos.vintages.where((v) => v.pointsUnspent != 0))
                        Text(
                          '${s.raw('loyalty.vintageLine').replaceAll('{bill}', '${v.billId != null ? (billNoOf[v.billId] ?? '—') : '—'}').replaceAll('{date}', v.earnedOnISO).replaceAll('{expiry}', v.expiresOnISO)} · ${s.raw('loyalty.vintageLeft').replaceAll('{points}', '${v.pointsUnspent}')}',
                          style: TextStyle(color: tokens.muted, fontSize: 12),
                        ),
                    ],
                  )),
                  DataCell(Text(s.raw('loyalty.tier.${r.pos.tier}'))),
                  DataCell(Text('${r.pos.points}')),
                  DataCell(Text(fmtRs(r.pos.rupees))),
                  DataCell(Text(_nextExpiry(r.pos))),
                ]),
            ],
          ),
        ),
    ]);
  }

  String _nextExpiry(CustomerLoyalty pos) {
    final dates = pos.vintages
        .where((v) => v.pointsUnspent > 0)
        .map((v) => v.expiresOnISO)
        .toList()
      ..sort();
    return dates.isEmpty ? '—' : dates.first;
  }
}
