/**
 * client/src/admin/pages/AdminRBAC.jsx
 * RBAC privilege matrix — manage per-admin access to each CMS tab.
 */
import { useEffect, useState, useCallback } from 'react';
import { ShieldCheck, Save, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import apiClient from '../../lib/apiClient';
import { getProfile } from '../../lib/authBridge';
import styles from './AdminRBAC.module.css';

/* ── Tab definitions (must match backend ALL_TABS) ───────────────── */
const TABS = [
  { key: 'dashboard',     label: 'Dashboard' },
  { key: 'courses',       label: 'Courses' },
  { key: 'analytics',     label: 'Analytics' },
  { key: 'learners',      label: 'Learners' },
  { key: 'assessments',   label: 'Assessments' },
  { key: 'live_sessions', label: 'Live Sessions' },
  { key: 'rbac',          label: 'RBAC' },
];

/* ── Toggle switch ────────────────────────────────────────────────── */
function Toggle({ checked, onChange, disabled, title }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled}
      className={`${styles.toggle} ${checked ? styles.toggleOn : styles.toggleOff}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className={styles.toggleThumb} />
    </button>
  );
}

/* ── Main page ────────────────────────────────────────────────────── */
export default function AdminRBAC() {
  const me = getProfile();

  const [admins,   setAdmins]   = useState([]);   // [ { id, email, full_name, privileges } ]
  const [dirty,    setDirty]    = useState({});    // { userId: { tab: bool } } — unsaved changes
  const [saving,   setSaving]   = useState(null);  // userId currently being saved
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState(null);  // { type: 'success'|'error', msg }
  const [q,        setQ]        = useState('');    // search query

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setDirty({});
    try {
      const res = await apiClient.get('/rbac');
      setAdmins(res.data?.data ?? []);
    } catch {
      showToast('error', 'Failed to load RBAC data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── toast helper ── */
  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  /* ── toggle a privilege locally ── */
  function handleToggle(userId, tab, value) {
    setDirty((prev) => ({
      ...prev,
      [userId]: { ...(prev[userId] ?? {}), [tab]: value },
    }));
  }

  /* ── get the effective (possibly dirtied) value for a cell ── */
  function getEffective(userId, tab, originalPrivileges) {
    if (dirty[userId] && tab in dirty[userId]) return dirty[userId][tab];
    return originalPrivileges[tab] ?? true;
  }

  /* ── save a single admin's changes ── */
  async function handleSave(userId) {
    if (!dirty[userId]) return;
    setSaving(userId);
    try {
      await apiClient.patch(`/rbac/${userId}`, { privileges: dirty[userId] });
      // Merge changes into local state
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === userId
            ? { ...a, privileges: { ...a.privileges, ...dirty[userId] } }
            : a
        )
      );
      setDirty((prev) => { const n = { ...prev }; delete n[userId]; return n; });
      showToast('success', 'Privileges saved successfully.');
    } catch (err) {
      const msg = err?.response?.data?.error ?? 'Failed to save privileges.';
      showToast('error', msg);
    } finally {
      setSaving(null);
    }
  }

  /* ── render ── */
  const filteredAdmins = admins.filter((a) => {
    if (!q) return true;
    const hay = `${a.full_name ?? ''} ${a.email ?? ''}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div className={styles.page}>
      {/* ── Toast ── */}
      {toast && (
        <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
          {toast.type === 'success'
            ? <CheckCircle size={16} />
            : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.pageTitleRow}>
          <ShieldCheck size={22} className={styles.pageIcon} />
          <div>
            <h1 className={styles.pageTitle}>Admin RBAC</h1>
            <p className={styles.pageSubtitle}>
              Control which CMS tabs each admin can access. Changes take effect on their next page load.
            </p>
          </div>
        </div>
        <button className={styles.refreshBtn} onClick={fetchData} disabled={loading}>
          <RefreshCw size={15} className={loading ? styles.spinning : ''} />
          Refresh
        </button>
      </div>

      {/* ── Info banner ── */}
      <div className={styles.infoBanner}>
        <Info size={15} />
        <span>
          Toggling a tab <strong>off</strong> hides it from the admin's nav and blocks direct URL access.
          The <strong>RBAC</strong> tab can only be revoked by another admin (self-lockout prevention).
        </span>
      </div>

      {/* ── Search bar ── */}
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="search"
          placeholder="Search admins by name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {!loading && (
          <span className={styles.count}>{filteredAdmins.length} admin{filteredAdmins.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {/* ── Matrix ── */}
      {loading ? (
        <div className={styles.loading}>
          <RefreshCw size={20} className={styles.spinning} />
          Loading admin accounts…
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className={styles.empty}>{admins.length === 0 ? 'No admin users found.' : 'No admins match your search.'}</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.matrix}>
            <thead>
              <tr>
                <th className={styles.thUser}>Admin User</th>
                {TABS.map((t) => (
                  <th key={t.key} className={styles.thTab}>{t.label}</th>
                ))}
                <th className={styles.thActions}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((admin) => {
                const isMe    = admin.id === me?.id;
                const hasDirt = Boolean(dirty[admin.id] && Object.keys(dirty[admin.id]).length > 0);
                const isSaving = saving === admin.id;

                return (
                  <tr key={admin.id} className={`${styles.row} ${isMe ? styles.rowSelf : ''}`}>
                    {/* User column */}
                    <td className={styles.tdUser}>
                      <div className={styles.userAvatar}>
                        {(admin.full_name ?? admin.email)?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className={styles.userInfo}>
                        <span className={styles.userName}>{admin.full_name ?? '—'}</span>
                        <span className={styles.userEmail}>{admin.email}</span>
                        {isMe && <span className={styles.youBadge}>You</span>}
                      </div>
                    </td>

                    {/* Privilege toggles */}
                    {TABS.map((t) => {
                      const val = getEffective(admin.id, t.key, admin.privileges);
                      // Can't remove your own RBAC access
                      const locked = isMe && t.key === 'rbac';
                      return (
                        <td key={t.key} className={styles.tdToggle}>
                          <Toggle
                            checked={val}
                            disabled={locked || isSaving}
                            title={locked ? 'Cannot revoke your own RBAC access' : (val ? 'Click to revoke' : 'Click to grant')}
                            onChange={(v) => handleToggle(admin.id, t.key, v)}
                          />
                        </td>
                      );
                    })}

                    {/* Save button */}
                    <td className={styles.tdActions}>
                      <button
                        className={`${styles.saveBtn} ${hasDirt ? styles.saveBtnActive : ''}`}
                        disabled={!hasDirt || isSaving}
                        onClick={() => handleSave(admin.id)}
                      >
                        {isSaving ? (
                          <RefreshCw size={13} className={styles.spinning} />
                        ) : (
                          <Save size={13} />
                        )}
                        {isSaving ? 'Saving…' : 'Save'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
