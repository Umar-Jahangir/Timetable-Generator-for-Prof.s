import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routers import admin, auth, faculty
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
app.include_router(faculty.router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["Health"])
def health_check():
    return {"status": "ok", "service": settings.APP_NAME, "env": settings.APP_ENV}


@app.on_event("startup")
def on_startup():
    logger.info("SmartSched AI API starting up (env=%s)", settings.APP_ENV)
