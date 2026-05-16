/**
 * client/src/pages/Discover.jsx
 * The main discovery page — career paths, role-based courses, providers.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import styles from './Discover.module.css';

// ── Static career path cards ─────────────────────────────────────────────────
const CAREER_PATHS = [
  {
    title: 'Cloud Engineer',
    rating: '4.7',
    reviews: '327K',
    hours: '29.1',
    grad: 'grad0',
    emoji: '☁️',
  },
  {
    title: 'Data Scientist',
    rating: '4.6',
    reviews: '227K',
    hours: '47.1',
    grad: 'grad1',
    emoji: '📊',
  },
  {
    title: 'Digital Marketer',
    rating: '4.6',
    reviews: '3.9K',
    hours: '20.4',
    grad: 'grad2',
    emoji: '📱',
  },
];

// ── Static role columns ───────────────────────────────────────────────────────
const ROLE_COLS = [
  {
    label: 'Business Roles',
    courses: [
      { name: 'Intuit Academy Bookkeeping', provider: 'Intuit', rating: '4.6', emoji: '📘' },
      { name: 'Google Project Management', provider: 'Google', rating: '4.8', emoji: '📗' },
      { name: 'HRCI Human Resource Associate', provider: 'HRCI', rating: '4.8', emoji: '📙' },
    ],
  },
  {
    label: 'Data Roles',
    courses: [
      { name: 'Microsoft Power BI Data Analyst', provider: 'Microsoft', rating: '4.6', emoji: '📊' },
      { name: 'IBM Data Analyst', provider: 'IBM', rating: '4.6', emoji: '🔵' },
      { name: 'Google Data Analytics', provider: 'Google', rating: '4.8', emoji: '📈' },
    ],
  },
  {
    label: 'Tech Roles',
    courses: [
      { name: 'Microsoft Back-End Developer', provider: 'Microsoft', rating: '4.6', emoji: '💻' },
      { name: 'Meta Front-End Developer', provider: 'Meta', rating: '4.7', emoji: '⚛️' },
      { name: 'Google IT Support', provider: 'Google', rating: '4.8', emoji: '🛠️' },
    ],
  },
];

// ── Static providers ──────────────────────────────────────────────────────────
const PROVIDERS = [
  { name: 'Microsoft Learn', desc: 'Azure, Microsoft 365, and…', emoji: '🪟', color: '#f25022' },
  { name: 'Coursera',        desc: 'Top universities and…',       emoji: '🎓', color: '#0056d2' },
  { name: 'Udemy',           desc: 'Business, tech, and creati…', emoji: '🎯', color: '#a435f0' },
  { name: 'edX',             desc: 'Harvard, MIT, and…',          emoji: '📚', color: '#02262b' },
  { name: 'Khan Academy',    desc: 'Math, science…',              emoji: '🌿', color: '#14bf96' },
];

export default function Discover({ search }) {
  const [courses,  setCourses]  = useState([]);
  const [selected, setSelected] = useState(1); // highlight middle card by default
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get('/courses')
      .then((res) => setCourses(res.data.data ?? []))
      .catch(() => {});
  }, []);

  // Filter courses by search term if provided
  const filtered = search
    ? courses.filter((c) =>
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      )
    : courses;

  // If user is actively searching, show course results instead of the full discover view
  if (search && search.trim().length > 0) {
    return (
      <div className={styles.page}>
        <p style={{ marginBottom: '1rem', color: 'var(--color-muted)', fontSize: '.875rem' }}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {filtered.length === 0 && (
            <p style={{ color: 'var(--color-muted)' }}>No courses matched your search.</p>
          )}
          {filtered.map((c) => (
            <Link
              key={c.id}
              to={`/courses/${c.id}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '.75rem',
                background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius)', padding: '.75rem', textDecoration: 'none',
                color: 'var(--color-text)',
              }}
            >
              {c.thumbnail_url
                ? <img src={c.thumbnail_url} alt={c.title} style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} />
                : <span style={{ width: 48, height: 48, borderRadius: 6, background: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📖</span>
              }
              <div>
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{c.title}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--color-muted)' }}>{c.description?.slice(0, 80)}{c.description?.length > 80 ? '…' : ''}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>

      {/* ── Hero career paths ───────────────────────────────────────────── */}
      <section className={styles.heroSection}>
        <div className={styles.heroMeta}>
          <h1 className={styles.heroTitle}>Ready to reimagine your career?</h1>
          <p className={styles.heroSub}>Get the skills and real-world experience employers want with Career Accelerators.</p>
        </div>

        <div className={styles.heroCards}>
          {CAREER_PATHS.map((path, i) => (
            <div
              key={path.title}
              className={[
                styles.heroCard,
                styles[path.grad],
                selected === i ? styles.heroCardSelected : '',
              ].join(' ')}
              onClick={() => { setSelected(i); navigate('/courses'); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/courses')}
            >
              {/* Emoji/icon centred in the card body area */}
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-60%)',
                fontSize: '3.5rem', opacity: .35, userSelect: 'none',
              }}>
                {path.emoji}
              </div>

              <div className={styles.heroCardOverlay}>
                <div className={styles.heroCardTitle}>{path.title}</div>
                <div className={styles.heroCardMeta}>
                  <span className={styles.star}>★</span>
                  <span>{path.rating}</span>
                  <span>{path.reviews} ratings</span>
                  <span>·</span>
                  <span>{path.hours} total hours</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── In-demand roles ─────────────────────────────────────────────── */}
      <section className={styles.rolesSection}>
        <h2 className={styles.sectionTitle}>Prepare for an in-demand career</h2>
        <div className={styles.rolesCols}>
          {ROLE_COLS.map((col) => (
            <div key={col.label} className={styles.roleCol}>
              <div className={styles.roleColHeader}>{col.label}</div>
              {col.courses.map((course) => (
                <Link
                  key={course.name}
                  to="/courses"
                  className={styles.roleCourseCard}
                >
                  <div className={styles.roleThumbPlaceholder}>{course.emoji}</div>
                  <div className={styles.roleInfo}>
                    <div className={styles.roleName}>{course.name}</div>
                    <div className={styles.roleType}>
                      <span className={styles.roleStar}>★</span>
                      {course.rating} · Professional Certificate
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── Software providers ──────────────────────────────────────────── */}
      <section className={styles.providersSection}>
        <h2 className={styles.sectionTitle}>Software Learning Providers</h2>
        <p style={{ fontSize: '.8rem', color: 'var(--color-muted)', marginBottom: '.75rem' }}>
          Browse courses from leading global learning platforms.
        </p>
        <div className={styles.providersScroll}>
          {PROVIDERS.map((p) => (
            <Link key={p.name} to="/courses" className={styles.providerCard}>
              <div
                className={styles.providerLogo}
                style={{ background: p.color + '20', fontSize: '1.4rem' }}
              >
                {p.emoji}
              </div>
              <div className={styles.providerName}>{p.name}</div>
              <div className={styles.providerDesc}>{p.desc}</div>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}
