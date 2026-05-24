/**
 * client/src/admin/AdminLayout.jsx
 * Top header + bottom tab nav layout for the admin CMS portal.
 * Mirrors the learner Layout pattern.
 * Nav items are filtered by the current admin's RBAC privileges.
 */
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import FeatherIcon from 'feather-icons-react';
import { getProfile } from '../lib/authBridge';
import apiClient from '../lib/apiClient';
import styles from './AdminLayout.module.css';

const ALL_NAV = [
  { to: '/admin',             end: true, label: 'Dashboard',     icon: 'grid',       tab: 'dashboard' },
  { to: '/admin/courses',                label: 'Courses',        icon: 'book-open',  tab: 'courses' },
  { to: '/admin/analytics',              label: 'Analytics',      icon: 'bar-chart-2',tab: 'analytics' },
  { to: '/admin/learners',               label: 'Learners',       icon: 'users',      tab: 'learners' },
  { to: '/admin/assessments',            label: 'Assessments',    icon: 'clipboard',  tab: 'assessments' },
  { to: '/admin/live-sessions',          label: 'Live Sessions',  icon: 'video',      tab: 'live_sessions' },
  { to: '/admin/rbac',                   label: 'RBAC',           icon: 'shield',     tab: 'rbac' },
];

export default function AdminLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const profile   = getProfile();
  const firstName = profile?.first_name ?? 'Admin';

  // privileges: { tab: bool } — null while loading (show all during load)
  const [privileges, setPrivileges] = useState(null);

  useEffect(() => {
    apiClient.get('/rbac/my-privileges')
      .then((r) => setPrivileges(r.data?.data ?? null))
      .catch(() => setPrivileges(null)); // on error default to full access
  }, []);

  // Filter nav based on privileges (null = still loading = show all)
  const visibleNav = ALL_NAV.filter((item) =>
    privileges === null || privileges[item.tab] !== false
  );

  // If the current route is now forbidden, redirect to dashboard
  useEffect(() => {
    if (!privileges) return;
    const current = ALL_NAV.find((item) =>
      item.end
        ? location.pathname === item.to
        : location.pathname.startsWith(item.to)
    );
    if (current && privileges[current.tab] === false) {
      navigate('/admin', { replace: true });
    }
  }, [privileges, location.pathname, navigate]);

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
        {visibleNav.map((item) => (
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
