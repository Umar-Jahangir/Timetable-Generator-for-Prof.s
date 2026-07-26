import React, { useState } from "react";
import { Box, TextField, Typography, Button, IconButton } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import ConsolePanel from "../../components/common/ConsolePanel";
import { palette } from "../../theme/theme";
import { AssistantMessage } from "../../types";

/**
 * SmartSched Assistant — chat UI shell.
 * The actual intent detection / rule engine / recommender described in
 * Phase 7 lives on the backend (app/scheduling/assistant/*). This page
 * only owns conversation state and renders whatever the backend returns.
 * For now it fakes the round trip locally so the full UX can be reviewed.
 */
const mockRespond = (query: string): AssistantMessage => {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    text: `Here's the best slot I found for: "${query}"`,
    timestamp: new Date().toISOString(),
    recommendation: {
      division: "TY-A",
      subject: "DBMS",
      day: "Thursday",
      startTime: "2:00 PM",
      endTime: "3:00 PM",
      room: "C-304",
      score: 98,
      reasons: [
        { label: "You are available", satisfied: true },
        { label: "Students are available", satisfied: true },
        { label: "Classroom is free", satisfied: true },
        { label: "No faculty conflicts", satisfied: true },
        { label: "Student idle time is not increased", satisfied: true },
      ],
    },
  };
};

const Assistant: React.FC = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<AssistantMessage[]>([]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: input,
      timestamp: new Date().toISOString(),
    };
    const reply = mockRespond(input);
    setMessages((prev) => [...prev, userMsg, reply]);
    setInput("");
  };

  return (
    <ConsolePanel title="SmartSched Assistant">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minHeight: 320 }}>
        {messages.length === 0 && (
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            What can I help you with today? Try: "Schedule an extra DBMS lecture this week."
          </Typography>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <Typography key={m.id} variant="body2" sx={{ color: palette.border }}>
              {"> "} {m.text}
            </Typography>
          ) : (
            <Box key={m.id} sx={{ border: `1px solid ${palette.borderDim}`, p: 2 }}>
              <Typography variant="body2" sx={{ color: palette.accent, mb: 1.5 }}>
                Recommended Slot
              </Typography>
              {m.recommendation && (
                <>
                  <Row label="Class" value={m.recommendation.division} />
                  <Row label="Subject" value={m.recommendation.subject} />
                  <Row label="Date" value={m.recommendation.day} />
                  <Row
                    label="Time"
                    value={`${m.recommendation.startTime} - ${m.recommendation.endTime}`}
                  />
                  <Row label="Classroom" value={m.recommendation.room} />

                  <Typography variant="caption" sx={{ color: palette.textDim, display: "block", mt: 1.5 }}>
                    Reason
                  </Typography>
                  {m.recommendation.reasons.map((r) => (
                    <Typography key={r.label} variant="body2" sx={{ color: palette.success }}>
                      ✓ {r.label}
                    </Typography>
                  ))}

                  <Typography variant="body2" sx={{ color: palette.textDim, mt: 1.5 }}>
                    Score:{" "}
                    <span style={{ color: palette.accent, fontWeight: 700 }}>
                      {m.recommendation.score} / 100
                    </span>
                  </Typography>

                  <Box sx={{ display: "flex", gap: 1.5, mt: 2 }}>
                    <Button variant="contained" color="primary" size="small">
                      [ Schedule Lecture ]
                    </Button>
                    <Button variant="outlined" color="primary" size="small">
                      [ Find Another Slot ]
                    </Button>
                  </Box>
                </>
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
          />
          <IconButton onClick={handleSend} sx={{ color: palette.border, border: `1px solid ${palette.border}`, borderRadius: 0 }}>
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
    </ConsolePanel>
  );
};

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

export default Assistant;
