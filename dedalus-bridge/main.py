"""
Dedalus Labs Python Bridge Service
Exposes a REST API that wraps the Dedalus Labs Python SDK for use from TypeScript/Node.js
Uses DedalusRunner for full agentic workflows with automatic tool execution and chaining
"""
import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    from dedalus_labs import AsyncDedalus, DedalusRunner
    from agents import run_agent, AGENT_TOOLS, LEAD_AGENT_TOOLS, SETUP_AGENT_TOOLS
except ImportError as e:
    print(f"ERROR: {e}")
    print("Make sure dedalus-labs package is installed: pip install -r requirements.txt")
    AsyncDedalus = None
    DedalusRunner = None
    run_agent = None

app = FastAPI(title="Dedalus Labs Bridge")

# CORS middleware to allow requests from Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str  # "system", "user", "assistant"
    content: str


class ChatCompletionRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    max_tokens: Optional[int] = None
    tools: Optional[List[Dict[str, Any]]] = None
    response_format: Optional[Dict[str, str]] = None


class ChatCompletionResponse(BaseModel):
    content: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None
    model: Optional[str] = None
    provider: str = "dedalus"


def get_dedalus_client():
    """Initialize and return Dedalus client"""
    if AsyncDedalus is None:
        raise HTTPException(
            status_code=500,
            detail="Dedalus Labs SDK not installed. Install with: pip install dedalus-labs"
        )
    
    api_key = "dsk_test_c8ac08a119e9_9c5636dbeef923275547e100a8758e6a"
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="DEDALUS_API_KEY environment variable not set"
        )
    
    return AsyncDedalus(api_key=api_key)


def create_tool_functions(tools: List[Dict[str, Any]]) -> List:
    """
    Convert OpenAI-style tool definitions to Python functions that Dedalus can use.
    These functions will make HTTP calls back to the TypeScript app to execute tools.
    """
    import httpx
    import asyncio
    
    tool_functions = []
    
    for tool_def in tools:
        tool_name = tool_def.get("function", {}).get("name", "")
        tool_description = tool_def.get("function", {}).get("description", "")
        tool_params = tool_def.get("function", {}).get("parameters", {})
        
        if not tool_name:
            continue
        
        # Create a closure to capture the tool_name properly
        def make_tool_wrapper(name: str, desc: str):
            async def tool_function(**kwargs):
                """
                Execute a tool by making an HTTP call to the TypeScript app.
                """
                import httpx
                
                tool_executor_url = os.getenv("TOOL_EXECUTOR_URL", "http://localhost:3001/api/tools/execute")
                
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        response = await client.post(
                            tool_executor_url,
                            json={
                                "tool": name,
                                "arguments": kwargs
                            },
                            headers={
                                "Content-Type": "application/json"
                            }
                        )
                        if response.status_code == 200:
                            data = response.json()
                            return data.get("result", data)
                        else:
                            error_text = response.text
                            return {"error": f"Tool execution failed: {response.status_code} - {error_text}"}
                except Exception as e:
                    return {"error": f"Tool execution error: {str(e)}"}
            
            tool_function.__name__ = name
            tool_function.__doc__ = desc or f"Tool: {name}"
            return tool_function
        
        tool_functions.append(make_tool_wrapper(tool_name, tool_description))
    
    return tool_functions


@app.post("/v1/chat/completions", response_model=ChatCompletionResponse)
async def chat_completions(request: ChatCompletionRequest):
    """
    OpenAI-compatible chat completions endpoint that uses Dedalus Labs SDK
    """
    try:
        client = get_dedalus_client()
        runner = DedalusRunner(client)
        
        # Convert messages to a single input string (Dedalus typically takes a single input)
        # For multi-turn conversations, we'll combine the messages
        user_messages = [msg.content for msg in request.messages if msg.role == "user"]
        system_messages = [msg.content for msg in request.messages if msg.role == "system"]
        
        # Combine system and user messages
        system_prompt = "\n".join(system_messages) if system_messages else None
        user_input = user_messages[-1] if user_messages else ""
        
        # Build input for Dedalus
        # Note: Dedalus runner expects a single input string, not a message array
        # We'll format it as a conversation
        conversation_parts = []
        if system_prompt:
            conversation_parts.append(f"System: {system_prompt}")
        
        # Add conversation history
        for msg in request.messages:
            if msg.role == "assistant":
                conversation_parts.append(f"Assistant: {msg.content}")
            elif msg.role == "user":
                conversation_parts.append(f"User: {msg.content}")
        
        input_text = "\n".join(conversation_parts) if conversation_parts else user_input
        
        # Get model (default from env or use requested)
        model = request.model or os.getenv("DEDALUS_MODEL", "openai/gpt-4o-mini")
        
        # Run with Dedalus
        # Try to use tools if provided - Dedalus may support OpenAI-style schemas
        # or we can create Python function wrappers
        tools_to_use = None
        if request.tools and len(request.tools) > 0:
            # Try to create Python function wrappers for OpenAI-style tools
            tools_to_use = create_tool_functions(request.tools)
        
        result = await runner.run(
            input=input_text,
            model=model,
            tools=tools_to_use,
        )
        
        # Extract response
        content = result.final_output if hasattr(result, 'final_output') else str(result)
        
        # Parse tool calls if present
        # Dedalus returns tool calls in the result when tools are used
        tool_calls = None
        
        # Check for tool calls in various formats Dedalus might return
        if hasattr(result, 'tool_calls') and result.tool_calls:
            # Dedalus may return tool calls directly
            tool_calls = result.tool_calls
        elif hasattr(result, 'function_calls') and result.function_calls:
            # Convert Dedalus function calls to OpenAI format
            tool_calls = []
            for fc in result.function_calls:
                if isinstance(fc, dict):
                    tool_calls.append({
                        "id": fc.get("id", f"call_{len(tool_calls)}"),
                        "type": "function",
                        "function": {
                            "name": fc.get("name", ""),
                            "arguments": json.dumps(fc.get("arguments", {})) if isinstance(fc.get("arguments"), dict) else str(fc.get("arguments", ""))
                        }
                    })
        elif hasattr(result, 'steps') and result.steps:
            # Check if Dedalus returns steps with tool calls
            for step in result.steps:
                if hasattr(step, 'tool_calls') or (isinstance(step, dict) and 'tool_calls' in step):
                    tool_calls = step.get('tool_calls') if isinstance(step, dict) else step.tool_calls
                    break
        
        return ChatCompletionResponse(
            content=content,
            tool_calls=tool_calls,
            model=model,
            provider="dedalus"
        )
        
    except Exception as e:
        error_msg = str(e)
        
        # Check for common error types and provide helpful messages
        if "balance" in error_msg.lower() or "402" in error_msg:
            raise HTTPException(
                status_code=402,
                detail={
                    "error": {
                        "message": "Dedalus Labs account balance is insufficient. Please add credits to your account at https://www.dedaluslabs.ai/dashboard",
                        "type": "insufficient_balance",
                        "code": "negative_balance",
                        "original_error": error_msg
                    }
                }
            )
        elif "401" in error_msg or "unauthorized" in error_msg.lower():
            raise HTTPException(
                status_code=401,
                detail={
                    "error": {
                        "message": "Invalid Dedalus Labs API key. Please check your DEDALUS_API_KEY in the .env file.",
                        "type": "authentication_error",
                        "code": "invalid_api_key",
                        "original_error": error_msg
                    }
                }
            )
        else:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": {
                        "message": f"Dedalus Labs error: {error_msg}",
                        "type": "api_error",
                        "code": "dedalus_error"
                    }
                }
            )


class AgentRequest(BaseModel):
    input: str
    userId: str = "anonymous"
    model: Optional[str] = None
    agent_type: Optional[str] = "agent"  # "agent", "lead", or "setup"
    system_prompt: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None


class AgentResponse(BaseModel):
    output: str
    tool_calls: Optional[List[Dict[str, Any]]] = None
    steps: Optional[List[Any]] = None
    provider: str = "dedalus"


@app.post("/v1/agents/run", response_model=AgentResponse)
async def run_agent_endpoint(request: AgentRequest):
    """
    Run a full agent workflow using DedalusRunner.
    This handles tool execution, chaining, and orchestration automatically.
    """
    import datetime
    timestamp = datetime.datetime.now().isoformat()
    print(f"[BRIDGE DEBUG {timestamp}] 🚀 /v1/agents/run request received", file=__import__("sys").stderr)
    print(f"[BRIDGE DEBUG {timestamp}] 📝 Input: {request.input[:100]}...", file=__import__("sys").stderr)
    print(f"[BRIDGE DEBUG {timestamp}] 👤 User ID: {request.userId}", file=__import__("sys").stderr)
    print(f"[BRIDGE DEBUG {timestamp}] 🤖 Agent type: {request.agent_type}", file=__import__("sys").stderr)
    print(f"[BRIDGE DEBUG {timestamp}] 🤖 Model: {request.model or 'default'}", file=__import__("sys").stderr)
    
    if run_agent is None:
        print(f"[BRIDGE DEBUG {timestamp}] ❌ Agent module not available", file=__import__("sys").stderr)
        raise HTTPException(
            status_code=500,
            detail="Agent module not available. Check imports."
        )
    
    try:
        # Select tools based on agent type
        tools = None
        if request.agent_type == "lead":
            tools = LEAD_AGENT_TOOLS
            print(f"[BRIDGE DEBUG {timestamp}] 🔧 Selected LEAD_AGENT_TOOLS: {len(tools)} tools", file=__import__("sys").stderr)
        elif request.agent_type == "setup":
            tools = SETUP_AGENT_TOOLS
            print(f"[BRIDGE DEBUG {timestamp}] 🔧 Selected SETUP_AGENT_TOOLS: {len(tools)} tools", file=__import__("sys").stderr)
        else:
            tools = AGENT_TOOLS
            print(f"[BRIDGE DEBUG {timestamp}] 🔧 Selected AGENT_TOOLS: {len(tools)} tools", file=__import__("sys").stderr)
        
        # Build input with history if provided
        input_text = request.input
        if request.history:
            # Format history as conversation
            history_parts = []
            for msg in request.history:
                role = msg.get("role", "user")
                text = msg.get("text", msg.get("content", ""))
                history_parts.append(f"{role.capitalize()}: {text}")
            input_text = "\n".join(history_parts) + f"\nUser: {request.input}"
        
        # Build system prompt
        system_prompt = request.system_prompt
        if not system_prompt:
            if request.agent_type == "lead":
                system_prompt = """You are a WhatsApp lead concierge for property rentals. Be warm, concise, and helpful.

SCREENING FIRST: Before helping with properties or scheduling, you MUST collect screening information. Ask these questions ONE AT A TIME:
1. Move-in date
2. Lease term (1 or 2 years)
3. Employment type
4. Number of occupants
5. Budget (SGD)

IMPORTANT SCREENING RULES:
- On FIRST contact, immediately greet and ask the first screening question
- Ask ONE question at a time, wait for answer, then ask the next
- Do NOT ask about properties or scheduling until ALL screening questions are answered
- After getting an answer, acknowledge it briefly ("Got it!") and move to the next question
- Only after ALL screening questions are answered, you can help with properties and scheduling

AFTER SCREENING COMPLETE:
- When users ask about properties, scheduling, or appointments, you MUST use the available tools to get real data
- Always use tools when the user's request requires accessing data or performing actions
- Do not make up information - use tools to get accurate data"""
            elif request.agent_type == "setup":
                system_prompt = """You are an onboarding assistant helping an agent finish setup. Be helpful and guide them through the process.

IMPORTANT: When users need to add properties or create booking links, you MUST use the available tools. Always use tools when the user's request requires performing actions."""
            else:
                system_prompt = """You are a friendly, conversational assistant for a property rental dashboard. Be natural and human-like.

IMPORTANT: When users ask about properties, prospects, scheduling, or appointments, you MUST use the available tools to get real data. Always use tools when the user's request requires accessing data or performing actions. Do not make up information - use tools to get accurate data.

Available tools:
- list_properties: Use when user asks to see, list, or show properties
- top_prospects: Use when user asks about prospects, leads, or top clients
- list_todays_schedule: Use when user asks about schedule, appointments, or calendar
- add_property_from_url: Use when user provides a property URL to import
- create_appointment: Use when user wants to schedule or create an appointment
- build_schedule_link: Use when user needs a booking or scheduling link"""
        
        # Get model - use gpt-5 or gpt-4.1 for better tool calling, fallback to gpt-4o-mini
        default_model = os.getenv("DEDALUS_MODEL", "openai/gpt-5-mini")  # Better tool calling
        model = request.model or default_model
        
        # Check if MCP should be used (default: False for now, until MCP is fully tested)
        use_mcp = os.getenv("USE_MCP_SERVER", "false").lower() == "true"
        print(f"[BRIDGE DEBUG {timestamp}] 🔧 Use MCP: {use_mcp}", file=__import__("sys").stderr)
        
        import time
        start_time = time.time()
        # Run the agent with DedalusRunner
        result = await run_agent(
            input_text=input_text,
            userId=request.userId,
            model=model,
            tools=tools if not use_mcp else None,
            system_prompt=system_prompt,
            use_mcp=use_mcp
        )
        execution_time = int((time.time() - start_time) * 1000)
        
        print(f"[BRIDGE DEBUG {timestamp}] ✅ Agent execution completed ({execution_time}ms)", file=__import__("sys").stderr)
        print(f"[BRIDGE DEBUG {timestamp}] 📤 Output length: {len(result.get('output', ''))} chars", file=__import__("sys").stderr)
        print(f"[BRIDGE DEBUG {timestamp}] 🔧 Tool calls: {len(result.get('tool_calls', []) or [])}", file=__import__("sys").stderr)
        print(f"[BRIDGE DEBUG {timestamp}] 📊 Steps: {len(result.get('steps', []) or [])}", file=__import__("sys").stderr)
        
        response = AgentResponse(
            output=result.get("output", ""),
            tool_calls=result.get("tool_calls"),
            steps=result.get("steps"),
            provider="dedalus"
        )
        
        print(f"[BRIDGE DEBUG {timestamp}] 📤 Returning response to client", file=__import__("sys").stderr)
        return response
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"[BRIDGE DEBUG {timestamp}] ❌ Error occurred: {error_msg}", file=__import__("sys").stderr)
        print(f"[BRIDGE DEBUG {timestamp}] 📋 Traceback:", file=__import__("sys").stderr)
        print(traceback.format_exc(), file=__import__("sys").stderr)
        raise HTTPException(
            status_code=500,
            detail={
                "error": {
                    "message": f"Dedalus agent error: {error_msg}",
                    "type": "agent_error",
                    "code": "dedalus_agent_error"
                }
            }
        )


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "service": "dedalus-bridge"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("DEDALUS_BRIDGE_PORT", "8001"))
    uvicorn.run(app, host="0.0.0.0", port=port)

