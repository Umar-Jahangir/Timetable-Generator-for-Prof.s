"use client";

import React, { useState } from "react";
import {
  Alert,
  Box,
  Button,
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
import DataTable, { DataTableColumn } from "../../../components/admin/DataTable";
import ConfirmDeleteDialog from "../../../components/admin/ConfirmDeleteDialog";
import { palette } from "../../../theme/theme";
import {
  useAssignmentList,
  useCreateAssignment,
  useDeleteAssignment,
  useDivisionList,
  useFacultyList,
  useSubjectList,
} from "../../../hooks/useAdminApi";
import { assignmentSchema, AssignmentFormValues } from "../../../schemas/admin";
import { Assignment } from "../../../types/admin";
import { getApiErrorMessage } from "../../../lib/errors";

/**
 * New in Phase 6 — not part of the original Admin nav from Phase 1.
 * This is the essential input the timetable optimizer reads (see
 * backend/app/scheduling/optimizer.py): without at least one
 * assignment here, "Generate Timetable" on the Timetable page has
 * nothing to schedule.
 */
export default function AssignmentsPage() {
  const { data: assignments = [], isLoading } = useAssignmentList();
  const { data: subjects = [] } = useSubjectList();
  const { data: faculty = [] } = useFacultyList();
  const { data: divisions = [] } = useDivisionList();
  const createMutation = useCreateAssignment();
  const deleteMutation = useDeleteAssignment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema) as Resolver<AssignmentFormValues>,
    defaultValues: { subject_id: 0, faculty_id: 0, division_id: 0 },
  });

  const openCreate = () => {
    setFormError(null);
    reset({ subject_id: 0, faculty_id: 0, division_id: 0 });
    setDialogOpen(true);
  };

  const onSubmit = async (values: AssignmentFormValues) => {
    setFormError(null);
    try {
      await createMutation.mutateAsync(values);
      setDialogOpen(false);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const columns: DataTableColumn<Assignment>[] = [
    { key: "subject", label: "Subject", render: (r) => r.subject_name ?? `#${r.subject_id}` },
    { key: "faculty", label: "Faculty", render: (r) => r.faculty_name ?? `#${r.faculty_id}` },
    { key: "division", label: "Division", render: (r) => r.division_name ?? `#${r.division_id}` },
    { key: "term", label: "Term", render: (r) => r.academic_term },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <ConsolePanel title="Subject-Faculty Assignments">
        <Typography variant="body2" sx={{ color: palette.textDim, mb: 2 }}>
          Assign a faculty member to teach a subject to a division. The Timetable Generation Engine
          reads these assignments to know what needs scheduling.
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button variant="contained" color="primary" onClick={openCreate}>
            [ Add Assignment ]
          </Button>
        </Box>
        <DataTable
          columns={columns}
          rows={assignments}
          getRowId={(r) => r.assignment_id}
          onDelete={setDeleteTarget}
          isLoading={isLoading}
          emptyMessage="No assignments yet — add one so the timetable engine has something to schedule."
        />
      </ConsolePanel>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Assignment</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
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
              name="faculty_id"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Faculty" fullWidth error={!!errors.faculty_id} helperText={errors.faculty_id?.message}>
                  <MenuItem value={0} disabled>
                    Select a faculty member
                  </MenuItem>
                  {faculty.map((f) => (
                    <MenuItem key={f.faculty_id} value={f.faculty_id}>
                      {f.user.name}
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
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Delete assignment?"
        description={`This removes ${deleteTarget?.subject_name} from ${deleteTarget?.division_name}'s schedule. This cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget.assignment_id);
            setDeleteTarget(null);
          }
        }}
        isDeleting={deleteMutation.isPending}
      />
    </Box>
  );
}
