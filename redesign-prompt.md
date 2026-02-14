# 🎨 Redesign Prompt: Chata Reservation App - Moderní & Přívětivý Zážitek

## ⚠️ DŮLEŽITÉ: Toto je WEBOVÁ APLIKACE

**Toto je plně webová aplikace (Single Page Application) běžící v prohlížeči.**
- ❌ NE mobilní nativní aplikace (ne React Native, ne Flutter, ne Swift/Kotlin)
- ❌ NE desktopová aplikace (ne Electron, ne Tauri)
- ✅ **WEBOVÁ APLIKACE** — HTML + CSS + TypeScript, servírovaná přes Express
- ✅ Běží v prohlížeči (Chrome, Firefox, Safari, Edge)
- ✅ Responsive web design — přizpůsobený pro desktop, tablet i mobil
- ✅ Vanilla TypeScript + CSS — žádný framework (ne React, ne Vue, ne Svelte)
- ✅ Stávající SPA router, stávající backend API

**Výstupem redesignu jsou CSS soubory a TypeScript moduly, které vykreslují HTML do DOM.**

---

## 📋 Kontext Aplikace

Redesignuj webovou aplikaci pro správu chaty s těmito hlavními funkcemi:
- **Rezervace** - kalendář rezervací chaty pro různé uživatele
- **Nákupní seznam** - sdílený seznam s rozdělenými náklady
- **Nástěnka** - rychlé poznámky a zprávy
- **Deník** - záznamy z pobytů v chatě s fotkami
- **Galerie** - fotografie organizované do složek
- **Rekonstrukce** - plánování vylepšení chaty, hlasování o nápadech

**Současný stav:**
- Funkční, ale nudný klasický webový design
- Technický pohled na data
- Chybí emocionální spojení s chatou
- Málo interaktivní, spíše formulářové rozhraní

**Technologie:**
- Frontend: Vanilla TypeScript + CSS (žádný React/Vue/Svelte!)
- Backend: Express + PostgreSQL + Prisma
- Single Page Application (SPA) s vlastním routerem (`lib/router.ts`)
- Stránky se renderují do DOM přes TypeScript (`pages/*.ts`)
- Styly jsou v samostatných CSS souborech (`styles/*.css`)
- Aplikace se servíruje přes Vite (dev) / Express static (prod)
- **Cíl: Redesign CSS + úprava TS renderovacích funkcí**

---

## 🎯 Cíle Redesignu

### 1. **Chatový Feeling & Přirozená Komunikace**
- **Konverzační rozhraní** - interakce připomínají chat/messenger
- **Časová osa** - aktivity zobrazené jako příběh, ne jen data
- **Osobní tón** - "Ahoj Honzo!" místo "Uživatel: honza"
- **Rychlý feedback** - emoční reakce (❤️, 👍, 🎉) na události
- **Typing indicators** když někdo přidává obsah

### 2. **Opravdový Zážitek z Chaty**
- **Atmosférické pozadí** - fotky přírody, lesa, hor
- **Sezónní témata** - jiný vzhled v létě vs. zimě
- **Příběhový kontext** - "Byl jsi tu naposledy před 3 měsíci"
- **Vzpomínky** - "Před rokem v tento den jste byli na Petříně"
- **Počasí widget** - aktuální počasí v místě chaty

### 3. **Moderní UX Vzory**
- **Card-based design** - každá akce/událost je karta
- **Infinite scroll** místo stránkování
- **Optimistic UI** - okamžitá odezva (data se aktualizují na pozadí)
- **Skeleton screens** během načítání
- **Smooth animations** - přechody, fade-in, slide efekty
- **Hover & click interactions** - tooltips, context menus, drag & drop

---

## 🎨 Design Směr

### Visual Style
**Inspirace:** Discord + Notion + Instagram + Spotify
- **Light mode first** (s možností tmavého režimu)
- **Skleněný morfismus** (glassmorphism) - průsvitné panely
- **Jemné stíny & blur** místo ostrých rámečků
- **Organické tvary** - zaoblené rohy (12-24px border-radius)
- **Nordic paleta** - čistota, minimalismus, skandinávský styl

### Barevné Schéma - Moderní Nordic
**Pocit:** Moderní glamping, čistota, minimalismus, "IKEA" styl

```css
/* Light Mode (Primary) */
--primary: #37474F;         /* Břidlicová šedá - hlavní prvky */
--secondary: #B0BEC5;       /* Světlá šedá - sekundární prvky */
--accent: #E07A5F;          /* Cihlová oranžová - akce, tlačítka */
--bg-light: #FFFFFF;        /* Čistě bílá - pozadí */
--bg-card: #FAFAFA;         /* Velmi světlá - karty */
--bg-hover: rgba(55, 71, 79, 0.04);  /* Jemný hover efekt */
--text-primary: #263238;    /* Téměř černá pro čitelnost */
--text-secondary: #546E7A;  /* Šedá pro méně důležité */
--text-muted: #90A4AE;      /* Velmi jemný text */

/* Accent Variants */
--accent-light: #F4A89D;    /* Světlejší verze pro hover */
--accent-dark: #C86850;     /* Tmavší pro pressed state */

/* Functional Colors */
--success: #66BB6A;         /* Zelená - úspěch */
--warning: #FFA726;         /* Oranžová - varování */
--error: #EF5350;           /* Červená - chyba */
--info: #42A5F5;            /* Modrá - info */
```

```css
/* Dark Mode (Alternative) */
--primary: #E07A5F         /* Accent se stává primary v dark */
--secondary: #546E7A       /* Tlumenější šedá */
--accent: #F4A89D          /* Světlejší accent pro kontrast */
--bg-dark: #1E1E1E         /* Jemně teplá černá */
--bg-card: #2A2A2A         /* Karty */
--bg-hover: rgba(224, 122, 95, 0.08)
--text-primary: #ECEFF1    /* Téměř bílá */
--text-secondary: #B0BEC5  /* Světlá šedá */
--text-muted: #78909C      /* Tlumenější */
```

### Typografie
- **Headings:** Inter nebo Poppins (moderní, čitelné, skandinávský pocit)
- **Body:** System fonts (SF Pro, Segoe UI, -apple-system) pro rychlost
- **Mono:** JetBrains Mono pro datumy/časy
- **Font Weights:** 400 (regular), 500 (medium), 600 (semibold) - jemné rozdíly
- **Variable fonty** - plynulé přechody tlouštky

---

## 💬 Chatový Interface - Konkrétní Návrhy

### Rezervace jako Konverzace
**Styl:** Čistý, vzdušný, časová osa zleva doprava

```
┌─────────────────────────────────────────┐
│  📅  Rezervace                          │
├─────────────────────────────────────────┤
│                                         │
│  [Avatar] Ty • před 2 hodinami          │
│  ┌─────────────────────────────────┐   │
│  │ Zarezervoval jsi 23.-25. února  │   │
│  │ Účel: Lyžování ⛷️               │   │
│  │                                 │   │
│  │ [Upravit] [Zrušit]              │   │
│  └─────────────────────────────────┘   │
│       👍 2   💬 1                       │
│                                         │
│  [Avatar] Jana • před 1 dnem            │
│  ┌─────────────────────────────────┐   │
│  │ Máme backup rezervaci 1.-3.3.   │   │
│  │ kdyby někdo zrušil              │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓     │
│  ┃  + Přidat rezervaci            ┃     │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛     │
└─────────────────────────────────────────┘
```

### Nákupní Seznam - Scroll Feed
```
┌─────────────────────────────────────────┐
│  🛒  Co potřebujeme                     │
├─────────────────────────────────────────┤
│                                         │
│  ⚪ [X] Mléko (2L)                      │
│      Přidal: Martin • 89 Kč             │
│      Dělí: ty, Martin, Jana             │
│      ↻ Koupil Martin před hodinou       │
│                                         │
│  ⚪ [ ] Toaletní papír                  │
│      Přidal: Ty • právě teď             │
│      ← swipe pro smazání                │
│                                         │
│  💬 Přidat položku...                   │
│                                         │
└─────────────────────────────────────────┘
```

### Deník - Timeline Stories
```
┌─────────────────────────────────────────┐
│  📖  Deník                              │
│  ┌───┬───┬───┬───┬───┐  ← stories      │
│  │🏔️│⛷️│🌲│🔥│➕│                     │
│  └───┴───┴───┴───┴───┘                 │
├─────────────────────────────────────────┤
│                                         │
│  23. února 2026                         │
│  ┌─────────────────────────────────┐   │
│  │  [Foto: západ slunce]           │   │
│  │  ──────────────────────────     │   │
│  │  "Dnes jsme vyrazili na         │   │
│  │  Sněžku. Počasí bylo            │   │
│  │  úžasné! ❄️"                    │   │
│  │                                 │   │
│  │  - Honza                        │   │
│  └─────────────────────────────────┘   │
│     ❤️ 5   💬 3                        │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🎭 Interaktivní Prvky

### Komponenty - Příklady

#### Button Variants (Nordic Style)
```css
/* Primary Button - Accent color */
.button-primary {
  background: #E07A5F;
  color: #FFFFFF;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(224, 122, 95, 0.2);
}

.button-primary:hover {
  background: #F4A89D;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(224, 122, 95, 0.3);
}

.button-primary:active {
  background: #C86850;
  transform: translateY(0);
}

/* Secondary Button - Ghost style */
.button-secondary {
  background: transparent;
  color: #37474F;
  border: 1px solid #B0BEC5;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.button-secondary:hover {
  background: #FAFAFA;
  border-color: #37474F;
}

/* Icon Button */
.button-icon {
  background: transparent;
  color: #546E7A;
  border: none;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.button-icon:hover {
  background: rgba(55, 71, 79, 0.08);
  color: #37474F;
}
```

#### Card Component
```css
.card {
  background: #FAFAFA;
  border: 1px solid #ECEFF1;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(55, 71, 79, 0.08);
}

.card:hover {
  background: #FFFFFF;
  border-color: #E07A5F;
  box-shadow: 0 4px 12px rgba(55, 71, 79, 0.12);
  transform: translateY(-2px);
}

.card-interactive {
  cursor: pointer;
}

.card-interactive:active {
  transform: translateY(0);
}
```

### Mikro-interakce (Web)
- **Hover efekty** - karty lehce ztmavnou (#F5F5F5), jemný stín
- **Confetti animace** při dokončení rezervace (CSS particles, v accent barvě)
- **Ripple efekt** při kliknutí - materiálový styl v #E07A5F
- **Subtle pulse** u nových notifikací (ne agresivní)
- **CSS transitions** - smooth 0.2-0.3s přechody na hover/focus
- **Keyboard shortcuts** - Enter pro potvrdit, Esc pro zavřít

### Smart Features (Web)
- **Quick actions** - right-click context menu, hover toolbar
- **Tooltip hints** - "Obvykle v tomto období jezdí Martin" (šedý text)
- **Browser notifications** - "Chybí ti 3 fotky do vánočního alba"
- **Markdown podpora** v poznámkách (bold **text**, emoji 🎉)
- **Drag & drop** - HTML5 drag API pro fotky s drop zone preview
- **Command palette** (Ctrl+K) - overlay dialog s vyhledáváním

---

## 🖥️ Responsive Web Design (Desktop First)

**Primární cíl: Desktop prohlížeč.** Responsivita na menší obrazovky je bonus, ne priorita.

### Desktop (1200px+) — HLAVNÍ CÍLE
- **Sidebar** - navigace vlevo, light bg (#FAFAFA), icons + labels
- **Hlavní obsah** - střed (max-width: 900px), bílé pozadí
- **Metadata panel** - vpravo (detail rezervace, quick stats)
- **Sticky header** - breadcrumbs + search + quick actions
- **Mouse hover states** - preview, tooltips, context menus

### Tablet (768-1199px)
- **Collapsed sidebar** - jen ikony, expanduje on hover
- **Karty** s padding 24px
- **Grid layout** - 2 sloupce kde je to vhodné

### Mobil (< 768px) — Nice to have
- **Hamburger menu** místo sidebar
- **Stacked karty** s 16px padding
- **Touch-friendly** tlačítka (min 44px tap target)

---

## ✨ Speciální Funkce

### Dashboard — Přehled (IMPLEMENTOVÁNO ✅)
**Toto je první stránka, kterou uživatel vidí po přihlášení.**

Dashboard je již implementován v `src/frontend/pages/dashboard.ts` a obsahuje:

```
"Dobré odpoledne, Honzo!"
Zde je přehled vaší chaty

┌──────────────────────┬──────────────────────┐
│ ☀️ Počasí na chatě    │ 🏠 Právě na chatě    │
│ 5°C  Oblačno          │ Martin je na chatě    │
│ Třebenice             │ 10.2. — 15.2.         │
│ Vlhkost 75%, Vítr 12  │ Lyžování              │
└──────────────────────┴──────────────────────┘

┌──────────────────────┬──────────────────────┐
│ 📅 Nadcházející       │ 🛒 K dokoupení        │
│ Martin    10.-15.2.   │ ● Toaletní papír      │
│ Jana      23.-25.2.   │ ● Káva                │
│ Ty        1.-3.3.     │ ● Sůl                 │
│ → Všechny rezervace   │ → Nákupní seznamy     │
├──────────────────────┼──────────────────────┤
│ 📌 Poslední vzkazy    │ 📖 Deník              │
│ Jana: "Nezapomeňte…" │ Leden · Martin        │
│ Martin: "Klíče…"      │ "Dnes jsme vyrazili…" │
│ → Nástěnka            │ → Celý deník          │
└──────────────────────┴──────────────────────┘

┌─────┬──────┬──────┬──────┐
│  5  │  48  │  12  │  3   │  ← Statistiky
│Rezer│Fotek │Zápis │Koupit│
└─────┴──────┴──────┴──────┘
```

**Obsahuje:**
- Počasí z Open-Meteo API (Třebenice) — bez API klíče
- Kdo je právě na chatě / tvoje příští návštěva
- Nejbližší 5 nadcházejících rezervací
- Nenakoupené položky z nákupního seznamu
- Poslední 3 vzkazy z nástěnky
- Poslední 2 zápisky z deníku
- Souhrnné statistiky (rezervace, fotky, deník, nákup)
- Auto-refresh každých 5 minut

Backend endpoint: `GET /api/dashboard` (jeden request, všechna data najednou)

### Context-Aware Actions
- **V kalendáři** - sugesce volných termínů
- **V galerii** - automatické vytvoření alba z dat
- **V nástěnce** - @mentions uživatelů
- **V deníku** - geolokace, počasí, tagy

### Gamification (lehká)
- **Streak** - kolikrát jsi byl v chatě po sobě
- **Badges** - "Nákupní expert" (10+ položek nakoupeno)
- **Leaderboard** - kdo má nejvíc fotek v galerii
- **Progress bars** - "Jarní úklid 70% hotovo"

---

## 🔧 Technická Implementace

### CSS Architektura
```
styles/
├── tokens/             # Nordic barevná paleta
│   ├── spacing.css     # 4px base grid
│   ├── typography.css  # Font scales
│   ├── shadows.css     # Jemné stíny
│   └── animations.css  # Smooth transitions
├── components/     # Komponenty
│   ├── card.css
│   ├── button.css
│   ├── avatar.css
│   ├── input.css
│   └── ...
├── layouts/        # Layouty
│   ├── dashboard.css
│   ├── mobile.css
│   └── tablet.css
└── themes/         # Témata
    ├── light.css  (default - Nordic)
    └── dark.css   (alternative)
```

**Příklad tokens/colors.css:**
```css
:root {
  /* Nordic Light Mode */
  --primary: #37474F;
  --secondary: #B0BEC5;
  --accent: #E07A5F;
  --bg: #FFFFFF;
  --surface: #FAFAFA;
  --text: #263238;
  --text-secondary: #546E7A;
  
  /* Shadows - jemné, realistické */
  --shadow-sm: 0 1px 2px rgba(55, 71, 79, 0.08);
  --shadow-md: 0 4px 12px rgba(55, 71, 79, 0.12);
  --shadow-lg: 0 8px 24px rgba(55, 71, 79, 0.16);
}

[data-theme="dark"] {
  /* Nordic Dark Mode */
  --primary: #E07A5F;
  --secondary: #546E7A;
  --accent: #F4A89D;
  --bg: #1E1E1E;
  --surface: #2A2A2A;
  --text: #ECEFF1;
  --text-secondary: #B0BEC5;
  
  /* Tmavší stíny */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.4);
}
    └── light.css
```

### Animace Library
- **Framer Motion** - komplexní animace (nebo vanilla CSS)
- **GSAP** - timeline animace (volitelné)
- **Lottie** - vektorové animace (ikony, loadery)

### Performance
- **Lazy loading** - obrázky načítané až při scrollu
- **Virtual scrolling** - u dlouhých seznamů
- **CSS containment** - izolace repaint oblastí
- **Preload kritických fontů**
- **Service Worker** - offline cache (PWA)

---

## 📐 Komponenty Hierarchy

```
App
├── Shell (sidebar, navigation)
│   ├── Sidebar
│   │   ├── Logo
│   │   ├── NavLinks
│   │   └── UserProfile
│   ├── TopBar
│   │   ├── Breadcrumbs
│   │   ├── SearchBar
│   │   └── NotificationBell
│   └── ResponsiveNav (hamburger for small screens)
│
├── Pages
│   ├── Dashboard (timeline view)
│   ├── Reservations (calendar + feed)
│   ├── ShoppingList (checklist feed)
│   ├── Notes (message board)
│   ├── Diary (stories + timeline)
│   ├── Gallery (grid + lightbox)
│   └── Reconstruction (kanban board)
│
└── Shared Components
    ├── Card (base component)
    ├── Button (variants: primary, ghost, icon)
    ├── Avatar (user, group)
    ├── Modal (overlay dialogs)
    ├── Toast (notifications)
    ├── Skeleton (loading states)
    ├── EmptyState (když nejsou data)
    └── FloatingActionButton

```

---

## 🎬 Onboarding Experience

### První Návštěva
1. **Welcome screen** - "Vítej v naší chatě! 🏔️"
2. **Quick tour** - 3 slide carousel s hlavními funkcemi
3. **Personalizace** - vyber si avatar, barvu
4. **First action** - "Přidej svou první rezervaci"

### Empty States (živé, ne nudné)
```
┌─────────────────────────────────┐
│         🗓️                      │
│   Ještě žádné rezervace         │
│                                 │
│   Buď první, kdo si zarezervuje │
│   víkend v chatě!               │
│                                 │
│   [➕ Přidat rezervaci]         │
└─────────────────────────────────┘
```

---

## 🚀 Implementační Fáze

### Fáze 1: Foundation (1-2 týdny)
- [ ] Design tokens & variables
- [ ] Base komponenty (Card, Button, Avatar)
- [ ] Layout system (Shell, Navigation)
- [ ] Dark mode implementace
- [ ] Responsive breakpoints

### Fáze 2: Conversational UI (2-3 týdny)
- [ ] Přepsat Rezervace na timeline view
- [ ] Přepsat Nástěnku na message feed
- [ ] Přepsat Nákupní seznam na checklist feed
- [ ] Přidat reakce & komentáře
- [ ] Real-time updates (optional: WebSockets)

### Fáze 3: Rich Content (1-2 týdny)
- [ ] Deník - stories rozhraní
- [ ] Galerie - grid/masonry layout
- [ ] Lightbox pro fotky
- [ ] Image optimization & lazy loading
- [ ] Drag & drop upload

### Fáze 4: Polish & Joy (1 týden)
- [ ] Animace & transitions
- [ ] Mikro-interakce
- [ ] Keyboard navigation & focus states
- [ ] Empty states
- [ ] Loading states (skeletons)
- [ ] Error states (friendly messages)

### Fáze 5: Smart Features (1-2 týdny)
- [ ] Dashboard timeline
- [ ] Quick actions & shortcuts
- [ ] Command palette (Ctrl+K)
- [ ] Smart suggestions
- [ ] Gamification prvky

---

## 📚 Inspirace & Reference

### Aplikace k Prozkoumání
- **Linear** - čistý nordic design, animace, command palette
- **Height** - minimalistický project manager
- **Notion** - card design, smooth UX, bílý minimalistický styl
- **Superhuman** - keyboard-first, light UI, polish
- **Airbnb** - booking UX, calendar interactions, čistota
- **Instagram** - stories layout inspirace pro deník
- **Figma** - čistý web interface, toolbar design

### Design Resources
- **Dribbble** - hledej "nordic web design", "minimal web dashboard", "scandinavian UI"
- **Mobbin** - web UI patterns, čisté dashboardy
- **Laws of UX** - principy dobrého designu
- **Refactoring UI** - praktické tipy (kniha Tailwind autorů)

---

## 🎯 Success Metrics

Redesign bude úspěšný, když:
- ✅ **Emocionální reakce** - uživatelé řeknou "Wow, to je krásné!"
- ✅ **Intuitivnost** - nový uživatel zvládne rezervaci bez nápovědy
- ✅ **Rychlost** - každá akce má okamžitý feedback (<100ms)
- ✅ **Radost z používání** - lidé otevřou web i když nic nepotřebují
- ✅ **Desktop optimized** - perfektní na velkém monitoru
- ✅ **Responsive** - použitelné i na tabletu/mobilu v prohlížeči
- ✅ **Return rate** - uživatelé se vracejí častěji

---

## 💡 Klíčové Principy

> **"Tvořte silné a jasné vizuální hierarchie"**  
> Nejdůležitější akce jsou největší, nejtmavší, nejbarevnější

> **"Nebojte se prázdného prostoru"**  
> Breathing room dělá rozhraní elegantní

> **"Feedback je král"**  
> Každá akce uživatele musí mít okamžitou odezvu

> **"Content first, chrome second"**  
> Data a obsah jsou hvězdy, UI je jen kulisa

> **"Konzistence vítězí nad kreativitou"**  
> Stejné akce vypadají a chovají se stejně všude

---

## 🎨 Quick Start Checklist

Začni tím, že:
1. ✅ Nastav CSS proměnné (tokeny) pro barvy, spacing, fonts
2. ✅ Vytvoř base `<Card>` komponentu - základ celého designu
3. ✅ Implementuj dark mode pomocí `prefers-color-scheme`
4. ✅ Přepracuj jednu stránku (např. Dashboard) jako proof of concept
5. ✅ Získej feedback od uživatelů na prvním prototypu
6. ✅ Iteruj a postupně přidávej stránku po stránce

**Pamatuj:** Redesign není jen o vzhledu - je o zážitku a emocích! 🚀✨
