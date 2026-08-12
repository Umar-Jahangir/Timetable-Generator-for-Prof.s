"use client";

import React from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import ConsolePanel from "../../../components/common/ConsolePanel";
import StatCard from "../../../components/common/StatCard";
import { palette } from "../../../theme/theme";
import { useAnalytics } from "../../../hooks/useAdminApi";

/**
 * CHANGED FROM PHASE 1: was a static placeholder. Every number here now
 * comes from GET /admin/analytics (Phase 8) — real queries against
 * timetable_entries, faculty, rooms, lecture_requests, and
 * assistant_query_logs. See backend/app/services/analytics_service.py
 * for exactly what each metric means, including the one deliberate
 * omission: a standalone "conflicts prevented" counter isn't shown,
 * because Phase 6 enforces zero clashes by construction — there's
 * nothing real to count without fabricating a number to match the
 * original wireframe.
 */

interface UtilizationBarProps {
  label: string;
  value: number;
}

const UtilizationBar: React.FC<UtilizationBarProps> = ({ label, value }) => (
  <Box sx={{ mb: 2.5 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
      <Typography variant="body2" sx={{ color: palette.text }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ color: palette.accent, fontWeight: 600 }}>
        {value}%
      </Typography>
    </Box>
    <LinearProgress
      variant="determinate"
      value={Math.min(value, 100)}
      sx={{
        height: 10,
        backgroundColor: palette.divider,
        "& .MuiLinearProgress-bar": { backgroundColor: palette.border },
      }}
    />
  </Box>
);

export default function AnalyticsPage() {
  const { data, isLoading, isError } = useAnalytics();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <ConsolePanel title="Analytics Dashboard">
        {isLoading && (
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            Loading...
          </Typography>
        )}
        {isError && (
          <Typography variant="body2" sx={{ color: palette.danger }}>
            Couldn&apos;t load analytics. Is the backend running?
          </Typography>
        )}
        {data && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <UtilizationBar label="Faculty Utilization" value={data.faculty_utilization_percent} />
            <UtilizationBar label="Classroom Utilization" value={data.classroom_utilization_percent} />
            <UtilizationBar label="Laboratory Utilization" value={data.laboratory_utilization_percent} />
            <UtilizationBar label="Student Idle Time" value={data.student_idle_time_percent} />
          </Box>
        )}
      </ConsolePanel>

      {data && (
        <>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <StatCard label="ACTIVE SESSIONS" value={data.active_sessions_count} />
            <StatCard label="TOTAL FACULTY" value={data.total_faculty_count} />
            <StatCard label="PENDING REQUESTS" value={data.pending_requests_count} accent />
            <StatCard
              label="LAST GENERATED"
              value={data.last_generated_at ? new Date(data.last_generated_at).toLocaleDateString() : "Never"}
            />
          </Box>

          <ConsolePanel title="Scheduling Assistant Usage">
            {data.assistant_queries_total === 0 ? (
              <Typography variant="body2" sx={{ color: palette.textDim }}>
                No assistant queries yet — once faculty start using the Smart Assistant
                (Faculty → Smart Assistant), usage breakdown by intent will appear here.
              </Typography>
            ) : (
              <>
                <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
                  <StatCard label="TOTAL QUERIES" value={data.assistant_queries_total} />
                  <StatCard
                    label="SUCCESS RATE"
                    value={`${Math.round((data.assistant_queries_successful / data.assistant_queries_total) * 100)}%`}
                  />
                </Box>
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  {data.assistant_queries_by_intent.map((row, idx) => (
                    <Box
                      key={row.intent}
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        py: 1,
                        borderBottom:
                          idx < data.assistant_queries_by_intent.length - 1
                            ? `1px solid ${palette.divider}`
                            : "none",
                      }}
                    >
                      <Typography variant="body2" sx={{ color: palette.text, fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                        {row.intent}
                      </Typography>
                      <Typography variant="body2" sx={{ color: palette.textDim }}>
                        {row.successful}/{row.count} successful
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            )}
          </ConsolePanel>
        </>
      )}
    </Box>
  );
}
