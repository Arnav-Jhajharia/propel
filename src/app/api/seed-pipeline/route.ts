import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema.supabase";
import { seedDummyProspectsForProperty } from "@/lib/db/seedProspectsForProperty";
import { desc } from "drizzle-orm";

export async function POST() {
  try {
    // Get the most recent property
    const props = await db.select().from(properties).orderBy(desc(properties.createdAt)).limit(1);
    
    if (props.length === 0) {
      return NextResponse.json({ error: "No properties found. Add a property first." }, { status: 404 });
    }

    const propertyId = props[0].id;
    
    // Seed prospects for this property across all stages
    await seedDummyProspectsForProperty(propertyId);

    return NextResponse.json({ 
      success: true, 
      message: "Pipeline seeded with prospects across all stages!",
      propertyId
    });
  } catch (error) {
    console.error("Error seeding pipeline:", error);
    return NextResponse.json({ error: "Failed to seed pipeline" }, { status: 500 });
  }
}

