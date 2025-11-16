import { db, properties } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function main() {
  console.log("🗑️  Deleting all rows from 'properties'...");
  await db.delete(properties);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties);

  console.log(`✅ Done. Remaining rows in 'properties': ${count}`);
}

main().catch((err) => {
  console.error("❌ Error emptying 'properties':", err);
  process.exit(1);
});







