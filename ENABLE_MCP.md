# How to Enable MCP Server

## Quick Fix

Add this to your `dedalus-bridge/.env` file:

```env
USE_MCP_SERVER=true
MCP_SERVER_URL=local/rental-dashboard-mcp
TOOL_EXECUTOR_URL=http://localhost:3001/api/tools/execute
```

## Steps

### 1. Set Environment Variable

**Option A: In `dedalus-bridge/.env`**
```bash
cd dedalus-bridge
echo "USE_MCP_SERVER=true" >> .env
echo "MCP_SERVER_URL=local/rental-dashboard-mcp" >> .env
```

**Option B: Export before starting**
```bash
export USE_MCP_SERVER=true
export MCP_SERVER_URL=local/rental-dashboard-mcp
```

### 2. Build and Start MCP Server

```bash
cd mcp-server
npm install
npm run build
npm start  # Run in separate terminal
```

### 3. Restart Dedalus Bridge

```bash
cd dedalus-bridge
./start.sh  # Or restart your bridge service
```

## Verify It's Working

You should see in logs:
- `🔧 Use MCP: True` (not False)
- `🔗 MCP Server URL: local/rental-dashboard-mcp`
- `[MCP DEBUG]` logs when tools are called

## Note: Tool Calling Issue

Even with Python functions, you're seeing `🔧 Tool calls: 0`. This might mean:
1. The model isn't recognizing it needs to use tools
2. Try a more explicit prompt like "Use the list_properties tool to show my properties"
3. Or use a better tool-calling model like `openai/gpt-5` or `openai/gpt-4.1`

