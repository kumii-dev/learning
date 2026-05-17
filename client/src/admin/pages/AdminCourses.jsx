/**
 * client/src/admin/pages/AdminCourses.jsx
 * Course list table with status filter, search, publish/delete actions.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../../lib/apiClient';
import styles from './AdminCourses.module.css';

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminCourses() {
  const navigate          = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState('all');
  const [q,       setQ]       = useState('');
  const [busy,    setBusy]    = useState({});
  const [checked, setChecked] = useState(new Set());
  const [page,    setPage]    = useState(1);
  const PAGE_SIZE = 15;

  function load() {
    setLoading(true);
    apiClient.get('/cms/courses')
      .then((r) => setCourses(r.data.data ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function togglePublish(course) {
    setBusy((b) => ({ ...b, [course.id]: true }));
    try {
      const url = course.published
        ? `/cms/courses/${course.id}/unpublish`
        : `/cms/courses/${course.id}/publish`;
      const { data } = await apiClient.post(url);
      setCourses((cs) => cs.map((c) => (c.id === course.id ? { ...c, ...data.data } : c)));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy((b) => ({ ...b, [course.id]: false }));
    }
  }

  async function deleteCourse(course) {
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
    setBusy((b) => ({ ...b, [course.id]: true }));
    try {
      await apiClient.delete(`/cms/courses/${course.id}`);
      setCourses((cs) => cs.filter((c) => c.id !== course.id));
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy((b) => ({ ...b, [course.id]: false }));
    }
  }

  const filtered = courses
    .filter((c) => filter === 'all' || (filter === 'published' ? c.published : !c.published))
    .filter((c) => !q || c.title?.toLowerCase().includes(q.toLowerCase()));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const visible    = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allVisibleChecked = visible.length > 0 && visible.every((c) => checked.has(c.id));

  function toggleAll() {
    setChecked((prev) => {
      const next = new Set(prev);
      if (allVisibleChecked) visible.forEach((c) => next.delete(c.id));
      else visible.forEach((c) => next.add(c.id));
      return next;
    });
  }
  function toggleOne(id) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function bulkPublish(publish) {
    const ids = [...checked];
    setBusy(Object.fromEntries(ids.map((id) => [id, true])));
    try {
      await Promise.all(ids.map((id) => {
        const c = courses.find((x) => x.id === id);
        if (!c) return null;
        if (publish === c.published) return null;
        return apiClient.post(`/cms/courses/${id}/${publish ? 'publish' : 'unpublish'}`);
      }));
      await new Promise((res) => { load(); res(); });
    } catch (e) { alert(e.message); }
    finally {
      setBusy({});
      setChecked(new Set());
    }
  }

  async function bulkDelete() {
    const ids = [...checked];
    if (!window.confirm(`Delete ${ids.length} course(s)? This cannot be undone.`)) return;
    setBusy(Object.fromEntries(ids.map((id) => [id, true])));
    try {
      await Promise.all(ids.map((id) => apiClient.delete(`/cms/courses/${id}`)));
      setCourses((cs) => cs.filter((c) => !ids.includes(c.id)));
      setChecked(new Set());
    } catch (e) { alert(e.message); }
    finally { setBusy({}); }
  }

  if (loading) return <div className={styles.state}>Loading courses…</div>;
  if (error)   return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Courses</h1>
          <p className={styles.pageSub}>{courses.length} total courses</p>
        </div>
        <button className={styles.newBtn} onClick={() => navigate('/admin/courses/new')}>
          + New Course
        </button>
      </div>

      {/* Filters + search */}
      <div className={styles.toolbar}>
        <div className={styles.filterTabs}>
          {['all', 'published', 'draft'].map((f) => (
            <button key={f}
              className={`${styles.filterTab} ${filter === f ? styles.filterActive : ''}`}
              onClick={() => { setFilter(f); setPage(1); }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={styles.filterCount}>
                {f === 'all'       ? courses.length
                  : f === 'published' ? courses.filter((c) => c.published).length
                  : courses.filter((c) => !c.published).length}
              </span>
            </button>
          ))}
        </div>
        <input
          className={styles.search}
          type="search"
          placeholder="Search courses…"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
        />
      </div>

      {/* Bulk-action bar */}
      {checked.size > 0 && (
        <div className={styles.bulkBar}>
          <span>{checked.size} selected</span>
          <button className={styles.bulkBtn} onClick={() => bulkPublish(true)}>Publish all</button>
          <button className={styles.bulkBtn} onClick={() => bulkPublish(false)}>Unpublish all</button>
          <button className={`${styles.bulkBtn} ${styles.bulkDelete}`} onClick={bulkDelete}>Delete all</button>
          <button className={styles.bulkClear} onClick={() => setChecked(new Set())}>✕ Clear</button>
        </div>
      )}

      {visible.length === 0
        ? <div className={styles.empty}>No courses found.</div>
        : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.checkCol}>
                      <input type="checkbox" checked={allVisibleChecked} onChange={toggleAll} />
                    </th>
                    <th>Title</th>
                    <th>Status</th>
                    <th className={styles.num}>Enrolled</th>
                    <th className={styles.num}>Completed</th>
                    <th className={styles.num}>Rate</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => {
                    const rate = c.enrolled
                      ? `${Math.round((c.completed / c.enrolled) * 100)}%`
                      : '—';
                    return (
                      <tr key={c.id} className={`${busy[c.id] ? styles.rowBusy : ''} ${checked.has(c.id) ? styles.rowChecked : ''}`}>
                        <td className={styles.checkCol}>
                          <input type="checkbox" checked={checked.has(c.id)} onChange={() => toggleOne(c.id)} />
                        </td>
                        <td>
                          <Link to={`/admin/courses/${c.id}/edit`} className={styles.titleLink}>
                            {c.title}
                          </Link>
                          {c.tags?.length > 0 && (
                            <div className={styles.tagRow}>
                              {c.tags.slice(0, 3).map((t) => (
                                <span key={t} className={styles.tag}>{t}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={c.published ? styles.badgePublished : styles.badgeDraft}>
                            {c.published ? 'Published' : 'Draft'}
                          </span>
                        </td>
                        <td className={styles.num}>{c.enrolled}</td>
                        <td className={styles.num}>{c.completed}</td>
                        <td className={styles.num}>{rate}</td>
                        <td className={styles.muted}>{fmtDate(c.created_at)}</td>
                        <td>
                          <div className={styles.actions}>
                            <Link to={`/admin/courses/${c.id}/edit`} className={styles.actBtn}>
                              Edit
                            </Link>
                            <button
                              className={`${styles.actBtn} ${c.published ? styles.actUnpublish : styles.actPublish}`}
                              onClick={() => togglePublish(c)}
                              disabled={busy[c.id]}
                            >
                              {c.published ? 'Unpublish' : 'Publish'}
                            </button>
                            <Link to={`/admin/analytics?course=${c.id}`} className={styles.actBtn}>
                              Stats
                            </Link>
                            <button
                              className={`${styles.actBtn} ${styles.actDelete}`}
                              onClick={() => deleteCourse(c)}
                              disabled={busy[c.id]}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
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
