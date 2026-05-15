/**
 * client/src/pages/Certificates.jsx
 */

import { useEffect, useState } from 'react';
import apiClient from '../lib/apiClient';
import { notify } from '../lib/authBridge';
import styles from './Certificates.module.css';

export default function Certificates() {
  const [certs,   setCerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    apiClient.get('/certificates')
      .then((res) => setCerts(res.data.data ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={styles.state}>Loading certificates…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>My Certificates</h1>

      {certs.length === 0 && (
        <p className={styles.empty}>
          Complete a course to earn your first certificate! 🏅
        </p>
      )}

      <ul className={styles.list}>
        {certs.map((cert) => (
          <li key={cert.id} className={styles.card}>
            <div className={styles.badge}>🏆</div>
            <div className={styles.info}>
              <h2 className={styles.courseName}>{cert.course?.title ?? 'Course'}</h2>
              <p className={styles.issued}>
                Issued: {new Date(cert.issued_at).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
              {cert.template?.credential_type && (
                <span className={styles.type}>{cert.template.credential_type}</span>
              )}
            </div>
            <button
              className={styles.share}
              onClick={() => notify.certificateIssued(cert.id)}
              title="Share with Kumii"
            >
              Share ↗
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
