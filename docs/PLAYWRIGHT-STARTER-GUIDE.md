Verified: 2026-05-30
Scope: Beginner onboarding for external Playwright automation against frontend-v2

# Playwright Starter Guide

Tenhle dokument je psany pro cloveka, ktery se chce ucit Playwright nad vasim projektem a potrebuje rychle pochopit:

- jak aplikaci lokalne spustit,
- jak je rozdelena z pohledu automatizace,
- kde zacit prvnimi scenari,
- podle ceho psat selektory,
- a kde v kodu hledat pravdu, kdyz si neni jista, co se ma dit.

Dulezite rozhodnuti pro tenhle projekt:

- Playwright testy nepatri do tohoto repa,
- aplikace ma byt pouze pripravena pro externi automation workspace,
- v tomhle repu jsou stabilni selektory a dokumentace, ne samotne browser testy.

Technicky checklist a inventory selektoru je v [docs/PLAYWRIGHT-READINESS-CHECKLIST.md](docs/PLAYWRIGHT-READINESS-CHECKLIST.md).
Tenhle dokument je spis "start here" verze.

## 1. Co je co

### Aplikace, proti ktere se testuje

- frontend: `frontend-v2/`
- backend: `src/backend/`
- frontend bezi lokalne na `http://localhost:5173`
- backend bezi lokalne na `http://localhost:3000`

Playwright ma cilit na frontend URL, ne primo na backend.

### Kde je pravda o routach a flow

- hlavni route table: [frontend-v2/src/App.tsx](frontend-v2/src/App.tsx)
- hlavni navigace a labels: [frontend-v2/src/lib/navRoutes.ts](frontend-v2/src/lib/navRoutes.ts)
- shell a globalni navigace: [frontend-v2/src/components/layout/AppShell.tsx](frontend-v2/src/components/layout/AppShell.tsx), [frontend-v2/src/components/layout/TopBar.tsx](frontend-v2/src/components/layout/TopBar.tsx), [frontend-v2/src/components/layout/MobileNav.tsx](frontend-v2/src/components/layout/MobileNav.tsx)
- technicky selector inventory: [docs/PLAYWRIGHT-READINESS-CHECKLIST.md](docs/PLAYWRIGHT-READINESS-CHECKLIST.md)

Kdyz si nejsi jista, kam ma uzivatel po akci skoncit, zacni v [frontend-v2/src/App.tsx](frontend-v2/src/App.tsx).

## 2. Jak to lokalne spustit

### Minimum pro browser automatizaci

1. Pokud potrebujes lokalni DB v Dockeru:

```powershell
docker compose up -d db
```

2. Spust aplikaci:

```powershell
npm run dev
```

3. Over, ze vse bezi:

- frontend: `http://localhost:5173`
- backend health: `http://localhost:3000/api/health`

### Doporučení pro externi Playwright workspace

- `baseURL` nastav na `http://localhost:5173`
- backend nechej bezet normalne na `3000`
- prvni testy klidne poustej proti uz bezici appce

Prakticky duvod:

- frontend routy a redirecty se deji v browseru,
- Vite proxy posila `/api` a `/uploads` na backend,
- z pohledu Playwrightu je nejprirozenejsi chovat se jako skutecny uzivatel.

## 3. Jak je aplikace rozdelena z pohledu automatizace

Pro automatizaci si ji predstav jako 4 vrstvy.

### A. Verejne obrazovky bez session

- `/`
- `/login`
- `/reset-password`
- `/verify`
- `/invite/:token`
- `/privacy`
- `/terms`

To jsou dobre prvni obrazovky pro uceni, protoze nevyzaduji slozity setup.

### B. Prihlaseny uzivatel bez chaty

- `/onboarding`

To je specialni stav. Kdyz je uzivatel prihlaseny, ale nema `cabinId`, aplikace ho neposle do normalniho shellu, ale na onboarding.

### C. Hlavni shell pro uzivatele s chatou

- `/dashboard`
- `/reservations`
- `/notes`
- `/shopping`
- `/gallery`
- `/diary`
- `/reconstruction`

Tohle je bezny "core app" prostor. Je obaleny shellem s topbarem, mobilnim headerem, mobilni navigaci a profile drawerem.

### D. Admin a specialni prostory

- `/admin`
- `/admin/invites`
- `/admin/cabin`
- `/admin/diagnostics`
- `/superadmin`

Pozor:

- admin obrazovky nejsou v hlavni desktop nav, ale v profilovem dropdownu,
- superadmin bez chaty je specialni flow a muze skoncit rovnou na `/superadmin`.

## 4. Role a co meni v UI

Automatizacne jsou dulezite 4 typicke stavy:

### 1. Nepřihlášený návštěvník

- vidi landing/auth/invite/legal flow,
- nema pristup do shellu.

### 2. Běžný člen (`user`)

- vidi hlavni aplikaci,
- nevidi admin-only sekce,
- muze delat bezne CRUD akce v ramci sve role.

### 3. Guest (`guest`)

- vidi cast aplikace, ale ma omezené akce,
- byva dobry na permission testy.

### 4. Admin / Superadmin

- admin vidi admin menu a admin routy,
- superadmin vidi backoffice,
- nektere prvky jsou v dropdownu nebo draweru, ne primo na strance.

Kdyz test neco "nevidi", casto to neni selector bug, ale role bug nebo feature flag.

## 5. Hlavni mapa aplikace pro první orientaci

Z pohledu automatizace je nejuzitecnejsi tahelnik z [frontend-v2/src/lib/navRoutes.ts](frontend-v2/src/lib/navRoutes.ts):

- `/dashboard` = Přehled
- `/reservations` = Rezervace
- `/notes` = Chat
- `/shopping` = Nákupy
- `/gallery` = Galerie
- `/diary` = Deník
- `/reconstruction` = Rekonstrukce
- `/admin` = Administrativa
- `/superadmin` = Backoffice

Dulezite doplneni:

- mobile bottom nav ukazuje jen podmnozinu rout,
- nektere moduly mohou byt skryte pres `cabin.features`, ne proto, ze je test rozbity.

## 6. Jak přemýšlet o selektorech tady u vás

Pouzivej toto poradi:

1. `getByRole()`
2. `getByLabel()`
3. `getByText()` jen kdyz je text stabilni
4. `getByTestId()` kdyz je prvek dynamicky, opakovany nebo strukturální anchor

Tohle je dulezite, protoze v appce uz je dopsana stabilni selector vrstva.

### Typicke kotvy, o ktere se da oprit

Shell:

- `app-shell`
- `desktop-primary-nav`
- `desktop-nav-link` + `data-route`
- `mobile-nav-link` + `data-route`
- `profile-drawer`

Auth:

- `login-form`
- `login-submit-button`
- `register-form`
- `register-submit-button`

Page rooty:

- `dashboard-page`
- `reservations-page`
- `notes-page`
- `shopping-page`
- `gallery-page`
- `diary-page`
- `reconstruction-page`
- `admin-page`

Opakovane entity:

- `reservation-list-item` + `data-reservation-id`
- `shopping-list-row` + `data-list-id`
- `shopping-item-row` + `data-item-id`
- `inventory-item-row` + `data-item-id`
- `notes-thread-item` + `data-thread-id`
- `notes-message-bubble` + `data-note-id`
- `gallery-folder-card` + `data-folder-id`
- `gallery-photo-card` + `data-photo-id`
- `diary-folder-card` + `data-folder-id`
- `diary-day-card` + `data-date`
- `reconstruction-item-card` + `data-item-id`

Kdyz si nejsi jista, jestli selector existuje, hledej v [docs/PLAYWRIGHT-READINESS-CHECKLIST.md](docs/PLAYWRIGHT-READINESS-CHECKLIST.md).

## 7. Tři nejlepší první Playwright flow

Kdyby mela zacit opravdu od nuly, doporucuju tento sled.

### Flow 1: Login -> dashboard

Co se uci:

- zakladni navigace,
- prace s formularem,
- redirect po prihlaseni,
- overeni shellu po loginu.

Typicky tvar:

```ts
await page.goto('/login')
await page.getByTestId('login-username-input').fill('admin')
await page.getByTestId('login-password-input').fill('tajneheslo123')
await page.getByTestId('login-submit-button').click()

await expect(page.getByTestId('dashboard-page')).toBeVisible()
await expect(page.getByTestId('app-shell')).toBeVisible()
```

### Flow 2: Vytvoreni rezervace

Co se uci:

- prechod mezi routami,
- prace s CTA a formularem,
- overeni nove entity.

Dobre kotvy:

- `reservations-page`
- `reservation-create-button`
- `reservation-list-item`

### Flow 3: Shopping list nebo chat

Co se uci:

- CRUD nad opakovanou entitou,
- praci s `data-*` identifikatory,
- stabilni assertions bez `nth()`.

Dobre kotvy:

- `shopping-list-create-button`
- `shopping-list-row`
- `notes-thread-item`
- `notes-message-bubble`

## 8. Jak se vyznat v appce, kdyz test failne

Pouzij tenhle debug postup.

### Kdyz nevis, jaka ma byt route

Otevri [frontend-v2/src/App.tsx](frontend-v2/src/App.tsx).

### Kdyz nevis, jestli se stranka ma zobrazit v nav

Otevri [frontend-v2/src/lib/navRoutes.ts](frontend-v2/src/lib/navRoutes.ts) a layout komponenty v [frontend-v2/src/components/layout/TopBar.tsx](frontend-v2/src/components/layout/TopBar.tsx) a [frontend-v2/src/components/layout/MobileNav.tsx](frontend-v2/src/components/layout/MobileNav.tsx).

### Kdyz nevis, jestli je problem v datech nebo v UI

Zkontroluj API vrstvu v [docs/API-QUICKSTART.md](docs/API-QUICKSTART.md) a Swagger na `http://localhost:3000/api/docs`.

### Kdyz nevis, jaky selector pouzit

Otevri [docs/PLAYWRIGHT-READINESS-CHECKLIST.md](docs/PLAYWRIGHT-READINESS-CHECKLIST.md).

### Kdyz neco nevidis jen pod jednou roli

Podezirej:

- roli uzivatele,
- chybějící `cabinId`,
- feature flags,
- admin dropdown nebo profile drawer misto hlavni navigace.

## 9. Nejčastější pasti v tomhle projektu

### 1. Test jde na backend místo na frontend

Pro browser flow ma Playwright cilit na frontend `5173`, ne na backend `3000`.

### 2. Uživatel nemá chatu

Pak neskonci na dashboardu, ale na onboarding flow.

### 3. Admin prvky nejsou v hlavní navigaci

Na desktopu jsou casto v profilovem dropdownu.

### 4. Ne vsechno je vzdy videt v mobile nav

Bottom nav ukazuje jen subset rout.

### 5. Selektory uz existuji, ale test sahne po textu nebo `nth()`

To je typicka zbytecna krehkost.

## 10. Co číst dál

- technicky checklist: [docs/PLAYWRIGHT-READINESS-CHECKLIST.md](docs/PLAYWRIGHT-READINESS-CHECKLIST.md)
- API a Postman guide: [docs/API-QUICKSTART.md](docs/API-QUICKSTART.md)
- smoke flow pro realne scenare: [docs/SPRINT-0-SMOKE-TEST.md](docs/SPRINT-0-SMOKE-TEST.md)

Pokud bude chtit dal pokracovat, dalsi prirozeny krok je priprava externiho Playwright workspace s:

- `playwright.config.ts`,
- `baseURL = http://localhost:5173`,
- prvnim smoke testem `login -> dashboard`,
- a pozdeji `storageState` pro admin/user/guest.