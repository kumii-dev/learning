/**
 * client/src/pages/LearningPaths.jsx
 * Structured career learning paths with progress rings.
 * Adapted from ui2 StudentProgressCard.tsx + TopCategoriesCard.tsx
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react';
import apiClient from '../lib/apiClient';
import ProgressRing from '../components/ProgressRing';
import styles from './LearningPaths.module.css';

/* ── Static paths (enriched with ui2 colour palette) ───────────────────── */
const PATHS = [
  {
    slug: 'cloud-engineer',
    title: 'Cloud Engineer',
    icon: 'cloud',
    description: 'Master cloud infrastructure with AWS, Azure, and GCP.',
    courseCount: 8,
    from: '#1a56db',
    to: '#0891b2',
    tags: ['AWS', 'Azure', 'Networking'],
  },
  {
    slug: 'data-scientist',
    title: 'Data Scientist',
    icon: 'bar-chart-2',
    description: 'Learn Python, machine learning, and data visualisation.',
    courseCount: 11,
    from: '#7c3aed',
    to: '#ec4899',
    tags: ['Python', 'ML', 'SQL'],
  },
  {
    slug: 'digital-marketer',
    title: 'Digital Marketer',
    icon: 'smartphone',
    description: 'Build skills in SEO, social media, and analytics.',
    courseCount: 7,
    from: '#ea580c',
    to: '#f59e0b',
    tags: ['SEO', 'Google Ads', 'Analytics'],
  },
  {
    slug: 'cybersecurity',
    title: 'Cybersecurity',
    icon: 'lock',
    description: 'Defend systems with ethical hacking and threat analysis.',
    courseCount: 9,
    from: '#16a34a',
    to: '#059669',
    tags: ['CompTIA', 'Ethical Hacking', 'SIEM'],
  },
];

/* ── Path card ──────────────────────────────────────────────────────────── */
function PathCard({ path, progress }) {
  return (
    <div className={styles.card}>
      {/* Gradient header */}
      <div
        className={styles.cardHeader}
        style={{ background: `linear-gradient(135deg, ${path.from} 0%, ${path.to} 100%)` }}
      >
        <span className={styles.cardEmoji}><FeatherIcon icon={path.icon} size={32} color="#fff" /></span>
      </div>

      <div className={styles.cardBody}>
        {/* Progress ring */}
        <div className={styles.ringWrap}>
          <ProgressRing pct={progress} size={80} color={path.from} />
        </div>

        <h2 className={styles.cardTitle}>{path.title}</h2>
        <p className={styles.cardDesc}>{path.description}</p>

        <div className={styles.cardMeta}>
          <span className={styles.metaPill}><FeatherIcon icon="book-open" size={13} /> {path.courseCount} courses</span>
          {path.tags.map((t) => (
            <span key={t} className={styles.metaTag}>{t}</span>
          ))}
        </div>

        <div className={styles.cardFooter}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%`, background: path.from }} />
          </div>
          <Link to={`/careers/${path.slug}`} className={styles.btn} style={{ background: path.from }}>
            {progress > 0 ? <>Continue <FeatherIcon icon="arrow-right" size={14} /></> : <>Start Path <FeatherIcon icon="arrow-right" size={14} /></>}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LearningPaths() {
  const [enrolments, setEnrolments] = useState([]);

  useEffect(() => {
    apiClient.get('/my-learning')
      .then((res) => setEnrolments(res.data.data?.enrolments ?? []))
      .catch(() => {});
  }, []);

  /* Derive rough path progress from enrolments */
  function pathProgress(slug) {
    const relevant = enrolments.filter((e) => {
      const tags = (e.courses?.tags ?? []).join(' ').toLowerCase();
      const title = (e.courses?.title ?? '').toLowerCase();
      if (slug === 'cloud-engineer')   return tags.includes('cloud') || tags.includes('aws') || tags.includes('azure');
      if (slug === 'data-scientist')   return tags.includes('data') || tags.includes('python') || tags.includes('ml');
      if (slug === 'digital-marketer') return tags.includes('market') || tags.includes('seo');
      if (slug === 'cybersecurity')    return tags.includes('security') || title.includes('security');
      return false;
    });
    if (relevant.length === 0) return 0;
    const avg = relevant.reduce((s, e) => s + (e.status === 'completed' ? 100 : (e.progress_pct ?? 0)), 0) / relevant.length;
    return Math.round(avg);
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Learning Paths</h1>
      <p className={styles.sub}>Structured career tracks to guide your learning journey. Follow a path to build job-ready skills.</p>

      <div className={styles.grid}>
        {PATHS.map((path) => (
          <PathCard key={path.slug} path={path} progress={pathProgress(path.slug)} />
        ))}
      </div>

      <div className={styles.cta}>
        <p className={styles.ctaText}>Looking for a specific skill?</p>
        <Link to="/courses" className={styles.ctaBtn}>Browse All Courses <FeatherIcon icon="arrow-right" size={14} /></Link>
      </div>
    </main>
  );
}

