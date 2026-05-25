/**
 * client/src/admin/pages/AdminDashboard.jsx
 * Overview: stat cards + 7-day enrollment chart + top courses table.
 * Stat cards are clickable — each opens a drill-down drawer with detail data.
 */
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import apiClient from '../../lib/apiClient';
import styles from './AdminDashboard.module.css';
import FeatherIcon from 'feather-icons-react';
import ErrorMessage from '../../components/ErrorMessage';

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

/* ── Score badge ────────────────────────────────────────────────────────────── */
function ScoreBadge({ score }) {
  if (score == null) return <span className={styles.ddMuted}>—</span>;
  return (
    <span className={score >= 70 ? styles.scorePass : styles.scoreFail}>
      {score}%
    </span>
  );
}

/* ── Drill-down drawer ───────────────────────────────────────────────────────
   Fetches its own data based on `type`:
     'courses'     → GET /cms/courses
     'learners'    → GET /cms/learners
     'completions' → GET /cms/learners  (filtered to completed > 0)
     'scores'      → GET /cms/assessment-results
*/
function DrillDownDrawer({ type, onClose }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [q,       setQ]       = useState('');

  const cfg = {
    courses:     { title: 'All Courses',               icon: 'book-open',  endpoint: '/cms/courses' },
    learners:    { title: 'All Learners',               icon: 'users',      endpoint: '/cms/learners' },
    completions: { title: 'Learners with Completions',  icon: 'check-circle', endpoint: '/cms/learners' },
    scores:      { title: 'Assessment Scores',          icon: 'bar-chart-2',  endpoint: '/cms/assessment-results' },
  }[type];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiClient.get(cfg.endpoint);
      let data = r.data?.data ?? r.data ?? [];
      if (type === 'completions') data = data.filter((l) => l.completed > 0);
      setRows(data);
    } catch (e) {
      setError(e?.response?.data?.error ?? e.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [type, cfg.endpoint]);

  useEffect(() => {
    load();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [load, onClose]);

  /* ── filter rows by search ── */
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const filtered = rows.filter((row) => {
    if (!q) return true;
    const hay = JSON.stringify(row).toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  /* ── column renderers ── */
  function renderTable() {
    if (type === 'courses') {
      return (
        <table className={styles.ddTable}>
          <thead><tr>
            <th>Title</th>
            <th>Category</th>
            <th className={styles.ddNum}>Enrolled</th>
            <th>Status</th>
          </tr></thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link to={`/admin/courses/${c.id}/edit`} className={styles.ddLink} onClick={onClose}>
                    {c.title}
                  </Link>
                </td>
                <td className={styles.ddMuted}>{c.category ?? '—'}</td>
                <td className={styles.ddNum}>{c.enrolled ?? 0}</td>
                <td>
                  <span className={c.published ? styles.badgeGreen : styles.badgeGray}>
                    {c.published ? 'Published' : 'Draft'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    if (type === 'learners' || type === 'completions') {
      return (
        <table className={styles.ddTable}>
          <thead><tr>
            <th>Name</th>
            <th>Email</th>
            <th className={styles.ddNum}>Enrolled</th>
            <th className={styles.ddNum}>Completed</th>
            <th className={styles.ddNum}>Avg Score</th>
            <th>Joined</th>
          </tr></thead>
          <tbody>
            {filtered.map((l) => {
              const name = l.full_name || `${l.first_name ?? ''} ${l.last_name ?? ''}`.trim() || '—';
              const initials = name !== '—' ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() : '?';
              return (
                <tr key={l.id}>
                  <td>
                    <div className={styles.ddUserCell}>
                      <div className={styles.ddAvatar}>{initials}</div>
                      <span>{name}</span>
                    </div>
                  </td>
                  <td className={styles.ddMuted}>{l.email ?? '—'}</td>
                  <td className={styles.ddNum}>{l.enrolled}</td>
                  <td className={styles.ddNum}>{l.completed}</td>
                  <td className={styles.ddNum}><ScoreBadge score={l.avgScore} /></td>
                  <td className={styles.ddMuted}>{fmtDate(l.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      );
    }
    if (type === 'scores') {
      return (
        <table className={styles.ddTable}>
          <thead><tr>
            <th>Learner</th>
            <th>Assessment</th>
            <th>Course</th>
            <th className={styles.ddNum}>Score</th>
            <th>Status</th>
            <th>Submitted</th>
          </tr></thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className={styles.ddMuted}>{s.full_name ?? s.email ?? '—'}</td>
                <td>{s.assessment_title ?? s.assessments?.title ?? '—'}</td>
                <td className={styles.ddMuted}>{s.course_title ?? s.assessments?.courses?.title ?? '—'}</td>
                <td className={styles.ddNum}><ScoreBadge score={s.score} /></td>
                <td>
                  <span className={s.status === 'graded' ? styles.badgeGreen : styles.badgeGray}>
                    {s.status ?? '—'}
                  </span>
                </td>
                <td className={styles.ddMuted}>{fmtDate(s.submitted_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className={styles.ddBackdrop} onClick={onClose} />

      {/* Drawer */}
      <div className={styles.ddDrawer}>
        {/* Header */}
        <div className={styles.ddHeader}>
          <div className={styles.ddTitleRow}>
            <FeatherIcon icon={cfg.icon} size={18} className={styles.ddIcon} />
            <h2 className={styles.ddTitle}>{cfg.title}</h2>
          </div>
          <button className={styles.ddClose} onClick={onClose} aria-label="Close">
            <FeatherIcon icon="x" size={18} />
          </button>
        </div>

        {/* Search */}
        <div className={styles.ddSearch}>
          <FeatherIcon icon="search" size={14} className={styles.ddSearchIcon} />
          <input
            className={styles.ddSearchInput}
            type="search"
            placeholder="Search…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          {!loading && (
            <span className={styles.ddCount}>{filtered.length} row{filtered.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Body */}
        <div className={styles.ddBody}>
          {loading ? (
            <div className={styles.ddState}>
              <FeatherIcon icon="loader" size={20} className={styles.spinning} />
              Loading…
            </div>
          ) : error ? (
            <div className={styles.ddError}>{error}</div>
          ) : filtered.length === 0 ? (
            <div className={styles.ddState}>No records found.</div>
          ) : (
            <div className={styles.ddTableWrap}>
              {renderTable()}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function AdminDashboard() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [drilldown, setDrilldown] = useState(null); // 'courses'|'learners'|'completions'|'scores'|null

  const load = () => {
    setError(null);
    setLoading(true);
    apiClient.get('/cms/analytics/overview')
      .then((r) => setData(r.data.data))
      .catch((e) => setError(e))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className={styles.state}>Loading dashboard…</div>;
  if (error)   return <ErrorMessage error={error} onRetry={load} />;

  const completionRate = data.totalEnrolled
    ? Math.round((data.completions / data.totalEnrolled) * 100)
    : 0;

  const stats = [
    { label: 'Total Courses',  value: data.totalCourses,  sub: `${data.publishedCourses} published`,      color: '#1a56db', drillKey: 'courses' },
    { label: 'Total Learners', value: data.totalEnrolled, sub: 'unique enrolments',                        color: '#7c3aed', drillKey: 'learners' },
    { label: 'Completions',    value: data.completions,   sub: `${completionRate}% completion rate`,       color: '#16a34a', drillKey: 'completions' },
    { label: 'Avg. Score',     value: data.avgScore ? `${data.avgScore}%` : '—', sub: 'across all assessments', color: '#d97706', drillKey: 'scores' },
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
          <button
            key={s.label}
            className={styles.statCard}
            style={{ '--accent': s.color }}
            onClick={() => setDrilldown(s.drillKey)}
            title={`View ${s.label} detail`}
          >
            <div className={styles.statTop}>
              <div className={styles.statDot} />
              <div className={styles.statMeta}>
                <div className={styles.statValue}>{s.value}</div>
                <div className={styles.statLabel}>{s.label}</div>
                <div className={styles.statSub}>{s.sub}</div>
              </div>
              <FeatherIcon icon="chevron-right" size={14} className={styles.statChevron} />
            </div>
            <div className={styles.sparkWrap}>
              <SparkLine data={data.last7} color={s.color} />
            </div>
          </button>
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

      {/* ── Drill-down drawer ── */}
      {drilldown && (
        <DrillDownDrawer
          type={drilldown}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}
