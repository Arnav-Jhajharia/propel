# WhatsApp Embedded Signup Setup Guide

This guide will help you configure WhatsApp Embedded Signup for your Agent Rental Dashboard, allowing rental agents to connect their WhatsApp Business accounts with a single click.

## Overview

**What is Embedded Signup?**
- One-click OAuth flow for WhatsApp Business API
- No manual token copying required
- Agents can onboard themselves in 2-3 minutes
- Automatic credential encryption and storage
- Long-lived access tokens (60+ days)

## Prerequisites

1. A Meta Developer account
2. A Facebook Business Manager account
3. Your application deployed with HTTPS (for production) or ngrok (for local testing)

## Step 1: Create Meta App

### 1.1 Create App in Meta Developer Console

1. Go to [Meta Developer Console](https://developers.facebook.com/)
2. Click **"Create App"**
3. Select app type: **"Business"**
4. Fill in details:
   - **App Name**: "Agent Rental Dashboard" (or your app name)
   - **App Contact Email**: your-email@example.com
   - **Business Account**: Select or create a Business Manager account
5. Click **"Create App"**

### 1.2 Add WhatsApp Product

1. In your app dashboard, scroll to **"Add products to your app"**
2. Find **"WhatsApp"** and click **"Set Up"**
3. Select or create a **WhatsApp Business Account (WABA)**

### 1.3 Get Your App ID

1. In the app dashboard, go to **Settings → Basic**
2. Copy your **App ID** (you'll need this)
3. Copy your **App Secret** (click "Show" to reveal it)

## Step 2: Configure Facebook Login for Business

### 2.1 Add Facebook Login Product

1. In your app dashboard, find **"Facebook Login for Business"**
2. Click **"Set Up"**

### 2.2 Create Configuration

1. Go to **Facebook Login for Business → Configurations**
2. Click **"Create Configuration"**
3. Configure the settings:
   - **Assets**: Select **"WhatsApp accounts"**
   - **Permissions**: Check **"whatsapp_business_management"** and **"whatsapp_business_messaging"**
4. Click **"Create Configuration"**
5. **Copy the Configuration ID** (starts with a number, e.g., `1234567890123456`)

### 2.3 Configure OAuth Settings

1. Still in **Facebook Login for Business**, go to **Settings**
2. Set **Valid OAuth Redirect URIs**:
   ```
   http://localhost:3000/api/whatsapp/oauth/callback
   https://yourdomain.com/api/whatsapp/oauth/callback
   ```
   (Add both local and production URLs)

3. Set **Allowed Domains for the JavaScript SDK**:
   ```
   localhost
   yourdomain.com
   ```

4. Click **"Save Changes"**

## Step 3: Configure Environment Variables

### 3.1 Update .env File

Open your `.env` file and update these values:

```env
# WhatsApp Embedded Signup (OAuth) - Server Side
META_APP_ID=your-app-id-here
META_APP_SECRET=your-app-secret-here
META_CONFIGURATION_ID=your-configuration-id-here
META_OAUTH_REDIRECT_URI=http://localhost:3000/api/whatsapp/oauth/callback

# WhatsApp Embedded Signup - Client Side (Public)
NEXT_PUBLIC_META_APP_ID=your-app-id-here
NEXT_PUBLIC_META_CONFIGURATION_ID=your-configuration-id-here
NEXT_PUBLIC_META_OAUTH_REDIRECT_URI=http://localhost:3000/api/whatsapp/oauth/callback
```

**Replace:**
- `your-app-id-here` with your App ID from Step 1.3
- `your-app-secret-here` with your App Secret from Step 1.3
- `your-configuration-id-here` with your Configuration ID from Step 2.2

**For Production:**
- Change `http://localhost:3000` to your production domain
- Keep the same path: `/api/whatsapp/oauth/callback`

### 3.2 Restart Development Server

After updating .env:
```bash
npm run dev
```

## Step 4: Test the Flow (Local Development)

### 4.1 Using ngrok for Local Testing

Since Meta requires HTTPS for OAuth, use ngrok:

```bash
npx ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok-free.app`

### 4.2 Update Redirect URIs

1. Go back to Meta Developer Console
2. Update **Valid OAuth Redirect URIs** to include:
   ```
   https://abc123.ngrok-free.app/api/whatsapp/oauth/callback
   ```

3. Update your `.env`:
   ```env
   META_OAUTH_REDIRECT_URI=https://abc123.ngrok-free.app/api/whatsapp/oauth/callback
   NEXT_PUBLIC_META_OAUTH_REDIRECT_URI=https://abc123.ngrok-free.app/api/whatsapp/oauth/callback
   ```

4. Restart your dev server

### 4.3 Test the Connection

1. Open your app via ngrok URL: `https://abc123.ngrok-free.app`
2. Log in to your agent account
3. Go to **Integrations** page
4. Under **Messaging** tab, you should see **"Quick Setup"**
5. Click **"Connect WhatsApp Business"**
6. You'll be redirected to Facebook to authorize
7. Log in with your Facebook account
8. Select or create a WhatsApp Business Account
9. Verify your phone number if needed
10. Grant permissions
11. You'll be redirected back to your app
12. You should see **"WhatsApp Connected"** confirmation

## Step 5: Verify Connection

After successful connection:

1. In your Integrations page, click **"Test Connection"**
2. You should see:
   - Phone number
   - Verified name
   - Quality rating
3. Check the database (via Drizzle Studio):
   ```bash
   npm run db:studio
   ```
4. Look at the `users` table - your credentials should be encrypted in:
   - `whatsapp_token`
   - `whatsapp_phone_id`
   - `whatsapp_business_account_id`
   - `whatsapp_connected_at`

## Step 6: Production Deployment

### 6.1 Update Environment Variables

In your production environment:

```env
# Production URLs
META_OAUTH_REDIRECT_URI=https://yourdomain.com/api/whatsapp/oauth/callback
NEXT_PUBLIC_META_OAUTH_REDIRECT_URI=https://yourdomain.com/api/whatsapp/oauth/callback

# Same credentials as development
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
META_CONFIGURATION_ID=your-configuration-id
```

### 6.2 Update Meta Dashboard

1. Add production URL to **Valid OAuth Redirect URIs**:
   ```
   https://yourdomain.com/api/whatsapp/oauth/callback
   ```

2. Add production domain to **Allowed Domains**:
   ```
   yourdomain.com
   ```

### 6.3 Submit App for Review (If Needed)

For production use beyond sandbox:
1. Complete **App Review** in Meta Developer Console
2. Provide privacy policy URL
3. Demonstrate your use case
4. Wait for approval (typically 1-3 business days)

## Troubleshooting

### "Sorry, something went wrong" Error

**Cause:** Redirect URI mismatch
**Solution:**
- Ensure redirect URI in .env exactly matches Meta dashboard
- Include protocol (http/https)
- No trailing slashes
- Path must be exact: `/api/whatsapp/oauth/callback`

### "No WhatsApp phone number found"

**Cause:** No phone number added to WABA
**Solution:**
1. Go to Meta Business Suite
2. Select your WhatsApp Business Account
3. Add and verify a phone number
4. Try connecting again

### "Invalid session" Error

**Cause:** Not logged in to your app
**Solution:**
- Log in to your agent account first
- Then try connecting WhatsApp

### OAuth Redirects to Wrong URL

**Cause:** Client-side env vars not loaded
**Solution:**
- Ensure env vars start with `NEXT_PUBLIC_`
- Restart dev server after changing .env
- Clear browser cache

### Token Exchange Failed

**Cause:** Invalid App Secret or App ID
**Solution:**
- Double-check APP_ID and APP_SECRET in .env
- Ensure no extra spaces or quotes
- Regenerate App Secret if needed

## Security Notes

1. **Never commit .env to git** - it contains secrets
2. **Encryption**: All tokens are encrypted using AES-256 before storage
3. **HTTPS Required**: Always use HTTPS in production
4. **App Secret**: Keep your META_APP_SECRET secure
5. **Rotate Tokens**: Consider rotating access tokens periodically

## Multi-Agent Support

Each agent can connect their own WhatsApp Business Account:
- Agent A connects → Gets Token A + Phone ID A
- Agent B connects → Gets Token B + Phone ID B
- Both use the same Meta app
- Credentials stored separately per user in database

## How It Works

```
1. Agent clicks "Connect WhatsApp Business"
   ↓
2. Frontend redirects to Meta OAuth:
   https://facebook.com/v21.0/dialog/oauth?client_id=...&config_id=...
   ↓
3. Agent logs in to Facebook and authorizes
   ↓
4. Meta redirects back with authorization code:
   http://yourapp.com/api/whatsapp/oauth/callback?code=ABC123
   ↓
5. Backend exchanges code for access token:
   POST https://graph.facebook.com/v21.0/oauth/access_token
   ↓
6. Backend fetches WABA ID and Phone Number ID from Meta
   ↓
7. Backend encrypts credentials and saves to database
   ↓
8. Agent redirected to /integrations with success message
```

## Need Help?

- **Meta Documentation**: https://developers.facebook.com/docs/whatsapp/embedded-signup
- **Common Issues**: Check the troubleshooting section above
- **Support**: Create an issue in the project repository

## Next Steps

After successful setup:
1. Test sending messages via WhatsApp
2. Configure webhook for incoming messages
3. Test the automated screening flow
4. Add more agents to your platform

---

**Created**: $(date +%Y-%m-%d)
**Version**: 1.0.0
