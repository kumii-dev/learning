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
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', color: '#6b7280', fontFamily: 'system-ui, sans-serif',
      }}>
        Connecting to Kumii platform…
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ ready, persona }}>
      {children}
    </AuthContext.Provider>
  );
}
