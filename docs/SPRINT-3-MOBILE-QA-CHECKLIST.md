# Sprint 3 Mobile QA Checklist

Manualni regression checklist pro viewporty `320px` a `375px` po mobilnich upravach ve `frontend-v2`.

## Jak pouzit

- Kazdy scenar proved nejdriv na `320px`, pak hned zopakuj na `375px`.
- Sleduj hlavne horizontalni overflow, prekryvani fixed prvku a velikost tap targetu.
- Pokud scenar selze, zapis route, viewport, presne kroky a screenshot.

## Scenare

1. Rezervace: kalendar bez horizontalniho scrollu
Kde: `/reservations`
Kroky: Otevri Rezervace, prepni 2 az 3 mesice sipkami, projezd prstem po sirce karty i cele stranky.
Ocekavany vysledek: Zadny bocni posun stranky ani karty, 7 sloupcu zustane citelnych, sipky jsou pohodlne trefitelne.
Proc je to rizikove: Mobilni kalendar byl prekopan z min-width layoutu na viewport-fit grid.

2. Rezervace: den -> rozsah -> volba typu
Kde: `/reservations`
Kroky: Klepni jednou na budoucí den, podruhe na stejny den, potreti na pozdejsi den. Zavri otevreny modal pres X i backdrop.
Ocekavany vysledek: Prvni tap jen vybere den, druhy tap zahaji vyber pobytu, treti tap otevre modal s volbou. Po zavreni nic nezustane v nekonzistentnim stavu.
Proc je to rizikove: Tap-flow je nove dvoukrokovy a zavisi na kombinaci `selectedDay` a `rangeStart`.

3. Rezervace: sidebar, month picker a CTA
Kde: `/reservations`
Kroky: Otevri detail rezervace, vrat se, otevri month picker v pravem panelu, zmen mesic a doscrolluj k mesicni poznamce a CTA.
Ocekavany vysledek: Picker se vejde do viewportu, filtr dne se pri zmene mesice resetuje a CTA neni schovane pod spodni navigaci.
Proc je to rizikove: Pravy panel se na mobilu stackuje a ma vlastni scroll chovani.

4. Notes: seznam temat <-> chat bez rozbite vysky
Kde: `/notes`
Kroky: Otevri tema, scrollni chat, vrat se zpet do seznamu a pak odejdi na jinou routu a vrat se znovu.
Ocekavany vysledek: Nevznika prazdna plocha ani dvojity scroll a po odchodu z Notes nezustane stranka zaseknuta bez scrollu.
Proc je to rizikove: Notes pouziva `body.page-notes` a vlastni mobile-only overflow kontrakt.

5. Notes: composer, reply preview a odjezdovy protokol
Kde: `/notes`
Kroky: Spust odpoved na zpravu, otevri Odjezdovy protokol, prepni checkboxy, vloz ho do zpravy a dopis vlastni text.
Ocekavany vysledek: Reply preview i handover panel zustavaji nad inputem a tlacitko Odeslat je porad viditelne a pouzitelne.
Proc je to rizikove: Kombinuje se auto-resize textarea, safe-area padding a rozbalovaci panel nad patou chatu.

6. Notes: context menu a navazane dialogy
Kde: `/notes`
Kroky: Otevri message context menu, zkus akci Pridat do nakupu nebo Vytvorit ukol, pak otevri Nove tema a potvrzovaci dialog smazani.
Ocekavany vysledek: Menu ani modaly nejsou useknute, akce maji pohodlne tap targety a footer modalniho sheetu je full-width.
Proc je to rizikove: Notes ma vlastni mobilni context menu a navazuje na shared modal vrstvu.

7. Shopping: master/detail prepinani
Kde: `/shopping`
Kroky: Otevri seznam z prehledu, pouzij Zpet, otevri modal Novy seznam a znovu vyber detail.
Ocekavany vysledek: Master panel na mobilu mizi jen pri otevrenem detailu a po navratu nevznika prazdne misto.
Proc je to rizikove: Layout stoji na kombinaci `mobileDetailOpen` a mobile CSS prepinacu.

8. Shopping pantry: sticky header a filtry
Kde: `/shopping` -> `Zasoby`
Kroky: Prejdi na Zasoby, horizontalne projezd filter chips, otevri Pridat zasobu. Na `375px` zkontroluj 2 sloupce, na `320px` pad do 1 sloupce.
Ocekavany vysledek: Chips jsou klikatelne, sticky header neodskakuje a formular se nerozbije nad spodni navigaci.
Proc je to rizikove: Pantry ma nejvic mobile-only CSS, vcetne sticky headeru a extra-small breakpointu.

9. Galerie: toolbar, hledani, selection mode a pagination
Kde: `/gallery`
Kroky: Fokusni hledani, zmen razeni, otevri album, zapni vyber a pokud je vic fotek, projezd pagination.
Ocekavany vysledek: Toolbar i pagination jsou na mobilu pohodlne scrollovatelne, fokus v hledani neodstrelí ostatni akce mimo viewport.
Proc je to rizikove: Toolbar i pagination byly nedavno prevedene na horizontalne scrollovatelny mobilni rezim.

10. Galerie: lightbox overlay
Kde: `/gallery`
Kroky: Otevri fotku, nech schovat ovladani a znovu je vyvolej tapem. Vyzkousej zavreni, dalsi fotku a pridani vzpominky.
Ocekavany vysledek: Ovládání zustane uvnitr viewportu, scroll pod lightboxem je zamceny a po zavreni se vratis na stejne misto.
Proc je to rizikove: Fullscreen overlay kombinuje autohide controls a body scroll lock.

11. Denik: vstup do dne a notebook modal
Kde: `/diary`
Kroky: Prepni period filter, otevri pobyt, klikni do konkretniho dne, otevri Fotky a vrat se, pak prepinaj predchozi/dalsi den.
Ocekavany vysledek: Hlavička ani footer se neskladaji pres sebe a modalni pata zustava full-width a citelna.
Proc je to rizikove: Diary kombinuje responsive grid, scrollovatelne filtry a mobilne prekladany notebook footer.

12. Login a registrace: inputy, eye toggle, swatches a error block
Kde: `/login`, `/register`
Kroky: Vyvolej chybu submitu, prepni zobrazeni hesla, klikni na Zapamatovat si me, na registraci projezd barevne swatches a over validacni chyby.
Ocekavany vysledek: Bez horizontalniho scrollu, inputy drzi 44px vysku, eye toggle neleze do textu a error block nepretahuje kartu pres viewport.
Proc je to rizikove: Auth karta ma mobilni prepocet rozmeru a nove hit areas pro toggle i checkbox.

13. Shared modal baseline
Kde: Notes, Shopping, Galerie, potvrzovaci dialogy
Kroky: Otevri tri reprezentativni modaly a porovnej zavirani, scroll a poradi CTA.
Ocekavany vysledek: Pod `640px` se vse chova jako spodní sheet, footer akce jsou full-width a primary CTA je dole u palce.
Proc je to rizikove: Shared modal ma mobilni `column-reverse` footer a specialni layout i pro vnoreny obsah.

14. Mobile header, bottom nav a profile drawer
Kde: libovolna prihlasena stranka
Kroky: Otevri profile drawer z avataru, scrollni ho, zavri ho backdropem a pak proklikej 4 az 5 polozek spodní navigace.
Ocekavany vysledek: Header i bottom nav drzi pozici bez prekryvani obsahu a drawer se vraci do cisteho stavu.
Proc je to rizikove: Mobilni shell kombinuje fixed header, fixed bottom nav a bottom-sheet drawer.

## Release smoke subset

Pokud je cas jen na minimum, udelej vzdy scenare `1`, `2`, `4`, `7` a `13`.