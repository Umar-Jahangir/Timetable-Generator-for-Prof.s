-- SmartSched AI migration 008
-- Friday 13:00–14:00 is an institutional free hour: no lecture, lab, or tutorial.
-- Enforced via faculty_free_hour (see app/scheduling/constraints.py).

USE smartsched_ai;

INSERT INTO scheduling_constraints (name, constraint_type, config, is_active)
SELECT
  'Friday 1-2 PM - no lecture/lab/tutorial',
  'faculty_free_hour',
  JSON_OBJECT('day', 'Friday', 'start', '13:00', 'end', '14:00'),
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM scheduling_constraints
  WHERE constraint_type = 'faculty_free_hour'
    AND JSON_UNQUOTE(JSON_EXTRACT(config, '$.day')) = 'Friday'
    AND JSON_UNQUOTE(JSON_EXTRACT(config, '$.start')) = '13:00'
);

-- Prefer the clear institutional name if an older row already exists.
UPDATE scheduling_constraints
SET name = 'Friday 1-2 PM - no lecture/lab/tutorial',
    is_active = TRUE,
    config = JSON_OBJECT('day', 'Friday', 'start', '13:00', 'end', '14:00')
WHERE constraint_type = 'faculty_free_hour'
  AND JSON_UNQUOTE(JSON_EXTRACT(config, '$.day')) = 'Friday'
  AND JSON_UNQUOTE(JSON_EXTRACT(config, '$.start')) = '13:00';
