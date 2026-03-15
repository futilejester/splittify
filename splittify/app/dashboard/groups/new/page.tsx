'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/lib/supabase';
import { ArrowLeft, Users } from 'lucide-react';

export default function NewGroupPage() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setLoading(true);

    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .insert({ name: name.trim(), created_by: user.id })
      .select()
      .single();

    if (groupErr || !group) {
      setError(`Group insert failed: ${groupErr?.message}`);
      setLoading(false);
      return;
    }

    const { error: memberErr } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id });

    if (memberErr) {
      setError(`Member insert failed: ${memberErr?.message}`);
      setLoading(false);
      return;
    }

    router.push(`/dashboard/groups/${group.id}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Navbar />
      <main style={{ maxWidth: 520, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <Link href="/dashboard" className="btn btn-ghost" style={{ marginBottom: '1.5rem', padding: '0.4rem 0', color: 'var(--text-muted)' }}>
          <ArrowLeft size={16} /> Back to dashboard
        </Link>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: '2rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.5rem' }}>
            Create a group
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Give your group a name — you can invite others right after.</p>
        </div>
        <div className="card" style={{ padding: '2rem' }}>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">Group name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Ibiza 2025, Flat 4B, Weekend Warriors"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                maxLength={80}
              />
            </div>
            <div style={{
              background: 'var(--bg-subtle)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '0.875rem 1rem', marginBottom: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              color: 'var(--text-muted)', fontSize: '0.875rem',
            }}>
              <Users size={15} style={{ flexShrink: 0 }} />
              You&apos;ll be added automatically. Invite others after creating.
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Link href="/dashboard" className="btn btn-outline">Cancel</Link>
              <button type="submit" className="btn btn-coral" disabled={loading || !name.trim()}>
                {loading ? 'Creating…' : 'Create group'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}