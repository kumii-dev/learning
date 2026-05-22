/**
 * client/src/admin/pages/AdminLiveSessions.jsx
 * Admin CMS page — schedule, edit, delete live sessions.
 */

import { useState, useEffect, useCallback } from 'react';
import styles from './AdminLiveSessions.module.css';
import apiClient from '../../lib/apiClient';
import ErrorMessage from '../../components/ErrorMessage';

const API = '/live-sessions';

/* ── helpers ─────────────────────────────────────────────────────── */
function toLocalDatetimeInput(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_COLOURS = {
  scheduled: '#3b82f6',
  live:      '#22c55e',
  ended:     '#6b7280',
  cancelled: '#ef4444',
};

const EMPTY_FORM = {
  title: '', topic: '', description: '', instructor: '',
  scheduledAt: '', durationMin: 60, courseId: '',
  maxAttendees: '', roomPassword: '', isPublic: true,
};

/* ── subcomponents ───────────────────────────────────────────────── */
function StatCard({ label, value, colour }) {
  return (
    <div className={styles.statCard} style={{ borderTopColor: colour }}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function SessionModal({ initial, onSave, onClose, loading }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      durationMin:  parseInt(form.durationMin, 10) || 60,
      maxAttendees: form.maxAttendees ? parseInt(form.maxAttendees, 10) : null,
      courseId:     form.courseId || null,
    });
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>{initial?.id ? 'Edit Session' : 'Schedule Session'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <label>Title *
            <input required value={form.title} onChange={(e) => set('title', e.target.value)} />
          </label>
          <label>Topic
            <input value={form.topic} onChange={(e) => set('topic', e.target.value)} />
          </label>
          <label>Description
            <textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </label>
          <label>Instructor
            <input value={form.instructor} onChange={(e) => set('instructor', e.target.value)} />
          </label>
          <div className={styles.formRow}>
            <label>Date &amp; Time *
              <input
                required
                type="datetime-local"
                value={form.scheduledAt ? toLocalDatetimeInput(form.scheduledAt) : form.scheduledAt}
                onChange={(e) => set('scheduledAt', new Date(e.target.value).toISOString())}
              />
            </label>
            <label>Duration (min)
              <select value={form.durationMin} onChange={(e) => set('durationMin', e.target.value)}>
                {[30, 45, 60, 90, 120].map((v) => (
                  <option key={v} value={v}>{v} min</option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.formRow}>
            <label>Max Attendees
              <input type="number" min={1} value={form.maxAttendees} onChange={(e) => set('maxAttendees', e.target.value)} />
            </label>
            <label>Room Password
              <input type="password" value={form.roomPassword} onChange={(e) => set('roomPassword', e.target.value)} placeholder="Optional" />
            </label>
          </div>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={form.isPublic} onChange={(e) => set('isPublic', e.target.checked)} />
            Public session (visible to all learners)
          </label>
          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.saveBtn} disabled={loading}>
              {loading ? 'Saving…' : initial?.id ? 'Save Changes' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── main component ──────────────────────────────────────────────── */
export default function AdminLiveSessions() {
  const [sessions,  setSessions]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [modal,     setModal]     = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState('');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(API);
      setSessions(res.data?.data ?? []);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const handleSave = async (form) => {
    setSaving(true);
    setSaveError(null);
    try {
      const isEdit = !!modal?.id;
      const url    = isEdit ? `${API}/${modal.id}` : API;
      if (isEdit) {
        await apiClient.patch(url, form);
      } else {
        await apiClient.post(url, form);
      }
      setModal(null);
      fetchSessions();
    } catch (e) {
      setSaveError(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    try {
      await apiClient.delete(`${API}/${id}`);
      fetchSessions();
    } catch (e) {
      setError(e);
    }
  };

  const filtered = sessions.filter((s) =>
    !search || s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.instructor?.toLowerCase().includes(search.toLowerCase())
  );

  const now       = new Date();
  const upcoming  = sessions.filter((s) => new Date(s.scheduled_at) > now && s.status !== 'cancelled').length;
  const liveNow   = sessions.filter((s) => {
    const start = new Date(s.scheduled_at);
    const end   = new Date(start.getTime() + (s.duration_min ?? 60) * 60000);
    return now >= start && now <= end;
  }).length;
  const ended     = sessions.filter((s) => s.status === 'ended').length;
  const totalRsvp = sessions.reduce((acc, s) => acc + (s.rsvp_count ?? 0), 0);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Live Sessions</h1>
          <p className={styles.pageSubtitle}>Schedule and manage Jitsi Meet sessions</p>
        </div>
        <button className={styles.scheduleBtn} onClick={() => setModal('create')}>
          + Schedule Session
        </button>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <StatCard label="Upcoming"    value={upcoming}  colour="#3b82f6" />
        <StatCard label="Live Now"    value={liveNow}   colour="#22c55e" />
        <StatCard label="Ended"       value={ended}     colour="#6b7280" />
        <StatCard label="Total RSVPs" value={totalRsvp} colour="#a78bfa" />
      </div>

      {/* Search */}
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Search sessions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {loading && <p className={styles.info}>Loading…</p>}
      {error && <ErrorMessage error={error} onRetry={fetchSessions} />}
      {!loading && !error && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Instructor</th>
                <th>Date &amp; Time</th>
                <th>Duration</th>
                <th>Platform</th>
                <th>Status</th>
                <th>RSVPs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className={styles.empty}>No sessions found.</td></tr>
              )}
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className={styles.sessionTitle}>{s.title}</span>
                    {s.topic && <span className={styles.sessionTopic}>{s.topic}</span>}
                  </td>
                  <td>{s.instructor ?? '—'}</td>
                  <td>{formatDate(s.scheduled_at)}</td>
                  <td>{s.duration_min ?? 60} min</td>
                  <td>
                    <span className={styles.platformBadge}>
                      🎥 {s.platform ?? 'jitsi'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={styles.statusBadge}
                      style={{ background: STATUS_COLOURS[s.status] ?? '#6b7280' }}
                    >
                      {s.status ?? 'scheduled'}
                    </span>
                  </td>
                  <td>{s.rsvp_count ?? 0}</td>
                  <td>
                    <div className={styles.actionBtns}>
                      <a
                        href={s.join_url}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.joinLink}
                        title="Open Jitsi room"
                      >
                        Join
                      </a>
                      <button
                        className={styles.editBtn}
                        onClick={() => setModal(s)}
                        title="Edit session"
                      >
                        Edit
                      </button>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(s.id)}
                        title="Delete session"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <>
          {saveError && (
            <ErrorMessage error={saveError} onRetry={() => setSaveError(null)} compact />
          )}
          <SessionModal
            initial={modal === 'create' ? {} : {
              ...modal,
              scheduledAt: modal.scheduled_at,
              durationMin: modal.duration_min,
              maxAttendees: modal.max_attendees ?? '',
              roomPassword: modal.room_password ?? '',
              isPublic:     modal.is_public ?? true,
            }}
            onSave={handleSave}
            onClose={() => { setModal(null); setSaveError(null); }}
            loading={saving}
          />
        </>
      )}
    </div>
  );
}
