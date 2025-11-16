# 🔍 Screening Message Not Showing - Debug Guide

## Issue Description

The bot is not sending the custom screening message properly, and there's a disparity between the questions shown on the screen and what the bot actually sends.

---

## 🚨 What I've Added

### **Comprehensive Debug Logging**

I've added detailed console.log statements throughout the flow:

1. **API Endpoint** (`/api/lead-agent/route.ts`)
   - Logs userId, message, persisted state
   - Shows what state is being loaded
   - Shows what reply the bot generates

2. **runLeadAgent** (`leadGraph.ts`)
   - Logs entry point with all inputs
   - Shows loaded automation config
   - Shows screening settings from config
   - Shows initial state passed to graph
   - Shows result from graph

3. **Router Node** (`leadGraph.ts`)
   - Logs screening check
   - Shows if screening is automated
   - Shows if screening is complete
   - Shows routing decisions

4. **prompt_screening Node** (`leadGraph.ts`)
   - Logs loaded config
   - Shows if custom questions found
   - Shows what questions will be sent
   - Shows final reply that will be sent

---

## 📋 How to Debug

### **Step 1: Open Terminal**
```bash
cd /Users/i3dlab/Documents/Agent-Rental-Dashboard_-codebase
npm run dev
```

### **Step 2: Test the Bot**
1. Go to `/bot-settings`
2. Configure screening questions
3. Click "Save Configuration"
4. Click "Try it out"
5. Send a message

### **Step 3: Watch Console Output**

You should see logs in this order:

```
[lead-agent] ===== REQUEST DEBUG =====
[lead-agent] userId: user_xxx
[lead-agent] messagePreview: hi
[lead-agent] hasPersistedState: false
...

[runLeadAgent] ===== ENTRY POINT =====
[runLeadAgent] userId: user_xxx
[runLeadAgent] message: hi
...

[runLeadAgent] ===== LOADED CONFIG =====
[runLeadAgent] automatedPhases: ['screening', 'property_qa', ...]
[runLeadAgent] Has screening settings? true
[runLeadAgent] Screening config: {
  "openingMessage": "Your custom message",
  "questions": [
    {"id": "1", "label": "...", "prompt": "..."},
    ...
  ]
}
...

[router] ===== SCREENING CHECK =====
[router] screeningComplete: false
[router] screeningAutomated: true
[router] hasPropertyId: false
[router] hasUrl: false
...

[router] → Going to prompt_screening (start screening)

[prompt_screening] ===== DEBUG =====
[prompt_screening] Loaded config: {...}
[prompt_screening] ✅ Using custom questions from config: [...]
...

[prompt_screening] ===== FINAL OUTPUT =====
[prompt_screening] Opening: Your custom message
[prompt_screening] Questions: 1) Question 1\n2) Question 2...
[prompt_screening] Full reply: Your custom message\n\n1) Question 1\n2) Question 2...
```

---

## 🐛 Common Issues & Solutions

### **Issue 1: Config Not Saved**

**Symptom:**
```
[runLeadAgent] Has screening settings? false
```

**Solution:**
1. Go to `/bot-settings`
2. Make sure you're on "Screening" tab
3. Add questions
4. Click "Save Configuration"
5. Check browser Network tab - should see POST to `/api/bot-config`
6. Check response - should be 200 OK

**Verify Saved:**
- Go to `/api/bot-config` in browser
- Should see your config in response

### **Issue 2: Config Not Loading**

**Symptom:**
```
[botConfigLoader] No config found, using defaults
```

**Solution:**
- Check database: `local.db` or Turso
- Table: `bot_configs`
- Should have row with `userId` matching your user
- `isActive` should be `true`
- `parsedConfig` should contain your settings

### **Issue 3: Screening Not Automated**

**Symptom:**
```
[router] screeningAutomated: false
```

**Solution:**
- In `/bot-settings`, make sure "Screening" phase is **enabled** (not disabled)
- Check the toggle on the left sidebar
- The node should be **orange/active**, not **grey**

### **Issue 4: Missing Property**

**Symptom:**
```
[router] hasPropertyId: false
[router] hasUrl: false
[router] ⚠️ No property or URL - asking for link
```

**Solution:**
- The bot requires a property URL before starting screening
- Share a PropertyGuru or 99.co link first
- Example: "I'm interested in https://www.propertyguru.com.sg/listing/12345"

### **Issue 5: Questions Mismatch**

**Symptom:**
- Questions shown in UI don't match what bot sends

**Possible Causes:**
1. **Config not saved** - Click "Save Configuration" button
2. **Browser cache** - Hard refresh (Cmd+Shift+R)
3. **Multiple configs** - Check `/api/bot-config` for duplicates
4. **Wrong scope** - Make sure it's "global" scope

**Fix:**
```bash
# In bot-settings page console
localStorage.clear()
location.reload()
```

---

## 🔍 Step-by-Step Debug Process

### **1. Verify Config is Saved**

```bash
# In browser console or terminal
curl http://localhost:3000/api/bot-config
```

Should return:
```json
{
  "configs": [
    {
      "id": "...",
      "parsedConfig": {
        "automatedPhases": ["screening", ...],
        "phaseSettings": {
          "screening": {
            "openingMessage": "...",
            "questions": [...]
          }
        }
      }
    }
  ]
}
```

### **2. Test Bot with Debugging**

Send a message and watch terminal logs:

**Expected Flow:**
1. ✅ `[lead-agent]` logs show request
2. ✅ `[runLeadAgent]` shows config loaded with screening settings
3. ✅ `[router]` shows screening is automated and not complete
4. ✅ `[router]` routes to `prompt_screening`
5. ✅ `[prompt_screening]` uses custom questions
6. ✅ `[prompt_screening]` builds reply with all questions
7. ✅ Bot sends the complete message

**If Flow Breaks:**
- Look at the last successful log
- Check what happened next
- Error message should indicate the issue

### **3. Common Terminal Output Issues**

**Problem: "No custom questions found"**
```
[prompt_screening] ⚠️ No custom questions found, loading defaults
```
→ Config not saved or not loading properly

**Problem: "Screening not automated"**
```
[router] screeningAutomated: false
```
→ Phase is disabled in UI

**Problem: "No property or URL"**
```
[router] ⚠️ No property or URL - asking for link
```
→ Need to share property URL first

---

## 🧪 Quick Test

**Minimal Test Case:**

1. **Configure:**
   ```
   - Go to /bot-settings
   - Click "Screening"
   - Opening: "Test message"
   - Add 1 question: "What's your budget?"
   - Save
   ```

2. **Test:**
   ```
   - Click "Try it out"
   - Send: "hi"
   ```

3. **Expected Terminal Output:**
   ```
   [prompt_screening] Opening: Test message
   [prompt_screening] Questions: 1) What's your budget?
   [prompt_screening] Full reply: Test message\n\n1) What's your budget?
   ```

4. **Expected Bot Reply:**
   ```
   Test message

   1) What's your budget?
   ```

---

## 📊 Config Structure Check

Your saved config should look like this:

```json
{
  "automatedPhases": ["screening", "property_qa", "viewing_proposal"],
  "maxPhase": "full",
  "requireApproval": {
    "beforeScreening": false,
    "beforePropertyAdd": false,
    "beforeViewingProposal": false,
    "beforeViewingBooking": false
  },
  "behavior": {
    "tone": "professional",
    "responseSpeed": "instant",
    "autoFollowUp": false
  },
  "phaseSettings": {
    "screening": {
      "openingMessage": "Great! Let me ask you a few quick questions.",
      "questions": [
        {
          "id": "1",
          "label": "Monthly Budget",
          "prompt": "What's your monthly budget?"
        },
        {
          "id": "2",
          "label": "Move-in Date",
          "prompt": "When do you need to move in?"
        }
        // ... more questions
      ]
    }
  }
}
```

**Key Points:**
- ✅ `automatedPhases` must include `"screening"`
- ✅ `phaseSettings.screening.questions` must be an array
- ✅ Each question must have `id`, `label`, and `prompt`

---

## 🎯 Next Steps

1. **Run the app**: `npm run dev`
2. **Test the bot**: Go to `/bot-settings` → "Try it out"
3. **Watch the terminal** for debug logs
4. **Copy the logs** and look for errors
5. **Check which step fails** using the logs above

---

## 💡 If Still Not Working

**Share these logs with me:**

1. **Config from API:**
   ```bash
   curl http://localhost:3000/api/bot-config
   ```

2. **Terminal output** when testing bot (copy the full output)

3. **Browser console errors** (F12 → Console tab)

With these logs, I can pinpoint exactly where the issue is!

---

**The debugging is now comprehensive - every step is logged! Test it and share the terminal output if it still doesn't work.** 🔍

