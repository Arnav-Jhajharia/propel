"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Search, Link as LinkIcon, Calendar, Tag } from "lucide-react";

type Conversation = {
  id: string;
  clientName: string;
  clientAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
  needsAction: boolean;
  unreadCount: number;
};

type Message = {
  id: string;
  content: string;
  sender: "client" | "agent";
  timestamp: string;
};

export default function UnifiedChatPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>("1");
  const [messageInput, setMessageInput] = useState("");

  // Mock data
  const conversations: Conversation[] = [
    {
      id: "1",
      clientName: "Sarah Johnson",
      clientAvatar: "",
      lastMessage: "I'm interested in the 2BR apartment",
      lastMessageTime: "2m ago",
      needsAction: true,
      unreadCount: 2,
    },
    {
      id: "2",
      clientName: "Michael Chen",
      lastMessage: "When can I schedule a viewing?",
      lastMessageTime: "15m ago",
      needsAction: true,
      unreadCount: 1,
    },
    {
      id: "3",
      clientName: "Emma Davis",
      lastMessage: "Thank you for the information!",
      lastMessageTime: "1h ago",
      needsAction: false,
      unreadCount: 0,
    },
  ];

  const messages: Message[] = [
    {
      id: "1",
      content: "Hi, I saw your listing for the 2BR apartment on Main Street. Is it still available?",
      sender: "client",
      timestamp: "10:30 AM",
    },
    {
      id: "2",
      content: "Yes, it's still available! Would you like to schedule a viewing?",
      sender: "agent",
      timestamp: "10:32 AM",
    },
    {
      id: "3",
      content: "I'm interested in the 2BR apartment",
      sender: "client",
      timestamp: "10:35 AM",
    },
  ];

  const selectedClient = conversations.find((c) => c.id === selectedConversation);

  return (
    <AppShell showAddButton={false} maxWidth="none">
      <div className="flex h-[calc(100vh-8rem)] gap-0 -m-6">
        {/* Left Panel: Client List (20%) */}
        <div className="w-[20%] border-r border-border bg-background flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`p-4 border-b border-border cursor-pointer transition-colors ${
                  selectedConversation === conv.id
                    ? "bg-accent"
                    : "hover:bg-muted/50"
                } ${conv.needsAction ? "border-l-4 border-l-primary" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={conv.clientAvatar} />
                    <AvatarFallback>{conv.clientName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium text-sm truncate">{conv.clientName}</span>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate mb-1">
                      {conv.lastMessage}
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{conv.lastMessageTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center Panel: Chat Window (55%) */}
        <div className="w-[55%] flex flex-col bg-background">
          {/* Chat Header */}
          <div className="p-4 border-b border-border bg-accent/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedClient?.clientAvatar} />
                  <AvatarFallback>{selectedClient?.clientName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{selectedClient?.clientName}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Conversation via WhatsApp Chatbot
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "agent" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    msg.sender === "agent"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <div className="text-sm">{msg.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      msg.sender === "agent" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="flex-1"
              />
              <Button size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Right Panel: Client Context (25%) */}
        <div className="w-[25%] border-l border-border bg-background overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Client Snapshot */}
            <div>
              <h3 className="font-semibold mb-3">Client Profile</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <div className="font-medium">{selectedClient?.clientName}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Lead Score:</span>
                  <div className="font-medium">85/100</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Preferred Type:</span>
                  <div className="font-medium">2-3 BR Apartment</div>
                </div>
              </div>
            </div>

            {/* Interaction History */}
            <div>
              <h3 className="font-semibold mb-3">Interaction History</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                  <div>
                    <div className="font-medium">Property viewed</div>
                    <div className="text-xs text-muted-foreground">2 days ago</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                  <div>
                    <div className="font-medium">Initial inquiry</div>
                    <div className="text-xs text-muted-foreground">5 days ago</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Send Property Link
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Follow-up
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Tag className="h-4 w-4 mr-2" />
                  Tag as Hot Lead
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}


