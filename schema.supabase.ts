// src/lib/db/schema.supabase.ts
import { pgTable, text, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// USERS
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  role: text('role').default('agent'),
  calendlyUrl: text('calendly_url'),
  whatsappToken: text('whatsapp_token'),
  whatsappPhoneId: text('whatsapp_phone_id'),
  whatsappBusinessAccountId: text('whatsapp_business_account_id'),
  whatsappConnectedAt: timestamp('whatsapp_connected_at', { withTimezone: true }),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// CLIENTS
export const clients = pgTable('clients', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  avatar: text('avatar'),
  score: integer('score').default(0),
  budget: text('budget'),
  moveInDate: text('move_in_date'),
  tenantCount: integer('tenant_count'),
  hasPets: boolean('has_pets').default(false),
  notes: text('notes'),
  status: text('status').default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// PROPERTIES
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
  availableFrom: text('available_from'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Example JSON-heavy table
export const botConfigs = pgTable('bot_configs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  propertyId: text('property_id').references(() => properties.id, { onDelete: 'cascade' }),
  clientId: text('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  scope: text('scope').notNull().default('global'),
  name: text('name').notNull(),
  naturalLanguageInput: text('natural_language_input').notNull(),
  parsedConfig: jsonb('parsed_config').notNull(), // use JSONB instead of text(JSON string)
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ...continue converting the rest of your tables from src/lib/db/schema.ts
//   - integer(..., { mode: 'boolean' }) -> boolean(...)
//   - text(..., { mode: 'json' }) -> jsonb(...)
//   - text timestamps -> timestamp(...).defaultNow()