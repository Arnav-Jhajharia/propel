"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle } from "lucide-react";

export function FallbackConfiguration() {
  const [fallbackMessage, setFallbackMessage] = useState("Thanks for your message! I'll have one of our agents follow up with you shortly.");
  const [noPropertyMessage, setNoPropertyMessage] = useState("Could you share the PropertyGuru or 99.co link? Or tell me the area, bedrooms and budget so I can suggest options.");
  const [errorMessage, setErrorMessage] = useState("I'm having trouble with that right now. Let me connect you with an agent who can help.");

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
        <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-orange-900 dark:text-orange-100">Fallback Responses</p>
          <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
            What the bot says when it can't handle a situation or encounters an error.
          </p>
        </div>
      </div>

      {/* General Fallback */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">General Fallback Message</Label>
        <p className="text-xs text-muted-foreground">When bot can't handle the request or phase is disabled</p>
        <Textarea
          value={fallbackMessage}
          onChange={(e) => setFallbackMessage(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* No Property Fallback */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">No Property Message</Label>
        <p className="text-xs text-muted-foreground">When user asks questions but hasn't shared a property link yet</p>
        <Textarea
          value={noPropertyMessage}
          onChange={(e) => setNoPropertyMessage(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Error Fallback */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Error Message</Label>
        <p className="text-xs text-muted-foreground">When the bot encounters a technical error</p>
        <Textarea
          value={errorMessage}
          onChange={(e) => setErrorMessage(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Example Scenarios:</p>
        <div className="text-sm space-y-2">
          <div>
            <span className="font-medium">Scenario:</span> Phase disabled
            <br />
            <span className="text-muted-foreground">Bot says:</span> "{fallbackMessage}"
          </div>
          <div>
            <span className="font-medium">Scenario:</span> No property link shared
            <br />
            <span className="text-muted-foreground">Bot says:</span> "{noPropertyMessage}"
          </div>
          <div>
            <span className="font-medium">Scenario:</span> Technical error
            <br />
            <span className="text-muted-foreground">Bot says:</span> "{errorMessage}"
          </div>
        </div>
      </div>
    </div>
  );
}

