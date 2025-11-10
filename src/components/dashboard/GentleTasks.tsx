"use client";

import { Button } from "@/components/ui/button";

export default function GentleTasks() {
  const tasks = [
    { text: "Confirm viewing with Priya (2pm)", cta: "Confirm" },
    { text: "Follow up with Marcus about River Valley", cta: "Send" },
    { text: "Share brochure with Ava", cta: "Share" },
  ];

  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-sm font-medium mb-2">Today</div>
      <div className="space-y-2">
        {tasks.map((t, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-sm">
            <div className="text-foreground/90">{t.text}</div>
            <Button size="sm" variant="outline" className="h-7 px-3">
              {t.cta}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}


