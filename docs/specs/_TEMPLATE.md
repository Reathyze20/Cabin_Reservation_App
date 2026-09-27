# <issue> – <Název funkce>

Stav: draft | ready | in-progress | done · Issue: #<číslo> · ADR: (pokud vzniklo)

## 1. Proč (problém rodiny)
Jedna až tři věty. Kdo má problém a jak ho dnes řeší.

## 2. User stories
- Jako <správce chaty | člen rodiny | host> chci <akce>, abych <přínos>.

## 3. Akceptační kritéria (Given/When/Then) – každé = aspoň 1 test
AC-1
  Given <výchozí stav>
  When <akce>
  Then <pozorovatelný výsledek>

## 4. Okrajové případy
- Překrývající se rezervace, zrušení, časová pásma/DST, prázdné stavy, souběh dvou uživatelů, offline (PWA)…

## 5. Tenant & bezpečnost
- Která data jsou vázaná na `cabinId`? Kdo (role) smí číst/zapisovat?
- Nový endpoint / Socket.IO event → jak se ověřuje příslušnost k chatě?
- Osobní údaje (GDPR): jaká, proč, retence, export/smazání?
- Rizika: IDOR, eskalace role, únik přes Socket.IO room, upload souborů?

## 6. Datový model a migrace
- Změny schématu. Je migrace aditivní (expand)? Bude později potřeba contract krok? (viz `docs/SDLC.md` §6)

## 7. UI
- Nové obrazovky, mobilní layout, texty.

## 8. Test plán
- Unit: … · Integrační (reálná DB): … · Tenant isolation: … · E2E: jen kritická cesta

## 9. Mimo rozsah
- Co tato funkce výslovně NEDĚLÁ.

## 10. Plán (vyplní AI v plan mode)
- Dotčené soubory, rizika, rozpad na PR (≤ 400 řádků každý).

## 11. Ověření end-to-end
- Jeden konkrétní scénář, kterým se prokáže, že funkce funguje.
