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

  console.log('🔌 Connecting to database...');
  const sql = postgres(databaseUrl, { ssl: 'require' });

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'migrations', 'add_tasks_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📝 Applying tasks table migration...');
    
    // Execute the migration
    await sql.unsafe(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('Tasks table has been created with the following structure:');
    console.log('  - id (TEXT, PRIMARY KEY)');
    console.log('  - user_id (TEXT, NOT NULL)');
    console.log('  - title (TEXT, NOT NULL)');
    console.log('  - description (TEXT)');
    console.log('  - completed (BOOLEAN, default: false)');
    console.log('  - priority (TEXT, default: medium)');
    console.log('  - due_date (TIMESTAMP)');
    console.log('  - property_id (TEXT)');
    console.log('  - client_id (TEXT)');
    console.log('  - created_at (TIMESTAMP)');
    console.log('  - updated_at (TIMESTAMP)');
    console.log('');
    console.log('🎉 Your dashboard task list is now ready to use!');
    
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigration();

