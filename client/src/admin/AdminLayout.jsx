/**
 * client/src/admin/AdminLayout.jsx
 * Fixed left sidebar layout for the admin CMS portal.
 */
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { getProfile } from '../lib/authBridge';
import styles from './AdminLayout.module.css';

const NAV = [
  {
    to: '/admin', end: true, label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    to: '/admin/courses', label: 'Courses',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
  {
    to: '/admin/analytics', label: 'Analytics',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
      </svg>
    ),
  },
  {
    to: '/admin/learners', label: 'Learners',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
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
              <span className={styles.navIcon}>{item.icon}</span>
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
