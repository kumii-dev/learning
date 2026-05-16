/**
 * client/src/pages/MyLearning.jsx
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import { getProfile } from '../lib/authBridge';
import styles from './MyLearning.module.css';

const QUOTES = [
  'Quality means doing it right when no one is looking.',
  'The expert in anything was once a beginner.',
  'Learning never exhausts the mind.',
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

export default function MyLearning() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState('in_progress'); // 'in_progress' | 'completed'
  const [profile, setProfile] = useState(() => getProfile());

  /* Keep profile up-to-date if Kumii posts it after mount */
  useEffect(() => {
    const handler = (e) => setProfile(e.detail?.profile ?? getProfile());
    window.addEventListener('kumii:profile', handler);
    return () => window.removeEventListener('kumii:profile', handler);
  }, []);

  useEffect(() => {
    apiClient.get('/my-learning')
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  /* ── Derived profile fields ───────────────────────────────────────── */
  const firstName   = profile?.first_name  ?? profile?.full_name?.split(' ')[0] ?? 'there';
  const fullName    = profile?.full_name    ?? (`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'You');
  const jobTitle    = profile?.job_title    ?? profile?.role ?? null;
  const location    = profile?.city && profile?.province
    ? `${profile.city}, ${profile.province}`
    : profile?.location ?? null;
  const desiredRole = profile?.desired_role ?? profile?.desired_roles?.[0] ?? null;
  const resumeUrl   = profile?.resume_url   ?? null;
  const points      = profile?.points       ?? profile?.sloane_points ?? null;
  const quote       = QUOTES[Math.floor(new Date().getDate() % QUOTES.length)];

  if (loading) return <p className={styles.state}>Loading your learning dashboard…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;

  const { enrolments } = data;

  const inProgress = enrolments.filter((e) => e.status !== 'completed');
  const completed  = enrolments.filter((e) => e.status === 'completed');
  const listed     = tab === 'completed' ? completed : inProgress;

  return (
    <main className={styles.page}>
      {/* ── Top greeting ───────────────────────────────────────────────── */}
      <div className={styles.topGreeting}>
        <h1>{getGreeting()}, {firstName}</h1>
        {desiredRole && (
          <p className={styles.goalLine}>
            Your career goal is to grow in your role as an <strong>{desiredRole}</strong>
            <button className={styles.editGoal}>Edit goal</button>
          </p>
        )}
      </div>

      <div className={styles.layout}>
        {/* ════ LEFT PANEL ════════════════════════════════════════════════ */}
        <aside className={styles.sidebar}>

          {/* Profile card */}
          <div className={styles.profileCard}>
            {/* Quote banner */}
            <div className={styles.quoteBanner}>
              <p className={styles.quoteText}>"{quote}"</p>
              <p className={styles.quoteAuthor}>— Henry Ford</p>
            </div>

            {/* Avatar */}
            <div className={styles.avatarWrap}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={fullName} className={styles.avatarImg} />
                : <div className={styles.avatarInitial}>{getInitial(fullName)}</div>
              }
            </div>

            <h2 className={styles.profileName}>{fullName}</h2>
            {jobTitle  && <p className={styles.profileRole}>{jobTitle}</p>}
            {location  && <p className={styles.profileLocation}>{location}</p>}

            {points != null && (
              <div className={styles.pointsBadge}>
                <img src="/Kumii-logo.png" alt="Kumii" className={styles.pointsLogo} />
                <span>{points} ON SLOANE</span>
                <button className={styles.editBtn} title="Edit profile">✏️</button>
              </div>
            )}
          </div>

          {/* Work preferences */}
          {desiredRole && (
            <div className={styles.sideSection}>
              <div className={styles.sideSectionHeader}>
                <h3>Work preferences</h3>
                <button className={styles.editBtn} title="Edit">✏️</button>
              </div>
              <p className={styles.sideSectionLabel}>Desired roles</p>
              <div className={styles.desiredRoleRow}>
                <span className={styles.roleIcon}>👤</span>
                <span>{desiredRole}</span>
              </div>
            </div>
          )}

          {/* Additional info */}
          <div className={styles.sideSection}>
            <div className={styles.sideSectionHeader}>
              <h3>Additional info</h3>
              <button className={styles.editBtn} title="Edit">✏️</button>
            </div>
            <p className={styles.sideSectionLabel}>Links &amp; Resume</p>
            {resumeUrl
              ? <a href={resumeUrl} target="_blank" rel="noreferrer" className={styles.resumeLink}>📄 Resume</a>
              : <span className={styles.noResume}>📄 No resume uploaded</span>
            }
          </div>
        </aside>

        {/* ════ RIGHT PANEL ═══════════════════════════════════════════════ */}
        <section className={styles.content}>
          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === 'in_progress' ? styles.tabActive : ''}`}
              onClick={() => setTab('in_progress')}
            >
              In Progress
            </button>
            <button
              className={`${styles.tab} ${tab === 'completed' ? styles.tabActive : ''}`}
              onClick={() => setTab('completed')}
            >
              Completed
            </button>
          </div>

          {/* Course list */}
          {listed.length === 0 ? (
            <p className={styles.state}>
              {tab === 'completed'
                ? 'No completed courses yet.'
                : <>No courses in progress. <Link to="/courses">Browse courses →</Link></>
              }
            </p>
          ) : (
            <div className={styles.courseList}>
              {listed.map((e) => {
                const course   = e.courses ?? {};
                const provider = course.provider ?? '';
                const pct      = e.status === 'completed' ? 100 : (e.progress_pct ?? null);
                return (
                  <div key={e.id} className={styles.courseRow}>
                    {/* Provider logo or text */}
                    <div className={styles.rowLeft}>
                      {course.provider_logo_url
                        ? <img src={course.provider_logo_url} alt={provider} className={styles.providerLogo} />
                        : <span className={styles.providerText}>{provider}</span>
                      }
                      <Link to={`/courses/${course.id}`} className={styles.courseTitle}>
                        {course.title ?? 'Untitled course'}
                      </Link>
                      <span className={styles.courseType}>
                        Course · {pct != null ? `${pct}% complete` : e.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className={styles.rowActions}>
                      {e.status === 'completed' && (
                        <>
                          <button className={styles.btnLinkedIn}>Add to LinkedIn</button>
                          {course.certificate_url
                            ? <a href={course.certificate_url} target="_blank" rel="noreferrer" className={styles.certLink}>View certificate</a>
                            : <button className={styles.certLink}>View certificate</button>
                          }
                        </>
                      )}
                      {e.status !== 'completed' && pct != null && (
                        <div className={styles.progressBar}>
                          <div className={styles.progressFill} style={{ width: `${pct}%` }} />
                        </div>
                      )}
                      <button className={styles.moreBtn} title="More options">⋯</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
