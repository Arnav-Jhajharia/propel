import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

export const properties = sqliteTable('properties', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id'),
  contactId: text('contact_id').references(() => clients.id, { onDelete: 'set null' }),
  url: text('url').notNull(),
  title: text('title').notNull(),
  address: text('address').notNull(),
  price: integer('price').notNull(),
  bedrooms: integer('bedrooms').notNull(),
  bathrooms: integer('bathrooms').notNull(),
  sqft: integer('sqft').notNull(),
  heroImage: text('hero_image').notNull(),
  description: text('description'),
  propertyType: text('property_type'), // 'condo', 'hdb', 'landed', etc.
  furnished: text('furnished'), // 'furnished', 'unfurnished', 'partially'
  availableFrom: text('available_from'), // ISO date string
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const clients = sqliteTable('clients', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  avatar: text('avatar'),
  score: integer('score').default(0), // 0-100 prospect score
  budget: text('budget'),
  moveInDate: text('move_in_date'),
  tenantCount: integer('tenant_count'),
  hasPets: integer('has_pets', { mode: 'boolean' }).default(false),
  notes: text('notes'),
  status: text('status').default('active'), // 'active', 'inactive', 'converted'
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const prospects = sqliteTable('prospects', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(), // 0-100 fit score
  summary: text('summary').notNull(),
  lastMessageAt: text('last_message_at').notNull(),
  status: text('status').default('active'), // 'active', 'viewing_scheduled', 'converted', 'rejected'
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'set null' }),
  platform: text('platform').notNull().default('whatsapp'), // 'whatsapp', 'email', 'phone'
  status: text('status').default('active'), // 'active', 'completed', 'archived'
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  from: text('from').notNull(), // 'client' or 'agent'
  text: text('text').notNull(),
  messageType: text('message_type').default('text'), // 'text', 'image', 'document', etc.
  metadata: text('metadata', { mode: 'json' }), // Additional data like attachments, etc.
  status: text('status').default('sent'), // 'pending', 'sent', 'delivered', 'read', 'failed'
  whatsappMessageId: text('whatsapp_message_id'), // WhatsApp API message ID for status tracking
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const conversationStates = sqliteTable('conversation_states', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientPhone: text('client_phone').notNull(),
  step: integer('step').default(0),
  answers: text('answers', { mode: 'json' }).$defaultFn(() => JSON.stringify({})),
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'set null' }),
  status: text('status').default('active'), // 'active', 'completed', 'cancelled'
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  emailVerified: text('email_verified'),
  image: text('image'),
  role: text('role').default('agent'), // 'agent', 'admin'
  calendlyUrl: text('calendly_url'),
  whatsappToken: text('whatsapp_token'), // ⚠️ Encrypted access token
  whatsappPhoneId: text('whatsapp_phone_id'), // ⚠️ Encrypted phone number ID
  whatsappBusinessAccountId: text('whatsapp_business_account_id'), // ⚠️ Encrypted WABA ID
  whatsappConnectedAt: text('whatsapp_connected_at'), // ISO timestamp of OAuth connection
  onboardingCompletedAt: text('onboarding_completed_at'), // ISO timestamp when setup finished
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const appointments = sqliteTable('appointments', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientId: text('client_id').references(() => clients.id, { onDelete: 'set null' }),
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'set null' }),
  title: text('title'),
  eventType: text('event_type'),
  status: text('status').notNull().default('scheduled'), // 'scheduled' | 'canceled' | 'rescheduled'
  startTime: text('start_time'),
  endTime: text('end_time'),
  timezone: text('timezone'),
  location: text('location'),
  notes: text('notes'),
  inviteeName: text('invitee_name'),
  inviteeEmail: text('invitee_email'),
  inviteePhone: text('invitee_phone'),
  calendlyEventUri: text('calendly_event_uri'),
  calendlyInviteeUri: text('calendly_invitee_uri'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: text('access_token_expires_at'),
  refreshTokenExpiresAt: text('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

export const verifications = sqliteTable('verifications', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// Onboarding: screening templates (default questionnaire asked to tenants)
export const screeningTemplates = sqliteTable('screening_templates', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  fields: text('fields', { mode: 'json' }).$defaultFn(() => JSON.stringify([])),
  isDefault: integer('is_default', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// Onboarding: user settings/preferences
export const userSettings = sqliteTable('user_settings', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  timezone: text('timezone').$defaultFn(() => 'Asia/Singapore'),
  workingHours: text('working_hours', { mode: 'json' }).$defaultFn(() => JSON.stringify({ start: '09:00', end: '18:00', days: [1,2,3,4,5] })),
  notifications: text('notifications', { mode: 'json' }).$defaultFn(() => JSON.stringify({ whatsapp: true, email: true })),
  branding: text('branding', { mode: 'json' }).$defaultFn(() => JSON.stringify({ signature: '' })),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// Bot automation configurations - control how much the AI automates
export const botConfigs = sqliteTable('bot_configs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'cascade' }), // null = not property-specific
  clientId: text('client_id').references(() => clients.id, { onDelete: 'cascade' }), // null = not client-specific
  scope: text('scope').notNull().default('global'), // 'global', 'property', 'client'
  name: text('name').notNull(), // e.g. "Default Automation", "VIP Client Override"
  naturalLanguageInput: text('natural_language_input').notNull(), // User's original instruction
  parsedConfig: text('parsed_config', { mode: 'json' }).notNull(), // Structured automation rules
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// Tasks for agent to-do list
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  completed: integer('completed', { mode: 'boolean' }).default(false),
  priority: text('priority').default('medium'), // 'low', 'medium', 'high'
  dueDate: text('due_date'), // ISO date string
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'set null' }),
  clientId: text('client_id').references(() => clients.id, { onDelete: 'set null' }),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
});

// Type exports for TypeScript
export type Property = typeof properties.$inferSelect;
export type NewProperty = typeof properties.$inferInsert;

export type Client = typeof clients.$inferSelect;
export type NewClient = typeof clients.$inferInsert;

export type Prospect = typeof prospects.$inferSelect;
export type NewProspect = typeof prospects.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type ConversationState = typeof conversationStates.$inferSelect;
export type NewConversationState = typeof conversationStates.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;

export type ScreeningTemplate = typeof screeningTemplates.$inferSelect;
export type NewScreeningTemplate = typeof screeningTemplates.$inferInsert;

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

export type BotConfig = typeof botConfigs.$inferSelect;
export type NewBotConfig = typeof botConfigs.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
