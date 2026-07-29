@echo off
title Sistema Longevidade - Blueprint Protocol Hub
echo ========================================================
echo   Iniciando Sistema Longevidade (FastAPI + React Dashboard)
echo ========================================================

cd /d "%~dp0"

IF NOT EXIST ".venv" (
    echo [INFO] Criando ambiente virtual Python...
    python -m venv .venv
    call .venv\Scripts\activate.bat
    echo [INFO] Instalando dependencias do backend...
    pip install -q -r backend\requirements.txt
    pip install -q -e .
) ELSE (
    call .venv\Scripts\activate.bat
)

IF NOT EXIST "frontend\dist" (
    echo [INFO] Compilando Frontend React pela primeira vez...
    cd frontend
    call npm run build
    cd ..
)

echo [INFO] Servidor backend iniciando na porta 8011...
echo [INFO] Abrindo o navegador em http://127.0.0.1:8011...
start "" "http://127.0.0.1:8011"

python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8011 --reload

pause
