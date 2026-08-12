import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import {
  DivisionLookup,
  FacultyNotification,
  LectureRequestCreatePayload,
  LectureRequestRecord,
  SubjectLookup,
  TimetableEntry,
  Workload,
} from "../types/faculty";

// ---------- Schedule / Timetable / Workload ----------

export function useTodaySchedule() {
  return useQuery({
    queryKey: ["faculty", "schedule", "today"],
    queryFn: async () => (await api.get<TimetableEntry[]>("/faculty/me/schedule/today")).data,
  });
}

export function useWeeklyTimetable() {
  return useQuery({
    queryKey: ["faculty", "timetable"],
    queryFn: async () => (await api.get<TimetableEntry[]>("/faculty/me/timetable")).data,
  });
}

export function useWorkload() {
  return useQuery({
    queryKey: ["faculty", "workload"],
    queryFn: async () => (await api.get<Workload>("/faculty/me/workload")).data,
  });
}

// ---------- Notifications ----------

export function useNotifications() {
  return useQuery({
    queryKey: ["faculty", "notifications"],
    queryFn: async () => (await api.get<FacultyNotification[]>("/faculty/notifications")).data,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: number) =>
      (await api.patch<FacultyNotification>(`/faculty/notifications/${notificationId}/read`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty", "notifications"] });
    },
  });
}

// ---------- Lookups (for the lecture request form) ----------

export function useFacultySubjectLookup() {
  return useQuery({
    queryKey: ["faculty", "lookups", "subjects"],
    queryFn: async () => (await api.get<SubjectLookup[]>("/faculty/lookups/subjects")).data,
  });
}

export function useFacultyDivisionLookup() {
  return useQuery({
    queryKey: ["faculty", "lookups", "divisions"],
    queryFn: async () => (await api.get<DivisionLookup[]>("/faculty/lookups/divisions")).data,
  });
}

// ---------- Lecture Requests ----------

export function useMyLectureRequests() {
  return useQuery({
    queryKey: ["faculty", "lecture-requests"],
    queryFn: async () => (await api.get<LectureRequestRecord[]>("/faculty/lecture-requests")).data,
  });
}

export function useCreateLectureRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: LectureRequestCreatePayload) =>
      (await api.post<LectureRequestRecord>("/faculty/lecture-requests", payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faculty", "lecture-requests"] });
      // A new pending request changes the Admin dashboard's count too —
      // harmless to invalidate even if the faculty member never visits
      // the admin console themselves; the cache entry simply won't exist.
      queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}
