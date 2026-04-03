# Stitch Prompt — Reservation Feature Redesign

## App Context

**App Name:** Kdy na chatu (kdynachatu.cz)
**What it is:** A cabin/cottage management SaaS app for families and friend groups who share a vacation cabin. Users book stays, coordinate who's going when, track supplies, share photos, and manage the property together.
**Platform:** Mobile-first responsive web app (PWA). Most users access it on phones (320px–430px), but it also needs to work on tablets and desktops.
**Visual style:** Warm, organic, nature-inspired. Frosted glass cards (`bg-white/95 backdrop-blur-xl`), soft shadows, rounded corners (`rounded-2xl`), warm neutral palette. The background is a beautiful landscape photo of the cabin's surroundings (mountains, forest, etc.). The whole UI feels like looking through a cozy window at the outdoors.
**Tech stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui components, Framer Motion for subtle animations, Lucide icons.

---

## What I Need Redesigned

The **Reservation section** — specifically the **right-side panel** that shows the list of reservations and the reservation detail view. The left side is a calendar grid (keep that as-is conceptually).

Currently the panel has:
1. **A header** with title "Přehled: Březen 2026" (Overview: March 2026)
2. **Period filter dropdown** ("Tento měsíc" / "3 měsíce" / "1 rok") — this month / 3 months / year
3. **Tab toggle** "Vše" | "Moje" (All | Mine)
4. **Reservation cards** in a list
5. **Reservation detail view** (when you click a card, it replaces the list)

---

## Current Screens (what I want improved)

### Screen 1 — Reservation List View
- Shows reservation cards stacked vertically
- Each card has: user avatar (animal emoji + colored circle), username, status badge ("POTVRZENO" = Confirmed), date range ("21. – 22. Březen"), purpose, and action buttons (edit ✎, detail ▶, delete ×)
- At top: period filter dropdown + tab toggle + count ("Zobrazeno 1 rezervace")
- **Problems:** Cards look flat and boring, not enough visual hierarchy, action buttons are tiny and unclear, status badge is just plain text, the whole panel feels like a basic list with no personality

### Screen 2 — Reservation Detail View
- Shows full detail after clicking a card
- "Zpět na seznam" (Back to list) link at top
- User avatar + name + status badge
- Date fields: OD (From) / DO (To) with dates
- ÚČEL (Purpose) field
- Action buttons: "Upravit" (Edit), "Přiřadit jinému" (Assign to another), "Smazat rezervaci" (Delete reservation)
- Checkout tasks section at bottom
- **Problems:** Looks like a basic form/table, not engaging, dates are in plain table rows, action buttons have inconsistent styling (green primary, white secondary, red text danger), no visual connection to the calendar

---

## Data Available Per Reservation

Each reservation has this data — use it creatively in the redesign:

```typescript
{
  id: string,              // UUID
  userId: string,          // Who booked it
  username: string,        // Display name (e.g., "AdminUser", "Katka", "Petr")
  from: "2026-03-21",      // Arrival date (YYYY-MM-DD)
  to: "2026-03-25",        // Departure date
  purpose: string,         // Optional reason ("Víkend", "Narozeniny", "Opravy")
  notes: string | null,    // Private notes from the booker
  handoverNote: string | null, // Message for the next guest ("Fridge is noisy")
  status: "primary" | "backup" | "soft",
    // primary = Confirmed booking
    // backup = Interested but someone else has the dates (waitlist)
    // soft = Tentative / preliminary interest
  userColor: "#FF6B6B",    // Each user has a unique color
  userAnimalIcon: "🦊",    // Each user has an animal avatar (emoji)
  isCheckoutCompleted: boolean,  // Did they complete the checkout checklist?
  checkoutCompletedBy: string | null,
  checkoutCompletedAt: string | null,
}
```

The UI also shows **night count** (calculated from dates) and **whether the reservation is in the past**.

---

## Design Requirements

### General Vibe
- **Warm, inviting, cozy** — this is a cabin app, not an enterprise tool
- Cards should feel tactile, like physical booking slips or postcards
- Use the user's `userColor` as an accent throughout their reservation card
- Animal emoji avatars should be prominent and fun — they're a key identity feature
- Subtle micro-interactions (hover lifts, press scales) via Framer Motion

### Reservation Card (List Item)
- Make cards visually distinct and scannable
- Show: avatar (animal emoji in colored circle), username, date range with night count, purpose, status
- Status should use colored pills/badges: green for confirmed, amber/orange for backup, gray for soft
- Past reservations should be visually muted (lower opacity or grayscale)
- Active/current reservation (happening today) should be highlighted somehow
- Action buttons should be icons in a subtle row, not prominent unless hovered
- Consider showing a thin colored left border or accent stripe using `userColor`
- If there's a `handoverNote`, show a small indicator (e.g.,  or message icon)

### Reservation Detail View
- This should feel like opening a booking card, not a form
- Large avatar + username at top with status badge
- Date visualization — consider a small visual timeline or date range visualization instead of plain "OD" / "DO" text rows
- Night count prominently shown (e.g., "4 noci" with moon icon 🌙)
- Notes and handover note in distinct styled blocks (like speech bubbles or note cards)
- Action buttons should be cleaner: primary action (Edit) prominent, secondary actions (Assign, Delete) subdued
- Checkout section: show as a progress indicator or completion badge
- "Back to list" should be a smooth breadcrumb or back arrow, not a plain text link
- If the reservation is currently active (today is between from-to), show a "Právě probíhá" (Currently active) indicator

### Empty State
- When no reservations exist, show a warm illustration or icon with a friendly message
- "Chata je volná! 🏡" with a clear CTA button to create a reservation

### Mobile Considerations
- Cards should be full-width tap targets
- Swipe-to-reveal actions would be a nice touch (but not required)
- Detail view should be a full-screen slide-in on mobile
- Touch targets minimum 44px
- No hover-only interactions

### Color & Typography
- Use the app's warm neutral palette (defined in CSS variables)
- `--brand-primary: #22c55e` (green for primary actions)
- Headings: font-weight 700, text sizes: 2xl for page title, lg for card titles
- Muted text: `text-gray-500` for secondary info
- Cards: `bg-white/95 backdrop-blur-xl shadow-lg rounded-2xl border border-white/20`

---

## Statuses Explained (for proper visual treatment)

| Status | Czech Label | Meaning | Suggested Visual |
|--------|------------|---------|-----------------|
| `primary` | Potvrzeno | Confirmed booking, this person IS going | Green badge, solid card, full opacity |
| `backup` | Záložní / Má zájem | Someone else has these dates, but this person wants them if they cancel | Amber/orange badge, maybe dashed border or subtle pattern |
| `soft` | Předběžná | Tentative — "I might go, not sure yet" | Gray badge, lighter card, maybe italic purpose text |

---

## Interactions to Design

1. **List → Detail**: Clicking a card should transition to detail view (slide or expand animation)
2. **Filter tabs**: "Vše" / "Moje" toggle — should clearly show which is active
3. **Period selector**: Dropdown or segmented control for timeframe
4. **Create new**: FAB or prominent button to create reservation
5. **Delete flow**: Two-phase — first click highlights the button in red/danger, second click confirms (ethical friction pattern, no modal needed)
6. **Watch toggle**: Non-owners can "watch" a reservation (🐕 dog emoji button) to get notified if it's cancelled

---

## What to Deliver

Design the **right panel** of the reservation page with these views:
1. **List view** — showing 3-4 example reservation cards with different statuses
2. **Detail view** — showing a confirmed reservation with all fields populated
3. **Empty state** — when no reservations exist

Mobile width (390px viewport) is the priority. Desktop shows this panel as a 350px sidebar next to a calendar.

Keep the language in **Czech** for all UI text. Use the exact labels from the data above.
