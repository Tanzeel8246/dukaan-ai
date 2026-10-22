"use client";

import { useEffect, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import { can, type ShopRole } from "@/lib/permissions";
import type { I18nKey } from "@/lib/i18n";
import type { StaffRole } from "@/lib/types";
import { IconClose, IconLogout, IconTrash } from "./ui";
import MoneyAccountsSection from "./MoneyAccounts";
import TaxSlabsSection from "./TaxSlabs";
import PeriodsPanel from "./PeriodsPanel";
import { SERIES_DEFAULT_PREFIX, SERIES_IDS } from "@/lib/documents";
import { DEFAULT_JOB_STAGES, effectiveJobStages } from "@/lib/jobs";
import type { SeriesId } from "@/lib/types";

const SERIES_LABEL: Record<SeriesId, I18nKey> = {
  quotation: "settings.series.quotation",
  saleOrder: "settings.series.saleOrder",
  challan: "settings.series.challan",
  purchaseOrder: "settings.series.purchaseOrder",
  creditNote: "settings.series.creditNote",
  debitNote: "settings.series.debitNote",
  receiptVoucher: "settings.series.receiptVoucher",
  paymentVoucher: "settings.series.paymentVoucher",
  stockTransfer: "settings.series.stockTransfer",
  productionOrder: "settings.series.productionOrder",
  job: "settings.series.job",
  payrollRun: "settings.series.payrollRun",
  loan: "settings.series.loan",
};

const ROLE_OPTIONS: Array<{ role: StaffRole; key: I18nKey }> = [
  { role: "manager", key: "settings.roleManager" },
  { role: "cashier", key: "settings.roleCashier" },
  { role: "accountant", key: "settings.roleAccountant" },
];

const ROLE_LABEL: Record<ShopRole, I18nKey> = {
  owner: "settings.roleOwner",
  manager: "settings.roleManager",
  cashier: "settings.roleCashier",
  accountant: "settings.roleAccountant",
  none: "settings.roleStaff",
};

export default function SettingsView() {
  const {
    ready,
    settings,
    isStaff,
    updateSettings,
    addStaff,
    setStaffRole,
    removeStaff,
    resetDemo,
  } = useStore();
  const { user, mode, role, signOut } = useAuth();
  const { lang, setLang, t } = useLang();

  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<StaffRole>("manager");
  const [emailError, setEmailError] = useState(false);
  const [roleNotice, setRoleNotice] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  // Phase B · B1: document-numbering prefix overrides (§1.3).
  const [series, setSeries] = useState<Record<string, string>>({});
  const [seriesSaved, setSeriesSaved] = useState(false);
  // Phase C · C5: the job stage list (§5.2) — one stage per line.
  const [stagesText, setStagesText] = useState("");
  const [stagesSaved, setStagesSaved] = useState(false);

  useEffect(() => {
    setStagesText(effectiveJobStages(settings).join("\n"));
  }, [settings.jobStages]);

  const saveStages = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaff) return;
    const lines = stagesText
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    updateSettings({ jobStages: lines });
    setStagesSaved(true);
  };

  const resetStages = () => {
    if (isStaff) return;
    updateSettings({ jobStages: [] });
    setStagesText(DEFAULT_JOB_STAGES.join("\n"));
    setStagesSaved(true);
  };

  useEffect(() => {
    const init: Record<string, string> = {};
    for (const id of SERIES_IDS) init[id] = settings.docSeries?.[id] ?? "";
    setSeries(init);
  }, [settings.docSeries]);

  const saveSeries = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaff) return;
    const docSeries: Partial<Record<SeriesId, string>> = {};
    for (const id of SERIES_IDS) {
      const v = (series[id] ?? "").trim();
      if (v) docSeries[id] = v;
    }
    updateSettings({ docSeries });
    setSeriesSaved(true);
  };

  useEffect(() => {
    setShopName(settings.shopName ?? "");
    setAddress(settings.address ?? "");
    setPhone(settings.phone ?? "");
  }, [settings.shopName, settings.address, settings.phone]);

  const emailLabel = user?.email ?? (mode === "demo" ? t("settings.demoMode") : "—");
  const roleLabel = t(ROLE_LABEL[role]);

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaff) return;
    updateSettings({
      shopName: shopName.trim(),
      address: address.trim(),
      phone: phone.trim(),
    });
    setSaved(true);
  };

  const addStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    addStaff(email, newRole);
    setNewEmail("");
    setNewRole("manager");
  };

  // The staff list the UI renders: the A3 staff[] record, with any
  // mirror-only emails (pre-migration state) shown as Managers —
  // the legacy default — so nobody ever disappears from the list.
  const staffRows = (() => {
    const byEmail = new Map((settings.staff ?? []).map((m) => [m.email, m]));
    for (const email of settings.staffEmails) {
      if (!byEmail.has(email)) {
        byEmail.set(email, { email, role: "manager" as StaffRole, addedAt: "" });
      }
    }
    return [...byEmail.values()];
  })();
  const hasLegacyStaff = (settings.staff ?? []).length === 0 && settings.staffEmails.length > 0;

  if (!ready) {
    return (
      <div className="section"><div className="container"><div className="empty">{t("settings.loading")}</div></div></div>
    );
  }

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("settings.eyebrow")}</span>
          <h1 className="h2">{t("settings.title")}</h1>
          <p className="lead">{t("settings.lead")}</p>
          <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginTop: 8 }}>
            {t("settings.signedInAs", { email: emailLabel, role: roleLabel })}
          </p>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          {/* A3: shop profile + staff management are owner-only matrix
              rows (settingsProfile / staffManage); other roles keep
              the language + account sections and, per finance access,
              the money-accounts section below. */}
          {role === "owner" && (
          <section className="card" aria-label={t("settings.profileTitle")}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("settings.profileTitle")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
              {t("settings.profileSub")}
            </p>
            <form className="form" onSubmit={saveProfile}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="s-shop">{t("settings.shopName")}</label>
                  <input
                    id="s-shop"
                    value={shopName}
                    onChange={(e) => { setShopName(e.target.value); setSaved(false); }}
                    placeholder={t("settings.shopNamePlaceholder")}
                    disabled={isStaff}
                  />
                </div>
                <div className="field">
                  <label htmlFor="s-phone">{t("common.phone")}</label>
                  <input
                    id="s-phone"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setSaved(false); }}
                    placeholder={t("settings.phonePlaceholder")}
                    disabled={isStaff}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="s-address">{t("common.address")}</label>
                <input
                  id="s-address"
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setSaved(false); }}
                  placeholder={t("settings.addressPlaceholder")}
                  disabled={isStaff}
                />
              </div>
              {isStaff && (
                <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                  {t("settings.staffOnlyNote")}
                </p>
              )}
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button type="submit" className="btn btn-primary" disabled={isStaff}>
                  {t("action.save")}
                </button>
                {saved && !isStaff && (
                  <span style={{ color: "var(--accent-text)", fontWeight: 700, fontSize: "0.92rem" }}>
                    {t("settings.saved")}
                  </span>
                )}
              </div>
            </form>
          </section>
          )}

          {role === "owner" && (
          <section className="card" aria-label={t("settings.docSeriesTitle")}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("settings.docSeriesTitle")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
              {t("settings.docSeriesSub")}
            </p>
            <form className="form" onSubmit={saveSeries}>
              <div className="form-grid">
                {SERIES_IDS.map((id) => (
                  <div className="field" key={id}>
                    <label htmlFor={`series-${id}`}>{t(SERIES_LABEL[id])}</label>
                    <input
                      id={`series-${id}`}
                      value={series[id] ?? ""}
                      onChange={(e) => {
                        setSeries({ ...series, [id]: e.target.value });
                        setSeriesSaved(false);
                      }}
                      placeholder={SERIES_DEFAULT_PREFIX[id]}
                      disabled={isStaff}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button type="submit" className="btn btn-primary" disabled={isStaff}>
                  {t("action.save")}
                </button>
                {seriesSaved && !isStaff && (
                  <span style={{ color: "var(--accent-text)", fontWeight: 700, fontSize: "0.92rem" }}>
                    {t("settings.docSeriesSaved")}
                  </span>
                )}
              </div>
            </form>
          </section>
          )}

          {role === "owner" && (
          <section className="card" aria-label={t("job.stages.title")}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("job.stages.title")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
              {t("job.stages.sub")}
            </p>
            <form className="form" onSubmit={saveStages}>
              <div className="field">
                <label htmlFor="job-stages">{t("job.stages.title")}</label>
                <textarea
                  id="job-stages"
                  value={stagesText}
                  onChange={(e) => {
                    setStagesText(e.target.value);
                    setStagesSaved(false);
                  }}
                  rows={5}
                  disabled={isStaff}
                />
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button type="submit" className="btn btn-primary" disabled={isStaff}>
                  {t("action.save")}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={resetStages}
                  disabled={isStaff}
                >
                  {t("job.stages.reset")}
                </button>
                {stagesSaved && !isStaff && (
                  <span style={{ color: "var(--accent-text)", fontWeight: 700, fontSize: "0.92rem" }}>
                    {t("job.stages.saved")}
                  </span>
                )}
              </div>
            </form>
          </section>
          )}

          {role === "owner" && (
          <section className="card" aria-label={t("settings.staffTitle")}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("settings.staffTitle")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
              {t("settings.staffSub")}
            </p>
            {isStaff ? (
              <p style={{ color: "var(--muted)" }}>{t("settings.staffSelfNote")}</p>
            ) : (
              <>
                {staffRows.length === 0 ? (
                  <p style={{ color: "var(--muted)", marginBottom: 16 }}>{t("settings.noStaff")}</p>
                ) : (
                  <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                    {staffRows.map((m) => (
                      <div
                        key={m.email}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}
                      >
                        <span style={{ fontWeight: 600 }}>{m.email}</span>
                        <span style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <label style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                            {t("settings.staffRole")}
                          </label>
                          <select
                            value={m.role}
                            aria-label={t("settings.staffRoleAria", { email: m.email })}
                            onChange={(e) => {
                              setStaffRole(m.email, e.target.value as StaffRole);
                              setRoleNotice(true);
                            }}
                          >
                            {ROLE_OPTIONS.map((o) => (
                              <option key={o.role} value={o.role}>
                                {t(o.key)}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => removeStaff(m.email)}
                          >
                            <IconTrash /> {t("action.remove")}
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {roleNotice && (
                  <p style={{ color: "var(--accent-text)", fontWeight: 600, fontSize: "0.9rem", marginBottom: 12 }}>
                    {t("settings.roleUpdated")}
                  </p>
                )}
                {hasLegacyStaff && (
                  <div className="note-box" style={{ marginBottom: 16 }}>
                    {t("settings.staffLegacyNote")}
                  </div>
                )}
                <form className="form" onSubmit={addStaffSubmit}>
                  {emailError && <div className="form-error">{t("settings.invalidEmail")}</div>}
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div className="field" style={{ flex: 1, minWidth: 220 }}>
                      <label htmlFor="s-staff-email">{t("settings.staffEmail")}</label>
                      <input
                        id="s-staff-email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder={t("settings.staffEmailPlaceholder")}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="s-staff-role">{t("settings.staffRole")}</label>
                      <select
                        id="s-staff-role"
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as StaffRole)}
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o.role} value={o.role}>
                            {t(o.key)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary">
                      {t("action.add")}
                    </button>
                  </div>
                </form>
                <div className="note-box">{t("settings.inviteNote")}</div>
              </>
            )}
          </section>
          )}

          {can(role, "finance", "view") && <MoneyAccountsSection />}

          {/* A4: tax slabs — viewable by owner + accountant (matrix
              row taxSlabs); management renders owner-only inside. */}
          {can(role, "taxSlabs", "view") && <TaxSlabsSection />}

          {/* A5: fiscal year & period locking — the matrix row
              `periods` is owner-only in full, so other roles never
              see this section. */}
          {can(role, "periods", "view") && <PeriodsPanel />}

          <section className="card" aria-label={t("settings.languageTitle")}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("settings.languageTitle")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
              {t("settings.languageSub")}
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                className={`btn ${lang === "en" ? "btn-primary" : "btn-ghost"}`}
                aria-pressed={lang === "en"}
                onClick={() => setLang("en")}
              >
                {t("settings.langEnglish")}
              </button>
              <button
                type="button"
                className={`btn ${lang === "ur" ? "btn-primary" : "btn-ghost"} ur`}
                aria-pressed={lang === "ur"}
                onClick={() => setLang("ur")}
              >
                {t("settings.langUrdu")}
              </button>
            </div>
          </section>

          <section className="card" aria-label={t("settings.accountTitle")}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("settings.accountTitle")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
              {t("settings.accountSub")}
            </p>
            <div style={{ display: "grid", gap: 8, marginBottom: user ? 16 : 0 }}>
              <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
                {t("settings.accountEmail")}:{" "}
                <span style={{ color: "var(--text)", fontWeight: 600 }}>{emailLabel}</span>
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
                {t("settings.accountRole")}:{" "}
                <span style={{ color: "var(--text)", fontWeight: 600 }}>{roleLabel}</span>
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
                {t("settings.accountMode")}:{" "}
                <span style={{ color: "var(--text)", fontWeight: 600 }}>
                  {mode === "demo" ? t("settings.modeDemo") : t("settings.modeLive")}
                </span>
              </p>
            </div>
            {user && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => void signOut()}
              >
                <IconLogout /> {t("action.logout")}
              </button>
            )}
          </section>

          {/* F-10: reset is a DEMO-only convenience. In production the
              append-only rules make a reset impossible by design, so
              the whole section is hidden there (the store also refuses
              the call). */}
          {mode === "demo" && (
            <section className="card" aria-label={t("settings.dataTitle")}>
              <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("settings.dataTitle")}</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
                {t("settings.dataSub")}
              </p>
              <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}>
                {t("settings.resetDemo")}
              </button>
            </section>
          )}
        </div>

        {confirmReset && mode === "demo" && (
          <div className="modal-backdrop" onClick={() => setConfirmReset(false)} role="dialog" aria-modal="true" aria-label={t("settings.confirmAria")}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{t("settings.confirmTitle")}</h2>
              <p className="modal-sub">{t("settings.confirmBody")}</p>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)}>
                  <IconClose /> {t("action.cancel")}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    resetDemo();
                    setConfirmReset(false);
                  }}
                >
                  <IconTrash /> {t("settings.confirmReset")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
