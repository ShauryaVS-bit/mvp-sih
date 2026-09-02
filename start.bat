@echo off
echo ============================================
echo  Neuro-Symbolic SIF Risk Engine — Launcher
echo ============================================
echo.
echo Starting backend (FastAPI on :8000)...
start "SIF Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000"

echo Waiting 6 seconds for backend to initialize...
timeout /t 6 /nobreak > nul

echo Starting frontend (Vite on :5173)...
start "SIF Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================
echo  Backend:  http://localhost:8000/api/health
echo  Frontend: http://localhost:5173
echo ============================================
echo.
pause
