#!/bin/bash
set -e

# Add local node directory to PATH if present
if [ -d "$HOME/.local/node/bin" ]; then
    export PATH="$HOME/.local/node/bin:$PATH"
fi

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "============================================"
echo " Neuro-Symbolic SIF Risk Engine — Launcher"
echo "============================================"
echo ""

echo "Starting backend (FastAPI on http://localhost:8000)..."
cd "$SCRIPT_DIR/backend"
PYTHONPATH="" ./venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Waiting 3 seconds for backend initialization..."
sleep 3

echo "Starting frontend (Vite on http://localhost:5173)..."
cd "$SCRIPT_DIR/frontend"
npm run dev -- --host &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "  Backend API: http://localhost:8000/api/health"
echo "  Frontend UI: http://localhost:5173"
echo "============================================"
echo "Press Ctrl+C to stop both servers."
echo ""

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
wait $BACKEND_PID $FRONTEND_PID
