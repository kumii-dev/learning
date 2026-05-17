/**
 * client/src/components/ProgressRing.jsx
 * Circular SVG progress ring — extracted from MyLearning.jsx.
 * Adapted from ui2 StudentProgressCard.tsx
 */
import styles from './ProgressRing.module.css';

export default function ProgressRing({ pct = 0, size = 90, color = 'var(--color-primary)' }) {
  const r    = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <svg width={size} height={size} className={styles.ring}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize="13" fontWeight="800" fill="var(--color-text)">
        {pct}%
      </text>
      <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle"
        fontSize="9" fill="var(--color-muted)">
        done
      </text>
    </svg>
  );
}
