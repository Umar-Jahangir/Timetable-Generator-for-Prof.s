import React from "react";
import { Box } from "@mui/material";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import TopBar from "../components/layout/TopBar";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/faculty" },
  { label: "Weekly Timetable", path: "/faculty/timetable" },
  { label: "Today's Schedule", path: "/faculty/today" },
  { label: "Notifications", path: "/faculty/notifications" },
  { label: "Workload", path: "/faculty/workload" },
  { label: "Smart Assistant", path: "/faculty/assistant" },
];

const TITLES: Record<string, string> = {
  "/faculty": "Faculty Dashboard",
  "/faculty/timetable": "Weekly Timetable",
  "/faculty/today": "Today's Schedule",
  "/faculty/notifications": "Notifications",
  "/faculty/workload": "Workload Statistics",
  "/faculty/assistant": "SmartSched Assistant",
};

const FacultyLayout: React.FC = () => {
  const location = useLocation();
  const title = TITLES[location.pathname] || "Faculty";

  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar items={NAV_ITEMS} brandSubtitle="Faculty Console" />
      <Box sx={{ flexGrow: 1, minHeight: "100vh" }}>
        <TopBar pageTitle={title} />
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default FacultyLayout;
