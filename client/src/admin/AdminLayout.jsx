/**
 * client/src/admin/AdminLayout.jsx
 * Fixed left sidebar layout for the admin CMS portal.
 */
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react';
import { getProfile } from '../lib/authBridge';
import styles from './AdminLayout.module.css';

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: 'grid' },
  { to: '/admin/courses',   label: 'Courses',    icon: 'book-open' },
  { to: '/admin/analytics', label: 'Analytics',  icon: 'bar-chart-2' },
  { to: '/admin/learners',  label: 'Learners',   icon: 'users' },
];

export default function AdminLayout() {
  const navigate  = useNavigate();
  const profile   = getProfile();
  const firstName = profile?.first_name ?? 'Admin';

  return (
    <div className={styles.shell}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>K</div>
          <div>
            <div className={styles.brandName}>Kumii</div>
            <div className={styles.brandBadge}>Admin CMS</div>
          </div>
        </div>

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
              <span className={styles.navIcon}><FeatherIcon icon={item.icon} size={18} /></span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.footerAvatar}>{firstName[0]?.toUpperCase()}</div>
          <div className={styles.footerInfo}>
            <div className={styles.footerName}>{firstName}</div>
            <div className={styles.footerRole}>Administrator</div>
          </div>
          <button
            className={styles.footerBack}
            onClick={() => navigate('/')}
            title="Back to learner view"
          >
            ←
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
