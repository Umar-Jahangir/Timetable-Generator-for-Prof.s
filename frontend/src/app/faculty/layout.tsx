"use client";

import React from "react";
import { Box } from "@mui/material";
import { usePathname } from "next/navigation";
import Sidebar from "../../components/layout/Sidebar";
import TopBar from "../../components/layout/TopBar";
import RequireRole from "../../components/auth/RequireRole";
import { useNotifications } from "../../hooks/useFacultyApi";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/faculty" },
  { label: "Weekly Timetable", path: "/faculty/timetable" },
  { label: "Today's Schedule", path: "/faculty/today" },
  { label: "Free Rooms", path: "/faculty/free-rooms" },
  { label: "Notifications", path: "/faculty/notifications" },
  { label: "Workload", path: "/faculty/workload" },
  { label: "Smart Assistant", path: "/faculty/assistant" },
];

const TITLES: Record<string, string> = {
  "/faculty": "Faculty Dashboard",
  "/faculty/timetable": "Weekly Timetable",
  "/faculty/today": "Today's Schedule",
  "/faculty/free-rooms": "Free Rooms",
  "/faculty/notifications": "Notifications",
  "/faculty/workload": "Workload Statistics",
  "/faculty/assistant": "SmartSched Assistant",
};

// Same pattern as admin/layout.tsx — see that file's comment for the
// full explanation of what replaced react-router here.
export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const title = TITLES[pathname] || "Faculty";
  const { data: notifications = [] } = useNotifications();
  const navItems = NAV_ITEMS.map((item) =>
    item.path === "/faculty/notifications"
      ? { ...item, hasUnread: notifications.some((notification) => !notification.is_read) }
      : item,
  );

  return (
    <RequireRole allowedRoles={["faculty"]}>
      <Box sx={{ display: "flex" }}>
        <Sidebar items={navItems} brandSubtitle="Faculty Console" />
        <Box sx={{ flexGrow: 1, minHeight: "100vh" }}>
          <TopBar pageTitle={title} />
          <Box sx={{ p: 3 }}>{children}</Box>
        </Box>
      </Box>
    </RequireRole>
  );
}
