"use client";

/**
 * Phase C · C3 — the Manufacturing workspace (design §3): BOM
 * recipes and their version history. Phase C · C4 adds the
 * production orders section below the recipes
 * (`ProductionSection`): orders, their event logs and the
 * issue / completion / scrap / close desks.
 *
 * A recipe is a document, not a posting: nothing here writes a
 * journal entry. Recipes are IMMUTABLE — the editor always saves
 * a NEW version (the store deactivates the previous one in the
 * same batch), and superseded versions stay readable below, so a
 * production order can always prove which recipe its costs came
 * from (§3.2).
 *
 * RBAC: the `manufacturing` matrix row — owner/manager full,
 * accountant read-only, cashier no view.
 */
import { useMemo, useRef, useState } from "react";
import { useStore } from "./StoreProvider";
import ProductionSection from "./ProductionSection";
import PermDenied from "./PermDenied";
import { useLang } from "./LangProvider";
import {
  IconClose,
  IconPlus,
  IconSearch,
  IconTrash,
  ProductResultList,
  SearchClear,
  pickerKeyDown,
} from "./ui";
import { fmtDate, fmtNum, fmtPKR, fmtUnit } from "@/lib/format";
import { can } from "@/lib/permissions";
import {
  activeBomFor,
  bomBatchMaterialCost,
  bomOutputIds,
  bomUnitCost,
  bomsForOutput,
  validateBomDraft,
  type BomDraftProblem,
} from "@/lib/boms";
import { filterProducts } from "@/lib/search";
import type { I18nKey } from "@/lib/i18n";
import type { Bom, Product } from "@/lib/types";

function fmtQty(n: number): string {
  return Number.isInteger(n) ? fmtNum(n) : String(Math.round(n * 1000) / 1000);
}

const ERR_KEYS: Record<BomDraftProblem, I18nKey> = {
  output_unknown: "mfg.err.outputRequired",
  output_raw: "mfg.err.outputRaw",
  self_component: "mfg.err.selfComponent",
  empty_lines: "mfg.err.emptyLines",
  unknown_component: "mfg.err.generic",
  bad_qty: "mfg.err.badQty",
  bad_batch: "mfg.err.badBatch",
};

interface LineDraft {
  productId: string;
  qty: number;
}

export default function ManufacturingView() {
  const { ready, products, boms, role, saveBomVersion } = useStore();
  const { t } = useLang();
  const canWrite = can(role, "manufacturing", "write");

  const [expanded, setExpanded] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  /** The output whose recipe is being versioned; null in the form
   *  = a brand-new recipe (output chosen in the form). */
  const [formOutputId, setFormOutputId] = useState("");
  const [formFixedOutput, setFormFixedOutput] = useState(false);
  const [outputQty, setOutputQty] = useState(1);
  const [labour, setLabour] = useState(0);
  const [overhead, setOverhead] = useState(0);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickIdx, setPickIdx] = useState(0);
  const pickerRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const outputIds = useMemo(() => bomOutputIds(boms), [boms]);
  const outputsWithBom = useMemo(
    () =>
      outputIds
        .map((id) => byId.get(id))
        .filter((p): p is Product => !!p)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [outputIds, byId]
  );
  const goodsWithoutBom = useMemo(
    () =>
      products
        .filter((p) => p.stockClass !== "raw" && !outputIds.includes(p.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [products, outputIds]
  );
  const rawProducts = useMemo(
    () =>
      products
        .filter((p) => p.stockClass === "raw")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );
  const goodsProducts = useMemo(
    () => products.filter((p) => p.stockClass !== "raw"),
    [products]
  );

  const pickable = useMemo(() => {
    const list = [...products]
      .filter((p) => p.id !== formOutputId)
      .sort((a, b) => a.name.localeCompare(b.name));
    return filterProducts(list, pickerSearch);
  }, [products, pickerSearch, formOutputId]);

  const openForm = (output: Product | null, base: Bom | null) => {
    setFormOutputId(output?.id ?? "");
    setFormFixedOutput(!!output && !!base);
    setOutputQty(base ? base.outputQty : 1);
    setLabour(base ? base.labourCost : 0);
    setOverhead(base ? base.overheadCost : 0);
    setNote(base ? base.note : "");
    setLines(
      base
        ? base.lines.map((l) => ({ productId: l.productId, qty: l.qty }))
        : []
    );
    setPickerSearch("");
    setPickIdx(0);
    setError("");
    setFormOpen(true);
  };

  const addLine = (productId: string) => {
    const existing = lines.find((l) => l.productId === productId);
    if (existing) {
      setLines(lines.map((l) => (l.productId === productId ? { ...l, qty: l.qty + 1 } : l)));
    } else {
      setLines([...lines, { productId, qty: 1 }]);
    }
    setPickerSearch("");
    setPickIdx(0);
    pickerRef.current?.focus();
  };

  /* POS picker: results only while searching; click/Enter adds
   * the component straight away — no select-then-Add step. */
  const pickerSearching = pickerSearch.trim().length > 0;
  const pickResults = pickerSearching ? pickable.slice(0, 12) : [];
  const lineQtyById = new Map(lines.map((l) => [l.productId, l.qty]));
  const onPickerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    pickerKeyDown(e, pickResults.length, pickIdx, setPickIdx, () => {
      const p = pickResults[pickIdx] ?? pickResults[0];
      if (p) addLine(p.id);
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const draft = {
      outputProductId: formOutputId,
      outputQty,
      labourCost: labour,
      overheadCost: overhead,
      lines,
    };
    const problem = validateBomDraft(products, draft);
    if (problem) return setError(t(ERR_KEYS[problem]));
    const ok = saveBomVersion({ ...draft, note });
    if (!ok) return setError(t("mfg.err.generic"));
    setFormOpen(false);
  };

  const batchTotal = (b: Bom): number =>
    bomBatchMaterialCost(b, products) + b.labourCost + b.overheadCost;

  const renderBomFigures = (b: Bom) => (
    <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: "0.9rem" }}>
      <span>
        {t("mfg.materialsCost")}: <b>{fmtPKR(bomBatchMaterialCost(b, products))}</b>
      </span>
      <span>
        {t("mfg.form.labour")}: <b>{fmtPKR(b.labourCost)}</b>
      </span>
      <span>
        {t("mfg.form.overhead")}: <b>{fmtPKR(b.overheadCost)}</b>
      </span>
      <span>
        {t("mfg.batchCost")}: <b>{fmtPKR(batchTotal(b))}</b>
      </span>
      <span>
        {t("mfg.unitCost")}: <b>{fmtPKR(bomUnitCost(b, products))}</b>
      </span>
    </div>
  );

  if (!can(role, "manufacturing", "view")) return <PermDenied />;

  if (!ready) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("mfg.eyebrow")}</span>
          <h1 className="h2">{t("mfg.title")}</h1>
          <p className="lead">{t("mfg.subtitle")}</p>
        </div>

        <div className="note-box" style={{ marginTop: 0, marginBottom: 22 }}>
          {t("mfg.immutableNote")}
        </div>
        {/* MC Billing workflow adoption 2026-10-27 (WEB, plan §10):
            BOM cost is DERIVED from its components' costs at
            issue/completion — a finished good's cost is the sum
            of its components, never a typed-in figure. */}
        <p className="hint" style={{ marginBottom: 22 }}>
          تیار مال کی لاگت اجزاء کی لاگت سے بنتی ہے (ہر جزو × اس کی cost) — یہاں کوئی ہاتھ سے لکھی لاگت نہیں آتی۔
        </p>

        {canWrite && (
          <div
            className="sticky-bar"
            style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openForm(null, null)}
            >
              <IconPlus /> {t("mfg.newRecipe")}
            </button>
          </div>
        )}

        {boms.length === 0 ? (
          <div className="empty" style={{ marginBottom: 26 }}>{t("mfg.empty")}</div>
        ) : (
          <div style={{ display: "grid", gap: 16, marginBottom: 26 }}>
            {outputsWithBom.map((p) => {
              const active = activeBomFor(boms, p.id);
              const history = bomsForOutput(boms, p.id);
              if (!active) return null;
              const isOpen = expanded === p.id;
              return (
                <div key={p.id} className="card" style={{ padding: "18px 20px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 8,
                    }}
                  >
                    <b style={{ fontSize: "1.05rem" }}>{p.name}</b>
                    <span className="badge green">
                      {t("mfg.version", { v: active.version })} · {t("mfg.activeBadge")}
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                      {t("mfg.yields", { qty: fmtQty(active.outputQty), unit: fmtUnit(p.unit) })}
                    </span>
                    <span style={{ flex: 1 }} />
                    {canWrite && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => openForm(p, active)}
                      >
                        <IconPlus /> {t("mfg.newVersion")}
                      </button>
                    )}
                    {history.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setExpanded(isOpen ? null : p.id)}
                        aria-expanded={isOpen}
                      >
                        {t("mfg.history")} ({history.length})
                      </button>
                    )}
                  </div>

                  <div className="table-wrap" style={{ marginBottom: 10 }}>
                    <table className="data">
                      <thead>
                        <tr>
                          <th>{t("mfg.form.components")}</th>
                          <th>{t("mfg.form.qty")}</th>
                          <th>{t("mfg.materialsCost")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {active.lines.map((l) => {
                          const cp = byId.get(l.productId);
                          return (
                            <tr key={l.productId}>
                              <td>
                                <b>{l.name}</b>
                                {cp?.stockClass === "raw" && (
                                  <span className="badge amber" style={{ marginInlineStart: 8 }}>
                                    {t("inv.rawBadge")}
                                  </span>
                                )}
                              </td>
                              <td>
                                {fmtQty(l.qty)} {cp ? fmtUnit(cp.unit) : ""}
                              </td>
                              <td>{fmtPKR(l.qty * (cp?.costPrice ?? 0))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {renderBomFigures(active)}
                  {active.note && (
                    <div style={{ marginTop: 8, color: "var(--muted)", fontSize: "0.9rem" }}>
                      {active.note}
                    </div>
                  )}

                  {isOpen && (
                    <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                      {[...history].reverse().map((v) => (
                        <div
                          key={v.id}
                          style={{
                            border: "1px solid var(--line)",
                            borderRadius: 12,
                            padding: "12px 14px",
                            background: "var(--bg)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              flexWrap: "wrap",
                              marginBottom: 6,
                            }}
                          >
                            <b>{t("mfg.version", { v: v.version })}</b>
                            <span className={`badge ${v.active ? "green" : "amber"}`}>
                              {v.active ? t("mfg.activeBadge") : t("mfg.supersededBadge")}
                            </span>
                            <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                              {fmtDate(v.ts)} ·{" "}
                              {t("mfg.yields", { qty: fmtQty(v.outputQty), unit: fmtUnit(p.unit) })}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                            {v.lines
                              .map((l) => `${l.name} × ${fmtQty(l.qty)}`)
                              .join(" · ")}
                          </div>
                          <div style={{ marginTop: 6 }}>{renderBomFigures(v)}</div>
                          {v.note && (
                            <div style={{ marginTop: 6, color: "var(--muted)", fontSize: "0.9rem" }}>
                              {v.note}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <ProductionSection />

        {goodsWithoutBom.length > 0 && (
          <div className="table-wrap" style={{ marginBottom: 26 }}>
            <table className="data">
              <thead>
                <tr>
                  <th>{t("inv.th.product")}</th>
                  <th>{t("inv.th.stock")}</th>
                  <th>{t("mfg.history")}</th>
                  {canWrite && <th>{t("inv.th.actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {goodsWithoutBom.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.name}</b>
                      <div className="ur" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                        {p.urduName}
                      </div>
                    </td>
                    <td>
                      <b>{fmtNum(p.stockQty)}</b> {fmtUnit(p.unit)}
                    </td>
                    <td style={{ color: "var(--muted)" }}>{t("mfg.noRecipe")}</td>
                    {canWrite && (
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => openForm(p, null)}
                        >
                          <IconPlus /> {t("mfg.addFor")}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rawProducts.length > 0 && (
          <div>
            <h3 style={{ marginBottom: 6 }}>{t("mfg.raw.title")}</h3>
            <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 14 }}>
              {t("mfg.raw.sub")}
            </p>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>{t("inv.th.product")}</th>
                    <th>{t("inv.th.stock")}</th>
                    {can(role, "inventoryCost", "view") && <th>{t("inv.th.cost")}</th>}
                  </tr>
                </thead>
                <tbody>
                  {rawProducts.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <b>{p.name}</b>{" "}
                        <span className="badge amber">{t("inv.rawBadge")}</span>
                        <div className="ur" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                          {p.urduName}
                        </div>
                      </td>
                      <td>
                        <b>{fmtNum(p.stockQty)}</b> {fmtUnit(p.unit)}
                      </td>
                      {can(role, "inventoryCost", "view") && (
                        <td>{fmtPKR(p.stockQty * p.costPrice)}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {formOpen && (
          <div
            className="modal-backdrop"
            onClick={() => setFormOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={formFixedOutput ? t("mfg.form.versionTitle", { name: byId.get(formOutputId)?.name ?? "" }) : t("mfg.form.newTitle")}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
              <h2>
                {formFixedOutput
                  ? t("mfg.form.versionTitle", { name: byId.get(formOutputId)?.name ?? "" })
                  : t("mfg.form.newTitle")}
              </h2>
              <form className="form" onSubmit={submit}>
                {error && <div className="form-error">{error}</div>}
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="bom-output">{t("mfg.form.output")}</label>
                    {formFixedOutput ? (
                      <input
                        id="bom-output"
                        value={byId.get(formOutputId)?.name ?? ""}
                        disabled
                      />
                    ) : (
                      <select
                        id="bom-output"
                        value={formOutputId}
                        onChange={(e) => setFormOutputId(e.target.value)}
                        required
                      >
                        <option value="">{t("mfg.form.outputPh")}</option>
                        {goodsProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="field">
                    <label htmlFor="bom-batch">{t("mfg.form.batchSize")}</label>
                    <input
                      id="bom-batch"
                      type="number"
                      step="any"
                      min={0}
                      value={outputQty || ""}
                      onChange={(e) => setOutputQty(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="bom-labour">{t("mfg.form.labour")}</label>
                    <input
                      id="bom-labour"
                      type="number"
                      step="any"
                      min={0}
                      value={labour || ""}
                      onChange={(e) => setLabour(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="bom-overhead">{t("mfg.form.overhead")}</label>
                    <input
                      id="bom-overhead"
                      type="number"
                      step="any"
                      min={0}
                      value={overhead || ""}
                      onChange={(e) => setOverhead(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="bom-note">{t("mfg.form.note")}</label>
                    <input
                      id="bom-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={t("mfg.form.notePh")}
                    />
                  </div>
                </div>

                <div className="field" style={{ marginTop: 6 }}>
                  <label>{t("mfg.form.components")}</label>
                  <div className="search-box" style={{ maxWidth: "none" }}>
                    <IconSearch />
                    <input
                      ref={pickerRef}
                      type="search"
                      placeholder={t("doc.lines.searchPh")}
                      value={pickerSearch}
                      onChange={(e) => {
                        setPickerSearch(e.target.value);
                        setPickIdx(0);
                      }}
                      onKeyDown={onPickerKeyDown}
                      aria-label={t("mfg.form.components")}
                    />
                    {pickerSearch && (
                      <SearchClear
                        onClear={() => {
                          setPickerSearch("");
                          setPickIdx(0);
                          pickerRef.current?.focus();
                        }}
                        label={t("action.clearSearch")}
                      />
                    )}
                  </div>
                  {pickerSearching && (
                    <div style={{ marginTop: 10 }}>
                      <ProductResultList
                        items={pickResults.map((p) => ({
                          id: p.id,
                          name: p.name,
                          meta: `${fmtQty(p.stockQty)} ${fmtUnit(p.unit)}`,
                          price: fmtPKR(p.costPrice),
                          badge: p.stockClass === "raw" ? t("inv.rawBadge") : null,
                          inCartQty: lineQtyById.get(p.id),
                          inCartLabel: `× ${fmtQty(lineQtyById.get(p.id) ?? 0)}`,
                        }))}
                        activeIndex={pickIdx}
                        onPick={addLine}
                        emptyText={t("mfg.form.noResults", { query: pickerSearch.trim() })}
                        listLabel={t("mfg.form.components")}
                      />
                    </div>
                  )}
                </div>

                {lines.length > 0 && (
                  <div style={{ display: "grid", gap: 10 }}>
                    {lines.map((l) => {
                      const p = byId.get(l.productId);
                      if (!p) return null;
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
                            <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                              {t("doc.lines.stock", {
                                qty: fmtQty(p.stockQty),
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
                            onClick={() => setLines(lines.filter((x) => x.productId !== l.productId))}
                            aria-label={t("mfg.form.removeLine", { name: p.name })}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
                    <IconClose /> {t("action.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {formFixedOutput ? t("mfg.form.saveVersion") : t("mfg.form.save")}
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
