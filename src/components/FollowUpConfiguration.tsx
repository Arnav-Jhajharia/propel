"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type FollowUpMessage = {
  id: string;
  delay: string; // hours
  message: string;
};

const DEFAULT_FOLLOWUPS: FollowUpMessage[] = [
  { id: '1', delay: '24', message: 'Hi! Just following up - are you still interested in the property?' },
  { id: '2', delay: '72', message: 'Just checking in again. Would you like to schedule a viewing?' },
  { id: '3', delay: '168', message: 'This is our final follow-up. Let us know if you\'re interested!' },
];

export function FollowUpConfiguration() {
  const [enabled, setEnabled] = useState(true);
  const [maxFollowUps, setMaxFollowUps] = useState('3');
  const [followUps, setFollowUps] = useState<FollowUpMessage[]>(DEFAULT_FOLLOWUPS);
  const [fallbackMessage, setFallbackMessage] = useState("Thanks for getting back to us! An agent will reach out to you directly.");

  const addFollowUp = () => {
    setFollowUps([...followUps, {
      id: Date.now().toString(),
      delay: '24',
      message: ''
    }]);
  };

  const updateFollowUp = (id: string, field: 'delay' | 'message', value: string) => {
    setFollowUps(followUps.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const removeFollowUp = (id: string) => {
    setFollowUps(followUps.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Enable Follow-ups */}
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
        <div>
          <Label className="text-sm font-medium">Enable Automatic Follow-ups</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Send automated messages to inactive leads</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <>
          {/* Max Follow-ups */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Maximum Follow-ups</Label>
            <Input
              type="number"
              value={maxFollowUps}
              onChange={(e) => setMaxFollowUps(e.target.value)}
              className="h-9 w-32"
              min="1"
              max="5"
            />
            <p className="text-xs text-muted-foreground">Stop after this many attempts</p>
          </div>

          {/* Follow-up Messages */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Follow-up Schedule</Label>
              <Button onClick={addFollowUp} size="sm" variant="ghost">
                <Plus className="w-4 h-4 mr-1" />
                Add Message
              </Button>
            </div>

            <div className="space-y-2">
              {followUps.map((followUp, idx) => (
                <div key={followUp.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card/50">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">#{idx + 1}</span>
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">After</Label>
                      <Input
                        type="number"
                        value={followUp.delay}
                        onChange={(e) => updateFollowUp(followUp.id, 'delay', e.target.value)}
                        className="h-8 w-20 text-sm"
                      />
                      <Label className="text-xs text-muted-foreground">hours</Label>
                    </div>
                    <Textarea
                      value={followUp.message}
                      onChange={(e) => updateFollowUp(followUp.id, 'message', e.target.value)}
                      placeholder="Follow-up message..."
                      rows={2}
                      className="resize-none text-sm"
                    />
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => removeFollowUp(followUp.id)}
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Fallback */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Fallback Response</Label>
            <p className="text-xs text-muted-foreground">When user responds after max follow-ups</p>
            <Textarea
              value={fallbackMessage}
              onChange={(e) => setFallbackMessage(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </>
      )}

      {/* Preview */}
      <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Follow-up Timeline:</p>
        <div className="text-sm space-y-1">
          {followUps.map((f, idx) => (
            <div key={f.id} className="text-muted-foreground">
              <span className="font-medium">{f.delay}h:</span> {f.message}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

