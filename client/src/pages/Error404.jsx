/**
 * client/src/pages/Error404.jsx
 * 404 Not Found page.
 */
import { Link } from 'react-router-dom';
import styles from './Error404.module.css';

export default function Error404() {
  return (
    <div className={styles.wrap}>
      <div className={styles.code}>404</div>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.sub}>The page you're looking for doesn't exist or has been moved.</p>
      <Link to="/" className={styles.btn}>← Back to Discover</Link>
    </div>
  );
}
