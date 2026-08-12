from pydantic import BaseModel


class DepartmentOut(BaseModel):
    department_id: int
    name: str
    code: str

    model_config = {"from_attributes": True}


class AcademicYearOut(BaseModel):
    academic_year_id: int
    name: str
    year_order: int

    model_config = {"from_attributes": True}
