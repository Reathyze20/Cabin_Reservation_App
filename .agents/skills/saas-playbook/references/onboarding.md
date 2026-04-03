# Onboarding Playbook — kdynachatu.cz

## Proč je onboarding kritický

**73% uživatelů** se rozhodne zda appku budou používat **během prvních 5 minut**. Pro SaaS s freemium modelem je onboarding = konverze. Špatný onboarding = uživatel odejde a už se nevrátí.

### Aktivační metrika (North Star)
Uživatel je "aktivovaný" když:
1. ✅ Vytvořil chatu
2. ✅ Pozval alespoň 1 člena  
3. ✅ Vytvořil první rezervaci

**Cíl:** 60%+ registrovaných uživatelů dokončí všechny 3 kroky do 24 hodin.

---

## Onboarding Flow

### Step 0: Landing Page → Registrace (30 sekund)

**Cíl:** Uživatel chápe co appka dělá a registruje se.

- Hero: "Konec chaosu na rodinné chatě. Rezervace, nákupy, správa — vše na jednom místě."
- CTA: "Vytvořit chatu zdarma" (ne "Registrovat" — to zní jako práce)
- Social proof: "Už 150 rodin organizuje svou chatu s námi"
- Registrační formulář: **jen email + heslo** (jméno doplní později)
- Alternativa: "Přihlásit přes Google" (snížení friction)

### Step 1: Vytvoření chaty (60 sekund)

**Hned po registraci**, ne na dashboard. Uživatel musí vytvořit svůj "domov" v appce.

**Formulář:**
1. Název chaty ("Chata U Třešní", "Chalupa Krkonoše")
2. Lokace (volitelná, pro počasí)
3. Popis (volitelný, max 200 znaků)
4. Tapeta — výběr z 5 předdefinovaných fotek přírody (les, hory, jezero, louka, zimní krajina)

**UX pravidla:**
- Formulář rozděl na **mini-kroky** (wizard), ne jeden velký formulář
- Každý krok na celou stránku s velkým vizuálem
- Progress bar nahoře (Step 1/3)
- "Přeskočit" link na volitelných krocích (ale menší, šedý)
- Po dokončení: **konfetový efekt** nebo subtilní animace úspěchu

### Step 2: Pozvání členů (90 sekund)

**Ihned po vytvoření chaty.** Tohle je klíčový virální moment.

**Způsoby pozvání:**
1. **Sdílet link** (primární) — kopírovat odkaz do WhatsApp/SMS/email
2. **Email pozvánka** — zadat emaily, appka pošle
3. **QR kód** — pro osobní sdílení (na chatě, na rodinné oslavě)

**UX pravidla:**
- Ukaž vizualizaci: "Přidejte rodinu" s ikonkami avatarů
- Předvyplň "Zkopírovat pozvánku" button (největší, primární barva)
- Text pozvánky musí být lidský: "Ahoj! Přidej se k naší chatě [Název] na kdynachatu.cz — budeme tam plánovat výjezdy a nákupy."
- **"Přeskočit, pozvu později"** — povolené, ale subtilní

### Step 3: První rezervace (60 sekund)

**Po pozvání (nebo přeskočení).** Ukaž hodnotu okamžitě.

**Guided tour:**
1. Otevři kalendář s pulsujícím CTA: "Kdy jedete na chatu? Vytvořte první rezervaci"
2. Click → formulář s date pickerem a poznámkou
3. Po uložení: "Skvělé! Vaši členové uvidí rezervaci v kalendáři. 🏡"

### Step 4: Dashboard (konec onboardingu)

Redirect na dashboard s:
- **Welcome banner:** "Vaše chata [Název] je připravena! Pozvěte rodinu a začněte plánovat." (dismissible)
- **Checklist widget** v dashboardu:
  - ✅ Vytvořit chatu
  - ✅/⬜ Pozvat členy
  - ✅/⬜ Vytvořit rezervaci
  - ⬜ Nahrát první fotku
  - ⬜ Vytvořit nákupní seznam
- Checklist zmizí po dokončení všech kroků (nebo po "Skrýt" kliknutí)

---

## Onboarding pro pozvaného člena

Jiný flow než pro admina! Přichází přes pozvánku.

### Journey:
1. Klikne na pozvánku → landing page s info o chatě a kdo ho pozval
2. Registrace (email + heslo, nebo Google)
3. Automaticky přidán do chaty
4. Redirect na dashboard chaty s welcome banner: "Vítejte v [Název chaty]! [Admin jméno] vás pozval(a)."
5. Krátký tooltip tour: "Tady jsou rezervace → Tady nákupní seznamy → Tady poznámky"

### UX pro pozvaného:
- **ŽÁDNÝ wizard** — jsou zde proto, že je někdo pozval. Rovnou do appky.
- **Tooltip tour** — 3-4 kroky, klikací, přeskočitelné
- V navigaci zvýraznit "Rezervace" (nejdůležitější tab pro nového člena)

---

## Retention Hooks (aby se uživatelé vraceli)

### Denní/Týdenní
- **Push notifikace** (PWA): "Petr vytvořil rezervaci na víkend 15.–17. března"
- **Email digest** (weekly): "Co se děje na chatě [Název] — 2 nové rezervace, 5 položek na nákupním seznamu"

### Před výjezdem
- **Reminder email** 2 dny před rezervací: "Za 2 dny jedete na chatu! Zkontrolujte nákupní seznam."
- **Smart shopping list** — automaticky přidat obvyklé položky ("Minule jste nakupovali: mléko, chleba, pivo")

### Sezónní
- **Sezónní tipy:** "Léto na chatě: nezapomeňte na gril, opalovací krém, a repelent"
- **Výročí:** "Už rok používáte kdynachatu.cz! 🎉 Tady je shrnutí: 24 výjezdů, 156 položek nakoupeno"

---

## Měření onboardingu

### Klíčové metriky
| Metrika | Měření | Cíl |
|---|---|---|
| Registrace → Vytvoření chaty | % | > 80% |
| Vytvoření chaty → Pozvání člena | % | > 50% |
| Pozvání člena → Akceptace pozvánky | % | > 70% |
| Registrace → Aktivace (3 kroky) | % | > 40% |
| Day 1 retention | % uživatelů se vrátí den po registraci | > 30% |
| Day 7 retention | % uživatelů se vrátí po týdnu | > 20% |
| Day 30 retention | % uživatelů se vrátí po měsíci | > 15% |

### Tracking Events
```typescript
// Minimální events k trackování
analytics.track('user_registered', { method: 'email' | 'google' })
analytics.track('cabin_created', { hasLocation: boolean, hasWallpaper: boolean })
analytics.track('member_invited', { method: 'link' | 'email' | 'qr', count: number })
analytics.track('invite_accepted', { invitedBy: userId })
analytics.track('reservation_created', { isFirst: boolean, daysAhead: number })
analytics.track('onboarding_completed', { timeMinutes: number, stepsSkipped: string[] })
analytics.track('onboarding_abandoned', { lastStep: string, timeSpent: number })
```

---

## Anti-patterns (co NEDĚLAT)

- ❌ **Prázdný dashboard** po registraci — nikdy neukaž prázdnou stránku
- ❌ **Příliš mnoho kroků** — max 3-4 kroky v onboarding wizardu
- ❌ **Nucení vyplnit vše** — volitelné = volitelné. Nenuť.
- ❌ **Technický jazyk** — "Vytvořit tenant" → "Vytvořit chatu"
- ❌ **Skrytý skip** — vždy nabídni přeskočení volitelných kroků
- ❌ **Žádný progress** — uživatel musí vědět kde je (progress bar)
- ❌ **Dlouhé formuláře** — max 3 pole na obrazovku
- ❌ **Email verifikace PŘED použitím** — nech je appku zkusit, verifikuj později
