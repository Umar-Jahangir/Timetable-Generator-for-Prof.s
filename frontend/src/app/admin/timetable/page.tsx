"use client";

import React, { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import ConsolePanel from "../../../components/common/ConsolePanel";
import StatCard from "../../../components/common/StatCard";
import TimetableGrid from "../../../components/timetable/TimetableGrid";
import { palette } from "../../../theme/theme";
import {
  useAdminTimetable,
  useAcademicYears,
  useApproveDivisionTimetable,
  useDivisionList,
  useDivisionTimetableReviews,
  useGenerateTimetable,
  useRejectDivisionTimetable,
} from "../../../hooks/useAdminApi";
import { AdminTimetableEntry, DivisionReviewFollowUp, SuggestedConstraint } from "../../../types/admin";
import { TimetableSlot } from "../../../types";
import { getApiErrorMessage } from "../../../lib/errors";

function toGridSlots(entries: AdminTimetableEntry[]): TimetableSlot[] {
  return entries.map((entry) => ({
    id: String(entry.entry_id),
    day: entry.day_of_week as TimetableSlot["day"],
    startTime: entry.start_time.slice(0, 5),
    endTime: entry.end_time.slice(0, 5),
    subject: entry.subject_name,
    type: entry.entry_type,
    division: `${entry.division_label ?? entry.division_name ?? "—"}${
      entry.batch_name ? ` · ${entry.batch_name}` : ""
    }`,
    faculty: entry.faculty_name ?? undefined,
    room: entry.room_name ?? undefined,
  }));
}

const statusColor = (status: string) => {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  return "warning";
};

type DivisionFilter = "all" | `bundle:${"A" | "B" | "C"}` | number;

const ELECTIVE_SUFFIXES = ["D1", "D2", "D3"] as const;

function parseDivisionFilter(value: string): DivisionFilter {
  if (value === "all") return "all";
  if (value === "bundle:A" || value === "bundle:B" || value === "bundle:C") return value;
  return Number(value);
}

function filterSelectValue(filter: DivisionFilter): string {
  if (filter === "all") return "all";
  if (typeof filter === "string") return filter;
  return String(filter);
}

export default function TimetableGenerationPage() {
  const { data: entries = [], isLoading } = useAdminTimetable();
  const { data: divisions = [] } = useDivisionList();
  const { data: academicYears = [] } = useAcademicYears();
  const { data: reviews = [] } = useDivisionTimetableReviews();
  const generate = useGenerateTimetable();
  const approve = useApproveDivisionTimetable();
  const reject = useRejectDivisionTimetable();

  const [divisionFilter, setDivisionFilter] = useState<DivisionFilter>("all");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectFollowUp, setRejectFollowUp] = useState<DivisionReviewFollowUp>("suggest_constraint");
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [lastSuggestion, setLastSuggestion] = useState<SuggestedConstraint | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const divisionOptions = useMemo(() => {
    return [...divisions]
      .map((d) => {
        const year = academicYears.find((y) => y.academic_year_id === d.academic_year_id);
        return {
          division_id: d.division_id,
          label: `${year?.name ?? "Year"}-${d.name}`,
          yearOrder: year?.year_order ?? 99,
          name: d.name,
          yearName: year?.name ?? "",
        };
      })
      .sort((a, b) => a.yearOrder - b.yearOrder || a.name.localeCompare(b.name));
  }, [divisions, academicYears]);

  const idByLabel = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of divisionOptions) map.set(d.label, d.division_id);
    return map;
  }, [divisionOptions]);

  const bundleDivisionIds = useMemo(() => {
    const build = (core: "A" | "B" | "C") => {
      const ids: number[] = [];
      const coreId = idByLabel.get(`TY-${core}`);
      if (coreId) ids.push(coreId);
      for (const suffix of ELECTIVE_SUFFIXES) {
        const electiveId = idByLabel.get(`TY-${suffix}`);
        if (electiveId) ids.push(electiveId);
      }
      return ids;
    };
    return {
      A: build("A"),
      B: build("B"),
      C: build("C"),
    };
  }, [idByLabel]);

  const activeDivisionIds = useMemo((): number[] | null => {
    if (divisionFilter === "all") return null;
    if (divisionFilter === "bundle:A") return bundleDivisionIds.A;
    if (divisionFilter === "bundle:B") return bundleDivisionIds.B;
    if (divisionFilter === "bundle:C") return bundleDivisionIds.C;
    return [divisionFilter];
  }, [divisionFilter, bundleDivisionIds]);

  const filteredEntries = useMemo(() => {
    if (activeDivisionIds === null) return entries;
    const allowed = new Set(activeDivisionIds);
    return entries.filter((e) => allowed.has(e.division_id));
  }, [entries, activeDivisionIds]);

  const selectedLabel = useMemo(() => {
    if (divisionFilter === "all") return "all divisions";
    if (divisionFilter === "bundle:A") return "TY-A + D1/D2/D3";
    if (divisionFilter === "bundle:B") return "TY-B + D1/D2/D3";
    if (divisionFilter === "bundle:C") return "TY-C + D1/D2/D3";
    return divisionOptions.find((d) => d.division_id === divisionFilter)?.label ?? "selected division";
  }, [divisionFilter, divisionOptions]);

  const singleDivisionId = typeof divisionFilter === "number" ? divisionFilter : null;

  const selectedReview =
    singleDivisionId === null ? null : reviews.find((r) => r.division_id === singleDivisionId) ?? null;

  const openReject = () => {
    setRejectReason("");
    setRejectFollowUp("suggest_constraint");
    setRejectError(null);
    setRejectOpen(true);
  };

  const submitReject = async () => {
    if (singleDivisionId === null) return;
    setRejectError(null);
    try {
      const result = await reject.mutateAsync({
        divisionId: singleDivisionId,
        reason: rejectReason.trim(),
        follow_up: rejectFollowUp,
      });
      setLastSuggestion(result.suggestion);
      setLastMessage(result.message);
      setRejectOpen(false);
    } catch (err: unknown) {
      setRejectError(getApiErrorMessage(err));
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <ConsolePanel title="Generate Timetable">
        <Typography variant="body2" sx={{ color: palette.textDim, mb: 2 }}>
          Runs the constraint-satisfaction optimizer against every current Subject-Faculty
          Assignment. After generation, review each division below — approve or reject with a
          reason. Faculty teaching that division get a notification either way.
        </Typography>

        <Button
          variant="contained"
          color="primary"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
        >
          {generate.isPending ? "Generating..." : "[ Generate Timetable ]"}
        </Button>

        {generate.data && (
          <Box sx={{ mt: 3 }}>
            {generate.data.solver_status === "NO_ASSIGNMENTS" ? (
              <Alert severity="warning">{generate.data.message}</Alert>
            ) : (
              <>
                <Alert severity={generate.data.sessions_scheduled === generate.data.sessions_requested ? "success" : "warning"} sx={{ mb: 2 }}>
                  Solver status: <strong>{generate.data.solver_status}</strong> — scheduled{" "}
                  {generate.data.sessions_scheduled} of {generate.data.sessions_requested} required sessions in{" "}
                  {generate.data.duration_seconds}s. Division reviews were reset to pending.
                </Alert>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  <StatCard label="SESSIONS REQUESTED" value={generate.data.sessions_requested} />
                  <StatCard label="SESSIONS SCHEDULED" value={generate.data.sessions_scheduled} />
                  <StatCard label="ENTRIES CREATED" value={generate.data.entries_created} accent />
                </Box>
              </>
            )}
          </Box>
        )}
      </ConsolePanel>

      <ConsolePanel title={`Current Timetable (${selectedLabel})`}>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 2 }}>
          <TextField
            select
            size="small"
            label="View"
            value={filterSelectValue(divisionFilter)}
            onChange={(e) => {
              setDivisionFilter(parseDivisionFilter(e.target.value));
              setLastSuggestion(null);
              setLastMessage(null);
            }}
            sx={{ minWidth: 280 }}
          >
            <MenuItem value="all">All divisions</MenuItem>
            <MenuItem value="bundle:A">TY-A + TY-D1/D2/D3</MenuItem>
            <MenuItem value="bundle:B">TY-B + TY-D1/D2/D3</MenuItem>
            <MenuItem value="bundle:C">TY-C + TY-D1/D2/D3</MenuItem>
            {divisionOptions.map((d) => (
              <MenuItem key={d.division_id} value={String(d.division_id)}>
                {d.label} only
              </MenuItem>
            ))}
          </TextField>
          {!isLoading && entries.length > 0 && (
            <Typography variant="caption" sx={{ color: palette.textDim }}>
              Showing {filteredEntries.length} of {entries.length} entries
            </Typography>
          )}
        </Box>

        {singleDivisionId !== null && selectedReview && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", mb: 2 }}>
            <Chip
              size="small"
              color={statusColor(selectedReview.status) as "success" | "error" | "warning"}
              label={`Review: ${selectedReview.status}`}
            />
            {selectedReview.rejection_reason && (
              <Typography variant="caption" sx={{ color: palette.textDim }}>
                Last reason: {selectedReview.rejection_reason}
              </Typography>
            )}
            <Box sx={{ flex: 1 }} />
            <Button
              size="small"
              variant="contained"
              color="primary"
              disabled={approve.isPending || reject.isPending || selectedReview.status === "approved"}
              onClick={() => approve.mutate(singleDivisionId)}
            >
              Approve
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={approve.isPending || reject.isPending}
              onClick={openReject}
            >
              Reject
            </Button>
          </Box>
        )}

        {divisionFilter === "all" && reviews.length > 0 && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
            {reviews.map((r) => (
              <Chip
                key={r.review_id}
                size="small"
                color={statusColor(r.status) as "success" | "error" | "warning"}
                label={`${r.division_label ?? r.division_id}: ${r.status}`}
                onClick={() => setDivisionFilter(r.division_id)}
              />
            ))}
          </Box>
        )}

        {lastMessage && (
          <Alert severity="info" sx={{ mb: 2 }} onClose={() => setLastMessage(null)}>
            {lastMessage}
          </Alert>
        )}
        {lastSuggestion && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Suggested constraint ({lastSuggestion.constraint_type})
              {lastSuggestion.auto_applied ? " — auto-applied" : " — add on Constraints page"}
            </Typography>
            <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
              {lastSuggestion.explanation}
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1,
                bgcolor: palette.surfaceRaised,
                overflowX: "auto",
                fontSize: 12,
              }}
            >
              {JSON.stringify(
                {
                  name: lastSuggestion.name,
                  constraint_type: lastSuggestion.constraint_type,
                  config: lastSuggestion.config,
                },
                null,
                2
              )}
            </Box>
          </Alert>
        )}

        {isLoading && (
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            Loading...
          </Typography>
        )}
        {!isLoading && entries.length === 0 && (
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            No timetable generated yet — click &ldquo;Generate Timetable&rdquo; above. Make sure at least one
            Subject-Faculty Assignment exists first (Admin → Assignments).
          </Typography>
        )}
        {!isLoading && entries.length > 0 && filteredEntries.length === 0 && (
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            No classes scheduled for this view.
          </Typography>
        )}
        {!isLoading && filteredEntries.length > 0 && (
          <TimetableGrid slots={toGridSlots(filteredEntries)} showFaculty />
        )}
      </ConsolePanel>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Reject {selectedLabel}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {rejectError && <Alert severity="error">{rejectError}</Alert>}
          <Typography variant="body2" sx={{ color: palette.textDim }}>
            Tell the assistant why this division timetable is not feasible. Faculty teaching this
            division will see the reason in Notifications.
          </Typography>
          <TextField
            label="Reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            placeholder='e.g. "SY-B Monday is not feasible — no classes on Monday"'
          />
          <TextField
            select
            label="Next step"
            value={rejectFollowUp}
            onChange={(e) => setRejectFollowUp(e.target.value as DivisionReviewFollowUp)}
            fullWidth
            helperText="Regenerate applies an inferred constraint when confidence is high enough, then rebuilds the full timetable."
          >
            <MenuItem value="suggest_constraint">Suggest a constraint for me to add manually</MenuItem>
            <MenuItem value="regenerate">Apply inferred constraint and regenerate full timetable</MenuItem>
            <MenuItem value="none">Only record the reason (still get a suggestion)</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={rejectReason.trim().length < 5 || reject.isPending}
            onClick={submitReject}
          >
            {reject.isPending ? "Working..." : "Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
