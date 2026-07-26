# Import every model here so SQLAlchemy's mapper registry can resolve
# string-based relationship() references (e.g. User.faculty_profile ->
# "Faculty") regardless of which module gets imported first.
from app.models.user import User, UserRole  # noqa: F401
from app.models.faculty import Faculty  # noqa: F401
