"use client";

/**
 * Phase C · C1 — the Warehouses workspace (design §1.8).
 *
 * The management surface for the shop's stock LOCATIONS: create,
 * rename, archive and re-point the default warehouse, read the
 * per-warehouse stock position (on hand / promised / available /
 * value — all DERIVED from the stock rows + the promise
 * derivation, never stored counters), and repair a drifted
 * location split with the recount utility (§1.7).
 *
 * RBAC: the `warehouses` matrix row — owner/manager full,
 * accountant read-only, cashier no view (a cashier never reaches
 * this page; their desk pickers ride the billing/purchase rows,
 * G-C1). Warehouse CRUD is NON-POSTING master data: no action here
 * writes a journal entry, and the recount rewrites ROWS ONLY.
 */
import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import PermDenied from "./PermDenied";
import { useLang } from "./LangProvider";
import { IconClose, IconEdit, IconPlus } from "./ui";
import { fmtNum, fmtPKR, fmtUnit } from "@/lib/format";
import { can } from "@/lib/permissions";
import {
  availabilityByProductAtWarehouse,
  defaultWarehouseId,
  qtyAtWarehouse,
  rowsTotal,
  sortedWarehouses,
  stockDrift,
} from "@/lib/stock";
import { incomingByProductAtWarehouse } from "@/lib/transfers";
import type { Warehouse } from "@/lib/types";

function fmtQty(n: number): string {
  return Number.isInteger(n) ? fmtNum(n) : String(Math.round(n * 1000) / 1000);
}

export default function WarehousesView() {
  const {
    ready,
    products,
    warehouses,
    stockLevels,
    stockTransfers,
    saleOrders,
    deliveryChallans,
    bills,
    addWarehouse,
    updateWarehouse,
    setDefaultWarehouse,
    recountStockLevels,
  } = useStore();
  const { role } = useAuth();
  const { t } = useLang();
  const canWrite = can(role, "warehouses", "write");

  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");
  const [stockWhId, setStockWhId] = useState("");

  const sorted = useMemo(() => sortedWarehouses(warehouses), [warehouses]);
  const defId = defaultWarehouseId(warehouses);
  const viewWhId = stockWhId || defId;

  /* Per-warehouse position: units + value, derived from the rows
   * (value at the product's ONE cost price — §1.4). */
  const positionOf = useMemo(() => {
    return (whId: string) => {
      let units = 0;
      let value = 0;
      for (const p of products) {
        const q = qtyAtWarehouse(p, stockLevels, warehouses, whId);
        units += q;
        value += q * p.costPrice;
      }
      const items = products.filter((pp) => qtyAtWarehouse(pp, stockLevels, warehouses, whId) > 0).length;
      return { units, value, items };
    };
  }, [products, stockLevels, warehouses]);

  const availHere = useMemo(
    () =>
      availabilityByProductAtWarehouse(
        products,
        stockLevels,
        warehouses,
        saleOrders,
        deliveryChallans,
        bills,
        viewWhId
      ),
    [products, saleOrders, deliveryChallans, bills, stockLevels, warehouses, viewWhId]
  );

  /* Phase C · C2: goods on the road TO the viewed warehouse —
   *  derived from the open transfers (§2.2). Incoming is shown
   *  for expectation only: it is in NO warehouse's availability. */
  const incomingHere = useMemo(
    () => incomingByProductAtWarehouse(stockTransfers, viewWhId),
    [stockTransfers, viewWhId]
  );

  const stockRows = useMemo(
    () =>
      products
        .map((p) => {
          const a = availHere.get(p.id);
          const onHand = a?.onHand ?? qtyAtWarehouse(p, stockLevels, warehouses, viewWhId);
          return {
            product: p,
            onHand,
            promised: a?.promised ?? 0,
            available: a?.available ?? onHand,
            incoming: incomingHere.get(p.id) ?? 0,
            value: onHand * p.costPrice,
          };
        })
        .filter((r) => r.onHand !== 0 || r.promised !== 0 || r.incoming !== 0)
        .sort((a, b) => a.product.name.localeCompare(b.product.name)),
    [products, availHere, incomingHere, stockLevels, warehouses, viewWhId]
  );

  const drift = useMemo(
    () => stockDrift(products, stockLevels, stockTransfers),
    [products, stockLevels, stockTransfers]
  );

  if (!ready) return null;
  if (!can(role, "warehouses", "view")) return <PermDenied />;

  const openCreate = () => {
    setEditing(null);
    setName("");
    setNote("");
    setFormError("");
    setFormOpen(true);
  };
  const openEdit = (w: Warehouse) => {
    setEditing(w);
    setName(w.name);
    setNote(w.note);
    setFormError("");
    setFormOpen(true);
  };
  /* Live-audit fix G: closing the form clears the editing target
   * with it, so the card's Edit action and the form's Save are
   * never presented as simultaneous states. */
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };
  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError(t("wh.err.nameRequired"));
      return;
    }
    if (editing) {
      if (updateWarehouse(editing.id, { name: name.trim(), note: note.trim() })) {
        setNotice({ ok: true, text: t("wh.notice.updated") });
      }
    } else {
      const id = addWarehouse({ name: name.trim(), note: note.trim() });
      if (id) setNotice({ ok: true, text: t("wh.notice.created", { name: name.trim() }) });
    }
    setFormOpen(false);
    setEditing(null);
  };
  const doArchive = (w: Warehouse) => {
    if (w.isDefault) {
      setNotice({ ok: false, text: t("wh.cannotArchiveDefault") });
      return;
    }
    if (updateWarehouse(w.id, { archived: !w.archived })) {
      setNotice({
        ok: true,
        text: t(w.archived ? "wh.notice.unarchived" : "wh.notice.archived"),
      });
    }
  };
  const doDefault = (w: Warehouse) => {
    if (setDefaultWarehouse(w.id)) {
      setNotice({ ok: true, text: t("wh.notice.defaultSet", { name: w.name }) });
    }
  };
  const doRecount = () => {
    const n = recountStockLevels();
    setNotice({ ok: true, text: t("wh.drift.done", { count: n }) });
  };

  const totals = stockRows.reduce(
    (a, r) => ({
      onHand: a.onHand + r.onHand,
      promised: a.promised + r.promised,
      available: a.available + r.available,
      incoming: a.incoming + r.incoming,
      value: a.value + r.value,
    }),
    { onHand: 0, promised: 0, available: 0, incoming: 0, value: 0 }
  );

  return (
    <div className="section">
      <div className="container">
        <div className="section-head" style={{ textAlign: "start", marginBottom: 8 }}>
          <span className="eyebrow">{t("wh.eyebrow")}</span>
          <h2 style={{ fontSize: "1.9rem" }}>{t("wh.title")}</h2>
          <p style={{ marginInlineStart: 0 }}>{t("wh.subtitle")}</p>
        </div>

        {notice && (
          <div className={`notice ${notice.ok ? "ok" : "err"}`} role="status" style={{ marginBottom: 16 }}>
            {notice.text}
          </div>
        )}

        {/* §1.7: the drift detector — visible only when the split
            and the totals disagree. Totals/accounts are correct;
            only the split needs the recount. */}
        {drift.length > 0 && (
          <div className="card" style={{ marginBottom: 22, borderColor: "var(--amber, #d97706)" }}>
            <h3 style={{ margin: "0 0 6px" }}>{t("wh.drift.title")}</h3>
            <p style={{ color: "var(--muted)", margin: "0 0 10px" }}>
              {t("wh.drift.body", { count: drift.length })}
            </p>
            <ul style={{ margin: "0 0 12px", paddingInlineStart: 18 }}>
              {drift.slice(0, 8).map((d) => {
                const p = products.find((x) => x.id === d.productId);
                return (
                  <li key={d.productId}>
                    {t("wh.drift.item", {
                      name: p?.name ?? d.productId,
                      rows: fmtQty(rowsTotal(stockLevels, d.productId)),
                      total: fmtQty(p?.stockQty ?? 0),
                    })}
                  </li>
                );
              })}
            </ul>
            {canWrite && (
              <button type="button" className="btn btn-primary" onClick={doRecount}>
                {t("wh.drift.recount")}
              </button>
            )}
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
          <div style={{ flex: "1 1 auto" }} />
          {canWrite && (
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              <IconPlus /> {t("wh.add")}
            </button>
          )}
        </div>

        {sorted.length === 0 ? (
          <div className="empty" style={{ marginBottom: 22 }}>{t("wh.empty")}</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
              marginBottom: 26,
            }}
          >
            {sorted.map((w) => {
              const pos = positionOf(w.id);
              return (
                <div key={w.id} className="card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <b style={{ fontSize: "1.05rem" }}>{w.name}</b>
                    {w.isDefault && <span className="badge green">{t("wh.defaultBadge")}</span>}
                    {w.archived && <span className="badge">{t("wh.archivedBadge")}</span>}
                  </div>
                  {w.note && (
                    <p style={{ color: "var(--muted)", fontSize: "0.88rem", margin: "6px 0 0" }}>
                      {w.note}
                    </p>
                  )}
                  <p style={{ margin: "10px 0 0", fontSize: "0.92rem" }}>
                    {t("wh.unitsHere", { qty: fmtQty(pos.units) })}
                    {" · "}
                    {t("wh.valueHere", { amount: fmtPKR(pos.value) })}
                    {" · "}آئٹمز: <b>{pos.items}</b>
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--muted)" }}>
                    یہ اصل گنتی ہے — اسٹاک موجود ہو تو کارڈ کبھی 0 نہیں دکھاتا۔
                  </p>
                  {canWrite && (
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      {editing?.id === w.id ? (
                        <span className="badge amber">{t("wh.form.editTitle")}</span>
                      ) : (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(w)}>
                          <IconEdit /> {t("wh.edit")}
                        </button>
                      )}
                      {!w.isDefault && !w.archived && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => doDefault(w)}>
                          {t("wh.makeDefault")}
                        </button>
                      )}
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => doArchive(w)}>
                        {w.archived ? t("wh.unarchive") : t("wh.archive")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ---- per-warehouse stock view (§1.7) ---- */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              padding: "14px 16px",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <h3 style={{ margin: 0, flex: "1 1 auto" }}>{t("wh.stockTitle")}</h3>
            <select
              value={viewWhId}
              onChange={(e) => setStockWhId(e.target.value)}
              aria-label={t("wh.pickerLabel")}
            >
              {sorted.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {w.isDefault ? ` ${t("wh.pickerDefaultSuffix")}` : ""}
                </option>
              ))}
            </select>
          </div>
          {stockRows.length === 0 ? (
            <div className="empty">{t("wh.stockEmpty")}</div>
          ) : (
            <div className="table-wrap" style={{ border: "none", borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("wh.col.product")}</th>
                    <th className="num">{t("wh.col.onHand")}</th>
                    <th className="num">{t("wh.col.promised")}</th>
                    <th className="num">{t("wh.col.available")}</th>
                    <th className="num">{t("tr.col.incoming")}</th>
                    <th className="num">{t("wh.col.value")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stockRows.map((r) => (
                    <tr key={r.product.id}>
                      <td>
                        {r.product.name}
                        <span style={{ color: "var(--muted)" }}>
                          {" "}
                          · {fmtUnit(r.product.unit)}
                        </span>
                      </td>
                      <td className="num">{fmtQty(r.onHand)}</td>
                      <td className="num">{fmtQty(r.promised)}</td>
                      <td className="num">{fmtQty(r.available)}</td>
                      <td className="num">{fmtQty(r.incoming)}</td>
                      <td className="num">{fmtPKR(r.value)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>
                      <b>{t("wh.totalRow")}</b>
                    </td>
                    <td className="num">
                      <b>{fmtQty(totals.onHand)}</b>
                    </td>
                    <td className="num">
                      <b>{fmtQty(totals.promised)}</b>
                    </td>
                    <td className="num">
                      <b>{fmtQty(totals.available)}</b>
                    </td>
                    <td className="num">
                      <b>{fmtQty(totals.incoming)}</b>
                    </td>
                    <td className="num">
                      <b>{fmtPKR(totals.value)}</b>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {formOpen && canWrite && (
          <div
            className="modal-backdrop"
            onClick={closeForm}
            role="dialog"
            aria-modal="true"
            aria-label={t(editing ? "wh.form.editTitle" : "wh.form.addTitle")}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{t(editing ? "wh.form.editTitle" : "wh.form.addTitle")}</h2>
              <form className="form" onSubmit={submitForm}>
                {formError && <div className="form-error">{formError}</div>}
                <div className="field">
                  <label htmlFor="wh-name">{t("wh.form.name")}</label>
                  <input
                    id="wh-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("wh.form.namePh")}
                  />
                </div>
                <div className="field">
                  <label htmlFor="wh-note">{t("wh.form.note")}</label>
                  <input
                    id="wh-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t("wh.form.notePh")}
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={closeForm}
                  >
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
      </div>
    </div>
  );
}
