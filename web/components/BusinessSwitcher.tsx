/**
 * Dukaan AI — the header business switcher (Phase G · G1, design
 * §1.4; Fix Round 2 · FR2: multi-business creation). Lives in the
 * TOP HEADER beside the language and theme controls — never the
 * sidebar (the owner's standing shell rule).
 *
 * Chrome discipline: a person who belongs to NO business (demo)
 * or to exactly ONE business as a MEMBER sees no switcher at
 * all — the header just shows the shop name as before. An OWNER
 * sees the switcher even with one business, because the menu
 * must carry the "New business" entry (FR2 — this is a
 * deliberate change from the G1 discipline, under which a
 * one-business person saw no switcher at all). With two or
 * more, the shop name becomes a menu listing every business
 * from <AuthProvider>'s healed `userMemberships` index, each
 * row tagged with the person's role IN THAT business.
 * Choosing one re-points the session: <AuthProvider> switches
 * `dataUid`, and every store subscription tears down and
 * re-attaches to the new business — no listener survives a
 * switch.
 *
 * The creation dialog (owner-only) takes name + phone +
 * address and births a GENERATED business on Free Trial with
 * EMPTY content — never the founding comp plan, never demo
 * data. A business whose skeleton never landed offers the
 * setup retry row instead of failing silently.
 *
 * Demo mode never switches (there are no businesses in demo):
 * it renders the plain shop name, as does any single-business
 * member session.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useLang } from "@/components/LangProvider";
import { useStore } from "@/components/StoreProvider";
import type { ShopSettings } from "@/lib/types";

export function BusinessSwitcher({ settings }: { settings: ShopSettings }) {
  const { businesses, activeBusinessId, switchBusiness, createBusiness } = useAuth();
  const { setupIncomplete, retryBusinessSetup } = useStore();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createAddress, setCreateAddress] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open ]);

  const plainName =
    settings.shopName?.trim() || t("shell.brandFallback");

  // No business (demo / no-access / pre-G default) or a single
  // business as a MEMBER: no switcher chrome — the plain shop
  // name exactly as the header has always shown it.
  const singleMember =
    businesses.length === 1 && !businesses[0].own;
  if (businesses.length === 0 || singleMember) {
    return <span className="topbar-name">{plainName}</span>;
  }

  const active =
    businesses.find((b) => b.businessId === activeBusinessId) ?? businesses[0];
  const isOwner = businesses.some((b) => b.own);

  const doCreate = async () => {
    setCreateError(null);
    setCreateBusy(true);
    const res = await createBusiness({
      name: createName,
      phone: createPhone,
      address: createAddress,
    });
    setCreateBusy(false);
    if (!res.ok) {
      setCreateError(
        res.reason === "invalid"
          ? t("biz.createFailed")
          : res.reason === "setup-failed"
            ? t("biz.setupIncomplete")
            : t("biz.createFailed")
      );
      return;
    }
    setCreating(false);
    setOpen(false);
    setCreateName("");
    setCreatePhone("");
    setCreateAddress("");
  };

  const doRetry = async () => {
    setRetryBusy(true);
    await retryBusinessSetup();
    setRetryBusy(false);
    setOpen(false);
  };

  return (
    <div className="biz-switcher" ref={rootRef}>
      <button
        type="button"
        className="topbar-name biz-switcher-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("biz.switchBusiness")}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{active.name || plainName}</span>
        <span className="biz-switcher-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div className="biz-menu" role="menu">
          {businesses.map((b) => (
            <button
              key={b.businessId}
              type="button"
              role="menuitemradio"
              aria-checked={b.businessId === active.businessId}
              className={
                "biz-menu-item" +
                (b.businessId === active.businessId ? " active" : "")
              }
              onClick={() => {
                setOpen(false);
                if (b.businessId !== active.businessId) {
                  switchBusiness(b.businessId);
                }
              }}
            >
              <span className="biz-menu-name">
                {b.name || t("biz.businessFallback")}
              </span>
              <span className="biz-menu-tag">
                {b.own ? t("biz.yourBusiness") : b.role}
              </span>
            </button>
          ))}
          {setupIncomplete && (
            <button
              type="button"
              role="menuitem"
              className="biz-menu-item"
              disabled={retryBusy}
              onClick={doRetry}
            >
              <span className="biz-menu-name">{t("biz.retrySetup")}</span>
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              role="menuitem"
              className="biz-menu-item"
              onClick={() => {
                setOpen(false);
                setCreating(true);
              }}
            >
              <span className="biz-menu-name">+ {t("biz.newBusiness")}</span>
            </button>
          )}
        </div>
      )}
      {creating && (
        <div
          className="modal-backdrop"
          onClick={() => !createBusy && setCreating(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t("biz.createTitle")}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: "1.2rem", marginBottom: 6 }}>
              {t("biz.createTitle")}
            </h2>
            <p style={{ color: "var(--muted)", marginBottom: 18 }}>
              {t("biz.createBody")}
            </p>
            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="biz-create-name">{t("biz.nameLabel")}</label>
              <input
                id="biz-create-name"
                type="text"
                value={createName}
                maxLength={60}
                placeholder={t("biz.namePlaceholder")}
                onChange={(e) => setCreateName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label htmlFor="biz-create-phone">{t("biz.phoneLabel")}</label>
              <input
                id="biz-create-phone"
                type="tel"
                value={createPhone}
                maxLength={16}
                onChange={(e) => setCreatePhone(e.target.value)}
              />
            </div>
            <div className="field" style={{ marginBottom: 18 }}>
              <label htmlFor="biz-create-address">{t("biz.addressLabel")}</label>
              <input
                id="biz-create-address"
                type="text"
                value={createAddress}
                maxLength={200}
                onChange={(e) => setCreateAddress(e.target.value)}
              />
            </div>
            {createError && (
              <p style={{ color: "var(--danger)", marginBottom: 14 }}>
                {createError}
              </p>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={createBusy || createName.trim().length === 0}
                onClick={doCreate}
              >
                {t("biz.createButton")}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={createBusy}
                onClick={() => setCreating(false)}
              >
                {t("action.cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
