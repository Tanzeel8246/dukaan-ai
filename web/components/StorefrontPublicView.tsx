"use client";

/**
 * Phase H · H3 — the public store page (design §2.3).
 *
 * This page's whole world is ONE document: the published
 * snapshot at `storefronts/{slug}`. It reads nothing else —
 * no tenant collection is ever touched from here — and its
 * only write is a create into the public order inbox, shaped
 * by lib/storefront and timestamped by the server. When the
 * snapshot cannot be read (unknown slug, store switched off,
 * plan dark), the rules refuse the read and this page shows
 * its unavailable state; a signed-in member reading their own
 * dark snapshot gets the same page with a preview badge,
 * because the member read leg is what let the doc through.
 *
 * The `demo` slug is the §5.3 labelled preview: rendered from
 * the demo session's own data, badge on, and its order button
 * writes NOTHING — demo stays hermetic.
 */
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirestoreDb } from "@/lib/firebase";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import { fmtPKR } from "@/lib/format";
import {
  assembleStorefrontSnapshot,
  composeStoreOrder,
  normalizePhone,
  storefrontPageModel,
  type StorefrontPageModel,
} from "@/lib/storefront";
import type { StorefrontDoc } from "@/lib/types";

type LoadState =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "ready"; model: StorefrontPageModel; doc: StorefrontDoc; preview: boolean };

export default function StorefrontPublicView({ slug }: { slug: string }) {
  const { t, lang } = useLang();
  const { mode } = useAuth();
  const store = useStore();
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [fulfilment, setFulfilment] = useState<"pickup" | "delivery">("pickup");
  /* Phase H · H6 (audit fix 2): the customer's OWN WhatsApp
   * consent tick — default OFF; only a ticked box composes
   * waOptIn onto the order (composeStoreOrder admits nothing
   * else), and conversion stamps consent from that flag alone. */
  const [waConsent, setWaConsent] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDemoPreview = slug === "demo";

  /* The demo preview's snapshot is assembled locally from the
   * demo session's own catalogue — nothing is published, and
   * the doc never leaves the browser. */
  const demoDoc = useMemo<StorefrontDoc | null>(() => {
    if (!isDemoPreview || mode !== "demo") return null;
    const logo = store.branding.find((b) => b.kind === "logo");
    return assembleStorefrontSnapshot({
      businessId: "demo",
      slug: "demo",
      settings: store.settings,
      city: null,
      logoDataUrl: logo?.dataUrl ?? null,
      products: store.products,
      previous: null,
      nowISO: new Date().toISOString(),
    });
  }, [isDemoPreview, mode, store.branding, store.settings, store.products]);

  useEffect(() => {
    let live = true;
    if (isDemoPreview) {
      if (demoDoc) {
        setLoad({
          kind: "ready",
          model: storefrontPageModel(demoDoc),
          doc: demoDoc,
          preview: true,
        });
      } else {
        setLoad({ kind: "unavailable" });
      }
      return;
    }
    const db = getFirestoreDb();
    if (!db) {
      setLoad({ kind: "unavailable" });
      return;
    }
    getDoc(doc(db, "storefronts", slug))
      .then((snap) => {
        if (!live) return;
        if (!snap.exists()) {
          setLoad({ kind: "unavailable" });
          return;
        }
        const data = snap.data() as StorefrontDoc;
        setLoad({
          kind: "ready",
          model: storefrontPageModel(data),
          doc: data,
          // A disabled snapshot can only have been read through
          // the member leg — the public never sees it.
          preview: data.enabled !== true,
        });
      })
      .catch(() => {
        if (live) setLoad({ kind: "unavailable" });
      });
    return () => {
      live = false;
    };
  }, [slug, isDemoPreview, demoDoc]);

  const visibleGroups = useMemo(() => {
    if (load.kind !== "ready") return [];
    const q = query.trim().toLowerCase();
    if (!q) return load.model.groups;
    return load.model.groups
      .map((g) => ({
        category: g.category,
        cards: g.cards.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.nameUr ?? "").includes(q) ||
            c.category.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.cards.length > 0);
  }, [load, query]);

  const cartTotal = useMemo(() => {
    if (load.kind !== "ready") return 0;
    let total = 0;
    for (const [id, qty] of cart) {
      const card = load.model.cards.find((c) => c.productId === id);
      if (card) total += card.price * qty;
    }
    return total;
  }, [load, cart]);

  if (load.kind === "loading") {
    return (
      <div className="section-sm">
        <div className="container">
          <div className="empty">{t("shop.loading")}</div>
        </div>
      </div>
    );
  }
  if (load.kind === "unavailable") {
    return (
      <div className="section-sm">
        <div className="container">
          <div className="card" style={{ textAlign: "center", padding: 36 }}>
            <h1 className="h2" style={{ marginBottom: 10 }}>
              {t("shop.unavailableTitle")}
            </h1>
            <p style={{ color: "var(--muted)" }}>{t("shop.unavailableBody")}</p>
          </div>
        </div>
      </div>
    );
  }

  const { model, doc: snapDoc, preview } = load;
  const shopWa = `https://wa.me/${normalizePhone(model.phone).replace(/^0/, "92")}`;

  const setQty = (productId: string, qty: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      if (qty <= 0) next.delete(productId);
      else next.set(productId, Math.min(999, qty)); // absolute cap only; the +/- buttons below clamp to the card's real stock
      return next;
    });
  };

  const placeOrder = async () => {
    setError(null);
    if (isDemoPreview) return; // hermetic: the preview never writes
    if (name.trim().length < 2) return setError(t("shop.errName"));
    if (normalizePhone(phone).length < 10) return setError(t("shop.errPhone"));
    if (cart.size === 0) return setError(t("shop.errEmpty"));
    const order = composeStoreOrder(
      {
        customerName: name,
        phone,
        note,
        fulfilment,
        waOptIn: waConsent,
        lines: [...cart.entries()].map(([productId, qty]) => ({ productId, qty })),
      },
      { businessId: snapDoc.businessId, slug, nowISO: new Date().toISOString() }
    );
    if (!order) return setError(t("shop.errSend"));
    const db = getFirestoreDb();
    if (!db) return setError(t("shop.errSend"));
    setPlacing(true);
    try {
      await addDoc(collection(db, "storeOrders"), {
        ...order,
        createdAt: serverTimestamp(),
      });
      setPlaced(true);
    } catch {
      setError(t("shop.errSend"));
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    return (
      <div className="section-sm">
        <div className="container">
          <div className="card" style={{ textAlign: "center", padding: 36 }}>
            <h1 className="h2" style={{ marginBottom: 10 }}>
              {t("shop.orderPlacedTitle")}
            </h1>
            <p style={{ color: "var(--muted)", marginBottom: 18 }}>
              {t("shop.orderPlacedBody")}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <a className="btn btn-primary" href={shopWa} target="_blank" rel="noreferrer">
                {t("shop.whatsappShop")}
              </a>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setPlaced(false);
                  setCart(new Map());
                }}
              >
                {t("shop.orderAgain")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-sm">
      <div className="container">
        {preview && (
          <div className="notice" role="status" style={{ marginBottom: 16 }}>
            {t("shop.previewBadge")}
          </div>
        )}
        <div className="section-head">
          {model.logoRef && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={model.logoRef}
              alt=""
              style={{ height: 56, objectFit: "contain", marginBottom: 10 }}
            />
          )}
          <h1 className="h2">{model.shopName}</h1>
          {model.tagline && <p className="lead">{model.tagline}</p>}
          {model.city && <p style={{ color: "var(--muted)" }}>{model.city}</p>}
        </div>
        {model.notice && (
          <div className="notice" role="status" style={{ marginBottom: 16 }}>
            {model.notice}
          </div>
        )}

        <div className="search-box" style={{ marginBottom: 18 }}>
          <input
            type="search"
            value={query}
            placeholder={t("shop.searchPh")}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {visibleGroups.length === 0 && <div className="empty">{t("shop.noResults")}</div>}
        {visibleGroups.map((g) => (
          <div key={g.category || "_"} style={{ marginBottom: 22 }}>
            {g.category && <h3 style={{ marginBottom: 10 }}>{g.category}</h3>}
            <div className="grid-3">
              {g.cards.map((card) => {
                const qty = cart.get(card.productId) ?? 0;
                const displayName =
                  lang === "ur" && card.nameUr ? card.nameUr : card.name;
                return (
                  <div key={card.productId} className="card">
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{displayName}</div>
                    <div style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 8 }}>
                      {card.unit}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <strong>{fmtPKR(card.price)}</strong>
                      {card.stockQty !== undefined && (
                        <span style={{ fontSize: "0.9rem" }}>اسٹاک: <b>{card.stockQty}</b> {card.unit}</span>
                      )}
                      {card.stockState === "in" && (
                        <span className="badge green">{t("shop.available")}</span>
                      )}
                      {card.stockState === "low" && (
                        <span className="badge amber">{t("shop.lowStock")}</span>
                      )}
                      {card.stockState === "out" && (
                        <span className="badge red">{t("shop.outOfStock")}</span>
                      )}
                    </div>
                    {card.orderable &&
                      (qty === 0 ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setQty(card.productId, 1)}
                        >
                          {t("shop.add")}
                        </button>
                      ) : (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setQty(card.productId, qty - 1)}
                          >
                            −
                          </button>
                          <strong>{qty}</strong>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setQty(card.productId, card.stockQty !== undefined ? Math.min(card.stockQty, qty + 1) : qty + 1)}
                          >
                            +
                          </button>
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* ---------- cart + checkout ---------- */}
        <div className="card" style={{ marginTop: 8 }}>
          <h3 style={{ marginBottom: 12 }}>{t("shop.cartTitle")}</h3>
          {cart.size === 0 ? (
            <p style={{ color: "var(--muted)" }}>{t("shop.cartEmpty")}</p>
          ) : (
            <>
              <table className="table" style={{ marginBottom: 12 }}>
                <tbody>
                  {[...cart.entries()].map(([id, qty]) => {
                    const card = model.cards.find((c) => c.productId === id);
                    if (!card) return null;
                    return (
                      <tr key={id}>
                        <td>{lang === "ur" && card.nameUr ? card.nameUr : card.name}</td>
                        <td>×{qty}</td>
                        <td>{fmtPKR(card.price * qty)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p style={{ marginBottom: 6 }}>
                {t("shop.cartTotal")}: <strong>{fmtPKR(cartTotal)}</strong>
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
                {t("shop.priceNote")}
              </p>
              <h3 style={{ marginBottom: 12 }}>{t("shop.checkoutTitle")}</h3>
              <div className="form-grid" style={{ marginBottom: 14 }}>
                <div className="field">
                  <label htmlFor="shop-name">{t("shop.nameLabel")}</label>
                  <input
                    id="shop-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="shop-phone">{t("shop.phoneLabel")}</label>
                  <input
                    id="shop-phone"
                    value={phone}
                    inputMode="tel"
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="shop-note">{t("shop.noteLabel")}</label>
                  <input
                    id="shop-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>{t("shop.fulfilmentLabel")}</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className={fulfilment === "pickup" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                      onClick={() => setFulfilment("pickup")}
                    >
                      {t("shop.fulfilment.pickup")}
                    </button>
                    <button
                      type="button"
                      className={fulfilment === "delivery" ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"}
                      onClick={() => setFulfilment("delivery")}
                    >
                      {t("shop.fulfilment.delivery")}
                    </button>
                  </div>
                </div>
              </div>
              <label
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "flex-start",
                  cursor: "pointer",
                  marginBottom: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={waConsent}
                  onChange={(e) => setWaConsent(e.target.checked)}
                  style={{ marginTop: 3 }}
                />
                <span>{t("shop.consentLabel")}</span>
              </label>
              {error && (
                <div className="notice err" role="alert" style={{ marginBottom: 12 }}>
                  {error}
                </div>
              )}
              {!isDemoPreview && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={placing}
                  onClick={placeOrder}
                >
                  {placing ? t("shop.placing") : t("shop.placeOrder")}
                </button>
              )}
            </>
          )}
        </div>

        <p
          style={{
            textAlign: "center",
            color: "var(--muted)",
            fontSize: "0.85rem",
            marginTop: 22,
          }}
        >
          {t("shop.poweredBy")}
        </p>
      </div>
    </div>
  );
}
