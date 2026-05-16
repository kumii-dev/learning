/**
 * client/src/pages/CourseDetail.jsx
 */

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import styles from './CourseDetail.module.css';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course,  setCourse]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    apiClient.get(`/courses/${id}`)
      .then((res) => setCourse(res.data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const enrol = async () => {
    try {
      await apiClient.post('/enrolments', { courseId: id });
      navigate('/my-learning');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p className={styles.state}>Loading course…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;

  const modules = (course.modules ?? []).slice().sort((a, b) => a.order - b.order);

  return (
    <div className={styles.page}>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/">🏠</Link>
        <span>›</span>
        <Link to="/courses">Courses</Link>
        <span>›</span>
        <span>{course.title}</span>
      </div>

      {/* Hero card */}
      <div className={styles.heroCard}>
        {course.thumbnail_url
          ? <img src={course.thumbnail_url} alt={course.title} className={styles.heroThumb} />
          : <div className={styles.heroThumbPlaceholder}>📖</div>
        }
        <div className={styles.heroBody}>
          <h1 className={styles.heading}>{course.title}</h1>
          <p className={styles.desc}>{course.description}</p>
          {course.tags?.length > 0 && (
            <div className={styles.tags}>
              {course.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
            </div>
          )}
          <div className={styles.actions}>
            <button className={styles.btn} onClick={enrol}>Enrol for free</button>
          </div>
        </div>
      </div>

      {/* Modules */}
      {modules.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>Course modules</h2>
          <ol className={styles.moduleList}>
            {modules.map((m, i) => (
              <li key={m.id} className={styles.moduleItem}>
                <div className={styles.moduleNum}>{i + 1}</div>
                <div>
                  <h3>{m.title}</h3>
                  {m.content && <p className={styles.content}>{m.content}</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Assessments */}
      {course.assessments?.length > 0 && (
        <section className={styles.assessments}>
          <h2 className={styles.sectionTitle}>Assessments</h2>
          <ul>
            {course.assessments.map((a) => (
              <li key={a.id}>
                <Link to={`/assessments/${a.id}`}>{a.title}</Link>
                <span className={styles.type}>{a.type}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
