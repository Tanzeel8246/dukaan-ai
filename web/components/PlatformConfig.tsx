/**
 * Dukaan AI — Phase G · G4: the payment-instructions editor.
 * The platform's own display data (platformConfig/main): the
 * Raast/bank details and support contact the owner-side
 * renewal surface shows. Saving runs lib/platform's
 * planSavePlatformConfig through the platform data layer —
 * the write and its businessEvents entry land in one batch,
 * like every console act. Text only: there is no gateway
 * behind these instructions (§3.5).
 */
"use client";

import { useEffect, useState } from "react";
import { useLang } from "./LangProvider";
import { usePlatform } from "./PlatformData";
import { useAuth } from "./AuthProvider";
import {
  EMPTY_PLATFORM_CONFIG,
  planSavePlatformConfig,
  type PlatformConfigDoc,
} from "@/lib/platform";
import { fmtDate } from "@/lib/format";

type Fields = Omit<PlatformConfigDoc, "updatedBy" | "updatedAt">;

const blank: Fields = {
  raastNumber: "",
  iban: "",
  bankName: "",
  accountTitle: "",
  instructions: "",
  supportContact: "",
};

function fieldsOf(c: PlatformConfigDoc | null): Fields {
  if (!c) return blank;
  return {
    raastNumber: c.raastNumber,
    iban: c.iban,
    bankName: c.bankName,
    accountTitle: c.accountTitle,
    instructions: c.instructions,
    supportContact: c.supportContact,
  };
}

export default function PlatformConfig() {
  const { t } = useLang();
  const { user } = useAuth();
  const { platformConfig, runAct } = usePlatform();
  const [fields, setFields] = useState<Fields>(blank);
  const [msg, setMsg] = useState<"done" | "failed" | null>(null);
  const [busy, setBusy] = useState(false);

  /* The form follows the doc until the admin starts typing;
   * a save re-syncs from what the batch actually wrote. */
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) setFields(fieldsOf(platformConfig));
  }, [platformConfig, dirty]);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDirty(true);
    setFields((f) => ({ ...f, [k]: e.target.value }));
  };

  const save = async () => {
    if (!user) return;
    const result = planSavePlatformConfig({
      config: fields,
      current: platformConfig,
      actor: user.uid,
      now: new Date().toISOString(),
    });
    if (!result.ok) {
      setMsg("failed");
      return;
    }
    setBusy(true);
    const ok = await runAct(result);
    setBusy(false);
    if (ok) setDirty(false);
    setMsg(ok ? "done" : "failed");
  };

  const current = platformConfig ?? EMPTY_PLATFORM_CONFIG;

  return (
    <div>
      {msg && (
        <div className={`plan-banner${msg === "failed" ? " refusal" : ""}`} role="status">
          {t(msg === "done" ? "platform.act.done" : "platform.act.failed")}
        </div>
      )}
      <p className="plat-soft" style={{ marginBottom: 14 }}>
        {t("platform.cfg.intro")}
      </p>
      <div className="plat-grant">
        <span className="field">
          <label>{t("platform.cfg.raast")}</label>
          <input value={fields.raastNumber} onChange={set("raastNumber")} />
        </span>
        <span className="field">
          <label>{t("platform.cfg.iban")}</label>
          <input value={fields.iban} onChange={set("iban")} />
        </span>
        <span className="field">
          <label>{t("platform.cfg.bank")}</label>
          <input value={fields.bankName} onChange={set("bankName")} />
        </span>
        <span className="field">
          <label>{t("platform.cfg.accountTitle")}</label>
          <input value={fields.accountTitle} onChange={set("accountTitle")} />
        </span>
        <span className="field">
          <label>{t("platform.cfg.support")}</label>
          <input value={fields.supportContact} onChange={set("supportContact")} />
        </span>
      </div>
      <span className="field" style={{ display: "block", marginTop: 12 }}>
        <label>{t("platform.cfg.instructions")}</label>
        <textarea
          value={fields.instructions}
          onChange={set("instructions")}
          rows={4}
          style={{ width: "100%" }}
        />
      </span>
      <div className="plat-actions" style={{ marginTop: 14 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !user}
          onClick={() => void save()}
        >
          {t("platform.cfg.save")}
        </button>
        {current.updatedAt && (
          <span className="plat-soft">
            {t("platform.cfg.updated", {
              date: fmtDate(current.updatedAt),
              by: current.updatedBy,
            })}
          </span>
        )}
      </div>
    </div>
  );
}
