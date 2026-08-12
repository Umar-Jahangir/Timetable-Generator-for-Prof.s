# SmartSched AI — Database

MySQL 8.0, InnoDB, `utf8mb4`. 16 tables, normalized to 3NF, 27 foreign
key relationships. Full design rationale is in
[`docs/er-diagram.md`](./docs/er-diagram.md).

## Files

```
database/
├── schema/
│   └── 001_create_tables.sql   # Full DDL — creates the database + all 16 tables
├── seed/
│   ├── seed_data.sql           # Sample data matching the product wireframes
│   └── 002_assignments.sql     # Subject-Faculty-Division assignments (Phase 6 dependency)
└── docs/
    └── er-diagram.md           # Textual ER diagram + design notes
```

## Setup

```bash
mysql -u root -p < database/schema/001_create_tables.sql
mysql -u root -p < database/seed/seed_data.sql       # optional, for local dev/demo
mysql -u root -p < database/seed/002_assignments.sql # optional, needed if you want Phase 6's timetable generator to have something to schedule out of the box
```

> **Note on `time_slots`:** `seed_data.sql` only populates Monday (a
> deliberate demonstration pattern in Phase 2). Phase 6's backend
> (`app/scheduling/time_slot_seeder.py`) automatically and idempotently
> fills in Tuesday–Saturday the first time `POST /admin/timetable/generate`
> runs — no separate script needed for that part.

Both scripts have been executed end-to-end against a real MySQL 8.0.46
instance as part of building this project — not just written and assumed
to work. `001_create_tables.sql` creates all 16 tables and 27 foreign
keys with zero errors; `seed_data.sql` loads on top of it cleanly and
the assignment data verifies correctly, e.g.:

```sql
SELECT u.name AS faculty_name, s.name AS subject, s.code, d.name AS division, ay.name AS year
FROM subject_faculty_assignment sfa
JOIN faculty f ON f.faculty_id = sfa.faculty_id
JOIN users u ON u.user_id = f.user_id
JOIN subjects s ON s.subject_id = sfa.subject_id
JOIN divisions d ON d.division_id = sfa.division_id
JOIN academic_years ay ON ay.academic_year_id = d.academic_year_id;
```

```
faculty_name      | subject                      | code  | division | year
Prof. John Smith  | Database Management Systems  | CS301 | A        | TY
Prof. John Smith  | Artificial Intelligence      | CS302 | C        | SY
```

## Tables at a glance

| Table | Rows seeded | Purpose |
|---|---|---|
| `departments` | 2 | Org units |
| `academic_years` | 4 | FY / SY / TY / Final Year |
| `divisions` | 4 | TY-A, TY-B, SY-C, Final Year-A |
| `batches` | 3 | Lab sub-groups for TY-A |
| `users` | 3 | 1 admin + 2 faculty logins |
| `faculty` | 2 | Faculty profile data |
| `subjects` | 2 | DBMS, AI |
| `subject_faculty_assignment` | 2 | Who teaches what to whom |
| `rooms` | 3 | C-304, B-205, Lab-3 |
| `time_slots` | 7 | Monday's grid (pattern repeats for Tue–Sat) |
| `timetable_entries` | 0 | Populated by the optimization engine in Phase 6 |
| `scheduling_constraints` | 0 | Populated via Admin UI in Phase 4 |
| `faculty_leaves` | 0 | Populated as faculty report absences |
| `lecture_requests` | 0 | Populated by the Smart Assistant in Phase 7 |
| `notifications` | 2 | Sample notification feed |
| `assistant_query_logs` | 0 | Populated by the Smart Assistant in Phase 7 |

## Next

Phase 3 (Authentication) builds the FastAPI JWT layer on top of the
`users` table — `role` (`admin` \| `faculty`) drives route-level access
control, and `password_hash` will hold real bcrypt hashes instead of
the placeholder values in the seed script.
