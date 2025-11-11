#!/bin/bash

# Start Dedalus Labs Python Bridge Service

echo "🐍 Starting Dedalus Labs Bridge Service..."
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "main.py" ]; then
    echo "❌ Please run this script from the dedalus-bridge directory"
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/.installed" ]; then
    echo "📥 Installing dependencies..."
    pip install -r requirements.txt
    touch venv/.installed
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Creating from template..."
    cat > .env << EOF
DEDALUS_API_KEY=your-dedalus-api-key
DEDALUS_MODEL=openai/gpt-4o-mini
DEDALUS_BRIDGE_PORT=8001
USE_MCP_SERVER=false
MCP_SERVER_URL=local/rental-dashboard-mcp
TOOL_EXECUTOR_URL=http://localhost:3001/api/tools/execute
EOF
    echo "📝 Please edit .env and add your DEDALUS_API_KEY"
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check if DEDALUS_API_KEY is set
if [ -z "$DEDALUS_API_KEY" ] || [ "$DEDALUS_API_KEY" = "your-dedalus-api-key" ]; then
    echo "❌ DEDALUS_API_KEY not set. Please edit .env and add your API key"
    exit 1
fi

PORT=${DEDALUS_BRIDGE_PORT:-8001}

# Check MCP settings
if [ "$USE_MCP_SERVER" = "true" ]; then
    echo "🔧 MCP Server: ENABLED"
    echo "   - MCP Server URL: ${MCP_SERVER_URL:-local/rental-dashboard-mcp}"
    echo "   - Tool Executor: ${TOOL_EXECUTOR_URL:-http://localhost:3001/api/tools/execute}"
    echo "   ⚠️  Make sure MCP server is running: cd mcp-server && npm start"
else
    echo "🔧 MCP Server: DISABLED (using Python functions)"
    echo "   - To enable: Set USE_MCP_SERVER=true in .env"
fi

echo ""
echo "✅ Starting bridge service on port $PORT"
echo "   - API: http://localhost:$PORT/v1/chat/completions"
echo "   - Health: http://localhost:$PORT/health"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start the service
python main.py

