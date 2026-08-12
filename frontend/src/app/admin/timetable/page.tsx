"use client";

import React from "react";
import { Alert, Box, Button, Chip, Typography } from "@mui/material";
import ConsolePanel from "../../../components/common/ConsolePanel";
import StatCard from "../../../components/common/StatCard";
import { palette } from "../../../theme/theme";
import { useAdminTimetable, useGenerateTimetable } from "../../../hooks/useAdminApi";
import { AdminTimetableEntry } from "../../../types/admin";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const TYPE_COLOR: Record<string, string> = {
  lecture: palette.text,
  tutorial: palette.textDim,
  lab: palette.accent,
  break: palette.textDim,
};

/**
 * CHANGED FROM PHASE 1: was a static placeholder. Now calls the real
 * Phase 6 optimizer (POST /admin/timetable/generate — Google OR-Tools
 * CP-SAT under the hood) and renders whatever it actually produced.
 * See backend/app/scheduling/optimizer.py for the full, honestly
 * documented scope of what the v1 engine does and doesn't enforce.
 */
export default function TimetableGenerationPage() {
  const { data: entries = [], isLoading } = useAdminTimetable();
  const generate = useGenerateTimetable();

  const grouped = DAYS.map((day) => ({
    day,
    entries: entries
      .filter((e) => e.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time)),
  }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <ConsolePanel title="Generate Timetable">
        <Typography variant="body2" sx={{ color: palette.textDim, mb: 2 }}>
          Runs the constraint-satisfaction optimizer against every current Subject-Faculty
          Assignment. No clashes (faculty, room, or division), correct lecture/tutorial/lab
          counts, and active constraints (e.g. a faculty free hour) are enforced as hard rules.
        </Typography>

        <Button
          variant="contained"
          color="primary"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
        >
          {generate.isPending ? "Generating..." : "[ Generate Timetable ]"}
        </Button>

        {generate.data && (
          <Box sx={{ mt: 3 }}>
            {generate.data.solver_status === "NO_ASSIGNMENTS" ? (
              <Alert severity="warning">{generate.data.message}</Alert>
            ) : (
              <>
                <Alert severity={generate.data.sessions_scheduled === generate.data.sessions_requested ? "success" : "warning"} sx={{ mb: 2 }}>
                  Solver status: <strong>{generate.data.solver_status}</strong> — scheduled{" "}
                  {generate.data.sessions_scheduled} of {generate.data.sessions_requested} required sessions in{" "}
                  {generate.data.duration_seconds}s.
                </Alert>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  <StatCard label="SESSIONS REQUESTED" value={generate.data.sessions_requested} />
                  <StatCard label="SESSIONS SCHEDULED" value={generate.data.sessions_scheduled} />
                  <StatCard label="ENTRIES CREATED" value={generate.data.entries_created} accent />
                </Box>
              </>
            )}
          </Box>
        )}
      </ConsolePanel>

      <ConsolePanel title="Current Timetable (all divisions)">
        {isLoading && (
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            Loading...
          </Typography>
        )}
        {!isLoading && entries.length === 0 && (
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            No timetable generated yet — click &ldquo;Generate Timetable&rdquo; above. Make sure at least one
            Subject-Faculty Assignment exists first (Admin → Assignments).
          </Typography>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {grouped
            .filter((g) => g.entries.length > 0)
            .map((g) => (
              <Box key={g.day}>
                <Typography variant="caption" sx={{ color: palette.border, letterSpacing: 1 }}>
                  {g.day.toUpperCase()}
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", mt: 0.5 }}>
                  {g.entries.map((e: AdminTimetableEntry) => (
                    <Box
                      key={e.entry_id}
                      sx={{
                        display: "flex",
                        gap: 2,
                        alignItems: "center",
                        py: 0.75,
                        borderBottom: `1px solid ${palette.divider}`,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography variant="body2" sx={{ color: palette.textDim, minWidth: 110 }}>
                        {e.start_time.slice(0, 5)}–{e.end_time.slice(0, 5)}
                      </Typography>
                      <Chip size="small" label={e.entry_type} sx={{ color: TYPE_COLOR[e.entry_type] }} variant="outlined" />
                      <Typography variant="body2" sx={{ color: palette.text }}>
                        {e.subject_name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: palette.accent }}>
                        {e.division_name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: palette.textDim }}>
                        {e.faculty_name}
                      </Typography>
                      {e.room_name && (
                        <Typography variant="body2" sx={{ color: palette.textDim }}>
                          {e.room_name}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            ))}
        </Box>
      </ConsolePanel>
    </Box>
  );
}
