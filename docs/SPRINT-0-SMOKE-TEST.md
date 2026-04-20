# Sprint 0 Smoke Test

Smoke-test script pro post-deploy kontrolu nejdulezitejsich flows: `login`, `registrace`, `verify`, `invite` a `admin shopping`.

## Kratky operational smoke pred rucnim E2E

Nez otevres browser profily, udelej nejdriv rychly operational check:

```powershell
.\manual-post-deploy-smoke-check.ps1
```

Fast smoke ma potvrdit toto minimum:

- PM2 proces `chata-app` je `online`,
- lokalni `GET /api/health` vraci `status = ok`,
- verejny web odpovida,
- verejny health endpoint odpovida.

Kdyz tohle neprojde, nema smysl pokracovat do manualnich funkcich scenaru. Nejdv otevri `docs/OPERATIONS-RUNBOOK.md` a vyres operational problem.

## Jak testovat

- Pouzij dva browser profily.
- Profil A: novy admin.
- Profil B: anonymni okno nebo druhy profil pro pozvaneho clena.
- U novych uctu pouzivej casovy suffix v username a e-mailu, at nenarazis na duplicity.

## Scenare

1. Auth vstup a prepnuti na registraci
Predpoklady: Cista session, nikdo neni prihlaseny.
Kroky: Otevri `/login`. Over nadpis prihlaseni. Klikni na registraci.
Ocekavany vysledek: Zobrazi se registracni formular bez 404, prazdne stranky nebo nekonecneho spinneru.
Jak poznat fail: Formular se neprepne nebo appka spadne.

2. Registrace nove chaty a admin uctu
Predpoklady: Unikatni nazev chaty, username a dorucitelny e-mail.
Kroky: Vypln nazev chaty, lokaci, username, e-mail, heslo, barvu a odesli formular.
Ocekavany vysledek: Zobrazi se stav s instrukci zkontrolovat e-mail. Ucet jeste neni automaticky prihlaseny.
Jak poznat fail: Validni data vrati obecnou chybu nebo aplikace preskoci rovnou na dashboard.

3. Login je pred verify zablokovany
Predpoklady: Ucet z predchoziho kroku jeste neni overeny.
Kroky: Zkus se prihlasit novym jmenem a heslem.
Ocekavany vysledek: Appka zustane na auth obrazovce a zobrazi hlasku, ze je nejdriv potreba overit e-mail.
Jak poznat fail: Ucet pusti uzivatele do dashboardu nebo vrati nejasnou chybu.

4. Verify link z e-mailu funguje end-to-end
Predpoklady: Doruceny registracni e-mail s tokenem.
Kroky: Otevri aktivacni odkaz z e-mailu.
Ocekavany vysledek: Kratky loading a potom stav `Overeni uspesne` s tlacitkem pro prihlaseni.
Jak poznat fail: Zobrazi se `Overeni selhalo`, `Chybi overovaci odkaz` nebo loading nikdy neskonci.

5. Overeny admin login
Predpoklady: Ucet je po verify aktivni.
Kroky: Prihlas se pres `/login` a po nacteni dashboardu proved refresh.
Ocekavany vysledek: Uspesny redirect na `/dashboard` a session prezije refresh.
Jak poznat fail: Redirect loop, okamzity logout nebo prazdny shell aplikace.

6. Admin vytvori invite v Admin panelu
Predpoklady: Profil A je prihlaseny jako admin.
Kroky: Otevri `/admin`, najdi sekci Pozvanky, vytvor pozvanku s roli clen a zkopiruj link.
Ocekavany vysledek: V seznamu aktivnich pozvanek pribude novy radek s roli, expiraci a pouzitelnym linkem obsahujicim `/invite/`.
Jak poznat fail: Sekce chybi, vytvoreni vrati chybu nebo kopirovani nic neudela.

7. Invite landing page nacita spravna data
Predpoklady: Cerstvy invite link a Profil B bez session.
Kroky: Otevri invite URL v Profilu B.
Ocekavany vysledek: Zobrazi se stranka pozvanky s nazvem chaty, zvoucim uzivatelem, roli a CTA pro pokracovani.
Jak poznat fail: Cerstvy link skonci jako neplatny nebo hodi uzivatele jinam.

8. Prijeti invite vytvori clena a rovnou ho prihlasi
Predpoklady: Validni invite URL v Profilu B.
Kroky: Klikni na pokracovat, vypln profil pozvaneho clena a odesli formular.
Ocekavany vysledek: Ucet se vytvori, clen je automaticky prihlasen a skonci na `/dashboard` stejne chaty.
Jak poznat fail: Uzivatel zustane bez session, dostane 500 nebo neskonci v aplikaci.

9. Pozvany clen vytvori shopping list a polozku
Predpoklady: Profil B je prihlaseny jako novy clen.
Kroky: Otevri `/shopping`, vytvor novy seznam a pridej jednu polozku. Potom refreshni stranku.
Ocekavany vysledek: Seznam i polozka zustanou zachovane i po refreshi.
Jak poznat fail: Data po refreshi zmizi nebo se objevi permission chyba.

10. Admin vidi shopping list vytvoreny clenem
Predpoklady: V Profilu B uz existuje shopping list s polozkou. Profil A je admin.
Kroky: V Profilu A otevri `/shopping` a najdi list vytvoreny clenem.
Ocekavany vysledek: Admin list vidi, muze ho otevrit a obsah sedi s daty z Profilu B.
Jak poznat fail: Data se mezi profily neshoduji nebo admin list nevidi.

11. Admin zvladne cizi shopping list prejmenovat a smazat
Predpoklady: Profil A ma otevreny memberuv shopping list.
Kroky: Prejmenuj seznam, pak ho smaz a nakonec refreshni Profil A i Profil B.
Ocekavany vysledek: Prejmenovani i smazani se propise v obou profilech bez permission chyby.
Jak poznat fail: Nazev se po refreshi vrati, mazani se nepropise nebo list zmizi jen jednomu uzivateli.

12. Zrusena pozvanka je opravdu neplatna
Predpoklady: Admin v Profilu A umi vytvorit druhou pozvanku.
Kroky: Vytvor druhy invite, zkopiruj link, invite hned zrus a otevri jeho URL v Profilu B.
Ocekavany vysledek: Link uz nepusti do onboardingu a zobrazi neplatnou pozvanku.
Jak poznat fail: Zruseny link stale dovoli registraci.

## Minimalni post-deploy subset

Pokud je cas jen na minimum, proved po uspesnem operational smoke vzdy scenare `2`, `4`, `5`, `8` a `11`.