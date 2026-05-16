/**
 * client/src/components/Layout.jsx
 * Fixed header + bottom tab navigation wrapper.
 */

import { NavLink } from 'react-router-dom';
import { getIsAdmin } from '../lib/authBridge';
import styles from './Layout.module.css';

const NAV = [
  {
    to: '/',
    label: 'Discover',
    end: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    to: '/my-learning',
    label: 'My Learning',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
  {
    to: '/careers',
    label: 'Careers',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
        <line x1="12" y1="12" x2="12" y2="12.01"/>
        <path d="M2 12.5A20 20 0 0 0 12 15a20 20 0 0 0 10-2.5"/>
      </svg>
    ),
  },
  {
    to: '/live-sessions',
    label: 'Live Sessions',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
        <polyline points="17 2 12 7 7 2"/>
      </svg>
    ),
  },
  {
    to: '/certificates',
    label: 'Achievements',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6"/>
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
      </svg>
    ),
  },
];

export default function Layout({ children, searchValue, onSearchChange }) {
  const isAdmin = getIsAdmin();
  return (
    <>
      <header className={styles.header}>
        <span className={styles.logo}>Learning Hub</span>

        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>🔍</span>
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
            {icon}
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            Admin
          </NavLink>
        )}
      </nav>
    </>
  );
}
