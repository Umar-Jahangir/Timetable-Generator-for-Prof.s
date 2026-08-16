"use client";

import React, { useState } from "react";
import { Box, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { palette } from "../../theme/theme";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => number | string;
  onEdit?: (row: T) => void;
  onDelete: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  /** When set, rows can be dragged to reorder. Disabled while searching. */
  onReorder?: (orderedRows: T[]) => void;
  reorderDisabled?: boolean;
}

/**
 * Shared table shell for every Admin Management screen (Faculty,
 * Subjects, Classrooms, Laboratories, Divisions, Constraints). Each
 * page supplies its own column definitions and edit/delete handlers —
 * this component only owns rendering, not data-fetching or forms.
 */
export default function DataTable<T>({
  columns,
  rows,
  getRowId,
  onEdit,
  onDelete,
  isLoading,
  emptyMessage = "No records yet.",
  onReorder,
  reorderDisabled = false,
}: DataTableProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const canReorder = Boolean(onReorder) && !reorderDisabled;

  if (isLoading) {
    return (
      <Typography variant="body2" sx={{ color: palette.textDim, py: 2 }}>
        Loading...
      </Typography>
    );
  }

  if (rows.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: palette.textDim, py: 2 }}>
        {emptyMessage}
      </Typography>
    );
  }

  const moveRow = (from: number, to: number) => {
    if (!onReorder || from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {canReorder && (
              <TableCell sx={{ color: palette.border, borderColor: palette.borderDim, width: 40 }} />
            )}
            {columns.map((col) => (
              <TableCell
                key={col.key}
                sx={{ color: palette.border, borderColor: palette.borderDim, fontFamily: "var(--font-jetbrains-mono), monospace" }}
              >
                {col.label}
              </TableCell>
            ))}
            <TableCell sx={{ color: palette.border, borderColor: palette.borderDim }} align="right">
              Actions
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow
              key={getRowId(row)}
              draggable={canReorder}
              onDragStart={() => setDragIndex(index)}
              onDragOver={(event) => {
                if (!canReorder) return;
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragIndex === null) return;
                moveRow(dragIndex, index);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              sx={{
                opacity: dragIndex === index ? 0.55 : 1,
                cursor: canReorder ? "grab" : "default",
                backgroundColor: dragIndex === index ? palette.surfaceRaised : "transparent",
              }}
            >
              {canReorder && (
                <TableCell sx={{ color: palette.textDim, borderColor: palette.divider, width: 40 }}>
                  <DragIndicatorIcon fontSize="small" />
                </TableCell>
              )}
              {columns.map((col) => (
                <TableCell key={col.key} sx={{ color: palette.text, borderColor: palette.divider }}>
                  {col.render(row)}
                </TableCell>
              ))}
              <TableCell sx={{ borderColor: palette.divider }} align="right">
                {onEdit && (
                  <IconButton size="small" onClick={() => onEdit(row)} sx={{ color: palette.textDim }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton size="small" onClick={() => onDelete(row)} sx={{ color: palette.textDim }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
