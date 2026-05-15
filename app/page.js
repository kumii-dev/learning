/**
 * app/page.js — Home / redirect to My Learning
 */

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/my-learning');
}
