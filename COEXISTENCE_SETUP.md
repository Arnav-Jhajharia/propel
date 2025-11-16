# WhatsApp Coexistence Setup Guide

## What is Coexistence?

Coexistence allows agents to use **BOTH** their WhatsApp Business app on their mobile phone AND your dashboard's API at the same time, with message history synced between both.

## Benefits

- ✅ Agent uses their **existing mobile number** (no separate business number needed)
- ✅ Agent can manually chat with clients 1:1 on their phone (free)
- ✅ Dashboard can send automated screening messages via API (paid)
- ✅ **Message history syncs bidirectionally**
  - Messages sent from agent's phone → appear in dashboard
  - Messages sent from dashboard → appear in agent's WhatsApp Business app
- ✅ Agent keeps full control and can respond manually anytime

## How It Works

### For the Agent:

1. Agent clicks "Connect WhatsApp Business" in integrations page
2. Agent is shown a QR code
3. Agent opens WhatsApp Business app on their phone
4. Agent receives a WhatsApp message with instructions to scan the QR code
5. Agent scans QR code with their WhatsApp Business app
6. Agent chooses whether to share message history (optional)
7. Done! Agent's phone is now connected

### For Clients:

Clients see **no difference**. They message the agent's WhatsApp Business number as usual.

### For Your Dashboard:

- Incoming messages from clients trigger automated screening flow
- Agents can also manually respond from their phone
- All messages (automated + manual) appear in dashboard conversation view

## What Changed in Code

### 1. Embedded Signup Updated (`src/app/integrations/page.tsx`)

Added Coexistence parameters to OAuth flow:

```javascript
const extras = {
  setup: {},
  featureType: "whatsapp_business_app_onboarding", // ← Enables Coexistence
  sessionInfoVersion: "3"
};
```

### 2. Webhook Handler Updated (`src/app/api/whatsapp/webhook/route.ts`)

Added handler for `smb_message_echoes` webhook field:

```javascript
const messageEchoes = value?.message_echoes ?? [];

// When agent sends a message from their phone:
for (const echo of messageEchoes) {
  // Save agent's message to database so it appears in dashboard
  await db.insert(messages).values({
    conversationId: conversation[0].id,
    from: 'agent',
    text: text.trim(),
    messageType: 'text',
    status: 'sent',
    whatsappMessageId: messageId,
  });
}
```

## Setup Steps (You Need to Do This)

### Step 1: Subscribe to Additional Webhook Fields

Go to Meta Developer Console → Your App → WhatsApp → Configuration → Webhooks

**Subscribe to these additional fields:**

- ✅ `messages` (already subscribed)
- ✅ `message_status` (already subscribed, optional)
- **NEW:** ✅ `smb_message_echoes` ← **Required for Coexistence**
- **NEW:** ✅ `smb_app_state_sync` ← For syncing contacts (optional but recommended)
- **NEW:** ✅ `history` ← For syncing past messages (optional but recommended)

**How to subscribe:**
1. In Webhook configuration, find "Webhook fields"
2. Check the boxes for the fields above
3. Click "Save"

### Step 2: Test Coexistence Onboarding

1. **Disconnect current setup** (if you already connected):
   - Open WhatsApp Business app on your phone
   - Go to Settings → Account → Business Platform
   - Click "Disconnect Account"

2. **Start fresh with Coexistence:**
   - Go to your integrations page: `https://635cb08cfb50.ngrok-free.app/integrations`
   - Click "Connect WhatsApp Business"
   - You should now see a **different screen** with option: "Connect an existing WhatsApp Business Account"
   - Enter your WhatsApp Business phone number
   - A QR code will appear
   - You'll receive a WhatsApp message on your phone
   - Tap the button in the message to scan the QR code
   - Choose whether to share message history
   - Complete the flow

3. **Verify connection:**
   - After completing, you should be redirected back with success message
   - Webhook should show your phone number ID is connected

### Step 3: Test Bidirectional Sync

**Test 1: Client → Agent (via API automated screening)**
1. Send a message from another WhatsApp account to your business number
2. Check that automated screening starts
3. Check your WhatsApp Business app - you should see the messages there too

**Test 2: Agent → Client (manual from phone)**
1. Open WhatsApp Business app on your phone
2. Manually send a message to a client
3. Check your dashboard at `/clients/[id]`
4. The message you sent from your phone should appear in the conversation history

**Test 3: Dashboard → Client (via API)**
1. (Future feature: manual send from dashboard)
2. Send a message via API
3. Check your WhatsApp Business app - message should appear there

## Important Notes

### Limitations with Coexistence

- **Throughput:** Phone numbers in Coexistence mode have a fixed limit of **20 messages per second** (to remain compatible with WhatsApp Business app)
- **Features disabled on phone:**
  - Disappearing messages (turned off for 1:1 chats)
  - View once messages (disabled)
  - Broadcast lists (become read-only)
  - Live location (disabled)
- **Linked devices:** Companion apps will be unlinked when you onboard, but you can re-link them after
- **Pricing:**
  - Messages sent from WhatsApp Business app: **FREE**
  - Messages sent via API (your dashboard): **Paid** (Cloud API pricing)

### Message History Synchronization

If agent chooses to share message history during onboarding:
- Last **6 months** of 1:1 chats are synced
- Media messages from last **14 days** include media asset IDs
- Group chats are NOT synced

You have **24 hours** to complete message history sync after onboarding, otherwise agent must reconnect.

## Troubleshooting

### "No user found for phone number ID" Error

**Problem:** Webhook receives messages but can't find the agent user.

**Solution:** This happens when:
1. Phone number ID in webhook doesn't match encrypted phone ID in database
2. Agent hasn't completed OAuth connection yet

**Fix:**
- Make sure agent completed the Embedded Signup flow successfully
- Check database: `users` table should have `whatsappPhoneId`, `whatsappToken`, and `whatsappConnectedAt` populated
- The `whatsappPhoneId` in database should match the `phone_number_id` in webhook payload (both are encrypted in DB)

### QR Code Not Appearing

**Problem:** OAuth flow doesn't show QR code option.

**Solution:**
- Make sure you added `featureType: "whatsapp_business_app_onboarding"` to extras (already done)
- Clear browser cache and try again
- Make sure your Meta app has WhatsApp Business product added
- Check that you're using a WhatsApp Business app (not regular WhatsApp) version 2.24.17 or higher

### Messages Not Syncing from Phone

**Problem:** Agent sends message from phone, but it doesn't appear in dashboard.

**Solution:**
- Check that you subscribed to `smb_message_echoes` webhook field
- Check webhook logs in Meta Developer Console
- Check your terminal for webhook errors
- Verify ngrok is still running

## Next Steps

1. ✅ Subscribe to webhook fields (`smb_message_echoes`, `smb_app_state_sync`, `history`)
2. ✅ Test Coexistence onboarding with QR code
3. ✅ Test bidirectional message sync
4. (Optional) Implement message history sync API calls
5. (Optional) Implement contact sync display in dashboard

## References

- [Meta Coexistence Documentation](https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users)
- [Coexistence Webhooks](https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users#webhooks)
