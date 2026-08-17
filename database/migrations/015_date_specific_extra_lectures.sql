-- Extra/replacement lectures are one-time reservations, not recurring
-- weekly timetable entries.
USE smartsched_ai;

ALTER TABLE lecture_requests
  ADD COLUMN scheduled_date DATE NULL AFTER requested_at;

ALTER TABLE timetable_entries
  ADD COLUMN scheduled_date DATE NULL AFTER academic_term;

CREATE INDEX idx_request_scheduled_date ON lecture_requests (scheduled_date);
CREATE INDEX idx_entry_scheduled_date ON timetable_entries (scheduled_date);
