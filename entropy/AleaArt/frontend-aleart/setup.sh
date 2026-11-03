#!/bin/bash

echo "🎨 AleaArt Frontend Setup"
echo "========================="

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.local.example .env.local
    echo "✅ .env.local created! Please update it with your MongoDB URI and other settings."
else
    echo "✅ .env.local already exists"
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed!"
else
    echo "✅ Dependencies already installed"
fi

echo ""
echo "🚀 Setup complete! Next steps:"
echo "1. Update .env.local with your MongoDB URI and other settings"
echo "2. Make sure MongoDB is running"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "📚 For more information, check the README.md file"

