/// Dukaan AI — Phase C · C4: production orders (Dart port of
/// web/lib/production.ts, design ERP-PHASE-C-DESIGN.md §4). Pure
/// derivations, the absorption arithmetic and EVERY journal
/// composition of the production floor, shared by the store, the
/// manufacturing surface and the test suite.
///
/// THE MODEL (§4.2): a production order's events are its
/// subledger — append-only records, each written inside its
/// posting batch and citing the ONE journal entry that posted
/// it. Progress is DERIVED from the events, never stored:
///
///   producedQty(order) = Σ completion qty
///   pool(order)        = Σ issue values − Σ completion values
///                        − Σ scrap values − Σ closeout values
///
/// and the phase identity is `GL wip == Σ pool(order)` to the
/// paisa (§4.3). The pool can never go negative: issue is its
/// only source, and completion/scrap/closeout values are
/// computed FROM the pool and capped by it before composition.
///
/// ABSORPTION (§4.2, the F-3 discipline): a completion's value
/// is the pool's cumulative average share — poolBefore × F /
/// max(plannedQty − producedBefore, F) — and a FINAL completion
/// (plan reached, or the desk closes with it) absorbs the
/// ENTIRE remaining pool, so Σ completions + Σ scraps +
/// Σ closeouts == Σ issues to the paisa for every order,
/// always: no rounding residue can strand in WIP.
///
/// LABOUR & OVERHEAD (§4.4 + owner Q3): each issue declares the
/// run's conversion cost ONCE, with one settlement choice for
/// the pair — paid from a money account at issue (the desk
/// default) or accrued to `salary_payable`.
import 'ledger.dart' show defaultAccountForMethod, fmtQty, glForAccount, makeEntry, roundPaisa;
import 'stock.dart' show qtyAtWarehouse;
import 'transfers.dart' show inventoryAccountForClass;
import 'types.dart';

double round2(double n) => roundPaisa(n);

/* ---------------- derivations over the event log (§4.2/§4.3) ---------------- */

/// Finished units produced so far: Σ completion quantities.
double producedQty(ProductionOrder order) => order.events
    .where((e) => e.kind == 'completion')
    .fold(0.0, (a, e) => a + e.qty);

/// Σ of the values the order's issue events moved into WIP.
double issuedValue(ProductionOrder order) => order.events
    .where((e) => e.kind == 'issue')
    .fold(0.0, (a, e) => a + e.value);

/// Σ of the values completions absorbed out of WIP into
/// finished stock.
double completedValue(ProductionOrder order) => order.events
    .where((e) => e.kind == 'completion')
    .fold(0.0, (a, e) => a + e.value);

/// Σ of the values written off to `inventory_loss` — scrap
/// events and the closeout residual together.
double writtenOffValue(ProductionOrder order) => order.events
    .where((e) => e.kind == 'scrap' || e.kind == 'closeout')
    .fold(0.0, (a, e) => a + e.value);

/// The order's WIP pool. Across all orders, Σ pool == the GL
/// `wip` balance to the paisa (§4.3). Never negative by
/// construction.
double poolOf(ProductionOrder order) =>
    round2(issuedValue(order) - completedValue(order) - writtenOffValue(order));

/// Finished units still owed by the plan (0 when over-produced).
double remainingPlannedQty(ProductionOrder order) {
  final r = order.plannedQty - producedQty(order);
  return r > 0 ? r : 0;
}

/// The absorbed cost of one produced unit so far. 0 before the
/// first completion.
double absorbedUnitCost(ProductionOrder order) {
  final produced = producedQty(order);
  if (produced <= 0) return 0;
  return round2(completedValue(order) / produced);
}

/// The cached status label, recomputed from the derivation in
/// every event batch (§4.2). Cancelled is terminal and sticky;
/// an untouched order keeps the label its own actions set.
String deriveProductionStatus(ProductionOrder order) {
  if (order.status == 'cancelled') return 'cancelled';
  if (order.events.isEmpty) return order.status;
  if (producedQty(order) >= order.plannedQty && poolOf(order) <= 0) {
    return 'completed';
  }
  return 'open';
}

/* ---------------- the recipe snapshot (§4.2/§3.2) ---------------- */

/// The recipe an order is born with: a DEEP copy of the BOM
/// version's economics. Later BOM versions never re-cost an
/// open order.
BomSnapshot snapshotOfBom(Bom bom) => BomSnapshot(
      outputQty: bom.outputQty,
      lines: [
        for (final l in bom.lines)
          BomLine(productId: l.productId, name: l.name, qty: l.qty),
      ],
      labourCost: bom.labourCost,
      overheadCost: bom.overheadCost,
    );

double _round3(double n) => ((n + 2.220446049250313e-16) * 1000).round() / 1000;

/// The issue desk's default component quantities for a run of N
/// finished units: the SNAPSHOT's per-batch quantities scaled
/// by N / batch size (§4.2). Editable at the desk.
List<({String productId, double qty})> defaultIssueLines(ProductionOrder order, double runQty) {
  final snap = order.bomSnapshot;
  if (!(snap.outputQty > 0) || !(runQty > 0)) return const [];
  return [
    for (final l in snap.lines)
      if (_round3(l.qty * runQty / snap.outputQty) > 0)
        (productId: l.productId, qty: _round3(l.qty * runQty / snap.outputQty)),
  ];
}

/// The issue desk's default conversion cost for a run of N: the
/// snapshot's per-batch labour/overhead scaled the same way.
({double labourCost, double overheadCost}) defaultIssueConversion(
    ProductionOrder order, double runQty) {
  final snap = order.bomSnapshot;
  if (!(snap.outputQty > 0) || !(runQty > 0)) {
    return (labourCost: 0.0, overheadCost: 0.0);
  }
  return (
    labourCost: round2(snap.labourCost * runQty / snap.outputQty),
    overheadCost: round2(snap.overheadCost * runQty / snap.outputQty),
  );
}

/* ---------------- issue: validation + valuation (§4.2) ---------------- */

class IssueInput {
  final double runQty; // finished units this run intends to produce
  final List<({String productId, double qty})> lines;
  final double labourCost;
  final double overheadCost;
  final String settlement; // "paid" | "accrue" (§4.4)
  final String? paidFromAccountId;
  const IssueInput({required this.runQty, required this.lines, this.labourCost = 0,
    this.overheadCost = 0, this.settlement = 'paid', this.paidFromAccountId});
}

class ValuedIssueLine {
  final String productId;
  final String name;
  final double qty;
  final double unitCost; // the shelf cost in force at the issue
  final double value; // round2(qty × unitCost)
  final String? stockClass; // the component's class at the issue
  const ValuedIssueLine({required this.productId, required this.name, required this.qty,
    required this.unitCost, required this.value, this.stockClass});
}

class PreparedIssue {
  final List<ValuedIssueLine> lines;
  final double materialsValue;
  final double labourCost;
  final double overheadCost;
  final JournalEntry entry;
  final String? paidFromAccountId; // account id | "accrue" | null
  final ProductionEvent event;
  const PreparedIssue({required this.lines, required this.materialsValue,
    required this.labourCost, required this.overheadCost, required this.entry,
    required this.paidFromAccountId, required this.event});
}

/// The result of [prepareIssue]: exactly one of [prepared] /
/// [problem] is non-null (the web's discriminated union).
class IssueResult {
  final PreparedIssue? prepared;
  final String? problem; // IssueProblem code
  final String? productId;
  const IssueResult.ok(this.prepared) : problem = null, productId = null;
  const IssueResult.refused(this.problem, [this.productId]) : prepared = null;
}

/// Validate, value and compose an issue BEFORE anything is
/// written (B's pre-composition refusal discipline): the store
/// either commits the returned preparation whole — entry,
/// event, row drops — or writes nothing at all.
///
/// Components are valued at their CURRENT shelf `costPrice`,
/// and each validates against the ORDER warehouse's row through
/// the §1.3 resolution rule — insufficient stock at that
/// warehouse refuses the whole issue (§4.5).
IssueResult prepareIssue(
  ProductionOrder order,
  List<Product> products,
  List<StockLevel> levels,
  List<Warehouse> warehouses,
  List<MoneyAccount> accounts,
  IssueInput input, {
  String? ts,
}) {
  if (order.status == 'completed' || order.status == 'cancelled') {
    return const IssueResult.refused('not_open');
  }
  if (!(input.runQty > 0)) return const IssueResult.refused('bad_run');
  final labourCost = round2(input.labourCost);
  final overheadCost = round2(input.overheadCost);
  if (labourCost < 0 || overheadCost < 0) return const IssueResult.refused('bad_costs');
  if (input.lines.isEmpty) return const IssueResult.refused('empty_lines');

  final byId = {for (final p in products) p.id: p};
  final merged = <String, double>{};
  for (final pick in input.lines) {
    if (!byId.containsKey(pick.productId)) {
      return IssueResult.refused('unknown_component', pick.productId);
    }
    if (!pick.qty.isFinite || pick.qty <= 0) {
      return IssueResult.refused('bad_qty', pick.productId);
    }
    merged[pick.productId] = (merged[pick.productId] ?? 0) + pick.qty;
  }
  if (merged.isEmpty) return const IssueResult.refused('empty_lines');

  final lines = <ValuedIssueLine>[];
  var materialsValue = 0.0;
  for (final e in merged.entries) {
    final p = byId[e.key]!;
    final onHand = qtyAtWarehouse(p, levels, warehouses, order.warehouseId);
    if (e.value > onHand + 1e-9) return IssueResult.refused('insufficient', e.key);
    final value = round2(e.value * p.costPrice);
    lines.add(ValuedIssueLine(
        productId: e.key, name: p.name, qty: e.value, unitCost: p.costPrice,
        value: value, stockClass: p.stockClass));
    materialsValue += value;
  }
  materialsValue = round2(materialsValue);
  final conversion = round2(labourCost + overheadCost);
  final totalValue = round2(materialsValue + conversion);
  if (totalValue <= 0) return const IssueResult.refused('zero_value');

  // §4.4 settlement: the pair is paid from ONE money account
  // (the desk's pick, else the till's default account) or
  // accrued whole to `salary_payable`. No conversion cost ⇒
  // no settlement line at all, and the event stamps null.
  MoneyAccount? account;
  String? paidFromAccountId;
  if (conversion > 0) {
    if (input.settlement == 'accrue') {
      paidFromAccountId = 'accrue';
    } else {
      MoneyAccount? found;
      for (final a in accounts) {
        if (a.id == input.paidFromAccountId && !a.archived) found = a;
      }
      account = found ?? defaultAccountForMethod(accounts, 'cash');
      if (account == null) return const IssueResult.refused('no_account');
      paidFromAccountId = account.id;
    }
  }

  final entry = buildIssueEntry(order, lines, labourCost, overheadCost, input.settlement, account);
  final event = ProductionEvent(
    kind: 'issue',
    qty: 0,
    lines: [
      for (final l in lines)
        ProductionEventLine(productId: l.productId, name: l.name, qty: l.qty, unitCost: l.unitCost, value: l.value),
    ],
    labourCost: labourCost,
    overheadCost: overheadCost,
    paidFromAccountId: paidFromAccountId,
    value: totalValue,
    entryId: entry.id,
    dayOffset: 0,
    ts: ts ?? DateTime.now().toUtc().toIso8601String(),
  );
  return IssueResult.ok(PreparedIssue(
      lines: lines, materialsValue: materialsValue, labourCost: labourCost,
      overheadCost: overheadCost, entry: entry, paidFromAccountId: paidFromAccountId, event: event));
}

/// The issue entry (§4.2), through the real `makeEntry` guard:
///
///   Dr  wip            (ref: orderId)              M + L + H
///       Cr  inventory | inventory_raw (per component
///           class, ref: componentProductId)        M
///       Cr  cash|wallet  (ref: accountId)          L + H  (paid)
///       Cr  salary_payable                         L + H  (accrued)
JournalEntry buildIssueEntry(
  ProductionOrder order,
  List<ValuedIssueLine> lines,
  double labourCost,
  double overheadCost,
  String settlement,
  MoneyAccount? account,
) {
  final materials = round2(lines.fold(0.0, (a, l) => a + l.value));
  final conversion = round2(labourCost + overheadCost);
  final total = round2(materials + conversion);
  return makeEntry(
    'Production issue — ${order.number ?? order.id} · ${order.outputName}',
    'production_issue',
    order.id,
    [
      JournalLine(account: 'wip', debit: total, ref: order.id),
      for (final l in lines)
        JournalLine(account: inventoryAccountForClass(l.stockClass), credit: l.value, ref: l.productId),
      if (conversion > 0)
        if (settlement == 'accrue')
          JournalLine(account: 'salary_payable', credit: conversion)
        else
          JournalLine(
              account: account != null ? glForAccount(account) : 'cash',
              credit: conversion,
              ref: account?.id),
    ],
  );
}

/* ---------------- completion & scrap: cumulative absorption (§4.2) ---------------- */

double _absorbShare(double poolBefore, double plannedRemaining, double qty, bool final_) {
  if (final_) return poolBefore;
  final d = plannedRemaining > qty ? plannedRemaining : qty;
  final share = round2(poolBefore * qty / d);
  return share < poolBefore ? share : poolBefore;
}

class AbsorbResult {
  final double? value;
  final double? unitCost;
  final String? problem; // AbsorbProblem code
  const AbsorbResult.ok(this.value, [this.unitCost]) : problem = null;
  const AbsorbResult.refused(this.problem) : value = null, unitCost = null;
}

/// The value a completion absorbs, and the unit cost the
/// finished goods take onto the shelf. A completion is FINAL
/// when it reaches the plan (producedBefore + qty >= planned)
/// or the desk flags it final — a final completion absorbs the
/// ENTIRE remaining pool (§4.2). Over-production is simply a
/// final completion.
AbsorbResult completionAbsorb(ProductionOrder order, double qty, bool final_) {
  if (order.status != 'open') return const AbsorbResult.refused('not_open');
  if (!(qty > 0)) return const AbsorbResult.refused('bad_qty');
  final poolBefore = poolOf(order);
  if (poolBefore <= 0) return const AbsorbResult.refused('empty_pool');
  final producedBefore = producedQty(order);
  final isFinal = final_ || producedBefore + qty >= order.plannedQty;
  final remaining = order.plannedQty - producedBefore;
  final value = _absorbShare(poolBefore, remaining > 0 ? remaining : 0, qty, isFinal);
  if (value <= 0) return const AbsorbResult.refused('zero_value');
  return AbsorbResult.ok(value, round2(value / qty));
}

/// The completion entry: finished goods land at the absorbed
/// value — Dr `inventory` / Cr `wip`, both legs ref'd to the
/// order.
JournalEntry buildCompletionEntry(ProductionOrder order, double qty, double value) {
  return makeEntry(
    'Production completion — ${order.number ?? order.id} · ${order.outputName} (${fmtQty(qty)} units)',
    'production_complete',
    order.id,
    [
      JournalLine(account: 'inventory', debit: value, ref: order.id),
      JournalLine(account: 'wip', credit: value, ref: order.id),
    ],
  );
}

/// The value a scrap event writes off: the same absorption
/// share a completion of that many units would take, never
/// exceeding the pool.
AbsorbResult scrapAbsorb(ProductionOrder order, double qty) {
  if (order.status != 'open') return const AbsorbResult.refused('not_open');
  if (!(qty > 0)) return const AbsorbResult.refused('bad_qty');
  final poolBefore = poolOf(order);
  if (poolBefore <= 0) return const AbsorbResult.refused('empty_pool');
  final remaining = order.plannedQty - producedQty(order);
  final value = _absorbShare(poolBefore, remaining > 0 ? remaining : 0, qty, false);
  if (value <= 0) return const AbsorbResult.refused('zero_value');
  return AbsorbResult.ok(value);
}

/// The write-off entry, shared by scrap events and the close
/// order's closeout residual — both post as refType
/// "production_scrap" (§6.4): Dr `inventory_loss` / Cr `wip`
/// (ref: the order).
JournalEntry buildScrapEntry(ProductionOrder order, double qty, double value, String kind) {
  final memo = kind == 'closeout'
      ? 'Production close-out — ${order.number ?? order.id} · ${order.outputName} (residual WIP written off)'
      : 'Production scrap — ${order.number ?? order.id} · ${order.outputName} (${fmtQty(qty)} units)';
  return makeEntry(memo, 'production_scrap', order.id, [
    JournalLine(account: 'inventory_loss', debit: value),
    JournalLine(account: 'wip', credit: value, ref: order.id),
  ]);
}
