/**
 * client/src/admin/pages/AdminLiveSessions.jsx
 * Admin CMS page — schedule, edit, delete live sessions + recording downloads.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Video, Mail, Sparkles, RefreshCw, Loader2, ChevronUp, ChevronDown,
  BarChart2, FileText, Download, AlertTriangle, CheckCircle, X,
  Film, Clapperboard,
} from 'lucide-react';
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

function formatDuration(seconds) {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Minimal Markdown → HTML converter for the AI summary panel.
 * Handles: ## headings, **bold**, bullet lists, > blockquotes, blank-line paragraphs.
 * No external dependency needed.
 */
function markdownToHtml(md) {
  if (!md) return '';
  const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = (s) => escape(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code>$1</code>');

  const lines  = md.split('\n');
  const output = [];
  let inList = false, inBlockquote = false;

  const closeList = () => { if (inList) { output.push('</ul>'); inList = false; } };
  const closeQuote = () => { if (inBlockquote) { output.push('</blockquote>'); inBlockquote = false; } };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (/^## (.+)/.test(line)) {
      closeList(); closeQuote();
      output.push(`<h3>${inline(line.slice(3))}</h3>`);
    } else if (/^# (.+)/.test(line)) {
      closeList(); closeQuote();
      output.push(`<h2>${inline(line.slice(2))}</h2>`);
    } else if (/^> (.+)/.test(line)) {
      closeList();
      if (!inBlockquote) { output.push('<blockquote>'); inBlockquote = true; }
      output.push(`<p>${inline(line.slice(2))}</p>`);
    } else if (/^[-*] (.+)/.test(line)) {
      closeQuote();
      if (!inList) { output.push('<ul>'); inList = true; }
      output.push(`<li>${inline(line.replace(/^[-*] /, ''))}</li>`);
    } else if (line.trim() === '') {
      closeList(); closeQuote();
      output.push('<br>');
    } else {
      closeList(); closeQuote();
      output.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList(); closeQuote();
  return output.join('');
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

/* ── RecordingsPanel ─────────────────────────────────────────────── */
function RecordingsPanel({ session, onClose }) {
  const [recordings,   setRecordings]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [emailing,     setEmailing]     = useState(false);
  const [emailResult,  setEmailResult]  = useState(null);
  const [emailError,   setEmailError]   = useState(null);

  // Transcript / summary state — seeded from session row if already generated
  const [txStatus,     setTxStatus]     = useState(session.transcript_status ?? 'none');
  const [txText,       setTxText]       = useState(session.transcript_text   ?? null);
  const [sumStatus,    setSumStatus]    = useState(session.summary_status    ?? 'none');
  const [sumText,      setSumText]      = useState(session.summary_text      ?? null);
  const [txGenerating, setTxGenerating] = useState(false);
  const [txError,      setTxError]      = useState(null);
  const [txExpanded,   setTxExpanded]   = useState(false);
  const [sumExpanded,  setSumExpanded]  = useState(true);

  useEffect(() => {
    apiClient.get(`${API}/${session.id}/recordings`)
      .then((r) => setRecordings(r.data?.data ?? []))
      .catch((e) => setError(e?.message ?? 'Failed to load recordings'))
      .finally(() => setLoading(false));
  }, [session.id]);

  const handleEmailParticipants = async () => {
    if (!window.confirm(
      `Email all RSVP'd participants the recording download link for "${session.title}"?\n\nThis will send an email to every person who RSVPd.`
    )) return;
    setEmailing(true);
    setEmailResult(null);
    setEmailError(null);
    try {
      const res = await apiClient.post(`${API}/${session.id}/email-recording`);
      setEmailResult(res.data);
    } catch (e) {
      setEmailError(e?.response?.data?.error ?? e?.message ?? 'Failed to send emails');
    } finally {
      setEmailing(false);
    }
  };

  const handleGenerateTranscript = async () => {
    if (txStatus === 'done' && !window.confirm(
      'A transcript already exists. Re-generate and overwrite it?'
    )) return;
    setTxGenerating(true);
    setTxError(null);
    setTxStatus('processing');
    setSumStatus('processing');
    try {
      const res = await apiClient.post(`${API}/${session.id}/transcript`);
      setTxStatus(res.data.transcriptStatus);
      setTxText(res.data.transcriptText ?? null);
      setSumStatus(res.data.summaryStatus);
      setSumText(res.data.summaryText ?? null);
      if (res.data.transcriptStatus === 'done') setSumExpanded(true);
    } catch (e) {
      setTxError(e?.response?.data?.error ?? e?.message ?? 'Failed to generate transcript');
      setTxStatus('failed');
      setSumStatus('failed');
    } finally {
      setTxGenerating(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2>Recordings &amp; Transcript</h2>
            <p className={styles.recSubtitle}>{session.title}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
        </div>

        <div className={styles.recBody}>

          {/* ── Recordings table ── */}
          {loading && <p className={styles.recInfo}>Loading recordings…</p>}
          {error   && <p className={styles.recError}><AlertTriangle size={14} style={{verticalAlign:'middle',marginRight:4}}/>{error}</p>}
          {!loading && !error && recordings.length === 0 && (
            <div className={styles.recEmpty}>
              <span className={styles.recEmptyIcon}><Clapperboard size={40} strokeWidth={1.4} /></span>
              <p>No recordings found for this session.</p>
              <p className={styles.recHint}>
                Cloud recording must be started during the session.<br />
                Recordings may take a few minutes to process after the call ends.
              </p>
            </div>
          )}
          {!loading && recordings.length > 0 && (
            <table className={styles.recTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Size</th>
                  <th>Status</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {recordings.map((r, i) => (
                  <tr key={r.id ?? i}>
                    <td>{i + 1}</td>
                    <td>{r.start_ts ? formatDate(new Date(r.start_ts * 1000).toISOString()) : '—'}</td>
                    <td>{formatDuration(r.duration)}</td>
                    <td>{formatBytes(r.file_size_bytes ?? r.filesize)}</td>
                    <td>
                      <span className={styles.recStatus} data-status={r.status ?? 'finished'}>
                        {r.status ?? 'finished'}
                      </span>
                    </td>
                    <td>
                      {r.download_link ? (
                        <a href={r.download_link} download target="_blank" rel="noreferrer"
                           className={styles.recDownloadBtn}>
                          <Download size={13} style={{marginRight:4,verticalAlign:'middle'}}/>Download
                        </a>
                      ) : (
                        <span className={styles.recNA}>Processing…</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ── Email participants ── */}
          {!loading && !error && (
            <div className={styles.recEmailRow}>
              <div className={styles.recEmailInfo}>
                <strong><Mail size={14} style={{verticalAlign:'middle',marginRight:5}}/>Notify participants</strong>
                <span>Send the recording download link to all RSVP'd participants via email.</span>
              </div>
              <button className={styles.emailBtn} onClick={handleEmailParticipants} disabled={emailing}>
                <Mail size={14} style={{marginRight:5,verticalAlign:'middle'}}/>
                {emailing ? 'Sending…' : 'Email Participants'}
              </button>
            </div>
          )}
          {emailResult && (
            <div className={styles.emailResultBanner} data-ok="true">
              <CheckCircle size={14} style={{verticalAlign:'middle',marginRight:5}}/>
              Emails sent: <strong>{emailResult.sent}</strong>
              {emailResult.failed  > 0 && <span> · Failed: <strong>{emailResult.failed}</strong></span>}
              {emailResult.skipped > 0 && <span> · Skipped: <strong>{emailResult.skipped}</strong></span>}
            </div>
          )}
          {emailError && (
            <div className={styles.emailResultBanner} data-ok="false">
              <AlertTriangle size={14} style={{verticalAlign:'middle',marginRight:5}}/>{emailError}
            </div>
          )}

          {/* ── Transcript & Summary section ── */}
          <div className={styles.txSection}>
            <div className={styles.txSectionHeader}>
              <div>
                <span className={styles.txSectionTitle}>
                  <Sparkles size={15} style={{verticalAlign:'middle',marginRight:5}}/>AI Transcript &amp; Summary
                </span>
                <span className={styles.txSectionHint}>
                  Tries Daily.co built-in transcripts first, then falls back to OpenAI Whisper.
                  GPT-4o generates the structured summary.
                </span>
              </div>
              <button
                className={styles.txGenerateBtn}
                onClick={handleGenerateTranscript}
                disabled={txGenerating}
              >
                {txGenerating
                  ? <><Loader2 size={14} className={styles.txSpinIcon} style={{marginRight:5}}/> Generating…</>
                  : txStatus === 'done'
                    ? <><RefreshCw size={14} style={{marginRight:5}}/> Re-generate</>
                    : <><Sparkles size={14} style={{marginRight:5}}/> Generate</>}
              </button>
            </div>

            {txError && (
              <div className={styles.emailResultBanner} data-ok="false">
                <AlertTriangle size={14} style={{verticalAlign:'middle',marginRight:5}}/>{txError}
              </div>
            )}

            {(txStatus === 'processing') && (
              <div className={styles.txProcessing}>
                <Loader2 size={16} className={styles.txSpinIcon} style={{flexShrink:0}}/>
                Transcribing audio and generating summary — this may take 1–3 minutes for long sessions…
              </div>
            )}

            {/* AI Summary */}
            {sumStatus === 'done' && sumText && (
              <div className={styles.txCard}>
                <button
                  className={styles.txCardToggle}
                  onClick={() => setSumExpanded((v) => !v)}
                >
                  <span><BarChart2 size={14} style={{verticalAlign:'middle',marginRight:5}}/>AI Summary</span>
                  <span className={styles.txChevron}>{sumExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</span>
                </button>
                {sumExpanded && (
                  <div
                    className={styles.txMarkdown}
                    /* Render Markdown as formatted text. We convert basic Markdown
                       to HTML via a lightweight regex approach — no external parser needed. */
                    dangerouslySetInnerHTML={{ __html: markdownToHtml(sumText) }}
                  />
                )}
              </div>
            )}

            {/* Raw Transcript */}
            {txStatus === 'done' && txText && (
              <div className={styles.txCard}>
                <button
                  className={styles.txCardToggle}
                  onClick={() => setTxExpanded((v) => !v)}
                >
                  <span><FileText size={14} style={{verticalAlign:'middle',marginRight:5}}/>Full Transcript</span>
                  <span className={styles.txChevron}>{txExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</span>
                </button>
                {txExpanded && (
                  <pre className={styles.txPre}>{txText}</pre>
                )}
              </div>
            )}

            {txStatus === 'failed' && !txError && (
              <p className={styles.recError}>
                <AlertTriangle size={14} style={{verticalAlign:'middle',marginRight:5}}/>
                Could not generate transcript. This session may not have a cloud recording yet,
                or the recording is still processing. Try again in a few minutes.
              </p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

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
          <button className={styles.closeBtn} onClick={onClose}><X size={16} /></button>
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
  const [sessions,        setSessions]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const [saveError,       setSaveError]       = useState(null);
  const [modal,           setModal]           = useState(null);
  const [saving,          setSaving]          = useState(false);
  const [search,          setSearch]          = useState('');
  const [recordingSession, setRecordingSession] = useState(null);

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
          <p className={styles.pageSubtitle}>Schedule and manage Daily.co sessions</p>
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
                      <Video size={12} style={{verticalAlign:'middle',marginRight:4}}/>{s.platform ?? 'daily'}
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
                        title="Open Daily.co room"
                      >
                        Join
                      </a>
                      <button
                        className={styles.recBtn}
                        onClick={() => setRecordingSession(s)}
                        title="View & download recordings"
                      >
                        <Film size={13} style={{marginRight:4,verticalAlign:'middle'}}/>Recordings
                      </button>
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

      {/* Recordings panel */}
      {recordingSession && (
        <RecordingsPanel
          session={recordingSession}
          onClose={() => setRecordingSession(null)}
        />
      )}

      {/* Schedule / Edit modal */}
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

