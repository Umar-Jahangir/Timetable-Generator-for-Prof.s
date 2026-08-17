-- SmartSched AI migration 011
-- TY departmental electives D1/D2/D3 have no classes on Monday and Saturday.

USE smartsched_ai;

-- Keep a single blackout row for D1/D2/D3; replace days with Mon + Sat.
UPDATE scheduling_constraints
SET
  name = 'TY-D1/D2/D3 day off (Monday, Saturday)',
  config = JSON_OBJECT(
    'division_ids', JSON_ARRAY(13, 14, 15),
    'days', JSON_ARRAY('Monday', 'Saturday')
  ),
  is_active = TRUE
WHERE constraint_type = 'division_blackout'
  AND JSON_CONTAINS(config, '13', '$.division_ids')
  AND JSON_CONTAINS(config, '14', '$.division_ids')
  AND JSON_CONTAINS(config, '15', '$.division_ids');

INSERT INTO scheduling_constraints (name, constraint_type, config, is_active)
SELECT
  'TY-D1/D2/D3 day off (Monday, Saturday)',
  'division_blackout',
  JSON_OBJECT(
    'division_ids', JSON_ARRAY(13, 14, 15),
    'days', JSON_ARRAY('Monday', 'Saturday')
  ),
  TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM scheduling_constraints
  WHERE constraint_type = 'division_blackout'
    AND JSON_CONTAINS(config, '13', '$.division_ids')
    AND JSON_CONTAINS(config, '14', '$.division_ids')
    AND JSON_CONTAINS(config, '15', '$.division_ids')
);
