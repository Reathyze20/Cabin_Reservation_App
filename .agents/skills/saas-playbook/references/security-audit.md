# Security Audit Checklist — kdynachatu.cz

## Jak používat tento checklist

Projdi každou sekci a označ stav:
- ✅ Implementováno a ověřeno
- ⚠️ Částečně implementováno (specifikuj co chybí)
- ❌ Chybí (prioritizuj dle severity)

**Severity:** 🔴 Critical (data breach risk) | 🟡 High (exploitation possible) | 🟢 Medium (best practice)

---

## 1. Authentication & Session Management

### 🔴 Critical
- [ ] Hesla hashovaná pomocí bcrypt (min 10 rounds, ideálně 12)
- [ ] JWT secret je silný (min 64 random znaků, ne "secret123")
- [ ] JWT má expiraci (max 7 dní pro access token)
- [ ] Login endpoint má rate limiting (max 5 pokusů / 15 min na IP)
- [ ] Password reset token má krátkou expiraci (max 1 hodina)
- [ ] Password reset token je single-use (po použití invalidován)
- [ ] Po změně hesla invaliduj všechny existující JWT tokeny uživatele

### 🟡 High
- [ ] Minimální délka hesla (8+ znaků)
- [ ] Register endpoint má rate limiting (max 3 registrace / hodinu na IP)
- [ ] Brute-force ochrana — účet se dočasně zamkne po 10 špatných pokusech
- [ ] Token rotation — refresh token pattern (krátký access + dlouhý refresh)
- [ ] Logout invaliduje token (nebo alespoň blacklist na serveru)

### 🟢 Medium
- [ ] Password strength indicator na frontendu
- [ ] "Odhlásit ze všech zařízení" funkce
- [ ] Login historie (IP, device, čas) — viditelná pro uživatele
- [ ] 2FA (TOTP) pro admin účty

---

## 2. Authorization & Access Control

### 🔴 Critical
- [ ] Každý API endpoint má `protect` middleware (JWT ověření)
- [ ] Ownership check na KAŽDÉM UPDATE/DELETE — `WHERE userId = req.user.userId`
- [ ] Admin-only endpointy mají role check (`req.user.role === 'admin'`)
- [ ] Tenant isolation — uživatel vidí POUZE data své chaty (`cabinId` filter)
- [ ] IDOR prevence — nikdy nevěř `userId` z request body, vždy z JWT
- [ ] File access — uploaded soubory přístupné pouze členům chaty

### 🟡 High
- [ ] Guest role nemůže vytvářet/mazat (pouze čtení)
- [ ] Banned user nemůže přistupovat k API
- [ ] Admin nemůže smazat sám sebe (ochrana proti lockoutu)
- [ ] Cascade delete respektuje ownership (smazání chaty → smazání POUZE jejích dat)

### 🟢 Medium
- [ ] Audit log — kdo změnil co a kdy (alespoň pro destruktivní akce)
- [ ] Principle of least privilege — API vrací pouze potřebná pole (`select`)

---

## 3. Input Validation & Injection Prevention

### 🔴 Critical
- [ ] Zod validace na KAŽDÉM endpointu s user inputem (body, query, params)
- [ ] Žádný `$queryRawUnsafe` s user inputem (Prisma parametrizuje automaticky)
- [ ] Žádný `innerHTML` s user daty bez sanitizace na frontendu
- [ ] File upload: whitelist MIME types (image/jpeg, image/png, image/webp)
- [ ] File upload: max size limit (10MB)
- [ ] File upload: přejmenuj soubory (UUID), nepoužívej originální název

### 🟡 High
- [ ] Max délka stringů v Zod schématech (název: 100, popis: 2000, poznámka: 10000)
- [ ] UUID validace na path parametrech (`:id` musí být validní UUID)
- [ ] Číselné vstupy mají min/max rozsah
- [ ] Email validace (Zod `.email()`)
- [ ] Sanitizace HTML v rich-text polích (DOMPurify)

### 🟢 Medium
- [ ] Content-Type header check na API endpointech
- [ ] Request body size limit (Express `json({ limit: '1mb' })`)
- [ ] URL validace pro externí odkazy

---

## 4. HTTP Security Headers

### 🔴 Critical
- [ ] Helmet middleware aktivní (nastavuje většinu headerů automaticky)
- [ ] `Strict-Transport-Security` (HSTS) — force HTTPS
- [ ] `X-Content-Type-Options: nosniff`
- [ ] `X-Frame-Options: DENY` (nebo `SAMEORIGIN`)
- [ ] `Content-Security-Policy` — alespoň basic CSP

### 🟡 High  
- [ ] CORS omezen na produkční doménu (ne `origin: '*'`)
- [ ] `X-XSS-Protection: 0` (moderní CSP je lepší, starý header může být kontraproduktivní)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`

### 🟢 Medium
- [ ] `Permissions-Policy` — disable zbytečné browser features (camera, microphone, geolocation)
- [ ] `Cross-Origin-Opener-Policy: same-origin`
- [ ] `Cross-Origin-Resource-Policy: same-origin`

---

## 5. Data Protection & Privacy (GDPR)

### 🔴 Critical
- [ ] Hesla NIKDY v API response ani v logu
- [ ] JWT secret NIKDY v clientovi
- [ ] Osobní údaje (email, jméno) NIKDY v URL query parametrech
- [ ] Citlivá data NIKDY v JWT payload (pouze userId, role)
- [ ] Error messages v produkci — generické pro klienta, detailní v logu
- [ ] `.env` v `.gitignore` (nikdy commitovat secrets)

### 🟡 High
- [ ] Právo na smazání — uživatel může smazat svůj účet a všechna data
- [ ] Právo na export — uživatel může stáhnout svá data (JSON/CSV)
- [ ] Cookie consent banner (pokud používáš tracking cookies)
- [ ] Privacy policy stránka s popisem jaká data sbíráš

### 🟢 Medium
- [ ] Data retention policy — automatické mazání neaktivních dat po X měsících
- [ ] Anonymizace v analytics (ne full IP adresy)
- [ ] Encrypted database backup

---

## 6. API Security

### 🔴 Critical
- [ ] Rate limiting na auth endpointy (login, register, password reset)
- [ ] Rate limiting na file upload (max 10 uploadů / minuta)
- [ ] Žádné verbose error messages v produkci (stack trace → generická zpráva)
- [ ] HTTP 404 pro neexistující záznamy (ne 500)
- [ ] HTTP 403 pro cizí záznamy (ne 500 nebo data leak)

### 🟡 High
- [ ] Global rate limiting (100-200 req/min per IP)
- [ ] API versioning (nebo alespoň připraveno na breaking changes)
- [ ] Request logging (IP, endpoint, status, response time)
- [ ] Pagination na list endpointech (ne dump celé tabulky)

### 🟢 Medium
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Deprecation headers pro staré endpointy
- [ ] Request ID tracking (correlationId přes async context)

---

## 7. Infrastructure & Deployment

### 🔴 Critical
- [ ] HTTPS na produkci (Let's Encrypt auto-renew)
- [ ] SSH key auth (ne password) na server
- [ ] Firewall — pouze porty 80, 443, 22 otevřené
- [ ] Database není přístupná z internetu (pouze localhost)
- [ ] PM2 auto-restart při crashnutí
- [ ] `NODE_ENV=production` na serveru

### 🟡 High
- [ ] Automated database backupy (denně, min 7 dní retence)
- [ ] Deploy přes CI/CD (ne manuální SSH a copy-paste)
- [ ] Rollback plán (git revert + PM2 restart)
- [ ] Log rotace (aby logy nezaplnily disk)
- [ ] Uptime monitoring (UptimeRobot, Healthchecks.io)

### 🟢 Medium
- [ ] Staging environment (testovat před produkční deploy)
- [ ] Container-based deploy (Docker) pro reprodukovatelnost
- [ ] Secret rotation policy (JWT secret, DB password — každých 6 měsíců)
- [ ] DDoS ochrana (Cloudflare free tier)

---

## 8. Frontend Security

### 🔴 Critical
- [ ] JWT uložený v localStorage/sessionStorage, NE v cookie bez `HttpOnly`
- [ ] Žádné secrets ve frontend kódu (API klíče, JWT secret)
- [ ] `authFetch` automaticky přidává JWT header (ne manuálně)
- [ ] Nepřihlášený uživatel redirectován na login (route guards)
- [ ] Expired token → automatický logout (401 interceptor)

### 🟡 High
- [ ] Formuláře s disable button po submit (anti-double-click)
- [ ] Potvrzovací dialog před destruktivními akcemi (delete)
- [ ] `rel="noopener noreferrer"` na externích odkazech
- [ ] Žádné citlivé informace v `console.log` v produkci

### 🟢 Medium
- [ ] Subresource Integrity (SRI) pro CDN assets
- [ ] Automated dependency audit (`npm audit`)
- [ ] Source maps disabled v produkci (nebo uploadované do Sentry, ne veřejné)

---

## Rychlý Security Scan (5 minut)

Pokud nemáš čas na celý audit, zkontroluj alespoň:

1. **grep "innerHTML"** ve frontend kódu — je tam user input?
2. **grep "$queryRawUnsafe"** v backend kódu — existuje vůbec?
3. **grep "console.log"** v backend kódu — mělo by být `logger.*`
4. **Zkontroluj `.env`** není v gitu: `git log --all -- .env`
5. **Rate limiting** na `/api/auth/*` endpointech
6. **CORS origin** — není `*` v produkci?
7. **protect middleware** — je na KAŽDÉM chráněném route?
8. **ownership check** — je na KAŽDÉM UPDATE/DELETE?
