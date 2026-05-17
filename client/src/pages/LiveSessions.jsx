/**
 * client/src/pages/LiveSessions.jsx
 * Full calendar view for live learning sessions.
 * Adapted from ui2 BasicFullCalendar.tsx + CalendarSidebar pattern.
 */

import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin   from '@fullcalendar/daygrid';
import timeGridPlugin  from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import apiClient from '../lib/apiClient';
import styles from './LiveSessions.module.css';

/* ── Colour pool for session events ───────────────────────────────────────── */
const EVENT_COLORS = ['#1a56db', '#16a34a', '#7c3aed', '#0891b2', '#ea580c'];

function colorFor(index) {
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Upcoming session sidebar card ───────────────────────────────────────── */
function SessionCard({ session, colorIndex }) {
  const bg = colorFor(colorIndex);
  return (
    <div className={styles.sessionCard}>
      <div className={styles.sessionColorBar} style={{ background: bg }} />
      <div className={styles.sessionBody}>
        <p className={styles.sessionTitle}>{session.title ?? session.topic ?? 'Live Session'}</p>
        <p className={styles.sessionMeta}>
          {formatDate(session.scheduled_at ?? session.start_time)}
          {(session.scheduled_at ?? session.start_time) && ' · '}
          {formatTime(session.scheduled_at ?? session.start_time)}
        </p>
        {session.instructor && (
          <p className={styles.sessionInstructor}>👤 {session.instructor}</p>
        )}
        {(session.join_url ?? session.meeting_url) && (
          <a
            href={session.join_url ?? session.meeting_url}
            target="_blank"
            rel="noreferrer"
            className={styles.joinBtn}
          >
            Join →
          </a>
        )}
      </div>
    </div>
  );
}

/* ── Mock sessions (used when API returns none) ───────────────────────────── */
function mockSessions() {
  const now = new Date();
  const d = (offset, h = 10) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() + offset);
    dt.setHours(h, 0, 0, 0);
    return dt.toISOString();
  };
  return [
    { id: 'm1', title: 'Intro to Cloud Computing',     scheduled_at: d(1, 10),  instructor: 'Dr. A. Botha' },
    { id: 'm2', title: 'Python for Data Science Q&A',  scheduled_at: d(3, 14),  instructor: 'Prof. L. Nkosi' },
    { id: 'm3', title: 'Cybersecurity Workshop',        scheduled_at: d(7, 9),   instructor: 'T. Dlamini' },
    { id: 'm4', title: 'Career AMA — Tech Roles',       scheduled_at: d(10, 16), instructor: 'K. Mokoena' },
  ];
}

export default function LiveSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    apiClient.get('/live-sessions')
      .then((res) => {
        const data = res.data.data ?? res.data ?? [];
        setSessions(data.length > 0 ? data : mockSessions());
      })
      .catch(() => setSessions(mockSessions()))
      .finally(() => setLoading(false));
  }, []);

  /* Transform sessions into FullCalendar events */
  const events = sessions.map((s, i) => ({
    id:    String(s.id ?? i),
    title: s.title ?? s.topic ?? 'Live Session',
    start: s.scheduled_at ?? s.start_time ?? new Date().toISOString(),
    end:   s.end_time ?? undefined,
    backgroundColor: colorFor(i),
    borderColor:     colorFor(i),
  }));

  /* Upcoming = sessions in the future, sorted ascending */
  const upcoming = sessions
    .filter((s) => new Date(s.scheduled_at ?? s.start_time ?? 0) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at ?? a.start_time ?? 0) - new Date(b.scheduled_at ?? b.start_time ?? 0));

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Live Sessions</h1>
      <p className={styles.sub}>Join scheduled live classes, Q&amp;As, and workshops.</p>

      <div className={styles.layout}>

        {/* ── Sidebar: upcoming sessions ─────────────────────────────── */}
        <aside className={styles.sidebar}>
          <p className={styles.sideTitle}>Upcoming Sessions</p>
          {loading && <p className={styles.state}>Loading…</p>}
          {!loading && upcoming.length === 0 && (
            <p className={styles.state}>No upcoming sessions scheduled.</p>
          )}
          {upcoming.map((s, i) => (
            <SessionCard key={s.id ?? i} session={s} colorIndex={i} />
          ))}
        </aside>

        {/* ── Calendar ───────────────────────────────────────────────── */}
        <div className={styles.calWrap}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left:   'prev,next today',
              center: 'title',
              right:  'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={events}
            height="auto"
            selectable
            eventClick={(arg) => {
              const s = sessions.find((x) => String(x.id) === arg.event.id);
              const url = s?.join_url ?? s?.meeting_url;
              if (url) window.open(url, '_blank');
            }}
          />
        </div>

      </div>
    </main>
  );
}
