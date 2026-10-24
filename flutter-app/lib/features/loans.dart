/// Loans register (F4): the web's Phase D3 surface. Schedules,
/// outstanding and statuses are DERIVED by core/loans.dart from
/// the immutable event diary; money moves only as discrete,
/// desk-confirmed events through the store's guarded actions.
/// Charges default to NONE and the vocabulary stays neutral —
/// the same honesty rules as the web register.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/loans.dart';
import '../core/permissions.dart';
import '../core/periods.dart';
import '../core/types.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../main.dart' show fmtRs;
import 'f2_common.dart';
import 'f3_common.dart';

class LoansScreen extends StatefulWidget {
  const LoansScreen({super.key});
  @override
  State<LoansScreen> createState() => _LoansScreenState();
}

class _LoansScreenState extends State<LoansScreen> {
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final canWrite = can(store.role, 'loans', 'write');
    final totals = loansRegisterTotals(store.loans);
    final loans = [
      for (final l in store.loans)
        if (_filter == 'all' || l.direction == _filter) l,
    ]..sort((a, b) => b.ts.compareTo(a.ts));
    final today = todayPktISO();
    var overdue = 0;
    for (final l in store.loans) {
      if (l.status == 'active' &&
          loanInstalmentStates(l, today).any((st) => st.state == 'overdue')) {
        overdue++;
      }
    }
    return ListView(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
        child: Row(children: [
          Expanded(
            child: Wrap(spacing: 16, children: [
              Text('${s.raw('loan.kpi.borrowed')}: ${fmtRs(totals.borrowedOutstanding)}'),
              Text('${s.raw('loan.kpi.lent')}: ${fmtRs(totals.lentOutstanding)}'),
              Text('${s.raw('loan.kpi.count')}: ${store.loans.where((l) => l.status == 'active').length}'),
              if (overdue > 0)
                Text('${s.raw('loan.overdueCount')}: $overdue',
                    style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ]),
          ),
          if (canWrite)
            FilledButton.icon(
              onPressed: () => _createLoan(context),
              icon: const Icon(Icons.add, size: 18),
              label: Text(s.raw('loan.new')),
            ),
        ]),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        child: SegmentedButton<String>(
          segments: [
            ButtonSegment(value: 'all', label: Text(s.raw('loan.filter.all'))),
            ButtonSegment(value: 'payable', label: Text(s.raw('loan.filter.payable'))),
            ButtonSegment(value: 'receivable', label: Text(s.raw('loan.filter.receivable'))),
          ],
          selected: {_filter},
          onSelectionChanged: (v) => setState(() => _filter = v.first),
        ),
      ),
      if (loans.isEmpty)
        Padding(
          padding: const EdgeInsets.all(24),
          child: Text(store.loans.isEmpty ? s.raw('loan.empty') : s.raw('loan.emptyFiltered')),
        ),
      for (final l in loans)
        Builder(builder: (context) {
          final pos = loanPosition(l);
          final states = loanInstalmentStates(l, today);
          LoanInstalmentState? next;
          for (final st in states) {
            if (st.state != 'paid' && st.owed > 0.001) {
              next = st;
              break;
            }
          }
          return ListTile(
            leading: Icon(l.direction == 'payable'
                ? Icons.arrow_downward_outlined
                : Icons.arrow_upward_outlined),
            title: Text('${l.number} · ${l.partyName}'),
            subtitle: Text('${s.raw('loan.dir.${l.direction}')} · '
                '${s.raw('loan.col.principal')} ${fmtRs(l.principal)}'
                '${next != null ? ' · ${s.raw('loan.col.nextDue')} ${next.dueISO}' : ''}'),
            trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(fmtRs(pos.outstanding),
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              Chip(
                label: Text(s.raw('loan.status.${l.status}')),
                visualDensity: VisualDensity.compact,
              ),
            ]),
            onTap: () => _loanDetail(context, l.id),
          );
        }),
    ]);
  }
}

Future<void> _createLoan(BuildContext context) async {
  final s = S.current;
  final store = context.read<ShopStore>();
  final party = TextEditingController();
  final principal = TextEditingController();
  final rate = TextEditingController(text: '0');
  final fee = TextEditingController(text: '0');
  final count = TextEditingController(text: '12');
  final start = TextEditingController(text: todayPktISO());
  final firstDue = TextEditingController();
  final note = TextEditingController();
  var direction = 'payable';
  var chargeType = 'none';
  var every = 'month';
  var method = 'cash';
  String? accountId;
  String? error;
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setLocal) => AlertDialog(
        title: Text(s.raw('loan.form.title')),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            DropdownButtonFormField<String>(
              initialValue: direction,
              decoration: InputDecoration(labelText: s.raw('loan.form.direction')),
              items: [
                DropdownMenuItem(value: 'payable', child: Text(s.raw('loan.dir.payable'))),
                DropdownMenuItem(value: 'receivable', child: Text(s.raw('loan.dir.receivable'))),
              ],
              onChanged: (v) => setLocal(() {
                direction = v ?? 'payable';
                // Receivable loans are charge-free in v1 (design §3.5).
                if (direction == 'receivable') chargeType = 'none';
              }),
            ),
            if (direction == 'receivable')
              Text(s.raw('loan.form.receivableHint'),
                  style: Theme.of(context).textTheme.bodySmall),
            TextField(controller: party, decoration: InputDecoration(labelText: s.raw('loan.form.party'))),
            TextField(controller: principal, keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: s.raw('loan.form.principal'))),
            DropdownButtonFormField<String>(
              initialValue: chargeType,
              decoration: InputDecoration(labelText: s.raw('loan.form.chargeType')),
              items: [
                DropdownMenuItem(value: 'none', child: Text(s.raw('loan.form.chargeType.none'))),
                DropdownMenuItem(value: 'fee_only', child: Text(s.raw('loan.form.chargeType.feeOnly'))),
                if (direction == 'payable') ...[
                  DropdownMenuItem(value: 'flat', child: Text(s.raw('loan.form.chargeType.flat'))),
                  DropdownMenuItem(value: 'reducing', child: Text(s.raw('loan.form.chargeType.reducing'))),
                ],
              ],
              onChanged: direction == 'receivable'
                  ? null
                  : (v) => setLocal(() => chargeType = v ?? 'none'),
            ),
            if (chargeType == 'flat' || chargeType == 'reducing')
              TextField(controller: rate, keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: s.raw('loan.form.chargeRate'))),
            TextField(controller: fee, keyboardType: TextInputType.number,
                decoration: InputDecoration(
                    labelText: chargeType == 'fee_only'
                        ? s.raw('loan.form.feeOnlyLabel')
                        : s.raw('loan.form.fee'),
                    helperText: s.raw('loan.form.feeHint'))),
            Row(children: [
              Expanded(child: TextField(controller: count, keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: s.raw('loan.form.count')))),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: every,
                  decoration: InputDecoration(labelText: s.raw('loan.form.every')),
                  items: [
                    DropdownMenuItem(value: 'month', child: Text(s.raw('loan.detail.every.month'))),
                    DropdownMenuItem(value: 'week', child: Text(s.raw('loan.detail.every.week'))),
                  ],
                  onChanged: (v) => setLocal(() => every = v ?? 'month'),
                ),
              ),
            ]),
            TextField(controller: start, decoration: InputDecoration(labelText: s.raw('loan.form.start'), hintText: 'YYYY-MM-DD')),
            TextField(controller: firstDue, decoration: InputDecoration(labelText: s.raw('loan.form.firstDue'), hintText: 'YYYY-MM-DD')),
            MethodDropdown(value: method, onChanged: (v) => setLocal(() => method = v)),
            AccountDropdown(accounts: store.accounts, value: accountId,
                onChanged: (v) => setLocal(() => accountId = v)),
            TextField(controller: note, decoration: InputDecoration(labelText: s.raw('loan.form.note'))),
            if (error != null)
              Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
          FilledButton(
            onPressed: () {
              final terms = LoanTerms(
                direction: direction, partyName: party.text,
                principal: double.tryParse(principal.text) ?? 0,
                chargeType: chargeType, chargeRate: double.tryParse(rate.text) ?? 0,
                feeAmount: double.tryParse(fee.text) ?? 0,
                instalmentCount: int.tryParse(count.text) ?? 0,
              );
              if (loanTermsError(terms) != null) {
                setLocal(() => error = s.raw('loan.form.errTerms'));
                return;
              }
              Navigator.pop(context, true);
            },
            child: Text(s.raw('loan.form.create')),
          ),
        ],
      ),
    ),
  );
  if (ok != true || !context.mounted) return;
  final due = firstDue.text.trim().isEmpty ? start.text.trim() : firstDue.text.trim();
  final id = await store.createLoan(
    direction: direction, partyName: party.text,
    principal: double.tryParse(principal.text) ?? 0,
    chargeType: chargeType, chargeRate: double.tryParse(rate.text) ?? 0,
    feeAmount: double.tryParse(fee.text) ?? 0,
    startDateISO: start.text.trim(),
    instalmentCount: int.tryParse(count.text) ?? 0,
    instalmentEvery: every, firstDueISO: due,
    method: method, accountId: accountId, note: note.text,
  );
  if (context.mounted) {
    f3Notice(context, id != null ? s.raw('loan.created') : s.raw('loan.form.errTerms'));
  }
}

Future<void> _loanDetail(BuildContext context, String loanId) async {
  await showDialog<void>(
    context: context,
    builder: (context) => _LoanDetailDialog(loanId: loanId),
  );
}

class _LoanDetailDialog extends StatelessWidget {
  final String loanId;
  const _LoanDetailDialog({required this.loanId});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final loan = store.loanById(loanId);
    if (loan == null) return const AlertDialog(content: Text('—'));
    final canWrite = can(store.role, 'loans', 'write');
    final pos = loanPosition(loan);
    final today = todayPktISO();
    final states = loanInstalmentStates(loan, today);
    final nextAccrual = nextChargeAccrual(loan);
    final accrued = accruedChargeCount(loan);
    return AlertDialog(
      title: Text('${loan.number} · ${loan.partyName}'),
      content: SizedBox(
        width: 600,
        child: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('${s.raw('loan.dir.${loan.direction}')} · ${s.raw('loan.charge.${loan.chargeType == 'fee_only' ? 'feeOnly' : loan.chargeType}')} · '
                '${s.raw('loan.detail.start')} ${loan.startDateISO} · '
                '${s.raw('loan.detail.instalments')} ${loan.instalmentCount}'),
            const SizedBox(height: 6),
            _row(s.raw('loan.col.principal'), fmtRs(loan.principal)),
            _row(s.raw('loan.col.outstanding'), fmtRs(pos.outstanding)),
            _row(s.raw('loan.detail.repaid'), fmtRs(pos.totalRepaid)),
            _row(s.raw('loan.detail.chargesAccrued'), fmtRs(pos.chargesAccrued)),
            if (nextAccrual != null)
              _row(s.raw('loan.accrue'), '${fmtRs(nextAccrual.chargePart)} · #${nextAccrual.n}'),
            Text('${s.raw('loan.detail.charge')}: '
                '$accrued/${loan.instalmentCount} · ${fmtRs(pos.chargesAccrued)}'),
            const Divider(),
            Text(s.raw('loan.detail.instalments'), style: Theme.of(context).textTheme.titleSmall),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: DataTable(
                columns: [
                  const DataColumn(label: Text('#')),
                  DataColumn(label: Text(s.raw('loan.ev.date'))),
                  DataColumn(label: Text(s.raw('loan.col.principal'))),
                  DataColumn(label: Text(s.raw('loan.detail.charge'))),
                  DataColumn(label: Text(s.raw('loan.col.outstanding'))),
                ],
                rows: [
                  for (final st in states)
                    DataRow(cells: [
                      DataCell(Text('${st.n}')),
                      DataCell(Text(st.dueISO)),
                      DataCell(Text(fmtRs(st.principalPart))),
                      DataCell(Text(fmtRs(st.chargePart))),
                      DataCell(Text('${fmtRs(st.owed)} · ${s.raw('loan.state.${st.state}')}')),
                    ]),
                ],
              ),
            ),
            const Divider(),
            Text(s.raw('loan.events.title'), style: Theme.of(context).textTheme.titleSmall),
            if (loan.events.isEmpty) Text(s.raw('loan.events.empty')),
            for (final ev in loan.events)
              ListTile(
                dense: true,
                title: Text('${s.raw('loan.ev.${ev.amount < 0 ? 'reversal' : ev.kind}')} · ${fmtRs(ev.amount.abs())}'),
                subtitle: Text('${fmtDate(ev.ts)}'
                    '${ev.principalPart != 0 || ev.chargePart != 0 ? ' · ${s.raw('loan.ev.split')}: ${fmtRs(ev.principalPart.abs())} / ${fmtRs(ev.chargePart.abs())}' : ''}'),
                trailing: canWrite && ev.amount > 0
                    ? TextButton(
                        onPressed: () async {
                          // The web register confirms silently —
                          // the diary updates in place (no notice
                          // key exists for this in the dictionary).
                          await store.reverseLoanEvent(loan.id, ev.entryId);
                        },
                        child: Text(s.raw('loan.reverse')),
                      )
                    : null,
              ),
          ]),
        ),
      ),
      actions: [
        if (canWrite && loan.status == 'active' && nextAccrual != null)
          TextButton(
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: Text(s.raw('loan.accrue')),
                  content: Text(s.raw('loan.accrue.confirm')),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
                    FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('loan.accrue'))),
                  ],
                ),
              );
              if (confirm != true) return;
              final done = await store.accrueLoanCharge(loan.id);
              if (context.mounted && done) f3Notice(context, s.raw('loan.accrue.done'));
            },
            child: Text(s.raw('loan.accrue')),
          ),
        if (canWrite && loan.status == 'active')
          FilledButton(
            onPressed: () => _repayDialog(context, loan),
            child: Text(s.raw('loan.repay')),
          ),
        if (store.role == 'owner' && loan.events.isEmpty)
          TextButton(
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: Text(s.raw('loan.delete')),
                  content: Text(s.raw('loan.delete.confirm')),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
                    FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('loan.delete'))),
                  ],
                ),
              );
              if (confirm != true) return;
              final done = await store.deleteLoan(loan.id);
              if (context.mounted && done) Navigator.pop(context);
            },
            child: Text(s.raw('loan.delete')),
          ),
        TextButton(onPressed: () => Navigator.pop(context), child: Text(s.raw('action.close'))),
      ],
    );
  }

  Widget _row(String k, String v) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(children: [
          Expanded(child: Text(k)),
          Text(v, style: const TextStyle(fontWeight: FontWeight.w600)),
        ]),
      );
}

Future<void> _repayDialog(BuildContext context, Loan loan) async {
  final s = S.current;
  final store = context.read<ShopStore>();
  final pos = loanPosition(loan);
  final amount = TextEditingController(text: pos.outstanding.toString());
  var split = defaultRepaymentSplit(loan, pos.outstanding);
  final principalCtrl = TextEditingController(text: split.principalPart.toString());
  final chargeCtrl = TextEditingController(text: split.chargePart.toString());
  var method = 'cash';
  String? accountId;
  String? error;
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setLocal) {
        void refreshSplit() {
          final amt = double.tryParse(amount.text) ?? 0;
          split = defaultRepaymentSplit(loan, amt);
          principalCtrl.text = split.principalPart.toString();
          chargeCtrl.text = split.chargePart.toString();
        }

        return AlertDialog(
          title: Text('${s.raw('loan.repay')} · ${loan.number}'),
          content: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('${s.raw('loan.col.outstanding')}: ${fmtRs(pos.outstanding)}'),
            TextField(
              controller: amount, keyboardType: TextInputType.number,
              decoration: InputDecoration(labelText: s.raw('loan.repay.amount')),
              onChanged: (_) => setLocal(refreshSplit),
            ),
            Row(children: [
              Expanded(child: TextField(controller: principalCtrl, keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: s.raw('loan.repay.principalPart')))),
              const SizedBox(width: 8),
              Expanded(child: TextField(controller: chargeCtrl, keyboardType: TextInputType.number,
                  decoration: InputDecoration(labelText: s.raw('loan.repay.chargePart')))),
            ]),
            MethodDropdown(value: method, onChanged: (v) => setLocal(() => method = v)),
            AccountDropdown(accounts: store.accounts, value: accountId,
                label: s.raw('loan.repay.account'),
                onChanged: (v) => setLocal(() => accountId = v)),
            if (error != null)
              Text(error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ]),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
            FilledButton(
              onPressed: () {
                final amt = double.tryParse(amount.text) ?? 0;
                final sp = (
                  principalPart: double.tryParse(principalCtrl.text) ?? 0,
                  chargePart: double.tryParse(chargeCtrl.text) ?? 0,
                );
                final err = repaymentSplitError(loan, amt, sp);
                if (err != null) {
                  // The web maps every split refusal to the one
                  // honest message (LoansView parity).
                  setLocal(() => error = s.raw('loan.repay.errAmount'));
                  return;
                }
                Navigator.pop(context, true);
              },
              child: Text(s.raw('loan.repay')),
            ),
          ],
        );
      },
    ),
  );
  if (ok != true || !context.mounted) return;
  final done = await store.repayLoan(
    loanId: loan.id,
    amount: double.tryParse(amount.text) ?? 0,
    method: method, accountId: accountId,
    splitPrincipalPart: double.tryParse(principalCtrl.text),
    splitChargePart: double.tryParse(chargeCtrl.text),
  );
  if (context.mounted && done) f3Notice(context, s.raw('loan.repay.done'));
}
