# Chata Třebenice — AI kontext projektu

## Obecný popis
**Chata Třebenice** je rodinná webová aplikace (Single Page Application) pro správu chaty. Slouží ke koordinaci pobytů, nákupů, vzpomínek a rekonstrukčních plánů mezi více rodinnými uživateli. Je nasazena na Railway a přístupná z prohlížeče i mobilů jako PWA.

---

## Komerční vize — kdynachatu.cz

Tato aplikace je prototypem / MVP budoucí komerční SaaS platformy **kdynachatu.cz**.

### Záměr
Platforma umožní **jakékoli rodině nebo partě** spravovat vlastní chatu, chalupu nebo rekreační objekt — stejně jako Chata Třebenice, ale jako multi-tenant služba, kde každý zákazník dostane svůj izolovaný prostor.

### Plánované funkce platformy
- **Multi-tenancy** — každá rodina/skupina má svůj vlastní "workspace" (subdoména nebo slug, např. `novakovi.kdynachatu.cz`)
- **Registrace a onboarding** — veřejná registrace nového workspace, pozváni členů přes e-mail
- **Plány / předplatné** — Free (1 chata, 3 uživatelé), Basic, Premium (více objektů, více uživatelů, větší úložiště fotek)
- **Platební brána** — integrace Stripe nebo české alternativy (GoPay, Comgate)
- **Vlastní branding** — název chaty, logo, barevné schéma per workspace
- **Správa více objektů** — možnost mít více chat / chalup v jednom workspace (vyšší plány)

### Architektonické dopady pro budoucnost
- Datový model bude rozšířen o `Workspace` / `Tenant` entitu — všechny současné modely (User, Reservation, …) budou mít `workspaceId`
- Autentizace bude rozšířena o workspace kontext (JWT payload bude obsahovat `workspaceId`)
- Upload fotek bude přesunut na cloudové úložiště (S3 / Cloudflare R2) per tenant
- Backend bude připraven na horizontální škálování (bezstavový Express + externí DB)

### Současný stav
Aktuálně jde o **single-tenant MVP** pro jednu konkrétní rodinu (Třebenice). Veškerý vývoj by měl mít na paměti budoucí multi-tenant architekturu — nevytvářet technický dluh, který by migraci komplikoval.

---

## Technologický stack

### Frontend
- **Vanilla TypeScript** (žádný framework — ne React, Vue ani Svelte)
- **Vite** jako bundler a dev server
- **CSS** — vlastní moduly v `src/frontend/styles/*.css`
- **Hash-based SPA router** — `src/frontend/lib/router.ts`
- **Stránky** — `src/frontend/pages/*.ts`, každá stránka je modul s `mount()` a `unmount()`
- **Sdílené utility** — `lib/common.ts` (authFetch, showToast, getUserId…), `lib/dialogs.ts` (showConfirm)
- **PWA** — service worker, offline podpora (vite-plugin-pwa)

### Backend
- **Node.js + Express.js + TypeScript**
- **tsx** pro spuštění v dev módu bez kompilace
- **Prisma ORM** s PostgreSQL (adapter `@prisma/adapter-pg`)
- **JWT** autentizace (`jsonwebtoken` + `authMiddleware.ts`)
- **Zod** pro validaci příchozích dat (`src/validators/schemas.ts`)
- **multer + sharp** pro upload a zpracování obrázků
- **Prisma schema** — `prisma/schema.prisma`
- **Generovaný Prisma klient** — `src/generated/prisma/`

### Databáze
- **PostgreSQL 16** běžící v Docker kontejneru (`docker-compose.yml`)
- Migrace v `prisma/migrations/`

### Deployment
- **Docker Compose** — lokální vývoj i produkce
- **Railway** — primární hosting
- `.env` soubor s `DATABASE_URL`, `JWT_SECRET`, `PORT`

---

## Struktura projektu

```
src/
  backend/
    server.new.ts          # Hlavní Express server
    routes/                # API endpointy
  frontend/
    index.html             # Vstupní HTML (SPA shell)
    main.ts                # Bootstrap, router init
    pages/                 # Jednotlivé stránky aplikace
    lib/                   # Sdílené utility (router, common, dialogs)
    styles/                # CSS moduly per stránka + globální
  config/config.ts         # Načítání .env
  middleware/authMiddleware.ts
  utils/prisma.ts          # Prisma singleton
  utils/logger.ts
  validators/schemas.ts    # Zod schémata
  generated/prisma/        # Generovaný Prisma klient
prisma/
  schema.prisma
  migrations/
data/
  uploads/                 # Nahrané fotky
  logs/                    # Denní log soubory (YYYY-MM-DD.log)
```

---

## Funkce aplikace (stránky)

### 1. Dashboard (`/dashboard`)
- Uvítací pozdrav dle denní doby
- Widget počasí (open-meteo API, bez klíče) pro Třebenice (50.513, 14.001)
- Kdo je právě na chatě (aktuální rezervace)
- Nadcházející rezervace ostatních
- Nejbližší moje rezervace
- Aktivní nákupní seznamy s nepokoupenými položkami
- Poslední zprávy z nástěnky
- Poslední záznamy z deníku
- Statistiky (počty rezervací, fotek, zápisů, nekoupených položek)

### 2. Rezervace (`/reservations`)
- Interaktivní měsíční kalendář s navigací (vždy se otevírá na aktuálním měsíci)
- Barevné označení rezervací dle uživatele
- Vytváření / editace / mazání rezervací
- Typy rezervací: primary, backup, soft (náhradní termín)
- Účely: Relax, Práce na zahradě, Údržba chaty, Jiný
- Přiřazení rezervace jinému uživateli (admin)
- Filtrování: Všechny / Moje, Tento měsíc / 3 měsíce / 1 rok

### 3. Nákupní seznamy (`/shopping`)
- Více nákupních seznamů v mřížce (kartičky)
- Přidávání / mazání položek (max 100 znaků, validace na FE i BE)
- Označení položky jako koupené (checkbox, optimistický update)
- Zobrazení kdo koupil (avatar/icon)
- Vytváření novýchseznamů (max 100 znaků název)
- Mazání celého seznamu (jen tvůrce nebo admin)

### 4. Chat / Nástěnka (`/notes`)
- Vlákna (NoteThread) a obecná nástěnka
- Psaní zpráv (Note), zobrazení autora a času
- Tvorba nových vláken

### 5. Deník (`/diary`)
- Složky (DiaryFolder) se začátkem a koncem pobytu
- Záznamy (DiaryEntry) s datem, textem a fotkami z galerie
- Tagování aktivity (activityTag)

### 6. Galerie (`/gallery`)
- Složky fotek (GalleryFolder)
- Upload fotek (base64 → sharp resize + thumb)
- Lightbox s klávesovými šipkami, Escape
- Popis fotky (vzpomínka) — editovatelný kliknutím
- Drag & drop upload

### 7. Rekonstrukce (`/reconstruction`)
- Kanban board se třemi sloupci:
  - **Nápady** (idea) — odkaz, náhled, cena, hlasování srdíčkem
  - **Firmy / Kontakty** (company) — telefon, e-mail, web, stav (k oslovení / čekám / schváleno / zamítnuto)
  - **Úkoly** (task) — zaškrtávání hotovo/pending, deadline, cena
- Přidávání a **editace** položek (tlačítko tužky na každé kartičce)
- Hlasování pro nápady (toggle)
- Rozpočtový tracker (utraceno vs. plánováno — jen z úkolů)

### 8. Admin (`/admin`)
- Správa uživatelů (role: admin / user / guest)
- Změna hesla uživatele
- Systémové informace serveru
- Logy přístupu

---

## Datové modely (Prisma)

| Model | Popis |
|---|---|
| `User` | Uživatel (id, username, passwordHash, color, animalIcon, role, email) |
| `Reservation` | Rezervace chaty (dateFrom, dateTo, purpose, notes, handoverNote, status) |
| `ShoppingList` | Nákupní seznam (name, createdById, isResolved) |
| `ShoppingListItem` | Položka v seznamu (name, purchased, price, splits) |
| `ShoppingItemSplit` | Rozdělení nákladů (itemId, userId) |
| `NoteThread` | Vlákno nástěnky |
| `Note` | Zpráva (message, threadId nullable = hlavní nástěnka) |
| `GalleryFolder` | Složka fotek |
| `GalleryPhoto` | Fotka (src, description/vzpomínka) |
| `DiaryFolder` | Složka deníku (startDate, endDate, activityTag) |
| `DiaryEntry` | Zápis v deníku (entryDate, content, galleryPhotoIds) |
| `ReconstructionItem` | Položka rekonstrukce (category, title, link, cost, status, phone, email, deadline, thumbnail) |
| `ReconstructionVote` | Hlasování pro nápad (itemId, userId) |

---

## API endpointy (přehled)

Všechny API endpointy jsou na `/api/...` a chráněny JWT (hlavička `Authorization: Bearer <token>`).

| Prefix | Router soubor | Popis |
|---|---|---|
| `/api/auth` | `routes/auth.ts` | Login, registrace |
| `/api/reservations` | `routes/reservations.ts` | CRUD rezervací |
| `/api/shopping-list` | `routes/shoppingList.ts` | Legacy single-list API |
| `/api/shopping-lists` | `routes/shoppingLists.ts` | Multi-list API (CRUD, resolve) |
| `/api/notes` | `routes/notes.ts` | Zprávy |
| `/api/note-threads` | `routes/noteThreads.ts` | Vlákna |
| `/api/gallery` | `routes/gallery.ts` | Složky a fotky |
| `/api/diary` | `routes/diary.ts` | Deník |
| `/api/reconstruction` | `routes/reconstruction.ts` | Kanban (GET, POST, PUT /:id, DELETE, PATCH vote/status) |
| `/api/dashboard` | `routes/dashboard.ts` | Agregovaná data pro dashboard |
| `/api/users` | `routes/users.ts` | Správa uživatelů |
| `/api/admin` | `routes/admin.ts` | Admin funkce |
| `/api/logs` | `routes/logs.ts` | Přístupy k logům |

---

## Autentizace a role

- JWT token uložen v `localStorage` jako `token`
- Také `userId`, `username`, `role` v `localStorage`
- Role: `admin` (plný přístup), `user` (standardní), `guest` (omezený)
- `authMiddleware.ts` ověřuje token a přidává `req.user` do requestu

---

## Validace

- **Frontend**: inline kontroly před voláním API (délka textu max 100 znaků u nákupních položek a názvů seznamů, povinná pole)
- **Backend**: Zod schémata v `src/validators/schemas.ts`, middleware `src/validators/validate.ts`

---

## Konvence a pravidla kódu

- Veškerý kód je v **TypeScriptu**
- Frontend používá **žádný framework** — pouze DOM manipulation, `document.getElementById` přes helper `$()` z `lib/common.ts`
- Stránky mají strukturu: `getTemplate()` → `bindEvents()` → `loadData()` — vše v jednom `.ts` souboru
- API volání přes `authFetch()` z `lib/common.ts` (automaticky přidává JWT hlavičku)
- Toasty přes `showToast(message, type)` — typy: `success`, `error`, `info`
- Potvrzovací dialogy přes `showConfirm()` z `lib/dialogs.ts`
- Logy na backendu přes `logger.error/info/debug()` z `utils/logger.ts` — ukládají se do `data/logs/YYYY-MM-DD.log`
- CSS proměnné definovány v `styles/variables.css`

---

## Spuštění lokálně

```bash
# 1. Nastartovat databázi (Docker)
docker compose up -d db

# 2. Spustit aplikaci (backend + frontend dev server)
npm run dev

# Backend běží na: http://localhost:3000
# Frontend běží na: http://localhost:5173 (nebo 5174 pokud je 5173 obsazená)
```
