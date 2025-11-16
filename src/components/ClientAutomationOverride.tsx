"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, Save, X, UserCheck, Home, MessageCircle, Calendar, CalendarCheck, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AutomationConfig = {
  automatedPhases: string[];
  maxPhase: string;
  requireApproval: {
    beforeScreening: boolean;
    beforePropertyAdd: boolean;
    beforeViewingProposal: boolean;
    beforeViewingBooking: boolean;
  };
  behavior: {
    tone: string;
    responseSpeed: string;
    autoFollowUp: boolean;
  };
};

type BotConfig = {
  id: string;
  name: string;
  naturalLanguageInput: string;
  parsedConfig: string | AutomationConfig;
  clientId: string | null;
};

const PHASE_ICONS: Record<string, any> = {
  screening: UserCheck,
  property_detection: Home,
  property_qa: MessageCircle,
  viewing_proposal: Calendar,
  viewing_booking: CalendarCheck,
  followup: Mail,
};

const PHASE_DISPLAY_NAMES: Record<string, string> = {
  screening: "Screening",
  property_detection: "Property Detection",
  property_qa: "Property Q&A",
  viewing_proposal: "Viewing Proposal",
  viewing_booking: "Viewing Booking",
  followup: "Follow-up",
};

type ClientAutomationOverrideProps = {
  clientId: string;
  clientName: string;
};

export function ClientAutomationOverride({ clientId, clientName }: ClientAutomationOverrideProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [currentConfig, setCurrentConfig] = useState<BotConfig | null>(null);
  const [globalConfig, setGlobalConfig] = useState<BotConfig | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadConfigs();
  }, [clientId]);

  const loadConfigs = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/bot-config?clientId=${clientId}`);
      if (!response.ok) throw new Error("Failed to load configs");
      
      const data = await response.json();
      const configs = data.all || [];
      
      // Find client-specific and global configs
      const clientSpecific = configs.find((c: BotConfig) => c.clientId === clientId);
      const global = configs.find((c: BotConfig) => c.clientId === null);
      
      setCurrentConfig(clientSpecific || null);
      setGlobalConfig(global || null);
      
      if (clientSpecific) {
        setNaturalLanguageInput(clientSpecific.naturalLanguageInput);
      }
    } catch (error) {
      console.error("Error loading configs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!naturalLanguageInput.trim()) {
      toast({
        title: "Input required",
        description: "Please describe the automation rules for this client",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch("/api/bot-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentConfig?.id,
          name: `${clientName} - Custom Rules`,
          naturalLanguageInput,
          clientId,
        }),
      });

      if (!response.ok) throw new Error("Failed to save config");

      toast({
        title: "Success!",
        description: "Client-specific automation rules saved",
      });

      setIsEditing(false);
      await loadConfigs();
    } catch (error) {
      console.error("Error saving config:", error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!currentConfig) return;

    try {
      const response = await fetch(`/api/bot-config?id=${currentConfig.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to remove config");

      toast({
        title: "Removed",
        description: "Client will now use global automation rules",
      });

      setCurrentConfig(null);
      setNaturalLanguageInput("");
      setIsEditing(false);
    } catch (error) {
      console.error("Error removing config:", error);
      toast({
        title: "Error",
        description: "Failed to remove configuration",
        variant: "destructive",
      });
    }
  };

  const getParsedConfig = (config: BotConfig): AutomationConfig => {
    return typeof config.parsedConfig === "string"
      ? JSON.parse(config.parsedConfig)
      : config.parsedConfig;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const activeConfig = currentConfig || globalConfig;
  const parsedConfig = activeConfig ? getParsedConfig(activeConfig) : null;
  const isUsingGlobal = !currentConfig && globalConfig;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Bot Automation Rules</CardTitle>
            <CardDescription>
              {isUsingGlobal
                ? "Using global automation rules"
                : "Custom rules for this client"}
            </CardDescription>
          </div>
          {!isEditing && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                {currentConfig ? "Edit" : "Customize"}
              </Button>
              {currentConfig && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemove}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="space-y-2">
              <Label>Automation Instructions</Label>
              <Textarea
                value={naturalLanguageInput}
                onChange={(e) => setNaturalLanguageInput(e.target.value)}
                placeholder="Example: For this VIP client, I want full automation including automatic booking"
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Describe how the bot should behave specifically for {clientName}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                size="sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setNaturalLanguageInput(currentConfig?.naturalLanguageInput || "");
                }}
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </>
        ) : parsedConfig ? (
          <>
            {isUsingGlobal && (
              <div className="p-3 bg-muted rounded-md text-sm text-muted-foreground">
                This client is using your default automation settings. Click "Customize" to create client-specific rules.
              </div>
            )}
            {currentConfig && (
              <div className="space-y-2 mb-4 p-3 bg-muted/50 rounded-lg">
                <Label className="text-xs font-medium">Custom Instructions</Label>
                <p className="text-sm italic">"{currentConfig.naturalLanguageInput}"</p>
              </div>
            )}
            
            {/* Visual Phase Grid */}
            <div>
              <Label className="text-xs text-muted-foreground mb-3 block">Automation Workflow</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(PHASE_ICONS).map(([phase, Icon]) => {
                  const isAutomated = parsedConfig.automatedPhases.includes(phase);
                  return (
                    <div
                      key={phase}
                      className="flex flex-col items-center gap-2 p-3 rounded-lg border transition-all"
                      style={{
                        backgroundColor: isAutomated ? "hsl(var(--primary) / 0.1)" : "hsl(var(--muted) / 0.5)",
                        borderColor: isAutomated ? "hsl(var(--primary) / 0.3)" : "hsl(var(--border))",
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{
                          color: isAutomated ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                        }}
                      />
                      <span className="text-[10px] text-center font-medium leading-tight">
                        {PHASE_DISPLAY_NAMES[phase]}
                      </span>
                      <Badge
                        variant={isAutomated ? "default" : "outline"}
                        className="text-[9px] h-4 px-1.5"
                      >
                        {isAutomated ? "Auto" : "Manual"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Summary Stats */}
            <div className="flex gap-3 text-xs text-muted-foreground pt-3 border-t">
              <span>Max Phase: <span className="font-medium text-foreground">{parsedConfig.maxPhase}</span></span>
              <span>•</span>
              <span>Tone: <span className="font-medium text-foreground">{parsedConfig.behavior.tone}</span></span>
              <span>•</span>
              <span>
                <span className="font-medium text-foreground">{parsedConfig.automatedPhases.length}</span>/6 automated
              </span>
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            No automation rules configured. Click "Customize" to set client-specific rules.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

