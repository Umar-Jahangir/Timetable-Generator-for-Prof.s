-- SmartSched AI migration 006
-- Load SY-A / SY-B / SY-C subject–faculty assignments from
-- SY classes/*_Timetable_Summary.xlsx (theory / lab / tutorial).
-- Batch labels A1/B1/C1 in the sheets map to DB batches B1/B2/B3.
-- Activity/Seminar (CTC) is stored as theory.
-- Run after migrations 002–005.

USE smartsched_ai;

-- ---------------------------------------------------------------------
-- Missing faculty from the SY sheets
-- ---------------------------------------------------------------------
INSERT INTO users (name, email, password_hash, role)
SELECT 'Prof. Prapti V. Kallawar', 'prapti.kallawar@college.edu',
       '$2b$12$D6Eft7YKm3fJzWu82Cd9hOlJeCLgZbCJFfb.8lU8MGGuPIv92hXKK', 'faculty'
WHERE NOT EXISTS (
  SELECT 1 FROM users WHERE email = 'prapti.kallawar@college.edu'
);

INSERT INTO faculty (user_id, department_id, designation, max_weekly_hours)
SELECT u.user_id, 1, 'Assistant Professor', 18
FROM users u
WHERE u.email = 'prapti.kallawar@college.edu'
  AND NOT EXISTS (SELECT 1 FROM faculty f WHERE f.user_id = u.user_id);

-- RAD is delivered online in the SY summaries
UPDATE subjects SET is_online = TRUE WHERE code = 'HS2001';

-- Optional classroom alias used in the sheets (B304 vs B-304)
INSERT INTO rooms (name, building, capacity, room_type)
SELECT 'B304', 'B Block', 100, 'classroom'
WHERE NOT EXISTS (SELECT 1 FROM rooms WHERE name IN ('B304', 'B-304'));

-- ---------------------------------------------------------------------
-- Faculty abbreviation → faculty_id
-- ---------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_sy_faculty;
CREATE TEMPORARY TABLE tmp_sy_faculty (
  abbr VARCHAR(10) PRIMARY KEY,
  faculty_id INT UNSIGNED NOT NULL
);

INSERT INTO tmp_sy_faculty (abbr, faculty_id) VALUES
  ('MPM', (SELECT f.faculty_id FROM faculty f JOIN users u ON u.user_id = f.user_id WHERE u.name LIKE '%MANISHA%MALI%' LIMIT 1)),
  ('STW', (SELECT f.faculty_id FROM faculty f JOIN users u ON u.user_id = f.user_id WHERE u.name LIKE '%SANTOSH%WAGHMODE%' LIMIT 1)),
  ('YJP', (SELECT f.faculty_id FROM faculty f JOIN users u ON u.user_id = f.user_id WHERE u.name LIKE '%YOGESH%PAWAR%' LIMIT 1)),
  ('RRB', (SELECT f.faculty_id FROM faculty f JOIN users u ON u.user_id = f.user_id WHERE u.name LIKE '%RUPALI%BATHE%' LIMIT 1)),
  ('PKS', (SELECT f.faculty_id FROM faculty f JOIN users u ON u.user_id = f.user_id WHERE u.name LIKE '%PRACHI%SORTE%' LIMIT 1)),
  ('PBC', (SELECT f.faculty_id FROM faculty f JOIN users u ON u.user_id = f.user_id WHERE u.name LIKE '%PRASAD%CHAUDHARI%' LIMIT 1)),
  ('PRR', (SELECT f.faculty_id FROM faculty f JOIN users u ON u.user_id = f.user_id WHERE u.name LIKE '%PALLAVI%REGE%' LIMIT 1)),
  ('PMS', (SELECT f.faculty_id FROM faculty f JOIN users u ON u.user_id = f.user_id WHERE u.name LIKE '%PRIYA%SHELKE%' LIMIT 1)),
  ('ASS', (SELECT f.faculty_id FROM faculty f JOIN users u ON u.user_id = f.user_id WHERE u.name LIKE '%AMOL%SURYAWANSHI%' LIMIT 1)),
  ('NSS', (SELECT f.faculty_id FROM faculty f JOIN users u ON u.user_id = f.user_id WHERE u.name LIKE '%NAKUL%SHARMA%' LIMIT 1)),
  ('YSG', (SELECT f.faculty_id FROM faculty f JOIN users u ON u.user_id = f.user_id WHERE UPPER(u.name) LIKE '%YOGESH%GITE%' LIMIT 1)),
  ('SGD', (SELECT f.faculty_id FROM faculty f JOIN users u ON u.user_id = f.user_id WHERE u.name LIKE '%SURUCHI%DEDGAONKAR%' LIMIT 1)),
  ('PSW', (SELECT f.faculty_id FROM faculty f JOIN users u ON u.user_id = f.user_id WHERE u.name LIKE '%PAWAN%WAWAGE%' LIMIT 1)),
  ('PVK', (SELECT f.faculty_id FROM faculty f JOIN users u ON u.user_id = f.user_id WHERE u.email = 'prapti.kallawar@college.edu' OR u.name LIKE '%PRAPTI%KALLAWAR%' LIMIT 1));

-- ---------------------------------------------------------------------
-- Staging rows from the three Excel summaries
-- batch_name NULL = whole-division theory / activity
-- ---------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_sy_assignments;
CREATE TEMPORARY TABLE tmp_sy_assignments (
  div_name VARCHAR(10) NOT NULL,
  subject_code VARCHAR(20) NOT NULL,
  faculty_abbr VARCHAR(10) NOT NULL,
  delivery_type ENUM('theory','lab','tutorial') NOT NULL,
  batch_name VARCHAR(10) NULL,
  display_order INT UNSIGNED NOT NULL
);

INSERT INTO tmp_sy_assignments (div_name, subject_code, faculty_abbr, delivery_type, batch_name, display_order) VALUES
-- ===== SY-A =====
('A', 'CB2003', 'MPM', 'theory', NULL, 100),
('A', 'CB2006', 'STW', 'theory', NULL, 101),
('A', 'CB2004', 'YJP', 'theory', NULL, 102),
('A', 'CB2005', 'RRB', 'theory', NULL, 103),
('A', 'MM0501', 'PKS', 'theory', NULL, 104),
('A', 'HS2001', 'PBC', 'theory', NULL, 105),
('A', 'CB2003', 'MPM', 'lab', 'B1', 106),
('A', 'CB2003', 'MPM', 'lab', 'B2', 107),
('A', 'CB2003', 'MPM', 'lab', 'B3', 108),
('A', 'CB2004', 'YJP', 'lab', 'B1', 109),
('A', 'CB2004', 'YJP', 'lab', 'B2', 110),
('A', 'CB2004', 'YJP', 'lab', 'B3', 111),
('A', 'CB2006', 'STW', 'lab', 'B1', 112),
('A', 'CB2006', 'STW', 'lab', 'B2', 113),
('A', 'CB2006', 'STW', 'lab', 'B3', 114),
('A', 'CB2005', 'RRB', 'lab', 'B1', 115),
('A', 'CB2005', 'RRB', 'lab', 'B2', 116),
('A', 'CB2005', 'RRB', 'lab', 'B3', 117),
('A', 'MM0501', 'PKS', 'tutorial', 'B1', 118),
('A', 'MM0501', 'PKS', 'tutorial', 'B2', 119),
('A', 'MM0501', 'PKS', 'tutorial', 'B3', 120),
('A', 'CB2001', 'YSG', 'tutorial', 'B1', 121),
('A', 'CB2001', 'PKS', 'tutorial', 'B2', 122),
('A', 'CB2001', 'PKS', 'tutorial', 'B3', 123),
('A', 'HS2002', 'RRB', 'theory', NULL, 124),

-- ===== SY-B =====
('B', 'CB2003', 'PRR', 'theory', NULL, 200),
('B', 'CB2006', 'PMS', 'theory', NULL, 201),
('B', 'CB2004', 'ASS', 'theory', NULL, 202),
('B', 'CB2005', 'NSS', 'theory', NULL, 203),
('B', 'MM0501', 'PKS', 'theory', NULL, 204),
('B', 'HS2001', 'YSG', 'theory', NULL, 205),
('B', 'CB2003', 'PRR', 'lab', 'B1', 206),
('B', 'CB2003', 'PRR', 'lab', 'B2', 207),
('B', 'CB2003', 'PRR', 'lab', 'B3', 208),
('B', 'CB2006', 'YJP', 'lab', 'B1', 209),
('B', 'CB2006', 'YJP', 'lab', 'B2', 210),
('B', 'CB2006', 'YJP', 'lab', 'B3', 211),
('B', 'CB2004', 'ASS', 'lab', 'B1', 212),
('B', 'CB2004', 'ASS', 'lab', 'B2', 213),
('B', 'CB2004', 'ASS', 'lab', 'B3', 214),
('B', 'CB2005', 'NSS', 'lab', 'B1', 215),
('B', 'CB2005', 'NSS', 'lab', 'B2', 216),
('B', 'CB2005', 'NSS', 'lab', 'B3', 217),
('B', 'MM0501', 'PKS', 'tutorial', 'B2', 218),
('B', 'MM0501', 'PKS', 'tutorial', 'B3', 219),
('B', 'CB2001', 'STW', 'tutorial', 'B1', 220),
('B', 'CB2001', 'ASS', 'tutorial', 'B2', 221),
('B', 'CB2001', 'PSW', 'tutorial', 'B3', 222),
('B', 'HS2002', 'RRB', 'theory', NULL, 223),

-- ===== SY-C =====
('C', 'CB2003', 'SGD', 'theory', NULL, 300),
('C', 'CB2006', 'PMS', 'theory', NULL, 301),
('C', 'CB2004', 'PVK', 'theory', NULL, 302),
('C', 'CB2005', 'PBC', 'theory', NULL, 303),
('C', 'MM0501', 'PRR', 'theory', NULL, 304),
('C', 'HS2001', 'PMS', 'theory', NULL, 305),
('C', 'CB2003', 'SGD', 'lab', 'B1', 306),
('C', 'CB2003', 'MPM', 'lab', 'B2', 307),
('C', 'CB2003', 'SGD', 'lab', 'B3', 308),
('C', 'CB2006', 'PMS', 'lab', 'B1', 309),
('C', 'CB2006', 'PMS', 'lab', 'B2', 310),
('C', 'CB2006', 'PMS', 'lab', 'B3', 311),
('C', 'CB2004', 'PVK', 'lab', 'B1', 312),
('C', 'CB2004', 'PVK', 'lab', 'B2', 313),
('C', 'CB2004', 'PVK', 'lab', 'B3', 314),
('C', 'CB2005', 'PBC', 'lab', 'B1', 315),
('C', 'CB2005', 'PBC', 'lab', 'B2', 316),
('C', 'CB2005', 'PBC', 'lab', 'B3', 317),
('C', 'MM0501', 'PRR', 'tutorial', 'B2', 318),
('C', 'MM0501', 'PRR', 'tutorial', 'B3', 319),
('C', 'CB2001', 'PRR', 'tutorial', 'B1', 320),
('C', 'CB2001', 'PBC', 'tutorial', 'B2', 321),
('C', 'CB2001', 'PKS', 'tutorial', 'B3', 322),
('C', 'HS2002', 'PVK', 'theory', NULL, 323);

-- Replace any previous SY assignments for these subjects (NULL batch_id
-- is not uniquely constrained the same way on every MySQL build).
DELETE sfa
FROM subject_faculty_assignment sfa
JOIN divisions d ON d.division_id = sfa.division_id
JOIN academic_years ay ON ay.academic_year_id = d.academic_year_id AND ay.name = 'SY'
JOIN subjects s ON s.subject_id = sfa.subject_id
WHERE s.code IN ('CB2001','CB2003','CB2004','CB2005','CB2006','MM0501','HS2001','HS2002');

INSERT INTO subject_faculty_assignment (
  subject_id, faculty_id, division_id, batch_id, delivery_type, academic_term, display_order
)
SELECT
  s.subject_id,
  tf.faculty_id,
  d.division_id,
  b.batch_id,
  t.delivery_type,
  '2026-ODD',
  t.display_order
FROM tmp_sy_assignments t
JOIN subjects s ON s.code = t.subject_code
JOIN tmp_sy_faculty tf ON tf.abbr = t.faculty_abbr
JOIN academic_years ay ON ay.name = 'SY'
JOIN divisions d ON d.name = t.div_name AND d.academic_year_id = ay.academic_year_id
LEFT JOIN batches b ON b.division_id = d.division_id AND b.name = t.batch_name
WHERE (t.batch_name IS NULL AND b.batch_id IS NULL)
   OR (t.batch_name IS NOT NULL AND b.batch_id IS NOT NULL);

DROP TEMPORARY TABLE IF EXISTS tmp_sy_assignments;
DROP TEMPORARY TABLE IF EXISTS tmp_sy_faculty;

-- Verification summary
SELECT CONCAT(ay.name, '-', d.name) AS division,
       s.code,
       IFNULL(b.name, '-') AS batch,
       sfa.delivery_type,
       u.name AS faculty
FROM subject_faculty_assignment sfa
JOIN subjects s ON s.subject_id = sfa.subject_id
JOIN divisions d ON d.division_id = sfa.division_id
JOIN academic_years ay ON ay.academic_year_id = d.academic_year_id
JOIN faculty f ON f.faculty_id = sfa.faculty_id
JOIN users u ON u.user_id = f.user_id
LEFT JOIN batches b ON b.batch_id = sfa.batch_id
WHERE ay.name = 'SY'
ORDER BY d.name, sfa.display_order, s.code, sfa.delivery_type, b.name;
