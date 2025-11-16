import { db, properties as propertiesTable, type NewProperty } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { scrapePortalProperty } from "@/lib/portal-scraper";

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
  if (!propertyUrl || !/^https?:\/\//i.test(propertyUrl)) {
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

  // Check if property already exists by URL
  let existing = await db
    .select()
    .from(propertiesTable)
    .where(and(eq(propertiesTable.url, normalizedUrl), eq(propertiesTable.userId, userId)))
    .limit(1);
  if (existing.length === 0) {
    existing = await db
      .select()
      .from(propertiesTable)
      .where(and(eq(propertiesTable.url, propertyUrl), eq(propertiesTable.userId, userId)))
      .limit(1);
  }

  if (existing.length > 0) {
    const p = existing[0];
    return {
      created: false,
      property: { id: p.id, url: p.url, title: p.title },
      message: "Property already exists",
    };
  }

  // Scrape property details from supported portals
  const scraped = await scrapePortalProperty(propertyUrl);
  if (!scraped) {
    throw new Error("Failed to scrape property from portal");
  }

  // Validate availableFrom - convert invalid dates to null
  let availableFrom = scraped.availableFrom;
  if (availableFrom === "TBD" || !availableFrom || availableFrom === "undefined") {
    availableFrom = null;
  }

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
    availableFrom: availableFrom,
  };

  const [inserted] = await db.insert(propertiesTable).values(newProperty).returning();

  return {
    created: true,
    property: { id: inserted.id, url: inserted.url, title: inserted.title },
    message: "Property imported successfully",
  };
}



