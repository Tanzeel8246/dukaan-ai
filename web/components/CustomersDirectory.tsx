"use client";

import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useAuth } from "./AuthProvider";
import { useLang } from "./LangProvider";
import { can } from "@/lib/permissions";
import { IconClose, IconEdit, IconPlus, IconSearch, IconTrash, SearchClear } from "./ui";
import { fmtDate, fmtNum, fmtPKR } from "@/lib/format";
import { creditKey, customerOutstanding } from "@/lib/ledger";
import { customerMatches } from "@/lib/search";
import type { BillStatus, Customer } from "@/lib/types";

const BILL_STATUS_KEY = {
  paid: "cust.billStatus.paid",
  held: "cust.billStatus.held",
  voided: "cust.billStatus.voided",
  partially_returned: "cust.billStatus.partiallyReturned",
  returned: "cust.billStatus.returned",
} as const satisfies Record<BillStatus, string>;

const EMPTY_FORM = { name: "", phone: "", address: "", note: "" };

export default function CustomersDirectory() {
  const {
    ready,
    bills,
    customers,
    credits,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  } = useStore();
  const { role } = useAuth();
  /* A3: the directory is read-only for accountants (matrix row
   * customersManage = R); owner/manager/cashier manage it. */
  const canWrite = can(role, "customersManage", "write");
  const { t, lang } = useLang();
  void lang;

  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [profile, setProfile] = useState<Customer | null>(null);

  const filtered = useMemo(() => {
    const list = [...customers].sort((a, b) => a.name.localeCompare(b.name));
    // lib/search: null-safe — a legacy customer missing address/phone
    // must never throw here.
    if (!search.trim()) return list;
    return list.filter((c) => customerMatches(c, search));
  }, [customers, search]);

  const totalPurchasedFor = (customerId: string) =>
    bills
      .filter(
        (b) => b.customerId === customerId && b.status !== "held" && b.status !== "voided"
      )
      .reduce((a, b) => a + b.total, 0);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, address: c.address, note: c.note });
    setFormError("");
    setFormOpen(true);
  };

  const submitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError(t("cust.form.nameRequired"));
      return;
    }
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      note: form.note.trim(),
    };
    if (editing) {
      updateCustomer(editing.id, payload);
      setNotice({ ok: true, text: t("cust.notice.updated", { name: payload.name }) });
    } else {
      addCustomer(payload);
      setNotice({ ok: true, text: t("cust.notice.added", { name: payload.name }) });
    }
    setFormOpen(false);
  };

  const deleteBlockReason = (c: Customer): string | null => {
    const outstanding = customerOutstanding(credits, c.id);
    if (outstanding > 0)
      return t("cust.delete.blocked", { amount: fmtPKR(outstanding) });
    return null;
  };

  if (!ready) {
    return (
      <div className="section">
        <div className="container">
          <div className="empty">{t("common.loading")}</div>
        </div>
      </div>
    );
  }

  const profileBills = profile
    ? bills
        .filter((b) => b.customerId === profile.id)
        .slice()
        .sort((a, b) => b.ts.localeCompare(a.ts))
    : [];
  const profileCredits = profile
    ? credits
        .filter((c) => creditKey(c) === profile.id)
        .slice()
        .sort((a, b) => b.ts.localeCompare(a.ts))
    : [];
  const profileOutstanding = profile ? customerOutstanding(credits, profile.id) : 0;

  return (
    <div className="section-sm">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">{t("cust.eyebrow")}</span>
          <h1 className="h2">{t("cust.title")}</h1>
          <p className="lead">{t("cust.subtitle")}</p>
        </div>

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
              placeholder={t("cust.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t("cust.searchAria")}
            />
            {search && (
              <SearchClear
                onClear={() => setSearch("")}
                label={t("action.clearSearch")}
              />
            )}
          </div>
          {canWrite && (
            <button type="button" className="btn btn-primary" onClick={openAdd}>
              <IconPlus /> {t("cust.add")}
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>{t("cust.th.name")}</th>
                <th>{t("cust.th.phone")}</th>
                <th>{t("cust.th.address")}</th>
                <th>{t("cust.th.totalPurchased")}</th>
                <th>{t("cust.th.creditOutstanding")}</th>
                <th>{t("cust.th.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const purchased = totalPurchasedFor(c.id);
                const outstanding = customerOutstanding(credits, c.id);
                return (
                  <tr key={c.id}>
                    <td>
                      <b>{c.name}</b>
                      {c.note && (
                        <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{c.note}</div>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{c.phone || "—"}</td>
                    <td>{c.address || "—"}</td>
                    <td>{fmtPKR(purchased)}</td>
                    <td>
                      {outstanding > 0 ? (
                        <span className="badge red">
                          {t("cust.badge.due", { amount: fmtPKR(outstanding) })}
                        </span>
                      ) : (
                        <span className="badge green">{t("cust.badge.clear")}</span>
                      )}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setProfile(c)}
                        >
                          {t("cust.action.view")}
                        </button>
                        {canWrite && (
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => openEdit(c)}
                            aria-label={t("cust.aria.edit", { name: c.name })}
                            title={t("action.edit")}
                          >
                            <IconEdit />
                          </button>
                        )}
                        {canWrite && (
                          <button
                            type="button"
                            className="icon-btn danger"
                            onClick={() => setDeleteTarget(c)}
                            aria-label={t("cust.aria.delete", { name: c.name })}
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
                  <td colSpan={6}>
                    <div className="empty">
                      {customers.length === 0
                        ? t("cust.empty.none")
                        : t("cust.empty.noMatch")}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="note-box">{t("cust.noteBox")}</div>

        {/* ---------- Add / Edit customer ---------- */}
        {formOpen && (
          <div
            className="modal-backdrop"
            onClick={() => setFormOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={editing ? t("cust.form.editTitle") : t("cust.form.addTitle")}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{editing ? t("cust.form.editTitle") : t("cust.form.addTitle")}</h2>
              <p className="modal-sub">
                {editing ? t("cust.form.editSub") : t("cust.form.addSub")}
              </p>
              <form className="form" onSubmit={submitForm}>
                {formError && <div className="form-error">{formError}</div>}
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="cu-name">{t("cust.form.name")}</label>
                    <input
                      id="cu-name"
                      value={form.name}
                      onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                      placeholder={t("cust.form.namePh")}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="cu-phone">{t("cust.form.phone")}</label>
                    <input
                      id="cu-phone"
                      value={form.phone}
                      onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                      placeholder={t("cust.form.phonePh")}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="cu-address">{t("cust.form.address")}</label>
                    <input
                      id="cu-address"
                      value={form.address}
                      onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                      placeholder={t("cust.form.addressPh")}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="cu-note">{t("cust.form.note")}</label>
                    <input
                      id="cu-note"
                      value={form.note}
                      onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))}
                      placeholder={t("cust.form.notePh")}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setFormOpen(false)}>
                    <IconClose /> {t("action.cancel")}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editing ? t("cust.form.saveChanges") : t("cust.add")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ---------- Delete customer ---------- */}
        {deleteTarget && (
          <div
            className="modal-backdrop"
            onClick={() => setDeleteTarget(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t("cust.delete.aria")}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>{t("cust.delete.title")}</h2>
              <p className="modal-sub">
                {t("cust.delete.body", { name: deleteTarget.name })}
              </p>
              {deleteBlockReason(deleteTarget) ? (
                <>
                  <div className="form-error">{deleteBlockReason(deleteTarget)}</div>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                      {t("action.close")}
                    </button>
                  </div>
                </>
              ) : (
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
                    {t("cust.delete.keep")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      deleteCustomer(deleteTarget.id);
                      setNotice({
                        ok: true,
                        text: t("cust.notice.deleted", { name: deleteTarget.name }),
                      });
                      setDeleteTarget(null);
                    }}
                  >
                    <IconTrash /> {t("action.delete")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------- Profile ---------- */}
        {profile && (
          <div
            className="modal-backdrop"
            onClick={() => setProfile(null)}
            role="dialog"
            aria-modal="true"
            aria-label={t("cust.profile.aria")}
          >
            <div className="modal" style={{ width: "min(760px, 100%)" }} onClick={(e) => e.stopPropagation()}>
              <h2>{profile.name}</h2>
              <p className="modal-sub">
                {profile.phone || t("cust.profile.noPhone")}
                {profile.address ? ` · ${profile.address}` : ""}
                {profile.note ? ` · ${profile.note}` : ""}
              </p>

              <div className="grid-3" style={{ marginBottom: 22 }}>
                <div className="card kpi" style={{ padding: "18px 20px" }}>
                  <div>
                    <div className="kpi-label">{t("cust.profile.outstanding")}</div>
                    <div className="kpi-value" style={{ fontSize: "1.5rem" }}>
                      {fmtPKR(profileOutstanding)}
                    </div>
                    <div className="kpi-sub">{t("cust.profile.outstandingSub")}</div>
                  </div>
                </div>
                <div className="card kpi" style={{ padding: "18px 20px" }}>
                  <div>
                    <div className="kpi-label">{t("cust.profile.totalPurchased")}</div>
                    <div className="kpi-value" style={{ fontSize: "1.5rem" }}>
                      {fmtPKR(totalPurchasedFor(profile.id))}
                    </div>
                    <div className="kpi-sub">
                      {t("cust.profile.billsSub", {
                        count: fmtNum(
                          profileBills.filter(
                            (b) => b.status !== "held" && b.status !== "voided"
                          ).length
                        ),
                      })}
                    </div>
                  </div>
                </div>
                <div className="card kpi" style={{ padding: "18px 20px" }}>
                  <div>
                    <div className="kpi-label">{t("cust.profile.khata")}</div>
                    <div className="kpi-value" style={{ fontSize: "1.5rem" }}>
                      {fmtNum(profileCredits.length)}
                    </div>
                    <div className="kpi-sub">{t("cust.profile.khataSub")}</div>
                  </div>
                </div>
              </div>

              <h3 style={{ fontSize: "1.1rem", marginBottom: 10 }}>
                {t("cust.profile.purchaseHistory")}
              </h3>
              {profileBills.length === 0 ? (
                <div className="empty" style={{ padding: "24px 20px" }}>
                  {t("cust.profile.noBills")}
                </div>
              ) : (
                <div className="table-wrap" style={{ marginBottom: 22 }}>
                  <table className="data" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th>{t("cust.profile.th.billNo")}</th>
                        <th>{t("cust.profile.th.date")}</th>
                        <th>{t("cust.profile.th.total")}</th>
                        <th>{t("cust.profile.th.status")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileBills.map((b) => (
                        <tr key={b.id}>
                          <td>#{b.billNo}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{fmtDate(b.ts)}</td>
                          <td><b>{fmtPKR(b.total)}</b></td>
                          <td>
                            {b.status === "paid" ? (
                              <span className="badge green">{t(BILL_STATUS_KEY[b.status])}</span>
                            ) : b.status === "held" ? (
                              <span className="badge amber">{t(BILL_STATUS_KEY[b.status])}</span>
                            ) : b.status === "voided" ? (
                              <span className="badge red">{t(BILL_STATUS_KEY[b.status])}</span>
                            ) : (
                              <span className="badge amber">{t(BILL_STATUS_KEY[b.status])}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <h3 style={{ fontSize: "1.1rem", marginBottom: 10 }}>
                {t("cust.profile.creditLedger")}
              </h3>
              {profileCredits.length === 0 ? (
                <div className="empty" style={{ padding: "24px 20px" }}>
                  {t("cust.profile.noCredit")}
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="data" style={{ minWidth: 0 }}>
                    <thead>
                      <tr>
                        <th>{t("cust.profile.th.date")}</th>
                        <th>{t("cust.profile.th.kind")}</th>
                        <th>{t("cust.profile.th.amount")}</th>
                        <th>{t("cust.profile.th.note")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profileCredits.map((c) => (
                        <tr key={c.id}>
                          <td style={{ whiteSpace: "nowrap" }}>{fmtDate(c.ts)}</td>
                          <td>
                            {c.kind === "credit" ? (
                              <span className="badge red">{t("cust.credit.given")}</span>
                            ) : (
                              <span className="badge green">{t("cust.credit.received")}</span>
                            )}
                          </td>
                          <td><b>{fmtPKR(c.amount)}</b></td>
                          <td>{c.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setProfile(null)}>
                  <IconClose /> {t("action.close")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
