#!/bin/bash

echo "🚀 Setting up Agent Rental Dashboard Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🗄️ Setting up database..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "✅ Created .env file. Please update it with your credentials."
else
    echo "✅ .env file already exists."
fi

# Generate database migrations
echo "🔄 Generating database migrations..."
npm run db:generate

# Push database schema
echo "📊 Pushing database schema..."
npm run db:push

# Seed database with sample data
echo "🌱 Seeding database with sample data..."
npm run db:seed

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update your .env file with real credentials:"
echo "   - DATABASE_URL (for local: file:./local.db)"
echo "   - WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID (for WhatsApp integration)"
echo "   - BETTER_AUTH_SECRET (generate a secure secret)"
echo ""
echo "2. Start the development server:"
echo "   npm run dev"
echo ""
echo "3. Open the database studio to view data:"
echo "   npm run db:studio"
echo ""
echo "🎉 Happy coding!"
