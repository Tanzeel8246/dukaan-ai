/// Dukaan AI — Tally export + journal CSV (Dart port of
/// web/lib/tally.ts + web/lib/csv.ts, ERP Phase D · D5).
///
/// Design: ERP-PHASE-D-DESIGN.md §5. Two pure renderings of
/// the journal for a chosen range:
///  - **Tally XML**: ledger masters first (COA ledgers under
///    the FIXED §5.2 group mapping — the owner may override
///    ledger NAMES via `settings.tallyLedgerNames`, never
///    groups), then ONE `<VOUCHER>` per journal entry. Party-
///    ref'd lines export against per-party ledgers. OPENING
///    balances are derived from pre-range entries and emitted
///    in the file only (§4.5: the journal never stores them).
///  - **Journal CSV**: the same range as flat rows, one per
///    journal line, through the same naming pass.
/// Sign convention (Tally's documented import semantics): an
/// ALLLEDGERENTRIES AMOUNT is NEGATIVE for a deemed-positive
/// (debit) line and positive for a credit line; OPENINGBALANCE
/// follows the same rule.
import 'coa.dart';
import 'fiscal.dart';
import 'ledger.dart';
import 'periods.dart';
import 'reports.dart';
import 'types.dart';

/* ---------------- the fixed COA → Tally mapping (§5.2) ---------------- */

class TallyLedgerDef {
  final String name;
  final String group;
  const TallyLedgerDef(this.name, this.group);
}

/// The §5.2 table, verbatim (with the recorded completion:
/// `inventory_loss` maps beside COGS under Direct Expenses —
/// every COA code must map, or the export strands real lines).
const Map<String, TallyLedgerDef> tallyLedgerMap = {
  'cash': TallyLedgerDef('Cash', 'Cash-in-Hand'),
  'wallet': TallyLedgerDef('Wallet & Bank', 'Bank Accounts'),
  'receivables': TallyLedgerDef('Sundry Debtors — Control', 'Sundry Debtors'),
  'payables': TallyLedgerDef('Sundry Creditors — Control', 'Sundry Creditors'),
  'inventory': TallyLedgerDef('Stock — Goods', 'Stock-in-Hand'),
  'inventory_raw': TallyLedgerDef('Stock — Raw Material', 'Stock-in-Hand'),
  'wip': TallyLedgerDef('Stock — WIP', 'Stock-in-Hand'),
  'tax_payable': TallyLedgerDef('Tax Payable', 'Duties & Taxes'),
  'tax_input': TallyLedgerDef('Input Tax Credit', 'Duties & Taxes'),
  'cheques_in_hand': TallyLedgerDef('Cheques in Hand', 'Current Assets'),
  'cheques_issued': TallyLedgerDef('Cheques Issued', 'Current Liabilities'),
  'salary_payable': TallyLedgerDef('Salary Payable', 'Current Liabilities'),
  'loans_payable': TallyLedgerDef('Loans Payable', 'Loans (Liability)'),
  'loans_receivable': TallyLedgerDef('Loans Receivable', 'Loans & Advances (Asset)'),
  'capital': TallyLedgerDef('Owner Capital', 'Capital Account'),
  'retained_earnings': TallyLedgerDef('Retained Earnings', 'Reserves & Surplus'),
  'drawings': TallyLedgerDef('Owner Drawings', 'Capital Account'),
  'sales_revenue': TallyLedgerDef('Sales', 'Sales Accounts'),
  'sales_discount': TallyLedgerDef('Sales Discount', 'Sales Accounts'),
  'purchases': TallyLedgerDef('Purchases', 'Purchase Accounts'),
  'cogs': TallyLedgerDef('Cost of Goods Sold', 'Direct Expenses'),
  'inventory_loss': TallyLedgerDef('Inventory Loss', 'Direct Expenses'),
  'expense_rent': TallyLedgerDef('Rent', 'Indirect Expenses'),
  'expense_electricity': TallyLedgerDef('Electricity', 'Indirect Expenses'),
  'expense_transport': TallyLedgerDef('Transport', 'Indirect Expenses'),
  'expense_other': TallyLedgerDef('Other Expenses', 'Indirect Expenses'),
  'expense_salary': TallyLedgerDef('Salaries', 'Indirect Expenses'),
  'expense_finance': TallyLedgerDef('Finance Charges', 'Indirect Expenses'),
  // Phase H · H1 (design §1.2): the points liability exports as a
  // PER-CUSTOMER party ledger (party resolution below); the
  // programme cost is an ordinary indirect expense.
  'loyalty_payable': TallyLedgerDef('Customer Loyalty Payable', 'Current Liabilities'),
  'expense_loyalty': TallyLedgerDef('Loyalty Programme Cost', 'Indirect Expenses'),
};

/// The ledger NAME an account exports under: the owner's
/// override when set (trimmed, non-empty), else the §5.2
/// default. The GROUP is never affected.
String tallyLedgerName(String code, ShopSettingsView? settings) {
  final override = settings?.tallyLedgerNames[code];
  return (override != null && override.trim().isNotEmpty)
      ? override.trim()
      : tallyLedgerMap[code]!.name;
}

/* ---------------- voucher types (§5.3) ---------------- */

/// The §5.3 table for every refType whose voucher type is
/// fixed. The two loan refTypes are directional and resolve
/// in [tallyVoucherType] — recorded here as absent.
const Map<String, String> tallyVoucherTypeByRefType = {
  'sale': 'Sales',
  'bill': 'Sales',
  'bill_void': 'Journal',
  'return': 'Credit Note',
  'purchase': 'Purchase',
  'supplier_payment': 'Payment',
  'expense': 'Payment',
  'expense_reversal': 'Payment',
  'credit': 'Receipt',
  'repayment': 'Receipt',
  'adjustment': 'Journal',
  'cashbook': 'Journal',
  'seed': 'Journal',
  'transfer': 'Contra',
  'tax_payment': 'Journal',
  'purchase_return': 'Debit Note',
  'cheque_clearing': 'Journal',
  'cheque_bounce': 'Journal',
  'cheque_return': 'Journal',
  'transfer_loss': 'Journal',
  'reclass': 'Journal',
  'production_issue': 'Journal',
  'production_complete': 'Journal',
  'production_scrap': 'Journal',
  'job_material': 'Journal',
  'job_material_return': 'Journal',
  'payroll_accrual': 'Journal',
  'payroll_payment': 'Payment',
  'salary_advance': 'Payment',
  'loan_charge': 'Journal',
  'fy_close': 'Journal',
  'loyalty_earn': 'Journal',
  'loyalty_expire': 'Journal',
};

/// The voucher type for a refType; `direction` matters only
/// for the two loan refTypes (absent direction reads as the
/// payable side — the register's primary direction).
String tallyVoucherType(String refType, [String? direction]) {
  if (refType == 'loan_drawdown') return direction == 'receivable' ? 'Receipt' : 'Contra';
  if (refType == 'loan_repayment') return direction == 'receivable' ? 'Receipt' : 'Payment';
  return tallyVoucherTypeByRefType[refType] ?? 'Journal';
}

/// The direction of the loan an entry cites, read off its own
/// lines (the exporter stays a pure journal function — no
/// loan register lookup).
String? loanDirectionOf(JournalEntry entry) {
  if (entry.lines.any((l) => l.account == 'loans_payable')) return 'payable';
  if (entry.lines.any((l) => l.account == 'loans_receivable')) return 'receivable';
  return null;
}

String voucherTypeForEntry(JournalEntry entry) =>
    tallyVoucherType(entry.refType, loanDirectionOf(entry));

/* ---------------- parties & line → ledger resolution ---------------- */

/// Everything besides the journal the exporter may read.
class TallyParties {
  final List<Customer> customers;
  final List<Supplier> suppliers;
  final List<Employee> employees;
  final List<MoneyAccount> accounts;
  final Map<String, String> docNumbers;
  const TallyParties({
    this.customers = const [],
    this.suppliers = const [],
    this.employees = const [],
    this.accounts = const [],
    this.docNumbers = const {},
  });
}

/// Accounts whose ref'd lines export against a PER-PARTY
/// ledger (§5.3): receivables → customer, payables →
/// supplier, salary_payable → employee, loyalty_payable →
/// customer (Phase H · H1: the customer's points are his own
/// ledger under Current Liabilities). Mapped to the party
/// ledger's Tally group.
const Map<String, String> _partyLedgerGroup = {
  'receivables': 'Sundry Debtors',
  'payables': 'Sundry Creditors',
  'salary_payable': 'Current Liabilities',
  'loyalty_payable': 'Current Liabilities',
};

String? _partyNameFor(String code, String ref, TallyParties parties) {
  if (code == 'receivables' || code == 'loyalty_payable') {
    for (final c in parties.customers) {
      if (c.id == ref) return c.name;
    }
    return null;
  }
  if (code == 'payables') {
    for (final s in parties.suppliers) {
      if (s.id == ref) return s.name;
    }
    return null;
  }
  if (code == 'salary_payable') {
    for (final e in parties.employees) {
      if (e.id == ref) return e.name;
    }
    return null;
  }
  return null;
}

/// A resolved ledger slot: an account ledger (key `acct:<code>`)
/// or a party ledger (key `party:<code>:<ref>`). Keys, not
/// names, are the identity — names are assigned in one
/// deterministic pass so collisions disambiguate (§5.3).
class _LedgerSlot {
  final String key;
  final String group;
  final String wantedName;
  final bool isParty;
  const _LedgerSlot(this.key, this.group, this.wantedName, this.isParty);
}

_LedgerSlot _slotForLine(JournalLine line, TallyParties parties, ShopSettingsView? settings) {
  final ref = line.ref;
  final partyGroup = _partyLedgerGroup[line.account];
  if (ref != null && partyGroup != null) {
    return _LedgerSlot(
      'party:${line.account}:$ref',
      partyGroup,
      // An unresolved ref still exports under its own id-named
      // ledger — never silently folded into the control ledger.
      _partyNameFor(line.account, ref, parties) ?? ref,
      true,
    );
  }
  return _LedgerSlot(
    'acct:${line.account}',
    tallyLedgerMap[line.account]!.group,
    tallyLedgerName(line.account, settings),
    false,
  );
}

/// Human label for a line's ref in the CSV's Party/Ref column.
String _refLabelFor(JournalLine line, TallyParties parties) {
  final ref = line.ref;
  if (ref == null) return '';
  final party = _partyNameFor(line.account, ref, parties);
  if (party != null) return party;
  for (final a in parties.accounts) {
    if (a.id == ref) return a.name;
  }
  return ref;
}

class _ResolvedNames {
  final Map<String, _LedgerSlot> slots;
  final Map<String, String> nameByKey; // insertion-ordered (= naming pass order)
  const _ResolvedNames(this.slots, this.nameByKey);
}

/// The one naming pass shared by the XML and the CSV: census
/// every slot the WHOLE journal touches (a ledger's name
/// cannot depend on the exported range), then assign names
/// deterministically — account ledgers in chart order first,
/// then party ledgers by (group, wanted name, key); the first
/// claim wins the clean name, later collisions take ` (2)`,
/// ` (3)`, … suffixes.
_ResolvedNames _resolveLedgerNames(
  List<JournalEntry> journal,
  TallyParties parties,
  ShopSettingsView? settings,
) {
  final slots = <String, _LedgerSlot>{};
  final sorted = [...journal]..sort((a, b) {
      final c = a.ts.compareTo(b.ts);
      return c != 0 ? c : a.id.compareTo(b.id);
    });
  for (final e in sorted) {
    for (final l in e.lines) {
      final slot = _slotForLine(l, parties, settings);
      slots.putIfAbsent(slot.key, () => slot);
    }
  }
  final ordered = slots.values.toList()
    ..sort((a, b) {
      if (a.isParty != b.isParty) return a.isParty ? 1 : -1;
      if (!a.isParty) {
        return accountCodes.indexOf(a.key.substring(5)) -
            accountCodes.indexOf(b.key.substring(5));
      }
      var c = a.group.compareTo(b.group);
      if (c != 0) return c;
      c = a.wantedName.compareTo(b.wantedName);
      if (c != 0) return c;
      return a.key.compareTo(b.key);
    });
  final nameByKey = <String, String>{};
  final usedNames = <String>{};
  for (final slot in ordered) {
    var name = slot.wantedName;
    var n = 2;
    while (usedNames.contains(name)) {
      name = '${slot.wantedName} ($n)';
      n += 1;
    }
    usedNames.add(name);
    nameByKey[slot.key] = name;
  }
  return _ResolvedNames(slots, nameByKey);
}

/* ---------------- dates & voucher numbers ---------------- */

/// The entry's business date (YYYY-MM-DD): its stamped
/// `dateISO` when present and valid, else the PKT date of its
/// instant.
String entryDateISO(JournalEntry entry) {
  final d = entry.dateISO;
  return (d != null && isValidDateISO(d)) ? d : businessDateISO(entry.ts);
}

/// Tally's DATE format: YYYYMMDD.
String tallyDateOf(JournalEntry entry) => entryDateISO(entry).replaceAll('-', '');

/// The voucher number Tally should carry: for a fiscal close,
/// the FY label (§6.3); otherwise the cited document's number
/// when the UI's map knows it; otherwise null.
String? voucherNumberFor(
  JournalEntry entry,
  TallyParties parties,
  ShopSettingsView? settings,
) {
  if (entry.refType == 'fy_close') {
    return fyLabel(fiscalYearRange(settings, entry.ts));
  }
  final refId = entry.refId;
  if (refId != null) {
    final n = parties.docNumbers[refId];
    if (n != null && n.trim().isNotEmpty) return n.trim();
  }
  return null;
}

/* ---------------- the export model ---------------- */

class TallyMaster {
  final String name;
  final String group;
  final bool isParty;
  final double openingBalance;
  const TallyMaster(this.name, this.group, this.isParty, this.openingBalance);
  Map<String, dynamic> toJson() => {
        'name': name, 'group': group, 'isParty': isParty,
        'openingBalance': openingBalance,
      };
}

class TallyVoucherLine {
  final String ledgerName;
  final double debit;
  final double credit;
  final bool isDeemedPositive;
  final double amount;
  const TallyVoucherLine(this.ledgerName, this.debit, this.credit, this.isDeemedPositive, this.amount);
  Map<String, dynamic> toJson() => {
        'ledgerName': ledgerName, 'debit': debit, 'credit': credit,
        'isDeemedPositive': isDeemedPositive, 'amount': amount,
      };
}

class TallyVoucher {
  final String entryId;
  final String type;
  final String dateISO;
  final String date;
  final String narration;
  final String? number;
  final List<TallyVoucherLine> lines;
  final double debitTotal;
  final double creditTotal;
  const TallyVoucher(this.entryId, this.type, this.dateISO, this.date,
      this.narration, this.number, this.lines, this.debitTotal, this.creditTotal);
  Map<String, dynamic> toJson() => {
        'entryId': entryId, 'type': type, 'dateISO': dateISO, 'date': date,
        'narration': narration, 'number': number,
        'lines': lines.map((l) => l.toJson()).toList(),
        'debitTotal': debitTotal, 'creditTotal': creditTotal,
      };
}

class TallyExport {
  final String company;
  final String fromDate;
  final String toDate;
  final List<TallyMaster> masters;
  final List<TallyVoucher> vouchers;
  final double totalDebits;
  final double totalCredits;
  const TallyExport(this.company, this.fromDate, this.toDate, this.masters,
      this.vouchers, this.totalDebits, this.totalCredits);
  Map<String, dynamic> toJson() => {
        'company': company, 'fromDate': fromDate, 'toDate': toDate,
        'masters': masters.map((m) => m.toJson()).toList(),
        'vouchers': vouchers.map((v) => v.toJson()).toList(),
        'totalDebits': totalDebits, 'totalCredits': totalCredits,
      };
}

List<JournalEntry> _entriesInRange(List<JournalEntry> journal, ReportRange range) {
  final list = journal.where((e) => inRange(e.ts, range)).toList()
    ..sort((a, b) {
      final c = a.ts.compareTo(b.ts);
      return c != 0 ? c : a.id.compareTo(b.id);
    });
  return list;
}

/// Build the export model: masters (with derived opening
/// balances) + one voucher per in-range entry. Pure — the
/// same inputs always produce the same model, and the model
/// is what both the XML renderer and the tests reconcile
/// against the trial balance.
TallyExport buildTallyExport(
  List<JournalEntry> journal,
  TallyParties parties,
  ShopSettingsView? settings,
  ReportRange range,
) {
  final inRangeEntries = _entriesInRange(journal, range);
  final before = journal.where((e) => e.ts.compareTo(range.fromTs) < 0).toList();
  final resolved = _resolveLedgerNames(journal, parties, settings);
  String ledgerNameOf(JournalLine line) =>
      resolved.nameByKey[_slotForLine(line, parties, settings).key]!;

  final openingByKey = <String, double>{};
  for (final e in before) {
    for (final l in e.lines) {
      final key = _slotForLine(l, parties, settings).key;
      openingByKey[key] = (openingByKey[key] ?? 0) + (l.credit - l.debit);
    }
  }

  final usedInRange = <String>{};
  for (final e in inRangeEntries) {
    for (final l in e.lines) {
      usedInRange.add(_slotForLine(l, parties, settings).key);
    }
  }
  final masters = <TallyMaster>[];
  for (final entry in resolved.nameByKey.entries) {
    final slot = resolved.slots[entry.key]!;
    final opening = roundPaisa(openingByKey[entry.key] ?? 0);
    if (!usedInRange.contains(entry.key) && opening == 0) continue;
    masters.add(TallyMaster(entry.value, slot.group, slot.isParty, opening));
  }

  final vouchers = <TallyVoucher>[];
  var totalDebits = 0.0;
  var totalCredits = 0.0;
  for (final e in inRangeEntries) {
    final lines = <TallyVoucherLine>[];
    var debitTotal = 0.0;
    var creditTotal = 0.0;
    for (final l in e.lines) {
      final net = roundPaisa(l.debit - l.credit);
      if (net == 0) continue;
      final isDebit = net > 0;
      final abs = net.abs();
      if (isDebit) {
        debitTotal += abs;
      } else {
        creditTotal += abs;
      }
      lines.add(TallyVoucherLine(
        ledgerNameOf(l),
        isDebit ? abs : 0,
        isDebit ? 0 : abs,
        isDebit,
        isDebit ? -abs : abs,
      ));
    }
    debitTotal = roundPaisa(debitTotal);
    creditTotal = roundPaisa(creditTotal);
    totalDebits += debitTotal;
    totalCredits += creditTotal;
    vouchers.add(TallyVoucher(
      e.id,
      voucherTypeForEntry(e),
      entryDateISO(e),
      tallyDateOf(e),
      e.memo,
      voucherNumberFor(e, parties, settings),
      lines,
      debitTotal,
      creditTotal,
    ));
  }

  final shopName = (settings?.shopName ?? '').trim();
  return TallyExport(
    shopName.isNotEmpty ? shopName : 'Dukaan AI',
    range.fromDate,
    range.toDate,
    masters,
    vouchers,
    roundPaisa(totalDebits),
    roundPaisa(totalCredits),
  );
}

/* ---------------- XML rendering ---------------- */

/// XML-escape a text node or attribute value.
String xmlEscape(String s) => s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

/// Amounts in Tally's fixed two-decimal form (never "-0.00").
String _tallyAmount(double n) {
  final v = roundPaisa(n);
  return (v == 0 ? 0.0 : v).toStringAsFixed(2);
}

/// The Tally import file for the range: the common-
/// denominator envelope TallyPrime and ERP 9 both accept —
/// masters first, then vouchers, one TALLYMESSAGE each.
String tallyXML(
  List<JournalEntry> journal,
  TallyParties parties,
  ShopSettingsView? settings,
  ReportRange range,
) {
  final model = buildTallyExport(journal, parties, settings, range);
  final out = <String>[];
  out.add('<?xml version="1.0" encoding="UTF-8"?>');
  out.add('<ENVELOPE>');
  out.add('<HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>');
  out.add('<BODY>');
  out.add('<IMPORTDATA>');
  out.add('<REQUESTDESC>');
  out.add('<REPORTNAME>All Masters</REPORTNAME>');
  out.add('<STATICVARIABLES>');
  out.add('<SVCURRENTCOMPANY>${xmlEscape(model.company)}</SVCURRENTCOMPANY>');
  out.add('</STATICVARIABLES>');
  out.add('</REQUESTDESC>');
  out.add('<REQUESTDATA>');
  for (final m in model.masters) {
    out.add('<TALLYMESSAGE xmlns:UDF="TallyUDF">');
    out.add('<LEDGER NAME="${xmlEscape(m.name)}" RESERVEDNAME="">');
    out.add('<PARENT>${xmlEscape(m.group)}</PARENT>');
    if (m.openingBalance != 0) {
      out.add('<OPENINGBALANCE>${_tallyAmount(m.openingBalance)}</OPENINGBALANCE>');
    }
    out.add('</LEDGER>');
    out.add('</TALLYMESSAGE>');
  }
  for (final v in model.vouchers) {
    out.add('<TALLYMESSAGE xmlns:UDF="TallyUDF">');
    out.add('<VOUCHER VCHTYPE="${xmlEscape(v.type)}" ACTION="Create" OBJVIEW="Accounting Voucher View">');
    out.add('<DATE>${v.date}</DATE>');
    if (v.narration.isNotEmpty) {
      out.add('<NARRATION>${xmlEscape(v.narration)}</NARRATION>');
    }
    out.add('<VOUCHERTYPENAME>${xmlEscape(v.type)}</VOUCHERTYPENAME>');
    if (v.number != null) {
      out.add('<VOUCHERNUMBER>${xmlEscape(v.number!)}</VOUCHERNUMBER>');
    }
    for (final l in v.lines) {
      out.add('<ALLLEDGERENTRIES.LIST>');
      out.add('<LEDGERNAME>${xmlEscape(l.ledgerName)}</LEDGERNAME>');
      out.add('<ISDEEMEDPOSITIVE>${l.isDeemedPositive ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>');
      out.add('<AMOUNT>${_tallyAmount(l.amount)}</AMOUNT>');
      out.add('</ALLLEDGERENTRIES.LIST>');
    }
    out.add('</VOUCHER>');
    out.add('</TALLYMESSAGE>');
  }
  out.add('</REQUESTDATA>');
  out.add('</IMPORTDATA>');
  out.add('</BODY>');
  out.add('</ENVELOPE>');
  return '${out.join('\n')}\n';
}

/* ---------------- journal CSV (§5.1 fallback) ---------------- */

/// JS-style number formatting for CSV cells: integral values
/// print without a decimal point, matching `String(number)`.
String _jsNum(double v) {
  if (v == v.truncateToDouble() && v.abs() < 1e21) {
    return v.toInt().toString();
  }
  return v.toString();
}

String _csvEsc(Object? v) {
  final s = v == null ? '' : (v is num ? _jsNum(v.toDouble()) : v.toString());
  return RegExp(r'[",\n]').hasMatch(s) ? '"${s.replaceAll('"', '""')}"' : s;
}

/// The house CSV renderer (web/lib/csv.ts `toCSV`): header
/// row + rows, cells quoted only when they contain `"` / `,`
/// / newline, quotes doubled. No trailing newline.
String toCSV(List<String> headers, List<List<Object?>> rows) => [
      headers.map(_csvEsc).join(','),
      ...rows.map((r) => r.map(_csvEsc).join(',')),
    ].join('\n');

const List<String> journalCsvHeaders = [
  'Date',
  'Voucher No',
  'Type',
  'Account',
  'Party/Ref',
  'Debit',
  'Credit',
  'Narration',
];

/// The same range as flat rows — one row per journal LINE, in
/// journal order. Ledger names resolve through the same
/// census + naming pass as the XML, so the two renderings can
/// never name a ledger differently.
String journalCSV(
  List<JournalEntry> journal,
  TallyParties parties,
  ShopSettingsView? settings,
  ReportRange range,
) {
  final resolved = _resolveLedgerNames(journal, parties, settings);
  String ledgerNameOf(JournalLine line) =>
      resolved.nameByKey[_slotForLine(line, parties, settings).key]!;

  final rows = <List<Object?>>[];
  for (final e in _entriesInRange(journal, range)) {
    final type = voucherTypeForEntry(e);
    final number = voucherNumberFor(e, parties, settings) ?? '';
    final date = entryDateISO(e);
    for (final l in e.lines) {
      rows.add([
        date,
        number,
        type,
        ledgerNameOf(l),
        _refLabelFor(l, parties),
        l.debit > 0 ? roundPaisa(l.debit) : '',
        l.credit > 0 ? roundPaisa(l.credit) : '',
        e.memo,
      ]);
    }
  }
  return toCSV(journalCsvHeaders, rows);
}
