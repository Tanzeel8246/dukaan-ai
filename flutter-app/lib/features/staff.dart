/// Staff (F4): the employee directory, the tap-to-mark
/// attendance grid and monthly payroll runs — the web's Phase D1
/// + D2 surfaces, driven entirely by core/payroll.dart (the same
/// derivations the golden fixtures pin byte-for-byte). Money
/// moves only through the store's guarded payroll actions.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../core/payroll.dart';
import '../core/permissions.dart';
import '../core/print_docs.dart';
import '../core/periods.dart';
import '../core/types.dart';
import '../data/store.dart';
import '../l10n/app_strings.dart';
import '../l10n/strings.dart';
import '../main.dart' show fmtRs;
import 'f2_common.dart';
import 'f3_common.dart';
import 'print/doc_view.dart';

String _monthOf(String iso) => iso.substring(0, 7);

String _shiftMonth(String month, int delta) {
  final y = int.parse(month.substring(0, 4));
  final m = int.parse(month.substring(5, 7)) + delta;
  final yy = y + (m - 1) ~/ 12;
  final mm = ((m - 1) % 12) + 1;
  return '${yy.toString().padLeft(4, '0')}-${mm.toString().padLeft(2, '0')}';
}

class StaffScreen extends StatefulWidget {
  const StaffScreen({super.key});
  @override
  State<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends State<StaffScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs = TabController(length: 3, vsync: this);
  String _attMonth = '';
  String _payMonth = '';

  @override
  void initState() {
    super.initState();
    final now = _monthOf(todayPktISO());
    _attMonth = now;
    _payMonth = now;
  }

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final canDir = can(store.role, 'staffDirectory', 'write');
    final canPay = can(store.role, 'payroll', 'write');
    return Column(children: [
      TabBar(
        controller: _tabs,
        isScrollable: true,
        tabs: [
          Tab(text: s.raw('staff.tab.directory')),
          Tab(text: s.raw('staff.tab.attendance')),
          Tab(text: s.raw('staff.tab.payroll')),
        ],
      ),
      Expanded(
        child: TabBarView(controller: _tabs, children: [
          _DirectoryTab(canWrite: canDir),
          _AttendanceTab(month: _attMonth, canWrite: canDir,
              onMonth: (m) => setState(() => _attMonth = m)),
          _PayrollTab(month: _payMonth, canWrite: canPay,
              onMonth: (m) => setState(() => _payMonth = m)),
        ]),
      ),
    ]);
  }
}

/* ---------------- directory ---------------- */

class _DirectoryTab extends StatelessWidget {
  final bool canWrite;
  const _DirectoryTab({required this.canWrite});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final emps = store.employees;
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
        child: Row(children: [
          Expanded(child: Text(s.raw('staff.subtitle'))),
          if (canWrite)
            FilledButton.icon(
              onPressed: () => _employeeForm(context, null),
              icon: const Icon(Icons.person_add_outlined, size: 18),
              label: Text(s.raw('staff.add')),
            ),
        ]),
      ),
      Expanded(
        child: emps.isEmpty
            ? Center(child: Text(s.raw('staff.empty.none')))
            : ListView.builder(
                itemCount: emps.length,
                itemBuilder: (context, i) {
                  final e = emps[i];
                  final pos = employeePosition(store.journal, e.id);
                  return ListTile(
                    leading: CircleAvatar(child: Text(e.name.isEmpty ? '?' : e.name[0])),
                    title: Text(e.name),
                    subtitle: Text([
                      if (e.designation.isNotEmpty) e.designation,
                      e.payBasis == 'daily'
                          ? '${s.raw('staff.pay.daily')} · ${fmtRs(e.baseAmount)}'
                          : '${s.raw('staff.pay.monthly')} · ${fmtRs(e.baseAmount)}',
                      if (!e.active) s.raw('staff.badge.inactive'),
                    ].join(' · ')),
                    trailing: pos < -0.001
                        ? Text('${s.raw('staff.pos.owed')} ${fmtRs(-pos)}')
                        : pos > 0.001
                            ? Text('${s.raw('staff.pos.advance')} ${fmtRs(pos)}')
                            : Text(s.raw('staff.pos.settled')),
                    onTap: () => _employeeDetail(context, e.id),
                  );
                },
              ),
      ),
    ]);
  }
}

Future<void> _employeeForm(BuildContext context, Employee? existing) async {
  final s = S.current;
  final store = context.read<ShopStore>();
  final name = TextEditingController(text: existing?.name ?? '');
  final phone = TextEditingController(text: existing?.phone ?? '');
  final designation = TextEditingController(text: existing?.designation ?? '');
  final email = TextEditingController(text: existing?.linkedUserEmail ?? '');
  final join = TextEditingController(text: existing?.joinDateISO ?? '');
  final base = TextEditingController(text: existing == null ? '' : existing.baseAmount.toString());
  final leaves = TextEditingController(text: (existing?.paidLeaveDays ?? 0).toString());
  final note = TextEditingController(text: existing?.note ?? '');
  var basis = existing?.payBasis ?? 'monthly';
  final allowances = <({TextEditingController label, TextEditingController amount})>[
    for (final a in existing?.allowances ?? const <PayLine>[])
      (label: TextEditingController(text: a.label), amount: TextEditingController(text: a.amount.toString())),
  ];
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setLocal) => AlertDialog(
        title: Text(s.raw(existing == null ? 'staff.add' : 'staff.form.editTitle')),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            TextField(controller: name, decoration: InputDecoration(labelText: s.raw('staff.form.name'))),
            TextField(controller: phone, decoration: InputDecoration(labelText: s.raw('staff.form.phone'))),
            TextField(controller: designation, decoration: InputDecoration(labelText: s.raw('staff.form.designation'))),
            TextField(controller: email, decoration: InputDecoration(labelText: s.raw('staff.form.linkedEmail'), helperText: s.raw('staff.form.linkedHelp'))),
            TextField(controller: join, decoration: InputDecoration(labelText: s.raw('staff.form.joinDate'), hintText: 'YYYY-MM-DD')),
            DropdownButtonFormField<String>(
              initialValue: basis,
              decoration: InputDecoration(labelText: s.raw('staff.form.payBasis')),
              items: [
                DropdownMenuItem(value: 'monthly', child: Text(s.raw('staff.form.basis.monthly'))),
                DropdownMenuItem(value: 'daily', child: Text(s.raw('staff.form.basis.daily'))),
              ],
              onChanged: (v) => setLocal(() => basis = v ?? 'monthly'),
            ),
            TextField(controller: base, keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: s.raw(basis == 'daily' ? 'staff.form.baseDaily' : 'staff.form.baseMonthly'))),
            TextField(controller: leaves, keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: s.raw('staff.form.paidLeaveDays'), helperText: s.raw('staff.form.paidLeaveHelp'))),
            const SizedBox(height: 8),
            Align(alignment: AlignmentDirectional.centerStart,
                child: Text(s.raw('staff.form.allowances'), style: Theme.of(context).textTheme.titleSmall)),
            for (var i = 0; i < allowances.length; i++)
              Row(children: [
                Expanded(child: TextField(controller: allowances[i].label,
                    decoration: InputDecoration(labelText: s.raw('staff.form.allowanceLabelPh'), isDense: true))),
                const SizedBox(width: 8),
                SizedBox(width: 100, child: TextField(controller: allowances[i].amount,
                    keyboardType: TextInputType.number, decoration: const InputDecoration(isDense: true))),
                IconButton(icon: const Icon(Icons.close, size: 18),
                    onPressed: () => setLocal(() => allowances.removeAt(i))),
              ]),
            TextButton.icon(
              onPressed: () => setLocal(() => allowances.add((
                    label: TextEditingController(), amount: TextEditingController()))),
              icon: const Icon(Icons.add, size: 16),
              label: Text(s.raw('pay.line.addAllowance')),
            ),
            TextField(controller: note, decoration: InputDecoration(labelText: s.raw('staff.form.note'))),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
          FilledButton(onPressed: () => Navigator.pop(context, true),
              child: Text(s.raw(existing == null ? 'staff.add' : 'staff.form.saveChanges'))),
        ],
      ),
    ),
  );
  if (ok != true || !context.mounted) return;
  final lines = [
    for (final a in allowances)
      PayLine(label: a.label.text.trim(), amount: double.tryParse(a.amount.text) ?? 0),
  ];
  if (existing == null) {
    final id = await store.addEmployee(
      name: name.text, phone: phone.text, designation: designation.text,
      linkedUserEmail: email.text, joinDateISO: join.text,
      payBasis: basis, baseAmount: double.tryParse(base.text) ?? 0,
      allowances: lines, paidLeaveDays: int.tryParse(leaves.text) ?? 0, note: note.text,
    );
    if (context.mounted) {
      f3Notice(context, id != null ? s.raw('staff.notice.added') : s.raw('staff.err.nameRequired'));
    }
  } else {
    final done = await store.saveEmployee(existing.copyWith(
      name: name.text, phone: phone.text.trim(), designation: designation.text.trim(),
      linkedUserEmail: email.text.trim().isEmpty ? null : email.text.trim().toLowerCase(),
      clearLinkedEmail: email.text.trim().isEmpty,
      joinDateISO: join.text.trim().isEmpty ? null : join.text.trim(),
      clearJoinDate: join.text.trim().isEmpty,
      payBasis: basis, baseAmount: double.tryParse(base.text) ?? 0,
      allowances: lines, paidLeaveDays: int.tryParse(leaves.text) ?? 0, note: note.text,
    ));
    if (context.mounted) {
      f3Notice(context, done ? s.raw('staff.notice.updated') : s.raw('staff.err.nameRequired'));
    }
  }
}

Future<void> _employeeDetail(BuildContext context, String id) async {
  await showDialog<void>(
    context: context,
    builder: (context) => _EmployeeDetailDialog(employeeId: id),
  );
}

class _EmployeeDetailDialog extends StatelessWidget {
  final String employeeId;
  const _EmployeeDetailDialog({required this.employeeId});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final e = store.employeeById(employeeId);
    if (e == null) return const AlertDialog(content: Text('—'));
    final pos = employeePosition(store.journal, e.id);
    final canDir = can(store.role, 'staffDirectory', 'write');
    final canPay = can(store.role, 'payroll', 'write');
    // Salary history derived from posted runs (web §1.5): each
    // run that carries this employee, with its net and what the
    // run has actually paid them.
    final history = [
      for (final r in store.payrollRuns)
        if (r.status == 'posted' && r.lines.any((l) => l.employeeId == e.id))
          (
            number: r.number,
            month: r.month,
            netAccrued: r.lines.firstWhere((l) => l.employeeId == e.id).netAccrued,
            paid: paidForRun(r, e.id),
          ),
    ];
    return AlertDialog(
      title: Text(e.name),
      content: SingleChildScrollView(
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (e.designation.isNotEmpty) Text(e.designation),
          Text(e.phone.isEmpty ? s.raw('staff.profile.noPhone') : e.phone),
          if (e.joinDateISO != null) Text('${s.raw('staff.profile.joined')}: ${e.joinDateISO}'),
          const Divider(),
          Text(s.raw('staff.profile.positionTitle'), style: Theme.of(context).textTheme.titleSmall),
          _kv(s.raw('pay.det.accrued'),
              fmtRs(history.fold(0.0, (sum, h) => sum + h.netAccrued))),
          _kv(s.raw('pay.det.paid'), fmtRs(history.fold(0.0, (sum, h) => sum + h.paid))),
          _kv(s.raw('staff.profile.advance'), fmtRs(pos > 0 ? pos : 0)),
          _kv(s.raw('staff.profile.owed'), fmtRs(pos < 0 ? -pos : 0)),
          const Divider(),
          Text(s.raw('pay.history.title'), style: Theme.of(context).textTheme.titleSmall),
          if (history.isEmpty) Text(s.raw('pay.history.empty')),
          for (final h in history)
            _kv('${h.number ?? h.month} · ${h.month}',
                '${s.raw('pay.history.col.net')} ${fmtRs(h.netAccrued)} · ${s.raw('pay.history.col.paid')} ${fmtRs(h.paid)}'),
        ]),
      ),
      actions: [
        if (canPay)
          TextButton(
            onPressed: () => _advanceDialog(context, e),
            child: Text(s.raw('pay.action.advance')),
          ),
        if (canDir)
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await _employeeForm(context, e);
            },
            child: Text(s.raw('action.edit')),
          ),
        if (canDir)
          TextButton(
            onPressed: () async {
              final done = await store.setEmployeeActive(e.id, !e.active);
              if (context.mounted && done) {
                f3Notice(context, s.raw(e.active ? 'staff.notice.deactivated' : 'staff.notice.reactivated'));
              }
              if (context.mounted) Navigator.pop(context);
            },
            child: Text(s.raw(e.active ? 'staff.action.deactivate' : 'staff.action.reactivate')),
          ),
        if (canDir)
          TextButton(
            onPressed: () async {
              final done = await store.deleteEmployee(e.id);
              if (context.mounted) {
                f3Notice(context, done ? s.raw('staff.notice.deleted') : s.raw('staff.delete.blocked'));
                if (done) Navigator.pop(context);
              }
            },
            child: Text(s.raw('action.delete')),
          ),
        TextButton(onPressed: () => Navigator.pop(context), child: Text(s.raw('action.close'))),
      ],
    );
  }
}

Widget _kv(String k, String v) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(children: [
        Expanded(child: Text(k)),
        Text(v, style: const TextStyle(fontWeight: FontWeight.w600)),
      ]),
    );

Future<void> _advanceDialog(BuildContext context, Employee e) async {
  final s = S.current;
  final store = context.read<ShopStore>();
  final amount = TextEditingController();
  var method = 'cash';
  String? accountId;
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setLocal) => AlertDialog(
        title: Text(s.raw('pay.advance.title')),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text(s.raw('pay.advance.caption')),
          TextField(controller: amount, keyboardType: TextInputType.number,
              decoration: InputDecoration(labelText: s.raw('pay.pay.amount'))),
          MethodDropdown(value: method, onChanged: (v) => setLocal(() => method = v)),
          AccountDropdown(accounts: store.accounts, value: accountId,
              onChanged: (v) => setLocal(() => accountId = v)),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('pay.action.advance'))),
        ],
      ),
    ),
  );
  if (ok != true || !context.mounted) return;
  final id = await store.giveSalaryAdvance(
    employeeId: e.id, amount: double.tryParse(amount.text) ?? 0,
    method: method, accountId: accountId,
  );
  if (context.mounted) {
    f3Notice(context, id != null ? s.raw('pay.advance.done') : s.raw('pay.advance.errAmount'));
  }
}

/* ---------------- attendance ---------------- */

class _AttendanceTab extends StatelessWidget {
  final String month;
  final bool canWrite;
  final ValueChanged<String> onMonth;
  const _AttendanceTab({required this.month, required this.canWrite, required this.onMonth});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final days = daysInMonthOf(month);
    final posted = hasPostedRunForMonth(store.payrollRuns, month);
    final actives = store.employees.where((e) => e.active).toList();
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
        child: Row(children: [
          IconButton(icon: const Icon(Icons.chevron_left),
              onPressed: () => onMonth(_shiftMonth(month, -1))),
          Text(month, style: Theme.of(context).textTheme.titleMedium),
          IconButton(icon: const Icon(Icons.chevron_right),
              onPressed: () => onMonth(_shiftMonth(month, 1))),
          const SizedBox(width: 8),
          Expanded(child: Text(s.raw('att.help'), style: Theme.of(context).textTheme.bodySmall)),
        ]),
      ),
      if (posted)
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Row(children: [
            const Icon(Icons.lock_outline, size: 16),
            const SizedBox(width: 6),
            Expanded(child: Text(s.raw('att.postedWarning'))),
          ]),
        ),
      Expanded(
        child: actives.isEmpty
            ? Center(child: Text(s.raw('att.empty')))
            : SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  columns: [
                    DataColumn(label: Text(s.raw('att.col.employee'))),
                    for (var d = 1; d <= days; d++) DataColumn(label: Text('$d')),
                    DataColumn(label: Text(s.raw('att.col.summary'))),
                  ],
                  rows: [
                    for (final e in actives)
                      DataRow(cells: [
                        DataCell(Text(e.name)),
                        for (var d = 1; d <= days; d++)
                          DataCell(_MarkCell(
                            mark: store.attendanceDoc(e.id, month)?.days['$d'],
                            onTap: canWrite
                                ? () async {
                                    final cur = store.attendanceDoc(e.id, month)?.days['$d'];
                                    await store.setAttendanceMark(
                                        e.id, month, d, nextAttendanceMark(cur));
                                  }
                                : null,
                          )),
                        DataCell(Text(_summaryText(s, store, e))),
                      ]),
                  ],
                ),
              ),
      ),
      Padding(
        padding: const EdgeInsets.all(12),
        child: Text(s.raw('att.legend'), style: Theme.of(context).textTheme.bodySmall),
      ),
    ]);
  }

  String _summaryText(Strings s, ShopStore store, Employee e) {
    final doc = store.attendanceDoc(e.id, month);
    final sum = attendanceSummary(doc);
    return '${s.raw('att.short.present')} ${sum.present} · ${s.raw('att.short.absent')} ${sum.absent} · '
        '${s.raw('att.short.half')} ${sum.half} · ${s.raw('att.short.leave')} ${sum.leave}';
  }
}

class _MarkCell extends StatelessWidget {
  final String? mark;
  final VoidCallback? onTap;
  const _MarkCell({required this.mark, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final label = switch (mark) {
      'present' => s.raw('att.short.present'),
      'absent' => s.raw('att.short.absent'),
      'half' => s.raw('att.short.half'),
      'leave' => s.raw('att.short.leave'),
      'off' => s.raw('att.short.off'),
      _ => '·',
    };
    return InkWell(
      onTap: onTap,
      child: Container(
        width: 30, height: 30, alignment: Alignment.center,
        decoration: BoxDecoration(
          color: mark == null ? null : Theme.of(context).colorScheme.primaryContainer,
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(label, style: const TextStyle(fontSize: 12)),
      ),
    );
  }
}

/* ---------------- payroll ---------------- */

class _PayrollTab extends StatelessWidget {
  final String month;
  final bool canWrite;
  final ValueChanged<String> onMonth;
  const _PayrollTab({required this.month, required this.canWrite, required this.onMonth});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final runs = [...store.payrollRuns]..sort((a, b) => b.month.compareTo(a.month));
    final comp = salaryPayableComposition(store.journal);
    return ListView(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
        child: Row(children: [
          IconButton(icon: const Icon(Icons.chevron_left),
              onPressed: () => onMonth(_shiftMonth(month, -1))),
          Text(month, style: Theme.of(context).textTheme.titleMedium),
          IconButton(icon: const Icon(Icons.chevron_right),
              onPressed: () => onMonth(_shiftMonth(month, 1))),
          const Spacer(),
          if (canWrite)
            FilledButton.icon(
              onPressed: () async {
                final id = await store.composePayrollRun(month);
                if (context.mounted) {
                  if (id != null) {
                    f3Notice(context, s.raw('pay.notice.composed'));
                    _runDetail(context, id);
                  }
                }
              },
              icon: const Icon(Icons.add, size: 18),
              label: Text(s.raw('pay.compose')),
            ),
        ]),
      ),
      if (comp.unassignedAccrued > 0.001 || comp.advancesOutstanding > 0.001)
        Card(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          child: ListTile(
            title: Text(s.raw('pay.bucket.title')),
            subtitle: Text(s.raw('pay.bucket.caption')),
            trailing: Text(fmtRs(comp.unassignedAccrued)),
          ),
        ),
      if (runs.isEmpty)
        Padding(padding: const EdgeInsets.all(24), child: Text(s.raw('pay.empty.none'))),
      for (final r in runs)
        ListTile(
          leading: const Icon(Icons.payments_outlined),
          title: Text('${r.number ?? s.raw('pay.draftLabel')} · ${r.month}'),
          subtitle: Text('${s.raw('pay.col.net')} ${fmtRs(r.totals.netAccrued)} · '
              '${s.raw('pay.col.paid')} ${fmtRs(r.payments.fold(0.0, (sum, p) => sum + p.amount))}'),
          trailing: Chip(label: Text(s.raw('pay.status.${r.status}'))),
          onTap: () => _runDetail(context, r.id),
        ),
    ]);
  }
}

Future<void> _runDetail(BuildContext context, String runId) async {
  await showDialog<void>(
    context: context,
    builder: (context) => _RunDetailDialog(runId: runId),
  );
}

class _RunDetailDialog extends StatelessWidget {
  final String runId;
  const _RunDetailDialog({required this.runId});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    final store = context.watch<ShopStore>();
    final run = store.runById(runId);
    if (run == null) return const AlertDialog(content: Text('—'));
    final canPay = can(store.role, 'payroll', 'write');
    final draft = run.status == 'draft';
    return AlertDialog(
      title: Text('${run.number ?? s.raw('pay.draftLabel')} · ${run.month}'),
      content: SizedBox(
        width: 560,
        child: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            _kv(s.raw('pay.col.gross'), fmtRs(run.totals.gross)),
            _kv(s.raw('pay.col.deductions'), fmtRs(run.totals.deductions)),
            _kv(s.raw('pay.col.net'), fmtRs(run.totals.netAccrued)),
            const Divider(),
            for (final line in run.lines)
              Builder(builder: (context) {
                final fig = run.status == 'posted'
                    ? runLineFigures(store.journal, run, line)
                    : null;
                final paid = paidForRun(run, line.employeeId);
                final remaining = line.netAccrued - paid;
                return ListTile(
                  dense: true,
                  title: Text(line.name),
                  subtitle: Text(fig != null
                      ? '${s.raw('pay.det.accrued')} ${fmtRs(fig.netAccrued)} · '
                          '${s.raw('pay.det.advanceBefore')} ${fmtRs(fig.advanceBefore)} · '
                          '${s.raw('pay.det.recovered')} ${fmtRs(fig.advanceRecovered)} · '
                          '${s.raw('pay.det.paid')} ${fmtRs(fig.cashPaid)} · '
                          '${s.raw('pay.det.stillOwed')} ${fmtRs(fig.stillOwed)}'
                      : '${s.raw('pay.line.earned')} ${fmtRs(line.earnedBase)} · '
                          '${s.raw('pay.line.gross')} ${fmtRs(line.gross)} · '
                          '${s.raw('pay.line.net')} ${fmtRs(line.netAccrued)}'),
                  trailing: Row(mainAxisSize: MainAxisSize.min, children: [
                    if (draft && canPay)
                      IconButton(icon: const Icon(Icons.edit_outlined, size: 18),
                          onPressed: () => _lineEditor(context, run, line)),
                    if (!draft && canPay && remaining > 0.001)
                      TextButton(
                        onPressed: () => _payDialog(context, run, line.employeeId, line.name, remaining),
                        child: Text(s.raw('pay.action.pay')),
                      ),
                    if (!draft)
                      IconButton(icon: const Icon(Icons.receipt_long_outlined, size: 18),
                          onPressed: () => _slipDialog(context, run, line)),
                  ]),
                );
              }),
            if (!draft) ...[
              const Divider(),
              Text(s.raw('pay.payments.title'), style: Theme.of(context).textTheme.titleSmall),
              if (run.payments.isEmpty) Text(s.raw('pay.payments.empty')),
              for (final p in run.payments)
                ListTile(
                  dense: true,
                  title: Text('${p.name} · ${fmtRs(p.amount.abs())}'),
                  subtitle: Text(p.amount < 0 ? s.raw('pay.payments.reversedRow') : fmtDate(p.ts)),
                  trailing: canPay && p.amount > 0
                      ? TextButton(
                          onPressed: () async {
                            final done = await store.reversePayrollPayment(run.id, p.entryId);
                            if (context.mounted && done) {
                              f3Notice(context, s.raw('pay.notice.paymentReversed'));
                            }
                          },
                          child: Text(s.raw('pay.action.reversePayment')),
                        )
                      : null,
                ),
              if (salaryPayableComposition(store.journal).unassignedAccrued > 0.001 && canPay)
                ListTile(
                  dense: true,
                  title: Text(s.raw('pay.bucket.title')),
                  trailing: TextButton(
                    onPressed: () => _payDialog(context, run, null, s.raw('pay.bucket.title'),
                        salaryPayableComposition(store.journal).unassignedAccrued),
                    child: Text(s.raw('pay.action.pay')),
                  ),
                ),
            ],
          ]),
        ),
      ),
      actions: [
        if (draft && canPay)
          FilledButton(
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: Text(s.raw('pay.finalise.confirmTitle')),
                  content: Text(s.raw('pay.finalise.confirmBody')),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
                    FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('pay.action.finalise'))),
                  ],
                ),
              );
              if (confirm != true) return;
              final done = await store.finalisePayrollRun(run.id);
              if (context.mounted) {
                f3Notice(context, done ? s.raw('pay.notice.finalised') : s.raw('pay.finalise.postedMonth'));
                if (done) Navigator.pop(context);
              }
            },
            child: Text(s.raw('pay.action.finalise')),
          ),
        if (draft && store.role == 'owner')
          TextButton(
            onPressed: () async {
              final done = await store.deletePayrollRun(run.id);
              if (context.mounted) {
                if (done) f3Notice(context, s.raw('pay.notice.deleted'));
                Navigator.pop(context);
              }
            },
            child: Text(s.raw('pay.action.deleteDraft')),
          ),
        if (run.status == 'posted' && canPay)
          TextButton(
            onPressed: () async {
              final confirm = await showDialog<bool>(
                context: context,
                builder: (context) => AlertDialog(
                  title: Text(s.raw('pay.reverse.confirmTitle')),
                  content: Text(s.raw('pay.reverse.confirmBody')),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
                    FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('pay.action.reverseRun'))),
                  ],
                ),
              );
              if (confirm != true) return;
              final done = await store.reversePayrollRun(run.id);
              if (context.mounted && done) {
                f3Notice(context, s.raw('pay.notice.runReversed'));
                Navigator.pop(context);
              }
            },
            child: Text(s.raw('pay.action.reverseRun')),
          ),
        TextButton(onPressed: () => Navigator.pop(context), child: Text(s.raw('action.close'))),
      ],
    );
  }
}

Future<void> _lineEditor(BuildContext context, PayrollRun run, PayrollRunLine line) async {
  final s = S.current;
  final store = context.read<ShopStore>();
  final allowances = <({TextEditingController label, TextEditingController amount})>[
    for (final a in line.allowances)
      (label: TextEditingController(text: a.label), amount: TextEditingController(text: a.amount.toString())),
  ];
  final deductions = <({TextEditingController label, TextEditingController amount})>[
    for (final a in line.deductions)
      (label: TextEditingController(text: a.label), amount: TextEditingController(text: a.amount.toString())),
  ];
  List<({TextEditingController label, TextEditingController amount})> rows(
          List<({TextEditingController label, TextEditingController amount})> src) =>
      [...src];
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setLocal) => AlertDialog(
        title: Text('${s.raw('pay.editor.title')} · ${line.name}'),
        content: SingleChildScrollView(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(s.raw('pay.editor.caption')),
            const SizedBox(height: 6),
            Align(alignment: AlignmentDirectional.centerStart,
                child: Text(s.raw('pay.line.allowances'), style: Theme.of(context).textTheme.titleSmall)),
            for (var i = 0; i < allowances.length; i++)
              Row(children: [
                Expanded(child: TextField(controller: allowances[i].label, decoration: const InputDecoration(isDense: true))),
                const SizedBox(width: 8),
                SizedBox(width: 100, child: TextField(controller: allowances[i].amount,
                    keyboardType: TextInputType.number, decoration: const InputDecoration(isDense: true))),
                IconButton(icon: const Icon(Icons.close, size: 18),
                    onPressed: () => setLocal(() => allowances.removeAt(i))),
              ]),
            TextButton.icon(
              onPressed: () => setLocal(() => allowances.add((label: TextEditingController(), amount: TextEditingController()))),
              icon: const Icon(Icons.add, size: 16), label: Text(s.raw('pay.line.addAllowance'))),
            Align(alignment: AlignmentDirectional.centerStart,
                child: Text(s.raw('pay.line.deductions'), style: Theme.of(context).textTheme.titleSmall)),
            for (var i = 0; i < deductions.length; i++)
              Row(children: [
                Expanded(child: TextField(controller: deductions[i].label, decoration: const InputDecoration(isDense: true))),
                const SizedBox(width: 8),
                SizedBox(width: 100, child: TextField(controller: deductions[i].amount,
                    keyboardType: TextInputType.number, decoration: const InputDecoration(isDense: true))),
                IconButton(icon: const Icon(Icons.close, size: 18),
                    onPressed: () => setLocal(() => deductions.removeAt(i))),
              ]),
            TextButton.icon(
              onPressed: () => setLocal(() => deductions.add((label: TextEditingController(), amount: TextEditingController()))),
              icon: const Icon(Icons.add, size: 16), label: Text(s.raw('pay.line.addDeduction'))),
          ]),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('pay.saveDraft'))),
        ],
      ),
    ),
  );
  if (ok != true || !context.mounted) return;
  List<PayLine> parse(List<({TextEditingController label, TextEditingController amount})> src) => [
        for (final r in src)
          PayLine(label: r.label.text.trim(), amount: double.tryParse(r.amount.text) ?? 0),
      ];
  final updated = line.copyWith(
    allowances: parse(rows(allowances)),
    deductions: parse(rows(deductions)),
  );
  final lines = [for (final l in run.lines) l.employeeId == line.employeeId ? updated : l];
  final done = await store.updatePayrollRun(run.copyWith(lines: lines));
  if (context.mounted && done) f3Notice(context, s.raw('pay.notice.saved'));
}

Future<void> _payDialog(BuildContext context, PayrollRun run, String? employeeId,
    String name, double remaining) async {
  final s = S.current;
  final store = context.read<ShopStore>();
  final amount = TextEditingController(text: remaining.toString());
  var method = 'cash';
  String? accountId;
  final ok = await showDialog<bool>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setLocal) => AlertDialog(
        title: Text('${s.raw('pay.pay.title')} · $name'),
        content: Column(mainAxisSize: MainAxisSize.min, children: [
          Text('${s.raw('pay.pay.remaining')}: ${fmtRs(remaining)}'),
          TextField(controller: amount, keyboardType: TextInputType.number,
              decoration: InputDecoration(labelText: s.raw('pay.pay.amount'))),
          MethodDropdown(value: method, onChanged: (v) => setLocal(() => method = v)),
          AccountDropdown(accounts: store.accounts, value: accountId,
              onChanged: (v) => setLocal(() => accountId = v)),
        ]),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(s.raw('action.cancel'))),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text(s.raw('pay.action.pay'))),
        ],
      ),
    ),
  );
  if (ok != true || !context.mounted) return;
  final done = await store.payPayrollEmployee(
    runId: run.id, employeeId: employeeId,
    amount: double.tryParse(amount.text) ?? 0, method: method, accountId: accountId,
  );
  if (context.mounted) {
    f3Notice(context, done ? s.raw('pay.notice.paid') : s.raw('pay.pay.errAmount'));
  }
}

/// F5 (closing the F4 partial "slip = PNG capture + text share,
/// no ESC/POS raster"): the slip is now the DESIGNED page (web
/// SalarySlipSheet — shop header, earnings/deductions sections,
/// the §2.7 derived figures, the shop signature slot) on the
/// shared print sheet: system print, 80mm ESC/POS raster and
/// plain-text share.
Future<void> _slipDialog(BuildContext context, PayrollRun run, PayrollRunLine line) async {
  final s = S.current;
  final store = context.read<ShopStore>();
  final fig = runLineFigures(store.journal, run, line);
  final emp = store.employeeById(line.employeeId);
  final attendanceText = '${s.raw('slip.att.days')} ${line.daysInMonth} · '
      '${s.raw('att.mark.present')} ${line.present} · ${s.raw('att.mark.absent')} ${line.absent} · '
      '${s.raw('att.mark.half')} ${line.half} · ${s.raw('att.mark.leave')} ${line.leave}';
  final page = salarySlipDocPage(
    run: run, line: line,
    designation: emp?.designation ?? '',
    figures: SlipFigures(
      advanceBefore: fig.advanceBefore, advanceRecovered: fig.advanceRecovered,
      cashPaid: fig.cashPaid, stillOwed: fig.stillOwed,
    ),
    ownerDoc: store.ownerDoc,
    title: s.raw('slip.title'),
    monthLabel: s.raw('slip.month'),
    employeeLabel: s.raw('slip.employee'),
    designationLabel: s.raw('slip.designation'),
    attendanceLabel: s.raw('slip.attendance'),
    attendanceText: attendanceText,
    earningsTitle: s.raw('slip.earnings'),
    baseLabel: s.raw('slip.base'),
    grossLabel: s.raw('slip.gross'),
    deductionsTitle: s.raw('slip.deductions'),
    netLabel: s.raw('slip.net'),
    advanceBeforeLabel: s.raw('slip.advBefore'),
    advanceRecoveredLabel: s.raw('slip.advRecovered'),
    paidLabel: s.raw('slip.paid'),
    stillOwedLabel: s.raw('slip.stillOwed'),
    signatureLabel: s.raw('slip.signature'),
    money: fmtRs,
  );
  await showDocPrintSheet(context, page,
      jobName: 'slip-${run.number ?? run.month}-${line.employeeId}');
}
