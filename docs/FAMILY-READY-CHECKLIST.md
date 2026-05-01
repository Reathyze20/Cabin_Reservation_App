# Family-Ready Checklist

Prakticky odskrtavaci seznam pro dokonceni aplikace do stavu, kdy ji lze spolehlive pouzivat jednou rodinou.

Navazuje na [FAMILY-READY-PLAN.md](FAMILY-READY-PLAN.md), ale je zamerne kratsi, operativni a orientovany na vykonani.

Poznamka k odskrtavani:

- `[x]` = potvrzeno v repu nebo v navazujici dokumentaci.
- `[ ]` = chybi implementace, produkcni deploy nebo rucni E2E overeni.

## Aktualni stav k 2026-05-01

- ✅ V repo je hotovy zaklad pro backupy a restore: `backupManager`, retence, cron installer a runbook.
- ✅ Backup a restore probehly uspesne i v docasnem test prostredi pres `npm run backup:smoke`.
- ✅ V repo je pripraveny operational balik pro monitoring minimum: `/api/health`, PM2 log rotate installer, fast post-deploy smoke check a incident runbook.
- ✅ V repo je hotovy password recovery flow v backendu i `frontend-v2`, vcetne rate limitu a reset odkazu.
- ✅ V dashboardu je hotovy activation checklist pro prvniho admina s CTA na pozvanky, rezervace a nakupni seznam.
- ✅ V admin rozhrani je hotove invite UX pro odeslani pozvanky e-mailem a zkopirovani hotove zpravy pro WhatsApp nebo SMS.
- ✅ Auth enforcement je v repo dotazeny pro blokovane ucty: login i protected requesty se opiraji o aktualni stav uzivatele v DB a frontend umi blokovanou relaci okamzite shodit.
- ⚠️ Zakladni rezervacni notifikace jsou jen parcialni: existuje watcher flow pro zruseni rezervace pres notes, ale ne cele minimum pro novou a upravenou rezervaci.
- ⚠️ Frontend uz ma PWA plugin, offline banner a offline-aware mutation handling, ale stale chybi audit pravdivosti textu a realny offline rehearsal.
- ⚠️ Pro rucni overeni uz existuji podklady: [SPRINT-0-SMOKE-TEST.md](SPRINT-0-SMOKE-TEST.md), [SPRINT-3-MOBILE-QA-CHECKLIST.md](SPRINT-3-MOBILE-QA-CHECKLIST.md), [OPERATIONS-RUNBOOK.md](OPERATIONS-RUNBOOK.md), ale produkcni E2E kroky zatim nejsou odskrtnute.
- ❌ Nejblizsi prakticky sled zustava: produkcni backup + monitoring, produkcni e-mail E2E, potom rodinny rehearsal.

---

## Faze 0 - Kriticke blokery

### Backup a obnova dat

- [x] Navrhnout backup strategii pro PostgreSQL databazi.
- [x] Navrhnout backup strategii pro `data/uploads` a thumbnaily.
- [ ] Nastavit automaticky denni backup databaze na serveru.
- [ ] Nastavit automaticky denni backup uploadu na serveru.
- [x] Pridat opakovatelny smoke test backup + restore v docasnem test prostredi.
- [ ] Nasadit verzi s auto-install backup cronem a overit prvni seed backup.
- [x] Nastavit retenci zaloh alespon na 7-30 dni.
- [x] Zapsat kratky restore runbook do docs.
- [x] Otestovat obnovu DB ze zalohy do test prostredi.
- [x] Otestovat obnovu uploadu ze zalohy.

Podklad: [BACKUP-AND-RESTORE.md](BACKUP-AND-RESTORE.md)

Definition of done:

- [ ] Existuje funkcni automaticky backup DB.
- [ ] Existuje funkcni automaticky backup uploadu.
- [x] Obnova byla aspon jednou realne otestovana.

### Produkcni e-mail flow

- [ ] Zkontrolovat produkcni `.env` pro SMTP nastaveni.
- [ ] Zkontrolovat `FRONTEND_URL` a `EMAIL_FROM`.
- [ ] Otestovat registraci noveho uzivatele na produkci.
- [ ] Otestovat doruceni verifikacniho e-mailu.
- [ ] Otestovat otevreni verifikacniho odkazu v prohlizeci.
- [ ] Otestovat vytvoreni invite linku adminem.
- [ ] Otestovat prijeti pozvanky novym clenem.
- [ ] Zapsat fallback postup pro pripad, ze e-mail nedorazi.

Definition of done:

- [ ] Registrace, verifikace i pozvanky fungují end-to-end.
- [ ] E-maily vedou na spravne produkcni URL.

### Monitoring a alerting minimum

- [x] V repo existuje health endpoint, operational smoke helper a PM2 logrotate installer.
- [ ] Zapnout uptime monitoring na hlavni web.
- [ ] Zapnout uptime monitoring na API health endpoint.
- [ ] Nastavit alert pri nedostupnosti.
- [ ] Po dalsim deployi spustit `./manual-install-pm2-logrotate.ps1`.
- [ ] Overit, ze PM2 logy nerostou bez omezeni.
- [ ] Nastavit nebo potvrdit log rotation.
- [x] Dopsat kratky post-deploy smoke check.
- [x] Dopsat kratky incident postup: co zkontrolovat kdyz appka nejede.

Podklad: [OPERATIONS-RUNBOOK.md](OPERATIONS-RUNBOOK.md)

Definition of done:

- [ ] O vypadku se dozvite automaticky.
- [ ] Logy nezaplni disk bez kontroly.

### Rodinny rehearsal

- [x] Existuje manualni smoke-test a mobilni QA checklist jako podklad pro rehearsal.
- [ ] Provest scenar admin + pozvany clen.
- [ ] Otestovat flow na desktopu.
- [ ] Otestovat flow na telefonu.
- [ ] Vytvorit rezervaci.
- [ ] Upravit nebo smazat rezervaci.
- [ ] Zalozit shopping list a pridat polozky.
- [ ] Poslat zpravu do chatu.
- [ ] Nahrat fotku do galerie.
- [ ] Vytvorit zaznam v deniku nebo overit jeho zalozeni.
- [ ] Vyzkouset admin akce pro clena rodiny.
- [ ] Zapsat posledni nalezene chyby nebo potvrdit readiness.

Podklady: [SPRINT-0-SMOKE-TEST.md](SPRINT-0-SMOKE-TEST.md) a [SPRINT-3-MOBILE-QA-CHECKLIST.md](SPRINT-3-MOBILE-QA-CHECKLIST.md)

Definition of done:

- [ ] Cely rodinny scenar projde bez blockeru.
- [ ] Existuje seznam poslednich drobnych oprav.

---

## Faze 1 - Nutne pred ostrym provozem

### Password recovery

- [x] Navrhnout reset hesla pres e-mail token.
- [x] Pridat backend endpoint pro vystaveni reset tokenu.
- [x] Pridat backend endpoint pro potvrzeni noveho hesla.
- [x] Pridat expiraci reset tokenu.
- [x] Pridat stranku nebo modal Zapomenute heslo na loginu.
- [x] Pridat reset hesla pres odkaz z e-mailu.
- [ ] Otestovat uspesny reset hesla.
- [ ] Otestovat expirovany nebo neplatny token.

Definition of done:

- [ ] Uzivatel si umi sam obnovit pristup bez zasahu admina nebo developera.

### Aktivace prvniho admina po zalozeni chaty

- [x] Navrhnout uvodni checklist pro novou chatu.
- [x] Pridat CTA pro pozvani prvniho clena.
- [x] Pridat CTA pro vytvoreni prvni rezervace.
- [x] Pridat CTA pro zalozeni prvniho shopping listu.
- [x] Rozhodnout, kdy se onboarding checklist schova.
- [ ] Otestovat flow prvniho admina po registraci.

Definition of done:

- [ ] Novy admin po prvnim loginu presne vidi, co ma udelat dal.

### Invite UX

- [x] Pridat akci odeslat pozvanku e-mailem z admin rozhrani.
- [x] Pridat akci zkopirovat text pozvanky pro WhatsApp nebo SMS.
- [x] Zobrazit jasne stavy pozvanek: aktivni, prijata, expirovana.
- [ ] Otestovat admin flow bez manualniho skladani zprav.

Definition of done:

- [ ] Admin dostane noveho clena do aplikace do 1 minuty.

### Zakladni notifikace

- [x] Existuje minimalni watcher notifikace pri zruseni rezervace pres notes.
- [ ] Rozhodnout minimum notifikaci pro rodinu.
- [ ] Pridat notifikaci pri nove rezervaci.
- [ ] Pridat notifikaci pri zruseni nebo uprave rezervace.
- [ ] Overit texty a doruceni notifikaci.
- [ ] Omezit hluk tak, aby notifikace nebyly otravne.

Definition of done:

- [ ] Rodina se dozvi o dulezitych rezervacnich zmenach bez manualni kontroly aplikace.

### Auth enforcement cleanup

- [x] Overit, ze zablokovany uzivatel neprojde login flow.
- [x] Zapojit banned middleware tam, kde ma byt.
- [x] Sjednotit heslova pravidla napric auth flow.
- [ ] Otestovat verify, login, logout a edge case scenare.

Definition of done:

- [ ] Stav uctu je vynucovany konzistentne v backendu i frontendu.

### Offline a PWA pravdivost

- [x] Repo uz ma PWA plugin, offline banner a offline-aware toasty pro sitove chyby.
- [ ] Projit texty a UX kolem offline stavu.
- [ ] Odstranit zavadejici tvrzeni o automaticke synchronizaci tam, kde neni garantovana.
- [ ] Rozhodnout minimum offline podpory pro klicove obrazovky.
- [ ] Otestovat chovani pri vypnuti site.
- [ ] Otestovat navrat site po neuspesne akci.

Definition of done:

- [ ] Offline chovani je srozumitelne a neklame uzivatele.

### Mobilni QA pass

- [x] Existuje manualni mobile QA checklist pro nejrizikovejsi flow.
- [ ] Otestovat rezervace na telefonu.
- [ ] Otestovat shopping na telefonu.
- [ ] Otestovat chat na telefonu.
- [ ] Otestovat upload fotek na telefonu.
- [ ] Otestovat admin a profile drawer na telefonu.
- [ ] Zapsat drobne UX opravy do maleho backlogu.

Podklad: [SPRINT-3-MOBILE-QA-CHECKLIST.md](SPRINT-3-MOBILE-QA-CHECKLIST.md)

Definition of done:

- [ ] Nejdulezitejsi flow jsou pohodlne pouzitelne prstem na realnem zarizeni.

---

## Faze 2 - Kratce po spusteni

### Realtime a refresh

- [ ] Rozhodnout, ktere udalosti maji byt realtime.
- [ ] Napojit chat na realtime nebo okamzitou invalidaci.
- [ ] Napojit rezervace na lepsi refresh po zmene.
- [ ] Otestovat, ze uzivatele nemusi rucne reloadovat stranku.

### Drobne self-service zlepseni

- [ ] Pridat nebo dokoncit leave cabin flow v UI.
- [ ] Dodelat drobne admin akce podle zpetne vazby rodiny.
- [ ] Dodelat drobna nastaveni chaty podle realneho pouzivani.

### Testy a CI preflight

- [ ] Vybrat 3-5 nejkritictejsich flow pro automatizaci.
- [ ] Dopsat frontend testy pro kriticke use cases.
- [ ] Dopsat aspon zakladni backend smoke testy.
- [ ] Pridat test krok pred deploy.
- [ ] Pridat build krok pred deploy pokud jeste neni vynuceny v workflow dostatecne brzy.

Definition of done:

- [ ] Zakladni regrese zachyti CI jeste pred nasazenim.

---

## Faze 3 - Pozdeji

Tyto body nejsou potreba pro jednu rodinu, ale jsou vhodne do dalsi etapy.

- [ ] In-app notification centrum.
- [ ] Weekly digest nebo souhrnne e-maily.
- [ ] Audit trail admin akci.
- [ ] Rozsireny superadmin backoffice.
- [ ] Billing a pricing enforcement.
- [ ] Analytics a funnel tracking.
- [ ] SEO a verejny launch polish.
- [ ] Multi-cabin komercni model.

---

## Minimalni go-live checklist pro rodinu

Tuhle sekci muzes pouzit jako posledni stop-check pred ostrym nasazenim do rodiny.

- [ ] Existuje funkcni backup DB.
- [ ] Existuje funkcni backup uploadu.
- [x] Obnova ze zalohy byla realne otestovana.
- [ ] Registrace nebo invite flow projde bez manualni pomoci.
- [ ] Verify e-mail funguje na produkcni domene.
- [ ] Monitoring hlida web i API.
- [ ] Pri vypadku prijde alert.
- [ ] Zapomenute heslo jde vyresit bez zasahu do databaze.
- [ ] Prvni admin po registraci vidi jasne dalsi kroky.
- [ ] Admin umi snadno pozvat dalsiho clena.
- [ ] Rodina se dozvi o dulezitych rezervacnich zmenach.
- [ ] Offline chovani je pravdive a srozumitelne.
- [ ] Mobilni flow byly overene na realnem telefonu.
- [ ] Probehl jeden cely rehearsal scenar admin + clen.
- [ ] Posledni blocker list je prazdny nebo obsahuje jen drobny polish.

---

## Doporucene poradi prace

- [ ] 1. Backup DB a uploadu
- [ ] 2. Produkcni e-mail flow
- [ ] 3. Monitoring a alerting minimum
- [ ] 4. Rodinny rehearsal
- [ ] 5. Password recovery (implementace hotova, chybi E2E)
- [ ] 6. Aktivace prvniho admina (implementace hotova, chybi overeni po registraci)
- [ ] 7. Invite UX (implementace hotova, chybi admin + invite E2E)
- [ ] 8. Zakladni notifikace (zatim jen watcher notifikace pri zruseni)
- [ ] 9. Auth enforcement cleanup (implementace hotova, chybi edge-case smoke)
- [ ] 10. Offline/PWA pravdivost (infra v repo je, chybi audit textu a realny offline test)
- [ ] 11. Mobilni QA pass (checklist je pripraven, chybi real device run)
- [ ] 12. Realtime a testy
