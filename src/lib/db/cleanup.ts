import { db } from './index';
import { properties, clients, prospects, conversations, messages, users, accounts } from './schema.supabase';

export async function cleanupFakeData() {
  console.log('🧹 Cleaning up fake/seed data from database...');

  try {
    // Clear all fake data (this will remove everything)
    console.log('  - Clearing messages...');
    await db.delete(messages);
    
    console.log('  - Clearing conversations...');
    await db.delete(conversations);
    
    console.log('  - Clearing prospects...');
    await db.delete(prospects);
    
    console.log('  - Clearing clients...');
    await db.delete(clients);
    
    console.log('  - Clearing properties...');
    await db.delete(properties);
    
    console.log('  - Clearing accounts...');
    await db.delete(accounts);
    
    console.log('  - Clearing users...');
    await db.delete(users);

    console.log('✅ Database cleanup completed!');
    console.log('📊 All fake/seed data has been removed.');
    console.log('💡 Your database is now clean and ready for real data.');

  } catch (error) {
    console.error('❌ Error cleaning up database:', error);
    throw error;
  }
}

// Run cleanup if this file is executed directly
if (require.main === module) {
  cleanupFakeData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}




