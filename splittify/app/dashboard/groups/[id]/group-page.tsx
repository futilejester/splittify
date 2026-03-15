'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import AddExpenseModal from '@/components/AddExpenseModal';
import InviteMemberModal from '@/components/InviteMemberModal';
import RecordSettlementModal from '@/components/RecordSettlementModal';
import { computeNetBalances, computeSettlementSuggestions, formatMoney } from '@/lib/calculations';
import { Group, Profile, Expense, ExpenseSplit, GroupSettlement, SettlementSuggestion, TimelineItem } from '@/types';
import { ArrowLeft, PlusCircle, UserPlus, Receipt, Users, TrendingUp, ArrowRight, Handshake } from 'lucide-react';

type Tab = 'timeline' | 'members' | 'balances';

export default function GroupPage() {
  const params   = useParams();
  const groupId  = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const router   = useRouter();
  const supabase = createClient();

  const [group, setGroup]           = useState<Group | null>(null);
  const [members, setMembers]       = useState<Profile[]>([]);
  const [expenses, setExpenses]     = useState<Expense[]>([]);
  const [splits, setSplits]         = useState<ExpenseSplit[]>([]);
  const [settlements, setSettlements] = useState<GroupSettlement[]>([]);
  const [suggestions, setSuggestions] = useState<SettlementSuggestion[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [activeTab, setActiveTab]         = useState<Tab>('timeline');
  const [showAddExpense, setShowAddExpense]   = useState(false);
  const [showInvite, setShowInvite]           = useState(false);
  const [showSettlement, setShowSettlement]   = useState(false);
  const [prefillSuggestion, setPrefillSuggestion] = useState<SettlementSuggestion | undefined>();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading]);

  const loadData = useCallback(async () => {
    setDataLoading(true);

    const { data: g } = await supabase.from('groups').select('*').eq('id', groupId).single();
    setGroup(g ?? null);

    const { data: memberRows } = await supabase
      .from('group_members')
      .select('user_id, profiles(*)')
      .eq('group_id', groupId);
    const memberProfiles: Profile[] = (memberRows ?? []).map((r: any) => r.profiles).filter(Boolean);
    setMembers(memberProfiles);

    const { data: expenseRows } = await supabase
      .from('expenses')
      .select('*, payer:profiles!paid_by(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    const expList: Expense[] = (expenseRows ?? []).map((e: any) => ({ ...e, payer: e.payer }));
    setExpenses(expList);

    const expenseIds = expList.map((e) => e.id);
    const { data: splitRows } = expenseIds.length > 0
      ? await supabase.from('expense_splits').select('*, profile:profiles!user_id(*)').in('expense_id', expenseIds)
      : { data: [] };
    const splitList: ExpenseSplit[] = (splitRows ?? []).map((s: any) => ({ ...s, profile: s.profile }));
    setSplits(splitList);

    // Fetch recorded settlements with profile joins
    const { data: settlementRows } = await supabase
      .from('group_settlements')
      .select('*, from_profile:profiles!from_user(*), to_profile:profiles!to_user(*)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });
    const settlementList: GroupSettlement[] = (settlementRows ?? []).map((s: any) => ({
      ...s,
      from_profile: s.from_profile,
      to_profile:   s.to_profile,
    }));
    setSettlements(settlementList);

    // Compute suggestions after loading everything
    const balances    = computeNetBalances(memberProfiles, expList, splitList, settlementList);
    const suggestions = computeSettlementSuggestions(balances);
    setSuggestions(suggestions);

    setDataLoading(false);
  }, [groupId, user]);

  useEffect(() => { if (user) loadData(); }, [user, loadData]);

  const openSettlementModal = (suggestion?: SettlementSuggestion) => {
    setPrefillSuggestion(suggestion);
    setShowSettlement(true);
  };

  const totalSpent     = expenses.reduce((s, e) => s + e.amount_cents, 0);
  const totalSettled   = settlements.reduce((s, r) => s + r.amount_cents, 0);

  // Merge expenses + settlements into a single sorted timeline
  const timeline: TimelineItem[] = [
    ...expenses.map((e) => ({ type: 'expense' as const, data: e, date: e.created_at })),
    ...settlements.map((s) => ({ type: 'settlement' as const, data: s, date: s.created_at })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (authLoading || dataLoading || !user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Loading…</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Navbar />
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          Group not found. <Link href="/dashboard" style={{ color: 'var(--coral)' }}>Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
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
          <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
            <button onClick={() => setShowInvite(true)} className="btn btn-outline">
              <UserPlus size={15} /> Invite
            </button>
            <button onClick={() => openSettlementModal()} className="btn btn-outline" style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
              <Handshake size={15} /> Settle up
            </button>
            <button onClick={() => setShowAddExpense(true)} className="btn btn-coral">
              <PlusCircle size={15} /> Add expense
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Total spent',    value: formatMoney(totalSpent),   icon: <Receipt size={15} />,    color: 'var(--navy)' },
            { label: 'Settled',        value: formatMoney(totalSettled),  icon: <Handshake size={15} />,  color: 'var(--success)' },
            { label: 'Members',        value: members.length,             icon: <Users size={15} />,      color: 'var(--teal)' },
            { label: 'Still to settle', value: suggestions.length === 0 ? 'All clear' : `${suggestions.length} transfer${suggestions.length !== 1 ? 's' : ''}`,
              icon: <TrendingUp size={15} />, color: suggestions.length === 0 ? 'var(--success)' : 'var(--coral)' },
          ].map((s) => (
            <div key={s.label} className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: s.color, marginBottom: '0.375rem' }}>
                {s.icon}
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
              </div>
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy)' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: '1.75rem' }}>
          {(['timeline', 'members', 'balances'] as Tab[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '0.625rem 1.25rem', border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: 'Nunito Sans, sans-serif', fontSize: '0.9rem',
              fontWeight: activeTab === tab ? 700 : 500,
              color: activeTab === tab ? 'var(--navy)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--navy)' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s', textTransform: 'capitalize',
            }}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'timeline' && (
          <TimelineTab timeline={timeline} splits={splits} members={members} currentUserId={user.id} />
        )}
        {activeTab === 'members' && (
          <MembersTab members={members} createdBy={group.created_by} />
        )}
        {activeTab === 'balances' && (
          <BalancesTab
            members={members}
            expenses={expenses}
            splits={splits}
            settlements={settlements}
            suggestions={suggestions}
            onRecordSettlement={openSettlementModal}
            currentUserId={user.id}
          />
        )}
      </main>

      {showAddExpense && (
        <AddExpenseModal groupId={groupId} currentUserId={user.id} members={members}
          onClose={() => setShowAddExpense(false)} onAdded={loadData} />
      )}
      {showInvite && (
        <InviteMemberModal groupId={groupId}
          onClose={() => setShowInvite(false)} onInvited={loadData} />
      )}
      {showSettlement && (
        <RecordSettlementModal
          groupId={groupId} members={members} currentUserId={user.id}
          suggestion={prefillSuggestion}
          onClose={() => { setShowSettlement(false); setPrefillSuggestion(undefined); }}
          onRecorded={loadData}
        />
      )}
    </div>
  );
}

// ── Timeline tab ─────────────────────────────────────────────────────────────

function TimelineTab({ timeline, splits, members, currentUserId }: {
  timeline: TimelineItem[];
  splits: ExpenseSplit[];
  members: Profile[];
  currentUserId: string;
}) {
  if (timeline.length === 0) {
    return (
      <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Receipt size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
        <p>Nothing here yet — add your first expense!</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {timeline.map((item) =>
        item.type === 'expense'
          ? <ExpenseCard key={`e-${item.data.id}`} expense={item.data} splits={splits} members={members} currentUserId={currentUserId} />
          : <SettlementCard key={`s-${item.data.id}`} settlement={item.data} />
      )}
    </div>
  );
}

function ExpenseCard({ expense, splits, members, currentUserId }: {
  expense: Expense; splits: ExpenseSplit[]; members: Profile[]; currentUserId: string;
}) {
  const expSplits  = splits.filter((s) => s.expense_id === expense.id);
  const myShare    = expSplits.find((s) => s.user_id === currentUserId)?.amount_cents;
  const iDidPay   = expense.paid_by === currentUserId;

  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.375rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--coral-pale)', color: 'var(--coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Receipt size={14} />
            </div>
            <p style={{ fontWeight: 600, color: 'var(--navy)' }}>{expense.description}</p>
            {iDidPay && <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>you paid</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)', paddingLeft: '2.25rem' }}>
            <span>Paid by <strong style={{ color: 'var(--text)' }}>{expense.payer?.full_name || expense.payer?.email || '?'}</strong></span>
            <span>{new Date(expense.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
            <span>{expSplits.length}-way split</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy)' }}>
            {formatMoney(expense.amount_cents)}
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
}

function SettlementCard({ settlement }: { settlement: GroupSettlement }) {
  const from = settlement.from_profile;
  const to   = settlement.to_profile;

  return (
    <div className="card" style={{ padding: '1rem 1.5rem', borderLeft: '3px solid var(--success)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--success-pale)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Handshake size={14} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{from?.full_name || from?.email || '?'}</span>
            <span style={{ color: 'var(--text-muted)' }}>paid</span>
            <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{to?.full_name || to?.email || '?'}</span>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.125rem' }}>
            {settlement.note && <span style={{ marginRight: '0.75rem' }}>"{settlement.note}"</span>}
            <span>{new Date(settlement.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>
          {formatMoney(settlement.amount_cents)}
        </div>
      </div>
    </div>
  );
}

// ── Members tab ──────────────────────────────────────────────────────────────

function MembersTab({ members, createdBy }: { members: Profile[]; createdBy: string }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {members.map((m, idx) => (
        <div key={m.id} style={{
          display: 'flex', alignItems: 'center', gap: '0.875rem',
          padding: '0.875rem 1.25rem',
          borderBottom: idx < members.length - 1 ? '1px solid var(--border)' : 'none',
        }}>
          <div className="avatar" style={{ background: 'var(--navy)' }}>
            {(m.full_name || m.email)[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--navy)' }}>{m.full_name || 'Unknown'}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{m.email}</div>
          </div>
          {m.id === createdBy && <span className="badge badge-navy" style={{ fontSize: '0.6875rem' }}>owner</span>}
        </div>
      ))}
    </div>
  );
}

// ── Balances tab ─────────────────────────────────────────────────────────────

function BalancesTab({ members, expenses, splits, settlements, suggestions, onRecordSettlement, currentUserId }: {
  members: Profile[];
  expenses: Expense[];
  splits: ExpenseSplit[];
  settlements: GroupSettlement[];
  suggestions: SettlementSuggestion[];
  onRecordSettlement: (suggestion?: SettlementSuggestion) => void;
  currentUserId: string;
}) {
  const balances = computeNetBalances(members, expenses, splits, settlements);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* Net balances */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600, color: 'var(--navy)' }}>
            Individual balances
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            After all expenses and recorded settlements
          </p>
        </div>
        {balances.map((b) => {
          const isMe    = b.user.id === currentUserId;
          const positive = b.net_cents > 0;
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
                  {b.user.full_name || b.user.email}
                  {isMe && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (you)</span>}
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

      {/* Suggested settlements */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1rem', fontWeight: 600, color: 'var(--navy)' }}>
              {suggestions.length === 0 ? 'All settled up 🎉' : `Suggested payments · ${suggestions.length} transfer${suggestions.length !== 1 ? 's' : ''}`}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              {suggestions.length === 0 ? 'Everyone is square' : 'Minimum transfers to clear all debts'}
            </p>
          </div>
          <button onClick={() => onRecordSettlement()} className="btn btn-outline"
            style={{ fontSize: '0.8125rem', borderColor: 'var(--success)', color: 'var(--success)' }}>
            <Handshake size={13} /> Record payment
          </button>
        </div>

        {suggestions.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--success)' }}>
            Nothing left to settle!
          </div>
        ) : (
          suggestions.map((s, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', gap: '0.875rem',
              padding: '0.875rem 1.25rem',
              borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div className="avatar avatar-sm" style={{ background: 'var(--coral)', color: 'white' }}>
                {(s.from.full_name || s.from.email)[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, fontSize: '0.9rem' }}>
                <span style={{ fontWeight: 600 }}>{s.from.full_name || s.from.email}</span>
                <span style={{ color: 'var(--text-muted)' }}> pays </span>
                <span style={{ fontWeight: 600 }}>{s.to.full_name || s.to.email}</span>
              </div>
              <ArrowRight size={14} color="var(--text-muted)" />
              <div style={{ fontFamily: 'Fraunces, serif', fontSize: '1.125rem', fontWeight: 700, color: 'var(--navy)', marginRight: '0.5rem' }}>
                {formatMoney(s.amount_cents)}
              </div>
              <button
                onClick={() => onRecordSettlement(s)}
                className="btn btn-outline"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderColor: 'var(--success)', color: 'var(--success)' }}
              >
                Record
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
