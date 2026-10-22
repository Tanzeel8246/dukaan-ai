"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import PermDenied from "./PermDenied";
import { can } from "@/lib/permissions";
import { IconTruck } from "./ui";
import { fmt1, fmtNum, fmtPKR, fmtUnit } from "@/lib/format";
import { forecastAll } from "@/lib/selectors";
import type { ForecastRow } from "@/lib/types";

function meterClass(r: ForecastRow): string {
  if (r.status === "critical") return "meter bad";
  if (r.status === "low") return "meter warn";
  return "meter";
}

export default function ForecastView() {
  const { ready, products, sales } = useStore();
  const { role } = useAuth();
  const { t, lang } = useLang();
  void lang;

  const statusBadge = (r: ForecastRow) => {
    if (r.status === "critical")
      return <span className="badge red"><span className="pulse-dot" />{t("fc.status.critical")}</span>;
    if (r.status === "low")
      return <span className="badge amber"><span className="pulse-dot" />{t("fc.status.low")}</span>;
    return <span className="badge green">{t("fc.status.ok")}</span>;
  };

  const data = useMemo(() => {
    if (!ready) return null;
    const rows = forecastAll(products, sales);
    const top = rows.filter((r) => r.avgDaily > 0).slice(0, 10);
    const reorderList = rows.filter((r) => r.suggestedReorder > 0);
    const reorderValue = reorderList.reduce(
      (sum, r) => sum + r.suggestedReorder * r.product.costPrice,
      0
    );
    return { top, reorderList, reorderValue };
  }, [ready, products, sales]);

  if (!can(role, "forecast", "view")) return <PermDenied />;

  if (!data) {
    return (
      <div className="section"><div className="container"><div className="empty">{t("common.loading")}</div></div></div>
    );
  }

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("fc.eyebrow")}</span>
          <h1 className="h2">{t("fc.title")}</h1>
          <p className="lead">
            {t("fc.subtitlePre")}<b>{t("fc.subtitleBold")}</b>{t("fc.subtitlePost")}
          </p>
        </div>

        {data.reorderList.length > 0 && (
          <section className="card" style={{ marginBottom: 24, borderColor: "rgba(217,119,6,0.45)" }} aria-label={t("fc.reorderTitle")}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
              <div className="kpi-icon amber"><IconTruck /></div>
              <div>
                <h2 style={{ fontSize: "1.3rem" }}>{t("fc.reorderTitle")}</h2>
                <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
                  {t("fc.reorderSummary", {
                    n: data.reorderList.length,
                    cost: fmtPKR(data.reorderValue),
                  })}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {data.reorderList.map((r) => (
                <span className="badge amber" key={r.product.id}>
                  {t("fc.orderBadge", {
                    name: r.product.name,
                    qty: fmtNum(r.suggestedReorder),
                    unit: fmtUnit(r.product.unit),
                  })}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="card" aria-label={t("fc.topAria")}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("fc.topTitle")}</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 10 }}>
            {t("fc.topSub")}
          </p>
          <div>
            {data.top.map((r) => {
              const days = r.daysOfStock === Number.POSITIVE_INFINITY ? null : Math.floor(r.daysOfStock);
              const fill = days === null ? 100 : Math.max(3, Math.min(100, (days / 14) * 100));
              return (
                <div className="forecast-row" key={r.product.id}>
                  <div>
                    <div className="p-name">{r.product.name}</div>
                    <div className="ur p-sub">{r.product.urduName}</div>
                  </div>
                  <div className="hide-m">
                    <b>~{t("fc.perDay", { n: fmt1(r.avgDaily) })}</b>
                    <div className="p-sub">{t("fc.avg7")}</div>
                  </div>
                  <div>
                    <div className={meterClass(r)}>
                      <span style={{ width: `${fill}%` }} />
                    </div>
                    <div className="meter-label">
                      {days === null ? t("fc.daysLeftInf") : t("fc.daysLeft", { d: days })}
                    </div>
                  </div>
                  <div>
                    {r.suggestedReorder > 0 ? (
                      <b style={{ color: "var(--amber-text)" }}>
                        {t("fc.order", {
                          qty: fmtNum(r.suggestedReorder),
                          unit: fmtUnit(r.product.unit),
                        })}
                      </b>
                    ) : (
                      <span className="p-sub">{t("fc.noOrder")}</span>
                    )}
                  </div>
                  <div>{statusBadge(r)}</div>
                </div>
              );
            })}
            {data.top.length === 0 && (
              <div className="empty">{t("fc.empty")}</div>
            )}
          </div>
        </section>

        <div className="note-box">
          <b>{t("fc.howTitle")}</b> {t("fc.howBody1")}{" "}
          <Link href="/assistant" style={{ color: "var(--accent-text)", fontWeight: 700 }}>{t("fc.howAssistant")}</Link>{" "}
          {t("fc.howBody2")}
        </div>
      </div>
    </div>
  );
}
