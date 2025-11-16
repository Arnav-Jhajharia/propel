# 🎯 Multi-Lead Conversation System

## Overview

The system now supports **multiple isolated conversations** - one per lead/client. Each lead has their own persistent conversation history with full memory.

---

## 🏗️ How It Works

### **1. Lead Identification**
- Each lead is uniquely identified by their **phone number** (`clientPhone`)
- System stores conversation state in database keyed by: `userId` + `clientPhone`
- Each lead's conversation is completely isolated from others

### **2. Persistent Memory**
```typescript
// Stored per conversation:
{
  propertyId: "prop-123",
  screeningFields: [...],
  screeningAnswers: { "Monthly Budget": "$5000", ... },
  screeningComplete: true,
  offeredSlots: ["Saturday 3 PM", "Sunday 11 AM"]
}
```

### **3. Conversation Isolation**
- **Sarah Chen** (+65-9123-4567) = Her own conversation
- **John Tan** (+65-8234-5678) = Completely separate conversation
- **Maria Santos** (+65-9345-6789) = Another separate conversation

---

## 🧪 Testing Multi-Lead Conversations

### **Step 1: Open "Try Your Bot" Modal**
- Go to `/bot-settings`
- Click "Try it out"

### **Step 2: Select a Lead**
- Use the dropdown at the top to select a lead
- 5 demo leads available:
  - 👩‍💼 Sarah Chen
  - 👨‍💼 John Tan
  - 👩 Maria Santos
  - 👨 David Lee
  - 👩‍🎓 Emma Wong

### **Step 3: Test Conversation**
```
As Sarah Chen:
1. Send property URL
2. Complete screening questions
3. Ask about viewing times
```

### **Step 4: Switch Leads**
```
Switch to John Tan:
1. Send different property URL
2. Start fresh screening
3. This conversation is COMPLETELY separate from Sarah's
```

### **Step 5: Go Back to Sarah**
```
Switch back to Sarah Chen:
✅ Her screening is still complete
✅ Her property is still in context
✅ Her conversation history is intact
```

---

## 🎬 Real-World Usage

### **Via WhatsApp (Production)**
```typescript
// Incoming WhatsApp message
{
  from: "+65-9123-4567",  // Lead's actual phone
  message: "interested in the property"
}

// System automatically:
1. Identifies lead by phone number
2. Loads their conversation history
3. Continues where they left off
```

### **Via Dashboard (Testing)**
```typescript
// Testing with simulated leads
{
  clientPhone: "+65-9123-4567",  // Sarah Chen
  message: "I want to book a viewing"
}

// Bot remembers:
- Sarah completed screening
- Sarah was looking at Property X
- Sarah prefers weekend slots
```

---

## 📊 Database Structure

### **`conversation_states` Table**
```sql
CREATE TABLE conversation_states (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,           -- Your agent ID
  client_phone TEXT NOT NULL,      -- Lead's phone (unique identifier)
  property_id TEXT,
  answers TEXT,                    -- JSON: screening, property, slots
  status TEXT,                     -- 'active' or 'completed'
  created_at TEXT,
  updated_at TEXT,
  
  UNIQUE(user_id, client_phone)    -- One conversation per lead
);
```

---

## 🧹 Managing Conversations

### **Clear Specific Lead**
```typescript
// Clear just Sarah's conversation
await fetch('/api/clear-bot-state', {
  method: 'POST',
  body: JSON.stringify({ 
    clientPhone: '+65-9123-4567' 
  })
});
```

### **Clear All Conversations**
```typescript
// Clear all leads for this agent
await fetch('/api/clear-bot-state', {
  method: 'POST'
});
```

### **From UI**
- Click trash icon (🗑️) next to lead selector
- Clears that specific lead's conversation
- Starts fresh greeting

---

## 🚀 Production Deployment

### **WhatsApp Integration**
```typescript
// In webhook handler
const from = message.from;  // Lead's actual phone
const persistedState = await loadLeadState(userId, from);

const result = await runLeadAgent(
  { userId, message, history },
  persistedState  // Loads Sarah's state if it's Sarah
);

await saveLeadState(userId, from, result.state);
```

### **Multi-Agent Support**
```typescript
// Each agent sees only their leads
{
  userId: "agent-1",
  clientPhone: "+65-9123-4567"
}
// vs
{
  userId: "agent-2",
  clientPhone: "+65-9123-4567"  // Same phone, different agent
}
```

---

## 🎯 Benefits

1. **Full Conversation Context**
   - Bot remembers everything about each lead
   - No confusion between different conversations

2. **Scalable**
   - Handle unlimited leads simultaneously
   - Each conversation isolated in database

3. **Real-Time Testing**
   - Test multiple scenarios without interference
   - Switch between leads to verify isolation

4. **Production Ready**
   - Same system works for real WhatsApp messages
   - Phone number is natural unique identifier

---

## 💡 Use Cases

### **Testing Screening Flow**
```
Sarah: Budget $5000, moving tomorrow
John: Budget $8000, moving next month
Maria: Budget $3000, 6 months out

Each completes screening independently!
```

### **Testing Property-Specific Config**
```
Sarah → Property A (auto-book enabled)
John → Property B (auto-book disabled)

Different automation per property!
```

### **Testing Follow-Ups**
```
Sarah: Completed screening 2 days ago
Bot: "Hi Sarah! Just checking in - still interested?"

John: Completed screening today
Bot: (No follow-up yet)
```

---

## 🎉 Try It Now!

1. Go to `/bot-settings`
2. Click "Try it out"
3. Select different leads from dropdown
4. Start multiple conversations
5. Switch between leads - memory persists!

**Each lead maintains their own:**
- ✅ Screening progress
- ✅ Property context
- ✅ Answered questions
- ✅ Offered viewing slots
- ✅ Complete conversation history

🚀 **Perfect for testing AND production!**

