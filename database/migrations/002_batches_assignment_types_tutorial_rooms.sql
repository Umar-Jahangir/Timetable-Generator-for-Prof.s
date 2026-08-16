-- SmartSched AI migration 002
-- Run once against an existing database:
--   mysql -u <user> -p smartsched_ai < database/migrations/002_batches_assignment_types_tutorial_rooms.sql

USE smartsched_ai;

-- Shift the old year orders only where they still use the original values.
UPDATE academic_years SET year_order = 5 WHERE name = 'Final Year' AND year_order = 4;
UPDATE academic_years SET year_order = 4 WHERE name = 'TY' AND year_order = 3;

-- SEDA students join directly in Semester 3, but remain separately
-- identifiable in the admin UI through divisions such as SEDA-A.
INSERT IGNORE INTO academic_years (name, year_order) VALUES ('SEDA', 3);

ALTER TABLE rooms
  MODIFY room_type ENUM('classroom', 'laboratory', 'tutorial') NOT NULL;

ALTER TABLE subject_faculty_assignment
  ADD COLUMN delivery_type ENUM('theory', 'lab', 'tutorial') NOT NULL DEFAULT 'theory' AFTER batch_id;

ALTER TABLE subject_faculty_assignment
  DROP INDEX uq_sfa,
  ADD UNIQUE KEY uq_sfa (subject_id, division_id, batch_id, delivery_type, academic_term);

-- Existing records were full-division records, so preserve them as theory.
UPDATE subject_faculty_assignment SET delivery_type = 'theory' WHERE delivery_type IS NULL;

-- Backfill exactly the missing standard batches. Existing B1/B2/B3 data is retained.
INSERT IGNORE INTO batches (division_id, name, strength)
SELECT division_id, 'B1', CEILING(COALESCE(strength, 0) / 3) FROM divisions;
INSERT IGNORE INTO batches (division_id, name, strength)
SELECT division_id, 'B2', CEILING((COALESCE(strength, 0) - CEILING(COALESCE(strength, 0) / 3)) / 2) FROM divisions;
INSERT IGNORE INTO batches (division_id, name, strength)
SELECT division_id, 'B3', COALESCE(strength, 0) - CEILING(COALESCE(strength, 0) / 3)
  - CEILING((COALESCE(strength, 0) - CEILING(COALESCE(strength, 0) / 3)) / 2) FROM divisions;
