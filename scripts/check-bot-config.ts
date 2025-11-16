#!/usr/bin/env tsx
import { db, botConfigs } from "@/lib/db";
import { eq } from "drizzle-orm";

async function main() {
  try {
    console.log("Checking bot configs in database...\n");

    const configs = await db
      .select()
      .from(botConfigs)
      .where(eq(botConfigs.isActive, true))
      .limit(5);

    if (configs.length === 0) {
      console.log("❌ No active bot configs found");
      return;
    }

    for (const config of configs) {
      console.log("=" .repeat(60));
      console.log("Config ID:", config.id);
      console.log("Name:", config.name);
      console.log("Scope:", config.scope);
      console.log("User ID:", config.userId);
      console.log("\nParsed Config:");
      
      const parsed = typeof config.parsedConfig === "string"
        ? JSON.parse(config.parsedConfig)
        : config.parsedConfig;
      
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.phaseSettings?.screening?.questions) {
        console.log("\n📋 Screening Questions:");
        parsed.phaseSettings.screening.questions.forEach((q: any, i: number) => {
          console.log(`  ${i + 1}) ${q.prompt || q.label}`);
        });
        console.log(`\nTotal: ${parsed.phaseSettings.screening.questions.length} questions`);
      } else {
        console.log("\n⚠️ No screening questions configured");
      }
      console.log("=" .repeat(60) + "\n");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

main();

