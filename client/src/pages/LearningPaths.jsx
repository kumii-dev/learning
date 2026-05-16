/**
 * client/src/pages/LearningPaths.jsx
 */
import { Link } from 'react-router-dom';

export default function LearningPaths() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '.75rem' }}>🗺️</div>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '.5rem' }}>Learning Paths</h1>
      <p style={{ color: 'var(--color-muted)', marginBottom: '1.25rem' }}>
        Structured career tracks are coming soon. Browse individual courses in the meantime.
      </p>
      <Link
        to="/courses"
        style={{
          display: 'inline-block', padding: '.55rem 1.25rem',
          background: 'var(--color-primary)', color: '#fff',
          borderRadius: 'var(--radius)', fontWeight: 600, fontSize: '.9rem',
        }}
      >
        Browse Courses
      </Link>
    </div>
  );
}
