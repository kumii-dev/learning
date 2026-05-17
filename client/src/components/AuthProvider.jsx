/**
 * client/src/components/AuthProvider.jsx
 * Runs the iFrame auth handshake on mount.
 * Exposes auth state via useAuth() context hook.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { initAuthBridge, getPersona } from '../lib/authBridge';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export default function AuthProvider({ children }) {
  const [ready,   setReady]   = useState(false);
  const [error,   setError]   = useState(null);
  const [persona, setPersona] = useState(null);

  useEffect(() => {
    initAuthBridge()
      .then(() => {
        setPersona(getPersona());
        setReady(true);
      })
      .catch((err) => {
        console.error('[AuthProvider]', err.message);
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <div style={{ padding: '2rem', color: '#b91c1c' }}>
        <strong>Authentication failed:</strong> {error}
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: '.75rem',
        fontFamily: 'system-ui, sans-serif', background: 'var(--color-bg, #f5f3ee)',
      }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid #e5ddd4',
          borderTopColor: '#4a7c3e',
          borderRadius: '50%',
          animation: 'lh-spin .7s linear infinite',
        }} />
        <style>{`@keyframes lh-spin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: '.82rem', color: '#9ca3af', letterSpacing: '.01em' }}>
          Connecting to Learning Hub…
        </span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ ready, persona }}>
      {children}
    </AuthContext.Provider>
  );
}
