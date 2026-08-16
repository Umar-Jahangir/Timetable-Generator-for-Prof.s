import React from "react";
import { Box, Typography } from "@mui/material";
import { palette } from "../../theme/theme";
import { DayOfWeek, TimetableSlot } from "../../types";

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** College hours 08:00–18:00; labels use 24h start for unambiguous matching. */
const HOURS: { label: string; startHour: number }[] = [
  { label: "8-9", startHour: 8 },
  { label: "9-10", startHour: 9 },
  { label: "10-11", startHour: 10 },
  { label: "11-12", startHour: 11 },
  { label: "12-1", startHour: 12 },
  { label: "1-2", startHour: 13 },
  { label: "2-3", startHour: 14 },
  { label: "3-4", startHour: 15 },
  { label: "4-5", startHour: 16 },
  { label: "5-6", startHour: 17 },
];

interface TimetableGridProps {
  slots: TimetableSlot[];
  showFaculty?: boolean;
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

const TimetableGrid: React.FC<TimetableGridProps> = ({ slots, showFaculty = false }) => {
  const findSlots = (day: DayOfWeek, startHour: number) =>
    slots.filter((s) => s.day === day && parseInt(s.startTime, 10) === startHour);

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
          <React.Fragment key={hour.label}>
            <HeaderCell dim>{hour.label}</HeaderCell>
            {DAYS.map((day) => {
              const cellSlots = findSlots(day, hour.startHour);
              return (
                <Box
                  key={`${day}-${hour.label}`}
                  sx={{
                    border: `1px solid ${palette.divider}`,
                    p: 1,
                    minHeight: 76,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: 0.75,
                  }}
                >
                  {cellSlots.length === 0 ? (
                    <Typography variant="caption" sx={{ color: palette.textDim, textAlign: "center", mt: 2 }}>
                      —
                    </Typography>
                  ) : (
                    cellSlots.map((slot) => (
                      <Box
                        key={slot.id}
                        sx={{
                          borderLeft: `2px solid ${cellColor(slot.type)}`,
                          pl: 0.75,
                          overflowWrap: "anywhere",
                        }}
                      >
                        <Typography variant="caption" sx={{ color: cellColor(slot.type), display: "block", fontWeight: 700 }}>
                          {slot.subject ?? slot.type.toUpperCase()}
                        </Typography>
                        {slot.division && (
                          <Typography variant="caption" sx={{ color: palette.accent, display: "block" }}>
                            {slot.division}
                          </Typography>
                        )}
                        {showFaculty && slot.faculty && (
                          <Typography variant="caption" sx={{ color: palette.textDim, display: "block" }}>
                            {slot.faculty}
                          </Typography>
                        )}
                        {slot.room && (
                          <Typography variant="caption" sx={{ color: palette.textDim, display: "block" }}>
                            {slot.room}
                          </Typography>
                        )}
                      </Box>
                    ))
                  )}
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
    <Typography
      variant="caption"
      sx={{ color: dim ? palette.textDim : palette.border, fontWeight: 600 }}
    >
      {children}
    </Typography>
  </Box>
);

export default TimetableGrid;
