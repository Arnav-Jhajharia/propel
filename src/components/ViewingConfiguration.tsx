"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ViewingConfiguration() {
  const [autoPropose, setAutoPropose] = useState(true);
  const [autoBook, setAutoBook] = useState(false);
  const [proposalMessage, setProposalMessage] = useState("Would you like to schedule a viewing? I have slots available.");
  const [confirmationMessage, setConfirmationMessage] = useState("Perfect! Your viewing is confirmed for {slot}. See you then!");
  const [defaultDuration, setDefaultDuration] = useState('45');
  const [availableDays, setAvailableDays] = useState(['Saturday', 'Sunday']);

  return (
    <div className="space-y-8">
      {/* Auto Settings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
          <div>
            <Label className="text-sm font-medium">Auto-propose Viewings</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Automatically offer viewing slots after Q&A</p>
          </div>
          <Switch checked={autoPropose} onCheckedChange={setAutoPropose} />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
          <div>
            <Label className="text-sm font-medium">Auto-book Viewings</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Automatically confirm bookings without approval</p>
          </div>
          <Switch checked={autoBook} onCheckedChange={setAutoBook} />
        </div>
      </div>

      {/* Proposal Message */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Viewing Proposal Message</Label>
        <Textarea
          value={proposalMessage}
          onChange={(e) => setProposalMessage(e.target.value)}
          rows={2}
          className="resize-none"
        />
      </div>

      {/* Confirmation Message */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Booking Confirmation Message</Label>
        <Textarea
          value={confirmationMessage}
          onChange={(e) => setConfirmationMessage(e.target.value)}
          rows={2}
          className="resize-none"
          placeholder="Use {slot} for the time slot"
        />
      </div>

      {/* Default Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Default Duration (minutes)</Label>
          <Input
            type="number"
            value={defaultDuration}
            onChange={(e) => setDefaultDuration(e.target.value)}
            className="h-9"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Typical Time</Label>
          <Select defaultValue="3pm">
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="11am">11:00 AM</SelectItem>
              <SelectItem value="3pm">3:00 PM</SelectItem>
              <SelectItem value="5pm">5:00 PM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 rounded-lg bg-muted/30 border space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Example Flow:</p>
        <div className="text-sm space-y-1.5">
          <div>
            <span className="font-medium">Bot:</span> {proposalMessage}
            <br />
            <span className="text-muted-foreground text-xs">Available: Saturday 3 PM, Sunday 11 AM</span>
          </div>
          <div>
            <span className="font-medium">User:</span> "Saturday 3 PM"
            <br />
            <span className="text-muted-foreground">Bot:</span> {confirmationMessage.replace('{slot}', 'Saturday 3 PM')}
          </div>
        </div>
      </div>
    </div>
  );
}

