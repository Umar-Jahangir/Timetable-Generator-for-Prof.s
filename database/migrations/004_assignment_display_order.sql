-- SmartSched AI migration 004
-- Lets admins drag-reorder assignments in the UI.
-- Run after migration 003.

USE smartsched_ai;

ALTER TABLE subject_faculty_assignment
  ADD COLUMN display_order INT UNSIGNED NOT NULL DEFAULT 0 AFTER academic_term;

-- Preserve current id order as the starting display order.
UPDATE subject_faculty_assignment
SET display_order = assignment_id;
