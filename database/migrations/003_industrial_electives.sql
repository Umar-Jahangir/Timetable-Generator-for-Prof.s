-- SmartSched AI migration 003
-- Marks selected TY industrial electives for the dedicated 08:00–11:00
-- scheduling rule. Run after migration 002.

USE smartsched_ai;

ALTER TABLE subjects
  ADD COLUMN is_industrial_elective BOOLEAN NOT NULL DEFAULT FALSE
  AFTER lab_hours_per_week;

-- Industrial elective subjects supplied by the department.
UPDATE subjects
SET is_industrial_elective = TRUE
WHERE code IN ('CB3203B', 'ID3001', 'ID3002');
