'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Profile } from '@/types';
import { X, Receipt, Equal, SlidersHorizontal } from 'lucide-react';

interface Props {
  groupId: string;
  currentUserId: string;
  members: Profile[];
  onClose: () => void;
  onAdded: () => void;
}

type SplitMode = 'equal' | 'manual';

export default function AddExpenseModal({ groupId, currentUserId, members, onClose, onAdded }: Props) {
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');

  // Equal mode state
  const [selectedIds, setSelectedIds] = useState<string[]>(members.map((m) => m.id));

  // Manual mode state: userId -> amount string
  const [manualAmounts, setManualAmounts] = useState<Record<string, string>>(
    Object.fromEntries(members.map((m) => [m.id, '']))
  );

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // ── Helpers ─────────────────────────────────────────────

  const totalCents = Math.round(parseFloat(amountStr) * 100) || 0;

  const manualTotalCents = Object.values(manualAmounts).reduce((sum, v) => {
    const n = Math.round(parseFloat(v) * 100);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  const manualRemaining = totalCents - manualTotalCents;

  const perPersonCents =
    splitMode === 'equal' && selectedIds.length > 0
      ? Math.floor(totalCents / selectedIds.length)
      : 0;

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const setManualAmount = (userId: string, value: string) => {
    setManualAmounts((prev) => ({ ...prev, [userId]: value }));
  };

  // ── Submit ───────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!amountStr || isNaN(totalCents) || totalCents <= 0) {
      setError('Enter a valid total amount.');
      return;
    }

    let splits: { user_id: string; amount_cents: number }[] = [];

    if (splitMode === 'equal') {
      if (selectedIds.length === 0) {
        setError('Select at least one person to split with.');
        return;
      }
      const base = Math.floor(totalCents / selectedIds.length);
      const remainder = totalCents - base * selectedIds.length;
      splits = selectedIds.map((uid, idx) => ({
        user_id: uid,
        amount_cents: idx === selectedIds.length - 1 ? base + remainder : base,
      }));
    } else {
      // Manual mode
      const entries = Object.entries(manualAmounts)
        .map(([uid, v]) => ({ user_id: uid, amount_cents: Math.round(parseFloat(v) * 100) }))
        .filter((e) => !isNaN(e.amount_cents) && e.amount_cents > 0);

      if (entries.length === 0) {
        setError('Enter at least one amount.');
        return;
      }

      const sum = entries.reduce((s, e) => s + e.amount_cents, 0);
      if (sum !== totalCents) {
        setError(`Split amounts total £${(sum / 100).toFixed(2)} but expense is £${(totalCents / 100).toFixed(2)}. They must match exactly.`);
        return;
      }
      splits = entries;
    }

    setLoading(true);

    const { data: expense, error: expErr } = await supabase
      .from('expenses')
      .insert({ group_id: groupId, paid_by: paidBy, amount_cents: totalCents, description })
      .select()
      .single();

    if (expErr || !expense) {
      setError(expErr?.message ?? 'Failed to add expense.');
      setLoading(false);
      return;
    }

    const { error: splitErr } = await supabase
      .from('expense_splits')
      .insert(splits.map((s) => ({ ...s, expense_id: expense.id })));

    if (splitErr) {
      setError(splitErr.message);
      setLoading(false);
      return;
    }

    onAdded();
    onClose();
  };

  // ── Render ───────────────────────────────────────────────

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
          {/* Description */}
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

          {/* Amount + Paid By */}
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
              <select className="form-input" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name || m.email}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Split mode toggle */}
          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label">Split method</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.25rem' }}>
              {([
                { mode: 'equal' as SplitMode, icon: <Equal size={15} />, label: 'Equal split', sub: 'Divide evenly' },
                { mode: 'manual' as SplitMode, icon: <SlidersHorizontal size={15} />, label: 'Manual split', sub: 'Enter amounts' },
              ]).map(({ mode, icon, label, sub }) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSplitMode(mode)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.75rem 1rem',
                    border: `2px solid ${splitMode === mode ? 'var(--navy)' : 'var(--border)'}`,
                    borderRadius: 10,
                    background: splitMode === mode ? '#EDF0F7' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: splitMode === mode ? 'var(--navy)' : 'var(--bg-subtle)',
                    color: splitMode === mode ? 'white' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)' }}>{label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sub}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Equal split ── */}
          {splitMode === 'equal' && (
            <div className="form-group">
              <label className="form-label">Split between</label>
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
                      <input type="checkbox" checked={checked} onChange={() => toggleMember(m.id)} style={{ display: 'none' }} />
                      <div className="avatar avatar-sm" style={{
                        background: checked ? 'var(--navy)' : 'var(--border)',
                        color: checked ? 'white' : 'var(--text-muted)', flexShrink: 0,
                      }}>
                        {(m.full_name || m.email)[0].toUpperCase()}
                      </div>
                      <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>
                        {m.full_name || m.email}
                      </span>
                      {checked && totalCents > 0 && (
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--navy)' }}>
                          £{(perPersonCents / 100).toFixed(2)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              {selectedIds.length > 0 && totalCents > 0 && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  £{(perPersonCents / 100).toFixed(2)} each · {selectedIds.length} {selectedIds.length === 1 ? 'person' : 'people'}
                </p>
              )}
            </div>
          )}

          {/* ── Manual split ── */}
          {splitMode === 'manual' && (
            <div className="form-group">
              <label className="form-label">Amounts per person</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                {members.map((m) => (
                  <div key={m.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.5rem 0.875rem', borderRadius: 10,
                    border: '1.5px solid var(--border)', background: 'white',
                  }}>
                    <div className="avatar avatar-sm" style={{ background: 'var(--navy)', color: 'white', flexShrink: 0 }}>
                      {(m.full_name || m.email)[0].toUpperCase()}
                    </div>
                    <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>
                      {m.full_name || m.email}
                    </span>
                    <div style={{ position: 'relative', width: 100 }}>
                      <span style={{
                        position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--text-muted)', fontSize: '0.875rem', pointerEvents: 'none',
                      }}>£</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        placeholder="0.00"
                        value={manualAmounts[m.id]}
                        onChange={(e) => setManualAmount(m.id, e.target.value)}
                        style={{ paddingLeft: '1.5rem', textAlign: 'right' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Running total */}
              <div style={{
                marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: 10,
                background: manualRemaining === 0 ? 'var(--success-pale)' : manualRemaining < 0 ? 'var(--danger-pale)' : 'var(--amber-pale)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {manualRemaining === 0 ? '✓ Amounts match total' : manualRemaining > 0 ? 'Remaining to assign' : 'Over by'}
                </span>
                <span style={{
                  fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '1rem',
                  color: manualRemaining === 0 ? 'var(--success)' : manualRemaining < 0 ? 'var(--danger)' : 'var(--amber)',
                }}>
                  {manualRemaining === 0 ? `£${(totalCents / 100).toFixed(2)}` : `£${(Math.abs(manualRemaining) / 100).toFixed(2)}`}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
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
