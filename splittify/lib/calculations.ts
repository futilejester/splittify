import { Expense, ExpenseSplit, GroupSettlement, Profile, SettlementSuggestion, UserBalance } from '@/types';

/**
 * Compute each member's net balance, factoring in both expenses and
 * any recorded settlements.
 *
 * Positive net = this person is owed money.
 * Negative net = this person owes money.
 */
export function computeNetBalances(
  members: Profile[],
  expenses: Expense[],
  splits: ExpenseSplit[],
  settlements: GroupSettlement[] = []
): UserBalance[] {
  const net: Record<string, number> = {};

  for (const m of members) {
    net[m.id] = 0;
  }

  // Credit the payer the full expense amount
  for (const expense of expenses) {
    net[expense.paid_by] = (net[expense.paid_by] ?? 0) + expense.amount_cents;
  }

  // Debit each participant for their share
  for (const split of splits) {
    net[split.user_id] = (net[split.user_id] ?? 0) - split.amount_cents;
  }

  // Apply recorded settlements:
  // from_user paid to_user, so from_user's debt decreases (net up)
  // and to_user is owed less (net down)
  for (const s of settlements) {
    net[s.from_user] = (net[s.from_user] ?? 0) + s.amount_cents;
    net[s.to_user]   = (net[s.to_user]   ?? 0) - s.amount_cents;
  }

  return members.map((user) => ({
    user,
    net_cents: net[user.id] ?? 0,
  }));
}

/**
 * Greedy algorithm: produce the minimum number of transfers needed
 * to settle all outstanding balances.
 */
export function computeSettlementSuggestions(balances: UserBalance[]): SettlementSuggestion[] {
  let creditors = balances
    .filter((b) => b.net_cents > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net_cents - a.net_cents);

  let debtors = balances
    .filter((b) => b.net_cents < 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.net_cents - b.net_cents);

  const suggestions: SettlementSuggestion[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor   = debtors[0];
    const amount   = Math.min(creditor.net_cents, -debtor.net_cents);

    suggestions.push({ from: debtor.user, to: creditor.user, amount_cents: amount });

    creditor.net_cents -= amount;
    debtor.net_cents   += amount;

    if (creditor.net_cents === 0) creditors.shift();
    if (debtor.net_cents   === 0) debtors.shift();
  }

  return suggestions;
}

/** Format cents as currency string — e.g. 1234 → "£12.34" */
export function formatMoney(cents: number, symbol = '£'): string {
  const abs = Math.abs(cents);
  return `${cents < 0 ? '-' : ''}${symbol}${(abs / 100).toFixed(2)}`;
}
