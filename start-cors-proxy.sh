#!/bin/bash

# Simple CORS Proxy Startup Script
# This script starts the Python CORS proxy for local development

echo "🚀 Starting CORS Proxy..."
echo "========================="

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed or not in PATH"
    exit 1
fi

# Check if requests module is available
if ! python3 -c "import requests" 2>/dev/null; then
    echo "⚠️  Python 'requests' module not found. Attempting to install..."
    pip3 install --user requests || pip install --user requests || {
        echo "❌ Failed to install 'requests' module. Please install it manually:"
        echo "   pip install requests"
        exit 1
    }
fi

# Check if port 8080 is available
if netstat -tlnp 2>/dev/null | grep -q ":8080 "; then
    echo "⚠️  Port 8080 is already in use. Attempting to free it..."
    sudo fuser -k 8080/tcp 2>/dev/null || true
    sleep 2
fi

echo "✅ Starting CORS proxy on http://localhost:8080"
echo "📝 Press Ctrl+C to stop the proxy"
echo ""

# Start the CORS proxy
python3 simple-cors-proxy.py