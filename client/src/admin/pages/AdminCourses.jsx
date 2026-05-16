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
  const [filter,  setFilter]  = useState('all');   // all | published | draft
  const [q,       setQ]       = useState('');
  const [busy,    setBusy]    = useState({});        // { [id]: true } while action running

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

  const visible = courses
    .filter((c) => filter === 'all' || (filter === 'published' ? c.published : !c.published))
    .filter((c) => !q || c.title?.toLowerCase().includes(q.toLowerCase()));

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
              onClick={() => setFilter(f)}
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
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {visible.length === 0
        ? <div className={styles.empty}>No courses found.</div>
        : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
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
                    <tr key={c.id} className={busy[c.id] ? styles.rowBusy : ''}>
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
        )
      }
    </div>
  );
}
