# MCP Server Setup for Dedalus Backend Access

## Overview

This MCP (Model Context Protocol) server exposes your backend tools directly to Dedalus Labs, giving Dedalus native access to your backend without HTTP callbacks.

## Architecture

```
┌─────────────────┐
│  Dedalus Labs   │
└────────┬────────┘
         │ MCP Protocol
         ▼
┌─────────────────┐
│   MCP Server    │  (TypeScript)
│  (mcp-server/)  │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Tool Executor  │  (Next.js API)
│ /api/tools/     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Backend       │  (Database, APIs)
│   Tools         │
└─────────────────┘
```

## Setup

### 1. Install MCP Server Dependencies

```bash
cd mcp-server
npm install
```

### 2. Build MCP Server

```bash
npm run build
```

### 3. Configure Environment

**MCP Server** (`mcp-server/.env`):
```env
TOOL_EXECUTOR_URL=http://localhost:3000/api/tools/execute
```

**Dedalus Bridge** (`dedalus-bridge/.env`):
```env
DEDALUS_API_KEY=your-key
DEDALUS_MODEL=openai/gpt-4o-mini
MCP_SERVER_URL=local/rental-dashboard-mcp  # Or use HTTP URL
```

### 4. Start MCP Server

**Option A: STDIO (for Dedalus)**
```bash
cd mcp-server
npm start
```

**Option B: HTTP Server (for remote access)**
```bash
# TODO: Add HTTP server support
```

## Integration with Dedalus

### Method 1: Use MCP Server (Recommended)

Update `dedalus-bridge/agents.py` to use MCP:

```python
result = await runner.run(
    input="Add this property: https://propertyguru.com/...",
    model="openai/gpt-4o-mini",
    mcp_servers=["local/rental-dashboard-mcp"],  # Use MCP server
    stream=False
)
```

### Method 2: Use Python Functions (Current)

Keep using Python functions that call back to TypeScript:

```python
result = await runner.run(
    input="Add this property: https://propertyguru.com/...",
    model="openai/gpt-4o-mini",
    tools=[add_property_from_url, list_properties, ...],  # Python functions
    stream=False
)
```

## Benefits of MCP Server

✅ **Native Integration**: Dedalus uses MCP protocol directly
✅ **Better Performance**: No HTTP overhead for tool calls
✅ **Standard Protocol**: Uses MCP standard for tool access
✅ **Easier Management**: Tools defined in one place
✅ **Marketplace Ready**: Can publish to Dedalus marketplace

## Tools Exposed

The MCP server exposes these backend tools:

1. **add_property_from_url** - Import property listings
2. **list_properties** - List user's properties  
3. **top_prospects** - Show top prospects
4. **list_todays_schedule** - List appointments
5. **build_schedule_link** - Build booking links
6. **create_appointment** - Create appointments

## Testing

### Test MCP Server

```bash
cd mcp-server
npm run dev
```

### Test with Dedalus

```bash
# In dedalus-bridge
python -c "
import asyncio
from agents import run_agent

async def test():
    result = await run_agent(
        input_text='Show my properties',
        userId='test-user',
        use_mcp=True
    )
    print(result)

asyncio.run(test())
"
```

## Configuration

### For Local Development

Use STDIO transport (default):
```env
MCP_SERVER_URL=local/rental-dashboard-mcp
```

### For Production

Use HTTP transport (when implemented):
```env
MCP_SERVER_URL=http://localhost:8002/mcp
```

## Next Steps

1. ✅ MCP server created
2. ⏳ Update Dedalus bridge to use MCP server
3. ⏳ Test MCP integration
4. ⏳ Add HTTP transport for remote access
5. ⏳ Publish to Dedalus marketplace (optional)

## References

- [MCP Protocol](https://modelcontextprotocol.io/)
- [Dedalus MCP Integration](https://docs.dedaluslabs.ai/examples/04-mcp-integration)
- [Dedalus Documentation](https://docs.dedaluslabs.ai/)

