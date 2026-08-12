"use client";

import React, { useState } from "react";
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
import { Controller, Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ConsolePanel from "../../../components/common/ConsolePanel";
import { palette } from "../../../theme/theme";
import {
  useCreateLectureRequest,
  useFacultyDivisionLookup,
  useFacultySubjectLookup,
  useMyLectureRequests,
  useTodaySchedule,
} from "../../../hooks/useFacultyApi";
import { lectureRequestSchema, LectureRequestFormValues } from "../../../schemas/faculty";
import { getApiErrorMessage } from "../../../lib/errors";

const STATUS_COLOR: Record<string, string> = {
  pending: palette.accent,
  approved: palette.success,
  rejected: palette.danger,
  cancelled: palette.textDim,
};

export default function TodaySchedulePage() {
  const { data: entries = [], isLoading } = useTodaySchedule();
  const { data: subjects = [] } = useFacultySubjectLookup();
  const { data: divisions = [] } = useFacultyDivisionLookup();
  const { data: myRequests = [] } = useMyLectureRequests();
  const createRequest = useCreateLectureRequest();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LectureRequestFormValues>({
    // See admin/divisions/page.tsx for why this cast is needed (Zod v4
    // z.coerce vs. react-hook-form's Resolver type).
    resolver: zodResolver(lectureRequestSchema) as Resolver<LectureRequestFormValues>,
    defaultValues: { subject_id: 0, division_id: 0, request_type: "extra" },
  });

  const onSubmit = async (values: LectureRequestFormValues) => {
    setFormError(null);
    try {
      await createRequest.mutateAsync(values);
      setDialogOpen(false);
      setSuccessMsg("Request submitted — an admin will review it shortly.");
      reset();
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err));
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {successMsg && (
        <Alert severity="success" onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      <ConsolePanel title="Today's Schedule">
        {isLoading && (
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            Loading...
          </Typography>
        )}
        {!isLoading && entries.length === 0 && (
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            No classes scheduled for today — the timetable hasn&apos;t been generated yet (Phase 6).
          </Typography>
        )}
        {entries.map((entry, idx) => (
          <Box
            key={entry.entry_id}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              py: 1.25,
              borderBottom: idx < entries.length - 1 ? `1px solid ${palette.divider}` : "none",
            }}
          >
            <Typography variant="body2" sx={{ color: palette.textDim, minWidth: 140 }}>
              {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
            </Typography>
            <Typography variant="body2" sx={{ color: palette.text, flexGrow: 1 }}>
              {entry.subject_name ?? entry.entry_type}
            </Typography>
            {entry.division_name && (
              <Typography variant="body2" sx={{ color: palette.accent }}>
                {entry.division_name}
              </Typography>
            )}
          </Box>
        ))}

        <Box sx={{ mt: 3 }}>
          <Button variant="contained" color="primary" onClick={() => setDialogOpen(true)}>
            [ Request Extra / Replacement Lecture ]
          </Button>
        </Box>
      </ConsolePanel>

      <ConsolePanel title="My Lecture Requests">
        {myRequests.length === 0 ? (
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            No requests submitted yet.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {myRequests.map((r) => (
              <Box
                key={r.request_id}
                sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1, borderBottom: `1px solid ${palette.divider}` }}
              >
                <Typography variant="body2" sx={{ color: palette.text }}>
                  {r.request_type === "extra" ? "Extra" : "Replacement"} — {r.subject_name} · {r.division_name}
                </Typography>
                <Chip
                  size="small"
                  label={r.status}
                  sx={{ color: STATUS_COLOR[r.status], borderColor: STATUS_COLOR[r.status] }}
                  variant="outlined"
                />
              </Box>
            ))}
          </Box>
        )}
      </ConsolePanel>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Request Extra / Replacement Lecture</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Controller
              name="request_type"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Request type" fullWidth>
                  <MenuItem value="extra">Extra Lecture</MenuItem>
                  <MenuItem value="replacement">Replacement Lecture</MenuItem>
                </TextField>
              )}
            />
            <Controller
              name="subject_id"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Subject" fullWidth error={!!errors.subject_id} helperText={errors.subject_id?.message}>
                  <MenuItem value={0} disabled>
                    Select a subject
                  </MenuItem>
                  {subjects.map((s) => (
                    <MenuItem key={s.subject_id} value={s.subject_id}>
                      {s.code} — {s.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="division_id"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Division" fullWidth error={!!errors.division_id} helperText={errors.division_id?.message}>
                  <MenuItem value={0} disabled>
                    Select a division
                  </MenuItem>
                  {divisions.map((d) => (
                    <MenuItem key={d.division_id} value={d.division_id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Typography variant="caption" sx={{ color: palette.textDim }}>
              The Smart Scheduling Assistant (Phase 7) will recommend the best slot once built — for now, an
              admin reviews and approves requests manually.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createRequest.isPending}>
              Submit
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
