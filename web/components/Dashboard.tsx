"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useLang } from "./LangProvider";
import { useAuth } from "./AuthProvider";
import DemoDataModal from "./DemoDataModal";
import {
  IconAlert,
  IconBasket,
  IconBox,
  IconCash,
  IconChart,
  IconReceipt,
  IconTrendDown,
  IconTrendUp,
} from "./ui";
import { fmt1, fmtDate, fmtNum, fmtPKR, fmtUnit, fmtWeekday } from "@/lib/format";
import type { I18nKey } from "@/lib/i18n";
import type { Product } from "@/lib/types";
import {
  daysUntil,
  expiringProducts,
  forecastAll,
  lowStockProducts,
  profitOnDay,
  revenueOnDay,
  stockValue,
  stockValueRetail,
  topSeller,
} from "@/lib/selectors";
import {
  accountsBucketBalance,
  cashBalance,
  expenseTotal,
  expensesThisMonth,
  moneyAccountBalance,
  payablesTotal,
  profitAndLoss,
  receivablesTotal,
} from "@/lib/ledger";

interface Insight {
  tone: "good" | "warn" | "bad";
  text: string;
  linkHref?: string;
  linkLabel?: string;
}

interface ActivityRow {
  id: string;
  kind: "bill" | "expense";
  ts: string;
  label: string;
  sub?: string;
  amount: number; // bills positive, expenses negative
}

interface DayPoint {
  dayOffset: number;
  date: Date;
  revenue: number;
}

/** SVG path for a bar with only its top corners rounded (r = corner radius). */
function barPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + rr}`,
    `Q ${x} ${y} ${x + rr} ${y}`,
    `L ${x + w - rr} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + rr}`,
    `L ${x + w} ${y + h}`,
    "Z",
  ].join(" ");
}

export default function Dashboard() {
  const { ready, products, sales, journal, expenses, bills, accounts, resetDemo, demoClass, planView } = useStore();
  const { t } = useLang();
  const { mode } = useAuth();

  /* Fix Round 2 · FR2: the Dashboard demo button is state-aware.
   * Demo mode keeps the legacy showroom reset. In production an
   * empty business offers "Add demo data"; a demo-only business
   * offers "Re-add demo data"; a business holding real records
   * offers nothing — demo seed never mixes into real books.
   * The modal itself (pre-list, PIN challenge, confirmed summary)
   * is the shared DemoDataModal, also used by Settings. */
  const [demoModal, setDemoModal] = useState<"add" | "readd" | null>(null);

  /** Trend sub-line for a KPI: ▲/▼ + signed % vs a previous period.
   *  prev = 0 → "new" when there is current activity, hidden when both are 0. */
  const trendSub = (
    cur: number,
    prev: number,
    vsKey: "dash.trend.vsYesterday" | "dash.trend.vsLastMonth"
  ): React.ReactNode => {
    if (prev === 0) {
      return cur > 0 ? <div className="kpi-sub">{t("dash.trend.new")}</div> : null;
    }
    const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100);
    const up = cur >= prev;
    return (
      <div
        className="kpi-sub"
        style={{
          color: up ? "var(--accent-text)" : "var(--danger)",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span
          aria-hidden="true"
          style={{ width: 15, height: 15, display: "inline-flex", flexShrink: 0 }}
        >
          {up ? <IconTrendUp /> : <IconTrendDown />}
        </span>
        {t(vsKey, { sign: up ? "+" : "-", pct: Math.abs(pct) })}
      </div>
    );
  };

  const data = useMemo(() => {
    if (!ready) return null;
    const now = new Date();

    /* ---- KPI numbers ---- */
    const todayRevenue = revenueOnDay(sales, 0);
    const yesterdayRevenue = revenueOnDay(sales, 1);
    const todayProfit = profitOnDay(sales, 0, products, bills);
    const yesterdayProfit = profitOnDay(sales, 1, products, bills);
    const pl = profitAndLoss(journal, now);
    const prevMonthRef = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const plPrev = profitAndLoss(journal, prevMonthRef);
    const stockCost = stockValue(products);
    const stockRetail = stockValueRetail(products);
    const low = lowStockProducts(products);
    const expiring = expiringProducts(products, 30);

    /* ---- money snapshot ---- */
    // A2: cash is the sum of the per-account (cash-bucket) balances —
    // identical to the GL cash total by the legacy-resolution
    // identity; the GL selector remains the fallback pre-migration.
    const cash =
      accounts.length > 0
        ? accountsBucketBalance(journal, accounts, "cash")
        : cashBalance(journal);
    const receivable = receivablesTotal(journal);
    const payable = payablesTotal(journal);
    const monthExpenses = expenseTotal(expensesThisMonth(expenses, now));
    /* Fix 2: money accounts sitting below zero — the snapshot
     * names them instead of letting the bucket total hide them.
     * Shell/polish fix A: the figure named here is the account's
     * DISPLAY figure — for a legacy account that is its GL bucket
     * total, exactly as its Finance/Settings card headline shows. */
    const negativeAccounts = accounts
      .filter((a) => !a.archived)
      .map((a) => ({
        name: a.name,
        balance: a.legacyFor
          ? accountsBucketBalance(journal, accounts, a.legacyFor)
          : moneyAccountBalance(journal, a),
      }))
      .filter((a) => a.balance < 0);

    /* ---- last 14 days revenue series (labels computed here, localized) ---- */
    const series: DayPoint[] = [];
    for (let d = 13; d >= 0; d--) {
      series.push({
        dayOffset: d,
        date: new Date(now.getTime() - d * 86400000),
        revenue: revenueOnDay(sales, d),
      });
    }
    const chartTotal = series.reduce((a, s) => a + s.revenue, 0);
    const chartMax = Math.max(...series.map((s) => s.revenue), 1);

    /* ---- top 5 products by units, last 14 days (returns excluded) ---- */
    const byId = new Map(products.map((p) => [p.id, p]));
    const agg = new Map<string, { product: Product; units: number; revenue: number }>();
    for (const s of sales) {
      if (s.kind === "return" || s.dayOffset < 0 || s.dayOffset > 13) continue;
      const p = byId.get(s.productId);
      if (!p) continue;
      const row = agg.get(p.id) ?? { product: p, units: 0, revenue: 0 };
      row.units += s.qty;
      row.revenue += s.total;
      agg.set(p.id, row);
    }
    const top = [...agg.values()]
      .filter((r) => r.units > 0)
      .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
      .slice(0, 5);

    /* ---- recent activity: bills + expenses, newest first ---- */
    const activity: ActivityRow[] = [
      ...bills
        .filter((b) => b.status !== "voided")
        .map<ActivityRow>((b) => ({
          id: `bill-${b.id}`,
          kind: "bill",
          ts: b.ts,
          label: t("dash.activity.bill", { no: b.billNo }),
          sub: b.customerName || undefined,
          amount: b.total,
        })),
      ...expenses.map<ActivityRow>((e) => ({
        id: `exp-${e.id}`,
        kind: "expense",
        ts: e.ts,
        label: t(`common.expenseCat.${e.category}` as I18nKey),
        sub: e.note || undefined,
        amount: -e.amount,
      })),
    ]
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .slice(0, 6);

    /* ---- AI insights (existing logic, localized templates) ---- */
    const insights: Insight[] = [];
    const rows = forecastAll(products, sales);
    const urgent = rows.filter((r) => r.avgDaily > 0 && r.daysOfStock <= 4).slice(0, 2);
    for (const r of urgent) {
      insights.push({
        tone: r.daysOfStock <= 2 ? "bad" : "warn",
        text: t("dash.insight.runOut", {
          name: r.product.name,
          days: Math.floor(r.daysOfStock),
          perDay: fmt1(r.avgDaily),
          qty: fmtNum(r.suggestedReorder),
          unit: fmtUnit(r.product.unit),
        }),
      });
    }
    const topStar = topSeller(products, sales, 7);
    if (topStar) {
      insights.push({
        tone: "good",
        text: t("dash.insight.topSeller", {
          name: topStar.product.name,
          units: fmtNum(topStar.units),
        }),
      });
    }
    const avg7 =
      [1, 2, 3, 4, 5, 6, 7].reduce((a, d) => a + revenueOnDay(sales, d), 0) / 7;
    if (avg7 > 0) {
      const pct = Math.round(((todayRevenue - avg7) / avg7) * 100);
      insights.push({
        tone: pct >= 0 ? "good" : "warn",
        text: t("dash.insight.todayVsAvg", {
          dir: t(pct >= 0 ? "dash.insight.up" : "dash.insight.down"),
          pct: Math.abs(pct),
          avg: fmtPKR(avg7),
        }),
      });
    }
    if (low.length > 0) {
      insights.push({
        tone: "warn",
        text: t("dash.insight.lowCount", { count: fmtNum(low.length) }),
        linkHref: "/forecast",
        linkLabel: t("dash.insight.checkPlan"),
      });
    }

    return {
      now,
      todayRevenue,
      yesterdayRevenue,
      todayProfit,
      yesterdayProfit,
      monthNet: pl.net,
      monthNetPrev: plPrev.net,
      stockCost,
      stockRetail,
      low,
      expiring,
      cash,
      receivable,
      payable,
      monthExpenses,
      negativeAccounts,
      series,
      chartTotal,
      chartMax,
      top,
      activity,
      insights: insights.slice(0, 4),
    };
  }, [ready, products, sales, journal, expenses, bills, accounts, t]);

  if (!data) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty">{t("dash.loading")}</div>
        </div>
      </div>
    );
  }

  /* ---- SVG chart geometry (viewBox 680 x 240) ---- */
  const BASELINE = 202;
  const MAX_BAR_H = 168;
  const SLOT = 680 / data.series.length;
  const BAR_W = 30;

  const moneyStats: { label: string; value: number }[] = [
    { label: t("dash.money.cash"), value: data.cash },
    { label: t("dash.money.udhaar"), value: data.receivable },
    { label: t("dash.money.payable"), value: data.payable },
    { label: t("dash.money.expenses"), value: data.monthExpenses },
  ];

  return (
    <div className="section-sm">
      <div className="container">
        {/* ---------- header ---------- */}
        <div className="section-head">
          <span className="eyebrow">{t("dash.eyebrow")}</span>
          <h1 className="h2">{t("dash.greeting")}</h1>
          <p style={{ color: "var(--muted)", fontWeight: 600, marginBottom: 6 }}>
            {fmtWeekday(data.now)} · {fmtDate(data.now)}
          </p>
          <p className="lead">{t("dash.lead")}</p>
          {/* Phase G · G2: the live invoice counter, next to the
              plan it counts against (the trial pool in trial;
              this month's count otherwise). Dark without a plan
              view. */}
          {planView?.counters && (
            <p className="plan-chip">
              {planView.snapshot.planId === "trial"
                ? t("plan.trialPool", {
                    used: planView.counters.invoiceCount,
                    limit: planView.snapshot.invoiceLimit,
                  })
                : `${t("plan.thisMonth")}: ${planView.counters.invoiceCount}${
                    planView.snapshot.invoiceLimit > 0
                      ? ` / ${planView.snapshot.invoiceLimit}`
                      : ""
                  }`}
            </p>
          )}
        </div>

        {/* ---------- KPI row ---------- */}
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card kpi">
            <div className="kpi-icon green">
              <IconCash />
            </div>
            <div>
              <div className="kpi-label">{t("dash.kpi.todaySales")}</div>
              <div className="kpi-value">{fmtPKR(data.todayRevenue)}</div>
              {trendSub(data.todayRevenue, data.yesterdayRevenue, "dash.trend.vsYesterday")}
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon green">
              <IconChart />
            </div>
            <div>
              <div className="kpi-label">{t("dash.kpi.todayProfit")}</div>
              <div className="kpi-value">{fmtPKR(data.todayProfit)}</div>
              {trendSub(data.todayProfit, data.yesterdayProfit, "dash.trend.vsYesterday")}
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon brown">
              <IconChart />
            </div>
            <div>
              <div className="kpi-label">{t("dash.kpi.monthProfit")}</div>
              <div
                className="kpi-value"
                style={{ color: data.monthNet < 0 ? "var(--danger)" : undefined }}
              >
                {fmtPKR(data.monthNet)}
              </div>
              {trendSub(data.monthNet, data.monthNetPrev, "dash.trend.vsLastMonth")}
            </div>
          </div>
          <div className="card kpi">
            <div className="kpi-icon brown">
              <IconBox />
            </div>
            <div>
              <div className="kpi-label">{t("dash.kpi.stockValue")}</div>
              <div className="kpi-value">{fmtPKR(data.stockCost)}</div>
              <div className="kpi-sub">
                {t("dash.kpi.stockSub", {
                  retail: fmtPKR(data.stockRetail),
                  count: fmtNum(products.length),
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ---------- money snapshot ---------- */}
        <section
          className="card"
          aria-label={t("dash.money.title")}
          style={{ marginBottom: 24 }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: 14 }}>{t("dash.money.title")}</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 20,
            }}
          >
            {moneyStats.map((s) => (
              <div key={s.label}>
                <div className="kpi-label">{s.label}</div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.45rem",
                    fontWeight: 800,
                    lineHeight: 1.3,
                  }}
                >
                  {fmtPKR(s.value)}
                </div>
              </div>
            ))}
          </div>
          {data.negativeAccounts.length > 0 && (
            <div style={{ marginTop: 14, display: "grid", gap: 4 }}>
              {data.negativeAccounts.map((a) => (
                <div
                  key={a.name}
                  style={{ color: "var(--danger)", fontSize: "0.9rem", fontWeight: 600 }}
                >
                  {/* Fix E: one interpolated string — separate JSX
                      text/expression fragments lost their spaces in
                      the Urdu rendering and glued the line together. */}
                  {t("fin.acct.negativeLine", {
                    label: t("fin.acct.negativeShort"),
                    name: a.name,
                    amount: fmtPKR(a.balance),
                  })}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ---------- chart + alerts ---------- */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <section className="card" aria-label={t("dash.chart.title")}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("dash.chart.title")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 8 }}>
              {t("dash.chart.caption")}
            </p>
            {data.chartTotal === 0 ? (
              <p style={{ color: "var(--muted)", padding: "32px 0" }}>
                {t("dash.chart.noData")}
              </p>
            ) : (
              <svg
                viewBox="0 0 680 240"
                role="img"
                aria-label={t("dash.chart.aria", { total: fmtPKR(data.chartTotal) })}
                style={{ width: "100%", height: "auto", display: "block" }}
              >
                {[0.25, 0.5, 0.75, 1].map((f) => (
                  <line
                    key={f}
                    x1={0}
                    x2={680}
                    y1={BASELINE - f * MAX_BAR_H}
                    y2={BASELINE - f * MAX_BAR_H}
                    stroke="var(--line)"
                    strokeWidth={1}
                    strokeDasharray="3 5"
                  />
                ))}
                <line
                  x1={0}
                  x2={680}
                  y1={BASELINE}
                  y2={BASELINE}
                  stroke="var(--line)"
                  strokeWidth={1.5}
                />
                {data.series.map((s, i) => {
                  const h =
                    s.revenue > 0
                      ? Math.max(3, (s.revenue / data.chartMax) * MAX_BAR_H)
                      : 0;
                  const x = i * SLOT + (SLOT - BAR_W) / 2;
                  const isToday = s.dayOffset === 0;
                  return (
                    <g key={s.dayOffset}>
                      {h > 0 && (
                        <path
                          d={barPath(x, BASELINE - h, BAR_W, h, 4)}
                          fill={isToday ? "var(--amber)" : "var(--accent)"}
                          opacity={isToday ? 1 : 0.88}
                        >
                          <title>{fmtPKR(s.revenue)}</title>
                        </path>
                      )}
                      <text
                        x={i * SLOT + SLOT / 2}
                        y={226}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={isToday ? 700 : 600}
                        fill="var(--muted)"
                      >
                        {isToday ? t("common.today") : fmtWeekday(s.date)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </section>

          <section className="card" aria-label={t("dash.alerts.title")}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 14 }}>
              {t("dash.alerts.title")}
            </h2>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <h3 style={{ fontSize: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  className="kpi-icon amber"
                  style={{ width: 32, height: 32, borderRadius: 10 }}
                >
                  <IconAlert />
                </span>
                {t("dash.alerts.lowStock")}
              </h3>
              <span className="badge amber">{fmtNum(data.low.length)}</span>
            </div>
            {data.low.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
                {t("dash.alerts.lowEmpty")}
              </p>
            ) : (
              <ul style={{ listStyle: "none", display: "grid", gap: 10 }}>
                {data.low.slice(0, 5).map((p) => (
                  <li
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    {p.stockQty <= 0 ? (
                      <span className="badge red">{t("dash.alerts.outOfStock")}</span>
                    ) : (
                      <span className="badge amber">
                        {fmtNum(p.stockQty)} {fmtUnit(p.unit)} {t("dash.alerts.left")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <div style={{ marginTop: 12 }}>
              <Link href="/inventory" className="btn btn-ghost btn-sm">
                {t("action.viewAll")}
              </Link>
            </div>

            <hr
              style={{ border: "none", borderTop: "1px solid var(--line)", margin: "20px 0" }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 10,
              }}
            >
              <h3 style={{ fontSize: "1rem" }}>{t("dash.alerts.expiring")}</h3>
              <span className="badge amber">{fmtNum(data.expiring.length)}</span>
            </div>
            {data.expiring.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
                {t("dash.alerts.expEmpty")}
              </p>
            ) : (
              <ul style={{ listStyle: "none", display: "grid", gap: 10 }}>
                {data.expiring.slice(0, 5).map((p) => {
                  const days = p.expiryDate ? daysUntil(p.expiryDate) : 0;
                  const expired = days <= 0;
                  return (
                    <li
                      key={p.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span className={`badge ${expired || days <= 7 ? "red" : "amber"}`}>
                        {expired
                          ? t("dash.alerts.expired")
                          : t("dash.alerts.expiresIn", { days })}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            <div style={{ marginTop: 12 }}>
              <Link href="/forecast" className="btn btn-ghost btn-sm">
                {t("nav.forecast")}
              </Link>
            </div>
          </section>
        </div>

        {/* ---------- top products + recent activity ---------- */}
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <section className="card" aria-label={t("dash.top.title")}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("dash.top.title")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 12 }}>
              {t("dash.top.caption")}
            </p>
            {data.top.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>{t("dash.top.empty")}</p>
            ) : (
              <ol style={{ listStyle: "none", display: "grid" }}>
                {data.top.map((r, i) => (
                  <li
                    key={r.product.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom:
                        i < data.top.length - 1 ? "1px solid var(--line)" : "none",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--muted)",
                        fontWeight: 800,
                        width: 22,
                        flexShrink: 0,
                      }}
                    >
                      {fmtNum(i + 1)}
                    </span>
                    <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
                      {r.product.name}
                    </span>
                    <span style={{ color: "var(--muted)", fontSize: "0.88rem" }}>
                      {t("dash.top.units", { n: fmtNum(r.units) })}
                    </span>
                    <span style={{ fontWeight: 700 }}>{fmtPKR(r.revenue)}</span>
                  </li>
                ))}
              </ol>
            )}
            <div style={{ marginTop: 14 }}>
              <Link href="/inventory" className="btn btn-ghost btn-sm">
                {t("action.viewAll")}
              </Link>
            </div>
          </section>

          <section className="card" aria-label={t("dash.activity.title")}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: 12 }}>
              {t("dash.activity.title")}
            </h2>
            {data.activity.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>{t("dash.activity.empty")}</p>
            ) : (
              <ul style={{ listStyle: "none", display: "grid" }}>
                {data.activity.map((a, i) => (
                  <li
                    key={a.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom:
                        i < data.activity.length - 1 ? "1px solid var(--line)" : "none",
                    }}
                  >
                    <span
                      className={`kpi-icon ${a.kind === "bill" ? "green" : "amber"}`}
                      style={{ width: 40, height: 40, borderRadius: 12 }}
                    >
                      {a.kind === "bill" ? <IconReceipt /> : <IconCash />}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>
                        {a.label}
                        {a.sub ? (
                          <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                            {" "}
                            · {a.sub}
                          </span>
                        ) : null}
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: "0.84rem" }}>
                        {fmtDate(a.ts)}
                      </div>
                    </div>
                    <span
                      style={{
                        fontWeight: 700,
                        color: a.amount >= 0 ? "var(--accent-text)" : "var(--danger)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.amount >= 0
                        ? `+${fmtPKR(a.amount)}`
                        : `-${fmtPKR(Math.abs(a.amount))}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ---------- AI insights ---------- */}
        <section
          className="card"
          aria-label={t("dash.insights.title")}
          style={{ marginBottom: 24 }}
        >
          <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>
            {t("dash.insights.title")}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 12 }}>
            {t("dash.insights.caption")}
          </p>
          <div style={{ display: "grid", gap: 12 }}>
            {data.insights.length === 0 && (
              <p style={{ color: "var(--muted)" }}>{t("dash.insights.empty")}</p>
            )}
            {data.insights.map((ins, i) => (
              <div className="card insight" key={i} style={{ padding: 18 }}>
                <span className={`dot ${ins.tone}`} aria-hidden="true" />
                <p>
                  {ins.text}
                  {ins.linkHref && ins.linkLabel ? (
                    <>
                      {" "}
                      <Link
                        href={ins.linkHref}
                        style={{ color: "var(--accent-text)", fontWeight: 700 }}
                      >
                        {ins.linkLabel} →
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- footer actions ---------- */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {mode === "demo" ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetDemo}>
              {t("dash.resetDemo")}
            </button>
          ) : demoClass === "empty" ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDemoModal("add")}>
              {t("demo.addButton")}
            </button>
          ) : demoClass === "demo-only" ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDemoModal("readd")}>
              {t("demo.reAddButton")}
            </button>
          ) : null}
          <Link href="/assistant" className="btn btn-primary btn-sm">
            <IconBasket /> {t("dash.askAi")}
          </Link>
        </div>

        {demoModal && <DemoDataModal kind={demoModal} onClose={() => setDemoModal(null)} />}
      </div>
    </div>
  );
}
