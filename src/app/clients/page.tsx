"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown } from "lucide-react";

interface ClientItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  leadStatus: "hot" | "warm" | "cold";
  lastInteraction: string;
  dealsInPipeline: number;
  propertyPreference: string;
}

const DUMMY_CLIENTS: ClientItem[] = [
  {
    id: "c1",
    name: "Alice Tan",
    phone: "+65 9123 4567",
    email: "alice.tan@example.com",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&q=80&auto=format&fit=crop",
    leadStatus: "hot",
    lastInteraction: "2 hours ago",
    dealsInPipeline: 2,
    propertyPreference: "2-3 BR, Downtown",
  },
  {
    id: "c2",
    name: "Benjamin Ong",
    phone: "+65 9876 5432",
    email: "ben.ong@example.com",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=256&q=80&auto=format&fit=crop",
    leadStatus: "warm",
    lastInteraction: "1 day ago",
    dealsInPipeline: 1,
    propertyPreference: "Studio, Budget-friendly",
  },
  {
    id: "c3",
    name: "Chloe Lim",
    phone: "+65 9001 2233",
    email: "chloe.lim@example.com",
    avatar: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=256&q=80&auto=format&fit=crop",
    leadStatus: "hot",
    lastInteraction: "30 minutes ago",
    dealsInPipeline: 3,
    propertyPreference: "3+ BR, Family-friendly",
  },
  {
    id: "c4",
    name: "David Chen",
    phone: "+65 9234 5678",
    email: "david.chen@example.com",
    leadStatus: "cold",
    lastInteraction: "1 week ago",
    dealsInPipeline: 0,
    propertyPreference: "Any",
  },
];

export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "hot" | "warm" | "cold">("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = DUMMY_CLIENTS;
    
    if (statusFilter !== "all") {
      result = result.filter((c) => c.leadStatus === statusFilter);
    }
    
    if (q) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [search, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "hot":
        return "bg-primary/10 text-primary border-primary/20";
      case "warm":
        return "bg-chart-2/10 text-chart-2 border-chart-2/20";
      case "cold":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <AppShell breadcrumbItems={[{ label: "Clients" }]} showAddButton={false}>
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              All
            </Button>
            <Button
              variant={statusFilter === "hot" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("hot")}
            >
              Hot
            </Button>
            <Button
              variant={statusFilter === "warm" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("warm")}
            >
              Warm
            </Button>
            <Button
              variant={statusFilter === "cold" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("cold")}
            >
              Cold
            </Button>
          </div>
        </div>

        {/* Minimalist Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 sticky top-0">
                <tr className="border-b border-border">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    <div className="flex items-center gap-2">
                      Client Name
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Lead Status
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Last Interaction
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Deals in Pipeline
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                    Property Preference
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr
                    key={client.id}
                    onClick={() => router.push(`/clients/${client.id}`)}
                    className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={client.avatar} />
                          <AvatarFallback>{client.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{client.name}</div>
                          <div className="text-xs text-muted-foreground">{client.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(client.leadStatus)} capitalize`}
                      >
                        {client.leadStatus}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {client.lastInteraction}
                    </td>
                    <td className="p-4 text-sm font-medium">
                      {client.dealsInPipeline}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {client.propertyPreference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}




