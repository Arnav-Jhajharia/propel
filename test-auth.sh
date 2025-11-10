#!/bin/bash

echo "🔐 Testing Authentication System"
echo "==============================="
echo ""

BASE_URL="http://localhost:3001"

echo "1. Testing Auth API Health:"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/api/auth/get-session"
echo ""

echo "2. Testing Sign Up:"
curl -s -w "\nStatus: %{http_code}\n" -X POST "$BASE_URL/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "password": "password123"}'
echo ""

echo "3. Testing Sign In:"
curl -s -w "\nStatus: %{http_code}\n" -X POST "$BASE_URL/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
echo ""

echo "4. Testing Login Page:"
curl -s -w "\nStatus: %{http_code}\n" "$BASE_URL/login" | head -5
echo ""

echo "✅ Auth testing complete!"
echo ""
echo "🌐 Next Steps:"
echo "1. Visit http://localhost:3001/login"
echo "2. Try signing up with: test@example.com / password123"
echo "3. Or sign in with existing credentials"


