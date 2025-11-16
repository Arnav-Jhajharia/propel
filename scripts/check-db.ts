import { db, users, appointments } from '../src/lib/db';

async function checkDatabase() {
  console.log('🔍 Checking database...\n');
  
  try {
    // Get all users
    const allUsers = await db.select().from(users);
    console.log('👥 Users in database:');
    allUsers.forEach(user => {
      console.log(`  - ID: ${user.id}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    Name: ${user.name}`);
      console.log(`    Role: ${user.role}\n`);
    });
    
    // Get all appointments
    const allAppointments = await db.select().from(appointments);
    console.log(`📅 Appointments in database (${allAppointments.length} total):`);
    allAppointments.forEach(apt => {
      console.log(`  - ${apt.title}`);
      console.log(`    User ID: ${apt.userId}`);
      console.log(`    Start: ${apt.startTime}`);
      console.log(`    Status: ${apt.status}\n`);
    });
    
    if (allAppointments.length > 0 && allUsers.length > 0) {
      const aptUserIds = new Set(allAppointments.map(a => a.userId));
      const userIds = new Set(allUsers.map(u => u.id));
      
      console.log('🔄 Checking for mismatches:');
      aptUserIds.forEach(aptUserId => {
        if (!userIds.has(aptUserId)) {
          console.log(`  ⚠️  Appointments exist for non-existent user: ${aptUserId}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDatabase();

