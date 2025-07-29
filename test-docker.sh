#!/bin/bash

# Test script for Docker setup
set -e

echo "🧪 Testing Docker setup for SCIM Client..."

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Ubuntu/Debian: sudo apt install docker.io"
    echo "   Or use snap: sudo snap install docker"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install docker-compose."
    exit 1
fi

echo "✅ Docker and Docker Compose are available"

# Build the Docker image
echo "🔨 Building Docker image..."
docker compose build

# Start the container
echo "🚀 Starting container..."
docker compose up -d

# Wait for container to be ready
echo "⏳ Waiting for container to be ready..."
sleep 10

# Test the health endpoint
echo "🏥 Testing health endpoint..."
if curl -f http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ Health endpoint is responding"
else
    echo "❌ Health endpoint is not responding"
    docker compose logs
    exit 1
fi

# Test the main page
echo "🌐 Testing main page..."
if curl -f http://localhost:8001/ > /dev/null 2>&1; then
    echo "✅ Main page is accessible"
else
    echo "❌ Main page is not accessible"
    docker compose logs
    exit 1
fi

# Test the CORS proxy
echo "🔗 Testing CORS proxy..."
if curl -f http://localhost:8001/proxy/ > /dev/null 2>&1; then
    echo "✅ CORS proxy is accessible"
else
    echo "❌ CORS proxy is not accessible"
    docker compose logs
    exit 1
fi

echo ""
echo "🎉 All tests passed! SCIM Client is running successfully."
echo ""
echo "📋 Access URLs:"
echo "   Main client: http://localhost:8001"
echo "   CORS proxy:  http://localhost:8001/proxy/"
echo "   Health check: http://localhost:8001/health"
echo ""
echo "📝 Container logs:"
docker compose logs --tail=20

echo ""
echo "🛑 To stop the container:"
echo "   docker compose down" 