# Agent Rental Dashboard - Backend Setup

This document explains how to set up and use the real backend system for the Agent Rental Dashboard.

## 🏗️ Architecture Overview

The backend is built with:
- **Database**: SQLite with LibSQL (local) or Turso (cloud)
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Better Auth for user management
- **API**: Next.js API routes with proper authentication
- **WhatsApp Integration**: Business API for automated screening

## 📊 Database Schema

### Core Tables
- **users**: Agent accounts and authentication
- **properties**: Rental property listings
- **clients**: Prospective tenants
- **prospects**: Client-property matching with scores
- **conversations**: Communication threads
- **messages**: Individual messages in conversations

### Key Features
- **Prospect Scoring**: Automated 0-100 scoring based on budget, timing, and requirements
- **WhatsApp Integration**: Automated screening conversations
- **Real-time Updates**: Database-driven data instead of mock data
- **Authentication**: Secure API endpoints

## 🚀 Quick Setup

### 1. Run the Setup Script
```bash
npm run setup
```

This will:
- Install all dependencies
- Create `.env` file from template
- Generate database migrations
- Push schema to database
- Seed with sample data

### 2. Configure Environment Variables

Update your `.env` file with real credentials:

```env
# Database (choose one)
DATABASE_URL=file:./local.db  # Local SQLite
# DATABASE_URL=libsql://your-db.turso.io  # Turso cloud
# DATABASE_AUTH_TOKEN=your-turso-token

# WhatsApp Business API
WHATSAPP_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_VERIFY_TOKEN=dev-verify-token

# Authentication
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000

# Optional: Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Start Development Server
```bash
npm run dev
```

## 🗄️ Database Management

### Available Commands
```bash
# Generate migrations from schema changes
npm run db:generate

# Push schema changes to database
npm run db:push

# Open database studio (web interface)
npm run db:studio

# Seed database with sample data
npm run db:seed
```

### Database Studio
Access the web-based database interface:
```bash
npm run db:studio
```
Then open http://localhost:4983 in your browser.

## 🔐 Authentication

The system uses Better Auth with:
- Email/password authentication
- Optional Google OAuth
- Session-based authentication
- Protected API routes

### Adding Authentication to Pages
```tsx
import { useSession } from '@/lib/auth-client';

export default function ProtectedPage() {
  const { data: session, isPending } = useSession();
  
  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Please sign in</div>;
  
  return <div>Welcome, {session.user.name}!</div>;
}
```

## 📱 WhatsApp Integration

### Setup
1. Create a WhatsApp Business account
2. Set up a Meta Developer account
3. Create a WhatsApp Business API app
4. Get your access token and phone number ID
5. Configure webhook URL: `https://yourdomain.com/api/whatsapp/webhook`

### Features
- **Automated Screening**: 3-question survey for new clients
- **Prospect Scoring**: Automatic 0-100 scoring based on responses
- **Message Storage**: All conversations saved to database
- **Client Creation**: New clients auto-created from WhatsApp messages

## 🔄 API Endpoints

### Properties
- `GET /api/properties` - List all properties
- `POST /api/properties` - Create new property (PropertyGuru import)

### Clients
- `GET /api/clients/[id]` - Get client details with messages

### Prospects
- `GET /api/properties/[id]/prospects` - Get prospects for a property

### WhatsApp
- `POST /api/whatsapp/send` - Send WhatsApp message
- `GET/POST /api/whatsapp/webhook` - Webhook for incoming messages

### Authentication
- `GET/POST /api/auth/[...all]` - Better Auth endpoints

## 🧪 Testing the Backend

### 1. Check Database
```bash
npm run db:studio
```

### 2. Test API Endpoints
```bash
# Test properties endpoint
curl http://localhost:3000/api/properties

# Test WhatsApp send (requires valid credentials)
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"to": "6591234567", "text": "Test message"}'
```

### 3. Test WhatsApp Webhook
Use ngrok or similar to expose your local server:
```bash
npx ngrok http 3000
# Use the ngrok URL as your webhook URL in Meta Developer Console
```

## 🚀 Production Deployment

### Database
- Use Turso for production database
- Set `DATABASE_URL` to your Turso connection string
- Set `DATABASE_AUTH_TOKEN` for authentication

### Environment Variables
- Set all required environment variables
- Use strong secrets for `BETTER_AUTH_SECRET`
- Configure proper `BETTER_AUTH_URL` for your domain

### WhatsApp Webhook
- Update webhook URL to your production domain
- Ensure HTTPS is enabled
- Test webhook delivery

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check `DATABASE_URL` format
   - Ensure database file exists (for local SQLite)
   - Verify Turso credentials (for cloud)

2. **Authentication Not Working**
   - Check `BETTER_AUTH_SECRET` is set
   - Verify `BETTER_AUTH_URL` matches your domain
   - Clear browser cookies and try again

3. **WhatsApp Integration Issues**
   - Verify webhook URL is accessible
   - Check `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`
   - Test webhook with Meta's webhook tester

4. **API Errors**
   - Check authentication headers
   - Verify database schema is up to date
   - Check server logs for detailed errors

### Debug Mode
Set `NODE_ENV=development` for detailed error messages and logging.

## 📈 Next Steps

1. **PropertyGuru Integration**: Implement real scraping for property import
2. **Email Integration**: Add email communication tracking
3. **Calendar Integration**: Connect with Google Calendar or Calendly
4. **Analytics**: Add prospect conversion tracking
5. **Notifications**: Real-time updates for new prospects
6. **Mobile App**: React Native app for agents

## 🤝 Contributing

When making changes:
1. Update database schema in `src/lib/db/schema.ts`
2. Run `npm run db:generate` to create migrations
3. Test with `npm run db:push`
4. Update API routes as needed
5. Test all endpoints thoroughly

---

For more detailed information, check the individual API route files and database schema definitions.
