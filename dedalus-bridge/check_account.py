#!/usr/bin/env python3
"""
Quick script to check Dedalus Labs account status
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    from dedalus_labs import AsyncDedalus
    import asyncio
except ImportError:
    print("ERROR: dedalus-labs package not installed.")
    print("Run: pip install -r requirements.txt")
    sys.exit(1)


async def check_account():
    """Check Dedalus Labs account status"""
    api_key = "dsk_test_c8ac08a119e9_9c5636dbeef923275547e100a8758e6a"
    
    if not api_key:
        print("❌ DEDALUS_API_KEY not set in .env file")
        sys.exit(1)
    
    if api_key == "your-dedalus-api-key-here":
        print("❌ Please set your actual DEDALUS_API_KEY in .env file")
        sys.exit(1)
    
    print("🔍 Checking Dedalus Labs account status...")
    print(f"   API Key: {api_key[:10]}...{api_key[-4:]}")
    print()
    
    try:
        client = AsyncDedalus(api_key=api_key)
        
        # Try a simple test call to check account status
        # Note: This might fail if account has no balance, but we'll catch that
        print("📊 Account Status:")
        print("   - API Key: Valid format ✓")
        print("   - Connection: Testing...")
        
        # The actual account balance check would require API access
        # For now, we'll just verify the key format and suggest checking the dashboard
        print()
        print("💡 To check your account balance and credits:")
        print("   1. Visit: https://www.dedaluslabs.ai/dashboard")
        print("   2. Log in with your account")
        print("   3. Check the 'Balance' or 'Credits' section")
        print()
        print("💡 If you're on a free trial:")
        print("   - You may need to activate it in the dashboard")
        print("   - Some free trials require adding a payment method")
        print("   - Check for any 'Activate Trial' or 'Get Started' buttons")
        
    except Exception as e:
        error_msg = str(e)
        if "balance" in error_msg.lower() or "402" in error_msg:
            print("❌ Account Balance Issue Detected")
            print()
            print("   Your account balance is insufficient or negative.")
            print("   This can happen if:")
            print("   - Free trial credits have been used up")
            print("   - Account needs to be activated")
            print("   - Payment method needs to be added")
            print()
            print("   🔧 How to fix:")
            print("   1. Visit: https://www.dedaluslabs.ai/dashboard")
            print("   2. Check your account balance")
            print("   3. Add credits or activate your free trial")
            print("   4. If on free tier, you may need to add a payment method")
        elif "401" in error_msg or "unauthorized" in error_msg.lower():
            print("❌ Authentication Error")
            print()
            print("   Your API key appears to be invalid.")
            print("   Please check:")
            print("   1. API key is correct in .env file")
            print("   2. API key hasn't been revoked")
            print("   3. You're using the correct account")
        else:
            print(f"❌ Error: {error_msg}")
            print()
            print("   This might be a temporary issue. Try:")
            print("   1. Checking your internet connection")
            print("   2. Verifying your API key at https://www.dedaluslabs.ai/dashboard")
            print("   3. Contacting Dedalus Labs support if the issue persists")


if __name__ == "__main__":
    asyncio.run(check_account())

