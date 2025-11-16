# Bot Customization System

## Overview

This system allows users to customize their chatbot's automation level using natural language. Users can control how much the AI automates their workflow, from fully manual to fully automated, with granular control over each phase.

## Architecture

### Components

1. **Database Schema** (`src/lib/db/schema.ts`)
   - `botConfigs` table stores automation configurations
   - Supports both global (user-level) and client-specific rules
   - Stores both natural language input and parsed configuration

2. **Parser** (`src/lib/botConfigParser.ts`)
   - Uses GPT-4 to parse natural language into structured config
   - Defines automation phases and approval requirements
   - Validates configuration with Zod schemas

3. **Config Loader** (`src/lib/botConfigLoader.ts`)
   - Loads automation config for a user/client
   - Handles fallback from client-specific to global rules
   - Provides default configuration

4. **Workflow Integration** (`src/agent/leadGraph.ts`)
   - Checks automation config before each phase
   - Routes to fallback (human handoff) when automation is disabled
   - Respects approval requirements

5. **UI Pages**
   - `/bot-settings` - Main configuration page
   - `ClientAutomationOverride` - Component for client-specific rules

6. **API Endpoints** (`src/app/api/bot-config/route.ts`)
   - `GET /api/bot-config` - Fetch configurations
   - `POST /api/bot-config` - Create/update configuration
   - `DELETE /api/bot-config?id=` - Delete configuration

## Automation Phases

The bot workflow is divided into these phases:

1. **screening** - Ask tenant screening questions (budget, move-in date, employment)
2. **property_detection** - Detect and add property from PropertyGuru/99.co URLs
3. **property_qa** - Answer questions about the property
4. **viewing_proposal** - Propose viewing time slots
5. **viewing_booking** - Confirm and book the viewing
6. **followup** - Send follow-up messages

## Configuration Structure

```typescript
{
  automatedPhases: ["screening", "property_detection", ...],
  maxPhase: "viewing_booking", // Bot stops here
  requireApproval: {
    beforeScreening: false,
    beforePropertyAdd: false,
    beforeViewingProposal: false,
    beforeViewingBooking: true, // Requires human approval
  },
  behavior: {
    tone: "professional" | "friendly" | "casual",
    responseSpeed: "instant" | "delayed" | "human_like",
    autoFollowUp: true,
  }
}
```

## Usage Examples

### Example 1: Screening Only
```
Natural Language: "I only want the agent to handle simple screenings"

Parsed Config:
- automatedPhases: ["screening"]
- maxPhase: "screening"
- All other phases require manual intervention
```

### Example 2: Full Automation
```
Natural Language: "I want it to be completely handled by the agent"

Parsed Config:
- automatedPhases: ["screening", "property_detection", "property_qa", "viewing_proposal", "viewing_booking", "followup"]
- maxPhase: "full"
- No approvals required
```

### Example 3: Automation with Approval
```
Natural Language: "Automate everything but ask me before booking viewings"

Parsed Config:
- automatedPhases: All phases
- maxPhase: "full"
- requireApproval.beforeViewingBooking: true
```

### Example 4: Partial Automation
```
Natural Language: "Handle screening and property questions, but I want to manually propose viewings"

Parsed Config:
- automatedPhases: ["screening", "property_detection", "property_qa"]
- maxPhase: "property_qa"
- Bot hands off to human after answering property questions
```

## Client-Specific Rules

### Priority System
1. Client-specific config (if exists)
2. Global/default config
3. System default (full automation)

### Setting Client-Specific Rules

In the client details page, use the `ClientAutomationOverride` component:

```tsx
import { ClientAutomationOverride } from "@/components/ClientAutomationOverride";

<ClientAutomationOverride clientId={client.id} clientName={client.name} />
```

This allows setting different automation levels per client:
- VIP clients: Full automation
- New clients: Manual screening + automated property info
- Difficult clients: Manual everything

## How It Works

### 1. User Creates Rule
1. User navigates to `/bot-settings`
2. Enters natural language description
3. System parses it using GPT-4
4. Shows preview of parsed configuration
5. Saves to database

### 2. Bot Receives Message
1. Lead agent is invoked via webhook
2. Loads automation config for user (and client if specified)
3. Passes config into LangGraph state

### 3. Workflow Routing
1. At each decision point, checks `isPhaseAutomated(config, phase)`
2. If automated, checks `shouldProceedWithPhase(config, phase)`
3. If requires approval or not automated, routes to "fallback" (human handoff)
4. Otherwise, executes the automated phase

### 4. Human Handoff
When the bot encounters a phase it shouldn't automate:
- Routes to `fallback` node
- Sends handoff message
- Human agent is notified to take over

## Database Migration

Run the migration to add the `bot_configs` table:

```bash
sqlite3 local.db < migrations/add-bot-configs.sql
```

Or if using Drizzle:

```bash
npm run db:push
```

## API Usage

### Get All Configurations
```typescript
const response = await fetch("/api/bot-config");
const { configs } = await response.json();
```

### Get Config for Specific Client
```typescript
const response = await fetch(`/api/bot-config?clientId=${clientId}`);
const { config, all } = await response.json();
// config = client-specific or fallback to global
// all = all configs for this user
```

### Create Configuration
```typescript
const response = await fetch("/api/bot-config", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "My Automation Rule",
    naturalLanguageInput: "I only want the agent to handle simple screenings",
    clientId: "optional-client-id", // omit for global rule
  }),
});
```

### Update Configuration
```typescript
const response = await fetch("/api/bot-config", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id: "existing-config-id",
    name: "Updated Rule",
    naturalLanguageInput: "New instructions...",
  }),
});
```

### Delete Configuration
```typescript
const response = await fetch(`/api/bot-config?id=${configId}`, {
  method: "DELETE",
});
```

## Testing

### Test the Parser
```typescript
import { parseAutomationInstructions } from "@/lib/botConfigParser";

const config = await parseAutomationInstructions(
  "I only want screening automation"
);
console.log(config);
```

### Test the Workflow
1. Create a configuration via UI
2. Send a test message through the lead agent
3. Check which phases are executed
4. Verify handoff occurs at the right point

## Troubleshooting

### Bot Not Respecting Rules
- Check if config is loaded: Add console.log in `runLeadAgent`
- Verify clientId is passed correctly in persistedState
- Check database: `SELECT * FROM bot_configs WHERE user_id = ?`

### Parser Returning Wrong Config
- Review the system prompt in `botConfigParser.ts`
- Add more examples for edge cases
- Check OpenAI API key is valid

### Client-Specific Rules Not Working
- Ensure clientId is passed to `runLeadAgent` in persistedState
- Check `loadAutomationConfig` is finding the client config
- Verify foreign key relationship in database

## Future Enhancements

1. **Visual Config Builder** - Drag-and-drop phase configuration
2. **A/B Testing** - Test different automation levels
3. **Analytics** - Track which phases are most/least effective
4. **Conditional Rules** - "If lead score > 80, use full automation"
5. **Time-based Rules** - "Only automate during business hours"
6. **Multi-language Support** - Parse instructions in multiple languages
7. **Approval Workflows** - Send approval requests to Slack/Email

## Security Considerations

- All configs are user-scoped (userId required)
- Client-specific configs are validated against user's clients
- Parsed configs are validated with Zod before execution
- Natural language input is sanitized before storage

## Performance Notes

- Configs are loaded once per conversation
- Cached in LangGraph state to avoid repeated DB queries
- Parser uses GPT-4-mini for cost efficiency
- Database queries use indexes on userId and clientId

## Support

For issues or questions:
1. Check console logs for parsing errors
2. Verify database schema matches expected structure
3. Test API endpoints directly with curl/Postman
4. Review LangGraph execution traces

