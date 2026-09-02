# Skill: Fullstack Launcher & Dev Server Verification

## Description
Launches and monitors the dual dev servers for OIL SENTINEL: the FastAPI backend API service and the React Vite frontend dashboard.

## Trigger
Use this skill when starting local development, running multi-tier end-to-end testing, or verifying API/UI connectivity.

## Launcher Script
The repository provides unified launcher scripts:
- **Linux / macOS**: `./start.sh`
- **Windows**: `start.bat`

## Manual Server Execution Protocol

1. **Start Backend (FastAPI + Uvicorn)**:
   ```bash
   cd backend
   PYTHONPATH="" ./venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   - **Health Endpoint**: `http://localhost:8000/api/health`
   - **Swagger Docs**: `http://localhost:8000/docs`

2. **Start Frontend (Vite + React)**:
   ```bash
   cd frontend
   npm run dev -- --host
   ```
   - **Dashboard URL**: `http://localhost:5173`

3. **Validation & Verification**:
   - Check backend health endpoint returns `{"status": "ok"}`.
   - Verify frontend loads without console errors and connects to `http://localhost:8000/api`.
