"use client";

/**
 * Phase C · C2 — the Stock Transfers workspace (design §2).
 *
 * Movement documents between the shop's OWN warehouses: draft →
 * dispatch (source rows drop, TR- number minted, goods on the
 * road) → receives (partial allowed; destination rows rise) →
 * received. Two other exits for an open transfer: return-to-source
 * (what is still on the road goes back) and close-short (the
 * proven shortage posts as a stock loss — the ONE posting a
 * transfer can produce, §2.3).
 *
 * RBAC: the `warehouses` matrix row (design §6.1 — the row
 * governs transfers) — owner/manager full, accountant read-only,
 * cashier no view. Every figure on this page is DERIVED from the
 * transfer documents + stock rows (in-transit is a derivation,
 * never a stored counter, §2.2).
 */
import { useMemo, useRef, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import PermDenied from "./PermDenied";
import { useLang } from "./LangProvider";
import { TransferPrintSheet } from "./DocPrintSheet";
import {
  IconClose,
  IconPlus,
  IconSearch,
  IconTrash,
  ProductResultList,
  SearchClear,
  pickerKeyDown,
} from "./ui";
import { fmtNum, fmtPKR, fmtUnit } from "@/lib/format";
import { can } from "@/lib/permissions";
import { brandingDataUrls } from "@/lib/branding";
import { isPeriodLockedError } from "@/lib/periods";
import { nextDocNumber } from "@/lib/documents";
import { filterProducts } from "@/lib/search";
import {
  activeWarehouses,
  qtyAtWarehouse,
  sortedWarehouses,
} from "@/lib/stock";
import {
  composeTransferLines,
  inTransitTotalQty,
  isOpenTransfer,
  lineRemaining,
  transferLossValue,
  transferRouteProblem,
  transferShortages,
  validateReceivePicks,
} from "@/lib/transfers";
import type { I18nKey } from "@/lib/i18n";
import type { StockTransfer } from "@/lib/types";

function fmtQty(n: number): string {
  return Number.isInteger(n) ? fmtNum(n) : String(Math.round(n * 1000) / 1000);
}

const STATUS_KEY: Record<StockTransfer["status"], I18nKey> = {
  draft: "tr.status.draft",
  dispatched: "tr.status.dispatched",
  partially_received: "tr.status.partially_received",
  received: "tr.status.received",
  returned: "tr.status.returned",
  cancelled: "tr.status.cancelled",
};

interface FormLine {
  productId: string;
  qty: number;
}

export default function TransfersView() {
  const {
    ready,
    products,
    warehouses,
    stockLevels,
    stockTransfers,
    settings,
    branding,
    createStockTransfer,
    updateStockTransfer,
    deleteStockTransfer,
    cancelStockTransfer,
    dispatchStockTransfer,
    receiveStockTransfer,
    closeStockTransfer,
    returnStockTransfer,
  } = useStore();
  const { role } = useAuth();
  const { t } = useLang();
  const canWrite = can(role, "warehouses", "write");

  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [printDoc, setPrintDoc] = useState<StockTransfer | null>(null);

  /* ---- create / edit form ---- */
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StockTransfer | null>(null);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [note, setNote] = useState("");
  const [formLines, setFormLines] = useState<FormLine[]>([]);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [formPickIdx, setFormPickIdx] = useState(0);
  const formSearchRef = useRef<HTMLInputElement | null>(null);

  /* ---- receive / close / return modals ---- */
  const [receiveTarget, setReceiveTarget] = useState<StockTransfer | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});
  const [receiveError, setReceiveError] = useState("");
  const [closeTarget, setCloseTarget] = useState<StockTransfer | null>(null);
  const [returnTarget, setReturnTarget] = useState<StockTransfer | null>(null);

  const whName = useMemo(() => {
    const byId = new Map(warehouses.map((w) => [w.id, w.name]));
    return (id: string) => byId.get(id) ?? id;
  }, [warehouses]);

  const sorted = useMemo(
    () => [...stockTransfers].sort((a, b) => b.ts.localeCompare(a.ts)),
    [stockTransfers]
  );
  const selected = sorted.find((x) => x.id === selectedId) ?? sorted[0] ?? null;
  const inTransit = useMemo(() => inTransitTotalQty(stockTransfers), [stockTransfers]);
  const openCount = useMemo(
    () => stockTransfers.filter(isOpenTransfer).length,
    [stockTransfers]
  );
  const productsById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products]
  );

  if (!ready) return null;
  if (!can(role, "warehouses", "view")) return <PermDenied />;

  /* ---------------- form ---------------- */
  const pickable = filterProducts(
    [...products].sort((a, b) => a.name.localeCompare(b.name)),
    search
  );

  /* POS picker: results only while searching; click/Enter adds
   * the line straight away — no select-then-pick step. */
  const formSearching = search.trim().length > 0;
  const formPickResults = formSearching ? pickable.slice(0, 12) : [];
  const formLineQty = new Map(formLines.map((l) => [l.productId, l.qty]));
  const addFormLineAndReset = (productId: string) => {
    addFormLine(productId);
    setSearch("");
    setFormPickIdx(0);
    formSearchRef.current?.focus();
  };
  const onFormPickerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    pickerKeyDown(e, formPickResults.length, formPickIdx, setFormPickIdx, () => {
      const p = formPickResults[formPickIdx] ?? formPickResults[0];
      if (p) addFormLineAndReset(p.id);
    });
  };

  const openCreate = () => {
    const active = activeWarehouses(warehouses);
    setEditing(null);
    setFromId(active[0]?.id ?? "");
    setToId(active[1]?.id ?? active[0]?.id ?? "");
    setNote("");
    setFormLines([]);
    setFormError("");
    setSearch("");
    setFormOpen(true);
  };
  const openEdit = (tr: StockTransfer) => {
    setEditing(tr);
    setFromId(tr.fromWarehouseId);
    setToId(tr.toWarehouseId);
    setNote(tr.note);
    setFormLines(tr.lines.map((l) => ({ productId: l.productId, qty: l.qtySent })));
    setFormError("");
    setSearch("");
    setFormOpen(true);
  };
  const addFormLine = (productId: string) => {
    if (!productId) return;
    setFormLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [...prev, { productId, qty: 1 }];
    });
  };
  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = transferRouteProblem(fromId, toId, warehouses);
    if (problem === "same") return setFormError(t("tr.err.same"));
    if (problem === "missing") return setFormError(t("tr.err.route"));
    if (problem === "archived") return setFormError(t("tr.err.archived"));
    if (!composeTransferLines(products, formLines)) {
      return setFormError(t("tr.lines.empty"));
    }
    const input = {
      fromWarehouseId: fromId,
      toWarehouseId: toId,
      lines: formLines,
      note,
    };
    if (editing) {
      if (updateStockTransfer(editing.id, input)) {
        setNotice({ ok: true, text: t("tr.notice.updated") });
      }
    } else {
      const id = createStockTransfer(input);
      if (id) {
        setSelectedId(id);
        setNotice({ ok: true, text: t("tr.notice.created") });
      }
    }
    setFormOpen(false);
    setEditing(null);
  };

  /* ---------------- lifecycle ---------------- */
  const doDispatch = (tr: StockTransfer) => {
    const expected = nextDocNumber(
      "stockTransfer",
      stockTransfers.map((x) => x.number),
      settings
    );
    if (dispatchStockTransfer(tr.id)) {
      setNotice({ ok: true, text: t("tr.notice.dispatched", { number: expected }) });
    }
  };
  const doCancel = (tr: StockTransfer) => {
    if (cancelStockTransfer(tr.id)) {
      setNotice({ ok: true, text: t("tr.notice.cancelled") });
    }
  };
  const doDelete = (tr: StockTransfer) => {
    deleteStockTransfer(tr.id);
    if (selectedId === tr.id) setSelectedId("");
    setNotice({ ok: true, text: t("tr.notice.deleted") });
  };
  const doPrint = (tr: StockTransfer) => {
    setPrintDoc(tr);
    setTimeout(() => window.print(), 60);
  };

  const openReceive = (tr: StockTransfer) => {
    setReceiveTarget(tr);
    setReceiveQtys({});
    setReceiveError("");
  };
  const submitReceive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveTarget) return;
    const picks = receiveTarget.lines
      .map((l) => ({ productId: l.productId, qty: Number(receiveQtys[l.productId] ?? 0) }))
      .filter((p) => p.qty > 0);
    if (!validateReceivePicks(receiveTarget, picks)) {
      return setReceiveError(t("tr.err.overReceive"));
    }
    const sentTotal = receiveTarget.lines.reduce((a, l) => a + l.qtySent, 0);
    const receivedAfter =
      receiveTarget.lines.reduce((a, l) => a + l.qtyReceived, 0) +
      picks.reduce((a, p) => a + p.qty, 0);
    if (receiveStockTransfer(receiveTarget.id, picks)) {
      setNotice({
        ok: true,
        text:
          receivedAfter >= sentTotal
            ? t("tr.notice.receivedFull", { number: receiveTarget.number ?? "" })
            : t("tr.notice.received", { number: receiveTarget.number ?? "" }),
      });
      setReceiveTarget(null);
    } else {
      setReceiveError(t("tr.err.overReceive"));
    }
  };

  const submitClose = () => {
    if (!closeTarget) return;
    const shortages = transferShortages(closeTarget);
    const loss = transferLossValue(shortages, productsById);
    try {
      if (closeStockTransfer(closeTarget.id)) {
        setNotice({
          ok: true,
          text: t("tr.notice.closedShort", {
            number: closeTarget.number ?? "",
            amount: fmtPKR(loss),
          }),
        });
        setCloseTarget(null);
      }
    } catch (err) {
      if (isPeriodLockedError(err)) {
        setNotice({ ok: false, text: t("fin.period.lockedError") });
        setCloseTarget(null);
      } else {
        throw err;
      }
    }
  };

  const submitReturn = () => {
    if (!returnTarget) return;
    if (returnStockTransfer(returnTarget.id)) {
      setNotice({
        ok: true,
        text: t("tr.notice.returned", {
          number: returnTarget.number ?? "",
          name: whName(returnTarget.fromWarehouseId),
        }),
      });
      setReturnTarget(null);
    }
  };

  const closeShortages = closeTarget ? transferShortages(closeTarget) : [];
  const closeLoss = closeTarget
    ? transferLossValue(closeShortages, productsById)
    : 0;
  const returnRemaining = returnTarget
    ? transferShortages(returnTarget).reduce((a, s) => a + s.qty, 0)
    : 0;

  return (
    <div className="section">
      <div className="container">
        <div className="section-head" style={{ textAlign: "start", marginBottom: 8 }}>
          <span className="eyebrow">{t("tr.eyebrow")}</span>
          <h2 style={{ fontSize: "1.9rem" }}>{t("tr.title")}</h2>
          <p style={{ marginInlineStart: 0 }}>{t("tr.subtitle")}</p>
        </div>

        {notice && (
          <div className={`notice ${notice.ok ? "ok" : "err"}`} role="status" style={{ marginBottom: 16 }}>
            {notice.text}
          </div>
        )}

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
          <span className="badge" style={{ fontSize: "0.92rem", padding: "6px 12px" }}>
            {inTransit > 0
              ? `${t("tr.summary.inTransit", { qty: fmtQty(inTransit) })} · ${t("tr.summary.open", { count: openCount })}`
              : t("tr.summary.none")}
          </span>
          <div style={{ flex: "1 1 auto" }} />
          {canWrite && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <IconPlus /> {t("tr.add")}
            </button>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="empty">{t("tr.empty")}</div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 22 }}>
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("tr.col.number")}</th>
                    <th>{t("tr.col.route")}</th>
                    <th className="num">{t("tr.col.items")}</th>
                    <th className="num">{t("tr.col.sent")}</th>
                    <th className="num">{t("tr.col.received")}</th>
                    <th className="num">{t("tr.col.remaining")}</th>
                    <th>{t("tr.col.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((tr) => {
                    const sent = tr.lines.reduce((a, l) => a + l.qtySent, 0);
                    const received = tr.lines.reduce((a, l) => a + l.qtyReceived, 0);
                    return (
                      <tr
                        key={tr.id}
                        onClick={() => setSelectedId(tr.id)}
                        style={{
                          cursor: "pointer",
                          background:
                            selected?.id === tr.id
                              ? "var(--surface-2, rgba(0,0,0,0.03))"
                              : undefined,
                        }}
                      >
                        <td>
                          <b>{tr.number ?? t("doc.draftLabel")}</b>
                        </td>
                        <td>
                          {whName(tr.fromWarehouseId)} → {whName(tr.toWarehouseId)}
                        </td>
                        <td className="num">{tr.lines.length}</td>
                        <td className="num">{fmtQty(sent)}</td>
                        <td className="num">{fmtQty(received)}</td>
                        <td className="num">
                          {isOpenTransfer(tr) ? fmtQty(sent - received) : "—"}
                        </td>
                        <td>
                          <span className={`badge${tr.status === "received" ? " green" : ""}`}>
                            {t(STATUS_KEY[tr.status])}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---- selected transfer: lines + lifecycle actions ---- */}
        {selected && (
          <div className="card" style={{ padding: 18, marginBottom: 22 }}>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0, flex: "1 1 auto" }}>
                {selected.number ?? t("doc.draftLabel")} · {whName(selected.fromWarehouseId)}{" "}
                → {whName(selected.toWarehouseId)}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => doPrint(selected)}>
                {t("tr.action.print")}
              </button>
              {canWrite && selected.status === "draft" && (
                <>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(selected)}>
                    {t("tr.action.edit")}
                  </button>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => doDispatch(selected)}>
                    {t("tr.action.dispatch")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => doCancel(selected)}>
                    {t("tr.action.cancelTransfer")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => doDelete(selected)}>
                    {t("tr.action.delete")}
                  </button>
                </>
              )}
              {canWrite && isOpenTransfer(selected) && (
                <>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => openReceive(selected)}>
                    {t("tr.action.receive")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCloseTarget(selected)}>
                    {t("tr.action.closeShort")}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReturnTarget(selected)}>
                    {t("tr.action.returnToSource")}
                  </button>
                </>
              )}
            </div>
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("tr.col.product")}</th>
                    <th className="num">{t("tr.col.sent")}</th>
                    <th className="num">{t("tr.col.received")}</th>
                    <th className="num">{t("tr.col.remaining")}</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.lines.map((l) => {
                    const p = productsById.get(l.productId);
                    return (
                      <tr key={l.productId}>
                        <td>
                          {l.name}
                          {p && (
                            <span style={{ color: "var(--muted)" }}> · {fmtUnit(p.unit)}</span>
                          )}
                        </td>
                        <td className="num">{fmtQty(l.qtySent)}</td>
                        <td className="num">{fmtQty(l.qtyReceived)}</td>
                        <td className="num">
                          {isOpenTransfer(selected) ? fmtQty(lineRemaining(l)) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {selected.note && (
              <p style={{ color: "var(--muted)", margin: "10px 0 0" }}>{selected.note}</p>
            )}
          </div>
        )}

        {/* ---- create / edit modal ---- */}
        {formOpen && canWrite && (
          <div
            className="modal-backdrop"
            onClick={() => setFormOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={t(editing ? "tr.form.editTitle" : "tr.form.addTitle")}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
              <h2>{t(editing ? "tr.form.editTitle" : "tr.form.addTitle")}</h2>
              <form className="form" onSubmit={submitForm}>
                {formError && <div className="form-error">{formError}</div>}
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="tr-from">{t("tr.form.from")}</label>
                    <select id="tr-from" value={fromId} onChange={(e) => setFromId(e.target.value)}>
                      {sortedWarehouses(warehouses).map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                          {w.isDefault ? ` ${t("wh.pickerDefaultSuffix")}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="tr-to">{t("tr.form.to")}</label>
                    <select id="tr-to" value={toId} onChange={(e) => setToId(e.target.value)}>
                      {sortedWarehouses(warehouses).map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                          {w.isDefault ? ` ${t("wh.pickerDefaultSuffix")}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="hint" style={{ margin: "0 0 12px" }}>
                  ٹرانسفر کے لیے ماخذ اور منزل دو مختلف وئیرہاؤسز ہونے چاہئیں — ایک ہی وئیرہاؤس چننے پر فارم روک دیا جاتا ہے۔ مکمل ہونے پر ماخذ کا اسٹاک کم اور منزل کا بڑھ جاتا ہے، دونوں طرف ایک ساتھ۔
                </p>
                <div className="field">
                  <label htmlFor="tr-search">{t("tr.lines.product")}</label>
                  <div className="search-box" style={{ maxWidth: "none" }}>
                    <IconSearch />
                    <input
                      id="tr-search"
                      ref={formSearchRef}
                      type="search"
                      placeholder={t("tr.lines.searchPh")}
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setFormPickIdx(0);
                      }}
                      onKeyDown={onFormPickerKeyDown}
                    />
                    {search && (
                      <SearchClear
                        onClear={() => {
                          setSearch("");
                          setFormPickIdx(0);
                          formSearchRef.current?.focus();
                        }}
                        label={t("action.clearSearch")}
                      />
                    )}
                  </div>
                  {formSearching && (
                    <div style={{ marginTop: 10 }}>
                      <ProductResultList
                        items={formPickResults.map((p) => ({
                          id: p.id,
                          name: p.name,
                          meta:
                            fromId
                              ? t("tr.lines.atSource", {
                                  qty: fmtQty(
                                    qtyAtWarehouse(p, stockLevels, warehouses, fromId)
                                  ),
                                })
                              : `${fmtQty(p.stockQty)} ${fmtUnit(p.unit)}`,
                          badge: p.stockClass === "raw" ? t("inv.rawBadge") : null,
                          inCartQty: formLineQty.get(p.id),
                          inCartLabel: `× ${fmtQty(formLineQty.get(p.id) ?? 0)}`,
                        }))}
                        activeIndex={formPickIdx}
                        onPick={addFormLineAndReset}
                        emptyText={t("tr.lines.noResults", { query: search.trim() })}
                        listLabel={t("tr.lines.product")}
                      />
                    </div>
                  )}
                </div>
                {formLines.length > 0 && (
                  <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
                    <table className="table">
                      <tbody>
                        {formLines.map((l) => {
                          const p = productsById.get(l.productId);
                          return (
                            <tr key={l.productId}>
                              <td>
                                {p?.name ?? l.productId}
                                {p && fromId && (
                                  <span style={{ color: "var(--muted)" }}>
                                    {" "}
                                    ·{" "}
                                    {t("tr.lines.atSource", {
                                      qty: fmtQty(
                                        qtyAtWarehouse(p, stockLevels, warehouses, fromId)
                                      ),
                                    })}
                                  </span>
                                )}
                              </td>
                              <td className="num" style={{ width: 130 }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={l.qty}
                                  aria-label={t("tr.col.sent")}
                                  onChange={(e) =>
                                    setFormLines((prev) =>
                                      prev.map((x) =>
                                        x.productId === l.productId
                                          ? { ...x, qty: Number(e.target.value) }
                                          : x
                                      )
                                    )
                                  }
                                  style={{ width: "100%" }}
                                />
                              </td>
                              <td style={{ width: 44 }}>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  aria-label={t("tr.action.delete")}
                                  onClick={() =>
                                    setFormLines((prev) =>
                                      prev.filter((x) => x.productId !== l.productId)
                                    )
                                  }
                                >
                                  <IconTrash />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="field">
                  <label htmlFor="tr-note">{t("tr.form.note")}</label>
                  <input
                    id="tr-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("tr.form.notePh")}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
                    <IconClose /> {t("action.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {t("action.save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---- receive modal ---- */}
        {receiveTarget && canWrite && (
          <div
            className="modal-backdrop"
            onClick={() => setReceiveTarget(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t("tr.receive.title", { number: receiveTarget.number ?? "" })}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
              <h2>{t("tr.receive.title", { number: receiveTarget.number ?? "" })}</h2>
              <form className="form" onSubmit={submitReceive}>
                {receiveError && <div className="form-error">{receiveError}</div>}
                <p style={{ color: "var(--muted)", marginTop: 0 }}>{t("tr.receive.help")}</p>
                <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t("tr.col.product")}</th>
                        <th className="num">{t("tr.receive.thisTime")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiveTarget.lines
                        .filter((l) => lineRemaining(l) > 0)
                        .map((l) => (
                          <tr key={l.productId}>
                            <td>
                              {l.name}
                              <span style={{ color: "var(--muted)" }}>
                                {" "}
                                · {t("tr.receive.stillOut", { qty: fmtQty(lineRemaining(l)) })}
                              </span>
                            </td>
                            <td className="num" style={{ width: 130 }}>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={receiveQtys[l.productId] ?? ""}
                                aria-label={t("tr.receive.thisTime")}
                                onChange={(e) =>
                                  setReceiveQtys((prev) => ({
                                    ...prev,
                                    [l.productId]: e.target.value,
                                  }))
                                }
                                style={{ width: "100%" }}
                              />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setReceiveQtys(
                        Object.fromEntries(
                          receiveTarget.lines.map((l) => [
                            l.productId,
                            String(lineRemaining(l)),
                          ])
                        )
                      )
                    }
                  >
                    {t("tr.receive.fillAll")}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setReceiveTarget(null)}>
                    <IconClose /> {t("action.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {t("tr.receive.submit")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---- close-short modal ---- */}
        {closeTarget && canWrite && (
          <div
            className="modal-backdrop"
            onClick={() => setCloseTarget(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t("tr.close.title", { number: closeTarget.number ?? "" })}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <h2>{t("tr.close.title", { number: closeTarget.number ?? "" })}</h2>
              <p style={{ color: "var(--muted)" }}>{t("tr.close.body")}</p>
              <ul style={{ margin: "0 0 12px", paddingInlineStart: 18 }}>
                {closeShortages.map((s) => (
                  <li key={s.productId}>
                    {t("tr.close.line", {
                      name: s.name,
                      qty: fmtQty(s.qty),
                      amount: fmtPKR(s.qty * (productsById.get(s.productId)?.costPrice ?? 0)),
                    })}
                  </li>
                ))}
              </ul>
              <p>
                <b>
                  {t("tr.close.total")}: {fmtPKR(closeLoss)}
                </b>
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setCloseTarget(null)}>
                  <IconClose /> {t("action.cancel")}
                </button>
                <button type="button" className="btn btn-primary" onClick={submitClose}>
                  {t("tr.close.submit")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---- return-to-source modal ---- */}
        {returnTarget && canWrite && (
          <div
            className="modal-backdrop"
            onClick={() => setReturnTarget(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t("tr.return.title", { number: returnTarget.number ?? "" })}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <h2>{t("tr.return.title", { number: returnTarget.number ?? "" })}</h2>
              <p style={{ color: "var(--muted)" }}>
                {t("tr.return.body", {
                  qty: fmtQty(returnRemaining),
                  name: whName(returnTarget.fromWarehouseId),
                })}
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setReturnTarget(null)}>
                  <IconClose /> {t("action.cancel")}
                </button>
                <button type="button" className="btn btn-primary" onClick={submitReturn}>
                  {t("tr.return.submit")}
                </button>
              </div>
            </div>
          </div>
        )}

        {printDoc && (
          <TransferPrintSheet
            transfer={printDoc}
            settings={settings}
            assets={brandingDataUrls(branding)}
            fromName={whName(printDoc.fromWarehouseId)}
            toName={whName(printDoc.toWarehouseId)}
          />
        )}
      </div>
    </div>
  );
}
