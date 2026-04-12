# kdynachatu.cz — Kompletní plán do veřejného launche

> Vytvořeno: 12. dubna 2026
> Aktuální stav: 58% SaaS ready / 88% feature complete

---

## Přehled fází

```
FÁZE 0: Security hotfixy          ░░ 1-2 dny    ← OKAMŽITĚ
FÁZE 1: GDPR & právní minimum     ░░ 3-5 dní
FÁZE 2: Core missing features     ░░ 1-2 týdny  
FÁZE 3: Closed Beta (5-10 rodin)  ░░ 2-3 týdny (testování)
FÁZE 4: Monetizace & platby       ░░ 1-2 týdny
FÁZE 5: Polish & monitoring       ░░ 1 týden
FÁZE 6: Public Launch             ░░ D-Day
```

---

## FÁZE 0: Security Hotfixy (1-2 dny)

Kritické bezpečnostní díry, které MUSÍ být opraveny před jakýmkoli sdílením s veřejností.

### 0.1 — Odstranit testCode/testToken leak
- **Problém:** `src/backend/routes/auth.ts` řádky ~99 a ~247 vracejí verifikační kódy/tokeny v API response pokud selže email. Frontend je dokonce zobrazuje uživateli.
- **Dopad:** Kdokoli může obejít email verifikaci
- **Řešení:**
  - Backend: Podmínit `if (process.env.NODE_ENV !== 'production')` kolem testCode/testToken
  - Frontend `LoginForm.tsx` řádky ~53-59: Odstranit auto-fill testCode
  - Frontend `RegisterForm.tsx`: Stejné

### 0.2 — Rate limiting na verifikační endpointy
- **Problém:** `/api/verify-email` a `/api/verify-token` nemají rate limiting
- **Dopad:** 6-ciferný kód = ~1M kombinací, brute-forceable za hodiny
- **Řešení:** Přidat `authLimiter` (max 5 pokusů / 15 min / IP) v `server.new.ts`

### 0.3 — Expirace verifikačních kódů
- **Problém:** Kódy nikdy neexpirují (schema nemá `expiresAt`)
- **Řešení:**
  1. Přidat `verificationCodeExpiresAt DateTime?` do `prisma/schema.prisma` (model User)
  2. Migrace
  3. Při generování kódu nastavit expiraci 15 min
  4. Při ověřování kontrolovat `expiresAt > now()`

### 0.4 — CORS zpřísnění
- **Problém:** `origin: true` v produkci = cokoliv může volat API
- **Řešení:** Whitelist `['https://kdynachatu.cz', 'https://www.kdynachatu.cz']`

### 0.5 — Automatické DB backupy
- **Problém:** Žádné automatické zálohy. Pokud DB umře, všechna data pryč.
- **Řešení:** Cron job na serveru: `pg_dump` 1×/den → off-site (S3 / jiný server)

---

## FÁZE 1: GDPR & Právní minimum (3-5 dní)

EU legislativa vyžaduje tyto věci PŘED sběrem osobních údajů.

### 1.1 — Privacy Policy stránka
- **Co:** Statická stránka na `/privacy` s textem ochrana osobních údajů
- **Soubory:**
  - Nový: `frontend-v2/src/features/legal/PrivacyPage.tsx`
  - Route v `App.tsx`
  - Opravit footer link v `LandingPage.tsx` (řádek ~440, teď `href="#"`)
- **Obsah:** Jaká data sbíráme, proč, jak dlouho, kdo má přístup, kontakt na správce

### 1.2 — Terms of Service stránka
- **Co:** `/terms` — obchodní podmínky
- **Soubory:** Analogicky k Privacy Policy
- **Obsah:** Podmínky použití služby, odpovědnost, pravidla

### 1.3 — Self-service smazání účtu (GDPR Art. 17)
- **Co:** Uživatel musí mít možnost smazat svůj účet sám
- **Backend:**
  - Nový endpoint `DELETE /api/users/me` v `src/backend/routes/users.ts`
  - Cascade delete: rezervace, zprávy, fotky, deníkové záznamy
  - Anonymizace referencí kde cascade není vhodný
- **Frontend:**
  - Tlačítko "Smazat účet" v ProfileDrawer → Security tab
  - ConfirmDialog s potvrzením "SMAZAT"

### 1.4 — Data export (GDPR Art. 20)
- **Co:** Endpoint pro stažení všech osobních dat uživatele
- **Backend:**
  - `GET /api/users/me/export` → JSON soubor se všemi daty
  - Zahrnuje: profil, rezervace, zprávy, fotky (metadata), deníky, nákupy
- **Frontend:**
  - Tlačítko "Exportovat moje data" v ProfileDrawer

### 1.5 — Cookie/consent banner
- **Co:** Info banner na landing page o zpracování dat
- **Poznámka:** App nepoužívá tracking cookies, ale GDPR vyžaduje informovaný souhlas s localStorage (JWT)
- **Soubory:** Nový `frontend-v2/src/components/shared/CookieConsent.tsx`

---

## FÁZE 2: Core Missing Features (1-2 týdny)

Features bez kterých je produkt nepoužitelný pro cizí lidi.

### 2.1 — Password reset flow (CRITICAL)
- **Problém:** Zapomenuté heslo = ztracený účet, žádná cesta zpět
- **Backend:**
  - `POST /api/forgot-password` — přijme email, vygeneruje reset token, pošle email s linkem
  - `POST /api/reset-password` — přijme token + nové heslo, změní
  - Nové pole v schema: `passwordResetToken String?`, `passwordResetExpiresAt DateTime?`
  - Zod schémata v `validators/schemas.ts`
- **Frontend:**
  - Nová stránka `/forgot-password` → `ForgotPasswordPage.tsx`
  - Link "Zapomněli jste heslo?" na login stránce
  - Formulář pro zadání emailu → potvrzení odeslání
  - Stránka `/reset-password?token=xxx` → nové heslo
- **Email šablona:**
  - Nová funkce `sendPasswordResetEmail()` v `src/utils/email.ts`

### 2.2 — Email notifikace pro klíčové události
- **Problém:** Žádné notifikace = uživatelé zapomenou na app = churn
- **Minimum pro launch:**
  - Nová rezervace v mojí chatě → email vlastníkovi/adminovi
  - Nová zpráva v chatu → email účastníkům (s debounce, ne každou zprávu)
  - Pozvánka přijata → email adminovi
- **Backend:**
  - Nový soubor `src/backend/routes/notifications.ts` nebo inline v existujících routes
  - Nové email šablony v `src/utils/email.ts`
  - Tabulka `NotificationPreference` v schema (user si může vypnout)
- **Frontend:**
  - Notification preferences v ProfileDrawer
  - Toggle: "Posílat emailové notifikace o nových rezervacích" atd.

### 2.3 — PWA manifest fix
- **Problém:** `name: 'Chata Třebenice'` hardcoded v `vite.config.ts`
- **Řešení:** Dynamický manifest endpoint nebo generické jméno "kdynachatu.cz"
- **Soubory:** `frontend-v2/vite.config.ts` řádky ~24-26

### 2.4 — Paginace na velkých seznamech
- **Problém:** Gallery, shopping items, notes — vše se tahá najednou. Při 1000+ záznamech = pomalé + crash
- **Endpointy k úpravě:**
  - `GET /api/gallery/photos` → přidat `take` + `skip` + `total` count
  - `GET /api/shopping/:listId/items` → pagination
  - `GET /api/notes/:threadId` → cursor pagination (částečně existuje)
- **Frontend:** Infinite scroll nebo "Load more" tlačítko

---

## FÁZE 3: Closed Beta (2-3 týdny testování)

### 3.1 — Pozvat 5-10 reálných rodin
- Vytvořit invite kódy pro beta testery
- Aktivně sbírat feedback (in-app formulář nebo Discord)
- Monitorovat chyby přes error reporting endpoint

### 3.2 — Sentry integrace
- **Co:** External error monitoring — vidíte chyby v reálném čase
- **Frontend:** `@sentry/react` init v `main.tsx`
- **Backend:** `@sentry/node` init v `server.new.ts`
- **Cena:** Free tier = 5K errors/měsíc (stačí pro beta)

### 3.3 — Analytics
- **Co:** Vědět kolik lidí navštíví landing page, kolik se registruje, kolik se vrátí
- **Doporučení:** Plausible.io (GDPR-compliant, bez cookies, €9/měs)
- **Alternativa:** PostHog self-hosted (zdarma)
- **Implementace:** `<script>` tag v `index.html`

### 3.4 — Uptime monitoring
- **Co:** Vědět když server spadne
- **Doporučení:** Better Stack (free tier) nebo UptimeRobot
- **Endpoint:** Monitorovat `GET /api/health`

### 3.5 — Beta feedback loop
- Týdenní check-in s beta testery
- Bug tracking (GitHub Issues)
- Prioritizace podle reálného feedbacku
- Iterace na UX problémech

---

## FÁZE 4: Monetizace & Platby (1-2 týdny)

### 4.1 — Stripe integrace
- **Backend:**
  - `npm install stripe`
  - Nový route soubor `src/backend/routes/billing.ts`
  - Stripe Checkout Session pro upgrade
  - Webhook handler pro `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_failed`
- **Prisma schema:**
  ```prisma
  model Subscription {
    id              String   @id @default(uuid())
    cabinId         String   @unique
    cabin           Cabin    @relation(fields: [cabinId])
    stripeCustomerId    String
    stripeSubscriptionId String
    plan            String   // 'free' | 'standard' | 'premium'
    status          String   // 'active' | 'canceled' | 'past_due'
    currentPeriodEnd DateTime
    createdAt       DateTime @default(now())
  }
  ```
- **Frontend:**
  - Billing stránka v cabin settings nebo nová `/billing` route
  - Zobrazení aktuálního plánu, datum příštího účtování
  - Tlačítko "Upgradovat" → Stripe Checkout
  - Tlačítko "Zrušit předplatné"

### 4.2 — Tier enforcement
- **Backend middleware:** `requirePlan('standard')` na endpointy které jsou za paywallem
- **Rozhodnutí:** Co je free vs. paid?
  - **Free:** 1 chata, 3 členové, základní rezervace + nákupy
  - **Standard (89 Kč/měs):** Neomezení členové, galerie, deník, rekonstrukce, inventář
  - **Premium (sezónní):** Vše + prioritní podpora + custom wallpapers

### 4.3 — Upgrade nudge
- Banner na dashboard: "Používáte Free plán. Upgradujte pro přístup ke galerii a deníku."
- Locked UI state: Ikona zámku na disabled modulech

---

## FÁZE 5: Polish & Monitoring (1 týden)

### 5.1 — Přístupnost (a11y) základy
- `<main>` landmark v AppShell
- Focus trap v Modal.tsx
- Skip-to-content link
- Keyboard navigace v dropdownech
- Color contrast audit (WCAG AA)

### 5.2 — Performance audit
- Lighthouse audit na všech stránkách
- Bundle size optimalizace (index.js je 510 KB)
- Image lazy loading audit
- Service Worker cache strategie review

### 5.3 — SEO pro landing page
- `<meta>` OG tags (title, description, image)
- `sitemap.xml` + `robots.txt`
- Structured data (JSON-LD) pro SaaS produkt

### 5.4 — Finální UX review
- Projít všechny stránky na 320px šířku
- Test všech flows end-to-end (registrace → onboarding → rezervace → checkout)
- Empty state review na každé stránce
- Error state review

### 5.5 — Dokumentace
- FAQ stránka / Help center základ
- Onboarding email sekvence (welcome → tips → follow-up)

---

## FÁZE 6: Public Launch (D-Day)

### Den launche
- [ ] Otevřít registraci pro veřejnost
- [ ] Marketing: Product Hunt submission
- [ ] Marketing: České tech fóra (Root.cz, Lupa.cz)
- [ ] Marketing: Facebook skupiny chatařů a chalupářů
- [ ] Social media: Twitter/X, LinkedIn post
- [ ] Blog post: "Proč jsme vytvořili kdynachatu.cz"

### Týden po launchi
- [ ] Monitrovat Sentry chyby
- [ ] Monitorovat registrace + konverze (analytics)
- [ ] Reagovat na feedback
- [ ] Hotfix sprint pokud je potřeba

---

## Věci které NEJSOU potřeba pro launch (V2+ backlog)

| Feature | Proč ne teď |
|---------|------------|
| Dark mode | Nice-to-have, ne blocker |
| i18n (angličtina) | Cílový trh je CZ/SK, čeština stačí |
| Drag & drop kanban | Funguje bez něj, klikací přesuny OK |
| Google Calendar sync | Wow-faktor, ale ne MVP |
| Push notifications | Email notifikace stačí pro start |
| Offline mutations | PWA shell offline stačí, POST/PUT může počkat |
| PDF export deníku | Marketing materiál, ne core funkce |
| AI asistent | Vzdálená budoucnost |
| Mobile native app | PWA stačí |
| Multi-language | CZ trh first |
| Super admin dashboard | Interní tool, stačí SSH + DB |
| Testy (unit/integration) | Ideálně by měly být, ale pro MVP launch ne blocker |

---

## Odhad zdrojů

| Fáze | Složitost | Hlavní práce |
|------|-----------|-------------|
| Fáze 0 | XS | 5 malých úprav v existujícím kódu |
| Fáze 1 | S-M | 2 statické stránky + 2 nové endpointy + 1 komponenta |
| Fáze 2 | M-L | Password reset (end-to-end), email notifikace, paginace |
| Fáze 3 | S | Sentry script, analytics script, pozvánky rodinám |
| Fáze 4 | L | Stripe integrace (Checkout + Webhooks + UI) |
| Fáze 5 | M | A11y, SEO, performance, UX review |
| Fáze 6 | XS | Marketing, monitoring |

---

## Závislostní graf

```
Fáze 0 (Security) ← MUSÍ být první
    ↓
Fáze 1 (GDPR/Legal) ← Nutné před sběrem dat od cizích lidí
    ↓
Fáze 2 (Core features) ← Password reset + notifikace
    ↓
Fáze 3 (Closed Beta) ← Testování s reálnými uživateli
    ↓                    (paralelně Fáze 4)
Fáze 4 (Platby) ─────── Může běžet paralelně s betou
    ↓
Fáze 5 (Polish) ← Finální leštění na základě beta feedbacku
    ↓
Fáze 6 (Launch) ← Go!
```

---

## Shrnutí — co chybí do launche

| Kategorie | Počet úkolů | Kritičnost |
|-----------|:-----------:|:----------:|
| Security hotfixy | 5 | 🔴 CRITICAL |
| GDPR & Legal | 5 | 🔴 CRITICAL |
| Core features | 4 | 🟡 HIGH |
| Monitoring & Analytics | 3 | 🟡 HIGH |
| Monetizace | 3 | 🟡 HIGH (pro příjmy) |
| Polish & a11y | 5 | 🟢 MEDIUM |
| Marketing | 5 | 🟢 MEDIUM |
| **CELKEM** | **30** | |
