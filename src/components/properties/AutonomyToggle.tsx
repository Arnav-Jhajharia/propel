"use client";

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bot, User } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AutonomyToggleProps {
  propertyId: string;
  defaultEnabled?: boolean;
  onToggle?: (enabled: boolean) => void;
}

export function AutonomyToggle({ 
  propertyId, 
  defaultEnabled = false,
  onToggle 
}: AutonomyToggleProps) {
  const [enabled, setEnabled] = useState(defaultEnabled);

  // Load saved state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`autonomy_${propertyId}`);
    if (saved !== null) {
      setEnabled(saved === "true");
    }
  }, [propertyId]);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem(`autonomy_${propertyId}`, enabled.toString());
  }, [propertyId, enabled]);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (onToggle) {
      onToggle(checked);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-3 flex-1">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Label htmlFor={`autonomy-${propertyId}`} className="font-medium">
              Autonomy Mode
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={enabled ? "default" : "secondary"} className="cursor-help">
                  {enabled ? (
                    <>
                      <Bot className="h-3 w-3 mr-1" />
                      Active
                    </>
                  ) : (
                    <>
                      <User className="h-3 w-3 mr-1" />
                      Manual
                    </>
                  )}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1 text-xs">
                  {enabled ? (
                    <>
                      <p className="font-semibold">Autonomy Active</p>
                      <p>The bot will automatically accept/reject applicants based on score and budget fit.</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">Manual Mode</p>
                      <p>You'll review and approve all applicants manually.</p>
                    </>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-xs text-muted-foreground">
            {enabled 
              ? "Bot will automatically handle applicant decisions for this property"
              : "You'll manually review and approve all applicants"
            }
          </p>
        </div>
        <Switch
          id={`autonomy-${propertyId}`}
          checked={enabled}
          onCheckedChange={handleToggle}
        />
      </div>
    </div>
  );
}

