"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, Info } from "lucide-react";
import { AttentionReason, getAttentionMessages } from "@/lib/attention-detection";

interface AttentionBadgeProps {
  reasons: AttentionReason[];
  variant?: "default" | "compact";
}

export function AttentionBadge({ reasons, variant = "default" }: AttentionBadgeProps) {
  if (reasons.length === 0) return null;

  const messages = getAttentionMessages(reasons);
  const severity = reasons.includes("budget_critical_low") ? "critical" : "warning";

  const badgeVariant = severity === "critical" ? "destructive" : "secondary";
  const icon = severity === "critical" ? AlertTriangle : Info;
  const Icon = icon;

  if (variant === "compact") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={badgeVariant} className="cursor-help">
            <Icon className="h-3 w-3 mr-1" />
            {reasons.length}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">Requires Attention</p>
            <ul className="list-disc list-inside text-xs space-y-0.5">
              {messages.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={badgeVariant} className="cursor-help">
          <Icon className="h-3 w-3 mr-1" />
          Requires Attention
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p className="font-semibold">Attention Required</p>
          <ul className="list-disc list-inside text-xs space-y-0.5">
            {messages.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

