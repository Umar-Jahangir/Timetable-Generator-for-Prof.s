from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.division import Division
from app.models.division_timetable_review import (
    DivisionTimetableReview,
    ReviewFollowUp,
    ReviewStatus,
)


class DivisionTimetableReviewRepository:
    def __init__(self, db: Session):
        self.db = db

    def _with_division(self):
        return self.db.query(DivisionTimetableReview).options(
            joinedload(DivisionTimetableReview.division).joinedload(Division.academic_year)
        )

    def list_for_term(self, academic_term: str) -> list[DivisionTimetableReview]:
        return (
            self._with_division()
            .filter(DivisionTimetableReview.academic_term == academic_term)
            .order_by(DivisionTimetableReview.division_id)
            .all()
        )

    def get_for_division(self, division_id: int, academic_term: str) -> Optional[DivisionTimetableReview]:
        return (
            self._with_division()
            .filter(
                DivisionTimetableReview.division_id == division_id,
                DivisionTimetableReview.academic_term == academic_term,
            )
            .first()
        )

    def upsert_pending(self, division_ids: list[int], academic_term: str) -> int:
        """Reset/create pending reviews for the given divisions after generation."""
        existing = {
            r.division_id: r
            for r in self.db.query(DivisionTimetableReview)
            .filter(DivisionTimetableReview.academic_term == academic_term)
            .all()
        }
        touched = 0
        for division_id in division_ids:
            row = existing.get(division_id)
            if row is None:
                self.db.add(
                    DivisionTimetableReview(
                        division_id=division_id,
                        academic_term=academic_term,
                        status=ReviewStatus.pending,
                        rejection_reason=None,
                        follow_up=ReviewFollowUp.none,
                        suggested_constraint=None,
                        reviewed_at=None,
                    )
                )
            else:
                row.status = ReviewStatus.pending
                row.rejection_reason = None
                row.follow_up = ReviewFollowUp.none
                row.suggested_constraint = None
                row.reviewed_at = None
            touched += 1

        self.db.commit()
        return touched

    def save(self, review: DivisionTimetableReview) -> DivisionTimetableReview:
        self.db.commit()
        self.db.refresh(review)
        return self.get_for_division(review.division_id, review.academic_term) or review
