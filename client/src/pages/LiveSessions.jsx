/**
 * client/src/pages/LiveSessions.jsx
 * Learner live sessions page — FullCalendar + in-page Daily.co video room.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DailyProvider, useCallFrame } from '@daily-co/daily-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import styles from './LiveSessions.module.css';
import apiClient from '../lib/apiClient';

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

/* ── DailyFrame — internal: mounts the Daily call frame into the container ── */
function DailyFrame({ joinUrl }) {
  const containerRef = useRef(null);

  useCallFrame({
    parentElRef: containerRef,   // must be the ref object — NOT .current
    url: joinUrl,
    options: {
      // ── Chrome / shell ────────────────────────────────────────────
      showLeaveButton:          true,
      showFullscreenButton:     true,
      showLocalVideo:           true,
      showParticipantsBar:      true,

      // ── Toolbar features ──────────────────────────────────────────
      showChat:                 true,
      showScreenShare:          true,
      showRecordingButton:      true,
      showTranscriptionButton:  true,
      showBreakoutRoomsButton:  true,
      showHandRaiseButton:      true,
      showEmojiReactions:       true,
      showNetworkUI:            true,

      // ── Device controls ───────────────────────────────────────────
      showUserNameChangeUI:     true,
      showNoiseCancellationButton: true,

      // ── Pre-join lobby ────────────────────────────────────────────
      showPrejoinUI:            true,

      // ── iframe sizing ─────────────────────────────────────────────
      iframeStyle: {
        width:  '100%',
        height: '100%',
        border: 'none',
      },
    },
  });

  return <div ref={containerRef} className="daily-frame-container" style={{ width: '100%', height: '100%' }} />;
}

/* ── VideoRoom — full-screen Daily.co overlay ────────────────────── */
function VideoRoom({ session, onClose }) {
  // Prefer the stored join_url; fall back to constructing one from room_name
  const joinUrl =
    session.join_url ||
    (session.room_name ? `https://kumii.daily.co/${session.room_name}` : null);

  if (!joinUrl) {
    return (
      <div className={styles.videoOverlay}>
        <div className={styles.videoHeader}>
          <span className={styles.videoTitle}>{session.title}</span>
          <button className={styles.leaveBtn} onClick={onClose}>✕ Leave</button>
        </div>
        <p style={{ color: '#fff', padding: '2rem' }}>
          Room URL not available yet. Please try again shortly.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.videoOverlay}>
      <div className={styles.videoHeader}>
        <span className={styles.videoTitle}>{session.title}</span>
        <button className={styles.leaveBtn} onClick={onClose}>✕ Leave</button>
      </div>
      <DailyProvider>
        <DailyFrame joinUrl={joinUrl} />
      </DailyProvider>
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
      platform: 'daily',
      room_name: 'kumii-mock-1',
      join_url: 'https://kumii.daily.co/kumii-mock-1',
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
      platform: 'daily',
      room_name: 'kumii-mock-2',
      join_url: 'https://kumii.daily.co/kumii-mock-2',
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
      const res  = await apiClient.get('/live-sessions');
      const data = res.data?.data ?? [];
      setSessions(data.length > 0 ? data : mockSessions());
    } catch {
      setSessions(mockSessions());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    apiClient.get('/profile')
      .then((r) => {
        const p = r.data?.data ?? r.data;
        if (p?.first_name) setDisplayName((p.first_name + ' ' + (p.last_name ?? '')).trim());
      })
      .catch(() => {});
  }, [fetchSessions]);

  const handleJoin = (session) => setActiveSession(session);

  const handleRsvp = async (session) => {
    setRsvpLoading(session.id);
    try {
      const res = await apiClient.post(`/live-sessions/${session.id}/rsvp`);
      const { rsvped } = res.data;
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
