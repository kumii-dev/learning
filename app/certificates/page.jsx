/**
 * app/certificates/page.jsx — My certificates
 */

'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';
import { notify } from '@/lib/authBridge';
import styles from './page.module.css';

export default function CertificatesPage() {
  const [certs,   setCerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    apiClient.get('/certificates')
      .then((res) => setCerts(res.data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className={styles.state}>Loading certificates…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>My Certificates</h1>

      {certs.length === 0 && (
        <p className={styles.state}>No certificates yet. Complete a course to earn one!</p>
      )}

      <div className={styles.grid}>
        {certs.map((cert) => (
          <div key={cert.id} className={styles.card}>
            <div className={styles.icon}>🎓</div>
            <h3>{cert.courses?.title ?? 'Course'}</h3>
            <p className={styles.meta}>
              Issued: {new Date(cert.issued_at).toLocaleDateString('en-AU', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
            <div className={styles.actions}>
              <a href={`/certificates/${cert.id}`} className={styles.link} target="_blank" rel="noopener noreferrer">
                View Certificate
              </a>
              <button
                className={styles.btnSecondary}
                onClick={() => notify.certificateIssued(cert.id)}
              >
                Share with Kumii
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
