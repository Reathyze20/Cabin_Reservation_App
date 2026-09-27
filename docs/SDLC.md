# SDLC – jak se v Kdy na chatu mění kód

Verified: 2026-09-27
Scope: vývojový proces pro práci s AI agenty (Claude Code, Copilot), hlavně pro cloud sessions spouštěné z mobilu

Tento dokument doplňuje produktové plány (`FAMILY-READY-PLAN.md`, PRD) o to, **jak** se kód mění.
Značky u pravidel:

- ⚙️ **vynuceno strojem** (CI, hook, GitHub nastavení) a v repu už existuje
- 🔜 **plánované vynucení**, zatím jen dohoda
- bez značky: dohoda

Pravidlo číslo jedna: co jde zkontrolovat strojem, patří do CI nebo hooku, ne do tohoto dokumentu.
Text v Markdownu je pro agenta jen doporučení. Skutečnou hranicí jsou GitHub ruleset a CI.

---

## 1. Principy

1. **Vynucené > napsané.** Každá opakovaná chyba AI se převede nejdřív na řádek v `CLAUDE.md` („Časté chyby“), a když se opakuje, na hook nebo CI check.
2. **Malé kroky.** Jeden úkol = jedna větev = jeden PR, ideálně do 400 změněných řádků (bez lockfile a migrací).
3. **Izolace tenantů (`cabinId`) je nepřekročitelná.** Žádný PR nesmí oslabit autorizaci podle `cabinId` ani testy, které ji ověřují.
4. **Nejjednodušší řešení, které splní akceptační kritéria.** Žádné spekulativní abstrakce ani nevyžádané refaktory.
5. **Každá změna je vratná** revertem PR, redeployem předchozí verze, nebo (později) vypnutím feature flagu.

## 2. Životní cyklus

| Fáze | Člověk | AI | Brána |
|---|---|---|---|
| 1. Nápad | Založí GitHub Issue (i z mobilu) | – | Issue |
| 2. Spec | Odpovídá na otázky, schválí spec | Vyzpovídá, vyplní `docs/specs/_TEMPLATE.md` | Definition of Ready (§4) |
| 3. Plán | Přečte plán (5 min) | Plan mode: dotčené soubory, rizika, migrace, testy, rozpad na PR | Plán ve spec nebo v popisu PR |
| 4. Implementace | – | Větev, nejdřív failing testy z AC, pak kód, PR | Draft PR |
| 5. Test | – | Spouští `npm run preflight:deploy` v session | ⚙️ CI `preflight` |
| 6. Review | Mobilní checklist (§8), label `human-reviewed` u citlivých cest | Self-review diffu proti spec | ⚙️ CI `guardrails` |
| 7. Release | Merguje do `main`; hotfix do rodinné produkce přes PR do `rodina-stable` | Conventional Commits | ⚙️ `deploy.yml` jen z `rodina-stable` (viz `plans/SEP-1.md`) |
| 8. Monitoring | Reaguje na alerty | Analyzuje chybu, navrhne fix stejným cyklem | Incident issue (viz `OPERATIONS-RUNBOOK.md`) |

**Zkratka pro drobnosti:** když jde diff popsat jednou větou (překlep, text, drobný bug), fáze 2–3 se přeskočí. Brány v CI platí vždy.

**Rytmus z mobilu:** spec a plán ideálně na počítači, commitnout do `docs/specs/`, z mobilu pak spustit cloud session „implementuj `docs/specs/<soubor>`“.
Jedna session = jeden úkol. Po dvou neúspěšných opravách session ukončit a založit novou s přesnějším zadáním. Paralelně nejvýš 2 cloud sessions (sdílejí limity účtu).

## 3. Specifikace a ADR

- Šablona spec: [`docs/specs/_TEMPLATE.md`](specs/_TEMPLATE.md). Soubor `docs/specs/<issue>-<slug>.md`.
- Šablona ADR: [`docs/adr/_TEMPLATE.md`](adr/_TEMPLATE.md). ADR jen pro rozhodnutí, která je drahé vrátit (model multi-tenancy, RLS, platby, hosting, auth). Počítejme s 5–10 za rok.
- Doporučené první ADR: `0001` model multi-tenancy (`cabinId` + případně RLS jako druhá vrstva), `0002` hostování a deploy.

## 4. Definition of Ready a Definition of Done

**Ready (smí se implementovat):**
- [ ] Existuje issue a spec (nebo jde o jednověté drobnosti)
- [ ] Každé akceptační kritérium je Given/When/Then a testovatelné
- [ ] Sekce „Tenant & bezpečnost“ je vyplněná (i kdyby jen „netýká se“ s odůvodněním)
- [ ] Je jasné, zda je potřeba migrace, a že je aditivní
- [ ] „Mimo rozsah“ je vyplněné
- [ ] Úkol se vejde do jednoho PR do ~400 řádků

**Done (smí do `main`):**
- [ ] ⚙️ CI `preflight` zelený (Prisma generate, backend typecheck, frontend testy, frontend build)
- [ ] ⚙️ CI `guardrails` zelený (velikost PR, citlivé cesty, `.only`/`.skip`, neměnné migrace)
- [ ] Každé AC má test (v názvu testu `AC-n`)
- [ ] Nová migrace je aditivní (§6)
- [ ] Popis PR: co, proč, jak ověřeno (výstup testů), rizika, rollback
- [ ] Titulek PR ve formátu Conventional Commits (`feat(calendar): …`)
- [ ] Spec má stav `done`

## 5. Testy

Dnešní stav: frontend má Vitest testy v `frontend-v2/src/test/`, backend automatické testy zatím nemá.
Cílová pyramida:

| Vrstva | Nástroj | Co | Stav |
|---|---|---|---|
| Unit | Vitest | Doménová logika (kalendář, náklady, hlasování), Zod schémata | FE ⚙️, BE 🔜 |
| Integrační API | Vitest + Supertest nad Express app + reálný PostgreSQL | Endpointy, autorizace, validace | 🔜 |
| Tenant isolation | Supertest + reálná DB, 2 seedované chaty | Viz níže | 🔜 povinné a blokující |
| E2E | Playwright | 3–5 kritických cest | 🔜 (viz `PLAYWRIGHT-*.md`) |

**Reálná DB, ne mocky.** V CI Testcontainers (`postgres:16`) nebo service container; v cloud session `service postgresql start` a databáze `kdynachatu_test`. Testy čtou jen `DATABASE_URL`, takže fungují s oběma variantami.

**Vzor tenant-isolation testů** (až vzniknou, adresář `src/**/tenant-isolation/` nebo `tests/tenant-isolation/`):
1. Seed: chata A a chata B, každá se správcem a členem.
2. Každý endpoint s ID: uživatel z A žádá zdroj z B → očekává **404** (ne 403, aby neprozradil existenci).
3. Listovací endpointy: odpověď pro A neobsahuje žádné ID z B.
4. Socket.IO: klient z A se nedostane do room chaty B.
5. Uploady: soubor z B není dostupný s tokenem z A.
6. Meta-test: projde `prisma/schema.prisma`, najde modely s `cabinId` a ověří, že každý má test. Nový model bez testu = červené CI.

**Pokrytí:** doménová logika ≥ 80 %, celkově ≥ 60 %; důležitější je, že v PR neklesne. Žádná honba za 100 %.

## 6. Databázové migrace

1. **Jen aditivní změny v jednom releasu (expand):** nové tabulky, nullable sloupce nebo sloupce s defaultem, indexy.
2. **Destruktivní změny** (drop, rename, `SET NOT NULL`, `TRUNCATE`) = contract v samostatném PR až po nasazení kódu, který starý sloupec nepoužívá. Přejmenování = 3 releasy (přidat → přepnout čtení/zápis a migrovat data → odstranit).
3. ⚙️ **Existující soubory v `prisma/migrations/` se nikdy neupravují.** Blokuje hook `.claude/hooks/protect-paths.mjs` a CI `guardrails`.
4. ⚙️ Nová `migration.sql` s `DROP`, `RENAME`, `SET NOT NULL` nebo `TRUNCATE` vyžaduje label `migration-contract-approved`.
5. V produkci jen `prisma migrate deploy` z deploy pipeline. ⚙️ `prisma migrate reset` a `db push` jsou v `.claude/settings.json` v deny.
6. Před produkční migrací záloha (`npm run backup:db`, viz `BACKUP-AND-RESTORE.md`), jednou měsíčně zkušební obnova.

## 7. Větve, PR a GitHub nastavení

`main` je vývoj pro víc rodin a do rodinné produkce se nenasazuje. Rodinná produkce (chataceskestredohori.cz) se nasazuje jen z `rodina-stable`, kam jdou jen opravy (viz [`plans/SEP-1.md`](plans/SEP-1.md)). Větve `feat/…`, `fix/…`, `chore/…`, `docs/…`, případně `claude/…` z cloud sessions. Merge squash.

**Jednorázové nastavení na GitHubu (ručně, ~30 minut)** – bez toho ostatní pravidla chrání jen dobrovolností agenta:

| Nastavení | Hodnota | Proč |
|---|---|---|
| Ruleset pro `main` | Require pull request, **0 required approvals**, block force push, block deletion | Sólo autor nemůže schválit vlastní PR (PR z cloud session je pod vaším účtem) |
| Required status checks | `preflight` (workflow CI), `guardrails` (workflow Guardrails) | Hlavní brána proti chybám AI |
| Require branches up to date | zapnout | Testy běží proti aktuálnímu `main` |
| Secret scanning + push protection | zapnout | Brání commitu secrets |
| CodeQL | default setup, JavaScript/TypeScript | Statická analýza v PR |
| Dependabot alerts + security updates | zapnout (`.github/dependabot.yml` je v repu) | Zranitelné závislosti |
| Environment `production` | required reviewer = vy | 🔜 až bude deploy z tagu |
| Auto-merge | vypnuto | Merge je vždy vědomé rozhodnutí |
| Actions → Workflow permissions | read-only `GITHUB_TOKEN` | Minimum oprávnění |

**Labely** (vytvořit v Issues → Labels): `human-reviewed`, `large-pr-ok`, `migration-contract-approved`.

**Citlivé cesty** – ⚙️ `guardrails` u nich vyžaduje label `human-reviewed`, který přidáváte vy po přečtení změny:
`.github/**`, `.claude/**`, `CLAUDE.md`, `Dockerfile`, `docker-compose.yml`, `nginx-chata.conf`, `prisma/schema.prisma`, `src/middleware/**`, `src/backend/routes/auth*`, `src/utils/prisma.ts`, `src/utils/socket.ts`.
Claude GitHub App má právo zapisovat i do workflow, proto se změny v `.github/` hlídají labelem, ne důvěrou.

## 8. AI guardrails a mobilní review

| Selhání AI | Protiopatření |
|---|---|
| Smaže nebo oslabí test, přidá `.skip`/`.only` | ⚙️ `guardrails`: zákaz `.only`/`.skip` v přidaných řádcích; 🔜 počet testů nesmí klesnout |
| Halucinované API nebo balíček | ⚙️ typecheck + build; nová závislost musí mít zdůvodnění v PR |
| Příliš široký diff, nevyžádaný refaktor | ⚙️ PR nad 400 řádků bez labelu `large-pr-ok` = fail; „Mimo rozsah“ ve spec |
| Zásah do CI, secrets, migrací, auth | ⚙️ PreToolUse hook + `guardrails` + label `human-reviewed` |
| „Hotovo“ bez důkazu | PR musí obsahovat výstup testů; 🔜 Stop hook s typecheckem |
| Únik dat mezi chatami | 🔜 tenant-isolation sada + meta-test |

**Mobilní review checklist (2–5 minut na PR):**
1. Jsou všechny required checks zelené? Pokud ne, nemergovat.
2. Odpovídá PR jednomu úkolu? Sedí dotčené soubory s plánem?
3. Změnil se soubor s testy? Jde o přidání, ne oslabení?
4. Je v PR migrace? Je aditivní?
5. Mění se auth, middleware, Prisma schema nebo `.github/`? Přečíst celé, teprve pak `human-reviewed`.
6. Nové závislosti? Známé a zdůvodněné?
7. Obsahuje popis výstup testů?

**Claude Code konfigurace v repu:**
- `CLAUDE.md` – krátké, jen pravidla, jejichž odstranění by způsobilo chyby.
- `.claude/settings.json` – deny pravidla a PreToolUse hook. V cloud session platí jen v session s jedním repozitářem.
- `.claude/hooks/protect-paths.mjs` – exit 2 (blokace se zprávou) pro `.env*`, `.github/**`, `.claude/settings*.json`, `.claude/hooks/**` a existující migrace.
- Deny pravidla a hooky jsou první linie, ne bezpečnostní hranice (`git -C . push …` je obejde). Hranicí je ruleset a CI.

## 9. Postupné zavedení

| Kdy | Co | Stav |
|---|---|---|
| Týden 1 | Tento dokument, šablony, `CLAUDE.md`, `protect-paths` hook, CI `preflight` + `guardrails` na PR, `dependabot.yml` | ⚙️ v repu |
| Týden 1 | Ruleset `main`, required checks, secret scanning, CodeQL, labely | ruční nastavení na GitHubu (§7) |
| Týdny 2–3 | Backend Vitest + Supertest, harness s reálným PostgreSQL, první tenant-isolation testy, Stop hook s typecheckem, ADR-0001 | 🔜 |
| Týdny 4–6 | Staging, release-please + tagy, deploy z tagu s environment `production`, Sentry + uptime alerty | 🔜 |
| Později | Playwright E2E kritických cest, feature flagy, RLS jako druhá vrstva, volitelně automatická AI review | 🔜 |

**Co vědomě nedělat:** sprinty, story pointy, plný Spec Kit pro každou drobnost, placená spravovaná AI review, ADR pro levná rozhodnutí, 100% pokrytí.
