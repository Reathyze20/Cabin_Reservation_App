# Launch Readiness Checklist — kdynachatu.cz

Vše co musí fungovat PŘED tím, než řekneš prvnímu uživateli "zkus to".

---

## 🔴 Blocker (bez tohoto NELAUNČUJ)

### Infrastruktura & DevOps
- [ ] HTTPS na produkční doméně (kdynachatu.cz)
- [ ] DNS správně nakonfigurovaný (A záznam nebo CNAME)
- [ ] PM2 s auto-restart při crashnutí
- [ ] GitHub Actions CI/CD funguje (push → deploy)
- [ ] Database backupy (min 1× denně, automaticky)
- [ ] `.env` proměnné na produkci (JWT_SECRET silný, min 64 znaků)
- [ ] Oddělená produkční databáze (ne dev/test DB)
- [ ] `NODE_ENV=production` na serveru
- [ ] Disk monitoring (alert pokud se uploads disk zaplní)

### Bezpečnost
- [ ] Helmet middleware aktivní (security headers)
- [ ] CORS omezen na produkční doménu (ne `*`)
- [ ] Rate limiting na auth endpointy (login, register, password reset)
- [ ] JWT expiration nastavená (max 7 dní, refresh token pattern ideální)
- [ ] Hesla hashovaná (bcrypt, min 10 rounds)
- [ ] Žádné citlivé údaje v git repozitáři (secrets, API klíče)
- [ ] Žádné console.log na produkci (pino logger only)
- [ ] SQL injection prevence (Prisma parametrizuje automaticky — ověř že nikde není `$queryRawUnsafe` s user inputem)
- [ ] XSS prevence (žádný `innerHTML` s user daty bez sanitizace)
- [ ] File upload validace (MIME type whitelist, max size 10MB)
- [ ] Admin panel chráněný role checkem

### Základní funkčnost
- [ ] Registrace nového tenantu (chaty) funguje end-to-end
- [ ] Login/logout funguje
- [ ] Password reset funguje (email se doručí)
- [ ] Pozvání člena funguje (link/email)
- [ ] Rezervace CRUD funguje
- [ ] Kalendář zobrazuje správně
- [ ] Nákupní seznam funguje
- [ ] Poznámky fungují
- [ ] Nastavení chaty funguje (admin)
- [ ] Správa členů funguje (admin)
- [ ] Všechny stránky mají loading state (ne blank page)
- [ ] Všechny stránky mají error state (ne bílá stránka)
- [ ] Všechny stránky mají empty state (ne prázdná stránka)
- [ ] Mobile funguje (320px–428px šířka)
- [ ] PWA instalovatelná na Android/iOS

### Právní minimum (CZ/EU)
- [ ] Obchodní podmínky (nebo alespoň Terms of Service)
- [ ] Ochrana osobních údajů (GDPR — zpracování dat, právo na výmaz)
- [ ] Cookie consent (pokud používáš analytics/tracking cookies)
- [ ] Kontaktní informace (email, případně IČO pokud podnikáš)

---

## 🟡 Důležité (oprav do 2 týdnů po launchi)

### Monitoring & Alerting
- [ ] Error tracking (Sentry nebo podobný) — zachytí JS chyby v produkci
- [ ] Uptime monitoring (UptimeRobot free tier — ping každých 5 min)
- [ ] PM2 log rotace (aby logy nezaplnily disk)
- [ ] Health check endpoint (`GET /api/health` → 200 OK s DB ping)
- [ ] Alert na email při opakovaných 500 chybách

### Performance
- [ ] Gzip/Brotli komprese (compression middleware)
- [ ] Statické assety s cache headers (Vite hash v názvu souboru)
- [ ] Obrázky optimalizované (sharp thumbnaily, lazy loading)
- [ ] Lighthouse score > 80 na mobile
- [ ] First Contentful Paint < 2s na 4G
- [ ] API response time < 500ms pro běžné operace

### UX Polish
- [ ] Favicon a app icon (192×192, 512×512 pro PWA)
- [ ] Loading spinner/skeleton na každé stránce
- [ ] Toast notifikace pro úspěch/chybu
- [ ] Potvrzovací dialog pro destruktivní akce (smazání)
- [ ] 404 stránka (hezká, ne default)
- [ ] Offline fallback stránka (PWA)

### Landing Page
- [ ] Veřejná landing page na kdynachatu.cz (ne login screen!)
- [ ] Hero section — co to dělá, pro koho, proč
- [ ] Screenshots/mockupy aplikace
- [ ] CTA: "Vytvořit chatu zdarma"
- [ ] Pricing sekce (pokud platíš)
- [ ] Footer s kontaktem a právními odkazy

---

## 🟢 Nice-to-Have (měsíc 1–2)

### Analytics
- [ ] Plausible/PostHog/Umami (GDPR-friendly analytics)
- [ ] Event tracking: registrace, vytvoření chaty, pozvání člena, první rezervace
- [ ] Funnel: landing → registrace → vytvoření chaty → pozvání člena → první rezervace
- [ ] Retention metrika: kolik % se vrátí po 7 dnech

### Email
- [ ] Transakční emaily mají hezký template (ne plain text)
- [ ] Welcome email po registraci
- [ ] Weekly digest (co se dělo na chatě)
- [ ] Unsubscribe link v každém emailu

### SEO
- [ ] Meta title a description na landing page
- [ ] Open Graph tags (sdílení na FB/Twitter)
- [ ] Sitemap.xml
- [ ] robots.txt

### Feedback & Support
- [ ] Jednoduchý feedback formulář v appce
- [ ] Kontaktní email v patičce
- [ ] Changelog / "Co je nového" stránka

---

## Launch Day Checklist (den D)

1. [ ] Zkontroluj že produkce běží (`curl https://kdynachatu.cz`)
2. [ ] Registruj se jako nový uživatel (ne admin dev účet) — celý flow
3. [ ] Vytvoř chatu, pozvi člena, udělej rezervaci
4. [ ] Ověř na mobilu (skutečný telefon, ne dev tools)
5. [ ] Ověř emaily (doručují se? vypadají dobře?)
6. [ ] Zapni monitoring (UptimeRobot)
7. [ ] Zapni error tracking (Sentry)
8. [ ] Sdílej link prvním beta testerům
9. [ ] Sleduj logy prvních 2 hodiny
10. [ ] Měj připravený rollback plán (git revert, PM2 restart)
