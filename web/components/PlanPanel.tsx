"use client";

import { useState } from "react";
import { useStore } from "./StoreProvider";
import { useLang } from "./LangProvider";
import {
  deriveActualCounters,
  type ModulesTier,
  type PlanId,
  type PlanView,
} from "@/lib/plans";
import {
  RENEWABLE_PLAN_IDS,
  renewalQuote,
  type BillingPeriod,
} from "@/lib/renewal";
import type {
  PlatformPaymentDoc,
  PlatformPaymentMethod,
} from "@/lib/platform";
import { fmtDate, fmtPKR } from "@/lib/format";
import type { I18nKey } from "@/lib/i18n";

/** Phase G · G2 (design §6.3/§4.2): the "Plan & usage"
 *  OBSERVATION panel — the assignment snapshot, the derived
 *  state, and the hard counters standing next to the actuals
 *  derived from the shop's own collections (the R-G1 tracking
 *  proof: before enforcement is ever flipped for a business,
 *  its owner can watch the counters track the truth). Renders
 *  nothing without a plan view (demo mode, pre-G namespace);
 *  SettingsView mounts it owner-only, matching the rules (the
 *  registry doc itself is readable by every member — the panel
 *  is a management surface, so it lives with the owner).
 *
 *  Phase G · G4 (design §3.5/§8-G4): the panel grows its
 *  ACTION half — the renewal surface. The owner picks a plan
 *  + period, reads the platform's payment instructions
 *  (platformConfig, admin-maintained display data), pays
 *  out-of-band, and submits the record; the console settles
 *  it from its queue. The submission is a platform write
 *  composed by lib/renewal — never a shop journal entry.
 *  Founding shops see no renewal surface (nothing to renew);
 *  Enterprise renewals are console-arranged. */
const TIER_PLAN_KEY: Record<ModulesTier, I18nKey> = {
  core: "plan.name.basic",
  standard: "plan.name.standard",
  advanced: "plan.name.advanced",
};

const METHOD_KEY: Record<PlatformPaymentMethod, I18nKey> = {
  raast: "platform.pay.raast",
  jazzcash: "common.pay.jazzcash",
  easypaisa: "common.pay.easypaisa",
  bank: "common.pay.bank",
  cash: "common.pay.cash",
};

const METHODS: PlatformPaymentMethod[] = [
  "raast", "jazzcash", "easypaisa", "bank", "cash",
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
      {label}:{" "}
      <span style={{ color: "var(--text)", fontWeight: 600 }}>{children}</span>
    </p>
  );
}

export default function PlanPanel() {
  const {
    planView, bills, sales, settings,
    ownPayments, platformConfig, submitRenewalPayment,
  } = useStore();
  const { t } = useLang();
  const [planChoice, setPlanChoice] = useState<PlanId | null>(null);
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [method, setMethod] = useState<PlatformPaymentMethod>("raast");
  const [reference, setReference] = useState("");
  const [ownerNote, setOwnerNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!planView) return null;
  const view: PlanView = planView;
  const snap = view.snapshot;
  const actual = deriveActualCounters(
    bills,
    sales,
    settings.staffEmails,
    { plan: snap },
    new Date().toISOString()
  );
  const fmtD = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : "—";
  const limit = (n: number) => (n > 0 ? String(n) : "∞");

  /* ---- G4: the renewal surface ---- */
  const chosen: PlanId =
    planChoice ??
    (RENEWABLE_PLAN_IDS.includes(snap.planId) ? snap.planId : "standard");
  const quoteRes =
    snap.planId === "founding" || snap.planId === "enterprise"
      ? null
      : renewalQuote({ plan: snap }, chosen, billing, new Date().toISOString());
  const cfg = platformConfig;
  const cfgHasContent =
    !!cfg &&
    [
      cfg.raastNumber, cfg.iban, cfg.bankName,
      cfg.accountTitle, cfg.instructions, cfg.supportContact,
    ].some((v) => v.trim().length > 0);
  const pending = ownPayments.find((p) => p.state === "submitted");

  const submit = async () => {
    setMsg(null);
    if (!reference.trim()) {
      setMsg({ ok: false, text: t("renew.error.referenceRequired") });
      return;
    }
    setBusy(true);
    const res = await submitRenewalPayment({
      planId: chosen,
      billing,
      method,
      reference,
      ownerNote,
    });
    setBusy(false);
    if (res.ok) {
      setReference("");
      setOwnerNote("");
      setMsg({ ok: true, text: t("renew.submit.done") });
    } else if (res.reason === "reference-required") {
      setMsg({ ok: false, text: t("renew.error.referenceRequired") });
    } else if (res.reason === "unavailable" || res.reason === "write-failed") {
      setMsg({ ok: false, text: t("renew.submit.failed") });
    } else {
      setMsg({ ok: false, text: t("renew.error.quoteChanged") });
    }
  };

  const stateBadge = (p: PlatformPaymentDoc) =>
    p.state === "confirmed" ? (
      <span className="badge green">{t("platform.pay.confirmed")}</span>
    ) : p.state === "rejected" ? (
      <span className="badge red">{t("platform.pay.reject")}</span>
    ) : (
      <span className="badge amber">{t("platform.pay.submitted")}</span>
    );

  return (
    <>
      <section className="card" aria-label={t("plan.panel.title")}>
        <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("plan.panel.title")}</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
          {view.enforce ? t("plan.panel.enforceOn") : t("plan.panel.enforceOff")}
        </p>
        <div style={{ display: "grid", gap: 8 }}>
          <Row label={t("plan.panel.plan")}>
            {t(`plan.name.${snap.planId}` as I18nKey)}
          </Row>
          <Row label={t("plan.panel.state")}>
            {t(`plan.state.${view.state}` as I18nKey)}
          </Row>
          <Row label={t("plan.panel.modules")}>
            {t(TIER_PLAN_KEY[snap.modulesTier as ModulesTier])}
          </Row>
          {snap.trialEndsAt ? (
            <Row label={t("plan.panel.trialEnds")}>{fmtD(snap.trialEndsAt)}</Row>
          ) : (
            <Row label={t("plan.panel.period")}>
              {fmtD(snap.periodFrom)} → {fmtD(snap.periodTo)}
            </Row>
          )}
          <Row label={t("plan.panel.invoices")}>
            {t("plan.panel.counter")}: {view.counters?.invoiceCount ?? "—"} ·{" "}
            {t("plan.panel.actual")}: {actual.invoiceCount} / {limit(snap.invoiceLimit)}
          </Row>
          <Row label={t("plan.panel.members")}>
            {t("plan.panel.counter")}: {view.counters?.memberCount ?? "—"} ·{" "}
            {t("plan.panel.actual")}: {actual.memberCount} / {limit(snap.usersLimit)}
          </Row>
        </div>
      </section>

      {snap.planId !== "founding" && (
        <section className="card" aria-label={t("renew.title")}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("renew.title")}</h2>
          {snap.planId === "enterprise" ? (
            <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
              {t("renew.enterpriseNote")}
            </p>
          ) : (
            <>
              <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
                {t("renew.intro")}
              </p>

              <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>
                {t("renew.instructionsTitle")}
              </h3>
              {cfgHasContent && cfg ? (
                <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
                  {cfg.raastNumber.trim() && (
                    <Row label={t("renew.raastNumber")}>{cfg.raastNumber}</Row>
                  )}
                  {cfg.iban.trim() && <Row label={t("renew.iban")}>{cfg.iban}</Row>}
                  {cfg.bankName.trim() && (
                    <Row label={t("renew.bank")}>{cfg.bankName}</Row>
                  )}
                  {cfg.accountTitle.trim() && (
                    <Row label={t("renew.accountTitle")}>{cfg.accountTitle}</Row>
                  )}
                  {cfg.instructions.trim() && (
                    <p
                      style={{
                        color: "var(--text)",
                        fontSize: "0.92rem",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {cfg.instructions}
                    </p>
                  )}
                  {cfg.supportContact.trim() && (
                    <Row label={t("renew.supportLabel")}>{cfg.supportContact}</Row>
                  )}
                </div>
              ) : (
                <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 16 }}>
                  {t("renew.instructionsNone")}
                </p>
              )}

              {pending && (
                <div className="plan-banner" role="status" style={{ margin: "0 0 16px" }}>
                  {t("renew.pay.pending")} — {t(`plan.name.${pending.planId}` as I18nKey)} ·{" "}
                  {fmtPKR(pending.amount)} · {pending.reference}
                </div>
              )}
              {msg && (
                <div
                  className={`plan-banner${msg.ok ? "" : " refusal"}`}
                  role="status"
                  style={{ margin: "0 0 16px", justifyContent: "flex-start" }}
                >
                  {msg.text}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gap: 12,
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  marginBottom: 12,
                }}
              >
                <span className="field">
                  <label>{t("renew.planLabel")}</label>
                  <select
                    value={chosen}
                    onChange={(e) => setPlanChoice(e.target.value as PlanId)}
                  >
                    {RENEWABLE_PLAN_IDS.map((id) => (
                      <option key={id} value={id}>
                        {t(`plan.name.${id}` as I18nKey)}
                      </option>
                    ))}
                  </select>
                </span>
                <span className="field">
                  <label>{t("renew.billingLabel")}</label>
                  <select
                    value={billing}
                    onChange={(e) => setBilling(e.target.value as BillingPeriod)}
                  >
                    <option value="monthly">{t("renew.billing.monthly")}</option>
                    <option value="annual">{t("renew.billing.annual")}</option>
                  </select>
                </span>
                <span className="field">
                  <label>{t("renew.methodLabel")}</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PlatformPaymentMethod)}
                  >
                    {METHODS.map((m) => (
                      <option key={m} value={m}>
                        {t(METHOD_KEY[m])}
                      </option>
                    ))}
                  </select>
                </span>
                <span className="field">
                  <label>{t("renew.referenceLabel")}</label>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder={t("renew.referenceHint")}
                  />
                </span>
                <span className="field">
                  <label>{t("renew.noteLabel")}</label>
                  <input
                    value={ownerNote}
                    onChange={(e) => setOwnerNote(e.target.value)}
                  />
                </span>
              </div>

              {quoteRes?.ok && (
                <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 12 }}>
                  {t("renew.amount")}:{" "}
                  <span style={{ color: "var(--text)", fontWeight: 700 }}>
                    {fmtPKR(quoteRes.quote.amount)}
                  </span>{" "}
                  ·{" "}
                  {t("renew.periodPreview", {
                    from: fmtDate(quoteRes.quote.periodFrom),
                    to: fmtDate(quoteRes.quote.periodTo),
                  })}
                </p>
              )}
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !quoteRes?.ok}
                onClick={() => void submit()}
              >
                {t("renew.submit")}
              </button>

              {ownPayments.length > 0 && (
                <>
                  <h3 style={{ fontSize: "1rem", margin: "24px 0 8px" }}>
                    {t("renew.historyTitle")}
                  </h3>
                  <div style={{ display: "grid", gap: 10 }}>
                    {ownPayments.slice(0, 5).map((p) => (
                      <div key={p.id ?? p.submittedAt} style={{ fontSize: "0.92rem" }}>
                        <p>
                          {stateBadge(p)}{" "}
                          <span style={{ fontWeight: 600 }}>
                            {t(`plan.name.${p.planId}` as I18nKey)}
                          </span>{" "}
                          ·{" "}
                          {t(
                            p.billingPeriod === "annual"
                              ? "renew.billing.annual"
                              : "renew.billing.monthly"
                          )}{" "}
                          · {fmtPKR(p.amount)} · {t(METHOD_KEY[p.method])} ·{" "}
                          {p.reference}
                        </p>
                        <p style={{ color: "var(--muted)" }}>
                          {fmtDate(p.periodFrom)} → {fmtDate(p.periodTo)} ·{" "}
                          {fmtDate(p.submittedAt)}
                          {p.ownerNote ? ` · ${p.ownerNote}` : ""}
                        </p>
                        {p.state === "confirmed" && (
                          <p style={{ color: "var(--muted)" }}>
                            {t("renew.pay.confirmedPeriod", {
                              date: fmtDate(p.periodTo),
                            })}
                          </p>
                        )}
                        {p.state === "rejected" && (
                          <p style={{ color: "var(--muted)" }}>
                            {p.note ? `${p.note} — ` : ""}
                            {t("renew.pay.rejectedHint")}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}
    </>
  );
}
