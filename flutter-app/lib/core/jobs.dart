/// Dukaan AI — Phase C · C5: the job / work-order tracker
/// (Dart port of web/lib/jobs.ts, design ERP-PHASE-C-DESIGN.md
/// §5). Pure derivations, the stage lifecycle, and EVERY journal
/// composition of the job surface.
///
/// THE MODEL (§5.1/§5.3): a job's material events are its
/// subledger — append-only per-product records, each written
/// inside its posting batch and citing the ONE journal entry
/// that posted it. Materials consumed by a job POST, because
/// stock physically leaves and invariant 4 has no services
/// exception:
///
///   issue:  Dr cogs (ref: job) / Cr inventory | inventory_raw
///           (per component class, ref: product)
///   return: the exact mirror (refTypes job_material /
///           job_material_return)
///
/// ADVANCES (§5.3 + owner Q2 — POOLED): a job advance is an
/// ordinary customer repayment wearing a job-citing note
/// (`advanceNoteFor`). It rides the EXISTING repayment
/// machinery — this module composes no repayment entry and no
/// job field stores money.
///
/// PROFIT (§5.5) is a report, derived here once: revenue from
/// the POSTED bills citing the job, materials from the event
/// log, the bill lines' own COGS from their cost snapshots,
/// labour the job's declared figure.
import 'ledger.dart' show makeEntry, roundPaisa;
import 'stock.dart' show qtyAtWarehouse;
import 'transfers.dart' show inventoryAccountForClass;
import 'types.dart';

double round2(double n) => roundPaisa(n);
double _round3(double n) => ((n + 2.220446049250313e-16) * 1000).round() / 1000;

/* ---------------- stages (§5.2) ---------------- */

/// The default workshop stages, used when the owner has not
/// set a list. Stage names are shop data — these defaults are
/// data too (an absent settings list), never dictionary
/// strings.
const List<String> defaultJobStages = ['Received', 'In Progress', 'Ready', 'Delivered'];

/// The shop's effective stage list: the owner's settings when
/// they name at least one stage, else the defaults. Blank
/// entries are dropped and duplicates collapse (first wins).
List<String> effectiveJobStages(ShopSettingsView? settings) {
  final raw = settings?.jobStages ?? const <String>[];
  final seen = <String>{};
  final out = <String>[];
  for (final s in raw) {
    final name = s.trim();
    if (name.isNotEmpty && seen.add(name)) out.add(name);
  }
  return out.isNotEmpty ? out : [...defaultJobStages];
}

/// Where the job's stage sits in the effective list (−1 when
/// the owner renamed the list after the job took its stage —
/// the job keeps the name it carries, §5.2).
int jobStageIndex(Job job, List<String> stages) => stages.indexOf(job.stage);

/// The lifecycle label over the stage position (§5.2):
/// `delivered` and `cancelled` are terminal and sticky.
/// Otherwise the FIRST stage reads `open`, the LAST stage reads
/// `ready`, and anything between reads `in_progress`.
String deriveJobStatus(Job job, List<String> stages) {
  if (job.status == 'delivered' || job.status == 'cancelled') {
    return job.status;
  }
  final idx = jobStageIndex(job, stages);
  if (idx == stages.length - 1 && stages.length > 1) return 'ready';
  if (idx <= 0) {
    // Stage unknown to the list (renamed away) but the job has
    // visibly started — it is in progress, not newly received.
    if (idx < 0 && (job.materialEvents.isNotEmpty || job.status != 'open')) {
      return 'in_progress';
    }
    return 'open';
  }
  return 'in_progress';
}

/* ---------------- material derivations (§5.3) ---------------- */

/// Net quantity of one product consumed by the job: issued −
/// returned. A return may never exceed this.
double jobMaterialNetQty(Job job, String productId) {
  var net = 0.0;
  for (final e in job.materialEvents) {
    if (e.productId != productId) continue;
    net += e.kind == 'issue' ? e.qty : -e.qty;
  }
  return _round3(net);
}

/// Σ issue values over the job's material log.
double jobMaterialsIssuedValue(Job job) => round2(job.materialEvents
    .where((e) => e.kind == 'issue')
    .fold(0.0, (a, e) => a + e.value));

/// Σ return values over the job's material log.
double jobMaterialsReturnedValue(Job job) => round2(job.materialEvents
    .where((e) => e.kind == 'return')
    .fold(0.0, (a, e) => a + e.value));

/// Materials cost of the job (§5.5): Σ issues − Σ returns, each
/// valued at its own event's shelf-cost snapshot.
double jobMaterialsCost(Job job) =>
    round2(jobMaterialsIssuedValue(job) - jobMaterialsReturnedValue(job));

/* ---------------- advances (§5.3): the pooled repayment citation ---------------- */

/// The note a job advance carries on its repayment row — the
/// ONLY citation (by design: no job field stores money).
String advanceNoteFor(Job job) => 'Advance — Job ${job.number}';

/// The repayment rows recorded as advances for this job.
List<CreditEntry> jobAdvanceRows(Job job, List<CreditEntry> credits) {
  final note = advanceNoteFor(job);
  return credits.where((c) => c.kind == 'repayment' && c.note == note).toList();
}

/// Σ of the advances recorded against this job.
double jobAdvanceTotal(Job job, List<CreditEntry> credits) =>
    round2(jobAdvanceRows(job, credits).fold(0.0, (a, c) => a + c.amount));

/* ---------------- revenue & profit (§5.4/§5.5) ---------------- */

const Set<String> _postedBillStatuses = {'paid', 'partially_returned', 'returned'};

/// The posted bills citing this job (the §5.4 conversion
/// citation), oldest first.
List<Bill> jobBills(Job job, List<Bill> bills) {
  final out = bills
      .where((b) =>
          b.sourceType == 'job' && b.sourceId == job.id && _postedBillStatuses.contains(b.status))
      .toList();
  out.sort((a, b) => a.ts.compareTo(b.ts));
  return out;
}

/// jobRevenue (§5.5): Σ totals of the posted citing bills. A
/// job billed off-system reports 0 — the truth the records hold.
double jobRevenue(Job job, List<Bill> bills) =>
    round2(jobBills(job, bills).fold(0.0, (a, b) => a + b.total));

/// Σ COGS of the citing bills' OWN lines (their unitCost
/// snapshots × qty) — separate from job materials, which
/// already left the shelf through §5.3.
double jobBillCogs(Job job, List<Bill> bills) => round2(jobBills(job, bills).fold(
    0.0, (a, b) => a + b.items.fold(0.0, (x, it) => x + round2(it.unitCost * it.qty))));

class JobProfitFigures {
  final double revenue;
  final double materials;
  final double billCogs;
  final double labour;
  final double profit;
  const JobProfitFigures({required this.revenue, required this.materials,
    required this.billCogs, required this.labour, required this.profit});
  Map<String, dynamic> toMap() => {
        'revenue': revenue, 'materials': materials, 'billCogs': billCogs,
        'labour': labour, 'profit': profit,
      };
}

/// jobProfit (§5.5): revenue − materials − declared labour −
/// the citing bills' own line COGS.
JobProfitFigures jobProfitFigures(Job job, List<Bill> bills) {
  final revenue = jobRevenue(job, bills);
  final materials = jobMaterialsCost(job);
  final billCogs = jobBillCogs(job, bills);
  final labour = round2(job.labourCost);
  return JobProfitFigures(
    revenue: revenue,
    materials: materials,
    billCogs: billCogs,
    labour: labour,
    profit: round2(revenue - materials - billCogs - labour),
  );
}

/* ---------------- material events: validation + valuation (§5.3) ---------------- */

class ValuedMaterialLine {
  final String productId;
  final String name;
  final double qty;
  final double unitCost; // the shelf cost in force at the event
  final double value; // round2(qty × unitCost)
  final String? stockClass;
  const ValuedMaterialLine({required this.productId, required this.name, required this.qty,
    required this.unitCost, required this.value, this.stockClass});
}

class PreparedMaterialEvent {
  final List<ValuedMaterialLine> lines;
  final double value;
  final JournalEntry entry;
  final List<JobMaterialEvent> events;
  const PreparedMaterialEvent({required this.lines, required this.value,
    required this.entry, required this.events});
}

/// The result of [prepareMaterialEvent]: exactly one of
/// [prepared] / [problem] is non-null.
class MaterialResult {
  final PreparedMaterialEvent? prepared;
  final String? problem; // MaterialProblem code
  final String? productId;
  const MaterialResult.ok(this.prepared) : problem = null, productId = null;
  const MaterialResult.refused(this.problem, [this.productId]) : prepared = null;
}

/// Validate, value and compose a material issue/return BEFORE
/// anything is written (B's pre-composition refusal discipline).
///
/// Lines are valued at the products' CURRENT shelf `costPrice`.
/// An issue validates each product against the JOB warehouse's
/// row through the §1.3 resolution rule. A return validates
/// against the job's own net-issued quantity per product.
MaterialResult prepareMaterialEvent(
  Job job,
  List<Product> products,
  List<StockLevel> levels,
  List<Warehouse> warehouses,
  String kind, // "issue" | "return"
  List<({String productId, double qty})> picks, {
  String? ts,
}) {
  if (job.status == 'delivered' || job.status == 'cancelled') {
    return const MaterialResult.refused('not_active');
  }
  if (picks.isEmpty) return const MaterialResult.refused('empty_lines');

  final byId = {for (final p in products) p.id: p};
  final merged = <String, double>{};
  for (final pick in picks) {
    if (!byId.containsKey(pick.productId)) {
      return MaterialResult.refused('unknown_product', pick.productId);
    }
    if (!pick.qty.isFinite || pick.qty <= 0) {
      return MaterialResult.refused('bad_qty', pick.productId);
    }
    merged[pick.productId] = (merged[pick.productId] ?? 0) + pick.qty;
  }
  if (merged.isEmpty) return const MaterialResult.refused('empty_lines');

  final lines = <ValuedMaterialLine>[];
  var value = 0.0;
  for (final e in merged.entries) {
    final p = byId[e.key]!;
    if (kind == 'issue') {
      final onHand = qtyAtWarehouse(p, levels, warehouses, job.warehouseId);
      if (e.value > onHand + 1e-9) return MaterialResult.refused('insufficient', e.key);
    } else {
      final held = jobMaterialNetQty(job, e.key);
      if (e.value > held + 1e-9) return MaterialResult.refused('over_return', e.key);
    }
    final lineValue = round2(e.value * p.costPrice);
    lines.add(ValuedMaterialLine(
        productId: e.key, name: p.name, qty: e.value, unitCost: p.costPrice,
        value: lineValue, stockClass: p.stockClass));
    value += lineValue;
  }
  value = round2(value);
  if (value <= 0) return const MaterialResult.refused('zero_value');

  final entry = buildMaterialEntry(job, kind, lines);
  final stamp = ts ?? DateTime.now().toUtc().toIso8601String();
  final events = [
    for (final l in lines)
      JobMaterialEvent(
        kind: kind, productId: l.productId, name: l.name, qty: l.qty,
        unitCost: l.unitCost, value: l.value, entryId: entry.id, dayOffset: 0, ts: stamp,
      ),
  ];
  return MaterialResult.ok(
      PreparedMaterialEvent(lines: lines, value: value, entry: entry, events: events));
}

/// The material entry (§5.3), through the real `makeEntry`
/// guard:
///
///   issue:  Dr  cogs        (ref: jobId)                    V
///               Cr  inventory | inventory_raw (per class,
///                   ref: productId)                       V (per line)
///   return: Dr  inventory | inventory_raw (per class)      V
///               Cr  cogs      (ref: jobId)                    V
JournalEntry buildMaterialEntry(Job job, String kind, List<ValuedMaterialLine> lines) {
  final total = round2(lines.fold(0.0, (a, l) => a + l.value));
  final inventoryLegs = [
    for (final l in lines)
      JournalLine(
        account: inventoryAccountForClass(l.stockClass),
        debit: kind == 'return' ? l.value : 0,
        credit: kind == 'issue' ? l.value : 0,
        ref: l.productId,
      ),
  ];
  final cogsLeg = JournalLine(
    account: 'cogs',
    debit: kind == 'issue' ? total : 0,
    credit: kind == 'return' ? total : 0,
    ref: job.id,
  );
  return makeEntry(
    kind == 'issue'
        ? 'Job materials — ${job.number} · ${job.title}'
        : 'Job materials returned — ${job.number} · ${job.title}',
    kind == 'issue' ? 'job_material' : 'job_material_return',
    job.id,
    kind == 'issue' ? [cogsLeg, ...inventoryLegs] : [...inventoryLegs, cogsLeg],
  );
}
