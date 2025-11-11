"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Home, 
  Users, 
  Calendar, 
  CheckCircle2, 
  MessageCircle, 
  AlertTriangle,
  DollarSign,
  Building2,
  ArrowRight,
  AlertCircle,
  Bell,
  Zap
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type DashboardStats = {
  totalProperties: number;
  totalProspects: number;
  activeProspects: number;
  upcomingViewings: number;
  todayViewings: number;
  converted: number;
  activeConversations: number;
  avgPropertyPrice: number;
  attentionNeeded: number;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/dashboard/stats", { cache: "no-store" });
        const data = await res.json();
        setStats(data.stats);
      } catch (e) {
        console.error("Failed to load dashboard stats:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Demo notifications on page load
  useEffect(() => {
    const notifications = [
      {
        message: "Accepted James Lim autonomously",
        description: "Application approved for The Tapestry",
        delay: 500,
        icon: CheckCircle2,
        type: "success" as const,
      },
      {
        message: "Get ready for handoff",
        description: "Sarah Chen's viewing confirmed for Saturday 3 PM",
        delay: 2000,
        icon: Bell,
        type: "info" as const,
      },
      {
        message: "Autonomous action completed",
        description: "Scheduled follow-up with Marcus Lee",
        delay: 3500,
        icon: Zap,
        type: "success" as const,
      },
      {
        message: "New prospect requires attention",
        description: "Priya Sharma's budget is below asking price",
        delay: 5000,
        icon: AlertCircle,
        type: "warning" as const,
      },
    ];

    notifications.forEach((notif) => {
      setTimeout(() => {
        const Icon = notif.icon;
        if (notif.type === "success") {
          toast.success(notif.message, {
            description: notif.description,
            icon: <Icon className="h-4 w-4" />,
            duration: 5000,
          });
        } else if (notif.type === "warning") {
          toast.warning(notif.message, {
            description: notif.description,
            icon: <Icon className="h-4 w-4" />,
            duration: 5000,
          });
        } else {
          toast.info(notif.message, {
            description: notif.description,
            icon: <Icon className="h-4 w-4" />,
            duration: 5000,
          });
        }
      }, notif.delay);
    });
  }, []);

  const statCards = [
    {
      title: "Total Properties",
      value: stats?.totalProperties || 0,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/properties",
    },
    {
      title: "Active Prospects",
      value: stats?.activeProspects || 0,
      icon: Users,
      color: "text-green-600",
      bgColor: "bg-green-50",
      link: "/prospects",
    },
    {
      title: "Upcoming Viewings",
      value: stats?.upcomingViewings || 0,
      icon: Calendar,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      link: "/schedule/manager",
    },
    {
      title: "Converted Deals",
      value: stats?.converted || 0,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      link: "/prospects?status=converted",
    },
  ];

  const quickActions = [
    {
      title: "Viewings Today",
      value: stats?.todayViewings || 0,
      description: "Scheduled for today",
      icon: Calendar,
      link: "/schedule/manager",
    },
    {
      title: "Active Conversations",
      value: stats?.activeConversations || 0,
      description: "Ongoing chats",
      icon: MessageCircle,
      link: "/prospects",
    },
    {
      title: "Requires Attention",
      value: stats?.attentionNeeded || 0,
      description: "Needs follow-up",
      icon: AlertTriangle,
      link: "/prospects",
      variant: "destructive" as const,
    },
    {
      title: "Avg. Property Price",
      value: stats?.avgPropertyPrice ? `S$${stats.avgPropertyPrice.toLocaleString()}` : "—",
      description: "Across all listings",
      icon: DollarSign,
      link: "/properties",
    },
  ];

  return (
    <AppShell breadcrumbItems={[{ label: "Dashboard" }]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-foreground/70 mt-1">
            Overview of your real estate operations
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-16"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <Link key={stat.title} href={stat.link}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-foreground/70">
                        {stat.title}
                      </CardTitle>
                      <div className={`${stat.bgColor} p-2 rounded-lg`}>
                        <Icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>At a glance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.title} href={action.link}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${action.variant === "destructive" ? "bg-red-50" : "bg-muted"}`}>
                          <Icon className={`h-4 w-4 ${action.variant === "destructive" ? "text-red-600" : "text-foreground/60"}`} />
                        </div>
                        <div>
                          <div className="font-medium">{action.title}</div>
                          <div className="text-sm text-foreground/70">{action.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{action.value}</span>
                        <ArrowRight className="h-4 w-4 text-foreground/60" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Insights</CardTitle>
              <CardDescription>Key metrics and trends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/70">Total Prospects</span>
                  <span className="font-semibold">{stats?.totalProspects || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/70">Conversion Rate</span>
                  <span className="font-semibold">
                    {stats?.totalProspects
                      ? `${Math.round((stats.converted / stats.totalProspects) * 100)}%`
                      : "0%"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/70">Properties Listed</span>
                  <span className="font-semibold">{stats?.totalProperties || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/70">Avg. Prospects/Property</span>
                  <span className="font-semibold">
                    {stats?.totalProperties
                      ? Math.round((stats.totalProspects || 0) / stats.totalProperties)
                      : 0}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Link href="/properties">
                  <Button variant="outline" className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    View All Properties
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/properties">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base">Properties</CardTitle>
                <CardDescription>Manage your listings</CardDescription>
              </CardHeader>
              <CardContent>
                <Building2 className="h-8 w-8 text-foreground/60" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/prospects">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base">Prospects</CardTitle>
                <CardDescription>View all leads</CardDescription>
              </CardHeader>
              <CardContent>
                <Users className="h-8 w-8 text-foreground/60" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/schedule/manager">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base">Schedule</CardTitle>
                <CardDescription>Viewings & appointments</CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar className="h-8 w-8 text-foreground/60" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
