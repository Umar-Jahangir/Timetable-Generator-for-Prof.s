"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import ConsolePanel from "../../../components/common/ConsolePanel";
import TimetableGrid from "../../../components/timetable/TimetableGrid";
import { palette } from "../../../theme/theme";
import { useWeeklyTimetable } from "../../../hooks/useFacultyApi";
import { TimetableSlot } from "../../../types";
import { TimetableEntry } from "../../../types/faculty";

/**
 * CHANGED FROM PHASE 1: this page used a hardcoded mock array. It now
 * fetches the real timetable via useWeeklyTimetable() (Phase 5) and
 * adapts the API's shape (TimetableEntry, with a full "09:00:00" time
 * string and denormalized names) to TimetableGrid's existing prop shape
 * (TimetableSlot, with "09:00" and a `type` field) rather than changing
 * the shared grid component — it's used nowhere else yet, but keeping
 * its contract stable avoids a ripple effect if that changes.
 */
function toGridSlots(entries: TimetableEntry[]): TimetableSlot[] {
  return entries.map((e) => ({
    id: String(e.entry_id),
    day: e.day_of_week,
    startTime: e.start_time.slice(0, 5),
    endTime: e.end_time.slice(0, 5),
    subject: e.subject_name,
    type: e.entry_type === "break" ? "break" : e.entry_type,
    division: `${e.division_name ?? ""}${e.batch_name ? ` · ${e.batch_name}` : ""}` || undefined,
    room: e.room_name ?? undefined,
  }));
}

export default function WeeklyTimetablePage() {
  const { data: entries = [], isLoading } = useWeeklyTimetable();

  return (
    <Box>
      <ConsolePanel title="Weekly Timetable">
        {isLoading && (
          <Typography variant="body2" sx={{ color: palette.textDim, mb: 2 }}>
            Loading...
          </Typography>
        )}
        {!isLoading && entries.length === 0 && (
          <Typography variant="body2" sx={{ color: palette.textDim, mb: 2 }}>
            No timetable generated yet — this grid will populate automatically once the Timetable
            Generation Engine (Phase 6) runs.
          </Typography>
        )}
        <TimetableGrid slots={toGridSlots(entries)} />
      </ConsolePanel>
    </Box>
  );
}
