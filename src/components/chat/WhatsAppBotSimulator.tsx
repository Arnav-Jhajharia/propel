"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatMsg = { id: string; from: "client" | "agent"; text: string; at: number };

export default function WhatsAppBotSimulator({
  title = "WhatsApp Chatbot Simulator",
  subtitle = "This simulates the WhatsApp conversation locally.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const userMsg: ChatMsg = { id: crypto.randomUUID(), from: "client", text, at: Date.now() };
    setMessages((m) => [...m, userMsg]);

    setSending(true);
    try {
      const history = messages.map((m) => ({ role: m.from === "client" ? "user" : "assistant", text: m.text })).slice(-10);
      const res = await fetch("/api/lead-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      const reply: string = data?.reply || (res.ok ? "" : "Something went wrong");
      const botMsg: ChatMsg = { id: crypto.randomUUID(), from: "agent", text: reply, at: Date.now() };
      setMessages((m) => [...m, botMsg]);
    } catch {
      const botMsg: ChatMsg = { id: crypto.randomUUID(), from: "agent", text: "Network error. Please try again.", at: Date.now() };
      setMessages((m) => [...m, botMsg]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="w-full max-w-3xl">
      <div className="text-center space-y-2 mb-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <div className={cn("flex flex-col h-full border rounded-lg overflow-hidden bg-background")}>        
        <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-muted/20 min-h-[400px] max-h-[60vh]">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Say hi to start the conversation.
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={cn("flex", msg.from === "client" ? "justify-start" : "justify-end")}>                
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-4 py-2 text-sm",
                    msg.from === "client" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
                  )}
                >
                  <div className="text-xs opacity-70 mb-1">
                    {msg.from === "client" ? "You" : "Agent"} • {new Date(msg.at).toLocaleString()}
                  </div>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>

        <div className="flex gap-2 p-4 border-t bg-background">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
            onKeyDown={async (e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                await send();
              }
            }}
          />
          <Button onClick={send} disabled={sending || !input.trim()} size="icon">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}


