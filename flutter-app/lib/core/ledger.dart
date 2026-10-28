/// Dukaan AI — double-entry ledger core (Dart port of web/lib/ledger.ts).
///
/// Every balance is DERIVED from the append-only journal; no stored
/// counters exist. `makeEntry` enforces the F-1 balance invariant at
/// construction — an unbalanced entry can never be built, on any
/// client. Equivalence with the web is proven by the golden fixtures
/// (harness/fixtures/f1-core.json), not asserted by inspection.
import 'coa.dart';
import 'types.dart';

int _seq = 0;
String _base36(int n) => n.toRadixString(36);

/// Unique-enough client id, matching the web's id style. (App-composed
/// Firestore docs prefer SDK auto-ids; this serves journal entries and
/// operational rows composed inside the store.)
String newId(String prefix) {
  _seq += 1;
  return '$prefix-${_base36(DateTime.now().millisecondsSinceEpoch)}${_base36(_seq)}';
}

/// Round to the paisa — mirrors web `roundPaisa`/`round2` exactly.
double roundPaisa(double n) => ((n + 2.220446049250313e-16) * 100).round() / 100;

/// Format a quantity the way JS prints a number in a memo
/// (integral values without a decimal point) — journal memos are
/// compared byte-for-byte with the web's, so "12 units" must not
/// become "12.0 units".
String fmtQty(double q) => q == q.roundToDouble() ? q.toInt().toString() : q.toString();

/// An entry balances when Σdebit == Σcredit (to the paisa).
bool entryBalances(JournalEntry e) {
  var d = 0.0, c = 0.0;
  for (final l in e.lines) {
    d += l.debit;
    c += l.credit;
  }
  return (d - c).abs() < 0.01;
}

/// Construct a journal entry: filters zero lines and THROWS on
/// imbalance (F-1 — the single point every posting path passes
/// through on the web; the same contract here).
JournalEntry makeEntry(
  String memo,
  String refType,
  String? refId,
  List<JournalLine> lines, {
  int dayOffset = 0,
  String? ts,
  String? reversesId,
  String idPrefix = 'j',
}) {
  final clean = lines.where((l) => l.debit > 0 || l.credit > 0).toList();
  final entry = JournalEntry(
    id: newId(idPrefix),
    memo: memo,
    refType: refType,
    refId: refId,
    reversesId: reversesId,
    lines: clean,
    dayOffset: dayOffset,
    ts: ts ?? DateTime.now().toUtc().toIso8601String(),
  );
  if (!entryBalances(entry)) {
    throw StateError('Refusing to post unbalanced journal entry "$memo" (Σdebit ≠ Σcredit).');
  }
  return entry;
}

/// Phase C · C3: compose the stock-value leg of a movement as one line
/// per CLASS account it touches (goods residual + raw share), so the
/// parts sum to the total to the paisa. With no raw share this is the
/// single pre-C3 `inventory` line — byte-identical output.
List<JournalLine> classLegLines(double total, double rawShare, String side) {
  JournalLine line(String account, double amount) => side == 'debit'
      ? JournalLine(account: account, debit: amount)
      : JournalLine(account: account, credit: amount);
  final rawAmt = roundPaisa(rawShare);
  if (rawAmt <= 0) return [line('inventory', total)];
  final goodsAmt = roundPaisa(total - rawAmt);
  if (goodsAmt < 0) return [line('inventory_raw', total)];
  final lines = <JournalLine>[];
  if (goodsAmt != 0) lines.add(line('inventory', goodsAmt));
  lines.add(line('inventory_raw', rawAmt));
  return lines;
}

/// The latest UNREVERSED posting for a refId (F-5).
JournalEntry? findUnreversedPosting(List<JournalEntry> entries, String refId) {
  final reversedIds = entries.map((e) => e.reversesId).whereType<String>().toSet();
  final candidates = entries
      .where((e) => e.refId == refId && e.reversesId == null && !reversedIds.contains(e.id))
      .toList()
    ..sort((a, b) => b.ts.compareTo(a.ts));
  return candidates.isEmpty ? null : candidates.first;
}

/// The part of a stock adjustment actually applicable to the shelf (F-11).
double appliedAdjustmentDelta(double stockQty, double delta) {
  if (delta >= 0) return delta;
  final onHand = stockQty > 0 ? stockQty : 0.0;
  final removable = -delta < onHand ? -delta : onHand;
  return -removable;
}

/// Settlement account for a payment method (credit → receivables).
String accountForMethod(String method) {
  if (method == 'cash') return 'cash';
  if (method == 'credit') return 'receivables';
  return 'wallet';
}

/// Stock-value account for a product's class.
String inventoryAccountFor(Product p) => p.isRaw ? 'inventory_raw' : 'inventory';

/* ---------------- balances from the journal ---------------- */

/// Net balance of an account (debits − credits) across all entries.
double accountBalance(List<JournalEntry> entries, String account) {
  var bal = 0.0;
  for (final e in entries) {
    for (final l in e.lines) {
      if (l.account == account) bal += l.debit - l.credit;
    }
  }
  return bal;
}

/// Balance stated on the account's NORMAL side (COA registry).
double accountNormalBalance(List<JournalEntry> entries, String account) =>
    normalBalanceSign(account) * accountBalance(entries, account);

/// Normal-side balance of ONE ref's lines on an account (the
/// subledger read, Phase F · F2) — optionally at-or-before `atTs`
/// (the voucher "balance after this" read).
double refNormalBalance(List<JournalEntry> entries, String account, String ref, [String? atTs]) {
  var bal = 0.0;
  for (final e in entries) {
    if (atTs != null && e.ts.compareTo(atTs) > 0) continue;
    for (final l in e.lines) {
      if (l.account == account && l.ref == ref) bal += l.debit - l.credit;
    }
  }
  return normalBalanceSign(account) * bal;
}

double cashBalance(List<JournalEntry> entries) => accountBalance(entries, 'cash');
double walletBalance(List<JournalEntry> entries) => accountBalance(entries, 'wallet');

/// Trial balance: per-account raw balances; the total must be 0.
Map<String, double> trialBalance(List<JournalEntry> entries) {
  final out = <String, double>{};
  for (final code in accountCodes) {
    final b = accountBalance(entries, code);
    if (b != 0) out[code] = b;
  }
  return out;
}

double trialBalanceTotal(List<JournalEntry> entries) =>
    trialBalance(entries).values.fold(0.0, (a, b) => a + b);

/* ---------------- money accounts (Phase A · A2) ---------------- */

/// GL bucket a money account settles into (bank rides in `wallet`).
String glForAccount(MoneyAccount a) => a.kind == 'cash' ? 'cash' : 'wallet';

/// Does this journal line belong to this money account? (Legacy
/// null-ref lines resolve to the bucket's `legacyFor` account.)
bool lineResolvesTo(JournalLine line, MoneyAccount account) {
  if (line.account != glForAccount(account)) return false;
  if (line.ref != null) return line.ref == account.id;
  return account.legacyFor == line.account;
}

/// Derived balance of one money account. Never stored anywhere.
double moneyAccountBalance(List<JournalEntry> entries, MoneyAccount account) {
  var bal = 0.0;
  for (final e in entries) {
    for (final l in e.lines) {
      if (lineResolvesTo(l, account)) bal += l.debit - l.credit;
    }
  }
  return bal;
}

/// Σ of one GL bucket's per-account balances — equals the GL bucket
/// balance whenever the account set carries its `legacyFor` pair.
double accountsBucketBalance(List<JournalEntry> entries, List<MoneyAccount> accounts, String bucket) =>
    accounts
        .where((a) => glForAccount(a) == bucket)
        .fold(0.0, (sum, a) => sum + moneyAccountBalance(entries, a));

/// The account a payment method settles into by default: the live
/// account carrying the method; else the bucket's legacy account;
/// else the first live account in the bucket. Null for credit / when
/// the shop has no account in the bucket.
MoneyAccount? defaultAccountForMethod(List<MoneyAccount> accounts, String method) {
  if (method == 'credit') return null;
  final live = accounts.where((a) => !a.archived).toList();
  for (final a in live) {
    if (a.method == method) return a;
  }
  final bucket = method == 'cash' ? 'cash' : 'wallet';
  for (final a in live) {
    if (a.legacyFor == bucket) return a;
  }
  final inBucket = live.where((a) => glForAccount(a) == bucket).toList()
    ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
  return inBucket.isEmpty ? null : inBucket.first;
}

/// Resolve the money account a posting settles into: an explicit id
/// naming a live account wins; otherwise the method default.
String? resolveAccountId(List<MoneyAccount> accounts, String method, [String? explicitId]) {
  if (explicitId != null) {
    final hit = accounts.where((a) => a.id == explicitId && !a.archived);
    if (hit.isNotEmpty) return hit.first.id;
  }
  return defaultAccountForMethod(accounts, method)?.id;
}

class AccountBookRow {
  final String entryId;
  final String ts;
  final int dayOffset;
  final String memo;
  final double inAmount;
  final double outAmount;
  final double balance;
  const AccountBookRow({required this.entryId, required this.ts, required this.dayOffset,
    required this.memo, required this.inAmount, required this.outAmount, required this.balance});
}

/// Per-account cash book with running balance, oldest first.
List<AccountBookRow> accountBook(List<JournalEntry> entries, MoneyAccount account) {
  final sorted = [...entries]..sort((a, b) => a.ts.compareTo(b.ts));
  var balance = 0.0;
  final rows = <AccountBookRow>[];
  for (final e in sorted) {
    for (final l in e.lines) {
      if (!lineResolvesTo(l, account)) continue;
      balance += l.debit - l.credit;
      rows.add(AccountBookRow(entryId: e.id, ts: e.ts, dayOffset: e.dayOffset, memo: e.memo,
          inAmount: l.debit, outAmount: l.credit, balance: balance));
    }
  }
  return rows;
}

/// Net movement of one money account within a dayOffset window.
double accountDayNet(List<JournalEntry> entries, MoneyAccount account, [int dayOffset = 0]) {
  var net = 0.0;
  for (final e in entries) {
    if (e.dayOffset != dayOffset) continue;
    for (final l in e.lines) {
      if (lineResolvesTo(l, account)) net += l.debit - l.credit;
    }
  }
  return net;
}

/// Journal-derived day-close expectation for one cash account.
double expectedCloseForAccount(List<JournalEntry> entries, MoneyAccount account, double openingCash) =>
    openingCash + accountDayNet(entries, account, 0);

/* ---------------- day-close summary (H6 alignment) ---------------- */

/// The day-close operational cross-check — the Dart port of the
/// web's `lib/ledger.dayCloseSummary` (Phase H · H6, audit fix 4).
/// Until H6 the apps bucketed inline in the day-close screen and
/// the two derivations had drifted: the apps counted VOIDED
/// bills, counted CHEQUE parts in the method buckets, dropped
/// credit parts entirely, counted no counter sales, and summed
/// supplier payments unfiltered. The rules are the web's,
/// exactly:
///  * bills: today's only; held AND voided excluded;
///  * a payment part with instrument cheque or points never
///    enters a bucket (it settles at clearing / against the
///    loyalty liability, never a money account today);
///  * credit parts ARE a bucket (udhaar given at the till);
///  * counter sales (no bill) are cash by definition;
///  * cheque expenses count in expensesTotal but not in the
///    cash figure; cheque repayments count as received but not
///    as drawer cash; supplierPaidCash excludes cheques,
///    reversals and non-cash — drawer cash only.
/// The JOURNAL-derived expected cash stays the authoritative
/// figure on both clients; this summary is the cross-check the
/// close row records. Proven against the web derivation by
/// test/h6_fixtures_test.dart over fixtures/h6-core.json.
class DayCloseSummary {
  final Map<String, double> salesByMethod;
  final double cashSales;
  final double expensesTotal;
  final double expensesCash;
  final double creditGiven;
  final double creditReceived;
  final double supplierPaidCash;
  final double refundsCash;
  final double customerAdvancesCash;
  final double expectedCash;
  const DayCloseSummary({
    required this.salesByMethod,
    required this.cashSales,
    required this.expensesTotal,
    required this.expensesCash,
    required this.creditGiven,
    required this.creditReceived,
    required this.supplierPaidCash,
    required this.refundsCash,
    this.customerAdvancesCash = 0,
    required this.expectedCash,
  });
}

DayCloseSummary dayCloseSummary({
  required List<Sale> sales,
  required List<Bill> bills,
  required List<Expense> expenses,
  required List<CreditEntry> credits,
  required List<SupplierPayment> supplierPayments,
  required double returnsRefundCash,
  required double cashIn,
  required double cashOut,
  required double openingCash,
  double customerAdvancesCash = 0,
}) {
  final byMethod = <String, double>{
    'cash': 0,
    'jazzcash': 0,
    'easypaisa': 0,
    'bank': 0,
    'credit': 0,
  };
  for (final b in bills) {
    if (b.dayOffset != 0 || b.status == 'held' || b.status == 'voided') continue;
    for (final p in b.payments) {
      if (p.instrument == 'cheque' || p.instrument == 'points') continue;
      if (byMethod.containsKey(p.method)) {
        byMethod[p.method] = byMethod[p.method]! + p.amount;
      }
    }
  }
  var counterCash = 0.0;
  for (final s in sales) {
    if (s.dayOffset == 0 && (s.billId == null || s.billId == '')) {
      counterCash += s.total;
    }
  }
  byMethod['cash'] = byMethod['cash']! + counterCash;

  var expensesTotal = 0.0;
  var expCash = 0.0;
  for (final e in expenses) {
    if (e.dayOffset != 0) continue;
    expensesTotal += e.amount;
    if (e.method == 'cash' && e.instrument != 'cheque') expCash += e.amount;
  }
  var creditGiven = 0.0;
  var creditReceived = 0.0;
  var creditReceivedCash = 0.0;
  for (final c in credits) {
    if (c.dayOffset != 0) continue;
    if (c.kind == 'credit') creditGiven += c.amount;
    if (c.kind == 'repayment') {
      creditReceived += c.amount;
      if ((c.method ?? 'cash') == 'cash' && c.instrument != 'cheque') {
        creditReceivedCash += c.amount;
      }
    }
  }
  var supplierPaidCash = 0.0;
  for (final p in supplierPayments) {
    if (p.dayOffset == 0 &&
        p.method == 'cash' &&
        p.instrument != 'cheque' &&
        p.kind != 'reversal') {
      supplierPaidCash += p.amount;
    }
  }
  final expectedCash = openingCash +
      byMethod['cash']! +
      creditReceivedCash +
      customerAdvancesCash +
      cashIn -
      expCash -
      supplierPaidCash -
      returnsRefundCash -
      cashOut;
  return DayCloseSummary(
    salesByMethod: byMethod,
    cashSales: byMethod['cash']!,
    expensesTotal: expensesTotal,
    expensesCash: expCash,
    creditGiven: creditGiven,
    creditReceived: creditReceived,
    supplierPaidCash: supplierPaidCash,
    refundsCash: returnsRefundCash,
    customerAdvancesCash: customerAdvancesCash,
    expectedCash: expectedCash,
  );
}

double receivablesTotal(List<JournalEntry> entries) => accountNormalBalance(entries, 'receivables');
double payablesTotal(List<JournalEntry> entries) => accountNormalBalance(entries, 'payables');

/* ---------------- credits subledger (F-6 FIFO) ---------------- */

String creditKey(CreditEntry c) =>
    c.customerId ?? 'name:${c.customerName.trim().toLowerCase()}|${c.customerPhone.trim()}';

/// Outstanding udhaar for one customer key: Σ credit − Σ repayments
/// over their rows (negative credit rows are reversals).
double customerOutstanding(List<CreditEntry> credits, String key) {
  var out = 0.0;
  for (final c in credits) {
    if (creditKey(c) != key) continue;
    out += c.kind == 'credit' ? c.amount : -c.amount;
  }
  return out;
}

double totalOutstandingCredit(List<CreditEntry> credits) {
  final keys = credits.map(creditKey).toSet();
  return keys.fold(0.0, (a, k) => a + customerOutstanding(credits, k));
}

class BillCreditPosition {
  final double given;
  final double reversed;
  final double repaidAllocated;
  final double outstanding;
  const BillCreditPosition({this.given = 0, this.reversed = 0, this.repaidAllocated = 0, this.outstanding = 0});
}

/// How much of a bill's udhaar part is still genuinely owed (F-6):
/// repayments allocate FIFO across the customer's credit lots.
BillCreditPosition billCreditOutstanding(List<CreditEntry> credits, Bill bill) {
  final groupKey = bill.customerId ??
      'name:${bill.customerName.trim().toLowerCase()}|${bill.customerPhone.trim()}';
  final rows = credits.where((c) => creditKey(c) == groupKey).toList();
  var given = 0.0, reversed = 0.0;
  final lots = <String, ({double net, int dayOffset, String ts})>{};
  String lotOf(CreditEntry c) => c.billId ?? 'row:${c.id}';
  for (final c in rows) {
    if (c.kind != 'credit') continue;
    final key = lotOf(c);
    final lot = lots[key] ?? (net: 0.0, dayOffset: c.dayOffset, ts: c.ts);
    var net = lot.net + c.amount;
    var dayOffset = lot.dayOffset;
    var ts = lot.ts;
    if (c.dayOffset > lot.dayOffset) {
      dayOffset = c.dayOffset;
      ts = c.ts;
    }
    lots[key] = (net: net, dayOffset: dayOffset, ts: ts);
    if (c.billId == bill.id) {
      if (c.amount > 0) {
        given += c.amount;
      } else {
        reversed += -c.amount;
      }
    }
  }
  var pool = rows.where((c) => c.kind == 'repayment').fold(0.0, (a, c) => a + c.amount);
  final ordered = lots.entries.toList()
    ..sort((a, b) {
      final byDay = b.value.dayOffset.compareTo(a.value.dayOffset);
      return byDay != 0 ? byDay : a.value.ts.compareTo(b.value.ts);
    });
  var repaidAllocated = 0.0;
  for (final lot in ordered) {
    if (pool <= 0) break;
    final applied = pool < (lot.value.net > 0 ? lot.value.net : 0.0)
        ? pool
        : (lot.value.net > 0 ? lot.value.net : 0.0);
    pool -= applied;
    if (lot.key == bill.id) repaidAllocated = applied;
  }
  final outstanding = given - reversed - repaidAllocated;
  return BillCreditPosition(
    given: given, reversed: reversed, repaidAllocated: repaidAllocated,
    outstanding: outstanding > 0 ? outstanding : 0,
  );
}

/// Live payment status of a bill: accounts for outstanding credit balance.
/// Returns 'paid', 'partial', 'unpaid', 'held', 'voided', 'returned', or 'partially_returned'.
String effectiveBillStatus(Bill bill, [List<CreditEntry>? credits]) {
  if (bill.status == 'held' ||
      bill.status == 'voided' ||
      bill.status == 'returned' ||
      bill.status == 'partially_returned') {
    return bill.status;
  }
  final creditPart = bill.payments
      .where((p) => p.method == 'credit')
      .fold(0.0, (a, p) => a + p.amount);
  if (creditPart <= 0) return 'paid';
  if (credits != null && credits.isNotEmpty) {
    final pos = billCreditOutstanding(credits, bill);
    if (pos.outstanding <= 0.01) return 'paid';
    if (pos.outstanding < bill.total - 0.01) return 'partial';
    return 'unpaid';
  }
  if (creditPart >= bill.total - 0.01) return 'unpaid';
  return 'partial';
}

class CreditLotRemaining {
  /// The lot's key: the bill id, or `row:<id>` for a standalone row.
  final String lotKey;

  /// The lot's age: the LARGEST dayOffset among its rows (a return
  /// reversal is stamped today; it must not make its bill younger).
  final int dayOffset;

  /// Still owed on this lot after reversals and FIFO repayments.
  final double remaining;
  const CreditLotRemaining({required this.lotKey, required this.dayOffset, required this.remaining});
}

/// The ONE FIFO allocation over a single customer's credit rows —
/// the lot model [billCreditOutstanding] has always used, now
/// shared by the aging report and the WhatsApp udhaar position
/// (Fix Round 1 · F4, mirroring web/lib/ledger). Rows group into
/// LOTS by bill; a return/void REVERSAL row (kind "credit",
/// negative amount) nets against its own lot first — it is NOT a
/// repayment and never enters the repayment pool. Repayments
/// then retire the oldest lots first.
List<CreditLotRemaining> creditLotsRemaining(List<CreditEntry> rows) {
  final lots = <String, ({double net, int dayOffset, String ts})>{};
  String lotOf(CreditEntry c) => c.billId ?? 'row:${c.id}';
  for (final c in rows) {
    if (c.kind != 'credit') continue;
    final key = lotOf(c);
    final lot = lots[key] ?? (net: 0.0, dayOffset: c.dayOffset, ts: c.ts);
    var net = lot.net + c.amount; // negative rows reverse their own lot
    var dayOffset = lot.dayOffset;
    var ts = lot.ts;
    if (c.dayOffset > lot.dayOffset) {
      dayOffset = c.dayOffset;
      ts = c.ts;
    }
    lots[key] = (net: net, dayOffset: dayOffset, ts: ts);
  }
  var pool = rows.where((c) => c.kind == 'repayment').fold(0.0, (a, c) => a + c.amount);
  final ordered = lots.entries.toList()
    ..sort((a, b) {
      final byDay = b.value.dayOffset.compareTo(a.value.dayOffset);
      return byDay != 0 ? byDay : a.value.ts.compareTo(b.value.ts);
    });
  final out = <CreditLotRemaining>[];
  for (final lot in ordered) {
    final open = lot.value.net > 0 ? lot.value.net : 0.0;
    final applied = pool < open ? pool : open;
    pool -= applied;
    final remaining = open - applied;
    if (remaining > 0) {
      out.add(CreditLotRemaining(lotKey: lot.key, dayOffset: lot.value.dayOffset, remaining: remaining));
    }
  }
  return out;
}

/* ---------------- P&L (Phase F · F2 port of ledger.ts plOver) ---------------- */

class MonthPL {
  final double revenue;
  final double discounts;
  final double netRevenue;
  final double cogs;
  final double grossProfit;
  final Map<String, double> expensesByCategory;
  final double expensesTotal;
  final double stockLoss;
  final double net;
  const MonthPL({required this.revenue, required this.discounts, required this.netRevenue,
    required this.cogs, required this.grossProfit, required this.expensesByCategory,
    required this.expensesTotal, required this.stockLoss, required this.net});
}

const List<String> _coreExpenseAccounts = [
  'expense_rent', 'expense_electricity', 'expense_salary', 'expense_transport', 'expense_other',
];
const List<String> _extendedExpenseAccounts = [
  'expense_finance', 'expense_loyalty',
];

/// P&L over an already-filtered entry set. `fy_close` entries are
/// EXCLUDED (D4 §4.6): a closing entry transfers the year's result
/// into retained earnings — it is not trading activity, and the
/// trial balance (which must NOT exclude it) is a separate builder.
MonthPL plOver(List<JournalEntry> selected) {
  final trading = selected.where((e) => e.refType != 'fy_close').toList();
  double net(String account) => accountNormalBalance(trading, account);
  final revenue = net('sales_revenue');
  final discounts = net('sales_discount');
  final cogs = net('cogs');
  final expensesByCategory = <String, double>{};
  var expensesTotal = 0.0;
  for (final acc in _coreExpenseAccounts) {
    final v = net(acc);
    expensesByCategory[acc.replaceFirst('expense_', '')] = v;
    expensesTotal += v;
  }
  for (final acc in _extendedExpenseAccounts) {
    final v = net(acc);
    expensesTotal += v;
    if (v != 0) {
      expensesByCategory[acc.replaceFirst('expense_', '')] = v;
    }
  }
  final stockLoss = net('inventory_loss');
  final netRevenue = revenue - discounts;
  final grossProfit = netRevenue - cogs;
  return MonthPL(
    revenue: revenue, discounts: discounts, netRevenue: netRevenue, cogs: cogs,
    grossProfit: grossProfit, expensesByCategory: expensesByCategory,
    expensesTotal: expensesTotal, stockLoss: stockLoss,
    net: grossProfit - expensesTotal - stockLoss,
  );
}

/// Monthly P&L (local calendar month of each entry's instant).
MonthPL profitAndLoss(List<JournalEntry> entries, [DateTime? ref]) {
  final r = ref ?? DateTime.now();
  return plOver(entries.where((e) {
    final d = DateTime.tryParse(e.ts)?.toLocal();
    return d != null && d.year == r.year && d.month == r.month;
  }).toList());
}

/// P&L over an arbitrary instant range (`fromTs <= ts < toTs`).
MonthPL profitAndLossInRange(List<JournalEntry> entries, String fromTs, String toTs) =>
    plOver(entries.where((e) => e.ts.compareTo(fromTs) >= 0 && e.ts.compareTo(toTs) < 0).toList());

/* ---------------- cash book ---------------- */

class CashBookRow {
  final String entryId;
  final String ts;
  final int dayOffset;
  final String memo;
  final String account; // "cash" | "wallet"
  final double inAmount;
  final double outAmount;
  final double balance;
  const CashBookRow({required this.entryId, required this.ts, required this.dayOffset,
    required this.memo, required this.account, required this.inAmount,
    required this.outAmount, required this.balance});
}

/// Every journal line touching cash/wallet, oldest first, with a
/// running balance PER GL BUCKET.
List<CashBookRow> cashBook(List<JournalEntry> entries) {
  final sorted = [...entries]..sort((a, b) => a.ts.compareTo(b.ts));
  final balances = <String, double>{'cash': 0, 'wallet': 0};
  final rows = <CashBookRow>[];
  for (final e in sorted) {
    for (final l in e.lines) {
      if (l.account != 'cash' && l.account != 'wallet') continue;
      balances[l.account] = (balances[l.account] ?? 0) + l.debit - l.credit;
      rows.add(CashBookRow(entryId: e.id, ts: e.ts, dayOffset: e.dayOffset, memo: e.memo,
          account: l.account, inAmount: l.debit, outAmount: l.credit, balance: balances[l.account]!));
    }
  }
  return rows;
}

/* ---------------- supplier subledger (B4-amended) ---------------- */

/// Gross claim reversed by ONE purchase return (offset + refund).
double purchaseReturnGross(PurchaseReturn ret) => ret.payableOffset + ret.refundAmount;

double purchaseReturnedGross(List<PurchaseReturn> purchaseReturns, String purchaseId) =>
    purchaseReturns.where((r) => r.purchaseId == purchaseId).fold(0.0, (a, r) => a + purchaseReturnGross(r));

double supplierReturned(List<PurchaseReturn> purchaseReturns, String supplierId) =>
    purchaseReturns.where((r) => r.supplierId == supplierId).fold(0.0, (a, r) => a + purchaseReturnGross(r));

/// Σ of the CASH leg of one supplier's purchase returns — a refund
/// is a NEGATIVE PAYMENT in the balance derivation (F-6 discipline).
double supplierRefunded(List<PurchaseReturn> purchaseReturns, String supplierId) =>
    purchaseReturns.where((r) => r.supplierId == supplierId).fold(0.0, (a, r) => a + r.refundAmount);

/// What a supplier has supplied, NET of goods sent back (B4).
double supplierPurchased(List<Purchase> purchases, String supplierId,
        [List<PurchaseReturn> purchaseReturns = const []]) =>
    purchases.where((p) => p.supplierId == supplierId).fold(0.0, (a, p) => a + p.total) -
    supplierReturned(purchaseReturns, supplierId);

/// Σ paid; `kind == "reversal"` rows (bounced-cheque compensation)
/// NET OUT — the kind carries the sign (B5).
double supplierPaid(List<SupplierPayment> payments, String supplierId) => payments
    .where((p) => p.supplierId == supplierId)
    .fold(0.0, (a, p) => a + (p.kind == 'reversal' ? -p.amount : p.amount));

/// Payable balance for one supplier: purchased (net of returns) −
/// paid (net of refunds received). May go NEGATIVE — the supplier
/// advance — exactly as the journal's `payables` reads.
double supplierBalance(List<Purchase> purchases, List<SupplierPayment> payments, String supplierId,
        [List<PurchaseReturn> purchaseReturns = const []]) =>
    supplierPurchased(purchases, supplierId, purchaseReturns) -
    (supplierPaid(payments, supplierId) - supplierRefunded(purchaseReturns, supplierId));

/* ---------------- aging (FIFO allocation) ---------------- */

class AgingBuckets {
  double current; // 0–30 days
  double mid; // 31–60 days
  double old; // 60+ days
  double total;
  AgingBuckets({this.current = 0, this.mid = 0, this.old = 0, this.total = 0});
}

String _bucketFor(int dayOffset) => dayOffset <= 30 ? 'current' : (dayOffset <= 60 ? 'mid' : 'old');

void _addToBucket(AgingBuckets out, int dayOffset, double amount) {
  switch (_bucketFor(dayOffset)) {
    case 'current':
      out.current += amount;
    case 'mid':
      out.mid += amount;
    default:
      out.old += amount;
  }
  out.total += amount;
}

/// Age outstanding RECEIVABLES on the shared lot allocation
/// ([creditLotsRemaining]): reversals net their own bill's lot,
/// repayments retire the oldest lots first, and what remains
/// carries its lot's age. The buckets' total therefore equals
/// Σ positive `customerOutstanding` by construction. (Fix
/// Round 1 · F4: the pre-fix FIFO skipped negative reversal
/// rows entirely, so a credit note never reduced the buckets.)
AgingBuckets receivablesAging(List<CreditEntry> credits) {
  final out = AgingBuckets();
  final keys = credits.map(creditKey).toSet();
  for (final key in keys) {
    final rows = credits.where((c) => creditKey(c) == key).toList();
    for (final lot in creditLotsRemaining(rows)) {
      _addToBucket(out, lot.dayOffset, lot.remaining);
    }
  }
  return out;
}

/// Age outstanding PAYABLES per supplier, FIFO against oldest
/// purchases; each purchase ages only its NET owed (total − its
/// returns' gross) and the payment pool is net of refunds, so the
/// buckets' total equals Σ positive supplierBalance by construction.
AgingBuckets payablesAging(List<Purchase> purchases, List<SupplierPayment> payments,
    [List<PurchaseReturn> purchaseReturns = const []]) {
  final out = AgingBuckets();
  final supplierIds = purchases.map((p) => p.supplierId).toSet();
  for (final sid in supplierIds) {
    var paid = supplierPaid(payments, sid) - supplierRefunded(purchaseReturns, sid);
    final rows = purchases.where((p) => p.supplierId == sid).toList()
      ..sort((a, b) => b.dayOffset.compareTo(a.dayOffset)); // oldest first
    for (final p in rows) {
      final owedRaw = p.total - purchaseReturnedGross(purchaseReturns, p.id);
      final owed = owedRaw > 0 ? owedRaw : 0.0;
      final applied = paid < owed ? paid : owed;
      paid -= applied;
      final remaining = owed - applied;
      if (remaining > 0) _addToBucket(out, p.dayOffset, remaining);
    }
  }
  return out;
}

/* ---------------- expense selectors ---------------- */

List<Expense> expensesOnDay(List<Expense> expenses, int dayOffset) =>
    expenses.where((e) => e.dayOffset == dayOffset).toList();

double expenseTotal(List<Expense> expenses) => expenses.fold(0.0, (a, e) => a + e.amount);
