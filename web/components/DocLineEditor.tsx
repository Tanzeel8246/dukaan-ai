"use client";

/**
 * Phase B · B1 — the shared line editor for quotations and sale
 * orders, modelled on the billing desk's line patterns (product
 * search + picker, fractional quantities). Lines carry the AGREED
 * price: it defaults to the product's current shelf price when the
 * line is added and stays editable — this is the document's own
 * price, the promise the later bill honours (§2.4).
 */
import { useMemo, useRef, useState } from "react";
import { useLang } from "./LangProvider";
import {
  IconSearch,
  IconTrash,
  ProductResultList,
  SearchClear,
  pickerKeyDown,
} from "./ui";
import { fmtNum, fmtPKR, fmtUnit } from "@/lib/format";
import { filterProducts } from "@/lib/search";
import type { DocLineInput } from "./StoreProvider";
import type { Product } from "@/lib/types";

function fmtQty(n: number): string {
  return Number.isInteger(n) ? fmtNum(n) : String(Math.round(n * 1000) / 1000);
}

interface Props {
  products: Product[];
  lines: DocLineInput[];
  onChange: (lines: DocLineInput[]) => void;
  /** Phase B · B3: "price" (default — sales documents, the AGREED
   *  price defaults to the shelf price) or "cost" (purchase
   *  orders: the line value is the AGREED COST and defaults to the
   *  product's current cost). The line shape is shared; only the
   *  default + label change. */
  priceKind?: "price" | "cost";
}

export default function DocLineEditor({ products, lines, onChange, priceKind = "price" }: Props) {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [pickIdx, setPickIdx] = useState(0);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const pickable = useMemo(() => {
    const list = [...products].sort((a, b) => a.name.localeCompare(b.name));
    // lib/search: null-safe against legacy products missing fields.
    return filterProducts(list, search);
  }, [products, search]);

  /* POS picker: results only while searching; click/Enter adds
   * the line straight away — no select-then-Add step. */
  const searching = search.trim().length > 0;
  const pickResults = searching ? pickable.slice(0, 12) : [];
  const lineQtyById = useMemo(
    () => new Map(lines.map((l) => [l.productId, l.qty])),
    [lines]
  );

  const addLine = (productId: string) => {
    const p = byId.get(productId);
    if (!p) return;
    const existing = lines.find((l) => l.productId === productId);
    if (existing) {
      onChange(
        lines.map((l) =>
          l.productId === productId ? { ...l, qty: l.qty + 1 } : l
        )
      );
    } else {
      onChange([
        ...lines,
        { productId, qty: 1, unitPrice: priceKind === "cost" ? p.costPrice : p.salePrice },
      ]);
    }
    setSearch("");
    setPickIdx(0);
    searchRef.current?.focus();
  };

  const onPickerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    pickerKeyDown(e, pickResults.length, pickIdx, setPickIdx, () => {
      const p = pickResults[pickIdx] ?? pickResults[0];
      if (p) addLine(p.id);
    });
  };

  const setLine = (productId: string, patch: Partial<DocLineInput>) =>
    onChange(lines.map((l) => (l.productId === productId ? { ...l, ...patch } : l)));

  return (
    <div>
      <div className="field">
        <label htmlFor="doc-search">{t("doc.lines.product")}</label>
        <div className="search-box" style={{ maxWidth: "none" }}>
          <IconSearch />
          <input
            id="doc-search"
            ref={searchRef}
            type="search"
            placeholder={t("doc.lines.searchPh")}
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
        {searching && (
          <div style={{ marginTop: 10 }}>
            <ProductResultList
              items={pickResults.map((p) => ({
                id: p.id,
                name: p.name,
                meta: t("doc.lines.stock", {
                  qty: fmtQty(p.stockQty),
                  unit: fmtUnit(p.unit),
                }),
                price: fmtPKR(priceKind === "cost" ? p.costPrice : p.salePrice),
                badge: p.stockClass === "raw" ? t("inv.rawBadge") : null,
                inCartQty: lineQtyById.get(p.id),
                inCartLabel: `× ${fmtQty(lineQtyById.get(p.id) ?? 0)}`,
              }))}
              activeIndex={pickIdx}
              onPick={addLine}
              emptyText={t("doc.lines.noResults", { query: search.trim() })}
              listLabel={t("doc.lines.product")}
            />
          </div>
        )}
      </div>

      {lines.length > 0 && (
        <div style={{ display: "grid", gap: 10, marginTop: 6 }}>
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
                  <label>{t("doc.lines.qty")}</label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={l.qty || ""}
                    onChange={(e) =>
                      setLine(l.productId, { qty: parseFloat(e.target.value) || 0 })
                    }
                    style={{ width: 90 }}
                  />
                </div>
                <div className="field" style={{ margin: 0 }}>
                  <label>{t(priceKind === "cost" ? "doc.lines.cost" : "doc.lines.price")}</label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={l.unitPrice || ""}
                    onChange={(e) =>
                      setLine(l.productId, {
                        unitPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    style={{ width: 110 }}
                  />
                </div>
                <div style={{ minWidth: 96, textAlign: "right" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    {t("doc.lines.amount")}
                  </div>
                  <b style={{ fontFamily: "var(--font-display)" }}>
                    {fmtPKR(l.qty * l.unitPrice)}
                  </b>
                </div>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => onChange(lines.filter((x) => x.productId !== l.productId))}
                  aria-label={t("doc.lines.removeAria", { name: p.name })}
                >
                  <IconTrash />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
