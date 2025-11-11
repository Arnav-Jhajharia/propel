"""
Test script to verify Dedalus is using MCP servers
"""
import asyncio
import os
from dedalus_labs import AsyncDedalus, DedalusRunner
from dotenv import load_dotenv

load_dotenv()

async def test_mcp_server(mcp_server_name: str, test_input: str):
    """
    Test if Dedalus is using an MCP server
    
    Args:
        mcp_server_name: Name of MCP server (e.g., "windsor/brave-search-mcp")
        test_input: Test input that should trigger tool usage
    """
    print(f"\n🧪 Testing MCP Server: {mcp_server_name}")
    print(f"📝 Test Input: {test_input}")
    print("-" * 60)
    
    client = AsyncDedalus()
    runner = DedalusRunner(client)
    
    try:
        result = await runner.run(
            input=test_input,
            model="openai/gpt-5-mini",
            mcp_servers=[mcp_server_name],
            stream=False
        )
        
        print(f"\n✅ Success! Dedalus executed with MCP server")
        print(f"\n📤 Output:")
        print(result.final_output if hasattr(result, 'final_output') else str(result))
        
        # Check for tool calls
        if hasattr(result, 'tool_calls') and result.tool_calls:
            print(f"\n🔧 Tool Calls Detected: {len(result.tool_calls)}")
            for i, tool_call in enumerate(result.tool_calls, 1):
                print(f"  {i}. {tool_call}")
        elif hasattr(result, 'function_calls') and result.function_calls:
            print(f"\n🔧 Function Calls Detected: {len(result.function_calls)}")
            for i, func_call in enumerate(result.function_calls, 1):
                print(f"  {i}. {func_call}")
        else:
            print(f"\n⚠️  No tool calls detected - MCP server might not be working")
            print(f"   (This could mean the model didn't need tools, or MCP isn't connected)")
        
        # Check for steps (tool execution history)
        if hasattr(result, 'steps') and result.steps:
            print(f"\n📊 Execution Steps: {len(result.steps)}")
            for i, step in enumerate(result.steps, 1):
                print(f"  Step {i}: {step}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print(f"\n💡 This might mean:")
        print(f"   - MCP server name is incorrect")
        print(f"   - MCP server is not available/registered")
        print(f"   - Dedalus API key is invalid")
        return False


async def test_local_mcp_server():
    """Test our local rental-dashboard MCP server"""
    print("\n" + "=" * 60)
    print("🏠 Testing LOCAL MCP Server (rental-dashboard-mcp)")
    print("=" * 60)
    
    # Note: Local MCP servers might need different format
    # Try different formats to see what works
    test_formats = [
        "local/rental-dashboard-mcp",
        "rental-dashboard-mcp",
        "http://localhost:8002/mcp",  # If using HTTP transport
    ]
    
    for mcp_format in test_formats:
        print(f"\n🔍 Trying format: {mcp_format}")
        success = await test_mcp_server(
            mcp_format,
            "List my properties"
        )
        if success:
            print(f"\n✅ Format '{mcp_format}' works!")
            return True
    
    print(f"\n⚠️  None of the formats worked. Check MCP server setup.")
    return False


async def test_marketplace_mcp_server():
    """Test a marketplace MCP server (brave-search)"""
    print("\n" + "=" * 60)
    print("🌐 Testing MARKETPLACE MCP Server (windsor/brave-search-mcp)")
    print("=" * 60)
    
    success = await test_mcp_server(
        "windsor/brave-search-mcp",
        "Search for the latest news about AI"
    )
    
    if success:
        print(f"\n✅ Marketplace MCP server is working!")
    else:
        print(f"\n⚠️  Marketplace MCP server might not be available")
        print(f"   Check if you need to register or authenticate")
    
    return success


async def main():
    """Run all MCP tests"""
    print("=" * 60)
    print("🧪 Dedalus MCP Server Verification Tests")
    print("=" * 60)
    
    # Test marketplace MCP server first (should work if Dedalus supports it)
    marketplace_works = await test_marketplace_mcp_server()
    
    # Test local MCP server
    local_works = await test_local_mcp_server()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    print(f"Marketplace MCP: {'✅ Working' if marketplace_works else '❌ Not Working'}")
    print(f"Local MCP:       {'✅ Working' if local_works else '❌ Not Working'}")
    
    if marketplace_works:
        print("\n💡 Dedalus MCP support is working!")
        print("   Your local MCP server should work once properly configured.")
    else:
        print("\n⚠️  Dedalus MCP support might not be working")
        print("   Check your Dedalus API key and account status.")


if __name__ == "__main__":
    asyncio.run(main())

