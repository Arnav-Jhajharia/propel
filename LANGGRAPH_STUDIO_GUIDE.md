# LangGraph Studio Visualization Guide

This guide explains how to visualize your LangGraph agents using LangGraph Studio.

## Setup Complete ✅

I've already set up the necessary files:
- ✅ Exported `getApp()` functions from `graph.ts`, `leadGraph.ts`, and `setupGraph.ts`
- ✅ Created studio files in `src/agent/studio/`:
  - `agent.ts` - Main agent graph
  - `lead.ts` - Lead agent graph
  - `setup.ts` - Setup agent graph
- ✅ Configured `langgraph.json` to point to these studio files

## Installation

Install the LangGraph CLI globally:

```bash
npm install -g @langchain/langgraph-cli
```

Or use npx (no installation needed):

```bash
npx @langchain/langgraph-cli dev
```

## Running LangGraph Studio

1. **Make sure your `.env.local` file is configured** with all necessary environment variables (API keys, database URLs, etc.)

2. **Start LangGraph Studio** from the project root:

```bash
langgraph dev
```

Or with npx:

```bash
npx @langchain/langgraph-cli dev
```

3. **Access the Studio UI**: The CLI will start a local server (usually at `http://localhost:8123`) and open it in your browser automatically.

## Available Graphs

Once LangGraph Studio is running, you'll see three graphs available:

1. **`agent`** - Main agent graph (`./src/agent/studio/agent.ts`)
   - Handles general agent interactions
   - Tools: property management, prospect listing, WhatsApp drafting, scheduling

2. **`lead`** - Lead agent graph (`./src/agent/studio/lead.ts`)
   - Handles lead interactions and property viewing
   - Tools: property details, viewing proposals, booking

3. **`setup`** - Setup agent graph (`./src/agent/studio/setup.ts`)
   - Handles agent onboarding and setup
   - Tools: checklist, questionnaire, integrations

## Using LangGraph Studio

### Visualizing Graphs
- Select a graph from the sidebar
- View the graph structure, nodes, and edges
- See the flow of your agent's decision-making process

### Testing Graphs
- Use the "Playground" tab to test your graphs
- Input test messages and see how the agent processes them
- Debug state transitions and tool calls

### Monitoring
- View execution traces
- See state changes at each step
- Debug errors and edge cases

## Troubleshooting

### If graphs don't appear:
1. Check that `.env.local` exists and has all required variables
2. Verify TypeScript compilation: `npm run build`
3. Check the terminal for any import errors

### If you see import errors:
- Make sure all dependencies are installed: `npm install`
- Check that the studio files can import from the graph files correctly

### Port already in use:
- Use a different port: `langgraph dev --port 8124`
- Or stop the existing process using that port

## Configuration

The `langgraph.json` file configures which graphs are available:

```json
{
  "graphs": {
    "lead": "./src/agent/studio/lead.ts",
    "agent": "./src/agent/studio/agent.ts",
    "setup": "./src/agent/studio/setup.ts"
  },
  "env": ".env.local"
}
```

You can modify this file to add or remove graphs, or change the environment file path.

## Next Steps

1. Run `langgraph dev` to start the studio
2. Explore each graph's structure
3. Test your agents with sample inputs
4. Debug and optimize your agent flows

Happy visualizing! 🎉



