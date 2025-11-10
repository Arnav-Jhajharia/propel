"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  MapPin,
  Plus,
  Search,
  Users,
  CalendarClock,
  ExternalLink,
  Eye,
  MoreVertical,
  TrendingUp,
  DollarSign,
  Home,
  ArrowUpRight,
  MessageSquare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  createdAt?: string;
};

type WithCounts = Property & { prospectsCount: number; viewingsCount: number };

export default function PropertiesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"recent" | "prospects" | "viewings" | "price">("recent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WithCounts[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<WithCounts | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/properties", { cache: "no-store" });
        const data = await res.json();
        const props: Property[] = data.properties ?? [];
        if (props.length === 0) {
          setItems([]);
          return;
        }
        const withCounts = await Promise.all(
          props.map(async (p) => {
            try {
              const r = await fetch(`/api/properties/${p.id}/prospects`, { cache: "no-store" });
              const d = await r.json();
              const list = (d.prospects ?? []) as Array<{ status?: string }>;
              const prospectsCount = list.length;
              const viewingsCount = list.filter((x) => x.status === "viewing_scheduled").length;
              return { ...p, prospectsCount, viewingsCount } as WithCounts;
            } catch {
              return { ...p, prospectsCount: 0, viewingsCount: 0 } as WithCounts;
            }
          })
        );
        setItems(withCounts);
        // Auto-select first property if available
        if (withCounts.length > 0 && !selectedProperty) {
          setSelectedProperty(withCounts[0]);
        }
      } catch (e) {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = items.filter((p) =>
      !q ? true : p.title.toLowerCase().includes(q) || p.address.toLowerCase().includes(q)
    );
    const dir = sortDir === "desc" ? -1 : 1;
    if (sortKey === "recent") {
      arr = arr.sort((a, b) => dir * (a.createdAt || "").localeCompare(b.createdAt || ""));
    } else if (sortKey === "prospects") {
      arr = arr.sort((a, b) => dir * (a.prospectsCount - b.prospectsCount));
    } else if (sortKey === "viewings") {
      arr = arr.sort((a, b) => dir * (a.viewingsCount - b.viewingsCount));
    } else if (sortKey === "price") {
      arr = arr.sort((a, b) => dir * (a.price - b.price));
    }
    return arr;
  }, [items, search, sortKey, sortDir]);

  const addProperty = async () => {
    if (!addUrl) return;
    setAdding(true);
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: addUrl }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddOpen(false);
        setAddUrl("");
        const p = data.property as Property;
        const newProp = { ...(p as any), prospectsCount: 0, viewingsCount: 0 } as WithCounts;
        setItems((prev) => [newProp, ...prev]);
        setSelectedProperty(newProp);
      } else {
        alert(data.error || "Failed to add property");
      }
    } catch (e) {
      alert("Network error while adding property");
    } finally {
      setAdding(false);
    }
  };

  // Calculate overall statistics
  const stats = useMemo(() => {
    return {
      totalProperties: items.length,
      totalProspects: items.reduce((sum, p) => sum + p.prospectsCount, 0),
      totalViewings: items.reduce((sum, p) => sum + p.viewingsCount, 0),
      avgPrice: items.length > 0 ? Math.round(items.reduce((sum, p) => sum + p.price, 0) / items.length) : 0,
      topProperty: items.length > 0 ? items.reduce((top, p) => (p.prospectsCount > top.prospectsCount ? p : top), items[0]) : null,
    };
  }, [items]);

  return (
    <AppShell breadcrumbItems={[{ label: "Properties" }]}>
      <div className="flex h-[calc(100vh-4rem)] gap-4" data-tour-id="properties-list">
        {/* Left: Properties List */}
        <div className="flex-1 flex flex-col border-r overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search properties..."
                className="pl-9 h-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortKey} onValueChange={(v) => setSortKey(v as any)}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Date added</SelectItem>
                  <SelectItem value="prospects">Prospects</SelectItem>
                  <SelectItem value="viewings">Viewings</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setAddOpen(true)} size="sm" className="h-8">
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">
                {items.length === 0 ? (
                  <div className="space-y-2">
                    <p>No properties yet.</p>
                    <Button onClick={() => setAddOpen(true)} size="sm" variant="outline">
                      <Plus className="h-3 w-3 mr-1" /> Add your first property
                    </Button>
                  </div>
                ) : (
                  "No properties match your search."
                )}
              </div>
            ) : (
              <div className="divide-y">
                {filtered.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProperty(p)}
                    className={`p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedProperty?.id === p.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{p.title}</div>
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{p.address}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            ${p.price.toLocaleString()}/mo
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {p.bedrooms}bd • {p.bathrooms}ba
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {p.prospectsCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {p.viewingsCount}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/properties/${p.id}`)}>
                            <Eye className="h-3 w-3 mr-2" /> View details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(p.url, "_blank")}>
                            <ExternalLink className="h-3 w-3 mr-2" /> Open listing
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
          {selectedProperty ? (
            <div className="p-4 space-y-4">
              <div>
                <h2 className="font-semibold text-lg">{selectedProperty.title}</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {selectedProperty.address}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Price</div>
                  <div className="text-lg font-semibold mt-1">${selectedProperty.price.toLocaleString()}/mo</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Size</div>
                  <div className="text-lg font-semibold mt-1">{selectedProperty.sqft} sqft</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Bedrooms</div>
                  <div className="text-lg font-semibold mt-1">{selectedProperty.bedrooms}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Bathrooms</div>
                  <div className="text-lg font-semibold mt-1">{selectedProperty.bathrooms}</div>
                </Card>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Prospects</span>
                  <Badge variant="outline">{selectedProperty.prospectsCount}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Viewings</span>
                  <Badge variant="outline">{selectedProperty.viewingsCount}</Badge>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => router.push(`/properties/${selectedProperty.id}`)}
                  className="flex-1"
                  size="sm"
                >
                  <Eye className="h-3 w-3 mr-1" /> View details
                </Button>
                <Button
                  onClick={() => window.open(selectedProperty.url, "_blank")}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              <div>
                <h2 className="font-semibold text-lg">Overview</h2>
                <p className="text-sm text-muted-foreground mt-1">Your property portfolio at a glance</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Total Properties</div>
                  <div className="text-2xl font-semibold mt-1">{stats.totalProperties}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Total Prospects</div>
                  <div className="text-2xl font-semibold mt-1">{stats.totalProspects}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Scheduled Viewings</div>
                  <div className="text-2xl font-semibold mt-1">{stats.totalViewings}</div>
                </Card>
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground">Avg. Price</div>
                  <div className="text-2xl font-semibold mt-1">${stats.avgPrice.toLocaleString()}</div>
                </Card>
              </div>

              {stats.topProperty && (
                <Card className="p-3">
                  <div className="text-xs text-muted-foreground mb-2">Top Property</div>
                  <div className="font-medium text-sm">{stats.topProperty.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {stats.topProperty.prospectsCount} prospects
                  </div>
                </Card>
              )}

              <div className="space-y-2">
                <Button onClick={() => setAddOpen(true)} className="w-full" size="sm">
                  <Plus className="h-3 w-3 mr-2" /> Add Property
                </Button>
                <Button
                  onClick={() => router.push("/prospects")}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <TrendingUp className="h-3 w-3 mr-2" /> View Top Prospects
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add property dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add property</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Input
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="Paste listing URL (PropertyGuru or 99.co)"
            />
            <p className="text-xs text-muted-foreground">We'll import the details for you.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addProperty} disabled={!addUrl || adding}>
              {adding ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
