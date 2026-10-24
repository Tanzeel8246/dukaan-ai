"use client";

/**
 * Phase H · WhatsApp — the WhatsApp Marketing desk (design §3).
 *
 * The organisation of marketing, around one discipline: NOTHING
 * here sends anything. A campaign resolves its audience live at
 * launch (consent filter applied), materialises a send queue,
 * and the queue walks the shopkeeper recipient by recipient —
 * each row opens wa.me in the shopkeeper's OWN WhatsApp with the
 * message prefilled, and the log's `sent` state means exactly
 * "the shopkeeper confirms he sent it". No delivery ticks, no
 * read ticks, no automation anywhere in the model or the copy.
 *
 * RBAC: the `whatsapp` matrix row (owner/manager full,
 * accountant read, cashier none). Plan: the module snapshot
 * gates the desk; a lapsed plan pauses launching/sending while
 * every read stays open (invariant 5).
 */
import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import PermDenied from "./PermDenied";
import { useLang } from "./LangProvider";
import { fmtDate } from "@/lib/format";
import { can } from "@/lib/permissions";
import {
  WA_SUGGEST_POINTS_WITHIN_DAYS,
  WA_SUGGEST_UDHAAR_MIN_DAYS,
  resolveWaAudience,
  resolveWaSettings,
  waCampaignProgress,
  waMeLink,
  waModuleAllowed,
  waQueueMessage,
  waQueueStep,
  waSendingAllowed,
  waSuggestedReminders,
  type WaAudienceData,
} from "@/lib/whatsapp";
import type { I18nKey } from "@/lib/i18n";
import type {
  WaAudience,
  WaCampaign,
  WaSend,
  WaTemplateKind,
} from "@/lib/types";

const AUD_KEY: Record<WaAudience["kind"], I18nKey> = {
  all_opted_in: "wa.aud.all",
  tier: "wa.aud.tier",
  udhaar_outstanding: "wa.aud.udhaar",
  points_expiring: "wa.aud.points",
  inactive: "wa.aud.inactive",
  storefront_customers: "wa.aud.storefront",
  service_due: "wa.aud.serviceDue",
};

const AUD_KINDS: WaAudience["kind"][] = [
  "all_opted_in",
  "tier",
  "udhaar_outstanding",
  "points_expiring",
  "inactive",
  "storefront_customers",
  "service_due",
];

const TPL_KIND_KEY: Record<WaTemplateKind, I18nKey> = {
  promo: "wa.tpl.kindPromo",
  reminder: "wa.tpl.kindReminder",
};

const CAMP_STATE_KEY: Record<WaCampaign["state"], I18nKey> = {
  draft: "wa.camp.stateDraft",
  sending: "wa.camp.stateSending",
  done: "wa.camp.stateDone",
};
const CAMP_STATE_BADGE: Record<WaCampaign["state"], string> = {
  draft: "badge",
  sending: "badge amber",
  done: "badge green",
};

const SEND_STATE_KEY: Record<WaSend["state"], I18nKey> = {
  queued: "wa.sendState.queued",
  opened: "wa.sendState.opened",
  sent: "wa.sendState.sent",
  skipped_optout: "wa.sendState.skipped_optout",
  skipped_invalid: "wa.sendState.skipped_invalid",
};
const SEND_STATE_BADGE: Record<WaSend["state"], string> = {
  queued: "badge",
  opened: "badge amber",
  sent: "badge green",
  skipped_optout: "badge red",
  skipped_invalid: "badge red",
};

const STARTERS: { nameKey: I18nKey; bodyKey: I18nKey; kind: WaTemplateKind }[] = [
  { nameKey: "wa.tpl.starterPromo1Name", bodyKey: "wa.tpl.starterPromo1", kind: "promo" },
  { nameKey: "wa.tpl.starterPromo2Name", bodyKey: "wa.tpl.starterPromo2", kind: "promo" },
  { nameKey: "wa.tpl.starterReminder1Name", bodyKey: "wa.tpl.starterReminder1", kind: "reminder" },
  { nameKey: "wa.tpl.starterReminder2Name", bodyKey: "wa.tpl.starterReminder2", kind: "reminder" },
];

export default function WhatsAppView() {
  const {
    customers,
    credits,
    journal,
    bills,
    saleOrders,
    jobs,
    settings,
    waTemplates,
    waCampaigns,
    waSends,
    planView,
    saveWaTemplate,
    deleteWaTemplate,
    createWaCampaign,
    launchWaCampaign,
    advanceWaSend,
    finishWaCampaign,
    setWaServiceIntervalDays,
  } = useStore();
  const { role } = useAuth();
  const { t } = useLang();

  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  // Template editor
  const [tplId, setTplId] = useState<string | null>(null);
  const [tplName, setTplName] = useState("");
  const [tplKind, setTplKind] = useState<WaTemplateKind>("promo");
  const [tplBody, setTplBody] = useState("");
  const [tplDeleteId, setTplDeleteId] = useState<string | null>(null);
  // Campaign form
  const [campName, setCampName] = useState("");
  const [campTplId, setCampTplId] = useState("");
  const [audKind, setAudKind] = useState<WaAudience["kind"]>("all_opted_in");
  const [audParam, setAudParam] = useState("");
  const [audParam2, setAudParam2] = useState("");
  const [audTier, setAudTier] = useState<"silver" | "gold">("gold");
  // Queue
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [skipCursor, setSkipCursor] = useState<string | null>(null);
  // Service interval
  const [intervalInput, setIntervalInput] = useState<string | null>(null);

  const canWrite = can(role, "whatsapp", "write");
  const isOwner = role === "owner";
  const moduleAllowed = waModuleAllowed(planView);
  const sendingAllowed = waSendingAllowed(planView);
  const waSettings = useMemo(() => resolveWaSettings(settings), [settings]);

  const waData: WaAudienceData = useMemo(
    () => ({
      customers,
      credits,
      journal,
      bills,
      saleOrders,
      jobs,
      settings,
      nowISO: new Date().toISOString(),
    }),
    [customers, credits, journal, bills, saleOrders, jobs, settings]
  );

  const suggestions = useMemo(() => waSuggestedReminders(waData), [waData]);

  const numOr = (s: string, dflt: number) => {
    const n = Number(s);
    return Number.isFinite(n) && n > 0 ? n : dflt;
  };

  const formAudience: WaAudience = useMemo(() => {
    switch (audKind) {
      case "udhaar_outstanding":
        return {
          kind: "udhaar_outstanding",
          minRs: numOr(audParam, 1),
          minDays: numOr(audParam2, WA_SUGGEST_UDHAAR_MIN_DAYS),
        };
      case "points_expiring":
        return {
          kind: "points_expiring",
          withinDays: numOr(audParam, WA_SUGGEST_POINTS_WITHIN_DAYS),
        };
      case "inactive":
        return { kind: "inactive", days: numOr(audParam, 60) };
      case "tier":
        return { kind: "tier", tier: audTier };
      default:
        return { kind: audKind };
    }
  }, [audKind, audParam, audParam2, audTier]);

  const reach = useMemo(
    () => (moduleAllowed ? resolveWaAudience(formAudience, waData).length : 0),
    [moduleAllowed, formAudience, waData]
  );

  const activeCampaign = activeCampaignId
    ? waCampaigns.find((c) => c.id === activeCampaignId) ?? null
    : null;
  const activeSends = useMemo(
    () =>
      activeCampaign
        ? waSends
            .filter((s) => s.campaignId === activeCampaign.id)
            .sort((a, b) => a.ts.localeCompare(b.ts) || a.id.localeCompare(b.id))
        : [],
    [activeCampaign, waSends]
  );
  const activeTemplate = activeCampaign
    ? waTemplates.find((x) => x.id === activeCampaign.templateId) ?? null
    : null;
  const queueStep = useMemo(
    () =>
      activeCampaign && activeCampaign.state === "sending"
        ? waQueueStep(activeSends, customers, skipCursor)
        : null,
    [activeCampaign, activeSends, customers, skipCursor]
  );
  const queueMessage =
    queueStep && queueStep.customer && activeTemplate
      ? waQueueMessage(activeTemplate.body, queueStep.customer, waData)
      : "";

  if (!can(role, "whatsapp", "view")) return <PermDenied />;

  const flash = (ok: boolean, text: string) => setNotice({ ok, text });

  const resetTplForm = () => {
    setTplId(null);
    setTplName("");
    setTplKind("promo");
    setTplBody("");
    setTplDeleteId(null);
  };

  const onSaveTemplate = () => {
    const id = saveWaTemplate({
      id: tplId ?? undefined,
      name: tplName,
      kind: tplKind,
      body: tplBody,
    });
    if (id) {
      flash(true, t("wa.notice.templateSaved"));
      resetTplForm();
    }
  };

  const onCreateCampaign = () => {
    const id = createWaCampaign({
      name: campName,
      templateId: campTplId,
      audience: formAudience,
    });
    if (id) {
      flash(true, t("wa.notice.campaignCreated"));
      setCampName("");
    }
  };

  const onLaunch = (id: string) => {
    const r = launchWaCampaign(id);
    if (r.ok) flash(true, t("wa.notice.launched", { count: r.count ?? 0 }));
    else if (r.reason === "plan-module" || r.reason === "plan-state")
      flash(false, t("wa.sendingPaused"));
  };

  const onAdvance = (act: "opened" | "sent") => {
    if (!activeCampaign) return;
    const r = advanceWaSend(activeCampaign.id, act, skipCursor);
    if (!r.ok) {
      if (r.reason === "plan-state") flash(false, t("wa.sendingPaused"));
      return;
    }
    if (r.outcome === "skipped_optout") flash(false, t("wa.queue.skippedOptout"));
    else if (r.outcome === "skipped_invalid")
      flash(false, t("wa.queue.skippedInvalid"));
  };

  const startSuggestion = (kind: "udhaar" | "points" | "service") => {
    if (kind === "udhaar") {
      setAudKind("udhaar_outstanding");
      setAudParam("1");
      setAudParam2(String(WA_SUGGEST_UDHAAR_MIN_DAYS));
    } else if (kind === "points") {
      setAudKind("points_expiring");
      setAudParam(String(WA_SUGGEST_POINTS_WITHIN_DAYS));
    } else {
      setAudKind("service_due");
    }
    setCampTplId(
      (prev) => prev || waTemplates.find((x) => x.kind === "reminder")?.id || ""
    );
  };

  const suggestionRows: {
    key: "udhaar" | "points" | "service";
    title: I18nKey;
    sub: I18nKey;
    count: number;
    days: number;
  }[] = [
    {
      key: "udhaar",
      title: "wa.suggest.udhaarTitle",
      sub: "wa.suggest.udhaarSub",
      count: suggestions.udhaarCount,
      days: WA_SUGGEST_UDHAAR_MIN_DAYS,
    },
    {
      key: "points",
      title: "wa.suggest.pointsTitle",
      sub: "wa.suggest.pointsSub",
      count: suggestions.pointsExpiringCount,
      days: WA_SUGGEST_POINTS_WITHIN_DAYS,
    },
    {
      key: "service",
      title: "wa.suggest.serviceTitle",
      sub: "wa.suggest.serviceSub",
      count: suggestions.serviceDueCount,
      days: suggestions.serviceIntervalDays,
    },
  ];
  const hasSuggestions = suggestionRows.some((s) => s.count > 0);

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("nav.whatsapp")}</span>
          <h1 className="h2">{t("wa.title")}</h1>
          <p className="lead">{t("wa.subtitle")}</p>
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

        <div className="card" style={{ marginBottom: 20, padding: 20 }}>
          <h3 style={{ marginBottom: 6 }}>{t("wa.limits.title")}</h3>
          <p style={{ color: "var(--muted)", maxWidth: 720 }}>{t("wa.limits.body")}</p>
        </div>

        {!moduleAllowed ? (
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ marginBottom: 6 }}>{t("wa.lockedTitle")}</h3>
            <p style={{ color: "var(--muted)" }}>{t("wa.lockedBody")}</p>
          </div>
        ) : (
          <>
            {!sendingAllowed && (
              <div className="notice" role="status" style={{ marginBottom: 16 }}>
                {t("wa.sendingPaused")}
              </div>
            )}

            {hasSuggestions && (
              <div className="card" style={{ marginBottom: 20, padding: 20 }}>
                <h3 style={{ marginBottom: 6 }}>{t("wa.suggest.title")}</h3>
                <p style={{ color: "var(--muted)", marginBottom: 16 }}>{t("wa.suggest.sub")}</p>
                <div style={{ display: "grid", gap: 10 }}>
                  {suggestionRows
                    .filter((s) => s.count > 0)
                    .map((s) => (
                      <div
                        key={s.key}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>
                          <strong>{t(s.title)}</strong>
                          <span style={{ color: "var(--muted)" }}>
                            {" "}
                            · {t(s.sub, { count: s.count, days: s.days })}
                          </span>
                        </span>
                        {canWrite && (
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => startSuggestion(s.key)}
                          >
                            {t("wa.suggest.start")}
                          </button>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="card" style={{ marginBottom: 20, padding: 20 }}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="wa-interval">{t("wa.serviceInterval.label")}</label>
                  <input
                    id="wa-interval"
                    type="number"
                    min={1}
                    disabled={!isOwner}
                    value={intervalInput ?? String(waSettings.serviceIntervalDays)}
                    onChange={(e) => setIntervalInput(e.target.value)}
                  />
                  <span className="hint">{t("wa.serviceInterval.sub")}</span>
                </div>
              </div>
              {isOwner && intervalInput !== null && (
                <button
                  type="button"
                  className="btn"
                  style={{ marginTop: 12 }}
                  onClick={() => {
                    setWaServiceIntervalDays(Number(intervalInput));
                    setIntervalInput(null);
                  }}
                >
                  {t("action.save")}
                </button>
              )}
            </div>

            {/* ---------- templates ---------- */}
            <div className="card" style={{ marginBottom: 20, padding: 20 }}>
              <h3 style={{ marginBottom: 6 }}>{t("wa.tpl.title")}</h3>
              <p style={{ color: "var(--muted)", marginBottom: 16 }}>{t("wa.tpl.sub")}</p>
              {waTemplates.length === 0 ? (
                <div className="empty" style={{ marginBottom: 16 }}>{t("wa.tpl.empty")}</div>
              ) : (
                <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                  {waTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ maxWidth: 640 }}>
                        <strong>{tpl.name}</strong>{" "}
                        <span className="badge">{t(TPL_KIND_KEY[tpl.kind])}</span>
                        <div style={{ color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                          {tpl.body}
                        </div>
                      </div>
                      {canWrite && (
                        <span style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => {
                              setTplId(tpl.id);
                              setTplName(tpl.name);
                              setTplKind(tpl.kind);
                              setTplBody(tpl.body);
                            }}
                          >
                            {t("action.edit")}
                          </button>
                          {tplDeleteId === tpl.id ? (
                            <button
                              type="button"
                              className="btn danger"
                              onClick={() => {
                                deleteWaTemplate(tpl.id);
                                setTplDeleteId(null);
                                flash(true, t("wa.notice.templateDeleted"));
                              }}
                            >
                              {t("wa.tpl.deleteSure")}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => setTplDeleteId(tpl.id)}
                            >
                              {t("wa.tpl.delete")}
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {canWrite && (
                <>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="wa-tpl-name">{t("wa.tpl.name")}</label>
                      <input
                        id="wa-tpl-name"
                        value={tplName}
                        placeholder={t("wa.tpl.namePh")}
                        onChange={(e) => setTplName(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="wa-tpl-kind">{t("wa.tpl.kind")}</label>
                      <select
                        id="wa-tpl-kind"
                        value={tplKind}
                        onChange={(e) => setTplKind(e.target.value as WaTemplateKind)}
                      >
                        <option value="promo">{t("wa.tpl.kindPromo")}</option>
                        <option value="reminder">{t("wa.tpl.kindReminder")}</option>
                      </select>
                    </div>
                  </div>
                  <div className="field" style={{ marginTop: 12 }}>
                    <label htmlFor="wa-tpl-body">{t("wa.tpl.body")}</label>
                    <textarea
                      id="wa-tpl-body"
                      rows={4}
                      value={tplBody}
                      placeholder={t("wa.tpl.bodyPh")}
                      onChange={(e) => setTplBody(e.target.value)}
                    />
                    <span className="hint">{t("wa.tpl.placeholders")}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn"
                      disabled={!tplName.trim() || !tplBody.trim()}
                      onClick={onSaveTemplate}
                    >
                      {t("wa.tpl.save")}
                    </button>
                    {tplId && (
                      <button type="button" className="btn ghost" onClick={resetTplForm}>
                        {t("action.cancel")}
                      </button>
                    )}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ color: "var(--muted)", marginBottom: 8 }}>
                      {t("wa.tpl.starters")}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {STARTERS.map((s) => (
                        <button
                          key={s.nameKey}
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            setTplId(null);
                            setTplName(t(s.nameKey));
                            setTplKind(s.kind);
                            setTplBody(t(s.bodyKey));
                          }}
                        >
                          {t(s.nameKey)} · {t("wa.tpl.use")}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ---------- campaigns ---------- */}
            <div className="card" style={{ marginBottom: 20, padding: 20 }}>
              <h3 style={{ marginBottom: 6 }}>{t("wa.camp.title")}</h3>
              <p style={{ color: "var(--muted)", marginBottom: 16 }}>{t("wa.camp.sub")}</p>
              {canWrite && (
                <>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="wa-camp-name">{t("wa.camp.name")}</label>
                      <input
                        id="wa-camp-name"
                        value={campName}
                        placeholder={t("wa.camp.namePh")}
                        onChange={(e) => setCampName(e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="wa-camp-tpl">{t("wa.camp.template")}</label>
                      <select
                        id="wa-camp-tpl"
                        value={campTplId}
                        onChange={(e) => setCampTplId(e.target.value)}
                      >
                        <option value="">{t("wa.camp.templateNone")}</option>
                        {waTemplates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="wa-camp-aud">{t("wa.camp.audience")}</label>
                      <select
                        id="wa-camp-aud"
                        value={audKind}
                        onChange={(e) => setAudKind(e.target.value as WaAudience["kind"])}
                      >
                        {AUD_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {t(AUD_KEY[k])}
                          </option>
                        ))}
                      </select>
                    </div>
                    {audKind === "udhaar_outstanding" && (
                      <>
                        <div className="field">
                          <label htmlFor="wa-aud-p">{t("wa.aud.minRs")}</label>
                          <input
                            id="wa-aud-p"
                            type="number"
                            min={1}
                            value={audParam}
                            placeholder="1"
                            onChange={(e) => setAudParam(e.target.value)}
                          />
                        </div>
                        <div className="field">
                          <label htmlFor="wa-aud-p2">{t("wa.aud.minDays")}</label>
                          <input
                            id="wa-aud-p2"
                            type="number"
                            min={0}
                            value={audParam2}
                            placeholder="7"
                            onChange={(e) => setAudParam2(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                    {audKind === "points_expiring" && (
                      <div className="field">
                        <label htmlFor="wa-aud-p">{t("wa.aud.withinDays")}</label>
                        <input
                          id="wa-aud-p"
                          type="number"
                          min={1}
                          value={audParam}
                          placeholder="7"
                          onChange={(e) => setAudParam(e.target.value)}
                        />
                      </div>
                    )}
                    {audKind === "inactive" && (
                      <div className="field">
                        <label htmlFor="wa-aud-p">{t("wa.aud.inactiveDays")}</label>
                        <input
                          id="wa-aud-p"
                          type="number"
                          min={1}
                          value={audParam}
                          placeholder="60"
                          onChange={(e) => setAudParam(e.target.value)}
                        />
                      </div>
                    )}
                    {audKind === "tier" && (
                      <div className="field">
                        <label htmlFor="wa-aud-tier">{t("wa.aud.tier")}</label>
                        <select
                          id="wa-aud-tier"
                          value={audTier}
                          onChange={(e) => setAudTier(e.target.value as "silver" | "gold")}
                        >
                          <option value="silver">{t("loyalty.tier.silver")}</option>
                          <option value="gold">{t("loyalty.tier.gold")}</option>
                        </select>
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                      marginTop: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      className="btn"
                      disabled={!campName.trim() || !campTplId}
                      onClick={onCreateCampaign}
                    >
                      {t("wa.camp.create")}
                    </button>
                    <span style={{ color: "var(--muted)" }}>
                      {t("wa.camp.reach", { count: reach })}
                    </span>
                  </div>
                </>
              )}
              {waCampaigns.length === 0 ? (
                <div className="empty" style={{ marginTop: 16 }}>{t("wa.camp.empty")}</div>
              ) : (
                <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                  {waCampaigns.map((c) => {
                    const sends = waSends.filter((s) => s.campaignId === c.id);
                    const prog = waCampaignProgress(sends);
                    return (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <strong>{c.name}</strong>{" "}
                          <span className={CAMP_STATE_BADGE[c.state]}>
                            {t(CAMP_STATE_KEY[c.state])}
                          </span>{" "}
                          <span className="badge">{t(AUD_KEY[c.audience.kind])}</span>
                          <div style={{ color: "var(--muted)" }}>
                            {fmtDate(c.ts)}
                            {c.state !== "draft" &&
                              ` · ${t("wa.camp.progress", {
                                sent: prog.sent,
                                skipped: prog.skippedOptout + prog.skippedInvalid,
                                total: prog.total,
                              })}`}
                          </div>
                        </div>
                        <span style={{ display: "flex", gap: 8 }}>
                          {c.state === "draft" && canWrite && (
                            <button
                              type="button"
                              className="btn"
                              disabled={!sendingAllowed}
                              onClick={() => onLaunch(c.id)}
                            >
                              {t("wa.camp.launch")}
                            </button>
                          )}
                          {c.state === "sending" && (
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => {
                                setActiveCampaignId(c.id);
                                setSkipCursor(null);
                              }}
                            >
                              {t("wa.camp.openQueue")}
                            </button>
                          )}
                          {c.state === "sending" && canWrite && (
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => {
                                finishWaCampaign(c.id);
                                flash(true, t("wa.notice.finished"));
                              }}
                            >
                              {t("wa.camp.finish")}
                            </button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ---------- send queue + log ---------- */}
            {activeCampaign && (
              <div className="card" style={{ padding: 20 }}>
                <h3 style={{ marginBottom: 6 }}>
                  {t("wa.queue.title")} · {activeCampaign.name}
                </h3>
                <p style={{ color: "var(--muted)", marginBottom: 16 }}>{t("wa.queue.sub")}</p>
                {activeCampaign.state !== "sending" || !queueStep ? (
                  <div className="empty">{t("wa.queue.done")}</div>
                ) : (
                  <>
                    <div style={{ marginBottom: 8 }}>
                      <strong>
                        {t("wa.queue.messageLabel", {
                          name: queueStep.customer?.name ?? queueStep.send.customerId,
                        })}
                      </strong>{" "}
                      · {queueStep.send.phone}
                    </div>
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: 12,
                        marginBottom: 12,
                      }}
                    >
                      {queueMessage}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <a
                        className="btn"
                        href={waMeLink(queueStep.send.phone, queueMessage)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => onAdvance("opened")}
                      >
                        {t("wa.queue.send")}
                      </a>
                      <button type="button" className="btn" onClick={() => onAdvance("sent")}>
                        {t("wa.queue.sent")}
                      </button>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => setSkipCursor(queueStep.send.id)}
                      >
                        {t("wa.queue.skip")}
                      </button>
                    </div>
                    <div style={{ color: "var(--muted)", marginTop: 12 }}>
                      {t("wa.queue.remaining", {
                        count: activeSends.filter(
                          (s) => s.state === "queued" || s.state === "opened"
                        ).length,
                      })}
                    </div>
                    <p style={{ color: "var(--muted)", marginTop: 8 }}>
                      {t("wa.queue.honestNote")}
                    </p>
                  </>
                )}
                <h4 style={{ marginTop: 20, marginBottom: 8 }}>{t("wa.queue.logTitle")}</h4>
                {activeSends.length === 0 ? (
                  <div className="empty">{t("wa.queue.logEmpty")}</div>
                ) : (
                  <div className="table-wrap">
                    <table className="table">
                      <tbody>
                        {[...activeSends].reverse().map((s) => (
                          <tr key={s.id}>
                            <td>
                              <strong>
                                {customers.find((c) => c.id === s.customerId)?.name ??
                                  s.customerId}
                              </strong>
                              <div style={{ color: "var(--muted)" }}>{s.phone}</div>
                            </td>
                            <td>
                              <span className={SEND_STATE_BADGE[s.state]}>
                                {t(SEND_STATE_KEY[s.state])}
                              </span>
                            </td>
                            <td>{fmtDate(s.ts)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
