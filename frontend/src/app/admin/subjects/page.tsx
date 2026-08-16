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
  useCreateSubject,
  useDeleteSubject,
  useDepartments,
  useSubjectList,
  useUpdateSubject,
} from "../../../hooks/useAdminApi";
import { subjectSchema, SubjectFormValues } from "../../../schemas/admin";
import { Subject } from "../../../types/admin";
import { getApiErrorMessage } from "../../../lib/errors";

const emptyForm: SubjectFormValues = {
  name: "",
  code: "",
  academic_year_id: 0,
  department_id: 0,
  credits: 0,
  lectures_per_week: 0,
  tutorials_per_week: 0,
  lab_hours_per_week: 0,
  is_industrial_elective: false,
  is_online: false,
};

export default function SubjectManagementPage() {
  const { data: subjects = [], isLoading } = useSubjectList();
  const { data: departments = [] } = useDepartments();
  const { data: academicYears = [] } = useAcademicYears();
  const createMutation = useCreateSubject();
  const updateMutation = useUpdateSubject();
  const deleteMutation = useDeleteSubject();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubjectFormValues>({
    // See divisions/page.tsx for why this cast is needed (Zod v4
    // z.coerce + optional fields vs. react-hook-form's Resolver type).
    resolver: zodResolver(subjectSchema) as Resolver<SubjectFormValues>,
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

  const openEdit = (row: Subject) => {
    setEditing(row);
    setFormError(null);
    reset({
      name: row.name,
      code: row.code,
      academic_year_id: row.academic_year_id,
      department_id: row.department_id,
      credits: row.credits,
      lectures_per_week: row.lectures_per_week,
      tutorials_per_week: row.tutorials_per_week,
      lab_hours_per_week: row.lab_hours_per_week,
      is_industrial_elective: row.is_industrial_elective,
      is_online: row.is_online,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values: SubjectFormValues) => {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ subject_id: editing.subject_id, ...values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const columns: DataTableColumn<Subject>[] = [
    { key: "code", label: "Code", render: (r) => r.code },
    { key: "name", label: "Name", render: (r) => r.name },
    { key: "year", label: "Year", render: (r) => yearName(r.academic_year_id) },
    { key: "dept", label: "Department", render: (r) => deptName(r.department_id) },
    { key: "credits", label: "Credits", render: (r) => r.credits },
    {
      key: "hours",
      label: "L / T / Lab",
      render: (r) => `${r.lectures_per_week} / ${r.tutorials_per_week} / ${r.lab_hours_per_week}`,
    },
    { key: "industrial", label: "Category", render: (r) => (r.is_industrial_elective ? "Industrial Elective" : "Departmental") },
    { key: "mode", label: "Mode", render: (r) => (r.is_online ? "Online" : "Offline") },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <ConsolePanel title="Subject Management">
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button variant="contained" color="primary" onClick={openCreate}>
            [ Add Subject ]
          </Button>
        </Box>
        <DataTable
          columns={columns}
          rows={subjects}
          getRowId={(r) => r.subject_id}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          isLoading={isLoading}
          emptyMessage="No subjects yet — add one to get started."
        />
      </ConsolePanel>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit Subject" : "Add Subject"}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Subject name" fullWidth error={!!errors.name} helperText={errors.name?.message} />
              )}
            />
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Code (e.g. CS301)" fullWidth error={!!errors.code} helperText={errors.code?.message} />
              )}
            />
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
            <Box sx={{ display: "flex", gap: 2 }}>
              <Controller
                name="credits"
                control={control}
                render={({ field }) => <TextField {...field} type="number" label="Credits" fullWidth />}
              />
              <Controller
                name="lectures_per_week"
                control={control}
                render={({ field }) => <TextField {...field} type="number" label="Lectures/wk" fullWidth />}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Controller
                name="tutorials_per_week"
                control={control}
                render={({ field }) => <TextField {...field} type="number" label="Tutorials/wk" fullWidth />}
              />
              <Controller
                name="lab_hours_per_week"
                control={control}
                render={({ field }) => <TextField {...field} type="number" label="Lab hrs/wk" fullWidth />}
              />
            </Box>
            <Controller
              name="is_industrial_elective"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Industrial elective (TY only; scheduled 08:00–11:00)"
                />
              )}
            />
            <Controller
              name="is_online"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Online mode"
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
        title="Delete subject?"
        description={`This permanently removes "${deleteTarget?.name}". This cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget.subject_id);
            setDeleteTarget(null);
          }
        }}
        isDeleting={deleteMutation.isPending}
      />
    </Box>
  );
}
