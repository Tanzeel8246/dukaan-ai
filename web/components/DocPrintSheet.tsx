"use client";

/**
 * The receipt-family print sheets. Every sheet renders through
 * the shared print chrome (components/PrintChrome.tsx — header,
 * footer, @page rule, items table) driven by the resolved
 * PrintDesign (lib/print.ts); bodies — totals, document-specific
 * blocks — are each sheet's own, unchanged in structure since
 * the phase that introduced them:
 *
 * B1 quotation / sale order (figures are ESTIMATES, §7 — the
 * sheet says so). B2 the delivery challan: quantities ONLY, no
 * prices, no totals (§2.3) — a challan's prices can never become
 * a second price promise, so they are never printed; the slot
 * matrix in lib/print enforces the same rule structurally.
 * B4 the credit/debit NOTE (§3.4): original reference, returned
 * lines, per-slab tax lines from the A4 snapshots. B6 payment
 * vouchers. C2 transfer, C4 production, C5 job work slip, D2
 * salary slip. E1 adds the bill receipt (extracted from
 * BillingDesk) as BillPrintSheet.
 */
import { useLang } from "./LangProvider";
import { fmtDate, fmtPKR } from "@/lib/format";
import { billTaxLines, taxLinesForItems } from "@/lib/tax";
import type { VoucherPrintData } from "@/lib/documents";
import type { I18nKey, Lang } from "@/lib/i18n";

/** Intl locale for print-sheet dates per UI language (Phase H §4.5:
 *  PS/FA ride the Afghan regional locales with LATIN digits forced —
 *  digits stay Western Arabic numerals in every locale, as UR does;
 *  dates stay the PKT/Gregorian business calendar, no Jalali). */
const DATE_LOCALES: Record<Lang, string> = {
  en: "en-PK",
  ur: "ur-PK",
  ps: "ps-AF-u-nu-latn",
  fa: "fa-AF-u-nu-latn",
};
import { poolOf, producedQty } from "@/lib/production";
import { jobMaterialsCost } from "@/lib/jobs";
import { receiptClassName, resolvePrintDesign } from "@/lib/print";
import {
  PrintFooter,
  PrintHeader,
  PrintItemsTable,
  PrintPageStyle,
  type PrintAssets,
} from "./PrintChrome";
import type {
  Bill,
  DeliveryChallan,
  DocNote,
  Job,
  PayMethod,
  PayrollRun,
  PayrollRunLine,
  PrintPaper,
  Product,
  ProductionOrder,
  PurchaseOrder,
  PurchaseReturn,
  Quotation,
  SaleOrder,
  SaleReturn,
  ShopSettings,
  StockTransfer,
} from "@/lib/types";

const METHOD_KEY: Record<string, I18nKey> = {
  cash: "common.pay.cash",
  jazzcash: "common.pay.jazzcash",
  easypaisa: "common.pay.easypaisa",
  bank: "common.pay.bank",
};

/** The bill receipt's payment labels (BillingDesk's PAY_KEY,
 *  including the credit row a part-paid bill can carry). */
const BILL_PAY_KEY: Record<PayMethod, I18nKey> = {
  cash: "common.pay.cash",
  jazzcash: "common.pay.jazzcash",
  easypaisa: "common.pay.easypaisa",
  bank: "common.pay.bank",
  credit: "common.pay.credit",
};

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

function fmtDateTime(ts: string): string {
  const time = new Date(ts).toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${fmtDate(ts)} · ${time}`;
}

interface Props {
  doc: Quotation | SaleOrder;
  kind: "quotation" | "order";
  settings: ShopSettings;
  /** Live product list for the §1.4 SKU / Urdu-name columns. */
  products?: Product[];
  /** Phase E · E2: the shop's brand assets (data-URL map from
   *  lib/branding) — absent ⇒ every brand slot renders nothing,
   *  exactly the E1 behaviour. */
  assets?: PrintAssets | null;
  /** "From quotation QT-7" — shown on an order born of a quotation. */
  sourceLabel?: string;
  /** Designer preview (§1.8): renders the sheet visibly inside a
   *  screen-only frame — no print isolation, no @page rule. */
  preview?: boolean;
}

export default function DocPrintSheet({ doc, kind, settings, products, assets, sourceLabel, preview }: Props) {
  const { t, lang } = useLang();
  const design = resolvePrintDesign(settings);
  const dateStr = new Date(doc.ts).toLocaleDateString(
    DATE_LOCALES[lang],
    { day: "numeric", month: "short", year: "numeric" }
  );
  const dateField =
    kind === "quotation"
      ? (doc as Quotation).validUntil
      : (doc as SaleOrder).expectedDate;

  return (
    <div className={preview ? undefined : "receipt-sheet"} aria-hidden={preview ? undefined : true}>
      {!preview && <PrintPageStyle paper={design.paper} />}
      <div className={receiptClassName(design)}>
        <PrintHeader settings={settings} design={design} assets={assets} />
        <div className="r-title">
          <span>
            {kind === "quotation" ? t("quote.printTitle") : t("order.printTitle")}
          </span>
          <span>{doc.number ?? t("doc.draftLabel")}</span>
        </div>
        <div className="r-meta">
          <span>{t("common.date")}</span>
          <span>{dateStr}</span>
        </div>
        <div className="r-meta">
          <span>{t("billing.rcpt.customer")}</span>
          <span>{doc.customerName || t("billing.walkIn")}</span>
        </div>
        {doc.customerPhone && (
          <div className="r-meta">
            <span>{t("common.phone")}</span>
            <span>{doc.customerPhone}</span>
          </div>
        )}
        {sourceLabel && (
          <div className="r-meta">
            <span>{t("doc.sourceLabel")}</span>
            <span>{sourceLabel}</span>
          </div>
        )}
        <PrintItemsTable
          lines={doc.lines.map((l) => ({
            productId: l.productId,
            name: l.name,
            qty: l.qty,
            unitPrice: l.unitPrice,
            amount: l.total,
          }))}
          design={design}
          kind={kind}
          products={products}
          discountAmount={doc.discountAmount}
        />
        <div className="r-row">
          <span>{t("billing.rcpt.subtotal")}</span>
          <span>{fmtPKR(doc.subtotal)}</span>
        </div>
        {doc.discountAmount > 0 && (
          <div className="r-row">
            <span>{t("billing.rcpt.discount")}</span>
            <span>− {fmtPKR(doc.discountAmount)}</span>
          </div>
        )}
        {doc.estimatedTax > 0 && (
          <div className="r-row">
            <span>{t("doc.estTax")}</span>
            <span>{fmtPKR(doc.estimatedTax)}</span>
          </div>
        )}
        <div className="r-row total">
          <span>{t("billing.rcpt.total")}</span>
          <span>{fmtPKR(doc.total)}</span>
        </div>
        {dateField && (
          <div className="r-meta">
            <span>
              {kind === "quotation" ? t("quote.validUntil") : t("order.expectedDate")}
            </span>
            <span>{dateField}</span>
          </div>
        )}
        {doc.note && <div className="r-meta">{doc.note}</div>}
        <div className="r-shop" style={{ marginTop: 6 }}>
          {t("doc.estimateNote")}
        </div>
        <PrintFooter settings={settings} design={design} doc={{ kind }} assets={assets} />
      </div>
    </div>
  );
}

/**
 * Phase E · E1 — the BILL receipt, extracted from BillingDesk so
 * the designer preview renders the very component the desk
 * prints. Body identical to the inline receipt it replaces:
 * bill/customer rows, the shared items table (in the receipt's
 * historical `plain` convention), subtotal/discount/tax summary
 * lines from the bill's A4 snapshots, total, payment rows.
 * `thermal` is the desk's per-print override (§1.7): it selects
 * the 80mm paper for this print, whatever the template says.
 */
export function BillPrintSheet({
  bill,
  settings,
  products,
  cheques,
  assets,
  thermal,
  preview,
}: {
  bill: Bill;
  settings: ShopSettings;
  products?: Product[];
  /** Cheque registry rows, for a cheque part's leaf number. */
  cheques?: Array<{ id: string; chequeNo: string }>;
  /** Phase E · E2: brand assets (see DocPrintSheet's Props). */
  assets?: PrintAssets | null;
  thermal?: boolean;
  preview?: boolean;
}) {
  const { t } = useLang();
  const design = resolvePrintDesign(settings);
  const paper: PrintPaper = thermal ? "thermal80" : design.paper;
  // The chrome sees the EFFECTIVE paper (the desk's thermal
  // override included) so its suppression rules (§1.7) apply to
  // the sheet actually being printed, not the template default.
  const effDesign = paper === design.paper ? design : { ...design, paper };
  return (
    <div className={preview ? undefined : "receipt-sheet"}>
      {!preview && <PrintPageStyle paper={paper} />}
      <div className={receiptClassName(design, paper)}>
        <PrintHeader settings={settings} design={effDesign} assets={assets} fallbackName="Dukaan AI" />
        <div className="r-row">
          <span>{t("billing.rcpt.billNo", { no: bill.billNo })}</span>
          <span>{fmtDateTime(bill.ts)}</span>
        </div>
        <div className="r-row">
          <span>{t("billing.rcpt.customer")}</span>
          <span>
            {bill.customerName || t("billing.walkIn")}
            {bill.customerPhone ? ` · ${bill.customerPhone}` : ""}
          </span>
        </div>
        <PrintItemsTable
          lines={bill.items.map((it) => ({
            productId: it.productId,
            name: it.name,
            qty: it.qty,
            unitPrice: it.unitPrice,
            amount: it.total,
            taxAmount: it.taxAmount,
          }))}
          design={design}
          kind="bill"
          products={products}
          discountAmount={bill.discountAmount}
          plain
        />
        <div className="r-row">
          <span>{t("billing.rcpt.subtotal")}</span>
          <span>{fmtPKR(bill.subtotal)}</span>
        </div>
        {bill.discountAmount > 0 && (
          <div className="r-row">
            <span>{t("billing.rcpt.discount")}</span>
            <span>− {fmtPKR(bill.discountAmount)}</span>
          </div>
        )}
        {billTaxLines(bill).map((g) => (
          <div className="r-row" key={`${g.name}|${g.inclusive ? "in" : "ex"}`}>
            <span>
              {g.name}
              {g.kind === "percent" ? ` ${g.rate}%` : ""}
              {g.inclusive ? ` (${t("billing.tax.includedNote")})` : ""}
            </span>
            <span>{fmtPKR(g.amount)}</span>
          </div>
        ))}
        <div className="r-total">
          <span>{t("billing.rcpt.total")}</span>
          <span>{fmtPKR(bill.total)}</span>
        </div>
        {bill.payments.map((p, i) => (
          <div className="r-row" key={i}>
            <span>
              {p.instrument === "cheque"
                ? `${t("chq.payOption")}${
                    p.chequeId
                      ? ` ${cheques?.find((x) => x.id === p.chequeId)?.chequeNo ?? ""}`
                      : ""
                  }`
                : t(BILL_PAY_KEY[p.method])}
            </span>
            <span>{fmtPKR(p.amount)}</span>
          </div>
        ))}
        <PrintFooter
          settings={settings}
          design={effDesign}
          assets={assets}
          doc={{
            kind: "bill",
            status: bill.status,
            billNo: bill.billNo,
            total: bill.total,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Phase B · B6 — the payment voucher print (design §5.2). The
 * voucher IS a ledger row printed: a `credits` repayment (receipt
 * voucher, RV-) or a `supplierPayments` row (payment voucher,
 * PV-). Every figure comes from the row via the pure builders in
 * lib/documents; the balance line is the party's CURRENT derived
 * balance, labelled as such — it is computed at print time and
 * never stored. Pre-B6 rows carry no stamp and print unnumbered
 * ("—"); nothing about history is fabricated for them.
 */
export function VoucherPrintSheet({
  data,
  settings,
  assets,
}: {
  data: VoucherPrintData;
  settings: ShopSettings;
  assets?: PrintAssets | null;
}) {
  const { t, lang } = useLang();
  const design = resolvePrintDesign(settings);
  const dateStr = new Date(data.ts).toLocaleDateString(
    DATE_LOCALES[lang],
    { day: "numeric", month: "short", year: "numeric" }
  );
  const isReceipt = data.kind === "receipt";

  return (
    <div className="receipt-sheet" aria-hidden="true">
      <PrintPageStyle paper={design.paper} />
      <div className={receiptClassName(design)}>
        <PrintHeader settings={settings} design={design} assets={assets} />
        <div className="r-title">
          <span>
            {isReceipt ? t("voucher.receiptTitle") : t("voucher.paymentTitle")}
          </span>
          <span>{data.number ?? "—"}</span>
        </div>
        <div className="r-meta">
          <span>{t("common.date")}</span>
          <span>{dateStr}</span>
        </div>
        <div className="r-meta">
          <span>{isReceipt ? t("billing.rcpt.customer") : t("doc.supplier")}</span>
          <span>{data.partyName}</span>
        </div>
        {data.partyPhone && (
          <div className="r-meta">
            <span>{t("common.phone")}</span>
            <span>{data.partyPhone}</span>
          </div>
        )}
        <div className="r-row total">
          <span>{t("billing.rcpt.amount")}</span>
          <span>{fmtPKR(data.amount)}</span>
        </div>
        <div className="r-meta">
          <span>{t("credit.field.method")}</span>
          <span>
            {data.instrument === "cheque"
              ? t("chq.payOption")
              : data.method
                ? t(METHOD_KEY[data.method])
                : "—"}
          </span>
        </div>
        {data.instrument === "cheque" ? (
          <>
            {data.chequeNo && (
              <div className="r-meta">
                <span>{t("chq.field.no")}</span>
                <span>{data.chequeNo}</span>
              </div>
            )}
            {data.chequeBank && (
              <div className="r-meta">
                <span>{t("chq.field.bank")}</span>
                <span>{data.chequeBank}</span>
              </div>
            )}
            {data.chequeDueDateISO && (
              <div className="r-meta">
                <span>{t("chq.field.dueDate")}</span>
                <span>{data.chequeDueDateISO}</span>
              </div>
            )}
          </>
        ) : (
          data.accountName && (
            <div className="r-meta">
              <span>{t("common.account")}</span>
              <span>{data.accountName}</span>
            </div>
          )
        )}
        {data.note && <div className="r-meta">{data.note}</div>}
        <div className="r-row">
          <span>
            {isReceipt
              ? t("voucher.balanceAfterCustomer")
              : t("voucher.balanceAfterSupplier")}
          </span>
          <span>{fmtPKR(data.balanceAfter)}</span>
        </div>
        <PrintFooter settings={settings} design={design} doc={{ kind: "voucher" }} assets={assets} />
      </div>
    </div>
  );
}

/**
 * Phase B · B2 — the delivery challan print: the standard delivery
 * note. Quantities only — NO prices, NO amounts, NO totals — with
 * the dispatch details (vehicle/driver) and a received-by line.
 */
export function ChallanPrintSheet({
  doc,
  settings,
  assets,
  sourceOrderLabel,
}: {
  doc: DeliveryChallan;
  settings: ShopSettings;
  assets?: PrintAssets | null;
  /** "SO-7" when the challan cites a sale order. */
  sourceOrderLabel?: string;
}) {
  const { t, lang } = useLang();
  const design = resolvePrintDesign(settings);
  const dateStr = new Date(doc.ts).toLocaleDateString(
    DATE_LOCALES[lang],
    { day: "numeric", month: "short", year: "numeric" }
  );

  return (
    <div className="receipt-sheet" aria-hidden="true">
      <PrintPageStyle paper={design.paper} />
      <div className={receiptClassName(design)}>
        <PrintHeader settings={settings} design={design} assets={assets} />
        <div className="r-title">
          <span>{t("challan.printTitle")}</span>
          <span>{doc.number ?? t("doc.draftLabel")}</span>
        </div>
        <div className="r-meta">
          <span>{t("common.date")}</span>
          <span>{dateStr}</span>
        </div>
        <div className="r-meta">
          <span>{t("billing.rcpt.customer")}</span>
          <span>{doc.customerName || t("billing.walkIn")}</span>
        </div>
        {doc.customerPhone && (
          <div className="r-meta">
            <span>{t("common.phone")}</span>
            <span>{doc.customerPhone}</span>
          </div>
        )}
        {sourceOrderLabel && (
          <div className="r-meta">
            <span>{t("challan.sourceOrder")}</span>
            <span>{sourceOrderLabel}</span>
          </div>
        )}
        {doc.vehicleNo && (
          <div className="r-meta">
            <span>{t("challan.vehicleNo")}</span>
            <span>{doc.vehicleNo}</span>
          </div>
        )}
        {doc.driverName && (
          <div className="r-meta">
            <span>{t("challan.driverName")}</span>
            <span>{doc.driverName}</span>
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th>{t("billing.rcpt.item")}</th>
              <th className="num">{t("billing.rcpt.qty")}</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l) => (
              <tr key={l.productId}>
                <td>{l.name}</td>
                <td className="num">{fmtQty(l.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {doc.note && <div className="r-meta">{doc.note}</div>}
        <div className="r-shop" style={{ marginTop: 6 }}>
          {t("challan.quantitiesOnly")}
        </div>
        <div className="r-meta" style={{ marginTop: 14 }}>
          <span>{t("challan.receivedBy")}</span>
          <span>____________________</span>
        </div>
        <PrintFooter settings={settings} design={design} doc={{ kind: "challan" }} assets={assets} />
      </div>
    </div>
  );
}

/**
 * Phase B · B3 — the purchase order print: the order the shop
 * places with its supplier. Unlike the challan this is a PURCHASE
 * document, so prices ARE the document — lines print at the agreed
 * costs with the goods total. There is no tax line: tax resolves
 * when the goods are received (§7), and the sheet says so.
 */
export function PoPrintSheet({
  doc,
  settings,
  assets,
}: {
  doc: PurchaseOrder;
  settings: ShopSettings;
  assets?: PrintAssets | null;
}) {
  const { t, lang } = useLang();
  const design = resolvePrintDesign(settings);
  const dateStr = new Date(doc.ts).toLocaleDateString(
    DATE_LOCALES[lang],
    { day: "numeric", month: "short", year: "numeric" }
  );

  return (
    <div className="receipt-sheet" aria-hidden="true">
      <PrintPageStyle paper={design.paper} />
      <div className={receiptClassName(design)}>
        <PrintHeader settings={settings} design={design} assets={assets} />
        <div className="r-title">
          <span>{t("po.printTitle")}</span>
          <span>{doc.number ?? t("doc.draftLabel")}</span>
        </div>
        <div className="r-meta">
          <span>{t("common.date")}</span>
          <span>{dateStr}</span>
        </div>
        <div className="r-meta">
          <span>{t("doc.supplier")}</span>
          <span>{doc.supplierName}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t("billing.rcpt.item")}</th>
              <th className="num">{t("billing.rcpt.qty")}</th>
              <th className="num">{t("po.agreedCost")}</th>
              <th className="num">{t("billing.rcpt.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l) => (
              <tr key={l.productId}>
                <td>{l.name}</td>
                <td className="num">{fmtQty(l.qty)}</td>
                <td className="num">{fmtPKR(l.unitCost)}</td>
                <td className="num">{fmtPKR(l.qty * l.unitCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="r-row total">
          <span>{t("billing.rcpt.total")}</span>
          <span>{fmtPKR(doc.total)}</span>
        </div>
        {doc.expectedDate && (
          <div className="r-meta">
            <span>{t("order.expectedDate")}</span>
            <span>{doc.expectedDate}</span>
          </div>
        )}
        {doc.note && <div className="r-meta">{doc.note}</div>}
        <div className="r-shop" style={{ marginTop: 6 }}>
          {t("po.printNote")}
        </div>
        <PrintFooter settings={settings} design={design} doc={{ kind: "po" }} assets={assets} />
      </div>
    </div>
  );
}

/**
 * Phase B · B4 — the credit/debit note print (design §3.4). The
 * note formalizes a return that already posted, so every figure on
 * this sheet is read from the note itself (which copied the
 * engine's figures at mint time); the settlement LEGS come from
 * the underlying return record when the caller supplies it.
 * Tax lines group the note items' A4 snapshots — the tax reversal
 * the counterparty can claim, exactly as reversed.
 */
export function NotePrintSheet({
  note,
  settings,
  products,
  assets,
  sourceReturn,
  purchaseTs,
}: {
  note: DocNote;
  settings: ShopSettings;
  /** Live product list for the §1.4 SKU / Urdu-name columns. */
  products?: Product[];
  assets?: PrintAssets | null;
  /** The SaleReturn (credit) / PurchaseReturn (debit) the note
   *  wraps — supplies the settlement legs' amounts. */
  sourceReturn?: SaleReturn | PurchaseReturn | null;
  /** The original purchase's ts (debit notes) for its reference. */
  purchaseTs?: string | null;
}) {
  const { t, lang } = useLang();
  const design = resolvePrintDesign(settings);
  const dateFmt = (ts: string) =>
    new Date(ts).toLocaleDateString(DATE_LOCALES[lang], {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const isCredit = note.kind === "credit";
  const taxGroups = taxLinesForItems(note.items);
  const sr = sourceReturn ?? null;
  const cashLeg = sr
    ? isCredit
      ? (sr as SaleReturn).refundAmount
      : (sr as PurchaseReturn).refundAmount
    : 0;
  const claimLeg = sr
    ? isCredit
      ? ((sr as SaleReturn).creditReduction ?? 0)
      : (sr as PurchaseReturn).payableOffset
    : 0;

  return (
    <div className="receipt-sheet" aria-hidden="true">
      <PrintPageStyle paper={design.paper} />
      <div className={receiptClassName(design)}>
        <PrintHeader settings={settings} design={design} assets={assets} />
        <div className="r-title">
          <span>
            {isCredit ? t("note.print.creditTitle") : t("note.print.debitTitle")}
          </span>
          <span>{note.number}</span>
        </div>
        <div className="r-meta">
          <span>{t("common.date")}</span>
          <span>{dateFmt(note.ts)}</span>
        </div>
        <div className="r-meta">
          <span>{isCredit ? t("billing.rcpt.customer") : t("doc.supplier")}</span>
          <span>{note.partyName}</span>
        </div>
        <div className="r-meta">
          <span>
            {isCredit
              ? t("note.print.againstBill", { no: note.billNo ?? "" })
              : t("note.print.againstPurchase", {
                  date: purchaseTs ? dateFmt(purchaseTs) : "",
                })}
          </span>
          <span></span>
        </div>
        <PrintItemsTable
          lines={note.items.map((l) => ({
            productId: l.productId,
            name: l.name,
            qty: l.qty,
            unitPrice: l.unitPrice,
            amount: l.total,
            taxAmount: l.taxAmount,
          }))}
          design={design}
          kind="note"
          products={products}
          discountAmount={0}
        />
        <div className="r-row">
          <span>{t("note.print.goods")}</span>
          <span>{fmtPKR(note.goodsAmount)}</span>
        </div>
        {taxGroups.map((g) => (
          <div className="r-row" key={`${g.name}-${g.inclusive ? "in" : "ex"}`}>
            <span>
              {t("note.print.tax")} — {g.name}
              {g.kind === "percent" ? ` ${g.rate}%` : ""}
              {g.inclusive ? " (incl.)" : ""}
            </span>
            <span>{fmtPKR(g.amount)}</span>
          </div>
        ))}
        <div className="r-row total">
          <span>{t("billing.rcpt.total")}</span>
          <span>{fmtPKR(note.total)}</span>
        </div>
        {sr ? (
          <>
            {claimLeg > 0 && (
              <div className="r-row">
                <span>
                  {isCredit ? t("note.print.udhaarReduced") : t("note.print.payableReduced")}
                </span>
                <span>{fmtPKR(claimLeg)}</span>
              </div>
            )}
            {cashLeg > 0 && (
              <div className="r-row">
                <span>
                  {isCredit ? t("note.print.refundedCash") : t("note.print.cashBack")}
                </span>
                <span>{fmtPKR(cashLeg)}</span>
              </div>
            )}
          </>
        ) : (
          <div className="r-row">
            <span>{t("note.settlement")}</span>
            <span>
              {note.settlement === "cash_refund"
                ? t("note.settle.cash_refund")
                : note.settlement === "credit_reduction"
                  ? t("note.settle.credit_reduction")
                  : t("note.settle.payable_offset")}
            </span>
          </div>
        )}
        {note.reason && <div className="r-meta">{note.reason}</div>}
        <div className="r-shop" style={{ marginTop: 6 }}>
          {t("note.print.footer")}
        </div>
        <PrintFooter settings={settings} design={design} doc={{ kind: "note" }} assets={assets} />
      </div>
    </div>
  );
}

/**
 * Phase C · C2 — the stock transfer print: the movement note
 * that travels with the goods. Quantities only — NO prices, NO
 * amounts — because a transfer moves stock between the shop's
 * own warehouses and no value changes hands (§2.3). Both the
 * sent and received columns print: the gap between them IS the
 * document's story (still on the road, or closed short).
 */
export function TransferPrintSheet({
  transfer,
  settings,
  assets,
  fromName,
  toName,
}: {
  transfer: StockTransfer;
  settings: ShopSettings;
  assets?: PrintAssets | null;
  fromName: string;
  toName: string;
}) {
  const { t, lang } = useLang();
  const design = resolvePrintDesign(settings);
  const dateStr = new Date(transfer.ts).toLocaleDateString(
    DATE_LOCALES[lang],
    { day: "numeric", month: "short", year: "numeric" }
  );

  return (
    <div className="receipt-sheet" aria-hidden="true">
      <PrintPageStyle paper={design.paper} />
      <div className={receiptClassName(design)}>
        <PrintHeader settings={settings} design={design} assets={assets} />
        <div className="r-title">
          <span>{t("tr.print.title")}</span>
          <span>{transfer.number ?? t("doc.draftLabel")}</span>
        </div>
        <div className="r-meta">
          <span>{t("common.date")}</span>
          <span>{dateStr}</span>
        </div>
        <div className="r-meta">
          <span>{t("tr.form.from")}</span>
          <span>{fromName}</span>
        </div>
        <div className="r-meta">
          <span>{t("tr.form.to")}</span>
          <span>{toName}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t("billing.rcpt.item")}</th>
              <th className="num">{t("tr.col.sent")}</th>
              <th className="num">{t("tr.col.received")}</th>
            </tr>
          </thead>
          <tbody>
            {transfer.lines.map((l) => (
              <tr key={l.productId}>
                <td>{l.name}</td>
                <td className="num">{fmtQty(l.qtySent)}</td>
                <td className="num">{fmtQty(l.qtyReceived)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {transfer.note && <div className="r-meta">{transfer.note}</div>}
        <div className="r-shop" style={{ marginTop: 6 }}>
          {t("tr.print.quantitiesNote")}
        </div>
        <div className="r-meta" style={{ marginTop: 14 }}>
          <span>{t("tr.print.dispatchedBy")}</span>
          <span>____________________</span>
        </div>
        <div className="r-meta" style={{ marginTop: 10 }}>
          <span>{t("tr.print.receivedBy")}</span>
          <span>____________________</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Phase C · C4 — the production order print: the factory
 * floor's paper record. The order's header (recipe version,
 * warehouse, plan), its derived progress (produced / still in
 * progress), the snapshotted recipe and the full event log
 * with the value each event moved — the same derivations the
 * screen shows (lib/production), printed from the same data.
 */
export function ProductionPrintSheet({
  order,
  settings,
  assets,
  warehouseName,
}: {
  order: ProductionOrder;
  settings: ShopSettings;
  assets?: PrintAssets | null;
  warehouseName: string;
}) {
  const { t, lang } = useLang();
  const design = resolvePrintDesign(settings);
  const dateStr = new Date(order.ts).toLocaleDateString(
    DATE_LOCALES[lang],
    { day: "numeric", month: "short", year: "numeric" }
  );
  const produced = producedQty(order);
  const pool = poolOf(order);
  const evKey = {
    issue: "mfg.ev.issue",
    completion: "mfg.ev.completion",
    scrap: "mfg.ev.scrap",
    closeout: "mfg.ev.closeout",
  } as const;

  return (
    <div className="receipt-sheet" aria-hidden="true">
      <PrintPageStyle paper={design.paper} />
      <div className={receiptClassName(design)}>
        <PrintHeader settings={settings} design={design} assets={assets} />
        <div className="r-title">
          <span>{t("mfg.print.title")}</span>
          <span>{order.number ?? t("mfg.po.draftLabel")}</span>
        </div>
        <div className="r-meta">
          <span>{t("common.date")}</span>
          <span>{dateStr}</span>
        </div>
        <div className="r-meta">
          <span>{t("mfg.form.output")}</span>
          <span>{order.outputName}</span>
        </div>
        <div className="r-meta">
          <span>{t("wh.pickerLabel")}</span>
          <span>{warehouseName}</span>
        </div>
        <div className="r-meta">
          <span>{t("mfg.print.planned")}</span>
          <span>{fmtQty(order.plannedQty)}</span>
        </div>
        <div className="r-meta">
          <span>{t("mfg.print.produced")}</span>
          <span>{fmtQty(produced)}</span>
        </div>
        <div className="r-meta">
          <span>{t("mfg.print.pool")}</span>
          <span>{fmtPKR(pool)}</span>
        </div>

        <div className="r-title" style={{ marginTop: 10 }}>
          <span>{t("mfg.print.components")}</span>
          <span>
            {t("mfg.version", { v: order.bomVersion })}
          </span>
        </div>
        <table>
          <tbody>
            {order.bomSnapshot.lines.map((l) => (
              <tr key={l.productId}>
                <td>{l.name}</td>
                <td className="num">{fmtQty(l.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="r-title" style={{ marginTop: 10 }}>
          <span>{t("mfg.print.events")}</span>
          <span></span>
        </div>
        <table>
          <thead>
            <tr>
              <th>{t("mfg.print.events")}</th>
              <th className="num">{t("mfg.form.qty")}</th>
              <th className="num">{t("common.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {order.events.map((e, i) => (
              <tr key={`${e.entryId}-${i}`}>
                <td>
                  {t(evKey[e.kind])}
                  {e.kind === "issue" && e.lines && (
                    <div style={{ fontSize: "0.82em", opacity: 0.75 }}>
                      {e.lines
                        .map((l) => `${l.name} × ${fmtQty(l.qty)}`)
                        .join(" · ")}
                    </div>
                  )}
                </td>
                <td className="num">{e.qty > 0 ? fmtQty(e.qty) : "—"}</td>
                <td className="num">{fmtPKR(e.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {order.note && <div className="r-meta">{order.note}</div>}
      </div>
    </div>
  );
}

/**
 * Phase C · C5 — the job WORK SLIP (design §5.1): the customer's
 * paper — job number, the work, stage and due date — plus the
 * materials the job has consumed so far. The number on this
 * slip is the one minted at creation; the customer walks away
 * with it.
 */
export function JobPrintSheet({
  job,
  settings,
  assets,
  warehouseName,
}: {
  job: Job;
  settings: ShopSettings;
  assets?: PrintAssets | null;
  warehouseName: string;
}) {
  const { t, lang } = useLang();
  const design = resolvePrintDesign(settings);
  const dateStr = new Date(job.ts).toLocaleDateString(
    DATE_LOCALES[lang],
    { day: "numeric", month: "short", year: "numeric" }
  );
  const dueStr = job.dueDateISO
    ? new Date(`${job.dueDateISO}T00:00:00`).toLocaleDateString(
        DATE_LOCALES[lang],
        { day: "numeric", month: "short", year: "numeric" }
      )
    : "—";
  const evKey = {
    issue: "job.ev.issue",
    return: "job.ev.return",
  } as const;

  return (
    <div className="receipt-sheet" aria-hidden="true">
      <PrintPageStyle paper={design.paper} />
      <div className={receiptClassName(design)}>
        <PrintHeader settings={settings} design={design} assets={assets} />
        <div className="r-title">
          <span>{t("job.print.title")}</span>
          <span>{job.number}</span>
        </div>
        <div className="r-meta">
          <span>{t("common.date")}</span>
          <span>{dateStr}</span>
        </div>
        <div className="r-meta">
          <span>{t("job.print.customer")}</span>
          <span>
            {job.customerName}
            {job.customerPhone ? ` · ${job.customerPhone}` : ""}
          </span>
        </div>
        <div className="r-meta">
          <span>{t("job.form.title")}</span>
          <span>{job.title}</span>
        </div>
        {job.description && (
          <div className="r-meta">
            <span></span>
            <span>{job.description}</span>
          </div>
        )}
        <div className="r-meta">
          <span>{t("job.print.stage")}</span>
          <span>{job.stage}</span>
        </div>
        <div className="r-meta">
          <span>{t("job.print.due")}</span>
          <span>{dueStr}</span>
        </div>
        <div className="r-meta">
          <span>{t("wh.pickerLabel")}</span>
          <span>{warehouseName}</span>
        </div>

        <div className="r-title" style={{ marginTop: 10 }}>
          <span>{t("job.print.materials")}</span>
          <span></span>
        </div>
        {job.materialEvents.length === 0 ? (
          <div className="r-meta">{t("job.print.noMaterials")}</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{t("job.mat.product")}</th>
                <th className="num">{t("job.mat.qty")}</th>
                <th className="num">{t("common.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {job.materialEvents.map((e, i) => (
                <tr key={`${e.entryId}-${i}`}>
                  <td>
                    {t(evKey[e.kind])} · {e.name}
                  </td>
                  <td className="num">{fmtQty(e.qty)}</td>
                  <td className="num">{fmtPKR(e.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="r-meta" style={{ marginTop: 8 }}>
          <span>{t("job.print.net")}</span>
          <span>{fmtPKR(jobMaterialsCost(job))}</span>
        </div>
        {job.labourCost > 0 && (
          <div className="r-meta">
            <span>{t("job.print.labour")}</span>
            <span>{fmtPKR(job.labourCost)}</span>
          </div>
        )}
        {job.note && <div className="r-meta">{job.note}</div>}
        <div className="r-meta" style={{ marginTop: 16 }}>
          <span>{t("job.print.receivedBy")}</span>
          <span>____________________</span>
        </div>
        <PrintFooter settings={settings} design={design} doc={{ kind: "job" }} assets={assets} />
      </div>
    </div>
  );
}

/**
 * Phase D · D2 — the SALARY SLIP (design §2.7): one employee's
 * paper for one posted run. A DUMB renderer like every sheet
 * here: the desk passes the run line SNAPSHOT (earnings,
 * deductions — what finalised) plus the §2.7 figures DERIVED
 * from the journal at print time (advance before/recovered,
 * cash paid, still owed) — the slip stores nothing of its own,
 * and a reprint after later activity shows the current derived
 * figures against the frozen snapshot, exactly as designed.
 */
export function SalarySlipSheet({
  run,
  line,
  designation,
  figures,
  settings,
  assets,
}: {
  run: PayrollRun;
  line: PayrollRunLine;
  designation: string;
  figures: {
    advanceBefore: number;
    advanceRecovered: number;
    cashPaid: number;
    stillOwed: number;
  };
  settings: ShopSettings;
  assets?: PrintAssets | null;
}) {
  const { t } = useLang();
  const design = resolvePrintDesign(settings);
  const advanceAfter = Math.max(
    0,
    Math.round((figures.advanceBefore - figures.advanceRecovered) * 100) / 100
  );
  return (
    <div className="receipt-sheet" aria-hidden="true">
      <PrintPageStyle paper={design.paper} />
      <div className={receiptClassName(design)}>
        <PrintHeader settings={settings} design={design} assets={assets} />
        <div className="r-title">
          <span>{t("slip.title")}</span>
          <span>{run.number ?? ""}</span>
        </div>
        <div className="r-meta">
          <span>{t("slip.month")}</span>
          <span>{run.month}</span>
        </div>
        <div className="r-meta">
          <span>{t("slip.employee")}</span>
          <span>{line.name}</span>
        </div>
        {designation && (
          <div className="r-meta">
            <span>{t("slip.designation")}</span>
            <span>{designation}</span>
          </div>
        )}
        <div className="r-meta">
          <span>{t("slip.attendance")}</span>
          <span>
            {t("slip.att.counts", {
              present: line.present,
              absent: line.absent,
              half: line.half,
              leave: line.leave,
            })}
            {" · "}
            {t("slip.att.days", { days: line.daysInMonth })}
          </span>
        </div>

        <div className="r-title" style={{ marginTop: 10 }}>
          <span>{t("slip.earnings")}</span>
          <span></span>
        </div>
        <table>
          <tbody>
            <tr>
              <td>{t("slip.base")}</td>
              <td className="num">{fmtPKR(line.earnedBase)}</td>
            </tr>
            {line.allowances.map((a, i) => (
              <tr key={`al-${i}`}>
                <td>{a.label}</td>
                <td className="num">{fmtPKR(a.amount)}</td>
              </tr>
            ))}
            <tr>
              <td>
                <b>{t("slip.gross")}</b>
              </td>
              <td className="num">
                <b>{fmtPKR(line.gross)}</b>
              </td>
            </tr>
          </tbody>
        </table>

        {line.deductions.length > 0 && (
          <>
            <div className="r-title" style={{ marginTop: 10 }}>
              <span>{t("slip.deductions")}</span>
              <span></span>
            </div>
            <table>
              <tbody>
                {line.deductions.map((d, i) => (
                  <tr key={`de-${i}`}>
                    <td>{d.label}</td>
                    <td className="num">− {fmtPKR(d.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <div className="r-total">
          <span>{t("slip.net")}</span>
          <span>{fmtPKR(line.netAccrued)}</span>
        </div>

        {(figures.advanceBefore > 0 || figures.advanceRecovered > 0) && (
          <>
            <div className="r-title" style={{ marginTop: 10 }}>
              <span>{t("slip.advances")}</span>
              <span></span>
            </div>
            <div className="r-meta">
              <span>{t("slip.advBefore")}</span>
              <span>{fmtPKR(figures.advanceBefore)}</span>
            </div>
            <div className="r-meta">
              <span>{t("slip.advRecovered")}</span>
              <span>{fmtPKR(figures.advanceRecovered)}</span>
            </div>
            <div className="r-meta">
              <span>{t("slip.advAfter")}</span>
              <span>{fmtPKR(advanceAfter)}</span>
            </div>
          </>
        )}
        <div className="r-meta" style={{ marginTop: 8 }}>
          <span>{t("slip.paid")}</span>
          <span>{fmtPKR(figures.cashPaid)}</span>
        </div>
        <div className="r-meta">
          <span>{t("slip.stillOwed")}</span>
          <span>{fmtPKR(figures.stillOwed)}</span>
        </div>
        {run.note && <div className="r-meta">{run.note}</div>}
        <PrintFooter settings={settings} design={design} doc={{ kind: "salarySlip" }} assets={assets} />
      </div>
    </div>
  );
}
