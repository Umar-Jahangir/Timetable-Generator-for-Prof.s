-- SmartSched AI migration 009
-- Per-assignment online/offline mode (e.g. RAD Online).
-- Online assignments skip physical room assignment in the optimizer.

USE smartsched_ai;

ALTER TABLE subject_faculty_assignment
  ADD COLUMN is_online BOOLEAN NOT NULL DEFAULT FALSE
  AFTER delivery_type;

-- Existing RAD (Reasoning & Aptitude) sessions are delivered online.
UPDATE subject_faculty_assignment sfa
JOIN subjects s ON s.subject_id = sfa.subject_id
SET sfa.is_online = TRUE
WHERE s.code = 'HS2001';
