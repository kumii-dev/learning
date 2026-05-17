/**
 * client/src/admin/pages/AdminDashboard.jsx
 * Overview: stat cards + 7-day enrollment chart + top courses table.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import apiClient from '../../lib/apiClient';
import styles from './AdminDashboard.module.css';
import FeatherIcon from 'feather-icons-react';

/* ── ApexCharts bar chart — 7-day enrolments ──────────────────────────────── */
function EnrolmentBarChart({ data }) {
  const options = {
    chart: { type: 'bar', toolbar: { show: false }, background: 'transparent' },
    theme: { mode: 'dark' },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '52%' } },
    colors: ['#16a34a'],
    dataLabels: { enabled: false },
    grid: { borderColor: '#1e293b', strokeDashArray: 4 },
    xaxis: {
      categories: data.map((d) => d.label),
      labels: { style: { colors: '#64748b', fontSize: '12px', fontFamily: 'inherit' } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      labels: { style: { colors: '#64748b', fontSize: '11px', fontFamily: 'inherit' } },
      min: 0,
    },
    tooltip: {
      theme: 'dark',
      y: { formatter: (v) => `${v} enrolment${v !== 1 ? 's' : ''}` },
    },
  };
  const series = [{ name: 'Enrolments', data: data.map((d) => d.count) }];
  return <ReactApexChart options={options} series={series} type="bar" height={220} />;
}

/* ── ApexCharts area sparkline — per stat card ────────────────────────────── */
function SparkLine({ data, color }) {
  const options = {
    chart: { type: 'area', sparkline: { enabled: true }, background: 'transparent' },
    stroke: { curve: 'smooth', width: 2, colors: [color] },
    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0, stops: [0, 100] }, colors: [color] },
    tooltip: { enabled: false },
  };
  const series = [{ data: data.map((d) => d.count) }];
  return <ReactApexChart options={options} series={series} type="area" height={50} width="100%" />;
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
    { label: 'Total Courses',  value: data.totalCourses,  sub: `${data.publishedCourses} published`,      color: '#1a56db' },
    { label: 'Total Learners', value: data.totalEnrolled, sub: 'unique enrolments',                        color: '#7c3aed' },
    { label: 'Completions',    value: data.completions,   sub: `${completionRate}% completion rate`,       color: '#16a34a' },
    { label: 'Avg. Score',     value: data.avgScore ? `${data.avgScore}%` : '—', sub: 'across all assessments', color: '#d97706' },
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
          <div key={s.label} className={styles.statCard} style={{ '--accent': s.color }}>
            <div className={styles.statTop}>
              <div className={styles.statDot} />
              <div className={styles.statMeta}>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={styles.statSub}>{s.sub}</div>
              </div>
            </div>
            <div className={styles.sparkWrap}>
              <SparkLine data={data.last7} color={s.color} />
            </div>
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
            <EnrolmentBarChart data={data.last7} />
          </div>
        </div>

        {/* ── Top courses ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Top courses by enrolment</h2>
            <Link to="/admin/courses" className={styles.viewAll}>View all <FeatherIcon icon="arrow-right" size={14} /></Link>
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
