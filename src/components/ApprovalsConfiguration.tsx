"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield } from "lucide-react";

export function ApprovalsConfiguration() {
  const [requireApprovalFor, setRequireApprovalFor] = useState<string[]>(['viewing_booking']);
  const [notifyMethod, setNotifyMethod] = useState('email');

  const toggleApproval = (phase: string) => {
    if (requireApprovalFor.includes(phase)) {
      setRequireApprovalFor(requireApprovalFor.filter(p => p !== phase));
    } else {
      setRequireApprovalFor([...requireApprovalFor, phase]);
    }
  };

  const phases = [
    { id: 'screening', name: 'Before Starting Screening', description: 'Bot asks for approval before collecting tenant info' },
    { id: 'property_add', name: 'Before Adding Property', description: 'Bot asks for approval before importing property from URL' },
    { id: 'viewing_proposal', name: 'Before Proposing Viewing', description: 'Bot asks for approval before offering viewing slots' },
    { id: 'viewing_booking', name: 'Before Booking Viewing', description: 'Bot asks for approval before confirming appointment' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Approval Checkpoints</p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Require human approval before the bot takes specific actions. The bot will pause and notify you.
          </p>
        </div>
      </div>

      {/* Approval Toggles */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Require Approval For:</Label>
        
        <div className="space-y-2">
          {phases.map((phase) => (
            <div key={phase.id} className="flex items-start justify-between p-4 rounded-lg border bg-card">
              <div className="flex-1 pr-4">
                <Label className="text-sm font-medium cursor-pointer">{phase.name}</Label>
                <p className="text-xs text-muted-foreground mt-1">{phase.description}</p>
              </div>
              <Switch
                checked={requireApprovalFor.includes(phase.id)}
                onCheckedChange={() => toggleApproval(phase.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Notification Method</Label>
        <p className="text-xs text-muted-foreground mb-2">How to notify you when approval is needed</p>
        <Select value={notifyMethod} onValueChange={setNotifyMethod}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">📧 Email</SelectItem>
            <SelectItem value="sms">📱 SMS</SelectItem>
            <SelectItem value="slack">💬 Slack</SelectItem>
            <SelectItem value="whatsapp">📲 WhatsApp</SelectItem>
            <SelectItem value="dashboard">🔔 Dashboard Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Current Setup:</p>
        <div className="text-sm">
          {requireApprovalFor.length > 0 ? (
            <div className="space-y-1">
              <p className="font-medium">Bot will pause for approval before:</p>
              <ul className="list-disc list-inside text-muted-foreground pl-2 space-y-0.5">
                {requireApprovalFor.map(id => {
                  const phase = phases.find(p => p.id === id);
                  return <li key={id}>{phase?.name.replace('Before ', '')}</li>;
                })}
              </ul>
              <p className="text-muted-foreground mt-2 pt-2 border-t">
                Notifications via: <span className="font-medium">{notifyMethod}</span>
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Full automation - no approvals required</p>
          )}
        </div>
      </div>
    </div>
  );
}

