from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.app.config import DB_PATH
from longevidade.db.schema import initialize_db

from backend.app.routers import metrics, labs, phenoage, n_of_1, cgm, reports, profile, ai

# Inicializa o banco de dados na inicialização do servidor
initialize_db(DB_PATH)

app = FastAPI(
    title="Sistema Longevidade — Blueprint Protocol API",
    version="2.0.0",
    description="API local e auditável para inteligência e monitoramento de longevidade com Copiloto IA."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(metrics.router)
app.include_router(labs.router)
app.include_router(phenoage.router)
app.include_router(n_of_1.router)
app.include_router(cgm.router)
app.include_router(reports.router)
app.include_router(profile.router)
app.include_router(ai.router)

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "system": "Longevidade Hub",
        "database": str(DB_PATH),
        "version": "2.0.0"
    }

# Serve arquivos estáticos do frontend se compilado em dist
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
