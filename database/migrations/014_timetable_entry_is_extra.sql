-- Mark assistant/admin-approved extra lectures so the UI can highlight them.
USE smartsched_ai;

ALTER TABLE timetable_entries
  ADD COLUMN is_extra BOOLEAN NOT NULL DEFAULT FALSE AFTER entry_type;
