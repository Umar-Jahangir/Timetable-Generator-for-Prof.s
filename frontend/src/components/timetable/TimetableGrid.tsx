import React from "react";
import { Box, Typography } from "@mui/material";
import { palette } from "../../theme/theme";
import { DayOfWeek, TimetableSlot } from "../../types";

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = ["8-9", "9-10", "10-11", "11-12", "12-1", "1-2", "2-3"];

interface TimetableGridProps {
  slots: TimetableSlot[];
}

const cellColor = (type?: TimetableSlot["type"]) => {
  switch (type) {
    case "break":
      return palette.textDim;
    case "free":
      return palette.success;
    case "lab":
      return palette.accent;
    default:
      return palette.text;
  }
};

const TimetableGrid: React.FC<TimetableGridProps> = ({ slots }) => {
  const findSlot = (day: DayOfWeek, hour: string) =>
    slots.find((s) => s.day === day && `${parseInt(s.startTime)}-${parseInt(s.endTime) || 12}` === hour);

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `90px repeat(${DAYS.length}, 1fr)`,
          minWidth: 760,
          border: `1px solid ${palette.borderDim}`,
        }}
      >
        <HeaderCell>Time</HeaderCell>
        {DAYS.map((d) => (
          <HeaderCell key={d}>{d}</HeaderCell>
        ))}

        {HOURS.map((hour) => (
          <React.Fragment key={hour}>
            <HeaderCell dim>{hour}</HeaderCell>
            {DAYS.map((day) => {
              const slot = findSlot(day, hour);
              return (
                <Box
                  key={`${day}-${hour}`}
                  sx={{
                    border: `1px solid ${palette.divider}`,
                    p: 1,
                    minHeight: 44,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="caption" sx={{ color: cellColor(slot?.type) }}>
                    {slot?.subject || (slot?.type === "break" ? "BREAK" : slot?.type === "free" ? "FREE" : "")}
                  </Typography>
                </Box>
              );
            })}
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
};

const HeaderCell: React.FC<{ children: React.ReactNode; dim?: boolean }> = ({ children, dim }) => (
  <Box
    sx={{
      border: `1px solid ${palette.divider}`,
      p: 1,
      textAlign: "center",
      backgroundColor: palette.surfaceRaised,
    }}
  >
    <Typography variant="caption" sx={{ color: dim ? palette.textDim : palette.border, fontWeight: 600 }}>
      {children}
    </Typography>
  </Box>
);

export default TimetableGrid;
