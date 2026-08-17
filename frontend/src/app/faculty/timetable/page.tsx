"use client";

import React, { useMemo } from "react";
import { Box, Button, Typography } from "@mui/material";
import ConsolePanel from "../../../components/common/ConsolePanel";
import TimetableGrid from "../../../components/timetable/TimetableGrid";
import { palette } from "../../../theme/theme";
import { useWeeklyTimetable } from "../../../hooks/useFacultyApi";
import { TimetableSlot } from "../../../types";
import { TimetableEntry } from "../../../types/faculty";
import { exportTimetableToExcel } from "../../../lib/exportTimetableExcel";

function formatDivision(entry: TimetableEntry): string | undefined {
  const base = entry.division_label || entry.division_name;
  if (!base) return undefined;
  return entry.batch_name ? `${base} · ${entry.batch_name}` : base;
}

function toGridSlots(entries: TimetableEntry[]): TimetableSlot[] {
  return entries.map((e) => ({
    id: String(e.entry_id),
    day: e.day_of_week,
    startTime: e.start_time.slice(0, 5),
    endTime: e.end_time.slice(0, 5),
    subject: e.subject_name,
    subjectCode: e.subject_code,
    type: e.entry_type === "break" ? "break" : e.entry_type,
    isExtra: Boolean(e.is_extra),
    division: formatDivision(e),
    room: e.room_name ?? undefined,
  }));
}

export default function WeeklyTimetablePage() {
  const { data: entries = [], isLoading } = useWeeklyTimetable();
  const slots = useMemo(() => toGridSlots(entries), [entries]);

  return (
    <Box>
      <ConsolePanel title="Weekly Timetable">
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            disabled={slots.length === 0}
            onClick={() => exportTimetableToExcel(slots, "faculty-weekly-timetable.xlsx")}
          >
            Export Excel
          </Button>
        </Box>
        {isLoading && (
          <Typography variant="body2" sx={{ color: palette.textDim, mb: 2 }}>
            Loading...
          </Typography>
        )}
        {!isLoading && entries.length === 0 && (
          <Typography variant="body2" sx={{ color: palette.textDim, mb: 2 }}>
            No timetable generated yet — this grid will populate automatically once the Timetable
            Generation Engine runs.
          </Typography>
        )}
        <TimetableGrid slots={slots} />
      </ConsolePanel>
    </Box>
  );
}
