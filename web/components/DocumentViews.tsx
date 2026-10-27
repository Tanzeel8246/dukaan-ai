"use client";

/**
 * Phase B · B1 — the Quotations and Sale Orders workspaces.
 *
 * Both are NON-POSTING surfaces (design §2.2): everything here only
 * ever writes its own document. A quotation becomes a sale order; a
 * sale order becomes a prefilled draft on the billing desk, which is
 * the only place a bill can ever post. Fulfilment figures are
 * DERIVED from the documents that cite the parent (§2.1) — never
 * stored counters.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore, type DocLineInput } from "./StoreProvider";
import PermDenied from "./PermDenied";
import DocLineEditor from "./DocLineEditor";
import DocPrintSheet, { ChallanPrintSheet, PoPrintSheet } from "./DocPrintSheet";
import { useLang } from "./LangProvider";
import type { I18nKey } from "@/lib/i18n";
import { IconPlus, IconSearch, IconSend, SearchClear } from "./ui";
import { fmtDate, fmtDateShort, fmtPKR } from "@/lib/format";
import { STOCK_DEDUCTION_NOTE } from "@/lib/workflow";
import { brandingDataUrls } from "@/lib/branding";
import { matchesAny } from "@/lib/search";
import { can } from "@/lib/permissions";
import {
  challanBilledQty,
  deriveChallanStatus,
  deriveOrderStatus,
  derivePoStatus,
  displayQuotationStatus,
  nextDocNumber,
  orderBilledQty,
  orderDeliveredQty,
  poReceivedQty,
  quotationConvertedTotalQty,
  remainingQty,
} from "@/lib/documents";
import type {
  Customer,
  DeliveryChallan,
  Product,
  PurchaseOrder,
  Quotation,
  SaleOrder,
  Warehouse,
} from "@/lib/types";

/* ---------------------------------- shared --------------------------------- */

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_KEY: Record<string, I18nKey> = {
  draft: "doc.status.draft",
  issued: "doc.status.issued",
  accepted: "doc.status.accepted",
  rejected: "doc.status.rejected",
  expired: "doc.status.expired",
  converted: "doc.status.converted",
  cancelled: "doc.status.cancelled",
  open: "doc.status.open",
  partially_fulfilled: "doc.status.partially_fulfilled",
  fulfilled: "doc.status.fulfilled",
  dispatched: "doc.status.dispatched",
  partially_billed: "doc.status.partially_billed",
  billed: "doc.status.billed",
  partially_received: "doc.status.partially_received",
  received: "doc.status.received",
};

const STATUS_CLS: Record<string, string> = {
  draft: "badge amber",
  issued: "badge",
  accepted: "badge green",
  rejected: "badge red",
  expired: "badge amber",
  converted: "badge green",
  cancelled: "badge red",
  open: "badge",
  partially_fulfilled: "badge amber",
  fulfilled: "badge green",
  dispatched: "badge",
  partially_billed: "badge amber",
  billed: "badge green",
  partially_received: "badge amber",
  received: "badge green",
};

function Badge({ status }: { status: string }) {
  const { t } = useLang();
  return (
    <span className={STATUS_CLS[status] ?? "badge"}>
      {t(STATUS_KEY[status] ?? "doc.status.draft")}
    </span>
  );
}

interface FormValues {
  customerId: string;
  customerName: string;
  customerPhone: string;
  lines: DocLineInput[];
  discountType: "flat" | "percent";
  discountValue: string;
  date: string;
  note: string;
  /** Phase C · C1: the warehouse preference — only the SALE ORDER
   *  form renders it (quotations are location-free, §12.3). */
  warehouseId: string;
}

function emptyForm(): FormValues {
  return {
    customerId: "",
    customerName: "",
    customerPhone: "",
    lines: [],
    discountType: "percent",
    discountValue: "",
    date: "",
    note: "",
    warehouseId: "",
  };
}

function formFromDoc(doc: Quotation | SaleOrder, date: string): FormValues {
  return {
    customerId: doc.customerId ?? "",
    customerName: doc.customerName,
    customerPhone: doc.customerPhone,
    lines: doc.lines.map((l) => ({
      productId: l.productId,
      qty: l.qty,
      unitPrice: l.unitPrice,
    })),
    discountType: doc.discountType,
    discountValue: doc.discountValue ? String(doc.discountValue) : "",
    date,
    note: doc.note,
    warehouseId: "warehouseId" in doc ? doc.warehouseId ?? "" : "",
  };
}

/** Mirror of the store's line validation, so the form can name the
 *  problem instead of failing silently (dictionary doc.err*). */
function validateLines(lines: DocLineInput[]): I18nKey | null {
  if (lines.length === 0) return "doc.errNoLines";
  if (lines.some((l) => !(l.qty > 0))) return "doc.errQtyZero";
  if (lines.some((l) => !(l.unitPrice > 0))) return "doc.errPriceZero";
  return null;
}

function DocForm({
  title,
  sub,
  values,
  setValues,
  customers,
  products,
  dateLabel,
  onSubmit,
  onCancel,
  warehouseField,
}: {
  title: I18nKey;
  sub: I18nKey;
  values: FormValues;
  setValues: (v: FormValues) => void;
  customers: Customer[];
  products: Product[];
  dateLabel: I18nKey;
  onSubmit: () => void;
  onCancel: () => void;
  /** Phase C · C1: when provided, the form offers the warehouse
   *  preference field (sale orders only — quotations stay
   *  location-free, §12.3). */
  warehouseField?: Warehouse[];
}) {
  const { t } = useLang();
  const set = (patch: Partial<FormValues>) => setValues({ ...values, ...patch });
  const onCustomer = (id: string) => {
    const c = customers.find((x) => x.id === id);
    set({
      customerId: id,
      customerName: c ? c.name : values.customerName,
      customerPhone: c ? c.phone : values.customerPhone,
    });
  };
  return (
    <div className="card" style={{ marginBottom: 22 }}>
      <h3 style={{ margin: "0 0 4px" }}>{t(title)}</h3>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: "0 0 16px" }}>
        {t(sub)}
      </p>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="doc-customer">{t("doc.customer")}</label>
          <select
            id="doc-customer"
            value={values.customerId}
            onChange={(e) => onCustomer(e.target.value)}
          >
            <option value="">{t("doc.customerSelect")}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.phone ? ` — ${c.phone}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="doc-cust-name">{t("doc.customerNamePh")}</label>
          <input
            id="doc-cust-name"
            value={values.customerName}
            placeholder={t("doc.customerNamePh")}
            onChange={(e) => set({ customerName: e.target.value, customerId: "" })}
          />
        </div>
        <div className="field">
          <label htmlFor="doc-cust-phone">{t("common.phone")}</label>
          <input
            id="doc-cust-phone"
            value={values.customerPhone}
            onChange={(e) => set({ customerPhone: e.target.value })}
          />
        </div>
      </div>

      <DocLineEditor
        products={products}
        lines={values.lines}
        onChange={(lines) => set({ lines })}
      />

      <div className="form-grid" style={{ marginTop: 14 }}>
        <div className="field">
          <label htmlFor="doc-discount">{t("doc.discount")}</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="doc-discount"
              type="number"
              min={0}
              step="any"
              value={values.discountValue}
              onChange={(e) => set({ discountValue: e.target.value })}
              style={{ flex: 1 }}
            />
            <select
              aria-label={t("doc.discount")}
              value={values.discountType}
              onChange={(e) =>
                set({ discountType: e.target.value as "flat" | "percent" })
              }
            >
              <option value="percent">{t("doc.discountPercent")}</option>
              <option value="flat">{t("doc.discountFlat")}</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="doc-date">{t(dateLabel)}</label>
          <input
            id="doc-date"
            type="date"
            value={values.date}
            onChange={(e) => set({ date: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="doc-note">{t("doc.note")}</label>
          <input
            id="doc-note"
            value={values.note}
            placeholder={t("doc.notePh")}
            onChange={(e) => set({ note: e.target.value })}
          />
        </div>
        {warehouseField && (
          <div className="field">
            <label htmlFor="doc-warehouse">{t("wh.pickerLabel")}</label>
            <select
              id="doc-warehouse"
              value={values.warehouseId}
              onChange={(e) => set({ warehouseId: e.target.value })}
            >
              <option value="">{t("wh.pickerUseDefault")}</option>
              {warehouseField
                .filter((w) => !w.archived)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.isDefault ? ` ${t("wh.pickerDefaultSuffix")}` : ""}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" onClick={onSubmit}>
          {t("action.save")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          {t("action.cancel")}
        </button>
      </div>
    </div>
  );
}

function TotalsBlock({ doc }: { doc: Quotation | SaleOrder }) {
  const { t } = useLang();
  return (
    <div style={{ maxWidth: 340, marginInlineStart: "auto", display: "grid", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "var(--muted)" }}>{t("doc.subtotal")}</span>
        <span>{fmtPKR(doc.subtotal)}</span>
      </div>
      {doc.discountAmount > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--muted)" }}>{t("doc.discount")}</span>
          <span>− {fmtPKR(doc.discountAmount)}</span>
        </div>
      )}
      {doc.estimatedTax > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--muted)" }}>{t("doc.estTax")}</span>
          <span>{fmtPKR(doc.estimatedTax)}</span>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid var(--line)",
          paddingTop: 6,
          fontWeight: 700,
        }}
      >
        <span>{t("doc.total")}</span>
        <span>{fmtPKR(doc.total)}</span>
      </div>
      <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "6px 0 0" }}>
        {t("doc.estimateNote")}
      </p>
    </div>
  );
}

function Notice({ notice }: { notice: { ok: boolean; text: string } | null }) {
  if (!notice) return null;
  return (
    <div
      className={notice.ok ? "note-box" : "form-error"}
      style={
        notice.ok
          ? { marginBottom: 16, borderStyle: "solid", borderColor: "var(--accent)" }
          : { marginBottom: 16 }
      }
      role="status"
    >
      {notice.text}
    </div>
  );
}

function ConfirmRow({
  title,
  body,
  confirmLabel,
  onConfirm,
  onKeep,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onKeep: () => void;
}) {
  const { t } = useLang();
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
        marginTop: 12,
        padding: "10px 14px",
        border: "1px solid var(--line)",
        borderRadius: 12,
      }}
      role="alertdialog"
      aria-label={title}
    >
      <div style={{ flex: "1 1 260px" }}>
        <b>{title}</b>
        <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{body}</div>
      </div>
      <button type="button" className="btn btn-danger btn-sm" onClick={onConfirm}>
        {confirmLabel}
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onKeep}>
        {t("doc.keep")}
      </button>
    </div>
  );
}

function LinesTable({
  doc,
  doneMap,
  doneLabel,
  doneMap2,
  doneLabel2,
}: {
  doc: Quotation | SaleOrder;
  doneMap: Map<string, number>;
  doneLabel: I18nKey;
  /** Optional second fulfilment column (B2: delivered, for orders). */
  doneMap2?: Map<string, number>;
  doneLabel2?: I18nKey;
}) {
  const { t } = useLang();
  return (
    <div className="table-wrap" style={{ marginBottom: 14 }}>
      <table className="table">
        <thead>
          <tr>
            <th>{t("doc.lines.product")}</th>
            <th className="num">{t(doneLabel)}</th>
            {doneMap2 && doneLabel2 && <th className="num">{t(doneLabel2)}</th>}
            <th className="num">{t("doc.remainingQty")}</th>
            <th className="num">{t("doc.lines.qty")}</th>
            <th className="num">{t("doc.lines.price")}</th>
            <th className="num">{t("doc.lines.amount")}</th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((l) => {
            const done = doneMap.get(l.productId) ?? 0;
            return (
              <tr key={l.productId}>
                <td>{l.name}</td>
                <td className="num">{fmtQty(done)}</td>
                {doneMap2 && (
                  <td className="num">{fmtQty(doneMap2.get(l.productId) ?? 0)}</td>
                )}
                <td className="num">{fmtQty(remainingQty(l.qty, doneMap, l.productId))}</td>
                <td className="num">{fmtQty(l.qty)}</td>
                <td className="num">{fmtPKR(l.unitPrice)}</td>
                <td className="num">{fmtPKR(l.qty * l.unitPrice)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ConvertPanel({
  doc,
  doneMap,
  picks,
  setPicks,
  actionLabel,
  onConvert,
}: {
  doc: Quotation | SaleOrder | DeliveryChallan;
  doneMap: Map<string, number>;
  picks: Record<string, string>;
  setPicks: (p: Record<string, string>) => void;
  actionLabel: I18nKey;
  onConvert: () => void;
}) {
  const { t } = useLang();
  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
      <h4 style={{ margin: "0 0 10px" }}>{t("doc.convertQtyTitle")}</h4>
      <div style={{ display: "grid", gap: 8 }}>
        {doc.lines.map((l) => {
          const remaining = remainingQty(l.qty, doneMap, l.productId);
          return (
            <div
              key={l.productId}
              style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
            >
              <span style={{ flex: "1 1 160px" }}>{l.name}</span>
              <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                {t("doc.remainingQty")}: {fmtQty(remaining)}
              </span>
              <input
                type="number"
                step="any"
                min={0}
                max={remaining}
                value={picks[l.productId] ?? ""}
                onChange={(e) => setPicks({ ...picks, [l.productId]: e.target.value })}
                style={{ width: 100 }}
                aria-label={l.name}
              />
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="btn btn-primary"
        style={{ marginTop: 12 }}
        onClick={onConvert}
      >
        {t(actionLabel)}
      </button>
    </div>
  );
}

function pickArray(picks: Record<string, string>): Array<{ productId: string; qty: number }> {
  return Object.entries(picks).map(([productId, v]) => ({
    productId,
    qty: parseFloat(v) || 0,
  }));
}

/* -------------------------------- quotations ------------------------------- */

export function QuotationsManager() {
  const { t } = useLang();
  const router = useRouter();
  const store = useStore();
  const { ready, role, settings, customers, products, quotations, saleOrders, bills } = store;

  const canWrite = can(role, "quotations", "write");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Quotation | null>(null);
  const [values, setValues] = useState<FormValues>(emptyForm());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"cancel" | "delete" | null>(null);
  const [showConvert, setShowConvert] = useState(false);
  const [showConvertBill, setShowConvertBill] = useState(false);
  const [confirmBillConvert, setConfirmBillConvert] = useState(false);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [printDoc, setPrintDoc] = useState<Quotation | null>(null);

  const selected = useMemo(
    () => quotations.find((q) => q.id === selectedId) ?? null,
    [quotations, selectedId]
  );

  useEffect(() => {
    setConfirming(null);
    setShowConvert(false);
    setShowConvertBill(false);
    if (selected) {
      const done = quotationConvertedTotalQty(selected, saleOrders, bills);
      const init: Record<string, string> = {};
      for (const l of selected.lines) {
        init[l.productId] = String(remainingQty(l.qty, done, l.productId));
      }
      setPicks(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!ready) return null;
  if (!can(role, "quotations", "view")) return <PermDenied />;

  // lib/search: null-safe (customerName/customerPhone may be absent
  // on documents written by older builds).
  const filtered = quotations.filter((q) =>
    matchesAny(query, [q.number, q.customerName, q.customerPhone])
  );

  const openCreate = () => {
    setEditing(null);
    setValues(emptyForm());
    setFormOpen(true);
    setNotice(null);
  };
  const openEdit = (q: Quotation) => {
    setEditing(q);
    setValues(formFromDoc(q, q.validUntil ?? ""));
    setFormOpen(true);
    setNotice(null);
  };
  const submitForm = () => {
    const err = validateLines(values.lines);
    if (err) {
      setNotice({ ok: false, text: t(err) });
      return;
    }
    const input = {
      customerId: values.customerId || null,
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      lines: values.lines,
      discountType: values.discountType,
      discountValue: parseFloat(values.discountValue) || 0,
      validUntil: values.date || null,
      note: values.note,
    };
    if (editing) {
      if (!store.updateQuotation(editing.id, input)) {
        setNotice({ ok: false, text: t("doc.errNotEditable") });
        return;
      }
      setNotice({ ok: true, text: t("quote.notice.updated") });
    } else {
      const id = store.createQuotation(input);
      if (!id) {
        setNotice({ ok: false, text: t("doc.errNoLines") });
        return;
      }
      setNotice({ ok: true, text: t("quote.notice.created") });
    }
    setFormOpen(false);
    setEditing(null);
  };

  const doIssue = (q: Quotation) => {
    const number = nextDocNumber(
      "quotation",
      quotations.map((x) => x.number),
      settings
    );
    if (store.issueQuotation(q.id)) {
      setNotice({ ok: true, text: t("quote.notice.issued", { number }) });
    }
  };
  const doDecide = (q: Quotation, decision: "accepted" | "rejected") => {
    if (store.decideQuotation(q.id, decision)) {
      setNotice({
        ok: true,
        text: t(decision === "accepted" ? "quote.notice.accepted" : "quote.notice.rejected", {
          number: q.number ?? "",
        }),
      });
    }
  };
  const doConvert = (q: Quotation) => {
    const arr = pickArray(picks);
    if (!arr.some((p) => p.qty > 0)) {
      setNotice({ ok: false, text: t("doc.errNothingRemaining") });
      return;
    }
    const id = store.convertQuotationToOrder(q.id, arr);
    if (!id) {
      setNotice({ ok: false, text: t("doc.errConvertState") });
      return;
    }
    setShowConvert(false);
    setNotice({
      ok: true,
      text: t("quote.notice.converted", { number: q.number ?? t("doc.draftLabel") }),
    });
  };
  const doConvertBill = (q: Quotation) => {
    const arr = pickArray(picks);
    if (!arr.some((p) => p.qty > 0)) {
      setNotice({ ok: false, text: t("doc.errNothingRemaining") });
      return;
    }
    if (!store.convertQuotationToBill(q.id, arr)) {
      setNotice({ ok: false, text: t("doc.errConvertState") });
      return;
    }
    // The draft waits on the billing desk — the only place it posts.
    router.push("/billing");
  };
  const print = (q: Quotation) => {
    setPrintDoc(q);
    setTimeout(() => window.print(), 60);
  };
  /* Phase B · B6 (design §9, stretch): WhatsApp share for a
   * quotation — the bill message pattern (BillingDesk.waHref)
   * reused verbatim: shop name, document line, item lines,
   * discount / estimated-tax lines, total, thanks. Figures are
   * the quotation's ESTIMATES (§7) and the message's tax line
   * says so. Only offered when the quotation carries a phone. */
  const waHref = (q: Quotation): string => {
    const lines = [
      settings.shopName || "Dukaan AI",
      t("quote.wa.title", {
        number: q.number ?? t("doc.draftLabel"),
        date: fmtDate(q.ts),
      }),
      ...q.lines.map((l) =>
        t("billing.wa.itemLine", {
          name: l.name,
          qty: fmtQty(l.qty),
          amount: fmtPKR(l.total),
        })
      ),
      ...(q.discountAmount > 0
        ? [t("billing.wa.discount", { amount: fmtPKR(q.discountAmount) })]
        : []),
      ...(q.estimatedTax > 0
        ? [t("quote.wa.estTax", { amount: fmtPKR(q.estimatedTax) })]
        : []),
      t("billing.wa.total", { amount: fmtPKR(q.total) }),
      ...(q.validUntil
        ? [t("quote.wa.validUntil", { date: q.validUntil })]
        : []),
      t("billing.wa.thanks"),
    ];
    const digits = q.customerPhone.replace(/\D/g, "");
    const intl = digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
    return `https://wa.me/${intl}?text=${encodeURIComponent(lines.join("\n"))}`;
  };

  const selStatus = selected
    ? displayQuotationStatus(selected, saleOrders, todayISO(), bills)
    : null;
  const selConverted = selected
    ? quotationConvertedTotalQty(selected, saleOrders, bills)
    : new Map<string, number>();
  const selLabel = selected ? (selected.number ?? t("doc.draftLabel")) : "";

  return (
    <div className="section">
      <div className="container">
        <div className="section-head" style={{ textAlign: "start", marginBottom: 8 }}>
          <span className="eyebrow">{t("quote.eyebrow")}</span>
          <h2 style={{ fontSize: "1.9rem" }}>{t("quote.title")}</h2>
          <p style={{ marginInlineStart: 0 }}>{t("quote.subtitle")}</p>
        </div>

        <div
          className="sticky-bar"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div className="search-box" style={{ flex: "1 1 260px" }}>
            <IconSearch />
            <input
              type="search"
              placeholder={t("doc.searchPh")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("doc.searchPh")}
            />
            {query && (
              <SearchClear
                onClear={() => setQuery("")}
                label={t("action.clearSearch")}
              />
            )}
          </div>
          {canWrite && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <IconPlus /> {t("quote.new")}
            </button>
          )}
        </div>

        <Notice notice={notice} />

        {formOpen && canWrite && (
          <DocForm
            title={editing ? "quote.form.editTitle" : "quote.form.addTitle"}
            sub="quote.form.sub"
            values={values}
            setValues={setValues}
            customers={customers}
            products={products}
            dateLabel="quote.validUntil"
            onSubmit={submitForm}
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
          />
        )}

        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 22 }}>
          {filtered.length === 0 ? (
            <div className="empty">
              {quotations.length === 0 ? t("quote.empty.none") : t("doc.emptyNoMatch")}
            </div>
          ) : (
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("doc.th.number")}</th>
                    <th>{t("doc.th.date")}</th>
                    <th>{t("doc.th.customer")}</th>
                    <th className="num">{t("doc.th.total")}</th>
                    <th>{t("doc.th.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((q) => (
                    <tr
                      key={q.id}
                      onClick={() => setSelectedId(q.id)}
                      style={{
                        cursor: "pointer",
                        background: q.id === selectedId ? "var(--bg)" : undefined,
                      }}
                    >
                      <td>
                        <b>{q.number ?? t("doc.draftLabel")}</b>
                      </td>
                      <td>{fmtDate(q.ts)}</td>
                      <td>{q.customerName || t("doc.walkIn")}</td>
                      <td className="num">{fmtPKR(q.total)}</td>
                      <td>
                        <Badge status={displayQuotationStatus(q, saleOrders, todayISO(), bills)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && selStatus && (
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0 }}>
                {selLabel} · {selected.customerName || t("doc.walkIn")}
              </h3>
              <Badge status={selStatus} />
            </div>

            <LinesTable doc={selected} doneMap={selConverted} doneLabel="doc.convertedQty" />
            <TotalsBlock doc={selected} />
            {selected.validUntil && (
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                {t("quote.validUntil")}: {selected.validUntil}
                {selStatus === "expired" ? ` · ${t("doc.validityExpired")}` : ""}
              </p>
            )}
            {selected.note && <p style={{ fontSize: "0.85rem" }}>{selected.note}</p>}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              {canWrite && selected.status === "draft" && (
                <>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(selected)}>
                    {t("action.edit")}
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => doIssue(selected)}>
                    {t("quote.issue")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming("delete")}>
                    {t("doc.deleteDraft")}
                  </button>
                </>
              )}
              {canWrite && selected.status === "issued" && (
                <>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => doDecide(selected, "accepted")}>
                    {t("quote.accept")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => doDecide(selected, "rejected")}>
                    {t("quote.reject")}
                  </button>
                </>
              )}
              {canWrite &&
                (selected.status === "issued" || selected.status === "accepted") && (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowConvert((s) => !s)}
                    >
                      {t("quote.convertToOrder")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowConvertBill((s) => !s)}
                    >
                      {t("quote.convertToBill")}
                    </button>
                  </>
                )}
              {canWrite &&
                selected.status !== "cancelled" &&
                selected.status !== "converted" &&
                selected.status !== "rejected" && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming("cancel")}>
                    {t("doc.cancelDoc")}
                  </button>
                )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => print(selected)}>
                {t("action.print")}
              </button>
              {selected.customerPhone && (
                <a
                  className="btn btn-ghost btn-sm"
                  href={waHref(selected)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <IconSend /> {t("action.whatsapp")}
                </a>
              )}
            </div>

            {confirming === "cancel" && (
              <ConfirmRow
                title={t("doc.cancelConfirmTitle")}
                body={t("doc.cancelConfirmBody", { label: selLabel })}
                confirmLabel={t("doc.cancelDoc")}
                onConfirm={() => {
                  if (store.cancelQuotation(selected.id)) {
                    setNotice({ ok: true, text: t("quote.notice.cancelled") });
                  } else {
                    setNotice({ ok: false, text: t("doc.errCancelBlocked") });
                  }
                  setConfirming(null);
                }}
                onKeep={() => setConfirming(null)}
              />
            )}
            {confirming === "delete" && selected.status === "draft" && (
              <ConfirmRow
                title={t("doc.deleteConfirmTitle")}
                body={t("doc.deleteConfirmBody")}
                confirmLabel={t("doc.deleteDraft")}
                onConfirm={() => {
                  store.deleteQuotation(selected.id);
                  setSelectedId(null);
                  setConfirming(null);
                  setNotice({ ok: true, text: t("quote.notice.deleted") });
                }}
                onKeep={() => setConfirming(null)}
              />
            )}

            {showConvert && canWrite && (
              <ConvertPanel
                doc={selected}
                doneMap={selConverted}
                picks={picks}
                setPicks={setPicks}
                actionLabel="quote.convertToOrder"
                onConvert={() => doConvert(selected)}
              />
            )}
            {showConvertBill && canWrite && (
              <ConvertPanel
                doc={selected}
                doneMap={selConverted}
                picks={picks}
                setPicks={setPicks}
                actionLabel="quote.convertToBill"
                onConvert={() => setConfirmBillConvert(true)}
              />
            )}
          </div>
        )}
      </div>
      {confirmBillConvert && selected && (
        <div role="dialog" aria-modal="true" aria-label="Confirm quotation to invoice" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 16 }}>
          <div className="card" style={{ maxWidth: 520, width: "100%" }}>
            <h3 style={{ marginTop: 0 }}>کوٹیشن سے انوائس بنانے کی تصدیق</h3>
            <p>
              کوٹیشن <b>{selected.number ?? ""}</b> سے بل بن رہا ہے۔ انوائس کی تاریخ <b>آج کی تاریخ {fmtDateShort(new Date())}</b> (DD/MM/YYYY) ہو گی —
              کوٹیشن کی تاریخ انوائس پر نہیں لگے گی۔
            </p>
            <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
              بل مکمل ہونے پر ایک متوازن انٹری پوسٹ ہو گی: آمدنی + COGS + اسٹاک میں کمی، اسی انٹری سے۔ {STOCK_DEDUCTION_NOTE} مکمل کنورٹ شدہ کوٹیشن دوبارہ کنورٹ نہیں ہو سکے گی (حیثیت لاک)۔
            </p>
            <p className="hint">ابھی صرف بل کا مسودہ بلنگ ڈیسک پر کھلے گا؛ پوسٹنگ وہیں بل مکمل کرنے پر ہو گی۔</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary" onClick={() => { setConfirmBillConvert(false); setShowConvertBill(false); doConvertBill(selected); }}>
                جی ہاں، بلنگ ڈیسک پر لے جائیں
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmBillConvert(false)}>
                منسوخ کریں
              </button>
            </div>
          </div>
        </div>
      )}
      {printDoc && <DocPrintSheet doc={printDoc} kind="quotation" settings={settings} products={products} assets={brandingDataUrls(store.branding)} />}
    </div>
  );
}

/* -------------------------------- sale orders ------------------------------ */

export function SaleOrdersManager() {
  const { t } = useLang();
  const router = useRouter();
  const store = useStore();
  const {
    ready, role, settings, customers, products, quotations, saleOrders, bills,
    deliveryChallans,
  } = store;

  const canWrite = can(role, "saleOrders", "write");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SaleOrder | null>(null);
  const [values, setValues] = useState<FormValues>(emptyForm());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"cancel" | "delete" | null>(null);
  const [showConvert, setShowConvert] = useState(false);
  const [showChallanConvert, setShowChallanConvert] = useState(false);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [challanPicks, setChallanPicks] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [printDoc, setPrintDoc] = useState<SaleOrder | null>(null);

  const selected = useMemo(
    () => saleOrders.find((o) => o.id === selectedId) ?? null,
    [saleOrders, selectedId]
  );

  useEffect(() => {
    setConfirming(null);
    setShowConvert(false);
    setShowChallanConvert(false);
    if (selected) {
      const billed = orderBilledQty(selected, bills, deliveryChallans);
      const init: Record<string, string> = {};
      for (const l of selected.lines) {
        init[l.productId] = String(remainingQty(l.qty, billed, l.productId));
      }
      setPicks(init);
      const delivered = orderDeliveredQty(selected, deliveryChallans);
      const initC: Record<string, string> = {};
      for (const l of selected.lines) {
        initC[l.productId] = String(remainingQty(l.qty, delivered, l.productId));
      }
      setChallanPicks(initC);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!ready) return null;
  if (!can(role, "saleOrders", "view")) return <PermDenied />;

  const filtered = saleOrders.filter((o) =>
    matchesAny(query, [o.number, o.customerName, o.customerPhone])
  );

  const sourceLabelFor = (o: SaleOrder): string | undefined => {
    if (o.source?.type !== "quotation") return undefined;
    const q = quotations.find((x) => x.id === o.source?.id);
    if (!q) return undefined;
    return q.number
      ? t("doc.fromQuotation", { number: q.number })
      : t("doc.fromQuotationDraft");
  };

  const openCreate = () => {
    setEditing(null);
    setValues(emptyForm());
    setFormOpen(true);
    setNotice(null);
  };
  const openEdit = (o: SaleOrder) => {
    setEditing(o);
    setValues(formFromDoc(o, o.expectedDate ?? ""));
    setFormOpen(true);
    setNotice(null);
  };
  const submitForm = () => {
    const err = validateLines(values.lines);
    if (err) {
      setNotice({ ok: false, text: t(err) });
      return;
    }
    const input = {
      customerId: values.customerId || null,
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      lines: values.lines,
      discountType: values.discountType,
      discountValue: parseFloat(values.discountValue) || 0,
      expectedDate: values.date || null,
      note: values.note,
      // Phase C · C1: the order's warehouse preference (§1.6).
      warehouseId: values.warehouseId || null,
    };
    if (editing) {
      if (!store.updateSaleOrder(editing.id, input)) {
        setNotice({ ok: false, text: t("doc.errNotEditable") });
        return;
      }
      setNotice({ ok: true, text: t("order.notice.updated") });
    } else {
      const id = store.createSaleOrder(input);
      if (!id) {
        setNotice({ ok: false, text: t("doc.errNoLines") });
        return;
      }
      setNotice({ ok: true, text: t("order.notice.created") });
    }
    setFormOpen(false);
    setEditing(null);
  };

  const doConfirm = (o: SaleOrder) => {
    const number = nextDocNumber(
      "saleOrder",
      saleOrders.map((x) => x.number),
      settings
    );
    if (store.confirmSaleOrder(o.id)) {
      setNotice({ ok: true, text: t("order.notice.confirmed", { number }) });
    }
  };
  const doConvert = (o: SaleOrder) => {
    const arr = pickArray(picks);
    if (!arr.some((p) => p.qty > 0)) {
      setNotice({ ok: false, text: t("doc.errNothingRemaining") });
      return;
    }
    if (!store.convertOrderToBill(o.id, arr)) {
      setNotice({ ok: false, text: t("doc.errConvertState") });
      return;
    }
    // The draft now waits on the billing desk — the ONLY place it
    // can post. Take the cashier straight there.
    router.push("/billing");
  };
  const doConvertChallan = (o: SaleOrder) => {
    const arr = pickArray(challanPicks);
    if (!arr.some((p) => p.qty > 0)) {
      setNotice({ ok: false, text: t("doc.errNothingRemaining") });
      return;
    }
    const id = store.convertOrderToChallan(o.id, arr);
    if (!id) {
      setNotice({ ok: false, text: t("doc.errConvertState") });
      return;
    }
    setShowChallanConvert(false);
    setNotice({
      ok: true,
      text: t("challan.notice.fromOrder", { number: o.number ?? t("doc.draftLabel") }),
    });
  };
  const print = (o: SaleOrder) => {
    setPrintDoc(o);
    setTimeout(() => window.print(), 60);
  };

  const selStatus = selected ? deriveOrderStatus(selected, bills, deliveryChallans) : null;
  const selBilled = selected
    ? orderBilledQty(selected, bills, deliveryChallans)
    : new Map<string, number>();
  const selDelivered = selected
    ? orderDeliveredQty(selected, deliveryChallans)
    : new Map<string, number>();
  const selLabel = selected ? (selected.number ?? t("doc.draftLabel")) : "";

  return (
    <div className="section">
      <div className="container">
        <div className="section-head" style={{ textAlign: "start", marginBottom: 8 }}>
          <span className="eyebrow">{t("order.eyebrow")}</span>
          <h2 style={{ fontSize: "1.9rem" }}>{t("order.title")}</h2>
          <p style={{ marginInlineStart: 0 }}>{t("order.subtitle")}</p>
        </div>

        <div
          className="sticky-bar"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div className="search-box" style={{ flex: "1 1 260px" }}>
            <IconSearch />
            <input
              type="search"
              placeholder={t("doc.searchPh")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("doc.searchPh")}
            />
            {query && (
              <SearchClear
                onClear={() => setQuery("")}
                label={t("action.clearSearch")}
              />
            )}
          </div>
          {canWrite && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <IconPlus /> {t("order.new")}
            </button>
          )}
        </div>

        <Notice notice={notice} />

        {formOpen && canWrite && (
          <DocForm
            title={editing ? "order.form.editTitle" : "order.form.addTitle"}
            sub="order.form.sub"
            values={values}
            setValues={setValues}
            customers={customers}
            products={products}
            dateLabel="order.expectedDate"
            onSubmit={submitForm}
            onCancel={() => {
              setFormOpen(false);
              setEditing(null);
            }}
            warehouseField={store.warehouses}
          />
        )}

        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 22 }}>
          {filtered.length === 0 ? (
            <div className="empty">
              {saleOrders.length === 0 ? t("order.empty.none") : t("doc.emptyNoMatch")}
            </div>
          ) : (
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("doc.th.number")}</th>
                    <th>{t("doc.th.date")}</th>
                    <th>{t("doc.th.customer")}</th>
                    <th className="num">{t("doc.th.total")}</th>
                    <th>{t("doc.th.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => setSelectedId(o.id)}
                      style={{
                        cursor: "pointer",
                        background: o.id === selectedId ? "var(--bg)" : undefined,
                      }}
                    >
                      <td>
                        <b>{o.number ?? t("doc.draftLabel")}</b>
                      </td>
                      <td>{fmtDate(o.ts)}</td>
                      <td>{o.customerName || t("doc.walkIn")}</td>
                      <td className="num">{fmtPKR(o.total)}</td>
                      <td>
                        <Badge status={deriveOrderStatus(o, bills, deliveryChallans)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && selStatus && (
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0 }}>
                {selLabel} · {selected.customerName || t("doc.walkIn")}
              </h3>
              <Badge status={selStatus} />
            </div>
            {sourceLabelFor(selected) && (
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 0 }}>
                {t("doc.sourceLabel")}: {sourceLabelFor(selected)}
              </p>
            )}

            <LinesTable
              doc={selected}
              doneMap={selBilled}
              doneLabel="doc.billedQty"
              doneMap2={selDelivered}
              doneLabel2="doc.deliveredQty"
            />
            <TotalsBlock doc={selected} />
            {selected.expectedDate && (
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                {t("order.expectedDate")}: {selected.expectedDate}
              </p>
            )}
            {selected.note && <p style={{ fontSize: "0.85rem" }}>{selected.note}</p>}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              {canWrite && selected.status === "draft" && (
                <>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(selected)}>
                    {t("action.edit")}
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => doConfirm(selected)}>
                    {t("order.confirm")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming("delete")}>
                    {t("doc.deleteDraft")}
                  </button>
                </>
              )}
              {canWrite &&
                (selStatus === "open" || selStatus === "partially_fulfilled") && (
                  <>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowConvert((s) => !s)}
                    >
                      {t("order.convertToBill")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setShowChallanConvert((s) => !s)}
                    >
                      {t("order.convertToChallan")}
                    </button>
                  </>
                )}
              {canWrite &&
                selected.status !== "cancelled" &&
                selected.status !== "fulfilled" && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming("cancel")}>
                    {t("doc.cancelDoc")}
                  </button>
                )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => print(selected)}>
                {t("action.print")}
              </button>
            </div>

            {confirming === "cancel" && (
              <ConfirmRow
                title={t("doc.cancelConfirmTitle")}
                body={t("doc.cancelConfirmBody", { label: selLabel })}
                confirmLabel={t("doc.cancelDoc")}
                onConfirm={() => {
                  if (store.cancelSaleOrder(selected.id)) {
                    setNotice({ ok: true, text: t("order.notice.cancelled") });
                  } else {
                    setNotice({ ok: false, text: t("doc.errCancelBlocked") });
                  }
                  setConfirming(null);
                }}
                onKeep={() => setConfirming(null)}
              />
            )}
            {confirming === "delete" && selected.status === "draft" && (
              <ConfirmRow
                title={t("doc.deleteConfirmTitle")}
                body={t("doc.deleteConfirmBody")}
                confirmLabel={t("doc.deleteDraft")}
                onConfirm={() => {
                  store.deleteSaleOrder(selected.id);
                  setSelectedId(null);
                  setConfirming(null);
                  setNotice({ ok: true, text: t("order.notice.deleted") });
                }}
                onKeep={() => setConfirming(null)}
              />
            )}

            {showConvert && canWrite && (
              <ConvertPanel
                doc={selected}
                doneMap={selBilled}
                picks={picks}
                setPicks={setPicks}
                actionLabel="order.convertToBill"
                onConvert={() => doConvert(selected)}
              />
            )}
            {showChallanConvert && canWrite && (
              <ConvertPanel
                doc={selected}
                doneMap={selDelivered}
                picks={challanPicks}
                setPicks={setChallanPicks}
                actionLabel="order.convertToChallan"
                onConvert={() => doConvertChallan(selected)}
              />
            )}
          </div>
        )}
      </div>
      {printDoc && (
        <DocPrintSheet
          doc={printDoc}
          kind="order"
          settings={settings}
          products={products}
          assets={brandingDataUrls(store.branding)}
          sourceLabel={sourceLabelFor(printDoc)}
        />
      )}
    </div>
  );
}

/* ------------------------------ delivery challans -------------------------- */

/**
 * Phase B · B2 — the Delivery Challans workspace. A challan is a
 * NON-POSTING delivery document (design §2.2/§2.5): it records what
 * physically left on a trip, prints quantities only, and bills
 * later through the desk. Challans ride the saleOrders permission
 * row (G-1). Billed figures are DERIVED from the bills citing the
 * challan (§2.1) — never stored counters.
 */
interface ChallanFormValues {
  customerId: string;
  customerName: string;
  customerPhone: string;
  lines: DocLineInput[];
  vehicleNo: string;
  driverName: string;
  note: string;
  /** Phase C · C1: where the goods physically leave from (§1.6). */
  warehouseId: string;
}

function emptyChallanForm(): ChallanFormValues {
  return {
    customerId: "",
    customerName: "",
    customerPhone: "",
    lines: [],
    vehicleNo: "",
    driverName: "",
    note: "",
    warehouseId: "",
  };
}

export function DeliveryChallansManager() {
  const { t } = useLang();
  const router = useRouter();
  const store = useStore();
  const {
    ready, role, settings, customers, products, saleOrders, bills, deliveryChallans,
  } = store;

  const canWrite = can(role, "saleOrders", "write"); // G-1
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryChallan | null>(null);
  const [values, setValues] = useState<ChallanFormValues>(emptyChallanForm());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"cancel" | "delete" | null>(null);
  const [showConvert, setShowConvert] = useState(false);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [printDoc, setPrintDoc] = useState<DeliveryChallan | null>(null);

  const selected = useMemo(
    () => deliveryChallans.find((c) => c.id === selectedId) ?? null,
    [deliveryChallans, selectedId]
  );

  useEffect(() => {
    setConfirming(null);
    setShowConvert(false);
    if (selected) {
      const billed = challanBilledQty(selected, bills);
      const init: Record<string, string> = {};
      for (const l of selected.lines) {
        init[l.productId] = String(remainingQty(l.qty, billed, l.productId));
      }
      setPicks(init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!ready) return null;
  if (!can(role, "saleOrders", "view")) return <PermDenied />; // G-1

  const filtered = deliveryChallans.filter((c) =>
    matchesAny(query, [c.number, c.customerName, c.customerPhone])
  );

  const sourceOrderFor = (c: DeliveryChallan): SaleOrder | undefined =>
    c.orderId ? saleOrders.find((o) => o.id === c.orderId) : undefined;

  const openCreate = () => {
    setEditing(null);
    setValues(emptyChallanForm());
    setFormOpen(true);
    setNotice(null);
  };
  const openEdit = (c: DeliveryChallan) => {
    setEditing(c);
    setValues({
      customerId: c.customerId ?? "",
      customerName: c.customerName,
      customerPhone: c.customerPhone,
      lines: c.lines.map((l) => ({
        productId: l.productId,
        qty: l.qty,
        unitPrice: l.unitPrice,
      })),
      vehicleNo: c.vehicleNo,
      driverName: c.driverName,
      note: c.note,
      warehouseId: c.warehouseId ?? "",
    });
    setFormOpen(true);
    setNotice(null);
  };
  const submitForm = () => {
    if (values.lines.length === 0) {
      setNotice({ ok: false, text: t("doc.errNoLines") });
      return;
    }
    if (values.lines.some((l) => !(l.qty > 0))) {
      setNotice({ ok: false, text: t("doc.errQtyZero") });
      return;
    }
    const input = {
      customerId: values.customerId || null,
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      lines: values.lines,
      vehicleNo: values.vehicleNo,
      driverName: values.driverName,
      note: values.note,
      // Phase C · C1: the challan's dispatch warehouse (§1.6).
      warehouseId: values.warehouseId || null,
    };
    if (editing) {
      if (!store.updateChallan(editing.id, input)) {
        setNotice({ ok: false, text: t("doc.errNotEditable") });
        return;
      }
      setNotice({ ok: true, text: t("challan.notice.updated") });
    } else {
      const id = store.createChallan(input);
      if (!id) {
        setNotice({ ok: false, text: t("doc.errNoLines") });
        return;
      }
      setNotice({ ok: true, text: t("challan.notice.created") });
    }
    setFormOpen(false);
    setEditing(null);
  };

  const doDispatch = (c: DeliveryChallan) => {
    const number = nextDocNumber(
      "challan",
      deliveryChallans.map((x) => x.number),
      settings
    );
    if (store.dispatchChallan(c.id)) {
      setNotice({ ok: true, text: t("challan.notice.dispatched", { number }) });
    } else if (c.orderId) {
      setNotice({ ok: false, text: t("challan.errOrderGone") });
    }
  };
  const doConvert = (c: DeliveryChallan) => {
    const arr = pickArray(picks);
    if (!arr.some((p) => p.qty > 0)) {
      setNotice({ ok: false, text: t("doc.errNothingRemaining") });
      return;
    }
    if (!store.convertChallanToBill(c.id, arr)) {
      setNotice({ ok: false, text: t("doc.errConvertState") });
      return;
    }
    router.push("/billing");
  };
  const print = (c: DeliveryChallan) => {
    setPrintDoc(c);
    setTimeout(() => window.print(), 60);
  };

  const selStatus = selected ? deriveChallanStatus(selected, bills) : null;
  const selBilled = selected
    ? challanBilledQty(selected, bills)
    : new Map<string, number>();
  const selLabel = selected ? (selected.number ?? t("doc.draftLabel")) : "";
  const selOrder = selected ? sourceOrderFor(selected) : undefined;

  const set = (patch: Partial<ChallanFormValues>) => setValues({ ...values, ...patch });
  const onCustomer = (id: string) => {
    const c = customers.find((x) => x.id === id);
    set({
      customerId: id,
      customerName: c ? c.name : values.customerName,
      customerPhone: c ? c.phone : values.customerPhone,
    });
  };

  return (
    <div className="section">
      <div className="container">
        <div className="section-head" style={{ textAlign: "start", marginBottom: 8 }}>
          <span className="eyebrow">{t("challan.eyebrow")}</span>
          <h2 style={{ fontSize: "1.9rem" }}>{t("challan.title")}</h2>
          <p style={{ marginInlineStart: 0 }}>{t("challan.subtitle")}</p>
        </div>

        <div
          className="sticky-bar"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div className="search-box" style={{ flex: "1 1 260px" }}>
            <IconSearch />
            <input
              type="search"
              placeholder={t("doc.searchPh")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("doc.searchPh")}
            />
            {query && (
              <SearchClear
                onClear={() => setQuery("")}
                label={t("action.clearSearch")}
              />
            )}
          </div>
          {canWrite && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <IconPlus /> {t("challan.new")}
            </button>
          )}
        </div>

        <Notice notice={notice} />

        {formOpen && canWrite && (
          <div className="card" style={{ marginBottom: 22 }}>
            <h3 style={{ margin: "0 0 4px" }}>
              {t(editing ? "challan.form.editTitle" : "challan.form.addTitle")}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: "0 0 16px" }}>
              {t("challan.form.sub")}
            </p>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="dc-customer">{t("doc.customer")}</label>
                <select
                  id="dc-customer"
                  value={values.customerId}
                  onChange={(e) => onCustomer(e.target.value)}
                >
                  <option value="">{t("doc.customerSelect")}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.phone ? ` — ${c.phone}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="dc-cust-name">{t("doc.customerNamePh")}</label>
                <input
                  id="dc-cust-name"
                  value={values.customerName}
                  placeholder={t("doc.customerNamePh")}
                  onChange={(e) => set({ customerName: e.target.value, customerId: "" })}
                />
              </div>
              <div className="field">
                <label htmlFor="dc-cust-phone">{t("common.phone")}</label>
                <input
                  id="dc-cust-phone"
                  value={values.customerPhone}
                  onChange={(e) => set({ customerPhone: e.target.value })}
                />
              </div>
            </div>

            <DocLineEditor
              products={products}
              lines={values.lines}
              onChange={(lines) => set({ lines })}
            />

            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="field">
                <label htmlFor="dc-vehicle">{t("challan.vehicleNo")}</label>
                <input
                  id="dc-vehicle"
                  value={values.vehicleNo}
                  onChange={(e) => set({ vehicleNo: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="dc-driver">{t("challan.driverName")}</label>
                <input
                  id="dc-driver"
                  value={values.driverName}
                  onChange={(e) => set({ driverName: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="dc-note">{t("doc.note")}</label>
                <input
                  id="dc-note"
                  value={values.note}
                  placeholder={t("doc.notePh")}
                  onChange={(e) => set({ note: e.target.value })}
                />
              </div>
              {/* Phase C · C1 (§1.6): where the goods leave from. */}
              <div className="field">
                <label htmlFor="dc-warehouse">{t("wh.pickerLabel")}</label>
                <select
                  id="dc-warehouse"
                  value={values.warehouseId}
                  onChange={(e) => set({ warehouseId: e.target.value })}
                >
                  <option value="">{t("wh.pickerUseDefault")}</option>
                  {store.warehouses
                    .filter((w) => !w.archived)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                        {w.isDefault ? ` ${t("wh.pickerDefaultSuffix")}` : ""}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary" onClick={submitForm}>
                {t("action.save")}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setFormOpen(false);
                  setEditing(null);
                }}
              >
                {t("action.cancel")}
              </button>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 22 }}>
          {filtered.length === 0 ? (
            <div className="empty">
              {deliveryChallans.length === 0 ? t("challan.empty.none") : t("doc.emptyNoMatch")}
            </div>
          ) : (
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("doc.th.number")}</th>
                    <th>{t("doc.th.date")}</th>
                    <th>{t("doc.th.customer")}</th>
                    <th>{t("doc.sourceLabel")}</th>
                    <th>{t("doc.th.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const o = sourceOrderFor(c);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        style={{
                          cursor: "pointer",
                          background: c.id === selectedId ? "var(--bg)" : undefined,
                        }}
                      >
                        <td>
                          <b>{c.number ?? t("doc.draftLabel")}</b>
                        </td>
                        <td>{fmtDate(c.ts)}</td>
                        <td>{c.customerName || t("doc.walkIn")}</td>
                        <td>{o ? (o.number ?? t("doc.draftLabel")) : t("challan.standalone")}</td>
                        <td>
                          <Badge status={deriveChallanStatus(c, bills)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && selStatus && (
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0 }}>
                {selLabel} · {selected.customerName || t("doc.walkIn")}
              </h3>
              <Badge status={selStatus} />
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 0 }}>
              {t("doc.sourceLabel")}:{" "}
              {selOrder
                ? `${t("challan.sourceOrder")} ${selOrder.number ?? t("doc.draftLabel")}`
                : t("challan.standalone")}
            </p>

            {/* MC Billing workflow adoption 2026-10-27 (WEB): the chain
                rule, stated on the challan itself — delivered and
                invoiced quantities are tracked above; stock moves
                only when the invoice posts. */}
            <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>{STOCK_DEDUCTION_NOTE} آرڈر → چالان → انوائس: ہر مرحلے پر مقداریں اوپر والی ٹیبل سے ملتی ہیں۔</p>

            {/* Quantities only — a challan carries no prices (§2.3). */}
            <div className="table-wrap" style={{ marginBottom: 14 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("doc.lines.product")}</th>
                    <th className="num">{t("doc.billedQty")}</th>
                    <th className="num">{t("doc.remainingQty")}</th>
                    <th className="num">{t("doc.lines.qty")}</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((l) => (
                    <tr key={l.productId}>
                      <td>{l.name}</td>
                      <td className="num">{fmtQty(selBilled.get(l.productId) ?? 0)}</td>
                      <td className="num">
                        {fmtQty(remainingQty(l.qty, selBilled, l.productId))}
                      </td>
                      <td className="num">{fmtQty(l.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(selected.vehicleNo || selected.driverName) && (
              <p style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                {selected.vehicleNo && (
                  <>
                    {t("challan.vehicleNo")}: {selected.vehicleNo}
                    {selected.driverName ? " · " : ""}
                  </>
                )}
                {selected.driverName && (
                  <>
                    {t("challan.driverName")}: {selected.driverName}
                  </>
                )}
              </p>
            )}
            {selected.note && <p style={{ fontSize: "0.85rem" }}>{selected.note}</p>}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              {canWrite && selected.status === "draft" && (
                <>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(selected)}>
                    {t("action.edit")}
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => doDispatch(selected)}>
                    {t("challan.dispatch")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming("delete")}>
                    {t("doc.deleteDraft")}
                  </button>
                </>
              )}
              {canWrite &&
                (selStatus === "dispatched" || selStatus === "partially_billed") && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowConvert((s) => !s)}
                  >
                    {t("challan.convertToBill")}
                  </button>
                )}
              {canWrite &&
                selected.status !== "cancelled" &&
                selected.status !== "billed" && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming("cancel")}>
                    {t("doc.cancelDoc")}
                  </button>
                )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => print(selected)}>
                {t("action.print")}
              </button>
            </div>

            {confirming === "cancel" && (
              <ConfirmRow
                title={t("doc.cancelConfirmTitle")}
                body={t("doc.cancelConfirmBody", { label: selLabel })}
                confirmLabel={t("doc.cancelDoc")}
                onConfirm={() => {
                  if (store.cancelChallan(selected.id)) {
                    setNotice({ ok: true, text: t("challan.notice.cancelled") });
                  } else {
                    setNotice({ ok: false, text: t("doc.errCancelBlocked") });
                  }
                  setConfirming(null);
                }}
                onKeep={() => setConfirming(null)}
              />
            )}
            {confirming === "delete" && selected.status === "draft" && (
              <ConfirmRow
                title={t("doc.deleteConfirmTitle")}
                body={t("doc.deleteConfirmBody")}
                confirmLabel={t("doc.deleteDraft")}
                onConfirm={() => {
                  store.deleteChallan(selected.id);
                  setSelectedId(null);
                  setConfirming(null);
                  setNotice({ ok: true, text: t("challan.notice.deleted") });
                }}
                onKeep={() => setConfirming(null)}
              />
            )}

            {showConvert && canWrite && (
              <ConvertPanel
                doc={selected}
                doneMap={selBilled}
                picks={picks}
                setPicks={setPicks}
                actionLabel="challan.convertToBill"
                onConvert={() => doConvert(selected)}
              />
            )}
          </div>
        )}
      </div>
      {printDoc && (
        <ChallanPrintSheet
          doc={printDoc}
          settings={settings}
          assets={brandingDataUrls(store.branding)}
          sourceOrderLabel={
            printDoc.orderId
              ? (sourceOrderFor(printDoc)?.number ?? undefined)
              : undefined
          }
        />
      )}
    </div>
  );
}

/* ------------------------------- purchase orders ---------------------------- */

interface PoFormValues {
  supplierId: string;
  lines: DocLineInput[];
  date: string;
  note: string;
  /** Phase C · C1: the expected destination warehouse (§1.6). */
  warehouseId: string;
}

function emptyPoForm(): PoFormValues {
  return { supplierId: "", lines: [], date: "", note: "", warehouseId: "" };
}

/**
 * Phase B · B3 — the Purchase Orders workspace. A PO is a
 * NON-POSTING order to a supplier: creating, editing, issuing and
 * cancelling it write only its own document. Goods arrive through
 * the RECEIVE panel, which posts via the store's recordPurchase
 * engine (the purchase cites the PO) — this surface composes no
 * posting of its own. Received quantities are DERIVED from the
 * purchases citing the PO (§2.1), never stored counters.
 */
export function PurchaseOrdersManager() {
  const { t } = useLang();
  const store = useStore();
  const {
    ready, role, settings, suppliers, products, purchases, purchaseOrders,
  } = store;

  const canWrite = can(role, "purchaseOrders", "write");
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [values, setValues] = useState<PoFormValues>(emptyPoForm());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<"cancel" | "delete" | null>(null);
  const [showReceive, setShowReceive] = useState(false);
  const [recvQty, setRecvQty] = useState<Record<string, string>>({});
  const [recvCost, setRecvCost] = useState<Record<string, string>>({});
  /* Phase C · C1: the warehouse the pending receipt lands in —
   * preselected to the PO's expected destination when the detail
   * opens ("" = the shop default). */
  const [recvWhId, setRecvWhId] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [printDoc, setPrintDoc] = useState<PurchaseOrder | null>(null);

  const selected = useMemo(
    () => purchaseOrders.find((p) => p.id === selectedId) ?? null,
    [purchaseOrders, selectedId]
  );

  useEffect(() => {
    setConfirming(null);
    setShowReceive(false);
    if (selected) {
      const received = poReceivedQty(selected, purchases);
      const q: Record<string, string> = {};
      const c: Record<string, string> = {};
      for (const l of selected.lines) {
        q[l.productId] = String(remainingQty(l.qty, received, l.productId));
        c[l.productId] = String(l.unitCost);
      }
      setRecvQty(q);
      setRecvCost(c);
      // C1: the receipt is expected at the PO's warehouse.
      setRecvWhId(selected.warehouseId ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!ready) return null;
  if (!can(role, "purchaseOrders", "view")) return <PermDenied />;

  const filtered = purchaseOrders.filter((p) =>
    matchesAny(query, [p.number, p.supplierName])
  );

  const openCreate = () => {
    setEditing(null);
    setValues(emptyPoForm());
    setFormOpen(true);
    setNotice(null);
  };
  const openEdit = (p: PurchaseOrder) => {
    setEditing(p);
    setValues({
      supplierId: p.supplierId,
      lines: p.lines.map((l) => ({
        productId: l.productId,
        qty: l.qty,
        unitPrice: l.unitCost,
      })),
      date: p.expectedDate ?? "",
      note: p.note,
      warehouseId: p.warehouseId ?? "",
    });
    setFormOpen(true);
    setNotice(null);
  };
  const submitForm = () => {
    if (!values.supplierId) {
      setNotice({ ok: false, text: t("doc.supplierSelect") });
      return;
    }
    if (values.lines.length === 0) {
      setNotice({ ok: false, text: t("doc.errNoLines") });
      return;
    }
    if (values.lines.some((l) => !(l.qty > 0))) {
      setNotice({ ok: false, text: t("doc.errQtyZero") });
      return;
    }
    const input = {
      supplierId: values.supplierId,
      lines: values.lines.map((l) => ({
        productId: l.productId,
        qty: l.qty,
        unitCost: l.unitPrice,
      })),
      expectedDate: values.date || null,
      note: values.note,
      // Phase C · C1: the PO's expected destination (§1.6).
      warehouseId: values.warehouseId || null,
    };
    if (editing) {
      if (!store.updatePurchaseOrder(editing.id, input)) {
        setNotice({ ok: false, text: t("doc.errNotEditable") });
        return;
      }
      setNotice({ ok: true, text: t("po.notice.updated") });
    } else {
      const id = store.createPurchaseOrder(input);
      if (!id) {
        setNotice({ ok: false, text: t("doc.errNoLines") });
        return;
      }
      setNotice({ ok: true, text: t("po.notice.created") });
    }
    setFormOpen(false);
    setEditing(null);
  };

  const doIssue = (p: PurchaseOrder) => {
    const number = nextDocNumber(
      "purchaseOrder",
      purchaseOrders.map((x) => x.number),
      settings
    );
    if (store.issuePurchaseOrder(p.id)) {
      setNotice({ ok: true, text: t("po.notice.issued", { number }) });
    }
  };
  const doReceive = (p: PurchaseOrder) => {
    const received = poReceivedQty(p, purchases);
    const picks: Array<{ productId: string; qty: number; unitCost?: number }> = [];
    let over = false;
    for (const l of p.lines) {
      const qty = parseFloat(recvQty[l.productId] ?? "") || 0;
      if (qty <= 0) continue;
      if (qty > remainingQty(l.qty, received, l.productId) + 1e-9) over = true;
      const cost = parseFloat(recvCost[l.productId] ?? "");
      picks.push({
        productId: l.productId,
        qty,
        unitCost: Number.isFinite(cost) ? cost : undefined,
      });
    }
    if (over) {
      // The store refuses this too (the derivation is the gate);
      // the desk names the actual problem.
      setNotice({ ok: false, text: t("po.errOverReceipt") });
      return;
    }
    if (picks.length === 0) {
      setNotice({ ok: false, text: t("doc.errQtyZero") });
      return;
    }
    // C1 (§1.6): the receiving desk's warehouse pick — falling
    // back to the PO's expected destination when untouched.
    const id = store.receiveAgainstPo(p.id, picks, recvWhId || p.warehouseId || null);
    if (!id) {
      setNotice({ ok: false, text: t("po.errReceive") });
      return;
    }
    setNotice({
      ok: true,
      text: t("po.notice.received", { number: p.number ?? t("doc.draftLabel") }),
    });
    setShowReceive(false);
  };
  const print = (p: PurchaseOrder) => {
    setPrintDoc(p);
    setTimeout(() => window.print(), 60);
  };

  const selStatus = selected ? derivePoStatus(selected, purchases) : null;
  const selReceived = selected
    ? poReceivedQty(selected, purchases)
    : new Map<string, number>();
  const selLabel = selected ? (selected.number ?? t("doc.draftLabel")) : "";

  const set = (patch: Partial<PoFormValues>) => setValues({ ...values, ...patch });

  return (
    <div className="section">
      <div className="container">
        <div className="section-head" style={{ textAlign: "start", marginBottom: 8 }}>
          <span className="eyebrow">{t("po.eyebrow")}</span>
          <h2 style={{ fontSize: "1.9rem" }}>{t("po.title")}</h2>
          <p style={{ marginInlineStart: 0 }}>{t("po.subtitle")}</p>
        </div>

        <div
          className="sticky-bar"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div className="search-box" style={{ flex: "1 1 260px" }}>
            <IconSearch />
            <input
              type="search"
              placeholder={t("doc.searchPh")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("doc.searchPh")}
            />
            {query && (
              <SearchClear
                onClear={() => setQuery("")}
                label={t("action.clearSearch")}
              />
            )}
          </div>
          {canWrite && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <IconPlus /> {t("po.new")}
            </button>
          )}
        </div>

        <Notice notice={notice} />

        {formOpen && canWrite && (
          <div className="card" style={{ marginBottom: 22 }}>
            <h3 style={{ margin: "0 0 4px" }}>
              {t(editing ? "po.form.editTitle" : "po.form.addTitle")}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", margin: "0 0 16px" }}>
              {t("po.form.sub")}
            </p>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="po-supplier">{t("doc.supplier")}</label>
                <select
                  id="po-supplier"
                  value={values.supplierId}
                  onChange={(e) => set({ supplierId: e.target.value })}
                >
                  <option value="">{t("doc.supplierSelect")}</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.company ? ` — ${s.company}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="po-date">{t("order.expectedDate")}</label>
                <input
                  id="po-date"
                  type="date"
                  value={values.date}
                  onChange={(e) => set({ date: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="po-note">{t("doc.note")}</label>
                <input
                  id="po-note"
                  value={values.note}
                  placeholder={t("doc.notePh")}
                  onChange={(e) => set({ note: e.target.value })}
                />
              </div>
              {/* Phase C · C1 (§1.6): the expected destination. */}
              <div className="field">
                <label htmlFor="po-warehouse">{t("wh.pickerLabel")}</label>
                <select
                  id="po-warehouse"
                  value={values.warehouseId}
                  onChange={(e) => set({ warehouseId: e.target.value })}
                >
                  <option value="">{t("wh.pickerUseDefault")}</option>
                  {store.warehouses
                    .filter((w) => !w.archived)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                        {w.isDefault ? ` ${t("wh.pickerDefaultSuffix")}` : ""}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <DocLineEditor
              products={products}
              lines={values.lines}
              onChange={(lines) => set({ lines })}
              priceKind="cost"
            />

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary" onClick={submitForm}>
                {t("action.save")}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setFormOpen(false);
                  setEditing(null);
                }}
              >
                {t("action.cancel")}
              </button>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 22 }}>
          {filtered.length === 0 ? (
            <div className="empty">
              {purchaseOrders.length === 0 ? t("po.empty.none") : t("doc.emptyNoMatch")}
            </div>
          ) : (
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("doc.th.number")}</th>
                    <th>{t("doc.th.date")}</th>
                    <th>{t("doc.th.supplier")}</th>
                    <th className="num">{t("doc.th.total")}</th>
                    <th>{t("doc.th.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      style={{
                        cursor: "pointer",
                        background: p.id === selectedId ? "var(--bg)" : undefined,
                      }}
                    >
                      <td>
                        <b>{p.number ?? t("doc.draftLabel")}</b>
                      </td>
                      <td>{fmtDate(p.ts)}</td>
                      <td>{p.supplierName}</td>
                      <td className="num">{fmtPKR(p.total)}</td>
                      <td>
                        <Badge status={derivePoStatus(p, purchases)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {selected && selStatus && (
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0 }}>
                {selLabel} · {selected.supplierName}
              </h3>
              <Badge status={selStatus} />
            </div>
            {selected.expectedDate && (
              <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 0 }}>
                {t("order.expectedDate")}: {selected.expectedDate}
              </p>
            )}

            {/* Derived fulfilment (§2.1): received comes from the
                purchases citing this PO — never a stored counter. */}
            <div className="table-wrap" style={{ marginBottom: 14 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("doc.lines.product")}</th>
                    <th className="num">{t("doc.receivedQty")}</th>
                    <th className="num">{t("doc.remainingQty")}</th>
                    <th className="num">{t("doc.lines.qty")}</th>
                    <th className="num">{t("po.agreedCost")}</th>
                    <th className="num">{t("doc.lines.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((l) => (
                    <tr key={l.productId}>
                      <td>{l.name}</td>
                      <td className="num">{fmtQty(selReceived.get(l.productId) ?? 0)}</td>
                      <td className="num">
                        {fmtQty(remainingQty(l.qty, selReceived, l.productId))}
                      </td>
                      <td className="num">{fmtQty(l.qty)}</td>
                      <td className="num">{fmtPKR(l.unitCost)}</td>
                      <td className="num">{fmtPKR(l.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: "0.9rem", margin: "0 0 4px" }}>
              {t("doc.total")}: <b>{fmtPKR(selected.total)}</b>
            </p>
            {selected.note && <p style={{ fontSize: "0.85rem" }}>{selected.note}</p>}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              {canWrite && selected.status === "draft" && (
                <>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(selected)}>
                    {t("action.edit")}
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => doIssue(selected)}>
                    {t("po.issue")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming("delete")}>
                    {t("doc.deleteDraft")}
                  </button>
                </>
              )}
              {canWrite &&
                (selStatus === "issued" || selStatus === "partially_received") && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowReceive((s) => !s)}
                  >
                    {t("po.receive")}
                  </button>
                )}
              {canWrite &&
                selected.status !== "cancelled" &&
                selected.status !== "received" && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming("cancel")}>
                    {t("doc.cancelDoc")}
                  </button>
                )}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => print(selected)}>
                {t("action.print")}
              </button>
            </div>

            {confirming === "cancel" && (
              <ConfirmRow
                title={t("doc.cancelConfirmTitle")}
                body={t("doc.cancelConfirmBody", { label: selLabel })}
                confirmLabel={t("doc.cancelDoc")}
                onConfirm={() => {
                  if (store.cancelPurchaseOrder(selected.id)) {
                    setNotice({ ok: true, text: t("po.notice.cancelled") });
                  } else {
                    setNotice({ ok: false, text: t("doc.errCancelBlocked") });
                  }
                  setConfirming(null);
                }}
                onKeep={() => setConfirming(null)}
              />
            )}
            {confirming === "delete" && selected.status === "draft" && (
              <ConfirmRow
                title={t("doc.deleteConfirmTitle")}
                body={t("doc.deleteConfirmBody")}
                confirmLabel={t("doc.deleteDraft")}
                onConfirm={() => {
                  store.deletePurchaseOrder(selected.id);
                  setSelectedId(null);
                  setConfirming(null);
                  setNotice({ ok: true, text: t("po.notice.deleted") });
                }}
                onKeep={() => setConfirming(null)}
              />
            )}

            {showReceive && canWrite && (
              <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                <h4 style={{ margin: "0 0 6px" }}>{t("po.receiveTitle")}</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 12px" }}>
                  {t("po.receiveSub")}
                </p>
                {/* Phase C · C1 (§1.6): receive into this warehouse
                    — preselected to the PO's destination. */}
                <div className="field" style={{ maxWidth: 320, marginBottom: 12 }}>
                  <label htmlFor="po-recv-warehouse">{t("wh.pickerLabel")}</label>
                  <select
                    id="po-recv-warehouse"
                    value={recvWhId}
                    onChange={(e) => setRecvWhId(e.target.value)}
                  >
                    <option value="">{t("wh.pickerUseDefault")}</option>
                    {store.warehouses
                      .filter((w) => !w.archived)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                          {w.isDefault ? ` ${t("wh.pickerDefaultSuffix")}` : ""}
                        </option>
                      ))}
                  </select>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {selected.lines.map((l) => {
                    const remaining = remainingQty(l.qty, selReceived, l.productId);
                    return (
                      <div
                        key={l.productId}
                        style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
                      >
                        <span style={{ flex: "1 1 160px" }}>{l.name}</span>
                        <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                          {t("doc.remainingQty")}: {fmtQty(remaining)}
                        </span>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          max={remaining}
                          value={recvQty[l.productId] ?? ""}
                          onChange={(e) => setRecvQty({ ...recvQty, [l.productId]: e.target.value })}
                          style={{ width: 100 }}
                          aria-label={l.name}
                        />
                        <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                          {t("po.agreedCost")}
                        </span>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={recvCost[l.productId] ?? ""}
                          onChange={(e) => setRecvCost({ ...recvCost, [l.productId]: e.target.value })}
                          style={{ width: 110 }}
                          aria-label={`${l.name} — ${t("po.agreedCost")}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: 12 }}
                  onClick={() => doReceive(selected)}
                >
                  {t("po.receive")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {printDoc && <PoPrintSheet doc={printDoc} settings={settings} assets={brandingDataUrls(store.branding)} />}
    </div>
  );
}
