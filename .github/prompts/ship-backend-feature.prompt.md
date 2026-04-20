---
name: ship-backend-feature
description: Build or fix a backend API, route, schema, validator, auth flow, query, job, or migration in this repository. Use when the user says implementuj backend, endpoint, API, route, prisma, schema, migrace, auth, middleware, cron, socket, nebo chce realne backend zmeny.
agent: "Backend-Engineer"
argument-hint: "Popis backend feature, endpointu, schema zmeny nebo server-side fixu k implementaci"
---

Proved backend implementaci jako build-first task.

Pracuj takto:

1. Ber request jako pokyn k realne zmene v `src/backend/`, `src/validators/`, `src/utils/`, `prisma/schema.prisma` a souvisejicich souborech.
2. Nejdriv si nacti `memories/repo/stack-facts.md`, `docs/AI-INFRASTRUCTURE-REGISTRY.md` a backend konvence z `.github/instructions/backend.instructions.md`.
3. Kazdy tenant-scoped dotaz filtruj pres `cabinId`. Nepouzivej starsi tenant naming ani globalni query bez filtru.
4. Kazdy novy nebo upraveny endpoint musi mit auth, validaci, error handling a spravne status kody. U update/delete over ownership nebo roli.
5. Kdyz menis schema nebo API kontrakt, oprav i souvisejici frontend klienty nebo to explicitne uved jako dopad. Nenech rozbity kontrakt mezi backendem a frontendem.
6. Preferuj root-cause fix. Nepatchuj symptom, kdyz je videt systemova pricina v route, validatoru nebo dotazu.
7. Pokud je potreba migrace a repo ma drift, drz se bezpecne additive strategie a jasne popis deploy dopad.
8. Overeni je povinne: `get_errors` a `npx tsc --noEmit`. Pokud se zmena dotkne frontend kontraktu, spust i frontend build check.
9. Finalni odpoved ma byt kratka: co bylo zmeneno, co bylo overeno, jaka migrace nebo deploy poznamka plati.

Priorita rozhodovani:

- Bezpecnost a tenant izolace
- Datova integrita a API kontrakt
- Vykon a ergonomie pouziti

Pokud jde o ciste backend task, neztracej cas frontendovym brainstormingem.