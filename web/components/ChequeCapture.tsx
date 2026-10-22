"use client";

/**
 * Phase B · B5 — the shared cheque-capture fields (design §4.2).
 *
 * "Cheque" is a payment INSTRUMENT, not a sixth PayMethod: every
 * payment picker gains it as an extra option, and choosing it
 * reveals these four fields in-line (leaf number, bank, the date
 * written on the cheque, and its PDC due date — which may be in
 * the future; nothing here forces either date to be today). The
 * host form owns the state through `ChequeFormState`; on submit
 * it converts with `chequeDraftOf`, which returns null when the
 * capture is incomplete so the form can refuse with
 * `chq.err.capture` before the store is ever called (the store
 * validates again at the posting seam regardless).
 */
import { useLang } from "./LangProvider";
import { isValidChequeDraft } from "@/lib/cheques";
import type { ChequeDraft } from "@/lib/types";

export interface ChequeFormState {
  chequeNo: string;
  bankName: string;
  issueDateISO: string;
  dueDateISO: string;
}

/** Today as YYYY-MM-DD in the browser's local calendar. */
export function todayISO(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function emptyChequeForm(): ChequeFormState {
  const t = todayISO();
  return { chequeNo: "", bankName: "", issueDateISO: t, dueDateISO: t };
}

export function chequeFormOf(d: ChequeDraft): ChequeFormState {
  return {
    chequeNo: d.chequeNo,
    bankName: d.bankName,
    issueDateISO: d.issueDateISO,
    dueDateISO: d.dueDateISO,
  };
}

/** The capture draft for the store, or null when incomplete. */
export function chequeDraftOf(s: ChequeFormState): ChequeDraft | null {
  const d: ChequeDraft = {
    chequeNo: s.chequeNo.trim(),
    bankName: s.bankName.trim(),
    issueDateISO: s.issueDateISO,
    dueDateISO: s.dueDateISO,
  };
  return isValidChequeDraft(d) ? d : null;
}

export function ChequeFields({
  value,
  onChange,
  idPrefix,
}: {
  value: ChequeFormState;
  onChange: (next: ChequeFormState) => void;
  idPrefix: string;
}) {
  const { t } = useLang();
  const set = (patch: Partial<ChequeFormState>) => onChange({ ...value, ...patch });
  return (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-no`}>{t("chq.field.no")}</label>
        <input
          id={`${idPrefix}-no`}
          value={value.chequeNo}
          onChange={(e) => set({ chequeNo: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-bank`}>{t("chq.field.bank")}</label>
        <input
          id={`${idPrefix}-bank`}
          value={value.bankName}
          onChange={(e) => set({ bankName: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-issue`}>{t("chq.field.issueDate")}</label>
        <input
          id={`${idPrefix}-issue`}
          type="date"
          value={value.issueDateISO}
          onChange={(e) => set({ issueDateISO: e.target.value })}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`${idPrefix}-due`}>{t("chq.field.dueDate")}</label>
        <input
          id={`${idPrefix}-due`}
          type="date"
          value={value.dueDateISO}
          onChange={(e) => set({ dueDateISO: e.target.value })}
          required
        />
      </div>
    </>
  );
}
