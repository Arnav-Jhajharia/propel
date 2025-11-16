# 🚀 Production Deployment Guide (Fast Track)

## Prerequisites (5 minutes)
- GitHub account
- Vercel account (free tier works)
- Credit card for Clerk (free tier available)

## 🎯 **FASTEST PATH: Deploy in 30 Minutes**

---

## Step 1: Database Setup (5 minutes)

### Option A: Turso (Recommended - Easiest)

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create production database
turso db create agent-rental-prod

# Get credentials (save these!)
turso db show agent-rental-prod --url
turso db tokens create agent-rental-prod
```

**Save outputs:**
- `DATABASE_URL`: The URL from `turso db show`
- `DATABASE_AUTH_TOKEN`: The token from `turso db tokens create`

### Option B: Neon PostgreSQL (Alternative)

1. Go to https://neon.tech
2. Create account → New Project
3. Copy the `DATABASE_URL` connection string

---

## Step 2: Authentication Setup (5 minutes)

### Clerk Setup
1. Go to https://dashboard.clerk.com
2. Click **"Create Application"**
3. Choose **"Email"** and **"Google"** (recommended)
4. Copy these keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

---

## Step 3: OpenAI API Key (2 minutes)

1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Copy `OPENAI_API_KEY`

---

## Step 4: Deploy to Vercel (10 minutes)

### A. Push to GitHub (if not already)
```bash
# Initialize git (if needed)
git add .
git commit -m "Production ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### B. Deploy on Vercel
1. Go to https://vercel.com
2. Click **"Import Project"**
3. Select your GitHub repository
4. Configure **Environment Variables**:

```env
# Database (Turso)
DATABASE_URL=libsql://your-database.turso.io
DATABASE_AUTH_TOKEN=eyJhbGc...your-token

# Encryption (generate: openssl rand -hex 32)
ENCRYPTION_KEY=your-generated-64-character-hex-string

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# WhatsApp (add when ready)
WHATSAPP_VERIFY_TOKEN=your-verify-token
```

5. Click **"Deploy"**

---

## Step 5: Database Migration (5 minutes)

After Vercel deploys, run migrations:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Pull environment variables
vercel env pull .env.local

# Run migration
npm run db:push

# Seed database (optional)
npm run db:seed
```

**OR** use Vercel's terminal:
1. Go to your project → **Settings** → **Functions**
2. Click **"Terminal"** in a deployment
3. Run: `npm run db:push && npm run db:seed`

---

## Step 6: Configure Clerk for Production (3 minutes)

1. Go to Clerk Dashboard → Your App
2. Navigate to **"Settings"** → **"Domains"**
3. Add your Vercel domain: `your-app.vercel.app`
4. Update **"Home URL"**: `https://your-app.vercel.app`
5. Save changes

---

## Step 7: LangGraph Agents (Choose Your Path)

Your app has 3 LangGraph agents that need deployment. **Choose one option:**

### Option A: Keep Current Setup (Recommended for MVP) ✅
**No additional setup needed!** Your agents already run in Next.js API routes.
- Deploy to Vercel as-is
- Works immediately
- Monitor function timeouts in Vercel dashboard
- If timeouts occur, upgrade to Vercel Pro ($20/mo) or move to Option B

### Option B: LangGraph Cloud (Best for Scale) 🚀
```bash
# Install CLI
npm install -g @langchain/langgraph-cli

# Login (sign up at smith.langchain.com)
langgraph login

# Deploy agents
langgraph deploy
```

Then add to Vercel environment variables:
```env
LANGGRAPH_API_URL=https://your-deployment.langchain.app
LANGGRAPH_API_KEY=your-langsmith-api-key
```

**See `LANGGRAPH_PRODUCTION.md` for detailed instructions.**

---

## Step 8: WhatsApp Setup (Optional - Later)

1. Go to https://developers.facebook.com
2. Create Business App
3. Add WhatsApp Product
4. Get credentials and add to Vercel environment variables:
   - `WHATSAPP_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_VERIFY_TOKEN`

---

## ✅ Post-Deployment Checklist

- [ ] Visit your Vercel URL
- [ ] Sign up with Clerk authentication
- [ ] Test creating a property
- [ ] Test sending a message (triggers LangGraph agent)
- [ ] Check agent responses work correctly
- [ ] Check database in Turso/Neon dashboard
- [ ] Monitor function execution times in Vercel
- [ ] Verify WhatsApp webhook (if configured)

---

## 🔒 Security Checklist

### Essential (Do Now)
- [ ] Generate strong `ENCRYPTION_KEY`: `openssl rand -hex 32`
- [ ] Use production Clerk keys (live_)
- [ ] Enable HTTPS (Vercel does this automatically)
- [ ] Add `.env.local` to `.gitignore` (already done)

### Recommended (Do Soon)
- [ ] Set up rate limiting (via Vercel Pro or Cloudflare)
- [ ] Configure CORS for API routes
- [ ] Enable Clerk MFA for your admin account
- [ ] Set up monitoring (Vercel Analytics + Sentry)
- [ ] Configure CSP headers in `next.config.ts`

---

## 📊 Monitoring & Maintenance

### Vercel Dashboard
- Monitor builds: https://vercel.com/dashboard
- Check logs: Project → Deployments → Logs
- Analytics: Project → Analytics

### Database
- **Turso**: `turso db shell agent-rental-prod`
- View in Drizzle Studio locally with production DB:
  ```bash
  # Pull production env vars
  vercel env pull .env.local
  # View DB
  npm run db:studio
  ```

### Logs
```bash
# Stream production logs
vercel logs --follow

# View specific deployment
vercel logs [deployment-url]
```

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Test build locally
npm run build
npm run start
```

### Database Connection Issues
```bash
# Test Turso connection
turso db shell agent-rental-prod

# Verify environment variables in Vercel
vercel env ls
```

### Authentication Issues
- Verify Clerk domain matches Vercel URL
- Check `NEXT_PUBLIC_CLERK_*` vars are in Vercel
- Clear browser cookies and retry

### API Routes 500 Errors
- Check Vercel logs: `vercel logs --follow`
- Verify all environment variables are set
- Check database migrations ran successfully

---

## 🚀 Advanced: Custom Domain (Optional)

1. Buy domain (Namecheap, Google Domains, etc.)
2. In Vercel: Project → **Settings** → **Domains**
3. Add your domain
4. Update DNS records (Vercel provides instructions)
5. Update Clerk domains accordingly

---

## 💰 Cost Estimate (Monthly)

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Vercel** | ✅ Free (Hobby) | $20/mo (Pro) |
| **Turso** | ✅ 500MB free | $5/mo+ |
| **Clerk** | ✅ 10k MAU | $25/mo+ |
| **OpenAI** | ❌ Pay per use | ~$10-50/mo |
| **Total** | ~$10-50/mo | ~$60-100/mo |

---

## 🎉 You're Live!

Your production URL: `https://your-app.vercel.app`

**Next Steps:**
1. Share with users
2. Set up analytics
3. Configure monitoring alerts
4. Plan scaling strategy

---

## 📞 Quick Commands Reference

```bash
# Deploy
vercel --prod

# View logs
vercel logs --follow

# Manage env vars
vercel env add
vercel env ls
vercel env pull

# Database
turso db shell agent-rental-prod
npm run db:studio

# Rollback deployment
vercel rollback
```

---

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Clerk Docs**: https://clerk.com/docs
- **Turso Docs**: https://docs.turso.tech
- **Next.js Docs**: https://nextjs.org/docs

