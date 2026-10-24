"use client";

/**
 * Fix Round 2 · FR2 item 1 — the shared "Add / Re-add demo data"
 * modal, used by the Dashboard footer button and the Settings
 * danger zone alike, so the pre-list, the PIN challenge and the
 * confirmed-from-writes summary exist exactly once.
 *
 * Flow: pre-list (from the pure demoSummary() generator, never
 * from live counts) → PIN challenge via requirePin with the
 * action's own label key ("Add demo data" / "Re-add demo data")
 * → the store action, which re-classifies from fresh reads and
 * refuses real/mixed books → the summary confirmed from the
 * writes actually committed.
 */
import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useLang } from "./LangProvider";
import { usePinGate } from "./PinGate";
import { demoSummary, type DemoSummary } from "@/lib/demo";
import { fmtNum, fmtPKR } from "@/lib/format";

export default function DemoDataModal({
  kind,
  onClose,
}: {
  kind: "add" | "readd";
  onClose: () => void;
}) {
  const { addDemoData, resetDemoData } = useStore();
  const { t } = useLang();
  const { requirePin } = usePinGate();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<DemoSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const preList: DemoSummary = useMemo(() => demoSummary(), []);

  const run = async () => {
    if (!(await requirePin(kind === "add" ? "demo.addButton" : "demo.reAddButton"))) return;
    setBusy(true);
    setError(null);
    const r = kind === "add" ? await addDemoData() : await resetDemoData();
    setBusy(false);
    if (r.ok && r.summary) {
      setDone(r.summary);
      return;
    }
    if (r.reason === "real") setError(t("demo.refusedReal"));
    else if (r.reason === "mixed") setError(t("demo.refusedMixed"));
    else if (r.reason === "already" || r.reason === "empty") onClose();
    else setError(t("demo.addFailed"));
  };

  if (done) {
    return (
      <div className="modal-backdrop" onClick={() => onClose()} role="dialog" aria-modal="true" aria-label={t("demo.addedTitle")}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>{t("demo.addedTitle")}</h2>
          <p className="modal-sub">
            {t("demo.addedBody", {
              products: fmtNum(done.products),
              customers: fmtNum(done.customers),
              suppliers: fmtNum(done.suppliers),
              sales: fmtNum(done.salesRows),
              journal: fmtNum(done.journalEntries),
            })}
          </p>
          <div className="modal-actions">
            <button type="button" className="btn btn-primary" onClick={() => onClose()}>
              {t("action.close")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => !busy && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={kind === "add" ? t("demo.addTitle") : t("demo.reAddTitle")}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{kind === "add" ? t("demo.addTitle") : t("demo.reAddTitle")}</h2>
        <p className="modal-sub">{kind === "add" ? t("demo.addBody") : t("demo.reAddBody")}</p>
        <p style={{ fontWeight: 700, marginBottom: 4 }}>{t("demo.preListTitle")}</p>
        <ul style={{ marginTop: 0 }}>
          <li>{t("demo.preListProducts", { n: fmtNum(preList.products) })}</li>
          <li>{t("demo.preListCustomers", { n: fmtNum(preList.customers) })}</li>
          <li>{t("demo.preListSuppliers", { n: fmtNum(preList.suppliers) })}</li>
          <li>{t("demo.preListSales", { n: fmtNum(preList.salesRows) })}</li>
          <li>{t("demo.preListJournal", { n: fmtNum(preList.journalEntries) })}</li>
          <li>{t("demo.preListStock", { amount: fmtPKR(preList.stockCost) })}</li>
        </ul>
        {error && <p style={{ color: "var(--danger, #b3261e)" }}>{error}</p>}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => onClose()}>
            {t("action.cancel")}
          </button>
          <button
            type="button"
            className={kind === "add" ? "btn btn-primary" : "btn btn-danger"}
            disabled={busy}
            onClick={run}
          >
            {kind === "add" ? t("demo.confirmAdd") : t("demo.confirmReAdd")}
          </button>
        </div>
      </div>
    </div>
  );
}
