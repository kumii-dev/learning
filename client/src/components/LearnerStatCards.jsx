/**
 * client/src/components/LearnerStatCards.jsx
 * Gradient stat strip — adapted from ui2 StatsCard.tsx
 */
import FeatherIcon from 'feather-icons-react';
import styles from './LearnerStatCards.module.css';

export default function LearnerStatCards({ stats }) {
  /* stats = [{ label, value, diff, icon, from, to }] */
  return (
    <div className={styles.strip}>
      {stats.map((s) => (
        <div
          key={s.label}
          className={styles.card}
          style={{ background: `linear-gradient(135deg, ${s.from} 0%, ${s.to} 100%)` }}
        >
          <div className={styles.top}>
            <div className={styles.iconWrap}>
              <FeatherIcon icon={s.icon} size={18} color="#fff" />
            </div>
            {s.diff != null && (
              <span className={styles.diff}>
                {s.diff >= 0 ? '+' : ''}{s.diff}
              </span>
            )}
          </div>
          <div className={styles.value}>{s.value}</div>
          <div className={styles.label}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
