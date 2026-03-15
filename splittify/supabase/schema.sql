-- ============================================================
-- Splittify — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Profiles (extends auth.users)
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  email      text unique not null,
  full_name  text,
  created_at timestamptz default now()
);

-- 2. Groups
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now()
);

-- 3. Group Members
create table if not exists public.group_members (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid references public.groups(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  joined_at  timestamptz default now(),
  unique(group_id, user_id)
);

-- 4. Expenses (amounts stored as integer cents)
create table if not exists public.expenses (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid references public.groups(id) on delete cascade not null,
  paid_by      uuid references public.profiles(id) on delete cascade not null,
  amount_cents integer not null check (amount_cents > 0),
  description  text not null,
  created_at   timestamptz default now()
);

-- 5. Expense Splits
create table if not exists public.expense_splits (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid references public.expenses(id) on delete cascade not null,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  amount_cents integer not null check (amount_cents > 0),
  unique(expense_id, user_id)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles       enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.expenses       enable row level security;
alter table public.expense_splits enable row level security;

-- PROFILES: anyone logged in can read all profiles (needed to look up members/payers)
create policy "profiles: read all"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id);

-- GROUPS: only members of a group can see it
create policy "groups: members can select"
  on public.groups for select
  using (
    exists (
      select 1 from public.group_members
      where group_id = groups.id and user_id = auth.uid()
    )
  );

create policy "groups: authenticated users can insert"
  on public.groups for insert
  with check (auth.uid() = created_by);

-- GROUP_MEMBERS: can see members of groups you're in
create policy "group_members: select if in group"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid()
    )
  );

create policy "group_members: owner can insert"
  on public.group_members for insert
  with check (
    -- group creator can add members
    exists (
      select 1 from public.groups
      where id = group_id and created_by = auth.uid()
    )
    -- or someone adding themselves (initial join)
    or auth.uid() = user_id
  );

-- EXPENSES: group members can see and add expenses
create policy "expenses: select if group member"
  on public.expenses for select
  using (
    exists (
      select 1 from public.group_members
      where group_id = expenses.group_id and user_id = auth.uid()
    )
  );

create policy "expenses: insert if group member"
  on public.expenses for insert
  with check (
    exists (
      select 1 from public.group_members
      where group_id = group_id and user_id = auth.uid()
    )
  );

-- EXPENSE_SPLITS: accessible if you're in the group
create policy "expense_splits: select if group member"
  on public.expense_splits for select
  using (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id and gm.user_id = auth.uid()
    )
  );

create policy "expense_splits: insert if group member"
  on public.expense_splits for insert
  with check (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_id and gm.user_id = auth.uid()
    )
  );

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
