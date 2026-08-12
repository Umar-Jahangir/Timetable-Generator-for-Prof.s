export type UserRole = "admin" | "faculty";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface DashboardStats {
  facultyCount: number;
  subjectCount: number;
  classroomCount: number;
  labCount: number;
  pendingRequests: number;
}

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface TimetableSlot {
  id: string;
  day: DayOfWeek;
  startTime: string; // "09:00"
  endTime: string; // "10:00"
  subject: string | null;
  type: "lecture" | "lab" | "tutorial" | "break" | "free";
  division?: string;
  room?: string;
}

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  recommendation?: SlotRecommendation;
  timestamp: string;
}

export interface SlotRecommendation {
  division: string;
  subject: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string;
  score: number; // 0-100
  reasons: { label: string; satisfied: boolean }[];
}

export interface NotificationItem {
  id: string;
  title: string;
  detail?: string;
  timestamp: string;
  read: boolean;
}
