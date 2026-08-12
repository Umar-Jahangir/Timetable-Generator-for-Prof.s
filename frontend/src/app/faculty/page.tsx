"use client";

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useRouter } from "next/navigation";
import ConsolePanel from "../../components/common/ConsolePanel";
import { palette } from "../../theme/theme";
import { useAuth } from "../../hooks/useAuth";
import { TimetableSlot } from "../../types";

// Mock "today" schedule — replaced by GET /faculty/{id}/today in Phase 5.
const todaySlots: TimetableSlot[] = [
  {
    id: "1",
    day: "Monday",
    startTime: "09:00",
    endTime: "10:00",
    subject: "DBMS Lecture",
    type: "lecture",
    division: "TY-A",
  },
  {
    id: "2",
    day: "Monday",
    startTime: "10:00",
    endTime: "12:00",
    subject: "DBMS Lab",
    type: "lab",
    division: "TY-B",
  },
  { id: "3", day: "Monday", startTime: "12:00", endTime: "13:00", subject: null, type: "free" },
  {
    id: "4",
    day: "Monday",
    startTime: "13:00",
    endTime: "14:00",
    subject: "Department Hour",
    type: "tutorial",
  },
  {
    id: "5",
    day: "Monday",
    startTime: "14:00",
    endTime: "15:00",
    subject: "AI Lecture",
    type: "lecture",
    division: "SY-C",
  },
];

const QUICK_ACTIONS = [
  { label: "[ View Timetable ]", path: "/faculty/timetable" },
  { label: "[ Schedule Extra Lecture ]", path: "/faculty/assistant" },
  { label: "[ Find Classroom ]", path: "/faculty/assistant" },
  { label: "[ Smart Assistant ]", path: "/faculty/assistant" },
  { label: "[ Workload ]", path: "/faculty/workload" },
];

// CHANGED FROM CRA: useNavigate() -> next/navigation's useRouter().push().
// Must remain a Client Component because of useAuth() + onClick handlers.
export default function FacultyDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography sx={{ color: palette.text }}>
        Welcome, <span style={{ color: palette.border }}>{user?.name}</span>
      </Typography>

      <ConsolePanel title="Today's Schedule">
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {todaySlots.map((slot, idx) => (
            <Box
              key={slot.id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                py: 1.25,
                borderBottom: idx < todaySlots.length - 1 ? `1px solid ${palette.divider}` : "none",
              }}
            >
              <Typography variant="body2" sx={{ color: palette.textDim, minWidth: 140 }}>
                {slot.startTime} - {slot.endTime}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: slot.type === "free" ? palette.success : palette.text, flexGrow: 1 }}
              >
                {slot.subject || "FREE"}
              </Typography>
              {slot.division && (
                <Typography variant="body2" sx={{ color: palette.accent }}>
                  {slot.division}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </ConsolePanel>

      <ConsolePanel title="Quick Actions">
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
          {QUICK_ACTIONS.map((action) => (
            <Button
              key={action.label}
              variant="outlined"
              color="primary"
              onClick={() => router.push(action.path)}
            >
              {action.label}
            </Button>
          ))}
        </Box>
      </ConsolePanel>
    </Box>
  );
}
