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
  Switch,
  TextField,
  Alert,
} from "@mui/material";
import { Controller, Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ConsolePanel from "../common/ConsolePanel";
import DataTable, { DataTableColumn } from "./DataTable";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import { palette } from "../../theme/theme";
import { useCreateRoom, useDeleteRoom, useRoomList, useUpdateRoom } from "../../hooks/useAdminApi";
import { roomSchema, RoomFormValues } from "../../schemas/admin";
import { Room, RoomType } from "../../types/admin";
import { getApiErrorMessage } from "../../lib/errors";

interface RoomManagementViewProps {
  roomType: RoomType;
  title: string;
}

/**
 * Backs both /admin/classrooms and /admin/laboratories — same
 * underlying `rooms` table and API (GET /admin/rooms?room_type=...),
 * just a fixed `roomType` and a different heading per page. See
 * backend/app/api/v1/routers/admin_rooms.py for why this is one table.
 */
export default function RoomManagementView({ roomType, title }: RoomManagementViewProps) {
  const { data: rooms = [], isLoading } = useRoomList(roomType);
  const createMutation = useCreateRoom(roomType);
  const updateMutation = useUpdateRoom(roomType);
  const deleteMutation = useDeleteRoom(roomType);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const emptyForm: RoomFormValues = { name: "", building: "", capacity: 30, room_type: roomType };

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoomFormValues>({
    // See divisions/page.tsx for why this cast is needed (Zod v4
    // z.coerce + optional fields vs. react-hook-form's Resolver type).
    resolver: zodResolver(roomSchema) as Resolver<RoomFormValues>,
    defaultValues: emptyForm,
  });

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    reset(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row: Room) => {
    setEditing(row);
    setFormError(null);
    reset({ name: row.name, building: row.building ?? "", capacity: row.capacity, room_type: row.room_type });
    setDialogOpen(true);
  };

  const onSubmit = async (values: RoomFormValues) => {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ room_id: editing.room_id, ...values });
      } else {
        await createMutation.mutateAsync(values);
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      setFormError(getApiErrorMessage(err));
    }
  };

  const columns: DataTableColumn<Room>[] = [
    { key: "name", label: "Name", render: (r) => r.name },
    { key: "building", label: "Building", render: (r) => r.building ?? "—" },
    { key: "capacity", label: "Capacity", render: (r) => r.capacity },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <span style={{ color: r.is_active ? palette.success : palette.danger }}>
          {r.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <ConsolePanel title={title}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <Button variant="contained" color="primary" onClick={openCreate}>
            [ Add {roomType === "classroom" ? "Classroom" : "Laboratory"} ]
          </Button>
        </Box>
        <DataTable
          columns={columns}
          rows={rooms}
          getRowId={(r) => r.room_id}
          onEdit={openEdit}
          onDelete={setDeleteTarget}
          isLoading={isLoading}
          emptyMessage={`No ${roomType === "classroom" ? "classrooms" : "laboratories"} yet — add one to get started.`}
        />
      </ConsolePanel>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Edit" : "Add"} {roomType === "classroom" ? "Classroom" : "Laboratory"}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Name (e.g. C-304)" fullWidth error={!!errors.name} helperText={errors.name?.message} />
              )}
            />
            <Controller
              name="building"
              control={control}
              render={({ field }) => <TextField {...field} label="Building (optional)" fullWidth />}
            />
            <Controller
              name="capacity"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Capacity"
                  fullWidth
                  error={!!errors.capacity}
                  helperText={errors.capacity?.message}
                />
              )}
            />
            {editing && (
              <Controller
                name="room_type"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value === "laboratory"}
                        onChange={(e) => field.onChange(e.target.checked ? "laboratory" : "classroom")}
                      />
                    }
                    label={`Type: ${editing ? "" : ""}${field.value === "laboratory" ? "Laboratory" : "Classroom"}`}
                  />
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
        title={`Delete ${roomType}?`}
        description={`This permanently removes "${deleteTarget?.name}". This cannot be undone.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteMutation.mutateAsync(deleteTarget.room_id);
            setDeleteTarget(null);
          }
        }}
        isDeleting={deleteMutation.isPending}
      />
    </Box>
  );
}
