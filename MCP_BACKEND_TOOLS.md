# MCP Backend Tools - Database Access & More

## Overview

Your MCP server exposes **all your backend tools** to Dedalus, including:
- **Database access** (properties, prospects, clients)
- **Scheduling** (appointments, calendar)
- **Property management** (import, list)
- **Prospect management** (scoring, matching)

## How It Works

### Architecture Flow

```
┌─────────────────┐
│  Dedalus Labs   │  (AI Agent)
└────────┬────────┘
         │ MCP Protocol
         │ "list_properties"
         ▼
┌─────────────────┐
│   MCP Server     │  (mcp-server/)
│  Exposes Tools   │  - list_properties
│                  │  - add_property_from_url
│                  │  - top_prospects
│                  │  - list_todays_schedule
│                  │  - create_appointment
└────────┬────────┘
         │ HTTP POST
         │ /api/tools/execute
         ▼
┌─────────────────┐
│  Tool Executor  │  (Next.js API)
│ /api/tools/     │  - Routes to correct tool
│   execute       │  - Handles authentication
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend Tools  │  (TypeScript)
│  src/agent/     │  - addPropertyFromUrl()
│    tools/        │  - listRecentProperties()
│                  │  - listTopProspects()
│                  │  - listTodaysAppointments()
│                  │  - createAppointment()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    Database     │  (SQLite/Turso)
│  - properties   │  - Drizzle ORM
│  - prospects    │  - Type-safe queries
│  - clients       │
│  - appointments │
└─────────────────┘
```

## Available Backend Tools

### 1. **Database Access Tools**

#### `list_properties`
- **What it does**: Queries database for user's properties
- **Database**: Reads from `properties` table
- **Returns**: List of properties with id, title, address, price
- **Example**: "Show my properties" → Dedalus calls `list_properties` → Database query → Returns properties

#### `top_prospects`
- **What it does**: Queries database for top prospects
- **Database**: Reads from `prospects` table with scoring
- **Returns**: Prospects with client name, score, property title
- **Example**: "Show my top prospects" → Dedalus calls `top_prospects` → Database query → Returns prospects

### 2. **Property Management Tools**

#### `add_property_from_url`
- **What it does**: Scrapes property listing and saves to database
- **Database**: Creates new row in `properties` table
- **External APIs**: Calls PropertyGuru/99.co scrapers
- **Example**: "Add this property: https://propertyguru.com/..." → Dedalus calls `add_property_from_url` → Scraper → Database insert

### 3. **Scheduling Tools**

#### `list_todays_schedule`
- **What it does**: Queries database for appointments
- **Database**: Reads from `appointments` table
- **Returns**: Appointments with id, title, startTime, invitee
- **Example**: "What's on my schedule today?" → Dedalus calls `list_todays_schedule` → Database query → Returns appointments

#### `create_appointment`
- **What it does**: Creates appointment in database + Google Calendar
- **Database**: Inserts into `appointments` table
- **External APIs**: Google Calendar API (if connected)
- **Example**: "Schedule a meeting tomorrow at 2pm" → Dedalus calls `create_appointment` → Database insert + Google Calendar

#### `build_schedule_link`
- **What it does**: Generates shareable booking link
- **Database**: No database access (just generates URL)
- **Returns**: Shareable link for scheduling
- **Example**: "Create a booking link" → Dedalus calls `build_schedule_link` → Returns link

## How Dedalus Uses These Tools

### Example 1: "Show my properties"
```
User: "Show my properties"
  ↓
Dedalus: Discovers `list_properties` tool from MCP server
  ↓
MCP Server: Calls /api/tools/execute with tool="list_properties"
  ↓
Tool Executor: Routes to listRecentProperties(userId)
  ↓
Backend Tool: Queries database
  SELECT * FROM properties WHERE userId = ? ORDER BY createdAt DESC LIMIT 10
  ↓
Database: Returns properties
  ↓
Dedalus: Formats response
  "Here are your properties: [list]"
```

### Example 2: "Add this property and show my top prospects"
```
User: "Add this property: https://... and show my top prospects"
  ↓
Dedalus: Discovers tools from MCP server
  - add_property_from_url
  - top_prospects
  ↓
Dedalus: Chains tools automatically
  1. Calls add_property_from_url(url)
  2. Calls top_prospects()
  ↓
MCP Server: Executes both tools via HTTP
  ↓
Tool Executor: Routes to both tools
  ↓
Backend Tools: 
  - Scrapes property → Saves to database
  - Queries prospects → Returns top prospects
  ↓
Dedalus: Combines results
  "Property added! Here are your top prospects: [list]"
```

## Database Access Details

### What Database Tables Are Accessed?

1. **properties** - Property listings
   - Accessed by: `list_properties`, `add_property_from_url`
   - Operations: SELECT, INSERT

2. **prospects** - Client-property matching
   - Accessed by: `top_prospects`
   - Operations: SELECT (with scoring)

3. **appointments** - Scheduling
   - Accessed by: `list_todays_schedule`, `create_appointment`
   - Operations: SELECT, INSERT

4. **clients** - Client information
   - Accessed indirectly through prospects
   - Operations: SELECT

### How Authentication Works

1. **User ID**: Passed from Dedalus → MCP → Tool Executor
2. **Session**: Tool Executor extracts session from cookies
3. **Database Queries**: Filtered by `userId` for security
4. **Example**: `SELECT * FROM properties WHERE userId = ?`

## Benefits of MCP for Backend Tools

### ✅ **Automatic Tool Discovery**
- Dedalus discovers all tools from MCP server
- No need to manually define Python functions

### ✅ **Tool Chaining**
- Dedalus automatically chains multiple tools
- Example: "Add property and show prospects" → 2 tools chained

### ✅ **Database Access**
- All database operations go through your TypeScript tools
- Type-safe with Drizzle ORM
- Secure with user authentication

### ✅ **Standard Protocol**
- MCP is standard way to expose tools
- Other AI systems can use same tools

## Current vs MCP Approach

### Current Approach (Python Functions)
```python
# Manual Python wrappers
async def list_properties(userId: str):
    result = await execute_tool("list_properties", {}, userId)
    return result

# Pass to Dedalus
result = await runner.run(
    input="Show my properties",
    tools=[list_properties, ...]  # Manual list
)
```

### MCP Approach (Automatic)
```python
# No Python wrappers needed!
result = await runner.run(
    input="Show my properties",
    mcp_servers=["rental-dashboard-mcp"]  # Dedalus discovers tools automatically
)
```

## Testing Backend Tools

### Test Database Access
```bash
cd dedalus-bridge
python -c "
import asyncio
from agents import run_agent

async def test():
    result = await run_agent(
        input_text='List my properties',
        userId='test-user',
        use_mcp=True
    )
    print(result)

asyncio.run(test())
"
```

### Test Tool Chaining
```bash
python -c "
import asyncio
from agents import run_agent

async def test():
    result = await run_agent(
        input_text='Add this property: https://propertyguru.com/... and show my top prospects',
        userId='test-user',
        use_mcp=True
    )
    print(result)

asyncio.run(test())
"
```

## Summary

**MCP gives Dedalus direct access to your backend:**
- ✅ Database queries (properties, prospects, appointments)
- ✅ Property management (import, list)
- ✅ Scheduling (create, list appointments)
- ✅ Automatic tool discovery
- ✅ Tool chaining
- ✅ Secure with user authentication

All your backend tools are exposed via MCP, so Dedalus can access your database and APIs directly!

