#!/bin/bash

# Development script for SCIM Client
# This script builds the project and starts the production container with bind mounts

echo "🚀 Starting SCIM Client development environment..."

# Build the project
echo "📦 Building project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed!"

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null

# Start the production container with bind mounts
echo "🐳 Starting container with bind mounts..."
docker-compose -f docker-compose.prod.yml up -d

if [ $? -eq 0 ]; then
    echo "✅ Development environment started!"
    echo "🌐 Application available at: http://localhost:8000"
    echo "🔧 Proxy available at: http://localhost:8000/proxy"
    echo ""
    echo "📝 To rebuild after changes:"
    echo "   npm run build && docker-compose -f docker-compose.prod.yml restart"
    echo ""
    echo "📋 Container logs:"
    echo "   docker-compose -f docker-compose.prod.yml logs -f"
else
    echo "❌ Failed to start container!"
    exit 1
fi 