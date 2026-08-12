from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.v1.deps import require_role
from app.db.session import get_db
from app.models.user import User, UserRole
from app.repositories.lookup_repository import LookupRepository
from app.schemas.lookup import AcademicYearOut, DepartmentOut

router = APIRouter(prefix="/admin/lookups", tags=["Admin - Lookups"])


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    """Read-only reference data for populating dropdowns in create/edit forms."""
    return LookupRepository(db).list_departments()


@router.get("/academic-years", response_model=list[AcademicYearOut])
def list_academic_years(
    db: Session = Depends(get_db),
    _: User = Depends(require_role(UserRole.admin)),
):
    return LookupRepository(db).list_academic_years()
