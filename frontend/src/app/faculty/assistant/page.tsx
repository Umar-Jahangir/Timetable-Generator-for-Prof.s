"use client";

import React, { useState } from "react";
import { Alert, Box, Button, IconButton, TextField, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ConsolePanel from "../../../components/common/ConsolePanel";
import { palette } from "../../../theme/theme";
import { useConfirmAssistantBooking, useQueryAssistant } from "../../../hooks/useAssistantApi";
import { AssistantRecommendation, ChatMessage } from "../../../types/assistant";
import { getApiErrorMessage } from "../../../lib/errors";

/**
 * CHANGED FROM PHASE 1: was a hardcoded mockRespond() function returning
 * the same canned recommendation regardless of input. Now sends every
 * message to POST /faculty/assistant/query — the real rule-based intent
 * engine built in Phase 7 (app/scheduling/assistant/*, no LLM involved,
 * per the project's own spec) — and renders whatever it actually
 * returns: a scored recommendation with alternates, a plain data list
 * (free rooms, availability), or just a message (workload, timetable
 * summary, or "I didn't understand that").
 *
 * "Find Another Slot" no longer re-queries the backend — it cycles
 * through the `alternates` array the first response already included,
 * since re-running the same query would just return the same ranked
 * list again.
 */

const intentToRequestType = (intent: string): "extra" | "replacement" =>
  intent === "schedule_replacement_lecture" ? "replacement" : "extra";

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const queryAssistant = useQueryAssistant();
  const confirmBooking = useConfirmAssistantBooking();

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await queryAssistant.mutateAsync({ query: text });
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: res.message,
        recommendation: res.recommendation ?? undefined,
        alternates: res.alternates,
        data: res.data,
        requestType: intentToRequestType(res.intent),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: getApiErrorMessage(err, "Something went wrong.") },
      ]);
    }
  };

  const handleFindAnother = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !m.alternates || m.alternates.length === 0) return m;
        const [next, ...rest] = m.alternates;
        return { ...m, recommendation: next, alternates: rest };
      })
    );
  };

  const handleSchedule = async (messageId: string, rec: AssistantRecommendation, requestType: "extra" | "replacement") => {
    try {
      await confirmBooking.mutateAsync({
        subject_id: rec.subject_id,
        division_id: rec.division_id,
        time_slot_id: rec.time_slot_id,
        room_id: rec.room_id,
        request_type: requestType,
        score: rec.score,
      });
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, confirmed: true } : m)));
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: getApiErrorMessage(err, "Couldn't schedule that — the slot may have just been taken. Try asking again."),
        },
      ]);
    }
  };

  return (
    <ConsolePanel title="SmartSched Assistant">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 320 }}>
        {messages.length === 0 && (
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            What can I help you with today? Try: &quot;Schedule an extra CS301 lecture for
            TY-A&quot;, &quot;Find an empty classroom tomorrow&quot;, &quot;What&apos;s my
            workload?&quot;, or &quot;Show my timetable&quot;.
          </Typography>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <Typography key={m.id} variant="body2" sx={{ color: palette.border }}>
              {"> "} {m.text}
            </Typography>
          ) : (
            <Box key={m.id} sx={{ border: `1px solid ${palette.borderDim}`, p: 2 }}>
              <Typography variant="body2" sx={{ color: palette.text, mb: m.recommendation || m.data ? 1.5 : 0 }}>
                {m.text}
              </Typography>

              {m.recommendation && (
                <>
                  <Row label="Class" value={m.recommendation.division} />
                  <Row label="Subject" value={m.recommendation.subject} />
                  <Row label="Day" value={m.recommendation.day} />
                  <Row label="Time" value={`${m.recommendation.start_time} - ${m.recommendation.end_time}`} />
                  <Row label="Room" value={m.recommendation.room} />

                  <Typography variant="caption" sx={{ color: palette.textDim, display: "block", mt: 1.5 }}>
                    Reasons
                  </Typography>
                  {m.recommendation.reasons.map((r) => (
                    <Typography
                      key={r.label}
                      variant="body2"
                      sx={{ color: r.satisfied ? palette.success : palette.danger }}
                    >
                      {r.satisfied ? "✓" : "✗"} {r.label}
                    </Typography>
                  ))}

                  <Typography variant="body2" sx={{ color: palette.textDim, mt: 1.5 }}>
                    Score:{" "}
                    <span style={{ color: palette.accent, fontWeight: 700 }}>{m.recommendation.score} / 100</span>
                  </Typography>

                  {m.confirmed ? (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      Scheduled — check your timetable.
                    </Alert>
                  ) : (
                    <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        disabled={confirmBooking.isPending}
                        onClick={() => handleSchedule(m.id, m.recommendation!, m.requestType ?? "extra")}
                      >
                        [ Schedule Lecture ]
                      </Button>
                      {m.alternates && m.alternates.length > 0 && (
                        <Button variant="outlined" color="primary" size="small" onClick={() => handleFindAnother(m.id)}>
                          [ Find Another Slot ]
                        </Button>
                      )}
                    </Box>
                  )}
                </>
              )}

              {!m.recommendation && m.data && m.data.length > 0 && (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {m.data.slice(0, 10).map((row, idx) => (
                    <Box key={idx} sx={{ display: "flex", gap: 2, borderBottom: `1px solid ${palette.divider}`, py: 0.5 }}>
                      {Object.entries(row).map(([key, value]) => (
                        <Typography key={key} variant="caption" sx={{ color: palette.textDim }}>
                          <span style={{ color: palette.text }}>{String(value)}</span>
                        </Typography>
                      ))}
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )
        )}

        <Box sx={{ display: "flex", gap: 1, mt: "auto", pt: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Ask the assistant..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={queryAssistant.isPending}
          />
          <IconButton
            onClick={handleSend}
            disabled={queryAssistant.isPending}
            sx={{ color: palette.border, border: `1px solid ${palette.border}`, borderRadius: 0 }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </ConsolePanel>
  );
}

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.25 }}>
    <Typography variant="body2" sx={{ color: palette.textDim }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{ color: palette.text }}>
      {value}
    </Typography>
  </Box>
);
