"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import PermDenied from "./PermDenied";
import { can } from "@/lib/permissions";
import {
  IconCash,
  IconClose,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconTruck, SearchClear } from "./ui";
import { fmtDate, fmtNum, fmtPKR, fmtUnit } from "@/lib/format";
import { brandingDataUrls } from "@/lib/branding";
import { computePurchaseTaxes, resolveTaxSlab } from "@/lib/tax";
import { normQuery, supplierMatches } from "@/lib/search";
import {
  outflowPreview,
  supplierBalance,
  supplierPaid,
  supplierPurchased,
  supplierRefunded,
  supplierReturned,
} from "@/lib/ledger";
import { paymentVoucherData, purchaseReturnedQty } from "@/lib/documents";
import { purchasePipelineCounters } from "@/lib/workflow";
import { accountNormalBalance } from "@/lib/ledger";
import { VoucherPrintSheet } from "./DocPrintSheet";
import type { Purchase, Supplier, SupplierPayment } from "@/lib/types";
import { AccountPicker, NegativeBalanceWarning } from "./MoneyAccounts";
import {
  ChequeFields,
  chequeDraftOf,
  emptyChequeForm,
  type ChequeFormState,
} from "./ChequeCapture";

function inCurrentMonth(ts: string): boolean {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

interface PurchaseLine {
  productId: string;
  qty: number;
  unitCost: number;
}

/** B5: the payment picker's extra choice is the cheque
 *  INSTRUMENT (the store row's method rides as "bank"), never a
 *  sixth PayMethod. Refund flows (purchase returns) keep the
 *  narrow method set — a refund is never a cheque. */
type PayMethodValue = "cash" | "jazzcash" | "easypaisa" | "bank" | "cheque";
type RefundMethod = Exclude<PayMethodValue, "cheque">;

const PAY_METHOD_KEY = {
  cash: "common.pay.cash",
  jazzcash: "common.pay.jazzcash",
  easypaisa: "common.pay.easypaisa",
  bank: "common.pay.bank",
  cheque: "chq.payOption",
} as const;

const EMPTY_FORM = { name: "", phone: "", company: "", notes: "" };

export default function SuppliersManager() {
  const {
    ready,
    products,
    suppliers,
    purchases,
    purchaseOrders,
    purchaseReturns,
    supplierPayments,
    cheques,
    warehouses,
    accounts,
    journal,
    taxSlabs,
    settings,
    branding,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    recordPurchase,
    recordPurchaseReturn,
    recordSupplierPayment,
  } = useStore();
  const { role } = useAuth();
  /* A3: suppliers & purchases are owner/manager to manage; the
   * accountant is read-only here but MAY record supplier payments
   * (separate matrix row); cashiers never see this section. */
  const canManage = can(role, "suppliersManage", "write");
  const canPay = can(role, "supplierPayments", "write");
  /* Phase B · B4 (G-2): purchase returns + debit notes gate on the
   * creditDebitNotes row — the accountant (read-only here) may
   * still return goods; owner/manager can too. */
  const canNote = can(role, "creditDebitNotes", "write");
  /* Phase B · B6 (G-4): voucher prints follow the host surface. */
  const canVoucher = can(role, "vouchers", "view");
  /** B6: the payment row whose payment voucher is printing. */
  const [printPayment, setPrintPayment] = useState<SupplierPayment | null>(null);
  const printVoucher = (p: SupplierPayment) => {
    setPrintPayment(p);
    setTimeout(() => window.print(), 60);
  };
  const { t, lang } = useLang();
  void lang;

  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Add / edit supplier
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  // Detail
  const [detail, setDetail] = useState<Supplier | null>(null);

  // Purchase
  const [purchaseTarget, setPurchaseTarget] = useState<Supplier | null>(null);
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [purchaseNote, setPurchaseNote] = useState("");
  const [purchaseError, setPurchaseError] = useState("");
  /* Phase C · C1 (§1.6): the warehouse this receipt's stock lands
   * in; "" = the shop default. */
  const [purchaseWhId, setPurchaseWhId] = useState("");

  // Payment
  const [paymentTarget, setPaymentTarget] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethodValue>("cash");
  /** A2: money account the payment leaves from; "" = method default. */
  const [payAccountId, setPayAccountId] = useState("");
  const [payCheque, setPayCheque] = useState<ChequeFormState>(emptyChequeForm());
  const [payNote, setPayNote] = useState("");
  const [payError, setPayError] = useState("");
  /** Fix 2: pending negative-balance confirmation for the payment. */
  const [payNegWarn, setPayNegWarn] = useState<{
    accountName: string;
    amount: number;
    balanceAfter: number;
    proceed: () => void;
  } | null>(null);
  /* B4: purchase-return modal (goods back to a supplier). */
  const [preturnTarget, setPreturnTarget] = useState<Purchase | null>(null);
  const [preturnQty, setPreturnQty] = useState<Record<string, string>>({});
  const [preturnSettle, setPreturnSettle] = useState<"offset" | "refund">("offset");
  const [preturnMethod, setPreturnMethod] = useState<RefundMethod>("cash");
  const [preturnAccountId, setPreturnAccountId] = useState("");
  const [preturnReason, setPreturnReason] = useState("");
  const [preturnError, setPreturnError] = useState("");

  const filtered = useMemo(() => {
    const list = [...suppliers].sort((a, b) => a.name.localeCompare(b.name));
    if (!normQuery(search)) return list;
    return list.filter((s) => supplierMatches(s, search));
  }, [suppliers, search]);

  const summary = useMemo(() => {
    const totalPayable = suppliers.reduce(
      (a, s) => a + supplierBalance(purchases, supplierPayments, s.id, purchaseReturns),
      0
    );
    const purchasedThisMonth = purchases
      .filter((p) => inCurrentMonth(p.ts))
      .reduce((a, p) => a + p.total, 0);
    const paidThisMonth = supplierPayments
      .filter((p) => inCurrentMonth(p.ts))
      .reduce((a, p) => a + p.amount, 0);
    return { totalPayable, count: suppliers.length, purchasedThisMonth, paidThisMonth };
  }, [suppliers, purchases, supplierPayments, purchaseReturns]);

  /* MC Billing workflow adoption 2026-10-27 (WEB) — pipeline
   * counters with a CORRECT Received count: Received derives
   * from goods actually received against each PO (lib/documents),
   * never from a cached status label; Unpaid counts received
   * POs whose supplier still carries an open ledger balance.
   * AP tie-out: Σ supplier balances must equal payables GL. */
  const pipeline = useMemo(
    () =>
      purchasePipelineCounters(purchaseOrders, purchases, (sid) =>
        supplierBalance(purchases, supplierPayments, sid, purchaseReturns)
      ),
    [purchaseOrders, purchases, supplierPayments, purchaseReturns]
  );
  const apTieOut = useMemo(
    () => ({
      subledger: summary.totalPayable,
      gl: accountNormalBalance(journal, "payables"),
    }),
    [summary.totalPayable, journal]
  );

  /* ---------------- supplier form ---------------- */

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone, company: s.company, notes: s.notes });
    setFormError("");
    setFormOpen(true);
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError(t("sup.form.nameRequired"));
      return;
    }
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      company: form.company.trim(),
      notes: form.notes.trim(),
    };
    if (editing) {
      updateSupplier(editing.id, payload);
      setNotice({ ok: true, text: t("sup.notice.updated", { name: payload.name }) });
    } else {
      addSupplier(payload);
      setNotice({ ok: true, text: t("sup.notice.added", { name: payload.name }) });
    }
    setFormOpen(false);
  };

  /* ---------------- delete ---------------- */

  const deleteBlockReason = (s: Supplier): string | null => {
    const balance = supplierBalance(purchases, supplierPayments, s.id, purchaseReturns);
    if (balance > 0)
      return t("sup.delete.blockedBalance", { amount: fmtPKR(balance) });
    const hasPurchases = purchases.some((p) => p.supplierId === s.id);
    const hasPayments = supplierPayments.some((p) => p.supplierId === s.id);
    // F-13: a NEGATIVE balance is an advance the shop paid — just as
    // undeletable as a payable. Any balance ≠ 0, or any history at
    // all, blocks deletion (the store enforces the same guard).
    if (balance !== 0 || hasPurchases || hasPayments)
      return t("sup.delete.blockedHistory");
    return null;
  };

  /* ---------------- purchase ---------------- */

  const openPurchase = (s: Supplier) => {
    const first = [...products].sort((a, b) => a.name.localeCompare(b.name))[0];
    setPurchaseTarget(s);
    setLines(
      first ? [{ productId: first.id, qty: 1, unitCost: first.costPrice }] : []
    );
    setPurchaseNote("");
    setPurchaseError("");
    setPurchaseWhId("");
    setNotice(null);
  };

  const updateLine = (idx: number, patch: Partial<PurchaseLine>) => {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const next = { ...l, ...patch };
        if (patch.productId) {
          const p = products.find((x) => x.id === patch.productId);
          if (p) next.unitCost = p.costPrice;
        }
        return next;
      })
    );
  };

  const addLine = () => {
    const first = [...products].sort((a, b) => a.name.localeCompare(b.name))[0];
    if (!first) return;
    setLines((prev) => [...prev, { productId: first.id, qty: 1, unitCost: first.costPrice }]);
  };

  const removeLine = (idx: number) =>
    setLines((prev) => prev.filter((_, i) => i !== idx));

  const purchaseTotal = lines.reduce((a, l) => a + l.qty * l.unitCost, 0);

  // A4 (design §2.4): live purchase-tax preview — the supplier is
  // owed the GROSS; the same calculator the store posts with, so
  // the modal total is the recorded payable. Tax 0 ⇒ the pre-A4
  // single-total display, unchanged.
  const purchasePreview = useMemo(
    () =>
      computePurchaseTaxes(
        lines.map((l) => {
          const p = products.find((x) => x.id === l.productId);
          return {
            total: l.qty * l.unitCost,
            qty: l.qty,
            slab: p ? resolveTaxSlab(p, taxSlabs, settings, "purchases") : null,
          };
        })
      ),
    [lines, products, taxSlabs, settings.defaultPurchaseTaxSlabId]
  );

  const submitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseTarget) return;
    if (lines.length === 0) {
      setPurchaseError(t("sup.purchase.errNoLines"));
      return;
    }
    if (lines.some((l) => !l.productId || l.qty <= 0)) {
      setPurchaseError(t("sup.purchase.errInvalidLine"));
      return;
    }
    if (lines.some((l) => l.unitCost < 0)) {
      setPurchaseError(t("sup.purchase.errNegativeCost"));
      return;
    }
    const id = recordPurchase({
      supplierId: purchaseTarget.id,
      lines: lines.map((l) => ({ productId: l.productId, qty: l.qty, unitCost: l.unitCost })),
      note: purchaseNote.trim(),
      // C1: the modal's warehouse pick ("" ⇒ the store resolves
      // the shop default).
      warehouseId: purchaseWhId || null,
    });
    if (!id) {
      setPurchaseError(t("sup.purchase.errFailed"));
      return;
    }
    setPurchaseTarget(null);
    setNotice({
      ok: true,
      text: t("sup.purchase.success", {
        amount: fmtPKR(purchasePreview.grossTotal),
        name: purchaseTarget.name,
      }),
    });
  };

  /* ---------------- payment ---------------- */

  const openPayment = (s: Supplier) => {
    setPaymentTarget(s);
    const bal = supplierBalance(purchases, supplierPayments, s.id, purchaseReturns);
    setPayAmount(bal > 0 ? String(bal) : "");
    setPayMethod("cash");
    setPayAccountId("");
    setPayCheque(emptyChequeForm());
    setPayNote("");
    setPayError("");
    setNotice(null);
  };

  const submitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTarget) return;
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPayError(t("sup.payment.errAmount"));
      return;
    }
    // B5: an issued cheque must carry its captured instrument; the
    // picker keeps the drawn-on account (method "bank").
    const draft = payMethod === "cheque" ? chequeDraftOf(payCheque) : null;
    if (payMethod === "cheque" && !draft) {
      setPayError(t("chq.err.capture"));
      return;
    }
    const doPayment = () => {
      recordSupplierPayment({
        supplierId: paymentTarget.id,
        amount,
        method: payMethod === "cheque" ? "bank" : payMethod,
        accountId: payAccountId || null,
        note: payNote.trim(),
        ...(draft ? { instrument: "cheque" as const, cheque: draft } : {}),
      });
      setNotice({
        ok: true,
        text: t("sup.payment.success", {
          amount: fmtPKR(amount),
          name: paymentTarget.name,
        }),
      });
      setPaymentTarget(null);
    };
    // Fix 2: warn (never block) when the payment would drive its
    // account negative. A cheque payment settles into
    // `cheques_issued`, not a money account, so it never warns here.
    if (payMethod !== "cheque") {
      const preview = outflowPreview(journal, accounts, {
        method: payMethod,
        accountId: payAccountId || null,
        amount,
      });
      if (preview && preview.balanceAfter < 0) {
        setPayNegWarn({
          accountName: preview.account.name,
          amount,
          balanceAfter: preview.balanceAfter,
          proceed: doPayment,
        });
        return;
      }
    }
    doPayment();
  };

  /* ---------------- purchase return (B4) ---------------- */

  const openPreturn = (p: Purchase) => {
    setPreturnTarget(p);
    setPreturnQty({});
    setPreturnSettle("offset");
    setPreturnMethod("cash");
    setPreturnAccountId("");
    setPreturnReason("");
    setPreturnError("");
    setNotice(null);
  };

  const submitPreturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preturnTarget) return;
    const returned = purchaseReturnedQty(preturnTarget, purchaseReturns);
    const lines = preturnTarget.items
      .map((it) => ({
        productId: it.productId,
        qty: Math.max(0, parseFloat(preturnQty[it.productId] ?? "") || 0),
      }))
      .filter((l) => l.qty > 0);
    if (lines.length === 0) {
      setPreturnError(t("sup.preturn.none"));
      return;
    }
    for (const l of lines) {
      const it = preturnTarget.items.find((x) => x.productId === l.productId);
      if (!it) continue;
      const max = it.qty - (returned.get(it.productId) ?? 0);
      if (l.qty > max) {
        setPreturnError(
          t("sup.preturn.errMax", { qty: fmtNum(max), name: it.name })
        );
        return;
      }
    }
    const box: { number: string | null } = { number: null };
    const id = recordPurchaseReturn(
      {
        purchaseId: preturnTarget.id,
        lines,
        settlement: preturnSettle === "offset" ? "payable_offset" : "cash_refund",
        method: preturnSettle === "refund" ? preturnMethod : undefined,
        accountId: preturnSettle === "refund" ? preturnAccountId || null : undefined,
        reason: preturnReason,
      },
      (note) => {
        box.number = note.number;
      }
    );
    if (!id) {
      setPreturnError(t("sup.preturn.failed"));
      return;
    }
    if (box.number) setNotice({ ok: true, text: t("sup.preturn.success", { number: box.number }) });
    setPreturnTarget(null);
  };

  if (!can(role, "suppliersManage", "view")) return <PermDenied />;

  if (!ready) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  const detailPurchases = detail
    ? purchases
        .filter((p) => p.supplierId === detail.id)
        .slice()
        .sort((a, b) => b.ts.localeCompare(a.ts))
    : [];
  const detailPayments = detail
    ? supplierPayments
        .filter((p) => p.supplierId === detail.id)
        .slice()
        .sort((a, b) => b.ts.localeCompare(a.ts))
    : [];
  const detailReturns = detail
    ? purchaseReturns
        .filter((r) => r.supplierId === detail.id)
        .slice()
        .sort((a, b) => b.ts.localeCompare(a.ts))
    : [];
  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("sup.eyebrow")}</span>
          <h1 className="h2">{t("sup.title")}</h1>
          <p className="lead">{t("sup.subtitle")}</p>
        </div>

        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card kpi">
            <div className="kpi-icon amber">
              <IconTruck />
            </div>
            <div>
              <div className="kpi-label">{t("sup.kpi.payableLabel")}</div>
              <div className="kpi-value">{fmtPKR(summary.totalPayable)}</div>
              <div className="kpi-sub">{t("sup.kpi.payableSub")}</div>
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon brown">
              <IconTruck />
            </div>
            <div>
              <div className="kpi-label">{t("sup.kpi.countLabel")}</div>
              <div className="kpi-value">{fmtNum(summary.count)}</div>
              <div className="kpi-sub">{t("sup.kpi.countSub")}</div>
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon green">
              <IconTruck />
            </div>
            <div>
              <div className="kpi-label">{t("sup.kpi.purchasedLabel")}</div>
              <div className="kpi-value">{fmtPKR(summary.purchasedThisMonth)}</div>
              <div className="kpi-sub">{t("sup.kpi.purchasedSub")}</div>
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon green">
              <IconCash />
            </div>
            <div>
              <div className="kpi-label">{t("sup.kpi.paidLabel")}</div>
              <div className="kpi-value">{fmtPKR(summary.paidThisMonth)}</div>
              <div className="kpi-sub">{t("sup.kpi.paidSub")}</div>
            </div>
          </div>
        </div>

        <section className="card" aria-label="Purchase pipeline and AP tie-out" style={{ marginBottom: 22 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: "1.1rem" }}>پرچیز پائپ لائن — Draft / Confirmed / Received / Unpaid</h3>
          <p style={{ margin: "0 0 12px" }}>
            Draft: <b>{pipeline.draft}</b> · Confirmed (جاری): <b>{pipeline.confirmed}</b> · Received (مال واقعی موصول): <b>{pipeline.received}</b> · Unpaid (موصول مگر ادائیگی باقی): <b>{pipeline.unpaid}</b>
          </p>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.92rem" }}>
            Received کی گنتی محض حیثیت کے لیبل سے نہیں، موصول شدہ مال کی مقدار سے نکلتی ہے — اس لیے غلط "Confirmed" گنتی یہاں نہیں بن سکتی۔
            AP tie-out: سپلائر بیلنس کا مجموعہ {fmtPKR(apTieOut.subledger)} بمقابلہ payables GL {fmtPKR(apTieOut.gl)} — فرق {fmtPKR(apTieOut.subledger - apTieOut.gl)}
            {apTieOut.subledger - apTieOut.gl === 0 ? " (برابر ✓)" : " — فرق کی وجہ چیک کریں، دعویٰ نہیں کیا جا رہا۔"}
          </p>
          <p style={{ margin: "8px 0 0" }}>
            <a className="btn btn-ghost btn-sm" href="/purchase-orders">پرچیز آرڈر → بل (کنورژن) کھولیں</a>
          </p>
        </section>

        {notice && (
          <div
            className={notice.ok ? "note-box" : "form-error"}
            style={notice.ok ? { marginTop: 0, marginBottom: 22 } : { marginBottom: 22 }}
            role="status"
          >
            {notice.text}
          </div>
        )}

        <div className="toolbar">
          <div className="search-box">
            <IconSearch />
            <input
              type="search"
              placeholder={t("sup.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("sup.searchAria")}
            />
            {search && (
              <SearchClear
                onClear={() => setSearch("")}
                label={t("action.clearSearch")}
              />
            )}
          </div>
          {canManage && (
            <button type="button" className="btn btn-primary" onClick={openAdd}>
              <IconPlus /> {t("sup.add")}
            </button>
          )}
          {can(role, "purchaseOrders", "view") && (
            <Link href="/purchase-orders" className="btn btn-ghost">
              <IconTruck /> {t("sup.receiveAgainstPo")}
            </Link>
          )}
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("sup.th.supplier")}</th>
                <th>{t("sup.th.phone")}</th>
                <th>{t("sup.th.purchased")}</th>
                <th>{t("sup.th.paid")}</th>
                <th>{t("sup.th.balance")}</th>
                <th>{t("sup.th.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const purchased = supplierPurchased(purchases, s.id, purchaseReturns);
                /* Net paid = payments − refunds received (B4): with
                 * it, purchased − paid == balance on every row,
                 * even after a cash-refund purchase return. */
                const paid =
                  supplierPaid(supplierPayments, s.id) -
                  supplierRefunded(purchaseReturns, s.id);
                const balance = supplierBalance(purchases, supplierPayments, s.id, purchaseReturns);
                return (
                  <tr key={s.id}>
                    <td>
                      <b>{s.name}</b>
                      {s.company && (
                        <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                          {s.company}
                        </div>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{s.phone || "—"}</td>
                    <td>{fmtPKR(purchased)}</td>
                    <td>{fmtPKR(paid)}</td>
                    <td>
                      {balance > 0 ? (
                        <span className="badge red">
                          {t("sup.detail.payable", { amount: fmtPKR(balance) })}
                        </span>
                      ) : (
                        <span className="badge green">{t("sup.detail.settled")}</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDetail(s)}
                        >
                          {t("sup.action.view")}
                        </button>
                        {canManage && (
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openPurchase(s)}
                            aria-label={t("sup.aria.recordPurchase", { name: s.name })}
                            title={t("sup.purchase.title")}
                          >
                            <IconTruck />
                          </button>
                        )}
                        {canPay && (
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openPayment(s)}
                            aria-label={t("sup.aria.recordPayment", { name: s.name })}
                            title={t("sup.payment.title")}
                          >
                            <IconCash />
                          </button>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEdit(s)}
                            aria-label={t("sup.aria.edit", { name: s.name })}
                            title={t("action.edit")}
                          >
                            <IconEdit />
                          </button>
                        )}
                        {canManage && (
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => setDeleteTarget(s)}
                            aria-label={t("sup.aria.delete", { name: s.name })}
                            title={t("action.delete")}
                          >
                            <IconTrash />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty">
                      {suppliers.length === 0
                        ? t("sup.empty.none")
                        : t("sup.empty.noMatch")}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ---------- Add / Edit supplier ---------- */}
        {formOpen && (
          <div
            className="modal-backdrop"
            onClick={() => setFormOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={editing ? t("sup.form.editTitle") : t("sup.form.addTitle")}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{editing ? t("sup.form.editTitle") : t("sup.form.addTitle")}</h2>
              <p className="modal-sub">
                {editing ? t("sup.form.editSub") : t("sup.form.addSub")}
              </p>
              <form className="form" onSubmit={submitForm}>
                {formError && <div className="form-error">{formError}</div>}
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="sup-name">{t("sup.form.name")}</label>
                    <input
                      id="sup-name"
                      value={form.name}
                      onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                      placeholder={t("sup.form.namePh")}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sup-phone">{t("sup.form.phone")}</label>
                    <input
                      id="sup-phone"
                      value={form.phone}
                      onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                      placeholder={t("sup.form.phonePh")}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sup-company">{t("sup.form.company")}</label>
                    <input
                      id="sup-company"
                      value={form.company}
                      onChange={(e) => setForm((s) => ({ ...s, company: e.target.value }))}
                      placeholder={t("sup.form.companyPh")}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sup-notes">{t("sup.form.notes")}</label>
                    <input
                      id="sup-notes"
                      value={form.notes}
                      onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
                      placeholder={t("sup.form.notesPh")}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
                    <IconClose /> {t("action.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editing ? t("sup.form.saveChanges") : t("sup.add")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------- Delete supplier ---------- */}
        {deleteTarget && (
          <div
            className="modal-backdrop"
            onClick={() => setDeleteTarget(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t("sup.delete.aria")}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{t("sup.delete.title")}</h2>
              <p className="modal-sub">
                {deleteTarget.company
                  ? t("sup.delete.bodyCompany", {
                      name: deleteTarget.name,
                      company: deleteTarget.company,
                    })
                  : t("sup.delete.body", { name: deleteTarget.name })}
              </p>
              {deleteBlockReason(deleteTarget) ? (
                <>
                  <div className="form-error">{deleteBlockReason(deleteTarget)}</div>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                      {t("action.close")}
                    </button>
                  </div>
                </>
              ) : (
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                    {t("sup.delete.keep")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      deleteSupplier(deleteTarget.id);
                      setNotice({
                        ok: true,
                        text: t("sup.notice.deleted", { name: deleteTarget.name }),
                      });
                      setDeleteTarget(null);
                    }}
                  >
                    <IconTrash /> {t("action.delete")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------- Record purchase ---------- */}
        {purchaseTarget && (
          <div
            className="modal-backdrop"
            onClick={() => setPurchaseTarget(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t("sup.purchase.title")}
          >
            <div className="modal" style={{ width: "min(680px, 100%)" }} onClick={(e) => e.stopPropagation()}>
              <h2>{t("sup.purchase.title")}</h2>
              <p className="modal-sub">
                {purchaseTarget.company
                  ? t("sup.purchase.subCompany", {
                      name: purchaseTarget.name,
                      company: purchaseTarget.company,
                    })
                  : t("sup.purchase.sub", { name: purchaseTarget.name })}
              </p>
              <form className="form" onSubmit={submitPurchase}>
                {purchaseError && <div className="form-error">{purchaseError}</div>}
                {lines.map((line, idx) => {
                  const prod = products.find((p) => p.id === line.productId);
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 90px 120px auto",
                        gap: 10,
                        alignItems: "end",
                      }}
                    >
                      <div className="field">
                        <label htmlFor={`pur-prod-${idx}`}>{t("sup.purchase.product")}</label>
                        <select
                          id={`pur-prod-${idx}`}
                          value={line.productId}
                          onChange={(e) => updateLine(idx, { productId: e.target.value })}
                        >
                          {sortedProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (
                              {t("sup.purchase.inStock", {
                                qty: fmtNum(p.stockQty),
                                unit: fmtUnit(p.unit),
                              })}
                              )
                              {p.stockClass === "raw" ? ` · ${t("inv.rawBadge")}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label htmlFor={`pur-qty-${idx}`}>{t("sup.purchase.qty")}</label>
                        <input
                          id={`pur-qty-${idx}`}
                          type="number"
                          min={0}
                          step="any"
                          value={line.qty}
                          onChange={(e) => updateLine(idx, { qty: Math.max(0, Number(e.target.value) || 0) })}
                        />
                      </div>
                      <div className="field">
                        <label htmlFor={`pur-cost-${idx}`}>{t("sup.purchase.unitCost")}</label>
                        <input
                          id={`pur-cost-${idx}`}
                          type="number"
                          min={0}
                          step="any"
                          value={line.unitCost}
                          onChange={(e) => updateLine(idx, { unitCost: Math.max(0, Number(e.target.value) || 0) })}
                        />
                      </div>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={() => removeLine(idx)}
                        aria-label={t("sup.purchase.removeLine")}
                        disabled={lines.length <= 1}
                      >
                        <IconTrash />
                      </button>
                      {prod && (
                        <div style={{ gridColumn: "1 / -1", fontSize: "0.82rem", color: "var(--muted)", marginTop: -8 }}>
                          {t("sup.purchase.lineTotal", {
                            amount: fmtPKR(line.qty * line.unitCost),
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <button type="button" className="btn btn-ghost btn-sm" onClick={addLine}>
                  <IconPlus /> {t("sup.purchase.addLine")}
                </button>
                <div className="field">
                  <label htmlFor="pur-note">{t("sup.purchase.note")}</label>
                  <input
                    id="pur-note"
                    value={purchaseNote}
                    onChange={(e) => setPurchaseNote(e.target.value)}
                    placeholder={t("sup.purchase.notePh")}
                  />
                </div>
                {/* Phase C · C1 (§1.6): the receiving warehouse. */}
                <div className="field">
                  <label htmlFor="pur-warehouse">{t("wh.pickerLabel")}</label>
                  <select
                    id="pur-warehouse"
                    value={purchaseWhId}
                    onChange={(e) => setPurchaseWhId(e.target.value)}
                  >
                    {warehouses
                      .filter((w) => !w.archived)
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                          {w.isDefault ? ` ${t("wh.pickerDefaultSuffix")}` : ""}
                        </option>
                      ))}
                    {warehouses.length === 0 && (
                      <option value="">{t("wh.pickerNone")}</option>
                    )}
                  </select>
                </div>
                {purchasePreview.taxAmount > 0 ? (
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                        {t("sup.purchase.net")}
                      </span>
                      <b>{fmtPKR(purchasePreview.netTotal)}</b>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                        {t("sup.purchase.tax")}
                      </span>
                      <b>+ {fmtPKR(purchasePreview.taxAmount)}</b>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                        {t("sup.purchase.grossTotal")}
                      </span>
                      <b style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem" }}>
                        {fmtPKR(purchasePreview.grossTotal)}
                      </b>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "var(--muted)", fontWeight: 600 }}>
                      {t("sup.purchase.total")}
                    </span>
                    <b style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem" }}>
                      {fmtPKR(purchaseTotal)}
                    </b>
                  </div>
                )}
                <div className="note-box" style={{ marginTop: 0 }}>
                  {t("sup.purchase.costNote")}
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setPurchaseTarget(null)}>
                    <IconClose /> {t("action.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <IconTruck /> {t("sup.purchase.title")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------- Record payment ---------- */}
        {payNegWarn && (
          <NegativeBalanceWarning
            accountName={payNegWarn.accountName}
            amount={payNegWarn.amount}
            balanceAfter={payNegWarn.balanceAfter}
            onConfirm={() => {
              const proceed = payNegWarn.proceed;
              setPayNegWarn(null);
              proceed();
            }}
            onCancel={() => setPayNegWarn(null)}
          />
        )}

        {paymentTarget && (
          <div
            className="modal-backdrop"
            onClick={() => setPaymentTarget(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t("sup.payment.aria")}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{t("sup.payment.title")}</h2>
              <p className="modal-sub">
                {t("sup.payment.sub", {
                  name: paymentTarget.name,
                  balance: fmtPKR(
                    supplierBalance(purchases, supplierPayments, paymentTarget.id, purchaseReturns)
                  ),
                })}
              </p>
              <form className="form" onSubmit={submitPayment}>
                {payError && <div className="form-error">{payError}</div>}
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="pay-amount">{t("sup.payment.amount")}</label>
                    <input
                      id="pay-amount"
                      type="number"
                      min={0}
                      step="any"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="pay-method">{t("sup.payment.method")}</label>
                    <select
                      id="pay-method"
                      value={payMethod}
                      onChange={(e) => {
                        setPayMethod(e.target.value as PayMethodValue);
                        setPayAccountId("");
                      }}
                    >
                      <option value="cash">{t("common.pay.cash")}</option>
                      <option value="jazzcash">{t("common.pay.jazzcash")}</option>
                      <option value="easypaisa">{t("common.pay.easypaisa")}</option>
                      <option value="bank">{t("common.pay.bank")}</option>
                      <option value="cheque">{t("chq.payOption")}</option>
                    </select>
                  </div>
                  <AccountPicker
                    method={payMethod === "cheque" ? "bank" : payMethod}
                    value={payAccountId}
                    onChange={setPayAccountId}
                    label={t("common.account")}
                  />
                  {payMethod === "cheque" && (
                    <ChequeFields
                      idPrefix="sup-chq"
                      value={payCheque}
                      onChange={setPayCheque}
                    />
                  )}
                </div>
                <div className="field">
                  <label htmlFor="pay-note">{t("sup.payment.note")}</label>
                  <input
                    id="pay-note"
                    value={payNote}
                    onChange={(e) => setPayNote(e.target.value)}
                    placeholder={t("sup.payment.notePh")}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setPaymentTarget(null)}>
                    <IconClose /> {t("action.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <IconCash /> {t("sup.payment.title")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------- Purchase return (B4) ---------- */}
        {preturnTarget && (
          <div
            className="modal-backdrop"
            onClick={() => setPreturnTarget(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t("sup.preturn.title")}
          >
            <div className="modal" style={{ width: "min(620px, 100%)" }} onClick={(e) => e.stopPropagation()}>
              <h2>{t("sup.preturn.title")}</h2>
              <p className="modal-sub">
                {t("sup.preturn.sub", {
                  date: fmtDate(preturnTarget.ts),
                  amount: fmtPKR(preturnTarget.total),
                })}
              </p>
              <form className="form" onSubmit={submitPreturn}>
                {preturnError && <div className="form-error">{preturnError}</div>}
                <div style={{ display: "grid", gap: 10 }}>
                  {preturnTarget.items.map((it) => {
                    const already = purchaseReturnedQty(preturnTarget, purchaseReturns).get(it.productId) ?? 0;
                    const max = it.qty - already;
                    return (
                      <div
                        key={it.productId}
                        style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}
                      >
                        <div style={{ flex: "1 1 150px" }}>
                          <b style={{ fontSize: "0.92rem" }}>{it.name}</b>
                          <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                            {t("sup.preturn.purchasedLine", {
                              qty: fmtNum(it.qty),
                              cost: fmtPKR(it.unitCost),
                            })}
                            {already > 0
                              ? ` · ${t("sup.preturn.alreadyReturned", { qty: fmtNum(already) })}`
                              : ""}
                          </div>
                        </div>
                        <div className="field" style={{ flex: "0 0 130px" }}>
                          <input
                            type="number"
                            min={0}
                            max={max}
                            step="any"
                            disabled={max <= 0}
                            value={preturnQty[it.productId] ?? ""}
                            onChange={(e) => setPreturnQty((s) => ({ ...s, [it.productId]: e.target.value }))}
                            placeholder="0"
                            aria-label={t("sup.preturn.qty")}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label>{t("sup.preturn.settlement")}</label>
                    <select
                      value={preturnSettle}
                      onChange={(e) => setPreturnSettle(e.target.value as "offset" | "refund")}
                    >
                      <option value="offset">{t("sup.preturn.offset")}</option>
                      <option value="refund">{t("sup.preturn.refund")}</option>
                    </select>
                  </div>
                  {preturnSettle === "refund" && (
                    <>
                      <div className="field">
                        <label>{t("sup.preturn.method")}</label>
                        <select
                          value={preturnMethod}
                          onChange={(e) => {
                            setPreturnMethod(e.target.value as RefundMethod);
                            setPreturnAccountId("");
                          }}
                        >
                          <option value="cash">{t("common.pay.cash")}</option>
                          <option value="jazzcash">{t("common.pay.jazzcash")}</option>
                          <option value="easypaisa">{t("common.pay.easypaisa")}</option>
                          <option value="bank">{t("common.pay.bank")}</option>
                        </select>
                      </div>
                      <AccountPicker
                        method={preturnMethod}
                        value={preturnAccountId}
                        onChange={setPreturnAccountId}
                        label={t("sup.preturn.account")}
                      />
                    </>
                  )}
                  <div className="field">
                    <label>{t("sup.preturn.reason")}</label>
                    <input
                      value={preturnReason}
                      onChange={(e) => setPreturnReason(e.target.value)}
                      placeholder={t("sup.preturn.reasonPh")}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setPreturnTarget(null)}>
                    <IconClose /> {t("action.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {t("sup.preturn.submit")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------- Detail ---------- */}
        {detail && (
          <div
            className="modal-backdrop"
            onClick={() => setDetail(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t("sup.detail.aria")}
          >
            <div className="modal" style={{ width: "min(760px, 100%)" }} onClick={(e) => e.stopPropagation()}>
              <h2>{detail.name}</h2>
              <p className="modal-sub">
                {detail.company ? `${detail.company} · ` : ""}
                {detail.phone || t("sup.detail.noPhone")}
                {detail.notes ? ` · ${detail.notes}` : ""}
              </p>

              <div className="card kpi" style={{ marginBottom: 20 }}>
                <div className="kpi-icon amber">
                  <IconTruck />
                </div>
                <div>
                  <div className="kpi-label">{t("sup.detail.balanceLabel")}</div>
                  <div className="kpi-value">
                    {fmtPKR(supplierBalance(purchases, supplierPayments, detail.id, purchaseReturns))}
                  </div>
                  <div className="kpi-sub">
                    {supplierReturned(purchaseReturns, detail.id) > 0
                      ? t("sup.detail.summaryFull", {
                          purchased: fmtPKR(
                            supplierPurchased(purchases, detail.id, purchaseReturns) +
                              supplierReturned(purchaseReturns, detail.id)
                          ),
                          returned: fmtPKR(supplierReturned(purchaseReturns, detail.id)),
                          paid: fmtPKR(
                            supplierPaid(supplierPayments, detail.id) -
                              supplierRefunded(purchaseReturns, detail.id)
                          ),
                        })
                      : t("sup.detail.summary", {
                          purchased: fmtPKR(supplierPurchased(purchases, detail.id, purchaseReturns)),
                          paid: fmtPKR(supplierPaid(supplierPayments, detail.id)),
                        })}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
                {canManage && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const s = detail;
                      setDetail(null);
                      openPurchase(s);
                    }}
                  >
                    <IconTruck /> {t("sup.purchase.title")}
                  </button>
                )}
                {canPay && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const s = detail;
                      setDetail(null);
                      openPayment(s);
                    }}
                  >
                    <IconCash /> {t("sup.payment.title")}
                  </button>
                )}
              </div>

              <h3 style={{ fontSize: "1.1rem", marginBottom: 10 }}>
                {t("sup.detail.purchasesTitle")}
              </h3>
              {detailPurchases.length === 0 ? (
                <div className="empty" style={{ padding: "24px 20px" }}>
                  {t("sup.detail.noPurchases")}
                </div>
              ) : (
                <div className="table-wrap" style={{ marginBottom: 22 }}>
                  <table className="data" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th>{t("sup.detail.th.date")}</th>
                        <th>{t("sup.detail.th.items")}</th>
                        <th>{t("sup.detail.th.total")}</th>
                        {canNote && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {detailPurchases.map((p) => {
                        const retQty = purchaseReturnedQty(p, purchaseReturns);
                        const returnedTotal = [...retQty.values()].reduce((a, n) => a + n, 0);
                        const returnable = p.items.some(
                          (i) => i.qty - (retQty.get(i.productId) ?? 0) > 0
                        );
                        return (
                        <tr key={p.id}>
                          <td style={{ whiteSpace: "nowrap" }}>{fmtDate(p.ts)}</td>
                          <td>
                            {p.items.map((i) => `${i.name} × ${fmtNum(i.qty)}`).join(", ")}
                            {p.sourcePoId && (
                              <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                                {(() => {
                                  const po = purchaseOrders.find((x) => x.id === p.sourcePoId);
                                  return po?.number
                                    ? t("sup.detail.fromPo", { number: po.number })
                                    : t("sup.detail.fromPoDraft");
                                })()}
                              </div>
                            )}
                            {returnedTotal > 0 && (
                              <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                                {t("sup.preturn.alreadyReturned", { qty: fmtNum(returnedTotal) })}
                              </div>
                            )}
                            {p.note && (
                              <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{p.note}</div>
                            )}
                          </td>
                          <td><b>{fmtPKR(p.total)}</b></td>
                          {canNote && (
                            <td style={{ whiteSpace: "nowrap" }}>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                disabled={!returnable}
                                onClick={() => openPreturn(p)}
                              >
                                {t("sup.preturn.button")}
                              </button>
                            </td>
                          )}
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={{ fontSize: "1.1rem", marginBottom: 10 }}>
                {t("sup.preturn.historyTitle")}
              </h3>
              {detailReturns.length === 0 ? (
                <div className="empty" style={{ padding: "24px 20px", marginBottom: 22 }}>
                  {t("sup.preturn.noReturns")}
                </div>
              ) : (
                <div className="table-wrap" style={{ marginBottom: 22 }}>
                  <table className="data" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th>{t("sup.detail.th.date")}</th>
                        <th>{t("sup.detail.th.items")}</th>
                        <th>{t("sup.detail.th.total")}</th>
                        <th>{t("note.settlement")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailReturns.map((r) => {
                        const src = purchases.find((p) => p.id === r.purchaseId);
                        return (
                          <tr key={r.id}>
                            <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.ts)}</td>
                            <td>
                              {r.items.map((i) => `${i.name} × ${fmtNum(i.qty)}`).join(", ")}
                              {src && (
                                <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                                  {t("sup.preturn.against", { date: fmtDate(src.ts) })}
                                </div>
                              )}
                            </td>
                            <td><b>{fmtPKR(r.payableOffset + r.refundAmount)}</b></td>
                            <td>
                              {t(r.payableOffset > 0 ? "note.settle.payable_offset" : "note.settle.cash_refund")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={{ fontSize: "1.1rem", marginBottom: 10 }}>
                {t("sup.detail.paymentsTitle")}
              </h3>
              {detailPayments.length === 0 ? (
                <div className="empty" style={{ padding: "24px 20px" }}>
                  {t("sup.detail.noPayments")}
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th>{t("sup.detail.th.date")}</th>
                        <th>{t("sup.detail.th.method")}</th>
                        <th>{t("sup.detail.th.amount")}</th>
                        <th>{t("sup.detail.th.note")}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailPayments.map((p) => (
                        <tr key={p.id}>
                          <td style={{ whiteSpace: "nowrap" }}>{fmtDate(p.ts)}</td>
                          <td>
                            {p.kind === "reversal"
                              ? t("fin.ref.chequeBounce")
                              : p.instrument === "cheque"
                                ? `${t("chq.payOption")}${
                                    p.chequeId
                                      ? ` ${cheques.find((x) => x.id === p.chequeId)?.chequeNo ?? ""}`
                                      : ""
                                  }`
                                : t(PAY_METHOD_KEY[p.method])}
                            {p.kind !== "reversal" && (
                              <div style={{ fontSize: "0.78rem", color: "var(--muted-2)", marginTop: 3 }}>
                                {p.voucherNo ?? "—"}
                              </div>
                            )}
                          </td>
                          <td><b>{fmtPKR(p.amount)}</b></td>
                          <td>{p.note || "—"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>
                            {p.kind !== "reversal" && canVoucher && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => printVoucher(p)}
                              >
                                {t("action.print")}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setDetail(null)}>
                  <IconClose /> {t("action.close")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* B6: the payment voucher — the payment row itself,
            printed (§5.2). Balance-after is the supplier's CURRENT
            derived payable, as the design prescribes. */}
        {printPayment && (
          <VoucherPrintSheet
            data={paymentVoucherData(
              printPayment,
              suppliers.find((s) => s.id === printPayment.supplierId)?.name ?? "",
              {
                accountName: printPayment.accountId
                  ? (accounts.find((a) => a.id === printPayment.accountId)?.name ?? null)
                  : null,
                cheque: printPayment.chequeId
                  ? (cheques.find((c) => c.id === printPayment.chequeId) ?? null)
                  : null,
                balanceAfter: supplierBalance(
                  purchases,
                  supplierPayments,
                  printPayment.supplierId,
                  purchaseReturns
                ),
              }
            )}
            settings={settings}
            assets={brandingDataUrls(branding)}
          />
        )}
      </div>
    </div>
  );
}
