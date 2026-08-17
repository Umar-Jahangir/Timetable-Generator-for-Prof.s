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
      // Confirmation creates a pending request; no timetable entry is
      // written until an admin approves it.
      queryClient.invalidateQueries({ queryKey: ["faculty", "lecture-requests"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "lecture-requests"] });
    },
  });
}
