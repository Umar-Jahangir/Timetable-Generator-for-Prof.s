import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routers import (
    admin,
    admin_analytics,
    admin_assignments,
    admin_constraints,
    admin_dashboard,
    admin_divisions,
    admin_faculty,
    admin_lecture_requests,
    admin_lookups,
    admin_rooms,
    admin_subjects,
    admin_timetable,
    auth,
    faculty,
    faculty_assistant,
    faculty_lecture_requests,
    faculty_lookups,
    faculty_notifications,
    faculty_schedule,
)
from app.config import get_settings
import app.models  # noqa: F401 — registers all models with SQLAlchemy's mapper

settings = get_settings()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("smartsched")

app = FastAPI(
    title=settings.APP_NAME,
    description="Intelligent Academic Timetable Generation and Dynamic Scheduling Assistant — API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_lookups.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_faculty.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_subjects.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_rooms.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_divisions.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_constraints.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_lecture_requests.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_assignments.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_timetable.router, prefix=settings.API_V1_PREFIX)
app.include_router(faculty.router, prefix=settings.API_V1_PREFIX)
app.include_router(faculty_schedule.router, prefix=settings.API_V1_PREFIX)
app.include_router(faculty_notifications.router, prefix=settings.API_V1_PREFIX)
app.include_router(faculty_lookups.router, prefix=settings.API_V1_PREFIX)
app.include_router(faculty_lecture_requests.router, prefix=settings.API_V1_PREFIX)
app.include_router(faculty_assistant.router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": settings.APP_NAME, "env": settings.APP_ENV}


@app.on_event("startup")
def on_startup():
    logger.info("SmartSched AI API starting up (env=%s)", settings.APP_ENV)
