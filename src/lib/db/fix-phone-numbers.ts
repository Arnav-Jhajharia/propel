/**
 * Fix phone numbers in existing database records
 * Updates old fake phone numbers to realistic ones
 */

import { db } from './index';
import { clients } from './schema';
import { eq } from 'drizzle-orm';

const phoneNumberMap: Record<string, string> = {
  '6591111111': '6593456789', // Ava Tan
  '6592222222': '6598765432', // Marcus Lee
  '6593333333': '6592345678', // Priya Sharma
  '6594444444': '6591872345', // Daniel Wong
  '6595555555': '6598234567', // Siti Nur
  '6596666666': '6594567890', // James Lim
  '6597777777': '6595678901', // Sarah Chen
  '6598888888': '6596789012', // Kevin Ng
  '6599999999': '6597890123', // Michelle Koh
  '6590000000': '6598901234', // Ryan Teo
};

export async function fixPhoneNumbers() {
  console.log('🔧 Fixing phone numbers in database...');
  
  let updated = 0;
  for (const [oldPhone, newPhone] of Object.entries(phoneNumberMap)) {
    try {
      // Check if client with old phone exists
      const existing = await db
        .select()
        .from(clients)
        .where(eq(clients.phone, oldPhone))
        .limit(1);
      
      if (existing.length > 0) {
        // Check if new phone already exists (avoid conflicts)
        const conflict = await db
          .select()
          .from(clients)
          .where(eq(clients.phone, newPhone))
          .limit(1);
        
        if (conflict.length === 0) {
          await db
            .update(clients)
            .set({ phone: newPhone })
            .where(eq(clients.phone, oldPhone));
          updated++;
          console.log(`  - Updated ${oldPhone} → ${newPhone} (${existing[0].name})`);
        } else {
          console.log(`  - Skipped ${oldPhone}: ${newPhone} already exists`);
        }
      }
    } catch (error) {
      console.error(`  - Error updating ${oldPhone}:`, error);
    }
  }
  
  console.log(`✅ Phone number fix complete. Updated ${updated} records.`);
  return { updated };
}

