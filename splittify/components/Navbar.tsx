'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { LogOut, PlusCircle } from 'lucide-react';

export default function Navbar() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : profile?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <nav style={{
      background: 'var(--navy)',
      padding: '0 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '60px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <Link
        href="/dashboard"
        style={{ fontFamily: 'Fraunces, serif', fontSize: '1.25rem', fontWeight: 700, color: 'white', textDecoration: 'none' }}
      >
        Splittify
      </Link>

      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/dashboard/groups/new" className="btn btn-coral" style={{ fontSize: '0.8125rem', padding: '0.45rem 1rem' }}>
            <PlusCircle size={14} /> New group
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div className="avatar avatar-sm" style={{ background: 'rgba(255,255,255,0.2)', fontSize: '0.75rem' }}>
              {initials}
            </div>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8125rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile?.full_name || profile?.email}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="btn btn-ghost"
            style={{ color: 'rgba(255,255,255,0.6)', padding: '0.4rem' }}
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </nav>
  );
}
