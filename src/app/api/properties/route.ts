import { NextResponse } from "next/server";
import { db, properties, type NewProperty } from "@/lib/db";
import { scrapePortalProperty } from "@/lib/portal-scraper";
import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { seedDummyProspectsForProperty } from "@/lib/db/seedProspectsForProperty";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allProperties = await db
      .select()
      .from(properties)
      .where(eq(properties.userId, userId))
      .orderBy(properties.createdAt);

    return NextResponse.json({ properties: allProperties });
  } catch (error) {
    console.error("Error fetching properties:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { propertyGuruUrl, url, contactId } = await req.json();
    const listingUrl: string | undefined = url || propertyGuruUrl;
    if (!listingUrl) {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // Check if property already exists
    const existingProperty = await db
      .select()
      .from(properties)
      .where(and(eq(properties.url, listingUrl), eq(properties.userId, userId)))
      .limit(1);

    if (existingProperty.length > 0) {
      return NextResponse.json({ 
        error: "Property already exists",
        property: existingProperty[0]
      }, { status: 409 });
    }

    // Scrape property from supported portals (PropertyGuru, 99.co)
    const scrapedProperty = await scrapePortalProperty(listingUrl);
    
    if (!scrapedProperty) {
      return NextResponse.json({ error: "Failed to scrape property from portal" }, { status: 400 });
    }

    // Convert to database format
    const HERO = "https://sg1-cdn.pgimgs.com/listing/60178874/UPHO.157261486.V800/Normanton-Park-Buona-Vista-West-Coast-Clementi-New-Town-Singapore.jpg";
    const newProperty: NewProperty = {
      userId,
      contactId: contactId || null,
      url: scrapedProperty.url,
      title: scrapedProperty.title,
      address: scrapedProperty.address,
      price: scrapedProperty.price,
      bedrooms: scrapedProperty.bedrooms,
      bathrooms: scrapedProperty.bathrooms,
      sqft: scrapedProperty.sqft,
      heroImage: HERO,
      description: scrapedProperty.description,
      propertyType: scrapedProperty.propertyType,
      furnished: scrapedProperty.furnished,
      availableFrom: scrapedProperty.availableFrom,
    };

    const [insertedProperty] = await db.insert(properties).values(newProperty).returning();

    // Automatically seed dummy prospects for this property to improve demo UX
    try {
      await seedDummyProspectsForProperty(insertedProperty.id as string);
    } catch (e) {
      console.warn("Prospect seeding failed:", e);
    }

    return NextResponse.json({ 
      property: insertedProperty,
      message: "Property imported successfully (with demo prospects)"
    });
  } catch (error) {
    const msg = (error as any)?.message || "Internal server error";
    console.error("Error creating property:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";