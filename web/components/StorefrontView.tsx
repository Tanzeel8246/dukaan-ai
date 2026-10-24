"use client";

/**
 * Phase H · H3 — the Online Store desk (design §2.2/§2.5).
 *
 * Two halves. The publish desk: the owner curates what the
 * public snapshot carries (a product is shown or hidden; its
 * price and stock BAND are copied in at publish — never a live
 * read, never a count) and publishes deliberately, or opts into
 * auto-republish. The inbox: public orders as paper — each row
 * shows the conversion plan against LIVE data (price drift,
 * vanished products, the phone-matched customer) before the
 * member confirms; conversion births a Phase B sale order and
 * flips the row, exactly once.
 *
 * RBAC: the `storefront` matrix row (owner/manager full,
 * accountant read, cashier none). Publishing itself is
 * owner-only — the store and rules v10 both enforce it; the
 * desk merely doesn't offer the button to anyone else.
 */
import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import PermDenied from "./PermDenied";
import QrCode from "./QrCode";
import { useLang } from "./LangProvider";
import { fmtDate, fmtPKR } from "@/lib/format";
import { can } from "@/lib/permissions";
import {
  normalizePhone,
  planStoreConversion,
  slugProblem,
  stockBandFor,
  storeOrderCounts,
  storefrontLitState,
  storefrontUrl,
  suggestSlug,
} from "@/lib/storefront";
import type { I18nKey } from "@/lib/i18n";
import type { StoreOrder } from "@/lib/types";

const BAND_KEY: Record<string, I18nKey> = {
  in: "store.band.in",
  low: "store.band.low",
  out: "store.band.out",
  hidden: "store.band.hidden",
};
const BAND_BADGE: Record<string, string> = {
  in: "badge green",
  low: "badge amber",
  out: "badge red",
  hidden: "badge",
};

export default function StorefrontView() {
  const {
    storefront,
    storeOrders,
    publishStorefront,
    unpublishStorefront,
    setStorefrontAutoRepublish,
    convertStoreOrder,
    dismissStoreOrder,
    products,
    customers,
    saleOrders,
    settings,
    planView,
  } = useStore();
  const { role, mode } = useAuth();
  const { t } = useLang();

  const [slugInput, setSlugInput] = useState("");
  const [tagline, setTagline] = useState<string | null>(null);
  const [noticeText, setNoticeText] = useState<string | null>(null);
  const [shownIds, setShownIds] = useState<Set<string> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const canWrite = can(role, "storefront", "write");
  const isOwner = role === "owner";
  const demo = mode === "demo";

  const lit = useMemo(
    () =>
      planView
        ? storefrontLitState(planView.snapshot.modulesTier, planView.state, storefront)
        : false,
    [planView, storefront]
  );
  const counts = useMemo(() => storeOrderCounts(storeOrders), [storeOrders]);

  /* Products the snapshot currently HIDES (its sticky hidden
   * set); the desk's checkbox state starts from it — products
   * the snapshot never met default to shown. */
  const prevHidden = useMemo(
    () =>
      new Set(
        (storefront?.products ?? [])
          .filter((p) => p.stockState === "hidden")
          .map((p) => p.productId)
      ),
    [storefront]
  );
  const shown = useMemo(() => {
    if (shownIds) return shownIds;
    return new Set(products.filter((p) => !prevHidden.has(p.id)).map((p) => p.id));
  }, [shownIds, products, prevHidden]);

  if (!can(role, "storefront", "view")) return <PermDenied />;

  const slugErr = !storefront && slugInput ? slugProblem(slugInput.trim()) : null;
  const url = storefront ? storefrontUrl(storefront.slug) : null;
  const stateText =
    storefront == null || !storefront.enabled
      ? t("store.state.disabled")
      : lit
        ? t("store.state.lit")
        : planView && !["advanced"].includes(planView.snapshot.modulesTier)
          ? t("store.state.darkPlan")
          : t("store.state.darkState");

  const doPublish = async () => {
    setBusy("publish");
    setNotice(null);
    const excluded = products.filter((p) => !shown.has(p.id)).map((p) => p.id);
    const included = [...prevHidden].filter((id) => shown.has(id));
    const res = await publishStorefront({
      slug: storefront ? undefined : slugInput.trim() || suggestSlug(settings.shopName),
      tagline: tagline ?? storefront?.tagline ?? null,
      notice: noticeText ?? storefront?.notice ?? null,
      excludedProductIds: excluded,
      includeProductIds: included,
    });
    setBusy(null);
    setNotice({
      ok: res.ok,
      text: res.ok ? t("store.publishedOk") : t("store.publishFailed"),
    });
  };

  const doUnpublish = async () => {
    setBusy("unpublish");
    const res = await unpublishStorefront();
    setBusy(null);
    setNotice({
      ok: res.ok,
      text: res.ok ? t("store.unpublishedOk") : t("store.publishFailed"),
    });
  };

  const copyLink = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the link text is selectable */
    }
  };

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("nav.storefront")}</span>
          <h1 className="h2">{t("store.title")}</h1>
          <p className="lead">{t("store.subtitle")}</p>
        </div>

        {notice && (
          <div
            className={notice.ok ? "notice ok" : "notice err"}
            role="status"
            style={{ marginBottom: 16 }}
          >
            {notice.text}
          </div>
        )}

        {demo ? (
          <div className="card">
            <p style={{ marginBottom: 14 }}>{t("store.demoNote")}</p>
            <Link href="/s/demo" className="btn btn-ghost">
              {t("store.previewLink")}
            </Link>
          </div>
        ) : (
          <>
            {/* ---------- status + public link ---------- */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  alignItems: "center",
                  marginBottom: url ? 14 : 0,
                }}
              >
                <span className={lit ? "badge green" : "badge"}>{stateText}</span>
                {counts.fresh > 0 && (
                  <span className="badge amber">
                    {counts.fresh} {t("store.stateNew")}
                  </span>
                )}
                {storefront && (
                  <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                    {t("store.updatedAt")}: {fmtDate(storefront.updatedAt)}
                  </span>
                )}
                {planView == null && <span>{t("store.state.noPlan")}</span>}
              </div>
              {url && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
                  <div className="field" style={{ flex: "1 1 320px" }}>
                    <label>{t("store.linkLabel")}</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <code
                        style={{
                          flex: "1 1 240px",
                          padding: "10px 12px",
                          border: "1px solid var(--line)",
                          borderRadius: 10,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {url}
                      </code>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={copyLink}>
                        {copied ? t("store.copied") : t("store.copyLink")}
                      </button>
                      <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">
                        {t("store.openStore")}
                      </a>
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <QrCode payload={url} sizePx={120} />
                    <div style={{ color: "var(--muted)", fontSize: "0.82rem", marginTop: 6 }}>
                      {t("store.qrCaption")}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ---------- publish desk (owner) ---------- */}
            {isOwner && (
              <div className="card" style={{ marginBottom: 20 }}>
                <h3 style={{ marginBottom: 6 }}>{t("store.productsTitle")}</h3>
                <p style={{ color: "var(--muted)", marginBottom: 16 }}>{t("store.productsHelp")}</p>
                <div className="form-grid" style={{ marginBottom: 16 }}>
                  {!storefront ? (
                    <div className="field">
                      <label htmlFor="store-slug">{t("store.slugLabel")}</label>
                      <input
                        id="store-slug"
                        value={slugInput}
                        placeholder={suggestSlug(settings.shopName)}
                        onChange={(e) => setSlugInput(e.target.value)}
                      />
                      <span className="hint">{t("store.slugHelp")}</span>
                      {slugErr && (
                        <span className="badge red" style={{ marginTop: 6 }}>
                          {t(`store.slugError.${slugErr}` as I18nKey)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="field">
                      <label>{t("store.slugLabel")}</label>
                      <input value={storefront.slug} readOnly />
                      <span className="hint">{t("store.slugImmutable")}</span>
                    </div>
                  )}
                  <div className="field">
                    <label htmlFor="store-tagline">{t("store.taglineLabel")}</label>
                    <input
                      id="store-tagline"
                      value={tagline ?? storefront?.tagline ?? ""}
                      placeholder={t("store.taglinePh")}
                      onChange={(e) => setTagline(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="store-notice">{t("store.noticeLabel")}</label>
                    <input
                      id="store-notice"
                      value={noticeText ?? storefront?.notice ?? ""}
                      placeholder={t("store.noticePh")}
                      onChange={(e) => setNoticeText(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>{t("store.phoneLabel")}</label>
                    <input value={settings.phone} readOnly />
                  </div>
                </div>
                <div style={{ overflowX: "auto", marginBottom: 16 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>{t("store.col.show")}</th>
                        <th>{t("store.col.product")}</th>
                        <th>{t("store.col.price")}</th>
                        <th>{t("store.col.stock")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((p) => {
                        const band = stockBandFor(p);
                        const isShown = shown.has(p.id);
                        return (
                          <tr key={p.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={isShown}
                                onChange={(e) => {
                                  const next = new Set(shown);
                                  if (e.target.checked) next.add(p.id);
                                  else next.delete(p.id);
                                  setShownIds(next);
                                }}
                              />
                            </td>
                            <td>{p.name}</td>
                            <td>{fmtPKR(p.salePrice)}</td>
                            <td>
                              <span className={BAND_BADGE[isShown ? band : "hidden"]}>
                                {t(BAND_KEY[isShown ? band : "hidden"])}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
                  <input
                    type="checkbox"
                    checked={settings.storefront?.autoRepublish === true}
                    onChange={(e) => setStorefrontAutoRepublish(e.target.checked)}
                  />
                  {t("store.autoRepublish")}
                </label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy != null || slugErr != null}
                    onClick={doPublish}
                  >
                    {storefront ? t("store.republish") : t("store.publish")}
                  </button>
                  {storefront?.enabled && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      disabled={busy != null}
                      onClick={doUnpublish}
                    >
                      {t("store.unpublish")}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ---------- inbox ---------- */}
            <div className="card">
              <h3 style={{ marginBottom: 14 }}>{t("store.inboxTitle")}</h3>
              {storeOrders.length === 0 && <div className="empty">{t("store.inboxEmpty")}</div>}
              <div style={{ display: "grid", gap: 14 }}>
                {storeOrders.map((order) => (
                  <StoreOrderRow
                    key={order.id}
                    order={order}
                    busy={busy}
                    canWrite={canWrite}
                    onConvert={async () => {
                      setBusy(order.id);
                      const res = await convertStoreOrder(order.id);
                      setBusy(null);
                      return res;
                    }}
                    onDismiss={async () => {
                      setBusy(order.id);
                      const res = await dismissStoreOrder(order.id);
                      setBusy(null);
                      return res;
                    }}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StoreOrderRow({
  order,
  busy,
  canWrite,
  onConvert,
  onDismiss,
}: {
  order: StoreOrder;
  busy: string | null;
  canWrite: boolean;
  onConvert: () => Promise<{ ok: boolean; soNumber?: string }>;
  onDismiss: () => Promise<{ ok: boolean }>;
}) {
  const { storefront, products, customers, saleOrders } = useStore();
  const { t } = useLang();
  const [note, setNote] = useState<string | null>(null);
  /* Phase H · H6 (audit fix 2): consent is the CUSTOMER's own
   * tick on the public checkout form, carried on the order
   * itself (order.waOptIn) — the desk only DISPLAYS it below.
   * The desk-side capture toggle that stood here until H6 is
   * gone: conversion stamps from the order's flag alone. */
  const plan = useMemo(
    () =>
      order.state === "new"
        ? planStoreConversion(order, storefront, products, customers)
        : null,
    [order, storefront, products, customers]
  );
  const so = order.convertedSoId
    ? saleOrders.find((o) => o.id === order.convertedSoId)
    : null;
  const planTotal = plan ? plan.lines.reduce((s, l) => s + l.total, 0) : 0;
  const driftShown = plan
    ? plan.drift.filter((d) => d.priceChanged || d.productMissing)
    : [];
  const waNumber = normalizePhone(order.phone).replace(/^0/, "92");
  const waHref = `https://wa.me/${waNumber}`;

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <strong>{order.customerName}</strong>
        <span>{order.phone}</span>
        <span className="badge">
          {order.fulfilment === "delivery"
            ? t("store.fulfilment.delivery")
            : t("store.fulfilment.pickup")}
        </span>
        <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
          {fmtDate(order.createdAt)}
        </span>
        {order.state === "new" && <span className="badge amber">{t("store.stateNew")}</span>}
        {order.state === "converted" && (
          <span className="badge green">{t("store.stateConverted")}</span>
        )}
        {order.state === "dismissed" && <span className="badge">{t("store.stateDismissed")}</span>}
      </div>
      {order.note && (
        <p style={{ color: "var(--muted)", marginBottom: 8 }}>
          {t("store.noteFromCustomer")}: {order.note}
        </p>
      )}
      {order.state === "new" && plan && (
        <>
          <p style={{ marginBottom: 8 }}>
            {plan.customer
              ? `${t("store.customerMatch")}: ${plan.customer.name}`
              : t("store.customerNew")}
          </p>
          {driftShown.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <strong>{t("store.driftTitle")}</strong>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{t("store.driftNote")}</p>
              <table className="table">
                <tbody>
                  {driftShown.map((d) => (
                    <tr key={d.productId}>
                      <td>{d.name}</td>
                      <td>×{d.qty}</td>
                      <td>
                        {d.productMissing
                          ? t("store.drift.missing")
                          : `${t("store.drift.published")} ${fmtPKR(d.publishedPrice ?? 0)} · ${t("store.drift.live")} ${fmtPKR(d.livePrice ?? 0)} · ${t("store.drift.changed")}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {order.waOptIn === true && (
            <p style={{ marginBottom: 10 }}>
              <span className="badge green">✓ {t("wa.consent.storefrontLabel")}</span>
            </p>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span>
              {t("store.orderTotal")}: <strong>{fmtPKR(planTotal)}</strong>
            </span>
            {canWrite && (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={busy != null}
                  onClick={async () => {
                    const res = await onConvert();
                    setNote(
                      res.ok
                        ? `${t("store.convertedOk")} ${res.soNumber ?? ""}`
                        : t("store.convertFailed")
                    );
                  }}
                >
                  {busy === order.id ? t("store.converting") : t("store.convert")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy != null}
                  onClick={async () => {
                    const res = await onDismiss();
                    setNote(res.ok ? t("store.dismissedOk") : t("store.convertFailed"));
                  }}
                >
                  {t("store.dismiss")}
                </button>
              </>
            )}
            {note && <span style={{ color: "var(--muted)" }}>{note}</span>}
          </div>
        </>
      )}
      {order.state === "converted" && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <span>
            {t("store.convertedTo")}: <strong>{so?.number ?? "—"}</strong>
          </span>
          <Link href="/sale-orders" className="btn btn-ghost btn-sm">
            {t("store.viewOrder")}
          </Link>
          <a className="btn btn-ghost btn-sm" href={waHref} target="_blank" rel="noreferrer">
            {t("store.convertWa")}
          </a>
        </div>
      )}
    </div>
  );
}
