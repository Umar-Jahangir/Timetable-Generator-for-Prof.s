import React from "react";
import { Box, Typography, Button } from "@mui/material";
import ConsolePanel from "../../components/common/ConsolePanel";
import StatCard from "../../components/common/StatCard";
import { palette } from "../../theme/theme";
import { DashboardStats } from "../../types";

// Mock data — replaced by a real API call to GET /admin/dashboard in Phase 3.
const mockStats: DashboardStats = {
  facultyCount: 68,
  subjectCount: 92,
  classroomCount: 24,
  labCount: 10,
  pendingRequests: 4,
};

const AdminDashboard: React.FC = () => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <ConsolePanel title="Today's Overview">
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
          <StatCard label="FACULTY" value={mockStats.facultyCount} />
          <StatCard label="SUBJECTS" value={mockStats.subjectCount} />
          <StatCard label="CLASSROOMS" value={mockStats.classroomCount} />
          <StatCard label="LABS" value={mockStats.labCount} />
          <StatCard label="PENDING REQUESTS" value={mockStats.pendingRequests} accent />
        </Box>
        <Button variant="contained" color="primary">
          [ Generate Timetable ]
        </Button>
      </ConsolePanel>

      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <ConsolePanel title="Quick Actions" sx={{ flex: "1 1 280px" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {[
              "Add Faculty",
              "Add Subject",
              "Add Classroom",
              "Add Laboratory",
              "Configure Constraints",
            ].map((action) => (
              <Typography
                key={action}
                variant="body2"
                sx={{ color: palette.textDim, cursor: "pointer", "&:hover": { color: palette.border } }}
              >
                {"> "} {action}
              </Typography>
            ))}
          </Box>
        </ConsolePanel>

        <ConsolePanel title="System Status" sx={{ flex: "1 1 280px" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="body2" sx={{ color: palette.success }}>
              ✓ Database connected
            </Typography>
            <Typography variant="body2" sx={{ color: palette.success }}>
              ✓ Optimization engine ready
            </Typography>
            <Typography variant="body2" sx={{ color: palette.textDim }}>
              Last timetable generated: 2 days ago
            </Typography>
          </Box>
        </ConsolePanel>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
