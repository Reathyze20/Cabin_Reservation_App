# 📚 kdynachatu.cz — Kompletní Knowledge Base

> NOTE: This file is an extended analysis document, not the shortest canonical source of truth.
> Canonical short facts now live in `memories/repo/stack-facts.md` and AI asset inventory lives in `memories/repo/ai-infrastructure-map.md`.

> **Generováno:** 2026-04-05  
> **Verze aplikace:** 1.0.0 (single-tenant MVP → multi-tenant SaaS přechod)  
> **Stav:** Migrace z Vanilla TS → React 18 — frontend-v2 aktivní

---

## 📊 Summary Card

| Dimenze | Stav | Zralost | Poznámky |
|---------|------|---------|----------|
| **Backend API** | ✅ | Beta | 21 route souborů, ~115 endpointů, Zod validace na většině |
| **Frontend v2 (React)** | ✅ | Beta | 14 features, 9 hlavních stránek, TanStack Query, shadcn/ui |
| **Legacy Frontend** | ⚠️ | Deprecated | 1 stránka zbývá (cabin-settings.ts), zbytek migrace hotov |
| **Database Schema** | ✅ | Production | 22 modelů, 22 migrací, multi-tenant cabinId na všech tabulkách |
| **Autentizace & Auth** | ✅ | Beta | JWT 30d, 3 role (admin/user/guest), invite links, email verifikace |
| **Multi-tenant Readiness** | ⚠️ | Partial | cabinId na modelech, requireCabin middleware, X-Cabin-Id header; chybí tenant routing |
| **Mobile Experience** | ✅ | Beta | Responsive layout, MobileNav, MobileHeader, PWA ready |
| **Testing** | ❌ | Minimal | 1 test soubor (VerifyEmailPage.test.tsx), vitest nastaven |
| **CI/CD & DevOps** | ✅ | Production | GitHub Actions → SSH → PM2, failsafe restart, Prisma migrate |
| **Dokumentace** | ⚠️ | Minimal | README.md, family-ready a operations docs, copilot instructions — chybi API docs |
| **Bezpečnost** | ✅ | Beta | helmet, rate-limit, JWT, Zod validace, ownership checks, CORS |
| **Výkon** | ✅ | Beta | compression, Promise.all(), lazy loading, image optimization (sharp) |

---

## 🗺️ Sekce 1: Feature Map

### Kompletní mapa funkcí

| Funkce | Backend API | React FE | Legacy FE | Prisma Model | Stav | Kompletnost |
|--------|:-----------:|:--------:|:---------:|:------------:|------|:-----------:|
| **Autentizace (Login)** | ✅ auth.ts | ✅ LoginForm | ❌ deprecated | ✅ User | Complete | 100% |
| **Registrace (Workspace)** | ✅ auth.ts | ✅ RegisterForm | ❌ deprecated | ✅ Cabin + User | Complete | 100% |
| **Email verifikace** | ✅ auth.ts | ✅ VerifyEmailPage | ❌ deprecated | ✅ User | Complete | 95% |
| **Invite Links** | ✅ invites.ts | ✅ InvitePage | ❌ | ✅ InviteLink | Complete | 100% |
| **Onboarding** | ⚠️ cabin.ts | ✅ OnboardingPage | ❌ | ✅ Cabin | Complete | 90% |
| **Dashboard** | ✅ dashboard.ts | ✅ DashboardPage (9 komponent) | ❌ deprecated | aggregace | Complete | 95% |
| **Počasí** | ❌ (klient FE) | ✅ WeatherCard | ❌ deprecated | ❌ (Open-Meteo API) | Complete | 100% |
| **Zen Mode** | ✅ wallpapers.ts | ✅ ZenMode | ❌ | ✅ Wallpaper | Complete | 100% |
| **Rezervace** | ✅ reservations.ts (16 endpointů) | ✅ ReservationsPage (12 komponent) | ❌ deprecated | ✅ Reservation, UserAvailability, MonthlyNote, ReservationWatcher | Complete | 95% |
| **Kalendář** | ✅ (součást reservations) | ✅ CalendarGrid, CalendarCell | ❌ deprecated | ✅ | Complete | 90% |
| **Dostupnost uživatelů** | ✅ reservations.ts (4 endpointy) | ✅ AvailabilityModal | ❌ | ✅ UserAvailability | Complete | 90% |
| **Checkout odjezdu** | ✅ reservations.ts (2 endpointy) | ✅ CheckoutSection, DepartureBanner | ❌ | ✅ Reservation fields | Complete | 95% |
| **Měsíční poznámky** | ✅ reservations.ts (2 endpointy) | ✅ (v kalendáři) | ❌ | ✅ MonthlyNote | Complete | 100% |
| **Chat / Nástěnka** | ✅ channels.ts, messages.ts, notes.ts (22 endpointů) | ✅ NotesPage (10 komponent) | ❌ deprecated | ✅ NoteThread, Note, NoteReaction, ThreadReadStatus | Complete | 95% |
| **Nákupní seznamy** | ✅ shoppingList.ts, shoppingLists.ts (16 endpointů) | ✅ ShoppingPage (13 komponent) | ❌ deprecated | ✅ ShoppingList, ShoppingListItem, ShoppingItemSplit | Complete | 95% |
| **Inventář (Zásoby)** | ✅ inventory.ts (7 endpointů) | ✅ InventoryRow, EditInventoryModal, PantryView | ❌ | ✅ InventoryItem | Complete | 90% |
| **Galerie** | ✅ gallery.ts (9 endpointů) | ✅ GalleryPage (6 komponent) | ❌ deprecated | ✅ GalleryFolder, GalleryPhoto | Complete | 95% |
| **Deník** | ✅ diary.ts (8 endpointů) | ✅ DiaryPage (7 komponent) | ❌ deprecated | ✅ DiaryFolder, DiaryEntry, DiaryEntryPhoto | Complete | 90% |
| **Rekonstrukce** | ✅ reconstruction.ts (6 endpointů) | ✅ ReconstructionPage (4 komponenty) | ❌ deprecated | ✅ ReconstructionItem, ReconstructionVote | Complete | 90% |
| **Admin Panel** | ✅ admin.ts, users.ts (11 endpointů) | ✅ AdminPage | ❌ deprecated | ✅ User | Complete | 90% |
| **Nastavení chaty** | ✅ cabin.ts (3 endpointy) | ✅ CabinSettingsPage | ⚠️ cabin-settings.ts | ✅ Cabin | Complete | 85% |
| **Super Admin** | ✅ superadmin.ts | ❌ | ❌ | ✅ User (isSuperAdmin) | Partial | 40% |
| **Logy** | ✅ logs.ts (4 endpointy) | ✅ (v AdminPage) | ❌ | ❌ (soubory) | Complete | 85% |
| **Error Reporting (klient)** | ✅ logs.ts (2 endpointy) | ✅ errorReporting.ts | ❌ | ❌ | Complete | 100% |
| **WebSocket (realtime)** | ✅ socket.ts | ✅ useSocket.ts | ❌ | ❌ | Partial | 50% |
| **Frost Alert** | ✅ weatherAlerts.ts (cron) | ✅ (dashboard badge) | ❌ | ✅ Cabin fields | Complete | 90% |
| **Handover Note** | ✅ workspace.ts | ✅ HandoverNote (dashboard) | ❌ | ✅ AppSettings | Complete | 100% |
| **PWA / Offline** | ❌ (backend not needed) | ⚠️ vite-plugin-pwa v dep, OfflineBanner | ❌ | ❌ | Partial | 60% |
| **Feature Flags** | ✅ cabin.ts (features JSON) | ✅ useCabinFeatures.ts, navRoutes.ts | ❌ | ✅ Cabin.features | Complete | 90% |

### Celkové skóre: **~88% dokončeno**

---

## 🏗️ Sekce 2: Architecture Analysis

### 2a. Backend Architektura

**Server:** [src/backend/server.new.ts](src/backend/server.new.ts)  
**Runtime:** Node.js ≥20, tsx (TypeScript execution), Express 4.21

**Middleware chain (v pořadí):**
1. `compression()` — Gzip/Brotli
2. `helmet()` — bezpečnostní HTTP hlavičky (CSP disabled)
3. `express.json({ limit: "10mb" })`
4. `trust proxy: 1` (pro Docker / reverse proxy)
5. `cors()` — v prod reflect origin, v dev allow all
6. Request ID + AsyncLocalStorage context
7. `httpLogger` — strukturované logování (pino)
8. Static files (uploads, dist/frontend)
9. **Route handlers** — 21 route souborů

**Autentizační flow:**
1. `POST /api/login` → Zod validace → bcrypt porovnání → JWT sign (30d expiry)
2. JWT payload: `{ userId, username, role, cabinId }`
3. `protect` middleware: ověří Bearer token → nastaví `req.user`
4. `requireCabin` middleware: ověří `req.user.cabinId` existuje → 403 pokud ne
5. Role check: inline v route handlerech (`req.user.role !== "admin"`)

**Rate Limiting:**
- Auth endpointy: 30 req / 15 min per IP
- Invite accept: rate limited (sdílí auth limiter)
- Ostatní: bez rate limitu

**Error handling vzor:**
- Konzistentní try/catch v route handlerech
- `logger.error(MODULE, message, { error: String(error) })`
- Response: `{ message: "Česky popsaná chyba" }` + HTTP status
- 500 errors automaticky dostanou `errorId` (request ID) přes response interceptor

**Background Jobs:**
- Frost alert cron — denně v 12:00, kontroluje Open-Meteo API pro všechny winterizované chaty
- Soubor: [src/backend/jobs/weatherAlerts.ts](src/backend/jobs/weatherAlerts.ts)

**WebSocket (Socket.io):**
- Path: `/ws`
- JWT autentizace v handshake
- Cabin-based rooms (`cabin:{cabinId}`) pro multi-tenant izolaci
- Helper `emitToCabin()` pro broadcast do konkrétní chaty
- **Zatím nepoužíván pro real-time aktualizace v UI** — pouze infrastruktura

**Logování:**
- Pino (JSON v produkci, pretty v dev)
- HTTP logger middleware
- Client error reporting endpointy (`/api/logs/client`, `/api/logs/client/anon`)

### 2b. Frontend Architektura (React — frontend-v2/)

**Entry point:** [frontend-v2/src/main.tsx](frontend-v2/src/main.tsx)  
**Root component:** [frontend-v2/src/App.tsx](frontend-v2/src/App.tsx)

**Stack:**
- React 19.2 + TypeScript 5.9 + Vite 7.3
- React Router DOM 7.13 (BrowserRouter, path-based routing)
- TanStack React Query 5.90 (data fetching + cache)
- Tailwind CSS 4.2 + shadcn/ui components
- Framer Motion (animace)
- date-fns (datumové utility)
- Zod 4.3 (frontend response validace)
- Socket.io-client (realtime — připraveno)

**Routing:**
- `App.tsx` definuje route table s lazy loading (code splitting)
- Guards: `PrivateRoute` (auth), `CabinGuard` (cabinId check), `AdminRoute` (role check)
- Error boundaries per feature (FeatureErrorFallback)
- 404 page (NotFoundPage)

**State Management:**
- **AuthContext** — user state, login/logout, role checks
- **TanStack Query** — všechna API data (queries + mutations)
- **Cabin features** — `useCabinFeatures()` hook + `isFeatureEnabled()`
- Žádný globální state store (Redux/Zustand) — nepotřeba

**API Client:**
- Axios instance s JWT interceptorem ([frontend-v2/src/api/client.ts](frontend-v2/src/api/client.ts))
- `X-Cabin-Id` header automaticky přidán
- 401 → auto-logout + toast
- Network error throttling (max 1 toast / 10s)
- Per-feature API moduly: `dashboard.ts`, `reservations.ts`, `notes.ts`, `shopping.ts`, `gallery.ts`, `diary.ts`, `reconstruction.ts`, `admin.ts`, `settings.ts`

**Centrální Zod schémata:**
- [frontend-v2/src/api/schemas.ts](frontend-v2/src/api/schemas.ts) — runtime validace API responses
- Pokrývá: Dashboard, Shopping, Notes

**Component Hierarchy:**
```
App.tsx
├── AuthProvider (context)
├── QueryClientProvider (TanStack Query)
├── AppRoutes
│   ├── LandingPage
│   ├── AuthPage (LoginForm / RegisterForm)
│   ├── VerifyEmailPage
│   ├── InvitePage
│   ├── OnboardingPage
│   └── AppShell (layout wrapper)
│       ├── TopBar
│       ├── MobileHeader
│       ├── MobileNav (bottom nav)
│       ├── ProfileDrawer
│       └── [Feature Pages] (lazy loaded)
│           ├── DashboardPage
│           ├── ReservationsPage
│           ├── NotesPage (Chat)
│           ├── ShoppingPage
│           ├── GalleryPage
│           ├── DiaryPage
│           ├── ReconstructionPage
│           ├── AdminPage
│           └── CabinSettingsPage
└── Toast (globální)
```

**Layout komponenty:** [frontend-v2/src/components/layout/](frontend-v2/src/components/layout/)
- `AppShell.tsx` — hlavní layout s TopBar, MobileNav, Outlet
- `TopBar.tsx` — desktop navigace
- `MobileHeader.tsx` — mobilní horní lišta
- `MobileNav.tsx` — mobilní spodní navigace
- `ProfileDrawer.tsx` — uživatelský profil slide-out

**Shared komponenty:** [frontend-v2/src/components/shared/](frontend-v2/src/components/shared/)
- `AnimalAvatar.tsx`, `AvatarPicker.tsx`, `ColorPicker.tsx`
- `ConfirmDialog.tsx`, `PromptDialog.tsx`, `Modal.tsx`
- `Toast.tsx` (sonner), `OfflineBanner.tsx`, `HelpFab.tsx`
- `FeatureErrorFallback.tsx`, `GlobalFallback.tsx`

**UI primitives (shadcn/ui):** [frontend-v2/src/components/ui/](frontend-v2/src/components/ui/)
- 14 komponent: avatar, badge, button, card, checkbox, dialog, dropdown-menu, form, input, label, scroll-area, separator, sheet, sonner

**Custom Hooks:**
- `useCabinFeatures.ts` — feature flags z `/api/cabin`
- `useDocumentTitle.ts` — dynamické page title
- `useMediaQuery.ts` — responsive breakpoint detection
- `useOnline.ts` — online/offline status
- `useSocket.ts` — Socket.io client s JWT auth

**CSS strategie:**
- Tailwind CSS jako primární
- 29 legacy CSS souborů v [frontend-v2/src/styles/](frontend-v2/src/styles/) pro specifický layout mapping
- CSS moduly pro rezervace (`Reservations.module.css`)
- Variables ve `variables.css`

### 2c. Data Architektura

**Prisma Schema:** [prisma/schema.prisma](prisma/schema.prisma)  
**22 modelů, 22 migrací**

**Model Overview — ER popis:**

```
Cabin (tenant root)
├── Users[] (1:N, onDelete: SetNull)
│   ├── Reservations[] (1:N, cascade)
│   ├── ShoppingListsCreated[] (1:N, cascade)
│   ├── NoteThreads[] (1:N, cascade)
│   ├── Notes[] (1:N, cascade)
│   ├── GalleryFolders[] (1:N, SetNull)
│   ├── GalleryPhotos[] (1:N, SetNull)
│   ├── DiaryFolders[] (1:N, cascade)
│   ├── DiaryEntries[] (1:N, cascade)
│   ├── ReconstructionItems[] (1:N, cascade)
│   ├── ReconstructionVotes[] (M:N)
│   ├── ReservationWatchers[] (M:N)
│   ├── InventoryItems (updatedBy) (1:N, SetNull)
│   ├── UserAvailabilities[] (1:N, cascade)
│   ├── InviteLinks[] (1:N, cascade)
│   ├── MonthlyNotes[] (1:N)
│   ├── NoteReactions[] (1:N, cascade)
│   └── ThreadReadStatuses[] (1:N, cascade)
├── Reservations[] (1:N, cascade)
│   └── ReservationWatchers[] (1:N, cascade)
├── ShoppingLists[] (1:N, cascade)
│   └── ShoppingListItems[] (1:N, cascade)
│       └── ShoppingItemSplits[] (M:N user)
├── NoteThreads[] (1:N, cascade)
│   ├── Notes[] (1:N, cascade)
│   │   ├── NoteReactions[] (1:N, cascade)
│   │   └── Replies (self-ref, SetNull)
│   └── ThreadReadStatuses[] (1:N, cascade)
├── GalleryFolders[] (1:N, cascade)
│   └── GalleryPhotos[] (1:N, cascade)
│       └── DiaryEntryPhotos[] (M:N)
├── DiaryFolders[] (1:N, cascade)
│   └── DiaryEntries[] (1:N, cascade)
├── ReconstructionItems[] (1:N, cascade)
│   └── ReconstructionVotes[] (M:N)
├── InventoryItems[] (1:N, cascade)
├── UserAvailabilities[] (1:N, cascade)
├── InviteLinks[] (1:N, cascade)
├── Wallpapers[] (1:N, cascade)
└── MonthlyNotes[] (1:N)

AppSettings (singleton per cabin: id = "cabin_{cabinId}")
```

**Multi-tenant izolace:**
- Každý model má `cabinId` field (kromě AppSettings, ShoppingItemSplit, DiaryEntryPhoto, ReconstructionVote)
- `requireCabin` middleware na všech data endpointech
- Queries filtrují přes `cabinId: req.user.cabinId`
- Frontend posílá `X-Cabin-Id` header (budoucí multi-cabin switching)

**File storage:**
- Upload cesta: konfigurovaná přes `UPLOADS_PATH` env var
- Fotky: `data/uploads/` s thumbnaily v `data/uploads/thumbs/`
- Wallpapery: `data/uploads/wallpapers/`
- Zpracování: sharp (resize, webp konverze)
- Serving: Express static s 7d cache, immutable headers

---

## 🔍 Sekce 3: Gap Analysis

### 3a. Feature Gaps

| # | Chybějící funkce | Dopad | Detail |
|---|-----------------|-------|--------|
| 1 | **Super Admin UI** | Medium | Backend existuje (`superadmin.ts`), ale React frontend chybí — admin musí používat API přímo |
| 2 | **Real-time updates** | Medium | Socket.io infrastruktura je hotová (server + client hook), ale **žádný feature ji nepoužívá** — chat nemá live updates, need page refresh |
| 3 | **Push notifikace** | Medium | PWA service worker je v dependencies, ale notifikace nejsou implementovány |
| 4 | **Offline mode** | Low | `OfflineBanner` existuje, TanStack Query má offline konfiguraci, ale žádná offline-first logika pro mutace |
| 5 | **Uživatelský profil** | Low | `ProfileDrawer` existuje, ale change avatar/color/password UI nebylo ověřeno |
| 6 | **Vyhledávání** | Low | Žádné globální vyhledávání přes moduly |
| 7 | **Notifikace v app** | Medium | Žádný notification center — uživatelé nevidí co se změnilo od poslední návštěvy |
| 8 | **Export dat** | Low | Žádný export (CSV, PDF) pro rezervace, nákupy, finance |

### 3b. Technické Gaps

| # | Gap | Soubor | Severity | Detail |
|---|-----|--------|----------|--------|
| 1 | **WebSocket nepoužíván** | channels.ts, messages.ts | Medium | Backend má `emitToCabin()`, ale nikdy nevolá po CRUD operacích — chat vyžaduje manuální refresh |
| 2 | **Zod validace chybí na některých endpointech** | channels.ts POST, cabin.ts PATCH | Low | `channels.ts` POST channel — safeParse inline, `cabin.ts` PATCH — inline validace místo Zod middleware |
| 3 | **noteThreads.ts duplikace** | noteThreads.ts vs channels.ts | Low | `noteThreads.ts` je deprecated, superseded by `channels.ts`, ale stále mountován v server.new.ts |
| 4 | **shoppingList.ts legacy GET /** | shoppingList.ts L14 | Low | Samostatný GET endpoint `GET /api/shopping-list/` vedle `GET /api/shopping-lists/` — potenciální zmatek |
| 5 | **Missing pagination** | notes.ts, gallery.ts | Medium | `GET /api/notes/` nemá pagination — u chatů s 1000+ zprávami bude performance issue |
| 6 | **superadmin.ts not mounted** | server.new.ts | Medium | `superadmin.ts` existuje ale **není importován ani mountován** v server.new.ts! |
| 7 | **Frontend Zod validace neúplná** | api/schemas.ts | Low | Schémata pokrývají jen Dashboard, Shopping, Notes — chybí Gallery, Diary, Reconstruction, Admin |
| 8 | **1 test soubor** | frontend-v2/src/test/ | High | Pouze `VerifyEmailPage.test.tsx` + `setup.ts` — prakticky nulové test coverage |
| 9 | **CSP disabled** | server.new.ts L57 | Medium | `contentSecurityPolicy: false` — XSS ochrana oslabena |
| 10 | **JWT secret fallback** | config.ts | Low | Default JWT secret v dev mode — ok, ale varování je správně implementováno |

### 3c. Migration Gaps (Legacy → React)

| Legacy stránka | React ekvivalent | Stav migrace |
|----------------|-----------------|:------------:|
| **cabin-settings.ts** | ✅ CabinSettingsPage | ⚠️ Obojí existuje — legacy by měl být odstraněn |

**Stav migrace: ~99% dokončeno** — zbývá jen `cabin-settings.ts` v legacy FE, která je nyní v React jako `CabinSettingsPage`.

Legacy frontend (`src/frontend/`) obsahuje:
- `pages/cabin-settings.ts` — jediná zbývající stránka
- `lib/` — router, common helpers (deprecated)
- `styles/` — CSS soubory (některé přeneseny do frontend-v2)

### 3d. Multi-tenant Gaps

| # | Gap | Detail | Priorita |
|---|-----|--------|----------|
| 1 | **Subdomain routing** | Cabin má `subdomain` field, ale app nerozlišuje tenant podle URL — vše běží na jedné doméně | High (pro SaaS) |
| 2 | **Multi-cabin switching** | `updateActiveCabin()` v AuthContext existuje, ale UI pro přepínání mezi chatami chybí | Medium |
| 3 | **Tenant-isolated storage** | Uploady nejsou rozděleny per cabin — všechny jdou do `data/uploads/` | Medium |
| 4 | **AppSettings singleton** | `AppSettings` používá `id = "cabin_{cabinId}"` — funkční, ale ne čistý model (měl by být relation na Cabin) | Low |
| 5 | **Billing / Subscription** | Žádný subscription model, žádná platební brána | High (pro SaaS) |
| 6 | **Tenant admin vs Super admin** | `isSuperAdmin` field existuje na User, ale Super Admin UI není v React | Medium |
| 7 | **Data isolation audit** | Většina queries filtruje přes cabinId, ale photos (GalleryPhoto) nemají přímý cabinId — filtrováno přes folder relation | Low |
| 8 | **Feature flags per cabin** | `Cabin.features` JSON field existuje a funguje přes `useCabinFeatures` — ✅ připraveno | ✅ Done |

---

## 📈 Sekce 4: Improvement Roadmap

### 🔴 Critical (Fix Before Launch)

| # | Zlepšení | Modul | Effort | Impact | Detail |
|---|----------|-------|--------|--------|--------|
| 1 | **Zapojit WebSocket do chatu** | Notes/Chat | M (4-8h) | Critical | Chat je nejpoužívanější feature — bez real-time je UX špatný. Emitovat `note:created`, `note:deleted` events po CRUD |
| 2 | **Přidat testy** | frontend-v2/test/ | L (1-3d) | Critical | 1 test = 0% coverage. Minimálně unit testy pro hooks (useReservations, useShoppingLists) a API client |
| 3 | **Mountnout superadmin.ts** | server.new.ts | XS (<1h) | High | Route existuje ale není dostupná — přidat `app.use("/api/superadmin", superadminRoutes)` |
| 4 | **Odstranit deprecated noteThreads.ts** | server.new.ts | XS (<1h) | Medium | Duplikuje channels.ts — může způsobit data inconsistenci |
| 5 | **Zapnout CSP** | server.new.ts | S (1-4h) | High | `contentSecurityPolicy: false` — konfigurovat alespoň základní CSP policy |

### 🟡 Important (Fix Within First Month)

| # | Zlepšení | Modul | Effort | Impact | Detail |
|---|----------|-------|--------|--------|--------|
| 6 | **Pagination pro chat zprávy** | channels.ts, NotesPage | M (4-8h) | High | Bez pagination bude chat nepoužitelný po 500+ zprávách |
| 7 | **Super Admin UI v Reactu** | frontend-v2/features/superadmin/ | L (1-3d) | Medium | Nutné pro správu uživatelů a chatů v multi-tenant režimu |
| 8 | **Push notifikace** | frontend-v2, backend | L (1-3d) | High | Web Push pro nové zprávy, změny rezervací — klíčové pro engagement |
| 9 | **In-app notifikace** | Nový modul | L (1-3d) | High | Notification center s unread count v navigaci |
| 10 | **Smazat legacy cabin-settings.ts** | src/frontend/ | XS (<1h) | Low | Poslední zbytky legacy FE |
| 11 | **Sjednotit shopping endpointy** | shoppingList.ts + shoppingLists.ts | M (4-8h) | Medium | 2 route soubory pro stejný modul — zbytečná komplexita |
| 12 | **Frontend response Zod validace** | api/schemas.ts | S (1-4h) | Medium | Rozšířit schémata na Gallery, Diary, Reconstruction |

### 🟢 Nice-to-Have (V2 Backlog)

| # | Zlepšení | Modul | Effort | Impact | Detail |
|---|----------|-------|--------|--------|--------|
| 13 | **Globální vyhledávání** | Nový modul | L (1-3d) | Medium | Full-text search přes rezervace, poznámky, nákupy |
| 14 | **Export CSV/PDF** | Nový modul | M (4-8h) | Medium | Export rezervací, financí nákupů |
| 15 | **Offline mutace** | frontend-v2 | XL (3+d) | Medium | Queue mutací offline → sync po reconnect |
| 16 | **Drag & drop v galerii** | GalleryPage | M (4-8h) | Low | Přesouvání fotek mezi složkami |
| 17 | **Markdown editor v deníku** | DiaryPage | M (4-8h) | Low | Rich text místo plain text |
| 18 | **Activity feed** | Dashboard | M (4-8h) | Medium | Timeline všech aktivit napříč moduly |

### 🔵 Strategic (Long-term Vision)

| # | Zlepšení | Modul | Effort | Impact | Detail |
|---|----------|-------|--------|--------|--------|
| 19 | **Subdomain routing** | Backend + FE | XL (3+d) | Critical | `chalupa.kdynachatu.cz` → tenant resolution → multi-tenant SaaS |
| 20 | **Billing / Stripe** | Nový modul | XL (3+d) | Critical | Subscription plans, payment gateway |
| 21 | **Multi-cabin dashboard** | Frontend | L (1-3d) | High | Uživatel spravuje více chat — přepínač + agregovaný dashboard |
| 22 | **API dokumentace** | Swagger/OpenAPI | L (1-3d) | Medium | Auto-generované API docs + playground |
| 23 | **Tenant-isolated file storage** | Backend | M (4-8h) | Medium | `uploads/{cabinId}/` místo flat `uploads/` |
| 24 | **i18n** | Frontend | XL (3+d) | Medium | Příprava pro EN/DE trh (chatové lokality v Rakousku, Německu) |

---

## 📁 Sekce 6: File & Module Inventory

### Backend Routes — Detailní inventura

| Soubor | Mount path | Endpointů | Auth | Cabin | Zod validace | Poznámky |
|--------|-----------|:---------:|:----:|:-----:|:------------:|----------|
| [auth.ts](src/backend/routes/auth.ts) | `/api` | 3 (login, register, verify) | ❌/✅ | ❌ | ✅ loginSchema, registerSchema, verifyEmailSchema | Rate limited |
| [dashboard.ts](src/backend/routes/dashboard.ts) | `/api/dashboard` | 3 (reservations, shopping, notes) | ✅ | ✅ | ❌ | Granulární dashboard data |
| [reservations.ts](src/backend/routes/reservations.ts) | `/api/reservations` | 16 | ✅ | ✅ | ✅ create, update, monthlyNote, delete, checkout | Nejkomplexnější route |
| [channels.ts](src/backend/routes/channels.ts) | `/api/channels` | 8 | ✅ | ✅ | ✅ createChannel, createMessage | Nahrazuje noteThreads |
| [messages.ts](src/backend/routes/messages.ts) | `/api/messages` | 5 | ✅ | ✅ | ✅ editNote, noteReaction | Edit, delete, pin, resolve, reactions |
| [notes.ts](src/backend/routes/notes.ts) | `/api/notes` | 7 | ✅ | ✅ | ✅ createNote | Legacy? Duplikuje channels |
| [noteThreads.ts](src/backend/routes/noteThreads.ts) | `/api/note-threads` | 3 | ✅ | ✅ | ✅ createNoteThread | **DEPRECATED** — superseded by channels |
| [shoppingLists.ts](src/backend/routes/shoppingLists.ts) | `/api/shopping-lists` | 7 | ✅ | ✅ | ✅ createList, rename | List-level CRUD |
| [shoppingList.ts](src/backend/routes/shoppingList.ts) | `/api/shopping-list` | 9 | ✅ | ✅ | ✅ createItem, updateStatus | Item-level CRUD |
| [inventory.ts](src/backend/routes/inventory.ts) | `/api/inventory` | 7 | ✅ | ✅ | ✅ create, update, addToCart | Zásoby na chatě |
| [gallery.ts](src/backend/routes/gallery.ts) | `/api/gallery` | 9 | ✅ | ✅ | ✅ createFolder, renameFolder, updatePhoto, bulkDelete | Multer upload |
| [diary.ts](src/backend/routes/diary.ts) | `/api/diary` | 8 | ✅ | ✅ | ✅ createFolder, createEntry, updateEntry, renameFolder | Folder + entry CRUD |
| [reconstruction.ts](src/backend/routes/reconstruction.ts) | `/api/reconstruction` | 6 | ✅ | ✅ | ✅ create, update, updateStatus | Kanban board |
| [users.ts](src/backend/routes/users.ts) | `/api/users` | 10 | ✅ | ⚠️ (ne všechny) | ✅ createUser, updateProfile, changePassword, adminUpdate | Profil + admin správa |
| [admin.ts](src/backend/routes/admin.ts) | `/api/admin` | 1 (system) | ✅ | ✅ | ❌ | Systémové statistiky |
| [cabin.ts](src/backend/routes/cabin.ts) | `/api/cabin` | 3 (GET, PATCH, POST create) | ✅ | ✅ | ⚠️ (inline validace místo middleware) | Nastavení chaty |
| [invites.ts](src/backend/routes/invites.ts) | `/api/invites` | 5 | ⚠️ (2 public) | ✅ | ✅ createInvite, acceptInvite | Magic links |
| [wallpapers.ts](src/backend/routes/wallpapers.ts) | `/api/wallpapers` | 3 | ✅ | ✅ | ❌ (multer validace) | Zen mode tapety |
| [workspace.ts](src/backend/routes/workspace.ts) | `/api/workspace` | 1 | ✅ | ✅ | ✅ updateHandoverNote | Vzkaz na lednici |
| [logs.ts](src/backend/routes/logs.ts) | `/api/logs` | 4 | ⚠️ (1 anon) | ❌ | ❌ | Logy + client error reporting |
| [superadmin.ts](src/backend/routes/superadmin.ts) | **⚠️ NOT MOUNTED** | 2 | ✅ (SuperAdmin) | ❌ | ✅ superadminCreateUser | Není dostupný! |

**Celkem: ~115 endpointů ve 21 route souborech**  
**Auth coverage: 100% (kromě veřejných – login, register, invite validate/accept, anon logs)**  
**Cabin isolation: ~95% (users.ts /me endpointy nemají requireCabin — správně)**  
**Zod validace: ~80% endpointů**

### Frontend Features — Detailní inventura

| Feature | Komponenty | Hooks | API calls | CSS | Stav |
|---------|:----------:|:-----:|:---------:|:---:|------|
| [auth/](frontend-v2/src/features/auth/) | 5 (AuthPage, LoginForm, RegisterForm, VerifyEmailPage, VerifyForm) | 0 | client.ts direct | landing.css, forms.css | ✅ Complete |
| [landing/](frontend-v2/src/features/landing/) | 1 (LandingPage) | 0 | 0 | landing.css | ✅ Complete |
| [invite/](frontend-v2/src/features/invite/) | 1 (InvitePage) | 0 | invites API | invite.css | ✅ Complete |
| [onboarding/](frontend-v2/src/features/onboarding/) | 1 (OnboardingPage) | 0 | cabin API | onboarding.css | ✅ Complete |
| [dashboard/](frontend-v2/src/features/dashboard/) | 9 (DashboardPage, ActiveReservation, DepartureBanner, EssentialWarning, HandoverNote, ShoppingWidget, WeatherCard, ZenMode) | 0 (inline queries) | dashboard.ts (3 queries + weather) | dashboard.css, ZenMode.css | ✅ Complete |
| [reservations/](frontend-v2/src/features/reservations/) | 12 (ReservationsPage + calendar/2 + ui/8 + hooks/2) | 2 (useCalendar, useReservations) | reservations.ts | reservations.css, calendar.css, Reservations.module.css | ✅ Complete |
| [notes/](frontend-v2/src/features/notes/) | 10 (NotesPage, ChatView, MessageBubble, MessageInput, MessageContextMenu, ReactionBar, ThreadList, AddToShoppingDialog, CreateRepairDialog) | 2 (useNotes, useThreads) | notes.ts | notes.css | ✅ Complete |
| [shopping/](frontend-v2/src/features/shopping/) | 13 (ShoppingPage, ListMaster, ListDetail, ItemRow, ViewSwitcher, PantryView, InventoryRow, EditInventoryModal, AddToCartModal, BulkAddToCartModal, ShareListDialog) | 2 (useShoppingLists, useInventory) | shopping.ts | shopping.css | ✅ Complete |
| [gallery/](frontend-v2/src/features/gallery/) | 6 (GalleryPage, FolderGrid, PhotoGrid, Lightbox, UploadModal) | 1 (useGallery) | gallery.ts | gallery.css, lightbox.css | ✅ Complete |
| [diary/](frontend-v2/src/features/diary/) | 7 (DiaryPage, DiaryFolders, DiaryCalendar, DiaryLightbox, GalleryPicker, NotebookModal) | 1 (useDiary) | diary.ts | diary.css | ✅ Complete |
| [reconstruction/](frontend-v2/src/features/reconstruction/) | 4 (ReconstructionPage, KanbanColumn, TaskFormModal) | 1 (useReconstruction) | reconstruction.ts | reconstruction.css | ✅ Complete |
| [admin/](frontend-v2/src/features/admin/) | 2 (AdminPage + modal/dialog) | 1 (useAdmin) | admin.ts | admin.css | ✅ Complete |
| [settings/](frontend-v2/src/features/settings/) | 2 (CabinSettingsPage) | 1 (useCabinSettings) | settings.ts | cabin-settings.css | ✅ Complete |
| [not-found/](frontend-v2/src/features/not-found/) | 1 (NotFoundPage) | 0 | 0 | — | ✅ Complete |

**Celkem: ~74 React komponent, 11 custom hooks, 11 API modulů, 29 CSS souborů**

### Database Models — Detailní inventura

| Model | Fieldy | Relace | Indexy | Backend routes | Frontend API |
|-------|:------:|:------:|:------:|:----------:|:--------:|
| **Cabin** | 13 | 16 relací (parent) | unique: subdomain | cabin.ts, auth.ts | settings.ts |
| **User** | 14 | 19 relací | unique: username, email | users.ts, auth.ts | admin.ts, client.ts |
| **Reservation** | 11 | 3 (user, cabin, watchers) | — | reservations.ts | reservations.ts |
| **ShoppingList** | 6 | 3 (createdBy, cabin, items) | — | shoppingLists.ts | shopping.ts |
| **ShoppingListItem** | 12 | 4 (list, addedBy, purchasedBy, splits) | — | shoppingList.ts | shopping.ts |
| **ShoppingItemSplit** | 2 | 2 (item, user) | composite PK | shoppingList.ts | shopping.ts |
| **NoteThread** | 4 | 4 (createdBy, cabin, notes, readStatuses) | index: cabinId | channels.ts | notes.ts |
| **Note** | 10 | 5 (user, thread, cabin, replyTo, reactions) | 3 compound indexes | channels.ts, notes.ts, messages.ts | notes.ts |
| **NoteReaction** | 5 | 2 (note, user) | unique: [noteId, userId, emoji], index: noteId | messages.ts | notes.ts |
| **ThreadReadStatus** | 5 | 3 (thread, user, cabin) | — | channels.ts | notes.ts |
| **GalleryFolder** | 4 | 3 (createdBy, cabin, photos) | unique: [name, cabinId] | gallery.ts | gallery.ts |
| **GalleryPhoto** | 6 | 3 (folder, uploadedBy, diaryEntries) | — | gallery.ts | gallery.ts |
| **DiaryFolder** | 7 | 3 (createdBy, cabin, entries) | — | diary.ts | diary.ts |
| **DiaryEntry** | 6 | 3 (folder, author, photos) | — | diary.ts | diary.ts |
| **DiaryEntryPhoto** | 2 | 2 (entry, photo) | composite PK | diary.ts | diary.ts |
| **ReconstructionItem** | 14 | 3 (createdBy, cabin, votes) | — | reconstruction.ts | reconstruction.ts |
| **ReconstructionVote** | 2 | 2 (item, user) | composite PK | reconstruction.ts | reconstruction.ts |
| **ReservationWatcher** | 4 | 2 (user, reservation) | unique: [userId, reservationId] | reservations.ts | reservations.ts |
| **InventoryItem** | 10 | 2 (cabin, updatedBy) | — | inventory.ts | shopping.ts |
| **UserAvailability** | 5 | 2 (user, cabin) | — | reservations.ts | reservations.ts |
| **InviteLink** | 8 | 2 (cabin, createdBy) | unique: token | invites.ts | admin.ts |
| **Wallpaper** | 4 | 1 (cabin) | — | wallpapers.ts | dashboard.ts |
| **MonthlyNote** | 7 | 3 (cabin, updatedBy) | unique: [cabinId, year, month] | reservations.ts | reservations.ts |
| **AppSettings** | 2 | 0 | PK: id (string) | workspace.ts, dashboard.ts | — |

**Celkem: 22 modelů (+ 2 enum: ItemStatus)**

### CI/CD Pipeline

**Soubor:** [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

**Flow:**
1. Trigger: push to `main`
2. SSH do VPS (appleboy/ssh-action)
3. Backup data (uploads, logs, .env)
4. `git fetch + reset --hard origin/main`
5. Restore backups
6. `npm ci`
7. `pm2 stop`
8. Prisma generate (s fix permissions)
9. Prisma migrate deploy (s resolve pro failed migrations)
10. `npm run build` (Vite)
11. `pm2 restart`
12. **Failsafe trap**: pokud cokoliv selže, pm2 restart s předchozím buildem

**Robustnost:** ✅ Dobrá — failsafe restart, backup/restore, permission handling, BOM removal, .env validation

### Dependencies Overview

**Backend (root package.json):**
- Runtime: express 4.21, prisma 7.3, bcrypt, jsonwebtoken, multer 2.0, sharp, socket.io, pino, zod 4.3, node-cron
- **20 runtime dependencies, 12 dev dependencies**

**Frontend (frontend-v2/package.json):**
- React 19.2, react-router-dom 7.13, @tanstack/react-query 5.90, axios
- UI: tailwindcss 4.2, shadcn/ui (Radix primitives), framer-motion, lucide-react
- Forms: react-hook-form, @hookform/resolvers, zod
- Utils: date-fns, clsx, tailwind-merge, sonner
- Realtime: socket.io-client
- **28 runtime dependencies, 14 dev dependencies**

---

## 🏆 TOP 5 Nejdůležitějších Zjištění

1. **🔴 WebSocket infrastruktura existuje, ale nepoužívá se** — Chat (nejpoužívanější feature) nemá real-time updates. Server má `emitToCabin()`, frontend má `useSocket()`, ale nikde se nepropojují. Toto je #1 priorita.

2. **🔴 superadmin.ts není mountován** — Route soubor existuje s 2 endpointy, ale `server.new.ts` ho neimportuje ani nemountuje. Super admin funkce jsou nedostupné.

3. **🔴 Prakticky nulové testy** — 1 test soubor v celém projektu (74 React komponent, 115 API endpointů, 0% coverage). Pro SaaS launch je to nepřijatelné.

4. **🟡 Migrace Legacy → React je z 99% hotová** — Zbývá jen `cabin-settings.ts`, která má React ekvivalent. Legacy frontend může být odstraněn.

5. **🟡 Multi-tenant: infrastruktura ano, UX ne** — cabinId izolace, feature flags, invite links — vše funguje. Ale chybí subdomain routing, multi-cabin UI, billing — klíčové pro SaaS launch.
