# 🚀 Automation Configuration - Quick Start

## ✅ What's Done

All automation settings in `/bot-settings` are now **fully connected** to your LangGraph bot!

---

## 🎯 How to Use

### **Step 1: Configure Settings**
```bash
1. Go to http://localhost:3000/bot-settings
2. Click each phase in the sidebar
3. Configure your settings
4. Click "Save Configuration"
```

### **Step 2: Test Your Bot**
```bash
1. Click "Try it out" button (top right)
2. Start a conversation
3. See your custom settings in action!
```

---

## 📋 What Each Panel Does

| Panel | What You Can Configure |
|-------|----------------------|
| **Screening** | Opening message, custom questions |
| **Q&A** | Auto-detect property, fact responses, fallback |
| **Viewing** | Auto-propose, auto-book, custom messages, duration |
| **Follow-up** | Enable/disable, max attempts, schedule, messages |
| **Approvals** | Require approval before key actions |
| **Fallback** | Custom messages for errors/edge cases |

---

## 🔥 Quick Examples

### **Example 1: Change Screening Questions**

**Before:**
```
Bot: "Great! Let me ask you a few quick questions."
```

**After (your custom):**
```
Bot: "Hi! Before we proceed, I need some info."
Bot: "1) What's your preferred location?"
Bot: "2) What's your move-in date?"
```

### **Example 2: Custom Viewing Messages**

**Before (LLM-generated):**
```
Bot: "Would you like to schedule a viewing?"
```

**After (your custom):**
```
Bot: "Ready to see this place? Here are some times:"
Bot: "• Saturday, 3:00 PM"
Bot: "• Sunday, 11:00 AM"

User: "Saturday"
Bot: "Booked! See you on Saturday, 3:00 PM!" ← Your custom message
```

### **Example 3: Approval Gates**

**Configure:**
- Enable "Require approval before booking viewing"

**Result:**
```
Bot detects booking request → pauses → shows fallback
"Thanks for the message! An agent will follow up shortly."
```

---

## 💡 Pro Tips

### **Test Different Configurations**
1. Save a configuration
2. Test in "Try it out"
3. Go back and adjust
4. Test again - changes apply instantly!

### **Use Custom Messages**
- Add `{slot}` in viewing confirmation to insert the time
- Keep messages conversational and friendly
- Test edge cases (no property, errors, etc.)

### **Layer Configurations**
- **Global** - applies to all conversations
- **Property-specific** - override for specific listings
- **Client-specific** - override for specific clients

Priority: Client > Property > Global

---

## 🎊 You're Ready!

Everything is connected and working. Just configure and test!

**Need help?** Check `AUTOMATION_INTEGRATION_COMPLETE.md` for detailed docs.

