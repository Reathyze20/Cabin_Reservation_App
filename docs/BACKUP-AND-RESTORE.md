# Backup and Restore

Repo ted obsahuje zakladni backup manager pro databazi a uploads.

Primarni cil:

- mit pravidelny backup PostgreSQL databaze,
- mit pravidelny backup `data/uploads`,
- mit jednoduchy a opakovatelny restore postup,
- nespolihat jen na ad hoc kopii dat pri deployi.

## Co se zalohuje

### Databaze

- PostgreSQL dump pres `pg_dump`
- format: custom dump
- vhodne pro obnovu pres `pg_restore`

### Uploady

- archiv celeho `UPLOADS_PATH`
- standardne `data/uploads`
- archiv obsahuje i thumbnaily a wallpapers, pokud jsou uvnitr uploads stromu

## Kde se zalohy ukladaji

Standardne do:

```text
data/backups/
  db/
  uploads/
```

Na produkci doporucuji pouzit cestu mimo working tree, napriklad:

```text
/home/reathyze/backups/cabin
```

Pres env promennou:

```bash
BACKUP_ROOT=/home/reathyze/backups/cabin
```

## Env promenne

- `DATABASE_URL` - povinna pro backup a restore DB
- `UPLOADS_PATH` - volitelna, default `data/uploads`
- `BACKUP_ROOT` - volitelna, default `data/backups`
- `BACKUP_RETENTION_DAYS` - volitelna, default `14`

## Spusteni backupu

### Databaze

```bash
npm run backup:db
```

### Uploady

```bash
npm run backup:uploads
```

### Oboji najednou

```bash
npm run backup:all
```

Po kazdem backupu vznikne:

- samotny archiv nebo dump,
- vedle nej metadata soubor `.json`,
- probehne prune souboru starsich nez `BACKUP_RETENTION_DAYS`.

## Restore

Restore je zamerne oddeleny od `npm run`, protoze potrebuje konkretni soubor a explicitni potvrzeni.

### Restore databaze

```bash
npx tsx src/scripts/backupManager.ts restore db --file /cesta/k/backupu.dump --yes
```

Poznamka:

- restore DB je destruktivni operace,
- pred obnovou doporucuji udelat novy aktualni backup,
- idealne nejdriv overit restore na test DB.

### Restore uploadu

```bash
npx tsx src/scripts/backupManager.ts restore uploads --file /cesta/k/backupu.tar.gz --yes
```

Chovani:

- aktualni uploads adresar se pred obnovou prejmenuje na `uploads.before-restore-<timestamp>`,
- teprve potom se nasadi obsah z archivu.

## Doporuceny cron na serveru

Priklad pro VPS s NVM:

```bash
0 3 * * * cd /home/reathyze/chata && export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && BACKUP_ROOT=/home/reathyze/backups/cabin BACKUP_RETENTION_DAYS=14 npm run backup:all >> /home/reathyze/chata/data/logs/backup-cron.log 2>&1
```

Tenhle cron patri do crontabu uzivatele `reathyze`, ne do roota. Jinak si zbytecne vyrobis root-owned soubory v backupech nebo logach.

Co ten cron dela:

- kazdy den ve 3:00 spusti backup DB i uploadu,
- uklada zalohy mimo repo working tree,
- zapisuje vystup do lokalniho logu,
- automaticky maze starsi zalohy podle retence.

### Manualni instalace cronu z lokalniho pocitace

Po dalsim deployi muzes cron nainstalovat z Windows jednim prikazem:

```powershell
.\manual-install-backup-cron.ps1
```

Script:

- instaluje cron pod uzivatelem `reathyze`,
- vytvori backup adresar a log directory, pokud jeste neexistuji,
- pred instalaci overi, ze se pod `reathyze` po nacteni NVM opravdu najde `node` a `npm`,
- odmitne se spustit, pokud server jeste nebezi z verze obsahujici `backup:all` a `src/scripts/backupManager.ts`,
- umi volitelne spustit i prvni overovaci backup pres `-RunInitialBackup`.

Priklad po deployi:

```powershell
.\manual-install-backup-cron.ps1 -RunInitialBackup
```

## Doporuceny restore postup

### Databaze

1. Zastavit aplikaci nebo zajistit maintenance okno.
2. Udelat novy bezprostredni backup aktualni DB.
3. Otestovat restore na test databazi, pokud je to mozne.
4. Spustit `restore db --file ... --yes`.
5. Zkontrolovat health endpoint a prihlaseni.

### Uploady

1. Udelat novy bezprostredni backup aktualnich uploadu.
2. Spustit `restore uploads --file ... --yes`.
3. Zkontrolovat galerii, thumbnaily a wallpapers.

## Co tento zaklad jeste neresi

- off-site kopii zaloh mimo VPS,
- automatickou kontrolu uspesnosti backupu pres alert,
- snapshot celeho serveru,
- point-in-time recovery PostgreSQL.

Tohle je zamerne prvni bezpecny krok pro family-ready provoz. Dalsi vrstva muze byt synchronizace zaloh do object storage nebo na druhy stroj.