#!/bin/bash

echo "🚀 Setting up SCIM Client E2E Testing Environment"
echo "================================================"

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping services..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
        echo "✅ SCIM Server stopped"
    fi
    if [ ! -z "$CLIENT_PID" ]; then
        kill $CLIENT_PID 2>/dev/null
        echo "✅ SCIM Client stopped"
    fi
    exit 0
}

# Set up trap for cleanup
trap cleanup INT TERM

echo "📡 Starting SCIM Server..."
cd ~/scim-server
source .venv/bin/activate
python run_server.py &
SERVER_PID=$!

echo "⏳ Waiting for server to start..."
sleep 5

# Check if server is running
if ! curl -s http://localhost:7001/healthz > /dev/null; then
    echo "❌ Failed to start SCIM server"
    cleanup
fi

echo "✅ SCIM Server is running on http://localhost:7001"

echo "🌐 Starting SCIM Client..."
cd ~/scim-client
python3 -m http.server 8001 &
CLIENT_PID=$!

echo "⏳ Waiting for client to start..."
sleep 2

# Check if client is running
if ! curl -s http://localhost:8001 > /dev/null; then
    echo "❌ Failed to start SCIM client"
    cleanup
fi

echo "✅ SCIM Client is running on http://localhost:8001"

echo "📊 Setting up test data..."
cd ~/scim-server
if [ -f "./generate_test_data.sh" ]; then
    ./generate_test_data.sh
    echo "✅ Test data generated"
else
    echo "⚠️  Test data script not found, skipping..."
fi

echo ""
echo "🎉 Testing Environment Ready!"
echo "============================="
echo "SCIM Server: http://localhost:7001"
echo "SCIM Client: http://localhost:8001"
echo "Test Server ID: test-hr-server"
echo "API Key: api-key-12345"
echo ""
echo "📝 Next Steps:"
echo "1. Open http://localhost:8001 in your browser"
echo "2. Configure the client with the settings above"
echo "3. Test the new features: Entitlements, Roles, etc."
echo ""
echo "🔧 To run automated tests:"
echo "   cd ~/scim-client && ./run-api-tests.sh"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for user to stop
wait