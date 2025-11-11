# Testing Dedalus Labs Integration

## Quick Start

### Step 1: Set up Python Bridge Service

1. **Navigate to bridge directory:**
   ```bash
   cd dedalus-bridge
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
   
   Or use the start script (it will create a venv automatically):
   ```bash
   ./start.sh
   ```

3. **Create `.env` file in `dedalus-bridge/` directory:**
   ```env
   DEDALUS_API_KEY=your-actual-dedalus-api-key-here
   DEDALUS_MODEL=openai/gpt-4o-mini
   DEDALUS_BRIDGE_PORT=8001
   ```

4. **Start the bridge service:**
   ```bash
   python main.py
   ```
   
   Or use the start script:
   ```bash
   ./start.sh
   ```

   You should see:
   ```
   🐍 Starting Dedalus Labs Bridge Service...
   ✅ Starting bridge service on port 8001
   ```

### Step 2: Configure Your App

1. **Update your `.env` or `.env.local` file in the root directory:**
   ```env
   LLM_PROVIDER=dedalus
   DEDALUS_BRIDGE_URL=http://localhost:8001
   DEDALUS_API_KEY=your-actual-dedalus-api-key-here
   DEDALUS_MODEL=openai/gpt-4o-mini
   
   # Keep OpenAI as fallback
   OPENAI_API_KEY=your-openai-key
   ```

### Step 3: Test the Integration

#### Option A: Test Bridge Service Directly

1. **Test health endpoint:**
   ```bash
   curl http://localhost:8001/health
   ```
   Should return: `{"status":"ok","service":"dedalus-bridge"}`

2. **Test chat completions:**
   ```bash
   curl -X POST http://localhost:8001/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{
       "messages": [
         {"role": "user", "content": "Hello, how are you?"}
       ],
       "model": "openai/gpt-4o-mini"
     }'
   ```

#### Option B: Test Through Your App

1. **Start your Next.js app:**
   ```bash
   npm run dev
   ```

2. **Test agent endpoints:**
   - Use the chat interface at `http://localhost:3000/chat`
   - Or test via API:
     ```bash
     curl -X POST http://localhost:3000/api/agent/chat \
       -H "Content-Type: application/json" \
       -d '{
         "userId": "test-user",
         "message": "Hello, can you help me?"
       }'
     ```

3. **Check logs:**
   - Bridge service logs will show requests
   - Your app logs will show `[LLM] provider=dedalus` messages

### Step 4: Verify It's Working

1. **Check bridge service logs** - should show incoming requests
2. **Check app logs** - should show `provider=dedalus` in LLM logs
3. **Test fallback** - stop bridge service, should automatically fallback to OpenAI

## Troubleshooting

### Bridge Service Won't Start

- **Check Python version:** `python3 --version` (needs 3.8+)
- **Check dependencies:** `pip list | grep dedalus-labs`
- **Check API key:** Make sure `DEDALUS_API_KEY` is set in `dedalus-bridge/.env`

### Bridge Service Returns Errors

- **Check Dedalus API key** is valid
- **Check model name** is correct (e.g., `openai/gpt-4o-mini`)
- **Check logs** in bridge service console

### App Still Uses OpenAI

- **Check `LLM_PROVIDER=dedalus`** is set in your `.env`
- **Check bridge service** is running on port 8001
- **Check `DEDALUS_BRIDGE_URL`** matches bridge service URL

### Fallback to OpenAI

- This is expected if bridge service is down or returns errors
- Check bridge service logs for error details
- Verify Dedalus API key is valid

## Testing Checklist

- [ ] Bridge service starts successfully
- [ ] Health endpoint returns OK
- [ ] Chat completions endpoint works
- [ ] App uses Dedalus when `LLM_PROVIDER=dedalus`
- [ ] App falls back to OpenAI when bridge fails
- [ ] Logs show correct provider being used

