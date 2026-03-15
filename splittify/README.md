# Splittify 🧾

> **Split expenses, not friendships.**  
> A full-stack expense tracking and splitting app built with Next.js 14, TypeScript, and Supabase.

---

## Features

- 🔐 **Auth** — Registration, login, logout, persistent sessions, protected routes
- 👥 **Groups** — Create groups, invite members by email
- 💸 **Expenses** — Log who paid, how much, and split among any subset of members
- ⚖️ **Balances** — Automatic net balance calculation + minimal settlement transfers
- 🔒 **Row-level security** — Each user only sees groups they belong to

---

## Tech Stack

| Layer     | Technology             |
|-----------|------------------------|
| Framework | Next.js 14 (App Router)|
| Language  | TypeScript             |
| Auth + DB | Supabase               |
| Styling   | CSS custom properties + Tailwind utilities |
| Hosting   | Vercel                 |

---

## Setup Guide

### 1. Clone & install

```bash
git clone <your-repo>
cd splittify
npm install
```

---

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New project** and give it a name (e.g. `splittify`)
3. Wait for the project to provision (~1 min)

---

### 3. Run the database schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Paste the entire contents of `supabase/schema.sql`
4. Click **Run** ▶️

This creates all tables, RLS policies, and the auto-profile trigger.

---

### 4. Add your environment variables

Copy the example file:

```bash
cp .env.local.example .env.local
```

Then in your Supabase dashboard go to **Settings → API** and copy:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR...
```

Paste them into `.env.local`.

---

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

### 6. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

When prompted, add your two environment variables in the Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Or push to GitHub and import the repo at [vercel.com](https://vercel.com) — it auto-detects Next.js.

---

## Project Structure

```
splittify/
├── app/
│   ├── layout.tsx              # Root layout + AuthProvider
│   ├── page.tsx                # Landing page (public)
│   ├── login/page.tsx          # Login
│   ├── register/page.tsx       # Registration
│   └── dashboard/
│       ├── page.tsx            # Dashboard — all groups
│       └── groups/
│           ├── new/page.tsx    # Create group
│           └── [id]/page.tsx   # Group detail (expenses, members, balances)
├── components/
│   ├── AuthProvider.tsx        # Global auth context
│   ├── Navbar.tsx              # Top navigation bar
│   ├── AddExpenseModal.tsx     # Add expense form modal
│   └── InviteMemberModal.tsx   # Invite member by email modal
├── lib/
│   ├── supabase.ts             # Supabase browser client
│   └── calculations.ts        # Balance + settlement logic
├── types/
│   └── index.ts                # Shared TypeScript types
├── supabase/
│   └── schema.sql              # Full DB schema + RLS
└── middleware.ts               # Route protection
```

---

## How balances work

1. **Credit** the payer for the full expense amount
2. **Debit** each split participant for their share
3. Net result → positive = owed money, negative = owes money
4. **Settlements** use a greedy algorithm to minimise the number of transfers needed

All money is stored as **integer cents** (e.g. £12.50 = `1250`) to avoid floating-point rounding issues.

---

## Common Issues

| Problem | Fix |
|---------|-----|
| "User not found" on invite | Ask them to register first — Splittify looks up by email in profiles table |
| RLS errors in logs | Make sure you ran the full `schema.sql` including all policies |
| Session not persisting | Ensure `@supabase/ssr` is installed and middleware is in place |
| Build errors on Vercel | Add both env vars in Vercel project settings |
