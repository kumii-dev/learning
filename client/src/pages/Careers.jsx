/**
 * client/src/pages/Careers.jsx
 * "Explore roles" careers catalogue — role cards with credentials.
 * Also surfaces live ESD programme courses added via the Admin CMS.
 */

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react';
import apiClient from '../lib/apiClient';
import styles from './Careers.module.css';

// ── Data ──────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  'All',
  'ESD Programmes',
  'Software Engineering & IT',
  'Business',
  'Sales & Marketing',
  'Data Science & Analytics',
  'Healthcare',
];

// arc colour palette: [bgColor, iconColor]
const ARC = {
  navy:   '#0f2d5e',
  amber:  '#d97706',
  teal:   '#0e7490',
  purple: '#6d28d9',
  rose:   '#be185d',
  green:  '#15803d',
};

const ROLES = [
  // ── Sales & Marketing ────────────────────────────────────────────────────
  {
    slug: 'digital-marketer',
    title: 'Digital Marketing Specialist',
    category: 'Sales & Marketing',
    arc: ARC.navy,
    icon: 'radio',
    desc: 'A Digital Marketing Specialist manages campaigns, optimizing SEO, SEM, and social media with tools like Google Analytics to increase engagement.',
    ifYouLike: 'creating online marketing campaigns, analyzing digital data, driving customer engagement',
    salary: 'ZAR 116,352',
    jobs: '803',
    credentials: [
      { logo: '🔵', name: 'Google Digital Marketing & E-commerce', provider: 'Google' },
      { logo: '🔷', name: 'IBM Digital Marketing and Growth Hacking with GenAI', provider: 'IBM' },
    ],
  },
  {
    slug: 'content-creator',
    title: 'Content Creator',
    category: 'Sales & Marketing',
    arc: ARC.navy,
    icon: 'edit',
    desc: 'A Content Creator produces a variety of content formats for digital platforms, including articles, videos, and social media posts.',
    ifYouLike: 'creating engaging digital content, experimenting with new strategies, analyzing audience feedback to enhance brand visibility',
    salary: 'ZAR 98,400',
    jobs: '540',
    credentials: [
      { logo: '🅰️', name: 'Adobe Content Creator: Launching Your Creative Career', provider: 'Adobe' },
    ],
  },
  {
    slug: 'cyber-security-specialist',
    title: 'Cyber Security Specialist / Technician',
    category: 'Software Engineering & IT',
    arc: ARC.navy,
    icon: 'lock',
    desc: 'A Cyber Security Specialist monitors systems, responds to incidents, enforces policies, and protects data from unauthorized access and cyber threats.',
    ifYouLike: 'monitoring computer systems for security issues, responding to cyber incidents, protecting sensitive data',
    salary: 'ZAR 557,366',
    jobs: '177',
    credentials: [
      { logo: '🔷', name: 'IBM and ISC2 Cybersecurity Specialist', provider: 'IBM' },
    ],
  },
  {
    slug: 'cyber-security-analyst',
    title: 'Cyber Security Analyst',
    category: 'Software Engineering & IT',
    arc: ARC.navy,
    icon: 'shield',
    desc: 'A Cyber Security Analyst monitors IT systems, analyzes threats, finds vulnerabilities, and implements measures to protect data from cyber attacks.',
    ifYouLike: 'protecting networks and data from cyber threats, analyzing security vulnerabilities, developing security protocols',
    salary: 'ZAR 1,018,130',
    jobs: '153',
    credentials: [
      { logo: '🔵', name: 'Google Cybersecurity', provider: 'Google' },
      { logo: '🔷', name: 'IBM Cybersecurity Analyst', provider: 'IBM' },
    ],
    moreCount: 4,
  },
  // ── Data Science & Analytics ─────────────────────────────────────────────
  {
    slug: 'ml-engineer',
    title: 'Machine Learning Engineer',
    category: 'Data Science & Analytics',
    arc: ARC.amber,
    icon: 'settings',
    desc: 'A Machine Learning Engineer builds and optimizes algorithms that enable computers to learn from data, using large datasets and neural networks.',
    ifYouLike: 'developing machine learning models, working with large datasets, coding in Python or R…',
    salary: 'ZAR 842,000',
    jobs: '312',
    credentials: [
      { logo: '🔵', name: 'Google Advanced ML on Google Cloud', provider: 'Google' },
      { logo: '🔷', name: 'IBM Machine Learning Professional Certificate', provider: 'IBM' },
    ],
  },
  {
    slug: 'data-scientist',
    title: 'Data Scientist',
    category: 'Data Science & Analytics',
    arc: ARC.amber,
    icon: 'zap',
    desc: 'A Data Scientist analyzes large datasets to uncover insights, using statistics, machine learning, and visualization to inform business strategies.',
    ifYouLike: 'analyzing complex datasets, developing machine learning models, solving…',
    salary: 'ZAR 128,600',
    jobs: '956',
    credentials: [
      { logo: '🔷', name: 'IBM Data Science Professional Certificate', provider: 'IBM' },
      { logo: '🔵', name: 'Google Advanced Data Analytics', provider: 'Google' },
    ],
  },
  {
    slug: 'data-analyst',
    title: 'Data Analyst',
    category: 'Data Science & Analytics',
    arc: ARC.amber,
    icon: 'trending-up',
    desc: 'A Data Analyst collects, cleans, and interprets data, using tools like Excel, SQL, and Tableau to analyze trends and provide insights for decisions.',
    ifYouLike: 'analyzing data to find insights, creating reports and visualizations, working with spreadsheets and databases',
    salary: 'ZAR 96,800',
    jobs: '1,204',
    credentials: [
      { logo: '🔵', name: 'Google Data Analytics Professional Certificate', provider: 'Google' },
      { logo: '📊', name: 'Microsoft Power BI Data Analyst', provider: 'Microsoft' },
    ],
  },
  {
    slug: 'network-admin',
    title: 'Network / Systems Administrator',
    category: 'Software Engineering & IT',
    arc: ARC.navy,
    icon: 'server',
    desc: 'A Network Administrator manages IT infrastructure, ensuring reliable and secure operations through configuration, monitoring, and troubleshooting.',
    ifYouLike: 'managing and configuring computer networks, ensuring network security…',
    salary: 'ZAR 380,000',
    jobs: '428',
    credentials: [
      { logo: '🪟', name: 'Microsoft Azure Administrator', provider: 'Microsoft' },
      { logo: '🔵', name: 'Google IT Support Professional Certificate', provider: 'Google' },
    ],
  },
  // ── Software Engineering & IT ────────────────────────────────────────────
  {
    slug: 'cloud-engineer',
    title: 'Cloud Engineer',
    category: 'Software Engineering & IT',
    arc: ARC.navy,
    icon: 'cloud',
    desc: 'A Cloud Engineer designs, builds and maintains cloud-based infrastructure on platforms like AWS, Azure and GCP, optimising for reliability and cost.',
    ifYouLike: 'building scalable infrastructure, solving complex systems problems, working with DevOps tools',
    salary: 'ZAR 142,800',
    jobs: '1,240',
    credentials: [
      { logo: '🔵', name: 'Google Cloud Professional Cloud Architect', provider: 'Google' },
      { logo: '🪟', name: 'Microsoft Azure Administrator', provider: 'Microsoft' },
    ],
  },
  {
    slug: 'frontend-developer',
    title: 'Front-End Developer',
    category: 'Software Engineering & IT',
    arc: ARC.teal,
    icon: 'monitor',
    desc: 'A Front-End Developer builds the visual and interactive parts of websites and apps using HTML, CSS, JavaScript, and modern frameworks like React.',
    ifYouLike: 'designing user interfaces, writing clean code, creating responsive web experiences',
    salary: 'ZAR 112,000',
    jobs: '2,100',
    credentials: [
      { logo: '⚛️', name: 'Meta Front-End Developer Professional Certificate', provider: 'Meta' },
      { logo: '🔵', name: 'Google UX Design Professional Certificate', provider: 'Google' },
    ],
  },
  {
    slug: 'backend-developer',
    title: 'Back-End Developer',
    category: 'Software Engineering & IT',
    arc: ARC.teal,
    icon: 'settings',
    desc: 'A Back-End Developer builds and maintains server-side logic, databases and APIs that power web applications.',
    ifYouLike: 'solving complex logic problems, working with databases, building APIs and services',
    salary: 'ZAR 128,000',
    jobs: '1,870',
    credentials: [
      { logo: '🪟', name: 'Microsoft Back-End Developer Professional Certificate', provider: 'Microsoft' },
      { logo: '⚛️', name: 'Meta Back-End Developer Professional Certificate', provider: 'Meta' },
    ],
  },
  // ── Business ─────────────────────────────────────────────────────────────
  {
    slug: 'project-manager',
    title: 'Project Manager',
    category: 'Business',
    arc: ARC.green,
    icon: 'clipboard',
    desc: 'A Project Manager plans, organises and oversees projects to ensure they are completed on time, within scope, and on budget.',
    ifYouLike: 'planning and organising, leading teams, keeping projects on track',
    salary: 'ZAR 104,000',
    jobs: '1,650',
    credentials: [
      { logo: '🔵', name: 'Google Project Management Professional Certificate', provider: 'Google' },
      { logo: '📗', name: 'HRCI Human Resource Associate', provider: 'HRCI' },
    ],
  },
  {
    slug: 'hr-specialist',
    title: 'HR Specialist',
    category: 'Business',
    arc: ARC.green,
    icon: 'users',
    desc: 'An HR Specialist manages recruiting, onboarding, employee relations, and compliance to create a productive and inclusive workplace.',
    ifYouLike: 'working with people, managing talent processes, creating positive workplace culture',
    salary: 'ZAR 88,200',
    jobs: '920',
    credentials: [
      { logo: '📗', name: 'HRCI Human Resource Associate', provider: 'HRCI' },
      { logo: '🔵', name: 'Google Project Management Certificate', provider: 'Google' },
    ],
  },
  // ── Healthcare ────────────────────────────────────────────────────────────
  {
    slug: 'health-informatics',
    title: 'Health Informatics Specialist',
    category: 'Healthcare',
    arc: ARC.rose,
    icon: 'activity',
    desc: 'A Health Informatics Specialist manages and analyses clinical data to improve healthcare delivery, using IT systems and data analytics.',
    ifYouLike: 'combining technology with healthcare, analysing patient data, improving clinical workflows',
    salary: 'ZAR 210,000',
    jobs: '380',
    credentials: [
      { logo: '🔷', name: 'IBM Data Science Professional Certificate', provider: 'IBM' },
      { logo: '🔵', name: 'Google Data Analytics Certificate', provider: 'Google' },
    ],
  },
  {
    slug: 'ux-designer',
    title: 'UX Designer',
    category: 'Business',
    arc: ARC.purple,
    icon: 'pen-tool',
    desc: 'A UX Designer crafts user-centred digital experiences by researching user needs, prototyping solutions, and testing designs.',
    ifYouLike: 'understanding user behaviour, designing intuitive interfaces, collaborating with product teams',
    salary: 'ZAR 118,000',
    jobs: '740',
    credentials: [
      { logo: '🔵', name: 'Google UX Design Professional Certificate', provider: 'Google' },
      { logo: '⚛️', name: 'Meta Social Media Marketing Certificate', provider: 'Meta' },
    ],
  },
  {
    slug: 'it-support',
    title: 'IT Support Specialist',
    category: 'Software Engineering & IT',
    arc: ARC.navy,
    icon: 'tool',
    desc: 'An IT Support Specialist helps users resolve technical issues with hardware, software, and networks, keeping systems running smoothly.',
    ifYouLike: 'helping people solve problems, working with hardware and software, troubleshooting systems',
    salary: 'ZAR 72,000',
    jobs: '3,200',
    credentials: [
      { logo: '🔵', name: 'Google IT Support Professional Certificate', provider: 'Google' },
      { logo: '🔷', name: 'IBM IT Support Professional Certificate', provider: 'IBM' },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Pick a deterministic arc colour from the course category string. */
const PROG_ARCS = ['#0d7f4f', '#0e7490', '#6d28d9', '#d97706', '#be185d', '#0f2d5e'];
function progArc(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return PROG_ARCS[h % PROG_ARCS.length];
}

/** Map a course category string to a feather icon name. */
const CAT_ICON = {
  'Technical Skills / ESD': 'tool',
  'Environmental / Compliance / ESD': 'wind',
  'Maritime / Business Support / ESD': 'anchor',
  'Construction / Business Management / ESD': 'home',
  'Export Readiness / Market Access / ESD': 'globe',
  'Supplier Development / Manufacturing / Quality': 'settings',
  'ISO Standards / Quality / Compliance': 'check-circle',
  'Business Management / Entrepreneurship': 'briefcase',
  'Programme Management / Reporting': 'bar-chart-2',
};
function catIcon(category = '') {
  return CAT_ICON[category] ?? 'book-open';
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function Careers() {
  const location = useLocation();
  const [level,    setLevel]    = useState('Beginner');
  const [category, setCategory] = useState(
    location.hash === '#esd' ? 'ESD Programmes' : 'All'
  );

  // Sync if user navigates here with #esd hash after initial render
  useEffect(() => {
    if (location.hash === '#esd') setCategory('ESD Programmes');
  }, [location.hash]);

  // Live CMS courses
  const [courses,        setCourses]        = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError,   setCoursesError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    setCoursesLoading(true);
    apiClient.get('/courses')
      .then((res) => { if (!cancelled) setCourses(res.data.data ?? res.data ?? []); })
      .catch((err) => { if (!cancelled) setCoursesError(err.message ?? 'Failed to load programmes'); })
      .finally(() => { if (!cancelled) setCoursesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Static roles visible in the current category filter (excludes ESD Programmes tab)
  const showRoles   = category !== 'ESD Programmes';
  const showPrograms = category === 'All' || category === 'ESD Programmes';

  const visibleRoles = showRoles
    ? ROLES.filter((r) => category === 'All' || r.category === category)
    : [];

  const totalCount = ROLES.length + courses.length;

  return (
    <div className={styles.page}>

      {/* Header */}
      <h1 className={styles.pageTitle}>Explore roles</h1>
      <p className={styles.pageSub}>
        Advance in your career with recognised credentials across levels.{' '}
        Choose from {ROLES.length} roles
        {courses.length > 0 && ` · ${courses.length} ESD programme${courses.length !== 1 ? 's' : ''}`}.
      </p>

      {/* Filters */}
      <div className={styles.filters}>
        <select
          className={styles.levelSelect}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
        </select>

        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={[
              styles.pill,
              category === cat ? styles.pillActive : '',
              cat === 'ESD Programmes' ? styles.pillESD : '',
            ].join(' ')}
            onClick={() => setCategory(cat)}
          >
            {cat === 'ESD Programmes' && (
              <FeatherIcon icon="star" size={11} style={{ marginRight: 3, verticalAlign: 'middle' }} />
            )}
            {cat}
          </button>
        ))}
      </div>

      {/* ── Static roles grid ── */}
      {showRoles && visibleRoles.length > 0 && (
        <div className={styles.grid}>
          {visibleRoles.map((role) => (
            <Link key={role.slug} to={`/careers/${role.slug}`} className={styles.card}>

              {/* Hero arc */}
              <div className={styles.cardHero}>
                <div className={styles.cardArc} style={{ background: role.arc }} />
                <div className={styles.cardIcon}><FeatherIcon icon={role.icon} size={28} color="#fff" /></div>
                <div className={styles.cardPersonWrap}>
                  <FeatherIcon icon="user" size={32} color="#fff" />
                </div>
              </div>

              {/* Body */}
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>{role.title}</div>
                <div className={styles.cardDesc}>{role.desc}</div>

                <div className={styles.cardIfYou}>
                  <strong>If you like: </strong>{role.ifYouLike}
                </div>

                <div className={styles.cardStats}>
                  <div className={styles.cardSalary}>{role.salary} median salary ¹</div>
                  <div className={styles.cardJobs}>{role.jobs} jobs available ¹</div>
                </div>

                <div className={styles.cardCredLabel}>Credentials</div>
                <div className={styles.credList}>
                  {role.credentials.map((c, i) => (
                    <div key={i} className={styles.credRow}>
                      <span className={styles.credLogo}>{(c.provider ?? '?')[0]}</span>
                      <span>{c.name}</span>
                    </div>
                  ))}
                  {role.moreCount && (
                    <div className={styles.credMore}>+ {role.moreCount} more</div>
                  )}
                </div>
              </div>

            </Link>
          ))}
        </div>
      )}

      {/* ── ESD Programmes section (live from Admin CMS) ── */}
      {showPrograms && (
        <section className={styles.progSection}>
          <div className={styles.progHeader}>
            <div>
              <h2 className={styles.progTitle}>
                <FeatherIcon icon="star" size={16} style={{ marginRight: 6, color: '#16a34a', verticalAlign: 'middle' }} />
                ESD Programmes
              </h2>
              <p className={styles.progSub}>
                Enterprise &amp; Supplier Development programmes managed by your organisation's Admin CMS.
              </p>
            </div>
          </div>

          {coursesLoading && (
            <div className={styles.progLoading}>
              <FeatherIcon icon="loader" size={20} className={styles.spin} />
              Loading programmes…
            </div>
          )}

          {coursesError && !coursesLoading && (
            <p className={styles.progError}>
              <FeatherIcon icon="alert-circle" size={14} style={{ marginRight: 4 }} />
              {coursesError}
            </p>
          )}

          {!coursesLoading && !coursesError && courses.length === 0 && (
            <p className={styles.progEmpty}>
              No programmes published yet. Admins can add them via the CMS.
            </p>
          )}

          {!coursesLoading && courses.length > 0 && (
            <div className={styles.progGrid}>
              {courses.map((course) => {
                const arc  = progArc(course.category ?? course.title);
                const icon = catIcon(course.category);
                return (
                  <Link
                    key={course.id}
                    to={`/courses/${course.id}`}
                    className={styles.progCard}
                  >
                    {/* Hero */}
                    <div className={styles.progCardHero} style={{ background: arc }}>
                      <FeatherIcon icon={icon} size={28} color="rgba(255,255,255,.85)" />
                      {course.level && (
                        <span className={styles.progLevelBadge}>{course.level}</span>
                      )}
                    </div>

                    {/* Body */}
                    <div className={styles.progCardBody}>
                      <div className={styles.progCardTitle}>{course.title}</div>
                      <div className={styles.progCardDesc}>
                        {course.description?.slice(0, 110)}{course.description?.length > 110 ? '…' : ''}
                      </div>

                      {/* Tags */}
                      {course.tags?.length > 0 && (
                        <div className={styles.progTags}>
                          {course.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className={styles.progTag}>{tag}</span>
                          ))}
                        </div>
                      )}

                      {/* Footer meta */}
                      <div className={styles.progMeta}>
                        {course.estimated_hours && (
                          <span className={styles.progMetaItem}>
                            <FeatherIcon icon="clock" size={11} />
                            {course.estimated_hours}h
                          </span>
                        )}
                        {course.category && (
                          <span className={styles.progMetaItem}>
                            <FeatherIcon icon="tag" size={11} />
                            {course.category.split('/')[0].trim()}
                          </span>
                        )}
                      </div>

                      <div className={styles.progEnrolCta}>
                        Enrol now <FeatherIcon icon="arrow-right" size={12} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

    </div>
  );
}
