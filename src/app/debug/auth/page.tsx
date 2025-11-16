"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function DebugAuthPage() {
  const [authInfo, setAuthInfo] = useState<any>(null);
  const [eventsInfo, setEventsInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check auth status
        const authRes = await fetch('/api/debug/user');
        const authData = await authRes.json();
        setAuthInfo(authData);

        // Check events
        const eventsRes = await fetch('/api/scheduling/events');
        const eventsData = await eventsRes.json();
        setEventsInfo(eventsData);
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Debug: Authentication & Events</h1>
      
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Authentication Status</h2>
            <pre className="bg-slate-100 p-4 rounded overflow-auto">
              {JSON.stringify(authInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Events Response</h2>
            <pre className="bg-slate-100 p-4 rounded overflow-auto">
              {JSON.stringify(eventsInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Seeded User Info</h2>
            <p className="mb-2"><strong>User ID:</strong> seqyjgazd4j0sq7jioqlo0vc</p>
            <p className="mb-2"><strong>Email:</strong> agent@example.com</p>
            <p className="mb-2"><strong>Password:</strong> password123</p>
            <p className="mt-4 text-sm text-muted-foreground">
              If your current user ID doesn't match the seeded user ID, the appointments won't show up.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Fix</h2>
            <p className="mb-4">Run this command to update appointments to your current user:</p>
            <code className="bg-slate-100 p-2 rounded block">
              npx tsx src/lib/db/updateAppointmentUser.ts seqyjgazd4j0sq7jioqlo0vc YOUR_USER_ID
            </code>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

