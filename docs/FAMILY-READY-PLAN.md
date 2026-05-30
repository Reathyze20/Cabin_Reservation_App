# Family-Ready Plan

Detailni plan pro dokonceni aplikace tak, aby sla bez zbytecneho stresu pouzivat jednou rodinou v beznem provozu.

Prakticky odskrtavaci seznam je v [FAMILY-READY-CHECKLIST.md](FAMILY-READY-CHECKLIST.md).

Tento plan je zamerne odlisny od verejneho SaaS launch planu.
Neresi hlavne monetizaci, SEO ani akvizici. Resi to, co je potreba, aby aplikace byla spolehliva, srozumitelna a bezpecna pro realne rodinne pouzivani.

Aktualizace k 2026-05-26:

- cast family-ready minima uz je hotova v repu,
- cast puvodnich bodu uz neni vyvoj, ale produkcni overeni,
- nejvetsi otevrene riziko uz neni chybejici modul, ale provozni jistota,
- nejvetsi otevrene blockery jsou produkcni SMTP E2E, chybejici externi alerting a neodjety rucny desktop + mobil rehearsal.

## 1. Vychozi stav

Aktualni stav aplikace je silny v core funkcich i v casti puvodne planovanych family-ready veci:

- Rezervace, nakupni seznamy, chat, galerie, denik a rekonstrukce jsou pouzitelne.
- Admin, cabin settings a mobilni shell jsou pouzitelne.
- V repu uz existuje backup manager, restore runbook a opakovatelny backup smoke test.
- V repu uz existuje password recovery flow, activation checklist pro prvniho admina a invite UX.
- Auth enforcement pro blokovane ucty je z velke casti dotazene.
- Monitoring minimum ma health endpoint, operational smoke helper a PM2 logrotate setup.

Hlavni mezery uz nejsou v tom, ze by chybel dalsi velky modul.
Hlavni mezery jsou v provozni spolehlivosti, produkcnim overeni, e-mail hardeningu, upozornenich na rezervace a pravdivem offline chovani.

### Gap analyza k dnesku

Pro dalsi rozhodovani je dobre oddelit ctyri ruzne typy zbyvajici prace. Jinak se snadno smicha skutecne chybejici implementace s vecmi, ktere uz v repu jsou a jen cekaji na realne overeni.

#### Co chybi dodelat v kodu

- rezervace uz zapisuji activity zpravy do notes i pri vytvoreni, uprave a zruseni, ale stale chybi realne overeni textu, hluku a vnimane dorucitelnosti pro rodinu,
- realtime infrastruktura existuje, ale `useSocket` zatim neni napojeny do aktivnich obrazovek, takze uzivatelsky efekt realtime jeste neni hotovy,
- self-service leave cabin uz ma viditelny vstup v profilovem draweru, ale stale chybi realne rehearsal overeni celeho toku na desktopu a mobilu,
- deploy workflow uz blokuje backend typecheck + frontend test/build pred restartem produkce, ale stale chybi backend smoke coverage a vyber 3-5 kritickych flow pro automatizaci,
- superadmin create-user flow uz v produkci failuje bezpecne bez fallback secret dat, ale onboarding E2E stale blokuje stejna SMTP `535 Authentication Credentials Invalid` chyba jako ostatni transactional maily.

#### Co chybi doresit v provozu

- potvrdit jeste jeden bezny produkcni deploy s novou preflight gate po dalsi zmene,
- realne otestovat obnovu z produkcni DB a uploads zalohy,
- pridat externi uptime monitoring a alerting pro web, health endpoint a stari backupu,
- rozhodnout, kam pujde off-site kopie zaloh, aby vse nezustalo jen na jednom VPS.

#### Co chybi overit realnym provozem

- verify e-mail, invite e-mail a reset hesla je potreba projet end-to-end na produkci po poslednim hardeningu,
- onboarding prvniho admina a onboarding dalsiho clena rodiny je potreba overit bez manualni pomoci developera,
- lokalni API-level rehearsal admin + pozvany clen uz probehl na izolovane DB, ale nenahrazuje browser a telefon test,
- mobilni QA je potreba projet na 1-2 realnych telefonech, ne jen v DevTools,
- je potreba jeden cely rodinny rehearsal, ktery potvrdi desktop + mobil + role flow v jednom scenari.

#### Co je hlavne polish a pravdivost UX

- offline copy uz nerika, ze se vse synchronizuje automaticky, ale stale chybi realny weak-signal rehearsal a pripadna queue pro vybrane akce,
- wording v activation, invite a admin flow je potreba doladit az podle realne rodinne zkusenosti,
- po prvnim realnem provozu bude potreba zapsat maly backlog drobnych mobilnich a admin UX chyb misto dalsich velkych refaktoru.

Z pohledu priority to znamena:

1. Nejdriv provozni jistota: deploy, backup restore, monitoring.
2. Hned potom produkcni onboarding jistota: verify, invite, reset, superadmin create-user.
3. Pak skutecne chybejici produktove minimum: rezervacni notifikace a pravdive offline chovani.
4. Az potom realtime a dalsi self-service polish.

## 2. Cile tohoto planu

Po dokonceni fazi 0 a 1 musi platit:

- rodina se umi sama dostat do aplikace bez manualni pomoci developera,
- ztrata dat neni realisticky pravdepodobna,
- pri problemu vite rychle, ze aplikace nefunguje,
- appka je bezpecna pro bezne rodinne pouzivani,
- admin umi zvladnout bezne provozni situace bez zasahu do databaze nebo serveru,
- bezny deploy je opet opakovatelny a nestoji na manualnim kopirovani souboru.

## 3. Priority framework

Kazdou dalsi praci priorizovat podle teto logiky:

1. Hrozi ztrata dat nebo dlouhy vypadek?
2. Zablokuje to rodinu pri beznem pouzivani?
3. Zvysi to pocet situaci, kdy musite delat manualni support?
4. Zvysi to jistotu po deployi?
5. Je to skutecna implementace, nebo uz jen produkcni overeni?
6. Je to jen polish nebo future SaaS potreba?

## 4. Faze 0 - Kriticke blokery

Tyto body doporucuji udelat pred tim, nez aplikaci pustite rodine naplno.

### 4.1 Deploy cesta a produkcni operace

Proc:
Standardni deploy retezec musi byt spolehlivy. Pokud produkce nejde aktualizovat bez manualniho `scp`, roste riziko driftu a chyb po kazde dalsi zmene.

Co je uz hotove:

- GitHub Actions deploy workflow existuje.
- Produkcni app umi build, restart PM2 a operational smoke check.
- Manualni hotfix deploy pres `scp` + `npm run build` + `pm2 restart` je overeny jako nouzovy fallback.
- Bundle deploy z GitHub Actions byl znovu overen v produkci.
- Workflow ted zastavi deploy jeste pred uploadem a restartem, pokud spadne backend typecheck nebo frontend test/build.

Co jeste chybi:

- potvrdit jeste jeden bezny deploy z `main` s novou preflight gate po dalsi aplikacni zmene,
- drzet post-deploy smoke jako soucast kazdeho dalsiho produkcniho releasu.

Definition of done:

- bezny produkcni deploy funguje znovu standardni cestou,
- server bezi na stejnem commitu jako repo,
- dalsi zmeny neni potreba nasazovat rucne pres kopirovani souboru.

Odhad: S
Riziko bez toho: Kriticke

### 4.2 Backup databaze a uploadu

Proc:
Nejvetsi realne riziko neni chyba v UI, ale ztrata rezervaci, deniku a fotek.

Co je uz hotove:

- v repu existuje backup manager pro DB i uploads,
- existuje retence backupu a restore runbook,
- existuje opakovatelny `npm run backup:smoke`,
- produkcni smoke helper umi overit pritomnost backup cronu,
- backup cron je na produkci nainstalovany,
- na produkci uz existuje prvni realny DB dump i uploads archiv.

Co jeste chybi:

- jednou obnovit realny produkcni `.dump` a `.tar.gz` do test prostredi,
- pridat dalsi vrstvu ochrany mimo jeden VPS stroj, idealne off-site kopii,
- doplnit kontrolu stari nebo neuspechu produkcnich backupu do monitoringu.

Definition of done:

- existuje realny produkcni DB backup,
- existuje realny produkcni uploads backup,
- obnova z produkcni zalohy byla aspon jednou realne otestovana,
- zalohy nejsou jen na stejnem VPS bez dalsiho planu.

Odhad: M
Riziko bez toho: Kriticke

### 4.3 Produkcni e-mail flow

Proc:
Registrace, verifikace, reset hesla a pozvanky stoji na mailu. Pokud mail realne nedorazuje nebo backend v produkci predstira uspech, onboarding rodiny se rozbije.

Co je uz hotove:

- verify e-mail flow existuje,
- password reset flow existuje,
- invite e-mail flow existuje,
- frontend ma stranky pro verify, invite i reset hesla,
- bezny auth flow uz v produkci nevraci `testCode` ani `testToken`,
- registrace se v produkci rollbackne, pokud selze odeslani verifikacniho mailu,
- genericke transactional maily se v produkci nesmi tise simulovat bez SMTP,
- startup v produkci validuje smysluplny `FRONTEND_URL`,
- `POST /api/superadmin/users` uz v produkci pri failu mailu rollbackne ucet a nevraci fallback secret data,
- invite create/accept flow byl na produkci 2026-05-24 realne overen bez manualni pomoci developera.

Aktualni produkcni nalez z 2026-05-24:

- `FRONTEND_URL` i `EMAIL_FROM` jsou na produkci nastavene spravne,
- registrace, invite email, forgot password a superadmin onboarding vsechny padaji na `535 Authentication Credentials Invalid`,
- nejde tedy o chybejici feature, ale o rozbity SMTP auth v produkcnim `.env` nebo u SES povereni.

Co jeste chybi:

- opravit produkcni SMTP auth (`535 Authentication Credentials Invalid`),
- po oprave znovu potvrdit skutecne doruceni verify, invite, reset a superadmin onboarding mailu,
- otestovat verify mail, invite mail, reset hesla a scenar mail nedorazil,
- dopsat kratky operacni postup co delat, kdyz SMTP nebo doruceni selze.

Definition of done:

- registrace posle verifikacni mail,
- verifikacni link otevre spravnou produkcni routu,
- admin vytvori pozvanku a clovek ji prijme bez manualni pomoci,
- forgot password flow funguje end-to-end,
- superadmin onboarding cesta nevraci produkcni fallback secret data,
- existuje kratky postup co delat, kdyz mail nedorazi,
- produkce nepredstira uspesne odeslani, kdyz SMTP realne nefunguje.

Odhad: S
Riziko bez toho: Vysoke

### 4.4 Monitoring a alerting minimum

Proc:
Health endpoint a lokalni logy nestaci. Kdyz appka spadne, potrebujete to vedet driv nez rodina.

Co je uz hotove:

- existuje `/api/health`,
- existuje post-deploy smoke check,
- existuje incident runbook,
- PM2 logrotate je na produkci nainstalovany.

Co jeste chybi:

- zapnout externi uptime monitoring na hlavni web,
- zapnout externi uptime monitoring na API health endpoint,
- nastavit alert pri nedostupnosti,
- doplnit kontrolu backup stari nebo selhani,
- jednou realne overit, ze alert opravdu dorazi.

Definition of done:

- bezi uptime monitoring na web a health endpoint,
- pri vypadku prijde alert,
- logy se nerostou bez limitu,
- po deployi mate kratky smoke check,
- vime, ze se dozvime i o problemu s backupy.

Odhad: S
Riziko bez toho: Vysoke

### 4.5 Rodinny end-to-end rehearsal

Proc:
Pred ostrym pouzivanim potrebujete overit cely realny tok, ne jen build bez chyb a jednotlive manualni spot-checky.

Co je uz hotove:

- existuje smoke-test podklad pro desktop,
- existuje mobile QA checklist,
- existuje i rizeny desktop + mobil rehearsal flow poskladany nad aktualne hotovymi obrazovkami,
- produkcni mobilni pristup k admin nastrojum uz byl dotazen.

Co jeste chybi:

- jeden rucni dry run s realnymi rolemi,
- overeni desktop + mobil,
- zapis, co presne je hotovo a co jeste zlobilo,
- potvrzeni, ze onboarding clena rodiny projde bez telefonicke podpory.

Definition of done:

- probehne scenar admin + clan,
- projde registrace nebo invite,
- projde rezervace, shopping, chat, galerie a admin editace,
- vysledkem je seznam poslednich blockeru nebo potvrzeni readiness.

Odhad: S
Riziko bez toho: Vysoke

## 5. Faze 1 - Nutne pred ostrym rodinnym provozem

Tyto body uz nejsou tak kriticke jako backup, deploy a e-mail, ale bez nich bude provoz zbytecne krehky nebo bude casto potrebovat rucni support.

### 5.1 Password recovery

Proc:
Prihlaseny uzivatel si umi zmenit heslo, ale family-ready minimum neni splnene, dokud neni potvrzeny realny self-service reset v produkcnim toku.

Co je uz hotove:

- forgot password flow pres e-mail existuje,
- reset hesla pres token existuje,
- expirace tokenu a zakladni UX existuji.

Co jeste chybi:

- otestovat uspesny reset hesla na produkci,
- otestovat expirovany nebo neplatny token,
- doplnit fallback admin postup do docs, pokud ho budete chtit drzet i po spusteni.

Definition of done:

- uzivatel na loginu vidi Zapomenute heslo,
- prijde reset mail,
- po resetu se umi normalne prihlasit,
- expirace tokenu a friendly chybove stavy jsou overene v praxi.

Odhad: XS-S
Riziko bez toho: Vysoke

### 5.2 Realny activation flow pro prvniho admina

Proc:
Technicky onboarding i checklist existuji, ale skutecny family-ready vystup je az potvrzeny prvni-admin flow bez vaseho doprovodu.

Co je uz hotove:

- uvodni checklist na dashboardu existuje,
- CTA pro pozvani rodiny, prvni rezervaci a prvni shopping list existuji,
- skryvani checklistu je implementovane.

Co jeste chybi:

- otestovat flow prvniho admina po registraci,
- projit wording a pripadne odstranit mista, kde by admin jeste tapal,
- zapsat drobne friction body z realneho rehearsal.

Definition of done:

- po prvnim prihlaseni admin okamzite vidi dalsi kroky,
- behem par minut umi dostat do appky dalsiho clena,
- prvni tyden pouzivani nevyzaduje vysvetlovani po telefonu.

Odhad: XS-S
Riziko bez toho: Stredni

### 5.3 Invite UX bez zbytecne rucniho kopirovani

Proc:
Invite UX je implementovane, ale family-ready minimum neni splnene, dokud neni potvrzeny realny admin flow po zpevneni e-mailove vrstvy.

Co je uz hotove:

- tlacitko odeslat pozvanku e-mailem existuje,
- tlacitko zkopirovat kratky text pro WhatsApp nebo SMS existuje,
- stavy pozvanek jsou v UI.

Co jeste chybi:

- overit admin flow bez manualniho skladani zprav,
- potvrdit, ze stav pozvanky se meni korektne po prijeti,
- pripadne upravit texty podle realne rodinne zkusenosti.

Definition of done:

- admin z admin page posle clena do appky do 1 minuty,
- nemusi manualne skladat zpravu,
- v seznamu vidi, co uz bylo prijato a co ne.

Odhad: XS-S
Riziko bez toho: Stredni

### 5.4 Zakladni notifikace na zmeny

Proc:
Jadro aplikace uz funguje, ale zmeny jsou casto tiche. Tady uz nejde jen o E2E overeni, ale o skutecne chybejici implementaci minima.

Co je uz hotove:

- notes kanal slouzi jako jednotny activity log pro novou, upravenou i zrusenou rezervaci,
- update notifikace jsou omezeny jen na zmenu terminu, stavu nebo ucelu, aby notes nebyly zahlcene drobnymi internimi upravami,
- copy u "Hlidat" uz nepretvari verejnou activity zpravu za osobni direct notifikaci.

Co jeste chybi:

- overit ceske texty a omezit hluk tak, aby notifikace nebyly otravne.

Definition of done:

- nova rezervace neni ticha udalost,
- uprava dulezite rezervace neni ticha udalost,
- zruseni rezervace neni ticha udalost,
- rodina se o zmenach dozvi bez nutnosti otevrit appku kazdou hodinu.

Odhad: M
Riziko bez toho: Stredni az vysoke

### 5.5 Auth konzistence a account enforcement

Proc:
Vetsina enforcementu uz existuje, ale family-ready jistota je az po overeni edge cases v realnem toku.

Co je uz hotove:

- banned user neprojde login flow,
- protected requesty se opiraji o aktualni stav uzivatele,
- heslova pravidla jsou z velke casti sjednocena.

Co jeste chybi:

- E2E overit verify, login, logout a edge case scenare,
- potvrdit konzistenci mezi beznym auth flow, invite flow a superadmin onboarding flow,
- pripadne dorezit posledni nekonzistence nalezene pri rehearsal.

Definition of done:

- zablokovany ucet se neprihlasi,
- neexistuje rozdil mezi tim, co UI tvrdi a co server opravdu pusti,
- auth validation pravidla jsou stejna v registraci, zmene hesla i resetu.

Odhad: XS-S
Riziko bez toho: Stredni

### 5.6 Offline/PWA pravdivost a minimalni odolnost

Proc:
Na chate casto neni signal. Soucasna app ma zaklady PWA, ale neni dobre slibovat chovani, ktere neni skutecne garantovane.

Co je uz hotove:

- existuje PWA plugin,
- existuje offline banner,
- existuje zakladni offline-aware chovani pro network chyby,
- banner a centralni offline toast uz neslibuji garantovanou automatickou synchronizaci,
- je zapsane minimalni offline minimum: cache muze drzet drive nactena data, ale write akce je po navratu site potreba manualne overit.

Co jeste chybi:

- pokud bude davat smysl, pridat jednoduchou queue pro vybrane akce,
- otestovat vypnuti site a navrat site na realnem telefonu.

Definition of done:

- appka neklame uzivatele zavadejicimi texty,
- pri slabsim pripojeni je porad citelna a rozumna,
- po obnoveni site je jasne, co se povedlo a co ne.

Odhad: M
Riziko bez toho: Stredni az vysoke

### 5.7 Mobilni QA pass na realnem zarizeni

Proc:
Rodina bude appku casto pouzivat z telefonu. DevTools nestaci.

Co je uz hotove:

- mobilni shell je pouzitelny,
- admin/statistiky jsou pristupne i na mobilu,
- existuje mobile QA checklist.

Co jeste chybi:

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

- leave cabin flow v UI nad uz hotovym backend/API endpointem,
- dotazeni drobnych admin akci,
- lepsi nastaveni chaty podle realne zpetne vazby.

Odhad: S
Riziko bez toho: Nizke az stredni

### 6.3 Testy a CI preflight

Proc:
Po prvnim pusteni rodine zacne bolet kazda regrese po male zmene. Tohle je stale skutecna implementacni mezera, ne jen overeni.

Doporuceny vystup:

- frontend testy pro nejkritictejsi flow,
- aspon zakladni backend smoke testy,
- workflow uz ma test + build gate pred deployem,
- dalsi krok je doplnit backend smoke testy a rozsirit kryti nad nejkritictejsi use cases.

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

## 8. Doporucene poradi implementace a overeni

Nejrozumnejsi poradi je:

1. Opravit standardni deploy auth na VPS
2. Potvrdit produkcni backup artefakty a restore z produkcni zalohy
3. Dokoncit produkcni e-mail E2E overeni vcetne superadmin create-user flow
4. Otestovat verify, invite a reset hesla end-to-end
5. Zapnout externi monitoring a alerting
6. Udelat rodinny smoke rehearsal
7. Dodelat zakladni rezervacni notifikace
8. Dotahnout offline/PWA pravdivost a mobilni QA
9. Dodelat realtime a drobny self-service polish
10. Rozsirit testy a backend smoke nad novou CI preflight gate

## 9. Minimalni go-live podminky pro rodinu

Appku bych pustil rodine naplno az ve chvili, kdy budou splnene tyto podminky:

- standardni produkcni deploy funguje bez manualniho kopirovani souboru,
- existuje funkcni a overeny produkcni backup,
- registrace nebo invite projdou bez rucniho zasahu,
- verify a reset hesla funguje na produkcni domene,
- pri vypadku vite, ze aplikace nejede,
- admin umi dostat dalsiho clena do appky bez vysvetlovani,
- na telefonu jsou overene rezervace, shopping, chat, admin a upload fotek,
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

- opravit standardni deploy auth na VPS,
- potvrdit produkcni backup artefakty a jednou zkusit restore z realne zalohy,
- dokoncit produkcni e-mail E2E overeni vcetne superadmin onboarding cesty,
- otestovat verify, invite a reset hesla,
- zapnout externi monitoring,
- udelat rodinny smoke rehearsal.

### Dalsi sprint

- zakladni rezervacni notifikace,
- offline/PWA pravdivost,
- mobilni QA pass a drobny polish backlog.

### Sprint po spusteni

- realtime refresh,
- drobne admin self-service veci,
- testy a CI preflight.

---

Pokud budete chtit, navazujici dokument by mel byt:

- implementacni checklist pro fazi 0,
- nebo konkretni vikendovy plan po dnech a blocich.