@echo off
title SISTec AI Chatbot Suite - Launcher
echo ===================================================================
echo     Launching SISTec Cloned Website + AI Chatbot Gateway
echo ===================================================================
echo.

:: 1. Launch Backend Gateway
echo [1/2] Starting Backend Gateway on Port 8000 (ChromaDB + Gemini Chatbot)...
start "SISTec AI Backend (Port 8000)" cmd /k pushd "%~dp0..\..\apps\chatbot" && call run_backend.bat

:: 2. Launch Local Web Server for Frontend
echo [2/2] Starting Frontend Web Server on Port 3000...
start "SISTec Website (Port 3000)" cmd /k pushd "%~dp0..\..\apps\website" && python -m http.server 3000

:: Wait 3 seconds then open browser
timeout /t 3 >nul
echo.
echo Opening SISTec AI Portal in your default browser...
start http://localhost:3000/index.html

echo.
echo ===================================================================
echo  System is LIVE!
echo  - Frontend: http://localhost:3000
echo  - Backend API: http://localhost:8000/api/health
echo ===================================================================
pause
