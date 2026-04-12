# PRD: Vytváření chaty & správa členů rodiny

> **Executive summary:** Správa členů je **jádro celého produktu** — pokud rodina nedokáže za 2 minuty vytvořit chatu a přizvat babičku s dědou, produkt selže. Aktuální flow funguje, ale má zásadní UX mezery: registrace vyžaduje příliš mnoho kroků, pozvánky nejsou intuitivní pro netechnické uživatele, a chybí klíčové funkce jako přidání existujícího uživatele nebo správa členů přímo z přehledného rozhraní. Tento PRD specifikuje kompletní redesign onboardingu a member managementu zaměřený na **rodinnou jednoduchost**.

---

## 📋 Overview

- **Problem Statement:** Rodiny sdílející chatu potřebují co nejjednodušší způsob, jak vytvořit společný prostor a přizvat všechny členy — od tech-savvy mileniálů po babičku s iPadem. Současný flow vyžaduje 6+ kroků k registraci a invite systém je schovaný v admin panelu.
- **Target Persona:** Správce chaty (primární), Rodinný člen (sekundární), Příležitostný host (terciární)
- **Business Value:** **Aktivace + Retence** — čím víc členů se připojí, tím víc je produkt „sticky". Každý přidaný člen snižuje churn o ~15% (industry benchmark pro collaborative tools).
- **Priority:** **P0 (critical)** — bez fungující správy členů nemá SaaS produkt smysl

---

## 🎯 Success Metrics

| Metrika | Cíl | Měření |
|---------|-----|--------|
| **Time to first invite** | < 3 minuty od registrace | Tracking: čas od POST /register do POST /invites |
| **Invite conversion rate** | > 60% pozvánek přijato | `usedCount / created invites` |
| **Průměrný počet členů na chatu** | ≥ 4 do 14 dnů | Průměr `users.count WHERE cabinId = X` |
| **Drop-off rate při registraci** | < 20% | Funnel: landing → form → submit → verified |
| **NPS pro onboarding** | > 40 | User survey po 7 dnech |

---

## 👤 Persony

### 👨‍👩‍👧‍👦 Persona 1: „Správce chaty" (Tomáš, 38)
- **Kdo:** Tech-savvy otec, organizátor rodinných pobytů
- **Cíl:** Založit chatu, přizvat rodinu, mít přehled kdo tam jede
- **Frustrace:** „Posílat zvací odkazy na WhatsApp je otravné, polovina rodiny je neotevře"
- **Klíčové potřeby:** Jednoduché pozvánky, přehled členů, možnost nastavit role
- **Ochota platit:** Ano, Pro tier za víc chat

### 👵 Persona 2: „Babička" (Marie, 67)
- **Kdo:** Netechnická, používá tablet, volá místo psaní
- **Cíl:** Vidět kdy tam kdo jede, podívat se na fotky
- **Frustrace:** „Nevím co je ten odkaz co mi Tomáš poslal" / „Zapomněla jsem heslo"
- **Klíčové potřeby:** Minimum kroků, velká tlačítka, žádná verifikace emailem
- **Ochota platit:** Ne (ale zvyšuje retenci celé rodiny)

### 🧑 Persona 3: „Příležitostný host" (Kamarád Petr, 30)
- **Kdo:** Není člen rodiny, jezdí 1-2× ročně
- **Cíl:** Podívat se na termíny, případně se zapsat
- **Frustrace:** „Nechci si kvůli jednomu víkendu zakládat účet"
- **Klíčové potřeby:** Minimální registrace, guest role, možná jen read-only
- **Ochota platit:** Ne

---

## 🔍 Analýza současného stavu

### Co funguje ✅

| Funkce | Stav | Soubory |
|--------|------|---------|
| Registrace + vytvoření chaty | ✅ Funguje | [RegisterForm.tsx](../frontend-v2/src/features/auth/RegisterForm.tsx), [auth.ts](../src/backend/routes/auth.ts) |
| Onboarding (user bez chaty) | ✅ Funguje | [OnboardingPage.tsx](../frontend-v2/src/features/onboarding/OnboardingPage.tsx), [cabin.ts](../src/backend/routes/cabin.ts) |
| Invite link systém | ✅ Funguje | [InvitePage.tsx](../frontend-v2/src/features/invite/InvitePage.tsx), [invites.ts](../src/backend/routes/invites.ts) |
| Správa uživatelů (admin) | ✅ Funguje | [AdminPage.tsx](../frontend-v2/src/features/admin/AdminPage.tsx), [users.ts](../src/backend/routes/users.ts) |
| Role assignment přes invite | ✅ Funguje | Backend nastavuje roli z invite.role |
| Smazání uživatele s kaskádou | ✅ Funguje | DELETE /api/users/:id |

### Co chybí nebo nefunguje optimálně ❌

| Problém | Dopad | Priorita |
|---------|-------|----------|
| **Registrace = 6 polí** (název chaty, lokalita, jméno, email, heslo, barva) | Vysoký drop-off u netechnických uživatelů | P0 |
| **Invite management schovaný v Admin panelu** | Správce neví kde je, musí hledat | P0 |
| **Pozvánka = jen URL link** | Babička neví co s URL na WhatsAppu, neotvře ho | P0 |
| **Nelze pozvat existujícího uživatele** | Pokud má kamarád účet na jiné chatě, musí si založit nový | P1 |
| **Role je globální (User.role)**, ne per-cabin | Blokuje multi-cabin SaaS | P1 |
| **Žádný přehled členů na dashboardu** | Správce nevidí členy bez jití do Admin panelu | P1 |
| **Chybí „rodinný přehled"** — kdo je aktuálně na chatě | Nejčastější otázka v rodině: „kdo tam teď je?" | P2 |
| **Žádný re-invite / reminder** pro nepřijaté pozvánky | Pozvánka expiruje, nikdo se nepřipojí | P1 |
| **Chybí cabin transfer** (předání chaty jinému adminovi) | Riziko: admin smaže účet → chata osiří | P2 |
| **Žádný self-service odchod z chaty** | Člen nemůže sám odejít, musí prosit admina | P2 |

---

## 🖼️ Navrhované UX Flow — Kompletní redesign

### Flow A: Vytvoření chaty (registrace správce)

**Cíl:** Od příchodu na web po fungující chatu za **< 90 sekund**.

```
┌─────────────────────────────────────────────────┐
│  KROK 1: Pojmenujte svou chatu                  │
│                                                  │
│  Název chaty: [Chata U Lesa          ]          │
│  Lokalita:    [Třebenice             ] 🔍       │
│                                                  │
│  (auto-suggest z geocoding API)                  │
│                                                  │
│              [Pokračovat →]                       │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  KROK 2: Vytvořte si účet                       │
│                                                  │
│  Přezdívka:  [Tomáš                  ]          │
│  E-mail:     [tomas@email.cz         ]          │
│  Heslo:      [••••••••               ] 👁       │
│                                                  │
│  🎨 Vyberte barvu:  ● ● ● ● ● ● ● ● ●         │
│  🐾 Vyberte avatar: 🦊 🐻 🦌 🐿️ 🐺 🦉        │
│                                                  │
│              [Vytvořit chatu 🏡]                  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│  KROK 3: Pozvěte rodinu! 🎉                     │
│                                                  │
│  Vaše chata "Chata U Lesa" je připravena!       │
│                                                  │
│  Pozvěte členy rodiny:                          │
│                                                  │
│  📋 [Zkopírovat zvací odkaz]                    │
│  📱 [Sdílet přes WhatsApp]                      │
│  ✉️  [Poslat e-mailem]  → pole pro zadání mailu │
│                                                  │
│  Role pro pozvané: (●) Člen  (○) Host           │
│                                                  │
│  ─── nebo ───                                    │
│  [Přeskočit → Jít na dashboard]                  │
└─────────────────────────────────────────────────┘
```

**Klíčové principy:**
1. **Wizard (krokovač)** — ne jeden formulář se 6 poli, ale 2-3 krátké kroky
2. **Krok 3 je volitelný** ale prominentní — nudge k pozvání hned po registraci
3. **WhatsApp share** — primární kanál pro české rodiny (deep link `https://wa.me/?text=...`)
4. **E-mail invite** — backend pošle hezký HTML e-mail s tlačítkem „Připojit se"
5. **Žádná email verifikace pro prvního uživatele** — už funguje, zachovat

---

### Flow B: Přijetí pozvánky (člen rodiny se připojuje)

**Cíl:** Od obdržení odkazu po přihlášení za **< 60 sekund**.

#### Scénář B1: Nový uživatel (nemá účet)

```
┌─────────────────────────────────────────────────┐
│  ✉️  Pozvánka na chatu                          │
│                                                  │
│  Tomáš vás zve na chatu "Chata U Lesa"          │
│  🏡 Vítejte! Klikněte a připojte se k rodině.   │
│                                                  │
│  Přezdívka:  [                       ]          │
│  Heslo:      [                       ] 👁       │
│                                                  │
│  🎨 Barva:   ● ● ● ● ● ●                      │
│  🐾 Avatar:  🦊 🐻 🦌 🐿️ 🦉                   │
│                                                  │
│              [Připojit se 🎉]                    │
│                                                  │
│  Už máte účet? [Přihlásit se a připojit]         │
└─────────────────────────────────────────────────┘
```

**Změny oproti dnešku:**
- **E-mail NEPOVINNÝ** — pro babičku je email bariéra. Stačí přezdívka + heslo.
- **Odkaz „Už máte účet?"** — pro uživatele, kteří mají účet na jiné chatě (Flow B2)
- **Welcome message** z nastavení chaty se zobrazí nad formulářem
- **Žádná email verifikace** — přes invite link je identita ověřena dostatečně

#### Scénář B2: Existující uživatel (má účet na jiné chatě)

> ⚠️ **Vyžaduje architekturální změnu:** přechod z `User.cabinId` na `CabinMember` join tabulku.  
> Pro MVP single-tenant toto NENÍ potřeba. Řešit až v Phase 2 (multi-tenant).

```
┌─────────────────────────────────────────────────┐
│  ✉️  Pozvánka na chatu                          │
│                                                  │
│  Tomáš vás zve na chatu "Chata U Lesa"          │
│                                                  │
│  Přihlaste se ke svému účtu:                    │
│                                                  │
│  Přezdívka:  [                       ]          │
│  Heslo:      [                       ] 👁       │
│                                                  │
│              [Přihlásit se a připojit]            │
│                                                  │
│  Nemáte účet? [Zaregistrovat se]                 │
└─────────────────────────────────────────────────┘
```

---

### Flow C: Správa členů (admin view)

**Cíl:** Přehledná stránka pro správu členů **jako samostatná sekce**, ne schovaná v admin panelu.

#### C1: Nová stránka „Členové" (nebo widget na dashboardu)

```
┌─────────────────────────────────────────────────┐
│  👥 Členové chaty                    [+ Pozvat] │
│                                                  │
│  ┌─────────────────────────────────────────────┐│
│  │ 🦊 Tomáš        Admin    ● Online   [···]  ││
│  │ 🐻 Marie        Člen     ○ Offline  [···]  ││
│  │ 🦌 Petr         Host     ○ Offline  [···]  ││
│  │ 🐿️ Jana         Člen     ● Online   [···]  ││
│  └─────────────────────────────────────────────┘│
│                                                  │
│  📨 Čekající pozvánky                            │
│  ┌─────────────────────────────────────────────┐│
│  │ Pozvánka (Člen) — vytvořena 2.4.  exp 9.4. ││
│  │   Odkaz: kdynachatu.cz/invite/abc123        ││
│  │   Použito: 1/3     [📋 Kopírovat] [× Zrušit]│
│  └─────────────────────────────────────────────┘│
│                                                  │
│  Celkem: 4 členů, 1 čekající pozvánka           │
└─────────────────────────────────────────────────┘
```

#### C2: Detail člena / akce (kontextové menu `[···]`)

```
Pro admina:
  ├── 📝 Změnit roli → (Admin / Člen / Host)
  ├── 🔑 Resetovat heslo
  ├── 📊 Zobrazit aktivitu (počet rezervací, fotek, poznámek)
  └── 🗑️ Odebrat z chaty (s potvrzením + info co se smaže)

Pro člena (sám o sobě):
  ├── 📝 Upravit profil (přezdívka, barva, avatar)
  └── 🚪 Odejít z chaty (s potvrzením)
```

#### C3: Dialog pozvání nového člena

```
┌─────────────────────────────────────────────────┐
│  ➕ Pozvat nového člena                          │
│                                                  │
│  Jak chcete pozvat?                              │
│                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐         │
│  │  📋     │  │  📱     │  │  ✉️     │         │
│  │ Odkaz   │  │WhatsApp │  │ E-mail  │         │
│  └─────────┘  └─────────┘  └─────────┘         │
│                                                  │
│  Role:  (●) Člen  (○) Host  (○) Admin           │
│                                                  │
│  ⚙️ Pokročilé:                                   │
│  Platnost: [7 dnů ▼]                             │
│  Max. použití: [Bez limitu ▼]                    │
│                                                  │
│  [Vytvořit pozvánku]                             │
└─────────────────────────────────────────────────┘
```

**Po kliknutí na „Odkaz":**
- Vygeneruje invite link
- Zobrazí s tlačítkem kopírovat
- Možnost zobrazit QR kód (pro osobní setkání)

**Po kliknutí na „WhatsApp":**
- Otevře `https://wa.me/?text=Ahoj! Zvu tě na naši chatu „Chata U Lesa". Klikni a připoj se: https://kdynachatu.cz/invite/abc123`

**Po kliknutí na „E-mail":**
- Zobrazí pole pro e-mailovou adresu
- Backend pošle stylizovaný HTML e-mail s tlačítkem „Připojit se"

---

### Flow D: Odebrání člena

```
┌─────────────────────────────────────────────────┐
│  ⚠️ Odebrat člena z chaty?                      │
│                                                  │
│  Opravdu chcete odebrat 🐻 Marii z chaty        │
│  „Chata U Lesa"?                                │
│                                                  │
│  Co se stane:                                    │
│  • Marie se nebude moct přihlásit do chaty      │
│  • Její rezervace budou ZACHOVÁNY (s označením) │
│  • Její poznámky a příspěvky zůstanou           │
│  • Fotky, které nahrála, zůstanou v galerii     │
│                                                  │
│  ☐ Smazat i všechna data uživatele              │
│                                                  │
│  [Zrušit]              [Odebrat člena]           │
└─────────────────────────────────────────────────┘
```

**Klíčové rozhodnutí:**  
❓ **Při odebrání člena — mazat jeho data nebo zachovat?**
- **Doporučení:** Výchozí = zachovat data (soft remove: `User.cabinId = null`). Checkbox pro tvrdé smazání dat.
- **Důvod:** Babička už nejezdí, ale její fotky z léta 2024 chceme v galerii nechat.

---

### Flow E: Samoobslužný odchod člena

```
Nastavení profilu → [🚪 Odejít z chaty]

┌─────────────────────────────────────────────────┐
│  🚪 Odejít z chaty?                              │
│                                                  │
│  Chystáte se opustit chatu „Chata U Lesa".      │
│                                                  │
│  • Přijdete o přístup ke všem datům chaty       │
│  • Vaše příspěvky (fotky, poznámky) zůstanou    │
│  • Pro opětovné připojení budete potřebovat     │
│    novou pozvánku od admina                      │
│                                                  │
│  [Zrušit]              [Odejít z chaty]          │
└─────────────────────────────────────────────────┘
```

> ⚠️ **Admin nemůže odejít**, pokud je **jediný admin** — musí nejdřív povýšit jiného člena.

---

## 📐 Scope Definition

### ✅ In Scope — MVP (Phase 1: single-tenant)

| # | Deliverable | Backend | Frontend | Effort |
|---|-------------|---------|----------|--------|
| 1 | **Wizard registrace** (2-3 kroky místo jednoho formuláře) | Beze změny API | Refactor RegisterForm | M |
| 2 | **Post-registration invite prompt** (krok 3 wizardu) | Beze změny | Nový OnboardingInviteStep | S |
| 3 | **WhatsApp a clipboard share pro pozvánky** | Beze změny | Share API / deep links | S |
| 4 | **E-mail nepovinný při invite accept** | Drobná úprava validace | Úprava InvitePage | S |
| 5 | **Stránka „Členové"** (nová route /members) | GET /api/users rozšířit o statistiky | Nová MembersPage | L |
| 6 | **Invite dialog s volbou kanálu** (link/WhatsApp/email) | E-mail invite endpoint | InviteDialog komponenta | M |
| 7 | **Odebrání člena ze chaty** (soft remove) | PATCH /api/users/:id/remove-from-cabin | Confirmation dialog | M |
| 8 | **Samoobslužný odchod** (/leave) | POST /api/cabin/leave | Tlačítko v profilu | S |
| 9 | **QR kód pro pozvánku** | Beze změny | qrcode.js knihovna | S |
| 10 | **Re-invite / reminder** notifikace | POST /api/invites/:id/remind | Tlačítko u čekající pozvánky | S |

**Celkový effort MVP: ~L-XL** (3-5 dev-days)

### 🔮 Out of Scope — Phase 2 (multi-tenant)

| # | Deliverable | Proč čekat |
|---|-------------|------------|
| 1 | **CabinMember join tabulka** (per-cabin roles) | Architekturální změna, vyžaduje migraci dat |
| 2 | **Přidání existujícího uživatele do jiné chaty** | Závisí na CabinMember |
| 3 | **Cabin switching UI** | Závisí na multi-cabin membership |
| 4 | **Cabin transfer** (předání vlastnictví) | Nízká urgence, řeší se manuálně |
| 5 | **Bulk invite** (CSV import, hromadný e-mail) | Nice-to-have pro velké rodiny/skupiny |
| 6 | **Audit log** (kdo koho přidal/odebral kdy) | Compliance, důležité pro growth |
| 7 | **Passwordless login** (magic link) | Zjednodušení pro babičku personu |

---

## 👤 User Stories — MVP

### US-1: Registrační wizard
> **Jako** nový uživatel  
> **chci** projít jednoduchým krokovaným formulářem  
> **abych** vytvořil chatu bez pocitu zahlcení.

**Acceptance Criteria:**
- [ ] Formulář má 2-3 kroky (ne jeden dlouhý)
- [ ] Krok 1: Název chaty + lokalita (2 pole)
- [ ] Krok 2: Přezdívka + email + heslo + barva + avatar (5-6 polí)
- [ ] Krok 3 (volitelný): Pozvat rodinu (kopírovat link / WhatsApp / email)
- [ ] Progress indikátor (tečky nebo čísla kroků)
- [ ] Back button mezi kroky (zachovává hodnoty)
- [ ] Validace per-krok (ne na konci)
- [ ] Celý wizard mobile-friendly (320px+)

### US-2: Snadné pozvání přes WhatsApp
> **Jako** správce chaty  
> **chci** poslat pozvánku jedním klikem přes WhatsApp  
> **abych** nemusel kopírovat a vkládat odkazy ručně.

**Acceptance Criteria:**
- [ ] Tlačítko „Sdílet přes WhatsApp" na stránce členů a po registraci
- [ ] Otevře WhatsApp s předvyplněnou zprávou obsahující název chaty a invite link
- [ ] Na desktopu otevře WhatsApp Web, na mobilu nativní app
- [ ] Zpráva je přátelská a česky: „Ahoj! Zvu tě na naši chatu ‚{název}'. Klikni a připoj se: {link}"
- [ ] Funguje i Web Share API na mobilech (fallback)

### US-3: Stránka členové
> **Jako** správce chaty  
> **chci** vidět přehled všech členů na jedné stránce  
> **abych** mohl spravovat rodinu bez hledání v nastavení.

**Acceptance Criteria:**
- [ ] Nová route `/members` přístupná z navigace
- [ ] Seznam členů s avatarem, přezdívkou, rolí, datem připojení
- [ ] Tlačítko „+ Pozvat" prominentně nahoře
- [ ] Menu u každého člena: změnit roli, resetovat heslo, odebrat
- [ ] Sekce „Čekající pozvánky" s možností zkopírovat link / zrušit
- [ ] Admin vidí akční tlačítka, user/guest vidí jen seznam
- [ ] Prázdný stav: „Zatím jste tu sami. Pozvěte rodinu! [+ Pozvat]"

### US-4: Invite dialog s volbou kanálu
> **Jako** správce chaty  
> **chci** mít na výběr jak pozvánku doručit  
> **abych** mohl zvolit nejlepší kanál pro daného člena rodiny.

**Acceptance Criteria:**
- [ ] Modální dialog se 3 volbami: Odkaz, WhatsApp, E-mail
- [ ] Volba role (Člen / Host), výchozí = Člen
- [ ] Pokročilé nastavení (platnost, max. použití) — sbalené, výchozí 7 dnů / neomezeno
- [ ] Po vytvoření invite zobrazit success s konkrétní akcí (zkopírováno / odesláno)
- [ ] E-mail varianta: pole pro email adresu → backend pošle stylizovaný HTML email

### US-5: Zjednodušení přijetí pozvánky
> **Jako** pozvaný člen rodiny  
> **chci** se připojit za minimum kroků  
> **abych** nemusel vyplňovat zbytečné údaje.

**Acceptance Criteria:**
- [ ] E-mail pole NEPOVINNÉ (jen přezdívka + heslo + barva + avatar)
- [ ] Welcome message ze settings chaty zobrazený nad formulářem
- [ ] Visual indikátor kdo zve (avatar + jméno zvoucího)
- [ ] Odkaz „Už máte účet? Přihlaste se" (pro budoucí multi-cabin)
- [ ] Po přijetí okamžitý redirect na dashboard (žádná extra verifikace)

### US-6: Soft odebrání člena
> **Jako** správce chaty  
> **chci** odebrat člena tak, aby jeho data v chatě zůstala  
> **protože** chci zachovat historii rezervací a fotky i po odchodu člena.

**Acceptance Criteria:**
- [ ] Admin může odebrat přes menu u jména člena
- [ ] Potvrzovací dialog s informací co se stane (data zůstanou/smažou)
- [ ] Výchozí = soft remove (cabinId = null), checkbox „smazat i data"
- [ ] Admin nemůže odebrat sám sebe
- [ ] Jediný admin nemůže být odebrán (musí nejdřív delegovat)
- [ ] Odebraný uživatel vidí stránku „Nemáte přístup k žádné chatě"

### US-7: Samoobslužný odchod
> **Jako** člen chaty  
> **chci** mít možnost sám odejít  
> **abych** nemusel obtěžovat admina.

**Acceptance Criteria:**
- [ ] Tlačítko „Odejít z chaty" v nastavení profilu
- [ ] Potvrzovací dialog s popisem co se stane
- [ ] Admin nemůže odejít, pokud je jediný admin
- [ ] Po odejití redirect na onboarding stránku (vytvoř si chatu / čekej na pozvánku)

### US-8: QR kód pozvánky
> **Jako** správce chaty  
> **chci** zobrazit QR kód s pozvánkou  
> **abych** mohl pozvat člena osobně (ukázat na telefonu).

**Acceptance Criteria:**
- [ ] Tlačítko „Zobrazit QR" u invite linku
- [ ] QR kód v modálu, dostatečně velký pro skenování
- [ ] Možnost stáhnout QR jako obrázek (PNG)
- [ ] Pod QR kódem text s názvem chaty

---

## ⚠️ Risks & Open Questions

### Rizika

| Riziko | Pravděpodobnost | Dopad | Mitigace |
|--------|-----------------|-------|----------|
| Drop-off babičky persony i přes zjednodušení | Střední | Vysoký | Passwordless login v Phase 2, testovat s reálnými uživateli |
| WhatsApp deep link nefunguje na všech zařízeních | Nízká | Střední | Fallback na clipboard + Web Share API |
| Invite link sdílen veřejně (bezpečnostní riziko) | Nízká | Vysoký | Výchozí max 3 použití + 7 dnů platnost |
| Soft remove zanechá osiřelá data | Střední | Nízký | Periodický cleanup job / admin nástroj |

### Otevřené otázky (vyžadují rozhodnutí)

1. **❓ Má se stránka „Členové" stát součástí hlavní navigace, nebo zůstat v admin panelu?**
   - **Doporučení:** Hlavní navigace — viditelná pro všechny. Admin akce (editace, mazání) vidí jen admin.
   - Důvod: Přehled členů je informace pro celou rodinu, ne jen admina.

2. **❓ Má admin moci vytvořit účet za jiného člena (vyplnit i heslo)?**
   - **Doporučení:** ANO (zachovat stávající POST /api/users) — pro případ, že admin zakládá účet babičce osobně.
   - UI: Tlačítko „Vytvořit ručně" jako alternativa k pozvánce.

3. **❓ Co se stane s uživatelem po soft remove? Může se znovu připojit přes novou pozvánku?**
   - **Doporučení:** ANO — invite accept endpoint by měl detekovat existující uživatele se stejným username a znovu přiřadit cabinId.

4. **❓ Chceme limity na počet členů v Free tier?**
   - **Doporučení:** Free tier = max 8 členů (typická rodina). Pro tier = neomezeno.
   - Důvod: 8 pokrývá i rozšířenou rodinu, limit motivuje upgrade u větších skupin (spolky, sdružení).

5. **❓ Notifikace admina při přijetí pozvánky?**
   - **Doporučení:** ANO — toast/notifikace admina „Marie se právě připojila k chatě!".
   - Implementace: WebSocket push nebo polling dashboard widgetu.

---

## 📊 Effort Estimate

| Oblast | Scope | Effort |
|--------|-------|--------|
| **Backend** | Soft remove endpoint, email invite, leave endpoint, rozšíření GET /users | **M** |
| **Frontend — Registrační wizard** | Refactor RegisterForm na multi-step | **M** |
| **Frontend — Stránka Členové** | Nová page + InviteDialog + member cards | **L** |
| **Frontend — InvitePage úpravy** | Nepovinný email, login link | **S** |
| **Frontend — Share (WhatsApp, QR)** | Share API, QR generátor, deep links | **S** |
| **Celkem** | | **L-XL** |

---

## 🔄 Propojení s existujícím kódem

### Co se NEZMĚNÍ (zachovat):
- Backend invite CRUD endpointy — fungují dobře
- Prisma schema (v Phase 1) — jen přidáme endpoint, ne nový model
- AdminPage — zůstane pro systémové záležitosti (logy, statistiky)
- AuthContext — rozšíříme, nerozbijeme

### Co se ZMĚNÍ:
- `RegisterForm.tsx` → refactor na `RegisterWizard.tsx` (multi-step)
- `OnboardingPage.tsx` → přidat krok 3 (invite prompt)
- `InvitePage.tsx` → nepovinný email, link na login
- `AdminPage.tsx` → přesunout správu členů/pozvánek do nové MembersPage
- `router.tsx` → přidat route `/members`
- Navigace → přidat odkaz „Členové"

### Nové soubory:
- `frontend-v2/src/features/members/MembersPage.tsx`
- `frontend-v2/src/features/members/InviteDialog.tsx`
- `frontend-v2/src/features/members/MemberCard.tsx`
- `frontend-v2/src/features/members/hooks/useMembers.ts`
- `frontend-v2/src/features/auth/RegisterWizard.tsx`
- `src/backend/routes/members.ts` (nebo rozšíření users.ts)

---

## Doporučené další kroky

1. **Rozhodnout otevřené otázky** (5 bodů výše) — zejména #1 (navigace) a #4 (limity free tier)
2. **Implementovat wizard registraci** (US-1) — největší UX impact, relativně nízký effort
3. **Implementovat stránku Členové** (US-3 + US-4) — přesunout member management z admin panelu
4. **Přidat WhatsApp share** (US-2) — quick win, dramaticky zlepší invite conversion
5. **Zjednodušit InvitePage** (US-5) — nepovinný email, méně polí
6. **Implementovat soft remove + leave** (US-6, US-7) — bezpečnostní a UX základ
7. **QR kódy** (US-8) — nice-to-have, řešit jako poslední
8. **Sledovat metriky** po nasazení — invite conversion rate, time to first invite, avg members per cabin
