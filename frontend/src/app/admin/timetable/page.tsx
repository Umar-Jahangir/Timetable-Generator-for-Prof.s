"use client";

import React, { useMemo, useState } from "react";
import { Alert, Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import ConsolePanel from "../../../components/common/ConsolePanel";
import StatCard from "../../../components/common/StatCard";
import TimetableGrid from "../../../components/timetable/TimetableGrid";
import { palette } from "../../../theme/theme";
import {
  useAdminTimetable,
  useAcademicYears,
  useDivisionList,
  useGenerateTimetable,
} from "../../../hooks/useAdminApi";
import { AdminTimetableEntry } from "../../../types/admin";
import { TimetableSlot } from "../../../types";

function toGridSlots(entries: AdminTimetableEntry[]): TimetableSlot[] {
  return entries.map((entry) => ({
    id: String(entry.entry_id),
    day: entry.day_of_week as TimetableSlot["day"],
    startTime: entry.start_time.slice(0, 5),
    endTime: entry.end_time.slice(0, 5),
    subject: entry.subject_name,
    type: entry.entry_type,
    division: `${entry.division_label ?? entry.division_name ?? "—"}${
      entry.batch_name ? ` · ${entry.batch_name}` : ""
    }`,
    faculty: entry.faculty_name ?? undefined,
    room: entry.room_name ?? undefined,
  }));
}

/**
 * CHANGED FROM PHASE 1: was a static placeholder. Now calls the real
 * Phase 6 optimizer (POST /admin/timetable/generate — Google OR-Tools
 * CP-SAT under the hood) and renders whatever it actually produced.
 * See backend/app/scheduling/optimizer.py for the full, honestly
 * documented scope of what the v1 engine does and doesn't enforce.
 */
export default function TimetableGenerationPage() {
  const { data: entries = [], isLoading } = useAdminTimetable();
  const { data: divisions = [] } = useDivisionList();
  const { data: academicYears = [] } = useAcademicYears();
  const generate = useGenerateTimetable();
  const [divisionFilter, setDivisionFilter] = useState<number | "all">("all");

  const divisionOptions = useMemo(() => {
    return [...divisions]
      .map((d) => {
        const year = academicYears.find((y) => y.academic_year_id === d.academic_year_id);
        return {
          division_id: d.division_id,
          label: `${year?.name ?? "Year"}-${d.name}`,
          yearOrder: year?.year_order ?? 99,
          name: d.name,
        };
      })
      .sort((a, b) => a.yearOrder - b.yearOrder || a.name.localeCompare(b.name));
  }, [divisions, academicYears]);

  const filteredEntries = useMemo(() => {
    if (divisionFilter === "all") return entries;
    return entries.filter((e) => e.division_id === divisionFilter);
  }, [entries, divisionFilter]);

  const selectedLabel =
    divisionFilter === "all"
      ? "all divisions"
      : divisionOptions.find((d) => d.division_id === divisionFilter)?.label ?? "selected division";

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

      <ConsolePanel title={`Current Timetable (${selectedLabel})`}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 2 }}>
          <TextField
            select
            size="small"
            label="Division"
            value={divisionFilter === "all" ? "all" : String(divisionFilter)}
            onChange={(e) => {
              const value = e.target.value;
              setDivisionFilter(value === "all" ? "all" : Number(value));
            }}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="all">All divisions</MenuItem>
            {divisionOptions.map((d) => (
              <MenuItem key={d.division_id} value={String(d.division_id)}>
                {d.label}
              </MenuItem>
            ))}
          </TextField>
          {!isLoading && entries.length > 0 && (
            <Typography variant="caption" sx={{ color: palette.textDim }}>
              Showing {filteredEntries.length} of {entries.length} entries
            </Typography>
          )}
        </Box>

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
        {!isLoading && entries.length > 0 && filteredEntries.length === 0 && (
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            No classes scheduled for this division.
          </Typography>
        )}
        {!isLoading && filteredEntries.length > 0 && (
          <TimetableGrid slots={toGridSlots(filteredEntries)} showFaculty />
        )}
      </ConsolePanel>
    </Box>
  );
}
