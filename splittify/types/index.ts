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

// Who owes whom
export interface Settlement {
  from: Profile;
  to: Profile;
  amount_cents: number;
}

// Net balance per user in a group
export interface UserBalance {
  user: Profile;
  net_cents: number; // positive = owed, negative = owes
}
