import OpenAI from "openai";

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmTool = any; // Keep flexible to support OpenAI tool schema without tight coupling

export type ChatCompletionParams = {
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  tools?: LlmTool[];
  responseFormat?: "json_object" | "text";
};

export type ChatCompletionResult = {
  content: string | null;
  toolCalls?: Array<{
    id?: string;
    type?: string;
    function: { name: string; arguments: string };
  }>;
  // Optional: pass-through raw response for debugging
  _raw?: unknown;
  provider: "openai" | "dedalus";
  model?: string;
  latencyMs?: number;
};

let openAiClient: OpenAI | null = null;
function getOpenAiClient(): OpenAI {
  if (openAiClient) return openAiClient;
  openAiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openAiClient;
}

function getProvider(): "openai" | "dedalus" {
  const p = (process.env.LLM_PROVIDER || "openai").toLowerCase();
  return p === "dedalus" ? "dedalus" : "openai";
}

function getModelForProvider(provider: "openai" | "dedalus", requested?: string): string | undefined {
  if (requested) return requested;
  if (provider === "openai") return process.env.OPENAI_MODEL || "gpt-4o-mini";
  return process.env.DEDALUS_MODEL || undefined;
}

function logResult(meta: {
  provider: "openai" | "dedalus";
  model?: string;
  latencyMs: number;
  ok: boolean;
  note?: string;
}) {
  try {
    // Basic console logging to aid debugging; redact content
    const { provider, model, latencyMs, ok, note } = meta;
    console.log(`[LLM] provider=${provider} model=${model || "default"} ok=${ok} latencyMs=${latencyMs}${note ? ` note=${note}` : ""}`);
  } catch {
    /* no-op */
  }
}

async function callOpenAi(params: ChatCompletionParams): Promise<ChatCompletionResult> {
  const started = Date.now();
  const client = getOpenAiClient();
  const result = await client.chat.completions.create({
    model: getModelForProvider("openai", params.model) || "gpt-4o-mini",
    messages: params.messages as any,
    temperature: params.temperature,
    top_p: params.topP,
    max_tokens: params.maxTokens,
    tools: params.tools as any,
    response_format: params.responseFormat ? ({ type: params.responseFormat } as any) : undefined,
  });
  const msg: any = result.choices?.[0]?.message || {};
  const toolCalls = msg.tool_calls || undefined;
  const content = (msg.content || null) as string | null;
  const latencyMs = Date.now() - started;
  logResult({ provider: "openai", model: result.model as any, latencyMs, ok: true });
  return {
    content,
    toolCalls,
    _raw: result,
    provider: "openai",
    model: result.model as any,
    latencyMs,
  };
}

async function callDedalus(params: ChatCompletionParams): Promise<ChatCompletionResult> {
  const started = Date.now();
  // Use Python bridge service (defaults to localhost:8001)
  const baseUrl = (process.env.DEDALUS_BRIDGE_URL || "http://localhost:8001").replace(/\/+$/, "");
  const model = getModelForProvider("dedalus", params.model);

  const url = `${baseUrl}/v1/chat/completions`;
  const body = {
    model,
    messages: params.messages,
    temperature: params.temperature,
    top_p: params.topP,
    max_tokens: params.maxTokens,
    tools: params.tools,
    response_format: params.responseFormat ? { type: params.responseFormat } : undefined,
  };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`Dedalus Bridge HTTP ${r.status}: ${text || r.statusText}`);
  }
  const data: any = await r.json();
  const content = data.content || null;
  const toolCalls = data.tool_calls || undefined;
  const latencyMs = Date.now() - started;
  logResult({ provider: "dedalus", model: data.model || model, latencyMs, ok: true });
  return {
    content,
    toolCalls,
    _raw: data,
    provider: "dedalus",
    model: data.model || model,
    latencyMs,
  };
}

export async function chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResult> {
  const provider = getProvider();
  const started = Date.now();
  
  if (provider === "dedalus") {
    try {
      // Try Dedalus for everything - including tool calling
      // The bridge will handle tool execution
      return await callDedalus(params);
    } catch (err: any) {
      // Fallback to OpenAI for compatibility and reliability
      const latencyMs = Date.now() - started;
      logResult({
        provider: "dedalus",
        model: getModelForProvider("dedalus", params.model),
        latencyMs,
        ok: false,
        note: `fallback_to_openai reason=${err?.message || "unknown"}`,
      });
      return await callOpenAi(params);
    }
  }
  
  // Use OpenAI when provider is OpenAI
  return await callOpenAi(params);
}


