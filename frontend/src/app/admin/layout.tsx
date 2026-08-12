"use client";

import React from "react";
import { Box } from "@mui/material";
import { usePathname } from "next/navigation";
import Sidebar from "../../components/layout/Sidebar";
import TopBar from "../../components/layout/TopBar";
import RequireRole from "../../components/auth/RequireRole";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/admin" },
  { label: "Faculty", path: "/admin/faculty" },
  { label: "Subjects", path: "/admin/subjects" },
  { label: "Classrooms", path: "/admin/classrooms" },
  { label: "Laboratories", path: "/admin/laboratories" },
  { label: "Divisions", path: "/admin/divisions" },
  { label: "Assignments", path: "/admin/assignments" },
  { label: "Lecture Requests", path: "/admin/requests" },
  { label: "Timetable", path: "/admin/timetable" },
  { label: "Constraints", path: "/admin/constraints" },
  { label: "Analytics", path: "/admin/analytics" },
  { label: "Settings", path: "/admin/settings" },
];

const TITLES: Record<string, string> = {
  "/admin": "Admin Dashboard",
  "/admin/faculty": "Faculty Management",
  "/admin/subjects": "Subject Management",
  "/admin/classrooms": "Classroom Management",
  "/admin/laboratories": "Laboratory Management",
  "/admin/divisions": "Division Management",
  "/admin/assignments": "Subject-Faculty Assignments",
  "/admin/requests": "Lecture Request Approval",
  "/admin/timetable": "Timetable Generation",
  "/admin/constraints": "Constraint Configuration",
  "/admin/analytics": "Analytics Dashboard",
  "/admin/settings": "Settings",
};

/**
 * CHANGED FROM CRA: this replaces both <AdminLayout> AND the
 * `<Route path="/admin" element={<ProtectedRoute>...}>` wrapper that
 * used to live in AppRoutes.tsx. In the App Router, every file under
 * `src/app/admin/` is automatically nested inside this layout — there's
 * no separate route-tree file to maintain. `{children}` is whatever
 * page.tsx matched the current URL (equivalent to react-router's
 * <Outlet />).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = TITLES[pathname] || "Admin";

  return (
    <RequireRole allowedRoles={["admin"]}>
      <Box sx={{ display: "flex" }}>
        <Sidebar items={NAV_ITEMS} brandSubtitle="Administrator Console" />
        <Box sx={{ flexGrow: 1, minHeight: "100vh" }}>
          <TopBar pageTitle={title} />
          <Box sx={{ p: 3 }}>{children}</Box>
        </Box>
      </Box>
    </RequireRole>
  );
}
