#!/bin/bash

# Test script for Lead Agent functionality
# Tests if the lead agent behaves the same with the new provider wrapper

echo "🧪 Testing Lead Agent"
echo "===================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Next.js server is running
echo "1️⃣  Checking if Next.js server is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Next.js server is running${NC}"
else
    echo -e "${RED}❌ Next.js server is not running${NC}"
    echo "   Start it with: npm run dev"
    exit 1
fi

echo ""

# Test 1: Simple greeting
echo "2️⃣  Test 1: Simple greeting (no tools needed)"
RESPONSE1=$(curl -s -X POST http://localhost:3000/api/lead-agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, I am looking for a rental property"
  }')

if echo "$RESPONSE1" | grep -q "reply"; then
    echo -e "${GREEN}✅ Lead agent responded${NC}"
    echo "   Response: $(echo $RESPONSE1 | grep -o '"reply":"[^"]*"' | head -1)"
else
    echo -e "${RED}❌ Lead agent failed${NC}"
    echo "   Response: $RESPONSE1"
fi

echo ""

# Test 2: Property URL (tests tool calling)
echo "3️⃣  Test 2: Property URL (tests tool calling)"
RESPONSE2=$(curl -s -X POST http://localhost:3000/api/lead-agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I am interested in this property: https://www.propertyguru.com.sg/listing/for-rent-example"
  }')

if echo "$RESPONSE2" | grep -q "reply"; then
    echo -e "${GREEN}✅ Lead agent responded to property URL${NC}"
    echo "   Response: $(echo $RESPONSE2 | grep -o '"reply":"[^"]*"' | head -1)"
    
    # Check if it tried to use tools
    if echo "$RESPONSE2" | grep -q "add_property_from_url"; then
        echo -e "${GREEN}✅ Tool calling detected${NC}"
    else
        echo -e "${YELLOW}⚠️  Tool calling may not have been triggered${NC}"
    fi
else
    echo -e "${RED}❌ Lead agent failed${NC}"
    echo "   Response: $RESPONSE2"
fi

echo ""

# Test 3: Property question (tests context handling)
echo "4️⃣  Test 3: Property question (tests context)"
RESPONSE3=$(curl -s -X POST http://localhost:3000/api/lead-agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the price of this property?",
    "history": [
      {"role": "user", "text": "I am interested in this property: https://www.propertyguru.com.sg/listing/for-rent-example"},
      {"role": "assistant", "text": "Got the link, let me check the details."}
    ]
  }')

if echo "$RESPONSE3" | grep -q "reply"; then
    echo -e "${GREEN}✅ Lead agent handled context${NC}"
    echo "   Response: $(echo $RESPONSE3 | grep -o '"reply":"[^"]*"' | head -1)"
else
    echo -e "${RED}❌ Lead agent failed${NC}"
    echo "   Response: $RESPONSE3"
fi

echo ""
echo "===================================="
echo "Summary:"
echo "- Lead agent should behave the same as before"
echo "- Tool calling may have limitations with Dedalus"
echo "- If using LLM_PROVIDER=dedalus, tool calling might not work yet"
echo "- Use LLM_PROVIDER=openai to test full functionality first"
echo ""
echo "To test in the UI:"
echo "1. Visit http://localhost:3000/chat"
echo "2. Or use the WhatsApp simulator if available"

