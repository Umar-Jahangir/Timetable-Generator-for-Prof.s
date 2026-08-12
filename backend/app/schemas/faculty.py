from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.schemas.auth import UserOut


class FacultyCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    department_id: int
    designation: Optional[str] = Field(default=None, max_length=100)
    max_weekly_hours: int = Field(default=18, ge=1, le=40)


class FacultyUpdate(BaseModel):
    """All fields optional — PATCH-style partial update via PUT for simplicity."""

    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    department_id: Optional[int] = None
    designation: Optional[str] = Field(default=None, max_length=100)
    max_weekly_hours: Optional[int] = Field(default=None, ge=1, le=40)
    is_active: Optional[bool] = None


class FacultyOut(BaseModel):
    faculty_id: int
    department_id: int
    designation: Optional[str]
    max_weekly_hours: int
    user: UserOut

    model_config = {"from_attributes": True}


class FacultyCreateResponse(BaseModel):
    """Returned once, right after creation — the temporary password is
    never retrievable again (only the bcrypt hash is stored)."""

    faculty: FacultyOut
    temporary_password: str
