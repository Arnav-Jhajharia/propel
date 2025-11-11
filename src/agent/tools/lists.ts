import { db } from "@/lib/db";
import { properties, prospects, clients, type Property } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function listRecentProperties(userId: string, limit = 6): Promise<Array<Pick<Property, "id" | "title" | "address" | "price">>> {
  const timestamp = new Date().toISOString();
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 📋 listRecentProperties called`);
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 👤 User ID: ${userId}`);
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 📊 Limit: ${limit}`);
  
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 🔍 Querying database...`);
  const rows = await db
    .select({ id: properties.id, title: properties.title, address: properties.address, price: properties.price })
    .from(properties)
    .where(eq(properties.userId, userId))
    .orderBy(desc(properties.createdAt))
    .limit(limit);
  
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] ✅ Found ${rows.length} properties`);
  return rows;
}

export async function listTopProspects(userId: string, limit = 5): Promise<Array<{ clientName: string; score: number; propertyTitle?: string }>> {
  const timestamp = new Date().toISOString();
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 👥 listTopProspects called`);
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 👤 User ID: ${userId}`);
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 📊 Limit: ${limit}`);
  
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] 🔍 Querying database with joins...`);
  const rows = await db
    .select({
      clientName: clients.name,
      score: prospects.score,
      propertyTitle: properties.title,
    })
    .from(prospects)
    .innerJoin(clients, eq(prospects.clientId, clients.id))
    .leftJoin(properties, eq(prospects.propertyId, properties.id))
    .where(eq(properties.userId, userId))
    .orderBy(desc(prospects.score))
    .limit(limit);
  
  console.log(`[BACKEND TOOL DEBUG ${timestamp}] ✅ Found ${rows.length} prospects`);
  // Normalize null -> undefined to satisfy the return type
  return rows.map((r) => ({ ...r, propertyTitle: r.propertyTitle ?? undefined }));
}


