# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agent Rental Dashboard - A Next.js application for rental property agents to manage listings, track prospects, and automate tenant screening via WhatsApp. Built for the Singapore rental market with PropertyGuru integration.

## Development Commands

```bash
# Development
npm run dev              # Start development server (Next.js with Turbopack)
npm run build           # Production build
npm run start           # Start production server
npm run lint            # Run ESLint

# Database Management
npm run db:push         # Push schema changes to database (use during development)
npm run db:generate     # Generate migrations from schema changes
npm run db:migrate      # Run migrations
npm run db:studio       # Open Drizzle Studio at https://local.drizzle.studio
npm run db:seed         # Seed database with sample data
npm run db:cleanup      # Clean up database (removes test data)

# Quick Start
./start-all.sh          # One-command setup: install deps, setup DB, seed, and start dev server

# Testing
./test-simple-auth.sh          # Test authentication
./test-apis-with-auth.sh       # Test all API endpoints
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: SQLite with LibSQL (Turso for production)
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Better Auth (email/password, sessions)
- **UI**: React 19, Tailwind CSS 4, Radix UI, shadcn/ui components
- **State**: Client-side React state (no global state management)
- **External Integrations**:
  - WhatsApp Business API (automated screening)
  - PropertyGuru (property scraping with Puppeteer)

### Core Database Schema

Located in `src/lib/db/schema.ts`:

- **users**: Agent accounts with encrypted WhatsApp credentials
- **properties**: Rental listings imported from PropertyGuru
- **clients**: Prospective tenants with contact info and scores
- **prospects**: Join table linking clients to properties with fit scores (0-100)
- **conversations**: Communication threads (WhatsApp, email, phone)
- **messages**: Individual messages within conversations
- **accounts/sessions/verifications**: Better Auth tables

Key relationships:
- Prospects link clients to properties with scoring
- Conversations link clients to properties with message threads
- Users store encrypted WhatsApp API credentials (token, phone ID)

### Authentication System

**Two auth implementations exist** (dual-auth setup):

1. **Better Auth** (`src/lib/auth.ts`, `src/lib/auth-client.ts`):
   - Modern auth library with Drizzle adapter
   - Email/password authentication
   - Session-based with token storage
   - API routes: `/api/auth/[...all]`

2. **Simple Auth** (`src/lib/simple-auth.ts`, `src/lib/simple-auth-client.ts`):
   - Custom implementation used in dashboard pages
   - Manual session management with cookies
   - API routes: `/api/auth/signin`, `/api/auth/signup`, `/api/auth/signout`, `/api/auth/session`
   - **Currently active in dashboard** via `SimpleAuthWrapper` component

**Middleware**: `src/middleware.ts` currently allows all routes (authentication check disabled).

Default credentials for seeded data:
- Email: `agent@example.com`
- Password: `password123`

### API Routes Structure

Key endpoints:

- **Properties**:
  - `GET /api/properties` - List all properties
  - `GET /api/properties/[id]` - Get single property
  - `POST /api/properties` - Create property (used by PropertyGuru import)
  - `GET /api/properties/[id]/prospects` - Get prospects for a property

- **Clients**:
  - `GET /api/clients/[id]` - Get client with conversation messages

- **PropertyGuru Integration**:
  - `POST /api/propertyguru/import` - Import property from URL
  - Uses Puppeteer scraper (`src/lib/propertyguru-scraper.ts`)
  - Falls back to enhanced mock data if scraping fails (anti-bot protection)

- **WhatsApp**:
  - `POST /api/whatsapp/webhook` - Receive incoming messages
  - `POST /api/whatsapp/send` - Send outgoing messages
  - Automated 3-question screening flow (budget, move-in date, tenants)
  - Auto-calculates prospect scores (0-100) based on responses

- **User Profile**:
  - `GET/PUT /api/user/profile` - Manage user profile
  - `GET/PUT /api/user/whatsapp` - Manage encrypted WhatsApp credentials

### WhatsApp Integration Flow

1. Incoming messages hit `/api/whatsapp/webhook` (POST)
2. System matches phone number ID to user via encrypted credentials
3. Creates client record if new contact
4. Manages in-memory conversation state for screening questions
5. After 3 questions answered:
   - Updates client with budget, move-in date, tenant count
   - Calculates score (0-100 based on budget, timing, tenant info)
   - Stores all messages in database
6. Agent can view conversations in dashboard at `/clients/[id]`

**Important**: WhatsApp credentials (token, phone ID) are encrypted before storage using `src/lib/encryption.ts`.

### PropertyGuru Scraper

`src/lib/propertyguru-scraper.ts`:

- Attempts real scraping with Puppeteer (15-second timeout)
- Uses comprehensive selector arrays to find data (selectors updated for 2024 PropertyGuru)
- Falls back to enhanced mock data based on URL analysis if scraping fails
- Extracts: title, price, address, bedrooms, bathrooms, sqft, images, description, agent info
- Mock data generation includes realistic property types, locations, and pricing for Singapore

### Frontend Pages

- `/` (Dashboard): Property overview, top prospects table, sidebar navigation
- `/login`: Sign in/sign up forms (uses Simple Auth)
- `/properties/[id]`: Property details with prospects list
- `/clients/[id]`: Client details with message history
- `/integrations`: PropertyGuru import interface, WhatsApp credential management

All dashboard pages wrapped in `SimpleAuthWrapper` for authentication.

### UI Components

Located in `src/components/ui/`:
- shadcn/ui components (Button, Card, Table, Dialog, etc.)
- Custom components: `ComponentSeparator`, `container-scroll-animation`
- Radix UI primitives for accessibility

Main components:
- `SimpleAuthWrapper`: Client-side auth guard
- `PropertyGuruImport`: Property import form
- Sidebar navigation (from shadcn/ui sidebar component)

## Important Implementation Notes

### Database Operations

- Use Drizzle ORM for all database queries
- Schema location: `src/lib/db/schema.ts`
- Database connection: `src/lib/db/index.ts`
- Always use `db.select()`, `db.insert()`, `db.update()`, `db.delete()` with Drizzle query builder
- Use `eq()`, `and()`, `or()` from `drizzle-orm` for WHERE clauses
- Type-safe: Use exported types like `Property`, `Client`, `NewProperty`, etc.

### Sensitive Data Encryption

- WhatsApp credentials MUST be encrypted before storing
- Use `simpleEncrypt()` and `simpleDecrypt()` from `src/lib/encryption.ts`
- Encryption key stored in `.env` as `ENCRYPTION_KEY`
- Never store API tokens in plaintext

### Environment Variables

Required in `.env`:

```env
DATABASE_URL=file:./local.db              # Local SQLite
BETTER_AUTH_SECRET=your-secret-key        # Auth secret
BETTER_AUTH_URL=http://localhost:3000     # Base URL
ENCRYPTION_KEY=hex-string                 # For encrypting WhatsApp credentials
WHATSAPP_TOKEN=your-token                 # Optional: default WhatsApp token
WHATSAPP_PHONE_NUMBER_ID=your-id         # Optional: default phone ID
WHATSAPP_VERIFY_TOKEN=dev-verify-token   # Webhook verification
```

For production with Turso:
```env
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-turso-token
```

### PropertyGuru Scraping Considerations

- Puppeteer is heavy - may fail in serverless environments
- Always implement fallback data generation
- Respect robots.txt and rate limits
- Current implementation includes realistic fallbacks based on URL analysis
- Consider caching scraped data to reduce scraping frequency

### WhatsApp Webhook Setup

- Webhook URL: `https://yourdomain.com/api/whatsapp/webhook`
- Must be HTTPS in production
- Set `WHATSAPP_VERIFY_TOKEN` for webhook verification
- Phone number ID must match encrypted user credentials in database
- Test locally with ngrok: `npx ngrok http 3000`

## Common Development Tasks

### Adding a New Property Field

1. Update schema in `src/lib/db/schema.ts`
2. Run `npm run db:generate` to create migration
3. Run `npm run db:push` to apply changes
4. Update TypeScript types (automatically inferred)
5. Update UI components and API routes as needed

### Adding a New API Endpoint

1. Create route file: `src/app/api/[name]/route.ts`
2. Export `GET`, `POST`, `PUT`, `DELETE` functions as needed
3. Use `NextResponse.json()` for responses
4. Import and use database via `db` from `src/lib/db`
5. Handle errors with try/catch and return appropriate status codes

### Modifying WhatsApp Screening Questions

1. Edit `QUESTIONS` array in `src/app/api/whatsapp/webhook/route.ts`
2. Update `calculateScore()` function to match new questions
3. Update client schema if adding new fields to capture
4. Test with WhatsApp Business API sandbox

## Production Deployment Checklist

- [ ] Set strong `BETTER_AUTH_SECRET`
- [ ] Configure Turso database (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`)
- [ ] Set production `BETTER_AUTH_URL`
- [ ] Update WhatsApp webhook URL to production domain
- [ ] Generate secure `ENCRYPTION_KEY` (32+ bytes, hex-encoded)
- [ ] Test webhook delivery with Meta's webhook tester
- [ ] Run database migrations: `npm run db:migrate`
- [ ] Build application: `npm run build`
- [ ] Configure HTTPS/SSL
- [ ] Set up monitoring for WhatsApp webhook failures

## Project-Specific Conventions

- Use Next.js 15 App Router conventions (server/client components)
- Client components must have `"use client"` directive
- API routes use `NextResponse` from `next/server`
- Date/time stored as ISO strings in database
- Currency amounts stored as integers (SGD cents for precision, but currently stored as dollars)
- Phone numbers stored with country code (e.g., `+6591234567`)
- Use `createId()` from `@paralleldrive/cuid2` for generating unique IDs
- All timestamps use ISO 8601 format
- Scoring system: 0-100 integer scores for prospect fit
