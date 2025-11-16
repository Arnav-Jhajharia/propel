"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Suggestion = { title: string; prompt: string };
type ChatMessage = { id: string; role: "user" | "assistant"; text: string; suggestions?: Suggestion[] };

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  { title: "What’s left?", prompt: "What’s left in setup?" },
  { title: "Connect Google Calendar", prompt: "Connect Google Calendar" },
  { title: "Set Calendly URL", prompt: "My Calendly URL is https://calendly.com/yourname" },
  { title: "Add first property", prompt: "Add this property: https://propertyguru.com/..." },
  { title: "Configure questionnaire", prompt: "Set up my screening questions" },
  { title: "Share booking link", prompt: "Share a booking link" },
];

export default function SetupAssistantPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: crypto.randomUUID(), role: "assistant", text: "Welcome! I can guide you through setup.", suggestions: DEFAULT_SUGGESTIONS },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const placeholder = useMemo(() => "Ask me to connect calendar, set Calendly, or add a property", []);

  const send = async (text: string) => {
    setSending(true);
    try {
      const res = await fetch("/api/agent/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.map((m) => ({ role: m.role, text: m.text })).slice(-10),
        }),
      });
      const data = await res.json();
      const reply = data?.reply ?? (res.ok ? "" : "Something went wrong");
      const suggestions: Suggestion[] = data?.suggestions || [];
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", text: reply, suggestions }]);
    } catch {
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", text: "Network error. Please try again." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="mt-6 border shadow-sm">
      <div className="p-3 border-b text-sm font-medium">Setup Assistant</div>
      <div className="p-3 space-y-3 max-h-[50vh] overflow-auto">
        {messages.map((m) => (
          <div key={m.id} className="space-y-2">
            <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-[#e9b6a5] text-white" : "bg-muted"}`}>
                {m.text}
              </div>
            </div>
            {m.role === "assistant" && (m.suggestions?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-2 pl-1">
                {m.suggestions!.map((s, i) => (
                  <button key={i} className="text-xs px-2 py-1 rounded-full border hover:bg-muted" onClick={() => setInput(s.prompt)}>
                    {s.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {sending && <div className="text-xs text-muted-foreground">Thinking…</div>}
      </div>
      <div className="p-3 border-t flex items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="h-10"
          onKeyDown={async (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const text = input.trim();
              if (!text || sending) return;
              setInput("");
              setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text }]);
              await send(text);
            }
          }}
        />
        <Button
          disabled={sending || !input.trim()}
          onClick={async () => {
            const text = input.trim();
            if (!text || sending) return;
            setInput("");
            setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text }]);
            await send(text);
          }}
        >
          Send
        </Button>
      </div>
    </Card>
  );
}





