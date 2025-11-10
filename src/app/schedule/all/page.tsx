"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

type Event = {
  id: string;
  title?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  description?: string | null;
  inviteeName?: string | null;
  inviteeEmail?: string | null;
  inviteePhone?: string | null;
  status?: string | null;
  timezone?: string | null;
  location?: string | null;
  notes?: string | null;
  propertyId?: string | null;
};

type PropertyRow = { id: string; title: string };

export default function AllSchedulePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [editing, setEditing] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [res, pRes] = await Promise.all([
          fetch('/api/scheduling/all', { credentials: 'include' }),
          fetch('/api/properties', { credentials: 'include' }),
        ]);
        const data = await res.json();
        setEvents(Array.isArray(data.events) ? data.events : []);
        if (pRes.ok) {
          const pd = await pRes.json();
          setProperties(Array.isArray(pd?.properties) ? pd.properties.map((p: any) => ({ id: p.id, title: p.title })) : []);
        }
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    return events
      .filter(ev => status === 'all' ? true : (status === 'active' ? ev.status !== 'canceled' : ev.status === 'canceled'))
      .filter(ev => {
        if (!text) return true;
        const fields = [ev.title, ev.inviteeName, ev.inviteeEmail, ev.inviteePhone].map(v => (v || '').toLowerCase());
        return fields.some(f => f.includes(text));
      })
      .sort((a, b) => (Date.parse(b.startTime || '') - Date.parse(a.startTime || '')));
  }, [events, q, status]);

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const body: any = {
        title: editing.title || undefined,
        startTime: editing.startTime || undefined,
        endTime: editing.endTime || undefined,
        description: editing.description || undefined,
        inviteeName: editing.inviteeName || undefined,
        inviteeEmail: editing.inviteeEmail || undefined,
        inviteePhone: editing.inviteePhone || undefined,
        timezone: editing.timezone || undefined,
        location: editing.location || undefined,
        notes: editing.notes || undefined,
        status: editing.status || undefined,
        propertyId: editing.propertyId || undefined,
      };
      const res = await fetch(`/api/scheduling/appointments/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
    const res = await fetch(`/api/scheduling/appointments/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) setEvents((rows) => rows.map((r) => (r.id === id ? { ...r, status: 'canceled' } : r)));
  };

  return (
    <AppShell breadcrumbItems={[{ label: 'Schedule' }, { label: 'All' }]} showAddButton={false}>
      <Card>
        <CardHeader>
          <CardTitle>All Appointments</CardTitle>
          <CardDescription>Every event stored in your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 pb-3">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, title…" className="max-w-xs" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading ? (
            <div className="space-y-2">
              <div className="h-6 bg-muted animate-pulse rounded" />
              <div className="h-6 bg-muted animate-pulse rounded" />
              <div className="h-6 bg-muted animate-pulse rounded" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground">No appointments.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map(ev => {
                const start = ev.startTime ? new Date(ev.startTime) : null;
                const end = ev.endTime ? new Date(ev.endTime) : null;
                const showRange = start && end && end.getTime() >= start.getTime();
                return (
                  <div key={ev.id} className="flex items-start gap-3 border-b pb-2 last:border-0">
                    <div className="w-40 text-sm text-muted-foreground">
                      {start ? start.toLocaleString('en-SG') : ''}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        {ev.title || 'Meeting'}{ev.status === 'canceled' ? ' (canceled)' : ''}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ev.inviteeName || ev.inviteeEmail || ev.inviteePhone || ''}
                      </div>
                      {showRange && (
                        <div className="text-xs text-muted-foreground">
                          {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {" – "}
                          {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {/* Details toggler */}
                      <button className="mt-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => setExpandedId(expandedId === ev.id ? null : ev.id)}>
                        {expandedId === ev.id ? 'Hide details' : 'Show details'}
                      </button>
                      {expandedId === ev.id && (
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                          <div className="text-muted-foreground">Email</div>
                          <div>{ev.inviteeEmail || '—'}</div>
                          <div className="text-muted-foreground">Phone</div>
                          <div>{ev.inviteePhone || '—'}</div>
                          <div className="text-muted-foreground">Timezone</div>
                          <div>{ev.timezone || '—'}</div>
                          <div className="text-muted-foreground">Location</div>
                          <div>{ev.location || '—'}</div>
                          <div className="text-muted-foreground">Notes</div>
                          <div className="break-words">{ev.notes || '—'}</div>
                          <div className="text-muted-foreground">Property</div>
                          <div>
                            {ev.propertyId ? (
                              <Link className="underline" href={`/properties/${ev.propertyId}`}>Open property</Link>
                            ) : '—'}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(ev)}>Edit</Button>
                      {ev.status !== 'canceled' ? (
                        <Button size="sm" variant="ghost" onClick={() => cancelEvent(ev.id)}>Cancel</Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit appointment</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Input value={editing.title || ''} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="Title" />
              <Input value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Description (optional)" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={editing.startTime || ''} onChange={(e) => setEditing({ ...editing, startTime: e.target.value })} placeholder="Start (ISO)" />
                <Input value={editing.endTime || ''} onChange={(e) => setEditing({ ...editing, endTime: e.target.value })} placeholder="End (ISO)" />
              </div>
              <Input value={editing.inviteeName || ''} onChange={(e) => setEditing({ ...editing, inviteeName: e.target.value })} placeholder="Invitee name" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={editing.inviteeEmail || ''} onChange={(e) => setEditing({ ...editing, inviteeEmail: e.target.value })} placeholder="Invitee email" />
                <Input value={editing.inviteePhone || ''} onChange={(e) => setEditing({ ...editing, inviteePhone: e.target.value })} placeholder="Invitee phone" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input value={editing.location || ''} onChange={(e) => setEditing({ ...editing, location: e.target.value })} placeholder="Location (optional)" />
                <Input value={editing.timezone || ''} onChange={(e) => setEditing({ ...editing, timezone: e.target.value })} placeholder="Timezone (e.g., Asia/Singapore)" />
              </div>
              <Input value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Notes (optional)" />
              <Select value={editing.status || 'scheduled'} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
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


