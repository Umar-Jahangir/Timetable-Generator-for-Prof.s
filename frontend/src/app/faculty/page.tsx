"use client";

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { useRouter } from "next/navigation";
import ConsolePanel from "../../components/common/ConsolePanel";
import { palette } from "../../theme/theme";
import { useAuth } from "../../hooks/useAuth";
import { useTodaySchedule } from "../../hooks/useFacultyApi";

const QUICK_ACTIONS = [
  { label: "[ View Timetable ]", path: "/faculty/timetable" },
  { label: "[ Schedule Extra Lecture ]", path: "/faculty/assistant" },
  { label: "[ Find Classroom ]", path: "/faculty/assistant" },
  { label: "[ Smart Assistant ]", path: "/faculty/assistant" },
  { label: "[ Workload ]", path: "/faculty/workload" },
];

function subjectLabel(code: string | null, name: string | null, fallback: string) {
  if (code && name) return `${code} — ${name}`;
  if (code) return code;
  if (name) return name;
  return fallback;
}

export default function FacultyDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: entries = [], isLoading } = useTodaySchedule();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography sx={{ color: palette.text }}>
        Welcome, <span style={{ color: palette.border }}>{user?.name}</span>
      </Typography>

      <ConsolePanel title="Today's Schedule">
        {isLoading && (
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            Loading...
          </Typography>
        )}
        {!isLoading && entries.length === 0 && (
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            No classes scheduled for today.
          </Typography>
        )}
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {entries.map((entry, idx) => (
            <Box
              key={entry.entry_id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
                py: 1.25,
                borderBottom: idx < entries.length - 1 ? `1px solid ${palette.divider}` : "none",
              }}
            >
              <Typography variant="body2" sx={{ color: palette.textDim, minWidth: 140 }}>
                {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
              </Typography>
              <Typography variant="body2" sx={{ color: palette.text, flexGrow: 1 }}>
                {subjectLabel(entry.subject_code, entry.subject_name, entry.entry_type)}
              </Typography>
              {(entry.division_label || entry.division_name) && (
                <Typography variant="body2" sx={{ color: palette.accent }}>
                  {entry.division_label ?? entry.division_name}
                  {entry.batch_name ? ` · ${entry.batch_name}` : ""}
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
