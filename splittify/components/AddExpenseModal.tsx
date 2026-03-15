'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Profile } from '@/types';
import { X, Receipt } from 'lucide-react';

interface Props {
  groupId: string;
  currentUserId: string;
  members: Profile[];
  onClose: () => void;
  onAdded: () => void;
}

export default function AddExpenseModal({ groupId, currentUserId, members, onClose, onAdded }: Props) {
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paidBy, setPaidBy] = useState(currentUserId);
  // selected member IDs for the split — default all
  const [selectedIds, setSelectedIds] = useState<string[]>(members.map((m) => m.id));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (selectedIds.length === 0) {
      setError('Select at least one person to split with.');
      return;
    }

    const amountCents = Math.round(parseFloat(amountStr) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    // Equal split — floor the remainder on the last member
    const base = Math.floor(amountCents / selectedIds.length);
    const remainder = amountCents - base * selectedIds.length;

    setLoading(true);

    // Insert expense
    const { data: expense, error: expErr } = await supabase
      .from('expenses')
      .insert({ group_id: groupId, paid_by: paidBy, amount_cents: amountCents, description })
      .select()
      .single();

    if (expErr || !expense) {
      setError(expErr?.message ?? 'Failed to add expense.');
      setLoading(false);
      return;
    }

    // Insert splits
    const splits = selectedIds.map((uid, idx) => ({
      expense_id: expense.id,
      user_id: uid,
      // Last member absorbs remainder
      amount_cents: idx === selectedIds.length - 1 ? base + remainder : base,
    }));

    const { error: splitErr } = await supabase.from('expense_splits').insert(splits);
    if (splitErr) {
      setError(splitErr.message);
      setLoading(false);
      return;
    }

    onAdded();
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--coral-pale)', color: 'var(--coral)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={18} />
            </div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 600, color: 'var(--navy)' }}>
              Add expense
            </h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '0.25rem' }}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Hotel night 1, Dinner at Nobu"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
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
            <div>
              <label className="form-label">Paid by</label>
              <select
                className="form-input"
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name || m.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Split equally between</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
              {members.map((m) => {
                const checked = selectedIds.includes(m.id);
                return (
                  <label
                    key={m.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.625rem 0.875rem', borderRadius: 10,
                      border: `1.5px solid ${checked ? 'var(--navy)' : 'var(--border)'}`,
                      background: checked ? '#EDF0F7' : 'white',
                      cursor: 'pointer', transition: 'all 0.12s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMember(m.id)}
                      style={{ display: 'none' }}
                    />
                    <div className="avatar avatar-sm" style={{ background: checked ? 'var(--navy)' : 'var(--border)', color: checked ? 'white' : 'var(--text-muted)', flexShrink: 0 }}>
                      {(m.full_name || m.email)[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>
                      {m.full_name || m.email}
                    </span>
                    {checked && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ✓
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {selectedIds.length > 0 && amountStr && !isNaN(parseFloat(amountStr)) && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              £{(parseFloat(amountStr) / selectedIds.length).toFixed(2)} per person
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
            <button type="submit" className="btn btn-coral" disabled={loading}>
              {loading ? 'Adding...' : 'Add expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
