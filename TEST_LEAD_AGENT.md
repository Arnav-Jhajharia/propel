# Testing Lead Agent with Dedalus Integration

## How It Works Now

The lead agent now works seamlessly with Dedalus Labs:

1. **Simple Conversations** (no tools needed):
   - Uses Dedalus Labs for natural language responses
   - Example: "Hello, I'm looking for a rental property"
   - Function: `leadReply()` - uses Dedalus

2. **Tool-Calling Requests** (tools needed):
   - Automatically uses OpenAI for tool calling
   - Example: Property URL detection, property details, booking
   - Function: `planLeadStep()` - uses OpenAI when tools are present
   - This ensures tool calling works reliably

3. **Hybrid Approach**:
   - Best of both worlds: Dedalus for conversations, OpenAI for tool execution
   - Seamless fallback if Dedalus fails
   - All happens automatically - no code changes needed

## Testing

### Test 1: Simple Conversation (Dedalus)

```bash
# Make sure LLM_PROVIDER=dedalus in .env.local
# Start bridge service: cd dedalus-bridge && ./start.sh
# Start app: npm run dev

# Test via API
curl -X POST http://localhost:3000/api/lead-agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, I am looking for a rental property in Singapore"
  }'
```

**Expected**: Response from Dedalus Labs

### Test 2: Property URL (OpenAI for Tools)

```bash
curl -X POST http://localhost:3000/api/lead-agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I am interested in this property: https://www.propertyguru.com.sg/listing/for-rent-example"
  }'
```

**Expected**: 
- Tool calling uses OpenAI (automatic)
- Property gets added via `add_property_from_url` tool
- Response confirms property was added

### Test 3: Property Questions (Dedalus for Response)

```bash
curl -X POST http://localhost:3000/api/lead-agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the price?",
    "history": [
      {"role": "user", "text": "I am interested in this property: https://www.propertyguru.com.sg/listing/for-rent-example"},
      {"role": "assistant", "text": "Got the link, let me check the details."}
    ]
  }'
```

**Expected**: 
- Uses Dedalus for natural language response
- Context-aware reply about the property

## Verification

Check logs to see which provider is being used:

```
[LLM] provider=dedalus model=openai/gpt-4o-mini ok=true latencyMs=1234
[LLM] provider=dedalus model=openai/gpt-4o-mini ok=true latencyMs=0 note=using_openai_for_tool_calling
```

The second log shows tool calling automatically using OpenAI.

## Benefits

✅ **Lead agent works fully** - All functionality preserved
✅ **Uses Dedalus when possible** - Cost savings on simple conversations  
✅ **Reliable tool calling** - OpenAI handles tool execution
✅ **Automatic fallback** - If Dedalus fails, uses OpenAI
✅ **No code changes needed** - Works transparently

## Configuration

In `.env.local`:
```env
LLM_PROVIDER=dedalus  # Use Dedalus for conversations
DEDALUS_BRIDGE_URL=http://localhost:8001
DEDALUS_API_KEY=your-key
OPENAI_API_KEY=your-key  # Still needed for tool calling
```

The system automatically routes:
- Simple conversations → Dedalus
- Tool calls → OpenAI
- Failed Dedalus calls → OpenAI fallback

