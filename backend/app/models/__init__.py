# Import every model here so SQLAlchemy's mapper registry can resolve
# string-based relationship() references (e.g. User.faculty_profile ->
# "Faculty") regardless of which module gets imported first.
from app.models.user import User, UserRole  # noqa: F401
from app.models.faculty import Faculty  # noqa: F401
from app.models.department import Department  # noqa: F401
from app.models.academic_year import AcademicYear  # noqa: F401
from app.models.division import Division  # noqa: F401
from app.models.batch import Batch  # noqa: F401
from app.models.subject import Subject  # noqa: F401
from app.models.room import Room, RoomType  # noqa: F401
from app.models.constraint import SchedulingConstraint, ConstraintType  # noqa: F401
from app.models.time_slot import TimeSlot, DayOfWeek  # noqa: F401
from app.models.timetable_entry import TimetableEntry, EntryType  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.lecture_request import LectureRequest, RequestStatus, RequestType  # noqa: F401
from app.models.subject_faculty_assignment import SubjectFacultyAssignment  # noqa: F401
from app.models.assistant_query_log import AssistantQueryLog  # noqa: F401
