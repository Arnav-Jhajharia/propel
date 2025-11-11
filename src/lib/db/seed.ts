import { db } from './index';
import { properties, clients, prospects, conversations, messages, users, accounts } from './schema';
import bcrypt from 'bcrypt';

export async function seedDatabase() {
  console.log('🌱 Seeding database...');

  try {
    // Clear existing data
    await db.delete(messages);
    await db.delete(conversations);
    await db.delete(prospects);
    await db.delete(clients);
    await db.delete(properties);
    await db.delete(accounts);
    await db.delete(users);

    // Create a default user
    const hashedPassword = await bcrypt.hash('password123', 10);
    const defaultUser = await db.insert(users).values({
      email: 'agent@example.com',
      name: 'John Agent',
      role: 'agent',
      calendlyUrl: 'https://calendly.com/john-agent/30min',
    }).returning();

    // Store password in accounts table
    await db.insert(accounts).values({
      userId: defaultUser[0].id,
      accountId: defaultUser[0].id,
      providerId: 'email',
      password: hashedPassword,
    });

    console.log(`  - 1 user (agent@example.com)`);

    // Create sample properties
    const sampleProperties = await db.insert(properties).values([
      {
        url: 'https://www.propertyguru.com.sg/listing/123',
        title: 'Modern 2BR Condo in Orchard',
        address: '12 Orchard Blvd, Singapore',
        price: 5200,
        bedrooms: 2,
        bathrooms: 2,
        sqft: 860,
        heroImage: 'https://images.unsplash.com/photo-1505692794403-34d4982b671c?q=80&w=1600&auto=format&fit=crop',
        description: 'Beautiful modern condo with city views',
        propertyType: 'condo',
        furnished: 'furnished',
        availableFrom: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      },
      {
        url: 'https://www.propertyguru.com.sg/listing/456',
        title: 'Spacious 3BR near Tiong Bahru',
        address: '8 Kim Tian Rd, Singapore',
        price: 6800,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1100,
        heroImage: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=1600&auto=format&fit=crop',
        description: 'Spacious family home in trendy neighborhood',
        propertyType: 'condo',
        furnished: 'unfurnished',
        availableFrom: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
      },
      {
        url: 'https://www.propertyguru.com.sg/listing/789',
        title: 'Luxury 4BR Penthouse',
        address: '1 Marina Bay Sands, Singapore',
        price: 12000,
        bedrooms: 4,
        bathrooms: 3,
        sqft: 2000,
        heroImage: 'https://images.unsplash.com/photo-1501877008226-4fca48ee50c1?q=80&w=1600&auto=format&fit=crop',
        description: 'Stunning penthouse with panoramic city views',
        propertyType: 'condo',
        furnished: 'furnished',
        availableFrom: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month from now
      },
    ]).returning();

    // Create sample clients
    const sampleClients = await db.insert(clients).values([
      {
        name: 'Ava Tan',
        phone: '6593456789',
        email: 'ava.tan@example.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop',
        score: 92,
        budget: '$7,000',
        moveInDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 3 weeks
        tenantCount: 2,
        hasPets: false,
        notes: 'Looking for modern condo, flexible on location',
        status: 'active',
      },
      {
        name: 'Marcus Lee',
        phone: '6598765432',
        email: 'marcus.lee@example.com',
        avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=400&auto=format&fit=crop',
        score: 81,
        budget: '$5,500',
        moveInDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 1 month
        tenantCount: 1,
        hasPets: true,
        notes: 'Has a cat, needs pet-friendly place',
        status: 'active',
      },
      {
        name: 'Priya Sharma',
        phone: '6592345678',
        email: 'priya.sharma@example.com',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
        score: 75,
        budget: '$6,000',
        moveInDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(), // 6 weeks
        tenantCount: 3,
        hasPets: false,
        notes: 'Family with 2 kids, needs 3BR',
        status: 'active',
      },
    ]).returning();

    // Create prospects linking clients to properties
    const sampleProspects = await db.insert(prospects).values([
      {
        clientId: sampleClients[0].id,
        propertyId: sampleProperties[0].id,
        score: 92,
        summary: 'Budget 7k, moving in 3 weeks, 2 pax, no pets.',
        lastMessageAt: new Date(Date.now() - 3600_000).toISOString(), // 1 hour ago
        status: 'active',
      },
      {
        clientId: sampleClients[1].id,
        propertyId: sampleProperties[0].id,
        score: 78,
        summary: 'Budget 5.5k, move-in next month, 1 pax, has cat.',
        lastMessageAt: new Date(Date.now() - 7200_000).toISOString(), // 2 hours ago
        status: 'active',
      },
      {
        clientId: sampleClients[2].id,
        propertyId: sampleProperties[1].id,
        score: 85,
        summary: 'Budget 6k, flexible timing, 3 pax, no pets.',
        lastMessageAt: new Date(Date.now() - 10800_000).toISOString(), // 3 hours ago
        status: 'active',
      },
      {
        clientId: sampleClients[0].id,
        propertyId: sampleProperties[1].id,
        score: 88,
        summary: 'Budget 7k, moving in 3 weeks, 2 pax, no pets.',
        lastMessageAt: new Date(Date.now() - 1800_000).toISOString(), // 30 minutes ago
        status: 'active',
      },
    ]).returning();

    // Create conversations
    const sampleConversations = await db.insert(conversations).values([
      {
        clientId: sampleClients[0].id,
        propertyId: sampleProperties[0].id,
        platform: 'whatsapp',
        status: 'active',
      },
      {
        clientId: sampleClients[1].id,
        propertyId: sampleProperties[0].id,
        platform: 'whatsapp',
        status: 'active',
      },
      {
        clientId: sampleClients[2].id,
        propertyId: sampleProperties[1].id,
        platform: 'whatsapp',
        status: 'active',
      },
    ]).returning();

    // Create sample messages
    await db.insert(messages).values([
      // Conversation 1 - Ava Tan
      {
        conversationId: sampleConversations[0].id,
        from: 'client',
        text: "Hi, I'm interested in the Orchard 2BR.",
        messageType: 'text',
        createdAt: new Date(Date.now() - 86400_000).toISOString(), // 1 day ago
      },
      {
        conversationId: sampleConversations[0].id,
        from: 'agent',
        text: "Great! What's your monthly budget?",
        messageType: 'text',
        createdAt: new Date(Date.now() - 86300_000).toISOString(),
      },
      {
        conversationId: sampleConversations[0].id,
        from: 'client',
        text: "$7k, flexible.",
        messageType: 'text',
        createdAt: new Date(Date.now() - 86200_000).toISOString(),
      },
      {
        conversationId: sampleConversations[0].id,
        from: 'agent',
        text: "Perfect. When are you looking to move in?",
        messageType: 'text',
        createdAt: new Date(Date.now() - 86100_000).toISOString(),
      },
      {
        conversationId: sampleConversations[0].id,
        from: 'client',
        text: "3 weeks.",
        messageType: 'text',
        createdAt: new Date(Date.now() - 86000_000).toISOString(),
      },
      // Conversation 2 - Marcus Lee
      {
        conversationId: sampleConversations[1].id,
        from: 'client',
        text: "Is the unit pet-friendly?",
        messageType: 'text',
        createdAt: new Date(Date.now() - 5400_000).toISOString(), // 1.5 hours ago
      },
      {
        conversationId: sampleConversations[1].id,
        from: 'agent',
        text: "Potentially with landlord approval.",
        messageType: 'text',
        createdAt: new Date(Date.now() - 5200_000).toISOString(),
      },
      // Conversation 3 - Priya Sharma
      {
        conversationId: sampleConversations[2].id,
        from: 'client',
        text: "Can I schedule a viewing this weekend?",
        messageType: 'text',
        createdAt: new Date(Date.now() - 10800_000).toISOString(), // 3 hours ago
      },
      {
        conversationId: sampleConversations[2].id,
        from: 'agent',
        text: "Yes, let's set it up via Calendly.",
        messageType: 'text',
        createdAt: new Date(Date.now() - 10400_000).toISOString(),
      },
    ]);

    console.log('✅ Database seeded successfully!');
    console.log(`📊 Created:`);
    console.log(`  - ${sampleProperties.length} properties`);
    console.log(`  - ${sampleClients.length} clients`);
    console.log(`  - ${sampleProspects.length} prospects`);
    console.log(`  - ${sampleConversations.length} conversations`);
    console.log(`  - 8 messages`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
