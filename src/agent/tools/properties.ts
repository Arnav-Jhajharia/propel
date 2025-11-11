import { db } from "@/lib/db";
import { properties as propertiesTable, type NewProperty } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { scrapePortalProperty } from "@/lib/portal-scraper";
import { seedDummyProspectsForProperty } from "@/lib/db/seedProspectsForProperty";

export type AddPropertyResult = {
  created: boolean;
  property: {
    id: string;
    url: string;
    title: string;
  };
  message: string;
};

export async function addPropertyFromUrl(propertyUrl: string, userId: string): Promise<AddPropertyResult> {
  const timestamp = new Date().toISOString();
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 🏠 addPropertyFromUrl called`);
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 🌐 URL: ${propertyUrl}`);
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 👤 User ID: ${userId}`);
  
  if (!propertyUrl || !/^https?:\/\//i.test(propertyUrl)) {
    console.log(`[BACKEND TOOL DEBUG ${timestamp}] ❌ Invalid URL`);
    throw new Error("A valid property URL is required");
  }

  const normalizeUrl = (s: string): string => {
    try {
      const u = new URL(s);
      u.hash = "";
      u.search = "";
      return u.toString();
    } catch {
      return s.split("?")[0].split("#")[0];
    }
  };

  const normalizedUrl = normalizeUrl(propertyUrl);
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 🔗 Normalized URL: ${normalizedUrl}`);

  // Check if property already exists by URL
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 🔍 Checking if property exists in database...`);
  let existing = await db
    .select()
    .from(propertiesTable)
    .where(and(eq(propertiesTable.url, normalizedUrl), eq(propertiesTable.userId, userId)))
    .limit(1);
  if (existing.length === 0) {
    console.log(`[BACKEND TOOL DEBUG ${timestamp}] 🔍 Trying original URL format...`);
    existing = await db
      .select()
      .from(propertiesTable)
      .where(and(eq(propertiesTable.url, propertyUrl), eq(propertiesTable.userId, userId)))
      .limit(1);
  }

  if (existing.length > 0) {
    const p = existing[0];
    console.log(`[BACKEND TOOL DEBUG ${timestamp}] ✅ Property already exists: ${p.id}`);
    return {
      created: false,
      property: { id: p.id, url: p.url, title: p.title },
      message: "Property already exists",
    };
  }

  // Scrape property details from supported portals
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 🕷️  Scraping property from portal...`);
  const scraped = await scrapePortalProperty(propertyUrl);
  if (!scraped) {
    console.log(`[BACKEND TOOL DEBUG ${timestamp}] ❌ Failed to scrape property`);
    throw new Error("Failed to scrape property from portal");
  }
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] ✅ Scraped property: ${scraped.title}`);

  const newProperty: NewProperty = {
    userId,
    url: normalizedUrl,
    title: scraped.title,
    address: scraped.address,
    price: scraped.price,
    bedrooms: scraped.bedrooms,
    bathrooms: scraped.bathrooms,
    sqft: scraped.sqft,
    heroImage: "https://sg1-cdn.pgimgs.com/listing/60178874/UPHO.157261486.V800/Normanton-Park-Buona-Vista-West-Coast-Clementi-New-Town-Singapore.jpg",
    description: scraped.description,
    propertyType: scraped.propertyType,
    furnished: scraped.furnished,
    availableFrom: scraped.availableFrom,
  };

  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 💾 Inserting property into database...`);
  const [inserted] = await db.insert(propertiesTable).values(newProperty).returning();
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] ✅ Property inserted: ${inserted.id}`);

  // Automatically seed dummy prospects for this property to improve demo UX
  try {
    console.log(`[BACKEND TOOL DEBUG ${timestamp}] 🌱 Seeding prospects for property...`);
    await seedDummyProspectsForProperty(inserted.id as string);
    console.log(`[BACKEND TOOL DEBUG ${timestamp}] ✅ Prospects seeded successfully`);
  } catch (e) {
    console.warn(`[BACKEND TOOL DEBUG ${timestamp}] ⚠️ Prospect seeding failed:`, e);
  }

  return {
    created: true,
    property: { id: inserted.id, url: inserted.url, title: inserted.title },
    message: "Property imported successfully (with demo prospects)",
  };
}



