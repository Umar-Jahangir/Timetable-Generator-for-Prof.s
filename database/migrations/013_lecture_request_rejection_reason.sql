-- Store the administrator's mandatory explanation when a lecture request
-- is rejected, so the faculty member can act on the feedback.
USE smartsched_ai;

ALTER TABLE lecture_requests
  ADD COLUMN rejection_reason VARCHAR(500) NULL AFTER resolved_at;
