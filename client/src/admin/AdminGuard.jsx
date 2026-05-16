/**
 * client/src/admin/AdminGuard.jsx
 * Waits for auth to settle, then redirects non-admins to home.
 */
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getIsAdmin } from '../lib/authBridge';

export default function AdminGuard({ children }) {
  const [ready, setReady] = useState(false);
  const [ok,    setOk]    = useState(false);

  useEffect(() => {
    // Auth handshake can take up to ~1 s — wait briefly then check
    const tid = setTimeout(() => {
      setOk(getIsAdmin());
      setReady(true);
    }, 800);
    return () => clearTimeout(tid);
  }, []);

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', color: 'var(--color-muted)', fontSize: '.9rem' }}>
        Checking permissions…
      </div>
    );
  }

  if (!ok) return <Navigate to="/" replace />;
  return children;
}
