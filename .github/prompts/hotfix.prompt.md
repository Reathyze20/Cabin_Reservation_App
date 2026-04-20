---
name: hotfix
description: Deliver a minimal, safe hotfix for a bug, regression, broken build, failing route, broken UI, deploy issue, or production problem in this repository. Use when the user says rychle oprav, hotfix, bug, regrese, rozbite, nefunguje, pada to, fixni to, nebo potrebuje nejkratsi cestu k oprave.
agent: "Team-Lead"
argument-hint: "Popis bugu, regrese nebo produkcniho problemu k rychle oprave"
---

Proved nejmensi bezpecny hotfix, ktery vrati funkcnost bez zbytecneho rozsirovani scope.

Pokud je problem primarne v deploy pipeline, PM2, serveru, GitHub Actions nebo produkcnim incidentu, preferuj prompt `deploy-incident`.

Pracuj takto:

1. Zamer se na root cause, ale drsne omez scope jen na to, co je nutne pro opravu.
2. Nejdriv rychle zjisti impacted files, error surface a aktualni breakage. Nepis dlouhy plan, pokud nejde o vetsi incident.
3. Kdyz existuje jasny podobny pattern v repu, zkopiruj osvedceny pristup misto vymysleni nove abstrakce.
4. Neprovadej zbytecny redesign, refaktor nebo cleanup mimo bezprostredni problem.
5. Pokud je chyba ve frontend-v2, over frontend build. Pokud je chyba v backendu nebo sdilenych typech, over `npx tsc --noEmit`. Pri produkcnim nebo deploy problemu vypis i bezpecnou operational poznamku.
6. Kdyz narazis na souvisejici kriticky bug, oprav ho jen pokud je primo na stejne trase selhani. Jinak ho pouze kratce zaznamenej.
7. Finalni odpoved ma byt maximalne prakticka: co bylo rozbite, co jsem opravil, co jsem overil, co dal zkontrolovat po nasazeni.

Priorita rozhodovani:

- Obnovit funkcnost
- Neminimalizovat bezpecnost ani tenant izolaci
- Udrzet diff co nejmensi

Hotfix neni prostor pro velkou prestavbu. Oprav, over a uzavri.