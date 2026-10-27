/// Day close (design §5): per cash account — the journal-derived
/// expected cash is the AUTHORITATIVE figure (§1.4 identity: it
/// equals the account's derived balance by construction); the clerk
/// counts the drawer and any difference is a fact recorded on the
/// close row, never an edit. Submitting is an E5 sensitive action
/// (PIN-gated when the device pref is on).
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../app_state.dart';
import '../core/ledger.dart';
import '../core/periods.dart';
import '../core/types.dart';
import '../data/store.dart';
import 'f2_common.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'pin_gate.dart';

class DayCloseScreen extends StatefulWidget {
  const DayCloseScreen({super.key});
  @override
  State<DayCloseScreen> createState() => _DayCloseScreenState();
}

class _DayCloseScreenState extends State<DayCloseScreen> {
  final _counted = TextEditingController();
  final _note = TextEditingController();
  String? _accountId;
  bool _busy = false;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final tokens = context.watch<AppState>().tokens;
    final tills = store.accounts.where((a) => a.kind == 'cash').toList();
    if (tills.isEmpty) {
      return Center(child: Text(s.raw('common.none')));
    }
    final account = tills.firstWhere((a) => a.id == _accountId, orElse: () => tills.first);
    final todayISO = todayPktISO();
    final already = store.dayCloses.where((d) => d.accountId == account.id && d.dateISO == todayISO).toList();
    final opening = moneyAccountBalance(store.journal, account) - accountDayNet(store.journal, account, 0);
    final expected = store.expectedCashToday(account);
    // Fix Round 1 · F3: the un-closed backlog for THIS account,
    // honestly labelled (mirrors the web day-close screen): days
    // before today that moved the till and no recorded close
    // covers. Their cash already sits inside today's opening —
    // the line exists so the backlog is SEEN, never silently
    // folded into "today".
    final lastCloseDate = store.dayCloses
        .where((d) => d.accountId == account.id)
        .fold<String>('', (m, d) => d.dateISO.compareTo(m) > 0 ? d.dateISO : m);
    final backlogDates = <String>{};
    var backlogNet = 0.0;
    for (final e in store.journal) {
      final d = businessDateISO(e.ts);
      if (d.isEmpty || d.compareTo(todayISO) >= 0 || d.compareTo(lastCloseDate) <= 0) continue;
      var moved = false;
      var n = 0.0;
      for (final l in e.lines) {
        if (lineResolvesTo(l, account)) {
          moved = true;
          n += l.debit - l.credit;
        }
      }
      if (moved) {
        backlogDates.add(d);
        backlogNet += n;
      }
    }
    final counted = double.tryParse(_counted.text.trim()) ?? 0;
    final difference = counted - expected;

    return ListView(padding: const EdgeInsets.all(16), children: [
      Text(s.raw('dc.title'), style: Theme.of(context).textTheme.headlineSmall),
      Text(s.raw('dc.subtitle'), style: TextStyle(color: tokens.muted)),
      // MC workflow §14 — the lock, stated plainly: when a period
      // lock covers past days, backdated entries into those days
      // are REFUSED by the posting guard (period-locked), so the
      // close summary below is final for locked days.
      if (store.lockedThrough.isNotEmpty)
        Padding(
          padding: const EdgeInsets.only(top: 8),
          child: Text('${s.raw('settings.per.closed')}: ${fmtDate(store.lockedThrough)}',
              style: TextStyle(color: tokens.amberText, fontWeight: FontWeight.w600)),
        ),
      const SizedBox(height: 16),
      DropdownButtonFormField<String>(
        initialValue: account.id,
        items: [for (final a in tills) DropdownMenuItem(value: a.id, child: Text(a.name))],
        onChanged: (v) => setState(() => _accountId = v),
        decoration: InputDecoration(labelText: s.raw('dc.account')),
      ),
      const SizedBox(height: 12),
      Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(children: [
        _row(s.raw('dc.stat.opening'), fmtRs(opening)),
        _row(s.raw('dc.stat.expected'), fmtRs(expected)),
        if (_counted.text.isNotEmpty) _row(s.raw('dc.stat.difference'), fmtRs(difference)),
      ]))),
      if (backlogDates.isNotEmpty) ...[
        const SizedBox(height: 8),
        Text(
          s.raw('dc.backlog')
              .replaceAll('{days}', '${backlogDates.length}')
              .replaceAll('{amount}', fmtRs(backlogNet)),
          style: TextStyle(color: tokens.muted, fontSize: 13),
        ),
      ],
      const SizedBox(height: 12),
      TextField(controller: _counted, keyboardType: TextInputType.number, onChanged: (_) => setState(() {}),
          decoration: InputDecoration(labelText: s.raw('dc.counted.label'))),
      const SizedBox(height: 12),
      TextField(controller: _note, decoration: InputDecoration(labelText: s.raw('common.note'))),
      const SizedBox(height: 16),
      if (already.isNotEmpty)
        Card(color: tokens.amberSoft, child: ListTile(
          leading: const Icon(Icons.info_outline),
          title: Text(s.raw('dc.alreadyClosed.title')),
          subtitle: Text(s.raw('dc.alreadyClosed.text')),
        )),
      ElevatedButton(
        onPressed: _busy
            ? null
            : () async {
                if (!await runSensitiveGate(context, 'dayCloseSubmit')) return;
                setState(() => _busy = true);
                // H6 (audit fix 4): the buckets come from the
                // ported web derivation (core/ledger
                // .dayCloseSummary) fed with the web view's glue
                // — no inline arithmetic remains here to drift
                // again. expectedCash on the row stays the
                // JOURNAL figure (`expected` above), exactly as
                // the web records it.
                final voidedBillIds = store.bills
                    .where((b) => b.status == 'voided')
                    .map((b) => b.id)
                    .toSet();
                var returnsRefundCash = 0.0;
                for (final r in store.returns) {
                  if (r.dayOffset == 0 &&
                      r.method == 'cash' &&
                      !voidedBillIds.contains(r.billId)) {
                    returnsRefundCash += r.refundAmount;
                  }
                }
                var cashInTotal = 0.0;
                var cashOutTotal = 0.0;
                for (final c in store.cashEntries) {
                  if (c.dayOffset != 0 || c.method != 'cash') continue;
                  if (c.kind == 'in') cashInTotal += c.amount;
                  if (c.kind == 'out') cashOutTotal += c.amount;
                }
                final summary = dayCloseSummary(
                  sales: store.sales,
                  bills: store.bills,
                  expenses: store.expenses,
                  credits: store.credits,
                  supplierPayments: store.supplierPayments,
                  returnsRefundCash: returnsRefundCash,
                  cashIn: cashInTotal,
                  cashOut: cashOutTotal,
                  openingCash: opening,
                );
                final row = DayClose(
                  id: newId('dc'),
                  dateISO: todayISO,
                  accountId: account.id,
                  openingCash: opening,
                  salesByMethod: summary.salesByMethod,
                  expensesTotal: summary.expensesTotal,
                  creditGiven: summary.creditGiven,
                  creditReceived: summary.creditReceived,
                  supplierPaid: summary.supplierPaidCash,
                  expectedCash: expected,
                  countedCash: counted,
                  difference: difference,
                  note: _note.text.trim(),
                  dayOffset: 0,
                  ts: DateTime.now().toUtc().toIso8601String(),
                );
                await store.saveDayClose(row);
                if (mounted) setState(() => _busy = false);
              },
        child: Text(s.raw('dc.close.title')),
      ),
    ]);
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [Expanded(child: Text(label)), Text(value, style: const TextStyle(fontWeight: FontWeight.w600))]),
      );
}
