-- SmartSched AI migration 010
-- Per-division admin review of a generated timetable (approve / reject + reason).

USE smartsched_ai;

CREATE TABLE IF NOT EXISTS division_timetable_reviews (
  review_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  division_id INT UNSIGNED NOT NULL,
  academic_term VARCHAR(20) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  rejection_reason VARCHAR(500) NULL,
  follow_up ENUM('none', 'regenerate', 'suggest_constraint') NOT NULL DEFAULT 'none',
  suggested_constraint JSON NULL,
  reviewed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_dtr_division
    FOREIGN KEY (division_id) REFERENCES divisions(division_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uq_dtr_division_term (division_id, academic_term),
  INDEX idx_dtr_term_status (academic_term, status)
) ENGINE=InnoDB;
