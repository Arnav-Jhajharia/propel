"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function HandoffConfiguration() {
  const [requireApprovalFor, setRequireApprovalFor] = useState<string[]>(['viewing_booking']);
  const [handoffMessage, setHandoffMessage] = useState("I'll have one of our agents follow up with you shortly to assist further.");
  const [notifyMethod, setNotifyMethod] = useState('email');

  const toggleApproval = (phase: string) => {
    if (requireApprovalFor.includes(phase)) {
      setRequireApprovalFor(requireApprovalFor.filter(p => p !== phase));
    } else {
      setRequireApprovalFor([...requireApprovalFor, phase]);
    }
  };

  const phases = [
    { id: 'screening', name: 'Before Screening' },
    { id: 'property_add', name: 'Before Adding Property' },
    { id: 'viewing_proposal', name: 'Before Proposing Viewing' },
    { id: 'viewing_booking', name: 'Before Booking Viewing' },
  ];

  return (
    <div className="space-y-8">
      {/* Approval Requirements */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Require Human Approval</Label>
        <p className="text-xs text-muted-foreground mb-3">Select which actions need human approval before proceeding</p>
        
        <div className="space-y-2">
          {phases.map((phase) => (
            <div key={phase.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <Label className="text-sm">{phase.name}</Label>
              <Switch
                checked={requireApprovalFor.includes(phase.id)}
                onCheckedChange={() => toggleApproval(phase.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Handoff Message */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Handoff Message</Label>
        <p className="text-xs text-muted-foreground">What bot says when handing over to human</p>
        <Textarea
          value={handoffMessage}
          onChange={(e) => setHandoffMessage(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Notification Method */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Notify Agent Via</Label>
        <Select value={notifyMethod} onValueChange={setNotifyMethod}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="sms">SMS</SelectItem>
            <SelectItem value="slack">Slack</SelectItem>
            <SelectItem value="whatsapp">WhatsApp</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Handoff Behavior:</p>
        <div className="text-sm space-y-1.5">
          {requireApprovalFor.length > 0 ? (
            <>
              <p>Bot will pause and notify you before:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                {requireApprovalFor.map(id => (
                  <li key={id}>{phases.find(p => p.id === id)?.name}</li>
                ))}
              </ul>
              <p className="text-muted-foreground mt-2">Message: "{handoffMessage}"</p>
            </>
          ) : (
            <p className="text-muted-foreground">No approval required - full automation</p>
          )}
        </div>
      </div>
    </div>
  );
}

