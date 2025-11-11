# Dedalus Labs Architecture

## Overview

This project uses **Dedalus Labs** for the entire agentic workflow, separating backend (Dedalus) from frontend (Next.js). Dedalus handles tool execution, chaining, and orchestration automatically.

## Architecture

```
┌─────────────────┐
│   Next.js App   │  (Frontend)
│   (TypeScript)  │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Dedalus Bridge │  (Backend)
│    (Python)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  DedalusRunner  │  (Handles everything!)
│  - Tool exec    │
│  - Tool chaining│
│  - Orchestration│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tool Executor  │  (Back to TypeScript)
│  /api/tools/    │  (For database/API calls)
└─────────────────┘
```

## How It Works

### 1. Frontend (Next.js)
- User sends message → `/api/agent/chat`
- Calls Dedalus Bridge → `/v1/agents/run`
- Returns response to user

### 2. Dedalus Bridge (Python)
- Receives request with `input`, `userId`, `agent_type`
- Uses `DedalusRunner` to run full agent workflow
- **DedalusRunner automatically:**
  - Decides which tools to call
  - Executes tools (Python functions)
  - Chains tools together
  - Handles multi-step workflows
  - Returns final output

### 3. Tool Execution
- Python tool functions call back to TypeScript
- TypeScript executes actual tools (database, APIs)
- Results returned to Dedalus
- Dedalus continues workflow

## Benefits

✅ **Separation of Concerns**: Backend (Dedalus) handles agent logic, Frontend handles UI
✅ **Automatic Tool Chaining**: Dedalus handles complex multi-step workflows
✅ **Tool Orchestration**: DedalusRunner manages tool execution automatically
✅ **Model Flexibility**: Easy to switch models or use multiple models
✅ **MCP Integration**: Can use MCP servers from marketplace
✅ **Scalability**: Backend can be deployed separately

## Agent Types

### Main Agent (`agent_type: "agent"`)
- General assistant for agents
- Tools: properties, prospects, scheduling
- System prompt: Friendly rental dashboard assistant

### Lead Agent (`agent_type: "lead"`)
- WhatsApp lead concierge
- Tools: property import, scheduling, booking
- System prompt: Warm, concise WhatsApp assistant

### Setup Agent (`agent_type: "setup"`)
- Onboarding assistant
- Tools: property import, booking links
- System prompt: Helpful onboarding guide

## API Endpoints

### Run Agent
```bash
POST /v1/agents/run
{
  "input": "Add this property: https://propertyguru.com/...",
  "userId": "user-123",
  "agent_type": "agent",  # or "lead" or "setup"
  "model": "openai/gpt-4o-mini",  # optional
  "system_prompt": "...",  # optional
  "history": [  # optional
    {"role": "user", "text": "Hello"},
    {"role": "assistant", "text": "Hi there!"}
  ]
}
```

### Tool Executor (Internal)
```bash
POST /api/tools/execute
{
  "tool": "add_property_from_url",
  "arguments": {"url": "https://..."},
  "userId": "user-123"
}
```

## Configuration

### Environment Variables

**Bridge Service** (`dedalus-bridge/.env`):
```env
DEDALUS_API_KEY=your-key
DEDALUS_MODEL=openai/gpt-4o-mini
DEDALUS_BRIDGE_PORT=8001
TOOL_EXECUTOR_URL=http://localhost:3000/api/tools/execute
```

**Next.js App** (`.env.local`):
```env
LLM_PROVIDER=dedalus
DEDALUS_BRIDGE_URL=http://localhost:8001
TOOL_EXECUTOR_URL=http://localhost:3000/api/tools/execute
```

## Usage Examples

### Basic Agent Call
```typescript
const response = await fetch('http://localhost:8001/v1/agents/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: "Show my top prospects",
    userId: "user-123",
    agent_type: "agent"
  })
});
```

### With History
```typescript
const response = await fetch('http://localhost:8001/v1/agents/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    input: "What about tomorrow?",
    userId: "user-123",
    agent_type: "agent",
    history: [
      { role: "user", text: "What's my schedule today?" },
      { role: "assistant", text: "You have 2 meetings today..." }
    ]
  })
});
```

## Tool Development

### Adding a New Tool

1. **Add to TypeScript** (`src/app/api/tools/execute/route.ts`):
```typescript
case "my_new_tool":
  result = await myNewTool(args);
  break;
```

2. **Add to Python** (`dedalus-bridge/agents.py`):
```python
async def my_new_tool(param1: str, userId: str = "anonymous") -> Dict[str, Any]:
    """Description of what the tool does."""
    result = await execute_tool("my_new_tool", {"param1": param1}, userId)
    return result
```

3. **Add to Tool List**:
```python
AGENT_TOOLS = [
    # ... existing tools
    my_new_tool,
]
```

## References

- [Dedalus Labs Documentation](https://docs.dedaluslabs.ai/)
- [Dedalus Examples](https://docs.dedaluslabs.ai/examples/01-hello-world)
- [Tool Chaining Example](https://docs.dedaluslabs.ai/examples/07-tool-chaining)

