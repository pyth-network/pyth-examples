#!/bin/bash

echo "🎨 Starting AleaArt Python Backend (macOS Compatible)..."

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

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install requirements with better error handling
echo "📥 Installing Python dependencies..."
pip install --upgrade pip

# Install packages individually to handle errors better
packages=("torch" "diffusers" "transformers" "scipy" "flask" "flask-cors" "pillow" "accelerate")

for package in "${packages[@]}"; do
    echo "Installing $package..."
    pip install "$package" || echo "⚠️  Failed to install $package, continuing..."
done

# Create generated_images directory
mkdir -p generated_images

# Start the Flask server with macOS-compatible backend
echo "🚀 Starting Flask server on http://localhost:8000"
echo "📋 Available endpoints:"
echo "   - POST /generate-image - Generate image from art parameters"
echo "   - GET /health - Health check"
echo "   - GET /generated_images/<filename> - Serve generated images"
echo ""
echo "Using macOS-compatible backend (runwayml/stable-diffusion-v1-5)"
echo "Press Ctrl+C to stop the server"

python python_backend_macos.py

