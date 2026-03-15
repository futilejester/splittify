export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  profile?: Profile;
}

export interface Expense {
  id: string;
  group_id: string;
  paid_by: string;
  amount_cents: number;
  description: string;
  created_at: string;
  payer?: Profile;
  splits?: ExpenseSplit[];
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount_cents: number;
  profile?: Profile;
}

// A recorded settlement in the database
export interface GroupSettlement {
  id: string;
  group_id: string;
  from_user: string;
  to_user: string;
  amount_cents: number;
  note: string | null;
  created_at: string;
  from_profile?: Profile;
  to_profile?: Profile;
}

// Computed suggestion: who should pay whom to settle up
export interface SettlementSuggestion {
  from: Profile;
  to: Profile;
  amount_cents: number;
}

// Net balance per user in a group
export interface UserBalance {
  user: Profile;
  net_cents: number; // positive = owed money, negative = owes money
}

// Unified timeline item
export type TimelineItem =
  | { type: 'expense'; data: Expense; date: string }
  | { type: 'settlement'; data: GroupSettlement; date: string };
