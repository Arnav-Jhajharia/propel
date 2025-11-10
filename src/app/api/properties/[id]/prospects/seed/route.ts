import { NextResponse } from "next/server";
import { seedDummyProspectsForProperty } from "@/lib/db/seedProspectsForProperty";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id: propertyId } = await ctx.params;
    if (!propertyId) return NextResponse.json({ error: "Missing property id" }, { status: 400 });
    const result = await seedDummyProspectsForProperty(propertyId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("seed prospects error", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";


