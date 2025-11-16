# ✅ Screening Questions Mismatch - FIXED

## 🐛 **The Problem**

The bot was NOT using your configured screening questions. Instead, it was generating conversational responses like:

> "Got the link! I see you've got a monthly budget of S$4500. I just need a bit more info: 1) Move-in date? 2) Employment status? 3) Number of occupants?"

This didn't match the questions you configured in the UI.

---

## 🔍 **Root Cause**

Three nodes were using the LLM (`leadReply()`) to generate conversational responses instead of using your exact configured questions:

1. **`tool_add_property_from_url`** - Generated conversational reply after adding property
2. **`detect_property`** - Generated conversational reply after detecting property
3. **`capture_screening_answers`** - Generated conversational reply for remaining questions

---

## ✅ **The Fix**

### **1. Fixed `capture_screening_answers` Node**

**Before:**
```typescript
// Used LLM to generate conversational response
const reply = await leadReply(state.history || [], state.message, { 
  remainingFields: remaining,
  partialAnswers: merged 
});
```

**After:**
```typescript
// Use EXACT configured question prompts
const questionsList = remaining.map((f: any, idx: number) => 
  `${idx + 1}) ${f.prompt || f.label}`
).join('\n');

const reply = `Got it! Just a few more questions:\n\n${questionsList}`;
```

### **2. Fixed `tool_add_property_from_url` Node**

**Before:**
```typescript
// Generated conversational reply with screening questions embedded
const reply = await leadReply(state.history || [], state.message, ctx);
```

**After:**
```typescript
// Simple acknowledgment only
const reply = `Got the link! I'm looking at ${r.property.title}.`;
```

### **3. Fixed `detect_property` Node**

**Before:**
```typescript
// Generated conversational reply
const reply = await leadReply(state.history || [], state.message, { 
  property: r.property, 
  created: r.created 
});
```

**After:**
```typescript
// Simple acknowledgment only
const reply = `Got the link! I'm looking at ${r.property.title}.`;
```

### **4. Added Debug Logging**

Added comprehensive logging to track the flow:
- Planner conditional routing
- Screening check in router
- Configured questions loading
- Final reply generation

---

## 🎯 **How It Works Now**

### **Correct Flow:**

1. **User sends property URL**
   ```
   User: "interested in https://propertyguru.com/..."
   ```

2. **Graph → Planner → Router → detect_property**
   ```
   Bot: "Got the link! I'm looking at [Property Name]."
   ```
   *(State saved with propertyId)*

3. **User sends next message**
   ```
   User: "yes"
   ```

4. **Graph → Planner (screeningComplete = false) → Router → prompt_screening**
   ```
   Bot: "Great! Let me ask you a few quick questions.
   
   1) What's your monthly budget?
   2) When do you need to move in?
   3) What's your employment status?
   4) How many people will be living here?
   5) What's your income?"
   ```
   ✅ **Uses YOUR EXACT configured questions!**

5. **User answers some questions**
   ```
   User: "$4500, July, Full-time"
   ```

6. **Graph → Router → capture_screening_answers**
   ```
   Bot: "Got it! (Monthly Budget: $4500, Move-in Date: July, Employment Status: Full-time)
   
   Just a few more questions:
   
   1) How many people will be living here?
   2) What's your income?"
   ```
   ✅ **Still uses YOUR EXACT configured questions!**

---

## 🧪 **Test It Now**

### **Step 1: Configure Questions**
1. Go to `/bot-settings`
2. Click "Screening"
3. Set opening message: "Hi! Quick questions before we proceed."
4. Add questions:
   - "What's your budget?"
   - "When's your move-in date?"
5. Click "Save Configuration"

### **Step 2: Test**
1. Click "Try it out"
2. Send: "hi"
3. Bot should ask for property link
4. Send: "https://www.propertyguru.com.sg/listing/for-rent-double-bay-residences-24920684"
5. Bot should acknowledge: "Got the link! I'm looking at [Property Name]."
6. Send: "ok"
7. Bot should send: **YOUR EXACT QUESTIONS**:
   ```
   Hi! Quick questions before we proceed.

   1) What's your budget?
   2) When's your move-in date?
   ```

---

## 📊 **What Changed**

| Node | Before | After |
|------|--------|-------|
| `tool_add_property_from_url` | LLM-generated conversational reply | Simple acknowledgment |
| `detect_property` | LLM-generated conversational reply | Simple acknowledgment |
| `capture_screening_answers` | LLM-generated questions | Exact configured questions |
| `prompt_screening` | ✅ Already used exact questions | ✅ No change needed |

---

## 🎉 **Result**

✅ Bot now uses **EXACT questions** you configure in the UI  
✅ No more LLM-generated conversational variations  
✅ Questions match perfectly between UI and bot behavior  
✅ Remaining questions use same format as initial questions  

---

## 📝 **Debug Logs to Watch**

When testing, watch for these logs in terminal:

```bash
[planner conditional] screeningComplete: false
[planner conditional] → Routing to router (screening not complete)

[router] ===== SCREENING CHECK =====
[router] screeningComplete: false
[router] screeningAutomated: true
[router] → Going to prompt_screening (start screening)

[prompt_screening] ===== FINAL OUTPUT =====
[prompt_screening] Opening: Hi! Quick questions before we proceed.
[prompt_screening] Questions: 1) What's your budget?
2) When's your move-in date?
[prompt_screening] Full reply: Hi! Quick questions before we proceed.

1) What's your budget?
2) When's your move-in date?
```

✅ **If you see these logs, the bot is using your configured questions!**

---

## 🚀 **Try It Now!**

The fixes are complete. Test the bot with your configured questions and you should see **exact matches** between what you configured and what the bot sends!

**No more disparity!** 🎊

