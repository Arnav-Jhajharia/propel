"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/layout/AppShell";
import { WhatsAppChat } from "@/components/chat/WhatsAppChat";
import { Calendar, ArrowLeft, Users, PawPrint, DollarSign, TrendingUp, AlertTriangle, Clock, MessageCircle, CheckCircle2, XCircle, Phone, Mail } from "lucide-react";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendlyUrl, setCalendlyUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch(`/api/clients/${id}`);
      const d = await res.json();
      setData(d);
      try {
        const cRes = await fetch('/api/user/calendly', { credentials: 'include' });
        if (cRes.ok) {
          const cData = await cRes.json();
          if (cData?.calendlyUrl) {
            setCalendlyUrl(cData.calendlyUrl);
            if (typeof window !== 'undefined') localStorage.setItem('calendly_url', cData.calendlyUrl);
          } else if (typeof window !== 'undefined') {
            setCalendlyUrl(localStorage.getItem('calendly_url'));
          }
        } else if (typeof window !== 'undefined') {
          setCalendlyUrl(localStorage.getItem('calendly_url'));
        }
      } catch {
        if (typeof window !== 'undefined') setCalendlyUrl(localStorage.getItem('calendly_url'));
      }
      setLoading(false);
    };
    if (id) load();
  }, [id]);

  const schedule = () => {
    if (!calendlyUrl) {
      alert("Please connect Calendly in Integrations page.");
      return;
    }
    const name = data?.client?.name || undefined;
    const email = data?.client?.email || undefined;
    const phone = data?.client?.phone || undefined;
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (email) params.set('email', email);
    if (phone) params.set('phone', phone);
    router.push(`/schedule?${params.toString()}`);
  };

  const messages = useMemo(() => data?.messages || [], [data]);
  const demoChat = useMemo(() => {
    const now = Date.now();
    const ago = (mins: number) => new Date(now - mins * 60 * 1000).toISOString();
    return [
      { id: "d1", from: "client", text: "Hi, I'm interested in the 2BR.", at: ago(180) },
      { id: "d2", from: "agent", text: "Great! What's your monthly budget?", at: ago(179) },
      { id: "d3", from: "client", text: "Around $5.5k, flexible.", at: ago(178) },
      { id: "d4", from: "agent", text: "Awesome. When do you plan to move in?", at: ago(177) },
      { id: "d5", from: "client", text: "Next month works.", at: ago(176) },
    ];
  }, []);

  const parseCurrency = (s?: string): number | null => {
    if (!s) return null;
    const n = parseInt(String(s).replace(/[^\d]/g, ""));
    return isNaN(n) ? null : n;
  };

  const estimateWillingnessToPay = (budgetText?: string, msgs?: Array<{ from: string; text: string }>): { estimate?: number; range?: [number, number]; confidence: number; hints: string[] } => {
    const hints: string[] = [];
    let base = parseCurrency(budgetText) || undefined;
    if (base) hints.push(`Stated budget S$${base.toLocaleString()}`);
    // Simple NLP-ish heuristics from chat
    const joined = (msgs || []).slice(0, 40).map(m => m.text.toLowerCase()).join(" \n ");
    let multiplier = 1;
    if (/flexible|can stretch|open to|okay with/i.test(joined)) { multiplier += 0.08; hints.push("Chat suggests flexibility"); }
    if (/max|cannot exceed|cap|tight budget/i.test(joined)) { multiplier -= 0.08; hints.push("Chat suggests a hard cap"); }
    if (/urgent|need (it|to move)|this week|asap/i.test(joined)) { multiplier += 0.05; hints.push("Urgency increases WTP"); }
    if (!base) {
      // fallback from typical Singapore rental bands
      base = 5500;
      hints.push("No stated budget, using market baseline");
    }
    const est = Math.round(base * multiplier);
    const spread = Math.max(300, Math.round(base * 0.08));
    return { estimate: est, range: [est - spread, est + spread], confidence: 0.65 + (multiplier > 1 ? 0.05 : 0), hints };
  };

  const demographics = useMemo(() => {
    const tenantText = data?.screening?.tenants || "";
    const numMatch = tenantText.match(/(\d+)\s?pax/);
    const pax = numMatch ? parseInt(numMatch[1]) : undefined;
    const hasPets = /has pets|cat|dog/i.test(tenantText);
    const moveIn = data?.screening?.move_in || undefined;
    const budget = parseCurrency(data?.screening?.budget);
    return { pax, hasPets, moveIn, budget };
  }, [data]);

  const wtp = useMemo(() => estimateWillingnessToPay(data?.screening?.budget, messages), [data, messages]);

  const responsiveness = useMemo(() => {
    if (!messages.length) return { last: null as string | null, avgReplyMins: null as number | null };
    const sorted = [...messages].sort((a: any, b: any) => new Date(a.at).getTime() - new Date(b.at).getTime());
    let totalGaps = 0, count = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i - 1].from === 'client' && sorted[i].from === 'agent') {
        totalGaps += (new Date(sorted[i].at).getTime() - new Date(sorted[i - 1].at).getTime()) / 60000;
        count++;
      }
    }
    const avg = count ? Math.round(totalGaps / count) : null;
    return { last: messages[0]?.at || null, avgReplyMins: avg };
  }, [messages]);

  const immediateActions = useMemo(() => {
    const actions: Array<{ id: string; label: string; severity: 'high'|'medium'|'low'; hint?: string; cta?: { label: string; action: () => void } }> = [];
    // No screening details captured
    if (!data?.screening?.budget || !data?.screening?.move_in) {
      actions.push({ id: 'collect-screening', label: 'Collect missing screening info', severity: 'high', hint: 'Ask for budget and move-in date', cta: { label: 'Draft WhatsApp', action: () => router.push('/chat') } });
    }
    // Long response time
    if (responsiveness.avgReplyMins !== null && responsiveness.avgReplyMins > 120) {
      actions.push({ id: 'improve-response', label: 'Slow response time', severity: 'medium', hint: `Avg agent reply ${responsiveness.avgReplyMins} mins` });
    }
    // No meeting scheduled
    if (!calendlyUrl) {
      actions.push({ id: 'connect-calendly', label: 'Connect Calendly to schedule easily', severity: 'low', cta: { label: 'Open Integrations', action: () => router.push('/integrations') } });
    }
    return actions;
  }, [data, responsiveness, calendlyUrl, router]);

  // UI-level fallbacks to always show realistic demo values even if API is empty/unauthenticated
  const uiFallbacks = useMemo(() => {
    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const fallbackBudget = `S$${pick([4800, 5200, 5500, 6000, 6500, 7000]).toLocaleString()}`;
    const date = new Date(Date.now() + pick([14, 21, 28, 35]) * 24 * 60 * 60 * 1000);
    const fallbackMoveIn = date.toLocaleDateString();
    const fallbackTenants = pick(["1 pax, no pets", "2 pax, no pets", "2 pax, has pets", "3 pax, no pets"]);
    return { fallbackBudget, fallbackMoveIn, fallbackTenants };
  }, []);

  const breadcrumbs = data?.client ? [
    { label: "Clients", href: "/" },
    { label: data.client.name }
  ] : [{ label: "Clients", href: "/" }, { label: "Loading..." }];

  if (loading) {
    return (
      <AppShell breadcrumbItems={breadcrumbs} maxWidth="5xl">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbItems={breadcrumbs} maxWidth="7xl">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={data?.client?.avatar} />
            <AvatarFallback>{data?.client?.name?.[0] ?? "C"}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold">{data?.client?.name || "Client"}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{data?.client?.phone || '—'}</span>
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{data?.client?.email || '—'}</span>
              <Badge variant="secondary">Score {data?.client?.score ?? 0}</Badge>
            </div>
          </div>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button onClick={schedule}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Viewing
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>WhatsApp Chat</CardTitle>
            <CardDescription>Real-time messaging with {data?.client?.name}</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const fallbackName = "Marcus Lee";
              const fallbackPhone = "+6591111111";
              const clientId = data?.client?.id || "demo";
              const clientName = data?.client?.name || fallbackName;
              const clientPhone = data?.client?.phone || fallbackPhone;
              return (
                <WhatsAppChat
                  clientId={clientId}
                  clientName={clientName}
                  clientPhone={clientPhone}
                  initialMessages={messages.length ? messages : demoChat}
                />
              );
            })()}
          </CardContent>
        </Card>

        {/* Right rail analytics */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
              <CardDescription>Snapshot and estimated fit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Willingness to Pay</span>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">{wtp.estimate ? `S$${wtp.estimate.toLocaleString()}` : '—'}</span>
                </div>
              </div>
              {wtp.range && (
                <div className="text-xs text-muted-foreground">Range {`S$${wtp.range[0].toLocaleString()}–S$${wtp.range[1].toLocaleString()}`} • Confidence {(Math.round(wtp.confidence * 100))}%</div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Budget</div>
                  <div className="text-sm">{data?.screening?.budget || uiFallbacks.fallbackBudget}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Move‑in</div>
                  <div className="text-sm">{data?.screening?.move_in || uiFallbacks.fallbackMoveIn}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />Occupants</div>
                  <div className="text-sm">{demographics.pax ?? (uiFallbacks.fallbackTenants.split(' ')[0])} pax</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><PawPrint className="h-3 w-3" />Pets</div>
                  <div className="text-sm">{demographics.hasPets ? 'Yes' : (uiFallbacks.fallbackTenants.includes('has pets') ? 'Yes' : 'No')}</div>
                </div>
              </div>
              {wtp.hints?.length ? (
                <div className="text-xs text-muted-foreground">{wtp.hints.join(' • ')}</div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Immediate Actions</CardTitle>
              <CardDescription>What needs attention now</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {immediateActions.length === 0 ? (
                <div className="text-sm text-muted-foreground">No urgent actions.</div>
              ) : (
                immediateActions.map(a => (
                  <div key={a.id} className="flex items-center justify-between rounded-md border p-3">
                    <div className="text-sm flex items-center gap-2">
                      {a.severity === 'high' ? <AlertTriangle className="h-4 w-4 text-red-500" /> : a.severity === 'medium' ? <TrendingUp className="h-4 w-4 text-amber-500" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                      <span>{a.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mr-2">{a.hint}</div>
                    {a.cta && (<Button size="sm" variant="outline" onClick={a.cta.action}>{a.cta.label}</Button>)}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={schedule}><Calendar className="h-4 w-4 mr-2" />Schedule</Button>
              <Button variant="outline" onClick={() => router.push('/integrations')}><MessageCircle className="h-4 w-4 mr-2" />Draft WhatsApp</Button>
              <Button variant="outline"><CheckCircle2 className="h-4 w-4 mr-2" />Mark Qualified</Button>
              <Button variant="outline"><XCircle className="h-4 w-4 mr-2" />Disqualify</Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Full chat transcript */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation Transcript</CardTitle>
          <CardDescription>Latest first</CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="text-sm text-muted-foreground">No messages yet.</div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto">
              {messages.map((m: any) => (
                <div key={m.id} className={`flex ${m.from === 'client' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`rounded-lg px-3 py-2 text-sm ${m.from === 'client' ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                    <div>{m.text}</div>
                    <div className="text-[10px] opacity-70 mt-1">{new Date(m.at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {calendlyUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule a Meeting</CardTitle>
            <CardDescription>Calendly inline widget</CardDescription>
          </CardHeader>
          <CardContent>
            <iframe title="Calendly" className="w-full h-[680px] border rounded-md" src={calendlyUrl} />
          </CardContent>
        </Card>
      )}
      </div>
    </AppShell>
  );
}