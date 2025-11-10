"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function buildCalendlyUrl(baseUrl: string, name?: string | null, email?: string | null, phone?: string | null) {
  try {
    const url = new URL(baseUrl);
    if (name) url.searchParams.set("name", name);
    if (email) url.searchParams.set("email", email);
    if (phone) url.searchParams.set("a1", phone); // capture phone via custom question if configured
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export default function SchedulePage() {
  const params = useSearchParams();
  const router = useRouter();
  const [calendlyUrl, setCalendlyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const name = params.get("name");
  const email = params.get("email");
  const phone = params.get("phone");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/user/calendly", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data?.calendlyUrl) {
            setCalendlyUrl(data.calendlyUrl);
            return;
          }
        }
        const ls = typeof window !== "undefined" ? localStorage.getItem("calendly_url") : null;
        setCalendlyUrl(ls);
      } catch {
        const ls = typeof window !== "undefined" ? localStorage.getItem("calendly_url") : null;
        setCalendlyUrl(ls);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const src = useMemo(() => {
    if (!calendlyUrl) return null;
    return buildCalendlyUrl(calendlyUrl, name, email, phone);
  }, [calendlyUrl, name, email, phone]);

  return (
    <AppShell>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>Book a time that works for both of you</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[680px] w-full animate-pulse bg-muted rounded-md" />
            ) : src ? (
              <iframe title="Calendly" className="w-full h-[680px] border rounded-md" src={src} />
            ) : (
              <div className="text-center space-y-3">
                <div className="text-sm text-muted-foreground">Calendly is not connected yet.</div>
                <Button onClick={() => router.push("/integrations")}>Connect Calendly</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}





