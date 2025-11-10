import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { screeningTemplates } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { draftWhatsAppReply } from "@/agent/llm";

type Field = {
  id: string;
  type: "text" | "textarea" | "number" | "date" | "yesno" | "select" | "multiselect";
  label: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // for select/multiselect
  min?: number; // for number
  max?: number; // for number
};

function defaultFields(): Field[] {
  return [
    { id: "nationality", type: "text", label: "Nationality / Pass Type", required: true },
    { id: "occupation", type: "text", label: "Occupation", required: true },
    { id: "tenants", type: "text", label: "Number of tenants & gender", required: true },
    { id: "move_in", type: "date", label: "Move-in date", required: true },
    { id: "budget", type: "number", label: "Budget (SGD)", min: 0 },
    { id: "pets", type: "yesno", label: "Any pets?" },
    { id: "areas", type: "text", label: "Preferred areas" },
  ];
}

export async function GET() {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rows = await db
      .select()
      .from(screeningTemplates)
      .where(and(eq(screeningTemplates.userId, userId), eq(screeningTemplates.isDefault, true)))
      .limit(1);
    const tpl = rows[0];
    const fields = tpl?.fields ? (typeof tpl.fields === "string" ? JSON.parse(tpl.fields as any) : (tpl.fields as any)) : defaultFields();
    return NextResponse.json({ name: tpl?.name || "Default Intake", fields });
  } catch (err) {
    console.error("screening GET error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const name: string = (body?.name ?? "Default Intake").toString();
    const fields: Field[] = Array.isArray(body?.fields) ? body.fields : [];

    if (!Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json({ error: "fields array is required" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(screeningTemplates)
      .where(and(eq(screeningTemplates.userId, userId), eq(screeningTemplates.isDefault, true)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(screeningTemplates)
        .set({ name, fields: JSON.stringify(fields) })
        .where(eq(screeningTemplates.id, existing[0].id));
    } else {
      await db.insert(screeningTemplates).values({ userId, name, isDefault: true as any, fields: JSON.stringify(fields) });
    }

    // Build simple sample WhatsApp drafts
    const labels = fields.map((f) => f.label).filter(Boolean);
    const list = labels.slice(0, 8).join(", ");
    const prompts = [
      `Draft a WhatsApp screening opener in point form (each line starts with '-'). Ask for: ${list}. Tone warm and professional. Keep lines short.`,
      `Draft a WhatsApp follow-up in point form (dash-prefixed lines) asking for any missing details from: ${list}. Friendly and concise.`,
      `Draft a WhatsApp message in point form to propose scheduling and include placeholder {{booking_link}} as a last line. Keep it concise.`,
    ];
    const samples: string[] = [];
    for (const p of prompts) {
      try {
        const s = await draftWhatsAppReply([], p);
        if (s) samples.push(s);
      } catch {
        // ignore
      }
    }

    return NextResponse.json({ ok: true, samples });
  } catch (err) {
    console.error("screening POST error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";


