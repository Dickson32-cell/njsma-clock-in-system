#!/bin/bash

# Render Build Script
echo "Starting Render deployment for Clock-In System..."

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create necessary directories
echo "Setting up application structure..."
mkdir -p instance

echo "Build completed successfully!"
echo "Application will start with: gunicorn app:app"