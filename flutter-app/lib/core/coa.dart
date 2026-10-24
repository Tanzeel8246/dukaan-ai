/// Dukaan AI — chart of accounts v2 registry (Dart port of web/lib/coa.ts).
///
/// The single authoritative table of journal account codes, accounting
/// types and normal balances. v1 codes are FROZEN in name and meaning;
/// Phase A added 10 codes additively; Phase D added `loans_receivable`;
/// Phase H · H1 added the loyalty pair. 30 codes. If this table and
/// the web registry ever disagree, that is a finance bug — the
/// fixture suite pins behaviour derived from it.

enum AccountType { asset, liability, equity, contraEquity, income, contraIncome, expense, clearing }

enum NormalBalance { debit, credit }

class AccountMeta {
  final AccountType type;
  final NormalBalance? normalBalance; // null only for `purchases` (clearing)
  final String since; // "v1" | "A" | "D" | "H"
  const AccountMeta(this.type, this.normalBalance, this.since);
}

const Map<String, AccountMeta> chartOfAccounts = {
  // v1 — frozen
  'cash': AccountMeta(AccountType.asset, NormalBalance.debit, 'v1'),
  'wallet': AccountMeta(AccountType.asset, NormalBalance.debit, 'v1'),
  'sales_revenue': AccountMeta(AccountType.income, NormalBalance.credit, 'v1'),
  'sales_discount': AccountMeta(AccountType.contraIncome, NormalBalance.debit, 'v1'),
  'cogs': AccountMeta(AccountType.expense, NormalBalance.debit, 'v1'),
  'inventory': AccountMeta(AccountType.asset, NormalBalance.debit, 'v1'),
  'purchases': AccountMeta(AccountType.clearing, null, 'v1'),
  'expense_rent': AccountMeta(AccountType.expense, NormalBalance.debit, 'v1'),
  'expense_electricity': AccountMeta(AccountType.expense, NormalBalance.debit, 'v1'),
  'expense_salary': AccountMeta(AccountType.expense, NormalBalance.debit, 'v1'),
  'expense_transport': AccountMeta(AccountType.expense, NormalBalance.debit, 'v1'),
  'expense_other': AccountMeta(AccountType.expense, NormalBalance.debit, 'v1'),
  'receivables': AccountMeta(AccountType.asset, NormalBalance.debit, 'v1'),
  'payables': AccountMeta(AccountType.liability, NormalBalance.credit, 'v1'),
  'capital': AccountMeta(AccountType.equity, NormalBalance.credit, 'v1'),
  'drawings': AccountMeta(AccountType.contraEquity, NormalBalance.debit, 'v1'),
  'inventory_loss': AccountMeta(AccountType.expense, NormalBalance.debit, 'v1'),
  // Phase A — additive
  'tax_payable': AccountMeta(AccountType.liability, NormalBalance.credit, 'A'),
  'tax_input': AccountMeta(AccountType.asset, NormalBalance.debit, 'A'),
  'cheques_in_hand': AccountMeta(AccountType.asset, NormalBalance.debit, 'A'),
  'cheques_issued': AccountMeta(AccountType.liability, NormalBalance.credit, 'A'),
  'salary_payable': AccountMeta(AccountType.liability, NormalBalance.credit, 'A'),
  'loans_payable': AccountMeta(AccountType.liability, NormalBalance.credit, 'A'),
  'expense_finance': AccountMeta(AccountType.expense, NormalBalance.debit, 'A'),
  'inventory_raw': AccountMeta(AccountType.asset, NormalBalance.debit, 'A'),
  'wip': AccountMeta(AccountType.asset, NormalBalance.debit, 'A'),
  'retained_earnings': AccountMeta(AccountType.equity, NormalBalance.credit, 'A'),
  // Phase D — additive
  'loans_receivable': AccountMeta(AccountType.asset, NormalBalance.debit, 'D'),
  // Phase H · H1 — additive (design §1.2): points owed to customers
  // (a liability — earn credits it, redemption debits it inside the
  // bill entry) and the programme's cost (recognised at earn,
  // released at expiry — never revenue).
  'loyalty_payable': AccountMeta(AccountType.liability, NormalBalance.credit, 'H'),
  'expense_loyalty': AccountMeta(AccountType.expense, NormalBalance.debit, 'H'),
};

/// Every valid account code, in registry order.
final List<String> accountCodes = chartOfAccounts.keys.toList();

AccountMeta accountMeta(String code) => chartOfAccounts[code]!;

bool isAccountCode(String code) => chartOfAccounts.containsKey(code);

/// +1 for debit-normal accounts, −1 for credit-normal; clearing reports
/// its raw balance with sign +1 (mirrors web `normalBalanceSign`).
int normalBalanceSign(String code) =>
    chartOfAccounts[code]!.normalBalance == NormalBalance.credit ? -1 : 1;
