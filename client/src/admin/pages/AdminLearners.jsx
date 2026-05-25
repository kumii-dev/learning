/**
 * client/src/admin/pages/AdminLearners.jsx
 * Learner table with search, enrollment and completion stats.
 * Summary cards are clickable — each opens a drill-down drawer.
 */
import { useEffect, useState, useCallback } from 'react';
import apiClient from '../../lib/apiClient';
import FeatherIcon from 'feather-icons-react';
import styles from './AdminLearners.module.css';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ScoreBadge({ score, cls }) {
  if (score === null || score === undefined) return <span className={styles.scoreDash}>—</span>;
  const c = cls ?? (score >= 70 ? styles.scorePass : styles.scoreFail);
  return <span className={c}>{score}%</span>;
}

/* ── Drill-down drawer ────────────────────────────────────────────── */
function DrillDownDrawer({ type, learners, onClose }) {
  const [q, setQ] = useState('');

  const cfg = {
    total:       { title: 'All Learners',              icon: 'users'         },
    enrolled:    { title: 'Learners with Enrolments',  icon: 'book-open'     },
    completions: { title: 'Learners with Completions', icon: 'check-circle'  },
    avgcomp:     { title: 'Completion Breakdown',      icon: 'bar-chart-2'   },
  }[type];

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Filter source rows by drill type
  const source = {
    total:       learners,
    enrolled:    learners.filter((l) => l.enrolled > 0),
    completions: learners.filter((l) => l.completed > 0),
    avgcomp:     learners,
  }[type] ?? learners;

  const filtered = source.filter((l) => {
    if (!q) return true;
    return `${l.full_name ?? ''} ${l.email ?? ''}`.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <>
      <div className={styles.ddBackdrop} onClick={onClose} />
      <div className={styles.ddDrawer}>
        {/* Header */}
        <div className={styles.ddHeader}>
          <div className={styles.ddTitleRow}>
            <FeatherIcon icon={cfg.icon} size={17} className={styles.ddIcon} />
            <h2 className={styles.ddTitle}>{cfg.title}</h2>
          </div>
          <button className={styles.ddClose} onClick={onClose} aria-label="Close">
            <FeatherIcon icon="x" size={17} />
          </button>
        </div>

        {/* Search */}
        <div className={styles.ddSearch}>
          <FeatherIcon icon="search" size={14} className={styles.ddSearchIcon} />
          <input
            className={styles.ddSearchInput}
            type="search"
            placeholder="Search by name or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          <span className={styles.ddCount}>{filtered.length} learner{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className={styles.ddBody}>
          {filtered.length === 0 ? (
            <div className={styles.ddState}>No learners found.</div>
          ) : (
            <div className={styles.ddTableWrap}>
              <table className={styles.ddTable}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th className={styles.ddNum}>Enrolled</th>
                    <th className={styles.ddNum}>Completed</th>
                    <th className={styles.ddNum}>Avg Score</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => {
                    const name = l.full_name || '(no name)';
                    const initials = name !== '(no name)' ? name.split(' ').map((w) => w[0]).slice(0,2).join('').toUpperCase() : '?';
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
                        <td className={styles.ddNum}>
                          {l.avgScore != null
                            ? <span className={l.avgScore >= 70 ? styles.scorePass : styles.scoreFail}>{l.avgScore}%</span>
                            : <span className={styles.scoreDash}>—</span>}
                        </td>
                        <td className={styles.ddMuted}>{fmtDate(l.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function AdminLearners() {
  const [learners,   setLearners]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [q,          setQ]          = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortKey,    setSortKey]    = useState('created_at');
  const [sortDir,    setSortDir]    = useState('desc');
  const [page,       setPage]       = useState(1);
  const [drilldown,  setDrilldown]  = useState(null); // 'total'|'enrolled'|'completions'|'avgcomp'
  const PAGE_SIZE = 20;

  useEffect(() => {
    apiClient.get('/cms/learners')
      .then((r) => setLearners(r.data.data ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const filtered = learners
    .filter((l) => {
      if (roleFilter !== 'all' && (l.role ?? 'user') !== roleFilter) return false;
      if (!q) return true;
      const name = `${l.full_name ?? ''} ${l.email ?? ''}`.toLowerCase();
      return name.includes(q.toLowerCase());
    })
    .sort((a, b) => {
      let av = a[sortKey] ?? 0;
      let bv = b[sortKey] ?? 0;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function SortIcon({ k }) {
    if (sortKey !== k) return <span className={styles.sortIcon}>↕</span>;
    return <span className={styles.sortIconActive}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  if (loading) return <div className={styles.state}>Loading learners…</div>;
  if (error)   return <div className={styles.error}>{error}</div>;

  const avgComp = learners.length
    ? (learners.reduce((s, l) => s + l.completed, 0) / learners.length).toFixed(1)
    : '—';

  const summaryCards = [
    { key: 'total',       label: 'Total Learners',    value: learners.length,                                  icon: 'users' },
    { key: 'enrolled',    label: 'With Enrolments',   value: learners.filter((l) => l.enrolled > 0).length,   icon: 'book-open' },
    { key: 'completions', label: 'Completions (any)', value: learners.filter((l) => l.completed > 0).length,  icon: 'check-circle' },
    { key: 'avgcomp',     label: 'Avg Completions',   value: avgComp,                                          icon: 'bar-chart-2' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Learners</h1>
          <p className={styles.pageSub}>{learners.length} registered learners</p>
        </div>
      </div>

      {/* Summary cards — clickable */}
      <div className={styles.summaryRow}>
        {summaryCards.map((s) => (
          <button
            key={s.key}
            className={styles.summaryCard}
            onClick={() => setDrilldown(s.key)}
            title={`View ${s.label} detail`}
          >
            <div className={styles.summaryValue}>{s.value}</div>
            <div className={styles.summaryLabelRow}>
              <span className={styles.summaryLabel}>{s.label}</span>
              <FeatherIcon icon="chevron-right" size={12} className={styles.summaryChevron} />
            </div>
          </button>
        ))}
      </div>

      {/* Search + Filter toolbar */}
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="search"
          placeholder="Search by name or email…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
        <select
          className={styles.filterSelect}
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
        >
          <option value="all">All roles</option>
          <option value="user">Learner</option>
          <option value="instructor">Instructor</option>
        </select>
        <span className={styles.count}>{filtered.length} learner{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0
        ? <div className={styles.empty}>No learners found.</div>
        : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th onClick={() => toggleSort('full_name')} className={styles.sortable}>
                      Name <SortIcon k="full_name" />
                    </th>
                    <th onClick={() => toggleSort('email')} className={styles.sortable}>
                      Email <SortIcon k="email" />
                    </th>
                    <th onClick={() => toggleSort('enrolled')} className={`${styles.sortable} ${styles.num}`}>
                      Enrolled <SortIcon k="enrolled" />
                    </th>
                    <th onClick={() => toggleSort('completed')} className={`${styles.sortable} ${styles.num}`}>
                      Completed <SortIcon k="completed" />
                    </th>
                    <th onClick={() => toggleSort('avgScore')} className={`${styles.sortable} ${styles.num}`}>
                      Avg Score <SortIcon k="avgScore" />
                    </th>
                    <th onClick={() => toggleSort('created_at')} className={styles.sortable}>
                      Joined <SortIcon k="created_at" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((l) => {
                    const name     = l.full_name || '(no name)';
                    const initials = name !== '(no name)'
                      ? name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
                      : '?';
                    return (
                      <tr key={l.id}>
                        <td>
                          <div className={styles.nameCell}>
                            <div className={styles.avatar}>{initials}</div>
                            <span className={styles.name}>{name}</span>
                          </div>
                        </td>
                        <td className={styles.email}>{l.email ?? '—'}</td>
                        <td className={styles.num}>{l.enrolled}</td>
                        <td className={styles.num}>{l.completed}</td>
                        <td className={styles.num}><ScoreBadge score={l.avgScore} /></td>
                        <td className={styles.muted}>{fmtDate(l.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className={styles.pagination}>
              <span className={styles.pageInfo}>
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className={styles.pageButtons}>
                <button className={styles.pageBtn} disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>‹ Prev</button>
                <span className={styles.pageCount}>{safePage} / {totalPages}</span>
                <button className={styles.pageBtn} disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>Next ›</button>
              </div>
            </div>
          </>
        )
      }

      {/* Drill-down drawer */}
      {drilldown && (
        <DrillDownDrawer
          type={drilldown}
          learners={learners}
          onClose={() => setDrilldown(null)}
        />
      )}
    </div>
  );
}
