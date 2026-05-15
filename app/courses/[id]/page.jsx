/**
 * app/courses/[id]/page.jsx — Course detail with modules list
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import styles from './page.module.css';

export default function CourseDetailPage() {
  const { id } = useParams();
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
      alert('Enrolled successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p className={styles.state}>Loading course…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;

  return (
    <main className={styles.page}>
      <a href="/courses" className={styles.back}>← Back to courses</a>
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
                <div className={styles.content} dangerouslySetInnerHTML={{ __html: m.content }} />
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
                <a href={`/assessments/${a.id}`}>{a.title}</a>
                <span className={styles.type}> ({a.type})</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
