import enum

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.dialects.mysql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class ConstraintType(str, enum.Enum):
    faculty_free_hour = "faculty_free_hour"
    max_continuous_hours = "max_continuous_hours"
    lab_continuous_hours = "lab_continuous_hours"
    online_year = "online_year"
    custom = "custom"


class SchedulingConstraint(Base):
    """Maps to the `scheduling_constraints` table — admin-configurable
    institutional rules, stored with a flexible JSON `config` so new
    constraint types don't require schema migrations."""

    __tablename__ = "scheduling_constraints"

    constraint_id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    constraint_type: Mapped[ConstraintType] = mapped_column(Enum(ConstraintType), nullable=False)
    config: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
