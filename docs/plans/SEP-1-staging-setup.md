# SEP-1 B3 – Příprava serveru pro staging

Jednorázový postup pro `staging.kdynachatu.cz` na stávajícím VPS (`89.221.217.81`).
Souvisí s [`SEP-1-deploy.md`](SEP-1-deploy.md). **Produkční adresář, databáze ani nginx blok se nemění.**

Legenda: `root$` = příkaz jako root, `reathyze$` = jako uživatel `reathyze`.

## 1. DNS

U registrátora `kdynachatu.cz` přidat záznam:

```
staging.kdynachatu.cz.   A   89.221.217.81
```

Ověření (může trvat až hodinu): `dig +short staging.kdynachatu.cz` vrátí `89.221.217.81`.

## 2. Databáze a role

```bash
root$ sudo -u postgres psql
```

```sql
-- Heslo si vygenerujte a uložte do správce hesel.
CREATE ROLE staging_app LOGIN PASSWORD 'SEM_SILNE_HESLO';
CREATE DATABASE kdynachatu_staging OWNER staging_app;
\q
```

**Kontrola, že staging nevidí produkční DB** (název produkční DB je v `/home/reathyze/chata/.env` v `DATABASE_URL`):

```bash
root$ psql "postgresql://staging_app:SEM_SILNE_HESLO@localhost:5432/NAZEV_PRODUKCNI_DB" -c "select 1"
```

- Skončí chybou `permission denied` nebo `no pg_hba.conf entry` → v pořádku.
- **Projde** → produkční DB povoluje připojení všem (`PUBLIC`). Nejdřív zjistěte, pod jakou rolí běží produkce (uživatel v produkčním `DATABASE_URL`), a teprve potom:

  ```sql
  GRANT CONNECT ON DATABASE NAZEV_PRODUKCNI_DB TO PRODUKCNI_ROLE;
  REVOKE CONNECT ON DATABASE NAZEV_PRODUKCNI_DB FROM PUBLIC;
  ```

  Pořadí je důležité: `GRANT` před `REVOKE`, jinak se produkce odpojí. Pak zopakovat kontrolu výše a ověřit, že produkce dál běží.

## 3. Adresář a `.env`

```bash
reathyze$ mkdir -p /home/reathyze/chata-staging
reathyze$ cd /home/reathyze/chata-staging
reathyze$ curl -fsSL https://raw.githubusercontent.com/Reathyze20/Cabin_Reservation_App/main/.env.staging.example -o .env
reathyze$ chmod 600 .env
reathyze$ nano .env
```

V `.env` vyplnit:
- `DATABASE_URL` s heslem role `staging_app` z kroku 2,
- `JWT_SECRET`: nový, **jiný než v produkci**. Vygenerovat: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

Zbytek nechat (`DEPLOY_TARGET=staging`, `PORT=3100`, prázdné `SMTP_*`). Deploy skript odmítne pokračovat, pokud tyto hodnoty nesedí.

## 4. Heslo pro staging (HTTP basic auth)

```bash
root$ apt-get install -y apache2-utils
root$ htpasswd -c /etc/nginx/.htpasswd-staging rodina
```

Jméno `rodina` je jen příklad. Heslo si uložte, budete ho zadávat v prohlížeči.

## 5. nginx a HTTPS

```bash
root$ curl -fsSL https://raw.githubusercontent.com/Reathyze20/Cabin_Reservation_App/main/nginx-staging.conf \
        -o /etc/nginx/sites-available/staging.kdynachatu.cz
root$ ln -s /etc/nginx/sites-available/staging.kdynachatu.cz /etc/nginx/sites-enabled/
root$ nginx -t && systemctl reload nginx
root$ certbot --nginx -d staging.kdynachatu.cz
```

Pokud produkční nginx konfigurace není v `sites-available`, ale v `conf.d/`, použijte stejné místo (`ls /etc/nginx/conf.d /etc/nginx/sites-enabled`). `nginx -t` musí projít **před** reloadem, jinak by chyba mohla ovlivnit i produkci.

## 6. Zapnutí deploye

GitHub → Settings → Secrets and variables → Actions → záložka **Variables** → **New repository variable**:

```
Name:  STAGING_ENABLED
Value: true
```

Pak GitHub → Actions → **Deploy to Staging** → **Run workflow** (větev `main`). Další deploye poběží automaticky po každém merge do `main`.

## 7. Ověření

- [ ] Workflow **Deploy to Staging** je zelený, v logu je `Guards passed: target=staging …` a `Server is healthy`.
- [ ] `https://staging.kdynachatu.cz` chce heslo, po zadání se načte aplikace.
- [ ] `https://chataceskestredohori.cz` funguje beze změny.
- [ ] `reathyze$ npx pm2 ls` ukazuje `chata-app` (produkce) i `chata-staging`.
- [ ] Staging neobsahuje žádná rodinná data (prázdná DB; fiktivní data přidá seed v dalším PR).

## Když něco selže

- Deploy skončí hláškou `DEPLOY GUARD: …` → nesedí `.env` nebo adresář, na serveru se nic nezměnilo. Opravit podle hlášky a spustit znovu.
- Vypnout staging úplně: `STAGING_ENABLED=false`, `reathyze$ npx pm2 delete chata-staging && npx pm2 save`, odstranit odkaz v `sites-enabled` a `nginx -t && systemctl reload nginx`.
