export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
export type EntryType = "lecture" | "lab" | "tutorial" | "break";

export interface TimetableEntry {
  entry_id: number;
  day_of_week: DayOfWeek;
  start_time: string; // "09:00:00"
  end_time: string;
  entry_type: EntryType;
  is_extra: boolean;
  subject_code: string | null;
  subject_name: string | null;
  division_name: string | null;
  division_label: string | null;
  batch_name: string | null;
  room_name: string | null;
}

export interface Workload {
  max_weekly_hours: number;
  scheduled_hours: number;
  utilization_percent: number;
  entries_count: number;
}

export interface FacultyNotification {
  notification_id: number;
  title: string;
  detail: string | null;
  is_read: boolean;
  created_at: string;
}

export type LectureRequestType = "extra" | "replacement";
export type LectureRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LectureRequestRecord {
  request_id: number;
  faculty_id: number;
  subject_id: number;
  division_id: number;
  request_type: LectureRequestType;
  status: LectureRequestStatus;
  requested_at: string;
  scheduled_date: string | null;
  resolved_at: string | null;
  rejection_reason: string | null;
  recommended_time_slot_id: number | null;
  recommended_room_id: number | null;
  recommendation_score: number | null;
  recommended_day: string | null;
  recommended_start_time: string | null;
  recommended_end_time: string | null;
  recommended_room_name: string | null;
  subject_name: string | null;
  division_name: string | null;
  faculty_name: string | null;
}

export interface FreeRoom {
  room_id: number;
  room_name: string;
  room_type: "classroom" | "laboratory" | "tutorial";
  capacity: number;
  time_slot_id: number;
  start_time: string;
  end_time: string;
  slot_order: number;
  is_one_hour_lab: boolean;
}

export interface FreeRoomsResponse {
  date: string;
  day: string;
  rooms_by_slot: FreeRoom[];
}

export interface RoomReservationPayload {
  room_id: number;
  time_slot_id: number;
  scheduled_date: string;
  subject_id: number;
  division_id: number;
  request_type?: "extra" | "replacement";
}

export interface LectureRequestCreatePayload {
  subject_id: number;
  division_id: number;
  request_type: LectureRequestType;
  scheduled_date: string;
  original_entry_id?: number;
}

// Reused for the request form's dropdowns — same shape the admin
// lookups already use (see types/admin.ts), fetched from the faculty
// -accessible /faculty/lookups/* endpoints instead.
export interface SubjectLookup {
  subject_id: number;
  name: string;
  code: string;
}

export interface DivisionLookup {
  division_id: number;
  name: string;
  academic_year_id: number;
}
