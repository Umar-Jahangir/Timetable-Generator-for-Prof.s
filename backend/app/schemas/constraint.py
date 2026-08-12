from typing import Any, Optional

from pydantic import BaseModel, Field

from app.models.constraint import ConstraintType


class ConstraintCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    constraint_type: ConstraintType
    config: dict[str, Any]
    is_active: bool = True


class ConstraintUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    constraint_type: Optional[ConstraintType] = None
    config: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None


class ConstraintOut(BaseModel):
    constraint_id: int
    name: str
    constraint_type: ConstraintType
    config: dict[str, Any]
    is_active: bool

    model_config = {"from_attributes": True}
