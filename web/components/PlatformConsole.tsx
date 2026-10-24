/**
 * Dukaan AI — Phase G · G3: the super admin console root
 * (design §2). Renders only inside /platform's own minimal
 * shell. The gate is the platformAdmins/{uid} doc — everyone
 * else sees a plain not-authorized page: no shop data, no
 * redirect, nothing to enumerate. Everything the console
 * shows comes from the platform data layer's closed list;
 * aggregates are computed client-side from that list alone.
 */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLang } from "./LangProvider";
import { useAuth } from "./AuthProvider";
import { PlatformProvider, usePlatform } from "./PlatformData";
import PlatformDetail from "./PlatformDetail";
import PlatformAdmins from "./PlatformAdmins";
import PlatformPayments from "./PlatformPayments";
import PlatformConfig from "./PlatformConfig";
import {
  consoleBusinessId,
  directoryEntry,
  filterDirectory,
  paymentQueue,
  platformAggregates,
  type DirectoryEntry,
} from "@/lib/platform";
import type { PlanId, PlanState } from "@/lib/plans";
import { pktMonthKey } from "@/lib/tenancy";
import { fmtDate, fmtNum, fmtPKR } from "@/lib/format";
import type { I18nKey } from "@/lib/i18n";

const PLAN_IDS: PlanId[] = [
  "trial", "basic", "standard", "advanced", "enterprise", "founding",
];
const STATES: PlanState[] = ["trial", "active", "grace", "readonly", "suspended", "founding"];

function Denied({ body, signIn }: { body: string; signIn?: boolean }) {
  const { t } = useLang();
  return (
    <div className="plat-wrap">
      <div className="card plat-denied">
        <h1>{t("platform.deniedTitle")}</h1>
        <p>{body}</p>
        {signIn && (
          <Link href="/login" className="btn btn-primary">
            {t("platform.signInPrompt")}
          </Link>
        )}
      </div>
    </div>
  );
}

function AggCard({ label, value, soft }: { label: string; value: string; soft?: boolean }) {
  const { t } = useLang();
  return (
    <div className="card agg-card">
      <span className="agg-label">{label}</span>
      <strong className="agg-value">{value}</strong>
      {soft && <span className="plat-soft">{t("platform.softLabel")}</span>}
    </div>
  );
}

function ConsoleInner() {
  const { t } = useLang();
  const { user, mode } = useAuth();
  const plat = usePlatform();
  const [tab, setTab] = useState<"businesses" | "payments" | "admins" | "config">("businesses");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [planF, setPlanF] = useState("");
  const [stateF, setStateF] = useState("");
  const [statusF, setStatusF] = useState("");
  const [enforceF, setEnforceF] = useState("");

  const nowIso = useMemo(() => new Date().toISOString(), []);
  const entries: DirectoryEntry[] = useMemo(
    () =>
      plat.businesses.map((b) =>
        directoryEntry(
          b,
          plat.countersById[consoleBusinessId(b)] ?? null,
          plat.statsById[consoleBusinessId(b)] ?? null,
          nowIso
        )
      ),
    [plat.businesses, plat.countersById, plat.statsById, nowIso]
  );
  const filtered = useMemo(
    () =>
      filterDirectory(entries, {
        query: q,
        planId: planF as PlanId | "",
        state: stateF as PlanState | "",
        status: statusF as "" | "active" | "suspended",
        enforce: enforceF as "" | "on" | "off",
      }),
    [entries, q, planF, stateF, statusF, enforceF]
  );
  const agg = useMemo(
    () =>
      platformAggregates(
        plat.businesses,
        plat.countersById,
        plat.payments,
        nowIso
      ),
    [plat.businesses, plat.countersById, plat.payments, nowIso]
  );
  const queue = useMemo(() => paymentQueue(plat.payments), [plat.payments]);
  const selected = selectedId
    ? (plat.businesses.find((b) => consoleBusinessId(b) === selectedId) ?? null)
    : null;

  if (plat.gate === "checking") {
    return (
      <div className="splash">
        <div className="splash-mark">D</div>
        <p>{t("common.loading")}</p>
      </div>
    );
  }
  if (mode === "demo") return <Denied body={t("platform.demoBody")} />;
  if (!user) return <Denied body={t("platform.deniedBody")} signIn />;
  if (plat.gate !== "admin") return <Denied body={t("platform.deniedBody")} />;

  const monthKey = pktMonthKey(nowIso);
  const limit = (n: number) => (n > 0 ? fmtNum(n) : "∞");

  return (
    <div className="plat-wrap">
      <header className="plat-head">
        <div>
          <h1>{t("platform.title")}</h1>
        </div>
      </header>

      <div className="agg-grid">
        <AggCard label={t("platform.agg.total")} value={fmtNum(agg.totalBusinesses)} />
        <AggCard label={t("plan.state.active")} value={fmtNum(agg.byState.active + agg.byState.founding)} />
        <AggCard label={t("plan.state.trial")} value={fmtNum(agg.byState.trial)} />
        <AggCard label={t("plan.state.grace")} value={fmtNum(agg.byState.grace)} />
        <AggCard label={t("platform.agg.suspended")} value={fmtNum(agg.suspended)} />
        <AggCard label={t("platform.agg.enforced")} value={fmtNum(agg.enforced)} />
        <AggCard label={t("platform.agg.invoicesMonth")} value={fmtNum(agg.invoicesThisMonth)} soft />
        <AggCard label={t("platform.agg.trialPool")} value={fmtNum(agg.trialPoolUsed)} soft />
        <AggCard
          label={t("platform.agg.revenue")}
          value={fmtPKR(agg.confirmedRevenueByMonth[monthKey] ?? 0)}
        />
        <AggCard label={t("platform.agg.pending")} value={fmtNum(agg.pendingPayments)} />
      </div>

      <nav className="plat-tabs" aria-label={t("platform.title")}>
        <button
          type="button"
          className={`btn btn-sm${tab === "businesses" ? " btn-primary" : ""}`}
          onClick={() => setTab("businesses")}
        >
          {t("platform.tab.businesses")}
        </button>
        <button
          type="button"
          className={`btn btn-sm${tab === "payments" ? " btn-primary" : ""}`}
          onClick={() => setTab("payments")}
        >
          {t("platform.tab.payments")} ({fmtNum(queue.length)})
        </button>
        <button
          type="button"
          className={`btn btn-sm${tab === "admins" ? " btn-primary" : ""}`}
          onClick={() => setTab("admins")}
        >
          {t("platform.tab.admins")}
        </button>
        <button
          type="button"
          className={`btn btn-sm${tab === "config" ? " btn-primary" : ""}`}
          onClick={() => setTab("config")}
        >
          {t("platform.tab.config")}
        </button>
      </nav>

      {tab === "admins" && (
        <section className="card">
          <h2>{t("platform.admins.title")}</h2>
          <PlatformAdmins />
        </section>
      )}

      {tab === "config" && (
        <section className="card">
          <h2>{t("platform.cfg.title")}</h2>
          <PlatformConfig />
        </section>
      )}

      {tab === "payments" && (
        <section className="card">
          <h2>{t("platform.tab.payments")}</h2>
          <PlatformPayments payments={queue} showBusiness />
        </section>
      )}

      {tab === "businesses" &&
        (selected ? (
          <PlatformDetail business={selected} onBack={() => setSelectedId(null)} />
        ) : (
          <section className="card">
            <div className="plat-filters">
              <span className="field plat-search">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("platform.searchPlaceholder")}
                  aria-label={t("platform.searchPlaceholder")}
                />
              </span>
              <span className="field">
                <label>{t("plan.panel.plan")}</label>
                <select value={planF} onChange={(e) => setPlanF(e.target.value)}>
                  <option value="">{t("platform.filter.allPlans")}</option>
                  {PLAN_IDS.map((id) => (
                    <option key={id} value={id}>
                      {t(`plan.name.${id}` as I18nKey)}
                    </option>
                  ))}
                </select>
              </span>
              <span className="field">
                <label>{t("plan.panel.state")}</label>
                <select value={stateF} onChange={(e) => setStateF(e.target.value)}>
                  <option value="">{t("platform.filter.allStates")}</option>
                  {STATES.map((s) => (
                    <option key={s} value={s}>
                      {t(`plan.state.${s}` as I18nKey)}
                    </option>
                  ))}
                </select>
              </span>
              <span className="field">
                <label>{t("common.status")}</label>
                <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
                  <option value="">{t("platform.filter.allStatuses")}</option>
                  <option value="active">{t("plan.state.active")}</option>
                  <option value="suspended">{t("plan.state.suspended")}</option>
                </select>
              </span>
              <span className="field">
                <label>{t("platform.col.enforce")}</label>
                <select value={enforceF} onChange={(e) => setEnforceF(e.target.value)}>
                  <option value="">{t("platform.filter.allEnforce")}</option>
                  <option value="on">{t("platform.filter.enforceOn")}</option>
                  <option value="off">{t("platform.filter.enforceOff")}</option>
                </select>
              </span>
            </div>

            {filtered.length === 0 ? (
              <p className="plat-empty">{t("platform.empty")}</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("platform.col.business")}</th>
                      <th>{t("platform.col.owner")}</th>
                      <th>{t("plan.panel.plan")}</th>
                      <th>{t("plan.panel.state")}</th>
                      <th>{t("platform.col.invoices")}</th>
                      <th>{t("platform.col.members")}</th>
                      <th>{t("platform.col.lastActive")}</th>
                      <th>{t("platform.col.enforce")}</th>
                      <th>{t("common.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => (
                      <tr key={e.businessId}>
                        <td>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setSelectedId(e.businessId)}
                          >
                            {e.name}
                          </button>
                        </td>
                        <td>{e.ownerEmail}</td>
                        <td>{t(`plan.name.${e.planId}` as I18nKey)}</td>
                        <td>{t(`plan.state.${e.state}` as I18nKey)}</td>
                        <td>
                          {e.invoiceCount == null ? "—" : fmtNum(e.invoiceCount)} /{" "}
                          {limit(e.invoiceLimit)}
                        </td>
                        <td>
                          {e.memberCount == null ? "—" : fmtNum(e.memberCount)} /{" "}
                          {limit(e.usersLimit)}
                        </td>
                        <td>
                          {e.lastActiveAt ? fmtDate(e.lastActiveAt) : t("platform.never")}
                        </td>
                        <td>
                          {e.enforce
                            ? t("platform.filter.enforceOn")
                            : t("platform.filter.enforceOff")}
                        </td>
                        <td>
                          <span className={`badge ${e.status === "suspended" ? "red" : "green"}`}>
                            {t(e.status === "suspended" ? "plan.state.suspended" : "plan.state.active")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
    </div>
  );
}

export default function PlatformConsole() {
  return (
    <PlatformProvider>
      <ConsoleInner />
    </PlatformProvider>
  );
}
