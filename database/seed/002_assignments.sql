-- =====================================================================
-- SmartSched AI — Seed Data: Subject-Faculty-Division Assignments
-- Phase 6 dependency: the optimizer has nothing to schedule without
-- these. Not part of Phase 2's original seed_data.sql because this
-- table (and the feature that manages it) didn't exist until Phase 6.
-- =====================================================================

USE smartsched_ai;

INSERT INTO subject_faculty_assignment (subject_id, faculty_id, division_id, batch_id, academic_term)
SELECT
    (SELECT subject_id FROM subjects WHERE code = 'CS301'),
    (SELECT faculty_id FROM faculty WHERE user_id = (SELECT user_id FROM users WHERE email = 'jsmith@college.edu')),
    (SELECT division_id FROM divisions WHERE name = 'A' AND academic_year_id = (SELECT academic_year_id FROM academic_years WHERE name = 'TY')),
    NULL,
    '2026-ODD'
WHERE NOT EXISTS (
    SELECT 1 FROM subject_faculty_assignment
    WHERE subject_id = (SELECT subject_id FROM subjects WHERE code = 'CS301')
      AND division_id = (SELECT division_id FROM divisions WHERE name = 'A' AND academic_year_id = (SELECT academic_year_id FROM academic_years WHERE name = 'TY'))
      AND academic_term = '2026-ODD'
);

INSERT INTO subject_faculty_assignment (subject_id, faculty_id, division_id, batch_id, academic_term)
SELECT
    (SELECT subject_id FROM subjects WHERE code = 'CS302'),
    (SELECT faculty_id FROM faculty WHERE user_id = (SELECT user_id FROM users WHERE email = 'jsmith@college.edu')),
    (SELECT division_id FROM divisions WHERE name = 'C' AND academic_year_id = (SELECT academic_year_id FROM academic_years WHERE name = 'SY')),
    NULL,
    '2026-ODD'
WHERE NOT EXISTS (
    SELECT 1 FROM subject_faculty_assignment
    WHERE subject_id = (SELECT subject_id FROM subjects WHERE code = 'CS302')
      AND division_id = (SELECT division_id FROM divisions WHERE name = 'C' AND academic_year_id = (SELECT academic_year_id FROM academic_years WHERE name = 'SY'))
      AND academic_term = '2026-ODD'
);
