-- SmartSched AI migration 005
-- Adds enforceable TY division day-off and departmental-elective blackout rules.

USE smartsched_ai;

ALTER TABLE scheduling_constraints
  MODIFY constraint_type ENUM(
    'faculty_free_hour',
    'max_continuous_hours',
    'lab_continuous_hours',
    'online_year',
    'division_day_off',
    'division_blackout',
    'custom'
  ) NOT NULL;

-- TY-A/B/C each has a distinct weekly day off.
INSERT INTO scheduling_constraints (name, constraint_type, config, is_active)
SELECT 'TY-A weekly day off', 'division_day_off', JSON_OBJECT('division_id', 1, 'day', 'Monday'), TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM scheduling_constraints
  WHERE name = 'TY-A weekly day off'
);

INSERT INTO scheduling_constraints (name, constraint_type, config, is_active)
SELECT 'TY-B weekly day off', 'division_day_off', JSON_OBJECT('division_id', 2, 'day', 'Tuesday'), TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM scheduling_constraints
  WHERE name = 'TY-B weekly day off'
);

INSERT INTO scheduling_constraints (name, constraint_type, config, is_active)
SELECT 'TY-C weekly day off', 'division_day_off', JSON_OBJECT('division_id', 3, 'day', 'Wednesday'), TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM scheduling_constraints
  WHERE name = 'TY-C weekly day off'
);

-- Departmental elective groups D1/D2/D3 have no theory/tutorial/lab on
-- any of the TY-A/B/C day-off days.
INSERT INTO scheduling_constraints (name, constraint_type, config, is_active)
SELECT
  'TY departmental elective blackout',
  'division_blackout',
  JSON_OBJECT('division_ids', JSON_ARRAY(13, 14, 15), 'days', JSON_ARRAY('Monday', 'Tuesday', 'Wednesday')),
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM scheduling_constraints
  WHERE name = 'TY departmental elective blackout'
);
