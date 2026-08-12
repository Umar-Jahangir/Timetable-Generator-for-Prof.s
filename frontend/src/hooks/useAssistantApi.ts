import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import {
  AssistantConfirmPayload,
  AssistantConfirmResponse,
  AssistantQueryPayload,
  AssistantQueryResponse,
} from "../types/assistant";

export function useQueryAssistant() {
  return useMutation({
    mutationFn: async (payload: AssistantQueryPayload) =>
      (await api.post<AssistantQueryResponse>("/faculty/assistant/query", payload)).data,
  });
}

export function useConfirmAssistantBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AssistantConfirmPayload) =>
      (await api.post<AssistantConfirmResponse>("/faculty/assistant/confirm", payload)).data,
    onSuccess: () => {
      // A confirmed booking writes a real timetable_entries row —
      // invalidate everything schedule-related so the Weekly Timetable,
      // Today's Schedule, and Workload pages don't show stale data if
      // the faculty member navigates to them next.
      queryClient.invalidateQueries({ queryKey: ["faculty", "timetable"] });
      queryClient.invalidateQueries({ queryKey: ["faculty", "schedule"] });
      queryClient.invalidateQueries({ queryKey: ["faculty", "workload"] });
      queryClient.invalidateQueries({ queryKey: ["faculty", "lecture-requests"] });
    },
  });
}
