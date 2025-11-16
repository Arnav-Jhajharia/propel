"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { toast } from "sonner";

type Highlight = {
  id: string;
  name: string;
  avatar?: string;
  lastMessage: string;
  when: string; // e.g., "2h ago"
};

export default function ConversationHighlights({ items }: { items?: Highlight[] }) {
  const highlights = useMemo<Highlight[]>(
    () =>
      items ?? [
        {
          id: "1",
          name: "Marcus Lee",
          avatar:
            "https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=400&auto=format&fit=crop",
          lastMessage: "Budget 5.5k, can do viewing this Sat?",
          when: "2h ago",
        },
        {
          id: "2",
          name: "Priya Sharma",
          avatar:
            "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop",
          lastMessage: "Prefer 3BR, flexible on location.",
          when: "yesterday",
        },
        {
          id: "3",
          name: "Ava Tan",
          avatar:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop",
          lastMessage: "Is the unit pet‑friendly?",
          when: "2 days ago",
        },
      ],
    [items]
  );

  const chip = (label: string) => (
    <button
      key={label}
      className="text-xs px-2.5 py-1 rounded-full border hover:bg-muted"
      onClick={() => toast(`${label} – coming soon`)}
      aria-label={label}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Recent conversations</div>
      <div className="rounded-xl border bg-white">
        {highlights.map((h, i) => (
          <div
            key={h.id}
            className={`flex items-start gap-3 p-3 ${i !== 0 ? "border-t" : ""}`}
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={h.avatar} />
              <AvatarFallback>
                {h.name
                  .split(" ")
                  .map((x) => x[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium truncate">{h.name}</div>
                <time className="text-xs text-muted-foreground shrink-0">{h.when}</time>
              </div>
              <div className="text-sm text-muted-foreground truncate">{h.lastMessage}</div>
              <div className="mt-2 flex gap-2 flex-wrap">
                {chip("Send availability")}
                {chip("Share brochure")}
                {chip("Schedule viewing")}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" className="text-sm px-2 h-7" onClick={() => toast("Open inbox – coming soon")}>Open inbox →</Button>
      </div>
    </div>
  );
}


