"use client";

/**
 * Phase G · G6 (design §9): the full-business backup & restore
 * card. Export assembles one JSON file from the owner's own reads
 * (lib/backup via the store) — available in every plan state,
 * because it is reads only and reads are never gated. Restore is
 * the two-step transplant: pick a file → the store verifies it
 * against its own manifest and plans against a probe of THIS
 * business (writing nothing) → the plan's summary or refusal is
 * shown → only an explicit confirmation executes the writes.
 * Restore targets a new, empty business; a live book is refused,
 * by the planner, never overwritten.
 */
import { useEffect, useRef, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import { downloadTextFile } from "@/lib/csv";
import type { I18nKey } from "@/lib/i18n";
import type { BusinessBackup, RestorePlan, RestoreRefusal } from "@/lib/backup";
import { trashPanelState, type TrashManifest } from "@/lib/trash";

type RestoreStage =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "refused"; reason: RestoreRefusal }
  | { kind: "ready"; plan: RestorePlan & { ok: true }; file: BusinessBackup }
  | { kind: "restoring" }
  | { kind: "done"; written: number }
  | { kind: "already" }
  | { kind: "failed" };

const REFUSAL_KEYS: Record<RestoreRefusal, I18nKey> = {
  "not-a-backup": "backup.refused.notABackup",
  "unknown-format": "backup.refused.unknownFormat",
  "manifest-mismatch": "backup.refused.manifestMismatch",
  "target-not-empty": "backup.refused.targetNotEmpty",
};

export default function BackupPanel() {
  const store = useStore();
  const { role, mode } = useAuth();
  const { t } = useLang();
  const fileRef = useRef<HTMLInputElement>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [stage, setStage] = useState<RestoreStage>({ kind: "idle" });

  /* Fix Round 2 · FR2 item 2 — the trash panel. listTrash()
   * sweeps expired snapshots lazily on load, so opening this
   * panel is what makes an expired snapshot disappear. Restore
   * and delete follow the file-restore card's gating (owner
   * only, no PIN challenge — the PIN-gated act is the Clear
   * itself); restore runs the same pipeline including the
   * empty-business guard, and consumes the snapshot. */
  const [trash, setTrash] = useState<TrashManifest[] | null>(null);
  const [trashBusyId, setTrashBusyId] = useState<string | null>(null);
  const [trashMsg, setTrashMsg] = useState<string | null>(null);
  const loadTrash = async () => {
    setTrash(await store.listTrash());
  };
  useEffect(() => {
    if (role === "owner" && mode !== "demo") void loadTrash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, mode]);

  if (role !== "owner") return null;

  const doTrashRestore = async (m: TrashManifest) => {
    setTrashBusyId(m.trashId);
    setTrashMsg(null);
    const r = await store.restoreFromTrash(m.trashId);
    setTrashBusyId(null);
    if (r.ok) setTrashMsg(t("trash.restoreDone"));
    else if (r.reason === "target-not-empty") setTrashMsg(t("trash.restoreRefused"));
    else if (r.reason === "expired") setTrashMsg(t("trash.restoreExpired"));
    else setTrashMsg(t("backup.restoreFailed"));
    await loadTrash();
  };

  const doTrashDelete = async (m: TrashManifest) => {
    setTrashBusyId(m.trashId);
    setTrashMsg(null);
    const r = await store.deleteTrashPermanently(m.trashId);
    setTrashBusyId(null);
    if (r.ok) setTrashMsg(t("trash.deleted"));
    else setTrashMsg(t("backup.restoreFailed"));
    await loadTrash();
  };

  const doExport = async () => {
    setExportBusy(true);
    setExportMsg(null);
    const file = await store.exportBusinessBackup();
    setExportBusy(false);
    if (!file) {
      setExportMsg(t("backup.exportFailed"));
      return;
    }
    const day = file.exportedAt.slice(0, 10);
    downloadTextFile(
      `dukaan-backup-${file.manifest.businessId.slice(0, 8)}-${day}.json`,
      JSON.stringify(file, null, 2)
    );
    setFingerprint(file.manifest.journalFingerprint);
    setExportMsg(
      t("backup.exportDone", {
        docs: file.manifest.totalDocs,
        journal: file.manifest.journalCount,
      })
    );
  };

  const onPick = async (picked: File | undefined) => {
    if (!picked) return;
    setStage({ kind: "checking" });
    let parsed: unknown;
    try {
      parsed = JSON.parse(await picked.text());
    } catch {
      setStage({ kind: "refused", reason: "not-a-backup" });
      return;
    }
    const plan = await store.planBusinessRestore(parsed);
    if (!plan) {
      setStage({ kind: "failed" });
      return;
    }
    if (!plan.ok) {
      setStage({ kind: "refused", reason: plan.reason });
      return;
    }
    if (plan.alreadyRestored) {
      setStage({ kind: "already" });
      return;
    }
    setStage({ kind: "ready", plan, file: parsed as BusinessBackup });
  };

  const doRestore = async () => {
    if (stage.kind !== "ready") return;
    const { plan } = stage;
    setStage({ kind: "restoring" });
    const res = await store.executeBusinessRestore(plan);
    if (res.ok) {
      setStage({
        kind: "done",
        written: plan.writes.filter((w) => w.kind === "set").length,
      });
    } else {
      setStage({ kind: "failed" });
    }
  };

  const sourceName = (file: BusinessBackup): string => {
    const reg = file.platform.registry as { name?: unknown } | null;
    return typeof reg?.name === "string" && reg.name !== ""
      ? reg.name
      : file.manifest.businessId;
  };

  return (
    <section className="card" aria-label={t("backup.title")}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("backup.title")}</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
        {t("backup.sub")}
      </p>

      <h3 style={{ fontSize: "1.05rem", marginBottom: 4 }}>{t("backup.exportTitle")}</h3>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 10 }}>
        {t("backup.exportBody")}
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={doExport}
          disabled={exportBusy}
        >
          {exportBusy ? t("backup.exporting") : t("backup.exportButton")}
        </button>
        {exportMsg && <span style={{ fontSize: "0.9rem" }}>{exportMsg}</span>}
      </div>
      {fingerprint && (
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: 8 }}>
          {t("backup.fingerprint")}: {fingerprint.slice(0, 16)}…
        </p>
      )}

      <div style={{ marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
        <h3 style={{ fontSize: "1.05rem", marginBottom: 4 }}>{t("backup.restoreTitle")}</h3>
        <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 10 }}>
          {t("backup.restoreBody")}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={(e) => {
            const picked = e.target.files?.[0];
            e.target.value = "";
            void onPick(picked);
          }}
        />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => fileRef.current?.click()}
            disabled={stage.kind === "checking" || stage.kind === "restoring"}
          >
            {stage.kind === "checking" ? t("backup.restoreReading") : t("backup.restorePick")}
          </button>
          {stage.kind === "ready" && (
            <button type="button" className="btn" onClick={doRestore}>
              {t("backup.restoreConfirm")}
            </button>
          )}
          {stage.kind === "restoring" && (
            <span style={{ fontSize: "0.9rem" }}>{t("backup.restoring")}</span>
          )}
        </div>
        {stage.kind === "refused" && (
          <p style={{ fontSize: "0.9rem", marginTop: 10 }}>{t(REFUSAL_KEYS[stage.reason])}</p>
        )}
        {stage.kind === "ready" && (
          <p style={{ fontSize: "0.9rem", marginTop: 10 }}>
            {t("backup.restoreSource", {
              business: sourceName(stage.file),
              date: new Date(stage.file.exportedAt).toLocaleDateString(),
            })}
            {" — "}
            {t("backup.restoreSummary", {
              docs: stage.plan.writes.filter((w) => w.kind === "set").length,
              journal: stage.file.manifest.journalCount,
            })}
          </p>
        )}
        {stage.kind === "done" && (
          <p style={{ fontSize: "0.9rem", marginTop: 10 }}>
            {t("backup.restoreDone", { written: stage.written })}
          </p>
        )}
        {stage.kind === "already" && (
          <p style={{ fontSize: "0.9rem", marginTop: 10 }}>{t("backup.restoreAlready")}</p>
        )}
        {stage.kind === "failed" && (
          <p style={{ fontSize: "0.9rem", marginTop: 10 }}>{t("backup.restoreFailed")}</p>
        )}
      </div>

      {mode !== "demo" && (
        <div style={{ marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
          <h3 style={{ fontSize: "1.05rem", marginBottom: 4 }}>{t("trash.title")}</h3>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 10 }}>
            {t("trash.storefrontNote")}
          </p>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 10 }}>
            {t("trash.sweepNote")}
          </p>
          {trash === null ? (
            <p style={{ fontSize: "0.9rem" }}>{t("common.loading")}</p>
          ) : trash.length === 0 ? (
            <p style={{ fontSize: "0.9rem" }}>{t("trash.empty")}</p>
          ) : (
            trash.map((m) => {
              const state = trashPanelState(m, new Date().toISOString());
              return (
                <div key={m.trashId} style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: "0.9rem", marginBottom: 2 }}>
                    {t("trash.clearedAt", { date: new Date(m.clearedAt).toLocaleDateString() })}
                    {" · "}
                    {t("trash.expires", { date: new Date(m.expiresAt).toLocaleDateString() })}
                  </p>
                  <p style={{ fontSize: "0.9rem", marginBottom: 2 }}>
                    {t("trash.docs", { n: m.totalDocs, journal: m.journalCount })}
                    {" · "}
                    {m.journalFingerprint.slice(0, 16)}…
                  </p>
                  {state === "restored" && (
                    <p style={{ fontSize: "0.9rem", marginBottom: 6 }}>{t("trash.restoredLabel")}</p>
                  )}
                  {state === "expired" && (
                    <p style={{ fontSize: "0.9rem", marginBottom: 6 }}>{t("trash.expiredLabel")}</p>
                  )}
                  {state === "active" && (
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={trashBusyId === m.trashId}
                        onClick={() => void doTrashRestore(m)}
                      >
                        {t("trash.restoreButton")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={trashBusyId === m.trashId}
                        onClick={() => void doTrashDelete(m)}
                      >
                        {t("trash.deleteButton")}
                      </button>
                    </div>
                  )}
                  {state === "restored" && (
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={trashBusyId === m.trashId}
                        onClick={() => void doTrashDelete(m)}
                      >
                        {t("trash.deleteButton")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
          {trashMsg && <p style={{ fontSize: "0.9rem", marginTop: 10 }}>{trashMsg}</p>}
        </div>
      )}
    </section>
  );
}
