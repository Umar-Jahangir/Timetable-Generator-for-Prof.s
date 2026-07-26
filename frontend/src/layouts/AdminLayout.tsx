import React from "react";
import { Box } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/admin" },
  { label: "Faculty", path: "/admin/faculty" },
  { label: "Subjects", path: "/admin/subjects" },
  { label: "Classrooms", path: "/admin/classrooms" },
  { label: "Laboratories", path: "/admin/laboratories" },
  { label: "Divisions", path: "/admin/divisions" },
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
  "/admin/timetable": "Timetable Generation",
  "/admin/constraints": "Constraint Configuration",
  "/admin/analytics": "Analytics Dashboard",
  "/admin/settings": "Settings",
};

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const title = TITLES[location.pathname] || "Admin";

  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar items={NAV_ITEMS} brandSubtitle="Administrator Console" />
      <Box sx={{ flexGrow: 1, minHeight: "100vh" }}>
        <TopBar pageTitle={title} />
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
