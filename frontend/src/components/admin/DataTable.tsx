"use client";

import React from "react";
import { Box, IconButton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
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
}: DataTableProps<T>) {
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

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
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
          {rows.map((row) => (
            <TableRow key={getRowId(row)}>
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
