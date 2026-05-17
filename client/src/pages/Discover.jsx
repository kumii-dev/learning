/**
 * client/src/pages/Discover.jsx
 * The main discovery page — career paths, role-based courses, providers.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react';
import apiClient from '../lib/apiClient';
import styles from './Discover.module.css';
import CategoryChips from '../components/CategoryChips';
import CourseSparkline from '../components/CourseSparkline';

// ── Static career path cards ─────────────────────────────────────────────────
const CAREER_PATHS = [
  {
    title: 'Cloud Engineer',
    slug: 'cloud-engineer',
    rating: '4.7',
    reviews: '327K',
    hours: '29.1',
    grad: 'grad0',
    icon: 'cloud',
  },
  {
    title: 'Data Scientist',
    slug: 'data-scientist',
    rating: '4.6',
    reviews: '227K',
    hours: '47.1',
    grad: 'grad1',
    icon: 'bar-chart-2',
  },
  {
    title: 'Digital Marketer',
    slug: 'digital-marketer',
    rating: '4.6',
    reviews: '3.9K',
    hours: '20.4',
    grad: 'grad2',
    icon: 'smartphone',
  },
];

// ── Static role columns ───────────────────────────────────────────────────────
const ROLE_COLS = [
  {
    label: 'Business Roles',
    slug: 'digital-marketer',
    courses: [
      { name: 'Intuit Academy Bookkeeping', provider: 'Intuit', rating: '4.6' },
      { name: 'Google Project Management', provider: 'Google', rating: '4.8' },
      { name: 'HRCI Human Resource Associate', provider: 'HRCI', rating: '4.8' },
    ],
  },
  {
    label: 'Data Roles',
    slug: 'data-scientist',
    courses: [
      { name: 'Microsoft Power BI Data Analyst', provider: 'Microsoft', rating: '4.6' },
      { name: 'IBM Data Analyst', provider: 'IBM', rating: '4.6' },
      { name: 'Google Data Analytics', provider: 'Google', rating: '4.8' },
    ],
  },
  {
    label: 'Tech Roles',
    slug: 'cloud-engineer',
    courses: [
      { name: 'Microsoft Back-End Developer', provider: 'Microsoft', rating: '4.6' },
      { name: 'Meta Front-End Developer', provider: 'Meta', rating: '4.7' },
      { name: 'Google IT Support', provider: 'Google', rating: '4.8' },
    ],
  },
];

// ── Static providers ──────────────────────────────────────────────────────────
const PROVIDERS = [
  { name: 'Microsoft Learn', desc: 'Azure, Microsoft 365, and…', initial: 'M', color: '#f25022' },
  { name: 'Coursera',        desc: 'Top universities and…',       initial: 'C', color: '#0056d2' },
  { name: 'Udemy',           desc: 'Business, tech, and creati…', initial: 'U', color: '#a435f0' },
  { name: 'edX',             desc: 'Harvard, MIT, and…',          initial: 'e', color: '#02262b' },
  { name: 'Khan Academy',    desc: 'Math, science…',              initial: 'K', color: '#14bf96' },
];

export default function Discover({ search }) {
  const [courses,     setCourses]     = useState([]);
  const [selected,    setSelected]    = useState(1); // highlight middle card by default
  const [activeCategory, setActiveCategory] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get('/courses')
      .then((res) => setCourses(res.data.data ?? []))
      .catch(() => {});
  }, []);

  // Derive unique categories from live courses
  const categories = [...new Set(
    courses.map((c) => c.category ?? c.course_type).filter(Boolean)
  )].slice(0, 10);

  // Filter courses by search term if provided
  const filtered = search
    ? courses.filter((c) =>
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      )
    : activeCategory
      ? courses.filter((c) => (c.category ?? c.course_type) === activeCategory)
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
                : <span style={{ width: 48, height: 48, borderRadius: 6, background: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FeatherIcon icon="book-open" size={24} /></span>
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
              onClick={() => { setSelected(i); navigate(`/careers/${path.slug}`); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate(`/careers/${path.slug}`)}
            >
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-60%)',
                opacity: .35, userSelect: 'none',
              }}>
                <FeatherIcon icon={path.icon} size={56} color="#fff" />
              </div>

              {/* Sparkline bottom-right */}
              <div className={styles.sparklineWrap}>
                <CourseSparkline grad={path.grad} color="rgba(255,255,255,0.85)" />
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

      {/* ── Category filter chips ───────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className={styles.categorySection}>
          <h2 className={styles.sectionTitle}>Browse by Category</h2>
          <CategoryChips
            categories={categories}
            active={activeCategory}
            onChange={setActiveCategory}
          />
          {activeCategory && filtered.length > 0 && (
            <div className={styles.categoryResults}>
              {filtered.map((c) => (
                <Link key={c.id} to={`/courses/${c.id}`} className={styles.categoryResultCard}>
                  {c.thumbnail_url
                    ? <img src={c.thumbnail_url} alt={c.title} className={styles.catThumb} />
                    : <span className={styles.catThumbPlaceholder}><FeatherIcon icon="book-open" size={28} /></span>
                  }
                  <div className={styles.catInfo}>
                    <div className={styles.catTitle}>{c.title}</div>
                    <div className={styles.catDesc}>{c.description?.slice(0, 70)}{c.description?.length > 70 ? '…' : ''}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
          {activeCategory && filtered.length === 0 && (
            <p style={{ fontSize: '.85rem', color: 'var(--color-muted)' }}>No courses found in this category.</p>
          )}
        </section>
      )}

      {/* ── In-demand roles ─────────────────────────────────────────────── */}
      <section className={styles.rolesSection}>
        <h2 className={styles.sectionTitle}>Prepare for an in-demand career</h2>
        <div className={styles.rolesCols}>
          {ROLE_COLS.map((col) => (
            <div key={col.label} className={styles.roleCol}>
              <div className={styles.roleColHeader}>
                <Link to="/careers" style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                  {col.label}
                </Link>
              </div>
              {col.courses.map((course) => (
                <Link
                  key={course.name}
                  to={`/careers/${col.slug}`}
                  className={styles.roleCourseCard}
                >
                  <div className={styles.roleThumbPlaceholder}><FeatherIcon icon="book-open" size={20} /></div>
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
                style={{ background: p.color + '20', color: p.color, fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {p.initial}
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
