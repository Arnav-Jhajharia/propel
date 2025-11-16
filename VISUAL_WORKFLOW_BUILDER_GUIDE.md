# 🎨 Visual Workflow Builder - Complete Guide

## Overview

A **simplified, visual node-based workflow builder** inspired by LangGraph Studio, but controlled entirely through **natural language** with support for **hierarchical configurations**.

Think: **Zapier/n8n visual simplicity** + **ChatGPT natural language control** + **Property/Client-specific overrides**

---

## 🎯 What You Get

### 1. **Visual Node-Based Editor**
Like the image you showed, but simplified:

```
    [▶ Start]
        │
        ↓
    ┌──────────┐
    │  [👤]    │ ← Click to enable/disable
    │Screening │
    │[Enabled] │
    └────┬─────┘
         │
         ↓
    ┌──────────┐
    │  [🏠]    │
    │ Property │
    │ Detection│
    │[Disabled]│ ← Grayed out when disabled
    └────┬─────┘
         │
        ...
         │
    [⚙️ Handoff] ← Shows where bot stops
         │
    [✓ End]
```

**Features:**
- **Drag-free** - Click to enable/disable phases
- **Visual connections** - Lines show workflow flow
- **Color-coded** - Enabled (primary) vs Disabled (gray)
- **Approval toggles** - Click ⚠️ to require human approval
- **Handoff indicator** - Orange box shows where human takes over

### 2. **Natural Language Control**
Instead of clicking through menus:

```typescript
User types: "I only want screening, then I'll take over"
↓
AI processes and updates visual workflow
↓
Screening: Enabled ✅
Everything else: Disabled ❌
```

### 3. **3-Level Hierarchy**
```
Global Default (applies to all)
    ↓ (can be overridden by)
Property-Specific (applies to one property)
    ↓ (can be overridden by)
Client-Specific (applies to one client)
```

**Priority:** Client > Property > Global

---

## 📊 Visual Components

### **Node States**

| State | Visual | Meaning |
|-------|--------|---------|
| **Enabled** | 🟦 Primary color + solid border | Bot automates this phase |
| **Disabled** | ⬜ Gray + dashed border | Manual, bot skips this |
| **Approval Required** | ⚠️ Orange warning icon | Bot pauses for human approval |
| **Handoff Point** | 🟧 Orange box | Bot stops, human takes over |

### **Node Structure**

```
┌─────────────────────────┐
│  [Icon]  Phase Name     │ ← Header
│  [Badge: Enabled]       │ ← Status
│  ⚠️ Requires approval   │ ← Optional approval indicator
└──────────┬──────────────┘
           │ ← Connection line
```

### **Interactive Elements**

1. **Click node card** → Toggle enabled/disabled
2. **Click ⚠️ icon** → Toggle approval requirement
3. **Type natural language** → Updates all nodes automatically

---

## 🏗️ Hierarchy System

### How It Works

1. **Global Configuration** (Default for all properties/clients)
   - Created at `/bot-settings` → "Visual Builder" tab
   - Scope: `global`
   - Applied when no specific override exists

2. **Property-Specific** (Override for one property)
   - Created at `/properties/[id]` → Bot Configuration section
   - Scope: `property`
   - Useful for: Different properties need different automation levels

3. **Client-Specific** (Override for one client)
   - Created at `/clients/[id]` → Bot Configuration section
   - Scope: `client`
   - Useful for: VIP clients get full automation, difficult clients get manual control

### Example Hierarchy

```
Global Default:
  ✅ Screening
  ✅ Property Detection
  ✅ Property Q&A
  ❌ Viewing Proposal
  ❌ Viewing Booking
  ❌ Follow-up

Property "Luxury Condo" Override:
  ✅ All phases enabled (full automation for luxury properties)

Client "VIP Customer" Override:
  ✅ All phases + instant booking (no approval needed)

Result for VIP Customer viewing Luxury Condo:
  → Uses Client override (highest priority)
  → Full automation with instant booking
```

---

## 🎮 Usage Examples

### Example 1: Create Global Default

```typescript
// User navigates to /bot-settings → "Visual Builder"
// Types in natural language box:
"I want screening and property detection automated, everything else manual"

// Visual workflow updates:
┌────────────┐
│ Screening  │ ✅ Enabled (primary color)
└────┬───────┘
     │
┌────────────┐
│  Property  │ ✅ Enabled (primary color)
│  Detection │
└────┬───────┘
     │
[🟧 Handoff to Human] ← Bot stops here
     │
┌────────────┐
│ Property   │ ❌ Disabled (gray)
│    Q&A     │
└────┬───────┘
     │
   ...more disabled phases...
```

### Example 2: Property-Specific Override

```typescript
// User goes to /properties/luxury-condo-123
// Creates override:
"For this luxury property, I want full automation to show we're high-tech"

// This property now uses:
✅ All phases enabled
✅ No approvals required
✅ Full end-to-end automation

// All other properties still use global default
```

### Example 3: Client-Specific Override

```typescript
// User goes to /clients/difficult-client-456
// Creates override:
"This client needs special attention, handle screening only"

// This client now gets:
✅ Screening enabled
❌ Everything else disabled
🟧 Immediate handoff after screening

// Same client viewing any property uses this override
```

---

## 🔧 Technical Implementation

### Database Schema

```sql
bot_configs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  property_id TEXT,              -- NULL for global/client-only
  client_id TEXT,                -- NULL for global/property-only
  scope TEXT NOT NULL,           -- 'global', 'property', or 'client'
  name TEXT NOT NULL,
  natural_language_input TEXT,
  parsed_config JSON,
  is_active BOOLEAN DEFAULT true
)
```

### Config Resolution Logic

```typescript
async function loadAutomationConfig(userId, {clientId, propertyId}) {
  // 1. Try client-specific (highest priority)
  if (clientId) {
    const config = await getClientConfig(userId, clientId);
    if (config) return config;
  }
  
  // 2. Try property-specific (medium priority)
  if (propertyId) {
    const config = await getPropertyConfig(userId, propertyId);
    if (config) return config;
  }
  
  // 3. Fall back to global (lowest priority)
  return await getGlobalConfig(userId);
}
```

### Visual Workflow Format

```typescript
type WorkflowPhase = {
  id: string;                    // 'screening', 'property_detection', etc.
  name: string;                  // Display name
  icon: LucideIcon;              // React icon component
  enabled: boolean;              // Is this phase automated?
  requiresApproval: boolean;     // Does it need human approval?
};

const workflow: WorkflowPhase[] = [
  { id: "screening", name: "Screening", icon: UserCheck, enabled: true, requiresApproval: false },
  { id: "property_detection", name: "Property Detection", icon: Home, enabled: true, requiresApproval: false },
  // ... more phases
];
```

---

## 🎨 UI/UX Design Decisions

### Why Visual > Text Lists?

**Problem with text lists:**
- ❌ Hard to scan
- ❌ No spatial memory
- ❌ Boring, technical
- ❌ Requires reading

**Benefits of visual workflow:**
- ✅ Instant understanding
- ✅ Spatial/visual memory
- ✅ Professional, modern
- ✅ Glance-able status

### Why Natural Language Control?

**Alternative:** Checkboxes, dropdowns, forms

**Why NL is better:**
- ✅ No learning curve - just describe what you want
- ✅ Handles complex logic: "Automate everything except..."
- ✅ More conversational, less intimidating
- ✅ Can express intent, not just toggle states

### Simplifications vs Full Workflow Builders

**What we DIDN'T build (intentionally):**
- ❌ Drag-and-drop node repositioning (not needed - linear workflow)
- ❌ Custom connections/routing (workflow is sequential)
- ❌ Loop/conditional logic UI (handled by natural language)
- ❌ Variable passing between nodes (abstracted away)

**What makes it simple:**
- ✅ Fixed workflow sequence (no arbitrary connections)
- ✅ Click to toggle (no dragging)
- ✅ Natural language for complex logic
- ✅ Clear visual feedback

---

## 🚀 Integration Points

### 1. Bot Settings Page (`/bot-settings`)

```tsx
<Tabs>
  <Tab value="visual">
    <WorkflowBuilder
      context="global"
      contextName="Global Default"
      onSave={handleSave}
    />
  </Tab>
  <Tab value="text">
    {/* Old text-based config (still available) */}
  </Tab>
</Tabs>
```

### 2. Property Detail Page (`/properties/[id]`)

```tsx
<PropertyOverride propertyId={propertyId}>
  <WorkflowBuilder
    context="property"
    contextName={property.name}
    onSave={(workflow) => savePropertyConfig(propertyId, workflow)}
  />
</PropertyOverride>
```

### 3. Client Detail Page (`/clients/[id]`)

```tsx
<ClientAutomationOverride clientId={clientId}>
  <WorkflowBuilder
    context="client"
    contextName={client.name}
    onSave={(workflow) => saveClientConfig(clientId, workflow)}
  />
</ClientAutomationOverride>
```

---

## 📱 Responsive Design

### Desktop (≥1024px)
- **Node size:** Large (48px icons)
- **Layout:** Centered column, max-width 800px
- **Text:** Full phase descriptions

### Tablet (768-1023px)
- **Node size:** Medium (40px icons)
- **Layout:** Flexible column
- **Text:** Abbreviated descriptions

### Mobile (<768px)
- **Node size:** Small (32px icons)
- **Layout:** Full-width
- **Text:** Phase names only

---

## 🎯 User Flows

### Flow 1: First-Time Setup

```
1. User signs up → Onboarding
2. Redirected to /bot-settings
3. Sees visual workflow builder
4. Types: "I want full automation"
5. Visual workflow updates (all phases enabled)
6. Clicks "Save Workflow"
7. ✅ Global default configured
```

### Flow 2: Property-Specific Override

```
1. User has global config (screening + property detection only)
2. Lists new luxury property
3. Goes to property detail page
4. Clicks "Customize Bot for This Property"
5. WorkflowBuilder appears with current global config as base
6. Types: "For this luxury property, enable everything"
7. Visual workflow updates (all phases enabled)
8. Saves property override
9. ✅ This property now fully automated, others use global
```

### Flow 3: Client-Specific Override

```
1. Agent gets difficult new client
2. Opens client profile
3. Clicks "Customize Bot for This Client"
4. Types: "Only do screening, I'll handle everything else manually"
5. Visual workflow shows: Screening ✅, Rest ❌
6. Saves client override
7. ✅ This client gets manual service, others use property/global config
```

---

## 🔐 Permission & Validation

### Validation Rules

1. **At least one phase must be enabled** (can't be fully manual)
2. **Phases can't skip dependencies** (e.g., can't do booking without proposal)
3. **Natural language must parse successfully** (fallback to manual if fails)

### Permission Levels

- **Global config:** All users can edit their own
- **Property config:** Must own/manage the property
- **Client config:** Must be assigned to the client

---

## 🎉 Summary

You now have a **visual, node-based workflow builder** that is:

✅ **Simpler** than full workflow tools (no dragging, fixed sequence)  
✅ **Natural language controlled** (describe what you want)  
✅ **Hierarchical** (Global → Property → Client priority)  
✅ **Visual** (see the workflow, don't just read about it)  
✅ **Interactive** (click to toggle, instant feedback)  
✅ **Professional** (clean, modern, production-ready UI)  

**Result:** The simplicity of natural language combined with the clarity of visual workflows! 🚀✨

