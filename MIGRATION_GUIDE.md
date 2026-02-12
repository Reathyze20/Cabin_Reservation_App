# Cabin Reservation App - PostgreSQL Migration Guide

## 🎯 Přehled změn

Aplikace byla kompletně refaktorována s následujícími vylepšeními:

### ✅ Provedené změny:

1. **Migrace na PostgreSQL s Prisma ORM**
   - Odstranění JSON souborů pro ukládání dat
   - Přechod na relační databázi s normalizovanými daty
   - 11 tabulek + 3 junction tabulky pro M:N vztahy

2. **Rozdělení monolitického serveru**
   - `server.ts` (933 řádků) → 8 route modulů
   - Lepší organizace kódu a udržovatelnost

3. **Security vylepšení**
   - Helmet.js pro HTTP hlavičky
   - Rate limiting na login/register endpointy
   - Zod validace pro všechny vstupy

4. **Frontend vylepšení**
   - Odstraněna duplicitní CSS import
   - Toast notifikace místo alert()

5. **Developer Experience**
   - Nové NPM scripty pro Prisma
   - Migrační skript JSON → PostgreSQL
   - Health check endpoint

---

## 📋 Předpoklady

### 1. Nainstalovat PostgreSQL

**Možnost A: Lokální instalace**
```bash
# Windows (přes Chocolatey)
choco install postgresql

# Nebo stáhnout: https://www.postgresql.org/download/windows/
```

**Možnost B: Docker kontejner**
```bash
docker run --name cabin-postgres -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=cabin_reservation -p 5432:5432 -d postgres:15
```

**Možnost C: Cloud hosting (doporučeno pro produkci)**
- Supabase (free tier): https://supabase.com
- Railway: https://railway.app
- Heroku Postgres: https://www.heroku.com/postgres

---

## 🚀 Instalace a setup

### Krok 1: Vytvořit `.env` soubor

```bash
# Zkopírovat .env.example
copy .env.example .env
```

Upravit `.env` s reálnými údaji:

```env
JWT_SECRET=vygenerujte_silny_klic_zde

# Lokální PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/cabin_reservation?schema=public"

# Nebo Supabase/Railway URL
# DATABASE_URL="postgresql://user:password@hostname:port/database"

PORT=3000
```

### Krok 2: Generovat Prisma Client

```bash
npm run prisma:generate
```

### Krok 3: Vytvořit databázové schéma

**Možnost A: Prisma Migrate (doporučeno pro vývoj)**
```bash
npm run prisma:migrate
# Zadejte název migrace, např.: "init"
```

**Možnost B: DB Push (rychlejší pro development)**
```bash
npm run db:push
```

### Krok 4: Migrovat data z JSON

Pokud máte existující data v `data/*.json` souborech:

```bash
npm run db:seed
```

Tento skript:
- Načte všechna JSON data
- Převede denormalizovaná data (username → userId)
- Převede admin ID z `"admin"` na UUID
- Vytvoří junction tabulky pro M:N vztahy

### Krok 5: Spustit aplikaci

```bash
npm run dev
```

Server běží na: http://localhost:3000  
Health check: http://localhost:3000/api/health

---

## 📁 Struktura projektu

```
Cabin_Reservation_App/
├── prisma/
│   └── schema.prisma              # Databázové schéma
├── src/
│   ├── backend/
│   │   ├── server.new.ts          # 🆕 Refaktorovaný server
│   │   ├── server.ts              # ⚠️ Starý server (můžete smazat)
│   │   └── routes/                # 🆕 Route moduly
│   │       ├── auth.ts
│   │       ├── users.ts
│   │       ├── reservations.ts
│   │       ├── shoppingList.ts
│   │       ├── notes.ts
│   │       ├── gallery.ts
│   │       ├── diary.ts
│   │       └── reconstruction.ts
│   ├── config/
│   │   └── config.ts              # ✅ Aktualizováno (DATABASE_URL)
│   ├── middleware/
│   │   └── authMiddleware.ts      # ✅ Beze změn
│   ├── scripts/
│   │   └── migrateData.ts         # 🆕 Migrační skript
│   ├── types.ts                   # ✅ Aktualizováno (JwtPayload)
│   ├── utils/
│   │   ├── auth.ts                # ⚠️ Zastaralé (můžete smazat)
│   │   └── prisma.ts              # 🆕 Prisma Client
│   └── validators/                # 🆕 Zod schémata
│       ├── schemas.ts
│       └── validate.ts
├── .env.example                   # 🆕 Vzorová konfigurace
└── package.json                   # ✅ Aktualizováno (nové scripty)
```

---

## 🛠️ Užitečné příkazy

```bash
# Spustit dev server
npm run dev

# Vygenerovat Prisma Client po změně schématu
npm run prisma:generate

# Vytvořit novou migraci
npm run prisma:migrate

# Otevřít Prisma Studio (GUI pro databázi)
npm run prisma:studio

# Synchronizovat schéma bez migrace
npm run db:push

# Migrovat data z JSON
npm run db:seed

# Build pro produkci
npm run build
npm start
```

---

## 🔄 API změny (zpětná kompatibilita zachována)

### Beze změn:
- Všechny endpointy zůstávají stejné
- Request/Response formáty jsou zachovány
- Frontend **nevyžaduje žádné úpravy**

### Interní změny:
- Username je nyní získáván přes JOIN místo ukládání redundantně
- UUID jsou zachovány (kromě admin usera, který dostává nové UUID)
- Pole `splitWith[]`, `votes[]`, `galleryPhotoIds[]` jsou v junction tabulkách

---

## 🐛 Troubleshooting

### Problém: "Can't reach database server"

```bash
# Zkontrolovat, zda PostgreSQL běží
# Windows:
services.msc  # Najít "postgresql-x64-15"

# Docker:
docker ps  # Zkontrolovat running containers
```

### Problém: "Environment variable not found: DATABASE_URL"

```bash
# Ujistit se, že .env existuje
dir .env

# Zkontrolovat obsah
type .env
```

### Problém: Migrace selže kvůli duplicitním datům

```bash
# Vymazat všechna data a začít znovu
npm run prisma:migrate -- reset
npm run db:seed
```

---

## 🔐 Security checklist pro produkci

- [ ] Změnit `JWT_SECRET` na silný náhodný klíč
- [ ] Použít HTTPS (SSL certifikát)
- [ ] Nastavit PostgreSQL firewall pravidla
- [ ] Použít environment variables (ne .env v repozitáři)
- [ ] Povolit pouze potřebné CORS origins
- [ ] Nastavit rate limiting na více endpointů
- [ ] Pravidelné zálohy databáze

---

## 📊 Metriky migrace

| Metrika | Před | Po |
|---------|------|-----|
| Backend řádků | 933 | 8× ~150 (modulární) |
| Datové soubory | 9× JSON | 1× PostgreSQL |
| Denormalizace | 6 případů | 0 (JOINy) |
| Security middleware | 1 (auth) | 4 (helmet, rate-limit, zod) |
| API endpointy | 42 | 42 (zachováno) |

---

## 🆘 Podpora

Pokud máte problémy:
1. Zkontrolovat logy serveru
2. Zkontrolovat databázové connection
3. Otevřít Prisma Studio pro inspekci dat: `npm run prisma:studio`

---

**Migrace hotova! 🎉**
