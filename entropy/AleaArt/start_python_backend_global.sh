#!/bin/bash

echo "🎨 Starting AleaArt Python Backend (Global Installation)..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip3 first."
    exit 1
fi

# Install requirements with better error handling
echo "📥 Installing Python dependencies globally..."
pip3 install --upgrade pip

# Install packages individually to handle errors better
packages=("torch" "diffusers" "transformers" "scipy" "flask" "flask-cors" "pillow" "pymongo" "python-dotenv")

for package in "${packages[@]}"; do
    echo "Installing $package..."
    pip3 install "$package" || echo "⚠️  Failed to install $package, continuing..."
done

# Create generated_images directory
mkdir -p generated_images

# Start the Flask server with simplified backend
echo "🚀 Starting Flask server on http://localhost:8000"
echo "📋 Available endpoints:"
echo "   - POST /generate-image - Generate image from art parameters"
echo "   - GET /health - Health check"
echo "   - GET /generated_images/<filename> - Serve generated images"
echo ""
echo "Using simplified backend (runwayml/stable-diffusion-v1-5)"
echo "Press Ctrl+C to stop the server"

python3 python_backend_simple.py
