/**
 * app/layout.js — Root layout.
 * Boots the iFrame auth bridge before any child renders.
 */

import './globals.css';
import AuthProvider from '@/components/AuthProvider';

export const metadata = {
  title: 'Kumii Learning Hub',
  description: 'Enterprise Learning Management System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
