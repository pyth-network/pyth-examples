#!/bin/bash

# WhipHash Extension Installation Script

echo "🚀 WhipHash Browser Extension Installer"
echo "======================================"
echo ""

# Check if Chrome is installed
if ! command -v google-chrome &> /dev/null && ! command -v chromium-browser &> /dev/null; then
    echo "❌ Chrome/Chromium not found. Please install Chrome first."
    exit 1
fi

echo "✅ Chrome/Chromium found"
echo ""

# Get the directory of this script
EXTENSION_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "📁 Extension directory: $EXTENSION_DIR"
echo ""

# Check if manifest.json exists
if [ ! -f "$EXTENSION_DIR/manifest.json" ]; then
    echo "❌ manifest.json not found in $EXTENSION_DIR"
    exit 1
fi

echo "✅ Extension files found"
echo ""

echo "📋 Installation Instructions:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable 'Developer mode' (toggle in top right)"
echo "3. Click 'Load unpacked'"
echo "4. Select this directory: $EXTENSION_DIR"
echo "5. Click 'Select Folder'"
echo ""

echo "🎯 After installation:"
echo "- Click the WhipHash extension icon in your toolbar"
echo "- Click '🚀 Open App' to launch WhipHash"
echo "- The app will open in a new tab"
echo ""

echo "🔧 To update the app URL:"
echo "- Edit popup.html"
echo "- Change 'http://localhost:3000' to your hosted URL"
echo ""

echo "✨ Extension ready for installation!"
