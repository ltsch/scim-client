#!/bin/sh

# Start the Python CORS proxy in the background
echo "Starting Python CORS proxy..."
python3 /usr/local/bin/simple-cors-proxy.py 8080 &
CORS_PID=$!

# Wait a moment for the CORS proxy to start
sleep 2

# Check if CORS proxy started successfully
if ! kill -0 $CORS_PID 2>/dev/null; then
    echo "Failed to start CORS proxy"
    exit 1
fi

echo "CORS proxy started with PID: $CORS_PID"

# Start nginx
echo "Starting nginx..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Wait for nginx to start
sleep 2

# Check if nginx started successfully
if ! kill -0 $NGINX_PID 2>/dev/null; then
    echo "Failed to start nginx"
    kill $CORS_PID 2>/dev/null
    exit 1
fi

echo "nginx started with PID: $NGINX_PID"

# Function to handle shutdown
cleanup() {
    echo "Shutting down services..."
    kill $CORS_PID 2>/dev/null
    kill $NGINX_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Wait for either process to exit
wait 