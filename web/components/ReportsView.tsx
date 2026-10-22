"use client";

/**
 * The Reports section — a read-only catalogue of fourteen reports
 * over the shared derivations (lib/reports.ts). Every report gets
 * the same controls: a date range (today / week / month / fiscal
 * year / custom — A5 period semantics), an OUTPUT language for the
 * print/share surfaces (independent of the app UI language), Print
 * and Save-as-PDF through the ONE browser print pipeline
 * (ReportPrintSheet on the B6 shell — browser rendering is what
 * shapes Urdu correctly in the PDF), and Share as a formatted text
 * summary (Web Share API where available, WhatsApp deep link
 * always). Nothing here posts or writes.
 *
 * Access: gated on the `finance` matrix row (view) — there is no
 * dedicated reports row in the A3 matrix, and reports expose
 * exactly the finance surface's figures.
 */
import { useEffect, useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import PermDenied from "./PermDenied";
import ReportPrintSheet, {
  type ReportSheetData,
  type ReportSheetSection,
} from "./ReportPrintSheet";
import { can } from "@/lib/permissions";
import { creditKey } from "@/lib/ledger";
import { fmtDate, fmtNum, fmtPKR, fmtUnit } from "@/lib/format";
import { translate, type I18nKey, type Lang } from "@/lib/i18n";
import {
  accountStatement,
  agingReport,
  chequesReport,
  customerStatement,
  dateIn,
  dateISOIn,
  dayCloseReport,
  expensesReport,
  moneyIn,
  notesReport,
  plReport,
  purchaseReport,
  rangeLabelIn,
  reportShareText,
  resolveReportRange,
  salesReport,
  stockReport,
  supplierStatement,
  taxReport,
  trialBalance,
  unitIn,
  type RangePreset,
} from "@/lib/reports";
import type { Cheque } from "@/lib/types";

type ReportId =
  | "sales" | "purchase" | "stock" | "pl" | "cashbook" | "tax"
  | "customer" | "supplier" | "aging" | "expenses" | "cheques"
  | "dayclose" | "notes" | "trialbalance";

const CATALOGUE: Array<{ id: ReportId; title: I18nKey; desc: I18nKey }> = [
  { id: "sales", title: "rep.sales.title", desc: "rep.sales.desc" },
  { id: "purchase", title: "rep.purchase.title", desc: "rep.purchase.desc" },
  { id: "stock", title: "rep.stock.title", desc: "rep.stock.desc" },
  { id: "pl", title: "rep.pl.title", desc: "rep.pl.desc" },
  { id: "cashbook", title: "rep.cashbook.title", desc: "rep.cashbook.desc" },
  { id: "tax", title: "rep.tax.title", desc: "rep.tax.desc" },
  { id: "customer", title: "rep.customer.title", desc: "rep.customer.desc" },
  { id: "supplier", title: "rep.supplier.title", desc: "rep.supplier.desc" },
  { id: "aging", title: "rep.aging.title", desc: "rep.aging.desc" },
  { id: "expenses", title: "rep.expenses.title", desc: "rep.expenses.desc" },
  { id: "cheques", title: "rep.cheques.title", desc: "rep.cheques.desc" },
  { id: "dayclose", title: "rep.dayclose.title", desc: "rep.dayclose.desc" },
  { id: "notes", title: "rep.notes.title", desc: "rep.notes.desc" },
  { id: "trialbalance", title: "rep.tb.title", desc: "rep.tb.desc" },
];

const PRESETS: Array<{ id: RangePreset; key: I18nKey }> = [
  { id: "today", key: "rep.range.today" },
  { id: "week", key: "rep.range.week" },
  { id: "month", key: "rep.range.month" },
  { id: "fiscal", key: "rep.range.fiscal" },
  { id: "custom", key: "rep.range.custom" },
];

const EXPENSE_CATS = ["rent", "electricity", "salary", "transport", "other"];

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

export default function ReportsView() {
  const store = useStore();
  const {
    ready, journal, credits, purchases, supplierPayments, purchaseReturns,
    products, sales, bills, returns, expenses, customers, suppliers,
    accounts, cheques, dayCloses, notes, settings, taxSlabs,
  } = store;
  const { role } = useAuth();
  const { t, lang } = useLang();

  const [reportId, setReportId] = useState<ReportId>("sales");
  const [preset, setPreset] = useState<RangePreset>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [outLang, setOutLang] = useState<Lang>("ur");
  const [accountSel, setAccountSel] = useState<string>("all");
  const [customerSel, setCustomerSel] = useState<string>("");
  const [supplierSel, setSupplierSel] = useState<string>("");
  const [printData, setPrintData] = useState<ReportSheetData | null>(null);

  // Output language defaults to the app's current language; the
  // owner can flip it for a single print/share without touching
  // the app language.
  useEffect(() => {
    setOutLang(lang);
  }, [lang]);

  const range = useMemo(
    () =>
      resolveReportRange(preset, settings, {
        from: customFrom,
        to: customTo,
      }),
    [preset, settings, customFrom, customTo]
  );

  /* ---------- option lists for the statement pickers ---------- */
  const customerOptions = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const c of customers) byKey.set(c.id, c.name);
    for (const c of credits) {
      const k = creditKey(c);
      if (!byKey.has(k)) byKey.set(k, c.customerName);
    }
    return [...byKey.entries()]
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, credits]);

  const effectiveCustomer =
    customerSel || customerOptions[0]?.key || "";
  const effectiveSupplier = supplierSel || suppliers[0]?.id || "";
  const billNoOf = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bills) m.set(b.id, b.billNo);
    return m;
  }, [bills]);

  /* ---------- report models (shared derivations only) ---------- */
  const models = useMemo(() => {
    if (!ready) return null;
    return {
      // Fix 1: the full reconciliation context — the sales report
      // now derives the journal's revenue figures from the
      // documents and names any journal-only remainder explicitly.
      sales: salesReport(sales, products, bills, range, {
        returns,
        journal,
        taxSlabs,
        settings,
      }),
      purchase: purchaseReport(purchases, purchaseReturns, suppliers, range),
      stock: stockReport(products),
      pl: plReport(journal, range),
      trialbalance: trialBalance(journal, range),
      cashbook: accountStatement(
        journal,
        accounts,
        accountSel === "all" ? null : accountSel,
        range
      ),
      tax: taxReport(bills, returns, purchases, purchaseReturns, range),
      customer: effectiveCustomer
        ? customerStatement(credits, effectiveCustomer, range)
        : null,
      supplier: effectiveSupplier
        ? supplierStatement(
            purchases,
            supplierPayments,
            purchaseReturns,
            effectiveSupplier,
            range
          )
        : null,
      aging: agingReport(credits, purchases, supplierPayments, purchaseReturns),
      expenses: expensesReport(expenses, range),
      cheques: chequesReport(cheques, range),
      dayclose: dayCloseReport(dayCloses, range),
      notes: notesReport(notes, range),
    };
  }, [
    ready, sales, products, bills, range, purchases, purchaseReturns,
    suppliers, journal, accounts, accountSel, returns, credits,
    effectiveCustomer, effectiveSupplier, supplierPayments, expenses,
    cheques, dayCloses, notes, taxSlabs, settings,
  ]);

  if (!can(role, "finance", "view")) return <PermDenied />;

  if (!models) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  const active = CATALOGUE.find((r) => r.id === reportId)!;
  const isSnapshot = reportId === "stock" || reportId === "aging";

  /* ---------- output-language helpers ---------- */
  const trL = (key: I18nKey, params?: Record<string, string | number>): string =>
    translate(outLang, key, params);
  const money = (n: number): string => moneyIn(outLang, n);
  const dateL = (ts: string): string => dateIn(outLang, ts);
  const catL = (cat: string): string =>
    EXPENSE_CATS.includes(cat)
      ? trL(`common.expenseCat.${cat}` as I18nKey)
      : cat;
  /** Localized journal account label (output language) — expense
   *  accounts reuse the category vocabulary, the rest the COA
   *  names; an unlabelled code falls back to its spaced form. */
  const acctL = (code: string): string => {
    if (code.startsWith("expense_")) return catL(code.replace("expense_", ""));
    const key = `fin.acct.${code}` as I18nKey;
    const label = trL(key);
    return label === key ? code.replace(/_/g, " ") : label;
  };
  const slabLabel = (name: string, rate: number, kind: string, inclusive: boolean): string =>
    `${name}${kind === "percent" ? ` ${rate}%` : ""}${inclusive ? " (incl.)" : ""}`;

  /* ================= print-sheet data (output language) ================= */
  const buildSheet = (): ReportSheetData => {
    const sections: ReportSheetSection[] = [];
    const totals: Array<[string, string]> = [];
    const sec = (
      heading: string | undefined,
      columns: string[],
      rows: string[][],
      foot?: string[][]
    ) => sections.push({ heading, columns, rows, foot });

    switch (reportId) {
      case "sales": {
        const m = models.sales;
        sec(trL("rep.sec.byProduct"),
          [trL("rep.col.product"), trL("rep.col.qty"), trL("rep.col.amount")],
          m.byProduct.map((r) => [r.name, fmtQty(r.qty), money(r.amount)]),
          [[trL("rep.tot.netSales"), "", money(m.netSales)]]);
        sec(trL("rep.sec.byCustomer"),
          [trL("rep.col.customer"), trL("rep.col.qty"), trL("rep.col.amount")],
          m.byCustomer.map((r) => [
            r.key === "walk-in" ? trL("rep.walkIn") : r.name,
            fmtQty(r.qty),
            money(r.amount),
          ]));
        totals.push(
          [trL("rep.tot.grossSales"), money(m.grossSales)],
          [trL("rep.tot.returns"), money(m.returnsTotal)],
          [trL("rep.tot.netSales"), money(m.netSales)],
          [trL("rep.tot.units"), fmtQty(m.netUnits)],
          [trL("fin.pl.grossProfit"), money(m.grossProfit)]
        );
        // Fix 1: the explicit reconciling line — printed only when
        // the journal carries revenue no sale document explains.
        if (m.otherRevenue !== 0)
          totals.push(
            [trL("rep.tot.otherRevenue"), money(m.otherRevenue)],
            [trL("rep.tot.plNetRevenue"), money(m.plNetRevenue)]
          );
        break;
      }
      case "purchase": {
        const m = models.purchase;
        sec(trL("rep.sec.bySupplier"),
          [trL("rep.col.supplier"), trL("rep.tot.grossPurchases"), trL("rep.tot.purchaseReturns"), trL("rep.tot.netPurchases")],
          m.bySupplier.map((r) => [r.name, money(r.gross), money(r.returns), money(r.net)]));
        sec(trL("rep.sec.byProduct"),
          [trL("rep.col.product"), trL("rep.col.qty"), trL("rep.col.amount")],
          m.byProduct.map((r) => [r.name, fmtQty(r.qty), money(r.amount)]));
        totals.push(
          [trL("rep.tot.grossPurchases"), money(m.gross)],
          [trL("rep.tot.purchaseReturns"), money(m.returnsGross)],
          [trL("rep.tot.netPurchases"), money(m.net)]
        );
        break;
      }
      case "stock": {
        const m = models.stock;
        sec(trL("rep.sec.currentStock"),
          [trL("rep.col.product"), trL("rep.col.stock"), trL("rep.col.cost"), trL("rep.col.value")],
          m.rows.map((r) => [
            r.product.name,
            `${fmtQty(r.product.stockQty)} ${unitIn(outLang, r.product.unit)}`,
            money(r.product.costPrice),
            money(r.value),
          ]),
          [[trL("rep.tot.stockValue"), "", "", money(m.totalValue)]]);
        if (m.low.length > 0)
          sec(trL("rep.sec.lowStock"),
            [trL("rep.col.product"), trL("rep.col.stock"), trL("rep.col.reorder")],
            m.low.map((p) => [p.name, fmtQty(p.stockQty), fmtQty(p.reorderLevel)]));
        if (m.expiring.length > 0)
          sec(trL("rep.sec.nearExpiry"),
            [trL("rep.col.product"), trL("rep.col.expiry"), trL("rep.col.stock")],
            m.expiring.map((p) => [p.name, p.expiryDate ?? "", fmtQty(p.stockQty)]));
        totals.push(
          [trL("rep.tot.stockValue"), money(m.totalValue)],
          [trL("rep.tot.stockValueRetail"), money(m.retailValue)]
        );
        break;
      }
      case "pl": {
        const m = models.pl;
        const rows: string[][] = [
          [trL("fin.pl.revenue"), money(m.revenue)],
          [trL("fin.pl.discounts"), `− ${money(m.discounts)}`],
          [trL("fin.pl.netRevenue"), money(m.netRevenue)],
          [trL("fin.pl.cogs"), `− ${money(m.cogs)}`],
          [trL("fin.pl.grossProfit"), money(m.grossProfit)],
          ...Object.entries(m.expensesByCategory)
            .filter(([, v]) => v !== 0)
            .map(([cat, v]) => [
              trL("fin.pl.expenseRow", { category: catL(cat) }),
              `− ${money(v)}`,
            ]),
          [trL("fin.pl.stockLoss"), `− ${money(m.stockLoss)}`],
        ];
        sec(undefined, [trL("rep.col.description"), trL("rep.col.amount")], rows);
        totals.push([trL("fin.pl.netProfit"), money(m.net)]);
        break;
      }
      case "cashbook": {
        const m = models.cashbook;
        const cols = [trL("rep.col.date"), trL("rep.col.description")];
        if (accountSel === "all") cols.push(trL("rep.col.account"));
        cols.push(trL("rep.col.in"), trL("rep.col.out"), trL("rep.col.balance"));
        sec(undefined, cols,
          m.rows.map((r) => {
            const row = [dateL(r.ts), r.memo];
            if (accountSel === "all")
              row.push(trL(r.bucket === "cash" ? "fin.acct.cash" : "fin.acct.wallet"));
            row.push(
              r.inAmount > 0 ? money(r.inAmount) : "—",
              r.outAmount > 0 ? money(r.outAmount) : "—",
              money(r.balance)
            );
            return row;
          }));
        if (m.opening !== null)
          totals.push([trL("rep.opening"), money(m.opening)]);
        totals.push(
          [trL("rep.col.in"), money(m.totalIn)],
          [trL("rep.col.out"), money(m.totalOut)]
        );
        if (m.closing !== null)
          totals.push([trL("rep.closing"), money(m.closing)]);
        break;
      }
      case "tax": {
        const m = models.tax;
        sec(undefined,
          [trL("rep.tax.slab"), trL("rep.tax.output"), trL("rep.tax.input")],
          m.rows.map((r) => [
            slabLabel(r.name, r.rate, r.kind, r.inclusive),
            money(r.output),
            money(r.input),
          ]),
          [[trL("rep.col.total"), money(m.outputTotal), money(m.inputTotal)]]);
        totals.push([trL("rep.tax.net"), money(m.net)]);
        break;
      }
      case "customer": {
        const m = models.customer;
        if (m) {
          sec(undefined,
            [trL("rep.col.date"), trL("rep.col.description"), trL("rep.col.amount"), trL("rep.col.balance")],
            m.rows.map((r) => [
              dateL(r.entry.ts),
              r.entry.kind === "credit"
                ? r.entry.billId
                  ? trL("rep.kind.bill", { no: billNoOf.get(r.entry.billId) ?? "" })
                  : trL("rep.kind.credit")
                : trL("rep.kind.repayment"),
              money(r.signed),
              money(r.balance),
            ]));
          totals.push(
            [trL("rep.opening"), money(m.opening)],
            [trL("rep.tot.given"), money(m.givenInPeriod)],
            [trL("rep.tot.repaid"), money(m.repaidInPeriod)],
            [trL("rep.closing"), money(m.closing)]
          );
        }
        break;
      }
      case "supplier": {
        const m = models.supplier;
        if (m) {
          sec(undefined,
            [trL("rep.col.date"), trL("rep.col.description"), trL("rep.col.amount"), trL("rep.col.balance")],
            m.events.map((e) => [
              dateL(e.ts),
              e.kind === "return"
                ? `${trL("rep.kind.return")} — ${trL("rep.kind.returnLegs", {
                    gross: money(e.returnGross ?? 0),
                    refund: money(e.refundAmount ?? 0),
                  })}`
                : trL(`rep.kind.${e.kind}` as I18nKey),
              money(e.effect),
              money(e.balance),
            ]));
          totals.push(
            [trL("rep.opening"), money(m.opening)],
            [trL("rep.tot.purchased"), money(m.purchasedInPeriod)],
            [trL("rep.tot.paid"), money(m.paidInPeriod)],
            [trL("rep.tot.returned"), money(m.returnedInPeriod)],
            [trL("rep.closing"), money(m.closing)]
          );
        }
        break;
      }
      case "aging": {
        const m = models.aging;
        const agingSec = (
          heading: string,
          b: { current: number; mid: number; old: number; total: number }
        ) =>
          sec(heading,
            [trL("fin.aging.age"), trL("fin.aging.amount")],
            [
              [trL("fin.aging.current"), money(b.current)],
              [trL("fin.aging.d31_60"), money(b.mid)],
              [trL("fin.aging.over60"), money(b.old)],
            ],
            [[trL("fin.aging.total"), money(b.total)]]);
        agingSec(trL("fin.aging.receivablesTitle"), m.receivables);
        agingSec(trL("fin.aging.payablesTitle"), m.payables);
        break;
      }
      case "expenses": {
        const m = models.expenses;
        sec(trL("rep.sec.byCategory"),
          [trL("rep.col.category"), trL("rep.col.amount")],
          m.byCategory.map((r) => [catL(r.category), money(r.amount)]),
          [[trL("rep.tot.expenses"), money(m.total)]]);
        sec(trL("rep.sec.detail"),
          [trL("rep.col.date"), trL("rep.col.category"), trL("rep.col.note"), trL("rep.col.amount")],
          m.rows.map((e) => [dateL(e.ts), catL(e.category), e.note, money(e.amount)]));
        totals.push([trL("rep.tot.expenses"), money(m.total)]);
        break;
      }
      case "cheques": {
        const m = models.cheques;
        const headingOf = (id: string): string =>
          id === "drawer" ? trL("chq.view.drawer")
          : id === "atBank" ? trL("chq.view.atBank")
          : id === "issued" ? trL("chq.view.issued")
          : trL(`chq.status.${id}` as I18nKey);
        for (const g of m.groups) {
          if (g.rows.length === 0) continue;
          sec(headingOf(g.id),
            [trL("rep.col.chequeNo"), trL("rep.col.bank"), trL("rep.col.party"), trL("rep.col.dueDate"), trL("rep.col.amount")],
            g.rows.map((c: Cheque) => [
              c.chequeNo,
              c.bankName,
              c.partyName,
              dateISOIn(outLang, c.dueDateISO),
              money(c.amount),
            ]),
            [[trL("rep.col.total"), "", "", "", money(g.total)]]);
        }
        break;
      }
      case "dayclose": {
        const m = models.dayclose;
        sec(undefined,
          [trL("rep.col.date"), trL("rep.dc.sales"), trL("rep.tot.expenses"), trL("rep.dc.expected"), trL("rep.dc.counted"), trL("rep.dc.difference")],
          m.rows.map((r) => [
            dateISOIn(outLang, r.close.dateISO),
            money(r.salesTotal),
            money(r.close.expensesTotal),
            money(r.close.expectedCash),
            money(r.close.countedCash),
            money(r.close.difference),
          ]),
          [[
            trL("rep.col.total"),
            money(m.totals.sales),
            money(m.totals.expenses),
            money(m.totals.expected),
            money(m.totals.counted),
            money(m.totals.difference),
          ]]);
        break;
      }
      case "notes": {
        const m = models.notes;
        const noteSec = (heading: string, kind: "credit" | "debit") => {
          const rs = m.rows.filter((n) => n.kind === kind);
          if (rs.length === 0) return;
          const side = kind === "credit" ? m.credit : m.debit;
          sec(heading,
            [trL("rep.col.number"), trL("rep.col.date"), trL("rep.col.party"), trL("rep.col.goods"), trL("rep.col.tax"), trL("rep.col.total")],
            rs.map((n) => [
              n.number,
              dateL(n.ts),
              n.partyName,
              money(n.goodsAmount),
              money(n.taxAmount),
              money(n.total),
            ]),
            [[trL("rep.col.total"), "", "", money(side.goods), money(side.tax), money(side.total)]]);
        };
        noteSec(trL("rep.notes.credit"), "credit");
        noteSec(trL("rep.notes.debit"), "debit");
        break;
      }
      case "trialbalance": {
        const m = models.trialbalance;
        sec(undefined,
          [trL("rep.col.account"), trL("rep.tb.debit"), trL("rep.tb.credit"), trL("rep.col.balance")],
          m.rows.map((r) => [
            acctL(r.account),
            money(r.debitTotal),
            money(r.creditTotal),
            `${money(r.closing)} ${trL(r.closingSide === "debit" ? "rep.tb.dr" : "rep.tb.cr")}`,
          ]),
          [[trL("rep.col.total"), money(m.totalDebits), money(m.totalCredits), ""]]);
        totals.push(
          [trL("rep.tb.difference"), money(m.difference)],
          [trL("rep.tb.difference") + " · " + trL("rep.col.balance"), money(m.closingDifference)],
          [m.balanced ? trL("rep.tb.balanced") : trL("rep.tb.unbalanced"), ""]
        );
        break;
      }
    }

    return {
      title: trL(active.title),
      period: isSnapshot ? dateIn(outLang, new Date()) : rangeLabelIn(outLang, range),
      generatedAt: dateIn(outLang, new Date()),
      sections,
      totals,
    };
  };

  /* ================= share ================= */
  const shareLines = (): Array<[string, string]> => {
    switch (reportId) {
      case "sales":
        return [
          [trL("rep.tot.netSales"), money(models.sales.netSales)],
          [trL("rep.tot.units"), fmtQty(models.sales.netUnits)],
          [trL("fin.pl.grossProfit"), money(models.sales.grossProfit)],
          ...(models.sales.otherRevenue !== 0
            ? [
                [trL("rep.tot.otherRevenue"), money(models.sales.otherRevenue)] as [string, string],
                [trL("rep.tot.plNetRevenue"), money(models.sales.plNetRevenue)] as [string, string],
              ]
            : []),
        ];
      case "purchase":
        return [
          [trL("rep.tot.grossPurchases"), money(models.purchase.gross)],
          [trL("rep.tot.purchaseReturns"), money(models.purchase.returnsGross)],
          [trL("rep.tot.netPurchases"), money(models.purchase.net)],
        ];
      case "stock":
        return [
          [trL("rep.tot.stockValue"), money(models.stock.totalValue)],
          [trL("rep.sec.lowStock"), String(models.stock.low.length)],
        ];
      case "pl":
        return [
          [trL("fin.pl.netRevenue"), money(models.pl.netRevenue)],
          [trL("fin.pl.grossProfit"), money(models.pl.grossProfit)],
          [trL("fin.pl.netProfit"), money(models.pl.net)],
        ];
      case "cashbook":
        return [
          [trL("rep.col.in"), money(models.cashbook.totalIn)],
          [trL("rep.col.out"), money(models.cashbook.totalOut)],
          ...(models.cashbook.closing !== null
            ? [[trL("rep.closing"), money(models.cashbook.closing)] as [string, string]]
            : []),
        ];
      case "tax":
        return [
          [trL("rep.tax.output"), money(models.tax.outputTotal)],
          [trL("rep.tax.input"), money(models.tax.inputTotal)],
          [trL("rep.tax.net"), money(models.tax.net)],
        ];
      case "customer":
        return models.customer
          ? [
              [trL("rep.tot.given"), money(models.customer.givenInPeriod)],
              [trL("rep.tot.repaid"), money(models.customer.repaidInPeriod)],
              [trL("rep.closing"), money(models.customer.closing)],
            ]
          : [];
      case "supplier":
        return models.supplier
          ? [
              [trL("rep.tot.purchased"), money(models.supplier.purchasedInPeriod)],
              [trL("rep.tot.paid"), money(models.supplier.paidInPeriod)],
              [trL("rep.closing"), money(models.supplier.closing)],
            ]
          : [];
      case "aging":
        return [
          [trL("fin.aging.receivablesTitle"), money(models.aging.receivables.total)],
          [trL("fin.aging.payablesTitle"), money(models.aging.payables.total)],
        ];
      case "expenses":
        return [[trL("rep.tot.expenses"), money(models.expenses.total)]];
      case "cheques":
        return models.cheques.groups
          .filter((g) => g.rows.length > 0)
          .map((g) => [trL(`chq.status.${g.id === "atBank" ? "deposited" : g.id === "drawer" ? "received" : g.id === "issued" ? "issued" : g.id}` as I18nKey), money(g.total)]);
      case "dayclose":
        return [
          [trL("rep.dc.sales"), money(models.dayclose.totals.sales)],
          [trL("rep.dc.difference"), money(models.dayclose.totals.difference)],
        ];
      case "notes":
        return [
          [trL("rep.notes.credit"), money(models.notes.credit.total)],
          [trL("rep.notes.debit"), money(models.notes.debit.total)],
        ];
      case "trialbalance":
        return [
          [trL("rep.tb.debit"), money(models.trialbalance.totalDebits)],
          [trL("rep.tb.credit"), money(models.trialbalance.totalCredits)],
          [
            trL("rep.tb.difference"),
            `${money(models.trialbalance.difference)} · ${models.trialbalance.balanced ? trL("rep.tb.balanced") : trL("rep.tb.unbalanced")}`,
          ],
        ];
    }
  };

  const shareText = (): string =>
    reportShareText(outLang, {
      shopName: settings.shopName,
      title: trL(active.title),
      period: isSnapshot ? dateIn(outLang, new Date()) : rangeLabelIn(outLang, range),
      lines: shareLines(),
    });

  const doPrint = () => {
    setPrintData(buildSheet());
    setTimeout(() => window.print(), 60);
  };

  const doShare = async () => {
    const text = shareText();
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: trL(active.title), text });
        return;
      } catch {
        /* user cancelled or share failed — fall through to WhatsApp */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const doWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText())}`,
      "_blank"
    );
  };

  /* ================= on-screen report bodies (app language) ================= */
  const catT = (cat: string): string =>
    EXPENSE_CATS.includes(cat) ? t(`common.expenseCat.${cat}` as I18nKey) : cat;
  const acctT = (code: string): string => {
    if (code.startsWith("expense_")) return catT(code.replace("expense_", ""));
    const key = `fin.acct.${code}` as I18nKey;
    const label = t(key);
    return label === key ? code.replace(/_/g, " ") : label;
  };

  const totalsCards = (items: Array<[string, string]>) => (
    <div className="grid-4" style={{ marginBottom: 24 }}>
      {items.map(([label, value]) => (
        <div className="card kpi" key={label}>
          <div>
            <div className="kpi-label">{label}</div>
            <div className="kpi-value" style={{ fontSize: "1.25rem" }}>{value}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const dataTable = (
    columns: string[],
    rows: React.ReactNode[][],
    foot?: React.ReactNode[]
  ) => (
    <div className="table-wrap" style={{ boxShadow: "none" }}>
      <table className="data" style={{ minWidth: 0 }}>
        <thead>
          <tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={columns.length}><div className="empty">{t("rep.empty")}</div></td></tr>
          )}
        </tbody>
        {foot && (
          <tfoot>
            <tr>{foot.map((cell, i) => <td key={i}><b>{cell}</b></td>)}</tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  const sectionCard = (heading: string, body: React.ReactNode) => (
    <section className="card" aria-label={heading} style={{ marginBottom: 24 }}>
      <h2 style={{ fontSize: "1.2rem", marginBottom: 14 }}>{heading}</h2>
      {body}
    </section>
  );

  const renderBody = (): React.ReactNode => {
    switch (reportId) {
      case "sales": {
        const m = models.sales;
        return (
          <>
            {totalsCards([
              [t("rep.tot.grossSales"), fmtPKR(m.grossSales)],
              [t("rep.tot.returns"), fmtPKR(m.returnsTotal)],
              [t("rep.tot.netSales"), fmtPKR(m.netSales)],
              [t("fin.pl.grossProfit"), fmtPKR(m.grossProfit)],
            ])}
            {sectionCard(t("rep.sec.byProduct"), dataTable(
              [t("rep.col.product"), t("rep.col.qty"), t("rep.col.amount")],
              m.byProduct.map((r) => [r.name, fmtQty(r.qty), <b key="a">{fmtPKR(r.amount)}</b>])
            ))}
            {sectionCard(t("rep.sec.byCustomer"), dataTable(
              [t("rep.col.customer"), t("rep.col.qty"), t("rep.col.amount")],
              m.byCustomer.map((r) => [
                r.key === "walk-in" ? t("rep.walkIn") : r.name,
                fmtQty(r.qty),
                <b key="a">{fmtPKR(r.amount)}</b>,
              ])
            ))}
            {m.otherRevenue !== 0 && (
              <div className="note-box">
                {t("rep.tot.otherRevenue")}: <b>{fmtPKR(m.otherRevenue)}</b>
                {"  ·  "}
                {t("rep.tot.plNetRevenue")}: <b>{fmtPKR(m.plNetRevenue)}</b>
              </div>
            )}
          </>
        );
      }
      case "purchase": {
        const m = models.purchase;
        return (
          <>
            {totalsCards([
              [t("rep.tot.grossPurchases"), fmtPKR(m.gross)],
              [t("rep.tot.purchaseReturns"), fmtPKR(m.returnsGross)],
              [t("rep.tot.netPurchases"), fmtPKR(m.net)],
              [t("rep.col.tax"), fmtPKR(m.taxTotal)],
            ])}
            {sectionCard(t("rep.sec.bySupplier"), dataTable(
              [t("rep.col.supplier"), t("rep.tot.grossPurchases"), t("rep.tot.purchaseReturns"), t("rep.tot.netPurchases")],
              m.bySupplier.map((r) => [r.name, fmtPKR(r.gross), fmtPKR(r.returns), <b key="a">{fmtPKR(r.net)}</b>])
            ))}
            {sectionCard(t("rep.sec.byProduct"), dataTable(
              [t("rep.col.product"), t("rep.col.qty"), t("rep.col.amount")],
              m.byProduct.map((r) => [r.name, fmtQty(r.qty), <b key="a">{fmtPKR(r.amount)}</b>])
            ))}
          </>
        );
      }
      case "stock": {
        const m = models.stock;
        return (
          <>
            {totalsCards([
              [t("rep.tot.stockValue"), fmtPKR(m.totalValue)],
              [t("rep.tot.stockValueRetail"), fmtPKR(m.retailValue)],
              [t("rep.sec.lowStock"), String(m.low.length)],
              [t("rep.sec.nearExpiry"), String(m.expiring.length)],
            ])}
            {sectionCard(t("rep.sec.currentStock"), dataTable(
              [t("rep.col.product"), t("rep.col.stock"), t("rep.col.cost"), t("rep.col.salePrice"), t("rep.col.value")],
              m.rows.map((r) => [
                r.product.name,
                `${fmtQty(r.product.stockQty)} ${fmtUnit(r.product.unit)}`,
                fmtPKR(r.product.costPrice),
                fmtPKR(r.product.salePrice),
                <b key="a">{fmtPKR(r.value)}</b>,
              ])
            ))}
            {m.low.length > 0 && sectionCard(t("rep.sec.lowStock"), dataTable(
              [t("rep.col.product"), t("rep.col.stock"), t("rep.col.reorder")],
              m.low.map((p) => [p.name, fmtQty(p.stockQty), fmtQty(p.reorderLevel)])
            ))}
            {m.expiring.length > 0 && sectionCard(t("rep.sec.nearExpiry"), dataTable(
              [t("rep.col.product"), t("rep.col.expiry"), t("rep.col.stock")],
              m.expiring.map((p) => [p.name, p.expiryDate ?? "", fmtQty(p.stockQty)])
            ))}
          </>
        );
      }
      case "pl": {
        const m = models.pl;
        const line = (label: string, value: string, opts?: { muted?: boolean; strong?: boolean }) => (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: opts?.muted ? "var(--muted)" : undefined, fontWeight: opts?.strong ? 700 : undefined }}>
            <span>{label}</span><b>{value}</b>
          </div>
        );
        return sectionCard(t("rep.pl.title"),
          <div style={{ display: "grid", gap: 10, fontSize: "0.97rem" }}>
            {line(t("fin.pl.revenue"), fmtPKR(m.revenue))}
            {line(t("fin.pl.discounts"), `− ${fmtPKR(m.discounts)}`, { muted: true })}
            {line(t("fin.pl.netRevenue"), fmtPKR(m.netRevenue), { strong: true })}
            {line(t("fin.pl.cogs"), `− ${fmtPKR(m.cogs)}`, { muted: true })}
            {line(t("fin.pl.grossProfit"), fmtPKR(m.grossProfit), { strong: true })}
            {Object.entries(m.expensesByCategory).filter(([, v]) => v !== 0).map(([cat, v]) => (
              <div key={cat}>{line(t("fin.pl.expenseRow", { category: catT(cat) }), `− ${fmtPKR(v)}`, { muted: true })}</div>
            ))}
            {line(t("fin.pl.stockLoss"), `− ${fmtPKR(m.stockLoss)}`, { muted: true })}
            <div style={{ borderTop: "2px solid var(--line)", paddingTop: 12, fontSize: "1.08rem" }}>
              {line(t("fin.pl.netProfit"), fmtPKR(m.net), { strong: true })}
            </div>
          </div>
        );
      }
      case "cashbook": {
        const m = models.cashbook;
        const cols = [t("rep.col.date"), t("rep.col.description")];
        if (accountSel === "all") cols.push(t("rep.col.account"));
        cols.push(t("rep.col.in"), t("rep.col.out"), t("rep.col.balance"));
        return (
          <>
            {totalsCards([
              ...(m.opening !== null ? [[t("rep.opening"), fmtPKR(m.opening)] as [string, string]] : []),
              [t("rep.col.in"), fmtPKR(m.totalIn)],
              [t("rep.col.out"), fmtPKR(m.totalOut)],
              ...(m.closing !== null ? [[t("rep.closing"), fmtPKR(m.closing)] as [string, string]] : []),
            ])}
            {sectionCard(t("rep.cashbook.title"), dataTable(
              cols,
              m.rows.map((r) => {
                const row: React.ReactNode[] = [fmtDate(r.ts), r.memo];
                if (accountSel === "all")
                  row.push(t(r.bucket === "cash" ? "fin.acct.cash" : "fin.acct.wallet"));
                row.push(
                  r.inAmount > 0 ? fmtPKR(r.inAmount) : "—",
                  r.outAmount > 0 ? fmtPKR(r.outAmount) : "—",
                  <b key="b">{fmtPKR(r.balance)}</b>
                );
                return row;
              })
            ))}
          </>
        );
      }
      case "tax": {
        const m = models.tax;
        return (
          <>
            {totalsCards([
              [t("rep.tax.output"), fmtPKR(m.outputTotal)],
              [t("rep.tax.input"), fmtPKR(m.inputTotal)],
              [t("rep.tax.net"), fmtPKR(m.net)],
            ])}
            {sectionCard(t("rep.tax.title"), dataTable(
              [t("rep.tax.slab"), t("rep.tax.output"), t("rep.tax.input")],
              m.rows.map((r) => [
                slabLabel(r.name, r.rate, r.kind, r.inclusive),
                fmtPKR(r.output),
                fmtPKR(r.input),
              ]),
              [t("rep.col.total"), fmtPKR(m.outputTotal), fmtPKR(m.inputTotal)]
            ))}
          </>
        );
      }
      case "customer": {
        const m = models.customer;
        if (!m) return <div className="empty">{t("rep.empty")}</div>;
        return (
          <>
            {totalsCards([
              [t("rep.opening"), fmtPKR(m.opening)],
              [t("rep.tot.given"), fmtPKR(m.givenInPeriod)],
              [t("rep.tot.repaid"), fmtPKR(m.repaidInPeriod)],
              [t("rep.closing"), fmtPKR(m.closing)],
            ])}
            {sectionCard(t("rep.customer.title"), dataTable(
              [t("rep.col.date"), t("rep.col.description"), t("rep.col.amount"), t("rep.col.balance")],
              m.rows.map((r) => [
                fmtDate(r.entry.ts),
                r.entry.kind === "credit"
                  ? r.entry.billId
                    ? t("rep.kind.bill", { no: billNoOf.get(r.entry.billId) ?? "" })
                    : t("rep.kind.credit")
                  : t("rep.kind.repayment"),
                fmtPKR(r.signed),
                <b key="b">{fmtPKR(r.balance)}</b>,
              ])
            ))}
          </>
        );
      }
      case "supplier": {
        const m = models.supplier;
        if (!m) return <div className="empty">{t("rep.empty")}</div>;
        return (
          <>
            {totalsCards([
              [t("rep.opening"), fmtPKR(m.opening)],
              [t("rep.tot.purchased"), fmtPKR(m.purchasedInPeriod)],
              [t("rep.tot.paid"), fmtPKR(m.paidInPeriod)],
              [t("rep.closing"), fmtPKR(m.closing)],
            ])}
            {sectionCard(t("rep.supplier.title"), dataTable(
              [t("rep.col.date"), t("rep.col.description"), t("rep.col.amount"), t("rep.col.balance")],
              m.events.map((e) => [
                fmtDate(e.ts),
                e.kind === "return"
                  ? `${t("rep.kind.return")} — ${t("rep.kind.returnLegs", { gross: fmtPKR(e.returnGross ?? 0), refund: fmtPKR(e.refundAmount ?? 0) })}`
                  : t(`rep.kind.${e.kind}` as I18nKey),
                fmtPKR(e.effect),
                <b key="b">{fmtPKR(e.balance)}</b>,
              ])
            ))}
          </>
        );
      }
      case "aging": {
        const m = models.aging;
        const agingCard = (title: string, b: { current: number; mid: number; old: number; total: number }) =>
          sectionCard(title, dataTable(
            [t("fin.aging.age"), t("fin.aging.amount")],
            [
              [t("fin.aging.current"), fmtPKR(b.current)],
              [t("fin.aging.d31_60"), fmtPKR(b.mid)],
              [t("fin.aging.over60"), fmtPKR(b.old)],
            ],
            [t("fin.aging.total"), fmtPKR(b.total)]
          ));
        return (
          <div className="grid-2" style={{ alignItems: "start" }}>
            {agingCard(t("fin.aging.receivablesTitle"), m.receivables)}
            {agingCard(t("fin.aging.payablesTitle"), m.payables)}
          </div>
        );
      }
      case "expenses": {
        const m = models.expenses;
        return (
          <>
            {totalsCards([[t("rep.tot.expenses"), fmtPKR(m.total)]])}
            {sectionCard(t("rep.sec.byCategory"), dataTable(
              [t("rep.col.category"), t("rep.col.amount")],
              m.byCategory.map((r) => [catT(r.category), <b key="a">{fmtPKR(r.amount)}</b>])
            ))}
            {sectionCard(t("rep.sec.detail"), dataTable(
              [t("rep.col.date"), t("rep.col.category"), t("rep.col.method"), t("rep.col.note"), t("rep.col.amount")],
              m.rows.map((e) => [
                fmtDate(e.ts),
                catT(e.category),
                t(`common.pay.${e.method}` as I18nKey),
                e.note,
                fmtPKR(e.amount),
              ])
            ))}
          </>
        );
      }
      case "cheques": {
        const m = models.cheques;
        const headingOf = (id: string): string =>
          id === "drawer" ? t("chq.view.drawer")
          : id === "atBank" ? t("chq.view.atBank")
          : id === "issued" ? t("chq.view.issued")
          : t(`chq.status.${id}` as I18nKey);
        return (
          <>
            {m.groups.filter((g) => g.rows.length > 0).map((g) => (
              <div key={g.id}>
                {sectionCard(`${headingOf(g.id)} · ${fmtPKR(g.total)}`, dataTable(
                  [t("rep.col.chequeNo"), t("rep.col.bank"), t("rep.col.party"), t("rep.col.dueDate"), t("rep.col.amount")],
                  g.rows.map((c) => [
                    c.chequeNo,
                    c.bankName,
                    c.partyName,
                    c.dueDateISO,
                    <b key="a">{fmtPKR(c.amount)}</b>,
                  ])
                ))}
              </div>
            ))}
            {m.groups.every((g) => g.rows.length === 0) && (
              <div className="empty">{t("rep.empty")}</div>
            )}
          </>
        );
      }
      case "dayclose": {
        const m = models.dayclose;
        return sectionCard(t("rep.dayclose.title"), dataTable(
          [t("rep.col.date"), t("rep.dc.sales"), t("rep.tot.expenses"), t("rep.tot.given"), t("rep.tot.repaid"), t("rep.dc.expected"), t("rep.dc.counted"), t("rep.dc.difference")],
          m.rows.map((r) => [
            r.close.dateISO,
            fmtPKR(r.salesTotal),
            fmtPKR(r.close.expensesTotal),
            fmtPKR(r.close.creditGiven),
            fmtPKR(r.close.creditReceived),
            fmtPKR(r.close.expectedCash),
            fmtPKR(r.close.countedCash),
            <b key="d">{fmtPKR(r.close.difference)}</b>,
          ]),
          [
            t("rep.col.total"),
            fmtPKR(m.totals.sales),
            fmtPKR(m.totals.expenses),
            fmtPKR(m.totals.creditGiven),
            fmtPKR(m.totals.creditReceived),
            fmtPKR(m.totals.expected),
            fmtPKR(m.totals.counted),
            fmtPKR(m.totals.difference),
          ]
        ));
      }
      case "notes": {
        const m = models.notes;
        const noteCard = (heading: string, kind: "credit" | "debit") => {
          const rs = m.rows.filter((n) => n.kind === kind);
          const side = kind === "credit" ? m.credit : m.debit;
          return sectionCard(heading, dataTable(
            [t("rep.col.number"), t("rep.col.date"), t("rep.col.party"), t("rep.col.goods"), t("rep.col.tax"), t("rep.col.total")],
            rs.map((n) => [n.number, fmtDate(n.ts), n.partyName, fmtPKR(n.goodsAmount), fmtPKR(n.taxAmount), <b key="t">{fmtPKR(n.total)}</b>]),
            [t("rep.col.total"), "", "", fmtPKR(side.goods), fmtPKR(side.tax), fmtPKR(side.total)]
          ));
        };
        return (
          <>
            {noteCard(t("rep.notes.credit"), "credit")}
            {noteCard(t("rep.notes.debit"), "debit")}
          </>
        );
      }
      case "trialbalance": {
        const m = models.trialbalance;
        return (
          <>
            {totalsCards([
              [t("rep.tb.debit"), fmtPKR(m.totalDebits)],
              [t("rep.tb.credit"), fmtPKR(m.totalCredits)],
              [t("rep.tb.difference"), fmtPKR(m.difference)],
              [t("rep.tb.difference") + " · " + t("rep.col.balance"), fmtPKR(m.closingDifference)],
            ])}
            <div
              className="note-box"
              style={{
                marginBottom: 24,
                borderStyle: "solid",
                borderColor: m.balanced ? "var(--accent)" : "var(--danger)",
                color: m.balanced ? undefined : "var(--danger)",
                fontWeight: 600,
              }}
            >
              {m.balanced ? t("rep.tb.balanced") : t("rep.tb.unbalanced")}
            </div>
            {sectionCard(t("rep.tb.title"), dataTable(
              [t("rep.col.account"), t("rep.tb.debit"), t("rep.tb.credit"), t("rep.col.balance")],
              m.rows.map((r) => [
                acctT(r.account),
                fmtPKR(r.debitTotal),
                fmtPKR(r.creditTotal),
                <b key="b">
                  {fmtPKR(r.closing)} {t(r.closingSide === "debit" ? "rep.tb.dr" : "rep.tb.cr")}
                </b>,
              ]),
              [t("rep.col.total"), fmtPKR(m.totalDebits), fmtPKR(m.totalCredits), ""]
            ))}
          </>
        );
      }
    }
  };

  /* ================= page ================= */
  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("rep.eyebrow")}</span>
          <h1 className="h2">{t("rep.title")}</h1>
          <p className="lead">{t("rep.subtitle")}</p>
        </div>

        {/* Compact sticky toolbar (UX overhaul): the fourteen
            reports are chips on one scrollable row, range presets
            beside them, output language + per-report filters +
            print/share on the next — the report itself renders
            immediately beneath; switching never scrolls past a
            catalogue. Stays pinned while the report scrolls. */}
        <div className="rep-toolbar no-print">
          <div className="rep-chips" role="tablist" aria-label={t("rep.catalogue")}>
            {CATALOGUE.map((r) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                className={"rep-chip" + (reportId === r.id ? " active" : "")}
                onClick={() => setReportId(r.id)}
                aria-selected={reportId === r.id}
                title={t(r.desc)}
              >
                {t(r.title)}
              </button>
            ))}
          </div>
          <div className="rep-controls">
            <div className="rep-presets" role="group" aria-label={t("rep.range")}>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={"rep-chip" + (preset === p.id ? " active" : "")}
                  onClick={() => setPreset(p.id)}
                  aria-pressed={preset === p.id}
                >
                  {t(p.key)}
                </button>
              ))}
            </div>
            {preset === "custom" && (
              <>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="rep-from">{t("rep.from")}</label>
                  <input id="rep-from" type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label htmlFor="rep-to">{t("rep.to")}</label>
                  <input id="rep-to" type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </div>
              </>
            )}
            <div className="field" style={{ margin: 0 }}>
              <label htmlFor="rep-outlang">{t("rep.outLang")}</label>
              <select id="rep-outlang" value={outLang} onChange={(e) => setOutLang(e.target.value as Lang)}>
                <option value="ur">اردو</option>
                <option value="en">English</option>
              </select>
            </div>
            {reportId === "cashbook" && (
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="rep-account">{t("rep.selectAccount")}</label>
                <select id="rep-account" value={accountSel} onChange={(e) => setAccountSel(e.target.value)}>
                  <option value="all">{t("rep.allAccounts")}</option>
                  {[...accounts].sort((a, b) => a.sortOrder - b.sortOrder).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            )}
            {reportId === "customer" && (
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="rep-customer">{t("rep.selectCustomer")}</label>
                <select id="rep-customer" value={effectiveCustomer} onChange={(e) => setCustomerSel(e.target.value)}>
                  {customerOptions.map((c) => (
                    <option key={c.key} value={c.key}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            {reportId === "supplier" && (
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="rep-supplier">{t("rep.selectSupplier")}</label>
                <select id="rep-supplier" value={effectiveSupplier} onChange={(e) => setSupplierSel(e.target.value)}>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="rep-actions">
            <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              {t("rep.period")}: {isSnapshot ? fmtDate(new Date()) : `${range.fromDate} – ${range.toDate}`}
            </span>
            <span style={{ flex: 1 }} />
            <button type="button" className="btn btn-primary btn-sm" onClick={doPrint}>
              {t("rep.print")}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={doPrint}>
              {t("rep.savePdf")}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={doShare}>
              {t("rep.share")}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={doWhatsApp}>
              {t("rep.whatsapp")}
            </button>
          </div>
          {isSnapshot && (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: "2px 0 0" }}>
              {t("rep.snapshotNote")}
            </p>
          )}
        </div>

        <h2 style={{ fontSize: "1.3rem", marginBottom: 16 }}>{t(active.title)}</h2>
        {renderBody()}

        {printData && (
          <ReportPrintSheet data={printData} settings={settings} outLang={outLang} />
        )}
      </div>
    </div>
  );
}
