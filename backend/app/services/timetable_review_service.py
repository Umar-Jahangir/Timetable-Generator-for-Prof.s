from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import distinct, func
from sqlalchemy.orm import Session

from app.models.constraint import ConstraintType, SchedulingConstraint
from app.models.division import Division
from app.models.division_timetable_review import ReviewFollowUp, ReviewStatus
from app.models.faculty import Faculty
from app.models.subject_faculty_assignment import SubjectFacultyAssignment
from app.models.timetable_entry import TimetableEntry
from app.repositories.division_timetable_review_repository import DivisionTimetableReviewRepository
from app.repositories.notification_repository import NotificationRepository
from app.scheduling.constraint_suggester import suggest_constraint_from_reason
from app.schemas.timetable_review import (
    DivisionReviewOut,
    DivisionReviewReject,
    DivisionReviewRejectResult,
    SuggestedConstraintOut,
)
from app.services.timetable_service import ACADEMIC_TERM, TimetableService


class TimetableReviewService:
    def __init__(self, db: Session):
        self.db = db
        self.reviews = DivisionTimetableReviewRepository(db)
        self.notifications = NotificationRepository(db)

    def _division_label(self, division: Division | None) -> str:
        if division is None:
            return "Division"
        year = division.academic_year.name if division.academic_year else "Year"
        return f"{year}-{division.name}"

    def _entry_counts(self) -> dict[int, int]:
        rows = (
            self.db.query(TimetableEntry.division_id, func.count(TimetableEntry.entry_id))
            .filter(TimetableEntry.academic_term == ACADEMIC_TERM, TimetableEntry.is_active.is_(True))
            .group_by(TimetableEntry.division_id)
            .all()
        )
        return {division_id: count for division_id, count in rows}

    def _to_out(self, review, entry_counts: dict[int, int] | None = None) -> DivisionReviewOut:
        counts = entry_counts if entry_counts is not None else self._entry_counts()
        return DivisionReviewOut(
            review_id=review.review_id,
            division_id=review.division_id,
            academic_term=review.academic_term,
            status=review.status,
            rejection_reason=review.rejection_reason,
            follow_up=review.follow_up,
            suggested_constraint=review.suggested_constraint,
            reviewed_at=review.reviewed_at,
            division_label=self._division_label(review.division),
            entry_count=counts.get(review.division_id, 0),
        )

    def _faculty_user_ids_for_division(self, division_id: int) -> list[int]:
        assignment_users = (
            self.db.query(distinct(Faculty.user_id))
            .join(SubjectFacultyAssignment, SubjectFacultyAssignment.faculty_id == Faculty.faculty_id)
            .filter(SubjectFacultyAssignment.division_id == division_id)
            .all()
        )
        entry_users = (
            self.db.query(distinct(Faculty.user_id))
            .join(TimetableEntry, TimetableEntry.faculty_id == Faculty.faculty_id)
            .filter(
                TimetableEntry.division_id == division_id,
                TimetableEntry.academic_term == ACADEMIC_TERM,
                TimetableEntry.is_active.is_(True),
            )
            .all()
        )
        return sorted({row[0] for row in assignment_users + entry_users if row[0] is not None})

    def reset_pending_for_generated_divisions(self, division_ids: list[int]) -> int:
        if not division_ids:
            return 0
        return self.reviews.upsert_pending(sorted(set(division_ids)), ACADEMIC_TERM)

    def list_reviews(self) -> list[DivisionReviewOut]:
        counts = self._entry_counts()
        # Ensure every division with active entries has a review row.
        missing = [did for did in counts.keys() if self.reviews.get_for_division(did, ACADEMIC_TERM) is None]
        if missing:
            self.reviews.upsert_pending(missing, ACADEMIC_TERM)
        return [self._to_out(r, counts) for r in self.reviews.list_for_term(ACADEMIC_TERM)]

    def approve(self, division_id: int) -> DivisionReviewOut:
        review = self.reviews.get_for_division(division_id, ACADEMIC_TERM)
        if not review:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No review found for this division.")
        label = self._division_label(review.division)
        review.status = ReviewStatus.approved
        review.rejection_reason = None
        review.follow_up = ReviewFollowUp.none
        review.suggested_constraint = None
        review.reviewed_at = datetime.now(timezone.utc)
        review = self.reviews.save(review)

        self.notifications.create_many(
            self._faculty_user_ids_for_division(division_id),
            title=f"Timetable approved - {label}",
            detail=f"The admin approved the generated timetable for {label}.",
        )
        return self._to_out(review)

    def reject(self, division_id: int, payload: DivisionReviewReject) -> DivisionReviewRejectResult:
        review = self.reviews.get_for_division(division_id, ACADEMIC_TERM)
        if not review:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No review found for this division.")
        if payload.follow_up not in (
            ReviewFollowUp.none,
            ReviewFollowUp.regenerate,
            ReviewFollowUp.suggest_constraint,
        ):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid follow_up option.")

        label = self._division_label(review.division)
        reason = payload.reason.strip()
        draft = suggest_constraint_from_reason(reason=reason, division_id=division_id, division_label=label)

        review.status = ReviewStatus.rejected
        review.rejection_reason = reason
        review.follow_up = payload.follow_up
        review.suggested_constraint = {
            "name": draft["name"],
            "constraint_type": draft["constraint_type"],
            "config": draft["config"],
            "explanation": draft["explanation"],
            "confidence": draft["confidence"],
        }
        review.reviewed_at = datetime.now(timezone.utc)
        review = self.reviews.save(review)

        self.notifications.create_many(
            self._faculty_user_ids_for_division(division_id),
            title=f"Timetable rejected - {label}",
            detail=f"Reason: {reason}",
        )

        suggestion = SuggestedConstraintOut(
            name=draft["name"],
            constraint_type=ConstraintType(draft["constraint_type"]),
            config=draft["config"],
            explanation=draft["explanation"],
            auto_applied=False,
        )
        generation = None
        message = "Rejection recorded. Suggested constraint is ready for you to add manually."

        if payload.follow_up == ReviewFollowUp.suggest_constraint:
            message = (
                "Rejection recorded. Use the suggested constraint on Admin → Constraints, "
                "then regenerate when ready."
            )
        elif payload.follow_up == ReviewFollowUp.regenerate:
            # Only auto-apply enforceable types with high/medium confidence.
            if draft["constraint_type"] in (
                ConstraintType.division_day_off.value,
                ConstraintType.division_blackout.value,
                ConstraintType.faculty_free_hour.value,
            ) and draft["confidence"] in ("high", "medium"):
                self.db.add(
                    SchedulingConstraint(
                        name=draft["name"][:150],
                        constraint_type=ConstraintType(draft["constraint_type"]),
                        config=draft["config"],
                        is_active=True,
                    )
                )
                self.db.commit()
                suggestion.auto_applied = True
                generation = TimetableService(self.db).generate()
                message = (
                    "Rejection recorded, suggested constraint applied, and the full timetable was regenerated. "
                    "All division reviews were reset to pending."
                )
            else:
                message = (
                    "Rejection recorded, but the reason could not be mapped to an enforceable constraint "
                    "confidently enough to auto-apply. Add the suggested custom note / refine it on "
                    "Constraints, then regenerate."
                )

        return DivisionReviewRejectResult(
            review=self._to_out(review),
            suggestion=suggestion,
            generation=generation,
            message=message,
        )
