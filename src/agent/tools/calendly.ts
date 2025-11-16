import { db } from "@/lib/db";
import { appointments, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function listTodaysAppointments(userId: string, date?: string): Promise<Array<{ startTime?: string; title?: string; invitee?: string }>> {
  // Parse date: "today", "tomorrow", or ISO date string
  let targetDate: Date;
  const now = new Date();
  
  if (!date || date.toLowerCase() === "today") {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (date.toLowerCase() === "tomorrow") {
    targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else {
    // Try to parse as ISO date string
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      targetDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    } else {
      // Default to today if parsing fails
      targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }
  
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);

  const rows = await db
    .select()
    .from(appointments)
    .where(and(eq(appointments.userId, userId)))
    .limit(200);

  return rows
    .filter((r) => r.status !== "canceled" && r.startTime && new Date(r.startTime) >= startOfDay && new Date(r.startTime) <= endOfDay)
    .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""))
    .map((r) => ({ startTime: r.startTime || undefined, title: r.title || undefined, invitee: r.inviteeName || r.inviteeEmail || r.inviteePhone || undefined }));
}

export async function getCalendlySchedulingUrl(userId: string): Promise<string | null> {
  const rows = await db.select({ url: users.calendlyUrl }).from(users).where(eq(users.id, userId)).limit(1);
  const url = rows[0]?.url || null;
  return url;
}

export function buildSchedulePageLink(params: { name?: string; email?: string; phone?: string }): string {
  const url = new URL("/schedule", baseUrl());
  if (params.name) url.searchParams.set("name", params.name);
  if (params.email) url.searchParams.set("email", params.email);
  if (params.phone) url.searchParams.set("phone", params.phone);
  return url.toString();
}





