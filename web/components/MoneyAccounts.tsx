"use client";

/**
 * Dukaan AI — money accounts UI (Phase A · A2).
 *
 * Shared pieces:
 *  - <AccountPicker> — desk-side account choice for a payment method.
 *    Renders nothing when the method's bucket holds ≤ 1 live account
 *    (the single-account shop keeps today's exact UX, design §1.3).
 *  - <TransferModal> — inter-account transfer (one balanced journal
 *    entry via the store's transferFunds).
 *  - <MoneyAccountsSection> — Settings management surface: live
 *    balances, add / rename / archive, per-method defaults, transfer.
 *    Management is owner-only (the store and the rules both refuse
 *    staff); the section renders read-only for staff.
 */
import { useMemo, useState } from "react";
import { useStore } from "./StoreProvider";
import { useLang } from "./LangProvider";
import { IconCash, IconClose, IconPlus, IconWallet } from "./ui";
import { fmtPKR } from "@/lib/format";
import type { I18nKey } from "@/lib/i18n";
import type { MoneyAccount, PayMethod } from "@/lib/types";
import {
  accountsBucketBalance,
  defaultAccountForMethod,
  glForAccount,
  moneyAccountBalance,
  outflowPreview,
} from "@/lib/ledger";

const METHODS: Array<Exclude<PayMethod, "credit">> = [
  "cash",
  "jazzcash",
  "easypaisa",
  "bank",
];

const PAY_KEY: Record<Exclude<PayMethod, "credit">, I18nKey> = {
  cash: "common.pay.cash",
  jazzcash: "common.pay.jazzcash",
  easypaisa: "common.pay.easypaisa",
  bank: "common.pay.bank",
};

const KIND_KEY: Record<MoneyAccount["kind"], I18nKey> = {
  cash: "settings.acct.kindCash",
  wallet: "settings.acct.kindWallet",
  bank: "settings.acct.kindBank",
};

export function kindLabelKey(kind: MoneyAccount["kind"]): I18nKey {
  return KIND_KEY[kind];
}

/** Live accounts that can settle a payment method (its GL bucket). */
export function eligibleAccounts(
  accounts: MoneyAccount[],
  method: PayMethod
): MoneyAccount[] {
  const bucket = method === "cash" ? "cash" : "wallet";
  return accounts
    .filter((a) => !a.archived && glForAccount(a) === bucket)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function AccountPicker({
  method,
  value,
  onChange,
  label,
}: {
  method: PayMethod;
  /** Selected account id; "" = the method default (resolved at posting). */
  value: string;
  onChange: (accountId: string) => void;
  label?: string;
}) {
  const { accounts } = useStore();
  const { t } = useLang();
  const eligible = eligibleAccounts(accounts, method);
  if (eligible.length <= 1) return null;
  const fallback = defaultAccountForMethod(accounts, method);
  const effective = value || fallback?.id || "";
  return (
    <div className="field">
      {label !== undefined && <label>{label}</label>}
      <select
        value={effective}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t("common.account")}
      >
        {eligible.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {fallback && a.id === fallback.id
              ? ` · ${t("settings.acct.defaultShort")}`
              : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Live-audit Fix 2: the shared negative-balance confirmation. An
 * outflow that would drive its money account below zero is warned
 * about BEFORE it posts — never blocked (informal overdrafts are
 * real), never silent (a −45,000 account sat unnoticed in the
 * audit). Every money-out desk (expenses, supplier payments,
 * transfers) raises this same modal from `outflowPreview`.
 */
export function NegativeBalanceWarning({
  accountName,
  amount,
  balanceAfter,
  onConfirm,
  onCancel,
}: {
  accountName: string;
  amount: number;
  balanceAfter: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useLang();
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t("fin.neg.title")}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("fin.neg.title")}</h2>
        <p className="modal-sub">
          {t("fin.neg.body", {
            amount: fmtPKR(amount),
            account: accountName,
            balance: fmtPKR(balanceAfter),
          })}
        </p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            <IconClose /> {t("action.cancel")}
          </button>
          <button type="button" className="btn btn-primary" onClick={onConfirm}>
            {t("fin.neg.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TransferModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone?: (text: string) => void;
}) {
  const { accounts, journal, transferFunds } = useStore();
  const { t } = useLang();
  const live = useMemo(
    () =>
      accounts
        .filter((a) => !a.archived)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [accounts]
  );
  const [fromId, setFromId] = useState(live[0]?.id ?? "");
  const [toId, setToId] = useState(live[1]?.id ?? live[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [negWarn, setNegWarn] = useState<{
    accountName: string;
    amount: number;
    balanceAfter: number;
  } | null>(null);

  const doTransfer = (amt: number) => {
    const from = live.find((a) => a.id === fromId);
    const to = live.find((a) => a.id === toId);
    const ok = transferFunds({
      fromAccountId: fromId,
      toAccountId: toId,
      amount: amt,
      note: note.trim(),
    });
    if (!ok) {
      setError(t("settings.acct.errSame"));
      return;
    }
    onDone?.(
      t("settings.acct.transferDone", {
        amount: fmtPKR(amt),
        from: from?.name ?? "",
        to: to?.name ?? "",
      })
    );
    onClose();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError(t("settings.acct.errAmount"));
      return;
    }
    if (!fromId || !toId || fromId === toId) {
      setError(t("settings.acct.errSame"));
      return;
    }
    // Fix 2: warn (never block) when the transfer overdraws its source.
    const from = live.find((a) => a.id === fromId);
    const preview = outflowPreview(journal, accounts, {
      method: from?.method ?? (from?.kind === "cash" ? "cash" : "bank"),
      accountId: fromId,
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
    doTransfer(amt);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("settings.acct.transferTitle")}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("settings.acct.transferTitle")}</h2>
        <form className="form" onSubmit={submit} style={{ marginTop: 14 }}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-grid">
            <div className="field">
              <label htmlFor="tr-from">{t("settings.acct.from")}</label>
              <select
                id="tr-from"
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
              >
                {live.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="tr-to">{t("settings.acct.to")}</label>
              <select
                id="tr-to"
                value={toId}
                onChange={(e) => setToId(e.target.value)}
              >
                {live.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="tr-amount">{t("settings.acct.amount")}</label>
              <input
                id="tr-amount"
                type="number"
                min={0}
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="tr-note">{t("settings.acct.note")}</label>
              <input
                id="tr-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("settings.acct.notePlaceholder")}
              />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              <IconClose /> {t("action.cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              <IconCash /> {t("settings.acct.doTransfer")}
            </button>
          </div>
        </form>
      </div>
      {negWarn && (
        <NegativeBalanceWarning
          accountName={negWarn.accountName}
          amount={negWarn.amount}
          balanceAfter={negWarn.balanceAfter}
          onConfirm={() => {
            const amt = negWarn.amount;
            setNegWarn(null);
            doTransfer(amt);
          }}
          onCancel={() => setNegWarn(null)}
        />
      )}
    </div>
  );
}

export default function MoneyAccountsSection() {
  const {
    accounts,
    journal,
    isStaff,
    addMoneyAccount,
    renameMoneyAccount,
    archiveMoneyAccount,
    setDefaultMoneyAccount,
  } = useStore();
  const { t } = useLang();

  const [notice, setNotice] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<MoneyAccount["kind"]>("cash");
  const [newMethod, setNewMethod] = useState<string>("");
  const [addError, setAddError] = useState("");

  const sorted = useMemo(
    () => [...accounts].sort((a, b) => a.sortOrder - b.sortOrder),
    [accounts]
  );
  const liveAccounts = sorted.filter((a) => !a.archived);
  const archivedAccounts = sorted.filter((a) => a.archived);

  const methodOptions = (kind: MoneyAccount["kind"]): Array<Exclude<PayMethod, "credit">> =>
    kind === "cash" ? ["cash"] : ["jazzcash", "easypaisa", "bank"];

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setAddError(t("settings.acct.errName"));
      return;
    }
    setAddError("");
    addMoneyAccount({
      name: newName,
      kind: newKind,
      method: (newMethod || null) as PayMethod | null,
    });
    setNewName("");
    setNewMethod("");
  };

  const saveRename = (id: string) => {
    renameMoneyAccount(id, renameText);
    setRenamingId(null);
  };

  const row = (a: MoneyAccount) => {
    const ownBalance = moneyAccountBalance(journal, a);
    /* Shell/polish fix A (display scope only): as on the Finance
     * cards, a legacy account's headline is its GL bucket total —
     * the figure the cash book, journal and trial balance show —
     * with the per-account breakdown beneath it. */
    const bucket = a.legacyFor
      ? {
          total: accountsBucketBalance(journal, accounts, a.legacyFor),
          members: sorted
            .filter((m) => glForAccount(m) === a.legacyFor)
            .map((m) => ({ account: m, balance: moneyAccountBalance(journal, m) })),
        }
      : null;
    const balance = bucket ? bucket.total : ownBalance;
    return (
      <div
        key={a.id}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "10px 0",
          borderBottom: "1px solid var(--line)",
          opacity: a.archived ? 0.55 : 1,
        }}
      >
        <div style={{ display: "grid", gap: 2 }}>
          <span style={{ fontWeight: 700 }}>
            {a.name}{" "}
            <span style={{ color: "var(--muted)", fontWeight: 500, fontSize: "0.85rem" }}>
              · {t(KIND_KEY[a.kind])}
            </span>
          </span>
          <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            {a.archived
              ? t("settings.acct.archived")
              : a.method
                ? t("settings.acct.defaultBadge", { method: t(PAY_KEY[a.method as Exclude<PayMethod, "credit">]) })
                : t("settings.acct.noMethod")}
            {a.legacyFor ? ` · ${t("settings.acct.legacyNote")}` : ""}
          </span>
          {balance < 0 && (
            <span style={{ color: "var(--danger)", fontSize: "0.85rem", fontWeight: 600 }}>
              {t("fin.acct.negative")}
            </span>
          )}
          {bucket && bucket.members.length > 1 && (
            <span style={{ display: "grid", gap: 2, marginTop: 4 }}>
              <span style={{ color: "var(--muted)", fontSize: "0.76rem", fontWeight: 700 }}>
                {t("fin.acct.bucketBreakdown")}
              </span>
              {bucket.members.map(({ account: m, balance: mb }) => (
                <span
                  key={m.id}
                  style={{ display: "flex", gap: 14, fontSize: "0.85rem" }}
                >
                  <span style={{ color: "var(--muted)" }}>{m.name}</span>
                  <b style={mb < 0 ? { color: "var(--danger)" } : undefined}>
                    {fmtPKR(mb)}
                  </b>
                </span>
              ))}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            {t("settings.acct.balance")}
          </span>
          <b style={balance < 0 ? { color: "var(--danger)" } : undefined}>{fmtPKR(balance)}</b>
          {!isStaff && !a.archived && renamingId !== a.id && (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setRenamingId(a.id);
                  setRenameText(a.name);
                }}
              >
                {t("settings.acct.rename")}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={!!a.legacyFor}
                title={a.legacyFor ? t("settings.acct.archiveBlocked") : undefined}
                onClick={() => archiveMoneyAccount(a.id)}
              >
                {t("settings.acct.archive")}
              </button>
            </>
          )}
        </div>
        {!isStaff && !a.archived && renamingId === a.id && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveRename(a.id);
            }}
            style={{ display: "flex", gap: 8, width: "100%" }}
          >
            <input
              value={renameText}
              onChange={(e) => setRenameText(e.target.value)}
              style={{ flex: 1 }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary btn-sm">
              {t("action.save")}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setRenamingId(null)}
            >
              {t("action.cancel")}
            </button>
          </form>
        )}
      </div>
    );
  };

  return (
    <section className="card" aria-label={t("settings.acct.title")}>
      <h2 style={{ fontSize: "1.25rem", marginBottom: 4 }}>{t("settings.acct.title")}</h2>
      <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
        {t("settings.acct.sub")}
      </p>

      {notice && (
        <div
          className="note-box"
          style={{ marginTop: 0, marginBottom: 16, borderStyle: "solid", borderColor: "var(--accent)" }}
        >
          {notice}
        </div>
      )}

      <div style={{ marginBottom: 8 }}>
        {liveAccounts.map(row)}
        {archivedAccounts.map(row)}
        {accounts.length === 0 && (
          <p style={{ color: "var(--muted)" }}>{t("common.noResults")}</p>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={liveAccounts.length < 2}
          onClick={() => setTransferOpen(true)}
        >
          <IconWallet /> {t("settings.acct.transfer")}
        </button>
      </div>

      {isStaff ? (
        <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
          {t("settings.acct.staffNote")}
        </p>
      ) : (
        <>
          <h3 style={{ fontSize: "1.05rem", margin: "18px 0 4px" }}>
            {t("settings.acct.defaultsTitle")}
          </h3>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 12 }}>
            {t("settings.acct.defaultsSub")}
          </p>
          <div style={{ display: "grid", gap: 10, marginBottom: 20 }}>
            {METHODS.map((m) => {
              const holder = liveAccounts.find((a) => a.method === m) ?? null;
              const resolved = defaultAccountForMethod(accounts, m);
              const options = eligibleAccounts(accounts, m);
              return (
                <div
                  key={m}
                  style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}
                >
                  <span style={{ minWidth: 110, fontWeight: 600 }}>{t(PAY_KEY[m])}</span>
                  <select
                    value={holder?.id ?? ""}
                    onChange={(e) => {
                      if (e.target.value) setDefaultMoneyAccount(e.target.value, m);
                    }}
                    aria-label={t(PAY_KEY[m])}
                    style={{ minWidth: 200 }}
                  >
                    {!holder && (
                      <option value="">
                        {resolved
                          ? `${resolved.name} · ${t("settings.acct.defaultShort")}`
                          : "—"}
                      </option>
                    )}
                    {options.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <h3 style={{ fontSize: "1.05rem", margin: "6px 0 12px" }}>
            {t("settings.acct.addTitle")}
          </h3>
          <form className="form" onSubmit={submitAdd}>
            {addError && <div className="form-error">{addError}</div>}
            <div className="form-grid">
              <div className="field">
                <label htmlFor="acc-name">{t("settings.acct.name")}</label>
                <input
                  id="acc-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("settings.acct.namePlaceholder")}
                />
              </div>
              <div className="field">
                <label htmlFor="acc-kind">{t("settings.acct.kind")}</label>
                <select
                  id="acc-kind"
                  value={newKind}
                  onChange={(e) => {
                    setNewKind(e.target.value as MoneyAccount["kind"]);
                    setNewMethod("");
                  }}
                >
                  <option value="cash">{t("settings.acct.kindCash")}</option>
                  <option value="wallet">{t("settings.acct.kindWallet")}</option>
                  <option value="bank">{t("settings.acct.kindBank")}</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="acc-method">{t("settings.acct.method")}</label>
                <select
                  id="acc-method"
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                >
                  <option value="">{t("settings.acct.methodNone")}</option>
                  {methodOptions(newKind).map((m) => (
                    <option key={m} value={m}>
                      {t(PAY_KEY[m])}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              <IconPlus /> {t("settings.acct.add")}
            </button>
          </form>
        </>
      )}

      {transferOpen && (
        <TransferModal
          onClose={() => setTransferOpen(false)}
          onDone={(text) => setNotice(text)}
        />
      )}
    </section>
  );
}
