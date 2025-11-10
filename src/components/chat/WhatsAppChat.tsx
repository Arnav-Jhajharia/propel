"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { validatePhoneNumber } from "@/lib/phone-validation";

interface Message {
  id: string;
  from: string;
  text: string;
  at: string;
}

interface WhatsAppChatProps {
  clientId: string;
  clientName: string;
  clientPhone: string;
  initialMessages: Message[];
  className?: string;
}

export function WhatsAppChat({
  clientId,
  clientName,
  clientPhone,
  initialMessages,
  className,
}: WhatsAppChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [polling, setPolling] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!polling) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Error polling messages:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [clientId, polling]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    // Validate phone number
    const phoneValidation = validatePhoneNumber(clientPhone);
    if (!phoneValidation.isValid) {
      alert(`Invalid phone number: ${phoneValidation.error}`);
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: phoneValidation.formatted,
          text: input.trim(),
        }),
      });

      if (res.ok) {
        setInput("");
        // Immediately fetch updated messages
        const clientRes = await fetch(`/api/clients/${clientId}`);
        if (clientRes.ok) {
          const data = await clientRes.json();
          setMessages(data.messages || []);
        }
      } else {
        const error = await res.json();
        alert(`Failed to send message: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Messages container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-3 p-4 bg-muted/20 rounded-t-lg min-h-[400px] max-h-[600px]"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages
            .slice()
            .reverse()
            .map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.from === "client" ? "justify-start" : "justify-end"
                )}
              >
                <div
                  className={cn(
                    "max-w-[70%] rounded-lg px-4 py-2 text-sm",
                    msg.from === "client"
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground"
                  )}
                >
                  <div className="text-xs opacity-70 mb-1">
                    {msg.from === "client" ? clientName : "You"} •{" "}
                    {new Date(msg.at).toLocaleString()}
                  </div>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form
        onSubmit={handleSend}
        className="flex gap-2 p-4 border-t bg-background rounded-b-lg"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1"
        />
        <Button type="submit" disabled={sending || !input.trim()} size="icon">
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
