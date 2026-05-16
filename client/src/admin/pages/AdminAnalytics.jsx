/**
 * client/src/admin/pages/AdminAnalytics.jsx
 * Overview stats + per-course drill-down with SVG charts.
 */
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../lib/apiClient';
import styles from './AdminAnalytics.module.css';

/* ── SVG bar chart ────────────────────────────────────────────────────────── */
function BarChart({ data, colorFn, height = 80, showLabels = true }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const barW = 28;
  const gap  = 6;
  const w    = data.length * (barW + gap) - gap;
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height + (showLabels ? 20 : 4)}`} className={styles.chartSvg}>
      {data.map((d, i) => {
        const bh = Math.max((d.count / max) * height, 2);
        const x  = i * (barW + gap);
        const y  = height - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx="3"
              fill={colorFn ? colorFn(d, i) : '#16a34a'} opacity=".85" />
            {showLabels && d.label && (
              <text x={x + barW / 2} y={height + 14} textAnchor="middle"
                fontSize="9" fill="#94a3b8">{d.label}</text>
            )}
            {d.count > 0 && (
              <text x={x + barW / 2} y={y - 3} textAnchor="middle"
                fontSize="8" fill="#374151" fontWeight="600">{d.count}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ── Simple line chart ────────────────────────────────────────────────────── */
function LineChart({ data, height = 100 }) {
  if (!data || data.length < 2) return (
    <div className={styles.noData}>Not enough data to display chart.</div>
  );
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 500;
  const pad = 8;
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = pad + ((1 - d.count / max) * (height - pad * 2));
    return `${x},${y}`;
  }).join(' ');

  // Only label every 5th point
  const ticks = data.filter((_, i) => i % 5 === 0 || i === data.length - 1);

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${height + 20}`} className={styles.chartSvg}>
      <polyline points={points} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = pad + ((1 - d.count / max) * (height - pad * 2));
        return d.count > 0
          ? <circle key={i} cx={x} cy={y} r="3" fill="#16a34a" />
          : null;
      })}
      {ticks.map((d, idx) => {
        const i = data.indexOf(d);
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        return (
          <text key={idx} x={x} y={height + 18} textAnchor="middle"
            fontSize="9" fill="#94a3b8">{d.label || d.day?.slice(5)}</text>
        );
      })}
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */

export default function AdminAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseParam = searchParams.get('course') ?? '';

  const [overview,  setOverview]  = useState(null);
  const [courses,   setCourses]   = useState([]);
  const [detail,    setDetail]    = useState(null);
  const [selCourse, setSelCourse] = useState(courseParam);
  const [loading,   setLoading]   = useState(true);
  const [detLoading,setDetLoading]= useState(false);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    Promise.all([
      apiClient.get('/cms/analytics/overview'),
      apiClient.get('/cms/courses'),
    ])
      .then(([ovRes, cRes]) => {
        setOverview(ovRes.data.data);
        setCourses(cRes.data.data ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const loadCourseDetail = useCallback((id) => {
    if (!id) { setDetail(null); return; }
    setDetLoading(true);
    apiClient.get(`/cms/analytics/courses/${id}`)
      .then((r) => setDetail(r.data.data))
      .catch(() => setDetail(null))
      .finally(() => setDetLoading(false));
  }, []);

  useEffect(() => { loadCourseDetail(selCourse); }, [selCourse, loadCourseDetail]);

  function handleCourseChange(id) {
    setSelCourse(id);
    if (id) setSearchParams({ course: id }); else setSearchParams({});
  }

  if (loading) return <div className={styles.state}>Loading analytics…</div>;
  if (error)   return <div className={styles.error}>{error}</div>;

  const completionRate = overview.totalEnrolled
    ? Math.round((overview.completions / overview.totalEnrolled) * 100)
    : 0;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Analytics</h1>
          <p className={styles.pageSub}>Platform-wide and per-course metrics</p>
        </div>
      </div>

      {/* ── Overview stats ── */}
      <div className={styles.statsRow}>
        {[
          { label: 'Courses',          value: overview.totalCourses,    sub: `${overview.publishedCourses} published` },
          { label: 'Total Enrolments', value: overview.totalEnrolled,   sub: 'across all courses' },
          { label: 'Completions',      value: overview.completions,     sub: `${completionRate}% rate` },
          { label: 'Avg Score',        value: overview.avgScore ? `${overview.avgScore}%` : '—', sub: 'all assessments' },
        ].map((s) => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statValue}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={styles.statSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── 7-day enrollment ── */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Enrolments — last 7 days (all courses)</h2>
        <div className={styles.chartWrap}>
          <BarChart data={overview.last7} />
        </div>
      </div>

      {/* ── Per-course drill-down ── */}
      <div className={styles.card}>
        <div className={styles.courseSelectRow}>
          <h2 className={styles.cardTitle}>Course drill-down</h2>
          <select className={styles.courseSelect} value={selCourse}
            onChange={(e) => handleCourseChange(e.target.value)}>
            <option value="">— Select a course —</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {!selCourse && (
          <p className={styles.empty}>Select a course above to see detailed analytics.</p>
        )}

        {detLoading && <p className={styles.state}>Loading…</p>}

        {detail && !detLoading && (
          <>
            {/* Course stat row */}
            <div className={styles.detailStats}>
              {[
                { label: 'Enrolled',    value: detail.enrolled,    color: '#1a56db' },
                { label: 'In Progress', value: detail.inProgress,  color: '#d97706' },
                { label: 'Completed',   value: detail.completed,   color: '#16a34a' },
                { label: 'Avg Score',   value: detail.avgScore ? `${detail.avgScore}%` : '—', color: '#7c3aed' },
              ].map((s) => (
                <div key={s.label} className={styles.dStatCard} style={{ '--dc': s.color }}>
                  <div className={styles.dStatValue}>{s.value}</div>
                  <div className={styles.dStatLabel}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className={styles.twoCol}>
              {/* Score distribution */}
              <div className={styles.subCard}>
                <h3 className={styles.subTitle}>Score Distribution</h3>
                {detail.dist.every((d) => d.count === 0)
                  ? <p className={styles.noData}>No submissions yet.</p>
                  : (
                    <BarChart
                      data={detail.dist.map((d) => ({ ...d, label: d.label }))}
                      colorFn={(d) => d.label.startsWith('0') ? '#ef4444' : d.label.startsWith('50') ? '#f59e0b' : '#16a34a'}
                      showLabels
                    />
                  )
                }
              </div>

              {/* Enrollment trend */}
              <div className={styles.subCard}>
                <h3 className={styles.subTitle}>Enrolments — last 30 days</h3>
                <LineChart data={detail.last30} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
