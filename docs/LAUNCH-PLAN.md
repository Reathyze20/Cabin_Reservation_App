# kdynachatu.cz — Detailní plán do veřejného launche

> **Vytvořeno:** 12. dubna 2026  
> **Aktuální stav:** 58 % SaaS ready / 88 % feature complete  
> **Cíl dokumentu:** Kompletní checklist všeho co musí být hotové před public launch

---

## Obsah

- [Scorecard — Současný stav](#scorecard--současný-stav)
- [Matice modulů](#matice-modulů)
- [Silné stránky](#silné-stránky)
- [Přehled fází](#přehled-fází)
- [FÁZE 0: Security hotfixy](#fáze-0-security-hotfixy-1-2-dny)
- [FÁZE 1: GDPR & právní minimum](#fáze-1-gdpr--právní-minimum-3-5-dní)
- [FÁZE 2: Core missing features](#fáze-2-core-missing-features-1-2-týdny)
- [FÁZE 3: Closed Beta](#fáze-3-closed-beta-2-3-týdny)
- [FÁZE 4: Monetizace & platby](#fáze-4-monetizace--platby-1-2-týdny)
- [FÁZE 5: Polish & monitoring](#fáze-5-polish--monitoring-1-týden)
- [FÁZE 6: Public Launch](#fáze-6-public-launch)
- [V2+ Backlog](#v2-backlog--nepotřeba-pro-launch)
- [Závislostní graf](#závislostní-graf)
- [Rizika](#rizika)

---

## Scorecard — Současný stav

| Dimenze | Skóre | Poznámky |
|---------|:-----:|---------|
| **Funkční pokrytí** | 7/10 | Jádro hotovo (rezervace, nákupy, chat, galerie, deník, rekonstrukce). Chybí platby, notifikace, GDPR. |
| **UX Intuitivnost** | 7/10 | Kvalitní onboarding, HelpFab, empty states. Registrace je trochu heavy. |
| **Vizuální kvalita** | 8/10 | Glass morfismus, skeletony, Framer Motion animace. Landing page profesionální. |
| **Mobile Experience** | 7/10 | Bottom nav, MobileHeader, responsive breakpoints. Potřebuje víc testů na 320px. |
| **Výkon** | 7/10 | Lazy loading stránek, TanStack Query cache, code splitting. Chybí paginace na většině endpointů. |
| **Bezpečnost** | 7/10 | JWT, protect middleware, Zod validace, escapeHtml. Ale testCode leak, chybí password reset, CORS příliš otevřený. |
| **Multi-tenant ready** | 8/10 | `cabinId` na všech modelech, `requireCabin` middleware, `X-Cabin-Id` header. Solidní základ. |
| **Přístupnost (a11y)** | 5/10 | Skip link chybí, ARIA labely minimální, keyboard nav nedostatečná. |
| **Monetizace** | 3/10 | Ceník na landing page, ale ŽÁDNÁ implementace platebního systému. |
| **Infrastruktura** | 6/10 | CI/CD deploy funguje, health check existuje. Chybí Sentry, analytics, backup, monitoring. |
| **GDPR & Legal** | 7/10 | PP, ToS, smazání účtu, data export, cookie consent. ✅ |
| **Testy** | 1/10 | 1 test soubor (VerifyEmailPage.test.tsx), nulové backend testy. |
| **Celkové SaaS skóre** | **58 %** | **Vynikající MVP / closed beta. Pro public launch chybí kritické kusy.** |

**Verdikt:** Technicky solidní produkt s bohatou funkcionalitou. Ale mezi "funguje pro mou rodinu" a "platící cizí lidé" je propast ~30 úkolů.

---

## Matice modulů

| Modul | FE | BE | Loading/Empty/Error | Mobile | CRUD | Stav |
|-------|:--:|:--:|:-------------------:|:------:|:----:|:----:|
| Landing page | ✅ | — | — | ✅ | — | ✅ Hotovo |
| Registrace + Login | ✅ | ✅ | ✅ | ✅ | — | ✅ Hotovo |
| Email verifikace | ✅ | ✅ | ✅ | ✅ | — | ✅ Hotovo |
| Onboarding (create cabin) | ✅ | ✅ | ✅ | ✅ | — | ✅ Hotovo |
| Invite flow | ✅ | ✅ | ✅ | ✅ | — | ✅ Hotovo |
| Dashboard | ✅ | ✅ | ✅ (skeletony) | ✅ | R | ✅ Hotovo |
| Rezervace | ✅ | ✅ | ✅ (skeleton) | ✅ | CRUD | ✅ Hotovo |
| Nákupy + Inventář | ✅ | ✅ | ✅ | ✅ | CRUD | ✅ Hotovo |
| Chat / Nástěnka | ✅ | ✅ | ✅ | ✅ | CRUD | ✅ Hotovo |
| Galerie | ✅ | ✅ | ✅ (skeleton) | ✅ | CRUD | ✅ Hotovo |
| Deník | ✅ | ✅ | ✅ | ✅ | CRUD | ✅ Hotovo |
| Rekonstrukce | ✅ | ✅ | ✅ | ✅ | CRUD | ✅ Hotovo |
| Admin panel | ✅ | ✅ | ✅ | ⚠️ | CRUD | ✅ Hotovo |
| Cabin Settings | ✅ | ✅ | ✅ | ⚠️ | RU | ✅ Hotovo |
| Profil (Drawer) | ✅ | ✅ | ✅ | ✅ | RU | ✅ Hotovo |
| Feature flags | ✅ | ✅ | — | — | — | ✅ Hotovo |
| 404 stránka | ✅ | — | — | ✅ | — | ✅ Hotovo |
| Help FAB | ✅ | — | — | ✅ | — | ✅ Hotovo |
| PWA / Offline | ✅ | — | ✅ (banner) | ✅ | — | ⚠️ Částečné |
| Socket.io (realtime) | ✅ | ✅ | — | — | — | ⚠️ Částečné |
| **Password reset** | ❌ | ❌ | — | — | — | ❌ Chybí |
| **Platby / Billing** | ❌ | ❌ | — | — | — | ❌ Chybí |
| **Notifikace (email)** | ❌ | ❌ | — | — | — | ❌ Chybí |
| **Data export / GDPR** | ✅ | ✅ | — | — | R | ✅ Hotovo |
| **Smazání účtu** | ✅ | ✅ | — | — | D | ✅ Hotovo |
| **Právní stránky** | ✅ | — | — | ✅ | — | ✅ Hotovo |
| **Error monitoring** | ⚠️ | ⚠️ | — | — | — | ⚠️ Vlastní, ne Sentry |
| **Analytics** | ❌ | ❌ | — | — | — | ❌ Chybí |

---

## Silné stránky

### 1. Multi-tenant architektura
`cabinId` je na **každém datovém modelu**. `requireCabin` middleware je konzistentně na všech chráněných endpointech. `CabinGuard` na frontendu přesměruje na onboarding. Neobvykle dobrý základ pro MVP.

### 2. Auth flow
Registrace → email verifikace (token-based) → login → JWT → onboarding (create cabin) → dashboard. Invite flow pro členy funguje end-to-end.

### 3. Error handling
- `ErrorBoundary` na každé lazy-loaded stránce
- `GlobalFallback` pro root crash
- Client-side error reporting (posílá na backend)
- Skeleton loadery na dashboard widgetech
- `OfflineBanner` pro offline stav
- `showToast` pro user-facing chyby
- Backend: try/catch s `logger.error` na všech handlerech

### 4. XSS ochrana
`dangerouslySetInnerHTML` se používá výhradně s `escapeHtml()` wrapperem. Zero raw innerHTML injection.

### 5. Frontend quality
- Code splitting (lazy loaded pages)
- TanStack Query s rozumnou cache strategií
- Zod schémata pro runtime validaci API responses
- Feature flags systém (admin může vypínat moduly)
- Framer Motion animace
- Responsivní layout s MobileNav + MobileHeader

### 6. Landing page
Profesionální — hero sekce, mockup, features grid, "Jak to funguje", founder story, pricing cards, dynamický sezónní výpočet ceny.

### 7. CI/CD deploy
GitHub Actions → SSH → git reset → prisma migrate → build → PM2 restart s **failsafe trap** (pokud build spadne, restartuje se stará verze). Health check po deployi.

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

## FÁZE 0: Security hotfixy (1-2 dny)

> Kritické bezpečnostní díry. MUSÍ být opraveny před jakýmkoli sdílením.

### 0.1 Odstranit testCode/testToken leak

| | Detail |
|---|---|
| **Problém** | `src/backend/routes/auth.ts` řádky ~99 a ~247 vracejí verifikační kódy/tokeny v API response pokud selže odeslání emailu. Frontend je dokonce zobrazuje a auto-filluje. |
| **Dopad** | Kdokoli může obejít email verifikaci – stačí zachytit response |
| **Kritičnost** | 🔴 CRITICAL |

**Řešení — Backend:**
```typescript
// src/backend/routes/auth.ts, řádek ~99
// PŘED:
res.status(403).json({ message: "...", testCode: code });

// PO:
const response: Record<string, string> = { message: "..." };
if (process.env.NODE_ENV !== 'production') {
  response.testCode = code;
}
res.status(403).json(response);
```

Stejná úprava na řádku ~247 pro `testToken`.

**Řešení — Frontend:**
- `frontend-v2/src/features/auth/LoginForm.tsx` řádky ~53-59: Odstranit auto-fill testCode logiku
- `frontend-v2/src/features/auth/RegisterForm.tsx`: Stejné

**Soubory k úpravě:**
- [ ] `src/backend/routes/auth.ts` — 2 místa
- [ ] `frontend-v2/src/features/auth/LoginForm.tsx`
- [ ] `frontend-v2/src/features/auth/RegisterForm.tsx`

---

### 0.2 Rate limiting na verifikační endpointy

| | Detail |
|---|---|
| **Problém** | `/api/verify-email` a `/api/verify-token` nemají rate limiting |
| **Dopad** | 6-ciferný kód = ~1M kombinací, brute-forceable za hodiny |
| **Kritičnost** | 🔴 CRITICAL |

**Řešení:**
```typescript
// src/backend/server.new.ts — přidat k verifikačním routám
app.use("/api/verify-email", authLimiter);
app.use("/api/verify-token", authLimiter);
```

Alternativně zpřísnit na max **5 pokusů / 15 min / IP**.

**Soubory k úpravě:**
- [ ] `src/backend/server.new.ts` — přidat rate limiter middleware

---

### 0.3 Expirace verifikačních kódů

| | Detail |
|---|---|
| **Problém** | Verifikační kódy a tokeny nikdy neexpirují |
| **Dopad** | Kód vygenerovaný dnes funguje i za rok |
| **Kritičnost** | 🔴 CRITICAL |

**Řešení:**

1. Přidat pole do Prisma schema:
```prisma
// prisma/schema.prisma — model User
verificationCodeExpiresAt DateTime?  @map("verification_code_expires_at")
verificationTokenExpiresAt DateTime? @map("verification_token_expires_at")
```

2. Migrace: `npx prisma migrate dev --name add_verification_expiry`

3. Při generování kódu:
```typescript
const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minut
await prisma.user.update({
  where: { id: user.id },
  data: {
    verificationCode: code,
    verificationCodeExpiresAt: expiresAt,
  }
});
```

4. Při ověření:
```typescript
if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt < new Date()) {
  return res.status(400).json({ message: "Kód vypršel. Požádejte o nový." });
}
```

**Soubory k úpravě:**
- [ ] `prisma/schema.prisma` — 2 nová pole
- [ ] `src/backend/routes/auth.ts` — generování + ověřování kódu/tokenu

---

### 0.4 CORS zpřísnění

| | Detail |
|---|---|
| **Problém** | CORS `origin: true` v produkci = jakákoli doména může volat API |
| **Dopad** | CSRF-like útoky z cizích stránek |
| **Kritičnost** | 🟡 HIGH |

**Řešení:**
```typescript
// src/backend/server.new.ts
cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://kdynachatu.cz', 'https://www.kdynachatu.cz']
    : true,
  credentials: true,
})
```

**Soubory k úpravě:**
- [ ] `src/backend/server.new.ts` — CORS config

---

### 0.5 Automatické DB backupy

| | Detail |
|---|---|
| **Problém** | Žádné automatické zálohy databáze |
| **Dopad** | Pokud DB umře, všechna data nenávratně pryč |
| **Kritičnost** | 🔴 CRITICAL |

**Řešení:**

Cron job na serveru (VPS):
```bash
# /etc/cron.d/cabin-backup
0 3 * * * root pg_dump -U cabin_user cabin_db | gzip > /backups/cabin_$(date +\%Y\%m\%d).sql.gz
# Mazat zálohy starší 30 dní
0 4 * * * root find /backups -name "cabin_*.sql.gz" -mtime +30 -delete
```

Ideálně sync na off-site storage (S3, jiný server).

**Akce:**
- [ ] Vytvořit `/backups` adresář na VPS
- [ ] Nastavit cron job pro denní pg_dump
- [ ] Otestovat restore z backupu
- [ ] (Volitelné) Sync na S3 / jiný server

---

## FÁZE 1: GDPR & právní minimum (3-5 dní) ✅ DOKONČENO

> **Dokončeno:** 12. dubna 2026
>
> EU legislativa vyžaduje tyto věci PŘED sběrem osobních údajů od veřejnosti.

### 1.1 Privacy Policy stránka

| | Detail |
|---|---|
| **Problém** | Footer na landing page má link "Ochrana soukromí" → `href="#"` (nefunkční) |
| **Dopad** | GDPR porušení — nelze legálně sbírat osobní údaje |
| **Kritičnost** | 🔴 CRITICAL (legal blocker) |

**Implementace:**

1. Nový soubor: `frontend-v2/src/features/legal/PrivacyPage.tsx`
   - Statická stránka s textem
   - Obsahuje: jaká data sbíráme, proč, jak dlouho, kdo má přístup, kontakt na správce, práva subjektu

2. Route v `App.tsx`:
   ```tsx
   <Route path="/privacy" element={<PrivacyPage />} />
   ```

3. Opravit link v `LandingPage.tsx` (řádek ~440):
   ```tsx
   // PŘED: <a href="#">Ochrana soukromí</a>
   // PO:   <Link to="/privacy">Ochrana soukromí</Link>
   ```

**Obsah stránky (minimální):**
- Správce údajů (jméno, kontakt)
- Jaké údaje sbíráme (email, jméno, fotky, text záznamů)
- Účel zpracování (provoz služby)
- Doba uchování
- Práva subjektu (přístup, oprava, smazání, export)
- Souhlas se zpracováním
- Cookies a localStorage info

**Soubory:**
- [x] Vytvořit `frontend-v2/src/features/legal/PrivacyPage.tsx`
- [x] Přidat route v `frontend-v2/src/App.tsx`
- [x] Opravit link v `frontend-v2/src/features/landing/LandingPage.tsx`

---

### 1.2 Terms of Service stránka

| | Detail |
|---|---|
| **Problém** | Link "Obchodní podmínky" na landing page → `href="#"` |
| **Kritičnost** | 🔴 CRITICAL (legal blocker) |

**Implementace:** Analogicky k Privacy Policy.

**Obsah (minimální):**
- Popis služby
- Podmínky registrace
- Pravidla používání
- Odpovědnost
- Ukončení služby
- Změny podmínek

**Soubory:**
- [x] Vytvořit `frontend-v2/src/features/legal/TermsPage.tsx`
- [x] Přidat route v `frontend-v2/src/App.tsx`
- [x] Opravit link v `frontend-v2/src/features/landing/LandingPage.tsx`

---

### 1.3 Self-service smazání účtu (GDPR Art. 17)

| | Detail |
|---|---|
| **Problém** | Uživatel nemůže smazat svůj účet sám. Existuje `DELETE /api/users/:id` ale pouze pro admina. |
| **Dopad** | Porušení GDPR práva na výmaz |
| **Kritičnost** | 🔴 CRITICAL |

**Backend:**
```typescript
// src/backend/routes/users.ts — nový endpoint
router.delete("/me", protect, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Neautorizováno" });

    await prisma.$transaction(async (tx) => {
      const userId = req.user!.userId;

      // Cascade: smazat data uživatele
      await tx.note.deleteMany({ where: { userId } });
      await tx.noteReaction.deleteMany({ where: { userId } });
      await tx.reservation.deleteMany({ where: { userId } });
      await tx.diaryEntry.deleteMany({ where: { userId } });
      await tx.shoppingListItem.updateMany({
        where: { addedById: userId },
        data: { addedById: null }
      });
      // Anonymizovat reference na fotky (ne smazat — patří chatě)
      await tx.galleryPhoto.updateMany({
        where: { uploadedById: userId },
        data: { uploadedById: null }
      });
      // Smazat samotného uživatele
      await tx.user.delete({ where: { id: userId } });
    });

    res.json({ message: "Účet byl smazán." });
  } catch (error) {
    logger.error("USERS", "Failed to delete own account", { error: String(error) });
    res.status(500).json({ message: "Nepodařilo se smazat účet." });
  }
});
```

**Frontend:**
- Tlačítko "Smazat můj účet" v `ProfileDrawer.tsx` → Security tab
- `ConfirmDialog` s potvrzením — uživatel musí napsat "SMAZAT"
- Po úspěchu: logout + redirect na landing page

**Soubory:**
- [x] `src/backend/routes/users.ts` — nový endpoint `DELETE /me` (+ potvrzení heslem)
- [x] `frontend-v2/src/components/layout/ProfileDrawer.tsx` — tlačítko + dialog

---

### 1.4 Data export (GDPR Art. 20)

| | Detail |
|---|---|
| **Problém** | Žádný způsob jak uživatel stáhne svá data |
| **Dopad** | Porušení GDPR práva na přenositelnost údajů |
| **Kritičnost** | 🟡 HIGH |

**Backend:**
```typescript
// src/backend/routes/users.ts — nový endpoint
router.get("/me/export", protect, async (req, res) => {
  const userId = req.user!.userId;

  const [user, reservations, notes, diaryEntries, photos] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true, createdAt: true, role: true }
    }),
    prisma.reservation.findMany({ where: { userId } }),
    prisma.note.findMany({ where: { userId } }),
    prisma.diaryEntry.findMany({ where: { userId } }),
    prisma.galleryPhoto.findMany({
      where: { uploadedById: userId },
      select: { id: true, filename: true, createdAt: true }
    }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: user,
    reservations,
    messages: notes,
    diaryEntries,
    photos,
  };

  res.setHeader('Content-Disposition', 'attachment; filename=my-data.json');
  res.json(exportData);
});
```

**Frontend:**
- Tlačítko "Exportovat moje data" v ProfileDrawer → stáhne JSON soubor

**Soubory:**
- [x] `src/backend/routes/users.ts` — endpoint `GET /me/export`
- [x] `frontend-v2/src/components/layout/ProfileDrawer.tsx` — tlačítko

---

### 1.5 Cookie / consent banner

| | Detail |
|---|---|
| **Problém** | Žádný info banner o zpracování dat |
| **Poznámka** | App nepoužívá tracking cookies, ale GDPR vyžaduje informovaný souhlas s localStorage (JWT) |
| **Kritičnost** | 🟡 HIGH |

**Implementace:**
- Nový komponent: `frontend-v2/src/components/shared/CookieConsent.tsx`
- Zobrazí se na landing page pokud nebyl přijat
- "Tento web používá localStorage pro přihlášení. Více info v [Ochrana soukromí](/privacy)."
- Tlačítko "Rozumím" → uloží `cookieConsent=true` v localStorage
- Minimalistický banner ve spodní části stránky

**Soubory:**
- [x] Vytvořit `frontend-v2/src/components/shared/CookieConsent.tsx`
- [x] Přidat do `App.tsx`

---

## FÁZE 2: Core missing features (1-2 týdny)

> Features bez kterých je produkt nepoužitelný pro cizí lidi.

### 2.1 Password reset flow

| | Detail |
|---|---|
| **Problém** | Zapomenuté heslo = ztracený účet. Žádná cesta zpět. |
| **Dopad** | 100% ztráta uživatele |
| **Kritičnost** | 🔴 CRITICAL |

**Prisma schema:**
```prisma
// model User — nová pole
passwordResetToken    String?   @unique @map("password_reset_token")
passwordResetExpiresAt DateTime? @map("password_reset_expires_at")
```

**Backend — 2 nové endpointy:**

```typescript
// src/backend/routes/auth.ts

// 1. Vyžádat reset
router.post("/forgot-password", authLimiter, async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findFirst({ where: { email } });

  // Vždy vrátit 200 (i pro neexistující email — prevence email enumeration)
  if (!user) return res.json({ message: "Pokud email existuje, odeslali jsme odkaz." });

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hodina

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpiresAt: expiresAt }
  });

  await sendPasswordResetEmail(email, token);

  res.json({ message: "Pokud email existuje, odeslali jsme odkaz." });
});

// 2. Provést reset
router.post("/reset-password", authLimiter, async (req, res) => {
  const { token, password } = req.body;

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiresAt: { gt: new Date() }
    }
  });

  if (!user) return res.status(400).json({ message: "Neplatný nebo prošlý odkaz." });

  const hashed = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashed,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    }
  });

  res.json({ message: "Heslo bylo změněno." });
});
```

**Email šablona:**
```typescript
// src/utils/email.ts — nová funkce
async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
  // HTML email s tlačítkem "Obnovit heslo"
}
```

**Frontend — 2 nové stránky:**

1. `frontend-v2/src/features/auth/ForgotPasswordPage.tsx`
   - Vstup: email
   - Po odeslání: "Zkontrolujte svůj email"
   - Link z login stránky: "Zapomněli jste heslo?"

2. `frontend-v2/src/features/auth/ResetPasswordPage.tsx`
   - Route: `/reset-password?token=xxx`
   - Vstup: nové heslo + potvrzení
   - Po úspěchu: redirect na login

3. Route v `App.tsx`:
   ```tsx
   <Route path="/forgot-password" element={<ForgotPasswordPage />} />
   <Route path="/reset-password" element={<ResetPasswordPage />} />
   ```

4. Link na login stránce:
   ```tsx
   // LoginForm.tsx
   <Link to="/forgot-password">Zapomněli jste heslo?</Link>
   ```

**Zod schémata:**
```typescript
// src/validators/schemas.ts
export const forgotPasswordSchema = z.object({
  email: z.string().email("Neplatný email"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Heslo musí mít alespoň 8 znaků"),
});
```

**Soubory k vytvoření/úpravě:**
- [ ] `prisma/schema.prisma` — 2 nová pole + migrace
- [ ] `src/backend/routes/auth.ts` — 2 nové endpointy
- [ ] `src/utils/email.ts` — nová email šablona
- [ ] `src/validators/schemas.ts` — 2 nová schémata
- [ ] `frontend-v2/src/features/auth/ForgotPasswordPage.tsx` — nový
- [ ] `frontend-v2/src/features/auth/ResetPasswordPage.tsx` — nový
- [ ] `frontend-v2/src/App.tsx` — 2 nové routes
- [ ] `frontend-v2/src/features/auth/LoginForm.tsx` — přidat link

---

### 2.2 Email notifikace pro klíčové události

| | Detail |
|---|---|
| **Problém** | Žádné notifikace = uživatelé zapomenou na app |
| **Dopad** | Nízký engagement → churn |
| **Kritičnost** | 🟡 HIGH |

**Minimum pro launch (3 typy):**

1. **Nová rezervace** — email adminovi/vlastníkovi chaty
   - Trigger: `POST /api/reservations`
   - Obsah: "Uživatel X vytvořil rezervaci na DD.MM – DD.MM"

2. **Nová zpráva v chatu** — email ostatním členům (debounce 5 min)
   - Trigger: `POST /api/notes`
   - Obsah: "Nová zpráva od X v kanálu Y"
   - Debounce: neodesílat duplicity pokud přijde víc zpráv za 5 min

3. **Pozvánka přijata** — email adminovi
   - Trigger: `POST /api/invites/accept`
   - Obsah: "Uživatel X přijal pozvánku do chaty Y"

**Notification preferences:**

Prisma model:
```prisma
model NotificationPreference {
  id          String  @id @default(uuid())
  userId      String
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  cabinId     String
  cabin       Cabin   @relation(fields: [cabinId], references: [id], onDelete: Cascade)

  emailNewReservation Boolean @default(true)
  emailNewMessage     Boolean @default(true)
  emailInviteAccepted Boolean @default(true)

  @@unique([userId, cabinId])
  @@map("notification_preferences")
}
```

**Soubory:**
- [ ] `prisma/schema.prisma` — nový model + migrace
- [ ] `src/utils/email.ts` — 3 nové email šablony
- [ ] `src/backend/routes/reservations.ts` — trigger notifikace po vytvoření
- [ ] `src/backend/routes/messages.ts` nebo `notes.ts` — trigger notifikace (s debounce)
- [ ] `src/backend/routes/invites.ts` — trigger notifikace po přijetí
- [ ] `frontend-v2/src/components/layout/ProfileDrawer.tsx` — notification preferences UI

---

### 2.3 PWA manifest fix

| | Detail |
|---|---|
| **Problém** | `name: 'Chata Třebenice'` hardcoded v `vite.config.ts` řádek ~24 |
| **Dopad** | Multi-tenant app nemůže mít jméno jedné chaty |
| **Kritičnost** | 🟡 MEDIUM |

**Řešení:**
```typescript
// frontend-v2/vite.config.ts
manifest: {
  name: 'kdynachatu.cz — Správa chat a chalup',
  short_name: 'kdynachatu',
  theme_color: '#3f7b63', // zelená, ne amber
  // ...
}
```

**Soubory:**
- [ ] `frontend-v2/vite.config.ts` — manifest config

---

### 2.4 Paginace na velkých seznamech

| | Detail |
|---|---|
| **Problém** | Gallery, shopping items, notes — vše se tahá najednou |
| **Dopad** | Při 500+ fotkách / zprávách = pomalé + potenciální crash |
| **Kritičnost** | 🟡 MEDIUM |

**Endpointy k úpravě:**

| Endpoint | Aktuální | Cíl |
|----------|---------|-----|
| `GET /api/gallery/:folderId/photos` | Vše najednou | `?page=1&limit=50` + `total` count |
| `GET /api/shopping/:listId/items` | Vše najednou | `?page=1&limit=100` |
| `GET /api/notes/:threadId` | Vše (cursor partial) | Cursor pagination konzistentně |

**Frontend:** Infinite scroll nebo "Načíst další" tlačítko s TanStack Query `useInfiniteQuery`.

**Soubory:**
- [ ] `src/backend/routes/gallery.ts` — přidat take/skip
- [ ] `src/backend/routes/shoppingList.ts` — přidat take/skip
- [ ] `src/backend/routes/notes.ts` — dokončit cursor pagination
- [ ] Frontend hooks příslušných modulů

---

## FÁZE 3: Closed Beta (2-3 týdny)

> Testování s reálnými uživateli. Sbírat feedback, opravovat bugy.

### 3.1 Sentry integrace

**Backend:**
```bash
npm install @sentry/node
```
```typescript
// src/backend/server.new.ts — na začátek
import * as Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
// + Sentry error handler jako poslední middleware
```

**Frontend:**
```bash
cd frontend-v2 && npm install @sentry/react
```
```typescript
// frontend-v2/src/main.tsx — na začátek
import * as Sentry from "@sentry/react";
Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN });
```

**Cena:** Free tier = 5K errors/měsíc (stačí pro beta)

**Soubory:**
- [ ] `package.json` — `@sentry/node`
- [ ] `frontend-v2/package.json` — `@sentry/react`
- [ ] `src/backend/server.new.ts` — Sentry init
- [ ] `frontend-v2/src/main.tsx` — Sentry init
- [ ] `.env` — `SENTRY_DSN`, `VITE_SENTRY_DSN`

---

### 3.2 Analytics (Plausible)

**Proč Plausible:** GDPR-compliant, bez cookies, jednoduchý, €9/měs.

**Implementace:**
```html
<!-- frontend-v2/index.html -->
<script defer data-domain="kdynachatu.cz" src="https://plausible.io/js/script.js"></script>
```

**Co sledovat:**
- Landing page návštěvy → registrace (konverzní funnel)
- Denní aktivní uživatelé
- Nejpoužívanější stránky
- Bounce rate

**Soubory:**
- [ ] `frontend-v2/index.html` — `<script>` tag

---

### 3.3 Uptime monitoring

**Doporučení:** Better Stack (free tier) nebo UptimeRobot.

**Co monitorovat:**
- `GET https://kdynachatu.cz/api/health` — interval 60s
- Alert: email + (optional) Slack/Discord webhook

**Akce:**
- [ ] Zaregistrovat na Better Stack / UptimeRobot
- [ ] Přidat monitor pro health check endpoint
- [ ] Nastavit alerting

---

### 3.4 Beta test program

**Příprava:**
- [ ] Vytvořit 5-10 invite linků pro beta testery
- [ ] Připravit jednoduchý feedback formulář (Google Forms nebo in-app)
- [ ] Vytvořit Discord server / WhatsApp skupinu pro feedback
- [ ] Připravit "Vítejte v betě" email s instrukcemi

**Průběh (2-3 týdny):**
- Týden 1: Onboarding beta testerů, pozorování prvních kroků
- Týden 2: Aktivní sběr feedbacku, opravy kritických bugů
- Týden 3: Iterace na UX, příprava na další fázi

**Klíčové metriky:**
- Kolik testerů dokončilo registraci + onboarding?
- Kolik vytvořilo alespoň 1 rezervaci?
- Co bylo matoucí? Kde se zasekli?
- Jaké bugy nahlásili?

---

## FÁZE 4: Monetizace & platby (1-2 týdny)

> Implementace Stripe pro subscription billing.

### 4.1 Stripe integrace

**Backend:**
```bash
npm install stripe
```

**Nové endpointy v `src/backend/routes/billing.ts`:**

| Endpoint | Metoda | Popis |
|----------|--------|-------|
| `/api/billing/checkout` | POST | Vytvoří Stripe Checkout Session → redirect na Stripe |
| `/api/billing/portal` | POST | Otevře Stripe Customer Portal (správa předplatného) |
| `/api/billing/webhook` | POST | Stripe webhook handler (raw body) |
| `/api/billing/status` | GET | Vrátí aktuální plán a stav předplatného |

**Stripe webhook events:**
- `checkout.session.completed` → aktivovat plán
- `customer.subscription.updated` → aktualizovat plán
- `customer.subscription.deleted` → deaktivovat plán
- `invoice.payment_failed` → upozornit uživatele

---

### 4.2 Prisma schema pro billing

```prisma
model Subscription {
  id                   String    @id @default(uuid())
  cabinId              String    @unique
  cabin                Cabin     @relation(fields: [cabinId], references: [id], onDelete: Cascade)

  stripeCustomerId     String    @unique @map("stripe_customer_id")
  stripeSubscriptionId String?   @unique @map("stripe_subscription_id")
  stripePriceId        String?   @map("stripe_price_id")

  plan                 String    @default("free") // 'free' | 'standard' | 'premium'
  status               String    @default("active") // 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodEnd     DateTime? @map("current_period_end")

  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  @@map("subscriptions")
}
```

---

### 4.3 Cenové plány (rozhodnutí)

| Funkce | Free | Standard (89 Kč/měs) | Premium (sezónní) |
|--------|:----:|:--------------------:|:-----------------:|
| Členové | max 3 | neomezeně | neomezeně |
| Rezervace | ✅ | ✅ | ✅ |
| Nákupy | ✅ | ✅ | ✅ |
| Chat | ✅ | ✅ | ✅ |
| Galerie | ❌ (max 20 fotek) | ✅ | ✅ |
| Deník | ❌ | ✅ | ✅ |
| Rekonstrukce | ❌ | ✅ | ✅ |
| Inventář | ❌ | ✅ | ✅ |
| Prioritní podpora | ❌ | ❌ | ✅ |
| Custom wallpapers | ❌ | ❌ | ✅ |

---

### 4.4 Tier enforcement

**Backend middleware:**
```typescript
// src/middleware/requirePlan.ts
export function requirePlan(minPlan: 'standard' | 'premium') {
  return async (req, res, next) => {
    const sub = await prisma.subscription.findUnique({
      where: { cabinId: req.user.cabinId }
    });
    const plan = sub?.plan ?? 'free';
    if (planLevel(plan) < planLevel(minPlan)) {
      return res.status(403).json({
        message: "Tato funkce vyžaduje vyšší plán.",
        requiredPlan: minPlan,
        currentPlan: plan,
      });
    }
    next();
  };
}
```

**Frontend:**
- Locked state na navigation items (ikona zámku)
- Banner na dashboard: "Upgradujte pro přístup ke galerii a deníku"
- Upgrade nudge v modálu při pokusu o přístup k locked funkci

**Soubory:**
- [ ] `prisma/schema.prisma` — model Subscription + migrace
- [ ] Vytvořit `src/backend/routes/billing.ts`
- [ ] Vytvořit `src/middleware/requirePlan.ts`
- [ ] `src/backend/server.new.ts` — registrovat billing routes
- [ ] `frontend-v2/src/features/billing/BillingPage.tsx` — nový
- [ ] `.env` — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STANDARD`, `STRIPE_PRICE_PREMIUM`
- [ ] Navigation — locked state pro nepřístupné moduly

---

## FÁZE 5: Polish & monitoring (1 týden)

### 5.1 Přístupnost (a11y) — základy

- [ ] Přidat `<main id="main-content">` landmark do `AppShell.tsx`
- [ ] Skip-to-content link v layout
- [ ] Focus trap v `Modal.tsx` (knihovna `focus-trap-react`)
- [ ] Keyboard navigace v dropdown menu (`TopBar.tsx`)
- [ ] `aria-label` na všech icon-only tlačítkách
- [ ] Color contrast audit (použít Chrome DevTools Lighthouse)

### 5.2 SEO pro landing page

- [ ] OG meta tagy v `index.html`:
  ```html
  <meta property="og:title" content="kdynachatu.cz — Správa rodinných chat" />
  <meta property="og:description" content="Rezervace, nákupy, galerie a deník pro vaši chatu." />
  <meta property="og:image" content="https://kdynachatu.cz/og-image.jpg" />
  ```
- [ ] `robots.txt` v `frontend-v2/public/`
- [ ] `sitemap.xml` v `frontend-v2/public/`
- [ ] JSON-LD structured data pro SaaS produkt

### 5.3 Performance audit

- [ ] Lighthouse audit na všech stránkách (cíl: 90+ Performance)
- [ ] Bundle size review — `index.js` je 510 KB (zvážit manualChunks)
- [ ] Image lazy loading kontrola
- [ ] Service Worker cache strategie review

### 5.4 Finální UX review

- [ ] Projít všechny stránky na 320px šířku (Chrome DevTools toggle)
- [ ] Test celého flow: registrace → onboarding → rezervace → checkout → deník
- [ ] Empty state na každé stránce (smazat testovací data, zkontrolovat)
- [ ] Error state na každé stránce (simulovat 500, offline)
- [ ] Guest role test — co vidí guest vs. admin?

### 5.5 Dokumentace pro uživatele

- [ ] FAQ stránka nebo Help center (může být i jednoduchá `/help` stránka)
- [ ] Onboarding email sekvence:
  1. Welcome email (okamžitě po registraci)
  2. Tips email (den 2 — "Víte že můžete pozvat rodinu?")
  3. Follow-up email (den 7 — "Jak vám to jde?")

---

## FÁZE 6: Public Launch

### Checklist D-Day

- [ ] Všechny blocker issues vyřešeny
- [ ] Beta testy bez kritických bugů min. 1 týden
- [ ] Sentry ukazuje 0 unresolved errors
- [ ] Backup funguje a restore otestován
- [ ] Analytics sbírají data
- [ ] Stripe v live mode (ne test)
- [ ] Privacy Policy a Terms finální
- [ ] OG tags fungují (test přes https://cards-dev.twitter.com/validator)

### Marketing launch

| Kanál | Akce | Priorita |
|-------|------|----------|
| Product Hunt | Launch post | 🟡 |
| Lupa.cz / Root.cz | Článek "Český SaaS pro chataře" | 🟡 |
| Facebook skupiny | Chatařská, chalupářská komunita | 🔴 |
| Instagram | Vizuální screenshoty | 🟡 |
| YouTube/TikTok | Demo video (2 min) | 🟢 |
| Blog | "Proč jsme vytvořili kdynachatu.cz" | 🟢 |
| PR | Lokální média (Novinky, iDNES — sekce Bydlení) | 🟢 |

### Týden po launchi

- [ ] Monitorovat Sentry chyby denně
- [ ] Monitorovat registrace + konverze v Analytics
- [ ] Reagovat na feedback (email, social media)
- [ ] Hotfix sprint pokud je potřeba
- [ ] Týdenní report: registrace, churn, revenue, top bugy

---

## V2+ Backlog — Nepotřeba pro launch

| Feature | Proč ne teď | Priorita V2 |
|---------|------------|:----------:|
| Dark mode | Nice-to-have, ne blocker | 🟡 |
| i18n (angličtina) | Cílový trh CZ/SK, čeština stačí | 🟢 |
| Drag & drop kanban | Klikací přesuny fungují | 🟢 |
| Google Calendar sync | Wow-faktor, ale ne MVP | 🟡 |
| Push notifications | Email notifikace stačí pro start | 🟡 |
| Offline mutations | PWA shell offline stačí | 🟢 |
| PDF export deníku | Marketing materiál, ne core | 🟢 |
| AI asistent | Vzdálená budoucnost | 🟢 |
| Native mobile app | PWA stačí | 🟢 |
| Multi-language | CZ trh first | 🟢 |
| Super admin dashboard | Interní tool, stačí SSH | 🟢 |
| Unit/integration testy | Ideálně by měly být, ale ne launch blocker | 🟡 |
| Socket.io pro všechny CRUD | Polling (TanStack Query refetch) stačí pro start | 🟡 |
| Multi-cabin per user | Schema ready, UI ne — feature pro V2 | 🟡 |

---

## Závislostní graf

```
Fáze 0 (Security)
    │    ← MUSÍ být první, blokuje vše
    ▼
Fáze 1 (GDPR/Legal)
    │    ← Nutné před sběrem dat od cizích lidí
    ▼
Fáze 2 (Core features)
    │    ← Password reset + notifikace + paginace
    ▼
Fáze 3 (Closed Beta) ──────── Fáze 4 (Platby)
    │                              │
    │    ← Může běžet paralelně ──►│
    ▼                              ▼
Fáze 5 (Polish)
    │    ← Finální leštění na základě feedbacku
    ▼
Fáze 6 (Launch) 🚀
```

---

## Rizika

### Technická rizika

| Riziko | Závažnost | Pravděpodobnost | Mitigace |
|--------|:---------:|:---------------:|---------|
| DB ztráta dat (žádné backupy) | 🔴 Critical | Střední | Fáze 0.5 — pg_dump cron |
| testToken leak → bypass verifikace | 🔴 Critical | Vysoká | Fáze 0.1 — podmínit NODE_ENV |
| Absence error monitoringu | 🟡 High | Vysoká | Fáze 3.1 — Sentry |
| Jediný server (no HA) | 🟡 High | Nízká | Akceptovat pro MVP, řešit při růstu |
| Bundle 510 KB | 🟡 Medium | Střední | Fáze 5.3 — manualChunks |

### Produktová rizika

| Riziko | Závažnost | Mitigace |
|--------|:---------:|---------|
| Chybí password reset → ztráta uživatelů | 🔴 Critical | Fáze 2.1 |
| Žádné notifikace → nízký engagement | 🔴 Critical | Fáze 2.2 |
| Cenové plány nefungují → 0 příjem | 🔴 Critical | Fáze 4 |
| Bus factor 1 (single developer) | 🟡 High | Dokumentace, čistý kód |
| Žádná analytika → slepota | 🟡 High | Fáze 3.2 — Plausible |
| Konkurence (Chaloupka.cz, Bookalet) | 🟡 Medium | Diferenciace — česká lokalizace, deník, rekonstrukce |

---

## Shrnutí

| Kategorie | Počet úkolů | Kritičnost |
|-----------|:-----------:|:----------:|
| Security hotfixy | 5 | 🔴 CRITICAL |
| GDPR & Legal | 5 | 🔴 CRITICAL |
| Core features | 4 | 🟡 HIGH |
| Monitoring & Analytics | 3 | 🟡 HIGH |
| Monetizace | 4 | 🟡 HIGH (pro příjmy) |
| Polish & a11y | 5 | 🟢 MEDIUM |
| Marketing | 7 | 🟢 MEDIUM |
| **CELKEM** | **33** | |

**Doporučení:** Nespěchat s public launch. Okamžitě opravit security díry (Fáze 0), pak GDPR (Fáze 1), pak core features (Fáze 2). Spustit closed beta co nejdříve — reálný feedback od uživatelů je cennější než jakýkoli plán.
