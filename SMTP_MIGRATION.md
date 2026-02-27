# 📧 Migrace na Amazon SES — Návod k dokončení

## ✅ Co bylo provedeno automaticky

1. **Odinstalován Resend** balíček (`npm uninstall resend`)
2. **@types/nodemailer** už byl nainstalován (verze 7.0.11)
3. **config.ts** aktualizováno:
   - Odstraněno `RESEND_API_KEY`
   - Sjednoceno `EMAIL_FROM` jako hlavní proměnná
   - Aktualizovány komentáře pro Amazon SES (Frankfurt eu-central-1)
4. **email.ts** kompletně přepsáno:
   - `sendVerificationEmailWithPIN()` — legacy PIN-based systém
   - `sendVerificationEmailWithToken()` — nový token-based systém s aktivačním odkazem
   - Obě funkce používají Amazon SES SMTP přes nodemailer
   - Moderní HTML šablony s brandingem "KdyNaChatu.cz"
5. **auth.ts** aktualizováno:
   - Import pouze z `email.ts` (místo dvou souborů)
   - Používá nové funkce pro odesílání emailů
6. **mailer.ts** smazán (zastaralý Resend kód)
7. **.env.example** aktualizován s příklady pro Amazon SES

## ⚠️ CO MUSÍTE UDĚLAT RUČNĚ

### 1. Vytvořit/aktualizovat `.env` soubor

Do vašeho `.env` souboru (který je v `.gitignore`) **přidejte tyto řádky**:

```env
# Amazon SES (SMTP) — Frankfurt eu-central-1
SMTP_HOST=email-smtp.eu-central-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIARLE5ACYARH6PX6S3
SMTP_PASS=BAgLKfy6WYSaNVkBFL1hREVP5JYXzd/+TLFFdJWDI2dr
EMAIL_FROM="KdyNaChatu <noreply@chataceskestredohori.cz>"

# Frontend URL (pro ověřovací odkazy)
FRONTEND_URL=https://chataceskestredohori.cz
```

**Poznámka:** Pro lokální vývoj použijte `FRONTEND_URL=http://localhost:5173`

### 2. Odstranit starou proměnnou RESEND_API_KEY

Pokud máte v `.env` proměnnou `RESEND_API_KEY`, smažte ji — už se nepoužívá.

### 3. Restartovat aplikaci

```bash
npm run dev
```

### 4. Testování odesílání emailů

**Registrace nového uživatele:**
- Zkuste zaregistrovat testovacího uživatele s platnou e-mailovou adresou
- Ověřte, že e-mail přijde s aktivačním odkazem
- Klikněte na odkaz a zkontrolujte, že se účet aktivuje

**Zkontrolujte logy:**
```bash
# V konzoli backendu uvidíte:
[EMAIL] Verification token email sent to test@example.com { messageId: '...' }
```

Pokud vidíte `[SIMULATION]` místo `sent to`, znamená to že SMTP credentials nejsou správně nastavené.

## 🏗️ Architektura emailového systému

### Jak to teď funguje:

```
auth.ts (registrace/login)
    ↓
email.ts (dvě funkce)
    ├─ sendVerificationEmailWithPIN(email, code)     → legacy fallback
    └─ sendVerificationEmailWithToken(email, token)  → hlavní SaaS flow
        ↓
Amazon SES SMTP (email-smtp.eu-central-1.amazonaws.com)
    ↓
E-mail doručen uživateli
```

### Dvě metody ověření:

1. **Token-based** (nový — preferovaný):
   - Při registraci se vygeneruje `verificationToken` (32-byte hex)
   - Uživatel dostane e-mail s odkazem: `#/verify?token=...`
   - Klikne → účet se aktivuje

2. **PIN-based** (legacy — fallback):
   - Pokud token-based selže, použije se 6místný PIN kód
   - Uživatel musí zadat kód ručně v aplikaci

## 🔍 Ověření migrace

Zkontrolujte tyto soubory:

- [x] `package.json` — `resend` NENÍ v dependencies
- [x] `src/config/config.ts` — žádná zmínka o `RESEND_API_KEY`
- [x] `src/utils/email.ts` — dvě exportované funkce
- [x] `src/utils/mailer.ts` — soubor NEEXISTUJE
- [x] `src/backend/routes/auth.ts` — import pouze z `email.ts`
- [x] `.env.example` — obsahuje Amazon SES příklady

## 📌 Důležité poznámky

- **Doména `chataceskestredohori.cz` musí být ověřená v Amazon SES** (jinak e-maily nepůjdou odeslat)
- **SMTP credentials jsou pro Frankfurt region** (eu-central-1)
- **Port 587** používá STARTTLS (secure: false v nodemailer)
- **Limity SES:** Sandbox módu 200 e-mailů/den, produkční režim až 50,000/den (závisí na reputaci)

## 🚨 Troubleshooting

### E-mail se neodešle (simulation mode)
→ Zkontrolujte že `.env` obsahuje správné `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`

### Amazon SES vrací chybu "Email address not verified"
→ Doména nebo e-mailová adresa ještě není ověřená v AWS SES konzoli

### E-mail končí ve spamu
→ Zkontrolujte SPF/DKIM/DMARC DNS záznamy pro doménu

### TypeScript stěžuje na missing types
→ Zkontrolujte že `@types/nodemailer` je nainstalován: `npm list @types/nodemailer`

---

**Máte všechno připraveno!** Stačí vyplnit `.env` a restartovat aplikaci. 🎉
