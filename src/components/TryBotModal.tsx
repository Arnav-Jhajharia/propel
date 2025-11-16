"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Send, User, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  role: 'user' | 'bot';
  text: string;
};

type Lead = {
  id: string;
  name: string;
  phone: string;
  avatar: string;
};

// Simulated demo leads
const DEMO_LEADS: Lead[] = [
  { id: '1', name: 'Sarah Chen', phone: '+65-9123-4567', avatar: '👩‍💼' },
  { id: '2', name: 'John Tan', phone: '+65-8234-5678', avatar: '👨‍💼' },
  { id: '3', name: 'Maria Santos', phone: '+65-9345-6789', avatar: '👩' },
  { id: '4', name: 'David Lee', phone: '+65-8456-7890', avatar: '👨' },
  { id: '5', name: 'Emma Wong', phone: '+65-9567-8901', avatar: '👩‍🎓' },
];

type TryBotModalProps = {
  onClose: () => void;
};

export function TryBotModal({ onClose }: TryBotModalProps) {
  const [selectedLead, setSelectedLead] = useState<Lead>(DEMO_LEADS[0]);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', text: 'Hi! I\'m your property assistant. How can I help you today?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    
    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userMessage
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // Convert messages to history (exclude initial greeting and current message)
      const history = messages
        .slice(1)
        .map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          text: msg.text
        }));

      // Call the real LangGraph agent with the selected lead's phone
      const response = await fetch('/api/lead-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: history,
          clientPhone: selectedLead.phone
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from agent');
      }

      const result = await response.json();

      // Add bot response
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: result.reply || 'Sorry, I encountered an error. Please try again.'
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('Error calling lead agent:', error);
      
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: 'Sorry, I\'m having trouble connecting right now. Please try again.'
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadChange = (leadId: string) => {
    const newLead = DEMO_LEADS.find(l => l.id === leadId);
    if (newLead) {
      setSelectedLead(newLead);
      // Reset messages to greeting when switching leads
      setMessages([
        { id: '1', role: 'bot', text: 'Hi! I\'m your property assistant. How can I help you today?' }
      ]);
    }
  };

  const handleClearChat = async () => {
    // Clear the conversation for this lead
    await fetch('/api/clear-bot-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientPhone: selectedLead.phone })
    });
    
    // Reset UI messages
    setMessages([
      { id: '1', role: 'bot', text: 'Hi! I\'m your property assistant. How can I help you today?' }
    ]);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg h-[650px] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Try Your Bot</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Test with different simulated leads</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Lead Selector */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Select value={selectedLead.id} onValueChange={handleLeadChange}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{selectedLead.avatar}</span>
                      <div className="text-left">
                        <div className="font-medium text-sm">{selectedLead.name}</div>
                        <div className="text-xs text-muted-foreground">{selectedLead.phone}</div>
                      </div>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DEMO_LEADS.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{lead.avatar}</span>
                        <div>
                          <div className="font-medium">{lead.name}</div>
                          <div className="text-xs text-muted-foreground">{lead.phone}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleClearChat}
              title="Clear this lead's conversation"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                    msg.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-2.5">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                    <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
              placeholder={isLoading ? "Bot is thinking..." : "Type your message..."}
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage}
              size="icon"
              disabled={!inputText.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

