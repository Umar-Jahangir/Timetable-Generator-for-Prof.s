from typing import Optional

from pydantic import BaseModel, Field


class SubjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    code: str = Field(min_length=1, max_length=20)
    academic_year_id: int
    department_id: int
    credits: int = Field(default=0, ge=0, le=20)
    lectures_per_week: int = Field(default=0, ge=0, le=20)
    tutorials_per_week: int = Field(default=0, ge=0, le=20)
    lab_hours_per_week: int = Field(default=0, ge=0, le=20)
    is_online: bool = False


class SubjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    code: Optional[str] = Field(default=None, min_length=1, max_length=20)
    academic_year_id: Optional[int] = None
    department_id: Optional[int] = None
    credits: Optional[int] = Field(default=None, ge=0, le=20)
    lectures_per_week: Optional[int] = Field(default=None, ge=0, le=20)
    tutorials_per_week: Optional[int] = Field(default=None, ge=0, le=20)
    lab_hours_per_week: Optional[int] = Field(default=None, ge=0, le=20)
    is_online: Optional[bool] = None


class SubjectOut(BaseModel):
    subject_id: int
    name: str
    code: str
    academic_year_id: int
    department_id: int
    credits: int
    lectures_per_week: int
    tutorials_per_week: int
    lab_hours_per_week: int
    is_online: bool

    model_config = {"from_attributes": True}
