/**
 * client/src/pages/Certificates.jsx
 * Certificate detail view — matches screenshot 5.
 */

import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { getProfile, notify } from '../lib/authBridge';
import styles from './Certificates.module.css';
import LearnerStatCards from '../components/LearnerStatCards';

/* ── helpers ─────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
function initials(name = '') {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export default function Certificates() {
  const [certs,   setCerts]   = useState([]);
  const [profile, setProfile] = useState(null);
  const [active,  setActive]  = useState(0);   // index of selected cert
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    Promise.all([
      apiClient.get('/certificates'),
      getProfile(),
    ])
      .then(([res, prof]) => {
        setCerts(res.data.data ?? []);
        setProfile(prof);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={styles.state}>Loading certificates…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;
  if (certs.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🏅</div>
        <h2>No certificates yet</h2>
        <p>Complete a course to earn your first certificate!</p>
      </div>
    );
  }

  const cert     = certs[active];
  const course   = cert.course ?? {};
  const fullName = profile
    ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
    : 'Learner';

  // derive "what you will learn" list from course.description or outcomes
  const outcomes = course.learning_outcomes
    ?? (course.description ?? '').split('. ').filter(Boolean).slice(0, 6);

  const skills = course.skills ?? course.topics ?? [];
  const grade  = cert.grade ?? cert.score ?? 100;
  const hours  = course.estimated_hours ?? Math.round((course.module_count ?? 4) * 1.5);

  /* ── Achievement stat strip ──────────────────────────────────────── */
  const avgGrade = certs.length
    ? Math.round(certs.reduce((s, c) => s + (c.grade ?? c.score ?? 100), 0) / certs.length)
    : 0;
  const totalHours = certs.reduce((s, c) => s + (c.course?.estimated_hours ?? Math.round((c.course?.module_count ?? 4) * 1.5)), 0);
  const certStats = [
    { label: 'Certificates',  value: certs.length, diff: null, icon: 'award',       from: '#7c3aed', to: '#4f46e5' },
    { label: 'Avg Score',     value: `${avgGrade}%`, diff: null, icon: 'trending-up', from: '#16a34a', to: '#059669' },
    { label: 'Hours Learned', value: `${totalHours}h`, diff: null, icon: 'clock',    from: '#0891b2', to: '#0284c7' },
  ];

  return (
    <main className={styles.page}>

      {/* Achievement stat strip */}
      <div className={styles.statStrip}>
        <LearnerStatCards stats={certStats} />
      </div>

      {/* Tab row if multiple certs */}
      {certs.length > 1 && (
        <div className={styles.tabs}>
          {certs.map((c, i) => (
            <button
              key={c.id}
              className={`${styles.tab} ${i === active ? styles.tabActive : ''}`}
              onClick={() => setActive(i)}
            >
              {c.course?.title ?? `Certificate ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <div className={styles.layout}>

        {/* ── Left panel ───────────────────────────────────── */}
        <aside className={styles.leftPanel}>

          {/* Avatar + completed by */}
          <div className={styles.avatarWrap}>
            <div className={styles.avatar}>{initials(fullName)}</div>
            <div className={styles.checkRing}>✓</div>
          </div>
          <p className={styles.completedBy}>Completed by <strong>{fullName}</strong></p>
          <p className={styles.completedDate}>{fmtDate(cert.issued_at)}</p>

          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <span className={styles.metaVal}>{hours}h</span>
              <span className={styles.metaLbl}>Learning</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaVal}>{grade}%</span>
              <span className={styles.metaLbl}>Grade</span>
            </div>
          </div>

          <hr className={styles.divider} />

          {/* Course title + provider */}
          <div className={styles.courseInfo}>
            <div className={styles.providerLogo}>K</div>
            <div>
              <p className={styles.courseTitle}>{course.title ?? 'Course'}</p>
              <p className={styles.provider}>{course.provider ?? 'Kumii Learning'}</p>
            </div>
          </div>

          {/* Star rating */}
          <div className={styles.rating}>
            {'★★★★★'.split('').map((s, i) => (
              <span key={i} className={styles.star}>{s}</span>
            ))}
            <span className={styles.ratingCount}>
              {course.rating_count ? `(${course.rating_count.toLocaleString()})` : ''}
            </span>
          </div>

          {/* What you'll learn */}
          {outcomes.length > 0 && (
            <>
              <p className={styles.sectionLabel}>What you will learn</p>
              <ul className={styles.outcomeList}>
                {outcomes.map((o, i) => (
                  <li key={i} className={styles.outcomeItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <>
              <p className={styles.sectionLabel}>Skills</p>
              <div className={styles.skillTags}>
                {skills.map((s) => (
                  <span key={s} className={styles.tag}>{s}</span>
                ))}
              </div>
            </>
          )}
        </aside>

        {/* ── Right panel ──────────────────────────────────── */}
        <section className={styles.rightPanel}>
          <div className={styles.certPreview}>
            <div className={styles.certInner}>
              <div className={styles.certLogo}>K</div>
              <p className={styles.certSubtitle}>Certificate of Completion</p>
              <p className={styles.certName}>{fullName}</p>
              <p className={styles.certCourse}>{course.title ?? 'Course'}</p>
              <p className={styles.certDate}>{fmtDate(cert.issued_at)}</p>
              <div className={styles.certSeal}>✦</div>
            </div>
          </div>

          <div className={styles.certActions}>
            <button
              className={styles.btnShare}
              onClick={() => notify.certificateIssued?.(cert.id)}
            >
              Share Certificate ↗
            </button>
            <button className={styles.btnDownload}>
              Download Certificate ↓
            </button>
          </div>
        </section>

      </div>
    </main>
  );
}

