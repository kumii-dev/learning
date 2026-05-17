/**
 * client/src/pages/MyLearning.jsx
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import { getProfile } from '../lib/authBridge';
import styles from './MyLearning.module.css';
import LearnerStatCards from '../components/LearnerStatCards';
import CompletionDonut from '../components/CompletionDonut';
import WeeklyActivityChart from '../components/WeeklyActivityChart';

const QUOTES = [
  '"The expert in anything was once a beginner."',
  '"Quality means doing it right when no one is looking."',
  '"Learning never exhausts the mind."',
];

function getInitial(name) {
  return name ? name.trim()[0].toUpperCase() : 'U';
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* Circular progress SVG ─────────────────────────────────────────────────── */
function ProgressRing({ pct = 0, size = 90 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <svg width={size} height={size} className={styles.ring}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke="var(--color-primary)" strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize="13" fontWeight="800" fill="var(--color-text)">
        {pct}%
      </text>
      <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle"
        fontSize="9" fill="var(--color-muted)">
        Complete
      </text>
    </svg>
  );
}

/* Course card ───────────────────────────────────────────────────────────── */
function CourseCard({ course, enrolment }) {
  const level      = course.level ?? course.difficulty ?? 'beginner';
  const duration   = course.duration_min ? `${course.duration_min} min` : null;
  const tags       = course.tags ?? course.skills ?? [];
  const type       = course.course_type ?? 'Module';
  return (
    <div className={styles.card}>
      <Link to={`/courses/${course.id}`} className={styles.cardTitle}>
        {course.title}
      </Link>
      <p className={styles.cardDesc}>{course.description ?? course.short_description ?? ''}</p>
      <div className={styles.cardMeta}>
        <span className={styles.metaTag}>📦 {type}</span>
        <span className={styles.metaTag}>📊 {level}</span>
      </div>
      {duration && <div className={styles.cardDuration}>⏱ {duration}</div>}
      {tags.length > 0 && (
        <div className={styles.cardTags}>
          {tags.slice(0, 3).map((t) => <span key={t} className={styles.topicTag}>{t}</span>)}
        </div>
      )}
      {enrolment
        ? (
          <div className={styles.cardProgress}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${enrolment.progress_pct ?? 0}%` }} />
            </div>
            <span className={styles.pctLabel}>{enrolment.progress_pct ?? 0}%</span>
          </div>
        )
        : (
          <Link to={`/courses/${course.id}`} className={styles.startBtn}>
            Start Learning ↗
          </Link>
        )
      }
    </div>
  );
}

export default function MyLearning() {
  const [data,         setData]         = useState(null);
  const [courses,      setCourses]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [tab,          setTab]          = useState('in_progress');
  const [profile,      setProfile]      = useState(() => getProfile());

  /* Keep profile up-to-date */
  useEffect(() => {
    const handler = (e) => setProfile(e.detail?.profile ?? getProfile());
    window.addEventListener('kumii:profile', handler);
    return () => window.removeEventListener('kumii:profile', handler);
  }, []);

  useEffect(() => {
    Promise.all([
      apiClient.get('/my-learning'),
      apiClient.get('/courses').catch(() => ({ data: { data: [] } })),
    ]).then(([mlRes, cRes]) => {
      setData(mlRes.data.data);
      setCourses(cRes.data.data ?? cRes.data ?? []);
    }).catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  /* ── Derived profile fields ─────────────────────────────────────── */
  const firstName = profile?.first_name ?? profile?.full_name?.split(' ')[0] ?? 'there';
  const fullName  = profile?.full_name  ?? (`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'You');
  const location  = profile?.city && profile?.province
    ? `${profile.city}, ${profile.province}`
    : (profile?.city ?? profile?.location ?? null);
  const resumeUrl = profile?.resume_url ?? null;
  const quote     = QUOTES[new Date().getDate() % QUOTES.length];

  if (loading) return <p className={styles.state}>Loading your learning dashboard…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;

  const { enrolments } = data;
  const inProgress = enrolments.filter((e) => e.status !== 'completed');
  const completed  = enrolments.filter((e) => e.status === 'completed');

  /* Progress % */
  const totalPct = enrolments.length === 0 ? 0
    : Math.round(
        enrolments.reduce((s, e) => s + (e.status === 'completed' ? 100 : (e.progress_pct ?? 0)), 0)
        / enrolments.length
      );

  /* Cards to show in tab */
  const tabEnrolments = tab === 'completed' ? completed : inProgress;
  const tabCourses    = tabEnrolments.map((e) => ({ course: e.courses, enrolment: e }))
                          .filter((x) => x.course);

  /* Recommended = available courses not yet enrolled */
  const enrolledIds = new Set(enrolments.map((e) => e.courses?.id).filter(Boolean));
  const recommended = courses.filter((c) => !enrolledIds.has(c.id));

  /* Stat strip data */
  const statCards = [
    {
      label: 'Enrolled',
      value: enrolments.length,
      diff: null,
      icon: 'book-open',
      from: '#16a34a',
      to: '#059669',
    },
    {
      label: 'Completed',
      value: completed.length,
      diff: null,
      icon: 'award',
      from: '#7c3aed',
      to: '#4f46e5',
    },
    {
      label: 'Avg Progress',
      value: `${totalPct}%`,
      diff: null,
      icon: 'trending-up',
      from: '#0891b2',
      to: '#0284c7',
    },
  ];

  return (
    <main className={styles.page}>
      {/* ── Full-width greeting ─────────────────────────────────────── */}
      <h1 className={styles.greeting}>{getGreeting()}, {firstName}</h1>

      {/* ── Gradient stat strip ─────────────────────────────────────── */}
      <div className={styles.statStrip}>
        <LearnerStatCards stats={statCards} />
      </div>

      <div className={styles.layout}>
        {/* ════ LEFT SIDEBAR ══════════════════════════════════════════ */}
        <aside className={styles.sidebar}>

          {/* Profile card */}
          <div className={styles.profileCard}>
            <div className={styles.quoteBanner}>
              <p className={styles.quoteText}>{quote}</p>
              <p className={styles.quoteAuthor}>— Henry Ford</p>
            </div>
            <div className={styles.avatarWrap}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={fullName} className={styles.avatarImg} />
                : <div className={styles.avatarInitial}>{getInitial(fullName)}</div>
              }
            </div>
            <h2 className={styles.profileName}>{fullName}</h2>
            {location && <p className={styles.profileLocation}>{location}</p>}
          </div>

          {/* Additional info */}
          <div className={styles.sideSection}>
            <div className={styles.sideSectionHeader}>
              <h3>Additional info</h3>
              <button className={styles.editBtn} title="Edit">✏️</button>
            </div>
            <p className={styles.sideSectionLabel}>LINKS &amp; RESUME</p>
            {resumeUrl
              ? <a href={resumeUrl} target="_blank" rel="noreferrer" className={styles.resumeLink}>📄 Resume</a>
              : <span className={styles.noResume}>📄 No resume uploaded</span>
            }
          </div>

          {/* Completion donut */}
          {enrolments.length > 0 && (
            <CompletionDonut
              inProgress={inProgress.length}
              completed={completed.length}
              notStarted={Math.max(0, courses.length - enrolments.length)}
            />
          )}

          {/* Weekly activity */}
          {enrolments.length > 0 && (
            <WeeklyActivityChart enrolments={enrolments} />
          )}
        </aside>

        {/* ════ RIGHT CONTENT ═════════════════════════════════════════ */}
        <div className={styles.content}>

          {/* ── Your Learning Journey ───────────────────────────────── */}
          <section className={styles.journeyBox}>
            <div className={styles.journeyHeader}>
              <span className={styles.journeyTitle}>🎯 Your Learning Journey</span>
              {enrolments.length === 0 && <span className={styles.newLearnerBadge}>New Learner</span>}
            </div>
            <div className={styles.journeyBody}>
              <ProgressRing pct={totalPct} />
              <div className={styles.statsGrid}>
                <div className={styles.statCell}>
                  <span className={styles.statIcon}>📚</span>
                  <span className={styles.statNum}>{enrolments.length}</span>
                  <span className={styles.statLabel}>Courses Enrolled</span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statIcon}>🏆</span>
                  <span className={styles.statNum}>{completed.length}</span>
                  <span className={styles.statLabel}>Courses Completed</span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statIcon}>⚡</span>
                  <span className={styles.statNum}>{inProgress.length}</span>
                  <span className={styles.statLabel}>In Progress</span>
                </div>
                <div className={styles.statCell}>
                  <span className={styles.statIcon}>🌐</span>
                  <span className={styles.statNum}>{courses.length}</span>
                  <span className={styles.statLabel}>Available Courses</span>
                </div>
              </div>
            </div>
            {enrolments.length === 0 && (
              <p className={styles.journeyHint}>
                👋 Welcome! Start your learning journey by enrolling in a course or registering for a live session.
              </p>
            )}
          </section>

          {/* ── AI Recommended ──────────────────────────────────────── */}
          <div className={styles.aiBanner}>
            <div className={styles.aiBannerLeft}>
              <span className={styles.aiIcon}>🤖</span>
              <div>
                <p className={styles.aiBannerTitle}>AI-Recommended For You</p>
                <p className={styles.aiBannerSub}>Personalised courses based on your profile, goals, and learning history</p>
              </div>
            </div>
            <Link to="/courses" className={styles.smartMatch}>
              Smart Match →
            </Link>
          </div>

          {/* ── Tabs ────────────────────────────────────────────────── */}
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'in_progress' ? styles.tabActive : ''}`} onClick={() => setTab('in_progress')}>
              In Progress
            </button>
            <button className={`${styles.tab} ${tab === 'completed'  ? styles.tabActive : ''}`} onClick={() => setTab('completed')}>
              Completed
            </button>
          </div>

          {/* ── Course cards ────────────────────────────────────────── */}
          {tabCourses.length > 0 ? (
            <div className={styles.cardGrid}>
              {tabCourses.map(({ course, enrolment }) => (
                <CourseCard key={enrolment.id} course={course} enrolment={enrolment} />
              ))}
            </div>
          ) : (
            <>
              <p className={styles.emptyMsg}>
                {tab === 'completed'
                  ? 'No completed courses yet.'
                  : 'No courses in progress. Explore recommended courses below ↓'}
              </p>
              {/* Show recommended courses when tab is empty */}
              {recommended.length > 0 && (
                <div className={styles.cardGrid}>
                  {recommended.slice(0, 6).map((c) => (
                    <CourseCard key={c.id} course={c} enrolment={null} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
