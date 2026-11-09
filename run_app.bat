@echo off
title Sistema Longevidade - Blueprint Protocol Hub
echo ========================================================
echo   Iniciando Sistema Longevidade (FastAPI + React Dashboard)
echo ========================================================

cd /d "%~dp0"

set "PYTHONPATH=%CD%;%CD%\src"
set "PYTHONHOME="
set "PYTHON_EXE=%CD%\.venv\Scripts\python.exe"

set "FORCE_BUILD=0"
set "FORCE_UPDATE=0"
set "DEV_MODE=0"

for %%a in (%*) do (
    if "%%a"=="--build" set "FORCE_BUILD=1"
    if "%%a"=="--rebuild" set "FORCE_BUILD=1"
    if "%%a"=="--update" set "FORCE_UPDATE=1"
    if "%%a"=="--dev" set "DEV_MODE=1"
)

IF NOT EXIST ".venv\Scripts\python.exe" (
    echo [INFO] Criando ambiente virtual Python...
    python -m venv .venv || (
        echo [ERRO] Falha ao criar ambiente virtual Python.
        pause
        exit /b 1
    )
    set "FORCE_UPDATE=1"
)

IF "%FORCE_UPDATE%"=="1" (
    echo [INFO] Instalando/atualizando dependencias do backend...
    "%PYTHON_EXE%" -m pip install -q -r backend\requirements.txt || (
        echo [ERRO] Falha ao instalar dependencias do backend.
        pause
        exit /b 1
    )
    "%PYTHON_EXE%" -m pip install -q -e . || (
        echo [ERRO] Falha ao instalar pacote longevidade.
        pause
        exit /b 1
    )
) ELSE (
    "%PYTHON_EXE%" -c "import cryptography" >nul 2>&1 || (
        echo [INFO] Atualizando dependencias do backend no ambiente virtual...
        "%PYTHON_EXE%" -m pip install -q -r backend\requirements.txt
        "%PYTHON_EXE%" -m pip install -q -e .
    )
)

IF NOT EXIST "frontend\node_modules" (
    echo [INFO] Instalando dependencias do frontend...
    cd frontend
    call npm ci || (
        echo [ERRO] Falha no npm ci do frontend.
        cd ..
        pause
        exit /b 1
    )
    cd ..
)

IF "%FORCE_BUILD%"=="1" (
    echo [INFO] Recompilando Frontend React (--build solicitado)...
    cd frontend
    call npm run build || (
        echo [ERRO] Falha ao compilar Frontend React.
        cd ..
        pause
        exit /b 1
    )
    cd ..
) ELSE IF "%DEV_MODE%"=="0" (
    IF NOT EXIST "frontend\dist" (
        echo [INFO] Compilando Frontend React pela primeira vez...
        cd frontend
        call npm run build || (
            echo [ERRO] Falha ao compilar Frontend React.
            cd ..
            pause
            exit /b 1
        )
        cd ..
    )
)

echo [INFO] Servidor Longevidade Hub iniciando na porta 8887...
set "LONGEVIDADE_CORS_ORIGINS=http://127.0.0.1:8886,http://127.0.0.1:8887,http://localhost:8886,http://localhost:8887"

IF "%DEV_MODE%"=="1" (
    echo [INFO] Modo Dev ativado (--dev): iniciando Vite Dev Server (porta 8886)...
    start "Vite Dev Server" /d "%~dp0frontend" cmd /c "npm run dev"
    set "TARGET_URL=http://127.0.0.1:8886"
) ELSE (
    set "TARGET_URL=http://127.0.0.1:8887"
)

echo [INFO] O navegador sera aberto automaticamente em %TARGET_URL% assim que o servidor estiver pronto...
start /b "" "%PYTHON_EXE%" "%~dp0scripts\open_browser_when_ready.py" --url %TARGET_URL%

"%PYTHON_EXE%" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8887 --reload

pause
