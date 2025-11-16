#!/usr/bin/env tsx

import postgres from 'postgres';

async function fixTimestamps() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { ssl: 'require', prepare: false });

  try {
    console.log('🔧 Fixing timestamp defaults...\n');
    
    // Fix properties table
    await sql`
      ALTER TABLE properties 
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET DEFAULT NOW();
    `;
    console.log('✅ Fixed properties table timestamps');
    
    // Fix tasks table
    await sql`
      ALTER TABLE tasks 
      ALTER COLUMN created_at SET DEFAULT NOW(),
      ALTER COLUMN updated_at SET DEFAULT NOW();
    `;
    console.log('✅ Fixed tasks table timestamps');
    
    // Fix completed default for tasks
    await sql`
      ALTER TABLE tasks 
      ALTER COLUMN completed SET DEFAULT false;
    `;
    console.log('✅ Fixed tasks.completed default');
    
    console.log('\n🎉 All timestamp defaults are now set correctly!');
    console.log('Your property insertions should now work properly.');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

fixTimestamps();

