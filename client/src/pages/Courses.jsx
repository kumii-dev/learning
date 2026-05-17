/**
 * client/src/pages/Courses.jsx
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import styles from './Courses.module.css';

export default function Courses() {
  const [courses,         setCourses]         = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const navigate = useNavigate();

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

  const enrol = async (e, courseId) => {
    e.preventDefault();
    try {
      await apiClient.post('/enrolments', { courseId });
      navigate('/my-learning');
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
          <div className={styles.grid}>
            {recommendations.map((course) => (
              <div key={course.id} className={styles.card}>
                {course.thumbnail_url
                  ? <img src={course.thumbnail_url} alt={course.title} className={styles.thumb} />
                  : <div className={styles.thumbPlaceholder}>⭐</div>
                }
                <div className={styles.body}>
                  <h3><Link to={`/courses/${course.id}`}>{course.title}</Link></h3>
                  <p className={styles.desc}>{course.description}</p>
                  {course.tags?.length > 0 && (
                    <div className={styles.tags}>
                      {course.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
                    </div>
                  )}
                  <button className={styles.btn} onClick={(e) => enrol(e, course.id)}>
                    Enrol
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className={styles.grid}>
        {courses.map((course) => (
          <div key={course.id} className={styles.card}>
            {course.thumbnail_url
              ? <img src={course.thumbnail_url} alt={course.title} className={styles.thumb} />
              : <div className={styles.thumbPlaceholder}>📖</div>
            }
            <div className={styles.body}>
              <h3><Link to={`/courses/${course.id}`}>{course.title}</Link></h3>
              <p className={styles.desc}>{course.description}</p>
              {course.tags?.length > 0 && (
                <div className={styles.tags}>
                  {course.tags.map((t) => <span key={t} className={styles.tag}>{t}</span>)}
                </div>
              )}
              <button className={styles.btn} onClick={(e) => enrol(e, course.id)}>
                Enrol
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
