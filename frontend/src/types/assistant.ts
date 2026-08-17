export interface AssistantReason {
  label: string;
  satisfied: boolean;
}

export interface AssistantRecommendation {
  division: string;
  subject: string;
  day: string;
  start_time: string;
  end_time: string;
  room: string;
  room_id: number;
  time_slot_id: number;
  subject_id: number;
  division_id: number;
  score: number;
  reasons: AssistantReason[];
}

export interface AssistantQueryResponse {
  intent: string;
  message: string;
  recommendation: AssistantRecommendation | null;
  alternates: AssistantRecommendation[];
  data: Record<string, unknown>[] | null;
}

export interface AssistantQueryPayload {
  query: string;
  subject_id?: number;
  division_id?: number;
}

export interface AssistantConfirmPayload {
  subject_id: number;
  division_id: number;
  time_slot_id: number;
  room_id: number;
  request_type: "extra" | "replacement";
  score: number;
}

export interface AssistantConfirmResponse {
  message: string;
  request_id: number;
  entry_id: number | null;
}

// ---------- Frontend-only chat state ----------

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  recommendation?: AssistantRecommendation;
  alternates?: AssistantRecommendation[];
  data?: Record<string, unknown>[] | null;
  requestType?: "extra" | "replacement";
  confirmed?: boolean;
}
