/// Dukaan AI — F2 posting composers (Dart ports of the web
/// StoreProvider's back-office templates: supplier payments,
/// expenses + their F-5 mirror corrections, cash entries, transfers,
/// tax payments, purchase returns + debit notes, cheque lifecycle,
/// cheque capture, the full void engine and the credit-note option).
///
/// Same doctrine as composers.dart: pure functions from resolved
/// inputs to composed documents + balanced journal entries via
/// [makeEntry]; the store runs the guard and writes one batch.
/// Equivalence with the web is proven by the golden fixtures
/// (harness/fixtures/f2-core.json).
import 'cheques.dart';
import 'documents.dart';
import 'ledger.dart';
import 'loyalty.dart';
import 'tax.dart';
import 'types.dart';

String _nowIso() => DateTime.now().toUtc().toIso8601String();

/* ---------------- shared: mirror reversal (F-5) ---------------- */

/// A mirror of `original`: every line's debit/credit swapped, the
/// refType suffixed per the caller's correction family, citing the
/// original via reversesId. The journal stays append-only — an edit
/// is a reversal plus a corrected repost, never a rewrite.
JournalEntry mirrorReversal(JournalEntry original,
    {required String memo, required String refType, String? ts}) {
  return makeEntry(
    memo, refType, original.refId,
    [
      for (final l in original.lines)
        JournalLine(account: l.account, debit: l.credit, credit: l.debit, ref: l.ref)
    ],
    reversesId: original.id, ts: ts ?? _nowIso(), dayOffset: 0,
  );
}

/* ---------------- supplier payments (B4/B5) ---------------- */

class ComposedSupplierPayment {
  final SupplierPayment row;
  final JournalEntry entry;
  final Cheque? cheque;
  const ComposedSupplierPayment({required this.row, required this.entry, this.cheque});
}

/// recordSupplierPayment's composition. The input's `instrument`
/// marks a cheque payment (the method stays the money method): it
/// settles the payable AT ISSUANCE (Cr cheques_issued); a money
/// payment credits its A2-resolved account. The PV-n stamp is
/// minted over the existing supplier-payment rows' voucher numbers.
ComposedSupplierPayment? composeSupplierPayment({
  required String paymentId,
  required Supplier supplier,
  required double amount,
  required String method,
  String? accountId,
  String note = '',
  String? instrument, // "cheque"
  ChequeDraft? chequeDraft,
  String? chequeId,
  required List<MoneyAccount> accounts,
  required List<SupplierPayment> existingPayments,
  Map<String, String> docSeries = const {},
  String? ts,
  String? originDevice,
}) {
  final now = ts ?? _nowIso();
  final isCheque = instrument == 'cheque';
  if (isCheque && !isValidChequeDraft(chequeDraft)) return null;
  if (isCheque && amount <= 0) return null;
  final chqId = isCheque ? (chequeId ?? newId('chq')) : null;
  // A2 stamp: for a cheque this is the DRAWN-ON account.
  final resolvedAccountId = resolveAccountId(accounts, method, accountId);
  final voucherNo = nextDocNumber(
    'paymentVoucher',
    [for (final p in existingPayments) p.voucherNo],
    docSeries,
  );
  final row = SupplierPayment(
    id: paymentId, supplierId: supplier.id, amount: amount, method: method,
    accountId: resolvedAccountId, instrument: isCheque ? 'cheque' : null,
    chequeId: chqId, voucherNo: voucherNo,
    note: note, dayOffset: 0, ts: now, originDevice: originDevice,
  );
  final entry = makeEntry('Supplier payment', 'supplier_payment', row.id, [
    JournalLine(account: 'payables', debit: amount, ref: supplier.id),
    if (isCheque)
      JournalLine(account: 'cheques_issued', credit: amount, ref: chqId)
    else
      JournalLine(account: accountForMethod(method), credit: amount, ref: resolvedAccountId),
  ], ts: now);
  final cheque = isCheque
      ? Cheque(
          id: chqId!, direction: 'out', chequeNo: chequeDraft!.chequeNo.trim(),
          bankName: chequeDraft.bankName.trim(), amount: amount,
          issueDateISO: chequeDraft.issueDateISO, dueDateISO: chequeDraft.dueDateISO,
          partyId: supplier.id, partyName: supplier.name, partyKind: 'supplier',
          status: 'issued', sourceType: 'supplier_payment', sourceId: row.id,
          accountId: resolvedAccountId,
          entryIds: {'captured': entry.id}, note: note, dayOffset: 0, ts: now,
          originDevice: originDevice,
        )
      : null;
  return ComposedSupplierPayment(row: row, entry: entry, cheque: cheque);
}

/* ---------------- expenses (B5/F-5) ---------------- */

class ComposedExpense {
  final Expense row;
  final JournalEntry entry;
  final Cheque? cheque;
  const ComposedExpense({required this.row, required this.entry, this.cheque});
}

/// The expense posting template (expenseEntryFor): Dr the
/// category's expense account; Cr the A2-resolved money account —
/// or Cr cheques_issued when the expense is paid by cheque.
({JournalEntry entry, String accountId, String? chequeId}) expenseEntryFor(
  Expense e, {
  required List<MoneyAccount> accounts,
  required String entryId,
  required List<JournalEntry> journal,
}) {
  JournalEntry? prior;
  for (final j in journal) {
    if (j.id == entryId) prior = j;
  }
  final isCheque = e.instrument == 'cheque' && e.chequeId != null;
  String settleAccountId() {
    if (e.accountId != null && accounts.any((a) => a.id == e.accountId && !a.archived)) {
      return e.accountId!;
    }
    if (prior != null) {
      for (final l in prior.lines) {
        if (l.ref != null && (l.account == 'cash' || l.account == 'wallet')) return l.ref!;
      }
    }
    return resolveAccountId(accounts, e.method) ?? '';
  }

  final accountId = settleAccountId();
  final entry = makeEntry('Expense — ${e.category}', 'expense', e.id, [
    JournalLine(account: 'expense_${e.category}', debit: e.amount),
    if (isCheque)
      JournalLine(account: 'cheques_issued', credit: e.amount, ref: e.chequeId)
    else
      JournalLine(account: accountForMethod(e.method), credit: e.amount, ref: accountId),
  ], ts: e.ts, dayOffset: e.dayOffset);
  return (entry: entry, accountId: accountId, chequeId: isCheque ? e.chequeId : null);
}

/// addExpense's composition (row + entry + optional registry doc).
/// `now` anchors the row's ts (now − dayOffset days, as the web).
/// The row's A2 stamp is the resolved account — for a cheque, the
/// account it is DRAWN ON.
ComposedExpense? composeExpense({
  required String expenseId,
  required String category,
  required double amount,
  required String method,
  String? accountId,
  String note = '',
  int dayOffset = 0,
  String? instrument, // "cheque"
  ChequeDraft? chequeDraft,
  String? chequeId,
  required List<MoneyAccount> accounts,
  required List<JournalEntry> journal,
  String? now,
  String? originDevice,
}) {
  final isCheque = instrument == 'cheque';
  if (isCheque && !isValidChequeDraft(chequeDraft)) return null;
  if (isCheque && amount <= 0) return null;
  final nowTs = now ?? _nowIso();
  final rowTs = DateTime.parse(nowTs)
      .subtract(Duration(days: dayOffset))
      .toUtc()
      .toIso8601String();
  final chqId = isCheque ? (chequeId ?? newId('chq')) : null;
  final row = Expense(
    id: expenseId, category: category, amount: amount, method: method,
    accountId: resolveAccountId(accounts, method, accountId),
    instrument: isCheque ? 'cheque' : null, chequeId: chqId,
    note: note, dayOffset: dayOffset, ts: rowTs, originDevice: originDevice,
  );
  final composed = expenseEntryFor(row, accounts: accounts, entryId: '', journal: journal);
  final entry = composed.entry;
  final cheque = isCheque
      ? Cheque(
          id: chqId!, direction: 'out', chequeNo: chequeDraft!.chequeNo.trim(),
          bankName: chequeDraft.bankName.trim(), amount: amount,
          issueDateISO: chequeDraft.issueDateISO, dueDateISO: chequeDraft.dueDateISO,
          partyId: null, partyName: note.trim().isNotEmpty ? note.trim() : category,
          partyKind: 'expense', status: 'issued', sourceType: 'expense',
          sourceId: row.id, accountId: row.accountId,
          entryIds: {'captured': entry.id}, note: note, dayOffset: dayOffset, ts: rowTs,
          originDevice: originDevice,
        )
      : null;
  return ComposedExpense(row: row, entry: entry, cheque: cheque);
}

/* ---------------- cash entries & transfers (finance) ---------------- */

class ComposedCashEntry {
  final CashEntry row;
  final JournalEntry entry;
  const ComposedCashEntry({required this.row, required this.entry});
}

/// addCashEntry's composition: owner capital in / drawings out.
/// The account resolves explicitly → method default (wallet rides
/// the legacy wallet account when one exists).
ComposedCashEntry composeCashEntry({
  required String cashEntryId,
  required String kind, // "in" | "out"
  required double amount,
  required String method,
  String? accountId,
  String note = '',
  int dayOffset = 0,
  required List<MoneyAccount> accounts,
  String? ts,
  String? originDevice,
}) {
  final now = ts ?? _nowIso();
  MoneyAccount? account;
  if (accountId != null) {
    for (final a in accounts) {
      if (a.id == accountId && !a.archived) account = a;
    }
  }
  account ??= method == 'wallet'
      ? (accounts.where((a) => a.legacyFor == 'wallet' && !a.archived).firstOrNull ??
          defaultAccountForMethod(accounts, 'bank'))
      : defaultAccountForMethod(accounts, 'cash');
  final gl = account != null ? glForAccount(account) : accountForMethod(method);
  final rowMethod = account != null ? glForAccount(account) : method;
  final row = CashEntry(
    id: cashEntryId, kind: kind, amount: amount, method: rowMethod,
    accountId: account?.id, note: note, dayOffset: dayOffset, ts: now,
    originDevice: originDevice,
  );
  final entry = kind == 'in'
      ? makeEntry('Cash in — ${note.isNotEmpty ? note : 'owner capital'}', 'cashbook', row.id, [
          JournalLine(account: gl, debit: amount, ref: account?.id),
          JournalLine(account: 'capital', credit: amount),
        ], ts: now)
      : makeEntry('Cash out — ${note.isNotEmpty ? note : 'owner drawings'}', 'cashbook', row.id, [
          JournalLine(account: 'drawings', debit: amount),
          JournalLine(account: gl, credit: amount, ref: account?.id),
        ], ts: now);
  return ComposedCashEntry(row: row, entry: entry);
}

/// transferFunds' composition: Dr the destination's GL bucket (ref:
/// destination) / Cr the source's (ref: source). A same-bucket
/// transfer posts two lines on the same GL account with different
/// refs — GL-net-zero, per-account balances move.
ComposedCashEntry? composeTransfer({
  required String cashEntryId,
  required MoneyAccount from,
  required MoneyAccount to,
  required double amount,
  String note = '',
  String? ts,
  String? originDevice,
}) {
  if (from.id == to.id || from.archived || to.archived || amount <= 0) return null;
  final now = ts ?? _nowIso();
  final row = CashEntry(
    id: cashEntryId, kind: 'transfer', amount: amount, method: glForAccount(from),
    accountId: null, fromAccountId: from.id, toAccountId: to.id,
    note: note, dayOffset: 0, ts: now, originDevice: originDevice,
  );
  final entry = makeEntry('Transfer — ${from.name} → ${to.name}', 'transfer', row.id, [
    JournalLine(account: glForAccount(to), debit: amount, ref: to.id),
    JournalLine(account: glForAccount(from), credit: amount, ref: from.id),
  ], ts: now);
  return ComposedCashEntry(row: row, entry: entry);
}

/* ---------------- tax payment ---------------- */

/// recordTaxPayment's composition: Dr tax_payable / Cr the paying
/// account; a kind:"out" cash row rides along WITHOUT its own entry
/// (refId of the entry IS the row). Refused above the net payable.
ComposedCashEntry? composeTaxPayment({
  required String cashEntryId,
  required double amount,
  required String method,
  String? accountId,
  String note = '',
  required List<MoneyAccount> accounts,
  required List<JournalEntry> journal,
  String? ts,
  String? originDevice,
}) {
  if (amount <= 0) return null;
  final pos = taxPosition(journal);
  final due = pos.netPayable > 0 ? pos.netPayable : 0.0;
  if (amount > due + 0.001) return null;
  final now = ts ?? _nowIso();
  final resolved = resolveAccountId(accounts, method, accountId);
  MoneyAccount? account;
  for (final a in accounts) {
    if (a.id == resolved) account = a;
  }
  final row = CashEntry(
    id: cashEntryId, kind: 'out', amount: amount,
    method: account != null ? glForAccount(account) : accountForMethod(method),
    accountId: resolved, note: note.isNotEmpty ? note : 'Tax payment',
    dayOffset: 0, ts: now, originDevice: originDevice,
  );
  final entry = makeEntry(
      'Tax payment — ${note.isNotEmpty ? note : 'government'}', 'tax_payment', row.id, [
    JournalLine(account: 'tax_payable', debit: amount),
    JournalLine(account: accountForMethod(method), credit: amount, ref: resolved),
  ], ts: now);
  return ComposedCashEntry(row: row, entry: entry);
}

/* ---------------- purchase returns + debit notes (B4) ---------------- */

class ComposedPurchaseReturn {
  final PurchaseReturn ret;
  final JournalEntry entry;
  final DocNote note;
  const ComposedPurchaseReturn({required this.ret, required this.entry, required this.note});
}

/// recordPurchaseReturn's composition: lines from the derivation,
/// tax via the cumulative shares, settlement 'payable_offset' |
/// 'cash_refund' (the whole gross one way), and the debit note
/// minted in the same batch.
ComposedPurchaseReturn? composePurchaseReturn({
  required String returnId,
  required String noteId,
  required Purchase purchase,
  required List<PurchaseReturn> allPurchaseReturns,
  required List<({String productId, double qty})> picks,
  required String settlement, // payable_offset | cash_refund
  String? method,
  String? accountId,
  required Map<String, Product> productsById,
  required List<MoneyAccount> accounts,
  required List<DocNote> existingNotes,
  Map<String, String> docSeries = const {},
  String? supplierName,
  String reason = '',
  String? ts,
  String? originDevice,
}) {
  final priorReturns = allPurchaseReturns.where((r) => r.purchaseId == purchase.id).toList();
  final items = composePurchaseReturnLines(
    purchase, priorReturns,
    [for (final p in picks) PurchaseReturnPick(productId: p.productId, qty: p.qty)],
  );
  if (items == null) return null;
  final srcById = {for (final i in purchase.items) i.productId: i};
  final netTotal = round2(items.fold(0.0, (a, it) =>
      a + ((srcById[it.productId]?.taxInclusive ?? false) ? it.total - it.taxAmount : it.total)));
  final rawShare = round2(items.fold(0.0, (a, it) =>
      a +
      ((productsById[it.productId]?.isRaw ?? false)
          ? ((srcById[it.productId]?.taxInclusive ?? false) ? it.total - it.taxAmount : it.total)
          : 0.0)));
  final taxTotal = round2(items.fold(0.0, (a, it) => a + it.taxAmount));
  final gross = round2(netTotal + taxTotal);
  if (gross <= 0) return null;
  final now = ts ?? _nowIso();
  final refundMethod = settlement == 'cash_refund' ? (method ?? 'cash') : null;
  final refundAccountId =
      refundMethod != null ? resolveAccountId(accounts, refundMethod, accountId) : null;
  final ret = PurchaseReturn(
    id: returnId, purchaseId: purchase.id, supplierId: purchase.supplierId,
    items: items,
    payableOffset: settlement == 'payable_offset' ? gross : 0,
    refundAmount: settlement == 'cash_refund' ? gross : 0,
    method: refundMethod, accountId: refundAccountId,
    dayOffset: 0, ts: now, originDevice: originDevice,
  );
  final entry = makeEntry('Purchase return — goods sent back', 'purchase_return', ret.id, [
    if (ret.payableOffset > 0)
      JournalLine(account: 'payables', debit: ret.payableOffset, ref: purchase.supplierId),
    if (ret.refundAmount > 0 && refundMethod != null)
      JournalLine(account: accountForMethod(refundMethod), debit: ret.refundAmount, ref: refundAccountId),
    ...classLegLines(netTotal, rawShare, 'credit'),
    if (taxTotal > 0) JournalLine(account: 'tax_input', credit: taxTotal),
  ], ts: now);
  final figures = debitNoteFigures(ret);
  final note = DocNote(
    id: noteId,
    number: nextDocNumber('debitNote',
        [for (final n in existingNotes) if (n.kind == 'debit') n.number], docSeries),
    kind: 'debit', returnId: ret.id, billId: null, billNo: null,
    purchaseId: purchase.id, partyId: purchase.supplierId,
    partyName: supplierName ?? '', items: noteItemsFromPurchaseReturn(ret),
    goodsAmount: figures.goods, taxAmount: figures.tax, total: figures.total,
    settlement: settlement, journalEntryId: entry.id, reason: reason,
    status: 'posted', dayOffset: 0, ts: now, originDevice: originDevice,
  );
  return ComposedPurchaseReturn(ret: ret, entry: entry, note: note);
}

/* ---------------- cheque capture (registry docs) ---------------- */

/// A bill's cheque payment part becomes a registry doc in the SAME
/// batch as the bill (direction "in", status "received").
Cheque chequeDocForBillPayment({
  required Bill bill,
  required BillPayment payment,
  required ChequeDraft draft,
  required String entryId,
  String? originDevice,
}) {
  return Cheque(
    id: payment.chequeId!, direction: 'in', chequeNo: draft.chequeNo.trim(),
    bankName: draft.bankName, amount: payment.amount,
    issueDateISO: draft.issueDateISO, dueDateISO: draft.dueDateISO,
    partyId: bill.customerId, partyName: bill.customerName, partyKind: 'customer',
    status: 'received', sourceType: 'bill', sourceId: bill.id, accountId: null,
    entryIds: {'captured': entryId}, dayOffset: 0, ts: bill.ts,
    originDevice: originDevice,
  );
}

/// A repayment's cheque part becomes a registry doc likewise.
Cheque chequeDocForRepayment({
  required CreditEntry row,
  required ChequeDraft draft,
  required String entryId,
  String? originDevice,
}) {
  return Cheque(
    id: row.chequeId!, direction: 'in', chequeNo: draft.chequeNo.trim(),
    bankName: draft.bankName, amount: row.amount,
    issueDateISO: draft.issueDateISO, dueDateISO: draft.dueDateISO,
    partyId: row.customerId, partyName: row.customerName, partyKind: 'customer',
    status: 'received', sourceType: 'repayment', sourceId: row.id, accountId: null,
    entryIds: {'captured': entryId}, dayOffset: row.dayOffset, ts: row.ts,
    originDevice: originDevice,
  );
}

/* ---------------- cheque lifecycle ---------------- */

class ComposedChequeTransition {
  final Cheque next;
  final List<JournalEntry> entries;
  final CreditEntry? creditRow;
  final SupplierPayment? reversalRow;
  const ComposedChequeTransition({required this.next, this.entries = const [],
    this.creditRow, this.reversalRow});
}

/// DEPOSIT — custody only, posts NOTHING. The deposit account is
/// chosen now (the desk's pick, else the bank default, else the
/// first live account) and recorded on the doc.
ComposedChequeTransition? composeChequeDeposit({
  required Cheque cheque,
  String? accountId,
  required List<MoneyAccount> accounts,
}) {
  if (!canChequeTransition(cheque, 'deposit')) return null;
  final depositAccountId = (accountId != null &&
          accounts.any((a) => a.id == accountId && !a.archived))
      ? accountId
      : (defaultAccountForMethod(accounts, 'bank')?.id ??
          accounts.where((a) => !a.archived).firstOrNull?.id);
  return ComposedChequeTransition(
    next: cheque.copyWith(
      status: 'deposited', accountId: depositAccountId,
      entryIds: {...cheque.entryIds, 'deposited': null},
    ),
  );
}

/// CLEAR — the PDC date has arrived and the bank confirms: value
/// moves from the holding account into the deposit money account
/// (IN) or out of the drawn-on account (OUT).
ComposedChequeTransition? composeChequeClear({
  required Cheque cheque,
  required List<MoneyAccount> accounts,
  String? ts,
}) {
  if (!canChequeTransition(cheque, 'clear')) return null;
  MoneyAccount? account;
  for (final a in accounts) {
    if (a.id == cheque.accountId) account = a;
  }
  if (account == null) return null;
  final now = ts ?? _nowIso();
  final entry = makeEntry(
    'Cheque ${cheque.chequeNo} cleared — ${cheque.partyName}',
    'cheque_clearing', cheque.id,
    clearingLines(cheque, glForAccount(account)),
    ts: now,
  );
  return ComposedChequeTransition(
    next: cheque.copyWith(
      status: 'cleared', entryIds: {...cheque.entryIds, 'cleared': entry.id},
    ),
    entries: [entry],
  );
}

/// BOUNCE — IN (deposited): the receivable re-opens (compensating
/// credit row restores the udhaar); bank charges post as a second
/// entry when given. OUT (issued supplier payment): the payable
/// re-opens (compensating reversal supplier-payment row).
ComposedChequeTransition? composeChequeBounce({
  required Cheque cheque,
  double charges = 0,
  required List<MoneyAccount> accounts,
  required List<Bill> bills,
  required List<CreditEntry> credits,
  required List<SupplierPayment> supplierPayments,
  String? ts,
  String? originDevice,
}) {
  if (!canChequeTransition(cheque, 'bounce')) return null;
  final now = ts ?? _nowIso();
  if (cheque.direction == 'in') {
    final entry = makeEntry(
      'Cheque ${cheque.chequeNo} bounced — ${cheque.partyName}',
      'cheque_bounce', cheque.id, bounceInLines(cheque), ts: now,
    );
    final entries = [entry];
    final chargeAmt = charges > 0 ? round2(charges) : 0.0;
    MoneyAccount? depositAccount;
    for (final a in accounts) {
      if (a.id == cheque.accountId) depositAccount = a;
    }
    if (chargeAmt > 0 && depositAccount != null) {
      entries.add(makeEntry(
        'Bank charges — cheque ${cheque.chequeNo} bounced',
        'cheque_bounce', cheque.id,
        bounceChargesLines(cheque, glForAccount(depositAccount), chargeAmt),
        ts: now,
      ));
    }
    // Compensating khata row: the udhaar the cheque had settled is
    // owed again. The phone rides from the source row.
    String phone = '';
    String? billId;
    if (cheque.sourceType == 'bill') {
      billId = cheque.sourceId;
      for (final b in bills) {
        if (b.id == cheque.sourceId) phone = b.customerPhone;
      }
    } else if (cheque.sourceType == 'repayment') {
      for (final c in credits) {
        if (c.id == cheque.sourceId) phone = c.customerPhone;
      }
    }
    final creditRow = CreditEntry(
      id: newId('cr'), customerId: cheque.partyId, customerName: cheque.partyName,
      customerPhone: phone, kind: 'credit', amount: cheque.amount,
      instrument: 'cheque', chequeId: cheque.id, billId: billId,
      note: 'Cheque bounced — ${cheque.bankName} ${cheque.chequeNo}',
      dayOffset: 0, ts: now, originDevice: originDevice,
    );
    return ComposedChequeTransition(
      next: cheque.copyWith(
        status: 'bounced',
        chargesOnBounce: chargeAmt > 0 ? chargeAmt : cheque.chargesOnBounce,
        entryIds: {...cheque.entryIds, 'bounced': entry.id},
      ),
      entries: entries, creditRow: creditRow,
    );
  }
  // OUT bounce: payable re-opens + compensating reversal row.
  final entry = makeEntry(
    'Cheque ${cheque.chequeNo} bounced — ${cheque.partyName}',
    'cheque_bounce', cheque.id, bounceOutLines(cheque), ts: now,
  );
  SupplierPayment? orig;
  for (final p in supplierPayments) {
    if (p.id == cheque.sourceId) orig = p;
  }
  final reversalRow = SupplierPayment(
    id: newId('spay'), supplierId: cheque.partyId ?? '', amount: cheque.amount,
    method: orig?.method ?? 'cheque', accountId: orig?.accountId,
    kind: 'reversal', instrument: 'cheque', chequeId: cheque.id,
    note: 'Cheque bounced — ${cheque.bankName} ${cheque.chequeNo}',
    dayOffset: 0, ts: now, originDevice: originDevice,
  );
  return ComposedChequeTransition(
    next: cheque.copyWith(
      status: 'bounced', entryIds: {...cheque.entryIds, 'bounced': entry.id},
    ),
    entries: [entry], reversalRow: reversalRow,
  );
}

/// RETURN of an undeposited IN cheque: the mirror of capture — the
/// receivable re-opens via the same compensating-row machinery.
ComposedChequeTransition? composeChequeReturn({
  required Cheque cheque,
  required List<Bill> bills,
  required List<CreditEntry> credits,
  String? ts,
  String? originDevice,
}) {
  if (!canChequeTransition(cheque, 'return')) return null;
  final now = ts ?? _nowIso();
  final entry = makeEntry(
    'Cheque ${cheque.chequeNo} returned — ${cheque.partyName}',
    'cheque_return', cheque.id, returnInLines(cheque), ts: now,
  );
  String phone = '';
  String? billId;
  if (cheque.sourceType == 'bill') {
    billId = cheque.sourceId;
    for (final b in bills) {
      if (b.id == cheque.sourceId) phone = b.customerPhone;
    }
  } else if (cheque.sourceType == 'repayment') {
    for (final c in credits) {
      if (c.id == cheque.sourceId) phone = c.customerPhone;
    }
  }
  final creditRow = CreditEntry(
    id: newId('cr'), customerId: cheque.partyId, customerName: cheque.partyName,
    customerPhone: phone, kind: 'credit', amount: cheque.amount,
    instrument: 'cheque', chequeId: cheque.id, billId: billId,
    note: 'Cheque returned — ${cheque.bankName} ${cheque.chequeNo}',
    dayOffset: 0, ts: now, originDevice: originDevice,
  );
  return ComposedChequeTransition(
    next: cheque.copyWith(
      status: 'returned', entryIds: {...cheque.entryIds, 'returned': entry.id},
    ),
    entries: [entry], creditRow: creditRow,
  );
}

/* ---------------- the full void engine (B5 handbacks) ---------------- */

class ComposedVoid {
  final JournalEntry entry;
  final SaleReturn saleReturn;
  final CreditEntry? creditReversal;
  final List<Sale> negSales;
  final List<Cheque> chequeUpdates;
  /// H2: the earn-reversal companion (negative-points
  /// `loyalty_earn` with reversesId on the earn), composed when
  /// the voided bill had earned — posted in the void's own batch.
  final JournalEntry? clawback;
  const ComposedVoid({required this.entry, required this.saleReturn, this.creditReversal,
    this.negSales = const [], this.chequeUpdates = const [], this.clawback});
}

/// The web's shared return engine for kind == "void": every original
/// payment returns through its own account; cheque parts follow the
/// registry state (in hand → handed back + doc closed "returned";
/// cleared → refunded from the deposit account; bounced/returned →
/// no line); repaid udhaar is handed back in cash (F-6). Replaces
/// F1's simplified composeVoidEntry at the store when cheques exist.
ComposedVoid? composeVoidFull({
  required Bill bill,
  required List<CreditEntry> credits,
  required List<MoneyAccount> accounts,
  required Map<String, Product> productsById,
  required List<Cheque> cheques,
  required List<JournalEntry> journal,
  String? originDevice,
  String? ts,
}) {
  if (bill.status != 'paid') return null;
  if (bill.returnedQty.values.any((q) => q > 0)) return null;
  final now = ts ?? _nowIso();
  final creditPosition = billCreditOutstanding(credits, bill);
  final creditReduction = creditPosition.outstanding;
  final shares = returnTaxShares(bill, const [], bill.items);
  final gross = bill.items.fold(0.0, (a, i) => a + i.total);
  final refundTotal = gross - bill.discountAmount + shares.exclusiveTaxShare;
  final cashRefund = refundTotal - creditReduction;
  var cost = 0.0, costRaw = 0.0;
  for (final i in bill.items) {
    cost += i.qty * i.unitCost;
    if (productsById[i.productId]?.isRaw ?? false) costRaw += i.qty * i.unitCost;
  }
  final handbacks = <Cheque>[];
  final refundLines = <JournalLine>[];
  for (final p in bill.payments) {
    if (p.method == 'credit') continue;
    if (p.instrument == 'points') {
      // H2: the points tender hands back as POINTS — the whole leg
      // returns to the liability (Cr loyalty_payable, ref = the
      // customer); the fold reads the count off the void entry's
      // loyaltyPointsReturned payload (stamped below).
      refundLines.add(JournalLine(
          account: 'loyalty_payable', credit: p.amount, ref: bill.customerId));
      continue;
    }
    if (p.instrument == 'cheque' && p.chequeId != null) {
      Cheque? chq;
      for (final c in cheques) {
        if (c.id == p.chequeId) chq = c;
      }
      if (chq != null && (chq.status == 'bounced' || chq.status == 'returned')) {
        continue; // value already restored at the bounce/return
      }
      if (chq != null && chq.status == 'cleared') {
        MoneyAccount? acct;
        for (final a in accounts) {
          if (a.id == chq.accountId) acct = a;
        }
        refundLines.add(JournalLine(
          account: acct != null ? glForAccount(acct) : accountForMethod(p.method),
          credit: p.amount, ref: chq.accountId,
        ));
        continue;
      }
      if (chq != null) handbacks.add(chq);
      refundLines.add(JournalLine(
          account: 'cheques_in_hand', credit: p.amount, ref: p.chequeId));
      continue;
    }
    refundLines.add(JournalLine(
      account: accountForMethod(p.method), credit: p.amount,
      ref: p.accountId ?? resolveAccountId(accounts, p.method),
    ));
  }
  if (creditPosition.repaidAllocated > 0) {
    refundLines.add(JournalLine(
      account: 'cash', credit: creditPosition.repaidAllocated,
      ref: resolveAccountId(accounts, 'cash'),
    ));
  }
  final rawEntry = makeEntry('Bill #${bill.billNo} voided', 'bill_void', bill.id, [
    JournalLine(account: 'sales_revenue',
        debit: shares.inclusiveTaxShare > 0 ? round2(gross - shares.inclusiveTaxShare) : gross),
    if (shares.taxShare > 0) JournalLine(account: 'tax_payable', debit: shares.taxShare),
    ...classLegLines(cost, costRaw, 'debit'),
    if (bill.discountAmount > 0)
      JournalLine(account: 'sales_discount', credit: bill.discountAmount),
    if (creditReduction > 0)
      JournalLine(account: 'receivables', credit: creditReduction, ref: bill.customerId),
    ...refundLines,
    JournalLine(account: 'cogs', credit: cost),
  ], ts: now);
  // H2: a void restores the bill's WHOLE points tender — the fold
  // reads the count off this payload (the bill entry's own stamp).
  JournalEntry? billEntry;
  for (final e in journal) {
    if (e.refType == 'bill' && e.refId == bill.id) {
      billEntry = e;
      break;
    }
  }
  final usedPts = billEntry?.loyaltyPointsUsed ?? 0;
  final entry = usedPts > 0
      ? rawEntry.copyWith(loyaltyPointsReturned: usedPts)
      : rawEntry;
  // H2 (§1.4): the earn-reversal companion — the voided bill's
  // whole remaining earn returns, marked as reversing the earn
  // entry; its refId names the bill it annuls.
  JournalEntry? clawback;
  final earnEntry0 = bill.customerId != null ? billLoyaltyEarnEntry(journal, bill.id) : null;
  if (earnEntry0 != null) {
    final clawPoints = (earnEntry0.points ?? 0) - billLoyaltyClawedPoints(journal, bill.id);
    if (clawPoints > 0) {
      clawback = buildLoyaltyClawbackEntry(
        journal: journal,
        bill: bill,
        clawPoints: clawPoints,
        refId: bill.id,
        memo: 'Loyalty earn reversed — Bill #${bill.billNo} voided',
        ts: now,
        reversesId: earnEntry0.id,
      );
    }
  }
  final chequeUpdates = [
    for (final c in handbacks)
      c.copyWith(status: 'returned', entryIds: {...c.entryIds, 'returned': entry.id}),
  ];
  final ret = SaleReturn(
    id: newId('ret'), billId: bill.id, billNo: bill.billNo, items: bill.items,
    refundAmount: cashRefund, creditReduction: creditReduction, method: 'cash',
    accountId: null, dayOffset: 0, ts: now,
  );
  final creditReversal = creditReduction > 0
      ? CreditEntry(
          id: newId('cr'), customerId: bill.customerId, customerName: bill.customerName,
          customerPhone: bill.customerPhone, kind: 'credit', amount: -creditReduction,
          note: 'Bill #${bill.billNo} voided — udhaar reversed', billId: bill.id,
          dayOffset: 0, ts: now, originDevice: originDevice,
        )
      : null;
  final negSales = <Sale>[
    for (var i = 0; i < bill.items.length; i++)
      Sale(id: '${bill.id}-r${DateTime.now().millisecondsSinceEpoch.toRadixString(36)}-$i',
          productId: bill.items[i].productId, qty: -bill.items[i].qty,
          unitPrice: bill.items[i].unitPrice, unitCost: bill.items[i].unitCost,
          total: -bill.items[i].total, billId: bill.id, kind: 'return',
          dayOffset: 0, ts: now),
  ];
  return ComposedVoid(entry: entry, saleReturn: ret, creditReversal: creditReversal,
      negSales: negSales, chequeUpdates: chequeUpdates, clawback: clawback);
}

/* ---------------- credit notes (the note option, B3) ---------------- */

/// Mint the credit note for a composed return: figures via
/// [creditNoteFigures]; settlement follows the money — a return
/// that reduced udhaar is a credit_reduction, else a cash_refund.
DocNote composeCreditNote({
  required String noteId,
  required Bill bill,
  required SaleReturn ret,
  required String journalEntryId,
  required List<DocNote> existingNotes,
  Map<String, String> docSeries = const {},
  String reason = '',
  String? ts,
  String? originDevice,
}) {
  final figures = creditNoteFigures(ret);
  final settlement =
      (ret.creditReduction > 0 && ret.refundAmount <= 0) ? 'credit_reduction' : 'cash_refund';
  return DocNote(
    id: noteId,
    number: nextDocNumber('creditNote',
        [for (final n in existingNotes) if (n.kind == 'credit') n.number], docSeries),
    kind: 'credit', returnId: ret.id, billId: bill.id, billNo: bill.billNo,
    purchaseId: null, partyId: bill.customerId, partyName: bill.customerName,
    items: ret.items, goodsAmount: figures.goods, taxAmount: figures.tax,
    total: figures.total, settlement: settlement, journalEntryId: journalEntryId,
    reason: reason, status: 'posted', dayOffset: 0, ts: ts ?? ret.ts,
    originDevice: originDevice,
  );
}
