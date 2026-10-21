#!/bin/bash

# Optimistic Messaging System Starter Script
# This script starts both the backend and frontend in separate terminals

set -e

echo "🚀 Starting Optimistic Messaging System..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Installing/Updating Dependencies${NC}"
echo ""

# Check if backend dependencies are installed
echo "Checking backend dependencies..."
cd "$SCRIPT_DIR/backend"

if ! python -c "import flask_socketio" 2>/dev/null; then
    echo "Installing backend dependencies..."
    pip install -q flask>=3.1.2 flask-cors>=6.0.1 flask-socketio>=5.3.0 python-socketio>=5.9.0
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
fi

echo ""

# Check if frontend dependencies are installed
echo "Checking frontend dependencies..."
cd "$SCRIPT_DIR/apps/web"

if ! npm list socket.io-client 2>/dev/null | grep -q socket.io-client; then
    echo "Installing frontend dependencies (socket.io-client)..."
    npm install --silent
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2: Starting Services${NC}"
echo ""
echo -e "${GREEN}Backend starting on port 5001...${NC}"
echo -e "${GREEN}Frontend starting on port 3000...${NC}"
echo ""

# Start backend in background
cd "$SCRIPT_DIR/backend"
python main.py &
BACKEND_PID=$!

# Give backend time to start
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}✗ Failed to start backend${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo ""

# Start frontend in background
cd "$SCRIPT_DIR/apps/web"
npm run dev &
FRONTEND_PID=$!

# Give frontend time to start
sleep 3

echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ Optimistic Messaging System is Running!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Frontend:   http://localhost:3000"
echo "Backend:    http://localhost:5001"
echo "Health:     http://localhost:5001/health"
echo ""
echo "Messages stored in: $SCRIPT_DIR/backend/messages.json"
echo ""
echo "To stop, press Ctrl+C or run:"
echo "  kill $BACKEND_PID  # Stop backend"
echo "  kill $FRONTEND_PID # Stop frontend"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
