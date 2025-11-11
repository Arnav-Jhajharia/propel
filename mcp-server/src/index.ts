#!/usr/bin/env node
/**
 * MCP Server for Rental Dashboard Backend
 * Exposes backend tools to Dedalus Labs via MCP protocol
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Import backend tools
// Note: We'll need to create a shared module or use HTTP calls
// For now, we'll use HTTP calls to the Next.js API

const TOOL_EXECUTOR_URL = "http://localhost:3001/api/tools/execute";

// Tool definitions matching our backend tools
const TOOLS: Tool[] = [
  {
    name: "add_property_from_url",
    description: "Import a property listing by URL (PropertyGuru or 99.co)",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The property listing URL",
        },
        userId: {
          type: "string",
          description: "The user ID",
        },
      },
      required: ["url", "userId"],
    },
  },
  {
    name: "list_properties",
    description: "List the user's recent properties",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID",
        },
        limit: {
          type: "number",
          description: "Maximum number of properties to return",
          default: 10,
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "top_prospects",
    description: "Show the user's top prospects",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID",
        },
        limit: {
          type: "number",
          description: "Maximum number of prospects to return",
          default: 5,
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "list_todays_schedule",
    description: "List the user's appointments for a specific date",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID",
        },
        date: {
          type: "string",
          description: "The date to check: 'today', 'tomorrow', or ISO date string (YYYY-MM-DD)",
          default: "today",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "build_schedule_link",
    description: "Build a shareable schedule page link with optional prefill",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID",
        },
        name: {
          type: "string",
          description: "Optional name to prefill",
        },
        email: {
          type: "string",
          description: "Optional email to prefill",
        },
        phone: {
          type: "string",
          description: "Optional phone to prefill",
        },
      },
      required: ["userId"],
    },
  },
  {
    name: "create_appointment",
    description: "Create an appointment in the app, and also in Google Calendar if connected",
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "string",
          description: "The user ID",
        },
        title: {
          type: "string",
          description: "Meeting title",
        },
        description: {
          type: "string",
          description: "Meeting description",
        },
        startTime: {
          type: "string",
          description: "ISO start time",
        },
        endTime: {
          type: "string",
          description: "ISO end time",
        },
        inviteeName: {
          type: "string",
          description: "Invitee name",
        },
        inviteeEmail: {
          type: "string",
          description: "Invitee email",
        },
        inviteePhone: {
          type: "string",
          description: "Invitee phone",
        },
      },
      required: ["userId", "startTime", "endTime"],
    },
  },
];

async function executeTool(toolName: string, args: any, userId?: string): Promise<any> {
  const actualUserId = userId || args.userId || "anonymous";
  const timestamp = new Date().toISOString();
  
  console.error(`[MCP DEBUG ${timestamp}] 🔧 Executing tool: ${toolName}`);
  console.error(`[MCP DEBUG ${timestamp}] 📋 Arguments:`, JSON.stringify(args, null, 2));
  console.error(`[MCP DEBUG ${timestamp}] 👤 User ID: ${actualUserId}`);
  console.error(`[MCP DEBUG ${timestamp}] 🌐 Calling: ${TOOL_EXECUTOR_URL}`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(TOOL_EXECUTOR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tool: toolName,
        arguments: args,
        userId: actualUserId,
      }),
    });

    const latency = Date.now() - startTime;
    console.error(`[MCP DEBUG ${timestamp}] ⏱️  HTTP Response: ${response.status} (${latency}ms)`);

    if (!response.ok) {
      const error = await response.text();
      console.error(`[MCP DEBUG ${timestamp}] ❌ Tool execution failed: ${response.status} - ${error}`);
      throw new Error(`Tool execution failed: ${response.status} - ${error}`);
    }

    const data = await response.json();
    console.error(`[MCP DEBUG ${timestamp}] ✅ Tool result:`, JSON.stringify(data.result, null, 2));
    return data.result;
  } catch (error: any) {
    console.error(`[MCP DEBUG ${timestamp}] ❌ Tool execution error:`, error.message);
    throw new Error(`Tool execution error: ${error.message}`);
  }
}

async function main() {
  const server = new Server(
    {
      name: "rental-dashboard-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async (request) => {
    const timestamp = new Date().toISOString();
    console.error(`[MCP DEBUG ${timestamp}] 📋 ListTools request received`);
    console.error(`[MCP DEBUG ${timestamp}] 🔧 Exposing ${TOOLS.length} tools:`, TOOLS.map(t => t.name).join(", "));
    
    const response = {
      tools: TOOLS,
    };
    
    console.error(`[MCP DEBUG ${timestamp}] ✅ Returning tools list`);
    return response;
  });

  // Execute tools
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const timestamp = new Date().toISOString();
    const { name, arguments: args } = request.params;
    
    console.error(`[MCP DEBUG ${timestamp}] 🚀 CallTool request received`);
    console.error(`[MCP DEBUG ${timestamp}] 🔧 Tool name: ${name}`);
    console.error(`[MCP DEBUG ${timestamp}] 📋 Tool arguments:`, JSON.stringify(args, null, 2));

    try {
      // Extract userId from args if present
      const userId = args?.userId as string | undefined;
      console.error(`[MCP DEBUG ${timestamp}] 👤 Extracted userId: ${userId || "not provided"}`);
      
      // Execute the tool
      const startTime = Date.now();
      const result = await executeTool(name, args, userId);
      const executionTime = Date.now() - startTime;
      
      console.error(`[MCP DEBUG ${timestamp}] ✅ Tool executed successfully (${executionTime}ms)`);
      console.error(`[MCP DEBUG ${timestamp}] 📤 Returning result to Dedalus`);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      console.error(`[MCP DEBUG ${timestamp}] ❌ Tool execution failed:`, error.message);
      console.error(`[MCP DEBUG ${timestamp}] 📤 Returning error to Dedalus`);
      
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Connect via stdio
  const timestamp = new Date().toISOString();
  console.error(`[MCP DEBUG ${timestamp}] 🚀 Starting MCP Server`);
  console.error(`[MCP DEBUG ${timestamp}] 📡 Connecting via STDIO transport`);
  console.error(`[MCP DEBUG ${timestamp}] 🔧 Tool executor URL: ${TOOL_EXECUTOR_URL}`);
  console.error(`[MCP DEBUG ${timestamp}] 📋 Available tools: ${TOOLS.length}`);
  
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`[MCP DEBUG ${timestamp}] ✅ Rental Dashboard MCP Server running on stdio`);
  console.error(`[MCP DEBUG ${timestamp}] 🎯 Ready to receive requests from Dedalus`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

