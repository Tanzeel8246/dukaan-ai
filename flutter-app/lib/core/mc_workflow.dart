/// Dukaan AI — MC Billing workflow adoption (mobile, 2026-10-27).
///
/// Pure derivations and guards for the screen-by-screen plan
/// (dukaan-ai-mc-billing-workflow-adoption-plan-2026-10-27.md).
/// Nothing here touches Firestore: the store calls these helpers
/// and the feature screens read them, so every rule below is
/// unit-testable and every surface agrees on the same numbers.
///
/// DELIBERATE DIVERGENCES FROM MC BILLING (the plan's defect list):
///  - dates are ALWAYS DD/MM/YYYY ([formatDdMmYyyy]), never US format;
///  - pipeline counters derive from live statuses, never from a
///    cached label (the "Confirmed 7" lesson);
///  - no verify-style screen may claim a blanket "100% balanced":
///    [tieOutReport] returns one pass/fail + difference PER check;
///  - the cashier role keeps the existing least-privilege matrix
///    ([cashierCanDelete] is false by construction, finance /
///    margins / exports are not visible to cashiers);
///  - letterheads print from the shop's OWN branding doc, never a
///    stored image belonging to another tenant (the receipt view
///    already reads the active shop only — this module adds no
///    cross-tenant read).
///
/// UNEARNED EQUIVALENT (receipt split) — OWNER DECISION 2026-10-27:
/// the WEB convention on both platforms. A customer advance posts
/// to the dedicated liability account `customer_advances` (COA
/// code 31, mirroring web/lib/coa.ts), ref = plain customer id.
/// It is never mixed into `payables` (supplier money) and never
/// into `receivables` (bill payments). The AP tie-out therefore
/// compares GL payables DIRECTLY with supplier balances — no
/// subtraction workaround. Old advances are never restated; and
/// since the workflow build had not been pushed when this
/// decision was taken, no live journal entry uses the old
/// `payables`/`cust:` convention, so no migration is needed.
/// The split API (bill part vs advance part) is unchanged.
///
/// STOCK DEDUCTION — EXACTLY ONCE (the plan's §3 rule):
///   THE INVOICE (TAX INVOICE / BILL) DEDUCTS. THE CHALLAN NEVER
///   DOES. A delivery challan is goods-movement paperwork only:
///   dispatching it writes status + number and no stock column.
///   Posting the bill that cites the challan (or the order, or the
///   quotation) deducts once, in the same batch as its journal
///   entry, from BOTH stock columns (see [bothStockColumnsAfter]).
///   A direct counter sale deducts the same way. No other path
///   deducts for the same goods, so the SO → challan → invoice
///   chain can never double-deduct.
import 'documents.dart' show derivePoStatus, deriveQuotationStatus;
import 'ledger.dart'
    show
        accountBalance,
        accountNormalBalance,
        accountForMethod,
        entryBalances,
        makeEntry,
        payablesAging,
        refNormalBalance,
        roundPaisa,
        trialBalanceTotal;
import 'periods.dart' show isPeriodLocked;
import 'permissions.dart' show can;
import 'stock.dart' show qtyAtWarehouse;
import 'types.dart';

/* ---------------- dates: always DD/MM/YYYY ---------------- */

/// Format an ISO timestamp (or ISO date) as DD/MM/YYYY. An already
/// DD/MM/YYYY string passes through; anything unparseable is
/// returned unchanged rather than reformatted into a wrong date.
String formatDdMmYyyy(String ts) {
  final dmy = RegExp(r'^(\d{2})/(\d{2})/(\d{4})');
  if (dmy.hasMatch(ts)) return ts.substring(0, 10);
  if (ts.length < 10) return ts;
  final iso = ts.substring(0, 10);
  final parts = iso.split('-');
  if (parts.length != 3) return ts;
  final y = int.tryParse(parts[0]);
  final m = int.tryParse(parts[1]);
  final d = int.tryParse(parts[2]);
  if (y == null || m == null || d == null) return ts;
  if (m < 1 || m > 12 || d < 1 || d > 31) return ts;
  return '${d.toString().padLeft(2, '0')}/${m.toString().padLeft(2, '0')}/$y';
}

/* ---------------- stock: exactly once, both columns ---------------- */

/// THE stock-deduction point for the SO → challan → invoice chain.
const String stockDeductionPoint = 'invoice';

/// Challans never deduct stock (paperwork only — see header).
const bool challanDeductsStock = false;

/// Both stock columns after a signed delta, in lockstep. The
/// store writes all three fields in the same Firestore update
/// (the web parity pair `current_stock` / `current_qty` plus the
/// mobile `stockQty`); a sale that moves only one column is a
/// parity bug, and this helper is what the tests pin.
({double stockQty, double currentStock, double currentQty}) bothStockColumnsAfter({
  required double stockQty,
  required double currentStock,
  required double currentQty,
  required double delta,
}) =>
    (
      stockQty: roundPaisa(stockQty + delta),
      currentStock: roundPaisa(currentStock + delta),
      currentQty: roundPaisa(currentQty + delta),
    );

/// The offline-bill sync parity check: after an offline bill syncs,
/// the product total, BOTH web columns and the warehouse level must
/// all read the same expected quantity. Any mismatch is a parity
/// failure to surface, never to paper over.
bool offlineBillParity({
  required double stockQty,
  required double currentStock,
  required double currentQty,
  required double levelQty,
  required double expectedQty,
}) =>
    (stockQty - expectedQty).abs() < 1e-9 &&
    (currentStock - expectedQty).abs() < 1e-9 &&
    (currentQty - expectedQty).abs() < 1e-9 &&
    (levelQty - expectedQty).abs() < 1e-9;

/// A transfer moves stock between two DISTINCT warehouses only.
bool transferWarehousesValid(String fromId, String toId) =>
    fromId.isNotEmpty && toId.isNotEmpty && fromId != toId;

/* ---------------- quotations: conversion date + lock ---------------- */

/// The invoice date of a quotation conversion is ALWAYS the
/// conversion date (the MC Billing INV-1010 lesson: never the
/// quotation's own date). The bill's `ts` is stamped at posting,
/// so this is the date the conversion screen shows and confirms.
String quotationInvoiceDate(String conversionTs) => formatDdMmYyyy(conversionTs);

/// A quotation whose derived status is `converted` is LOCKED
/// against re-conversion: the store refuses a new conversion and
/// the documents screen hides the convert actions.
bool quotationLockedForConversion(
        Quotation q, Iterable<SaleOrder> orders, Iterable<Bill> bills) =>
    deriveQuotationStatus(q, orders, bills) == 'converted';

/* ---------------- receipts: bill vs advance, split at entry ---------------- */

class ReceiptSplit {
  final double billPayment;
  final double advance;
  final double total;
  const ReceiptSplit({required this.billPayment, required this.advance, required this.total});
}

/// Split a receipt at entry: bill part + advance part == total.
/// Excess bill payment over the customer's outstanding is NOT
/// forced into receivables — it slides into the advance part, so
/// receivables can never go negative from an over-payment. Null
/// when the total is not positive. Old advances are never
/// restated: this function only splits the NEW receipt.
ReceiptSplit? normalizeReceiptSplit({
  required double total,
  required double billPayment,
  required double advance,
  double? outstanding,
}) {
  if (total <= 0) return null;
  var bill = billPayment < 0 ? 0.0 : billPayment;
  var adv = advance < 0 ? 0.0 : advance;
  if (bill + adv > total) {
    // The typed parts exceed the cash received: the bill part
    // keeps priority, the advance absorbs the remainder.
    if (bill > total) bill = total;
    adv = total - bill;
  } else if (bill + adv < total) {
    // Unassigned remainder is advance money, not bill money.
    adv = total - bill;
  }
  if (outstanding != null && bill > outstanding) {
    final excess = bill - outstanding;
    bill = outstanding;
    adv += excess;
  }
  return ReceiptSplit(
    billPayment: roundPaisa(bill),
    advance: roundPaisa(adv),
    total: roundPaisa(total),
  );
}

/// ONE atomic balanced entry for a split receipt (the guarded
/// choke point posts exactly this): Dr the money account for the
/// total; Cr receivables for the bill part (ref: customer id);
/// Cr `customer_advances` for the advance part (ref: customer
/// id). Zero parts are dropped by [makeEntry]; an unbalanced
/// composition throws before anything is written.
JournalEntry composeReceiptSplitEntry({
  required String receiptId,
  required String? customerId,
  required String customerName,
  required String method,
  required String? accountId,
  required double billPayment,
  required double advance,
  String? ts,
}) {
  final custRef = customerId ?? '';
  return makeEntry(
    'Receipt (split) — $customerName',
    'receipt',
    receiptId,
    [
      JournalLine(
        account: accountForMethod(method),
        debit: roundPaisa(billPayment + advance),
        ref: accountId,
      ),
      if (billPayment > 0)
        JournalLine(account: 'receivables', credit: roundPaisa(billPayment), ref: custRef),
      if (advance > 0)
        JournalLine(account: 'customer_advances', credit: roundPaisa(advance), ref: custRef),
    ],
    ts: ts,
  );
}

/// Advances held for one customer, derived from the journal
/// (dedicated `customer_advances` account, ref = customer id).
double customerAdvancesFromJournal(List<JournalEntry> journal, String customerId) =>
    refNormalBalance(journal, 'customer_advances', customerId);

/// All customer advances in the journal (dedicated account only;
/// supplier payables never contain advances anymore).
double customerAdvancesTotal(List<JournalEntry> journal) {
  var total = 0.0;
  for (final e in journal) {
    for (final l in e.lines) {
      if (l.account == 'customer_advances') {
        total += l.credit - l.debit;
      }
    }
  }
  return roundPaisa(total);
}

/// Running balance over a customer's credit rows, chronological
/// order assumed by the caller: udhaar given adds, repayments and
/// advances subtract (an advance is money the shop owes back).
double customerLedgerRunningBalance(List<CreditEntry> rowsChronological) {
  var bal = 0.0;
  for (final r in rowsChronological) {
    bal += r.kind == 'credit' ? r.amount : -r.amount;
  }
  return roundPaisa(bal);
}

/* ---------------- suppliers: pipeline counters + AP tie ---------------- */

class PoPipelineCounters {
  final int draft;
  final int confirmed;
  final int partiallyReceived;
  final int received;
  final int unpaid;
  const PoPipelineCounters({
    required this.draft,
    required this.confirmed,
    required this.partiallyReceived,
    required this.received,
    required this.unpaid,
  });
}

/// Pipeline counters derived from LIVE statuses — never from a
/// cached label. `received` counts ONLY fully-received POs (the
/// derived status `received`); partially-received POs have their
/// own counter. `unpaid` counts received-or-partially-received
/// POs whose supplier still carries a positive balance (supplier
/// payments are not attributed per-PO, so this is a supplier-level
/// attribution, stated here rather than hidden).
PoPipelineCounters poPipelineCounters(
  List<PurchaseOrder> pos,
  List<Purchase> purchases,
  List<SupplierPayment> payments,
  List<PurchaseReturn> purchaseReturns,
) {
  var draft = 0, confirmed = 0, partial = 0, received = 0, unpaid = 0;
  for (final po in pos) {
    if (po.status == 'cancelled') continue;
    final derived = derivePoStatus(po, purchases);
    switch (derived) {
      case 'draft':
        draft++;
      case 'issued':
        confirmed++;
      case 'partially_received':
        partial++;
        if (_supplierOwes(po, purchases, payments, purchaseReturns)) unpaid++;
      case 'received':
        received++;
        if (_supplierOwes(po, purchases, payments, purchaseReturns)) unpaid++;
    }
  }
  return PoPipelineCounters(
    draft: draft,
    confirmed: confirmed,
    partiallyReceived: partial,
    received: received,
    unpaid: unpaid,
  );
}

bool _supplierOwes(
  PurchaseOrder po,
  List<Purchase> purchases,
  List<SupplierPayment> payments,
  List<PurchaseReturn> purchaseReturns,
) {
  // Supplier balance helper lives in ledger.dart; re-implemented
  // here in miniature would drift, so the caller-visible rule is:
  // unpaid counts a PO only when its supplier's subledger balance
  // is positive. The balance itself is computed by the store's
  // supplierBalance in the feature screen; this pure counter uses
  // the purchases/payments/returns lists directly.
  var purchased = 0.0, paid = 0.0, refunded = 0.0;
  for (final p in purchases) {
    if (p.supplierId == po.supplierId) purchased += p.total;
  }
  for (final p in payments) {
    if (p.supplierId == po.supplierId) paid += p.amount;
  }
  for (final r in purchaseReturns) {
    // Returns reduce what is owed only via their payable offset;
    // the refund leg is cash back, handled by the payment rows.
    if (r.supplierId == po.supplierId) refunded += r.payableOffset;
  }
  return purchased - paid - refunded > 0.009;
}

/* ---------------- inventory / warehouses ---------------- */

class WarehouseCardCounts {
  final int items;
  final double units;
  const WarehouseCardCounts({required this.items, required this.units});
}

/// REAL item/unit counts for a warehouse card: distinct products
/// with stock at that warehouse, and their summed units. Never 0
/// while stock exists — the count reads the §1.3 resolution rule
/// ([qtyAtWarehouse]), not a cached counter.
WarehouseCardCounts warehouseCardCounts(
  List<Product> products,
  List<StockLevel> levels,
  List<Warehouse> warehouses,
  String warehouseId,
) {
  var items = 0;
  var units = 0.0;
  for (final p in products) {
    final q = qtyAtWarehouse(p, levels, warehouses, warehouseId);
    if (q > 1e-9) {
      items++;
      units += q;
    }
  }
  return WarehouseCardCounts(items: items, units: roundPaisa(units));
}

/// Inventory valuation at cost (Σ stock × cost).
double inventoryValuation(List<Product> products) =>
    roundPaisa(products.fold(0.0, (a, p) => a + p.stockQty * p.costPrice));

/// GL inventory balance (goods + raw classes, normal side).
double glInventoryBalance(List<JournalEntry> journal) =>
    roundPaisa(accountNormalBalance(journal, 'inventory') +
        accountNormalBalance(journal, 'inventory_raw'));

/* ---------------- expenses / BOM ---------------- */

/// Category → expense account. The five live categories map to
/// their own accounts (Rent → expense_rent, never misc); anything
/// unknown falls back to expense_other — never to a code that does
/// not exist in the registry.
String expenseAccountForCategory(String category) {
  switch (category) {
    case 'rent':
      return 'expense_rent';
    case 'electricity':
      return 'expense_electricity';
    case 'salary':
      return 'expense_salary';
    case 'transport':
      return 'expense_transport';
    default:
      return 'expense_other';
  }
}

/// Finished-good cost from BOM components (Σ qty × component cost).
double bomFinishedCost(List<({double qty, double unitCost})> components) =>
    roundPaisa(components.fold(0.0, (a, c) => a + c.qty * c.unitCost));

/* ---------------- finance tie-outs (no blanket claims) ---------------- */

class TieCheck {
  final String id;
  final bool pass;
  final double diff;
  const TieCheck({required this.id, required this.pass, required this.diff});
}

class TieOutReport {
  final List<TieCheck> checks;
  const TieOutReport({required this.checks});
  bool get allPass => checks.every((c) => c.pass);
  TieCheck? check(String id) => checks.where((c) => c.id == id).firstOrNull;
}

/// One pass/fail + difference PER check — never a single
/// "100% balanced" claim. A check passes when its difference is
/// within a paisa; the difference is always reported, pass or fail.
/// AP compares supplier subledgers against GL payables directly
/// (advances live in their own `customer_advances` account, never
/// in payables — owner decision 2026-10-27). AR compares the GL
/// receivables balance against the credits subledger (udhaar
/// given minus repayments; advance rows excluded — they are not
/// receivables). Valuation compares Σ stock × cost against GL
/// inventory. TB is the journal's own balance.
TieOutReport tieOutReport({
  required List<JournalEntry> journal,
  required List<Product> products,
  required List<Purchase> purchases,
  required List<SupplierPayment> supplierPayments,
  required List<PurchaseReturn> purchaseReturns,
  required List<CreditEntry> credits,
}) {
  bool pass(double diff) => diff.abs() < 0.01;
  final tbDiff = roundPaisa(trialBalanceTotal(journal));
  final arGl = roundPaisa(accountNormalBalance(journal, 'receivables'));
  var arSub = 0.0;
  for (final c in credits) {
    if (c.kind == 'credit') {
      arSub += c.amount;
    } else if (c.kind == 'repayment') {
      arSub -= c.amount;
    }
  }
  arSub = roundPaisa(arSub);
  final apSub = roundPaisa(payablesAging(purchases, supplierPayments, purchaseReturns).total);
  final apGl = roundPaisa(accountNormalBalance(journal, 'payables'));
  final valuation = inventoryValuation(products);
  final glInv = glInventoryBalance(journal);
  return TieOutReport(checks: [
    TieCheck(id: 'tb', pass: pass(tbDiff), diff: tbDiff),
    TieCheck(id: 'ar', pass: pass(arGl - arSub), diff: roundPaisa(arGl - arSub)),
    TieCheck(id: 'ap', pass: pass(apGl - apSub), diff: roundPaisa(apGl - apSub)),
    TieCheck(id: 'valuation', pass: pass(glInv - valuation), diff: roundPaisa(glInv - valuation)),
  ]);
}

/// Entry-balance helper kept beside the tie-outs: a split receipt
/// (or any entry) must balance before the guard accepts it.
bool receiptSplitEntryBalances(JournalEntry e) => entryBalances(e);

/* ---------------- cashier least-privilege ---------------- */

/// Sensitive toggles for a NEW cashier: ALL off by default. The
/// staff screen must render these as the initial state; the RBAC
/// matrix already denies finance / margins / exports / deletes
/// to cashiers, and this map is the UI-side default that makes
/// the denial visible instead of implied.
const Map<String, bool> cashierSensitiveDefaults = {
  'canDelete': false,
  'canViewPL': false,
  'canViewMargins': false,
  'canExport': false,
  'canViewFinance': false,
};

/// A cashier can NEVER delete — regardless of module. Other
/// roles decide deletes per module through [can]; the cashier
/// value is unconditionally off so no screen can render a delete
/// action for a cashier by accident.
const bool cashierCanDelete = false;

/// Finance visibility for a role, straight from the matrix
/// (cashier → 'none' → false; owner/manager/accountant as matrix).
bool roleCanViewFinance(String role) => can(role, 'finance', 'view');

/// Margins ride the inventory-cost module (cashier → 'none').
bool roleCanViewMargins(String role) => can(role, 'inventoryCost', 'view');

/// Exports ride the trial-balance-exports module (cashier → 'none').
bool roleCanExport(String role) => can(role, 'trialBalanceExports', 'view');

/* ---------------- day close / lock ---------------- */

/// A backdated entry into a locked day is BLOCKED (the period
/// guard throws `period-locked`; the day-close screen also warns
/// before the user composes such an entry).
bool dayCloseBlocksBackdated(String? lockedThrough, String entryTs) =>
    isPeriodLocked(lockedThrough, entryTs);

/* ---------------- storefront ---------------- */

/// Storefront quantity: the product's REAL stock, never a
/// placeholder. The old "999" / empty-qty displays are defects,
/// not fallbacks: a product with no stock shows 0.
double storefrontDisplayQty(Product p) => p.stockQty;

/// Account-balance read used by the finance screens (kept here so
/// the tie-out panel and the finance tabs share one function).
double glAccountBalance(List<JournalEntry> journal, String account) =>
    accountBalance(journal, account);
