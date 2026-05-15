/**
 * app/my-learning/page.jsx — My Learning dashboard
 */

'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';
import styles from './page.module.css';

export default function MyLearningPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    apiClient.get('/my-learning')
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={styles.state}>Loading your learning dashboard…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;

  const { enrolments, skillGap } = data;

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>My Learning</h1>

      {skillGap && (
        <section className={styles.card}>
          <h2>Skill Gap Analysis</h2>
          {skillGap.gaps?.length > 0 && (
            <>
              <p><strong>Gaps:</strong></p>
              <ul>{skillGap.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
            </>
          )}
          {skillGap.priorities?.length > 0 && (
            <>
              <p><strong>Priorities:</strong></p>
              <ul>{skillGap.priorities.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </>
          )}
        </section>
      )}

      <section>
        <h2 className={styles.subheading}>Enrolled Courses</h2>
        {enrolments.length === 0 && <p className={styles.state}>No courses yet. <a href="/courses">Browse courses →</a></p>}
        <div className={styles.grid}>
          {enrolments.map((e) => (
            <a key={e.id} href={`/courses/${e.courses?.id}`} className={styles.courseCard}>
              {e.courses?.thumbnail_url && (
                <img src={e.courses.thumbnail_url} alt={e.courses.title} className={styles.thumb} />
              )}
              <div className={styles.cardBody}>
                <h3>{e.courses?.title}</h3>
                <span className={`${styles.badge} ${styles[e.status]}`}>{e.status}</span>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
