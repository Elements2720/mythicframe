#!/usr/bin/env bash
set -e

echo "========================================================"
echo "              MythicFrame Asset Studio"
echo "========================================================"
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not found on your system."
    echo "Please download and install Node.js (v18+) from: https://nodejs.org/"
    exit 1
fi

echo "[OK] Node.js detected: $(node -v)"
echo ""

# 2. Check and install dependencies if node_modules is missing
if [ ! -d "node_modules" ]; then
    echo "[*] First-time setup detected. Installing dependencies..."
    npm install
    echo "[*] Building MCP server bundle..."
    npm run build:mcp
else
    echo "[OK] Dependencies already installed."
fi

echo ""
echo "========================================================"
echo "Starting MythicFrame Studio + BEI Bridge Server..."
echo "Studio URL: http://localhost:3488"
echo "BEI Bridge: http://localhost:58925"
echo "========================================================"
echo ""

# 3. Open browser after short delay in background
(
    sleep 3
    if command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:3488" &> /dev/null || true
    elif command -v open &> /dev/null; then
        open "http://localhost:3488" &> /dev/null || true
    fi
) &

# 4. Start Server
npm run dev
