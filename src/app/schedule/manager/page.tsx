"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DayPicker } from "react-day-picker";
import Link from "next/link";
import "react-day-picker/dist/style.css";

type Event = {
  id: string;
  title?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  inviteeName?: string | null;
  inviteeEmail?: string | null;
  inviteePhone?: string | null;
  status?: string | null;
  propertyId?: string | null;
};

type PropertyRow = { id: string; title: string };

export default function ScheduleManagerPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [editing, setEditing] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  // Booking tab state (Calendly)
  const [calendlyUrl, setCalendlyUrl] = useState<string | null>(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [evRes, pRes] = await Promise.all([
          fetch("/api/scheduling/all", { credentials: "include" }),
          fetch("/api/properties", { credentials: "include" }),
        ]);
        const evData = await evRes.json();
        setEvents(Array.isArray(evData.events) ? evData.events : []);
        if (pRes.ok) {
          const pData = await pRes.json();
          setProperties(Array.isArray(pData?.properties) ? pData.properties.map((p: any) => ({ id: p.id, title: p.title })) : []);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      setBookLoading(true);
      try {
        const res = await fetch("/api/user/calendly", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data?.calendlyUrl) {
            setCalendlyUrl(data.calendlyUrl);
            return;
          }
        }
        const ls = typeof window !== "undefined" ? localStorage.getItem("calendly_url") : null;
        setCalendlyUrl(ls);
      } catch {
        const ls = typeof window !== "undefined" ? localStorage.getItem("calendly_url") : null;
        setCalendlyUrl(ls);
      } finally {
        setBookLoading(false);
      }
    };
    load();
  }, []);

  const eventsByDay = useMemo(() => {
    const map: Record<string, Event[]> = {};
    for (const ev of events) {
      const d = ev.startTime ? new Date(ev.startTime) : null;
      if (!d) continue;
      const key = d.toISOString().slice(0, 10);
      (map[key] ||= []).push(ev);
    }
    return map;
  }, [events]);

  const selectedKey = selectedDay ? new Date(selectedDay).toISOString().slice(0, 10) : "";
  const dayEvents = eventsByDay[selectedKey] || [];

  const upcoming = useMemo(() => {
    const now = Date.now();
    return events
      .filter((e) => e.status !== 'canceled')
      .filter((e) => (e.startTime ? Date.parse(e.startTime) >= now : false))
      .sort((a, b) => (Date.parse(a.startTime || '') - Date.parse(b.startTime || '')));
  }, [events]);

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const body: any = {
        title: editing.title || undefined,
        startTime: editing.startTime || undefined,
        endTime: editing.endTime || undefined,
        inviteeName: editing.inviteeName || undefined,
        inviteeEmail: editing.inviteeEmail || undefined,
        inviteePhone: editing.inviteePhone || undefined,
        propertyId: editing.propertyId || undefined,
      };
      const res = await fetch(`/api/scheduling/appointments/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEvents((rows) => rows.map((r) => (r.id === editing.id ? { ...r, ...body } : r)));
        setEditing(null);
      }
    } finally {
      setSaving(false);
    }
  };

  const cancelEvent = async (id: string) => {
    const res = await fetch(`/api/scheduling/appointments/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setEvents((rows) => rows.map((r) => (r.id === id ? { ...r, status: "canceled" } : r)));
  };

  return (
    <AppShell breadcrumbItems={[{ label: "Schedule" }, { label: "Manager" }]} showAddButton={false}>
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="book">Book</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>Quick view of events; click a day to see details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <DayPicker
                    mode="single"
                    selected={selectedDay}
                    onSelect={setSelectedDay as any}
                    modifiers={{ busy: Object.keys(eventsByDay).map((k) => new Date(k)) }}
                    modifiersClassNames={{ busy: "bg-primary/10 rounded-full" }}
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">{selectedDay ? selectedDay.toDateString() : ""}</div>
                  {loading ? (
                    <div className="space-y-2">
                      <div className="h-6 bg-muted animate-pulse rounded" />
                      <div className="h-6 bg-muted animate-pulse rounded" />
                    </div>
                  ) : dayEvents.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No events this day.</div>
                  ) : (
                    <div className="space-y-2">
                      {dayEvents.map((ev) => {
                        const start = ev.startTime ? new Date(ev.startTime) : null;
                        const end = ev.endTime ? new Date(ev.endTime) : null;
                        return (
                          <div key={ev.id} className="flex items-start gap-3 p-2 rounded border">
                            <div className="w-24 text-xs text-muted-foreground">
                              {start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              {end ? ` – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{ev.title || 'Meeting'}</div>
                              <div className="text-xs text-muted-foreground truncate">{ev.inviteeName || ev.inviteeEmail || ev.inviteePhone || ''}</div>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => setEditing(ev)}>Edit</Button>
                              {ev.status !== 'canceled' ? (
                                <Button size="sm" variant="ghost" onClick={() => cancelEvent(ev.id)}>Cancel</Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">Canceled</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
              <CardDescription>Next events on your calendar</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-6 bg-muted animate-pulse rounded" />
                  <div className="h-6 bg-muted animate-pulse rounded" />
                </div>
              ) : upcoming.length === 0 ? (
                <div className="text-sm text-muted-foreground">No upcoming appointments.</div>
              ) : (
                <div className="space-y-2">
                  {upcoming.map((ev) => {
                    const start = ev.startTime ? new Date(ev.startTime) : null;
                    const end = ev.endTime ? new Date(ev.endTime) : null;
                    return (
                      <div key={ev.id} className="flex items-start gap-3 p-2 rounded border">
                        <div className="w-24 text-xs text-muted-foreground">
                          {start ? start.toLocaleString('en-SG', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                          {end ? ` – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{ev.title || 'Meeting'}</div>
                          <div className="text-xs text-muted-foreground truncate">{ev.inviteeName || ev.inviteeEmail || ev.inviteePhone || ''}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditing(ev)}>Edit</Button>
                          {ev.status !== 'canceled' ? (
                            <Button size="sm" variant="ghost" onClick={() => cancelEvent(ev.id)}>Cancel</Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Canceled</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Appointments</CardTitle>
              <CardDescription>Every event stored in your account</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <div className="h-6 bg-muted animate-pulse rounded" />
                  <div className="h-6 bg-muted animate-pulse rounded" />
                  <div className="h-6 bg-muted animate-pulse rounded" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-sm text-muted-foreground">No appointments.</div>
              ) : (
                <div className="space-y-2">
                  {events.map((ev) => {
                    const start = ev.startTime ? new Date(ev.startTime) : null;
                    const end = ev.endTime ? new Date(ev.endTime) : null;
                    const showRange = start && end && end.getTime() >= start.getTime();
                    return (
                      <div key={ev.id} className="flex items-start gap-3 p-2 rounded border">
                        <div className="w-40 text-xs text-muted-foreground">
                          {start ? start.toLocaleString('en-SG') : ''}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{ev.title || 'Meeting'}{ev.status === 'canceled' ? ' (canceled)' : ''}</div>
                          <div className="text-xs text-muted-foreground truncate">{ev.inviteeName || ev.inviteeEmail || ev.inviteePhone || ''}</div>
                          {showRange && (
                            <div className="text-xs text-muted-foreground">
                              {start!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              {" – "}
                              {end!.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => setEditing(ev)}>Edit</Button>
                          {ev.status !== 'canceled' ? (
                            <Button size="sm" variant="ghost" onClick={() => cancelEvent(ev.id)}>Cancel</Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Canceled</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="book">
          <Card>
            <CardHeader>
              <CardTitle>Book a meeting</CardTitle>
              <CardDescription>Shareable booking page embedded here</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-4">
                <div>
                  {bookLoading ? (
                    <div className="h-[640px] w-full animate-pulse bg-muted rounded-md" />
                  ) : calendlyUrl ? (
                    <iframe
                      title="Calendly"
                      className="w-full h-[640px] border rounded-md"
                      src={(() => {
                        const build = (base: string, n?: string, e?: string, p?: string) => {
                          try {
                            const url = new URL(base);
                            if (n) url.searchParams.set("name", n);
                            if (e) url.searchParams.set("email", e);
                            if (p) url.searchParams.set("a1", p);
                            return url.toString();
                          } catch { return base; }
                        };
                        return build(calendlyUrl, name || undefined, email || undefined, phone || undefined);
                      })()}
                    />
                  ) : (
                    <div className="text-sm text-muted-foreground space-y-3">
                      <div>Calendly isn’t connected yet.</div>
                      <Button asChild><Link href="/integrations">Connect Calendly</Link></Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Prefill invitee</div>
                  <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <div className="text-xs text-muted-foreground">These fields prefill the booking form.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit appointment</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Title" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={editing.startTime || ''} onChange={(e) => setEditing({ ...editing, startTime: e.target.value })} placeholder="Start (ISO)" />
                <Input value={editing.endTime || ''} onChange={(e) => setEditing({ ...editing, endTime: e.target.value })} placeholder="End (ISO)" />
              </div>
              <Input value={editing.inviteeName || ''} onChange={(e) => setEditing({ ...editing, inviteeName: e.target.value })} placeholder="Invitee name" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={editing.inviteeEmail || ''} onChange={(e) => setEditing({ ...editing, inviteeEmail: e.target.value })} placeholder="Invitee email" />
                <Input value={editing.inviteePhone || ''} onChange={(e) => setEditing({ ...editing, inviteePhone: e.target.value })} placeholder="Invitee phone" />
              </div>
              <Select value={editing.propertyId || ''} onValueChange={(v) => setEditing({ ...editing, propertyId: v || null })}>
                <SelectTrigger><SelectValue placeholder="Link property (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— None —</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(null)}>Close</Button>
                <Button onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}


