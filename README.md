# Aplikace pro Rezervaci Chaty

Jednoduchá webová aplikace s vlastním backendem pro rezervaci termínů v chatě. Umožňuje přihlášení uživatele, zobrazení obsazených termínů v kalendáři a vytváření nových rezervací.

## Klíčové funkce
- Autentizace uživatelů pomocí JWT
- Vizuální kalendář (Flatpickr) se zobrazením rezervací
- Barevné odlišení rezervací podle uživatele
- Vytváření rezervací výběrem rozsahu dat
- Kontrola kolizí na backendu
- Jednoduché REST API

## Použité technologie
- Backend:
    - Node.js, Express.js, TypeScript
    - bcrypt, jsonwebtoken, CORS
- Frontend:
    - HTML5, CSS3, Vanilla JavaScript
    - Flatpickr, Font Awesome

## Požadavky
- Node.js 12+
- NPM (součást Node.js)
- VS Code doplněk Live Server (pro frontend)

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

## Skripty (package.json)
- `npm run dev` — vývojový backend (ts-node-dev)
- `npm run build` — kompilace TypeScriptu do `dist`
- `npm start` — spuštění zkompilované aplikace (produkce)

## API Endpoints

### POST /api/login
Přihlášení uživatele, vrací JWT.
Body:
```json
{ "username": "uzivatel", "password": "heslo" }
```

### GET /api/reservations
Vrátí seznam všech rezervací.
- Autorizace: Bearer token

### POST /api/reservations
Vytvoří novou rezervaci.
- Autorizace: Bearer token  
Body:
```json
{ "from": "YYYY-MM-DD", "to": "YYYY-MM-DD" }
```
