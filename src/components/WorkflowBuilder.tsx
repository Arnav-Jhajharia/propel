"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCheck, MessageCircle, Calendar, Play, CheckSquare, Plus, X, Home, CalendarCheck, Mail, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScreeningConfiguration } from "./ScreeningConfiguration";

type WorkflowPhase = {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
  color: string;
};

type Message = {
  id: string;
  role: 'user' | 'bot';
  text: string;
};

type WorkflowBuilderProps = {
  onSave?: (phases: WorkflowPhase[]) => void;
  initialPhases?: WorkflowPhase[];
  contextName?: string;
};

const DEFAULT_PHASES: WorkflowPhase[] = [
  { 
    id: "screening", 
    name: "Screening", 
    description: "Qualify tenant with budget, move-in date, employment",
    icon: UserCheck, 
    enabled: true, 
    color: "#FF6B4A",
  },
  { 
    id: "property_detection", 
    name: "Property Detection", 
    description: "Auto-detect and add property from URL",
    icon: Home, 
    enabled: true, 
    color: "#FF6B4A",
  },
  { 
    id: "property_qa", 
    name: "Property Q&A", 
    description: "Answer questions about the property",
    icon: MessageCircle, 
    enabled: true, 
    color: "#FF6B4A",
  },
  { 
    id: "viewing_proposal", 
    name: "Viewing Proposal", 
    description: "Suggest available viewing time slots",
    icon: Calendar, 
    enabled: true, 
    color: "#FF6B4A",
  },
  { 
    id: "viewing_booking", 
    name: "Viewing Booking", 
    description: "Confirm and book viewing appointments",
    icon: CalendarCheck, 
    enabled: true, 
    color: "#FF6B4A",
  },
  { 
    id: "followup", 
    name: "Follow-up", 
    description: "Send automated follow-up messages",
    icon: Mail, 
    enabled: true, 
    color: "#FF6B4A",
  },
];

const DEFAULT_SCREENING_QUESTIONS = [
  "What is your monthly budget?",
  "When do you need to move in?",
  "What is your employment status?",
  "How many people will be living here?",
];

export function WorkflowBuilder({
  onSave,
  initialPhases = DEFAULT_PHASES,
  contextName = "Agent Workflow",
}: WorkflowBuilderProps) {
  const [phases, setPhases] = useState<WorkflowPhase[]>(initialPhases);
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'bot', text: 'Hi! I\'m your property assistant. How can I help you today?' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNodeClick = (phaseId: string) => {
    setPhases(phases.map(p => 
      p.id === phaseId ? { ...p, enabled: !p.enabled } : p
    ));
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    
    // Add user message immediately
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userMessage
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // Convert messages to history format for API (exclude initial greeting and current user message)
      const history = messages
        .slice(1) // Skip initial bot greeting
        .map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          text: msg.text
        }));

      // Call the REAL LangGraph lead agent API with state persistence
      const response = await fetch('/api/lead-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: history,
          clientPhone: 'demo-test-client' // Demo client for testing
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from agent');
      }

      const result = await response.json();

      // Add bot response from actual LangGraph agent
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'bot',
        text: result.reply || 'Sorry, I encountered an error. Please try again.'
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('Error calling lead agent:', error);
      
      // Add error message
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


  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight font-sans">{contextName}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your automation
        </p>
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex gap-8 min-h-0">
        {/* Left: Workflow Canvas + Configuration */}
        <div className="flex-1 flex flex-col gap-8 min-w-0">
          {/* Horizontal Node Layout - Simplified */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border py-6 px-8 flex items-center justify-center overflow-x-auto">
            <div className="flex items-center gap-2 mx-auto">
              {/* Start */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-xl bg-gray-100 border flex items-center justify-center">
                  <Play className="w-5 h-5 text-gray-400" />
                </div>
                <span className="text-xs text-muted-foreground">Start</span>
              </div>

              <div className="text-gray-300 mx-1">→</div>

              {/* Phase Nodes */}
              {phases.map((phase, index) => {
                const Icon = phase.icon;
                const isEnabled = phase.enabled;
                const isLast = index === phases.length - 1;
                
                return (
                  <div key={phase.id} className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        handleNodeClick(phase.id);
                        setSelectedPhase(phase.id);
                      }}
                      className="relative flex flex-col items-center gap-1.5 transition-all hover:scale-105"
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center transition-all",
                        isEnabled 
                          ? "bg-[#FF6B4A] shadow-md" 
                          : "bg-gray-100 border"
                      )}>
                        <Icon className={cn(
                          "w-5 h-5",
                          isEnabled ? "text-white" : "text-gray-400"
                        )} />
                      </div>
                      <span className={cn(
                        "text-xs text-center max-w-[70px] leading-tight",
                        isEnabled ? "text-foreground font-medium" : "text-muted-foreground"
                      )}>
                        {phase.name}
                      </span>
                    </button>

                    {!isLast && <div className="text-gray-300 mx-1">→</div>}
                  </div>
                );
              })}

              <div className="text-gray-300 mx-1">→</div>

              {/* End */}
              <div className="flex flex-col items-center gap-1.5">
                <div className="w-14 h-14 rounded-xl bg-gray-100 border flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-gray-400" />
                </div>
                <span className="text-xs text-muted-foreground">End</span>
              </div>
            </div>
          </div>

          {/* Configuration Panel */}
          {selectedPhase === 'screening' ? (
            <div className="flex-1 min-h-0">
              <ScreeningConfiguration />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-sm text-muted-foreground">
                {selectedPhase 
                  ? `${phases.find(p => p.id === selectedPhase)?.name} configuration coming soon`
                  : 'Click a phase above to configure'
                }
              </div>
            </div>
          )}
        </div>

        {/* Right: Interactive Chatbot */}
        <div className="w-96 flex flex-col min-w-0">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Try Customization</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Chat with your bot to test the current setup
              </p>
            </CardHeader>
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
                          : "bg-gray-100 dark:bg-gray-800 text-foreground"
                      )}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
                  placeholder={isLoading ? "Agent is thinking..." : "Type your message..."}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleSendMessage}
                  size="icon"
                  disabled={!inputText.trim() || isLoading}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="mt-3">
                <Button 
                  onClick={() => onSave?.(phases)}
                  className="w-full"
                  variant="default"
                >
                  Save Configuration
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
