"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Item = {
  id: string;
  title: string;
  address: string;
  price: string;
  image?: string;
};

const MOCK: Item[] = [
  {
    id: "p1",
    title: "Modern 2BR Condo in Orchard",
    address: "12 Orchard Blvd, Singapore",
    price: "$5,200/mo",
    image:
      "https://images.unsplash.com/photo-1505692794403-34d4982b671c?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: "p2",
    title: "Spacious 3BR near Tiong Bahru",
    address: "8 Kim Tian Rd, Singapore",
    price: "$6,800/mo",
    image:
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=1200&auto=format&fit=crop",
  },
];

export default function PropertySpotlight({ items = MOCK }: { items?: Item[] }) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Properties needing attention</div>
      <div className="rounded-xl border bg-white divide-y">
        {items.map((p) => (
          <div key={p.id} className="p-3 flex items-center gap-3">
            <div className="h-14 w-20 rounded-md overflow-hidden bg-muted">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{p.title}</div>
              <div className="text-xs text-muted-foreground truncate">{p.address}</div>
              <div className="mt-1"><Badge variant="secondary">{p.price}</Badge></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-8 px-3">Book viewing</Button>
              <Button size="sm" className="h-8 px-3">Share</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


