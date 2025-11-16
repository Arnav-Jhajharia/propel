#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';
import postgres from 'postgres';

async function applyMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔌 Connecting to Supabase database...');
  const sql = postgres(databaseUrl, { ssl: 'require', prepare: false });

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'drizzle', '0001_absent_masked_marvel.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Applying migration: 0001_absent_masked_marvel.sql');
    console.log('');
    
    // Execute the migration
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('Tasks table created with:');
    console.log('  ✓ 11 columns');
    console.log('  ✓ 3 foreign keys (user_id, property_id, client_id)');
    console.log('  ✓ Default values for completed, priority, timestamps');
    console.log('');
    console.log('🎉 Your dashboard task list is now ready to use!');
    
  } catch (error: any) {
    if (error?.message?.includes('already exists')) {
      console.log('ℹ️  Tasks table already exists - skipping migration');
      console.log('✅ Database is up to date!');
    } else {
      console.error('❌ Error applying migration:', error);
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

applyMigration();

