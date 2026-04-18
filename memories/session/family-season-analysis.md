# Analýza aplikace kdynachatu.cz — Sezóna 2026

> **Vytvořeno:** 2026-04-17  
> **Zaměření:** Praktický užitek pro rodinu (5-10 lidí, různý věk a tech skills)

---

## 1. Executive Summary

Aplikace je **funkčně na ~88 %** — všech 15 hlavních modulů má funkční backend i frontend v Reactu. Pro rodinu v letošní sezóně chybí především tři věci: **(1) real-time chat** (lidi musí ručně refreshovat aby viděli nové zprávy), **(2) mobilní responzivita** (kalendář a dashboard se na telefonech rozpadá), a **(3) notifikační systém** (nikdo se nedozví, že se něco změnilo, pokud zrovna nekoukne). Z identifikovaných 10 kritických bugů z rodinného testování bylo opraveno 3 (login chybové hlášky, pluralizace, SMTP hardening). Zbývá 7, z toho 4 týkající se mobile layoutu.

---

## 2. Co už funguje dobře (produkčně ready)

| # | Funkce | Proč je to dobrý |
|---|--------|-------------------|
| 1 | **Dashboard s widgety** | Aktuální rezervace, počasí, nákupy, vzkaz na lednici — vše na jednom místě. Skeleton loadery, error boundaries, auto-refresh 5 min |
| 2 | **Rezervační systém** | Kalendář, booking formulář, checkout protokol, měsíční poznámky, dostupnost uživatelů — kompletní flow |
| 3 | **Chat/Nástěnka** | Vlákna, reakce emoji, připnutí zpráv, odpovědi (reply), kontextové akce (přidat do nákupů, vytvořit opravu), cursor-based pagination |
| 4 | **Nákupní seznamy + Spíž** | Master/detail, archivace, sdílení, inventář zásob, split nákladů, propojení s inventářem |
| 5 | **Galerie** | Složky, upload s resize (sharp), lightbox, hromadné mazání, lazy loading |
| 6 | **Autentizace & Onboarding** | JWT, invite links, registrace, email verifikace, onboarding nové chaty, role systém |
| 7 | **Feature flags** | Admin může zapnout/vypnout moduly per chata — `useCabinFeatures()` |
| 8 | **Error handling** | Error boundaries per feature, toast notifikace, offline banner, client error reporting na backend |
| 9 | **Profil uživatele** | ProfileDrawer s avatarem (zvířátka), barvou, změnou hesla, smazáním účtu |
| 10 | **Help systém** | HelpFab na každé stránce s kontextovou nápovědou — dobrý pro netechnické členy |

---

## 3. Kritické bugy — věci co rozbíjí UX

### 3a. Z rodinného testování (PLAN-priprava-pro-rodinu.md) — NEOPRAVENO

| # | Bug | Soubor | Dopad |
|---|-----|--------|-------|
| 1 | **Kalendář na mobilech nefunguje** — layout, scrolling | `ReservationsPage.tsx` + `calendar/CalendarGrid.tsx` | 🔴 Hlavní stránka je na mobilu nepoužitelná |
| 2 | **Špatný scrollbar rezervací na mobilu** | `ReservationsPage.tsx`, `reservations.css` | 🔴 Nelze scrollovat seznam |
| 3 | **Dashboard useknutý na <1366px** — widgety mizí | `DashboardPage.tsx`, `dashboard.css` | 🟡 Malé notebooky (13") |
| 4 | **Tlačítka v shopping modalu** — špatné zarovnání | Shopping modals | 🟡 Vizuální |
| 8 | **Admin delete — bílá na béžovém** — nečitelné | Shopping delete confirmation | 🟡 Vizuální, admin-only |
| 10 | **Dashboard „K dokoupení" počítá archivované** | Backend `dashboard.ts` — shopping query | 🟡 Zavádějící čísla |

### 3b. Nově identifikované

| # | Bug | Soubor | Dopad |
|---|-----|--------|-------|
| 11 | **Chat nemá real-time** — `channels.ts` backend NEEMITUJE WebSocket eventy, na rozdíl od deprecated `notes.ts` | `src/backend/routes/channels.ts` | 🔴 Uživatelé musí ručně refreshovat chat |
| 12 | **PWA workbox nemá runtime caching** — `runtimeCaching: []` v `vite.config.ts:58` | `frontend-v2/vite.config.ts` | 🟡 API data nejsou cachovaná offline |
| 13 | **`handleAssign` jen ukazuje "bude brzy dostupná"** — placeholder v ReservationsPage | `ReservationsPage.tsx:~180` | 🟡 Tlačítko co nic nedělá |

---

## 4. Chybějící klíčové funkce pro rodinu

### 🔴 Kritické — rodina to bude chtít hned

| # | Funkce | Proč to rodina potřebuje | Effort | Jak implementovat |
|---|--------|--------------------------|--------|-------------------|
| 1 | **Real-time chat** | Babička napíše zprávu, syn to nevidí dokud nerefreshne → nikdo to nebude používat | M (4-8h) | Přidat `emitToCabin()` volání do `channels.ts` POST message. Na FE: `useSocket` hook v NotesPage pro `note:created`, `note:deleted`, `note:updated` — invalidovat TanStack Query cache |
| 2 | **Push/in-app notifikace** | "Kdo jede příští víkend?" — bez notifikací se nikdo nedozví, že přibyla nová rezervace nebo zpráva | L (1-3d) | Notification center v TopBar (badge s počtem), backend sledování "co je nové od poslední návštěvy" přes ThreadReadStatus |
| 3 | **Mobilní responzivita kalendáře** | Rodina = mobily. Kalendář je core feature a na mobilu nefunguje | M (4-8h) | Horizontální scroll, zmenšení cell size, responsive breakpoints |
| 4 | **"Kdo je zrovna na chatě" indikátor** | Nejčastější otázka: "Je tam teď někdo?" — dashboard to ukazuje jen pro mou rezervaci | S (1-4h) | Dashboard widget "Aktuálně na chatě" z active reservations |

### 🟡 Důležité — zlepší adopci

| # | Funkce | Proč | Effort |
|---|--------|------|--------|
| 5 | **Fotky přímo z chatu** | Lidi chtějí posílat fotky do chatu, ne přepínat do galerie | M (4-8h) |
| 6 | **Rychlé vytvoření rezervace z dashboardu** | Widget "Příští volný víkend" říká datum, ale nemá tlačítko "Zarezervovat" s předvyplněným datem | S (1-4h) |
| 7 | **Deník — automatické vytvoření z rezervace** | Po skončení pobytu nabídnout "Jak to bylo? Napište do deníku" — propojení diary s reservation | S (1-4h) |
| 8 | **Jednoduchý návod pro nové uživatele** | Po prvním přihlášení provést uživatele app — "Tady jsou rezervace, tady chat..." | M (4-8h) |

---

## 5. Nice-to-have vylepšení

| # | Vylepšení | Effort | Impact | Proč |
|---|-----------|--------|--------|------|
| 1 | **Dark mode** | S (1-4h) | Medium | `next-themes` je v dependencies, toggle v profilu. Večerní používání na chatě |
| 2 | **Drag & Drop v kanbanu** | M (4-8h) | Low | Přesouvání karet mezi sloupci (idea→task→done) |
| 3 | **Export rezervací** | S (1-4h) | Medium | iCal/CSV — synchronizace s osobním kalendářem |
| 4 | **Statistiky pobytu** | S (1-4h) | Low | "Kdo byl na chatě kolikrát letos" — gamifikace |
| 5 | **Počasí na více dní** | XS (<1h) | Low | WeatherCard již zobrazuje 4-day forecast, ale hodinová předpověď na vybraný den by byla užitečná |
| 6 | **Galerie — upload z mobilu (kamera)** | S (1-4h) | Medium | `capture="environment"` na upload input |
| 7 | **Nástěnka — "Důležité kontakty"** | S (1-4h) | Medium | Přidat na dashboard: sousedi, klíče, číslo na správce |

---

## 6. Doporučený akční plán — seřazeno dle priority

### Fáze 1: „Aby to fungovalo na telefonech" (3-4 dny)

| # | Úkol | Effort | Soubory |
|---|------|--------|---------|
| 1 | Mobilní kalendář — horizontální scroll + responsive cells | M | `CalendarGrid.tsx`, `calendar.css` |
| 2 | Scrollbar rezervací na mobilu | S | `reservations.css`, `ReservationsPage.tsx` |
| 3 | Dashboard responsive <1366px | S | `dashboard.css` |
| 4 | Shopping modal alignment | XS | Shopping modals |
| 5 | Admin delete barvy kontrast | XS | `ConfirmDialog` / admin CSS |
| 6 | Dashboard "K dokoupení" — filtr archivovaných | XS | `dashboard.ts` backend |

### Fáze 2: „Aby to žilo — real-time" (2-3 dny)

| # | Úkol | Effort | Soubory |
|---|------|--------|---------|
| 7 | WebSocket emity v `channels.ts` | S | `channels.ts`, `messages.ts` |
| 8 | FE socket listener v NotesPage — live messages | M | `NotesPage.tsx`, `useNotes.ts`, `useSocket.ts` |
| 9 | Unread badge na Chat v navigaci | S | `TopBar.tsx`, `MobileNav.tsx`, thread read status |
| 10 | In-app notification center (základní verze) | M | Nový `NotificationBell.tsx` v TopBar |

### Fáze 3: „Aby to lidi chtěli používat" (2-3 dny)

| # | Úkol | Effort | Soubory |
|---|------|--------|---------|
| 11 | "Kdo je zrovna na chatě" widget | S | `DashboardPage.tsx`, `dashboard.ts` |
| 12 | Quick reserve tlačítko z dashboardu | XS | `ActiveReservation.tsx` — "Příští volný víkend" widget |
| 13 | Rekonstrukce vizuální redesign (glassmorphism, Lucide) | M | `reconstruction.css`, `KanbanColumn.tsx` |
| 14 | Smazání placeholder `handleAssign` nebo implementace | XS | `ReservationsPage.tsx` |
| 15 | PWA runtime caching pro API | S | `vite.config.ts` workbox config |

### Fáze 4: „Polish a bezpečnost" (1-2 dny)

| # | Úkol | Effort | Soubory |
|---|------|--------|---------|
| 16 | JWT_SECRET — silný klíč v produkci | XS | `.env` |
| 17 | POSTGRES_PASSWORD — silné heslo | XS | `.env` |
| 18 | HTTPS/SSL ověření | XS | nginx config |
| 19 | Smazání deprecated `noteThreads.ts` route | XS | `server.new.ts` |
| 20 | Mountnout `superadmin.ts` | XS | `server.new.ts` |

**Celkový odhad: ~10-12 pracovních dní** pro Fáze 1-4.

---

## 7. Technický dluh

| # | Problém | Severity | Detail |
|---|---------|----------|--------|
| 1 | **0 testů** (1 soubor = placeholder) | High | `frontend-v2/src/test/VerifyEmailPage.test.tsx` — vitest je nastaven ale nic netestuje |
| 2 | **CSP disabled** | Medium | `server.new.ts` — `contentSecurityPolicy: false`, XSS ochrana oslabena |
| 3 | **Deprecated `noteThreads.ts` stále mountován** | Low | Duplikuje `channels.ts`, může způsobit zmatek |
| 4 | **`shoppingList.ts` + `shoppingLists.ts`** — 2 route soubory pro 1 modul | Low | Matoucí, zbytečná komplexita |
| 5 | **Frontend Zod validace neúplná** | Low | `api/schemas.ts` pokrývá jen Dashboard, Shopping, Notes — chybí Gallery, Diary, Reconstruction |
| 6 | **superadmin.ts není mountován** | Medium | Backend existuje ale API není dostupné |
| 7 | **reconstruction.css ~900 řádků** s duplikáty | Low | CSS cleanup potřeba |
| 8 | **Legacy `src/frontend/pages/cabin-settings.ts`** stále existuje | Low | Měl by být smazán (React verze existuje) |
| 9 | **Pagination chybí pro chat zprávy** (cursor-based je!) | ✅ Fixed | `useNotes.ts` má `useInfiniteQuery` — toto je vyřešeno |
| 10 | **`window.confirm()` audit** — ověřit že se nepoužívá | Low | Měl by být jen `ConfirmDialog` |

---

## TOP 5 zjištění

1. **🔴 Chat nemá real-time** — WebSocket infrastruktura existuje (server + client hook), ale `channels.ts` NIKDE neemituje eventy. Starý `notes.ts` to dělá. Jeden z nejdůležitějších fixů.

2. **🔴 Mobilní kalendář je rozbitý** — Nejpoužívanější stránka na nejpoužívanějším zařízení nefunguje. Rodina = telefony.

3. **🟡 Žádný notifikační systém** — ThreadReadStatus backend existuje, ale FE ho nepoužívá pro badge/počet nepřečtených. Rodina nebude pravidelně kontrolovat app bez impulsu.

4. **🟢 Architektura je solidní** — TanStack Query, error boundaries, skeleton loadery, Zod validace, JWT auth, role systém, feature flags — základ je profesionální.

5. **🟡 PWA je nakonfigurovaná ale neúplná** — Service worker se registruje, manifest existuje, ale `runtimeCaching: []` znamená že offline nebude fungovat pro API data.
