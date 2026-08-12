import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import {
  AcademicYear,
  AdminTimetableEntry,
  Analytics,
  Assignment,
  AssignmentCreatePayload,
  DashboardStats,
  Department,
  Division,
  Faculty,
  FacultyCreateResponse,
  GenerationResult,
  Room,
  RoomType,
  SchedulingConstraint,
  Subject,
} from "../types/admin";
import { LectureRequestRecord } from "../types/faculty";

/**
 * Central place for every Admin-module data hook. Grouped by entity;
 * each group follows the same shape: a `useXQuery` (or list) for reads,
 * and `useCreateX` / `useUpdateX` / `useDeleteX` mutations that
 * invalidate the list query on success so the UI reflects the change
 * immediately without a manual refetch call at each call site.
 */

// ---------------------------------------------------------------------
// Lookups (read-only reference data for dropdowns)
// ---------------------------------------------------------------------
export function useDepartments() {
  return useQuery({
    queryKey: ["lookups", "departments"],
    queryFn: async () => (await api.get<Department[]>("/admin/lookups/departments")).data,
  });
}

export function useAcademicYears() {
  return useQuery({
    queryKey: ["lookups", "academic-years"],
    queryFn: async () => (await api.get<AcademicYear[]>("/admin/lookups/academic-years")).data,
  });
}

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------
export function useDashboardStats() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => (await api.get<DashboardStats>("/admin/dashboard")).data,
  });
}

// ---------------------------------------------------------------------
// Faculty
// ---------------------------------------------------------------------
export function useFacultyList() {
  return useQuery({
    queryKey: ["admin", "faculty"],
    queryFn: async () => (await api.get<Faculty[]>("/admin/faculty")).data,
  });
}

export function useCreateFaculty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      department_id: number;
      designation?: string;
      max_weekly_hours: number;
    }) => (await api.post<FacultyCreateResponse>("/admin/faculty", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "faculty"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useUpdateFaculty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ faculty_id, ...payload }: { faculty_id: number; [key: string]: unknown }) =>
      (await api.put<Faculty>(`/admin/faculty/${faculty_id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "faculty"] }),
  });
}

export function useDeleteFaculty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (facultyId: number) => api.delete(`/admin/faculty/${facultyId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "faculty"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

// ---------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------
export function useSubjectList() {
  return useQuery({
    queryKey: ["admin", "subjects"],
    queryFn: async () => (await api.get<Subject[]>("/admin/subjects")).data,
  });
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.post<Subject>("/admin/subjects", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "subjects"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ subject_id, ...payload }: { subject_id: number; [key: string]: unknown }) =>
      (await api.put<Subject>(`/admin/subjects/${subject_id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "subjects"] }),
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (subjectId: number) => api.delete(`/admin/subjects/${subjectId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "subjects"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

// ---------------------------------------------------------------------
// Rooms (Classrooms + Laboratories — same table, filtered by room_type)
// ---------------------------------------------------------------------
export function useRoomList(roomType: RoomType) {
  return useQuery({
    queryKey: ["admin", "rooms", roomType],
    queryFn: async () => (await api.get<Room[]>("/admin/rooms", { params: { room_type: roomType } })).data,
  });
}

export function useCreateRoom(roomType: RoomType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post<Room>("/admin/rooms", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "rooms", roomType] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

export function useUpdateRoom(roomType: RoomType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ room_id, ...payload }: { room_id: number; [key: string]: unknown }) =>
      (await api.put<Room>(`/admin/rooms/${room_id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "rooms", roomType] }),
  });
}

export function useDeleteRoom(roomType: RoomType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: number) => api.delete(`/admin/rooms/${roomId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "rooms", roomType] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

// ---------------------------------------------------------------------
// Divisions
// ---------------------------------------------------------------------
export function useDivisionList() {
  return useQuery({
    queryKey: ["admin", "divisions"],
    queryFn: async () => (await api.get<Division[]>("/admin/divisions")).data,
  });
}

export function useCreateDivision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.post<Division>("/admin/divisions", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "divisions"] }),
  });
}

export function useUpdateDivision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ division_id, ...payload }: { division_id: number; [key: string]: unknown }) =>
      (await api.put<Division>(`/admin/divisions/${division_id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "divisions"] }),
  });
}

export function useDeleteDivision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (divisionId: number) => api.delete(`/admin/divisions/${divisionId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "divisions"] }),
  });
}

// ---------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------
export function useConstraintList() {
  return useQuery({
    queryKey: ["admin", "constraints"],
    queryFn: async () => (await api.get<SchedulingConstraint[]>("/admin/constraints")).data,
  });
}

export function useCreateConstraint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) =>
      (await api.post<SchedulingConstraint>("/admin/constraints", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "constraints"] }),
  });
}

export function useUpdateConstraint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ constraint_id, ...payload }: { constraint_id: number; [key: string]: unknown }) =>
      (await api.put<SchedulingConstraint>(`/admin/constraints/${constraint_id}`, payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "constraints"] }),
  });
}

export function useDeleteConstraint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (constraintId: number) => api.delete(`/admin/constraints/${constraintId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "constraints"] }),
  });
}

// ---------- Lecture Requests (Phase 5) ----------

export function usePendingLectureRequests() {
  return useQuery({
    queryKey: ["admin", "lecture-requests"],
    queryFn: async () => (await api.get<LectureRequestRecord[]>("/admin/lecture-requests")).data,
  });
}

export function useResolveLectureRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ request_id, status }: { request_id: number; status: "approved" | "rejected" }) =>
      (await api.put(`/admin/lecture-requests/${request_id}`, { status })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "lecture-requests"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}

// ---------- Subject-Faculty Assignments (Phase 6) ----------

export function useAssignmentList() {
  return useQuery({
    queryKey: ["admin", "assignments"],
    queryFn: async () => (await api.get<Assignment[]>("/admin/assignments")).data,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AssignmentCreatePayload) => (await api.post<Assignment>("/admin/assignments", payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "assignments"] }),
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: number) => api.delete(`/admin/assignments/${assignmentId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "assignments"] }),
  });
}

// ---------- Timetable Generation (Phase 6) ----------

export function useGenerateTimetable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post<GenerationResult>("/admin/timetable/generate")).data,
    onSuccess: () => {
      // A regenerated timetable changes almost everything downstream:
      // the admin timetable view itself, the dashboard (nothing counts
      // here yet, but harmless), and every faculty member's schedule/
      // timetable/workload — invalidate broadly rather than trying to
      // enumerate every affected faculty member's query key.
      qc.invalidateQueries({ queryKey: ["admin", "timetable"] });
      qc.invalidateQueries({ queryKey: ["faculty"] });
    },
  });
}

export function useAdminTimetable() {
  return useQuery({
    queryKey: ["admin", "timetable"],
    queryFn: async () => (await api.get<AdminTimetableEntry[]>("/admin/timetable")).data,
  });
}

// ---------- Analytics (Phase 8) ----------

export function useAnalytics() {
  return useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async () => (await api.get<Analytics>("/admin/analytics")).data,
  });
}
