#!/usr/bin/env tsx

import postgres from 'postgres';

async function findCheckConstraints() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { prepare: false });

  try {
    console.log('🔍 Finding CHECK constraints in your database...\n');
    
    const constraints = await sql`
      SELECT 
        tc.table_name, 
        tc.constraint_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.constraint_type = 'CHECK'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name;
    `;
    
    if (constraints.length === 0) {
      console.log('✅ No CHECK constraints found!');
    } else {
      console.log(`Found ${constraints.length} CHECK constraint(s):\n`);
      
      constraints.forEach((c: any, i: number) => {
        console.log(`${i + 1}. Table: ${c.table_name}`);
        console.log(`   Constraint: ${c.constraint_name}`);
        console.log(`   Check: ${c.check_clause || 'NULL (THIS IS THE PROBLEM!)'}`);
        console.log('');
      });
      
      console.log('\n💡 To fix drizzle-kit, you need to drop the constraints with NULL check_clause');
      console.log('   Run this in Supabase SQL Editor:');
      console.log('');
      
      constraints.forEach((c: any) => {
        if (!c.check_clause) {
          console.log(`   ALTER TABLE ${c.table_name} DROP CONSTRAINT ${c.constraint_name};`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

findCheckConstraints();

