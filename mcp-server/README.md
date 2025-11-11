# Rental Dashboard MCP Server

MCP (Model Context Protocol) server that exposes backend tools to Dedalus Labs.

## Setup

1. **Install dependencies:**
   ```bash
   cd mcp-server
   npm install
   ```

2. **Build:**
   ```bash
   npm run build
   ```

3. **Configure environment:**
   Create `.env` file:
   ```env
   TOOL_EXECUTOR_URL=http://localhost:3000/api/tools/execute
   ```

## Usage

### Run as STDIO (for Dedalus)
```bash
npm start
```

### Development
```bash
npm run dev
```

## Tools Exposed

- `add_property_from_url` - Import property listings
- `list_properties` - List user's properties
- `top_prospects` - Show top prospects
- `list_todays_schedule` - List appointments
- `build_schedule_link` - Build booking links
- `create_appointment` - Create appointments

## Integration with Dedalus

In your Dedalus bridge, you can use this MCP server:

```python
result = await runner.run(
    input="Add this property: https://propertyguru.com/...",
    model="openai/gpt-4o-mini",
    mcp_servers=["local/rental-dashboard-mcp"]  # Use local MCP server
)
```

## Configuration

For Dedalus to use this MCP server, you need to configure it in your Dedalus bridge or use it as a local server.

