/**
 * Dukaan AI — Phase G · G3: the payment records table shared by
 * the console's confirmation queue and the business detail.
 * Confirm/reject run lib/platform's planners through the
 * platform data layer — the planner's batch (settlement +
 * period extension + event) is the only way a payment settles;
 * there is no button here that writes anything else.
 */
"use client";

import { useState } from "react";
import { useLang } from "./LangProvider";
import { usePlatform } from "./PlatformData";
import { useAuth } from "./AuthProvider";
import {
  consoleBusinessId,
  paymentAmountCheck,
  planConfirmPayment,
  planRejectPayment,
  type PlatformPaymentDoc,
} from "@/lib/platform";
import type { BusinessRegistryDoc } from "@/lib/tenancy";
import { fmtDate, fmtPKR } from "@/lib/format";
import type { I18nKey } from "@/lib/i18n";

const METHOD_KEY: Record<PlatformPaymentDoc["method"], I18nKey> = {
  raast: "platform.pay.raast",
  jazzcash: "common.pay.jazzcash",
  easypaisa: "common.pay.easypaisa",
  bank: "common.pay.bank",
  cash: "common.pay.cash",
};

const STATE_KEY: Record<PlatformPaymentDoc["state"], I18nKey> = {
  submitted: "platform.pay.submitted",
  confirmed: "platform.pay.confirmed",
  rejected: "platform.pay.reject",
};

export default function PlatformPayments({
  payments,
  showBusiness,
}: {
  payments: PlatformPaymentDoc[];
  showBusiness?: boolean;
}) {
  const { t } = useLang();
  const { businesses, runAct } = usePlatform();
  const { user } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<"done" | "failed" | null>(null);

  const businessOf = (p: PlatformPaymentDoc): BusinessRegistryDoc | null =>
    businesses.find((b) => consoleBusinessId(b) === p.businessId) ?? null;

  const settle = async (p: PlatformPaymentDoc, kind: "confirm" | "reject") => {
    if (!user || !p.id) return;
    const now = new Date().toISOString();
    const result =
      kind === "confirm"
        ? (() => {
            const b = businessOf(p);
            return b
              ? planConfirmPayment({ payment: p, business: b, actor: user.uid, now })
              : null;
          })()
        : planRejectPayment({
            payment: p,
            note: noteById[p.id] ?? "",
            actor: user.uid,
            now,
          });
    if (!result || !result.ok) {
      setMsg("failed");
      return;
    }
    setBusyId(p.id);
    const ok = await runAct(result);
    setBusyId(null);
    setMsg(ok ? "done" : "failed");
  };

  if (payments.length === 0) {
    return <p className="plat-empty">{t("platform.payments.empty")}</p>;
  }

  return (
    <div>
      {msg && (
        <div className={`plan-banner${msg === "failed" ? " refusal" : ""}`} role="status">
          {t(msg === "done" ? "platform.act.done" : "platform.act.failed")}
        </div>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {showBusiness && <th>{t("platform.col.business")}</th>}
              <th>{t("common.amount")}</th>
              <th>{t("platform.pay.method")}</th>
              <th>{t("platform.pay.reference")}</th>
              <th>{t("platform.pay.period")}</th>
              <th>{t("platform.pay.submitted")}</th>
              <th>{t("common.status")}</th>
              <th>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                {showBusiness && (
                  <td>{businessOf(p)?.name ?? p.businessId}</td>
                )}
                <td>
                  {fmtPKR(p.amount)}
                  {paymentAmountCheck(p) === "mismatch" && (
                    <div>
                      <span className="badge red">{t("platform.pay.mismatch")}</span>
                    </div>
                  )}
                </td>
                <td>{t(METHOD_KEY[p.method])}</td>
                <td>{p.reference || "—"}</td>
                <td>
                  {fmtDate(p.periodFrom)} → {fmtDate(p.periodTo)}
                </td>
                <td>{fmtDate(p.submittedAt)}</td>
                <td>
                  <span
                    className={`badge ${
                      p.state === "confirmed"
                        ? "green"
                        : p.state === "rejected"
                          ? "red"
                          : "amber"
                    }`}
                  >
                    {t(STATE_KEY[p.state])}
                  </span>
                  {p.state === "rejected" && p.note && (
                    <div className="plat-note">{p.note}</div>
                  )}
                </td>
                <td>
                  {p.state === "submitted" && (
                    <div className="plat-actions">
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={busyId === p.id}
                        onClick={() => void settle(p, "confirm")}
                      >
                        {t("platform.pay.confirm")}
                      </button>
                      <span className="field plat-inline-field">
                        <input
                          value={noteById[p.id ?? ""] ?? ""}
                          onChange={(e) =>
                            setNoteById((s) => ({ ...s, [p.id ?? ""]: e.target.value }))
                          }
                          placeholder={t("platform.pay.note")}
                          aria-label={t("platform.pay.note")}
                        />
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        disabled={busyId === p.id}
                        onClick={() => void settle(p, "reject")}
                      >
                        {t("platform.pay.reject")}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
