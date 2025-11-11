"""
Simple test to verify if Dedalus is using MCP servers
Run this to check if brave-search-mcp (or any MCP server) is working
"""
import asyncio
import os
from dedalus_labs import AsyncDedalus, DedalusRunner
from dotenv import load_dotenv

load_dotenv()

async def main():
    client = AsyncDedalus()
    runner = DedalusRunner(client)
    
    # Test with marketplace MCP server
    print("Testing with windsor/brave-search-mcp...")
    print("If this works, Dedalus is using the MCP server!")
    print("-" * 60)
    
    result = await runner.run(
        input="Search for the latest news about AI",
        model="openai/gpt-5-mini",
        mcp_servers=["windsor/brave-search-mcp"],  # Marketplace MCP server
        stream=False
    )
    
    print("\n✅ Response received!")
    print(f"\nOutput: {result.final_output}")
    
    # Check if tools were used
    if hasattr(result, 'tool_calls') and result.tool_calls:
        print(f"\n🔧 Tools were called: {result.tool_calls}")
        print("✅ MCP server is working!")
    elif hasattr(result, 'function_calls') and result.function_calls:
        print(f"\n🔧 Functions were called: {result.function_calls}")
        print("✅ MCP server is working!")
    else:
        print("\n⚠️  No tool calls detected")
        print("   (This might be normal if the model didn't need tools)")

if __name__ == "__main__":
    asyncio.run(main())

