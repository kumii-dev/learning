/**
 * client/src/App.jsx
 * Root router — all app routes defined here.
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import MyLearning    from './pages/MyLearning';
import Courses       from './pages/Courses';
import CourseDetail  from './pages/CourseDetail';
import Assessment    from './pages/Assessment';
import Certificates  from './pages/Certificates';

export default function App() {
  return (
    <Routes>
      <Route path="/"                     element={<Navigate to="/my-learning" replace />} />
      <Route path="/my-learning"          element={<MyLearning />} />
      <Route path="/courses"              element={<Courses />} />
      <Route path="/courses/:id"          element={<CourseDetail />} />
      <Route path="/assessments/:id"      element={<Assessment />} />
      <Route path="/certificates"         element={<Certificates />} />
      <Route path="*"                     element={<Navigate to="/my-learning" replace />} />
    </Routes>
  );
}
