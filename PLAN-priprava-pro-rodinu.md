# Chatař 2.0 — Kompletní plán přípravy pro rodinu

> **Cíl:** Připravit aplikaci **kdynachatu.cz** tak, aby byla plně funkční, spolehlivá a připravená pro každodenní používání celou rodinou.

---

## Přehled architektury

| Vrstva | Technologie |
|---|---|
| **Frontend** | React 19 + Vite 7 + TypeScript 5.9 + TailwindCSS 4 |
| **UI knihovna** | shadcn/ui (Radix) + Framer Motion + Lucide React |
| **Data fetching** | TanStack Query v5 + Axios |
| **Routing** | React Router v7 |
| **Real-time** | Socket.io |
| **Backend** | Express 4.21 + TypeScript (tsx) |
| **Databáze** | PostgreSQL 16 (Prisma 7) |
| **Emaily** | Nodemailer + Amazon SES |
| **Deployment** | Docker Compose + Nginx |

### Moduly aplikace (15 feature modulů)

| Modul | Frontend | Backend API | Stav |
|---|---|---|---|
| Dashboard | ✅ | ✅ `/api/dashboard` | Funkční |
| Rezervace | ✅ | ✅ `/api/reservations` | Funkční, opravy layout |
| Nástěnka (Notes) | ✅ | ✅ `/api/notes`, `/api/channels` | Funkční |
| Nákupy | ✅ | ✅ `/api/shopping-lists` | Funkční |
| Galerie | ✅ | ✅ `/api/gallery` | Funkční |
| Deník | ✅ | ✅ `/api/diary` | Funkční |
| Rekonstrukce | ✅ | ✅ `/api/reconstruction` | Funkční, vizuální redesign |
| Nastavení chaty | ✅ | ✅ `/api/cabin` | Funkční |
| Admin | ✅ | ✅ `/api/admin` | Funkční |
| Pozvánky | ✅ | ✅ `/api/invites` | Funkční |
| Onboarding | ✅ | ✅ `/api/workspace` | Funkční |
| Auth (Login/Register) | ✅ | ✅ `/api/login`, `/api/register` | Bugy v UX |
| Landing page | ✅ | – | Funkční |
| Legal (Privacy/Terms) | ✅ | – | Funkční |
| Inventář | – | ✅ `/api/inventory` | Částečný (v rámci nákupů) |

---

## 🔴 Priorita 1 — Kritické bugy z rodinného testování

> Tyto bugy byly reportovány z reálného rodinného testování. Musí se opravit jako první — ovlivňují základní použitelnost.

### 1. Mobilní zobrazení kalendáře
- [ ] **Problém:** Kalendář na mobilech nefunguje správně (layout, scrolling)
- **Kde:** `ReservationsPage.tsx` — kalendářová mřížka
- **Řešení:** Horizontální scroll na kalendářové mřížce, responsive breakpoints

### 2. Scrollbar rezervací na mobilu
- [ ] **Problém:** Špatný scrollbar u seznamu rezervací na mobilu
- **Kde:** `ReservationsPage.tsx` — list view
- **Řešení:** Opravit overflow + native scrolling

### 3. Zobrazení na malém notebooku
- [ ] **Problém:** Počasí, rezervace, seznam — vše useknuté na malých obrazovkách
- **Kde:** `DashboardPage.tsx` — widget grid
- **Řešení:** Responsive grid breakpoints pro laptopy < 1366px

### 4. Zarovnání tlačítek v přidávání seznamu
- [ ] **Problém:** Tlačítka v modalu přidávání nákupního seznamu nejsou správně zarovnaná
- **Kde:** Shopping modals
- **Řešení:** Flexbox alignment fix

### 5. Chybová hláška při špatném hesle
- [ ] **Problém:** Při špatném heslu se zobrazí „Chyba přihlášení" — nedostatečně specifická zpráva
- **Kde:** `AuthPage.tsx` + backend `auth.ts`
- **Řešení:** Specifičtější chybová hláška: „Nesprávné heslo" vs „Nesprávné uživatelské jméno"

### 6. Neexistující login — žádná chyba
- [ ] **Problém:** Při přihlášení neexistujícím uživatelem se nezobrazí žádná chybová zpráva
- **Kde:** `AuthPage.tsx` — error handling
- **Řešení:** Zobrazit toast/error message pro neplatné přihlašovací údaje

### 7. Registrace neposílá email
- [ ] **Problém:** Při registraci se neposílá verifikační email
- **Kde:** Backend `auth.ts` — registrace flow + SMTP konfigurace
- **Řešení:** Ověřit SMTP credentials v `.env`, log emailů, fallback mechanismus

### 8. Mazání od admina — špatné barvy
- [ ] **Problém:** Mazání věcí od admina ze seznamu — zobrazuje se bílé na béžovém pozadí
- **Kde:** Shopping list — delete confirmation UI
- **Řešení:** Fix kontrastních barev v ConfirmDialog/delete akci

### 9. Skloňování českých slov
- [ ] **Problém:** Aplikace nesprávně skloňuje: 1 rezervace / 2-4 rezervace / 5+ rezervací
- **Kde:** Dashboard widgety a statistiky — počítadla
- **Řešení:** Vytvořit helper `pluralize(count, one, few, many)` a použít napříč celou aplikací
- **Příklady:**
  - 1 rezervace / 2-4 rezervace / 5+ rezervací
  - 1 fotka / 2-4 fotky / 5+ fotek
  - 1 zápis / 2-4 zápisy / 5+ zápisů

### 10. Dashboard — „K dokoupení" počítá i archivované
- [ ] **Problém:** Widget „K Dokoupení" na dashboardu zobrazuje počet včetně archivovaného seznamu
- **Kde:** Backend `dashboard.ts` — query pro shopping summary
- **Řešení:** Filtrovat `isResolved: false` v dashboard query

---

## 🟠 Priorita 2 — Vizuální redesign rekonstrukcí (Kanban)

> Kanban rekonstrukcí vizuálně zaostává za zbytkem aplikace. Toto je kosmetický problém, ale významně ovlivňuje první dojem.

| # | Úkol | Popis | Stav |
|---|---|---|---|
| 1 | CSS cleanup | Smazat duplikáty v `reconstruction.css` (~1000 řádků), sjednotit na design tokeny | [ ] |
| 2 | Glass-card wrapper | Přidat frosted glass efekt na celou stránku rekonstrukcí | [ ] |
| 3 | Lucide ikony | Nahradit unicode znaky (`✎`, `×`, `↗`) za Lucide React komponenty | [ ] |
| 4 | Framer Motion | Přidat entry/exit animace na karty a sloupce | [ ] |
| 5 | Skeleton loader | Vytvořit dedikovaný `ReconstructionSkeleton.tsx` | [ ] |
| 6 | Modal vylepšení | Ikony u form labels, category tabs s ikonami | [ ] |

### Soubory k úpravě
- `frontend-v2/src/styles/reconstruction.css` — ~900 řádků (smazání duplikátů + redesign)
- `frontend-v2/src/features/reconstruction/ReconstructionPage.tsx` — Glassmorphism wrapper, motion, skeleton
- `frontend-v2/src/features/reconstruction/KanbanColumn.tsx` — Lucide ikony, Framer Motion, redesign karet
- `frontend-v2/src/features/reconstruction/TaskFormModal.tsx` — Ikony u labels, category tabs
- `frontend-v2/src/features/reconstruction/ReconstructionSkeleton.tsx` — **NOVÝ** dedikovaný skeleton

---

## 🟡 Priorita 3 — Mobilní responzivita

> Rodina bude aplikaci používat primárně na mobilech. Všechny stránky musí fungovat na 320px+.

### Kontrolní seznam responsive testování

| Stránka | 320px | 375px | 768px | >1024px | Poznámky |
|---|---|---|---|---|---|
| Dashboard | [ ] | [ ] | [ ] | [ ] | Widgety se musí skládat vertikálně |
| Rezervace | [ ] | [ ] | [ ] | [ ] | Kalendář horizontálně scrollovatelný |
| Nástěnka | [ ] | [ ] | [ ] | [ ] | Thread list + zprávy |
| Nákupy | [ ] | [ ] | [ ] | [ ] | Master/detail rozložení |
| Galerie | [ ] | [ ] | [ ] | [ ] | Grid + lightbox |
| Deník | [ ] | [ ] | [ ] | [ ] | Složky + záznamy |
| Rekonstrukce | [ ] | [ ] | [ ] | [ ] | Kanban sloupce vertikálně na mobilu |
| Nastavení | [ ] | [ ] | [ ] | [ ] | Formuláře |
| Login/Register | [ ] | [ ] | [ ] | [ ] | Auth formuláře |

### Klíčové požadavky
- **Mobilní navigace:** Bottom nav bar (`MobileNav.tsx`) — spacing `pb-20 md:pb-0` na všech stránkách
- **Touch targets:** Všechny klikatelné prvky ≥ 44px
- **Header:** Z-index a opacity fix — nesmí překrývat obsah

---

## 🟢 Priorita 4 — UX polish a funkční detaily

### 4.1 Error handling
- [ ] Všechny API volání mají error handling
- [x] Toast notifikace pro error/success stavy (`showToast` existuje)
- [ ] Offline banner (`OfflineBanner.tsx`) funguje správně
- [x] Feature error boundary na každé stránce (`FeatureErrorFallback.tsx`)
- [x] Global error boundary (`GlobalFallback.tsx`)

### 4.2 Loading states
- [ ] Každá stránka má skeleton/spinner při načítání
- [x] Lazy loading stránek (code splitting) — `lazyRetry()` v `App.tsx`
- [x] Suspense fallback — `PageSpinner` v routách

### 4.3 Optimistické aktualizace
- [ ] Hlasování v rekonstrukcích — implementovat optimistic update
- [ ] Status toggle na úkolech — implementovat optimistic update
- [ ] Označení položky v seznamu jako koupené — ověřit

### 4.4 Modální dialogy
- [ ] Audit: žádný `window.confirm()` nebo `window.prompt()` v kódu
- [ ] Všude používat `ConfirmDialog` a `PromptDialog` komponenty

### 4.5 Kontextová nápověda
- [ ] `HelpFab.tsx` funkční na všech stránkách
- [x] Cookie consent banner (`CookieConsent.tsx`)

---

## 🔵 Priorita 5 — Bezpečnost a deployment

### 5.1 Bezpečnost
- [ ] JWT_SECRET — silný klíč v produkci (min 32+ znaků, nahradit výchozí)
- [ ] POSTGRES_PASSWORD — silné heslo (nahradit „change_me")
- [ ] CORS nastavení — v produkci omezit na konkrétní doménu
- [x] Rate limiting na auth endpointech (30 req/15min)
- [x] Helmet security headers (CSP zatím vypnuté — zvážit zapnutí)
- [ ] Validace vstupů — ověřit pokrytí Zod schémat na backendu

### 5.2 SSL / HTTPS
- [ ] SSL certifikát Let's Encrypt funkční (byl problém s `ERR_CERT_AUTHORITY_INVALID`)
- [x] Nginx proxy configuration (`nginx-chata.conf`)
- [ ] HTTPS redirect v nginx configu

### 5.3 Deployment checklist
- [ ] Docker build projde bez chyb — `docker compose up -d --build`
- [x] Health check endpoint — `/api/health` s DB ping
- [ ] Prisma migrace v produkci — `prisma migrate deploy`
- [x] Uploads volume mount
- [x] Logs volume mount
- [ ] SMTP emaily fungují v produkci — otestovat s reálným SES
- [ ] Backup strategie pro PostgreSQL — nastavit pg_dump cron

### 5.4 Monitoring (volitelné)
- [x] Strukturované logování (pino)
- [x] HTTP request logging (`httpLogger` middleware)
- [ ] Error tracking (Sentry nebo podobné) — volitelné
- [ ] Uptime monitoring — volitelné

---

## ⚪ Priorita 6 — Nice-to-have vylepšení

| # | Úkol | Popis | Priorita |
|---|---|---|---|
| 1 | PWA support | `vite-plugin-pwa` je v dependencies — nakonfigurovat | Nízká |
| 2 | Dark mode | `next-themes` je v dependencies — implementovat | Nízká |
| 3 | Drag & Drop v kanbanu | Příprava pro `@dnd-kit` | Nízká |
| 4 | Push notifikace | Při nové zprávě/rezervaci | Střední |
| 5 | Export dat | CSV/PDF export rezervací | Nízká |

---

## Doporučený postup

### Fáze 1: Kritické bugy (~ 3 dny)
1. Auth bugy (#5, #6, #7) — login/register/email
2. Dashboard počítadlo (#10) — filtr archivovaných
3. Skloňování (#9) — helper `pluralize()`
4. Mobile layout (#1, #2, #3) — responsive opravy
5. Shopping UI (#4, #8) — alignment + barvy

### Fáze 2: Vizuální redesign (~ 2 dny)
1. CSS cleanup — smazání duplikátů v `reconstruction.css`
2. Kanban redesign — glassmorphism, Lucide, Framer Motion

### Fáze 3: Testování (~ 2 dny)
1. Responsive test na všech breakpointech (320px → 1440px)
2. UX audit — modální dialogy, loading states, error handling

### Fáze 4: Deployment (~ 1 den)
1. Security review — JWT, hesla, CORS
2. SSL + Docker test
3. Production deploy 🚀

---

## Otevřené otázky

1. **SSL certifikát:** Byl problém s `ERR_CERT_AUTHORITY_INVALID` vyřešen?
2. **SMTP emaily:** Funguje odesílání emailů přes Amazon SES?
3. **Testovací účty:** Existují testovací účty pro rodinu (admin + běžný uživatel)?
4. **Prioritizace:** Chceš začít od kritických bugů, nebo máš jinou preferenci?
