---
name: ship-frontend-feature
description: Build or polish a React frontend-v2 page, component, flow, form, dashboard section, modal, or UX improvement in this repository. Use when the user says implementuj frontend, udelej UI, postav stranku, uprav komponentu, redesign, vylepsi UX, nebo chce realne zmeny ve frontend-v2.
agent: "Frontend-Designer"
argument-hint: "Popis frontend feature, stranky, komponenty nebo UX problemu k implementaci"
---

Proved implementaci ve `frontend-v2/` jako build-first task.

Pracuj takto:

1. Ber request jako pokyn k realne implementaci, ne k dalsimu brainstorming.
2. Nejdriv si nacti `memories/repo/stack-facts.md`, `docs/AI-INFRASTRUCTURE-REGISTRY.md` a povinne `.agents/skills/CabinSaaS_Architect/SKILL.md`.
3. Pokud task vyzaduje vyraznejsi vizualni nebo layout praci, nacti i `.agents/skills/frontend-design/SKILL.md`.
4. Drz se aktivni architektury: React 19, path-based routing, TanStack Query, Axios, Tailwind CSS, shadcn/ui. Nevracej se k legacy Vanilla frontend patternum.
5. Buduj od nejmensich casti k vetsim: API client nebo hook, pak komponenty, pak stranka, pak route wiring kdyz je potreba.
6. Vzdy implementuj loading, error a empty state. Na mobilu drzi touch targets >= 44px a stranka musi fungovat od 320px.
7. Zachovej buildable frontend. Kdyz zmena vyzaduje backend nebo API kontrakt, udelej nejmensi nutnou navaznou upravu nebo to jasne dopis do finalniho vystupu.
8. Overeni je povinne: `get_errors` a `cd frontend-v2 && npx tsc --noEmit && npm run build`.
9. Finalni odpoved ma byt kratka: co bylo upraveno, co bylo overeno, co je pripadny dalsi krok.

Priorita rozhodovani:

- Nejdriv funkcni UX a integrace do existujici architektury
- Pak vizualni polish a mobile quality
- Pak performance a edge cases

Pokud uzivatel chce pouze frontend implementaci bez zbytecne siroke orchestrace, drz scope uzce ve `frontend-v2/`.