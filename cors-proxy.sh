#!/bin/bash

CORS_SESSION="cors-proxy"
CORS_CMD="python3 simple-cors-proxy.py"

SERVER_SESSION="spa-server"
SERVER_CMD="npx http-server -s -p 8000"

# Check for Python requests
if ! python3 -c "import requests" 2>/dev/null; then
  echo "Python 'requests' package not found. Attempting to install..."
  pip install --user requests || pip3 install --user requests || echo "Failed to install 'requests'. Please install it manually."
fi

# Check for local http-server
if [ ! -f node_modules/.bin/http-server ]; then
  echo "Node.js 'http-server' not found locally. Installing locally..."
  npm install http-server || echo "Failed to install 'http-server'. Please install it manually."
fi

# Kill existing CORS proxy session if running
if screen -list | grep -q "$CORS_SESSION"; then
  echo "Killing existing screen session '$CORS_SESSION'..."
  screen -S "$CORS_SESSION" -X quit
  sleep 1
fi

# Kill existing SPA server session if running
if screen -list | grep -q "$SERVER_SESSION"; then
  echo "Killing existing screen session '$SERVER_SESSION'..."
  screen -S "$SERVER_SESSION" -X quit
  sleep 1
fi

# Start Python CORS proxy in a detached screen session
echo "Starting Python CORS proxy in a detached screen session named '$CORS_SESSION'..."
screen -dmS "$CORS_SESSION" bash -c "$CORS_CMD"

# Start SPA static server in a detached screen session
echo "Starting SPA static server in a detached screen session named '$SERVER_SESSION'..."
screen -dmS "$SERVER_SESSION" bash -c "$SERVER_CMD"

echo "Both Python CORS proxy and SPA server started."
echo "To view CORS proxy logs: screen -r $CORS_SESSION"
echo "To view SPA server logs: screen -r $SERVER_SESSION"
echo "To detach from a session: press Ctrl+A then D"

echo "Python CORS proxy script: simple-cors-proxy.py"