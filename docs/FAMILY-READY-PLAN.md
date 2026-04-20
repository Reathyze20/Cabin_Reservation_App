# Family-Ready Plan

Detailni plan pro dokonceni aplikace tak, aby sla bez zbytecneho stresu pouzivat jednou rodinou v beznem provozu.

Prakticky odskrtavaci seznam je v [FAMILY-READY-CHECKLIST.md](FAMILY-READY-CHECKLIST.md).

Tento plan je zamerne odlisny od verejneho SaaS launch planu.
Neresi hlavne monetizaci, SEO ani akvizici. Resi to, co je potreba, aby aplikace byla spolehliva, srozumitelna a bezpecna pro realne rodinne pouzivani.

## 1. Vychozi stav

Aktualni stav aplikace je silny v core funkcich:

- Rezervace jsou funkcne dostatecne hotove.
- Nakupni seznamy a zasoby jsou pouzitelne.
- Chat, galerie, denik a rekonstrukce uz nejsou hlavni brzda.
- Admin a cabin settings jsou pouzitelne.
- Mobilni shell a responzivni chovani uz nejsou jen prototyp.

Hlavni mezery uz nejsou v tom, ze by chybel dalsi velky modul.
Hlavni mezery jsou v provozni spolehlivosti, recovery flow a aktivaci rodiny.

## 2. Cile tohoto planu

Po dokonceni fazi 0 a 1 musi platit:

- rodina se umi sama dostat do aplikace bez manualni pomoci developera,
- ztrata dat neni realisticky pravdepodobna,
- pri problemu vite rychle, ze aplikace nefunguje,
- appka je bezpecna pro bezne rodinne pouzivani,
- admin umi zvladnout bezne provozni situace bez zasahu do databaze nebo serveru.

## 3. Priority framework

Kazdou dalsi praci priorizovat podle teto logiky:

1. Hrozi ztrata dat nebo dlouhy vypadek?
2. Zablokuje to rodinu pri beznem pouzivani?
3. Zvysi to pocet situaci, kdy musite delat manualni support?
4. Zvysi to jistotu po deployi?
5. Je to jen polish nebo future SaaS potreba?

## 4. Faze 0 - Kriticke blokery

Tyto body doporucuji udelat pred tim, nez aplikaci pustite rodine naplno.

### 4.1 Backup databaze a uploadu

Proc:
Nejvetsi realne riziko neni chyba v UI, ale ztrata rezervaci, deniku a fotek.

Co chybi:

- automaticky denni backup databaze,
- automaticky backup uploadu a thumbnailu,
- overeny restore postup,
- retence zaloznih souboru.

Definition of done:

- bezi denni backup DB,
- bezi denni backup uploads,
- zalohy se uchovavaji alespon 7-30 dni,
- mate jednoduchy restore runbook,
- jednou je otestovany restore do test prostredi.

Odhad: M
Riziko bez toho: Kriticke

### 4.2 Produkcni e-mail flow

Proc:
Registrace, verifikace a pozvanky stoji na mailu. Pokud mail realne nedorazuje, onboarding rodiny se rozbije.

Co chybi:

- potvrdit realne SMTP nastaveni v produkci,
- otestovat verify mail, invite mail a fallback scenare,
- potvrdit spravne URL v emailech.

Definition of done:

- registrace posle verifikacni mail,
- verifikacni link otevre spravnou produkcni routu,
- admin vytvori pozvanku a clovek ji prijme bez manualni pomoci,
- existuje kratky postup co delat, kdyz mail nedorazi.

Odhad: S
Riziko bez toho: Vysoke

### 4.3 Monitoring a alerting minimum

Proc:
Health endpoint a lokalni logy nestaci. Kdyz appka spadne, potrebujete to vedet driv nez rodina.

Co chybi:

- uptime monitoring,
- zakladni alert pri nedostupnosti,
- dohled nad diskem a log rotation,
- jednoducha kontrola po deployi.

Definition of done:

- bezi uptime monitoring na web a health endpoint,
- pri vypadku prijde alert,
- logy se nerostou bez limitu,
- po deployi mate kratky smoke check.

Odhad: S
Riziko bez toho: Vysoke

### 4.4 Rodinny end-to-end rehearsal

Proc:
Pred ostrym pouzivanim potrebujete overit cely realny tok, ne jen build bez chyb.

Co chybi:

- jeden rucni dry run s realnymi rolemi,
- overeni desktop + mobil,
- zapis, co presne je hotovo a co jeste zlobilo.

Definition of done:

- probehne scenar admin + clan,
- projde registrace nebo invite,
- projde rezervace, shopping, chat, galerie a admin editace,
- vysledkem je seznam poslednich blockeru nebo potvrzeni readiness.

Odhad: S
Riziko bez toho: Vysoke

## 5. Faze 1 - Nutne pred ostrym rodinnym provozem

Tyto body uz nejsou tak kriticke jako zalohy, ale bez nich bude provoz zbytecne krehky nebo bude casto potrebovat vas rucni support.

### 5.1 Password recovery

Proc:
Prihlaseny uzivatel si umi zmenit heslo, ale zapomenute heslo nema pohodlny self-service flow.

Doporuceny vystup:

- forgot password flow pres e-mail,
- reset hesla pres secure token,
- fallback admin postup do doby, nez bude flow hotovy.

Definition of done:

- uzivatel na loginu vidi Zapomenute heslo,
- prijde reset mail,
- po resetu se umi normalne prihlasit,
- expirace tokenu a friendly chybove stavy jsou osetrene.

Odhad: M
Riziko bez toho: Vysoke

### 5.2 Realny activation flow pro prvniho admina

Proc:
Technicky onboarding existuje, ale chybi rodinny activation flow, ktery noveho admina povede k tomu, co ma udelat jako prvni.

Doporuceny vystup:

- uvodni checklist na dashboardu pro novou chatu,
- CTA: pozvat rodinu, vytvorit prvni rezervaci, zalozit prvni shopping list,
- skryti checklistu po dokonceni.

Definition of done:

- po prvnim prihlaseni admin okamzite vidi dalsi kroky,
- behem par minut umi dostat do appky dalsiho clena,
- prvni tyden pouzivani nevyzaduje vysvetlovani po telefonu.

Odhad: M
Riziko bez toho: Stredni

### 5.3 Invite UX bez zbytecne rucniho kopirovani

Proc:
Pro rodinu je zbytecne tvrde chtit po adminovi, aby si vsechno kopiroval rucne. Invite flow ma byt co nejbliz bezne komunikaci.

Doporuceny vystup:

- tlacitko odeslat pozvanku e-mailem,
- tlacitko zkopirovat kratky text pro WhatsApp nebo SMS,
- jasny stav pozvanky: aktivni, prijata, expirovana.

Definition of done:

- admin z admin page posle clena do appky do 1 minuty,
- nemusi manualne skladat zpravu,
- v seznamu vidi, co uz bylo prijato a co ne.

Odhad: S
Riziko bez toho: Stredni

### 5.4 Zakladni notifikace na zmeny

Proc:
Jadro aplikace uz funguje, ale zmeny jsou casto tiche. Rodina potrebuje vedet aspon o rezervacich a dulezitych provoznich zmenach.

Doporuceny vystup:

- e-mail pri nove rezervaci,
- e-mail pri zruseni nebo uprave dulezite rezervace,
- pripadne jednoduche in-app oznaceni novinek.

Definition of done:

- nova rezervace neni ticha udalost,
- rodina se o ni dozvi bez nutnosti otevrit appku kazdou hodinu,
- notifikace jsou srozumitelne a cesky napsane.

Odhad: M
Riziko bez toho: Stredni az vysoke

### 5.5 Auth konzistence a account enforcement

Proc:
Kdyz uz existuji stavy uctu jako ban nebo verify, musi byt vynucovane konzistentne na vsech relevantnich mistech.

Doporuceny vystup:

- banned user nesmi projit login flow,
- banned middleware je realne zapojeny,
- heslova pravidla jsou sjednocena,
- auth edge cases jsou osetrene konzistentne.

Definition of done:

- zablokovany ucet se neprihlasi,
- neexistuje rozdil mezi tim, co UI tvrdi a co server opravdu pusti,
- auth validation pravidla jsou stejna v registraci, zmene hesla i resetu.

Odhad: S
Riziko bez toho: Stredni

### 5.6 Offline/PWA pravdivost a minimalni odolnost

Proc:
Na chate casto neni signal. Soucasna app ma zaklady PWA, ale neni dobre slibovat chovani, ktere neni skutecne garantovane.

Doporuceny vystup:

- upravit texty tam, kde dnes slibuji automatickou synchronizaci bez jistoty,
- zachovat offline cteni aspon pro klicove obrazovky,
- pokud mozno pridat jednoduchou queue pro vybrane akce.

Definition of done:

- appka nelze uzivatele misti zavadejicimi texty,
- pri slabsim pripojeni je porad citelna a rozumna,
- po obnoveni site je jasne, co se povedlo a co ne.

Odhad: M
Riziko bez toho: Stredni az vysoke

### 5.7 Mobilni QA pass na realnem zarizeni

Proc:
Rodina bude appku casto pouzivat z telefonu. DevTools nestaci.

Doporuceny vystup:

- rucni test na 1-2 realnych telefonech,
- overit rezervace, chat, fotky, shopping, profile drawer a admin,
- zapsat drobne UX chyby do maleho polish backlogu.

Definition of done:

- nevznika horizontalni scroll,
- modaly a bottom nav se neprekryvaji,
- upload fotek a prace v kalendari jsou pohodlne prstem.

Odhad: XS
Riziko bez toho: Stredni

## 6. Faze 2 - Kratce po spusteni rodine

Tyto body bych planoval hned po prvnich dnech realneho pouzivani.

### 6.1 Realtime refresh pro chat a dulezite zmeny

Proc:
Infrastruktura pro sockety existuje, ale uzivatelsky efekt jeste neni vsude dotazeny.

Doporuceny vystup:

- realtime nebo okamzita invalidace pro chat,
- refresh dulezitych admin a reservation udalosti,
- mene manualnich reloadu.

Odhad: M
Riziko bez toho: Stredni

### 6.2 Drobne self-service administrace

Proc:
Jakmile rodina zacne appku pouzivat, prijde potreba drobnych uprav bez zasahu developera.

Doporuceny vystup:

- leave cabin flow v UI,
- dotazeni drobnych admin akci,
- lepsi nastaveni chaty podle realne zpetne vazby.

Odhad: S
Riziko bez toho: Nizke az stredni

### 6.3 Testy a CI preflight

Proc:
Po prvnim pusteni rodine zacne bolet kazda regrese po male zmene.

Doporuceny vystup:

- frontend testy pro nejkritictejsi flow,
- aspon zakladni backend smoke testy,
- test + build pred deployem.

Definition of done:

- deploy neprojde bez zakladni validace,
- nejkritictejsi use cases maji aspon minimalni test ochranu.

Odhad: L
Riziko bez toho: Stredni

## 7. Faze 3 - Pozdeji, az bude rodinny provoz stabilni

Tyto body nejsou potreba k tomu, aby appka slouzila jedne rodine.

### 7.1 Pokrocile notifikace a activity centrum

- in-app notification center,
- weekly digest,
- jemnejsi preference upozorneni.

Odhad: M

### 7.2 Rozsireny superadmin a backoffice

- audit trail,
- globalni sprava vice cabinu,
- operacni reporty.

Odhad: M

### 7.3 Public SaaS veci

- billing a pricing enforcement,
- analytics a funnel tracking,
- SEO a landing optimalizace,
- multi-cabin komercni model,
- verejny support a feedback stack.

Odhad: L

## 8. Doporuce poradi implementace

Nejrozumnejsi poradi je:

1. Backup DB a uploadu
2. Produkcni e-mail flow
3. Monitoring a alerting
4. Rodinny smoke rehearsal
5. Password recovery
6. Activation checklist pro prvniho admina
7. Invite UX z adminu
8. Zakladni rezervacni notifikace
9. Auth enforcement cleanup
10. Offline/PWA pravdivost a mobilni QA
11. Realtime a drobny self-service polish
12. Testy a CI preflight

## 9. Minimalni go-live podminky pro rodinu

Appku bych pustil rodine naplno az ve chvili, kdy budou splnene tyto podminky:

- existuje funkcni a overeny backup,
- registrace nebo invite projdou bez rucniho zasahu,
- pri vypadku vite, ze aplikace nejede,
- zapomenute heslo jde vyresit bez zasahu do databaze,
- admin umi dostat dalsiho clena do appky bez vysvetlovani,
- na telefonu jsou overene rezervace, shopping, chat a upload fotek,
- probehl jeden cely rodinny rehearsal flow.

## 10. Co neni potreba resit ted

Pro jednu rodinu zatim neni nutne tlacit:

- billing,
- pricing tiers,
- SEO,
- verejne analytics dashboardy,
- rozsahly superadmin rozvoj,
- multi-tenant commercial polish.

Tohle patri az do dalsi etapy, kdy budete resit cizi uzivatele a verejny launch.

## 11. Prakticky kratky plan na nejblizsi kroky

### Tento vikend

- dodelat backup plan a restore test,
- potvrdit produkcni e-mail flow,
- zapnout monitoring,
- udelat rodinny smoke rehearsal.

### Dalsi sprint

- password recovery,
- activation checklist po registraci,
- invite UX z admin page,
- rezervacni notifikace.

### Sprint po spusteni

- realtime refresh,
- drobne admin self-service veci,
- testy a CI preflight.

---

Pokud budete chtit, navazujici dokument by mel byt:

- implementacni checklist pro fazi 0,
- nebo konkretni vikendovy plan po dnech a blocich.