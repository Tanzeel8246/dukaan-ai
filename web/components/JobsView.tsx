"use client";

/**
 * Phase C · C5 — the Jobs workspace (design §5): work orders /
 * service jobs (printing runs, tailoring, repairs) tracked from
 * intake to delivery. A job is BORN numbered (JB-) — the number
 * goes on the customer's slip at intake.
 *
 * What a job is, in ledger terms (§5.2/§5.3): a card, a stage, a
 * material-events subledger (issue = Dr cogs / Cr the product's
 * class inventory account at snapshot cost; return mirrors) and
 * CITATIONS — its advances are ordinary repayments in the
 * customer's pool (owner Q2, cited by note), its bill is an
 * ordinary bill citing it (sourceType "job") that flips it to
 * delivered when it posts. No job money accounts, no job WIP,
 * no second posting machinery anywhere on this surface.
 *
 * Gates compose per action (§5.6, G-C3): card/stage/material
 * actions on the pre-declared `jobTracker` row as-is (owner/
 * manager write; cashier + accountant read — G-C4, the matrix
 * stands), the advance on `creditRepayment`, "Bill this job" on
 * `billing`. The store re-enforces every gate.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "./StoreProvider";
import PermDenied from "./PermDenied";
import { useLang } from "./LangProvider";
import { IconPlus, IconSearch, SearchClear } from "./ui";
import { JobPrintSheet } from "./DocPrintSheet";
import {
  ChequeFields,
  chequeDraftOf,
  emptyChequeForm,
  todayISO,
  type ChequeFormState,
} from "./ChequeCapture";
import { fmtDate, fmtNum, fmtPKR, fmtUnit } from "@/lib/format";
import { can } from "@/lib/permissions";
import { brandingDataUrls } from "@/lib/branding";
import { matchesAny } from "@/lib/search";
import {
  DEFAULT_WAREHOUSE_ID,
  activeWarehouses,
  qtyAtWarehouse,
} from "@/lib/stock";
import {
  advanceNoteFor,
  effectiveJobStages,
  jobAdvanceRows,
  jobAdvanceTotal,
  jobBills,
  jobMaterialNetQty,
  jobProfitFigures,
  prepareMaterialEvent,
  type MaterialProblem,
} from "@/lib/jobs";
import type { I18nKey } from "@/lib/i18n";
import type { Job, JobStatus } from "@/lib/types";

function fmtQty(n: number): string {
  return Number.isInteger(n) ? fmtNum(n) : String(Math.round(n * 1000) / 1000);
}

const STATUS_KEY: Record<JobStatus, I18nKey> = {
  open: "job.status.open",
  in_progress: "job.status.in_progress",
  ready: "job.status.ready",
  delivered: "job.status.delivered",
  cancelled: "job.status.cancelled",
};

const STATUS_BADGE: Record<JobStatus, string> = {
  open: "badge amber",
  in_progress: "badge blue",
  ready: "badge green",
  delivered: "badge",
  cancelled: "badge red",
};

export default function JobsView() {
  const store = useStore();
  const {
    ready,
    jobs,
    products,
    warehouses,
    credits,
    bills,
    settings,
    role,
  } = store;
  const { t } = useLang();
  const router = useRouter();

  const canWrite = can(role, "jobTracker", "write");
  const canAdvance = can(role, "creditRepayment", "write");
  const canBill = can(role, "billing", "write");
  const stages = useMemo(() => effectiveJobStages(settings), [settings]);

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [formJob, setFormJob] = useState<Job | "new" | null>(null);
  const [matModal, setMatModal] = useState<{ job: Job; kind: "issue" | "return" } | null>(null);
  const [advModal, setAdvModal] = useState<Job | null>(null);
  const [printJob, setPrintJob] = useState<Job | null>(null);
  const [confirm, setConfirm] = useState<{ job: Job; kind: "deliver" | "cancel" } | null>(null);

  const visible = useMemo(() => {
    const q = query.trim();
    const list = [...jobs].reverse();
    if (!q) return list;
    return list.filter((j) =>
      matchesAny(q, [j.number, j.title, j.customerName, j.customerPhone, j.stage])
    );
  }, [jobs, query]);

  const whName = (id: string) =>
    warehouses.find((w) => w.id === id)?.name ?? t("wh.pickerNone");

  if (!can(role, "jobTracker", "view")) return <PermDenied />;

  if (!ready) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("job.eyebrow")}</span>
          <h1 className="h2">{t("job.title")}</h1>
          <p className="lead">{t("job.subtitle")}</p>
        </div>

        {notice && (
          <div className={notice.ok ? "notice-ok" : "notice-err"} role="status">
            {notice.text}
          </div>
        )}

        <div
          className="sticky-bar"
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 18,
          }}
        >
          <div className="search-box" style={{ flex: "1 1 260px" }}>
            <IconSearch />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("job.searchPh")}
              aria-label={t("job.searchPh")}
            />
            {query && (
              <SearchClear
                onClear={() => setQuery("")}
                label={t("action.clearSearch")}
              />
            )}
          </div>
          {canWrite && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setFormJob("new")}
            >
              <IconPlus /> {t("job.new")}
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <div className="empty">{t(query ? "job.noResults" : "job.empty")}</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {visible.map((job) => {
              const figs = jobProfitFigures(job, bills);
              const advance = jobAdvanceTotal(job, credits);
              const citing = jobBills(job, bills);
              const overdue =
                job.dueDateISO !== null &&
                job.status !== "delivered" &&
                job.status !== "cancelled" &&
                job.dueDateISO < todayISO();
              const isOpen = expanded === job.id;
              const terminal = job.status === "delivered" || job.status === "cancelled";
              return (
                <div key={job.id} className="card" style={{ padding: "16px 18px" }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ padding: "2px 6px", fontWeight: 700 }}
                      onClick={() => setExpanded(isOpen ? null : job.id)}
                      aria-expanded={isOpen}
                    >
                      {job.number}
                    </button>
                    <b>{job.title}</b>
                    <span className={STATUS_BADGE[job.status]}>
                      {t(STATUS_KEY[job.status])}
                    </span>
                    <span className="badge">{job.stage}</span>
                    {overdue && (
                      <span className="badge red">{t("job.overdue")}</span>
                    )}
                    <span style={{ marginInlineStart: "auto", fontSize: "0.88rem", opacity: 0.8 }}>
                      {job.customerName}
                      {job.customerPhone ? ` · ${job.customerPhone}` : ""}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 16,
                      flexWrap: "wrap",
                      marginTop: 8,
                      fontSize: "0.88rem",
                    }}
                  >
                    <span>
                      {t("job.materials")}: <b>{fmtPKR(figs.materials)}</b>
                    </span>
                    <span>
                      {t("job.revenue")}: <b>{fmtPKR(figs.revenue)}</b>
                    </span>
                    <span>
                      {t("job.profit")}: <b>{fmtPKR(figs.profit)}</b>
                    </span>
                    {advance > 0 && (
                      <span>
                        {t("job.advanceTotal")}: <b>{fmtPKR(advance)}</b>
                      </span>
                    )}
                    <span style={{ opacity: 0.75 }}>
                      {t("wh.pickerLabel")}: {whName(job.warehouseId)}
                    </span>
                    {job.dueDateISO && (
                      <span style={{ opacity: 0.75 }}>
                        {t("job.due")}: {fmtDate(job.dueDateISO)}
                      </span>
                    )}
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
                      {job.description && <p style={{ margin: 0 }}>{job.description}</p>}
                      {job.note && (
                        <p style={{ margin: 0, opacity: 0.8 }}>{job.note}</p>
                      )}

                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>
                          {t("job.materials")}
                        </div>
                        {job.materialEvents.length === 0 ? (
                          <div style={{ opacity: 0.75 }}>{t("job.noMaterials")}</div>
                        ) : (
                          <table className="table">
                            <thead>
                              <tr>
                                <th>{t("job.materials")}</th>
                                <th>{t("job.mat.product")}</th>
                                <th className="num">{t("job.mat.qty")}</th>
                                <th className="num">{t("common.amount")}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {job.materialEvents.map((e, i) => (
                                <tr key={`${e.entryId}-${i}`}>
                                  <td>
                                    {t(e.kind === "issue" ? "job.ev.issue" : "job.ev.return")}
                                  </td>
                                  <td>{e.name}</td>
                                  <td className="num">{fmtQty(e.qty)}</td>
                                  <td className="num">{fmtPKR(e.value)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>
                          {t("job.advances")}
                        </div>
                        {jobAdvanceRows(job, credits).length === 0 ? (
                          <div style={{ opacity: 0.75 }}>{t("job.noAdvances")}</div>
                        ) : (
                          <table className="table">
                            <tbody>
                              {jobAdvanceRows(job, credits).map((c) => (
                                <tr key={c.id}>
                                  <td>{fmtDate(c.ts)}</td>
                                  <td className="num">{fmtPKR(c.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      <div>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>
                          {t("job.bills")}
                        </div>
                        {citing.length === 0 ? (
                          <div style={{ opacity: 0.75 }}>{t("job.noBills")}</div>
                        ) : (
                          <table className="table">
                            <tbody>
                              {citing.map((b) => (
                                <tr key={b.id}>
                                  <td>{b.billNo}</td>
                                  <td>{fmtDate(b.ts)}</td>
                                  <td className="num">{fmtPKR(b.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      <div>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: "0.9rem" }}>
                          <span>
                            {t("job.revenue")}: <b>{fmtPKR(figs.revenue)}</b>
                          </span>
                          <span>
                            {t("job.materials")}: <b>{fmtPKR(figs.materials)}</b>
                          </span>
                          <span>
                            {t("job.billCogs")}: <b>{fmtPKR(figs.billCogs)}</b>
                          </span>
                          <span>
                            {t("job.labour")}: <b>{fmtPKR(figs.labour)}</b>
                          </span>
                          <span>
                            {t("job.profit")}: <b>{fmtPKR(figs.profit)}</b>
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                          borderTop: "1px solid var(--line)",
                          paddingTop: 12,
                        }}
                      >
                        {canWrite && !terminal && (
                          <>
                            <label
                              htmlFor={`stage-${job.id}`}
                              style={{ fontSize: "0.88rem" }}
                            >
                              {t("job.stage")}
                            </label>
                            <select
                              id={`stage-${job.id}`}
                              value={job.stage}
                              onChange={(e) => {
                                if (store.setJobStage(job.id, e.target.value)) {
                                  setNotice({
                                    ok: true,
                                    text: t("job.notice.stage", {
                                      number: job.number,
                                      stage: e.target.value,
                                    }),
                                  });
                                }
                              }}
                            >
                              {[...new Set([job.stage, ...stages])].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => setMatModal({ job, kind: "issue" })}
                            >
                              {t("job.act.issue")}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => setMatModal({ job, kind: "return" })}
                            >
                              {t("job.act.return")}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => setFormJob(job)}
                            >
                              {t("job.act.edit")}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => setConfirm({ job, kind: "deliver" })}
                            >
                              {t("job.act.deliver")}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => setConfirm({ job, kind: "cancel" })}
                            >
                              {t("job.act.cancel")}
                            </button>
                          </>
                        )}
                        {canAdvance && job.status !== "cancelled" && (
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setAdvModal(job)}
                          >
                            {t("job.act.advance")}
                          </button>
                        )}
                        {canBill && !terminal && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                              if (store.convertJobToBill(job.id)) {
                                router.push("/billing");
                              }
                            }}
                          >
                            {t("job.act.bill")}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => setPrintJob(job)}
                        >
                          {t("job.act.print")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {formJob && (
        <JobFormModal
          job={formJob === "new" ? null : formJob}
          onClose={() => setFormJob(null)}
          onSaved={(text) => {
            setFormJob(null);
            setNotice({ ok: true, text });
          }}
        />
      )}
      {matModal && (
        <MaterialsModal
          job={matModal.job}
          kind={matModal.kind}
          onClose={() => setMatModal(null)}
          onSaved={(text) => {
            setMatModal(null);
            setNotice({ ok: true, text });
          }}
        />
      )}
      {advModal && (
        <AdvanceModal
          job={advModal}
          onClose={() => setAdvModal(null)}
          onSaved={(text) => {
            setAdvModal(null);
            setNotice({ ok: true, text });
          }}
        />
      )}
      {confirm && (
        <ConfirmModal
          title={t(confirm.kind === "deliver" ? "job.confirm.deliver" : "job.confirm.cancel", {
            number: confirm.job.number,
          })}
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            const ok =
              confirm.kind === "deliver"
                ? store.deliverJob(confirm.job.id)
                : store.cancelJob(confirm.job.id);
            if (ok) {
              setNotice({
                ok: true,
                text: t(
                  confirm.kind === "deliver" ? "job.notice.delivered" : "job.notice.cancelled",
                  { number: confirm.job.number }
                ),
              });
            }
            setConfirm(null);
          }}
        />
      )}

      {printJob && (
        <>
          <div className="print-actions no-print">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.print()}
            >
              {t("job.act.print")}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPrintJob(null)}
            >
              {t("action.close")}
            </button>
          </div>
          <JobPrintSheet
            job={printJob}
            settings={settings}
            assets={brandingDataUrls(store.branding)}
            warehouseName={whName(printJob.warehouseId)}
          />
        </>
      )}
    </div>
  );
}

/* ------------------------- job form ------------------------- */

function JobFormModal({
  job,
  onClose,
  onSaved,
}: {
  job: Job | null;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const store = useStore();
  const { t } = useLang();
  const { customers, warehouses, settings } = store;

  const [customerId, setCustomerId] = useState(job?.customerId ?? "");
  const [customerName, setCustomerName] = useState(job?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(job?.customerPhone ?? "");
  const [title, setTitle] = useState(job?.title ?? "");
  const [description, setDescription] = useState(job?.description ?? "");
  const [warehouseId, setWarehouseId] = useState(
    job?.warehouseId ?? DEFAULT_WAREHOUSE_ID
  );
  const [dueDate, setDueDate] = useState(job?.dueDateISO ?? "");
  const [labour, setLabour] = useState(job?.labourCost ?? 0);
  const [note, setNote] = useState(job?.note ?? "");
  const [error, setError] = useState("");

  const whLocked = job !== null && job.materialEvents.length > 0;
  const stages = effectiveJobStages(settings);

  const pickCustomer = (id: string) => {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    if (c) {
      setCustomerName(c.name);
      setCustomerPhone(c.phone);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError(t("job.form.errName"));
      return;
    }
    if (!title.trim()) {
      setError(t("job.form.errTitle"));
      return;
    }
    if (job) {
      const ok = store.updateJob(job.id, {
        customerName,
        customerPhone,
        title,
        description,
        dueDateISO: dueDate || null,
        warehouseId,
        labourCost: labour,
        note,
      });
      if (!ok) {
        setError(t("job.form.errSave"));
        return;
      }
      onSaved(t("job.notice.updated", { number: job.number }));
    } else {
      const id = store.createJob({
        customerId: customerId || null,
        customerName,
        customerPhone,
        title,
        description,
        dueDateISO: dueDate || null,
        warehouseId,
        labourCost: labour,
        note,
      });
      if (!id) {
        setError(t("job.form.errSave"));
        return;
      }
      const created = store.jobs.find((j) => j.id === id);
      onSaved(t("job.notice.created", { number: created?.number ?? "" }));
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t(job ? "job.form.editTitle" : "job.form.newTitle")}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <h2>{t(job ? "job.form.editTitle" : "job.form.newTitle")}</h2>
        <form className="form" onSubmit={submit}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-grid">
            <div className="field">
              <label htmlFor="job-customer">{t("job.form.customer")}</label>
              <select
                id="job-customer"
                value={customerId}
                onChange={(e) => pickCustomer(e.target.value)}
              >
                <option value="">—</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="job-cname">{t("job.form.name")}</label>
              <input
                id="job-cname"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="job-cphone">{t("job.form.phone")}</label>
              <input
                id="job-cphone"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="job-title">{t("job.form.title")}</label>
              <input
                id="job-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="job-wh">{t("wh.pickerLabel")}</label>
              <select
                id="job-wh"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                disabled={whLocked}
              >
                {activeWarehouses(warehouses).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
                {whLocked &&
                  !activeWarehouses(warehouses).some((w) => w.id === warehouseId) && (
                    <option value={warehouseId}>{warehouseId}</option>
                  )}
              </select>
              {whLocked && (
                <div style={{ fontSize: "0.82rem", opacity: 0.75 }}>
                  {t("job.form.warehouseLocked")}
                </div>
              )}
            </div>
            <div className="field">
              <label htmlFor="job-due">{t("job.form.due")}</label>
              <input
                id="job-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="job-labour">{t("job.form.labour")}</label>
              <input
                id="job-labour"
                type="number"
                step="any"
                min={0}
                value={labour || ""}
                onChange={(e) => setLabour(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="field">
              <label htmlFor="job-stage-ro">{t("job.stage")}</label>
              <input
                id="job-stage-ro"
                value={job ? job.stage : stages[0]}
                readOnly
                disabled
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="job-desc">{t("job.form.description")}</label>
            <textarea
              id="job-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className="field">
            <label htmlFor="job-note">{t("job.form.note")}</label>
            <input
              id="job-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t("action.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              {t(job ? "job.form.saveEdit" : "job.form.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------- materials modal ---------------------- */

function MaterialsModal({
  job,
  kind,
  onClose,
  onSaved,
}: {
  job: Job;
  kind: "issue" | "return";
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const store = useStore();
  const { t } = useLang();
  const { products, stockLevels, warehouses } = store;

  const [pickerId, setPickerId] = useState("");
  const [lines, setLines] = useState<Array<{ productId: string; qty: number }>>([]);
  const [error, setError] = useState("");

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const preview = useMemo(
    () => prepareMaterialEvent(job, products, stockLevels, warehouses, kind, lines),
    [job, products, stockLevels, warehouses, kind, lines]
  );

  const addLine = () => {
    if (!pickerId) return;
    setLines((prev) =>
      prev.some((l) => l.productId === pickerId)
        ? prev
        : [...prev, { productId: pickerId, qty: 1 }]
    );
    setPickerId("");
  };

  const problemText = (): string => {
    if (!("problem" in preview)) return "";
    // The lib's problem codes ARE the dictionary suffixes
    // (job.mat.err.<code>) — one mapping, no second table.
    const pName = preview.productId ? (byId.get(preview.productId)?.name ?? "") : "";
    const held = preview.productId ? jobMaterialNetQty(job, preview.productId) : 0;
    return t(`job.mat.err.${preview.problem}` as I18nKey, {
      name: pName,
      qty: fmtQty(held),
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if ("problem" in preview) {
      setError(problemText());
      return;
    }
    const ok =
      kind === "issue"
        ? store.issueJobMaterials(job.id, lines)
        : store.returnJobMaterials(job.id, lines);
    if (!ok) {
      setError(t("job.mat.err.failed"));
      return;
    }
    onSaved(
      t(kind === "issue" ? "job.notice.issued" : "job.notice.returned", {
        number: job.number,
        amount: fmtPKR(preview.prepared.value),
      })
    );
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t(kind === "issue" ? "job.mat.issueTitle" : "job.mat.returnTitle", {
        number: job.number,
      })}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
        <h2>
          {t(kind === "issue" ? "job.mat.issueTitle" : "job.mat.returnTitle", {
            number: job.number,
          })}
        </h2>
        <form className="form" onSubmit={submit}>
          {error && <div className="form-error">{error}</div>}
          <div className="field">
            <label>{t("job.mat.product")}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={pickerId}
                onChange={(e) => setPickerId(e.target.value)}
                style={{ flex: 1 }}
                aria-label={t("job.mat.product")}
              >
                <option value="">—</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({fmtUnit(p.unit)})
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={!pickerId}
                onClick={addLine}
              >
                {t("action.add")}
              </button>
            </div>
          </div>
          {lines.length === 0 ? (
            <div className="empty" style={{ padding: "16px 10px" }}>
              {t("job.mat.err.empty_lines")}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {lines.map((l) => {
                const p = byId.get(l.productId);
                if (!p) return null;
                const avail =
                  kind === "issue"
                    ? qtyAtWarehouse(p, stockLevels, warehouses, job.warehouseId)
                    : jobMaterialNetQty(job, l.productId);
                return (
                  <div
                    key={l.productId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      flexWrap: "wrap",
                      padding: "10px 14px",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      background: "var(--bg)",
                    }}
                  >
                    <div style={{ flex: "1 1 160px", minWidth: 130 }}>
                      <b style={{ fontSize: "0.95rem" }}>{p.name}</b>
                      {p.stockClass === "raw" && (
                        <span className="badge amber" style={{ marginInlineStart: 8 }}>
                          {t("inv.rawBadge")}
                        </span>
                      )}
                      <div style={{ fontSize: "0.82rem", opacity: 0.75 }}>
                        {t(
                          kind === "issue"
                            ? "job.mat.available"
                            : "job.mat.held",
                          { qty: `${fmtQty(avail)} ${fmtUnit(p.unit)}` }
                        )}
                      </div>
                    </div>
                    <label style={{ fontSize: "0.85rem" }}>
                      {t("job.mat.qty")}{" "}
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={l.qty || ""}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((x) =>
                              x.productId === l.productId
                                ? { ...x, qty: parseFloat(e.target.value) || 0 }
                                : x
                            )
                          )
                        }
                        style={{ width: 90 }}
                        aria-label={`${t("job.mat.qty")} — ${p.name}`}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() =>
                        setLines((prev) => prev.filter((x) => x.productId !== l.productId))
                      }
                    >
                      {t("action.remove")}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {"prepared" in preview && (
            <div style={{ fontSize: "0.92rem" }}>
              {t("job.mat.value")}: <b>{fmtPKR(preview.prepared.value)}</b>
            </div>
          )}
          {"problem" in preview && lines.length > 0 && (
            <div className="form-error">{problemText()}</div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t("action.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              {t(kind === "issue" ? "job.mat.issueSave" : "job.mat.returnSave")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ----------------------- advance modal ----------------------- */

function AdvanceModal({
  job,
  onClose,
  onSaved,
}: {
  job: Job;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const store = useStore();
  const { t } = useLang();
  const { accounts } = store;

  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<"cash" | "jazzcash" | "easypaisa" | "bank" | "cheque">(
    "cash"
  );
  const [accountId, setAccountId] = useState("");
  const [cheque, setCheque] = useState<ChequeFormState>(() => emptyChequeForm());
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // §5.3: a job advance IS a repayment — the same machinery,
    // the same entry, cited by the note. A cheque is captured
    // exactly like a repayment cheque (instrument rides in).
    if (!(amount > 0)) {
      setError(t("job.adv.errAmount"));
      return;
    }
    const draft = method === "cheque" ? chequeDraftOf(cheque) : null;
    if (method === "cheque" && !draft) {
      setError(t("job.adv.errCheque"));
      return;
    }
    // addRepayment is fire-and-report like the credit ledger's
    // own desk: local validation above covers its refusal
    // conditions (amount, cheque draft); the store re-checks
    // the role gate and the period lock itself.
    store.addRepayment({
      customerId: job.customerId,
      customerName: job.customerName,
      customerPhone: job.customerPhone,
      amount,
      method: method === "cheque" ? "bank" : method,
      accountId: accountId || undefined,
      note: advanceNoteFor(job),
      ...(draft ? { instrument: "cheque" as const, cheque: draft } : {}),
    });
    onSaved(t("job.adv.done", { number: job.number, amount: fmtPKR(amount) }));
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("job.adv.title", { number: job.number })}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <h2>{t("job.adv.title", { number: job.number })}</h2>
        <p style={{ marginTop: 0, opacity: 0.8 }}>{t("job.adv.sub")}</p>
        <form className="form" onSubmit={submit}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-grid">
            <div className="field">
              <label htmlFor="job-adv-amt">{t("job.adv.amount")}</label>
              <input
                id="job-adv-amt"
                type="number"
                step="any"
                min={0}
                value={amount || ""}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="job-adv-method">{t("job.adv.method")}</label>
              <select
                id="job-adv-method"
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
              >
                <option value="cash">{t("common.pay.cash")}</option>
                <option value="jazzcash">{t("common.pay.jazzcash")}</option>
                <option value="easypaisa">{t("common.pay.easypaisa")}</option>
                <option value="bank">{t("common.pay.bank")}</option>
                <option value="cheque">{t("chq.payOption")}</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="job-adv-acct">{t("job.adv.account")}</label>
              <select
                id="job-adv-acct"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                <option value="">{t("job.adv.accountDefault")}</option>
                {accounts
                  .filter((a) => !a.archived)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
            {method === "cheque" && (
              <ChequeFields value={cheque} onChange={setCheque} idPrefix="job-adv-chq" />
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {t("action.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              {t("job.act.advance")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------ confirm modal ------------------------ */

function ConfirmModal({
  title,
  onClose,
  onConfirm,
}: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { t } = useLang();
  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <h2>{title}</h2>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {t("action.cancel")}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {t("action.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
