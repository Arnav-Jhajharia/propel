#!/bin/bash

# Quick test script for Dedalus Labs integration

echo "🧪 Testing Dedalus Labs Integration"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check if bridge service is running
echo "1️⃣  Checking if bridge service is running..."
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Bridge service is running${NC}"
    HEALTH=$(curl -s http://localhost:8001/health)
    echo "   Response: $HEALTH"
else
    echo -e "${RED}❌ Bridge service is NOT running${NC}"
    echo ""
    echo "   Please start it first:"
    echo "   cd dedalus-bridge && ./start.sh"
    echo ""
    exit 1
fi

echo ""

# Step 2: Test bridge service directly
echo "2️⃣  Testing bridge service chat completions..."
RESPONSE=$(curl -s -X POST http://localhost:8001/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Say hello in one sentence"}
    ],
    "model": "openai/gpt-4o-mini"
  }')

if echo "$RESPONSE" | grep -q "content"; then
    echo -e "${GREEN}✅ Bridge service responded successfully${NC}"
    echo "   Response preview: $(echo $RESPONSE | head -c 100)..."
else
    echo -e "${RED}❌ Bridge service returned an error${NC}"
    echo "   Response: $RESPONSE"
    exit 1
fi

echo ""

# Step 3: Check environment variables
echo "3️⃣  Checking environment variables..."
if [ -f ".env.local" ]; then
    if grep -q "LLM_PROVIDER=dedalus" .env.local; then
        echo -e "${GREEN}✅ LLM_PROVIDER is set to dedalus${NC}"
    else
        echo -e "${YELLOW}⚠️  LLM_PROVIDER is not set to dedalus${NC}"
        echo "   Add to .env.local: LLM_PROVIDER=dedalus"
    fi
    
    if grep -q "DEDALUS_BRIDGE_URL" .env.local; then
        echo -e "${GREEN}✅ DEDALUS_BRIDGE_URL is set${NC}"
    else
        echo -e "${YELLOW}⚠️  DEDALUS_BRIDGE_URL not set (will use default: http://localhost:8001)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env.local file not found${NC}"
    echo "   Create .env.local with:"
    echo "   LLM_PROVIDER=dedalus"
    echo "   DEDALUS_BRIDGE_URL=http://localhost:8001"
fi

echo ""

# Step 4: Test via Next.js API (if server is running)
echo "4️⃣  Testing via Next.js API..."
if curl -s http://localhost:3000/api/agent/chat > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Next.js server is running${NC}"
    echo ""
    echo "   You can test the agent by:"
    echo "   - Visiting http://localhost:3000/chat"
    echo "   - Or running: curl -X POST http://localhost:3000/api/agent/chat \\"
    echo "       -H 'Content-Type: application/json' \\"
    echo "       -d '{\"message\": \"Hello, can you help me?\"}'"
else
    echo -e "${YELLOW}⚠️  Next.js server is not running${NC}"
    echo "   Start it with: npm run dev"
fi

echo ""
echo "===================================="
echo -e "${GREEN}✅ Basic tests completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Make sure LLM_PROVIDER=dedalus in your .env.local"
echo "2. Start your Next.js app: npm run dev"
echo "3. Test the chat interface at http://localhost:3000/chat"
echo "4. Check logs to see 'provider=dedalus' messages"

