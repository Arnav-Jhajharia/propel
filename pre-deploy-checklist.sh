#!/bin/bash

# Pre-Deployment Checklist Script
# Run this before deploying to production

set -e

echo "🚀 Pre-Deployment Checklist for Production"
echo "==========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN++))
}

echo "1. Checking Environment Variables..."
echo "-----------------------------------"

if [ -f ".env.local" ]; then
    check_pass ".env.local file exists"
    
    # Check critical variables
    if grep -q "DATABASE_URL" .env.local && ! grep -q "file:./local.db" .env.local; then
        check_pass "DATABASE_URL is set (production)"
    else
        check_fail "DATABASE_URL not set or still using local.db"
    fi
    
    if grep -q "DATABASE_AUTH_TOKEN" .env.local; then
        check_pass "DATABASE_AUTH_TOKEN is set"
    else
        check_warn "DATABASE_AUTH_TOKEN not set (needed for Turso)"
    fi
    
    if grep -q "OPENAI_API_KEY=sk-" .env.local; then
        check_pass "OPENAI_API_KEY is set"
    else
        check_fail "OPENAI_API_KEY is not set"
    fi
    
    if grep -q "ENCRYPTION_KEY=.\\{32,\\}" .env.local; then
        check_pass "ENCRYPTION_KEY is set (32+ chars)"
    else
        check_fail "ENCRYPTION_KEY not set or too short (generate with: openssl rand -hex 32)"
    fi
    
    if grep -q "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" .env.local; then
        check_pass "Clerk publishable key is set"
    else
        check_fail "Clerk publishable key not set"
    fi
    
    if grep -q "CLERK_SECRET_KEY" .env.local; then
        check_pass "Clerk secret key is set"
    else
        check_fail "Clerk secret key not set"
    fi
else
    check_fail ".env.local file not found"
fi

echo ""
echo "2. Checking Dependencies..."
echo "---------------------------"

if [ -f "package.json" ]; then
    check_pass "package.json exists"
    
    if [ -d "node_modules" ]; then
        check_pass "node_modules installed"
    else
        check_fail "node_modules not found (run: npm install)"
    fi
else
    check_fail "package.json not found"
fi

echo ""
echo "3. Testing Build..."
echo "-------------------"

echo "Running: npm run build"
if npm run build > /dev/null 2>&1; then
    check_pass "Build successful"
else
    check_fail "Build failed (run 'npm run build' to see errors)"
fi

echo ""
echo "4. Checking Git Status..."
echo "-------------------------"

if [ -d ".git" ]; then
    check_pass "Git repository initialized"
    
    if git remote -v | grep -q "origin"; then
        check_pass "Git remote 'origin' is set"
    else
        check_warn "Git remote not set (needed for Vercel deployment)"
    fi
    
    # Check for uncommitted changes
    if [ -z "$(git status --porcelain)" ]; then
        check_pass "No uncommitted changes"
    else
        check_warn "Uncommitted changes detected"
    fi
else
    check_fail "Not a git repository"
fi

echo ""
echo "5. Checking Security..."
echo "-----------------------"

if [ -f ".gitignore" ]; then
    if grep -q ".env.local" .gitignore; then
        check_pass ".env.local in .gitignore"
    else
        check_fail ".env.local NOT in .gitignore (SECURITY RISK!)"
    fi
    
    if grep -q "local.db" .gitignore; then
        check_pass "local.db in .gitignore"
    else
        check_warn "local.db not in .gitignore"
    fi
else
    check_fail ".gitignore not found"
fi

# Check if sensitive files are tracked
if git ls-files | grep -q ".env.local"; then
    check_fail ".env.local is tracked by git (REMOVE IT!)"
else
    check_pass ".env.local not tracked by git"
fi

echo ""
echo "6. Checking Next.js Configuration..."
echo "-------------------------------------"

if [ -f "next.config.ts" ] || [ -f "next.config.js" ]; then
    check_pass "Next.js config file exists"
else
    check_warn "Next.js config file not found"
fi

echo ""
echo "7. Database Schema Check..."
echo "----------------------------"

if [ -f "drizzle.config.ts" ]; then
    check_pass "Drizzle config exists"
else
    check_fail "Drizzle config not found"
fi

if [ -d "drizzle" ]; then
    check_pass "Drizzle migrations folder exists"
else
    check_warn "No migrations folder (run: npm run db:generate)"
fi

echo ""
echo "========================================="
echo "Summary:"
echo "========================================="
echo -e "${GREEN}Passed:${NC} $PASS"
echo -e "${YELLOW}Warnings:${NC} $WARN"
echo -e "${RED}Failed:${NC} $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ Ready for deployment!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Push to GitHub: git push origin main"
    echo "2. Import to Vercel: https://vercel.com/new"
    echo "3. Add environment variables in Vercel dashboard"
    echo "4. Deploy!"
    exit 0
else
    echo -e "${RED}✗ Not ready for deployment${NC}"
    echo "Please fix the failed checks above before deploying."
    exit 1
fi

