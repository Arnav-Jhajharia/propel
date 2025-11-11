"""
Dedalus Agents - Full agentic workflows using DedalusRunner
This handles the entire agent workflow including tool execution and chaining
"""
import os
import json
import httpx
from typing import Optional, Dict, Any, List
from dedalus_labs import AsyncDedalus, DedalusRunner

# Tool executor URL for calling back to TypeScript
TOOL_EXECUTOR_URL = os.getenv("TOOL_EXECUTOR_URL", "http://localhost:3001/api/tools/execute")


async def execute_tool(tool_name: str, arguments: Dict[str, Any], userId: str = "anonymous") -> Any:
    """
    Execute a tool by making an HTTP call to the TypeScript app.
    This allows Python functions to call TypeScript tools.
    """
    import datetime
    timestamp = datetime.datetime.now().isoformat()
    print(f"[DEDALUS DEBUG {timestamp}] 🔧 Executing tool: {tool_name}", file=__import__("sys").stderr)
    print(f"[DEDALUS DEBUG {timestamp}] 📋 Arguments: {json.dumps(arguments, indent=2)}", file=__import__("sys").stderr)
    print(f"[DEDALUS DEBUG {timestamp}] 👤 User ID: {userId}", file=__import__("sys").stderr)
    print(f"[DEDALUS DEBUG {timestamp}] 🌐 Calling: {TOOL_EXECUTOR_URL}", file=__import__("sys").stderr)
    
    try:
        start_time = __import__("time").time()
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                TOOL_EXECUTOR_URL,
                json={
                    "tool": tool_name,
                    "arguments": arguments,
                    "userId": userId
                },
                headers={"Content-Type": "application/json"}
            )
            latency_ms = int((__import__("time").time() - start_time) * 1000)
            print(f"[DEDALUS DEBUG {timestamp}] ⏱️  HTTP Response: {response.status_code} ({latency_ms}ms)", file=__import__("sys").stderr)
            
            if response.status_code == 200:
                data = response.json()
                result = data.get("result", data)
                print(f"[DEDALUS DEBUG {timestamp}] ✅ Tool result: {json.dumps(result, indent=2, default=str)}", file=__import__("sys").stderr)
                return result
            else:
                error_text = response.text
                print(f"[DEDALUS DEBUG {timestamp}] ❌ Tool execution failed: {response.status_code} - {error_text}", file=__import__("sys").stderr)
                return {"error": f"Tool execution failed: {response.status_code} - {error_text}"}
    except Exception as e:
        print(f"[DEDALUS DEBUG {timestamp}] ❌ Tool execution error: {str(e)}", file=__import__("sys").stderr)
        return {"error": f"Tool execution error: {str(e)}"}


# Define Python tool functions that Dedalus can use
# These call back to TypeScript to execute the actual tools

async def add_property_from_url(url: str, userId: str = "anonymous") -> Dict[str, Any]:
    """Import a property listing by URL (PropertyGuru or 99.co)."""
    result = await execute_tool("add_property_from_url", {"url": url}, userId)
    return result


async def list_properties(userId: str = "anonymous", limit: int = 10) -> Dict[str, Any]:
    """List the user's recent properties. Use this tool when the user asks to see, list, show, or view their properties."""
    result = await execute_tool("list_properties", {}, userId)
    return result


async def list_top_prospects(userId: str = "anonymous", limit: int = 5) -> Dict[str, Any]:
    """Show the user's top prospects. Use this tool when the user asks about prospects, leads, top clients, or best matches."""
    result = await execute_tool("top_prospects", {}, userId)
    return result


async def list_todays_schedule(userId: str = "anonymous", date: str = "today") -> Dict[str, Any]:
    """List the user's appointments for a specific date. Use this tool when the user asks about schedule, appointments, calendar, meetings, or what's on their calendar."""
    result = await execute_tool("list_todays_schedule", {"date": date}, userId)
    return result


async def build_schedule_link(userId: str = "anonymous", name: Optional[str] = None, 
                             email: Optional[str] = None, phone: Optional[str] = None) -> Dict[str, Any]:
    """Build a shareable schedule page link with optional prefill."""
    result = await execute_tool("build_schedule_link", {
        "name": name,
        "email": email,
        "phone": phone
    }, userId)
    return result


async def create_appointment(userId: str = "anonymous", title: Optional[str] = None,
                            description: Optional[str] = None, startTime: str = "",
                            endTime: str = "", inviteeName: Optional[str] = None,
                            inviteeEmail: Optional[str] = None, inviteePhone: Optional[str] = None) -> Dict[str, Any]:
    """Create an appointment in the app, and also in Google Calendar if connected."""
    result = await execute_tool("create_appointment", {
        "title": title,
        "description": description,
        "startTime": startTime,
        "endTime": endTime,
        "inviteeName": inviteeName,
        "inviteeEmail": inviteeEmail,
        "inviteePhone": inviteePhone
    }, userId)
    return result


# Agent tool lists for different use cases
AGENT_TOOLS = [
    add_property_from_url,
    list_properties,
    list_top_prospects,
    list_todays_schedule,
    build_schedule_link,
    create_appointment,
]

LEAD_AGENT_TOOLS = [
    add_property_from_url,
    list_todays_schedule,
    build_schedule_link,
    create_appointment,
]

SETUP_AGENT_TOOLS = [
    add_property_from_url,
    build_schedule_link,
]


async def run_agent(input_text: str, userId: str = "anonymous", 
                   model: str = "openai/gpt-5-mini",  # Better tool calling
                   tools: Optional[List] = None,
                   system_prompt: Optional[str] = None,
                   use_mcp: bool = True) -> Dict[str, Any]:
    """
    Run a full agent workflow using DedalusRunner.
    This handles tool execution, chaining, and orchestration automatically.
    
    Args:
        input_text: User input message
        userId: User ID for tool execution
        model: Model to use (e.g., "openai/gpt-4o-mini")
        tools: Optional list of Python tool functions (if not using MCP)
        system_prompt: Optional system prompt
        use_mcp: If True, use MCP server for tools. If False, use Python functions.
    """
    import datetime
    import time
    timestamp = datetime.datetime.now().isoformat()
    print(f"[DEDALUS DEBUG {timestamp}] 🚀 Starting agent run", file=__import__("sys").stderr)
    print(f"[DEDALUS DEBUG {timestamp}] 📝 Input: {input_text[:100]}...", file=__import__("sys").stderr)
    print(f"[DEDALUS DEBUG {timestamp}] 👤 User ID: {userId}", file=__import__("sys").stderr)
    print(f"[DEDALUS DEBUG {timestamp}] 🤖 Model: {model}", file=__import__("sys").stderr)
    print(f"[DEDALUS DEBUG {timestamp}] 🔧 Use MCP: {use_mcp}", file=__import__("sys").stderr)
    
    client = AsyncDedalus()
    runner = DedalusRunner(client)
    print(f"[DEDALUS DEBUG {timestamp}] ✅ Dedalus client and runner initialized", file=__import__("sys").stderr)
    
    # Build the full input with system prompt if provided
    if system_prompt:
        full_input = f"{system_prompt}\n\nUser: {input_text}"
        print(f"[DEDALUS DEBUG {timestamp}] 📋 System prompt provided: {system_prompt[:50]}...", file=__import__("sys").stderr)
    else:
        full_input = input_text
        print(f"[DEDALUS DEBUG {timestamp}] 📋 No system prompt", file=__import__("sys").stderr)
    
    # Use MCP server for backend tools (recommended)
    if use_mcp:
        # Get MCP server URL from environment
        mcp_server_url = os.getenv("MCP_SERVER_URL", "local/rental-dashboard-mcp")
        print(f"[DEDALUS DEBUG {timestamp}] 🔗 MCP Server URL: {mcp_server_url}", file=__import__("sys").stderr)
        print(f"[DEDALUS DEBUG {timestamp}] 🎯 Running with MCP server - Dedalus will discover tools automatically", file=__import__("sys").stderr)
        
        start_time = time.time()
        # Run with MCP server - Dedalus handles everything!
        # The MCP server exposes all backend tools directly
        result = await runner.run(
            input=full_input,
            model=model,
            mcp_servers=[mcp_server_url],  # Use MCP server for backend tools
            stream=False
        )
        execution_time = int((time.time() - start_time) * 1000)
        
        print(f"[DEDALUS DEBUG {timestamp}] ✅ Dedalus execution completed ({execution_time}ms)", file=__import__("sys").stderr)
        print(f"[DEDALUS DEBUG {timestamp}] 📤 Final output: {str(result.final_output if hasattr(result, 'final_output') else result)[:200]}...", file=__import__("sys").stderr)
        
        tool_calls = getattr(result, 'tool_calls', None)
        if tool_calls:
            print(f"[DEDALUS DEBUG {timestamp}] 🔧 Tool calls detected: {len(tool_calls)}", file=__import__("sys").stderr)
            for i, tc in enumerate(tool_calls):
                print(f"[DEDALUS DEBUG {timestamp}]   Tool {i+1}: {json.dumps(tc, indent=2, default=str)}", file=__import__("sys").stderr)
        else:
            print(f"[DEDALUS DEBUG {timestamp}] ⚠️  No tool calls detected", file=__import__("sys").stderr)
        
        steps = getattr(result, 'steps', None)
        if steps:
            print(f"[DEDALUS DEBUG {timestamp}] 📊 Execution steps: {len(steps)}", file=__import__("sys").stderr)
            for i, step in enumerate(steps):
                print(f"[DEDALUS DEBUG {timestamp}]   Step {i+1}: {str(step)[:200]}...", file=__import__("sys").stderr)
    else:
        # Fallback: Use Python functions (current approach)
        tools_to_use = tools or AGENT_TOOLS
        print(f"[DEDALUS DEBUG {timestamp}] 🔧 Using Python functions: {len(tools_to_use)} tools", file=__import__("sys").stderr)
        print(f"[DEDALUS DEBUG {timestamp}] 📋 Tools: {[t.__name__ for t in tools_to_use]}", file=__import__("sys").stderr)
        
        # Create tool functions with userId bound
        bound_tools = []
        for tool_func in tools_to_use:
            def make_bound_tool(original_tool, user_id):
                async def bound_tool(*args, **kwargs):
                    if 'userId' in original_tool.__code__.co_varnames:
                        kwargs['userId'] = user_id
                    return await original_tool(*args, **kwargs)
                bound_tool.__name__ = original_tool.__name__
                bound_tool.__doc__ = original_tool.__doc__
                return bound_tool
            
            bound_tool = make_bound_tool(tool_func, userId)
            bound_tools.append(bound_tool)
        
        print(f"[DEDALUS DEBUG {timestamp}] ✅ Bound {len(bound_tools)} tools with userId", file=__import__("sys").stderr)
        
        start_time = time.time()
        # Run with Python tools
        result = await runner.run(
            input=full_input,
            model=model,
            tools=bound_tools,
            stream=False
        )
        execution_time = int((time.time() - start_time) * 1000)
        
        print(f"[DEDALUS DEBUG {timestamp}] ✅ Dedalus execution completed ({execution_time}ms)", file=__import__("sys").stderr)
    
    final_result = {
        "output": result.final_output if hasattr(result, 'final_output') else str(result),
        "tool_calls": getattr(result, 'tool_calls', None),
        "steps": getattr(result, 'steps', None),
    }
    
    print(f"[DEDALUS DEBUG {timestamp}] 📤 Returning result", file=__import__("sys").stderr)
    return final_result

