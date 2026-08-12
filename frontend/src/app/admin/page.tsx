"use client";

import React from "react";
import { Box, Typography, Button } from "@mui/material";
import ConsolePanel from "../../components/common/ConsolePanel";
import StatCard from "../../components/common/StatCard";
import { palette } from "../../theme/theme";
import { useDashboardStats } from "../../hooks/useAdminApi";

/**
 * CHANGED FROM PHASE 1: this page was a Server Component rendering
 * hardcoded mock stats. Now that a real GET /admin/dashboard endpoint
 * exists (Phase 4), it needs live data — which means hooks, which means
 * it must become a Client Component. `useDashboardStats()` wraps
 * TanStack Query's `useQuery`, so this also gets loading/error states
 * and automatic refetch-on-mutation (creating/deleting a Faculty member
 * elsewhere in the app invalidates this query, so the counts here stay
 * correct without a manual refresh).
 */
export default function AdminDashboardPage() {
  const { data: stats, isLoading, isError } = useDashboardStats();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <ConsolePanel title="Today's Overview">
        {isLoading && (
          <Typography variant="body2" sx={{ color: palette.textDim, mb: 2 }}>
            Loading dashboard stats...
          </Typography>
        )}
        {isError && (
          <Typography variant="body2" sx={{ color: palette.danger, mb: 2 }}>
            Couldn&apos;t load dashboard stats. Is the backend running?
          </Typography>
        )}
        {stats && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
            <StatCard label="FACULTY" value={stats.faculty_count} />
            <StatCard label="SUBJECTS" value={stats.subject_count} />
            <StatCard label="CLASSROOMS" value={stats.classroom_count} />
            <StatCard label="LABS" value={stats.lab_count} />
            <StatCard label="PENDING REQUESTS" value={stats.pending_requests} accent />
          </Box>
        )}
        <Button variant="contained" color="primary" disabled>
          [ Generate Timetable ] — Phase 6
        </Button>
      </ConsolePanel>

      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <ConsolePanel title="Quick Actions" sx={{ flex: "1 1 280px" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {[
              { label: "Add Faculty", href: "/admin/faculty" },
              { label: "Add Subject", href: "/admin/subjects" },
              { label: "Add Classroom", href: "/admin/classrooms" },
              { label: "Add Laboratory", href: "/admin/laboratories" },
              { label: "Configure Constraints", href: "/admin/constraints" },
            ].map((action) => (
              <Typography
                key={action.label}
                component="a"
                href={action.href}
                variant="body2"
                sx={{
                  color: palette.textDim,
                  textDecoration: "none",
                  cursor: "pointer",
                  "&:hover": { color: palette.border },
                }}
              >
                {"> "} {action.label}
              </Typography>
            ))}
          </Box>
        </ConsolePanel>

        <ConsolePanel title="System Status" sx={{ flex: "1 1 280px" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="body2" sx={{ color: isError ? palette.danger : palette.success }}>
              {isError ? "✗ Database connection failed" : "✓ Database connected"}
            </Typography>
            <Typography variant="body2" sx={{ color: palette.textDim }}>
              Optimization engine: built in Phase 6
            </Typography>
          </Box>
        </ConsolePanel>
      </Box>
    </Box>
  );
}
