/**
 * client/src/admin/pages/AdminDashboard.jsx
 * Overview: stat cards + 7-day enrollment chart + top courses table.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../lib/apiClient';
import styles from './AdminDashboard.module.css';

/* ── Simple SVG bar chart ─────────────────────────────────────────────────── */
function BarChart({ data, height = 80 }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const barW = 28;
  const gap  = 8;
  const w    = data.length * (barW + gap) - gap;

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height + 20}`} className={styles.chart}>
      {data.map((d, i) => {
        const bh = Math.max((d.count / max) * height, 2);
        const x  = i * (barW + gap);
        const y  = height - bh;
        return (
          <g key={d.day}>
            <rect x={x} y={y} width={barW} height={bh}
              rx="4" fill="var(--color-primary)" opacity=".85" />
            <text x={x + barW / 2} y={height + 14} textAnchor="middle"
              fontSize="10" fill="#64748b">{d.label}</text>
            {d.count > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle"
                fontSize="9" fill="#16a34a" fontWeight="600">{d.count}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminDashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    apiClient.get('/cms/analytics/overview')
      .then((r) => setData(r.data.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.state}>Loading dashboard…</div>;
  if (error)   return <div className={styles.error}>{error}</div>;

  const completionRate = data.totalEnrolled
    ? Math.round((data.completions / data.totalEnrolled) * 100)
    : 0;

  const stats = [
    { label: 'Total Courses',    value: data.totalCourses,    sub: `${data.publishedCourses} published`, color: '#1a56db' },
    { label: 'Total Learners',   value: data.totalEnrolled,   sub: 'unique enrolments',                  color: '#7c3aed' },
    { label: 'Completions',      value: data.completions,     sub: `${completionRate}% completion rate`, color: '#16a34a' },
    { label: 'Avg. Score',       value: data.avgScore ? `${data.avgScore}%` : '—', sub: 'across all assessments', color: '#d97706' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSub}>Platform overview and key metrics</p>
        </div>
        <Link to="/admin/courses/new" className={styles.newBtn}>+ New Course</Link>
      </div>

      {/* ── Stat cards ── */}
      <div className={styles.statsGrid}>
        {stats.map((s) => (
          <div key={s.label} className={styles.statCard}
            style={{ '--accent': s.color }}>
            <div className={styles.statDot} />
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div className={styles.twoCol}>
        {/* ── Enrollment trend ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Enrolments — last 7 days</h2>
          </div>
          <div className={styles.chartWrap}>
            <BarChart data={data.last7} />
          </div>
        </div>

        {/* ── Top courses ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Top courses by enrolment</h2>
            <Link to="/admin/courses" className={styles.viewAll}>View all →</Link>
          </div>
          {data.topCourses.length === 0
            ? <p className={styles.empty}>No enrolment data yet.</p>
            : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Course</th>
                    <th className={styles.num}>Enrolled</th>
                    <th className={styles.num}>Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCourses.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link to={`/admin/courses/${c.id}/edit`} className={styles.courseLink}>
                          {c.title}
                        </Link>
                        {!c.published && <span className={styles.draftBadge}>Draft</span>}
                      </td>
                      <td className={styles.num}>{c.enrolled}</td>
                      <td className={styles.num}>{c.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          }
        </div>
      </div>
    </div>
  );
}
