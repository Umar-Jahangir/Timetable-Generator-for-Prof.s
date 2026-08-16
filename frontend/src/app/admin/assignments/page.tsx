"use client";

import React, { useMemo, useState } from "react";
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
import { Controller, Resolver, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ConsolePanel from "../../../components/common/ConsolePanel";
import DataTable, { DataTableColumn } from "../../../components/admin/DataTable";
import ConfirmDeleteDialog from "../../../components/admin/ConfirmDeleteDialog";
import { palette } from "../../../theme/theme";
import {
  useAssignmentList,
  useCreateAssignment,
  useDeleteAssignment,
  useReorderAssignments,
  useUpdateAssignment,
  useAcademicYears,
  useDivisionBatches,
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
  const updateMutation = useUpdateAssignment();
  const reorderMutation = useReorderAssignments();
  const deleteMutation = useDeleteAssignment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Assignment | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [reorderError, setReorderError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema) as Resolver<AssignmentFormValues>,
    defaultValues: { subject_id: 0, faculty_id: 0, delivery_type: "theory", batch_id: null },
  });
  const selectedDivisionId = useWatch({ control, name: "division_id" });
  const selectedDeliveryType = useWatch({ control, name: "delivery_type" });
  const { data: batches = [] } = useDivisionBatches(selectedDivisionId ?? 0);
  const { data: academicYears = [] } = useAcademicYears();
  const divisionLabel = (divisionId: number) => {
    const division = divisions.find((d) => d.division_id === divisionId);
    const year = academicYears.find((y) => y.academic_year_id === division?.academic_year_id);
    return division ? `${year?.name ?? "Year"}-${division.name}` : `#${divisionId}`;
  };

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return assignments;
    return assignments.filter((row) => {
      const haystack = [
        row.subject_name,
        row.faculty_name,
        row.division_label,
        row.division_name,
        row.delivery_type,
        row.batch_name,
        row.academic_term,
        String(row.subject_id),
        String(row.faculty_id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [assignments, search]);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    reset({ subject_id: 0, faculty_id: 0, division_id: 0, delivery_type: "theory", batch_id: null });
    setDialogOpen(true);
  };

  const openEdit = (assignment: Assignment) => {
    setEditing(assignment);
    setFormError(null);
    reset({
      subject_id: assignment.subject_id,
      faculty_id: assignment.faculty_id,
      division_id: assignment.division_id,
      delivery_type: assignment.delivery_type,
      batch_id: assignment.batch_id,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: AssignmentFormValues) => {
    setFormError(null);
    const payload = {
      ...values,
      batch_id: values.delivery_type === "theory" ? null : values.batch_id ?? null,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ assignment_id: editing.assignment_id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const onReorder = async (orderedRows: Assignment[]) => {
    setReorderError(null);
    try {
      await reorderMutation.mutateAsync(orderedRows.map((row) => row.assignment_id));
    } catch (err: unknown) {
      setReorderError(getApiErrorMessage(err));
    }
  };

  const columns: DataTableColumn<Assignment>[] = [
    { key: "subject", label: "Subject", render: (r) => r.subject_name ?? `#${r.subject_id}` },
    { key: "faculty", label: "Faculty", render: (r) => r.faculty_name ?? `#${r.faculty_id}` },
    { key: "division", label: "Division", render: (r) => r.division_label ?? r.division_name ?? `#${r.division_id}` },
    { key: "type", label: "Type", render: (r) => r.delivery_type },
    { key: "batch", label: "Batch", render: (r) => r.batch_name ?? "All batches" },
    { key: "term", label: "Term", render: (r) => r.academic_term },
  ];

  const isSearching = search.trim().length > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <ConsolePanel title="Subject-Faculty Assignments">
        <Typography variant="body2" sx={{ color: palette.textDim, mb: 2 }}>
          Assign a faculty member to teach a subject to a division. Drag rows to organize them, or
          search by subject, faculty, division, type, or batch.
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, mb: 2, flexWrap: "wrap" }}>
          <TextField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search assignments..."
            size="small"
            sx={{ minWidth: 260, flex: 1, maxWidth: 420 }}
          />
          <Button variant="contained" color="primary" onClick={openCreate}>
            [ Add Assignment ]
          </Button>
        </Box>
        {isSearching && (
          <Typography variant="caption" sx={{ color: palette.textDim, display: "block", mb: 1 }}>
            Showing {filteredAssignments.length} of {assignments.length}. Clear search to drag-reorder.
          </Typography>
        )}
        {reorderError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {reorderError}
          </Alert>
        )}
        <DataTable
          columns={columns}
          rows={filteredAssignments}
          getRowId={(r) => r.assignment_id}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          onReorder={onReorder}
          reorderDisabled={isSearching || reorderMutation.isPending}
          isLoading={isLoading}
          emptyMessage={
            isSearching
              ? "No assignments match your search."
              : "No assignments yet — add one so the timetable engine has something to schedule."
          }
        />
      </ConsolePanel>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit Assignment" : "Add Assignment"}</DialogTitle>
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
                <TextField
                  {...field}
                  select
                  label="Division"
                  fullWidth
                  error={!!errors.division_id}
                  helperText={errors.division_id?.message}
                  onChange={(event) => {
                    field.onChange(event);
                    setValue("batch_id", null);
                  }}
                >
                  <MenuItem value={0} disabled>
                    Select a division
                  </MenuItem>
                  {divisions.map((d) => (
                    <MenuItem key={d.division_id} value={d.division_id}>
                      {divisionLabel(d.division_id)}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="delivery_type"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Session type"
                  fullWidth
                  error={!!errors.delivery_type}
                  helperText={errors.delivery_type?.message}
                  onChange={(event) => {
                    field.onChange(event);
                    if (event.target.value === "theory") setValue("batch_id", null);
                  }}
                >
                  <MenuItem value="theory">Theory</MenuItem>
                  <MenuItem value="lab">Laboratory</MenuItem>
                  <MenuItem value="tutorial">Tutorial</MenuItem>
                </TextField>
              )}
            />
            {selectedDeliveryType !== "theory" && (
              <Controller
                name="batch_id"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Batch"
                    fullWidth
                    error={!!errors.batch_id}
                    helperText={errors.batch_id?.message ?? "Labs and tutorials are assigned per batch."}
                  >
                    <MenuItem value={0} disabled>
                      Select a batch
                    </MenuItem>
                    {batches.map((batch) => (
                      <MenuItem key={batch.batch_id} value={batch.batch_id}>
                        {batch.name}{batch.strength ? ` (${batch.strength} students)` : ""}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? "Save" : "Create"}
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
