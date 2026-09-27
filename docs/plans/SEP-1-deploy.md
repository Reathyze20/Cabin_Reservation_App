# SEP-1 B1 – Návrh oddělení produkce a stagingu

Stav: návrh ke schválení · 27. 9. 2026 · navazuje na [`SEP-1.md`](SEP-1.md) fáze B
Tento dokument je jen plán. Nic z něj zatím není implementováno.

---

## 1. Jak nasazení funguje dnes

Zdroj: `.github/workflows/deploy.yml` (na `rodina-stable`), `manual-*.ps1`, `nginx-chata.conf`, `docker-compose.yml`, `Dockerfile`, `src/config/config.ts`.

| Věc | Dnešní hodnota | Kde je natvrdo |
|---|---|---|
| Server | jeden VPS `89.221.217.81`, uživatel `reathyze` | `manual-*.ps1` (tam jako `root@`) |
| Adresář aplikace | `/home/reathyze/chata` | secret `SERVER_PATH` + fallback v `deploy.yml`, `manual-*.ps1` |
| Proces | pm2 `chata-app` (`npm run start`) | `deploy.yml` (trap, restart), smoke check |
| Port | 3000 | `deploy.yml`: `fuser -k 3000/tcp`, health check `localhost:3000`; `nginx-chata.conf` |
| Konfigurace | `.env` v adresáři aplikace, deploy ho zachová | `deploy.yml` |
| Databáze | PostgreSQL na serveru, `DATABASE_URL` z `.env` | – |
| Uploady | `data/uploads` v adresáři aplikace (`UPLOADS_PATH` jde přepsat) | `config.ts`, `deploy.yml` (záloha/obnova při deployi) |
| Zálohy | cron 03:00 → `/home/reathyze/backups/cabin`, retence 14 dní | `deploy.yml` ho instaluje při každém deployi |
| nginx | `server_name chataceskestredohori.cz` → `localhost:3000` | `nginx-chata.conf` |
| Docker | `docker-compose.yml` a `Dockerfile` existují, produkce je **nepoužívá** | – |

**Rizika dnešního stavu důležitá pro staging:**

1. **Port 3000 je natvrdo.** `fuser -k 3000/tcp` by při deployi stagingu na stejný port zabil produkci.
2. **Legacy opravy migrací v `deploy.yml`** (ruční `psql -f …add_cabin_multi_tenant` a série `prisma migrate resolve --rolled-back`) jsou šité na historii produkční DB. Na prázdné staging DB může ruční `psql` vytvořit tabulku `cabins` dřív, než proběhne `migrate deploy`, a ten pak selže. Staging je nesmí spouštět.
3. **Zálohovací cron se instaluje při každém deployi** se společným lockem `/tmp/cabin-backup.lock`. Kdyby deploy stagingu použil stejný skript, přepsal by nebo zdvojil produkční cron.
4. **`manual-deploy.ps1` nasadí cokoli z lokálního pracovního adresáře** jako `root` a obchází pojistku `rodina-stable`.
5. **Doména:** SEP-1 počítá s `kdynachatu.cz`, ale repo (nginx, smoke check, výchozí `EMAIL_FROM`) používá `chataceskestredohori.cz`. Viz otevřené otázky (§6).

## 2. Cílový stav

Oba stroje na **stejném VPS** (nejjednodušší, žádné nové náklady), oddělené vším kromě serveru.

| | Produkce (rodina) | Staging (vývoj pro víc rodin) |
|---|---|---|
| Zdrojová větev | `rodina-stable` (později tag `v*-rodina`) | `main` |
| Workflow | `deploy.yml` **jen na `rodina-stable`** | nový `deploy-staging.yml` **jen na `main`** |
| GitHub environment | `production` (ruční schválení, B4) | `staging` |
| Adresář | `/home/reathyze/chata` (beze změny) | `/home/reathyze/chata-staging` |
| pm2 proces | `chata-app` (beze změny) | `chata-staging` |
| Port | 3000 (beze změny) | 3100 |
| Databáze | stávající (beze změny) | `kdynachatu_staging`, role `staging_app` **bez práv** k produkční DB |
| Uploady | `/home/reathyze/chata/data/uploads` | `/home/reathyze/chata-staging/data/uploads` |
| `.env` | stávající | vlastní, **jiný** `JWT_SECRET`, `DEPLOY_TARGET=staging` |
| E-maily | Amazon SES | vypnuté (prázdné `SMTP_*`), viz §4.6 |
| Zálohy | cron 03:00 (beze změny) | žádné |
| nginx | stávající server blok | nový blok `staging.<doména>` + HTTP basic auth |
| Legacy opravy migrací | ano (beze změny) | ne, jen `prisma migrate deploy` |

Princip: **produkční cesta se mění co nejméně.** Nová je hlavně stagingová cesta.

## 3. Klíčové rozhodnutí: kde žijí workflowy

GitHub při pushi použije workflow **z pushnutého commitu**. Push do `rodina-stable` tedy spouští `deploy.yml` z `rodina-stable` a push do `main` workflowy z `main`. Z toho plyne:

- **Produkční workflow žije jen na `rodina-stable`.** Na `main` se `deploy.yml` smaže (dnes je tam mrtvý kód, protože se spouští jen pushem do `rodina-stable`). Tím se vyloučí, aby změna na `main` kdy ovlivnila produkční deploy.
- **Stagingový workflow žije jen na `main`** (`deploy-staging.yml`, trigger `push: branches: [main]`).
- Sdílený serverový skript (`scripts/deploy/remote-deploy.sh`) bude v obou větvích, ale každá větev má vlastní kopii. Na `rodina-stable` se sáhne až v B4 a jen jako hotfix.

Při návratu rodiny (fáze E) se produkční workflow přesune na `main`.

## 4. Návrh změn (B2)

### 4.1 Serverový skript s parametry (jen `main`)

Vytáhnout inline skript z `deploy.yml` do `scripts/deploy/remote-deploy.sh` s parametry:

```
DEPLOY_TARGET   production | staging
APP_PATH        /home/reathyze/chata | /home/reathyze/chata-staging
PM2_NAME        chata-app | chata-staging
APP_PORT        3000 | 3100
SOURCE_REF      refs/heads/main | refs/heads/rodina-stable | refs/tags/v…-rodina
```

Změny oproti dnešku: port z `APP_PORT` (fuser i health check), jméno pm2 z `PM2_NAME`, legacy opravy migrací a instalace zálohovacího cronu **jen pro `production`**.

### 4.2 Pojistky (dvě vrstvy)

1. **Ve workflow:** `deploy-staging.yml` odmítne jiný ref než `refs/heads/main`; produkční `deploy.yml` už dnes odmítá cokoli kromě `refs/heads/rodina-stable` (v B4 rozšířit o `refs/tags/v*-rodina`).
2. **Na serveru** (`remote-deploy.sh`, běží před jakoukoli změnou):
   - `DEPLOY_TARGET=production` vyžaduje `SOURCE_REF` = `rodina-stable` nebo tag `v*-rodina`; `staging` vyžaduje `main`,
   - `.env` v `APP_PATH` musí obsahovat `DEPLOY_TARGET=<stejná hodnota>`, jinak konec (chrání před záměnou adresářů),
   - pro staging: `DATABASE_URL` nesmí ukazovat na produkční databázi (porovnání názvu DB s konstantou v produkčním `.env` není možné, proto kontrola, že název DB končí na `_staging`),
   - pro staging: `APP_PATH` nesmí být `/home/reathyze/chata`.

### 4.3 Konfigurace

- `.env.production.example` a `.env.staging.example` (bez tajemství), obě s `DEPLOY_TARGET`.
- Staging `.env`: `PORT=3100`, `FRONTEND_URL=https://staging.<doména>`, `DATABASE_URL=…/kdynachatu_staging`, vlastní `JWT_SECRET`, prázdné `SMTP_*`.
- GitHub environment `staging`: secrets `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` (stejný server; volitelně samostatný klíč).

### 4.4 nginx

Nový soubor `nginx-staging.conf`: `server_name staging.<doména>`, proxy na `localhost:3100`, stejné hlavičky pro PWA a WebSocket jako produkce, `auth_basic` s `/etc/nginx/.htpasswd-staging`. Certifikát přes certbot (B3).

### 4.5 Seed stagingu

`src/scripts/seedStaging.ts` + `npm run staging:seed`: fiktivní chata („Testovací chata“), 3–4 fiktivní členové, pár rezervací, zpráv a položek nákupního seznamu. Skript skončí chybou, pokud `DEPLOY_TARGET` není `staging` nebo DB nekončí na `_staging`. Idempotentní (smaže a znovu vytvoří jen svá data).

### 4.6 E-maily ve stagingu

`src/utils/email.ts` při chybějícím `SMTP_*` e-maily neposílá. Staging tedy nikomu nic nepošle. Důsledek: ověření e-mailu a reset hesla na stagingu nepůjdou dokončit přes e-mail. Pro testování stačí seedovaní uživatelé s ověřeným e-mailem. Pokud by bylo potřeba víc, samostatný úkol (např. výpis odkazu do logu jen pro staging).

### 4.7 Ruční skripty

`manual-deploy.ps1`: na začátek přidat kontrolu, že lokální větev je `rodina-stable` a pracovní adresář je čistý, a v hlavičce označit jako „nouzová cesta jen pro produkci“. Ostatní `manual-*.ps1` (smoke check, backup cron, logrotate) jsou produkční a zůstávají; doplnit jen poznámku.

### 4.8 Docker

`docker-compose.yml` a `Dockerfile` produkce ani staging nepoužívají. V rámci SEP-1 je neměnit. Přechod na Docker je samostatné rozhodnutí (ADR-0002).

### 4.9 Dokumentace

`docs/SDLC.md` (nová sekce Prostředí), `README.md` (jak nasadit staging), `docs/OPERATIONS-RUNBOOK.md` (dva procesy, dva porty).

## 5. Rozpad na PR (B2 + B4)

| # | Cíl | Obsah | Dopad na produkci |
|---|---|---|---|
| 1 | `main` | `scripts/deploy/remote-deploy.sh` + pojistky, `.env.*.example`, smazání mrtvého `deploy.yml` z `main` | žádný |
| 2 | `main` | `deploy-staging.yml` (environment `staging`, guard na ref), `nginx-staging.conf` | žádný |
| 3 | `main` | `seedStaging.ts` + npm skript | žádný |
| 4 | `main` | `manual-deploy.ps1` guard, dokumentace (SDLC, README, runbook) | žádný |
| 5 | `rodina-stable` (B4, hotfix) | produkční deploy z tagu `v*-rodina` + environment `production` se schválením | změna triggeru produkce, merge = jeden testovací deploy |

PR 1–4 jdou jen na `main`, produkce se jich nedotkne. PR 5 až po B3 a po ověření stagingu.

**Pořadí s infrastrukturou (B3, 👤):** DNS + certifikát + staging DB a role + staging `.env` + htpasswd musí existovat před prvním během `deploy-staging.yml`. Do té doby lze PR 2 mergnout, ale workflow selže na kontrole `.env` (bezpečně, nic nezmění).

## 6. Otevřené otázky (potřebuju odpověď před B2)

1. **Doména:** běží rodinná produkce na `chataceskestredohori.cz` (podle repa), nebo na `kdynachatu.cz` (podle SEP-1)? Na které doméně má být staging?
2. **Stejný server:** stačí VPS paměť na druhý Node proces (~150–300 MB) a druhou DB? Pokud ne, staging na samostatném malém VPS (jen jiné `SSH_HOST`).
3. **Basic auth na stagingu:** ano (doporučuji), nebo veřejně?
4. **Deploy stagingu:** automaticky po každém merge do `main` (doporučuji), nebo ručně?

## 7. Mimo rozsah

- Přechod na Docker/compose.
- release-please a verze `v0.x` (samostatný krok z SDLC týdnů 4–6).
- Opravy S-1/S-2 (fáze C).
- Bezpečnostní nálezy mimo nasazení (např. `cors origin: true` a Socket.IO `origin: "*"`) – zapsat jako samostatné úkoly.
