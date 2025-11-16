import { NextResponse } from "next/server";
import { db, properties } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const property = await db
      .select()
      .from(properties)
      .where(and(eq(properties.id, id), eq(properties.userId, userId)))
      .limit(1);

    if (property.length === 0) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    return NextResponse.json({ property: property[0] });
  } catch (error) {
    console.error("Error fetching property:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";


