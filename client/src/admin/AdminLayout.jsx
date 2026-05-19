/**
 * client/src/admin/AdminLayout.jsx
 * Top header + bottom tab nav layout for the admin CMS portal.
 * Mirrors the learner Layout pattern.
 */
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react';
import { getProfile } from '../lib/authBridge';
import styles from './AdminLayout.module.css';

const NAV = [
  { to: '/admin',             end: true, label: 'Dashboard',   icon: 'grid' },
  { to: '/admin/courses',                label: 'Courses',      icon: 'book-open' },
  { to: '/admin/analytics',              label: 'Analytics',    icon: 'bar-chart-2' },
  { to: '/admin/learners',               label: 'Learners',     icon: 'users' },
  { to: '/admin/assessments',            label: 'Assessments',  icon: 'clipboard' },
];

export default function AdminLayout() {
  const navigate  = useNavigate();
  const profile   = getProfile();
  const firstName = profile?.first_name ?? 'Admin';

  return (
    <div className={styles.shell}>
      {/* ── Top header ── */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>K</div>
          <div>
            <div className={styles.brandName}>Kumii</div>
            <div className={styles.brandBadge}>Admin CMS</div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.adminChip}>
            <div className={styles.adminAvatar}>{firstName[0]?.toUpperCase()}</div>
            <span className={styles.adminName}>{firstName}</span>
          </div>
          <button
            className={styles.backBtn}
            onClick={() => navigate('/')}
            title="Back to learner view"
          >
            <FeatherIcon icon="arrow-left" size={15} />
            Learner view
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className={styles.main}>
        <Outlet />
      </main>

      {/* ── Bottom tab nav ── */}
      <nav className={styles.nav}>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles.navActive : ''}`
            }
          >
            <FeatherIcon icon={item.icon} size={20} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
