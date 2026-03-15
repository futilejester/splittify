'use client';

import Link from 'next/link';
import { Receipt, Users, TrendingUp, ArrowRight, Check } from 'lucide-react';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 2rem', borderBottom: '1px solid var(--border)',
        background: 'rgba(245, 240, 232, 0.85)', backdropFilter: 'blur(12px)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <span style={{ fontFamily: 'Fraunces, serif', fontSize: '1.375rem', fontWeight: 700, color: 'var(--navy)' }}>
          Splittify
        </span>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/login" className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>Sign in</Link>
          <Link href="/register" className="btn btn-primary">Get started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '6rem 2rem 4rem', textAlign: 'center' }}>
        <div className="badge badge-amber" style={{ marginBottom: '1.5rem', fontSize: '0.8125rem' }}>
          ✈️ Made for group travel
        </div>
        <h1 style={{
          fontFamily: 'Fraunces, serif', fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          fontWeight: 700, color: 'var(--navy)', lineHeight: 1.1,
          marginBottom: '1.25rem', letterSpacing: '-0.02em',
        }}>
          Split expenses,<br />
          <em style={{ color: 'var(--coral)', fontStyle: 'italic' }}>not friendships.</em>
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-muted)', maxWidth: 480, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
          Track shared costs on holiday, with housemates, or for any group occasion. 
          Splittify keeps the maths clean so you can focus on the fun.
        </p>
        <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/register" className="btn btn-coral" style={{ fontSize: '1rem', padding: '0.75rem 1.75rem' }}>
            Start for free <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="btn btn-outline" style={{ fontSize: '1rem', padding: '0.75rem 1.75rem' }}>
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: 960, margin: '0 auto', padding: '2rem 2rem 6rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {[
            {
              icon: <Users size={22} />,
              title: 'Group management',
              desc: 'Create groups for any occasion — holidays, flatshares, dinners — and invite friends by email.',
              color: 'var(--navy)',
            },
            {
              icon: <Receipt size={22} />,
              title: 'Flexible expense splits',
              desc: 'Log who paid and split costs across any subset of group members in seconds.',
              color: 'var(--coral)',
            },
            {
              icon: <TrendingUp size={22} />,
              title: 'Instant balance tracking',
              desc: 'See exactly who owes who — and by how much — with minimal settlement transfers.',
              color: 'var(--teal)',
            },
          ].map((f) => (
            <div key={f.title} className="card" style={{ padding: '1.75rem' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${f.color}15`, color: f.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1rem',
              }}>
                {f.icon}
              </div>
              <h3 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Social proof strip */}
        <div className="card" style={{ marginTop: '1.25rem', padding: '1.5rem 2rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem 2.5rem', justifyContent: 'center' }}>
            {[
              'Free to use',
              'No credit card required',
              'Secure auth via Supabase',
              'Money stored as integer cents — no rounding errors',
            ].map((t) => (
              <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                <Check size={14} color="var(--success)" strokeWidth={3} /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-light)', fontSize: '0.8125rem', borderTop: '1px solid var(--border)' }}>
        © {new Date().getFullYear()} Splittify · Built with Next.js & Supabase
      </footer>
    </div>
  );
}
