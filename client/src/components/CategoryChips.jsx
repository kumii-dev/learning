/**
 * client/src/components/CategoryChips.jsx
 * Horizontal scrollable category filter chips.
 * Adapted from ui2 TopCategoriesCard.tsx
 */
import styles from './CategoryChips.module.css';
import FeatherIcon from 'feather-icons-react';

const BG_PALETTE = [
  { bg: '#ecfeff', icon: '#0891b2' },
  { bg: '#f0fdf4', icon: '#16a34a' },
  { bg: '#f5f3ff', icon: '#7c3aed' },
  { bg: '#fefce8', icon: '#ca8a04' },
  { bg: '#fff1f2', icon: '#e11d48' },
];

const ICON_MAP = {
  technology: 'monitor',
  business:   'bar-chart-2',
  design:     'pen-tool',
  marketing:  'smartphone',
  data:       'trending-up',
  cloud:      'cloud',
  security:   'lock',
  finance:    'dollar-sign',
  health:     'activity',
  language:   'message-circle',
  science:    'zap',
  default:    'book-open',
};

function getCategoryIcon(cat) {
  const k = (cat ?? '').toLowerCase();
  const key = Object.keys(ICON_MAP).find((key) => k.includes(key)) ?? 'default';
  return ICON_MAP[key];
}

export default function CategoryChips({ categories = [], active = null, onChange }) {
  return (
    <div className={styles.strip}>
      <button
        className={`${styles.chip} ${active === null ? styles.chipActive : ''}`}
        onClick={() => onChange?.(null)}
      >
        <span className={styles.iconWrap} style={{ background: '#f1f5f9', color: '#475569' }}>
          <FeatherIcon icon="grid" size={14} />
        </span>
        All
      </button>
      {categories.map((cat, i) => {
        const palette = BG_PALETTE[i % BG_PALETTE.length];
        const isActive = active === cat;
        return (
          <button
            key={cat}
            className={`${styles.chip} ${isActive ? styles.chipActive : ''}`}
            onClick={() => onChange?.(cat)}
          >
            <span className={styles.iconWrap} style={{ background: palette.bg, color: palette.icon }}>
              <FeatherIcon icon={getCategoryIcon(cat)} size={14} />
            </span>
            {cat}
          </button>
        );
      })}
    </div>
  );
}
