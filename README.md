# Chata Třebenice / kdynachatu.cz

Moderní rodinná SPA/PWA aplikace pro správu rekreačních objektů — rezervace, galerie, deník, chat, nákupní seznamy a rekonstrukce. Single-tenant MVP s přípravou na multi-tenant SaaS platformu.

## Klíčové funkce
- 🔐 Autentizace přes JWT + invite-based onboarding
- 📅 Vizuální kalendář s barevně odlišenými rezervacemi
- 💬 Real-time chat přes Socket.IO
- 🛒 Nákupní seznamy + pantry/inventář
- 📸 Galerie s albums a lighboxem
- 📖 Deník pobytů
- 🏗️ Evidance rekonstrukcí a hlasování
- 🎨 Frosted-glass design, dark mode, PWA offline support

## Stack

### Frontend
- **React 19** + TypeScript strict
- **Vite 7** + code splitting
- **TanStack Query 5** (server state)
- **React Router DOM 7** (client routing)
- **Tailwind CSS 4** + shadcn/ui
- **Framer Motion** (animace)
- **Socket.IO client** (real-time)

### Backend
- **Node.js 20+** + Express 4 + TypeScript
- **Prisma ORM 7** + PostgreSQL 16
- **JWT** auth + role-based access
- **Zod 4** validace
- **Sharp** (image resize)
- **Pino** (structured logging)
- **Socket.IO** server

## Požadavky
- Node.js 20+
- PostgreSQL 16 (nebo Docker)
- npm (součást Node.js)

## Instalace
```bash
git clone <URL_repozitare>
cd <nazev_slozky>
npm install
```

## Konfigurace (volitelné)
V kořenovém adresáři vytvořte soubor `.env`:
```env
JWT_SECRET=vas_super_tajny_klic_ktery_nikdo_neuhodne
```
Pokud .env chybí, použije se méně bezpečný výchozí klíč.

## Spuštění
Aplikace se spouští zvlášť pro backend a frontend.

1) Backend:
```bash
npm run dev
```
Běží na http://localhost:3000

2) Frontend:
- Otevřete `src/frontend/index.html` ve VS Code
- Klikněte pravým tlačítkem a zvolte „Open with Live Server“

## Důležité skripty

```bash
# Vývoj
npm run dev              # backend + frontend najednou
npm run dev:backend      # jen backend
npm run dev:frontend     # jen frontend

# Build & produkce
npm run build            # zkompiluje frontend do dist/frontend
npm run start            # spustí produkční server
npm run preview          # build + start

# Databáze
npm run prisma:generate  # vygeneruje Prisma klienta
npm run prisma:migrate   # vytvoří migraci
npm run prisma:studio    # otevře Prisma Studio (DB GUI)
npm run db:seed          # naimportuje archivní JSON data

# Testování & validace
npm run preflight:deploy # kontrola před nasazením (TS + testy + build)
npm run create-learning-admin  # vytvoří testovacího admina pro učení

# Docker
npm run docker:up        # spustí DB + app v Dockeru
npm run docker:down      # vypne Docker stack
npm run docker:logs      # zobrazí logy aplikace
```

## První spuštění (quick start)

1. **Spusť aplikaci:**
   ```bash
   npm run dev
   ```

2. **Vytvoř testovacího admina:**
   ```bash
   npm run create-learning-admin
   ```

3. **Otevři browser:**
   - Frontend: http://localhost:5173
   - Swagger API docs: http://localhost:3000/api/docs

4. **Přihlaš se:**
   - Username: `admin`
   - Password: `tajneheslo123`

## Učení a testování

### 🎓 Pro začátečníky v testování
- **Quick Start:** [docs/learning/GETTING-STARTED.md](docs/learning/GETTING-STARTED.md) — 15 minut k funkční aplikaci
- **Postman Guide:** [docs/learning/POSTMAN-GUIDE.md](docs/learning/POSTMAN-GUIDE.md) — kompletní průvodce API testováním
- **Playwright Guide:** [docs/learning/PLAYWRIGHT-GUIDE.md](docs/learning/PLAYWRIGHT-GUIDE.md) — kompletní průvodce browser automatizaci

### 📚 Další dokumentace
- **Implementation Roadmap:** [docs/learning/IMPLEMENTATION-ROADMAP.md](docs/learning/IMPLEMENTATION-ROADMAP.md) — co je hotové a co chybí
- **Manuální testování:** [docs/SPRINT-0-SMOKE-TEST.md](docs/SPRINT-0-SMOKE-TEST.md) — rodinné smoke test scénáře

### 🔧 API dokumentace
- **Swagger UI:** http://localhost:3000/api/docs (v devu zapnuté automaticky)
- **API Quickstart:** [docs/API-QUICKSTART.md](docs/API-QUICKSTART.md)
- **Postman collection:** [postman/cabin-api-learning.postman_collection.json](postman/cabin-api-learning.postman_collection.json)
- **OpenAPI spec:** [src/backend/openapi.ts](src/backend/openapi.ts)
