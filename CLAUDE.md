# Kdy na chatu – instrukce pro Claude

Proces a pravidla: @docs/SDLC.md · Stack (kanonický zdroj): @memories/repo/stack-facts.md

## Příkazy
- `npm run preflight:deploy` – Prisma generate + backend typecheck + frontend testy + build. Musí projít před PR.
- `npm --prefix frontend-v2 run test:run` – frontend testy (Vitest), `npm --prefix frontend-v2 run lint` – ESLint
- `npx tsc --noEmit` – backend typecheck
- DB v cloud session: `service postgresql start`, pak `npx prisma migrate deploy` proti `DATABASE_URL`

## Nepřekročitelná pravidla
- IMPORTANT: Každý dotaz na data chaty filtruje podle `cabinId` z přihlášeného uživatele (`src/middleware/cabinMiddleware.ts`). Nikdy nevěř `cabinId` z těla requestu ani z URL. Cizí zdroj vrací 404.
- Nikdy neměň ani nemaž existující testy jen proto, aby prošly. Když je test podle tebe chybný, zastav se a napiš proč.
- Nikdy neupravuj existující soubory v `prisma/migrations/`. Migrace jen aditivní (SDLC §6).
- Neměň `.github/`, `.claude/`, auth ani middleware bez výslovného zadání.
- Nejjednodušší řešení splňující akceptační kritéria. Žádné nevyžádané refaktory ani nové závislosti bez zdůvodnění v PR.
- Nikdy push do `main` ani do `rodina-stable`. Jeden úkol = jedna větev = jeden PR do ~400 řádků.

## Větve a prostředí (docs/plans/SEP-1.md)
- `main` = vývoj pro víc rodin. Do rodinné produkce se nenasazuje.
- `rodina-stable` = rodinná produkce (chataceskestredohori.cz), push do ní spouští produkční deploy. Nikdy do ní nepřenášej nové funkce, jen opravy výslovně zadané jako hotfix. Každá změna přes PR s cílem `rodina-stable`.
- Nikdy nepracuj s produkční databází ani produkčními soubory. Staging používá jen fiktivní data.
- Hotfix: oprav nejdřív na `main` (pokud se kód týká i main), pak cherry-pick do větve `hotfix/<popis>` z `rodina-stable` a PR do `rodina-stable`.

## Workflow
- U všeho delšího než jednověté změny: spec v `docs/specs/` (šablona `_TEMPLATE.md`), pak plán, pak kód.
- Nejdřív failing testy z akceptačních kritérií (`AC-n` v názvu testu), pak implementace.
- Do popisu PR vlož výstup `npm run preflight:deploy` a u každého AC odkaz na test.
- Commity a titulek PR v Conventional Commits anglicky (`feat(calendar): …`), dokumentace česky.
- Při kompaktaci zachovej: seznam změněných souborů, cestu ke spec, testovací příkazy.

## Časté chyby v tomto repu
- Tenant klíč je `cabinId`, ne `workspaceId`. Frontend je v `frontend-v2/` (React Router, path-based), ne Vanilla TS.
- (doplňovat průběžně: co Claude opakovaně dělá špatně)
