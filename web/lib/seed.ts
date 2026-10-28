/** Dukaan AI — seed data loader (bundled demo fallback). */
import type {
  AttendanceMonth,
  CreditEntry,
  Customer,
  DeliveryChallan,
  Employee,
  Expense,
  JournalEntry,
  JournalLine,
  Loan,
  MoneyAccount,
  PayrollRun,
  Product,
  Purchase,
  Quotation,
  Sale,
  SaleOrder,
  ShopSettings,
  StockLevel,
  StockTransfer,
  Bom,
  ProductionOrder,
  Job,
  Supplier,
  SupplierPayment,
  TaxSlab,
  Warehouse,
} from "./types";
import { buildLoyaltyEarnEntry, resolveLoyaltySettings } from "./loyalty";
import { attendanceDocId, buildRunLines, payrollRunTotals } from "./payroll";
import raw from "./seed-data.json";
import { accountBalance, entryBalances, totalOutstandingCredit } from "./ledger";
import { DEFAULT_WAREHOUSE_ID, makeLevel } from "./stock";
import {
  PKT_OFFSET_MS,
  addDaysISO,
  startOfDayPktInstant,
  todayPktISO,
} from "./periods";

interface SeedFile {
  products: Product[];
  sales: Sale[];
  generatedAt: string;
  note: string;
  customers: Customer[];
  suppliers: Supplier[];
  purchases: Purchase[];
  supplierPayments: SupplierPayment[];
  expenses: Expense[];
  credits: CreditEntry[];
  settings: ShopSettings;
}

const data = raw as unknown as SeedFile;

/**
 * Re-base a bundled row's timestamp onto the calendar day its
 * `dayOffset` denotes TODAY, preserving its time-of-day.
 *
 * Why: the bundled file's `ts` values are frozen at the day the
 * seed file was GENERATED, while `dayOffset` is relative to the
 * day the shop is SEEDED — and the seed journal (below) is built
 * from `dayOffset` alone. On any seed day after generation day the
 * two disagreed: an expense showed its generation-day date in the
 * register but the journal's (offset) date in the cash book, and a
 * counter sale landed in a different "today" bucket in the
 * dayOffset-based screens than in the ts-based reports. Re-basing
 * makes `ts` and `dayOffset` name the same day by construction —
 * which is what the `Sale` type comment always claimed. The seed
 * JOURNAL is untouched: it never read these `ts` values.
 */
function rebaseTs(ts: string, dayOffset: number): string {
  const src = new Date(ts);
  if (Number.isNaN(src.getTime())) return ts;
  // The target is a PKT calendar day and the preserved time-of-day is
  // the source's PKT wall time — computed with the periods.ts PKT
  // primitives, never local-time getters. (The earlier local-time
  // version named the wrong day whenever the runtime was not in PKT
  // and the PKT date had rolled past the local one — e.g. the harness
  // or CI on a UTC host between 00:00 and 05:00 PKT.)
  const targetDay = addDaysISO(todayPktISO(), -dayOffset);
  const dayStartMs = Date.parse(startOfDayPktInstant(targetDay));
  const pkt = new Date(src.getTime() + PKT_OFFSET_MS);
  const todMs =
    ((pkt.getUTCHours() * 60 + pkt.getUTCMinutes()) * 60 + pkt.getUTCSeconds()) *
      1000 +
    pkt.getUTCMilliseconds();
  return new Date(dayStartMs + todMs).toISOString();
}

export function getSeedProducts(): Product[] {
  return data.products.map((p) => ({ ...p, keywords: [...p.keywords] }));
}

export function getSeedSales(): Sale[] {
  return data.sales.map((s) => ({ ...s, ts: rebaseTs(s.ts, s.dayOffset) }));
}

export function getSeedCustomers(): Customer[] {
  return data.customers.map((c) => ({ ...c }));
}

export function getSeedSuppliers(): Supplier[] {
  return data.suppliers.map((s) => ({ ...s }));
}

export function getSeedPurchases(): Purchase[] {
  return data.purchases.map((p) => ({
    ...p,
    ts: rebaseTs(p.ts, p.dayOffset),
    items: p.items.map((i) => ({ ...i })),
  }));
}

export function getSeedSupplierPayments(): SupplierPayment[] {
  return data.supplierPayments.map((p) => ({ ...p, ts: rebaseTs(p.ts, p.dayOffset) }));
}

export function getSeedExpenses(): Expense[] {
  return data.expenses.map((e) => ({ ...e, ts: rebaseTs(e.ts, e.dayOffset) }));
}

export function getSeedCredits(): CreditEntry[] {
  return data.credits.map((c) => ({ ...c, ts: rebaseTs(c.ts, c.dayOffset) }));
}

/* ------------------------------------------------------------------ */
/* Phase B · B1 (design §10): a small DEMO-only discoverability set  */
/* for the document chain — one issued quotation and one open sale   */
/* order. These documents are NON-POSTING by the cardinal rule       */
/* (§2.2): they write no journal entry, move no stock and touch no   */
/* subledger, so the frozen seed journal and its SHA are untouched   */
/* by construction. Production seeding never writes them — a real    */
/* shop's `quotations` / `saleOrders` collections simply start       */
/* empty (StoreProvider.seedNamespace does not push them).           */
/* ------------------------------------------------------------------ */

function docDayISO(dayOffsetFromToday: number): string {
  // The PKT business date `dayOffsetFromToday` days from today (the
  // UTC date of a shifted instant lagged the PKT date in the small
  // hours — same defect class as rebaseTs/dayTs).
  return addDaysISO(todayPktISO(), dayOffsetFromToday);
}

export function getSeedQuotations(
  customers: Customer[],
  products: Product[]
): Quotation[] {
  const customer = customers[0];
  const picked = products.slice(0, 2);
  if (!customer || picked.length === 0) return [];
  const lines = picked.map((p, i) => ({
    productId: p.id,
    name: p.name,
    qty: i === 0 ? 10 : 5,
    unitPrice: p.salePrice,
    total: (i === 0 ? 10 : 5) * p.salePrice,
  }));
  const subtotal = lines.reduce((a, l) => a + l.total, 0);
  return [
    {
      id: "q-demo-1",
      number: "QT-1",
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      lines,
      subtotal,
      discountType: "flat",
      discountValue: 0,
      discountAmount: 0,
      estimatedTax: 0,
      total: subtotal,
      validUntil: docDayISO(14),
      note: "Demo quotation — prices are estimates until billed.",
      status: "issued",
      issuedTs: dayTs(1, 11),
      dayOffset: 1,
      ts: dayTs(1, 11),
    },
  ];
}

export function getSeedSaleOrders(
  customers: Customer[],
  products: Product[]
): SaleOrder[] {
  const customer = customers[1] ?? customers[0];
  const picked = products.slice(2, 4);
  if (!customer || picked.length === 0) return [];
  const lines = picked.map((p, i) => ({
    productId: p.id,
    name: p.name,
    qty: i === 0 ? 20 : 12,
    unitPrice: p.salePrice,
    total: (i === 0 ? 20 : 12) * p.salePrice,
  }));
  const subtotal = lines.reduce((a, l) => a + l.total, 0);
  return [
    {
      id: "so-demo-1",
      number: "SO-1",
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      lines,
      subtotal,
      discountType: "flat",
      discountValue: 0,
      discountAmount: 0,
      estimatedTax: 0,
      total: subtotal,
      source: null,
      expectedDate: docDayISO(3),
      note: "Demo order — converts to a bill from the Sale Orders screen.",
      status: "open",
      dayOffset: 0,
      ts: dayTs(0, 10),
    },
  ];
}

/**
 * Phase B · B2 demo discoverability (design §10): one DISPATCHED
 * challan against the demo order above — a PARTIAL delivery (8 of
 * the order's first line's 20), so the demo shows delivered /
 * remaining quantities and the derived availability reservation.
 * Non-posting like every document: the seed journal is untouched.
 */
export function getSeedDeliveryChallans(
  orders: SaleOrder[]
): DeliveryChallan[] {
  const order = orders[0];
  const first = order?.lines[0];
  if (!order || !first) return [];
  const qty = Math.min(8, first.qty);
  return [
    {
      id: "dc-demo-1",
      number: "DC-1",
      orderId: order.id,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      lines: [
        {
          productId: first.productId,
          name: first.name,
          qty,
          unitPrice: first.unitPrice,
          total: qty * first.unitPrice,
          sourceProductId: first.productId,
        },
      ],
      vehicleNo: "LEF-4821",
      driverName: "Muhammad Aslam",
      note: "Demo challan — goods out on SO-1; bill it from the Delivery Challans screen.",
      status: "dispatched",
      dayOffset: 0,
      ts: dayTs(0, 12),
    },
  ];
}

export function getSeedSettings(): ShopSettings {
  return { ...data.settings, staffEmails: [...(data.settings.staffEmails ?? [])] };
}

/* ------------------------------------------------------------------ */
/* Money accounts (Phase A · A2, design §1.6). The default account    */
/* set is IDENTICAL for fresh seeds and migrated shops, with fixed    */
/* ids so the migration step is idempotent. Historical journal lines  */
/* carry `ref == null` and resolve through `legacyFor`, so creating   */
/* these accounts moves NO balance and needs NO journal entry — the   */
/* seed journal below is deliberately untouched by A2.                */
/* ------------------------------------------------------------------ */

export const SEED_ACCOUNT_IDS = {
  till: "acc-till",
  walletLegacy: "acc-wallet-legacy",
  jazzcash: "acc-jazzcash",
  easypaisa: "acc-easypaisa",
  bank: "acc-bank",
} as const;

export function getSeedAccounts(): MoneyAccount[] {
  const ts = "2025-01-01T00:00:00.000Z";
  return [
    {
      id: SEED_ACCOUNT_IDS.till,
      name: "Main Till",
      kind: "cash",
      method: "cash",
      legacyFor: "cash",
      archived: false,
      sortOrder: 0,
      ts,
    },
    {
      id: SEED_ACCOUNT_IDS.walletLegacy,
      name: "Wallet & Bank",
      kind: "wallet",
      method: null, // catch-all for pre-A2 wallet history
      legacyFor: "wallet",
      archived: false,
      sortOrder: 1,
      ts,
    },
    {
      id: SEED_ACCOUNT_IDS.jazzcash,
      name: "JazzCash",
      kind: "wallet",
      method: "jazzcash",
      legacyFor: null,
      archived: false,
      sortOrder: 2,
      ts,
    },
    {
      id: SEED_ACCOUNT_IDS.easypaisa,
      name: "Easypaisa",
      kind: "wallet",
      method: "easypaisa",
      legacyFor: null,
      archived: false,
      sortOrder: 3,
      ts,
    },
    {
      id: SEED_ACCOUNT_IDS.bank,
      name: "Bank Account",
      kind: "bank",
      method: "bank",
      legacyFor: null,
      archived: false,
      sortOrder: 4,
      ts,
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Warehouses + stock rows (Phase C · C1, design §10.1/§10.3). The   */
/* seed's end-state is the MIGRATED state, seeded directly with     */
/* the flag pre-set: the default warehouse (fixed id `wh-main`,     */
/* §1.2) holding ALL seed stock in complete rows, plus one EMPTY    */
/* "Godown" warehouse as demo discoverability. Rows are             */
/* operational detail — quantities only, no value — so the frozen   */
/* seed journal and its SHA are untouched by construction. The      */
/* production seeder pushes only `wh-main` + the rows (the Godown   */
/* is demo flavour, like the §10 documents of Phase B).             */
/* ------------------------------------------------------------------ */

export const SEED_GODOWN_ID = "wh-godown";

export function getSeedWarehouses(): Warehouse[] {
  const ts = "2025-01-01T00:00:00.000Z";
  return [
    {
      id: DEFAULT_WAREHOUSE_ID,
      name: "Main Warehouse",
      note: "",
      isDefault: true,
      archived: false,
      sortOrder: 0,
      ts,
    },
    {
      id: SEED_GODOWN_ID,
      name: "Godown",
      note: "",
      isDefault: false,
      archived: false,
      sortOrder: 1,
      ts,
    },
  ];
}

/** Complete stock rows for a product set: every product's whole
 *  `stockQty` in the default warehouse (§10.1's end-state). */
export function getSeedStockLevels(products: Product[]): StockLevel[] {
  return products.map((p) => makeLevel(DEFAULT_WAREHOUSE_ID, p.id, p.stockQty));
}

/* ------------------------------------------------------------------ */
/* Stock transfers (Phase C · C2, design §10.3). DEMO-only          */
/* discoverability: ONE draft transfer (Main → Godown, two lines).  */
/* A draft has dispatched NOTHING and received NOTHING — no rows    */
/* moved, no number minted, no journal footprint — so the frozen    */
/* seed journal, its SHA and the §1.3 identity are untouched by     */
/* its presence. The production seeder never pushes this            */
/* collection: a real shop starts with it empty.                    */
/* ------------------------------------------------------------------ */

export function getSeedStockTransfers(products: Product[]): StockTransfer[] {
  const picked = products.slice(0, 2);
  if (picked.length === 0) return [];
  return [
    {
      id: "st-demo-1",
      number: null, // drafts burn no numbers (§6.3)
      fromWarehouseId: DEFAULT_WAREHOUSE_ID,
      toWarehouseId: SEED_GODOWN_ID,
      lines: picked.map((p, i) => ({
        productId: p.id,
        name: p.name,
        qtySent: i === 0 ? 12 : 6,
        qtyReceived: 0,
      })),
      note: "Weekly godown restock — not yet dispatched.",
      status: "draft",
      dayOffset: 1,
      ts: "2025-01-02T09:30:00.000Z",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* BOM recipes (Phase C · C3, design §10.3). DEMO-only              */
/* discoverability: ONE recipe — the shop's bulk rice (p25, held   */
/* as a raw material in the demo) repacked into 1 kg retail packs  */
/* (p02): one 5 kg bulk bag + Rs 100 labour + Rs 50 overhead per   */
/* batch of 5 packs. A BOM is a recipe document — it posts         */
/* NOTHING, holds no stock and moves no rows — so the frozen seed  */
/* journal, its SHA and every seed identity are untouched by its   */
/* presence. The production seeder never pushes this collection:   */
/* a real shop starts with it empty.                               */
/* ------------------------------------------------------------------ */

/** The seed product the DEMO holds as a raw material (the bulk
 *  rice the demo BOM consumes). Demo state only: `getSeedProducts`
 *  itself stays class-free, so a fresh production seed carries NO
 *  raw products and its journal is the frozen one. */
export const SEED_DEMO_RAW_PRODUCT_ID = "p25";

export function getSeedBoms(products: Product[]): Bom[] {
  const output = products.find((p) => p.id === "p02");
  const bulk = products.find((p) => p.id === SEED_DEMO_RAW_PRODUCT_ID);
  if (!output || !bulk) return [];
  return [
    {
      id: "bom-demo-1",
      outputProductId: output.id,
      outputName: output.name,
      outputQty: 5,
      version: 1,
      lines: [{ productId: bulk.id, name: bulk.name, qty: 1 }],
      labourCost: 100,
      overheadCost: 50,
      active: true,
      note: "Repack bulk rice into 1 kg retail packs.",
      ts: "2025-01-02T10:00:00.000Z",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Production orders (Phase C · C4, design §10.3). DEMO-only        */
/* discoverability: ONE draft order against the demo BOM — two      */
/* batches' worth (10 packs) planned at the default warehouse. A    */
/* draft has NO events: nothing was issued, nothing posted, no      */
/* number minted — so the frozen seed journal, its SHA and every    */
/* seed identity are untouched by its presence. The order's         */
/* snapshot is composed from the demo BOM here (the same copy       */
/* `snapshotOfBom` makes in lib/production — seed.ts stays           */
/* dependency-light, so the five fields are copied literally).      */
/* The production seeder never pushes this collection: a real       */
/* shop starts with it empty.                                       */
/* ------------------------------------------------------------------ */

export function getSeedProductionOrders(
  products: Product[],
  boms: Bom[]
): ProductionOrder[] {
  const bom = boms.find((b) => b.active) ?? boms[0];
  if (!bom) return [];
  const output = products.find((p) => p.id === bom.outputProductId);
  if (!output) return [];
  return [
    {
      id: "prd-demo-1",
      number: null, // drafts burn no numbers (§6.3)
      bomId: bom.id,
      bomVersion: bom.version,
      bomSnapshot: {
        outputQty: bom.outputQty,
        lines: bom.lines.map((l) => ({ ...l })),
        labourCost: bom.labourCost,
        overheadCost: bom.overheadCost,
      },
      outputProductId: output.id,
      outputName: output.name,
      warehouseId: DEFAULT_WAREHOUSE_ID,
      plannedQty: bom.outputQty * 2,
      events: [],
      note: "First repack run — not yet started.",
      status: "draft",
      dayOffset: 1,
      ts: "2025-01-02T10:30:00.000Z",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Jobs (Phase C · C5, design §10.3). DEMO-only discoverability:   */
/* ONE open job at the FIRST default stage for the seed's first    */
/* customer — a wedding-cards order at the default warehouse,      */
/* due in a few days. A job card is a document: it has NO material */
/* events and NO advance, so nothing posted, no rows moved, and    */
/* the frozen seed journal, its SHA and every seed identity are    */
/* untouched by its presence. The number is real (jobs are born    */
/* numbered, §5.1) but a number on a card posts nothing. The       */
/* production seeder never pushes this collection: a real shop     */
/* starts with it empty.                                           */
/* ------------------------------------------------------------------ */

export function getSeedJobs(customers: Customer[]): Job[] {
  const customer = customers[0];
  if (!customer) return [];
  return [
    {
      id: "job-demo-1",
      number: "JB-1", // born numbered (§5.1) — the customer's slip
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      title: "Wedding cards × 500",
      description: "Cream card, gold foil names — sample approved by the family.",
      stage: "Received", // the first default stage (§5.2)
      status: "open",
      dueDateISO: "2025-01-09",
      warehouseId: DEFAULT_WAREHOUSE_ID,
      materialEvents: [],
      labourCost: 0,
      note: "",
      dayOffset: 1,
      ts: "2025-01-02T11:00:00.000Z",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Employees & attendance (Phase D · D1, design §10.3). DEMO-only  */
/* discoverability: TWO sample employees — one monthly-basis      */
/* salesman, one daily-basis helper — with the CURRENT month's    */
/* register marked up to today (Asia/Karachi). A directory doc   */
/* and an attendance doc assert NO money fact: neither collection */
/* posts anything, ever (§1.2/§1.3), so the frozen seed journal, */
/* its SHA and every seed identity are untouched by their        */
/* presence. The production seeder never pushes these            */
/* collections: a real shop's HR collections are born empty      */
/* (§10.1), and the draft-run / sample-loan demo docs arrive     */
/* with their own increments (D2/D3).                            */
/* ------------------------------------------------------------------ */

export function getSeedEmployees(): Employee[] {
  return [
    {
      id: "emp-demo-1",
      name: "Muhammad Imran",
      phone: "0300-1112233",
      designation: "Salesman",
      linkedUserEmail: null,
      joinDateISO: "2024-03-01",
      payBasis: "monthly",
      baseAmount: 45000,
      allowances: [{ label: "Transport", amount: 3000 }],
      paidLeaveDays: 2,
      active: true,
      note: "",
      ts: "2025-01-02T09:00:00.000Z",
    },
    {
      id: "emp-demo-2",
      name: "Rashid Ali",
      phone: "0321-4455667",
      designation: "Helper",
      linkedUserEmail: null,
      joinDateISO: "2025-06-15",
      payBasis: "daily",
      baseAmount: 1200,
      allowances: [],
      paidLeaveDays: 0,
      active: true,
      note: "",
      ts: "2025-01-02T09:05:00.000Z",
    },
  ];
}

export function getSeedAttendance(employees: Employee[]): AttendanceMonth[] {
  // The register month is the CURRENT month in Asia/Karachi (the
  // shop's business timezone), marked for every elapsed day —
  // the demo always opens on a register that looks lived-in,
  // whatever day it is seeded on.
  const pkt = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const year = pkt.getUTCFullYear();
  const mon = pkt.getUTCMonth() + 1;
  const today = pkt.getUTCDate();
  const month = `${year}-${String(mon).padStart(2, "0")}`;
  const docs: AttendanceMonth[] = [];
  for (const emp of employees) {
    const days: AttendanceMonth["days"] = {};
    for (let d = 1; d <= today; d++) {
      const weekday = new Date(Date.UTC(year, mon - 1, d)).getUTCDay(); // 5 = Friday
      let mark: AttendanceMonth["days"][string] = "present";
      if (weekday === 5) mark = "off"; // the weekly off
      else if (emp.payBasis === "monthly" && d === 5) mark = "leave";
      else if (emp.payBasis === "monthly" && d === 8) mark = "absent";
      else if (emp.payBasis === "daily" && d === 6) mark = "half";
      else if (emp.payBasis === "daily" && d === 9) mark = "absent";
      days[String(d)] = mark;
    }
    docs.push({
      id: attendanceDocId(emp.id, month),
      employeeId: emp.id,
      month,
      days,
      ts: "2025-01-02T09:10:00.000Z",
    });
  }
  return docs;
}

/* ------------------------------------------------------------------ */
/* Draft payroll run (Phase D · D2, design §10.3). DEMO-only: one  */
/* DRAFT run for the CURRENT (PKT) month, composed from the two    */
/* sample employees + their register by the REAL composer          */
/* (`buildRunLines`) — the desk opens Payroll and sees a run       */
/* ready to review and finalise. A draft posts NOTHING: no         */
/* number, no accrual entry, no payments — zero journal            */
/* footprint, so the frozen seed identities stand untouched.       */
/* ------------------------------------------------------------------ */

export function getSeedPayrollRunDraft(
  employees: Employee[],
  attendance: AttendanceMonth[]
): PayrollRun {
  const pkt = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const month = `${pkt.getUTCFullYear()}-${String(pkt.getUTCMonth() + 1).padStart(2, "0")}`;
  const lines = buildRunLines(employees, attendance, month);
  return {
    id: "run-demo-draft",
    number: null,
    month,
    lines,
    totals: payrollRunTotals(lines),
    payments: [],
    accrualEntryId: null,
    status: "draft",
    note: "",
    dayOffset: 0,
    ts: "2025-01-02T09:15:00.000Z",
  };
}

/* ------------------------------------------------------------------ */
/* Sample loan (Phase D · D3, design §10.3). DEMO-only: ONE         */
/* charge-free loan in `active` state with NO events — a register  */
/* discoverability aid. Its outstanding derives as the full        */
/* principal (unpaid, nothing behind it), which the demo tolerates */
/* because demo journals are illustrative; in cloud shops a loan  */
/* is born WITH its drawdown event in one batch (§3.4), so a real  */
/* loan can never exist journalless. The doc posts nothing and     */
/* cites no journal entry — zero footprint, frozen identities      */
/* untouched. The production seeder never pushes this collection.  */
/* ------------------------------------------------------------------ */

export function getSeedLoans(): Loan[] {
  return [
    {
      id: "loan-demo-1",
      number: "LN-1",
      direction: "payable",
      partyName: "Malik Traders",
      partyId: "sup-1", // the seed supplier — a dealer's financing (§3.5 link)
      principal: 150000,
      chargeType: "none",
      chargeRate: 0,
      chargeAmount: 0,
      startDateISO: "2026-09-01",
      instalmentCount: 10,
      instalmentEvery: "month",
      firstDueISO: "2026-10-01",
      events: [
        {
          kind: "drawdown",
          amount: 150000,
          principalPart: 150000,
          chargePart: 0,
          accountId: "acc-bank",
          entryId: "j-seed-loan-drawdown-1",
          dayOffset: 0,
          ts: "2026-09-01T10:00:00.000Z",
        },
      ],
      status: "active",
      note: "",
      dayOffset: 0,
      ts: "2025-01-02T09:20:00.000Z",
    },
  ];
}

export const SEED_GENERATED_AT = data.generatedAt;

/* ------------------------------------------------------------------ */
/* Tax slabs (Phase A · A4, design §2.5). The seed ships exactly ONE  */
/* slab — INACTIVE and NOT a default — so the tax engine is          */
/* discoverable in demo without ever charging tax: no product is     */
/* assigned to it and both shop defaults stay null, so every seed    */
/* total and the frozen journal identities are untouched. Existing   */
/* shops migrating via `phaseA.taxV1` get NO slab at all (the        */
/* owner's own configuration is the starting point there).           */
/* ------------------------------------------------------------------ */

export const SEED_SAMPLE_SLAB_ID = "tax-sample-gst";

export function getSeedTaxSlabs(): TaxSlab[] {
  return [
    {
      id: SEED_SAMPLE_SLAB_ID,
      name: "GST",
      kind: "percent",
      rate: 17,
      appliesTo: "both",
      inclusive: false,
      isDefault: false,
      active: false,
      ts: "2025-01-01T00:00:00.000Z",
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Journal seeds. The demo history predates the journal, so it is      */
/* summarised: ONE aggregated entry per sales-day (Dr Cash / Dr COGS / */
/* Cr Sales revenue / Cr Inventory, computed from the seed sales and   */
/* product costs) plus one entry per seeded purchase / payment /       */
/* expense / credit event. Real activity after go-live posts one       */
/* entry per transaction.                                              */
/*                                                                     */
/* F-12: the history alone leaves the balance sheet fictional (it     */
/* never funded the opening stock, and "cash" is just accumulated     */
/* takings). So the seed closes with ONE go-live OPENING entry that   */
/* trues Inventory up to the physical shelf value and Cash to the     */
/* stated opening till (SEED_OPENING_TILL), with the whole difference */
/* against Owner Capital — exactly how a real set of books opens.     */
/* After it: journal Inventory == Σ shelf stock × cost, journal Cash  */
/* == the till the owner actually starts with, trial balance == 0.   */
/* ------------------------------------------------------------------ */

/** The till cash the shop opens with at go-live (PKR). */
export const SEED_OPENING_TILL = 50000;

function dayTs(dayOffset: number, hour = 13): string {
  // PKT calendar day `dayOffset` days before today, at PKT wall time
  // hour:05 — same PKT discipline as rebaseTs (local-time arithmetic
  // named the wrong day on any non-PKT runtime near the PKT rollover).
  const targetDay = addDaysISO(todayPktISO(), -dayOffset);
  const dayStartMs = Date.parse(startOfDayPktInstant(targetDay));
  return new Date(dayStartMs + (hour * 60 + 5) * 60000).toISOString();
}

function entry(
  id: string,
  memo: string,
  refType: JournalEntry["refType"],
  refId: string | null,
  dayOffset: number,
  lines: JournalLine[]
): JournalEntry {
  return { id, memo, refType, refId, dayOffset, ts: dayTs(dayOffset), lines };
}

export function getSeedJournal(
  products: Product[],
  sales: Sale[],
  purchases: Purchase[],
  payments: SupplierPayment[],
  expenses: Expense[],
  credits: CreditEntry[],
  loyaltyEntries: JournalEntry[] = []
): JournalEntry[] {
  const out: JournalEntry[] = [];
  const costOf = new Map(products.map((p) => [p.id, p.costPrice]));

  // Aggregated daily sales summaries.
  const days = [...new Set(sales.map((s) => s.dayOffset))].sort((a, b) => b - a);
  for (const d of days) {
    const rows = sales.filter((s) => s.dayOffset === d);
    const revenue = rows.reduce((a, s) => a + s.total, 0);
    const cogs = rows.reduce((a, s) => a + s.qty * (costOf.get(s.productId) ?? 0), 0);
    if (revenue <= 0) continue;
    out.push(
      entry(`j-seed-sale-${d}`, "Daily sales summary (seed history)", "seed", null, d, [
        { account: "cash", debit: revenue, credit: 0 },
        { account: "cogs", debit: cogs, credit: 0 },
        { account: "sales_revenue", debit: 0, credit: revenue },
        { account: "inventory", debit: 0, credit: cogs },
      ])
    );
  }

  for (const p of purchases) {
    out.push(
      entry(`j-seed-pur-${p.id}`, `Purchase on credit (seed) — ${p.note || p.id}`, "seed", p.id, p.dayOffset, [
        { account: "purchases", debit: p.total, credit: 0 },
        { account: "inventory", debit: p.total, credit: 0 },
        { account: "purchases", debit: 0, credit: p.total },
        { account: "payables", debit: 0, credit: p.total, ref: p.supplierId },
      ])
    );
  }
  for (const sp of payments) {
    out.push(
      entry(`j-seed-spay-${sp.id}`, "Supplier payment (seed)", "seed", sp.id, sp.dayOffset, [
        { account: "payables", debit: sp.amount, credit: 0, ref: sp.supplierId },
        { account: sp.method === "cash" ? "cash" : "wallet", debit: 0, credit: sp.amount },
      ])
    );
  }
  for (const e of expenses) {
    out.push(
      entry(`j-seed-exp-${e.id}`, `Expense — ${e.category} (seed)`, "seed", e.id, e.dayOffset, [
        { account: `expense_${e.category}` as JournalLine["account"], debit: e.amount, credit: 0 },
        { account: e.method === "cash" ? "cash" : "wallet", debit: 0, credit: e.amount },
      ])
    );
  }
  for (const c of credits) {
    if (c.kind === "credit") {
      // F-7: a standalone udhaar (no bill) is a CASH LOAN out of the
      // till — Dr receivables / Cr cash. It is never sales revenue;
      // goods-on-credit revenue is posted by the bill entry itself.
      out.push(
        entry(`j-seed-cr-${c.id}`, `Udhaar given (cash loan) — ${c.customerName} (seed)`, "seed", c.id, c.dayOffset, [
          { account: "receivables", debit: c.amount, credit: 0, ref: c.customerId },
          { account: "cash", debit: 0, credit: c.amount },
        ])
      );
    } else {
      out.push(
        entry(`j-seed-cr-${c.id}`, `Udhaar repayment — ${c.customerName} (seed)`, "seed", c.id, c.dayOffset, [
          { account: c.method === "cash" || !c.method ? "cash" : "wallet", debit: c.amount, credit: 0 },
          { account: "receivables", debit: 0, credit: c.amount, ref: c.customerId },
        ])
      );
    }
  }

  // Drawdown entry for the sample demo loan (LN-1 from Malik Traders, sup-1)
  // Dr bank 150,000 / Cr loans_payable 150,000 (ref: "loan-demo-1")
  out.push(
    entry("j-seed-loan-drawdown-1", "Loan drawdown — Malik Traders (seed)", "seed", "loan-demo-1", 0, [
      { account: "wallet", debit: 150000, credit: 0, ref: "acc-bank" },
      { account: "loans_payable", debit: 0, credit: 150000, ref: "loan-demo-1" },
    ])
  );

  // If loyalty entries are provided (as in the demo showroom),
  // they represent historical loyalty sales before go-live.
  if (loyaltyEntries.length > 0) {
    out.push(...loyaltyEntries);
  }

  // F-12 — go-live OPENING entry: true the balance sheet up to the
  // physical position. Inventory becomes exactly the shelf value at
  // cost; Cash becomes the stated opening till; Owner Capital absorbs
  // the difference (stock brought in, less pre-system takings the
  // owner has already drawn). Receivables/payables are NOT touched —
  // they already reconcile to their subledgers through the history.
  const shelfValue = products.reduce((a, p) => a + p.stockQty * p.costPrice, 0);
  const invDelta = shelfValue - accountBalance(out, "inventory");
  const cashDelta = SEED_OPENING_TILL - accountBalance(out, "cash");
  const openingLines: JournalLine[] = [];
  if (invDelta > 0) openingLines.push({ account: "inventory", debit: invDelta, credit: 0 });
  if (invDelta < 0) openingLines.push({ account: "inventory", debit: 0, credit: -invDelta });
  if (cashDelta > 0) openingLines.push({ account: "cash", debit: cashDelta, credit: 0 });
  if (cashDelta < 0) openingLines.push({ account: "cash", debit: 0, credit: -cashDelta });
  const net = invDelta + cashDelta;
  if (net > 0) openingLines.push({ account: "capital", debit: 0, credit: net });
  if (net < 0) openingLines.push({ account: "capital", debit: -net, credit: 0 });
  if (openingLines.length > 0) {
    out.push(
      entry(
        "j-seed-opening",
        "Opening balance — inventory & till trued up to physical count (go-live)",
        "seed",
        null,
        0,
        openingLines
      )
    );
  }

  // The seed is static data: an unbalanced entry here is a build-time
  // bug, and the append-only journal could never repair it later.
  for (const e of out) {
    if (!entryBalances(e)) {
      throw new Error(`Seed journal entry ${e.id} does not balance.`);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Phase H · H6 (audit fix 3) — the DEMO shop's loyalty programme.    */
/* DEMO-ONLY, exactly like the B1 discoverability documents above:    */
/* the cloud seeder never calls these getters, so a real shop's       */
/* journal stays the frozen 21 and its programme stays OFF until      */
/* its owner switches it on. The demo, being the showroom, runs       */
/* the programme ON at the design's Q1 default terms so a visitor     */
/* sees points, tiers and a redemption without touching a real        */
/* shop's books. The entries are composed with the REAL earn          */
/* composer (lib/loyalty.buildLoyaltyEarnEntry) over bill entries     */
/* shaped exactly as the billing flow posts them — the identities     */
/* the H1 suite proved (GL ≡ fold ≡ Σ customers) therefore hold       */
/* in the showroom too, and the harness pins them.                    */
/* ------------------------------------------------------------------ */

/** The demo shop's settings: the frozen seed settings with the
 *  loyalty programme switched ON (terms stay the resolver's
 *  defaults). Production seeding uses getSeedSettings() — whose
 *  absent loyalty block resolves to OFF. */
export function getDemoSettings(): ShopSettings {
  return { ...getSeedSettings(), loyalty: { enabled: true } };
}

/**
 * A small loyalty story in eight entries, appended to the demo
 * journal after the frozen 21: Haji Muhammad Saleem (cu-1) earns
 * 120 + 80 points on two cash bills, Fatima Bibi (cu-2) earns 250
 * on one, and Saleem then pays 150 of his 200 points as a tender
 * leg on a third bill (Rs 150 of its Rs 2,000; the rest cash) and
 * earns 20 more on it. End state: cu-1 holds 70 points (Rs 70),
 * cu-2 holds 250 (Rs 250), and the programme liability — journal
 * `loyalty_payable` balance and the H1 fold alike — is Rs 320.
 */
export function getDemoLoyaltyEntries(customers: Customer[]): JournalEntry[] {
  const settings = resolveLoyaltySettings({ loyalty: { enabled: true } });
  const c1 = customers.find((c) => c.id === "cu-1");
  const c2 = customers.find((c) => c.id === "cu-2");
  if (!c1 || !c2) return [];
  const out: JournalEntry[] = [];

  const billEntry = (
    n: number,
    customer: Customer,
    total: number,
    cost: number,
    dayOffset: number,
    cashPaid: number,
    pointsUsed: number
  ): JournalEntry => {
    const lines: JournalLine[] = [];
    if (cashPaid > 0) lines.push({ account: "cash", debit: cashPaid, credit: 0 });
    if (pointsUsed > 0)
      lines.push({
        account: "loyalty_payable",
        debit: pointsUsed * settings.pointValueRs,
        credit: 0,
        // The fold attributes a bill's redemption by this ref
        // (the billing flow's tender leg carries it identically).
        ref: customer.id,
      });
    lines.push({ account: "cogs", debit: cost, credit: 0 });
    lines.push({ account: "sales_revenue", debit: 0, credit: total });
    lines.push({ account: "inventory", debit: 0, credit: cost });
    const e = entry(
      `j-demo-loyalty-bill-${n}`,
      `Bill #${900 + n} — ${customer.name}`,
      "bill",
      `bill-demo-loyalty-${n}`,
      dayOffset,
      lines
    );
    if (pointsUsed > 0) e.loyaltyPointsUsed = pointsUsed;
    return e;
  };

  const script: Array<{
    n: number;
    customer: Customer;
    total: number;
    cost: number;
    dayOffset: number;
    cashPaid: number;
    pointsUsed: number;
  }> = [
    { n: 1, customer: c1, total: 12000, cost: 7200, dayOffset: 6, cashPaid: 12000, pointsUsed: 0 },
    { n: 2, customer: c1, total: 8000, cost: 4800, dayOffset: 3, cashPaid: 8000, pointsUsed: 0 },
    { n: 4, customer: c2, total: 25000, cost: 15000, dayOffset: 2, cashPaid: 25000, pointsUsed: 0 },
    { n: 3, customer: c1, total: 2000, cost: 1200, dayOffset: 0, cashPaid: 1850, pointsUsed: 150 },
  ];
  for (const b of script) {
    out.push(billEntry(b.n, b.customer, b.total, b.cost, b.dayOffset, b.cashPaid, b.pointsUsed));
    const earn = buildLoyaltyEarnEntry({
      journal: out,
      bill: {
        id: `bill-demo-loyalty-${b.n}`,
        billNo: 900 + b.n,
        customerId: b.customer.id,
        total: b.total,
      },
      settings,
      ts: dayTs(b.dayOffset, 14),
      dayOffset: b.dayOffset,
    });
    if (earn) {
      earn.id = `j-demo-loyalty-earn-${b.n}`;
      out.push(earn);
    }
  }
  for (const e of out) {
    if (!entryBalances(e)) {
      throw new Error(`Demo loyalty entry ${e.id} does not balance.`);
    }
  }
  return out;
}

/**
 * F-14 — the ONLY journal entry a top-up migration writes into a live
 * (pre-Complete-edition) shop: a single go-live OPENING BALANCE.
 * Inventory at the current shelf value, receivables/payables taken
 * from the subledgers being seeded, and the balancing figure to Owner
 * Capital. No per-day history is fabricated (the old path summarised
 * live sales at TODAY's costs, misstating historical COGS); the shop's
 * pre-migration history stays in its sales rows, outside the journal.
 * Cash is deliberately excluded — the owner records the real till via
 * a cash-book entry, so the cash book starts from truth.
 */
export function getTopUpOpeningEntry(
  products: Product[],
  credits: CreditEntry[],
  purchases: Purchase[],
  payments: SupplierPayment[]
): JournalEntry | null {
  const shelfValue = products.reduce((a, p) => a + p.stockQty * p.costPrice, 0);
  const receivables = totalOutstandingCredit(credits);
  const payables =
    purchases.reduce((a, p) => a + p.total, 0) - payments.reduce((a, p) => a + p.amount, 0);
  const lines: JournalLine[] = [];
  if (shelfValue > 0) lines.push({ account: "inventory", debit: shelfValue, credit: 0 });
  if (receivables > 0)
    lines.push({ account: "receivables", debit: receivables, credit: 0 });
  if (receivables < 0)
    lines.push({ account: "receivables", debit: 0, credit: -receivables });
  if (payables > 0) lines.push({ account: "payables", debit: 0, credit: payables });
  if (payables < 0) lines.push({ account: "payables", debit: -payables, credit: 0 });
  const net = shelfValue + receivables - payables;
  if (net > 0) lines.push({ account: "capital", debit: 0, credit: net });
  if (net < 0) lines.push({ account: "capital", debit: -net, credit: 0 });
  if (lines.length === 0) return null;
  return {
    id: "j-topup-opening",
    memo: "Opening balance — go-live (inventory at shelf value, udhaar & supplier balances from the khata)",
    refType: "seed",
    refId: null,
    reversesId: null,
    lines,
    dayOffset: 0,
    ts: new Date().toISOString(),
  };
}
