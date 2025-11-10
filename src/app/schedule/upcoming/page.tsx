"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Event = {
  id: string;
  title?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  inviteeName?: string | null;
  inviteeEmail?: string | null;
  inviteePhone?: string | null;
  status?: string | null;
};

export default function UpcomingSchedulePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/scheduling/events', { credentials: 'include' });
        const data = await res.json();
        setEvents(Array.isArray(data.events) ? data.events : []);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <AppShell breadcrumbItems={[{ label: 'Schedule' }, { label: 'Upcoming' }]} showAddButton={false}>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Appointments</CardTitle>
          <CardDescription>Shows events saved by the assistant and syncs</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <div className="h-6 bg-muted animate-pulse rounded" />
              <div className="h-6 bg-muted animate-pulse rounded" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-sm text-muted-foreground">No upcoming appointments.</div>
          ) : (
            <div className="space-y-3">
              {events.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 border-b pb-2 last:border-0">
                  <div className="w-28 text-sm text-muted-foreground">
                    {ev.startTime ? new Date(ev.startTime).toLocaleString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{ev.title || 'Meeting'}</div>
                    <div className="text-xs text-muted-foreground">{ev.inviteeName || ev.inviteeEmail || ev.inviteePhone || ''}</div>
                    <div className="text-xs text-muted-foreground">{ev.startTime ? new Date(ev.startTime).toLocaleString('en-SG') : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}



