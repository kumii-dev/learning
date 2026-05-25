/**
 * client/src/admin/pages/AdminLearners.jsx
 * Learner table with search, enrollment and completion stats.
 */
import { useEffect, useState } from 'react';
import apiClient from '../../lib/apiClient';
import styles from './AdminLearners.module.css';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ScoreBadge({ score }) {
  if (score === null || score === undefined) return <span className={styles.scoreDash}>—</span>;
  const cls = score >= 70 ? styles.scorePass : styles.scoreFail;
  return <span className={cls}>{score}%</span>;
}

export default function AdminLearners() {
  const [learners, setLearners] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [q,        setQ]        = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortKey,  setSortKey]  = useState('created_at');
  const [sortDir,  setSortDir]  = useState('desc');
  const [page,     setPage]     = useState(1);
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
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);  function SortIcon({ k }) {
    if (sortKey !== k) return <span className={styles.sortIcon}>↕</span>;
    return <span className={styles.sortIconActive}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  if (loading) return <div className={styles.state}>Loading learners…</div>;
  if (error)   return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Learners</h1>
          <p className={styles.pageSub}>{learners.length} registered learners</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.summaryRow}>
        {[
          { label: 'Total Learners',    value: learners.length },
          { label: 'With Enrolments',   value: learners.filter((l) => l.enrolled > 0).length },
          { label: 'Completions (any)', value: learners.filter((l) => l.completed > 0).length },
          { label: 'Avg Completions',   value: learners.length ? (learners.reduce((s, l) => s + l.completed, 0) / learners.length).toFixed(1) : '—' },
        ].map((s) => (
          <div key={s.label} className={styles.summaryCard}>
            <div className={styles.summaryValue}>{s.value}</div>
            <div className={styles.summaryLabel}>{s.label}</div>
          </div>
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
    </div>
  );
}
