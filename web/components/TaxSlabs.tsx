"use client";

/**
 * Dukaan AI — tax slabs UI (Phase A · A4, design §2).
 *
 * Settings surface for the tax engine:
 *  - the slab list with kind/rate/direction/inclusive/active and
 *    default badges (defaults are derived from the settings fields —
 *    the resolution source of truth);
 *  - owner-only CRUD (the store guard and rules v3 both refuse every
 *    staff role; the accountant's matrix row is read-only, so for
 *    staff the section renders as a plain list);
 *  - the shop default pickers for sales and purchases — choosing
 *    "No tax" is how a shop switches tax off; nothing retroactive
 *    ever happens to posted bills or purchases.
 */
import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import { can } from "@/lib/permissions";
import { IconPlus } from "./ui";
import { fmtPKR } from "@/lib/format";
import type { I18nKey } from "@/lib/i18n";
import type { TaxSlab } from "@/lib/types";

type SlabForm = {
  name: string;
  kind: "percent" | "fixed";
  rate: string;
  appliesTo: "sales" | "purchases" | "both";
  inclusive: boolean;
  active: boolean;
  isDefault: boolean;
};

const EMPTY_FORM: SlabForm = {
  name: "",
  kind: "percent",
  rate: "",
  appliesTo: "both",
  inclusive: false,
  active: true,
  isDefault: false,
};

const APPLIES_KEY: Record<TaxSlab["appliesTo"], I18nKey> = {
  sales: "tax.appliesSales",
  purchases: "tax.appliesPurchases",
  both: "tax.appliesBoth",
};

export function slabRateLabel(slab: Pick<TaxSlab, "kind" | "rate">, t: (k: I18nKey, p?: Record<string, string | number>) => string): string {
  return slab.kind === "percent"
    ? `${slab.rate}%`
    : t("tax.perUnit", { amount: fmtPKR(slab.rate) });
}

export default function TaxSlabsSection() {
  const {
    taxSlabs,
    settings,
    addTaxSlab,
    updateTaxSlab,
    deleteTaxSlab,
    setTaxDefault,
  } = useStore();
  const { role } = useAuth();
  const { t } = useLang();
  const canWrite = can(role, "taxSlabs", "write");

  const [form, setForm] = useState<SlabForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const sorted = useMemo(
    () => [...taxSlabs].sort((a, b) => a.name.localeCompare(b.name)),
    [taxSlabs]
  );
  const defaultOf = (id: string | null | undefined) =>
    id ? sorted.find((s) => s.id === id) ?? null : null;
  const salesDefault = defaultOf(settings.defaultSalesTaxSlabId);
  const purchaseDefault = defaultOf(settings.defaultPurchaseTaxSlabId);

  const startEdit = (s: TaxSlab) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      kind: s.kind,
      rate: String(s.rate),
      appliesTo: s.appliesTo,
      inclusive: s.inclusive,
      active: s.active,
      isDefault: s.isDefault,
    });
    setError("");
    setNotice("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = Number(form.rate);
    if (!form.name.trim()) return setError(t("tax.errName"));
    if (form.rate.trim() === "" || !Number.isFinite(rate) || rate < 0)
      return setError(t("tax.errRate"));
    setError("");
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      rate,
      appliesTo: form.appliesTo,
      inclusive: form.inclusive,
      active: form.active,
      isDefault: form.isDefault,
    };
    if (editingId) updateTaxSlab(editingId, payload);
    else addTaxSlab(payload);
    setNotice(t("tax.saved"));
    cancelEdit();
  };

  const defaultPicker = (
    direction: "sales" | "purchases",
    labelKey: I18nKey,
    current: TaxSlab | null
  ) => {
    const options = sorted.filter(
      (s) => s.appliesTo === direction || s.appliesTo === "both"
    );
    return (
      <div
        style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
      >
        <span style={{ minWidth: 150, fontWeight: 600 }}>{t(labelKey)}</span>
        <select
          value={current?.id ?? ""}
          disabled={!canWrite}
          onChange={(e) => {
            setTaxDefault(direction, e.target.value || null);
            setNotice(t("tax.defaultSaved"));
          }}
          aria-label={t(labelKey)}
          style={{ minWidth: 220 }}
        >
          <option value="">{t("tax.noDefault")}</option>
          {options.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({slabRateLabel(s, t)}){s.active ? "" : ` · ${t("tax.inactive")}`}
            </option>
          ))}
        </select>
      </div>
    );
  };

  return (
    <section className="card" aria-label={t("tax.title")}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("tax.title")}</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
        {t("tax.sub")}
      </p>

      {notice && (
        <div
          className="note-box"
          style={{ marginTop: 0, marginBottom: 16, borderStyle: "solid", borderColor: "var(--accent)" }}
        >
          {notice}
        </div>
      )}

      <div style={{ marginBottom: 8 }}>
        {sorted.map((s) => {
          const isDefault =
            s.id === settings.defaultSalesTaxSlabId ||
            s.id === settings.defaultPurchaseTaxSlabId;
          return (
            <div
              key={s.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                padding: "10px 0",
                borderBottom: "1px solid var(--line)",
                opacity: s.active ? 1 : 0.55,
              }}
            >
              <div style={{ display: "grid", gap: 2 }}>
                <span style={{ fontWeight: 700 }}>
                  {s.name}{" "}
                  <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: "0.85rem" }}>
                    · {slabRateLabel(s, t)} · {t(APPLIES_KEY[s.appliesTo])}
                  </span>
                </span>
                <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                  {s.inclusive ? t("tax.inclusiveBadge") : t("tax.exclusiveBadge")} ·{" "}
                  {s.active ? t("tax.active") : t("tax.inactive")}
                  {isDefault ? ` · ${t("tax.defaultBadge")}` : ""}
                </span>
              </div>
              {canWrite && (
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => startEdit(s)}
                  >
                    {t("tax.edit")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      deleteTaxSlab(s.id);
                      if (editingId === s.id) cancelEdit();
                      setNotice(t("tax.removed"));
                    }}
                  >
                    {t("action.remove")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p style={{ color: "var(--muted)" }}>{t("tax.empty")}</p>
        )}
      </div>

      <h3 style={{ fontSize: "1.05rem", margin: "18px 0 4px" }}>
        {t("tax.defaultsTitle")}
      </h3>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 12 }}>
        {t("tax.defaultsSub")}
      </p>
      <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        {defaultPicker("sales", "tax.defaultSales", salesDefault)}
        {defaultPicker("purchases", "tax.defaultPurchases", purchaseDefault)}
      </div>

      {!canWrite ? (
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          {t("tax.readonlyNote")}
        </p>
      ) : (
        <>
          <h3 style={{ fontSize: "1.05rem", margin: "6px 0 12px" }}>
            {editingId ? t("tax.editTitle") : t("tax.addTitle")}
          </h3>
          <form className="form" onSubmit={submit}>
            {error && <div className="form-error">{error}</div>}
            <div className="form-grid">
              <div className="field">
                <label htmlFor="tax-name">{t("tax.name")}</label>
                <input
                  id="tax-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t("tax.namePlaceholder")}
                />
              </div>
              <div className="field">
                <label htmlFor="tax-kind">{t("tax.kind")}</label>
                <select
                  id="tax-kind"
                  value={form.kind}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, kind: e.target.value as SlabForm["kind"] }))
                  }
                >
                  <option value="percent">{t("tax.kindPercent")}</option>
                  <option value="fixed">{t("tax.kindFixed")}</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="tax-rate">
                  {form.kind === "percent" ? t("tax.ratePercent") : t("tax.rateFixed")}
                </label>
                <input
                  id="tax-rate"
                  type="number"
                  min={0}
                  step="any"
                  value={form.rate}
                  onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="tax-applies">{t("tax.appliesTo")}</label>
                <select
                  id="tax-applies"
                  value={form.appliesTo}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      appliesTo: e.target.value as SlabForm["appliesTo"],
                    }))
                  }
                >
                  <option value="sales">{t("tax.appliesSales")}</option>
                  <option value="purchases">{t("tax.appliesPurchases")}</option>
                  <option value="both">{t("tax.appliesBoth")}</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={form.inclusive}
                  onChange={(e) => setForm((f) => ({ ...f, inclusive: e.target.checked }))}
                />
                {t("tax.inclusive")}
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                {t("tax.active")}
              </label>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                />
                {t("tax.defaultBadge")}
              </label>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-primary">
                <IconPlus /> {editingId ? t("action.save") : t("tax.add")}
              </button>
              {editingId && (
                <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
                  {t("action.cancel")}
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </section>
  );
}
