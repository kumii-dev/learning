/**
 * client/src/components/CategoryChips.jsx
 * Horizontal scrollable category filter chips.
 * Adapted from ui2 TopCategoriesCard.tsx
 */
import styles from './CategoryChips.module.css';

const BG_PALETTE = [
  { bg: '#ecfeff', icon: '#0891b2' }, // cyan
  { bg: '#f0fdf4', icon: '#16a34a' }, // green
  { bg: '#f5f3ff', icon: '#7c3aed' }, // violet
  { bg: '#fefce8', icon: '#ca8a04' }, // yellow
  { bg: '#fff1f2', icon: '#e11d48' }, // red
];

const EMOJI_MAP = {
  technology: '💻', business: '📊', design: '🎨', marketing: '📱',
  data: '📈', cloud: '☁️', security: '🔒', finance: '💰',
  health: '🏥', language: '🗣️', science: '🔬', default: '📚',
};

function getEmoji(cat) {
  const k = (cat ?? '').toLowerCase();
  return EMOJI_MAP[Object.keys(EMOJI_MAP).find((key) => k.includes(key))] ?? EMOJI_MAP.default;
}

export default function CategoryChips({ categories = [], active = null, onChange }) {
  return (
    <div className={styles.strip}>
      <button
        className={`${styles.chip} ${active === null ? styles.chipActive : ''}`}
        onClick={() => onChange?.(null)}
      >
        <span className={styles.iconWrap} style={{ background: '#f1f5f9', color: '#475569' }}>
          ✦
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
              {getEmoji(cat)}
            </span>
            {cat}
          </button>
        );
      })}
    </div>
  );
}
