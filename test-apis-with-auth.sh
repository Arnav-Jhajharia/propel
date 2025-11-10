#!/bin/bash

echo "🧪 Testing Agent Rental Dashboard APIs with Authentication"
echo "========================================================"
echo ""

BASE_URL="http://localhost:3001"

echo "📝 Note: These tests will show 401 errors because we need to authenticate first."
echo "Visit http://localhost:3001/login to create an account or sign in."
echo ""

echo "1. Testing Root Page (should redirect to login):"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/" | head -5
echo ""

echo "2. Testing Login Page (should work):"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/login" | head -5
echo ""

echo "3. Testing Properties GET (should be 401 - no auth):"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/api/properties"
echo ""

echo "4. Testing WhatsApp Webhook Verification (should work - no auth needed):"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=dev-verify-token&hub.challenge=test123"
echo ""

echo "5. Testing WhatsApp Send (should be 500 - no credentials):"
curl -s -w "\nStatus: %{http_code}\n" -X POST "$BASE_URL/api/whatsapp/send" \
  -H "Content-Type: application/json" \
  -d '{"to": "6591234567", "text": "Test message"}'
echo ""

echo "✅ API testing complete!"
echo ""
echo "🔐 Next Steps:"
echo "1. Visit http://localhost:3001/login"
echo "2. Create an account or sign in with:"
echo "   - Email: agent@example.com"
echo "   - Password: password123"
echo "3. You'll be redirected to the dashboard"
echo "4. The APIs will then work with proper authentication"
echo ""
echo "📊 Database Studio: https://local.drizzle.studio"


