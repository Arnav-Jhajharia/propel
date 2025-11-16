"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Search,
  Eye,
  Phone,
  Mail,
  TrendingUp,
  CalendarClock,
  CheckCircle2,
  Clock,
  User,
  Home,
  MessageSquare,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ProspectItem = {
  id: string;
  score: number;
  summary: string;
  lastMessageAt: string;
  status: string | null;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientAvatar?: string | null;
  propertyId: string;
  propertyTitle: string;
};

export default function ProspectsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ProspectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string | "all">("all");
  const [selectedProspect, setSelectedProspect] = useState<ProspectItem | null>(null);

  const demoProspects: ProspectItem[] = [
    {
      id: "pr1",
      score: 90,
      summary: "Looking for 2BR near River Valley. Budget $4.5k, viewing this week.",
      lastMessageAt: new Date().toISOString(),
      status: "active",
      clientId: "c1",
      clientName: "Alice Tan",
      clientPhone: "+65 9123 4567",
      clientAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&q=80&auto=format&fit=crop",
      propertyId: "p1",
      propertyTitle: "Modern 2BR Condo at River Valley",
    },
    {
      id: "pr2",
      score: 76,
      summary: "3BR for family in Tiong Bahru. Saturday viewing scheduled.",
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      status: "viewing_scheduled",
      clientId: "c2",
      clientName: "Benjamin Ong",
      clientPhone: "+65 9876 5432",
      clientAvatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=256&q=80&auto=format&fit=crop",
      propertyId: "p2",
      propertyTitle: "Spacious 3BR HDB in Tiong Bahru",
    },
    {
      id: "pr3",
      score: 93,
      summary: "Executive renting 1BR at Marina Bay. High budget, quick move-in.",
      lastMessageAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      status: "converted",
      clientId: "c3",
      clientName: "Chloe Lim",
      clientPhone: "+65 9001 2233",
      clientAvatar: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=256&q=80&auto=format&fit=crop",
      propertyId: "p3",
      propertyTitle: "Luxury 1BR at Marina Bay Residences",
    },
  ];

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/prospects", { cache: "no-store" });
      const data = await res.json();
      const list: ProspectItem[] = data.prospects ?? [];
      const prospects = list.length === 0 ? demoProspects : list;
      setItems(prospects);
      if (prospects.length > 0 && !selectedProspect) {
        setSelectedProspect(prospects[0]);
      }
    } catch (e) {
      setItems(demoProspects);
      if (demoProspects.length > 0 && !selectedProspect) {
        setSelectedProspect(demoProspects[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFetchNew = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dev/seed", { method: "POST" });
      if (!res.ok) throw new Error("Failed to add dummy prospects");
      toast("Added dummy prospects");
      await load();
    } catch (e) {
      toast("Failed to add dummy prospects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      const matchesQuery = !q
        ? true
        : p.clientName.toLowerCase().includes(q) ||
          p.clientPhone.toLowerCase().includes(q) ||
          p.propertyTitle.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q);
      const matchesStatus = status === "all" ? true : (p.status || "").toLowerCase() === status;
      return matchesQuery && matchesStatus;
    });
  }, [items, query, status]);

  // Calculate statistics
  const stats = useMemo(() => {
    const active = items.filter((p) => (p.status || "") === "active").length;
    const viewing = items.filter((p) => (p.status || "") === "viewing_scheduled").length;
    const converted = items.filter((p) => (p.status || "") === "converted").length;
    const avgScore = items.length > 0 ? Math.round(items.reduce((sum, p) => sum + p.score, 0) / items.length) : 0;
    const topProspect = items.length > 0 ? items.reduce((top, p) => (p.score > top.score ? p : top), items[0]) : null;
    const conversionRate = items.length > 0 ? Math.round((converted / items.length) * 100) : 0;

    return {
      total: items.length,
      active,
      viewing,
      converted,
      avgScore,
      topProspect,
      conversionRate,
    };
  }, [items]);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "active":
        return <Badge variant="secondary" className="text-xs">Active</Badge>;
      case "viewing_scheduled":
        return <Badge variant="default" className="text-xs">Viewing</Badge>;
      case "converted":
        return <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Converted</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Active</Badge>;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <AppShell breadcrumbItems={[{ label: "Prospects" }]}> 
      <div className="flex h-[calc(100vh-4rem)] gap-4">
        {/* Left: Prospects List */}
        <div className="flex-1 flex flex-col border-r overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by client, phone, property..."
                className="pl-9 h-9"
          />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" onClick={handleFetchNew} disabled={loading} size="sm" className="h-7 text-xs">
              {loading ? "Fetching…" : "Fetch new"}
            </Button>
            <Button
              variant={status === "all" ? "default" : "outline"}
              onClick={() => setStatus("all")}
                size="sm"
                className="h-7 text-xs"
            >
              All
            </Button>
            <Button
              variant={status === "active" ? "default" : "outline"}
              onClick={() => setStatus("active")}
                size="sm"
                className="h-7 text-xs"
            >
              Active
            </Button>
            <Button
              variant={status === "viewing_scheduled" ? "default" : "outline"}
              onClick={() => setStatus("viewing_scheduled")}
                size="sm"
                className="h-7 text-xs"
            >
                Viewing
            </Button>
            <Button
              variant={status === "converted" ? "default" : "outline"}
              onClick={() => setStatus("converted")}
                size="sm"
                className="h-7 text-xs"
            >
              Converted
            </Button>
          </div>
        </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
              {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
              ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                {items.length === 0 ? "No prospects yet." : "No prospects match your search."}
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProspect(p)}
                    className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedProspect?.id === p.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10 flex-shrink-0">
                          <AvatarImage src={p.clientAvatar || undefined} />
                          <AvatarFallback>{p.clientName?.[0] ?? "C"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-sm truncate">{p.clientName}</div>
                            {getStatusBadge(p.status)}
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{p.propertyTitle}</div>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge
                              variant={p.score > 85 ? "default" : p.score > 70 ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              Score: {p.score}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{formatTimeAgo(p.lastMessageAt)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{p.summary}</div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/clients/${p.clientId}`)}>
                            <Eye className="h-3 w-3 mr-2" /> View client
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/properties/${p.propertyId}`)}>
                            <Home className="h-3 w-3 mr-2" /> View property
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Details Panel */}
        <div className="w-96 border-l overflow-y-auto">
          {selectedProspect ? (
            <div className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedProspect.clientAvatar || undefined} />
                  <AvatarFallback>{selectedProspect.clientName?.[0] ?? "C"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="font-semibold text-lg">{selectedProspect.clientName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(selectedProspect.status)}
                    <Badge
                      variant={selectedProspect.score > 85 ? "default" : selectedProspect.score > 70 ? "secondary" : "outline"}
                    >
                      {selectedProspect.score}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedProspect.clientPhone}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Last message: {formatTimeAgo(selectedProspect.lastMessageAt)}
                </div>
              </div>

              <Card className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Interested in</div>
                <div className="font-medium text-sm">{selectedProspect.propertyTitle}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 text-xs"
                  onClick={() => router.push(`/properties/${selectedProspect.propertyId}`)}
                >
                  <Home className="h-3 w-3 mr-1" /> View property
                </Button>
              </Card>

              <Card className="p-3">
                <div className="text-xs text-muted-foreground mb-1">Summary</div>
                <div className="text-sm">{selectedProspect.summary}</div>
              </Card>

              <div className="flex gap-2">
                <Button
                  onClick={() => router.push(`/clients/${selectedProspect.clientId}`)}
                  className="flex-1"
                  size="sm"
                >
                  <Eye className="h-3 w-3 mr-1" /> View client
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/clients/${selectedProspect.clientId}`)}
                >
                  <MessageSquare className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div>
                <h2 className="font-semibold text-lg">Overview</h2>
                <p className="text-sm text-muted-foreground mt-1">Your prospect pipeline at a glance</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Total Prospects</div>
                  <div className="text-2xl font-semibold mt-1">{stats.total}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Avg. Score</div>
                  <div className="text-2xl font-semibold mt-1">{stats.avgScore}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Active</div>
                  <div className="text-2xl font-semibold mt-1">{stats.active}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Viewings</div>
                  <div className="text-2xl font-semibold mt-1">{stats.viewing}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Converted</div>
                  <div className="text-2xl font-semibold mt-1">{stats.converted}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Conversion Rate</div>
                  <div className="text-2xl font-semibold mt-1">{stats.conversionRate}%</div>
                </Card>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">Pipeline</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>Active</span>
                    </div>
                    <Badge variant="secondary">{stats.active}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-3 w-3 text-muted-foreground" />
                      <span>Viewing Scheduled</span>
                    </div>
                    <Badge variant="default">{stats.viewing}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                      <span>Converted</span>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {stats.converted}
                    </Badge>
                  </div>
                </div>
              </div>

              {stats.topProspect && (
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground mb-2">Top Prospect</div>
                  <div className="font-medium text-sm">{stats.topProspect.clientName}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Score: {stats.topProspect.score} • {stats.topProspect.propertyTitle}
                      </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
