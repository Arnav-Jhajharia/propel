import { db, appointments, users } from '../src/lib/db';

async function fixAppointmentsUser() {
  console.log('🔧 Fixing appointments user ID...\n');
  
  try {
    // Get the first user in the database (should be the logged-in user or seeded user)
    const allUsers = await db.select().from(users);
    
    if (allUsers.length === 0) {
      console.log('❌ No users found in database. Please sign in first.');
      return;
    }

    console.log(`Found ${allUsers.length} user(s) in database:`);
    allUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - ID: ${user.id}`);
    });
    
    // Ask which user to use (for now, just use the first one)
    const targetUser = allUsers[0];
    console.log(`\n✅ Using user: ${targetUser.name} (${targetUser.email})`);
    
    // Get all appointments
    const allAppointments = await db.select().from(appointments);
    console.log(`\nFound ${allAppointments.length} appointment(s)`);
    
    if (allAppointments.length === 0) {
      console.log('No appointments to update.');
      return;
    }
    
    // Update all appointments to use this user ID
    let updated = 0;
    for (const apt of allAppointments) {
      if (apt.userId !== targetUser.id) {
        await db
          .update(appointments)
          .set({ userId: targetUser.id })
          .where(appointments.id.equals(apt.id));
        updated++;
      }
    }
    
    console.log(`\n✅ Updated ${updated} appointment(s) to user ID: ${targetUser.id}`);
    console.log('\nYou should now see the appointments in your dashboard!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

fixAppointmentsUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

