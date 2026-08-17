"use client";

import React, { useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from "@mui/material";
import ConsolePanel from "../../../components/common/ConsolePanel";
import { palette } from "../../../theme/theme";
import { usePendingLectureRequests, useResolveLectureRequest } from "../../../hooks/useAdminApi";
import { LectureRequestRecord } from "../../../types/faculty";
import { getApiErrorMessage } from "../../../lib/errors";

/**
 * New in Phase 5 — not in the original Admin nav from Phase 1, added
 * because the feature is now real: faculty submit requests (Today's
 * Schedule page), and this is where an admin actually resolves them.
 * Assistant-submitted requests include the recommended slot and score
 * so the admin can approve or reject the exact proposed lecture.
 */
export default function LectureRequestsPage() {
  const { data: requests = [], isLoading } = usePendingLectureRequests();
  const resolve = useResolveLectureRequest();
  const [rejectTarget, setRejectTarget] = useState<LectureRequestRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [resolveError, setResolveError] = useState<string | null>(null);

  const openReject = (request: LectureRequestRecord) => {
    setRejectTarget(request);
    setRejectionReason("");
    setResolveError(null);
  };

  const rejectRequest = async () => {
    if (!rejectTarget || !rejectionReason.trim()) {
      setResolveError("A reason is required when rejecting a request.");
      return;
    }
    setResolveError(null);
    try {
      await resolve.mutateAsync({
        request_id: rejectTarget.request_id,
        status: "rejected",
        rejection_reason: rejectionReason.trim(),
      });
      setRejectTarget(null);
    } catch (err) {
      setResolveError(getApiErrorMessage(err));
    }
  };

  return (
    <ConsolePanel title="Lecture Request Approval">
      {isLoading && (
        <Typography variant="body2" sx={{ color: palette.textDim }}>
          Loading...
        </Typography>
      )}
      {!isLoading && requests.length === 0 && (
        <Typography variant="body2" sx={{ color: palette.textDim }}>
          No pending requests.
        </Typography>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {requests.map((r) => (
          <Box
            key={r.request_id}
            sx={{
              border: `1px solid ${palette.borderDim}`,
              p: 2,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ color: palette.text }}>
                <Chip size="small" label={r.request_type} sx={{ mr: 1 }} />
                {r.faculty_name} — {r.subject_name} · {r.division_name}
              </Typography>
              <Typography variant="caption" sx={{ color: palette.textDim }}>
                Requested {new Date(r.requested_at).toLocaleString()}
              </Typography>
              {r.scheduled_date && (
                <Typography variant="caption" sx={{ color: palette.warning, display: "block", mt: 0.5 }}>
                  One-time date: {r.scheduled_date}
                </Typography>
              )}
              {r.recommended_day && (
                <Typography variant="caption" sx={{ color: palette.accent, display: "block", mt: 0.5 }}>
                  Recommended: {r.recommended_day} · {r.recommended_start_time}–{r.recommended_end_time}
                  {r.recommended_room_name ? ` · ${r.recommended_room_name}` : ""}
                  {r.recommendation_score !== null ? ` · score ${r.recommendation_score}/100` : ""}
                </Typography>
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant="contained"
                color="primary"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate({ request_id: r.request_id, status: "approved" })}
              >
                Approve
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                disabled={resolve.isPending}
                onClick={() => openReject(r)}
              >
                Reject
              </Button>
            </Box>
          </Box>
        ))}
      </Box>
      <Dialog open={Boolean(rejectTarget)} onClose={() => setRejectTarget(null)} fullWidth maxWidth="sm">
        <DialogTitle>Reject Lecture Request</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {resolveError && <Alert severity="error">{resolveError}</Alert>}
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            Explain why this request cannot be approved. The faculty member will receive this reason in Notifications.
          </Typography>
          <TextField
            autoFocus
            required
            label="Reason for rejection"
            placeholder="e.g. The requested slot conflicts with the scheduled lab."
            multiline
            minRows={3}
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            error={Boolean(resolveError)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)} disabled={resolve.isPending}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={rejectRequest}
            disabled={resolve.isPending || !rejectionReason.trim()}
          >
            Reject Request
          </Button>
        </DialogActions>
      </Dialog>
    </ConsolePanel>
  );
}
