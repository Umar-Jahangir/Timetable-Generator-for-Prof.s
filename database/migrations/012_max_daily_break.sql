-- SmartSched AI migration 012
-- At most one student idle break per division-day, and that break ≤ 2 hours.
-- Enforced by the CP-SAT optimizer (see max_daily_break).

USE smartsched_ai;

ALTER TABLE scheduling_constraints
  MODIFY constraint_type ENUM(
    'faculty_free_hour',
    'max_continuous_hours',
    'lab_continuous_hours',
    'online_year',
    'division_day_off',
    'division_blackout',
    'max_daily_break',
    'custom'
  ) NOT NULL;

INSERT INTO scheduling_constraints (name, constraint_type, config, is_active)
SELECT
  'One break max 2 hours per day',
  'max_daily_break',
  JSON_OBJECT('max_breaks', 1, 'max_break_hours', 2),
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM scheduling_constraints
  WHERE constraint_type = 'max_daily_break'
    AND name = 'One break max 2 hours per day'
);
