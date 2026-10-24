"use client";

/**
 * Phase C · C4 — production orders on the Manufacturing
 * surface (design §4.2). An order runs ONE warehouse's
 * production of ONE finished product from ONE snapshotted
 * recipe version. Its events are its subledger: every figure
 * on this surface — produced, remaining, the WIP pool, the
 * absorbed unit cost — is DERIVED from the events through
 * lib/production, never a stored counter, and every event
 * action composes through the same lib the store posts with,
 * so the desk's previews are the posting's own arithmetic.
 *
 * RBAC: the `manufacturing` matrix row — owner/manager run
 * production, the accountant reads, the cashier never reaches
 * the surface (the parent view gates entry).
 */
import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useLang } from "./LangProvider";
import { IconClose, IconPlus, IconTrash } from "./ui";
import { ProductionPrintSheet } from "./DocPrintSheet";
import { fmtDate, fmtNum, fmtPKR, fmtUnit } from "@/lib/format";
import { can } from "@/lib/permissions";
import { brandingDataUrls } from "@/lib/branding";
import { activeWarehouses, defaultWarehouseId, qtyAtWarehouse } from "@/lib/stock";
import { defaultAccountForMethod } from "@/lib/ledger";
import {
  absorbedUnitCost,
  completedValue,
  completionAbsorb,
  defaultIssueConversion,
  defaultIssueLines,
  issuedValue,
  poolOf,
  prepareIssue,
  producedQty,
  remainingPlannedQty,
  scrapAbsorb,
  writtenOffValue,
  type IssueProblem,
} from "@/lib/production";
import type { I18nKey } from "@/lib/i18n";
import type { ProductionOrder } from "@/lib/types";

function fmtQty(n: number): string {
  return Number.isInteger(n) ? fmtNum(n) : String(Math.round(n * 1000) / 1000);
}

const STATUS_KEY: Record<ProductionOrder["status"], I18nKey> = {
  draft: "mfg.po.status.draft",
  open: "mfg.po.status.open",
  completed: "mfg.po.status.completed",
  cancelled: "mfg.po.status.cancelled",
};

const STATUS_BADGE: Record<ProductionOrder["status"], string> = {
  draft: "badge amber",
  open: "badge green",
  completed: "badge",
  cancelled: "badge amber",
};

const EV_KEY: Record<ProductionOrder["events"][number]["kind"], I18nKey> = {
  issue: "mfg.ev.issue",
  completion: "mfg.ev.completion",
  scrap: "mfg.ev.scrap",
  closeout: "mfg.ev.closeout",
};

export default function ProductionSection() {
  const store = useStore();
  const {
    productionOrders,
    products,
    warehouses,
    accounts,
    settings,
    role,
  } = store;
  const { t } = useLang();
  const canWrite = can(role, "manufacturing", "write");

  const [expanded, setExpanded] = useState<string | null>(null);
  const [orderForm, setOrderForm] = useState<
    { mode: "create" } | { mode: "edit"; order: ProductionOrder } | null
  >(null);
  const [issueOrder, setIssueOrder] = useState<ProductionOrder | null>(null);
  const [completeOrder, setCompleteOrder] = useState<ProductionOrder | null>(null);
  const [scrapOrder, setScrapOrder] = useState<ProductionOrder | null>(null);
  const [confirmCloseId, setConfirmCloseId] = useState<string | null>(null);
  const [printDoc, setPrintDoc] = useState<ProductionOrder | null>(null);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const accountName = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.name])),
    [accounts]
  );
  const whName = (id: string): string =>
    warehouses.find((w) => w.id === id)?.name ?? id;
  const orders = useMemo(
    () => [...productionOrders].reverse(),
    [productionOrders]
  );

  const doPrint = (o: ProductionOrder) => {
    setPrintDoc(o);
    setTimeout(() => window.print(), 60);
  };

  const renderFigures = (o: ProductionOrder) => {
    const produced = producedQty(o);
    const unit = byId.get(o.outputProductId)?.unit;
    return (
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: "0.9rem" }}>
        <span>
          {t("mfg.po.planned")}: <b>{fmtQty(o.plannedQty)}</b>
          {unit ? ` ${fmtUnit(unit)}` : ""}
        </span>
        <span>
          {t("mfg.po.produced")}: <b>{fmtQty(produced)}</b>
        </span>
        <span>
          {t("mfg.po.remaining")}: <b>{fmtQty(remainingPlannedQty(o))}</b>
        </span>
        <span>
          {t("mfg.po.pool")}: <b>{fmtPKR(poolOf(o))}</b>
        </span>
        {produced > 0 && (
          <span>
            {t("mfg.po.unitCostNow")}: <b>{fmtPKR(absorbedUnitCost(o))}</b>
          </span>
        )}
      </div>
    );
  };

  const eventDetail = (
    o: ProductionOrder,
    e: ProductionOrder["events"][number]
  ): string => {
    if (e.kind === "issue") {
      const parts = (e.lines ?? []).map((l) => `${l.name} × ${fmtQty(l.qty)}`);
      if ((e.labourCost ?? 0) > 0) {
        parts.push(`${t("mfg.ev.labour")}: ${fmtPKR(e.labourCost ?? 0)}`);
      }
      if ((e.overheadCost ?? 0) > 0) {
        parts.push(`${t("mfg.ev.overhead")}: ${fmtPKR(e.overheadCost ?? 0)}`);
      }
      if (e.paidFromAccountId === "accrue") {
        parts.push(t("mfg.ev.accrued"));
      } else if (e.paidFromAccountId) {
        parts.push(
          t("mfg.ev.paidFrom", {
            name: accountName.get(e.paidFromAccountId) ?? e.paidFromAccountId,
          })
        );
      }
      return parts.join(" · ");
    }
    if (e.kind === "completion" || e.kind === "scrap") {
      const unit = byId.get(o.outputProductId)?.unit;
      return `${fmtQty(e.qty)}${unit ? ` ${fmtUnit(unit)}` : ""} — ${o.outputName}`;
    }
    return "";
  };

  return (
    <div style={{ marginBottom: 26 }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 14,
          flexWrap: "wrap",
          marginBottom: 6,
        }}
      >
        <div style={{ flex: "1 1 320px" }}>
          <h3 style={{ marginBottom: 4 }}>{t("mfg.po.title")}</h3>
          <p style={{ color: "var(--muted)", margin: 0 }}>{t("mfg.po.sub")}</p>
        </div>
        {canWrite && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setOrderForm({ mode: "create" })}
          >
            <IconPlus /> {t("mfg.po.new")}
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="empty">{t("mfg.po.empty")}</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {orders.map((o) => {
            const isOpen = expanded === o.id;
            const pool = poolOf(o);
            const closing = confirmCloseId === o.id;
            return (
              <div key={o.id} className="card" style={{ padding: "18px 20px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 8,
                  }}
                >
                  <b style={{ fontSize: "1.05rem" }}>{o.outputName}</b>
                  <span className="badge">{o.number ?? t("mfg.po.draftLabel")}</span>
                  <span className={STATUS_BADGE[o.status]}>
                    {t(STATUS_KEY[o.status])}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                    {whName(o.warehouseId)} · {fmtDate(o.ts)}
                  </span>
                  <span style={{ flex: 1 }} />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setExpanded(isOpen ? null : o.id)}
                    aria-expanded={isOpen}
                  >
                    {t("mfg.po.events")} ({o.events.length})
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => doPrint(o)}
                  >
                    {t("mfg.po.print")}
                  </button>
                </div>

                {renderFigures(o)}

                {isOpen && (
                  <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
                    <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                      {t("mfg.po.snapshotNote", { v: o.bomVersion })}
                    </div>
                    <div className="table-wrap">
                      <table className="data">
                        <thead>
                          <tr>
                            <th>{t("mfg.form.components")}</th>
                            <th>{t("mfg.form.qty")}</th>
                            <th>{t("mfg.materialsCost")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {o.bomSnapshot.lines.map((l) => {
                            const cp = byId.get(l.productId);
                            return (
                              <tr key={l.productId}>
                                <td>
                                  <b>{l.name}</b>
                                  {cp?.stockClass === "raw" && (
                                    <span
                                      className="badge amber"
                                      style={{ marginInlineStart: 8 }}
                                    >
                                      {t("inv.rawBadge")}
                                    </span>
                                  )}
                                </td>
                                <td>{fmtQty(l.qty)}</td>
                                <td>{fmtPKR(l.qty * (cp?.costPrice ?? 0))}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 18,
                        flexWrap: "wrap",
                        fontSize: "0.9rem",
                      }}
                    >
                      <span>
                        {t("mfg.po.issuedTotal")}: <b>{fmtPKR(issuedValue(o))}</b>
                      </span>
                      <span>
                        {t("mfg.po.completedTotal")}:{" "}
                        <b>{fmtPKR(completedValue(o))}</b>
                      </span>
                      <span>
                        {t("mfg.po.writtenOff")}: <b>{fmtPKR(writtenOffValue(o))}</b>
                      </span>
                    </div>

                    {o.events.length === 0 ? (
                      <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                        {t("mfg.po.noEvents")}
                      </div>
                    ) : (
                      <div className="table-wrap">
                        <table className="data">
                          <thead>
                            <tr>
                              <th>{t("common.date")}</th>
                              <th>{t("mfg.po.events")}</th>
                              <th>{t("common.amount")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {o.events.map((e, i) => (
                              <tr key={`${e.entryId}-${i}`}>
                                <td>{fmtDate(e.ts)}</td>
                                <td>
                                  <b>{t(EV_KEY[e.kind])}</b>
                                  {eventDetail(o, e) && (
                                    <div
                                      style={{
                                        fontSize: "0.85rem",
                                        color: "var(--muted)",
                                      }}
                                    >
                                      {eventDetail(o, e)}
                                    </div>
                                  )}
                                </td>
                                <td>{fmtPKR(e.value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {o.note && (
                      <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                        {o.note}
                      </div>
                    )}

                    {canWrite && o.status !== "completed" && o.status !== "cancelled" && (
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {o.status === "draft" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => store.openProductionOrder(o.id)}
                            >
                              {t("mfg.po.open")}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setOrderForm({ mode: "edit", order: o })}
                            >
                              {t("mfg.po.edit")}
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setIssueOrder(o)}
                        >
                          {t("mfg.po.issue")}
                        </button>
                        {o.status === "open" && (
                          <>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setCompleteOrder(o)}
                            >
                              {t("mfg.po.complete")}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setScrapOrder(o)}
                            >
                              {t("mfg.po.scrap")}
                            </button>
                          </>
                        )}
                        {closing ? (
                          <>
                            <span
                              style={{
                                alignSelf: "center",
                                fontSize: "0.9rem",
                                color: "var(--muted)",
                              }}
                            >
                              {pool > 0
                                ? t("mfg.close.confirm", { amount: fmtPKR(pool) })
                                : t("mfg.close.confirmEmpty")}
                            </span>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                if (store.closeProductionOrder(o.id)) {
                                  setConfirmCloseId(null);
                                }
                              }}
                            >
                              {t("mfg.close.submit")}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => setConfirmCloseId(null)}
                            >
                              {t("action.cancel")}
                            </button>
                          </>
                        ) : (
                          <>
                            {o.status === "open" && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => setConfirmCloseId(o.id)}
                              >
                                {t("mfg.po.close")}
                              </button>
                            )}
                            {o.events.length === 0 && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => store.cancelProductionOrder(o.id)}
                              >
                                {t("mfg.po.cancel")}
                              </button>
                            )}
                            {o.status === "draft" && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => store.deleteProductionOrder(o.id)}
                              >
                                {t("mfg.po.delete")}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {orderForm && (
        <OrderForm
          mode={orderForm.mode}
          order={orderForm.mode === "edit" ? orderForm.order : null}
          onClose={() => setOrderForm(null)}
        />
      )}
      {issueOrder && (
        <IssueForm order={issueOrder} onClose={() => setIssueOrder(null)} />
      )}
      {completeOrder && (
        <CompleteForm order={completeOrder} onClose={() => setCompleteOrder(null)} />
      )}
      {scrapOrder && (
        <ScrapForm order={scrapOrder} onClose={() => setScrapOrder(null)} />
      )}
      {printDoc && (
        <ProductionPrintSheet
          order={printDoc}
          settings={settings}
          assets={brandingDataUrls(store.branding)}
          warehouseName={whName(printDoc.warehouseId)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Order create / edit (drafts only — the store refuses otherwise)    */
/* ------------------------------------------------------------------ */

function OrderForm({
  mode,
  order,
  onClose,
}: {
  mode: "create" | "edit";
  order: ProductionOrder | null;
  onClose: () => void;
}) {
  const store = useStore();
  const { t } = useLang();
  const activeBoms = useMemo(
    () => store.boms.filter((b) => b.active),
    [store.boms]
  );
  const whs = useMemo(() => {
    const act = activeWarehouses(store.warehouses);
    // In edit mode the order's own warehouse stays selectable
    // even if it was archived after the draft was made.
    if (order && !act.some((w) => w.id === order.warehouseId)) {
      const own = store.warehouses.find((w) => w.id === order.warehouseId);
      if (own) return [own, ...act];
    }
    return act;
  }, [store.warehouses, order]);
  const [bomId, setBomId] = useState(order?.bomId ?? "");
  const [warehouseId, setWarehouseId] = useState(
    order?.warehouseId ?? defaultWarehouseId(store.warehouses)
  );
  const [plannedQty, setPlannedQty] = useState(order?.plannedQty ?? 10);
  const [note, setNote] = useState(order?.note ?? "");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create") {
      const id = store.createProductionOrder({
        bomId,
        warehouseId,
        plannedQty,
        note,
      });
      if (!id) return setError(t("mfg.po.err.generic"));
    } else if (order) {
      const ok = store.updateProductionOrder(order.id, {
        plannedQty,
        warehouseId,
        note,
      });
      if (!ok) return setError(t("mfg.po.err.generic"));
    }
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={
        mode === "create"
          ? t("mfg.po.form.title")
          : t("mfg.po.form.editTitle", { name: order?.outputName ?? "" })
      }
    >
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <h2>
          {mode === "create"
            ? t("mfg.po.form.title")
            : t("mfg.po.form.editTitle", { name: order?.outputName ?? "" })}
        </h2>
        <form className="form" onSubmit={submit}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-grid">
            <div className="field">
              <label htmlFor="po-recipe">{t("mfg.po.form.recipe")}</label>
              {mode === "edit" && order ? (
                <input
                  id="po-recipe"
                  value={`${order.outputName} · ${t("mfg.version", { v: order.bomVersion })}`}
                  disabled
                />
              ) : (
                <select
                  id="po-recipe"
                  value={bomId}
                  onChange={(e) => setBomId(e.target.value)}
                  required
                >
                  <option value="">{t("mfg.po.form.recipePh")}</option>
                  {activeBoms.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.outputName} · {t("mfg.version", { v: b.version })}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="field">
              <label htmlFor="po-warehouse">{t("wh.pickerLabel")}</label>
              <select
                id="po-warehouse"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
              >
                {whs.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                    {w.isDefault ? ` ${t("wh.pickerDefaultSuffix")}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="po-planned">{t("mfg.po.form.plannedQty")}</label>
              <input
                id="po-planned"
                type="number"
                step="any"
                min={0}
                value={plannedQty || ""}
                onChange={(e) => setPlannedQty(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="field">
              <label htmlFor="po-note">{t("mfg.form.note")}</label>
              <input
                id="po-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("mfg.form.notePh")}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <IconClose /> {t("action.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              {mode === "create" ? t("mfg.po.form.save") : t("mfg.po.form.saveEdit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Issue materials (design §4.2/§4.4)                                 */
/* ------------------------------------------------------------------ */

function issueErrKey(problem: IssueProblem): I18nKey {
  switch (problem) {
    case "insufficient":
      return "mfg.po.err.insufficient";
    case "empty_lines":
      return "mfg.err.emptyLines";
    case "no_account":
      return "mfg.po.err.noAccount";
    case "zero_value":
      return "mfg.po.err.zeroValue";
    case "not_open":
      return "mfg.po.err.notOpen";
    default:
      return "mfg.po.err.badQty";
  }
}

function IssueForm({
  order,
  onClose,
}: {
  order: ProductionOrder;
  onClose: () => void;
}) {
  const store = useStore();
  const { t } = useLang();
  const byId = useMemo(
    () => new Map(store.products.map((p) => [p.id, p])),
    [store.products]
  );
  const firstRun = remainingPlannedQty(order) > 0 ? remainingPlannedQty(order) : order.bomSnapshot.outputQty;
  const [runQty, setRunQty] = useState(firstRun);
  const [lines, setLines] = useState(() => defaultIssueLines(order, firstRun));
  const conv0 = defaultIssueConversion(order, firstRun);
  const [labour, setLabour] = useState(conv0.labourCost);
  const [overhead, setOverhead] = useState(conv0.overheadCost);
  const [settlement, setSettlement] = useState<"paid" | "accrue">(
    store.settings.productionSettlement ?? "paid"
  );
  const [accountId, setAccountId] = useState(
    store.settings.productionAccountId ??
      defaultAccountForMethod(store.accounts, "cash")?.id ??
      store.accounts.find((a) => !a.archived)?.id ??
      ""
  );
  const [makeDefault, setMakeDefault] = useState(false);
  const [error, setError] = useState("");
  const liveAccounts = store.accounts.filter((a) => !a.archived);
  const missingSnapshotLines = order.bomSnapshot.lines.filter(
    (l) => !lines.some((x) => x.productId === l.productId)
  );

  const applyRun = (n: number) => {
    setRunQty(n);
    setLines(defaultIssueLines(order, n));
    const c = defaultIssueConversion(order, n);
    setLabour(c.labourCost);
    setOverhead(c.overheadCost);
  };

  const materialsValue = lines.reduce(
    (a, l) => a + l.qty * (byId.get(l.productId)?.costPrice ?? 0),
    0
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = {
      runQty,
      lines,
      labourCost: labour,
      overheadCost: overhead,
      settlement,
      paidFromAccountId: settlement === "paid" ? accountId || null : null,
    };
    // Validate through the SAME composition the store posts
    // with, so the refusal shown is the posting's own reason.
    const res = prepareIssue(
      order,
      store.products,
      store.stockLevels,
      store.warehouses,
      store.accounts,
      input
    );
    if ("problem" in res) {
      const name = res.productId ? byId.get(res.productId)?.name ?? "" : "";
      return setError(t(issueErrKey(res.problem), { name }));
    }
    const ok = store.issueProductionMaterials(order.id, input);
    if (!ok) return setError(t("mfg.po.err.generic"));
    if (makeDefault) {
      store.updateSettings({
        productionSettlement: settlement,
        productionAccountId: settlement === "paid" ? accountId || null : null,
      });
    }
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("mfg.issue.title", { name: order.outputName })}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <h2>{t("mfg.issue.title", { name: order.outputName })}</h2>
        <form className="form" onSubmit={submit}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-grid">
            <div className="field">
              <label htmlFor="issue-run">{t("mfg.issue.runQty")}</label>
              <input
                id="issue-run"
                type="number"
                step="any"
                min={0}
                value={runQty || ""}
                onChange={(e) => applyRun(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="field">
              <label htmlFor="issue-labour">{t("mfg.issue.labour")}</label>
              <input
                id="issue-labour"
                type="number"
                step="any"
                min={0}
                value={labour || ""}
                onChange={(e) => setLabour(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="field">
              <label htmlFor="issue-overhead">{t("mfg.issue.overhead")}</label>
              <input
                id="issue-overhead"
                type="number"
                step="any"
                min={0}
                value={overhead || ""}
                onChange={(e) => setOverhead(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: 6 }}>
            <label>{t("mfg.issue.components")}</label>
            <div style={{ display: "grid", gap: 10 }}>
              {lines.map((l) => {
                const p = byId.get(l.productId);
                if (!p) return null;
                const onHand = qtyAtWarehouse(
                  p,
                  store.stockLevels,
                  store.warehouses,
                  order.warehouseId
                );
                const short = l.qty > onHand + 1e-9;
                return (
                  <div
                    key={l.productId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                      padding: "10px 14px",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      background: "var(--bg)",
                    }}
                  >
                    <div style={{ flex: "1 1 160px", minWidth: 130 }}>
                      <b style={{ fontSize: "0.95rem" }}>{p.name}</b>
                      {p.stockClass === "raw" && (
                        <span className="badge amber" style={{ marginInlineStart: 8 }}>
                          {t("inv.rawBadge")}
                        </span>
                      )}
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: short ? "var(--danger, #c0392b)" : "var(--muted)",
                        }}
                      >
                        {t("mfg.issue.atWarehouse", {
                          qty: fmtQty(onHand),
                          unit: fmtUnit(p.unit),
                        })}
                      </div>
                    </div>
                    <div className="field" style={{ margin: 0 }}>
                      <label>{t("mfg.form.qty")}</label>
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={l.qty || ""}
                        onChange={(e) =>
                          setLines(
                            lines.map((x) =>
                              x.productId === l.productId
                                ? { ...x, qty: parseFloat(e.target.value) || 0 }
                                : x
                            )
                          )
                        }
                        style={{ width: 90 }}
                      />
                    </div>
                    <div style={{ minWidth: 96, textAlign: "right" }}>
                      <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                        {t("mfg.materialsCost")}
                      </div>
                      <b style={{ fontFamily: "var(--font-display)" }}>
                        {fmtPKR(l.qty * p.costPrice)}
                      </b>
                    </div>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() =>
                        setLines(lines.filter((x) => x.productId !== l.productId))
                      }
                      aria-label={t("mfg.form.removeLine", { name: p.name })}
                    >
                      <IconTrash />
                    </button>
                  </div>
                );
              })}
            </div>
            {missingSnapshotLines.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                {missingSnapshotLines.map((l) => (
                  <button
                    key={l.productId}
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() =>
                      setLines([
                        ...lines,
                        {
                          productId: l.productId,
                          qty:
                            order.bomSnapshot.outputQty > 0
                              ? Math.round(
                                  ((l.qty * runQty) / order.bomSnapshot.outputQty +
                                    Number.EPSILON) *
                                    1000
                                ) / 1000
                              : l.qty,
                        },
                      ])
                    }
                  >
                    <IconPlus /> {l.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="field" style={{ marginTop: 6 }}>
            <label>{t("mfg.issue.settlement")}</label>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="radio"
                  name="issue-settlement"
                  checked={settlement === "paid"}
                  onChange={() => setSettlement("paid")}
                />
                {t("mfg.issue.paidNow")}
              </label>
              {settlement === "paid" && (
                <select
                  aria-label={t("mfg.issue.account")}
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  style={{ maxWidth: 320 }}
                >
                  {liveAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="radio"
                  name="issue-settlement"
                  checked={settlement === "accrue"}
                  onChange={() => setSettlement("accrue")}
                />
                {t("mfg.issue.accrue")}
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={makeDefault}
                  onChange={(e) => setMakeDefault(e.target.checked)}
                />
                {t("mfg.issue.makeDefault")}
              </label>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 18,
              flexWrap: "wrap",
              fontSize: "0.92rem",
              marginTop: 6,
            }}
          >
            <span>
              {t("mfg.issue.materialsValue")}: <b>{fmtPKR(materialsValue)}</b>
            </span>
            <span>
              {t("mfg.issue.totalValue")}:{" "}
              <b>{fmtPKR(materialsValue + labour + overhead)}</b>
            </span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <IconClose /> {t("action.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              {t("mfg.issue.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Completion & scrap (design §4.2 absorption)                        */
/* ------------------------------------------------------------------ */

function absorbErrKey(problem: string): I18nKey {
  switch (problem) {
    case "empty_pool":
      return "mfg.po.err.emptyPool";
    case "not_open":
      return "mfg.po.err.notOpen";
    case "bad_qty":
      return "mfg.po.err.badQty";
    default:
      return "mfg.po.err.generic";
  }
}

function CompleteForm({
  order,
  onClose,
}: {
  order: ProductionOrder;
  onClose: () => void;
}) {
  const store = useStore();
  const { t } = useLang();
  const remaining = remainingPlannedQty(order);
  const [qty, setQty] = useState(remaining > 0 ? remaining : 1);
  const [finalFlag, setFinalFlag] = useState(remaining > 0);
  const [error, setError] = useState("");
  const res = completionAbsorb(order, qty, finalFlag);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if ("problem" in res) return setError(t(absorbErrKey(res.problem)));
    const ok = store.completeProduction(order.id, qty, { final: finalFlag });
    if (!ok) return setError(t("mfg.po.err.generic"));
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("mfg.complete.title", { name: order.outputName })}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h2>{t("mfg.complete.title", { name: order.outputName })}</h2>
        <form className="form" onSubmit={submit}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-grid">
            <div className="field">
              <label htmlFor="complete-qty">{t("mfg.complete.qty")}</label>
              <input
                id="complete-qty"
                type="number"
                step="any"
                min={0}
                value={qty || ""}
                onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={finalFlag}
              onChange={(e) => setFinalFlag(e.target.checked)}
            />
            {t("mfg.complete.final")}
          </label>
          {"value" in res && (
            <div
              style={{
                display: "flex",
                gap: 18,
                flexWrap: "wrap",
                fontSize: "0.92rem",
                marginTop: 6,
              }}
            >
              <span>
                {t("mfg.complete.value")}: <b>{fmtPKR(res.value)}</b>
              </span>
              <span>
                {t("mfg.complete.unitCost")}: <b>{fmtPKR(res.unitCost)}</b>
              </span>
              <span>
                {t("mfg.po.pool")}: <b>{fmtPKR(poolOf(order))}</b>
              </span>
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <IconClose /> {t("action.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              {t("mfg.complete.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ScrapForm({
  order,
  onClose,
}: {
  order: ProductionOrder;
  onClose: () => void;
}) {
  const store = useStore();
  const { t } = useLang();
  const [qty, setQty] = useState(1);
  const [error, setError] = useState("");
  const res = scrapAbsorb(order, qty);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if ("problem" in res) return setError(t(absorbErrKey(res.problem)));
    const ok = store.scrapProduction(order.id, qty);
    if (!ok) return setError(t("mfg.po.err.generic"));
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("mfg.scrap.title", { name: order.outputName })}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h2>{t("mfg.scrap.title", { name: order.outputName })}</h2>
        <form className="form" onSubmit={submit}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-grid">
            <div className="field">
              <label htmlFor="scrap-qty">{t("mfg.scrap.qty")}</label>
              <input
                id="scrap-qty"
                type="number"
                step="any"
                min={0}
                value={qty || ""}
                onChange={(e) => setQty(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          {"value" in res && (
            <div style={{ fontSize: "0.92rem", marginTop: 6 }}>
              {t("mfg.scrap.value")}: <b>{fmtPKR(res.value)}</b>
              {"  ·  "}
              {t("mfg.po.pool")}: <b>{fmtPKR(poolOf(order))}</b>
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <IconClose /> {t("action.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              {t("mfg.scrap.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
