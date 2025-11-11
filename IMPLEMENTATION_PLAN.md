# Implementation Plan - Demo Properties Page

## Decisions Made

1. **Autonomy Toggle**: Per-property only (in property detail page)
2. **Attention Criteria**: 5 confirmed criteria (see below)
3. **Prospect Distribution**: 4-5 requiring attention, 5-6 normal
4. **Autonomy Display**: Toggle state only (no action log)

## Implementation Tasks

### Phase 1: Attention System

#### 1.1 Attention Detection Logic
**File**: `src/lib/attention-detection.ts` (new)

**Function**: `detectAttentionReasons(prospect, property)`
- Check budget vs property price (< 90% = attention)
- Check for missing critical info (budget or move-in date)
- Check last message date (> 5 days with high score = attention)
- Check viewing confirmation status
- Check budget threshold (< 70% = critical attention)

**Returns**: Array of attention reasons or empty array

#### 1.2 Attention Badge Component
**File**: `src/components/properties/AttentionBadge.tsx` (new)

**Props**:
- `reasons`: string[] - Array of attention reasons
- `variant`: 'warning' | 'critical' | 'info'

**Features**:
- Color-coded badge (orange for warning, red for critical)
- Tooltip showing specific reasons
- Icon indicator

### Phase 2: Properties Page Enhancements

#### 2.1 Property Images in List
**File**: `src/app/properties/page.tsx`

**Changes**:
- Add property thumbnail image to each list item
- Use `heroImage` from property data
- Add hover effect with image preview
- Fallback to placeholder if no image

#### 2.2 Summary Statistics
**File**: `src/app/properties/page.tsx`

**Add**:
- Summary cards at top of page:
  - Total Properties
  - Total Prospects
  - Requiring Attention (count)
  - Scheduled Viewings
  - Average Price

#### 2.3 Attention Filter
**File**: `src/app/properties/page.tsx`

**Add**:
- Filter button/chip: "Requires Attention"
- Sort option: "By Attention Status"
- Visual indicator in list for attention-required properties

### Phase 3: Property Detail Page

#### 3.1 Attention Indicators in Table
**File**: `src/app/properties/[id]/page.tsx`

**Changes**:
- Add attention badge column or indicator in prospect table
- Highlight rows requiring attention
- Show attention reasons in tooltip or expanded view

#### 3.2 Enhanced Prospect Cards
**File**: `src/app/properties/[id]/page.tsx`

**Enhancements**:
- Budget comparison visualization (prospect budget vs property price)
- Fit score progress bar or color coding
- Attention badges on prospect cards
- Quick action buttons (Accept, Reject, Schedule)

#### 3.3 Autonomy Toggle
**File**: `src/app/properties/[id]/page.tsx`

**Add**:
- Toggle switch in property header or sidebar
- Status badge showing "Autonomy Active" or "Manual Mode"
- Store toggle state (localStorage or state management)
- Visual feedback when toggled

**Component**: `src/components/properties/AutonomyToggle.tsx` (new)

**Props**:
- `propertyId`: string
- `enabled`: boolean
- `onToggle`: (enabled: boolean) => void

### Phase 4: Data & Seeding

#### 4.1 Demo Prospect Data
**File**: `src/lib/demo-seed.ts` (new) or update existing seed

**Create**:
- 10 prospects per property with:
  - Varying scores (45-95)
  - Different budgets (some below, at, above property price)
  - Different stages
  - Some with missing info
  - Some with old last message dates
  - Mix of attention-required and normal

#### 4.2 Attention Detection Integration
**File**: `src/app/properties/[id]/page.tsx`

**Changes**:
- Call `detectAttentionReasons` for each prospect
- Display attention badges based on results
- Filter/sort by attention status

## File Structure

```
src/
├── app/
│   ├── properties/
│   │   ├── page.tsx (enhanced)
│   │   └── [id]/
│   │       └── page.tsx (enhanced with autonomy toggle)
├── components/
│   └── properties/
│       ├── AttentionBadge.tsx (new)
│       └── AutonomyToggle.tsx (new)
└── lib/
    ├── attention-detection.ts (new)
    └── demo-seed.ts (new or update existing)
```

## Implementation Order

1. **Attention Detection Logic** - Core functionality first
2. **Attention Badge Component** - Visual indicator
3. **Properties Page Enhancements** - Images, stats, filters
4. **Property Detail Page** - Attention indicators, enhanced cards
5. **Autonomy Toggle** - Final feature
6. **Demo Data Seeding** - Populate with realistic data

## Key Features Summary

✅ **Attention System**
- 5 detection criteria
- Visual badges and indicators
- Filter/sort by attention status

✅ **Properties Page**
- Property images in list
- Summary statistics
- Attention filter

✅ **Property Detail Page**
- Attention indicators in table
- Enhanced prospect cards
- Budget comparison visualization
- Per-property autonomy toggle

✅ **No Demo Indicators**
- Appears fully functional
- No banners or demo mode badges

