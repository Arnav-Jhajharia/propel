# 🤖 LangGraph Production Deployment Guide

## Overview

Your app has **3 LangGraph agents** that need production deployment:
1. **Lead Agent** - Handles property viewings and lead interactions
2. **Main Agent** - General agent tasks and property management  
3. **Setup Agent** - Agent onboarding and configuration

---

## 🚀 **OPTION 1: LangGraph Cloud (Recommended - Fastest)**

### Why LangGraph Cloud?
- ✅ Fully managed hosting
- ✅ Automatic scaling
- ✅ Built-in monitoring & debugging
- ✅ Streaming support
- ✅ Production-ready in 10 minutes
- 💰 Free tier available

### Setup (10 minutes)

#### 1. Install LangGraph CLI
```bash
npm install -g @langchain/langgraph-cli
```

#### 2. Login to LangSmith
```bash
langgraph login
```

You'll need a LangSmith account (free tier available):
- Sign up: https://smith.langchain.com

#### 3. Configure for Production

Create `langgraph.prod.json`:
```json
{
  "graphs": {
    "lead": "./src/agent/studio/lead.ts:graph",
    "agent": "./src/agent/studio/agent.ts:graph",
    "setup": "./src/agent/studio/setup.ts:graph"
  },
  "env": ".env.production",
  "python_version": "3.11",
  "dependencies": ["@langchain/langgraph", "@langchain/openai", "@langchain/core"]
}
```

#### 4. Create Production Environment File

Create `.env.production`:
```bash
OPENAI_API_KEY=sk-proj-...
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=eyJ...
ENCRYPTION_KEY=your-key
```

#### 5. Deploy to LangGraph Cloud
```bash
# Deploy all graphs
langgraph deploy --config langgraph.prod.json

# Deploy specific graph
langgraph deploy --config langgraph.prod.json --graph lead
```

#### 6. Get Deployment URLs
After deployment, you'll get URLs like:
```
https://your-deployment.langchain.app/lead/invoke
https://your-deployment.langchain.app/agent/invoke
https://your-deployment.langchain.app/setup/invoke
```

#### 7. Update Next.js API Routes

Add to your `.env.local` and Vercel environment variables:
```bash
LANGGRAPH_API_URL=https://your-deployment.langchain.app
LANGGRAPH_API_KEY=your-langsmith-api-key
```

Update your API route (e.g., `src/app/api/lead-agent/route.ts`):

```typescript
// Instead of running the graph locally, call the cloud API
const response = await fetch(`${process.env.LANGGRAPH_API_URL}/lead/invoke`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.LANGGRAPH_API_KEY}`
  },
  body: JSON.stringify({
    input: {
      messages: [{ role: 'user', content: userMessage }],
      userId,
      propertyId
    }
  })
});
```

### Monitoring & Debugging

Access LangSmith dashboard:
```
https://smith.langchain.com
```

View:
- Agent traces
- Token usage
- Latency metrics
- Error logs
- Cost tracking

### Cost Estimate
- **Free Tier**: 5k traces/month
- **Plus**: $39/mo - 50k traces
- **Enterprise**: Custom pricing

---

## 🏗️ **OPTION 2: Self-Hosted (Full Control)**

### Architecture Options

#### A. Deploy with Next.js on Vercel (Simple)

**Pros:**
- Single deployment
- No extra infrastructure
- Easy to manage

**Cons:**
- Serverless function limits (10s timeout on Hobby, 300s on Pro)
- Cold starts
- Memory limits

**Best for:** MVP, low-traffic applications

#### B. Separate Service (Recommended for Scale)

**Pros:**
- No timeout limits
- Better resource control
- Independent scaling
- WebSocket support

**Cons:**
- More complex setup
- Additional hosting costs

**Best for:** Production apps, high traffic

---

## 📦 **OPTION 2A: Deploy LangGraph with Next.js (Vercel)**

### Current Setup (Already Working Locally)

Your current setup in `src/app/api/lead-agent/route.ts` runs LangGraph directly:

```typescript
import { graph } from '@/agent/leadGraph';

export async function POST(req: Request) {
  const result = await graph.invoke(input);
  return Response.json(result);
}
```

### Production Considerations

1. **Timeout Limits**
   - Vercel Hobby: 10 seconds
   - Vercel Pro: 300 seconds
   
   Add timeout handling:
   ```typescript
   export const maxDuration = 300; // Pro plan only
   ```

2. **Memory Limits**
   - Vercel Hobby: 1024 MB
   - Vercel Pro: 3008 MB

3. **Streaming Responses** (Recommended)
   
   Update to use streaming:
   ```typescript
   export async function POST(req: Request) {
     const stream = await graph.stream(input);
     
     return new Response(
       new ReadableStream({
         async start(controller) {
           for await (const chunk of stream) {
             controller.enqueue(
               new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`)
             );
           }
           controller.close();
         }
       }),
       {
         headers: {
           'Content-Type': 'text/event-stream',
           'Cache-Control': 'no-cache',
           'Connection': 'keep-alive'
         }
       }
     );
   }
   ```

### Deploy Steps

1. **No changes needed!** Your current setup already works
2. Just deploy to Vercel as normal
3. Monitor function execution times in Vercel dashboard

---

## 🚢 **OPTION 2B: Separate LangGraph Service**

### Using Railway, Render, or Fly.io

#### 1. Create LangGraph Service Directory

```bash
mkdir langgraph-service
cd langgraph-service
```

#### 2. Create `package.json`
```json
{
  "name": "langgraph-service",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@langchain/langgraph": "^1.0.1",
    "@langchain/openai": "^1.0.0",
    "@langchain/core": "^1.0.1",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

#### 3. Create Express Server (`src/server.ts`)
```typescript
import express from 'express';
import cors from 'cors';
import { graph as leadGraph } from './agents/leadGraph.js';
import { graph as mainGraph } from './agents/graph.js';
import { graph as setupGraph } from './agents/setupGraph.js';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Lead agent endpoint
app.post('/lead/invoke', async (req, res) => {
  try {
    const result = await leadGraph.invoke(req.body.input);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Lead agent streaming endpoint
app.post('/lead/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await leadGraph.stream(req.body.input);
    for await (const chunk of stream) {
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

// Similar endpoints for other agents...

app.listen(PORT, () => {
  console.log(`LangGraph service running on port ${PORT}`);
});
```

#### 4. Copy Agent Files
```bash
cp -r ../src/agent ./src/agents
```

#### 5. Create Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 8000

CMD ["npm", "start"]
```

#### 6. Deploy to Railway (Easiest)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set OPENAI_API_KEY=sk-proj-...
railway variables set DATABASE_URL=libsql://...
railway variables set DATABASE_AUTH_TOKEN=eyJ...

# Deploy
railway up
```

You'll get a URL like: `https://langgraph-service.railway.app`

#### 7. Update Next.js to Use Service

In Vercel, add environment variable:
```bash
LANGGRAPH_SERVICE_URL=https://langgraph-service.railway.app
```

Update API routes:
```typescript
const response = await fetch(`${process.env.LANGGRAPH_SERVICE_URL}/lead/invoke`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ input })
});
```

---

## 🎯 **Quick Decision Matrix**

| Criteria | LangGraph Cloud | With Next.js | Separate Service |
|----------|----------------|--------------|------------------|
| **Setup Time** | 10 min ⚡ | 0 min ✅ | 30 min |
| **Cost (MVP)** | Free tier | Included | $5-10/mo |
| **Timeout Limits** | None ✅ | 10-300s | None ✅ |
| **Monitoring** | Built-in ✅ | Basic | Custom |
| **Scaling** | Auto ✅ | Auto | Manual |
| **Best For** | Production | Quick MVP | High Traffic |

---

## 📊 **Recommended Approach**

### Phase 1: MVP (Current)
✅ **Keep running LangGraph in Next.js API routes**
- Already working
- No extra infrastructure
- Perfect for testing

### Phase 2: Early Production
🚀 **Migrate to LangGraph Cloud**
- 10-minute setup
- Free tier sufficient for early users
- Built-in monitoring
- Easy rollback

### Phase 3: Scale
⚡ **Move to separate service if needed**
- When you exceed LangGraph Cloud limits
- Need custom infrastructure
- Require specific SLAs

---

## 🔧 **Quick Setup for LangGraph Cloud**

```bash
# 1. Install CLI
npm install -g @langchain/langgraph-cli

# 2. Login
langgraph login

# 3. Deploy
langgraph deploy

# 4. Get URL and update Vercel env vars
# Done! 🎉
```

---

## 💡 **Current Recommendation**

**For immediate production launch:**

1. **Keep current setup** (LangGraph in Next.js)
   - Works now
   - No extra config needed
   - Deploy to Vercel as-is

2. **Add streaming** (optional but recommended)
   - Better UX
   - Handles long responses
   - See example above

3. **Monitor function duration** in Vercel dashboard
   - If hitting limits → upgrade to Pro ($20/mo)
   - Or migrate to LangGraph Cloud

4. **Plan migration to LangGraph Cloud** when:
   - You have 100+ daily users
   - Functions timeout frequently
   - You need better debugging

---

## 📞 Resources

- **LangGraph Cloud**: https://langchain-ai.github.io/langgraph/cloud/
- **LangSmith**: https://smith.langchain.com
- **Railway**: https://railway.app
- **Render**: https://render.com
- **Fly.io**: https://fly.io

---

## ✅ Updated Deployment Checklist

Add to your deployment steps:

```bash
# After deploying Next.js to Vercel

# Option 1: Current setup (no changes)
# ✅ LangGraph runs in API routes - already deployed!

# Option 2: Migrate to LangGraph Cloud
langgraph login
langgraph deploy
# Add LANGGRAPH_API_URL to Vercel
# Update API routes to call cloud service

# Option 3: Separate service
cd langgraph-service
railway up
# Add LANGGRAPH_SERVICE_URL to Vercel
# Update API routes to call service
```

---

**Bottom Line:** Your current setup already works for production! Deploy as-is, then migrate to LangGraph Cloud when you need better scaling/monitoring. 🚀

