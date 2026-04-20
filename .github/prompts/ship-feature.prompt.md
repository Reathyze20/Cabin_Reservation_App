---
name: ship-feature
description: Build a feature, bugfix, refactor, endpoint, page, or module end-to-end in this repository. Use when the user says implementuj, udelej, vytvor, postav, oprav, dodelat, refaktoruj, nebo chce aby AI skutecne provedla zmeny misto dalsiho planovani.
agent: "Team-Lead"
argument-hint: "Popis feature, bugfixu, refaktoru nebo modulu k implementaci"
---

Proved end-to-end implementaci v tomto repozitari.

Kdyz je task jednoznacne frontendovy, backendovy, full-stack napric DB/API/UI, deploy/production nebo jde o maly urgentni fix, preferuj specializovane prompty `ship-frontend-feature`, `ship-backend-feature`, `ship-full-stack-feature`, `deploy-incident` nebo `hotfix`.

Pracuj takto:

1. Ber request jako build-first task. Pokud uzivatel vyslovene nezada jen brainstorming nebo review, nezustavej u navrhu a udelej realne zmeny v kodu.
2. Nejdriv si nacti kanonicke zdroje `memories/repo/stack-facts.md` a `docs/AI-INFRASTRUCTURE-REGISTRY.md` a pri vetsi zmene i `memories/repo/app-knowledge-base.md`.
3. Pokud se task dotkne `frontend-v2/`, povinne nacti `.agents/skills/CabinSaaS_Architect/SKILL.md` pred dalsi praci.
4. Pokud se task dotkne backendu, drz se `src/backend/`, `src/validators/`, `prisma/schema.prisma` a aktualnich backend instructions. Pouzivej `cabinId`, ne starsi tenant naming.
5. Zeptej se maximalne jednu blokujici otazku. Jinak inferuj rozumny MVP scope a pokracuj.
6. Projdi loop: understand, analyze impact, plan, build, verify, polish, ship. U vetsiho tasku pouzij todo list.
7. Kdyz menis API nebo schema, oprav i vsechny navazane frontend klienty, hooks, komponenty a routy. Nenech rozbity kontrakt mezi BE a FE.
8. Vzdy validuj vysledek. Minimalne `get_errors` a `npx tsc --noEmit`. Pokud se menil `frontend-v2/`, spust i `cd frontend-v2 && npx tsc --noEmit && npm run build`.
9. Pokud se menila databaze, popis migraci a deploy dopad. Pokud je v repu migration drift, vol bezpecnou additive strategii a jasne ji popis.
10. Finalni odpoved ma byt kratka a prakticka: co bylo postaveno, co bylo overeno, ktere riziko nebo next step zbyva.

Priorita rozhodovani:

- Nejdriv funkcni implementace
- Pak integrita architektury a tenant scoping
- Pak UX polish a edge cases
- Nakonec deploy a verification notes

Nevracej se k legacy frontend patternum, pokud to task explicitne nevyzaduje.