#!/usr/bin/env bash
set -e

echo "🚀 Starting Writent..."

# Start backend
cd /app/backend
uvicorn main:app --host 0.0.0.0 --port 4006 &
BACKEND_PID=$!

# Start frontend
cd /app/frontend
npx next start --port 3006 &
FRONTEND_PID=$!

echo "✅ Writent is running!"
echo "   Frontend: http://localhost:3006"
echo "   Backend:  http://localhost:4006"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
