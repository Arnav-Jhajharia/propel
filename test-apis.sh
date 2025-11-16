#!/bin/bash

echo "🧪 Testing Agent Rental Dashboard APIs"
echo "======================================"
echo ""

BASE_URL="http://localhost:3001"

echo "1. Testing Properties GET (should be 401 - no auth):"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/api/properties"
echo ""

echo "2. Testing Properties POST (should be 401 - no auth):"
curl -s -w "\nStatus: %{http_code}\n" -X POST "$BASE_URL/api/properties" \
  -H "Content-Type: application/json" \
  -d '{"propertyGuruUrl": "https://www.propertyguru.com.sg/listing/test123"}'
echo ""

echo "3. Testing WhatsApp Send (should be 500 - no credentials):"
curl -s -w "\nStatus: %{http_code}\n" -X POST "$BASE_URL/api/whatsapp/send" \
  -H "Content-Type: application/json" \
  -d '{"to": "6591234567", "text": "Test message"}'
echo ""

echo "4. Testing WhatsApp Webhook Verification (should return challenge):"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-verify-token&hub.challenge=test123"
echo ""

echo "5. Testing Client Details (should be 401 - no auth):"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/api/clients/c1"
echo ""

echo "6. Testing Property Prospects (should be 401 - no auth):"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/api/properties/p1/prospects"
echo ""

echo "7. Testing Root Page (should work):"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/" | head -20
echo ""

echo "✅ API testing complete!"
echo ""
echo "📝 Notes:"
echo "- 401 errors are expected (authentication required)"
echo "- 500 errors for WhatsApp are expected (missing credentials)"
echo "- Webhook verification should return the challenge"
echo "- Root page should load the dashboard"


