/**
 * client/src/pages/LiveSessions.jsx
 * Learner live sessions page — FullCalendar + in-page Daily.co video room.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

/* ── VideoRoom — full-screen Daily.co overlay (iframe embed) ────── */
/* ── VideoRoom — full-screen Daily.co overlay (iframe embed) ────── */
// NOTE: kept as a named export so import references don't break, but the
// main join flow now opens a new tab so this is only shown when join_url
// is missing (error state).
function VideoRoom({ session, onClose }) {
  const joinUrl =
    session.join_url ||
    (session.room_name ? `https://kumii.daily.co/${session.room_name}` : null);

  return (
    <div className={styles.videoOverlay}>
      <div className={styles.videoHeader}>
        <span className={styles.videoTitle}>{session.title}</span>
        <button className={styles.leaveBtn} onClick={onClose}>✕ Close</button>
      </div>
      <p style={{ color: '#fff', padding: '2rem' }}>
        {joinUrl
          ? <>Room is opening in a new tab. <a href={joinUrl} target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>Click here</a> if it didn't open.</>
          : 'Room URL not available yet. Please try again shortly.'}
      </p>
    </div>
  );
}

/* ── ConsentModal — recording consent gate before joining ─────────── */
function ConsentModal({ session, onAccept, onDecline }) {
  return (
    <div className={styles.consentBackdrop}>
      <div className={styles.consentModal}>
        {/* Icon */}
        <div className={styles.consentIcon}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>

        <h2 className={styles.consentTitle}>Recording &amp; Privacy Notice</h2>
        <p className={styles.consentSession}>{session.title}</p>

        <p className={styles.consentBody}>
          This live session <strong>may be recorded</strong> for training, quality
          assurance, and future learner access. By joining you confirm that:
        </p>

        <ul className={styles.consentList}>
          <li>You consent to being recorded (video, audio, and screen activity)</li>
          <li>The recording may be shared with other enrolled learners</li>
          <li>Recordings are stored securely and handled per our Privacy Policy</li>
        </ul>

        <p className={styles.consentNote}>
          If you do not wish to be recorded, please decline — you will not be able
          to join this session.
        </p>

        <div className={styles.consentActions}>
          <button className={styles.consentDecline} onClick={onDecline}>
            Decline &amp; Exit
          </button>
          <button className={styles.consentAccept} onClick={onAccept}>
            I Agree — Join Session
          </button>
        </div>
      </div>
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
  const navigate = useNavigate();
  const [sessions,       setSessions]       = useState([]);
  const [activeSession,  setActiveSession]  = useState(null);
  const [consentSession, setConsentSession] = useState(null); // session awaiting consent
  const [rsvpLoading,    setRsvpLoading]    = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [displayName,    setDisplayName]    = useState('');

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

  // Step 1: clicking Join opens the consent modal
  const handleJoin = (session) => setConsentSession(session);

  // Step 2a: learner accepted — open the room in a new tab
  const handleConsentAccept = () => {
    const session = consentSession;
    setConsentSession(null);
    const joinUrl =
      session.join_url ||
      (session.room_name ? `https://kumii.daily.co/${session.room_name}` : null);
    if (joinUrl) {
      window.open(joinUrl, '_blank', 'noopener,noreferrer');
    } else {
      setActiveSession(session); // fallback: show "no URL" overlay
    }
  };

  // Step 2b: learner declined — redirect to Discover
  const handleConsentDecline = () => {
    setConsentSession(null);
    navigate('/');
  };

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
      {consentSession && (
        <ConsentModal
          session={consentSession}
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
        />
      )}
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
