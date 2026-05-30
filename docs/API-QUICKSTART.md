Verified: 2026-05-30
Scope: Backend API learning quickstart for Swagger UI and Postman

# API Quickstart

Tenhle projekt uz ma pouzitelne backend API pro uceni s Postmanem i pro prohlizeni ve Swagger UI.

Tenhle dokument je psany pro cloveka, ktery:

- chce si osahat API mimo frontend,
- chce se naucit zaklady v Postmanu,
- a potrebuje rychle vedet, kde je Swagger, jak funguje auth a s jakymi endpointy zacit.

Co je ted hotove:

- backend vystavuje REST API na `http://localhost:3000/api/...`
- v devu je OpenAPI JSON na `http://localhost:3000/api/openapi.json`
- v devu je Swagger UI na `http://localhost:3000/api/docs`
- v repu je starter Postman collection a environment v adresari `postman/`
- OpenAPI starter coverage je zapsana v [src/backend/openapi.ts](src/backend/openapi.ts)
- mount Swagger route je v [src/backend/server.new.ts](src/backend/server.new.ts)

Poznamka ke coverage:

- Swagger/OpenAPI zatim nepokryva uplne vsechny backend routy,
- pokryva ale nejuzitecnejsi ucici flow: auth, profil, chatu, rezervace, shopping, inventory, kanaly, galerii, admin a logy,
- zbytek API se da postupne doplnovat do stejne vrstvy.

## Spusteni lokalne

Backend i frontend:

```bash
npm run dev
```

Jen backend:

```bash
npm run dev:backend
```

Backend standardne bezi na `http://localhost:3000`.

Pokud chces pracovat jen s API a ne s browserem, frontend nepotrebujes.
Staci backend.

## Swagger / OpenAPI

Vychozi chovani:

- v developmentu jsou API docs zapnute automaticky,
- v produkci jsou API docs vypnute automaticky.

Kdyz je chcete vynutit i mimo dev, pouzijte:

```env
ENABLE_API_DOCS=true
```

Endpointy:

- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/openapi.json`

Kdyz Swagger nejde otevrit, zkontroluj:

- backend opravdu bezi,
- neni vypnute `ENABLE_API_DOCS`,
- nejdes omylem na frontend port `5173` misto backend `3000`.

Co je dulezite vedet:

- vetsina endpointu je chranena pres `Authorization: Bearer <token>`
- pro Postman typicky staci token z loginu
- `cabinId` se u vetsiny rout bere z JWT tokenu a serveroveho `req.user`, ne z povinneho custom headeru
- frontend sice posila `X-Cabin-Id`, ale pro prvni Postman flow ho nepotrebujete

### Jak premyslet o auth tady u vas

Nejbeznejsi flow je:

1. `POST /api/login`
2. vzit `token` z response
3. v dalsich requestech posilat:

```http
Authorization: Bearer <token>
```

Kdyz login projde, backend uz z tokenu zna:

- `userId`
- `role`
- `cabinId`

To je dulezite, protoze spousta rout je tenant-scoped pres chatu a bez `cabinId` v auth kontextu skoncis na `403`.

## Jak je API rozdelene

Zjednodusene si backend predstav takhle:

### Public auth flow

- `/api/health`
- `/api/login`
- `/api/register`
- `/api/forgot-password`
- `/api/reset-password`
- `/api/verify-email`
- `/api/invites/validate/:token`
- `/api/invites/accept/:token`

### Bezne protected API

- `/api/users/me`
- `/api/cabin`
- `/api/reservations`
- `/api/shopping-lists`
- `/api/inventory`
- `/api/channels`
- `/api/gallery`
- `/api/diary`
- `/api/reconstruction`

### Admin / provozni API

- `/api/admin/system`
- `/api/logs/files`
- `/api/logs`
- `/api/superadmin/...`

Kdyz si nejsi jista, jaky endpoint pouziva frontend, hledej v:

- [frontend-v2/src/api](frontend-v2/src/api)
- [src/backend/routes](src/backend/routes)
- [src/validators/schemas.ts](src/validators/schemas.ts)

## Postman soubory v repu

- collection: [postman/cabin-api-learning.postman_collection.json](postman/cabin-api-learning.postman_collection.json)
- environment: [postman/cabin-local.postman_environment.json](postman/cabin-local.postman_environment.json)

Import v Postmanu:

1. Importujte environment.
2. Vyplnte `adminUsername` a `adminPassword`.
3. Importujte collection.
4. Spustte `Auth / Login admin`.
5. Login request automaticky ulozi `authToken`, `cabinId` a `userId` do environmentu.

## Doporučený první postup v Postmanu

Kdyby mela zacit od nuly, doporucuju jet presne v tomhle poradi:

1. `System / Health check`
2. `Auth / Login admin`
3. `Auth / Get my profile`
4. `Auth / Get current cabin`
5. `Reservations / List reservations`
6. `Shopping and Inventory / List shopping lists`
7. `Shopping and Inventory / List inventory`
8. `Channels / List channels`
9. `Admin and Logs / Admin system stats`

Tohle poradi ma smysl, protoze:

- nejdriv overis, ze backend bezi,
- pak overis auth,
- pak si sahnes na nejbeznejsi protected moduly,
- a nakonec admin/provozni API.

## Doporucene prvni flow

### 1. Health check

- `GET /api/health`
- bez tokenu

### 2. Login

- `POST /api/login`
- ulozi JWT token pro dalsi requesty
- stejne credentials pak vidi i Swagger Try it out po kliknuti na `Authorize`

Body:

```json
{
  "username": "admin",
  "password": "tajneheslo123"
}
```

### 3. Muj profil

- `GET /api/users/me`

### 4. Aktualni chata

- `GET /api/cabin`

### 5. Rezervace

- `GET /api/reservations`
- `POST /api/reservations`

Ukazkove body:

```json
{
  "from": "2026-06-12",
  "to": "2026-06-14",
  "purpose": "Vikend na chate",
  "notes": "Vezmeme deskovky",
  "handoverNote": "Drevo je v kulne"
}
```

### 6. Shopping a inventory

- `GET /api/shopping-lists`
- `POST /api/shopping-lists`
- `GET /api/inventory`
- `POST /api/inventory`

### 7. Kanaly a chat

- `GET /api/channels`
- `POST /api/channels`

### 8. Galerie

- `GET /api/gallery/folders`
- `POST /api/gallery/folders`
- `POST /api/gallery/photos` jako `form-data`

Pro upload je potreba:

- pole `folderId`
- jedno nebo vice poli `photos`

### 9. Admin a logy

- `GET /api/admin/system`
- `GET /api/logs/files`
- `GET /api/logs`

## Swagger a Postman se doplňují, ne konkurují si

Pouzivej je takto:

### Swagger je dobry na:

- rychle pochopeni endpointu,
- prohlizeni request body a response shape,
- jednorazove manualni zkouseni v browseru.

### Postman je dobry na:

- opakovane requesty s ulozenym tokenem,
- prostredi a promenne,
- skladani mensich API flow,
- pozdeji export a sdileni kolekci.

Nejprirozenejsi workflow je:

1. otevrit Swagger a pochopit endpoint,
2. pak ho zkusit v Postmanu,
3. a teprve potom ho pouzit v browser automatizaci nebo pri debugovani frontendu.

## Typicke chyby zacatecnika

### 1. Vola frontend port misto backendu

API patri na `3000`, ne na `5173`.

### 2. Zapomene Bearer token

Pak protected request skonci na `401`.

### 3. Zkousi admin endpoint jako bezny user

Pak skonci na `403`, i kdyz je request syntakticky spravne.

### 4. U uploadu posle JSON misto form-data

`/api/gallery/photos` chce `multipart/form-data`.

### 5. Ceka, ze Swagger pokryva cele API

Zatim nepokryva vse. Je to starter vrstva, ne finalni kompletni API portal.

## Co je dobre dodelat priste

Pokud budete chtit API vrstvu posunout z "starter docs" na plne produktovy standard, dalsi rozumne kroky jsou:

1. doplnit OpenAPI coverage i pro zbytek route modulu,
2. dopsat response schema pro detailnejsi business objekty,
3. zautomatizovat generovani OpenAPI z validacnich Zod schemat,
4. pridat jednu seed sadu specialne pro Postman/QA uceni,
5. pripravenou dvojici environmentu `admin` a `user`.