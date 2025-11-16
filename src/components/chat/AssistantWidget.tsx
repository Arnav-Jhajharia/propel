"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, ArrowUpRight, Plus, SlidersHorizontal, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";

const SUGGESTIONS = [
  "How can I help today?",
  "Show my top prospects",
  "What’s on my plate today?",
  "Draft a friendly reply to Marcus",
];

const DEFAULT_ACTIONS: Suggestion[] = [
  { title: "Add a PropertyGuru listing", prompt: "Add this property: https://propertyguru.com/..." },
  { title: "Show all properties", prompt: "List my properties" },
  { title: "Top prospects", prompt: "Show my top prospects" },
  { title: "Draft WhatsApp reply", prompt: "Draft a WhatsApp reply to Marcus about viewing time" },
];

type Suggestion = { title: string; prompt: string };
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  suggestions?: Suggestion[];
  linkHref?: string;
  linkLabel?: string;
  linkOnly?: boolean;
};

export function AssistantWidget({ initiallyHidden = false, lockedUntilReveal = false }: { initiallyHidden?: boolean; lockedUntilReveal?: boolean }) {
  const [idx, setIdx] = useState(0);
  const [minimized, setMinimized] = useState(initiallyHidden);
  const [locked, setLocked] = useState(lockedUntilReveal);
  const lastY = useRef(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % SUGGESTIONS.length), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!lockedUntilReveal) return;
    const onReveal = () => {
      setLocked(false);
      setMinimized(false);
    };
    window.addEventListener("assistant:reveal", onReveal as EventListener);
    return () => window.removeEventListener("assistant:reveal", onReveal as EventListener);
  }, [lockedUntilReveal]);

  // Seed the panel with capabilities when opened
  useEffect(() => {
    if (panelOpen && messages.length === 0) {
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "Here’s what I can help with right now.",
          at: Date.now(),
          suggestions: DEFAULT_ACTIONS,
        },
      ]);
    }
  }, [panelOpen, messages.length]);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      const delta = y - lastY.current;
      const goingDown = delta > 0.0001;
      const goingUp = delta < -0.0001;
      if (goingDown && y > 1) setMinimized(true);
      if (goingUp) setMinimized(false);
      lastY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const placeholder = useMemo(() => SUGGESTIONS[idx], [idx]);

  // Handle agent reply - display it directly
  const handleAgentReply = (reply: string) => {
    if (!reply) return;
    // Extract calendar link if present in the reply
    const urlMatch = reply.match(/Open\s+calendar:\s*(\S+)/i);
    const calendarUrl = urlMatch?.[1];
    
    // Add the reply message
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", text: reply, at: Date.now() }]);
    
    // If there's a calendar link, add it separately
    if (calendarUrl) {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", text: "", at: Date.now(), linkHref: calendarUrl, linkLabel: "Open calendar", linkOnly: true },
      ]);
    }
  };

  if (locked) return null;

  return (
    <>
      {/* Centered assistant bar */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 bottom-8 z-40 w-[94%] max-w-4xl transition-all duration-200 ${
          minimized ? "opacity-0 translate-y-6 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="shadow-sm border bg-white rounded-[20px] px-4 py-3 flex items-center gap-3" data-tour-id="assistant-input">
        {/* Left icon group */}
        <div className="flex items-center gap-2">
          <button className="h-10 w-10 rounded-xl border flex items-center justify-center text-muted-foreground hover:bg-muted">
            <Plus className="h-4 w-4" />
          </button>
          <button className="h-10 w-10 rounded-xl border flex items-center justify-center text-muted-foreground hover:bg-muted">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button className="h-10 w-10 rounded-xl border flex items-center justify-center text-primary hover:bg-muted" onClick={() => setPanelOpen((v) => !v)}>
            <Clock className="h-4 w-4" />
          </button>
        </div>

        {/* Prompt input */}
        <div className="min-w-0 flex-1 pl-1">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="h-10 text-[16px]"
            onKeyDown={async (e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!input.trim() || sending) return;
                const text = input.trim();
                setInput("");
                setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text, at: Date.now() }]);
                setPanelOpen(true);
                setSending(true);
                try {
                  const res = await fetch("/api/agent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      message: text,
                      history: messages.map((m) => ({ role: m.role, text: m.text })).slice(-10),
                    }),
                  });
                  const data = await res.json();
                  const reply = data?.reply ?? (res.ok ? "" : "Something went wrong");
                  if (reply) {
                    handleAgentReply(reply);
                  } else {
                    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", text: "I'm sorry, I couldn't process that. Please try again.", at: Date.now() }]);
                  }
                } catch {
                  setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", text: "Network error. Please try again.", at: Date.now() }]);
                } finally {
                  setSending(false);
                }
              }
            }}
          />
        </div>

        {/* Model label */}
       

        {/* Submit */}
        <button
          className="h-10 w-10 rounded-xl bg-[#e9b6a5] text-white flex items-center justify-center hover:opacity-90 disabled:opacity-60"
          disabled={sending || !input.trim()}
          onClick={async () => {
            if (!input.trim() || sending) return;
            const text = input.trim();
            setInput("");
            setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", text, at: Date.now() }]);
            setPanelOpen(true);
            setSending(true);
            try {
              const res = await fetch("/api/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  message: text,
                  history: messages.map((m) => ({ role: m.role, text: m.text })).slice(-10),
                }),
              });
              const data = await res.json();
              const reply = data?.reply ?? (res.ok ? "" : "Something went wrong");
              if (reply) {
                handleAgentReply(reply);
              } else {
                setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", text: "I'm sorry, I couldn't process that. Please try again.", at: Date.now() }]);
              }
            } catch {
              setMessages((m) => [...m, { id: crypto.randomUUID(), role: "assistant", text: "Network error. Please try again.", at: Date.now() }]);
            } finally {
              setSending(false);
            }
          }}
        >
          <ArrowUpRight className="h-5 w-5" />
        </button>
        </div>
      </div>

      {/* Spring-open bubble (visible when minimized) */}
      <button
        aria-label="Open assistant"
        onClick={() => { setMinimized(false); setPanelOpen(true); }}
        className={`fixed bottom-8 right-6 z-40 h-12 w-12 rounded-full shadow-sm border bg-white flex items-center justify-center transition-all duration-200 ${
          minimized ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <MessageCircle className="h-5 w-5 text-foreground" />
      </button>

      {/* Chat panel */}
      {panelOpen && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-40 w-[96%] max-w-6xl h-[80vh]">
          <Card className="border shadow-sm bg-white rounded-t-2xl overflow-hidden h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-medium">Assistant</div>
              <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setPanelOpen(false)}>
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3 space-y-3">
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-2xl px-3 py-2 text-sm bg-muted">
                      Here’s what I can help with right now.
                    </div>
                  </div>
                  <div className="w-full flex flex-wrap gap-2 pl-1 mt-2">
                    {DEFAULT_ACTIONS.map((s, i) => (
                      <button
                        key={i}
                        className="text-xs px-2 py-1 rounded-full border hover:bg-muted"
                        onClick={() => {
                          setInput(s.prompt);
                        }}
                      >
                        {s.title}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="space-y-2">
                    {m.linkOnly ? null : (
                      <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-[#e9b6a5] text-white" : "bg-muted"}`}>
                          {m.text}
                        </div>
                      </div>
                    )}
                    {m.linkHref ? (
                      <div className="flex justify-start pl-1">
                        <a className="text-sm underline text-primary" href={m.linkHref} target="_blank" rel="noreferrer">
                          {m.linkLabel || m.linkHref}
                        </a>
                      </div>
                    ) : null}
                    {(() => {
                      if (m.role !== "assistant") return null;
                      const isHelp = /here[’']s what i can (do|help with) right now\.?/i.test((m.text || "").trim());
                      const chips = (m.suggestions && m.suggestions.length > 0)
                        ? m.suggestions
                        : (isHelp ? DEFAULT_ACTIONS : []);
                      if (chips.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-2 pl-1">
                          {chips.map((s, i) => (
                            <button
                              key={i}
                              className="text-xs px-2 py-1 rounded-full border hover:bg-muted"
                              onClick={() => {
                                setInput(s.prompt);
                              }}
                            >
                              {s.title}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ))
              )}
              {sending && (
                <div className="text-xs text-muted-foreground">Thinking…</div>
              )}
            </div>
            {/* Hide panel input; use the bottom bar input instead */}
            <div className="p-3 border-t flex items-center gap-2 hidden">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} className="h-10 text-[14px]" />
              <Button disabled>Send</Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export default AssistantWidget;


