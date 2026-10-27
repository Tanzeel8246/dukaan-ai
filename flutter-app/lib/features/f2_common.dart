/// Shared F2 building blocks: cheque-draft capture, money-account
/// and method pickers, and small formatting helpers. The web's
/// dictionary already carries every label these surfaces need.
import 'package:flutter/material.dart';

import '../core/mc_workflow.dart' show formatDdMmYyyy;
import '../core/types.dart';
import '../l10n/app_strings.dart';

/// MC workflow adoption: dates are ALWAYS DD/MM/YYYY on every
/// surface that uses this helper (US/ISO dates are a defect, not
/// a display choice). The pure formatter lives in mc_workflow.
String fmtDate(String ts) => formatDdMmYyyy(ts);

/// Localized chart-of-accounts label: fin.acct.<code> where the
/// dictionary carries one, the code itself otherwise (the web's
/// trial balance does the same).
String accountLabel(String code) {
  final key = 'fin.acct.$code';
  final v = S.current.raw(key);
  return v == key ? code : v;
}

/// A money-account dropdown over the shop's live accounts.
class AccountDropdown extends StatelessWidget {
  final List<MoneyAccount> accounts;
  final String? value;
  final ValueChanged<String?> onChanged;
  final String? label;
  const AccountDropdown({super.key, required this.accounts, required this.value, required this.onChanged, this.label});

  @override
  Widget build(BuildContext context) {
    final live = accounts.where((a) => !a.archived).toList();
    return DropdownButtonFormField<String>(
      initialValue: value != null && live.any((a) => a.id == value) ? value : null,
      decoration: InputDecoration(labelText: label ?? S.current.raw('fin.cash.account'), isDense: true),
      items: [
        for (final a in live) DropdownMenuItem(value: a.id, child: Text(a.name)),
      ],
      onChanged: onChanged,
    );
  }
}

/// Pay-method dropdown (cash / jazzcash / easypaisa / bank).
class MethodDropdown extends StatelessWidget {
  final String value;
  final ValueChanged<String> onChanged;
  const MethodDropdown({super.key, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    return DropdownButtonFormField<String>(
      initialValue: value,
      decoration: InputDecoration(labelText: s.raw('credit.field.method'), isDense: true),
      items: [
        DropdownMenuItem(value: 'cash', child: Text(s.raw('common.pay.cash'))),
        DropdownMenuItem(value: 'jazzcash', child: Text(s.raw('common.pay.jazzcash'))),
        DropdownMenuItem(value: 'easypaisa', child: Text(s.raw('common.pay.easypaisa'))),
        DropdownMenuItem(value: 'bank', child: Text(s.raw('common.pay.bank'))),
      ],
      onChanged: (v) => onChanged(v ?? 'cash'),
    );
  }
}

/// Cheque capture fields (number / bank / issue / due). Used by the
/// billing desk, repayment, supplier payment and expense flows —
/// the draft it builds is validated by isValidChequeDraft at the
/// composer, and an invalid draft refuses the whole posting.
class ChequeDraftFields extends StatefulWidget {
  final TextEditingController chequeNo;
  final TextEditingController bankName;
  final TextEditingController issueDate;
  final TextEditingController dueDate;
  const ChequeDraftFields({
    super.key,
    required this.chequeNo,
    required this.bankName,
    required this.issueDate,
    required this.dueDate,
  });

  @override
  State<ChequeDraftFields> createState() => _ChequeDraftFieldsState();

  /// Build the draft from the four controllers (null-safe trim).
  static ChequeDraft draftOf(
    TextEditingController no,
    TextEditingController bank,
    TextEditingController issue,
    TextEditingController due,
  ) =>
      ChequeDraft(
        chequeNo: no.text.trim(),
        bankName: bank.text.trim(),
        issueDateISO: issue.text.trim(),
        dueDateISO: due.text.trim(),
      );
}

class _ChequeDraftFieldsState extends State<ChequeDraftFields> {
  @override
  void initState() {
    super.initState();
    if (widget.issueDate.text.isEmpty) {
      widget.issueDate.text = DateTime.now().toIso8601String().substring(0, 10);
    }
    if (widget.dueDate.text.isEmpty) {
      widget.dueDate.text = DateTime.now().toIso8601String().substring(0, 10);
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = S.current;
    return Column(mainAxisSize: MainAxisSize.min, children: [
      Row(children: [
        Expanded(child: TextField(controller: widget.chequeNo, decoration: InputDecoration(labelText: s.raw('chq.field.no'), isDense: true))),
        const SizedBox(width: 8),
        Expanded(child: TextField(controller: widget.bankName, decoration: InputDecoration(labelText: s.raw('chq.field.bank'), isDense: true))),
      ]),
      Row(children: [
        Expanded(child: TextField(controller: widget.issueDate, decoration: InputDecoration(labelText: s.raw('chq.field.issueDate'), isDense: true, hintText: 'DD/MM/YYYY'))),
        const SizedBox(width: 8),
        Expanded(child: TextField(controller: widget.dueDate, decoration: InputDecoration(labelText: s.raw('chq.field.dueDate'), isDense: true, hintText: 'DD/MM/YYYY'))),
      ]),
    ]);
  }
}

/// A compact stat card for finance/report headlines.
class StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color? color;
  const StatCard({super.key, required this.label, required this.value, this.color});

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
