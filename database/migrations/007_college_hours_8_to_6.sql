-- SmartSched AI migration 007
-- Extend college hours from 08:00–15:00 to 08:00–18:00 (Mon–Sat).
-- Lunch break remains 12:00–13:00 (slot_order 5).

USE smartsched_ai;

INSERT INTO time_slots (day_of_week, start_time, end_time, slot_order, is_break)
SELECT d.day_of_week, t.start_time, t.end_time, t.slot_order, t.is_break
FROM (
  SELECT 'Monday' AS day_of_week UNION ALL
  SELECT 'Tuesday' UNION ALL
  SELECT 'Wednesday' UNION ALL
  SELECT 'Thursday' UNION ALL
  SELECT 'Friday' UNION ALL
  SELECT 'Saturday'
) AS d
CROSS JOIN (
  SELECT TIME('15:00:00') AS start_time, TIME('16:00:00') AS end_time, 8 AS slot_order, FALSE AS is_break
  UNION ALL SELECT TIME('16:00:00'), TIME('17:00:00'), 9, FALSE
  UNION ALL SELECT TIME('17:00:00'), TIME('18:00:00'), 10, FALSE
) AS t
WHERE NOT EXISTS (
  SELECT 1 FROM time_slots ts
  WHERE ts.day_of_week = d.day_of_week AND ts.start_time = t.start_time
);
