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

  return (
    <main className={styles.page}>
      <Link to="/courses" className={styles.back}>← Back to courses</Link>
      <h1 className={styles.heading}>{course.title}</h1>
      <p className={styles.desc}>{course.description}</p>

      <button className={styles.btn} onClick={enrol}>Enrol in this course</button>

      <section className={styles.modules}>
        <h2>Modules</h2>
        {(course.modules ?? []).length === 0 && <p className={styles.state}>No modules yet.</p>}
        <ol className={styles.moduleList}>
          {(course.modules ?? [])
            .sort((a, b) => a.order - b.order)
            .map((m) => (
              <li key={m.id} className={styles.moduleItem}>
                <h3>{m.title}</h3>
                {/* content is CMS HTML — rendered safely as text here */}
                <p className={styles.content}>{m.content}</p>
              </li>
            ))}
        </ol>
      </section>

      {course.assessments?.length > 0 && (
        <section className={styles.assessments}>
          <h2>Assessments</h2>
          <ul>
            {course.assessments.map((a) => (
              <li key={a.id}>
                <Link to={`/assessments/${a.id}`}>{a.title}</Link>
                <span className={styles.type}> ({a.type})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
