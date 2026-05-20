/**
 * client/src/pages/LiveSessions.jsx
 * Learner live sessions page — FullCalendar + in-page Jitsi Meet video room.
 */

import { useState, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import styles from './LiveSessions.module.css';

const PALETTE = ['#4f46e5','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];
const colorFor = (i) => PALETTE[i % PALETTE.length];

/* ── helpers ─────────────────────────────────────────────────────── */
function isLiveNow(session) {
  const start = new Date(session.scheduled_at);
  const end   = new Date(start.getTime() + (session.duration_min ?? 60) * 60_000);
  const now   = new Date();
  return now >= start && now <= end;
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

/* ── VideoRoom — full-screen Jitsi iframe overlay ────────────────── */
function VideoRoom({ session, displayName, onClose }) {
  const room = session.jitsi_room || `kumii-${session.id}`;
  let src = `https://meet.jit.si/${room}`;

  const params = new URLSearchParams();
  if (displayName) params.set('userInfo.displayName', displayName);
  params.set('config.startWithAudioMuted', 'true');
  if (session.room_password) params.set('config.password', session.room_password);

  src += '#' + params.toString();

  return (
    <div className={styles.videoOverlay}>
      <div className={styles.videoHeader}>
        <span className={styles.videoTitle}>{session.title}</span>
        <button className={styles.leaveBtn} onClick={onClose}>✕ Leave</button>
      </div>
      <iframe
        title={session.title}
        src={src}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className={styles.videoFrame}
      />
    </div>
  );
}

/* ── SessionCard ─────────────────────────────────────────────────── */
function SessionCard({ session, colour, onJoin, onRsvp, rsvpLoading }) {
  const live = isLiveNow(session);

  return (
    <div className={styles.sessionCard}>
      <div className={styles.sessionColorBar} style={{ background: colour }} />
      <div className={styles.sessionBody}>
        <div className={styles.sessionTopRow}>
          <span className={styles.sessionTitle}>{session.title}</span>
          {live && <span className={styles.liveBadge}><span className={styles.liveDot} />LIVE</span>}
        </div>
        {session.topic && <span className={styles.sessionTopic}>{session.topic}</span>}
        <p className={styles.sessionMeta}>
          {formatDate(session.scheduled_at)}<br />
          {formatTime(session.scheduled_at)}
          {session.duration_min && ' · ' + session.duration_min + ' min'}
        </p>
        {session.instructor && (
          <p className={styles.sessionInstructor}>{session.instructor}</p>
        )}
        <div className={styles.sessionFooter}>
          <span className={styles.rsvpCount}>
            {session.rsvp_count ?? 0} going
          </span>
          <div className={styles.cardActions}>
            <button
              className={styles.rsvpBtn + (session.user_has_rsvp ? ' ' + styles.rsvpActive : '')}
              onClick={() => onRsvp(session)}
              disabled={rsvpLoading === session.id}
            >
              {session.user_has_rsvp ? '✓ Going' : '+ RSVP'}
            </button>
            <button
              className={styles.joinBtn}
              onClick={() => onJoin(session)}
            >
              {live ? '▶ Join Now' : 'Open Room'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── mock data ───────────────────────────────────────────────────── */
function mockSessions() {
  const base = new Date();
  base.setHours(14, 0, 0, 0);
  return [
    {
      id: 'mock-1',
      title: 'Introduction to AI Safety',
      topic: 'NIST AI RMF',
      instructor: 'Dr. Sarah Chen',
      scheduled_at: new Date(base.getTime() + 86400000).toISOString(),
      duration_min: 60,
      status: 'scheduled',
      jitsi_room: 'kumii-mock-1',
      rsvp_count: 12,
      user_has_rsvp: false,
      is_public: true,
    },
    {
      id: 'mock-2',
      title: 'Responsible AI Governance',
      topic: 'Ethics & Compliance',
      instructor: 'Prof. James Okafor',
      scheduled_at: new Date(base.getTime() + 3 * 86400000).toISOString(),
      duration_min: 90,
      status: 'scheduled',
      jitsi_room: 'kumii-mock-2',
      rsvp_count: 7,
      user_has_rsvp: false,
      is_public: true,
    },
  ];
}

/* ── main component ──────────────────────────────────────────────── */
export default function LiveSessions() {
  const [sessions,      setSessions]      = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [rsvpLoading,   setRsvpLoading]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [displayName,   setDisplayName]   = useState('');

  const fetchSessions = useCallback(async () => {
    try {
      const res  = await fetch('/api/live-sessions', { credentials: 'include' });
      const json = await res.json();
      const data = json.data ?? [];
      setSessions(data.length > 0 ? data : mockSessions());
    } catch {
      setSessions(mockSessions());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetch('/api/profile', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => {
        const p = j.data ?? j;
        if (p?.first_name) setDisplayName((p.first_name + ' ' + (p.last_name ?? '')).trim());
      })
      .catch(() => {});
  }, [fetchSessions]);

  const handleJoin = (session) => setActiveSession(session);

  const handleRsvp = async (session) => {
    setRsvpLoading(session.id);
    try {
      const res = await fetch('/api/live-sessions/' + session.id + '/rsvp', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const { rsvped } = await res.json();
        setSessions((prev) => prev.map((s) =>
          s.id === session.id
            ? {
                ...s,
                user_has_rsvp: rsvped,
                rsvp_count: rsvped
                  ? (s.rsvp_count ?? 0) + 1
                  : Math.max(0, (s.rsvp_count ?? 1) - 1),
              }
            : s
        ));
      }
    } catch { /* silent */ }
    setRsvpLoading(null);
  };

  const calEvents = sessions.map((s, i) => ({
    id:    s.id,
    title: s.title,
    start: s.scheduled_at,
    end:   s.end_time ?? new Date(new Date(s.scheduled_at).getTime() + (s.duration_min ?? 60) * 60_000).toISOString(),
    backgroundColor: colorFor(i),
    borderColor:     colorFor(i),
    extendedProps: s,
  }));

  const upcoming = sessions.filter((s) => new Date(s.scheduled_at) >= new Date());

  return (
    <>
      {activeSession && (
        <VideoRoom
          session={activeSession}
          displayName={displayName}
          onClose={() => setActiveSession(null)}
        />
      )}

      <div className={styles.page}>
        <h1 className={styles.heading}>Live Sessions</h1>

        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <h2 className={styles.sidebarTitle}>Upcoming</h2>
            {loading && <p className={styles.infoText}>Loading…</p>}
            {!loading && upcoming.length === 0 && (
              <p className={styles.infoText}>No upcoming sessions.</p>
            )}
            {upcoming.map((s, i) => (
              <SessionCard
                key={s.id}
                session={s}
                colour={colorFor(i)}
                onJoin={handleJoin}
                onRsvp={handleRsvp}
                rsvpLoading={rsvpLoading}
              />
            ))}
          </aside>

          <div className={styles.calWrap}>
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left:   'prev,next today',
                center: 'title',
                right:  'dayGridMonth,timeGridWeek,timeGridDay',
              }}
              events={calEvents}
              eventClick={({ event }) => setActiveSession(event.extendedProps)}
              height="auto"
            />
          </div>
        </div>
      </div>
    </>
  );
}
