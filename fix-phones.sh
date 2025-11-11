#!/bin/bash
# Quick script to fix phone numbers in database

echo "🔧 Fixing phone numbers..."
curl -X POST http://localhost:3001/api/dev/fix-phones \
  -H "Content-Type: application/json" \
  -w "\n" \
  || echo "Make sure the dev server is running on port 3001"
