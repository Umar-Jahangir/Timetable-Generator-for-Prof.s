-- =====================================================================
-- SmartSched AI — Database Schema
-- Phase 2: Database Design
-- Engine: InnoDB (required for FK support & transactions)
-- Charset: utf8mb4
-- =====================================================================

CREATE DATABASE IF NOT EXISTS smartsched_ai
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE smartsched_ai;

SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. departments
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS departments;
CREATE TABLE departments (
    department_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(100) NOT NULL,
    code             VARCHAR(20)  NOT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_department_name (name),
    UNIQUE KEY uq_department_code (code)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. academic_years  (FY / SY / TY / Final Year)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS academic_years;
CREATE TABLE academic_years (
    academic_year_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name              VARCHAR(20) NOT NULL,      -- 'FY', 'SY', 'TY', 'Final Year'
    year_order        TINYINT UNSIGNED NOT NULL, -- 1,2,3,4 — used for sorting/UI
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_academic_year_name (name),
    UNIQUE KEY uq_academic_year_order (year_order)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. divisions  (e.g. TY-A, TY-B, SY-C)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS divisions;
CREATE TABLE divisions (
    division_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    academic_year_id  INT UNSIGNED NOT NULL,
    department_id     INT UNSIGNED NOT NULL,
    name              VARCHAR(10)  NOT NULL,       -- 'A', 'B', 'C'
    strength          SMALLINT UNSIGNED NULL,       -- number of students
    is_online         BOOLEAN NOT NULL DEFAULT FALSE, -- e.g. Final Year = online
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_division_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(academic_year_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_division_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uq_division (academic_year_id, department_id, name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. batches  (lab sub-groups within a division, e.g. TY-A -> B1, B2, B3)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS batches;
CREATE TABLE batches (
    batch_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    division_id  INT UNSIGNED NOT NULL,
    name         VARCHAR(10) NOT NULL,     -- 'B1', 'B2', 'B3'
    strength     SMALLINT UNSIGNED NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_batch_division
        FOREIGN KEY (division_id) REFERENCES divisions(division_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uq_batch (division_id, name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. users  (single login table for both Admin and Faculty — role-based)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    user_id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    email          VARCHAR(150) NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,   -- bcrypt hash, never plaintext
    role           ENUM('admin', 'faculty') NOT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_email (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. faculty  (1-1 extension of users, faculty-specific profile data)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS faculty;
CREATE TABLE faculty (
    faculty_id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id           INT UNSIGNED NOT NULL,
    department_id     INT UNSIGNED NOT NULL,
    designation       VARCHAR(100) NULL,          -- 'Professor', 'Assistant Professor'
    max_weekly_hours  TINYINT UNSIGNED NOT NULL DEFAULT 18,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_faculty_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_faculty_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uq_faculty_user (user_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. subjects
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS subjects;
CREATE TABLE subjects (
    subject_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(150) NOT NULL,
    code                VARCHAR(20)  NOT NULL,
    academic_year_id    INT UNSIGNED NOT NULL,
    department_id       INT UNSIGNED NOT NULL,
    credits             TINYINT UNSIGNED NOT NULL DEFAULT 0,
    lectures_per_week   TINYINT UNSIGNED NOT NULL DEFAULT 0,
    tutorials_per_week  TINYINT UNSIGNED NOT NULL DEFAULT 0,
    lab_hours_per_week  TINYINT UNSIGNED NOT NULL DEFAULT 0,
    is_online           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_subject_academic_year
        FOREIGN KEY (academic_year_id) REFERENCES academic_years(academic_year_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_subject_department
        FOREIGN KEY (department_id) REFERENCES departments(department_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uq_subject_code (code)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. subject_faculty_assignment  (who teaches what, to which division/batch)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS subject_faculty_assignment;
CREATE TABLE subject_faculty_assignment (
    assignment_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    subject_id      INT UNSIGNED NOT NULL,
    faculty_id      INT UNSIGNED NOT NULL,
    division_id     INT UNSIGNED NOT NULL,
    batch_id        INT UNSIGNED NULL,        -- set only for lab-batch-specific assignments
    academic_term   VARCHAR(20) NOT NULL,      -- e.g. '2026-ODD'
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sfa_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sfa_faculty
        FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sfa_division
        FOREIGN KEY (division_id) REFERENCES divisions(division_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_sfa_batch
        FOREIGN KEY (batch_id) REFERENCES batches(batch_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uq_sfa (subject_id, division_id, batch_id, academic_term)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 9. rooms  (classrooms + laboratories, discriminated by room_type)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS rooms;
CREATE TABLE rooms (
    room_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name         VARCHAR(20) NOT NULL,             -- 'C-304', 'B-205'
    building     VARCHAR(50) NULL,
    capacity     SMALLINT UNSIGNED NOT NULL,
    room_type    ENUM('classroom', 'laboratory') NOT NULL,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_room_name (name)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 10. time_slots  (master reference grid — days x periods)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS time_slots;
CREATE TABLE time_slots (
    time_slot_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    day_of_week   ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
    start_time    TIME NOT NULL,
    end_time      TIME NOT NULL,
    slot_order    TINYINT UNSIGNED NOT NULL,   -- display ordering within a day
    is_break      BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE KEY uq_time_slot (day_of_week, start_time)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 11. timetable_entries  (the generated / live timetable)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS timetable_entries;
CREATE TABLE timetable_entries (
    entry_id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    time_slot_id    INT UNSIGNED NOT NULL,
    division_id     INT UNSIGNED NOT NULL,
    batch_id        INT UNSIGNED NULL,          -- set for lab entries tied to one batch
    subject_id      INT UNSIGNED NULL,          -- NULL for 'break' entries
    faculty_id      INT UNSIGNED NULL,
    room_id         INT UNSIGNED NULL,
    entry_type      ENUM('lecture','lab','tutorial','break') NOT NULL DEFAULT 'lecture',
    academic_term   VARCHAR(20) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,   -- soft-delete on reschedule
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_entry_time_slot
        FOREIGN KEY (time_slot_id) REFERENCES time_slots(time_slot_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_entry_division
        FOREIGN KEY (division_id) REFERENCES divisions(division_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_entry_batch
        FOREIGN KEY (batch_id) REFERENCES batches(batch_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_entry_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_entry_faculty
        FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_entry_room
        FOREIGN KEY (room_id) REFERENCES rooms(room_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    -- A division/batch can only have ONE active entry per time slot per term.
    INDEX idx_entry_division_slot (division_id, batch_id, time_slot_id, academic_term, is_active),
    -- Fast lookups used heavily by the scheduling assistant & clash checks.
    INDEX idx_entry_faculty_slot (faculty_id, time_slot_id, academic_term, is_active),
    INDEX idx_entry_room_slot (room_id, time_slot_id, academic_term, is_active)
) ENGINE=InnoDB;

-- Note: faculty/room double-booking and division/batch double-booking are
-- prevented at the service layer (see Phase 3 — timetable service), which
-- checks idx_entry_faculty_slot / idx_entry_room_slot / idx_entry_division_slot
-- inside a transaction before insert. A hard UNIQUE constraint isn't used
-- here because MySQL cannot express "unique only where is_active = TRUE"
-- without generated/virtual columns, and soft-deleted (is_active = FALSE)
-- historical rows must be allowed to coexist for audit purposes.

-- ---------------------------------------------------------------------
-- 12. constraints  (admin-configurable institutional rules)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS scheduling_constraints;
CREATE TABLE scheduling_constraints (
    constraint_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name             VARCHAR(150) NOT NULL,
    constraint_type  ENUM(
                        'faculty_free_hour',
                        'max_continuous_hours',
                        'lab_continuous_hours',
                        'online_year',
                        'custom'
                     ) NOT NULL,
    config           JSON NOT NULL,   -- e.g. {"day":"Friday","start":"13:00","end":"14:00"}
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 13. faculty_leaves  (planned absence, used by the assistant for
--     "I missed Monday's lecture" -> replacement flow)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS faculty_leaves;
CREATE TABLE faculty_leaves (
    leave_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    faculty_id   INT UNSIGNED NOT NULL,
    leave_date   DATE NOT NULL,
    reason       VARCHAR(255) NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_leave_faculty
        FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uq_faculty_leave (faculty_id, leave_date)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 14. lecture_requests  (extra / replacement lecture requests, the core
--     object the Smart Scheduling Assistant creates and resolves)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS lecture_requests;
CREATE TABLE lecture_requests (
    request_id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    faculty_id                INT UNSIGNED NOT NULL,
    subject_id                INT UNSIGNED NOT NULL,
    division_id                INT UNSIGNED NOT NULL,
    request_type              ENUM('extra', 'replacement') NOT NULL,
    original_entry_id         INT UNSIGNED NULL,     -- which lecture was missed (replacement only)
    recommended_time_slot_id  INT UNSIGNED NULL,
    recommended_room_id       INT UNSIGNED NULL,
    recommendation_score      DECIMAL(5,2) NULL,     -- 0.00 - 100.00
    status                    ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
    requested_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at                TIMESTAMP NULL,
    CONSTRAINT fk_request_faculty
        FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_request_subject
        FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_request_division
        FOREIGN KEY (division_id) REFERENCES divisions(division_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_request_original_entry
        FOREIGN KEY (original_entry_id) REFERENCES timetable_entries(entry_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_request_time_slot
        FOREIGN KEY (recommended_time_slot_id) REFERENCES time_slots(time_slot_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_request_room
        FOREIGN KEY (recommended_room_id) REFERENCES rooms(room_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_request_status (status),
    INDEX idx_request_faculty (faculty_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 15. notifications
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    notification_id  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id          INT UNSIGNED NOT NULL,
    title            VARCHAR(200) NOT NULL,
    detail           VARCHAR(500) NULL,
    is_read          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_notification_user_unread (user_id, is_read)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 16. assistant_query_logs  (every question asked to the rule-based
--     assistant — powers analytics & "conflicts prevented" stats)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS assistant_query_logs;
CREATE TABLE assistant_query_logs (
    log_id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    faculty_id             INT UNSIGNED NOT NULL,
    query_text             VARCHAR(500) NOT NULL,
    detected_intent        VARCHAR(100) NULL,     -- e.g. 'schedule_extra_lecture'
    related_request_id     INT UNSIGNED NULL,
    was_successful         BOOLEAN NULL,
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_faculty
        FOREIGN KEY (faculty_id) REFERENCES faculty(faculty_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_log_request
        FOREIGN KEY (related_request_id) REFERENCES lecture_requests(request_id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
