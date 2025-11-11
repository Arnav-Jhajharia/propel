# Dedalus Labs Full Workflow Setup

## Overview

This project now uses **Dedalus Labs** for the entire agentic workflow, separating backend (Dedalus) from frontend (Next.js). Dedalus handles tool execution, chaining, and orchestration automatically using `DedalusRunner`.

## Architecture

Based on the [Dedalus Labs documentation](https://docs.dedaluslabs.ai/llms-full.txt), we use:

- **DedalusRunner**: Handles full agent workflows automatically
- **Python Functions**: Tools are Python functions that call back to TypeScript
- **Tool Chaining**: Dedalus automatically chains tools together
- **MCP Servers**: Can use MCP servers from marketplace (future)

## Setup

### 1. Install Python Dependencies

```bash
cd dedalus-bridge
pip install -r requirements.txt
```

### 2. Configure Environment

**Bridge Service** (`dedalus-bridge/.env`):
```env
DEDALUS_API_KEY=your-dedalus-api-key
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

### 3. Start Services

**Terminal 1 - Bridge Service:**
```bash
cd dedalus-bridge
./start.sh
```

**Terminal 2 - Next.js App:**
```bash
npm run dev
```

## How It Works

### 1. User Request
```
User → Next.js → /api/agent/chat
```

### 2. Dedalus Agent
```
Next.js → Dedalus Bridge → /v1/agents/run
```

### 3. DedalusRunner
```
DedalusRunner.run(
    input="Add this property: https://...",
    model="openai/gpt-4o-mini",
    tools=[add_property_from_url, list_properties, ...]
)
```

### 4. Tool Execution
```
Dedalus → Python Tool Function → TypeScript Tool Executor → Database/APIs
```

### 5. Response
```
Dedalus → Bridge → Next.js → User
```

## Agent Types

### Main Agent
```typescript
POST /v1/agents/run
{
  "input": "Show my top prospects",
  "userId": "user-123",
  "agent_type": "agent"
}
```

### Lead Agent
```typescript
POST /v1/agents/run
{
  "input": "I'm interested in this property: https://...",
  "userId": "user-123",
  "agent_type": "lead"
}
```

### Setup Agent
```typescript
POST /v1/agents/run
{
  "input": "What do I need to do next?",
  "userId": "user-123",
  "agent_type": "setup"
}
```

## Benefits

✅ **Full Workflow Handling**: DedalusRunner handles tool execution, chaining, and orchestration
✅ **Backend Separation**: Backend (Dedalus) separate from frontend (Next.js)
✅ **Automatic Tool Chaining**: Dedalus automatically chains tools together
✅ **Model Flexibility**: Easy to switch models or use multiple models
✅ **MCP Integration**: Can use MCP servers from marketplace
✅ **Scalability**: Backend can be deployed separately

## Testing

### Test Bridge Service
```bash
curl http://localhost:8001/health
```

### Test Agent
```bash
curl -X POST http://localhost:8001/v1/agents/run \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello, can you help me?",
    "userId": "test-user",
    "agent_type": "agent"
  }'
```

### Test Through Next.js
```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Show my top prospects"
  }'
```

## References

- [Dedalus Labs Documentation](https://docs.dedaluslabs.ai/)
- [Dedalus Examples](https://docs.dedaluslabs.ai/examples/01-hello-world)
- [Tool Chaining Example](https://docs.dedaluslabs.ai/examples/07-tool-chaining)
- [MCP Integration](https://docs.dedaluslabs.ai/examples/04-mcp-integration)

