from typing import Optional

from pydantic import BaseModel, Field


class DivisionCreate(BaseModel):
    academic_year_id: int
    department_id: int
    name: str = Field(min_length=1, max_length=10)
    strength: Optional[int] = Field(default=None, ge=1, le=500)
    is_online: bool = False


class DivisionUpdate(BaseModel):
    academic_year_id: Optional[int] = None
    department_id: Optional[int] = None
    name: Optional[str] = Field(default=None, min_length=1, max_length=10)
    strength: Optional[int] = Field(default=None, ge=1, le=500)
    is_online: Optional[bool] = None


class DivisionOut(BaseModel):
    division_id: int
    academic_year_id: int
    department_id: int
    name: str
    strength: Optional[int]
    is_online: bool

    model_config = {"from_attributes": True}
