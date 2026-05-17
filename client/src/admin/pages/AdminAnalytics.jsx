/**
 * client/src/admin/pages/AdminAnalytics.jsx
 * Overview stats + per-course drill-down with ApexCharts.
 */
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import apiClient from '../../lib/apiClient';
import styles from './AdminAnalytics.module.css';

/* ── 7-day enrolment bar chart ──────────────────────────────────────────── */
function EnrolmentBarChart({ data }) {
  if (!data || data.length === 0) return null;
  const options = {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false }, animations: { enabled: false } },
    theme: { mode: 'light' },
    plotOptions: { bar: { borderRadius: 5, columnWidth: '52%' } },
    colors: ['#16a34a'],
    dataLabels: { enabled: false },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
    xaxis: { categories: data.map(d => d.label), labels: { style: { colors: '#64748b', fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: '#64748b', fontSize: '11px' } } },
    tooltip: { theme: 'light' },
  };
  return <ReactApexChart type="bar" options={options} series={[{ name: 'Enrolments', data: data.map(d => d.count) }]} height={220} />;
}

/* ── Score distribution bar chart ──────────────────────────────────────── */
function ScoreDistChart({ data }) {
  if (!data || data.every(d => d.count === 0)) return <p className={styles.noData}>No submissions yet.</p>;
  const colors = data.map(d =>
    d.label?.startsWith('0') ? '#ef4444' :
    d.label?.startsWith('50') ? '#f59e0b' :
    d.label?.startsWith('70') ? '#16a34a' : '#15803d'
  );
  const options = {
    chart: { type: 'bar', background: 'transparent', toolbar: { show: false }, animations: { enabled: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%', distributed: true } },
    colors,
    dataLabels: { enabled: false },
    legend: { show: false },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
    xaxis: { categories: data.map(d => d.label), labels: { style: { colors: '#64748b', fontSize: '11px' } }, axisBorder: { show: false }, axisTicks: { show: false } },
    yaxis: { labels: { style: { colors: '#64748b', fontSize: '11px' } } },
    tooltip: { theme: 'light' },
  };
  return <ReactApexChart type="bar" options={options} series={[{ name: 'Learners', data: data.map(d => d.count) }]} height={200} />;
}

/* ── 30-day enrolment trend area chart ─────────────────────────────────── */
function EnrolmentTrendChart({ data }) {
  if (!data || data.length < 2) return <p className={styles.noData}>Not enough data to display chart.</p>;
  const options = {
    chart: { type: 'area', background: 'transparent', toolbar: { show: false }, animations: { enabled: false } },
    stroke: { curve: 'smooth', width: 2 },
    colors: ['#16a34a'],
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0, stops: [0, 90, 100] } },
    dataLabels: { enabled: false },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 3 },
    xaxis: {
      categories: data.map(d => d.label || d.day?.slice(5)),
      tickAmount: 6,
      labels: { style: { colors: '#64748b', fontSize: '10px' } },
      axisBorder: { show: false }, axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: '#64748b', fontSize: '11px' } } },
    tooltip: { theme: 'light' },
  };
  return <ReactApexChart type="area" options={options} series={[{ name: 'Enrolments', data: data.map(d => d.count) }]} height={200} />;
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
          <EnrolmentBarChart data={overview.last7} />
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
                <ScoreDistChart data={detail.dist} />
              </div>

              {/* Enrollment trend */}
              <div className={styles.subCard}>
                <h3 className={styles.subTitle}>Enrolments — last 30 days</h3>
                <EnrolmentTrendChart data={detail.last30} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
