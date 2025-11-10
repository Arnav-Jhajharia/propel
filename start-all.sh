#!/bin/bash

echo "🚀 Starting Agent Rental Dashboard - Full Stack"
echo "=============================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the frontend directory"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🗄️ Setting up database..."
npm run db:push
npm run db:seed

echo ""
echo "🌐 Starting development server..."
echo "   - Frontend: http://localhost:3000"
echo "   - Database Studio: https://local.drizzle.studio"
echo "   - Login: http://localhost:3000/login"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start the development server
npm run dev


