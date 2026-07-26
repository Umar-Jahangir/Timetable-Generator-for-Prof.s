import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import Login from "../pages/auth/Login";
import NotFound from "../pages/shared/NotFound";
import PlaceholderPage from "../pages/shared/PlaceholderPage";

import AdminLayout from "../layouts/AdminLayout";
import AdminDashboard from "../pages/admin/AdminDashboard";

import FacultyLayout from "../layouts/FacultyLayout";
import FacultyDashboard from "../pages/faculty/FacultyDashboard";
import WeeklyTimetable from "../pages/faculty/WeeklyTimetable";
import Assistant from "../pages/faculty/Assistant";

import ProtectedRoute from "./ProtectedRoute";

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      {/* ---------- Admin ---------- */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="faculty" element={<PlaceholderPage title="Faculty Management" phase="Phase 4 - Admin Module" />} />
        <Route path="subjects" element={<PlaceholderPage title="Subject Management" phase="Phase 4 - Admin Module" />} />
        <Route path="classrooms" element={<PlaceholderPage title="Classroom Management" phase="Phase 4 - Admin Module" />} />
        <Route path="laboratories" element={<PlaceholderPage title="Laboratory Management" phase="Phase 4 - Admin Module" />} />
        <Route path="divisions" element={<PlaceholderPage title="Division Management" phase="Phase 4 - Admin Module" />} />
        <Route path="timetable" element={<PlaceholderPage title="Timetable Generation" phase="Phase 6 - Timetable Generation Engine" />} />
        <Route path="constraints" element={<PlaceholderPage title="Constraint Configuration" phase="Phase 4 - Admin Module" />} />
        <Route path="analytics" element={<PlaceholderPage title="Analytics Dashboard" phase="Phase 8 - Analytics" />} />
        <Route path="settings" element={<PlaceholderPage title="Settings" phase="Phase 4 - Admin Module" />} />
      </Route>

      {/* ---------- Faculty ---------- */}
      <Route
        path="/faculty"
        element={
          <ProtectedRoute allowedRoles={["faculty"]}>
            <FacultyLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<FacultyDashboard />} />
        <Route path="timetable" element={<WeeklyTimetable />} />
        <Route path="today" element={<PlaceholderPage title="Today's Schedule" phase="Phase 5 - Faculty Module" />} />
        <Route path="notifications" element={<PlaceholderPage title="Notifications" phase="Phase 5 - Faculty Module" />} />
        <Route path="workload" element={<PlaceholderPage title="Workload Statistics" phase="Phase 5 - Faculty Module" />} />
        <Route path="assistant" element={<Assistant />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
