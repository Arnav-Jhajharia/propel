"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { tiemposHeadline } from "../fonts";
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
  Eye,
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
          setEvents(rows.filter((ev: any) => ev.status !== "canceled"));
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Properties</div>
                  <div className="text-2xl font-semibold">{loading ? "..." : stats.totalProperties}</div>
                </div>
                <Building2 className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Prospects</div>
                  <div className="text-2xl font-semibold">{loading ? "..." : stats.totalProspects}</div>
                </div>
                <Users className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Viewings</div>
                  <div className="text-2xl font-semibold">{loading ? "..." : stats.totalViewings}</div>
                </div>
                <CalendarClock className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Conversion</div>
                  <div className="text-2xl font-semibold">{loading ? "..." : `${stats.conversionRate}%`}</div>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Recent Prospects */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Prospects */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">Recent Prospects</h2>
                  <Button variant="ghost" size="sm" onClick={() => router.push("/prospects")}>
                    View all <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-16 bg-muted animate-pulse rounded" />
                    <div className="h-16 bg-muted animate-pulse rounded" />
                  </div>
                ) : recentProspects.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">No prospects yet</div>
                ) : (
                  <div className="space-y-3">
                    {recentProspects.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => router.push(`/clients/${p.clientId}`)}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={p.clientAvatar || undefined} />
                          <AvatarFallback>{p.clientName?.[0] ?? "C"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-sm truncate">{p.clientName}</div>
                            <Badge
                              variant={p.score > 85 ? "default" : p.score > 70 ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {p.score}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{p.propertyTitle}</div>
                          <div className="text-xs text-muted-foreground mt-1">{formatTimeAgo(p.lastMessageAt)}</div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/clients/${p.clientId}`); }}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Properties */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">Top Properties</h2>
                  <Button variant="ghost" size="sm" onClick={() => router.push("/properties")}>
                    View all <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
                {loading ? (
                  <div className="space-y-3">
                    <div className="h-20 bg-muted animate-pulse rounded" />
                    <div className="h-20 bg-muted animate-pulse rounded" />
                  </div>
                ) : topProperties.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8">No properties yet</div>
                ) : (
                  <div className="space-y-3">
                    {topProperties.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => router.push(`/properties/${p.id}`)}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{p.title}</div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {p.prospectsCount} prospects
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarClock className="h-3 w-3" />
                              {p.viewingsCount} viewings
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${p.price.toLocaleString()}/mo
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); router.push(`/properties/${p.id}`); }}>
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Schedule */}
          <Card className="lg:sticky lg:top-20 self-start">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className={`font-semibold text-lg ${tiemposHeadline.className}`}>Today's Schedule</h2>
                  <div className="text-xs text-muted-foreground">Meetings and viewings</div>
                </div>
                <Link href="/schedule/all" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="relative pl-6">
                <div className="absolute left-3 top-2.5 bottom-2.5 w-px bg-border/60" />
                {eventsLoading ? (
                  <div className="space-y-3">
                    <div className="h-12 bg-muted animate-pulse rounded" />
                    <div className="h-12 bg-muted animate-pulse rounded" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No upcoming appointments.</div>
                ) : (
                  <motion.ul
                    initial="hidden"
                    animate="show"
                    variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                  >
                    {events.map((ev, i) => {
                      const start = ev.startTime ? new Date(ev.startTime) : null;
                      const end = ev.endTime ? new Date(ev.endTime) : null;
                      const time = start ? start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
                      const range =
                        start && end
                          ? `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                          : time;
                      return (
                        <motion.li
                          key={i}
                          variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
                          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                          className="relative pb-4"
                        >
                          <div className="absolute -left-[6px] top-2 h-2 w-2 rounded-full bg-foreground/80 ring-2 ring-white shadow-sm" />
                          <div className="group flex items-start gap-3 rounded-md p-1.5 -m-1.5 hover:bg-muted/40 transition-colors">
                            <div className="text-xs leading-5 text-muted-foreground w-24 tabular-nums shrink-0 mt-0.5">
                              {range}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium leading-snug line-clamp-2">{ev.title || "Meeting"}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {ev.inviteeName || ev.inviteeEmail || ev.inviteePhone || ""}
                              </div>
                            </div>
                          </div>
                        </motion.li>
                      );
                    })}
                  </motion.ul>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}


