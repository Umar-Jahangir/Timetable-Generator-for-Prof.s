"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Alert,
} from "@mui/material";
import { Controller, Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ConsolePanel from "../../../components/common/ConsolePanel";
import DataTable, { DataTableColumn } from "../../../components/admin/DataTable";
import ConfirmDeleteDialog from "../../../components/admin/ConfirmDeleteDialog";
import { palette } from "../../../theme/theme";
import {
  useConstraintList,
  useCreateConstraint,
  useDeleteConstraint,
  useUpdateConstraint,
} from "../../../hooks/useAdminApi";
import { constraintSchema, ConstraintFormValues } from "../../../schemas/admin";
import { SchedulingConstraint } from "../../../types/admin";
import { getApiErrorMessage } from "../../../lib/errors";

const CONSTRAINT_TYPES = [
  { value: "faculty_free_hour", label: "Faculty Free Hour" },
  { value: "max_continuous_hours", label: "Max Continuous Hours" },
  { value: "lab_continuous_hours", label: "Lab Continuous Hours" },
  { value: "online_year", label: "Online Year" },
  { value: "division_day_off", label: "Division Day Off" },
  { value: "division_blackout", label: "Division Blackout" },
  { value: "max_daily_break", label: "Max Daily Break (students)" },
  { value: "custom", label: "Custom" },
] as const;

const emptyForm: ConstraintFormValues = {
  name: "",
  constraint_type: "custom",
  config_json: '{\n  \n}',
  is_active: true,
};

/**
 * `config` is stored as flexible JSON on the backend (see
 * database/docs/er-diagram.md for why) so new constraint types don't
 * need schema migrations. The form edits it as raw JSON text
 * (`config_json` in the Zod schema), validated to be parseable before
 * submit, then parsed back into an object right before the API call.
 */
export default function ConstraintManagementPage() {
  const { data: constraints = [], isLoading } = useConstraintList();
  const createMutation = useCreateConstraint();
  const updateMutation = useUpdateConstraint();
  const deleteMutation = useDeleteConstraint();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SchedulingConstraint | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SchedulingConstraint | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConstraintFormValues>({
    // See divisions/page.tsx for why this cast is needed (Zod v4
    // z.coerce + optional fields vs. react-hook-form's Resolver type).
    resolver: zodResolver(constraintSchema) as Resolver<ConstraintFormValues>,
    defaultValues: emptyForm,
  });

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    reset(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: SchedulingConstraint) => {
    setEditing(row);
    setFormError(null);
    reset({
      name: row.name,
      constraint_type: row.constraint_type,
      config_json: JSON.stringify(row.config, null, 2),
      is_active: row.is_active,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: ConstraintFormValues) => {
    setFormError(null);
    const payload = {
      name: values.name,
      constraint_type: values.constraint_type,
      config: JSON.parse(values.config_json),
      is_active: values.is_active,
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ constraint_id: editing.constraint_id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const columns: DataTableColumn<SchedulingConstraint>[] = [
    { key: "name", label: "Name", render: (r) => r.name },
    {
      key: "type",
      label: "Type",
      render: (r) => CONSTRAINT_TYPES.find((t) => t.value === r.constraint_type)?.label ?? r.constraint_type,
    },
    { key: "config", label: "Config", render: (r) => <code style={{ fontSize: 12 }}>{JSON.stringify(r.config)}</code> },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span style={{ color: r.is_active ? palette.success : palette.textDim }}>
          {r.is_active ? "Active" : "Disabled"}
        </span>
      ),
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <ConsolePanel title="Constraint Configuration">
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button variant="contained" color="primary" onClick={openCreate}>
            [ Add Constraint ]
          </Button>
        </Box>
        <DataTable
          columns={columns}
          rows={constraints}
          getRowId={(r) => r.constraint_id}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          isLoading={isLoading}
          emptyMessage="No constraints configured yet."
        />
      </ConsolePanel>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit Constraint" : "Add Constraint"}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Rule name (e.g. Friday faculty free hour)"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="constraint_type"
              control={control}
              render={({ field }) => (
                <TextField {...field} select label="Constraint type" fullWidth>
                  {CONSTRAINT_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="config_json"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Config (JSON)"
                  fullWidth
                  multiline
                  minRows={4}
                  error={!!errors.config_json}
                  helperText={errors.config_json?.message || 'e.g. {"day":"Friday","start":"13:00","end":"14:00"}'}
                  sx={{ "& textarea": { fontFamily: "var(--font-jetbrains-mono), monospace", fontSize: 13 } }}
                />
              )}
            />
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Active"
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

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Delete constraint?"
        description={`This permanently removes "${deleteTarget?.name}". This cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget.constraint_id);
            setDeleteTarget(null);
          }
        }}
        isDeleting={deleteMutation.isPending}
      />
    </Box>
  );
}
