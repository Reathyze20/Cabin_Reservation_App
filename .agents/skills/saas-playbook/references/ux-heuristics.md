# UX Heuristics — kdynachatu.cz

Kombinace Nielsenových heuristik + SaaS-specifických pravidel pro cabin management app.

---

## 1. Viditelnost stavu systému

Uživatel musí **vždy vědět** co se děje.

### Checklist
- [ ] Každá akce má vizuální feedback (toast, animace, spinner)
- [ ] Loading state na každé data-dependent stránce (skeleton, ne spinner celé stránky)
- [ ] Progress indicator pro multi-step procesy (onboarding wizard, upload)
- [ ] Aktivní navigační položka je zvýrazněná
- [ ] Online/offline indikátor (banner, ikona)
- [ ] "Ukládání..." / "Uloženo" feedback pro auto-save

### SaaS specifické
- [ ] Aktuální plán zobrazený v nastavení
- [ ] Limit usage bar (5/15 členů)
- [ ] Sync status — data jsou aktuální? Kdy naposledy refreshnut?
- [ ] Ukazatel "kdo je online" (pokud máte real-time features)

---

## 2. Shoda systému s reálným světem

Používej **jazyk uživatele**, ne programátorský žargon.

### Checklist
- [ ] Česky! Žádné "Submit", "Entity", "Instance", "Query"
- [ ] "Chata" ne "Tenant" nebo "Workspace"
- [ ] "Členové" ne "Users" nebo "Accounts"  
- [ ] "Výjezd" nebo "Pobyt" ne "Reservation instance"
- [ ] Datum česky: "15. března 2026" ne "2026-03-15"
- [ ] Ikony odpovídají mentálním modelům (kalendář pro rezervace, košík pro nákupy)
- [ ] Navigace odpovídá reálnému workflow (Dashboard → Rezervace → Nákupy → na chatě → po chatě)

### Chatařský slovník
| V kódu / špatně | V UI / správně |
|---|---|
| Create reservation | Nová rezervace |
| Delete | Smazat / Zrušit |
| Shopping list | Nákupní seznam |
| Submit | Uložit / Odeslat |
| Cancel | Zrušit |
| Error occurred | Něco se pokazilo. Zkuste to znovu. |
| Null / Empty | Zatím nic. Buďte první! |
| Tenant | Chata |
| User | Člen |
| Admin panel | Správa chaty |

---

## 3. Uživatelská kontrola a svoboda

Uživatel musí mít **únikovou cestu** z každé akce.

### Checklist
- [ ] Každý dialog má "Zavřít" (× nebo Escape)
- [ ] Každý formulář má "Zrušit"
- [ ] Destruktivní akce mají "Opravdu?" dialog
- [ ] Undo možnost pro rychlé akce (smazání položky ze seznamu → toast s "Vrátit zpět")
- [ ] Back navigation funguje správně (browser back button)
- [ ] Modály nezamykají uživatele (klik na backdrop = zavřít)

### SaaS specifické
- [ ] Uživatel může opustit onboarding (a vrátit se později)
- [ ] Uživatel může opustit chatu (leave group)
- [ ] Admin může downgrade plan bez ztráty dat (data frozen, ne smazaná)
- [ ] "Smazat účet" je dostupné (GDPR) ale s dostatečným varováním

---

## 4. Konzistence a standardy

Stejná akce = stejný pattern **všude** v appce.

### Checklist
- [ ] Primární akce je vždy stejná barva (emerald-600) a pozice (vpravo/dole)
- [ ] Destruktivní akce je vždy červená (red-600)
- [ ] Toast notifikace vypadají stejně napříč celou appkou
- [ ] Modály mají stejný layout (title → content → footer s tlačítky)
- [ ] Seznamy mají stejný vzor (search → filter → list → pagination)
- [ ] Empty states mají konzistentní design (ikona + text + CTA)
- [ ] Loading states jsou konzistentní (skeleton, ne mix skeleton + spinner)
- [ ] Formuláře: label nahoře, input pod ním, error pod inputem

### Typografie konzistence
| Element | Size | Weight | Color |
|---|---|---|---|
| Page title (h1) | text-2xl md:text-3xl | font-bold | text-slate-900 |
| Section title (h2) | text-xl md:text-2xl | font-semibold | text-slate-800 |
| Card title (h3) | text-lg | font-semibold | text-slate-800 |
| Body text | text-sm md:text-base | font-normal | text-slate-700 |
| Muted/secondary | text-sm | font-normal | text-slate-500 |
| Labels | text-sm | font-medium | text-slate-700 |

---

## 5. Prevence chyb

Lepší **zabránit chybě** než ji hlásit.

### Checklist
- [ ] Date picker neumožní vybrat minulé datum (pro nové rezervace)
- [ ] Formulář inline validace (ne až po submit)
- [ ] Povinná pole jasně označená (* nebo text)
- [ ] Disable submit button pokud formulář není validní
- [ ] Disable button po kliknutí (anti-double-submit)
- [ ] Potvrzovací dialog pro ALL destruktivní akce
- [ ] Auto-save pro dlouhé textové vstupy (poznámky, deník)
- [ ] Konflikty rezervací zobrazené PŘED submitnutím (ne až po chybě)

### SaaS specifické
- [ ] Ukaž limit PŘED tím, než uživatel narazí ("Zbývají 2 volná místa pro členy")
- [ ] Preview email pozvánky před odesláním
- [ ] Varování před downgrade plánu ("Ztratíte přístup k fotogalerii")

---

## 6. Rozpoznání místo vzpomínání

Uživatel by neměl **nic pamatovat** — vše důležité má vidět.

### Checklist
- [ ] Navigace jasně popisuje kam vede (ne jen ikony)
- [ ] Breadcrumbs na vnořených stránkách
- [ ] "Naposledy navštívené" / "Časté akce" na dashboardu
- [ ] Auto-complete pro opakované vstupy (nákupní položky)
- [ ] Kontextové nápovědy (tooltip na neobvyklých fieldech)
- [ ] Datum rezervace zobrazené i relativně ("za 3 dny", "minulý týden")

---

## 7. Flexibilita a efektivita

Power users i nováčci musí být **spokojeni**.

### Checklist
- [ ] Klávesové zkratky pro časté akce (Enter = uložit v modálu)
- [ ] Quick actions (dashboard → rychlá nová rezervace)
- [ ] Drag & drop kde to dává smysl (přeusporádání seznamu)
- [ ] Bulk akce na seznamech (odškrtni vše, smaž vybrané)
- [ ] Search/filter na seznamech s 10+ položkami
- [ ] Nedávné položky / smart suggestions (nákupní seznam)

---

## 8. Estetický a minimalistický design

Méně je více. Každý element musí **zasloužit si své místo**.

### Checklist
- [ ] Žádné vizuální "šum" — dekorativní elementy bez účelu
- [ ] Dostatek bílého prostoru (padding, margin, gap)
- [ ] Jasná vizuální hierarchie (co je důležité je větší/tučnější/barevnější)
- [ ] Maximum 2-3 barvy na stránce + neutály
- [ ] Informace seskupené logicky (Gestalt principles)
- [ ] Progresivní odhalování — ukázat jen co je potřeba, zbytek schovat
- [ ] Žádné dlouhé texty — krátké, jasné, akční

### "Premium feel" checklist
- [ ] Rounded corners (rounded-xl, rounded-2xl)
- [ ] Jemné stíny (shadow-md, shadow-xl, ne shadow-2xl)
- [ ] Smooth transitions (duration-200, ease-out)
- [ ] Glassmorphism na hlavních kartách (bg-white/95 backdrop-blur)
- [ ] Konzistentní spacing grid (4px base — p-1, p-2, p-4, p-6, p-8)
- [ ] Micro-interactions na hover/focus/active statech

---

## 9. Pomoc uživateli při chybách

Error messages musí být **užitečné**, ne frustrující.

### Pravidla pro error messages
| Špatně | Správně |
|---|---|
| "Error 500" | "Něco se pokazilo. Zkuste to prosím znovu." |
| "Invalid input" | "Vyplňte prosím název rezervace" |
| "Unauthorized" | "Přihlaste se prosím" |
| "Conflict" | "Na tento termín už existuje rezervace" |
| "Not found" | "Tato stránka neexistuje. Vraťte se na dashboard." |
| "Rate limited" | "Příliš mnoho pokusů. Zkuste to za minutu." |

### Error state checklist
- [ ] Každý error má srozumitelnou českou zprávu
- [ ] Každý error má "Zkusit znovu" tlačítko (kde to dává smysl)
- [ ] 404 stránka je hezká, ne default
- [ ] Network error = "Vypadá to, že jste offline. Zkontrolujte připojení."
- [ ] Form error = red border na fieldu + text pod ním
- [ ] API error = toast notification (ne alert box)

---

## 10. Dokumentace a nápověda

I tak **jednoduchá** appka potřebuje nápovědu.

### Checklist
- [ ] Onboarding tooltips pro nové uživatele
- [ ] FAQ stránka nebo help section
- [ ] Kontextové "?" ikony u komplexních nastavení
- [ ] Feedback formulář ("Něco nefunguje? Dejte nám vědět")
- [ ] Changelog / "Co je nového" — ukáže se po updatu

---

## Quick UX Score (self-assessment)

Projdi svou stránku/feature a ohodnoť 1-10:

| Kritérium | Co měříš | Score |
|---|---|---|
| **First impression** | Pochopí uživatel za 3 sekundy co to dělá? | /10 |
| **Task completion** | Dokáže svůj úkol bez pomoci? | /10 |
| **Error recovery** | Dokáže se zotavit z chyby? | /10 |
| **Visual consistency** | Vypadá to jako součást jedné appky? | /10 |
| **Mobile usability** | Funguje to na telefonu (palcem)? | /10 |
| **Delight** | Řekne si "to je fajn" nebo "to je otrava"? | /10 |
| **Speed perception** | Cítí se to rychle? (i pokud čeká na data) | /10 |

**Celkem: /70** — Cíl pro launch: min 50/70
