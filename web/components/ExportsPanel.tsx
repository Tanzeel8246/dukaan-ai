"use client";

/**
 * Phase D · D5 (design §5): the Tally XML + journal CSV export
 * surface. The exporters themselves are pure lib functions
 * (lib/tally.ts); this panel only assembles their inputs from the
 * store — the journal, the party directories, the settings (with
 * the owner's ledger-name overrides) and a document-number map —
 * and triggers the downloads. Gated on the `trialBalanceExports`
 * matrix row (design §6.1 G-D4: the export actions ride that row,
 * not the finance row the trial-balance report itself uses).
 */
import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import { can } from "@/lib/permissions";
import { journalCSV, tallyXML, type TallyParties } from "@/lib/tally";
import { downloadCSV, downloadTextFile } from "@/lib/csv";
import { inRange, resolveReportRange, type ReportRange } from "@/lib/reports";
import {
  addDaysISO,
  businessDateISO,
  previousFiscalYear,
  startOfDayPktInstant,
  todayPktISO,
} from "@/lib/periods";
import { reportRangeOf } from "@/lib/fiscal";

/** Assemble the exporters' party context from the store: the
 *  directories plus the document-number map (refId → the number
 *  the shop knows the document by). Draft documents carry no
 *  number yet and are skipped — their entries, if any, export
 *  unnumbered and Tally auto-numbers them. */
export function useTallyParties(): TallyParties {
  const store = useStore();
  return useMemo(() => {
    const docNumbers = new Map<string, string>();
    for (const b of store.bills) docNumbers.set(b.id, String(b.billNo));
    for (const p of store.supplierPayments) if (p.voucherNo) docNumbers.set(p.id, p.voucherNo);
    for (const c of store.credits) if (c.voucherNo) docNumbers.set(c.id, c.voucherNo);
    for (const r of store.payrollRuns) if (r.number) docNumbers.set(r.id, r.number);
    for (const l of store.loans) docNumbers.set(l.id, l.number);
    for (const n of store.notes) docNumbers.set(n.id, n.number);
    for (const q of store.quotations) if (q.number) docNumbers.set(q.id, q.number);
    for (const o of store.saleOrders) if (o.number) docNumbers.set(o.id, o.number);
    for (const d of store.deliveryChallans) if (d.number) docNumbers.set(d.id, d.number);
    for (const p of store.purchaseOrders) if (p.number) docNumbers.set(p.id, p.number);
    for (const tr of store.stockTransfers) if (tr.number) docNumbers.set(tr.id, tr.number);
    for (const j of store.jobs) docNumbers.set(j.id, j.number);
    return {
      customers: store.customers,
      suppliers: store.suppliers,
      employees: store.employees,
      accounts: store.accounts,
      docNumbers,
    };
  }, [store]);
}

function fileStamp(range: ReportRange): string {
  return `${range.fromDate}_${range.toDate}`;
}

/**
 * The two export actions for a given range, with their entry
 * count. Renders nothing for roles the `trialBalanceExports` row
 * excludes (the cashier). Used by the Finance exports card (via
 * ExportsPanel's own range picker) and by the Reports trial
 * balance (with the report's selected range).
 */
export function TallyExportButtons({ range }: { range: ReportRange }) {
  const { journal, settings } = useStore();
  const { role } = useAuth();
  const { t } = useLang();
  const parties = useTallyParties();

  const count = useMemo(
    () => journal.filter((e) => inRange(e.ts, range)).length,
    [journal, range]
  );

  if (!can(role, "trialBalanceExports", "view")) return null;

  const exportTally = () => {
    downloadTextFile(
      `dukaan-tally-${fileStamp(range)}.xml`,
      tallyXML(journal, parties, settings, range)
    );
  };
  const exportJournal = () => {
    downloadCSV(
      `dukaan-journal-${fileStamp(range)}.csv`,
      journalCSV(journal, parties, settings, range)
    );
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={exportTally}
          disabled={count === 0}
        >
          {t("fin.export.tally")}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={exportJournal}
          disabled={count === 0}
        >
          {t("fin.export.journalCsv")}
        </button>
        <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          {count === 0
            ? t("fin.export.empty")
            : t("fin.export.count", { count })}
        </span>
      </div>
      <p style={{ color: "var(--muted)", fontSize: "0.88rem", marginTop: 10 }}>
        {t("fin.export.tallyNote")}
      </p>
    </div>
  );
}

type ExportPreset = "fiscal" | "lastFiscal" | "month" | "all" | "custom";

/**
 * The Finance exports block: a range picker (this fiscal year by
 * default — the accountant's usual ask) over the two actions.
 * The trial-balance reconciliation of what will be exported is
 * one click away in Reports; the file's totals equal it by
 * construction (lib/tally's model is asserted against
 * lib/reports' trialBalance in the harness).
 */
export default function ExportsPanel() {
  const { journal, settings } = useStore();
  const { role } = useAuth();
  const { t } = useLang();
  const [preset, setPreset] = useState<ExportPreset>("fiscal");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo<ReportRange>(() => {
    switch (preset) {
      case "fiscal":
        return resolveReportRange("fiscal", settings);
      case "lastFiscal":
        return reportRangeOf(previousFiscalYear(settings));
      case "month":
        return resolveReportRange("month", settings);
      case "all": {
        const first = journal.length
          ? businessDateISO(
              journal.reduce((a, e) => (e.ts < a ? e.ts : a), journal[0].ts)
            )
          : todayPktISO();
        const today = todayPktISO();
        return {
          fromDate: first,
          toDate: today,
          fromTs: startOfDayPktInstant(first),
          toTs: startOfDayPktInstant(addDaysISO(today, 1)),
        };
      }
      case "custom":
        return resolveReportRange("custom", settings, {
          from: customFrom,
          to: customTo,
        });
    }
  }, [preset, settings, journal, customFrom, customTo]);

  if (!can(role, "trialBalanceExports", "view")) return null;

  const presets: Array<{ id: ExportPreset; label: string }> = [
    { id: "fiscal", label: t("rep.range.fiscal") },
    { id: "lastFiscal", label: t("fin.export.lastFiscal") },
    { id: "month", label: t("rep.range.month") },
    { id: "all", label: t("fin.export.all") },
    { id: "custom", label: t("rep.range.custom") },
  ];

  return (
    <div style={{ marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
      <h3 style={{ fontSize: "1.05rem", marginBottom: 4 }}>{t("fin.export.tallyTitle")}</h3>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
          {t("fin.export.range")}
        </span>
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            className={"rep-chip" + (preset === p.id ? " active" : "")}
            aria-pressed={preset === p.id}
            onClick={() => setPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
        {preset === "custom" && (
          <>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.9rem" }}>
              {t("rep.from")}
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.9rem" }}>
              {t("rep.to")}
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
          </>
        )}
      </div>
      <TallyExportButtons range={range} />
    </div>
  );
}
