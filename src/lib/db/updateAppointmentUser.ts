import { db } from './index';
import { appointments } from './schema.supabase';
import { eq } from 'drizzle-orm';

export async function updateAppointmentUser(oldUserId: string, newUserId: string) {
  console.log(`🔄 Updating appointments from user ${oldUserId} to ${newUserId}...`);
  
  try {
    // Get all appointments for old user
    const oldAppointments = await db
      .select()
      .from(appointments)
      .where(eq(appointments.userId, oldUserId));
    
    console.log(`Found ${oldAppointments.length} appointments to update`);
    
    // Update each appointment
    for (const apt of oldAppointments) {
      await db
        .update(appointments)
        .set({ userId: newUserId })
        .where(eq(appointments.id, apt.id));
    }
    
    console.log('✅ Appointments updated successfully!');
    return { success: true, count: oldAppointments.length };
  } catch (error) {
    console.error('❌ Error updating appointments:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  const oldUserId = process.argv[2];
  const newUserId = process.argv[3];
  
  if (!oldUserId || !newUserId) {
    console.error('Usage: tsx updateAppointmentUser.ts <oldUserId> <newUserId>');
    process.exit(1);
  }
  
  updateAppointmentUser(oldUserId, newUserId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

