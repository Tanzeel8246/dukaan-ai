"use client";

/**
 * Phase B · B1 — the receipt-style print sheet for a quotation or a
 * sale order (design §1.1: documents print like bills, clearly
 * labelled as what they are). Fully dictionary-driven like the bill
 * receipt; figures are ESTIMATES (§7) and the sheet says so.
 *
 * B2 adds the delivery-challan sheet: a delivery note in the same
 * machinery — quantities ONLY, no prices, no totals (§2.3). A
 * challan's prices can never become a second price promise, so
 * they are never printed.
 *
 * B4 adds the credit/debit NOTE sheet (§3.4): the formal paper for
 * a return that already posted — original document reference, the
 * returned lines, per-slab tax lines from the A4 snapshots on the
 * note's stamped items, goods/tax/total and the settlement legs.
 */
import { useLang } from "./LangProvider";
import { fmtPKR } from "@/lib/format";
import { taxLinesForItems } from "@/lib/tax";
import type { VoucherPrintData } from "@/lib/documents";
import type { I18nKey } from "@/lib/i18n";
import { poolOf, producedQty } from "@/lib/production";
import { jobMaterialsCost } from "@/lib/jobs";
import type {
  DeliveryChallan,
  DocNote,
  Job,
  PayrollRun,
  PayrollRunLine,
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

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

interface Props {
  doc: Quotation | SaleOrder;
  kind: "quotation" | "order";
  settings: ShopSettings;
  /** "From quotation QT-7" — shown on an order born of a quotation. */
  sourceLabel?: string;
}

export default function DocPrintSheet({ doc, kind, settings, sourceLabel }: Props) {
  const { t, lang } = useLang();
  const dateStr = new Date(doc.ts).toLocaleDateString(
    lang === "ur" ? "ur-PK" : "en-PK",
    { day: "numeric", month: "short", year: "numeric" }
  );
  const dateField =
    kind === "quotation"
      ? (doc as Quotation).validUntil
      : (doc as SaleOrder).expectedDate;

  return (
    <div className="receipt-sheet" aria-hidden="true">
      <div className="receipt">
        <h3>{settings.shopName}</h3>
        <div className="r-shop">
          {settings.address ? `${settings.address} · ` : ""}
          {settings.phone}
        </div>
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
        <table>
          <thead>
            <tr>
              <th>{t("billing.rcpt.item")}</th>
              <th className="num">{t("billing.rcpt.qty")}</th>
              <th className="num">{t("billing.rcpt.price")}</th>
              <th className="num">{t("billing.rcpt.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l) => (
              <tr key={l.productId}>
                <td>{l.name}</td>
                <td className="num">{fmtQty(l.qty)}</td>
                <td className="num">{fmtPKR(l.unitPrice)}</td>
                <td className="num">{fmtPKR(l.qty * l.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
        <div className="r-foot">{t("billing.rcpt.thanks")}</div>
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
}: {
  data: VoucherPrintData;
  settings: ShopSettings;
}) {
  const { t, lang } = useLang();
  const dateStr = new Date(data.ts).toLocaleDateString(
    lang === "ur" ? "ur-PK" : "en-PK",
    { day: "numeric", month: "short", year: "numeric" }
  );
  const isReceipt = data.kind === "receipt";

  return (
    <div className="receipt-sheet" aria-hidden="true">
      <div className="receipt">
        <h3>{settings.shopName}</h3>
        <div className="r-shop">
          {settings.address ? `${settings.address} · ` : ""}
          {settings.phone}
        </div>
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
        <div className="r-meta" style={{ marginTop: 14 }}>
          <span>{t("voucher.signature")}</span>
          <span>____________________</span>
        </div>
        <div className="r-foot">{t("billing.rcpt.thanks")}</div>
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
  sourceOrderLabel,
}: {
  doc: DeliveryChallan;
  settings: ShopSettings;
  /** "SO-7" when the challan cites a sale order. */
  sourceOrderLabel?: string;
}) {
  const { t, lang } = useLang();
  const dateStr = new Date(doc.ts).toLocaleDateString(
    lang === "ur" ? "ur-PK" : "en-PK",
    { day: "numeric", month: "short", year: "numeric" }
  );

  return (
    <div className="receipt-sheet" aria-hidden="true">
      <div className="receipt">
        <h3>{settings.shopName}</h3>
        <div className="r-shop">
          {settings.address ? `${settings.address} · ` : ""}
          {settings.phone}
        </div>
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
}: {
  doc: PurchaseOrder;
  settings: ShopSettings;
}) {
  const { t, lang } = useLang();
  const dateStr = new Date(doc.ts).toLocaleDateString(
    lang === "ur" ? "ur-PK" : "en-PK",
    { day: "numeric", month: "short", year: "numeric" }
  );

  return (
    <div className="receipt-sheet" aria-hidden="true">
      <div className="receipt">
        <h3>{settings.shopName}</h3>
        <div className="r-shop">
          {settings.address ? `${settings.address} · ` : ""}
          {settings.phone}
        </div>
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
        <div className="r-foot">{t("billing.rcpt.thanks")}</div>
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
  sourceReturn,
  purchaseTs,
}: {
  note: DocNote;
  settings: ShopSettings;
  /** The SaleReturn (credit) / PurchaseReturn (debit) the note
   *  wraps — supplies the settlement legs' amounts. */
  sourceReturn?: SaleReturn | PurchaseReturn | null;
  /** The original purchase's ts (debit notes) for its reference. */
  purchaseTs?: string | null;
}) {
  const { t, lang } = useLang();
  const dateFmt = (ts: string) =>
    new Date(ts).toLocaleDateString(lang === "ur" ? "ur-PK" : "en-PK", {
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
      <div className="receipt">
        <h3>{settings.shopName}</h3>
        <div className="r-shop">
          {settings.address ? `${settings.address} · ` : ""}
          {settings.phone}
        </div>
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
        <table>
          <thead>
            <tr>
              <th>{t("billing.rcpt.item")}</th>
              <th className="num">{t("billing.rcpt.qty")}</th>
              <th className="num">{t("billing.rcpt.price")}</th>
              <th className="num">{t("billing.rcpt.amount")}</th>
            </tr>
          </thead>
          <tbody>
            {note.items.map((l) => (
              <tr key={l.productId}>
                <td>{l.name}</td>
                <td className="num">{fmtQty(l.qty)}</td>
                <td className="num">{fmtPKR(l.unitPrice)}</td>
                <td className="num">{fmtPKR(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
        <div className="r-foot">{t("billing.rcpt.thanks")}</div>
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
  fromName,
  toName,
}: {
  transfer: StockTransfer;
  settings: ShopSettings;
  fromName: string;
  toName: string;
}) {
  const { t, lang } = useLang();
  const dateStr = new Date(transfer.ts).toLocaleDateString(
    lang === "ur" ? "ur-PK" : "en-PK",
    { day: "numeric", month: "short", year: "numeric" }
  );

  return (
    <div className="receipt-sheet" aria-hidden="true">
      <div className="receipt">
        <h3>{settings.shopName}</h3>
        <div className="r-shop">
          {settings.address ? `${settings.address} · ` : ""}
          {settings.phone}
        </div>
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
  warehouseName,
}: {
  order: ProductionOrder;
  settings: ShopSettings;
  warehouseName: string;
}) {
  const { t, lang } = useLang();
  const dateStr = new Date(order.ts).toLocaleDateString(
    lang === "ur" ? "ur-PK" : "en-PK",
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
      <div className="receipt">
        <h3>{settings.shopName}</h3>
        <div className="r-shop">
          {settings.address ? `${settings.address} · ` : ""}
          {settings.phone}
        </div>
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
  warehouseName,
}: {
  job: Job;
  settings: ShopSettings;
  warehouseName: string;
}) {
  const { t, lang } = useLang();
  const dateStr = new Date(job.ts).toLocaleDateString(
    lang === "ur" ? "ur-PK" : "en-PK",
    { day: "numeric", month: "short", year: "numeric" }
  );
  const dueStr = job.dueDateISO
    ? new Date(`${job.dueDateISO}T00:00:00`).toLocaleDateString(
        lang === "ur" ? "ur-PK" : "en-PK",
        { day: "numeric", month: "short", year: "numeric" }
      )
    : "—";
  const evKey = {
    issue: "job.ev.issue",
    return: "job.ev.return",
  } as const;

  return (
    <div className="receipt-sheet" aria-hidden="true">
      <div className="receipt">
        <h3>{settings.shopName}</h3>
        <div className="r-shop">
          {settings.address ? `${settings.address} · ` : ""}
          {settings.phone}
        </div>
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
}) {
  const { t } = useLang();
  const advanceAfter = Math.max(
    0,
    Math.round((figures.advanceBefore - figures.advanceRecovered) * 100) / 100
  );
  return (
    <div className="receipt-sheet" aria-hidden="true">
      <div className="receipt">
        <h3>{settings.shopName}</h3>
        <div className="r-shop">
          {settings.address ? `${settings.address} · ` : ""}
          {settings.phone}
        </div>
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
        <div className="r-meta" style={{ marginTop: 16 }}>
          <span>{t("slip.signature")}</span>
          <span>____________________</span>
        </div>
      </div>
    </div>
  );
}
