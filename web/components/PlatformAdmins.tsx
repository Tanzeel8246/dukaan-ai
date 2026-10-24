/**
 * Dukaan AI — Phase G · G3: platform admin management.
 * Grant/revoke run lib/platform's planners (self-revoke and
 * last-admin revocation are refused by the planner itself,
 * not just hidden here); the first admin is seeded by hand in
 * the Firebase console — there is no self-grant anywhere.
 */
"use client";

import { useState } from "react";
import { useLang } from "./LangProvider";
import { usePlatform } from "./PlatformData";
import { useAuth } from "./AuthProvider";
import { planGrantAdmin, planRevokeAdmin, type ActResult } from "@/lib/platform";
import { fmtDate } from "@/lib/format";

export default function PlatformAdmins() {
  const { t } = useLang();
  const { user } = useAuth();
  const { admins, runAct } = usePlatform();
  const [uid, setUid] = useState("");
  const [email, setEmail] = useState("");
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
              <th>{t("platform.admins.email")}</th>
              <th>{t("platform.detail.businessId")}</th>
              <th>{t("platform.admins.addedBy")}</th>
              <th>{t("common.date")}</th>
              <th>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr key={a.uid ?? a.email}>
                <td>
                  {a.email}
                  {user && a.uid === user.uid && (
                    <span className="badge green plat-you">{t("platform.admins.you")}</span>
                  )}
                </td>
                <td className="plat-uid">{a.uid ?? ""}</td>
                <td>{a.addedBy}</td>
                <td>{fmtDate(a.addedAt)}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    disabled={busy || !user || !a.uid || (user && a.uid === user.uid)}
                    title={
                      user && a.uid === user.uid
                        ? t("platform.admins.selfNote")
                        : admins.length <= 1
                          ? t("platform.admins.lastNote")
                          : undefined
                    }
                    onClick={() =>
                      void run(
                        planRevokeAdmin({
                          uid: a.uid ?? "",
                          adminUids: admins
                            .map((x) => x.uid)
                            .filter((u): u is string => !!u),
                          actor: user?.uid ?? "",
                          now: now(),
                        })
                      )
                    }
                  >
                    {t("platform.admins.revoke")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="plat-soft">
        {t("platform.admins.selfNote")} · {t("platform.admins.lastNote")}
      </p>

      <h3 className="plat-subhead">{t("platform.admins.grant")}</h3>
      <div className="plat-grant">
        <span className="field">
          <label>{t("platform.admins.uid")}</label>
          <input value={uid} onChange={(e) => setUid(e.target.value)} />
        </span>
        <span className="field">
          <label>{t("platform.admins.email")}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </span>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !user || !uid.trim() || !email.trim()}
          onClick={() =>
            void run(
              planGrantAdmin({
                uid: uid.trim(),
                email: email.trim(),
                existing: admins.find((x) => x.uid === uid.trim()) ?? null,
                actor: user?.uid ?? "",
                now: now(),
              })
            )
          }
        >
          {t("platform.admins.grant")}
        </button>
      </div>
    </div>
  );
}
