#!/bin/bash

# SCIM Client Docker Setup Script
# This script helps you set up and run the SCIM client using Docker

set -e

echo "🐳 SCIM Client Docker Setup"
echo "=========================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ Created .env file"
    echo "   Please edit .env with your SCIM endpoint and API key"
else
    echo "✅ .env file already exists"
fi

# Build the Docker images
echo "🔨 Building Docker images..."
docker compose build

echo "✅ Docker images built successfully"

# Ask user if they want to start the services
echo ""
read -p "🚀 Start the SCIM client services? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting services..."
    docker compose up -d
    
    echo ""
    echo "✅ Services started successfully!"
    echo ""
    echo "📱 Access the SCIM client at: http://localhost:8001"
    echo "🔗 CORS proxy available at: http://localhost:8002"
    echo ""
    echo "📋 Useful commands:"
    echo "   View logs: docker compose logs -f"
    echo "   Stop services: docker compose down"
    echo "   Restart services: docker compose restart"
    echo "   Run tests: docker compose exec scim-client npm test"
    echo ""
else
    echo "ℹ️  Services not started. Run 'docker compose up -d' when ready."
fi

echo "�� Setup complete!" 
