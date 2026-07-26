# SmartSched AI — Entity Relationship Diagram (Textual)

16 tables, InnoDB, `utf8mb4`. Normalized to 3NF: every non-key column
depends only on its table's primary key, no repeating groups, no
transitive dependencies (e.g. a division's academic year lives on
`divisions`, not duplicated onto `subjects` or `timetable_entries`).

## Entities & Relationships

```
departments (1) ───< (M) divisions
departments (1) ───< (M) subjects
departments (1) ───< (M) faculty

academic_years (1) ───< (M) divisions
academic_years (1) ───< (M) subjects

divisions (1) ───< (M) batches
divisions (1) ───< (M) subject_faculty_assignment
divisions (1) ───< (M) timetable_entries
divisions (1) ───< (M) lecture_requests

batches (1) ───< (M) subject_faculty_assignment   [nullable FK]
batches (1) ───< (M) timetable_entries            [nullable FK]

users (1) ──── (1) faculty                         [1-1, faculty extends users]
users (1) ───< (M) notifications

faculty (1) ───< (M) subject_faculty_assignment
faculty (1) ───< (M) timetable_entries
faculty (1) ───< (M) faculty_leaves
faculty (1) ───< (M) lecture_requests
faculty (1) ───< (M) assistant_query_logs

subjects (1) ───< (M) subject_faculty_assignment
subjects (1) ───< (M) timetable_entries
subjects (1) ───< (M) lecture_requests

rooms (1) ───< (M) timetable_entries
rooms (1) ───< (M) lecture_requests   [recommended_room_id]

time_slots (1) ───< (M) timetable_entries
time_slots (1) ───< (M) lecture_requests   [recommended_time_slot_id]

timetable_entries (1) ───< (M) lecture_requests   [original_entry_id, for replacements]

lecture_requests (1) ───< (M) assistant_query_logs   [related_request_id]
```

## Entity Notes

| Table | Purpose |
|---|---|
| `departments` | Top-level org unit (Computer Engineering, IT, ...) |
| `academic_years` | FY / SY / TY / Final Year reference list |
| `divisions` | A class group within a year + department (e.g. TY-A) |
| `batches` | Lab sub-group within a division (e.g. TY-A → B1/B2/B3) |
| `users` | Single login table for both roles — `role` discriminates Admin vs Faculty |
| `faculty` | 1-1 extension of `users` holding faculty-only fields (designation, weekly hour cap) |
| `subjects` | Subject catalog, including how many lecture/tutorial/lab hours/week it needs |
| `subject_faculty_assignment` | Who teaches what, to which division/batch, for which term |
| `rooms` | Classrooms and laboratories in one table, discriminated by `room_type` |
| `time_slots` | The master weekly grid (day × period) every entry is placed into |
| `timetable_entries` | The generated/live timetable — one row per (slot, division/batch) |
| `scheduling_constraints` | Admin-defined rules (free hour, max continuous hours, online year, ...) stored as JSON config so new rule types don't require schema changes |
| `faculty_leaves` | Planned absences — feeds the "I missed Monday's lecture" replacement flow |
| `lecture_requests` | Extra/replacement lecture requests created by the Smart Assistant, pending Admin/Faculty approval |
| `notifications` | In-app notification feed per user |
| `assistant_query_logs` | Every query sent to the rule-based assistant, for analytics (e.g. "conflicts prevented") |

## Why a unified `rooms` table instead of separate `classrooms` / `laboratories` tables

Both entities share every column (name, building, capacity, active flag).
Splitting them would duplicate the table definition and force the
scheduling engine to run two near-identical queries everywhere it looks
for a free room. A single `rooms` table with `room_type ENUM('classroom','laboratory')`
keeps the schema in 3NF, and the Admin UI still presents "Classroom
Management" and "Laboratory Management" as separate screens by simply
filtering on `room_type`.

## Why `timetable_entries` doesn't use a hard UNIQUE constraint for clash prevention

MySQL can't express "unique only where `is_active = TRUE`" without
generated/virtual columns, and soft-deleted rows (`is_active = FALSE`)
must be kept for audit history when a lecture is rescheduled. Instead,
`idx_entry_faculty_slot`, `idx_entry_room_slot`, and
`idx_entry_division_slot` make the clash-check queries fast, and the
FastAPI service layer (Phase 3) enforces the actual uniqueness inside a
transaction before every insert.

## Primary Key / Foreign Key Summary

- Every table has a single-column surrogate primary key (`<entity>_id`, `INT UNSIGNED AUTO_INCREMENT`) — simpler joins and stable references even if business fields (like a subject code) change.
- All foreign keys use `ON UPDATE CASCADE`. `ON DELETE` behavior varies intentionally:
  - `RESTRICT` on lookup tables that historical data depends on (`subjects`, `rooms`, `time_slots`, `faculty`, `departments`, `academic_years`) — you can't delete a subject that's still referenced by a timetable entry.
  - `CASCADE` on ownership relationships (`faculty` → `users`, `batches` → `divisions`, `subject_faculty_assignment` → its parents) — deleting the parent legitimately removes the dependent rows.
  - `SET NULL` on optional back-references (`lecture_requests.original_entry_id`, `recommended_time_slot_id`, `recommended_room_id`) — the request record survives even if the referenced slot/room/entry is later removed.
