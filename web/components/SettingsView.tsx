"use client";

import { useEffect, useState } from "react";
import { resolveLoyaltySettings } from "@/lib/loyalty";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import { usePinGate } from "./PinGate";
import DemoDataModal from "./DemoDataModal";
import { fmtDate } from "@/lib/format";
import { can, type ShopRole } from "@/lib/permissions";
import { membershipStatusFor } from "@/lib/tenancy";
import type { I18nKey } from "@/lib/i18n";
import { localeIsDraft } from "@/lib/i18n/review";
import type { StaffRole } from "@/lib/types";
import { IconClose, IconLogout, IconTrash } from "./ui";
import MoneyAccountsSection from "./MoneyAccounts";
import PrintDesignerSection from "./PrintDesigner";
import RaastSettingsSection from "./RaastSettings";
import TaxSlabsSection from "./TaxSlabs";
import DeviceLockCard from "./DeviceLockCard";
import PeriodsPanel from "./PeriodsPanel";
import FiscalClosePanel from "./FiscalClosePanel";
import PlanPanel from "./PlanPanel";
import BackupPanel from "./BackupPanel";
import { SERIES_DEFAULT_PREFIX, SERIES_IDS } from "@/lib/documents";
import { DEFAULT_JOB_STAGES, effectiveJobStages } from "@/lib/jobs";
import type { AccountCode, SeriesId } from "@/lib/types";
import { ACCOUNT_CODES } from "@/lib/coa";
import { TALLY_LEDGER_MAP } from "@/lib/tally";

const EXPENSE_CAT_CODES: Record<string, string> = {
  expense_rent: "rent",
  expense_electricity: "electricity",
  expense_salary: "salary",
  expense_transport: "transport",
  expense_other: "other",
};

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
    memberships,
    invites,
    updateSettings,
    addStaff,
    setStaffRole,
    removeStaff,
    resetDemo,
    demoClass,
    clearBusinessData,
  } = useStore();
  const { user, mode, role, signOut } = useAuth();
  const { requirePin } = usePinGate();
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
  /* Fix Round 2 · FR2: production danger zone (owner only) —
   * demo actions via the shared DemoDataModal, and Clear data:
   * PIN challenge + type-CLEAR + trash snapshot first; a second
   * clear while an active trash snapshot exists stops at an
   * explicit replace warning instead of silently deleting it. */
  const [demoModal, setDemoModal] = useState<"add" | "readd" | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearTyped, setClearTyped] = useState("");
  const [clearBusy, setClearBusy] = useState(false);
  const [clearReplace, setClearReplace] = useState(false);
  const [clearMsg, setClearMsg] = useState<string | null>(null);
  const runClear = async (replaceConfirmed: boolean) => {
    if (!(await requirePin("trash.clearButton"))) return;
    setClearBusy(true);
    const r = await clearBusinessData({ replaceConfirmed });
    setClearBusy(false);
    if (r.ok && r.manifest) {
      setClearMsg(t("trash.cleared", { date: fmtDate(r.manifest.expiresAt) }));
      setClearReplace(false);
      return;
    }
    if (r.reason === "replace") {
      setClearReplace(true);
      return;
    }
    setClearMsg(t("trash.clearFailed"));
  };
  const closeClear = () => {
    setClearOpen(false);
    setClearTyped("");
    setClearReplace(false);
    setClearMsg(null);
  };
  // Phase B · B1: document-numbering prefix overrides (§1.3).
  const [series, setSeries] = useState<Record<string, string>>({});
  const [seriesSaved, setSeriesSaved] = useState(false);
  // Phase C · C5: the job stage list (§5.2) — one stage per line.
  const [stagesText, setStagesText] = useState("");
  const [stagesSaved, setStagesSaved] = useState(false);
  // Phase D · D5: Tally ledger-NAME overrides (design §5.2) — names
  // only; the Tally group per account is fixed in lib/tally.
  const [tallyNames, setTallyNames] = useState<Record<string, string>>({});
  const [tallySaved, setTallySaved] = useState(false);
  // Phase H · H1: loyalty programme terms (design §1.7) — the
  // commercial figures live in settings; every composer reads them
  // through lib/loyalty's resolver, never from literals.
  const [loyEnabled, setLoyEnabled] = useState(false);
  const [loyForm, setLoyForm] = useState<Record<string, string>>({});
  const [loySaved, setLoySaved] = useState(false);

  useEffect(() => {
    const r = resolveLoyaltySettings(settings);
    setLoyEnabled(r.enabled);
    setLoyForm({
      earnRsPerPointBase: String(r.earnRsPerPointBase),
      pointValueRs: String(r.pointValueRs),
      redeemCapPct: String(r.redeemCapPct),
      expiryMonths: String(r.expiryMonths),
      silverAt: String(r.silverAt),
      goldAt: String(r.goldAt),
      silverMult: String(r.silverMult),
      goldMult: String(r.goldMult),
    });
  }, [settings.loyalty]);

  const saveLoyalty = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaff) return;
    const num = (k: string) => {
      const v = parseFloat(loyForm[k] ?? "");
      return Number.isFinite(v) ? v : undefined;
    };
    updateSettings({
      loyalty: {
        enabled: loyEnabled,
        earnRsPerPointBase: num("earnRsPerPointBase"),
        pointValueRs: num("pointValueRs"),
        redeemCapPct: num("redeemCapPct"),
        expiryMonths: num("expiryMonths"),
        silverAt: num("silverAt"),
        goldAt: num("goldAt"),
        silverMult: num("silverMult"),
        goldMult: num("goldMult"),
      },
    });
    setLoySaved(true);
  };

  useEffect(() => {
    const init: Record<string, string> = {};
    for (const code of ACCOUNT_CODES) init[code] = settings.tallyLedgerNames?.[code] ?? "";
    setTallyNames(init);
  }, [settings.tallyLedgerNames]);

  const saveTallyNames = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStaff) return;
    const overrides: Partial<Record<AccountCode, string>> = {};
    for (const code of ACCOUNT_CODES) {
      const v = (tallyNames[code] ?? "").trim();
      if (v) overrides[code] = v;
    }
    updateSettings({ tallyLedgerNames: overrides });
    setTallySaved(true);
  };

  /** Localized account label (mirrors FinanceView's: expense
   *  accounts reuse the shared expense-category vocabulary). */
  const acctLabel = (code: AccountCode): string => {
    const cat = EXPENSE_CAT_CODES[code];
    if (cat) return t(`common.expenseCat.${cat}` as I18nKey);
    const key = `fin.acct.${code}` as I18nKey;
    const label = t(key);
    return label === key
      ? code.charAt(0).toUpperCase() + code.slice(1).replace(/_/g, " ")
      : label;
  };

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

          {role === "owner" && <PrintDesignerSection />}

          {role === "owner" && <RaastSettingsSection />}

          {/* E4/E5: this device's PIN lock — device-local state,
              deliberately NOT role-gated (design §5); change/remove
              are guarded by the current PIN or the account
              password instead (§4.5). */}
          <DeviceLockCard />

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
          <section className="card" aria-label={t("set.loyalty.title")}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("set.loyalty.title")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
              {t("set.loyalty.sub")}
            </p>
            <form className="form" onSubmit={saveLoyalty}>
              <div className="field" style={{ marginBottom: 14 }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={loyEnabled}
                    onChange={(e) => { setLoyEnabled(e.target.checked); setLoySaved(false); }}
                    disabled={isStaff}
                  />
                  {t("set.loyalty.enabled")}
                </label>
              </div>
              <div className="form-grid">
                {(
                  [
                    ["earnRsPerPointBase", "set.loyalty.earnBase"],
                    ["pointValueRs", "set.loyalty.pointValue"],
                    ["redeemCapPct", "set.loyalty.redeemCap"],
                    ["expiryMonths", "set.loyalty.expiryMonths"],
                    ["silverAt", "set.loyalty.silverAt"],
                    ["goldAt", "set.loyalty.goldAt"],
                    ["silverMult", "set.loyalty.silverMult"],
                    ["goldMult", "set.loyalty.goldMult"],
                  ] as Array<[string, I18nKey]>
                ).map(([key, label]) => (
                  <div className="field" key={key}>
                    <label htmlFor={`loy-${key}`}>{t(label)}</label>
                    <input
                      id={`loy-${key}`}
                      type="number"
                      min={0}
                      step="any"
                      value={loyForm[key] ?? ""}
                      onChange={(e) => {
                        setLoyForm({ ...loyForm, [key]: e.target.value });
                        setLoySaved(false);
                      }}
                      disabled={isStaff}
                    />
                  </div>
                ))}
              </div>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                {t("set.loyalty.note")}
              </p>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button type="submit" className="btn btn-primary" disabled={isStaff}>
                  {t("action.save")}
                </button>
                {loySaved && !isStaff && (
                  <span style={{ color: "var(--accent-text)", fontWeight: 700, fontSize: "0.92rem" }}>
                    {t("settings.saved")}
                  </span>
                )}
              </div>
            </form>
          </section>
          )}

          {role === "owner" && (
          <section className="card" aria-label={t("fin.export.ledgerNames")}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("fin.export.ledgerNames")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
              {t("fin.export.ledgerNamesCaption")}
            </p>
            <form className="form" onSubmit={saveTallyNames}>
              <div className="form-grid">
                {ACCOUNT_CODES.map((code) => (
                  <div className="field" key={code}>
                    <label htmlFor={`tally-${code}`}>
                      {acctLabel(code)}{" "}
                      <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                        · {TALLY_LEDGER_MAP[code].group}
                      </span>
                    </label>
                    <input
                      id={`tally-${code}`}
                      value={tallyNames[code] ?? ""}
                      onChange={(e) => {
                        setTallyNames({ ...tallyNames, [code]: e.target.value });
                        setTallySaved(false);
                      }}
                      placeholder={TALLY_LEDGER_MAP[code].name}
                      disabled={isStaff}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button type="submit" className="btn btn-primary" disabled={isStaff}>
                  {t("action.save")}
                </button>
                {tallySaved && !isStaff && (
                  <span style={{ color: "var(--accent-text)", fontWeight: 700, fontSize: "0.92rem" }}>
                    {t("fin.export.ledgerSaved")}
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
                        {/* Phase G · G1: the member's tenancy state —
                            joined (claimed membership), pending
                            (invite unclaimed) or legacy (pre-G
                            staffIndex member). Production only: the
                            platform state is empty in demo. */}
                        {mode === "production" &&
                          (() => {
                            const st = membershipStatusFor(
                              m.email,
                              memberships,
                              invites
                            );
                            return (
                              <span
                                className="biz-member-chip"
                                data-status={st}
                              >
                                {t(
                                  st === "joined"
                                    ? "biz.memberJoined"
                                    : st === "pending"
                                      ? "biz.memberPending"
                                      : "biz.memberLegacy"
                                )}
                              </span>
                            );
                          })()}
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

          {/* D4: the fiscal-year close card lives beside the
              periods panel here, and in Finance's FY section. */}
          {can(role, "fiscalClose", "view") && <FiscalClosePanel />}

          {/* Phase G · G2: Plan & usage — the observation panel
              (snapshot, derived state, counters vs actuals).
              Owner-only and cloud-only; the panel itself renders
              nothing without a plan view. */}
          {!isStaff && mode !== "demo" && <PlanPanel />}

          {/* Phase G · G6: Backup & restore — the owner's data
              rights card (§3.7/§9). Owner-only and cloud-only like
              the plan panel; the export inside is reads only, so
              it stays available in every plan state. */}
          {!isStaff && mode !== "demo" && <BackupPanel />}

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
              <button
                type="button"
                className={`btn ${lang === "ps" ? "btn-primary" : "btn-ghost"} naskh`}
                aria-pressed={lang === "ps"}
                onClick={() => setLang("ps")}
              >
                {t("settings.langPashto")}
                {localeIsDraft("ps") && (
                  <span className="lang-draft-badge" style={{ marginInlineStart: 8 }}>
                    {t("settings.langDraftPreview")}
                  </span>
                )}
              </button>
              <button
                type="button"
                className={`btn ${lang === "fa" ? "btn-primary" : "btn-ghost"} naskh`}
                aria-pressed={lang === "fa"}
                onClick={() => setLang("fa")}
              >
                {t("settings.langFarsi")}
                {localeIsDraft("fa") && (
                  <span className="lang-draft-badge" style={{ marginInlineStart: 8 }}>
                    {t("settings.langDraftPreview")}
                  </span>
                )}
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

          {/* FR2 item 2 — production danger zone. Owner only; the
              demo actions live here too (same shared modal as the
              Dashboard button). Clear snapshots to trash first
              and wipes second; nothing here hard-deletes. */}
          {mode !== "demo" && role === "owner" && (
            <section className="card" aria-label={t("trash.dangerTitle")}>
              <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("trash.dangerTitle")}</h2>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
                {t("trash.dangerSub")}
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                {demoClass === "empty" && (
                  <button type="button" className="btn btn-ghost" onClick={() => setDemoModal("add")}>
                    {t("demo.addButton")}
                  </button>
                )}
                {demoClass === "demo-only" && (
                  <button type="button" className="btn btn-ghost" onClick={() => setDemoModal("readd")}>
                    {t("demo.reAddButton")}
                  </button>
                )}
                <button type="button" className="btn btn-danger" onClick={() => setClearOpen(true)}>
                  {t("trash.clearButton")}
                </button>
              </div>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 8 }}>
                {t("trash.storefrontNote")}
              </p>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                {t("trash.sweepNote")}
              </p>
            </section>
          )}
        </div>

        {demoModal && <DemoDataModal kind={demoModal} onClose={() => setDemoModal(null)} />}

        {clearOpen && (
          <div className="modal-backdrop" onClick={() => !clearBusy && closeClear()} role="dialog" aria-modal="true" aria-label={t("trash.clearTitle")}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{t("trash.clearTitle")}</h2>
              {clearMsg ? (
                <>
                  <p className="modal-sub">{clearMsg}</p>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-primary" onClick={closeClear}>
                      {t("action.close")}
                    </button>
                  </div>
                </>
              ) : clearReplace ? (
                <>
                  <p className="modal-sub">{t("trash.replaceWarning")}</p>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-ghost" disabled={clearBusy} onClick={closeClear}>
                      {t("action.cancel")}
                    </button>
                    <button type="button" className="btn btn-danger" disabled={clearBusy} onClick={() => runClear(true)}>
                      {t("trash.clearButton")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="modal-sub">{t("trash.clearBody")}</p>
                  <label style={{ display: "block", marginBottom: 8 }}>
                    {t("trash.typeLabel")}
                    <input
                      type="text"
                      className="field"
                      style={{ marginTop: 4 }}
                      value={clearTyped}
                      onChange={(e) => setClearTyped(e.target.value)}
                      placeholder="CLEAR"
                      autoFocus
                    />
                  </label>
                  {clearTyped !== "" && clearTyped !== "CLEAR" && (
                    <p style={{ color: "var(--danger, #b3261e)" }}>{t("trash.typeMismatch")}</p>
                  )}
                  <div className="modal-actions">
                    <button type="button" className="btn btn-ghost" disabled={clearBusy} onClick={closeClear}>
                      {t("action.cancel")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={clearBusy || clearTyped !== "CLEAR"}
                      onClick={() => runClear(false)}
                    >
                      {clearBusy ? t("trash.clearing") : t("trash.clearButton")}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

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
