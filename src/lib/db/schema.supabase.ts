import { pgTable, text, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * PROPERTIES
 */
export const properties = pgTable('properties', {
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
  propertyType: text('property_type'),
  furnished: text('furnished'),
  availableFrom: timestamp('available_from', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * CLIENTS
 */
export const clients = pgTable('clients', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  avatar: text('avatar'),
  score: integer('score').default(0),
  budget: text('budget'),
  moveInDate: timestamp('move_in_date', { withTimezone: true, mode: 'string' }),
  tenantCount: integer('tenant_count'),
  hasPets: boolean('has_pets').default(false),
  notes: text('notes'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * PROSPECTS
 */
export const prospects = pgTable('prospects', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').notNull().references(() => properties.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  summary: text('summary').notNull(),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true, mode: 'string' }).notNull(),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * CONVERSATIONS
 */
export const conversations = pgTable('conversations', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'set null' }),
  platform: text('platform').notNull().default('whatsapp'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * MESSAGES
 */
export const messages = pgTable('messages', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  from: text('from').notNull(),
  text: text('text').notNull(),
  messageType: text('message_type').default('text'),
  metadata: jsonb('metadata'),
  status: text('status').default('sent'),
  whatsappMessageId: text('whatsapp_message_id'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * CONVERSATION STATES
 */
export const conversationStates = pgTable('conversation_states', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientPhone: text('client_phone').notNull(),
  step: integer('step').default(0),
  answers: jsonb('answers').default({}),
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'set null' }),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * USERS
 */
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  emailVerified: timestamp('email_verified', { withTimezone: true, mode: 'string' }),
  image: text('image'),
  role: text('role').default('agent'),
  calendlyUrl: text('calendly_url'),
  whatsappToken: text('whatsapp_token'),
  whatsappPhoneId: text('whatsapp_phone_id'),
  whatsappBusinessAccountId: text('whatsapp_business_account_id'),
  whatsappConnectedAt: timestamp('whatsapp_connected_at', { withTimezone: true, mode: 'string' }),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * APPOINTMENTS
 */
export const appointments = pgTable('appointments', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  clientId: text('client_id').references(() => clients.id, { onDelete: 'set null' }),
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'set null' }),
  title: text('title'),
  eventType: text('event_type'),
  status: text('status').notNull().default('scheduled'),
  startTime: timestamp('start_time', { withTimezone: true, mode: 'string' }),
  endTime: timestamp('end_time', { withTimezone: true, mode: 'string' }),
  timezone: text('timezone'),
  location: text('location'),
  notes: text('notes'),
  inviteeName: text('invitee_name'),
  inviteeEmail: text('invitee_email'),
  inviteePhone: text('invitee_phone'),
  calendlyEventUri: text('calendly_event_uri'),
  calendlyInviteeUri: text('calendly_invitee_uri'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * ACCOUNTS
 */
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true, mode: 'string' }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true, mode: 'string' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * SESSIONS
 */
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * VERIFICATIONS
 */
export const verifications = pgTable('verifications', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * SCREENING TEMPLATES
 */
export const screeningTemplates = pgTable('screening_templates', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  fields: jsonb('fields').default([]),
  isDefault: boolean('is_default').default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * USER SETTINGS
 */
export const userSettings = pgTable('user_settings', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  timezone: text('timezone').default('Asia/Singapore'),
  workingHours: jsonb('working_hours').default({ start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] }),
  notifications: jsonb('notifications').default({ whatsapp: true, email: true }),
  branding: jsonb('branding').default({ signature: '' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * BOT CONFIGS
 */
export const botConfigs = pgTable('bot_configs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  clientId: text('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  scope: text('scope').notNull().default('global'),
  name: text('name').notNull(),
  naturalLanguageInput: text('natural_language_input').notNull(),
  parsedConfig: jsonb('parsed_config').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow(),
});

/**
 * TYPE EXPORTS
 */
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


