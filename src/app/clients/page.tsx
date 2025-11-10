"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, MessageCircle, Calendar } from "lucide-react";

interface ClientItem {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  score?: number;
  lastMessage?: string;
}

const DUMMY_CLIENTS: ClientItem[] = [
  {
    id: "c1",
    name: "Alice Tan",
    phone: "+65 9123 4567",
    email: "alice.tan@example.com",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=256&q=80&auto=format&fit=crop",
    score: 86,
    lastMessage: "Thanks! I can do Saturday 11am.",
  },
  {
    id: "c2",
    name: "Benjamin Ong",
    phone: "+65 9876 5432",
    email: "ben.ong@example.com",
    avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=256&q=80&auto=format&fit=crop",
    score: 73,
    lastMessage: "Budget around $4k, 2BR preferred.",
  },
  {
    id: "c3",
    name: "Chloe Lim",
    phone: "+65 9001 2233",
    email: "chloe.lim@example.com",
    avatar: "https://images.unsplash.com/photo-1554151228-14d9def656e4?w=256&q=80&auto=format&fit=crop",
    score: 92,
    lastMessage: "Can we view the unit tomorrow?",
  },
];

export default function ClientsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return DUMMY_CLIENTS;
    return DUMMY_CLIENTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <AppShell breadcrumbItems={[{ label: "Clients" }]}> 
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients by name, phone or email..."
              className="pl-10 h-12 text-base"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <Card
              key={c.id}
              className="p-4 hover:shadow-sm transition cursor-pointer"
              onClick={() => router.push(`/clients/${c.id}`)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={c.avatar} />
                  <AvatarFallback>{c.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">{c.name}</div>
                    <Badge variant="secondary">Score {c.score ?? 0}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">{c.phone}</div>
                  {c.lastMessage && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                      <MessageCircle className="h-3 w-3" /> {c.lastMessage}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> Last contact 2d ago
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}




