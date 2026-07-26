import React from "react";
import { Box } from "@mui/material";
import ConsolePanel from "../../components/common/ConsolePanel";
import TimetableGrid from "../../components/timetable/TimetableGrid";
import { TimetableSlot } from "../../types";

// Mock weekly timetable — replaced by GET /faculty/{id}/timetable in Phase 5.
const mockSlots: TimetableSlot[] = [
  { id: "1", day: "Monday", startTime: "8:00", endTime: "9:00", subject: "DBMS", type: "lecture" },
  { id: "2", day: "Monday", startTime: "9:00", endTime: "10:00", subject: "DBMS", type: "lecture" },
  { id: "3", day: "Monday", startTime: "10:00", endTime: "11:00", subject: "Lab", type: "lab" },
  { id: "4", day: "Monday", startTime: "11:00", endTime: "12:00", subject: "Lab", type: "lab" },
  { id: "5", day: "Monday", startTime: "12:00", endTime: "13:00", subject: null, type: "break" },
  { id: "6", day: "Monday", startTime: "13:00", endTime: "14:00", subject: "AI", type: "lecture" },
  { id: "7", day: "Monday", startTime: "14:00", endTime: "15:00", subject: null, type: "free" },
  { id: "8", day: "Tuesday", startTime: "8:00", endTime: "9:00", subject: "AI", type: "lecture" },
  { id: "9", day: "Tuesday", startTime: "9:00", endTime: "10:00", subject: "AI", type: "lecture" },
  { id: "10", day: "Tuesday", startTime: "12:00", endTime: "13:00", subject: null, type: "break" },
];

const WeeklyTimetable: React.FC = () => {
  return (
    <Box>
      <ConsolePanel title="Weekly Timetable">
        <TimetableGrid slots={mockSlots} />
      </ConsolePanel>
    </Box>
  );
};

export default WeeklyTimetable;
