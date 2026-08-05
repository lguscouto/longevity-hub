from contextlib import asynccontextmanager
from pathlib import Path
import os
from typing import Tuple

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import get_db_path
from longevidade import __version__
from longevidade.db.schema import initialize_db

from backend.app.routers import ai, cgm, checkins, compliance, correlations, daily_guidance, energy_circadian, interventions, kdm, labs, metrics, n_of_1, phenoage, physical_assessments, pipeline, profile, quality, reports, supplements


DEFAULT_LOCAL_ALLOWED_ORIGINS: Tuple[str, ...] = (
    "http://127.0.0.1:8886",
    "http://localhost:8886",
    "http://127.0.0.1:8887",
    "http://localhost:8887",
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_db(get_db_path())
    yield


app = FastAPI(
    title="Sistema Longevidade — Blueprint Protocol API",
    version=__version__,
    description="API local e auditável para inteligência e monitoramento de longevidade com Copiloto IA.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(LOCAL_ALLOWED_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(metrics.router)
app.include_router(labs.router)
app.include_router(phenoage.router)
app.include_router(kdm.router)
app.include_router(n_of_1.router)
app.include_router(cgm.router)
app.include_router(reports.router)
app.include_router(profile.router)
app.include_router(ai.router)
app.include_router(supplements.router)
app.include_router(compliance.router)
app.include_router(interventions.router)
app.include_router(pipeline.router)
app.include_router(physical_assessments.router)
app.include_router(quality.router)
app.include_router(checkins.router)
app.include_router(daily_guidance.router)
app.include_router(energy_circadian.router)
app.include_router(correlations.router)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "system": "Longevidade Hub",
        "database": str(get_db_path()),
        "version": app.version,
    }


# Serve arquivos estáticos do frontend se compilado em dist
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
