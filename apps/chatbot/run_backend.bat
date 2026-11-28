@echo off
title SISTec Multi-RAG Backend (FastAPI + ChromaDB)
echo ========================================================
echo   Starting SISTec Multi-RAG Backend (Port 8000)
echo ========================================================
cd /d "%~dp0"

if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
) else if exist "..\..\.venv\Scripts\activate.bat" (
    call ..\..\.venv\Scripts\activate.bat
) else if exist "C:\Users\Anshul\Desktop\Minor\.venv\Scripts\activate.bat" (
    echo Using environment from C:\Users\Anshul\Desktop\Minor\.venv
    call "C:\Users\Anshul\Desktop\Minor\.venv\Scripts\activate.bat"
)

python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
pause
