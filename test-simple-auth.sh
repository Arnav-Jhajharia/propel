#!/bin/bash

echo "🔐 Testing Simple Authentication System"
echo "======================================"
echo ""

BASE_URL="http://localhost:3000"

echo "1. Testing Sign Up:"
curl -s -X POST "$BASE_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123","name":"Demo User"}' | jq .
echo ""

echo "2. Testing Sign In:"
curl -s -X POST "$BASE_URL/api/auth/signin" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"password123"}' \
  -c cookies.txt | jq .
echo ""

echo "3. Testing Session:"
curl -s -X GET "$BASE_URL/api/auth/session" -b cookies.txt | jq .
echo ""

echo "4. Testing Protected API (Properties):"
curl -s -X GET "$BASE_URL/api/properties" -b cookies.txt | jq .
echo ""

echo "5. Testing Sign Out:"
curl -s -X POST "$BASE_URL/api/auth/signout" -b cookies.txt | jq .
echo ""

echo "6. Testing Session After Sign Out:"
curl -s -X GET "$BASE_URL/api/auth/session" -b cookies.txt | jq .
echo ""

echo "✅ Simple authentication testing complete!"
echo ""
echo "🌐 Next Steps:"
echo "1. Visit http://localhost:3000/login"
echo "2. Try signing up with: demo@example.com / password123"
echo "3. Or sign in with existing credentials"
echo "4. You should be redirected to the dashboard"


