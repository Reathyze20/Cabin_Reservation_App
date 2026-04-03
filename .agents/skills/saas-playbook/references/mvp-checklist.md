# MVP Checklist — kdynachatu.cz

## Filozofie MVP

MVP neznamená "špatný produkt". Znamená **nejmenší produkt, který přinese hodnotu a za který by někdo zaplatil**. Pro cabin management to je:

> "Chci jednoduše koordinovat kdo a kdy jede na chatu, co nakoupit, a co je potřeba opravit — aniž bych musel psát do rodinné WhatsApp skupiny."

---

## Tier 1: Must-Have (bez tohoto nelaunchuj)

### Onboarding & Auth
- [ ] Registrace nové chaty (tenant provisioning) — jméno chaty, lokace, admin email
- [ ] Pozvání členů rodiny přes email/link
- [ ] Login/logout s "pamatovat si mě"
- [ ] Password reset flow
- [ ] Role: admin, member, guest (read-only)
- [ ] Ochrana všech stránek pro přihlášené uživatele

### Rezervace (core value proposition)
- [ ] Kalendář s vizuálním přehledem obsazenosti
- [ ] Vytvoření rezervace s date range + poznámka
- [ ] Detekce kolizí (překrývající se rezervace → varování nebo blok)
- [ ] Notifikace (email) při nové rezervaci
- [ ] Zrušení vlastní rezervace
- [ ] Admin může rušit/editovat cizí rezervace
- [ ] Mobile-friendly kalendář (musí fungovat na telefonu)

### Nákupní seznamy
- [ ] Sdílený nákupní seznam pro každý výjezd
- [ ] Přidání/odškrtnutí položky (real-time nebo optimistic update)
- [ ] Kdo co přidá — viditelné jméno  
- [ ] Archivace starých seznamů

### Nástěnka / Poznámky
- [ ] Sdílené poznámky (vlákna/threads)
- [ ] Připnutí důležité poznámky nahoře
- [ ] Markdown nebo rich text formátování

### Profil & Nastavení
- [ ] Změna hesla
- [ ] Upload avatara
- [ ] Nastavení chaty (název, popis, lokace) — admin only
- [ ] Správa členů (pozvání, odebrání, změna role) — admin only

### Technické minimum
- [ ] HTTPS (Let's Encrypt)
- [ ] Responsivní design (320px – 1920px)
- [ ] Loading states (skeleton loaders)
- [ ] Error handling (friendly Czech messages)
- [ ] Empty states (ne prázdná stránka)
- [ ] PWA install prompt na mobile
- [ ] Basic SEO (title, description, OG tags na landing page)

---

## Tier 2: Should-Have (první 2 týdny po launchi)

### Fotogalerie
- [ ] Upload fotek z výletu
- [ ] Automatické thumbnaily
- [ ] Galerie per výjezd/datum
- [ ] Lightbox prohlížení

### Deník
- [ ] Zápis ze dne na chatě
- [ ] Fotky v zápisech
- [ ] Chronologický přehled

### Dashboard
- [ ] Přehled nejbližších rezervací
- [ ] Počasí v lokaci chaty
- [ ] Rychlé akce (nová rezervace, nákupní seznam)
- [ ] Aktivita ostatních členů ("Petr přidal rezervaci na víkend")

### Notifikace
- [ ] Email notifikace na nové rezervace
- [ ] Email notifikace na nové poznámky (volitelné)
- [ ] In-app notification center

---

## Tier 3: Nice-to-Have (V2, měsíc 2+)

### Inventář chaty
- [ ] Seznam vybavení (co na chatě je)
- [ ] "Přivézt z domova" seznam
- [ ] Stav spotřebičů

### Rekonstrukce / Údržba
- [ ] Tracker oprav a projektů
- [ ] Rozpočet a výdaje
- [ ] Fotodokumentace průběhu

### Chat / Zprávy
- [ ] Real-time chat mezi členy
- [ ] Kontextové zprávy (u rezervace, u poznámky)

### Analytics (pro admina)
- [ ] Kdo nejčastěji jezdí?
- [ ] Obsazenost po měsících
- [ ] Náklady per výjezd

### Premium features (monetizace)
- [ ] Více než 1 chata per účet
- [ ] Více než 10 členů
- [ ] Automatické reporty
- [ ] Custom branding (logo, barvy)
- [ ] API přístup
- [ ] Export dat (CSV, PDF)

---

## MVP Scope Decision Framework

Když zvažuješ novou feature, polož si:

1. **Řeší to problém, kvůli kterému si lidé stáhnou appku?** → Pokud ne, je to V2.
2. **Existuje workaround?** (např. "mohou si to napsat do poznámek") → Pokud ano, odlož.
3. **Kolik uživatelů to potřebuje?** → Pokud méně než 50%, odlož.
4. **Jak dlouho to bude trvat?** → Pokud více než 3 dny, rozděl na menší kroky nebo odlož.
5. **Pomůže to konverzi z free na paid?** → Pokud ano, prioritizuj.
