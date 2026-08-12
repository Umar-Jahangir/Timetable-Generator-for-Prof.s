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
import {
  useAcademicYears,
  useCreateDivision,
  useDeleteDivision,
  useDepartments,
  useDivisionList,
  useUpdateDivision,
} from "../../../hooks/useAdminApi";
import { divisionSchema, DivisionFormValues } from "../../../schemas/admin";
import { Division } from "../../../types/admin";
import { getApiErrorMessage } from "../../../lib/errors";

const emptyForm: DivisionFormValues = {
  academic_year_id: 0,
  department_id: 0,
  name: "",
  strength: undefined,
  is_online: false,
};

export default function DivisionManagementPage() {
  const { data: divisions = [], isLoading } = useDivisionList();
  const { data: departments = [] } = useDepartments();
  const { data: academicYears = [] } = useAcademicYears();
  const createMutation = useCreateDivision();
  const updateMutation = useUpdateDivision();
  const deleteMutation = useDeleteDivision();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Division | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Division | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DivisionFormValues>({
    // The explicit cast works around a known typing friction between Zod
    // v4's `z.coerce.number().optional()` fields (whose *input* type is
    // `unknown`, by design — coercion has to accept anything) and
    // react-hook-form's Resolver type, which expects the resolver's
    // input type to already match the form's output type. Runtime
    // behavior is unaffected; this only satisfies the type checker.
    resolver: zodResolver(divisionSchema) as Resolver<DivisionFormValues>,
    defaultValues: emptyForm,
  });

  const yearName = (id: number) => academicYears.find((y) => y.academic_year_id === id)?.name ?? `#${id}`;
  const deptName = (id: number) => departments.find((d) => d.department_id === id)?.name ?? `#${id}`;

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    reset(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: Division) => {
    setEditing(row);
    setFormError(null);
    reset({
      academic_year_id: row.academic_year_id,
      department_id: row.department_id,
      name: row.name,
      strength: row.strength ?? undefined,
      is_online: row.is_online,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: DivisionFormValues) => {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ division_id: editing.division_id, ...values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const columns: DataTableColumn<Division>[] = [
    { key: "name", label: "Division", render: (r) => `${yearName(r.academic_year_id)}-${r.name}` },
    { key: "dept", label: "Department", render: (r) => deptName(r.department_id) },
    { key: "strength", label: "Strength", render: (r) => r.strength ?? "—" },
    { key: "mode", label: "Mode", render: (r) => (r.is_online ? "Online" : "Offline") },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <ConsolePanel title="Division Management">
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button variant="contained" color="primary" onClick={openCreate}>
            [ Add Division ]
          </Button>
        </Box>
        <DataTable
          columns={columns}
          rows={divisions}
          getRowId={(r) => r.division_id}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          isLoading={isLoading}
          emptyMessage="No divisions yet — add one to get started."
        />
      </ConsolePanel>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit Division" : "Add Division"}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Box sx={{ display: "flex", gap: 2 }}>
              <Controller
                name="academic_year_id"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Academic Year" fullWidth error={!!errors.academic_year_id}>
                    <MenuItem value={0} disabled>
                      Select year
                    </MenuItem>
                    {academicYears.map((y) => (
                      <MenuItem key={y.academic_year_id} value={y.academic_year_id}>
                        {y.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="department_id"
                control={control}
                render={({ field }) => (
                  <TextField {...field} select label="Department" fullWidth error={!!errors.department_id}>
                    <MenuItem value={0} disabled>
                      Select department
                    </MenuItem>
                    {departments.map((d) => (
                      <MenuItem key={d.department_id} value={d.department_id}>
                        {d.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Box>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Division name (e.g. A)" fullWidth error={!!errors.name} helperText={errors.name?.message} />
              )}
            />
            <Controller
              name="strength"
              control={control}
              render={({ field }) => (
                <TextField {...field} type="number" label="Strength (optional)" fullWidth />
              )}
            />
            <Controller
              name="is_online"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Online mode (e.g. Final Year classes)"
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
        title="Delete division?"
        description={`This permanently removes "${deleteTarget?.name}". This cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget.division_id);
            setDeleteTarget(null);
          }
        }}
        isDeleting={deleteMutation.isPending}
      />
    </Box>
  );
}
