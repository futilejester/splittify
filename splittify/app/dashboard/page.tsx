'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import Navbar from '@/components/Navbar';
import { createClient } from '@/lib/supabase';
import { Group } from '@/types';
import { Users, PlusCircle, ArrowRight, Receipt } from 'lucide-react';

interface GroupWithMeta extends Group {
  member_count: number;
  expense_count: number;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupWithMeta[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    loadGroups();
  }, [user]);

  const loadGroups = async () => {
    setDataLoading(true);

    // Get groups this user belongs to
    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', user!.id);

    if (!memberships || memberships.length === 0) {
      setGroups([]);
      setDataLoading(false);
      return;
    }

    const groupIds = memberships.map((m) => m.group_id);

    // Fetch group details
    const { data: groupData } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('created_at', { ascending: false });

    if (!groupData) { setDataLoading(false); return; }

    // Fetch member counts and expense counts in parallel
    const enriched = await Promise.all(
      groupData.map(async (g) => {
        const [{ count: memberCount }, { count: expenseCount }] = await Promise.all([
          supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', g.id),
          supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('group_id', g.id),
        ]);
        return { ...g, member_count: memberCount ?? 0, expense_count: expenseCount ?? 0 };
      })
    );

    setGroups(enriched);
    setDataLoading(false);
  };

  if (loading || (!user && !loading)) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '2rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.25rem' }}>
              Your groups
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>
              {groups.length === 0 ? 'No groups yet — create your first one!' : `${groups.length} group${groups.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <Link href="/dashboard/groups/new" className="btn btn-coral">
            <PlusCircle size={16} /> New group
          </Link>
        </div>

        {/* Groups grid */}
        {dataLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card" style={{ padding: '1.5rem', height: 140, opacity: 0.5, background: 'var(--border)', animation: 'pulse 1.5s ease infinite' }} />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/dashboard/groups/${g.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="card"
                  style={{
                    padding: '1.5rem',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform = '';
                    (e.currentTarget as HTMLElement).style.boxShadow = '';
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'var(--navy)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'Fraunces, serif', fontSize: '1.125rem', fontWeight: 700,
                    marginBottom: '1rem',
                  }}>
                    {g.name[0].toUpperCase()}
                  </div>

                  <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.125rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.75rem' }}>
                    {g.name}
                  </h2>

                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Users size={13} /> {g.member_count} member{g.member_count !== 1 ? 's' : ''}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Receipt size={13} /> {g.expense_count} expense{g.expense_count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--coral)', fontSize: '0.8125rem', fontWeight: 600 }}>
                    View group <ArrowRight size={13} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: '#EDF0F7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', color: 'var(--navy)' }}>
        <Users size={28} />
      </div>
      <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.375rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.5rem' }}>
        No groups yet
      </h3>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', maxWidth: 320, margin: '0 auto 1.5rem' }}>
        Create a group for your holiday, flatshare, or any shared expenses.
      </p>
      <Link href="/dashboard/groups/new" className="btn btn-coral">
        <PlusCircle size={16} /> Create your first group
      </Link>
    </div>
  );
}
