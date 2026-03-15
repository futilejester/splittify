'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { X, UserPlus } from 'lucide-react';

interface Props {
  groupId: string;
  onClose: () => void;
  onInvited: () => void;
}

export default function InviteMemberModal({ groupId, onClose, onInvited }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Look up user by email in profiles table
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (profileErr) {
      setError(profileErr.message);
      setLoading(false);
      return;
    }

    if (!profile) {
      setError('No account found with that email address. Ask them to register first!');
      setLoading(false);
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (existing) {
      setError('That person is already in this group.');
      setLoading(false);
      return;
    }

    // Add them
    const { error: insertErr } = await supabase
      .from('group_members')
      .insert({ group_id: groupId, user_id: profile.id });

    if (insertErr) {
      setError(insertErr.message);
      setLoading(false);
      return;
    }

    onInvited();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EDF0F7', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={18} />
            </div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 600, color: 'var(--navy)' }}>
              Invite member
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.25rem' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
          Enter the email address of someone who already has a Splittify account.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleInvite}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              type="email"
              className="form-input"
              placeholder="friend@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <UserPlus size={15} />
              {loading ? 'Adding...' : 'Add to group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
