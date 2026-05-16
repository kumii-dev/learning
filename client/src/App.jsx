/**
 * client/src/App.jsx
 * Root router — all app routes defined here.
 */

import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout        from './components/Layout';
import Discover      from './pages/Discover';
import CareerDetail  from './pages/CareerDetail';
import MyLearning    from './pages/MyLearning';
import LearningPaths from './pages/LearningPaths';
import LiveSessions  from './pages/LiveSessions';
import Courses       from './pages/Courses';
import CourseDetail  from './pages/CourseDetail';
import Assessment    from './pages/Assessment';
import Certificates  from './pages/Certificates';

export default function App() {
  const [search, setSearch] = useState('');

  return (
    <Layout searchValue={search} onSearchChange={setSearch}>
      <Routes>
        <Route path="/"                element={<Discover search={search} />} />
        <Route path="/careers/:slug"   element={<CareerDetail />} />
        <Route path="/my-learning"     element={<MyLearning />} />
        <Route path="/learning-paths"  element={<LearningPaths />} />
        <Route path="/live-sessions"   element={<LiveSessions />} />
        <Route path="/courses"         element={<Courses />} />
        <Route path="/courses/:id"     element={<CourseDetail />} />
        <Route path="/assessments/:id" element={<Assessment />} />
        <Route path="/certificates"    element={<Certificates />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

