/**
 * Dukaan AI — chart of accounts v2 registry (ERP Phase A, increment A1).
 *
 * The single authoritative place that knows every journal account
 * code, its accounting type and the side its balance normally sits on.
 * Reports and selectors read type/sign conventions from here instead
 * of scattering hand-negations through the codebase (payablesTotal
 * used to flip the sign by hand; profitAndLoss summed each side
 * ad hoc). Registry membership is also the account-code validation
 * list for a later hardening pass.
 *
 * v1 codes (17) are FROZEN in name and meaning — live journal lines
 * keep their semantics. Phase A adds 10 codes additively; codes used
 * only by later phases (cheques → B, manufacturing → C, payroll /
 * loans / fiscal close → D) are declared now so those phases need no
 * COA v3 and no type-union churn in shipped clients. In Phase A only
 * `tax_payable` / `tax_input` ever get posted (increment A4).
 * Phase D · D1 adds the registry's ONE Phase D code additively —
 * `loans_receivable` (design §3.1) — under the same discipline: no
 * existing code changes name, type or meaning.
 * Phase H · H1 adds the registry's TWO Phase H codes additively —
 * `loyalty_payable` + `expense_loyalty` (Phase H design §1.2) —
 * under the same discipline. Registry count: 28 → 30, then 31
 * with the 2026-10-27 workflow adoption's `customer_advances`.
 */
import type { AccountCode } from "./types";

export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "contra_equity"
  | "income"
  | "contra_income"
  | "expense"
  | "clearing";

export type NormalBalance = "debit" | "credit";

export interface AccountMeta {
  type: AccountType;
  /**
   * The side on which this account's balance normally sits. `null`
   * only for the `purchases` clearing account, which nets to zero on
   * every purchase and has no normal side.
   */
  normalBalance: NormalBalance | null;
  /** "v1" = Complete edition; "A" = added by ERP Phase A;
   *  "D" = added by ERP Phase D (D1: `loans_receivable` only);
   *  "H" = added by ERP Phase H (H1: the loyalty pair only). */
  since: "v1" | "A" | "D" | "H";
}

export const CHART_OF_ACCOUNTS: Record<AccountCode, AccountMeta> = {
  /* ---- v1 — frozen ---- */
  cash: { type: "asset", normalBalance: "debit", since: "v1" },
  wallet: { type: "asset", normalBalance: "debit", since: "v1" },
  sales_revenue: { type: "income", normalBalance: "credit", since: "v1" },
  sales_discount: { type: "contra_income", normalBalance: "debit", since: "v1" },
  cogs: { type: "expense", normalBalance: "debit", since: "v1" },
  inventory: { type: "asset", normalBalance: "debit", since: "v1" },
  purchases: { type: "clearing", normalBalance: null, since: "v1" },
  expense_rent: { type: "expense", normalBalance: "debit", since: "v1" },
  expense_electricity: { type: "expense", normalBalance: "debit", since: "v1" },
  expense_salary: { type: "expense", normalBalance: "debit", since: "v1" },
  expense_transport: { type: "expense", normalBalance: "debit", since: "v1" },
  expense_other: { type: "expense", normalBalance: "debit", since: "v1" },
  receivables: { type: "asset", normalBalance: "debit", since: "v1" },
  payables: { type: "liability", normalBalance: "credit", since: "v1" },
  capital: { type: "equity", normalBalance: "credit", since: "v1" },
  drawings: { type: "contra_equity", normalBalance: "debit", since: "v1" },
  inventory_loss: { type: "expense", normalBalance: "debit", since: "v1" },
  /* ---- Phase A — additive ---- */
  tax_payable: { type: "liability", normalBalance: "credit", since: "A" },
  tax_input: { type: "asset", normalBalance: "debit", since: "A" },
  cheques_in_hand: { type: "asset", normalBalance: "debit", since: "A" },
  cheques_issued: { type: "liability", normalBalance: "credit", since: "A" },
  salary_payable: { type: "liability", normalBalance: "credit", since: "A" },
  loans_payable: { type: "liability", normalBalance: "credit", since: "A" },
  expense_finance: { type: "expense", normalBalance: "debit", since: "A" },
  inventory_raw: { type: "asset", normalBalance: "debit", since: "A" },
  wip: { type: "asset", normalBalance: "debit", since: "A" },
  retained_earnings: { type: "equity", normalBalance: "credit", since: "A" },
  /* ---- Phase D · D1 — additive (design §3.1) ---- */
  loans_receivable: { type: "asset", normalBalance: "debit", since: "D" },
  /* ---- Phase H · H1 — additive (Phase H design §1.2) ---- */
  loyalty_payable: { type: "liability", normalBalance: "credit", since: "H" },
  expense_loyalty: { type: "expense", normalBalance: "debit", since: "H" },
  /* MC Billing workflow adoption 2026-10-27 (WEB): customer
   * advances, unearned — additive only, no existing code changes
   * name, type or meaning. */
  customer_advances: { type: "liability", normalBalance: "credit", since: "H" },
};

/** Every valid account code, in registry order. */
export const ACCOUNT_CODES = Object.keys(CHART_OF_ACCOUNTS) as AccountCode[];

export function accountMeta(code: AccountCode): AccountMeta {
  return CHART_OF_ACCOUNTS[code];
}

export function isAccountCode(code: string): code is AccountCode {
  return code in CHART_OF_ACCOUNTS;
}

/**
 * Sign that turns the raw journal balance (debits − credits, see
 * `accountBalance` in lib/ledger.ts) into the balance stated on the
 * account's normal side: +1 for debit-normal accounts, −1 for
 * credit-normal accounts. The clearing account reports its raw
 * (zero-netting) balance, sign +1.
 */
export function normalBalanceSign(code: AccountCode): 1 | -1 {
  return CHART_OF_ACCOUNTS[code].normalBalance === "credit" ? -1 : 1;
}
