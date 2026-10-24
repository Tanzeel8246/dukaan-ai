"use client";

/**
 * Staff screen (Phase D · D1/D2, design §1/§2.8): ONE route, three
 * tabs — the employee Directory, the Attendance register and
 * Payroll. The directory is identity + current terms (§1.1); the
 * register is the §1.3 tap-to-mark grid (posts nothing, ever);
 * the Payroll tab (D2) composes runs from the two, finalises
 * them into the journal through the store's guarded actions and
 * prints salary slips — its figures are the journal's, derived
 * through lib/payroll, never typed in.
 *
 * Gating is the pre-declared `staffDirectory` matrix row (A3):
 * owner/manager write, accountant read, cashier none (PermDenied —
 * and the sidebar hides the link). G-D1 stands: the manager who
 * marks the register is the same person who maintains the
 * directory in the target shops.
 */
import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import PermDenied from "./PermDenied";
import { can } from "@/lib/permissions";
import {
  IconCash,
  IconChevronLeft,
  IconClose,
  IconEdit,
  IconPlus,
  IconReceipt,
  IconSearch,
  IconTrash,
  SearchClear,
} from "./ui";
import { AccountPicker, NegativeBalanceWarning } from "./MoneyAccounts";
import { SalarySlipSheet } from "./DocPrintSheet";
import { brandingDataUrls } from "@/lib/branding";
import { fmtDate, fmtNum, fmtPKR } from "@/lib/format";
import type { I18nKey } from "@/lib/i18n";
import { employeeMatches } from "@/lib/search";
import { nextDocNumber } from "@/lib/documents";
import { outflowPreview } from "@/lib/ledger";
import {
  attendanceDocId,
  attendanceSummary,
  currentMonthKey,
  daysInMonthOf,
  employeePosition,
  hasPostedRunForMonth,
  nextAttendanceMark,
  paidForRun,
  payrollLineTotals,
  payrollRunTotals,
  runLineFigures,
  salaryPayableComposition,
  shiftMonth,
} from "@/lib/payroll";
import type {
  AttendanceMark,
  Employee,
  PayMethod,
  PayrollRun,
  PayrollRunLine,
} from "@/lib/types";

const PAY_METHODS: Array<Exclude<PayMethod, "credit">> = [
  "cash",
  "jazzcash",
  "easypaisa",
  "bank",
];
const PAY_METHOD_KEY: Record<Exclude<PayMethod, "credit">, I18nKey> = {
  cash: "common.pay.cash",
  jazzcash: "common.pay.jazzcash",
  easypaisa: "common.pay.easypaisa",
  bank: "common.pay.bank",
};

type FormState = {
  name: string;
  phone: string;
  designation: string;
  joinDateISO: string;
  payBasis: "monthly" | "daily";
  baseAmount: string;
  allowances: Array<{ label: string; amount: string }>;
  paidLeaveDays: string;
  linkedUserEmail: string;
  note: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  phone: "",
  designation: "",
  joinDateISO: "",
  payBasis: "monthly",
  baseAmount: "",
  allowances: [],
  paidLeaveDays: "2",
  linkedUserEmail: "",
  note: "",
};

const MARK_KEY: Record<AttendanceMark, I18nKey> = {
  present: "att.mark.present",
  absent: "att.mark.absent",
  half: "att.mark.half",
  leave: "att.mark.leave",
  off: "att.mark.off",
};
const MARK_SHORT: Record<AttendanceMark, I18nKey> = {
  present: "att.short.present",
  absent: "att.short.absent",
  half: "att.short.half",
  leave: "att.short.leave",
  off: "att.short.off",
};

export default function StaffView() {
  const store = useStore();
  const { role } = useAuth();
  const { t } = useLang();
  const [tab, setTab] = useState<"directory" | "attendance" | "payroll">("directory");
  const canPayroll = can(role, "payroll", "view");

  if (!store.ready) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty">{t("common.loading")}</div>
        </div>
      </div>
    );
  }
  if (!can(role, "staffDirectory", "view")) return <PermDenied />;

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("staff.eyebrow")}</span>
          <h1 className="h2">{t("staff.title")}</h1>
          <p className="lead">{t("staff.subtitle")}</p>
        </div>

        <div className="rep-chips" role="tablist" aria-label={t("staff.tabsAria")} style={{ marginBottom: 22 }}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "directory"}
            className={`rep-chip${tab === "directory" ? " active" : ""}`}
            onClick={() => setTab("directory")}
          >
            {t("staff.tab.directory")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "attendance"}
            className={`rep-chip${tab === "attendance" ? " active" : ""}`}
            onClick={() => setTab("attendance")}
          >
            {t("staff.tab.attendance")}
          </button>
          {canPayroll && (
            <button
              type="button"
              role="tab"
              aria-selected={tab === "payroll"}
              className={`rep-chip${tab === "payroll" ? " active" : ""}`}
              onClick={() => setTab("payroll")}
            >
              {t("staff.tab.payroll")}
            </button>
          )}
        </div>

        {tab === "directory" ? (
          <DirectoryTab />
        ) : tab === "attendance" ? (
          <AttendanceTab />
        ) : (
          <PayrollTab />
        )}
      </div>
    </div>
  );
}

/* ============================ Directory ============================ */

function DirectoryTab() {
  const {
    employees,
    attendance,
    payrollRuns,
    loans,
    journal,
    addEmployee,
    updateEmployee,
    deleteEmployee,
  } = useStore();
  const { role } = useAuth();
  const { t } = useLang();
  const canWrite = can(role, "staffDirectory", "write");

  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [profile, setProfile] = useState<Employee | null>(null);
  const [advanceTarget, setAdvanceTarget] = useState<Employee | null>(null);
  const [printSlip, setPrintSlip] = useState<{
    run: PayrollRun;
    line: PayrollRunLine;
  } | null>(null);

  const filtered = useMemo(() => {
    const list = [...employees].sort((a, b) =>
      a.active === b.active
        ? a.name.localeCompare(b.name)
        : a.active
          ? -1
          : 1
    );
    if (!search.trim()) return list;
    return list.filter((e) => employeeMatches(e, search));
  }, [employees, search]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({
      name: e.name,
      phone: e.phone,
      designation: e.designation,
      joinDateISO: e.joinDateISO ?? "",
      payBasis: e.payBasis,
      baseAmount: String(e.baseAmount),
      allowances: e.allowances.map((a) => ({ label: a.label, amount: String(a.amount) })),
      paidLeaveDays: String(e.paidLeaveDays),
      linkedUserEmail: e.linkedUserEmail ?? "",
      note: e.note,
    });
    setFormError("");
    setFormOpen(true);
  };

  const submitForm = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.name.trim()) {
      setFormError(t("staff.err.nameRequired"));
      return;
    }
    const base = Number(form.baseAmount);
    if (form.baseAmount.trim() === "" || !Number.isFinite(base) || base < 0) {
      setFormError(t("staff.err.baseInvalid"));
      return;
    }
    const allowances = form.allowances
      .map((a) => ({ label: a.label.trim(), amount: Number(a.amount) || 0 }))
      .filter((a) => a.label !== "" || a.amount > 0);
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      designation: form.designation.trim(),
      linkedUserEmail: form.linkedUserEmail.trim() || null,
      joinDateISO: form.joinDateISO || null,
      payBasis: form.payBasis,
      baseAmount: base,
      allowances,
      paidLeaveDays: Math.max(0, Math.floor(Number(form.paidLeaveDays) || 0)),
      note: form.note.trim(),
    };
    if (editing) {
      updateEmployee(editing.id, payload);
      setNotice({ ok: true, text: t("staff.notice.updated") });
    } else {
      addEmployee(payload);
      setNotice({ ok: true, text: t("staff.notice.added", { name: payload.name }) });
    }
    setFormOpen(false);
  };

  const toggleActive = (e: Employee) => {
    updateEmployee(e.id, { active: !e.active });
    setNotice({
      ok: true,
      text: t(e.active ? "staff.notice.deactivated" : "staff.notice.reactivated", {
        name: e.name,
      }),
    });
  };

  /** §1.5's citation test, mirrored for the modal's explanation —
   *  the store runs the same test and refuses regardless. */
  const isCited = (e: Employee): boolean =>
    attendance.some((a) => a.employeeId === e.id) ||
    payrollRuns.some((r) => r.lines.some((l) => l.employeeId === e.id)) ||
    loans.some((l) => l.partyId === e.id) ||
    journal.some((en) => en.lines.some((l) => (l.ref ?? null) === e.id));

  const tryDelete = (e: Employee) => {
    const ok = deleteEmployee(e.id);
    if (ok) {
      setNotice({ ok: true, text: t("staff.notice.deleted", { name: e.name }) });
      setDeleteTarget(null);
    }
  };

  const profileLive = profile
    ? (employees.find((e) => e.id === profile.id) ?? profile)
    : null;

  return (
    <>
      {notice && (
        <div
          className={notice.ok ? "note-box" : "form-error"}
          style={notice.ok ? { marginTop: 0, marginBottom: 22 } : { marginBottom: 22 }}
          role="status"
        >
          {notice.text}
        </div>
      )}

      <div className="toolbar">
        <div className="search-box">
          <IconSearch />
          <input
            type="search"
            placeholder={t("staff.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t("staff.searchAria")}
          />
          {search && (
            <SearchClear onClear={() => setSearch("")} label={t("action.clearSearch")} />
          )}
        </div>
        {canWrite && (
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            <IconPlus /> {t("staff.add")}
          </button>
        )}
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>{t("staff.th.name")}</th>
              <th>{t("staff.th.designation")}</th>
              <th>{t("staff.th.phone")}</th>
              <th>{t("staff.th.pay")}</th>
              <th>{t("staff.th.position")}</th>
              <th>{t("staff.th.status")}</th>
              <th>{t("staff.th.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const pos = employeePosition(journal, e.id);
              return (
                <tr key={e.id}>
                  <td>
                    <b>{e.name}</b>
                    {e.note && (
                      <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{e.note}</div>
                    )}
                  </td>
                  <td>{e.designation || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{e.phone || "—"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {t(e.payBasis === "monthly" ? "staff.pay.monthly" : "staff.pay.daily", {
                      amount: fmtPKR(e.baseAmount),
                    })}
                  </td>
                  <td>
                    {pos < 0 ? (
                      <span className="badge green">
                        {t("staff.pos.owed", { amount: fmtPKR(-pos) })}
                      </span>
                    ) : pos > 0 ? (
                      <span className="badge amber">
                        {t("staff.pos.advance", { amount: fmtPKR(pos) })}
                      </span>
                    ) : (
                      <span className="badge">{t("staff.pos.settled")}</span>
                    )}
                  </td>
                  <td>
                    {e.active ? (
                      <span className="badge green">{t("staff.badge.active")}</span>
                    ) : (
                      <span className="badge red">{t("staff.badge.inactive")}</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setProfile(e)}
                      >
                        {t("staff.action.view")}
                      </button>
                      {canWrite && (
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => openEdit(e)}
                          aria-label={t("action.edit")}
                          title={t("action.edit")}
                        >
                          <IconEdit />
                        </button>
                      )}
                      {canWrite && (
                        <button
                          type="button"
                          className="icon-btn danger"
                          onClick={() => setDeleteTarget(e)}
                          aria-label={t("action.delete")}
                          title={t("action.delete")}
                        >
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty">
                    {employees.length === 0 ? t("staff.empty.none") : t("staff.empty.noMatch")}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="note-box">{t("staff.noteBox")}</div>

      {/* ---------- Add / Edit employee ---------- */}
      {formOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setFormOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={editing ? t("staff.form.editTitle") : t("staff.form.addTitle")}
        >
          <div className="modal" style={{ width: "min(680px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <h2>{editing ? t("staff.form.editTitle") : t("staff.form.addTitle")}</h2>
            <p className="modal-sub">{editing ? t("staff.form.editSub") : t("staff.form.addSub")}</p>
            <form className="form" onSubmit={submitForm}>
              {formError && <div className="form-error">{formError}</div>}
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="emp-name">{t("staff.form.name")}</label>
                  <input
                    id="emp-name"
                    value={form.name}
                    onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                    placeholder={t("staff.form.namePh")}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="emp-phone">{t("staff.form.phone")}</label>
                  <input
                    id="emp-phone"
                    value={form.phone}
                    onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                    placeholder={t("staff.form.phonePh")}
                  />
                </div>
                <div className="field">
                  <label htmlFor="emp-designation">{t("staff.form.designation")}</label>
                  <input
                    id="emp-designation"
                    value={form.designation}
                    onChange={(e) => setForm((s) => ({ ...s, designation: e.target.value }))}
                    placeholder={t("staff.form.designationPh")}
                  />
                </div>
                <div className="field">
                  <label htmlFor="emp-join">{t("staff.form.joinDate")}</label>
                  <input
                    id="emp-join"
                    type="date"
                    value={form.joinDateISO}
                    onChange={(e) => setForm((s) => ({ ...s, joinDateISO: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="emp-basis">{t("staff.form.payBasis")}</label>
                  <select
                    id="emp-basis"
                    value={form.payBasis}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, payBasis: e.target.value as "monthly" | "daily" }))
                    }
                  >
                    <option value="monthly">{t("staff.form.basis.monthly")}</option>
                    <option value="daily">{t("staff.form.basis.daily")}</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="emp-base">
                    {t(form.payBasis === "monthly" ? "staff.form.baseMonthly" : "staff.form.baseDaily")}
                  </label>
                  <input
                    id="emp-base"
                    type="number"
                    min="0"
                    step="any"
                    value={form.baseAmount}
                    onChange={(e) => setForm((s) => ({ ...s, baseAmount: e.target.value }))}
                  />
                </div>
                {form.payBasis === "monthly" && (
                  <div className="field">
                    <label htmlFor="emp-leave">{t("staff.form.paidLeaveDays")}</label>
                    <input
                      id="emp-leave"
                      type="number"
                      min="0"
                      step="1"
                      value={form.paidLeaveDays}
                      onChange={(e) => setForm((s) => ({ ...s, paidLeaveDays: e.target.value }))}
                    />
                  </div>
                )}
                <div className="field">
                  <label htmlFor="emp-linked">{t("staff.form.linkedEmail")}</label>
                  <input
                    id="emp-linked"
                    type="email"
                    value={form.linkedUserEmail}
                    onChange={(e) => setForm((s) => ({ ...s, linkedUserEmail: e.target.value }))}
                    placeholder={t("staff.form.linkedEmailPh")}
                  />
                </div>
                <div className="field">
                  <label htmlFor="emp-note">{t("staff.form.note")}</label>
                  <input
                    id="emp-note"
                    value={form.note}
                    onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
                    placeholder={t("staff.form.notePh")}
                  />
                </div>
              </div>
              {form.payBasis === "monthly" && (
                <p className="modal-sub" style={{ marginTop: 4 }}>{t("staff.form.paidLeaveHelp")}</p>
              )}
              <p className="modal-sub">{t("staff.form.linkedHelp")}</p>

              <div className="field" style={{ marginTop: 6 }}>
                <label>{t("staff.form.allowances")}</label>
                {form.allowances.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      value={a.label}
                      placeholder={t("staff.form.allowanceLabelPh")}
                      aria-label={t("staff.form.allowanceLabelPh")}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          allowances: s.allowances.map((x, j) =>
                            j === i ? { ...x, label: e.target.value } : x
                          ),
                        }))
                      }
                    />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      style={{ maxWidth: 140 }}
                      value={a.amount}
                      placeholder={t("staff.form.allowanceAmountPh")}
                      aria-label={t("staff.form.allowanceAmountPh")}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          allowances: s.allowances.map((x, j) =>
                            j === i ? { ...x, amount: e.target.value } : x
                          ),
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={t("staff.form.removeAllowance")}
                      title={t("staff.form.removeAllowance")}
                      onClick={() =>
                        setForm((s) => ({
                          ...s,
                          allowances: s.allowances.filter((_, j) => j !== i),
                        }))
                      }
                    >
                      <IconTrash />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setForm((s) => ({ ...s, allowances: [...s.allowances, { label: "", amount: "" }] }))
                  }
                >
                  <IconPlus /> {t("staff.form.addAllowance")}
                </button>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
                  <IconClose /> {t("action.cancel")}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editing ? t("staff.form.saveChanges") : t("staff.add")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Delete employee ---------- */}
      {deleteTarget && (
        <div
          className="modal-backdrop"
          onClick={() => setDeleteTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-label={t("staff.delete.aria")}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{t("staff.delete.title")}</h2>
            {isCited(deleteTarget) ? (
              <>
                <div className="form-error">{t("staff.delete.blocked")}</div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                    {t("action.close")}
                  </button>
                  {deleteTarget.active && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => { toggleActive(deleteTarget); setDeleteTarget(null); }}
                    >
                      {t("staff.action.deactivate")}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="modal-sub">{t("staff.delete.body", { name: deleteTarget.name })}</p>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                    {t("staff.delete.keep")}
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => tryDelete(deleteTarget)}>
                    <IconTrash /> {t("action.delete")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ---------- Employee detail ---------- */}
      {profileLive && (
        <EmployeeDetail
          employee={profileLive}
          onClose={() => setProfile(null)}
          onEdit={() => { setProfile(null); openEdit(profileLive); }}
          canWrite={canWrite}
          onAdvance={() => { setProfile(null); setAdvanceTarget(profileLive); }}
          onSlip={(run, line) => { setProfile(null); setPrintSlip({ run, line }); }}
        />
      )}

      {/* ---------- Salary advance (D2) ---------- */}
      {advanceTarget && (
        <AdvanceModal
          employee={advanceTarget}
          onClose={() => setAdvanceTarget(null)}
          onDone={(text) => {
            setAdvanceTarget(null);
            setNotice({ ok: true, text });
          }}
        />
      )}

      {/* ---------- Salary slip print (D2) ---------- */}
      {printSlip && (
        <SlipPrint
          run={printSlip.run}
          line={printSlip.line}
          onClose={() => setPrintSlip(null)}
        />
      )}
    </>
  );
}

function EmployeeDetail({
  employee,
  onClose,
  onEdit,
  canWrite,
  onAdvance,
  onSlip,
}: {
  employee: Employee;
  onClose: () => void;
  onEdit: () => void;
  canWrite: boolean;
  onAdvance: () => void;
  onSlip: (run: PayrollRun, line: PayrollRunLine) => void;
}) {
  const { journal, attendance, payrollRuns } = useStore();
  const { role } = useAuth();
  const { t } = useLang();
  const canPayrollWrite = can(role, "payroll", "write");
  const pos = employeePosition(journal, employee.id);
  const composition = salaryPayableComposition(journal);
  const month = currentMonthKey();
  const doc = attendance.find((a) => a.id === attendanceDocId(employee.id, month));
  const sum = attendanceSummary(doc);
  /** Salary history (§2.8): the runs citing this employee, newest
   *  first — figures straight off the run snapshots + events. */
  const history = payrollRuns
    .filter((r) => r.lines.some((l) => l.employeeId === employee.id))
    .sort((a, b) => b.month.localeCompare(a.month) || b.ts.localeCompare(a.ts));

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("staff.profile.aria")}
    >
      <div className="modal" style={{ width: "min(680px, 100%)" }} onClick={(e) => e.stopPropagation()}>
        <h2>{employee.name}</h2>
        <p className="modal-sub">
          {employee.designation || "—"}
          {" · "}
          {employee.phone || t("staff.profile.noPhone")}
          {employee.joinDateISO ? ` · ${t("staff.profile.joined", { date: fmtDate(employee.joinDateISO) })}` : ""}
        </p>

        <h3 style={{ fontSize: "1.05rem", marginBottom: 10 }}>{t("staff.profile.terms")}</h3>
        <div className="table-wrap" style={{ marginBottom: 22 }}>
          <table className="data" style={{ minWidth: 0 }}>
            <tbody>
              <tr>
                <td>{t("staff.form.payBasis")}</td>
                <td>
                  <b>
                    {t(employee.payBasis === "monthly" ? "staff.pay.monthly" : "staff.pay.daily", {
                      amount: fmtPKR(employee.baseAmount),
                    })}
                  </b>
                </td>
              </tr>
              {employee.allowances.map((a, i) => (
                <tr key={i}>
                  <td>{a.label}</td>
                  <td><b>{fmtPKR(a.amount)}</b></td>
                </tr>
              ))}
              {employee.payBasis === "monthly" && (
                <tr>
                  <td>{t("staff.form.paidLeaveDays")}</td>
                  <td><b>{fmtNum(employee.paidLeaveDays)}</b></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <h3 style={{ fontSize: "1.05rem", marginBottom: 10 }}>{t("staff.profile.positionTitle")}</h3>
        <div className="grid-3" style={{ marginBottom: 14 }}>
          <div className="card kpi" style={{ padding: "18px 20px" }}>
            <div>
              <div className="kpi-label">{t("staff.profile.owed")}</div>
              <div className="kpi-value" style={{ fontSize: "1.5rem" }}>{fmtPKR(Math.max(0, -pos))}</div>
            </div>
          </div>
          <div className="card kpi" style={{ padding: "18px 20px" }}>
            <div>
              <div className="kpi-label">{t("staff.profile.advance")}</div>
              <div className="kpi-value" style={{ fontSize: "1.5rem" }}>{fmtPKR(Math.max(0, pos))}</div>
            </div>
          </div>
          <div className="card kpi" style={{ padding: "18px 20px" }}>
            <div>
              <div className="kpi-label">{t("fin.acct.salary_payable")}</div>
              <div className="kpi-value" style={{ fontSize: "1.5rem" }}>{fmtPKR(composition.glBalance)}</div>
            </div>
          </div>
        </div>
        <p className="modal-sub">
          {t("staff.profile.attendanceThisMonth", {
            present: fmtNum(sum.present),
            absent: fmtNum(sum.absent),
            half: fmtNum(sum.half),
            leave: fmtNum(sum.leave),
          })}
        </p>
        <p className="modal-sub">{t("staff.profile.payrollNote")}</p>

        <h3 style={{ fontSize: "1.05rem", marginBottom: 10 }}>{t("pay.history.title")}</h3>
        {history.length === 0 ? (
          <p className="modal-sub">{t("pay.history.empty")}</p>
        ) : (
          <div className="table-wrap" style={{ marginBottom: 22 }}>
            <table className="data" style={{ minWidth: 0 }}>
              <thead>
                <tr>
                  <th>{t("pay.history.col.run")}</th>
                  <th>{t("pay.col.month")}</th>
                  <th>{t("pay.history.col.net")}</th>
                  <th>{t("pay.history.col.paid")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.map((r) => {
                  const line = r.lines.find((l) => l.employeeId === employee.id)!;
                  return (
                    <tr key={r.id}>
                      <td>
                        <b>{r.number ?? t("pay.draftLabel")}</b>{" "}
                        <span className="badge">
                          {t(
                            r.status === "posted"
                              ? "pay.status.posted"
                              : r.status === "reversed"
                                ? "pay.status.reversed"
                                : "pay.status.draft"
                          )}
                        </span>
                      </td>
                      <td>{r.month}</td>
                      <td>{fmtPKR(line.netAccrued)}</td>
                      <td>{fmtPKR(paidForRun(r, employee.id))}</td>
                      <td>
                        {r.status === "posted" && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => onSlip(r, line)}
                          >
                            <IconReceipt /> {t("pay.action.slip")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            <IconClose /> {t("action.close")}
          </button>
          {canPayrollWrite && (
            <button type="button" className="btn btn-ghost" onClick={onAdvance}>
              <IconCash /> {t("pay.action.advance")}
            </button>
          )}
          {canWrite && (
            <button type="button" className="btn btn-primary" onClick={onEdit}>
              <IconEdit /> {t("action.edit")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================ Attendance ============================ */

function AttendanceTab() {
  const { employees, attendance, payrollRuns, setAttendanceMark } = useStore();
  const { role } = useAuth();
  const { t } = useLang();
  const canWrite = can(role, "staffDirectory", "write");
  const [month, setMonth] = useState<string>(() => currentMonthKey());

  const active = useMemo(
    () => employees.filter((e) => e.active).sort((a, b) => a.name.localeCompare(b.name)),
    [employees]
  );
  const dayCount = daysInMonthOf(month);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);
  const docFor = (employeeId: string) =>
    attendance.find((a) => a.id === attendanceDocId(employeeId, month));
  const posted = hasPostedRunForMonth(payrollRuns, month);
  const monthLabel = fmtDate(`${month}-01`);

  const cycle = (e: Employee, day: number) => {
    if (!canWrite) return;
    const cur = docFor(e.id)?.days[String(day)] ?? null;
    setAttendanceMark(e.id, month, day, nextAttendanceMark(cur));
  };

  return (
    <>
      <div className="sticky-bar" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          aria-label={t("att.prevMonth")}
          title={t("att.prevMonth")}
        >
          <IconChevronLeft />
        </button>
        <b style={{ fontSize: "1.05rem" }}>{monthLabel}</b>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          aria-label={t("att.nextMonth")}
          title={t("att.nextMonth")}
          style={{ transform: "scaleX(-1)" }}
        >
          <IconChevronLeft />
        </button>
        <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{t("att.subtitle")}</span>
      </div>

      {posted && (
        <div className="note-box" style={{ marginTop: 0, marginBottom: 18 }} role="status">
          {t("att.postedWarning")}
        </div>
      )}

      {active.length === 0 ? (
        <div className="empty">{t("att.empty")}</div>
      ) : (
        <div className="table-wrap att-scroll">
          <table className="data att-table">
            <thead>
              <tr>
                <th className="att-name-col">{t("att.col.employee")}</th>
                {days.map((d) => (
                  <th key={d} style={{ textAlign: "center", padding: "8px 2px" }}>{d}</th>
                ))}
                <th>{t("att.col.summary")}</th>
              </tr>
            </thead>
            <tbody>
              {active.map((e) => {
                const doc = docFor(e.id);
                const sum = attendanceSummary(doc);
                return (
                  <tr key={e.id}>
                    <td className="att-name-col">
                      <b>{e.name}</b>
                      {e.designation && (
                        <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{e.designation}</div>
                      )}
                    </td>
                    {days.map((d) => {
                      const mark = doc?.days[String(d)] ?? null;
                      const label = mark ? t(MARK_KEY[mark]) : t("att.mark.none");
                      return (
                        <td key={d} style={{ textAlign: "center", padding: "3px 1px" }}>
                          {canWrite ? (
                            <button
                              type="button"
                              className={`att-cell${mark ? ` att-${mark}` : ""}`}
                              onClick={() => cycle(e, d)}
                              aria-label={t("att.cellAria", { name: e.name, day: d, mark: label })}
                              title={label}
                            >
                              {mark ? t(MARK_SHORT[mark]) : "·"}
                            </button>
                          ) : (
                            <span
                              className={`att-cell att-static${mark ? ` att-${mark}` : ""}`}
                              title={label}
                            >
                              {mark ? t(MARK_SHORT[mark]) : "·"}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                      {t("att.summary", {
                        present: fmtNum(sum.present),
                        absent: fmtNum(sum.absent),
                        half: fmtNum(sum.half),
                        leave: fmtNum(sum.leave),
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="note-box">
        {t("att.legend")} {t("att.help")}
      </div>
    </>
  );
}

/* ============================ Payroll (Phase D · D2) ============================
 * Design §2: runs compose from the directory + register (draft —
 * nothing posts), finalise posts the ONE net accrual entry,
 * payments post per event, advances post standalone, and every
 * correction is a reversal. The tab gates on the `payroll`
 * matrix row: owner/accountant write, manager reads (G-D2 —
 * salary figures are visible to the manager deliberately). */

function SlipPrint({
  run,
  line,
  onClose,
}: {
  run: PayrollRun;
  line: PayrollRunLine;
  onClose: () => void;
}) {
  const { journal, employees, settings, branding } = useStore();
  const { t } = useLang();
  const figures = runLineFigures(journal, run, line);
  const designation =
    employees.find((e) => e.id === line.employeeId)?.designation ?? "";
  return (
    <>
      <div className="print-actions no-print">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => window.print()}
        >
          {t("slip.print")}
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          {t("action.close")}
        </button>
      </div>
      <SalarySlipSheet
        run={run}
        line={line}
        designation={designation}
        figures={figures}
        settings={settings}
        assets={brandingDataUrls(branding)}
      />
    </>
  );
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
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
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="modal-sub">{body}</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            <IconClose /> {t("action.cancel")}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The shared money-out form for a payroll payment: amount +
 *  method + account, with the live-audit negative-balance
 *  warning raised BEFORE anything posts (warn, never block). */
function PayModal({
  title,
  caption,
  remainingText,
  defaultAmount,
  maxAmount,
  onClose,
  onPost,
}: {
  title: string;
  caption?: string;
  /** The fully-formatted "still to pay" line shown to the desk. */
  remainingText: string;
  /** Pre-filled amount: what settles the line exactly (net of
   *  the advance recovery the journal already derives). */
  defaultAmount: number;
  /** The hard ceiling the store enforces (the run's net less
   *  cash already paid — paying up to it carries any advance
   *  forward instead of recovering it). */
  maxAmount: number;
  onClose: () => void;
  onPost: (input: {
    amount: number;
    method: Exclude<PayMethod, "credit">;
    accountId: string | null;
  }) => boolean;
}) {
  const { journal, accounts } = useStore();
  const { t } = useLang();
  const [amount, setAmount] = useState(String(defaultAmount > 0 ? defaultAmount : ""));
  const [method, setMethod] = useState<Exclude<PayMethod, "credit">>("cash");
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState("");
  const [negWarn, setNegWarn] = useState<{
    accountName: string;
    amount: number;
    balanceAfter: number;
  } | null>(null);

  const attempt = () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || !(amt > 0) || amt > maxAmount + 0.001) {
      setError(t("pay.pay.errAmount"));
      return;
    }
    const preview = outflowPreview(journal, accounts, {
      method,
      accountId: accountId || null,
      amount: amt,
    });
    if (preview && preview.balanceAfter < 0) {
      setNegWarn({
        accountName: preview.account.name,
        amount: amt,
        balanceAfter: preview.balanceAfter,
      });
      return;
    }
    if (onPost({ amount: amt, method, accountId: accountId || null })) onClose();
    else setError(t("pay.pay.errAmount"));
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {caption && <p className="modal-sub">{caption}</p>}
        <p className="modal-sub">{remainingText}</p>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            attempt();
          }}
        >
          <div className="form-grid">
            <div className="field">
              <label htmlFor="pay-amount">{t("pay.pay.amount")}</label>
              <input
                id="pay-amount"
                type="number"
                min={0}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="pay-method">{t("pay.pay.method")}</label>
              <select
                id="pay-method"
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value as Exclude<PayMethod, "credit">);
                  setAccountId("");
                }}
              >
                {PAY_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(PAY_METHOD_KEY[m])}
                  </option>
                ))}
              </select>
            </div>
            <AccountPicker
              method={method}
              value={accountId}
              onChange={setAccountId}
              label={t("pay.pay.account")}
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <IconClose /> {t("action.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              <IconCash /> {t("pay.action.pay")}
            </button>
          </div>
        </form>
      </div>
      {negWarn && (
        <NegativeBalanceWarning
          accountName={negWarn.accountName}
          amount={negWarn.amount}
          balanceAfter={negWarn.balanceAfter}
          onCancel={() => setNegWarn(null)}
          onConfirm={() => {
            const amt = Number(amount);
            setNegWarn(null);
            if (onPost({ amount: amt, method, accountId: accountId || null })) {
              onClose();
            } else {
              setError(t("pay.pay.errAmount"));
            }
          }}
        />
      )}
    </div>
  );
}

function AdvanceModal({
  employee,
  onClose,
  onDone,
}: {
  employee: Employee;
  onClose: () => void;
  onDone: (text: string) => void;
}) {
  const { journal, accounts, giveSalaryAdvance } = useStore();
  const { t } = useLang();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Exclude<PayMethod, "credit">>("cash");
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState("");
  const [negWarn, setNegWarn] = useState<{
    accountName: string;
    amount: number;
    balanceAfter: number;
  } | null>(null);

  const post = (amt: number): boolean =>
    giveSalaryAdvance({
      employeeId: employee.id,
      amount: amt,
      method,
      accountId: accountId || null,
    }) !== null;

  const attempt = () => {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || !(amt > 0)) {
      setError(t("pay.advance.errAmount"));
      return;
    }
    const preview = outflowPreview(journal, accounts, {
      method,
      accountId: accountId || null,
      amount: amt,
    });
    if (preview && preview.balanceAfter < 0) {
      setNegWarn({
        accountName: preview.account.name,
        amount: amt,
        balanceAfter: preview.balanceAfter,
      });
      return;
    }
    if (post(amt)) {
      onDone(t("pay.advance.done", { amount: fmtPKR(amt), name: employee.name }));
    } else {
      setError(t("pay.advance.errAmount"));
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("pay.advance.title", { name: employee.name })}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("pay.advance.title", { name: employee.name })}</h2>
        <p className="modal-sub">{t("pay.advance.caption")}</p>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            attempt();
          }}
        >
          <div className="form-grid">
            <div className="field">
              <label htmlFor="adv-amount">{t("pay.pay.amount")}</label>
              <input
                id="adv-amount"
                type="number"
                min={0}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="adv-method">{t("pay.pay.method")}</label>
              <select
                id="adv-method"
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value as Exclude<PayMethod, "credit">);
                  setAccountId("");
                }}
              >
                {PAY_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(PAY_METHOD_KEY[m])}
                  </option>
                ))}
              </select>
            </div>
            <AccountPicker
              method={method}
              value={accountId}
              onChange={setAccountId}
              label={t("pay.pay.account")}
            />
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <IconClose /> {t("action.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              <IconCash /> {t("pay.action.advance")}
            </button>
          </div>
        </form>
      </div>
      {negWarn && (
        <NegativeBalanceWarning
          accountName={negWarn.accountName}
          amount={negWarn.amount}
          balanceAfter={negWarn.balanceAfter}
          onCancel={() => setNegWarn(null)}
          onConfirm={() => {
            const amt = Number(amount);
            setNegWarn(null);
            if (post(amt)) {
              onDone(
                t("pay.advance.done", { amount: fmtPKR(amt), name: employee.name })
              );
            } else {
              setError(t("pay.advance.errAmount"));
            }
          }}
        />
      )}
    </div>
  );
}

function PayrollTab() {
  const store = useStore();
  const { payrollRuns, journal } = store;
  const { role } = useAuth();
  const { t } = useLang();
  const canWrite = can(role, "payroll", "write");

  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [month, setMonth] = useState(currentMonthKey());
  const [openId, setOpenId] = useState<string | null>(null);
  const [advanceTarget, setAdvanceTarget] = useState<Employee | null>(null);

  const composition = salaryPayableComposition(journal);
  const sortedRuns = useMemo(
    () =>
      [...payrollRuns].sort(
        (a, b) => b.month.localeCompare(a.month) || b.ts.localeCompare(a.ts)
      ),
    [payrollRuns]
  );
  const openRun = openId ? payrollRuns.find((r) => r.id === openId) ?? null : null;
  const latestPosted =
    sortedRuns.find((r) => r.status === "posted") ?? null;

  const compose = () => {
    const id = store.composePayrollRun(month);
    if (id) {
      setNotice({ ok: true, text: t("pay.notice.composed", { month }) });
      setOpenId(id);
    }
  };

  if (openRun) {
    return (
      <>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: 16 }}
          onClick={() => setOpenId(null)}
        >
          <IconChevronLeft /> {t("pay.back")}
        </button>
        {openRun.status === "draft" ? (
          <RunEditor
            run={openRun}
            onNotice={setNotice}
            onClose={() => setOpenId(null)}
          />
        ) : (
          <RunDetail
            run={openRun}
            onNotice={setNotice}
            onAdvanceEmployee={(emp) => setAdvanceTarget(emp)}
          />
        )}
        {advanceTarget && (
          <AdvanceModal
            employee={advanceTarget}
            onClose={() => setAdvanceTarget(null)}
            onDone={(text) => {
              setAdvanceTarget(null);
              setNotice({ ok: true, text });
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      {notice && (
        <div
          className={notice.ok ? "note-box" : "form-error"}
          style={notice.ok ? { marginTop: 0, marginBottom: 22 } : { marginBottom: 22 }}
          role="status"
        >
          {notice.text}
        </div>
      )}

      <div className="toolbar">
        <div>
          <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>{t("pay.title")}</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.92rem", maxWidth: 640 }}>
            {t("pay.subtitle")}
          </p>
        </div>
        {canWrite && (
          <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="pay-month">{t("pay.monthLabel")}</label>
              <input
                id="pay-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <button type="button" className="btn btn-primary" onClick={compose}>
              <IconPlus /> {t("pay.compose")}
            </button>
          </div>
        )}
      </div>

      {composition.unassignedAccrued > 0 && (
        <section className="card" aria-label={t("pay.bucket.title")} style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: "1.15rem", marginBottom: 4 }}>{t("pay.bucket.title")}</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 12 }}>
            {t("pay.bucket.caption", { amount: fmtPKR(composition.unassignedAccrued) })}
          </p>
          {canWrite && latestPosted && (
            <BucketPayButton run={latestPosted} onNotice={setNotice} />
          )}
        </section>
      )}

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>{t("pay.col.run")}</th>
              <th>{t("pay.col.month")}</th>
              <th>{t("pay.col.status")}</th>
              <th>{t("pay.col.gross")}</th>
              <th>{t("pay.col.deductions")}</th>
              <th>{t("pay.col.net")}</th>
              <th>{t("pay.col.paid")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sortedRuns.map((r) => (
              <tr key={r.id}>
                <td>
                  <b>{r.number ?? t("pay.draftLabel")}</b>
                </td>
                <td>{r.month}</td>
                <td>
                  <span
                    className={`badge${r.status === "posted" ? " green" : r.status === "reversed" ? " red" : ""}`}
                  >
                    {t(
                      r.status === "posted"
                        ? "pay.status.posted"
                        : r.status === "reversed"
                          ? "pay.status.reversed"
                          : "pay.status.draft"
                    )}
                  </span>
                </td>
                <td>{fmtPKR(r.totals.gross)}</td>
                <td>{fmtPKR(r.totals.deductions)}</td>
                <td>
                  <b>{fmtPKR(r.totals.netAccrued)}</b>
                </td>
                <td>{fmtPKR(r.payments.reduce((s, p) => s + p.amount, 0))}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setOpenId(r.id)}
                  >
                    {t("pay.action.open")}
                  </button>
                </td>
              </tr>
            ))}
            {sortedRuns.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty">{t("pay.empty.none")}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="note-box">{t("pay.casualHint")}</div>

      {advanceTarget && (
        <AdvanceModal
          employee={advanceTarget}
          onClose={() => setAdvanceTarget(null)}
          onDone={(text) => {
            setAdvanceTarget(null);
            setNotice({ ok: true, text });
          }}
        />
      )}
    </>
  );
}

function BucketPayButton({
  run,
  onNotice,
}: {
  run: PayrollRun;
  onNotice: (n: { ok: boolean; text: string }) => void;
}) {
  const store = useStore();
  const { journal } = store;
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const remaining = salaryPayableComposition(journal).unassignedAccrued;
  return (
    <>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>
        <IconCash /> {t("pay.action.pay")}
      </button>
      {open && (
        <PayModal
          title={t("pay.pay.title")}
          remainingText={t("pay.pay.bucketRemaining", { amount: fmtPKR(remaining) })}
          defaultAmount={remaining}
          maxAmount={remaining}
          onClose={() => setOpen(false)}
          onPost={(input) => {
            const ok = store.payPayrollEmployee(run.id, {
              employeeId: null,
              amount: input.amount,
              method: input.method,
              accountId: input.accountId,
            });
            if (ok) {
              onNotice({
                ok: true,
                text: t("pay.notice.bucketPaid", { amount: fmtPKR(input.amount) }),
              });
            }
            return ok;
          }}
        />
      )}
    </>
  );
}

/* ------------------------- draft editor ------------------------- */

function RunEditor({
  run,
  onNotice,
  onClose,
}: {
  run: PayrollRun;
  onNotice: (n: { ok: boolean; text: string }) => void;
  onClose: () => void;
}) {
  const store = useStore();
  const { payrollRuns, settings } = store;
  const { role } = useAuth();
  const { t } = useLang();
  const canWrite = can(role, "payroll", "write");
  const isOwner = role === "owner";
  const [lines, setLines] = useState<PayrollRunLine[]>(() =>
    run.lines.map((l) => ({
      ...l,
      allowances: l.allowances.map((a) => ({ ...a })),
      deductions: l.deductions.map((d) => ({ ...d })),
    }))
  );
  const [note, setNote] = useState(run.note);
  const [confirmFinalise, setConfirmFinalise] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totals = payrollRunTotals(lines.map(payrollLineTotals));
  const postedSibling = payrollRuns.some(
    (r) => r.id !== run.id && r.month === run.month && r.status === "posted"
  );
  const nextNumber = nextDocNumber(
    "payrollRun",
    payrollRuns.map((r) => r.number),
    settings
  );

  const patchLine = (i: number, patch: Partial<PayrollRunLine>) =>
    setLines((prev) =>
      prev.map((l, j) => (j === i ? payrollLineTotals({ ...l, ...patch }) : l))
    );
  const patchRows = (
    i: number,
    kind: "allowances" | "deductions",
    rows: Array<{ label: string; amount: number }>
  ) => patchLine(i, { [kind]: rows } as Partial<PayrollRunLine>);

  const save = () => {
    if (store.updatePayrollRun(run.id, lines, note)) {
      onNotice({ ok: true, text: t("pay.notice.saved") });
    }
  };

  const finalise = () => {
    // Persist the desk's edits first — what finalises is exactly
    // what the desk saw (§2.3).
    if (!store.updatePayrollRun(run.id, lines, note)) return;
    if (store.finalisePayrollRun(run.id)) {
      onNotice({
        ok: true,
        text: t("pay.notice.finalised", { number: nextNumber }),
      });
      onClose();
    }
    setConfirmFinalise(false);
  };

  return (
    <>
      <h2 style={{ fontSize: "1.3rem", marginBottom: 4 }}>
        {t("pay.editor.title", { month: run.month })}
      </h2>
      <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 18, maxWidth: 720 }}>
        {t("pay.editor.caption")}
      </p>

      {postedSibling && (
        <div className="form-error" style={{ marginBottom: 18 }}>
          {t("pay.finalise.postedMonth", { month: run.month })}
        </div>
      )}

      <div style={{ display: "grid", gap: 18 }}>
        {lines.map((l, i) => (
          <section key={l.employeeId} className="card" aria-label={l.name}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <b>{l.name}</b>
              <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                {t("pay.line.days")}: {fmtNum(l.present)} · {fmtNum(l.absent)} ·{" "}
                {fmtNum(l.half)} · {fmtNum(l.leave)} — {t("pay.line.earned")}:{" "}
                <b>{fmtPKR(l.earnedBase)}</b>
              </span>
            </div>
            {(["allowances", "deductions"] as const).map((kind) => (
              <div key={kind} style={{ marginBottom: 8 }}>
                {l[kind].map((row, ri) => (
                  <div
                    key={ri}
                    style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}
                  >
                    <input
                      type="text"
                      value={row.label}
                      disabled={!canWrite}
                      placeholder={t("staff.form.allowanceLabelPh")}
                      onChange={(e) =>
                        patchRows(
                          i,
                          kind,
                          l[kind].map((r, j) =>
                            j === ri ? { ...r, label: e.target.value } : r
                          )
                        )
                      }
                      style={{ flex: "1 1 200px" }}
                    />
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={row.amount || ""}
                      disabled={!canWrite}
                      placeholder={t("staff.form.allowanceAmountPh")}
                      onChange={(e) =>
                        patchRows(
                          i,
                          kind,
                          l[kind].map((r, j) =>
                            j === ri ? { ...r, amount: Number(e.target.value) || 0 } : r
                          )
                        )
                      }
                      style={{ width: 140 }}
                    />
                    {canWrite && (
                      <button
                        type="button"
                        className="icon-btn danger"
                        aria-label={t("pay.line.removeRow")}
                        title={t("pay.line.removeRow")}
                        onClick={() =>
                          patchRows(i, kind, l[kind].filter((_, j) => j !== ri))
                        }
                      >
                        <IconTrash />
                      </button>
                    )}
                  </div>
                ))}
                {canWrite && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => patchRows(i, kind, [...l[kind], { label: "", amount: 0 }])}
                  >
                    <IconPlus />{" "}
                    {t(kind === "allowances" ? "pay.line.addAllowance" : "pay.line.addDeduction")}
                  </button>
                )}
              </div>
            ))}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                borderTop: "1px solid var(--line)",
                paddingTop: 10,
                flexWrap: "wrap",
              }}
            >
              <span>
                {t("pay.line.gross")}: <b>{fmtPKR(l.gross)}</b>
              </span>
              <span>
                {t("pay.line.deductions")}:{" "}
                <b>{fmtPKR(l.deductions.reduce((s, d) => s + d.amount, 0))}</b>
              </span>
              <span>
                {t("pay.line.net")}: <b>{fmtPKR(l.netAccrued)}</b>
              </span>
            </div>
          </section>
        ))}
      </div>

      <div className="field" style={{ maxWidth: 480, marginTop: 18 }}>
        <label htmlFor="pay-note">{t("pay.noteLabel")}</label>
        <input
          id="pay-note"
          value={note}
          disabled={!canWrite}
          placeholder={t("pay.notePh")}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 14,
          fontSize: "1.05rem",
        }}
      >
        <b>
          {t("pay.col.net")}: {fmtPKR(totals.netAccrued)}
        </b>
      </div>

      {canWrite && (
        <div className="modal-actions" style={{ justifyContent: "flex-start" }}>
          <button type="button" className="btn btn-ghost" onClick={save}>
            {t("pay.saveDraft")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={postedSibling || totals.netAccrued <= 0}
            title={
              postedSibling
                ? t("pay.finalise.postedMonth", { month: run.month })
                : totals.netAccrued <= 0
                  ? t("pay.finalise.nothing")
                  : undefined
            }
            onClick={() => setConfirmFinalise(true)}
          >
            {t("pay.action.finalise")}
          </button>
          {isOwner && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setConfirmDelete(true)}
            >
              <IconTrash /> {t("pay.action.deleteDraft")}
            </button>
          )}
        </div>
      )}

      {confirmFinalise && (
        <ConfirmModal
          title={t("pay.finalise.confirmTitle", { number: nextNumber })}
          body={t("pay.finalise.confirmBody", { net: fmtPKR(totals.netAccrued) })}
          confirmLabel={t("pay.action.finalise")}
          onClose={() => setConfirmFinalise(false)}
          onConfirm={finalise}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title={t("pay.action.deleteDraft")}
          body={t("pay.editor.title", { month: run.month })}
          confirmLabel={t("action.delete")}
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            if (store.deletePayrollRun(run.id)) {
              onNotice({ ok: true, text: t("pay.notice.deleted") });
              onClose();
            }
            setConfirmDelete(false);
          }}
        />
      )}
    </>
  );
}

/* ------------------------- posted run detail ------------------------- */

function RunDetail({
  run,
  onNotice,
  onAdvanceEmployee,
}: {
  run: PayrollRun;
  onNotice: (n: { ok: boolean; text: string }) => void;
  onAdvanceEmployee: (emp: Employee) => void;
}) {
  const store = useStore();
  const { journal, employees } = store;
  const { role } = useAuth();
  const { t } = useLang();
  const canWrite = can(role, "payroll", "write");
  const [payTarget, setPayTarget] = useState<{
    employeeId: string | null;
    name: string;
    remaining: number;
    ceiling: number;
  } | null>(null);
  const [confirmReverseRun, setConfirmReverseRun] = useState(false);
  const [confirmReversePayment, setConfirmReversePayment] = useState<string | null>(null);
  const [printSlip, setPrintSlip] = useState<PayrollRunLine | null>(null);

  const reversedEntryIds = useMemo(
    () => new Set(journal.filter((e) => e.reversesId).map((e) => e.reversesId as string)),
    [journal]
  );
  const totalPaid = run.payments.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: 6,
        }}
      >
        <h2 style={{ fontSize: "1.3rem" }}>
          {run.number ?? t("pay.draftLabel")} · {run.month}{" "}
          <span
            className={`badge${run.status === "posted" ? " green" : " red"}`}
            style={{ verticalAlign: "middle" }}
          >
            {t(run.status === "posted" ? "pay.status.posted" : "pay.status.reversed")}
          </span>
        </h2>
        {canWrite && run.status === "posted" && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setConfirmReverseRun(true)}
          >
            {t("pay.action.reverseRun")}
          </button>
        )}
      </div>
      <p style={{ color: "var(--muted)", fontSize: "0.92rem", marginBottom: 18, maxWidth: 720 }}>
        {t("pay.detail.caption")}
      </p>

      <div className="table-wrap" style={{ marginBottom: 24 }}>
        <table className="data">
          <thead>
            <tr>
              <th>{t("pay.line.employee")}</th>
              <th>{t("pay.det.accrued")}</th>
              <th>{t("pay.det.advanceBefore")}</th>
              <th>{t("pay.det.recovered")}</th>
              <th>{t("pay.det.paid")}</th>
              <th>{t("pay.det.stillOwed")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {run.lines.map((line) => {
              const fig = runLineFigures(journal, run, line);
              /** This run's own unsettled remainder: what the
               *  accrual still owes after the derived advance
               *  recovery and the cash already paid (§2.4/§2.7). */
              const runOwed = Math.max(
                0,
                Math.round((line.netAccrued - fig.advanceRecovered - fig.cashPaid) * 100) / 100
              );
              const cashCeiling = Math.max(0, line.netAccrued - fig.cashPaid);
              const emp = employees.find((e) => e.id === line.employeeId) ?? null;
              return (
                <tr key={line.employeeId}>
                  <td>
                    <b>{line.name}</b>
                  </td>
                  <td>{fmtPKR(line.netAccrued)}</td>
                  <td>{fmtPKR(fig.advanceBefore)}</td>
                  <td>{fmtPKR(fig.advanceRecovered)}</td>
                  <td>{fmtPKR(fig.cashPaid)}</td>
                  <td>
                    {runOwed <= 0 ? (
                      <span className="badge green">{t("pay.det.settled")}</span>
                    ) : (
                      <b>{fmtPKR(runOwed)}</b>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      {canWrite && run.status === "posted" && cashCeiling > 0 && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            setPayTarget({
                              employeeId: line.employeeId,
                              name: line.name,
                              remaining: runOwed,
                              ceiling: cashCeiling,
                            })
                          }
                        >
                          <IconCash /> {t("pay.action.pay")}
                        </button>
                      )}
                      {canWrite && emp && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => onAdvanceEmployee(emp)}
                        >
                          {t("pay.action.advance")}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setPrintSlip(line)}
                      >
                        <IconReceipt /> {t("pay.action.slip")}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize: "1.1rem", marginBottom: 10 }}>{t("pay.payments.title")}</h3>
      {run.payments.length === 0 ? (
        <p style={{ color: "var(--muted)", marginBottom: 24 }}>{t("pay.payments.empty")}</p>
      ) : (
        <div className="table-wrap" style={{ marginBottom: 24 }}>
          <table className="data" style={{ minWidth: 0 }}>
            <thead>
              <tr>
                <th>{t("common.date")}</th>
                <th>{t("pay.line.employee")}</th>
                <th>{t("pay.pay.method")}</th>
                <th>{t("pay.col.paid")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {run.payments.map((p) => (
                <tr key={p.entryId}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDate(p.ts)}</td>
                  <td>
                    {p.employeeId === null
                      ? t("pay.payments.bucketRow")
                      : p.amount < 0
                        ? `${t("pay.payments.reversedRow")} — ${p.name}`
                        : p.name}
                  </td>
                  <td>{t(PAY_METHOD_KEY[p.method as Exclude<PayMethod, "credit">] ?? "common.pay.cash")}</td>
                  <td>
                    <b>{fmtPKR(p.amount)}</b>
                  </td>
                  <td>
                    {canWrite &&
                      run.status === "posted" &&
                      p.amount > 0 &&
                      !reversedEntryIds.has(p.entryId) && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setConfirmReversePayment(p.entryId)}
                        >
                          {t("pay.action.reversePayment")}
                        </button>
                      )}
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={3}>
                  <b>{t("pay.col.paid")}</b>
                </td>
                <td>
                  <b>{fmtPKR(totalPaid)}</b>
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {run.note && <div className="note-box">{run.note}</div>}

      {payTarget && (
        <PayModal
          title={`${t("pay.pay.title")} — ${payTarget.name}`}
          remainingText={t("pay.pay.remaining", { amount: fmtPKR(payTarget.remaining) })}
          defaultAmount={payTarget.remaining}
          maxAmount={payTarget.ceiling}
          onClose={() => setPayTarget(null)}
          onPost={(input) => {
            const ok = store.payPayrollEmployee(run.id, {
              employeeId: payTarget.employeeId,
              amount: input.amount,
              method: input.method,
              accountId: input.accountId,
            });
            if (ok) {
              onNotice({
                ok: true,
                text:
                  payTarget.employeeId === null
                    ? t("pay.notice.bucketPaid", { amount: fmtPKR(input.amount) })
                    : t("pay.notice.paid", {
                        amount: fmtPKR(input.amount),
                        name: payTarget.name,
                      }),
              });
            }
            return ok;
          }}
        />
      )}

      {confirmReverseRun && (
        <ConfirmModal
          title={t("pay.reverse.confirmTitle", { number: run.number ?? "" })}
          body={t("pay.reverse.confirmBody")}
          confirmLabel={t("pay.action.reverseRun")}
          onClose={() => setConfirmReverseRun(false)}
          onConfirm={() => {
            if (store.reversePayrollRun(run.id)) {
              onNotice({
                ok: true,
                text: t("pay.notice.runReversed", { number: run.number ?? "" }),
              });
            }
            setConfirmReverseRun(false);
          }}
        />
      )}
      {confirmReversePayment && (
        <ConfirmModal
          title={t("pay.action.reversePayment")}
          body={t("pay.payments.reversedRow")}
          confirmLabel={t("pay.action.reversePayment")}
          onClose={() => setConfirmReversePayment(null)}
          onConfirm={() => {
            if (store.reversePayrollPayment(run.id, confirmReversePayment)) {
              onNotice({ ok: true, text: t("pay.notice.paymentReversed") });
            }
            setConfirmReversePayment(null);
          }}
        />
      )}

      {printSlip && (
        <SlipPrint run={run} line={printSlip} onClose={() => setPrintSlip(null)} />
      )}
    </>
  );
}
