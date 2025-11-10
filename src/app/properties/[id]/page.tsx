"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MapPin, Users, MessageCircle, Calendar as CalendarIcon, ArrowLeft, DollarSign, TrendingUp, AlertTriangle, Clock, Info } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

type Property = {
  id: string;
  url: string;
  title: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  heroImage: string;
  description?: string;
  propertyType?: string;
  furnished?: string;
  availableFrom?: string;
  createdAt: string;
  updatedAt: string;
};

type Prospect = {
  id: string;
  name: string;
  phone: string;
  score: number;
  summary: string;
  lastMessageAt: string;
  avatar: string;
  propertyId?: string;
};

type ProspectAgg = {
  clientId: string;
  clientName: string;
  phone: string;
  score: number;
  summary: string;
  lastMessageAt?: string;
  stage: string;
  answers: Record<string, any>;
};

export default function PropertyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { id } = params;
  const [property, setProperty] = useState<Property | null>(null);
  const [prospects, setProspects] = useState<ProspectAgg[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendlyUrl, setCalendlyUrl] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Load property details
        const propertyRes = await fetch(`/api/properties/${id}`);
        const propertyData = await propertyRes.json();
        if (propertyRes.ok) {
          setProperty(propertyData.property);
        }

        // Load prospects
        const prospectsRes = await fetch(`/api/properties/${id}/prospects`);
        const prospectsData = await prospectsRes.json();
        setProspects(prospectsData.prospects || []);

        // Load Calendly URL
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
      } catch (error) {
        console.error('Error loading property data:', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const sorted = useMemo(() => {
    const base = stageFilter === "all" ? prospects : prospects.filter((p) => p.stage === stageFilter);
    return [...base].sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [prospects, stageFilter]);

  const parseCurrency = (s?: string): number | null => {
    if (!s) return null;
    const n = parseInt(String(s).replace(/[^\d]/g, ""));
    return isNaN(n) ? null : n;
  };

  type ProspectInsights = ProspectAgg & {
    wtpEstimate?: number;
    wtpRange?: [number, number];
    affordability?: number; // budget/property price
    riskFlags: string[];
    nextAction?: string;
  };

  const enriched = useMemo<ProspectInsights[]>(() => {
    const price = property?.price || 0;
    return sorted.map((p) => {
      const a: any = p.answers || {};
      const budget = parseCurrency(a.budget || a.Budget || "");
      const hints: string[] = [];
      let wtp = budget || 5500;
      if (/flexible|stretch/i.test(String(p.summary || ""))) wtp = Math.round(wtp * 1.06);
      if (/pets/i.test(String(p.summary || a.tenants || ""))) hints.push("Pet-friendly required");
      const spread = Math.max(300, Math.round((budget || 5500) * 0.08));
      const affordability = price ? Math.round((wtp / price) * 100) : undefined;
      const riskFlags: string[] = [];
      if (affordability && affordability < 80) riskFlags.push("Budget below asking");
      if (!a.move_in) riskFlags.push("Move-in missing");
      if (!budget) riskFlags.push("Budget missing");
      let nextAction = "Send two viewing slots";
      if (riskFlags.includes("Budget below asking")) nextAction = "Offer nearby alternatives";
      if (!budget || !a.move_in) nextAction = "Collect budget and move-in";
      return {
        ...p,
        wtpEstimate: wtp,
        wtpRange: [wtp - spread, wtp + spread],
        affordability,
        riskFlags,
        nextAction,
      } as ProspectInsights;
    });
  }, [sorted, property]);

  const schedule = (name: string) => {
    if (!calendlyUrl) {
      alert("Please connect Calendly in Integrations page.");
      return;
    }
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    router.push(`/schedule?${params.toString()}`);
  };

  const pingWhatsApp = async (phone: string, name?: string) => {
    const text = `Hi ${name ? name.split(" ")[0] : "there"}, quick follow-up on your interest. Can I share viewing times?`;
    await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: phone, text }),
    });
    alert("Message sent (if WhatsApp Business API is configured)");
  };

  const draftFollowUp = async (name: string) => {
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: `Draft a short WhatsApp follow-up to ${name} about viewing time options.`, history: [] }),
      });
      const data = await res.json();
      const msg = (data?.reply || "").trim();
      if (msg) {
        await navigator.clipboard.writeText(msg);
        alert("Draft copied to clipboard");
      }
    } catch {
      // ignore
    }
  };

  const breadcrumbs = property ? [
    { label: "Properties", href: "/" },
    { label: property.title }
  ] : [{ label: "Properties", href: "/" }, { label: "Loading..." }];

  if (loading) {
    return (
      <AppShell breadcrumbItems={breadcrumbs} maxWidth="7xl">
        <div>
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-96 bg-muted rounded"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
              <div className="space-y-4">
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!property) {
    return (
      <AppShell breadcrumbItems={breadcrumbs} maxWidth="7xl">
        <div>
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold">Property Not Found</h1>
            <p className="text-muted-foreground">The property you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => router.push("/")}>Back to Dashboard</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbItems={breadcrumbs} maxWidth="7xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push("/")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{property.title}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{property.address}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.open(property.url, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Listing
            </Button>
          </div>
        </div>

        {/* Property Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Prospects Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Prospects ({prospects.length})
                </CardTitle>
                <CardDescription>Clients interested in this property, ranked by fit score</CardDescription>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[
                    { key: "all", label: "All" },
                    { key: "viewing_scheduled", label: "Viewing" },
                    { key: "replied", label: "Replied" },
                    { key: "screening_sent", label: "Screening sent" },
                    { key: "converted", label: "Converted" },
                    { key: "active", label: "Active" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setStageFilter(f.key)}
                      className={`text-xs px-2 py-1 rounded-full border ${stageFilter === f.key ? "bg-muted" : "hover:bg-muted"}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                {prospects.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No prospects yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Once WhatsApp conversations start, interested clients will appear here.
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <Button onClick={() => router.push("/integrations")}>
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Set up WhatsApp
                      </Button>
                      <Button variant="outline" onClick={async () => { await fetch(`/api/properties/${id}/prospects/seed`, { method: 'POST' }); location.reload(); }}>Seed demo prospects</Button>
                    </div>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>WTP</TableHead>
                        <TableHead>Fit</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Demographics</TableHead>
                        <TableHead>Last Message</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {enriched.map((p) => (
                        <TableRow key={p.clientId} className={`hover:bg-muted/40 cursor-pointer ${selectedClientId === p.clientId ? 'bg-muted/60' : ''}`} onClick={() => setSelectedClientId(p.clientId)}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={""} />
                                <AvatarFallback>{p.clientName?.[0] ?? "C"}</AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{p.clientName}</div>
                                <div className="text-xs text-muted-foreground">{p.phone}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.score > 85 ? "default" : p.score > 70 ? "secondary" : "outline"}>{p.score}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm"><DollarSign className="h-3 w-3" />{p.wtpEstimate ? p.wtpEstimate.toLocaleString() : '—'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.affordability && p.affordability >= 95 ? 'default' : p.affordability && p.affordability >= 80 ? 'secondary' : 'outline'}>
                              {p.affordability ? `${p.affordability}%` : '—'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{p.stage.replace(/_/g, " ")}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[320px]">
                            <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden">
                              {(() => {
                                const a: any = p.answers || {};
                                const bits: string[] = [];
                                if (a.nationality) bits.push(String(a.nationality));
                                if (a.occupation) bits.push(String(a.occupation));
                                if (a.tenants) bits.push(String(a.tenants));
                                if (a.move_in) bits.push(String(a.move_in));
                                if (a.budget) bits.push(`$${a.budget}`);
                                return bits.slice(0, 4).join(" • ") || (p.summary || "");
                              })()}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {p.lastMessageAt ? new Date(p.lastMessageAt).toLocaleString() : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button size="sm" variant="outline" onClick={() => pingWhatsApp(p.phone, p.clientName)}>
                              <MessageCircle className="h-3 w-3 mr-1" />
                              WhatsApp
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => schedule(p.clientName)}>
                              <CalendarIcon className="h-3 w-3 mr-1" />
                              Schedule
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => draftFollowUp(p.clientName)}>Draft</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {selectedClientId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" /> Client Analysis
                  </CardTitle>
                  <CardDescription>Deep dive for {enriched.find((x) => x.clientId === selectedClientId)?.clientName}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(() => {
                    const p = enriched.find((x) => x.clientId === selectedClientId)!;
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-md border p-3 space-y-1">
                          <div className="text-xs text-muted-foreground">Willingness to Pay</div>
                          <div className="text-sm flex items-center gap-1"><DollarSign className="h-4 w-4" />{p.wtpEstimate ? `S$${p.wtpEstimate.toLocaleString()}` : '—'}</div>
                          {p.wtpRange && <div className="text-xs text-muted-foreground">Range S${p.wtpRange[0].toLocaleString()}–S${p.wtpRange[1].toLocaleString()}</div>}
                        </div>
                        <div className="rounded-md border p-3 space-y-1">
                          <div className="text-xs text-muted-foreground">Affordability vs Asking</div>
                          <div className="text-sm">{p.affordability ? `${p.affordability}%` : '—'}</div>
                        </div>
                        <div className="rounded-md border p-3 space-y-1">
                          <div className="text-xs text-muted-foreground">Recommended Next Action</div>
                          <div className="text-sm">{p.nextAction || '—'}</div>
                        </div>
                        <div className="md:col-span-3 rounded-md border p-3">
                          <div className="text-xs text-muted-foreground mb-1">Risks & Flags</div>
                          {p.riskFlags.length === 0 ? (
                            <div className="text-sm">No major risks identified.</div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {p.riskFlags.map((r) => (
                                <span key={r} className="text-xs px-2 py-1 rounded-full border bg-muted flex items-center gap-1">
                                  {r.includes('Budget') ? <AlertTriangle className="h-3 w-3 text-red-500" /> : <Clock className="h-3 w-3 text-muted-foreground" />}
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Property Summary (compact) */}
            <Card>
              <CardHeader>
                <CardTitle>Property Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-3">
                  <img src={property.heroImage} alt={property.title} className="h-20 w-28 object-cover rounded-md" />
                  <div className="text-sm">
                    <div className="font-medium line-clamp-2">{property.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {property.address}
                    </div>
                  </div>
                </div>
                {property.description && (
                  <div className="text-sm text-muted-foreground max-h-24 overflow-y-auto rounded-md bg-muted/30 p-2">
                    {property.description}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" onClick={() => router.push("/integrations")}>
                  <Users className="h-4 w-4 mr-2" />
                  Manage Prospects
                </Button>
                <Button variant="outline" className="w-full" onClick={() => window.open(property.url, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Listing
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push("/")}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </CardContent>
            </Card>

            {/* Property Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Property Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="font-medium">${property.price.toLocaleString()}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Price per sqft</span>
                  <span className="font-medium">${Math.round(property.price / property.sqft)}/sqft</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Prospects</span>
                  <span className="font-medium">{prospects.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Imported</span>
                  <span className="font-medium">{new Date(property.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}