'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import AddExpenseModal from '@/components/AddExpenseModal';
import InviteMemberModal from '@/components/InviteMemberModal';
import { computeNetBalances, computeSettlements, formatMoney } from '@/lib/calculations';
import { Group, Profile, Expense, ExpenseSplit, Settlement } from '@/types';
import { ArrowLeft, PlusCircle, UserPlus, Receipt, Users, TrendingUp, ArrowRight } from 'lucide-react';

type Tab = 'expenses' | 'members' | 'balances';

export default function GroupPage() {
  const params = useParams();
  const groupId = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Profile[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading]);

  const loadData = useCallback(async () => {
    setDataLoading(true);

    // Fetch group
    const { data: g } = await supabase.from('groups').select('*').eq('id', groupId).single();
    setGroup(g ?? null);

    // Fetch members with profiles
    const { data: memberRows } = await supabase
      .from('group_members')
      .select('user_id, profiles(*)')
      .eq('group_id', groupId);

    const memberProfiles: Profile[] = (memberRows ?? [])
      .map((r: any) => r.profiles)
      .filter(Boolean);
    setMembers(memberProfiles);

    // Fetch expenses with payer profile
    const { data: expenseRows } = await supabase
      .from('expenses')
      .select('*, payer:profiles!paid_by(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    const expList: Expense[] = (expenseRows ?? []).map((e: any) => ({
      ...e,
      payer: e.payer,
    }));
    setExpenses(expList);

    // Fetch all splits for this group's expenses
    const expenseIds = expList.map((e) => e.id);
    const { data: splitRows } = expenseIds.length > 0
      ? await supabase
          .from('expense_splits')
          .select('*, profile:profiles!user_id(*)')
          .in('expense_id', expenseIds)
      : { data: [] };

    const splitList: ExpenseSplit[] = (splitRows ?? []).map((s: any) => ({
      ...s,
      profile: s.profile,
    }));
    setSplits(splitList);

    // Compute balances & settlements
    const balances = computeNetBalances(memberProfiles, expList, splitList);
    const settl = computeSettlements(balances);
    setSettlements(settl);

    setDataLoading(false);
  }, [groupId, user]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const totalSpent = expenses.reduce((s, e) => s + e.amount_cents, 0);

  if (authLoading || dataLoading || !user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Group not found or you don&apos;t have access.{' '}
          <Link href="/dashboard" style={{ color: 'var(--coral)' }}>Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Back */}
        <Link href="/dashboard" className="btn btn-ghost" style={{ marginBottom: '1.25rem', padding: '0.4rem 0', color: 'var(--text-muted)' }}>
          <ArrowLeft size={15} /> All groups
        </Link>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
          <div>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '2rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.25rem' }}>
              {group.name}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {members.length} member{members.length !== 1 ? 's' : ''} · {expenses.length} expense{expenses.length !== 1 ? 's' : ''} · {formatMoney(totalSpent)} total
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button onClick={() => setShowInvite(true)} className="btn btn-outline">
              <UserPlus size={15} /> Invite
            </button>
            <button onClick={() => setShowAddExpense(true)} className="btn btn-coral">
              <PlusCircle size={15} /> Add expense
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Total spent', value: formatMoney(totalSpent), icon: <Receipt size={16} />, color: 'var(--navy)' },
            { label: 'Members', value: members.length, icon: <Users size={16} />, color: 'var(--teal)' },
            { label: 'Settlements needed', value: settlements.length, icon: <TrendingUp size={16} />, color: settlements.length === 0 ? 'var(--success)' : 'var(--coral)' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: s.color, marginBottom: '0.375rem' }}>
                {s.icon}
                <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</span>
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.375rem', fontWeight: 700, color: 'var(--navy)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border)', marginBottom: '1.75rem' }}>
          {(['expenses', 'members', 'balances'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '0.625rem 1.25rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'Nunito Sans, sans-serif',
                fontSize: '0.9rem',
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? 'var(--navy)' : 'var(--text-muted)',
                borderBottom: activeTab === tab ? '2px solid var(--navy)' : '2px solid transparent',
                marginBottom: -2,
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'expenses' && (
          <ExpensesTab expenses={expenses} splits={splits} currentUserId={user.id} members={members} />
        )}
        {activeTab === 'members' && (
          <MembersTab members={members} createdBy={group.created_by} />
        )}
        {activeTab === 'balances' && (
          <BalancesTab settlements={settlements} members={members} expenses={expenses} splits={splits} currentUserId={user.id} />
        )}
      </main>

      {showAddExpense && (
        <AddExpenseModal
          groupId={groupId}
          currentUserId={user.id}
          members={members}
          onClose={() => setShowAddExpense(false)}
          onAdded={loadData}
        />
      )}

      {showInvite && (
        <InviteMemberModal
          groupId={groupId}
          onClose={() => setShowInvite(false)}
          onInvited={loadData}
        />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ExpensesTab({ expenses, splits, currentUserId, members }: {
  expenses: Expense[];
  splits: ExpenseSplit[];
  currentUserId: string;
  members: Profile[];
}) {
  if (expenses.length === 0) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Receipt size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
        <p>No expenses yet. Add your first one!</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {expenses.map((exp) => {
        const expSplits = splits.filter((s) => s.expense_id === exp.id);
        const myShare = expSplits.find((s) => s.user_id === currentUserId)?.amount_cents;
        const iDidPay = exp.paid_by === currentUserId;

        return (
          <div key={exp.id} className="card" style={{ padding: '1.25rem 1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
                  <p style={{ fontWeight: 600, color: 'var(--navy)' }}>{exp.description}</p>
                  {iDidPay && (
                    <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>you paid</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <span>Paid by <strong style={{ color: 'var(--text)' }}>{exp.payer?.full_name || exp.payer?.email || '?'}</strong></span>
                  <span>{new Date(exp.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  <span>{expSplits.length} way split</span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy)' }}>
                  {formatMoney(exp.amount_cents)}
                </div>
                {myShare !== undefined && (
                  <div style={{ fontSize: '0.8125rem', color: iDidPay ? 'var(--success)' : 'var(--text-muted)' }}>
                    your share: {formatMoney(myShare)}
                  </div>
                )}
              </div>
            </div>

            {expSplits.length > 0 && (
              <div style={{ marginTop: '0.875rem', paddingTop: '0.875rem', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {expSplits.map((split) => {
                  const profile = members.find((m) => m.id === split.user_id);
                  return (
                    <div key={split.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', background: 'var(--bg-subtle)', padding: '0.2rem 0.625rem', borderRadius: 999 }}>
                      <div className="avatar avatar-sm" style={{ width: 20, height: 20, fontSize: '0.625rem', background: 'var(--border)', color: 'var(--text-muted)' }}>
                        {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
                      </div>
                      <span style={{ color: 'var(--text-muted)' }}>{profile?.full_name?.split(' ')[0] || profile?.email?.split('@')[0] || '?'}</span>
                      <span style={{ color: 'var(--navy)', fontWeight: 600 }}>{formatMoney(split.amount_cents)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MembersTab({ members, createdBy }: { members: Profile[]; createdBy: string }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {members.map((m, idx) => (
        <div
          key={m.id}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.875rem',
            padding: '0.875rem 1.25rem',
            borderBottom: idx < members.length - 1 ? '1px solid var(--border)' : 'none',
          }}
        >
          <div className="avatar" style={{ background: 'var(--navy)' }}>
            {(m.full_name || m.email)[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{m.full_name || 'Unknown'}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{m.email}</div>
          </div>
          {m.id === createdBy && (
            <span className="badge badge-navy" style={{ fontSize: '0.6875rem' }}>owner</span>
          )}
        </div>
      ))}
    </div>
  );
}

function BalancesTab({ settlements, members, expenses, splits, currentUserId }: {
  settlements: Settlement[];
  members: Profile[];
  expenses: Expense[];
  splits: ExpenseSplit[];
  currentUserId: string;
}) {
  const balances = computeNetBalances(members, expenses, splits);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Net balances per person */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600, color: 'var(--navy)' }}>Individual balances</h3>
        </div>
        {balances.map((b) => {
          const isMe = b.user.id === currentUserId;
          const positive = b.net_cents >= 0;
          return (
            <div key={b.user.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="avatar avatar-sm" style={{ background: 'var(--navy)' }}>
                  {(b.user.full_name || b.user.email)[0].toUpperCase()}
                </div>
                <span style={{ fontWeight: 500 }}>
                  {b.user.full_name || b.user.email} {isMe && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(you)</span>}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: b.net_cents === 0 ? 'var(--text-muted)' : positive ? 'var(--success)' : 'var(--coral)' }}>
                  {b.net_cents === 0 ? 'Settled' : positive ? `+${formatMoney(b.net_cents)}` : formatMoney(b.net_cents)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {b.net_cents === 0 ? '' : positive ? 'is owed' : 'owes'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Settlements */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600, color: 'var(--navy)' }}>
            Settle up — {settlements.length === 0 ? 'all square! 🎉' : `${settlements.length} transfer${settlements.length !== 1 ? 's' : ''} needed`}
          </h3>
        </div>

        {settlements.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--success)', fontSize: '0.9rem' }}>
            Everyone is settled up!
          </div>
        ) : (
          settlements.map((s, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.875rem',
                padding: '0.875rem 1.25rem',
                borderBottom: idx < settlements.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div className="avatar avatar-sm" style={{ background: 'var(--coral)', color: 'white' }}>
                {(s.from.full_name || s.from.email)[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{s.from.full_name || s.from.email}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}> pays </span>
                <span style={{ fontWeight: 600 }}>{s.to.full_name || s.to.email}</span>
              </div>
              <ArrowRight size={15} color="var(--text-muted)" />
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.125rem', fontWeight: 700, color: 'var(--navy)' }}>
                {formatMoney(s.amount_cents)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
