"use client";

import { useMemo, useRef, useState } from "react";
import { useStore, type NewProduct } from "./StoreProvider";
import { useLang } from "./LangProvider";
import {
  IconAlert,
  IconBox,
  IconCash,
  IconClose,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash, SearchClear } from "./ui";
import { fmtDate, fmtNum, fmtPKR, fmtUnit } from "@/lib/format";
import { stockValuation } from "@/lib/workflow";
import { accountNormalBalance } from "@/lib/ledger";
import type { I18nKey } from "@/lib/i18n";
import type { AdjustmentReason, Product } from "@/lib/types";
import {
  daysUntil,
  deadStockProducts,
  expiringProducts,
  lastSaleOffset,
  stockValue,
  stockValueRetail,
} from "@/lib/selectors";
import { availabilityByProduct } from "@/lib/documents";
import { adjustmentMatches, filterProducts, searchText } from "@/lib/search";
import { downloadCSV, parseCSV, toCSV } from "@/lib/csv";
import { can } from "@/lib/permissions";

const EMPTY: NewProduct = {
  sku: "",
  name: "",
  urduName: "",
  category: "General",
  unit: "pcs",
  costPrice: 0,
  salePrice: 0,
  stockQty: 0,
  reorderLevel: 5,
  expiryDate: null,
  taxSlabId: null,
  taxExempt: false,
  stockClass: null,
};

const CATEGORIES = [
  "General",
  "Cooking Essentials",
  "Rice & Grains",
  "Lentils & Pulses",
  "Spices",
  "Dairy",
  "Beverages",
  "Snacks",
  "Household",
  "Personal Care",
];

const CAT_LABELS: Record<string, I18nKey> = {
  General: "inv.cat.general",
  "Cooking Essentials": "inv.cat.cooking",
  "Rice & Grains": "inv.cat.rice",
  "Lentils & Pulses": "inv.cat.lentils",
  Spices: "inv.cat.spices",
  Dairy: "inv.cat.dairy",
  Beverages: "inv.cat.beverages",
  Snacks: "inv.cat.snacks",
  Household: "inv.cat.household",
  "Personal Care": "inv.cat.personalCare",
};

type ViewFilter = "all" | "low" | "expiring" | "dead" | "adjustments";

const VIEWS: Array<{ id: ViewFilter; labelKey: I18nKey }> = [
  { id: "all", labelKey: "inv.view.all" },
  { id: "low", labelKey: "inv.view.low" },
  { id: "expiring", labelKey: "inv.view.expiring" },
  { id: "dead", labelKey: "inv.view.dead" },
  { id: "adjustments", labelKey: "inv.view.adjustments" },
];

const REASON_LABELS: Record<AdjustmentReason, I18nKey> = {
  damage: "inv.adjReason.damage",
  expiry: "inv.adjReason.expiry",
  theft: "inv.adjReason.theft",
  correction: "inv.adjReason.correction",
};

function num(v: string, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function csvNum(v: string | undefined, fallback = 0): number {
  if (v === undefined || v.trim() === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const activeChipStyle: React.CSSProperties = {
  borderColor: "var(--accent)",
  color: "var(--accent-text)",
  background: "var(--accent-soft)",
};

export default function InventoryManager() {
  const {
    ready,
    products,
    sales,
    adjustments,
    taxSlabs,
    saleOrders,
    deliveryChallans,
    bills,
    warehouses,
    journal,
    role,
    addProduct,
    updateProduct,
    deleteProduct,
    recordAdjustment,
    importProducts,
  } = useStore();
  /* A3 role gates (design §3.2): managing products and stock
   * adjustments are owner/manager; cost prices are hidden from
   * cashiers (UI-only grain — the matrix marks it (UI)); accountants
   * get a read-only shelf. */
  const canManage = can(role, "inventoryManage", "write");
  const canAdjust = can(role, "stockAdjustments", "write");
  const canCost = can(role, "inventoryCost", "view");
  const canAct = canManage || canAdjust;
  const colCount = 5 + (canCost ? 2 : 0) + (canAct ? 1 : 0);
  const { t, lang } = useLang();
  void lang;
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewFilter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<NewProduct>(EMPTY);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);
  const [error, setError] = useState("");
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjDelta, setAdjDelta] = useState("");
  const [adjReason, setAdjReason] = useState<AdjustmentReason>("correction");
  const [adjNote, setAdjNote] = useState("");
  /* Phase C · C1 (§1.5): the warehouse the adjustment is recorded
   * at; "" = the shop default. */
  const [adjWhId, setAdjWhId] = useState("");
  const [adjError, setAdjError] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const catLabel = (c: string): string => {
    const key = CAT_LABELS[c];
    return key ? t(key) : c;
  };

  const expiring = useMemo(() => expiringProducts(products, 30), [products]);
  const dead = useMemo(() => deadStockProducts(products, sales, 60), [products, sales]);

  /* Phase B · B2 (§2.5): the derived availability report — per
   * product, how much of the shelf is promised to open orders /
   * dispatched challans (unbilled) and how much is truly available.
   * Derived from documents; nothing stored, nothing posted. */
  const availability = useMemo(
    () => availabilityByProduct(products, saleOrders, deliveryChallans, bills),
    [products, saleOrders, deliveryChallans, bills]
  );

  const stats = useMemo(
    () => ({
      costValue: stockValue(products),
      retailValue: stockValueRetail(products),
      expiringCount: expiring.length,
      deadCount: dead.length,
    }),
    [products, expiring, dead]
  );

  const filtered = useMemo(() => {
    const list = [...products].sort((a, b) =>
      a.stockQty / Math.max(a.reorderLevel, 1) - b.stockQty / Math.max(b.reorderLevel, 1)
    );
    let out = list;
    if (view === "low") {
      out = out.filter((p) => p.stockQty <= p.reorderLevel);
    } else if (view === "expiring") {
      const ids = new Set(expiring.map((p) => p.id));
      out = out.filter((p) => ids.has(p.id));
    } else if (view === "dead") {
      const ids = new Set(dead.map((p) => p.id));
      out = out.filter((p) => ids.has(p.id));
    }
    // lib/search: null-safe — a legacy product missing urduName/sku/
    // category must never throw here (includeCategory = this list
    // has always searched categories).
    return filterProducts(out, query, true);
  }, [products, query, view, expiring, dead]);

  const sortedAdjustments = useMemo(() => {
    const sorted = [...adjustments].sort((a, b) => b.ts.localeCompare(a.ts));
    // lib/search: null-safe against rows with a missing note.
    return sorted.filter((a) => adjustmentMatches(a, query));
  }, [adjustments, query]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setModalOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      sku: p.sku,
      name: p.name,
      urduName: p.urduName,
      category: p.category,
      unit: p.unit,
      costPrice: p.costPrice,
      salePrice: p.salePrice,
      stockQty: p.stockQty,
      reorderLevel: p.reorderLevel,
      expiryDate: p.expiryDate ?? null,
      taxSlabId: p.taxSlabId ?? null,
      taxExempt: p.taxExempt ?? false,
      // C3: the stock class — "raw" or null (goods), as stored.
      stockClass: p.stockClass === "raw" ? "raw" : null,
    });
    setError("");
    setModalOpen(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setError(t("inv.err.nameRequired"));
    if (!form.sku.trim()) return setError(t("inv.err.skuRequired"));
    if (form.salePrice <= 0) return setError(t("inv.err.salePricePositive"));
    if (form.salePrice < form.costPrice)
      return setError(t("inv.err.saleBelowCost"));
    const dupe = products.find(
      // lib/search: null-safe — a legacy product without a sku must
      // not make the product form's duplicate check throw.
      (p) => searchText(p.sku).toLowerCase() === form.sku.trim().toLowerCase() && p.id !== editing?.id
    );
    if (dupe) return setError(t("inv.err.skuDuplicate", { sku: form.sku, name: dupe.name }));
    const payload: NewProduct = {
      ...form,
      sku: form.sku.trim(),
      name: form.name.trim(),
      urduName: form.urduName.trim(),
      category: form.category.trim() || "General",
      expiryDate: form.expiryDate ? form.expiryDate : null,
    };
    if (editing) updateProduct(editing.id, payload);
    else addProduct(payload);
    setModalOpen(false);
  };

  const set = (k: keyof NewProduct) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.value;
    setForm((f) => ({
      ...f,
      [k]:
        k === "expiryDate"
          ? v || null
          : k === "costPrice" || k === "salePrice" || k === "stockQty" || k === "reorderLevel"
            ? num(v)
            : v,
    }));
  };

  const openAdjust = (p: Product) => {
    setAdjustTarget(p);
    setAdjDelta("");
    setAdjReason("correction");
    setAdjNote("");
    setAdjWhId("");
    setAdjError("");
  };

  const submitAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;
    const delta = Number(adjDelta);
    if (adjDelta.trim() === "" || !Number.isFinite(delta) || delta === 0)
      return setAdjError(t("inv.adj.error"));
    recordAdjustment(adjustTarget.id, delta, adjReason, adjNote.trim(), adjWhId || null);
    setAdjustTarget(null);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const list: NewProduct[] = [];
      let skipped = 0;
      for (const row of rows) {
        const sku = (row.sku ?? "").trim();
        const name = (row.name ?? "").trim();
        const salePrice = csvNum(row.saleprice, 0);
        if (!sku || !name || salePrice <= 0) {
          skipped++;
          continue;
        }
        list.push({
          sku,
          name,
          urduName: (row.urduname ?? "").trim(),
          category: (row.category ?? "").trim() || "General",
          unit: (row.unit ?? "").trim() || "pcs",
          costPrice: Math.max(0, csvNum(row.costprice, 0)),
          salePrice,
          stockQty: Math.max(0, csvNum(row.stockqty, 0)),
          reorderLevel: Math.max(0, csvNum(row.reorderlevel, 5)),
          expiryDate: (row.expirydate ?? "").trim() || null,
          // C3: the optional stockClass column ("raw" = raw
          // material; anything else = goods).
          stockClass:
            (row.stockclass ?? "").trim().toLowerCase() === "raw" ? "raw" : null,
        });
      }
      if (list.length > 0) importProducts(list);
      setImportNotice(
        skipped > 0
          ? t("inv.import.doneSkipped", { n: list.length, skipped })
          : t("inv.import.done", { n: list.length })
      );
    } catch {
      setImportNotice(t("inv.import.error"));
    }
  };

  const handleExport = () => {
    const headers = [
      "sku",
      "name",
      "urduName",
      "category",
      "unit",
      "costPrice",
      "salePrice",
      "stockQty",
      "reorderLevel",
      "expiryDate",
      "stockClass",
    ];
    const rows = products.map((p) => [
      p.sku,
      p.name,
      p.urduName,
      p.category,
      p.unit,
      p.costPrice,
      p.salePrice,
      p.stockQty,
      p.reorderLevel,
      p.expiryDate ?? "",
      p.stockClass === "raw" ? "raw" : "",
    ]);
    downloadCSV("products.csv", toCSV(headers, rows));
  };

  const emptyMsg = query.trim()
    ? t("inv.empty.search")
    : view === "low"
      ? t("inv.empty.low")
      : view === "expiring"
        ? t("inv.empty.expiring")
        : view === "dead"
          ? t("inv.empty.dead")
          : t("inv.empty.all");

  if (!ready) {
    return (
      <div className="section"><div className="container"><div className="empty">{t("common.loading")}</div></div></div>
    );
  }

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("inv.eyebrow")}</span>
          <h1 className="h2">{t("inv.title")}</h1>
          <p className="lead">{t("inv.subtitle")}</p>
        </div>

        <div className="grid-4" style={{ marginBottom: 24 }}>
          {canCost && (
            <div className="card kpi">
              <div className="kpi-icon brown"><IconBox /></div>
              <div>
                <div className="kpi-label">{t("inv.kpi.costValue")}</div>
                <div className="kpi-value">{fmtPKR(stats.costValue)}</div>
                <div className="kpi-sub">{t("inv.kpi.productsOnShelf", { n: products.length })}</div>
              </div>
            </div>
          )}
          <div className="card kpi">
            <div className="kpi-icon green"><IconCash /></div>
            <div>
              <div className="kpi-label">{t("inv.kpi.retailValue")}</div>
              <div className="kpi-value">{fmtPKR(stats.retailValue)}</div>
              <div className="kpi-sub">{t("inv.kpi.retailSub")}</div>
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon amber"><IconAlert /></div>
            <div>
              <div className="kpi-label">{t("inv.kpi.expiring")}</div>
              <div className="kpi-value">{stats.expiringCount}</div>
              <div className="kpi-sub">
                {stats.expiringCount > 0 ? t("inv.kpi.expiringAction") : t("inv.kpi.expiringNone")}
              </div>
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon brown"><IconAlert /></div>
            <div>
              <div className="kpi-label">{t("inv.kpi.dead")}</div>
              <div className="kpi-value">{stats.deadCount}</div>
              <div className="kpi-sub">{t("inv.kpi.deadSub")}</div>
            </div>
          </div>
        </div>

        {(() => {
          const val = stockValuation(products);
          const gl = accountNormalBalance(journal, "inventory") + accountNormalBalance(journal, "inventory_raw");
          const gap = Math.round(val.total - gl);
          return (
            <section className="card" aria-label="Stock valuation vs GL" style={{ marginBottom: 22 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: "1.1rem" }}>ویلیوایشن رپورٹ — اسٹاک بمقابلہ GL</h3>
              <p style={{ margin: 0 }}>
                اسٹاک کی قیمت (cost پر): <b>{fmtPKR(val.total)}</b> (عام مال {fmtPKR(val.goods)} + خام مال {fmtPKR(val.raw)})
                {" · "}GL انوینٹری: <b>{fmtPKR(gl)}</b> {" · "}فرق: <b>{fmtPKR(gap)}</b>
                {gap === 0 ? " (برابر ✓)" : " — فرق کی وجہ درج کریں؛ کوئی پلگ چھپایا نہیں جائے گا۔"}
              </p>
              <p className="hint" style={{ margin: "8px 0 0" }}>
                دونوں اسٹاک کالم ایک ساتھ اپڈیٹ ہوتے ہیں (موبائل سیل کے بعد بھی) — ویلیوایشن اسی ایک سچائی سے نکلتی ہے۔
              </p>
            </section>
          );
        })()}

        <div className="toolbar">
          <div className="search-box">
            <IconSearch />
            <input
              type="search"
              placeholder={t("inv.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label={t("inv.searchAria")}
            />
            {query && (
              <SearchClear
                onClear={() => setQuery("")}
                label={t("action.clearSearch")}
              />
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleImport}
              style={{ display: "none" }}
              aria-label={t("inv.importAria")}
            />
            {canManage && (
              <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                {t("inv.importCsv")}
              </button>
            )}
            {canCost && (
              <button type="button" className="btn btn-ghost" onClick={handleExport}>
                {t("inv.exportCsv")}
              </button>
            )}
            {canManage && (
              <button type="button" className="btn btn-primary" onClick={openAdd}>
                <IconPlus /> {t("inv.addProduct")}
              </button>
            )}
          </div>
        </div>

        {importNotice && (
          <div className="note-box" style={{ marginTop: 0, marginBottom: 22 }} role="status">
            {importNotice}
          </div>
        )}

        <div className="chips" style={{ marginBottom: 22 }} role="group" aria-label={t("inv.viewsAria")}>
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className="chip"
              style={view === v.id ? activeChipStyle : undefined}
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
            >
              {t(v.labelKey)}
            </button>
          ))}
        </div>

        {view === "dead" && (
          <div className="note-box" style={{ marginTop: 0, marginBottom: 22 }}>
            {t("inv.dead.explain")}
          </div>
        )}

        {view === "adjustments" ? (
          <div className="table-wrap inv-table">
            <table className="data">
              <thead>
                <tr>
                  <th>{t("inv.th.date")}</th>
                  <th>{t("inv.th.product")}</th>
                  <th>{t("inv.th.change")}</th>
                  <th>{t("inv.th.reason")}</th>
                  <th>{t("inv.th.note")}</th>
                </tr>
              </thead>
              <tbody>
                {sortedAdjustments.map((a) => (
                  <tr key={a.id}>
                    <td style={{ whiteSpace: "nowrap", color: "var(--muted)" }}>
                      {fmtDate(a.ts)}
                    </td>
                    <td><b>{a.productName}</b></td>
                    <td>
                      <b style={{ color: a.delta >= 0 ? "var(--accent-text)" : "var(--danger)" }}>
                        {a.delta > 0 ? `+${a.delta}` : a.delta}
                      </b>
                    </td>
                    <td>
                      <span className={`badge ${a.reason === "correction" ? "green" : "amber"}`}>
                        {t(REASON_LABELS[a.reason] ?? "inv.adjReason.correction")}
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)" }}>{a.note || "—"}</td>
                  </tr>
                ))}
                {sortedAdjustments.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty">{t("inv.empty.adjustments")}</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-wrap inv-table">
            <table className="data">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t("inv.th.product")}</th>
                  <th>{t("inv.th.sku")}</th>
                  <th>{t("inv.th.stock")}</th>
                  {canCost && <th>{t("inv.th.cost")}</th>}
                  <th>{t("inv.th.salePrice")}</th>
                  {canCost && <th>{t("inv.th.margin")}</th>}
                  <th>{t("inv.th.status")}</th>
                  {canAct && <th>{t("inv.th.actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const low = p.stockQty <= p.reorderLevel;
                  const critical = p.stockQty <= Math.ceil(p.reorderLevel / 2);
                  const out = p.stockQty <= 0;
                  const margin = p.salePrice - p.costPrice;
                  const expiryDays = p.expiryDate ? daysUntil(p.expiryDate) : null;
                  const lastSale = view === "dead" ? lastSaleOffset(sales, p.id) : null;
                  return (
                    <tr key={p.id} className={critical ? "row-critical" : low ? "row-low" : ""}>
                      <td style={{ whiteSpace: "nowrap", color: "var(--muted)", fontSize: "0.85rem" }}>{p.id}</td>
                      <td>
                        <b>{p.name}</b>
                        <div className="ur" style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                          {p.urduName}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--muted-2)" }}>{catLabel(p.category)}</div>
                        {view === "dead" && (
                          <div style={{ fontSize: "0.8rem", color: "var(--muted-2)" }}>
                            {lastSale === null
                              ? t("inv.dead.never")
                              : t("inv.dead.daysAgo", { d: lastSale })}
                          </div>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--muted)" }}>{p.sku}</td>
                      <td>
                        <b>{fmtNum(p.stockQty)}</b> {fmtUnit(p.unit)}
                        <div style={{ fontSize: "0.78rem", color: "var(--muted-2)" }}>
                          {t("inv.reorderAt", { n: fmtNum(p.reorderLevel) })}
                        </div>
                        {(() => {
                          const av = availability.get(p.id);
                          if (!av || av.promised <= 0) return null;
                          return (
                            <div style={{ fontSize: "0.78rem", color: "var(--amber-text)" }}>
                              {t("inv.promised", { n: fmtNum(av.promised) })} ·{" "}
                              {t("inv.available", { n: fmtNum(Math.max(0, av.available)) })}
                            </div>
                          );
                        })()}
                      </td>
                      {canCost && <td>{fmtPKR(p.costPrice)}</td>}
                      <td><b>{fmtPKR(p.salePrice)}</b></td>
                      {canCost && (
                        <td style={{ color: margin >= 0 ? "var(--accent-text)" : "var(--danger)", fontWeight: 700 }}>
                          {fmtPKR(margin)}
                        </td>
                      )}
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {/* C3: the raw-material class badge (§4.1) */}
                          {p.stockClass === "raw" && (
                            <span className="badge amber">{t("inv.rawBadge")}</span>
                          )}
                          {out ? (
                            <span className="badge red"><span className="pulse-dot" />{t("inv.status.out")}</span>
                          ) : critical ? (
                            <span className="badge red"><span className="pulse-dot" />{t("inv.status.critical")}</span>
                          ) : low ? (
                            <span className="badge amber"><span className="pulse-dot" />{t("inv.status.low")}</span>
                          ) : (
                            <span className="badge green">{t("inv.status.inStock")}</span>
                          )}
                          {p.expiryDate && expiryDays !== null && expiryDays < 0 && (
                            <span className="badge red">
                              {fmtDate(p.expiryDate)} · {t("inv.expiry.expired", { d: -expiryDays })}
                            </span>
                          )}
                          {p.expiryDate && expiryDays !== null && expiryDays === 0 && (
                            <span className="badge amber">
                              {fmtDate(p.expiryDate)} · {t("inv.expiry.today")}
                            </span>
                          )}
                          {p.expiryDate && expiryDays !== null && expiryDays > 0 && expiryDays <= 30 && (
                            <span className="badge amber">
                              {fmtDate(p.expiryDate)} · {t("inv.expiry.inDays", { d: expiryDays })}
                            </span>
                          )}
                        </div>
                      </td>
                      {canAct && (
                        <td>
                          <div className="row-actions">
                            {canAdjust && (
                              <button type="button" className="icon-btn" onClick={() => openAdjust(p)} aria-label={t("inv.adjustAria", { name: p.name })} title={t("inv.adjustTitle")}>
                                <span style={{ fontWeight: 800, fontSize: "1rem", lineHeight: 1 }} aria-hidden="true">±</span>
                              </button>
                            )}
                            {canManage && (
                              <button type="button" className="icon-btn" onClick={() => openEdit(p)} aria-label={t("inv.editAria", { name: p.name })}>
                                <IconEdit />
                              </button>
                            )}
                            {canManage && (
                              <button type="button" className="icon-btn danger" onClick={() => setConfirmDelete(p)} aria-label={t("inv.deleteAria", { name: p.name })}>
                                <IconTrash />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={colCount}>
                      <div className="empty">{emptyMsg}</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {modalOpen && (
          <div className="modal-backdrop" onClick={() => setModalOpen(false)} role="dialog" aria-modal="true" aria-label={editing ? t("inv.form.editTitle") : t("inv.addProduct")}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{editing ? t("inv.form.editTitle") : t("inv.addProduct")}</h2>
              <p className="modal-sub">
                {editing ? t("inv.form.editSub") : t("inv.form.addSub")}
              </p>
              <form className="form" onSubmit={submit}>
                {error && <div className="form-error">{error}</div>}
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="f-name">{t("inv.form.name")}</label>
                    <input id="f-name" value={form.name} onChange={set("name")} placeholder={t("inv.form.namePlaceholder")} required />
                  </div>
                  <div className="field">
                    <label htmlFor="f-urdu">{t("inv.form.urduName")}</label>
                    <input id="f-urdu" value={form.urduName} onChange={set("urduName")} placeholder={t("inv.form.urduNamePlaceholder")} dir="rtl" className="ur" />
                  </div>
                  <div className="field">
                    <label htmlFor="f-sku">{t("inv.form.sku")}</label>
                    <input id="f-sku" value={form.sku} onChange={set("sku")} placeholder={t("inv.form.skuPlaceholder")} required />
                  </div>
                  <div className="field">
                    <label htmlFor="f-cat">{t("inv.form.category")}</label>
                    <select id="f-cat" value={form.category} onChange={set("category")}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {catLabel(c)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="f-unit">{t("inv.form.unit")}</label>
                    <select id="f-unit" value={form.unit} onChange={set("unit")}>
                      <option value="pcs">{fmtUnit("pcs")}</option>
                      <option value="kg">{fmtUnit("kg")}</option>
                      <option value="L">{fmtUnit("L")}</option>
                      <option value="dozen">{fmtUnit("dozen")}</option>
                      <option value="packet">{fmtUnit("packet")}</option>
                      <option value="bag">{fmtUnit("bag")}</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="f-stock">{t("inv.form.stockQty")}</label>
                    <input id="f-stock" type="number" min={0} value={form.stockQty} onChange={set("stockQty")} />
                  </div>
                  <div className="field">
                    <label htmlFor="f-cost">{t("inv.form.costPrice")}</label>
                    <input id="f-cost" type="number" min={0} value={form.costPrice} onChange={set("costPrice")} />
                  </div>
                  <div className="field">
                    <label htmlFor="f-sale">{t("inv.form.salePrice")}</label>
                    <input id="f-sale" type="number" min={0} value={form.salePrice} onChange={set("salePrice")} />
                  </div>
                  <div className="field">
                    <label htmlFor="f-reorder">{t("inv.form.reorderLevel")}</label>
                    <input id="f-reorder" type="number" min={0} value={form.reorderLevel} onChange={set("reorderLevel")} />
                    <div className="hint">{t("inv.form.reorderHint")}</div>
                  </div>
                  <div className="field">
                    <label htmlFor="f-expiry">{t("inv.form.expiryDate")}</label>
                    <input id="f-expiry" type="date" value={form.expiryDate ?? ""} onChange={set("expiryDate")} />
                    <div className="hint">{t("inv.form.expiryHint")}</div>
                  </div>
                  <div className="field">
                    <label htmlFor="f-taxslab">{t("inv.form.taxSlab")}</label>
                    <select
                      id="f-taxslab"
                      value={form.taxSlabId ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, taxSlabId: e.target.value || null }))
                      }
                    >
                      <option value="">{t("inv.form.taxDefault")}</option>
                      {taxSlabs
                        .filter((s) => s.active || s.id === form.taxSlabId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.kind === "percent" ? `${s.rate}%` : fmtPKR(s.rate)})
                          </option>
                        ))}
                    </select>
                    <div className="hint">{t("inv.form.taxHint")}</div>
                  </div>
                  <div className="field">
                    <label>&nbsp;</label>
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={form.taxExempt ?? false}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, taxExempt: e.target.checked }))
                        }
                      />
                      {t("inv.form.taxExempt")}
                    </label>
                  </div>
                  {/* Phase C · C3 (§4.1): the stock class. Changing
                      it with stock on hand posts ONE reclass entry
                      (the note below says so before the save). */}
                  <div className="field">
                    <label htmlFor="f-class">{t("inv.form.class")}</label>
                    <select
                      id="f-class"
                      value={form.stockClass === "raw" ? "raw" : "goods"}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          stockClass: e.target.value === "raw" ? "raw" : null,
                        }))
                      }
                    >
                      <option value="goods">{t("inv.class.goods")}</option>
                      <option value="raw">{t("inv.class.raw")}</option>
                    </select>
                    <div className="hint">{t("inv.form.classHint")}</div>
                  </div>
                </div>
                {editing &&
                  (form.stockClass === "raw") !== (editing.stockClass === "raw") &&
                  form.stockQty > 0 && (
                    <div className="note-box" style={{ marginTop: 0 }} role="status">
                      {t("inv.form.classReclassNote", {
                        amount: fmtPKR(form.stockQty * form.costPrice),
                      })}
                    </div>
                  )}
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                    <IconClose /> {t("action.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editing ? t("inv.form.saveChanges") : t("inv.addProduct")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {adjustTarget && (
          <div className="modal-backdrop" onClick={() => setAdjustTarget(null)} role="dialog" aria-modal="true" aria-label={t("inv.adj.aria")}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{t("inv.adj.title")}</h2>
              <p className="modal-sub">
                <b>{adjustTarget.name}</b>{" "}
                {t("inv.adj.current", {
                  qty: fmtNum(adjustTarget.stockQty),
                  unit: fmtUnit(adjustTarget.unit),
                })}
              </p>
              <form className="form" onSubmit={submitAdjustment}>
                {adjError && <div className="form-error">{adjError}</div>}
                <div className="field">
                  <label htmlFor="adj-delta">{t("inv.adj.deltaLabel")}</label>
                  <input
                    id="adj-delta"
                    type="number"
                    step="any"
                    value={adjDelta}
                    onChange={(e) => setAdjDelta(e.target.value)}
                    placeholder={t("inv.adj.deltaPlaceholder")}
                  />
                </div>
                <div className="field">
                  <label htmlFor="adj-reason">{t("inv.adj.reason")}</label>
                  <select
                    id="adj-reason"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value as AdjustmentReason)}
                  >
                    <option value="damage">{t("inv.adjReason.damage")}</option>
                    <option value="expiry">{t("inv.adjReason.expiry")}</option>
                    <option value="theft">{t("inv.adjReason.theft")}</option>
                    <option value="correction">{t("inv.adjReason.correction")}</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="adj-note">{t("inv.adj.note")}</label>
                  <input
                    id="adj-note"
                    value={adjNote}
                    onChange={(e) => setAdjNote(e.target.value)}
                    placeholder={t("inv.adj.notePlaceholder")}
                  />
                </div>
                {/* Phase C · C1 (§1.5): the warehouse this
                    adjustment is recorded at. */}
                <div className="field">
                  <label htmlFor="adj-warehouse">{t("wh.pickerLabel")}</label>
                  <select
                    id="adj-warehouse"
                    value={adjWhId}
                    onChange={(e) => setAdjWhId(e.target.value)}
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
                <p style={{ fontSize: "0.88rem", color: "var(--muted)" }}>
                  {t("inv.adj.journalNote")}
                </p>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setAdjustTarget(null)}>
                    <IconClose /> {t("action.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {t("inv.adj.save")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {confirmDelete && (
          <div className="modal-backdrop" onClick={() => setConfirmDelete(null)} role="dialog" aria-modal="true" aria-label={t("inv.delete.aria")}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{t("inv.delete.title")}</h2>
              <p className="modal-sub">
                <b>{confirmDelete.name}</b> {t("inv.delete.body")}
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>
                  {t("inv.delete.keep")}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    deleteProduct(confirmDelete.id);
                    setConfirmDelete(null);
                  }}
                >
                  <IconTrash /> {t("action.delete")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
