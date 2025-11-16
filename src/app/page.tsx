"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { tiemposHeadline } from "./fonts";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Moon,
  Sunrise,
  Sunset,
  ArrowRight,
  Building2,
  Users,
  CalendarClock,
  TrendingUp,
  DollarSign,
  MessageSquare,
  Home,
  Eye,
  Clock,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function getGreeting(now: Date) {
  const h = now.getHours();
  if (h < 5) return { title: "Good night", subtitle: "Moonlighting mode: let's keep it light and bright." };
  if (h < 12) return { title: "Good morning", subtitle: "Rise and rent‑shine. Fresh leads, fresh coffee." };
  if (h < 17) return { title: "Good afternoon", subtitle: "Sun's high, so are conversions. Let's go." };
  if (h < 22) return { title: "Good evening", subtitle: "Golden hour for closing deals." };
  return { title: "Good night", subtitle: "Night shift? We'll make it light work." };
}

type Stats = {
  totalProperties: number;
  totalProspects: number;
  totalViewings: number;
  activeProspects: number;
  convertedProspects: number;
  avgPrice: number;
  conversionRate: number;
};

type RecentProspect = {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string | null;
  propertyTitle: string;
  score: number;
  status: string | null;
  lastMessageAt: string;
};

type TopProperty = {
  id: string;
  title: string;
  prospectsCount: number;
  viewingsCount: number;
  price: number;
};

export default function DashboardPage() {
  const router = useRouter();
  const now = new Date();
  const { title, subtitle } = useMemo(() => getGreeting(now), []);
  const [showGreeting, setShowGreeting] = useState(false);
  const [events, setEvents] = useState<Array<any>>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalProperties: 0,
    totalProspects: 0,
    totalViewings: 0,
    activeProspects: 0,
    convertedProspects: 0,
    avgPrice: 0,
    conversionRate: 0,
  });
  const [recentProspects, setRecentProspects] = useState<RecentProspect[]>([]);
  const [topProperties, setTopProperties] = useState<TopProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t1 = setTimeout(() => setShowGreeting(true), 200);
    const t2 = setTimeout(() => {
      window.dispatchEvent(new Event("assistant:reveal"));
    }, 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setEventsLoading(true);

      try {
        // Load events
        const eventsRes = await fetch("/api/scheduling/events", { credentials: "include" });
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          const rows = Array.isArray(eventsData.events) ? eventsData.events : [];
          
          // Filter for today's events only
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const todaysEvents = rows.filter((ev: any) => {
            if (ev.status === "canceled") return false;
            const eventDate = new Date(ev.startTime);
            return eventDate >= today && eventDate < tomorrow;
          }).sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
          
          setEvents(todaysEvents);
        }

        // Load properties
        const propsRes = await fetch("/api/properties", { cache: "no-store" });
        const propsData = await propsRes.json();
        const properties = propsData.properties ?? [];

        // Load prospects
        const prospectsRes = await fetch("/api/prospects", { cache: "no-store" });
        const prospectsData = await prospectsRes.json();
        const prospects = prospectsData.prospects ?? [];

        // Calculate stats
        const totalProperties = properties.length;
        const totalProspects = prospects.length;
        const activeProspects = prospects.filter((p: any) => (p.status || "") === "active").length;
        const convertedProspects = prospects.filter((p: any) => (p.status || "") === "converted").length;
        const totalViewings = prospects.filter((p: any) => (p.status || "") === "viewing_scheduled").length;
        const avgPrice =
          properties.length > 0
            ? Math.round(properties.reduce((sum: number, p: any) => sum + (p.price || 0), 0) / properties.length)
            : 0;
        const conversionRate = totalProspects > 0 ? Math.round((convertedProspects / totalProspects) * 100) : 0;

        setStats({
          totalProperties,
          totalProspects,
          totalViewings,
          activeProspects,
          convertedProspects,
          avgPrice,
          conversionRate,
        });

        // Get recent prospects (top 5 by score)
        const recent = prospects
          .sort((a: any, b: any) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime())
          .slice(0, 5)
          .map((p: any) => ({
            id: p.id,
            clientId: p.clientId,
            clientName: p.clientName,
            clientAvatar: p.clientAvatar,
            propertyTitle: p.propertyTitle,
            score: p.score,
            status: p.status,
            lastMessageAt: p.lastMessageAt,
          }));
        setRecentProspects(recent);

        // Get top properties
        const propsWithCounts = await Promise.all(
          properties.slice(0, 5).map(async (p: any) => {
            try {
              const r = await fetch(`/api/properties/${p.id}/prospects`, { cache: "no-store" });
              const d = await r.json();
              const list = (d.prospects ?? []) as Array<{ status?: string }>;
              const prospectsCount = list.length;
              const viewingsCount = list.filter((x) => x.status === "viewing_scheduled").length;
              return {
                id: p.id,
                title: p.title,
                prospectsCount,
                viewingsCount,
                price: p.price || 0,
              };
            } catch {
              return {
                id: p.id,
                title: p.title,
                prospectsCount: 0,
                viewingsCount: 0,
                price: p.price || 0,
              };
            }
          })
        );
        setTopProperties(propsWithCounts.sort((a, b) => b.prospectsCount - a.prospectsCount).slice(0, 3));
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setLoading(false);
        setEventsLoading(false);
      }
    };

    load();
  }, []);

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
    <AppShell showAddButton={false}>
      <div className="space-y-6">
        {/* Greeting */}
        <AnimatePresence>
          {showGreeting && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="space-y-2"
            >
              <div className="flex items-center gap-3">
                {(() => {
                  const h = now.getHours();
                  if (h < 5) return <Moon className="h-6 w-6" />;
                  if (h < 8) return <Sunrise className="h-6 w-6" />;
                  if (h < 18) return <Sun className="h-6 w-6" />;
                  if (h < 21) return <Sunset className="h-6 w-6" />;
                  return <Moon className="h-6 w-6" />;
                })()}
                <h1 className={`text-3xl md:text-4xl font-semibold tracking-tight text-foreground/90 ${tiemposHeadline.className}`}>
                  {title}
                </h1>
              </div>
              <p className="text-muted-foreground">{subtitle}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KPI Cards - Design Spec Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Deals in Pipeline */}
          <Card className="border-primary/20 bg-accent/30">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-muted-foreground">Deals in Pipeline</div>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">
                    ${loading ? "..." : ((stats.avgPrice * stats.totalProperties) / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {loading ? "..." : stats.totalProspects} deals
                  </div>
                </div>
                {/* Pipeline funnel visualization */}
                <div className="flex items-center gap-1 pt-2">
                  <div className="flex-1 h-2 bg-primary rounded-full" style={{ width: "40%" }} />
                  <div className="flex-1 h-2 bg-primary/70 rounded-full" style={{ width: "30%" }} />
                  <div className="flex-1 h-2 bg-primary/40 rounded-full" style={{ width: "20%" }} />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Lead</span>
                  <span>Qualified</span>
                  <span>Offer</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages Requiring Action */}
          <Card className="border-primary/20 bg-accent/30">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-muted-foreground">Messages Requiring Action</div>
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">
                    {loading ? "..." : stats.activeProspects}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">pending responses</div>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => router.push("/chat")}
                  className="text-primary p-0 h-auto font-medium"
                >
                  Go to Unified Chat →
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Today's Schedule */}
          <Card className="border-primary/20 bg-accent/30">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-muted-foreground">Today's Schedule</div>
                  <CalendarClock className="h-5 w-5 text-primary" />
                </div>
                {eventsLoading ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : events.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No events today</div>
                ) : (
                  <div className="space-y-2">
                    {events.slice(0, 3).map((event: any, index: number) => (
                      <div key={event.id || index} className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">
                            {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {event.endTime && ` - ${new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {event.title || "Event"}
                          </div>
                        </div>
                      </div>
                    ))}
                    {events.length > 3 && (
                      <div className="text-xs text-muted-foreground pl-6">
                        +{events.length - 3} more event{events.length > 4 ? "s" : ""}
                      </div>
                    )}
                  </div>
                )}
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => router.push("/schedule/manager")}
                  className="text-primary p-0 h-auto font-medium"
                >
                  View full schedule →
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid - Design Spec: Pipeline, Activity, Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Pipeline Stage Breakdown */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-4">Pipeline Stage Breakdown</h2>
                <div className="space-y-4">
                  {/* Minimalist horizontal bar chart */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">Inquiry</span>
                        <span className="font-medium">{loading ? "..." : Math.floor(stats.totalProspects * 0.4)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: "40%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">Nurturing</span>
                        <span className="font-medium">{loading ? "..." : Math.floor(stats.totalProspects * 0.3)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-chart-2 rounded-full" style={{ width: "30%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">Negotiation</span>
                        <span className="font-medium">{loading ? "..." : Math.floor(stats.totalProspects * 0.2)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-chart-3 rounded-full" style={{ width: "20%" }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-muted-foreground">Closing</span>
                        <span className="font-medium">{loading ? "..." : Math.floor(stats.totalProspects * 0.1)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-chart-4 rounded-full" style={{ width: "10%" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Client Activity Feed */}
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold text-lg mb-4">Recent Client Activity</h2>
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-12 bg-muted animate-pulse rounded" />
                    <div className="h-12 bg-muted animate-pulse rounded" />
                  </div>
                ) : recentProspects.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">No recent activity</div>
                ) : (
                  <div className="space-y-4">
                    {recentProspects.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{p.clientName}</span>
                            <Badge variant="outline" className="text-xs">
                              Score: {p.score}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Interested in {p.propertyTitle}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatTimeAgo(p.lastMessageAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Task List */}
          <Card className="lg:sticky lg:top-20 self-start">
            <CardContent className="p-6">
              <h2 className="font-semibold text-lg mb-4">Task List</h2>
              <div className="space-y-2">
                {/* Checkbox-style task list */}
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 text-sm">
                    Prepare listing for new property
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-4 w-4 rounded border-2 border-muted-foreground" />
                  </div>
                  <div className="flex-1 text-sm">
                    Follow up with hot leads
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-4 w-4 rounded border-2 border-muted-foreground" />
                  </div>
                  <div className="flex-1 text-sm">
                    Review contract for 123 Main St
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-4 w-4 rounded border-2 border-muted-foreground" />
                  </div>
                  <div className="flex-1 text-sm">
                    Update property photos
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-4 text-muted-foreground">
                + Add task
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
