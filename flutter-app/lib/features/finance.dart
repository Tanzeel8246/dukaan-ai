/// Finance (F2): the journal viewer (read-only, filterable), the
/// trial balance, money accounts with their books, the P&L summary,
/// aging, the tax position with payments, and the manual cash /
/// transfer composers — every figure derived from the journal by
/// the same core builders the reports use.
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../app_state.dart';
import '../core/fiscal.dart';
import '../core/ledger.dart';
import '../core/loans.dart';
import '../core/payroll.dart';
import '../core/permissions.dart';
import '../core/periods.dart';
import '../core/reports.dart';
import '../core/tally.dart';
import '../core/tax.dart' show taxPosition;
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f2_common.dart';

class FinanceScreen extends StatefulWidget {
  const FinanceScreen({super.key});
  @override
  State<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends State<FinanceScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 4, vsync: this);
  String _journalQuery = '';
  String? _refType;

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final canWrite = can(store.role, 'finance', 'write');
    return Column(children: [
      TabBar(
        controller: _tabs,
        isScrollable: true,
        tabs: [
          Tab(text: s.raw('fin.title')),
          Tab(text: s.raw('fin.journal.title')),
          Tab(text: s.raw('rep.tb.title')),
          Tab(text: s.raw('fin.accts.title')),
        ],
      ),
      Expanded(
        child: TabBarView(controller: _tabs, children: [
          _overview(context, store),
          _journal(context, store),
          _trialBalance(context, store),
          _accounts(context, store, canWrite),
        ]),
      ),
    ]);
  }

  Widget _overview(BuildContext context, ShopStore store) {
    final s = S.current;
    final j = store.journal;
    final pl = profitAndLoss(j);
    final aging = agingReport(store.credits, store.purchases, store.supplierPayments, store.purchaseReturns);
    final tax = taxPosition(j);
    return ListView(padding: const EdgeInsets.all(16), children: [
      Wrap(spacing: 12, runSpacing: 12, children: [
        StatCard(label: s.raw('fin.kpi.cash'), value: fmtRs(cashBalance(j))),
        StatCard(label: s.raw('fin.kpi.wallet'), value: fmtRs(walletBalance(j))),
        StatCard(label: s.raw('fin.kpi.receivables'), value: fmtRs(receivablesTotal(j))),
        StatCard(label: s.raw('fin.kpi.payables'), value: fmtRs(payablesTotal(j))),
        StatCard(label: s.raw('fin.pl.netProfit'), value: fmtRs(pl.net)),
        StatCard(label: s.raw('fin.tax.netDue'), value: fmtRs(tax.netPayable)),
      ]),
      const SizedBox(height: 16),
      Text(s.raw('fin.pl.title'), style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 6),
      _plRow(s.raw('fin.pl.revenue'), pl.revenue),
      _plRow(s.raw('fin.pl.discounts'), pl.discounts),
      _plRow(s.raw('fin.pl.netRevenue'), pl.netRevenue, bold: true),
      _plRow(s.raw('fin.pl.cogs'), pl.cogs),
      _plRow(s.raw('fin.pl.grossProfit'), pl.grossProfit, bold: true),
      for (final e in pl.expensesByCategory.entries)
        if (e.value != 0) _plRow('${s.raw('fin.pl.expenseRow')} · ${e.key}', e.value),
      _plRow(s.raw('fin.pl.stockLoss'), pl.stockLoss),
      _plRow(s.raw('fin.pl.netProfit'), pl.net, bold: true),
      const SizedBox(height: 16),
      Text(s.raw('fin.aging.receivablesTitle'), style: Theme.of(context).textTheme.titleMedium),
      _agingRow(context, aging.receivables),
      const SizedBox(height: 8),
      Text(s.raw('fin.aging.payablesTitle'), style: Theme.of(context).textTheme.titleMedium),
      _agingRow(context, aging.payables),
      const SizedBox(height: 16),
      Row(children: [
        Expanded(child: Text(s.raw('fin.tax.title'), style: Theme.of(context).textTheme.titleMedium)),
        if (can(store.role, 'finance', 'write') && tax.netPayable > 0)
          ElevatedButton.icon(
            onPressed: () => _taxPayment(context),
            icon: const Icon(Icons.payments_outlined, size: 16),
            label: Text(s.raw('fin.tax.pay')),
          ),
      ]),
      _plRow(s.raw('fin.tax.output'), tax.outputTax),
      _plRow(s.raw('fin.tax.input'), tax.inputTax),
      _plRow(s.raw('fin.tax.netDue'), tax.netPayable, bold: true),
      const SizedBox(height: 16),
      Text(s.raw('fin.acct.salary_payable'), style: Theme.of(context).textTheme.titleMedium),
      Builder(builder: (context) {
        final comp = salaryPayableComposition(j);
        return Column(children: [
          _plRow(s.raw('fin.acct.bucketBreakdown'), comp.unassignedAccrued),
          _plRow(s.raw('staff.pos.owed'), comp.owedToEmployees),
          _plRow(s.raw('staff.pos.advance'), comp.advancesOutstanding),
        ]);
      }),
      const SizedBox(height: 16),
      Text(s.raw('fin.acct.loans_payable'), style: Theme.of(context).textTheme.titleMedium),
      Builder(builder: (context) {
        final totals = loansRegisterTotals(store.loans);
        return Column(children: [
          _plRow(s.raw('loan.kpi.borrowed'), totals.borrowedOutstanding),
          _plRow(s.raw('loan.kpi.lent'), totals.lentOutstanding),
        ]);
      }),
      if (can(store.role, 'trialBalanceExports', 'view')) ...[
        const SizedBox(height: 16),
        const _ExportCard(),
      ],
    ]);
  }

  Widget _plRow(String label, double value, {bool bold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(children: [
        Expanded(child: Text(label, style: TextStyle(fontWeight: bold ? FontWeight.w600 : null))),
        Text(fmtRs(value), style: TextStyle(fontWeight: bold ? FontWeight.w600 : null)),
      ]),
    );
  }

  Widget _agingRow(BuildContext context, AgingBuckets b) {
    final s = S.current;
    return Row(children: [
      Expanded(child: Text('${s.raw('fin.aging.current')}: ${fmtRs(b.current)}')),
      Expanded(child: Text('31–60: ${fmtRs(b.mid)}')),
      Expanded(child: Text('60+: ${fmtRs(b.old)}')),
      Text('${s.raw('fin.aging.total')}: ${fmtRs(b.total)}', style: const TextStyle(fontWeight: FontWeight.w600)),
    ]);
  }

  Widget _journal(BuildContext context, ShopStore store) {
    final s = S.current;
    final tokens = context.watch<AppState>().tokens;
    var entries = store.journal.reversed.toList();
    if (_refType != null) entries = entries.where((e) => e.refType == _refType).toList();
    if (_journalQuery.isNotEmpty) {
      final q = _journalQuery.toLowerCase();
      entries = entries.where((e) => e.memo.toLowerCase().contains(q)).toList();
    }
    final refTypes = store.journal.map((e) => e.refType).toSet().toList()..sort();
    return Column(children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: Row(children: [
          Expanded(
            child: TextField(
              onChanged: (v) => setState(() => _journalQuery = v),
              decoration: InputDecoration(prefixIcon: const Icon(Icons.search), hintText: s.actionSearch, isDense: true),
            ),
          ),
          const SizedBox(width: 8),
          DropdownButton<String>(
            value: _refType,
            hint: Text(s.raw('fin.journal.title')),
            items: [
              DropdownMenuItem(value: null, child: Text(s.raw('common.all'))),
              for (final t in refTypes) DropdownMenuItem(value: t, child: Text(t)),
            ],
            onChanged: (v) => setState(() => _refType = v),
          ),
        ]),
      ),
      Expanded(
        child: entries.isEmpty
            ? Center(child: Text(s.raw('fin.journal.empty')))
            : ListView.builder(
                itemCount: entries.length,
                itemBuilder: (ctx, i) {
                  final e = entries[i];
                  final balanced = entryBalances(e);
                  return ExpansionTile(
                    title: Text(e.memo, style: const TextStyle(fontSize: 14)),
                    subtitle: Text('${fmtDate(e.ts)} · ${e.refType}${e.reversesId != null ? ' · ↩' : ''}'),
                    trailing: Icon(
                      balanced ? Icons.check_circle_outline : Icons.error_outline,
                      color: balanced ? tokens.accentText : tokens.danger, size: 18,
                    ),
                    children: [
                      for (final l in e.lines)
                        ListTile(
                          dense: true,
                          title: Text(accountLabel(l.account)),
                          trailing: Text(
                            l.debit > 0 ? 'Dr ${fmtRs(l.debit)}' : 'Cr ${fmtRs(l.credit)}',
                            style: const TextStyle(fontSize: 13),
                          ),
                          subtitle: l.ref != null ? Text(l.ref!) : null,
                        ),
                    ],
                  );
                },
              ),
      ),
    ]);
  }

  Widget _trialBalance(BuildContext context, ShopStore store) {
    final s = S.current;
    final range = resolveReportRange('fiscal', settings: store.settings);
    final tb = trialBalanceReport(store.journal, range);
    return ListView(padding: const EdgeInsets.all(16), children: [
      Row(children: [
        Expanded(child: Text('${range.fromDate} → ${range.toDate}')),
        Chip(
          avatar: Icon(tb.balanced ? Icons.check_circle_outline : Icons.error_outline, size: 16),
          label: Text(tb.balanced ? s.raw('fin.journal.balanced') : s.raw('fin.journal.unbalanced')),
        ),
      ]),
      const SizedBox(height: 8),
      DataTable(
        columnSpacing: 18,
        columns: [
          DataColumn(label: Text(s.raw('rep.col.account'))),
          DataColumn(label: Text(s.raw('rep.tb.debit')), numeric: true),
          DataColumn(label: Text(s.raw('rep.tb.credit')), numeric: true),
          DataColumn(label: Text(s.raw('rep.col.balance')), numeric: true),
        ],
        rows: [
          for (final r in tb.rows)
            DataRow(cells: [
              DataCell(Text(accountLabel(r.account))),
              DataCell(Text(fmtRs(r.debitTotal))),
              DataCell(Text(fmtRs(r.creditTotal))),
              DataCell(Text('${fmtRs(r.closing)} ${r.closingSide == 'debit' ? 'Dr' : 'Cr'}')),
            ]),
          DataRow(cells: [
            DataCell(Text(s.raw('fin.aging.total'), style: const TextStyle(fontWeight: FontWeight.w700))),
            DataCell(Text(fmtRs(tb.totalDebits), style: const TextStyle(fontWeight: FontWeight.w700))),
            DataCell(Text(fmtRs(tb.totalCredits), style: const TextStyle(fontWeight: FontWeight.w700))),
            DataCell(Text(fmtRs(tb.closingDifference), style: const TextStyle(fontWeight: FontWeight.w700))),
          ]),
        ],
      ),
    ]);
  }

  Widget _accounts(BuildContext context, ShopStore store, bool canWrite) {
    final s = S.current;
    final range = resolveReportRange('month', settings: store.settings);
    final combined = accountStatement(store.journal, store.accounts, null, range);
    return ListView(padding: const EdgeInsets.all(16), children: [
      Wrap(spacing: 12, runSpacing: 12, children: [
        for (final a in store.accounts.where((a) => !a.archived))
          StatCard(label: a.name, value: fmtRs(moneyAccountBalance(store.journal, a))),
      ]),
      const SizedBox(height: 12),
      Wrap(spacing: 8, children: [
        if (canWrite)
          ElevatedButton.icon(onPressed: () => _cashEntry(context, 'in'), icon: const Icon(Icons.arrow_downward, size: 16), label: Text(s.raw('fin.cash.in'))),
        if (canWrite)
          ElevatedButton.icon(onPressed: () => _cashEntry(context, 'out'), icon: const Icon(Icons.arrow_upward, size: 16), label: Text(s.raw('fin.cash.out'))),
        if (can(store.role, 'transfers', 'write'))
          ElevatedButton.icon(onPressed: () => _transfer(context), icon: const Icon(Icons.swap_horiz, size: 16), label: Text(s.raw('fin.ref.transfer'))),
      ]),
      const SizedBox(height: 16),
      Text(s.raw('fin.cb.title'), style: Theme.of(context).textTheme.titleMedium),
      const SizedBox(height: 6),
      for (final r in combined.rows.reversed.take(100))
        ListTile(
          dense: true,
          title: Text(r.memo, style: const TextStyle(fontSize: 13)),
          subtitle: Text('${fmtDate(r.ts)} · ${r.bucket}'),
          trailing: Text(
            r.inAmount > 0 ? '+${fmtRs(r.inAmount)}' : '−${fmtRs(r.outAmount)}',
            style: const TextStyle(fontSize: 13),
          ),
        ),
    ]);
  }

  Future<void> _cashEntry(BuildContext context, String kind) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final amount = TextEditingController();
    final note = TextEditingController();
    var method = 'cash';
    String? accountId;
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setLocal) => AlertDialog(
        title: Text(kind == 'in' ? s.raw('fin.cash.in') : s.raw('fin.cash.out')),
        content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
          TextField(controller: amount, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: s.raw('common.amount'))),
          MethodDropdown(value: method, onChanged: (v) => setLocal(() => method = v)),
          AccountDropdown(accounts: store.accounts, value: accountId, onChanged: (v) => setLocal(() => accountId = v)),
          TextField(controller: note, decoration: InputDecoration(labelText: s.raw('fin.cash.note'))),
        ])),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.raw('fin.cash.post'))),
        ],
      )),
    );
    if (go != true) return;
    final v = double.tryParse(amount.text.trim()) ?? 0;
    if (v > 0) {
      await store.addCashEntry(kind: kind, amount: v, method: method, accountId: accountId, note: note.text.trim());
    }
  }

  Future<void> _transfer(BuildContext context) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final amount = TextEditingController();
    final live = store.accounts.where((a) => !a.archived).toList();
    if (live.length < 2) return;
    var from = live.first;
    var to = live[1];
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setLocal) => AlertDialog(
        title: Text(s.raw('fin.ref.transfer')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          AccountDropdown(accounts: live, value: from.id, onChanged: (v) => setLocal(() => from = live.firstWhere((a) => a.id == v))),
          AccountDropdown(accounts: live, value: to.id, onChanged: (v) => setLocal(() => to = live.firstWhere((a) => a.id == v))),
          TextField(controller: amount, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: s.raw('common.amount'))),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.actionConfirm)),
        ],
      )),
    );
    if (go != true) return;
    final v = double.tryParse(amount.text.trim()) ?? 0;
    if (v > 0 && from.id != to.id) await store.transferFunds(from: from, to: to, amount: v);
  }

  Future<void> _taxPayment(BuildContext context) async {
    final store = context.read<ShopStore>();
    final s = S.current;
    final due = taxPosition(store.journal).netPayable;
    final amount = TextEditingController(text: due > 0 ? due.toStringAsFixed(0) : '');
    var method = 'cash';
    String? accountId;
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(builder: (ctx, setLocal) => AlertDialog(
        title: Text(s.raw('fin.tax.payTitle')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('${s.raw('fin.tax.netDue')}: ${fmtRs(due)}'),
          TextField(controller: amount, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: s.raw('common.amount'))),
          MethodDropdown(value: method, onChanged: (v) => setLocal(() => method = v)),
          AccountDropdown(accounts: store.accounts, value: accountId, onChanged: (v) => setLocal(() => accountId = v)),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(s.actionCancel)),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text(s.raw('fin.tax.pay'))),
        ],
      )),
    );
    if (go != true) return;
    final v = double.tryParse(amount.text.trim()) ?? 0;
    if (v > 0) await store.recordTaxPayment(amount: v, method: method, accountId: accountId);
  }
}

/* ---------------- Tally + journal CSV export (F4 · D5) ---------------- */

/// The web's ExportCard (§5): a fiscal-range picker over the
/// current/previous FY, the derived Tally model summary, and the
/// two downloads — Tally XML (masters + one voucher per entry,
/// openings generated in-file only) and the journal CSV. The
/// honesty note ships with the card verbatim: real-Tally import
/// validation stays the owner's one-time check (§5.3).
class _ExportCard extends StatefulWidget {
  const _ExportCard();
  @override
  State<_ExportCard> createState() => _ExportCardState();
}

class _ExportCardState extends State<_ExportCard> {
  bool _previous = true;

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final fy = _previous
        ? previousFiscalYear(store.settings)
        : fiscalYearRange(store.settings, DateTime.now().toUtc().toIso8601String());
    final range = reportRangeOf(fy);
    final parties = TallyParties(
      customers: store.customers,
      suppliers: store.suppliers,
      employees: store.employees,
      accounts: store.accounts,
      docNumbers: {
        for (final b in store.bills) b.id: 'INV-${b.billNo}',
        for (final r in store.payrollRuns)
          if (r.number != null) r.id: r.number!,
        for (final l in store.loans) l.id: l.number,
      },
    );
    final model = buildTallyExport(store.journal, parties, store.settings, range);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(s.raw('fin.export.tallyTitle'), style: Theme.of(context).textTheme.titleMedium),
          Text(s.raw('fin.export.caption')),
          const SizedBox(height: 8),
          SegmentedButton<bool>(
            segments: [
              ButtonSegment(value: true, label: Text(s.raw('fin.export.lastFiscal'))),
              ButtonSegment(value: false, label: Text(s.raw('fin.export.range'))),
            ],
            selected: {_previous},
            onSelectionChanged: (v) => setState(() => _previous = v.first),
          ),
          const SizedBox(height: 6),
          Text('${fyLabel(fy)} · ${s.raw('fin.export.count')}: ${model.vouchers.length}'),
          Text('${fmtRs(model.totalDebits)} / ${fmtRs(model.totalCredits)}'),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [
            FilledButton.icon(
              onPressed: model.vouchers.isEmpty
                  ? null
                  : () async {
                      final xml = tallyXML(store.journal, parties, store.settings, range);
                      await Share.shareXFiles([
                        XFile.fromData(utf8.encode(xml),
                            name: 'tally-${fy.startDate}.xml', mimeType: 'text/xml'),
                      ]);
                    },
              icon: const Icon(Icons.download_outlined, size: 16),
              label: Text(s.raw('fin.export.tally')),
            ),
            OutlinedButton.icon(
              onPressed: model.vouchers.isEmpty
                  ? null
                  : () async {
                      final csv = journalCSV(store.journal, parties, store.settings, range);
                      await Share.shareXFiles([
                        XFile.fromData(
                            Uint8List.fromList([0xEF, 0xBB, 0xBF, ...utf8.encode(csv)]),
                            name: 'journal-${fy.startDate}.csv', mimeType: 'text/csv'),
                      ]);
                    },
              icon: const Icon(Icons.table_chart_outlined, size: 16),
              label: Text(s.raw('fin.export.journalCsv')),
            ),
          ]),
          if (model.vouchers.isEmpty) Text(s.raw('fin.export.empty')),
          const SizedBox(height: 6),
          Text(s.raw('fin.export.tallyNote'), style: Theme.of(context).textTheme.bodySmall),
        ]),
      ),
    );
  }
}
