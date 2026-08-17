import * as XLSX from "xlsx";
import { DayOfWeek, TimetableSlot } from "../types";

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const HOURS: { label: string; startHour: number }[] = [
  { label: "8-9", startHour: 8 },
  { label: "9-10", startHour: 9 },
  { label: "10-11", startHour: 10 },
  { label: "11-12", startHour: 11 },
  { label: "12-1", startHour: 12 },
  { label: "1-2", startHour: 13 },
  { label: "2-3", startHour: 14 },
  { label: "3-4", startHour: 15 },
  { label: "4-5", startHour: 16 },
  { label: "5-6", startHour: 17 },
];

function typeLabel(slot: TimetableSlot): string | null {
  if (slot.isExtra) return "Extra";
  switch (slot.type) {
    case "lab":
      return "Lab";
    case "tutorial":
      return "Tutorial";
    case "lecture":
      return "Theory";
    case "break":
      return "Break";
    case "free":
      return "Free";
    default:
      return null;
  }
}

function formatSlotCell(slot: TimetableSlot, showFaculty: boolean): string {
  const lines: string[] = [];
  if (slot.subjectCode && slot.subject) {
    lines.push(`${slot.subjectCode} — ${slot.subject}`);
  } else if (slot.subjectCode) {
    lines.push(slot.subjectCode);
  } else if (slot.subject) {
    lines.push(slot.subject);
  } else {
    lines.push(typeLabel(slot) ?? "Class");
  }
  const kind = typeLabel(slot);
  if (kind) lines.push(kind);
  if (slot.division) lines.push(slot.division);
  if (showFaculty && slot.faculty) lines.push(slot.faculty);
  if (slot.room) lines.push(slot.room);
  return lines.join("\n");
}

function buildGridSheet(slots: TimetableSlot[], showFaculty: boolean): XLSX.WorkSheet {
  const rows: string[][] = [["Time", ...DAYS]];
  for (const hour of HOURS) {
    const row: string[] = [hour.label];
    for (const day of DAYS) {
      const cellSlots = slots.filter(
        (s) => s.day === day && parseInt(s.startTime, 10) === hour.startHour,
      );
      row.push(cellSlots.map((s) => formatSlotCell(s, showFaculty)).join("\n\n") || "—");
    }
    rows.push(row);
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

function buildListSheet(slots: TimetableSlot[], showFaculty: boolean): XLSX.WorkSheet {
  const header = ["Day", "Start", "End", "Subject Code", "Subject", "Type", "Division", "Room"];
  if (showFaculty) header.push("Faculty");
  const rows: (string | null)[][] = [header];
  const ordered = [...slots].sort(
    (a, b) =>
      DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
      a.startTime.localeCompare(b.startTime) ||
      a.id.localeCompare(b.id),
  );
  for (const s of ordered) {
    const row: (string | null)[] = [
      s.day,
      s.startTime,
      s.endTime,
      s.subjectCode ?? null,
      s.subject,
      typeLabel(s) ?? s.type,
      s.division ?? null,
      s.room ?? null,
    ];
    if (showFaculty) row.push(s.faculty ?? null);
    rows.push(row);
  }
  return XLSX.utils.aoa_to_sheet(rows);
}

/** Download the current timetable view as a .xlsx workbook (Grid + List sheets). */
export function exportTimetableToExcel(
  slots: TimetableSlot[],
  filename: string,
  options?: { showFaculty?: boolean },
): void {
  const showFaculty = options?.showFaculty ?? false;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildGridSheet(slots, showFaculty), "Timetable Grid");
  XLSX.utils.book_append_sheet(workbook, buildListSheet(slots, showFaculty), "List");
  const safeName = filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, safeName);
}
