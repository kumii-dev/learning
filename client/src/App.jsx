/**
 * client/src/App.jsx
 * Root router — all app routes defined here.
 */

import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout        from './components/Layout';
import Discover      from './pages/Discover';
import CareerDetail  from './pages/CareerDetail';
import Careers       from './pages/Careers';
import MyLearning    from './pages/MyLearning';
import LearningPaths from './pages/LearningPaths';
import LiveSessions  from './pages/LiveSessions';
import Courses       from './pages/Courses';
import CourseDetail  from './pages/CourseDetail';
import Assessment    from './pages/Assessment';
import Certificates  from './pages/Certificates';
import CoursePlayer  from './pages/CoursePlayer';

// Admin CMS portal
import AdminGuard        from './admin/AdminGuard';
import AdminLayout       from './admin/AdminLayout';
import AdminDashboard    from './admin/pages/AdminDashboard';
import AdminCourses      from './admin/pages/AdminCourses';
import AdminCourseEditor from './admin/pages/AdminCourseEditor';
import AdminAnalytics    from './admin/pages/AdminAnalytics';
import AdminLearners     from './admin/pages/AdminLearners';

export default function App() {
  const [search, setSearch] = useState('');

  return (
    <Routes>
      {/* ── Admin CMS portal — no learner Layout ── */}
      <Route element={<AdminGuard><AdminLayout /></AdminGuard>}>
        <Route path="/admin"                    element={<AdminDashboard />} />
        <Route path="/admin/courses"            element={<AdminCourses />} />
        <Route path="/admin/courses/new"        element={<AdminCourseEditor />} />
        <Route path="/admin/courses/:id/edit"   element={<AdminCourseEditor />} />
        <Route path="/admin/analytics"          element={<AdminAnalytics />} />
        <Route path="/admin/learners"           element={<AdminLearners />} />
      </Route>

      {/* ── Learner portal — wrapped in Layout ── */}
      <Route path="*" element={
        <Layout searchValue={search} onSearchChange={setSearch}>
          <Routes>
            <Route path="/"                element={<Discover search={search} />} />
            <Route path="/careers"         element={<Careers />} />
            <Route path="/careers/:slug"   element={<CareerDetail />} />
            <Route path="/my-learning"     element={<MyLearning />} />
            <Route path="/learning-paths"  element={<LearningPaths />} />
            <Route path="/live-sessions"   element={<LiveSessions />} />
            <Route path="/courses"         element={<Courses />} />
            <Route path="/courses/:id"     element={<CourseDetail />} />
            <Route path="/assessments/:id" element={<Assessment />} />
            <Route path="/certificates"    element={<Certificates />} />
            <Route path="/courses/:id/player" element={<CoursePlayer />} />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
}


