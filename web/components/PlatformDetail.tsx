/**
 * Dukaan AI — Phase G · G3: one business's platform file
 * (design §2.2) — registry, current assignment, counters,
 * soft telemetry, plan history, payments, the event timeline,
 * and the admin acts. Every act is a lib/platform planner run
 * through the data layer: the form composes intent, the
 * planner composes the batch (act + its event), the executor
 * applies it. No control here writes a field directly.
 */
"use client";

import { useMemo, useState } from "react";
import { useLang } from "./LangProvider";
import { usePlatform } from "./PlatformData";
import { useAuth } from "./AuthProvider";
import PlatformPayments from "./PlatformPayments";
import {
  countersAgree,
  consoleBusinessId,
  planAssignPlan,
  planExtendPeriod,
  planSetEnforce,
  planSetStatus,
  snapshotHistory,
  type ActResult,
  type PlatformActuals,
} from "@/lib/platform";
import { PLAN_CATALOGUE, derivePlanState, type PlanId } from "@/lib/plans";
import type { BusinessRegistryDoc } from "@/lib/tenancy";
import { fmtDate, fmtNum, fmtPKR } from "@/lib/format";
import type { I18nKey } from "@/lib/i18n";

const PLAN_IDS: PlanId[] = [
  "trial", "basic", "standard", "advanced", "enterprise", "founding",
];

/** A date-picker day becomes the END of that day in PKT — the
 *  business calendar every derivation in the platform uses. */
function pktDayEnd(dateStr: string): string {
  return `${dateStr}T18:59:59.999Z`;
}

function KV({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="plat-kv">
      <span>{label}</span>
      <strong>{children}</strong>
    </p>
  );
}

export default function PlatformDetail({
  business,
  onBack,
}: {
  business: BusinessRegistryDoc;
  onBack: () => void;
}) {
  const { t } = useLang();
  const { user } = useAuth();
  const {
    countersById,
    statsById,
    payments,
    eventsByBusiness,
    membersJoinedById,
    runAct,
  } = usePlatform();

  const bid = consoleBusinessId(business);
  const counters = countersById[bid] ?? null;
  const stats = statsById[bid] ?? null;
  const events = eventsByBusiness[bid] ?? [];
  const bizPayments = useMemo(
    () => payments.filter((p) => p.businessId === bid),
    [payments, bid]
  );
  const state = derivePlanState(business, new Date().toISOString());
  const snap = business.plan;

  const actual: PlatformActuals = {
    invoicesReported: stats?.docCounts.bills ?? null,
    membersJoined: membersJoinedById[bid] ?? null,
  };
  const agree = countersAgree(counters, actual);

  const [msg, setMsg] = useState<"done" | "failed" | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async (result: ActResult) => {
    if (!result.ok) {
      setMsg("failed");
      return;
    }
    setBusy(true);
    const ok = await runAct(result);
    setBusy(false);
    setMsg(ok ? "done" : "failed");
  };
  const now = () => new Date().toISOString();

  /* assign form */
  const [planId, setPlanId] = useState<PlanId>(snap.planId);
  const [periodEnd, setPeriodEnd] = useState("");
  const [usersLimit, setUsersLimit] = useState("");
  const [invoicesLimit, setInvoicesLimit] = useState("");
  const [compTrial, setCompTrial] = useState(false);
  /* extend form */
  const [newEnd, setNewEnd] = useState("");
  /* suspend form */
  const [reason, setReason] = useState("");
  /* enforce form */
  const [confirmDisagree, setConfirmDisagree] = useState(false);

  const history = snapshotHistory(events);
  const limit = (n: number) => (n > 0 ? fmtNum(n) : "∞");

  return (
    <div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
        ← {t("platform.back")}
      </button>
      <h2 className="plat-detail-name">{business.name}</h2>
      {msg && (
        <div className={`plan-banner${msg === "failed" ? " refusal" : ""}`} role="status">
          {t(msg === "done" ? "platform.act.done" : "platform.act.failed")}
        </div>
      )}

      <div className="plat-grid">
        <section className="card">
          <h3>{t("platform.detail.registry")}</h3>
          <KV label={t("platform.detail.businessId")}>{bid}</KV>
          <KV label={t("platform.col.owner")}>{business.ownerEmail}</KV>
          <KV label={t("common.phone")}>{business.phone || "—"}</KV>
          <KV label={t("platform.detail.city")}>{business.city || "—"}</KV>
          <KV label={t("platform.detail.created")}>{fmtDate(business.createdAt)}</KV>
          <KV label={t("common.status")}>
            <span className={`badge ${business.status === "suspended" ? "red" : "green"}`}>
              {t(business.status === "suspended" ? "plan.state.suspended" : "plan.state.active")}
            </span>
          </KV>
        </section>

        <section className="card">
          <h3>{t("platform.detail.snapshot")}</h3>
          <KV label={t("plan.panel.plan")}>{t(`plan.name.${snap.planId}` as I18nKey)}</KV>
          <KV label={t("plan.panel.state")}>{t(`plan.state.${state}` as I18nKey)}</KV>
          <KV label={t("plan.panel.modules")}>{snap.modulesTier}</KV>
          <KV label={t("plan.panel.period")}>
            {fmtDate(snap.periodFrom)} → {snap.periodTo ? fmtDate(snap.periodTo) : "—"}
          </KV>
          {snap.trialEndsAt && (
            <KV label={t("plan.panel.trialEnds")}>{fmtDate(snap.trialEndsAt)}</KV>
          )}
          <KV label={t("platform.detail.assignedBy")}>
            {snap.assignedBy} · {fmtDate(snap.assignedAt)}
          </KV>
        </section>

        <section className="card">
          <h3>{t("platform.detail.counters")}</h3>
          <KV label={t("plan.panel.invoices")}>
            {counters ? fmtNum(counters.invoiceCount) : "—"} / {limit(snap.invoiceLimit)}
            {counters ? ` (${counters.invoiceMonth})` : ""}
          </KV>
          <KV label={t("plan.panel.members")}>
            {counters ? fmtNum(counters.memberCount) : "—"} / {limit(snap.usersLimit)}
          </KV>
          <h3 className="plat-subhead">{t("platform.detail.telemetry")}</h3>
          <KV label={t("platform.col.lastActive")}>
            {stats?.lastActiveAt ? fmtDate(stats.lastActiveAt) : t("platform.never")}
          </KV>
          <KV label={t("platform.detail.membersJoined")}>
            {actual.membersJoined ?? "—"}
          </KV>
          <p className="plat-soft">{t("platform.softLabel")}</p>
        </section>
      </div>

      <div className="plat-grid">
        <section className="card">
          <h3>{t("platform.act.assignTitle")}</h3>
          <div className="field">
            <label>{t("plan.panel.plan")}</label>
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value as PlanId)}
            >
              {PLAN_IDS.map((id) => (
                <option key={id} value={id}>
                  {t(`plan.name.${id}` as I18nKey)}
                  {PLAN_CATALOGUE[id].priceMonthlyPKR != null
                    ? ` — ${fmtPKR(PLAN_CATALOGUE[id].priceMonthlyPKR ?? 0)}`
                    : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>{t("platform.act.periodEnd")}</label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t("platform.act.usersLimit")}</label>
            <input
              type="number"
              min={0}
              value={usersLimit}
              onChange={(e) => setUsersLimit(e.target.value)}
            />
          </div>
          <div className="field">
            <label>{t("platform.act.invoicesLimit")}</label>
            <input
              type="number"
              min={0}
              value={invoicesLimit}
              onChange={(e) => setInvoicesLimit(e.target.value)}
            />
          </div>
          {planId === "trial" && (
            <label className="plat-check">
              <input
                type="checkbox"
                checked={compTrial}
                onChange={(e) => setCompTrial(e.target.checked)}
              />
              {t("platform.act.compTrial")}
            </label>
          )}
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !user}
            onClick={() =>
              void run(
                planAssignPlan({
                  businessId: bid,
                  current: business,
                  planId,
                  periodTo: periodEnd ? pktDayEnd(periodEnd) : null,
                  usersLimit: usersLimit === "" ? undefined : Number(usersLimit),
                  invoiceLimit:
                    invoicesLimit === "" ? undefined : Number(invoicesLimit),
                  compTrial,
                  actor: user?.uid ?? "",
                  now: now(),
                })
              )
            }
          >
            {t("platform.act.assign")}
          </button>
        </section>

        <section className="card">
          <h3>{t("platform.act.extendTitle")}</h3>
          <div className="field">
            <label>{t("platform.act.newEnd")}</label>
            <input
              type="date"
              value={newEnd}
              onChange={(e) => setNewEnd(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn"
            disabled={busy || !user || !newEnd}
            onClick={() =>
              void run(
                planExtendPeriod({
                  businessId: bid,
                  current: business,
                  newEnd: pktDayEnd(newEnd),
                  actor: user?.uid ?? "",
                  now: now(),
                })
              )
            }
          >
            {t("platform.act.extend")}
          </button>

          <h3 className="plat-subhead">{t("platform.act.suspendTitle")}</h3>
          {business.status === "active" ? (
            <>
              <div className="field">
                <label>{t("platform.act.reason")}</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-danger"
                disabled={busy || !user}
                onClick={() =>
                  void run(
                    planSetStatus({
                      businessId: bid,
                      current: business,
                      status: "suspended",
                      reason,
                      actor: user?.uid ?? "",
                      now: now(),
                    })
                  )
                }
              >
                {t("platform.act.suspend")}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !user}
              onClick={() =>
                void run(
                  planSetStatus({
                    businessId: bid,
                    current: business,
                    status: "active",
                    actor: user?.uid ?? "",
                    now: now(),
                  })
                )
              }
            >
              {t("platform.act.activate")}
            </button>
          )}
        </section>

        <section className="card">
          <h3>{t("platform.act.enforceTitle")}</h3>
          <KV label={t("platform.col.enforce")}>
            {business.enforce ? t("platform.filter.enforceOn") : t("platform.filter.enforceOff")}
          </KV>
          <h4 className="plat-subhead">{t("platform.act.counterVs")}</h4>
          <KV label={t("plan.panel.invoices")}>
            {t("platform.detail.counters")}: {counters ? fmtNum(counters.invoiceCount) : "—"} ·{" "}
            {t("platform.detail.telemetry")}: {actual.invoicesReported ?? "—"}
          </KV>
          <KV label={t("plan.panel.members")}>
            {t("platform.detail.counters")}: {counters ? fmtNum(counters.memberCount) : "—"} ·{" "}
            {t("platform.detail.membersJoined")}: {actual.membersJoined ?? "—"}
          </KV>
          {!business.enforce && !agree && (
            <>
              <p className="plat-warn">{t("platform.act.disagree")}</p>
              <label className="plat-check">
                <input
                  type="checkbox"
                  checked={confirmDisagree}
                  onChange={(e) => setConfirmDisagree(e.target.checked)}
                />
                {t("platform.act.confirmDisagree")}
              </label>
            </>
          )}
          <button
            type="button"
            className={`btn ${business.enforce ? "" : "btn-primary"}`}
            disabled={busy || !user}
            onClick={() =>
              void run(
                planSetEnforce({
                  businessId: bid,
                  current: business,
                  enforce: !business.enforce,
                  counters,
                  actual,
                  confirmed: confirmDisagree,
                  actor: user?.uid ?? "",
                  now: now(),
                })
              )
            }
          >
            {business.enforce
              ? t("platform.act.enforceOff")
              : t("platform.act.enforceOn")}
          </button>
        </section>
      </div>

      <section className="card">
        <h3>{t("platform.detail.history")}</h3>
        {history.length === 0 ? (
          <p className="plat-empty">{t("platform.history.empty")}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("common.date")}</th>
                  <th>{t("plan.panel.plan")}</th>
                  <th>{t("plan.panel.period")}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i}>
                    <td>{fmtDate(h.at)}</td>
                    <td>{h.planId ? t(`plan.name.${h.planId}` as I18nKey) : "—"}</td>
                    <td>→ {h.periodTo ? fmtDate(h.periodTo) : h.trialEndsAt ? fmtDate(h.trialEndsAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h3>{t("platform.detail.payments")}</h3>
        <PlatformPayments payments={bizPayments} />
      </section>

      <section className="card">
        <h3>{t("platform.detail.events")}</h3>
        {events.length === 0 ? (
          <p className="plat-empty">{t("platform.events.empty")}</p>
        ) : (
          <ul className="plat-timeline">
            {events.map((e, i) => (
              <li key={i}>
                <span className="plat-ev-at">{fmtDate(e.at)}</span>
                <span className="plat-ev-kind">{e.kind}</span>
                <span className="plat-ev-detail">
                  {Object.entries(e.detail ?? {})
                    .filter(([, v]) => v == null || typeof v !== "object")
                    .map(([k, v]) => `${k}: ${String(v)}`)
                    .join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
