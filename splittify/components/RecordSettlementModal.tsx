'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Profile, SettlementSuggestion } from '@/types';
import { X, ArrowRight, Handshake } from 'lucide-react';
import { formatMoney } from '@/lib/calculations';

interface Props {
  groupId: string;
  members: Profile[];
  currentUserId: string;
  // Pre-fill from a suggestion if user clicks "Record" on a specific suggestion
  suggestion?: SettlementSuggestion;
  onClose: () => void;
  onRecorded: () => void;
}

export default function RecordSettlementModal({
  groupId,
  members,
  currentUserId,
  suggestion,
  onClose,
  onRecorded,
}: Props) {
  const [fromUser, setFromUser] = useState(suggestion?.from.id ?? currentUserId);
  const [toUser, setToUser]     = useState(suggestion?.to.id ?? '');
  const [amountStr, setAmountStr] = useState(
    suggestion ? (suggestion.amount_cents / 100).toFixed(2) : ''
  );
  const [note, setNote] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fromUser || !toUser) {
      setError('Select both people.');
      return;
    }
    if (fromUser === toUser) {
      setError('From and to cannot be the same person.');
      return;
    }

    const amountCents = Math.round(parseFloat(amountStr) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    setLoading(true);

    const { error: err } = await supabase.from('group_settlements').insert({
      group_id: groupId,
      from_user: fromUser,
      to_user: toUser,
      amount_cents: amountCents,
      note: note.trim() || null,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    onRecorded();
    onClose();
  };

  const fromProfile = members.find((m) => m.id === fromUser);
  const toProfile   = members.find((m) => m.id === toUser);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--success-pale)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Handshake size={18} />
            </div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 600, color: 'var(--navy)' }}>
              Record settlement
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.25rem' }}>
            <X size={18} />
          </button>
        </div>

        {/* Preview pill */}
        {fromProfile && toProfile && amountStr && !isNaN(parseFloat(amountStr)) && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem', justifyContent: 'center',
            padding: '0.75rem 1rem', borderRadius: 12, marginBottom: '1.25rem',
            background: 'var(--success-pale)', border: '1px solid #b8e8d8',
          }}>
            <span style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '0.9rem' }}>
              {fromProfile.full_name?.split(' ')[0] || fromProfile.email}
            </span>
            <ArrowRight size={14} color="var(--success)" />
            <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, color: 'var(--success)', fontSize: '1rem' }}>
              {formatMoney(Math.round(parseFloat(amountStr) * 100))}
            </span>
            <ArrowRight size={14} color="var(--success)" />
            <span style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '0.9rem' }}>
              {toProfile.full_name?.split(' ')[0] || toProfile.email}
            </span>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* From / To selects */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.5rem', alignItems: 'end', marginBottom: '1rem' }}>
            <div>
              <label className="form-label">Who paid</label>
              <select className="form-input" value={fromUser} onChange={(e) => setFromUser(e.target.value)}>
                <option value="">Select…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
                ))}
              </select>
            </div>
            <div style={{ paddingBottom: '0.5rem', color: 'var(--text-muted)' }}>
              <ArrowRight size={18} />
            </div>
            <div>
              <label className="form-label">Who received</label>
              <select className="form-input" value={toUser} onChange={(e) => setToUser(e.target.value)}>
                <option value="">Select…</option>
                {members.filter((m) => m.id !== fromUser).map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount */}
          <div className="form-group">
            <label className="form-label">Amount (£)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="form-input"
              placeholder="0.00"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              required
            />
          </div>

          {/* Optional note */}
          <div className="form-group">
            <label className="form-label">Note <span style={{ color: 'var(--text-light)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Bank transfer, cash at airport…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ background: 'var(--success)', borderColor: 'var(--success)' }}>
              <Handshake size={15} />
              {loading ? 'Recording…' : 'Record payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
