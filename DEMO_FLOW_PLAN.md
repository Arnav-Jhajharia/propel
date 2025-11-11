# Demo Flow Plan

## Overview
The demo should feel like a fully functional application, not a demo. No banners or demo indicators.

## Demo Flow Sequence

### Step 1: PropertyGuru Connection
**Page**: `/integrations` (Properties tab)

**What happens:**
- User lands on integrations page
- PropertyGuru import section is visible
- User pastes a PropertyGuru listing URL
- Property is imported and appears in the system
- Success message/notification appears
- User is ready to see the property with prospects

**Key elements to show:**
- PropertyGuru import form/component
- Clear instructions on how to import
- Visual feedback when property is imported
- Smooth transition to next step

**Data needed:**
- Pre-configured PropertyGuru URL (or user pastes one)
- Property data gets imported (title, price, address, images, etc.)

---

### Step 2: AI Chatbot in Action
**Page**: (Handled separately by user - not in scope)

**What happens:**
- User demonstrates the chatbot screening prospects
- Shows automated conversation flow
- Prospects are being screened and scored
- Data flows into the system

**Note**: This step is handled by the user, but the data from this step feeds into Step 3

---

### Step 3: Properties Page with Prospects
**Page**: `/properties`

**What happens:**
- User navigates to properties page
- Sees list of properties (at least one with imported property from Step 1)
- Selects a property from the list
- Right panel shows property details
- Property has 10 prospects with varying characteristics

**Prospect Distribution (10 prospects):**

**Requiring Attention (4-5 prospects):**
1. **Prospect A** - Budget below property price (e.g., budget $3,500, property $4,200)
   - Score: 65
   - Missing: Move-in date
   - Status: Active
   - Needs: Budget negotiation or alternative property

2. **Prospect B** - High score but no response (e.g., score 88, last message 5 days ago)
   - Score: 88
   - Budget: $4,500 (good fit)
   - Status: Replied
   - Needs: Follow-up to re-engage

3. **Prospect C** - Viewing scheduled but not confirmed
   - Score: 75
   - Budget: $4,000
   - Status: Viewing scheduled
   - Needs: Confirmation call/reminder

4. **Prospect D** - Missing critical info (no budget specified)
   - Score: 60
   - Missing: Budget, move-in date
   - Status: Screening sent
   - Needs: Complete screening information

5. **Prospect E** - Budget way too low (e.g., budget $2,500, property $4,200)
   - Score: 45
   - Budget: $2,500
   - Status: Active
   - Needs: Alternative property suggestion

**Not Requiring Attention (5-6 prospects):**
6. **Prospect F** - Perfect match, recently engaged
   - Score: 95
   - Budget: $4,500 (property $4,200)
   - Status: Viewing scheduled (confirmed)
   - All info complete, actively engaged

7. **Prospect G** - Good fit, conversation ongoing
   - Score: 82
   - Budget: $4,000
   - Status: Replied (yesterday)
   - All screening complete, normal flow

8. **Prospect H** - High score, converted
   - Score: 92
   - Budget: $4,300
   - Status: Converted
   - Successfully converted, no action needed

9. **Prospect I** - Good prospect, waiting for response
   - Score: 78
   - Budget: $4,100
   - Status: Screening sent (2 days ago)
   - Normal waiting period, no urgency

10. **Prospect J** - Solid prospect, all info complete
    - Score: 85
    - Budget: $4,200 (exact match)
    - Status: Active
    - Complete profile, good fit, no issues

**Visual Indicators Needed:**
- Attention badges/icons for prospects requiring attention
- Color coding (red/orange for attention, green for good)
- Tooltips explaining why attention is needed
- Budget comparison visualization (prospect budget vs property price)
- Status badges with clear meaning

**Page Layout:**
- Left: Properties list (with imported property visible)
- Right: Selected property details panel
  - Property summary (price, size, address)
  - Top prospects section (showing 5 top prospects)
  - Quick stats (total prospects, viewings, etc.)
- Main content area: Full prospects table (when viewing property detail page)

**Interactions:**
- Click property → See details and prospects
- Click prospect → See detailed view
- Filter by attention status
- Sort by score, budget, status
- Quick actions on prospects

---

### Step 4: Property Detail Page
**Page**: `/properties/[id]`

**What happens:**
- User clicks "View details" on a property
- Full property detail page loads
- Shows complete prospects table with all 10 prospects
- Prospects are clearly categorized (attention vs normal)
- User can see detailed prospect information

**Key Features:**
- Full prospects table with all columns
- Attention indicators on each prospect row
- Budget comparison visible
- Fit score visualization
- Stage/status badges
- Quick action buttons (WhatsApp, Schedule, Draft message)

**Prospect Table Columns:**
- Client name & avatar
- Score (with color coding)
- WTP (Willingness to Pay)
- Fit percentage (budget vs property price)
- Stage (Active, Replied, Viewing scheduled, etc.)
- Demographics (nationality, occupation, tenants, move-in)
- Last message timestamp
- Actions (WhatsApp, Schedule, Draft)

---

### Step 5: Autonomy Toggle & Handoff
**Page**: `/properties/[id]` (per-property toggle)

**What happens:**
- User sees autonomy toggle/switch in property detail page
- Can enable full autonomy mode for this specific property
- Bot can automatically accept/reject applicants for this property
- Shows automation capabilities

**Toggle Location:**
- **Per-property toggle** in property detail page header or sidebar
- Each property has its own autonomy setting

**Autonomy Features:**
- Toggle switch (On/Off) with clear visual state
- Visual indicator when autonomy is active (badge or status text)
- Toggle state display only (no action log for demo)
- Simple On/Off functionality to demonstrate concept

**What Autonomy Does:**
- **Auto-Accept**: Prospects with score > threshold and budget fit
- **Auto-Reject**: Prospects with budget too low or missing critical info
- **Auto-Schedule**: High-score prospects get viewing slots automatically
- **Auto-Follow-up**: Send reminders for scheduled viewings

**Visual Elements:**
- Toggle switch with clear On/Off state
- Status badge showing "Autonomy Active" or "Manual Mode"
- Simple toggle state display (no action log needed for demo)

---

## Data Requirements

### Property Data
- At least 1 property imported from PropertyGuru
- Property should have:
  - Title, address, price, size (sqft)
  - Hero image
  - Description
  - Property type, furnished status

### Prospect Data (10 prospects per property)
- Mix of attention-required and normal prospects
- Varying scores (45-95)
- Different budgets (some below, some at, some above property price)
- Different stages (Active, Replied, Viewing scheduled, Converted, etc.)
- Different demographics (nationality, occupation, tenant count)
- Realistic names and phone numbers
- Last message timestamps (varying recency)
- Screening answers (some complete, some incomplete)

### Attention Criteria (Confirmed)
1. Budget below property price (threshold: < 90% of property price)
2. Missing critical screening info (budget or move-in date)
3. High score but no response (> 5 days)
4. Viewing scheduled but not confirmed
5. Budget way too low (< 70% of property price)

---

## UI/UX Enhancements Needed

### Properties Page
1. Property images in list view
2. Summary statistics at top (total properties, prospects, attention count)
3. Attention filter/sort option
4. Enhanced property cards with status indicators

### Property Detail Page
1. Attention badges on prospects requiring attention
2. Budget comparison visualization
3. Fit score progress bars or color coding
4. Quick action buttons
5. Attention reasons tooltips

### Autonomy Toggle
1. Clear toggle switch component (per-property)
2. Status indicators (Active/Manual mode badge)
3. Toggle state display only

---

## Flow Progression

1. **Start**: User at integrations page
2. **Import**: User imports property from PropertyGuru
3. **Chatbot**: (User demonstrates separately)
4. **Properties**: User navigates to properties page, sees property with prospects
5. **Detail**: User clicks property, sees full detail page with all prospects
6. **Autonomy**: User enables autonomy toggle, sees automation in action
7. **End**: Demo complete, user has seen full workflow

---

## Key Interactions to Highlight

1. **Property Import**: Show how easy it is to import from PropertyGuru
2. **Prospect Management**: Show how prospects are organized and prioritized
3. **Attention System**: Show how system identifies prospects needing attention
4. **Autonomy**: Show how bot can handle routine decisions automatically
5. **Quick Actions**: Show how agent can quickly respond to prospects

---

## Technical Considerations

- All data should be pre-seeded or easily generated
- Attention detection logic needs to be implemented
- Autonomy toggle needs backend support (or simulated)
- Real-time updates would be ideal but not required for demo
- Smooth transitions between pages
- Loading states should be minimal (pre-load data if possible)

