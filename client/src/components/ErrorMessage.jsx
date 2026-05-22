/**
 * client/src/components/ErrorMessage.jsx
 * Shared error display used across every page.
 *
 * Props:
 *   error    — Error object (with optional .meta) OR plain string
 *   onRetry  — optional callback; shows a "Try again" button when provided
 *   compact  — when true renders a smaller inline variant (no card chrome)
 */

import { useState } from 'react';
import styles from './ErrorMessage.module.css';

/* ── icons (inline SVG — no external dependency) ────────────────── */
function IconWifi() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

/* ── helper: pick icon + accent colour from error meta ──────────── */
function iconFor(meta) {
  if (!meta) return { Icon: IconAlert, colour: '#ef4444' };
  if (meta.isSlow)      return { Icon: IconClock, colour: '#f59e0b' };
  if (meta.isNetwork)   return { Icon: IconWifi,  colour: '#f59e0b' };
  if (meta.status === 401 || meta.status === 403)
    return { Icon: IconLock, colour: '#8b5cf6' };
  if (meta.status >= 500) return { Icon: IconAlert, colour: '#ef4444' };
  return { Icon: IconAlert, colour: '#ef4444' };
}

/* ── main component ──────────────────────────────────────────────── */
export default function ErrorMessage({ error, onRetry, compact = false }) {
  const [showDetail, setShowDetail] = useState(false);

  if (!error) return null;

  const isString = typeof error === 'string';
  const message  = isString ? error : (error.message ?? 'An unexpected error occurred.');
  const meta     = isString ? null  : error.meta ?? null;
  const detail   = meta?.detail ?? '';
  const status   = meta?.status  ?? null;

  const { Icon, colour } = iconFor(meta);

  if (compact) {
    return (
      <p className={styles.compact} role="alert">
        <span className={styles.compactIcon} style={{ color: colour }}>
          <Icon />
        </span>
        <span>{message}</span>
        {onRetry && (
          <button className={styles.retryInline} onClick={onRetry}>Try again</button>
        )}
      </p>
    );
  }

  return (
    <div className={styles.card} role="alert" aria-live="assertive">
      <span className={styles.iconWrap} style={{ color: colour }}>
        <Icon />
      </span>

      <div className={styles.body}>
        <p className={styles.message}>{message}</p>

        {status && (
          <p className={styles.code}>Error code: {status}</p>
        )}

        {detail && (
          <button
            className={styles.detailToggle}
            onClick={() => setShowDetail((v) => !v)}
            aria-expanded={showDetail}
          >
            {showDetail ? '▲ Hide details' : '▼ Show details'}
          </button>
        )}

        {showDetail && detail && (
          <pre className={styles.detail}>{detail}</pre>
        )}
      </div>

      {onRetry && (
        <button className={styles.retryBtn} onClick={onRetry}>
          ↺ Try again
        </button>
      )}
    </div>
  );
}
