import { Expense, ExpenseSplit, Profile, Settlement, UserBalance } from '@/types';

/**
 * Given all expenses and splits in a group, compute each member's net balance.
 * Positive = they are owed money. Negative = they owe money.
 */
export function computeNetBalances(
  members: Profile[],
  expenses: Expense[],
  splits: ExpenseSplit[]
): UserBalance[] {
  const net: Record<string, number> = {};

  // Initialise everyone at 0
  for (const m of members) {
    net[m.id] = 0;
  }

  // Credit the payer for each expense
  for (const expense of expenses) {
    net[expense.paid_by] = (net[expense.paid_by] ?? 0) + expense.amount_cents;
  }

  // Debit each user for what they owe via splits
  for (const split of splits) {
    net[split.user_id] = (net[split.user_id] ?? 0) - split.amount_cents;
  }

  return members.map((user) => ({
    user,
    net_cents: net[user.id] ?? 0,
  }));
}

/**
 * Simplify balances into minimal list of transfers using greedy algorithm.
 * Each settlement = { from, to, amount_cents }
 */
export function computeSettlements(balances: UserBalance[]): Settlement[] {
  // Deep copy so we can mutate
  let creditors = balances
    .filter((b) => b.net_cents > 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net_cents - a.net_cents);

  let debtors = balances
    .filter((b) => b.net_cents < 0)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.net_cents - b.net_cents);

  const settlements: Settlement[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const creditor = creditors[0];
    const debtor = debtors[0];

    const amount = Math.min(creditor.net_cents, -debtor.net_cents);

    settlements.push({
      from: debtor.user,
      to: creditor.user,
      amount_cents: amount,
    });

    creditor.net_cents -= amount;
    debtor.net_cents += amount;

    if (creditor.net_cents === 0) creditors.shift();
    if (debtor.net_cents === 0) debtors.shift();
  }

  return settlements;
}

/** Format cents as currency string, e.g. 1234 → "£12.34" */
export function formatMoney(cents: number, symbol = '£'): string {
  const abs = Math.abs(cents);
  return `${cents < 0 ? '-' : ''}${symbol}${(abs / 100).toFixed(2)}`;
}
