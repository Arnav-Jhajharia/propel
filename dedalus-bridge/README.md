# Dedalus Labs Python Bridge Service

This service bridges the Dedalus Labs Python SDK to your TypeScript/Node.js application via a REST API.

## Setup

1. **Install Python dependencies:**
   ```bash
   cd dedalus-bridge
   pip install -r requirements.txt
   ```

2. **Set environment variables:**
   Create a `.env` file in the `dedalus-bridge` directory:
   ```env
   DEDALUS_API_KEY=your-dedalus-api-key
   DEDALUS_MODEL=openai/gpt-4o-mini  # Optional, defaults to gpt-4o-mini
   DEDALUS_BRIDGE_PORT=8001  # Optional, defaults to 8001
   ```

3. **Start the bridge service:**
   ```bash
   python main.py
   ```
   
   Or with uvicorn directly:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8001
   ```

## API

The bridge exposes an OpenAI-compatible `/v1/chat/completions` endpoint that your TypeScript code can call.

### Endpoints

- `POST /v1/chat/completions` - Chat completions (OpenAI-compatible)
- `GET /health` - Health check

## Integration

In your TypeScript code, set:
```env
LLM_PROVIDER=dedalus
DEDALUS_BRIDGE_URL=http://localhost:8001
```

The bridge service will handle all communication with Dedalus Labs using the Python SDK.

## Notes

- The bridge converts OpenAI-style tool definitions to Dedalus format
- Tool calling support may be limited - Dedalus tools are typically Python functions
- For production, consider running this as a separate service or container

