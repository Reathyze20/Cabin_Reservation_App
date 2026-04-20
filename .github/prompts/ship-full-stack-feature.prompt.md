---
name: ship-full-stack-feature
description: Build a full-stack feature end-to-end across database, backend API, frontend-v2 UI, hooks, routes, and integration points in this repository. Use when the user wants a whole feature, novy modul, end-to-end implementaci, od DB po UI, kompletni flow, nebo zmenu ktera spanuje schema, backend i frontend.
agent: "Team-Lead"
argument-hint: "Popis full-stack feature nebo modulu k implementaci napric databazi, backendem a frontendem"
---

Proved full-stack implementaci napric databazi, backendem a frontendem jako build-first task.

Pracuj takto:

1. Ber request jako end-to-end delivery. Neskoncuj u navrhu, pokud uzivatel vyslovene nechce jen analyzu.
2. Nejdřív si nacti `memories/repo/stack-facts.md`, `docs/AI-INFRASTRUCTURE-REGISTRY.md` a pri vetsi zmene i `memories/repo/app-knowledge-base.md`.
3. Pokud se task dotkne `frontend-v2/`, povinne nacti `.agents/skills/CabinSaaS_Architect/SKILL.md`.
4. Rozdel praci explicitne alespon na tyto casti: data model a migrace, backend API a validace, frontend klient a hooks, UI/route wiring, verification.
5. Kdyz meniš schema nebo API kontrakt, povazuj opravu vsech navaznych consumeru za soucast tasku. Nenech polorozbitou feature, kde backend vraci neco jineho nez frontend ocekava.
6. Vsechny tenant-scoped cesty a dotazy drz pres `cabinId`. Nepouzivej starsi tenant naming ani globalni SELECT bez filtru.
7. U backendu dodrz auth, Zod validaci, try/catch, ownership check a srozumitelne ceske error messages. U frontendu implementuj loading, error a empty state a mobile usability od 320px.
8. Pouzij todo list u vseho, co zasahuje vic vrstev nebo vic nez par souboru.
9. Overeni je povinne: `get_errors`, `npx tsc --noEmit` a pokud se menil `frontend-v2/`, i `cd frontend-v2 && npx tsc --noEmit && npm run build`.
10. Pokud je v repu migration drift, vol bezpecnou additive strategii a deploy dopad popis konkretne, ne obecne.
11. Finalni odpoved ma byt kratka a orientovana na shipping: co bylo postaveno, co bylo overeno, co zbyva po nasazeni zkontrolovat.

Priorita rozhodovani:

- Funkcni feature napric vsemi vrstvami
- Konzistentni API kontrakt a tenant izolace
- UX pouzitelnost a edge cases
- Verifikace a deploy dopad

Tento prompt pouzij, kdyz by rozdeleni na izolovany backend nebo frontend prompt vedlo k polovicnimu vysledku.