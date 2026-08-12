"use client";

import React from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import ConsolePanel from "../../../components/common/ConsolePanel";
import StatCard from "../../../components/common/StatCard";
import { palette } from "../../../theme/theme";
import { useWorkload } from "../../../hooks/useFacultyApi";

export default function WorkloadPage() {
  const { data: workload, isLoading } = useWorkload();

  return (
    <ConsolePanel title="Workload Statistics">
      {isLoading && (
        <Typography variant="body2" sx={{ color: palette.textDim }}>
          Loading...
        </Typography>
      )}
      {workload && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <StatCard label="SCHEDULED HRS/WEEK" value={workload.scheduled_hours} />
            <StatCard label="MAX HRS/WEEK" value={workload.max_weekly_hours} />
            <StatCard label="ACTIVE ENTRIES" value={workload.entries_count} />
            <StatCard label="UTILIZATION" value={`${workload.utilization_percent}%`} accent />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ color: palette.textDim, mb: 1, display: "block" }}>
              Weekly utilization
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(workload.utilization_percent, 100)}
              sx={{
                height: 10,
                backgroundColor: palette.divider,
                "& .MuiLinearProgress-bar": { backgroundColor: palette.border },
              }}
            />
          </Box>

          {workload.entries_count === 0 && (
            <Typography variant="body2" sx={{ color: palette.textDim }}>
              No timetable entries yet — workload will populate automatically once the timetable is
              generated (Phase 6).
            </Typography>
          )}
        </Box>
      )}
    </ConsolePanel>
  );
}
