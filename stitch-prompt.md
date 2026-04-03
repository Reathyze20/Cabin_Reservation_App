# Google Stitch — UI Design Prompt pro kdynachatu.cz

## App Overview

Design a **cabin management SaaS web app** called **"Kdy na chatu"** (When to the cabin). It's a family/group app for managing vacation cabin reservations, shopping lists, photo galleries, shared notes, a diary, and reconstruction projects. The aesthetic is **"floating glass cards in a forest"** — all content floats in clean white/frosted cards above a fullscreen nature background photograph.

The app is **mobile-first responsive** (works from 320px to desktop 1440px+). Design is calm, warm, nature-inspired — never aggressive or dark. Think Airbnb meets a cozy cabin retreat.

---

## Design System

### Color Palette
- **Primary / Brand:** `#3f7b63` (fresh sage/emerald green) — all CTAs, active states, links
- **Primary Hover:** `#1a2721` (very dark green-gray)
- **Primary Light:** `#e8f4ef` (soft mint background for tags, badges)
- **Text Main:** `#1a2721` (near-black green-gray, high contrast)
- **Text Muted:** `#4b5563` (secondary labels, timestamps)
- **Text Disabled:** `#9ca3af`
- **Background App:** `#f4f7f5` (soft minty-white)
- **Background Card:** `#ffffff` (pure white, 95% opacity for frosted glass effect)
- **Background Hover:** `#e8ece9` (row/list hover)
- **Border Light:** `#f4f7f5` (subtle dividers)
- **Border Strong:** `#e5e7eb` (visible borders, table lines)
- **Border Input:** `#cbd5e1` (form field borders)
- **Status Error:** `#dc2626` (red)
- **Status Success:** `#16a34a` (green)
- **Status Warning:** `#d97706` (amber)
- **Status Info:** `#2563eb` (blue)
- **Glass overlay:** `rgba(255, 255, 255, 0.88)` with `backdrop-filter: blur(12px)`
- **Modal backdrop:** `rgba(15, 23, 42, 0.55)` with `backdrop-filter: blur(6px)`

### Typography
- **Primary font:** Plus Jakarta Sans (all UI)
- **Diary/handwritten font:** Kalam (only for diary entries)
- **Font sizes:** 12px (xs), 14px (sm), 16px (base), 18px (lg), 20px (xl), 24px (2xl), 30px (3xl)
- **Font weights:** 400 (body), 500 (labels), 600 (subheadings), 700 (headings, numbers)

### Spacing & Radius
- **Spacing scale:** 4px, 8px, 12px, 16px, 20px, 24px, 32px, 48px
- **Border radius:** xs=4px, sm=6px, md=8px, lg=12px, xl=16px, 2xl=28px, full=9999px
- **Card radius:** 12–16px
- **Buttons radius:** 8px
- **Inputs radius:** 8px

### Shadows (toned with green-gray, not pure black)
- **Card shadow:** `0 1px 3px rgba(26,39,33,0.08), 0 1px 2px rgba(26,39,33,0.06)`
- **Elevated card:** `0 4px 12px rgba(26,39,33,0.08), 0 2px 4px rgba(26,39,33,0.04)`
- **Modal shadow:** `0 20px 60px rgba(26,39,33,0.2), 0 8px 24px rgba(26,39,33,0.12)`

---

## Layout Structure

### App Shell
```
┌─────────────────────────────────────────────────────────┐
│  TopBar (Desktop): Logo "Kdy na chatu" + horizontal    │
│  nav links + user profile dropdown (avatar + name)      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Page Content Area                                      │
│  (max-width: 1400px, centered, padded 24px–32px)        │
│  Content sits in white/glass cards above background     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  MobileNav (Mobile only): Bottom tab bar, 5 icons       │
│  Dashboard | Reservations | Shopping | Notes | Gallery  │
└─────────────────────────────────────────────────────────┘
```

**Background:** Fullscreen nature photo (forest/cabin landscape) with dark gradient overlay at top (for TopBar contrast). Content cards float above this background.

### Desktop TopBar
- Sticky, white/frosted glass background (`rgba(255,255,255,0.88)` + blur)
- Left: App logo/name "Kdy na chatu" in emerald brand color
- Center: Navigation links: Přehled (Dashboard), Rezervace, Poznámky, Nákupy, Galerie, Deník, Rekonstrukce
- Right: User avatar circle (32px) + username + dropdown arrow → dropdown menu with Settings, Admin, Logout

### Mobile Bottom Nav
- Fixed bottom bar, 5 tabs with icons + labels
- Active tab: emerald icon + text, slight scale-up
- Background: white with top border
- Min touch target: 44×44px

---

## Pages to Design

### 1. Dashboard (Přehled)
Grid of widget cards:
- **Active Reservation Card** — Shows current/next reservation with dates, user name, countdown ("za 3 dny")
- **Weather Widget** — Current weather for cabin location (temperature, icon, condition)
- **Shopping Summary** — "5 položek k nákupu" with mini list preview
- **Handover Notes** — Latest handover message from previous guest
- **Inventory Warnings** — Items running low or missing
- **Quick Actions** — Large buttons: "Nová rezervace", "Přidat poznámku"

Layout: 2–3 column responsive grid, cards have subtle shadows, white bg, 12px radius.

### 2. Reservations (Rezervace) — MOST IMPORTANT PAGE
Split layout:
- **Left 2/3: Monthly Calendar Grid**
  - Header: ❮ Březen 2026 ❯ (navigation arrows + month/year title)
  - Top-right stats badges: "Obsazeno: 3" (orange), "Volno: 11" (green outline), "Volné víkendy: 2" (green outline)
  - 7-column day grid (Po, Út, St, Čt, Pá, So, Ne)
  - Weekend columns (So, Ne) have subtle `#f4f7f5` tint
  - Today's date: number in emerald circle with white text
  - Reservation bars span across days (colored by user color, rounded ends)
  - Range selection: click start day → hover highlights range in light emerald → click end day
  - Bottom bar: "Příjezd: 2026-03-21 — vyberte datum odjezdu" hint + "Termíny dovolených" button
  
- **Right 1/3: Sidebar Panel**
  - Period filter dropdown: "Tento měsíc" / "3 měsíce" / "1 rok"
  - Tab filter: "Všechny" | "Moje"
  - Scrollable reservation list with cards showing: user avatar + name, date range, purpose, status badge
  - Click a reservation → detail view slides in (replacing list)

**Reservation Detail View (in sidebar):**
- Back arrow + title
- User name + avatar
- Date range with check-in/check-out times
- Purpose, notes, handover note fields
- Status badge (confirmed / soft / backup)
- Action buttons: Edit, Delete (with confirmation)

**Booking Modal:**
- Date pickers for arrival/departure
- Purpose input
- Notes textarea
- Handover note textarea
- "Náhradní termín" (backup) toggle
- Overlap warning if dates conflict
- Submit + Cancel buttons

### 3. Notes (Poznámky)
- Thread-based notes (like a simplified forum)
- Each note thread: title, content preview, author avatar, timestamp, reply count
- Click to open → full thread with replies
- Floating "+" button to create new note
- Context actions: "Přidat do nákupního seznamu", "Přidat do rekonstrukce"

### 4. Shopping (Nákupy)
- Multiple shopping lists (tabs or list selector)
- Each list shows items with: checkbox, item name, quantity, category tag
- Toggle "v košíku" (in cart) state
- Pantry mode toggle (items that stay at cabin permanently)
- "Essential" badge for must-have items
- Quick-add input at top of list
- Inventory linking — items can reference cabin inventory

### 5. Gallery (Galerie)
- Folder/album grid with cover photo thumbnails
- Click album → photo grid (masonry or uniform grid)
- Lightbox view with prev/next navigation
- Upload button with drag & drop zone
- Photo count badges on album covers

### 6. Diary (Deník)
- Timeline of diary entries, newest first
- Each entry: date header, handwritten-style text (Kalam font), optional photo
- Folder organization (by year/season)
- Create entry: rich text area with date picker
- Warm, personal aesthetic — slightly different from the rest of the app

### 7. Reconstruction (Rekonstrukce)
- Project cards with: title, status (planned/in-progress/done), priority, description
- Kanban-style or list view
- Status badges: color-coded (amber=planned, blue=in progress, green=done)
- Click to expand: detailed description, cost estimate, assigned person, photos

### 8. Admin Panel
- Member list with: avatar, name, email, role badge (Admin/User/Guest)
- Role management dropdown
- Invite new member (email input + send button)
- Ban/remove member (with confirmation)
- Activity log preview

### 9. Cabin Settings (Nastavení chaty)
- Form sections: Cabin name, location (GPS coordinates), description
- Feature toggles: enable/disable Diary, Reconstruction, Gallery etc.
- Check-in/check-out time configuration
- Wallpaper/background image upload
- Danger zone: delete cabin (red bordered section)

### 10. Login / Register
- Centered card on nature background
- Logo at top
- Email + password inputs
- "Zapamatovat si mě" checkbox
- "Přihlásit se" emerald button
- Link to register / forgot password
- Registration: username, email, password, confirm password

---

## Button Styles
- **Primary:** Emerald bg (#3f7b63), white text, 8px radius, subtle shadow. Hover: darken + lift 1px
- **Secondary:** White bg, emerald border, emerald text. Hover: light emerald bg
- **Danger:** Red bg (#dc2626), white text. Used only for delete/destructive actions
- **Ghost:** Transparent, muted text, no border. For low-priority actions
- **Icon Button:** 36×36px square, transparent bg, rounded, icon centered

## Form Inputs
- White bg, 1px #cbd5e1 border, 8px radius, 12px padding
- Focus: emerald border + 3px emerald glow (15% opacity)
- Error: red border + light red background + error message below
- Placeholder: #6b7280 (WCAG AA compliant)

## Status Badges / Tags
- Small rounded pills (full radius)
- Confirmed: emerald bg + white text
- Soft: amber bg + dark text
- Backup: gray bg + dark text
- Each user has assigned color for their reservation bars

## Cards
- White bg (#ffffff) or 95% opacity for glass effect
- 12–16px border radius
- Subtle green-toned shadow
- 1px #f4f7f5 or #e5e7eb border
- Padding: 20–24px

## Empty States
- Centered in container
- Illustrative icon or emoji (not heavy illustrations)
- Czech text: "Zatím žádné rezervace" / "Přidejte první poznámku"
- CTA button below

## Toast Notifications
- Bottom-right positioned
- Rounded card with icon (✓ success, ✕ error, ℹ info)
- Auto-dismiss after 4 seconds
- Slide-in animation from right

---

## Key Design Principles
1. **Nature-inspired warmth** — emerald/sage green palette, soft shadows, no harsh contrasts
2. **Content floats above nature** — fullscreen background photo, content in white cards/glass
3. **Mobile-first** — every screen must work beautifully on phone
4. **Generous whitespace** — never cramped, breathable layouts
5. **Consistent interactions** — all buttons have hover lift, all modals have glass backdrop
6. **Czech language** — all text labels, buttons, messages are in Czech
7. **No decorative icons** — use Unicode symbols (× ← → ✓ ✎) or simple SVG icons
8. **Accessibility** — WCAG AA contrast, 44px minimum touch targets, visible focus states

---

## Responsive Breakpoints
- **Mobile:** < 768px — single column, bottom nav, stacked layouts
- **Tablet:** 768px–1024px — 2 columns where appropriate, top nav
- **Desktop:** > 1024px — full multi-column layouts, sidebar panels

---

## What to Generate

**CRITICAL: Generate BOTH a desktop (1440px) AND a mobile (375px) version for EVERY page.** Each page must have two separate screens side by side — desktop on the left, mobile on the right.

### Desktop versions (1440×900px viewport):
- Full multi-column layouts with sidebar panels
- Horizontal TopBar navigation
- Wide calendar grid, side-by-side master-detail panels

### Mobile versions (375×812px viewport — iPhone-sized):
- Single-column stacked layouts
- Bottom tab navigation bar (5 tabs: Přehled, Rezervace, Nákupy, Poznámky, Galerie)
- Compact mobile header (hamburger or minimal branding)
- Calendar: simplified compact grid, tappable cells (44px min touch target)
- Sidebar content becomes full-screen overlay/modal on mobile
- Cards stack vertically with reduced padding
- Floating action buttons (FAB) for primary actions

### Pages to generate (BOTH desktop + mobile for each):
1. **App Shell** — TopBar (desktop) + Bottom Nav (mobile) + background
2. **Dashboard (Přehled)** — Widget grid (desktop: 3 cols, mobile: 1 col stacked)
3. **Reservations (Rezervace)** — Calendar + sidebar (desktop: split, mobile: calendar full-width, list as separate tab/screen)
4. **Reservation Detail** — Detail view with actions (desktop: sidebar panel, mobile: full-screen card)
5. **Booking Modal** — Create/edit reservation form (desktop: centered modal, mobile: full-screen sheet sliding from bottom)
6. **Notes (Poznámky)** — Thread list + detail (desktop: master-detail, mobile: list → tap → detail screen)
7. **Shopping (Nákupy)** — Shopping lists with items (desktop: wide list, mobile: compact checklist)
8. **Gallery (Galerie)** — Album grid + photo grid + lightbox (desktop: 4-col grid, mobile: 2-col grid)
9. **Diary (Deník)** — Timeline entries in Kalam font (desktop: centered column, mobile: card stack)
10. **Reconstruction (Rekonstrukce)** — Project cards with status (desktop: kanban/grid, mobile: card list)
11. **Admin Panel** — Member list + roles (desktop: table view, mobile: card list)
12. **Cabin Settings (Nastavení)** — Settings form sections (desktop: wide form, mobile: stacked sections)
13. **Login / Register** — Auth screens (desktop: centered card, mobile: full-width card)
14. **Confirmation Dialog** — Delete/destructive action modal (both sizes)
15. **Empty States** — At least 2 examples of empty state screens (no data yet)

### Mobile-specific patterns to show:
- **Bottom sheet modals** — slide up from bottom, rounded top corners, drag handle
- **Swipe actions** on list items (swipe left to delete, swipe right to complete)
- **Pull-to-refresh** indicator
- **Compact cards** — less padding (12–16px), smaller font sizes
- **Sticky headers** — month name sticks on scroll in calendar
- **Touch-friendly controls** — all interactive elements minimum 44×44px

Use the exact color palette, typography, spacing, and component styles described above. The result should feel like a premium, polished SaaS product — not a template or wireframe. Both desktop and mobile versions must maintain the same visual identity — "floating glass in a forest" aesthetic.
