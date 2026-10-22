"use client";

import { useMemo, useRef, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import PermDenied from "./PermDenied";
import { can } from "@/lib/permissions";
import {
  IconCash,
  IconSearch,
  ProductResultList,
  SearchClear,
  pickerKeyDown,
} from "./ui";
import { fmtNum, fmtPKR, fmtUnit } from "@/lib/format";
import { filterProducts } from "@/lib/search";
import { profitOnDay, revenueOnDay, salesOnDay, unitsOnDay } from "@/lib/selectors";

export default function SalesRecorder() {
  const { ready, products, sales, recordSale } = useStore();
  const { role } = useAuth();
  const { t } = useLang();
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [search, setSearch] = useState("");
  const [pickIdx, setPickIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const sellable = useMemo(() => {
    const list = [...products].sort((a, b) => a.name.localeCompare(b.name));
    // lib/search: null-safe — a legacy product missing urduName/sku
    // must never throw here (it used to kill the whole page).
    return filterProducts(list, search);
  }, [products, search]);

  /* POS picker: results only while searching; one click selects
   * the product (the counter records one product per sale). */
  const searching = search.trim().length > 0;
  const pickResults = searching ? sellable.slice(0, 12) : [];
  const chooseProduct = (id: string) => {
    setProductId(id);
    setSearch("");
    setPickIdx(0);
  };
  const onPickerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    pickerKeyDown(e, pickResults.length, pickIdx, setPickIdx, () => {
      const p = pickResults[pickIdx] ?? pickResults[0];
      if (p && p.stockQty > 0) chooseProduct(p.id);
    });
  };

  const selected = products.find((p) => p.id === productId) ?? null;

  const today = useMemo(() => {
    if (!ready) return null;
    const list = salesOnDay(sales, 0)
      .slice()
      .sort((a, b) => b.ts.localeCompare(a.ts));
    return {
      list,
      revenue: revenueOnDay(sales, 0),
      units: unitsOnDay(sales, 0),
      profit: profitOnDay(sales, 0, products),
    };
  }, [ready, sales, products]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    if (!selected) {
      setNotice({ ok: false, text: t("sales.errChooseProduct") });
      return;
    }
    if (qty <= 0) {
      setNotice({ ok: false, text: t("sales.errQtyMin") });
      return;
    }
    if (selected.stockQty < qty) {
      setNotice({
        ok: false,
        text: t("sales.errStock", {
          qty: fmtNum(selected.stockQty),
          unit: fmtUnit(selected.unit),
          name: selected.name,
        }),
      });
      return;
    }
    const ok = recordSale(selected.id, qty);
    if (ok) {
      setNotice({
        ok: true,
        text: t("sales.successRecorded", {
          qty,
          name: selected.name,
          amount: fmtPKR(qty * selected.salePrice),
        }),
      });
      setQty(1);
    } else {
      setNotice({ ok: false, text: t("sales.errRecordFailed") });
    }
  };

  if (!can(role, "salesCounter", "view")) return <PermDenied />;

  if (!today) {
    return (
      <div className="section"><div className="container"><div className="empty">{t("common.loading")}</div></div></div>
    );
  }

  const byId = new Map(products.map((p) => [p.id, p]));

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("sales.eyebrow")}</span>
          <h1 className="h2">{t("sales.title")}</h1>
          <p className="lead">{t("sales.subtitle")}</p>
        </div>

        <div className="grid-2" style={{ alignItems: "start" }}>
          <section className="card" aria-label={t("sales.newSaleAria")}>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("sales.newSale")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 20 }}>
              {t("sales.newSaleSub")}
            </p>
            <form className="form" onSubmit={submit}>
              <div className="field">
                <label htmlFor="sale-search">{t("sales.findProduct")}</label>
                <div className="search-box" style={{ maxWidth: "none" }}>
                  <IconSearch />
                  <input
                    id="sale-search"
                    ref={searchRef}
                    type="search"
                    placeholder={t("sales.searchPlaceholder")}
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPickIdx(0);
                    }}
                    onKeyDown={onPickerKeyDown}
                  />
                  {search && (
                    <SearchClear
                      onClear={() => {
                        setSearch("");
                        setPickIdx(0);
                        searchRef.current?.focus();
                      }}
                      label={t("action.clearSearch")}
                    />
                  )}
                </div>
                {searching ? (
                  <div style={{ marginTop: 10 }}>
                    <ProductResultList
                      items={pickResults.map((p) => ({
                        id: p.id,
                        name: p.name,
                        meta: `${fmtNum(p.stockQty)} ${fmtUnit(p.unit)}`,
                        price: fmtPKR(p.salePrice),
                        badge: p.stockClass === "raw" ? t("inv.rawBadge") : null,
                        disabled: p.stockQty <= 0,
                      }))}
                      activeIndex={pickIdx}
                      onPick={chooseProduct}
                      emptyText={t("sales.noResults", { query: search.trim() })}
                      listLabel={t("sales.product")}
                    />
                  </div>
                ) : (
                  selected && (
                    <div style={{ marginTop: 10 }}>
                      <ProductResultList
                        items={[
                          {
                            id: selected.id,
                            name: selected.name,
                            meta: `${fmtNum(selected.stockQty)} ${fmtUnit(selected.unit)}`,
                            price: fmtPKR(selected.salePrice),
                            badge:
                              selected.stockClass === "raw"
                                ? t("inv.rawBadge")
                                : null,
                          },
                        ]}
                        activeId={selected.id}
                        onPick={() => undefined}
                        emptyText=""
                        listLabel={t("sales.product")}
                      />
                    </div>
                  )
                )}
              </div>
              <div className="field">
                <label htmlFor="sale-qty">{t("sales.quantity")}</label>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div className="stepper">
                    <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label={t("sales.decreaseQty")}>−</button>
                    <span className="val">{qty}</span>
                    <button type="button" onClick={() => setQty((q) => q + 1)} aria-label={t("sales.increaseQty")}>+</button>
                  </div>
                  {selected && (
                    <b style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem" }}>
                      {fmtPKR(qty * selected.salePrice)}
                    </b>
                  )}
                </div>
                {selected && (
                  <div className="hint">
                    {t("sales.stockHint", {
                      qty: fmtNum(selected.stockQty),
                      unit: fmtUnit(selected.unit),
                      margin: fmtPKR(selected.salePrice - selected.costPrice),
                    })}
                  </div>
                )}
              </div>
              {notice && (
                <div className={notice.ok ? "note-box" : "form-error"} style={notice.ok ? { borderStyle: "solid", borderColor: "var(--accent)" } : undefined}>
                  {notice.text}
                </div>
              )}
              <button type="submit" className="btn btn-primary btn-lg" disabled={!selected}>
                <IconCash /> {t("sales.recordSale")}
              </button>
            </form>
          </section>

          <section aria-label={t("sales.todayAria")}>
            <div className="card" style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.3rem", marginBottom: 12 }}>{t("sales.todayCounter")}</h2>
              <div className="stat-inline">
                <div className="si"><b>{fmtPKR(today.revenue)}</b><span>{t("sales.statRevenue")}</span></div>
                <div className="si"><b>{fmtNum(today.units)}</b><span>{t("sales.statItems")}</span></div>
                <div className="si"><b>{fmtPKR(today.profit)}</b><span>{t("sales.statProfit")}</span></div>
                <div className="si"><b>{fmtNum(today.list.length)}</b><span>{t("sales.statTransactions")}</span></div>
              </div>
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <h2 style={{ fontSize: "1.15rem", padding: "22px 26px 0" }}>{t("sales.todayList")}</h2>
              {today.list.length === 0 ? (
                <div className="empty">{t("sales.emptyToday")}</div>
              ) : (
                <div
                  style={{
                    maxHeight: 420,
                    overflowY: "auto",
                    borderTop: "1px solid var(--line)",
                    paddingTop: 2,
                    scrollPaddingTop: 2,
                  }}
                >
                  {today.list.map((s) => {
                    const p = byId.get(s.productId);
                    return (
                      <div
                        key={s.id}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          gap: 12, padding: "13px 26px", borderBottom: "1px solid var(--line)",
                        }}
                      >
                        <div>
                          <b style={{ fontSize: "0.95rem" }}>{p?.name ?? t("sales.unknownProduct")}</b>
                          <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
                            {t("sales.rowLine", { qty: fmtNum(s.qty), price: fmtPKR(s.unitPrice) })}
                          </div>
                        </div>
                        <b style={{ fontFamily: "var(--font-display)" }}>{fmtPKR(s.total)}</b>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
