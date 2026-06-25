#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 Starting Writent..."

# Backend
echo "📦 Setting up backend..."
cd "$SCRIPT_DIR/backend"
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -e ".[dev]" -q
    playwright install chromium --with-deps 2>/dev/null || true
else
    source .venv/bin/activate
fi

echo "🔧 Starting backend on :4006..."
uvicorn main:app --host 0.0.0.0 --port 4006 --reload &
BACKEND_PID=$!

# Frontend
echo "🎨 Starting frontend on :3006..."
cd "$SCRIPT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    npm install
fi
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Writent is running!"
echo "   Frontend: http://localhost:3006"
echo "   Backend:  http://localhost:4006"
echo "   API docs: http://localhost:4006/docs"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
