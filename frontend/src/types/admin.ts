export interface Department {
  department_id: number;
  name: string;
  code: string;
}

export interface AcademicYear {
  academic_year_id: number;
  name: string;
  year_order: number;
}

export interface DashboardStats {
  faculty_count: number;
  subject_count: number;
  classroom_count: number;
  lab_count: number;
  pending_requests: number;
}

export interface FacultyUser {
  user_id: number;
  name: string;
  email: string;
  role: "admin" | "faculty";
  is_active: boolean;
}

export interface Faculty {
  faculty_id: number;
  department_id: number;
  designation: string | null;
  max_weekly_hours: number;
  user: FacultyUser;
}

export interface FacultyCreateResponse {
  faculty: Faculty;
  temporary_password: string;
}

export interface Subject {
  subject_id: number;
  name: string;
  code: string;
  academic_year_id: number;
  department_id: number;
  credits: number;
  lectures_per_week: number;
  tutorials_per_week: number;
  lab_hours_per_week: number;
  is_industrial_elective: boolean;
  is_online: boolean;
}

export type RoomType = "classroom" | "laboratory" | "tutorial";

export interface Room {
  room_id: number;
  name: string;
  building: string | null;
  capacity: number;
  room_type: RoomType;
  is_active: boolean;
}

export interface Division {
  division_id: number;
  academic_year_id: number;
  department_id: number;
  name: string;
  strength: number | null;
  is_online: boolean;
}

export interface Batch {
  batch_id: number;
  division_id: number;
  name: string;
  strength: number | null;
}

export type ConstraintType =
  | "faculty_free_hour"
  | "max_continuous_hours"
  | "lab_continuous_hours"
  | "online_year"
  | "division_day_off"
  | "division_blackout"
  | "max_daily_break"
  | "custom";

export interface SchedulingConstraint {
  constraint_id: number;
  name: string;
  constraint_type: ConstraintType;
  config: Record<string, unknown>;
  is_active: boolean;
}

// ---------- Phase 6: Subject-Faculty Assignments ----------

export interface Assignment {
  assignment_id: number;
  subject_id: number;
  faculty_id: number;
  division_id: number;
  batch_id: number | null;
  delivery_type: "theory" | "lab" | "tutorial";
  is_online: boolean;
  academic_term: string;
  display_order?: number;
  subject_name: string | null;
  faculty_name: string | null;
  division_name: string | null;
  division_label: string | null;
  batch_name: string | null;
}

export interface AssignmentCreatePayload {
  subject_id: number;
  faculty_id: number;
  division_id: number;
  batch_id?: number | null;
  delivery_type: "theory" | "lab" | "tutorial";
  is_online?: boolean;
  academic_term?: string;
}

// ---------- Phase 6: Timetable Generation ----------

export interface GenerationResult {
  sessions_requested: number;
  sessions_scheduled: number;
  entries_created: number;
  solver_status: string;
  duration_seconds: number;
  message: string | null;
}

export interface AdminTimetableEntry {
  entry_id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  entry_type: "lecture" | "lab" | "tutorial" | "break";
  is_extra: boolean;
  division_id: number;
  subject_code: string | null;
  subject_name: string | null;
  faculty_name: string | null;
  division_name: string | null;
  division_label: string | null;
  batch_name: string | null;
  room_name: string | null;
}

export type DivisionReviewStatus = "pending" | "approved" | "rejected";
export type DivisionReviewFollowUp = "none" | "regenerate" | "suggest_constraint";

export interface SuggestedConstraint {
  name: string;
  constraint_type: ConstraintType;
  config: Record<string, unknown>;
  explanation: string;
  auto_applied: boolean;
}

export interface DivisionTimetableReview {
  review_id: number;
  division_id: number;
  academic_term: string;
  status: DivisionReviewStatus;
  rejection_reason: string | null;
  follow_up: DivisionReviewFollowUp;
  suggested_constraint: Record<string, unknown> | null;
  reviewed_at: string | null;
  division_label: string | null;
  entry_count: number;
}

export interface DivisionReviewRejectResult {
  review: DivisionTimetableReview;
  suggestion: SuggestedConstraint | null;
  generation: GenerationResult | null;
  message: string;
}

// ---------- Phase 8: Analytics ----------

export interface IntentBreakdown {
  intent: string;
  count: number;
  successful: number;
}

export interface Analytics {
  faculty_utilization_percent: number;
  classroom_utilization_percent: number;
  laboratory_utilization_percent: number;
  student_idle_time_percent: number;
  active_sessions_count: number;
  pending_requests_count: number;
  total_faculty_count: number;
  assistant_queries_total: number;
  assistant_queries_successful: number;
  assistant_queries_by_intent: IntentBreakdown[];
  last_generated_at: string | null;
}
