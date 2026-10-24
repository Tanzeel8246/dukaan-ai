/// Dukaan AI — fiscal-year close pure core (Dart port of
/// web/lib/fiscal.ts, ERP Phase D · D4).
///
/// Design: ERP-PHASE-D-DESIGN.md §4. At FY end the year's income
/// and expense accounts are zeroed into `retained_earnings` by
/// ONE closing entry (refType `fy_close`), written with a
/// `periods` audit doc and the lock advance. Balance-sheet
/// accounts carry forward BY DERIVATION — there are NO opening
/// entries, ever (§4.5). Reopening is a mirror entry with stack
/// discipline (§4.4). P&L reports exclude `fy_close` entries, so
/// a closed year's P&L reads exactly as before the close.
import 'cheques.dart';
import 'coa.dart';
import 'ledger.dart';
import 'payroll.dart';
import 'periods.dart';
import 'production.dart';
import 'reports.dart';
import 'selectors.dart';
import 'types.dart';

/* ---------------- the P&L account set (registry-driven) ------------ */

const _plTypes = {AccountType.income, AccountType.contraIncome, AccountType.expense};

/// The closing set is exactly the COA registry's P&L class —
/// `income`, `contra_income` and `expense` — read from the
/// registry, never a hand list (design §4.3).
List<String> plAccountCodes() =>
    accountCodes.where((c) => _plTypes.contains(chartOfAccounts[c]!.type)).toList();

/// Every non-P&L account, in registry order — the accounts
/// whose balances carry forward across a close.
List<String> balanceSheetAccountCodes() =>
    accountCodes.where((c) => !_plTypes.contains(chartOfAccounts[c]!.type)).toList();

/* ---------------- labels & ranges ---------------------------------- */

/// The FY's identity label (`FY 2026-27`; a 1-January year is
/// simply `FY 2027`).
String fyLabel(FiscalYearRange range) {
  final y = int.parse(range.startDate.substring(0, 4));
  if (range.startDate.endsWith('-01-01')) return 'FY $y';
  return 'FY $y-${(y + 1).toString().substring(2)}';
}

/// The reports-layer range for the same window.
ReportRange reportRangeOf(FiscalYearRange range) => ReportRange(
      fromDate: range.startDate,
      toDate: range.endDate,
      fromTs: range.fromTs,
      toTs: range.toTs,
    );

/// The fiscal year BEFORE the one containing `now` (web
/// periods.ts `previousFiscalYear`) — the FY picker default.
FiscalYearRange previousFiscalYear(ShopSettingsView settings, [DateTime? now]) {
  final cur = fiscalYearRange(settings, (now ?? DateTime.now()).toUtc().toIso8601String());
  final curStartYear = int.parse(cur.startDate.substring(0, 4));
  final startDate = fiscalStartDateInYear(fiscalStartOf(settings), curStartYear - 1);
  return fiscalYearRange(settings, startOfDayPktInstant(startDate));
}

/* ---------------- FY movements & the closing entry --------------- */

class FyMovement {
  final String account;
  /// Net movement inside the FY in raw terms (debits − credits),
  /// `fy_close` entries excluded.
  final double raw;
  const FyMovement(this.account, this.raw);
}

/// Each P&L account's net movement inside the FY, in registry
/// order, zero movements omitted. `fy_close` entries are
/// excluded: an earlier close and its reopening mirror cancel
/// by construction, and excluding both keeps a re-close after
/// a reopen recomputing the true trading figures.
List<FyMovement> fyPlMovements(List<JournalEntry> entries, FiscalYearRange range) {
  final inFy = entries
      .where((e) => e.refType != 'fy_close' && e.ts.compareTo(range.fromTs) >= 0 && e.ts.compareTo(range.toTs) < 0)
      .toList();
  final out = <FyMovement>[];
  for (final account in plAccountCodes()) {
    final raw = roundPaisa(accountBalance(inFy, account));
    if (raw != 0) out.add(FyMovement(account, raw));
  }
  return out;
}

DateTime _utcDate(String iso) => DateTime.utc(
      int.parse(iso.substring(0, 4)),
      int.parse(iso.substring(5, 7)),
      int.parse(iso.substring(8, 10)),
    );

/// Compose THE closing entry for a fiscal year (design §4.3):
/// one line per P&L account on the opposite side of its FY
/// balance (zeroing it), `retained_earnings` taking the
/// balancing line — credited with a profit, debited with a
/// loss. Dated the FY's last day; cites the periods close doc.
/// Returns null when the year carries no P&L movement.
JournalEntry? buildFiscalClosingEntry(
  List<JournalEntry> entries,
  FiscalYearRange range,
  String periodId,
) {
  final moves = fyPlMovements(entries, range);
  if (moves.isEmpty) return null;
  final lines = <JournalLine>[];
  var sumRaw = 0.0;
  for (final m in moves) {
    sumRaw += m.raw;
    lines.add(m.raw > 0
        ? JournalLine(account: m.account, debit: 0, credit: m.raw)
        : JournalLine(account: m.account, debit: -m.raw, credit: 0));
  }
  final retainedRaw = roundPaisa(sumRaw);
  if (retainedRaw < 0) {
    lines.add(JournalLine(account: 'retained_earnings', debit: 0, credit: -retainedRaw));
  } else if (retainedRaw > 0) {
    lines.add(JournalLine(account: 'retained_earnings', debit: retainedRaw, credit: 0));
  }
  final dayOffset = () {
    final diff = _utcDate(todayPktISO()).difference(_utcDate(range.endDate)).inDays;
    final r = diff.round();
    return r > 0 ? r : 0;
  }();
  return makeEntry(
    'Fiscal year close — ${fyLabel(range)}',
    'fy_close',
    periodId,
    lines,
    ts: endOfDayPktInstant(range.endDate),
    dayOffset: dayOffset,
  );
}

/// The reopening mirror (§4.4): the closing entry's exact lines
/// swapped, posted at today's instant — a reversal never
/// backdates.
JournalEntry buildFiscalReopenEntry(JournalEntry closingEntry, String ts) =>
    buildMirrorEntry(closingEntry, 'Fiscal year reopened — closing entry reversed', ts: ts);

/* ---------------- the year's summary, from the entry itself ------ */

class ClosingEntrySummary {
  final List<({String account, double amount})> rows;
  /// The retained-earnings movement, credit-positive.
  final double net;
  const ClosingEntrySummary(this.rows, this.net);
}

/// Render a closed year's result from its closing entry: the
/// entry's lines ARE the year's result, by construction (§4.6).
ClosingEntrySummary closingEntrySummary(JournalEntry entry) {
  final rows = <({String account, double amount})>[];
  var net = 0.0;
  for (final l in entry.lines) {
    final raw = l.debit - l.credit;
    if (l.account == 'retained_earnings') {
      net = roundPaisa(-raw);
    } else {
      rows.add((account: l.account, amount: roundPaisa(-raw * normalBalanceSign(l.account))));
    }
  }
  return ClosingEntrySummary(rows, net);
}

/* ---------------- close state (derived from docs + journal) ------ */

class FiscalCloseState {
  final bool closed;
  final PeriodDoc? closeDoc;
  final JournalEntry? entry;
  final PeriodDoc? reopenDoc;
  const FiscalCloseState({required this.closed, this.closeDoc, this.entry, this.reopenDoc});
}

JournalEntry? _entryOfCloseDoc(List<JournalEntry> journal, PeriodDoc doc) {
  if (doc.entryId != null) {
    for (final e in journal) {
      if (e.id == doc.entryId) return e;
    }
    return null;
  }
  for (final e in journal) {
    if (e.refType == 'fy_close' && e.refId == doc.id && e.reversesId == null) return e;
  }
  return null;
}

bool _closeDocInForce(List<JournalEntry> journal, List<PeriodDoc> periods, PeriodDoc doc) {
  final entry = _entryOfCloseDoc(journal, doc);
  final reversed = entry != null && journal.any((e) => e.reversesId == entry.id);
  final reopened = periods.any((p) =>
      p.kind == 'fiscal_year' && p.action == 'reopen' && p.reopensPeriodId == doc.id);
  return !reversed && !reopened;
}

/// Is this FY currently closed? Derived — the close doc, its
/// entry's reversal state and any reopen doc together decide.
FiscalCloseState fiscalCloseState(
  List<JournalEntry> journal,
  List<PeriodDoc> periods,
  FiscalYearRange range,
) {
  final closes = periods
      .where((p) => p.kind == 'fiscal_year' && p.action == 'close' && p.from == range.fromTs)
      .toList()
    ..sort((a, b) => b.ts.compareTo(a.ts));
  final closeDoc = closes.isEmpty ? null : closes.first;
  if (closeDoc == null) {
    return const FiscalCloseState(closed: false);
  }
  final entry = _entryOfCloseDoc(journal, closeDoc);
  final reopens = periods
      .where((p) =>
          p.kind == 'fiscal_year' && p.action == 'reopen' && p.reopensPeriodId == closeDoc.id)
      .toList()
    ..sort((a, b) => b.ts.compareTo(a.ts));
  return FiscalCloseState(
    closed: _closeDocInForce(journal, periods, closeDoc),
    closeDoc: closeDoc,
    entry: entry,
    reopenDoc: reopens.isEmpty ? null : reopens.first,
  );
}

/// Stack discipline (§4.4): closes unwind in reverse order
/// only. Returns the later FY's close doc still in force that
/// blocks reopening `closeDoc`, or null.
PeriodDoc? fiscalReopenBlocker(
  List<JournalEntry> journal,
  List<PeriodDoc> periods,
  PeriodDoc closeDoc,
) {
  final later = periods
      .where((p) =>
          p.kind == 'fiscal_year' &&
          p.action == 'close' &&
          p.id != closeDoc.id &&
          p.to.compareTo(closeDoc.to) > 0)
      .toList()
    ..sort((a, b) => a.to.compareTo(b.to));
  for (final doc in later) {
    if (_closeDocInForce(journal, periods, doc)) return doc;
  }
  return null;
}

/* ---------------- the pre-close checklist (all derived) ---------- */

class FiscalChecklistItem {
  final String id; // trialBalance | purchasesClearing | draftPayroll | productionPools | salaryPayable | cheques | stock | lock
  final String severity; // gate | warning | info
  /// Gates: true means the gate FAILS. Warnings: the warned
  /// condition is present. Info: always false (figures only).
  final bool triggered;
  final double value;
  const FiscalChecklistItem(this.id, this.severity, this.triggered, this.value);
}

class FiscalYearChecklist {
  final List<FiscalChecklistItem> items;
  final bool hardGatesPass;
  final List<String> warningIds;
  final TrialBalanceReport trialBalance;
  final double purchasesClearing;
  final int draftPayrollRuns;
  final int openProductionOrders;
  final double openProductionPoolTotal;
  final SalaryPayableComposition salary;
  final double chequesInHand;
  final double chequesIssued;
  final double stockGl;
  final double stockShelf;
  final double stockDivergence;
  final bool lockCoversFyEnd;
  const FiscalYearChecklist({
    required this.items, required this.hardGatesPass, required this.warningIds,
    required this.trialBalance, required this.purchasesClearing,
    required this.draftPayrollRuns, required this.openProductionOrders,
    required this.openProductionPoolTotal, required this.salary,
    required this.chequesInHand, required this.chequesIssued,
    required this.stockGl, required this.stockShelf,
    required this.stockDivergence, required this.lockCoversFyEnd,
  });
}

/// The §4.2 checklist, computed live when the close screen
/// opens and recomputed inside the close action before
/// composing any write — nothing on it is stored.
FiscalYearChecklist fiscalYearCloseChecklist({
  required List<JournalEntry> journal,
  required List<PayrollRun> payrollRuns,
  required List<ProductionOrder> productionOrders,
  required List<Cheque> cheques,
  required List<Product> products,
  required FiscalYearRange range,
  String? lockedThrough,
}) {
  final before = journal.where((e) => e.ts.compareTo(range.toTs) < 0).toList();

  final tb = trialBalanceReport(journal, reportRangeOf(range));
  final tbOk = tb.difference == 0 && tb.closingDifference == 0;

  final purchasesClearing = roundPaisa(accountNormalBalance(before, 'purchases'));
  final clearingOk = purchasesClearing == 0;

  final startMonth = range.startDate.substring(0, 7);
  final endMonth = range.endDate.substring(0, 7);
  final draftPayrollRuns = payrollRuns
      .where((r) =>
          r.status == 'draft' &&
          r.month.compareTo(startMonth) >= 0 &&
          r.month.compareTo(endMonth) <= 0)
      .length;

  var openProductionOrders = 0;
  var openProductionPoolTotal = 0.0;
  for (final o in productionOrders) {
    final pool = poolOf(o);
    if (pool > 0) {
      final st = deriveProductionStatus(o);
      if (st != 'completed' && st != 'cancelled') {
        openProductionOrders += 1;
        openProductionPoolTotal += pool;
      }
    }
  }
  openProductionPoolTotal = roundPaisa(openProductionPoolTotal);

  final salary = salaryPayableComposition(before);

  final chequesBefore = cheques.where((c) => c.ts.compareTo(range.toTs) < 0).toList();
  final chequesInHand = unclearedInTotal(chequesBefore);
  final chequesIssued = pendingOutTotal(chequesBefore);

  final stockGl = roundPaisa(
      accountNormalBalance(before, 'inventory') + accountNormalBalance(before, 'inventory_raw'));
  final stockShelf = roundPaisa(stockValue(products));
  final stockDivergence = roundPaisa(stockGl - stockShelf);

  final lockCoversFyEnd = lockedThrough != null &&
      lockedThrough.isNotEmpty &&
      lockedThrough.compareTo(endOfDayPktInstant(range.endDate)) >= 0;

  final items = <FiscalChecklistItem>[
    FiscalChecklistItem('trialBalance', 'gate', !tbOk, tb.closingDifference),
    FiscalChecklistItem('purchasesClearing', 'gate', !clearingOk, purchasesClearing),
    FiscalChecklistItem('draftPayroll', 'warning', draftPayrollRuns > 0, draftPayrollRuns.toDouble()),
    FiscalChecklistItem('productionPools', 'warning', openProductionOrders > 0, openProductionPoolTotal),
    FiscalChecklistItem('salaryPayable', 'info', false, salary.glBalance),
    FiscalChecklistItem('cheques', 'info', false, roundPaisa(chequesInHand + chequesIssued)),
    FiscalChecklistItem('stock', 'info', false, stockDivergence),
    FiscalChecklistItem('lock', 'info', false, lockCoversFyEnd ? 1 : 0),
  ];
  return FiscalYearChecklist(
    items: items,
    hardGatesPass: tbOk && clearingOk,
    warningIds: [
      for (final i in items)
        if (i.severity == 'warning' && i.triggered) i.id,
    ],
    trialBalance: tb,
    purchasesClearing: purchasesClearing,
    draftPayrollRuns: draftPayrollRuns,
    openProductionOrders: openProductionOrders,
    openProductionPoolTotal: openProductionPoolTotal,
    salary: salary,
    chequesInHand: chequesInHand,
    chequesIssued: chequesIssued,
    stockGl: stockGl,
    stockShelf: stockShelf,
    stockDivergence: stockDivergence,
    lockCoversFyEnd: lockCoversFyEnd,
  );
}

/* ---------------- carried balances (the "opening" panel) --------- */

class AccountBalanceRow {
  final String account;
  final double balance;
  const AccountBalanceRow(this.account, this.balance);
}

/// Balance-sheet balances as at an instant — derived, never
/// stored. With `beforeTs` = a fiscal year's first instant
/// these ARE that year's opening balances (§4.5).
List<AccountBalanceRow> balanceSheetBalances(List<JournalEntry> entries, String beforeTs) {
  final before = entries.where((e) => e.ts.compareTo(beforeTs) < 0).toList();
  final rows = <AccountBalanceRow>[];
  for (final account in balanceSheetAccountCodes()) {
    final balance = accountNormalBalance(before, account);
    if (balance != 0) rows.add(AccountBalanceRow(account, balance));
  }
  return rows;
}

/* ---------------- the Balance Sheet report (Fix Round 1 · F2) ---- */

/// The user-facing Balance Sheet (mirror of web/lib/fiscal's
/// `balanceSheetReport`): point-in-time "as at" the range end —
/// Assets + Clearing = Liabilities + Equity + Result to date,
/// the double-entry identity restated by section.
class BalanceSheetReport {
  final String asAtDate;
  final List<AccountBalanceRow> assets;
  final double assetsTotal;

  /// The `purchases` clearing balance, presented inside the
  /// assets side when non-zero so the identity holds mid-clearing.
  final double clearing;
  final List<AccountBalanceRow> liabilities;
  final double liabilitiesTotal;

  /// Equity rows as CONTRIBUTIONS (drawings negative).
  final List<AccountBalanceRow> equity;
  final double equityTotal;

  /// The unclosed result to date (fy_close entries included).
  final double resultToDate;
  final double totalAssets;
  final double totalLiabilitiesEquity;
  final double difference;
  final bool balanced;
  const BalanceSheetReport({
    required this.asAtDate,
    required this.assets,
    required this.assetsTotal,
    required this.clearing,
    required this.liabilities,
    required this.liabilitiesTotal,
    required this.equity,
    required this.equityTotal,
    required this.resultToDate,
    required this.totalAssets,
    required this.totalLiabilitiesEquity,
    required this.difference,
    required this.balanced,
  });
}

BalanceSheetReport balanceSheetReport(List<JournalEntry> journal, ReportRange range) {
  final upToEnd = journal.where((e) => e.ts.compareTo(range.toTs) < 0).toList();
  final assets = <AccountBalanceRow>[];
  final liabilities = <AccountBalanceRow>[];
  final equity = <AccountBalanceRow>[];
  var clearing = 0.0;
  for (final code in balanceSheetAccountCodes()) {
    final type = chartOfAccounts[code]!.type;
    final normal = accountNormalBalance(upToEnd, code);
    if (normal == 0) continue;
    if (type == AccountType.asset) {
      assets.add(AccountBalanceRow(code, normal));
    } else if (type == AccountType.liability) {
      liabilities.add(AccountBalanceRow(code, normal));
    } else if (type == AccountType.equity) {
      equity.add(AccountBalanceRow(code, normal));
    } else if (type == AccountType.contraEquity) {
      equity.add(AccountBalanceRow(code, -normal));
    } else if (type == AccountType.clearing) {
      clearing = normal;
    }
  }
  var resultRaw = 0.0;
  for (final code in plAccountCodes()) {
    resultRaw += accountBalance(upToEnd, code);
  }
  double sumRows(List<AccountBalanceRow> rows) =>
      roundPaisa(rows.fold(0.0, (a, r) => a + r.balance));
  final assetsTotal = sumRows(assets);
  final liabilitiesTotal = sumRows(liabilities);
  final equityTotal = sumRows(equity);
  final resultToDate = roundPaisa(-resultRaw);
  final totalAssets = roundPaisa(assetsTotal + clearing);
  final totalLiabilitiesEquity = roundPaisa(liabilitiesTotal + equityTotal + resultToDate);
  final difference = roundPaisa(totalAssets - totalLiabilitiesEquity);
  return BalanceSheetReport(
    asAtDate: range.toDate,
    assets: assets,
    assetsTotal: assetsTotal,
    clearing: roundPaisa(clearing),
    liabilities: liabilities,
    liabilitiesTotal: liabilitiesTotal,
    equity: equity,
    equityTotal: equityTotal,
    resultToDate: resultToDate,
    totalAssets: totalAssets,
    totalLiabilitiesEquity: totalLiabilitiesEquity,
    difference: difference,
    balanced: difference == 0,
  );
}

/* ---------------- opening stock (Fix Round 1 · F5) --------------- */

/// The live opening-stock gap (mirror of web/lib/fiscal): shelf
/// value at cost today vs the books' inventory position today.
class OpeningStockGap {
  final double shelf;
  final double book;
  final double gap;
  final double rawGap;
  const OpeningStockGap({required this.shelf, required this.book, required this.gap, required this.rawGap});
}

OpeningStockGap openingStockGap(List<JournalEntry> journal, List<Product> products) {
  final shelf = roundPaisa(stockValue(products));
  final book = roundPaisa(accountNormalBalance(journal, 'inventory') + accountNormalBalance(journal, 'inventory_raw'));
  final gapRaw = roundPaisa(shelf - book);
  final gap = gapRaw > 0 ? gapRaw : 0.0;
  final rawShelf = roundPaisa(stockValue(products.where((p) => p.stockClass == 'raw').toList()));
  final rawBook = roundPaisa(accountNormalBalance(journal, 'inventory_raw'));
  var rawGap = roundPaisa(rawShelf - rawBook);
  if (rawGap < 0) rawGap = 0;
  if (rawGap > gap) rawGap = gap;
  return OpeningStockGap(shelf: shelf, book: book, gap: gap, rawGap: rawGap);
}

/// The one-time opening-stock entry: Dr `inventory` (split
/// across the raw class account by [rawShare] via the C3
/// class-leg seam) / Cr `capital`. Append-only: a wrong amount
/// is corrected by a reversing entry, never by editing this one.
JournalEntry? buildOpeningStockEntry(double amount, double rawShare, {String? ts}) {
  final amt = roundPaisa(amount);
  if (!(amt > 0)) return null;
  final lines = <JournalLine>[
    ...classLegLines(amt, rawShare, 'debit'),
    JournalLine(account: 'capital', debit: 0, credit: amt),
  ];
  return makeEntry('Opening stock — one-time recognition', 'opening_stock', null, lines, ts: ts);
}
