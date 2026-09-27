# SEP-1 – Oddělení rodinné verze od vývoje pro víc rodin

Verze 1 · 27. 9. 2026
Navazuje na `docs/PRODUCT-PLAN.md` a `docs/SDLC.md`. Tento úkol má přednost před fází 1 (multi-tenancy).

> Poznámka ke stavu repa (27. 9. 2026): `docs/PRODUCT-PLAN.md` zatím v repozitáři není. Opravy S-1 a S-2 odpovídají v kódu výchozímu `JWT_SECRET` v `src/config/config.ts` a účtu `admin` / `tajneheslo123` ze `src/scripts/createLearningAdmin.ts`.

---

## 1. Cíl

Rodina dál bez přerušení používá chataceskestredohori.cz, zatímco na `main` probíhá přestavba na verzi pro víc rodin. Žádná změna z `main` se nesmí dostat do rodinné produkce omylem.

## 2. Cílový stav

| | Rodinná verze | Vývoj pro víc rodin |
|---|---|---|
| Větev | `rodina-stable` | `main` |
| Verze / tagy | `v1.0-rodina`, pak `v1.0.1-rodina`… | `v0.x` (release-please) |
| Prostředí | produkce | staging |
| Doména | `chataceskestredohori.cz` | `staging.kdynachatu.cz` (produkčně později `kdynachatu.cz`) |
| Databáze | stávající produkční DB | samostatná DB, jen fiktivní data |
| Soubory (fotky) | stávající adresář | samostatný adresář |
| Proces (pm2 / compose) | stávající | samostatný název, port |
| Co do ní smí | jen opravy (bezpečnost, chyby) | veškerý nový vývoj |

Jeden repozitář, žádný fork.

## 3. Pravidla pro AI

Jsou v `CLAUDE.md`, sekce „Větve a prostředí“.

---

## 4. Kroky

Legenda: 👤 = člověk · 🤖 = Claude Code · `[PLÁN]` = nejdřív plán a schválení

### Fáze A – Záloha a zmrazení (den 1)

- [x] **A1 👤 Zjistit, co přesně běží v produkci.** Podle GitHub Actions poslední úspěšný deploy 27. 9. 2026 z `074c3e5` (merge PR #7). Aplikační kód je shodný s předchozím úspěšným deployem `3a852d0` (4. 7. 2026), rozdíl je jen v dokumentaci a CI.
- [ ] **A2 👤 Záloha.**
  - `pg_dump` produkční databáze → uložit mimo server,
  - záloha adresáře s nahranými fotkami,
  - kopie produkčního `.env` do správce hesel,
  - **zkušební obnova** dumpu do lokální databáze a kontrola, že aplikace nad ní naběhne.
- [ ] **A3 🤖 Vytvořit tag a větev.** Větev `rodina-stable` z `074c3e5` existuje. Tag `v1.0-rodina` založit ručně (push tagů z cloud session je blokovaný): GitHub → Releases → Draft a new release → tag `v1.0-rodina`, target `rodina-stable`.
- [ ] **A4 👤 Ochrana větve.** GitHub → Settings → Rules: ruleset pro `rodina-stable` stejný jako pro `main` (povinný PR, povinné CI checky, zákaz force push a mazání).
- [ ] **Mezikrok 🤖 Deploy jen z `rodina-stable`.** `deploy.yml` se spouští pushem do `rodina-stable` a odmítne jiný ref. Stejná změna ve dvou PR: do `main` a do `rodina-stable`. Od sloučení do `main` už merge do `main` nic nenasazuje.

**AK:** tag i větev existují, ukazují na produkční commit, do `rodina-stable` nejde pushnout přímo.

### Fáze B – Oddělení nasazení (den 2–4)

- [ ] **B1 🤖 `[PLÁN]` Analýza nasazení.**
  Prompt:
  > „Prostuduj `manual-deploy.ps1`, `manual-post-deploy-smoke-check.ps1`, `manual-install-backup-cron.ps1`, `docker-compose.yml`, `Dockerfile`, `nginx-chata.conf`, konfiguraci pm2 a případné workflowy v `.github/workflows`. Napiš do `docs/plans/SEP-1-deploy.md` návrh, jak oddělit produkci (`rodina-stable`) a staging (`main`): proměnná cíle nasazení, oddělené `.env`, databáze, porty, názvy procesů, adresáře uploadů, nginx server bloky a zálohy. Nic neimplementuj, jen plán, a otevři PR.“
- [ ] **B2 🤖 Implementace podle schváleného plánu.** Minimum, které musí obsahovat:
  - parametr cíle nasazení (`production` / `staging`),
  - **pojistka:** deploy do produkce skončí chybou, pokud nasazovaný kód není z `rodina-stable` nebo tagu `v*-rodina`; deploy na staging skončí chybou, pokud není z `main`,
  - oddělené `.env.production.example` a `.env.staging.example` (skutečné `.env` soubory se necommitují),
  - samostatný název procesu, port, databáze a adresář uploadů pro staging,
  - nginx server blok pro staging subdoménu,
  - zálohovací cron jen pro produkci (staging nepotřebuje),
  - seed skript pro staging s **fiktivní** rodinou a chatou,
  - aktualizace `docs/SDLC.md` (sekce Prostředí) a README.
- [ ] **B3 👤 Infrastruktura.**
  - DNS záznam pro staging subdoménu,
  - TLS certifikát (např. certbot),
  - vytvoření staging databáze a uživatele,
  - staging `.env` s **jiným** `JWT_SECRET` než produkce,
  - volitelně: staging za heslem (HTTP basic auth v nginx), aby ho nenašli cizí lidé.
- [ ] **B4 🤖 CI a automatické nasazení.**
  - CI (`preflight`, `guardrails`) běží pro PR do `main` i do `rodina-stable` (už platí: workflowy se spouští pro PR do libovolné větve),
  - nasazení na staging po sloučení do `main`,
  - nasazení do produkce jen z tagu `v*-rodina` a po ručním schválení (GitHub environment `production`),
  - release-please jen pro `main`.

**AK:** staging běží na své subdoméně s fiktivními daty. Pokus nasadit `main` do produkce skončí chybou. Produkce běží beze změny.

### Fáze C – Bezpečnostní opravy do rodinné verze (den 4–5)

Rodinná verze je veřejně dostupná, proto potřebuje opravy S-1 a S-2 hned.

- [ ] **C1 🤖 S-1 a S-2 na `main`**, každý jako samostatný PR.
- [ ] **C2 🤖 Přenos do rodinné verze.**
  Prompt:
  > „Z větve `rodina-stable` vytvoř `hotfix/security-s1-s2`, přenes do ní commity z PR S-1 a S-2 (cherry-pick). Pokud se kód mezi větvemi liší, oprav konflikty minimálně a popiš je v PR. Otevři PR do `rodina-stable`.“
- [ ] **C3 👤 Nasazení opravy.**
  - před nasazením nastavit v produkčním `.env` nový silný `JWT_SECRET` (min. 32 znaků), jinak aplikace po S-1 nenaběhne,
  - po sloučení vytvořit tag `v1.0.1-rodina` a nasadit,
  - všichni v rodině se budou muset znovu přihlásit (dopředu jim to napsat),
  - zkontrolovat, že v produkční DB není účet `admin` s heslem `tajneheslo123`; pokud ano, smazat ho nebo změnit heslo.

**AK:** produkce běží na `v1.0.1-rodina`, bez výchozího JWT klíče a bez testovacího účtu.

### Fáze D – Ověření (den 5)

- [ ] chataceskestredohori.cz funguje: přihlášení, kalendář, rezervace, chat, fotky (projde rodinný smoke test z `docs/SPRINT-0-SMOKE-TEST.md`),
- [ ] staging funguje a neobsahuje žádná skutečná rodinná data,
- [ ] PR s cílem `main` nijak nezmění produkci,
- [ ] pokus o přímý push do `rodina-stable` je odmítnut,
- [ ] noční záloha produkce proběhla a je čitelná.

Teprve potom začíná fáze 1 (M-1 multi-tenancy) na `main`.

---

## 5. Běžný provoz během oddělení

**Oprava chyby v rodinné verzi:**
1. chyba se týká i `main` → oprava na `main`, cherry-pick do `hotfix/*` z `rodina-stable`, PR,
2. chyba je jen ve staré verzi → PR přímo do `rodina-stable` s poznámkou „jen rodinná verze“,
3. po sloučení tag `v1.0.x-rodina` a nasazení.

**Nové funkce do rodinné verze:** ne. Pokud je rodina nutně potřebuje, raději urychlit přechod (fáze E).

---

## 6. Fáze E – Návrat rodiny do společné verze (později)

Spustit, až jsou hotové M-1 až M-6 (multi-tenancy) a verze na `main` je stabilní na stagingu aspoň 2 týdny.

- [ ] **E1 🤖 `[PLÁN]` Migrační plán.** Převod produkčních dat do nového schématu jako chata č. 1 (Třebenice) s rodinnými účty a rolemi. Skript musí být opakovatelný a mít kontrolu (počty rezervací, zpráv, fotek, uživatelů před/po).
- [ ] **E2 👤🤖 Zkouška nanečisto.** Kopii produkčních dat obnovit **do samostatné, uzavřené** databáze (ne na veřejný staging), spustit migraci, porovnat počty a proklikat aplikaci. Opakovat, dokud neproběhne čistě. Kopii pak smazat.
- [ ] **E3 👤 Přepnutí.** Oznámit rodině krátkou odstávku → záloha → migrace → nasazení verze z `main` na chataceskestredohori.cz (a `kdynachatu.cz`) → smoke test.
- [ ] **E4 Návrat zpět (když něco selže):** obnovit zálohu z E3 a znovu nasadit poslední tag `v1.0.x-rodina`. Postup si před přepnutím projít, aby byl hotový za 15 minut.
- [ ] **E5 Úklid:** po 30 dnech bez problémů archivovat větev `rodina-stable` (tagy zůstanou) a odstranit ji z deploye a pravidel.

---

## 7. Rizika

| Riziko | Opatření |
|---|---|
| Zmrazí se jiný commit, než běží v produkci | krok A1 |
| Staging omylem sáhne na produkční DB | oddělené `.env`, jiný DB uživatel bez přístupu k produkční DB |
| Po S-1 produkce nenaběhne kvůli chybějícímu `JWT_SECRET` | krok C3 – nastavit klíč před nasazením |
| Větve se rozejdou a hotfixy nepůjdou přenášet | do `rodina-stable` jen opravy; fázi E nenechávat déle než pár měsíců |
| Ztráta fotek | záloha uploadů v A2 a v nočních zálohách |
