"use client";

import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import ConsolePanel from "../../../components/common/ConsolePanel";
import { palette } from "../../../theme/theme";
import {
  useFacultyDivisionLookup,
  useFacultySubjectLookup,
  useFreeRooms,
  useReserveRoom,
} from "../../../hooks/useFacultyApi";
import { FreeRoom } from "../../../types/faculty";
import { getApiErrorMessage } from "../../../lib/errors";

const todayIso = () => new Date().toLocaleDateString("en-CA");

export default function FreeRoomsPage() {
  const [reservationDate, setReservationDate] = useState(todayIso);
  const [selected, setSelected] = useState<FreeRoom | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { data, isLoading } = useFreeRooms(reservationDate);
  const { data: subjects = [] } = useFacultySubjectLookup();
  const { data: divisions = [] } = useFacultyDivisionLookup();
  const reserve = useReserveRoom();

  const slots = useMemo(() => {
    const grouped = new Map<string, FreeRoom[]>();
    for (const room of data?.rooms_by_slot ?? []) {
      const key = `${room.start_time.slice(0, 5)}-${room.end_time.slice(0, 5)}`;
      grouped.set(key, [...(grouped.get(key) ?? []), room]);
    }
    return [...grouped.entries()];
  }, [data]);

  const openReservation = (room: FreeRoom) => {
    setSelected(room);
    setSubjectId("");
    setDivisionId("");
    setFormError(null);
  };

  const submitReservation = async () => {
    if (!selected || !subjectId || !divisionId) {
      setFormError("Select both a subject and a division.");
      return;
    }
    try {
      await reserve.mutateAsync({
        room_id: selected.room_id,
        time_slot_id: selected.time_slot_id,
        scheduled_date: reservationDate,
        subject_id: Number(subjectId),
        division_id: Number(divisionId),
      });
      setSelected(null);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <ConsolePanel title="Free Rooms">
        <Typography variant="body2" sx={{ color: palette.textDim, mb: 2 }}>
          Select a date to view rooms free at each time. Reservations are one-time requests and require admin approval.
        </Typography>
        <TextField
          type="date"
          label="Reservation date"
          value={reservationDate}
          onChange={(event) => setReservationDate(event.target.value)}
          inputProps={{ min: todayIso() }}
          InputLabelProps={{ shrink: true }}
          sx={{ mb: 2 }}
        />
        {data && (
          <Typography variant="caption" sx={{ color: palette.accent, display: "block", mb: 2 }}>
            {data.day}, {data.date}
          </Typography>
        )}
        {isLoading && <Typography sx={{ color: palette.textDim }}>Loading free rooms...</Typography>}
        {!isLoading && slots.length === 0 && (
          <Typography sx={{ color: palette.textDim }}>No rooms are free on this date.</Typography>
        )}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {slots.map(([time, rooms]) => (
            <Box key={time} sx={{ border: `1px solid ${palette.divider}`, p: 1.5 }}>
              <Typography variant="body2" sx={{ color: palette.border, mb: 1 }}>
                {time}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {rooms.map((room) => (
                  <Button
                    key={`${room.time_slot_id}-${room.room_id}`}
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={() => openReservation(room)}
                  >
                    {room.room_name} — {room.room_type === "classroom" ? "Lecture" : room.room_type}
                  </Button>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </ConsolePanel>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle>Reserve {selected?.room_name}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {formError && <Alert severity="warning">{formError}</Alert>}
          {selected?.is_one_hour_lab && (
            <Alert severity="warning">
              This laboratory is free for only one hour. A lab reservation requires two consecutive hours.
            </Alert>
          )}
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            {reservationDate} · {selected?.start_time.slice(0, 5)}–{selected?.end_time.slice(0, 5)} ·{" "}
            {selected?.room_type}
          </Typography>
          <TextField select label="Subject" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
            <MenuItem value="" disabled>Select subject</MenuItem>
            {subjects.map((subject) => (
              <MenuItem key={subject.subject_id} value={subject.subject_id}>
                {subject.code} — {subject.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Division" value={divisionId} onChange={(event) => setDivisionId(event.target.value)}>
            <MenuItem value="" disabled>Select division</MenuItem>
            {divisions.map((division) => (
              <MenuItem key={division.division_id} value={division.division_id}>{division.name}</MenuItem>
            ))}
          </TextField>
          <Chip
            label="Availability is rechecked on submit and again when Admin approves."
            variant="outlined"
            sx={{ alignSelf: "flex-start", color: palette.textDim }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelected(null)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={reserve.isPending || selected?.is_one_hour_lab}
            onClick={submitReservation}
          >
            Reserve
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
