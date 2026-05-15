/**
 * app/courses/page.jsx — Course catalogue
 */

'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';
import styles from './page.module.css';

export default function CoursesPage() {
  const [courses,         setCourses]         = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);

  useEffect(() => {
    Promise.all([
      apiClient.get('/courses'),
      apiClient.get('/courses/recommendations'),
    ])
      .then(([cRes, rRes]) => {
        setCourses(cRes.data.data);
        setRecommendations(rRes.data.data ?? []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const enrol = async (courseId) => {
    try {
      await apiClient.post('/enrolments', { courseId });
      alert('Enrolled successfully!');
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p className={styles.state}>Loading courses…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>Course Catalogue</h1>

      {recommendations.length > 0 && (
        <section className={styles.recs}>
          <h2>Recommended for You</h2>
          <ul>{recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
        </section>
      )}

      <div className={styles.grid}>
        {courses.map((course) => (
          <div key={course.id} className={styles.card}>
            {course.thumbnail_url && (
              <img src={course.thumbnail_url} alt={course.title} className={styles.thumb} />
            )}
            <div className={styles.body}>
              <h3><a href={`/courses/${course.id}`}>{course.title}</a></h3>
              <p className={styles.desc}>{course.description}</p>
              {course.tags?.length > 0 && (
                <div className={styles.tags}>
                  {course.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
                </div>
              )}
              <button className={styles.btn} onClick={() => enrol(course.id)}>
                Enrol
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
