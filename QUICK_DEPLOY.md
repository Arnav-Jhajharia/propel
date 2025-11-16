# ⚡ Quick Deploy Reference Card

## 🎯 30-Minute Production Deployment

### Prerequisites
```bash
# Install required CLIs
npm i -g vercel
curl -sSfL https://get.tur.so/install.sh | bash
```

---

## 📋 Checklist (Copy & Run)

### 1. Database (Turso) - 5 min
```bash
turso auth login
turso db create agent-rental-prod
turso db show agent-rental-prod --url      # Save as DATABASE_URL
turso db tokens create agent-rental-prod   # Save as DATABASE_AUTH_TOKEN
```

### 2. Clerk Auth - 5 min
1. Visit: https://dashboard.clerk.com
2. Create app → Copy keys
3. Save: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`

### 3. OpenAI - 2 min
1. Visit: https://platform.openai.com/api-keys
2. Create key → Save as `OPENAI_API_KEY`

### 4. Generate Encryption Key - 1 min
```bash
openssl rand -hex 32
# Save as ENCRYPTION_KEY
```

### 5. Pre-Deploy Check - 2 min
```bash
./pre-deploy-checklist.sh
```

### 6. Deploy to Vercel - 10 min
```bash
# Push to GitHub
git add .
git commit -m "Production ready"
git push origin main

# Deploy via CLI (or use Vercel dashboard)
vercel
```

### 7. Add Environment Variables in Vercel
Go to: `https://vercel.com/[your-username]/[project]/settings/environment-variables`

**Copy-paste template:**
```
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=eyJ...
ENCRYPTION_KEY=your-64-char-hex
OPENAI_API_KEY=sk-proj-...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
WHATSAPP_VERIFY_TOKEN=your-verify-token
```

### 8. Migrate Database - 3 min
```bash
vercel env pull .env.local
npm run db:push
npm run db:seed  # Optional: seed sample data
```

### 9. Update Clerk Domain - 2 min
1. Clerk Dashboard → Settings → Domains
2. Add: `your-app.vercel.app`
3. Set Home URL: `https://your-app.vercel.app`

### 10. LangGraph Agents (Optional) - 5 min
**Current Setup:** Agents already run in your API routes ✅

**To scale later:**
```bash
npm i -g @langchain/langgraph-cli
langgraph login
langgraph deploy
# Add LANGGRAPH_API_URL to Vercel
```

See `LANGGRAPH_PRODUCTION.md` for details.

---

## 🔥 Emergency Rollback
```bash
vercel rollback
```

---

## 📊 Monitor Deployment
```bash
# Watch logs
vercel logs --follow

# Check status
vercel ls

# Inspect deployment
vercel inspect [deployment-url]
```

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | `npm run build` locally first |
| DB connection error | Verify `DATABASE_URL` in Vercel env vars |
| Auth redirect fails | Check Clerk domain matches Vercel URL |
| 500 errors | Check logs: `vercel logs --follow` |
| Missing env vars | `vercel env ls` |

---

## 💡 Pro Tips

### Fast Iteration
```bash
# Deploy preview (doesn't affect production)
vercel

# Deploy to production
vercel --prod
```

### Instant Env Updates
```bash
# Add env var
vercel env add VARIABLE_NAME production

# Pull latest env vars
vercel env pull
```

### Database Management
```bash
# Access production DB
turso db shell agent-rental-prod

# View DB locally (with prod credentials)
vercel env pull .env.local
npm run db:studio
```

---

## 📞 Emergency Contacts

- **Vercel Support**: https://vercel.com/support
- **Clerk Support**: https://clerk.com/support  
- **Turso Docs**: https://docs.turso.tech

---

## 🎉 Post-Deploy Verification

Visit your deployed app:
```
https://your-app.vercel.app
```

Test these:
- [ ] Homepage loads
- [ ] Sign up works
- [ ] Sign in works
- [ ] Dashboard displays
- [ ] API routes respond
- [ ] Database queries work
- [ ] LangGraph agents respond (send a test message)
- [ ] Check Vercel logs for any timeout issues

---

## 💰 Cost Calculator

| Service | Free Tier | Estimate |
|---------|-----------|----------|
| Vercel | Yes (Hobby) | $0-20/mo |
| Turso | 500MB free | $0-5/mo |
| Clerk | 10k MAU | $0-25/mo |
| OpenAI | Pay-per-use | $10-50/mo |
| **Total** | | **$10-100/mo** |

---

## 🚀 One-Liner Deploy (After setup)

```bash
git add . && git commit -m "Update" && git push && vercel --prod
```

---

## 📱 Mobile Testing

Test on mobile:
```
https://your-app.vercel.app
```

Or use Vercel's preview deployments:
```bash
vercel
# Use the preview URL on your phone
```

---

## ⚡ Performance Optimization

After deploying, optimize:
1. Enable Vercel Analytics (free)
2. Add caching headers (already in `vercel.json`)
3. Optimize images (Next.js does this automatically)
4. Enable edge functions for API routes (optional)
5. Set up CDN for assets (Vercel provides this)

---

**Time to production: ~30 minutes** ⏱️

**Your app is now LIVE!** 🎉

