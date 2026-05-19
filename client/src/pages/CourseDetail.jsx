/**
 * client/src/pages/CourseDetail.jsx
 */

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react';
import apiClient from '../lib/apiClient';
import styles from './CourseDetail.module.css';

/* ── Instructor bio card ─────────────────────────────────────────────────── */
function InstructorCard({ course }) {
  const name   = course.instructor ?? course.instructor_name ?? null;
  const rating = course.instructor_rating ?? course.rating ?? 4.5;
  const role   = course.instructor_role ?? 'Course Instructor';
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  if (!name) return null;

  const fullStars  = Math.floor(rating);
  const hasHalf    = rating - fullStars >= 0.5;

  return (
    <div className={styles.instructorCard}>
      <div className={styles.instructorAvatar}>{initials}</div>
      <div className={styles.instructorInfo}>
        <p className={styles.instructorName}>{name}</p>
        <p className={styles.instructorRole}>{role}</p>
        <div className={styles.instructorStars}>
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={i < fullStars ? styles.starFilled : (i === fullStars && hasHalf ? styles.starHalf : styles.starEmpty)}
            >★</span>
          ))}
          <span className={styles.ratingNum}>{rating.toFixed(1)}</span>
        </div>
      </div>
      {course.enrolled_count != null && (
          <div className={styles.enrolledBadge}>
            <FeatherIcon icon="users" size={14} /> {course.enrolled_count.toLocaleString()} enrolled
          </div>
        )}
    </div>
  );
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course,     setCourse]     = useState(null);
  const [enrolment,  setEnrolment]  = useState(null); // existing enrolment if any
  const [loading,    setLoading]    = useState(true);
  const [enrolling,  setEnrolling]  = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    Promise.all([
      apiClient.get(`/courses/${id}`),
      apiClient.get('/enrolments').catch(() => ({ data: { data: [] } })),
    ])
      .then(([cRes, eRes]) => {
        setCourse(cRes.data.data);
        const existing = (eRes.data.data ?? []).find((e) => e.course_id === id);
        setEnrolment(existing ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const enrol = async () => {
    setEnrolling(true);
    try {
      await apiClient.post('/enrolments', { courseId: id });
      navigate(`/courses/${id}/player`);
    } catch (err) {
      alert(err.message);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) return <p className={styles.state}>Loading course…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;

  const modules = (course.modules ?? []).slice().sort((a, b) => a.order - b.order);

  return (
    <div className={styles.page}>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link to="/"><FeatherIcon icon="home" size={14} /></Link>
        <FeatherIcon icon="chevron-right" size={14} />
        <Link to="/courses">Courses</Link>
        <FeatherIcon icon="chevron-right" size={14} />
        <span>{course.title}</span>
      </div>

      {/* Hero card */}
      <div className={styles.heroCard}>
        {course.thumbnail_url
          ? <img src={course.thumbnail_url} alt={course.title} className={styles.heroThumb} />
          : <div className={styles.heroThumbPlaceholder}><FeatherIcon icon="book-open" size={40} /></div>
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
            {enrolment ? (
              <Link to={`/courses/${id}/player`} className={styles.btn}>
                <FeatherIcon icon="play" size={16} />
                {(enrolment.progress_pct ?? 0) > 0 ? 'Continue Learning' : 'Start Learning'}
              </Link>
            ) : (
              <button className={styles.btn} onClick={enrol} disabled={enrolling}>
                {enrolling ? 'Enrolling…' : 'Enrol for free'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Instructor card */}
      <InstructorCard course={course} />

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
