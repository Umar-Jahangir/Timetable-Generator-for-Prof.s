"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import { Controller, Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ConsolePanel from "../../../components/common/ConsolePanel";
import DataTable, { DataTableColumn } from "../../../components/admin/DataTable";
import ConfirmDeleteDialog from "../../../components/admin/ConfirmDeleteDialog";
import { palette } from "../../../theme/theme";
import {
  useCreateFaculty,
  useDeleteFaculty,
  useDepartments,
  useFacultyList,
  useUpdateFaculty,
} from "../../../hooks/useAdminApi";
import { facultySchema, FacultyFormValues } from "../../../schemas/admin";
import { Faculty } from "../../../types/admin";
import { getApiErrorMessage } from "../../../lib/errors";

const emptyForm: FacultyFormValues = {
  name: "",
  email: "",
  department_id: 0,
  designation: "",
  max_weekly_hours: 18,
};

export default function FacultyManagementPage() {
  const { data: faculty = [], isLoading } = useFacultyList();
  const { data: departments = [] } = useDepartments();
  const createMutation = useCreateFaculty();
  const updateMutation = useUpdateFaculty();
  const deleteMutation = useDeleteFaculty();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Faculty | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FacultyFormValues>({
    // See divisions/page.tsx for why this cast is needed (Zod v4
    // z.coerce + optional fields vs. react-hook-form's Resolver type).
    resolver: zodResolver(facultySchema) as Resolver<FacultyFormValues>,
    defaultValues: emptyForm,
  });

  const departmentName = (id: number) => departments.find((d) => d.department_id === id)?.name ?? `#${id}`;

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    reset(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: Faculty) => {
    setEditing(row);
    setFormError(null);
    reset({
      name: row.user.name,
      email: row.user.email,
      department_id: row.department_id,
      designation: row.designation ?? "",
      max_weekly_hours: row.max_weekly_hours,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: FacultyFormValues) => {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          faculty_id: editing.faculty_id,
          name: values.name,
          department_id: values.department_id,
          designation: values.designation || undefined,
          max_weekly_hours: values.max_weekly_hours,
        });
        setDialogOpen(false);
      } else {
        const result = await createMutation.mutateAsync({
          name: values.name,
          email: values.email,
          department_id: values.department_id,
          designation: values.designation || undefined,
          max_weekly_hours: values.max_weekly_hours,
        });
        setDialogOpen(false);
        setTempPassword(result.temporary_password);
      }
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const columns: DataTableColumn<Faculty>[] = [
    { key: "name", label: "Name", render: (r) => r.user.name },
    { key: "email", label: "Email", render: (r) => r.user.email },
    { key: "department", label: "Department", render: (r) => departmentName(r.department_id) },
    { key: "designation", label: "Designation", render: (r) => r.designation ?? "—" },
    { key: "hours", label: "Max Hrs/Week", render: (r) => r.max_weekly_hours },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span style={{ color: r.user.is_active ? palette.success : palette.danger }}>
          {r.user.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <ConsolePanel title="Faculty Management">
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button variant="contained" color="primary" onClick={openCreate}>
            [ Add Faculty ]
          </Button>
        </Box>
        <DataTable
          columns={columns}
          rows={faculty}
          getRowId={(r) => r.faculty_id}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          isLoading={isLoading}
          emptyMessage="No faculty members yet — add one to get started."
        />
      </ConsolePanel>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit Faculty" : "Add Faculty"}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Full name" fullWidth error={!!errors.name} helperText={errors.name?.message} />
              )}
            />
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email"
                  fullWidth
                  disabled={!!editing}
                  error={!!errors.email}
                  helperText={errors.email?.message || (editing ? "Email can't be changed after creation" : undefined)}
                />
              )}
            />
            <Controller
              name="department_id"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Department"
                  fullWidth
                  error={!!errors.department_id}
                  helperText={errors.department_id?.message}
                >
                  <MenuItem value={0} disabled>
                    Select a department
                  </MenuItem>
                  {departments.map((d) => (
                    <MenuItem key={d.department_id} value={d.department_id}>
                      {d.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="designation"
              control={control}
              render={({ field }) => <TextField {...field} label="Designation (optional)" fullWidth />}
            />
            <Controller
              name="max_weekly_hours"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Max weekly hours"
                  fullWidth
                  error={!!errors.max_weekly_hours}
                  helperText={errors.max_weekly_hours?.message}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending || updateMutation.isPending}>
              {editing ? "Save" : "Create"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* One-time temp password display */}
      <Dialog open={!!tempPassword} onClose={() => setTempPassword(null)}>
        <DialogTitle>Faculty account created</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="body2">
            Share this temporary password with the new faculty member — it will not be shown again.
          </Typography>
          <Box
            sx={{
              border: `1px solid ${palette.border}`,
              p: 1.5,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              color: palette.accent,
              fontSize: 16,
              textAlign: "center",
            }}
          >
            {tempPassword}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTempPassword(null)} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Delete faculty member?"
        description={`This permanently removes ${deleteTarget?.user.name}'s login and profile. This cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget.faculty_id);
            setDeleteTarget(null);
          }
        }}
        isDeleting={deleteMutation.isPending}
      />
    </Box>
  );
}
