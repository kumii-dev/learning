/**
 * client/src/components/Layout.jsx
 * Fixed header + bottom tab navigation wrapper.
 */

import { NavLink } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react';
import { getIsAdmin } from '../lib/authBridge';
import styles from './Layout.module.css';

const NAV = [
  { to: '/',             label: 'Discover',      end: true, icon: 'search' },
  { to: '/my-learning',  label: 'My Learning',              icon: 'book-open' },
  { to: '/careers',      label: 'Careers',                  icon: 'briefcase' },
  { to: '/live-sessions',label: 'Live Sessions',             icon: 'video' },
  { to: '/certificates', label: 'Achievements',              icon: 'award' },
];

export default function Layout({ children, searchValue, onSearchChange }) {
  const isAdmin = getIsAdmin();
  return (
    <>
      <header className={styles.header}>
        <span className={styles.logo}>Learning Hub</span>

        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}><FeatherIcon icon="search" size={16} /></span>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search courses, skills, providers..."
            value={searchValue ?? ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
      </header>

      <main>{children}</main>

      <nav className={styles.nav}>
        {NAV.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              [styles.navItem, isActive ? styles.active : ''].join(' ')
            }
          >
            <FeatherIcon icon={icon} size={20} />
            {label}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              [styles.navItem, styles.adminItem, isActive ? styles.active : ''].join(' ')
            }
          >
            <FeatherIcon icon="edit-3" size={20} />
            Admin
          </NavLink>
        )}
      </nav>
    </>
  );
}
