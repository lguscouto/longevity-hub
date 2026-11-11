from contextlib import asynccontextmanager
from pathlib import Path
import os
import logging
from typing import Tuple

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import get_db_path
from backend.app.access import router as owner_router, authorization_middleware
from longevidade import __version__
from longevidade.db.schema import initialize_db

from backend.app.routers import (
    ai,
    cgm,
    checkins,
    compliance,
    context_insights,
    correlations,
    daily_guidance,
    energy_circadian,
    google_health,
    interventions,
    kdm,
    labs,
    metrics,
    n_of_1,
    phenoage,
    physical_assessments,
    pipeline,
    profile,
    quality,
    reports,
    supplements,
    timeline,
    workouts,
    zepp,
    steps,
    biomarkers,
    personal_auth,
)



DEFAULT_LOCAL_ALLOWED_ORIGINS: Tuple[str, ...] = (
    "http://127.0.0.1:8886",
    "http://localhost:8886",
    "http://127.0.0.1:8887",
    "http://localhost:8887",
    "http://whitexp.ddns.net:8887",
    "https://whitexp.ddns.net:8887",
    "http://whitexp.ddns.net:8886",
    "https://whitexp.ddns.net:8886",
    "http://whitexp.ddns.net",
    "https://whitexp.ddns.net",
)


def _parse_cors_origins() -> Tuple[str, ...]:
    raw = os.environ.get("LONGEVIDADE_CORS_ORIGINS")
    if not raw:
        return DEFAULT_LOCAL_ALLOWED_ORIGINS

    values = tuple(
        origin.strip()
        for origin in raw.replace(";", ",").split(",")
        if origin.strip()
    )
    if not values:
        return DEFAULT_LOCAL_ALLOWED_ORIGINS
    if any(origin == "*" for origin in values):
        raise ValueError("LONGEVIDADE_CORS_ORIGINS must not contain wildcard *")
    return values


LOCAL_ALLOWED_ORIGINS = _parse_cors_origins()


def _get_cors_origin_regex() -> str:
    custom = os.environ.get("LONGEVIDADE_CORS_ORIGIN_REGEX")
    if custom:
        return custom
    if os.environ.get("LONGEVIDADE_ALLOW_LAN") == "1":
        return r"^https?://(localhost|127\.0\.0\.1|whitexp\.ddns\.net|192\.168\.\d+\.\d+)(:\d+)?$"
    return r"^https?://(localhost|127\.0\.0\.1|whitexp\.ddns\.net)(:\d+)?$"


LOCAL_ALLOWED_ORIGIN_REGEX = _get_cors_origin_regex()


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_path = get_db_path()
    initialize_db(db_path)
    try:
        from longevidade.context.service import get_timeline_service
        service = get_timeline_service(db_path)
        from longevidade.context.safe_reconcile import reconcile_with_backup
        reconcile_with_backup(service, db_path)
    except Exception:
        logging.getLogger(__name__).warning('Reconciliação inicial não concluída; consulte o estado da linha do tempo.')
    yield


app = FastAPI(
    title="Longevidade Hub API",
    version=__version__,
    description="API local e auditável para inteligência e monitoramento de longevidade com Copiloto IA.",
    lifespan=lifespan,
)

app.middleware("http")(authorization_middleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(LOCAL_ALLOWED_ORIGINS),
    allow_origin_regex=LOCAL_ALLOWED_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(timeline.router)
app.include_router(context_insights.router)
app.include_router(metrics.router)
app.include_router(labs.router)
app.include_router(phenoage.router)
app.include_router(kdm.router)
app.include_router(n_of_1.router)
app.include_router(cgm.router)
app.include_router(reports.router)
app.include_router(profile.router)
app.include_router(google_health.router)
app.include_router(ai.router)
app.include_router(supplements.router)
app.include_router(compliance.router)
app.include_router(interventions.router)
app.include_router(pipeline.router)
app.include_router(physical_assessments.router)
app.include_router(personal_auth.router)
app.include_router(owner_router)
app.include_router(quality.router)
app.include_router(checkins.router)
app.include_router(daily_guidance.router)
app.include_router(energy_circadian.router)
app.include_router(correlations.router)
app.include_router(workouts.router)
app.include_router(zepp.router)
app.include_router(steps.router)
app.include_router(biomarkers.router)

# Aliases para integrações externas e scripts legados
app.add_api_route("/api/sync/all", metrics.sync_all_sources, methods=["POST"], tags=["Sync"])
app.add_api_route("/api/v1/sync/zepp", metrics.sync_zepp_data, methods=["POST"], tags=["Sync"])
app.add_api_route("/api/sync/status", metrics.get_sync_status, methods=["GET"], tags=["Sync"])
app.add_api_route("/api/metrics/steps/analytics", steps.get_steps_analytics, methods=["GET"], tags=["Steps"])


@app.get("/api/health")
def health_check():
    db_path = get_db_path()
    db_connected = False
    user_version = None
    db_error = None
    if db_path.exists():
        try:
            import sqlite3
            with sqlite3.connect(db_path, timeout=5.0) as conn:
                row = conn.execute("SELECT 1;").fetchone()
                if row and row[0] == 1:
                    db_connected = True
                ver_row = conn.execute("PRAGMA user_version;").fetchone()
                if ver_row:
                    user_version = ver_row[0]
        except Exception as exc:
            db_error = str(exc)

    return {
        "status": "ok" if db_connected else "degraded",
        "system": "Longevidade Hub",
        "database_connected": db_connected,
        "user_version": user_version,
        "version": app.version,
        **({"database_error": db_error} if db_error else {}),
    }


@app.get("/api/version")
def get_version():
    return {
        "version": app.version,
        "system": "Longevidade Hub",
    }


# Serve arquivos estáticos do frontend se compilado em dist
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
