"use client";

/**
 * Phase H · H1 — the Loyalty desk (design §1.5/§5.1).
 *
 * A derived surface over the journal, like every desk in this
 * app: balances, tiers and vintages are folded from entries by
 * lib/loyalty on every render — nothing here is a stored counter.
 * The desk's one write is the expiry release: the due-list is
 * derived, and the owner posts the releases deliberately (there
 * is no scheduler; unposted expiries keep sitting in the
 * liability, honestly labelled, until posted).
 *
 * RBAC: the `loyalty` matrix row (owner/manager full, accountant
 * read, cashier none) — a cashier never reaches this page; the
 * cashier's points tender at the billing desk rides the
 * `billing` row.
 */
import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import PermDenied from "./PermDenied";
import { useLang } from "./LangProvider";
import { fmtDate, fmtPKR } from "@/lib/format";
import { can } from "@/lib/permissions";
import {
  customerLoyalty,
  loyaltyCustomerIds,
  loyaltyProgrammeTotals,
  resolveLoyaltySettings,
  type LoyaltyTier,
} from "@/lib/loyalty";
import type { I18nKey } from "@/lib/i18n";

const TIER_KEY: Record<LoyaltyTier, I18nKey> = {
  standard: "loyalty.tier.standard",
  silver: "loyalty.tier.silver",
  gold: "loyalty.tier.gold",
};

const TIER_BADGE: Record<LoyaltyTier, string> = {
  standard: "badge",
  silver: "badge amber",
  gold: "badge green",
};

export default function LoyaltyView() {
  const { journal, bills, customers, settings, postLoyaltyExpiries } = useStore();
  const { role } = useAuth();
  const { t } = useLang();
  const [postedMsg, setPostedMsg] = useState<number | null>(null);
  const canWrite = can(role, "loyalty", "write");

  const loyaltySt = useMemo(() => resolveLoyaltySettings(settings), [settings]);
  const nowIso = useMemo(() => new Date().toISOString(), [journal]);
  const totals = useMemo(
    () => loyaltyProgrammeTotals(journal, nowIso),
    [journal, nowIso]
  );
  const rows = useMemo(() => {
    const nameOf = new Map(customers.map((c) => [c.id, c.name]));
    return loyaltyCustomerIds(journal)
      .map((cid) => ({
        id: cid,
        name: nameOf.get(cid) ?? cid,
        pos: customerLoyalty(journal, cid, loyaltySt, nowIso),
      }))
      .filter((r) => r.pos.points !== 0 || r.pos.rupees !== 0)
      .sort((a, b) => b.pos.rupees - a.pos.rupees || a.name.localeCompare(b.name));
  }, [journal, customers, loyaltySt, nowIso]);

  if (!can(role, "loyalty", "view")) return <PermDenied />;

  const post = () => {
    const n = postLoyaltyExpiries();
    if (n > 0) setPostedMsg(n);
  };

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("nav.loyalty")}</span>
          <h1 className="h2">{t("loyalty.title")}</h1>
          <p className="lead">{t("loyalty.subtitle")}</p>
        </div>

        {!loyaltySt.enabled && (
          <div className="notice" role="status" style={{ marginBottom: 16 }}>
            {t("loyalty.off")}
          </div>
        )}
        {postedMsg !== null && (
          <div className="notice ok" role="status" style={{ marginBottom: 16 }}>
            {t("loyalty.postedCount")}: {postedMsg}
          </div>
        )}

        <div className="grid-4" style={{ marginBottom: 20 }}>
          <div className="card kpi">
            <div>
              <div className="kpi-label">{t("loyalty.totalLiability")}</div>
              <div className="kpi-value">{fmtPKR(totals.liabilityRs)}</div>
            </div>
          </div>
          <div className="card kpi">
            <div>
              <div className="kpi-label">{t("loyalty.pointsOutstanding")}</div>
              <div className="kpi-value">{totals.pointsOutstanding.toLocaleString()}</div>
            </div>
          </div>
          <div className="card kpi">
            <div>
              <div className="kpi-label">{t("loyalty.customersWithBalance")}</div>
              <div className="kpi-value">{totals.customersWithBalance}</div>
            </div>
          </div>
          <div className="card kpi">
            <div>
              <div className="kpi-label">{t("loyalty.expiringSoon")}</div>
              <div className="kpi-value">{totals.expiringSoonPoints.toLocaleString()}</div>
              {totals.expiringSoonPoints > 0 && (
                <div className="kpi-sub">{fmtPKR(totals.expiringSoonRs)}</div>
              )}
            </div>
          </div>
        </div>

        {totals.expiredUnposted.length > 0 && (
          <div className="card" style={{ marginBottom: 20, padding: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 className="h3" style={{ marginBottom: 4 }}>{t("loyalty.expiredTitle")}</h2>
                <p style={{ color: "var(--muted)", maxWidth: 640 }}>{t("loyalty.expiredSub")}</p>
              </div>
              {canWrite && (
                <button type="button" className="btn" onClick={post}>
                  {t("loyalty.postExpiries")} ({totals.expiredUnpostedPoints.toLocaleString()}{" "}
                  · {fmtPKR(totals.expiredUnpostedRs)})
                </button>
              )}
            </div>
          </div>
        )}

        <div className="card">
          {rows.length === 0 ? (
            <div className="empty">{t("loyalty.empty")}</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("loyalty.col.customer")}</th>
                    <th>{t("loyalty.col.tier")}</th>
                    <th className="num">{t("loyalty.col.points")}</th>
                    <th className="num">{t("loyalty.col.value")}</th>
                    <th>{t("loyalty.col.nextExpiry")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const nextExpiry = r.pos.vintages
                      .filter((v) => v.pointsUnspent > 0)
                      .map((v) => v.expiresOnISO)
                      .sort()[0];
                    return (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.name}</strong>
                          {r.pos.vintages
                            .filter((v) => v.pointsUnspent !== 0)
                            .map((v) => (
                              <div key={v.earnEntryId} style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                                {t("loyalty.vintageLine", {
                                  bill: v.billId
                                    ? (bills.find((b) => b.id === v.billId)?.billNo ?? "—")
                                    : "—",
                                  date: fmtDate(v.earnedOnISO),
                                  expiry: fmtDate(v.expiresOnISO),
                                })}{" "}
                                · {t("loyalty.vintageLeft", { points: v.pointsUnspent })}
                              </div>
                            ))}
                        </td>
                        <td>
                          <span className={TIER_BADGE[r.pos.tier]}>{t(TIER_KEY[r.pos.tier])}</span>
                        </td>
                        <td className="num">{r.pos.points.toLocaleString()}</td>
                        <td className="num">{fmtPKR(r.pos.rupees)}</td>
                        <td>{nextExpiry ? fmtDate(nextExpiry) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
