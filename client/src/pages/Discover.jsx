/**
 * client/src/pages/Discover.jsx
 * The main discovery page — Kumii-aligned design.
 * Hero banner → Category chips → Career paths → Roles → ESD → Providers
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

// ── Role columns — Kumii icon container colours ──────────────────────────────
const ROLE_COLS = [
  {
    label: 'Business Roles',
    slug: 'digital-marketer',
    icon: 'briefcase',
    iconBg: '#fff3e0',
    iconColor: '#f97316',
    courses: [
      { name: 'Intuit Academy Bookkeeping',  provider: 'Intuit',    rating: '4.6' },
      { name: 'Google Project Management',   provider: 'Google',    rating: '4.8' },
      { name: 'HRCI Human Resource Associate', provider: 'HRCI',   rating: '4.8' },
    ],
  },
  {
    label: 'Data Roles',
    slug: 'data-scientist',
    icon: 'trending-up',
    iconBg: '#e8f0fe',
    iconColor: '#4285f4',
    courses: [
      { name: 'Microsoft Power BI Data Analyst', provider: 'Microsoft', rating: '4.6' },
      { name: 'IBM Data Analyst',                provider: 'IBM',       rating: '4.6' },
      { name: 'Google Data Analytics',           provider: 'Google',    rating: '4.8' },
    ],
  },
  {
    label: 'Tech Roles',
    slug: 'cloud-engineer',
    icon: 'cpu',
    iconBg: '#e0f2f1',
    iconColor: '#0891b2',
    courses: [
      { name: 'Microsoft Back-End Developer', provider: 'Microsoft', rating: '4.6' },
      { name: 'Meta Front-End Developer',     provider: 'Meta',      rating: '4.7' },
      { name: 'Google IT Support',            provider: 'Google',    rating: '4.8' },
    ],
  },
];

// ── ESD helpers ───────────────────────────────────────────────────────────────
const ESD_BG_PALETTE = ['#0d7f4f','#0e7490','#6d28d9','#d97706','#be185d','#0f2d5e','#15803d','#0369a1'];
const ESD_CAT_ICON   = {
  'Technical Skills / ESD':                         'tool',
  'Environmental / Compliance / ESD':               'wind',
  'Maritime / Business Support / ESD':              'anchor',
  'Construction / Business Management / ESD':       'home',
  'Export Readiness / Market Access / ESD':         'globe',
  'Supplier Development / Manufacturing / Quality': 'settings',
  'ISO Standards / Quality / Compliance':           'check-circle',
  'Business Management / Entrepreneurship':         'briefcase',
  'Programme Management / Reporting':               'bar-chart-2',
};
function esdBg(title = '') {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return ESD_BG_PALETTE[h % ESD_BG_PALETTE.length];
}

// ── Static providers ──────────────────────────────────────────────────────────
const PROVIDERS = [
  { name: 'Microsoft Learn', desc: 'Azure, Microsoft 365…', initial: 'M', color: '#f25022', bg: '#fff0ee' },
  { name: 'Coursera',        desc: 'Universities & industry', initial: 'C', color: '#0056d2', bg: '#e8f0fe' },
  { name: 'Udemy',           desc: 'Business, tech, creative', initial: 'U', color: '#a435f0', bg: '#f3e8ff' },
  { name: 'edX',             desc: 'Harvard, MIT & more',  initial: 'e', color: '#02262b', bg: '#e0f2f1' },
  { name: 'Khan Academy',    desc: 'Math, science & more', initial: 'K', color: '#14bf96', bg: '#e0faf3' },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function Discover({ search }) {
  const [courses,        setCourses]        = useState([]);
  const [selected,       setSelected]       = useState(1);
  const [activeCategory, setActiveCategory] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.get('/courses')
      .then((res) => setCourses(res.data.data ?? []))
      .catch(() => {});
  }, []);

  const categories = [...new Set(
    courses.map((c) => c.category ?? c.course_type).filter(Boolean)
  )].slice(0, 10);

  const filtered = search
    ? courses.filter((c) =>
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      )
    : activeCategory
      ? courses.filter((c) => (c.category ?? c.course_type) === activeCategory)
      : courses;

  // ── Search results view ──────────────────────────────────────────────────
  if (search && search.trim().length > 0) {
    return (
      <div className={styles.page}>
        <p className={styles.searchMeta}>
          {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &ldquo;{search}&rdquo;
        </p>
        <div className={styles.searchResults}>
          {filtered.length === 0 && (
            <p className={styles.emptyMsg}>No courses matched your search.</p>
          )}
          {filtered.map((c) => (
            <Link key={c.id} to={`/courses/${c.id}`} className={styles.searchCard}>
              <span className={styles.searchCardIcon}>
                <FeatherIcon icon="book-open" size={22} color="#4a7c3e" />
              </span>
              <div className={styles.searchCardInfo}>
                <div className={styles.searchCardTitle}>{c.title}</div>
                <div className={styles.searchCardDesc}>{c.description?.slice(0, 90)}{c.description?.length > 90 ? '…' : ''}</div>
              </div>
              <FeatherIcon icon="arrow-right" size={16} color="var(--color-muted)" />
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // ── Main discover view ───────────────────────────────────────────────────
  return (
    <>
      {/* ── Full-bleed hero ──────────────────────────────────────────── */}
      <div className={styles.heroBleed}>
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>
            <FeatherIcon icon="star" size={13} />
            10 ESD Programmes now available
          </div>
          <h1 className={styles.heroHeading}>Learning Hub</h1>
          <p className={styles.heroSubtitle}>
            Advance in your career with recognised credentials across levels.<br />
            From ESD programmes to global tech certifications.
          </p>
          <div className={styles.heroCtas}>
            <Link to="/careers#esd" className={styles.heroCtaPrimary}>
              <FeatherIcon icon="star" size={15} />
              Browse ESD Programmes
            </Link>
            <Link to="/careers" className={styles.heroCtaOutline}>
              <FeatherIcon icon="briefcase" size={15} />
              Career Paths
            </Link>
            <Link to="/my-learning" className={styles.heroCtaOutline}>
              <FeatherIcon icon="book-open" size={15} />
              My Learning
            </Link>
            <Link to="/live-sessions" className={styles.heroCtaOutline}>
              <FeatherIcon icon="video" size={15} />
              Live Sessions
            </Link>
          </div>
        </div>
      </div>

    <div className={styles.page}>
      <section className={styles.heroSection}>
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
              <div className={styles.heroCardIcon}>
                <FeatherIcon icon={path.icon} size={44} color="rgba(255,255,255,.3)" />
              </div>
              <div className={styles.sparklineWrap}>
                <CourseSparkline grad={path.grad} color="rgba(255,255,255,0.7)" />
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

      {/* ── Category filter chips ────────────────────────────────────── */}
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
                  <span className={styles.catThumbPlaceholder}>
                    <FeatherIcon icon={ESD_CAT_ICON[c.category] ?? 'book-open'} size={22} color="#4a7c3e" />
                  </span>
                  <div className={styles.catInfo}>
                    <div className={styles.catTitle}>{c.title}</div>
                    <div className={styles.catDesc}>{c.description?.slice(0, 80)}{c.description?.length > 80 ? '…' : ''}</div>
                  </div>
                  <FeatherIcon icon="arrow-right" size={15} color="var(--color-muted)" />
                </Link>
              ))}
            </div>
          )}
          {activeCategory && filtered.length === 0 && (
            <p className={styles.emptyMsg}>No courses found in this category.</p>
          )}
        </section>
      )}

      {/* ── In-demand roles — Kumii feature-card grid ────────────────── */}
      <section className={styles.rolesSection}>
        <h2 className={styles.sectionTitle}>Prepare for an in-demand career</h2>
        <p className={styles.sectionSub}>Recognised credentials across business, data, and technology roles.</p>
        <div className={styles.rolesCols}>
          {ROLE_COLS.map((col) => (
            <div key={col.label} className={styles.roleCol}>
              {/* Icon container — Kumii style */}
              <div
                className={styles.roleColIconWrap}
                style={{ background: col.iconBg }}
              >
                <FeatherIcon icon={col.icon} size={22} color={col.iconColor} />
              </div>

              <div className={styles.roleColLabel}>
                <Link to="/careers" className={styles.roleColTitle}>{col.label}</Link>
              </div>

              <div className={styles.roleColCourses}>
                {col.courses.map((course) => (
                  <Link
                    key={course.name}
                    to={`/careers/${col.slug}`}
                    className={styles.roleCourseRow}
                  >
                    <span className={styles.roleCourseProviderDot}
                      style={{ background: course.provider === 'Google' ? '#4285f4'
                        : course.provider === 'IBM' ? '#be185d'
                        : course.provider === 'Microsoft' ? '#f25022'
                        : course.provider === 'Meta' ? '#1877f2'
                        : '#6b7280' }}
                    />
                    <span className={styles.roleCourseName}>{course.name}</span>
                    <span className={styles.roleCourseRating}>★ {course.rating}</span>
                  </Link>
                ))}
              </div>

              <Link to={`/careers/${col.slug}`} className={styles.roleColCta}>
                Explore {col.label} <FeatherIcon icon="arrow-right" size={13} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── ESD Programmes (live from Admin CMS) ─────────────────────── */}
      {courses.length > 0 && !activeCategory && (
        <section className={styles.esdSection}>
          <div className={styles.esdHeader}>
            <div>
              <h2 className={styles.sectionTitle} style={{ marginBottom: '.2rem' }}>
                ESD Programmes
              </h2>
              <p className={styles.sectionSub}>
                Enterprise &amp; Supplier Development — enrol and earn your certificate.
              </p>
            </div>
            <Link to="/careers#esd" className={styles.viewAllLink}>
              View all <FeatherIcon icon="arrow-right" size={13} />
            </Link>
          </div>

          <div className={styles.esdScroll}>
            {courses.slice(0, 8).map((course) => {
              const bg   = esdBg(course.title ?? '');
              const icon = ESD_CAT_ICON[course.category] ?? 'book-open';
              return (
                <Link key={course.id} to={`/courses/${course.id}`} className={styles.esdCard}>
                  <div className={styles.esdCardHero} style={{ background: bg }}>
                    <FeatherIcon icon={icon} size={26} color="rgba(255,255,255,.85)" />
                    {course.level && (
                      <span className={styles.esdLevelBadge}>{course.level}</span>
                    )}
                  </div>
                  <div className={styles.esdCardBody}>
                    <div className={styles.esdCardTitle}>{course.title}</div>
                    {course.tags?.length > 0 && (
                      <div className={styles.esdTagRow}>
                        {course.tags.slice(0, 2).map((t) => (
                          <span key={t} className={styles.esdTag}>{t}</span>
                        ))}
                      </div>
                    )}
                    <div className={styles.esdCardCta}>
                      {course.estimated_hours && (
                        <span className={styles.esdHours}>
                          <FeatherIcon icon="clock" size={10} /> {course.estimated_hours}h
                        </span>
                      )}
                      <span className={styles.esdEnrol}>Enrol <FeatherIcon icon="arrow-right" size={11} /></span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Software providers ───────────────────────────────────────── */}
      <section className={styles.providersSection}>
        <h2 className={styles.sectionTitle}>Software Learning Providers</h2>
        <p className={styles.sectionSub}>
          Browse courses from leading global learning platforms.
        </p>
        <div className={styles.providersRow}>
          {PROVIDERS.map((p) => (
            <Link key={p.name} to="/courses" className={styles.providerCard}>
              <div className={styles.providerLogo} style={{ background: p.bg, color: p.color }}>
                {p.initial}
              </div>
              <div className={styles.providerName}>{p.name}</div>
              <div className={styles.providerDesc}>{p.desc}</div>
            </Link>
          ))}
        </div>
      </section>

    </div>
    </>
  );
}

