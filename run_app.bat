@echo off
title Sistema Longevidade - Blueprint Protocol Hub
echo ========================================================
echo   Iniciando Sistema Longevidade (FastAPI + React Dashboard)
echo ========================================================

cd /d "%~dp0"

set "PYTHONPATH="
set "PYTHONHOME="
set "PYTHON_EXE=%CD%\.venv\Scripts\python.exe"

IF NOT EXIST ".venv\Scripts\python.exe" (
    echo [INFO] Criando ambiente virtual Python...
    python -m venv .venv
    echo [INFO] Instalando dependencias do backend...
    "%PYTHON_EXE%" -m pip install -q -r backend\requirements.txt
    "%PYTHON_EXE%" -m pip install -q -e .
)

IF NOT EXIST "frontend\node_modules" (
    echo [INFO] Instalando dependencias do frontend...
    cd frontend
    call npm ci
    cd ..
)

IF NOT EXIST "frontend\dist" (
    echo [INFO] Compilando Frontend React...
    cd frontend
    call npm run build
    cd ..
)

echo [INFO] Servidor backend iniciando na porta 8011...
set "LONGEVIDADE_CORS_ORIGINS=http://127.0.0.1:3000,http://127.0.0.1:8011"
echo [INFO] Abrindo o navegador em http://127.0.0.1:8011...
start "" "http://127.0.0.1:8011"

"%PYTHON_EXE%" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8011 --reload

pause
